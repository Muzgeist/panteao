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
const INK = 8, INKS = 9;   // formas de tinta: escurecem o quadro (preto de verdade) numa segunda passada
/* ---------- súcubo digital: joias, tiras e traços de demônio ---------- */
Object.assign(MAT, {
  topC: [0.78, 0.05, 0.13], topE: [1.1, 0.3, 0.38], gold: [1.25, 0.86, 0.38], gem: [1.4, 1.3, 1.5], chain: [1.15, 1.02, 0.8], steel: [1.05, 1.05, 1.18],
  hornA: [0.38, 0.02, 0.07], hornB: [1.2, 0.16, 0.22], tailA: [0.7, 0.06, 0.46], tailB: [1.3, 0.4, 0.85], heartHi: [1.5, 0.8, 1.2],
  wingM: [1.1, 0.1, 0.6], wingBone: [0.62, 0.05, 0.24], wingEdge: [1.45, 0.38, 0.95], wingF: [0.3, 0.2, 0.34], nail: [0.5, 0.05, 0.28], nailHi: [1.25, 0.4, 1.0], scale: [0.85, 0.22, 0.62],
  tatHeart: [1.35, 0.38, 0.78], tatEdge: [1.25, 0.2, 0.7], tatFill: [0.55, 0.04, 0.3], tatWing: [0.95, 0.1, 0.55], tatTip: [0.4, 0.02, 0.2], vein: [1.0, 0.22, 0.78], strap: [0.34, 0.3, 0.4], lipstick: [1.4, 0.3, 0.62]
});
// cor como estado: pingente do choker, íris e brilho do colo seguem o modo de cor ativo
function modeColor(mode, t, o) {
  if (mode === 1) { const wv = (0.5 + 0.5 * Math.sin(t * 0.9)) * 3.999, k0 = wv | 0, f = wv - k0, A = CYCLE[k0], B = CYCLE[k0 + 1]; o[0] = lerp(A[0], B[0], f) * 1.2; o[1] = lerp(A[1], B[1], f) * 1.2; o[2] = lerp(A[2], B[2], f) * 1.2; }
  else if (mode === 2) { o[0] = PAL.glitch[0] * 1.2; o[1] = PAL.glitch[1] * 1.25; o[2] = PAL.glitch[2] * 1.2; }
  else if (mode === 3) { o[0] = 1.15; o[1] = 1.12; o[2] = 1.3; }
  else { o[0] = PAL.magenta[0] * 1.25; o[1] = PAL.magenta[1] * 1.15; o[2] = PAL.magenta[2] * 1.25; }
  return o;
}
// coração paramétrico: q 0..1 dá a volta; ponta para baixo, centrado
function heartXY(q) { const t = q * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); return [x / 17, (y + 3.5) / 15]; }
const inHeart = (x, y) => { const X = x * 1.1, Y = (y - 0.22) * 1.15 + 0.25; return Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y < 0; };
// tatuagem tribal no baixo-ventre (referência do usuário): coração no centro, arcos em volta, duas lâminas grandes por lado
// subindo para fora até um gancho, lâmina de baixo, chama interna, espinhos, ponta em V com losangos e estrela/lua nas pontas.
// Coordenadas (u, v): u = fração da meia-largura TW, v em unidades de TV acima/abaixo do coração
const TAT = { h: 0.978, heart: 0.019, TW: 0.11, TV: 0.072,
  // traços: pontos de controle, largura máx (m), começo pontudo?
  strokes: [
    { P: [[0.12, 0.18], [0.3, 0.5], [0.52, 0.74], [0.76, 0.8], [0.95, 0.66], [1.03, 0.44]], w: 0.016, a: 0.18 },       // lâmina de cima: sobe em arco e fecha em gancho
    { P: [[0.1, -0.02], [0.32, 0.18], [0.58, 0.34], [0.82, 0.32], [1.0, 0.14]], w: 0.012, a: 0.2 },                       // lâmina do meio
    { P: [[0.16, -0.26], [0.42, -0.16], [0.7, -0.12], [0.9, -0.24], [0.98, -0.46]], w: 0.01, a: 0.2 },                    // lâmina de baixo, ponta caindo
    { P: [[0.07, -0.32], [0.14, -0.06], [0.22, 0.28], [0.18, 0.62], [0.08, 0.86]], w: 0.009, a: 0.25 },                   // chama interna subindo ao lado do coração
    { P: [[0.0, -0.5], [0.12, -0.36], [0.3, -0.32], [0.48, -0.42], [0.55, -0.6]], w: 0.008, a: 0.05 },                    // base em V com ponta para baixo
    { P: [[0.38, 0.6], [0.36, 0.86], [0.27, 1.02]], w: 0.0055, a: 0.3 },                                                  // espinhos
    { P: [[0.66, 0.78], [0.7, 1.0], [0.63, 1.12]], w: 0.005, a: 0.3 },
    { P: [[0.6, 0.3], [0.68, 0.1], [0.62, -0.02]], w: 0.005, a: 0.3 },
    { P: [[0.86, 0.3], [0.96, 0.04], [0.9, -0.06]], w: 0.0048, a: 0.3 },
    { P: [[0.52, -0.14], [0.6, -0.36], [0.54, -0.48]], w: 0.0048, a: 0.3 },
    { P: [[0.8, -0.14], [0.86, -0.4], [0.8, -0.52]], w: 0.0045, a: 0.3 }],
  arc: [[0.0, -0.34], [0.12, -0.26], [0.18, -0.04], [0.15, 0.17], [0.06, 0.26]],                                        // parêntese em volta do coração
  dots: [-0.57, -0.64, -0.71, -0.78], tipMark: [0.82, 1.08],
  blades: [[0.108, -0.033], [0.108, -0.033]],   // ponta de saída das veias (x, Δh) — ponta da lâmina de baixo
  base: k => [0.014 + 0.002 * k, 0.006 - 0.0042 * k] };
const tatXY = (sx, u, v) => [sx * u * TAT.TW, TAT.h + v * TAT.TV];
// veias de glitch: da ponta da asa da tatuagem, pela lateral da barriga, até a coluna e subindo até a nuca
function veinPath(sx, q) {
  const tip = TAT.blades[1], a0 = frontAng(TAT.h + tip[1], tip[0]);
  if (q < 0.42) { const f = q / 0.42, h = lerp(TAT.h + tip[1], 1.055, f * f), ang = sx * lerp(a0, Math.PI * 0.985, Math.pow(f, 0.8)); return [h, ang]; }
  const f = (q - 0.42) / 0.58, h = lerp(1.055, 1.475, f), ang = sx * lerp(Math.PI * 0.985, Math.PI * 0.995, f); return [h, ang];
}
// lábios do beijo (marca de batom na tela): contorno do lábio de cima (arco do cupido) e de baixo, em unidades de meia-boca
function lipsXY(q, upper) {
  const x = lerp(-1, 1, q);
  if (upper) return [x, 0.05 + 0.32 * Math.pow(1 - x * x, 0.6) - 0.12 * Math.exp(-((x / 0.18) ** 2))];
  return [x, -0.05 - 0.42 * Math.pow(1 - x * x, 0.75)];
}
// curva Catmull-Rom por pontos de controle
function crPath(C, s, out) { const f = clamp(s, 0, 1) * (C.length - 1), i = Math.min(C.length - 2, f | 0), u = f - i, P0 = C[Math.max(0, i - 1)], P1 = C[i], P2 = C[i + 1], P3 = C[Math.min(C.length - 1, i + 2)];
  for (let d = 0; d < 3; d++) out[d] = 0.5 * ((2 * P1[d]) + (-P0[d] + P2[d]) * u + (2 * P0[d] - 5 * P1[d] + 4 * P2[d] - P3[d]) * u * u + (-P0[d] + 3 * P1[d] - 3 * P2[d] + P3[d]) * u * u * u); return out; }
// cauda: sai da lombar por baixo do cós, cai atrás das pernas e a ponta sobe enrolando do lado dela (referencial do quadril)
const TAIL_C = [[0, -0.003, -0.118], [0, -0.045, -0.205], [NETSG * 0.07, -0.27, -0.265], [NETSG * 0.2, -0.49, -0.2], [NETSG * 0.3, -0.6, -0.065], [NETSG * 0.33, -0.5, 0.02]];
const tailRest = s => crPath(TAIL_C, s, [0, 0, 0]);
const TAIL = { HS: 0.04, r0: 0.011, r1: 0.0055 };
// asas: pontos-chave no plano da asa (u para fora, v para cima), abertas e recolhidas
const WING = { open: { W: [0.24, 0.1], th: [0.26, 0.15], F: [[0.62, 0.34], [0.7, 0.05], [0.56, -0.24], [0.34, -0.38]], B: [0.02, -0.22] },
  fold: { W: [0.07, 0.12], th: [0.08, 0.16], F: [[0.1, 0.28], [0.12, 0.11], [0.09, -0.05], [0.055, -0.15]], B: [0.02, -0.19] } };
function wingKeys(spread, o) {   // o: {W, th, F[4], B} já interpolados
  const s = smooth(0, 1, spread), A = WING.fold, Bk = WING.open, L2 = (a, b) => [lerp(a[0], b[0], s), lerp(a[1], b[1], s)];
  o.W = L2(A.W, Bk.W); o.th = L2(A.th, Bk.th); o.F = A.F.map((f, k) => L2(f, Bk.F[k])); o.B = L2(A.B, Bk.B); return o; }
function wingUV(K, kind, k, a, b) {   // kind 0 membrana (painel k), 1 osso k, 2 borda de ataque
  const O = [0, 0], W = K.W, F = K.F, L2 = (p, q, f) => [lerp(p[0], q[0], f), lerp(p[1], q[1], f)];
  if (kind === 1) { const t = a; if (k === 0) return L2(O, W, t); if (k === 1) return L2(W, K.th, t); return L2(W, F[k - 2], t); }
  if (kind === 2) return a < 0.4 ? L2(O, W, a / 0.4) : L2(W, F[0], (a - 0.4) / 0.6);
  if (k === 0) { const e = L2(W, F[0], b); return L2(O, e, a); }
  if (k < 4) { const sc = 1 - 0.17 * Math.sin(Math.PI * b), e = L2(F[k - 1], F[k], b); return L2(W, [W[0] + (e[0] - W[0]) * sc, W[1] + (e[1] - W[1]) * sc], a); }
  const e1 = L2(O, K.B, b), e2 = L2(W, F[3], b), p = L2(e1, e2, a), dent = 0.08 * Math.sin(Math.PI * a) * smooth(0.7, 1, b); return [p[0] + (W[0] - p[0]) * dent, p[1] + (W[1] - p[1]) * dent];
}
const WROOT = sx => [sx * 0.06, 1.335, -0.098];
function wingRest(sx, k, a, b) { const K = wingKeys(1, {}), uv = wingUV(K, 0, k, a, b), sw = 0.42, U = [sx * Math.cos(sw), 0, -Math.sin(sw)], R = WROOT(sx); return [R[0] + U[0] * uv[0], R[1] + uv[1], R[2] + U[2] * uv[0]]; }
/* oclusão analítica (render aditivo não tem z-buffer): o raio da partícula até a câmera cruza o tronco/cabeça? */
function occEllipse2(px, pz, cx, cz) {          // coordenadas já normalizadas pelos raios; retorna 0..1
  const A = cx * cx + cz * cz; if (A < 1e-6) return 0;
  const B = 2 * (px * cx + pz * cz), C = px * px + pz * pz - 1, disc = B * B - 4 * A * C; if (disc <= 0) return 0;
  const sq = Math.sqrt(disc), t2 = (-B + sq) / (2 * A); if (t2 <= 0) return 0;
  return smooth(0.0, 0.045, sq / A);   // corda em unidades de mundo; borda suave = sem cintilação
}
function occEllipsoid(px, py, pz, cx, cy, cz) {
  const A = cx * cx + cy * cy + cz * cz, B = 2 * (px * cx + py * cy + pz * cz), C = px * px + py * py + pz * pz - 1, disc = B * B - 4 * A * C; if (disc <= 0) return 0;
  const sq = Math.sqrt(disc), t2 = (-B + sq) / (2 * A); if (t2 <= 0) return 0;
  return smooth(0.0, 0.05, sq / A);
}
const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lerp3 = (a, b, f) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
const rotAxis = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a), d = v[0] * k[0] + v[1] * k[1] + v[2] * k[2], x = cross3(k, v); return [v[0] * c + x[0] * s + k[0] * d * (1 - c), v[1] * c + x[1] * s + k[1] * d * (1 - c), v[2] * c + x[2] * s + k[2] * d * (1 - c)]; };

const ITEM_ID = { fone: 0, coturnos: 1, bloco: 2, costura: 3, jaqueta: 4, meias: 5, short: 6, camisa: 7, piercing: 8, choker: 9, liga: 10, corrente: 11, chifres: 12, cauda: 13, asas: 14, unhas: 15, tatuagem: 16, corpo: 17 };
const ROLL_U = { [ASYM_S]: 0.2, [OTHER_S]: 0.93 };       // manga do lado dela empurrada até o cotovelo; a outra vai ao pulso
/* fatias de células por papel (fração de N). Acessórios têm geometria própria — é o que os deixa nítidos */
const ALLOC_FULL = { shell: 0.037, eyes: 0.03, faceX: 0.01, brows: 0.005, mouth: 0.017, nose: 0.004, hair: 0.205, neck: 0.01, torso: 0.135, upper: 0.019, fore: 0.015, hand: 0.022, thigh: 0.033, shin: 0.025, foot: 0.01,
  orb: 0.005, prop: 0.024, kiss: 0.009, fone: 0.024, boots: 0.044, jacketI: 0.028, camisaI: 0.01, shortI: 0.022, sockI: 0.028, bloco: 0.011, costura: 0.005, corpo: 0.002,
  piercing: 0.0025, choker: 0.012, liga: 0.01, corrente: 0.01, chifres: 0.012, cauda: 0.03, asas: 0.05, unhas: 0.014, tatuagem: 0.062 };
const ALLOC_PORT = { shell: 0.1, eyes: 0.09, faceX: 0.03, brows: 0.016, mouth: 0.055, nose: 0.012, hair: 0.27, neck: 0.03, torso: 0.12, upper: 0.028, fone: 0.05, jacketI: 0.03, camisaI: 0.02, choker: 0.03, chifres: 0.03 };

/* mapa de vestuário de um slot de corpo (estático, em espaço de repouso): quanto cada peça cobre o slot,
   deslocamento (bota tem forma própria, maior que o pé) e a cor do material naquele ponto */
function clothMap(o) {
  const m = { covJ: 0, offJ: JK.off, covS: 0, covH: 0, covM: 0, covB: 0, sheer: 0, colo: 0, bd: null, colJ: null, colS: null, colH: null, colM: null, colB: null };
  const x = o.x, y = o.y, z = o.z, s = o.sideS;
  switch (o.lk) {
    case LK.torso: {
      const h = o.lu, ang = o.ang, c = Math.cos(ang);
      if (h >= JK.hem - 0.002 && !(c > 0 && Math.abs(x) < jkOpen(h))) { m.covJ = 1; m.colJ = leatherAt(x, y, z); if (h > 1.43) m.offJ += smooth(1.43, 1.47, h) * 0.014; }
      if (topCov(x, h, c)) { m.covS = 1; const rib = 0.5 + 0.5 * Math.sin(x * 430 + z * 60); m.colS = [MAT.topC[0] * (0.8 + 0.3 * rib), MAT.topC[1] * (0.8 + 0.3 * rib), MAT.topC[2] * (0.84 + 0.22 * rib)];
        if (h > 1.23 && c > 0.25) m.sheer = smooth(0.25, 0.6, Math.sin(x * 95 + h * 70) * Math.sin(h * 130 - x * 40)); }      // trama translúcida no alto do bojo
      const wb = shortTop(ang); if (h <= wb && h >= shortHemT(ang) - 0.004 && !shortCut(ang, h)) { m.covH = 1; m.colH = denimAt(x, y, z, o.nz, h > wb - SHORT.band); }
      if (c > 0.3) m.colo = Math.exp(-((x / 0.075) ** 2) - (((h - 1.33) / 0.075) ** 2));      // colo: brilho sob a pele
      break; }
    case LK.upper: m.covJ = 1; m.colJ = leatherAt(x, y, z, 1); m.offJ = 0.016 + 0.012 * Math.exp(-((o.lu / 0.13) ** 2)); m.sheer = 0.8 * smooth(0.35, 0.75, Math.sin(o.lu * 40 + Math.atan2(o.nx, o.nz) * 3)) * smooth(0.3, 0.6, o.lu); break;
    case LK.fore: { const ru = ROLL_U[s]; m.covJ = smooth(ru + 0.012, ru - 0.012, o.lu); m.colJ = leatherAt(x, y, z, 2); m.offJ = 0.015 + (s === ASYM_S ? 0.013 * smooth(ru - 0.09, ru, o.lu) : 0); m.sheer = 0.8 * smooth(0.35, 0.75, Math.sin(o.lu * 34 - Math.atan2(o.nx, o.nz) * 3 + 1)); break; }
    case LK.thigh: if (y >= shortHemLeg(s, [o.nx, o.ny, o.nz])) { m.covH = 1; m.colH = denimAt(x, y, z, o.nz, false); } sockMap(m, o); break;
    case LK.shin: sockMap(m, o); if (y < BOOT.collar + 0.004) bootMapShin(m, o); break;
    case LK.foot: sockMap(m, o); bootMapFoot(m, o); break;
  }
  return m;
}
function sockMap(m, o) {
  const y = o.y;
  if (o.sideS === STRIPE_S) { const st = sockStripe(y); if (st < 0) return; m.covM = 1; const rib = 0.5 + 0.5 * Math.sin(Math.atan2(o.nx, o.nz) * 26); m.colM = st === 1 ? MAT.white : st === 0 ? lerp3(MAT.black, MAT.net, 0.45 * rib) : MAT.black; }
  else { if (y > SOCK.top[NET_S]) return; m.covM = netStrand(Math.atan2(o.nx, o.nz), y); m.colM = lerp3(MAT.black, MAT.net, 0.2); }
}
function bootMapFoot(m, o) {
  const an = restOf('an' + o.sideS), zp = clamp(o.z - an[2], BOOT.heel + 0.004, BOOT.toe - 0.004); let tgt;
  if (o.ny < -0.45) { const w = bootW(zp) + 0.004; tgt = [an[0] + clamp(o.x - an[0], -w, w), 0.004, an[2] + zp]; m.colB = MAT.sole; }
  else { const b = Math.atan2(Math.max(0, o.ny + 0.2), o.nx); tgt = bootPt(o.sideS, zp, b).p; m.colB = leatherAt(tgt[0], tgt[1], tgt[2], 3); }
  m.covB = 1; m.bd = [tgt[0] - o.x, tgt[1] - o.y, tgt[2] - o.z];
}
function bootMapShin(m, o) {
  const an = restOf('an' + o.sideS), a = Math.atan2(o.nx, o.nz); let tgt;
  if (o.y >= BOOT.shaftLo) tgt = shaftPt(o.sideS, o.y, a).p;
  else { const zp = clamp(o.z - an[2], BOOT.heel + 0.01, 0.03), b = Math.atan2(Math.max(0, o.ny + 0.5), o.nx); tgt = bootPt(o.sideS, zp, b).p; }
  m.covB = 1; m.bd = [tgt[0] - o.x, tgt[1] - o.y, tgt[2] - o.z]; m.colB = leatherAt(tgt[0], tgt[1], tgt[2], 4);
}

// olho amendoado/felino: canto de fora puxado para cima, arco de cima alto perto do canto de dentro, de baixo mais reto
const eyeTilt = (q, eo) => 0.0052 * q - (1 - Math.min(1, eo)) * 0.0018 * (1 - q * q);
const eyeUpper = (q, eo) => eyeTilt(q, eo) + eo * 0.0118 * Math.pow(Math.max(0, 1 - q * q), 0.62) * (1 - 0.2 * q);
const eyeLower = (q, eo) => eyeTilt(q, eo) - eo * 0.0058 * Math.pow(Math.max(0, 1 - q * q), 0.95) * (1 + 0.12 * q);

class SlotBuilder {
  constructor() { this.L = []; }
  add(o) { this.L.push(o); return this.L.length - 1; }
}
// enquadramentos para examinar as peças de perto
const VIEW_FOCUS = {
  rosto: ch => { const h = ch.joint('head'); return { x: h[0], y: h[1] + 0.05, zoom: 3.0 }; },
  tronco: ch => { const c = ch.joint('chest'); return { x: c[0], y: c[1] - 0.07, zoom: 2.0 }; },
  quadril: ch => { const r = ch.joint('root'); return { x: r[0], y: r[1] - 0.1, zoom: 2.3 }; },
  pernas: ch => { const a = ch.joint('knL'), b = ch.joint('knR'); return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 + 0.03, zoom: 1.6 }; },
  pes: ch => { const a = ch.joint('anL'), b = ch.joint('anR'); return { x: (a[0] + b[0]) / 2, y: Math.min(a[1], b[1]) + 0.05, zoom: 3.0 }; }
};
class BodyForm {
  constructor(mode) { this.mode = mode; this.usesCharacter = true; this.linkAlpha = 0.16; this.ankPrev = null; this.ankV = [0, 0, 0]; this.shedPh = 0; }
  camera(eng) {
    if (this.mode === 'portrait') { const h = eng.char.joint('head'); return { x: h[0], y: h[1] + 0.02, zoom: 3.3 }; }
    const v = eng.char.view; if (v && VIEW_FOCUS[v.focus]) return VIEW_FOCUS[v.focus](eng.char);
    const pc = eng.char.pose.cam; if (pc) return { x: 0, y: pc.y, zoom: pc.zoom };
    return { x: 0, y: 0.9, zoom: 1 };
  }
  build(eng) {
    const N = eng.N, port = this.mode === 'portrait', A = port ? ALLOC_PORT : ALLOC_FULL, rng = mulberry32(port ? 99 : 7);
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
          const pt = (r1, r2, d) => [c[0] + e1[0] * r1 + up[0] * r2 + nC[0] * d, c[1] + e1[1] * r1 + up[1] * r2 + nC[1] * d, c[2] + e1[2] * r1 + up[2] * r2 + nC[2] * d];
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
        for (const dy of [0.011, -0.011]) line(ID, resample(q => { const p = bandAt(q); return { p: [p[0], p[1] + dy, p[2]], n: bandN(q), k: skB }; }, mE), 1, { col: MAT.foneW, al: 0.95, size: 0.55 });
        const mFill = nBand - 2 * mE;
        for (let i = 0; i < mFill; i++) { const q = rng(), p = bandAt(q), nn = bandN(q), inner = rng() < 0.3, slider = q < 0.12 || q > 0.88;
          item(ID, { p: [p[0] - nn[0] * (inner ? 0.006 : 0), p[1] + (rng() - 0.5) * 0.02, p[2] - nn[2] * (inner ? 0.006 : 0)], n: nn }, skB, 1, { col: slider && !inner ? MAT.silver : inner ? MAT.foneC : MAT.foneW, al: inner ? 0.35 : slider ? 0.85 : 0.6, size: 0.55 }); }
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
    const neckAt = (y, ang, off) => { const f = clamp((y - 1.425) / 0.13, 0, 1), cz = lerp(-0.015, 0, f), r = capR(LIMB.neck, f) + off, s2 = Math.sin(ang), c2 = Math.cos(ang); return { p: [r * s2, y, cz + r * c2], n: [s2, 0, c2], k: [J.neck, J.chest, smooth(1.5, 1.44, y) * 0.45] }; };
    const frontZ = (x, y, off) => { let z = -1; if (y >= 1.44) { const f = clamp((y - 1.425) / 0.13, 0, 1), r = capR(LIMB.neck, f); if (Math.abs(x) < r) z = lerp(-0.015, 0, f) + Math.sqrt(r * r - x * x); } if (y <= 1.47) z = Math.max(z, torsoPt(y, frontAng(y, x)).p[2]); return z + off; };
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
    const hornPath = (sx, u) => { const hr = restOf('head'), base = norm3([sx * 0.42, 0.86, 0.28]), B = [HC[0] + base[0] * HRAD[0] * 0.98, HC[1] + base[1] * HRAD[1] * 0.98, HC[2] + base[2] * HRAD[2] * 0.98];
      const C1 = [B[0] + base[0] * 0.05, B[1] + base[1] * 0.05 + 0.01, B[2] + base[2] * 0.05], C2 = [C1[0] + sx * 0.012, C1[1] + 0.02, C1[2] - 0.03], T = [C2[0] + sx * 0.007, C2[1] - 0.01, C2[2] - 0.032];   // ~9 cm: a base some nos cachos, a ponta sai e curva para trás
      const v = 1 - u, b0 = v * v * v, b1 = 3 * v * v * u, b2 = 3 * v * u * u, b3 = u * u * u;
      return [hr[0] + b0 * B[0] + b1 * C1[0] + b2 * C2[0] + b3 * T[0], hr[1] + b0 * B[1] + b1 * C1[1] + b2 * C2[1] + b3 * T[1], hr[2] + b0 * B[2] + b1 * C1[2] + b2 * C2[2] + b3 * T[2]]; };
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
        for (let i = 0; i < mMain; i++) { const q = i / (mMain - 1), [h, a] = veinPath(sx, q), wob = 0.006 * Math.sin(q * 61 + sx) + 0.003 * Math.sin(q * 140), P = TP(h, a + wob / Math.max(0.05, torsoAt(h)[0]), 0.0018);
          item(ID, P, P.k, 0, { col: MAT.vein, al: 0.85, size: 0.4, chain: ch, sub: 22, q1: q }); }
        for (let i = 0; i < m - mMain; i++) { const q = 0.08 + 0.84 * rng(), [h, a] = veinPath(sx, q), br = (rng() - 0.5) * 0.03, P = TP(h + Math.abs(br) * 0.6, a + br / Math.max(0.05, torsoAt(h)[0]), 0.0018);   // ramificações curtas
          item(ID, P, P.k, 0, { col: MAT.vein, al: 0.6, size: 0.34, sub: 22, q1: q }); }
      } };
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
  update(eng, t, dt) {
    const S = eng.S, D = this.D, ch = eng.char, JR = ch.JR, JP = ch.JP, n = this.n, port = this.mode === 'portrait';
    const F = ch.face, dis = ch.dis, IT = ch.items;
    const jw = IT.jaqueta.w, sw = IT.camisa.w, shw = IT.short.w, mw = IT.meias.w, bw = IT.coturnos.w, fw = IT.fone.w, nw = IT.bloco.w;
    const itemW = [fw, bw, nw, 1, jw, mw, shw, sw, IT.piercing.w, IT.choker.w, IT.liga.w, IT.corrente.w, IT.chifres.w, IT.cauda.w, IT.asas.w * ch.wing.m, IT.unhas.w, IT.tatuagem.w, 1];
    const hi = JI.head, ho = hi * 9, H = JR.subarray(ho, ho + 9), hpx = JP[hi * 3], hpy = JP[hi * 3 + 1], hpz = JP[hi * 3 + 2];
    const glA = ch.reach;
    const anc = PART_ANCHOR.map(nm => ch.joint(nm));
    const chest = ch.joint('chest');
    // parâmetros do rosto
    const EX = 0.034, EY = -0.004, EW = 0.0216, IR = 0.0098;
    const eyeO = [Math.max(0, F.eyeL * ch.blinkL), Math.max(0, F.eyeR * ch.blinkR)];
    const mHalf = 0.0175 * F.width * (1 - 0.35 * F.round), mUp = 0.0011 + Math.max(0, F.open) * 0.0052 + F.round * 0.003, mDn = 0.0011 + Math.max(0, F.open) * 0.024 + F.round * 0.004;
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
            const hlx = (H[0] * qx + H[3] * qy + H[6] * qz - HC[0]) / R0, hly = (H[1] * qx + H[4] * qy + H[7] * qz - HC[1]) / R1, hlz = (H[2] * qx + H[5] * qy + H[8] * qz - HC[2]) / R2, r2 = hlx * hlx + hly * hly + hlz * hlz;
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
