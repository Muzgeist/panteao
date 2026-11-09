/* =====================================================================
   PANTEÃO · NOTIFICAÇÃO = a própria identidade visual do agente
   ---------------------------------------------------------------------
   Não existe sistema de aviso separado nem ícone de bandeja genérico:
   quando um agente precisa de atenção, a FORMA ABSTRATA dele aparece no
   canto da tela (uma instância do motor), com o selo de limiar. O mesmo
   mecanismo, em intensidade quase imperceptível, é a presença ambiente de
   quem vigia em silêncio (Cérbero, Caronte).
   O canto (dock) vive FORA do casco: funciona com o painel fechado.

   Rotas são situacionais, nunca fixas. Três caminhos disponíveis como
   capacidade — qualquer evento escolhe:
     'direto'  → a forma do próprio agente aparece no canto
     'via-nyx' → a Nyx avisa em nome dele (janela dela, ou a constelação
                 dela no canto se a janela estiver fechada)
     'ambos'   → os dois ao mesmo tempo
     'auto'    → decide por contexto/urgência no momento (chooseRoute)
   ===================================================================== */
'use strict';
(function (PT) {
  const el = (t, c, x) => PT.Seals.el(t, c, x);
  const ANG = { cerbero: 2.5, caronte: 3.2, ogum: -2.4, morfeu: -1.2, lilith: 0.6, nyx: 1.57 };   // direção para onde a Nyx "aponta" (adensa) ao repassar

  /* decisão por contexto — devolve a rota e o PORQUÊ (transparência) */
  function chooseRoute(evt) {
    const nyxOk = PT.Agents.get('nyx').available, nyxOpen = PT.WM && PT.WM.cascoOpen(), thr = evt.thr || 1, urg = evt.urgency ?? 0.5;
    let r = evt.route || 'auto', why = '';
    if (r !== 'auto') {
      if ((r === 'via-nyx' || r === 'ambos') && !nyxOk) return { route: 'direto', why: `pedida "${r}", mas a Nyx está indisponível → direto` };
      if (evt.agent === 'nyx' && r !== 'direto') return { route: 'direto', why: 'a própria Nyx avisando → direto' };
      return { route: r, why: 'rota escolhida pelo evento' };
    }
    if (evt.agent === 'nyx') return { route: 'direto', why: 'é a própria Nyx' };
    if (thr >= 5) { r = nyxOk ? 'ambos' : 'direto'; why = 'prioridade máxima: nunca represado' + (nyxOk ? ' → todas as rotas' : ' (Nyx indisponível)'); }
    else if (evt.agent === 'cerbero' && (evt.aboutNyx || !nyxOk)) { r = 'direto'; why = 'Cérbero sobre a Nyx / Nyx fora: canal independente'; }
    else if (!nyxOk) { r = 'direto'; why = 'Nyx indisponível'; }
    else if (nyxOpen && urg < 0.85) { r = 'via-nyx'; why = 'você está com o painel (Nyx) aberto: ela repassa'; }
    else if (urg >= 0.75) { r = 'ambos'; why = 'urgente: direto e pela Nyx'; }
    else if (urg < 0.4) { r = 'via-nyx'; why = 'baixa urgência: a Nyx agrupa e repassa'; }
    else { r = 'direto'; why = 'urgência média, Nyx fechada: direto'; }
    return { route: r, why };
  }

  /* ---------- dock no canto ---------- */
  const SIZE_AMB = 92, SIZE_ON = 176;
  const Dock = {
    root: null, slots: {},
    init() {
      this.root = document.getElementById('dock');
      // presença ambiente mínima dos vigilantes passivos
      this.slot('caronte').setLevel('ambient');
      this.slot('cerbero').setLevel('ambient');
      PT.bus.on('tick', () => this.ambientTick());
    },
    slot(agent) {
      if (this.slots[agent]) return this.slots[agent];
      const s = el('div', 'dock-slot'); s.dataset.agent = agent;
      const form = el('button', 'dock-form'); form.type = 'button'; form.setAttribute('aria-label', 'Abrir superfície: ' + PT.MOCK.agents[agent].name);
      const cv = el('canvas'); form.appendChild(cv);
      const card = el('div', 'dock-card'); card.hidden = true;
      s.append(card, form); this.root.appendChild(s);
      const N = agent === 'cerbero' ? 2400 : 1800;
      const view = PT.Stage.add(cv, { agent, N, transparent: true, dprCap: 1.5, presence: 0.35, look: { vignette: 0, grain: 0.004 } });
      form.addEventListener('click', () => PT.WM.open(agent));
      const slot = { agent, el: s, form, card, view, level: 'off', events: [],
        setLevel: lv => {
          slot.level = lv; s.dataset.level = lv;
          const px = lv === 'on' ? SIZE_ON : lv === 'ambient' ? SIZE_AMB : 0;
          form.style.width = form.style.height = px + 'px';
          view.fade = lv === 'on' ? 1 : lv === 'ambient' ? 0.22 : 0;
          view.every = lv === 'on' ? 1 : 2;
          s.hidden = lv === 'off';
        } };
      this.slots[agent] = slot; slot.setLevel('off');
      return slot;
    },
    /* mostra uma notificação direta: a forma do agente cresce no canto + cartão */
    show(evt, routeInfo) {
      const slot = this.slot(evt.agent); slot.setLevel('on'); slot.evt = evt; slot.info = routeInfo;
      const c = slot.card; c.hidden = false; c.innerHTML = '';
      const head = el('div', 'dock-card__h'); head.append(el('b', '', PT.MOCK.agents[evt.agent].name), PT.Seals.threshold(evt.thr || 1, 'compact'));
      const title = el('div', 'dock-card__t', evt.title), body = el('div', 'dock-card__b', evt.body || '');
      const route = el('div', 'dock-card__r', `rota: ${routeInfo.route} — ${routeInfo.why}`);
      const acts = el('div', 'dock-card__a');
      const open = el('button', 'btn btn--sm', 'Abrir ' + PT.MOCK.agents[evt.agent].name); open.onclick = () => { PT.WM.open(evt.agent); this.dismiss(evt.agent); };
      const dis = el('button', 'btn btn--sm btn--ghost', 'Dispensar'); dis.onclick = () => this.dismiss(evt.agent);
      acts.append(open);
      if (evt.action) { const a = el('button', 'btn btn--sm btn--acc', evt.action.label); a.onclick = () => { evt.action.run(); this.dismiss(evt.agent); }; acts.append(a); }
      acts.append(dis);
      c.append(head, title, body, route, acts);
      clearTimeout(slot.tm);
      if ((evt.thr || 1) <= 3) slot.tm = setTimeout(() => this.dismiss(evt.agent), 16000);   // limiares 4–5 ficam até você tratar
      PT.bus.emit('dock', { agent: evt.agent, on: true });
    },
    dismiss(agent) {
      const slot = this.slots[agent]; if (!slot) return; slot.card.hidden = true; clearTimeout(slot.tm); slot.evt = null;
      slot.setLevel(agent === 'cerbero' || agent === 'caronte' ? 'ambient' : 'off');
      PT.bus.emit('dock', { agent, on: false });
    },
    ambientTick() {
      // o vigilante passivo ganha um fio a mais de presença quando há algo sob a superfície (sem virar aviso)
      const c = this.slots.caronte, q = PT.Agents.get('caronte');
      if (c && c.level === 'ambient') c.view.fade = 0.18 + 0.18 * q.pending;
      const k = this.slots.cerbero, ce = PT.Agents.get('cerbero');
      if (k && k.level === 'ambient') k.view.fade = 0.14 + 0.3 * Math.min(1, ce.alert + Math.max(...ce.eyes.map(e => e.risk)) * 0.5);
    }
  };

  /* ---------- envio ---------- */
  const log = [];
  function send(evt) {
    const info = chooseRoute(evt);
    log.unshift({ ...evt, route: info.route, why: info.why, at: PT.now() }); log.length = Math.min(log.length, 50);
    // a forma reage como parte do aviso (é identidade, não enfeite)
    if (evt.agent === 'caronte' && (evt.thr >= 4 || evt.urgency >= 0.75)) PT.Agents.caronteDrop();
    if (evt.agent === 'cerbero' && evt.converge) PT.Agents.cerberoConverge(8, evt.title);
    if (info.route === 'direto' || info.route === 'ambos') Dock.show(evt, info);
    if (info.route === 'via-nyx' || info.route === 'ambos') viaNyx(evt, info);
    PT.bus.emit('notify', { evt, info });
    return info;
  }
  /* a Nyx avisa em nome do agente: repasse na janela dela; se fechada, a constelação dela no canto adensa na direção do assunto */
  function viaNyx(evt, info) {
    const N = PT.Agents.get('nyx');
    N.inbox.unshift({ ...evt, why: info.why, at: PT.now() });
    PT.Agents.nyxAttend(ANG[evt.agent] ?? 0.6, 10); PT.Agents.nyxProcess(1.5);
    if (!PT.WM.cascoOpen()) Dock.show({ ...evt, agent: 'nyx', title: `Repasse de ${PT.MOCK.agents[evt.agent].name}: ${evt.title}`, action: evt.action }, info);
    PT.bus.emit('nyx:relay', evt);
  }
  /* "ativo" = o mesmo gatilho do aviso no canto, OU a superfície individual aberta agora.
     (+ presença real que já é um evento: Ogum convocado, Cérbero em convergência) */
  function isActive(a) { const s = Dock.slots[a]; return !!(s && s.level === 'on'); }
  function activeAgents() {
    return ['cerbero', 'caronte', 'ogum', 'morfeu'].filter(a => isActive(a) || (PT.WM && PT.WM.wins[a] && PT.WM.isOpen(a)) || (a === 'ogum' && PT.Agents.get('ogum').phase !== 'ausente') || (a === 'cerbero' && PT.Agents.get('cerbero').converge));
  }
  PT.Notify = { send, chooseRoute, Dock, log, isActive, activeAgents, ROUTES: ['auto', 'direto', 'via-nyx', 'ambos'] };
})(window.PT);
