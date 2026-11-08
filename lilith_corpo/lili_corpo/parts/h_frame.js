    /* cauda: linha central no referencial do quadril, com balanço lento (mais solto quando ela provoca) e onda que corre até a ponta */
    const TMn = 26, TSp = this.tailS || (this.tailS = new Float32Array(TMn * 3)), TFr = this.tailF || (this.tailF = new Float32Array(TMn * 6)), fl = ch.flirt;
    { const ri = JI.root, RR = JR.subarray(ri * 9, ri * 9 + 9), rpx = JP[ri * 3], rpy = JP[ri * 3 + 1], rpz = JP[ri * 3 + 2], tmp = [0, 0, 0], b0 = TAIL_C[0];
      const sw = Math.sin(t * 0.85) * (0.2 + 0.2 * fl) + Math.sin(t * 0.37 + 1) * 0.08;
      for (let m = 0; m < TMn; m++) {
        const s = m / (TMn - 1); crPath(TAIL_C, s, tmp);
        const ang = sw * s * 1.25, ca = Math.cos(ang), sa = Math.sin(ang), dx = tmp[0] - b0[0], dz = tmp[2] - b0[2];
        let lx = b0[0] + dx * ca + dz * sa, ly = tmp[1], lz = b0[2] - dx * sa + dz * ca;
        lx += Math.sin(t * 1.7 - s * 5) * 0.03 * s * (1 + fl); ly += Math.sin(t * 1.25 - s * 4) * 0.014 * s; lz += Math.sin(t * 1.1 - s * 3 + 1) * 0.015 * s;
        let x = rpx + RR[0] * lx + RR[1] * ly + RR[2] * lz, y = rpy + RR[3] * lx + RR[4] * ly + RR[5] * lz, z = rpz + RR[6] * lx + RR[7] * ly + RR[8] * lz;
        if (y < 0.012) y = 0.012;
        TSp[m * 3] = x; TSp[m * 3 + 1] = y; TSp[m * 3 + 2] = z;
      }
      for (let m = 0; m < TMn; m++) {
        const a = Math.max(0, m - 1) * 3, b2 = Math.min(TMn - 1, m + 1) * 3; let tx = TSp[b2] - TSp[a], ty = TSp[b2 + 1] - TSp[a + 1], tz = TSp[b2 + 2] - TSp[a + 2]; const tl = Math.hypot(tx, ty, tz) + 1e-9; tx /= tl; ty /= tl; tz /= tl;
        let e1x = ty, e1y = -tx, e1z = 0, el = Math.hypot(e1x, e1y); if (el < 0.2) { e1x = 0; e1y = tz; e1z = -ty; el = Math.hypot(e1y, e1z) + 1e-9; } e1x /= el; e1y /= el; e1z /= el;
        const o = m * 6; TFr[o] = e1x; TFr[o + 1] = e1y; TFr[o + 2] = e1z; TFr[o + 3] = ty * e1z - tz * e1y; TFr[o + 4] = tz * e1x - tx * e1z; TFr[o + 5] = tx * e1y - ty * e1x;
      }
      // coração da ponta: no plano da tela, "de pé" na direção da cauda
      const L = (TMn - 1) * 3, Lp = (TMn - 3) * 3; let yx = TSp[L] - TSp[Lp], yy = TSp[L + 1] - TSp[Lp + 1], yz = TSp[L + 2] - TSp[Lp + 2]; const yl = Math.hypot(yx, yy, yz) + 1e-9; yx /= yl; yy /= yl; yz /= yl;
      let xx = yy, xy = -yx, xz = 0, xl = Math.hypot(xx, xy) + 1e-9; xx /= xl; xy /= xl;
      this.tailH = [TSp[L] + yx * TAIL.HS * 0.9, TSp[L + 1] + yy * TAIL.HS * 0.9, TSp[L + 2] + yz * TAIL.HS * 0.9, xx, xy, xz, yx, yy, yz];
    }
    /* asas: plano da asa preso às escápulas; abertura e batida vêm do momento (voo, espreguiçar, dança, susto, pendurada) */
    const WGo = this.wingW || (this.wingW = { 1: { K: {} }, [-1]: { K: {} } });
    { const WG = ch.wing;
      for (const sx of [1, -1]) {
        const o = WGo[sx], sw = lerp(1.25, 0.42, smooth(0, 1, WG.spread)), ph = WG.flap * (sx > 0 ? 1 : 1), cph = Math.cos(ph), sph = Math.sin(ph);
        let Ux = sx * Math.cos(sw) * cph, Uy = sph, Uz = -Math.sin(sw) * cph;
        let Vx = -sx * Math.cos(sw) * sph, Vy = cph, Vz = Math.sin(sw) * sph;
        const Nx = Uy * Vz - Uz * Vy, Ny = Uz * Vx - Ux * Vz, Nz = Ux * Vy - Uy * Vx;
        const R0 = WROOT(sx), P = [0, 0, 0]; toWorldC(R0, P);
        const rot = (vx, vy, vz) => [CR[0] * vx + CR[1] * vy + CR[2] * vz, CR[3] * vx + CR[4] * vy + CR[5] * vz, CR[6] * vx + CR[7] * vy + CR[8] * vz];
        o.R = P; o.U = rot(Ux, Uy, Uz); o.V = rot(Vx, Vy, Vz); o.N = rot(Nx, Ny, Nz); wingKeys(WG.spread, o.K);
      }
    }
    // oclusão do tronco para o que fica atrás dele (asas)
    const tprO = [0, 0, 0], occT = (x, y, z) => { const px = x - cpx, py = y - cpy, pz = z - cpz, lx = CR[0] * px + CR[3] * py + CR[6] * pz + crx, ly = CR[1] * px + CR[4] * py + CR[7] * pz + cry, lz = CR[2] * px + CR[5] * py + CR[8] * pz + crz;
      if (ly < 0.8 || ly > 1.5) return 0; torsoFast(Math.min(ly, 1.47), tprO); const rx = tprO[0] * 1.05 + 0.012, rz = tprO[1] * 1.05 + 0.014; return occEllipse2(lx / rx, (lz - tprO[2]) / rz, CR[6] / rx, CR[8] / rz); };
    // carga emocional: flerte, curiosidade, susto → veias pulsam mais rápido
    const charge = Math.min(1, Math.max(fl, ch.curious * 0.55, ch.reaction ? 1 - smooth(0.8, 2.4, t - ch.reaction.t0) : 0, eng.glitchSpike * 0.7)), veinW = 2.4 + 9 * charge;
    // cor como estado (pingente, íris, colo) e nitidez da íris com foco/interesse; pupila vertical dilata junto
    const pendC = modeColor(eng.colorMode, t, [0, 0, 0]), irisC = eng.colorMode === 0 ? [PAL.eye[0] * 0.8, PAL.eye[1] * 1.05, PAL.eye[2] * 1.25] : modeColor(eng.colorMode, t + 0.7, [0, 0, 0]);
    const irisDef = Math.max(0.12, ch.curious, fl), slitW = 0.1 + 0.27 * clamp((F.pupil - 0.55) / 1.0, 0, 1.3);
    const coloP = 0.5 + 0.5 * Math.sin(t * (1.5 + 4.5 * fl)), coloAmp = (0.12 + 0.55 * fl) * (0.4 + 0.6 * coloP * coloP), coloC = modeColor(eng.colorMode, t + 1.3, [0, 0, 0]);
    // insinuação: pedaço de roupa que falha por um instante
    const pkA = t - ch.peek.t0, pk = pkA >= 0 && pkA < 0.3 ? Math.sin(pkA / 0.3 * Math.PI) : 0, pkc = ch.peek.c, pkr = ch.peek.r;
