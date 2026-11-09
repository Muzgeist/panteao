/* =====================================================================
   MORFEU — núcleo quase imóvel + névoa
   ---------------------------------------------------------------------
   Deliberadamente MAIS simples que as outras quatro: ele não tem
   personalidade, e a simplicidade é a característica dele, não uma forma
   incompleta.
   • NÚCLEO: esfera pequena de pontos, rotação mínima. Brilho e tamanho
     crescem devagar com o total de gravações (escala logarítmica).
   • SILHUETA — NÉVOA: baixa e lenta, envolvendo o núcleo e borrando os
     contornos dele. Nunca brilho forte, nunca nitidez total.
   • Gravação (state.lastWrite): a névoa clareia brevemente perto do ponto
     daquele compartimento (quatro direções em volta do núcleo) — sem
     reviver estratos separados.
   ===================================================================== */
'use strict';
(function (PT) {
  const { TAU, clamp, smooth, mulberry32 } = PT.M, writeSlot = PT.writeSlot, centerFocus = PT.centerFocus;
  const LAYERS = ['vinculo', 'processual', 'autoavaliacao', 'biblioteca'], GRAY = [0.6, 0.62, 0.66], FOG = [0.42, 0.45, 0.5];
  const DIRS = [[-0.62, 0.12], [0.62, 0.1], [-0.4, -0.32], [0.42, -0.3]];   // onde cada compartimento "fica" na névoa

  class MorfeuForm {
    constructor(state, opts = {}) { this.extent = [0.92, 0.66]; this.state = state || {}; this.opts = opts; this.churn = 0.06; this.buildStyle = 'grow'; this.linkAlpha = 0; this.flash = [0, 0, 0, 0]; this.seen = null; this.size = 0.2; }
    camera() { return { x: 0, y: 0, zoom: this.opts.zoom || 1 }; }
    build(eng) {
      const N = eng.N, S = eng.S, rng = mulberry32(5150), nCore = Math.round(N * 0.32);
      this.kind = new Uint8Array(N); this.d = new Float32Array(N * 5); let i = 0;
      for (let k = 0; k < nCore; k++, i++) { const y = 1 - 2 * (k + 0.5) / nCore, r = Math.sqrt(1 - y * y), th = k * 2.399963, rr = 0.75 + 0.25 * Math.cbrt(rng());
        this.kind[i] = 1; this.d.set([Math.cos(th) * r * rr, y * rr, Math.sin(th) * r * rr, rng(), 0], i * 5); S.group[i] = 10; S.order[i] = 0.1 + 0.3 * rng(); }
      for (; i < N; i++) { const hug = rng() < 0.4, a = rng() * TAU, rr = hug ? 0.12 + rng() * 0.18 : 0.15 + Math.pow(rng(), 0.7) * 0.75, h = (rng() - 0.5) * (hug ? 0.4 : 0.36 * (1 - rr * 0.4));
        this.kind[i] = 2; this.d.set([Math.cos(a) * rr, h, Math.sin(a) * rr, rng(), rng()], i * 5); S.group[i] = 20; S.order[i] = 0.5 + 0.5 * rng(); }
    }
    update(eng, t, dt) {
      const S = eng.S, N = eng.N, d = this.d, ST = this.state, cnt = ST.layers || {}, W = ST.lastWrite;
      if (W && (this.seen === null || this.seen !== W.seq)) { if (this.seen !== null) { const L = LAYERS.indexOf(W.layer); if (L >= 0) this.flash[L] = 1; } this.seen = W.seq; }
      for (let L = 0; L < 4; L++) this.flash[L] *= Math.exp(-dt * 0.9);
      const total = LAYERS.reduce((a, k) => a + (cnt[k] || 0), 0), tgt = clamp(0.15 + 0.03 * Math.log10(1 + total), 0.15, 0.27);
      this.size += (tgt - this.size) * Math.min(1, dt * 0.2);
      const R = this.size, rot = t * 0.015, c = Math.cos(rot), s = Math.sin(rot), lum0 = clamp(0.5 + 0.1 * Math.log10(1 + total), 0.5, 0.85);
      for (let i = 0; i < N; i++) { const o = i * 5;
        if (this.kind[i] === 1) { const x = d[o] * c + d[o + 2] * s, z = -d[o] * s + d[o + 2] * c, fr = smooth(-0.8, 0.8, z), lum = lum0 * (0.55 + 0.45 * fr);
          writeSlot(S, i, x * R, d[o + 1] * R, z * R, GRAY[0] * lum, GRAY[1] * lum, GRAY[2] * lum * 1.03, 0.18 + 0.16 * fr, 0.75 + 0.3 * d[o + 3], 0.8, 0.02, 0); continue; }
        // névoa: deriva lenta e baixa; mais densa perto do núcleo, borrando o contorno
        const a0 = Math.atan2(d[o + 2], d[o]) + t * (0.012 + 0.01 * d[o + 4]), rr = Math.hypot(d[o], d[o + 2]) * (1 + 0.06 * Math.sin(t * 0.07 + d[o + 3] * 9));
        const x = Math.cos(a0) * rr, z = Math.sin(a0) * rr * 0.55, y = d[o + 1] + 0.03 * Math.sin(t * 0.05 + d[o + 4] * 12) - 0.04;
        let f = 0; for (let L = 0; L < 4; L++) if (this.flash[L] > 0.01) { const dx = x - DIRS[L][0], dy = y - DIRS[L][1]; f += this.flash[L] * Math.exp(-(dx * dx + dy * dy) / 0.05); }
        const dens = 1 - smooth(0.2, 0.9, rr), lum = 0.6 + 0.8 * f;
        writeSlot(S, i, x, y, z + 0.05, FOG[0] * lum, FOG[1] * lum, FOG[2] * lum * 1.05, (0.022 + 0.038 * dens + 0.05 * f) * (0.75 + 0.25 * Math.sin(t * 0.11 + d[o + 3] * 7)), 2.8 + 3.2 * d[o + 4], 0.25, 0.05, 0);
      }
      centerFocus(eng, 0, 0);
    }
  }
  PT.FORMS = PT.FORMS || {}; PT.LOOKS = PT.LOOKS || {};
  PT.FORMS.morfeu = (state, opts) => new MorfeuForm(state, opts);
  PT.LOOKS.morfeu = {
    cfg: { stemColor: [0.4, 0.4, 0.42], stemAlpha: 0.03, transitColor: [0.7, 0.7, 0.72], flash: 0.15, buildTime: 3, churnRate: 0.06 },
    look: { bg0: [0.022, 0.022, 0.024], bg1: [0.005, 0.005, 0.006], glow: [0.2, 0.2, 0.21], glowAmt: 0.06, bloom: 0.75, exposure: 1.2, grain: 0.012, vignette: 0.35 }
  };
  PT.MorfeuForm = MorfeuForm;
})(window.PT);
