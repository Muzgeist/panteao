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
