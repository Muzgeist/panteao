/* PANTEÃO · peças comuns das superfícies */
'use strict';
(function (PT) {
  const el = (t, c, x) => PT.Seals.el(t, c, x);
  /* palco de partículas de um agente dentro de qualquer superfície (instância própria do motor) */
  function formStage(container, agent, opts = {}) {
    const box = el('div', 'stage' + (opts.cls ? ' ' + opts.cls : '')); box.dataset.agent = agent;
    const cv = el('canvas'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', opts.label || ('Forma abstrata de ' + PT.MOCK.agents[agent].name));
    box.appendChild(cv); container.appendChild(box);
    const view = PT.Stage.add(cv, Object.assign({ agent, N: 3000 }, opts));
    box._view = view; return box;
  }
  function section(title, extra) { const s = el('section', 'sec'); const h = el('div', 'sec__h'); h.appendChild(el('h3', '', title)); if (extra) h.appendChild(typeof extra === 'string' ? el('small', '', extra) : extra); s.appendChild(h); return s; }
  function btn(label, cls, fn) { const b = el('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; if (fn) b.onclick = fn; return b; }
  function bar(v, cls) { const b = el('span', 'meter' + (cls ? ' ' + cls : '')); const i = el('i'); i.style.width = Math.round(Math.max(0, Math.min(1, v)) * 100) + '%'; b.appendChild(i); return b; }
  /* marcador explícito de placeholder (sem falas pré-fabricadas) */
  function placeholderReply(agent, hint) {
    const m = el('div', 'msg msg--agent msg--ph'); m.dataset.agent = agent;
    m.append(el('span', 'msg__who', PT.MOCK.agents[agent].name), el('span', 'msg__ph', `⟨ resposta gerada pela ${PT.MOCK.agents[agent].name} entra aqui ⟩`), el('code', 'msg__int', hint || `INTEGRAÇÃO FUTURA · PT.Integration.llm.${agent}(mensagem, contexto)`));
    return m;
  }
  PT.UI = { el, formStage, section, btn, bar, placeholderReply };
  /* ganchos de integração — todos nulos nesta fase */
  PT.Integration = { llm: null, os: null, lilith: null, channels: null, memory: null };
})(window.PT);
