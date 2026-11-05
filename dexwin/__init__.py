"""DEX for Windows — porta do Android Desktop (Web Shell) para Windows.

A ideia é a mesma do projeto original: usar ``scrcpy --new-display=WxH/DPI
--start-app=<pacote>`` para abrir cada app Android numa janela virtual própria
no desktop do PC, com um Web Shell (launcher/taskbar/wallpaper) por cima.

O que muda em relação ao Linux:
- Gerência de janelas: Win32 (pywin32) no lugar de wmctrl/X11.
- Host do WebView: WebView2/Edge (pywebview gui='edgechromium') no lugar de
  WebKitGTK.
- Binários: scrcpy.exe/adb.exe empacotados em ``tools/`` ou achados no PATH.

Partes 100% reaproveitadas: o frontend (HTML/CSS/JS) e a lógica de montar o
comando do scrcpy (o "pulo do gato" do projeto).
"""

__version__ = "0.1.0-win"
