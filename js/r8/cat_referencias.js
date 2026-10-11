// ================= v30.4 · 📸 LAS REFERENCIAS DE LA DUEÑA (fotos del 11-10-2026), diseñadas aquí =================
// «tienes que saber diseñar estas referencias, vamos amigo, tú puedes»: organizador de maquillaje en forma de corazón, estantería de
// dos pisos con arcos, funda de mechero alargada (estilo cargador; SIN la marca de la foto: con su texto). Nada copiado: medidas y
// formas hechas aquí. Todo sin soportes (paredes a 45° o más) y las piezas que encajan llevan SUS holguras (0,10 encaja).
import * as N from './nucleo.js';
import { circulo, rectR, ENCAJES } from './motor.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const circ = d => N.cs([N.ccw(circulo(d / 2, 0, 0, seg(d)))], 'Positive');
const rr = (w, h, r = 0) => N.cs([N.ccw(rectR(w, h, r))], 'Positive');
const poli = P => N.cs([N.ccw(P)], 'Positive');
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const R2 = Math.PI / 180;
// 2D (u, v) → sección en el plano YZ (u → Y, v → Z) extruida a lo largo de X, centrada
const aLoLargoX = (cs, L) => cs.extrude(L).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([-L / 2, 0, 0]);
// 2D (x, y) de pie: x → X, y → Z, extruida en Y (centrada)
const porY = (cs, L) => cs.extrude(L).rotate([90, 0, 0]).translate([0, L / 2, 0]);
// barrer un dibujo 2D hacia arriba (lo que queda encima, abierto) o hacia abajo a 45° (lo que hace falta para imprimir sin soportes)
// barrer un dibujo 2D hacia arriba H mm (suma de Minkowski con un segmento vertical: cada borde barre un cuadrilátero)
const barreArriba = (cs, H) => { const Q = [cs]; cs.toPolygons().forEach(P => { for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; Q.push(poli([a, b, [b[0], b[1] + H], [a[0], a[1] + H]])); } }); return N.csUnion(Q); };
// v30.4 · un HUECO en una pared vertical sin «techos» (lo de encima de un agujero empezaría en el aire): techo en punta a 45°
export const huecoConTecho = (cs, paso = 0.5) => sinVoladizos(cs.mirror([0, 1]), paso).mirror([0, 1]);
// lo MÍNIMO que hay que rellenar para imprimir sin soportes: de arriba abajo, cada franja necesita debajo lo de encima encogido
// lo que permite 45° (franjas de «paso» mm). Así no se ensancha nada que ya se sostiene.
export function sinVoladizos(cs, paso = 0.5) {
  const b = N.cajaCS(cs), franjas = [];
  const tramos = z => { const I = cs.intersect(rr(b.w + 10, paso * 0.5).translate([(b.min[0] + b.max[0]) / 2, z])); if (I.isEmpty()) return []; return I.decompose().map(q => { const c = N.cajaCS(q); return [c.min[0], c.max[0]]; }).sort((u, v) => u[0] - v[0]); };
  const une = L => { const o = []; L.sort((u, v) => u[0] - v[0]).forEach(t => { if (o.length && t[0] <= o[o.length - 1][1]) o[o.length - 1][1] = Math.max(o[o.length - 1][1], t[1]); else o.push(t.slice()); }); return o; };
  let necesita = [];
  for (let z = b.max[1] - paso / 2; z > b.min[1]; z -= paso) { const ahora = une(tramos(z).concat(necesita.map(([u, v]) => [u + paso, v - paso]).filter(([u, v]) => v > u))); necesita = ahora; franjas.push(...ahora.map(([u, v]) => rr(v - u, paso + 0.02).translate([(u + v) / 2, z]))); }
  // el relleno (escalones de «paso») se alisa y se junta con la forma de verdad (que conserva sus curvas)
  return cs.add(N.csUnion(franjas).offset(-0.35, 'Round').offset(0.9, 'Round').offset(-0.55, 'Round'));
}

// ======================= 💄 ORGANIZADOR DE MAQUILLAJE CORAZÓN =======================
// De perfil es un corazón inclinado: el lóbulo de atrás alto (brochas), el de delante bajo (pintalabios) y un escalón en medio.
function perfilCorazon(F, H, giro) {
  // corazón inclinado ~45°: la punta abajo-atrás, su lado derecho hace de BASE y el izquierdo de ESPALDA casi vertical
  let p = N.centraCS(poli(N.corazon2(100))).rotate(-giro);
  const b = N.cajaCS(p); p = p.translate([-b.min[0], -b.min[1]]);
  const corte = 6; p = p.intersect(rr(400, 400).translate([0, corte + 200])).translate([0, -corte]); // base plana (se corta la punta)
  const b2 = N.cajaCS(p); p = p.scale([F / b2.w, H / b2.h]);
  const q = sinVoladizos(p, 0.6); return q.simplify ? q.simplify(0.05) : q;
}
function organizadorCorazon(p) {
  const F = p.fondo, H = p.alto, W = p.ancho, e = p.pared, P = perfilCorazon(F, H, p.giro), Pi = P.offset(-e, 'Round');
  const banda = P.subtract(barreArriba(Pi, H * 1.2));
  let m = aLoLargoX(banda, W);
  // laterales: el corazón entero, con un bisel de 0,8 mm por fuera (canto suave)
  // laterales: el corazón entero, con el canto de fuera achaflanado en escalones de 0,4 (se ve suave)
  const lado = sx => { const L = [aLoLargoX(P.offset(-0.01), e - 1.2).translate([sx * (W / 2 - e + (e - 1.2) / 2), 0, 0])]; for (let i = 1; i <= 3; i++) L.push(aLoLargoX(P.offset(-0.4 * i, 'Round'), 0.42).translate([sx * (W / 2 - 1.2 + 0.4 * (i - 0.5)), 0, 0])); return N.union(L); };
  m = m.add(lado(-1)).add(lado(1));
  // separadores: detrás (brochas) | en medio (lápices) | delante (paletas y pintalabios)
  const b = N.cajaCS(P), y1 = b.min[0] + b.w * p.sep1 / 100, y2 = b.min[0] + b.w * p.sep2 / 100;
  const sep = (y, h) => aLoLargoX(rr(e, h).translate([y, h / 2]).intersect(P), W - 0.02);
  m = m.add(sep(y1, H * p.h1 / 100)).add(sep(y2, H * p.h2 / 100));
  // canto de arriba de los separadores, redondeado (cilindro tumbado)
  [[y1, H * p.h1 / 100], [y2, H * p.h2 / 100]].forEach(([y, h]) => { m = m.add(M().cylinder(W - 2 * e + 0.4, e / 2, e / 2, 24).rotate([0, 90, 0]).translate([-(W - 2 * e + 0.4) / 2, y, h])); });
  return m;
}

// ======================= 🌈 ESTANTERÍA DE DOS PISOS CON ARCOS =======================
// Dos laterales en arco (uno con el arcoíris de surcos, otro liso con su ranura) y dos bandejas con pestañas que entran en cajeados.
function arco2(w, h) { return rr(w, h - w / 2).translate([0, (h - w / 2) / 2]).add(circ(w).translate([0, h - w / 2])); }
function estanteria(p) {
  const B = p.fondo, Ht = p.alto, Lt = p.largo, t = p.grueso, hb = 16, fb = 2.4, holg = ENCAJES.justo;
  const Lb = Lt - 2 * t + 2 * 6, Db = B - 14, zs = [p.alto * 0.07, p.alto * 0.62]; // bandejas: largo con pestañas de 6 mm dentro de cada lateral
  const pest = { w: Db * 0.55, h: hb - 4, l: 6 };
  // LATERAL (se imprime tumbado: la cara de fuera en la cama; los cajeados miran arriba)
  const lateral = (rayas) => {
    let a = arco2(B, Ht).extrude(t);
    if (rayas) { const nR = Math.round(p.rayas); for (let i = 1; i <= nR; i++) { const w = B - i * (B / (nR + 1.6)); if (w < 14) break; const r = arco2(w, Ht - (B - w) / 2).subtract(arco2(w - 2.2, Ht - (B - w) / 2 - 1.1)).translate([0, 0]); a = a.subtract(r.extrude(1.6).translate([0, 0, -0.01])); } }
    else a = a.subtract(arco2(B * 0.12, Ht * 0.55).translate([0, Ht * 0.3]).extrude(t + 2).translate([0, 0, -1]));
    zs.forEach(z => { a = a.subtract(rr(pest.w + 2 * holg, pest.h + 2 * holg, 0.6).extrude(pest.l + 0.5).translate([0, z + 2.4 + pest.h / 2, t - pest.l - 0.5 + 0.01])); });
    return a;
  };
  const bandeja = () => { // boca arriba; las pestañas salen por los dos extremos
    const L0 = Lt - 2 * t - 0.6; let b = rr(L0, Db, 8).extrude(hb).subtract(rr(L0 - 2 * fb, Db - 2 * fb, 6.5).extrude(hb).translate([0, 0, fb]));
    [-1, 1].forEach(sx => { b = b.add(M().cube([pest.l + 0.3 + 2, pest.w, pest.h]).translate([sx > 0 ? L0 / 2 - 2 : -L0 / 2 - pest.l - 0.3, -pest.w / 2, 2.4])); });
    return b;
  };
  if (p.que === 'arcoRayas') return lateral(true); if (p.que === 'arcoLiso') return lateral(false); if (p.que === 'bandeja') return bandeja();
  if (p.que === 'prueba') { // un trozo de lateral con su cajeado y una pestaña igual que la de la bandeja (pocos gramos)
    const tapa = rr(pest.w + 12, pest.h + 12, 3).extrude(t).subtract(rr(pest.w + 2 * holg, pest.h + 2 * holg, 0.6).extrude(pest.l + 0.5).translate([0, 0, t - pest.l - 0.5 + 0.01]));
    const tab = rr(pest.w + 10, pest.h + 10, 2).extrude(2.4).add(rr(pest.w, pest.h).extrude(pest.l + 0.3 + 2.4));
    return tapa.add(tab.translate([pest.w + 26, 0, 0]));
  }
  // montada (para ver cómo queda): laterales de pie (la cara de los cajeados hacia dentro) y las bandejas puestas
  const izq = lateral(true).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([-Lt / 2, 0, 0]);
  const der = lateral(false).rotate([90, 0, 0]).rotate([0, 0, -90]).translate([Lt / 2, 0, 0]);
  const bandejas = zs.map(z => bandeja().translate([0, 0, z]));
  return N.union([izq, der].concat(bandejas));
}

// ======================= 🔥 FUNDA DE MECHERO ALARGADA (estilo cargador) =======================
// Para un mechero grande tipo «maxi» (cuerpo 25 × 15 mm): entra por arriba y asoma el capuchón. Con TU texto grabado.
function fundaMechero(p) {
  const L = p.largo, aw = p.mw + 0.4, at = p.mt + 0.4, pared = 2.4, W = aw + 2 * pared + 2, T = at + 2 * pared, hond = p.hondo;
  // se imprime TUMBADA sobre la cara de atrás (x = ancho, y = largo, z = grueso); el texto queda arriba
  const largo = (cs, l, y0, z0) => cs.extrude(l).rotate([-90, 0, 0]).translate([0, y0, z0]); // 2D (x, −z) a lo largo de Y
  const sec = (w, t) => rr(w, t, Math.min(4, t / 3));
  let m = largo(sec(W, T), L, 0, T / 2);
  // remate de arriba en cuña (la cara de arriba baja hacia la punta) y culote más ancho abajo, con chaflán
  m = m.subtract(aLoLargoX(poli([[L - 16, T + 1], [L + 1, T + 1], [L + 1, T * 0.5]]), W + 10));
  m = m.add(largo(sec(W + 3, T + 1.5), 10, -1.5, (T + 1.5) / 2)).add(largo(sec(W + 3, T + 1.5), 1.5, 8.5, (T + 1.5) / 2).intersect(largo(sec(W, T), 1.5, 8.5, T / 2).add(largo(sec(W + 3, T + 1.5).offset(-1.5), 1.6, 8.4, (T + 1.5) / 2)).add(largo(sec(W + 3, T + 1.5), 0.2, 8.5, (T + 1.5) / 2))));
  // hueco del mechero (rectángulo redondeado: el techo es un puente de ~25 mm, que la Bambu hace bien)
  const yh = L - hond;
  m = m.subtract(rr(aw, at, Math.min(5, at / 2.2)).extrude(hond + 20).rotate([-90, 0, 0]).translate([0, yh, pared + at / 2]));
  // dos nervios de 0,3 mm que aprietan el mechero
  [-1, 1].forEach(sx => { m = m.add(M().cube([0.6, hond - 10, 4]).translate([sx * aw / 2 - 0.3, yh + 4, pared + at / 2 - 2])); });
  // fila de agujeritos en el canto derecho (solo 1,6 mm de hondo: no llegan al hueco)
  for (let y = 24; y < yh - 6; y += 9) m = m.subtract(M().cylinder(3.2, 1.1, 1.1, 16).rotate([0, 90, 0]).translate([W / 2 - 1.6, y, T / 2]));
  // ojal para el mosquetón arriba, en la esquina de atrás
  m = m.subtract(M().cylinder(T + 2, 1.8, 1.8, 20).translate([W / 2 - 3.2, L - 4, -1]));
  // TU texto grabado a lo largo, en la cara de arriba
  const tt = String(p.texto || '').trim();
  if (tt) { let Tx = N.centraCS(N.texto2(tt, p.fuente, W * 0.5)); const bT = N.cajaCS(Tx), lmax = L - 16 - 14 - 6; let k = 1; if (bT.w > lmax) k = lmax / bT.w; Tx = Tx.scale([k, k]).rotate(90).translate([0, 14 + bT.w * k / 2]); m = m.subtract(Tx.extrude(p.hondoTexto + 1).translate([0, 0, T - p.hondoTexto])); }
  return m;
}

export const DISENOS_REFERENCIAS = {
  organizadorCorazon: { cat: 'organizar', tambien: ['adultos', 'regalos', 'jovenes'], e: '💄', t: 'Organizador de maquillaje CORAZÓN', d: 'De perfil es un corazón: detrás las brochas, en medio lápices y máscaras, delante paletas y pintalabios', uso: 'deco', color: '#e8a0a8', nuevo: true,
    campos: [n('giro', 'Inclinación del corazón', 45, 25, 60, 1, '°'), n('ancho', 'Ancho', 120, 80, 180, 1), n('fondo', 'Fondo', 160, 110, 220, 1), n('alto', 'Alto', 150, 100, 200, 1), n('pared', 'Pared', 3, 2, 5, 0.1), n('sep1', 'Primer separador (% del fondo)', 38, 20, 60, 1, '%'), n('h1', 'Su alto (% del alto)', 72, 30, 100, 1, '%'), n('sep2', 'Segundo separador (% del fondo)', 64, 40, 85, 1, '%'), n('h2', 'Su alto (% del alto)', 52, 20, 90, 1, '%')],
    gen: p => organizadorCorazon(p), nota: p => 'De pie, sin soportes: la curva de abajo del corazón va a 45° (por eso la base es un poco más ancha). ' + p.ancho + ' × ' + p.fondo + ' × ' + p.alto + ' mm. PLA mate rosa, nude o blanco: queda como el de la foto.' },
  estanteriaArcos: { cat: 'organizar', tambien: ['hogar', 'adultos'], e: '🌈', t: 'Estantería de dos pisos con ARCOS', d: 'Lateral con arcoíris de surcos y lateral liso con ranura; dos bandejas que encajan', uso: 'deco', color: '#1b1b1f', nuevo: true,
    campos: [s('que', 'Qué imprimir', 'montada', [['montada', '👀 Montada (para verla)'], ['arcoRayas', 'Lateral con el arcoíris'], ['arcoLiso', 'Lateral liso'], ['bandeja', 'Bandeja (imprime dos)'], ['prueba', '🧪 Prueba de encaje (pestaña y cajeado)']]), n('largo', 'Largo total', 254, 160, 300, 1), n('fondo', 'Fondo', 132, 90, 180, 1), n('alto', 'Alto', 225, 150, 250, 1), n('grueso', 'Grueso de los laterales', 14, 10, 20, 0.5), n('rayas', 'Arcos del arcoíris', 6, 3, 9, 1, '')],
    gen: p => estanteria(p), color2: '#f4f4f4',
    nota: p => 'Laterales tumbados (la cara de fuera en la cama: los surcos del arcoíris salen limpios) y bandejas boca arriba, todo sin soportes. Las pestañas de las bandejas entran 6 mm en cada lateral con ' + n2(ENCAJES.justo) + ' mm por lado (tu «encaja»): imprime antes la 🧪 prueba. Laterales en negro y bandejas en blanco. ' + ((p.largo - 2 * p.grueso + 12) > 180 ? 'La bandeja mide ' + Math.round(p.largo - 2 * p.grueso + 12) + ' mm: solo cabe en la P1P.' : 'Cabe en las dos impresoras.') },
  fundaMechero: { cat: 'jovenes', tambien: ['regalos', 'adultos'], e: '🔥', t: 'Funda de mechero alargada (estilo cargador)', d: 'Para mechero grande: entra por arriba y asoma el capuchón · con TU texto y ojal para mosquetón', uso: 'pieza', color: '#1b1b1f', nuevo: true,
    campos: [tx('texto', 'Texto grabado', 'CelebriDiseños', 'Tu marca, un nombre… (nunca una marca de otros)'), s('fuente', 'Letra', 'gorda', [['gorda', 'Gorda'], ['redonda', 'Redonda'], ['clasica', 'Clásica'], ['estrecha', 'Estrecha']]), n('largo', 'Largo', 150, 90, 190, 1), n('mw', 'Ancho del mechero', 25, 20, 30, 0.1), n('mt', 'Grueso del mechero', 14.5, 10, 18, 0.1), n('hondo', 'Cuánto entra el mechero', 66, 40, 80, 1), n('hondoTexto', 'Hondo del texto', 0.8, 0.4, 1.5, 0.1)],
    gen: p => fundaMechero(p), nota: p => 'Tumbada, con el texto arriba y sin soportes (el hueco termina en tejadillo a 45°). Medidas de un mechero «maxi»: ' + n2(p.mw) + ' × ' + n2(p.mt) + ' mm (mide el tuyo con el calibre). Dos nervios de 0,3 mm lo sujetan. Ojal para mosquetón arriba. Con el texto en otro color: rellénalo de pintura.' }
};
