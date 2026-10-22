// ================= 21-10-2026 · 💅 MANICURA PREMIUM =================
// Ella (plan maestro, tarea 29): «cosas para manicura premium». Tres diseños propios (© CelebriDiseños):
//  · 💅 CARRUSEL DE ESMALTES GIRATORIO: gradas en anillos (todos los botes a la vista, los de dentro más altos) que GIRAN sobre DOS de SUS
//    rodamientos 8 × 12 × 4 (uno abajo y otro arriba del cubo: no cabecea); la base, con su eje y tacos de goma.
//  · 🖐️ EXPOSITOR DE MUESTRAS (para el salón): filas escalonadas de agujeros para los PALITOS con la punta pintada, cada uno con su número
//    grabado, y el NOMBRE del salón arriba.
//  · 🪷 ORGANIZADOR «LOTO»: un vaso central (pinceles, limas) rodeado de pétalos que son compartimentos (alicates, empujadores, botes).
// Medidas de los botes: los de 15 ml de base cuadrada miden 28,5 × 28,5 y ~68 de alto con el tapón (fichas de fabricante de envases); cada
// marca es distinta, así que el hueco es A MEDIDA y la «🧪 prueba» saca tres huecos para probar con TUS botes. Holguras: las de su Bambu.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, tx, M, CS, rr, poli, cil, n2, conBisel, torno } = A;
const ROD = { d: 8, D: 12, B: 4 }, PRES = 0.05;   // SUS rodamientos 8 × 12 × 4 y su «a presión» (0,05 por lado)

// ---------- 💅 CARRUSEL ----------
export function medidasCarrusel(p) { const ancho = Math.max(18, Math.min(45, +p.bote || 30)), hg = 1, cel = ancho + 2 * hg, D = Math.max(150, Math.min(240, +p.diametro || 220)), aros = Math.max(1, Math.min(3, +p.aros || 3));
  const paso = 22, prof = 12, sep = cel + 4; // de un aro al siguiente sube «paso»; cada hueco tiene «prof» de hondo
  const L = []; let r = D / 2 - cel / 2 - 5;
  for (let k = 0; k < aros && r > 26 + cel / 2; k++, r -= sep) { const nh = Math.max(1, Math.floor(2 * Math.PI * r / (cel + 4))); L.push({ r, n: nh, z: k * paso }); }
  return { ancho, hg, cel, D, aros: L, paso, prof, cuadrado: p.forma !== 'redondo', total: L.reduce((a, x) => a + x.n, 0) }; }
// el alto del CUBO de la bandeja (lo mismo para la bandeja y para el eje de la base: así el remate queda siempre 0,8 mm por encima)
export const altoCubo = Q => Math.max(10 + (Q.aros.length - 1) * Q.paso + Q.prof, 30);
const hueco = (Q, x, y, z, giro) => (Q.cuadrado ? rr(Q.cel, Q.cel, 4) : A.circ(Q.cel)).extrude(Q.prof + 1).rotate([0, 0, giro]).translate([x, y, z]);
// la BANDEJA escalonada (gira): cada aro un escalón más alto hacia dentro; en el centro, el CUBO con un rodamiento abajo y otro arriba
export function bandeja(p) { const Q = medidasCarrusel(p), base = 10, HB = 30, rc = 13;
  // perfil de revolución: del borde de fuera hacia dentro, subiendo en escalones (cantos con chaflán), hasta el cubo
  const perfil = [[Q.D / 2, 0], [Q.D / 2, base + Q.prof - 1.2], [Q.D / 2 - 1.2, base + Q.prof]];
  Q.aros.forEach((a, k) => { const rIn = a.r - Q.cel / 2 - 2, zSig = k + 1 < Q.aros.length ? base + Q.aros[k + 1].z + Q.prof : null;
    perfil.push([rIn, base + a.z + Q.prof]); if (zSig !== null) perfil.push([rIn, zSig - 1.2], [rIn - 1.2, zSig]); });
  perfil.push([rc + 4, perfil[perfil.length - 1][1]], [rc + 4, Math.max(perfil[perfil.length - 1][1], HB)], [0, Math.max(perfil[perfil.length - 1][1], HB)]);
  let m = CS().ofPolygons([N.ccw([[0, 0]].concat(perfil))]).revolve(220);
  // los huecos de los botes
  const H = []; Q.aros.forEach(a => { for (let i = 0; i < a.n; i++) { const t = 2 * Math.PI * i / a.n; H.push(hueco(Q, a.r * Math.cos(t), a.r * Math.sin(t), base + a.z, t * 180 / Math.PI)); } });
  m = m.subtract(N.union(H));
  // el borde de fuera, ONDULADO: un lóbulo por cada bote del aro de fuera
  { const a = Q.aros[0], lob = []; for (let i = 0; i < a.n; i++) { const t = 2 * Math.PI * i / a.n; lob.push(A.circ(Q.cel + 10).translate([a.r * Math.cos(t), a.r * Math.sin(t)])); }
    m = m.intersect(N.csUnion(lob.concat([A.circ(2 * a.r)])).extrude(500).translate([0, 0, -1])); }
  // el CUBO: el agujero del eje y los dos asientos de los rodamientos (a presión), abajo y arriba
  const zt = Math.max(perfil[perfil.length - 1][1], HB);
  m = m.subtract(cil(ROD.d + 1.4, zt + 2, -1)).subtract(cil(ROD.D + 2 * PRES, ROD.B + 0.01, -0.01)).subtract(cil(ROD.D + 2 * PRES, ROD.B + 0.01, zt - ROD.B));
  return m; }
// la BASE (fija): disco con el EJE (Ø 8 a presión en los dos rodamientos), una arandela de 1 mm para que la bandeja no roce, y 4 tacos
export function baseCarrusel(p) { const Q = medidasCarrusel(p), d = Math.min(Q.D * 0.6, 150), hb = 6, zt = altoCubo(Q);
  let m = conBisel(A.circ(d), hb, 1.5).add(cil(10, 1, hb - 0.01)) /* (la arandela solo toca el aro de DENTRO del rodamiento: la bandeja no roza) */.add(cil(ROD.d - 2 * PRES, zt + 5 + 0.01, hb + 1 - 0.01)).add(A.cono(ROD.d - 2 * PRES, ROD.d - 1.4, 0.6, hb + 1 + zt + 5)); /* (el eje sobresale 5,6 mm de la bandeja: ahí entra el remate) */
  [0, 90, 180, 270].forEach(g => { const t = (g + 45) * Math.PI / 180; m = m.subtract(cil(8.4, 1.01, -0.01).translate([Math.cos(t) * (d / 2 - 12), Math.sin(t) * (d / 2 - 12), 0])); });
  return m; }
// el REMATE: una flor de 6 pétalos que entra a presión en la punta del eje (queda 1 mm por encima del cubo: no roza la bandeja que gira)
export function remate(p) { const L = []; for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; L.push(A.circ(13).translate([8 * Math.cos(t), 8 * Math.sin(t)])); } L.push(A.circ(16));
  return conBisel(N.csUnion(L), 7, 1.6).subtract(cil(ROD.d - 2 * PRES + 2 * PRES, 4.8, -0.01)); } // (hueco de 4,8: toca fondo con la punta del eje y queda 0,8 sobre la bandeja)
export function pruebaCarrusel(p) { const Q = medidasCarrusel(p); let m = conBisel(rr(3 * (Q.cel + 6) + 6, Q.cel + 12, 4), Q.prof + 3, 0.8);
  [-1, 0, 1].forEach((k, i) => { const Qi = Object.assign({}, Q, { cel: Q.ancho + 2 * [0.5, 1, 1.5][i] }); m = m.subtract(hueco(Qi, k * (Q.cel + 6), 0, 3, 0)); }); return m; }

// ---------- 🖐️ EXPOSITOR DE MUESTRAS (palitos con la punta) ----------
export function expositor(p) { const cols = Math.max(4, Math.min(8, +p.columnas || 8)), filas = filasQueCaben(Math.max(2, Math.min(5, +p.filas || 4)), cols), dp = Math.max(2.5, Math.min(6, +p.palito || 3)) + 0.3, esc = 15;
  // en ANFITEATRO: cada fila un arco (centrado delante, donde mira la clienta), más alta y más atrás; todas las muestras se ven
  const sep = 18, R0 = Math.max(52, cols * sep / (2 * 0.9)), th = cols * sep / R0 / 2, cy = -R0 + 8, L = [], ag = [], num = [];
  const sector = (r0, r1, a0, a1) => { const P = [], k = 48; for (let j = 0; j <= k; j++) { const a = a0 + (a1 - a0) * j / k; P.push([r1 * Math.cos(a), r1 * Math.sin(a)]); } for (let j = k; j >= 0; j--) { const a = a0 + (a1 - a0) * j / k; P.push([r0 * Math.cos(a), r0 * Math.sin(a)]); } return poli(P); };
  let k = 1;
  for (let f = 0; f < filas; f++) { const r = R0 + f * esc, h = 10 + f * 9, a0 = Math.PI / 2 - th - 0.06, a1 = Math.PI / 2 + th + 0.06, extra = f === filas - 1 ? 12 : 0;
    L.push(sector(r - esc / 2 - (f ? 0.6 : 0), r + esc / 2 + extra, a0, a1).extrude(h).translate([0, cy, 0])); // (escalones limpios; cada fila se mete 0,6 en la de delante: una sola pieza)
    const nf = Math.max(2, Math.round(2 * th * r / sep));
    for (let i = 0; i < nf; i++, k++) { const a = Math.PI / 2 + th - (2 * th) * (i + 0.5) / nf, x = r * Math.cos(a), y = r * Math.sin(a) + cy, hond = Math.min(14, h - 2.5);
      ag.push(cil(dp, hond + 12, 0).rotate([-12, 0, 0]).rotate([0, 0, (a - Math.PI / 2) * 180 / Math.PI]).translate([x, y, h - hond])); /* (largo de sobra: siempre sale por arriba; ciego por abajo) */
      try { const T = N.centraCS(N.texto2(String(k), 'gorda', 4.2)); num.push(T.extrude(0.61).rotate([0, 0, (a - Math.PI / 2) * 180 / Math.PI]).translate([x - 5.2 * Math.cos(a), y - 5.2 * Math.sin(a), h - 0.6])); } catch (e) { } } }
  let m = N.union(L);
  // el CARTEL de atrás con el nombre (en relieve, 1,2 mm), de pie sobre la última fila, con el canto de arriba en arco
  // (CURVO, siguiendo el arco de la última fila: se dibuja plano —con las letras— y se dobla; plano, sus puntas quedaban en el aire)
  const t = String(p.txt || 'NAILS').trim() || 'NAILS', rU = R0 + (filas - 1) * esc, zc = 10 + (filas - 1) * 9, Rc = rU + esc / 2 + 12 - 3.5, W = 2 * Rc * th * 0.8, hc = 28; /* (al fondo de la última fila) */
  const abajo = [], arriba = []; for (let j = 0; j <= 40; j++) { const u = -1 + 2 * j / 40; abajo.push([u * W / 2, 0]); arriba.push([u * W / 2, hc - 6 + 6 * Math.cos(u * Math.PI / 2)]); }
  let cartel = poli(abajo.concat(arriba.reverse())).extrude(6).rotate([90, 0, 0]).translate([0, 3, zc - 1]); // (plano: y de −3 a 3)
  try { const T = N.centraCS(N.texto2(t, p.fuente || 'cursiva', 14)), b = N.cajaCS(T), kk = Math.min(1, (W - 20) / b.w, 15 / b.h); cartel = cartel.add(T.scale([kk, kk]).extrude(1.2).rotate([90, 0, 0]).translate([0, -3 + 0.01, zc - 1 + (hc - 6) / 2 + 1])); } catch (e) { }
  cartel = cartel.warp(v => { const fi = v[0] / Rc, d = Rc + v[1]; v[0] = d * Math.sin(fi); v[1] = cy + d * Math.cos(fi); });
  // los agujeros y los números, AL FINAL (después del cartel): así ninguno puede quedar tapado
  m = m.add(cartel).subtract(N.union(ag)); if (num.length) m = m.subtract(N.union(num));
  return m; }

// cuántas filas caben en la cama de la P1P (245 mm) con «cols» muestras delante (el anfiteatro se abre al subir filas)
export function filasQueCaben(filas, cols) { const sep = 18, esc = 15, R0 = Math.max(52, cols * sep / 1.8), th = cols * sep / R0 / 2;
  while (filas > 2 && 2 * (R0 + (filas - 1) * esc + esc / 2 + 12) * Math.sin(Math.min(Math.PI / 2, th + 0.06)) > 245) filas--; return filas; }
// ---------- 🪷 ORGANIZADOR LOTO ----------
export function loto(p) { const D = Math.max(120, Math.min(200, +p.diametro || 160)), np = Math.max(6, Math.min(10, +p.petalos || 8)), Hc = Math.max(70, Math.min(140, +p.alto || 110)), pared = 2.4, fondo = 3;
  const rv = D * 0.17;
  // el plato (el fondo de los compartimentos) y el VASO del centro (pinceles, limas, palitos), con el borde abierto como una corola
  let m = conBisel(A.circ(D - 4), fondo, 0.8).add(torno([[rv, 0], [rv, Hc - 6], [rv + 3, Hc]], 2 * rv + 6).subtract(cil(2 * rv - 2 * pared, Hc + 2, fondo)));
  // una CORONA de pétalos: cada pétalo, una pared curva (un arco) que acaba en PUNTA arriba (ojiva) y se abre un poco hacia fuera (~6°)
  const corona = (R, n, H, desfase, hueco) => { const L = [], paso = 2 * Math.PI / n, span = paso * (1 - hueco), k = 40;
    for (let i = 0; i < n; i++) { const a0 = (i + desfase) * paso - span / 2, P = [];
      for (let j = 0; j <= k; j++) { const a = a0 + span * j / k; P.push([R * Math.cos(a), R * Math.sin(a)]); }
      for (let j = k; j >= 0; j--) { const a = a0 + span * j / k; P.push([(R + pared) * Math.cos(a), (R + pared) * Math.sin(a)]); }
      const w = poli(P).extrude(1, 0).warp(v => { if (v[2] < 0.5) return; let a = Math.atan2(v[1], v[0]) - a0; a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); const t = Math.min(1, Math.max(0, a / span));
        const h = H * (0.32 + 0.68 * (1 - Math.pow(Math.abs(2 * t - 1), 1.3))), f = 1 + 0.10 * h / H; v[2] = h; v[0] *= f; v[1] *= f; });
      L.push(w.translate([0, 0, fondo - 0.01])); }
    return N.union(L); };
  const Rf = D / 2 - 4 - pared - 2, Ri = (rv + Rf) / 2;
  m = m.add(corona(Rf, np, Hc * 0.5, 0, 0.06)).add(corona(Ri, np, Hc * 0.74, 0.5, 0.1));
  return m; }

export const DISENOS_MANICURA = {
  carruselEsmaltes: { cat: 'organizar', tambien: ['hogar', 'cuqui', 'empresas', 'pro'], nuevo: true, busca: 'carrusel giratorio esmaltes uñas manicura organizador expositor botes pintauñas nail polish rotating organizer salón belleza rodamiento',
    e: '💅', t: 'Carrusel giratorio de esmaltes (gradas que giran sobre rodamientos)', d: 'Hasta 3 aros en gradas (todos los botes a la vista) que giran sobre 2 rodamientos 8 × 12 × 4: cada bote, de un vistazo', uso: 'funcional', color: '#f2c6d6',
    campos: [n('bote', 'Ancho de tu bote (por la base)', 30, 18, 45, 0.5), s('forma', 'Base del bote', 'cuadrado', [['cuadrado', 'Cuadrada'], ['redondo', 'Redonda']]), n('diametro', 'Diámetro del carrusel', 220, 150, 240, 5), n('aros', 'Aros (gradas)', 3, 1, 3, 1, ''),
      s('que', 'Qué imprimo', 'bandeja', [['bandeja', 'La bandeja (gira)'], ['base', 'La base con el eje'], ['remate', 'El remate en flor (va en la punta del eje)'], ['prueba', '🧪 Prueba: 3 huecos (holgura 0,5 · 1 · 1,5)']])],
    gen: p => p.que === 'base' ? baseCarrusel(p) : p.que === 'remate' ? remate(p) : p.que === 'prueba' ? pruebaCarrusel(p) : bandeja(p),
    nota: p => { const Q = medidasCarrusel(p), pedidos = +p.aros || 3; if (p.que === 'prueba') return '🧪 PRUEBA: tres huecos con 0,5 / 1 / 1,5 mm de holgura por lado para tu bote de ' + n2(Q.ancho) + ' mm. El bueno es el que entra y sale suelto sin bailar (el carrusel lleva 1).';
      return 'PARA QUÉ: ' + Q.total + ' botes de esmalte a la vista en ' + Q.aros.length + ' gradas (' + Q.aros.map(a => a.n).join(' + ') + ')' + (Q.aros.length < pedidos ? ' (con este diámetro no caben ' + pedidos + ': sube el diámetro o baja el ancho del bote)' : '') + ', los de dentro más altos; el carrusel GIRA y encuentras el color sin mover nada. '
        + 'GIRA sobre 2 rodamientos 8 × 12 × 4 (los tuyos: uno abajo y otro arriba del cubo, a presión) en el eje de la base. Huecos de ' + n2(Q.cel) + ' mm (' + (Q.cuadrado ? 'base cuadrada' : 'base redonda') + '), 12 de hondo. Ø ' + Q.D + ' mm. '
        + 'IMPRESIÓN: bandeja y base tal como salen, SIN soportes, 3 paredes y 12 % de relleno; el EJE de la base, con 5 paredes (mejor PETG). Debajo de la base, 4 tacos de goma de 8 mm. MÍDELO: los botes de 15 ml de base cuadrada suelen medir 28,5; saca antes la «🧪 Prueba».'; } },
  expositorUnas: { cat: 'empresas', tambien: ['organizar', 'cuqui'], nuevo: true, busca: 'expositor muestras uñas puntas palitos colores salón manicura nail swatch display stand tips sticks carta de colores',
    e: '🖐️', t: 'Expositor de muestras de uñas (palitos con la punta, numerado)', d: 'Filas en escalera con un agujero para cada palito con su punta pintada, numeradas, y el nombre del salón detrás', uso: 'funcional', color: '#ffffff',
    campos: [n('filas', 'Filas', 4, 2, 5, 1, ''), n('columnas', 'Muestras en la fila de delante', 8, 4, 8, 1, ''), n('palito', 'Ø de tus palitos', 3, 2.5, 6, 0.1), tx('txt', 'Nombre del salón', 'NAILS')],
    gen: p => expositor(p),
    nota: p => { const cc = Math.max(4, Math.min(8, +p.columnas || 8)), pf = +p.filas || 4, f = filasQueCaben(pf, cc); return 'PARA QUÉ: muestras de color (el palito con la punta pintada) en ' + f + ' filas en ANFITEATRO (cada fila un arco, más alta y más atrás, con más muestras que la de delante: se ven todas)' + (f < pf ? ' (con ' + cc + ' delante caben ' + f + ' filas en la cama)' : '') + '; cada agujero con su NÚMERO grabado (apúntalo en tu carta de colores) y el NOMBRE del salón detrás. Agujeros de ' + n2(+p.palito + 0.3) + ' mm, inclinados 12° hacia atrás. IMPRESIÓN: tal cual, SIN soportes; el nombre en otro color con una pausa al empezar las letras.'; } },
  organizadorLoto: { cat: 'organizar', tambien: ['cuqui', 'hogar', 'adultos'], nuevo: true, busca: 'organizador manicura loto flor pétalos pinceles limas alicates cutícula herramientas uñas maquillaje brochas premium',
    e: '🪷', t: 'Organizador de manicura «loto» (vaso central y pétalos)', d: 'Un vaso en el centro para pinceles y limas y pétalos alrededor que son compartimentos: alicates, empujadores, botes pequeños', uso: 'funcional', color: '#e9c8e8',
    campos: [n('diametro', 'Diámetro', 160, 120, 200, 5), n('petalos', 'Pétalos', 8, 6, 10, 1, ''), n('alto', 'Alto del vaso central', 110, 70, 140, 5)],
    gen: p => loto(p),
    nota: p => 'PARA QUÉ: tus cosas de manicura, cada una en su sitio: el VASO del centro para pinceles, limas y palitos; los ' + (+p.petalos || 8) + ' PÉTALOS (de distintas alturas, como una flor) para alicates, empujadores, cortaúñas o botes pequeños. IMPRESIÓN: de pie, SIN soportes (los pétalos se abren menos de 25°), 3 paredes y 15 % de relleno; en rosa pastel o blanco perla queda precioso.' }
};
