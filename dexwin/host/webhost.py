"""Janela do Web Shell via pywebview (WebView2/Edge no Windows).

Carrega ``frontend/index.html`` (sem ?demo=1, para o shell entrar em modo
nativo) e expõe ``NativeAPI`` como ``window.pywebview.api``.
"""
from __future__ import annotations

import sys
from pathlib import Path

from .bridge import NativeAPI, WebBridge

FRONTEND = Path(__file__).resolve().parent.parent.parent / "frontend" / "index.html"


def run(controller, *, title="DEX — Android Desktop (Windows)",
        width=1366, height=768, fullscreen=False, debug=False):
    try:
        import webview
    except Exception as exc:  # pragma: no cover
        raise SystemExit(
            "pywebview é necessário (pip install pywebview). No Windows ele usa o "
            "WebView2 Runtime da Microsoft — instale-o se o app abrir em branco."
        ) from exc

    if not FRONTEND.is_file():
        raise SystemExit(f"Frontend não encontrado: {FRONTEND}")

    bridge = WebBridge(controller, screen_size=(width, height))
    api = NativeAPI(bridge)

    window = webview.create_window(
        title, url=FRONTEND.as_uri(), js_api=api,
        width=width, height=height, fullscreen=fullscreen,
        background_color="#05070a",
    )

    def on_loaded():
        bridge.attach(window)
        bridge.start()

    window.events.loaded += on_loaded

    # gui: no Windows força EdgeChromium (WebView2). Em outros SOs deixa o default.
    gui = "edgechromium" if sys.platform.startswith("win") else None
    try:
        webview.start(func=None, gui=gui, http_server=False,
                      private_mode=True, debug=debug)
    finally:
        bridge.stop()
