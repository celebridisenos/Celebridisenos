// ================= 17-10-2026 · 🔥 FUNDAS DE MECHERO (que entren de verdad) y 🗿 CENICEROS ARTÍSTICOS (el humo sale por la boca) =================
// Ella: «más fundas de mechero; me gustó el que me hiciste, pero no entra ni los mecheros Clipper ni los BIC esos chiquitos; más
// ceniceros artísticos, que salga el humo por una boca… pero artístico».
// MEDIDAS (17-10-2026, de su fuente): BIC J25 mini 22 × 62 × 11 · J23 slim 22 × 76 × 11 · J26 maxi 25 × 82 × 15 (BIC Graphic, ficha
// de producto) · Clipper grande ~74 de alto (Wikipedia) y 22,5–25 × 17,1 de sección (registro de Hong Kong, EMSD: modelos CK11R/CKJ11).
// Lo que fallaba en la funda de antes: estaba hecha solo para el maxi, con 0,2 mm de aire y nervios que aprietan, y se imprimía tumbada
// (el techo del hueco cede y lo estrecha). Ahora: se imprime DE PIE (el hueco sale exacto), 0,5 mm de aire por lado y una LENGÜETA que
// sujeta el mechero sin apretarlo, cada modelo con sus medidas y una PRUEBA DE ENCAJE de 1 cm para probar con tu mechero.
// CENICEROS: el plástico impreso se ablanda a 55–80 °C y la brasa pasa de 400 °C: la ceniza y la brasa van SIEMPRE sobre un vaso de
// aluminio de vela (Ø 39 × 15, los de las velitas de té). Encima, una CABEZA HUECA: el humo sube por dentro y, como la única salida alta
// es la boca, sale por la boca. La cabeza se levanta para vaciar.
import * as N from './nucleo.js';
import * as PT from './patrones.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(128, Math.round(d * 1.6 + 24)));
const rr = (w, h, r = 0, x = 0, y = 0) => { const S = CS().square([Math.max(0.02, w - 2 * r), Math.max(0.02, h - 2 * r)], true); return (r > 0.05 ? S.offset(r, 'Round', 2, seg(2 * r)) : S).translate([x, y]); };
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cil = (d, z0, z1, x = 0, y = 0, d2) => M().cylinder(z1 - z0, d / 2, (d2 == null ? d : d2) / 2, seg(Math.max(d, d2 || 0))).translate([x, y, z0]);
const P2 = pts => N.cs([N.ccw(pts)], 'Positive');
// un dibujo en el plano (y, z) estirado a lo largo de X · otro en el plano (x, z) estirado a lo largo de Y
const enYZ = (cs, x0, x1) => cs.extrude(x1 - x0).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1]);
const enXZ = (cs, y0, y1) => cs.extrude(y1 - y0).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, y0, 0, 1]);
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');

// ======================= 🔥 FUNDAS DE MECHERO =======================
// w = ancho, t = grueso, h = alto total del mechero, cab = lo que asoma por arriba (capuchón metálico y rueda), r = curva de sus cantos
export const MECHEROS = {
  bicMini: { t: 'BIC mini (J25)', w: 22, g: 11, h: 62, cab: 15, r: 5 },
  bicSlim: { t: 'BIC slim (J23)', w: 22, g: 11, h: 76, cab: 15, r: 5 },
  bicMaxi: { t: 'BIC maxi (J26)', w: 25, g: 15, h: 82, cab: 16, r: 6.5 },
  clipper: { t: 'Clipper grande', w: 25, g: 17.2, h: 74, cab: 16, r: 7.5 },
  medida: { t: 'A mi medida (con el calibre)', w: 25, g: 15, h: 80, cab: 16, r: 6 }
};
export function fundaMedidas(p) {
  const B = MECHEROS[p.modelo] || MECHEROS.bicMaxi, med = p.modelo === 'medida';
  const w = med ? p.ancho : B.w, g = med ? p.grueso : B.g, h = med ? p.alto : B.h, c = 0.5, e = 1.8, suelo = 1.6;
  const r = Math.min(B.r, g / 2 - 0.2), H = Math.max(25, h - B.cab) + suelo;
  return { B, w, g, h, c, e, suelo, r, H, wi: w + 2 * c, gi: g + 2 * c, wo: w + 2 * c + 2 * e, go: g + 2 * c + 2 * e };
}
export function fundaMechero(p, prueba) {
  const Q = fundaMedidas(p), { wi, gi, wo, go, r, c, e, suelo } = Q, H = prueba ? 10 : Q.H;
  const dentro = rr(wi, gi, r + c), fuera = rr(wo, go, r + c + e);
  let m = fuera.extrude(H).subtract(dentro.extrude(H + 1).translate([0, 0, prueba ? -1 : suelo]));
  if (prueba) return m;
  // la LENGÜETA (en la cara ancha de atrás, y > 0): una U recortada; arriba, un bultito de 0,9 mm hacia dentro que sujeta el mechero
  const lw = Math.min(10, wi - 2 * r), z0 = H * 0.3, z1 = H * 0.78, yC = gi / 2;
  m = m.subtract(cubo(-lw / 2 - 1, -lw / 2, yC - 1, yC + e + 1, z0, z1 + 1)).subtract(cubo(lw / 2, lw / 2 + 1, yC - 1, yC + e + 1, z0, z1 + 1)).subtract(cubo(-lw / 2 - 1, lw / 2 + 1, yC - 1, yC + e + 1, z1, z1 + 1));
  m = m.add(M().hull([cubo(-lw / 2 + 1, lw / 2 - 1, yC - 0.9, yC + 0.01, z1 - 6, z1 - 3), cubo(-lw / 2 + 1, lw / 2 - 1, yC - 0.01, yC + 0.01, z1 - 9, z1 - 0.5)])); // (rampa a 45° por debajo: sin soportes)
  // el ESTILO en la cara de delante (y < 0) y en los lados
  const yF = -go / 2, ancho = wo - 2 * (r + c + e) + 4, alto = H - 10;
  if (p.estilo === 'calado' || p.estilo === 'panal') {
    const huecos = PT.agujeros2D(p.estilo === 'panal' ? 'panal' : 'voronoi', ancho, alto, p.estilo === 'panal' ? 5 : 7, 1.6, 9);
    if (huecos && !huecos.isEmpty()) m = m.subtract(enXZ(huecos.translate([0, H / 2]), yF - 1, yF + e + 0.5));
  }
  if (p.estilo === 'escamas') { const L = []; for (let j = 0; j < 30; j++) for (let i = -6; i <= 6; i++) { const x = i * 6 + (j % 2 ? 3 : 0), z = 6 + j * 4.2; if (z > H - 5 || Math.abs(x) > ancho / 2) continue; L.push(CS().circle(3.4, 24).subtract(CS().circle(2.7, 24)).subtract(rr(8, 4, 0, 0, 2)).translate([x, z])); }
    if (L.length) m = m.subtract(enXZ(N.csUnion(L), yF - 1, yF + 0.6)); }
  if (p.estilo === 'rayas') { const L = []; for (let x = -ancho / 2 + 2; x <= ancho / 2 - 2; x += 3) L.push(rr(1.2, alto, 0.5, x, H / 2)); m = m.subtract(enXZ(N.csUnion(L), yF - 1, yF + 0.6)); }
  const t = String(p.texto || '').trim();
  if (t && p.estilo !== 'calado' && p.estilo !== 'panal') { try { let T = N.centraCS(N.texto2(t, p.fuente || 'gorda', 7)); const b = N.cajaCS(T), k = Math.min(1, (alto - 4) / b.w, (ancho - 4) / b.h); T = T.scale([k, k]).rotate(90).translate([0, H / 2]);
    m = m.subtract(enXZ(T, yF - 1, yF + 0.7)); } catch (x) { /* sin letras (pruebas sin navegador) */ } }
  // anilla para el mosquetón (en el lado, arriba, a 45°: sin soportes)
  if (p.anilla !== false) { const xA = wo / 2 - 1; m = m.add(M().hull([cubo(xA, xA + 0.5, -3, 3, H - 19, H - 2), cubo(xA, xA + 8, -3, 3, H - 11, H - 2)]).subtract(M().cylinder(10, 1.9, 1.9, 24).rotate([90, 0, 0]).translate([xA + 4.6, 5, H - 6.5]))); } // (agujero de Ø3,8 para la anilla: horizontal y pequeño, sin soportes)
  return m;
}

// ======================= 🗿 CENICEROS ARTÍSTICOS =======================
export const VASO = { d: 39.6, h: 15 }; // el vaso de aluminio de las velitas de té (Ø 38–39 × 15–16): el hueco, con 0,6 de aire
// la BASE: el hueco del vaso en el centro, dos canales para los cigarros (uno a cada lado) y el escalón donde encaja la cabeza
export function ceniceroBase(p, huella) {
  const D = p.base, hB = 14, yv = 0;
  let m = cil(D, 0, hB - 1.6).add(cil(D, hB - 1.6, hB, 0, 0, D - 3.2)); // (el canto de arriba, a 45°)
  m = m.subtract(cil(VASO.d, hB - VASO.h + 1.5, hB + 1, 0, yv)); // el vaso asoma 1,5 mm
  // el escalón de la cabeza (1,2 mm de hondo con 0,4 de aire alrededor de su huella)
  if (huella) m = m.subtract(huella.offset(0.4, 'Round', 2, 24).extrude(1.21).translate([0, 0, hB - 1.2]));
  // los canales: un cigarro de Ø 8 tumbado, con la brasa encima del vaso
  [-1, 1].forEach(sg => { const L = D / 2 - 6; m = m.subtract(M().cylinder(L, 4.6, 4.6, 32).rotate([0, 90, 0]).translate([sg > 0 ? 8 : -8 - L, 0, hB + 1.5])); }); // (del borde hasta encima del vaso)
  return m;
}
// la cabeza de MOÁI (esculpida: 17-10 tarde, ella: «quiero ver arte»), hueca, con los labios en «O» fumando (por ahí sale el humo),
// la ceja pesada, las cuencas hondas, la nariz larga con sus aletas, la barbilla marcada y las orejas largas. Todo lo que sobresale lleva
// por debajo un apoyo a 45° contra la cara (se imprime de pie, sin soportes) y detrás de los ojos queda pared (el humo solo sale por la boca).
const bola = (r, x, y, z) => M().sphere(r, 40).translate([x, y, z]);
const ovo = (rx, ry, rz, x, y, z) => M().sphere(1, 40).scale([rx, ry, rz]).translate([x, y, z]);
export function moai(p) {
  const S = p.alto / 110, W = 60 * S, Dp = 58 * S, H = p.alto, e = 2.6, R = 9 * S;
  // el bloque: de frente (x, z), la cabeza larga con la coronilla más estrecha; de lado (y, z), la frente que se va hacia atrás
  const frente = d => P2([[-W / 2 + d, 0], [W / 2 - d, 0], [W / 2 - d, H * 0.8], [W / 2 - 7 * S - d, H - d], [-W / 2 + 7 * S + d, H - d], [-W / 2 + d, H * 0.8]]);
  const lado = d => P2([[Dp / 2 - d, 0], [Dp / 2 - d, H * 0.86], [Dp / 2 - 10 * S - d, H - d], [-Dp / 2 + 6 * S + d, H - d], [-Dp / 2 + d, H * 0.70], [-Dp / 2 + d, 0]]);
  const canto = d => rr(W - 2 * d, Dp - 2 * d, Math.max(0.5, R - d)).extrude(H + 2).translate([0, 0, -1]); // (los cuatro cantos de pie, redondeados)
  let m = enXZ(frente(0), -Dp, Dp).intersect(enYZ(lado(0), -W, W)).intersect(canto(0));
  const yF = -Dp / 2, cara = (x, z) => [x, yF + 1.2, z]; // (un punto metido en la cara: los apoyos a 45° van hasta ahí)
  const apoyo = (forma, x, z, baja) => M().hull([forma, bola(1, ...cara(x, z - baja))]);
  // la CEJA: una barra redondeada de lado a lado, con su apoyo a 45°
  const zC = H * 0.73, ceja = M().hull([bola(4.6 * S, -W / 2 + 9 * S, yF - 1.5 * S, zC), bola(4.6 * S, W / 2 - 9 * S, yF - 1.5 * S, zC), bola(1, -W / 2 + 9 * S, yF + 1.2, zC - 7 * S), bola(1, W / 2 - 9 * S, yF + 1.2, zC - 7 * S)]);
  // la NARIZ: del entrecejo a la punta, con las aletas abiertas; por debajo, a 45° hasta la cara
  const zN = H * 0.40, nariz = M().hull([bola(3.6 * S, 0, yF - 2 * S, zC - 3 * S), bola(5 * S, 0, yF - 11 * S, zN + 1 * S), bola(5.2 * S, -7 * S, yF - 6.5 * S, zN), bola(5.2 * S, 7 * S, yF - 6.5 * S, zN), bola(1, ...cara(0, zN - 15 * S)), bola(1, ...cara(-8 * S, zN - 13 * S)), bola(1, ...cara(8 * S, zN - 13 * S))]);
  // los LABIOS en «O» (fumando): un rodete que sale hacia delante, apoyado a 45°
  const zB = H * 0.25, labios = M().hull([M().cylinder(7 * S, 8.5 * S, 7.5 * S, 48).rotate([90, 0, 0]).translate([0, yF + 1, zB]), bola(1, ...cara(0, zB - 15 * S)), bola(1, ...cara(-8 * S, zB - 12 * S)), bola(1, ...cara(8 * S, zB - 12 * S))]);
  // la BARBILLA: hasta la mesa (apoya en la cama)
  const barbilla = M().hull([ovo(13 * S, 6 * S, 7 * S, 0, yF - 2 * S, H * 0.1), cubo(-13 * S, 13 * S, yF - 4 * S, yF + 1, 0, 1)]);
  // las OREJAS largas, pegadas a los lados, con su apoyo
  const oreja = sg => M().hull([bola(3.4 * S, sg * (W / 2 + 1.2 * S), 4 * S, H * 0.82), bola(3.4 * S, sg * (W / 2 + 1.2 * S), 4 * S, H * 0.47), bola(1, sg * (W / 2 - 1.5), 4 * S, H * 0.47 - 7 * S)]);
  m = N.union([m, ceja, nariz, labios, barbilla, oreja(1), oreja(-1)]);
  // las CUENCAS, hondas pero sin atravesar (la pared es de 2,6: entran 1,4 como mucho por detrás de la cara) y la línea de la boca
  [-1, 1].forEach(sg => { m = m.subtract(ovo(8 * S, 3 * S, 4.6 * S, sg * 12.5 * S, yF - 1.6 * S, zC - 7.5 * S)); });
  // HUECA: la misma cabeza 2,6 mm más pequeña, con el techo en punta a 45° (sin soportes)
  let hueco = enXZ(frente(e), -Dp, Dp).intersect(enYZ(lado(e), -W, W)).intersect(canto(e)).translate([0, 0, -0.01]);
  hueco = hueco.intersect(M().hull([cubo(-W / 2, W / 2, -Dp / 2, Dp / 2, -1, H - e - W / 2), cubo(-1, 1, -1, 1, H - e - 2, H - e)]));
  m = m.subtract(hueco);
  // la BOCA: la «O» de los labios atraviesa hasta dentro (con la punta de arriba a 45°) → por ahí sale el humo
  const rB = 4.4 * S, boca = P2(Array.from({ length: 33 }, (_, k) => { const a = (45 - 270 * k / 32) * Math.PI / 180; return [rB * Math.cos(a), zB + rB * Math.sin(a)]; }).concat([[0, zB + rB * 1.414]]));
  m = m.subtract(enXZ(boca, yF - 12 * S, yF + e + 6));
  // los arcos de los cigarros (a los lados, abajo), en punta para imprimir sin soportes
  [-1, 1].forEach(sg => { m = m.subtract(enYZ(P2([[-6.5, -1], [6.5, -1], [6.5, 8], [0, 14.5], [-6.5, 8]]), sg > 0 ? W / 2 - e - 1 : -W / 2 - 10, sg > 0 ? W / 2 + 10 : -W / 2 + e + 1)); });
  return m;
}
// el VOLCÁN: cono hueco, el humo sale por el cráter; coladas de lava grabadas
export function volcan(p) {
  const H = p.alto, R = p.base / 2 - 6, rc = 9, e = 2.4, L = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, z = H * t, r = R - (R - rc) * Math.pow(t, 0.75); L.push([r, z]); }
  const prof = L.concat([[rc - e, H], ...L.slice().reverse().map(([r, z]) => [Math.max(rc - e, r - e / Math.cos(Math.atan((R - rc) / H))), z])]).concat([[R - e * 1.3, 0]]);
  let m = CS().ofPolygons([N.ccw(prof.map(([r, z]) => [r, z]))]).revolve(96);
  for (let k = 0; k < 7; k++) { const a = k * 360 / 7 + 10, sg = k % 2 ? 1 : -1, cam = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, z = H * (1 - t * 0.85), r = R - (R - rc) * Math.pow(1 - t * 0.85, 0.75) + 0.8, ang = (a + sg * 12 * Math.sin(t * 3)) * Math.PI / 180; cam.push(M().sphere(1.2 + t * 0.6, 12).translate([r * Math.cos(ang), r * Math.sin(ang), z])); } // (entran 1 mm como mucho: la pared es de 2,4)
    for (let i = 0; i < cam.length - 1; i++) m = m.subtract(M().hull([cam[i], cam[i + 1]])); }
  [-1, 1].forEach(sg => { m = m.subtract(enYZ(P2([[-6.5, -1], [6.5, -1], [6.5, 8], [0, 14.5], [-6.5, 8]]), sg > 0 ? 0 : -R - 5, sg > 0 ? R + 5 : 0)); });
  return m;
}
const huellaDe = m => { const L = [0.3, 0.8, 1.3].map(z => m.slice(z)).filter(s => !s.isEmpty()); return L.length ? N.csUnion(L) : null; }; // (lo que ocupa en el escalón entero: el volcán tiene la pared inclinada)

// ======================= el catálogo =======================
const FUEGO = ' ⚠️ La brasa y la ceniza van SIEMPRE en el vaso de aluminio de una velita de té (Ø 39 × 15 mm): el plástico impreso se ablanda con el calor. Mejor la cabeza en PETG.';
export const DISENOS_FUMAR = {
  fundaMecheroPro: { cat: 'jovenes', tambien: ['regalos', 'adultos'], e: '🔥', t: 'Funda de mechero (BIC mini, slim, maxi o Clipper)', d: 'Entra de verdad: cada modelo con sus medidas, lengüeta que lo sujeta y estilos (calado, panal, escamas, rayas o con nombre)', uso: 'funcional', color: '#1b1b1f', nuevo: true,
    campos: [s('modelo', 'Mechero', 'bicMini', Object.entries(MECHEROS).map(([k, B]) => [k, B.t])), s('estilo', 'Estilo', 'calado', [['calado', '🕸️ Calado (voronoi)'], ['panal', '⬢ Panal'], ['escamas', '🐉 Escamas'], ['rayas', '▥ Rayas'], ['liso', 'Lisa, con nombre']]), tx('texto', 'Nombre (en «lisa», escamas o rayas)', '', 'Tu nombre o el de quien la regala'), s('que', 'Qué sacar', 'funda', [['funda', 'La funda'], ['prueba', '🧪 Prueba de encaje (1 cm)'], ['las2', 'Funda + prueba']]),
      n('ancho', 'A medida: ancho', 25, 15, 35, 0.1), n('grueso', 'A medida: grueso', 15, 8, 22, 0.1), n('alto', 'A medida: alto', 80, 50, 100, 1)],
    gen: p => { if (p.que === 'prueba') return fundaMechero(p, true); if (p.que === 'las2') { const a = fundaMechero(p), b = fundaMechero(p, true), ba = N.caja(a); return N.union([a, b.translate([ba.max[0] + 12 - N.caja(b).min[0], 0, 0])]); } return fundaMechero(p); },
    nota: p => { const Q = fundaMedidas(p); return Q.B.t + ': ' + n1(Q.w) + ' × ' + n1(Q.g) + ' mm (la funda deja 0,5 de aire por lado y mide ' + n1(Q.wo) + ' × ' + n1(Q.go) + ' × ' + n1(Q.H) + '; asoma la cabeza del mechero). Se imprime DE PIE, sin soportes: el hueco sale exacto. Imprime antes la 🧪 prueba de 1 cm: tu mechero tiene que entrar sin forzar. La lengüeta de atrás lo sujeta.'; } },
  ceniceroMoai: { cat: 'adultos', tambien: ['deco', 'regalos'], e: '🗿', t: 'Cenicero moái: el humo le sale por la boca', d: 'Cabeza de moái hueca sobre el vaso de una velita: el humo sube por dentro y sale por su boca abierta', uso: 'deco', color: '#6b6f73', nuevo: true,
    campos: [n('alto', 'Alto de la cabeza', 110, 90, 140, 1), n('base', 'Diámetro de la base', 110, 100, 140, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Base y cabeza'], ['base', 'La base'], ['cabeza', 'La cabeza']])],
    gen: p => { const cab = moai(p), base = ceniceroBase(p, huellaDe(cab)); if (p.que === 'base') return base; if (p.que === 'cabeza') return cab; const bb = N.caja(base), bc = N.caja(cab); return N.union([base, cab.translate([bb.max[0] + 10 - bc.min[0], 0, 0])]); },
    nota: () => 'Dos piezas: la base (plana) y la cabeza (de pie, hueca, sin soportes: el techo de dentro va en punta). Pon un vaso de aluminio de velita en el centro, apoya el cigarro en uno de los canales de los lados (la brasa queda sobre el vaso) y tapa con la cabeza: el humo sube y SALE POR LA BOCA. Para vaciar, levanta la cabeza.' + FUEGO },
  ceniceroVolcan: { cat: 'adultos', tambien: ['deco', 'regalos'], e: '🌋', t: 'Cenicero volcán: el humo sale por el cráter', d: 'Volcán hueco con coladas de lava grabadas: el humo sale por arriba como una erupción', uso: 'deco', color: '#3a2a22', nuevo: true,
    campos: [n('alto', 'Alto', 80, 60, 120, 1), n('base', 'Diámetro de la base', 110, 100, 140, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Base y volcán'], ['base', 'La base'], ['cabeza', 'El volcán']])],
    gen: p => { const cab = volcan(p), base = ceniceroBase(p, huellaDe(cab)); if (p.que === 'base') return base; if (p.que === 'cabeza') return cab; const bb = N.caja(base), bc = N.caja(cab); return N.union([base, cab.translate([bb.max[0] + 10 - bc.min[0], 0, 0])]); },
    nota: () => 'Dos piezas sin soportes (el volcán, de pie). Las coladas quedan genial pintadas de naranja. Vaso de aluminio de velita en el centro, el cigarro en un canal lateral y el volcán encima: el humo sale por el cráter.' + FUEGO }
};
