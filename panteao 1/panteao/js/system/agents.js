/* =====================================================================
   PANTEÃO · RUNTIME SIMULADO DOS AGENTES
   ---------------------------------------------------------------------
   Todo agente roda continuamente aqui, com o painel aberto ou fechado.
   O painel é só uma janela de consulta: nenhuma existência depende dele.
   MOCK: os "eventos do mundo" abaixo são sorteados. INTEGRAÇÃO FUTURA:
   • Nyx      → modelo de linguagem + estado de contexto do usuário
   • Cérbero  → leitura real de registros/processos/rede (canal próprio,
                independente da Nyx e do painel)
   • Caronte  → conectores de e-mail/mensagens/redes
   • Ogum     → executor de tarefas (shell/CI) sob a Tabela de Limiares
   • Morfeu   → armazenamento de memória compartilhada
   • Lilith   → ponte com o processo dela (lilith_corpo.html roda à parte)
   ===================================================================== */
'use strict';
(function (PT) {
  const M = PT.MOCK, now = () => PT.now();
  const pick = a => a[(Math.random() * a.length) | 0];

  /* barramento mínimo de eventos */
  const handlers = {};
  PT.bus = {
    on(ev, fn) { (handlers[ev] = handlers[ev] || new Set()).add(fn); return () => handlers[ev].delete(fn); },
    emit(ev, data) { (handlers[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
  };

  const S = {
    nyx: { id: 'nyx', available: true, processing: 0.12, attention: { level: 0, angle: 0.6 }, lastBeat: 0, relays: 0, inbox: [], engagedUntil: 0, dustSeq: 0 },
    cerbero: { id: 'cerbero', eyes: [0, 1, 2].map(k => ({ risk: 0.02, label: M.cerberoChecks[k * 3], since: 0 })), converge: false, alert: 0, findings: [], convergeUntil: 0, checks: 0, nyxSilentFor: 0 },
    caronte: { id: 'caronte', channels: M.channels.map(c => ({ ...c, seen: 0 })), queue: [], held: [], archived: 0, pending: 0, dropSeq: 0, arrivalSeq: 0, lastArrival: null },
    ogum: { id: 'ogum', phase: 'ausente', task: null, progress: 0, phaseAt: 0, lastMark: { x: 0.12, y: 0.08, dx: 0.8, dy: 0.6, seg: 5, at: -720 }, lastAt: -720, lastTask: 'Gerar script de backup', history: [] },
    morfeu: { id: 'morfeu', layers: { vinculo: 46, processual: 128, autoavaliacao: 31, biblioteca: 312 }, lastWrite: null, writes: 0, log: [] },
    lilith: { id: 'lilith', where: M.lilithWhere[1], doing: M.lilithDoing[0], mood: M.lilithMood[0], summon: 'livre', since: 0 }
  };

  const Agents = {
    state: S,
    get(id) { return S[id]; },
    /* atividade ESPECÍFICA ao vivo (alimenta o selo de presença) */
    activity(id) {
      const s = S[id];
      switch (id) {
        case 'nyx': return !s.available ? 'indisponível (simulado) — o canal do Cérbero segue ativo' : s.processing > 0.5 ? 'processando um pedido' : s.attention.level > 0.3 ? 'apontando algo que precisa de você' : `ouvindo · ${s.inbox.length ? s.inbox.length + ' repasse(s) não lido(s)' : 'nada pendente'}`;
        case 'cerbero': { if (s.converge) return 'três leituras convergiram — achado real'; const e = s.eyes; return `verificando: ${e[0].label} · ${e[1].label} · ${e[2].label}`; }
        case 'caronte': { const w = s.queue.filter(m => m.imp >= 0.6).length; return `monitorando ${s.channels.length} canais · ${s.queue.length} na fila${w ? ` · ${w} esperando você` : ''} · ${s.archived} filtradas`; }
        case 'ogum': { if (s.phase === 'ausente') return `ausente · última forja ${ago(now() - s.lastAt)} (${s.lastTask})`; if (s.phase === 'aguardando') return `aguardando sua aprovação: ${s.task.label}`; if (s.phase === 'trabalhando') return `${s.task.verb} · ${Math.round(s.progress * 100)}%`; return `${s.phase}${s.task ? ' · ' + s.task.label : ''}`; }
        case 'morfeu': { const n = Object.values(s.layers).reduce((a, b) => a + b, 0); return `${n.toLocaleString('pt-BR')} registros · última gravação ${s.lastWrite ? ago(now() - s.lastWrite.at) + ' (' + s.lastWrite.layer + ')' : '—'}`; }
        case 'lilith': return s.summon === 'livre' ? `${s.where} · ${s.doing}` : s.summon === 'a caminho' ? 'atravessando até o painel…' : 'no painel, ao seu lado';
      }
      return '';
    },
    /* --- ações simuladas --- */
    setNyxAvailable(v) { S.nyx.available = !!v; PT.bus.emit('state', { id: 'nyx' }); },
    nyxProcess(sec = 3) { S.nyx.processing = 1; S.nyx.procUntil = now() + sec; S.nyx.engagedUntil = now() + sec + 8; PT.bus.emit('state', { id: 'nyx' }); },   // engajada → asas abertas
    nyxAttend(angle, sec = 8) { S.nyx.attention = { level: 1, angle }; S.nyx.attUntil = now() + sec; PT.bus.emit('state', { id: 'nyx' }); },
    cerberoConverge(sec = 7, label) { const c = S.cerbero; c.converge = true; c.convergeUntil = now() + sec; c.eyes.forEach(e => { e.label = label || 'mesmo alvo'; e.risk = 0.95; }); PT.bus.emit('state', { id: 'cerbero' }); },
    cerberoFinding(f) { S.cerbero.findings.unshift({ ...f, at: now() }); S.cerbero.findings.length = Math.min(S.cerbero.findings.length, 30); PT.bus.emit('state', { id: 'cerbero' }); },
    caronteIncoming(msg) { const c = S.caronte, m = { ...msg, id: Math.random().toString(36).slice(2, 8), at: now() };
      c.arrivalSeq++; c.lastArrival = { imp: m.imp, seq: c.arrivalSeq };   // a forma carrega a mensagem pela água guiada
      c.channels.find(x => x.id === m.ch).seen++;
      if (m.imp < 0.35) { c.archived++; morfeuWrite('vinculo', false); }   // trivial: filtrado sem incomodar
      else c.queue.unshift(m);
      recalcPending(); PT.bus.emit('state', { id: 'caronte' }); return m; },
    caronteResolve(id, how) { const c = S.caronte, i = c.queue.findIndex(m => m.id === id); if (i < 0) return; const [m] = c.queue.splice(i, 1); if (how === 'segurar') c.held.push(m); recalcPending(); PT.bus.emit('state', { id: 'caronte' }); },
    caronteDrop() { S.caronte.dropSeq++; PT.bus.emit('state', { id: 'caronte' }); },
    /* Ogum: Invocado — chega, (aguarda declaração se o selo exigir), trabalha, entrega, se ausenta */
    ogumInvoke(task) { const o = S.ogum; if (o.phase !== 'ausente') return false; o.task = task; o.progress = 0; setPhase('chegando'); return true; },
    ogumApprove(ok) { const o = S.ogum; if (o.phase !== 'aguardando') return; if (ok) setPhase('trabalhando'); else { o.history.unshift({ task: o.task.label, result: 'recusada pelo usuário', at: now() }); setPhase('saindo'); } },
    lilithSummon() { const l = S.lilith; if (l.summon !== 'livre') return; l.summon = 'a caminho'; l.since = now();
      /* INTEGRAÇÃO FUTURA: avisar o processo da Lilith (lilith_corpo.html) — ex.: Lili.travelTo(xPainel, yPainel, 'portal') via IPC/postMessage */
      PT.bus.emit('state', { id: 'lilith' }); },
    lilithRelease() { S.lilith.summon = 'livre'; S.lilith.where = pick(M.lilithWhere); PT.bus.emit('state', { id: 'lilith' }); }
  };
  function ago(s) { s = Math.max(0, s); if (s < 60) return `há ${Math.round(s)} s`; if (s < 3600) return `há ${Math.round(s / 60)} min`; return `há ${Math.round(s / 3600)} h`; }
  Agents.ago = ago;
  function recalcPending() { const q = S.caronte.queue; S.caronte.pending = q.length ? Math.max(...q.map(m => m.imp)) * Math.min(1, 0.6 + q.length * 0.1) : 0; }
  function morfeuWrite(layer, emit = true) { const m = S.morfeu; m.layers[layer]++; m.writes++; m.lastWrite = { layer, at: now(), seq: m.writes }; m.log.unshift({ layer, at: now() }); m.log.length = Math.min(m.log.length, 40); if (emit) PT.bus.emit('state', { id: 'morfeu' }); }
  Agents.morfeuWrite = morfeuWrite;
  function setPhase(p) { const o = S.ogum; o.phase = p; o.phaseAt = now(); PT.bus.emit('state', { id: 'ogum' }); PT.bus.emit('ogum:phase', p); }

  /* ---------- vida de fundo (1 Hz) — MOCK ---------- */
  let nextMsg = 6, nextWrite = 3, nextLili = 18;
  function tick() {
    const t = now(), N = S.nyx, C = S.cerbero, O = S.ogum;
    // Nyx: batimento (o Cérbero vigia até ela)
    if (N.available) N.lastBeat = t;
    if (N.procUntil && t > N.procUntil) { N.processing = 0.12; N.procUntil = 0; }
    if (N.attUntil && t > N.attUntil) { N.attention = { level: 0, angle: N.attention.angle }; N.attUntil = 0; }
    // Cérbero: cada olho troca de leitura em momentos diferentes, nunca a mesma coisa que os outros
    if (C.converge && t > C.convergeUntil) { C.converge = false; C.eyes.forEach(e => e.risk = 0.05); }
    if (!C.converge) C.eyes.forEach((e, k) => {
      if (t - e.since > 3 + k * 1.3 + Math.random() * 3) { const used = C.eyes.map(x => x.label); let l; do { l = pick(M.cerberoChecks); } while (used.includes(l)); e.label = l; e.since = t; e.risk = Math.random() < 0.08 ? 0.3 + Math.random() * 0.15 : Math.random() * 0.1; C.checks++; }
      else e.risk *= 0.94;
    });
    C.nyxSilentFor = t - N.lastBeat;
    if (!N.available && C.nyxSilentFor > 4 && !C._nyxFlag) { C._nyxFlag = true; C.eyes[0].label = 'Nyx · batimento do canal'; C.eyes[0].risk = 0.55; Agents.cerberoFinding({ thr: 4, title: 'Nyx sem batimento', body: `Canal da Nyx sem resposta há ${Math.round(C.nyxSilentFor)} s. O canal do Cérbero segue independente.` }); PT.bus.emit('cerbero:nyx-silent'); }
    if (N.available) C._nyxFlag = false;
    C.alert = Math.max(...C.eyes.map(e => e.risk)) > 0.5 ? 0.6 : 0;
    // Caronte: o mundo de fora chegando (quase tudo trivial; ele filtra sem vazar estresse)
    if ((nextMsg -= 1) <= 0) { Agents.caronteIncoming(pick(M.inbound)); nextMsg = 6 + Math.random() * 9; }
    // Morfeu: gravações de fundo
    if ((nextWrite -= 1) <= 0) { morfeuWrite(pick(['vinculo', 'processual', 'autoavaliacao', 'biblioteca'])); nextWrite = 4 + Math.random() * 6; }
    // Ogum: máquina de fases (só existe enquanto convocado)
    const dtP = t - O.phaseAt;
    if (O.phase === 'chegando' && dtP > 2.4) setPhase(O.task.thr >= 4 ? 'aguardando' : 'trabalhando');
    else if (O.phase === 'trabalhando') { O.progress = Math.min(1, O.progress + 0.035 + Math.random() * 0.03); if (O.progress >= 1) setPhase('entregando'); }
    else if (O.phase === 'entregando' && dtP > 2.2) { O.history.unshift({ task: O.task.label, result: 'entregue', at: t }); O.lastTask = O.task.label; morfeuWrite('processual'); PT.bus.emit('ogum:entregue', O.task); setPhase('saindo'); }
    else if (O.phase === 'saindo' && dtP > 2.0) { O.lastMark = { ...(O.lastMark || {}), at: now() }; O.lastAt = now(); O.task = null; setPhase('ausente'); }
    // Lilith (só o status que chega dela; o corpo vive em lilith_corpo.html)
    const L = S.lilith;
    if (L.summon === 'a caminho' && t - L.since > 2.6) { L.summon = 'no painel'; PT.bus.emit('state', { id: 'lilith' }); }
    if ((nextLili -= 1) <= 0 && L.summon === 'livre') { L.where = pick(M.lilithWhere); L.doing = pick(M.lilithDoing); if (Math.random() < 0.5) L.mood = pick(M.lilithMood); nextLili = 15 + Math.random() * 20; PT.bus.emit('state', { id: 'lilith' }); }
    PT.bus.emit('tick', t);
  }
  Agents.start = () => { tick(); setInterval(tick, 1000); };
  PT.Agents = Agents;
})(window.PT);
