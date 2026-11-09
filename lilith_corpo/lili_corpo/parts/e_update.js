  update(eng, t, dt) {
    eng.char.headKT = this.mode === 'compact' ? COMPACT.headK : 1;
    { const r = eng.char.joint('root'); this.persp = this.mode === 'compact' ? [r[0] - eng.camX(), 0.85 - eng.camY()] : null; } HEADK = eng.char.headK || 1; const IK2 = 1 / (HEADK * HEADK);
    const S = eng.S, D = this.D, ch = eng.char, JR = ch.JR, JP = ch.JP, n = this.n, port = this.mode === 'portrait';
    const F = ch.face, dis = ch.dis, IT = ch.items;
    const jw = IT.jaqueta.w, sw = IT.camisa.w, shw = IT.short.w, mw = IT.meias.w, bw = IT.coturnos.w, fw = IT.fone.w, nw = IT.bloco.w;
    const itemW = [fw, bw, nw, 1, jw, mw, shw, sw, IT.piercing.w, IT.choker.w, IT.liga.w, IT.corrente.w, IT.chifres.w, IT.cauda.w, IT.asas.w * ch.wing.m, IT.unhas.w, IT.tatuagem.w, 1];
    this.itemW = itemW; const MA = meshTick(this, eng, t, dt), MW = this.meshW;   // malha: quietude e presença por parte
    const hi = JI.head, ho = hi * 9, H = JR.subarray(ho, ho + 9), hpx = JP[hi * 3], hpy = JP[hi * 3 + 1], hpz = JP[hi * 3 + 2];
    const glA = ch.reach;
    const anc = PART_ANCHOR.map(nm => ch.joint(nm));
    const chest = ch.joint('chest');
    // parâmetros do rosto
    const EX = 0.034, EY = -0.004, EW = 0.0216, IR = 0.0098;
    const eyeO = [Math.max(0, F.eyeL * ch.blinkL), Math.max(0, F.eyeR * ch.blinkR)];
    const mHalf = 0.0175 * F.width * (1 - 0.35 * F.round), mUp = 0.0011 + Math.max(0, F.open) * 0.0052 + F.round * 0.003, mDn = 0.0011 + Math.max(0, F.open) * 0.024 + F.round * 0.004;
    this.faceU = [mHalf, mDn, smooth(0.02, 0.2, F.open + F.round * 0.3)];
    const gx = clamp(F.gazeX, -1, 1) * 0.0062, gy = clamp(F.gazeY, -1, 1) * 0.0042;
    // referencial do peito (cabelo que cai nas costas, oclusão do fone)
    const ci = JI.chest, CR = JR.subarray(ci * 9, ci * 9 + 9), cpx = JP[ci * 3], cpy = JP[ci * 3 + 1], cpz = JP[ci * 3 + 2], crx = JREST[ci * 3], cry = JREST[ci * 3 + 1], crz = JREST[ci * 3 + 2];
    // velocidade do tornozelo do lado dela (cadarço solto)
    { const ai = JI['an' + ASYM_S], ap = [JP[ai * 3], JP[ai * 3 + 1], JP[ai * 3 + 2]]; if (this.ankPrev && dt > 0) for (let k = 0; k < 3; k++) this.ankV[k] += ((ap[k] - this.ankPrev[k]) / dt - this.ankV[k]) * Math.min(1, dt * 8); this.ankPrev = ap; }
    const ankX = (() => { const ai = JI['an' + ASYM_S] * 9; return [JR[ai], JR[ai + 3], JR[ai + 6]]; })();
    // estilhaços do cabelo: mais frequentes quando ela está fixada em algo
    this.shedPh += dt * (0.16 + 0.26 * ch.curious);
    /* cabelo: linha central de cada mecha (uma vez por quadro). Trecho 1 colado no couro cabeludo (gira com a cabeça);
       trecho 2 cai pelo ombro/costas (preso ao peito), com balanço, inércia e sem atravessar o corpo */
    const nS = this.strands.length, M = this.M, SP = this.strandPts, SE = this.strandFrame, hv = ch.headVel, hf = ch.hairFloat;
    const hX = [H[0], H[3], H[6]], hZ = [H[2], H[5], H[8]], tpr = [0, 0, 0];
    const lgx = clamp(hv[0], -3, 3), lgy = clamp(hv[1], -3, 3), lgz = clamp(hv[2], -3, 3), grav = smooth(0.55, -0.35, CR[4]);
    const P0 = [0, 0, 0], P1 = [0, 0, 0], P2 = [0, 0, 0], P3 = [0, 0, 0];
    const toWorldC = (p, o) => { const ax = p[0] - crx, ay = p[1] - cry, az = p[2] - crz; o[0] = cpx + CR[0] * ax + CR[1] * ay + CR[2] * az; o[1] = cpy + CR[3] * ax + CR[4] * ay + CR[5] * az; o[2] = cpz + CR[6] * ax + CR[7] * ay + CR[8] * az; };
    for (let k = 0; k < nS; k++) {
      const st = this.strands[k], base = k * M * 3;
      if (st.kind === 0) {
        const mA = Math.round(st.sA * (M - 1));
        for (let m = 0; m <= mA; m++) {
          const q = m / mA, dx = lerp(st.d0[0], st.dE[0], q), dy = lerp(st.d0[1], st.dE[1], q), dz = lerp(st.d0[2], st.dE[2], q), dl = Math.hypot(dx, dy, dz);
          const kk = lerp(st.k0, st.kE, Math.pow(q, 0.8)) + st.crown * Math.sin(q * Math.PI), u = HC[0] + dx / dl * HRAD[0] * kk, v = HC[1] + dy / dl * HRAD[1] * kk, w = HC[2] + dz / dl * HRAD[2] * kk, o = base + m * 3;
          SP[o] = hpx + H[0] * u + H[1] * v + H[2] * w; SP[o + 1] = hpy + H[3] * u + H[4] * v + H[5] * w; SP[o + 2] = hpz + H[6] * u + H[7] * v + H[8] * w;
        }
        const oE = base + mA * 3, oP = oE - 3; P0[0] = SP[oE]; P0[1] = SP[oE + 1]; P0[2] = SP[oE + 2];
        let tx = SP[oE] - SP[oP], ty = SP[oE + 1] - SP[oP + 1], tz = SP[oE + 2] - SP[oP + 2]; const tl = Math.hypot(tx, ty, tz) + 1e-6; tx /= tl; ty /= tl; tz /= tl;
        let ox = P0[0] - hpx, oz = P0[2] - hpz; const ol = Math.hypot(ox, oz) + 1e-6; ox /= ol; oz /= ol;
        P1[0] = P0[0] + tx * 0.045 + ox * 0.03; P1[1] = P0[1] + ty * 0.045 - 0.035; P1[2] = P0[2] + tz * 0.045 + oz * 0.03;
        toWorldC(st.W1, P2); toWorldC(st.W2, P3);
        const s1 = Math.sin(t * 0.8 + st.sway), s2 = Math.cos(t * 0.67 + st.sway * 1.3);
        P2[0] += s1 * 0.006 - lgx * 0.035; P2[1] -= lgy * 0.02; P2[2] += s2 * 0.005 - lgz * 0.035;
        P3[0] += s1 * 0.014 - lgx * 0.08; P3[1] -= lgy * 0.05; P3[2] += s2 * 0.012 - lgz * 0.08;
        if (grav > 0.001) { // corpo virado (pendurada, deitada): o cabelo cai pela gravidade, não acompanha o peito
          P2[0] = lerp(P2[0], P0[0] + ox * 0.1, grav); P2[1] = lerp(P2[1], P0[1] - 0.12, grav); P2[2] = lerp(P2[2], P0[2] + oz * 0.1, grav);
          P3[0] = lerp(P3[0], P0[0] + ox * 0.13 + s1 * 0.02, grav); P3[1] = lerp(P3[1], P0[1] - st.Lf - 0.08, grav); P3[2] = lerp(P3[2], P0[2] + oz * 0.13 + s2 * 0.02, grav);
        }
        if (hf > 0.001) { // flutuando: os cachos se abrem como uma coroa
          const f3y = 0.12 + 0.07 * Math.sin(t * 0.9 + st.ph);
          P2[0] = lerp(P2[0], P0[0] + ox * 0.14, hf); P2[1] = lerp(P2[1], P0[1] + 0.05, hf); P2[2] = lerp(P2[2], P0[2] + oz * 0.14, hf);
          P3[0] = lerp(P3[0], P0[0] + ox * 0.3, hf); P3[1] = lerp(P3[1], P0[1] + f3y, hf); P3[2] = lerp(P3[2], P0[2] + oz * 0.3, hf);
        }
        for (let m = mA + 1; m < M; m++) {
          const q = (m - mA) / (M - 1 - mA), u1 = 1 - q, b0 = u1 * u1 * u1, b1 = 3 * u1 * u1 * q, b2 = 3 * u1 * q * q, b3 = q * q * q;
          let x = b0 * P0[0] + b1 * P1[0] + b2 * P2[0] + b3 * P3[0], y = b0 * P0[1] + b1 * P1[1] + b2 * P2[1] + b3 * P3[1], z = b0 * P0[2] + b1 * P1[2] + b2 * P2[2] + b3 * P3[2];
          { // não atravessa o tronco
            const px = x - cpx, py = y - cpy, pz = z - cpz, lx = CR[0] * px + CR[3] * py + CR[6] * pz + crx, ly = CR[1] * px + CR[4] * py + CR[7] * pz + cry, lz = CR[2] * px + CR[5] * py + CR[8] * pz + crz;
            if (ly > 0.8 && ly < 1.47) { torsoFast(ly, tpr); const rx = tpr[0] + 0.036, rz = tpr[1] + 0.042, ex = lx / rx, ez = (lz - tpr[2]) / rz, r2 = ex * ex + ez * ez;
              if (r2 < 1) { const sc = 1 / Math.sqrt(r2 + 1e-6) - 1, dlx = lx * sc, dlz = (lz - tpr[2]) * sc; x += CR[0] * dlx + CR[2] * dlz; y += CR[3] * dlx + CR[5] * dlz; z += CR[6] * dlx + CR[8] * dlz; } }
          }
          { // nem a cabeça
            const qx = x - hpx, qy = y - hpy, qz = z - hpz, R0 = HRAD[0] * 1.14, R1 = HRAD[1] * 1.08, R2 = HRAD[2] * 1.14;
            const hlx = ((H[0] * qx + H[3] * qy + H[6] * qz) * IK2 - HC[0]) / R0, hly = ((H[1] * qx + H[4] * qy + H[7] * qz) * IK2 - HC[1]) / R1, hlz = ((H[2] * qx + H[5] * qy + H[8] * qz) * IK2 - HC[2]) / R2, r2 = hlx * hlx + hly * hly + hlz * hlz;
            if (r2 < 1) { const sc = 1 / Math.sqrt(r2 + 1e-6) - 1, a1 = hlx * sc * R0, a2 = hly * sc * R1, a3 = hlz * sc * R2; x += H[0] * a1 + H[1] * a2 + H[2] * a3; y += H[3] * a1 + H[4] * a2 + H[5] * a3; z += H[6] * a1 + H[7] * a2 + H[8] * a3; }
          }
          if (y < 0.012) y = 0.012;   // pousa no chão, não atravessa
          const o = base + m * 3; SP[o] = x; SP[o + 1] = y; SP[o + 2] = z;
        }
      } else { // franja cortina: no rosto, em coordenadas da cabeça
        for (let m = 0; m < M; m++) {
          const q = m / (M - 1), u1 = 1 - q, lw2 = st.fall ? ch.lockW : 0;   // a mecha que cai no olho de vez em quando
          const b1u = lerp(st.b1[0], st.b1[0] * 0.75, lw2), b1v = lerp(st.b1[1], st.b1[1] - 0.012, lw2), b2u = lerp(st.b2[0], Math.sign(st.b2[0]) * (EX + (st.fall - 2) * 0.011), lw2), b2v = lerp(st.b2[1], EY - 0.018 - 0.004 * st.fall, lw2);
          const u = u1 * u1 * st.b0[0] + 2 * u1 * q * b1u + q * q * b2u, v = u1 * u1 * st.b0[1] + 2 * u1 * q * b1v + q * q * b2v;
          const lz = HC[2] + headZ(u * 0.97, v) + 0.011 + 0.008 * Math.sin(q * Math.PI), lv = HC[1] + v, o = base + m * 3, wv = Math.sin(t * 1.3 + st.ph + q * 3) * 0.003 * q;
          SP[o] = hpx + H[0] * u + H[1] * lv + H[2] * lz + hX[0] * wv; SP[o + 1] = hpy + H[3] * u + H[4] * lv + H[5] * lz + hX[1] * wv; SP[o + 2] = hpz + H[6] * u + H[7] * lv + H[8] * lz + hX[2] * wv;
        }
      }
      // referencial (e1, e2) de cada amostra: os cachos enrolam em volta da linha central
      for (let m = 0; m < M; m++) {
        const a = base + Math.max(0, m - 1) * 3, b = base + Math.min(M - 1, m + 1) * 3;
        let tx = SP[b] - SP[a], ty = SP[b + 1] - SP[a + 1], tz = SP[b + 2] - SP[a + 2]; const tl = Math.hypot(tx, ty, tz) + 1e-9; tx /= tl; ty /= tl; tz /= tl;
        let e1x = ty * hZ[2] - tz * hZ[1], e1y = tz * hZ[0] - tx * hZ[2], e1z = tx * hZ[1] - ty * hZ[0], el = Math.hypot(e1x, e1y, e1z);
        if (el < 0.2) { e1x = ty * hX[2] - tz * hX[1]; e1y = tz * hX[0] - tx * hX[2]; e1z = tx * hX[1] - ty * hX[0]; el = Math.hypot(e1x, e1y, e1z) + 1e-9; }
        e1x /= el; e1y /= el; e1z /= el;
        const o = (k * M + m) * 6; SE[o] = e1x; SE[o + 1] = e1y; SE[o + 2] = e1z; SE[o + 3] = ty * e1z - tz * e1y; SE[o + 4] = tz * e1x - tx * e1z; SE[o + 5] = tx * e1y - ty * e1x;
      }
    }
    // linhas de borda/contorno só existem com a peça vestida
    { const LW = this.linkW, LI = this.linkItem; for (let k = 0; k < LW.length; k++) { const c = LI[k]; LW[k] = c === 0 || c === 100 ? 1 : itemW[c - 1]; } }
