"""Atualizador do DEX para Windows — baixa a versão mais nova pela internet.

Funciona de qualquer rede (não precisa estar na mesma do desenvolvedor). Baixa o
código do repositório público no GitHub por HTTPS, faz um backup rápido do que vai
ser trocado e aplica por cima. NÃO mexe no scrcpy (tools/), no ambiente virtual
(.venv/) nem nas suas configurações (ficam em %APPDATA%\\dex-windows).

Uso: dê um duplo-clique em `atualizar.bat` (ou rode `py atualizar.py`).
Só depende da biblioteca padrão do Python — nada para instalar.
"""
from __future__ import annotations

import io
import json
import os
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

# ---- de onde baixar -------------------------------------------------------
OWNER = "teste352725-dev"
REPO = "dex-windows-port"
BRANCH = "main"
ZIP_URL = f"https://github.com/{OWNER}/{REPO}/archive/refs/heads/{BRANCH}.zip"
API_COMMIT = f"https://api.github.com/repos/{OWNER}/{REPO}/commits/{BRANCH}"
UA = "dex-windows-updater"

# O que nunca é tocado ao copiar (o próprio zip já não traz tools/.venv, mas
# listamos por segurança para o backup e para clareza).
PRESERVAR = {"tools", ".venv", "venv", "_backup_anterior", ".git",
             "captures", "__pycache__"}

HERE = Path(__file__).resolve().parent


def log(msg: str) -> None:
    print(msg, flush=True)


def versao_local() -> str:
    try:
        texto = (HERE / "dexwin" / "__init__.py").read_text(encoding="utf-8")
        for linha in texto.splitlines():
            if "__version__" in linha and "=" in linha:
                return linha.split("=", 1)[1].strip().strip("\"'")
    except Exception:
        pass
    return "?"


def ultimo_commit() -> str | None:
    """Melhor esforço: pega a mensagem do último commit (repo público, sem token)."""
    try:
        req = urllib.request.Request(API_COMMIT, headers={"User-Agent": UA,
                                     "Accept": "application/vnd.github+json"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            dados = json.load(resp)
        return (dados.get("commit", {}).get("message") or "").splitlines()[0] or None
    except Exception:
        return None


def baixar_zip() -> zipfile.ZipFile:
    log("→ Baixando a versão mais nova do GitHub…")
    req = urllib.request.Request(ZIP_URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        if resp.status != 200:
            raise RuntimeError(f"GitHub respondeu HTTP {resp.status}")
        conteudo = resp.read()
    log(f"  baixado: {len(conteudo) // 1024} KB")
    return zipfile.ZipFile(io.BytesIO(conteudo))


def fazer_backup() -> None:
    """Guarda uma cópia do que será sobrescrito, para rollback manual."""
    destino = HERE / "_backup_anterior"
    if destino.exists():
        shutil.rmtree(destino, ignore_errors=True)
    destino.mkdir(exist_ok=True)
    for item in HERE.iterdir():
        if item.name in PRESERVAR or item.name in {"_backup_anterior",
                                                    "atualizar.py", "atualizar.bat"}:
            continue
        alvo = destino / item.name
        try:
            if item.is_dir():
                shutil.copytree(item, alvo, dirs_exist_ok=True,
                                ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
            else:
                shutil.copy2(item, alvo)
        except Exception as exc:  # backup é best-effort
            log(f"  (aviso: não consegui fazer backup de {item.name}: {exc})")
    log("  backup salvo em _backup_anterior/")


def aplicar(zf: zipfile.ZipFile) -> int:
    """Copia os arquivos do zip por cima do projeto. Retorna quantos foram escritos."""
    nomes = zf.namelist()
    if not nomes:
        raise RuntimeError("zip vazio")
    raiz = nomes[0].split("/", 1)[0] + "/"   # ex.: dex-windows-port-main/
    escritos = 0
    for nome in nomes:
        if nome.endswith("/") or not nome.startswith(raiz):
            continue
        rel = nome[len(raiz):]
        if not rel:
            continue
        partes = Path(rel).parts
        if partes[0] in PRESERVAR:
            continue
        # Não sobrescrever o atualizador em execução (evita quebrar o processo);
        # uma nova versão dele é salva ao lado como .novo para troca manual.
        destino = HERE / rel
        if rel in {"atualizar.py", "atualizar.bat"}:
            destino = HERE / (rel + ".novo")
        destino.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(nome) as origem, open(destino, "wb") as saida:
            shutil.copyfileobj(origem, saida)
        escritos += 1
    return escritos


def reinstalar_deps_se_preciso(antes: str) -> None:
    depois = ""
    try:
        depois = (HERE / "requirements.txt").read_text(encoding="utf-8")
    except Exception:
        return
    if antes.strip() == depois.strip():
        return
    log("→ requirements.txt mudou; reinstalando dependências…")
    py = HERE / ".venv" / "Scripts" / "python.exe"
    py = py if py.exists() else Path(sys.executable)
    os.system(f'"{py}" -m pip install -r "{HERE / "requirements.txt"}" -q')


def main() -> int:
    log("=" * 48)
    log("  Atualizador do DEX para Windows")
    log("=" * 48)
    log(f"  versão atual: {versao_local()}")
    try:
        req_antes = ""
        try:
            req_antes = (HERE / "requirements.txt").read_text(encoding="utf-8")
        except Exception:
            pass

        zf = baixar_zip()
        log("→ Fazendo backup do que será trocado…")
        fazer_backup()
        log("→ Aplicando a atualização…")
        n = aplicar(zf)
        reinstalar_deps_se_preciso(req_antes)

        msg = ultimo_commit()
        log("")
        log(f"✓ Pronto! {n} arquivos atualizados. versão: {versao_local()}")
        if msg:
            log(f"  última mudança: {msg}")
        novo_py = HERE / "atualizar.py.novo"
        if novo_py.exists():
            log("  (há uma versão nova do próprio atualizador em atualizar.py.novo —")
            log("   se quiser, substitua atualizar.py por ela.)")
        log("")
        log("  Feche e abra o DEX de novo (py run.py) para ver as mudanças.")
        return 0
    except Exception as exc:
        log("")
        log(f"✗ Falhou: {exc}")
        log("  Nada foi quebrado — seu scrcpy e configs continuam intactos.")
        log("  Confira a internet e tente de novo; se persistir, me avise.")
        return 1


if __name__ == "__main__":
    codigo = main()
    try:
        input("\nAperte Enter para fechar…")
    except EOFError:
        pass
    sys.exit(codigo)
