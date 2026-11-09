class BodyForm {
  constructor(mode) { this.mode = mode; this.usesCharacter = true; this.linkAlpha = 0.16; this.ankPrev = null; this.ankV = [0, 0, 0]; this.shedPh = 0; }
  camera(eng) {
    if (this.mode === 'portrait') { const h = eng.char.joint('head'); return { x: h[0], y: h[1] + 0.02, zoom: 3.3 }; }
    if (this.mode === 'compact') {   // pequena, de pé no canto de baixo à direita da área livre (o painel aberto empurra a área)
      const vw = eng.view, z = COMPACT.zoom, S = eng.screenScale() / Math.max(1e-6, eng.cam.zoom * eng.ucam.zoom) * z, r = eng.char.joint('root');
      const fx = vw.cx * vw.W * 2 - 0.1 * vw.H, fy = vw.H * 0.955;   // onde os pés devem ficar, em pixels
      return { x: r[0] - (fx - vw.cx * vw.W) / S, y: (fy - vw.cy * vw.H) / S, zoom: z }; }
    const v = eng.char.view; if (v && VIEW_FOCUS[v.focus]) return VIEW_FOCUS[v.focus](eng.char);
    const pc = eng.char.pose.cam; if (pc) return { x: 0, y: pc.y, zoom: pc.zoom };
    return { x: 0, y: 0.9, zoom: 1 };
  }
  build(eng) {
    const N = eng.N, port = this.mode === 'portrait', A = port ? ALLOC_PORT : this.mode === 'compact' ? ALLOC_COMPACT : ALLOC_FULL, rng = mulberry32(port ? 99 : 7);
    const B = new SlotBuilder(); const L = B.L;
    const cnt = k => Math.round((A[k] || 0) * N);
    let seg = 1;
    const sk = (o) => B.add(Object.assign({ type: 0, j2: -1, w2: 0, size: 1, shape: 1, sparkle: 0, chain: -1, hcut: 0, lk: 0, lu: 0, side: 0, sideS: '' }, o));
    // cápsula (membro) em pose de repouso
    const capsule = (n, A0, B0, LR, j1, jEnd, jStart, part, d0, d1, col, o = {}) => {
      const ax = B0[0] - A0[0], ay = B0[1] - A0[1], az = B0[2] - A0[2], len = Math.hypot(ax, ay, az), dx = ax / len, dy = ay / len, dz = az / len;
      let e1 = [dy, -dx, 0]; if (Math.hypot(...e1) < 0.2) e1 = [0, dz, -dy];
      e1 = norm3(e1); const e2 = [dy * e1[2] - dz * e1[1], dz * e1[0] - dx * e1[2], dx * e1[1] - dy * e1[0]];
      const sg = seg++, rmax = Math.max(LR[0], LR[1]) * 1.2;
      for (let i = 0; i < n; i++) {
        let u; do { u = rng(); } while (rng() > capR(LR, u) / rmax);
        const th = rng() * TAU, inner = rng() < 0.12, rr = capR(LR, u) * (inner ? 0.35 + 0.45 * rng() : 0.95 + 0.07 * rng());
        const nx = e1[0] * Math.cos(th) + e2[0] * Math.sin(th), ny = e1[1] * Math.cos(th) + e2[1] * Math.sin(th), nz = e1[2] * Math.cos(th) + e2[2] * Math.sin(th);
        let j2 = -1, w2 = 0;
        if (u > 0.8 && jEnd >= 0) { j2 = jEnd; w2 = smooth(0.8, 1.02, u) * 0.5; } else if (u < 0.18 && jStart >= 0) { j2 = jStart; w2 = smooth(0.18, -0.02, u) * 0.5; }
        if (port && (A0[1] + ay * u) < 1.12) continue;
        sk({ part, seg: sg, x: A0[0] + ax * u + nx * rr, y: A0[1] + ay * u + ny * rr, z: A0[2] + az * u + nz * rr, nx, ny, nz, j1, j2, w2, dist: lerp(d0, d1, u) + rng() * 0.04, col, sparkle: rng() < 0.06 ? 1 : 0, lu: u, inner, ad: [dx, dy, dz], alen: len, ...o });
      }
    };
    const J = JI;
    // tronco: loft de seções elípticas + busto/glúteos; a mesma superfície que as peças usam
    { const n = cnt('torso'), sg = seg++, h0 = port ? 1.1 : 0.8;
      for (let i = 0; i < n; i++) {
        let h, pr; do { h = lerp(h0, 1.47, rng()); pr = torsoAt(h); } while (rng() > (pr[0] + pr[1]) / 0.27);
        const ang = rng() * TAU - Math.PI, inner = rng() < 0.1, f = inner ? 0.4 + 0.45 * rng() : 0.97 + 0.05 * rng(), P = torsoPt(h, ang);
        const x = P.p[0] * f, z = lerp(pr[2], P.p[2], f), [j1, j2, w2] = torsoSkin(h);
        const dn = 0.5 + 0.5 * Math.sin(x * 23 + h * 7) * Math.sin(h * 19 - z * 13);
        sk({ part: 0, seg: sg, x, y: h, z, nx: P.n[0], ny: P.n[1], nz: P.n[2], j1, j2, w2, dist: dn * 0.9 + rng() * 0.1, col: 'body', sparkle: rng() < 0.05 ? 1 : 0, hcut: port ? 1 : 0, lk: LK.torso, lu: h, ang, inner });
      } }
    // pescoço
    capsule(cnt('neck'), [0, 1.425, -0.015], [0, 1.555, 0.0], LIMB.neck, J.neck, J.head, J.chest, 1, 0.05, 0.15, 'body', { lk: LK.neck });
    // braços, mãos grandes, pernas
    for (const s of ['L', 'R']) {
      const sg1 = s === 'L' ? 1 : -1, part = s === 'L' ? 3 : 4, sh = restOf('sh' + s), el = restOf('el' + s), wr = restOf('wr' + s), SD = { side: sg1, sideS: s };
      capsule(cnt('upper'), sh, el, LIMB.upper, J['sh' + s], J['el' + s], J.chest, part, 0, 0.4, 'body', port ? { hcut: 1, lk: LK.upper, ...SD } : { lk: LK.upper, ...SD });
      if (!port) {
        capsule(cnt('fore'), el, wr, LIMB.fore, J['el' + s], J['wr' + s], -1, part, 0.4, 0.75, 'body', { lk: LK.fore, ...SD });
        const nh = cnt('hand'), np = Math.round(nh * 0.36), nf = Math.round(nh * 0.125), sg = seg++, HS = HAND_S;
        for (let i = 0; i < np; i++) { const u = rng() * 2 - 1, a = rng() * TAU, r = Math.sqrt(1 - u * u), d = [r * Math.cos(a), u, r * Math.sin(a)];
          sk({ part, seg: sg, x: wr[0] + d[0] * 0.0135 * HS, y: wr[1] - 0.047 * HS + d[1] * 0.045 * HS, z: wr[2] + 0.004 + d[2] * 0.037 * HS, nx: d[0], ny: d[1], nz: d[2], j1: J['wr' + s], j2: J['el' + s], w2: smooth(-0.3, -1, d[1]) * 0.4, dist: 0.78 + rng() * 0.06, col: 'hand', size: 0.8, lk: LK.hand, palm: s === OTHER_S ? 1 : 0, ...SD }); }
        for (let k = 0; k < 4; k++) { const fa = restOf(`f${k}a${s}`), fb = restOf(`f${k}b${s}`), tip = [fb[0], fb[1] - FINGER_LEN[k] * 0.48, fb[2]];
          capsule(Math.round(nf * 0.55), fa, fb, [0.0098, 0.0088, 0.12, 0], J[`f${k}a${s}`], J[`f${k}b${s}`], J['wr' + s], part, 0.85, 0.92, 'hand', { size: 0.72, lk: LK.hand, ...SD });
          capsule(Math.round(nf * 0.45), fb, tip, [0.0088, 0.0068, 0.1, 0], J[`f${k}b${s}`], -1, J[`f${k}a${s}`], part, 0.92, 1, 'hand', { size: 0.72, lk: LK.hand, ...SD }); }
        const ta = restOf('ta' + s), tb = restOf('tb' + s), ttip = [tb[0] - 0.0026 * sg1, tb[1] - 0.036, tb[2] + 0.015];
        capsule(Math.round(nf * 0.6), ta, tb, [0.012, 0.0105, 0, 0], J['ta' + s], J['tb' + s], J['wr' + s], part, 0.8, 0.9, 'hand', { size: 0.72, lk: LK.hand, ...SD });
        capsule(Math.round(nf * 0.45), tb, ttip, [0.0105, 0.0078, 0, 0], J['tb' + s], -1, J['ta' + s], part, 0.9, 1, 'hand', { size: 0.72, lk: LK.hand, ...SD });
        const hp = restOf('hp' + s), kn = restOf('kn' + s), an = restOf('an' + s);
        capsule(cnt('thigh'), hp, kn, LIMB.thigh, J['hp' + s], J['kn' + s], J.root, 5, 0, 0.45, 'body', { lk: LK.thigh, ...SD });
        capsule(cnt('shin'), kn, an, LIMB.shin, J['kn' + s], J['an' + s], -1, 5, 0.45, 0.85, 'body', { lk: LK.shin, ...SD });
        capsule(cnt('foot'), [an[0], an[1] - 0.04, an[2] - 0.045], [an[0], an[1] - 0.05, an[2] + 0.155], LIMB.foot, J['an' + s], -1, J['kn' + s], 5, 0.85, 1, 'hand', { lk: LK.foot, ...SD });
      }
    }
    // casca da cabeça (máscara); onde o cabelo cobre, ela quase some
    { const n = cnt('shell'), hr = restOf('head'), sg = seg++;
      for (let i = 0; i < n; i++) {
        const u = rng() * 2 - 1, a = rng() * TAU, r = Math.sqrt(1 - u * u); let px = r * Math.cos(a), py = u, pz = r * Math.sin(a);
        const vy = py * HRAD[1], tp = vy < 0 ? 1 - 0.32 * (vy / HRAD[1]) ** 2 : 1, inner = rng() < 0.12, f = inner ? 0.5 + 0.4 * rng() : 1;
        const lu = px * HRAD[0] * tp * f, lv = vy * f, lz = pz * HRAD[2] * f;
        const thr = pz > 0.3 ? 0.064 - 0.034 * smooth(0.03, 0.085, Math.abs(lu)) : lerp(-0.03, -0.085, smooth(0.3, -0.5, pz));
        sk({ part: 1, seg: sg, x: hr[0] + HC[0] + lu, y: hr[1] + HC[1] + lv, z: hr[2] + HC[2] + lz, nx: px, ny: py, nz: pz, j1: J.head, dist: 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(lu * 70 + lv * 50)), col: 'mask', shell: 1, su: lu, sv: lv, front: pz, size: 0.85, hc: smooth(thr - 0.004, thr + 0.01, lv) });
      } }
    // rosto: contornos ordenados (para linhas) — tipo 1
    const face = (feat, side, n, rows, pfn) => { for (let r = 0; r < rows.length; r++) { const ch = seg++; const m = Math.max(2, Math.round(n * rows[r][1])); for (let i = 0; i < m; i++) { const q = m === 1 ? 0.5 : i / (m - 1); B.add({ type: 1, part: 1, seg: ch, feat, side, a: pfn(q, rng), b: rows[r][0], chain: rows[r][2] ? ch : -1, dist: 0.3 + rng() * 0.5, size: 1, shape: 0 }); } } };
    { const ne = cnt('eyes') / 2;
      for (const sd of [1, -1]) {
        face(0, sd, ne * 0.38, [[0, 0.45, 1], [0.0011, 0.35, 0], [0.0022, 0.2, 0]], q => -1 + 2 * q);
        face(1, sd, ne * 0.2, [[0, 0.7, 1], [0.0009, 0.3, 0]], q => -1 + 2 * q);
        face(3, sd, ne * 0.05, [[0, 1, 1]], q => 1 + 0.4 * q);
        // íris: mapa radial de dados (raios + anel) sobre um fundo de células soltas; pupila vertical em tinta
        const ni = Math.round(ne * 0.35), sg = seg++, nSp = Math.round(ni * 0.55), nRg = Math.round(ni * 0.18), NSP = 14;
        for (let i = 0; i < nSp; i++) { const k = i % NSP, j = (i / NSP) | 0, nj = Math.ceil(nSp / NSP); B.add({ type: 1, part: 1, seg: sg, feat: 12, side: sd, a: 0.32 + 0.66 * (j + 0.5) / nj, b: (k + 0.5 * (j % 2) * 0.15) / NSP * TAU, chain: -1, dist: 0.5, size: 0.9, shape: 0 }); }
        const chR = seg++; for (let i = 0; i < nRg; i++) B.add({ type: 1, part: 1, seg: sg, feat: 12, side: sd, a: 0.62, b: i / nRg * TAU, chain: chR, dist: 0.5, size: 0.9, shape: 0 });
        for (let i = 0; i < ni - nSp - nRg; i++) B.add({ type: 1, part: 1, seg: sg, feat: 2, side: sd, a: Math.sqrt(rng()), b: rng() * TAU, chain: -1, dist: 0.4 + rng() * 0.4, size: 0.9, shape: 0 });
        const nx = cnt('faceX') / 2;
        { const m = Math.max(6, Math.round(nx * 0.1)); for (let i = 0; i < m; i++) B.add({ type: 1, part: 1, seg: sg, feat: 13, side: sd, a: -1 + 2 * ((i % 7) + 0.5) / 7, b: ((i / 7 | 0) % 3 - 1) * 0.7, chain: -1, dist: 0.5, size: 0.9, shape: 0 }); }
        { const nl = Math.max(4, Math.round(nx * 0.33 / 3)); for (let j = 0; j < 3; j++) for (let i = 0; i < nl; i++) B.add({ type: 1, part: 1, seg: sg, feat: 9, side: sd, a: -0.7 + 1.65 * i / (nl - 1), b: (j + 0.6) / 3, chain: -1, dist: 0.6, size: 0.9, shape: 3 }); }   // cílios
        face(10, sd, nx * 0.24, [[0, 0.6, 0], [1, 0.4, 1]], q => -0.15 + 1.75 * q);   // delineado gatinho (tinta + fio de cor)
        { const m = Math.round(nx * 0.24); for (let i = 0; i < m; i++) B.add({ type: 1, part: 1, seg: sg, feat: 11, side: sd, a: -0.9 + 1.9 * rng(), b: rng(), chain: -1, dist: 0.6, size: 1, shape: 0 }); }   // esfumado
      }
      { const nx = cnt('faceX'); for (const sgn of [1, -1]) for (let k = 0; k < Math.max(2, Math.round(nx * 0.04)); k++) B.add({ type: 1, part: 1, seg: seg++, feat: 14, side: 0, a: sgn * 0.5, b: k / Math.max(1, Math.round(nx * 0.04) - 1), chain: -1, dist: 0.6, size: 0.9, shape: 0 }); }   // caninos
      const nb = cnt('brows') / 2;
      for (const sd of [1, -1]) face(4, sd, nb, [[0, 0.75, 1], [0.0005, 0.25, 0]], q => -1 + 2 * q);   // sobrancelha fina
      const nm = cnt('mouth');
      face(5, 0, nm * 0.44, [[1, 1, 1]], q => q * TAU);
      face(6, 0, nm * 0.32, [[0.62, 1, 1]], q => q * TAU);
      face(7, 0, nm * 0.24, [[0, 1, 0]], q => -0.72 + 1.44 * q);
      face(8, 0, cnt('nose'), [[0, 1, 0]], q => q);
    }
    /* cabelo longo, cacheado e volumoso (tipo 2). Cada mecha nasce na risca do meio, cobre o couro cabeludo
       e cai em cachos espirais que abrem para baixo; franja cortina cacheada emoldurando o rosto */
    { const hs = this.strands = [];
      const nLong = port ? 70 : 66, sA = 0.3;
      for (let k = 0; k < nLong; k++) {
        const side = k % 2 ? 1 : -1, q = clamp(((k >> 1) + rng() * 0.8) / (nLong / 2), 0, 1);
        const beta = lerp(0.72, 2.45, Math.pow(q, 0.9)), d0 = norm3([side * (0.06 + 0.05 * rng()), Math.sin(beta), Math.cos(beta)]);
        let Az = side * clamp(lerp(58, 172, Math.pow(q, 0.85)) + (rng() - 0.5) * 26, 50, 178) * D2R;
        const back = smooth(1.2, 2.9, Math.abs(Az)), ve = lerp(-0.005, -0.06, back) + (rng() - 0.5) * 0.012, se = clamp(ve / HRAD[1], -0.95, 0.95), ce = Math.sqrt(1 - se * se);
        const dE = norm3([Math.sin(Az) * ce, se, Math.cos(Az) * ce]), kE = lerp(1.4, 1.22, back) + rng() * 0.06;
        const mySide = side === ASYM, front = Math.abs(Az) < 82 * D2R;
        let Lf = front ? 0.24 + rng() * 0.1 : lerp(0.3, 0.42, back) + rng() * 0.08; if (mySide) Lf *= 0.84 + rng() * 0.08;    // cortado sem espelho, de propósito
        let W1, W2;
        if (front) { W1 = [side * (0.19 + 0.03 * rng()), 1.38, 0.035 + 0.03 * rng()]; W2 = [side * (0.17 + 0.045 * rng()), 1.38 - Lf, 0.085 + 0.035 * rng()]; }
        else { const bx = lerp(0.25, 0.015, back) * side * (1.0 + 0.3 * rng()) + (rng() - 0.5) * 0.06; W1 = [lerp(0.22, 0.05, back) * side, 1.4, lerp(-0.06, -0.14, back)]; W2 = [bx, 1.37 - Lf, -0.12 - 0.045 * rng() - 0.02 * (1 - back)]; }
        const len = 0.16 + Lf, rc1 = 0.02 + rng() * 0.013, pitch = 0.082 + rng() * 0.03;
        hs.push({ kind: 0, d0, dE, k0: 1.08 + 0.04 * rng(), kE, crown: 0.09 + 0.06 * rng() * (1 - back), W1, W2, sA, ph: rng() * TAU, turns: len / pitch, rc0: 0.005 + 0.004 * rng(), rc1, tube: 0.006 + rng() * 0.004,
          hl: rng() < 0.35 ? 0.75 + 0.25 * rng() : 0.25 + 0.4 * rng(), w: len * (0.9 + rng() * 0.4), sway: rng() * TAU, Lf });
      }
      for (let k = 0; k < 14; k++) { // franja cortina cacheada: da risca para as têmporas, sem cobrir os olhos
        const side = k % 2 ? 1 : -1, j = (k >> 1) / 6, mySide = side === ASYM;
        const b0 = [side * (0.006 + 0.012 * j), 0.074 - 0.004 * j], b1 = [side * (0.04 + 0.02 * j), 0.072 - 0.01 * j], b2 = [side * (0.07 + 0.012 * j + 0.006 * rng()), (mySide ? 0.018 : 0.005) - 0.025 * j];
        hs.push({ kind: 1, b0, b1, b2, fall: mySide && (k >> 1) >= 1 && (k >> 1) <= 3 ? (k >> 1) : 0, ph: rng() * TAU, turns: 1.4 + rng() * 1.2, rc0: 0.003, rc1: 0.006 + 0.004 * rng(), tube: mySide && (k >> 1) >= 1 && (k >> 1) <= 3 ? 0.006 : 0.004, hl: mySide && (k >> 1) >= 1 && (k >> 1) <= 3 ? 0.85 : 0.35 + 0.4 * rng(), w: mySide && (k >> 1) >= 1 && (k >> 1) <= 3 ? 0.7 : 0.38, sway: rng() * TAU, sA: 0 });
      }
      const nh = cnt('hair'); let tw = 0; for (const st of hs) tw += st.w;
      this.M = 28; this.strandPts = new Float32Array(hs.length * this.M * 3); this.strandFrame = new Float32Array(hs.length * this.M * 6);
      for (let k = 0; k < hs.length; k++) {
        const st = hs[k], ch = seg++, n = Math.max(6, Math.round(nh * st.w / tw)), mC = Math.round(n * 0.5), mF = Math.round(n * 0.12), mB = n - mC - mF;
        for (let i = 0; i < mC; i++) { const s = i / (mC - 1); B.add({ type: 2, part: 2, seg: ch, strand: k, s, ox: 0, oy: 0, chain: ch, dist: s, size: 0.85, shape: 3, flags: 4 }); }
        for (let i = 0; i < mB; i++) { const s = Math.pow(rng(), 0.85), a = rng() * TAU, rr = Math.sqrt(rng());
          B.add({ type: 2, part: 2, seg: ch, strand: k, s, ox: Math.cos(a) * rr, oy: Math.sin(a) * rr, chain: -1, dist: s, size: 1, shape: 3, sparkle: rng() < 0.06 ? 1 : 0, flags: s > 0.55 && rng() < 0.4 ? 1 : 0 }); }
        for (let i = 0; i < mF; i++) { const s = lerp(0.2, 1, rng()), a = rng() * TAU, rr = 1.6 + 1.6 * rng();   // frizz: o halo do cabelo cacheado
          B.add({ type: 2, part: 2, seg: ch, strand: k, s, ox: Math.cos(a) * rr, oy: Math.sin(a) * rr, chain: -1, dist: s, size: 0.6, shape: 0, flags: 2 }); }
      }
    }
    /* ---------- acessórios e marca (tipo 4): geometria própria; desligados, viram aura ---------- */
    let dry = 0, dryOn = false;   // modo de medição: conta sem criar
    const item = (id, P, skw, part, o = {}) => { if (port && P.p[1] < 1.11) return -1; if (dryOn) { dry++; return -1; } return B.add({ type: 4, item: id, x: P.p[0], y: P.p[1], z: P.p[2], nx: P.n[0], ny: P.n[1], nz: P.n[2], j1: skw[0], j2: skw[1], w2: skw[2] || 0, part, dist: o.dist ?? 0.5,
      chain: o.chain ?? -1, seg: o.seg ?? 0, size: o.size ?? 0.55, shape: o.shape ?? 0, col: o.col || MAT.white, al: o.al ?? 0.8, hang: o.hang || 0, pA: o.pA || 0, pB: o.pB || 0, sub: o.sub || 0, q1: o.q1, q2: o.q2, q3: o.q3, q4: o.q4, sparkle: o.spark ? 1 : 0 }); };
    // linha contínua (contorno) por uma lista de {p, n, k: [j1, j2, w2]}
    const line = (id, pts, part, o = {}) => { const ch = seg++; for (const q of pts) item(id, q, q.k, part, { ...o, chain: ch }); return ch; };
    // pesponto: traços curtos separados (cada par de pontos é um traço)
    const stitch = (id, pts, part, o = {}) => { for (let i = 0; i + 1 < pts.length; i += 3) { const ch = seg++; item(id, pts[i], pts[i].k, part, { ...o, chain: ch }); item(id, pts[i + 1], pts[i + 1].k, part, { ...o, chain: ch }); } };
    const resample = (fn, m) => { const out = []; for (let i = 0; i < m; i++) out.push(fn(m === 1 ? 0.5 : i / (m - 1))); return out; };
    const ring = (id, ctr, e1, e2, nrm, r1, r2, m, skw, part, o) => line(id, resample(q => { const a = q * TAU; return { p: [ctr[0] + (e1[0] * Math.cos(a) * r1 + e2[0] * Math.sin(a) * r2), ctr[1] + (e1[1] * Math.cos(a) * r1 + e2[1] * Math.sin(a) * r2), ctr[2] + (e1[2] * Math.cos(a) * r1 + e2[2] * Math.sin(a) * r2)], n: nrm, k: skw }; }, m), part, o);
    const tframe = n => { const e1 = norm3(cross3([0, 1, 0], n)), e2 = cross3(n, e1); return [e1, e2]; };
    // ponto no tronco com pesos de esfola
    const TP = (h, ang, off) => { const P = torsoPt(h, ang, off); P.k = torsoSkin(h); return P; };
    const TPx = (h, x, off, back = false) => TP(h, back ? backAng(h, x) : frontAng(h, x), off);
    const legP = (s, y, ang, off) => { const P = legAt(s, y, ang, off); P.k = legSkin(s, y); return P; };
    const SIDES = [1, -1], SN = { 1: 'L', [-1]: 'R' };

    // ---------- fone over-ear branco, descansando no pescoço ----------
    const buildFone = n => {
      if (n) { const skC = [J.chest, J.neck, 0.2], skB = [J.chest, J.neck, 0.45], ID = ITEM_ID.fone, nCup = Math.round(n * 0.3), nBand = Math.round(n * 0.22), nYoke = Math.round(n * 0.08), nCab = n - 2 * nCup - nBand - nYoke;
        const yokeTop = {}, cupBottom = {};
        for (const sx of SIDES) {
          const c = FONE.cups[sx], nC = foneN(sx), [e1, e2] = tframe(nC), up = e2[1] > 0 ? e2 : e2.map(v => -v), a = FONE.a, b = FONE.b;
          const K2 = FONE.k, pt = (r1, r2, d) => [c[0] + (e1[0] * r1 + up[0] * r2 + nC[0] * d) * K2, c[1] + (e1[1] * r1 + up[1] * r2 + nC[1] * d) * K2, c[2] + (e1[2] * r1 + up[2] * r2 + nC[2] * d) * K2];   // mesma posição, concha menor
          const mRim = Math.round(nCup * 0.2), mDome = Math.round(nCup * 0.28), mLogo = Math.round(nCup * 0.1), mPad = Math.round(nCup * 0.3), mPadL = nCup - mRim - mDome - mLogo - mPad;
          line(ID, resample(q => ({ p: pt(Math.cos(q * TAU) * a, Math.sin(q * TAU) * b, 0.006), n: nC, k: skC }), mRim), 1, { col: MAT.foneW, al: 1, size: 0.6 });
          for (let i = 0; i < mDome; i++) { const ang = rng() * TAU, rr = Math.sqrt(rng()) * 0.92; item(ID, { p: pt(Math.cos(ang) * a * rr, Math.sin(ang) * b * rr, 0.006 + 0.009 * (1 - rr * rr)), n: nC }, skC, 1, { col: MAT.foneW, al: 0.62, size: 0.62 }); }
          line(ID, resample(q => ({ p: pt(Math.cos(q * TAU) * a * 0.52, Math.sin(q * TAU) * b * 0.52, 0.0145), n: nC, k: skC }), Math.max(6, mLogo - 3)), 1, { col: MAT.foneM, al: 0.9, size: 0.45 });
          for (let i = 0; i < 3; i++) item(ID, { p: pt((i - 1) * 0.004, 0, 0.0155), n: nC }, skC, 1, { col: MAT.silver, al: 1, size: 0.5 });
          for (let i = 0; i < mPad; i++) { const ang = rng() * TAU, tb = rng() * TAU, R1 = a * 0.9 + Math.cos(tb) * 0.008, R2 = b * 0.9 + Math.cos(tb) * 0.008;
            item(ID, { p: pt(Math.cos(ang) * R1, Math.sin(ang) * R2, -0.012 + Math.sin(tb) * 0.008), n: norm3([Math.cos(ang) * e1[0] + Math.sin(ang) * up[0], Math.cos(ang) * e1[1] + Math.sin(ang) * up[1], Math.cos(ang) * e1[2] + Math.sin(ang) * up[2]]) }, skC, 1, { col: MAT.foneC, al: 0.5, size: 0.6 }); }
          line(ID, resample(q => ({ p: pt(Math.cos(q * TAU) * a * 1.07, Math.sin(q * TAU) * b * 1.07, -0.01), n: nC, k: skC }), mPadL), 1, { col: MAT.foneC, al: 0.75, size: 0.5 });
          // garfo (yoke) em arco por cima da concha, até o arco
          const mY = Math.round(nYoke / 2), yk = resample(q => { const th = q * Math.PI; return { p: pt(Math.cos(th) * a * 1.16, Math.sin(th) * b * 1.2 + 0.004, -0.002), n: nC, k: skC }; }, mY);
          line(ID, yk, 1, { col: MAT.foneW, al: 0.95, size: 0.55 });
          yokeTop[sx] = pt(0, b * 1.2 + 0.012, -0.002); cupBottom[sx] = pt(0, -b * 1.02, -0.002);
        }
        // arco: passa por cima dos ombros e por trás do pescoço
        const ctrl = [yokeTop[1], [0.108, 1.49, 0.02], [0.07, 1.496, -0.07], [0, 1.498, -0.094], [-0.07, 1.496, -0.07], [-0.108, 1.49, 0.02], yokeTop[-1]];
        const cr = (P0, P1, P2, P3, t) => P1.map((_, d) => 0.5 * ((2 * P1[d]) + (-P0[d] + P2[d]) * t + (2 * P0[d] - 5 * P1[d] + 4 * P2[d] - P3[d]) * t * t + (-P0[d] + 3 * P1[d] - 3 * P2[d] + P3[d]) * t * t * t));
        const bandAt = q => { const f = q * (ctrl.length - 1), i = Math.min(ctrl.length - 2, f | 0), u = f - i; return cr(ctrl[Math.max(0, i - 1)], ctrl[i], ctrl[i + 1], ctrl[Math.min(ctrl.length - 1, i + 2)], u); };
        const bandN = q => { const p = bandAt(q); return norm3([p[0], 0, p[2] + 0.01]); };
        const mE = Math.round(nBand * 0.3);
        for (const dy of [0.011 * FONE.kb, -0.011 * FONE.kb]) line(ID, resample(q => { const p = bandAt(q); return { p: [p[0], p[1] + dy, p[2]], n: bandN(q), k: skB }; }, mE), 1, { col: MAT.foneW, al: 0.95, size: 0.55 });
        const mFill = nBand - 2 * mE;
        for (let i = 0; i < mFill; i++) { const q = rng(), p = bandAt(q), nn = bandN(q), inner = rng() < 0.3, slider = q < 0.12 || q > 0.88;
          item(ID, { p: [p[0] - nn[0] * (inner ? 0.006 : 0), p[1] + (rng() - 0.5) * 0.02 * FONE.kb, p[2] - nn[2] * (inner ? 0.006 : 0)], n: nn }, skB, 1, { col: slider && !inner ? MAT.silver : inner ? MAT.foneC : MAT.foneW, al: inner ? 0.35 : slider ? 0.85 : 0.6, size: 0.55 }); }
        // cabo: sai da concha do lado de lá e pende sobre o peito
        const c0 = cupBottom[1], cab = resample(q => { const y = c0[1] - 0.25 * q, x = c0[0] - 0.012 * Math.sin(q * Math.PI) - 0.01 * q, zb = torsoPt(y, frontAng(y, x), 0.034).p[2]; return { p: [x, y, Math.max(c0[2] - 0.02 * q, zb)], n: [0, 0, 1], k: torsoSkin(y), q }; }, Math.max(6, nCab - 4));
        const chC = seg++; cab.forEach(P => item(ID, P, P.k, 0, { chain: chC, col: MAT.cable, al: 0.85, size: 0.42, sub: 5, pA: P.q }));
        const tip = cab[cab.length - 1]; for (let i = 0; i < 4; i++) item(ID, { p: [tip.p[0], tip.p[1] - 0.004 * i, tip.p[2] + 0.002], n: [0, 0, 1] }, tip.k, 0, { col: MAT.silver, al: 1, size: 0.48, sub: 5, pA: 1 });
      } };

    // ---------- coturnos ----------
    const buildBoots = n => {
      if (n) for (const s of ['L', 'R']) {
        const nb = Math.round(n / 2), sg1 = s === 'L' ? 1 : -1, an = restOf('an' + s), untied = s === ASYM_S, ID = ITEM_ID.coturnos;
        const BPt = (zp, b, off) => { const P = bootPt(s, zp, b, off); P.k = bootSkin(s, P.p[1], zp); return P; };
        const SPt = (y, a, off) => { const P = shaftPt(s, y, a, off); P.k = bootSkin(s, y, 0); return P; };
        const nUp = Math.round(nb * 0.27), nSole = Math.round(nb * 0.27), nLace = Math.round(nb * 0.19), nDet = nb - nUp - nSole - nLace;
        // cabedal (couro com brilho) — forma + cano
        for (let i = 0; i < nUp; i++) { let P;
          if (rng() < 0.55) { const zp = lerp(BOOT.heel, BOOT.toe, rng()), b = rng() * Math.PI; P = BPt(zp, b, 0.001); }
          else { const y = lerp(BOOT.shaftLo, BOOT.collar - 0.004, rng()), a = rng() * TAU - Math.PI; P = SPt(y, a, 0.001); }
          item(ID, P, P.k, 5, { col: lerp3(leatherAt(P.p[0], P.p[1], P.p[2], 5), MAT.ledge, 0.4), al: 0.85, size: 0.62, dist: 0.95 }); }
        // solado tratorado: contorno do topo (vira), fundo, parede com cravos
        const outl = q => { const sideQ = q < 0.5, f = sideQ ? q * 2 : (1 - q) * 2, zp = lerp(BOOT.heel - 0.004, BOOT.toe + 0.004, f), w = bootW(clamp(zp, BOOT.heel, BOOT.toe)) + 0.006; return { zp, x: an[0] + (sideQ ? w : -w) * (zp < BOOT.heel + 0.002 || zp > BOOT.toe - 0.002 ? 0.2 : 1), s: sideQ ? 1 : -1 }; };
        const SolP = (q, y, off = 0) => { const o = outl(q), nn = norm3([o.s * 1, 0, o.zp > 0.12 ? (o.zp - 0.12) * 12 : o.zp < -0.04 ? (o.zp + 0.04) * 14 : 0]); return { p: [o.x + nn[0] * off, y < 0 ? bootSole(o.zp) + y : y, an[2] + o.zp + nn[2] * off], n: nn, k: bootSkin(s, 0.02, o.zp) }; };
        const mE = Math.round(nSole * 0.2), nG = Math.max(8, Math.round((nSole - 2 * mE - Math.round(nSole * 0.14)) / 2));
        line(ID, resample(q => SolP(q, -0.001, 0.001), mE), 5, { col: MAT.soleEdge, al: 1, size: 0.52, dist: 0.95 });
        line(ID, resample(q => SolP(q, 0.002, 0.001), mE), 5, { col: MAT.soleEdge, al: 0.9, size: 0.5, dist: 0.95 });
        stitch(ID, resample(q => SolP(q, -0.007, 0.0012), Math.round(nSole * 0.14)), 5, { col: MAT.stitchL, al: 0.85, size: 0.36, dist: 0.95 });
        for (let g = 0; g < nG; g++) { const q = (g + 0.5) / nG, o = outl(q), top = bootSole(o.zp) * 0.72;   // cravos do solado tratorado: blocos verticais
          line(ID, [SolP(q, 0.003, 0.0016), SolP(q, top, 0.0016)], 5, { col: lerp3(MAT.sole, MAT.soleEdge, 0.7), al: 0.95, size: 0.46, dist: 0.95 }); }
        // silhueta: crista da biqueira até a língua e linha do calcanhar
        line(ID, resample(q => BPt(lerp(BOOT.toe - 0.004, 0.118, q), Math.PI / 2, 0.0015), Math.round(nSole * 0.12)), 5, { col: MAT.ledge, al: 0.8, size: 0.42, dist: 0.95 });
        line(ID, resample(q => q < 0.6 ? SPt(lerp(BOOT.collar - 0.004, BOOT.shaftLo, q / 0.6), Math.PI, 0.0015) : BPt(BOOT.heel + 0.004, Math.PI / 2 * (1 - (q - 0.6) / 0.4) + 0.05, 0.0015), Math.round(nSole * 0.1)), 5, { col: MAT.ledge, al: 0.75, size: 0.42, dist: 0.95 });
        for (const sdb of [0, 1]) line(ID, resample(q => { const b0 = lerp(Math.PI / 2 - 0.62, 0.14, q); return BPt(lerp(0.104, 0.03, q), sdb ? Math.PI - b0 : b0, 0.0015); }, Math.max(5, Math.round(nSole * 0.07))), 5, { col: MAT.ledge, al: 0.75, size: 0.4, dist: 0.95 });   // costura do cabedal
        // ilhoses (5 pares) + ganchos (3 pares) e cadarço cruzado
        const eyes = [];
        for (let k = 0; k < 5; k++) { const zp = lerp(0.112, 0.036, k / 4); eyes.push([BPt(zp, Math.PI / 2 - 0.42, 0.002), BPt(zp, Math.PI / 2 + 0.42, 0.002)]); }
        for (let k = 0; k < 3; k++) { const y = [0.13, 0.155, 0.179][k]; eyes.push([SPt(y, 0.34, 0.003), SPt(y, -0.34, 0.003)]); }
        const lift = (P, d) => ({ p: [P.p[0] + P.n[0] * d, P.p[1] + P.n[1] * d, P.p[2] + P.n[2] * d], n: P.n, k: P.k });
        eyes.forEach((pr, k) => pr.forEach(P => { const [e1, e2] = tframe(P.n), hook = k >= 5;
          const ne2 = nb > 330 ? (hook ? 5 : 6) : nb > 200 ? (hook ? 3 : 4) : 2; for (let i = 0; i < ne2; i++) { const a = hook ? Math.PI * (0.15 + 0.7 * i / Math.max(1, ne2 - 1)) : i / ne2 * TAU, r = hook ? 0.0045 : 0.0034;
            item(ID, { p: [P.p[0] + (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * r + P.n[0] * (hook ? 0.003 * Math.sin(a) : 0), P.p[1] + (e1[1] * Math.cos(a) + e2[1] * Math.sin(a)) * r, P.p[2] + (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * r + P.n[2] * (hook ? 0.003 * Math.sin(a) : 0)], n: P.n }, P.k, 5, { col: MAT.silver, al: 1, size: 0.4, dist: 0.97 }); } }));
        const perX = Math.max(2, Math.round(nLace * 0.75 / (eyes.length - 1) / 2));
        for (let k = 0; k + 1 < eyes.length; k++) for (const [a0, b0] of [[0, 1], [1, 0]]) {
          const P0 = lift(eyes[k][a0], 0.003), P1 = lift(eyes[k + 1][b0], 0.003);
          line(ID, resample(q => ({ p: lerp3(P0.p, P1.p, q).map((v, d) => v + P0.n[d] * 0.004 * Math.sin(q * Math.PI)), n: P0.n, k: q < 0.5 ? P0.k : P1.k }), perX), 5, { col: MAT.lace, al: 0.9, size: 0.45, dist: 0.97 }); }
        line(ID, resample(q => lift({ p: lerp3(eyes[0][0].p, eyes[0][1].p, q), n: eyes[0][0].n, k: eyes[0][0].k }, 0.003), 4), 5, { col: MAT.lace, al: 0.9, size: 0.45, dist: 0.97 });
        const top = lift(eyes[7][0], 0.0), topR = lift(eyes[7][1], 0.0), knot = lerp3(top.p, topR.p, 0.5), kk = top.k, nT = Math.max(6, nLace - (eyes.length - 1) * 2 * perX - 4);
        if (!untied) { // laço amarrado
          for (const sgl of [1, -1]) line(ID, resample(q => { const a = q * TAU; return { p: [knot[0] + sgl * (0.011 + Math.cos(a) * 0.009), knot[1] + 0.006 + Math.sin(a) * 0.006, knot[2] + 0.012], n: [0, 0, 1], k: kk }; }, Math.round(nT * 0.3)), 5, { col: MAT.lace, al: 0.95, size: 0.45, dist: 0.97 });
          for (let i = 0, m = nT - 2 * Math.round(nT * 0.3); i < m; i++) { const e = i % 2, sP = Math.floor(i / 2) / Math.max(1, Math.floor(m / 2) - 1); item(ID, { p: [knot[0] + (e ? 0.004 : -0.004) + (e ? 1 : -1) * 0.006 * sP, knot[1], knot[2] + 0.012], n: [0, 0, 1] }, kk, 5, { col: MAT.lace, al: 0.9, size: 0.45, hang: 0.035, pA: sP, pB: e, dist: 0.97 }); }
        } else { // pontas soltas: penduradas, balançam com o pé
          for (let i = 0; i < nT; i++) { const e = i % 2, sP = Math.floor(i / 2) / Math.max(1, Math.floor(nT / 2) - 1); item(ID, { p: [knot[0] + (e ? 1 : -1) * 0.014, knot[1], knot[2] + 0.008], n: [0, 0, 1] }, kk, 5, { col: MAT.lace, al: 0.9, size: 0.45, sub: 2, pA: Math.min(1, sP), pB: e, dist: 0.97 }); }
        }
        // detalhes: biqueira, contraforte, zíper lateral, gola acolchoada, alça de puxar, língua
        const dA = Math.round(nDet * 0.14);
        line(ID, resample(q => BPt(0.13 + 0.016 * Math.sin(lerp(0.15, Math.PI - 0.15, q)), lerp(0.15, Math.PI - 0.15, q), 0.0015), dA), 5, { col: MAT.ledge, al: 0.85, size: 0.42, dist: 0.95 });
        stitch(ID, resample(q => BPt(0.124 + 0.016 * Math.sin(lerp(0.2, Math.PI - 0.2, q)), lerp(0.2, Math.PI - 0.2, q), 0.0015), dA), 5, { col: MAT.stitchL, al: 0.8, size: 0.36, dist: 0.95 });
        for (const sdb of [0, 1]) line(ID, resample(q => { const f = lerp(0.08, 0.9, q), b0 = Math.asin(Math.min(1, Math.pow(f, 1.3))); return BPt(lerp(0.0, -0.05, q), sdb ? Math.PI - b0 : b0, 0.0015); }, Math.round(dA * 0.6)), 5, { col: MAT.ledge, al: 0.7, size: 0.4, dist: 0.95 });
        const za = -sg1 * Math.PI / 2, nZ = Math.round(nDet * 0.24), zch = seg++;   // zíper do lado de dentro
        for (let i = 0; i < nZ; i++) { const q = i / (nZ - 1), y = lerp(0.183, 0.07, q), off = (i % 2 ? 1 : -1) * 0.0022;
          const P = y >= BOOT.shaftLo ? SPt(y, za + off / 0.05, 0.0018) : BPt(lerp(-0.004, -0.01, q), sg1 > 0 ? Math.PI - 0.6 * (y - 0.046) / 0.05 : 0.6 * (y - 0.046) / 0.05, 0.0018);
          item(ID, P, P.k, 5, { col: MAT.silver, al: 0.95, size: 0.36, dist: 0.95, chain: i % 2 ? -1 : zch }); }
        { const P = SPt(0.186, za, 0.004); for (let i = 0; i < 4; i++) item(ID, { p: [P.p[0], P.p[1], P.p[2]], n: P.n }, P.k, 5, { col: MAT.silver, al: 1, size: 0.45, hang: 0.016, pA: i / 3, pB: 3, dist: 0.97 }); }
        const nCol = Math.round(nDet * 0.3);
        line(ID, resample(q => SPt(BOOT.collar + 0.006, q * TAU - Math.PI, 0.006), Math.round(nCol * 0.35)), 5, { col: MAT.ledge, al: 0.9, size: 0.45, dist: 0.95 });
        stitch(ID, resample(q => SPt(BOOT.collar - 0.006, q * TAU - Math.PI, 0.0045), Math.round(nCol * 0.3)), 5, { col: MAT.stitchL, al: 0.8, size: 0.36, dist: 0.95 });
        for (let i = 0, m = nCol - Math.round(nCol * 0.35) - Math.round(nCol * 0.3); i < m; i++) { const a = rng() * TAU - Math.PI, tb = rng() * Math.PI; const P = SPt(BOOT.collar + 0.002 + Math.sin(tb) * 0.006, a, 0.003 + Math.sin(tb) * 0.004); item(ID, P, P.k, 5, { col: leatherAt(P.p[0], P.p[1], P.p[2], 7), al: 0.55, size: 0.55, dist: 0.95 }); }
        const nLoop = Math.round(nDet * 0.12); line(ID, resample(q => { const th = q * Math.PI, P = SPt(BOOT.collar - 0.002, Math.PI + (q - 0.5) * 0.26, 0.004); P.p[1] += Math.sin(th) * 0.024; return P; }, nLoop), 5, { col: MAT.ledge, al: 0.9, size: 0.42, dist: 0.97 });
        const nTg = nDet - dA * 2 - 2 * Math.round(dA * 0.6) - nZ - 4 - nCol - nLoop;
        if (nTg > 2) line(ID, resample(q => { const a = (q - 0.5) * 0.5, P = SPt(BOOT.collar + 0.012 - 0.006 * (2 * q - 1) ** 2, a, 0.002); return P; }, nTg), 5, { col: MAT.ledge, al: 0.85, size: 0.42, dist: 0.97 });
      } };

    // ---------- jaqueta de motoqueiro (couro preto) ----------
    const buildJacket = n => {
      if (n) { const ID = ITEM_ID.jaqueta, off = JK.off + 0.003, edgeC = { col: MAT.ledge, al: 0.9, size: 0.45 };
        // bordas da abertura (lapela inclusa) + zíper aberto: dentes nas duas bordas, cursor e puxador do lado de lá
        const nEdge = Math.round(n * 0.07), nTeeth = Math.round(n * 0.1);
        for (const sx of SIDES) {
          line(ID, resample(q => { const h = lerp(JK.hem, 1.443, q); return TPx(h, sx * jkOpen(h), off); }, Math.round(nEdge / 2)), 0, edgeC);
          for (let i = 0, m = Math.round(nTeeth / 2); i < m; i++) { const h = lerp(JK.hem + 0.004, 1.198, i / (m - 1)); item(ID, TPx(h, sx * (jkOpen(h) + 0.0035 + (i % 2) * 0.0024), off + 0.001), torsoSkin(h), 0, { col: MAT.silver, al: 0.95, size: 0.36 }); }
        }
        { const P = TPx(JK.hem + 0.006, jkOpen(JK.hem) + 0.004, off + 0.003); for (let i = 0; i < 5; i++) item(ID, { p: [P.p[0], P.p[1], P.p[2] + 0.001], n: P.n }, P.k, 0, { col: MAT.silver, al: 1, size: 0.48, hang: 0.03, pA: i / 4, pB: 7 }); }
        // lapelas largas com pesponto e botão de pressão na ponta
        const nLap = Math.round(n * 0.22);
        for (const sx of SIDES) {
          const poly = LAPEL.map(([x, h]) => [x * sx, h]), mO = Math.round(nLap * 0.16), mS = Math.round(nLap * 0.12), mF = Math.round(nLap / 2) - mO - mS - 7;
          const per = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; per.push([a, b, Math.hypot(b[0] - a[0], b[1] - a[1])]); }
          const tot = per.reduce((s2, e) => s2 + e[2], 0), polyAt = (q, shrink) => { let d = q * tot; for (const [a, b, l] of per) { if (d <= l) { const f = d / l; let x = lerp(a[0], b[0], f), h = lerp(a[1], b[1], f); if (shrink) { const cx = sx * 0.088, ch = 1.32; x = lerp(x, cx, shrink); h = lerp(h, ch, shrink); } return [x, h]; } d -= l; } return a0(); }, a0 = () => poly[0];
          line(ID, resample(q => { const [x, h] = polyAt(q, 0); return TPx(h, x, off + 0.008); }, mO), 0, { col: MAT.ledge, al: 0.95, size: 0.45 });
          stitch(ID, resample(q => { const [x, h] = polyAt(q, 0.13); return TPx(h, x, off + 0.009); }, mS), 0, { col: MAT.stitchL, al: 0.75, size: 0.34 });
          const inPoly = (x, h) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > h) !== (yj > h)) && (x < (xj - xi) * (h - yi) / (yj - yi) + xi)) c = !c; } return c; };
          for (let i = 0, tries = 0; i < mF && tries < mF * 30; tries++) { const x = sx * lerp(0.056, 0.115, rng()), h = lerp(1.2, 1.447, rng()); if (!inPoly(x, h)) continue; i++; const P = TPx(h, x, off + 0.007); item(ID, P, P.k, 0, { col: leatherAt(x, h, P.p[2], 9), al: 0.6, size: 0.55 }); }
          const st = TPx(1.305, sx * 0.1, off + 0.011); const [e1, e2] = tframe(st.n); for (let i = 0; i < 7; i++) { const a = i / 6 * TAU, r = i === 6 ? 0 : 0.0042; item(ID, { p: [st.p[0] + (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * r, st.p[1] + (e1[1] * Math.cos(a) + e2[1] * Math.sin(a)) * r, st.p[2] + (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * r], n: st.n }, st.k, 0, { col: MAT.silver, al: 1, size: 0.42 }); }
        }
        // bolsos com zíper: um diagonal no peito, dois embaixo
        const nPk = Math.round(n * 0.12), zipLine = (x0, h0, x1, h1, m) => {
          const ch1 = seg++, ch2 = seg++;
          for (let i = 0; i < m; i++) { const q = i / (m - 1), x = lerp(x0, x1, q), h = lerp(h0, h1, q), dx = (h1 - h0), dh = -(x1 - x0), dl = Math.hypot(dx, dh), z = i % 3;
            if (z === 2) item(ID, TPx(h, x, off + 0.002), torsoSkin(h), 0, { col: MAT.silver, al: 0.95, size: 0.34 });
            else { const sgz = z === 0 ? 1 : -1; item(ID, TPx(h + dh / dl * 0.004 * sgz, x + dx / dl * 0.004 * sgz, off + 0.002), torsoSkin(h), 0, { col: MAT.ledge, al: 0.85, size: 0.38, chain: z === 0 ? ch1 : ch2 }); } }
          const P = TPx(h1, x1, off + 0.004); for (let i = 0; i < 3; i++) item(ID, { p: P.p, n: P.n }, P.k, 0, { col: MAT.silver, al: 1, size: 0.42, hang: 0.016, pA: i / 2, pB: 11 + x0 * 40 }); };
        zipLine(0.086, 1.198, 0.128, 1.27, Math.round(nPk * 0.4));
        for (const sx of SIDES) zipLine(sx * 0.076, 1.112, sx * 0.116, 1.172, Math.round(nPk * 0.3) - 1);
        // cinto na bainha: bordas, pesponto, passantes, fivela de um lado, ponta com furos do outro
        const nBelt = Math.round(n * 0.2), beltRing = (h, m, fn, o2) => { const a0b = frontAng(h, jkOpen(h) + 0.001); return resample(q => fn(h, lerp(a0b, TAU - a0b, q)), m); };
        for (const h of [JK.hem + 0.001, JK.hem + JK.belt]) line(ID, beltRing(h, Math.round(nBelt * 0.17), (h2, a) => TP(h2, a, off + 0.007)), 0, edgeC);
        for (const h of [JK.hem + 0.006, JK.hem + JK.belt - 0.005]) stitch(ID, beltRing(h, Math.round(nBelt * 0.14), (h2, a) => TP(h2, a, off + 0.0075)), 0, { col: MAT.stitchL, al: 0.7, size: 0.34 });
        for (let i = 0, m = Math.round(nBelt * 0.14); i < m; i++) { const h = lerp(JK.hem + 0.008, JK.hem + JK.belt - 0.008, rng()), a0b = frontAng(h, jkOpen(h)), a = lerp(a0b, TAU - a0b, rng()), P = TP(h, a, off + 0.007); item(ID, P, P.k, 0, { col: leatherAt(P.p[0], h, P.p[2], 11), al: 0.55, size: 0.55 }); }
        for (const sx of SIDES) line(ID, resample(q => { const h = JK.hem - 0.006 + (q < 0.5 ? q * 2 : 2 - q * 2) * (JK.belt + 0.012), a = sx * (Math.PI / 2 + (q < 0.5 ? -0.05 : 0.05)); return TP(h, a, off + 0.011); }, 6), 0, edgeC);
        { const cx = -0.092, ch = JK.hem + JK.belt / 2, w = 0.019, hh = 0.019, m = Math.round(nBelt * 0.14);   // fivela retangular
          line(ID, resample(q => { const p4 = q * 4, sd = Math.min(3, p4 | 0), f = p4 - sd, xs = sd === 0 ? lerp(-w, w, f) : sd === 1 ? w : sd === 2 ? lerp(w, -w, f) : -w, hs2 = sd === 0 ? -hh : sd === 1 ? lerp(-hh, hh, f) : sd === 2 ? hh : lerp(hh, -hh, f); return TPx(ch + hs2, cx + xs, off + 0.012); }, m), 0, { col: MAT.silver, al: 1, size: 0.48 });
          line(ID, resample(q => TPx(ch, cx - w + q * 0.024, off + 0.013), 5), 0, { col: MAT.silver, al: 1, size: 0.42 }); }
        { const x0 = jkOpen(JK.hem) + 0.002; line(ID, [TPx(JK.hem + 0.002, x0 + 0.03, off + 0.009), TPx(JK.hem + JK.belt / 2, x0, off + 0.009), TPx(JK.hem + JK.belt - 0.002, x0 + 0.03, off + 0.009)], 0, edgeC);
          for (const xh of [0.035, 0.05]) for (let i = 0; i < 4; i++) { const P = TPx(JK.hem + JK.belt / 2 + Math.sin(i / 4 * TAU) * 0.003, x0 + xh + Math.cos(i / 4 * TAU) * 0.003, off + 0.01); item(ID, P, P.k, 0, { col: MAT.silver, al: 0.9, size: 0.34 }); } }
        // dragonas nos ombros com botão de pressão; gola levantada; costura das costas
        const nEp = Math.round(n * 0.08);
        for (const sx of SIDES) {
          const at = (t, w) => TP(lerp(1.418, 1.461, t), sx * (lerp(1.5, 1.22, t) + w), off + 0.006), m = Math.round(nEp / 2) - 7;
          line(ID, resample(q => { const p4 = q * 4, sd = Math.min(3, p4 | 0), f = p4 - sd; return sd === 0 ? at(f, -0.13) : sd === 1 ? at(1, lerp(-0.13, 0.13, f)) : sd === 2 ? at(1 - f, 0.13) : at(0, lerp(0.13, -0.13, f)); }, m), 0, edgeC);
          const st = at(0.82, 0); for (let i = 0; i < 7; i++) { const a = i / 6 * TAU, r = i === 6 ? 0 : 0.0036; item(ID, { p: [st.p[0] + Math.cos(a) * r, st.p[1] + 0.003, st.p[2] + Math.sin(a) * r], n: st.n }, st.k, 0, { col: MAT.silver, al: 1, size: 0.4 }); }
        }
        const nCol = Math.round(n * 0.07), colA = frontAng(1.46, 0.07);
        for (const dy of [0.022, 0.0]) line(ID, resample(q => { const P = TP(1.46, lerp(colA, TAU - colA, q), off + 0.02 - dy * 0.3); P.p[1] += dy; return P; }, Math.round(nCol / 2)), 0, edgeC);
        line(ID, resample(q => TP(1.372, lerp(1.95, TAU - 1.95, q), off + 0.002), Math.round(n * 0.035)), 0, { col: MAT.ledge, al: 0.6, size: 0.4 });
        // mangas: costura do ombro, punho com zíper (manga inteira), dobras da manga empurrada (lado dela)
        const nSl = n - (nEdge + nTeeth + 5 + nLap + nPk + nBelt + nEp + nCol + Math.round(n * 0.035));
        for (const s of ['L', 'R']) {
          const part = s === 'L' ? 3 : 4, LP = (seg2, u, a, o2) => { const P = limbPt(s, seg2, u, a, o2); P.k = limbSkin(s, seg2, u); return P; }, m = Math.max(8, Math.round(nSl / 6));
          line(ID, resample(q => LP('upper', 0.05, q * TAU, 0.018), m), part, { col: MAT.ledge, al: 0.7, size: 0.4 });
          const ru = ROLL_U[s];
          if (s === ASYM_S) for (const du of [0.0, 0.035, 0.07]) line(ID, resample(q => LP('fore', ru - du, q * TAU, 0.026 - du * 0.12), m), part, { col: du ? MAT.ledge : MAT.sheen, al: du ? 0.75 : 0.9, size: 0.45 });
          else { line(ID, resample(q => LP('fore', ru - 0.012, q * TAU, 0.017), m), part, edgeC);
            const zc = seg++; for (let i = 0; i < m; i++) { const q = i / (m - 1), u = lerp(ru - 0.015, ru - 0.3, q); item(ID, LP('fore', u, Math.PI + (i % 2 ? 0.05 : -0.05), 0.018), limbSkin(s, 'fore', u), part, { col: MAT.silver, al: 0.95, size: 0.34, chain: i % 2 ? -1 : zc }); }
            const P = LP('fore', ru - 0.3, Math.PI, 0.021); for (let i = 0; i < 3; i++) item(ID, { p: P.p, n: P.n }, P.k, part, { col: MAT.silver, al: 1, size: 0.42, hang: 0.015, pA: i / 2, pB: 13 }); }
        }
      } };

    // ---------- top curto vermelho: bainha acima do umbigo e decote redondo ----------
    const buildTop = n => {   // bralette: faixa sob o busto, decote em V com tiras cruzadas sobre o colo, alças finas
      if (n) { const ID = ITEM_ID.camisa, c = { col: MAT.topE, al: 0.92, size: 0.45 };
        const under = (h, x, front) => !front || Math.abs(x) > jkOpen(h) - 0.004 ? 6 : 0;
        const put = (pts, o) => { const ch = seg++; pts.forEach(P => item(ID, P, P.k, 0, { ...c, ...o, chain: ch, sub: under(P.p[1], P.p[0], P.n[2] > 0.2) })); };
        const nR = Math.round(n * 0.14);
        for (const h of [TOP.hem + 0.002, TOP.band]) put(resample(q => TP(h, q * TAU - Math.PI, 0.006), nR));
        const nV = Math.round(n * 0.08);
        for (const sx of SIDES) {
          put(resample(q => { const h = lerp(TOP.vBot, TOP.sh, q); return TPx(h, sx * Math.max(0.002, topVx(h)), 0.007); }, nV));                      // borda do V
          put(resample(q => { const x = lerp(TOP.sx, 0.13, q), h = lerp(TOP.sh, 1.292, smooth(0, 1, q)); return TPx(h, sx * x, 0.006); }, Math.round(nV * 0.6)));  // borda de cima do bojo
          put(resample(q => { let h, x, back = false; if (q < 0.35) { const f = q / 0.35; h = lerp(TOP.sh, 1.452, f); x = lerp(TOP.sx, 0.1, f); } else if (q < 0.6) { const f = (q - 0.35) / 0.25, a0 = frontAng(1.455, 0.1); const P = TP(1.458, sx * lerp(a0, Math.PI - a0, f), 0.008); return P; } else { const f = (q - 0.6) / 0.4; h = lerp(1.452, 1.257, f); x = lerp(0.1, 0.08, f); back = true; } return TPx(h, sx * x, 0.007, back); }, Math.round(nV * 0.9)), { size: 0.4 });  // alça
        }
        // tiras cruzadas sobre o colo: retas por cima do vale (não afundam no decote)
        const nX = n - 2 * nR - 2 * (nV + Math.round(nV * 0.6) + Math.round(nV * 0.9)), per = Math.max(4, Math.round(nX / 8));
        for (const [hl, hr] of [[1.344, 1.284], [1.284, 1.344], [1.296, 1.248], [1.248, 1.296]]) for (const dh of [0.0034, -0.0034]) {
          const A = TPx(hl + dh, topVx(hl), 0.007), Bp = TPx(hr + dh, -topVx(hr), 0.007);
          put(resample(q => { const p = lerp3(A.p, Bp.p, q), sf = torsoPt(p[1], frontAng(p[1], p[0]), 0.006).p[2]; p[2] = Math.max(p[2], sf); return { p, n: [0, 0, 1], k: torsoSkin(p[1]) }; }, per), { size: 0.42, al: 0.95 });
        }
      } };

    // ---------- shortinho jeans ----------
    const buildShort = n => {
      if (n) { const ID = ITEM_ID.short, offS = 0.008, thr = { col: MAT.thread, al: 0.9, size: 0.34 }, edgeH = { col: lerp3(MAT.denim, MAT.denimL, 0.6), al: 0.9, size: 0.45 };
        const nWb = Math.round(n * 0.2);
        line(ID, resample(q => { const a = q * TAU - Math.PI; return TP(shortTop(a) + 0.001, a, offS); }, Math.round(nWb * 0.32)), 0, edgeH);
        line(ID, resample(q => { const a = q * TAU - Math.PI; return TP(shortTop(a) - SHORT.band, a, offS); }, Math.round(nWb * 0.22)), 0, { ...edgeH, al: 0.6 });
        for (const dh of [0.005, SHORT.band - 0.005]) stitch(ID, resample(q => { const a = q * TAU - Math.PI; return TP(shortTop(a) - dh, a, offS + 0.0005); }, Math.round(nWb * 0.23)), 0, thr);
        // passantes
        const nLp = Math.round(n * 0.08), mL = Math.max(4, Math.round(nLp / 7));
        for (const a of [0.52, -0.52, 1.5, -1.5, 2.45, -2.45, Math.PI]) { const h0 = shortTop(a); line(ID, resample(q => { const p4 = q * 4, sd = Math.min(3, p4 | 0), f = p4 - sd, w = 0.032, hh = sd === 0 ? lerp(h0 + 0.004, h0 - 0.036, f) : sd === 1 ? h0 - 0.036 : sd === 2 ? lerp(h0 - 0.036, h0 + 0.004, f) : h0 + 0.004, da = sd === 0 ? -w : sd === 1 ? lerp(-w, w, f) : sd === 2 ? w : lerp(w, -w, f); return TP(hh, a + da, offS + 0.004); }, mL), 0, edgeH); }
        // botão de metal, braguilha em J, rebites
        const nBt = Math.round(n * 0.07), bc = TPx(shortTop(0) - SHORT.band / 2, 0, offS + 0.004), [b1, b2] = tframe(bc.n);
        ring(ID, bc.p, b1, b2, bc.n, 0.0078, 0.0078, Math.round(nBt * 0.55), bc.k, 0, { col: MAT.copper, al: 1, size: 0.45 });
        for (let i = 0; i < 4; i++) item(ID, { p: [bc.p[0] + (i % 2 - 0.5) * 0.004, bc.p[1] + ((i >> 1) - 0.5) * 0.004, bc.p[2] + 0.001], n: bc.n }, bc.k, 0, { col: MAT.copper, al: 1, size: 0.42 });
        const rivets = [[0.087, 0.905], [-0.087, 0.905], [0.152, 0.866], [-0.152, 0.866]];
        for (const [x, h] of rivets) for (let i = 0, m = Math.max(2, Math.round((nBt - Math.round(nBt * 0.55) - 4) / 4)); i < m; i++) { const P = TPx(h + Math.sin(i / m * TAU) * 0.0025, x + Math.cos(i / m * TAU) * 0.0025, offS + 0.003); item(ID, P, P.k, 0, { col: MAT.copper, al: 1, size: 0.4 }); }
        const nFly = Math.round(n * 0.05);
        stitch(ID, resample(q => { const h = lerp(0.896, 0.812, q), x = 0.016 * (q < 0.75 ? 1 : 1 - (q - 0.75) / 0.25 * 0.9); return TPx(h, x, offS); }, Math.round(nFly * 0.6)), 0, thr);
        line(ID, resample(q => TPx(lerp(0.9, 0.802, q), 0.0005, offS), nFly - Math.round(nFly * 0.6)), 0, { col: MAT.denimD, al: 0.8, size: 0.4 });
        // bolsos da frente (curva com pesponto duplo) e de trás (pentágono com pesponto)
        const nFp = Math.round(n * 0.1), pkF = q => { const pts = [[0.087, 0.906], [0.1, 0.884], [0.124, 0.869], [0.153, 0.864]], f = q * 3, i = Math.min(2, f | 0), u = f - i; return [lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)]; };
        for (const sx of SIDES) { line(ID, resample(q => { const [x, h] = pkF(q); return TPx(h, sx * x, offS); }, Math.round(nFp * 0.2)), 0, edgeH);
          for (const d of [0.004, 0.008]) stitch(ID, resample(q => { const [x, h] = pkF(q); return TPx(h - d * 0.7, sx * (x + d * 0.5), offS + 0.0005); }, Math.round(nFp * 0.15)), 0, thr); }
        const nBp = Math.round(n * 0.14), BPK = [[0.035, 0.906], [0.112, 0.911], [0.106, 0.852], [0.074, 0.833], [0.04, 0.85]];
        const pkB = (q, shrink) => { const f = q * 5, i = Math.min(4, f | 0), u = f - i, a = BPK[i], b = BPK[(i + 1) % 5]; let x = lerp(a[0], b[0], u), h = lerp(a[1], b[1], u); if (shrink) { x = lerp(x, 0.074, shrink); h = lerp(h, 0.876, shrink); } return [x, h]; };
        for (const sx of SIDES) { line(ID, resample(q => { const [x, h] = pkB(q, 0); return TPx(h, sx * x, offS + 0.002, true); }, Math.round(nBp * 0.24)), 0, edgeH);
          stitch(ID, resample(q => { const [x, h] = pkB(q, 0.12); return TPx(h, sx * x, offS + 0.0025, true); }, Math.round(nBp * 0.26)), 0, thr); }
        // pala em V atrás, costura central e laterais
        const nSm = Math.round(n * 0.08);
        stitch(ID, resample(q => { const a = lerp(1.95, TAU - 1.95, q), h = lerp(0.93, 0.902, 1 - Math.abs(q - 0.5) * 2); return TP(h, a, offS + 0.0005); }, Math.round(nSm * 0.4)), 0, thr);
        line(ID, resample(q => TP(lerp(0.902, 0.805, q), Math.PI, offS), Math.round(nSm * 0.2)), 0, { col: MAT.denimD, al: 0.7, size: 0.4 });
        for (const sx of SIDES) line(ID, resample(q => TP(lerp(shortTop(sx * Math.PI / 2) - SHORT.band, 0.856, q), sx * Math.PI / 2, offS), Math.round(nSm * 0.2)), 0, { col: MAT.denimD, al: 0.7, size: 0.4 });
        // bainha desfiada: borda clara + fios soltos pendurados
        const nHem = Math.round(n * 0.24);
        for (const s of ['L', 'R']) { const sg2 = s === 'L' ? 1 : -1, F = LIMBF[s + 'thigh'] || (LIMBF[s + 'thigh'] = limbFrame('hp' + s, 'kn' + s));
          const hemP = (a, off2) => { const nn = [F.fw[0] * Math.cos(a) + F.sx[0] * Math.sin(a), 0, F.fw[2] * Math.cos(a) + F.sx[2] * Math.sin(a)], y = shortHemLeg(s, nn); return legP(s, y, a, off2); };
          const mH = Math.round(nHem / 2), mEd = Math.round(mH * 0.3);
          line(ID, resample(q => hemP(q * TAU - Math.PI, 0.007), mEd), 5, { col: MAT.fray, al: 0.85, size: 0.42 });
          for (let i = 0; i < mH - mEd; i++) { const a = rng() * TAU - Math.PI, P = hemP(a, 0.0065), len = 0.006 + rng() * 0.014; item(ID, P, P.k, 5, { col: lerp3(MAT.fray, MAT.denimL, rng() * 0.5), al: 0.75, size: 0.36, hang: len, pA: rng(), pB: rng() * 20 }); }
        }
        // corte assimétrico: barra traseira alta (sobre o glúteo) e recorte vazado sob o cós, os dois desfiados
        { const angs = []; for (let q = 0; q <= 1; q += 1 / 40) { const a = NETSG * lerp(Math.PI * 0.52, Math.PI * 0.98, q); if (shortRaise(a) > 0.004) angs.push(a); }
          if (angs.length > 2) { const mE = Math.max(6, Math.round(n * 0.04)), mF = Math.round(n * 0.07), a0 = angs[0], a1 = angs[angs.length - 1];
            line(ID, resample(q => { const a = lerp(a0, a1, q); return TP(shortHemT(a), a, 0.0075); }, mE), 0, { col: MAT.fray, al: 0.85, size: 0.42 });
            for (let i = 0; i < mF; i++) { const a = lerp(a0, a1, rng()), P = TP(shortHemT(a), a, 0.007); item(ID, P, P.k, 0, { col: lerp3(MAT.fray, MAT.denimL, rng() * 0.5), al: 0.75, size: 0.36, hang: 0.006 + rng() * 0.012, pA: rng(), pB: rng() * 20 }); } }
          const mC = Math.max(6, Math.round(n * 0.035)), c0 = -NETSG * -2.05 * -1, ca = NETSG * 2.05, cb = NETSG * 2.75;
          for (const h of [0.905, 0.924]) line(ID, resample(q => TP(h, lerp(ca, cb, q), 0.0075), mC), 0, { col: MAT.fray, al: 0.8, size: 0.4 });
          for (let i = 0; i < Math.round(mC * 0.7); i++) { const P = TP(0.924, lerp(ca, cb, rng()), 0.007); item(ID, P, P.k, 0, { col: MAT.fray, al: 0.7, size: 0.34, hang: 0.004 + rng() * 0.006, pA: rng(), pB: rng() * 20 }); }
        }
        // rasgo desfiado na frente: fios brancos atravessados
        for (let k = 0; k < 4; k++) stitch(ID, resample(q => legP('L', 0.832 + k * 0.006, -0.25 + q * 0.5, 0.0085), 3), 5, { col: MAT.fray, al: 0.85, size: 0.34 });
      } };

    // ---------- meias 7/8: listrada (lado de lá) e arrastão rasgada (lado dela) ----------
    const buildSocks = n => {
      if (n) { const ID = ITEM_ID.meias, nS = Math.round(n / 2);
        { const s = STRIPE_S, top = SOCK.top[s], bounds = [top, top - SOCK.cuff]; for (let y = top - SOCK.cuff - SOCK.period; y > BOOT.collar + 0.008; y -= SOCK.period) bounds.push(y);
          const mR = Math.max(6, Math.round(nS * 0.42 / bounds.length));
          bounds.forEach((y, bi) => line(ID, resample(q => legP(s, y, q * TAU - Math.PI, 0.004), mR), 5, { col: bi === 0 ? MAT.net : MAT.white, al: bi === 0 ? 0.9 : 0.8, size: 0.42 }));
          const mRib = Math.round(nS * 0.12); for (let i = 0; i < mRib; i++) { const a = (i % 24) / 24 * TAU - Math.PI, y = top - 0.004 - ((i / 24 | 0) + 0.5) * SOCK.cuff / Math.ceil(mRib / 24); item(ID, legP(s, y, a, 0.0045), legSkin(s, y), 5, { col: MAT.net, al: 0.7, size: 0.34 }); }
          const whites = []; for (let k = 1; k + 1 < bounds.length; k += 2) whites.push([bounds[k + 1], bounds[k]]);
          for (let i = 0, m = nS - bounds.length * mR - mRib; i < m && whites.length; i++) { const [y0, y1] = whites[i % whites.length], y = lerp(y0 + 0.002, y1 - 0.002, rng()); item(ID, legP(s, y, rng() * TAU - Math.PI, 0.0035), legSkin(s, y), 5, { col: MAT.white, al: 0.7, size: 0.5 }); }
        }
        { const s = NET_S, top = SOCK.top[s], nN = n - nS, mT = Math.round(nN * 0.08);
          line(ID, resample(q => legP(s, top, q * TAU - Math.PI, 0.004), mT), 5, { col: MAT.net, al: 0.95, size: 0.42 });
          line(ID, resample(q => { const a = q * TAU - Math.PI; return legP(s, top - SOCK.band + 0.006 * Math.abs(Math.sin(a * 9)), a, 0.004); }, Math.round(nN * 0.12)), 5, { col: MAT.net, al: 0.85, size: 0.4 });
          for (let i = 0, m = Math.round(nN * 0.1); i < m; i++) { const a = rng() * TAU - Math.PI, y = lerp(top - SOCK.band + 0.008, top - 0.003, rng()), lace = 0.5 + 0.5 * Math.sin(a * 18) * Math.sin(y * 300); item(ID, legP(s, y, a, 0.0035), legSkin(s, y), 5, { col: lerp3(MAT.black, MAT.net, 0.4 + 0.6 * lace), al: 0.55, size: 0.42 }); }
          const budget = Math.max(NET.P.length * 2, nN - mT - Math.round(nN * 0.12) - Math.round(nN * 0.1)), tot = NET.P.reduce((a, P) => a + P.len, 0);
          for (const P of NET.P) { const m = Math.max(2, Math.round(budget * P.len / tot)); line(ID, resample(q => { const [a, y] = P.at(q); return legP(s, y, a / NET.R0, 0.0032); }, m), 5, { col: MAT.net, al: 1, size: 0.5 }); }
        }
      } };
