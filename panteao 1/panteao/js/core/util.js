/* =====================================================================
   PANTEÃO · utilitários matemáticos
   Scripts clássicos (sem ES modules) de propósito: o protótipo abre direto
   do disco (file://) sem servidor. Tudo vive no namespace global PT.
   ===================================================================== */
'use strict';
window.PT = window.PT || {};
(function (PT) {
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fract = x => x - Math.floor(x);
  const hash1 = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  const hash3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const hex = h => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const d2 = (x, y, z) => x * x + y * y + z * z;
  /* mola criticamente amortecida (sem oscilação): usada onde o movimento precisa ser exato (Cérbero) */
  function critSpring(st, target, w, dt) { const x = st.x - target; const e = Math.exp(-w * dt); const nx = (x + (st.v + w * x) * dt) * e; st.v = (st.v - w * (st.v + w * x) * dt) * e; st.x = target + nx; return st.x; }

  /* curva de Hilbert — o mesmo matching espacial do motor da Lilith */
  function hilbert(x, y, n) {
    let d = 0;
    for (let s = n >> 1; s > 0; s >>= 1) {
      const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
      d += s * s * ((3 * rx) ^ ry);
      if (ry === 0) { if (rx === 1) { x = n - 1 - x; y = n - 1 - y; } const t = x; x = y; y = t; }
    }
    return d;
  }

  /* ruído de valor 3D (trilinear, suavizado) — barato o bastante para alguns milhares de chamadas por quadro */
  function vnoise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const h = (a, b, c) => hash3(xi + a, yi + b, zi + c);
    const x00 = lerp(h(0, 0, 0), h(1, 0, 0), u), x10 = lerp(h(0, 1, 0), h(1, 1, 0), u);
    const x01 = lerp(h(0, 0, 1), h(1, 0, 1), u), x11 = lerp(h(0, 1, 1), h(1, 1, 1), u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  }
  const fbm3 = (x, y, z) => vnoise3(x, y, z) * 0.62 + vnoise3(x * 2.03 + 5.1, y * 2.03, z * 2.03 - 3.3) * 0.38;

  /* FOGO — para Ogum é a identidade BASE (sem a restrição de escassez que vale para a Lilith).
     k: 0 cinza-aço frio → brasa funda → laranja-ferro → núcleo quase branco */
  const FORGE_K = [[0, [0.16, 0.17, 0.19]], [0.18, [0.30, 0.10, 0.05]], [0.42, [0.95, 0.24, 0.04]], [0.68, [1.55, 0.58, 0.10]], [0.88, [1.75, 1.08, 0.38]], [1, [1.85, 1.55, 1.05]]];
  function FORGE(k) { k = clamp(k, 0, 1); for (let i = 1; i < FORGE_K.length; i++) if (k <= FORGE_K[i][0]) { const [k0, c0] = FORGE_K[i - 1], [k1, c1] = FORGE_K[i], f = (k - k0) / (k1 - k0); return [lerp(c0[0], c1[0], f), lerp(c0[1], c1[1], f), lerp(c0[2], c1[2], f)]; } return FORGE_K[FORGE_K.length - 1][1]; }

  PT.M = { TAU, D2R, clamp, lerp, smooth, fract, hash1, hash3, mulberry32, lerp3, hex, d2, critSpring, hilbert, vnoise3, fbm3, FORGE };
})(window.PT);
