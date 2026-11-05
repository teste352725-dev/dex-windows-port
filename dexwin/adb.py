"""Wrapper fino do adb.exe + parsers puros (testáveis sem hardware).

Os parsers são funções livres para dar para testar com strings fixas; a classe
``Adb`` só executa o binário e delega o parsing a elas.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass


@dataclass(frozen=True)
class DeviceRecord:
    serial: str
    state: str          # 'device', 'unauthorized', 'offline', ...
    model: str = ""


def parse_devices(output: str) -> list[DeviceRecord]:
    """Lê a saída de ``adb devices -l``.

    Formato típico:
        List of devices attached
        ABC123    device product:... model:Moto_G54 device:...
        XYZ       unauthorized
    """
    records: list[DeviceRecord] = []
    for line in output.splitlines():
        line = line.strip()
        if not line or line.lower().startswith("list of devices"):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        serial, state = parts[0], parts[1]
        model = ""
        for token in parts[2:]:
            if token.startswith("model:"):
                model = token.split(":", 1)[1].replace("_", " ")
        records.append(DeviceRecord(serial=serial, state=state, model=model))
    return records


def parse_getprop(output: str) -> dict[str, str]:
    """Lê ``adb shell getprop`` no formato ``[chave]: [valor]``."""
    props: dict[str, str] = {}
    for line in output.splitlines():
        if "]: [" not in line:
            continue
        key, _, value = line.partition("]: [")
        props[key.strip().lstrip("[")] = value.strip().rstrip("]")
    return props


def parse_battery_percent(output: str) -> int | None:
    """Extrai 'level: N' de ``adb shell dumpsys battery``."""
    for line in output.splitlines():
        line = line.strip()
        if line.startswith("level:"):
            try:
                return max(0, min(100, int(line.split(":", 1)[1].strip())))
            except ValueError:
                return None
    return None


def parse_battery_charging(output: str) -> bool | None:
    """'status: 2' (charging) ou 'AC/USB/Wireless powered: true'."""
    powered = None
    for line in output.splitlines():
        line = line.strip()
        if line.startswith("status:"):
            try:
                # 2 = charging, 5 = full
                return int(line.split(":", 1)[1].strip()) in (2, 5)
            except ValueError:
                pass
        if "powered:" in line:
            powered = powered or line.endswith("true")
    return powered


class AdbError(RuntimeError):
    """Erro apresentável vindo do adb."""


class Adb:
    def __init__(self, adb_path: str):
        self.adb_path = adb_path

    def _run(self, args: list[str], timeout: int = 15) -> subprocess.CompletedProcess:
        try:
            return subprocess.run(
                [self.adb_path, *args],
                capture_output=True, text=True, timeout=timeout,
                # CREATE_NO_WINDOW no Windows evita piscar console preto.
                creationflags=0x08000000 if hasattr(subprocess, "STARTUPINFO")
                and __import__("sys").platform.startswith("win") else 0,
            )
        except FileNotFoundError as exc:
            raise AdbError(f"adb não encontrado: {self.adb_path}") from exc
        except subprocess.TimeoutExpired as exc:
            raise AdbError("adb não respondeu a tempo.") from exc

    def list_devices(self) -> list[DeviceRecord]:
        result = self._run(["devices", "-l"], timeout=8)
        return parse_devices(result.stdout)

    def getprop(self, serial: str) -> dict[str, str]:
        result = self._run(["-s", serial, "shell", "getprop"])
        return parse_getprop(result.stdout)

    def battery(self, serial: str) -> tuple[int | None, bool | None]:
        result = self._run(["-s", serial, "shell", "dumpsys", "battery"])
        return parse_battery_percent(result.stdout), parse_battery_charging(result.stdout)

    def shell(self, serial: str, *args: str, timeout: int = 15) -> str:
        result = self._run(["-s", serial, "shell", *args], timeout=timeout)
        return result.stdout
