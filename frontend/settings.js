/* Configuração do Dex, não uma janela Android: somente intenções via DeckNative. */
(function () {
  'use strict';
  var panel, form, status, save, previousFocus, initial, busy = false;
  var labels = {
    display: 'Menor largura (dp)', orientation: 'Orientação inicial',
    appearance_theme: 'Tema compartilhado / cor de fundo',
    fps: 'Quadros por segundo', bitrate: 'Bitrate de vídeo',
    keyboard: 'Teclado', mouse: 'Mouse', gamepad: 'Controle / gamepad',
    audio: 'Encaminhar áudio ao computador', hide_ime: 'Ocultar teclado virtual',
    turn_screen_off: 'Apagar tela do telefone ao abrir sessão',
    preserve_on_close: 'Preservar aplicativo ao fechar janela',
    wallpaper_style: 'Tipo de wallpaper', wallpaper_fit: 'Ajuste da imagem',
    wallpaper_path: 'Caminho local da imagem', wallpaper_color: 'Cor de fundo'
  };
  var names = {gradient:'Padrão Dex / gradiente',solid:'Cor sólida',image:'Imagem',
    fill:'Fill — preencher',fit:'Fit — ajustar',center:'Center — centralizar',
    disabled:'Desativado',uhid:'UHID',sdk:'SDK',aoa:'AOA'};
  function close() {
    if (busy) return;
    panel.hidden = true;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  }
  function build() {
    panel = document.createElement('section');
    panel.id = 'deckSettings'; panel.hidden = true;
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true');
    panel.setAttribute('aria-labelledby','deckSettingsTitle');
    panel.innerHTML = '<header><h2 id="deckSettingsTitle">Configurações do Dex</h2>' +
      '<button type="button" class="icon-btn" aria-label="Fechar configurações">×</button></header>' +
      '<input id="deckSettingsSearch" type="search" placeholder="Encontrar uma configuração" aria-label="Encontrar uma configuração">' +
      '<p class="deck-settings-note">DeX e celular · Sessão e entrada: aplica-se às próximas sessões/janelas. ' +
      'As janelas abertas não serão reiniciadas. Flex Display continua acompanhando o redimensionamento.</p>' +
      '<div class="deck-settings-layout"><nav aria-label="Categorias"></nav><form><div class="deck-settings-fields"></div><footer>' +
      '<span role="status" aria-live="polite"></span><button class="qs-tile" type="submit">Salvar</button>' +
      '</footer></form></div>';
    document.getElementById('app') ? document.getElementById('app').appendChild(panel) : document.body.appendChild(panel);
    form = panel.querySelector('form'); status = panel.querySelector('[role=status]');
    save = form.querySelector('[type=submit]');
    panel.querySelector('header button').onclick = close;
    panel.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        var nodes = Array.from(panel.querySelectorAll('button:not(:disabled),select,input,summary')).filter(function(el){return el.getClientRects().length;});
        var first = nodes[0], last = nodes[nodes.length-1];
        if (e.shiftKey && document.activeElement === first) {last.focus();e.preventDefault();}
        else if (!e.shiftKey && document.activeElement === last) {first.focus();e.preventDefault();}
      }
    });
    panel.addEventListener('click', function(e) {e.stopPropagation();});
    form.onsubmit = async function(e) {
      e.preventDefault(); if (busy) return;
      var changes = {};
      Array.from(form.elements).forEach(function(el) {
        if (!el.name) return;
        var value = el.type === 'checkbox' ? el.checked : el.name === 'fps' ? Number(el.value) : el.value;
        if (value !== initial[el.name]) changes[el.name] = value;
      });
      var disabledBefore = Array.from(form.elements).map(function(el){return [el,el.disabled];});
      busy = true; Array.from(form.elements).forEach(function(el){el.disabled=true;}); status.textContent = 'Salvando…';
      try {
        var result = await window.DeckNative.saveSettings(changes);
        if (result.ok) {
          initial = Object.assign({}, window.ShellAPI.getState().config);
          status.textContent = 'Salvo. Sessão: aplica-se às próximas sessões/janelas. Wallpaper: imediato.';
        } else status.textContent = result.error || 'Não foi possível salvar.';
      } finally { busy = false; disabledBefore.forEach(function(entry){entry[0].disabled=entry[1];}); }
    };
  }
  window.DeckSettings = {open: async function() {
    if (!panel) build();
    if (busy || !panel.hidden) return;
    previousFocus = document.activeElement;
    var options = await window.DeckNative.settingsOptions();
    if (!options.ok) return;
    initial = Object.assign({}, window.ShellAPI.getState().config);
    var fields = form.querySelector('.deck-settings-fields'); fields.replaceChildren();
    [['Sessão',['display','fps','bitrate']],
     ['Entrada',['keyboard','mouse','gamepad']],
     ['Android / sessão',['orientation','audio','hide_ime','turn_screen_off','preserve_on_close']],
     ['Aparência',['appearance_theme','wallpaper_style','wallpaper_fit','wallpaper_path','wallpaper_color']]].forEach(function(group,index) {
      var section = document.createElement('details'); section.open = true;
      section.dataset.category = ['system','devices','system','personalization'][index];
      var title = document.createElement('summary'); title.textContent = group[0]; section.appendChild(title);
      group[1].forEach(function(key) {
        var row = document.createElement('label'), caption = document.createElement('span');
        caption.textContent = labels[key]; row.appendChild(caption);
        var el = document.createElement(options.choices[key] ? 'select' : 'input'); el.name = key;
        if (options.choices[key]) options.choices[key].forEach(function(value) {
          var opt = document.createElement('option'); opt.value = value;
          opt.textContent = key === 'display' ? value.replace('/', ' · ')+' DPI' : names[value] || String(value);
          el.appendChild(opt);
        });
        else el.type = typeof initial[key] === 'boolean' ? 'checkbox' : key === 'wallpaper_color' ? 'color' : 'text';
        if (el.type === 'checkbox') el.checked = initial[key]; else el.value = initial[key] == null ? '' : initial[key];
        if (key === 'display') {
          var resolutionRow = document.createElement('label');
          var resolutionLabel = document.createElement('span'); resolutionLabel.textContent='Resolução da sessão';
          var resolution = document.createElement('select'); resolution.id='sessionResolution';
          Array.from(new Set(options.displays.map(function(d){return d.resolution;}))).forEach(function(value){
            var option=document.createElement('option'); option.value=value; option.textContent=value;
            resolution.appendChild(option);
          });
          resolution.value=initial.display.split('/')[0];
          resolutionRow.appendChild(resolutionLabel); resolutionRow.appendChild(resolution); section.appendChild(resolutionRow);
          function fillWidths(preferred) {
            el.replaceChildren();
            var available=options.displays.filter(function(d){return d.resolution===resolution.value;})
              .sort(function(a,b){return a.smallest_width_dp-b.smallest_width_dp;});
            available.forEach(function(d){
              var option=document.createElement('option'); option.value=d.value;
              option.textContent=(Number.isInteger(d.smallest_width_dp)?'':'≈ ')+Math.round(d.smallest_width_dp)+' dp';
              el.appendChild(option);
            });
            el.value=available.reduce(function(best,d){return Math.abs(d.smallest_width_dp-preferred)<Math.abs(best.smallest_width_dp-preferred)?d:best;}).value;
          }
          fillWidths(options.displays.find(function(d){return d.value===initial.display;}).smallest_width_dp);
          resolution.onchange=function(){
            var previous=options.displays.find(function(d){return d.value===el.value;});
            fillWidths(previous.smallest_width_dp);
          };
          row.title='Maior valor em dp → elementos menores e mais espaço. Estimativa do display inicial; Flex e barras do Android podem alterar a área útil.';
        }
        row.appendChild(el); section.appendChild(row);
        if (key === 'wallpaper_path') {
          var pick = document.createElement('button');
          pick.type = 'button'; pick.className = 'deck-settings-pick';
          pick.textContent = 'Escolher imagem…';
          pick.onclick = function () {
            pick.disabled = true;
            window.DeckNative.pickWallpaper().then(function (result) {
              if (result && result.path) el.value = result.path;
              else if (result && result.ok === false && result.error && window.ShellAPI)
                window.ShellAPI.showMessage(result.error);
            }).finally(function () { pick.disabled = false; });
          };
          section.appendChild(pick);
        }
        if (key === 'display') {
          var hint=document.createElement('p'); hint.className='deck-settings-note';
          hint.textContent='Maior dp → elementos menores. Opções disponíveis para esta resolução; aplica-se às próximas sessões/janelas.';
          section.appendChild(hint);
        }
        if (key === 'appearance_theme') el.onchange = function() {
          form.elements.wallpaper_color.value = options.theme_colors[el.value];
        };
      });
      fields.appendChild(section);
    });
    var host = await window.DeckNative.hostControls();
    panel.dataset.integrated = host.available && host.integrated ? 'true' : 'false';
    if (host.available && host.integrated) {
      var integrated = document.createElement('details'); integrated.open = true; integrated.dataset.category = 'apps';
      var title = document.createElement('summary'); title.textContent = 'Apps integrados'; integrated.appendChild(title);
      var info = document.createElement('p'); info.className = 'deck-settings-note';
      info.textContent = 'Abra os apps Android pelo catálogo e alterne entre eles pela barra do Dex. Arraste o título para mover e use os botões da janela para minimizar, maximizar ou fechar. F11 no teclado alterna a tela cheia do Dex; o botão maximizar atua somente no app. Alt libera o mouse UHID. As preferências de controle abaixo valem para as próximas sessões.';
      integrated.appendChild(info);
      var recovery = document.createElement('div'); recovery.className='deck-host-actions';
      [['Janela externa · app ativo','external'],['Integrar última janela externa','reparent']].forEach(function(item) {
        var button=document.createElement('button');button.type='button';button.className='qs-tile';button.textContent=item[0];
        button.onclick=async function(){close();await window.DeckNative.hostControls(item[1]);};
        recovery.appendChild(button);
      });
      integrated.appendChild(recovery);
      fields.prepend(integrated);
    }
    if (host.available && !host.integrated) {
      var controls = document.createElement('details'); controls.open = true; controls.dataset.category='apps';
      var heading = document.createElement('summary'); heading.textContent = 'Apps integrados e janela do Dex';
      controls.appendChild(heading);
      var help = document.createElement('p'); help.className = 'deck-settings-note';
      help.textContent = 'Escolha um app Android, abra com Desktop ou UHID e depois escolha Integrar janela. Um app integrado por vez. Outros apps: validação física pendente. DPI 240. Fullscreen parcial: validação no Android pendente. Para mover o Dex, arraste a área livre no topo; redimensione pelas bordas.';
      controls.appendChild(help);
      var appRow=document.createElement('label'), appLabel=document.createElement('span');
      appLabel.textContent='Aplicativo Android';appRow.appendChild(appLabel);
      var appChoice=document.createElement('select');appChoice.id='deckHostApp';
      (host.apps || []).forEach(function(app){var opt=document.createElement('option');opt.value=app.package;opt.textContent=app.name;appChoice.appendChild(opt);});
      appChoice.disabled=!(host.apps || []).length || !window.ShellAPI.getState().device.connected;appRow.appendChild(appChoice);controls.appendChild(appRow);
      var actions = document.createElement('div'); actions.className = 'deck-host-actions';
      [['Abrir · Desktop/SDK','launch','sdk'],['Abrir · UHID/Jogo','launch','uhid'],
       ['Integrar janela','reparent'],['Janela externa','external'],
       [host.pixel ? 'Desativar 1:1' : 'Ativar 1:1','pixel'],
       [host.fullscreen ? 'Sair de fullscreen' : 'Fullscreen · parcial','fullscreen'],
       ['Minimizar Dex','minimize']].forEach(function(item) {
        var button = document.createElement('button'); button.type = 'button';
        button.className = 'qs-tile'; button.textContent = item[0];
        button.disabled=item[1]==='launch' && appChoice.disabled;
        button.onclick = async function() {
          close();
          await window.DeckNative.hostControls(item[1]==='launch' ? 'launch_app' : item[1], item[1]==='launch' ? {mouse:item[2],package:appChoice.value} : item[2]);
        };
        actions.appendChild(button);
      });
      controls.appendChild(actions);
      var layoutRow = document.createElement('label'), layoutLabel = document.createElement('span');
      layoutLabel.textContent = 'Posição do app'; layoutRow.appendChild(layoutLabel);
      var layout = document.createElement('select'); layout.id = 'deckHostLayout';
      var layoutNames = {center:'Centralizada',square:'Quadrada',left_half:'Metade esquerda',
        left_70:'Esquerda 70%',right_30:'Direita 30%',left_30:'Esquerda 30%',right_70:'Direita 70%',
        top_left:'Canto superior esquerdo',bottom_right:'Canto inferior direito',maximized:'Área disponível'};
      host.layouts.forEach(function(value) {
        var option = document.createElement('option'); option.value = value;
        option.textContent = layoutNames[value] || value; layout.appendChild(option);
      });
      layout.value = host.layout;
      layout.onchange = function() { window.DeckNative.hostControls('layout', layout.value); };
      layoutRow.appendChild(layout); controls.appendChild(layoutRow);
      var hostStatus = document.createElement('p'); hostStatus.className = 'deck-settings-note';
      hostStatus.textContent = host.status; controls.appendChild(hostStatus);
      fields.prepend(controls);
    }
    var note = document.createElement('p'); note.className='deck-settings-note';
    note.textContent='Aparência: wallpaper aplicado imediatamente. O tema compartilha a cor com Tk/Qt; a identidade visual Dex V2 é preservada. Para imagem, informe um caminho local existente. Áudio aqui é encaminhamento scrcpy, não volume do telefone.';
    fields.appendChild(note);
    window.DeckSettingsSections.mount(panel, fields, close);
    status.textContent = ''; panel.hidden = false; panel.querySelector('header button').focus();
  }};
})();
