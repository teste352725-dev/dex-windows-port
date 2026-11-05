"""Atalhos globais no Windows (RegisterHotKey num message loop próprio).

No Linux o F11 era capturado via grab do X11 (a parte que teve o bug do
AnyModifier). No Windows a API é RegisterHotKey + GetMessage, bem mais simples
e sem o problema de lock-mask.

Uso:
    hk = GlobalHotkeys()
    hk.register("fullscreen", MOD_NONE, VK_F11, callback)
    hk.start()
    ...
    hk.stop()
"""
from __future__ import annotations

import threading

# Modificadores (win32con.MOD_*). Valores fixos para não exigir win32 no import.
MOD_NONE = 0x0000
MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
MOD_WIN = 0x0008
MOD_NOREPEAT = 0x4000

VK_F11 = 0x7A
VK_F12 = 0x7B


def _win32():
    try:
        import win32con
        import win32gui
    except ImportError as exc:  # pragma: no cover - só no Windows
        raise RuntimeError("pywin32 é necessário para atalhos globais.") from exc
    return win32gui, win32con


class GlobalHotkeys:
    def __init__(self) -> None:
        self._bindings: dict[int, tuple[int, int, callable]] = {}
        self._names: dict[str, int] = {}
        self._next_id = 1
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._thread_id: int | None = None

    def register(self, name: str, modifiers: int, vk: int, callback) -> int:
        """Agenda um atalho. Chamar antes de start()."""
        hotkey_id = self._next_id
        self._next_id += 1
        self._bindings[hotkey_id] = (modifiers | MOD_NOREPEAT, vk, callback)
        self._names[name] = hotkey_id
        return hotkey_id

    def start(self) -> None:
        if self._thread:
            return
        self._thread = threading.Thread(target=self._loop, name="dex-hotkeys", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        # acorda o GetMessage postando WM_QUIT na thread
        if self._thread_id is not None:
            try:
                import win32api
                import win32con
                win32api.PostThreadMessage(self._thread_id, win32con.WM_QUIT, 0, 0)
            except Exception:
                pass

    def _loop(self) -> None:  # pragma: no cover - precisa de Windows
        import win32api
        import win32con
        import win32gui

        self._thread_id = win32api.GetCurrentThreadId()
        registered = []
        for hotkey_id, (mods, vk, _cb) in self._bindings.items():
            try:
                if win32gui.RegisterHotKey(None, hotkey_id, mods, vk):
                    registered.append(hotkey_id)
            except Exception:
                pass
        try:
            while not self._stop.is_set():
                rc, msg = win32gui.GetMessage(None, 0, 0)
                if rc == 0 or rc == -1:
                    break
                if msg[1] == win32con.WM_HOTKEY:
                    binding = self._bindings.get(msg[2])
                    if binding:
                        try:
                            binding[2]()
                        except Exception:
                            pass
        finally:
            for hotkey_id in registered:
                try:
                    win32gui.UnregisterHotKey(None, hotkey_id)
                except Exception:
                    pass
