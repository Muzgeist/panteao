
/* =====================================================================
   MALHA TEXTURIZADA (camada de alta definição por cima das partículas)
   Nasce das MESMAS funções analíticas do corpo (torsoPt, capR, bustB/gluteB, headZ, bootPt…), amostradas
   numa grade regular (altura/comprimento × ângulo); UV = coordenadas da grade. Pesos de osso: a MESMA
   fórmula j1/j2/w2 dos slots. Uma sub-malha por peça, cada uma com a sua textura procedural pequena,
   ligada ao mesmo ITEM_ID que liga/desliga a partícula. Só aparece com ela parada e formada, parte a parte.
   ===================================================================== */
// formas compartilhadas com o construtor de partículas (fonte única)
const neckAtG = (y, ang, off) => { const f = clamp((y - 1.425) / 0.13, 0, 1), cz = lerp(-0.015, 0, f), r = capR(LIMB.neck, f) + off, s2 = Math.sin(ang), c2 = Math.cos(ang); return { p: [r * s2, y, cz + r * c2], n: [s2, 0, c2], k: [JI.neck, JI.chest, smooth(1.5, 1.44, y) * 0.45] }; };
const frontZG = (x, y, off) => { let z = -1; if (y >= 1.44) { const f = clamp((y - 1.425) / 0.13, 0, 1), r = capR(LIMB.neck, f); if (Math.abs(x) < r) z = lerp(-0.015, 0, f) + Math.sqrt(r * r - x * x); } if (y <= 1.47) z = Math.max(z, torsoPt(y, frontAng(y, x)).p[2]); return z + off; };
const hornPathG = (sx, u) => { const hr = restOf('head'), base = norm3([sx * 0.42, 0.86, 0.28]), B = [HC[0] + base[0] * HRAD[0] * 0.98, HC[1] + base[1] * HRAD[1] * 0.98, HC[2] + base[2] * HRAD[2] * 0.98];
  const C1 = [B[0] + base[0] * 0.05, B[1] + base[1] * 0.05 + 0.01, B[2] + base[2] * 0.05], C2 = [C1[0] + sx * 0.012, C1[1] + 0.02, C1[2] - 0.03], T = [C2[0] + sx * 0.007, C2[1] - 0.01, C2[2] - 0.032];
  const v = 1 - u, b0 = v * v * v, b1 = 3 * v * v * u, b2 = 3 * v * u * u, b3 = u * u * u;
  return [hr[0] + b0 * B[0] + b1 * C1[0] + b2 * C2[0] + b3 * T[0], hr[1] + b0 * B[1] + b1 * C1[1] + b2 * C2[1] + b3 * T[1], hr[2] + b0 * B[2] + b1 * C1[2] + b2 * C2[2] + b3 * T[2]]; };
const TPxG = (h, x, off) => { const P = torsoPt(h, frontAng(h, x), off); P.k = torsoSkin(h); return P; };
const TPxG2 = (h, x, off, back) => { const P = torsoPt(h, back ? backAng(h, x) : frontAng(h, x), off); P.k = torsoSkin(h); return P; };
const tframeG = n => { const e1 = norm3(cross3([0, 1, 0], n)), e2 = cross3(n, e1); return [e1, e2]; };
const FACE_C = { EX: 0.034, EY: -0.004 };

/* ---------- ruído procedural (periódico em u para não ter costura nas peças que dão a volta) ---------- */
const mhash = (x, y) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoiseP(x, y, P) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = P ? ((xi % P) + P) % P : xi, x1 = P ? (((xi + 1) % P) + P) % P : xi + 1;
  return lerp(lerp(mhash(x0, yi), mhash(x1, yi), u), lerp(mhash(x0, yi + 1), mhash(x1, yi + 1), u), v); }
const fbmP = (x, y, P) => vnoiseP(x, y, P) * 0.55 + vnoiseP(x * 2 + 0.5, y * 2 + 7.3, P * 2) * 0.3 + vnoiseP(x * 4 + 3.1, y * 4 + 1.7, P * 4) * 0.15;

/* ---------- grades ---------- */
// cápsula idêntica à do construtor (mesmo referencial e1/e2, mesmo raio capR, mesmos pesos), fechada com calotas
function capGrid(A0, B0, LR, j1, jEnd, jStart, o = {}) {
  const ax = B0[0] - A0[0], ay = B0[1] - A0[1], az = B0[2] - A0[2], len = Math.hypot(ax, ay, az), dx = ax / len, dy = ay / len, dz = az / len;
  let e1 = [dy, -dx, 0]; if (Math.hypot(...e1) < 0.2) e1 = [0, dz, -dy];
  e1 = norm3(e1); const e2 = [dy * e1[2] - dz * e1[1], dz * e1[0] - dx * e1[2], dx * e1[1] - dy * e1[0]];
  const v0 = o.v0 ?? 0, v1 = o.v1 ?? 1, r0 = capR(LR, 0), r1 = capR(LR, 1), lo = v0 <= 0 && o.cap0 !== false ? -r0 / len : v0, hi = v1 >= 1 && o.cap1 !== false ? 1 + r1 / len : v1;
  const off = o.off || (() => 0);
  return { nu: o.nu || 28, nv: o.nv || 30, uv: o.uv, fn(u, v) {
    const uu = lerp(lo, hi, v), th = u * TAU;
    let rad, ax2 = 0;
    if (uu < 0) { const q = uu * len / r0; rad = r0 * Math.sqrt(Math.max(0, 1 - q * q)); ax2 = q; } else if (uu > 1) { const q = (uu - 1) * len / r1; rad = r1 * Math.sqrt(Math.max(0, 1 - q * q)); ax2 = q; } else rad = capR(LR, uu);
    const c = Math.cos(th), s = Math.sin(th), nr = [e1[0] * c + e2[0] * s, e1[1] * c + e2[1] * s, e1[2] * c + e2[2] * s];
    const n = norm3([nr[0] * (1 - Math.abs(ax2)) + dx * ax2, nr[1] * (1 - Math.abs(ax2)) + dy * ax2, nr[2] * (1 - Math.abs(ax2)) + dz * ax2]);
    const ofs = off(clamp(uu, 0, 1), nr), R = rad + (rad > 1e-5 ? ofs : 0);
    let j2 = -1, w2 = 0;   // mesma regra de peso do construtor
    if (uu > 0.8 && jEnd >= 0) { j2 = jEnd; w2 = smooth(0.8, 1.02, uu) * 0.5; } else if (uu < 0.18 && jStart >= 0) { j2 = jStart; w2 = smooth(0.18, -0.02, uu) * 0.5; }
    return { p: [A0[0] + dx * len * uu + nr[0] * R, A0[1] + dy * len * uu + nr[1] * R, A0[2] + dz * len * uu + nr[2] * R], n, k: [j1, j2, w2], lu: uu, nr };
  } };
}
// tronco: altura × ângulo sobre a mesma superfície das peças
/* pescoço: anel da MESMA cápsula do pescoço (referencial e raio capR) na altura h. O alto do tronco desliza até ele:
   ombro → trapézio → pescoço sem buraco, e os pesos passam do peito para o pescoço junto */
const NECK_F = (() => { const A0 = [0, 1.425, -0.015], B0 = [0, 1.555, 0], ax = B0[0] - A0[0], ay = B0[1] - A0[1], az = B0[2] - A0[2], len = Math.hypot(ax, ay, az); return { A0, d: [ax / len, ay / len, az / len], len }; })();
const NECK_H0 = 1.40, NECK_H1 = 1.462;
function neckRing(h, ang, off) { const { A0, d, len } = NECK_F, v = [Math.sin(ang), 0, Math.cos(ang)], dv = v[0] * d[0] + v[2] * d[2], nr = norm3([v[0] - d[0] * dv, -d[1] * dv, v[2] - d[2] * dv]);
  let u = (h - A0[1]) / (d[1] * len); for (let k = 0; k < 4; k++) { const R = capR(LIMB.neck, clamp(u, 0, 1)) + off; u = (h - A0[1] - nr[1] * R) / (d[1] * len); }
  const R = capR(LIMB.neck, clamp(u, 0, 1)) + off; return { p: [A0[0] + d[0] * len * u + nr[0] * R, A0[1] + d[1] * len * u + nr[1] * R, A0[2] + d[2] * len * u + nr[2] * R], n: nr, u }; }
function torsoNeckPt(h, ang, off) {
  const P = torsoPt(Math.min(h, 1.47), ang, off); P.k = torsoSkin(Math.min(h, 1.47)); if (h <= NECK_H0) return P;
  const w = smooth(NECK_H0, NECK_H1, h), N = neckRing(h, ang, off), cw = N.u < 0.18 ? smooth(0.18, -0.02, N.u) * 0.5 : 0;
  P.p = lerp3(P.p, N.p, w); P.n = norm3(lerp3(P.n, N.n, w)); P.k = [JI.chest, JI.neck, w * (1 - cw)]; return P; }
function torsoGrid(h0, h1, off, o = {}) {
  const a0 = o.a0 ?? -Math.PI, a1 = o.a1 ?? Math.PI, offF = typeof off === 'function' ? off : () => off;
  return { nu: o.nu || 112, nv: o.nv || 80, uv: o.uv, fn(u, v) { const h = lerp(h0, h1, v), ang = lerp(a0, a1, u), P = torsoNeckPt(h, ang, offF(h, ang)); P.h = h; P.ang = ang; P.x0 = torsoAt(h)[0] * Math.sin(ang); return P; } };
}
// fundo do tronco (entre as coxas): fecha a seção de baixo
function torsoCap(off) { return { nu: 48, nv: 6, fn(u, v) { const ang = lerp(-Math.PI, Math.PI, u), h = 0.8, E = torsoPt(h, ang, off), pr = torsoAt(h), f = 1 - v, c = [0, h - 0.004 - off, pr[2]];
  return { p: [lerp(c[0], E.p[0], f), lerp(c[1], E.p[1], f), lerp(c[2], E.p[2], f)], n: [0, -1, 0], k: torsoSkin(h), h, ang, x0: 0 }; } }; }
// tubo em volta de uma curva (chifre, arco do fone, osso de asa, correntes)
function tubeGrid(path, radius, k, o = {}) {
  return { nu: o.nu || 10, nv: o.nv || 24, uv: o.uv, fn(u, v, X) {
    const P = path(v, X), e = 0.01, Pa = path(Math.max(0, v - e), X), Pb = path(Math.min(1, v + e), X), t = norm3([Pb[0] - Pa[0], Pb[1] - Pa[1], Pb[2] - Pa[2]]);
    let e1 = cross3(t, o.up || [0, 0, 1]); if (Math.hypot(...e1) < 0.1) e1 = cross3(t, [1, 0, 0]); e1 = norm3(e1); const e2 = cross3(t, e1);
    const a = u * TAU, c = Math.cos(a), s = Math.sin(a), R = radius(v, X), ry = o.ry ? o.ry(v) : R;
    const n = [e1[0] * c + e2[0] * s, e1[1] * c + e2[1] * s, e1[2] * c + e2[2] * s];
    return { p: [P[0] + e1[0] * c * R + e2[0] * s * ry, P[1] + e1[1] * c * R + e2[1] * s * ry, P[2] + e1[2] * c * R + e2[2] * s * ry], n, k: typeof k === 'function' ? k(v, P) : k };
  } };
}
function sphereGrid(c, r, k, o = {}) { return { nu: o.nu || 12, nv: o.nv || 8, uv: o.uv, fn(u, v) { const la = lerp(-Math.PI / 2, Math.PI / 2, v), a = u * TAU, n = [Math.cos(la) * Math.sin(a), Math.sin(la), Math.cos(la) * Math.cos(a)];
  const sc = o.sc || [1, 1, 1]; return { p: [c[0] + n[0] * r * sc[0], c[1] + n[1] * r * sc[1], c[2] + n[2] * r * sc[2]], n, k }; } }; }
// coração plano com volume (almofada): leque do centro até o contorno
function heartGrid(frame, size, k, side, o = {}) { return { nu: o.nu || 32, nv: o.nv || 5, uv: o.uv, fn(u, v, X) {
  const F = typeof frame === 'function' ? frame(X) : frame, [hx, hy] = heartXY(u), c = F.c, ex = F.ex, ey = F.ey, nz = F.nz, S = (typeof size === 'function' ? size(X) : size) * v, bul = (o.bulge ?? 0.003) * (1 - v * v) * side;
  return { p: [c[0] + ex[0] * hx * S + ey[0] * (hy * S) + nz[0] * bul, c[1] + ex[1] * hx * S + ey[1] * (hy * S) + nz[1] * bul, c[2] + ex[2] * hx * S + ey[2] * (hy * S) + nz[2] * bul], n: side > 0 ? nz : [-nz[0], -nz[1], -nz[2]], k };
} }; }
function quadGrid(c, ea, eb, ha, hb, nrm, k, o = {}) { return { nu: 1, nv: 1, uv: o.uv, fn(u, v) { const a = (u * 2 - 1) * ha, b = (v * 2 - 1) * hb; return { p: [c[0] + ea[0] * a + eb[0] * b, c[1] + ea[1] * a + eb[1] * b, c[2] + ea[2] * a + eb[2] * b], n: nrm, k }; } }; }

/* ---------- pintores de textura (valores em linear; guardados /2 para caber brilho > 1) ---------- */
const skinCol = (y, hand) => { const mm = hand ? 0.8 : 0.2 + 0.7 * smooth(0.3, 1.45, y), c = lerp3(PAL.violet, PAL.magenta, mm); return [c[0] * 0.5, c[1] * 0.42, c[2] * 0.55]; };   // pele: o mesmo violeta→magenta, mais fundo
function skinPaint(su, sv, hand) { return (u, v, get, o) => {
  const P = get(), base = skinCol(P.p[1], hand), n1 = fbmP(u * su, v * sv, su), pore = vnoiseP(u * su * 7, v * sv * 7, su * 7);
  const vn = Math.abs(vnoiseP(u * su * 1.3 + 11, v * sv * 1.3, Math.round(su * 1.3)) - 0.5), vein = smooth(0.03, 0.006, vn) * 0.35;   // veias finas sob a pele
  const k = 0.6 + 0.26 * n1 + 0.12 * (pore - 0.5);
  o[0] = lerp(base[0] * k, PAL.deep[0] * 1.6, vein); o[1] = lerp(base[1] * k, PAL.deep[1] * 1.4, vein); o[2] = lerp(base[2] * k, PAL.deep[2] * 2.2, vein); o[3] = 1; }; }
const leatherBase = (u, v, su, sv) => { const g = vnoiseP(u * su * 9, v * sv * 9, su * 9), cr = Math.abs(vnoiseP(u * su * 2.2, v * sv * 2.2, Math.round(su * 2.2)) - 0.5); const k = 0.72 + 0.45 * g - 0.35 * smooth(0.035, 0.0, cr); return [MAT.leather[0] * k, MAT.leather[1] * k, MAT.leather[2] * k]; };
const twill = (u, v, su, sv) => 0.5 + 0.5 * Math.sin((u * su + v * sv) * TAU);
const SILV = [0.8, 0.8, 0.9];
const set4 = (o, c, a) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = a; };

/* ---------- definições: uma sub-malha por peça (cada uma com SUA textura) ---------- */
const MAT_SKIN = 0, MAT_CLOTH = 1, MAT_LEATHER = 2, MAT_METAL = 3, MAT_VEIN = 4, MAT_MEMB = 5, MAT_HEAD = 6, MAT_DECAL = 7, MAT_EYE = 8, MAT_LIPS = 9, MAT_HAIR = 10;
function meshDefs() {
  const D = [], J = JI, add = d => D.push(Object.assign({ item: -1, part: 0, mat: MAT_SKIN, cls: 'opaque', gloss: 0.15, atest: 0.5, dyn: false, tw: 128, th: 128 }, d));
  const SIDES = [1, -1], sideS = sx => sx > 0 ? 'L' : 'R', partOf = s => s === 'L' ? 3 : 4;
  /* ===== pele (sempre presente, por parte do corpo) ===== */
  add({ id: 'pele.tronco', part: 0, grids: [torsoGrid(0.8, NECK_H1, 0, { nu: 120, nv: 100 }), torsoCap(0)], tw: 512, th: 256, paint: skinPaint(56, 44) });
  add({ id: 'pele.pescoco', part: 1, grids: [capGrid([0, 1.425, -0.015], [0, 1.555, 0.0], LIMB.neck, J.neck, J.head, J.chest, { nu: 28, nv: 14 })], tw: 128, th: 64, paint: skinPaint(14, 8) });
  { const hr = restOf('head');   // cabeça: o mesmo elipsoide da casca (afinado embaixo), com a touca do cabelo pintada
    add({ id: 'pele.cabeca', part: 1, mat: MAT_HEAD, tw: 256, th: 256, grids: [{ nu: 56, nv: 44, fn(u, v) { const la = lerp(-Math.PI / 2, Math.PI / 2, v), a = lerp(-Math.PI, Math.PI, u), px = Math.cos(la) * Math.sin(a), py = Math.sin(la), pz = Math.cos(la) * Math.cos(a);
      const vy = py * HRAD[1], tp = vy < 0 ? 1 - 0.32 * (vy / HRAD[1]) ** 2 : 1, lu = px * HRAD[0] * tp, au = Math.abs(lu), fr = smooth(0.3, 0.75, pz), E2 = (x, y, sx, sy) => Math.exp(-((x / sx) ** 2) - ((y / sy) ** 2));
      // relevo leve do rosto (nariz, órbitas, maçãs, lábios, queixo) sobre o mesmo elipsoide em que os traços de partícula pousam
      const rel = 0.0042 * Math.exp(-((lu / 0.0062) ** 2)) * smooth(0.004, -0.028, vy) * smooth(-0.047, -0.039, vy) + 0.0028 * E2(lu, vy + 0.037, 0.009, 0.006)
        - 0.0028 * E2(au - FACE_C.EX, vy - FACE_C.EY, 0.017, 0.011) + 0.0024 * E2(au - 0.049, vy + 0.024, 0.015, 0.012) + 0.0016 * E2(lu, vy + 0.063, 0.016, 0.007) + 0.002 * E2(lu, vy + 0.092, 0.016, 0.01);
      const lz = pz * HRAD[2] + rel * fr;
      return { p: [hr[0] + HC[0] + lu, hr[1] + HC[1] + vy, hr[2] + HC[2] + lz], n: norm3([px / HRAD[0], py / HRAD[1], pz / HRAD[2]]), k: [J.head, -1, 0], lu, lv: vy, pz }; } }],
      paint(u, v, get, o) { const P = get(), lu = P.lu, lv = P.lv, pz = P.pz, base = skinCol(1.55, false), n1 = fbmP(u * 20, v * 16, 20);
        let c = [base[0] * (0.66 + 0.2 * n1), base[1] * (0.66 + 0.2 * n1), base[2] * (0.66 + 0.2 * n1)];
        const au = Math.abs(lu), smk = Math.exp(-(((au - FACE_C.EX - 0.004) / 0.03) ** 2) - (((lv - FACE_C.EY - 0.006) / 0.019) ** 2)) * smooth(0.2, 0.5, pz);   // olho esfumado
        c = lerp3(c, [PAL.deep[0] * 1.2, PAL.deep[1], PAL.deep[2] * 1.5], smk * 0.75);
        const blush = Math.exp(-(((au - 0.047) / 0.017) ** 2) - (((lv + 0.03) / 0.012) ** 2)) * smooth(0.3, 0.6, pz); c = lerp3(c, [1.05, 0.28, 0.6], blush * 0.35);
        const lip = Math.exp(-((lu / 0.02) ** 2) - (((lv + 0.062) / 0.008) ** 2)) * smooth(0.5, 0.8, pz);
        const nos = Math.exp(-(((au - 0.0056) / 0.0026) ** 2) - (((lv + 0.0405) / 0.0016) ** 2)) * smooth(0.5, 0.8, pz); c = c.map(q => q * (1 - 0.6 * nos));   // narinas c = lerp3(c, MAT.lipstick.map(x => x * 0.6), lip * 0.55);
        const thr = pz > 0.3 ? 0.064 - 0.034 * smooth(0.03, 0.085, au) : lerp(-0.03, -0.085, smooth(0.3, -0.5, pz)), hc = smooth(thr - 0.004, thr + 0.01, lv);   // touca: onde o cabelo nasce
        if (hc > 0) { const st = 0.5 + 0.5 * Math.sin(u * 520 + vnoiseP(u * 30, v * 20, 30) * 7), cu = vnoiseP(u * 90, v * 60, 90), hcC = lerp3(MAT.hairRoot.map(q => q * 0.45), MAT.hairMid.map(q => q * 0.7), Math.pow(st, 3) * 0.8 + 0.25 * cu); c = lerp3(c, hcC, hc); }   // couro cabeludo coberto: fios escuros, não careca
        set4(o, c, 1); } });
  }
  for (const s of ['L', 'R']) {
    const part = partOf(s), sh = restOf('sh' + s), el = restOf('el' + s), wr = restOf('wr' + s), hp = restOf('hp' + s), kn = restOf('kn' + s), an = restOf('an' + s);
    add({ id: 'pele.braco' + s, part, grids: [capGrid(sh, el, LIMB.upper, J['sh' + s], J['el' + s], J.chest, { nu: 28, nv: 34 })], tw: 128, th: 128, paint: skinPaint(12, 16) });
    add({ id: 'pele.antebraco' + s, part, grids: [capGrid(el, wr, LIMB.fore, J['el' + s], J['wr' + s], -1, { nu: 24, nv: 30 })], tw: 128, th: 128, paint: skinPaint(9, 14) });
    // mão: palma (mesmo elipsoide e mesmo peso dos slots) + dedos (mesmas cápsulas)
    { const HS = HAND_S, sg1 = s === 'L' ? 1 : -1, G = [{ nu: 18, nv: 14, fn(u, v) { const uu = lerp(-1, 1, v), a = u * TAU, r = Math.sqrt(Math.max(0, 1 - uu * uu)), d = [r * Math.cos(a), uu, r * Math.sin(a)];
        return { p: [wr[0] + d[0] * 0.0135 * HS, wr[1] - 0.047 * HS + d[1] * 0.045 * HS, wr[2] + 0.004 + d[2] * 0.037 * HS], n: norm3([d[0] / 0.0135, d[1] / 0.045, d[2] / 0.037]), k: [J['wr' + s], J['el' + s], smooth(-0.3, -1, d[1]) * 0.4] }; } }];
      for (let k = 0; k < 4; k++) { const fa = restOf(`f${k}a${s}`), fb = restOf(`f${k}b${s}`), tip = [fb[0], fb[1] - FINGER_LEN[k] * 0.48, fb[2]];
        G.push(capGrid(fa, fb, [0.0098, 0.0088, 0.12, 0], J[`f${k}a${s}`], J[`f${k}b${s}`], J['wr' + s], { nu: 10, nv: 8, cap1: false }));
        G.push(capGrid(fb, tip, [0.0088, 0.0068, 0.1, 0], J[`f${k}b${s}`], -1, J[`f${k}a${s}`], { nu: 10, nv: 9 })); }
      const ta = restOf('ta' + s), tb = restOf('tb' + s), ttip = [tb[0] - 0.0026 * sg1, tb[1] - 0.036, tb[2] + 0.015];
      G.push(capGrid(ta, tb, [0.012, 0.0105, 0, 0], J['ta' + s], J['tb' + s], J['wr' + s], { nu: 10, nv: 8, cap1: false }));
      G.push(capGrid(tb, ttip, [0.0105, 0.0078, 0, 0], J['tb' + s], -1, J['ta' + s], { nu: 10, nv: 9 }));
      add({ id: 'pele.mao' + s, part, grids: G, tw: 64, th: 64, paint(u, v, get, o) { const b = skinCol(1, true), n1 = vnoiseP(u * 16, v * 16, 16); set4(o, [b[0] * (0.62 + 0.2 * n1), b[1] * (0.62 + 0.2 * n1), b[2] * (0.66 + 0.2 * n1)], 1); } }); }
    add({ id: 'pele.coxa' + s, part: 5, grids: [capGrid(hp, kn, LIMB.thigh, J['hp' + s], J['kn' + s], J.root, { nu: 36, nv: 40 })], tw: 256, th: 128, paint: skinPaint(22, 22) });
    add({ id: 'pele.canela' + s, part: 5, clip: { item: ITEM_ID.coturnos, y: BOOT.collar - 0.014 }, grids: [capGrid(kn, an, LIMB.shin, J['kn' + s], J['an' + s], -1, { nu: 30, nv: 36 })], tw: 128, th: 128, paint: skinPaint(16, 20) });
    add({ id: 'pele.pe' + s, part: 5, clip: { item: ITEM_ID.coturnos, y: 0.5 }, grids: [capGrid([an[0], an[1] - 0.04, an[2] - 0.045], [an[0], an[1] - 0.05, an[2] + 0.155], LIMB.foot, J['an' + s], -1, J['kn' + s], { nu: 20, nv: 18 })], tw: 64, th: 64, paint: skinPaint(8, 8, true) });
  }
  /* ===== jaqueta de couro (aberta, curta, manga do lado dela enrolada) ===== */
  { const ID = ITEM_ID.jaqueta, offT = h => JK.off + (h > 1.43 ? smooth(1.43, 1.47, h) * 0.014 : 0);
    add({ id: 'jaqueta.tronco', item: ID, zb: 0.006, part: 0, mat: MAT_LEATHER, gloss: 0.75, grids: [torsoGrid(JK.hem - 0.004, 1.478, offT, { nu: 112, nv: 70 })], tw: 512, th: 256, paint(u, v, get, o) {
      const P = get(), h = P.h, c = Math.cos(P.ang), x = P.x0, ax = Math.abs(x), op = jkOpen(h);
      if (c > 0 && ax < op) return set4(o, MAT.black, 0);
      let col = leatherBase(u, v, 48, 22);
      if (c > 0 && ax < op + 0.012) col = lerp3(col, MAT.ledge, 0.25 + 0.25 * Math.sin(ax * 900));              // borda da lapela / zíper aberto
      if (c > 0 && ax < op + 0.005) col = lerp3(col, SILV, 0.55 * (0.5 + 0.5 * Math.sin(h * 1400)));    // dentes do zíper
      if (h < JK.hem + JK.belt) { col = lerp3(col, MAT.black, 0.35); if (Math.abs(h - (JK.hem + JK.belt * 0.5)) < 0.009 && c > 0.55 && ax > op + 0.012 && ax < op + 0.03) col = SILV; }   // cinto + fivela
      const seam = Math.min(Math.abs(ax - 0.075), Math.abs(Math.abs(P.ang) - 2.35) * 0.12); if (seam < 0.0018) col = lerp3(col, MAT.stitchL, 0.6 * (Math.sin(h * 900) > 0 ? 1 : 0.2));   // pespontos
      for (const L of LAPEL) if (Math.hypot(ax - L[0], h - L[1]) < 0.004 && c > 0) col = SILV;   // botões de pressão das lapelas
      set4(o, col, 1); } });
    for (const s of ['L', 'R']) { const part = partOf(s), sh = restOf('sh' + s), el = restOf('el' + s), wr = restOf('wr' + s), ru = ROLL_U[s];
      add({ id: 'jaqueta.manga' + s, item: ID, zb: 0.005, part, mat: MAT_LEATHER, gloss: 0.75, grids: [capGrid(sh, el, LIMB.upper, J['sh' + s], J['el' + s], J.chest, { nu: 28, nv: 30, off: lu => 0.016 + 0.012 * Math.exp(-((lu / 0.13) ** 2)), uv: [0, 0, 1, 0.5] }),
        capGrid(el, wr, LIMB.fore, J['el' + s], J['wr' + s], -1, { nu: 24, nv: 28, cap0: true, cap1: false, v1: ru + 0.02, off: lu => 0.015 + (s === ASYM_S ? 0.013 * smooth(ru - 0.09, ru, lu) : 0), uv: [0, 0.5, 1, 1] })], tw: 128, th: 256,
        paint(u, v, get, o) { const fore = v >= 0.5, vv = fore ? (v - 0.5) * 2 : v * 2; let col = leatherBase(u, vv, 10, 14);
          if (fore && s === ASYM_S && vv > 0.72) col = lerp3(col, MAT.ledge, 0.3 * (0.5 + 0.5 * Math.sin(vv * 90)));   // dobras do punho enrolado
          if (Math.abs(fract(u + 0.25) - 0.5) < 0.008) col = lerp3(col, MAT.stitchL, 0.55);   // costura da manga
          if (fore && s !== ASYM_S && vv > 0.86) col = lerp3(col, SILV, 0.5 * (Math.abs(u - 0.75) < 0.05 ? 1 : 0));   // zíper do punho
          set4(o, col, 1); } }); }
  }
  /* ===== top bralette vermelho (decote em V, faixa sob o busto, trama translúcida no alto) ===== */
  { const ID = ITEM_ID.camisa;
    add({ id: 'camisa', item: ID, zb: 0.004, part: 0, mat: MAT_CLOTH, gloss: 0.25, grids: [torsoGrid(TOP.hem - 0.003, 1.45, 0.0042, { nu: 120, nv: 60 })], tw: 512, th: 256, paint(u, v, get, o) {
      const P = get(), h = P.h, c = Math.cos(P.ang), x = P.x0; if (!topCov(x, h, c)) return set4(o, MAT.black, 0);
      const e = 0.0045, edge = !topCov(x + e, h, c) || !topCov(x - e, h, c) || !topCov(x, h + e, c) || !topCov(x, h - e, c);
      const rib = 0.5 + 0.5 * Math.sin(x * 430 + P.p[2] * 60); let col = [MAT.topC[0] * (0.8 + 0.3 * rib), MAT.topC[1] * (0.8 + 0.3 * rib), MAT.topC[2] * (0.84 + 0.22 * rib)];
      if (h < TOP.band) col = lerp3(col, MAT.topC.map(q => q * 0.7), 0.6);   // faixa elástica
      if (h > 1.23 && c > 0.25) { const sh = smooth(0.25, 0.6, Math.sin(x * 95 + h * 70) * Math.sin(h * 130 - x * 40)), sk = skinCol(h, false); col = lerp3(col, sk.map(q => q * 0.8), sh * 0.5); }   // trama translúcida
      if (edge) col = MAT.topE;
      set4(o, col, 1); } });
  }
  /* ===== shortinho jeans (cintura baixa, corte assimétrico, recorte atrás, bainha desfiada) ===== */
  { const ID = ITEM_ID.short, OFF = 0.0062;
    const denimC = (x, y, z, nz, band, u, v, su, sv) => { const c = denimAt(x, y, z, nz, band), tw = twill(u, v, su, sv); return [c[0] * (0.55 + 0.22 * tw), c[1] * (0.55 + 0.22 * tw), c[2] * (0.58 + 0.2 * tw)]; };
    add({ id: 'short.tronco', item: ID, zb: 0.006, part: 0, mat: MAT_CLOTH, gloss: 0.12, grids: [torsoGrid(0.8, 0.975, OFF, { nu: 120, nv: 36 }), Object.assign(torsoCap(OFF), { uv: [0, 0, 1, 0.02] })], tw: 512, th: 128, paint(u, v, get, o) {
      if (v < 0.03) return set4(o, MAT.denimD, 1);
      const P = get(), h = P.h, ang = P.ang, x = P.x0, wb = shortTop(ang), hm = shortHemT(ang);
      if (h > wb || h < hm - 0.004 || shortCut(ang, h)) return set4(o, MAT.black, 0);
      const band = h > wb - SHORT.band; let col = denimC(x, h, P.p[2], P.n[2], band, u, v, 260, 60);
      if (Math.abs(h - (wb - SHORT.band)) < 0.0016 || Math.abs(h - (wb - 0.004)) < 0.0012) col = MAT.thread;      // pesponto de cobre
      for (const la of [0.55, 1.65, 2.75]) for (const sg of [1, -1]) if (band && Math.abs(ang - sg * la) < 0.035) col = lerp3(col, MAT.denimD, 0.5);   // passantes
      if (band && Math.abs(Math.abs(x) - 0.105) < 0.0045 && Math.cos(ang) > 0.3 && Math.abs(h - (wb - 0.008)) < 0.004) col = MAT.copper;   // rebites
      if (Math.cos(ang) < -0.4 && Math.abs(x) > 0.025 && Math.abs(x) < 0.105 && h > 0.86 && h < wb - SHORT.band - 0.004) { const dx = Math.min(Math.abs(Math.abs(x) - 0.025), Math.abs(Math.abs(x) - 0.105)), dh = Math.abs(h - (wb - SHORT.band - 0.004)); if (dx < 0.0014 || dh < 0.0014 || Math.abs(h - 0.86) < 0.0014) col = MAT.thread; }   // bolsos de trás
      if (h - hm < 0.007) { const fr = vnoiseP(u * 900, v * 40, 900); if (fr < 0.35) return set4(o, MAT.fray, h - hm < 0.002 ? 0 : 1); col = lerp3(col, MAT.fray, 0.6); }   // barra desfiada
      set4(o, col, 1); } });
    for (const s of ['L', 'R']) { const hp = restOf('hp' + s), kn = restOf('kn' + s);
      add({ id: 'short.perna' + s, item: ID, zb: 0.006, part: 5, mat: MAT_CLOTH, gloss: 0.12, tw: 256, th: 64, grids: [capGrid(hp, kn, LIMB.thigh, J['hp' + s], J['kn' + s], J.root, { nu: 36, nv: 14, v1: 0.36, off: () => OFF })], paint(u, v, get, o) {
        const P = get(), y = P.p[1] - P.nr[1] * OFF, hm = shortHemLeg(s, P.nr); if (y < hm) return set4(o, MAT.black, 0);
        let col = denimC(P.p[0], y, P.p[2], P.nr[2], false, u, v, 200, 30);
        if (y - hm < 0.007) { const fr = vnoiseP(u * 700, v * 40, 700); if (fr < 0.35) return set4(o, MAT.fray, y - hm < 0.002 ? 0 : 1); col = lerp3(col, MAT.fray, 0.6); }
        set4(o, col, 1); } }); }
  }
  /* ===== meias 7/8: listrada do lado de lá, arrastão rasgada do lado dela ===== */
  { const ID = ITEM_ID.meias, OFF = 0.0028;
    for (const s of ['L', 'R']) { const hp = restOf('hp' + s), kn = restOf('kn' + s), an = restOf('an' + s), net = s === NET_S, top = SOCK.top[s] + 0.01, F2 = limbFrame('hp' + s, 'kn' + s), u0 = clamp((F2.A[1] - top) / (F2.A[1] - F2.B[1]), 0, 1);
      const G = [capGrid(hp, kn, LIMB.thigh, J['hp' + s], J['kn' + s], J.root, { nu: net ? 72 : 36, nv: 16, v0: u0, cap0: false, cap1: false, off: () => OFF, uv: [0, 0, 1, 0.3] }),
        capGrid(kn, an, LIMB.shin, J['kn' + s], J['an' + s], -1, { nu: net ? 64 : 32, nv: 44, cap0: true, off: () => OFF, uv: [0, 0.3, 1, 0.9] }),
        capGrid([an[0], an[1] - 0.04, an[2] - 0.045], [an[0], an[1] - 0.05, an[2] + 0.155], LIMB.foot, J['an' + s], -1, J['kn' + s], { nu: 20, nv: 16, off: () => OFF, uv: [0, 0.9, 1, 1] })];
      const gi = v => v < 0.3 ? 0 : v < 0.9 ? 1 : 2;
      add({ id: 'meia' + s, item: ID, part: 5, zb: 0.003, clip: { item: ITEM_ID.coturnos, y: BOOT.collar - 0.014 }, mat: MAT_CLOTH, gloss: net ? 0.35 : 0.1, atest: net ? 0.32 : 0.5, grids: G, tw: net ? 512 : 128, th: net ? 512 : 256, texGrid: gi, paint(u, v, get, o) {
        const P = get(), y = P.p[1] - P.nr[1] * OFF, ang = Math.atan2(P.nr[0], P.nr[2]);
        if (net) { if (y > SOCK.top[NET_S]) return set4(o, MAT.black, 0); const cv = netStrand(ang, y); set4(o, lerp3(MAT.black, MAT.net, 0.25 + 0.2 * Math.sin(u * 400)), cv); return; }
        const st = sockStripe(y); if (st < 0) return set4(o, MAT.black, 0);
        const rib = 0.5 + 0.5 * Math.sin(ang * 26); set4(o, st === 1 ? MAT.white.map(q => q * (0.85 + 0.15 * rib)) : st === 0 ? lerp3(MAT.black, MAT.net, 0.45 * rib) : MAT.black.map(q => q * (0.9 + 0.5 * rib)), 1); } }); }
  }
  /* ===== coturnos (forma própria do pé, cano, solado tratorado, cadarço, zíper) ===== */
  { const ID = ITEM_ID.coturnos;
    for (const s of ['L', 'R']) {
      const foot = { nu: 56, nv: 40, uv: [0, 0, 1, 0.55], fn(u, v) { const zp = lerp(BOOT.heel, BOOT.toe, v), b = u * TAU; let P;
          if (b <= Math.PI) P = bootPt(s, zp, b, 0.0012);
          else { const q = (b - Math.PI) / Math.PI, an = restOf('an' + s), w = bootW(zp) + 0.0012, w2 = w + 0.0035 * Math.sqrt(Math.max(0, w / 0.04)), y0 = bootSole(zp), yb = 0.004;   // solado: desce da vira até o chão, atravessa e sobe
            let x, y; if (q < 0.18) { const f = q / 0.18; x = -lerp(w, w2, smooth(0, 0.4, f)); y = lerp(y0, yb, f); } else if (q < 0.82) { x = lerp(-w2, w2, (q - 0.18) / 0.64); y = yb; } else { const f = (q - 0.82) / 0.18; x = lerp(w2, w, smooth(0.6, 1, f)); y = lerp(yb, y0, f); }
            P = { p: [an[0] + x, y, an[2] + zp], n: q < 0.18 ? [-1, 0, 0] : q < 0.82 ? [0, -1, 0] : [1, 0, 0] }; } P.k = bootSkin(s, P.p[1], zp); P.zp = zp; P.b = b; return P; } };
      const shaft = { nu: 40, nv: 22, uv: [0, 0.55, 1, 1], fn(u, v) { const y = lerp(BOOT.shaftLo - 0.012, BOOT.collar, v), a = lerp(-Math.PI, Math.PI, u), P = shaftPt(s, y, a, 0.0012); P.k = bootSkin(s, y, 0); P.a = a; return P; } };
      add({ id: 'coturno' + s, item: ID, zb: 0.006, part: 5, mat: MAT_LEATHER, gloss: 0.6, grids: [foot, shaft], tw: 256, th: 256, texGrid: v => v < 0.55 ? 0 : 1, paint(u, v, get, o) {
        const P = get(); let col = leatherBase(u, v, 18, 18);
        if (v < 0.55) { const zp = P.zp, sb = Math.sin(P.b), y0 = bootSole(zp);
          if (sb < 0.02 || P.p[1] < y0 + 0.004) { const tr = Math.sin(zp * 380) > 0.2 ? 1 : 0.55; return set4(o, MAT.sole.map(q => q * tr), 1); }   // solado tratorado
          if (P.p[1] < y0 + 0.01) col = MAT.soleEdge.map(q => q * 0.6);                               // vira
          if (zp > BOOT.toe - 0.07 && sb > 0.3) col = lerp3(col, MAT.sheen, 0.12);                     // biqueira
          if (zp < 0.1 && zp > -0.01 && Math.abs(Math.cos(P.b)) < 0.3) { const tt = fract(zp / 0.016), q = Math.cos(P.b) / 0.3, d = Math.min(Math.abs(q - (2 * tt - 1)), Math.abs(q + (2 * tt - 1))); if (d < 0.18) col = MAT.lace; }
        } else { const a = P.a, y = P.p[1];
          if (y > BOOT.collar - 0.008) col = lerp3(col, MAT.black, 0.45);                                // colarinho acolchoado
          if (Math.abs(a) < 0.34) { const tt = fract(y / 0.016), q = a / 0.34, d = Math.min(Math.abs(q - (2 * tt - 1)), Math.abs(q + (2 * tt - 1))); if (d < 0.16) col = MAT.lace; if (Math.abs(Math.abs(q) - 1) < 0.18 && Math.abs(tt - 0.5) < 0.18) col = SILV; }   // cadarço cruzado + ilhoses
          const zs = (s === 'L' ? 1 : -1) * Math.PI / 2; if (Math.abs(a - zs) < 0.05) col = lerp3(col, SILV, 0.5 + 0.5 * (Math.sin(y * 1300) > 0 ? 1 : 0)); }   // zíper lateral
        set4(o, col, 1); } }); }
  }
  /* ===== fone over-ear branco no pescoço ===== */
  { const ID = ITEM_ID.fone, skC = [J.chest, J.neck, 0.2], skB = [J.chest, J.neck, 0.45], G = [], yokeTop = {};
    const PROF = [[0, -0.02], [0.8, -0.021], [1.07, -0.012], [1.03, -0.002], [1.0, 0.006], [0.92, 0.0075], [0.7, 0.0115], [0.4, 0.0142], [0, 0.0152]];
    const prof = v => { const f = v * (PROF.length - 1), i = Math.min(PROF.length - 2, f | 0), g = f - i; return [lerp(PROF[i][0], PROF[i + 1][0], g), lerp(PROF[i][1], PROF[i + 1][1], g)]; };
    for (const sx of SIDES) { const c = FONE.cups[sx], nC = foneN(sx), [e1, e2] = tframeG(nC), up = e2[1] > 0 ? e2 : e2.map(q => -q), a = FONE.a, b = FONE.b;
      const K2 = FONE.k, pt = (r1, r2, d) => [c[0] + (e1[0] * r1 + up[0] * r2 + nC[0] * d) * K2, c[1] + (e1[1] * r1 + up[1] * r2 + nC[1] * d) * K2, c[2] + (e1[2] * r1 + up[2] * r2 + nC[2] * d) * K2];   // mesma posição, concha menor
      G.push({ nu: 32, nv: 16, uv: sx > 0 ? [0, 0, 0.5, 0.5] : [0.5, 0, 1, 0.5], fn(u, v) { const [rho, d] = prof(v), th = u * TAU, ct = Math.cos(th), st = Math.sin(th); const p = pt(ct * a * rho, st * b * rho, d);
        return { p, n: norm3([e1[0] * ct + up[0] * st + nC[0] * (v - 0.5) * 2, e1[1] * ct + up[1] * st + nC[1] * (v - 0.5) * 2, e1[2] * ct + up[2] * st + nC[2] * (v - 0.5) * 2]), k: skC }; } });
      G.push(tubeGrid(q => { const th = q * Math.PI; return pt(Math.cos(th) * a * 1.16, Math.sin(th) * b * 1.2 + 0.004, -0.002); }, () => 0.0032 * FONE.k, skC, { nu: 8, nv: 18, uv: [0, 0.5, 0.5, 0.6] }));
      yokeTop[sx] = pt(0, b * 1.2 + 0.012, -0.002); }
    const ctrl = [yokeTop[1], [0.108, 1.49, 0.02], [0.07, 1.496, -0.07], [0, 1.498, -0.094], [-0.07, 1.496, -0.07], [-0.108, 1.49, 0.02], yokeTop[-1]], tmp = [0, 0, 0];
    G.push(tubeGrid(q => crPath(ctrl, q, [0, 0, 0]), () => 0.0038, skB, { nu: 12, nv: 40, ry: () => 0.011 * FONE.kb, up: [0, 1, 0], uv: [0, 0.6, 1, 0.8] }));
    { const c0 = FONE.cups[1], [e1, e2] = tframeG(foneN(1)), up = e2[1] > 0 ? e2 : e2.map(q => -q), cb = [c0[0] - up[0] * FONE.b * 1.02 * FONE.k, c0[1] - up[1] * FONE.b * 1.02 * FONE.k, c0[2] - up[2] * FONE.b * 1.02 * FONE.k];   // cabo
      G.push(tubeGrid(q => { const y = cb[1] - 0.25 * q, x = cb[0] - 0.012 * Math.sin(q * Math.PI) - 0.01 * q, zb = torsoPt(y, frontAng(y, x), 0.034).p[2]; return [x, y, Math.max(cb[2] - 0.02 * q, zb)]; }, () => 0.0016, q => torsoSkin(cb[1] - 0.25 * q), { nu: 6, nv: 24, uv: [0, 0.8, 1, 1] })); }
    add({ id: 'fone', item: ID, part: 1, mat: MAT_CLOTH, gloss: 0.55, grids: G, tw: 256, th: 256, paint(u, v, get, o) {
      if (v < 0.5) { const vv = (u % 0.5) * 2, w = v * 2, [rho] = prof(w);   // u: ângulo; w: perfil da concha
        if (w < 0.36) return set4(o, MAT.foneC.map(q => q * (0.75 + 0.3 * vnoiseP(vv * 60, w * 40, 60))), 1);   // almofada de couro cinza
        if (w < 0.5) return set4(o, MAT.foneM, 1);
        if (Math.abs(rho - 0.52) < 0.03 && w > 0.6) return set4(o, MAT.foneM, 1);                                   // anel do logo
        if (rho < 0.12) return set4(o, SILV, 1);
        return set4(o, MAT.foneW.map(q => q * 0.5), 1); }
      if (v < 0.6) return set4(o, MAT.foneW.map(q => q * 0.5), 1);
      if (v < 0.8) { const q = u; if (q < 0.12 || q > 0.88) return set4(o, SILV.map(c => c * (0.8 + 0.2 * Math.sin(q * 300))), 1); return set4(o, Math.abs(Math.sin(v * 31.4)) > 0.5 ? MAT.foneW.map(c => c * 0.5) : MAT.foneC.map(c => c * 0.7), 1); }
      set4(o, MAT.cable.map(c => c * 0.7), 1); } });
  }
  /* ===== chifres (curvos para trás, base nos cachos) ===== */
  add({ id: 'chifres', item: ITEM_ID.chifres, part: 2, mat: MAT_LEATHER, gloss: 0.7, tw: 64, th: 128,
    grids: SIDES.map((sx, i) => tubeGrid(u => hornPathG(sx, u), u => 0.0115 * Math.pow(1 - u, 0.8) + 0.0008, [J.head, -1, 0], { nu: 14, nv: 26, uv: [i * 0.5, 0, i * 0.5 + 0.5, 1] })),
    paint(u, v, get, o) { const g = Math.pow(v, 0.8), ring = Math.abs(fract(v * 13) - 0.5) < 0.12 ? 0.55 : 1, gr = 0.85 + 0.25 * vnoiseP(u * 40, v * 60, 40);
      set4(o, lerp3(MAT.hornA, MAT.hornB, g).map(q => q * ring * gr), 1); } });
  /* ===== cauda (dinâmica: segue a linha central que balança) + coração da ponta ===== */
  { const ID = ITEM_ID.cauda, TMn = 26;
    const at = (s, F) => { const TSp = F.tailS, fm = s * (TMn - 1), m0 = Math.min(TMn - 2, fm | 0), f = fm - m0, o3 = m0 * 3; return [lerp(TSp[o3], TSp[o3 + 3], f), lerp(TSp[o3 + 1], TSp[o3 + 4], f), lerp(TSp[o3 + 2], TSp[o3 + 5], f)]; };
    const hf = X => { const H = X.F.tailH, ex = [H[3], H[4], H[5]], ey = [H[6], H[7], H[8]]; return { c: [H[0], H[1], H[2]], ex, ey, nz: norm3(cross3(ex, ey)) }; }, hs = X => TAIL.HS * (1 + 0.06 * Math.sin(X.t * 2.4) * X.ch.flirt);
    add({ id: 'cauda', item: ID, part: 5, mat: MAT_LEATHER, gloss: 0.65, dyn: true, tw: 128, th: 128,
      grids: [tubeGrid((s, X) => at(Math.min(s, 0.985), X.F), s => lerp(TAIL.r0, TAIL.r1, s) * (s > 0.96 ? smooth(1.0, 0.96, s) * 0.6 + 0.4 : 1), [-1, -1, 0], { nu: 12, nv: 48, uv: [0, 0, 1, 0.7] }),
        heartGrid(hf, hs, [-1, -1, 0], 1, { uv: [0, 0.7, 0.5, 1] }), heartGrid(hf, hs, [-1, -1, 0], -1, { uv: [0.5, 0.7, 1, 1] })],
      paint(u, v, get, o) { if (v < 0.7) { const s = v / 0.7, g = Math.pow(s, 1.3); let c = lerp3(MAT.tailA, MAT.tailB, g); if (s > 0.8 && s < 0.975) { const sc = Math.abs(fract(u * 12 + (Math.floor(s * 60) % 2) * 0.5) - 0.5); c = lerp3(c, MAT.scale, smooth(0.3, 0.15, sc) * 0.7); } return set4(o, c.map(q => q * (0.85 + 0.2 * vnoiseP(u * 30, v * 60, 30))), 1); }
        const r = (v - 0.7) / 0.3; set4(o, r > 0.86 ? MAT.black : lerp3(MAT.tailB, MAT.heartHi, smooth(0.3, 0.85, r) * 0.6), 1); } });
  }
  /* ===== asas de morcego (dinâmicas): membrana translúcida + armação ===== */
  { const ID = ITEM_ID.asas, panelP = (sx, k, a, b, X) => { const W2 = X.F.wingW[sx], uv = wingUV(W2.K, 0, k, a, b), bil = 0.03 * Math.sin(Math.PI * a) * (0.55 + 0.45 * Math.sin(X.t * 2.2 + b * 3)) * X.ch.wing.spread;
      return [W2.R[0] + W2.U[0] * uv[0] + W2.V[0] * uv[1] + W2.N[0] * bil, W2.R[1] + W2.U[1] * uv[0] + W2.V[1] * uv[1] + W2.N[1] * bil, W2.R[2] + W2.U[2] * uv[0] + W2.V[2] * uv[1] + W2.N[2] * bil]; };
    const GM = [], GB = [];
    for (const sx of SIDES) for (let k = 0; k < 5; k++) GM.push({ nu: 10, nv: 12, uv: [k / 5, 0, (k + 1) / 5, 1], fn(u, v, X) { return { p: panelP(sx, k, v, u, X), n: X.F.wingW[sx].N, k: [-1, -1, 0] }; } });
    for (const sx of SIDES) for (let bn = 0; bn < 6; bn++) GB.push(tubeGrid((q, X) => { const W2 = X.F.wingW[sx], uv = wingUV(W2.K, 1, bn, q, 0); return [W2.R[0] + W2.U[0] * uv[0] + W2.V[0] * uv[1], W2.R[1] + W2.U[1] * uv[0] + W2.V[1] * uv[1], W2.R[2] + W2.U[2] * uv[0] + W2.V[2] * uv[1]]; },
      q => (bn < 2 ? 0.0062 : 0.0045) * (1 - 0.55 * q), [-1, -1, 0], { nu: 6, nv: 10 }));
    add({ id: 'asas.membrana', item: ID, part: 0, mat: MAT_MEMB, cls: 'trans', gloss: 0.4, dyn: true, grids: GM, tw: 256, th: 128, paint(u, v, get, o) { const k = Math.floor(u * 5), b = fract(u * 5), a = v;
      const vein = smooth(0.06, 0.0, Math.abs(fract(b * 3 + a * 0.4) - 0.5) - 0.44) * smooth(0.1, 0.4, a), ed = smooth(0.62, 1, a);
      let c = [MAT.wingM[0] * (0.7 + 0.5 * ed), MAT.wingM[1] * (0.7 + 0.9 * ed), MAT.wingM[2] * (0.7 + 0.5 * ed)]; c = lerp3(c, MAT.wingBone, vein * 0.8); if (a > 0.965) c = MAT.wingEdge;
      set4(o, c, 0.62 + 0.25 * ed + 0.15 * vein + 0.0 * k); } });
    add({ id: 'asas.armacao', item: ID, part: 0, mat: MAT_LEATHER, gloss: 0.5, dyn: true, grids: GB, tw: 32, th: 64, paint(u, v, get, o) { const rm = 0.5 + 0.5 * Math.sin(v * 40); set4(o, [MAT.wingBone[0] + 0.2 * rm, MAT.wingBone[1] + 0.04 * rm, MAT.wingBone[2] + 0.14 * rm], 1); } });
  }
  /* ===== unhas amendoadas, laca vinho com reflexo ===== */
  { const ID = ITEM_ID.unhas;
    for (const s of ['L', 'R']) { const sg1 = s === 'L' ? 1 : -1, G = [];
      const tips = []; for (let k = 0; k < 4; k++) { const fb = restOf(`f${k}b${s}`), tip = [fb[0], fb[1] - FINGER_LEN[k] * 0.48, fb[2]]; tips.push([tip, [0, -1, 0], J[`f${k}b${s}`], 0.0075]); }
      { const tb = restOf('tb' + s), tt = [tb[0] - 0.0026 * sg1, tb[1] - 0.036, tb[2] + 0.015]; tips.push([tt, norm3([tt[0] - tb[0], tt[1] - tb[1], tt[2] - tb[2]]), J['tb' + s], 0.0072]); }
      for (const [tip, dir, jn, rf] of tips) { let dor = [sg1, 0, 0]; const dd = dor[0] * dir[0] + dor[1] * dir[1] + dor[2] * dir[2]; dor = norm3([dor[0] - dir[0] * dd, dor[1] - dir[1] * dd, dor[2] - dir[2] * dd]); const acr = norm3(cross3(dir, dor));
        const halfW = a => 0.0044 * Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (a + 0.002) / 0.0145), 1.6)), 0.75) * smooth(-0.0125, -0.008, a) + 0.0003;
        G.push({ nu: 6, nv: 10, fn(u, v) { const a = lerp(-0.012, 0.0125, v), b = (u * 2 - 1) * halfW(a), d = 0.0012 - 0.004 * smooth(0, 0.0125, a) + 0.0011 * (1 - (u * 2 - 1) ** 2);
          return { p: [tip[0] + dir[0] * a + acr[0] * b + dor[0] * (rf + d), tip[1] + dir[1] * a + acr[1] * b + dor[1] * (rf + d), tip[2] + dir[2] * a + acr[2] * b + dor[2] * (rf + d)], n: dor, k: [jn, -1, 0] }; } }); }
      add({ id: 'unhas' + s, item: ID, part: partOf(s), mat: MAT_LEATHER, gloss: 0.95, grids: G, tw: 32, th: 32, paint(u, v, get, o) { const hi = Math.exp(-(((u - 0.38) / 0.09) ** 2)) * smooth(0.1, 0.5, v); set4(o, lerp3(MAT.nail, MAT.nailHi, hi * 0.8 + 0.1 * (u < 0.08 || u > 0.92 ? 1 : 0)), 1); } }); }
  }
  /* ===== piercing de umbigo: bolinha dourada, barra, pedra pendurada ===== */
  { const c = TPxG(NAVEL.h, 0, 0.004), [e1, e2] = tframeG(c.n), K = c.k, pl = (u, v, d) => [c.p[0] + e1[0] * u + e2[0] * v + c.n[0] * d, c.p[1] + e1[1] * u + e2[1] * v + c.n[1] * d, c.p[2] + e1[2] * u + e2[2] * v + c.n[2] * d];
    add({ id: 'piercing', item: ITEM_ID.piercing, part: 0, mat: MAT_METAL, gloss: 0.95, tw: 32, th: 16, grids: [sphereGrid(pl(0, 0.0105, 0.001), 0.0024, K, { uv: [0, 0, 0.33, 1] }), tubeGrid(q => pl(0, lerp(0.008, -0.009, q), 0.001 + 0.0015 * Math.sin(q * Math.PI)), () => 0.0007, K, { nu: 6, nv: 8, uv: [0.33, 0, 0.66, 1] }),
      sphereGrid(pl(0, -0.0125, 0.0025), 0.0029, K, { uv: [0.66, 0, 1, 1], sc: [1, 1.15, 0.8] })], paint(u, v, get, o) { set4(o, u < 0.66 ? MAT.gold.map(q => q * 0.8) : [1.2, 0.75, 1.25], 1); } });
  }
  /* ===== choker: faixa preta, rebites, anel de coração, pingente, correntes ===== */
  { const ID = ITEM_ID.choker, Y = 1.468, HW2 = 0.0062, hc = [0, Y - 0.011, frontZG(0, Y - 0.011, 0.007)], KH = [J.neck, J.chest, 0.4], HS = 0.0115;
    const G = [{ nu: 64, nv: 4, uv: [0, 0, 1, 0.5], fn(u, v) { const P = neckAtG(Y + lerp(-HW2, HW2, v), u * TAU - Math.PI, 0.0045); return P; } }];
    G.push(tubeGrid(q => { const [hx, hy] = heartXY(q); return [hc[0] + hx * HS, hc[1] + hy * HS, hc[2]]; }, () => 0.0011, KH, { nu: 6, nv: 40, uv: [0, 0.5, 0.5, 0.75] }));
    const pc = [0, hc[1] - HS * 0.95 - 0.006, frontZG(0, hc[1] - HS * 0.95 - 0.006, 0.008)], PF = { c: pc, ex: [1, 0, 0], ey: [0, 1, 0], nz: [0, 0, 1] };
    G.push(heartGrid(PF, 0.0058, KH, 1, { uv: [0.5, 0.5, 1, 0.75], bulge: 0.0016 }), heartGrid(PF, 0.0058, KH, -1, { uv: [0.5, 0.5, 1, 0.75], bulge: 0.0016 }));
    for (const [aS, dep] of [[0.78, 0.035], [0.98, 0.056]]) { const x0 = Math.sin(aS) * 0.0415;
      G.push(tubeGrid(q => { const x = lerp(x0, -x0, q), y = Y - 0.003 - dep * (1 - (2 * q - 1) ** 2); return [x, y, frontZG(x, y, 0.0045)]; }, () => 0.0009, (q, P) => [J.neck, J.chest, P[1] < 1.445 ? 0.75 : 0.4], { nu: 5, nv: 30, uv: [0, 0.75, 1, 1] })); }
    add({ id: 'choker', item: ID, zb: 0.003, part: 1, mat: MAT_LEATHER, gloss: 0.7, grids: G, tw: 256, th: 64, paint(u, v, get, o) {
      if (v < 0.5) { const ang = u * TAU - Math.PI; let col = MAT.black.map(q => q * (1.2 + 0.8 * vnoiseP(u * 200, v * 20, 200))); const w = v * 2;
        if (w < 0.12 || w > 0.88) col = MAT.strap.map(q => q * 0.6);
        for (const sx of SIDES) if (Math.hypot((ang - sx * 1.25) * 0.042, (w - 0.5) * 0.0124) < 0.0021) col = MAT.steel;   // rebites
        return set4(o, col, 1); }
      if (v < 0.75) return set4(o, u < 0.5 ? MAT.steel.map(q => q * 0.9) : [1.25, 0.5, 1.0], 1);
      set4(o, (Math.floor(u * 120) % 2) ? MAT.steel.map(q => q * 0.85) : lerp3(MAT.steel, MAT.strap, 0.4), 1); } });
  }
  /* ===== tatuagem (decalque sobre a pele, desenhado num canvas a partir do MESMO desenho TAT) + veias de glitch ===== */
  { const ID = ITEM_ID.tatuagem, h0 = 0.9, h1 = 1.075, a0 = -1.3, a1 = 1.3;
    add({ id: 'tatuagem', item: ID, part: 0, mat: MAT_DECAL, cls: 'decal', grids: [torsoGrid(h0, h1, 0.0011, { nu: 72, nv: 44, a0, a1 })], tw: 512, th: 256, canvas: (cv, W, H) => tattooCanvas(cv, W, H, h0, h1, a0, a1) });
    add({ id: 'veias', item: ID, part: 0, mat: MAT_VEIN, cls: 'add', grids: [torsoGrid(0.9, 1.485, 0.0016, { nu: 112, nv: 70 })], tw: 512, th: 256, canvas: (cv, W, H) => veinCanvas(cv, W, H, 0.9, 1.485) });
  }
  /* ===== bloquinho gasto (situacional, na mão de lá) ===== */
  { const s = OTHER_S, wr = restOf('wr' + s), sg1 = s === 'L' ? 1 : -1, HW = 0.044, HH = 0.058, TH = 0.007, c = [wr[0] - sg1 * (0.0135 * HAND_S + 0.011), wr[1] - 0.064, wr[2] + 0.005], K = [J['wr' + s], -1, 0];
    const X = [-sg1, 0, 0], Y2 = [0, 1, 0], Z = [0, 0, 1], cc = (f) => [c[0] - sg1 * f, c[1], c[2]];
    add({ id: 'bloco', item: ITEM_ID.bloco, part: 3, mat: MAT_CLOTH, gloss: 0.15, tw: 64, th: 64, grids: [quadGrid(cc(TH), Z, Y2, HW, HH, X, K, { uv: [0, 0, 0.5, 1] }), quadGrid(cc(-TH), Z, Y2, HW, HH, X.map(q => -q), K, { uv: [0.5, 0, 1, 1] }),
      quadGrid([c[0], c[1], c[2] - HW], X, Y2, TH, HH, [0, 0, -1], K, { uv: [0.5, 0, 0.55, 1] }), quadGrid([c[0], c[1], c[2] + HW], X, Y2, TH, HH, Z, K, { uv: [0.5, 0, 0.55, 1] }), quadGrid([c[0], c[1] + HH, c[2]], X, Z, TH, HW, Y2, K, { uv: [0.5, 0, 0.55, 1] }), quadGrid([c[0], c[1] - HH, c[2]], X, Z, TH, HW, [0, -1, 0], K, { uv: [0.5, 0, 0.55, 1] })],
      paint(u, v, get, o) { if (u < 0.5) { const line = Math.abs(fract(v * 9) - 0.5) < 0.04 && u > 0.08; const ink = Math.abs(v - 0.55) < 0.02 && u > 0.1 && u < 0.38; return set4(o, ink ? [0.3, 0.24, 0.42] : line ? [0.62, 0.62, 0.82] : [0.95, 0.88, 1.05].map(q => q * (0.85 + 0.15 * vnoiseP(u * 30, v * 30, 30))), 1); }
        set4(o, u < 0.55 && u > 0.5 && Math.abs(fract(v * 40) - 0.5) < 0.2 ? [0.75, 0.78, 0.95] : [0.3, 0.24, 0.42], 1); } });
  }
  /* ===== tiras do top: as cruzadas sobre o colo + as alças — tubo achatado varrendo os MESMOS caminhos da partícula ===== */
  { const ID = ITEM_ID.camisa, G = [], skT = (q, P) => P.k;
    // fora do tronco puro (h > 1,40) a malha da pele desliza para o pescoço: a tira desce até encostar nela, como no corpo
    const snap = (P, off) => { if (P.p[1] <= NECK_H0) return P; const zc = torsoAt(P.p[1])[2], ang = Math.atan2(P.p[0], P.p[2] - zc), rP = Math.hypot(P.p[0], P.p[2] - zc); let h = P.p[1];
      for (let k = 0; k < 50 && h > NECK_H0; k++) { const S = torsoNeckPt(h, ang, 0); if (Math.hypot(S.p[0], S.p[2] - zc) >= rP - 0.004) break; h -= 0.0015; }
      return torsoNeckPt(h, ang, off); };
    const TPm = (h, x, off, back) => snap(TPxG2(h, x, off, back), off);
    for (const [hl, hr] of [[1.344, 1.284], [1.284, 1.344], [1.296, 1.248], [1.248, 1.296]]) { const A = TPxG(hl, topVx(hl), 0.007), B = TPxG(hr, -topVx(hr), 0.007);
      const path = q => { const p = lerp3(A.p, B.p, q), sf = torsoPt(p[1], frontAng(p[1], p[0]), 0.006).p[2]; p[2] = Math.max(p[2], sf); return p; };
      G.push(tubeGrid(path, () => 0.0039, q => torsoSkin(path(q)[1]), { nu: 8, nv: 26, ry: () => 0.0012, up: [0, 0, 1], uv: [0, 0, 0.5, 1] })); }
    for (const sx of SIDES) { const at = q => { let h, x, back = false; if (q < 0.35) { const f = q / 0.35; h = lerp(TOP.sh, 1.452, f); x = lerp(TOP.sx, 0.1, f); }
        else if (q < 0.6) { const f = (q - 0.35) / 0.25, a0 = frontAng(1.455, 0.1), P = torsoPt(1.458, sx * lerp(a0, Math.PI - a0, f), 0.008); P.k = torsoSkin(1.458); return snap(P, 0.0045); }
        else { const f = (q - 0.6) / 0.4; h = lerp(1.452, 1.257, f); x = lerp(0.1, 0.08, f); back = true; } return TPm(h, sx * x, 0.007, back); };
      G.push(tubeGrid(q => at(q).p, () => 0.0028, q => at(q).k, { nu: 8, nv: 48, ry: () => 0.0011, up: [0, 1, 0], uv: [0.5, 0, 1, 1] })); }
    add({ id: 'camisa.tiras', item: ID, part: 0, mat: MAT_CLOTH, gloss: 0.35, zb: 0.004, grids: G, tw: 64, th: 128, paint(u, v, get, o) { const a = fract(u * 2), rib = 0.5 + 0.5 * Math.sin(v * 260);
      const edge = Math.abs(Math.cos(a * TAU)) > 0.82; set4(o, edge ? MAT.topE : MAT.topC.map(q => q * (0.78 + 0.3 * rib)), 1); } });   // elástico vermelho com debrum claro
  }
  /* ===== corrente da lombar: dois fios dourados + coração grande e dois pequenos (extrudados) + pingentes ===== */
  { const ID = ITEM_ID.corrente, TPg = (h, ang, off) => { const P = torsoPt(h, ang, off); P.k = torsoSkin(h); return P; }, G = [];
    const hAt = a => lerp(0.983, 1.008, Math.pow(Math.abs(Math.abs(a) - Math.PI) / (Math.PI - 1.9), 1.6));
    for (const drop of [0, 0.007]) { const path = q => { const a = lerp(1.9, TAU - 1.9, q); return TPg(hAt(a) - drop * Math.sin(q * Math.PI), a, 0.0045); };
      G.push(tubeGrid(q => path(q).p, () => 0.0011, q => path(q).k, { nu: 6, nv: 80, uv: [0, 0, 0.25, 1] })); }
    const heart = (a, size) => { const c = TPg(hAt(a) - 0.004, a, 0.006), [e1, e2] = tframeG(c.n), K = c.k, nz = c.n, T = 0.0011;   // contorno de coração com espessura
      const at = (q, s, d) => { const [hx, hy] = heartXY(q); return [c.p[0] - e1[0] * hx * size * s + e2[0] * hy * size * s + nz[0] * d, c.p[1] - e1[1] * hx * size * s + e2[1] * hy * size * s + nz[1] * d, c.p[2] - e1[2] * hx * size * s + e2[2] * hy * size * s + nz[2] * d]; };
      G.push({ nu: 36, nv: 5, uv: [0.25, 0, 0.75, 1], fn(u, v) { return { p: at(u, v, T + 0.0012 * (1 - v * v)), n: nz, k: K }; } });                           // frente (abaulada)
      G.push({ nu: 36, nv: 2, uv: [0.25, 0, 0.75, 1], fn(u, v) { return { p: at(u, v, -T), n: nz.map(q => -q), k: K }; } });                                       // costas
      G.push({ nu: 36, nv: 1, uv: [0.75, 0, 1, 1], fn(u, v) { const [hx, hy] = heartXY(u); return { p: at(u, 1, lerp(-T, T, v)), n: norm3([-e1[0] * hx + e2[0] * hy, -e1[1] * hx + e2[1] * hy, -e1[2] * hx + e2[2] * hy]), k: K }; } });   // lateral (aro dourado)
      return c; };
    const cc = heart(Math.PI, 0.013); heart(2.55, 0.0085); heart(-2.55, 0.0085);
    for (let k = 0; k < 2; k++) { const path = q => TPg(cc.p[1] - 0.012 - 0.026 * q, Math.PI + (k ? 0.035 : -0.035) * (1 - q * 0.5), 0.005 + 0.004 * q);
      G.push(tubeGrid(q => path(q).p, () => 0.0009, q => path(q).k, { nu: 5, nv: 16, uv: [0, 0, 0.25, 1] })); }
    add({ id: 'corrente', item: ID, part: 0, mat: MAT_METAL, gloss: 0.9, zb: 0.003, grids: G, tw: 128, th: 64, paint(u, v, get, o) {
      if (u < 0.25) return set4(o, (Math.floor(v * 160) % 2) ? MAT.gold.map(q => q * 0.8) : lerp3(MAT.gold, MAT.chain, 0.5).map(q => q * 0.8), 1);   // elos alternados
      if (u < 0.75) { const r = v; set4(o, lerp3([0.95, 0.12, 0.5], [1.4, 0.45, 1.0], smooth(0.35, 0, r) * 0.7).map(q => q * (r > 0.88 ? 0.6 : 1)), 1); return; }   // joia: miolo claro, borda funda
      set4(o, MAT.gold.map(q => q * 0.85), 1); } });
  }
  /* ===== liga (tiras do cós à meia rasgada, com regulador, presilha e gancho) — o MESMO caminho da partícula ===== */
  { const ID = ITEM_ID.liga, s = NET_S, F2 = limbFrame('hp' + s, 'kn' + s), TPg = (h, ang, off) => { const P = torsoPt(h, ang, off); P.k = torsoSkin(h); return P; }, G = [];
    const strapAt = (A, aLeg) => { const y0 = shortTop(A) - 0.004, y1 = SOCK.top[s] + 0.003, T0 = TPg(y0, A, 0.012), angT0 = Math.atan2(T0.p[0] - F2.A[0], T0.p[2] - F2.A[2]);
      const at = q => { const y = lerp(y0, y1, q), aL = lerp(angT0, aLeg, smooth(0, 0.6, q)), over = y > 0.84 ? 0.014 : 0.006, L2 = legAt(s, Math.min(y, 0.9), aL, over);
        const w = smooth(0.86, 0.915, y), P = w > 0 ? TPg(y, A, over) : null; const p = P ? lerp3(L2.p, P.p, w) : L2.p, nn = P ? norm3(lerp3(L2.n, P.n, w)) : L2.n;
        return { p, n: nn, k: y > 0.9 ? torsoSkin(y) : legSkin(s, y) }; };
      return q => { const a = at(Math.max(0, q - 0.02)).p, b = at(Math.min(1, q + 0.02)).p, P = at(q), t2 = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]); return [P, norm3(cross3(t2, P.n))]; }; };
    for (const [A, aL] of [[NETSG * 0.95, NETSG * 0.55], [NETSG * 2.35, NETSG * 2.45]]) { const sideOf = strapAt(A, aL);
      G.push({ nu: 2, nv: 40, uv: [0, 0, 0.5, 1], fn(u, v) { const [P, sd] = sideOf(v), d = (u * 2 - 1) * 0.0055, f = 0.0012; return { p: [P.p[0] + sd[0] * d + P.n[0] * f, P.p[1] + sd[1] * d + P.n[1] * f, P.p[2] + sd[2] * d + P.n[2] * f], n: P.n, k: P.k }; } });
      for (const [q, w, h, dd] of [[0.3, 0.0085, 0.0045, 0.0026], [0.985, 0.0075, 0.009, 0.003], [0.0, 0.006, 0.004, 0.0026]]) { const [P, sd] = sideOf(q), up = norm3(cross3(P.n, sd)), c = [P.p[0] + P.n[0] * dd, P.p[1] + P.n[1] * dd, P.p[2] + P.n[2] * dd];
        G.push(quadGrid(c, sd, up, w, h, P.n, P.k, { uv: [0.5, 0, 1, 1] })); } }
    add({ id: 'liga', item: ID, part: 5, mat: MAT_LEATHER, gloss: 0.5, zb: 0.004, grids: G, tw: 64, th: 128, paint(u, v, get, o) {
      if (u < 0.5) { const uu = u * 2; if (uu < 0.13 || uu > 0.87) return set4(o, MAT.strap.map(q => q * 0.7), 1); return set4(o, MAT.black.map(q => q * (1.3 + 0.9 * (0.5 + 0.5 * Math.sin(v * 520)))), 1); }   // elástico preto com debrum acetinado
      const uu = (u - 0.5) * 2, b = Math.min(uu, 1 - uu, v, 1 - v); set4(o, b < 0.22 ? SILV : SILV.map(q => q * 0.35), 1); } });   // ferragem de aço vazada
  }
  /* ===== rosto e cabelo em malha (botão próprio): os MESMOS contornos paramétricos dos traços de partícula,
     presos à junta da cabeça; olhos piscam, pupila dilata, boca abre e sorri ao vivo ===== */
  { const HR = restOf('head'), KH = [J.head, -1, 0], FP = X => X.F.faceP, needF = F => !!F.faceP;
    const fpt = (u, v, lift) => { const z = headZ(u, v); return { p: [HR[0] + u, HR[1] + HC[1] + v, HR[2] + HC[2] + z + lift], n: norm3([u / (HRAD[0] * HRAD[0]), v / (HRAD[1] * HRAD[1]), z / (HRAD[2] * HRAD[2])]), k: KH }; };
    const wideOf = eo => 1 + 0.12 * Math.max(0, eo - 1), half = sd => sd > 0 ? [0, 0, 0.5, 1] : [0.5, 0, 1, 1];
    const eyeG = [], linG = [], lashG = [], browG = [];
    for (const sd of [1, -1]) { const eoOf = P => sd > 0 ? P.eyeO[0] : P.eyeO[1];
      eyeG.push({ nu: 22, nv: 8, uv: half(sd), fn(u, v, X) { const P = FP(X), eo = eoOf(P), q = u * 2 - 1;   // globo: a amêndoa entre as pálpebras (fecha junto)
        return fpt(sd * (P.EX + q * P.EW * wideOf(eo)), P.EY + lerp(eyeLower(q, eo), eyeUpper(q, eo), v), 0.0013 + 0.0017 * Math.sin(Math.PI * v) * Math.sqrt(Math.max(0, 1 - q * q))); } });
      linG.push({ nu: 32, nv: 2, uv: half(sd), fn(u, v, X) { const P = FP(X), eo = eoOf(P), wide = wideOf(eo), q = lerp(-1, 1.6, u), wingL = sd === ASYM ? 0.019 : 0.013;   // delineado gatinho
        const th = (0.0006 + 0.0009 * smooth(-0.2, 1, q)) * (0.25 + 0.75 * smooth(-1, -0.6, q)) * (1 - smooth(1.05, 1.6, q) * 0.85);
        let x, y; if (q <= 1) { x = P.EX + q * P.EW * wide; y = P.EY + eyeUpper(q, eo) + 0.0002 + 0.0006 * smooth(-0.2, 1, q); } else { const f = (q - 1) / 0.6; x = P.EX + P.EW * wide + f * wingL; y = P.EY + eyeUpper(1, eo) + 0.0008 + f * wingL * 0.62; }
        return fpt(sd * x, y + th + (v * 2 - 1) * th, 0.0024); } });
      lashG.push({ nu: 40, nv: 3, uv: half(sd), fn(u, v, X) { const P = FP(X), eo = eoOf(P), wide = wideOf(eo), q = lerp(-0.7, 0.98, u), ang = 1.15 - 0.75 * smooth(-0.6, 1, q);   // cílios
        const len = (0.0022 + 0.0042 * smooth(-0.4, 1, q)) * (0.6 + 0.4 * Math.min(1, eo)) * 1.15;
        return fpt(sd * (P.EX + q * P.EW * wide + Math.cos(ang) * len * v), P.EY + eyeUpper(q, eo) + 0.0007 + Math.sin(ang) * len * v, 0.0027 + 0.0022 * v * v); } });
      browG.push({ nu: 26, nv: 3, uv: half(sd), fn(u, v, X) { const F = FP(X).F, raise = sd > 0 ? F.browL : F.browR, pa = u * 2 - 1;   // sobrancelha fina
        const y = 0.029 + raise * 0.0085 + 0.003 * (1 - pa * pa) + F.browAng * 0.0062 * (1 - pa) / 2 + 0.00025, th = 0.0012 * (1 - 0.7 * smooth(-0.5, 1, pa)) * (0.35 + 0.65 * smooth(-1, -0.75, pa)) + 0.00015;
        return fpt(sd * (0.036 + pa * 0.0165), y + (v * 2 - 1) * th, 0.0022); } });
    }
    add({ id: 'olhos', face: true, part: 1, mat: MAT_EYE, dyn: true, need: needF, grids: eyeG, tw: 8, th: 8, paint(u, v, get, o) { set4(o, [0.1, 0.05, 0.16], 1); } });
    add({ id: 'delineado', face: true, part: 1, mat: MAT_CLOTH, gloss: 0.5, dyn: true, need: needF, grids: linG, tw: 16, th: 16, paint(u, v, get, o) { set4(o, v > 0.72 ? [0.55, 0.08, 0.4] : [0.02, 0.008, 0.025], 1); } });
    add({ id: 'cilios', face: true, part: 1, mat: MAT_CLOTH, gloss: 0.3, atest: 0.45, dyn: true, need: needF, grids: lashG, tw: 256, th: 16, paint(u, v, get, o) { const au = fract(u * 2 * 30), on = Math.abs(au - 0.5) < 0.2 * (1 - 0.65 * v);
      set4(o, lerp3([0.06, 0.012, 0.05], [0.5, 0.1, 0.38], v * 0.6), on ? 1 : 0); } });
    add({ id: 'sobrancelhas', face: true, part: 1, mat: MAT_CLOTH, gloss: 0.2, atest: 0.45, dyn: true, need: needF, grids: browG, tw: 128, th: 16, paint(u, v, get, o) { const uu = fract(u * 2), st = 0.5 + 0.5 * Math.sin((uu * 70 + v * 3) * TAU), e = Math.min(v, 1 - v) * 2;
      set4(o, MAT.hairMid.map(q => q * (0.55 + 0.45 * st)), e > 0.25 + 0.45 * (1 - st) ? 1 : 0); } });
    // boca: abertura (escura, com dentes) + lábio de cima com arco do cupido + lábio de baixo mais cheio
    const mouthPt = (th, r, P) => { const F = P.F, cx = Math.cos(th), sn = Math.sin(th), sm = cx > 0 ? F.smileL : F.smileR, y0 = -0.06 + sm * 0.0095 * cx * cx - Math.abs(F.smileL - F.smileR) * 0.0006;
      const op = sn > 0 ? Math.max(0, P.mUp - 0.0011) : Math.max(0, P.mDn - 0.0011), ix = cx * P.mHalf * 0.92, iy = y0 + sn * op;
      if (r < 0.4) { const f = r / 0.4; return fpt(ix * f, lerp(-0.06 - Math.abs(F.smileL - F.smileR) * 0.0006, iy, f), 0.0012); }
      const f = (r - 0.4) / 0.6, thick = (sn >= 0 ? 0.0044 * (1 - 0.28 * Math.exp(-((cx * P.mHalf / 0.0045) ** 2))) : 0.0058) * Math.pow(Math.abs(sn), 0.6) * (0.85 + 0.3 * F.round);
      const ox = cx * P.mHalf * (1.02 + 0.04 * Math.abs(sn)), oy = iy + Math.sign(sn) * thick;
      return fpt(lerp(ix, ox, f), lerp(iy, oy, f), 0.0026 + 0.002 * Math.sin(Math.PI * Math.min(1, f * 1.25)) * Math.pow(Math.abs(sn), 0.4)); };
    add({ id: 'boca', face: true, part: 1, mat: MAT_LIPS, gloss: 0.8, dyn: true, need: needF, grids: [{ nu: 56, nv: 10, fn(u, v, X) { return mouthPt(u * TAU, v, FP(X)); } }], tw: 128, th: 32, paint(u, v, get, o) {
      if (v < 0.4) return set4(o, [0.07, 0.012, 0.045], 1);
      const cr = 0.86 + 0.14 * Math.sin(u * TAU * 70), ed = smooth(0.88, 1, v); set4(o, lerp3(MAT.lipstick.map(q => q * 0.5 * cr), MAT.lipstick.map(q => q * 0.3), 0.3 + 0.6 * ed), 1); } });
    // cabelo: cada cacho vira um tubo em volta da MESMA hélice da partícula (linha central, raio do cacho, voltas)
    add({ id: 'cabelo', face: true, part: 2, mat: MAT_HAIR, gloss: 0.5, dyn: true, need: F => !!(F.strandPts && F.strands), fill: hairFill, grids: Array.from({ length: 84 }, () => ({ nu: 6, nv: 46, fn: () => ({ p: [0, 0, 0], n: [0, 0, 1], k: [-1, -1, 0] }) })), tw: 256, th: 128,
      paint(u, v, get, o) { const lvl = Math.min(3, Math.floor(u * 4)), au = fract(u * 4), hl = (lvl + 0.5) / 4, c0 = smooth(0, 0.3, v), c1 = smooth(0.35, 1, v) * hl, fb = 0.68 + 0.5 * vnoiseP(au * 26, v * 5, 26);
        const c = lerp3(lerp3(MAT.hairRoot.map(q => q * 0.8), MAT.hairMid, c0), MAT.hairTip, c1 * 0.85); set4(o, [c[0] * fb * 0.62, c[1] * fb * 0.6, c[2] * fb * 0.62], 1); } });
  }
  return D;
}
// tatuagem: as MESMAS curvas TAT da partícula, pintadas num canvas em (ângulo, altura) da superfície do tronco
function tattooCanvas(cv, W, H, h0, h1, a0, a1) {
  const g = cv.getContext('2d'), X = (x, h) => (frontAng(h, x) - a0) / (a1 - a0) * W, Yp = h => (h - h0) / (h1 - h0) * H, col = (c, a = 1) => `rgba(${Math.round(clamp(c[0] / 2, 0, 1) * 255)},${Math.round(clamp(c[1] / 2, 0, 1) * 255)},${Math.round(clamp(c[2] / 2, 0, 1) * 255)},${a})`;
  const lw = 0.0016 / ((h1 - h0) / H);   // ~1,6 mm em pixels
  const curve = (P, sx) => { const C = P.map(([u, v]) => { const [x, h] = tatXY(sx, u, v); return [x, h, 0]; }); return s2 => crPath(C, s2, [0, 0, 0]); };
  const wAt = (st, s2) => st.w * (st.a > 0 ? smooth(0, st.a, s2) : 1) * Math.pow(1 - s2, 0.75);
  const path = pts => { g.beginPath(); pts.forEach(([x, h], i) => i ? g.lineTo(X(x, h), Yp(h)) : g.moveTo(X(x, h), Yp(h))); };
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const sx of [1, -1]) TAT.strokes.forEach((st, k) => {
    const f = curve(st.P, sx), nrm = s2 => { const a = f(Math.max(0, s2 - 0.01)), b = f(Math.min(1, s2 + 0.01)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const at = (s2, t2) => { const w = wAt(st, s2), c = f(s2), nn = nrm(s2); return [c[0] + nn[0] * w * t2 * 0.5, c[1] + nn[1] * w * t2 * 0.5]; };
    const M = 40, A = [], B = []; for (let i = 0; i <= M; i++) { A.push(at(i / M, 1)); B.push(at(i / M, -1)); }
    for (let i = 0; i < M; i++) { const q = i / M; path([A[i], A[i + 1], B[i + 1], B[i]]); g.closePath(); g.fillStyle = col(lerp3(lerp3(MAT.tatHeart, MAT.tatFill, smooth(0, 0.45, q)), MAT.tatTip, smooth(0.45, 1, q))); g.fill(); }   // rosa → magenta → quase preto na ponta
    path(A.concat(B.slice().reverse())); g.closePath(); g.strokeStyle = col(MAT.black.map(c => c * 0.4)); g.lineWidth = lw * 1.1; g.stroke();   // borda preta
    if (k < 5) { path(Array.from({ length: 30 }, (_, i) => at(0.08 + i / 29 * 0.7, 0.3))); g.strokeStyle = col([1.6, 0.85, 1.3], 0.8); g.lineWidth = lw * 0.45; g.stroke(); }   // reflexo cromado
  });
  for (const sx of [1, -1]) { const f = curve(TAT.arc, sx); path(Array.from({ length: 30 }, (_, i) => { const c = f(i / 29); return [c[0], c[1]]; })); g.strokeStyle = col(MAT.tatWing); g.lineWidth = lw * 0.9; g.stroke(); }
  const hs = TAT.heart; path(Array.from({ length: 60 }, (_, i) => { const [hx, hy] = heartXY(i / 59); return [hx * hs * 1.05, TAT.h + hy * hs * 1.05]; })); g.closePath();
  g.fillStyle = col(lerp3(MAT.tatHeart, MAT.tatFill, 0.35)); g.fill(); g.strokeStyle = col(MAT.black.map(c => c * 0.4)); g.lineWidth = lw * 1.3; g.stroke();
  path([[-0.35 * hs, TAT.h + 0.45 * hs], [-0.2 * hs, TAT.h + 0.38 * hs]]); g.strokeStyle = col([1.6, 0.9, 1.3]); g.lineWidth = lw * 0.6; g.stroke();
  TAT.dots.forEach((v, k) => { const [x, h] = tatXY(1, 0, v), r = 0.0026 * (1 - k * 0.17); path([[x, h + r], [x + r * 0.7, h], [x, h - r], [x - r * 0.7, h]]); g.closePath(); g.fillStyle = col(MAT.black.map(c => c * 0.4)); g.fill(); });
  const [sxS, syS] = tatXY(ASYM, TAT.tipMark[0], TAT.tipMark[1]), [sxM, syM] = tatXY(-ASYM, TAT.tipMark[0], TAT.tipMark[1]);
  g.strokeStyle = col(MAT.tatHeart); g.lineWidth = lw * 0.6; path([[sxS - 0.0045, syS], [sxS + 0.0045, syS]]); g.stroke(); path([[sxS, syS - 0.0055], [sxS, syS + 0.0055]]); g.stroke();   // estrela
  path(Array.from({ length: 24 }, (_, i) => { const a = lerp(0.6, TAU - 0.6, i / 23); return [sxM + Math.cos(a) * 0.0042, syM + Math.sin(a) * 0.0042]; })); g.stroke();   // lua
}
// veias: R = máscara, G = posição q ao longo da veia (o pulso corre no shader)
function veinCanvas(cv, W, H, h0, h1) {
  const g = cv.getContext('2d'), Xa = a => (a + Math.PI) / TAU * W, Yp = h => (h - h0) / (h1 - h0) * H, lw = 0.0019 / ((h1 - h0) / H), rr = mulberry32(77);
  g.lineCap = 'round';
  const seg = (h, a, h2, a2, q, w) => { if (Math.abs(a2 - a) > Math.PI) return; g.strokeStyle = `rgba(255,${Math.round(q * 255)},0,1)`; g.lineWidth = w; g.beginPath(); g.moveTo(Xa(a), Yp(h)); g.lineTo(Xa(a2), Yp(h2)); g.stroke(); };
  for (const sx of [1, -1]) { let prev = null; const M = 160;
    for (let i = 0; i <= M; i++) { const q = i / M, [h, a] = veinPath(sx, q), wob = 0.006 * Math.sin(q * 61 + sx) + 0.003 * Math.sin(q * 140), A2 = a + wob / Math.max(0.05, torsoAt(h)[0]);
      if (prev) seg(prev[0], prev[1], h, A2, q, lw); prev = [h, A2]; }
    for (let b = 0; b < 14; b++) { const q = 0.08 + 0.84 * rr(), [h, a] = veinPath(sx, q), br = (rr() - 0.5) * 0.06, L = 6;
      let p0 = [h, a]; for (let i = 1; i <= L; i++) { const f = i / L, hh = h + Math.abs(br) * 0.6 * f + 0.004 * Math.sin(f * 9 + b), aa = a + br * f / Math.max(0.05, torsoAt(hh)[0]); seg(p0[0], p0[1], hh, aa, q, lw * (1 - 0.6 * f)); p0 = [hh, aa]; } } }
}

/* ---------- construção (uma vez; espalhada por vários quadros para não travar) ---------- */
const LM = { ready: false, P: [], gen: null, ver: 0 };
function* meshBuildGen() {
  const defs = meshDefs();
  for (const d of defs) {
    const nG = d.grids.length; let nVert = 0, nIdx = 0; for (const G of d.grids) { nVert += (G.nu + 1) * (G.nv + 1); nIdx += G.nu * G.nv * 6; }
    const V = new Float32Array(nVert * 11), I = new Uint32Array(nIdx), ranges = [];
    let vb = 0, ib = 0;
    for (const G of d.grids) { const uv = G.uv || [0, 0, 1, 1], cols = G.nu + 1; ranges.push({ G, base: vb, cols, rows: G.nv + 1, uv });
      for (let j = 0; j < G.nv; j++) for (let i = 0; i < G.nu; i++) { const a = vb + j * cols + i, b = a + 1, c = a + cols, e = c + 1; I[ib++] = a; I[ib++] = b; I[ib++] = e; I[ib++] = a; I[ib++] = e; I[ib++] = c; }
      for (let j = 0; j <= G.nv; j++) for (let i = 0; i <= G.nu; i++) { const o = (vb + j * cols + i) * 11; V[o + 6] = lerp(uv[0], uv[2], i / G.nu); V[o + 7] = lerp(uv[1], uv[3], j / G.nv); }
      vb += cols * (G.nv + 1); }
    const P = { d, V, I, ranges, nVert, nIdx, tex: null };
    if (!d.dyn) meshFill(P, null);
    // textura própria da peça
    const W = d.tw, Hh = d.th;
    if (d.canvas) { const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; d.canvas(cv, W, Hh); P.tex = { w: W, h: Hh, data: new Uint8Array(cv.getContext('2d').getImageData(0, 0, W, Hh).data.buffer) }; }
    else { const data = new Uint8Array(W * Hh * 4), out = [0, 0, 0, 1]; let cnt = 0;
      for (let y = 0; y < Hh; y++) { for (let x = 0; x < W; x++) { const u = (x + 0.5) / W, v = (y + 0.5) / Hh;
          const gi = d.texGrid ? d.texGrid(v) : 0;
          const get = () => { const R = ranges[gi], uv = R.uv; return R.G.fn(clamp((u - uv[0]) / (uv[2] - uv[0]), 0, 1), clamp((v - uv[1]) / (uv[3] - uv[1]), 0, 1), null); };
          d.paint(u, v, get, out); const o = (y * W + x) * 4;
          data[o] = clamp(out[0] / 2, 0, 1) * 255; data[o + 1] = clamp(out[1] / 2, 0, 1) * 255; data[o + 2] = clamp(out[2] / 2, 0, 1) * 255; data[o + 3] = clamp(out[3], 0, 1) * 255; }
        if ((cnt += W) >= 6000) { cnt = 0; yield; } }
      P.tex = { w: W, h: Hh, data }; }
    LM.P.push(P); yield;
  }
  LM.ready = true; LM.ver++;
}
// avalia as grades: posição de repouso (ou de mundo, nas dinâmicas), normal numérica orientada pela dica, pesos
function meshFill(P, X) {
  const V = P.V;
  for (const R of P.ranges) { const G = R.G, cols = R.cols;
    for (let j = 0; j < R.rows; j++) for (let i = 0; i < cols; i++) { const o = (R.base + j * cols + i) * 11, s = G.fn(i / G.nu, j / G.nv, X);
      V[o] = s.p[0]; V[o + 1] = s.p[1]; V[o + 2] = s.p[2]; V[o + 3] = s.n[0]; V[o + 4] = s.n[1]; V[o + 5] = s.n[2]; V[o + 8] = s.k[0]; V[o + 9] = s.k[1]; V[o + 10] = s.k[2]; }
    for (let j = 0; j < R.rows; j++) for (let i = 0; i < cols; i++) {
      const at = (ii, jj) => (R.base + clamp(jj, 0, R.rows - 1) * cols + clamp(ii, 0, cols - 1)) * 11, a = at(i - 1, j), b = at(i + 1, j), c = at(i, j - 1), d = at(i, j + 1), o = at(i, j);
      const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[d] - V[c], vy = V[d + 1] - V[c + 1], vz = V[d + 2] - V[c + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz);
      if (l < 1e-12) continue; nx /= l; ny /= l; nz /= l;
      if (nx * V[o + 3] + ny * V[o + 4] + nz * V[o + 5] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      V[o + 3] = nx; V[o + 4] = ny; V[o + 5] = nz; }
  }
}
function meshBuildStep(budgetMs) {
  if (LM.ready) return; if (typeof document === 'undefined') return;
  if (!LM.gen) LM.gen = meshBuildGen();
  const t0 = performance.now(); while (performance.now() - t0 < budgetMs) { if (LM.gen.next().done) break; }
}

/* ---------- quietude: só pose/forma de verdade contam como movimento; respiração e balanço ambiente não ---------- */
/* ---------- presença: a malha fica o tempo todo, em qualquer pose ou gesto; só a TRANSFORMAÇÃO de troca de pose
   (e a construção/dissolução de forma ou de parte) a desfaz, e ela se refaz sozinha logo depois ---------- */
const MESH_ITEMS = (() => { const m = new Uint8Array(18); ['fone', 'coturnos', 'bloco', 'jaqueta', 'meias', 'short', 'camisa', 'piercing', 'choker', 'liga', 'corrente', 'chifres', 'cauda', 'asas', 'unhas', 'tatuagem'].forEach(n => m[ITEM_ID[n]] = 1); return m; })();
const MESH_DIM = 0.86;   // a partícula nunca some toda por baixo da malha: fica o brilho fino de fragmento
const MESH_POSE_T = 1.15;   // s de transformação depois de trocar de pose
const MESH_UI = { body: true, face: true };   // botões: malha do corpo / malha do rosto e cabelo
(() => { try { const v = JSON.parse(localStorage.getItem('lili.malha') || 'null'); if (v && typeof v === 'object') { MESH_UI.body = v.body !== false; MESH_UI.face = v.face !== false; } } catch (e) { } })();
function meshSave() { try { localStorage.setItem('lili.malha', JSON.stringify(MESH_UI)); } catch (e) { } }
function meshTick(F, eng, t, dt) {
  const ch = eng.char, A = F.meshA || (F.meshA = new Float32Array(6));
  if (F.meshQ == null) { F.meshQ = 0; F.meshStill = 0; F.meshW = [MESH_UI.body ? 1 : 0, MESH_UI.face ? 1 : 0]; }
  const pt = ch.poseT0 == null ? 0 : t - ch.poseT0;
  const busy = eng.progress < 0.985 || pt < MESH_POSE_T || eng.disintegrating;
  F.meshStill = busy ? 0 : F.meshStill + dt;
  F.meshW[0] += clamp((MESH_UI.body ? 1 : 0) - F.meshW[0], -dt * 2.5, dt * 1.6); F.meshW[1] += clamp((MESH_UI.face ? 1 : 0) - F.meshW[1], -dt * 2.5, dt * 1.6);
  if (!LM.ready && (MESH_UI.body || MESH_UI.face)) meshBuildStep(6);
  const qT = LM.ready ? smooth(0.1, 0.8, F.meshStill) : 0;     // nunca corte seco: some em ~0,3 s, refaz em ~0,8 s
  F.meshQ += clamp(qT - F.meshQ, -dt * 3.2, dt * 1.6);
  for (let p = 0; p < 6; p++) { const tg = F.meshQ * (1 - smooth(0, 0.3, Math.max(ch.dis[p], ch.disT[p]))); A[p] += clamp(tg - A[p], -dt * 4, dt * 1.4); if (A[p] < 1e-4) A[p] = 0; }
  return A;
}
// cabelo: tubo em volta da hélice de cada cacho (mesma linha central, raio e voltas da partícula), recalculado a cada quadro
function hairFill(P, X) {
  const F = X.F, SP = F.strandPts, SE = F.strandFrame, M = F.M, hs = F.strands, nS = hs.length, hf = X.ch.hairFloat || 0, V = P.V;
  const C = hairFill.C || (hairFill.C = new Float32Array(256 * 3)), E = hairFill.E || (hairFill.E = new Float32Array(256 * 3));
  P.ranges.forEach((R, k) => { const G = R.G, nv = G.nv, nu = G.nu, cols = R.cols;
    if (k >= nS) { for (let j = 0; j < R.rows; j++) for (let i = 0; i < cols; i++) { const o = (R.base + j * cols + i) * 11; V[o] = V[o + 1] = V[o + 2] = 0; V[o + 8] = -1; V[o + 9] = -1; V[o + 10] = 0; } return; }
    const st = hs[k], sA = st.sA, lvl = Math.min(3, Math.floor(st.hl * 4));
    for (let j = 0; j <= nv; j++) { const s = j / nv, fm = s * (M - 1), m0 = Math.min(M - 2, fm | 0), f = fm - m0, o = (k * M + m0) * 3, oe = (k * M + m0) * 6;
      const e1x = lerp(SE[oe], SE[oe + 6], f), e1y = lerp(SE[oe + 1], SE[oe + 7], f), e1z = lerp(SE[oe + 2], SE[oe + 8], f), e2x = lerp(SE[oe + 3], SE[oe + 9], f), e2y = lerp(SE[oe + 4], SE[oe + 10], f), e2z = lerp(SE[oe + 5], SE[oe + 11], f);
      const rc = (s < sA ? st.rc0 : lerp(st.rc0, st.rc1, smooth(sA, 1, s))) * (1 + hf * 0.3), phi = st.ph + TAU * st.turns * Math.pow(s, 1.12), cp = Math.cos(phi), sp = Math.sin(phi);
      C[j * 3] = lerp(SP[o], SP[o + 3], f) + (e1x * cp + e2x * sp) * rc; C[j * 3 + 1] = lerp(SP[o + 1], SP[o + 4], f) + (e1y * cp + e2y * sp) * rc; C[j * 3 + 2] = lerp(SP[o + 2], SP[o + 5], f) + (e1z * cp + e2z * sp) * rc;
      E[j * 3] = e2x; E[j * 3 + 1] = e2y; E[j * 3 + 2] = e2z; }
    for (let j = 0; j <= nv; j++) { const a = Math.max(0, j - 1) * 3, b = Math.min(nv, j + 1) * 3, s = j / nv;
      let tx = C[b] - C[a], ty = C[b + 1] - C[a + 1], tz = C[b + 2] - C[a + 2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let ax = ty * E[j * 3 + 2] - tz * E[j * 3 + 1], ay = tz * E[j * 3] - tx * E[j * 3 + 2], az = tx * E[j * 3 + 1] - ty * E[j * 3]; let al = Math.hypot(ax, ay, az);
      if (al < 1e-4) { ax = ty; ay = -tx; az = 0; al = Math.hypot(ax, ay) || 1; } ax /= al; ay /= al; az /= al;
      const bx = ty * az - tz * ay, by = tz * ax - tx * az, bz = tx * ay - ty * ax;
      const tub = st.tube * (1 - 0.3 * s) * 1.15 * (s > 0.9 ? 0.3 + 0.7 * smooth(1.0, 0.9, s) : 1) * (0.55 + 0.45 * smooth(0, 0.05, s));
      for (let i = 0; i <= nu; i++) { const an = i / nu * TAU, ca = Math.cos(an), sa = Math.sin(an), nx = ax * ca + bx * sa, ny = ay * ca + by * sa, nz = az * ca + bz * sa, o = (R.base + j * cols + i) * 11;
        V[o] = C[j * 3] + nx * tub; V[o + 1] = C[j * 3 + 1] + ny * tub; V[o + 2] = C[j * 3 + 2] + nz * tub; V[o + 3] = nx; V[o + 4] = ny; V[o + 5] = nz;
        V[o + 6] = (lvl + i / nu) / 4; V[o + 7] = s; V[o + 8] = -1; V[o + 9] = -1; V[o + 10] = 0; } }
  });
}

/* ---------- GPU: esfola no shader (mesma soma j1/j2/w2), projeção idêntica à do pack() ---------- */
function meshGL(ren) {
  const gl = ren.gl;
  const prog = ren.prog(`#version 300 es
    precision highp float; precision highp sampler2D;
    layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aUV; layout(location=3) in vec3 aK;
    uniform sampler2D uJ; uniform vec2 uCam; uniform vec4 uOrb; uniform float uSc; uniform vec2 uCen; uniform vec2 uRes; uniform vec2 uAnc; uniform float uZB;
    out vec3 vRest; out vec3 vN; out vec2 vUV;
    vec3 xf(int j, vec3 p, float w){ vec4 a=texelFetch(uJ,ivec2(j*3,0),0), b=texelFetch(uJ,ivec2(j*3+1,0),0), c=texelFetch(uJ,ivec2(j*3+2,0),0); return vec3(dot(a.xyz,p)+a.w*w, dot(b.xyz,p)+b.w*w, dot(c.xyz,p)+c.w*w); }
    void main(){
      vec3 P=aP, N=aN;
      if(aK.x>-0.5){ int j1=int(aK.x+0.5); float w2=aK.z; P=xf(j1,aP,1.0)*(1.0-w2); N=xf(j1,aN,0.0)*(1.0-w2);
        if(w2>0.0){ int j2=int(aK.y+0.5); P+=xf(j2,aP,1.0)*w2; N+=xf(j2,aN,0.0)*w2; } }
      vRest=aP; vUV=aUV;
      vec3 q=vec3(P.x-uCam.x,P.y-uCam.y,P.z);
      float x1=q.x*uOrb.x+q.z*uOrb.y, z1=-q.x*uOrb.y+q.z*uOrb.x; q=vec3(x1, q.y*uOrb.z-z1*uOrb.w, q.y*uOrb.w+z1*uOrb.z);
      float m1=N.x*uOrb.x+N.z*uOrb.y, n1=-N.x*uOrb.y+N.z*uOrb.x; vN=vec3(m1, N.y*uOrb.z-n1*uOrb.w, N.y*uOrb.w+n1*uOrb.z);
      float zc=clamp(q.z,-3.0,3.5), pr=5.0/(5.0-zc);
      vec2 s=vec2(uCen.x+(uAnc.x+(q.x-uAnc.x)*pr)*uSc, uCen.y-(uAnc.y+(q.y-uAnc.y)*pr)*uSc), c=s/uRes*2.0-1.0; c.y=-c.y;
      float w=1.0/pr; gl_Position=vec4(c*w, (-zc*0.25-uZB*0.25)*w, w);
    }`, `#version 300 es
    precision highp float;
    in vec3 vRest; in vec3 vN; in vec2 vUV; out vec4 o;
    uniform sampler2D uTex; uniform float uAlpha, uTime, uGloss, uCut, uAtest; uniform int uMat, uMode; uniform vec3 uHeadC, uMouth; uniform vec2 uVein; uniform vec4 uIris[2]; uniform vec4 uIrisC; uniform float uTeeth;
    float h3(vec3 p){ uvec3 q=uvec3(ivec3(floor(p))+ivec3(65536)); uint h=q.x*1664525u^(q.y*1013904223u)^(q.z*2654435761u); h^=h>>16; h*=2246822519u; h^=h>>13; h*=3266489917u; h^=h>>16; return float(h&65535u)/65535.0; }
    void main(){
      if(vRest.y<uCut) discard;
      vec4 tx=texture(uTex,vUV); vec3 alb=tx.rgb*2.0; float al=tx.a;
      // materialização em blocos de ~4 mm, em ordem aleatória: entra e sai aos poucos, nunca de uma vez
      float nb=h3(vRest*240.0), th=uAlpha*1.1-0.05;
      if(nb>th) discard;
      float edge=(1.0-smoothstep(0.0,0.1,th-nb))*(1.0-0.9*smoothstep(0.9,1.0,uAlpha));
      if((uMat<4||uMat==6||uMat>=8)&&al<uAtest) discard;
      vec3 N=normalize(vN); if(N.z<0.0) N=-N;
      vec3 L=normalize(vec3(-0.45,0.62,0.66)), L2=normalize(vec3(0.75,0.05,0.4)), H=normalize(L+vec3(0,0,1));
      float nl=dot(N,L), dif=uMat==0||uMat==6||uMat==7 ? clamp((nl+0.18)/1.18,0.0,1.0) : max(nl,0.0), d2=max(dot(N,L2),0.0);
      float rim=pow(1.0-N.z,3.0), sp=pow(max(dot(N,H),0.0), mix(12.0,110.0,uGloss))*uGloss;
      vec3 rimC=vec3(1.0,0.28,0.55);
      vec3 col=alb*(0.13+0.8*dif)+alb*vec3(0.55,0.25,0.75)*0.35*d2;
      if(uMat==0||uMat==6||uMat==7){ col+=alb*0.06+rimC*rim*0.32+vec3(0.9,0.6,1.0)*sp*0.3; }
      else if(uMat==2){ col+=vec3(0.75,0.76,0.95)*sp*1.3+vec3(0.6,0.34,0.9)*rim*0.35; }
      else if(uMat==3){ col=alb*(0.25+0.45*dif)+alb*sp*2.5+vec3(1.2)*pow(sp,3.0); }
      else if(uMat==5){ col=alb*(0.55+0.4*dif)+alb*0.35*(1.0-N.z)+rimC*rim*0.3; }
      else if(uMat==9){ col=alb*(0.22+0.75*dif)+vec3(1.0,0.6,0.85)*sp*0.35+rimC*rim*0.2;   // lábios brilhantes; dentes quando ela sorri aberto
        if(vUV.y<0.4){ float te=uTeeth*step(0.5,1.0-vUV.x)*smoothstep(0.18,0.34,vUV.y); col=mix(col, vec3(1.0,0.97,1.05)*(0.55+0.4*dif), te); } }
      else if(uMat==10){ col=alb*(0.2+0.85*dif)+vec3(1.0,0.78,0.55)*sp*0.55+rimC*rim*0.2; }   // cabelo: brilho quente ao longo do cacho
      else if(uMat==8){ vec3 l=vRest-uHeadC; vec4 I=l.x>0.0?uIris[0]:uIris[1]; vec2 d=(l.xy-I.xy)/I.z; float r=length(d);   // olho: íris de dados + pupila de gato
        col=vec3(0.045,0.02,0.09)+vec3(0.1,0.04,0.17)*(1.0-vUV.y);
        if(r<1.0){ float an=atan(d.y,d.x), rays=0.5+0.5*cos(an*14.0), ring=exp(-pow((r-0.62)/0.07,2.0)), dd=0.35+0.65*uIrisC.w;
          vec3 ic=uIrisC.rgb*(0.4+0.45*rays*smoothstep(0.3,0.95,r)+0.55*ring+0.5*smoothstep(0.82,0.97,r))*(0.7+0.5*dd);
          col=mix(col, ic, smoothstep(1.0,0.92,r));
          if(pow(d.x/max(0.04,I.w),2.0)+pow(d.y/0.86,2.0)<1.0) col=vec3(0.0); }
        vec2 hd=d-vec2(-0.32,0.4); col+=vec3(1.3,1.25,1.4)*exp(-dot(hd,hd)/0.018);
        col*=0.45+0.55*smoothstep(1.0,0.55,vUV.y); }
      else { col+=vec3(0.6,0.34,0.9)*rim*0.22+vec3(0.8)*sp*0.4; }
      if(uMat==6){ vec3 l=vRest-uHeadC; float u=abs(l.x), fz=smoothstep(0.02,0.06,l.z);   // olhos e boca ao vivo (abre, fala)
        float eye=exp(-pow((u-0.034)/0.022,2.0)-pow((l.y+0.004)/0.012,2.0));
        float mo=exp(-pow(l.x/(uMouth.x+0.004),2.0)-pow((l.y+0.06+uMouth.y*0.4)/(uMouth.y*0.6+0.006),2.0))*uMouth.z;
        col*=1.0-fz*(0.55*eye+0.85*mo); }
      float a=1.0;
      if(uMat==4){ float q=tx.g, pw=pow(0.5+0.5*sin(q*26.0-uTime*uVein.x),6.0); col=mix(vec3(1.0,0.22,0.78)*0.45,vec3(1.5,0.55,1.3),pw); a=tx.r*(0.35+0.65*pw)*tx.a; }
      else if(uMat==5) a=al;
      else if(uMat==7) a=al;
      // cor como estado: a malha segue o mesmo modo de cor das partículas
      float lum=dot(col,vec3(0.3,0.45,0.25));
      if(uMode==1){ float w=0.5+0.5*sin(vRest.y*4.2-uTime*2.1+vRest.x*1.6); col=mix(col, mix(vec3(1.0,0.25,0.62),vec3(0.28,0.8,1.0),w)*lum*1.6, 0.55); }
      else if(uMode==2){ float n=sin(vRest.x*31.0+uTime*0.6)*sin(vRest.y*26.0-uTime*0.45); col=mix(col, vec3(0.7,1.0,0.22)*lum*1.4, 0.45*smoothstep(0.15,0.5,n)); }
      else if(uMode==3){ col=vec3(lum*1.1)*vec3(0.86,0.82,1.0); }
      col=mix(col, vec3(1.0,0.32,0.9)*1.5, edge*0.75);            // borda que acabou de se formar brilha neon
      o=vec4(col,a);
    }`);
  const jt = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, jt);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, NJ * 3, 1, 0, gl.RGBA, gl.FLOAT, null);
  const parts = LM.P.map(P => {
    const vao = gl.createVertexArray(), vbo = gl.createBuffer(), ibo = gl.createBuffer(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, P.V, P.d.dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    const st = 44; gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, st, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, st, 24); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, st, 32);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, P.I, gl.STATIC_DRAW); gl.bindVertexArray(null);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, P.tex.w, P.tex.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, P.tex.data); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { P, vao, vbo, tex };
  });
  return { prog, jt, jbuf: new Float32Array(NJ * 12), parts, ver: LM.ver };
}
function meshDraw(ren, eng, cur) {
  const F = eng.form, A = F && F.meshA; if (!A || !LM.ready || !F.usesCharacter || !F.meshW) return;
  const WB = F.meshW[0], WF = F.meshW[1]; let any = 0; for (let p = 0; p < 6; p++) any = Math.max(any, A[p]); if (any * Math.max(WB, WF) < 0.002) return;
  LM.lastDraw = eng.t;
  const gl = ren.gl; if (!ren.mesh || ren.mesh.ver !== LM.ver) ren.mesh = meshGL(ren);
  const G = ren.mesh, ch = eng.char, JR = ch.JR, JP = ch.JP, jb = G.jbuf;
  for (let j = 0; j < NJ; j++) { const o = j * 9, rx = JREST[j * 3], ry = JREST[j * 3 + 1], rz = JREST[j * 3 + 2];
    for (let r = 0; r < 3; r++) { const b = (j * 3 + r) * 4, m0 = JR[o + r * 3], m1 = JR[o + r * 3 + 1], m2 = JR[o + r * 3 + 2]; jb[b] = m0; jb[b + 1] = m1; jb[b + 2] = m2; jb[b + 3] = JP[j * 3 + r] - (m0 * rx + m1 * ry + m2 * rz); } }
  gl.bindTexture(gl.TEXTURE_2D, G.jt); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NJ * 3, 1, gl.RGBA, gl.FLOAT, jb);
  const IW = F.itemW, X = { F, t: eng.t, ch };
  const alphaOf = d => A[d.part] * (d.face ? WF : WB) * (d.item >= 0 && IW ? IW[d.item] : 1);
  const v = eng.view, U = eng.ucam, pr = G.prog, u = pr.u;
  gl.useProgram(pr.p); gl.bindFramebuffer(gl.FRAMEBUFFER, cur.fbo); gl.viewport(0, 0, ren.w, ren.h);
  gl.uniform2f(u.uCam, eng.camX(), eng.camY()); gl.uniform4f(u.uOrb, Math.cos(U.yaw), Math.sin(U.yaw), Math.cos(U.pitch), Math.sin(U.pitch));
  gl.uniform1f(u.uSc, eng.screenScale()); gl.uniform2f(u.uCen, v.cx * v.W, v.cy * v.H); gl.uniform2f(u.uRes, ren.w, ren.h); gl.uniform2f(u.uAnc, F.persp ? F.persp[0] : 0, F.persp ? F.persp[1] : 0);
  gl.uniform1f(u.uTime, eng.t); gl.uniform1i(u.uMode, eng.colorMode | 0);
  { const h = restOf('head'); gl.uniform3f(u.uHeadC, h[0] + HC[0], h[1] + HC[1], h[2] + HC[2]); }
  const fu = F.faceU || [0.0175, 0.0011, 0]; gl.uniform3f(u.uMouth, fu[0], fu[1], WF > 0.5 ? 0 : fu[2]); gl.uniform2f(u.uVein, F.veinW || 3, F.charge || 0);
  const FPm = F.faceP;
  if (FPm) { const ir = FPm.IR, ia = [], wd = eo => 1 + 0.12 * Math.max(0, eo - 1);
    for (const sd of [1, -1]) { const eo = sd > 0 ? FPm.eyeO[0] : FPm.eyeO[1]; ia.push(sd * FPm.EX + FPm.gx, FPm.EY + FPm.gy + 0.001, ir * (0.9 + 0.1 * wd(eo)), FPm.slitW); }
    gl.uniform4fv(u.uIris, ia); gl.uniform4f(u.uIrisC, FPm.irisC[0], FPm.irisC[1], FPm.irisC[2], FPm.irisDef);
    const sm = (FPm.F.smileL + FPm.F.smileR) / 2; gl.uniform1f(u.uTeeth, clamp(FPm.F.teeth, 0, 1) * smooth(0.06, 0.22, FPm.F.open + sm * 0.06)); }
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.jt); gl.uniform1i(u.uJ, 0); gl.uniform1i(u.uTex, 1);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT); gl.disable(gl.BLEND);
  const cutP = F.mode === 'portrait' ? 1.12 : -10;
  const draw = (Q, al) => { const d = Q.P.d;
    if (d.dyn) { if (d.need && !d.need(F)) return; if (F.mode === 'portrait' && d.id === 'cauda') return;
      if (d.fill) d.fill(Q.P, X); else meshFill(Q.P, X); gl.bindBuffer(gl.ARRAY_BUFFER, Q.vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, Q.P.V); }
    const clipY = d.clip && IW && IW[d.clip.item] > 0.5 ? d.clip.y : -10;
    gl.uniform1f(u.uCut, d.id === 'cabelo' ? -10 : Math.max(cutP, clipY)); gl.uniform1f(u.uZB, d.zb || 0);
    gl.uniform1f(u.uAlpha, al); gl.uniform1i(u.uMat, d.mat); gl.uniform1f(u.uGloss, d.gloss); gl.uniform1f(u.uAtest, d.atest);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, Q.tex); gl.bindVertexArray(Q.vao); gl.drawElements(gl.TRIANGLES, Q.P.nIdx, gl.UNSIGNED_INT, 0); };
  const vis = G.parts.map(Q => [Q, alphaOf(Q.P.d)]).filter(([, al]) => al > 0.004);
  for (const [Q, al] of vis) if (Q.P.d.cls === 'opaque') draw(Q, al);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  for (const [Q, al] of vis) if (Q.P.d.cls === 'decal') draw(Q, al);
  for (const [Q, al] of vis) if (Q.P.d.cls === 'trans') draw(Q, al);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  for (const [Q, al] of vis) if (Q.P.d.cls === 'add') draw(Q, al);
  gl.depthMask(true); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.bindVertexArray(null);
}
