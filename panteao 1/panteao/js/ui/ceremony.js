/* =====================================================================
   PANTEÃO · ESQUELETO DE CERIMÔNIA (Apoteose / Elísio)
   ---------------------------------------------------------------------
   Só o andaime da experiência: sequência de estágios nomeados, indicador
   de progresso, cada estágio aprovado ou reprovado antes de avançar.
   Nenhum agente específico passa por aqui ainda; o conteúdo de cada
   estágio é um espaço reservado (INTEGRAÇÃO FUTURA: cada estágio recebe
   um `render(container, ctx)` vindo da definição real da cerimônia).
   Os nomes dos estágios são PROVISÓRIOS e configuráveis.
   ===================================================================== */
'use strict';
(function (PT) {
  const el = (t, c, x) => PT.Seals.el(t, c, x);
  const PRESETS = {
    apoteose: { name: 'Apoteose', sub: 'ascensão', stages: ['Convocação', 'Apresentação', 'Escrutínio', 'Contestação', 'Deliberação', 'Veredito', 'Selagem'] },
    elisio: { name: 'Elísio', sub: 'recolhimento', stages: ['Convocação', 'Balanço', 'Escrutínio', 'Despedidas', 'Deliberação', 'Veredito', 'Travessia', 'Selagem'] }
  };

  function mount(container, presetKey = 'apoteose') {
    const P = PRESETS[presetKey], st = P.stages.map(n => ({ name: n, status: 'pendente', note: '' }));
    let cur = 0, halted = false; const log = [];
    const root = el('div', 'cer'); container.innerHTML = ''; container.appendChild(root);
    function render() {
      root.innerHTML = '';
      const h = el('div', 'cer__h'); h.append(el('span', 'cer__eyebrow', 'Cerimônia · andaime'), el('h3', 'cer__title', `${P.name}`), el('span', 'cer__sub', `${P.sub} · ${st.length} estágios · nomes provisórios`));
      const prog = el('ol', 'cer__prog'); prog.setAttribute('aria-label', 'Progresso da cerimônia');
      st.forEach((s, i) => { const li = el('li', 'cer__step is-' + s.status + (i === cur && !halted && cur < st.length ? ' is-cur' : '')); li.append(el('i', 'cer__dot', s.status === 'aprovado' ? '✓' : s.status === 'reprovado' ? '✕' : String(i + 1)), el('span', 'cer__name', s.name)); if (i === cur) li.setAttribute('aria-current', 'step'); prog.appendChild(li); });
      const bar = el('div', 'cer__bar'); const fill = el('i'); fill.style.width = (st.filter(s => s.status === 'aprovado').length / st.length * 100) + '%'; bar.appendChild(fill);
      root.append(h, prog, bar);
      const body = el('div', 'cer__body');
      if (cur >= st.length) {
        body.append(el('h4', '', 'Cerimônia concluída'), el('p', 'muted', 'Todos os estágios aprovados. Registro abaixo (seria gravado pelo Morfeu).'));
        const ul = el('ul', 'cer__log'); log.forEach(l => ul.appendChild(el('li', '', l))); body.appendChild(ul);
        const again = el('button', 'btn', 'Reiniciar andaime'); again.onclick = () => { st.forEach(s => { s.status = 'pendente'; s.note = ''; }); cur = 0; halted = false; log.length = 0; render(); }; body.appendChild(again);
      } else if (halted) {
        const s = st[cur];
        body.append(el('h4', '', `Interrompida no estágio ${cur + 1} · ${s.name}`), el('p', 'muted', 'Motivo da reprovação: ' + (s.note || '—')));
        const a = el('div', 'row'), retry = el('button', 'btn btn--acc', 'Retomar este estágio'), end = el('button', 'btn btn--ghost', 'Encerrar cerimônia');
        retry.onclick = () => { s.status = 'pendente'; halted = false; log.push(`retomado: ${s.name}`); render(); };
        end.onclick = () => { log.push('encerrada sem conclusão'); container.dispatchEvent(new CustomEvent('cer:end', { detail: { completed: false, log } })); body.replaceChildren(el('p', 'muted', 'Encerrada. ' + log.length + ' entradas no registro.')); };
        a.append(retry, end); body.appendChild(a);
      } else {
        const s = st[cur];
        body.append(el('h4', '', `Estágio ${cur + 1} de ${st.length} · ${s.name}`));
        const slot = el('div', 'cer__slot'); slot.append(el('span', '', 'conteúdo do estágio'), el('code', '', `stages[${cur}].render(container, ctx)`), el('span', 'muted', 'espaço reservado — sem conteúdo real nesta fase'));
        const note = el('textarea', 'cer__note'); note.placeholder = 'Observação / motivo (obrigatório para reprovar)'; note.rows = 2;
        const a = el('div', 'row'), ok = el('button', 'btn btn--acc', 'Aprovar e avançar'), no = el('button', 'btn btn--danger', 'Reprovar');
        ok.onclick = () => { s.status = 'aprovado'; s.note = note.value; log.push(`aprovado: ${s.name}${note.value ? ' — ' + note.value : ''}`); cur++; render(); };
        no.onclick = () => { if (!note.value.trim()) { note.focus(); note.classList.add('is-err'); return; } s.status = 'reprovado'; s.note = note.value.trim(); log.push(`reprovado: ${s.name} — ${s.note}`); halted = true; render(); };
        a.append(no, ok); body.append(slot, note, a);
      }
      root.appendChild(body);
    }
    render();
    return { reset: () => mount(container, presetKey) };
  }
  PT.Ceremony = { mount, PRESETS };
})(window.PT);
