// ================= 14-10-2026 · 📦 TALLER DE CAJAS PRO: cerraduras, compartimentos, estilos, limitador =================
// La dueña (14-10-2026): «el taller de cajas hazlo más avanzado, cúrratelo más, pon cajas más premium, deja arrastrar más componentes,
// que haya un limitador y un controlador de error humano para que no salga nada mal, más objetos, más componentes» y «una caja secreta,
// una caja con combinaciones diseñada por ti funcional, una caja con su propia llave fácil pero funcional, una caja de herramientas, una
// caja de almacenamiento de tornillos, una caja de baterías, una caja 6 en 1, una caja multifuncional».
// Todo diseño PROPIO y, como el resto del taller, se MONTA en el ordenador antes de dártelo: con la combinación buena el pestillo sale
// y con una cifra mal no; con la llave girada la tapa no se abre y sin girar sí; el cierre secreto bloquea la tapa de pie y la suelta
// boca abajo; el cajón sale entero; las cubetas, la bandeja y el fondo falso caben y apoyan donde deben.
// Holguras: lo que gira o corre, 0,3–0,4 mm (más que «gira»: son piezas largas); lo que se aprieta, «presión».
// Coordenadas de cada cara: x = u (a lo ancho de la cara), y = hacia DENTRO de la caja (fuera = negativo; 0 = cara de fuera de la pared),
// z = v (altura). «dentro» y la tapa, en las del mundo (caja centrada, X = largo, Y = ancho, Z = alto).
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';

const M = () => N.MF();
const segs = d => Math.max(24, Math.min(96, Math.round(d * 3 + 16)));
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cilZ = (r, z0, z1, x = 0, y = 0) => M().cylinder(z1 - z0, r, r, segs(2 * r)).translate([x, y, z0]);
const cilX = (r, x0, x1, y = 0, z = 0) => M().cylinder(x1 - x0, r, r, segs(2 * r)).rotate([0, 90, 0]).translate([x0, y, z]);
const cilY = (r, y0, y1, x = 0, z = 0) => M().cylinder(y1 - y0, r, r, segs(2 * r)).rotate([-90, 0, 0]).translate([x, y0, z]);
// un perfil en el plano (y, z) estirado a lo largo de X (de x0 a x1)
const perfilX = (pts, x0, x1) => N.cs([N.ccw(pts)], 'Positive').extrude(x1 - x0).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1]);
const rrect = (L, W, r) => { const S = N.CSX().square([Math.max(0.02, L - 2 * r), Math.max(0.02, W - 2 * r)], true); return r > 0.05 ? S.offset(r, 'Round', 2, segs(2 * r)) : S; };
const prisma = (L, W, r, z0, z1, x = 0, y = 0) => rrect(L, W, Math.max(0, Math.min(r, L / 2 - 0.01, W / 2 - 0.01))).extrude(z1 - z0).translate([x, y, z0]);
const texto = (t, alto, h) => { if (typeof document === 'undefined' || !String(t || '').trim()) return null; try { return N.centraCS(N.texto2(String(t), 'gorda', alto)).extrude(h); } catch (e) { return null; } };
export const HOLGURA_MOVIL = 0.35; // lo que corre o gira (pestillos, ruedas, cajones, cubetas)

// ---------- las IMPRESORAS (para el limitador: lo que no cabe en la cama, no sale) ----------
export const IMPRESORAS = { p1p: { t: 'Bambu P1P (256 mm)', cama: 256, alto: 250 }, a1mini: { t: 'Bambu A1 mini (180 mm)', cama: 180, alto: 180 } };
export const ESTILOS = { lisa: 'Lisa', biselada: 'Biselada (cantos en chaflán)', acanalada: 'Acanalada (rayas verticales, muy premium)', hexagonal: 'Tapa con panal hexagonal',
  libro: 'Libro (hojas en tres lados y tapa de cubierta: discreta)', cofre: 'Cofre del tesoro (bandas de refuerzo)', tablas: 'Tablas de madera', rombos: 'Acolchado de rombos (capitoné)' }; // (14-10 tarde: «más formas, que sean guapas, discretas»)

// ======================= 🔢 CERRADURA DE COMBINACIÓN (diseño propio) =======================
// Un PESTILLO (eje en D con una pestaña por rueda) atraviesa unas orejetas de la caja y la orejeta de la TAPA. Cada RUEDA (con sus 10
// cifras) lleva por dentro una ranura por la que pasa su pestaña, y un canal para girar con la pestaña dentro. Solo cuando las ruedas
// están en la combinación, las pestañas pueden salir por sus ranuras: se tira del pomo, el pestillo sale de la orejeta de la tapa y se
// abre. Con una sola cifra mal, la pestaña choca con la rueda y no sale. Las cifras se leen de FRENTE, a la altura de la flecha.
export const COMB = { RD: 9, WD: 7, RB: 3, PLANO: 2.3, PASO: 12, SALE: 6, YB: 10.6, BAJO: 11, TAB: { l: 4, w: 2.6, r0: 2.0, r1: 4.7 } }; // (14-10: pestañas de 4 mm, antes 3)
export const combMedidas = (C, e) => {
  const code = String(e.p.codigo || '123').replace(/\D/g, '').slice(0, 4), n = Math.max(2, code.length), K = COMB, ZB = C.H - K.BAJO;
  const span = (n - 1) * K.PASO + 36.6, c0 = e.u - span / 2 + 23.2, cs = Array.from({ length: n }, (_, k) => c0 + k * K.PASO), cu = cs[n - 1];
  return { code: code.padStart(n, '0'), n, ZB, cs, cu, span, x0: e.u - span / 2, x1: e.u + span / 2, abajo: ZB - 6 - (K.YB + 5.5) };
};
// el perfil de las orejetas (con su escuadra a 45° por debajo: sin soportes)
const orejeta = (K, ZB) => [[0.01, ZB + 7.5], [-(K.YB + 5.5), ZB + 7.5], [-(K.YB + 5.5), ZB - 6], [0.01, ZB - 6 - (K.YB + 5.5)]]; // (4,2 mm de plástico encima del pestillo)
// el agujero en D (con su holgura) y, si hace falta, el paso de las pestañas
function agujeroD(K, x0, x1, ZB, conPaso) {
  const r = K.RB + 0.3, y = -K.YB; let a = cilX(r, x0, x1, y, ZB).subtract(cubo(x0 - 1, x1 + 1, y - r - 1, y + r + 1, ZB - r - 1, ZB - K.PLANO - 0.3));
  if (conPaso) a = a.add(cubo(x0, x1, y - K.TAB.w / 2 - 0.4, y + K.TAB.w / 2 + 0.4, ZB, ZB + K.TAB.r1 + 0.5));
  return a;
}
// el PESTILLO, en coordenadas de la cara, en su sitio de CERRADO (x desplazado «d» hacia la izquierda si se saca)
export function combPestillo(C, e, d = 0) {
  const K = COMB, Q = combMedidas(C, e), y = -K.YB, z = Q.ZB, xI = Q.cs[0] - 7.2 - 1, xP = Q.cu + 12.9;
  const enD = m => m.subtract(cubo(-1000, 1000, y - 20, y + 20, z - 20, z - K.PLANO)); // el plano de abajo (también apoya en la cama)
  let m = enD(cilX(K.RB, xI, xP, y, z)), pomo = enD(cilX(6, xI - 9, xI + 0.01, y, z)).subtract(cilZ(1.3, z - 10, z + 10, xI - 5, y)); // (con un agujerito para atarlo con un cordón)
  m = m.add(pomo);
  Q.cs.forEach(c => { m = m.add(cubo(c - K.TAB.l / 2, c + K.TAB.l / 2, y - K.TAB.w / 2, y + K.TAB.w / 2, z + K.TAB.r0, z + K.TAB.r1)); });
  return d ? m.translate([-d, 0, 0]) : m;
}
// una RUEDA: decágono con sus cifras, agujero, canal interior y la ranura de su cifra; girada para enseñar la cifra «ver» de frente
export function combRueda(C, e, k, ver, conCifras = true) {
  const K = COMB, Q = combMedidas(C, e), c = Q.cs[k], y = -K.YB, z = Q.ZB, cifra = Number(Q.code[k]);
  // en su eje (x a lo largo, el resto alrededor del origen): la cifra 0 mira hacia fuera (−y) y suben de 36 en 36
  const ri = K.RD / Math.cos(Math.PI / 10), dec = N.cs([N.ccw(Array.from({ length: 10 }, (_, i) => { const t = (i + 0.5) * Math.PI / 5; return [-ri * Math.cos(t), ri * Math.sin(t)]; }))], 'Positive');
  let r = dec.extrude(K.WD).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, -K.WD / 2, 0, 0, 1]); // (perfil en y-z, a lo largo de x)
  r = r.subtract(cilX(K.RB + 0.35, -K.WD, K.WD)).subtract(cilX(K.TAB.r1 + 0.6, -K.WD / 2 + 1.1, K.WD / 2 - 1.1));
  // la ranura (de lado a lado de la rueda): arriba (+z) cuando la cifra buena mira de frente → en la rueda, a 90° + cifra · 36°
  const gate = cubo(-K.WD, K.WD, -K.TAB.w / 2 - 0.4, K.TAB.w / 2 + 0.4, 0, K.TAB.r1 + 0.6);
  r = r.subtract(gate.transform(girox(cifra * 36)));
  // las cifras: la «i» en la cara que está a i·36° (0 = la de fuera), grabadas 0,55 mm y de pie (se leen de frente)
  if (conCifras) for (let i = 0; i < 10; i++) { const T = texto(String(i), 4.4, 0.6); if (!T) break;
    r = r.subtract(T.transform([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, -K.RD + 0.55, 0, 1]).transform(girox(i * 36))); }
  // a la cifra «ver» de frente: la rueda gira −ver·36° (con nuestro ángulo: 0 = fuera, 90 = arriba)
  return r.transform(girox(-Number(ver) * 36)).translate([c, y, z]);
}
// girar «a» grados en NUESTRO sentido (de fuera hacia arriba) alrededor del eje x
function girox(a) { const t = a * Math.PI / 180, co = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, 0, co, -s, 0, 0, s, co, 0, 0, 0, 0, 1]; }

// ======================= 🔑 CERRADURA CON SU LLAVE =======================
// Un BOMBÍN impreso (cilindro con pestaña por fuera) atraviesa la pared; por dentro lleva una LEVA encajada en su hexágono. La leva es
// una CUÑA (un cuarto de círculo de radio RL). De la tapa cuelga un GANCHO (una placa por detrás de la leva con un diente que se mete
// por debajo de la cuña). «Cerrado» (la llave de pie): la cuña está encima del diente; al tirar de la tapa, el diente empuja el BORDE
// REDONDO de la cuña, y como ese borde es un arco con centro en el eje, el empuje pasa por el eje y NO la hace girar (14-10-2026: la
// primera versión tenía un brazo recto y el propio tirón de la tapa lo giraba hasta abrirla). Con la llave, un cuarto de vuelta: la
// cuña pasa al otro lado del eje, el diente queda libre y la tapa se abre. Para cerrar: llave tumbada, bajar la tapa y llave de pie.
// La llave entra solo si su perfil coincide con la ranura del bombín (código de 3 letras, ver abajo).
// El diente se imprime sin soportes (la tapa va boca abajo): arriba es plano solo 2 mm y luego baja a 45°.
export const LLAVE = { RP: 6, RF: 8.5, FL: 2, BOSS: 6, HEX: 7, RL: 16, T0: 10, T1: 15, GRUESO: 5, BAJO: 13, HOL: 0.5, PLACA: 3.5, DIENTE: 3, PLANO: 2 };
// el lado del diente: en la cara derecha va al revés (al abrirse, la tapa se mueve hacia delante: el gancho se ALEJA del bombín)
export const llaveLado = cara => (cara === 'der' ? -1 : 1);
// código: 3 letras, una por guarda (de abajo arriba): N = sin guarda, C = guarda corta (0,8 mm), L = guarda larga (1,3 mm). La ranura del
// bombín lleva las GUARDAS y la llave, las MUESCAS: una llave sin muescas (o con muescas más cortas) no entra.
export const llaveCodigo = c => { const s = String(c || 'LCL').toUpperCase().replace(/[^NCL]/g, ''); return (s + 'NNN').slice(0, 3); };
const GUARDA = { N: 0, C: 0.8, L: 1.3 };
export function llaveMedidas(C, e) {
  const K = LLAVE, pr = C.pared, ZK = C.H - llaveBajo(C), yLeva0 = pr + K.BOSS + 0.5, yLeva1 = yLeva0 + K.GRUESO, yP0 = yLeva1 + 0.6;
  const zD1 = ZK - Math.sqrt(K.RL * K.RL - K.T0 * K.T0) - K.HOL; // lo de arriba del diente: HOL por debajo del arco de la cuña
  return { ZK, yLeva0, yLeva1, yP0, yP1: yP0 + K.PLACA, zD1, zD0: zD1 - K.DIENTE, s: llaveLado(e.cara), codigo: llaveCodigo(e.p.codigo) };
}
// lo que baja el eje del bombín desde arriba: con tapa a presión, más (su labio entra en la caja y no puede pisar el refuerzo del bombín)
export const llaveBajo = C => (C.tapa === 'presion' ? Math.max(LLAVE.BAJO, (C.labio || 5) + LLAVE.RF + 1 + 1.5) : LLAVE.BAJO);
// el gancho de la tapa (en la cara): la placa por detrás de la leva y el diente con su rampa a 45° (y, z)
export function llaveGancho(C, e) {
  const K = LLAVE, Q = llaveMedidas(C, e), H = C.H, a = e.u + Q.s * K.T0, b = e.u + Q.s * K.T1, x0 = Math.min(a, b), x1 = Math.max(a, b);
  const placa = cubo(x0, x1, Q.yP0, Q.yP1, Q.zD0, H + 0.01);
  const diente = perfilX([[Q.yP0 + 0.01, Q.zD1], [Q.yP0 - K.PLANO, Q.zD1], [Q.yP0 - K.PLANO - K.DIENTE, Q.zD0], [Q.yP0 + 0.01, Q.zD0]], x0, x1);
  return placa.add(diente);
}
// el perfil de la ranura (en u-z, centrado): un rectángulo de 2,4 × 8 y las muescas del código
export function llavePerfil(codigo, encoge = 0) {
  let s = N.CSX().square([2.4 - 2 * encoge, 8 - 2 * encoge], true);
  [-2.5, 0, 2.5].forEach((zz, i) => { const b = GUARDA[codigo[i]] || 0; if (b > 0) s = s.subtract(N.CSX().square([b + 2 * encoge + 0.02, 1.6 + 2 * encoge], true).translate([1.2 - (b + 2 * encoge) / 2 + 0.01, zz])); });
  return s;
}
const extY = (cs, y0, y1) => cs.extrude(y1 - y0).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, y0, 0, 1]); // perfil en (x, z) estirado a lo largo de y
// el bombín (en la cara; eje a lo largo de y, por u = e.u, z = ZK)
export function llaveBombin(C, e) {
  const K = LLAVE, Q = llaveMedidas(C, e), pr = C.pared, yFin = pr + K.BOSS + 0.5;
  let b = cilY(K.RF, -K.FL - 0.1, -0.1).add(cilY(K.RP, -0.11, yFin)).add(extY(N.cs([N.poligono2(6, K.HEX / Math.cos(Math.PI / 6), 0)], 'Positive'), yFin - 0.01, yFin + K.GRUESO));
  b = b.subtract(extY(llavePerfil(Q.codigo, 0), -K.FL - 1.1, pr + 3.5)); // la ranura, hasta 3,5 mm dentro de la pared (la pestaña, a 0,1 de la pared: gira sin rozar)
  return b.translate([e.u, 0, Q.ZK]);
}
// la leva: cerrada = la cuña abajo hacia el diente (abajo a la derecha si s = 1); abierta = un cuarto de vuelta, abajo al otro lado.
// «ang» (0 = cerrada … 90 = abierta) para comprobar que gira sin rozar.
export function llaveLeva(C, e, cerrada = true, ang = null) {
  const K = LLAVE, Q = llaveMedidas(C, e), s = Q.s, a = ang != null ? ang : (cerrada ? 0 : 90);
  const arco = [[0, 0]].concat(Array.from({ length: 31 }, (_, i) => { const t = (-90 + 90 * i / 30) * Math.PI / 180; return [s * K.RL * Math.cos(t), K.RL * Math.sin(t)]; }));
  let l = cilY(6, 0, K.GRUESO).add(extY(N.cs([N.ccw(arco)], 'Positive'), 0, K.GRUESO));
  l = l.subtract(extY(N.cs([N.poligono2(6, (K.HEX + 0.15) / Math.cos(Math.PI / 6), 0)], 'Positive'), -1, K.GRUESO + 1));
  if (a) l = l.rotate([0, s * a, 0]); // (alrededor del eje: la cuña baja por debajo del eje y pasa al otro lado)
  return l.translate([e.u, Q.yLeva0, Q.ZK]);
}
// lo que ocupa la cerradura POR DENTRO (en el mundo): para que no se le pongan separadores ni cosas encima
export function llaveSitio(C, e, F) {
  const K = LLAVE, P = [];
  [-1, 1].forEach(a => [0, 1].forEach(b => { const uu = e.u + a * (K.RL + 1), yy = b * (C.pared + K.BOSS + 0.5 + K.GRUESO + 0.6 + K.PLACA + 1);
    P.push([0, 1].map(k => F.o[k] + F.eu[k] * uu - F.n[k] * yy)); }));
  return { x0: Math.min(...P.map(p => p[0])), x1: Math.max(...P.map(p => p[0])), y0: Math.min(...P.map(p => p[1])), y1: Math.max(...P.map(p => p[1])) };
}
// la LLAVE (para imprimir tumbada; y en su sitio, metida, para comprobar)
// la llave a lo largo de +y (la hoja de 0 a su largo; el tope y la cabeza, por detrás): para meterla, se mueve a la boca del bombín
export function llaveLlave(C, codigo) {
  const K = LLAVE, pr = C.pared, lHoja = K.FL + pr + 3.5 - 0.6;
  const hoja = extY(llavePerfil(llaveCodigo(codigo), 0.22), 0, lHoja), tope = cubo(-1.2, 1.2, -1.2, 0.01, -5, 5);
  const cab = cilX(11, -1.2, 1.2, -12, 0).subtract(cilX(3.2, -2, 2, -17, 0)); // la cabeza (plana, como la hoja) con su agujero para la anilla
  return hoja.add(tope).add(cab);
}
export const llaveMetida = (C, e, codigo) => llaveLlave(C, codigo).translate([e.u, -LLAVE.FL - 0.11, llaveMedidas(C, e).ZK]);

// ======================= 🤫 CIERRE SECRETO POR GRAVEDAD (con tapa corredera) =======================
// Dentro, una columnita con un agujero arriba; en la tapa, encima, un pomo hueco. Un PASADOR suelto cae por su peso: con la caja de pie,
// baja y queda a medias en la columna y a medias en la tapa → la tapa no corre. Boca abajo, el pasador cae dentro del pomo de la tapa
// y ya no la sujeta → con la caja boca abajo, la tapa se desliza. Nadie lo ve: el pomo parece un adorno.
export const GRAV = { RC: 4.5, RH: 2.3, RP: 1.85, LP: 8, HOYO: 4.5, RB: 6 };
export const gravBoss = tg => Math.max(4, GRAV.LP + 2.3 - tg); // (el pasador entero tiene que caber en la tapa + su pomo)

// ---------- las medidas de las PILAS (las de siempre; se mide la pila y +0,8 de aire) ----------
export const PILAS = { aa: { t: 'AA', d: 14.5, h: 50.5 }, aaa: { t: 'AAA', d: 10.5, h: 44.5 }, '18650': { t: '18650', d: 18.6, h: 65.2 }, '9v': { t: '9 V', a: 26.5, b: 17.5, h: 48.5 }, cr2032: { t: 'botón CR2032', d: 20, g: 3.2, h: 20 } };
export const MEZCLAS = { aa: ['aa'], aaa: ['aaa'], aa_aaa: ['aa', 'aaa'], '9v': ['9v'], cr2032: ['cr2032'], '18650': ['18650'], todo: ['aa', 'aaa', '9v', 'cr2032'] };
const altoPila = k => PILAS[k].h;

// ======================= los ELEMENTOS nuevos (se suman a los de cajas.js) =======================
const LADOS = ['frente', 'atras', 'izq', 'der'];
export const TIPOS_PRO = {
  combinacion: { e: '🔢', t: 'Combinación', d: 'Ruedas con números: con la combinación buena sale el pestillo y se abre', caras: ['frente', 'izq', 'der'], junta: 1, grupo: 'cerrar', p: { codigo: '427' }, campos: [['codigo', 'Combinación (2 a 4 cifras)', 'txt']] },
  llave: { e: '🔑', t: 'Cerradura con llave', d: 'Bombín y su llave impresos: un cuarto de vuelta y la tapa no se abre', caras: ['frente', 'izq', 'der'], junta: 1, grupo: 'cerrar', p: { codigo: 'LCL', llaves: 2 }, campos: [['codigo', 'Código de la llave (3 letras: N, C o L)', 'txt'], ['llaves', 'Llaves (copias iguales)', 1, 3, 1]] }, // (14-10: ella, «tenías que haber hecho la llave»: de serie salen 2)
  gravedad: { e: '🤫', t: 'Cierre secreto', d: 'Solo con tapa corredera: de pie no se abre; boca abajo, la tapa corre', caras: ['dentro'], grupo: 'cerrar', p: {}, campos: [] },
  cajon: { e: '🗃️', t: 'Cajón', d: 'Un cajón abajo, con su estante encima', caras: ['frente'], grupo: 'abrir', p: { alto: 22, ancho: 0 }, campos: [['alto', 'Alto del cajón', 12, 80, 1], ['ancho', 'Ancho (0 = todo lo que cabe)', 0, 240, 1]] },
  bandeja: { e: '🧺', t: 'Bandeja que se saca', d: 'Una bandeja arriba que apoya en unos rebordes', caras: ['dentro'], grupo: 'dentro', p: { prof: 18, cols: 2 }, campos: [['prof', 'Hondo de la bandeja', 10, 60, 1], ['cols', 'Compartimentos', 1, 6, 1]] },
  fondo: { e: '🫥', t: 'Fondo falso', d: 'Un suelo que se levanta por una muesca: debajo, un escondite', caras: ['dentro'], grupo: 'dentro', p: { alto: 12 }, campos: [['alto', 'Alto del escondite', 6, 60, 1]] },
  rejilla: { e: '▦', t: 'Rejilla', d: 'Compartimentos iguales; con fondo en cuenco (tornillos que se cogen fácil)', caras: ['dentro'], grupo: 'dentro', p: { cols: 3, filas: 2, cuencos: 1 }, campos: [['cols', 'Columnas', 1, 10, 1], ['filas', 'Filas', 1, 8, 1], ['cuencos', 'Fondo en cuenco (1 = sí, 0 = no)', 0, 1, 1]] },
  cubetas: { e: '🧊', t: 'Cubetas sueltas', d: 'Cubetas que encajan dentro y se sacan (6 en 1)', caras: ['dentro'], grupo: 'dentro', p: { cols: 3, filas: 2 }, campos: [['cols', 'Columnas', 1, 6, 1], ['filas', 'Filas', 1, 6, 1]] },
  pilas: { e: '🔋', t: 'Pilas', d: 'Un soporte con un hueco para cada pila (de pie)', caras: ['dentro'], grupo: 'dentro', p: { tipo: 'aa_aaa' }, campos: [['tipo', 'Pilas', { ops: [['aa_aaa', 'AA y AAA'], ['aa', 'Solo AA'], ['aaa', 'Solo AAA'], ['9v', '9 V'], ['cr2032', 'De botón (CR2032)'], ['18650', '18650'], ['todo', 'AA, AAA, 9 V y botón']] }]] },
  ventila: { e: '🌬️', t: 'Ventilación', d: 'Rejilla de ranuras en un lateral', caras: LADOS, grupo: 'mas', p: { ancho: 40, alto: 18 }, campos: [['ancho', 'Ancho', 12, 160, 1], ['alto', 'Alto', 8, 120, 1]] },
  colgar: { e: '🪝', t: 'Para colgar', d: 'Dos ojales detrás para colgarla de dos tornillos', caras: ['atras'], grupo: 'mas', p: { sep: 0 }, campos: [['sep', 'Separación (0 = la mitad del largo)', 0, 230, 1]] },
  texto: { e: '✍️', t: 'Nombre en la tapa', d: 'Letras grabadas encima de la tapa (rellénalas de pintura o cambia de color)', caras: ['tapa'], grupo: 'mas', p: { txt: 'CelebriDiseños', alto: 8 }, campos: [['txt', 'Texto', 'txt'], ['alto', 'Alto de las letras', 4, 30, 0.5]] },
};
// cuántos de cada uno como mucho (el limitador)
export const MAXIMO = { combinacion: 1, llave: 2, gravedad: 2, cajon: 1, bandeja: 1, fondo: 1, rejilla: 1, cubetas: 1, pilas: 1, ventila: 6, colgar: 1, texto: 3, bisagra: 4, cierre: 4, candado: 2, iman: 6, pomo: 6, asa: 4, puerta: 4, cable: 8, etiqueta: 6, separador: 8 };
// lo que va DENTRO y ocupa el suelo entero (no pueden ir dos a la vez)
export const SUELO = ['rejilla', 'cubetas', 'pilas', 'separador'];

// ---------- las alturas de las cosas de dentro ----------
export const labioTapa = C => (C.tapa === 'corredera' ? 0 : C.tapa === 'presion' ? C.labio : 1.6);
export function alturas(C) {
  const sf = C.suelo, techo = C.H - labioTapa(C) - 0.6;
  const caj = C.els.find(e => e.tipo === 'cajon'), fon = C.els.find(e => e.tipo === 'fondo'), ban = C.els.find(e => e.tipo === 'bandeja');
  const zCajon = caj ? sf + caj.p.alto + 0.6 + 0.4 : null; // encima del cajón, el estante (2,4)
  const zFondo = fon ? sf + fon.p.alto : null; // el fondo falso (2 mm)
  const piso = zCajon != null ? zCajon + 2.4 : zFondo != null ? zFondo + 2 : sf; // el suelo «útil»
  const zBandeja = ban ? techo - ban.p.prof : null; // la bandeja apoya aquí
  return { sf, techo, zCajon, zFondo, piso, zBandeja };
}

// ---------- 🟩🟥 las zonas de los nuevos ----------
export function zonaPro(C, tipo, cara, u, v, p, idIgnora, ctx) {
  const { no, si, uso, choca, nombre } = ctx, H = C.H, pr = C.pared, LI = C.L - 2 * pr, WI = C.W - 2 * pr, A = alturas(C);
  const otros = (t) => C.els.filter(e => e.id !== idIgnora && e.tipo === t);
  if (otros(tipo).length >= (MAXIMO[tipo] || 99)) return no('Ya hay ' + (MAXIMO[tipo] === 1 ? 'uno' : MAXIMO[tipo]) + ': como mucho ' + MAXIMO[tipo] + ' en una caja.');
  switch (tipo) {
    case 'combinacion': {
      if (C.tapa === 'corredera') return no('Con la tapa corredera no va: ponle una tapa de bisagra o a presión.');
      if (cara === 'atras' && C.tapa !== 'presion') return no('Detrás van las bisagras.');
      const Q = combMedidas(C, { u, p });
      if (Math.abs(u) + Q.span / 2 > uso) return no('No cabe: necesita ' + n1(Q.span) + ' mm de lado recto. Hazla más larga o pon menos cifras.');
      if (Q.abajo < C.suelo + 2) return no('La caja es muy baja: la cerradura necesita ' + n1(H - Q.abajo + C.suelo + 2) + ' mm de alto.');
      if (!/^\d{2,4}$/.test(String(p.codigo || ''))) return no('La combinación tiene que ser de 2 a 4 cifras (por ejemplo 427).');
      if (/^(\d)\1+$/.test(String(p.codigo))) return si('Cabe, pero una combinación de cifras iguales se adivina enseguida: cámbiala.', { aviso: true });
      if (choca) return no('Se pisa con ' + nombre(choca) + '.');
      return si('Aquí: las ruedas se ven y se giran de frente.');
    }
    case 'llave': {
      const K = LLAVE;
      if (C.tapa === 'corredera') return no('Con la tapa corredera no va: ponle una tapa de bisagra o a presión.');
      if (cara === 'atras' && C.tapa !== 'presion') return no('Detrás van las bisagras.');
      if (pr < 2.4) return no('Con paredes de menos de 2,4 mm el bombín no se sujeta bien: súbelas a 3.');
      if (!/[CL]/.test(llaveCodigo(p.codigo))) return no('El código necesita al menos una C o una L (si no, entra cualquier llave).');
      if (Math.abs(u) + K.RF + 1 > uso || Math.abs(u) + K.RL + 3 > (cara === 'frente' || cara === 'atras' ? LI : WI) / 2) return no('Muy cerca de la esquina: la cuña de la leva necesita sitio por dentro. Muévela hacia el centro.');
      const hondo = llaveBajo(C) + K.RL + 1.5; if (H - hondo < A.piso + 1) return no('La caja es muy baja para la cerradura: necesita ' + n1(hondo + A.piso + 1) + ' mm de alto (por dentro, la cuña baja ' + n1(hondo) + ' mm).');
      const dentro = C.els.find(x => x.id !== idIgnora && ['bandeja', 'cubetas', 'rejilla', 'pilas'].includes(x.tipo)); if (dentro) return no('La cuña de la leva gira por dentro, junto a la pared, y chocaría con ' + nombre(dentro) + '.');
      if (ctx.marco) { const B = llaveSitio(C, { u, p }, ctx.marco(cara)), sep = C.els.find(x => x.id !== idIgnora && x.tipo === 'separador' && (x.p.dir === 'x' ? x.v > B.y0 - 1.5 && x.v < B.y1 + 1.5 : x.u > B.x0 - 1.5 && x.u < B.x1 + 1.5)); if (sep) return no('Ahí por dentro hay un separador: la leva chocaría con él. Mueve la cerradura o el separador.'); }
      // con bisagra, al abrirse, la tapa va hacia DELANTE: el diente (lo más bajo del gancho) no puede rozar la pared de delante
      if (cara === 'frente' && C.tapa !== 'presion' && ctx.Rk) { const Q = llaveMedidas(C, { u, p, cara }), roza = W => { const yh = W / 2 + ctx.Rk, y0 = -W / 2 + Q.yP0 - K.PLANO - K.DIENTE; return yh - Math.hypot(yh - y0, H - Q.zD0) < -W / 2 + pr + 0.4; };
        if (roza(C.W)) { let w = Math.ceil(C.W); while (w < 400 && roza(w)) w++; return no('La caja es poco honda (de delante a atrás) para la cerradura: al abrir, su gancho rozaría la pared. Hazla de ' + w + ' mm de ancho o más, o ponla en un lado.'); } }
      if (choca) return no('Se pisa con ' + nombre(choca) + '.');
      return si('Aquí: la cuña de la leva gira por dentro sin tocar nada.');
    }
    case 'gravedad': {
      if (C.tapa !== 'corredera') return no('El cierre secreto va con la TAPA CORREDERA: elígela arriba.');
      if (Math.abs(u) > LI / 2 - 9 || Math.abs(v) > WI / 2 - 9) return no('Muy pegado a la pared: déjalo a 9 mm.');
      if (C.tapaG < 3) return no('La tapa tiene que medir al menos 3 mm.');
      if (C.els.some(e => e.id !== idIgnora && ['rejilla', 'cubetas', 'pilas', 'bandeja'].includes(e.tipo))) return si('Cabe; pero lo de dentro (rejilla, cubetas…) deja un hueco alrededor de la columnita.', { aviso: true });
      return si('Aquí: nadie verá el cierre (en la tapa parece un pomo).');
    }
    case 'cajon': {
      if (C.H < C.suelo + p.alto + 2.4 + 20) return no('La caja es muy baja para un cajón de ' + n1(p.alto) + ' mm (y algo de sitio encima).');
      const aw = cajonAncho(C, p); if (aw < 30) return no('La caja es muy estrecha para un cajón.');
      if (C.els.some(e => e.id !== idIgnora && e.tipo === 'fondo')) return no('Con fondo falso no cabe un cajón (los dos van abajo).');
      if (C.els.some(e => e.id !== idIgnora && e.tipo === 'llave') && C.H - llaveBajo(C) - LLAVE.RL - 1.5 < C.suelo + p.alto + 1 + 2.4 + 1) return no('Con la cerradura de llave, un cajón de ' + n1(p.alto) + ' mm no deja sitio a su cuña: hazlo más bajo o la caja más alta.');
      const yo = { u0: -aw / 2 - 1, u1: aw / 2 + 1, v0: C.suelo, v1: C.suelo + p.alto + 2 }, pis = C.els.find(e => e.id !== idIgnora && e.cara === 'frente' && e.tipo !== 'cajon' && (() => { const r = ctx.rectDe(e); return r && r.u0 < yo.u1 && yo.u0 < r.u1 && r.v0 < yo.v1 && yo.v0 < r.v1; })());
      if (pis) return no('En la parte de abajo del frente está ' + nombre(pis) + ': el cajón ocupa esa franja.');
      return si('Aquí: el cajón sale entero hacia delante.', { u: 0, v: C.suelo });
    }
    case 'bandeja': {
      if (C.els.some(e => e.id !== idIgnora && e.tipo === 'llave')) return no('Con la cerradura de llave no: su cuña gira por dentro, junto a la pared, y chocaría con la bandeja.');
      const zb = A.techo - p.prof; if (zb < A.piso + 15) return no('No cabe: la bandeja de ' + n1(p.prof) + ' mm deja menos de 15 mm debajo. Hazla menos honda o la caja más alta.');
      return si('Aquí: la bandeja apoya en los rebordes y se saca por arriba.', { u: 0, v: 0 });
    }
    case 'fondo': {
      if (C.els.some(e => e.id !== idIgnora && e.tipo === 'cajon')) return no('Con cajón no cabe un fondo falso.');
      if (C.H - C.suelo - p.alto < 20) return no('La caja es muy baja para un escondite de ' + n1(p.alto) + ' mm.');
      if (C.els.some(e => e.id !== idIgnora && e.tipo === 'llave') && C.H - llaveBajo(C) - LLAVE.RL - 1.5 < C.suelo + p.alto + 2 + 1) return no('Con la cerradura de llave, un escondite de ' + n1(p.alto) + ' mm no deja sitio a su cuña: hazlo más bajo o la caja más alta.');
      return si('Aquí: el fondo se levanta por su muesca.', { u: 0, v: 0 });
    }
    case 'rejilla': case 'cubetas': case 'pilas': {
      const otro = C.els.find(e => e.id !== idIgnora && SUELO.includes(e.tipo) && e.tipo !== 'separador'); if (otro) return no('Ya hay ' + nombre(otro) + ' ocupando el suelo: quita una de las dos.');
      if (C.els.some(e => e.id !== idIgnora && e.tipo === 'llave')) return no('Con la cerradura de llave no: su cuña gira por dentro, junto a la pared, y chocaría.');
      if (tipo !== 'cubetas' && C.els.some(e => e.id !== idIgnora && (e.tipo === 'cajon' || e.tipo === 'fondo'))) return no('Con cajón o fondo falso, ' + (tipo === 'rejilla' ? 'la rejilla' : 'el soporte') + ' iría en el aire (no se imprime): usa CUBETAS sueltas, que van encima.');
      if (tipo === 'pilas') { const hMax = Math.max(...(MEZCLAS[p.tipo] || ['aa']).map(altoPila)); if (A.techo - A.piso < hMax + 1) return no('No caben de pie: las ' + PILAS[(MEZCLAS[p.tipo] || ['aa']).find(k => altoPila(k) === hMax)].t + ' miden ' + n1(hMax) + ' mm y dentro hay ' + n1(A.techo - A.piso) + '. Sube la caja a ' + n1(C.H + hMax + 1 - (A.techo - A.piso)) + ' mm.'); }
      if (tipo === 'cubetas' && ((LI - 0.6) / p.cols < 18 || (WI - 0.6) / p.filas < 18)) return no('Cubetas de menos de 18 mm no son prácticas: pon menos columnas o filas.');
      if (tipo === 'rejilla' && ((LI) / p.cols < 12 || (WI) / p.filas < 12)) return no('Compartimentos de menos de 12 mm: pon menos columnas o filas.');
      return si({ rejilla: 'Compartimentos de ' + n1(LI / p.cols) + ' × ' + n1(WI / p.filas) + ' mm.', cubetas: 'Cubetas de ' + n1((LI - 0.6) / p.cols - 0.6) + ' × ' + n1((WI - 0.6) / p.filas - 0.6) + ' mm.', pilas: 'Caben ' + pilasCuenta(C, p) + '.' }[tipo], { u: 0, v: 0 });
    }
    case 'ventila': {
      if (Math.abs(u) + p.ancho / 2 > uso) return no('Se sale de lo recto de la cara.');
      if (v - p.alto / 2 < A.sf + 2 || v + p.alto / 2 > H - 4) return no('Muy arriba o muy abajo: déjala entre el suelo y la tapa.');
      if (choca) return no('Se pisa con ' + nombre(choca) + '.');
      return si('Aquí entra y sale el aire.');
    }
    case 'colgar': return C.H < 30 ? no('La caja es muy baja para colgarla.') : si('Detrás, a dos tercios de la altura.', { u: 0, v: C.H * 0.62 });
    case 'texto': {
      if (cara !== 'tapa') return no('El nombre va encima de la tapa.');
      if (Math.abs(v) + p.alto / 2 > C.W / 2 - C.radio - 2) return no('Se sale de la tapa: muévelo hacia el centro.');
      return si('Aquí se lee bien.');
    }
  }
  return si('');
}
export function cajonAncho(C, p) { const LI = C.L - 2 * C.pared; return Math.max(0, Math.min(p.ancho > 0 ? p.ancho : 1e9, LI - 6)); }
// el rectángulo que ocupa en su cara (para que no se pisen y para pintarlo)
export function rectPro(C, e) {
  const p = e.p, u = e.u, v = e.v;
  switch (e.tipo) {
    case 'combinacion': { const Q = combMedidas(C, e); return { u0: Q.x0, u1: Q.x1, v0: Q.abajo, v1: C.H + C.tapaG }; }
    case 'llave': return { u0: u - LLAVE.RL - 1, u1: u + LLAVE.RL + 1, v0: C.H - llaveBajo(C) - LLAVE.RL - 2, v1: C.H + C.tapaG }; // (por fuera solo se ve el bombín; por dentro, la cuña y el gancho ocupan todo esto)
    case 'cajon': { const aw = cajonAncho(C, p); return { u0: -aw / 2 - 1, u1: aw / 2 + 1, v0: C.suelo, v1: C.suelo + p.alto + 1 }; }
    case 'ventila': return { u0: u - p.ancho / 2, u1: u + p.ancho / 2, v0: v - p.alto / 2, v1: v + p.alto / 2 };
    case 'colgar': return { u0: -C.L / 2 + 10, u1: C.L / 2 - 10, v0: v - 6, v1: v + 12 };
    case 'texto': { const w = Math.min(C.L - 12, String(p.txt || '').length * p.alto * 0.7); return { u0: u - w / 2, u1: u + w / 2, v0: v - p.alto / 2, v1: v + p.alto / 2 }; }
    case 'gravedad': return { u0: u - GRAV.RC, u1: u + GRAV.RC, v0: v - GRAV.RC, v1: v + GRAV.RC };
    default: { const LI = C.L - 2 * C.pared, WI = C.W - 2 * C.pared; return { u0: -LI / 2, u1: LI / 2, v0: -WI / 2, v1: WI / 2 }; }
  }
}
export function pilasCuenta(C, p) { const L = pilasHuecos(C, p); const c = {}; L.forEach(h => { c[h.k] = (c[h.k] || 0) + 1; }); return Object.entries(c).map(([k, n]) => n + ' ' + PILAS[k].t).join(' + ') || 'ninguna'; }
// los huecos de las pilas, repartidos por el suelo (en mundo): [{ k, x, y, giro? }]
export function pilasHuecos(C, p) {
  const LI = C.L - 2 * C.pared, WI = C.W - 2 * C.pared, kinds = MEZCLAS[p.tipo] || ['aa'], out = [], borde = 2.4;
  const ancho = (LI - 2 * borde) / kinds.length;
  kinds.forEach((k, i) => {
    const P = PILAS[k], x0 = -LI / 2 + borde + i * ancho, x1 = x0 + ancho, y0 = -WI / 2 + borde, y1 = WI / 2 - borde;
    if (k === '9v') { const pa = P.a + 0.8 + 2, pb = P.b + 0.8 + 2; for (let x = x0 + pa / 2; x + pa / 2 <= x1 + 0.01; x += pa) for (let y = y0 + pb / 2; y + pb / 2 <= y1 + 0.01; y += pb) out.push({ k, x, y }); return; }
    if (k === 'cr2032') { const pa = P.g + 0.6 + 2, pb = P.d + 0.8 + 2; for (let x = x0 + pa / 2; x + pa / 2 <= x1 + 0.01; x += pa) for (let y = y0 + pb / 2; y + pb / 2 <= y1 + 0.01; y += pb) out.push({ k, x, y }); return; }
    const pd = P.d + 0.8 + 1.8; for (let x = x0 + pd / 2; x + pd / 2 <= x1 + 0.01; x += pd) for (let y = y0 + pd / 2; y + pd / 2 <= y1 + 0.01; y += pd) out.push({ k, x, y });
  });
  return out;
}

// ======================= 🔨 LA GEOMETRÍA de los nuevos =======================
// X = { C, L, W, H, pr, sf, tg, R, LI, WI, RI, masC, menosC, masT, menosT, sueltas, avisos, mec, marco, enCara }
export function construyePro(X) {
  const { C, L, W, H, pr, sf, tg, LI, WI, RI, masC, menosC, masT, menosT, sueltas, mec } = X, A = alturas(C), hm = HOLGURA_MOVIL;
  // (los rebordes, hechos como «marco»: el hueco de dentro menos un tronco de pirámide que se abre hacia abajo)
  const marcoReborde = (z, ancho = 2.2, sinFrente = false) => {
    let m = prisma(LI + 0.02, WI + 0.02, RI, z - ancho, z).subtract(M().hull([prisma(LI - 2 * ancho, WI - 2 * ancho, Math.max(0.3, RI - ancho), z - 0.01, z + 0.01), prisma(LI + 0.04, WI + 0.04, RI, z - ancho - 0.02, z - ancho - 0.01)]));
    if (sinFrente) m = m.subtract(cubo(-LI, LI, -WI / 2 - 1, -WI / 2 + ancho + 0.5, z - ancho - 1, z + 1));
    return m;
  };
  const els = C.els, F = c => X.marco(C, c), enF = (m, c) => X.enCara(m, F(c));
  els.forEach(e => {
    const p = e.p;
    if (X.porQueNo && X.porQueNo(C, e.tipo, e.id, true)) return; // (lo que no va con esta tapa no se construye)
    switch (e.tipo) {
      case 'combinacion': {
        const K = COMB, Q = combMedidas(C, e), ZB = Q.ZB, pf = orejeta(K, ZB), xs = [Q.cs[0] - 6].concat(Q.cs.slice(1).map(c => c - 6));
        let b = [];
        xs.forEach(xc => b.push(perfilX(pf, xc - 1.2, xc + 1.2).subtract(agujeroD(K, xc - 2, xc + 2, ZB, true))));
        b.push(perfilX(pf, Q.cu + 6 - 1.2, Q.cu + 6 + 1.2).subtract(agujeroD(K, Q.cu + 4, Q.cu + 8, ZB, false)));
        b.push(perfilX(pf, Q.cu + 11.0, Q.cu + 13.4).subtract(agujeroD(K, Q.cu + 10, Q.cu + 15, ZB, false)));
        // la flecha para leer: en la orejeta de la izquierda, a la altura del eje, apuntando hacia fuera
        b.push(perfilX([[-(K.YB + 5.5) + 0.01, ZB + 1.6], [-(K.YB + 7.5), ZB], [-(K.YB + 5.5) + 0.01, ZB - 1.6]], Q.cs[0] - 7.2, Q.cs[0] - 4.8));
        masC.push(enF(N.union(b), e.cara));
        // la orejeta de la TAPA (cuelga por fuera, 0,3 de aire con la pared) con su agujero redondo
        const xh0 = Q.cu + 7.6, xh1 = Q.cu + 10.6;
        masT.push(enF(perfilX([[0.01, H + tg], [-(K.YB + 6.5), H + tg], [-(K.YB + 6.5), ZB - 8], [-0.3, ZB - 8], [-0.3, H], [0.01, H]], xh0, xh1).subtract(cilX(K.RB + 0.4, xh0 - 1, xh1 + 1, -K.YB, ZB)), e.cara)); // (14-10: 4,6 mm de plástico debajo del agujero y 3,1 por fuera)
        const pest = combPestillo(C, e), ruedas = Q.cs.map((c, k) => combRueda(C, e, k, Q.code[k]));
        sueltas.push({ id: 'pest:' + e.id, nombre: 'Pestillo (con su pomo)', m: enF(pest, e.cara), imprimir: N.aLaCama(pest.translate([0, K.YB, -ZB])), con: null, nota: 'tumbado, sobre su parte plana · se mete por la izquierda, por las orejetas y las ruedas; para abrir, tira del pomo solo hasta que la tapa se suelte (unos 6 mm); el agujerito del pomo es para atarlo con un cordón y que no se salga del todo' });
        ruedas.forEach((r, k) => sueltas.push({ id: 'rueda' + k + ':' + e.id, nombre: 'Rueda ' + (k + 1) + ' (cifra ' + Q.code[k] + ')', m: enF(r, e.cara), imprimir: N.aLaCama(combRueda(C, e, k, 0, true).translate([-Q.cs[k], K.YB, -ZB]).rotate([0, 90, 0])), con: null, nota: 'tumbada (de canto no) · se ensarta en el pestillo con su cifra hacia fuera', tapaColor: true }));
        mec.push({ tipo: 'combinacion', e, cara: e.cara, F: F(e.cara), Q });
        break;
      }
      case 'llave': {
        const K = LLAVE, Q = llaveMedidas(C, e), ZK = Q.ZK, u = e.u;
        // el agujero del bombín en la pared y el refuerzo por dentro (con su escuadra a 45°)
        const boss = M().hull([cilY(K.RF + 1, pr - 0.01, pr + K.BOSS, u, ZK), cubo(u - K.RF - 1, u + K.RF + 1, pr - 0.01, pr, ZK - K.RF - 1 - K.BOSS, ZK)]);
        masC.push(enF(boss, e.cara)); menosC.push(enF(cilY(K.RP + 0.3, -1, pr + K.BOSS + 1, u, ZK), e.cara));
        // el GANCHO de la tapa: placa por detrás de la leva (fuera de su giro) con el diente que se mete por debajo de la cuña
        masT.push(enF(llaveGancho(C, e), e.cara));
        const bombin = llaveBombin(C, e), leva = llaveLeva(C, e, true), llave = llaveLlave(C, Q.codigo);
        sueltas.push({ id: 'bombin:' + e.id, nombre: 'Bombín', m: enF(bombin, e.cara), imprimir: N.aLaCama(bombin.translate([-u, 0, -ZK]).rotate([90, 0, 0])), con: null, nota: 'de pie, sobre su pestaña · se mete desde fuera' });
        sueltas.push({ id: 'leva:' + e.id, nombre: 'Leva (la cuña)', m: enF(leva, e.cara), imprimir: N.aLaCama(leva.translate([-u, -Q.yLeva0, -ZK]).rotate([90, 0, 0])), con: null, nota: 'tumbada · por dentro, a presión en el hexágono del bombín, con la llave DE PIE y la cuña hacia abajo, del lado del gancho' });
        const nLl = Math.max(1, Math.min(3, Math.round(Number(p.llaves) || 2)));
        sueltas.push({ id: 'llave:' + e.id, nombre: 'Llave' + (nLl > 1 ? ' 1' : '') + ' (' + Q.codigo + ')', m: enF(llaveMetida(C, e, Q.codigo), e.cara), /* (metida en su cerradura: se ve y gira en la animación) */ imprimir: N.aLaCama(llave.rotate([0, -90, 0])), con: null, nota: 'tumbada · llave de pie = cerrado; un cuarto de vuelta (tumbada) = abierto', tapaColor: true });
        for (let k = 1; k < nLl; k++) sueltas.push({ id: 'llave' + k + ':' + e.id, nombre: 'Llave ' + (k + 1) + ' (copia, ' + Q.codigo + ')', m: null, imprimir: N.aLaCama(llave.rotate([0, -90, 0])), con: null, nota: 'igual que la primera: la de repuesto', tapaColor: true });
        mec.push({ tipo: 'llave', e, cara: e.cara, F: F(e.cara), Q });
        break;
      }
      case 'gravedad': {
        const G = GRAV, x = e.u, y = e.v, top = H - 0.3;
        masC.push(cilZ(G.RC, A.sf - 0.01, top, x, y)); menosC.push(cilZ(G.RH, top - G.HOYO, top + 1, x, y));
        const bossH = gravBoss(tg); masT.push(cilZ(G.RB, H + tg - 0.01, H + tg + bossH, x, y)); menosT.push(cilZ(G.RH, H - 1, H + tg + bossH - 1.2, x, y));
        const plano = m => m.subtract(cubo(-10, 10, -10, -G.RP + 0.6, -1, G.LP + 1)); // (una cara plana de 2,7 mm: apoya en la cama; en su agujero da igual)
        const pin = plano(cilZ(G.RP, 0, G.LP)).translate([x, y, top - G.HOYO]);
        sueltas.push({ id: 'pasador:' + e.id, nombre: 'Pasador secreto', m: pin, imprimir: N.aLaCama(plano(cilZ(G.RP, 0, G.LP)).rotate([90, 0, 0])), con: null, nota: 'tumbado, sobre su cara plana · para CERRAR: pon la tapa del revés (el pomo abajo) y mete el pasador en su agujero; pon la caja boca abajo, deslízala sobre la tapa y dale la vuelta a todo: el pasador cae y la bloquea. Para ABRIR: boca abajo, y la tapa corre' });
        mec.push({ tipo: 'gravedad', e, x, y });
        break;
      }
      case 'cajon': {
        const aw = cajonAncho(C, p), ha = p.alto + 0.6, z1 = sf + ha, zs = A.zCajon;
        menosC.push(cubo(-aw / 2, aw / 2, -W / 2 - 1, -W / 2 + pr + 1, sf, z1));
        masC.push(marcoReborde(zs, 2.2, true));
        // el cajón: frente del grueso de la pared (enrasado), el cuerpo detrás; muesca para el dedo
        const fx = aw / 2 - hm, prof = WI - 1.2;
        let caj = cubo(-fx, fx, -W / 2, -W / 2 + pr, sf + hm, z1 - hm).add(cubo(-fx + 0.4, fx - 0.4, -W / 2 + pr - 0.01, -W / 2 + pr + prof, sf, z1 - 1));
        caj = caj.subtract(cubo(-fx + 2, fx - 2, -W / 2 + pr + 1.6, -W / 2 + pr + prof - 1.6, sf + 1.4, z1 + 1)).subtract(cilY(Math.min(9, ha * 0.45), -W / 2 - 1, -W / 2 + pr + 2, 0, z1 - hm));
        sueltas.push({ id: 'cajon:' + e.id, nombre: 'Cajón', m: caj, imprimir: N.aLaCama(caj), con: null, nota: 'de pie, abierto hacia arriba' });
        let est = prisma(LI - 2 * hm, WI - 2 * hm, Math.max(0.3, RI - hm), zs, zs + 2.4).subtract(cilZ(8, zs - 1, zs + 4, 0, WI / 2 - 14));
        sueltas.push({ id: 'estante:' + e.id, nombre: 'Estante (encima del cajón)', m: est, imprimir: N.aLaCama(est), con: null, nota: 'plano; se apoya en los rebordes' });
        mec.push({ tipo: 'cajon', e, caj, est, zs });
        break;
      }
      case 'bandeja': {
        const zb = A.zBandeja; masC.push(marcoReborde(zb, 2.2));
        const bx = LI - 2 * 0.5, by = WI - 2 * 0.5, g = 1.6;
        let b = prisma(bx, by, Math.max(0.3, RI - 0.5), zb, zb + p.prof).subtract(prisma(bx - 2 * g, by - 2 * g, Math.max(0.3, RI - 0.5 - g), zb + g, zb + p.prof + 1));
        for (let i = 1; i < p.cols; i++) { const x = -bx / 2 + i * bx / p.cols; b = b.add(cubo(x - 0.8, x + 0.8, -by / 2 + 1, by / 2 - 1, zb, zb + p.prof - 2)); }
        [-1, 1].forEach(s => { b = b.subtract(cilX(7, s > 0 ? bx / 2 - 3 : -bx / 2 - 1, s > 0 ? bx / 2 + 1 : -bx / 2 + 3, 0, zb + p.prof)); }); // para meter los dedos
        els.filter(g => g.tipo === 'gravedad').forEach(g => { b = b.subtract(cilZ(GRAV.RC + 2.2, zb - 1, zb + p.prof + 1, g.u, g.v)); });
        sueltas.push({ id: 'bandeja:' + e.id, nombre: 'Bandeja', m: b, imprimir: N.aLaCama(b), con: null, nota: 'de pie, abierta hacia arriba' });
        mec.push({ tipo: 'bandeja', e, b, zb });
        break;
      }
      case 'fondo': {
        const zf = A.zFondo; masC.push(marcoReborde(zf, 2.2));
        let f = prisma(LI - 2 * 0.3, WI - 2 * 0.3, Math.max(0.3, RI - 0.3), zf, zf + 2).subtract(cilZ(5.5, zf - 1, zf + 3, LI / 2 - 0.3, 0));
        els.filter(g => g.tipo === 'gravedad').forEach(g => { f = f.subtract(cilZ(GRAV.RC + 0.5, zf - 1, zf + 3, g.u, g.v)); }); // (y el paso de la columnita del cierre secreto)
        sueltas.push({ id: 'fondo:' + e.id, nombre: 'Fondo falso', m: f, imprimir: N.aLaCama(f), con: null, nota: 'plano; la muesca, hacia la derecha' });
        mec.push({ tipo: 'fondo', e, f, zf });
        break;
      }
      case 'rejilla': {
        const top = A.techo, z0 = A.piso, L2 = [];
        for (let i = 1; i < p.cols; i++) { const x = -LI / 2 + i * LI / p.cols; L2.push(cubo(x - 0.8, x + 0.8, -WI / 2 - 0.01, WI / 2 + 0.01, z0 - 0.01, top)); }
        for (let j = 1; j < p.filas; j++) { const y = -WI / 2 + j * WI / p.filas; L2.push(cubo(-LI / 2 - 0.01, LI / 2 + 0.01, y - 0.8, y + 0.8, z0 - 0.01, top)); }
        if (p.cuencos) { const cw = LI / p.cols, ch = WI / p.filas, rf = Math.min(6, cw / 3, ch / 3); for (let i = 0; i < p.cols; i++) for (let j = 0; j < p.filas; j++) { const cx = -LI / 2 + (i + 0.5) * cw, cy = -WI / 2 + (j + 0.5) * ch;
          L2.push(prisma(cw + 0.02, ch + 0.02, 0, z0 - 0.01, z0 + rf, cx, cy).subtract(M().hull([prisma(cw - 2 * rf, ch - 2 * rf, Math.max(0.3, rf * 0.6), z0 - 0.02, z0 - 0.01, cx, cy), prisma(cw + 0.1, ch + 0.1, 0, z0 + rf, z0 + rf + 0.01, cx, cy)]))); } }
        if (L2.length) masC.push(N.union(L2));
        break;
      }
      case 'cubetas': {
        const top = A.techo - 0.4, z0 = A.piso, gx = 0.6, cw = (LI - gx * (p.cols + 1)) / p.cols, ch = (WI - gx * (p.filas + 1)) / p.filas;
        for (let i = 0; i < p.cols; i++) for (let j = 0; j < p.filas; j++) {
          const cx = -LI / 2 + gx + cw / 2 + i * (cw + gx), cy = -WI / 2 + gx + ch / 2 + j * (ch + gx), r = Math.min(3, cw / 4, ch / 4);
          let c = prisma(cw, ch, r, z0, top, cx, cy).subtract(prisma(cw - 2.8, ch - 2.8, Math.max(0.3, r - 1.4), z0 + 1.2, top + 1, cx, cy)).subtract(cilY(Math.min(7, cw / 4), cy - ch / 2 - 1, cy - ch / 2 + 2, cx, top));
          sueltas.push({ id: 'cubeta' + i + '_' + j + ':' + e.id, nombre: 'Cubeta', m: c, imprimir: N.aLaCama(c), con: null, nota: 'abierta hacia arriba', cubeta: true });
        }
        mec.push({ tipo: 'cubetas', e });
        break;
      }
      case 'pilas': {
        const kinds = MEZCLAS[p.tipo] || ['aa'], hb = Math.min(24, Math.max(12, 0.45 * Math.min(...kinds.map(altoPila)))), z0 = A.piso;
        let s = prisma(LI + 0.02, WI + 0.02, RI, z0 - 0.01, z0 + hb); const hs = [];
        pilasHuecos(C, p).forEach(h0 => { const P = PILAS[h0.k];
          if (h0.k === '9v') hs.push(cubo(h0.x - (P.a + 0.8) / 2, h0.x + (P.a + 0.8) / 2, h0.y - (P.b + 0.8) / 2, h0.y + (P.b + 0.8) / 2, z0 + 1.2, z0 + hb + 1));
          else if (h0.k === 'cr2032') hs.push(cubo(h0.x - (P.g + 0.6) / 2, h0.x + (P.g + 0.6) / 2, h0.y - (P.d + 0.8) / 2, h0.y + (P.d + 0.8) / 2, z0 + hb - 12, z0 + hb + 1));
          else hs.push(cilZ((P.d + 0.8) / 2, z0 + 1.2, z0 + hb + 1, h0.x, h0.y)); });
        if (hs.length) s = s.subtract(N.union(hs));
        masC.push(s);
        break;
      }
      case 'ventila': {
        const w = p.ancho, hh = p.alto, n = Math.max(1, Math.floor((w + 2.5) / 4.5)), x0 = e.u - ((n - 1) * 4.5) / 2, L2 = [];
        for (let i = 0; i < n; i++) L2.push(cubo(x0 + i * 4.5 - 1, x0 + i * 4.5 + 1, -1, pr + 1, e.v - hh / 2, e.v + hh / 2));
        menosC.push(enF(N.union(L2), e.cara));
        break;
      }
      case 'colgar': {
        const sep = p.sep > 0 ? p.sep : C.L / 2, v = C.H * 0.62, L2 = [], L3 = [];
        [-sep / 2, sep / 2].forEach(u => {
          L2.push(cubo(u - 9, u + 9, pr - 0.01, pr + 5, v - 8, v + 16).intersect(M().hull([cubo(u - 9, u + 9, pr - 0.01, pr + 5, v - 8 + 5, v + 16), cubo(u - 9, u + 9, pr - 0.01, pr + 0.01, v - 8, v + 16)])));
          L3.push(cilY(4.6, -1, pr + 3.2, u, v), cubo(u - 2.3, u + 2.3, -1, pr + 1, v, v + 9), cubo(u - 4.7, u + 4.7, pr - 0.01, pr + 3.2, v, v + 9)); // la cabeza entra por el círculo y baja por el canal
        });
        masC.push(enF(N.union(L2), e.cara)); menosC.push(enF(N.union(L3), e.cara));
        break;
      }
      case 'texto': {
        const T = texto(p.txt, p.alto, 0.7); if (T) menosT.push(T.translate([e.u, e.v, H + tg - 0.6])); // (grabado: la tapa se imprime boca abajo, plana)

        break;
      }
    }
  });
}

// ======================= LA TAPA CORREDERA (para el cierre secreto, y porque queda muy limpia) =======================
// Las paredes suben hasta arriba y la tapa va METIDA: corre por unas ranuras en cola de milano (más ancha abajo: no se levanta) y
// sale por la derecha. Ranura con 0,25 de aire; los labios de las ranuras, a 45° (sin soportes).
export function tapaCorredera(X) {
  const { L, W, H, pr, tg, LI, WI } = X, c = 0.25, d = Math.min(1.5, pr - 1.2);
  const forma = cl => {
    const yB = WI / 2 + d + cl, yT = WI / 2 + cl, xI = -LI / 2 - d - cl, xIt = -LI / 2 - cl, xD = L / 2 + 5;
    const base = cubo(xI, xD, -yB, yB, H - cl, H + 0.01), arriba = cubo(xIt, xD, -yT, yT, H + d + cl, H + d + cl + 0.01);
    return M().hull([base, arriba]).add(cubo(xIt, xD, -yT, yT, H + d, H + tg + (cl ? 5 : 0)));
  };
  let tapa = forma(0).intersect(cubo(-L, L / 2, -W, W, H, H + tg));
  // la ranura para el dedo, cerca de la salida
  tapa = tapa.subtract(cilY(4, -WI / 2 + 6, WI / 2 - 6, L / 2 - 12, H + tg + 2.6));
  const corte = forma(c).add(cubo(L / 2 - pr - 1, L / 2 + 5, -WI / 2 - d - c, WI / 2 + d + c, H - c, H + tg + 5)); // (y la pared de la derecha, abierta por arriba)
  return { tapa, corte };
}

// ======================= ESTILOS =======================
export function aplicaEstilo(X, cuerpo, tapa) {
  const { C, L, W, H, tg, R } = X, st = C.estilo || 'lisa';
  if (st === 'acanalada') { const L2 = [], paso = 6, rr2 = 1.3; const pon = (cara) => { const F = X.marco(C, cara), uso = F.hw - R - 3; for (let u = -uso; u <= uso + 0.01; u += paso) L2.push(X.enCara(cilZ(rr2, 4, H - 4, u, -rr2 + 0.7), F)); };
    ['frente', 'atras', 'izq', 'der'].forEach(pon); if (L2.length) cuerpo = cuerpo.subtract(N.union(L2)); }
  if (st === 'biselada') { const b = 1.2, corta = (m, z, arriba) => { const anillo = prisma(L + 4, W + 4, R + 2, arriba ? z - b : z, arriba ? z + 0.01 : z + b).subtract(M().hull([prisma(L, W, R, arriba ? z - b - 0.01 : z + b, arriba ? z - b : z + b + 0.01), prisma(L - 2 * b, W - 2 * b, Math.max(0.3, R - b), arriba ? z : z - 0.01, arriba ? z + 0.01 : z)])); return m.subtract(anillo); };
    cuerpo = corta(cuerpo, 0, false); if (C.tapa === 'corredera') cuerpo = corta(cuerpo, H + tg, true); else tapa = corta(tapa, H + tg, true); }
  if (st === 'hexagonal' && C.tapa !== 'corredera') { // panal: hexágonos de 6 mm entre caras y 1,2 de pared, hundidos 0,6
    const a = 6, p = a + 1.2, dy = p * Math.sqrt(3) / 2, hx = N.cs([N.poligono2(6, a / Math.cos(Math.PI / 6), 90)], 'Positive'), L2 = [];
    for (let j = -60; j <= 60; j++) { const yy = j * dy; if (Math.abs(yy) > W / 2 - R - 5) continue; for (let i = -60; i <= 60; i++) { const xx = i * p + (j % 2 ? p / 2 : 0); if (Math.abs(xx) > L / 2 - R - 5) continue; L2.push(hx.translate([xx, yy])); } }
    // (14-10: se graban las RAYAS del panal, 1,2 mm, y no los hexágonos: la tapa se imprime boca abajo y un hueco de 6 mm quedaba en el aire)
    if (L2.length) tapa = tapa.subtract(N.csUnion(L2.map(s => s.offset(0.6, 'Miter', 2).subtract(s))).extrude(0.7).translate([0, 0, H + tg - 0.6])); }
  // 14-10 tarde · estilos nuevos: todo GRABADO (0,5 mm) o en relieve en las paredes de pie (se imprime sin soportes); en la tapa, solo grabado
  // (la tapa se imprime boca abajo: un relieve encima la dejaría coja en la cama)
  const ranura = (cara, cosas) => { const F = X.marco(C, cara), uso = F.hw - R - 2.5; return cosas(F, uso).map(m => X.enCara(m, F)); };
  const lineasCara = (cara, ang, paso, ancho, z0, z1) => ranura(cara, (F, uso) => { const L2 = [], a = ang * Math.PI / 180, lar = 2 * (uso + H);
    const zona = cubo(-uso, uso, -1, 0.5, z0, z1), dz = Math.abs(Math.cos(a)) > 0.2 ? paso / Math.abs(Math.cos(a)) : paso;
    if (Math.abs(Math.cos(a)) < 0.2) { for (let x = -uso + paso / 2; x < uso; x += paso) L2.push(cubo(x - ancho / 2, x + ancho / 2, -1, 0.5, z0, z1)); }
    else for (let c = -lar; c <= lar; c += dz) L2.push(cubo(-lar, lar, -1, 0.5, -ancho / 2, ancho / 2).rotate([0, ang, 0]).translate([0, 0, c]));
    return L2.length ? [N.union(L2).intersect(zona)] : []; });
  const lineasTapa = (ang, paso, ancho) => { const a = ang * Math.PI / 180, lx = L / 2 - R - 4, ly = W / 2 - R - 4, lar = 2 * (L + W), L2 = [], dy = Math.abs(Math.cos(a)) > 0.2 ? paso / Math.abs(Math.cos(a)) : paso;
    if (Math.abs(Math.cos(a)) < 0.2) for (let x = -lx + paso / 2; x < lx; x += paso) L2.push(cubo(x - ancho / 2, x + ancho / 2, -ly, ly, H + tg - 0.5, H + tg + 1));
    else for (let c = -lar; c <= lar; c += dy) L2.push(cubo(-lar, lar, -ancho / 2, ancho / 2, H + tg - 0.5, H + tg + 1).rotate([0, 0, ang]).translate([0, c, 0]));
    return L2.length ? N.union(L2).intersect(cubo(-lx, lx, -ly, ly, H, H + tg + 2)) : null; };
  const marcoTapa = (ins, ancho) => prisma(L - 2 * ins, W - 2 * ins, Math.max(0.3, R - ins), H + tg - 0.5, H + tg + 1).subtract(prisma(L - 2 * ins - 2 * ancho, W - 2 * ins - 2 * ancho, Math.max(0.3, R - ins - ancho), H + tg - 1, H + tg + 2));
  const corr = C.tapa === 'corredera', quitaT = m => { if (m && !corr) tapa = tapa.subtract(m); };
  if (st === 'libro') { const L2 = []; ['frente', 'izq', 'der'].forEach(c => L2.push(...lineasCara(c, 0, 1.8, 0.6, 2.5, H - 1.5))); if (L2.length) cuerpo = cuerpo.subtract(N.union(L2)); quitaT(marcoTapa(5, 0.9)); quitaT(marcoTapa(8, 0.6)); }
  if (st === 'tablas') { const L2 = []; ['frente', 'atras', 'izq', 'der'].forEach(c => L2.push(...lineasCara(c, 0, 11, 0.8, 3, H - 2))); if (L2.length) cuerpo = cuerpo.subtract(N.union(L2)); quitaT(lineasTapa(90, 12, 0.8)); }
  if (st === 'rombos') { const L2 = []; ['frente', 'atras', 'izq', 'der'].forEach(c => { L2.push(...lineasCara(c, 45, 12, 0.8, 3, H - 3)); L2.push(...lineasCara(c, -45, 12, 0.8, 3, H - 3)); }); if (L2.length) cuerpo = cuerpo.subtract(N.union(L2)); quitaT(lineasTapa(45, 12, 0.8)); quitaT(lineasTapa(-45, 12, 0.8)); quitaT(marcoTapa(4, 0.8)); }
  if (st === 'cofre') { const L2 = []; const banda = (cara, u, w) => { const F = X.marco(C, cara); L2.push(X.enCara(cubo(u - w / 2, u + w / 2, -1.2, 0.01, 0, H - 0.4), F)); };
    [-1, 1].forEach(s => { banda('frente', s * L * 0.3, 9); banda('izq', s * W * 0.25, 8); banda('der', s * W * 0.25, 8); });
    cuerpo = cuerpo.add(N.union(L2)); // (bandas en relieve en las paredes: de pie se imprimen solas)
    [-1, 1].forEach(s => { const x = s * L * 0.3; quitaT(cubo(x - 5, x - 4.2, -W, W, H + tg - 0.5, H + tg + 1).add(cubo(x + 4.2, x + 5, -W, W, H + tg - 0.5, H + tg + 1)).intersect(prisma(L - 2, W - 2, Math.max(0.3, R - 1), H, H + tg + 2))); });
    quitaT(marcoTapa(3, 0.8)); }
  // PATAS (14-10 tarde): eran 3 mm pegados debajo y todo el suelo quedaba EN EL AIRE al imprimir (ningún puente aguanta 150 mm).
  // Ahora son 4 piezas sueltas (Ø10 × 3 con un tetón de Ø4) que se encajan a presión en 4 agujeros del suelo: la caja se imprime plana.
  let patas = [];
  if (C.pies) { const ix = L / 2 - Math.max(R, 4) - 6, iy = W / 2 - Math.max(R, 4) - 6, hondo = Math.max(0.8, Math.min(1.6, (C.suelo || 2.4) - 0.8)), hoyos = [];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { hoyos.push(cilZ(2 + ENCAJES.presion, -0.01, hondo, a * ix, b * iy)); patas.push(M().hull([cilZ(5, -2.99, -0.01, a * ix, b * iy), cilZ(4, -3, -2.99, a * ix, b * iy)]).add(cilZ(2, -0.02, hondo - 0.2, a * ix, b * iy))); });
    cuerpo = cuerpo.subtract(N.union(hoyos)); }
  return { cuerpo, tapa, patas };
}

// ======================= 🧪 COMPROBAR los mecanismos (se monta en el ordenador) =======================
// G = construye(C) · aMundoMov(F, d) = matriz para mover «d» a lo largo de la cara · → [{ ok, t, d }]
export function compruebaPro(C, G, ayuda) {
  const out = [], { toque, abreTapa, enCara } = ayuda;
  const ok = (t, d) => out.push({ ok: true, t, d }), mal = (t, d) => out.push({ ok: false, t, d });
  (G.mec || []).forEach(Mc => {
    try {
      if (Mc.tipo === 'combinacion') {
        const Q = Mc.Q, e = Mc.e, F = Mc.F, ruedas = Q.cs.map((c, k) => enCara(combRueda(C, e, k, Q.code[k], false), F)), fijo = N.union([G.cuerpo].concat(ruedas));
        let sale = true, donde = 0; for (let d = 0.5; d <= COMB.SALE + 0.01; d += 0.5) { if (toque(enCara(combPestillo(C, e, d), F), fijo) > 0.05) { sale = false; donde = d; break; } }
        if (sale) ok('Con la combinación ' + Q.code + ', el pestillo sale ' + COMB.SALE + ' mm sin tocar nada', 'Montado en el ordenador: el pestillo se saca de medio en medio milímetro entre las ruedas y las orejetas.'); else mal('Con la combinación buena, el pestillo se traba a ' + donde + ' mm', 'Algo se pisa: revisa el tamaño de la caja.');
        let bloquea = 0; Q.cs.forEach((c, k) => { const mal1 = Q.code.split('').map((x, i) => (i === k ? String((Number(x) + 1) % 10) : x)); const R2 = Q.cs.map((cc, i) => enCara(combRueda(C, e, i, Q.code[i], false).translate([0, 0, 0]), F)); void R2;
          const rk = Q.cs.map((cc, i) => enCara(i === k ? combRueda(C, e, i, mal1[i], false) : combRueda(C, e, i, Q.code[i], false), F)); if (toque(enCara(combPestillo(C, e, 1.5), F), N.union(rk)) > 0.05) bloquea++; });
        if (bloquea === Q.n) ok('Con UNA cifra mal (en cualquier rueda), el pestillo no sale', 'Comprobado rueda por rueda: con la cifra de al lado, su pestaña choca. Hay ' + Math.pow(10, Q.n).toLocaleString('es-ES') + ' combinaciones.'); else mal('Con una cifra mal, el pestillo sale en ' + (Q.n - bloquea) + ' rueda(s)', 'La ranura es demasiado ancha.');
        const pest = enCara(combPestillo(C, e, 0), F), a0 = abreTapa([pest]), a1 = abreTapa([enCara(combPestillo(C, e, COMB.SALE), F)]);
        if (a0 <= 5) ok('Cerrada con el pestillo, la tapa no se abre', 'La orejeta de la tapa topa con el pestillo.'); else mal('Con el pestillo puesto, la tapa se abre ' + a0 + '°', '');
        if (a1 >= 90 || a1 === -1) ok('Con el pestillo fuera, la tapa se abre', a1 === -1 ? 'Tapa a presión: se quita.' : 'Hasta ' + a1 + '°.'); else mal('Con el pestillo fuera, la tapa solo se abre ' + a1 + '°', 'Algo choca con la orejeta de la tapa.');
      }
      if (Mc.tipo === 'llave') {
        const e = Mc.e, F = Mc.F, Q = Mc.Q, lc = enCara(llaveLeva(C, e, true), F), la = enCara(llaveLeva(C, e, false), F), bo = enCara(llaveBombin(C, e), F);
        const vB = toque(bo, G.cuerpo), vL = toque(lc, G.cuerpo) + toque(la, G.cuerpo);
        if (vB < 0.05 && vL < 0.05) ok('El bombín gira en su agujero y la leva no roza la caja', 'Con 0,3 mm de aire.'); else mal('El bombín o la leva rozan la caja', (vB + vL).toFixed(2) + ' mm³.');
        const vT = toque(G.tapa, lc) + toque(G.tapa, la) + toque(G.tapa, bo);
        if (vT < 0.05) ok('Cerrada, el gancho de la tapa queda debajo de la cuña sin tocarla', 'Con ' + n1(LLAVE.HOL) + ' mm de aire.'); else mal('Cerrada, el gancho de la tapa se pisa con la leva', vT.toFixed(2) + ' mm³.');
        let roza = 0, donde = 0; for (let a = 10; a < 90; a += 10) { const lm = enCara(llaveLeva(C, e, true, a), F), v = toque(lm, G.cuerpo) + toque(lm, G.tapa); if (v > 0.05 && !donde) donde = a; roza += v; }
        if (roza < 0.05) ok('Con la tapa cerrada, la llave gira de «cerrado» a «abierto» sin rozar', 'Comprobado de 10 en 10 grados: la cuña pasa por debajo del eje sin tocar el gancho.'); else mal('Al girar la llave, la cuña roza a los ' + donde + '°', roza.toFixed(2) + ' mm³.');
        const a0 = abreTapa([lc, bo]), a1 = abreTapa([la, bo]);
        if (a0 <= 5) ok('Con la llave de pie («cerrado»), la tapa no se abre', 'El diente empuja el borde redondo de la cuña: el empuje pasa por el eje y no la hace girar.'); else mal('Con la llave en «cerrado», la tapa se abre ' + a0 + '°', '');
        if (a1 >= 90 || a1 === -1) ok('Con la llave tumbada («abierto»), la tapa se abre', a1 === -1 ? '' : 'Hasta ' + a1 + '°, sin que el gancho roce la pared.'); else mal('Con la llave en «abierto», la tapa solo se abre ' + a1 + '°', 'El gancho roza al abrir.');
        const metida = cod => enCara(llaveMetida(C, e, cod), F), i0 = Q.codigo.search(/[CL]/), otro = i0 < 0 ? 'LLL' : Q.codigo.slice(0, i0) + 'N' + Q.codigo.slice(i0 + 1);
        const vk = toque(metida(Q.codigo), bo), vo = toque(metida(otro), bo);
        if (vk < 0.05 && vo > 0.05) ok('Su llave entra y otra no', 'Una llave con otro código (' + otro + ') choca con la ranura.'); else mal('La llave no casa con su bombín', vk.toFixed(2) + ' / ' + vo.toFixed(2) + ' mm³.');
      }
      if (Mc.tipo === 'gravedad') {
        const pin = G.sueltas.find(s => s.id === 'pasador:' + Mc.e.id).m, tapa = G.tapa, corre = d => tapa.translate([d, 0, 0]);
        let bloquea = false; for (let d = 0.5; d <= 3; d += 0.5) if (toque(corre(d), pin) > 0.05) { bloquea = true; break; }
        const pinArriba = pin.translate([0, 0, GRAV.HOYO + 0.8 + 0.3]), fijo = G.cuerpo; let libre = true; const conPin = N.union([tapa, pinArriba]);
        for (let d = 2; d <= C.L + 6; d += 4) { if (toque(conPin.translate([d, 0, 0]), fijo) > 0.05) { libre = false; break; } }
        const vPin = toque(pinArriba, tapa);
        if (bloquea) ok('De pie, el pasador cae y la tapa no corre', 'Queda a medias entre la columnita y la tapa.'); else mal('De pie, la tapa corre aunque esté el pasador', '');
        if (libre && vPin < 0.05) ok('Boca abajo, el pasador se mete en la tapa y la tapa sale entera', 'Corre ' + Math.round(C.L) + ' mm sin tocar nada.'); else mal('Boca abajo, la tapa no sale', '');
      }
      if (Mc.tipo === 'cajon') {
        let libre = true; for (let d = 2; d <= C.W; d += 4) if (toque(Mc.caj.translate([0, -d, 0]), G.cuerpo) > 0.05) { libre = false; break; }
        const v0 = toque(Mc.caj, G.cuerpo) + toque(Mc.caj, Mc.est), vE = toque(Mc.est, G.cuerpo), apoya = toque(Mc.est.translate([0, 0, -0.5]), G.cuerpo) > 0.5;
        if (v0 < 0.05 && libre) ok('El cajón entra y sale entero sin rozar', 'Con ' + HOLGURA_MOVIL + ' mm de aire.'); else mal('El cajón roza', '');
        if (vE < 0.05 && apoya) ok('El estante apoya en sus rebordes', ''); else mal('El estante no apoya bien', '');
      }
      if (Mc.tipo === 'bandeja' || Mc.tipo === 'fondo') {
        const pz = Mc.tipo === 'bandeja' ? Mc.b : Mc.f, v0 = toque(pz, G.cuerpo), apoya = toque(pz.translate([0, 0, -0.5]), G.cuerpo) > 0.5;
        const tapaC = G.tapa, vT = Mc.tipo === 'bandeja' ? toque(pz, tapaC) : 0;
        if (v0 < 0.05 && apoya && vT < 0.05) ok(Mc.tipo === 'bandeja' ? 'La bandeja apoya en sus rebordes y la tapa cierra encima' : 'El fondo falso apoya en sus rebordes', ''); else mal(Mc.tipo === 'bandeja' ? 'La bandeja no apoya o choca con la tapa' : 'El fondo falso no apoya', '');
      }
      if (Mc.tipo === 'cubetas') {
        const L2 = G.sueltas.filter(s => s.cubeta).map(s => s.m); let v = 0; L2.forEach((a, i) => { v += toque(a, G.cuerpo) + toque(a, G.tapa); for (let j = i + 1; j < L2.length; j++) v += toque(a, L2[j]); });
        if (v < 0.05) ok(L2.length + ' cubetas caben sin rozar y la tapa cierra', 'Con 0,6 mm entre ellas.'); else mal('Las cubetas rozan', v.toFixed(2) + ' mm³.');
      }
    } catch (x) { mal('No he podido comprobar ' + (TIPOS_PRO[Mc.tipo] ? TIPOS_PRO[Mc.tipo].t.toLowerCase() : Mc.tipo), x.message || String(x)); }
  });
  return out;
}
