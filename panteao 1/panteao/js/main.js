/* =====================================================================
   PANTEÃO · boot + simulador de eventos (MOCK)
   O simulador substitui o mundo real nesta fase: cada botão dispara um
   evento como se viesse de um canal/sensor de verdade. A rota escolhida
   no seletor vale para os próximos avisos ("auto" decide por contexto).
   ===================================================================== */
'use strict';
(function (PT) {
  const { el, btn } = PT.UI, $ = s => document.querySelector(s), pick = a => a[(Math.random() * a.length) | 0];
  let route = 'auto';
  const send = evt => PT.Notify.send({ route, ...evt });

  function boot() {
    PT.Stage.init(); PT.Agents.start(); PT.WM.init(); PT.Notify.Dock.init();
    // casco
    $('#launcher').onclick = () => PT.WM.toggleCasco();
    PT.bus.on('casco', o => { $('#launcher').setAttribute('aria-pressed', String(o)); $('#launcher .lbl').textContent = o ? 'Esconder o painel' : 'Abrir o painel'; });
    addEventListener('keydown', e => {
      if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); PT.WM.toggleCasco(); }
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); PT.WM.open('cerbero'); }
    });
    // avisos que nascem do próprio runtime
    PT.bus.on('cerbero:nyx-silent', () => PT.Notify.send({ agent: 'cerbero', thr: 4, urgency: 0.8, aboutNyx: true, route: 'auto', title: 'Nyx sem batimento', body: 'O canal da Nyx parou de responder. Este canal segue independente.' }));
    PT.bus.on('ogum:phase', p => { const o = PT.Agents.get('ogum'); if (p === 'aguardando') send({ agent: 'ogum', thr: o.task.thr, urgency: 0.7, title: 'Aprovação necessária', body: o.task.label, action: { label: 'Revisar declaração', run: () => PT.WM.open('ogum') } }); });
    PT.bus.on('ogum:entregue', t => send({ agent: 'ogum', thr: 2, urgency: 0.35, title: 'Entregue: ' + t.label, body: 'Ogum se ausenta até a próxima convocação.' }));
    // relógio e Lilith na barra de cima
    const clock = () => { $('#clock').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); const L = PT.Agents.get('lilith'); const c = $('#lili-chip'); c.hidden = L.summon === 'livre'; c.textContent = L.summon === 'a caminho' ? '♡ Lilith atravessando até o painel…' : '♡ Lilith está no painel (corpo em lilith_corpo.html)'; };
    clock(); PT.bus.on('tick', clock); PT.bus.on('state', e => { if (e && e.id === 'lilith') clock(); });
    buildSim();
    // abre com o casco aberto para a primeira visita: a composição da Nyx é o próprio casco
    PT.WM.setCasco(true);
    window.Panteao = { PT, open: id => PT.WM.open(id), notify: e => PT.Notify.send(e), route: r => (route = r) };   // API de console
  }

  function buildSim() {
    const S = $('#sim'), body = $('#sim .sim__b');
    $('#sim .sim__t').onclick = () => S.classList.toggle('is-closed');
    S.classList.add('is-closed');   // ferramenta de desenvolvimento: começa recolhida, na barra de cima
    const grp = (title, ...items) => { const g = el('div', 'sim__g'); g.appendChild(el('h4', '', title)); const r = el('div', 'sim__r'); items.forEach(i => r.appendChild(i)); g.appendChild(r); body.appendChild(g); return g; };
    // rota
    const rs = el('div', 'seg'); PT.Notify.ROUTES.forEach(r => { const b = btn({ auto: 'auto', direto: 'direto', 'via-nyx': 'via Nyx', ambos: 'ambos' }[r], 'seg__b', () => { route = r; rs.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }); b.setAttribute('aria-pressed', String(r === 'auto')); rs.appendChild(b); });
    grp('Rota do próximo aviso', rs);
    grp('Caronte',
      btn('Mensagem trivial', 'sb', () => PT.Agents.caronteIncoming(pick(PT.MOCK.inbound))),
      btn('Mensagem importante', 'sb', () => { const m = PT.Agents.caronteIncoming(pick(PT.MOCK.important)); send({ agent: 'caronte', thr: 3, urgency: 0.85, title: m.subj, body: `${m.from} · ${PT.MOCK.channels.find(c => c.id === m.ch).name}`, action: { label: 'Ver fila', run: () => PT.WM.open('caronte') } }); }));
    grp('Cérbero',
      btn('Anomalia leve', 'sb', () => { const c = PT.Agents.get('cerbero'); c.eyes[1].risk = 0.42; PT.Agents.cerberoFinding({ thr: 2, title: 'Processo novo sem assinatura', body: 'Registrado. Reavaliado por outra leitura em seguida.' }); send({ agent: 'cerbero', thr: 2, urgency: 0.3, title: 'Processo novo sem assinatura', body: 'Registrado; nenhuma ação necessária.' }); }),
      btn('Detecção real · convergência', 'sb', () => { PT.Agents.cerberoFinding({ thr: 4, title: 'Conexão de saída não declarada', body: 'Três leituras independentes concordam.' }); send({ agent: 'cerbero', thr: 4, urgency: 0.9, converge: true, title: 'Conexão de saída não declarada', body: 'Três leituras independentes concordam. Sugere isolar.', action: { label: 'Isolar conexão', run: async () => { const ok = await PT.Declaration.open({ agent: 'cerbero', action: 'Isolar conexão de saída suspeita', thr: 4, risk: 'comum', kind: 'migra', classification: 'Bloqueio local, reversível.' }); if (ok) PT.Agents.cerberoFinding({ thr: 2, title: 'Conexão isolada', body: 'Aprovado por você.' }); } } }); }),
      btn('Prioridade máxima', 'sb sb--hot', () => { PT.Agents.cerberoFinding({ thr: 5, title: 'Credencial exposta em texto claro', body: 'Nunca represado: chega por todas as rotas.' }); send({ agent: 'cerbero', thr: 5, urgency: 1, converge: true, route: route === 'auto' ? 'auto' : route, title: 'Credencial exposta em texto claro', body: 'Encontrada num arquivo do projeto. Revogar agora.' }); }));
    grp('Ogum',
      btn('Convocar · compilar', 'sb', () => { PT.Agents.ogumInvoke(PT.MOCK.ogumTasks[0]); }),
      btn('Convocar · migrar banco', 'sb', () => { PT.Agents.ogumInvoke(PT.MOCK.ogumTasks[1]); }),
      btn('Convocar · produção (crítico)', 'sb', () => { PT.Agents.ogumInvoke(PT.MOCK.ogumTasks[2]); }));
    const av = el('label', 'sw'), cb = el('input'); cb.type = 'checkbox'; cb.checked = true; av.append(cb, document.createTextNode(' Nyx disponível'));
    cb.onchange = () => PT.Agents.setNyxAvailable(cb.checked);
    grp('Nyx', av,
      btn('Processar pedido', 'sb', () => PT.Agents.nyxProcess(4)),
      btn('Aviso da própria Nyx', 'sb', () => send({ agent: 'nyx', thr: 1, urgency: 0.5, title: 'Pendência para amanhã (exemplo)', body: 'Item de continuidade marcado mais cedo.' })));
    grp('Casco e canais',
      btn('Abrir/fechar casco', 'sb', () => PT.WM.toggleCasco()),
      btn('Abrir Cérbero direto', 'sb', () => PT.WM.open('cerbero')),
      btn('Chamar a Lilith', 'sb', () => PT.Agents.lilithSummon()));
    body.appendChild(el('p', 'sim__n', 'Ctrl+Espaço abre/fecha o casco · Ctrl+Shift+C abre o Cérbero (canal próprio). Console: Panteao.notify({agent, thr, urgency, route, title}).'));
  }
  document.addEventListener('DOMContentLoaded', boot);
})(window.PT);
