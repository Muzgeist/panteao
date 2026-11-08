    // props e orbe
    const rootP = ch.joint('root'), yaw = ch.v[CI['root.yaw']] * D2R, cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const pb = ch.props.bench, pwl = ch.props.wall, po = ch.props.orb, pbar = ch.props.bar, pled = ch.props.ledge, orb = ch.orb;
    const out = [0, 0, 0, 0];
    const CC = this.clothCache(eng, jw, sw, shw, mw, bw, fw, nw);
    const lbs = (i, qx, qy, qz) => {
      const j1 = D.j1[i], j2 = D.j2[i], w2 = D.w2[i], w1 = 1 - w2;
      let o = j1 * 9, ax = qx - JREST[j1 * 3], ay = qy - JREST[j1 * 3 + 1], az = qz - JREST[j1 * 3 + 2];
      let x = w1 * (JR[o] * ax + JR[o + 1] * ay + JR[o + 2] * az + JP[j1 * 3]), y = w1 * (JR[o + 3] * ax + JR[o + 4] * ay + JR[o + 5] * az + JP[j1 * 3 + 1]), z = w1 * (JR[o + 6] * ax + JR[o + 7] * ay + JR[o + 8] * az + JP[j1 * 3 + 2]);
      out[3] = JR[o + 6] * D.nx[i] + JR[o + 7] * D.ny[i] + JR[o + 8] * D.nz[i];
      if (w2 > 0) { o = j2 * 9; ax = qx - JREST[j2 * 3]; ay = qy - JREST[j2 * 3 + 1]; az = qz - JREST[j2 * 3 + 2];
        x += w2 * (JR[o] * ax + JR[o + 1] * ay + JR[o + 2] * az + JP[j2 * 3]); y += w2 * (JR[o + 3] * ax + JR[o + 4] * ay + JR[o + 5] * az + JP[j2 * 3 + 1]); z += w2 * (JR[o + 6] * ax + JR[o + 7] * ay + JR[o + 8] * az + JP[j2 * 3 + 2]); }
      out[0] = x; out[1] = y; out[2] = z;
    };

    for (let i = 0; i < n; i++) {
      const ty = D.type[i];
      let x = 0, y = 0, z = 0, nz = 1, r = 1, g = 1, b = 1, a = 1, size = D.size[i], k = 0.92, turb = 0.02, glitch = 0, shape = D.shape[i], iw = 1;
      const sd = D.seed[i];
      if (ty === 0) {
        // vestuário: o próprio slot assume o papel de tecido (cache recalculado só quando alguma peça muda)
        const shell = D.p1[i] === 1, wSk = CC.wSk[i];
        lbs(i, CC.qx[i], CC.qy[i], CC.qz[i]); x = out[0]; y = out[1]; z = out[2]; nz = out[3];
        const front = smooth(-0.2, 0.75, nz), rim = Math.pow(1 - Math.abs(nz), 3);
        const c = D.col[i];
        let br, bg, bb;
        if (c === 2) { br = PAL.face[0] * 0.55; bg = PAL.face[1] * 0.45; bb = PAL.face[2] * 0.62; }
        else { const hgt = smooth(0.3, 1.45, D.ry[i]), mm = c === 1 ? 0.8 : 0.2 + hgt * 0.7; br = lerp(PAL.violet[0], PAL.magenta[0], mm); bg = lerp(PAL.violet[1], PAL.magenta[1], mm); bb = lerp(PAL.violet[2], PAL.magenta[2], mm); }
        const lit = 0.32 + 0.68 * front, crv = c === 2 ? 0 : 0.35 * smooth(0.55, 1.47, D.ry[i]) * (D.lk[i] === LK.torso || D.lk[i] === LK.thigh ? 1 : 0.4);   // a luz de contorno desenha as curvas
        r = lerp(PAL.deep[0], br, lit) + PAL.rim[0] * rim * (0.75 + crv); g = lerp(PAL.deep[1], bg, lit) + PAL.rim[1] * rim * (0.75 + crv); b = lerp(PAL.deep[2], bb, lit) + PAL.rim[2] * rim * (0.75 + crv);
        a = (0.11 + 0.36 * front + (0.62 + crv * 0.6) * rim) * (nz < -0.25 ? 0.42 : 1);
        if (shell) { // casca da cabeça: rosto mais escuro onde ficam olhos/boca; sob o cabelo, quase some
          if (D.p5[i] > 0.3) { const u = Math.abs(D.p3[i]), v = D.p4[i];
            const eyeM = Math.exp(-(((u - EX) / 0.024) ** 2) - (((v - EY) / 0.015) ** 2));
            const mo = Math.exp(-((D.p3[i] / (mHalf + 0.004)) ** 2) - (((v + 0.06 + mDn * 0.4) / (mDn * 0.6 + 0.006)) ** 2));
            const smk = Math.exp(-(((u - EX - 0.004) / 0.032) ** 2) - (((v - EY - 0.007) / 0.021) ** 2));   // olho esfumaçado permanente
            a *= 1 - 0.75 * eyeM - 0.8 * mo * smooth(0.02, 0.2, F.open + F.round * 0.3); a *= 0.8 * (1 - 0.55 * smk); r = lerp(r, PAL.deep[0] * 1.4, smk * 0.7); g = lerp(g, PAL.deep[1], smk * 0.7); b = lerp(b, PAL.deep[2] * 1.3, smk * 0.7); }
          else a *= 0.75;
          a *= 1 - 0.8 * D.p2[i];
        }
        if (D.spark[i]) { const tw = (0.5 + 0.5 * Math.sin(t * 3.3 + sd * 60)) * wSk; r += 0.6 * tw; g += 0.35 * tw; b += 0.5 * tw; a += 0.25 * tw; }
        let wSkE = wSk;
        if (wSk < 0.999) {
          // tecido translúcido/glitch: em manchas do top e da manga o tecido falha e deixa a pele aparecer
          const sh = D.sheer[i]; if (sh > 0.01) { const fk = hash1(Math.floor(t * 7 + sd * 3) * 1.37 + i * 0.13); wSkE = wSk + (1 - wSk) * sh * (0.28 + 0.5 * (fk > 0.72 ? 1 : 0)); }
          // insinuação: um pedaço da roupa falha rápido demais pra ver direito e se refaz
          if (pk > 0) { const dx2 = D.rx[i] - pkc[0], dy2 = D.ry[i] - pkc[1], dz2 = D.rz[i] - pkc[2]; const fpk = pk * smooth(pkr * pkr, pkr * pkr * 0.3, dx2 * dx2 + dy2 * dy2 + dz2 * dz2); if (fpk > 0.01) { wSkE = lerp(wSkE, 1, fpk); glitch = Math.max(glitch, fpk * 0.9); } }
        }
        if (wSk < 0.999) {
          const wf = 1 - wSkE, lf = 0.4 + 0.6 * front, gl = CC.gloss[i];
          // borda: tecido ganha o neon da Lili; couro ganha reflexo frio (brilho de verniz)
          const rk = rim * (0.24 - 0.06 * gl), rr0 = lerp(MAT.rim[0], 0.75, gl), rg0 = lerp(MAT.rim[1], 0.76, gl), rb0 = lerp(MAT.rim[2], 0.92, gl);
          const fr = CC.cr[i] * lf + rr0 * rk, fg = CC.cg[i] * lf + rg0 * rk, fb = CC.cb[i] * lf + rb0 * rk;
          const fa = (0.17 + 0.24 * front + 0.55 * rim) * (nz < -0.25 ? 0.36 : 1);
          r = r * wSkE + fr * wf; g = g * wSkE + fg * wf; b = b * wSkE + fb * wf; a = a * wSkE + fa * wf;
          if (CC.grain[i]) { shape = 1; size *= CC.grain[i] === 2 ? 0.9 : CC.grain[i] === 3 ? 0.95 : 1.05; }
          if (CC.tg[i] > 0.01) glitch = Math.max(glitch, CC.tg[i]);
        }
        a *= CC.aMul[i];
        if (D.colo[i] > 0.02) { const gw = D.colo[i] * wSkE * coloAmp; r += coloC[0] * gw; g += coloC[1] * gw; b += coloC[2] * gw; a += 0.3 * gw; }   // brilho sob a pele no colo
        if (D.hcut[i]) a *= smooth(1.12, 1.3, D.ry[i]);
      } else if (ty === 1) {
        // rosto paramétrico em coordenadas locais da cabeça
        const feat = D.p1[i], side = D.p2[i], pa = D.p3[i], pb2 = D.p4[i];
        let u = 0, v = 0, lift = 0.0045; const eo = side > 0 ? eyeO[0] : eyeO[1];
        r = PAL.face[0]; g = PAL.face[1]; b = PAL.face[2]; a = 1;
        const wide = 1 + 0.12 * Math.max(0, eo - 1);
        switch (feat) {
          case 0: u = side * (EX + pa * EW * wide); v = EY + eyeUpper(pa, eo) + pb2; a = 0.9; size = 0.75; r *= 0.95; g *= 0.85; break;
          case 1: u = side * (EX + pa * EW * wide); v = EY + eyeLower(pa, eo) - pb2; a = 0.45; size = 0.65; r *= 0.8; g *= 0.75; break;
          case 3: { const q = pa - 1; u = side * (EX + pa * EW * wide); v = EY + eyeUpper(1, eo) + q * 0.03 * Math.min(1, eo + 0.2) - q * q * 0.02; a = 0.9; size = 0.75; break; }
          case 2: case 12: case 13: { // íris: mapa radial de dados (raios + anel) e pupila vertical de gato que dilata com interesse
            const ir = IR * (0.9 + 0.1 * wide), cx = side * EX + gx, cy = EY + gy + 0.001;
            let du, dv; if (feat === 13) { du = pb2 * slitW * 0.9; dv = pa * 0.86; } else { du = Math.cos(pb2) * pa; dv = Math.sin(pb2) * pa; }
            u = cx + du * ir; v = cy + dv * ir;
            const qx = clamp((u - side * EX) / (EW * wide) * side, -1, 1), up = EY + eyeUpper(qx, eo), lo = EY + eyeLower(qx, eo);
            let vis = 1; if (v > up) { v = up; vis = 0.12; } if (v < lo) { v = lo; vis = 0.12; }
            const pup = feat === 13 || (du / slitW) ** 2 + (dv / 0.86) ** 2 < 1;
            if (pup) { shape = INK; a = vis * smooth(0.04, 0.25, eo) * 0.95; size = feat === 13 ? 0.62 : 0.7; r = g = b = 0; lift = 0.0036; break; }
            if (feat === 12) { const dd = 0.35 + 0.65 * irisDef, rr = (pa > 0.82 ? 1.2 : 0.9) * (0.75 + 0.6 * dd); r = irisC[0] * rr; g = irisC[1] * rr; b = irisC[2] * rr; size = 0.5 + 0.12 * dd; a = vis * smooth(0.04, 0.25, eo) * (0.35 + 0.6 * dd); }
            else { const rr = pa > 0.8 ? 1.1 : 0.75; r = PAL.eye[0] * 0.55 * rr; g = PAL.eye[1] * 0.75 * rr; b = PAL.eye[2] * rr; size = 0.6; a = vis * smooth(0.04, 0.25, eo) * (0.5 - 0.22 * irisDef); }
            lift = 0.0035; break; }
          case 9: { // cílios: traços saindo da pálpebra de cima, mais longos no canto de fora
            const q = clamp(pa, -1, 1), len = (0.0022 + 0.0042 * smooth(-0.4, 1, q)) * (0.6 + 0.4 * Math.min(1, eo)), up = EY + eyeUpper(q, eo), ang = 1.15 - 0.75 * smooth(-0.6, 1, q);
            u = side * (EX + q * EW * wide + Math.cos(ang) * len * pb2); v = up + 0.0006 + Math.sin(ang) * len * pb2;
            r = 0.75; g = 0.16; b = 0.55; a = 0.85 * smooth(0.1, 0.4, eo); size = 0.55; shape = 3; S.rot[i] = Math.atan2(-Math.sin(ang), side * Math.cos(ang)); break; }
          case 10: { // delineado gatinho: escuro, mais longo e afiado do lado dela
            const wingL = side === ASYM ? 0.019 : 0.013, q = pa;
            if (q <= 1) { u = side * (EX + q * EW * wide); v = EY + eyeUpper(q, eo) + 0.0012 + 0.0011 * smooth(-0.2, 1, q); }
            else { const f = (q - 1) / 0.6; u = side * (EX + EW * wide + f * wingL); v = EY + eyeUpper(1, eo) + 0.0012 + f * wingL * 0.62; }
            const tip = smooth(1.3, 1.6, q); if (pb2 < 0.5) { shape = INK; a = 0.95 * (1 - tip * 0.4); size = 0.7 * (1 - tip * 0.45); r = g = b = 0; } else { v += 0.0013; r = 0.55; g = 0.08; b = 0.4; a = 0.7 * (1 - tip * 0.3); size = 0.42; }
            break; }
          case 11: { // esfumado: névoa violeta + tinta, na pálpebra móvel e no canto de fora
            u = side * (EX + pa * EW * 1.25 + 0.003); v = EY + 0.0045 + pb2 * 0.013 * (1 - 0.35 * pa * pa);
            if (i % 2) { shape = INK; a = 0.28; size = 1.6; r = g = b = 0; } else { r = 0.45; g = 0.06; b = 0.5; a = 0.16; size = 1.5; } lift = 0.006; break; }
          case 14: { // canino levemente pontudo: só aparece com o sorriso bem aberto
            const sgn = pa > 0 ? 1 : -1, c = (sgn > 0 ? F.smileL : F.smileR) * 0.0095 * 0.25; u = sgn * mHalf * 0.5; v = -0.06 + c + mUp * 0.55 - 0.0012 - pb2 * 0.0056;
            const sm = (F.smileL + F.smileR) / 2; r = 1.35; g = 1.3; b = 1.45; a = clamp(F.teeth, 0, 1) * smooth(0.2, 0.34, F.open + sm * 0.2) * (1 - pb2 * 0.2); size = 0.72 - pb2 * 0.3; break; }
          case 4: { const raise = side > 0 ? F.browL : F.browR; u = side * (0.036 + pa * 0.0165); v = 0.029 + raise * 0.0085 + 0.003 * (1 - pa * pa) + F.browAng * 0.0062 * (1 - pa) / 2 + pb2;
            r = MAT.hairMid[0] * 1.25; g = MAT.hairMid[1] * 1.15; b = MAT.hairMid[2] * 1.3; a = 0.95; size = 0.68; break; }
          case 5: case 6: { const sc = pb2, th = pa, cx = Math.cos(th), sn = Math.sin(th);
            const sm = cx > 0 ? F.smileL : F.smileR, c = sm * 0.0095 * cx * cx - Math.abs(F.smileL - F.smileR) * 0.0006;
            u = cx * mHalf * (sc < 1 ? 0.88 : 1); v = -0.06 + c + sn * (sn > 0 ? mUp : mDn) * sc + (sn > 0 ? 0.0004 * Math.cos(th * 2) * (1 - F.open) : 0);
            r = PAL.lip[0]; g = PAL.lip[1]; b = PAL.lip[2]; a = feat === 5 ? 1.0 : 0.7; size = feat === 5 ? 0.8 : 0.7; break; }
          case 7: { const c = (pa > 0 ? F.smileL : F.smileR) * 0.0095 * pa * pa; u = pa * mHalf * 0.85; v = -0.06 + c + mUp * 0.55 - 0.0012;
            const sm = (F.smileL + F.smileR) / 2, vis = clamp(F.teeth, 0, 1) * smooth(0.06, 0.22, F.open + sm * 0.06); r = 1.3; g = 1.3; b = 1.4; a = vis; size = 0.75; break; }
          case 8: { if (pa < 0.55) { u = 0.0025; v = -0.004 - pa / 0.55 * 0.028; a = 0.22; } else { const q = (pa - 0.55) / 0.45; u = (q - 0.5) * 0.016; v = -0.034 + 0.003 * Math.abs(q - 0.5) * 2; a = 0.4; } r = PAL.lip[0] * 0.8; g = PAL.lip[1] * 0.8; b = PAL.lip[2] * 0.8; size = 0.65; break; }
        }
        const lz = HC[2] + headZ(u, v) + lift, ly = HC[1] + v;
        x = hpx + H[0] * u + H[1] * ly + H[2] * lz; y = hpy + H[3] * u + H[4] * ly + H[5] * lz; z = hpz + H[6] * u + H[7] * ly + H[8] * lz;
        nz = H[6] * (u / 0.007) + H[7] * (v / 0.012) + H[8] * (lz / 0.009); nz = nz / Math.hypot(u / 0.007, v / 0.012, lz / 0.009);
        a *= smooth(-0.1, 0.35, nz); if (shape !== INK && shape !== 3) shape = 0; k = 1;
        if (!port) { size *= 0.75; a *= feat === 2 ? 0.75 : 0.7; }
      } else if (ty === 2) {
        // cacho: hélice em volta da linha central; raio cresce para as pontas; espessura do fio + frizz
        const st = D.p1[i] | 0, s = D.p2[i], strand = this.strands[st], fl = D.p5[i] | 0, frizz = fl & 2, chainP = fl & 4;
        const fm = s * (M - 1), m0 = Math.min(M - 2, fm | 0), f = fm - m0, o = (st * M + m0) * 3, oe = (st * M + m0) * 6;
        const cx0 = lerp(SP[o], SP[o + 3], f), cy0 = lerp(SP[o + 1], SP[o + 4], f), cz0 = lerp(SP[o + 2], SP[o + 5], f);
        const e1x = lerp(SE[oe], SE[oe + 6], f), e1y = lerp(SE[oe + 1], SE[oe + 7], f), e1z = lerp(SE[oe + 2], SE[oe + 8], f), e2x = lerp(SE[oe + 3], SE[oe + 9], f), e2y = lerp(SE[oe + 4], SE[oe + 10], f), e2z = lerp(SE[oe + 5], SE[oe + 11], f);
        const sA = strand.sA, rc = (s < sA ? strand.rc0 : lerp(strand.rc0, strand.rc1, smooth(sA, 1, s))) * (1 + hf * 0.3);
        const phi = strand.ph + TAU * strand.turns * Math.pow(s, 1.12), cph = Math.cos(phi), sph = Math.sin(phi), tub = strand.tube * (1 - 0.3 * s), ox = D.p3[i], oy = D.p4[i];
        x = cx0 + (e1x * cph + e2x * sph) * rc + (e1x * ox + e2x * oy) * tub; y = cy0 + (e1y * cph + e2y * sph) * rc + (e1y * ox + e2y * oy) * tub; z = cz0 + (e1z * cph + e2z * sph) * rc + (e1z * ox + e2z * oy) * tub;
        { const dph = TAU * strand.turns * 1.12 * Math.pow(Math.max(s, 0.02), 0.12) / (M - 1), tx = SP[o + 3] - SP[o] + (-e1x * sph + e2x * cph) * rc * dph, ty2 = SP[o + 4] - SP[o + 1] + (-e1y * sph + e2y * cph) * rc * dph; S.rot[i] = Math.atan2(-ty2, tx); }
        // cor: raiz castanho-escura → caramelo nas pontas (cada cacho com sua dose de mecha); o lado do cacho virado pra câmera brilha
        const c0 = smooth(0, 0.3, s), c1 = smooth(0.35, 1, s) * strand.hl, facing = e1z * cph + e2z * sph, shade = 0.6 + 0.55 * Math.max(0, facing), shn = 0.8 + 0.3 * Math.sin(s * 11 - t * 1.6 + strand.ph), rimH = (1 - Math.abs(facing)) * 0.07;
        r = lerp(lerp(MAT.hairRoot[0], MAT.hairMid[0], c0), MAT.hairTip[0], c1) * shade * shn + PAL.magenta[0] * rimH; g = lerp(lerp(MAT.hairRoot[1], MAT.hairMid[1], c0), MAT.hairTip[1], c1) * shade * shn + PAL.magenta[1] * rimH; b = lerp(lerp(MAT.hairRoot[2], MAT.hairMid[2], c0), MAT.hairTip[2], c1) * shade * shn + PAL.magenta[2] * rimH;
        const zb = (x - hpx) * hZ[0] + (y - hpy) * hZ[1] + (z - hpz) * hZ[2];
        a = (frizz ? 0.3 : chainP ? 0.88 : 0.74) * (0.85 + 0.15 * (1 - s)); k = 0.85; turb = frizz ? 0.06 : 0.03;
        size = (frizz ? 0.55 : chainP ? 0.8 : 1.02) * (port ? 1.25 : 1); shape = frizz ? 0 : 3;
        if (D.spark[i]) { const tw = Math.max(0, Math.sin(t * 4.1 + sd * 80)); r += 0.9 * tw; g += 0.75 * tw; b += 0.55 * tw; size = 0.7 + 0.5 * tw; shape = 0; }
        { // o fone suprime a mecha que passaria por baixo dele; tronco e cabeça escondem o cabelo de trás
          const px = x - cpx, py = y - cpy, pz = z - cpz, lx = CR[0] * px + CR[3] * py + CR[6] * pz + crx, ly = CR[1] * px + CR[4] * py + CR[7] * pz + cry, lz = CR[2] * px + CR[5] * py + CR[8] * pz + crz;
          if (fw > 0.001 && ly > 1.38 && ly < 1.53 && lx > -0.14 && lx < 0.14) a *= 1 - fw * foneOcc(lx, ly, lz);
          let oc = 0;
          if (ly > 0.8 && ly < 1.47 && lx > -0.2 && lx < 0.2) { const pr = tpr; torsoFast(ly, pr); const rx2 = pr[0] * 1.04 + 0.012, rz2 = pr[1] * 1.04 + 0.012; oc = occEllipse2(lx / rx2, (lz - pr[2]) / rz2, CR[6] / rx2, CR[8] / rz2); }
          if (oc < 1 && zb < 0.02) { const qx = x - hpx, qy = y - hpy, qz = z - hpz, hlx = (H[0] * qx + H[3] * qy + H[6] * qz - HC[0]) / HRAD[0], hly = (H[1] * qx + H[4] * qy + H[7] * qz - HC[1]) / HRAD[1], hlz = (H[2] * qx + H[5] * qy + H[8] * qz - HC[2]) / HRAD[2];
            if (hlx * hlx + hly * hly < 1.4) oc = Math.max(oc, occEllipsoid(hlx, hly, hlz, H[6] / HRAD[0], H[7] / HRAD[1], H[8] / HRAD[2])); }
          a *= 1 - 0.88 * oc;
        }
        if (fl & 1) { // estilhaços que se soltam do cabelo: o rastro dela
          const p = fract(this.shedPh + sd * 7.3);
          if (p < D.lastP[i]) S.warp[i]++;
          D.lastP[i] = p;
          if (p > 0.8) { const q = (p - 0.8) / 0.2, nx = x - hpx, ny = y - hpy - 0.08, nzz = z - hpz, nl = Math.hypot(nx, ny, nzz) + 1e-3;
            x += nx / nl * q * 0.42 + Math.sin(sd * 40) * q * 0.12; y += ny / nl * q * 0.3 + q * q * 0.2; z += nzz / nl * q * 0.3;
            a *= 1 - q; r = lerp(r, 1.2, q); g = lerp(g, 1.0, q); b = lerp(b, 1.1, q); glitch = 0.35 * (1 - q); shape = 1; k = 0.5; }
        }
      } else if (ty === 4) {
        // acessórios: geometria própria, mesma esfola do corpo
        const it = D.item[i], sub = D.sub[i]; iw = itemW[it];
        lbs(i, D.rx[i], D.ry[i], D.rz[i]); x = out[0]; y = out[1]; z = out[2]; nz = out[3];
        let br = D.cI[i], bg = D.cI2[i], bb = D.cI3[i]; a = D.aI[i];
        const hg = D.hang[i];
        if (hg > 0) { const s = D.pA[i], ph = D.pB[i]; x += Math.sin(t * 2.1 + ph * 1.7) * 0.0045 * s; y -= hg * s; z += Math.cos(t * 1.7 + ph * 2.3) * 0.003 * s + 0.0015 * s; }
        else if (sub === 2) { const s = D.pA[i], sgn = D.pB[i] ? 1 : -1, len = D.pB[i] ? 0.075 : 0.092, sw2 = Math.sin(t * 3.1 + D.pB[i] * 1.7) * 0.012 * s;   // cadarço solto
          x += ankX[0] * sgn * 0.3 * len * s + sw2 - this.ankV[0] * 0.05 * s * s; y += -len * s - this.ankV[1] * 0.03 * s * s; z += ankX[2] * sgn * 0.3 * len * s + 0.012 * s - this.ankV[2] * 0.05 * s * s; nz = 0.6; }
        else if (sub === 5) { const s = D.pA[i]; x += Math.sin(t * 1.1 + 0.6) * 0.009 * s * s; z += Math.max(0, Math.sin(t * 0.9)) * 0.004 * s; }   // cabo do fone
        if (sub === 6) a *= 1 - 0.92 * jw;   // fica por baixo da jaqueta
        let dyn = false;
        if (sub === 20) { // cauda: tubo em volta da linha central + coração da ponta
          dyn = true; const sT = D.p1[i], kd = D.p3[i] | 0;
          if (kd === 0 || kd === 4) {
            const fm = sT * (TMn - 1), m0 = Math.min(TMn - 2, fm | 0), f = fm - m0, o3 = m0 * 3, o6 = m0 * 6;
            const e1x = lerp(TFr[o6], TFr[o6 + 6], f), e1y = lerp(TFr[o6 + 1], TFr[o6 + 7], f), e1z = lerp(TFr[o6 + 2], TFr[o6 + 8], f), e2x = lerp(TFr[o6 + 3], TFr[o6 + 9], f), e2y = lerp(TFr[o6 + 4], TFr[o6 + 10], f), e2z = lerp(TFr[o6 + 5], TFr[o6 + 11], f);
            const rad = lerp(TAIL.r0, TAIL.r1, sT) * (kd === 4 ? 1.08 : 1), an = D.p2[i] + (kd === 4 ? Math.atan2(e2z, e1z) : 0), ca = Math.cos(an), sa = Math.sin(an);
            const nxT = e1x * ca + e2x * sa, nyT = e1y * ca + e2y * sa; nz = e1z * ca + e2z * sa;
            x = lerp(TSp[o3], TSp[o3 + 3], f) + nxT * rad; y = lerp(TSp[o3 + 1], TSp[o3 + 4], f) + nyT * rad; z = lerp(TSp[o3 + 2], TSp[o3 + 5], f) + nz * rad;
            const gT = Math.pow(sT, 1.3); br = lerp(MAT.tailA[0], MAT.tailB[0], gT); bg = lerp(MAT.tailA[1], MAT.tailB[1], gT); bb = lerp(MAT.tailA[2], MAT.tailB[2], gT);
            if (kd === 4) { const alt = (i % 2) ? 1 : 0.55; br = MAT.scale[0] * alt; bg = MAT.scale[1] * alt; bb = MAT.scale[2] * alt; }
            else if (Math.abs(nz) < 0.3) { shape = INK; a = 0.75; }   // silhueta em preto profundo
            else if (nz < 0) a *= 0.3;
          } else {
            const H2 = this.tailH, hx = D.pA[i], hy = D.pB[i], HS = TAIL.HS * (1 + 0.06 * Math.sin(t * 2.4) * fl);
            x = H2[0] + H2[3] * hx * HS + H2[6] * hy * HS; y = H2[1] + H2[4] * hx * HS + H2[7] * hy * HS; z = H2[2] + H2[5] * hx * HS + H2[8] * hy * HS + (kd === 5 ? -0.002 : kd === 1 ? 0 : 0.002); nz = 0.85;
            if (kd === 1) { const hh = smooth(-0.3, 0.7, hy); br = lerp(MAT.tailB[0], MAT.heartHi[0], hh * 0.6); bg = lerp(MAT.tailB[1], MAT.heartHi[1], hh * 0.6); bb = lerp(MAT.tailB[2], MAT.heartHi[2], hh * 0.6); }
          }
        } else if (sub === 21) { // asas: membrana translúcida entre os dedos, armação em tinta, escamas na borda
          dyn = true; const sx = D.p1[i] > 0 ? 1 : -1, W2 = this.wingW[sx], kind = D.p2[i] | 0;
          const uv = kind === 0 ? wingUV(W2.K, 0, D.p3[i] | 0, D.p4[i], D.pA[i]) : kind === 1 ? wingUV(W2.K, 1, D.p3[i] | 0, D.p4[i], 0) : wingUV(W2.K, 2, 0, D.p4[i], 0);
          const bil = kind === 0 ? 0.03 * Math.sin(Math.PI * D.p4[i]) * (0.55 + 0.45 * Math.sin(t * 2.2 + D.pA[i] * 3)) * ch.wing.spread : 0, lv = kind === 2 ? 0.009 : 0;
          x = W2.R[0] + W2.U[0] * uv[0] + W2.V[0] * (uv[1] + lv) + W2.N[0] * bil; y = W2.R[1] + W2.U[1] * uv[0] + W2.V[1] * (uv[1] + lv) + W2.N[1] * bil; z = W2.R[2] + W2.U[2] * uv[0] + W2.V[2] * (uv[1] + lv) + W2.N[2] * bil;
          nz = 0.7; const oc = occT(x, y, z); a *= 1 - 0.85 * oc;
          if (kind === 0) { const ed = smooth(0.55, 1, D.p4[i]); br = MAT.wingM[0] * (0.8 + 0.5 * ed); bg = MAT.wingM[1] * (0.8 + 0.9 * ed); bb = MAT.wingM[2] * (0.8 + 0.5 * ed); a *= 0.7 + 0.3 * Math.abs(W2.N[2]); }
          else if (kind === 1) { const rm = 0.5 + 0.5 * Math.sin(D.p4[i] * 9 + t * 1.3); br = MAT.wingBone[0] + 0.25 * rm; bg = MAT.wingBone[1] + 0.05 * rm; bb = MAT.wingBone[2] + 0.18 * rm; }
          else if (kind === 2) { const alt = (i % 2) ? 1 : 0.5; br = MAT.scale[0] * alt + 0.15; bg = MAT.scale[1] * alt; bb = MAT.scale[2] * alt + 0.1; }
        } else if (sub === 22) { // veias de glitch: pulso subindo da tatuagem até a nuca; mais rápido com a carga emocional
          const q = D.p1[i], pw = Math.pow(0.5 + 0.5 * Math.sin(q * 26 - t * veinW), 6);
          br = lerp(br * 0.45, 1.5, pw); bg = lerp(bg * 0.45, 0.55, pw); bb = lerp(bb * 0.45, 1.3, pw); a *= 0.4 + 0.6 * pw;
          if (hash1(Math.floor(t * 12) * 0.71 + i * 0.37) < 0.05 + 0.2 * charge) { br = PAL.glitch[0] * 1.3; bg = PAL.glitch[1] * 1.3; bb = PAL.glitch[2] * 1.3; glitch = 0.4; }
          if (D.ry[i] > JK.hem - 0.012 && D.rz[i] < 0.02) a *= 1 - 0.93 * jw;
          a *= smooth(1.49, 1.4, D.ry[i]);
        } else if (sub === 23) { br = pendC[0]; bg = pendC[1]; bb = pendC[2]; }   // pingente: cor como estado
        else if (sub === 24) { const u = D.p1[i]; a *= lerp(0.2, 1, smooth(0.3, 0.55, u)); if (Math.abs(nz) < 0.3 && u > 0.3) { br = MAT.hornA[0] * 0.9 + 0.25; bg = MAT.hornA[1] + 0.04; bb = MAT.hornA[2] + 0.1; a = 0.9; } else if (nz > 0.5) { br *= 1.25; bg *= 1.25; bb *= 1.25; } }   // chifre: base escondida nos cachos, borda preta
        if (it === 3) { // costura: a dissolução só a deixa mais evidente
          const u = D.pA[i], ru = ROLL_U[ASYM_S], ev = smooth(0, 0.45, dis[ASYM_S === 'R' ? 4 : 3]);
          br = lerp(br, PAL.glitch[0] * 1.3, ev); bg = lerp(bg, PAL.glitch[1] * 1.3, ev); bb = lerp(bb, 0.9, ev);
          a *= (1 + ev * 0.8) * (1 - jw * smooth(ru + 0.03, ru - 0.01, u));
        }
        if (!dyn) a *= lerp(0.13, 1, smooth(-0.42, 0.05, nz));   // o que fica do outro lado do corpo quase some
        const front2 = smooth(-0.3, 0.7, nz), lit2 = 0.45 + 0.55 * front2, rim2 = Math.pow(1 - Math.abs(nz), 3);
        r = br * lit2 + MAT.rim[0] * rim2 * 0.22; g = bg * lit2 + MAT.rim[1] * rim2 * 0.22; b = bb * lit2 + MAT.rim[2] * rim2 * 0.22;
        if (D.spark[i]) { const tw = Math.pow(Math.max(0, Math.sin(t * 4.3 + sd * 80)), 6); r += 1.1 * tw; g += 0.95 * tw; b += 1.1 * tw; a = Math.min(1, a + 0.4 * tw); size *= 1 + 0.8 * tw; }   // brilho das joias
        if (port) a *= smooth(1.12, 1.3, D.ry[i]);
        k = dyn ? 0.92 : 0.95; if (shape !== INK) shape = D.shape[i];
      } else {
        // pool: orbe, props (banco/pilar/borda/janela) e aura
        const kind = D.p1[i], an = D.j1[i];
        let axp = S.x[an] + D.rx[i] * 0.16 * (0.4 + D.p3[i]), ayp = S.y[an] + D.ry[i] * 0.16 * (0.4 + D.p3[i]) + 0.05 * Math.sin(t * 0.7 + sd * 30), azp = S.z[an] + D.rz[i] * 0.12;
        axp += 0.05 * Math.sin(t * 0.5 + sd * 17); x = axp; y = ayp; z = azp;
        const cc = CYCLE[(sd * 3) | 0]; r = cc[0] * 0.8; g = cc[1] * 0.8; b = cc[2] * 0.8; a = 0.12 + 0.16 * D.p4[i]; k = 0.05; turb = 0.6; size = 0.4 + 0.32 * D.p4[i]; shape = 0;
        if (kind === 3) { // marca de beijo: batom na tela onde ela tocou; depois quebra em estilhaços (o mesmo rastro do cabelo)
          const KS = ch.kiss, age = t - KS.t0;
          if (age >= 0 && age < 4.6) {
            const q = D.p2[i] / Math.max(1, this.nKiss), Wk = 0.05 * KS.sc, form = smooth(0, 0.3, age), brk = smooth(3.2, 4.5, age);
            let lx, ly;
            if (q < 0.32) [lx, ly] = lipsXY(q / 0.32, true); else if (q < 0.62) [lx, ly] = lipsXY((q - 0.32) / 0.3, false);
            else { const fx = D.rx[i] * 0.92, uq = fx * 0.5 + 0.5, fy = Math.abs(D.ry[i]); lx = fx; ly = D.ry[i] > 0 ? lerp(0.035, lipsXY(uq, true)[1], fy) : lerp(-0.04, lipsXY(uq, false)[1], fy); }
            // a marca fica no vidro (mais perto da câmera); reprojeta para cair exatamente sobre a boca na tela
            const cam = eng.cam, sc2 = KS.mz !== undefined ? (5 - KS.pos[2]) / (5 - KS.mz) : 1, ax = cam.x + (KS.pos[0] - cam.x) * sc2, ay = cam.y + (KS.pos[1] - cam.y) * sc2;
            let px = ax + lx * Wk * sc2, py = ay + ly * Wk * sc2, pz = KS.pos[2];
            py -= brk * brk * (0.22 + 0.35 * D.p3[i]); px += (D.p4[i] - 0.5) * 0.1 * brk;
            x = lerp(x, px, form); y = lerp(y, py, form); z = lerp(z, pz, form);
            r = lerp(r, MAT.lipstick[0], form); g = lerp(g, MAT.lipstick[1], form); b = lerp(b, MAT.lipstick[2], form);
            a = lerp(a, (q < 0.62 ? 1 : 0.7) * (1 - brk * 0.9), form); k = lerp(k, 0.9 * (1 - brk) + 0.06, form); turb = lerp(turb, 0.02 + 0.35 * brk, form); size = lerp(size, q < 0.62 ? 0.7 : 0.95, form);
            if (brk > 0.05) { glitch = 0.5 * brk; shape = 3; S.rot[i] = 1.45 + (D.p4[i] - 0.5) * 0.4; }
          }
        }
        if (kind === 1) {
          const idx = D.p2[i], q = idx / Math.max(1, this.nProp), rr = D.p3[i];
          const holo = (w, px, py, pz, al) => { x = lerp(x, px, w); y = lerp(y, py, w); z = lerp(z, pz, w); r = lerp(r, PAL.holo[0], w); g = lerp(g, PAL.holo[1], w); b = lerp(b, PAL.holo[2], w); a = lerp(a, al, w); k = lerp(k, 0.8, w); turb = lerp(turb, 0.02, w); size = lerp(size, 0.72, w); glitch = Math.max(glitch, 0.08 * w); };
          const yawed = (lx, lz) => [rootP[0] + cyw * lx + syw * lz, rootP[2] - syw * lx + cyw * lz];
          if (pb > 0.01) { // banco holográfico
            const e = Math.floor(q * 12), f2 = fract(q * 12), hw = 0.30, hh = 0.44, hd = 0.21;
            const E = [[-1, 1, -1, 1, 1, -1], [-1, 1, 1, 1, 1, 1], [-1, 1, -1, -1, 1, 1], [1, 1, -1, 1, 1, 1], [-1, 0, -1, 1, 0, -1], [-1, 0, 1, 1, 0, 1], [-1, 0, -1, -1, 0, 1], [1, 0, -1, 1, 0, 1], [-1, 0, -1, -1, 1, -1], [1, 0, -1, 1, 1, -1], [-1, 0, 1, -1, 1, 1], [1, 0, 1, 1, 1, 1]][e];
            let lx = lerp(E[0], E[3], f2) * hw, ly = lerp(E[1], E[4], f2) * hh, lz = lerp(E[2], E[5], f2) * hd + 0.07;
            if (rr < 0.3) { lx = (D.rx[i]) * hw; lz = D.rz[i] * hd + 0.07; ly = hh; }
            const [bx, bz] = yawed(lx, lz); holo(pb, bx, ly, bz, rr < 0.3 ? 0.28 : 0.75);
          }
          if (pwl > 0.01) { // pilar holográfico (para encostar)
            const cxp = -0.39, hw = 0.075, hd = 0.085, H2 = 2.05;
            let wx, wy, wz;
            if (q < 0.5) { const e = Math.floor(q * 8), f3 = fract(q * 8); wx = cxp + (e & 1 ? hw : -hw); wz = e & 2 ? hd : -hd; wy = f3 * H2; if (e >= 4) { wx = cxp + (e & 1 ? hw : -hw) * 0.55; wz = hd; } }
            else { const q2 = (q - 0.5) / 0.5, ring = Math.floor(q2 * 9), f3 = fract(q2 * 9) * 4, sd2 = Math.floor(f3), f4 = f3 - sd2;
              wy = (ring + 0.5) / 9 * H2 + 0.04 * Math.sin(t * 0.8 + ring);
              const cs = [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]][sd2]; wx = cxp + lerp(cs[0], cs[2], f4) * hw; wz = lerp(cs[1], cs[3], f4) * hd; }
            if (rr < 0.22) { wx = cxp + D.rx[i] * hw; wy = (D.ry[i] * 0.5 + 0.5) * H2; wz = hd; }
            holo(pwl, wx, wy, wz, rr < 0.25 ? 0.25 : 0.6);
          }
          if (pbar > 0.01) { // moldura de janela: ela se pendura pela travessa de cima
            const by = 1.875, bz = -0.035, hw = 0.52; let wx, wy, wz, al = 0.72;
            if (q < 0.55) { const e = Math.floor(q / 0.55 * 4), f3 = fract(q / 0.55 * 4); wx = lerp(-hw - 0.04, hw + 0.04, f3); wy = by + (e & 1 ? 0.022 : -0.022); wz = bz + (e & 2 ? 0.02 : -0.02); }
            else if (q < 0.9) { const q2 = (q - 0.55) / 0.35, e = q2 < 0.5 ? -1 : 1, f3 = fract(q2 * 2); wx = e * hw + (f3 * 7 % 1 < 0.5 ? -0.012 : 0.012); wy = by - f3 * 1.0; wz = bz; al = 0.5 * (1 - f3 * 0.6); }
            else { wx = D.rx[i] * hw; wy = by - (D.ry[i] * 0.5 + 0.5) * 0.9; wz = bz - 0.01; al = 0.12; }
            holo(pbar, wx + rootP[0] * 0.0, wy, wz, al);
          }
          if (pled > 0.01) { // borda alta (parapeito), sem apoio pros pés
            const top = 0.995, zf = 0.115, zb = -0.33, hw = 0.6; let lx, ly, lz, al = 0.7;
            if (q < 0.22) { lx = lerp(-hw, hw, q / 0.22); ly = top; lz = zf; al = 0.9; }
            else if (q < 0.3) { lx = lerp(-hw, hw, (q - 0.22) / 0.08); ly = top; lz = zb; al = 0.4; }
            else if (q < 0.42) { lx = D.rx[i] * hw; ly = top; lz = lerp(zb, zf, D.ry[i] * 0.5 + 0.5); al = 0.2; }
            else if (q < 0.72) { const q2 = (q - 0.42) / 0.3, row = Math.floor(q2 * 6), f3 = fract(q2 * 6); lx = lerp(-hw, hw, f3); ly = top * (1 - (row + 1) / 7); lz = zf; al = 0.5 - row * 0.045; }
            else if (q < 0.9) { const q2 = (q - 0.72) / 0.18, e = q2 < 0.5 ? -1 : 1, f3 = fract(q2 * 2); lx = e * hw; ly = top * (1 - f3); lz = zf; al = 0.7; }
            else { lx = lerp(-hw, hw, (q - 0.9) / 0.1); ly = 0.01; lz = zf; al = 0.45; }
            const [bx, bz] = yawed(lx, lz); holo(pled, bx, ly, bz, al);
          }
        } else if (kind === 0 && po > 0.01) { // orbe que ela tenta tocar
          const q = D.p2[i] / Math.max(1, this.nOrb), ring = D.p3[i] < 0.7, ang = q * TAU * 3 + t * 1.4;
          const rad = ring ? 0.06 + 0.012 * Math.sin(t * 3) : 0.022 * D.p4[i];
          const ox = Math.cos(ang) * rad, oy = Math.sin(ang) * rad, oz = ring ? Math.sin(ang * 0.5) * 0.02 : Math.sin(ang) * rad;
          x = lerp(x, orb.x + ox, po); y = lerp(y, orb.y + oy, po); z = lerp(z, orb.z + oz, po);
          const gl2 = 1 + orb.glow * 1.5;
          r = lerp(r, PAL.cyan[0] * gl2, po); g = lerp(g, PAL.cyan[1] * gl2, po); b = lerp(b, PAL.cyan[2] * gl2, po); a = lerp(a, 0.9, po); k = lerp(k, 0.9, po); turb = lerp(turb, 0.02, po); size = lerp(size, ring ? 0.7 : 1.0, po);
        }
      }

      // ---------- dissolução: preso ao corpo → glitch → enxame livre (roupa e acessórios juntos) ----------
      const part = D.part[i];
      if (part >= 0) {
        const d = dis[part];
        if (d > 0.001) {
          const dd = d * 1.18, h = D.hthr[i];
          const gq = smooth(h - 0.2, h, dd), fq = smooth(h, h + 0.13, dd);
          if (gq > 0) { glitch = Math.max(glitch, gq * (1 - fq * 0.55)); const m = gq * 0.75 * (1 - fq * 0.4); r = lerp(r, PAL.glitch[0] * 1.2, m); g = lerp(g, PAL.glitch[1] * 1.2, m); b = lerp(b, PAL.glitch[2] * 1.2, m); a = Math.max(a, 0.5 * gq * (ty === 4 ? iw : 1)); }
          if (fq > 0) {
            const A0 = anc[part];
            let sx, sy, sz, sk2 = 0.5, st2 = 0.25;
            const dist = clamp(1 - (h - 0.0) / 0.88, 0, 1);
            if (ch.swarm === 'reach') {
              const G = glA.goal, gx2 = G[0] - A0[0], gy2 = G[1] - A0[1], gz2 = G[2] - A0[2], gl = Math.hypot(gx2, gy2, gz2) + 1e-4, maxL = 2.1;
              const ext = glA.ext * Math.min(1, maxL / gl), Ex = A0[0] + gx2 * ext, Ey = A0[1] + gy2 * ext, Ez = A0[2] + gz2 * ext;
              const px2 = -gy2 / gl, py2 = gx2 / gl, bend = 0.22 * Math.sin(t * 0.9 + part * 1.7) * Math.min(1, gl);
              const C1x = (A0[0] + Ex) / 2 + px2 * bend, C1y = (A0[1] + Ey) / 2 + py2 * bend + 0.12, C1z = (A0[2] + Ez) / 2 + 0.1;
              if (dist < 0.8) {
                const s = dist / 0.8 + 0.025 * Math.sin(t * 3 + sd * 20), u1 = 1 - s;
                sx = u1 * u1 * A0[0] + 2 * u1 * s * C1x + s * s * Ex; sy = u1 * u1 * A0[1] + 2 * u1 * s * C1y + s * s * Ey; sz = u1 * u1 * A0[2] + 2 * u1 * s * C1z + s * s * Ez;
                const rad = (0.032 * (1 - 0.55 * s) + 0.008) * (1 + 0.3 * Math.sin(t * 5 - s * 12)), an2 = sd * TAU * 7 + t * 2.4;
                sx += px2 * Math.cos(an2) * rad; sy += py2 * Math.cos(an2) * rad; sz += Math.sin(an2) * rad;
              } else {
                const fi = Math.floor(D.seed[i] * 5), q = (dist - 0.8) / 0.2, ang = Math.atan2(gy2, gx2) + (fi - 2) * 0.34 * (0.7 + 0.3 * Math.sin(t * 2.2)), len = q * 0.13;
                sx = Ex - gx2 / gl * 0.06 + Math.cos(ang) * len; sy = Ey - gy2 / gl * 0.06 + Math.sin(ang) * len; sz = Ez + (sd - 0.5) * 0.03;
              }
              sk2 = 0.62; st2 = 0.12;
              const tip = smooth(0.75, 1, dist);
              r = lerp(r, lerp(PAL.violet[0], PAL.cyan[0] * 1.3, tip), fq * 0.8); g = lerp(g, lerp(PAL.violet[1], PAL.cyan[1] * 1.3, tip), fq * 0.8); b = lerp(b, lerp(PAL.violet[2], PAL.cyan[2] * 1.3, tip), fq * 0.8);
            } else if (ch.swarm === 'orbit') {
              const R = 0.42 + sd * 0.42, inc = (D.seed[i] * 7 % 1 - 0.5) * 0.9 + part * 0.4, ang = sd * TAU * 13 + t * (0.75 / R) * (part % 2 ? 1 : -1);
              sx = chest[0] + Math.cos(ang) * R; sy = chest[1] - 0.15 + Math.sin(ang) * R * Math.sin(inc) * 0.5 + Math.sin(t + sd * 9) * 0.02; sz = chest[2] + Math.sin(ang) * R * Math.cos(inc);
              sk2 = 0.45; st2 = 0.15;
              r = lerp(r, PAL.magenta[0], fq * 0.5); g = lerp(g, PAL.magenta[1], fq * 0.5); b = lerp(b, PAL.magenta[2], fq * 0.5);
            } else {
              const ox = Math.sin(sd * 91.7), oy = Math.sin(sd * 57.3), oz = Math.sin(sd * 33.1);
              sx = x + ox * 0.22 + Math.sin(t * 0.4 + sd * 20) * 0.08; sy = y + oy * 0.15 + 0.14 + Math.sin(t * 0.5 + sd * 13) * 0.08; sz = z + oz * 0.2;
              sk2 = 0.1; st2 = 0.7;
              r = lerp(r, PAL.violet[0], fq * 0.5); g = lerp(g, PAL.violet[1], fq * 0.5); b = lerp(b, PAL.violet[2], fq * 0.5);
            }
            x = lerp(x, sx, fq); y = lerp(y, sy, fq); z = lerp(z, sz, fq); k = lerp(k, sk2, fq); turb = lerp(turb, st2, fq);
            a = lerp(a, 0.75 * (ty === 4 ? Math.min(1, iw * 1.4) : 1), fq); shape = fq > 0.5 ? 1 : shape; size = lerp(size, 0.9, fq);
          }
        }
      }
      // peça desligada: o slot volta ao pool (aura) — nunca some da contagem
      if (ty === 4 && iw < 0.999) {
        const an = D.aan[i], ax2 = S.x[an] + D.aox[i] * 0.3, ay2 = S.y[an] + D.aoy[i] * 0.3 + 0.05 * Math.sin(t * 0.7 + sd * 30), az2 = S.z[an] + D.aoz[i] * 0.24;
        const cc = CYCLE[(sd * 3) | 0];
        x = lerp(ax2, x, iw); y = lerp(ay2, y, iw); z = lerp(az2, z, iw); r = lerp(cc[0] * 0.8, r, iw); g = lerp(cc[1] * 0.8, g, iw); b = lerp(cc[2] * 0.8, b, iw);
        a = lerp(0.22 + 0.2 * sd, a, iw); k = lerp(0.05, k, iw); turb = lerp(0.6, turb, iw); size = lerp(0.5, size, iw);
        glitch = Math.max(glitch, 4 * iw * (1 - iw) * 0.4); if (iw < 0.5 && shape >= 8) shape = 0;
      }
      S.x[i] = x; S.y[i] = y; S.z[i] = z; S.r[i] = r; S.g[i] = g; S.b[i] = b; S.a[i] = a; S.size[i] = size; S.k[i] = k; S.turb[i] = turb; S.glitch[i] = glitch; S.shape[i] = shape;
    }
    // luz ambiente atrás da figura + poça no chão
    const [fx, fy] = eng.toScreen(chest[0], chest[1] - (port ? 0 : 0.15), chest[2]);
    eng.focus.x = fx / eng.view.W; eng.focus.y = 1 - fy / eng.view.H;
    if (!port) { const [gx3, gy3] = eng.toScreen(rootP[0], 0.0, 0); eng.floor.x = gx3 / eng.view.W; eng.floor.y = 1 - gy3 / eng.view.H; eng.floor.w = 0.22; eng.floor.s = 1; }
    else eng.floor.s = 0;
  }
}
