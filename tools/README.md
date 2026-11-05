# tools/ — binários de runtime (não versionados)

Coloque aqui o **scrcpy para Windows** (que já vem com o `adb.exe`):

1. Baixe o `scrcpy-win64-vX.Y.zip` em https://github.com/Genymobile/scrcpy/releases
   (precisa ser **scrcpy 2.4+**, que suporta `--new-display` e `--start-app`;
   o ideal é a mais recente 3.x).
2. Extraia o conteúdo **aqui dentro**. Deve ficar algo como:

   ```
   tools/
     scrcpy-win64-v3.1/
       scrcpy.exe
       adb.exe
       ... (dlls, server, etc.)
   ```

O `dexwin/tools.py` procura `scrcpy.exe`/`adb.exe` recursivamente dentro de
`tools/` (ou no PATH, ou via as variáveis `DEX_SCRCPY` / `DEX_ADB`).

> Esses arquivos ficam fora do git (ver `.gitignore`) porque são grandes e têm
> licença própria.
