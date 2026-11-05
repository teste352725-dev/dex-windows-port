/* Adapter único do runtime: o restante da Dex usa somente DeckNative. */
(function () {
  'use strict';
  var demo = new URLSearchParams(location.search).get('demo') === '1';
  var errors = [];
  var surface = null, lastAvailable = null, surfaceObserver = null, surfaceFrame = null;
  // XShape accepts rectangles. Merge equal scanlines of the CSS rounded box
  // so the Android child remains visible outside its actual curved boundary.
  function panelOcclusionRects(node) {
    var box = node.getBoundingClientRect(), css = getComputedStyle(node);
    var x = Math.floor(box.x), y = Math.floor(box.y);
    var width = Math.ceil(box.right) - x, height = Math.ceil(box.bottom) - y;
    if (!width || !height) return [];
    var scale = node.offsetWidth ? box.width / node.offsetWidth : 1;
    var radii = ['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(function(key) {
      return Math.min(width / 2, height / 2, (parseFloat(css[key]) || 0) * scale);
    });
    function inset(radius, distance) {
      if (distance >= radius) return 0;
      return radius - Math.sqrt(Math.max(0, radius * radius - Math.pow(radius - distance, 2)));
    }
    var rows = [], last = null;
    for (var row = 0; row < height; row++) {
      var left = Math.floor(Math.max(inset(radii[0], row + .5), inset(radii[3], height - row - .5)));
      var right = Math.floor(Math.max(inset(radii[1], row + .5), inset(radii[2], height - row - .5)));
      var span = {x:x + left, y:y + row, width:width - left - right, height:1};
      if (last && last.x === span.x && last.width === span.width) last.height++;
      else { rows.push(span); last = span; }
    }
    return rows;
  }
  function reserveSurface(value) {
    surface = value;
    if (!surfaceObserver && value) {
      surfaceObserver = new MutationObserver(syncSurface);
      surfaceObserver.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden','style','class']});
      document.addEventListener('animationstart', syncSurface, true);
      document.addEventListener('animationend', syncSurface, true);
      document.addEventListener('animationcancel', syncSurface, true);
      window.addEventListener('resize', syncSurface);
    }
    syncSurface();
  }
  function syncSurface() {
    var busy = ['launcher','quickSettings','calendarPopover','volumePopover','notificationsPanel','contextMenu','deckSettings'].some(function(id) {
      var node = document.getElementById(id); return node && !node.hidden;
    });
    // A região Android é exclusiva. Ao abrir um painel HTML, oculta-se a
    // superfície nativa inteira, nunca click-through ou HTML atrás do SDL.
    var icons = document.getElementById('desktopIcons');
    var launcher = document.getElementById('launcher');
    var launcherOpen = launcher && !launcher.hidden;
    var visibility = launcherOpen || (surface && !surface.windowed && !busy) ? 'hidden' : '';
    if (icons.style.visibility !== visibility) icons.style.visibility = visibility;
    if (surface && surface.windowed) {
      var panels = ['launcher','quickSettings','calendarPopover','volumePopover','notificationsPanel','contextMenu','deckSettings'].map(function(id) {
        var n = document.getElementById(id); return n && !n.hidden ? n : null;
      }).filter(Boolean);
      var rects = [].concat.apply([], panels.map(panelOcclusionRects));
      if (surfaceFrame === null && panels.some(function(n) { return n.getAnimations().some(function(a) { return a.playState === 'running'; }); })) {
        surfaceFrame = requestAnimationFrame(function() { surfaceFrame = null; syncSurface(); });
      }
      var encoded=JSON.stringify(rects);
      if (lastAvailable !== encoded) {lastAvailable=encoded;call('surface_occlusions',[rects]);}
      return;
    }
    if (surface && lastAvailable !== !busy) {
      lastAvailable = !busy;
      call('experimental_surface', [!busy]);
    }
    if (!surface) lastAvailable = null;
  }
  window.addEventListener('error', function(e) { errors.push(String(e.message)); if (errors.length > 20) errors.shift(); });
  function call(method, args) {
    if (demo || !window.pywebview || !window.pywebview.api) {
      window.ShellAPI.showMessage(demo ? 'Demonstração visual' : 'A conexão com o Core ainda está iniciando.');
      return Promise.resolve({ok: false});
    }
    return window.pywebview.api[method].apply(null, args || []).then(function (result) {
      if (!result.ok) window.ShellAPI.showMessage(result.error || 'Operação indisponível');
      if (result.sessions) window.ShellAPI.showWindowSelector(result.sessions);
      return result;
    }).catch(function (error) {
      window.ShellAPI.showMessage(String(error));
      return {ok: false};
    });
  }
  window.DeckNative = {
    demo: demo,
    errors: errors,
    openApp: function (id) { return call('open_app', [id]); },
    mirrorScreen: function () { return call('mirror_screen'); },
    experimentalSlot: function (rect) { return call('experimental_slot', [rect]); },
    activateApp: function (id, active) { return call('activate_app', [id, active]); },
    focusSession: function (pid) { return call('focus_session', [pid]); },
    minimizeSession: function (pid) { return call('minimize_session', [pid]); },
    closeSession: function (pid) { return call('close_session', [pid]); },
    closeApp: function (id) { return call('close_app', [id]); },
    toggleFavorite: function (id) { return call('toggle_favorite', [id]); },
    toggleShortcut: function (id) { return call('toggle_shortcut', [id]); },
    refresh: function () { return call('refresh'); },
    updateConfig: function (value) { return call('update_config', [value]); },
    hostControls: function (action, value) { return call('host_controls', [action || 'state', value == null ? null : value]); },
    androidSettings: function (page) { return call('android_settings', [page]); },
    settingsOptions: function () { return call('settings_options'); },
    saveSettings: function (value) {
      return call('save_settings', [value]).then(function(result) {
        if (result.snapshot) window.DeckNative.receive(result.snapshot);
        return result;
      });
    },
    pickWallpaper: function () {
      return call('pick_wallpaper', []).then(function(result) {
        if (result && result.snapshot) window.DeckNative.receive(result.snapshot);
        return result;
      });
    },
    systemAction: function (feature, target) {
      if (window.ShellAPI.systemPending(feature)) return Promise.resolve({ok:false});
      window.ShellAPI.setSystemPending(feature, true);
      return call('system_action', [feature, target]).then(function(result) {
        if (result.snapshot) window.DeckNative.receive(result.snapshot);
        return result;
      }).finally(function() { window.ShellAPI.setSystemPending(feature, false); });
    },
    captureDesktop: function () {
      if (window.ShellAPI.systemPending('capture')) return Promise.resolve({ok:false});
      window.ShellAPI.setSystemPending('capture', true);
      return call('capture_desktop').then(function(result) {
        if (result.ok && result.path) window.ShellAPI.showMessage('Captura salva: ' + result.path);
        return result;
      }).finally(function() { window.ShellAPI.setSystemPending('capture', false); });
    },
    snapWindow: function (pid, layout) {
      return call('snap_window', [pid, layout, document.getElementById('taskbar').offsetHeight]);
    },
    receive: function (data) {
      var api = window.ShellAPI;
      api.setConfig(data.config);
      api.setSessions(data.sessions);
      api.setApps(data.apps);
      api.setBattery(data.battery.percent, data.battery.charging);
      api.setDeviceStatus(data.device);
      api.setSystemState(data.system);
      api.setActiveApp(data.activeApp);
      api.setNotifications(data.notifications);
      reserveSurface(data.experimentalSurface || null);
    }
  };
})();
