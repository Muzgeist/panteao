/* =====================================================================
   PANTEÃO · CASCO E SUPERFÍCIES
   ---------------------------------------------------------------------
   • Casco: abre e fecha sob demanda (Ctrl+Espaço). O conteúdo PERSISTENTE
     dele é a composição da Nyx (js/surfaces/nyx.js) — sem moldura, sem
     título, sem botão de fechar. Fechar o casco esconde tudo; nenhum agente
     para de rodar.
   • Superfícies individuais (Cérbero, Caronte, Ogum, Morfeu) e as telas
     transversais abrem como PAINÉIS de HUD encaixados na borda direita, em
     posição determinística (sem cascata, sem sombra de janela de SO, sem X
     proeminente — só "recolher" discreto). Abrir/fechar reflui os demais.
   • Exceção estrutural (inalterada): o Cérbero vive na camada própria
     #canal-cerbero, fora do casco — abre com o casco fechado, com a Nyx
     indisponível, por Ctrl+Shift+C ou pela presença dele no canto.
   INTEGRAÇÃO FUTURA: no app real cada superfície vira janela nativa
   (Electron/Tauri) e o canal do Cérbero um processo com IPC próprio.
   ===================================================================== */
'use strict';
(function (PT) {
  const el = (t, c, x) => PT.Seals.el(t, c, x);
  const GAP = 12;
  const WM = {
    wins: {}, order: [], casco: false, cascoEl: null, cerbEl: null, comp: null,
    init() {
      this.cascoEl = document.getElementById('casco'); this.cerbEl = document.getElementById('canal-cerbero');
      this.comp = PT.Composition.mount(this.cascoEl);   // a Nyx: conteúdo persistente do casco
      this.setCasco(false);
      addEventListener('resize', () => this.reflow());
      addEventListener('keydown', e => { if (e.key === 'Escape' && this.order.length && !document.querySelector('.modal')) { const id = this.order[this.order.length - 1]; if (this.layerOf(id) === 'casco' ? this.casco : true) this.close(id); } });
    },
    cascoOpen() { return this.casco; },
    setCasco(open) { this.casco = !!open; this.cascoEl.hidden = !open; document.body.classList.toggle('casco-aberto', !!open); this.reflow(); PT.bus.emit('casco', this.casco); },
    toggleCasco() { this.setCasco(!this.casco); },
    layerOf(id) { return id === 'cerbero' ? 'cerbero' : 'casco'; },
    /* a Nyx não é janela: "aberta" = casco aberto */
    isOpen(id) { if (id === 'nyx') return this.casco; return !!this.wins[id] && (this.layerOf(id) === 'cerbero' || this.casco); },
    open(id) {
      if (id === 'nyx') { this.setCasco(true); return null; }
      const def = PT.Surfaces[id]; if (!def) return;
      if (this.layerOf(id) === 'casco' && !this.casco) this.setCasco(true);
      if (this.wins[id]) { this.order = this.order.filter(x => x !== id).concat(id); this.reflow(); return this.wins[id]; }
      const w = el('section', 'win'); w.dataset.id = id; if (def.agent) w.dataset.agent = def.agent;
      w.setAttribute('role', 'region'); w.setAttribute('aria-label', def.title);
      const h = el('header', 'win__h'), glyph = el('i', 'win__glyph'); glyph.setAttribute('aria-hidden', 'true');
      h.append(glyph, el('h2', 'win__title', def.title));
      if (def.agent) h.appendChild(PT.Seals.presence(def.agent, 'compact'));
      h.appendChild(el('span', 'win__sp'));
      const x = el('button', 'win__btn', 'recolher'); x.type = 'button'; x.title = 'Recolher (Esc). O agente continua rodando.'; x.onclick = () => this.close(id); h.appendChild(x);
      const b = el('div', 'win__b'); w.append(h, b);
      (this.layerOf(id) === 'cerbero' ? this.cerbEl : this.cascoEl).appendChild(w);
      const inst = def.mount(b, { el: w, body: b, close: () => this.close(id) }) || {};
      this.wins[id] = { el: w, inst, def }; this.order.push(id);
      this.reflow(); PT.bus.emit('wm', { id, open: true });
      return this.wins[id];
    },
    close(id) {
      if (id === 'nyx') return;   // a Nyx não fecha como janela; Ctrl+Espaço esconde o casco inteiro
      const W = this.wins[id]; if (!W) return;
      try { W.inst.unmount && W.inst.unmount(); } catch (e) { console.error(e); }
      W.el.querySelectorAll('canvas').forEach(c => { for (const v of PT.Stage.views) if (v.canvas === c) PT.Stage.remove(v); });
      W.el.remove(); delete this.wins[id]; this.order = this.order.filter(x => x !== id);
      this.reflow(); PT.bus.emit('wm', { id, open: false });
    },
    focus(id) { if (this.wins[id]) { this.order = this.order.filter(x => x !== id).concat(id); this.reflow(); } },
    /* trilho à direita: o mais recente encosta na borda; os anteriores à esquerda dele */
    reflow() {
      const mobile = innerWidth < 760; let right = GAP, railCasco = 0, second = GAP;
      const vis = this.order.filter(id => this.layerOf(id) === 'cerbero' || this.casco).reverse();
      vis.forEach((id, k) => {
        if (k >= 2 && !mobile) { right = second + (k - 1) * 26; }   // a partir do terceiro: empilha atrás do segundo (nunca escapa da tela)
        if (k === 1) second = right;
        const W = this.wins[id], def = W.def, w = Math.min(typeof def.w === 'function' ? def.w() : def.w || 440, innerWidth - 2 * GAP);
        if (mobile) { Object.assign(W.el.style, { left: '0px', right: '0px', top: '30px', bottom: '0px', width: 'auto', zIndex: 30 + (vis.length - k) }); return; }
        Object.assign(W.el.style, { right: right + 'px', left: 'auto', top: '42px', bottom: GAP + 'px', width: w + 'px', zIndex: 30 + (vis.length - k) });
        W.el.classList.toggle('is-front', k === 0);
        if (k < 2) { right += w + GAP; railCasco = right - GAP; }
      });
      if (mobile) railCasco = 0;
      document.body.style.setProperty('--rail', (vis.length ? railCasco + GAP : 0) + 'px');
    }
  };
  PT.WM = WM; PT.Surfaces = PT.Surfaces || {};
})(window.PT);
