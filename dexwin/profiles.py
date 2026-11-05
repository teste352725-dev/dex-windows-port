"""Perfis de display por app (resolução/DPI/entrada/fullscreen).

Corrigem apps que ficam com escala/proporção ruins no desktop. O usuário pode
sobrescrever em ``config["app_profiles"]`` (prioridade sobre os embutidos).
A chave ``fullscreen`` (bool) é consumida no builder; o resto sobrepõe o config.
"""
from __future__ import annotations

APP_DISPLAY_PROFILES: dict[str, dict] = {
    # Discord fica preto/minúsculo na densidade baixa do desktop; resolução
    # fixa mantém a escala. Perfil herdado do projeto original (validado no Moto G54).
    "com.discord": {
        "display": "2720x1536/480", "mouse": "sdk", "keyboard": "uhid",
        "gamepad": "disabled", "orientation": "0", "fullscreen": True,
    },
}


def app_display_profile(package: str, config: dict | None = None) -> dict | None:
    """Perfil de um app: primeiro o do usuário, depois o embutido."""
    user = config.get("app_profiles", {}) if isinstance(config, dict) else {}
    if isinstance(user, dict) and isinstance(user.get(package), dict):
        return user[package]
    return APP_DISPLAY_PROFILES.get(package)
