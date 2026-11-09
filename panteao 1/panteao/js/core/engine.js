/* =====================================================================
   PANTEÃO · ENGINE — células-tronco por estado-alvo
   ---------------------------------------------------------------------
   Mesmo princípio validado em lilith_corpo.html (estudado, não copiado às cegas):
   • P = células: posição, velocidade e cor CONTÍNUAS quadro a quadro.
   • S = slots: estado-alvo escrito pela forma (posição, cor, alfa, tamanho,
     rigidez, turbulência, rotação, formato). Formas nunca movem células.
   • A ligação célula→slot é reatribuível: matching espacial por Hilbert ao
     trocar de forma, fluxo celular entre vizinhos e 2-opt contínuo.
   • Ao trocar de forma, a antiga solta as células na ordem inversa de
     construção e a nova recruta na sua ordem — as duas ao mesmo tempo.
   O que NÃO veio para cá: personagem/esqueleto, guarda-roupa, malha, glitch,
   cópia violeta desalinhada, troca de cor por corte. Isso é língua visual
   exclusiva da Lilith. Aqui cada agente define a própria paleta de célula-tronco,
   de trânsito e de flash via `cfg`.
   ===================================================================== */
'use strict';
(function (PT) {
  const { TAU, clamp, lerp, smooth, hash1, mulberry32, hilbert, d2 } = PT.M;

  function makeSlots(N) {
    const F = () => new Float32Array(N);
    return { x: F(), y: F(), z: F(), r: F(), g: F(), b: F(), a: F(), size: F(), k: F(), turb: F(), rot: F(),
      shape: new Uint8Array(N), warp: new Int32Array(N), group: new Int32Array(N), owner: new Int32Array(N),
      order: F(), act: new Float64Array(N), stem: new Uint8Array(N) };
  }

  /* escreve o estado-alvo de um slot — mesmo contrato do motor da Lilith (sem glitch) */
  function writeSlot(S, i, x, y, z, r, g, b, a, size, k, turb, shape, rot) {
    S.x[i] = x; S.y[i] = y; S.z[i] = z; S.r[i] = r; S.g[i] = g; S.b[i] = b; S.a[i] = a;
    S.size[i] = size; S.k[i] = k; S.turb[i] = turb; S.shape[i] = shape; S.rot[i] = rot === undefined ? 99 : rot;
  }
  /* foco do brilho ambiente no centro da vista (mesma ideia de centerFocus) */
  function centerFocus(eng, x = 0, y = 0) { eng.focus.x = x; eng.focus.y = y; }

  const DEFAULTS = {
    stemColor: [0.42, 0.46, 0.60],   // célula indiferenciada (cada agente troca)
    stemAlpha: 0.05,                 // reservatório em repouso (Ogum = 0: ausente é ausente)
    transitAlpha: 0.26,              // células recém-soltas / a caminho do papel
    transitColor: [0.75, 0.82, 1.0], // células em voo rápido
    flash: 0.45,                     // brilho no instante da diferenciação (Cérbero = 0)
    buildTime: 3.2,
    churnRate: 0.3,
    reservoirR: 1.0,
    sizeK: 1.0
  };

  class Engine {
    constructor(N, cfg = {}) {
      this.cfg = Object.assign({}, DEFAULTS, cfg);
      this.t = 0; this.form = null; this.formName = ''; this.oldForm = null; this.O = null; this.oldUntil = 0;
      this.cam = { x: 0, y: 0, zoom: 1, vx: 0, vy: 0, vz: 0 };
      this.view = { W: 1, H: 1, dpr: 1 };
      this.focus = { x: 0, y: 0 };
      this.ripples = []; this.swapsAcc = 0; this.progress = 1; this.activeSlots = 0;
      this.alloc(N);
    }
    alloc(N) {
      this.N = N;
      const F = () => new Float32Array(N);
      this.P = { x: F(), y: F(), z: F(), vx: F(), vy: F(), vz: F(), r: F(), g: F(), b: F(), a: F(),
        seed: F(), seed2: F(), seed3: F(), sx: F(), sy: F(), slot: new Int32Array(N), warp: new Int32Array(N),
        oslot: new Int32Array(N).fill(-1), owarp: new Int32Array(N), rel: new Float64Array(N), relDone: new Uint8Array(N),
        bind: F(), sz: F(), shp: new Uint8Array(N), rotT: F(), arr: F() };
      this.bufA = makeSlots(N); this.bufB = makeSlots(N); this.S = this.bufA;
      const P = this.P, S = this.S, rng = mulberry32(1234 + N), c = this.cfg.stemColor;
      for (let i = 0; i < N; i++) {
        const u = rng() * 2 - 1, a = rng() * TAU, r = Math.sqrt(1 - u * u), rad = 0.4 + rng() * 1.0;
        P.x[i] = r * Math.cos(a) * rad * 1.2; P.y[i] = u * rad * 0.7; P.z[i] = r * Math.sin(a) * rad * 0.5;
        P.seed[i] = rng(); P.seed2[i] = rng(); P.seed3[i] = rng();
        P.r[i] = c[0] * 0.5; P.g[i] = c[1] * 0.5; P.b[i] = c[2] * 0.5; P.a[i] = 0;
        P.slot[i] = i; S.owner[i] = i; S.stem[i] = 1; S.act[i] = Infinity; P.sz[i] = 0.5; P.rotT[i] = 99;
      }
      this.renderBuf = new Float32Array(N * 9);
      this.lineBuf = new Float32Array(Math.max(64, N) * 12);
      this.lineCount = 0;
    }

    /* troca de forma: a antiga libera as células na ordem inversa; a nova as recruta na sua ordem */
    setForm(name, form, opts = {}) {
      const N = this.N, P = this.P, t0 = this.t, prevS = this.S, prevForm = this.form;
      const Tb = clamp(opts.buildTime ?? form.buildTime ?? this.cfg.buildTime, 0.6, 8), Tr = opts.releaseTime ?? Math.min(2.0, Tb * 0.5);
      let relMax = t0;
      for (let i = 0; i < N; i++) {
        const s = P.slot[i];
        if (prevForm && !prevS.stem[s] && t0 >= prevS.act[s]) {
          P.oslot[i] = s; P.owarp[i] = prevS.warp[s];
          P.rel[i] = t0 + (1 - prevS.order[s]) * Tr * (0.88 + 0.12 * P.seed3[i]);
          if (P.rel[i] > relMax) relMax = P.rel[i];
        } else { P.oslot[i] = -1; P.rel[i] = t0; }
        P.relDone[i] = P.oslot[i] < 0 ? 1 : 0;
      }
      this.O = prevForm ? prevS : null; this.oldForm = prevForm; this.oldUntil = relMax + 0.05; this.switchT = t0; this.swDur = Tb;
      const S = this.S = prevS === this.bufA ? this.bufB : this.bufA;
      for (let i = 0; i < N; i++) { S.group[i] = 0; S.shape[i] = 0; S.rot[i] = 99; S.stem[i] = 0; S.order[i] = -1; S.warp[i] = 0; S.turb[i] = 0; S.k[i] = 0.9; S.a[i] = 0; S.size[i] = 1; }
      this.form = form; this.formName = name; this.linkRest = null;
      form.build(this);
      form.update(this, t0, 0);
      this.fillOrder(form.buildStyle || 'grow');
      const delay0 = prevForm ? Math.min(0.85, Tr * 0.38) : 0.15, span = Math.max(0.4, Tb - delay0 - 0.6);
      let nAct = 0;
      for (let s = 0; s < N; s++) {
        if (S.stem[s]) { S.act[s] = Infinity; continue; }
        S.act[s] = t0 + delay0 + clamp(S.order[s] * 0.93 + hash1(s * 0.37) * 0.07, 0, 1) * span; nAct++;
      }
      this.activeSlots = nAct;
      this.matchStaged();
    }

    fillOrder(style) {
      const N = this.N, S = this.S;
      let need = false; for (let s = 0; s < N; s++) if (!S.stem[s] && S.order[s] < 0) { need = true; break; }
      if (!need) return;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, cx = 0, cy = 0, cz = 0, n = 0;
      for (let s = 0; s < N; s++) { if (S.stem[s]) continue; const x = S.x[s], y = S.y[s]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; cx += x; cy += y; cz += S.z[s]; n++; }
      if (!n) return; cx /= n; cy /= n; cz /= n;
      let rmax = 1e-6; for (let s = 0; s < N; s++) if (!S.stem[s]) rmax = Math.max(rmax, Math.hypot(S.x[s] - cx, S.y[s] - cy, S.z[s] - cz));
      for (let s = 0; s < N; s++) {
        if (S.stem[s] || S.order[s] >= 0) continue;
        let o;
        if (style === 'rise') o = (S.y[s] - y0) / Math.max(1e-6, y1 - y0);
        else if (style === 'sweep') o = (S.x[s] - x0) / Math.max(1e-6, x1 - x0);
        else if (style === 'random') o = hash1(s * 1.7);
        else o = Math.hypot(S.x[s] - cx, S.y[s] - cy, S.z[s] - cz) / rmax;
        S.order[s] = clamp(o, 0, 1);
      }
    }

    /* quem sai primeiro alimenta quem é construído primeiro; dentro do lote, o mais perto (Hilbert) */
    matchStaged() {
      const N = this.N, P = this.P, S = this.S;
      const pi = new Uint32Array(N), si = new Uint32Array(N);
      for (let i = 0; i < N; i++) { pi[i] = i; si[i] = i; }
      const relKey = new Float64Array(N), actKey = new Float64Array(N);
      for (let i = 0; i < N; i++) { relKey[i] = P.rel[i] + P.seed[i] * 1e-4; actKey[i] = S.stem[i] ? 1e12 + hash1(i) : S.act[i]; }
      pi.sort((a, b) => relKey[a] - relKey[b]); si.sort((a, b) => actKey[a] - actKey[b]);
      const K = 10, G = 1024, pk = new Float64Array(N), sk = new Float64Array(N);
      for (let b = 0; b < K; b++) {
        const lo = Math.floor(b * N / K), hi = Math.floor((b + 1) * N / K);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let k = lo; k < hi; k++) { const i = pi[k], s = si[k], a = P.x[i], c = P.y[i], d = S.x[s], e = S.y[s];
          if (a < x0) x0 = a; if (a > x1) x1 = a; if (c < y0) y0 = c; if (c > y1) y1 = c; if (d < x0) x0 = d; if (d > x1) x1 = d; if (e < y0) y0 = e; if (e > y1) y1 = e; }
        const span = Math.max(x1 - x0, y1 - y0, 1e-3);
        for (let k = lo; k < hi; k++) { const i = pi[k], s = si[k];
          pk[i] = hilbert(clamp(((P.x[i] - x0) / span * (G - 1)) | 0, 0, G - 1), clamp(((P.y[i] - y0) / span * (G - 1)) | 0, 0, G - 1), G) + P.seed[i] * 0.5;
          sk[s] = hilbert(clamp(((S.x[s] - x0) / span * (G - 1)) | 0, 0, G - 1), clamp(((S.y[s] - y0) / span * (G - 1)) | 0, 0, G - 1), G) + hash1(s) * 0.5; }
        const ps = Array.prototype.slice.call(pi, lo, hi).sort((a, b) => pk[a] - pk[b]), ss = Array.prototype.slice.call(si, lo, hi).sort((a, b) => sk[a] - sk[b]);
        for (let k = 0; k < ps.length; k++) { const i = ps[k], s = ss[k]; P.slot[i] = s; S.owner[s] = i; P.warp[i] = S.warp[s]; }
      }
    }

    /* fluxo celular: células vizinhas do MESMO grupo trocam de papel. Uma forma que precisa de
       posições exatas (estrela da Nyx, lâmina da íris) dá um grupo único ao slot — aí ele nunca troca. */
    churn(dt) {
      const N = this.N, P = this.P, S = this.S, t = this.t, rate = this.form && this.form.churn != null ? this.form.churn : this.cfg.churnRate;
      if (rate <= 0) return;
      let swaps = 0;
      const ok = s => !S.stem[s] && t > S.act[s] + 1.3 && t >= P.rel[S.owner[s]];
      const m = Math.floor(N * rate * dt * 1.6 + Math.random());
      for (let q = 0; q < m; q++) {
        const s = (Math.random() * N) | 0, s2 = s + 1 + ((Math.random() * 7) | 0);
        if (s2 >= N || S.group[s] !== S.group[s2] || S.group[s] < 0 || !ok(s) || !ok(s2)) continue;
        if (d2(S.x[s] - S.x[s2], S.y[s] - S.y[s2], S.z[s] - S.z[s2]) > 0.0036) continue;
        const i = S.owner[s], j = S.owner[s2];
        P.slot[i] = s2; P.slot[j] = s; S.owner[s] = j; S.owner[s2] = i; P.warp[i] = S.warp[s2]; P.warp[j] = S.warp[s]; swaps++;
      }
      const m2 = Math.floor(N * 0.02 * rate / 0.3);
      for (let q = 0; q < m2; q++) {
        const i = (Math.random() * N) | 0, j = (Math.random() * N) | 0; if (i === j) continue;
        const si = P.slot[i], sj = P.slot[j];
        if (!ok(si) || !ok(sj) || S.group[si] < 0 || S.group[sj] < 0) continue;
        const c0 = d2(P.x[i] - S.x[si], P.y[i] - S.y[si], P.z[i] - S.z[si]) + d2(P.x[j] - S.x[sj], P.y[j] - S.y[sj], P.z[j] - S.z[sj]);
        const c1 = d2(P.x[i] - S.x[sj], P.y[i] - S.y[sj], P.z[i] - S.z[sj]) + d2(P.x[j] - S.x[si], P.y[j] - S.y[si], P.z[j] - S.z[si]);
        if (c1 < c0 - 0.004) { P.slot[i] = sj; P.slot[j] = si; S.owner[sj] = i; S.owner[si] = j; P.warp[i] = S.warp[sj]; P.warp[j] = S.warp[si]; swaps++; }
      }
      this.swapsAcc += swaps;
    }

    addRipple(x, y, z, str = 1, col = [1, 1, 1], speed = 1.7, life = 1.6) { this.ripples.push({ x, y, z, t0: this.t, str, col, speed, life }); if (this.ripples.length > 6) this.ripples.shift(); }

    updateCamera(dt) {
      let tgt = this.form && this.form.camera ? this.form.camera(this) : { x: 0, y: 0, zoom: 1 };
      const c = this.cam, w = 4.0, z = 1.0;
      c.vx += (w * w * (tgt.x - c.x) - 2 * z * w * c.vx) * dt; c.x += c.vx * dt;
      c.vy += (w * w * (tgt.y - c.y) - 2 * z * w * c.vy) * dt; c.y += c.vy * dt;
      c.vz += (w * w * (tgt.zoom - c.zoom) - 2 * z * w * c.vz) * dt; c.zoom += c.vz * dt;
    }
    /* escala: a forma declara a meia-extensão que precisa mostrar (form.extent = [x, y]); a vista encaixa
       pelo lado que limita — palco largo não desperdiça espaço com forma larga (Cérbero), quadrado não corta */
    screenScale() { const v = this.view, ex = (this.form && this.form.extent) || [1.15, 1.15]; return this.cam.zoom * Math.min(v.W / (2 * ex[0]), v.H / (2 * ex[1])); }
    /* tamanho de célula que cobre `len` unidades do mundo nesta vista — para linhas contínuas feitas de células
       (grade do Cérbero, barras do Ogum) não virarem tracejado em vista pequena nem engrossarem em vista grande */
    sizeFor(len) { const Sc = this.screenScale(), base = 5.2 * Math.pow(Math.max(30, Sc) / 300, 0.72) * this.cfg.sizeK; return len * Sc / base; }
    toScreen(x, y, z = 0) { const v = this.view, Sc = this.screenScale(), p = 5 / (5 - clamp(z, -3, 3.5)); return [v.W / 2 + (x - this.cam.x) * p * Sc, v.H / 2 - (y - this.cam.y) * p * Sc]; }

    step(dt) {
      this.t += dt;
      const old = this.oldForm && this.t <= this.oldUntil ? this.oldForm : null;
      if (!old && this.oldForm) { this.oldForm = null; this.O = null; }
      if (old) { const S0 = this.S; this.S = this.O; old.update(this, this.t, dt); this.S = S0; }
      this.form.update(this, this.t, dt);
      this.updateCamera(dt);
      this.churn(dt);
      this.integrate(dt);
      this.ripples = this.ripples.filter(r => this.t - r.t0 < r.life);
    }

    integrate(dt) {
      const N = this.N, P = this.P, S = this.S, O = this.O, t = this.t, C = this.cfg;
      const rip = this.ripples, nr = rip.length, SC = C.stemColor, TC = C.transitColor;
      const cr = Math.min(1, dt * 7), ar = Math.min(1, dt * 10), zr = Math.min(1, dt * 6);
      const cam = this.cam, iz = 1 / Math.max(0.3, cam.zoom), RR = C.reservoirR;
      let bound = 0;
      for (let i = 0; i < N; i++) {
        const s = P.slot[i], os = P.oslot[i];
        let px = P.x[i], py = P.y[i], pz = P.z[i], vx = P.vx[i], vy = P.vy[i], vz = P.vz[i];
        const sd = P.seed[i] * 37.0;
        let TX, TY, TZ, TR, TG, TB, TA, TSZ, TSH, TROT, w, turb, bind = 0, arrive = 0, flash = 0;
        if (O && os >= 0 && t < P.rel[i]) {
          // ainda especializada no papel antigo
          if (O.warp[os] !== P.owarp[i]) { P.owarp[i] = O.warp[os]; px = O.x[os]; py = O.y[os]; pz = O.z[os]; vx = vy = vz = 0; P.a[i] = 0; }
          TX = O.x[os]; TY = O.y[os]; TZ = O.z[os]; TR = O.r[os]; TG = O.g[os]; TB = O.b[os]; TA = O.a[os]; TSZ = O.size[os]; TSH = O.shape[os]; TROT = O.rot[os];
          w = 1.0 + 23 * O.k[os]; turb = O.turb[os] + 0.02; bind = 1; arrive = 1;
        } else if (S.stem[s] && C.stemAlpha < 0.004 && P.a[i] < 0.004 && t > P.rel[i] + 2.5) {
          // reservatório invisível (agente ausente): a célula fica parada onde está, sem custo — retoma daqui se for recrutada
          P.a[i] = 0; P.bind[i] = 0; P.arr[i] = 0; continue;
        } else if (S.stem[s] || t < S.act[s]) {
          // indiferenciada: reservatório
          if (!P.relDone[i]) { P.relDone[i] = 1; const k = 0.5; vx += (P.seed2[i] - 0.5) * k; vy += (P.seed3[i] - 0.3) * k; vz += (P.seed[i] - 0.5) * k; }
          const transit = !S.stem[s] || t - P.rel[i] < 2.5;
          const rr = (transit ? 0.2 + P.seed[i] * 0.5 : 0.85 + P.seed[i] * 0.65) * RR, ang = P.seed2[i] * TAU + t * (0.2 / (0.4 + rr)) * (P.seed3[i] < 0.5 ? 1 : -1);
          TX = cam.x + Math.cos(ang) * rr * 1.1 * iz; TY = cam.y + ((P.seed3[i] - 0.5) * (transit ? 0.6 : 1.3) * RR + 0.05 * Math.sin(t * 0.7 + sd)) * iz; TZ = Math.sin(ang) * rr * 0.6 * iz;
          TR = SC[0]; TG = SC[1]; TB = SC[2]; TA = transit ? C.transitAlpha * (0.6 + 0.4 * P.seed2[i]) : C.stemAlpha; TSZ = transit ? 0.62 : 0.45; TSH = 0; TROT = 99;
          w = transit ? 1.5 : 0.9; turb = transit ? 0.32 : 0.22;
        } else {
          // comprometida → diferenciada
          if (S.warp[s] !== P.warp[i]) { P.warp[i] = S.warp[s]; px = S.x[s]; py = S.y[s]; pz = S.z[s]; vx = vy = vz = 0; P.a[i] = 0; }
          const ta = t - S.act[s];
          TX = S.x[s]; TY = S.y[s]; TZ = S.z[s];
          if (ta > 1.6) {
            bind = 1; arrive = 1; TR = S.r[s]; TG = S.g[s]; TB = S.b[s]; TA = S.a[s]; TSZ = S.size[s]; TSH = S.shape[s];
            w = 1.0 + 23 * S.k[s]; turb = S.turb[s] + 0.02;
          } else {
            bind = ta >= 0.9 ? 1 : smooth(0, 0.9, ta);
            const dd = Math.hypot(TX - px, TY - py, TZ - pz);
            arrive = (1 - smooth(0.015, 0.22, dd)) * smooth(0.05, 0.35, ta);
            TR = lerp(SC[0], S.r[s], arrive); TG = lerp(SC[1], S.g[s], arrive); TB = lerp(SC[2], S.b[s], arrive);
            TA = S.a[s] * (0.3 + 0.7 * arrive) + (1 - arrive) * 0.2; TSZ = lerp(0.6, S.size[s], arrive); TSH = arrive > 0.6 ? S.shape[s] : 0;
            w = (1.0 + 23 * S.k[s]) * (0.18 + 0.82 * bind); turb = S.turb[s] + (1 - bind) * 0.5 + 0.02;
            flash = ta < 1.2 ? Math.max(0, 1 - Math.abs(ta - 0.55) / 0.4) * C.flash : 0;
          }
          TROT = S.rot[s];
          if (arrive > 0.95) bound++;
        }
        P.bind[i] = bind * arrive; P.arr[i] = arrive;
        const dx = TX - px, dy = TY - py, dz = TZ - pz, tb = turb * 1.7;
        let nx = 0, ny = 0, nz = 0;
        if (tb > 0.06) {   // ruído só onde a forma pede turbulência (formas rígidas não pagam por ele)
          nx = Math.sin(py * 3.1 + t * 1.1 + sd) + Math.sin(pz * 2.3 - t * 0.7 + sd * 0.3);
          ny = Math.sin(pz * 2.7 + t * 0.9 + sd * 1.7) + Math.sin(px * 3.3 + t * 1.3);
          nz = Math.sin(px * 2.9 - t * 1.2 + sd * 0.7) + Math.sin(py * 2.1 + t * 0.6);
        }
        const zeta = 0.8;
        vx += (w * w * dx - 2 * zeta * w * vx + nx * tb) * dt;
        vy += (w * w * dy - 2 * zeta * w * vy + ny * tb) * dt;
        vz += (w * w * dz - 2 * zeta * w * vz + nz * tb) * dt;
        let fr = 0, fg = 0, fb = 0;
        for (let q = 0; q < nr; q++) {
          const R = rip[q], age = t - R.t0, rad = age * R.speed;
          const ex = px - R.x, ey = py - R.y, ez = pz - R.z, dd2 = Math.sqrt(ex * ex + ey * ey + ez * ez) + 1e-4;
          const band = 1 - Math.abs(dd2 - rad) / 0.14;
          if (band > 0) {
            const f = band * R.str * (1 - age / R.life);
            fr += R.col[0] * f; fg += R.col[1] * f; fb += R.col[2] * f;
            const push = f * 0.044 * dt * 60; vx += ex / dd2 * push; vy += ey / dd2 * push; vz += ez / dd2 * push;
          }
        }
        px += vx * dt; py += vy * dt; pz += vz * dt;
        P.x[i] = px; P.y[i] = py; P.z[i] = pz; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz;
        let r = TR, g = TG, b = TB;
        const sp = Math.sqrt(vx * vx + vy * vy + vz * vz), tr = clamp((sp - 1.4) / 4, 0, 1) * 0.6;
        r = lerp(r, TC[0], tr) + fr + flash * 0.9; g = lerp(g, TC[1], tr) + fg + flash * 0.9; b = lerp(b, TC[2], tr) + fb + flash;
        P.r[i] += (r - P.r[i]) * cr; P.g[i] += (g - P.g[i]) * cr; P.b[i] += (b - P.b[i]) * cr;
        P.a[i] += (TA + flash * 0.35 - P.a[i]) * ar;
        P.sz[i] += (TSZ - P.sz[i]) * zr; P.shp[i] = TSH; P.rotT[i] = TROT;
      }
      this.progress = this.activeSlots ? Math.min(1, bound / this.activeSlots) : 1;
    }

    /* projeção + empacotamento para a GPU (pixels do dispositivo da vista) */
    pack() {
      const N = this.N, P = this.P, S = this.S, t = this.t, buf = this.renderBuf, v = this.view;
      const Sc = this.screenScale(), cxp = v.W / 2, cyp = v.H / 2, cx = this.cam.x, cy = this.cam.y;
      const base = 5.2 * Math.pow(Math.max(30, Sc) / 300, 0.72) * this.cfg.sizeK;
      let o = 0;
      for (let i = 0; i < N; i++) {
        const z = P.z[i], pr = 5 / (5 - clamp(z, -3, 3.5));
        const sx = cxp + (P.x[i] - cx) * pr * Sc, sy = cyp - (P.y[i] - cy) * pr * Sc;
        P.sx[i] = sx; P.sy[i] = sy;
        const shp = P.shp[i], sr = P.rotT[i];
        let rot;
        if (sr < 50) rot = -sr;                                   // ângulo do mundo (y para cima) → tela (y para baixo)
        else if (shp === 3 || shp === 9) rot = Math.atan2(-P.vy[i], P.vx[i]);
        else rot = P.seed[i] * TAU + t * (P.seed2[i] - 0.5) * 0.8;
        if (!(P.a[i] >= 0) || P.r[i] !== P.r[i] || P.sz[i] !== P.sz[i]) { P.a[i] = 0; P.r[i] = P.g[i] = P.b[i] = 0; P.sz[i] = 0.5; }   // proteção: um NaN no HDR contaminaria o bloom inteiro
        buf[o++] = sx; buf[o++] = sy; buf[o++] = P.sz[i] * base * pr;
        buf[o++] = P.r[i]; buf[o++] = P.g[i]; buf[o++] = P.b[i]; buf[o++] = P.a[i];
        buf[o++] = rot; buf[o++] = shp;
      }
      // linhas: ligam SLOTS e são desenhadas entre as células que os ocupam agora
      let nl = 0;
      const L = this.form && this.form.links, F = this.form;
      if (L && L.length) {
        const lb = this.lineBuf, la = F.linkAlpha || 0.2, rigid = F.linkMode === 'rigid', LA = F.linkA;
        if (!rigid && (!this.linkRest || this.linkRest.length !== L.length / 2)) {
          this.linkRest = new Float32Array(L.length / 2);
          for (let k = 0; k < L.length; k += 2) { const a = L[k], b = L[k + 1]; this.linkRest[k / 2] = Math.max(0.006, Math.hypot(S.x[a] - S.x[b], S.y[a] - S.y[b], S.z[a] - S.z[b])); }
        }
        for (let k = 0; k < L.length; k += 2) {
          const sa = L[k], sb = L[k + 1], i = S.owner[sa], j = S.owner[sb];
          const bb = Math.min(P.bind[i], P.bind[j]);
          if (bb < 0.05) continue;
          let al = la * bb * (LA ? LA[k / 2] : 1);
          if (!rigid) { const st = Math.hypot(P.x[i] - P.x[j], P.y[i] - P.y[j], P.z[i] - P.z[j]) / this.linkRest[k / 2]; if (st > 2.6) continue; al *= Math.min(P.a[i], P.a[j]) * (1 - smooth(1.4, 2.6, st)); }
          if (al < 0.004) continue;
          const o2 = nl * 12, ci = F.linkColor;
          lb[o2] = P.sx[i]; lb[o2 + 1] = P.sy[i]; lb[o2 + 2] = ci ? ci[0] : P.r[i]; lb[o2 + 3] = ci ? ci[1] : P.g[i]; lb[o2 + 4] = ci ? ci[2] : P.b[i]; lb[o2 + 5] = al;
          lb[o2 + 6] = P.sx[j]; lb[o2 + 7] = P.sy[j]; lb[o2 + 8] = ci ? ci[0] : P.r[j]; lb[o2 + 9] = ci ? ci[1] : P.g[j]; lb[o2 + 10] = ci ? ci[2] : P.b[j]; lb[o2 + 11] = al;
          nl++; if ((nl + 1) * 12 >= lb.length) break;
        }
      }
      this.lineCount = nl;
    }
  }

  /* forma vazia: todas as células no reservatório */
  class StemForm {
    constructor() { this.links = null; }
    camera(eng) { return { x: eng.cam.x, y: eng.cam.y, zoom: eng.cam.zoom }; }
    build(eng) { const S = eng.S; for (let i = 0; i < eng.N; i++) { S.stem[i] = 1; S.order[i] = 1; } }
    update(eng) { centerFocus(eng); }
  }

  PT.Engine = Engine; PT.StemForm = StemForm; PT.writeSlot = writeSlot; PT.centerFocus = centerFocus;
})(window.PT);
