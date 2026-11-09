/* =====================================================================
   PANTEÃO · SELOS (componentes únicos, reusados por todos os agentes)
   ---------------------------------------------------------------------
   • Selo da Tabela de Limiares — 5 níveis de autorização. Desenhado UMA
     vez aqui; qualquer ação simulada de qualquer agente usa este mesmo
     componente. Nível não depende só de cor: barras preenchidas (1–5) +
     glifo + rótulo.
   • Selo de Padrão de Presença — mostra a atividade ESPECÍFICA ao vivo
     ("Ogum: compilando · 42%"), não só o nome genérico do padrão.
   ===================================================================== */
'use strict';
(function (PT) {
  const T = [
    null,
    { lvl: 1, key: 'autonomo', label: 'Autônomo', short: 'AUT', desc: 'Executa sem pedir.' },
    { lvl: 2, key: 'registro', label: 'Autônomo com registro', short: 'REG', desc: 'Executa e deixa registro auditável (o Cérbero lê).' },
    { lvl: 3, key: 'delegavel', label: 'Delegável à Nyx se indisponível', short: 'DLG', desc: 'Exige você; se você estiver indisponível, a Nyx pode decidir.' },
    { lvl: 4, key: 'exige', label: 'Exige você sempre', short: 'VOCÊ', desc: 'Nunca executa sem a sua aprovação explícita.' },
    { lvl: 5, key: 'maxima', label: 'Prioridade máxima · nunca represado', short: 'MÁX', desc: 'Fura qualquer fila e chega a você na hora, por todas as rotas.' }
  ];
  const PATTERN = {
    continuo: { label: 'Contínuo', glyph: '●' },
    vigilancia: { label: 'Vigilância passiva', glyph: '◌' },
    invocado: { label: 'Invocado', glyph: '◆' },
    infra: { label: 'Infraestrutura', glyph: '▤' },
    livre: { label: 'Livre pelo computador', glyph: '♡' }
  };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  /* Selo de limiar: variant 'full' (barras + rótulo), 'compact' (barras + sigla), 'dot' (só barras) */
  function threshold(lvl, variant = 'full') {
    const d = T[lvl] || T[1], s = el('span', 'seal-thr seal-thr--' + variant);
    s.dataset.l = d.lvl; s.title = `${d.label} — ${d.desc}`; s.setAttribute('role', 'img'); s.setAttribute('aria-label', `Limiar ${d.lvl} de 5: ${d.label}`);
    const bars = el('i', 'seal-thr__bars'); for (let k = 1; k <= 5; k++) { const b = el('b'); if (k <= d.lvl) b.className = 'on'; bars.appendChild(b); }
    s.appendChild(bars);
    if (variant !== 'dot') s.appendChild(el('span', 'seal-thr__txt', variant === 'compact' ? d.short : d.label));
    return s;
  }

  /* Selo de presença: auto-atualizável (1 Hz e a cada mudança de estado) */
  const live = new Set();
  function presence(agent, variant = 'full') {
    const meta = PT.MOCK.agents[agent], P = PATTERN[meta.pattern], s = el('span', 'seal-pres seal-pres--' + variant);
    s.dataset.agent = agent; s.dataset.pattern = meta.pattern;
    const g = el('i', 'seal-pres__g', P.glyph); g.setAttribute('aria-hidden', 'true');
    const txt = el('span', 'seal-pres__txt');
    s.append(g, txt); s._agent = agent; s._variant = variant; s._pattern = P;
    paint(s); live.add(s); return s;
  }
  function paint(s) {
    const a = s._agent, st = PT.Agents.get(a), act = PT.Agents.activity(a), name = PT.MOCK.agents[a].name;
    const t = s.querySelector('.seal-pres__txt');
    t.textContent = s._variant === 'compact' ? `${name}: ${act}` : `${name} · ${s._pattern.label} — ${act}`;
    s.title = `${s._pattern.label} · ${act}`;
    s.classList.toggle('is-absent', a === 'ogum' && st.phase === 'ausente');
    s.classList.toggle('is-off', a === 'nyx' && !st.available);
    s.classList.toggle('is-alert', a === 'cerbero' && (st.converge || st.alert > 0.3));
  }
  function refresh(id) { for (const s of live) { if (!s.isConnected) { live.delete(s); continue; } if (!id || s._agent === id) paint(s); } }

  PT.Seals = { THRESHOLDS: T, PATTERN, threshold, presence, refresh, el };
  document.addEventListener('DOMContentLoaded', () => { PT.bus.on('tick', () => refresh()); PT.bus.on('state', e => refresh(e && e.id)); });
})(window.PT);
