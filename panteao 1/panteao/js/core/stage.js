/* =====================================================================
   PANTEÃO · STAGE — vistas e laço de quadros
   ---------------------------------------------------------------------
   Uma View = um <canvas> 2D + a PRÓPRIA instância do motor + a forma do
   agente. Só vistas visíveis (no DOM, dentro da tela, janela não oculta)
   avançam e desenham: a aparência pausa, o agente não — a vida de cada
   agente está no runtime (system/agents.js), que roda sempre, com ou sem
   painel aberto. A forma lê o estado do agente a cada quadro.
   ===================================================================== */
'use strict';
(function (PT) {
  const t0 = performance.now();
  PT.now = () => (performance.now() - t0) / 1000;

  class View {
    constructor(canvas, opts = {}) {
      this.canvas = canvas; this.opts = opts; this.agent = opts.agent;
      this.state = opts.state || (PT.Agents ? PT.Agents.get(this.agent) : {}) || {};
      const L = PT.LOOKS[this.agent] || PT.LOOKS[opts.form] || {};
      this.pick = L.pick || null;
      this.engine = new PT.Engine(opts.N || 3000, Object.assign({}, L.cfg, opts.cfg));
      this.look = Object.assign({}, L.look, opts.look);
      this.transparent = !!opts.transparent; this.fade = opts.fade ?? 1; this.dprCap = opts.dprCap || 1.5;
      this.ctx = canvas.getContext('2d');
      this.formName = null; this.paused = false;
      this.formOpts = { zoom: opts.zoom, presence: opts.presence, seed: opts.seed };
      this.every = opts.every || 1; this._k = 0; this._acc = 0;   // vistas pequenas/ambiente podem atualizar a cada N quadros
    }
    wantForm() { return this.opts.form || (this.pick ? this.pick(this.state) : this.agent); }
    syncForm() {
      if (this.opts.makeForm) { if (!this.formName) { this.formName = 'composta'; this.form = this.opts.makeForm(this); this.engine.setForm('composta', this.form); } return; }   // forma pronta (ex.: palco composto)
      const name = this.wantForm();
      if (name !== this.formName) { const f = PT.FORMS[name]; if (!f) return; this.formName = name; this.engine.setForm(name, f(this.state, this.formOpts)); }
    }
    resize() {
      const c = this.canvas, cw = c.clientWidth, ch = c.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
      const W = Math.max(1, Math.round(cw * dpr)), H = Math.max(1, Math.round(ch * dpr));
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const v = this.engine.view; v.W = W; v.H = H; v.dpr = dpr;
      return cw > 3 && ch > 3;
    }
    visible() {
      if (this.paused || !this.canvas.isConnected) return false;
      if (this.canvas.offsetParent === null && getComputedStyle(this.canvas).position !== 'fixed') return false;
      const r = this.canvas.getBoundingClientRect();
      return r.width > 3 && r.height > 3 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
    }
  }

  const Stage = {
    views: new Set(), renderer: null, failed: null, last: 0, fps: 0,
    init() {
      try { this.renderer = new PT.SharedRenderer(); }
      catch (e) { this.failed = e.message; console.error(e); }
      this.last = performance.now();
      const frame = now => { requestAnimationFrame(frame); this.frame(now); };
      requestAnimationFrame(frame);
    },
    add(canvas, opts) {
      const v = new View(canvas, opts); this.views.add(v);
      if (this.failed) { const p = canvas.parentElement; if (p && !p.querySelector('.gl-fail')) { const m = document.createElement('div'); m.className = 'gl-fail'; m.textContent = 'WebGL2 indisponível: ' + this.failed; p.appendChild(m); } }
      return v;
    },
    remove(v) { if (!v) return; this.views.delete(v); if (this.renderer) this.renderer.freeTargets(v); },
    frame(now) {
      let dt = (now - this.last) / 1000; this.last = now; dt = Math.min(dt, 1 / 20);
      this.fps = this.fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
      if (!this.renderer) return;
      for (const v of this.views) {
        if (!v.canvas.isConnected) { this.remove(v); continue; }
        if (!v.visible() || !v.resize()) continue;
        v._acc += dt; if (++v._k % v.every) continue;
        const vdt = Math.min(v._acc, 1 / 12); v._acc = 0;
        v.syncForm();
        const sub = Math.max(1, Math.ceil(vdt / (1 / 40)));
        for (let k = 0; k < sub; k++) v.engine.step(vdt / sub);
        v.engine.pack(); this.renderer.render(v);
      }
    },
    /* avanço determinístico (testes/capturas) */
    advance(sec, fps = 60) { for (const v of this.views) { if (!v.visible() || !v.resize()) continue; v.syncForm(); for (let k = 0, n = Math.round(sec * fps); k < n; k++) v.engine.step(1 / fps); v.engine.pack(); this.renderer.render(v); } }
  };
  PT.View = View; PT.Stage = Stage;
})(window.PT);
