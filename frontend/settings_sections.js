/* Categorias do app local Configurações. Estados Android vêm do Controller/Agent. */
(function () {
  'use strict';
  var categories = [
    ['system','⚙','Sistema','Tela, som, notificações, energia e armazenamento'],
    ['devices','◉','Bluetooth e dispositivos','Bluetooth, impressoras, mouse e USB'],
    ['network','◎','Rede e Internet','Wi-Fi, Ethernet e VPN'],
    ['personalization','◈','Personalização','Plano de fundo, cores, temas e barra de tarefas'],
    ['apps','▦','Aplicativos','Apps instalados, apps padrão e permissões'],
    ['accounts','○','Contas','Sua conta e outros usuários']
  ];
  function node(tag, text, className) {
    var n=document.createElement(tag); if(text)n.textContent=text; if(className)n.className=className; return n;
  }
  function state() { return window.ShellAPI.getState(); }
  window.DeckSettingsSections = {mount:function(panel,fields,close) {
    var snapshot=state(), system=snapshot.system || {}, connected=Boolean(snapshot.device.connected);
    function card(category,title,description) {
      var d=node('details');d.open=true;d.dataset.category=category;
      d.appendChild(node('summary',title));d.appendChild(node('p',description,'deck-settings-note'));fields.appendChild(d);return d;
    }
    function button(parent,label,fn,disabled) {
      var b=node('button',label,'qs-tile settings-action');b.type='button';b.disabled=Boolean(disabled);
      b.onclick=async function(){b.disabled=true;try{await fn();}finally{b.disabled=Boolean(disabled);}};parent.appendChild(b);return b;
    }
    function phonePage(parent,page,label) {
      var feedback=node('p',connected?'Ajuste concluído na tela do celular.':'Conecte e autorize o celular para abrir esta tela.','deck-settings-note');
      button(parent,label || 'Abrir no celular',async function(){var r=await window.DeckNative.androidSettings(page);feedback.textContent=r.ok?r.message:r.error || 'Tela indisponível.';},!connected);
      parent.appendChild(feedback);
    }
    function toggle(parent,feature,label) {
      var read=function(){return (state().system || {})[feature] || {};};
      var value=read(), row=node('label'), caption=node('span',label+' · Celular'), input=node('input');input.type='checkbox';
      input.checked=value.enabled===true;input.disabled=!value.writable;row.appendChild(caption);row.appendChild(input);parent.appendChild(row);
      var feedback=node('p',value.available ? (value.source==='deck_agent'?'Estado pelo Deck Agent.':'Estado pelo Android.') : value.reason || 'Indisponível sem celular.','deck-settings-note');parent.appendChild(feedback);
      input.onchange=async function(){input.disabled=true;var result=await window.DeckNative.systemAction(feature,input.checked);var current=read();input.checked=current.enabled===true;input.disabled=!current.writable;feedback.textContent=result.ok?'Estado atualizado no celular.':result.error || 'Não foi possível alterar.';};
    }
    var screen=card('system','Tela do celular','Orientação e tema do Android. Resolução e entrada das janelas do Dex são ajustadas em Sessão.');
    toggle(screen,'rotation','Rotação automática');toggle(screen,'dark_mode','Tema escuro');phonePage(screen,'display');
    var sound=card('system','Som','Volume de mídia do celular. O encaminhamento de áudio das próximas janelas está em Android / sessão.');
    var audio=system.audio || {}, volumeRow=node('label'), volumeLabel=node('span','Volume · Celular'), slider=node('input');
    slider.type='range';slider.min=audio.min || 0;slider.max=audio.max || 100;slider.value=audio.value || 0;slider.disabled=!audio.writable;
    volumeRow.appendChild(volumeLabel);volumeRow.appendChild(slider);sound.appendChild(volumeRow);
    var volumeStatus=node('p',audio.available ? String(audio.percent)+'%'+(audio.source==='deck_agent'?' · Deck Agent':'') : audio.reason || 'Celular desconectado.','deck-settings-note');sound.appendChild(volumeStatus);
    slider.onchange=async function(){slider.disabled=true;var r=await window.DeckNative.systemAction('audio',Number(slider.value));var a=state().system.audio || {};slider.value=a.value || 0;slider.disabled=!a.writable;volumeStatus.textContent=r.ok?String(a.percent)+'%':r.error || 'Volume indisponível.';};
    phonePage(sound,'sound');
    var bridgeAudio=system.phone_audio || {}, audioFeedback=node('p',bridgeAudio.reason || 'Áudio PC/celular indisponível.','deck-settings-note');
    sound.appendChild(audioFeedback);
    [['playback','Ouvir PC no celular / Bluetooth'],['microphone','Microfone do celular no PC']].forEach(function(pair){
      var mode=pair[0], current=bridgeAudio[mode] || {};
      sound.appendChild(node('p',pair[1]+': '+(current.active?'transmitindo':current.starting?'aguardando Agent':current.error || 'desligado'),'deck-settings-note'));
      button(sound,'Ativar '+pair[1],async function(){var r=await window.DeckNative.systemAction('phone_'+mode,true);audioFeedback.textContent=r.ok?'Solicitado. Confira o Agent no celular; o microfone pede permissão.':r.error || 'Falha ao ativar.';},!connected || !bridgeAudio.available);
      button(sound,'Parar '+pair[1],async function(){var r=await window.DeckNative.systemAction('phone_'+mode,false);audioFeedback.textContent=r.ok?'Transmissão parada.':r.error || 'Falha ao parar.';},!bridgeAudio.available);
    });
    sound.appendChild(node('p','Funciona por USB. O áudio usa a saída de mídia do celular; o microfone usa o próprio telefone. As transmissões continuam ao fechar a janela do Dex. Pare aqui ou na notificação do Agent.','deck-settings-note'));
    var notif=card('system','Notificações','O Deck Agent fornece eventos da sessão quando o acesso a notificações está autorizado.');
    var n=system.notifications || {};notif.appendChild(node('p',n.available ? String((n.items || []).length)+' eventos recebidos nesta sessão.' : n.reason || 'Agent desconectado ou sem permissão.','deck-settings-note'));toggle(notif,'dnd','Não perturbe');phonePage(notif,'notifications');
    var battery=system.battery || {}, energy=card('system','Energia',battery.available ? 'Celular · '+battery.percent+'%'+(battery.charging?' · carregando':'') : 'Bateria do celular indisponível.');phonePage(energy,'energy','Economia de bateria no celular');
    phonePage(card('system','Armazenamento','Espaço do celular: consulte a tela Android. O Dex ainda não mede ou limpa armazenamento.'),'storage');
    var bluetooth=card('devices','Bluetooth','Conexão e dispositivos do celular. Pareamento é concluído na tela Android.');toggle(bluetooth,'bluetooth','Bluetooth');phonePage(bluetooth,'bluetooth');
    phonePage(card('devices','Impressoras','Serviços de impressão do Android. Impressoras do computador não são gerenciadas pelo Dex.'),'printers');
    var usb=card('devices','USB e Deck Agent',connected?'Celular conectado ao Dex.':'Conecte o celular por USB e autorize a depuração.');
    var agent=system.agent || {};usb.appendChild(node('p',agent.connected?'Deck Agent conectado.':'Deck Agent desconectado. Inicie a sessão USB no app do celular.','deck-settings-note'));
    button(usb,'Atualizar conexão',function(){return window.DeckNative.refresh();});
    var wifi=card('network','Wi-Fi','Rede do celular. A conexão de rede do computador permanece gerenciada pelo sistema do computador.');toggle(wifi,'wifi','Wi-Fi');toggle(wifi,'mobile_data','Dados móveis');phonePage(wifi,'wifi');
    card('network','Ethernet','Não há controle Ethernet integrado para o computador ou celular. Use as configurações de rede do respectivo sistema.');
    phonePage(card('network','VPN','Gerencie perfis e conexões no Android. O Dex não lê credenciais nem cria perfis VPN.'),'vpn');
    card('personalization','Barra de tarefas','A barra do Dex reúne apps e status. Altura, posição e ocultação automática ainda não têm configuração integrada.');
    var installed=card('apps','Apps instalados',panel.dataset.integrated === 'true' ? 'Apps Android abrem automaticamente dentro do Dex. Use a barra do Dex para alternar entre as sessões.' : document.getElementById('deckHostApp') ? 'Apps do catálogo Android abrem em janelas externas. Para testar o encaixe de um app, use Apps integrados acima.' : 'Apps do catálogo Android abrem em janelas externas. O encaixe integrado não está disponível nesta versão.');
    var installedApps=(snapshot.apps || []).filter(function(a){return a.kind==='user' || a.kind==='system';});
    var appSelect=node('select');appSelect.setAttribute('aria-label','Apps instalados');appSelect.disabled=!installedApps.length;
    installedApps.forEach(function(a){var opt=node('option',a.name);opt.value=a.id;appSelect.appendChild(opt);});installed.appendChild(appSelect);
    button(installed,'Abrir aplicativo',function(){close();return window.DeckNative.openApp(appSelect.value);},!connected || !installedApps.length);
    phonePage(installed,'apps','Gerenciar apps no celular');phonePage(card('apps','Apps padrão','Escolhas padrão pertencem ao Android e são alteradas na tela do celular.'),'defaults');
    var permissions=card('apps','Permissões e Deck Agent','Conceda permissões manualmente no Android. O Dex não concede acessos automaticamente.');
    var grants=agent.permissions || {};Object.keys(grants).forEach(function(key){if(typeof grants[key]==='boolean')permissions.appendChild(node('p',key+': '+(grants[key]?'autorizado':'não autorizado'),'deck-settings-note'));});
    phonePage(permissions,'permissions','Abrir detalhes do Deck Agent');
    phonePage(card('accounts','Sua conta','O Dex não possui login próprio nem lê senhas ou contas do celular. Gerencie contas nas configurações Android.'),'general','Abrir configurações do celular');
    card('accounts','Outros usuários','Criação e troca de usuários não integradas. Dependem dos recursos e permissões do Android ou do computador.');
    var nav=panel.querySelector('nav'),search=panel.querySelector('#deckSettingsSearch');nav.replaceChildren();search.value='';
    var selected='system', empty=node('p','Nenhuma configuração encontrada.','deck-settings-note');empty.hidden=true;fields.appendChild(empty);
    function normalize(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
    function filter(){
      var query=normalize(search.value.trim()), count=0;
      Array.from(fields.children).forEach(function(section){
        if(section===empty)return;
        var show=section.dataset.category && (query ? normalize(section.textContent).includes(query) : section.dataset.category===selected);
        section.hidden=!show;if(show){count++;section.open=true;}
      });empty.hidden=count>0;
      Array.from(nav.children).forEach(function(b){b.setAttribute('aria-current',!query && b.dataset.category===selected?'page':'false');});
    }
    categories.forEach(function(c){var b=node('button');b.type='button';b.dataset.category=c[0];b.appendChild(node('strong',c[1]+'  '+c[2]));b.appendChild(node('small',c[3]));b.onclick=function(){selected=c[0];search.value='';filter();};nav.appendChild(b);});
    search.oninput=filter;filter();
  }};
})();
