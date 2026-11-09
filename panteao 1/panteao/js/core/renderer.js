/* =====================================================================
   PANTEÃO · RENDERER compartilhado (WebGL2 · HDR · bloom em 3 escalas)
   ---------------------------------------------------------------------
   Cada superfície roda a PRÓPRIA instância do motor, mas todas desenham
   por um único contexto WebGL2 (navegadores limitam ~16 contextos vivos).
   Para cada vista: cena → bloom → composição no framebuffer padrão →
   cópia (drawImage) para o <canvas> 2D daquela vista. Assim cada vista
   respeita a ordem real das janelas no DOM (uma janela por cima de outra
   cobre de verdade), coisa que um canvas único em sobreposição não faria.
   Pipeline de partículas/bloom: mesma qualidade mínima do Renderer da
   Lilith. Fica de fora o que é língua dela: glitch, aberração cromática,
   cópia violeta desalinhada, poça de luz no chão.
   ===================================================================== */
'use strict';
(function (PT) {
  const VS_FULL = `#version 300 es
    const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));
    out vec2 vUv; void main(){ vec2 p=P[gl_VertexID]; vUv=p*0.5+0.5; gl_Position=vec4(p,0,1); }`;

  class SharedRenderer {
    constructor() {
      const canvas = document.createElement('canvas'); canvas.width = 4; canvas.height = 4;
      const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!gl) throw new Error('WebGL2 indisponível neste navegador.');
      this.canvas = canvas; this.gl = gl;
      this.hdr = !!gl.getExtension('EXT_color_buffer_float');
      this.pPart = this.prog(`#version 300 es
        layout(location=0) in vec2 aPos; layout(location=1) in float aSize; layout(location=2) in vec4 aCol; layout(location=3) in vec2 aMisc;
        uniform vec2 uRes; uniform float uMaxPt; uniform float uInk;
        out vec4 vCol; out float vRot; out float vShape;
        void main(){ vec2 c=aPos/uRes*2.0-1.0; c.y=-c.y; gl_Position=vec4(c,0,1);
          bool ink=aMisc.y>7.5;
          gl_PointSize=(ink==(uInk>0.5))?min(aSize,uMaxPt):0.0; vCol=aCol; vRot=aMisc.x; vShape=aMisc.y; }`,
        `#version 300 es
        precision highp float; in vec4 vCol; in float vRot; in float vShape; out vec4 o; uniform float uInk;
        void main(){
          if((vShape>7.5)!=(uInk>0.5)) discard;
          vec2 p=gl_PointCoord*2.0-1.0; float cs=cos(vRot), sn=sin(vRot); p=mat2(cs,-sn,sn,cs)*p;
          float core, halo;
          if(vShape<0.5){ float d=length(p); core=smoothstep(0.42,0.08,d); halo=exp(-d*d*6.5)*0.5; }
          else if(vShape<1.5){ vec2 q=abs(p)/vec2(0.40,0.24); float d=max(q.x,q.y); core=smoothstep(1.0,0.7,d); halo=exp(-dot(p,p)*5.5)*0.42; }
          else if(vShape<2.5){ float d=abs(p.x)/0.30+abs(p.y)/0.62; core=smoothstep(1.0,0.55,d); halo=exp(-dot(p,p)*6.0)*0.42; }
          else if(vShape<3.5){ core=exp(-(p.x*p.x*2.2+p.y*p.y*60.0)); halo=exp(-(p.x*p.x*1.2+p.y*p.y*16.0))*0.35; }
          else if(vShape<4.5){ float d=length(p); core=smoothstep(0.10,0.0,abs(d-0.78))*0.9; halo=exp(-pow((d-0.78)*7.0,2.0))*0.3; }   // anel fino (retículo)
          else if(vShape<7.5){ core=exp(-(p.x*p.x*0.9+p.y*p.y*140.0)); halo=0.0; }                                                   // fio: traço longo, sem halo
          else if(vShape<8.5){ float d=length(p); core=smoothstep(0.75,0.15,d); halo=0.0; }                                             // tinta (escurece)
          else { core=exp(-(p.x*p.x*1.6+p.y*p.y*30.0)); halo=0.0; }
          float a=(core+halo)*vCol.a;
          if(vShape>7.5){ o=vec4(0.0,0.0,0.0,clamp(a,0.0,1.0)); return; }
          o=vec4(vCol.rgb*a,a);
        }`);
      this.pLine = this.prog(`#version 300 es
        layout(location=0) in vec2 aPos; layout(location=1) in vec4 aCol; uniform vec2 uRes; out vec4 vCol;
        void main(){ vec2 c=aPos/uRes*2.0-1.0; c.y=-c.y; gl_Position=vec4(c,0,1); vCol=aCol; }`,
        `#version 300 es
        precision highp float; in vec4 vCol; out vec4 o; void main(){ o=vec4(vCol.rgb*vCol.a,vCol.a); }`);
      this.pBright = this.prog(VS_FULL, `#version 300 es
        precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uPx; uniform float uThr; out vec4 o;
        void main(){ vec3 c=texture(uTex,vUv+uPx*vec2(-.5,-.5)).rgb+texture(uTex,vUv+uPx*vec2(.5,-.5)).rgb+texture(uTex,vUv+uPx*vec2(-.5,.5)).rgb+texture(uTex,vUv+uPx*vec2(.5,.5)).rgb;
          c*=0.25; float l=max(c.r,max(c.g,c.b)); o=vec4(c*smoothstep(uThr,uThr+0.46,l),1.0); }`);
      this.pBlur = this.prog(VS_FULL, `#version 300 es
        precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; out vec4 o;
        void main(){ vec3 c=texture(uTex,vUv).rgb*0.2270;
          c+=(texture(uTex,vUv+uDir*1.3846).rgb+texture(uTex,vUv-uDir*1.3846).rgb)*0.3162;
          c+=(texture(uTex,vUv+uDir*3.2308).rgb+texture(uTex,vUv-uDir*3.2308).rgb)*0.0703; o=vec4(c,1.0); }`);
      this.pComp = this.prog(VS_FULL, `#version 300 es
        precision highp float; in vec2 vUv; out vec4 o;
        uniform sampler2D uScene,uB1,uB2,uB3; uniform float uTime,uAspect,uBloom,uExpo,uGrain,uVig,uTransp,uScan;
        uniform vec3 uBg0,uBg1,uGlow; uniform vec2 uFocus; uniform float uGlowAmt,uFade;
        float h2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        void main(){
          vec3 col=texture(uScene,vUv).rgb;
          vec3 bl=texture(uB1,vUv).rgb*0.9+texture(uB2,vUv).rgb*0.85+texture(uB3,vUv).rgb*0.7;
          vec2 q=(vUv-0.5)*vec2(uAspect,1.0);
          vec3 bg=mix(uBg0,uBg1,smoothstep(0.0,1.15,length(q)));
          vec2 f=(vUv-uFocus)*vec2(uAspect,1.0);
          bg+=uGlow*uGlowAmt*(0.6*exp(-dot(f,f)*4.0)+0.4*exp(-dot(f,f)*1.2));
          vec3 light=col+bl*uBloom;
          vec3 c=(uTransp>0.5?vec3(0.0):bg)+light;
          c=vec3(1.0)-exp(-c*uExpo);
          if(uScan>0.0) c*=1.0-uScan+uScan*(0.5+0.5*sin(gl_FragCoord.y*3.14159));
          c+=(h2(gl_FragCoord.xy+fract(uTime)*91.0)-0.5)*uGrain;
          c*=1.0-uVig*smoothstep(0.5,1.25,length(q));
          c=max(c,vec3(0.0))*uFade;
          if(uTransp>0.5){ float a=clamp(max(c.r,max(c.g,c.b))*1.15,0.0,1.0); o=vec4(min(c,vec3(a)),a); }
          else o=vec4(c,uFade);
        }`);
      this.vaoP = gl.createVertexArray(); this.vboP = gl.createBuffer();
      gl.bindVertexArray(this.vaoP); gl.bindBuffer(gl.ARRAY_BUFFER, this.vboP);
      const st = 9 * 4;
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, st, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, st, 8);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, st, 12);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, st, 28);
      this.vaoL = gl.createVertexArray(); this.vboL = gl.createBuffer();
      gl.bindVertexArray(this.vaoL); gl.bindBuffer(gl.ARRAY_BUFFER, this.vboL);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
      gl.bindVertexArray(null);
      this.vaoEmpty = gl.createVertexArray();
      this.maxPt = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
    }
    prog(vs, fs) {
      const gl = this.gl, mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
      return { p, u };
    }
    target(w, h) {
      const gl = this.gl, tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (this.hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo, w, h };
    }
    /* cada vista tem o seu jogo de alvos (cena + 3 escalas de bloom) */
    ensureTargets(view, w, h) {
      const T = view._targets;
      if (T && T.w === w && T.h === h) return T;
      if (T) this.freeTargets(view);
      const H2 = [Math.max(1, w >> 1), Math.max(1, h >> 1)], Q4 = [Math.max(1, w >> 2), Math.max(1, h >> 2)], E8 = [Math.max(1, w >> 3), Math.max(1, h >> 3)];
      view._targets = { w, h, s: this.target(w, h), h1: this.target(...H2), h2: this.target(...H2), q1: this.target(...Q4), q2: this.target(...Q4), e1: this.target(...E8), e2: this.target(...E8) };
      return view._targets;
    }
    freeTargets(view) {
      const T = view._targets, gl = this.gl; if (!T) return;
      for (const k of ['s', 'h1', 'h2', 'q1', 'q2', 'e1', 'e2']) { gl.deleteTexture(T[k].tex); gl.deleteFramebuffer(T[k].fbo); }
      view._targets = null;
    }
    pass(prog, out, setup) {
      const gl = this.gl; gl.useProgram(prog.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fbo); gl.viewport(0, 0, out.w, out.h);
      setup(gl, prog.u); gl.bindVertexArray(this.vaoEmpty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    tex(unit, t, loc) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.uniform1i(loc, unit); }

    /* desenha uma vista e copia para o canvas 2D dela */
    render(view) {
      const gl = this.gl, eng = view.engine, W = eng.view.W, H = eng.view.H, L = view.look;
      if (this.canvas.width < W || this.canvas.height < H) { this.canvas.width = Math.max(this.canvas.width, W); this.canvas.height = Math.max(this.canvas.height, H); }
      const T = this.ensureTargets(view, W, H);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.s.fbo); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      if (eng.lineCount > 0) {
        gl.useProgram(this.pLine.p); gl.uniform2f(this.pLine.u.uRes, W, H);
        gl.bindVertexArray(this.vaoL); gl.bindBuffer(gl.ARRAY_BUFFER, this.vboL);
        gl.bufferData(gl.ARRAY_BUFFER, eng.lineBuf.subarray(0, eng.lineCount * 12), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.LINES, 0, eng.lineCount * 2);
      }
      gl.useProgram(this.pPart.p); gl.uniform2f(this.pPart.u.uRes, W, H); gl.uniform1f(this.pPart.u.uMaxPt, this.maxPt);
      gl.bindVertexArray(this.vaoP); gl.bindBuffer(gl.ARRAY_BUFFER, this.vboP);
      gl.bufferData(gl.ARRAY_BUFFER, eng.renderBuf, gl.DYNAMIC_DRAW);
      gl.uniform1f(this.pPart.u.uInk, 0); gl.drawArrays(gl.POINTS, 0, eng.N);
      gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(this.pPart.u.uInk, 1); gl.drawArrays(gl.POINTS, 0, eng.N);
      gl.disable(gl.BLEND);
      const thr = L.bloomThreshold ?? 0.04;
      this.pass(this.pBright, T.h1, (gl, u) => { this.tex(0, T.s, u.uTex); gl.uniform2f(u.uPx, 1 / W, 1 / H); gl.uniform1f(u.uThr, thr); });
      this.pass(this.pBlur, T.h2, (gl, u) => { this.tex(0, T.h1, u.uTex); gl.uniform2f(u.uDir, 1 / T.h1.w, 0); });
      this.pass(this.pBlur, T.h1, (gl, u) => { this.tex(0, T.h2, u.uTex); gl.uniform2f(u.uDir, 0, 1 / T.h1.h); });
      this.pass(this.pBright, T.q1, (gl, u) => { this.tex(0, T.h1, u.uTex); gl.uniform2f(u.uPx, 1 / T.h1.w, 1 / T.h1.h); gl.uniform1f(u.uThr, thr); });
      this.pass(this.pBlur, T.q2, (gl, u) => { this.tex(0, T.q1, u.uTex); gl.uniform2f(u.uDir, 1 / T.q1.w, 0); });
      this.pass(this.pBlur, T.q1, (gl, u) => { this.tex(0, T.q2, u.uTex); gl.uniform2f(u.uDir, 0, 1 / T.q1.h); });
      this.pass(this.pBright, T.e1, (gl, u) => { this.tex(0, T.q1, u.uTex); gl.uniform2f(u.uPx, 1 / T.q1.w, 1 / T.q1.h); gl.uniform1f(u.uThr, thr); });
      this.pass(this.pBlur, T.e2, (gl, u) => { this.tex(0, T.e1, u.uTex); gl.uniform2f(u.uDir, 1.5 / T.e1.w, 0); });
      this.pass(this.pBlur, T.e1, (gl, u) => { this.tex(0, T.e2, u.uTex); gl.uniform2f(u.uDir, 0, 1.5 / T.e1.h); });
      // composição no framebuffer padrão, no canto de cima da imagem (linhas 0..H do drawImage)
      const CH = this.canvas.height;
      gl.useProgram(this.pComp.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, CH - H, W, H);
      const u = this.pComp.u;
      this.tex(0, T.s, u.uScene); this.tex(1, T.h1, u.uB1); this.tex(2, T.q1, u.uB2); this.tex(3, T.e1, u.uB3);
      gl.uniform1f(u.uTime, eng.t); gl.uniform1f(u.uAspect, W / H);
      gl.uniform1f(u.uBloom, L.bloom ?? 1); gl.uniform1f(u.uExpo, L.exposure ?? 1.25); gl.uniform1f(u.uGrain, L.grain ?? 0.018);
      gl.uniform1f(u.uVig, L.vignette ?? 0.35); gl.uniform1f(u.uTransp, view.transparent ? 1 : 0); gl.uniform1f(u.uScan, L.scan ?? 0);
      gl.uniform3fv(u.uBg0, L.bg0 || [0.02, 0.02, 0.03]); gl.uniform3fv(u.uBg1, L.bg1 || [0.004, 0.004, 0.008]); gl.uniform3fv(u.uGlow, L.glow || [0.2, 0.2, 0.3]);
      gl.uniform1f(u.uGlowAmt, L.glowAmt ?? 0.1); gl.uniform1f(u.uFade, view.fade ?? 1);
      const fx = 0.5 + (eng.focus.x - eng.cam.x) * eng.screenScale() / W, fy = 0.5 + (eng.focus.y - eng.cam.y) * eng.screenScale() / H;
      gl.uniform2f(u.uFocus, fx, fy);
      gl.bindVertexArray(this.vaoEmpty); gl.drawArrays(gl.TRIANGLES, 0, 3);
      const ctx = view.ctx;
      if (view.transparent) ctx.clearRect(0, 0, W, H);
      ctx.drawImage(this.canvas, 0, 0, W, H, 0, 0, W, H);
    }
  }
  PT.SharedRenderer = SharedRenderer;
})(window.PT);
