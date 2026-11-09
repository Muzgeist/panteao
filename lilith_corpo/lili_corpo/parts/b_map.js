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
/* modo compacto: o MESMO corpo, menor e mais leve para ficar no canto da tela. Menos cachos e dedos;
   rosto, marcas e silhueta do tronco ganham fatia maior para continuarem legíveis com menos células */
const ALLOC_COMPACT = Object.assign({}, ALLOC_FULL, { hair: 0.165, hand: 0.016, shell: 0.045, eyes: 0.044, faceX: 0.015, mouth: 0.025, brows: 0.007, nose: 0.005, torso: 0.142, prop: 0.02, asas: 0.04 });
const COMPACT = { N: 6000, Nmobile: 4500, headK: 1.12, zoom: 0.37 };   // a cabeça encolhe um pouco menos: nunca chibi
let HEADK = 1;   // escala atual da cabeça (1 no corpo inteiro); quem desfaz a matriz da cabeça divide por HEADK²
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
