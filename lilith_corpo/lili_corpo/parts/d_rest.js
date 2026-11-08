    // compatível com o formato antigo (bloquinho e costura): cor por subtipo
    const OLDC = { 2: [[0.95, 0.88, 1.05, 0.9], [0.3, 0.24, 0.42, 0.45], [0.75, 0.78, 0.95, 0.8], [0.8, 0.74, 0.85, 0.8], [PAL.mane[0] * 1.1, PAL.mane[1] * 1.2, PAL.mane[2] * 1.2, 0.8]], 3: [[0.75, 0.95, 1.15, 0.78], [0.75, 0.95, 1.15, 0.6]] };
    const itemOld = (id, sub, p, nrm, j1, j2, w2, part, dist, ex = {}) => { const c = OLDC[id][sub]; return item(id, { p, n: nrm }, [j1, j2 ?? -1, w2 || 0], part, { dist, chain: ex.chain, seg: ex.seg, size: ex.size ?? 0.7, col: [c[0], c[1], c[2]], al: c[3], pA: ex.pA, sub }); };
    // bloquinho gasto na mão esquerda (situacional)
    const buildBloco = () => { const n = cnt('bloco');
      if (n) { const wr = restOf('wr' + OTHER_S), sgN = seg++, sg1 = OTHER_S === 'L' ? 1 : -1, HW = 0.044, HH = 0.058, TH = 0.007;
        const c = [wr[0] - sg1 * (0.0135 * HAND_S + 0.011), wr[1] - 0.064, wr[2] + 0.005];
        const P = (a, b, f) => [c[0] - sg1 * f, c[1] + b, c[2] + a], cut = (a, b) => (a - (HW - 0.014)) - (b + HH) > 0;
        const jn = J['wr' + OTHER_S], nrmF = [-sg1, 0, 0];
        const nO = Math.round(n * 0.36), nF = Math.round(n * 0.16), nSp = Math.round(n * 0.14), nP = Math.round(n * 0.16), nS = n - nO - nF - nSp - nP;
        const ch1 = seg++;
        for (let i = 0; i < nO; i++) { const q = i / nO * 4, side = Math.min(3, q | 0), f = q - side; let a, b;
          if (side === 0) { a = lerp(-HW, HW, f); b = HH; } else if (side === 1) { a = HW; b = lerp(HH, -HH, f); } else if (side === 2) { a = lerp(HW, -HW, f); b = -HH; } else { a = -HW; b = lerp(-HH, HH, f); }
          if (cut(a, b)) { const d = (a - (HW - 0.014)) - (b + HH); a -= d * 0.5; b += d * 0.5; }   // canto dobrado
          itemOld(2, 0, P(a, b, TH), nrmF, jn, -1, 0, 3, 0.93, { chain: ch1, seg: sgN, size: 0.7 }); }
        for (let i = 0; i < nF; i++) { let a, b; do { a = (rng() * 2 - 1) * HW * 0.92; b = (rng() * 2 - 1) * HH * 0.92; } while (cut(a, b) || Math.sin(a * 140) * Math.sin(b * 110) > 0.55);
          itemOld(2, 1, P(a, b, TH), nrmF, jn, -1, 0, 3, 0.93, { seg: sgN, size: 0.5 }); }
        for (let i = 0; i < nSp; i++) { const ri = i % 9, a = -HW + (ri + 0.5) / 9 * 2 * HW, ang = (i / 9 | 0) / Math.max(1, Math.ceil(nSp / 9) - 1) * TAU; itemOld(2, 2, P(a, HH + Math.sin(ang) * 0.0045, Math.cos(ang) * 0.0045), [0, 1, 0], jn, -1, 0, 3, 0.93, { seg: sgN, size: 0.45 }); }
        for (let i = 0; i < nP; i++) { const q = rng(), f = lerp(-TH * 0.8, TH * 0.8, ((i % 5) + 0.5) / 5); const a = q < 0.6 ? -HW : lerp(-HW, HW - 0.016, (q - 0.6) / 0.4), b = q < 0.6 ? lerp(-HH, HH, q / 0.6) : -HH; itemOld(2, 3, P(a, b, f), [0, 0, -1], jn, -1, 0, 3, 0.93, { seg: sgN, size: 0.42 }); }
        const ch3 = [seg++, seg++, seg++];
        for (let i = 0; i < nS; i++) { const q = i / nS, line2 = Math.min(2, Math.floor(q * 3)), f = fract(q * 3); const a = lerp(-HW * 0.6, HW * (0.25 + 0.3 * (line2 % 2)), f), b = 0.012 - line2 * 0.011 + 0.002 * Math.sin(f * 30 + line2); itemOld(2, 4, P(a, b, TH + 0.0008), nrmF, jn, -1, 0, 3, 0.93, { chain: ch3[line2], seg: sgN, size: 0.42 }); }
      } };
    // costura: rachadura fina do cotovelo ao pulso do braço do lado dela, sempre visível
    const buildCostura = () => { const n = cnt('costura');
      if (n) { const s = ASYM_S, el = restOf('el' + s), wr = restOf('wr' + s), d = norm3([wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]]), n0 = norm3([ASYM * 0.36, 0, 0.93]);
        const nL = Math.round(n * 0.72), nSt = n - nL, chs = seg++, sgC = seg++, part = s === 'L' ? 3 : 4;
        const at = (u, extra = 0) => { const th = 0.17 * Math.sin(u * 23) + 0.07 * Math.sin(u * 61 + 1) + extra, nn = rotAxis(n0, d, th), r = capR(LIMB.fore, u) + 0.0019, a = lerp3(el, wr, u); return { p: [a[0] + nn[0] * r, a[1] + nn[1] * r, a[2] + nn[2] * r], nn }; };
        const sk2 = u => u > 0.8 ? [J['el' + s], J['wr' + s], smooth(0.8, 1.02, u) * 0.5] : u < 0.18 ? [J['el' + s], J['sh' + s], smooth(0.18, -0.02, u) * 0.5] : [J['el' + s], -1, 0];
        for (let i = 0; i < nL; i++) { const u = 0.04 + 0.92 * i / (nL - 1), { p, nn } = at(u), [j1, j2, w2] = sk2(u); itemOld(3, 0, p, nn, j1, j2, w2, part, lerp(0.4, 0.75, u), { chain: chs, seg: sgC, size: 0.5, pA: u }); }
        const per = 4, nStch = Math.floor(nSt / per);
        for (let k = 0; k < nStch; k++) { const u = 0.1 + 0.8 * k / Math.max(1, nStch - 1), { p, nn } = at(u), tv = cross3(d, nn), [j1, j2, w2] = sk2(u);
          for (let j = 0; j < per; j++) { const o = -0.0062 + 0.0124 * j / (per - 1); itemOld(3, 1, [p[0] + tv[0] * o, p[1] + tv[1] * o, p[2] + tv[2] * o], nn, j1, j2, w2, part, lerp(0.4, 0.75, u), { seg: sgC, size: 0.42, pA: u }); } }
        this.seamN0 = n0; this.seamD = d;
      } };
    /* orçamento: bloquinho e costura primeiro (são identidade), depois as peças, e sobra garantida para orbe e props.
       Cada peça mede quanto gastaria com o detalhe pedido e se ajusta para caber na sua fatia */
    buildBloco(); buildCostura();
    buildCorpo();
    { const ACC = [['fone', buildFone], ['boots', buildBoots], ['jacketI', buildJacket], ['camisaI', buildTop], ['shortI', buildShort], ['sockI', buildSocks],
        ['piercing', buildPiercing], ['choker', buildChoker], ['liga', buildLiga], ['corrente', buildCorrente], ['chifres', buildChifres], ['cauda', buildCauda], ['asas', buildAsas], ['unhas', buildUnhas], ['tatuagem', buildTatuagem]];
      const want = ACC.map(([k]) => cnt(k)), room = Math.max(0, N - L.length - cnt('orb') - cnt('prop') - cnt('kiss') - Math.round(N * 0.004)), fA = Math.min(1, room / Math.max(1, want.reduce((a, b) => a + b, 0)));
      const measure = (fn, nn) => { const seg0 = seg; dry = 0; dryOn = true; fn(nn); dryOn = false; seg = seg0; return dry; };
      // cada peça acha o detalhe que dá a sua fatia; se os mínimos fixos estouram o total, todas encolhem juntas
      const fit = g => ACC.map(([k, fn], i) => { const target = Math.round(want[i] * fA * g); if (target < 8) return [0, 0]; let ne = target, m = 0;
        for (let it = 0; it < 4; it++) { m = measure(fn, Math.round(ne)); if (m <= 0 || Math.abs(m - target) < target * 0.02) break; ne = Math.max(6, ne * target / m); }
        return [Math.round(ne), measure(fn, Math.round(ne))]; });
      let g = 1, plan = fit(1);
      for (let it = 0; it < 4; it++) { const tot = plan.reduce((a, p2) => a + p2[1], 0); if (tot <= room) break; g *= Math.max(0.5, (room / tot) * 0.97); plan = fit(g); }
      ACC.forEach(([k, fn], i) => { if (plan[i][0] > 0) fn(plan[i][0]); });
    }
    // pool: orbe, props, aura (tipo 3) — completa até N
    { const skinned = []; for (let i = 0; i < L.length; i++) if (L[i].type === 0) skinned.push(i);
      this.skinned = skinned;
      const avail = Math.max(0, N - L.length), nOrb = Math.min(cnt('orb'), Math.round(avail * 0.2)), nProp = Math.min(cnt('prop'), avail - nOrb), nKiss = Math.min(cnt('kiss'), Math.max(0, avail - nOrb - nProp)); let i = 0; const sgO = seg++, sgP = seg++, sgA = seg++;   // com pouca célula sobrando, props ficam inteiros, só mais esparsos
      while (L.length < N) {
        const kind = i < nOrb ? 0 : i < nOrb + nProp ? 1 : i < nOrb + nProp + nKiss ? 3 : 2;   // 3 = marca de beijo
        B.add({ type: 3, part: -1, seg: kind === 0 ? sgO : kind === 1 ? sgP : sgA, kind, idx: kind === 0 ? i : kind === 1 ? i - nOrb : kind === 3 ? i - nOrb - nProp : 0, anchor: skinned[(rng() * skinned.length) | 0],
          ox: (rng() - 0.5) * 2, oy: (rng() - 0.5) * 2, oz: (rng() - 0.5) * 2, r1: rng(), r2: rng(), chain: -1, dist: 1, size: 0.6, shape: 0 });
        i++;
      }
      this.nOrb = nOrb; this.nProp = nProp; this.nKiss = nKiss;
    }
    this.overflow = Math.max(0, L.length - N);
    if (L.length > N) L.length = N;
    // empacota em arrays tipados
    const n = N; this.n = n;
    const F = () => new Float32Array(n), I = () => new Int32Array(n), F3 = () => new Float32Array(n * 3);
    const D = this.D = { type: new Uint8Array(n), part: new Int8Array(n), rx: F(), ry: F(), rz: F(), nx: F(), ny: F(), nz: F(), j1: I(), j2: I(), w2: F(), hthr: F(), p1: F(), p2: F(), p3: F(), p4: F(), p5: F(), size: F(), shape: new Uint8Array(n), col: new Uint8Array(n), spark: new Uint8Array(n), seed: F(), lastP: F(), hcut: new Uint8Array(n), seg: I(),
      lk: new Uint8Array(n), lu: F(), item: new Int8Array(n).fill(-1), sub: new Uint8Array(n), pA: F(), pB: F(), hang: F(), aan: I(), aox: F(), aoy: F(), aoz: F(),
      covJ: F(), offJ: F(), covS: F(), covH: F(), covM: F(), covB: F(), bdx: F(), bdy: F(), bdz: F(), occ: F(), occN: F(), cJ: F3(), cS: F3(), cH: F3(), cM: F3(), cB: F3(), cI: F(), cI2: F(), cI3: F(), aI: F(), sheer: F(), colo: F() };
    const colId = { body: 0, hand: 1, mask: 2 };
    const sk0 = this.skinned;
    const put3 = (arr, i, c) => { if (c) { arr[i * 3] = c[0]; arr[i * 3 + 1] = c[1]; arr[i * 3 + 2] = c[2]; } };
    for (let i = 0; i < n; i++) {
      const o = L[i]; D.type[i] = o.type; D.part[i] = o.part; D.size[i] = o.size; D.shape[i] = o.shape; D.seed[i] = rng(); D.seg[i] = o.seg || 0; D.spark[i] = o.sparkle || 0;
      D.hthr[i] = 1 - (o.dist ?? 1) * 0.88 - rng() * 0.12;
      if (o.type === 0 || o.type === 4) { D.rx[i] = o.x; D.ry[i] = o.y; D.rz[i] = o.z; D.nx[i] = o.nx; D.ny[i] = o.ny; D.nz[i] = o.nz; D.j1[i] = o.j1; D.j2[i] = o.j2 < 0 ? o.j1 : o.j2; D.w2[i] = o.j2 < 0 ? 0 : o.w2; }
      if (o.type === 0) {
        D.col[i] = colId[o.col]; D.p1[i] = o.shell ? 1 : 0; D.p2[i] = o.hc || 0; D.p3[i] = o.su || 0; D.p4[i] = o.sv || 0; D.p5[i] = o.front || 0; D.hcut[i] = o.hcut || 0; D.lk[i] = o.lk || 0; D.lu[i] = o.lu || 0;
        if (o.lk) { const m = clothMap(o); D.covJ[i] = m.covJ; D.offJ[i] = m.offJ; D.covS[i] = m.covS; D.covH[i] = m.covH; D.covM[i] = m.covM; D.covB[i] = m.covB; D.sheer[i] = m.sheer; D.colo[i] = m.colo;
          if (m.bd) { D.bdx[i] = m.bd[0]; D.bdy[i] = m.bd[1]; D.bdz[i] = m.bd[2]; }
          put3(D.cJ, i, m.colJ); put3(D.cS, i, m.colS); put3(D.cH, i, m.colH); put3(D.cM, i, m.colM); put3(D.cB, i, m.colB); }
        if (!o.shell) D.occ[i] = foneOcc(o.x, o.y, o.z);
        if (o.palm) D.occN[i] = 1;   // a palma que segura o bloquinho fica por trás dele
        // a dissolução do braço do lado dela abre primeiro ao longo da costura
        if (o.lk === LK.fore && o.sideS === ASYM_S && this.seamN0) { const dt2 = o.nx * this.seamN0[0] + o.ny * this.seamN0[1] + o.nz * this.seamN0[2]; D.hthr[i] -= 0.13 * smooth(0.82, 0.97, dt2); }
      }
      else if (o.type === 1) { D.p1[i] = o.feat; D.p2[i] = o.side; D.p3[i] = o.a; D.p4[i] = o.b; }
      else if (o.type === 2) { D.p1[i] = o.strand; D.p2[i] = o.s; D.p3[i] = o.ox; D.p4[i] = o.oy; D.p5[i] = o.flags || 0; }
      else if (o.type === 4) {
        D.cI[i] = o.col[0]; D.cI2[i] = o.col[1]; D.cI3[i] = o.col[2]; D.aI[i] = o.al; D.hang[i] = o.hang || 0;
        D.item[i] = o.item; D.sub[i] = o.sub; D.pA[i] = o.pA; D.pB[i] = o.pB; D.p1[i] = o.q1 || 0; D.p2[i] = o.q2 || 0; D.p3[i] = o.q3 || 0; D.p4[i] = o.q4 || 0; D.aan[i] = sk0[(rng() * sk0.length) | 0]; D.aox[i] = rng() - 0.5; D.aoy[i] = rng() - 0.5; D.aoz[i] = rng() - 0.5; if (o.item === ITEM_ID.costura) D.hthr[i] -= 0.06; }
      else { D.p1[i] = o.kind; D.p2[i] = o.idx; D.j1[i] = o.anchor; D.rx[i] = o.ox; D.ry[i] = o.oy; D.rz[i] = o.oz; D.p3[i] = o.r1; D.p4[i] = o.r2; }
      eng.S.group[i] = o.seg || 0; eng.S.shape[i] = o.shape;
      // ordem de construção: do peito para as extremidades; rosto, cabelo e acessórios por último
      let ord;
      if (o.type === 0 || o.type === 4) ord = 0.04 + 0.5 * clamp(Math.hypot(D.rx[i], D.ry[i] - 1.3, D.rz[i]) / 1.3, 0, 1) + (o.type === 4 ? 0.3 : 0);
      else if (o.type === 1) ord = 0.56 + 0.08 * rng();
      else if (o.type === 2) ord = 0.6 + 0.3 * (o.s || 0);
      else ord = 0.9 + 0.1 * rng();
      eng.S.order[i] = clamp(ord + (rng() - 0.5) * 0.04, 0, 1);
    }
    // ligações: contornos (rosto, cachos, peças) + vizinho mais próximo dentro do mesmo segmento anatômico
    const links = [], lw = [];
    for (let i = 1; i < n; i++) if (L[i].chain >= 0 && L[i].chain === L[i - 1].chain) { links.push(i - 1, i); lw.push(L[i].type === 4 ? 1 + L[i].item : L[i].type === 2 ? 100 : 0); }   // 1+id da peça → peso no quadro; 100 = cachos
    const bySeg = new Map();
    for (let i = 0; i < n; i++) if (L[i].type === 0 && D.p1[i] === 0) { const k = L[i].seg; if (!bySeg.has(k)) bySeg.set(k, []); bySeg.get(k).push(i); }
    for (const arr of bySeg.values()) {
      for (let a = 0; a < arr.length; a++) {
        if (rng() > 0.3) continue;
        const i = arr[a]; let best = -1, bd = 1e9;
        for (let b = 0; b < arr.length; b++) { if (b === a) continue; const j = arr[b]; const d = d2(D.rx[i] - D.rx[j], D.ry[i] - D.ry[j], D.rz[i] - D.rz[j]); if (d < bd && d > 1e-6) { bd = d; best = j; } }
        if (best >= 0 && bd < 0.0016) { links.push(i, best); lw.push(0); }
      }
    }
    this.links = new Int32Array(links); this.linkItem = Uint8Array.from(lw); this.linkW = new Float32Array(lw.length).fill(1); this.linkAlpha = 0.18;
  }

  /* cache do vestuário por slot: posição de repouso deslocada, cor do material, oclusões.
     Só é refeito quando o peso de alguma peça muda (transições); em regime estável custa zero. */
  clothCache(eng, jw, sw, shw, mw, bw, fw, nw) {
    const key = [jw, sw, shw, mw, bw, fw, nw];
    if (this.ccKey && key.every((v, k) => Math.abs(v - this.ccKey[k]) < 1e-5)) return this.CC;
    this.ccKey = key;
    const n = this.n, D = this.D, S = eng.S, F = () => new Float32Array(n);
    const C = this.CC || (this.CC = { qx: F(), qy: F(), qz: F(), wSk: F(), cr: F(), cg: F(), cb: F(), tg: F(), aMul: F(), gloss: F(), grain: new Uint8Array(n) });
    const tJ = 4 * jw * (1 - jw), tS = 4 * sw * (1 - sw), tH = 4 * shw * (1 - shw), tM = 4 * mw * (1 - mw), tB = 4 * bw * (1 - bw);
    for (let i = 0; i < n; i++) {
      if (D.type[i] !== 0) continue;
      let qx = D.rx[i], qy = D.ry[i], qz = D.rz[i], wSk = 1, wJ = 0, wS = 0, wH = 0, wB = 0, wM = 0;
      if (D.p1[i] !== 1 && D.lk[i]) {
        wJ = D.covJ[i] * jw; wS = D.covS[i] * sw * (1 - wJ); wH = D.covH[i] * shw * (1 - wJ); wB = D.covB[i] * bw; wM = D.covM[i] * mw * (1 - wB) * (1 - wH);
        wSk = Math.max(0, 1 - wJ - wS - wH - wB - wM);
        const off = wJ * D.offJ[i] + wS * 0.004 + wH * 0.006 + wM * 0.0025;
        qx += D.nx[i] * off + D.bdx[i] * wB; qy += D.ny[i] * off + D.bdy[i] * wB; qz += D.nz[i] * off + D.bdz[i] * wB;
      }
      C.qx[i] = qx; C.qy[i] = qy; C.qz[i] = qz; C.wSk[i] = wSk;
      const wf = 1 - wSk, i3 = i * 3;
      if (wf > 1e-4) {
        C.cr[i] = (D.cJ[i3] * wJ + D.cS[i3] * wS + D.cH[i3] * wH + D.cB[i3] * wB + D.cM[i3] * wM) / wf;
        C.cg[i] = (D.cJ[i3 + 1] * wJ + D.cS[i3 + 1] * wS + D.cH[i3 + 1] * wH + D.cB[i3 + 1] * wB + D.cM[i3 + 1] * wM) / wf;
        C.cb[i] = (D.cJ[i3 + 2] * wJ + D.cS[i3 + 2] * wS + D.cH[i3 + 2] * wH + D.cB[i3 + 2] * wB + D.cM[i3 + 2] * wM) / wf;
        C.gloss[i] = (wJ + wB) / wf;
        C.tg[i] = Math.min(0.55, (D.covJ[i] * tJ + D.covS[i] * tS + D.covH[i] * tH + D.covM[i] * tM + D.covB[i] * tB) * 0.35);   // brilho de materialização
      } else { C.tg[i] = 0; C.gloss[i] = 0; }
      // trama: couro na horizontal, malha/meia em nervuras verticais, jeans em sarja diagonal — pele segue caótica
      if (wf > 0.5) { const g = (wJ + wB) >= Math.max(wS, wM, wH) ? 1 : wH >= Math.max(wS, wM) ? 3 : 2; C.grain[i] = g; S.rot[i] = (g === 2 ? Math.PI / 2 : g === 3 ? Math.PI / 4 : 0) + (D.seed[i] - 0.5) * 0.18; }
      else { C.grain[i] = 0; S.rot[i] = 99; }
      C.aMul[i] = (1 - fw * D.occ[i]) * (1 - nw * 0.7 * D.occN[i]);
    }
    return C;
  }
