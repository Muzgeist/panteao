/* =====================================================================
   NYX — núcleo-constelação + asas + auréola
   ---------------------------------------------------------------------
   Princípio "núcleo + material + silhueta":
   • NÚCLEO: esfera cuja casca é a constelação (árvore geradora mínima +
     arestas extras → conexa por construção; linhas 'rigid' que NUNCA se
     rompem). Pulso lento percorre as arestas = processamento.
   • SILHUETA: asas grandes de penas de luz.
       ABERTAS  → revelam o núcleo inteiro (ativa / respondendo)
       VÉU      → envolvem o núcleo; só brilho passa por elas (calma, ouvindo)
     Sinal: state.available + engajamento (processing, attention,
     engagedUntil). A transição é sempre lenta, por gradiente.
   • AURÉOLA: faixa de pontos girando devagar acima do conjunto.
   • DETALHE: poeira de estrela se solta e cai suave — amarrada a evento de
     resposta significativa (state.dustSeq), nunca aleatória.
   • Cor: violeta profundo ↔ prata fria. Nada de magenta/quente (Lilith).
   • Notificação: adensa na direção de state.attention.angle; nunca pisca.
   ===================================================================== */
'use strict';
(function (PT) {
  const { TAU, clamp, lerp, smooth, mulberry32 } = PT.M, writeSlot = PT.writeSlot, centerFocus = PT.centerFocus;
  const VIOLET = [0.34, 0.24, 0.86], VIOLET_DEEP = [0.16, 0.11, 0.46], SILVER = [0.80, 0.84, 0.98], SILVER_COLD = [0.62, 0.70, 0.92];
  const RC = 0.34, CY = -0.06, NF = 9, PIV = [0.1, 0.1];   // raio do núcleo, centro y, penas por asa, ombro
  const now = () => (PT.now ? PT.now() : performance.now() / 1000);

  class NyxForm {
    constructor(state, opts = {}) {
      this.extent = [1.4, 1.0];
      this.state = state || {}; this.opts = opts;
      this.linkMode = 'rigid'; this.linkAlpha = 0.4; this.churn = 0.16; this.buildStyle = 'grow';
      this.att = 0; this.attAng = 0.6; this.proc = 0; this.open = 0.15; this.dim = 0; this.pulses = []; this.nextPulse = 0.8;
      this.dust = []; this.lastDust = this.state.dustSeq || 0;
    }
    camera() { return { x: 0, y: 0.02, zoom: this.opts.zoom || 1 }; }
    build(eng) {
      const N = eng.N, S = eng.S, rng = mulberry32(this.opts.seed || 777);
      const K = clamp(Math.round(N / 190), 12, 26);
      // estrelas na casca do núcleo (direções unitárias com distância mínima)
      const st = []; let tries = 0;
      while (st.length < K && tries++ < 8000) { const u = rng() * 2 - 1, a = rng() * TAU, q = Math.sqrt(1 - u * u), d = [q * Math.cos(a), u, q * Math.sin(a)];
        if (st.every(s => Math.hypot(s.d[0] - d[0], s.d[1] - d[1], s.d[2] - d[2]) > 0.5)) st.push({ d, mag: 0.55 + rng() * 0.45, tw: rng() * TAU }); }
      const dist = (a, b) => Math.hypot(st[a].d[0] - st[b].d[0], st[a].d[1] - st[b].d[1], st[a].d[2] - st[b].d[2]);
      const E = [], inT = new Uint8Array(st.length); inT[0] = 1;
      for (let n = 1; n < st.length; n++) { let best = null, bd = 1e9; for (let a = 0; a < st.length; a++) if (inT[a]) for (let b = 0; b < st.length; b++) if (!inT[b]) { const d = dist(a, b); if (d < bd) { bd = d; best = [a, b]; } } inT[best[1]] = 1; E.push(best); }
      const has = (a, b) => E.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
      const cand = []; for (let a = 0; a < st.length; a++) for (let b = a + 1; b < st.length; b++) if (!has(a, b) && dist(a, b) < 0.8) cand.push([a, b, dist(a, b)]);
      cand.sort((p, q) => p[2] - q[2]); for (let i = 0; i < Math.round(st.length * 0.3) && i < cand.length; i++) E.push([cand[i][0], cand[i][1]]);
      this.stars = st; this.edges = E.map(e => ({ a: e[0], b: e[1], len: dist(e[0], e[1]) * RC }));
      this.adj = st.map(() => []); this.edges.forEach((e, k) => { this.adj[e.a].push(k); this.adj[e.b].push(k); });
      const totLen = this.edges.reduce((s, e) => s + e.len, 0);
      const nHalo = Math.max(3, Math.round(N * 0.035 / st.length)), nChain = Math.round(N * 0.13), nNeb = Math.round(N * 0.06), nFeat = Math.round(N * 0.16), nFill = Math.round(N * 0.12),
        nRing = Math.round(N * 0.05), nDust = 24, nRes = Math.round(N * 0.06), nHead = 24;
      this.kind = new Uint8Array(N); this.d = new Float32Array(N * 6); this.coreSlot = new Int32Array(st.length);
      let i = 0; const put = (kd, arr, g, o) => { this.kind[i] = kd; this.d.set(arr, i * 6); S.group[i] = g; S.order[i] = o; i++; };
      for (let k = 0; k < st.length; k++) { this.coreSlot[k] = i; put(1, [k, 0, 0, 0, 0, 0], -1 - k, 0.08 + 0.1 * rng()); }
      for (let k = 0; k < st.length; k++) for (let h = 0; h < nHalo; h++) { const a = rng() * TAU, u = rng() * 2 - 1, q = Math.sqrt(1 - u * u), rr = 0.008 + 0.03 * Math.pow(rng(), 1.6); put(2, [k, q * Math.cos(a) * rr, u * rr, q * Math.sin(a) * rr, rng(), 0], 200 + k, 0.2 + 0.2 * rng()); }
      const per = totLen / nChain;
      for (let e = 0; e < this.edges.length; e++) { const n = Math.max(2, Math.round(this.edges[e].len / per)); for (let c = 0; c < n && i < N; c++) put(3, [e, (c + 0.5) / n, rng(), 0, 0, 0], 1000 + e, 0.25 + 0.2 * rng()); }
      for (let h = 0; h < nHead && i < N; h++) put(4, [h % 3, (h / 3 | 0) / 8, 0, 0, 0, 0], 5000 + (h % 3), 0.95);
      for (let h = 0; h < nNeb && i < N; h++) { const u = rng() * 2 - 1, a = rng() * TAU, q = Math.sqrt(1 - u * u), rr = Math.cbrt(rng()) * RC * 0.85; put(6, [q * Math.cos(a) * rr, u * rr, q * Math.sin(a) * rr, rng(), 0, 0], 7000, 0.05 + 0.1 * rng()); }
      // asas: penas (raios de pontos) e preenchimento (membrana de poeira entre penas)
      const pf = Math.max(6, Math.floor(nFeat / (2 * NF)));
      for (const side of [1, -1]) for (let f = 0; f < NF; f++) for (let c = 0; c < pf && i < N; c++) put(8, [side, f, (c + 0.5) / pf, rng(), 0, 0], -20000 - (side > 0 ? 0 : 1000) - f * 50 - c, 0.45 + 0.35 * ((c + 0.5) / pf));
      for (let h = 0; h < nFill && i < N; h++) put(9, [rng() < 0.5 ? 1 : -1, rng() * (NF - 1), 0.08 + 0.7 * Math.pow(rng(), 0.8), rng(), 0, 0], 7100 + (h & 1), 0.55 + 0.3 * rng());
      // auréola: anel principal + anel interno esparso
      for (let h = 0; h < nRing && i < N; h++) put(10, [h / nRing, h % 4 === 0 ? 1 : 0, rng(), 0, 0, 0], -40000 - h, 0.9);
      for (let h = 0; h < nDust && i < N; h++) put(11, [h, 0, 0, 0, 0, 0], -50000 - h, 0.99);
      for (let h = 0; h < nRes && i < N; h++) put(5, [rng() - 0.5, 0.45 + Math.pow(rng(), 0.7) * 0.8, (rng() - 0.5) * 0.5, rng(), rng() < 0.12 ? 1 : 0, rng()], 6000, 0.97);
      for (; i < N;) { const u = rng() * 2 - 1, a = rng() * TAU, q = Math.sqrt(1 - u * u), rr = 1.25 + rng() * 1.2; put(7, [q * Math.cos(a) * rr * 1.25, u * rr * 0.75, -0.6 - rng() * 1.6, rng(), rng(), 0], 8000, 0.6 + 0.4 * rng()); }
      const L = []; this.edges.forEach(e => L.push(this.coreSlot[e.a], this.coreSlot[e.b])); this.links = new Int32Array(L);
      this.linkA = new Float32Array(this.edges.length).fill(1);
      this.starBoost = new Float32Array(st.length); this.P = st.map(() => [0, 0, 0]);
    }
    spawnPulse() {
      const st = this.stars; let cur = (Math.random() * st.length) | 0; const seen = new Set([cur]), path = [];
      for (let h = 0, hops = 4 + ((Math.random() * 5) | 0); h < hops; h++) { const opts = this.adj[cur].filter(k => !seen.has(this.edges[k].a === cur ? this.edges[k].b : this.edges[k].a)); if (!opts.length) break;
        const k = opts[(Math.random() * opts.length) | 0], E = this.edges[k], nxt = E.a === cur ? E.b : E.a; path.push({ e: k, dir: E.a === cur ? 1 : -1, from: cur, to: nxt }); seen.add(nxt); cur = nxt; }
      if (!path.length) return;
      let c = 0; path.forEach(p => { p.c0 = c; c += this.edges[p.e].len; });
      this.pulses.push({ path, total: c, d: 0, speed: 0.16 + 0.08 * this.proc, slot: [0, 1, 2].find(s => !this.pulses.some(p => p.slot === s)) ?? 0, map: new Map(path.map((p, j) => [p.e, j])) });
    }
    /* pena: VÉU = arco em volta do núcleo (as asas se fecham como um casulo, cada pena numa camada);
       ABERTA = raio a partir do ombro, estendido para fora. A transição desdobra de um para o outro. */
    feather(side, f, u, e, t, out) {
      const fn = f / (NF - 1);
      const Lo = 0.4 + 0.7 * Math.pow(1 - fn, 0.55), tho = lerp(0.95, -0.7, fn) - u * u * (0.55 - 0.25 * fn) + 0.035 * Math.sin(t * 0.45 + fn * 2) * e;   // penas arqueadas: as de cima sobem e caem na ponta
      const ox = PIV[0] + Math.cos(tho) * u * Lo, oy = PIV[1] + Math.sin(tho) * u * Lo, oz = -0.05 * u;
      const Rv = RC + 0.07 + 0.028 * f, psi = 1.3 - u * (1.75 + 1.1 * (1 - fn)) + 0.02 * Math.sin(t * 0.3 + f), breathe = 1 + 0.012 * Math.sin(t * 0.4);
      const cx = Math.cos(psi) * Rv * breathe, cy = Math.sin(psi) * Rv * breathe * 1.06, cz = 0.1 + 0.16 * Math.sin(u * Math.PI) - 0.012 * f;
      out[0] = side * lerp(cx, ox, e); out[1] = CY + lerp(cy, oy, e); out[2] = lerp(cz, oz, e); return out;
    }
    update(eng, t, dt) {
      const S = eng.S, N = eng.N, d = this.d, st = this.stars, ST = this.state;
      const tgtAtt = ST.attention ? clamp(ST.attention.level || 0, 0, 1) : 0, tgtProc = clamp(ST.processing || 0, 0, 1);
      this.att += (tgtAtt - this.att) * Math.min(1, dt * 0.8); this.proc += (tgtProc - this.proc) * Math.min(1, dt * 0.6);
      if (ST.attention && ST.attention.angle != null) { let da = ST.attention.angle - this.attAng; da = Math.atan2(Math.sin(da), Math.cos(da)); this.attAng += da * Math.min(1, dt * 0.7); }
      const avail = ST.available !== false;
      this.dim += ((avail ? 0 : 1) - this.dim) * Math.min(1, dt * 0.5);
      // engajamento → asas: abertas quando ativa/respondendo, véu quando calma
      const engaged = avail ? Math.max(tgtProc > 0.45 ? 1 : 0, tgtAtt, (ST.engagedUntil || 0) > now() ? 1 : 0, this.opts.open ?? 0) : 0;
      this.open += (engaged - this.open) * Math.min(1, dt * 0.55);
      const e = smooth(0, 1, this.open), veil = 1 - e;
      // poeira de estrela: só quando há resposta significativa
      if ((ST.dustSeq || 0) !== this.lastDust) { this.lastDust = ST.dustSeq || 0; const n = 2 + ((Math.random() * 3) | 0); for (let k = 0; k < n; k++) this.dust.push({ t0: t + k * 0.45, star: (Math.random() * st.length) | 0, sw: Math.random() * TAU, slot: -1 }); if (this.dust.length > 24) this.dust.splice(0, this.dust.length - 24); }
      this.dust = this.dust.filter(m => t - m.t0 < 6.5);
      this.dust.forEach((m, k) => m.slot = k);
      if (dt > 0) { this.nextPulse -= dt; if (this.nextPulse <= 0 && this.pulses.length < 3 && this.dim < 0.5) { this.spawnPulse(); this.nextPulse = lerp(6.5, 1.4, this.proc) * (0.7 + 0.6 * Math.random()); } }
      for (const p of this.pulses) p.d += dt * p.speed;
      this.pulses = this.pulses.filter(p => p.d < p.total + 0.4);
      // rotação lentíssima do núcleo
      const yaw = t * 0.05, cy = Math.cos(yaw), sy = Math.sin(yaw), pit = 0.28, cp = Math.cos(pit), sp = Math.sin(pit);
      const rot = (x, y, z, o) => { const X = x * cy + z * sy, Z = -x * sy + z * cy, Y = y * cp - Z * sp, Z2 = y * sp + Z * cp; o[0] = X; o[1] = Y; o[2] = Z2; return o; };
      const P = this.P; st.forEach((s, k) => rot(s.d[0], s.d[1], s.d[2], P[k]));
      const drift = 0.5 + 0.5 * Math.sin(t * 0.045), dimK = 1 - 0.72 * this.dim, coreVis = (0.42 + 0.58 * e) * dimK;
      const aDir = [Math.cos(this.attAng), Math.sin(this.attAng)];
      const near = (x, y) => { const l = Math.hypot(x, y) + 1e-4; return smooth(0.55, 0.95, (x * aDir[0] + y * aDir[1]) / l); };
      this.starBoost.fill(0);
      for (const p of this.pulses) p.path.forEach((h, j) => { const nd = h.c0 + this.edges[h.e].len, bk = p.d - nd; if (bk > -0.03) this.starBoost[h.to] += Math.exp(-Math.max(0, bk) / 0.2) * smooth(-0.03, 0.01, bk); if (j === 0) this.starBoost[h.from] += Math.exp(-p.d / 0.15); });
      const tmp = [0, 0, 0], fp = [0, 0, 0], ph = (t * 0.11) % 1.7;
      for (let i = 0; i < N; i++) { const o = i * 6, kd = this.kind[i];
        if (kd === 1) { const k = d[o], s = st[k], q = P[k], fr = smooth(-0.6, 0.6, q[2]), tw = 0.85 + 0.15 * Math.sin(t * 0.7 + s.tw), bo = this.starBoost[k], an = this.att * near(q[0], q[1]);
          const lum = (0.55 + 0.45 * fr + 0.6 * bo + 0.4 * an) * tw * coreVis, c0 = lerp(SILVER_COLD[0], SILVER[0], drift), c1 = lerp(SILVER_COLD[1], SILVER[1], drift), c2 = lerp(SILVER_COLD[2], SILVER[2], drift);
          writeSlot(S, i, q[0] * RC, CY + q[1] * RC, q[2] * RC, c0 * lum, c1 * lum, c2 * lum, (0.4 + 0.45 * fr) * (0.5 + 0.5 * s.mag) * coreVis + 0.25 * bo, (1.3 + 0.9 * s.mag) * (0.75 + 0.25 * fr) * (1 + 0.3 * bo), 0.95, 0, 0); continue; }
        if (kd === 2) { const k = d[o], q = P[k], fr = smooth(-0.6, 0.6, q[2]), bo = this.starBoost[k];
          writeSlot(S, i, q[0] * RC + d[o + 1], CY + q[1] * RC + d[o + 2], q[2] * RC + d[o + 3], lerp(VIOLET[0], SILVER[0], 0.45), lerp(VIOLET[1], SILVER[1], 0.45), lerp(VIOLET[2], SILVER[2], 0.45), (0.12 + 0.2 * fr + 0.2 * bo) * coreVis, 0.5 + 0.3 * d[o + 4], 0.85, 0.02, 0); continue; }
        if (kd === 3) { const eI = d[o] | 0, E = this.edges[eI], u = d[o + 1], A = P[E.a], B = P[E.b];
          let x = lerp(A[0], B[0], u), y = lerp(A[1], B[1], u), z = lerp(A[2], B[2], u); const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;   // arco sobre a casca
          let bo = 0; for (const p of this.pulses) { const j = p.map.get(eI); if (j === undefined) continue; const h = p.path[j], cd = h.c0 + (h.dir > 0 ? u : 1 - u) * E.len, bk = p.d - cd; if (bk > -0.02) bo += Math.exp(-Math.max(0, bk) / 0.09) * smooth(-0.02, 0, bk); }
          const fr = smooth(-0.6, 0.6, z), m = clamp(0.25 + 0.5 * drift * u + bo * 0.6, 0, 1);
          writeSlot(S, i, x * RC, CY + y * RC, z * RC, lerp(VIOLET[0], SILVER[0], m) * (1 + bo), lerp(VIOLET[1], SILVER[1], m) * (1 + bo), lerp(VIOLET[2], SILVER[2], m) * (1 + 0.8 * bo), (0.12 + 0.2 * fr + 0.5 * bo) * coreVis, 0.4 + 0.5 * bo, 0.95, 0, 0); continue; }
        if (kd === 4) { const slot = d[o], lag = d[o + 1], p = this.pulses.find(q => q.slot === slot);
          if (!p) { writeSlot(S, i, 0, CY, 0, 0, 0, 0, 0, 0.4, 0.4, 0.05, 0); continue; }
          const dd = clamp(p.d - lag * 0.05, 0, p.total - 1e-4); let j = 0; while (j < p.path.length - 1 && dd > p.path[j].c0 + this.edges[p.path[j].e].len) j++;
          const h = p.path[j], E = this.edges[h.e], uu = clamp((dd - h.c0) / E.len, 0, 1), u = h.dir > 0 ? uu : 1 - uu, A = P[E.a], B = P[E.b];
          let x = lerp(A[0], B[0], u), y = lerp(A[1], B[1], u), z = lerp(A[2], B[2], u); const l = Math.hypot(x, y, z) || 1;
          const fade = smooth(0, 0.1, p.d) * (1 - smooth(p.total, p.total + 0.35, p.d)) * (1 - lag * 0.8);
          writeSlot(S, i, x / l * RC, CY + y / l * RC, z / l * RC, SILVER[0] * 1.3, SILVER[1] * 1.3, SILVER[2] * 1.35, 0.75 * fade * coreVis, 0.85 - lag * 0.4, 0.6, 0, 0); continue; }
        if (kd === 6) { writeSlot(S, i, d[o], CY + d[o + 1], d[o + 2], VIOLET_DEEP[0] * 1.2, VIOLET_DEEP[1] * 1.2, VIOLET_DEEP[2] * 1.3, (0.07 + 0.04 * this.proc) * (0.6 + 0.4 * e) * dimK, 2.4 + 1.6 * d[o + 3], 0.4, 0.04, 0); continue; }
        if (kd === 8 || kd === 9) { // asas
          const side = d[o], f = d[o + 1], u = d[o + 2], fn = f / (NF - 1); this.feather(side, f, u, e, t, fp);
          const band = Math.exp(-Math.pow(((u * 0.9 + fn * 0.55 - ph + 1.7) % 1.7) - 0.35, 2) / 0.012);    // brilho que passa pelo véu
          const tip = kd === 8 && u > 0.9 ? 1 : 0, m = clamp(0.35 + 0.45 * u + 0.2 * tip, 0, 1);
          const r = lerp(VIOLET[0], SILVER[0], m), g = lerp(VIOLET[1], SILVER[1], m), b = lerp(VIOLET[2], SILVER[2], m);
          let a, sz;
          if (kd === 8) { a = (e * (0.5 + 0.4 * tip) + veil * (0.22 + 0.5 * band)) * dimK; sz = 0.55 + 0.9 * tip * e + 0.3 * band * veil; }
          else { a = (e * 0.2 + veil * (0.07 + 0.18 * band)) * (1 - u * 0.4) * dimK; sz = 0.9 + 0.8 * d[o + 3] + 0.5 * e; fp[2] += (d[o + 3] - 0.5) * 0.04; }
          const lum = 1 + 0.6 * band * veil + 0.4 * tip * e;
          writeSlot(S, i, fp[0], fp[1], fp[2], r * lum, g * lum, b * lum, a, sz, 0.85, kd === 9 ? 0.04 : 0.01, 0); continue; }
        if (kd === 10) { // auréola
          const a = d[o] * TAU + t * 0.13, inner = d[o + 1] > 0.5, R = inner ? 0.2 : 0.29, z = Math.sin(a) * R, fr = smooth(-0.25, 0.25, z);
          writeSlot(S, i, Math.cos(a) * R, CY + RC + 0.32 + Math.sin(a) * R * 0.2 + (inner ? 0.015 : 0), z, SILVER[0] * 1.1, SILVER[1] * 1.1, SILVER[2] * 1.15, (inner ? 0.18 : 0.32 + 0.38 * fr) * dimK * (0.75 + 0.25 * e), inner ? 0.45 : 0.55 + 0.2 * fr, 0.9, 0, 0); continue; }
        if (kd === 11) { const m = this.dust.find(q => q.slot === d[o]);
          if (!m || t < m.t0) { writeSlot(S, i, 0, CY, 0, 0, 0, 0, 0, 0.4, 0.6, 0, 0); continue; }
          const q = P[m.star], age = t - m.t0, x0 = q[0] * RC, y0 = CY + q[1] * RC;
          if (S.warp[i] !== Math.round(m.t0 * 100)) S.warp[i] = Math.round(m.t0 * 100);   // nasce na estrela, não viaja até ela
          writeSlot(S, i, x0 + 0.05 * Math.sin(age * 0.9 + m.sw) * age * 0.4, y0 - 0.06 * age - 0.012 * age * age, q[2] * RC + 0.1, SILVER[0] * 1.2, SILVER[1] * 1.2, SILVER[2] * 1.25, 0.85 * smooth(0, 0.3, age) * (1 - smooth(3.5, 6.4, age)) * dimK, 0.55 - age * 0.04, 0.85, 0, 0); continue; }
        if (kd === 5) { const ang = this.attAng + d[o] * 1.05, rr = d[o + 1], x = Math.cos(ang) * rr * 1.1, y = CY + Math.sin(ang) * rr * 0.78, tw = 0.75 + 0.25 * Math.sin(t * 0.9 + d[o + 3] * 30);
          const vis = smooth(0.05, 0.6, this.att) * (1 - smooth(0.42, 0.6, Math.abs(d[o]))) * smooth(0, 0.3, this.att * 1.4 - d[o + 3] * 0.5), big = d[o + 4] > 0.5, m = 0.4 + 0.5 * d[o + 5];
          writeSlot(S, i, x, y, d[o + 2], lerp(VIOLET[0], SILVER[0], m) * (big ? 1.3 : 1), lerp(VIOLET[1], SILVER[1], m) * (big ? 1.3 : 1), lerp(VIOLET[2], SILVER[2], m) * (big ? 1.3 : 1), vis * (big ? 0.85 : 0.32) * tw * dimK, big ? 1.1 : 0.5, 0.7, 0.03, 0); continue; }
        rot(d[o], d[o + 1], d[o + 2], tmp); const tw = 0.6 + 0.4 * Math.sin(t * (0.2 + d[o + 4] * 0.3) + d[o + 3] * 40);
        writeSlot(S, i, tmp[0], tmp[1], tmp[2] * 0.4 - 0.7, lerp(VIOLET[0], SILVER_COLD[0], d[o + 4]) * 0.7, lerp(VIOLET[1], SILVER_COLD[1], d[o + 4]) * 0.7, lerp(VIOLET[2], SILVER_COLD[2], d[o + 4]) * 0.8, (0.1 + 0.16 * d[o + 3]) * tw * dimK, 0.4 + 0.3 * d[o + 4], 0.5, 0, 0);
      }
      // linhas finas: mais apagadas na face de trás e sob o véu
      for (let k = 0; k < this.edges.length; k++) { const E = this.edges[k]; this.linkA[k] = 0.25 + 0.75 * smooth(-0.5, 0.6, (P[E.a][2] + P[E.b][2]) / 2); }
      this.linkAlpha = 0.5 * coreVis;
      this.linkColor = [lerp(VIOLET[0], SILVER_COLD[0], 0.55 + 0.25 * drift), lerp(VIOLET[1], SILVER_COLD[1], 0.55 + 0.25 * drift), lerp(VIOLET[2], SILVER_COLD[2], 0.55 + 0.25 * drift)];
      centerFocus(eng, Math.cos(this.attAng) * 0.5 * this.att, CY + Math.sin(this.attAng) * 0.35 * this.att);
    }
  }

  PT.FORMS = PT.FORMS || {}; PT.LOOKS = PT.LOOKS || {};
  PT.FORMS.nyx = (state, opts) => new NyxForm(state, opts);
  PT.LOOKS.nyx = {
    cfg: { stemColor: [0.34, 0.33, 0.62], stemAlpha: 0.04, transitColor: [0.78, 0.82, 1.0], flash: 0.3, buildTime: 3.6, churnRate: 0.16 },
    look: { bg0: [0.020, 0.020, 0.052], bg1: [0.003, 0.003, 0.010], glow: [0.22, 0.17, 0.62], glowAmt: 0.13, bloom: 1.05, exposure: 1.3, grain: 0.014, vignette: 0.4 }
  };
  PT.NyxForm = NyxForm;
})(window.PT);
