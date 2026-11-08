// cabeça: elipsoide no espaço local da junta da cabeça
const HC = [0, 0.075, 0.008], HRAD = [0.084, 0.108, 0.094];
function headZ(u, v) { const tp = v < 0 ? 1 - 0.32 * (v / HRAD[1]) ** 2 : 1, rx = HRAD[0] * tp; return HRAD[2] * Math.sqrt(Math.max(0.015, 1 - (u / rx) ** 2 - (v / HRAD[1]) ** 2)); }
/* tronco com curvas definidas: quadril largo, cintura fina, busto e glúteos marcados.
   seções elípticas já em unidades finais: [altura, meia-largura, meia-profundidade, deslocamento z] */
const TORSO = [[0.80, 0.132, 0.084, 0.0], [0.86, 0.175, 0.099, -0.013], [0.93, 0.169, 0.096, -0.012], [1.00, 0.128, 0.080, -0.004], [1.06, 0.101, 0.071, 0.0], [1.13, 0.108, 0.076, 0.004],
  [1.20, 0.121, 0.083, 0.009], [1.27, 0.133, 0.088, 0.013], [1.33, 0.136, 0.086, 0.010], [1.38, 0.142, 0.079, 0.002], [1.43, 0.132, 0.063, -0.004], [1.47, 0.063, 0.047, -0.008]];
function torsoAt(h) { for (let i = 0; i < TORSO.length - 1; i++) { const a = TORSO[i], b = TORSO[i + 1]; if (h <= b[0]) { const f = smooth(a[0], b[0], h); return [lerp(a[1], b[1], f), lerp(a[2], b[2], f), lerp(a[3], b[3], f)]; } } const l = TORSO[TORSO.length - 1]; return [l[1], l[2], l[3]]; }
const TORSO_LUT = (() => { const n = 160, L = new Float32Array(n * 3); for (let k = 0; k < n; k++) { const pr = torsoAt(0.78 + 0.7 * k / (n - 1)); L.set(pr, k * 3); } return L; })();
function torsoFast(h, out) { const f = clamp((h - 0.78) / 0.7, 0, 1) * 159, k = Math.min(158, f | 0), u = f - k, o = k * 3; out[0] = lerp(TORSO_LUT[o], TORSO_LUT[o + 3], u); out[1] = lerp(TORSO_LUT[o + 1], TORSO_LUT[o + 4], u); out[2] = lerp(TORSO_LUT[o + 2], TORSO_LUT[o + 5], u); }
// volumes sobre o elipsoide: busto na frente, glúteos atrás (curva de baixo mais firme que a de cima)
// busto mais cheio e separado (vale do decote marcado); glúteos redondos com dobra inferior firme — proporção da foto da liga
const bustB = (h, ax) => 0.054 * Math.exp(-(((ax - 0.064) / 0.046) ** 2)) * Math.exp(-(((h - 1.252) / (h > 1.252 ? 0.07 : 0.037)) ** 2));
const gluteB = (h, ax) => 0.05 * Math.exp(-(((ax - 0.068) / 0.06) ** 2)) * Math.exp(-(((h - 0.868) / (h > 0.868 ? 0.072 : 0.038)) ** 2));
function torsoBump(h, x, c) { const ax = Math.abs(x); return c > 0 ? bustB(h, ax) * smooth(0, 0.5, c) : gluteB(h, ax) * smooth(0, 0.5, -c); }
/* ponto e normal na superfície do tronco (repouso). ang: 0 = frente, +π/2 = lado +x, ±π = costas */
function torsoPt(h, ang, off = 0) {
  const pr = torsoAt(h), s = Math.sin(ang), c = Math.cos(ang), x = pr[0] * s;
  let z = pr[2] + pr[1] * c, nx = s / pr[0], nz = c / pr[1], ny = 0; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
  const b = torsoBump(h, x, c); z += (c >= 0 ? 1 : -1) * b;
  if (c > 0.6) z -= 0.005 * Math.exp(-((x / 0.0065) ** 2) - (((h - NAVEL.h) / 0.009) ** 2));   // umbigo
  if (c > 0) z += 0.009 * Math.exp(-(((h - 1.415) / 0.012) ** 2)) * smooth(0.03, 0.05, Math.abs(x)) * smooth(0.15, 0.12, Math.abs(x));   // clavículas
  if (b > 1e-4) { const e = 0.005, dbh = (torsoBump(h + e, x, c) - torsoBump(h - e, x, c)) / (2 * e), dbx = (torsoBump(h, x + e, c) - torsoBump(h, x - e, c)) / (2 * e), an = Math.abs(nz);
    nx -= dbx * an; ny = -dbh * an; const l2 = Math.hypot(nx, ny, nz); nx /= l2; ny /= l2; nz /= l2; }
  return { p: [x + nx * off, h + ny * off, z + nz * off], n: [nx, ny, nz] };
}
const NAVEL = { h: 1.032 };
const frontAng = (h, x) => Math.asin(clamp(x / torsoAt(h)[0], -0.985, 0.985));
const backAng = (h, x) => { const a = frontAng(h, x); return (a >= 0 ? Math.PI : -Math.PI) - a; };
function torsoSkin(h) { const J = JI; if (h < 1.0) return [J.root, J.spine, smooth(0.94, 1.06, h) * 0.5]; if (h < 1.2) return h < 1.1 ? [J.spine, J.root, smooth(1.06, 0.94, h) * 0.5] : [J.spine, J.chest, smooth(1.14, 1.27, h) * 0.5]; return [J.chest, J.spine, smooth(1.27, 1.14, h) * 0.5]; }
// membros (raio na raiz, raio na ponta, saliência de osso no início/fim); coxas e panturrilhas mais cheias
const LIMB = { neck: [0.04, 0.037, 0, 0], upper: [0.037, 0.029, 0, 0.16], fore: [0.026, 0.02, 0.12, 0.07], thigh: [0.082, 0.046, 0, 0.12], shin: [0.044, 0.027, 0.15, 0.09], foot: [0.031, 0.022, 0, 0] };
const capR = (L, u) => lerp(L[0], L[1], u) * (1 + 0.07 * Math.sin(Math.PI * u) + L[2] * Math.exp(-((u / 0.1) ** 2)) + L[3] * Math.exp(-(((1 - u) / 0.1) ** 2)));
const LK = { torso: 1, neck: 2, upper: 3, fore: 4, hand: 5, thigh: 7, shin: 8, foot: 9 };
/* superfície de um membro em repouso: u ao longo do osso, ang 0 = frente, +π/2 = lado +x */
const LIMBF = {};
function limbFrame(a, b) { const A = restOf(a), B = restOf(b), len = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), d = [(B[0] - A[0]) / len, (B[1] - A[1]) / len, (B[2] - A[2]) / len];
  const fw = norm3([-d[0] * d[2], -d[1] * d[2], 1 - d[2] * d[2]]), sx = norm3(cross3(fw, d)); return { A, B, len, d, fw, sx }; }
const SEGJ = { thigh: ['hp', 'kn'], shin: ['kn', 'an'], upper: ['sh', 'el'], fore: ['el', 'wr'] };
function limbPt(s, seg, u, ang, off = 0) {
  const key = s + seg, F = LIMBF[key] || (LIMBF[key] = limbFrame(SEGJ[seg][0] + s, SEGJ[seg][1] + s)), r = capR(LIMB[seg], u) + off, c = Math.cos(ang), sn = Math.sin(ang);
  const n = [F.fw[0] * c + F.sx[0] * sn, F.fw[1] * c + F.sx[1] * sn, F.fw[2] * c + F.sx[2] * sn];
  return { p: [F.A[0] + F.d[0] * F.len * u + n[0] * r, F.A[1] + F.d[1] * F.len * u + n[1] * r, F.A[2] + F.d[2] * F.len * u + n[2] * r], n };
}
const legSeg = y => y > 0.468 ? 'thigh' : 'shin';
function legU(s, seg, y) { const F = LIMBF[s + seg] || (LIMBF[s + seg] = limbFrame(SEGJ[seg][0] + s, SEGJ[seg][1] + s)); return clamp((F.A[1] - y) / (F.A[1] - F.B[1]), 0, 1); }
const legAt = (s, y, ang, off) => { const sg = legSeg(y); return limbPt(s, sg, legU(s, sg, y), ang, off); };
function limbSkin(s, seg, u) { const J = JI, a = J[SEGJ[seg][0] + s], b = J[SEGJ[seg][1] + s];
  if (u > 0.8) return [a, b, smooth(0.8, 1.02, u) * 0.5];
  if (u < 0.18 && seg !== 'shin' && seg !== 'fore') return [a, seg === 'thigh' ? J.root : J.chest, smooth(0.18, -0.02, u) * 0.5];
  return [a, -1, 0]; }
const legSkin = (s, y) => { const sg = legSeg(y); return limbSkin(s, sg, legU(s, sg, y)); };

/* ---------- guarda-roupa: medidas tiradas das referências ---------- */
// jaqueta de motoqueiro curta, de couro, aberta: bainha na cintura com cinto, lapelas largas com botão de pressão
const JK = { hem: 1.075, belt: 0.033, off: 0.017 };
const jkOpen = h => h < 1.205 ? 0.058 : lerp(0.058, 0.078, (h - 1.205) / 0.24);
const LAPEL = [[0.058, 1.205], [0.113, 1.312], [0.104, 1.366], [0.089, 1.353], [0.095, 1.402], [0.078, 1.445]];
// top curto vermelho, decote redondo
// top bralette: faixa sob o busto, decote em V profundo (o vale fica de fora, cruzado por tiras), alças finas
const TOP = { hem: 1.187, band: 1.212, vBot: 1.227, sx: 0.093, sh: 1.358 };
const topVx = h => TOP.sx * clamp((h - TOP.vBot) / (TOP.sh - TOP.vBot), 0, 1);              // borda interna do V na altura h
function topCov(x, h, c) {
  if (h < TOP.hem) return 0;
  if (c > 0.25) { const ax = Math.abs(x); if (h <= TOP.vBot) return 1;
    if (ax < TOP.sx) return ax >= topVx(h) && h <= TOP.sh ? 1 : 0;
    return h <= lerp(TOP.sh, 1.292, smooth(TOP.sx, 0.13, ax)) ? 1 : 0; }
  return h <= lerp(1.292, 1.257, smooth(0.25, -0.5, c)) ? 1 : 0;
}
const topNeck = (x, c) => c > 0.15 ? lerp(1.445, 1.352 + 0.085 * Math.min(1, (x / 0.075) ** 2), smooth(0.15, 0.45, c)) : 1.445;
// shortinho jeans de cintura baixa: mais baixo na frente, cavado nas laterais, bainha desfiada
const SHORT = { wbF: 0.925, wbB: 0.965, band: 0.03 };
const shortTop = ang => SHORT.wbF + (SHORT.wbB - SHORT.wbF) * (1 - Math.cos(ang)) / 2;
// corte assimétrico: atrás, do lado da meia rasgada, a barra sobe e deixa a curva de baixo do glúteo aparecer
const NETSG = ASYM_S === 'R' ? -1 : 1;                                                       // lado da meia rasgada em x
const shortRaise = ang => 0.085 * smooth(0.15, 0.75, -Math.cos(ang)) * smooth(0.08, 0.55, Math.sin(ang) * NETSG);
const shortHemT = ang => 0.8 + 0.054 * smooth(0.55, 0.98, Math.abs(Math.sin(ang))) + shortRaise(ang);
function shortHemLeg(s, n) { const outer = n[0] * (s === 'L' ? 1 : -1); let y = 0.792 + 0.062 * smooth(-0.15, 0.95, outer) + 0.006 * Math.max(0, n[2]);
  if (s === ASYM_S) y += 0.083 * smooth(-0.1, -0.75, n[2]) * smooth(-0.7, 0.1, outer); return y; }
// recorte vazado atrás, logo abaixo do cós, do mesmo lado
const shortCut = (ang, h) => h > 0.905 && h < 0.924 && Math.sin(ang) * NETSG > 0.25 && -Math.cos(ang) > 0.45;
// coturno: cano até a panturrilha baixa, solado tratorado alto, biqueira, ilhoses + ganchos, zíper lateral
const BOOT = { heel: -0.074, toe: 0.2, collar: 0.19, shaftLo: 0.096 };
const bootSole = zp => lerp(0.046, 0.031, smooth(-0.01, 0.1, zp));
function bootW(zp) { let w = zp < 0.03 ? lerp(0.044, 0.04, smooth(-0.05, 0.03, zp)) : lerp(0.04, 0.049, smooth(0.03, 0.125, zp));
  const q0 = (zp - BOOT.heel) / 0.028; if (q0 < 1) w *= Math.sqrt(clamp(q0 * (2 - q0), 0, 1));
  const q1 = (BOOT.toe - zp) / 0.065; if (q1 < 1) w *= Math.sqrt(clamp(q1 * (2 - q1), 0, 1)); return w; }
function bootTopY(zp) { let t = zp < 0.03 ? 0.122 : zp < 0.13 ? lerp(0.122, 0.088, smooth(0.03, 0.13, zp)) : lerp(0.088, 0.074, smooth(0.13, 0.19, zp));
  const q1 = (BOOT.toe - zp) / 0.05; if (q1 < 1) { const y0 = bootSole(zp); t = y0 + (t - y0) * Math.sqrt(clamp(q1 * (2 - q1), 0.05, 1)); } return t; }
const BP = 2.6;
function bootPt(s, zp, b, off = 0) { // forma do pé; b ∈ [0, π]: 0 = lado +x, π/2 = em cima, π = lado −x
  const an = restOf('an' + s), w = bootW(zp), y0 = bootSole(zp), t = bootTopY(zp), cb = Math.cos(b), sb = Math.max(0, Math.sin(b));
  const ex = Math.sign(cb) * Math.pow(Math.abs(cb), 2 / BP), ey = Math.pow(sb, 2 / BP);
  let nx = Math.sign(cb) * Math.pow(Math.abs(cb), 2 - 2 / BP) / Math.max(0.01, w), ny = Math.pow(sb, 2 - 2 / BP) / Math.max(0.01, t - y0);
  const l0 = Math.hypot(nx, ny) || 1; nx /= l0; ny /= l0; let nz = 1.6 * (smooth(BOOT.toe - 0.06, BOOT.toe, zp) - smooth(BOOT.heel + 0.03, BOOT.heel, zp));
  const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
  return { p: [an[0] + w * ex + nx * off, y0 + (t - y0) * ey + ny * off, an[2] + zp + nz * off], n: [nx, ny, nz] };
}
function shaftPt(s, y, a, off = 0) { // cano: elipse em volta do eixo da canela; a = 0 frente, +π/2 lado +x
  const kn = restOf('kn' + s), an = restOf('an' + s), f = clamp((kn[1] - y) / (kn[1] - an[1]), 0, 1), cx = lerp(kn[0], an[0], f), cz = lerp(kn[2], an[2], f) - 0.004;
  const rx = 0.049 + 0.003 * smooth(0.16, 0.19, y), rz = 0.056 + 0.002 * smooth(0.16, 0.19, y), sn = Math.sin(a), c = Math.cos(a);
  let nx = sn / rx, nz = c / rz; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
  return { p: [cx + rx * sn + nx * off, y, cz + rz * c + nz * off], n: [nx, 0, nz] };
}
const bootSkin = (s, y, zp = 0) => [JI['an' + s], JI['kn' + s], 1 - lerp(1, 0.35, smooth(0.07, 0.19, y) * smooth(0.06, 0.0, zp))];
// meias 7/8 diferentes: listrada do lado de lá, arrastão rasgada do lado dela; pele à mostra entre o short e a meia
const NET_S = ASYM_S, STRIPE_S = OTHER_S;
const SOCK = { top: { [STRIPE_S]: 0.712, [NET_S]: 0.736 }, cuff: 0.034, period: 0.034, band: 0.032 };
function sockStripe(y) { const d = SOCK.top[STRIPE_S] - y; if (d < 0) return -1; if (d < SOCK.cuff) return 0; return Math.floor((d - SOCK.cuff) / SOCK.period) % 2 === 0 ? 1 : 2; }
const NET = (() => { // rede rasgada: arestas de um diagrama de Voronoi num cilindro desenrolado (arco, altura); buracos grandes, algumas tramas arrebentadas
  const r = mulberry32(4242), S = [], R0 = 0.058, C = TAU * R0, y0 = BOOT.collar - 0.01, y1 = SOCK.top[NET_S] - SOCK.band; let tries = 0;
  while (tries < 12000) { tries++; const y = lerp(y0 - 0.02, y1 + 0.02, r()), a = r() * C, sp = lerp(0.034, 0.058, smooth(0.32, 0.66, y)) * (0.85 + 0.35 * r());
    if (S.every(q => { let da = Math.abs(q[0] - a); da = Math.min(da, C - da); return Math.hypot(da, q[1] - y) > sp; })) S.push([a, y]); }
  const near2 = (a, y) => { let i1 = -1, i2 = -1, d1 = 9, d2 = 9; for (let i = 0; i < S.length; i++) { let da = Math.abs(S[i][0] - a); da = Math.min(da, C - da); const d = Math.hypot(da, S[i][1] - y); if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = i; } else if (d < d2) { d2 = d; i2 = i; } } return [i1, i2]; };
  const E = [];
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    let da = S[j][0] - S[i][0]; if (da > C / 2) da -= C; if (da < -C / 2) da += C; const dy = S[j][1] - S[i][1], dd = Math.hypot(da, dy); if (dd > 0.13) continue;
    const mx = S[i][0] + da / 2, my = S[i][1] + dy / 2, px = -dy / dd, py = da / dd, pts = [];
    for (let t = -0.1; t <= 0.1; t += 0.002) { const a = mx + px * t, y = my + py * t; if (y < y0 || y > y1) { if (pts.length) break; continue; }
      const aw = ((a % C) + C) % C, [i1, i2] = near2(aw, y); if ((i1 === i && i2 === j) || (i1 === j && i2 === i)) pts.push([aw, y]); else if (pts.length) break; }
    if (pts.length < 3) continue;
    const roll = r(); if (roll < 0.1) continue;                                   // trama arrebentada: dois buracos viram um rasgo
    if (roll < 0.2 && pts.length > 8) { const c = pts.length >> 1, g = Math.max(2, (pts.length * 0.22) | 0); E.push(pts.slice(0, c - g)); E.push(pts.slice(c + g)); continue; }
    E.push(pts);
  }
  const W = E.map(() => 0.0032 + r() * 0.0032), G = new Map(), cell = 0.012, key = (a, y) => ((Math.floor(a / cell) + 1000) * 4096 + Math.floor(y / cell) + 1000);
  E.forEach((pts, e) => pts.forEach(([a, y]) => { const k = key(a, y); if (!G.has(k)) G.set(k, []); G.get(k).push(a, y, e); }));
  // junta as arestas em polilinhas longas pelos vértices em comum: linha contínua gastando poucas células
  const used = new Uint8Array(E.length), close = (p, q) => { let da = Math.abs(p[0] - q[0]); da = Math.min(da, C - da); return Math.hypot(da, p[1] - q[1]) < 0.006; }, P = [];
  for (let e = 0; e < E.length; e++) { if (used[e]) continue; used[e] = 1; let path = E[e].map(q => q.slice());
    for (let dir = 0; dir < 2; dir++) { let grew = true; while (grew) { grew = false; const end = path[path.length - 1];
        for (let f = 0; f < E.length; f++) { if (used[f]) continue; const Q = E[f]; if (close(Q[0], end)) { path = path.concat(Q.slice(1).map(q => q.slice())); used[f] = 1; grew = true; break; } if (close(Q[Q.length - 1], end)) { path = path.concat(Q.slice(0, -1).reverse().map(q => q.slice())); used[f] = 1; grew = true; break; } } }
      path.reverse(); }
    for (let i = 1; i < path.length; i++) { while (path[i][0] - path[i - 1][0] > C / 2) path[i][0] -= C; while (path[i][0] - path[i - 1][0] < -C / 2) path[i][0] += C; }
    const cum = [0]; for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const len = cum[cum.length - 1]; if (len < 0.004) continue;
    P.push({ len, at: q => { const d = q * len; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const f = (d - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]); return [lerp(path[i - 1][0], path[i][0], f), lerp(path[i - 1][1], path[i][1], f)]; } }); }
  return { S, C, R0, E, W, G, cell, key, P };
})();
function netStrand(ang, y) {
  if (y > SOCK.top[NET_S] - SOCK.band) return 1;
  const a = (((ang % TAU) + TAU) % TAU) * NET.R0, C = NET.C, ca = Math.floor(a / NET.cell), cy = Math.floor(y / NET.cell); let best = 1;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const L = NET.G.get(((ca + i + 1000) * 4096 + cy + j + 1000)); if (!L) continue;
    for (let k = 0; k < L.length; k += 3) { let da = Math.abs(L[k] - a); da = Math.min(da, C - da); const d = Math.hypot(da, L[k + 1] - y) - NET.W[L[k + 2]]; if (d < best) best = d; } }
  // costura do arco (a=0 ↔ C): a grade não dá a volta, então consulta o outro lado também
  if (a < NET.cell * 1.5 || a > C - NET.cell * 1.5) { const a2 = a < C / 2 ? a + C : a - C, ca2 = Math.floor((((a2 % C) + C) % C) / NET.cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const L = NET.G.get(((ca2 + i + 1000) * 4096 + cy + j + 1000)); if (!L) continue;
      for (let k = 0; k < L.length; k += 3) { let da = Math.abs(L[k] - a); da = Math.min(da, C - da); const d = Math.hypot(da, L[k + 1] - y) - NET.W[L[k + 2]]; if (d < best) best = d; } } }
  return smooth(0.0015, -0.001, best);
}
// fone over-ear branco descansando no pescoço: conchas sobre as clavículas, arco por trás do pescoço
const FONE = { cups: { 1: [0.088, 1.432, 0.097], [-1]: [-0.088, 1.432, 0.097] }, a: 0.04, b: 0.046 };
const foneN = sx => norm3([sx * 0.46, 0.32, 0.83]);
function foneOcc(x, y, z) {
  let o = 0;
  for (const sx of [1, -1]) { const c = FONE.cups[sx], d = Math.hypot(x - c[0], y - c[1], z - c[2]); o = Math.max(o, smooth(0.058, 0.04, d)); }
  return o;
}
/* materiais: cores reais das referências; o brilho neon da Lili entra como luz de borda */
const MAT = {
  leather: [0.1, 0.094, 0.125], sheen: [0.72, 0.72, 0.88], ledge: [0.4, 0.39, 0.5], silver: [1.1, 1.1, 1.24], stitchL: [0.46, 0.45, 0.55],
  top: [0.92, 0.07, 0.15], topEdge: [1.05, 0.34, 0.4],
  denim: [0.15, 0.31, 0.74], denimL: [0.45, 0.66, 1.05], denimD: [0.06, 0.13, 0.38], thread: [1.05, 0.64, 0.2], fray: [0.86, 0.92, 1.08], copper: [1.25, 0.74, 0.32],
  white: [1.1, 1.07, 1.12], black: [0.045, 0.04, 0.065], net: [0.44, 0.41, 0.56],
  sole: [0.17, 0.16, 0.2], soleEdge: [0.5, 0.48, 0.58], lace: [0.4, 0.38, 0.5],
  foneW: [1.3, 1.27, 1.36], foneC: [0.74, 0.71, 0.82], foneM: [0.9, 0.92, 1.06], cable: [0.82, 0.8, 0.9],
  hairRoot: [0.3, 0.14, 0.08], hairMid: [0.55, 0.27, 0.13], hairTip: [1.05, 0.6, 0.27],
  rim: [0.6, 0.34, 0.9]
};
const leatherAt = (x, y, z, k = 0) => { const s = Math.pow(0.5 + 0.5 * Math.sin(y * 95 + x * 31 + 6 * Math.sin(z * 41 + x * 23 + k)), 5), s2 = Math.pow(0.5 + 0.5 * Math.sin(y * 37 - z * 60 + x * 50 + k * 2), 9); return lerp3(MAT.leather, MAT.sheen, Math.min(1, 0.6 * s + 0.5 * s2 + 0.05)); };
function denimAt(x, y, z, nz, band) {
  const n1 = 0.5 + 0.5 * Math.sin(x * 70 + y * 52) * Math.sin(y * 90 - z * 40);
  let c = lerp3(MAT.denimD, MAT.denim, 0.55 + 0.45 * n1);
  if (band) return lerp3(c, MAT.denimD, 0.35);
  const wh = Math.pow(0.5 + 0.5 * Math.sin(y * 260 + Math.abs(x) * 70), 8) * smooth(0.2, 0.6, nz) * smooth(0.79, 0.81, y) * smooth(0.88, 0.85, y) * smooth(0.015, 0.03, Math.abs(x));   // bigodes de lavagem
  return lerp3(c, MAT.denimL, Math.min(1, 0.22 * Math.max(0, nz) + 0.75 * wh));
}
