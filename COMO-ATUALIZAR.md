# Como atualizar o DEX (pela internet)

Sempre que houver uma versão nova, é só:

1. **Feche o DEX** se estiver aberto.
2. Dê **duplo-clique em `atualizar.bat`** (dentro da pasta do projeto).
3. Espere a mensagem **`✓ Pronto!`** e aperte Enter.
4. Abra o DEX de novo: `py run.py`.

Funciona de **qualquer rede** — não precisa estar na mesma do desenvolvedor.

## O que o atualizador faz (e o que ele NÃO toca)

- Baixa o código novo do GitHub por HTTPS e aplica por cima.
- Faz um **backup** do que foi trocado em `_backup_anterior/` (para rollback manual).
- Se o `requirements.txt` mudar, reinstala as dependências sozinho.

**Nunca mexe em:**
- `tools/` — o seu scrcpy continua lá.
- `.venv/` — o ambiente virtual.
- Suas configurações (ficam em `%APPDATA%\dex-windows`).

## Se der errado

Se aparecer `✗ Falhou`, nada foi quebrado — scrcpy e configs ficam intactos.
Cheque a internet e tente de novo. Se precisar voltar à versão anterior, o que foi
trocado está em `_backup_anterior/`.

## Repositório

https://github.com/teste352725-dev/dex-windows-port
