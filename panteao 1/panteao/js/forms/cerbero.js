/* =====================================================================
   CÉRBERO — grade rígida + três olhos no topo + correntes
   ---------------------------------------------------------------------
   • NÚCLEO/ESTRUTURA: grade de linhas retas formando um perímetro (um
     limiar real). Nunca orgânica: rigidez máxima, turbulência zero.
   • OLHOS: três, juntos numa fileira no TOPO da estrutura; o do meio um
     pouco acima. Íris = diafragma de 7 lâminas: aberta e quase incolor
     com risco baixo; fecha, estreita e avermelha conforme o risco sobe.
     Sacadas exatas (mola crítica) para alvos DIFERENTES dentro da grade;
     convergem no mesmo ponto só quando há algo real.
   • SILHUETA — CORRENTES:
       – dois anéis de corrente em volta do olho do meio, em diagonal, que
         se cruzam num único ponto logo abaixo dele (os dois são círculos
         máximos de uma mesma esfera: o outro cruzamento fica atrás do olho).
         Passam por fora da pupila e não cobrem os outros olhos.
       – duas correntes em laço orbitando a estrutura inteira o tempo todo,
         sempre tensas, entrelaçando-se entre os olhos conforme giram.
         Na convergência, apertam e se enrolam em volta do alvo, prendendo
         aquele ponto até a convergência acabar.
   • Vermelho: só íris em alerta (e a grade no instante da convergência).
   • Nenhum efeito sem função; bloom baixo. É a forma MENOS visível.
   ===================================================================== */
'use strict';
(function (PT) {
  const { TAU, clamp, lerp, smooth, mulberry32, critSpring } = PT.M, writeSlot = PT.writeSlot, centerFocus = PT.centerFocus;
  const STEEL = [0.44, 0.50, 0.58], STEEL_DIM = [0.20, 0.235, 0.28], CHAIN = [0.52, 0.57, 0.64], PALE = [0.66, 0.70, 0.74], RED = [1.35, 0.09, 0.06];
  const EYES = [[-0.42, 0.47], [0, 0.57], [0.42, 0.47]], RE = 0.15, RI = 0.123, NBL = 7;
  const GX = 0.95, GY0 = -0.66, GY1 = 0.27;
  // anéis do olho do meio: círculos máximos de uma esfera de raio RR, ambos passando por M (frente-baixo)
  const RR = 0.262, M = [0, -0.8, 0.6], AX = [0, 0.6, 0.8], BX = [1, 0, 0];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const RINGS = [0.75, -0.75].map(al => { const n = [Math.cos(al) * AX[0] + Math.sin(al) * BX[0], Math.cos(al) * AX[1] + Math.sin(al) * BX[1], Math.cos(al) * AX[2] + Math.sin(al) * BX[2]]; return { w: cross(n, M), dir: al > 0 ? 1 : -1 }; });

  class CerberoForm {
    constructor(state, opts = {}) {
      this.extent = [1.18, 0.86];
      this.state = state || {}; this.opts = opts; this.churn = 0.04; this.buildStyle = 'sweep'; this.linkAlpha = 0;
      this.eye = EYES.map((p, k) => ({ ap: { x: 1, v: 0 }, tx: { x: p[0], v: 0 }, ty: { x: -0.3, v: 0 }, rk: { x: 0, v: 0 }, hold: 0.5 + k * 0.7, tgt: [p[0] * 0.8, -0.3], scan: k * 0.33 }));
      this.alert = { x: 0, v: 0 }; this.vis = { x: 0.4, v: 0 }; this.tight = { x: 0, v: 0 }; this.cp = [0, -0.25];
    }
    camera() { return { x: 0, y: 0.04, zoom: this.opts.zoom || 0.98 }; }
    /* plano de células para um espaçamento ds — o espaçamento cresce até caber em N */
    plan(ds, q) {
      const segs = [], pr = (x0, y0, x1, y1, ty) => segs.push([x0, y0, x1, y1, ty]);
      pr(-GX, GY0, GX, GY0, 0); pr(GX, GY0, GX, GY1, 0); pr(GX, GY1, -GX, GY1, 0); pr(-GX, GY1, -GX, GY0, 0);
      const ins = 0.032; pr(-GX + ins, GY0 + ins, GX - ins, GY0 + ins, 3); pr(-GX + ins, GY1 - ins, GX - ins, GY1 - ins, 3);
      const step = 0.19; for (let x = -GX + step; x < GX - 0.05; x += step) pr(x, GY0, x, GY1, 1);
      for (let y = GY0 + step; y < GY1 - 0.05; y += step) pr(-GX, y, GX, y, 1);
      for (const [cx, cy, sx, sy] of [[-GX, GY0, 1, 1], [GX, GY0, -1, 1], [GX, GY1, -1, -1], [-GX, GY1, 1, -1]]) { pr(cx - sx * 0.07, cy, cx + sx * 0.12, cy, 2); pr(cx, cy - sy * 0.07, cx, cy + sy * 0.12, 2); }
      const segN = segs.map(sg => Math.max(2, Math.round(Math.hypot(sg[2] - sg[0], sg[3] - sg[1]) / (sg[4] === 1 ? ds * 1.35 : ds))));
      const c = { segs, segN, nRing: Math.round(TAU * RE / (ds * 0.8)), nTick: 24, nEdge: Math.max(5, Math.round(0.15 / (ds * 0.55))), nFace: Math.round(40 * q + 10), nBeam: Math.max(12, Math.round(0.85 / (ds * 0.9))), nRet: 10,
        nEyeChain: Math.max(24, Math.round(TAU * RR / (ds * 0.75))), nOrbit: Math.max(40, Math.round(5.9 / (ds * 0.85))) };
      c.total = segN.reduce((a, b) => a + b, 0) + 3 * (c.nRing * 2 + c.nTick + NBL * c.nEdge + c.nFace + 1 + c.nBeam + c.nRet) + 2 * c.nEyeChain + 2 * c.nOrbit;
      return c;
    }
    build(eng) {
      const N = eng.N, S = eng.S, rng = mulberry32(3), q = N / 4200;
      let ds = clamp(0.032 / Math.sqrt(q), 0.02, 0.07), c = this.plan(ds, q);
      while (c.total > N * 0.95 && ds < 0.5) { ds *= 1.08; c = this.plan(ds, q); }
      this.ds = ds; this.c = c;
      this.kind = new Uint8Array(N); this.d = new Float32Array(N * 6);
      let i = 0; const put = (kd, arr, g) => { this.kind[i] = kd; this.d.set(arr, i * 6); S.group[i] = g; i++; };
      c.segs.forEach((sg, k) => { const len = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]), n = c.segN[k];
        for (let m = 0; m < n && i < N; m++) { const u = (m + 0.5) / n; put(1, [lerp(sg[0], sg[2], u), lerp(sg[1], sg[3], u), Math.atan2(sg[3] - sg[1], sg[2] - sg[0]), sg[4], len / n, u], 10 + k); } });
      for (let e = 0; e < 3; e++) {
        if (i + c.nRing * 2 + c.nTick + NBL * c.nEdge + c.nFace + 1 + c.nBeam + c.nRet > N) break;
        for (let m = 0; m < c.nRing * 2; m++) put(2, [e, (m % c.nRing) / c.nRing, m < c.nRing ? RE : RE * 0.88, 0, 0, 0], 100 + e * 10 + (m < c.nRing ? 0 : 1));
        for (let m = 0; m < c.nTick; m++) put(3, [e, m / c.nTick, m % 6 === 0 ? 1 : 0, 0, 0, 0], -1000 - e * 100 - m);
        for (let b = 0; b < NBL; b++) for (let m = 0; m < c.nEdge; m++) put(4, [e, b, (m + 0.5) / c.nEdge, 0, 0, 0], -2000 - e * 100 - b * 7 - m);
        for (let m = 0; m < c.nFace; m++) put(5, [e, rng(), rng(), rng(), 0, 0], 300 + e);
        put(6, [e, 0, 0, 0, 0, 0], -8000 - e);
        for (let m = 0; m < c.nBeam; m++) put(7, [e, (m + 0.5) / c.nBeam, 0, 0, 0, 0], -3000 - e * 1000 - m);
        for (let m = 0; m < c.nRet; m++) put(8, [e, m, 0, 0, 0, 0], -9000 - e * 20 - m);
      }
      for (let r = 0; r < 2 && i + c.nEyeChain <= N; r++) for (let m = 0; m < c.nEyeChain; m++) put(9, [r, m / c.nEyeChain, m & 1, 0, 0, 0], -12000 - r * 1000 - m);
      for (let r = 0; r < 2 && i + c.nOrbit <= N; r++) for (let m = 0; m < c.nOrbit; m++) put(10, [r, m / c.nOrbit, m & 1, 0, 0, 0], -15000 - r * 2000 - m);
      for (; i < N; i++) { this.kind[i] = 0; S.stem[i] = 1; }   // sobra fica no reservatório — sem enfeite
    }
    aperture(e, a) { const rot = e * 0.31 + (1 - a / RI) * 1.15, V = []; for (let k = 0; k < NBL; k++) { const an = rot + k / NBL * TAU; V.push([Math.cos(an) * a, Math.sin(an) * a]); } return V; }
    pickTarget(k) {
      const others = this.eye.filter((_, j) => j !== k).map(o => o.tgt);
      for (let n = 0; n < 40; n++) { const x = (Math.random() * 2 - 1) * (GX - 0.1), y = lerp(GY0 + 0.08, GY1 - 0.07, Math.random());
        if (others.every(o => Math.hypot(o[0] - x, o[1] - y) > 0.45)) return [x, y]; }
      return [EYES[k][0], GY0 + 0.12];
    }
    /* laço orbital r em u ∈ [0,1): elipse 3D girando em torno do eixo vertical, inclinada ±γ */
    orbit(r, u, t, out) {
      const ph = u * TAU + t * 0.22 * (r ? -1 : 1), beta = t * 0.07 + r * Math.PI * 0.5, gam = r ? -0.2 : 0.2, s = r ? -1 : 1;
      let x = 1.1 * Math.cos(ph), y = 0.68 * Math.sin(ph), z = 0.42 * Math.sin(ph) * s;
      const cb = Math.cos(beta), sb = Math.sin(beta), X = x * (0.86 + 0.14 * cb) + z * sb * 0.3, Z = -x * sb * 0.3 + z * cb;
      const cg = Math.cos(gam), sg = Math.sin(gam); out[0] = X * cg - y * sg; out[1] = -0.1 + X * sg + y * cg; out[2] = Z; return out;
    }
    update(eng, t, dt) {
      const S = eng.S, N = eng.N, d = this.d, ST = this.state, E = this.eye, c = this.c;
      const conv = !!ST.converge, cp = ST.convergePoint || [0.0, -0.25];
      critSpring(this.alert, conv ? 1 : clamp(ST.alert || 0, 0, 1), 3.2, dt);
      critSpring(this.tight, conv ? 1 : 0, 2.2, dt);
      const maxRisk = Math.max(...E.map(o => o.rk.x));
      critSpring(this.vis, clamp(Math.max(this.opts.presence ?? 0.42, this.alert.x, maxRisk * 0.9), 0, 1), 2.0, dt);
      const vis = this.vis.x, al = this.alert.x, tight = this.tight.x;
      if (conv) this.cp = [cp[0], cp[1]];
      E.forEach((o, k) => {
        const risk = clamp(Math.max(ST.eyes && ST.eyes[k] ? ST.eyes[k].risk : 0, conv ? 0.95 : 0), 0, 1);
        critSpring(o.rk, risk, 4.5, dt); critSpring(o.ap, 1 - o.rk.x * 0.86, 6.5, dt);
        if (conv) o.tgt = [cp[0], cp[1]];
        else if (dt > 0) { o.hold -= dt; if (o.hold <= 0) { o.tgt = this.pickTarget(k); o.hold = 1.4 + Math.random() * 2.2; o.scan = 0; } }
        critSpring(o.tx, o.tgt[0], 9, dt); critSpring(o.ty, o.tgt[1], 9, dt); o.scan += dt * 0.9;
      });
      const gpulse = al * (0.55 + 0.45 * Math.sin(t * 4.2)), sizeL = eng.sizeFor(this.ds) * 1.25, ringS = eng.sizeFor(TAU * RE / c.nRing) * 1.3;
      const eyeG = E.map((o, k) => { const p = EYES[k], dx = o.tx.x - p[0], dy = o.ty.x - p[1], l = Math.hypot(dx, dy) + 1e-6, off = Math.min(0.025, l * 0.04);
        const pc = [p[0] + dx / l * off, p[1] + dy / l * off], a = lerp(0.017, RI * 0.92, o.ap.x), sat = smooth(0.2, 0.85, o.rk.x);
        return { c: p, pc, a, V: this.aperture(k, a), sat, ic: [lerp(PALE[0], RED[0], sat), lerp(PALE[1], RED[1], sat), lerp(PALE[2], RED[2], sat)] }; });
      const tmp = [0, 0, 0, 0], tmp2 = [0, 0, 0, 0], E1 = EYES[1], chainS = eng.sizeFor(TAU * RR / c.nEyeChain), orbS = eng.sizeFor(5.9 / c.nOrbit);
      for (let i = 0; i < N; i++) { const o = i * 6, kd = this.kind[i];
        if (kd === 0) continue;
        if (kd === 1) { const x = d[o], y = d[o + 1], ty = d[o + 3], base = ty === 0 ? 0.55 : ty === 3 ? 0.3 : ty === 2 ? 0.7 : 0.12;
          const r = lerp(lerp(STEEL_DIM[0], STEEL[0], base), RED[0] * 0.9, gpulse * (ty === 1 ? 0.7 : 1)), g = lerp(lerp(STEEL_DIM[1], STEEL[1], base), RED[1], gpulse), b = lerp(lerp(STEEL_DIM[2], STEEL[2], base), RED[2], gpulse);
          writeSlot(S, i, x, y, 0, r, g, b, (ty === 1 ? 0.22 : 0.62) * (0.45 + 0.55 * vis) * (1 + 0.6 * gpulse), sizeL * (d[o + 4] / this.ds) * (ty === 1 ? 0.95 : 1.05), 1, 0, 5, d[o + 2]); continue; }
        if (kd === 9) { // anéis do olho do meio: os elos correm pelo anel; os dois se cruzam em M, logo abaixo do olho
          const R = RINGS[d[o]], ph = d[o + 1] * TAU + t * 0.3 * R.dir, cs = Math.cos(ph), sn = Math.sin(ph);
          const vx = cs * M[0] + sn * R.w[0], vy = cs * M[1] + sn * R.w[1], vz = cs * M[2] + sn * R.w[2], fr = smooth(-0.3, 0.3, vz);
          const tx = -sn * M[0] + cs * R.w[0], ty = -sn * M[1] + cs * R.w[1], odd = d[o + 2] > 0.5, lum = 0.55 + 0.45 * fr + 0.3 * al;
          writeSlot(S, i, E1[0] + vx * RR, E1[1] + vy * RR, vz * RR, CHAIN[0] * lum, CHAIN[1] * lum, CHAIN[2] * lum, (0.3 + 0.5 * fr) * (0.5 + 0.5 * vis), odd ? chainS * 1.5 : chainS * 1.25, 1, 0, odd ? 5 : 4, Math.atan2(ty, tx)); continue; }
        if (kd === 10) { // correntes em laço: orbitam a estrutura; na convergência enrolam-se no alvo
          const r = d[o], u = d[o + 1], odd = d[o + 2] > 0.5, p = this.orbit(r, u, t, tmp);
          let x = p[0], y = p[1], z = p[2]; const p2 = this.orbit(r, u + 0.002, t, tmp2); let ang = Math.atan2(p2[1] - y, p2[0] - x);
          const T = smooth(0, 1, tight * 1.35 - u * 0.35);
          if (T > 0.001) { const wph = u * TAU * 2 + t * 0.5 * (r ? -1 : 1), wr = 0.075 + 0.03 * r + 0.012 * Math.sin(u * 40), cx2 = this.cp[0], cy2 = this.cp[1];
            const wx = cx2 + Math.cos(wph) * wr, wy = cy2 + Math.sin(wph) * wr * 0.75, wz = Math.sin(wph + r) * 0.05;
            x = lerp(x, wx, T); y = lerp(y, wy, T); z = lerp(z, wz, T); ang = lerp(ang, wph + Math.PI / 2, T); }
          const fr = smooth(-0.3, 0.3, z), lum = 0.5 + 0.45 * fr + 0.5 * T;
          writeSlot(S, i, x, y, z, CHAIN[0] * lum, CHAIN[1] * lum, CHAIN[2] * lum, (0.22 + 0.42 * fr + 0.25 * T) * (0.5 + 0.5 * vis), (odd ? 1.5 : 1.25) * lerp(orbS, chainS, T), 1, 0, odd ? 5 : 4, ang); continue; }
        const e = d[o] | 0, G = eyeG[e], cc = G.c;
        if (kd === 2) { const an = d[o + 1] * TAU, R = d[o + 2];
          writeSlot(S, i, cc[0] + Math.cos(an) * R, cc[1] + Math.sin(an) * R, 0.02, STEEL[0], STEEL[1], STEEL[2], (R === RE ? 0.75 : 0.4) * (0.5 + 0.5 * vis), ringS, 1, 0, 5, an + Math.PI / 2); continue; }
        if (kd === 3) { const an = d[o + 1] * TAU, big = d[o + 2], R = RE + 0.014 + big * 0.005;
          writeSlot(S, i, cc[0] + Math.cos(an) * R, cc[1] + Math.sin(an) * R, 0.02, STEEL[0], STEEL[1], STEEL[2], (big ? 0.7 : 0.38) * (0.5 + 0.5 * vis), eng.sizeFor(big ? 0.02 : 0.012), 1, 0, 5, an); continue; }
        if (kd === 4) { const b = d[o + 1], s = d[o + 2], V = G.V, A = V[b], B = V[(b + 1) % NBL], ux = B[0] - A[0], uy = B[1] - A[1], ul = Math.hypot(ux, uy) + 1e-6, dx = ux / ul, dy = uy / ul;
          const pd = A[0] * dx + A[1] * dy, disc = pd * pd - (A[0] * A[0] + A[1] * A[1] - RI * RI), L = -pd + Math.sqrt(Math.max(0, disc));
          const x = A[0] + dx * L * s, y = A[1] + dy * L * s, nearA = 1 - smooth(0, 0.35, s * L / (ul + 1e-4));
          writeSlot(S, i, G.pc[0] + x, G.pc[1] + y, 0.04, lerp(STEEL[0], G.ic[0], 0.5 + 0.5 * nearA), lerp(STEEL[1], G.ic[1], 0.5 + 0.5 * nearA), lerp(STEEL[2], G.ic[2], 0.5 + 0.5 * nearA), (0.5 + 0.4 * nearA + 0.3 * G.sat) * (0.55 + 0.45 * vis), eng.sizeFor(L / c.nEdge) * 1.35, 1, 0, 5, Math.atan2(dy, dx)); continue; }
        if (kd === 5) { const an = d[o + 1] * TAU, rr = lerp(G.a * 1.1, RI * 0.97, d[o + 2]);
          writeSlot(S, i, G.pc[0] + Math.cos(an) * rr, G.pc[1] + Math.sin(an) * rr, 0.03, STEEL_DIM[0] * 1.2, STEEL_DIM[1] * 1.2, STEEL_DIM[2] * 1.2, 0.16 * (0.5 + 0.5 * vis), 0.5, 1, 0, 5, an + Math.PI / 2 + 0.9); continue; }
        if (kd === 6) { const pr = 1 - this.eye[e].ap.x; writeSlot(S, i, G.pc[0], G.pc[1], 0.05, G.ic[0], G.ic[1], G.ic[2], 0.35 + 0.55 * pr, 0.8 + 0.5 * pr, 1, 0, 0); continue; }
        const O = this.eye[e], tx = O.tx.x, ty = O.ty.x;
        if (kd === 7) { const s = d[o + 1], x = lerp(G.pc[0], tx, s), y = lerp(G.pc[1], ty, s), L = Math.hypot(tx - G.pc[0], ty - G.pc[1]);
          const head = (O.scan % 1.6) / 1.2, pk = Math.exp(-Math.pow((s - head) / 0.06, 2)) * (head <= 1 ? 1 : 0), lead = smooth(G.a / Math.max(L, 1e-3), G.a / Math.max(L, 1e-3) + 0.04, s);
          writeSlot(S, i, x, y, 0.05, lerp(PALE[0], G.ic[0], G.sat), lerp(PALE[1], G.ic[1], G.sat), lerp(PALE[2], G.ic[2], G.sat), (0.09 + 0.32 * pk + 0.2 * G.sat) * lead * (0.4 + 0.6 * vis), eng.sizeFor(L / c.nBeam) * 1.4, 1, 0, 5, Math.atan2(ty - G.pc[1], tx - G.pc[0])); continue; }
        if (kd === 8) { const c2 = d[o + 1], sz = 0.045, ic0 = lerp(PALE[0], G.ic[0], G.sat), ic1 = lerp(PALE[1], G.ic[1], G.sat), ic2 = lerp(PALE[2], G.ic[2], G.sat);
          if (c2 === 0) { writeSlot(S, i, tx, ty, 0.05, ic0, ic1, ic2, 0.6 * (0.5 + 0.5 * vis), eng.sizeFor(sz * 2.3), 1, 0, 4, 0); continue; }
          if (c2 === 1) { writeSlot(S, i, tx, ty, 0.05, PALE[0], PALE[1], PALE[2], 0.5, 0.5, 1, 0, 0); continue; }
          const k = (c2 - 2) % 4, an = k * Math.PI / 2, outer = c2 >= 6, R = outer ? sz * 1.55 : sz * 1.2, a2 = an + (outer ? Math.PI / 4 : 0);
          writeSlot(S, i, tx + Math.cos(a2) * R, ty + Math.sin(a2) * R, 0.05, ic0, ic1, ic2, (outer ? 0.25 : 0.55) * (0.5 + 0.5 * vis), eng.sizeFor(outer ? 0.016 : 0.03), 1, 0, 5, an + (outer ? Math.PI * 0.75 : 0)); continue; }
      }
      centerFocus(eng, 0, 0.0);
    }
  }

  PT.FORMS = PT.FORMS || {}; PT.LOOKS = PT.LOOKS || {};
  PT.FORMS.cerbero = (state, opts) => new CerberoForm(state, opts);
  PT.LOOKS.cerbero = {
    cfg: { stemColor: [0.30, 0.34, 0.40], stemAlpha: 0.012, transitAlpha: 0.14, transitColor: [0.55, 0.6, 0.66], flash: 0, buildTime: 2.6, churnRate: 0.04 },
    look: { bg0: [0.020, 0.024, 0.030], bg1: [0.004, 0.005, 0.007], glow: [0.18, 0.2, 0.24], glowAmt: 0.05, bloom: 0.5, bloomThreshold: 0.14, exposure: 1.2, grain: 0.008, vignette: 0.25 }
  };
  PT.CerberoForm = CerberoForm;
})(window.PT);
