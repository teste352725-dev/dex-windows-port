"""Gerência de janelas no Windows (Win32) — o equivalente ao wmctrl do Linux.

Usa pywin32 (win32gui/win32con/win32process). O import é tardio para o resto do
projeto (parsers, builders, testes) rodar em Linux sem pywin32 instalado.

Responsabilidades:
- Listar janelas de topo com (hwnd, título, pid, retângulo).
- Associar um processo scrcpy à sua janela (por PID; cai no título).
- Mover/redimensionar, focar, minimizar, restaurar e fechar.
- (Opcional/experimental) embutir uma janela dentro de outra via SetParent.

Observação de desempenho (o "muito lento" relatado): preferimos janelas scrcpy
FLUTUANTES e só as posicionamos/focamos — nada de reparent agressivo por frame,
que no modo integrado do Linux era a parte cara. SetParent fica como modo
experimental, desligado por padrão.
"""
from __future__ import annotations

import time
from dataclasses import dataclass


def _win32():
    """Importa pywin32 sob demanda, com erro claro se faltar."""
    try:
        import win32con
        import win32gui
        import win32process
    except ImportError as exc:  # pragma: no cover - só no Windows
        raise RuntimeError(
            "pywin32 é necessário no Windows (pip install pywin32)."
        ) from exc
    return win32gui, win32con, win32process


@dataclass(frozen=True)
class WinWindow:
    hwnd: int
    title: str
    pid: int
    x: int
    y: int
    width: int
    height: int
    minimized: bool


class WindowManager:
    """Operações de janela no Windows. Instanciar só no Windows."""

    def __init__(self) -> None:
        self.win32gui, self.win32con, self.win32process = _win32()
        # hwnd -> (style, exstyle, parent) salvos ao embutir, para desfazer.
        self._embedded_state: dict[int, tuple[int, int, int]] = {}

    # ---- consulta -------------------------------------------------------
    def list_windows(self) -> list[WinWindow]:
        g, con, proc = self.win32gui, self.win32con, self.win32process
        result: list[WinWindow] = []

        def callback(hwnd, _):
            if not g.IsWindowVisible(hwnd):
                return
            title = g.GetWindowText(hwnd)
            if not title:
                return
            try:
                _tid, pid = proc.GetWindowThreadProcessId(hwnd)
            except Exception:
                pid = 0
            try:
                left, top, right, bottom = g.GetWindowRect(hwnd)
            except Exception:
                left = top = right = bottom = 0
            placement = g.GetWindowPlacement(hwnd)
            minimized = placement[1] == con.SW_SHOWMINIMIZED
            result.append(WinWindow(
                hwnd=hwnd, title=title, pid=pid or 0,
                x=left, y=top, width=right - left, height=bottom - top,
                minimized=minimized,
            ))

        g.EnumWindows(callback, None)
        return result

    def find_by_pid(self, pid: int, pids: set[int] | None = None) -> WinWindow | None:
        """Janela cujo PID bate (ou está na árvore de PIDs informada)."""
        candidates = pids or {pid}
        for w in self.list_windows():
            if w.pid in candidates:
                return w
        return None

    def find_by_title(self, substring: str) -> WinWindow | None:
        for w in self.list_windows():
            if substring and substring in w.title:
                return w
        return None

    def wait_for_window(self, *, pid: int | None = None, title: str | None = None,
                        timeout: float = 8.0, interval: float = 0.25) -> WinWindow | None:
        """Espera a janela do scrcpy aparecer após o launch."""
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            found = (self.find_by_pid(pid) if pid else None) or \
                    (self.find_by_title(title) if title else None)
            if found:
                return found
            time.sleep(interval)
        return None

    # ---- ações ----------------------------------------------------------
    def move_resize(self, hwnd: int, x: int, y: int, width: int, height: int) -> None:
        g, con, _ = self.win32gui, self.win32con, self.win32process
        g.SetWindowPos(hwnd, con.HWND_TOP, int(x), int(y), int(width), int(height),
                       con.SWP_NOZORDER | con.SWP_SHOWWINDOW)

    def focus(self, hwnd: int) -> None:
        """Traz a janela para frente de forma robusta.

        SetForegroundWindow sozinho costuma falhar quando quem chama não é o
        processo em primeiro plano (caso típico aqui: o scrcpy roda em outro
        processo). O truque padrão do Win32 é anexar a fila de input da nossa
        thread à da janela em foco (AttachThreadInput) durante a troca.
        """
        g, con, proc = self.win32gui, self.win32con, self.win32process
        import win32api  # local: só no Windows

        if g.GetWindowPlacement(hwnd)[1] == con.SW_SHOWMINIMIZED:
            g.ShowWindow(hwnd, con.SW_RESTORE)
        else:
            g.ShowWindow(hwnd, con.SW_SHOW)

        foreground = g.GetForegroundWindow()
        this_thread = win32api.GetCurrentThreadId()
        fg_thread = proc.GetWindowThreadProcessId(foreground)[0] if foreground else this_thread
        attached = False
        try:
            if fg_thread and fg_thread != this_thread:
                proc.AttachThreadInput(this_thread, fg_thread, True)
                attached = True
            g.BringWindowToTop(hwnd)
            g.SetForegroundWindow(hwnd)
        except Exception:
            try:
                g.BringWindowToTop(hwnd)
            except Exception:
                pass
        finally:
            if attached:
                try:
                    proc.AttachThreadInput(this_thread, fg_thread, False)
                except Exception:
                    pass

    def minimize(self, hwnd: int) -> None:
        g, con, _ = self.win32gui, self.win32con, self.win32process
        g.ShowWindow(hwnd, con.SW_MINIMIZE)

    def restore(self, hwnd: int) -> None:
        g, con, _ = self.win32gui, self.win32con, self.win32process
        g.ShowWindow(hwnd, con.SW_RESTORE)

    def close(self, hwnd: int) -> None:
        g, con, _ = self.win32gui, self.win32con, self.win32process
        g.PostMessage(hwnd, con.WM_CLOSE, 0, 0)

    def is_minimized(self, hwnd: int) -> bool:
        g, con, _ = self.win32gui, self.win32con, self.win32process
        try:
            return g.GetWindowPlacement(hwnd)[1] == con.SW_SHOWMINIMIZED
        except Exception:
            return False

    # ---- snap / layout --------------------------------------------------
    def work_area(self) -> tuple[int, int, int, int]:
        """Área útil do monitor principal (sem a barra do Windows): (x,y,w,h)."""
        g, con, _ = self.win32gui, self.win32con, self.win32process
        import win32api  # local: só no Windows
        monitor = win32api.MonitorFromPoint((0, 0), win32con_MONITOR_DEFAULTTOPRIMARY())
        info = win32api.GetMonitorInfo(monitor)
        left, top, right, bottom = info["Work"]
        return left, top, right - left, bottom - top

    def snap(self, hwnd: int, layout: str, taskbar_height: int = 52) -> bool:
        """Posiciona a janela num layout (metades, cantos...) na área útil.

        taskbar_height = altura reservada para a barra do Web Shell (no topo do
        próprio shell), já que as janelas scrcpy flutuam sobre o desktop do PC.
        """
        geo = snap_geometry(layout, *self.work_area(), taskbar_height)
        if not geo:
            return False
        self.move_resize(hwnd, *geo)
        return True

    # ---- modo integrado (embutir a janela do app dentro do shell) -------
    def embed(self, child_hwnd: int, parent_hwnd: int) -> bool:
        """Reparenta a janela do app para DENTRO do shell: vira filha sem borda.

        Guarda estilo/estilo-estendido/pai originais para poder desfazer
        (``unembed``). Depois disso, as coordenadas da janela passam a ser
        relativas à área cliente do shell.
        """
        g, con = self.win32gui, self.win32con
        try:
            style = g.GetWindowLong(child_hwnd, con.GWL_STYLE)
            exstyle = g.GetWindowLong(child_hwnd, con.GWL_EXSTYLE)
            try:
                original_parent = g.GetParent(child_hwnd)
            except Exception:
                original_parent = 0
            self._embedded_state[child_hwnd] = (style, exstyle, original_parent or 0)
            strip = (con.WS_CAPTION | con.WS_THICKFRAME | con.WS_MINIMIZEBOX
                     | con.WS_MAXIMIZEBOX | con.WS_SYSMENU | con.WS_POPUP)
            new_style = (style & ~strip) | con.WS_CHILD
            g.SetWindowLong(child_hwnd, con.GWL_STYLE, new_style)
            new_ex = exstyle & ~getattr(con, "WS_EX_APPWINDOW", 0x00040000)
            g.SetWindowLong(child_hwnd, con.GWL_EXSTYLE, new_ex)
            g.SetParent(child_hwnd, parent_hwnd)
            g.SetWindowPos(child_hwnd, con.HWND_TOP, 0, 0, 0, 0,
                           con.SWP_NOMOVE | con.SWP_NOSIZE
                           | con.SWP_FRAMECHANGED | con.SWP_SHOWWINDOW)
            return True
        except Exception:
            self._embedded_state.pop(child_hwnd, None)
            return False

    def unembed(self, child_hwnd: int) -> bool:
        """Desfaz o ``embed``: volta a ser janela de topo com borda."""
        g, con = self.win32gui, self.win32con
        state = self._embedded_state.pop(child_hwnd, None)
        if not state:
            return False
        style, exstyle, original_parent = state
        try:
            g.SetParent(child_hwnd, original_parent or 0)
            g.SetWindowLong(child_hwnd, con.GWL_STYLE, style)
            g.SetWindowLong(child_hwnd, con.GWL_EXSTYLE, exstyle)
            g.SetWindowPos(child_hwnd, con.HWND_TOP, 80, 80, 960, 600,
                           con.SWP_FRAMECHANGED | con.SWP_SHOWWINDOW)
            return True
        except Exception:
            return False

    def is_embedded(self, child_hwnd: int) -> bool:
        return child_hwnd in self._embedded_state

    def set_child_bounds(self, child_hwnd: int, x: int, y: int,
                         width: int, height: int) -> bool:
        try:
            self.win32gui.MoveWindow(child_hwnd, int(x), int(y),
                                     max(1, int(width)), max(1, int(height)), True)
            return True
        except Exception:
            return False

    def show_window(self, hwnd: int, visible: bool) -> bool:
        g, con = self.win32gui, self.win32con
        try:
            g.ShowWindow(hwnd, con.SW_SHOWNA if visible else con.SW_HIDE)
            return True
        except Exception:
            return False

    def dpi_scale(self, hwnd: int) -> float:
        """Fator de escala de DPI da janela (1.0 = 100%, 1.5 = 150%)."""
        try:
            import ctypes
            dpi = ctypes.windll.user32.GetDpiForWindow(hwnd)
            if dpi:
                return dpi / 96.0
        except Exception:
            pass
        return 1.0

    def client_box(self, hwnd: int) -> tuple[int, int, float]:
        """(largura, altura em px físicos, escala_dpi) da área cliente do hwnd."""
        left, top, right, bottom = self.win32gui.GetClientRect(hwnd)
        return right - left, bottom - top, self.dpi_scale(hwnd)

    def find_own_main_window(self) -> int | None:
        """Janela de topo visível do NOSSO processo (o shell): a de maior área."""
        import os
        g, proc = self.win32gui, self.win32process
        mypid = os.getpid()
        best = None
        best_area = -1

        def callback(hwnd, _):
            nonlocal best, best_area
            if not g.IsWindowVisible(hwnd):
                return
            try:
                _tid, pid = proc.GetWindowThreadProcessId(hwnd)
            except Exception:
                return
            if pid != mypid:
                return
            try:
                left, top, right, bottom = g.GetWindowRect(hwnd)
            except Exception:
                return
            area = (right - left) * (bottom - top)
            if area > best_area:
                best_area = area
                best = hwnd

        g.EnumWindows(callback, None)
        return best


def win32con_MONITOR_DEFAULTTOPRIMARY() -> int:
    # Constante estável; evita depender de win32con ter o nome exportado.
    return 0x00000001


def snap_geometry(layout: str, area_x: int, area_y: int, area_w: int, area_h: int,
                  taskbar_height: int = 0) -> tuple[int, int, int, int] | None:
    """Calcula (x, y, w, h) para um layout de snap. Função pura (testável)."""
    top = area_y + taskbar_height
    height = area_h - taskbar_height
    half = area_w // 2
    sev = int(area_w * 0.7)
    thi = area_w - sev
    halfh = height // 2
    layouts = {
        "left_half":   (area_x,        top,           half,  height),
        "right_half":  (area_x + half, top,           area_w - half, height),
        "left_70":     (area_x,        top,           sev,   height),
        "right_30":    (area_x + sev,  top,           thi,   height),
        "left_30":     (area_x,        top,           thi,   height),
        "right_70":    (area_x + thi,  top,           sev,   height),
        "top_left":    (area_x,        top,           half,  halfh),
        "top_right":   (area_x + half, top,           area_w - half, halfh),
        "bottom_left": (area_x,        top + halfh,   half,  height - halfh),
        "bottom_right":(area_x + half, top + halfh,   area_w - half, height - halfh),
        "maximized":   (area_x,        top,           area_w, height),
    }
    return layouts.get(layout)
