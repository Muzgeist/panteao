/* =====================================================================
   SUPERFÍCIES INDEPENDENTES · Cérbero, Caronte, Ogum, Morfeu
   Cada uma é uma janela irmã com a própria instância do motor.
   ===================================================================== */
'use strict';
(function (PT) {
  const { el, formStage, section, btn, bar, placeholderReply } = PT.UI;
  const ago = s => PT.Agents.ago(s);

  /* ---------------- CÉRBERO (camada própria, fora do casco) ---------------- */
  PT.Surfaces.cerbero = {
    title: 'Cérbero', agent: 'cerbero', w: 470,
    mount(body) {
      body.classList.add('cerb');
      const badge = el('div', 'indep'); badge.append(el('b', '', 'canal independente'), el('span', '', 'fora do casco · não depende da Nyx · Ctrl+Shift+C'));
      const stage = formStage(body, 'cerbero', { N: innerWidth < 700 ? 3000 : 4600, cls: 'stage--hero', presence: 0.55 }); stage.appendChild(badge);
      const cols = el('div', 'cols');
      const eyes = section('Três leituras, agora', 'nunca a mesma coisa ao mesmo tempo'), eyl = el('ol', 'eyes'); eyes.appendChild(eyl);
      const nyxw = el('p', 'watch'); eyes.appendChild(nyxw);
      const fin = section('Achados'), fl = el('ul', 'list'); fin.appendChild(fl);
      cols.append(eyes, fin);
      const talk = el('details', 'talk'); const sm = el('summary', '', 'Conversa direta com o Cérbero (raro — o dia a dia passa pela Nyx)');
      const log = el('div', 'chat chat--mini'), f = el('form', 'chat__in'), ta = el('input'); ta.placeholder = 'Pergunte ao Cérbero…'; ta.setAttribute('aria-label', 'Mensagem para o Cérbero');
      f.append(ta, btn('Enviar', 'btn--sm')); talk.append(sm, log, f);
      f.onsubmit = e => { e.preventDefault(); if (!ta.value.trim()) return; const m = el('div', 'msg msg--user'); m.textContent = ta.value; log.appendChild(m); ta.value = ''; setTimeout(() => { log.appendChild(placeholderReply('cerbero')); log.scrollTop = log.scrollHeight; }, 700); };
      body.append(cols, talk);
      const paint = () => {
        const s = PT.Agents.get('cerbero'); eyl.innerHTML = '';
        s.eyes.forEach((e, k) => { const li = el('li', 'eye'); li.append(el('span', 'eye__n', `olho ${k + 1}`), el('span', 'eye__l', e.label), bar(e.risk, e.risk > 0.5 ? 'meter--red' : 'meter--steel'), el('span', 'eye__v', Math.round(e.risk * 100) + '%')); eyl.appendChild(li); });
        const N = PT.Agents.get('nyx'); nyxw.textContent = N.available ? `Vigiando a Nyx: batimento ${ago(s.nyxSilentFor)} · ok` : `Vigiando a Nyx: SEM batimento há ${Math.round(s.nyxSilentFor)} s — este canal segue funcionando`;
        nyxw.classList.toggle('is-bad', !N.available);
        fl.innerHTML = ''; if (!s.findings.length) fl.appendChild(el('li', 'muted', 'Nenhum achado. Vigilância passiva em curso.'));
        s.findings.slice(0, 8).forEach(x => { const li = el('li', 'find'); li.append(PT.Seals.threshold(x.thr || 2, 'compact'), el('b', '', x.title), el('span', 'muted', ' · ' + ago(PT.now() - x.at)), el('div', 'find__b', x.body || '')); fl.appendChild(li); });
      };
      paint(); const o1 = PT.bus.on('tick', paint), o2 = PT.bus.on('state', e => { if (!e || e.id === 'cerbero' || e.id === 'nyx') paint(); });
      return { unmount() { o1(); o2(); } };
    }
  };

  /* ---------------- CARONTE ---------------- */
  PT.Surfaces.caronte = {
    title: 'Caronte', agent: 'caronte', w: 470,
    mount(body) {
      body.classList.add('car');
      formStage(body, 'caronte', { N: innerWidth < 700 ? 3000 : 4400, cls: 'stage--hero' });
      const chs = el('div', 'chans'); const q = section('Esperando travessia', 'só o que merece você chega aqui'), ql = el('ul', 'list'); q.appendChild(ql);
      const held = section('Retidas até a hora certa'), hl = el('ul', 'list list--dim'); held.appendChild(hl);
      body.append(chs, q, held);
      const paint = () => {
        const s = PT.Agents.get('caronte'); chs.innerHTML = '';
        s.channels.forEach(c => { const d = el('span', 'chan'); d.append(el('b', '', c.name), el('small', '', `${c.seen} recebidas`)); chs.appendChild(d); });
        chs.appendChild(el('span', 'chan chan--dim', `${s.archived} filtradas sem incomodar`));
        ql.innerHTML = ''; if (!s.queue.length) ql.appendChild(el('li', 'muted', 'Canais tranquilos. Nada esperando você.'));
        s.queue.forEach(m => {
          const li = el('li', 'mail'); li.append(el('span', 'mail__ch', PT.MOCK.channels.find(c => c.id === m.ch).name), el('b', 'mail__from', m.from), el('span', 'mail__s', m.subj), bar(m.imp, m.imp >= 0.6 ? 'meter--sil' : ''));
          const a = el('div', 'row');
          a.append(
            btn('Responder em seu nome', 'btn--sm', async () => { const ok = await PT.Declaration.open({ agent: 'caronte', action: `Responder ${m.from}`, thr: 4, risk: 'comum', kind: 'responder' }); if (ok) PT.Agents.caronteResolve(m.id, 'respondida'); }),
            btn('Segurar até mais tarde', 'btn--sm btn--ghost', () => PT.Agents.caronteResolve(m.id, 'segurar')),
            btn('Atravessar pela Nyx', 'btn--sm btn--ghost', () => { PT.Notify.send({ agent: 'caronte', thr: 2, urgency: m.imp, route: 'via-nyx', title: m.subj, body: `${m.from} · ${PT.MOCK.channels.find(c => c.id === m.ch).name}` }); PT.Agents.caronteResolve(m.id, 'repassada'); }));
          li.appendChild(a); ql.appendChild(li);
        });
        hl.innerHTML = ''; if (!s.held.length) hl.appendChild(el('li', 'muted', '—')); s.held.forEach(m => hl.appendChild(el('li', '', `${m.from} — ${m.subj}`)));
      };
      paint(); const o = PT.bus.on('state', e => { if (!e || e.id === 'caronte') paint(); });
      return { unmount() { o(); } };
    }
  };

  /* ---------------- OGUM ---------------- */
  PT.Surfaces.ogum = {
    title: 'Ogum', agent: 'ogum', w: 470,
    mount(body) {
      body.classList.add('ogum');
      formStage(body, 'ogum', { N: innerWidth < 700 ? 2800 : 4200, cls: 'stage--hero' });
      const panel = el('div', 'ogum__p'); body.appendChild(panel);
      const hist = section('Histórico'), hl = el('ul', 'list list--dim'); hist.appendChild(hl); body.appendChild(hist);
      let lastPhase = null, declShown = false;
      const paint = force => {
        const s = PT.Agents.get('ogum');
        hl.innerHTML = ''; if (!s.history.length) hl.appendChild(el('li', 'muted', 'Última forja: ' + s.lastTask + ' · ' + ago(PT.now() - s.lastAt)));
        s.history.slice(0, 6).forEach(h => hl.appendChild(el('li', '', `${h.task} — ${h.result} · ${ago(PT.now() - h.at)}`)));
        if (s.phase === lastPhase && !force) { if (s.phase === 'trabalhando') { const m = panel.querySelector('.meter i'); if (m) m.style.width = Math.round(s.progress * 100) + '%'; const p = panel.querySelector('.pct'); if (p) p.textContent = Math.round(s.progress * 100) + '%'; } return; }
        lastPhase = s.phase; panel.innerHTML = '';
        if (s.phase === 'ausente') {
          declShown = false;
          panel.append(el('p', 'lead', 'Ausente. Ogum é Invocado: não fica de prontidão; chega quando chamado, entrega e se ausenta. A marca que você vê é a última forja, ainda esfriando.'));
          const list = el('div', 'tasks');
          PT.MOCK.ogumTasks.forEach(t => { const b = el('button', 'task'); b.type = 'button'; b.append(el('b', '', t.label), PT.Seals.threshold(t.thr, 'compact'), el('small', '', t.risk === 'critico' ? 'risco crítico' : t.risk === 'comum' ? 'exige declaração' : 'baixo risco'));
            b.onclick = () => { PT.Agents.ogumInvoke(t); }; list.appendChild(b); });
          panel.append(el('h4', '', 'Convocar para…'), list, el('p', 'muted small', 'No dia a dia a convocação passa pela Nyx; aqui é atalho direto da superfície dele.'));
        } else if (s.phase === 'aguardando') {
          panel.append(el('p', 'lead', `Chegou para: ${s.task.label}. Selo "${PT.Seals.THRESHOLDS[s.task.thr].label}" — precisa da sua aprovação antes de executar.`));
          if (!declShown) { declShown = true; panel.appendChild(PT.Declaration.build({ agent: 'ogum', action: s.task.label, thr: s.task.thr, risk: s.task.risk === 'critico' ? 'critico' : 'comum', kind: s.task.id === 'deploy' ? 'deploy' : 'migra' }, ok => PT.Agents.ogumApprove(ok))); }
        } else {
          const lbl = { chegando: 'Chegando…', trabalhando: s.task ? s.task.verb : '', entregando: 'Entregando', saindo: 'Saindo — fica a marca' }[s.phase] || s.phase;
          const row = el('div', 'prog'); row.append(el('b', '', lbl), bar(s.phase === 'trabalhando' ? s.progress : s.phase === 'chegando' ? 0 : 1, 'meter--ember'), el('span', 'pct', Math.round(s.progress * 100) + '%'));
          panel.append(el('p', 'lead', s.task ? s.task.label : ''), row, el('div', 'row', null));
          panel.lastChild.appendChild(PT.Seals.threshold(s.task ? s.task.thr : 1));
        }
      };
      paint(true); const o1 = PT.bus.on('tick', () => paint()), o2 = PT.bus.on('ogum:phase', () => paint(true));
      return { unmount() { o1(); o2(); } };
    }
  };

  /* ---------------- MORFEU (consulta de dados — sem chat, não fala) ---------------- */
  PT.Surfaces.morfeu = {
    title: 'Morfeu', agent: 'morfeu', w: 520,
    mount(body) {
      body.classList.add('morf');
      formStage(body, 'morfeu', { N: 2600, cls: 'stage--short' });
      body.appendChild(el('p', 'muted small pad', 'Infraestrutura pura: não decide, não fala, não interpreta. Esta tela é só consulta (dados fictícios).'));
      const tabs = el('div', 'tabs'), pane = el('div', 'pane'); body.append(tabs, pane);
      const AG = ['nyx', 'cerbero', 'caronte', 'ogum', 'lilith'];
      const vincData = AG.map(a => ['usuário', ...AG].map((b, j) => (j && AG[j - 1] === a) ? null : Math.round((Math.sin(a.length * 3.1 + j * 1.7) * 0.5 + 0.25) * 100) / 100));
      const T = {
        'Vínculo': () => { const tb = el('table', 'tbl'); const hr = el('tr'); hr.appendChild(el('th', '', 'de \\ para')); ['usuário', ...AG].forEach(b => hr.appendChild(el('th', '', b === 'usuário' ? b : PT.MOCK.agents[b].name))); tb.appendChild(hr);
          AG.forEach((a, i) => { const tr = el('tr'); tr.appendChild(el('th', '', PT.MOCK.agents[a].name)); vincData[i].forEach(v => { const td = el('td'); if (v == null) td.textContent = '—'; else { const m = bar((v + 1) / 2, v < 0 ? 'meter--neg' : ''); td.append(m, el('small', '', v.toFixed(2))); } tr.appendChild(td); }); tb.appendChild(tr); });
          return [tb, el('p', 'muted small', 'Valência registrada (−1..1). Dado mock: o vínculo real é escrito pelos agentes, não inventado aqui.')]; },
        'Processual': () => { const ul = el('ul', 'list'); PT.MOCK.procedural.forEach(p => ul.appendChild(el('li', '', `${p.k} — reutilizado ${p.uses}×`))); return [ul]; },
        'Autoavaliação': () => { const tb = el('table', 'tbl'); const hr = el('tr'); ['agente', 'acerto', 'reversões', 'tempo médio'].forEach(h => hr.appendChild(el('th', '', h))); tb.appendChild(hr);
          AG.filter(a => a !== 'lilith').forEach((a, i) => { const tr = el('tr'); tr.append(el('th', '', PT.MOCK.agents[a].name), el('td', '', (88 + i * 2.3).toFixed(1) + '%'), el('td', '', String(3 - (i % 3))), el('td', '', (0.8 + i * 0.6).toFixed(1) + ' s')); tb.appendChild(tr); }); return [tb]; },
        'Biblioteca': () => { const ul = el('ul', 'list'); PT.MOCK.library.forEach(p => ul.appendChild(el('li', '', `${p.k} (${p.n})`))); return [ul]; },
        'Gravações': () => { const ul = el('ul', 'list list--mono'); const s = PT.Agents.get('morfeu'); s.log.slice(0, 16).forEach(l => ul.appendChild(el('li', '', `${l.layer.padEnd(14, ' ')} ${ago(PT.now() - l.at)}`))); return [ul]; }
      };
      let cur = 'Vínculo';
      const show = k => { cur = k; tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.textContent === k))); pane.replaceChildren(...T[k]()); };
      Object.keys(T).forEach(k => { const b = el('button', 'tab', k); b.type = 'button'; b.setAttribute('role', 'tab'); b.onclick = () => show(k); tabs.appendChild(b); });
      tabs.setAttribute('role', 'tablist'); show(cur);
      const o = PT.bus.on('state', e => { if (e && e.id === 'morfeu' && cur === 'Gravações') show(cur); });
      return { unmount() { o(); } };
    }
  };
})(window.PT);
