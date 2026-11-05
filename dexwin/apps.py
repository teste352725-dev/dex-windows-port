"""Catálogo de apps Android: modelo + parser de ``scrcpy --list-apps``.

Parser portado fiel do core.py original (formato do scrcpy 3.x: ``*`` = app de
sistema, ``-`` = app do usuário; nomes muito longos vêm com o pacote na linha
seguinte).
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

INLINE_APP_RE = re.compile(r"^(.+?)\s{2,}([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)\s*$")
PACKAGE_FULL_RE = re.compile(r"[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+")
MARKED_APP_RE = re.compile(r"^\s*([*-])\s+(.*?)\s*$")


@dataclass
class AppInfo:
    name: str
    package: str
    kind: str = "user"            # 'user' | 'system' | 'desktop'
    favorite: bool = False
    desktop: bool = False
    recent: bool = False
    icon_path: str | None = None

    @property
    def id(self) -> str:
        return self.package


def normalized_sort_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.casefold())
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def parse_scrcpy_apps(output: str) -> list[AppInfo]:
    """Lê a saída de ``scrcpy --list-apps`` em lista ordenada por nome."""
    found: dict[str, AppInfo] = {}
    pending: tuple[str, str] | None = None

    for raw_line in output.splitlines():
        marked = MARKED_APP_RE.match(raw_line)
        if marked:
            marker, body = marked.groups()
            kind = "system" if marker == "*" else "user"
            inline = INLINE_APP_RE.match(body)
            if inline:
                name = inline.group(1).strip()
                package = inline.group(2)
                found[package] = AppInfo(name=name, package=package, kind=kind)
                pending = None
            else:
                pending = (kind, body.strip())
            continue
        if pending:
            package = raw_line.strip()
            if PACKAGE_FULL_RE.fullmatch(package):
                kind, name = pending
                found[package] = AppInfo(name=name or package, package=package, kind=kind)
            pending = None

    return sorted(found.values(), key=lambda app: normalized_sort_key(app.name))


def apply_user_flags(apps: list[AppInfo], config: dict) -> list[AppInfo]:
    """Marca favorite/desktop/recent a partir do config do usuário."""
    favorites = set(config.get("favorites", []))
    desktop = set(config.get("desktop_apps", []))
    recent = list(config.get("recent", []))
    for app in apps:
        app.favorite = app.package in favorites
        app.desktop = app.package in desktop
        app.recent = app.package in recent
    return apps


def filter_apps(apps: list[AppInfo], tab: str, query: str = "") -> list[AppInfo]:
    """Filtra conforme a aba (all/favorites/recent) e a busca."""
    result = list(apps)
    if tab == "favorites":
        result = [a for a in result if a.favorite]
    elif tab == "recent":
        result = [a for a in result if a.recent]
    q = normalized_sort_key(query.strip())
    if q:
        result = [a for a in result
                  if q in normalized_sort_key(a.name + " " + a.package)]
    return result
