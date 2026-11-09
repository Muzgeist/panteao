    /* ================= súcubo digital: peças novas (cada uma liga/desliga sozinha) ================= */
    const ringPts = (ctr, e1, e2, nrm, r1, r2, m, skw) => resample(q => { const a = q * TAU; return { p: [ctr[0] + (e1[0] * Math.cos(a) * r1 + e2[0] * Math.sin(a) * r2), ctr[1] + (e1[1] * Math.cos(a) * r1 + e2[1] * Math.sin(a) * r2), ctr[2] + (e1[2] * Math.cos(a) * r1 + e2[2] * Math.sin(a) * r2)], n: nrm, k: skw }; }, m);
    const onPlane = (c, e1, e2, nrm, u, v, d, skw) => ({ p: [c[0] + e1[0] * u + e2[0] * v + nrm[0] * d, c[1] + e1[1] * u + e2[1] * v + nrm[1] * d, c[2] + e1[2] * u + e2[2] * v + nrm[2] * d], n: nrm, k: skw });
    // umbigo (corpo, sempre presente): sombra oval funda + reflexo da borda de cima — é onde o piercing encaixa
    const buildCorpo = () => { const n = cnt('corpo'); if (!n) return; const ID = ITEM_ID.corpo, c = TPx(NAVEL.h, 0, 0.0015), [e1, e2] = tframe(c.n);
      for (let i = 0; i < Math.max(4, n - 6); i++) { const a = i / Math.max(4, n - 6) * TAU, rr = i % 2 ? 0.0018 : 0.0034; item(ID, onPlane(c.p, e1, e2, c.n, Math.cos(a) * rr * 0.75, Math.sin(a) * rr * 1.25 - 0.0008, 0, c.k), c.k, 0, { col: MAT.black, al: 0.85, size: 0.55, shape: INK }); }
      for (let i = 0; i < 6; i++) { const a = Math.PI * (0.15 + 0.7 * i / 5); item(ID, onPlane(c.p, e1, e2, c.n, Math.cos(a) * 0.0042, Math.sin(a) * 0.0055, 0.0005, c.k), c.k, 0, { col: [0.95, 0.42, 0.85], al: 0.55, size: 0.4 }); } };
    // piercing de umbigo: bolinha dourada em cima, barra fina, pedra pendurada embaixo (brilha)
    const buildPiercing = n => { if (!n) return; const ID = ITEM_ID.piercing, c = TPx(NAVEL.h, 0, 0.004), [e1, e2] = tframe(c.n), K = c.k;
      const mB = Math.max(5, Math.round(n * 0.22)), mBar = Math.max(4, Math.round(n * 0.18)), mG = Math.max(8, n - mB - mBar - 8);
      for (let i = 0; i < mB; i++) { const a = i / mB * TAU; item(ID, onPlane(c.p, e1, e2, c.n, Math.cos(a) * 0.0022, 0.0105 + Math.sin(a) * 0.0022, 0.001, K), K, 0, { col: MAT.gold, al: 1, size: 0.45, spark: i === 0 }); }
      line(ID, resample(q => onPlane(c.p, e1, e2, c.n, 0, lerp(0.008, -0.009, q), 0.001 + 0.0015 * Math.sin(q * Math.PI), K), mBar), 0, { col: MAT.gold, al: 0.95, size: 0.36 });
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; item(ID, onPlane(c.p, e1, e2, c.n, Math.cos(a) * 0.0032, -0.0125 + Math.sin(a) * 0.0032, 0.0015, K), K, 0, { col: MAT.gold, al: 1, size: 0.4, hang: 0.003, pA: 0.5, pB: 3 }); }   // garra da pedra
      for (let i = 0; i < mG; i++) { const a = rng() * TAU, rr = Math.sqrt(rng()) * 0.0026; item(ID, onPlane(c.p, e1, e2, c.n, Math.cos(a) * rr, -0.0125 + Math.sin(a) * rr, 0.0025, K), K, 0, { col: i % 3 ? MAT.gem : [1.3, 0.6, 1.1], al: 0.95, size: 0.5, spark: i < 3, hang: 0.003, pA: 0.5, pB: 3 }); } };
    // choker: faixa preta fina, anel em coração no centro, pingente que muda com o modo de cor, correntes em arco
    const neckAt = neckAtG;
    const frontZ = frontZG;
    const buildChoker = n => { if (!n) return; const ID = ITEM_ID.choker, Y = 1.468, HW2 = 0.0062;
      const mE = Math.round(n * 0.13), mF = Math.round(n * 0.2), mH = Math.round(n * 0.14), mP = Math.round(n * 0.1), mC = n - 2 * mE - mF - mH - mP - 12;
      for (const dy of [HW2, -HW2]) line(ID, resample(q => neckAt(Y + dy, q * TAU - Math.PI, 0.0045), mE), 1, { col: MAT.strap, al: 0.9, size: 0.42 });
      for (let i = 0; i < mF; i++) { const P = neckAt(Y + (rng() - 0.5) * HW2 * 1.6, rng() * TAU - Math.PI, 0.004); item(ID, P, P.k, 1, { col: MAT.black, al: 0.8, size: 0.7, shape: INK }); }   // couro preto de verdade
      for (const sx of SIDES) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, P = neckAt(Y + Math.sin(a) * 0.0025, sx * 1.25 + Math.cos(a) * 0.06, 0.0065); item(ID, P, P.k, 1, { col: MAT.steel, al: 1, size: 0.4 }); }   // rebites
      const hc = [0, Y - 0.011, frontZ(0, Y - 0.011, 0.007)], K = [J.neck, J.chest, 0.4], HS = 0.0115;
      line(ID, resample(q => { const [hx, hy] = heartXY(q); return { p: [hc[0] + hx * HS, hc[1] + hy * HS, hc[2]], n: [0, 0, 1], k: K }; }, mH), 1, { col: MAT.steel, al: 1, size: 0.5, spark: true });
      const pc = [0, hc[1] - HS * 0.95 - 0.006, frontZ(0, hc[1] - HS * 0.95 - 0.006, 0.008)];
      for (let i = 0; i < mP; i++) { let hx, hy; do { hx = rng() * 2 - 1; hy = rng() * 2 - 1; } while (!inHeart(hx, hy)); item(ID, { p: [pc[0] + hx * 0.005, pc[1] + hy * 0.005, pc[2]], n: [0, 0, 1] }, K, 1, { col: MAT.gem, al: 1, size: 0.5, sub: 23, spark: i < 2, hang: 0.003, pA: 0.4, pB: 5 }); }
      // correntes finas em dois arcos, por baixo do coração (não brigam com as conchas do fone)
      for (const [aS, dep, frac] of [[0.78, 0.035, 0.55], [0.98, 0.056, 0.45]]) { const x0 = Math.sin(aS) * 0.0415, m = Math.max(8, Math.round(mC * frac)), ch = seg++;
        for (let i = 0; i < m; i++) { const q = i / (m - 1), x = lerp(x0, -x0, q), y = Y - 0.003 - dep * (1 - (2 * q - 1) ** 2); item(ID, { p: [x, y, frontZ(x, y, 0.0045)], n: [0, 0, 1] }, [J.neck, J.chest, y < 1.445 ? 0.75 : 0.4], 1, { col: i % 3 === 0 ? MAT.steel : lerp3(MAT.steel, MAT.strap, 0.4), al: 0.95, size: 0.36, chain: ch, hang: 0.002, pA: Math.sin(q * Math.PI), pB: 7 + aS }); } } };
    // liga: do cós do shortinho ao topo da meia rasgada, uma tira na frente e outra atrás, com regulador e presilha
    const buildLiga = n => { if (!n) return; const ID = ITEM_ID.liga, s = NET_S, sg2 = NETSG, F2 = LIMBF[s + 'thigh'] || (LIMBF[s + 'thigh'] = limbFrame('hp' + s, 'kn' + s));
      const strap = (A, aLeg, m) => {
        const y0 = shortTop(A) - 0.004, y1 = SOCK.top[s] + 0.003, T0 = TP(y0, A, 0.012), angT0 = Math.atan2(T0.p[0] - F2.A[0], T0.p[2] - F2.A[2]);
        const at = q => { const y = lerp(y0, y1, q), aL = lerp(angT0, aLeg, smooth(0, 0.6, q)), over = y > 0.84 ? 0.014 : 0.006, L2 = legAt(s, Math.min(y, 0.9), aL, over);
          const w = smooth(0.86, 0.915, y), P = w > 0 ? TP(y, A, over) : null; const p = P ? lerp3(L2.p, P.p, w) : L2.p, nn = P ? norm3(lerp3(L2.n, P.n, w)) : L2.n;
          return { p, n: nn, k: y > 0.9 ? torsoSkin(y) : legSkin(s, y) }; };
        const mE = Math.round(m * 0.28), mI = Math.round(m * 0.24), sideOf = q => { const a = at(Math.max(0, q - 0.02)).p, b = at(Math.min(1, q + 0.02)).p, P = at(q), t2 = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]); return [P, norm3(cross3(t2, P.n))]; };
        for (const d of [0.0055, -0.0055]) line(ID, resample(q => { const [P, sd2] = sideOf(q); return { p: [P.p[0] + sd2[0] * d, P.p[1] + sd2[1] * d, P.p[2] + sd2[2] * d], n: P.n, k: P.k }; }, mE), 5, { col: MAT.strap, al: 0.95, size: 0.4 });
        for (let i = 0; i < mI; i++) { const q = rng(), [P, sd2] = sideOf(q), d = (rng() - 0.5) * 0.008; item(ID, { p: [P.p[0] + sd2[0] * d, P.p[1] + sd2[1] * d, P.p[2] + sd2[2] * d], n: P.n }, P.k, 5, { col: MAT.black, al: 0.85, size: 0.7, shape: INK }); }   // elástico preto
        const hw3 = (q, w, h, dd) => { const [P, sd2] = sideOf(q), up = norm3(cross3(P.n, sd2)); return resample(f => { const p4 = f * 4, sd3 = Math.min(3, p4 | 0), g = p4 - sd3, xs = sd3 === 0 ? lerp(-w, w, g) : sd3 === 1 ? w : sd3 === 2 ? lerp(w, -w, g) : -w, ys = sd3 === 0 ? -h : sd3 === 1 ? lerp(-h, h, g) : sd3 === 2 ? h : lerp(h, -h, g);
          return { p: [P.p[0] + sd2[0] * xs + up[0] * ys + P.n[0] * dd, P.p[1] + sd2[1] * xs + up[1] * ys + P.n[1] * dd, P.p[2] + sd2[2] * xs + up[2] * ys + P.n[2] * dd], n: P.n, k: P.k }; }, Math.max(8, Math.round(m * 0.1))); };
        line(ID, hw3(0.3, 0.0085, 0.0045, 0.002), 5, { col: MAT.steel, al: 1, size: 0.42 });   // regulador
        line(ID, hw3(0.985, 0.0075, 0.009, 0.0025), 5, { col: MAT.steel, al: 1, size: 0.42, spark: true });   // presilha na meia
        line(ID, hw3(0.0, 0.006, 0.004, 0.002), 5, { col: MAT.steel, al: 1, size: 0.4 });   // gancho no cós
      };
      const m = Math.round(n / 2); strap(sg2 * 0.95, sg2 * 0.55, m); strap(sg2 * 2.35, sg2 * 2.45, n - m); };
    // corrente fina na lombar: dois fios dourados caídos, coração central com pingentes descendo, dois corações menores
    const buildCorrente = n => { if (!n) return; const ID = ITEM_ID.corrente, hAt = a => lerp(0.983, 1.008, Math.pow(Math.abs(Math.abs(a) - Math.PI) / (Math.PI - 1.9), 1.6));
      const mS = Math.round(n * 0.25), mH = Math.round(n * 0.2), mh = Math.round(n * 0.1), mD = n - 2 * mS - mH - 2 * mh;
      for (const [drop, frac] of [[0, 1], [0.007, 1]]) { const ch = seg++; resample(q => { const a = lerp(1.9, TAU - 1.9, q); return TP(hAt(a) - drop * Math.sin(q * Math.PI), a, 0.0045); }, Math.round(mS * frac)).forEach((P, i) => item(ID, P, P.k, 0, { col: i % 3 === 0 ? MAT.gold : lerp3(MAT.gold, MAT.chain, 0.5), al: 0.95, size: 0.38, chain: ch, spark: i % 9 === 0 })); }
      const heart = (a, size, m) => { const c = TP(hAt(a) - 0.004, a, 0.006), [e1, e2] = tframe(c.n);
        line(ID, resample(q => { const [hx, hy] = heartXY(q); return onPlane(c.p, e1, e2, c.n, -hx * size, hy * size, 0, c.k); }, m), 0, { col: MAT.gem, al: 1, size: 0.45, spark: true });
        return c; };
      const cc = heart(Math.PI, 0.013, mH); heart(2.55, 0.0085, mh); heart(-2.55, 0.0085, mh);
      for (let k = 0; k < 2; k++) { const ch = seg++, m = Math.max(4, Math.round(mD / 2)); for (let i = 0; i < m; i++) { const q = i / (m - 1); const P = TP(cc.p[1] - 0.012 - 0.026 * q, Math.PI + (k ? 0.035 : -0.035) * (1 - q * 0.5), 0.005 + 0.004 * q); item(ID, P, P.k, 0, { col: MAT.gold, al: 0.95, size: 0.36, chain: ch, spark: i === m - 1, hang: 0.004, pA: q, pB: 9 + k }); } } };
    // chifres pequenos, curvos para trás, saindo do meio dos cachos
    const hornPath = hornPathG;
    const buildChifres = n => { if (!n) return; const ID = ITEM_ID.chifres, K = [J.head, -1, 0];
      for (const sx of SIDES) { const m = Math.round(n / 2), rings = Math.max(6, Math.round(Math.sqrt(m * 1.6))), per = Math.max(4, Math.round(m / rings));
        for (let r2 = 0; r2 < rings; r2++) { const u = (r2 + 0.5) / rings, P = hornPath(sx, u), Pn = hornPath(sx, Math.min(1, u + 0.02)), Pp = hornPath(sx, Math.max(0, u - 0.02)), t2 = norm3([Pn[0] - Pp[0], Pn[1] - Pp[1], Pn[2] - Pp[2]]);
          const e1 = norm3(cross3(t2, [0, 0, 1])), e2 = cross3(t2, e1), rad = 0.0115 * Math.pow(1 - u, 0.8) + 0.0008, ridge = r2 % 2 === 0;
          for (let k = 0; k < per; k++) { const a = (k + (r2 % 2) * 0.5) / per * TAU, nn = [e1[0] * Math.cos(a) + e2[0] * Math.sin(a), e1[1] * Math.cos(a) + e2[1] * Math.sin(a), e1[2] * Math.cos(a) + e2[2] * Math.sin(a)];
            item(ID, { p: [P[0] + nn[0] * rad, P[1] + nn[1] * rad, P[2] + nn[2] * rad], n: nn }, K, 2, { col: lerp3(MAT.hornA, MAT.hornB, Math.pow(u, 0.8)), al: ridge ? 0.95 : 0.8, size: 0.5, sub: 24, q1: u, dist: 0.6 }); } } } };
    // cauda longa e fina com ponta em coração (estilo T3/T4): curva atrás das pernas e enrola para o lado dela
    const buildCauda = n => { if (!n) return; const ID = ITEM_ID.cauda, rp = restOf('root'), K = [J.root, -1, 0];
      const mT = Math.round(n * 0.56), mS = Math.round(n * 0.1), mHf = Math.round(n * 0.16), mHo = Math.round(n * 0.07), mHi = Math.round(n * 0.04), mHk = n - mT - mS - mHf - mHo - mHi;
      const rest = s => { const P = tailRest(s); return { p: [rp[0] + P[0], rp[1] + P[1], rp[2] + P[2]], n: [0, 0, -1] }; };
      for (let i = 0; i < mT; i++) { const s = Math.pow(i / mT, 0.95), a = (i * 2.399) % TAU; item(ID, rest(s), K, 5, { col: MAT.tailA, al: 0.85, size: 0.5, sub: 20, q1: s, q2: a, q3: 0, dist: 0.7 + 0.3 * s }); }
      for (let i = 0; i < mS; i++) { const s = lerp(0.8, 0.975, (i % 12) / 11), a = ((i / 12 | 0) % 2 ? 0.45 : -0.45) + (rng() - 0.5) * 0.3; item(ID, rest(s), K, 5, { col: MAT.scale, al: 0.9, size: 0.42, sub: 20, q1: s, q2: a, q3: 4, dist: 1 }); }   // escamas
      for (let i = 0; i < mHf; i++) { let hx, hy; do { hx = rng() * 2 - 1; hy = rng() * 2 - 1; } while (!inHeart(hx, hy)); item(ID, rest(1), K, 5, { col: MAT.tailB, al: 0.8, size: 0.6, sub: 20, q1: 1, q3: 1, pA: hx, pB: hy, dist: 1 }); }
      const ch = seg++; resample(q => q, mHo).forEach(q => { const [hx, hy] = heartXY(q); item(ID, rest(1), K, 5, { col: MAT.heartHi, al: 1, size: 0.5, sub: 20, q1: 1, q3: 2, pA: hx, pB: hy, chain: ch, dist: 1 }); });
      const ch2 = seg++; resample(q => q, mHi).forEach(q => { const [hx, hy] = heartXY(q); item(ID, rest(1), K, 5, { col: [1.55, 0.95, 1.3], al: 0.9, size: 0.42, sub: 20, q1: 1, q3: 3, pA: hx * 0.52, pB: hy * 0.52 + 0.08, chain: ch2, dist: 1 }); });
      resample(q => q, Math.max(8, mHk)).forEach(q => { const [hx, hy] = heartXY(q); item(ID, rest(1), K, 5, { col: MAT.black, al: 0.9, size: 0.7, sub: 20, q1: 1, q3: 5, pA: hx * 1.13, pB: hy * 1.1 - 0.02, shape: INK, dist: 1 }); }); };
    // asas de morcego: armação escura + membrana magenta translúcida; só se formam em momentos certos
    const buildAsas = n => { if (!n) return; const ID = ITEM_ID.asas, K = [J.chest, -1, 0];
      for (const sx of SIDES) { const m = Math.round(n / 2), mM = Math.round(m * 0.58), mB = Math.round(m * 0.3), mSc = m - mM - mB, rest = (k, a, b) => { const P = wingRest(sx, k, a, b); return { p: P, n: [0, 0, -1] }; };
        for (let i = 0; i < mM; i++) { const k = (rng() * 5) | 0, a = Math.sqrt(rng()), b = rng(); item(ID, rest(k, a, b), K, 0, { col: MAT.wingM, al: 0.5, size: 0.85, sub: 21, q1: sx, q2: 0, q3: k + 0.001, q4: a, pA: b, dist: 0.8 + 0.2 * a }); }
        const perBone = Math.max(4, Math.round(mB * 0.62 / 6)), perEdge = Math.max(4, Math.round(mB * 0.38 / 4));
        for (let bone = 0; bone < 6; bone++) { const chB = seg++; for (let j = 0; j < perBone; j++) item(ID, rest(0, 0, 0), K, 0, { col: MAT.wingBone, al: 1, size: 0.55, sub: 21, q1: sx, q2: 1, q3: bone, q4: j / (perBone - 1), chain: chB, dist: 0.85 }); }   // armação: carmesim escuro, legível contra o fundo
        for (let k = 1; k < 4; k++) { const chE = seg++; for (let j = 0; j < perEdge; j++) item(ID, rest(k, 1, j / (perEdge - 1)), K, 0, { col: MAT.wingEdge, al: 0.95, size: 0.45, sub: 21, q1: sx, q2: 0, q3: k + 0.001, q4: 1, pA: j / (perEdge - 1), chain: chE, dist: 0.9 }); }   // borda de fuga recortada entre os dedos
        { const chE = seg++; for (let j = 0; j < perEdge; j++) item(ID, rest(4, 1, j / (perEdge - 1)), K, 0, { col: MAT.wingEdge, al: 0.95, size: 0.45, sub: 21, q1: sx, q2: 0, q3: 4.001, q4: 1, pA: j / (perEdge - 1), chain: chE, dist: 0.9 }); }
        for (let i = 0; i < mSc; i++) { const t2 = (i + 0.5) / mSc; item(ID, rest(0, 0, 0), K, 0, { col: i % 2 ? MAT.scale : MAT.wingF, al: 0.95, size: 0.45, sub: 21, q1: sx, q2: 2, q4: t2, dist: 0.85 }); }   // escamas na borda de ataque
      } };
    // unhas: amendoadas, pontudas e escuras (tinta), brilho de glitch na borda; escamas finas subindo do leito para o dedo
    const buildUnhas = n => { if (!n) return; const ID = ITEM_ID.unhas;
      const per = Math.max(6, Math.round(n / 10)), mOut = Math.max(4, Math.round(per * 0.35)), mIn = Math.max(2, Math.round(per * 0.35)), mSc = Math.max(1, per - mOut - mIn);
      for (const s of ['L', 'R']) { const sg1 = s === 'L' ? 1 : -1, part = s === 'L' ? 3 : 4;
        const tips = []; for (let k = 0; k < 4; k++) { const fb = restOf(`f${k}b${s}`), tip = [fb[0], fb[1] - FINGER_LEN[k] * 0.48, fb[2]]; tips.push([tip, [0, -1, 0], J[`f${k}b${s}`], 0.0075]); }
        { const tb = restOf('tb' + s), tt = [tb[0] - 0.0026 * sg1, tb[1] - 0.036, tb[2] + 0.015]; tips.push([tt, norm3([tt[0] - tb[0], tt[1] - tb[1], tt[2] - tb[2]]), J['tb' + s], 0.0072]); }
        for (const [tip, dir, jn, rf] of tips) {
          let dor = [sg1, 0, 0]; const dd = dor[0] * dir[0] + dor[1] * dir[1] + dor[2] * dir[2]; dor = norm3([dor[0] - dir[0] * dd, dor[1] - dir[1] * dd, dor[2] - dir[2] * dd]);
          const acr = norm3(cross3(dir, dor)), K = [jn, -1, 0];
          const at = (a, b, d) => ({ p: [tip[0] + dir[0] * a + acr[0] * b + dor[0] * (rf + d), tip[1] + dir[1] * a + acr[1] * b + dor[1] * (rf + d), tip[2] + dir[2] * a + acr[2] * b + dor[2] * (rf + d)], n: dor, k: K });
          const halfW = a => 0.0044 * Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (a + 0.002) / 0.0145), 1.6)), 0.75) * smooth(-0.0125, -0.008, a);   // amêndoa com ponta fina
          line(ID, resample(q => { const a = q < 0.5 ? lerp(-0.012, 0.0125, q * 2) : lerp(0.0125, -0.012, (q - 0.5) * 2), b = (q < 0.5 ? 1 : -1) * halfW(a); return at(a, b, 0.0012 - 0.004 * smooth(0, 0.0125, a)); }, mOut), part, { col: MAT.nailHi, al: 1, size: 0.44 });
          for (let i = 0; i < mIn; i++) { const a = lerp(-0.01, 0.009, rng()), b = (rng() * 2 - 1) * halfW(a) * 0.7; item(ID, at(a, b, 0.0012 - 0.004 * smooth(0, 0.0125, a)), K, part, { col: MAT.nail, al: 0.9, size: 0.55 }); }   // laca vinho escura com reflexo
          for (let i = 0; i < mSc; i++) { const row = i % 3, a = -0.0145 - row * 0.0032, b = ((i / 3 | 0) % 2 ? 0.0022 : -0.0022) + (row % 2 ? 0.0011 : 0); item(ID, at(a, b, 0.0004), K, part, { col: MAT.scale, al: 0.85, size: 0.32 }); }
        } } };
    // tatuagem no baixo-ventre: coração tribal com asas de lâmina (rosa → magenta → quase preto nas pontas) com borda preta;
    // e as veias de glitch que saem dela, contornam a cintura e sobem pela coluna até sumir na nuca
    const buildTatuagem = n => { if (!n) return; const ID = ITEM_ID.tatuagem, hs = TAT.heart, h0 = TAT.h, nV = Math.round(n * 0.14), nT = n - nV;
      const PT = (x, h, off = 0.0016) => TPx(h, x, off);
      // tinta preta de verdade sobre a pele neon + reflexo rosado (os brilhos brancos da referência)
      const nOut = Math.round(nT * 0.36), nInk = Math.round(nT * 0.29), nHi = Math.round(nT * 0.1), nHeart = Math.round(nT * 0.13), nArc = Math.round(nT * 0.05), nMk = nT - nOut - nInk - nHi - nHeart - nArc;
      const curve = (P, sx) => { const C = P.map(([u, v]) => { const [x, h] = tatXY(sx, u, v); return [x, h, 0]; }); return s2 => crPath(C, s2, [0, 0, 0]); };
      const wAt = (st, s2) => st.w * (st.a > 0 ? smooth(0, st.a, s2) : 1) * Math.pow(1 - s2, 0.75);
      const lens = TAT.strokes.map(st => { const f = curve(st.P, 1); let l = 0, p0 = f(0); for (let k = 1; k <= 20; k++) { const p1 = f(k / 20); l += Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); p0 = p1; } return l; }), area = lens.map((l, k) => l * TAT.strokes[k].w), lsum = lens.reduce((a, b) => a + b, 0), lsumO = lens.reduce((a, b, k) => a + b * (k < 5 ? 2 : 0.6), 0), asum = area.reduce((a, b) => a + b, 0);
      for (const sx of SIDES) TAT.strokes.forEach((st, k) => { const f = curve(st.P, sx), mO = Math.max(6, Math.round(nOut / 2 * lens[k] * (k < 5 ? 2 : 0.6) / lsumO)), mI = Math.max(4, Math.round(nInk / 2 * area[k] / asum)), mH = Math.max(3, Math.round(nHi / 2 * lens[k] / lsum));
        const nrm = s2 => { const a = f(Math.max(0, s2 - 0.01)), b = f(Math.min(1, s2 + 0.01)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
        const at = (s2, t2, off) => { const w = wAt(st, s2), c = f(s2), nn = nrm(s2); return PT(c[0] + nn[0] * w * t2 * 0.5, c[1] + nn[1] * w * t2 * 0.5, off); };
        // contorno fechado da lâmina (as duas bordas se encontram nas pontas): é ele que dá a forma tribal cheia; espinho é traço único
        if (k < 5) line(ID, resample(q => q < 0.5 ? at(Math.pow(q * 2, 0.9), 1, 0.0018) : at(Math.pow(2 - q * 2, 0.9), -1, 0.0018), mO), 0, { col: MAT.tatEdge, al: 0.95, size: 0.4 });
        else line(ID, resample(q => at(q, 0, 0.0018), Math.max(4, Math.round(mO * 0.6))), 0, { col: MAT.tatEdge, al: 0.95, size: 0.42 });
        // miolo: vinho escuro (lê como massa) com tinta preta no centro
        for (let i = 0; i < mI; i++) { const s2 = Math.pow(rng(), 0.85), t2 = (rng() * 2 - 1) * 0.8, ink = Math.abs(t2) < 0.4 && i % 2 === 0, P = at(s2, t2, 0.0016);
          item(ID, P, P.k, 0, ink ? { col: MAT.black, al: 0.95, size: 0.55 + 50 * wAt(st, s2), shape: INK } : { col: lerp3(MAT.tatFill, MAT.tatTip, s2 * 0.6), al: 0.75, size: 0.48 }); }
        // reflexo cromado ao longo da lâmina
        const ch = seg++; resample(q => 0.08 + q * 0.75, mH).forEach(s2 => { const P = at(s2, 0.3, 0.0019); item(ID, P, P.k, 0, { col: lerp3([1.6, 0.85, 1.3], MAT.tatHeart, s2), al: 0.9, size: 0.34, chain: ch }); }); });
      // parênteses em volta do coração
      for (const sx of SIDES) { const f = curve(TAT.arc, sx), ch = seg++; resample(q => q, Math.round(nArc / 2)).forEach(q => { const c = f(q), P = PT(c[0], c[1]); item(ID, P, P.k, 0, { col: MAT.tatWing, al: 0.9, size: 0.38, chain: ch }); }); }
      // coração: cheio de tinta, contorno magenta e um brilho no lóbulo
      { const mO = Math.round(nHeart * 0.4), mF = nHeart - mO - 4;
        line(ID, resample(q => { const [hx, hy] = heartXY(q); return PT(hx * hs * 1.05, h0 + hy * hs * 1.05); }, mO), 0, { col: MAT.tatHeart, al: 1, size: 0.4 });
        for (let i = 0; i < mF; i++) { let hx, hy; do { hx = rng() * 2 - 1; hy = rng() * 2 - 1; } while (!inHeart(hx, hy)); const P = PT(hx * hs * 0.88, h0 + hy * hs * 0.88); item(ID, P, P.k, 0, i % 3 ? { col: lerp3(MAT.tatHeart, MAT.tatFill, smooth(0.6, -0.4, hy)), al: 0.85, size: 0.5 } : { col: MAT.black, al: 0.9, size: 0.6, shape: INK }); }   // coração cheio: rosa no alto, vinho embaixo
        for (let i = 0; i < 4; i++) { const P = PT(-0.35 * hs + i * 0.0012, h0 + 0.45 * hs - i * 0.0006, 0.0019); item(ID, P, P.k, 0, { col: [1.5, 0.8, 1.2], al: 0.9, size: 0.34 }); } }
      // losangos descendo, estrela e lua nas pontas de cima (assimétricas, como na referência)
      { const per = Math.max(3, Math.round(nMk * 0.5 / TAT.dots.length));
        TAT.dots.forEach((v, k) => { const [x, h] = tatXY(1, 0, v), r = 0.0026 * (1 - k * 0.17); for (let i = 0; i < per; i++) { const a = i / per * TAU, rr = r * (i % 2 ? 0.5 : 1); const P = PT(x + Math.cos(a) * rr * 0.7, h + Math.sin(a) * rr); item(ID, P, P.k, 0, { col: MAT.black, al: 0.95, size: 0.5, shape: INK }); } const P = PT(x, h, 0.0019); item(ID, P, P.k, 0, { col: MAT.tatHeart, al: 0.8, size: 0.32 }); });
        const mS = Math.max(6, Math.round(nMk * 0.25)), [sxS, syS] = tatXY(ASYM, TAT.tipMark[0], TAT.tipMark[1]), [sxM, syM] = tatXY(-ASYM, TAT.tipMark[0], TAT.tipMark[1]);
        for (const [dx, dy] of [[1, 0], [0, 1]]) line(ID, resample(q => PT(sxS + dx * (q - 0.5) * 0.009, syS + dy * (q - 0.5) * 0.011), Math.round(mS / 2)), 0, { col: MAT.tatHeart, al: 0.95, size: 0.34 });   // estrela de 4 pontas
        line(ID, resample(q => { const a = lerp(0.6, TAU - 0.6, q); return PT(sxM + Math.cos(a) * 0.0042, syM + Math.sin(a) * 0.0042); }, Math.max(6, nMk - per * TAT.dots.length - TAT.dots.length - mS)), 0, { col: MAT.tatHeart, al: 0.95, size: 0.34 }); }   // lua
      // veias de glitch (pulsam com a carga emocional dela)
      for (const sx of SIDES) { const m = Math.round(nV / 2), mMain = Math.round(m * 0.78), ch = seg++;
        for (let i = 0; i < mMain; i++) { const q = mMain > 1 ? i / (mMain - 1) : 0.5, [h, a] = veinPath(sx, q), wob = 0.006 * Math.sin(q * 61 + sx) + 0.003 * Math.sin(q * 140), P = TP(h, a + wob / Math.max(0.05, torsoAt(h)[0]), 0.0018);
          item(ID, P, P.k, 0, { col: MAT.vein, al: 0.85, size: 0.4, chain: ch, sub: 22, q1: q }); }
        for (let i = 0; i < m - mMain; i++) { const q = 0.08 + 0.84 * rng(), [h, a] = veinPath(sx, q), br = (rng() - 0.5) * 0.03, P = TP(h + Math.abs(br) * 0.6, a + br / Math.max(0.05, torsoAt(h)[0]), 0.0018);   // ramificações curtas
          item(ID, P, P.k, 0, { col: MAT.vein, al: 0.6, size: 0.34, sub: 22, q1: q }); }
      } };
