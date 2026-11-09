/* =====================================================================
   TELAS TRANSVERSAIS (menu "Sistema" da composição; não pertencem a nenhum agente)
   Catálogo de Capacidades · Tabela de Limiares (editor) · Saúde do sistema
   · Cerimônia (andaime) · Declaração pré-execução (demonstração)
   ===================================================================== */
'use strict';
(function (PT) {
  const { el, section, btn } = PT.UI;
  const NAME = a => PT.MOCK.agents[a].name;

  PT.Surfaces.catalogo = {
    title: 'Catálogo de Capacidades', w: 600,
    mount(body) {
      body.classList.add('pad');
      const f = el('div', 'chips'); let flt = 'todos';
      const tb = el('table', 'tbl tbl--wide');
      const paint = () => { tb.innerHTML = ''; const hr = el('tr'); ['agente', 'capacidade', 'limiar'].forEach(h => hr.appendChild(el('th', '', h))); tb.appendChild(hr);
        PT.MOCK.capabilities.filter(c => flt === 'todos' || c.agent === flt).forEach(c => { const tr = el('tr'); tr.dataset.agent = c.agent; const td = el('td'); td.appendChild(PT.Seals.threshold(c.thr)); tr.append(el('td', 'ag', NAME(c.agent)), el('td', '', c.cap), td); tb.appendChild(tr); }); };
      ['todos', 'nyx', 'cerbero', 'caronte', 'ogum', 'morfeu', 'lilith'].forEach(a => { const b = btn(a === 'todos' ? 'Todos' : NAME(a), 'chip', () => { flt = a; f.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); paint(); }); b.setAttribute('aria-pressed', String(a === 'todos')); f.appendChild(b); });
      body.append(el('p', 'muted small', 'Referência: o que cada agente pode fazer e sob qual limiar. Mesmo selo usado em toda a interface.'), f, tb); paint();
    }
  };

  PT.Surfaces.limiares = {
    title: 'Tabela de Limiares', w: 600,
    mount(body) {
      body.classList.add('pad');
      const leg = el('div', 'legend'); PT.Seals.THRESHOLDS.slice(1).forEach(t => { const d = el('div', 'legend__it'); d.append(PT.Seals.threshold(t.lvl), el('span', 'muted small', t.desc)); leg.appendChild(d); });
      const tb = el('table', 'tbl tbl--wide'); const hr = el('tr'); ['agente', 'ação', 'nível', 'selo'].forEach(h => hr.appendChild(el('th', '', h))); tb.appendChild(hr);
      PT.MOCK.capabilities.forEach(c => { const tr = el('tr'); tr.dataset.agent = c.agent; const sel = el('select'); sel.setAttribute('aria-label', 'Nível para: ' + c.cap);
        PT.Seals.THRESHOLDS.slice(1).forEach(t => { const o = el('option', '', `${t.lvl} · ${t.label}`); o.value = t.lvl; if (t.lvl === c.thr) o.selected = true; sel.appendChild(o); });
        const cell = el('td'); cell.appendChild(PT.Seals.threshold(c.thr, 'compact'));
        sel.onchange = () => { c.thr = +sel.value; cell.replaceChildren(PT.Seals.threshold(c.thr, 'compact')); tr.classList.add('is-dirty'); };
        const tdS = el('td'); tdS.appendChild(sel); tr.append(el('td', 'ag', NAME(c.agent)), el('td', '', c.cap), tdS, cell); tb.appendChild(tr); });
      body.append(section('Os cinco níveis'), leg, section('Por ação', 'edição em memória (mock) — INTEGRAÇÃO FUTURA: persistir e auditar pelo Cérbero'), tb);
    }
  };

  PT.Surfaces.saude = {
    title: 'Saúde do sistema', w: 600,
    mount(body) {
      body.classList.add('pad');
      const g = el('div', 'health'), lg = section('Registro de avisos', 'rota escolhida e porquê'), ll = el('ul', 'list list--mono'); lg.appendChild(ll);
      body.append(g, lg);
      const paint = () => {
        g.innerHTML = ''; const it = (k, v, bad) => { const d = el('div', 'hcell' + (bad ? ' is-bad' : '')); d.append(el('small', '', k), el('b', '', v)); g.appendChild(d); };
        const N = PT.Agents.get('nyx'), C = PT.Agents.get('cerbero'), K = PT.Agents.get('caronte'), O = PT.Agents.get('ogum'), Mo = PT.Agents.get('morfeu');
        it('Nyx · batimento', N.available ? 'ok' : `sem resposta há ${Math.round(C.nyxSilentFor)} s`, !N.available);
        it('Cérbero · canal próprio', 'ativo (independente)'); it('Cérbero · verificações', String(C.checks));
        it('Caronte · fila', `${K.queue.length} (pendência ${Math.round(K.pending * 100)}%)`, K.pending > 0.6);
        it('Ogum', O.phase); it('Morfeu · gravações', String(Mo.writes));
        let cells = 0, vis = 0; for (const v of PT.Stage.views) { if (v.visible()) { vis++; cells += v.engine.N; } }
        it('Motor · quadros/s', String(Math.round(PT.Stage.fps))); it('Motor · vistas ativas', `${vis} de ${PT.Stage.views.size}`); it('Motor · células em cena', cells.toLocaleString('pt-BR'));
        it('Casco', PT.WM.cascoOpen() ? 'aberto' : 'fechado');
        ll.innerHTML = ''; if (!PT.Notify.log.length) ll.appendChild(el('li', 'muted', 'Nenhum aviso ainda. Use o simulador.'));
        PT.Notify.log.slice(0, 14).forEach(l => ll.appendChild(el('li', '', `${NAME(l.agent).padEnd(8, ' ')} ${l.route.padEnd(8, ' ')} L${l.thr || 1} · ${l.title} — ${l.why}`)));
      };
      paint(); const o = PT.bus.on('tick', paint), o2 = PT.bus.on('notify', paint);
      return { unmount() { o(); o2(); } };
    }
  };

  PT.Surfaces.cerimonia = {
    title: 'Cerimônia · andaime', w: 600,
    mount(body) {
      body.classList.add('pad');
      const sw = el('div', 'chips'), host = el('div');
      Object.keys(PT.Ceremony.PRESETS).forEach((k, i) => { const b = btn(PT.Ceremony.PRESETS[k].name, 'chip', () => { sw.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); PT.Ceremony.mount(host, k); }); b.setAttribute('aria-pressed', String(i === 0)); sw.appendChild(b); });
      body.append(sw, host); PT.Ceremony.mount(host, 'apoteose');
    }
  };

  PT.Surfaces.declaracao = {
    title: 'Declaração pré-execução · demonstração', w: 600,
    mount(body) {
      body.classList.add('pad');
      const res = el('p', 'muted small');
      const run = async (risk, kind, action, agent, thr) => { const ok = await PT.Declaration.open({ agent, action, thr, risk, kind }); res.textContent = `Resultado: ${ok ? 'aprovada' : 'recusada'} (${action})`; };
      const r = el('div', 'row');
      r.append(btn('Ação comum · "Exige você"', '', () => run('comum', 'migra', 'Migrar o banco de dados local', 'ogum', 4)),
        btn('Ação crítica · leitura obrigatória', 'btn--danger', () => run('critico', 'deploy', 'Publicar em produção', 'ogum', 4)),
        btn('Lilith · excluir arquivo', '', () => run('comum', 'excluir', 'Excluir "rascunho_antigo.txt"', 'lilith', 4)));
      body.append(el('p', 'muted small', 'Mesmo componente para qualquer agente. Comum: resumo condensado + 9 respostas sob demanda. Crítico: abre completo e só libera depois da leitura.'), r, res,
        section('Embutida (exemplo comum)'), PT.Declaration.build({ agent: 'caronte', action: 'Responder um contato em seu nome', thr: 4, risk: 'comum', kind: 'responder' }, ok => { res.textContent = 'Embutida: ' + (ok ? 'aprovada' : 'recusada'); }));
    }
  };
})(window.PT);
