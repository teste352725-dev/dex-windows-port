/* ============================================================
   AURA DESKTOP — app.js
   Dex V2 oficial com integração: ShellAPI recebe snapshots do Core.
   Dados estáticos abaixo são usados somente no modo --demo.
   DeckNative encapsula intenções enviadas à Bridge Python.
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     1. BIBLIOTECA DE ÍCONES (SVG inline, sem dependências externas)
     ============================================================ */
  function wrap(inner, viewBox) {
    return '<svg class="icon" viewBox="' + (viewBox || '0 0 24 24') + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }

  var ICON = {
    recents: wrap('<line x1="7" y1="5" x2="7" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="17" y1="5" x2="17" y2="19"/>'),
    home: wrap('<circle cx="12" cy="12" r="7"/>'),
    back: wrap('<polyline points="15,5 8,12 15,19"/>'),
    grid: wrap('<circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="6.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="17.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="6.5" cy="17.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="17.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="17.5" cy="17.5" r="1.5" fill="currentColor" stroke="none"/>'),
    search: wrap('<circle cx="11" cy="11" r="6.5"/><line x1="15.6" y1="15.6" x2="20" y2="20"/>'),
    capture: wrap('<path d="M7 4H5a1 1 0 0 0-1 1v2"/><path d="M17 4h2a1 1 0 0 1 1 1v2"/><path d="M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M17 20h2a1 1 0 0 0 1-1v-2"/><circle cx="12" cy="12" r="3.6"/>'),
    volume: wrap('<path d="M4 10v4h3.6L13 18V6L7.6 10H4z" fill="currentColor" stroke="none"/><path d="M16.2 9.2a4.6 4.6 0 0 1 0 5.6"/><path d="M18.8 7a8.2 8.2 0 0 1 0 10"/>'),
    volumeMute: wrap('<path d="M4 10v4h3.6L13 18V6L7.6 10H4z" fill="currentColor" stroke="none"/><line x1="16" y1="10" x2="21" y2="15"/><line x1="21" y1="10" x2="16" y2="15"/>'),
    bell: wrap('<path d="M6 9.5a6 6 0 0 1 12 0c0 3.8 1.4 5.3 1.4 5.3H4.6S6 13.3 6 9.5z"/><path d="M9.6 17.3a2.4 2.4 0 0 0 4.8 0"/>'),
    wifi: wrap('<path d="M3 8.2a15 15 0 0 1 18 0"/><path d="M6.4 11.9a10 10 0 0 1 11.2 0"/><path d="M9.8 15.6a5 5 0 0 1 4.4 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>'),
    bluetooth: wrap('<path d="M12 3l6 4.4L12.6 12 18 16.6 12 21V3z"/><path d="M6 7.5L18 16.5"/><path d="M6 16.5L18 7.5"/>'),
    moon: wrap('<path d="M20 14.3A8.4 8.4 0 1 1 9.7 4a7 7 0 0 0 10.3 10.3z"/>'),
    rotate: wrap('<path d="M4 12a8 8 0 0 1 14-5.3"/><polyline points="18,2.7 18,6.7 14,6.7"/><path d="M20 12a8 8 0 0 1-14 5.3"/><polyline points="6,21.3 6,17.3 10,17.3"/>'),
    power: wrap('<line x1="12" y1="3" x2="12" y2="11"/><path d="M7 6.3a8 8 0 1 0 10 0"/>'),
    lock: wrap('<rect x="6" y="10.2" width="12" height="9" rx="2"/><path d="M8.5 10.2V7.3a3.5 3.5 0 0 1 7 0v2.9"/>'),
    refresh: wrap('<path d="M4 12a8 8 0 0 1 13.7-5.7"/><polyline points="17.3,3 17.7,7 13.7,6.7"/><path d="M20 12a8 8 0 0 1-13.7 5.7"/><polyline points="6.7,21 6.3,17 10.3,17.3"/>'),
    folderPlus: wrap('<path d="M4 7.2a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v8.6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.2z"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>'),
    paint: wrap('<path d="M12 21a8 8 0 0 1 0-16 7 7 0 0 1 7 7c0 1.7-1.3 3-3 3h-1.2a1.6 1.6 0 0 0 0 3.2h.5A3.3 3.3 0 0 1 12 21z"/><circle cx="8.2" cy="10.8" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.6" r="1" fill="currentColor" stroke="none"/><circle cx="15.8" cy="10.8" r="1" fill="currentColor" stroke="none"/>'),
    display: wrap('<rect x="3" y="5" width="18" height="12" rx="2"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'),
    paste: wrap('<rect x="7.5" y="3.5" width="9" height="4" rx="1"/><rect x="5" y="6.5" width="14" height="14" rx="2"/>'),
    sort: wrap('<line x1="6" y1="5" x2="6" y2="19"/><polyline points="3,8.5 6,5.5 9,8.5"/><line x1="13" y1="7" x2="21" y2="7"/><line x1="13" y1="12" x2="21" y2="12"/><line x1="13" y1="17" x2="18" y2="17"/>'),
    close: wrap('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>'),
    chevLeft: wrap('<polyline points="15,5 8,12 15,19"/>'),
    chevRight: wrap('<polyline points="9,5 16,12 9,19"/>'),
    download: wrap('<path d="M12 3v11.5"/><polyline points="7,10.5 12,15.5 17,10.5"/><line x1="5" y1="20" x2="19" y2="20"/>'),
    cloud: wrap('<circle cx="8.3" cy="8.5" r="2.6" fill="currentColor" stroke="none" opacity=".85"/><path d="M7 18a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17.2 9 4 4 0 0 1 16.5 18H7z"/>'),
    batteryNotif: wrap('<rect x="3" y="8" width="16" height="8" rx="2"/><line x1="21" y1="10.3" x2="21" y2="13.7"/>'),
    cast: wrap('<path d="M4 16a1 1 0 0 1 1-1 5 5 0 0 1 5 5 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4z"/><path d="M4 11.3a1 1 0 0 1 1-1 9.7 9.7 0 0 1 9.7 9.7 1 1 0 0 1-1 1"/><rect x="3" y="4" width="18" height="12" rx="2"/>'),
    message: wrap('<path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.6 3.4V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/>'),
    check: wrap('<polyline points="5,12 10,17 19,7"/>'),
    star: wrap('<path d="M12 3.5l2.6 5.6 6 .7-4.4 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.4-4.2 6-.7z" fill="currentColor"/>'),
    dots: wrap('<circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/>'),
    speaker: wrap('<path d="M4 10v4h3.6L13 18V6L7.6 10H4z" fill="currentColor" stroke="none"/>'),
    settingsShortcut: wrap('<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="7"/><line x1="12" y1="3.3" x2="12" y2="5.4"/><line x1="12" y1="18.6" x2="12" y2="20.7"/><line x1="3.3" y1="12" x2="5.4" y2="12"/><line x1="18.6" y1="12" x2="20.7" y2="12"/>'),

    /* --- glifos de apps (estilo outline, usados dentro dos tiles coloridos) --- */
    browser: wrap('<circle cx="12" cy="12" r="7.6"/><ellipse cx="12" cy="12" rx="3.3" ry="7.6"/><path d="M4.6 12h14.8"/>'),
    gallery: wrap('<rect x="3.4" y="5" width="17.2" height="14" rx="2"/><circle cx="8.6" cy="10" r="1.6"/><path d="M4.4 16l4.8-4.4 3.8 3 3.5-3L20 16"/>'),
    folder: wrap('<path d="M3.5 7.2a1.2 1.2 0 0 1 1.2-1.2h4.3l2 2.2h8.3a1.2 1.2 0 0 1 1.2 1.2v8.4a1.2 1.2 0 0 1-1.2 1.2H4.7a1.2 1.2 0 0 1-1.2-1.2V7.2z"/>'),
    message2: wrap('<path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.6 3.4V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/>'),
    note: wrap('<rect x="5" y="3.4" width="14" height="17.2" rx="1.6"/><line x1="8" y1="8.2" x2="16" y2="8.2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="15.8" x2="13" y2="15.8"/>'),
    calendar: wrap('<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>'),
    music: wrap('<circle cx="7.3" cy="17.4" r="2.5"/><circle cx="16.8" cy="15.4" r="2.5"/><path d="M9.8 17.4V6l9-1.9v11.3"/>'),
    camera: wrap('<path d="M4 8.6a1.5 1.5 0 0 1 1.5-1.5h1.9l1.3-2h6.6l1.3 2h1.9A1.5 1.5 0 0 1 20 8.6v8.9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-8.9z"/><circle cx="12" cy="13" r="3.4"/>'),
    clock2: wrap('<circle cx="12" cy="12" r="8"/><line x1="12" y1="12" x2="12" y2="7.2"/><line x1="12" y1="12" x2="15.4" y2="13.6"/>'),
    calc: wrap('<rect x="6" y="3" width="12" height="18" rx="2"/><line x1="8.3" y1="6.7" x2="15.7" y2="6.7"/><circle cx="8.7" cy="11.1" r=".85" fill="currentColor" stroke="none"/><circle cx="12" cy="11.1" r=".85" fill="currentColor" stroke="none"/><circle cx="15.3" cy="11.1" r=".85" fill="currentColor" stroke="none"/><circle cx="8.7" cy="14.4" r=".85" fill="currentColor" stroke="none"/><circle cx="12" cy="14.4" r=".85" fill="currentColor" stroke="none"/><circle cx="8.7" cy="17.7" r=".85" fill="currentColor" stroke="none"/><rect x="14.2" y="13.5" width="2.2" height="4.6" rx=".5" fill="currentColor" stroke="none"/>'),
    mail: wrap('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 6.6l8 6.2 8-6.2"/>'),
    store: wrap('<path d="M6 8.3h12l-1 11.2H7L6 8.3z"/><path d="M9 8.3v-2a3 3 0 0 1 6 0v2"/>'),
    video: wrap('<rect x="3.5" y="6.5" width="12" height="11" rx="2"/><path d="M15.5 10.4l5-2.9v9l-5-2.9z"/>'),
    weather: wrap('<circle cx="8.3" cy="8.3" r="2.6" fill="currentColor" stroke="none" opacity=".85"/><path d="M7 17.6a3.8 3.8 0 0 1-.4-7.6A5.3 5.3 0 0 1 16.7 9a3.8 3.8 0 0 1-.6 8.6H7z"/>'),
    mappin: wrap('<path d="M12 21s-6.3-6-6.3-10.8A6.3 6.3 0 0 1 18.3 10.2c0 4.8-6.3 10.8-6.3 10.8z"/><circle cx="12" cy="10.1" r="2.2"/>'),
    recorder: wrap('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>'),
    terminal: wrap('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><polyline points="7,9.5 10.6,12 7,14.5"/><line x1="12" y1="14.5" x2="16.5" y2="14.5"/>'),
    phone: wrap('<path d="M6 3.5h3l1.4 3.8-2 1.7a12.3 12.3 0 0 0 6.3 6.3l1.7-2 3.8 1.4v3a1.4 1.4 0 0 1-1.5 1.4A16.3 16.3 0 0 1 4.6 5 1.4 1.4 0 0 1 6 3.5z"/>'),
    contacts: wrap('<circle cx="12" cy="8.2" r="3.3"/><path d="M5 20a7 7 0 0 1 14 0"/>')
  };

  var nativeMode = window.DeckNative && !window.DeckNative.demo;
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c];
    });
  }

  function tileHTML(app, size) {
    size = size || 'lg';
    // Preparado para o backend real: quando o app trouxer um ícone de
    // verdade (PNG/SVG do Android), ele é usado puro, sem moldura nem
    // fundo colorido. Enquanto isso, cai no glifo + cor simulados abaixo.
    if (app.iconUrl) {
      return '<span class="tile tile--' + size + ' tile--img"><img src="' + esc(app.iconUrl) + '" alt="" draggable="false"></span>';
    }
    var glyph = ICON[app.icon] || ICON.grid;
    return '<span class="tile tile--' + size + '" style="background:' + app.color + '">' + glyph + '</span>';
  }

  // Image errors do not bubble. One capture listener covers desktop,
  // launcher and taskbar, including tiles created by a catalog refresh.
  document.addEventListener('error', function (event) {
    var image = event.target;
    if (!image || image.tagName !== 'IMG' || !image.parentElement ||
        !image.parentElement.classList.contains('tile--img')) return;
    var tile = image.parentElement;
    tile.classList.remove('tile--img');
    tile.style.background = 'linear-gradient(135deg,#57616e,#343a44)';
    tile.innerHTML = ICON.grid;
  }, true);

  /* ============================================================
     2. DADOS SIMULADOS (substitua via ShellAPI, ver fim do arquivo)
     ============================================================ */
  var APP_DEFS = [
    { id: 'browser',   name: 'Navegador',   icon: 'browser',   color: 'linear-gradient(135deg,#5b8def,#3d63c9)' },
    { id: 'gallery',   name: 'Galeria',     icon: 'gallery',   color: 'linear-gradient(135deg,#b06ae0,#7c4fd1)' },
    { id: 'files',     name: 'Arquivos',    icon: 'folder',    color: 'linear-gradient(135deg,#f0a94e,#d97f2b)' },
    { id: 'messages',  name: 'Mensagens',   icon: 'message2',  color: 'linear-gradient(135deg,#4fcf8a,#2fa868)' },
    { id: 'notes',     name: 'Notas',       icon: 'note',      color: 'linear-gradient(135deg,#f0cf5a,#d9a62e)' },
    { id: 'calendar',  name: 'Calendário',  icon: 'calendar',  color: 'linear-gradient(135deg,#ef7d6b,#d6503c)' },
    { id: 'music',     name: 'Música',      icon: 'music',     color: 'linear-gradient(135deg,#f06ea8,#d1447f)' },
    { id: 'camera',    name: 'Câmera',      icon: 'camera',    color: 'linear-gradient(135deg,#8891a0,#5c6472)' },
    { id: 'settings',  name: 'Configurações', icon: 'settingsShortcut', color: 'linear-gradient(135deg,#8a93a3,#5c6472)' },
    { id: 'clock',     name: 'Relógio',     icon: 'clock2',    color: 'linear-gradient(135deg,#7f93f0,#5468d1)' },
    { id: 'calculator',name: 'Calculadora', icon: 'calc',      color: 'linear-gradient(135deg,#4fc9c1,#2f9d96)' },
    { id: 'mail',      name: 'E-mail',      icon: 'mail',      color: 'linear-gradient(135deg,#5cb8f0,#3a8fce)' },
    { id: 'store',     name: 'Loja de Apps',icon: 'store',     color: 'linear-gradient(135deg,#4fd18c,#2ba868)' },
    { id: 'video',     name: 'Vídeos',      icon: 'video',     color: 'linear-gradient(135deg,#f0708c,#d1466a)' },
    { id: 'weather',   name: 'Clima',       icon: 'weather',   color: 'linear-gradient(135deg,#63cbe8,#3aa0c9)' },
    { id: 'maps',      name: 'Mapas',       icon: 'mappin',    color: 'linear-gradient(135deg,#5fcf7a,#39a858)' },
    { id: 'recorder',  name: 'Gravador',    icon: 'recorder',  color: 'linear-gradient(135deg,#ef6b6b,#cc3f3f)' },
    { id: 'terminal',  name: 'Terminal',    icon: 'terminal',  color: 'linear-gradient(135deg,#57616e,#343a44)' },
    { id: 'phone',     name: 'Telefone',    icon: 'phone',     color: 'linear-gradient(135deg,#4fcf8a,#2fa868)' },
    { id: 'contacts',  name: 'Contatos',    icon: 'contacts',  color: 'linear-gradient(135deg,#7f93f0,#5468d1)' }
  ];

  var NOTIF_DEFS = [
    { id: 'n1', app: 'Mensagens', icon: 'message', color: '#2fa868', time: 'agora',   title: 'Mensagens', text: 'Fernanda: Chega em que horas?' },
    { id: 'n2', app: 'Sistema',   icon: 'download', color: '#3a8fce', time: '5 min',  title: 'Download concluído', text: 'firmware_update_v2.img — 214 MB' },
    { id: 'n3', app: 'Bateria',   icon: 'batteryNotif', color: '#cc3f3f', time: '18 min', title: 'Bateria em 20%', text: 'Ative a economia de energia' },
    { id: 'n4', app: 'Clima',     icon: 'cloud', color: '#3aa0c9', time: '1 h', title: 'Amanhã · Nublado', text: 'Máx. 26°C · Mín. 18°C — leve um casaco' },
    { id: 'n5', app: 'Loja de Apps', icon: 'store', color: '#2ba868', time: '3 h', title: 'Atualizações disponíveis', text: '4 aplicativos têm novas versões' }
  ];

  var state = {
    apps: APP_DEFS.slice(),
    desktopIds: ['browser', 'gallery', 'files', 'calendar', 'notes', 'settings'],
    pinnedIds: ['browser', 'messages', 'camera', 'music', 'store'],
    openIds: ['browser'],
    activeId: 'browser',
    device: { name: 'Aura Phone', connected: true },
    battery: { percent: 76, charging: true },
    network: { wifi: true, ssid: 'Aura_5G' },
    bluetooth: false,
    darkMode: true,
    dnd: false,
    autoRotate: true,
    mediaMuted: false,
    volume: 68,
    notifications: NOTIF_DEFS.slice(),
    launcherTab: 'all',
    launcherQuery: '',
    launcherPage: 0,
    selectedDesktopId: null
  };

  state.recentIds = [];
  state.sessions = [];
  state.config = {};
  state.system = {};
  var systemPending = {};
  if (nativeMode) {
    state.apps = []; state.desktopIds = []; state.pinnedIds = [];
    state.openIds = []; state.activeId = null; state.notifications = [];
    state.device = {name: 'Procurando Android…', connected: false};
    state.battery = {percent: null, charging: null};
    state.network = {wifi: null, ssid: ''};
    state.bluetooth = null; state.dnd = null; state.darkMode = null; state.autoRotate = null;
    state.volume = 0;
  }

  /* ============================================================
     3. HELPERS DE DOM
     ============================================================ */
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  function appById(id) { return state.apps.filter(function (a) { return a.id === id; })[0]; }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  var elDesktop = $('#desktop');
  var elDesktopIcons = $('#desktopIcons');
  var elTaskbarApps = $('#taskbarApps');
  var elLauncher = $('#launcher');
  var elLauncherGrid = $('#launcherGrid');
  var elLauncherPagination = $('#launcherPagination');
  var elLauncherEmpty = $('#launcherEmpty');
  var elLauncherSearch = $('#launcherSearch');
  var elLauncherTabs = $('#launcherTabs');
  var elContextMenu = $('#contextMenu');
  var elVolumePop = $('#volumePopover');
  var elQuickSettings = $('#quickSettings');
  var elNotifPanel = $('#notificationsPanel');
  var elCalendarPop = $('#calendarPopover');
  var elFlash = $('#flash');
  var elToast = $('#toast');
  var elNotifBadge = $('#notifBadge');
  var elBatteryFill = $('#batteryFill');
  var elBatteryPct = $('#batteryPct');
  var elClockTime = $('#clockTime');
  var elClockDate = $('#clockDate');

  var OPEN_LAYERS = []; // pilha dos popovers/painéis abertos

  /* ============================================================
     4. RENDER — ÍCONES DE DESKTOP
     ============================================================ */
  function renderDesktop() {
    elDesktopIcons.innerHTML = '';
    state.desktopIds.forEach(function (id) {
      var app = appById(id);
      if (!app) return;
      var item = el('div', 'desktop-icon');
      item.dataset.id = id;
      item.tabIndex = 0;
      item.innerHTML = tileHTML(app, 'lg') + '<span class="label">' + esc(app.name) + '</span>';
      if (state.selectedDesktopId === id) item.classList.add('is-selected');
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        state.selectedDesktopId = id;
        renderDesktop();
      });
      item.addEventListener('keydown', function(e) { if (id === 'deck.settings' && e.key === 'Enter') {e.preventDefault();launchApp(id);} });
      item.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        launchApp(id);
      });
      item.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        state.selectedDesktopId = id;
        renderDesktop();
        if (id === 'deck.settings') { window.DeckSettings.open(); return; }
        showDesktopIconMenu(e.clientX, e.clientY, id);
      });
      elDesktopIcons.appendChild(item);
    });
  }

  /* ============================================================
     5. RENDER — APPS NA TASKBAR (fixados + abertos)
     ============================================================ */
  function renderTaskbarApps() {
    elTaskbarApps.innerHTML = '';
    var ids = state.pinnedIds.slice();
    state.openIds.forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });

    ids.forEach(function (id) {
      var app = appById(id);
      if (!app) return;
      var isOpen = state.openIds.indexOf(id) !== -1;
      var isActive = state.activeId === id;
      var btn = el('button', 'taskbar-app' + (isOpen ? ' is-open' : '') + (isActive ? ' is-active' : ''));
      btn.setAttribute('data-tip', app.name);
      btn.innerHTML = tileHTML(app, 'md') + '<span class="dot"></span>';
      btn.dataset.id = id;
      btn.dataset.state = app.minimized ? 'minimized' : isActive ? 'active' : isOpen ? 'background' : 'closed';
      btn.title = app.name + (app.running_count > 1 ? ' · ' + app.running_count + ' janelas' : '') +
        (app.minimized ? ' · minimizado' : '');
      btn.setAttribute('data-tip', btn.title);
      if (isOpen && app.minimized) btn.querySelector('.dot').style.opacity = '0.35';
      btn.addEventListener('click', function () {
        if (nativeMode) window.DeckNative.activateApp(id, isActive);
        else launchApp(id);
      });
      btn.addEventListener('contextmenu', function (e) {
        if (!nativeMode) return;
        e.preventDefault(); showNativeAppMenu(e.clientX, e.clientY, id);
      });
      elTaskbarApps.appendChild(btn);
    });
  }

  function launchApp(id) {
    if (id === 'deck.settings') { closeLauncher(); window.DeckSettings.open(); return; }
    if (nativeMode) {
      closeLauncher();
      window.DeckNative.openApp(id);
      return;
    }
    var app = appById(id);
    if (!app) return;
    var isOpen = state.openIds.indexOf(id) !== -1;
    var isActive = state.activeId === id;
    if (isOpen && isActive) {
      state.openIds = state.openIds.filter(function (x) { return x !== id; });
      state.activeId = null;
      showToast(app.name + ' fechado', app.icon);
    } else {
      if (!isOpen) state.openIds.push(id);
      state.activeId = id;
      showToast(app.name, app.icon);
    }
    closeLauncher();
    renderTaskbarApps();
  }

  /* ============================================================
     6. RENDER — LAUNCHER DE APPS
     ============================================================ */
  // Célula da grade (ver .launcher-app / .launcher-grid no CSS): 96px de
  // largura, grid-auto-rows de 96px e row-gap de 6px. Em vez de um número
  // fixo de itens por página (que desperdiça a tela em 1920×1080 e pode
  // cortar em telas menores), calculamos quantas colunas × linhas cabem
  // de fato no espaço disponível e paginamos por aí.
  var LAUNCHER_CELL = 96;
  var LAUNCHER_ROW_GAP = 6;
  var LAUNCHER_PAGE_SIZE_FALLBACK = 15;

  function computeLauncherPageSize() {
    var w = elLauncherGrid.clientWidth;
    var h = elLauncherGrid.clientHeight;
    if (!w || !h) return LAUNCHER_PAGE_SIZE_FALLBACK;
    var cols = Math.max(1, Math.floor(w / LAUNCHER_CELL));
    var rows = Math.max(1, Math.floor((h + LAUNCHER_ROW_GAP) / (LAUNCHER_CELL + LAUNCHER_ROW_GAP)));
    return cols * rows;
  }

  function filteredApps() {
    var list = state.apps;
    if (state.launcherTab === 'favorites') {
      list = list.filter(function (a) { return state.pinnedIds.indexOf(a.id) !== -1; });
    } else if (state.launcherTab === 'recent') {
      var order = nativeMode ? state.recentIds : state.openIds.slice().reverse();
      list = order.map(appById).filter(Boolean);
    }
    if (state.launcherQuery.trim()) {
      var q = state.launcherQuery.trim().toLowerCase();
      list = list.filter(function (a) { return (a.name + ' ' + (a.package || '')).toLowerCase().indexOf(q) !== -1; });
    }
    return list;
  }

  function renderLauncher() {
    var list = filteredApps();
    var pageSize = computeLauncherPageSize();
    var pages = Math.max(1, Math.ceil(list.length / pageSize));
    if (state.launcherPage >= pages) state.launcherPage = pages - 1;
    var start = state.launcherPage * pageSize;
    var pageItems = list.slice(start, start + pageSize);

    elLauncherGrid.innerHTML = '';
    elLauncherEmpty.hidden = list.length !== 0;

    pageItems.forEach(function (app, i) {
      var item = el('div', 'launcher-app');
      item.style.animationDelay = (i * 18) + 'ms';
      item.innerHTML = tileHTML(app, 'lg') + '<span class="label">' + esc(app.name) + '</span>';
      item.dataset.id = app.id;
      item.addEventListener('click', function () { launchApp(app.id); });
      item.addEventListener('contextmenu', function (e) {
        if (!nativeMode) return;
        e.preventDefault(); e.stopPropagation();
        if (app.id === 'deck.settings') { window.DeckSettings.open(); return; }
        showNativeAppMenu(e.clientX, e.clientY, app.id);
      });
      elLauncherGrid.appendChild(item);
    });

    elLauncherGrid.classList.toggle('is-swipeable', pages > 1);

    elLauncherPagination.innerHTML = '';
    if (pages > 1) {
      for (var p = 0; p < pages; p++) {
        var dot = el('button', 'launcher-dot' + (p === state.launcherPage ? ' is-active' : ''));
        dot.setAttribute('aria-label', 'Página ' + (p + 1) + ' de ' + pages);
        if (p === state.launcherPage) dot.setAttribute('aria-current', 'true');
        (function (idx) {
          dot.addEventListener('click', function () { state.launcherPage = idx; renderLauncher(); });
        })(p);
        elLauncherPagination.appendChild(dot);
      }
    }
  }

  function launcherPageCount() {
    var list = filteredApps();
    return Math.max(1, Math.ceil(list.length / computeLauncherPageSize()));
  }

  // Muda de página no launcher com uma animação de deslize. delta>0 avança
  // (conteúdo entra pela direita), delta<0 volta. Retorna true se mudou.
  function changeLauncherPage(delta) {
    var pages = launcherPageCount();
    var next = state.launcherPage + delta;
    if (next < 0 || next >= pages || next === state.launcherPage) return false;
    state.launcherPage = next;
    renderLauncher();
    elLauncherGrid.classList.remove('slide-from-left', 'slide-from-right');
    void elLauncherGrid.offsetWidth; // reinicia a animação
    elLauncherGrid.classList.add(delta > 0 ? 'slide-from-right' : 'slide-from-left');
    return true;
  }

  // Gestos de página: arrastar (pointer), roda do mouse (horizontal ou
  // Shift+roda) e setas do teclado. Só o grid de apps é alvo; cliques/toques
  // simples continuam abrindo o app (um arraste de verdade suprime o clique).
  function initLauncherGestures() {
    var grid = elLauncherGrid;
    var startX = 0, startY = 0, dragging = false, moved = false, pid = null, pages = 1;

    grid.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return; // só primário/toque
      pid = e.pointerId; startX = e.clientX; startY = e.clientY;
      dragging = true; moved = false; pages = launcherPageCount();
    });

    grid.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved) {
        if (Math.abs(dx) < 6) return;
        if (Math.abs(dx) <= Math.abs(dy)) { dragging = false; return; } // gesto vertical: ignora
        moved = true;
        try { grid.setPointerCapture(pid); } catch (_) {}
        grid.classList.add('is-dragging');
      }
      var atStart = state.launcherPage === 0;
      var atEnd = state.launcherPage >= pages - 1;
      var eff = ((dx > 0 && atStart) || (dx < 0 && atEnd)) ? dx * 0.32 : dx; // resistência nas bordas
      grid.style.transform = 'translateX(' + eff + 'px)';
      e.preventDefault();
    });

    function endDrag(e) {
      if (!dragging) return;
      var wasSwipe = moved;
      var dx = (e && typeof e.clientX === 'number') ? (e.clientX - startX) : 0;
      dragging = false;
      grid.classList.remove('is-dragging');
      try { grid.releasePointerCapture(pid); } catch (_) {}
      pid = null;
      grid.style.transform = '';
      if (!wasSwipe) return;
      var THRESH = 56;
      if (dx <= -THRESH) changeLauncherPage(1);
      else if (dx >= THRESH) changeLauncherPage(-1);
    }
    grid.addEventListener('pointerup', endDrag);
    grid.addEventListener('pointercancel', endDrag);

    // Suprime o clique sintético que segue um arraste real (fase de captura,
    // antes do handler do item), para não abrir um app ao soltar o swipe.
    grid.addEventListener('click', function (e) {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);

    // Roda do mouse: horizontal, ou Shift+roda vertical, vira a página.
    var wheelLock = false;
    grid.addEventListener('wheel', function (e) {
      var horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!horiz) return;
      e.preventDefault();
      if (wheelLock) return;
      if (changeLauncherPage(horiz > 0 ? 1 : -1)) {
        wheelLock = true;
        setTimeout(function () { wheelLock = false; }, 320);
      }
    }, { passive: false });

    // Setas ←/→ quando o launcher está aberto e o foco não está na busca
    // (lá as setas movem o cursor do texto).
    document.addEventListener('keydown', function (e) {
      if (elLauncher.hidden) return;
      if (document.activeElement === elLauncherSearch) return;
      if (e.key === 'ArrowRight') { if (changeLauncherPage(1)) e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { if (changeLauncherPage(-1)) e.preventDefault(); }
    });
  }

  function openLauncher() {
    closeAllPopovers();
    elLauncher.hidden = false;
    elLauncher.removeAttribute('data-closing');
    $('#appsBtn').classList.add('is-active');
    renderLauncherTabs();
    renderLauncher();
    elLauncherSearch.focus();
  }
  function closeLauncher() {
    if (elLauncher.hidden) return;
    elLauncher.setAttribute('data-closing', '');
    $('#appsBtn').classList.remove('is-active');
    setTimeout(function () { elLauncher.hidden = true; }, 130);
  }
  function toggleLauncher() {
    if (elLauncher.hidden) openLauncher(); else closeLauncher();
  }

  /* ============================================================
     7. RENDER — NOTIFICAÇÕES
     ============================================================ */
  function renderNotifications() {
    var list = $('#notificationsPanel');
    var count = state.notifications.length;
    var html = '';
    html += '<div class="notif-header"><span class="notif-title">Notificações</span>' +
      '<span class="notif-count">' + count + '</span></div>';
    html += '<div class="notif-list" id="notifList"></div>';
    html += '<div class="notif-footer"><button class="notif-link" id="notifSettingsLink">Configurações de notificações</button>' +
      '<button class="notif-clear" id="notifClearAll">Limpar tudo</button></div>';
    list.innerHTML = html;

    var listEl = $('#notifList');
    if (nativeMode) { $('#notifClearAll').hidden = true; $('#notifSettingsLink').hidden = true; }
    if (nativeMode && !(state.system.notifications || {}).available) {
      listEl.innerHTML = '<div class="notif-empty">Notificações Android indisponíveis</div>';
      $('.notif-count').textContent = '—';
      $('#notifClearAll').disabled = true;
      $('#notifSettingsLink').disabled = true;
      return;
    }
    if (count === 0) {
      listEl.innerHTML = '<div class="notif-empty">'+(nativeMode ? 'Nenhum novo evento de notificação nesta sessão' : 'Nenhuma notificação no momento')+'</div>';
    } else {
      state.notifications.forEach(function (n) {
        var item = el('div', 'notif-item');
        if (nativeMode) {
          var app = el('div', 'notif-app'); app.textContent = n.app || n.package || 'Aplicativo';
          var title = el('div', 'notif-text'); title.textContent = n.title || '';
          var body = el('div', 'notif-text'); body.textContent = n.text || '';
          var stamp = el('div', 'notif-time'); stamp.textContent = typeof n.time === 'number' ? new Date(n.time).toLocaleTimeString() : '';
          item.style.display = 'block';
          var appEntry = state.apps.find(function(a) {return a.package === n.package || a.id === n.package;});
          if (appEntry) {
            item.setAttribute('role','button'); item.tabIndex = 0; item.style.cursor = 'pointer';
            item.title = 'Abrir '+appEntry.name+' no Deck';
            var launch = function() { closeAllPopovers(); window.DeckNative.openApp(appEntry.id); };
            item.addEventListener('click', launch);
            item.addEventListener('keydown', function(e) { if(e.key === 'Enter' || e.key === ' ') {e.preventDefault(); launch();} });
          } else { item.title = 'Este aplicativo não oferece abertura no Deck.'; }

          [app,title,body,stamp].forEach(function(node) {item.appendChild(node);});
          listEl.appendChild(item);
          return;
        }
        item.innerHTML =
          '<span class="notif-icon" style="background:' + n.color + '">' + (ICON[n.icon] || ICON.bell) + '</span>' +
          '<div class="notif-body">' +
            '<div class="notif-row1"><span class="notif-app">' + n.title + '</span><span class="notif-time">' + n.time + '</span></div>' +
            '<div class="notif-text">' + n.text + '</div>' +
          '</div>' +
          '<button class="notif-dismiss" title="Dispensar">' + ICON.close + '</button>';
        item.querySelector('.notif-dismiss').addEventListener('click', function (e) {
          e.stopPropagation();
          dismissNotification(n.id);
        });
        addNotifSwipe(item, n);
        listEl.appendChild(item);
      });
    }

    var clearBtn = $('#notifClearAll');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      state.notifications = [];
      renderNotifications();
      updateNotifBadge();
      showToast('Notificações limpas', 'check');
    });
  }

  function dismissNotification(id) {
    state.notifications = state.notifications.filter(function (x) { return x.id !== id; });
    renderNotifications();
    updateNotifBadge();
  }

  // Arrastar uma notificação para a esquerda/direita a dispensa. Se o arraste
  // não passar do limiar, ela volta ao lugar. Um arraste de verdade suprime o
  // clique seguinte. Vertical é ignorado (fica para a rolagem da lista).
  function addNotifSwipe(item, n) {
    var startX = 0, startY = 0, dragging = false, moved = false, pid = null, w = 0;
    item.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('.notif-dismiss')) return; // deixa o X funcionar normal
      pid = e.pointerId; startX = e.clientX; startY = e.clientY;
      dragging = true; moved = false; w = item.offsetWidth || 320;
    });
    item.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved) {
        if (Math.abs(dx) < 6) return;
        if (Math.abs(dx) <= Math.abs(dy)) { dragging = false; return; }
        moved = true;
        try { item.setPointerCapture(pid); } catch (_) {}
        item.classList.add('notif-dragging');
      }
      item.style.transform = 'translateX(' + dx + 'px)';
      item.style.opacity = String(Math.max(0.15, 1 - Math.abs(dx) / w));
      e.preventDefault();
    });
    function end(e) {
      if (!dragging) return;
      var wasSwipe = moved;
      var dx = (e && typeof e.clientX === 'number') ? (e.clientX - startX) : 0;
      dragging = false;
      item.classList.remove('notif-dragging');
      try { item.releasePointerCapture(pid); } catch (_) {}
      pid = null;
      if (!wasSwipe) { item.style.transform = ''; item.style.opacity = ''; return; }
      var thresh = Math.max(64, w * 0.35);
      item.classList.add('notif-removing');
      if (Math.abs(dx) >= thresh) {
        item.style.transform = 'translateX(' + (dx < 0 ? -w : w) + 'px)';
        item.style.opacity = '0';
        setTimeout(function () { dismissNotification(n.id); }, 190);
      } else {
        item.style.transform = ''; item.style.opacity = '';
        setTimeout(function () { item.classList.remove('notif-removing'); }, 220);
      }
    }
    item.addEventListener('pointerup', end);
    item.addEventListener('pointercancel', end);
    item.addEventListener('click', function (e) {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
  }

  function updateNotifBadge() {
    elNotifBadge.hidden = state.notifications.length === 0;
  }

  /* ============================================================
     8. RENDER — QUICK SETTINGS
     ============================================================ */
  function qsTile(key, iconName, label, isOn) {
    return '<button class="qs-tile' + (isOn ? ' is-on' : '') + '" data-qs="' + key + '">' +
      ICON[iconName] + '<span class="qs-tile-label">' + label + '</span></button>';
  }

  function renderQuickSettings() {
    var html = '';
    html += '<div class="qs-device">' +
      '<div class="qs-device-id"><span class="qs-device-dot' + (state.device.connected ? ' is-online' : '') + '"></span>' +
      '<span class="qs-device-name">' + esc(state.device.name) + '</span></div>' +
      '<span class="qs-device-status">' + (state.device.connected ? 'Conectado' : 'Desconectado') + '</span></div>';

    html += '<div class="qs-toprow">';
    html += '<button class="qs-primary' + (state.network.wifi ? ' is-on' : '') + '" data-qs="wifi">' +
      '<span class="icon-wrap">' + ICON.wifi + '</span>' +
      '<span class="qs-primary-text"><span class="qs-primary-title">Wi-Fi</span>' +
      '<span class="qs-primary-sub">' + esc(state.network.wifi ? state.network.ssid : 'Desativado') + '</span></span></button>';
    html += '<button class="qs-primary' + (state.bluetooth ? ' is-on' : '') + '" data-qs="bluetooth">' +
      '<span class="icon-wrap">' + ICON.bluetooth + '</span>' +
      '<span class="qs-primary-text"><span class="qs-primary-title">Bluetooth</span>' +
      '<span class="qs-primary-sub">' + (state.bluetooth ? 'Fone AuraBuds' : 'Desativado') + '</span></span></button>';
    html += '</div>';

    html += '<div class="qs-grid">';
    html += qsTile('mute', state.mediaMuted ? 'volumeMute' : 'volume', 'Silenciar', state.mediaMuted);
    html += qsTile('dnd', 'moon', 'Não perturbe', state.dnd);
    html += qsTile('dark', 'moon', 'Modo escuro', state.darkMode);
    html += qsTile('rotate', 'rotate', 'Rotação auto', state.autoRotate);
    html += qsTile('capture', 'capture', nativeMode ? 'Captura Deck' : 'Gravador', false);
    html += qsTile(nativeMode ? 'mobile_data' : 'cast', 'cast', nativeMode ? 'Dados móveis' : 'Transmitir', false);
    html += qsTile('lock', 'lock', 'Bloquear', false);
    html += qsTile('power', 'power', 'Desligar', false);
    html += '</div>';

    html += '<div class="qs-slider-row">' + ICON.volume +
      '<input type="range" class="volume-slider" id="qsVolumeSlider" min="0" max="100" value="' + state.volume + '" style="--val:' + state.volume + '%">' +
      '</div>';

    html += '<div class="qs-media">' +
      '<span class="icon-wrap">' + ICON.cast + '</span>' +
      '<span class="qs-media-text"><span class="qs-media-title">Saída de mídia</span>' +
      '<span class="qs-media-sub">Alto-falantes do dispositivo</span></span></div>';

    if (nativeMode) html += '<button class="qs-media deck-settings-link" id="deckMirrorBtn" title="Espelha a tela normal do telefone, sem display virtual">' +
      ICON.cast + '<span>Espelhar celular</span></button>';
    if (nativeMode) html += '<button class="qs-media deck-settings-link" id="deckSettingsBtn">' +
      ICON.settingsShortcut + '<span>Configurações do Dex</span></button>';
    elQuickSettings.innerHTML = html;
    if (nativeMode) $('#deckMirrorBtn').onclick = function() {
      closeAllPopovers(); window.DeckNative.mirrorScreen();
    };
    if (nativeMode) $('#deckSettingsBtn').onclick = function() {
      closeAllPopovers(); window.DeckSettings.open();
    };
    if (nativeMode) renderNativeControls();

    $$('#quickSettings [data-qs]').forEach(function (btn) {
      btn.addEventListener('click', function () { handleQuickSetting(btn.getAttribute('data-qs')); });
    });
    var slider = $('#qsVolumeSlider');
    slider.addEventListener('input', function () {
      if (nativeMode) return;
      state.volume = Number(slider.value);
      slider.style.setProperty('--val', state.volume + '%');
      syncVolumeUI();
    });
    if (nativeMode) slider.addEventListener('change', function() { sendVolume(slider); });
  }

  function handleQuickSetting(key) {
    if (nativeMode) {
      if (key === 'capture') { window.DeckNative.captureDesktop(); return; }
      var feature = {mute:'audio',dark:'dark_mode',rotate:'rotation'}[key] || key;
      var value = state.system[feature] || {};
      if (!value.writable) return showToast(value.reason || 'Indisponível', 'settingsShortcut');
      window.DeckNative.systemAction(key === 'mute' ? 'mute' : feature,
        key === 'mute' ? !value.muted : !value.enabled);
      return;
    }
    switch (key) {
      case 'wifi': state.network.wifi = !state.network.wifi; break;
      case 'bluetooth': state.bluetooth = !state.bluetooth; break;
      case 'mute': state.mediaMuted = !state.mediaMuted; break;
      case 'dnd': state.dnd = !state.dnd; break;
      case 'dark': state.darkMode = !state.darkMode; showToast('Modo escuro é o padrão desta demonstração', 'moon'); break;
      case 'rotate': state.autoRotate = !state.autoRotate; break;
      case 'capture': showToast('Gravação de tela simulada', 'capture'); break;
      case 'cast': showToast('Procurando dispositivos…', 'cast'); break;
      case 'lock': showToast('Visor bloqueado (simulado)', 'lock'); break;
      case 'power': showToast('Menu de energia (simulado)', 'power'); break;
    }
    renderQuickSettings();
  }

  /* ============================================================
     9. RENDER — POPOVER DE VOLUME
     ============================================================ */
  // Ancora o popover ao botão de verdade (em vez de um "right" fixo em
  // CSS) — assim ele continua abrindo "acima/ao redor do botão de volume"
  // em qualquer resolução, mesmo que a taskbar mude de largura ou os
  // ícones à direita mudem de quantidade no futuro.
  function positionVolumePopover() {
    var btn = $('#volumeBtn');
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    var margin = 10;
    var width = elVolumePop.offsetWidth || 268;
    var left = r.left + r.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    elVolumePop.style.left = left + 'px';
    elVolumePop.style.right = 'auto';
    elVolumePop.style.bottom = (window.innerHeight - r.top + margin) + 'px';
  }

  function renderVolumePopover() {
    var html = '';
    html += '<div class="volume-row">' +
      '<button class="icon-btn" id="volMuteToggle">' + (state.mediaMuted ? ICON.volumeMute : ICON.volume) + '</button>' +
      '<input type="range" class="volume-slider" id="volSlider" min="0" max="100" value="' + state.volume + '" style="--val:' + state.volume + '%">' +
      '<button class="volume-more" id="volMoreBtn">' + ICON.dots + '</button>' +
      '</div>' +
      '<div class="volume-label"><span>Mídia</span><span id="volValueLabel">' + state.volume + '%</span></div>' +
      '<div class="volume-outputs" id="volOutputs">' +
      '<div class="volume-output-item is-selected">' + ICON.speaker + '<span>Alto-falantes do dispositivo</span></div>' +
      '<div class="volume-output-item">' + ICON.cast + '<span>AuraBuds Pro</span></div>' +
      '<div class="volume-output-item">' + ICON.cast + '<span>Transmitir para TV</span></div>' +
      '</div>';
    elVolumePop.innerHTML = html;
    positionVolumePopover();
    if (nativeMode) {
      $('#volOutputs').textContent = mediaOutputLabel();
      $('.volume-label span').textContent = 'Mídia do Android';
      renderNativeVolume();
    }

    $('#volMuteToggle').addEventListener('click', function () {
      if (nativeMode) { handleQuickSetting('mute'); return; }
      state.mediaMuted = !state.mediaMuted;
      syncVolumeUI();
    });
    $('#volSlider').addEventListener('input', function (e) {
      if (nativeMode) return;
      state.volume = Number(e.target.value);
      e.target.style.setProperty('--val', state.volume + '%');
      $('#volValueLabel').textContent = state.volume + '%';
      syncVolumeUI();
    });
    if (nativeMode) $('#volSlider').addEventListener('change', function(e) {sendVolume(e.target);});
    $('#volMoreBtn').addEventListener('click', function () {
      $('#volOutputs').classList.toggle('is-open');
    });
    $$('.volume-output-item').forEach(function (item, idx) {
      item.addEventListener('click', function () {
        $$('.volume-output-item').forEach(function (i) { i.classList.remove('is-selected'); });
        item.classList.add('is-selected');
      });
    });
  }

  function syncVolumeUI() {
    // mantém sliders e ícones de volume/quick settings sincronizados
    if (!elVolumePop.hidden) {
      var vs = $('#volSlider');
      if (vs) { vs.value = state.volume; vs.style.setProperty('--val', state.volume + '%'); }
      var vl = $('#volValueLabel'); if (vl) vl.textContent = state.volume + '%';
      var mb = $('#volMuteToggle'); if (mb) mb.innerHTML = state.mediaMuted ? ICON.volumeMute : ICON.volume;
    }
    if (!elQuickSettings.hidden) {
      var qs = $('#qsVolumeSlider');
      if (qs) { qs.value = state.volume; qs.style.setProperty('--val', state.volume + '%'); }
    }
  }

  /* ============================================================
     10. RENDER — CALENDÁRIO
     ============================================================ */
  var calCursor = new Date();
  var DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  var MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  // Eventos simulados, ancorados na data real de hoje (não em datas fixas)
  // para que o painel sempre mostre algo coerente, não importa quando o
  // shell for aberto. Chave: 'AAAA-M-D'. Ideia de organização (grade com
  // indicador + lista de "próximos eventos" separada da grade) estudada
  // na referência v0 e reimplementada aqui com a arquitetura/estilo do
  // Claude.
  var EVENTS_BY_DAY = {};
  (function seedEvents() {
    if (nativeMode) return;
    function key(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
    function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d; }
    EVENTS_BY_DAY[key(new Date())] = [
      { time: '09:30', title: 'Sincronização automática', color: 'var(--accent-cyan)' }
    ];
    EVENTS_BY_DAY[key(plusDays(2))] = [
      { time: '14:00', title: 'Backup do dispositivo', color: 'var(--accent-indigo)' }
    ];
    EVENTS_BY_DAY[key(plusDays(5))] = [
      { time: '11:00', title: 'Atualização do sistema', color: 'var(--accent-amber)' }
    ];
  })();

  function renderCalendar() {
    var today = new Date();
    var y = calCursor.getFullYear(), m = calCursor.getMonth();
    var first = new Date(y, m, 1);
    var startOffset = first.getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var daysInPrev = new Date(y, m, 0).getDate();
    var monthLabel = MONTHS[m].charAt(0).toUpperCase() + MONTHS[m].slice(1);

    var html = '<div class="cal-header"><span class="cal-month">' + monthLabel + ' de ' + y + '</span>' +
      '<div class="cal-nav"><button id="calPrev">' + ICON.chevLeft + '</button><button id="calNext">' + ICON.chevRight + '</button></div></div>';

    html += '<div class="cal-grid">';
    DOW.forEach(function (d) { html += '<div class="cal-dow">' + d + '</div>'; });

    for (var i = 0; i < startOffset; i++) {
      html += '<div class="cal-day is-muted">' + (daysInPrev - startOffset + i + 1) + '</div>';
    }
    for (var d2 = 1; d2 <= daysInMonth; d2++) {
      var isToday = d2 === today.getDate() && m === today.getMonth() && y === today.getFullYear();
      var hasEvent = nativeMode ? ((state.system.calendar || {}).events || []).some(function(e) {var dt = new Date(e.begin); return (e.allDay ? dt.getUTCFullYear() === y && dt.getUTCMonth() === m && dt.getUTCDate() === d2 : dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d2);}) : !!EVENTS_BY_DAY[y + '-' + m + '-' + d2];
      var dow = new Date(y, m, d2).getDay();
      var cls = 'cal-day' + (isToday ? ' is-today' : (dow === 0 || dow === 6 ? ' is-weekend' : '')) + (hasEvent ? ' has-event' : '');
      html += '<div class="' + cls + '">' + d2 + '</div>';
    }
    var totalCells = startOffset + daysInMonth;
    var trailing = (7 - (totalCells % 7)) % 7;
    for (var t = 1; t <= trailing; t++) html += '<div class="cal-day is-muted">' + t + '</div>';
    html += '</div>';

    // Próximos eventos: sempre a partir de hoje, independente do mês
    // que está sendo navegado no grid acima.
    var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var upcoming = [];
    Object.keys(EVENTS_BY_DAY).forEach(function (k) {
      var parts = k.split('-').map(Number);
      var date = new Date(parts[0], parts[1], parts[2]);
      if (date >= todayStart) {
        EVENTS_BY_DAY[k].forEach(function (ev) { upcoming.push({ date: date, time: ev.time, title: ev.title, color: ev.color }); });
      }
    });
    upcoming.sort(function (a, b) { return a.date - b.date; });
    upcoming = upcoming.slice(0, 4);

    html += '<div class="cal-events">';
    html += '<div class="cal-events-title">Próximos eventos</div>';
    if (upcoming.length) {
      upcoming.forEach(function (ev) {
        html += '<div class="cal-event"><span class="cal-event-dot" style="background:' + ev.color + '"></span>' +
          '<span class="cal-event-time">' + ev.time + '</span>' +
          '<span class="cal-event-title">' + ev.title + '</span></div>';
      });
    } else {
      html += '<div class="cal-events-empty">Nenhum evento — aproveite seu dia</div>';
    }
    html += '</div>';

    elCalendarPop.innerHTML = html;
    if (nativeMode) {
      var agenda = state.system.calendar || {}, container = elCalendarPop.querySelector('.cal-events');
      container.replaceChildren();
      var heading = el('div','cal-events-title'); heading.textContent = 'Agenda do telefone · próximos 30 dias'; container.appendChild(heading);
      var refresh = el('button',''); refresh.textContent = systemPending.calendar ? 'Consultando…' : 'Atualizar agenda'; refresh.disabled = !!systemPending.calendar;
      refresh.addEventListener('click',function() {window.DeckNative.systemAction('calendar',null);}); container.appendChild(refresh);
      var open = el('button',''); open.textContent = 'Abrir Google Agenda';
      var calendarApp = state.apps.find(function(a) {return a.package === 'com.google.android.calendar';});
      open.disabled = !calendarApp; open.addEventListener('click',function() {closeAllPopovers();window.DeckNative.openApp(calendarApp.id);}); container.appendChild(open);
      var message = el('div','cal-events-empty');
      message.textContent = !agenda.available ? 'Permita leitura da agenda no Deck Agent e toque em Atualizar.' : !agenda.events.length ? 'Nenhum evento sincronizado nos próximos 30 dias.' : agenda.truncated ? 'Mostrando os primeiros 50 eventos.' : '';
      container.appendChild(message); container.style.maxHeight = '220px'; container.style.overflowY = 'auto';
      (agenda.available ? agenda.events || [] : []).forEach(function(event) {
        var row = el('div','cal-event'); var date = new Date(event.begin);
        row.textContent = date.toLocaleDateString(undefined,event.allDay ? {timeZone:'UTC'} : {})+' · '+(event.allDay ? 'Dia inteiro' : date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))+' · '+event.title;
        container.appendChild(row);
      });
    }

    $('#calPrev').addEventListener('click', function () { calCursor = new Date(y, m - 1, 1); renderCalendar(); });
    $('#calNext').addEventListener('click', function () { calCursor = new Date(y, m + 1, 1); renderCalendar(); });
  }

  /* ============================================================
     11. RELÓGIO / BATERIA
     ============================================================ */
  var WEEKDAYS_SHORT = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
  function tickClock() {
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    elClockTime.textContent = hh + ':' + mm;
    elClockDate.textContent = WEEKDAYS_SHORT[now.getDay()] + ', ' + String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
    $('#clockBtn').title = now.toLocaleString('pt-BR', {dateStyle:'full',timeStyle:'short'});
    if (!elCalendarPop.hidden) renderCalendar();
  }

  function renderBatteryUI() {
    elBatteryFill.style.width = (state.battery.percent == null ? 0 : state.battery.percent) + '%';
    elBatteryPct.textContent = state.battery.percent == null ? '--%' : state.battery.percent + '%';
    var info = state.system.battery || {};
    var label = {charging:'Carregando',discharging:'Descarregando',not_charging:'Sem carregar',full:'Carga completa'}[info.status] || 'Estado desconhecido';
    $('.status-battery').title = (state.battery.percent == null ? 'Bateria indisponível' : state.battery.percent + '% · ' + label) +
      (info.powered === true ? ' · conectado à energia' : info.powered === false ? ' · fora da energia' : '') +
      (info.temperature_c == null ? '' : ' · '+info.temperature_c+' °C');
    if (state.battery.percent != null && state.battery.percent <= 20 && !state.battery.charging) {
      elBatteryFill.style.background = 'var(--accent-red)';
    } else if (state.battery.charging) {
      elBatteryFill.style.background = 'var(--accent-cyan)';
    } else {
      elBatteryFill.style.background = 'var(--accent-cyan)';
    }
  }

  /* ============================================================
     12. ABERTURA / FECHAMENTO DE CAMADAS (popovers e painéis)
     ============================================================ */
  var LAYER_MAP = {
    volume: elVolumePop,
    quickSettings: elQuickSettings,
    notifications: elNotifPanel,
    calendar: elCalendarPop
  };

  function closeLayer(name) {
    var elx = LAYER_MAP[name];
    if (!elx || elx.hidden) return;
    elx.setAttribute('data-closing', '');
    setTimeout(function () { elx.hidden = true; elx.removeAttribute('data-closing'); }, 110);
    setActiveTrigger(name, false);
  }
  function closeAllPopovers(except) {
    Object.keys(LAYER_MAP).forEach(function (k) { if (k !== except) closeLayer(k); });
    closeContextMenu();
  }
  function openLayer(name) {
    closeLauncher();
    closeAllPopovers(name);
    var elx = LAYER_MAP[name];
    elx.hidden = false;
    setActiveTrigger(name, true);
  }
  function toggleLayer(name) {
    var elx = LAYER_MAP[name];
    if (elx.hidden) openLayer(name); else closeLayer(name);
  }
  function setActiveTrigger(name, on) {
    var map = { volume: '#volumeBtn', quickSettings: '#statusBtn', notifications: '#notifBtn', calendar: '#clockBtn' };
    var trigger = $(map[name]);
    if (trigger) trigger.classList.toggle('is-active', on);
  }

  /* ============================================================
     13. MENU DE CONTEXTO
     ============================================================ */
  function menuItem(iconName, label, disabled, hint) {
    return '<button class="ctx-item" ' + (disabled ? 'disabled' : '') + ' data-action="' + label + '">' +
      (ICON[iconName] || '') + '<span>' + label + '</span>' + (hint ? '<small>' + hint + '</small>' : '') + '</button>';
  }

  function positionMenu(x, y, menuEl) {
    var vw = window.innerWidth, vh = window.innerHeight - 52;
    menuEl.style.left = Math.min(x, vw - 232) + 'px';
    menuEl.style.top = Math.min(y, vh - menuEl.offsetHeight - 12) + 'px';
  }

  function showDesktopContextMenu(x, y) {
    var html = '';
    html += menuItem('refresh', 'Atualizar');
    html += menuItem('folderPlus', 'Nova pasta');
    html += '<div class="ctx-sep"></div>';
    html += menuItem('paste', 'Colar', true);
    html += menuItem('sort', 'Ordenar ícones por');
    html += '<div class="ctx-sep"></div>';
    html += menuItem('paint', 'Personalizar plano de fundo');
    html += menuItem('display', 'Configurações de exibição');
    elContextMenu.innerHTML = html;
    elContextMenu.hidden = false;
    positionMenu(x, y, elContextMenu);
    wireContextActions();
  }

  function showDesktopIconMenu(x, y, appId) {
    if (nativeMode) { showNativeAppMenu(x, y, appId); return; }
    var app = appById(appId);
    var isPinned = state.pinnedIds.indexOf(appId) !== -1;
    var html = '';
    html += menuItem('grid', 'Abrir');
    html += '<div class="ctx-sep"></div>';
    html += menuItem('star', isPinned ? 'Desafixar da taskbar' : 'Fixar na taskbar');
    html += menuItem('paint', 'Renomear', true);
    html += '<div class="ctx-sep"></div>';
    html += menuItem('close', 'Remover do desktop');
    elContextMenu.innerHTML = html;
    elContextMenu.hidden = false;
    positionMenu(x, y, elContextMenu);

    var items = $$('.ctx-item', elContextMenu);
    items[0].addEventListener('click', function () { launchApp(appId); closeContextMenu(); });
    items[1].addEventListener('click', function () {
      if (isPinned) state.pinnedIds = state.pinnedIds.filter(function (id) { return id !== appId; });
      else state.pinnedIds.push(appId);
      renderTaskbarApps();
      closeContextMenu();
    });
    items[3].addEventListener('click', function () {
      state.desktopIds = state.desktopIds.filter(function (id) { return id !== appId; });
      renderDesktop();
      closeContextMenu();
      showToast(app.name + ' removido do desktop', 'close');
    });
  }

  function wireContextActions() {
    $$('.ctx-item', elContextMenu).forEach(function (btn) {
      if (btn.disabled) return;
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        if (nativeMode) {
          if (action === 'Atualizar') window.DeckNative.refresh();
          else if (action === 'Personalizar plano de fundo') {
            var bounds = elContextMenu.getBoundingClientRect();
            var actions = ['fill', 'fit', 'center'].map(function(mode) {
              return [mode.charAt(0).toUpperCase() + mode.slice(1), function() {
                if (!state.config.wallpaper_path) return window.DeckNative.pickWallpaper().then(function(result) {
                  if (result && result.path) window.DeckNative.updateConfig({wallpaper_style:'image',wallpaper_fit:mode});
                });
                window.DeckNative.updateConfig({wallpaper_style:'image',wallpaper_fit:mode});
              }];
            });
            actions.unshift(['Escolher imagem…', function() {window.DeckNative.pickWallpaper();}]);
            actions.push(['Cor sólida', function() {window.DeckNative.updateConfig({wallpaper_style:'solid'});}]);
            actions.push(['Wallpaper padrão Dex V2', function() {
              window.DeckNative.updateConfig({wallpaper_style:'gradient',wallpaper_color:'#10243b'});
            }]);
            nativeMenu(bounds.x, bounds.y, actions); return;
          }
          else if (action === 'Configurações de exibição') window.DeckSettings.open();
          else showToast('Operação indisponível nesta integração', 'settingsShortcut');
          closeContextMenu(); return;
        }
        if (action === 'Atualizar') showToast('Área de trabalho atualizada', 'refresh');
        if (action === 'Nova pasta') showToast('Nova pasta criada (simulado)', 'folderPlus');
        if (action === 'Personalizar plano de fundo') showToast('Personalização em breve', 'paint');
        if (action === 'Configurações de exibição') showToast('Abrindo configurações de exibição…', 'display');
        if (action === 'Ordenar ícones por') showToast('Ícones organizados', 'sort');
        closeContextMenu();
      });
    });
  }

  function closeContextMenu() { elContextMenu.hidden = true; }

  /* ============================================================
     14. TOAST / FLASH
     ============================================================ */
  var toastTimer = null;
  function showToast(msg, iconName) {
    elToast.innerHTML = (ICON[iconName] || ICON.check) + '<span>' + esc(msg) + '</span>';
    elToast.classList.remove('is-visible');
    elToast.hidden = false;
    void elToast.offsetWidth;
    elToast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { elToast.hidden = true; }, 3000);
  }

  /* HUD de volume lateral — overlay transitório com o nível atual. Criado
     sob demanda e reaproveitado. Só aparece quando nenhum painel de volume
     está aberto (lá o nível já é mostrado). */
  var volumeHudEl = null, volumeHudTimer = null, volumeHudGone = null;
  function ensureVolumeHud() {
    if (volumeHudEl) return volumeHudEl;
    var host = document.getElementById('desktop') || document.body;
    var hud = document.createElement('div');
    hud.className = 'volume-hud';
    hud.id = 'volumeHud';
    hud.setAttribute('aria-hidden', 'true');
    hud.hidden = true;
    hud.innerHTML = '<span class="vhud-icon"></span>' +
      '<span class="vhud-track"><span class="vhud-fill"></span></span>' +
      '<span class="vhud-pct"></span>';
    host.appendChild(hud);
    volumeHudEl = hud;
    return hud;
  }
  function showVolumeHud() {
    if (!elVolumePop.hidden || !elQuickSettings.hidden) return; // painel já mostra o nível
    var hud = ensureVolumeHud();
    var muted = !!state.mediaMuted || state.volume <= 0;
    var pct = Math.max(0, Math.min(100, Math.round(state.volume)));
    hud.querySelector('.vhud-icon').innerHTML = muted ? ICON.volumeMute : ICON.volume;
    hud.querySelector('.vhud-fill').style.height = (muted ? 0 : pct) + '%';
    hud.querySelector('.vhud-pct').textContent = muted ? '0' : pct;
    hud.classList.toggle('is-muted', muted);
    hud.hidden = false;
    hud.removeAttribute('data-hiding');
    hud.classList.remove('is-visible');
    void hud.offsetWidth;
    hud.classList.add('is-visible');
    clearTimeout(volumeHudTimer); clearTimeout(volumeHudGone);
    volumeHudTimer = setTimeout(function () {
      hud.setAttribute('data-hiding', '');
      volumeHudGone = setTimeout(function () {
        hud.hidden = true; hud.classList.remove('is-visible'); hud.removeAttribute('data-hiding');
      }, 200);
    }, 1300);
  }

  // Teclas de mídia de volume. No modo demo ajustam o nível local e mostram
  // o HUD; no modo nativo o backend é a fonte da verdade (o HUD é disparado
  // por setSystemState quando o nível muda), então aqui apenas evitamos o
  // comportamento padrão do navegador.
  function wireVolumeKeys() {
    document.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k !== 'AudioVolumeUp' && k !== 'AudioVolumeDown' && k !== 'AudioVolumeMute') return;
      e.preventDefault();
      if (nativeMode) return;
      if (k === 'AudioVolumeMute') {
        state.mediaMuted = !state.mediaMuted;
      } else {
        var step = 5;
        state.volume = Math.max(0, Math.min(100, state.volume + (k === 'AudioVolumeUp' ? step : -step)));
        if (state.volume > 0) state.mediaMuted = false;
      }
      syncVolumeUI();
      showVolumeHud();
    });
  }

  function triggerCapture() {
    if (nativeMode) { window.DeckNative.captureDesktop(); return; }
    elFlash.classList.remove('is-active');
    void elFlash.offsetWidth;
    elFlash.classList.add('is-active');
    showToast('Captura de tela salva', 'capture');
    state.notifications.unshift({
      id: 'shot-' + Date.now(), title: 'Captura de tela', icon: 'capture', color: '#5468d1',
      time: 'agora', text: 'Toque para ver sua captura de tela'
    });
    updateNotifBadge();
    if (!elNotifPanel.hidden) renderNotifications();
  }

  /* ============================================================
     15. SELEÇÃO NO DESKTOP (clique em área vazia)
     ============================================================ */
  function wireDesktopSelection() {
    elDesktop.addEventListener('click', function (e) {
      if (e.target === elDesktop || e.target.classList.contains('wallpaper') || e.target.closest('.wallpaper')) {
        if (state.selectedDesktopId) { state.selectedDesktopId = null; renderDesktop(); }
        closeAllPopovers();
        closeLauncher();
      }
    });
    elDesktop.addEventListener('contextmenu', function (e) {
      if (e.target === elDesktop || e.target.closest('.wallpaper')) {
        e.preventDefault();
        closeAllPopovers();
        showDesktopContextMenu(e.clientX, e.clientY);
      }
    });
  }

  /* ============================================================
     16. WIRING GERAL
     ============================================================ */
  function wireTaskbar() {
    $('#appsBtn').addEventListener('click', function (e) { e.stopPropagation(); toggleLauncher(); });
    $('#navHome').innerHTML = ICON.home;
    $('#navBack').innerHTML = ICON.back;
    $('#navRecents').innerHTML = ICON.recents;
    $('#appsBtn').innerHTML = ICON.grid;
    $('#captureBtn').innerHTML = ICON.capture;
    $('#volumeBtn').innerHTML = ICON.volume;
    // insere o sino antes do badge existente, sem recriar o nó do badge
    $('#notifBtn').insertAdjacentHTML('afterbegin', ICON.bell);

    $('#navHome').addEventListener('click', function () { closeLauncher(); closeAllPopovers(); showToast('Início', 'home'); });
    $('#navBack').addEventListener('click', function () {
      if (!elLauncher.hidden) { closeLauncher(); return; }
      showToast('Voltar', 'back');
    });
    $('#navRecents').addEventListener('click', function () {
      state.launcherTab = 'recent';
      openLauncher();
      renderLauncherTabs();
      renderLauncher();
    });

    $('#captureBtn').addEventListener('click', function (e) { e.stopPropagation(); triggerCapture(); });

    $('#volumeBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = elVolumePop.hidden;
      toggleLayer('volume');
      if (willOpen) renderVolumePopover();
    });
    $('#notifBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = elNotifPanel.hidden;
      toggleLayer('notifications');
      if (willOpen) renderNotifications();
    });
    $('#statusBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = elQuickSettings.hidden;
      toggleLayer('quickSettings');
      if (willOpen) renderQuickSettings();
    });
    $('#clockBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = elCalendarPop.hidden;
      toggleLayer('calendar');
      if (willOpen) { calCursor = new Date(); renderCalendar(); if(nativeMode) window.DeckNative.systemAction('calendar',null); }
    });

    $('#quickSearchInput').addEventListener('focus', function () {
      openLauncher();
      elLauncherSearch.value = '';
    });
  }

  function renderLauncherTabs() {
    $$('.launcher-tab', elLauncherTabs).forEach(function (tab) {
      tab.classList.toggle('is-active', tab.getAttribute('data-tab') === state.launcherTab);
    });
  }

  function wireLauncher() {
    $$('.launcher-tab', elLauncherTabs).forEach(function (tab) {
      tab.addEventListener('click', function () {
        state.launcherTab = tab.getAttribute('data-tab');
        state.launcherPage = 0;
        renderLauncherTabs();
        renderLauncher();
      });
    });
    elLauncherSearch.addEventListener('input', function () {
      state.launcherQuery = elLauncherSearch.value;
      state.launcherPage = 0;
      renderLauncher();
    });
    elLauncher.querySelector('.launcher-scrim').addEventListener('click', closeLauncher);
    initLauncherGestures();
  }

  function wirePopoverDismiss() {
    // capture:true é essencial aqui: vários botões dentro dos painéis
    // (Wi-Fi, Bluetooth, Não perturbe...) chamam renderQuickSettings()
    // no próprio clique, substituindo o innerHTML e desconectando
    // e.target do DOM. Se este listener rodasse na fase de bubble (como
    // antes), ele viria DEPOIS do re-render, e e.target.closest(...) num
    // nó já desconectado sempre retornaria null — fechando o painel a
    // cada toggle. Rodando na fase de captura, o teste acontece antes
    // do DOM mudar, então o painel só fecha quando o clique é de fato
    // fora dele.
    document.addEventListener('click', function (e) {
      // Cliques DENTRO do menu de contexto são geridos pelos próprios itens
      // (que chamam closeContextMenu ou trocam para um submenu). Fechar aqui,
      // na captura, escondia o menu ANTES do handler do item ler sua posição
      // — getBoundingClientRect devolvia 0,0 e o submenu "Personalizar plano
      // de fundo" abria no canto superior esquerdo.
      if (e.target.closest('.context-menu')) return;
      var isInsideLayer = e.target.closest('.popover, .panel, .taskbar, .launcher-content');
      if (!isInsideLayer) {
        closeAllPopovers();
      } else if (!e.target.closest('#volumeBtn, #statusBtn, #notifBtn, #clockBtn, .popover, .panel')) {
        // clique em área da taskbar que não é um gatilho: fecha popovers, mantém launcher
        if (!e.target.closest('#appsBtn, .launcher-content')) closeAllPopovers();
      }
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeAllPopovers();
        closeLauncher();
        closeContextMenu();
      }
    });
    window.addEventListener('resize', function () {
      closeContextMenu();
      if (!elVolumePop.hidden) positionVolumePopover();
      if (!elLauncher.hidden) renderLauncher();
    });
  }

  /* ============================================================
     17. BRIDGE / API PÚBLICA
     Estas funções serão chamadas futuramente por uma bridge ligada
     ao backend Python (ADB / scrcpy). Nenhuma lógica Android deve
     entrar nos componentes visuais — apenas nestes setters.
     ============================================================ */
  var lastNativeVolume = null, lastNativeMuted = null;
  window.ShellAPI = {
    systemPending: function(feature) { return !!systemPending[feature]; },
    setSystemPending: function(feature, pending) {
      systemPending[feature] = pending;
      renderNativeControls(); renderNativeVolume();
    },
    setSystemState: function(system) {
      if (!nativeMode) return;
      state.system = system || {};
      var s = state.system;
      state.network = {wifi:(s.wifi || {}).enabled,ssid:(s.wifi || {}).ssid || ''};
      state.bluetooth = (s.bluetooth || {}).enabled;
      state.dnd = (s.dnd || {}).enabled;
      state.darkMode = (s.dark_mode || {}).enabled;
      state.autoRotate = (s.rotation || {}).enabled;
      var newVolume = (s.audio || {}).percent || 0;
      var newMuted = (s.audio || {}).muted;
      // Dispara o HUD lateral quando o nível/mudo muda por fora dos painéis
      // (ex.: usuário mexeu no volume do telefone e o backend reenviou o
      // estado). Nunca no primeiro setSystemState (estado inicial).
      var volumeChanged = lastNativeVolume !== null && (newVolume !== lastNativeVolume || !!newMuted !== !!lastNativeMuted);
      lastNativeVolume = newVolume; lastNativeMuted = newMuted;
      state.volume = newVolume;
      state.mediaMuted = newMuted;
      renderBatteryUI(); renderNativeControls(); renderNativeVolume(); renderNativeTray();
      if (volumeChanged) showVolumeHud();
    },
    flashVolume: function () { showVolumeHud(); },
    showMessage: function (message) { showToast(message, 'settingsShortcut'); },
    setSessions: function (sessions) { state.sessions = sessions || []; },
    setConfig: function (config) {
      state.config = config || {};
      var c = state.config;
      var key = JSON.stringify([c.wallpaper_style,c.wallpaper_color,c.wallpaperUrl,c.wallpaper_fit]);
      var wall = document.querySelector('.wallpaper');
      if (!nativeMode || !wall || wall.dataset.configKey === key) return;
      wall.dataset.configKey = key;
      wall.removeAttribute('style');
      var custom = c.wallpaper_style === 'image' || c.wallpaper_style === 'solid';
      Array.from(wall.children).forEach(function(child) { child.style.display = custom ? 'none' : ''; });
      if (custom) {
        wall.style.background = CSS.supports('color', c.wallpaper_color) ? c.wallpaper_color : '#10243b';
        if (c.wallpaper_style === 'image' && c.wallpaperUrl) {
          wall.style.backgroundImage = 'url(' + JSON.stringify(c.wallpaperUrl) + ')';
          wall.style.backgroundSize = {fill:'cover',fit:'contain',center:'auto'}[c.wallpaper_fit] || 'cover';
          wall.style.backgroundPosition = 'center';
          wall.style.backgroundRepeat = 'no-repeat';
        }
      } else if (c.wallpaper_color && c.wallpaper_color !== '#10243b' && CSS.supports('color', c.wallpaper_color)) {
        wall.style.setProperty('--wall-b', c.wallpaper_color);
      }
    },
    showWindowSelector: function (sessions) { showNativeSelector(sessions); },
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    setApps: function (apps) {
      apps = apps.filter(function(a){return a.id !== 'deck.settings';}).concat([{id:'deck.settings',name:'Configurações',icon:'settingsShortcut',color:'linear-gradient(135deg,#64748b,#334155)',desktop:true,kind:'local',running_count:0}]);
      var catalogChanged = JSON.stringify(state.apps.map(function(a) {return [a.id,a.name,a.iconUrl,a.favorite,a.recent,a.desktop];})) !==
        JSON.stringify(apps.map(function(a) {return [a.id,a.name,a.iconUrl,a.favorite,a.recent,a.desktop];}));
      state.apps = apps;
      if (nativeMode) {
        state.pinnedIds = apps.filter(function(a) {return a.favorite;}).map(function(a) {return a.id;});
        state.desktopIds = apps.filter(function(a) {return a.desktop;}).map(function(a) {return a.id;});
        state.openIds = apps.filter(function(a) {return a.running_count > 0;}).map(function(a) {return a.id;});
        state.recentIds = apps.filter(function(a) {return a.recent;}).sort(function(a,b) {return a.recent_rank-b.recent_rank;}).map(function(a) {return a.id;});
      }
      if (catalogChanged) { renderDesktop(); if (!elLauncher.hidden) renderLauncher(); }
      renderTaskbarApps();
    },
    setBattery: function (percent, charging) {
      state.battery.percent = percent == null ? null : Math.max(0, Math.min(100, percent));
      state.battery.charging = typeof charging === 'boolean' ? charging : null;
      renderBatteryUI();
    },
    setDeviceStatus: function (status) {
      // status: { wifi:bool, ssid:string, bluetooth:bool, deviceName:string, connected:bool }
      // Todos os campos são opcionais e independentes — uma bridge antiga
      // que só envie {wifi, ssid, bluetooth} continua funcionando normalmente.
      if (!status) return;
      var changed = JSON.stringify(state.device) !== JSON.stringify({name:status.deviceName,connected:status.connected,status:status.status || '',state:status.state});
      if (typeof status.wifi === 'boolean') state.network.wifi = status.wifi;
      if (status.ssid) state.network.ssid = status.ssid;
      if (typeof status.bluetooth === 'boolean') state.bluetooth = status.bluetooth;
      if (status.deviceName) state.device.name = status.deviceName;
      if (typeof status.connected === 'boolean') state.device.connected = status.connected;
      state.device.status = status.status || '';
      state.device.state = status.state;
      $('#statusBtn').title = state.device.name + ' · ' + (status.status || '') + (state.battery.charging ? ' · carregando' : '');
      if (nativeMode) $('.status-wifi').innerHTML = ICON.phone;
      if (changed && !elQuickSettings.hidden) renderQuickSettings();
    },
    setActiveApp: function (id) {
      state.activeId = id;
      if (id && state.openIds.indexOf(id) === -1) state.openIds.push(id);
      renderTaskbarApps();
    },
    setNotifications: function (items) {
      state.notifications = items || [];
      updateNotifBadge();
      if (!elNotifPanel.hidden) renderNotifications();
    }
  };


  function nativeMenu(x, y, actions) {
    elContextMenu.innerHTML = '';
    actions.forEach(function (entry) {
      var button = el('button', 'ctx-item');
      button.textContent = entry[0];
      button.addEventListener('click', function () { closeContextMenu(); entry[1](); });
      elContextMenu.appendChild(button);
    });
    elContextMenu.hidden = false;
    positionMenu(x, y, elContextMenu);
  }
  function showNativeSelector(sessions) {
    nativeMenu(window.innerWidth / 2, window.innerHeight - 70, sessions.map(function(s, i) {
      return [s.name + ' · janela ' + (i + 1) + ' · ' + s.state, function() {window.DeckNative.focusSession(s.session_id);}];
    }));
  }
  function showNativeAppMenu(x, y, id) {
    var app = appById(id);
    var actions = [
      ['Abrir em nova janela', function() {window.DeckNative.openApp(id);}],
      [app.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos', function() {window.DeckNative.toggleFavorite(id);}],
      [app.desktop ? 'Remover do desktop' : 'Adicionar ao desktop', function() {window.DeckNative.toggleShortcut(id);}]
    ];
    var sessions = state.sessions.filter(function(s) {return s.package === id;});
    sessions.forEach(function(s, i) {
      actions.push(['Focar janela ' + (i + 1), function() {window.DeckNative.focusSession(s.session_id);}]);
      actions.push(['Minimizar janela ' + (i + 1), function() {window.DeckNative.minimizeSession(s.session_id);}]);
      actions.push(['Snap janela ' + (i + 1), function() {
        var layouts = [['50% esquerda','left_half'],['50% direita','right_half'],['70% esquerda','left_70'],['30% direita','right_30'],
          ['30% esquerda','left_30'],['70% direita','right_70'],['Superior esquerdo','top_left'],['Superior direito','top_right'],
          ['Inferior esquerdo','bottom_left'],['Inferior direito','bottom_right']];
        nativeMenu(x,y,layouts.map(function(l) {return [l[0], function() {window.DeckNative.snapWindow(s.session_id,l[1]);}];}));
      }]);
    });
    if (sessions.length) actions.push(['Fechar janelas deste app', function() {window.DeckNative.closeApp(id);}]);
    nativeMenu(x,y,actions);
  }
  function renderNativeControls() {
    if (!nativeMode) return;
    var mirrorButton = $('#deckMirrorBtn');
    if (mirrorButton) mirrorButton.disabled = !state.device.connected;
    var labels = {wifi:'Wi-Fi',bluetooth:'Bluetooth',mute:'Silenciar mídia',dnd:'Não perturbe',
      dark:'Escuro Android',rotate:'Rotação auto',capture:'Captura Deck',mobile_data:'Dados móveis',lock:'Bloquear',power:'Desligar'};
    $$('#quickSettings [data-qs]').forEach(function(b) {
      var key = b.getAttribute('data-qs');
      var feature = {mute:'audio',dark:'dark_mode',rotate:'rotation'}[key] || key;
      var value = state.system[feature] || {};
      var pending = systemPending[feature] || (key === 'mute' && systemPending.mute);
      b.disabled = !value.writable || !!pending;
      b.setAttribute('aria-busy', pending ? 'true' : 'false');
      b.classList.toggle('is-on', value.available && (key === 'mute' ? value.muted === true : value.enabled === true));
      var detail = !value.available ? 'Indisponível' : value.enabled === true ? 'Ligado' : value.enabled === false ? 'Desligado' : '';
      if (key === 'wifi' && value.enabled) detail = value.connected ? value.ssid || 'SSID indisponível' : 'Sem conexão';
      if (pending) detail = 'Aguardando Android…';
      var sub = b.querySelector('.qs-primary-sub');
      var label = b.querySelector('.qs-tile-label');
      if (sub) sub.textContent = detail;
      if (label) label.textContent = labels[key] + (!value.available ? ' · Indisponível' : '');
      b.title = labels[key] + ' · ' + detail + (value.reason ? ' · '+value.reason : '');
      if (key === 'wifi' && value.rssi_dbm != null) b.title += ' · '+value.rssi_dbm+' dBm ('+value.signal_percent+'% aproximado)';
      if (key === 'rotate') b.title += ' · Telefone/display padrão'+(value.degrees == null ? '' : ' · '+value.degrees+'°')+'; Flex Display preservado';
      if (key === 'dnd') b.title += ' · Android; ativa modo de prioridade';
      if (key === 'capture') b.title = value.reason || 'Desktop Linux completo';
      if (key === 'mobile_data') {
        var cellular = state.system.cellular || {};
        b.title += ' · '+(cellular.carriers || []).join(' / ')+' '+(cellular.network_types || []).join(' / ');
        if (cellular.registered === false) b.title += ' · Sem serviço de rede móvel';
      }
    });
    var media = $('#quickSettings .qs-media-sub');
    if (media) { media.textContent = mediaOutputLabel(); media.title = (state.system.media_output || {}).reason || ''; }
    var header = $('#quickSettings .qs-device');
    if (header) {
      header.querySelector('.qs-device-status').textContent = ({connected:'Autorizado',unauthorized:'Não autorizado',offline:'Offline',error:'Erro ADB',starting:'Procurando…'})[state.device.state] || 'Desconectado';
      header.title = state.device.status || '';
      if (!$('#qsRefresh')) {
        var refresh = el('button', 'qs-device-status');
        refresh.id = 'qsRefresh'; refresh.textContent = 'Atualizar';
        refresh.title = 'Atualizar dispositivo, apps e estados Android';
        refresh.addEventListener('click', function() {window.DeckNative.refresh();});
        header.appendChild(refresh);
      }
    }
    var agentBox = $('#agentAccessStatus');
    if (!agentBox && header) {
      agentBox = el('div', ''); agentBox.id = 'agentAccessStatus';
      agentBox.style.cssText = 'font-size:11px;padding:6px 16px;line-height:1.5';
      header.parentNode.insertBefore(agentBox, header.nextSibling);
    }
    if (agentBox) {
      var agent = state.system.agent || {}, permissions = agent.permissions || {}, info = agent.device || {};
      agentBox.textContent = agent.connected ? 'Agent conectado · '+(info.name || info.model || 'Android')+' · Android '+(info.androidVersion || '—')+' · Acessos: '+
        [['notifications','Notificações'],['dnd','Não Perturbe'],['usageAccess','Uso'],['writeSettings','Configurações'],['accessibility','Acessibilidade']].map(function(p) {
          return p[1]+(permissions[p[0]] ? ' ✓' : ' ✗');
        }).join(' · ') : 'Agent desconectado';
      agentBox.title = 'Acessos concedidos não significam comandos implementados. Acessibilidade não automatiza a interface.';
    }
    var capture = $('#captureBtn');
    capture.disabled = !(state.system.capture || {}).writable || !!systemPending.capture;
    capture.title = 'Capturar desktop Linux completo';
    capture.setAttribute('data-tip','Capturar desktop Linux');
    renderNativeVolume();
    if (!elCalendarPop.hidden) renderCalendar();
  }

  function sendVolume(slider) {
    var value = Number(slider.value);
    renderNativeVolume();
    window.DeckNative.systemAction('audio', value);
  }

  function mediaOutputLabel() {
    var route = state.system.media_output || {};
    return route.available ? route.outputs.join(' / ')+' · somente leitura' : 'Indisponível neste dispositivo';
  }

  function renderNativeVolume() {
    if (!nativeMode) return;
    var audio = state.system.audio || {};
    var media = state.system.media || {};
    var box = $('#deckNowPlaying');
    if (!box && $('#volOutputs')) {
      box = document.createElement('div'); box.id = 'deckNowPlaying';
      box.style.cssText = 'padding:12px 0;border-top:1px solid rgba(255,255,255,.12);margin-top:10px;overflow-wrap:anywhere';
      box.setAttribute('aria-live','polite');
      $('#volOutputs').parentNode.appendChild(box);
    }
    if (box) {
      box.replaceChildren();
      var title = document.createElement('div'); title.style.fontWeight = '600';
      title.textContent = !media.available ? 'Mídia indisponível' : !media.active ? 'Nenhuma mídia ativa' : (media.title || 'Título indisponível');
      var detail = document.createElement('div'); detail.style.cssText = 'font-size:12px;opacity:.75;margin-top:4px';
      var playback = {playing:'Reproduzindo',paused:'Pausado',buffering:'Carregando',connecting:'Conectando',stopped:'Parado',error:'Erro de reprodução',unknown:'Estado não informado'};
      detail.textContent = !media.available ? 'Inicie o Deck Agent e permita acesso a notificações.' : !media.active ? '' : [media.artist,media.app !== media.package ? media.app : null,playback[media.playbackState] || 'Estado não informado'].filter(Boolean).join(' · ');
      box.appendChild(title); box.appendChild(detail);
      var art = media.artwork;
      box.style.padding = '12px'; box.style.borderRadius = '12px';
      box.style.backgroundSize = 'cover'; box.style.backgroundPosition = 'center';
      box.style.backgroundImage = typeof art === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(art) && art.length < 25000 ?
        'linear-gradient(rgba(0,0,0,.72),rgba(0,0,0,.78)),url("'+art+'")' : '';
      var actions = el('div',''); actions.style.cssText = 'display:flex;gap:10px;margin-top:12px;justify-content:center';
      [['previous','Anterior','⏮'],[media.playing ? 'pause' : 'play',media.playing ? 'Pausar' : 'Reproduzir',media.playing ? '⏸' : '▶'],['next','Próxima','⏭']].forEach(function(a) {
        var button = el('button',''); button.textContent = a[2]; button.title = a[1]; button.setAttribute('aria-label',a[1]);
        button.dataset.mediaAction = a[0]; button.style.cssText = 'padding:8px 14px;border-radius:8px;color:inherit;background:rgba(255,255,255,.14);border:0';
        button.disabled = !!systemPending.media || !media.session || !(media.controls || {})[a[0]];
        button.addEventListener('click',function() {window.DeckNative.systemAction('media',{action:a[0],session:media.session});});
        actions.appendChild(button);
      });
      box.appendChild(actions);

    }
    if ($('#volOutputs')) $('#volOutputs').textContent = mediaOutputLabel();
    var pending = systemPending.audio || systemPending.mute;
    ['#volSlider','#qsVolumeSlider'].forEach(function(id) {
      var slider = $(id); if (!slider) return;
      slider.disabled = !audio.writable || !!pending;
      slider.min = audio.min || 0; slider.max = audio.max || 1; slider.step = 1;
      slider.value = audio.value || 0;
      slider.style.setProperty('--val',(audio.percent || 0)+'%');
      slider.title = audio.available ? 'Mídia do Android: '+audio.value+'/'+audio.max : 'Volume Android indisponível';
    });
    var label = $('#volValueLabel');
    if (label) label.textContent = pending ? 'Aguardando…' : audio.available ? audio.percent+'%' : 'Indisponível';
    var mute = $('#volMuteToggle');
    if (mute) { mute.disabled = !audio.writable || !!pending; mute.innerHTML = audio.muted ? ICON.volumeMute : ICON.volume; }
    $('#volumeBtn').innerHTML = audio.muted ? ICON.volumeMute : ICON.volume;
    $('#volumeBtn').title = audio.available ? 'Mídia Android · '+audio.percent+'%' : 'Volume Android indisponível';
  }

  function renderNativeTray() {
    var wifi = state.system.wifi || {}, mobile = state.system.cellular || {};
    var icon = ICON.phone;
    if (wifi.connected) {
      icon = ICON.wifi;
    } else if (mobile.level != null) {
      icon = wrap([1,2,3,4].map(function(n) {return '<path d="M'+(3+n*4)+' 20v-'+(n*4)+'" opacity="'+(n<=mobile.level ? '1' : '.2')+'"/>';}).join(''));
    }
    var tray = $('.status-wifi'); tray.innerHTML = icon;
    if (wifi.connected && wifi.signal_percent != null) {
      var paths = tray.querySelectorAll('path');
      paths.forEach(function(p,i) {p.style.opacity = wifi.signal_percent >= (3-i)*25 ? '1' : '.2';});
    }
    tray.title = wifi.connected ? 'Wi-Fi · '+(wifi.ssid || 'SSID indisponível')+(wifi.rssi_dbm == null ? '' : ' · '+wifi.rssi_dbm+' dBm') :
      mobile.registered === false ? 'Rede móvel sem serviço' : 'Sinal móvel indisponível';
    $('#notifBtn').title = (state.system.notifications || {}).reason || 'Notificações Android indisponíveis';
  }

  /* ============================================================
     18. INIT
     ============================================================ */
  function init() {
    renderDesktop();
    renderTaskbarApps();
    renderBatteryUI();
    tickClock();
    function scheduleClock() {
      setTimeout(function() {tickClock(); scheduleClock();}, 60000 - Date.now() % 60000 + 20);
    }
    scheduleClock();
    updateNotifBadge();
    wireTaskbar();
    wireLauncher();
    wirePopoverDismiss();
    wireDesktopSelection();
    wireVolumeKeys();
    if (nativeMode) { renderNativeControls(); renderNativeTray(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
