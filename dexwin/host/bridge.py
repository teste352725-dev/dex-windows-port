"""Ponte JS <-> Python para o Web Shell (pywebview).

- ``WebBridge`` roda loops de polling (dispositivo/janelas) e publica snapshots
  no WebView via ``window.DeckNative.receive(...)`` só quando mudam.
- ``NativeAPI`` é o objeto exposto como ``window.pywebview.api`` — mesmos nomes
  que o frontend já chama (open_app, activate_app, snap_window, etc.).
"""
from __future__ import annotations

import json
import threading
import time

from .. import config as config_mod


class WebBridge:
    def __init__(self, controller, screen_size=(1366, 768), poll_interval=2.0):
        self.controller = controller
        self.screen_size = screen_size
        self.poll_interval = poll_interval
        self._window = None
        self._stop = threading.Event()
        self._dirty = threading.Event()
        self._last_json = None
        self._messages: list[str] = []
        self._msg_lock = threading.Lock()

    def attach(self, window):
        self._window = window
        self._last_json = None
        self._dirty.set()

    def start(self):
        threading.Thread(target=self._device_loop, name="dex-devices", daemon=True).start()
        threading.Thread(target=self._window_loop, name="dex-windows", daemon=True).start()
        threading.Thread(target=self._publish_loop, name="dex-publish", daemon=True).start()
        self._dirty.set()

    def stop(self):
        self._stop.set()
        self._dirty.set()
        try:
            self.controller.scrcpy.terminate_all()
        except Exception:
            pass

    def message(self, text: str):
        with self._msg_lock:
            self._messages.append(str(text))
        self._dirty.set()

    # ---- loops ----------------------------------------------------------
    def _device_loop(self):
        while not self._stop.is_set():
            try:
                self.controller.poll()
            except Exception as exc:
                self.message(str(exc))
            self._dirty.set()
            self._stop.wait(self.poll_interval)

    def _window_loop(self):
        while not self._stop.is_set():
            try:
                if self.controller.reap():
                    self._dirty.set()
                if self.controller.refresh_window_state():
                    self._dirty.set()
            except Exception:
                pass
            self._stop.wait(1.2)

    def _publish_loop(self):
        while not self._stop.is_set():
            self._dirty.wait(1)
            if self._stop.is_set():
                break
            if not self._dirty.is_set() or not self._window:
                continue
            self._dirty.clear()
            try:
                payload = json.dumps(self.controller.snapshot(), ensure_ascii=True)
                if payload != self._last_json:
                    self._eval("window.DeckNative.receive(" + payload + ");")
                    self._last_json = payload
                with self._msg_lock:
                    pending, self._messages = self._messages, []
                for msg in pending:
                    self._eval("window.ShellAPI.showMessage(" + json.dumps(msg) + ");")
            except Exception:
                self._stop.wait(1)
                self._dirty.set()

    def _eval(self, code: str):
        try:
            self._window.evaluate_js(code)
        except Exception:
            pass

    def touch(self):
        self._dirty.set()


class NativeAPI:
    """Superfície exposta ao JS (window.pywebview.api)."""

    def __init__(self, bridge: WebBridge):
        self._bridge = bridge
        self._c = bridge.controller

    def _wrap(self, fn):
        try:
            result = fn() or {}
            if not isinstance(result, dict):
                result = {"ok": True}
            result.setdefault("ok", True)
        except Exception as exc:
            result = {"ok": False, "error": str(exc)}
        finally:
            self._bridge.touch()
        return result

    # --- apps / sessões ---
    def open_app(self, package):
        return self._wrap(lambda: self._c.open_app(package))

    def mirror_screen(self):
        return self._wrap(lambda: self._c.mirror())

    def activate_app(self, package, active=False):
        def act():
            sessions = self._c.scrcpy.find_by_package(package)
            if not sessions:
                return self._c.open_app(package)
            pid = sessions[0].pid
            return self._c.minimize_session(pid) if active else self._c.focus_session(pid)
        return self._wrap(act)

    def focus_session(self, pid):
        return self._wrap(lambda: self._c.focus_session(pid))

    def minimize_session(self, pid):
        return self._wrap(lambda: self._c.minimize_session(pid))

    def close_session(self, pid):
        return self._wrap(lambda: self._c.close_session(pid))

    def close_app(self, package):
        return self._wrap(lambda: self._c.close_package(package))

    def snap_window(self, pid, layout, taskbar_height=52):
        return self._wrap(lambda: self._c.snap_session(pid, layout, taskbar_height))

    # --- favoritos / config ---
    def toggle_favorite(self, package):
        return self._wrap(lambda: self._c.toggle_favorite(package))

    def toggle_shortcut(self, package):
        return self._wrap(lambda: self._c.toggle_shortcut(package))

    def refresh(self):
        self._bridge.touch()
        return {"ok": True}

    def update_config(self, changes):
        allowed = {"audio", "orientation", "wallpaper_color", "wallpaper_style",
                   "wallpaper_path", "wallpaper_fit"}
        if not isinstance(changes, dict) or any(k not in allowed for k in changes):
            return {"ok": False, "error": "Configuração não disponível nesta Shell."}
        return self._wrap(lambda: self._c.update_config(changes))

    # --- settings form (settings.js) ---
    def settings_options(self):
        displays = []
        for value in sorted(config_mod.VALID_DISPLAYS):
            resolution, density = value.split("/")
            w, h = map(int, resolution.split("x"))
            displays.append({"value": value, "resolution": resolution,
                             "smallest_width_dp": min(w, h) * 160 / int(density)})
        return {"ok": True, "displays": displays, "theme_colors": {}, "choices": {
            "display": sorted(config_mod.VALID_DISPLAYS),
            "orientation": sorted(config_mod.VALID_ORIENTATIONS, key=int),
            "fps": sorted(config_mod.VALID_FPS),
            "bitrate": sorted(config_mod.VALID_BITRATES),
            "keyboard": sorted(config_mod.VALID_INPUT_MODES),
            "mouse": sorted(config_mod.VALID_INPUT_MODES),
            "gamepad": sorted(config_mod.VALID_GAMEPAD_MODES),
            "wallpaper_style": ["gradient", "solid", "image"],
            "wallpaper_fit": ["fill", "fit", "center"],
        }}

    def save_settings(self, changes):
        choices = self.settings_options()["choices"]
        booleans = {"audio", "hide_ime", "turn_screen_off", "preserve_on_close"}
        allowed = set(choices) | booleans | {"wallpaper_path", "wallpaper_color"}
        if not isinstance(changes, dict) or any(k not in allowed for k in changes):
            return {"ok": False, "error": "Configuração não disponível."}
        for key, value in changes.items():
            if key in choices and (value not in choices[key] or isinstance(value, bool)):
                return {"ok": False, "error": "Valor inválido: " + key}
            if key in booleans and not isinstance(value, bool):
                return {"ok": False, "error": "Valor inválido: " + key}
        def save():
            self._c.update_config(changes)
            return {"snapshot": self._c.snapshot()}
        return self._wrap(save)

    # --- sistema / captura (MVP enxuto) ---
    def system_action(self, feature, target):
        return {"ok": False, "error": "Controle do Android requer o agente (futuro)."}

    def android_settings(self, page):
        return {"ok": False, "error": "Abrir Configurações do Android requer o agente (futuro)."}

    def host_controls(self, action="state", value=None):
        # Sem host integrado/reparent no MVP do Windows.
        return {"ok": True, "available": False}

    def experimental_slot(self, geometry):
        return {"ok": False, "error": "Host experimental indisponível no Windows."}

    def experimental_surface(self, available):
        return {"ok": True}

    def surface_occlusions(self, rectangles):
        return {"ok": True}

    def capture_desktop(self):
        try:
            from PIL import ImageGrab
        except Exception:
            return {"ok": False, "error": "Pillow não instalado (pip install pillow)."}
        from pathlib import Path
        import time as _t
        try:
            img = ImageGrab.grab()
            out = config_mod.config_dir() / "captures"
            out.mkdir(parents=True, exist_ok=True)
            path = out / f"captura-{int(_t.time())}.png"
            img.save(path)
            return {"ok": True, "path": str(path)}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    def pick_wallpaper(self):
        try:
            import webview
        except Exception:
            return {"ok": False, "error": "Seletor indisponível."}
        windows = list(getattr(webview, "windows", None) or [])
        if not windows:
            return {"ok": False, "error": "Janela indisponível."}
        dialog_cls = getattr(webview, "FileDialog", None)
        open_dialog = getattr(dialog_cls, "OPEN", None) if dialog_cls else None
        if open_dialog is None:
            open_dialog = webview.OPEN_DIALOG
        selection = windows[0].create_file_dialog(
            open_dialog, allow_multiple=False,
            file_types=("Imagens (*.jpg;*.jpeg;*.png;*.webp;*.bmp)", "Todos (*.*)"))
        path = (selection[0] if isinstance(selection, (list, tuple)) and selection
                else (selection or ""))
        if not path:
            return {"ok": False, "cancelled": True}
        self._c.update_config({"wallpaper_path": path, "wallpaper_style": "image"})
        self._bridge.touch()
        return {"ok": True, "snapshot": self._c.snapshot(), "path": path}
