/* =====================================================================
   PANTEÃO · FORMA COMPOSTA — várias formas num MESMO palco/motor
   ---------------------------------------------------------------------
   O palco central do casco é uma única View com um único Engine. Esta
   forma divide os slots em faixas contíguas, uma por agente; cada forma
   de agente roda sobre um "proxy" de motor cujos arrays de slot são
   subarrays (memória compartilhada) da faixa dela. Nada muda nas formas:
   o mesmo contrato build/update/writeSlot.
   • A primária (Nyx) está sempre ativa, sempre no centro, sempre maior.
   • Secundárias entram e saem conforme "ativas": as células da faixa
     saem do reservatório e se especializam (entrada em ordem de
     construção) ou voltam a ser tronco (saída em ordem inversa).
   • Cada secundária é posicionada/escalada depois do update (escala
     secundária, posição ao lado da Nyx), por mola — reposicionam-se
     suavemente quando o conjunto muda.
   • Troca de forma dentro de uma faixa (ex.: Ogum ausente ↔ presente) é
     reconstrução no lugar: as mesmas células migram para o novo papel.
   ===================================================================== */
'use strict';
(function (PT) {
  const { clamp, smooth, hash1 } = PT.M, centerFocus = PT.centerFocus;
  const KEYS = ['x', 'y', 'z', 'r', 'g', 'b', 'a', 'size', 'k', 'turb', 'rot', 'shape', 'warp', 'group', 'owner', 'order', 'act', 'stem'];
  const SEC_SCALE = 0.32, SEC_HALF = 0.34;

  class CompositeForm {
    /* parts: [{ agent, N, primary?, opts? }] — a primária vem primeiro; activeFn() → ids das secundárias ativas */
    constructor(parts, activeFn, opts = {}) {
      this.parts = parts.map((p, idx) => ({ ...p, idx, status: p.primary ? 'on' : 'off', cx: 0, cy: 0, sc: p.primary ? 1 : SEC_SCALE, vx: 0, vy: 0, slot: -1 }));
      this.activeFn = activeFn; this.opts = opts;
      this.extent = opts.extent || [1.42, 1.02]; this.linkMode = 'rigid'; this.churn = 0.12; this.buildStyle = 'grow';
      this.zoom = 1; this.camY = 0; this.order = [];
    }
    camera() { return { x: 0, y: this.camY, zoom: this.zoom }; }
    build(eng) {
      let off = 0; for (const p of this.parts) { p.off = off; off += p.N; }
      if (off > eng.N) throw new Error('CompositeForm: N insuficiente');
      for (const p of this.parts) this.buildPart(eng, p, p.primary);
      const P0 = this.parts[0];
      this.links = P0.form.links ? Int32Array.from(P0.form.links, v => v + P0.off) : null;
    }
    proxy(eng, p) {
      const S = {}; for (const k of KEYS) S[k] = eng.S[k].subarray(p.off, p.off + p.N);
      return { N: p.N, S, cfg: eng.cfg, view: eng.view, cam: eng.cam, focus: { x: 0, y: 0 }, get t() { return eng.t; },
        screenScale: () => eng.screenScale() * p.sc, sizeFor: len => eng.sizeFor(len * p.sc) / Math.pow(p.sc, 0.72), addRipple() {} };
    }
    buildPart(eng, p, activate, morph = false) {
      const S = eng.S, a = p.off, b = p.off + p.N;
      for (let s = a; s < b; s++) { S.group[s] = 0; S.shape[s] = 0; S.rot[s] = 99; S.stem[s] = 0; S.order[s] = -1; S.warp[s] = 0; S.turb[s] = 0; S.k[s] = 0.9; S.a[s] = 0; S.size[s] = 1; }
      p.px = this.proxy(eng, p);
      const L = PT.LOOKS[p.agent] || {};
      p.formName = (L.pick ? L.pick(p.state) : null) || p.agent;
      p.form = PT.FORMS[p.formName](p.state, Object.assign({ presence: 0.6 }, p.opts));
      p.form.build(p.px);
      if (!p.primary) p.sc = SEC_HALF / Math.max(...(p.form.extent || [1, 1]));   // toda secundária com o mesmo tamanho aparente (a Nyx sempre maior)
      const tag = (p.idx + 1) * 100000;
      p.ownStem = new Uint8Array(p.N);
      for (let s = a; s < b; s++) { const g = S.group[s]; S.group[s] = g >= 0 ? g + tag : g - tag; p.ownStem[s - a] = S.stem[s]; if (S.order[s] < 0) S.order[s] = hash1(s * 0.37); }
      p.form.update(p.px, eng.t, 0); this.place(eng, p);
      if (activate) this.activate(eng, p, p.primary ? 0 : 0.1, morph); else for (let s = a; s < b; s++) S.stem[s] = 1;
    }
    activate(eng, p, delay, morph = false) {
      const S = eng.S, t = eng.t, span = 1.8;
      // morph: as células já especializadas passam direto ao novo papel (sem voltar ao reservatório)
      for (let s = p.off; s < p.off + p.N; s++) { if (p.ownStem[s - p.off]) { S.stem[s] = 1; continue; } S.stem[s] = 0; S.act[s] = morph ? t - 1.7 : t + delay + clamp(S.order[s], 0, 1) * span; }
      p.status = 'on'; p.since = t;
    }
    /* transforma a faixa: escala secundária + posição; tamanho de célula na mesma regra do motor (∝ escala^0.72) */
    place(eng, p) {
      const S = eng.S, sc = p.sc, ss = Math.pow(sc, 0.72), own = p.ownStem;
      const cam = p.form && p.form.camera ? p.form.camera(p.px) : null, cy = p.cy - (cam ? cam.y || 0 : 0) * sc, cx = p.cx - (cam ? cam.x || 0 : 0) * sc;   // centra pelo centro VISUAL da forma
      if (sc === 1 && cx === 0 && cy === 0) return;
      for (let s = p.off, j = 0; j < p.N; s++, j++) { if (own && own[j]) continue; S.x[s] = cx + S.x[s] * sc; S.y[s] = cy + S.y[s] * sc; S.z[s] *= sc; S.size[s] *= ss; }
    }
    /* posições das secundárias: em tela larga, colunas dos dois lados da Nyx; em tela estreita, uma fileira embaixo */
    layout(eng, list) {
      const v = eng.view, asp = v.W / Math.max(1, v.H), ex = this.extent;
      const Sc1 = Math.min(v.W / (2 * ex[0]), v.H / (2 * ex[1])), hw = (v.W / 2) / Sc1, hh = (v.H / 2) / Sc1;
      const n = list.length, out = {};
      this.camYT = 0;
      if (!n) { this.zoomT = 1; return out; }
      // colunas encostadas nas asas da Nyx: se não houver espaço dos lados, a câmera recua (a Nyx continua a maior)
      this.zoomT = clamp(hw / (ex[0] + 0.85), 0.55, 1);
      const col = Math.min(hw / this.zoomT - 0.38, ex[0] + 0.5);
      list.forEach((id, k) => { const side = k % 2 ? -1 : 1, row = Math.floor(k / 2); out[id] = [side * col, n > 2 ? (row ? -0.47 : 0.45) : -0.02]; });
      return out;
    }
    update(eng, t, dt) {
      const S = eng.S, act = new Set(this.activeFn ? this.activeFn() : []);
      // ordem estável de chegada (quem entrou primeiro fica no primeiro lugar)
      this.order = this.order.filter(id => act.has(id)); for (const id of act) if (!this.order.includes(id)) this.order.push(id);
      const pos = this.layout(eng, this.order);
      this.zoom += ((this.zoomT ?? 1) - this.zoom) * Math.min(1, dt * 1.5); this.camY += ((this.camYT ?? 0) - this.camY) * Math.min(1, dt * 1.5);
      for (const p of this.parts) {
        if (p.primary) { p.form.update(p.px, t, dt); continue; }
        const want = act.has(p.agent);
        if (want && (p.status === 'off' || p.status === 'leaving')) {
          const tg = pos[p.agent]; if (p.status === 'off') { p.cx = tg[0]; p.cy = tg[1]; }
          // forma da faixa pode ter mudado enquanto estava fora (ex.: Ogum chegou)
          const L = PT.LOOKS[p.agent] || {}, nm = (L.pick ? L.pick(p.state) : null) || p.agent;
          if (nm !== p.formName) this.buildPart(eng, p, true); else this.activate(eng, p, 0.05);
        } else if (!want && p.status === 'on') { p.status = 'leaving'; p.leaveT = t; }
        if (p.status === 'off') continue;
        if (p.status === 'leaving') { const k = t - p.leaveT; let left = 0;
          for (let s = p.off; s < p.off + p.N; s++) { if (S.stem[s]) { left++; continue; } if (k > (1 - clamp(S.order[s], 0, 1)) * 1.1) { S.stem[s] = 1; left++; } }
          if (left >= p.N || k > 1.6) { p.status = 'off'; for (let s = p.off; s < p.off + p.N; s++) S.stem[s] = 1; continue; } }
        // troca de forma dentro da faixa enquanto ativa
        const L = PT.LOOKS[p.agent] || {}; if (p.status === 'on' && L.pick && L.pick(p.state) !== p.formName) { this.buildPart(eng, p, true, true); continue; }
        const tg = pos[p.agent]; if (tg) { const w = 3.2; p.vx += (w * w * (tg[0] - p.cx) - 2 * w * p.vx) * dt; p.cx += p.vx * dt; p.vy += (w * w * (tg[1] - p.cy) - 2 * w * p.vy) * dt; p.cy += p.vy * dt; }
        p.form.update(p.px, t, dt); this.place(eng, p);
      }
      const P0 = this.parts[0], F = P0.form;
      this.linkAlpha = F.linkAlpha; this.linkColor = F.linkColor; this.linkA = F.linkA;
      centerFocus(eng, P0.px.focus.x, P0.px.focus.y);
    }
    activeIds() { return this.parts.filter(p => !p.primary && p.status !== 'off').map(p => p.agent); }
  }
  PT.CompositeForm = CompositeForm;
})(window.PT);
