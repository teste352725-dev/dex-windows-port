"""Controller: estado do dispositivo/apps/sessões e montagem do snapshot.

Independente de UI. O ``window_manager`` é opcional (None fora do Windows), para
este módulo poder ser testado em Linux com um dummy. As operações de janela
viram no-op quando não há gerenciador.
"""
from __future__ import annotations

import threading

from .. import apps as apps_mod
from .. import config as config_mod


class Controller:
    def __init__(self, adb, scrcpy_manager, window_manager=None, config=None,
                 integrated=False):
        self.adb = adb
        self.scrcpy = scrcpy_manager
        self.wm = window_manager
        self.config = config if config is not None else config_mod.load_config()
        self._lock = threading.Lock()

        # ---- modo integrado (um app embutido no shell por vez) ----------
        self.integrated = bool(integrated) and window_manager is not None
        self._shell = None            # hwnd do shell (achado tardiamente)
        self._active_pid = None       # pid do app atualmente no palco
        self._active_hwnd = None
        self._embedded = set()        # hwnds já reparentados
        self._surface_available = True   # False quando um painel HTML está aberto
        self._app_hidden = False      # True quando o usuário minimiza o app ativo
        self._taskbar_css = 52        # altura da taskbar no CSS (ver style.css)

        self.device = None            # adb.DeviceRecord | None
        self.device_name = ""
        self.battery_percent = None
        self.battery_charging = None
        self.apps: list[apps_mod.AppInfo] = []
        self._loaded_serial = None
        self.last_error = ""

    # ---- dispositivo / catálogo ----------------------------------------
    def poll(self) -> None:
        """Atualiza dispositivo, catálogo e bateria. Chamado em loop pelo bridge."""
        try:
            devices = self.adb.list_devices()
        except Exception as exc:  # adb ausente etc.
            self.last_error = str(exc)
            self.device = None
            self._loaded_serial = None
            return
        self.last_error = ""
        ready = next((d for d in devices if d.state == "device"), None)
        self.device = ready or (devices[0] if devices else None)
        if not ready:
            self._loaded_serial = None
            return
        if self._loaded_serial != ready.serial:
            self._load_device(ready.serial)
        else:
            try:
                self.battery_percent, self.battery_charging = self.adb.battery(ready.serial)
            except Exception:
                pass

    def _load_device(self, serial: str) -> None:
        try:
            props = self.adb.getprop(serial)
            self.device_name = (props.get("ro.product.marketname")
                                or props.get("ro.product.model")
                                or (self.device.model if self.device else "")
                                or "Android")
        except Exception:
            self.device_name = self.device.model if self.device else "Android"
        try:
            self.battery_percent, self.battery_charging = self.adb.battery(serial)
        except Exception:
            pass
        try:
            catalog = self.scrcpy.list_apps(serial)
            apps_mod.apply_user_flags(catalog, self.config)
            self.apps = catalog
        except Exception as exc:
            self.last_error = f"Catálogo de apps: {exc}"
        self._loaded_serial = serial

    def app_for(self, package: str):
        return next((a for a in self.apps if a.package == package), None)

    # ---- sessões (abrir/focar/minimizar/fechar/snap) --------------------
    def open_app(self, package: str):
        if not self.device or self.device.state != "device":
            raise RuntimeError("Nenhum dispositivo conectado.")
        app = self.app_for(package)
        if app is None:
            raise RuntimeError("Aplicativo não encontrado no catálogo.")
        existing = self.scrcpy.find_by_package(package)
        if existing:
            return self.focus_session(existing[0].pid)
        handle = self.scrcpy.launch(self.device.serial, app, self.config,
                                    integrated=self.integrated)
        if self.wm:
            win = self.wm.wait_for_window(pid=handle.pid, title=handle.window_title)
            if win:
                handle.hwnd = win.hwnd
        config_mod.record_recent(self.config, package)
        apps_mod.apply_user_flags(self.apps, self.config)
        self._save_config_quietly()
        if self.integrated and handle.hwnd:
            self._select(handle.pid)
        return {"ok": True}

    def mirror(self):
        if not self.device or self.device.state != "device":
            raise RuntimeError("Nenhum dispositivo conectado.")
        existing = self.scrcpy.find_by_package("dex.mirror")
        if existing:
            return self.focus_session(existing[0].pid)
        handle = self.scrcpy.mirror(self.device.serial, self.config)
        if self.wm:
            win = self.wm.wait_for_window(pid=handle.pid, title=handle.window_title)
            if win:
                handle.hwnd = win.hwnd
        return {"ok": True}

    def _handle(self, pid: int):
        return self.scrcpy.find_by_pid(int(pid))

    def _ensure_hwnd(self, handle):
        if handle.hwnd is None and self.wm:
            win = self.wm.find_by_pid(handle.pid) or self.wm.find_by_title(handle.window_title)
            if win:
                handle.hwnd = win.hwnd
        return handle.hwnd

    # ---- modo integrado -------------------------------------------------
    def _shell_hwnd(self):
        if self._shell is None and self.wm:
            try:
                self._shell = self.wm.find_own_main_window()
            except Exception:
                self._shell = None
        return self._shell

    def _slot(self):
        """Retângulo do 'palco' (x, y, w, h) em px físicos, relativo ao cliente
        do shell: área toda menos a taskbar embaixo. None se indisponível."""
        shell = self._shell_hwnd()
        if not (self.wm and shell):
            return None
        try:
            width, height, scale = self.wm.client_box(shell)
        except Exception:
            return None
        if width <= 0 or height <= 0:
            return None
        taskbar = int(round(self._taskbar_css * scale))
        return 0, 0, width, max(32, height - taskbar)

    def _select(self, pid):
        """Coloca o app ``pid`` no palco (embute se preciso) e esconde os outros."""
        handle = self._handle(pid)
        if not handle:
            return {"ok": False, "error": "Sessão não encontrada."}
        hwnd = self._ensure_hwnd(handle)
        shell = self._shell_hwnd()
        if not (self.wm and hwnd and shell):
            return {"ok": False, "error": "Janela ou shell indisponível."}
        if hwnd not in self._embedded:
            if not self.wm.embed(hwnd, shell):
                return {"ok": False, "error": "Não foi possível integrar a janela."}
            self._embedded.add(hwnd)
        for other in list(self._embedded):
            if other != hwnd:
                self.wm.show_window(other, False)
        self._active_pid = pid
        self._active_hwnd = hwnd
        self._app_hidden = False
        self._apply_layout()
        try:
            self.wm.focus(hwnd)
        except Exception:
            pass
        return {"ok": True}

    def _apply_layout(self):
        """Reposiciona o app ativo no palco e ajusta a visibilidade."""
        if not (self.integrated and self.wm and self._active_hwnd):
            return
        slot = self._slot()
        if slot:
            self.wm.set_child_bounds(self._active_hwnd, *slot)
        self._apply_visibility()

    def _apply_visibility(self):
        if not (self.integrated and self.wm and self._active_hwnd):
            return
        visible = self._surface_available and not self._app_hidden
        self.wm.show_window(self._active_hwnd, visible)

    def _drop_embedded(self, hwnd):
        """Remove um hwnd do palco (desembute), ao fechar a sessão."""
        if hwnd and hwnd in self._embedded:
            try:
                self.wm.unembed(hwnd)
            except Exception:
                pass
            self._embedded.discard(hwnd)
        if hwnd and hwnd == self._active_hwnd:
            self._active_hwnd = None
            self._active_pid = None
            self._app_hidden = False

    def set_surface_available(self, available):
        """Chamado pelo frontend: False quando um painel HTML abre (precisa do
        espaço), True quando fecha. Esconde/mostra o app embutido."""
        self._surface_available = bool(available)
        self._apply_visibility()
        return {"ok": True}

    def focus_session(self, pid):
        if self.integrated:
            return self._select(pid)
        handle = self._handle(pid)
        if not handle:
            return {"ok": False, "error": "Sessão não encontrada."}
        hwnd = self._ensure_hwnd(handle)
        if self.wm and hwnd:
            self.wm.focus(hwnd)
        return {"ok": True}

    def minimize_session(self, pid):
        handle = self._handle(pid)
        if not handle:
            return {"ok": False, "error": "Sessão não encontrada."}
        if self.integrated:
            # Esconde o palco e devolve a tela ao shell (desktop/launcher).
            self._app_hidden = True
            self._apply_visibility()
            return {"ok": True}
        hwnd = self._ensure_hwnd(handle)
        if self.wm and hwnd:
            self.wm.minimize(hwnd)
        return {"ok": True}

    def close_session(self, pid):
        handle = self._handle(pid)
        if not handle:
            return {"ok": False, "error": "Sessão não encontrada."}
        hwnd = self._ensure_hwnd(handle)
        if self.integrated and hwnd:
            self._drop_embedded(hwnd)
        if self.wm and hwnd:
            self.wm.close(hwnd)
        self.scrcpy.terminate(handle)
        if self.integrated and self._active_pid is None:
            # Se sobrou outro app embutido, traz ele para o palco.
            leftover = next((h for h in self.scrcpy.sessions()
                             if h.hwnd in self._embedded), None)
            if leftover:
                self._select(leftover.pid)
        return {"ok": True}

    def close_package(self, package):
        for handle in self.scrcpy.find_by_package(package):
            self.close_session(handle.pid)
        return {"ok": True}

    def snap_session(self, pid, layout, taskbar_height=52):
        handle = self._handle(pid)
        if not handle:
            return {"ok": False, "error": "Sessão não encontrada."}
        hwnd = self._ensure_hwnd(handle)
        if self.wm and hwnd and self.wm.snap(hwnd, layout, int(taskbar_height)):
            return {"ok": True}
        return {"ok": False, "error": "Snap indisponível."}

    # ---- favoritos / atalhos / config ----------------------------------
    def toggle_favorite(self, package):
        favs = set(self.config.get("favorites", []))
        favs.symmetric_difference_update({package})
        self.config["favorites"] = sorted(favs)
        apps_mod.apply_user_flags(self.apps, self.config)
        self._save_config_quietly()
        return {"ok": True}

    def toggle_shortcut(self, package):
        desk = set(self.config.get("desktop_apps", []))
        desk.symmetric_difference_update({package})
        self.config["desktop_apps"] = sorted(desk)
        apps_mod.apply_user_flags(self.apps, self.config)
        self._save_config_quietly()
        return {"ok": True}

    def update_config(self, changes: dict):
        self.config.update(changes)
        self._save_config_quietly()
        return {"ok": True}

    def _save_config_quietly(self):
        try:
            config_mod.save_config(self.config)
        except Exception as exc:
            self.last_error = f"Salvar config: {exc}"

    # ---- housekeeping ---------------------------------------------------
    def reap(self):
        """Remove sessões mortas; retorna True se algo mudou."""
        return bool(self.scrcpy.reap_finished())

    def refresh_window_state(self) -> bool:
        """Atualiza hwnd/estado de minimização das sessões vivas."""
        if not self.wm:
            return False
        changed = False
        for handle in self.scrcpy.sessions():
            before = handle.hwnd
            self._ensure_hwnd(handle)
            if handle.hwnd != before:
                changed = True
        if self.integrated:
            # Reafirma o palco (caso o shell tenha mudado de tamanho) e
            # embute um app que só agora ganhou janela.
            if (self._active_pid is None and not self._app_hidden):
                pending = next((h for h in self.scrcpy.sessions() if h.hwnd), None)
                if pending:
                    self._select(pending.pid)
                    changed = True
            self._apply_layout()
        return changed

    # ---- snapshot para o frontend --------------------------------------
    def snapshot(self) -> dict:
        connected = bool(self.device and self.device.state == "device")
        sessions = []
        active_pkg = None
        for handle in self.scrcpy.sessions():
            if self.integrated:
                is_active = (handle.pid == self._active_pid and not self._app_hidden)
                state = "active" if is_active else "minimized"
            else:
                minimized = bool(self.wm and handle.hwnd and self.wm.is_minimized(handle.hwnd))
                state = "minimized" if minimized else "active"
            if state == "active" and active_pkg is None:
                active_pkg = handle.app.package
            sessions.append({
                "session_id": handle.pid,
                "pid": handle.pid,
                "package": handle.app.package,
                "name": handle.app.name,
                "window_id": str(handle.hwnd) if handle.hwnd else "",
                "state": state,
            })
        running = {}
        for s in sessions:
            running[s["package"]] = running.get(s["package"], 0) + 1

        app_payload = []
        for a in self.apps:
            sess = [s for s in sessions if s["package"] == a.package]
            app_payload.append({
                "id": a.package, "name": a.name, "package": a.package, "kind": a.kind,
                "favorite": a.favorite, "desktop": a.desktop, "recent": a.recent,
                "iconUrl": None, "icon": "grid",
                "color": "linear-gradient(135deg,#57616e,#343a44)",
                "running_count": running.get(a.package, 0),
                "active": any(s["state"] == "active" for s in sess),
                "minimized": bool(sess) and all(s["state"] == "minimized" for s in sess),
            })

        device = {
            "name": self.device_name or "Android", "deviceName": self.device_name or "Android",
            "connected": connected,
            "status": "Conectado" if connected else (self.last_error or "Sem dispositivo"),
            "state": self.device.state if self.device else "none",
            "battery": self.battery_percent, "charging": self.battery_charging,
        }
        system = self._system_snapshot()
        surface = None
        if self.integrated and self._active_pid is not None and not self._app_hidden:
            # windowed=False: o frontend trata o palco como região exclusiva e
            # avisa (experimental_surface) quando um painel precisa do espaço.
            surface = {"windowed": False}
        return {
            "apps": app_payload,
            "device": device,
            "battery": {"percent": self.battery_percent, "charging": self.battery_charging},
            "system": system,
            "activeApp": active_pkg,
            "sessions": sessions,
            "config": self.config,
            "notifications": [],
            "experimentalSurface": surface,
        }

    def _system_snapshot(self) -> dict:
        """Estados de sistema. No MVP sem agente, a maioria é só-leitura/indisponível.

        O frontend mostra os controles, mas não deixa alternar o que não é
        'writable'. Dá para evoluir depois com um agente no Android (como no
        projeto Linux).
        """
        unavailable = {"enabled": False, "writable": False,
                       "reason": "Requer o agente companion no Android (futuro)."}
        return {
            "wifi": {"enabled": False, "ssid": "", "writable": False,
                     "reason": "Indisponível sem agente."},
            "bluetooth": dict(unavailable),
            "dnd": dict(unavailable),
            "dark_mode": dict(unavailable),
            "rotation": dict(unavailable),
            "audio": {"percent": 0, "muted": False, "writable": False,
                      "reason": "Volume do Android via agente (futuro)."},
            "notifications": {"available": False, "items": []},
            "capture": {"available": True, "writable": True, "target": "host_desktop",
                        "reason": "Captura da tela do Windows (Pillow)."},
        }
