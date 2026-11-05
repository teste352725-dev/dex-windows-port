"""Descoberta dos binários scrcpy.exe e adb.exe.

Ordem de busca:
1. ``tools/`` empacotado junto do projeto (recomendado no Windows — basta jogar
   o scrcpy-win64 aqui que já vem com adb.exe).
2. Variáveis de ambiente DEX_SCRCPY / DEX_ADB (caminho explícito).
3. PATH do sistema.

No Windows os executáveis têm sufixo .exe; fora do Windows cai no nome puro
(útil para rodar os testes/lint em Linux).
"""
from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent.parent / "tools"
_EXE = ".exe" if sys.platform.startswith("win") else ""


def _search(name: str, env_var: str) -> str | None:
    exe = name + _EXE
    # 1. tools/ empacotado (inclui subpastas tipo tools/scrcpy-win64/)
    if TOOLS_DIR.is_dir():
        direct = TOOLS_DIR / exe
        if direct.is_file():
            return str(direct)
        for found in TOOLS_DIR.rglob(exe):
            if found.is_file():
                return str(found)
    # 2. variável de ambiente explícita
    env = os.environ.get(env_var)
    if env and Path(env).is_file():
        return env
    # 3. PATH
    which = shutil.which(name) or shutil.which(exe)
    return which


def find_scrcpy() -> str | None:
    return _search("scrcpy", "DEX_SCRCPY")


def find_adb() -> str | None:
    # scrcpy embute o adb.exe na mesma pasta; procurar junto dele primeiro.
    scrcpy = find_scrcpy()
    if scrcpy:
        sibling = Path(scrcpy).with_name("adb" + _EXE)
        if sibling.is_file():
            return str(sibling)
    return _search("adb", "DEX_ADB")


def missing_tools() -> list[str]:
    """Lista o que falta, para o host avisar o usuário com clareza."""
    missing = []
    if not find_scrcpy():
        missing.append("scrcpy")
    if not find_adb():
        missing.append("adb")
    return missing
