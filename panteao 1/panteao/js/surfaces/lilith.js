/* =====================================================================
   LILITH · representação dentro da composição (não é re-implementação)
   O corpo dela roda à parte, em lilith_corpo.html, livre pelo computador.
   Aqui ela só é REPRESENTADA (glifo leve em 2D + status) e pode ser
   CHAMADA ao painel ou LIBERADA. Ex-"lilithCard" do hub, agora encaixado
   no canto do palco central.
   ===================================================================== */
'use strict';
(function (PT) {
  const { el, btn } = PT.UI;
  /* coração partido em órbita, em 2D — leve, só representação (a língua visual dela: troca de cor por corte) */
  function glyph(cv) {
    let raf; const t0 = performance.now();
    const frags = Array.from({ length: 7 }, () => ({ r: 0.55 + Math.random() * 0.35, a: Math.random() * 6.28, s: 0.4 + Math.random() * 0.7, n: Math.random() * 9 }));
    const ctx = cv.getContext('2d');
    const draw = now => {
      raf = requestAnimationFrame(draw);
      if (!cv.isConnected) { cancelAnimationFrame(raf); return; }
      const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h || cv.offsetParent === null) return;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const t = (now - t0) / 1000, R = Math.min(w, h) * 0.38, cx = w / 2, cy = h / 2, ph = (t / 0.86) % 1, beat = ph < 0.07 ? 1 - 0.22 * ph / 0.07 : ph < 0.2 ? 0.8 + 0.1 * Math.sin(ph * 20) : 0.8 + 0.2 * (ph - 0.2) / 0.8;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter';
      const core = Math.floor(t * 3.1) % 2 ? '255,64,158' : '118,69,255';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5 * beat); g.addColorStop(0, `rgba(${core},0.95)`); g.addColorStop(1, `rgba(${core},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.5 * beat, 0, 6.283); ctx.fill();
      frags.forEach((f, k) => { f.a += 0.016 * f.s / f.r; const rr = R * f.r * (0.9 + 0.15 * Math.sin(t * 0.7 + f.n)), x = cx + Math.cos(f.a) * rr, y = cy + Math.sin(f.a) * rr * 0.55;
        ctx.fillStyle = k === 0 ? 'rgba(90,220,255,0.85)' : `rgba(${k % 2 ? '255,64,158' : '139,92,255'},0.75)`; ctx.beginPath(); ctx.moveTo(x, y - 2.6); ctx.lineTo(x + 2.4, y); ctx.lineTo(x, y + 2.6); ctx.lineTo(x - 2.4, y); ctx.fill(); });
    };
    raf = requestAnimationFrame(draw);
  }
  function chip() {
    const c = el('div', 'lili'); c.dataset.agent = 'lilith';
    const g = el('div', 'lili__g'), cv = el('canvas'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Lilith: coração partido em órbita'); g.appendChild(cv); glyph(cv);
    const txt = el('div', 'lili__t'), name = el('b', '', 'Lilith'), line = el('span', 'lili__l'), mood = el('span', 'lili__m');
    txt.append(name, line, mood);
    const call = btn('Chamá-la ao painel', 'btn--sm btn--lili', () => PT.Agents.lilithSummon()), rel = btn('Liberar', 'btn--sm btn--ghost', () => PT.Agents.lilithRelease());
    const acts = el('div', 'row lili__a'); acts.append(call, rel);
    c.append(g, txt, acts);
    c.title = 'O corpo da Lilith vive em lilith_corpo.html; aqui ela só é representada e chamada.';
    const paint = () => { const s = PT.Agents.get('lilith');
      line.textContent = s.summon === 'livre' ? `${s.where} · ${s.doing}` : s.summon === 'a caminho' ? 'atravessando até o painel…' : 'no painel, ao seu lado';
      mood.textContent = 'humor: ' + s.mood; c.classList.toggle('is-here', s.summon !== 'livre');
      call.hidden = s.summon !== 'livre'; rel.hidden = s.summon === 'livre'; };
    paint(); PT.bus.on('state', e => { if (e && e.id === 'lilith') paint(); }); PT.bus.on('tick', paint);
    return c;
  }
  PT.Lilith = { glyph, chip };
})(window.PT);
