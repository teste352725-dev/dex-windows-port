"""Configuração do DEX-Windows: carregar/salvar JSON + valores válidos.

Mantém a mesma forma de config do projeto original para o frontend (settings.js)
continuar funcionando sem mudanças. Guardado em %APPDATA%\\dex-windows\\config.json.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

# Conjuntos de valores aceitos (espelham o core.py original; o frontend usa
# estes para montar o formulário de Configurações).
VALID_DISPLAYS = {
    "800x480/160", "960x640/180", "1280x720/160", "1280x720/200",
    "1280x720/240", "1600x900/180", "1600x900/260",
}
VALID_ORIENTATIONS = {"0", "90", "180", "270"}
VALID_FPS = {30, 60, 90, 120}
VALID_BITRATES = {"2M", "4M", "8M", "12M", "16M"}
VALID_INPUT_MODES = {"uhid", "sdk", "aoa", "disabled"}
VALID_GAMEPAD_MODES = {"uhid", "aoa", "disabled"}

DEFAULT_CONFIG: dict = {
    "display": "1280x720/200",
    "orientation": "0",
    "fps": 60,
    "bitrate": "8M",
    "keyboard": "uhid",
    "mouse": "uhid",
    "gamepad": "disabled",
    "audio": False,          # scrcpy encaminha áudio ao PC quando True
    "hide_ime": False,
    "turn_screen_off": False,
    "preserve_on_close": False,
    "desktop_apps": [],       # pacotes fixados na área de trabalho
    "favorites": [],          # pacotes favoritos (aba Favoritos)
    "recent": [],             # histórico recente (pacotes)
    "app_profiles": {},       # perfis por app (prioridade sobre os embutidos)
    "wallpaper_style": "gradient",  # gradient | solid | image
    "wallpaper_color": "#10243b",
    "wallpaper_path": "",
    "wallpaper_fit": "fill",
}


def config_dir() -> Path:
    """Pasta de config no Windows (%APPDATA%); cai em ~/.config fora do Windows."""
    appdata = os.environ.get("APPDATA")
    base = Path(appdata) if appdata else (Path.home() / ".config")
    return base / "dex-windows"


def config_path() -> Path:
    return config_dir() / "config.json"


def _coerce(values: dict) -> dict:
    """Normaliza um dict cru, descartando valores inválidos (nunca quebra)."""
    cfg = dict(DEFAULT_CONFIG)
    if not isinstance(values, dict):
        return cfg
    if values.get("display") in VALID_DISPLAYS:
        cfg["display"] = values["display"]
    if str(values.get("orientation")) in VALID_ORIENTATIONS:
        cfg["orientation"] = str(values["orientation"])
    try:
        if int(values.get("fps")) in VALID_FPS:
            cfg["fps"] = int(values["fps"])
    except (TypeError, ValueError):
        pass
    if values.get("bitrate") in VALID_BITRATES:
        cfg["bitrate"] = values["bitrate"]
    for key in ("keyboard", "mouse"):
        if values.get(key) in VALID_INPUT_MODES:
            cfg[key] = values[key]
    if values.get("gamepad") in VALID_GAMEPAD_MODES:
        cfg["gamepad"] = values["gamepad"]
    for key in ("audio", "hide_ime", "turn_screen_off", "preserve_on_close"):
        if isinstance(values.get(key), bool):
            cfg[key] = values[key]
    for key in ("desktop_apps", "favorites", "recent"):
        value = values.get(key)
        if isinstance(value, list):
            cfg[key] = [str(v) for v in value if isinstance(v, str)]
    if isinstance(values.get("app_profiles"), dict):
        cfg["app_profiles"] = {
            str(k): dict(v) for k, v in values["app_profiles"].items()
            if isinstance(v, dict)
        }
    if values.get("wallpaper_style") in ("gradient", "solid", "image"):
        cfg["wallpaper_style"] = values["wallpaper_style"]
    if values.get("wallpaper_fit") in ("fill", "fit", "center"):
        cfg["wallpaper_fit"] = values["wallpaper_fit"]
    for key in ("wallpaper_color", "wallpaper_path"):
        if isinstance(values.get(key), str):
            cfg[key] = values[key]
    return cfg


def load_config(path: Path | None = None) -> dict:
    path = path or config_path()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raw = {}
    return _coerce(raw)


def save_config(config: dict, path: Path | None = None) -> None:
    path = path or config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(_coerce(config), indent=2, ensure_ascii=False),
                    encoding="utf-8")


def record_recent(config: dict, package: str, limit: int = 18) -> list[str]:
    """Move ``package`` para o topo do histórico recente (sem duplicar)."""
    recent = [p for p in config.get("recent", []) if p != package]
    recent.insert(0, package)
    config["recent"] = recent[:limit]
    return config["recent"]
