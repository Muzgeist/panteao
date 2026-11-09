/* =====================================================================
   COMPOSIÇÃO CENTRAL · NYX — conteúdo persistente do casco
   ---------------------------------------------------------------------
   Não é janela: sem header, sem título, sem fechar. É o que o casco É.
   • Palco central: UMA View/Engine com a CompositeForm. A Nyx no centro,
     sempre a maior. Quando outro agente está ATIVO (aviso no canto ou
     superfície individual aberta — ver PT.Notify.activeAgents), a forma
     dele se junta a ela NESTE MESMO palco, em escala secundária.
   • Lista de status DINÂMICA: só tem linha para quem tem algo relevante
     agora (ativo, ou pendência real: achados, fila, tarefa). Vazia/oculta
     quando nada acontece. Cada linha tem o próprio botão discreto que abre
     a superfície daquele agente.
   • Lilith: representada no canto do palco (status + chamar/liberar).
   • Telas transversais: menu "Sistema" simples, fora da composição.
   • Chat com a Nyx: igual ao de antes (sem falas pré-escritas).
   ===================================================================== */
'use strict';
(function (PT) {
  const { el, btn, placeholderReply } = PT.UI;
  const SEC = ['cerbero', 'caronte', 'ogum', 'morfeu'];
  const TRANS = [['catalogo', 'Catálogo de Capacidades'], ['limiares', 'Tabela de Limiares'], ['saude', 'Saúde do sistema'], ['cerimonia', 'Cerimônia (andaime)'], ['declaracao', 'Declaração pré-execução']];

  /* relevância de cada um dos quatro (motivo legível, ou null) — fonte única para a lista */
  function relevance(a) {
    const s = PT.Agents.get(a), now = PT.now(), why = [];
    if (PT.Notify.isActive(a)) why.push('aviso');
    if (PT.WM.wins[a]) why.push('superfície aberta');
    if (a === 'cerbero') { if (s.converge) why.push('convergência'); else if (s.findings[0] && now - s.findings[0].at < 180) why.push('achado recente'); }
    if (a === 'caronte' && s.queue.length) why.push(`${s.queue.length} esperando você`);
    if (a === 'ogum') { if (s.phase !== 'ausente') why.push(s.phase === 'aguardando' ? 'aguarda aprovação' : 'convocado'); else if (s.history[0] && now - s.history[0].at < 120) why.push('entregou agora'); }
    return why.length ? why : null;
  }
  /* números por agente (o que era o _kpi dos cards do hub) */
  function kpis(a) {
    const s = PT.Agents.get(a);
    if (a === 'cerbero') return [['achados', s.findings.length], ['risco máx.', Math.round(Math.max(...s.eyes.map(e => e.risk)) * 100) + '%']];
    if (a === 'caronte') return [['fila', s.queue.length], ['filtradas', s.archived], ['retidas', s.held.length]];
    if (a === 'ogum') return [['fase', s.phase], ['tarefas', s.history.length]];
    if (a === 'morfeu') return [['gravações', s.writes]];
    return [];
  }

  function mount(host) {
    const root = el('div', 'comp');
    const stage = el('div', 'comp__stage stage'); stage.dataset.agent = 'nyx';
    const cv = el('canvas'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Nyx no centro; agentes ativos ao lado dela'); stage.appendChild(cv);
    const small = innerWidth < 760;
    const parts = [{ agent: 'nyx', N: small ? 2600 : 4200, primary: true }, { agent: 'cerbero', N: small ? 1100 : 1800 }, { agent: 'caronte', N: small ? 1100 : 1700 }, { agent: 'ogum', N: small ? 1000 : 1600 }, { agent: 'morfeu', N: small ? 500 : 700 }]
      .map(p => ({ ...p, state: PT.Agents.get(p.agent) }));
    const total = parts.reduce((a, p) => a + p.N, 0);
    const view = PT.Stage.add(cv, { agent: 'nyx', N: total, cfg: { stemAlpha: 0, transitAlpha: 0.22 }, dprCap: 1.5, transparent: true, look: { vignette: 0, grain: 0.006 },
      makeForm: () => (comp = new PT.CompositeForm(parts, () => PT.Notify.activeAgents())) });
    let comp = null;
    // rótulos das formas secundárias (clicáveis) — acompanham a posição delas no palco
    const labels = {}; SEC.forEach(a => { const b = el('button', 'comp__tag'); b.type = 'button'; b.dataset.agent = a; b.textContent = PT.MOCK.agents[a].name; b.hidden = true; b.onclick = () => PT.WM.open(a); stage.appendChild(b); labels[a] = b; });
    const follow = () => { requestAnimationFrame(follow); if (!comp || !root.isConnected || host.hidden) return; const eng = view.engine, dpr = eng.view.dpr || 1;
      for (const p of comp.parts) { if (p.primary) continue; const L = labels[p.agent], on = p.status === 'on'; L.hidden = !on; if (!on) continue; const ext = (p.form.extent || [1, 1])[1], [sx, sy] = eng.toScreen(p.cx, p.cy - ext * p.sc - 0.02); L.style.transform = `translate(${sx / dpr}px, ${sy / dpr}px) translate(-50%, 0)`; } };
    requestAnimationFrame(follow);
    // sobreposições do palco
    const menuBtn = btn('≡  Sistema', 'comp__menu'); menuBtn.setAttribute('aria-haspopup', 'menu'); menuBtn.setAttribute('aria-expanded', 'false');
    const menu = el('div', 'menu'); menu.setAttribute('role', 'menu'); menu.hidden = true;
    TRANS.forEach(([id, t]) => { const it = btn(t, 'menu__it', () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); PT.WM.open(id); }); it.setAttribute('role', 'menuitem'); menu.appendChild(it); });
    menu.appendChild(el('div', 'menu__sep')); menu.appendChild(btn('Esconder o painel  ·  Ctrl+Espaço', 'menu__it menu__it--dim', () => { menu.hidden = true; PT.WM.setCasco(false); }));
    menuBtn.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; menuBtn.setAttribute('aria-expanded', String(!menu.hidden)); };
    document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } });
    const nyxSeal = el('div', 'comp__seal'); nyxSeal.appendChild(PT.Seals.presence('nyx', 'compact'));
    const off = el('div', 'nyx__off'); off.hidden = true;
    off.append(el('b', '', 'Nyx indisponível (simulado)'), el('span', '', 'Repasses via Nyx caem para "direto". O canal do Cérbero segue independente.'), btn('Abrir Cérbero', 'btn--sm', () => PT.WM.open('cerbero')));
    stage.append(menuBtn, menu, PT.Lilith.chip(), nyxSeal, off);
    // lista dinâmica
    const list = el('div', 'comp__list'); list.setAttribute('aria-label', 'Agentes com algo relevante agora'); list.hidden = true;
    const rows = {};
    const paintList = () => {
      let any = false;
      SEC.forEach(a => {
        const why = relevance(a);
        if (!why) { if (rows[a]) { rows[a].remove(); delete rows[a]; } return; }
        any = true;
        if (!rows[a]) { const r = el('div', 'row-st'); r.dataset.agent = a; r._g = el('i', 'row-st__g'); r._n = el('b', 'row-st__n', PT.MOCK.agents[a].name); r._p = PT.Seals.presence(a, 'compact'); r._k = el('span', 'row-st__k'); r._w = el('span', 'row-st__w');
          r._b = btn('abrir', 'row-st__b', () => PT.WM.open(a)); r._b.title = 'Abrir a superfície de ' + PT.MOCK.agents[a].name;
          r._x = el('div', 'row-st__x'); r.append(r._g, r._n, r._p, r._k, r._w, r._b, r._x); rows[a] = r; list.appendChild(r); }
        const r = rows[a]; r._w.textContent = why.join(' · ');
        r._k.replaceChildren(...kpis(a).map(([k, v]) => { const d = el('span', 'kv'); d.append(el('small', '', k), el('b', '', String(v))); return d; }));
        r._b.textContent = PT.WM.wins[a] ? 'aberta' : 'abrir'; r._b.disabled = !!PT.WM.wins[a];
        // com o casco aberto, o aviso direto (cartão do canto) vive aqui, na linha do agente
        const slot = PT.Notify.Dock.slots[a], ev = slot && slot.level === 'on' ? slot.evt : null;
        if (ev !== r._ev) { r._ev = ev; r._x.replaceChildren(); r._x.hidden = !ev;
          if (ev) { r._x.append(PT.Seals.threshold(ev.thr || 1, 'compact'), el('b', '', ev.title), el('span', 'muted', ev.body ? ' — ' + ev.body : ''), el('code', 'row-st__r', 'rota: ' + slot.info.route));
            if (ev.action) r._x.append(btn(ev.action.label, 'btn--sm btn--acc', () => { ev.action.run(); PT.Notify.Dock.dismiss(a); }));
            r._x.append(btn('dispensar', 'btn--sm btn--ghost', () => PT.Notify.Dock.dismiss(a))); } }
      });
      list.hidden = !any;
    };
    // chat
    const chat = el('div', 'chat'); chat.setAttribute('aria-live', 'polite');
    chat.appendChild(el('div', 'chat__note', 'Chat simulado. Nenhuma fala é escrita de antemão: onde a Nyx responderia, aparece o marcador de integração.'));
    const chips = el('div', 'chips');
    chips.append(btn('Convocar Ogum…', 'chip', () => PT.WM.open('ogum')), btn('Falar com Cérbero (raro)', 'chip', () => PT.WM.open('cerbero')));
    const form = el('form', 'chat__in'), ta = el('textarea'); ta.rows = 1; ta.placeholder = 'Fale com a Nyx…'; ta.setAttribute('aria-label', 'Mensagem para a Nyx');
    const send = btn('Enviar', 'btn--acc'); send.type = 'submit'; form.append(ta, send);
    const talk = el('div', 'comp__talk'); talk.append(chat, chips, form);
    root.append(stage, list, talk); host.appendChild(root);

    const N = PT.Agents.get('nyx'), scroll = () => { chat.scrollTop = chat.scrollHeight; };
    const addRelay = r => {
      const c = el('div', 'msg msg--relay'); c.dataset.agent = r.agent;
      const h = el('div', 'msg__rh'); h.append(el('span', 'msg__who', `Repasse · ${PT.MOCK.agents[r.agent].name}`), PT.Seals.threshold(r.thr || 1, 'compact'));
      c.append(h, el('div', 'msg__t', r.title), el('div', 'msg__b', r.body || ''), el('div', 'msg__why', 'rota: ' + (r.why || '')));
      const a = el('div', 'row'); a.append(btn('Abrir ' + PT.MOCK.agents[r.agent].name, 'btn--sm', () => PT.WM.open(r.agent)));
      if (r.action) a.append(btn(r.action.label, 'btn--sm btn--acc', () => r.action.run()));
      c.appendChild(a); chat.appendChild(c); scroll();
    };
    const flush = () => { if (!PT.WM.cascoOpen() || !N.inbox.length) return; N.inbox.slice().reverse().forEach(addRelay); N.inbox.length = 0; N.dustSeq = (N.dustSeq || 0) + 1; PT.Seals.refresh('nyx'); };
    PT.bus.on('nyx:relay', flush); PT.bus.on('casco', o => { if (o) flush(); });
    form.addEventListener('submit', e => {
      e.preventDefault(); const v = ta.value.trim(); if (!v) return;
      const m = el('div', 'msg msg--user'); m.textContent = v; chat.appendChild(m); ta.value = ''; scroll();
      if (!N.available) { chat.appendChild(el('div', 'chat__note', 'Sem resposta: Nyx indisponível (simulado).')); scroll(); return; }
      PT.Agents.nyxProcess(2.2);   // asas abrem, pulsos mais frequentes
      const wait = el('div', 'msg msg--agent msg--wait'); wait.dataset.agent = 'nyx'; wait.append(el('span', 'msg__who', 'Nyx'), el('span', 'dots', '')); chat.appendChild(wait); scroll();
      setTimeout(() => { wait.replaceWith(placeholderReply('nyx')); N.dustSeq = (N.dustSeq || 0) + 1; scroll(); }, 2000);   // resposta significativa → poeira de estrela
    });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    const sync = () => { off.hidden = N.available; root.classList.toggle('is-off', !N.available); };
    PT.bus.on('state', e => { if (!e || e.id === 'nyx') sync(); paintList(); });
    ['tick', 'notify', 'wm', 'dock'].forEach(ev => PT.bus.on(ev, paintList));
    const ro = new ResizeObserver(() => root.classList.toggle('is-narrow', root.clientWidth < 900)); ro.observe(root);
    sync(); paintList(); flush();
    return { root, view, get comp() { return comp; }, paintList };
  }
  PT.Composition = { mount, relevance };
})(window.PT);
