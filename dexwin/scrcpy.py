"""scrcpy: montagem de comando (a "ideia" do projeto) + ciclo de vida.

O pulo do gato, idêntico ao projeto original e totalmente portável para Windows:

    scrcpy --new-display=WxH/DPI --start-app=<pacote> ...

cria um DISPLAY virtual novo no Android e abre o app ali, numa janela própria no
desktop do PC. Vários desses + um espelho do display físico (``--display-id=0``)
formam o "desktop Android".

Builders portados fiel do core.py. ``--flex-display`` só entra se um build
especial do scrcpy anunciar suporte (o scrcpy padrão do Windows não tem; usa-se
``--new-display`` puro, que já resolve).
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
import threading
from dataclasses import dataclass, field

from .apps import AppInfo, parse_scrcpy_apps
from .profiles import app_display_profile

_NO_WINDOW = 0x08000000 if sys.platform.startswith("win") else 0


def build_mirror_command(scrcpy_path: str, serial: str, config: dict) -> tuple[list[str], str]:
    """Espelha o display físico; não muda tamanho/DPI/orientação do telefone."""
    title = "Tela do celular — DEX"
    command = [
        scrcpy_path, f"--serial={serial}", "--display-id=0",
        f"--window-title={title}", f"--max-fps={config['fps']}",
        f"--video-bit-rate={config['bitrate']}",
        f"--keyboard={config.get('keyboard', 'uhid')}",
        f"--mouse={config.get('mouse', 'uhid')}",
        f"--gamepad={config.get('gamepad', 'disabled')}",
    ]
    if not config.get("audio"):
        command.append("--no-audio")
    return command, title


def build_launch_command(
    scrcpy_path: str,
    serial: str,
    app: AppInfo,
    config: dict,
    supports_flex_display: bool = False,
    integrated: bool = False,
) -> tuple[list[str], str]:
    """Monta argv (sem shell) para abrir ``app`` numa janela virtual própria."""
    profile = app_display_profile(app.package, config)
    force_fullscreen = False
    if profile:
        overrides = {k: v for k, v in profile.items() if k != "fullscreen"}
        config = {**config, **overrides}
        force_fullscreen = bool(profile.get("fullscreen"))

    title = f"{app.name} — {app.package} — DEX"
    command = [
        scrcpy_path,
        f"--serial={serial}",
        f"--new-display={config['display']}",
        f"--display-orientation={config.get('orientation', '0')}",
        f"--start-app={app.package}",
        f"--window-title={title}",
        f"--keyboard={config.get('keyboard', 'uhid')}",
        f"--mouse={config.get('mouse', 'uhid')}",
        f"--gamepad={config.get('gamepad', 'disabled')}",
        f"--max-fps={config['fps']}",
        f"--video-bit-rate={config['bitrate']}",
        "--stay-awake",
        "--verbosity=warn",
    ]
    if integrated:
        # Sem borda já na origem: o Win32 ainda tira o resto ao embutir, mas
        # assim não há barra de título piscando antes.
        command.append("--window-borderless")
    if force_fullscreen:
        command.append("--fullscreen")
    elif supports_flex_display:
        command.append("--flex-display")
    command.append("--display-ime-policy=hide" if config.get("hide_ime")
                   else "--display-ime-policy=local")
    if not config.get("audio"):
        command.append("--no-audio")
    if config.get("turn_screen_off"):
        command.append("--turn-screen-off")
    if config.get("preserve_on_close"):
        command.append("--no-vd-destroy-content")
    return command, title


@dataclass
class LaunchHandle:
    process: subprocess.Popen
    app: AppInfo
    window_title: str
    log_file: object = None
    hwnd: int | None = None          # janela Win32 associada (preenchida pelo host)

    @property
    def pid(self) -> int:
        return self.process.pid

    @property
    def alive(self) -> bool:
        return self.process.poll() is None


def detect_version(scrcpy_path: str) -> tuple[str, bool]:
    """Retorna (versão, suporta_flex). ``--flex-display`` é de build especial."""
    try:
        out = subprocess.run([scrcpy_path, "--version"], capture_output=True,
                             text=True, timeout=8, creationflags=_NO_WINDOW)
        version_line = (out.stdout or out.stderr).splitlines()[0] if (out.stdout or out.stderr) else ""
        # heurística: só um build que cite "flex" no --help tem a flag
        helptext = subprocess.run([scrcpy_path, "--help"], capture_output=True,
                                  text=True, timeout=8, creationflags=_NO_WINDOW)
        supports_flex = "--flex-display" in (helptext.stdout + helptext.stderr)
        return version_line.strip(), supports_flex
    except Exception:
        return "", False


class ScrcpyManager:
    """Ciclo de vida das sessões scrcpy (uma por janela virtual)."""

    def __init__(self, scrcpy_path: str):
        self.scrcpy_path = scrcpy_path
        self.version, self.supports_flex_display = detect_version(scrcpy_path)
        self._handles: list[LaunchHandle] = []
        self._lock = threading.Lock()

    def list_apps(self, serial: str) -> list[AppInfo]:
        out = subprocess.run(
            [self.scrcpy_path, f"--serial={serial}", "--list-apps"],
            capture_output=True, text=True, timeout=40, creationflags=_NO_WINDOW,
        )
        return parse_scrcpy_apps(out.stdout + "\n" + out.stderr)

    def launch(self, serial: str, app: AppInfo, config: dict,
               integrated: bool = False) -> LaunchHandle:
        command, title = build_launch_command(
            self.scrcpy_path, serial, app, config, self.supports_flex_display,
            integrated=integrated)
        return self._spawn(command, app, title)

    def mirror(self, serial: str, config: dict) -> LaunchHandle:
        command, title = build_mirror_command(self.scrcpy_path, serial, config)
        mirror_app = AppInfo(name="Tela do celular", package="dex.mirror", kind="system")
        return self._spawn(command, mirror_app, title)

    def _spawn(self, command: list[str], app: AppInfo, title: str) -> LaunchHandle:
        log = tempfile.TemporaryFile(mode="w+")
        process = subprocess.Popen(
            command, stdout=log, stderr=subprocess.STDOUT,
            creationflags=_NO_WINDOW,
        )
        handle = LaunchHandle(process=process, app=app, window_title=title, log_file=log)
        with self._lock:
            self._handles.append(handle)
        return handle

    def sessions(self) -> list[LaunchHandle]:
        with self._lock:
            return list(self._handles)

    def find_by_package(self, package: str) -> list[LaunchHandle]:
        return [h for h in self.sessions() if h.app.package == package]

    def find_by_pid(self, pid: int) -> LaunchHandle | None:
        return next((h for h in self.sessions() if h.pid == pid), None)

    def reap_finished(self) -> list[LaunchHandle]:
        """Remove sessões cujo processo morreu; retorna as removidas."""
        dead = []
        with self._lock:
            for h in list(self._handles):
                if not h.alive:
                    dead.append(h)
                    self._handles.remove(h)
                    try:
                        if h.log_file:
                            h.log_file.close()
                    except Exception:
                        pass
        return dead

    def terminate(self, handle: LaunchHandle) -> None:
        try:
            handle.process.terminate()
        except Exception:
            pass
        with self._lock:
            if handle in self._handles:
                self._handles.remove(handle)

    def terminate_all(self) -> None:
        for h in self.sessions():
            self.terminate(h)
