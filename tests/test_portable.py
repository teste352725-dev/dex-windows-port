"""Testes da lógica portável (rodam em Linux, sem Windows/hardware).

Cobrem: parsers do adb, catálogo de apps, builders do scrcpy, geometria de snap,
config (coerção/roundtrip) e o fluxo do Controller com dummies.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dexwin import adb, apps, config, profiles
from dexwin import scrcpy as scr
from dexwin.platform_win.window_manager import snap_geometry
from dexwin.host.controller import Controller


class AdbParsers(unittest.TestCase):
    def test_parse_devices(self):
        out = ("List of devices attached\n"
               "ABC123   device product:x model:Moto_G54 device:y\n"
               "ZZZ   unauthorized\n")
        recs = adb.parse_devices(out)
        self.assertEqual(len(recs), 2)
        self.assertEqual(recs[0].serial, "ABC123")
        self.assertEqual(recs[0].state, "device")
        self.assertEqual(recs[0].model, "Moto G54")
        self.assertEqual(recs[1].state, "unauthorized")

    def test_parse_getprop(self):
        props = adb.parse_getprop("[ro.product.model]: [Moto G54]\n[x.y]: [z]\n")
        self.assertEqual(props["ro.product.model"], "Moto G54")

    def test_parse_battery(self):
        dump = "  level: 87\n  status: 2\n"
        self.assertEqual(adb.parse_battery_percent(dump), 87)
        self.assertTrue(adb.parse_battery_charging(dump))

    def test_parse_battery_not_charging(self):
        self.assertFalse(adb.parse_battery_charging("status: 3\n"))


class AppCatalog(unittest.TestCase):
    def test_parse_inline(self):
        out = (" * Câmera                         com.android.camera\n"
               " - Discord                        com.discord\n")
        result = apps.parse_scrcpy_apps(out)
        pkgs = {a.package: a for a in result}
        self.assertIn("com.discord", pkgs)
        self.assertEqual(pkgs["com.discord"].kind, "user")
        self.assertEqual(pkgs["com.android.camera"].kind, "system")

    def test_parse_wrapped_package(self):
        # nome longo -> pacote na linha seguinte
        out = (" - Um Aplicativo Com Nome Bem Grande De Verdade\n"
               "   com.exemplo.appgrande\n")
        result = apps.parse_scrcpy_apps(out)
        self.assertEqual(result[0].package, "com.exemplo.appgrande")

    def test_filter_and_flags(self):
        catalog = apps.parse_scrcpy_apps(
            " - Fotos   com.a.fotos\n - Banco   com.b.banco\n")
        cfg = {"favorites": ["com.a.fotos"], "recent": ["com.b.banco"], "desktop_apps": []}
        apps.apply_user_flags(catalog, cfg)
        favs = apps.filter_apps(catalog, "favorites")
        self.assertEqual([a.package for a in favs], ["com.a.fotos"])
        found = apps.filter_apps(catalog, "all", "banco")
        self.assertEqual([a.package for a in found], ["com.b.banco"])


class ScrcpyBuilders(unittest.TestCase):
    def test_launch_command_core_idea(self):
        app = apps.AppInfo(name="Fotos", package="com.a.fotos")
        cfg = dict(config.DEFAULT_CONFIG)
        cmd, title = scr.build_launch_command("scrcpy", "SER1", app, cfg)
        self.assertIn("--new-display=1280x720/200", cmd)
        self.assertIn("--start-app=com.a.fotos", cmd)
        self.assertIn("--serial=SER1", cmd)
        self.assertIn("--no-audio", cmd)  # audio False por padrão
        self.assertTrue(title.startswith("Fotos"))

    def test_profile_forces_fullscreen(self):
        app = apps.AppInfo(name="Discord", package="com.discord")
        cfg = dict(config.DEFAULT_CONFIG)
        cmd, _ = scr.build_launch_command("scrcpy", "S", app, cfg)
        self.assertIn("--fullscreen", cmd)
        self.assertIn("--new-display=2720x1536/480", cmd)  # perfil embutido

    def test_mirror_command(self):
        cfg = dict(config.DEFAULT_CONFIG)
        cmd, title = scr.build_mirror_command("scrcpy", "S", cfg)
        self.assertIn("--display-id=0", cmd)
        self.assertIn("Tela do celular — DEX", title)

    def test_audio_on_omits_no_audio(self):
        app = apps.AppInfo(name="X", package="com.x.y")
        cfg = {**config.DEFAULT_CONFIG, "audio": True}
        cmd, _ = scr.build_launch_command("scrcpy", "S", app, cfg)
        self.assertNotIn("--no-audio", cmd)


class SnapGeometry(unittest.TestCase):
    def test_halves(self):
        left = snap_geometry("left_half", 0, 0, 1920, 1080, 0)
        right = snap_geometry("right_half", 0, 0, 1920, 1080, 0)
        self.assertEqual(left, (0, 0, 960, 1080))
        self.assertEqual(right, (960, 0, 960, 1080))

    def test_taskbar_offset(self):
        maxi = snap_geometry("maximized", 0, 0, 1920, 1080, 52)
        self.assertEqual(maxi, (0, 52, 1920, 1028))

    def test_unknown_layout(self):
        self.assertIsNone(snap_geometry("nope", 0, 0, 100, 100))


class ConfigRoundtrip(unittest.TestCase):
    def test_coerce_drops_invalid(self):
        cfg = config._coerce({"display": "9999x9999/999", "fps": 61, "favorites": ["a", 2]})
        self.assertEqual(cfg["display"], config.DEFAULT_CONFIG["display"])  # inválido -> default
        self.assertEqual(cfg["fps"], config.DEFAULT_CONFIG["fps"])
        self.assertEqual(cfg["favorites"], ["a"])  # descarta não-string

    def test_save_load(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "config.json"
            cfg = dict(config.DEFAULT_CONFIG)
            cfg["display"] = "1600x900/180"
            config.save_config(cfg, path)
            loaded = config.load_config(path)
            self.assertEqual(loaded["display"], "1600x900/180")

    def test_record_recent(self):
        cfg = {"recent": ["b", "c"]}
        config.record_recent(cfg, "a")
        self.assertEqual(cfg["recent"][0], "a")
        config.record_recent(cfg, "c")  # move para o topo, sem duplicar
        self.assertEqual(cfg["recent"][:2], ["c", "a"])


# ---- dummies para testar o Controller sem adb/scrcpy/Windows ----
class FakeAdb:
    def __init__(self, devices):
        self._devices = devices
    def list_devices(self):
        return self._devices
    def getprop(self, serial):
        return {"ro.product.model": "FakePhone"}
    def battery(self, serial):
        return 77, True


class FakeHandle:
    def __init__(self, pid, app, title):
        self.pid = pid
        self.app = app
        self.window_title = title
        self.hwnd = None
        self._alive = True
    @property
    def alive(self):
        return self._alive


class FakeScrcpy:
    def __init__(self, catalog):
        self.catalog = catalog
        self.launched = []
        self._next_pid = 1000
    def list_apps(self, serial):
        return list(self.catalog)
    def find_by_package(self, package):
        return [h for h in self.launched if h.app.package == package]
    def find_by_pid(self, pid):
        return next((h for h in self.launched if h.pid == int(pid)), None)
    def launch(self, serial, app, config):
        h = FakeHandle(self._next_pid, app, f"{app.name} — DEX")
        self._next_pid += 1
        self.launched.append(h)
        return h
    def mirror(self, serial, config):
        return self.launch(serial, apps.AppInfo("Espelho", "dex.mirror", "system"), config)
    def sessions(self):
        return list(self.launched)
    def reap_finished(self):
        return []
    def terminate(self, handle):
        if handle in self.launched:
            self.launched.remove(handle)
    def terminate_all(self):
        self.launched.clear()


class ControllerFlow(unittest.TestCase):
    def _controller(self):
        dev = adb.DeviceRecord(serial="SER1", state="device", model="FakePhone")
        catalog = apps.parse_scrcpy_apps(" - Fotos   com.a.fotos\n - Banco   com.b.banco\n")
        c = Controller(FakeAdb([dev]), FakeScrcpy(catalog), window_manager=None,
                       config=dict(config.DEFAULT_CONFIG))
        c.poll()
        return c

    def test_poll_loads_catalog_and_battery(self):
        c = self._controller()
        self.assertEqual(c.device_name, "FakePhone")
        self.assertEqual(c.battery_percent, 77)
        self.assertEqual(len(c.apps), 2)

    def test_open_app_launches_and_records_recent(self):
        c = self._controller()
        c.open_app("com.a.fotos")
        self.assertEqual(len(c.scrcpy.sessions()), 1)
        self.assertEqual(c.config["recent"][0], "com.a.fotos")
        # reabrir não duplica sessão (foca a existente)
        c.open_app("com.a.fotos")
        self.assertEqual(len(c.scrcpy.sessions()), 1)

    def test_snapshot_shape(self):
        c = self._controller()
        c.open_app("com.a.fotos")
        snap = c.snapshot()
        for key in ("apps", "device", "battery", "system", "activeApp",
                    "sessions", "config", "notifications"):
            self.assertIn(key, snap)
        self.assertTrue(snap["device"]["connected"])
        self.assertEqual(snap["battery"]["percent"], 77)
        fotos = next(a for a in snap["apps"] if a["id"] == "com.a.fotos")
        self.assertEqual(fotos["running_count"], 1)
        self.assertTrue(fotos["active"])

    def test_toggle_favorite(self):
        c = self._controller()
        c.toggle_favorite("com.b.banco")
        self.assertIn("com.b.banco", c.config["favorites"])
        banco = next(a for a in c.apps if a.package == "com.b.banco")
        self.assertTrue(banco.favorite)

    def test_open_without_device_raises(self):
        c = Controller(FakeAdb([]), FakeScrcpy([]), None, dict(config.DEFAULT_CONFIG))
        c.poll()
        with self.assertRaises(RuntimeError):
            c.open_app("com.a.fotos")


if __name__ == "__main__":
    unittest.main()
