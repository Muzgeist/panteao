/* =====================================================================
   OGUM — metal incandescente, sempre em construção
   ---------------------------------------------------------------------
   • NUNCA forma fechada ou lisa: barras angulosas (lâmina que abre
     caminho, guarda, chevrons de passagem, base de bigorna) que entortam
     devagar e são endireitadas a golpes enquanto você olha.
   • Simetria só onde é função (guarda e lâmina equilibradas); torto onde é
     função (o chevron da direita ainda está sendo forjado: cresce e recua).
   • Paleta BASE = forja: laranja-ferro/brasa viva no centro, esfriando para
     cinza-aço escuro nas extremidades; borda sempre levemente incandescente.
     (Diferente da Lilith: aqui fogo não é vocabulário escasso — é ele.)
   • Golpe: fagulhas reais (balísticas, com gravidade) + marca de martelo
     que aparece por um instante e alisa de volta.
   • Ogum é INVOCADO: ausente não tem forma. A forma "ogumMarca" deixa só a
     ÚLTIMA marca/fagulha resfriando devagar — prova de que esteve ali.
   ===================================================================== */
'use strict';
(function (PT) {
  const { TAU, clamp, lerp, smooth, mulberry32, FORGE } = PT.M, writeSlot = PT.writeSlot, centerFocus = PT.centerFocus;
  // [x0,y0,x1,y1, tipo]  tipo: 0 lâmina · 1 nervura · 2 guarda · 3 chevron · 4 chevron em forja (cresce) · 5 base · 6 escora
  const SEG = [
    [0, 0.80, 0.15, 0.12, 0], [0.15, 0.12, 0, -0.56, 0], [0, -0.56, -0.15, 0.12, 0], [-0.15, 0.12, 0, 0.80, 0],
    [0, 0.70, 0, -0.46, 1],
    [-0.38, -0.03, 0.38, -0.03, 2],
    [-0.44, 0.42, -0.71, 0.06, 3], [-0.71, 0.06, -0.44, -0.30, 3],
    [0.47, 0.41, 0.75, 0.05, 3], [0.75, 0.05, 0.50, -0.27, 4],
    [-0.54, -0.74, 0.54, -0.74, 5], [-0.30, -0.74, -0.12, -0.60, 6], [0.30, -0.74, 0.12, -0.60, 6]
  ];
  const now = () => (PT.now ? PT.now() : performance.now() / 1000);
  /* COROA: silhuetas de ferramenta (local, ~±0.12). Cada segmento vira barra de lava com casca de ferro fundido. */
  const TOOLS = {
    martelo: [[0, -0.12, 0, 0.05], [-0.085, 0.05, 0.085, 0.05], [-0.085, 0.11, 0.085, 0.11], [-0.085, 0.05, -0.085, 0.11], [0.085, 0.05, 0.085, 0.11], [0.085, 0.08, 0.11, 0.08]],
    tenaz: [[-0.055, -0.12, 0.02, 0.03], [0.055, -0.12, -0.02, 0.03], [0.02, 0.03, -0.012, 0.11], [-0.02, 0.03, 0.012, 0.11], [-0.03, 0.0, 0.03, 0.0]],
    bigorna: [[-0.1, 0.06, 0.07, 0.06], [0.07, 0.06, 0.13, 0.035], [0.13, 0.035, 0.05, 0.025], [-0.1, 0.06, -0.1, 0.025], [-0.1, 0.025, -0.035, 0.0], [0.05, 0.025, 0.035, 0.0], [-0.035, 0.0, -0.035, -0.06], [0.035, 0.0, 0.035, -0.06], [-0.08, -0.09, 0.08, -0.09], [-0.035, -0.06, -0.075, -0.09], [0.035, -0.06, 0.075, -0.09]]
  };
  const CROWN = ['martelo', 'tenaz', 'bigorna', 'martelo', 'tenaz', 'bigorna'], TASK_TOOL = { build: 0, migra: 1, deploy: 2, script: 3 };
  const CROWN_Y = 1.02, CROWN_R = 0.62;

  class OgumForm {
    constructor(state, opts = {}) { this.extent = [1.0, 1.06];
      this.state = state || {}; this.opts = opts; this.churn = 0.12; this.buildStyle = 'rise'; this.linkAlpha = 0;
      this.nextStrike = 0.6; this.mark = null; this.sparkHead = 0; this.work = 0;
    }
    camera() { return { x: 0, y: 0.2, zoom: this.opts.zoom || 0.98 }; }
    build(eng) {
      const N = eng.N, S = eng.S, rng = mulberry32(this.opts.seed || 1717);
      this.segs = SEG.map((s, k) => { const len = Math.hypot(s[2] - s[0], s[3] - s[1]); return { x0: s[0], y0: s[1], x1: s[2], y1: s[3], ty: s[4], len, b: (rng() - 0.5) * 0.05, bv: 0, bt: 0, rot: (rng() - 0.5) * 0.06, rv: 0, rt: 0, heat: 0.2, grow: 1, k }; });
      const totLen = this.segs.reduce((a, s) => a + s.len, 0);
      const nSpark = Math.round(N * 0.09), nMark = Math.max(30, Math.round(N * 0.03)), nEmber = Math.round(N * 0.04), nCrown = Math.round(N * 0.23), nBars = N - nSpark - nMark - nEmber - nCrown;
      const lanes = 3, ds = totLen * lanes / nBars; this.ds = ds;
      this.kind = new Uint8Array(N); this.d = new Float32Array(N * 6);
      let i = 0;
      this.segs.forEach((sg, k) => { const n = Math.max(3, Math.round(sg.len / ds)), w = sg.ty === 1 ? 0.007 : sg.ty === 5 ? 0.026 : sg.ty === 0 ? 0.013 : 0.02;
        for (let c = 0; c < n; c++) for (let l = 0; l < lanes; l++) { if (i >= nBars) break; const u = (c + 0.5) / n; this.kind[i] = 1; this.d.set([k, u, (l - 1) * w, l === 1 ? 0 : 1, rng(), (rng() - 0.5) * 0.02], i * 6); S.group[i] = 10 + k * 3 + l; S.order[i] = 0; i++; } });
      while (i < nBars) { const k = (rng() * this.segs.length) | 0; this.kind[i] = 1; this.d.set([k, rng(), 0, 0, rng(), 0], i * 6); S.group[i] = 10 + k * 3 + 1; i++; }
      for (let c = 0; c < nSpark; c++, i++) { this.kind[i] = 2; this.d.set([c, 0, 0, 0, 0, -9], i * 6); S.group[i] = -100 - c; S.order[i] = 0.99; }
      for (let c = 0; c < nMark; c++, i++) { this.kind[i] = 3; this.d.set([c / nMark, rng(), rng(), 0, 0, 0], i * 6); S.group[i] = -5000 - c; S.order[i] = 0.99; }
      // coroa: cada ferramenta = segmentos com deriva/golpe (mesma lógica das barras), em órbita lenta
      this.tools = CROWN.map((name, k) => ({ name, k, segs: TOOLS[name].map((q, j) => ({ bx0: q[0], by0: q[1], bx1: q[2], by1: q[3], x0: q[0], y0: q[1], x1: q[2], y1: q[3], len: Math.hypot(q[2] - q[0], q[3] - q[1]), b: (rng() - 0.5) * 0.02, bv: 0, bt: 0, rot: 0, rv: 0, rt: 0, heat: 0.2, grow: 1, k: j })), ph: rng() * TAU, desc: { x: 0, v: 0 }, sc: (k % 3 === 2 ? 1.05 : k >= 3 ? 0.85 : 1) * 1.4, pos: [0, 0, 0, 1] }));
      const cLen = this.tools.reduce((a, T) => a + T.segs.reduce((b, q) => b + q.len, 0), 0), cds = cLen * 2 / nCrown; this.cds = cds;
      for (const T of this.tools) T.segs.forEach((q, j) => { const n = Math.max(2, Math.round(q.len / cds)); for (let c = 0; c < n; c++) for (let l = 0; l < 2; l++) { if (i >= nBars + nSpark + nMark + nCrown) break; this.kind[i] = 5; this.d.set([T.k, j, (c + 0.5) / n, l, rng(), rng()], i * 6); S.group[i] = -30000 - i; S.order[i] = 0.7 + 0.2 * rng(); i++; } });
      for (; i < N; i++) { this.kind[i] = 4; this.d.set([rng() * 1.4 - 0.7, rng(), rng(), rng(), 0, 0], i * 6); S.group[i] = 40; S.order[i] = 0.9; }
      this.sp = new Float32Array(nSpark * 6); this.nSpark = nSpark; this.sparkBase = nBars; this.nextCrown = 1.5;
    }
    /* ponto e direção numa barra levemente entortada (Bézier quadrática pelo desvio b, e rotação rot em torno do centro) */
    at(sg, u, out) {
      const cx = (sg.x0 + sg.x1) / 2, cy = (sg.y0 + sg.y1) / 2, c = Math.cos(sg.rot), s = Math.sin(sg.rot), uu = u * sg.grow;
      const ax = sg.x0 - cx, ay = sg.y0 - cy, bx = sg.x1 - cx, by = sg.y1 - cy;
      const X0 = cx + ax * c - ay * s, Y0 = cy + ax * s + ay * c, X1 = cx + bx * c - by * s, Y1 = cy + bx * s + by * c;
      const dx = X1 - X0, dy = Y1 - Y0, l = Math.hypot(dx, dy) + 1e-6, nx = -dy / l, ny = dx / l, mx = (X0 + X1) / 2 + nx * sg.b, my = (Y0 + Y1) / 2 + ny * sg.b;
      const q = 1 - uu; out[0] = q * q * X0 + 2 * q * uu * mx + uu * uu * X1; out[1] = q * q * Y0 + 2 * q * uu * my + uu * uu * Y1;
      const tx = 2 * q * (mx - X0) + 2 * uu * (X1 - mx), ty = 2 * q * (my - Y0) + 2 * uu * (Y1 - my), tl = Math.hypot(tx, ty) + 1e-6; out[2] = tx / tl; out[3] = ty / tl; return out;
    }
    strike(t) {
      // escolhe a barra mais torta (o golpe tem motivo: endireitar), às vezes outra
      let best = this.segs[0], bv = -1; for (const s of this.segs) { const v = Math.abs(s.b) + Math.abs(s.rot) * 0.6 + Math.random() * 0.02; if (v > bv) { bv = v; best = s; } }
      const u = best.ty === 4 ? 0.92 : 0.2 + Math.random() * 0.6, p = this.at(best, u, [0, 0, 0, 0]);
      best.bv += -best.b * 9 - Math.sign(best.b) * 0.05; best.bt = 0; best.rv += -best.rot * 7; best.rt = 0; best.heat = Math.min(1.4, best.heat + 0.8);
      this.mark = { x: p[0], y: p[1], dx: p[2], dy: p[3], t0: t, seg: best.k, seq: (this.mark ? this.mark.seq : 0) + 1 };
      const n = Math.min(this.nSpark, 18 + ((Math.random() * 26) | 0)), sp = this.sp;
      for (let k = 0; k < n; k++) { const j = this.sparkHead; this.sparkHead = (this.sparkHead + 1) % this.nSpark;
        const a = Math.atan2(p[3], p[2]) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 0.7 + Math.random() * 1.6;
        sp.set([p[0], p[1], Math.cos(a) * v, Math.sin(a) * v + 0.5, t, 0.35 + Math.random() * 0.75], j * 6); this.d[(this.sparkBase + j) * 6 + 1]++; }
      if (this.state) { this.state.lastMark = { x: p[0], y: p[1], dx: p[2], dy: p[3], seg: best.k, at: now() }; }
    }
    sparks(x, y, dx, dy, n, t, v0 = 1) { const sp = this.sp;
      for (let k = 0; k < Math.min(n, this.nSpark); k++) { const j = this.sparkHead; this.sparkHead = (this.sparkHead + 1) % this.nSpark;
        const a = Math.atan2(dy, dx) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = (0.4 + Math.random() * 0.9) * v0;
        sp.set([x, y, Math.cos(a) * v, Math.sin(a) * v + 0.3, t, 0.25 + Math.random() * 0.45], j * 6); this.d[(this.sparkBase + j) * 6 + 1]++; } }
    /* coroa: órbita lenta; cada peça se remolda (lingote ↔ ferramenta), entorta e é endireitada; vibra no trabalho; a ferramenta da tarefa desce */
    updateCrown(t, dt) {
      const ST = this.state, inUse = ST.phase === 'trabalhando' && ST.task ? TASK_TOOL[ST.task.id] ?? -1 : -1, w = this.work;
      this.crownA = (this.crownA || 0) + dt * lerp(0.1, 0.24, smooth(0.3, 1, w));
      if (dt > 0) { this.nextCrown -= dt; if (this.nextCrown <= 0) { let best = null, bv = -1; for (const T of this.tools) for (const q of T.segs) { const v = Math.abs(q.b) + Math.random() * 0.01; if (v > bv) { bv = v; best = [T, q]; } }
        const [T, q] = best; q.bv += -q.b * 10; q.bt = 0; q.heat = 1.1; const P = T.pos, m = this.crownPt(T, q, 0.5, [0, 0, 0, 0]); this.sparks(m[0], m[1], m[2], m[3], 6, t, 0.6); this.nextCrown = lerp(2.6, 0.8, w) * (0.6 + 0.8 * Math.random()); } }
      this.tools.forEach((T, k) => {
        const m = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(t * 0.23 + T.ph));          // moldando-se: do lingote à ferramenta
        T.segs.forEach(q => { q.x0 = q.bx0 * m; q.y0 = q.by0 * m; q.x1 = q.bx1 * m; q.y1 = q.by1 * m;
          if (dt > 0) q.bt = clamp(q.bt + (Math.random() - 0.5) * dt * 0.05, -0.022, 0.022);
          const ww = 6; q.bv += (ww * ww * (q.bt - q.b) - 2 * 0.5 * ww * q.bv) * dt; q.b += q.bv * dt; q.heat += (0.3 - q.heat) * Math.min(1, dt * 0.5); });
        PT.M.critSpring(T.desc, k === inUse ? 1 : 0, 2.2, dt);
        const a = k / this.tools.length * TAU + this.crownA, ds = T.desc.x, jit = 0.006 * smooth(0.4, 1, w);
        const ox = Math.sin(a) * CROWN_R, oz = Math.cos(a) * CROWN_R, oy = CROWN_Y + 0.07 * Math.cos(a);
        T.pos[0] = lerp(ox, 0.0, ds) + jit * Math.sin(t * 41 + k * 3); T.pos[1] = lerp(oy, 0.5, ds) + jit * Math.sin(t * 37 + k); T.pos[2] = lerp(oz, 0.45, ds);
        T.pos[3] = lerp(T.sc * (0.8 + 0.22 * (oz / CROWN_R)), 2.2, ds); T.front = lerp(0.5 + 0.5 * oz / CROWN_R, 1, ds);
      });
    }
    crownPt(T, q, u, out) { this.at(q, u, out); const s = T.pos[3]; out[0] = T.pos[0] + out[0] * s; out[1] = T.pos[1] + out[1] * s; return out; }
    update(eng, t, dt) {
      const S = eng.S, N = eng.N, d = this.d, ST = this.state, segs = this.segs, tmp = [0, 0, 0, 0];
      const working = ST.phase === 'trabalhando' ? 1 : ST.phase === 'entregando' ? 0.6 : 0.25; this.work += (working - this.work) * Math.min(1, dt * 1.5);
      if (dt > 0) { this.nextStrike -= dt; if (this.nextStrike <= 0) { this.strike(t); this.nextStrike = lerp(2.6, 0.45, this.work) * (0.6 + 0.8 * Math.random()); } }
      // barras: desvio entorta devagar (deriva aleatória) e mola endireita — ajuste constante, nunca parado
      for (const s of segs) {
        if (dt > 0) { s.bt = clamp(s.bt + (Math.random() - 0.5) * dt * 0.09, -0.05, 0.05); s.rt = clamp(s.rt + (Math.random() - 0.5) * dt * 0.05, -0.04, 0.04); }
        const w = 5.5; s.bv += (w * w * (s.bt - s.b) - 2 * 0.55 * w * s.bv) * dt; s.b += s.bv * dt; s.rv += (w * w * (s.rt - s.rot) - 2 * 0.6 * w * s.rv) * dt; s.rot += s.rv * dt;
        s.heat += (0.25 - s.heat) * Math.min(1, dt * 0.35);
        if (s.ty === 4) s.grow = 0.74 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.21)) + 0.04 * this.work;
      }
      this.updateCrown(t, dt);
      const M = this.mark, sizeBar = eng.sizeFor(this.ds) * 1.35;
      for (let i = 0; i < N; i++) { const o = i * 6, kd = this.kind[i];
        if (kd === 1) { const sg = segs[d[o]], u = d[o + 1], p = this.at(sg, u, tmp), lane = d[o + 2], rim = d[o + 3];
          const x = p[0] - p[3] * lane, y = p[1] + p[2] * lane, r = Math.hypot(x * 0.9, y), cool = smooth(0.25, 0.98, r);
          let heat = lerp(0.74, 0.12, cool) + 0.18 * (sg.heat - 0.25) + 0.05 * Math.sin(t * 1.7 + d[o + 4] * 12);
          if (rim) heat = Math.max(heat, 0.44 + 0.08 * Math.sin(t * 2.3 + u * 9 + d[o + 4] * 5));   // borda sempre ligeiramente incandescente
          if (sg.ty === 4) heat = Math.max(heat, smooth(0.78, 1, u) * 0.98);                        // ponta em forja: quase branca
          if (M && M.seg === sg.k) { const dm = Math.hypot(x - M.x, y - M.y), age = t - M.t0; heat += 0.55 * Math.exp(-dm * dm / 0.006) * Math.exp(-age / 0.7); }
          const c = FORGE(heat);
          writeSlot(S, i, x, y, d[o + 5], c[0], c[1], c[2], rim ? 0.82 : 0.95, sizeBar * (rim ? 0.95 : 2.4), 0.9, 0.01, rim ? 5 : 1, Math.atan2(p[3], p[2])); continue; }
        if (kd === 2) { const j = d[o], q = j * 6, sp = this.sp, age = t - sp[q + 4], life = sp[q + 5];
          if (!(age >= 0 && age < life)) { writeSlot(S, i, M ? M.x : 0, M ? M.y : 0, 0.05, 0, 0, 0, 0, 0.3, 0.9, 0, 0); continue; }
          if (S.warp[i] !== d[o + 1]) S.warp[i] = d[o + 1];   // nova fagulha nasce no ponto do golpe (não viaja até lá)
          const x = sp[q] + sp[q + 2] * age, y = sp[q + 1] + sp[q + 3] * age - 1.9 * age * age, f = age / life, c = FORGE(1 - f * 0.75);
          writeSlot(S, i, x, y, 0.08, c[0] * 1.2, c[1] * 1.15, c[2], (1 - f) * 0.95, 0.9 * (1 - 0.5 * f), 0.98, 0, 3, Math.atan2(sp[q + 3] - 3.8 * age, sp[q + 2])); continue; }
        if (kd === 3) { // marca do martelo: amassado elíptico que aparece e alisa de volta
          if (!M) { writeSlot(S, i, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.8, 0, 0); continue; }
          if (S.warp[i] !== M.seq) S.warp[i] = M.seq;
          const age = t - M.t0, sm = smooth(0, 1.2, age), a = d[o] * TAU, ring = d[o + 1] < 0.7, rr = ring ? 0.034 * (1 - 0.55 * sm) : 0.016 * Math.sqrt(d[o + 2]) * (1 - 0.6 * sm);
          const ex = Math.cos(a) * rr * 1.6, ey = Math.sin(a) * rr * 0.75, x = M.x + ex * M.dx - ey * M.dy, y = M.y + ex * M.dy + ey * M.dx, c = FORGE(lerp(1.0, 0.5, sm));
          writeSlot(S, i, x, y, 0.06, c[0], c[1], c[2], (ring ? 0.9 : 0.6) * (1 - smooth(0.6, 1.6, age)), ring ? 0.55 : 0.7, 0.95, 0, ring ? 0 : 1); continue; }
        if (kd === 5) { // coroa: núcleo de lava + casca de ferro fundido salpicada de brasa
          const T = this.tools[d[o]], q = T.segs[d[o + 1]], u = d[o + 2], iron = d[o + 3] > 0.5, p = this.crownPt(T, q, u, tmp), sc = T.pos[3], off = iron ? (d[o + 4] < 0.5 ? -1 : 1) * 0.008 * sc : 0;
          const x = p[0] - p[3] * off, y = p[1] + p[2] * off, fr = T.front, speck = Math.pow(d[o + 5], 6) * (0.6 + 0.4 * Math.sin(t * 1.3 + d[o + 4] * 20));
          const heat = iron ? 0.16 + 0.42 * speck + 0.1 * (q.heat - 0.3) : 0.66 + 0.16 * Math.sin(t * 1.9 + u * 7 + d[o + 4] * 4) + 0.25 * (q.heat - 0.3) + 0.12 * T.desc.x, c = FORGE(heat);
          writeSlot(S, i, x, y, T.pos[2] * 0.6, c[0], c[1], c[2], (iron ? 0.75 : 0.9) * (0.4 + 0.6 * fr), eng.sizeFor(this.cds * sc) * (iron ? 1.4 : 2.0), 0.85, 0.0, iron ? 5 : 1, Math.atan2(p[3], p[2])); continue; }
        // brasas soltas subindo das partes quentes
        const ph = (t * (0.08 + 0.06 * d[o + 3]) + d[o + 1]) % 1, x = d[o] + 0.05 * Math.sin(t * 0.8 + d[o + 2] * 20), y = -0.4 + ph * 1.5, c = FORGE(0.75 - ph * 0.5);
        writeSlot(S, i, x, y, -0.1, c[0], c[1], c[2], 0.22 * Math.sin(Math.PI * ph) * (0.5 + 0.5 * this.work), 0.4, 0.5, 0.12, 0);
      }
      centerFocus(eng, 0, 0.2);
    }
  }

  /* ausente: só a última marca resfriando — nunca um espaço vazio/genérico */
  class OgumMarkForm {
    constructor(state, opts = {}) { this.extent = [0.36, 0.36]; this.state = state || {}; this.opts = opts; this.churn = 0; this.linkAlpha = 0; this.buildTime = 1.6; this.next = 2; this.spark = null; }
    camera() { const L = this.state.lastMark; return { x: L ? L.x : 0, y: L ? L.y : 0, zoom: this.opts.zoom || 1 }; }   // enquadra a marca: pequena, mas legível
    build(eng) {
      const N = eng.N, S = eng.S, rng = mulberry32(99), nMark = Math.max(30, Math.round(N * 0.05)), nFrag = Math.max(24, Math.round(N * 0.04)), nSp = 6;
      this.kind = new Uint8Array(N); this.d = new Float32Array(N * 4); let i = 0;
      for (let c = 0; c < nMark; c++, i++) { this.kind[i] = 1; this.d.set([c / nMark, rng(), rng(), rng()], i * 4); S.group[i] = -10 - c; S.order[i] = 0.2 * rng(); }
      for (let c = 0; c < nFrag; c++, i++) { this.kind[i] = 2; this.d.set([(c + 0.5) / nFrag, (c % 3) - 1, rng(), 0], i * 4); S.group[i] = 5; S.order[i] = 0.3 + 0.3 * rng(); }
      for (let c = 0; c < nSp; c++, i++) { this.kind[i] = 3; this.d.set([c, rng(), rng(), 0], i * 4); S.group[i] = -900 - c; S.order[i] = 0.9; }
      for (; i < N; i++) { this.kind[i] = 0; S.stem[i] = 1; }
    }
    update(eng, t, dt) {
      const S = eng.S, N = eng.N, d = this.d, L = this.state.lastMark || { x: 0.08, y: 0.1, dx: 1, dy: 0, at: now() - 7200 };
      const since = Math.max(0, now() - L.at), cool = Math.exp(-since / 95);   // ~1,5 min para ficar quase fria; nunca some de todo
      const k = 0.17 + 0.78 * cool;   // nunca fria de todo: brasa meio apagada
      if (dt > 0 && cool > 0.25) { this.next -= dt; if (this.next <= 0) { this.spark = { t0: t, a: Math.random() * TAU }; this.next = 3 + Math.random() * 5 / cool; } }
      for (let i = 0; i < N; i++) { const o = i * 4, kd = this.kind[i];
        if (kd === 0) continue;
        if (kd === 1) { const a = d[o] * TAU, ring = d[o + 1] < 0.65, rr = ring ? 0.034 : 0.018 * Math.sqrt(d[o + 2]), br = 1 + 0.03 * Math.sin(t * 0.8 + d[o + 3] * 3) * (0.35 + cool), ex = Math.cos(a) * rr * 1.6 * br, ey = Math.sin(a) * rr * 0.75 * br;   // a brasa ainda respira enquanto esfria
          const c = FORGE(k * (ring ? 0.85 : 1) + 0.03 * Math.sin(t * 0.9 + d[o + 3] * 9) * cool);
          writeSlot(S, i, L.x + ex * L.dx - ey * L.dy, L.y + ex * L.dy + ey * L.dx, 0.02, c[0], c[1], c[2], (ring ? 0.75 : 0.55) * (0.35 + 0.65 * Math.max(cool, 0.25)), ring ? 0.6 : 0.75, 0.9, 0.005, ring ? 0 : 1); continue; }
        if (kd === 2) { const u = d[o] - 0.5, lane = d[o + 1] * 0.012, x = L.x + L.dx * u * 0.22 - L.dy * lane, y = L.y + L.dy * u * 0.22 + L.dx * lane, c = FORGE(k * (1 - Math.abs(u) * 1.2) * 0.9);
          writeSlot(S, i, x, y, 0, c[0], c[1], c[2], 0.5 * (1 - Math.abs(u) * 1.3) * (0.4 + 0.6 * Math.max(cool, 0.2)), eng.sizeFor(0.22 / 10) * 1.2, 0.9, 0, 5, Math.atan2(L.dy, L.dx)); continue; }
        const sp = this.spark, age = sp ? t - sp.t0 : 9;   // uma fagulha que ainda escapa de vez em quando
        if (age > 0.8) { writeSlot(S, i, L.x, L.y, 0.05, 0, 0, 0, 0, 0.3, 0.9, 0, 0); continue; }
        const a = sp.a + d[o + 1] * 0.8, v = 0.35 + 0.4 * d[o + 2], c = FORGE(0.95 - age);
        writeSlot(S, i, L.x + Math.cos(a) * v * age, L.y + Math.sin(a) * v * age + 0.3 * age - 1.2 * age * age, 0.05, c[0], c[1], c[2], (1 - age / 0.8) * 0.8, 0.5, 0.97, 0, 3);
      }
      centerFocus(eng, L.x, L.y);
    }
  }

  PT.FORMS = PT.FORMS || {}; PT.LOOKS = PT.LOOKS || {};
  PT.FORMS.ogum = (state, opts) => new OgumForm(state, opts);
  PT.FORMS.ogumMarca = (state, opts) => new OgumMarkForm(state, opts);
  PT.LOOKS.ogum = {
    cfg: { stemColor: [0.32, 0.12, 0.05], stemAlpha: 0, transitAlpha: 0.3, transitColor: [1.3, 0.55, 0.16], flash: 0.35, buildTime: 2.4, churnRate: 0.12 },
    look: { bg0: [0.026, 0.018, 0.016], bg1: [0.005, 0.004, 0.004], glow: [0.4, 0.14, 0.04], glowAmt: 0.1, bloom: 1.05, exposure: 1.25, grain: 0.016, vignette: 0.42 },
    // diretor: presente → forja; ausente → só a última marca
    pick: st => (st.phase && st.phase !== 'ausente') ? 'ogum' : 'ogumMarca'
  };
  PT.OgumForm = OgumForm; PT.OgumMarkForm = OgumMarkForm;
})(window.PT);
