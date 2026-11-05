# DEX para Windows

Porta do **Android Desktop / DEX** (o Web Shell que roda apps Android em janelas
virtuais no desktop) do Linux para o **Windows**, feita do zero, mantendo a ideia
central e reaproveitando o frontend inteiro.

> **Status: v0.1 — fundação funcional, AINDA NÃO testada no Windows.**
> Este código foi escrito num ambiente Linux. A lógica portável tem testes
> automatizados passando (22/22), mas as partes específicas do Windows (Win32 +
> WebView2) só podem ser validadas **rodando numa máquina Windows de verdade** —
> esse é o próximo passo, com você. Veja "O que falta testar" no fim.

---

## A ideia (igual à do projeto original)

O "pulo do gato" é um recurso do **scrcpy**:

```
scrcpy --new-display=1280x720/200 --start-app=com.exemplo.app
```

Isso cria um **display virtual novo** no Android e abre o app ali, numa **janela
própria** no desktop do PC. Vários desses (+ um espelho do display físico com
`--display-id=0`) formam o "desktop Android". Por cima de tudo roda o **Web Shell**
(launcher, taskbar, wallpaper, HUD de volume, etc.) — uma página HTML/CSS/JS.

Esse comando funciona **igual no Windows**, então a lógica de montá-lo foi portada
fiel. O que muda entre Linux e Windows é só a "cola" com o sistema operacional.

## O que mudou do Linux para o Windows

| Função | Linux (original) | Windows (esta porta) |
|---|---|---|
| Gerência de janelas | `wmctrl` / X11 | **Win32** (`pywin32`: `win32gui`) |
| Atalho global (F11) | grab do X11 (python-xlib) | **`RegisterHotKey`** (message loop) |
| Host do WebView | WebKitGTK (`gui='gtk'`) | **WebView2/Edge** (`gui='edgechromium'`) |
| Binários scrcpy/adb | `/usr/local/bin`, PATH | empacotados em `tools/` ou PATH |
| Captura de tela | Pillow + X11 | Pillow (nativo no Windows) |
| Áudio | PulseAudio (`deck_audio`) | encaminhamento nativo do próprio scrcpy |

**Reaproveitado 100%:** o `frontend/` (incl. todo o trabalho visual recente:
Aurora, gestos no launcher, HUD de volume, arrastar notificação) e a lógica de
montar o comando do scrcpy.

## Arquitetura

```
run.py                      -> ponto de entrada
dexwin/
  config.py                 -> config JSON + valores válidos (portável)
  tools.py                  -> acha scrcpy.exe/adb.exe
  adb.py                    -> wrapper do adb + parsers (portável, testado)
  apps.py                   -> catálogo (parse de --list-apps) (portável, testado)
  profiles.py               -> perfis de display por app (portável)
  scrcpy.py                 -> builders do comando + ciclo de vida (portável, testado)
  platform_win/
    window_manager.py       -> janelas via Win32  (Windows)
    hotkeys.py              -> atalho global via Win32  (Windows)
  host/
    controller.py           -> estado (device/apps/sessões) + snapshot (portável, testado)
    bridge.py               -> js_api (window.pywebview.api) + publicador
    webhost.py              -> janela pywebview (WebView2)
frontend/                   -> Web Shell (copiado do projeto, inalterado)
tools/                      -> scrcpy.exe/adb.exe (você baixa; fora do git)
tests/                      -> testes da lógica portável (rodam em Linux)
```

O frontend fala com o Python por `window.pywebview.api.*` (ver `dexwin/host/bridge.py`,
classe `NativeAPI`) e recebe o estado por `window.DeckNative.receive(snapshot)`.
Os nomes e o formato são idênticos aos do projeto original, por isso o frontend
roda sem alterações.

## Como rodar (no Windows)

1. **Python 3.10+** instalado.
2. **WebView2 Runtime** (já vem no Windows 10/11 atualizados; se o app abrir em
   branco, instale o "Evergreen Runtime" da Microsoft).
3. Baixe o **scrcpy-win64 2.4+** e extraia em `tools/` (ver `tools/README.md`).
4. No PowerShell, dentro da pasta do projeto:

   ```powershell
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

5. No telefone: **Depuração USB** ligada e o PC autorizado.
6. Rodar:

   ```powershell
   python run.py
   ```

   (`python run.py --debug` abre com o DevTools do WebView2.)

## Testes (rodam em qualquer SO)

```bash
python -m unittest discover -s tests -p "test_*.py"
```

Cobrem parsers do adb, catálogo, builders do scrcpy, geometria de snap, config e
o fluxo do Controller (com dummies). **22 testes, sem precisar de hardware.**

## O que já está pronto (v0.2)

- Detecção de dispositivo, nome e bateria via adb.
- Catálogo de apps (`scrcpy --list-apps`).
- Abrir app em janela virtual (`--new-display`), espelhar tela, focar, minimizar,
  fechar, e **snap** (metades/cantos) via Win32.
- **Modo integrado** (`--integrated`): o app fica EMBUTIDO dentro do shell (como no
  Linux), via `SetParent` do Win32. Um app visível por vez, ocupando o "palco"
  (área toda menos a taskbar); alterna pela taskbar; ao abrir um painel (launcher,
  configurações…) o palco some e o shell aparece. Sem a flag, as janelas ficam
  flutuando soltas (modo clássico, mais rápido e à prova de falhas).
- Perfis de display por app (Discord já embutido; dá para adicionar outros).
- Favoritos, atalhos na área de trabalho, recentes, wallpaper (seletor nativo).
- Captura de tela do Windows (Pillow).
- Config persistida em `%APPDATA%\dex-windows\config.json`.

### Ligar o modo integrado

```powershell
py run.py --integrated
```

Ou, para deixar ligado por padrão, coloque `"integrated": true` no
`%APPDATA%\dex-windows\config.json`.

## O que falta testar no Windows (próximo passo, com você)

- Associação processo scrcpy → janela (hwnd) por PID: validar em telas reais.
- `SetForegroundWindow`: o Windows às vezes nega foco a processo em background;
  pode ser preciso o truque de `AttachThreadInput` (anotado no código).
- Atalho global F11 e o fluxo de fullscreen por app.
- Desempenho ("muito lento"): aqui as janelas scrcpy são **flutuantes** e só são
  posicionadas/focadas — evitando o *reparent* por frame que era a parte cara no
  modo integrado do Linux. Validar o ganho na prática.

## O que ainda NÃO foi portado (precisa de mais trabalho)

- **Controles do sistema Android** (Wi-Fi/Bluetooth/DND/volume do telefone/
  notificações): dependiam de um *agente companion* no Android. No MVP aparecem
  como "indisponível". Portar o agente é uma fase à parte.
- **Ícones reais dos apps**: por ora usa o glifo colorido de fallback do shell.
- **Modo integrado — recorte por painel**: hoje, ao abrir um painel HTML, o palco
  inteiro some (simples e robusto). O recorte fino (painel sobre o app, estilo
  XShape do Linux) via `SetWindowRgn` fica como evolução.
