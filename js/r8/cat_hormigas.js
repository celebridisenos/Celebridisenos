// ================= 18-10-2026 · 🐜 HORMIGUEROS: la casa de las hormigas (nido en torre + zona de comida conectada) =================
// Ella: «quiero una casa de hormigas para que vivan adaptadas, tiene que ser más a lo alto con túneles para que puedan hacer vida, y una
// segunda parte quizás conectada donde dejar nosotros comida de vez en cuando; tiene que hacer uno grande, otro premium, kits de diferentes
// tamaños; que sea seguro también y decir para qué sirve».
// Cómo es (diseño propio, como los «formicarios» de los aficionados):
//  · el NIDO, en MÓDULOS que se apilan hacia arriba: cada uno es una losa con cámaras y túneles (distintos en cada módulo, con más
//    túneles en vertical, como excavan ellas) y un CRISTAL delante para verlas. El cristal es el de un MARCO DE FOTOS de 10×15 o 13×18
//    (0 €): entra deslizando por arriba en una ranura con labios a 45° (se imprime sin soportes) y la tapa de arriba lo deja preso;
//  · los módulos se comunican por dentro (el túnel de arriba de uno con el de abajo del siguiente, a través de la TAPA) y se alinean con
//    dos PASADORES; la tapa de arriba del todo lleva una oreja para ATARLA A LA PARED (que la torre no se vuelque);
//  · la ZONA DE COMIDA (forrajeo): caja con labio ANTIFUGA a 45° por dentro del borde, tapa a presión con REJILLA de ventilación impresa
//    (aberturas de 0,5 mm) y TRAMPILLA con tapón para echar la comida sin abrir; dentro, COMEDERO y BEBEDERO. Se une al nido con un TUBO
//    cuadrado que encaja «justo» en las boquillas de los dos lados (nada de holguras por donde salir);
//  · el DEPÓSITO DE HUMEDAD: agua detrás de un tapón de ALGODÓN (como el tubo de ensayo de los aficionados): el algodón deja pasar la
//    humedad y no deja pasar ni el agua ni a las hormigas.
// Marco del MÓDULO (para imprimir): x a lo ancho, y a lo alto (de pie), z = grosor (la espalda en la cama, el cristal arriba).
// En el montaje (de pie): X a lo ancho, Z arriba, el cristal mirando a −Y.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, tx, M, CS, circ, rr, poli, cil, caja, n2 } = A;
const PRES = 0.05, JUSTO = 0.1; // sus holguras (por lado): a presión · justo
// ---------- tamaños de hormiga: túnel, profundidad de las cámaras y su tamaño (los aficionados: 1,5–2 veces la hormiga) ----------
export const TAM = {
  pequena: { w: 4, prof: 4.5, cam: [6, 11], t: 'Pequeñas (Lasius, Tetramorium, Pheidole: 2–5 mm)' },
  mediana: { w: 6, prof: 6.5, cam: [8, 15], t: 'Medianas (Messor, Formica: 4–9 mm)' },
  grande: { w: 8, prof: 9, cam: [11, 19], t: 'Grandes (Camponotus: 7–15 mm)' }
};
export const CRISTALES = { marco10x15: { cw: 100, ch: 150, ce: 2, t: 'De un marco de fotos de 10×15 (100 × 150 × 2 mm)' }, marco13x18: { cw: 130, ch: 180, ce: 2, t: 'De un marco de 13×18 (130 × 180 × 2 mm)' }, medida: { t: 'A mi medida (escribe abajo)' } };
export const KITS = {
  inicio: { t: 'Kit INICIO: 1 módulo + zona de comida pequeña', mod: 1, forr: [110, 80, 50], cristal: 'marco10x15', dep: true },
  grande: { t: 'Kit GRANDE: torre de 3 módulos + zona de comida grande', mod: 3, forr: [160, 115, 60], cristal: 'marco10x15', dep: true },
  premium: { t: 'Kit PREMIUM: torre de 3 módulos 13×18, tejado con nombre, comedero y bebedero', mod: 3, forr: [165, 120, 65], cristal: 'marco13x18', dep: true, premium: true },
  modulo: { t: 'Módulo suelto (para AMPLIAR la torre)', mod: 1, forr: null, cristal: 'marco10x15', dep: false, suelto: true },
  prueba: { t: '🧪 Prueba de encaje (cristal, boquilla, tubo y rejilla: pocos gramos)', mod: 0, forr: null, cristal: 'marco10x15', dep: false }
};

// ---------- utilidades ----------
const azar = sem => { let x = (Math.round(sem) * 2654435761) >>> 0 || 7; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const disco = (q, d) => circ(d).translate([q[0], q[1]]);
const tubo2 = (a, b, w) => CS().hull([disco(a, w), disco(b, w)]);
const rect = (x0, x1, y0, y1) => rr(x1 - x0, y1 - y0).translate([(x0 + x1) / 2, (y0 + y1) / 2]);
const bloque = (x0, x1, y0, y1, z0, z1) => caja(x1 - x0, y1 - y0, z1 - z0).translate([(x0 + x1) / 2, (y0 + y1) / 2, z0]);
// un perfil (x, v) estirado a lo largo de Y, de y0 a y1 (v → z)
const prismaY = (cs, y0, y1) => cs.extrude(y1 - y0).rotate([90, 0, 0]).translate([0, y1, 0]);
// un perfil (u, v) estirado a lo largo de X, de x0 a x1 (u → y, v → z)
const prismaX = (cs, x0, x1) => cs.extrude(x1 - x0).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([x0, 0, 0]);
// agujero en GOTA (para pasadores tumbados: la punta hacia arriba, se imprime sin soportes)
const gota = (d, cx, cz) => CS().hull([disco([cx, cz], d), disco([cx, cz + d / 2 * Math.SQRT2], 0.05)]);

// ---------- las GALERÍAS de un módulo: cámaras (óvalos aplanados) y túneles, todo unido ----------
// o = { x0, x1, y0, y1, w, cam: [rmin, rmax], fijos: [[x, y]], semilla } → { cs, camaras, tuneles }
export function galerias(o) {
  const R = azar(o.semilla), w = o.w, sep = Math.max(2.6, 0.6 * w) + w; // (entre cámara y cámara, pared de 2,6 mm como poco)
  const nodos = o.fijos.map(p => ({ x: p[0], y: p[1], rx: w * 1.1, ry: w * 0.9, fijo: true }));
  const area = (o.x1 - o.x0) * (o.y1 - o.y0), objetivo = nodos.length + Math.max(3, Math.round(area / (o.cam[1] * o.cam[1] * 9)));
  for (let t = 0; t < 6000 && nodos.length < objetivo; t++) {
    const rx = o.cam[0] + (o.cam[1] - o.cam[0]) * R(), ry = Math.max(w * 0.75, rx * (0.4 + 0.2 * R())), x = o.x0 + rx + R() * (o.x1 - o.x0 - 2 * rx), y = o.y0 + ry + R() * (o.y1 - o.y0 - 2 * ry);
    if (nodos.every(q => Math.abs(q.x - x) > q.rx + rx + sep || Math.abs(q.y - y) > q.ry + ry + sep)) nodos.push({ x, y, rx, ry });
  }
  // túneles: el árbol más corto (subir cuesta menos: así salen más túneles en vertical, como los que excavan ellas) y algún atajo
  const d = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 0.62), corta = (a, b, L) => L.some(([p, q]) => { if (p === a || p === b || q === a || q === b) return false; const A2 = nodos[a], B2 = nodos[b], C2 = nodos[p], D2 = nodos[q], cr = (u, v, k) => (v.x - u.x) * (k.y - u.y) - (v.y - u.y) * (k.x - u.x); return cr(A2, B2, C2) * cr(A2, B2, D2) < 0 && cr(C2, D2, A2) * cr(C2, D2, B2) < 0; });
  const pasaCerca = (a, b) => nodos.some((c, i) => { if (i === a || i === b) return false; const A2 = nodos[a], B2 = nodos[b], vx = B2.x - A2.x, vy = B2.y - A2.y, L2 = vx * vx + vy * vy, t = Math.max(0, Math.min(1, ((c.x - A2.x) * vx + (c.y - A2.y) * vy) / L2)); return Math.hypot(A2.x + t * vx - c.x, A2.y + t * vy - c.y) < Math.max(c.rx, c.ry) + w; });
  const enArbol = new Set([0]), aristas = [];
  while (enArbol.size < nodos.length) { let mejor = null; for (const i of enArbol) for (let j = 0; j < nodos.length; j++) { if (enArbol.has(j)) continue; const c = d(nodos[i], nodos[j]) * (pasaCerca(i, j) ? 3 : 1); if (!mejor || c < mejor[2]) mejor = [i, j, c]; } aristas.push([mejor[0], mejor[1]]); enArbol.add(mejor[1]); }
  nodos.forEach((q, i) => { if (R() > 0.4) return; let mejor = null; nodos.forEach((p, j) => { if (j === i || aristas.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) return; const c = d(q, p); if ((!mejor || c < mejor[1]) && !corta(i, j, aristas) && !pasaCerca(i, j)) mejor = [j, c]; }); if (mejor && mejor[1] < o.cam[1] * 5) aristas.push([i, mejor[0]]); });
  const tun = aristas.map(([a, b]) => { const A2 = nodos[a], B2 = nodos[b], m = [(A2.x + B2.x) / 2, (A2.y + B2.y) / 2], L = Math.hypot(B2.x - A2.x, B2.y - A2.y), nx = -(B2.y - A2.y) / (L || 1), ny = (B2.x - A2.x) / (L || 1), k = (R() - 0.5) * 0.35 * L;
    const M2 = [Math.max(o.x0 + w, Math.min(o.x1 - w, m[0] + nx * k)), Math.max(o.y0 + w, Math.min(o.y1 - w, m[1] + ny * k))]; return N.csUnion([tubo2([A2.x, A2.y], M2, w), tubo2(M2, [B2.x, B2.y], w)]); });
  const cams = nodos.map(q => poli(N.elipse2(2 * q.rx, 2 * q.ry, 48)).translate([q.x, q.y]));
  // (un túnel que pasa rozando otra cámara dejaba entre los dos una pared de centésimas de milímetro, imposible de imprimir: se «funden»
  //  con un cierre de 0,4 mm, así lo que casi se toca se une)
  const cs = N.csUnion(cams.concat(tun)).offset(0.4, 'Round', 2, 24).offset(-0.4, 'Round', 2, 24).intersect(rect(o.x0, o.x1, o.y0, o.y1));
  return { cs, camaras: nodos.length - o.fijos.length, tuneles: aristas.length, nodos };
}

// ---------- las MEDIDAS de todo (lo comparten las piezas, el montaje y las pruebas) ----------
export function medidas(p) {
  const K = KITS[p.kit] || KITS.inicio, Ht = TAM[p.hormiga] || TAM.pequena, cr = p.cristal === 'medida' ? { cw: p.cw, ch: p.ch, ce: p.ce } : CRISTALES[!p.cristal || p.cristal === 'kit' ? K.cristal : p.cristal] || CRISTALES.marco10x15; // («el del kit»: 10×15; el premium, 13×18)
  const { w, prof } = Ht, cw = cr.cw, ch = cr.ch, ce = cr.ce, holX = 0.4, holZ = 0.3, mb = 7, bw = 7, zP = 2.4, zG = zP + prof, zG1 = zG + ce + holZ, T = zG1 + 2, a0 = cw / 2 + holX;
  const W = cw + 2 * holX + 2 * mb, Hm = bw + ch, B = Math.max(w, prof) + 6, Lb = 18, /* (boquillas de 18: salvan el borde de la peana y entran 8 en el depósito; con 10, el depósito se metía en la peana) */ yS = bw + 8 + w / 2, tc = 4, pin = 4, xPin = a0 + mb / 2, zPin = T / 2;
  const nMod = p.kit === 'grande' || p.kit === 'premium' ? Math.max(1, Math.min(4, Math.round(p.modulos || K.mod))) : K.mod, zb = 4; // (el campo «módulos» solo manda en el grande y el premium) // (el módulo de abajo, 4 mm por encima de la mesa: va metido en la peana)
  return { K, Ht, w, prof, cw, ch, ce, holX, holZ, mb, bw, zP, zG, zG1, T, a0, W, Hm, B, Lb, yS, tc, pin, xPin, zPin, nMod, zb, hC: zb + yS, forr: K.forr, alto: zb + nMod * Hm + nMod * tc };
}

// ---------- un MÓDULO del nido ----------
// o = { abajo, arriba, izq (a la zona de comida), der (al depósito), semilla }
export function modulo(Q, o) {
  const { w, prof, cw, bw, zP, zG, zG1, T, a0, W, Hm, B, Lb, yS, pin, xPin, zPin } = Q;
  let m = rr(W, Hm, 4).translate([0, Hm / 2]).extrude(T);
  // la RANURA del cristal (entra por arriba) y la VENTANA con labios a 45° (los cuatro lados menos el de arriba)
  const ranura = bloque(-a0, a0, bw, Hm + 1, zG, zG1 + 0.05); // (0,05 por encima del arranque de la ventana: si se tocan justo, queda una lámina sin grosor que tapa el nido)
  const L = T + 1 - zG1, vX = poli([[-a0, zG1], [a0, zG1], [a0 - L, T + 1], [-(a0 - L), T + 1]]), vY = poli([[bw, zG1], [Hm + 1, zG1], [Hm + 1, T + 1], [bw + L, T + 1]]);
  const ventana = prismaY(vX, bw - 1, Hm + 1).intersect(prismaX(vY, -a0 - 1, a0 + 1));
  m = m.subtract(ranura).subtract(ventana);
  // las GALERÍAS (detrás del cristal), con sus puertas: arriba y abajo en el centro; a los lados, abajo
  const x0 = -cw / 2 + 2.5, x1 = cw / 2 - 2.5, y0 = bw + 2.5, y1 = Hm - 2.5, fijos = [];
  if (o.arriba) fijos.push([0, y1 - w]); if (o.abajo) fijos.push([0, y0 + w]); if (o.izq) fijos.push([x0 + w, yS]); if (o.der) fijos.push([x1 - w, yS]);
  if (!fijos.length) fijos.push([0, (y0 + y1) / 2]);
  const G = galerias({ x0, x1, y0, y1, w, cam: Q.Ht.cam, fijos, semilla: o.semilla || 1 });
  const canal = [];
  if (o.arriba) canal.push(rect(-w / 2, w / 2, y1 - w, Hm + 1)); // (por debajo del cristal: el cristal llega hasta arriba)
  m = m.subtract(N.csUnion([G.cs].concat(canal)).extrude(prof + 0.01).translate([0, 0, zP]));
  // por debajo del cristal no hay cristal: el túnel de abajo y los de los lados van CERRADOS por encima (un puente de w mm)
  if (o.abajo) m = m.subtract(bloque(-w / 2, w / 2, -1, y0 + 2 * w, zP, zG + 0.01)); // (se mete en la cámara de la puerta: si acaban justo, queda una lámina)
  [['izq', -1], ['der', 1]].forEach(([k, sg]) => { if (!o[k]) return;
    m = m.add(bloque(sg > 0 ? W / 2 - 0.01 : -W / 2 - Lb, sg > 0 ? W / 2 + Lb : -W / 2 + 0.01, yS - B / 2, yS + B / 2, 0, B)); // la BOQUILLA (cuadrada, apoya en la cama)
    m = m.subtract(bloque(sg > 0 ? x1 - 2 * w : -W / 2 - Lb - 1, sg > 0 ? W / 2 + Lb + 1 : x0 + 2 * w, yS - w / 2, yS + w / 2, zP, zG + 0.01)); });
  // los PASADORES: agujeros en gota arriba y abajo (6 mm de hondo)
  [-1, 1].forEach(sg => { const g = gota(pin + 2 * PRES, sg * xPin, zPin); if (o.arriba || o.tapa !== false) m = m.subtract(prismaY(g, Hm - 6, Hm + 1)); if (o.abajo) m = m.subtract(prismaY(g, -1, 6)); });
  return { m, G };
}
// la TAPA entre dos módulos (o la de arriba del todo): deja preso el cristal, pasa el túnel y lleva los pasadores
// (marco del módulo de debajo: ocupa y ∈ [Hm, Hm + tc]) · final = la de arriba del todo (con oreja para la pared y respiradero)
export function tapa(Q, final, premium, txt) {
  const { w, prof, zP, T, W, Hm, tc, pin, xPin, zPin } = Q, oreja = final ? 26 : 0;
  let m = bloque(-W / 2, W / 2, Hm, Hm + tc, -oreja, T);
  if (!final) m = m.subtract(bloque(-w / 2, w / 2, Hm - 1, Hm + tc + 1, zP, zP + prof)); // el túnel, de un módulo al siguiente
  else { m = m.subtract(prismaY(circ(2.2).translate([0, zP + prof / 2]), Hm - 1, Hm + tc + 1)); // respiradero (con una bolita de algodón dentro)
    m = m.subtract(prismaY(circ(4.6).translate([0, -oreja / 2 - 1]), Hm - 1, Hm + tc + 1)); } // la oreja: un tornillo o un clavo a la pared
  [-1, 1].forEach(sg => { m = m.subtract(prismaY(circ(pin + 2 * JUSTO).translate([sg * xPin, zPin]), Hm - 1, Hm + tc + 1)); });
  if (final && premium) { // el TEJADO: a dos aguas, con el nombre de la colonia delante
    const h = Math.min(32, W * 0.3);
    // tejado: perfil triangular (x, altura) a lo largo del grosor del módulo (z)
    let tej = poli([[-W / 2 - 3, 0], [W / 2 + 3, 0], [W / 2 + 3, 2], [0, h], [-W / 2 - 3, 2]]).extrude(T + 4) /* (el alero con 2 mm de canto: en filo no se imprime) */.translate([0, 0, -2]); // (x, y = altura, z = grosor)
    tej = tej.translate([0, Hm + tc - 0.01, 0]);
    const t = String(txt || '').trim(); if (t) { try { let Tx = N.centraCS(N.texto2(t, 'gorda', 7)); const b = N.cajaCS(Tx), k = Math.min((W * 0.62) / b.w, (h * 0.4) / b.h, 1.3); Tx = Tx.scale([k, k]).translate([0, Hm + tc + h * 0.3]); tej = tej.subtract(Tx.extrude(1.2).translate([0, 0, T + 2 - 1.19])); } catch (e) { } }
    m = m.add(tej); }
  return m;
}
const pasador = Q => cil(Q.pin, 2 * 6 + Q.tc - 1); // (de pie: Ø4 × 15)
// el TUBO cuadrado de la boquilla del nido a la de la zona de comida (de pie: sale sin soportes)
const tuboL = (Q, L) => caja(Q.B + 2 * JUSTO + 4.8, Q.B + 2 * JUSTO + 4.8, L, 2).subtract(caja(Q.B + 2 * JUSTO, Q.B + 2 * JUSTO, L + 2).translate([0, 0, -1]));
// la BOQUILLA suelta de la zona de comida y del depósito: la misma que la del nido (B × B, el túnel a 2,4 del suelo)
// ---------- la ZONA DE COMIDA ----------
// marco: x a lo largo, y a lo ancho, z arriba (de pie, como se imprime). La boquilla sale por el lado +x, a la altura del nido.
export function forrajeo(Q) {
  const [L, Wd, H] = Q.forr, p = 2.4, lab = 6, { w, prof, B, Lb, hC } = Q;
  let m = rr(L, Wd, 6).extrude(H).subtract(rr(L - 2 * p, Wd - 2 * p, 4).extrude(H + 1).translate([0, 0, p]));
  // labio ANTIFUGA: por dentro del borde, sube a 45° (se imprime sin soportes) y acaba en 4 mm rectos (ahí encaja la tapa)
  const hueco = (dx) => rr(L - 2 * p - 2 * dx, Wd - 2 * p - 2 * dx, Math.max(1, 4 - dx));
  const labio = M().hull([hueco(0).extrude(0.01).translate([0, 0, H - 10]), hueco(lab).extrude(0.01).translate([0, 0, H - 4])]).add(hueco(lab).extrude(4.01).translate([0, 0, H - 4]));
  m = m.add(rr(L - 2 * p + 0.02, Wd - 2 * p + 0.02, 4).extrude(10).translate([0, 0, H - 10]).subtract(labio));
  // la BOQUILLA (lado +x), a la altura del túnel del nido, con su pie macizo hasta la mesa; y la rampa de dentro para bajar
  // (18-10) un ENCHUFE, no una boquilla: el tubo entra 8 mm DENTRO del bloque (con una boquilla con pilar hasta la mesa, la pared del tubo
  //  chocaba con el pilar y no se podía meter). El techo del enchufe es un puente recto: se imprime sin soportes
  const zc = hC, x1 = L / 2, To = B + 2 * JUSTO + 4.8, Bs = To + 2 * JUSTO + 2 * 2.4;
  m = m.add(bloque(x1 - 0.01, x1 + Lb, -Bs / 2, Bs / 2, 0, zc + Bs / 2));
  m = m.subtract(bloque(x1 + Lb - 8, x1 + Lb + 1, -(To / 2 + JUSTO), To / 2 + JUSTO, zc - To / 2 - JUSTO, zc + To / 2 + JUSTO));
  m = m.subtract(bloque(x1 - p - 1, x1 + Lb - 7.99, -w / 2, w / 2, zc - prof / 2, zc + prof / 2));
  m = m.add(M().hull([bloque(x1 - p - 0.01, x1 - p, -w / 2 - 2, w / 2 + 2, p, zc - prof / 2), bloque(x1 - p - (zc - prof / 2 - p) - 2, x1 - p - (zc - prof / 2 - p) - 1.99, -w / 2 - 2, w / 2 + 2, p, p + 0.01)]));
  return m;
}
// la TAPA de la zona de comida: se imprime boca abajo; rejilla de 0,5 mm (dos capas cruzadas) y trampilla con su tapón
export function tapaForrajeo(Q) {
  const [L, Wd] = Q.forr, p = 2.4, lab = 6, g = 2.4, ab = [L - 2 * p - 2 * lab, Wd - 2 * p - 2 * lab];
  let m = rr(L, Wd, 6).extrude(g);
  m = m.add(rr(ab[0] - 2 * PRES, ab[1] - 2 * PRES, Math.max(1, 4 - lab)).extrude(3.5).subtract(rr(ab[0] - 2 * PRES - 4, ab[1] - 2 * PRES - 4, 1).extrude(4)).translate([0, 0, g - 0.01])); // el aro que entra a presión
  const vw = Math.min(46, ab[0] * 0.45), vh = Math.min(34, ab[1] * 0.6), vx = -ab[0] / 2 + vw / 2 + 6;
  m = m.subtract(rr(vw, vh, 2).extrude(g + 1).translate([vx, 0, -0.5]));
  m = m.add(rejilla(vw + 1, vh + 1).translate([vx, 0, 0])); // (en las dos primeras capas: aberturas de 0,5 × 0,5 mm)
  const tx = ab[0] / 2 - 16; m = m.subtract(cil(16 + 2 * PRES, g + 2, -1).translate([tx, 0, 0])); // la TRAMPILLA (Ø16)
  return { m, trampilla: [tx, 0] };
}
// rejilla de dos capas cruzadas: hilos de 0,45 cada 0,95 (deja 0,5 mm: las hormigas no pasan, el aire sí)
export function rejilla(a, b) { const L = []; for (let x = -a / 2; x <= a / 2; x += 0.95) L.push(rect(x, x + 0.45, -b / 2, b / 2)); const L2 = []; for (let y = -b / 2; y <= b / 2; y += 0.95) L2.push(rect(-a / 2, a / 2, y, y + 0.45));
  return N.csUnion(L).extrude(0.2).add(N.csUnion(L2).extrude(0.2).translate([0, 0, 0.2])); }
const taponTrampilla = () => cil(16, 4).add(cil(22, 2.4, 4)).add(caja(4, 16, 6, 1).translate([0, 0, 6.3])); // (se imprime con el asa hacia arriba)
const comedero = () => cil(32, 7).subtract(cil(27, 7, 2)).subtract(cil(26, 1, -0.5)); // (la base, rehundida: no cojea)
const bebedero = () => cil(32, 7).subtract(cil(27, 7, 2)).add(cil(10, 6.5, 0.5)).subtract(cil(6, 7, 1)); // (el algodón alrededor del pivote: beben sin ahogarse)
// el DEPÓSITO DE HUMEDAD: caja con un hueco a la altura de la boquilla del nido (entra 8 mm); el agua, hasta la raya; dentro de la
// boquilla, un tapón de ALGODÓN con una «cola» que baja al agua (moja el algodón: pasa la humedad, no el agua ni las hormigas)
export function deposito(Q) {
  const { B, hC } = Q, x = 46, y = Math.max(40, B + 16), h = hC + B / 2 + 22, p = 2.4;
  let m = rr(x, y, 4).extrude(h).subtract(rr(x - 2 * p, y - 2 * p, 2).extrude(h).translate([0, 0, p]));
  m = m.subtract(bloque(-x / 2 - 1, -x / 2 + p + 1, -(B / 2 + JUSTO), B / 2 + JUSTO, hC - B / 2 - JUSTO, hC + B / 2 + JUSTO)); // el hueco de la boquilla (lado −x)
  // la RAYA del agua (por fuera, en el frente): 6 mm por debajo del hueco
  const zr = hC - B / 2 - 6; m = m.subtract(bloque(-x / 2 + 6, x / 2 - 6, -y / 2 - 0.5, -y / 2 + 0.6, zr - 0.5, zr + 0.5));
  const tapaD = rr(x, y, 4).extrude(2.4).add(rr(x - 2 * p - 2 * PRES, y - 2 * p - 2 * PRES, 2).extrude(3).subtract(rr(x - 2 * p - 4, y - 2 * p - 4, 1).extrude(4)).translate([0, 0, 2.39])).subtract(cil(6, 6, -1).translate([x / 2 - 9, 0, 0]));
  return { m, tapa: tapaD, raya: zr, alto: h, x, y };
}
// la PEANA del nido: el módulo de abajo entra 6 mm en su ranura; larga hacia delante y hacia atrás (no se vuelca)
export function peana(Q, txt) {
  const { W, T } = Q, fondo = Math.max(120, T + 110), ancho = W + 16;
  let m = rr(ancho, fondo, 8).extrude(10).subtract(bloque(-W / 2 - 0.15, W / 2 + 0.15, -T / 2 - 0.15, T / 2 + 0.15, 4, 11));
  const t = String(txt || '').trim(); if (t) { try { let Tx = N.centraCS(N.texto2(t, 'gorda', 8)); const b = N.cajaCS(Tx), k = Math.min((ancho - 16) / b.w, 10 / b.h, 1.2); Tx = Tx.scale([k, k]).translate([0, -T / 2 - (fondo / 2 - T / 2) / 2]); m = m.subtract(Tx.extrude(1).translate([0, 0, 9.01])); } catch (e) { } }
  return { m, fondo, ancho };
}

// ---------- TODO EL KIT: piezas para imprimir y montado ----------
export function hormiguero(p) {
  const Q = medidas(p), K = Q.K, piezas = [], montaje = [], dePie = m => m.rotate([90, 0, 0]); // (x, y, z) → (x, −z, y)
  if (p.kit === 'prueba') return pruebaKit(Q);
  const sem = Math.round(p.semilla || 1), mods = [];
  for (let i = 0; i < Q.nMod; i++) { const o = { abajo: i > 0, arriba: i < Q.nMod - 1, izq: i === 0 && !K.suelto, der: i === 0 && K.dep, semilla: sem * 31 + i * 7 }; if (K.suelto) { o.abajo = true; o.arriba = true; } mods.push(Object.assign(modulo(Q, o), { o })); }
  mods.forEach((Mo, i) => piezas.push(['Módulo del nido ' + (i + 1) + (i === 0 && Q.nMod > 1 ? ' (el de abajo)' : i === Q.nMod - 1 && Q.nMod > 1 ? ' (el de arriba)' : ''), Mo.m]));
  const tapas = []; for (let i = 0; i < Q.nMod; i++) { const final = i === Q.nMod - 1 && !K.suelto; tapas.push(tapa(Q, final, K.premium && final, p.txt)); piezas.push([final ? (K.premium ? 'Tejado (tapa de arriba)' : 'Tapa de arriba (con oreja para la pared)') : 'Tapa entre módulos', tapas[i]]); }
  const nPas = 2 * (Q.nMod - (K.suelto ? 0 : 1)) + 2 * (K.suelto ? 1 : 0); for (let i = 0; i < Math.max(2, nPas + 2); i++) piezas.push(['Pasador', pasador(Q)]);
  // montaje: peana, módulos y tapas de pie
  const P = K.suelto ? null : peana(Q, K.premium ? p.txt : ''); if (P) { piezas.push(['Peana', P.m]); montaje.push({ k: 'peana', m: P.m }); }
  const zPaso = Q.Hm + Q.tc; mods.forEach((Mo, i) => { const z = Q.zb + i * zPaso, dz = z - 0; montaje.push({ k: 'modulo' + i, m: dePie(Mo.m.translate([0, 0, -Q.T / 2])).translate([0, 0, dz]) }); montaje.push({ k: 'tapa' + i, m: dePie(tapas[i].translate([0, 0, -Q.T / 2])).translate([0, 0, dz]) }); });
  let F = null, D = null, Lt = 0;
  if (Q.forr) { F = forrajeo(Q); const TF = tapaForrajeo(Q); piezas.push(['Zona de comida', F], ['Tapa de la zona de comida (rejilla + trampilla)', TF.m], ['Tapón de la trampilla', taponTrampilla()], ['Comedero', comedero()], ['Bebedero', bebedero()]);
    // el tubo: del final de la boquilla del nido (x = −W/2 − Lb) al de la zona de comida, con 30 mm de pasillo entre las dos
    const gap = 30; Lt = gap + 16; piezas.push(['Tubo de unión', tuboL(Q, Lt)]);
    const xF = -Q.W / 2 - Q.Lb - gap - Q.Lb - Q.forr[0] / 2, yC = -Q.T / 2 + Q.B / 2; // (las boquillas, a ras de la espalda del módulo: Y ∈ [T/2 − B, T/2] tras ponerlo de pie)
    const yB = Q.T / 2 - Q.B / 2; void yC;
    montaje.push({ k: 'forrajeo', m: F.translate([xF, yB, 0]) }, { k: 'tapaForrajeo', m: TF.m.rotate([180, 0, 0]).translate([xF, yB, Q.forr[2] + 2.4]) });
    montaje.push({ k: 'tubo', m: tuboL(Q, Lt).rotate([0, 90, 0]).translate([-Q.W / 2 - Q.Lb + 8 - Lt, yB, Q.hC]) }); }
  if (K.dep) { D = deposito(Q); piezas.push(['Depósito de humedad', D.m], ['Tapa del depósito', D.tapa]); const xD = Q.W / 2 + Q.Lb - 8 + D.x / 2 - 2.4 + 0.01, yB = Q.T / 2 - Q.B / 2; montaje.push({ k: 'deposito', m: D.m.translate([xD + 2.4, yB, 0]) }); }
  return { Q, piezas, montaje, mods, Lt, F, D, P };
}
function pruebaKit(Q) {
  // la esquina de abajo de un módulo con su ranura (prueba que TU cristal entra y queda preso), la boquilla con su tubo y un trozo de rejilla
  const o = { abajo: false, arriba: false, izq: true, der: false, semilla: 1 }, Mo = modulo(Q, o).m;
  const esquina = Mo.intersect(bloque(-Q.W / 2 - Q.Lb - 1, -Q.W / 2 + 34, -1, 34, -1, Q.T + 1));
  const piezas = [['Esquina con ranura y boquilla', esquina], ['Trozo de tubo', tuboL(Q, 20)], ['Trozo de rejilla', rejilla(20, 20).add(rr(24, 24, 2).extrude(1.2).subtract(rr(20, 20).extrude(2).translate([0, 0, -0.5])))], ['Pasador', pasador(Q)]];
  return { Q, piezas, montaje: [], mods: [], prueba: true };
}
// en filas que quepan en la cama (175 mm, la A1 mini; si no, hasta los 250 de la P1P)
function enCama(L, sep = 6) { const C = L.map(m => ({ m, b: N.caja(m) }));
  const reparto = W0 => { let x = 0, y = 0, fila = 0, X = 0; const pos = C.map(c => { if (x > 0 && x + c.b.dims[0] > W0) { x = 0; y += fila + sep; fila = 0; } const o = [x - c.b.min[0], y - c.b.min[1]]; x += c.b.dims[0] + sep; X = Math.max(X, x - sep); fila = Math.max(fila, c.b.dims[1]); return o; }); return { pos, lado: Math.max(X, y + fila) }; };
  let mejor = null; for (const W0 of [175, 200, 225, 250]) { const r = reparto(Math.max(W0, ...C.map(c => c.b.dims[0]))); if (!mejor || r.lado < mejor.lado - 0.5) mejor = r; if (mejor.lado <= 175) break; }
  return N.aLaCama(N.union(C.map((c, i) => c.m.translate([mejor.pos[i][0], mejor.pos[i][1], -c.b.min[2]])))); }
// las CAMAS del kit: todas las piezas repartidas en camas que quepan en la P1P (250 × 250 mm), de la más grande a la más pequeña
// (en filas; cuando una fila ya no cabe en la cama, se empieza otra cama) → [[índice de pieza…], …]
export function repartir(D, lado = 250, sep = 6) { // D = [[ancho, fondo], …] → [[índice…], …]
  const C = D.map((b, i) => ({ i, b })).sort((a, b) => b.b[1] - a.b[1] || b.b[0] - a.b[0]), out = [];
  let cama = [], x = 0, y = 0, fila = 0;
  for (const c of C) { const [w, h] = c.b;
    if (x > 0 && x + w > lado) { x = 0; y += fila + sep; fila = 0; }
    if (cama.length && y + h > lado) { out.push(cama); cama = []; x = 0; y = 0; fila = 0; }
    cama.push(c.i); x += w + sep; fila = Math.max(fila, h); }
  if (cama.length) out.push(cama); return out;
}
export const camas = L => repartir(L.map(m => N.caja(m).dims));
// para imprimir: cada pieza apoyada en su cara buena
const acostada = (t, m) => /^Tapa entre|^Tapa de arriba|^Tejado/.test(t) ? m.rotate([-90, 0, 0]) : /^Tapa de la zona/.test(t) ? m : /^Tapa del depósito/.test(t) ? m : m;
let ULT = null; // (de la última generación, SOLO datos: nombres, medidas y alturas; las piezas las borra el motor al acabar)
// qué piezas salen con «Qué imprimo» (índices en la lista de piezas) · I = { nombres, dims }
function eleccion(I, que) {
  if (/^cama\d$/.test(que) || que === 'todo') return repartir(I.dims)[que === 'todo' ? 0 : +que.slice(4) - 1] || [];
  const grupos = { nido: /^Módulo/, tapas: /^Tapa entre|^Tapa de arriba|^Tejado|^Pasador|^Peana/, comida: /zona de comida|^Tubo|^Tapón|^Comedero|^Bebedero/, humedad: /depósito/i };
  return I.nombres.map((x, i) => i).filter(i => grupos[que] ? grupos[que].test(I.nombres[i]) : /^mod\d$/.test(que) ? I.nombres[i].startsWith('Módulo del nido ' + (+que.slice(3))) : true);
}
// 🌈 si la cama lleva SOLO módulos del nido: el fondo de las galerías color TIERRA y lo de arriba ARENA (en la pantalla se ven los túneles;
// impreso, con una pausa de color a esa altura, el nido parece de tierra de verdad)
export function dosColoresHorm(p) { try { const que = p.que || 'cama1'; if (que === 'montado' || p.kit === 'prueba' || !ULT || ULT.k !== JSON.stringify(p)) return null; const L = eleccion(ULT, que);
  return L.length && L.every(i => /^Módulo/.test(ULT.nombres[i])) ? { z: ULT.zCambio, color: '#efe3c8' } : null; } catch (e) { return null; } }
export function genHormiguero(p) {
  const R = hormiguero(p), que = p.que || 'cama1';
  if (!R.prueba) ULT = { k: JSON.stringify(p), nombres: R.piezas.map(x => x[0]), dims: R.piezas.map(([t, m]) => N.caja(acostada(t, m)).dims), zCambio: R.Q.zP + R.Q.prof - 0.6 };
  if (que === 'montado') return R.prueba ? enCama(R.piezas.map(x => x[1])) : N.union(R.montaje.map(x => x.m));
  if (/^cama\d$/.test(que) || que === 'todo') { const Ls = R.piezas.map(([t, m]) => acostada(t, m)), Cs = camas(Ls), i = que === 'todo' ? 0 : +que.slice(4) - 1;
    if (!Cs[i]) N.mal('Este kit cabe en ' + Cs.length + (Cs.length === 1 ? ' cama' : ' camas') + ': elige «Cama 1»' + (Cs.length > 1 ? '…«Cama ' + Cs.length + '»' : '') + ' en «Qué imprimo».');
    return enCama(Cs[i].map(j => Ls[j])); }
  const grupos = { nido: /^Módulo/, tapas: /^Tapa entre|^Tapa de arriba|^Tejado|^Pasador|^Peana/, comida: /zona de comida|^Tubo|^Tapón|^Comedero|^Bebedero/, humedad: /depósito/i };
  let L = R.piezas; if (que !== 'todo' && grupos[que]) L = L.filter(x => grupos[que].test(x[0])); else if (/^mod\d$/.test(que)) L = L.filter(x => x[0].startsWith('Módulo del nido ' + (+que.slice(3))));
  if (!L.length) N.mal('En este kit no hay «' + que + '»: elige otra cosa en «Qué imprimo».');
  return enCama(L.map(([t, m]) => acostada(t, m)));
}
// qué pieza va en cada cama (lo dice la nota)
export function repartoCamas(p) { const R = hormiguero(p), Ls = R.piezas.map(([t, m]) => acostada(t, m)), Cs = camas(Ls);
  return Cs.map(c => { const cuenta = {}; c.forEach(j => { const t = R.piezas[j][0].replace(/ \(.*\)$/, '').replace(/ \d+$/, ''); cuenta[t] = (cuenta[t] || 0) + 1; }); return Object.entries(cuenta).map(([t, k]) => (k > 1 ? k + ' × ' : '') + t.toLowerCase()).join(', '); }); }
// ---------- las cuentas que se dicen en la nota (y se comprueban en test/unit/hormiguero.mjs) ----------
export function resumen(p) {
  const R = hormiguero(p), Q = R.Q, cams = R.mods.reduce((a, Mo) => a + Mo.G.camaras, 0), tun = R.mods.reduce((a, Mo) => a + Mo.G.tuneles, 0);
  return { Q, cams, tun, piezas: R.piezas.length, alto: Q.alto + (Q.K.premium ? 32 : 0), grande: R.piezas.reduce((g, [, m]) => Math.max(g, ...N.caja(m).dims.slice(0, 2).sort((a, b) => a - b).slice(0, 1), Math.min(...N.caja(m).dims.slice(0, 2))), 0) };
}

const QUE = [['cama1', 'Cama 1 del kit'], ['cama2', 'Cama 2 del kit'], ['cama3', 'Cama 3 del kit'], ['cama4', 'Cama 4 del kit'], ['cama5', 'Cama 5 del kit'], ['nido', 'Los módulos del nido'], ['tapas', 'Tapas, pasadores y peana'], ['comida', 'La zona de comida, su tapa, el tubo, comedero y bebedero'], ['humedad', 'El depósito de humedad y su tapa'], ['mod1', 'Solo el módulo 1'], ['mod2', 'Solo el módulo 2'], ['mod3', 'Solo el módulo 3'], ['montado', '👀 Verlo montado (solo para mirar)']];
const PARA_QUE = 'PARA QUÉ SIRVE: es la casa de una colonia de hormigas (una reina y sus obreras) para VERLAS VIVIR: cómo excavan y ordenan las cámaras, cuidan los huevos y las larvas, van a buscar comida y la llevan al nido. Para niños curiosos, clases de ciencias y aficionados (en internet lo llaman «formicario»). ';
const SEGURO = 'SEGURO: el cristal queda preso en su ranura (labios a 45°) y la tapa no lo deja salir; el tubo encaja «justo» (0,1 mm por lado): por un lado sobre la boquilla del nido y por el otro DENTRO del enchufe de la zona de comida; la zona de comida tiene labio antifuga y tapa a presión con rejilla de 0,5 mm (no pasan, respiran); la torre se ata a la pared por la oreja de arriba (no se vuelca). Unta una tira de talco, vaselina o aceite de parafina por dentro del labio de la zona de comida: así no trepan. Para hormigas MUY pequeñas (Solenopsis, Monomorium) pega además un trozo de visillo encima de la rejilla. Las hormigas de verdad se compran con su reina o se recogen tras el vuelo nupcial: no metas hormigas de fuera de tu zona ni las sueltes donde no son de allí. ';
export const DISENOS_HORMIGAS = {
  hormigueroTorre: { cat: 'mascotas', tambien: ['hogar', 'ninos', 'ciencia', 'regalos'], busca: 'hormiguero hormigas colonia formicario torre vertical ant farm nido kit premium', nuevo: true, e: '🐜', t: 'Hormiguero en torre con zona de comida', d: 'La casa de las hormigas: nido en módulos que crecen hacia arriba (túneles y cámaras tras un cristal de marco de fotos), zona de comida conectada, depósito de humedad. Kits inicio, grande y premium', uso: 'encaje', color: '#6b4a2f', nuevo: true,
    campos: [s('kit', 'Kit', 'inicio', Object.entries(KITS).map(([k, K]) => [k, K.t])), s('que', 'Qué imprimo', 'cama1', QUE), s('hormiga', 'Tamaño de tus hormigas', 'pequena', Object.entries(TAM).map(([k, T]) => [k, T.t])),
      s('cristal', 'Cristal', 'kit', [['kit', 'El del kit (10×15; el premium, 13×18)']].concat(Object.entries(CRISTALES).map(([k, C]) => [k, C.t]))), n('cw', 'Ancho del cristal (si es a tu medida)', 100, 60, 160, 1), n('ch', 'Alto del cristal (si es a tu medida)', 150, 80, 220, 1), n('ce', 'Grosor del cristal', 2, 1, 4, 0.1),
      n('modulos', 'Módulos de la torre (kits grande y premium)', 3, 1, 4, 1, ''), n('semilla', 'Dibujo de los túneles (cambia el número: otro nido)', 1, 1, 99, 1, ''), tx('txt', 'Nombre de la colonia (peana y tejado del premium)', '')],
    gen: p => genHormiguero(p), dosColores: p => dosColoresHorm(p),
    nota: p => { let R = null; try { R = resumen(p); } catch (e) { return '⚠️ ' + e.message; } const Q = R.Q, K = Q.K;
      if (p.kit === 'prueba') return '🧪 PRUEBA DE ENCAJE (pocos gramos, 20 minutos): la ESQUINA lleva la ranura del cristal y la boquilla. Mete una esquina de TU cristal por arriba: tiene que entrar deslizando y no poder salir hacia delante. Mete la boquilla en el TROZO DE TUBO: tiene que entrar justo, sin bailar. Mira la REJILLA a contraluz: se ven los cuadraditos de 0,5 mm. Si el cristal no entra, mide su grosor y ponlo en «Grosor del cristal».';
      if (p.que === 'montado') return '👀 Así queda montado (solo para mirar). Para imprimir elige «Todo el kit» o cada grupo en «Qué imprimo».';
      return PARA_QUE + K.t + ': ' + Q.nMod + ' módulo(s) de ' + n2(Q.W) + ' × ' + n2(Q.Hm) + ' mm con ' + R.cams + ' cámaras y ' + R.tun + ' túneles (distintos en cada módulo; túneles de ' + n2(Q.w) + ' mm y cámaras de ' + n2(Q.prof) + ' de hondo, para ' + Q.Ht.t.toLowerCase() + '). La torre mide unos ' + Math.round(R.alto) + ' mm de alta. '
        + (() => { try { const C = repartoCamas(p); return 'PARA IMPRIMIR va en ' + C.length + (C.length === 1 ? ' cama' : ' camas') + ' de la P1P: ' + C.map((t, i) => 'Cama ' + (i + 1) + ': ' + t).join(' · ') + '. '; } catch (e) { return ''; } })()
        + (() => { const dc = dosColoresHorm(p); return dc ? '🌈 En la pantalla el fondo de las galerías sale color TIERRA para que se vean los túneles; si lo quieres impreso así, pon una pausa de color a ' + n2(dc.z) + ' mm (marrón abajo, arena arriba). ' : ''; })()
        + 'CRISTAL: ' + n2(Q.cw) + ' × ' + n2(Q.ch) + ' × ' + n2(Q.ce) + ' mm por módulo (el de un marco de fotos barato: 0 € si reutilizas uno; lávalo bien). Entra por ARRIBA deslizando; luego la tapa. '
        + 'CÓMO SE MONTA: (1) el módulo de abajo en la PEANA; (2) su cristal; (3) la TAPA con sus 2 PASADORES; (4) el siguiente módulo encima, encajando los pasadores, y así hasta arriba; (5) la tapa de arriba (' + (K.premium ? 'el TEJADO con el nombre' : 'con la oreja') + ') y atornilla o cuelga la oreja en la pared; (6) el TUBO: un extremo entra 8 mm sobre la boquilla izquierda del nido y el otro, 8 mm dentro del ENCHUFE de la zona de comida; (7) en la boquilla derecha, un tapón de ALGODÓN con una cola, y el DEPÓSITO encima: agua solo hasta la RAYA (la cola de algodón llega al agua y moja el resto). Pon una bolita de algodón en el respiradero de arriba. '
        + 'CUIDADOS: lejos del sol y de la calefacción (20–28 °C), moja el algodón del depósito cada 1–2 semanas, comida 1–2 veces por semana por la TRAMPILLA (una gota de agua con miel o azúcar en el comedero, un trocito de insecto; las Messor, semillas) y quita lo que sobre para que no salga moho. ' + SEGURO
        + 'IMPRESIÓN: todo sin soportes (los módulos con la espalda en la cama; las tapas, de pie). PLA vale; PETG aguanta mejor la humedad. Lo que NO se puede comprobar sin imprimir es tu cristal (por eso está la 🧪 prueba) y que tus hormigas no mastiquen el plástico (algunas lo hacen con los años). '
        + (Q.W > 175 || Q.Hm > 175 ? 'OJO: con este cristal los módulos miden ' + Math.round(Q.W) + ' × ' + Math.round(Q.Hm) + ' mm: en la P1P sí, en la A1 mini no.' : 'Cada pieza cabe en la A1 mini.'); } }
};
