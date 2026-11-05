@echo off
rem Atualizador do DEX para Windows — duplo-clique para buscar a versao mais nova.
rem Toda a logica fica no atualizar.py; este .bat so o chama (assim ele quase nunca muda).
cd /d "%~dp0"
py atualizar.py
