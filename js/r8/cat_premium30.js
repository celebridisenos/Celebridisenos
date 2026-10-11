// ================= v30.4 · 💎 PREMIUM CELEBRIDISEÑOS: vasos, macetas y jarrones con relieve de lujo =================
// La dueña (11-10-2026): «…macetas, jarrones premium… vasos celebridiseños premium». Relieves que se hacen deformando una pieza de
// revolución (acolchado en rombos, estrías, espiral, facetado). Por dentro liso (se limpia bien) y «CelebriDiseños» debajo (marca.js).
import * as N from './nucleo.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const M = () => N.MF(), CS = () => N.CSX();
const TAU = Math.PI * 2;
// el relieve: cuánto se hunde la pared (0 = nada, 1 = todo) en el ángulo a y la altura t (0…1) de una pieza de alto H
const fr = x => Math.abs(x - Math.round(x)); // distancia a la línea más cercana (0…0,5)
export const RELIEVES = {
  acolchado: { t: '💠 Acolchado en rombos (tipo bolso)', f: (a, z, o) => { const u = a * o.n / TAU + z / o.paso, v = a * o.n / TAU - z / o.paso, d = Math.min(fr(u), fr(v)); return Math.pow(Math.max(0, 1 - d / 0.2), 2); } }, // surcos redondos y «cojines» entre ellos
  estrias: { t: '🏛️ Estrías (columna)', f: (a, z, o) => 0.5 + 0.5 * Math.cos(TAU * a * o.n / TAU) },
  espiral: { t: '🌀 Espiral', f: (a, z, o) => 0.5 + 0.5 * Math.cos(TAU * (a * o.n / TAU + z / o.paso * 0.5)) },
  facetado: { t: '💎 Diamantes (facetas)', f: (a, z, o) => { const u = a * o.n / TAU + z / o.paso, v = a * o.n / TAU - z / o.paso; return 1 - 2 * Math.max(fr(u), fr(v)); } },
  liso: { t: '◯ Liso', f: () => 0 }
};
// pieza de revolución con relieve: perfil r(t) (t 0…1), alto H; el relieve se aplica entre z0 y z1 (mm) con «hondo» mm
function conRelieve(H, perfil, tipo, o) {
  const R0 = perfil(0.5), seg = Math.min(720, Math.max(160, Math.round(o.n * 28))), capas = Math.min(400, Math.max(60, Math.round(H / 0.45)));
  let m = CS().circle(1, seg).extrude(H, capas);
  const f = (RELIEVES[tipo] || RELIEVES.liso).f;
  m = m.warp(v => { const a = Math.atan2(v[1], v[0]) + Math.PI, z = v[2], t = z / H; let r = perfil(t); if (z > o.z0 && z < o.z1) { const borde = Math.min(1, (z - o.z0) / 2, (o.z1 - z) / 2); r -= o.hondo * f(a, z, o) * borde; } const k = Math.hypot(v[0], v[1]); if (k > 1e-6) { v[0] *= r / k; v[1] *= r / k; } });
  void R0; return m;
}
// v30.4 · 🥤 VASO PREMIUM (o portalápices / portavelas): pared lisa por dentro, relieve por fuera, culo grueso
function vasoPremium(p) {
  const H = p.alto, R = p.d / 2, e = p.pared, conica = p.conico / 100;
  const perfil = t => R * (1 - conica * (1 - t)) + (t > 0.985 ? -0.3 : 0); // un pelín más ancho arriba
  const fuera = conRelieve(H, perfil, p.relieve, { n: Math.round(p.motivos), paso: p.paso, hondo: p.hondo, z0: p.base + 4, z1: H - p.borde });
  const dentro = N.MF().cylinder(H, R * (1 - conica) - e - p.hondo, R - e - p.hondo, 128).translate([0, 0, p.base]); // la pared nunca baja de «pared», ni en el fondo del relieve
  let m = fuera.subtract(dentro);
  // labio de arriba redondeado (más agradable al beber)
  return m;
}

// hueco de revolución que sigue un perfil (por dentro liso)
function revolucion(H, perfil, z0, pasos = 80) { const P = [[0, z0]]; for (let i = 0; i <= pasos; i++) { const t = i / pasos, z = z0 + t * (H - z0); P.push([Math.max(0.5, perfil(z / H)), z]); } P.push([Math.max(0.5, perfil(1)), H + 2], [0, H + 2]); return CS().ofPolygons([N.ccw(P)]).revolve(160); }
// 🪴 MACETA PREMIUM: relieve, agujero de drenaje y plato a juego (aparte)
function macetaPremium(p) {
  const H = p.alto, R = p.d / 2, e = p.pared, ab = p.abajo / 100, perfil = t => R * (ab + (1 - ab) * t);
  let m = conRelieve(H, perfil, p.relieve, { n: Math.round(p.motivos), paso: p.paso, hondo: p.hondo, z0: 6, z1: H - 8 });
  m = m.subtract(revolucion(H, t => perfil(t) - e - p.hondo, 4)).subtract(N.MF().cylinder(10, p.drenaje / 2, p.drenaje / 2, 40).translate([0, 0, -1]));
  if (!p.plato) return m;
  const Rp = R * ab + 8, plato = N.MF().cylinder(14, Rp, Rp + 3, 120).subtract(N.MF().cylinder(14, Rp - 2.4, Rp + 0.6, 120).translate([0, 0, 2.4]));
  return m.add(plato.translate([R + Rp + 10, 0, 0]));
}
// 🏺 JARRÓN PREMIUM: barriga, cuello y boca; hueco con pared uniforme (perfil a menos de 45°: sin soportes)
function jarronPremium(p) {
  const H = p.alto, R = p.d / 2, e = p.pared, k = p.cuello / 100;
  // perfil por puntos (base, barriga, hombro-cuello, boca) unidos con curvas suaves (coseno): nunca pasa de 45°
  const K = [[0, 0.64], [0.4, 1], [0.8, k], [1, k * 1.2]], sm = t => { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const [t0, r0] = K[i], [t1, r1] = K[i + 1], u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))); return R * (r0 + (r1 - r0) * (1 - Math.cos(Math.PI * u)) / 2); };
  let m = conRelieve(H, sm, p.relieve, { n: Math.round(p.motivos), paso: p.paso, hondo: p.hondo, z0: 5, z1: H * 0.66 });
  if (p.pared > 0) m = m.subtract(revolucion(H, t => sm(t) - e - p.hondo * Math.max(0, Math.min(1, (t * H - 3) / 2, (H * 0.66 + 2 - t * H) / 2)), 3, 160));
  return m;
}

export const DISENOS_PREMIUM30 = {
  vasoPremium: { cat: 'vasos', tambien: ['adultos', 'regalos', 'organizar'], e: '🥤', t: 'Vaso CelebriDiseños premium', d: 'Acolchado en rombos, estrías, espiral o facetado · también portalápices o portavelas', uso: 'deco', color: '#efe7da', acabado: 'seda', nuevo: true,
    campos: [s('relieve', 'Relieve', 'acolchado', Object.entries(RELIEVES).map(([k, v]) => [k, v.t])), n('d', 'Diámetro', 80, 50, 120, 1), n('alto', 'Alto', 110, 60, 180, 1), n('conico', 'Más estrecho abajo', 10, 0, 25, 1, '%'), n('motivos', 'Motivos alrededor', 12, 6, 30, 1, ''), n('paso', 'Alto de cada rombo', 22, 10, 50, 1), n('hondo', 'Hondo del relieve', 1.6, 0.6, 3, 0.1), n('pared', 'Pared', 2.4, 1.6, 4, 0.1), n('base', 'Culo', 3, 2, 6, 0.5), n('borde', 'Franja lisa arriba', 12, 0, 30, 1)],
    gen: p => vasoPremium(p), nota: p => 'De pie, sin soportes (el relieve no pasa de 45°). Para BEBER: PETG o PLA apto para alimentos y lavado a mano (las capas guardan restos: mejor para lápices, brochas, velas LED o flores secas). PLA seda (perla, oro) queda de lujo. «CelebriDiseños» va grabado debajo.' },
  macetaPremium: { cat: 'macetas', tambien: ['adultos', 'hogar', 'regalos'], e: '🪴', t: 'Maceta CelebriDiseños premium', d: 'Con relieve de lujo, agujero de drenaje y plato a juego', uso: 'deco', color: '#d9c8b4', acabado: 'mate', nuevo: true,
    campos: [s('relieve', 'Relieve', 'facetado', Object.entries(RELIEVES).map(([k, v]) => [k, v.t])), n('d', 'Diámetro de arriba', 120, 60, 200, 1), n('alto', 'Alto', 105, 50, 200, 1), n('abajo', 'Abajo (% de arriba)', 72, 50, 100, 1, '%'), n('motivos', 'Motivos alrededor', 14, 6, 30, 1, ''), n('paso', 'Alto de cada motivo', 26, 10, 60, 1), n('hondo', 'Hondo del relieve', 2, 0.6, 4, 0.1), n('pared', 'Pared', 2.4, 1.6, 4, 0.1), n('drenaje', 'Agujero de drenaje', 12, 0, 25, 1), { k: 'plato', t: 'Con plato a juego', v: true, chk: 1 }],
    gen: p => macetaPremium(p), nota: () => 'De pie, sin soportes. PLA mate (terracota, arena, blanco) o seda. Para planta de verdad: PETG (aguanta el agua y el sol). El plato va aparte, en la misma cama.' },
  jarronPremium: { cat: 'jarrones', tambien: ['adultos', 'hogar', 'regalos'], e: '🏺', t: 'Jarrón CelebriDiseños premium', d: 'Barriga con relieve (rombos, diamantes, estrías o espiral) y cuello liso · hueco', uso: 'deco', color: '#1b1b1f', acabado: 'seda', nuevo: true,
    campos: [s('relieve', 'Relieve', 'acolchado', Object.entries(RELIEVES).map(([k, v]) => [k, v.t])), n('d', 'Ancho de la barriga', 110, 60, 180, 1), n('alto', 'Alto', 210, 100, 250, 1), n('cuello', 'Boca (% de la barriga)', 42, 25, 70, 1, '%'), n('motivos', 'Motivos alrededor', 14, 6, 30, 1, ''), n('paso', 'Alto de cada motivo', 30, 10, 60, 1), n('hondo', 'Hondo del relieve', 2, 0.6, 4, 0.1), n('pared', 'Pared (0 = macizo, para «Jarrón en espiral»)', 2.4, 0, 4, 0.1)],
    gen: p => jarronPremium(p), usoDe: p => p.pared > 0 ? 'deco' : 'jarron', nota: () => 'De pie, sin soportes (la curva no pasa de 45°). Hueco de serie: para flores secas. Con pared 0 sale macizo para imprimirlo en «Jarrón en espiral». PLA seda negro, oro o perla: de escaparate.' }
};
