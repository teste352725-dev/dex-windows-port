#!/usr/bin/env python3
"""Ponto de entrada do DEX para Windows.

Uso (no Windows, com o venv ativo):
    python run.py            # abre o Web Shell
    python run.py --debug    # abre com o DevTools do WebView2

Pré-requisitos:
- scrcpy.exe + adb.exe em ``tools/`` (ou no PATH) — ver README.
- WebView2 Runtime instalado (já vem no Windows 10/11 atualizados).
- Telefone Android com depuração USB ligada e autorizada.
"""
from __future__ import annotations

import argparse
import sys

from dexwin import tools
from dexwin.adb import Adb
from dexwin.config import load_config
from dexwin.scrcpy import ScrcpyManager
from dexwin.host.controller import Controller
from dexwin.host import webhost


def build_controller(integrated=False):
    missing = tools.missing_tools()
    scrcpy_path = tools.find_scrcpy()
    adb_path = tools.find_adb()

    adb = Adb(adb_path) if adb_path else None
    scrcpy_manager = ScrcpyManager(scrcpy_path) if scrcpy_path else None

    window_manager = None
    if sys.platform.startswith("win"):
        try:
            from dexwin.platform_win.window_manager import WindowManager
            window_manager = WindowManager()
        except Exception as exc:
            print(f"[aviso] gerência de janelas Win32 indisponível: {exc}")

    config = load_config()
    # Modo integrado: via --integrated OU "integrated": true no config.json.
    integrated = integrated or bool(config.get("integrated"))
    controller = Controller(adb, scrcpy_manager, window_manager, config,
                            integrated=integrated)
    return controller, missing


def main(argv=None):
    parser = argparse.ArgumentParser(description="DEX para Windows")
    parser.add_argument("--debug", action="store_true", help="DevTools do WebView2")
    parser.add_argument("--fullscreen", action="store_true")
    parser.add_argument("--integrated", action="store_true",
                        help="Embute os apps dentro do shell (como no Linux)")
    args = parser.parse_args(argv)

    controller, missing = build_controller(integrated=args.integrated)
    if controller.integrated:
        print("[info] modo integrado ligado: um app por vez embutido no shell.")
    if missing:
        print("[aviso] binários ausentes: " + ", ".join(missing) +
              " — coloque scrcpy.exe/adb.exe em tools/ (ver README).")
    if controller.adb is None or controller.scrcpy is None:
        print("[erro] sem adb/scrcpy o shell abre, mas não lista nem abre apps.")

    webhost.run(controller, debug=args.debug, fullscreen=args.fullscreen)


if __name__ == "__main__":
    main()
