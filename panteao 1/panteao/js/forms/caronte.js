/* =====================================================================
   CARONTE — esfera amorfa de água + água guiada + manto
   ---------------------------------------------------------------------
   • NÚCLEO: esfera de água nunca redonda (ondas lentas de superfície),
     luz fria em cascas por dentro. Respiração submersa: mais rápida com
     state.pending alto, quase parada com canais tranquilos. Algo que
     realmente precisa do usuário (state.dropSeq) → UM pulso forte: a gota
     cai e a superfície inteira estremece.
   • ÁGUA GUIADA: correntes deliberadas que ENTRAM e SAEM do núcleo em
     arcos dobrados (círculos que passam pelo centro e saem além da
     superfície), velocidade constante — não é ornamento, é água sendo
     conduzida. Uma mensagem que chega (state.arrivalSeq) vem CARREGADA por
     uma dessas correntes de fora até perto do núcleo; trivial se dissolve
     ao cruzar a superfície (filtrada), o resto emerge e fica perto do núcleo.
   • SILHUETA — MANTO/CAPUZ do mesmo material: cobre o núcleo no estado
     calmo (só brilho passa por dentro, pela fenda da frente) e se abre,
     recolhendo-se para trás, quando ele precisa agir (mesmo sinal do pending).
   • Cor: água quase negra, brilho prateado-azulado de dentro. Nada quente.
   ===================================================================== */
'use strict';
(function (PT) {
  const { TAU, clamp, lerp, smooth, mulberry32 } = PT.M, writeSlot = PT.writeSlot, centerFocus = PT.centerFocus;
  const DEEP = [0.025, 0.045, 0.075], SILVER = [0.62, 0.74, 0.92], CURRENT = [0.36, 0.54, 0.80], CORE = [0.06, 0.12, 0.24];
  const R0 = 0.5, NSTREAM = 6, NPARCEL = 4, PCELLS = 10;

  class CaronteForm {
    constructor(state, opts = {}) {
      this.extent = [0.98, 0.86];
      this.state = state || {}; this.opts = opts; this.churn = 0.2; this.buildStyle = 'grow'; this.linkAlpha = 0;
      const rw = mulberry32(77);
      this.waves = [[2.1, 0.034], [2.7, 0.03], [3.4, 0.024], [4.6, 0.016], [5.9, 0.011], [7.7, 0.007]].map(([f, a]) => { const u = rw() * 2 - 1, th = rw() * TAU, q = Math.sqrt(1 - u * u); return { d: [q * Math.cos(th), u, q * Math.sin(th)], f, a, w: (rw() < 0.5 ? -1 : 1) * (0.18 + rw() * 0.22), p: rw() * TAU }; });
      // correntes guiadas: círculo que passa pelo centro (s=0) e sai além da superfície (s=0.5)
      this.streams = Array.from({ length: NSTREAM }, (_, k) => { const a = k / NSTREAM * TAU + 0.3, el = (k % 2 ? 0.45 : -0.35), dir = [Math.cos(el) * Math.cos(a), Math.sin(el), Math.cos(el) * Math.sin(a)];
        let w = [-dir[2], 0.3 * (k % 3 - 1), dir[0]]; const dw = w[0] * dir[0] + w[1] * dir[1] + w[2] * dir[2]; w = w.map((v, j) => v - dw * dir[j]); const l = Math.hypot(...w); return { dir, w: w.map(v => v / l), sp: 0.045 + 0.012 * (k % 3) }; });
      this.ph = 0; this.pend = 0; this.cloak = 0; this.lastSeq = this.state.dropSeq || 0; this.drop = null;
      this.lastArr = this.state.arrivalSeq || 0; this.parcels = [];
    }
    camera() { return { x: 0, y: -0.1, zoom: this.opts.zoom || 1 }; }
    build(eng) {
      const N = eng.N, S = eng.S, rng = mulberry32(this.opts.seed || 2024);
      const nS = Math.round(N * 0.22), nI = Math.round(N * 0.13), nC = Math.round(N * 0.04), nD = Math.max(40, Math.round(N * 0.02)), nG = Math.round(N * 0.13), nM = Math.round(N * 0.32);
      this.kind = new Uint8Array(N); this.d = new Float32Array(N * 7);
      let i = 0; const put = (kd, arr, g, ord) => { this.kind[i] = kd; this.d.set(arr, i * 7); S.group[i] = g; S.order[i] = ord; i++; };
      for (let k = 0; k < nS; k++) { const y = 1 - 2 * (k + 0.5) / nS, r = Math.sqrt(1 - y * y), th = k * 2.399963; put(1, [Math.cos(th) * r, y, Math.sin(th) * r, rng(), 0, 0, 0], 1, 0.45 + 0.3 * rng()); }
      this.layers = [0.3, 0.5, 0.7].map((f, k) => { const ax = [rng() - 0.5, 1, rng() - 0.5], l = Math.hypot(...ax); return { f, ax: ax.map(v => v / l), w: (k % 2 ? -1 : 1) * (0.07 + 0.05 * rng()) / (0.4 + f), ph: rng() * TAU }; });
      for (let k = 0; k < nI; k++) { const u = rng() * 2 - 1, a = rng() * TAU, q = Math.sqrt(1 - u * u), L = (rng() * 3) | 0; put(2, [q * Math.cos(a), u, q * Math.sin(a), L, rng(), (rng() - 0.5) * 0.06, 0], 10 + L, 0.2 + 0.4 * this.layers[L].f); }
      for (let k = 0; k < nC; k++) { const u = rng() * 2 - 1, a = rng() * TAU, q = Math.sqrt(1 - u * u), rr = Math.cbrt(rng()) * 0.3; put(3, [q * Math.cos(a) * rr, u * rr, q * Math.sin(a) * rr, rng(), 0, 0, 0], 20, 0.05 + 0.1 * rng()); }
      for (let k = 0; k < nD; k++) put(4, [rng(), rng(), rng(), rng(), k / nD, 0, 0], -100 - k, 0.98);
      const perS = Math.floor(nG / NSTREAM);
      for (let s = 0; s < NSTREAM; s++) for (let k = 0; k < perS; k++) put(6, [s, k / perS, rng(), (rng() - 0.5) * 0.02, 0, 0, 0], 40 + s, 0.3 + 0.3 * rng());
      for (let p = 0; p < NPARCEL; p++) for (let k = 0; k < PCELLS; k++) put(7, [p, k, rng(), rng(), rng(), 0, 0], -300 - p * 20 - k, 0.99);
      for (let k = 0; k < nM; k++) put(8, [rng(), Math.pow(rng(), 0.85), rng(), rng(), 0, 0, 0], 60 + ((k * 7) % 5), 0.6 + 0.35 * rng());
      for (; i < N;) { const u = rng() * 2 - 1, a = rng() * TAU, q = Math.sqrt(1 - u * u), rr = 1.0 + rng() * 1.0; put(5, [q * Math.cos(a) * rr * 1.2, u * rr * 0.8, q * Math.sin(a) * rr * 0.6 - 0.3, rng(), rng(), 0, 0], 30, 0.9 + 0.1 * rng()); }
    }
    surf(nx, ny, nz, t) {
      const W = this.waves; let base = 0;
      for (let k = 0; k < W.length; k++) { const w = W[k]; base += w.a * Math.sin(w.f * (nx * w.d[0] + ny * w.d[1] + nz * w.d[2]) + w.w * t + w.p); }
      let wv = 0; const D = this.drop;
      if (D && D.tau > 0) { const th = Math.acos(clamp(nx * D.n[0] + ny * D.n[1] + nz * D.n[2], -1, 1)), front = D.tau * 2.4, env = Math.exp(-D.tau / 1.1);
        wv = 0.07 * env * Math.exp(-Math.pow((th - front) / 0.33, 2)) * Math.cos((th - front) * 9) + 0.012 * env * Math.sin(t * 38 + th * 14); }
      return 1 + base + wv;
    }
    /* ponto de uma corrente guiada: s=0 no centro, s=0.5 fora da superfície */
    stream(k, s, R, out) { const S = this.streams[k], a = s * TAU, cx = 0.55 * R, rr = 0.62 * R, c = -Math.cos(a), sn = Math.sin(a);
      out[0] = S.dir[0] * (cx + rr * c) + S.w[0] * rr * sn; out[1] = S.dir[1] * (cx + rr * c) + S.w[1] * rr * sn; out[2] = S.dir[2] * (cx + rr * c) + S.w[2] * rr * sn; return out; }
    update(eng, t, dt) {
      const S = eng.S, N = eng.N, d = this.d, ST = this.state;
      this.pend += (clamp(ST.pending || 0, 0, 1) - this.pend) * Math.min(1, dt * 0.5);
      this.cloak += (smooth(0.45, 0.85, this.pend) - this.cloak) * Math.min(1, dt * 0.6);   // manto abre com o mesmo sinal da respiração rápida
      const freq = lerp(0.06, 0.42, this.pend), amp = lerp(0.006, 0.036, this.pend); this.ph += dt * freq * TAU;
      let breath = 1 + amp * Math.sin(this.ph);
      if ((ST.dropSeq || 0) !== this.lastSeq) { this.lastSeq = ST.dropSeq || 0; this.drop = { t0: t + 0.62, n: [0.12, 0.99, 0.05], fall: t }; }
      const D = this.drop; if (D) { D.tau = t - D.t0; if (D.tau > 4.5) this.drop = null; }
      const shock = D && D.tau > 0 ? Math.exp(-D.tau / 0.5) : 0; breath *= 1 - 0.05 * shock + 0.08 * shock * Math.sin(D ? D.tau * 15 : 0);
      // mensagem chegando: carregada por uma corrente
      if ((ST.arrivalSeq || 0) !== this.lastArr) { this.lastArr = ST.arrivalSeq || 0; const imp = ST.lastArrival ? ST.lastArrival.imp : 0.2;
        const slot = [0, 1, 2, 3].find(p => !this.parcels.some(q => q.slot === p)) ?? (this.parcels.shift().slot);
        this.parcels.push({ slot, k: this.lastArr % NSTREAM, t0: t, imp, seq: this.lastArr }); }
      this.parcels = this.parcels.filter(p => t - p.t0 < (p.imp >= 0.35 ? 10 : 4));
      const R = R0 * breath, gap = lerp(0.85, 3.5, this.cloak), tmp = [0, 0, 0], tmp2 = [0, 0, 0];
      const L = this.layers.map(l => { const an = l.ph + t * l.w; return { ...l, c: Math.cos(an), s: Math.sin(an) }; });
      const yawS = t * 0.03, cyS = Math.cos(yawS), syS = Math.sin(yawS);
      const shut = 1 - this.cloak;
      for (let i = 0; i < N; i++) { const o = i * 7, kd = this.kind[i];
        if (kd === 1) { const nx = d[o], ny = d[o + 1], nz = d[o + 2], rr = R * this.surf(nx, ny, nz, t);
          const rim = Math.pow(1 - Math.abs(nz), 2.6), top = smooth(-0.2, 0.9, ny);
          let wave = 0; if (D && D.tau > 0) { const th = Math.acos(clamp(nx * D.n[0] + ny * D.n[1] + nz * D.n[2], -1, 1)); wave = Math.exp(-Math.pow((th - D.tau * 2.4) / 0.22, 2)) * Math.exp(-D.tau / 1.0); }
          const lum = 0.25 + 0.95 * rim + 0.15 * top + 1.1 * wave, front = smooth(-0.7, 0.5, nz), k = clamp(lum * 0.8, 0, 1);
          writeSlot(S, i, nx * rr, ny * rr * 0.97, nz * rr, lerp(DEEP[0], SILVER[0], k) * (0.6 + 0.5 * lum), lerp(DEEP[1], SILVER[1], k) * (0.6 + 0.5 * lum), lerp(DEEP[2], SILVER[2], k) * (0.65 + 0.5 * lum), (0.12 + 0.55 * rim + 0.5 * wave) * (0.55 + 0.45 * front) * (0.7 + 0.3 * this.cloak), 0.66 + 0.38 * rim, 0.7, 0.01, 0); continue; }
        if (kd === 2) { const Lk = L[d[o + 3]], ax = Lk.ax, px = d[o], py = d[o + 1], pz = d[o + 2], c = Lk.c, s = Lk.s, dot = ax[0] * px + ax[1] * py + ax[2] * pz;
          const cx = ax[1] * pz - ax[2] * py, cy = ax[2] * px - ax[0] * pz, cz = ax[0] * py - ax[1] * px;
          let X = px * c + cx * s + ax[0] * dot * (1 - c), Y = py * c + cy * s + ax[1] * dot * (1 - c), Z = pz * c + cz * s + ax[2] * dot * (1 - c);
          const rr = R * Lk.f * (1 + d[o + 5]) * 0.98; X *= rr; Y *= rr * 0.97; Z *= rr;
          const band = smooth(0.45, 0.85, 0.5 + 0.35 * Math.sin(X * 5 + Y * 2.8 - t * 0.35 + d[o + 4] * 1.5) + 0.25 * Math.sin(Y * 6.3 - Z * 3.6 + t * 0.27));
          const front = smooth(-0.8, 0.6, Z / (rr + 1e-4)), lum = (0.4 + 1.1 * band) * (0.35 + 0.65 * front) * (1 + 0.6 * shock);
          writeSlot(S, i, X, Y, Z, CURRENT[0] * lum, CURRENT[1] * lum, CURRENT[2] * lum * 1.08, (0.12 + 0.4 * band) * (0.45 + 0.55 * front), 0.9 + 0.6 * band, 0.55, 0.02, 0); continue; }
        if (kd === 3) { writeSlot(S, i, d[o] * R, d[o + 1] * R, d[o + 2] * R, CORE[0] * 1.6, CORE[1] * 1.6, CORE[2] * 1.6, 0.11 + 0.08 * shock, 3.0 + 1.8 * d[o + 3], 0.4, 0.03, 0); continue; }
        if (kd === 6) { // água guiada: arcos dobrados, velocidade constante, entra e sai do núcleo
          const k = d[o], st = this.streams[k], s = (d[o + 1] + t * st.sp) % 1, p = this.stream(k, s, R, tmp), q2 = this.stream(k, (s + 0.004) % 1, R, tmp2);
          const X = p[0] * cyS + p[2] * syS, Z = -p[0] * syS + p[2] * cyS, X2 = q2[0] * cyS + q2[2] * syS, rad = Math.hypot(p[0], p[1], p[2]) / R, out = smooth(0.9, 1.05, rad), front = smooth(-0.5, 0.5, Z / R);
          const lum = (0.55 + 0.6 * out) * (0.5 + 0.5 * front);
          writeSlot(S, i, X, p[1] + d[o + 3], Z, SILVER[0] * lum, SILVER[1] * lum, SILVER[2] * lum * 1.05, (0.16 + 0.32 * out) * (0.5 + 0.5 * front), 0.85, 0.75, 0.0, 3, Math.atan2(q2[1] - p[1], X2 - X)); continue; }
        if (kd === 7) { // mensagem carregada pela corrente
          const P = this.parcels.find(q => q.slot === d[o]);
          if (!P) { writeSlot(S, i, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.6, 0, 0); continue; }
          if (S.warp[i] !== P.seq) S.warp[i] = P.seq;
          const age = t - P.t0, kept = P.imp >= 0.35, travel = smooth(0, 3.2, age);
          let x, y, z, a;
          const jx = (d[o + 2] - 0.5) * 0.03, jy = (d[o + 3] - 0.5) * 0.03, jz = (d[o + 4] - 0.5) * 0.03;
          if (age < 3.2 || !kept) { const s = 0.5 + 0.48 * travel, p = this.stream(P.k, s, R, tmp); x = p[0] * cyS + p[2] * syS + jx; z = -p[0] * syS + p[2] * cyS + jz; y = p[1] + jy;
            const rad = Math.hypot(p[0], p[1], p[2]) / R; a = kept ? 0.95 : 0.9 * smooth(0.82, 0.98, rad); }   // trivial: dissolve ao cruzar a superfície
          else { const h = age - 3.2, an = d[o + 1] / PCELLS * TAU + h * 0.6; x = Math.cos(an) * 0.07 * R / 0.5 + jx; y = 0.02 + Math.sin(an) * 0.04 + jy; z = 0.12 + jz; a = 0.95 * (1 - smooth(5.5, 6.8, h)); }
          writeSlot(S, i, x, y, z, SILVER[0] * 1.35, SILVER[1] * 1.35, SILVER[2] * 1.4, a * smooth(0, 0.4, age), d[o + 1] === 0 ? 1.1 : 0.62, 0.9, 0, 0); continue; }
        if (kd === 8) { // manto/capuz: tecido de água com fenda na frente que se abre
          // perfil de figura encapuzada: ponta do capuz → ombros → túnica que alarga até a barra
          const th0 = d[o], v = d[o + 1], g = gap * (0.4 + 0.6 * smooth(0.08, 0.4, v)), th = g / 2 + th0 * (TAU - g);
          const prof = v => R0 * (0.22 + 1.02 * Math.sin(Math.min(v / 0.32, 1) * Math.PI / 2) + 0.6 * smooth(0.35, 1, v));
          const wob = 1 + 0.03 * Math.sin(th * 3 + t * 0.4 + v * 5) + 0.02 * smooth(0.6, 1, v) * Math.sin(th * 5 - t * 0.6);
          const back = this.cloak * 0.28 * (1 - smooth(0.2, 0.9, v)) * R0 / 0.5;   // ao abrir, o capuz recua para trás
          const hor = prof(v) * wob * (0.97 + 0.03 * breath), x = hor * Math.sin(th), z = hor * Math.cos(th) * 0.8 - back, y = R0 * (1.32 - 3.0 * v) - 0.04 * this.cloak * (1 - v);
          const nz = Math.cos(th), rim = Math.pow(1 - Math.abs(nz), 2), edge = Math.exp(-Math.pow(th - g / 2, 2) / 0.012) + Math.exp(-Math.pow(TAU - g / 2 - th, 2) / 0.012);
          const flow = smooth(0.55, 0.95, 0.5 + 0.5 * Math.sin(v * 11 - t * 0.7 + th * 2 + d[o + 2] * 2)), front = smooth(-0.6, 0.6, nz);
          const lum = 0.35 + 0.8 * rim + 0.9 * edge + 0.5 * flow, k2 = clamp(lum * 0.6, 0, 1);
          const a = (0.05 + 0.28 * rim + 0.32 * edge + 0.13 * flow) * (0.6 + 0.4 * front) * (0.85 + 0.15 * shut) * (1 - smooth(0.92, 1, v) * 0.5);
          const dv = 0.01, y2 = R0 * (1.32 - 3.0 * (v + dv)), x2 = prof(v + dv) * Math.sin(th);
          writeSlot(S, i, x, y, z, lerp(DEEP[0], SILVER[0], k2) * (0.7 + 0.5 * lum), lerp(DEEP[1], SILVER[1], k2) * (0.7 + 0.5 * lum), lerp(DEEP[2], SILVER[2], k2) * (0.75 + 0.5 * lum), a, 0.7 + 0.35 * flow, 0.7, 0.01, 3, Math.atan2(y2 - y, x2 - x)); continue; }
        if (kd === 4) {
          if (!D) { writeSlot(S, i, 0, R + 0.4, 0, 0, 0, 0, 0, 0.4, 0.6, 0, 0); continue; }
          const fall = t - D.fall, pre = 0.62, top = R * 1.02;
          if (fall < pre) { const f = fall / pre, yy = lerp(top + 0.7, top, f * f), a = d[o] * TAU, rr = 0.03 * Math.cbrt(d[o + 1]) * (1 - 0.3 * f);
            writeSlot(S, i, Math.cos(a) * rr + 0.06, yy + (d[o + 2] - 0.5) * 0.05 * (1 + f), Math.sin(a) * rr, SILVER[0] * 1.2, SILVER[1] * 1.2, SILVER[2] * 1.25, smooth(0, 0.2, f) * 0.9, 0.6, 0.85, 0, 0); continue; }
          const age = fall - pre; if (age > 1.3) { writeSlot(S, i, 0.06, top, 0, 0, 0, 0, 0, 0.4, 0.6, 0, 0); continue; }
          const a = d[o] * TAU, sp = 0.25 + 0.5 * d[o + 3], vy = 0.55 + 0.6 * d[o + 1];
          writeSlot(S, i, 0.06 + Math.cos(a) * sp * age, top + vy * age - 1.4 * age * age, Math.sin(a) * sp * age, SILVER[0], SILVER[1], SILVER[2] * 1.1, 0.85 * (1 - age / 1.3), 0.55, 0.9, 0, 0); continue; }
        const x = d[o] + 0.05 * Math.sin(t * 0.12 + d[o + 3] * 30), y = d[o + 1] + 0.04 * Math.sin(t * 0.09 + d[o + 4] * 20);
        writeSlot(S, i, x, y, d[o + 2], CURRENT[0] * 0.5, CURRENT[1] * 0.55, CURRENT[2] * 0.7, 0.04 + 0.06 * d[o + 4], 0.4 + 0.3 * d[o + 3], 0.25, 0.08, 0);
      }
      centerFocus(eng, 0, 0.0);
    }
  }

  PT.FORMS = PT.FORMS || {}; PT.LOOKS = PT.LOOKS || {};
  PT.FORMS.caronte = (state, opts) => new CaronteForm(state, opts);
  PT.LOOKS.caronte = {
    cfg: { stemColor: [0.22, 0.32, 0.46], stemAlpha: 0.035, transitColor: [0.6, 0.72, 0.9], flash: 0.25, buildTime: 3.4, churnRate: 0.2 },
    look: { bg0: [0.010, 0.018, 0.028], bg1: [0.002, 0.003, 0.006], glow: [0.10, 0.18, 0.32], glowAmt: 0.11, bloom: 0.95, exposure: 1.32, grain: 0.012, vignette: 0.38 }
  };
  PT.CaronteForm = CaronteForm;
})(window.PT);
