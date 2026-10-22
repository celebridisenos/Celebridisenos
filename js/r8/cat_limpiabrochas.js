// ================= 21-10-2026 · 🖌️ LIMPIADOR DE BROCHAS 4 EN 1 (depósito con botón + lavado + peine + cajón de agua usada) =================
// Ella (21-10): «Crea desde cero el diseño del limpiador de brochas 4 en 1 … un depósito de agua que se pueda colocar y rellenar · un botón que
// accione un muelle y abra la salida de agua · un sistema para limpiar las brochas · un depósito inferior extraíble que recoja el agua usada ·
// piezas diseñadas para ensamblarse, imprimirse y usarse de verdad». El lava-pinceles PRO (cat_pro.js) no tiene ni botón ni cajón: este es OTRO.
//
// CÓMO FUNCIONA
//  ① DEPÓSITO de agua limpia arriba (≈ 350 ml hasta la raya), con su tapa (se rellena en su sitio; se quita vacío para lavarlo).
//  ② VÁLVULA DE PINZA en un cartucho: el agua baja por un TUBO DE SILICONA (4 × 6 mm). Un MUELLE empuja una corredera que PINZA el tubo contra
//     una pared (cerrado). Al PULSAR el botón, la corredera se va hacia atrás, el tubo se abre y el agua cae sobre la brocha. Se suelta → cierra.
//     (Una pinza no necesita juntas ni superficies impresas que sellen: sella la silicona apretada. Es lo que usan los dosificadores.)
//  ③ CUBETA DE LAVADO: crestas para frotar (izquierda), púas para las brochas de maquillaje o finas (derecha), PEINE delante para escurrir y
//     quitar pintura, y muescas en los bordes para dejar las brochas apoyadas. El suelo está agujereado: el agua cae al cajón.
//  ④ CAJÓN extraíble abajo para el agua usada (≈ 450 ml hasta la raya: más que el depósito: no rebosa aunque se vacíe el depósito entero).
// Holguras de sus Bambu (por lado): 0,05 a presión · 0,10 encaja · 0,15–0,20 desliza; lo grande que entra y sale con la mano, 0,4–0,5.
// Lo que se compra: tubo de silicona 4 × 6 (15 cm), un muelle de compresión inoxidable Ø8 × 25 (alambre 0,7), 4 tornillos M3 × 10 y 4 tacos de goma
// (enlaces de AliExpress COMPROBADOS el 21-10-2026 en COMPRA_LB: abren ese producto y tienen esa opción).
// Todo se imprime SIN soportes (cada pieza dice cómo va en la cama). © CelebriDiseños.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, tx, M, rr, poli, cil, n2 } = A;
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cilZ = (d, z0, z1, x = 0, y = 0, k) => M().cylinder(z1 - z0, d / 2, d / 2, k || Math.max(24, Math.round(d * 3))).translate([x, y, z0]);
const conoZ = (d0, d1, z0, z1, x = 0, y = 0) => M().cylinder(z1 - z0, d0 / 2, d1 / 2, 32).translate([x, y, z0]);
const cilX = (d, x0, x1, y, z, k = 24) => M().cylinder(x1 - x0, d / 2, d / 2, k).rotate([0, 90, 0]).translate([x0, y, z]);
const cilY = (d, y0, y1, x, z, k = 24) => M().cylinder(y1 - y0, d / 2, d / 2, k).rotate([-90, 0, 0]).translate([x, y0, z]);
// un perfil (y, z) extruido a lo largo de X
const prismaX = (P, x0, x1) => poli(P).extrude(x1 - x0).rotate([90, 0, 90]).translate([x0, 0, 0]);
const U = L => N.union(L.filter(Boolean));
// una losa de planta redondeada (esquinas de radio r), de x0…x1, y0…y1, z0…z1
const losa = (x0, x1, y0, y1, z0, z1, r) => rr(x1 - x0, y1 - y0, r).extrude(z1 - z0).translate([(x0 + x1) / 2, (y0 + y1) / 2, z0]);
const RE = 8;                                            // radio de las esquinas por fuera (el mismo en todo: parece una sola pieza)
const huella = () => losa(-75, 75, -75, 75, -1, 300, RE); // la planta del limpiador: cuerpo, cubeta y cajón siguen su curva

// ======================= LAS MEDIDAS (milímetros; el limpiador mira hacia −Y, Z arriba, la mesa en z = 0) =======================
export const LB = (() => {
  const K = { W: 150, Y0: -75, YT: 25, Y1: 75, t: 2.4 };
  K.xi = K.W / 2 - K.t;                                   // cara de dentro de las paredes de los lados (72,6)
  K.ZB = 46; K.ZL = 50;                                   // el CAJÓN llega a z = 46; la CUBETA apoya en las repisas a z = 50
  K.ZS = 60;                                              // los lados del cuerpo, delante, hasta aquí (la cubeta asoma por encima)
  K.ZT = 150;                                             // arriba de la torre (donde apoya el depósito)
  K.cajon = { hg: 0.5, x: K.xi - 0.5, y0: K.Y0, y1: K.YT - 0.5, z0: K.t, z1: K.ZB, pared: 2.4, frente: 4, max: 40 };
  K.cubeta = { hg: 0.4, x: K.xi - 0.4, y0: K.Y0, y1: K.YT - 0.4, z0: K.ZL, z1: 86, pared: 2.4, suelo: 2.4 };
  // la VÁLVULA (cartucho): su cara de delante en y = 12 (asoma 13 mm de la torre: el tubo baja por DELANTE de la torre, sobre la cubeta)
  K.v = { x: 17, y0: 12, L: 40, z0: 120, H: 30, pared: 2.4, lado: 2, hg: 0.2 };
  K.v.tubo = [0, K.v.y0 + 2.4 + 3];                       // eje del tubo (x, y): pegado a la pared de delante del cartucho (el «yunque»)
  K.tubo = { di: 4, de: 6 };
  K.pinza = { cierre: 1.7, carrera: 6.5 };                // hueco entre la nariz de la corredera y el yunque, cerrado (el tubo: 2 paredes de 1 mm) · lo que se mueve el botón
  K.muelle = { de: 8, L: 25, alambre: 0.7 };
  K.dep = { y0: 10, y1: K.Y1, z0: K.ZT, falda: 12, suelo: 2.4, pared: 2.4, alto: 62, max: 8 };   // el DEPÓSITO: falda (patas), suelo, paredes; «max»: la raya, 8 mm bajo el borde
  K.pines = [[-50, 50], [50, 50]];                        // pines de la torre que centran el depósito
  return K; })();

// ======================= ① EL CUERPO (bandeja del cajón + repisas de la cubeta + torre con el hueco del cartucho) =======================
export function cuerpo() {
  const K = LB, t = K.t, xi = K.xi, X = K.W / 2;
  let m = U([
    cubo(-X, X, K.Y0, K.Y1, 0, t),                                               // suelo
    cubo(-X, -xi, K.Y0 + RE, K.YT, 0, K.ZS), cubo(xi, X, K.Y0 + RE, K.YT, 0, K.ZS),   // lados, delante (bajos: la cubeta asoma); acaban donde empieza la curva de la esquina (sin filo)
    cubo(-X, -xi, K.YT, K.Y1, 0, K.ZT), cubo(xi, X, K.YT, K.Y1, 0, K.ZT),        // lados de la torre
    cubo(-X, X, K.YT, K.YT + t, 0, K.ZT),                                        // pared de delante de la torre (atrás del cajón)
    cubo(-X, X, K.Y1 - t, K.Y1, 0, K.ZT),                                        // pared de atrás
    cubo(-X, X, K.YT, K.Y1, K.ZT - t, K.ZT),                                     // techo de la torre (apoya el depósito)
    ...[-45, 45].map(x => cubo(x - 1.2, x + 1.2, K.YT, K.Y1, 0, K.ZT)),          // dos tabiques: el techo se imprime en puentes de < 30 mm
    ...[-1, 1].map(sg => cubo(sg > 0 ? xi - 7 : -X, sg > 0 ? X : -xi + 7, K.Y1 - 9, K.Y1, 0, K.ZT)),   // PILARES en las esquinas de atrás: al redondearlas por fuera la pared no se queda en nada
  ]);
  // REPISAS de la cubeta: a los lados y en la torre, con la cara de abajo a 45° (sin soportes)
  const rep = 3;
  m = m.add(prismaX([[K.YT, K.ZL - rep - 0.8], [K.YT, K.ZL], [K.YT - rep, K.ZL], [K.YT - rep, K.ZL - 0.8]], -xi, xi));   // (0,8 de canto: sin filo)
  [-1, 1].forEach(sg => { const P = [[0, K.ZL - rep - 0.8], [0, K.ZL], [-rep, K.ZL], [-rep, K.ZL - 0.8]].map(([u, z]) => [sg * (xi + u), z]);
    m = m.add(poli(sg > 0 ? P : P.slice().reverse()).extrude(K.YT - K.Y0 - RE).rotate([90, 0, 0]).translate([0, K.YT, 0])); });
  // el HUECO del cartucho: abierto arriba y delante, con su suelo y sus paredes
  const v = K.v, hx = v.x + v.hg, yb = K.YT + (v.y0 + v.L - K.YT) + v.hg;
  m = m.add(U([cubo(-hx - t, -hx, K.YT, K.Y1, 2.4, K.ZT), cubo(hx, hx + t, K.YT, K.Y1, 2.4, K.ZT), cubo(-hx - t, hx + t, yb, yb + t, 2.4, K.ZT),   // (las paredes del hueco siguen hasta atrás: el techo, en celdas)
    cubo(-hx, hx, K.YT, yb, v.z0 - t, v.z0)]));
  m = m.subtract(cubo(-hx, hx, K.YT - 1, yb, v.z0, K.ZT + 1));
  // el suelo de la torre ABIERTO en cada celda (si no, quedarían huecos cerrados de aire; y pesa menos)
  [[-67, -50], [-40, -23], [23, 40], [50, 67]].forEach(([a, b]) => { m = m.subtract(cubo(a, b, K.YT + 6, K.Y1 - 12, -1, t + 1)); });
  m = m.subtract(cubo(-13, 13, K.YT + 6, yb - 4, -1, t + 1)).subtract(cubo(-13, 13, yb + t + 4, K.Y1 - 12, -1, t + 1));
  // PINES que centran el depósito
  K.pines.forEach(([x, y]) => { m = m.add(cilZ(6, K.ZT - 0.01, K.ZT + 3.2, x, y)).add(conoZ(6, 4.4, K.ZT + 3.2, K.ZT + 4, x, y)); });
  return m.intersect(huella()); }

// ======================= ② LA CUBETA DE LAVADO (crestas · púas · peine · muescas · suelo que desagua) =======================
export function cubeta() {
  const K = LB, c = K.cubeta, p = c.pared, X = c.x, z0 = c.z0, zs = z0 + c.suelo;
  let m = cubo(-X, X, c.y0, c.y1, z0, c.z1).intersect(huella()).subtract(losa(-X + p, X - p, c.y0 + p, c.y1 - p, zs, c.z1 + 1, 3));
  const ya = c.y0 + p + 4, yb = c.y1 - p - 6;                                   // zona de lavado
  // izquierda: CRESTAS para frotar (medias cañas a lo largo) con ranuras entre ellas
  const crestas = [], ranuras = [];
  for (let x = -X + p + 5; x <= -6; x += 5) { crestas.push(cilY(3.2, ya, yb, x, zs, 20)); if (x + 2.5 < -4) ranuras.push(cubo(x + 1.75, x + 3.25, ya + 2, yb - 2, z0 - 1, zs + 0.5)); }
  // derecha: PÚAS (conos) y agujeros entre ellas
  const puas = [], agujeros = [];
  for (let x = 8; x <= X - p - 4; x += 7) for (let y = ya + 2; y <= yb - 2; y += 7) { puas.push(conoZ(3.4, 1.2, zs - 0.01, zs + 4, x, y)); if (x + 3.5 < X - p - 2 && y + 3.5 < yb) agujeros.push(cilZ(2.6, z0 - 1, zs + 1, x + 3.5, y + 3.5, 16)); }
  // en medio (debajo del caño, que cae atrás): una ranura ancha hasta la pared de atrás
  ranuras.push(cubo(-2.5, 2.5, ya + 2, c.y1 - p - 1, z0 - 1, zs + 0.5));
  m = m.subtract(U([...ranuras, ...agujeros])).add(U([...crestas, ...puas]));
  // el PEINE delante, encima del borde (dientes de 1,6 con huecos de 2): se pasa la brocha por él para escurrir y quitar pintura
  const dientes = []; for (let x = -43.2; x <= 43.3; x += 3.6) dientes.push(cubo(x - 0.8, x + 0.8, c.y0, c.y0 + p, c.z1 - 0.01, c.z1 + 9));
  m = m.add(U([...dientes, cubo(-45.6, 45.6, c.y0, c.y0 + p, c.z1 - 0.01, c.z1 + 1.2)]));
  // MUESCAS en V en los bordes de los lados: las brochas se dejan apoyadas, con el pelo dentro de la cubeta
  [-1, 1].forEach(sg => [-50, -28, -6].forEach(y => { m = m.subtract(poli([[y - 8, c.z1 + 0.01], [y + 8, c.z1 + 0.01], [y + 1.2, c.z1 - 7], [y - 1.2, c.z1 - 7]]).extrude(p + 2).rotate([90, 0, 90]).translate([sg > 0 ? X - p - 1 : -X - 1, 0, 0])); }));
  return m; }

// ======================= ④ EL CAJÓN del agua usada =======================
export function cajon(txt = 'AGUA USADA') {
  const K = LB, c = K.cajon, p = c.pared, X = c.x;
  let m = cubo(-X, X, c.y0, c.y1, c.z0, c.z1).intersect(huella()).subtract(losa(-X + p, X - p, c.y0 + c.frente, c.y1 - p, c.z0 + p, c.z1 + 1, 3));
  // el TIRADOR: una ceja delante, con la cara de abajo a 45° (sin soportes)
  m = m.add(prismaX([[c.y0, c.z1 - 7], [c.y0, c.z1], [c.y0 - 6, c.z1], [c.y0 - 6, c.z1 - 1]], -30, 30));
  // la RAYA de «hasta aquí» por dentro (un escalón de 0,8 en la pared de atrás) y el nombre delante, grabado
  m = m.add(prismaX([[c.y1 - p + 0.01, c.max - 0.8], [c.y1 - p + 0.01, c.max + 0.6], [c.y1 - p - 0.8, c.max + 0.6], [c.y1 - p - 0.8, c.max]], -20, 20));   // (abajo a 45°)
  if (txt) { try { const T = N.centraCS(N.texto2(txt, 'gorda', 8)), b = N.cajaCS(T), k = Math.min(1, 100 / b.w, 9 / b.h); m = m.subtract(T.scale([k, k]).extrude(0.81).rotate([90, 0, 0]).translate([0, c.y0 + 0.8, (c.z0 + c.z1 - 8) / 2])); } catch (e) { } }
  return m; }

// ======================= ① EL DEPÓSITO de agua limpia (y su tapa) =======================
const barbaY = () => LB.v.tubo[1];
export function deposito(txt = 'AGUA LIMPIA') {
  const K = LB, d = K.dep, X = K.W / 2, p = d.pared, zf = d.z0 + d.falda, zs = zf + d.suelo, zt = d.z0 + d.alto;
  // falda (patas) con tabiques: el suelo se imprime en puentes cortos
  let falda = losa(-X, X, d.y0, d.y1, d.z0, zf, RE).subtract(losa(-X + p, X - p, d.y0 + p, d.y1 - p, d.z0 - 1, zf + 1, RE - p));
  falda = falda.add(U([...[-50, -25, 25, 50].map(x => cubo(x - 1.2, x + 1.2, d.y0, d.y1, d.z0, zf)), cubo(-X, X, 44.8, 47.2, d.z0, zf)]));
  K.pines.forEach(([x, y]) => { falda = falda.add(cubo(x - 6, x + 6, y - 6, y + 6, d.z0, zf)).subtract(cilZ(6.4, d.z0 - 1, d.z0 + 5, x, y)).subtract(conoZ(6.4, 0.2, d.z0 + 4.99, d.z0 + 8.1, x, y)).subtract(conoZ(7.4, 6.4, d.z0 - 0.01, d.z0 + 0.5, x, y)); });   // (techo en punta: sin soportes)
  let m = falda.intersect(losa(-X, X, d.y0, d.y1, d.z0 - 1, zt + 1, RE)).add(losa(-X, X, d.y0, d.y1, zf - 0.01, zt, RE).subtract(losa(-X + p, X - p, d.y0 + p, d.y1 - p, zs, zt + 1, RE - p)));
  // la SALIDA: una boquilla con dos dientes hacia ABAJO (el tubo de silicona 4 × 6 entra a presión), de la mesa al suelo (se imprime de pie)
  const [bx, by] = [0, barbaY()];
  m = m.add(U([conoZ(6.0, 9.0, zf - 4, zf - 2.5, bx, by), cilZ(9, zf - 2.51, zf + 0.01, bx, by), conoZ(4.2, 5.0, d.z0, d.z0 + 3.5, bx, by), cilZ(4.2, d.z0 + 3.49, d.z0 + 3.8, bx, by), conoZ(4.2, 5.0, d.z0 + 3.79, d.z0 + 7.3, bx, by), conoZ(5.0, 6.0, d.z0 + 7.29, zf - 3.99, bx, by)]));
  m = m.subtract(cilZ(2.8, d.z0 - 1, zs + 0.5, bx, by, 20));
  // la RAYA de «MAX» por dentro y el nombre delante
  m = m.add(prismaX([[d.y1 - p + 0.01, zt - d.max - 0.8], [d.y1 - p + 0.01, zt - d.max + 0.6], [d.y1 - p - 0.8, zt - d.max + 0.6], [d.y1 - p - 0.8, zt - d.max]], -30, 30));   // (abajo a 45°)
  if (txt) { try { const T = N.centraCS(N.texto2(txt, 'gorda', 8)), b = N.cajaCS(T), k = Math.min(1, 110 / b.w, 9 / b.h); m = m.subtract(T.scale([k, k]).extrude(0.61).rotate([90, 0, 0]).translate([0, d.y0 + 0.6, (zs + zt) / 2])); } catch (e) { } }
  return m; }
export function tapaDeposito() {
  const K = LB, d = K.dep, X = K.W / 2, p = d.pared, zt = d.z0 + d.alto, hg = 0.3, lab = 6;
  let m = losa(-X, X, d.y0, d.y1, zt, zt + 3, RE).add(losa(-X + p + hg, X - p - hg, d.y0 + p + hg, d.y1 - p - hg, zt - lab, zt + 0.01, RE - p - hg).subtract(losa(-X + p + hg + 2, X - p - hg - 2, d.y0 + p + hg + 2, d.y1 - p - hg - 2, zt - lab - 1, zt - 0.01, RE - p - hg - 2)));
  m = m.subtract(cilZ(2.5, zt - 1, zt + 4, 60, 64, 16));                           // respiradero: sin él el agua no baja (entra aire)
  m = m.add(prismaX([[d.y0 + 0.01, zt + 3], [d.y0 - 5, zt + 3], [d.y0 - 5, zt + 2], [d.y0 + 0.01, zt + 0.5]], -20, 20)); // pestaña para levantarla (1 mm en la punta: sin filo)
  return m; }

// ======================= ② LA VÁLVULA DE PINZA (cartucho: cuerpo + tapa + corredera con botón) =======================
// En coordenadas del cartucho: x ∈ [−17, 17] (−17: la placa que va en la cama), y ∈ [0, 40] (0: la cara de delante), z ∈ [0, 30].
const CV = { X: 17, L: 40, H: 30, p: 2.4, lado: 2.4, tz: [12, 18], brazos: [5, 9], hgr: 0.2, ty: 5.4, muelleY: 29 };   // (lado 2,4: la tapa lleva el avellanado del M3)
const enGlobal = m => m.translate([0, LB.v.y0, LB.v.z0]);
export function valvulaCuerpo() {
  const { X, L, H, p, lado, tz, brazos, hgr, ty } = CV, xi = X - lado;
  let m = U([cubo(-X, -xi, 0, L, 0, H), cubo(-xi, xi, 0, p, 0, H), cubo(-xi, xi, L - p, L, 0, H), cubo(-xi, xi, 0, L, 0, p), cubo(-xi, xi, 0, L, H - p, H)]);
  // ranuras de los BRAZOS de la corredera en la pared de delante (entre ellas queda el YUNQUE: el tubo se aprieta contra él)
  [-1, 1].forEach(sg => { m = m.subtract(cubo(sg > 0 ? brazos[0] - hgr : -brazos[1] - hgr, sg > 0 ? brazos[1] + hgr : -brazos[0] + hgr, -1, p + 1, tz[0] - hgr, tz[1] + hgr)); });
  // GUÍAS (arriba y abajo de la travesaña) en la placa de la cama
  m = m.add(U([cubo(-xi - 0.01, -10, p, 26, tz[0] - 0.25 - 2, tz[0] - 0.25), cubo(-xi - 0.01, -10, p, 26, tz[1] + 0.25, tz[1] + 0.25 + 2)]));
  // el ASIENTO del muelle (bloque contra la pared de atrás, con su copa)
  m = m.add(cubo(-xi - 0.01, 7, CV.muelleY - 3, L - p + 0.01, 9, 21)).subtract(cilY(8.8, CV.muelleY - 3.01, CV.muelleY, 0, 15, 32));
  // PILARES de los 4 tornillos M3 (de la placa a la tapa) con su agujero de 2,6
  [[33.5, 5], [33.5, 25], [14, 5], [14, 25]].forEach(([y, z]) => { m = m.add(cilX(7, -xi - 0.01, xi, y, z, 24)).subtract(cilX(2.6, xi - 12, xi + 1, y, z, 16)); });
  // el TUBO pasa recto: agujeros SOLO en la pared de arriba y la de abajo (la de delante, el yunque, se queda entera)
  m = m.subtract(cilZ(7, -1, p + 0.01, 0, ty, 32)).subtract(cilZ(7, H - p - 0.01, H + 1, 0, ty, 32));
  return m; }
export function valvulaTapa() {
  const { X, L, H, lado, tz } = CV, xi = X - lado;
  let m = cubo(xi, X, 0, L, 0, H).add(U([cubo(10, xi + 0.01, CV.p, 26, tz[0] - 0.25 - 2, tz[0] - 0.25), cubo(10, xi + 0.01, CV.p, 26, tz[1] + 0.25, tz[1] + 0.25 + 2)]));
  [[33.5, 5], [33.5, 25], [14, 5], [14, 25]].forEach(([y, z]) => { m = m.subtract(cilX(3.4, xi - 1, X + 1, y, z, 16)).subtract(M().cylinder(1.71, 1.7, 3.2, 20).rotate([0, 90, 0]).translate([X - 1.7, y, z])); });
  return m; }
// la CORREDERA con su botón, en su sitio de reposo (cerrada); «dy» la mueve hacia atrás (pulsada: dy = carrera)
export function corredera(dy = 0) {
  const { tz, brazos, ty } = CV, P = LB.pinza, zc = (tz[0] + tz[1]) / 2;
  const yA = CV.p, yN = yA + P.cierre, yT = 5.4;                                 // cara del yunque · punta de la nariz · cara de la travesaña
  let m = U([cubo(-10, 10, -15, -7, tz[0], tz[0] + 12),                           // el BOTÓN (fuera; abajo a ras de los brazos: se imprime plana)
    ...[-1, 1].map(sg => cubo(sg > 0 ? brazos[0] : -brazos[1], sg > 0 ? brazos[1] : -brazos[0], -7.01, 10.4, tz[0], tz[1])),   // brazos
    cubo(-11.4, 11.4, yT, 10.4, tz[0], tz[1]),                                   // travesaña
    ...[-1, 1].map(sg => cubo(sg > 0 ? 9.4 : -11.4, sg > 0 ? 11.4 : -9.4, yA, yT + 0.01, tz[0], tz[1])),   // TOPES: tocan el yunque en reposo (hueco fijo)
    prismaX([[yT + 0.01, zc - 2], [yT + 0.01, zc + 2], [yN, zc + 0.3], [yN, zc - 0.3]], -brazos[0] + 0.2, brazos[0] - 0.2),   // la NARIZ que pinza (cuña)
    poli([[0, -2.4], [2.4, 0], [0, 2.4], [-2.4, 0]]).extrude(6).rotate([-90, 0, 0]).translate([0, 10.39, zc]),   // tetón del muelle (rombo: caras a 45°)
  ]);
  // una GOTA grabada en el botón (0,6 mm): se sabe qué hace sin leer nada
  const G = []; for (let i = 0; i <= 20; i++) { const a = Math.PI * (-0.25 + 1.5 * i / 20); G.push([2.6 * Math.cos(a), tz[0] + 4.6 + 2.6 * Math.sin(a)]); } G.push([0, tz[0] + 4.6 + 2.6 * Math.SQRT2 + 1.2]);
  m = m.subtract(poli(G).extrude(0.61).rotate([90, 0, 0]).translate([0, -15 + 0.6, 0]));
  return m.translate([0, dy, 0]); }
// suplementos del muelle (si gotea: más fuerza)
export const suplemento = e => cilZ(8.4, 0, e).subtract(cilZ(4.6, -1, e + 1));

// ---------- el MONTAJE (para mirarlo y para las pruebas) ----------
export function montaje(pulsado = false) {
  const K = LB, dy = pulsado ? K.pinza.carrera : 0, [tx, ty] = K.v.tubo, zt = K.dep.z0 + K.dep.alto;
  // el tubo: pulsado, redondo de la boquilla al caño; suelto, se ve solo lo que cuelga bajo el cartucho (dentro va pinzado)
  const tubo = cilZ(K.tubo.de, 92, pulsado ? K.v.z0 + K.v.H : K.v.z0 - 0.01, tx, ty).subtract(cilZ(K.tubo.di, 91, zt, tx, ty));
  return { cuerpo: cuerpo(), cubeta: cubeta(), cajon: cajon(), deposito: deposito(), tapa: tapaDeposito(),
    valvula: enGlobal(valvulaCuerpo()), tapaValvula: enGlobal(valvulaTapa()), corredera: enGlobal(corredera(dy)), tubo }; }

// ---------- en la cama ----------
const enFila = (L, sep = 8) => { let x = 0; return N.union(L.map(m => { const b = N.caja(m), o = m.translate([x - b.min[0], -(b.min[1] + b.max[1]) / 2, -b.min[2]]); x += b.dims[0] + sep; return o; })); };
const deLado = m => m.rotate([0, -90, 0]);                                       // la placa x = −17 a la cama (z' = x)
const enCamaValvula = () => [deLado(valvulaCuerpo()), valvulaTapa().rotate([0, 90, 0]), corredera().translate([0, 0, -CV.tz[0]]), suplemento(2), suplemento(4)];
export function vasoPrueba() {   // 🧪 un vasito (≈ 45 ml) que se pone ENCIMA del cartucho, con la misma boquilla que el depósito
  const p = 2.4, X = CV.X, y0 = 0, y1 = CV.L, fz = 12, H = 62, by = CV.ty;
  let m = cubo(-X, X, y0, y1, 0, fz).subtract(cubo(-X + p, X - p, y0 + p, y1 - p, -1, fz + 1)).add(cubo(-X, X, y0, y1, fz - 0.01, H).subtract(cubo(-X + p, X - p, y0 + p, y1 - p, fz + p, H + 1)));
  m = m.add(U([cilZ(9, fz - 4, fz + 0.01, 0, by), conoZ(4.2, 5.0, 0, 3.5, 0, by), cilZ(4.2, 3.49, 3.8, 0, by), conoZ(4.2, 5.0, 3.79, 7.3, 0, by), conoZ(5.0, 6.0, 7.29, fz - 3.99, 0, by)])).subtract(cilZ(2.8, -1, fz + p + 0.5, 0, by, 20));
  return m; }

export function limpiaBrochas(p) {
  const q = p.que || 'cuerpo';
  if (q === 'cuerpo') return cuerpo();
  if (q === 'cubeta') return cubeta();
  if (q === 'cajon') return cajon(String(p.txtCajon ?? 'AGUA USADA').trim());
  if (q === 'deposito') { const a = deposito(String(p.txtDep ?? 'AGUA LIMPIA').trim()), b = tapaDeposito().rotate([180, 0, 0]), ba = N.caja(a), bb = N.caja(b);   // uno DETRÁS del otro (de lado, 308 mm: no cabe)
    return N.union([a.translate([-(ba.min[0] + ba.max[0]) / 2, -ba.min[1], -ba.min[2]]), b.translate([-(bb.min[0] + bb.max[0]) / 2, -bb.min[1] + ba.dims[1] + 8, -bb.min[2]])]); }
  if (q === 'valvula') return enFila(enCamaValvula(), 6);
  if (q === 'prueba') return enFila([...enCamaValvula(), vasoPrueba()], 6);
  const P = montaje(q === 'abierto'); return U(Object.values(P)); }

// ---------- lo que se compra (con lo que hay que mirar) ----------
export const COMPRA_LB = [
  { que: 'Tubo de silicona alimentaria 4 × 6 mm (Ø interior 4, Ø exterior 6)', cuantos: '15 cm (se vende por metros)', busca: 'silicone tube 4x6mm food grade', url: 'https://es.aliexpress.com/item/1005005234080668.html', elige: 'ID 4mm x 6mm OD · 2 Meters', ojo: 'Que sea 4 × 6: con otra medida la boquilla no aprieta o la pinza no cierra.' },
  { que: 'Muelle de compresión de acero inoxidable, Ø exterior 8 mm, largo 25 mm, alambre 0,6–0,8 mm', cuantos: '1 (vienen en bolsas)', busca: 'stainless steel compression spring 0.7x8x25mm', url: 'https://es.aliexpress.com/item/1005007866254454.html', elige: 'Wire 0.7mm · Outer 8 mm · Length 25 mm', ojo: 'Inoxidable (está cerca del agua). Si gotea, se añade el suplemento de 2 o 4 mm (va impreso).' },
  { que: 'Tornillos M3 × 10 (cabeza avellanada o Allen)', cuantos: '4', busca: 'M3x10 countersunk screw stainless', url: 'https://es.aliexpress.com/item/4000193155954.html', elige: 'M3 20 piezas · 10 mm', ojo: 'Cierran la tapa del cartucho de la válvula.' },
  { que: 'Tacos de goma adhesivos Ø10–13 mm', cuantos: '4', busca: 'rubber feet 12mm adhesive', url: 'https://es.aliexpress.com/item/1005009298819108.html', elige: '12pcs 12.5x5.2mm', ojo: 'Debajo del cuerpo: no resbala.' } ];

export const DISENOS_LIMPIABROCHAS = {
  limpiaBrochas4en1: { cat: 'hogar', tambien: ['pro', 'oficina', 'belleza', 'regalos'], nuevo: true, e: '🖌️', t: 'Limpiador de brochas 4 en 1 con depósito y botón',
    d: 'Depósito de agua limpia con botón de muelle, cubeta con crestas, púas y peine, y cajón extraíble para el agua usada', busca: 'limpiador brochas pinceles maquillaje lavador agua deposito boton muelle valvula cajon cubeta peine 4 en 1 dispensador',
    campos: [tx('txtDep', 'Texto del depósito', 'AGUA LIMPIA'), tx('txtCajon', 'Texto del cajón', 'AGUA USADA'),
      s('que', 'Qué imprimo', 'cuerpo', [['cuerpo', '① Cuerpo (torre y bandeja)'], ['cubeta', '② Cubeta de lavado'], ['cajon', '③ Cajón del agua usada'], ['deposito', '④ Depósito y su tapa'],
        ['valvula', '⑤ Válvula: cartucho, tapa, corredera y suplementos'], ['prueba', '🧪 Prueba: la válvula + un vasito (≈ 60 g)'], ['montado', 'Montado (para mirar)'], ['abierto', 'Montado con el botón pulsado']])],
    gen: limpiaBrochas,
    nota: p => { const K = LB, q = p.que || 'cuerpo';
      if (q === 'prueba') return '🧪 PRUEBA ANTES DE IMPRIMIR LO GRANDE: monta la válvula (muelle en el rombo de la corredera, corredera en el cartucho, tapa con sus 4 tornillos M3 × 10), mete 10 cm de tubo de silicona 4 × 6 en la boquilla del vasito y bájalo por el cartucho pulsando el botón. Llena el vasito encima de un fregadero: soltado NO puede caer ni una gota en 5 minutos; pulsado tiene que salir un chorrito. Si gotea: pon el suplemento de 2 mm (o el de 4) detrás del muelle.';
      return 'CÓMO FUNCIONA: rellenas el DEPÓSITO por arriba (≈ 350 ml hasta la raya) · pulsas el BOTÓN y cae agua limpia sobre la brocha (un MUELLE cierra la pinza del tubo al soltar) · frotas en las CRESTAS (pinceles y brochas) o en las PÚAS (maquillaje) · la escurres en el PEINE · el agua usada cae por el suelo agujereado al CAJÓN (≈ 450 ml: cabe todo el depósito). '
        + 'IMPRESIÓN en PETG (agua): sin soportes; cuerpo, cubeta y cajón de pie; el depósito de pie con 5 paredes y 6 capas abajo (estanco); el cartucho de la válvula de LADO. Cuerpo ' + K.W + ' × 150 × ' + K.ZT + ' mm: cabe en la A1 mini. '
        + 'SE COMPRA: ' + COMPRA_LB.map(c => c.que.split(' (')[0].split(',')[0]).join(' · ') + '. Imprime primero la 🧪 PRUEBA (la válvula con un vasito).'; },
    manual: p => ({ vistas: [['montado', 'Así queda montado'], ['abierto', 'Con el botón pulsado: el tubo abierto'], ['valvula', 'La válvula por piezas']],
      piezas: [['① Cuerpo', 1, '150 × 150 × 150 mm, de pie'], ['② Cubeta de lavado', 1, 'crestas, púas, peine y muescas'], ['③ Cajón', 1, '≈ 450 ml hasta la raya'], ['④ Depósito + tapa', 2, '≈ 350 ml hasta la raya'],
        ['⑤ Cartucho, tapa del cartucho, corredera con botón', 3, 'la válvula de pinza'], ['Suplementos 2 y 4 mm', 2, 'solo si gotea'], ...COMPRA_LB.map(c => [c.que, c.cuantos, c.ojo])],
      pasos: ['VÁLVULA: pon el muelle en el rombo de detrás de la corredera. Mete la corredera en el cartucho (los dos brazos por las ranuras de delante, el botón fuera) con el muelle en su copa. Cierra con la tapa y los 4 tornillos M3 × 10.',
        'Pulsa el botón: tiene que ir y volver solo. Encaja el cartucho en el hueco de la torre desde arriba (el botón hacia delante).',
        'Mete 15 cm de tubo de silicona en la boquilla de debajo del depósito (empujando y girando, hasta el tope).',
        'Pulsa el botón y baja el tubo por el agujero de arriba del cartucho hasta que asome por abajo unos 2,5 cm. Apoya el depósito en la torre (los dos pines entran en sus agujeros).',
        'Mete la CUBETA desde arriba (apoya en sus repisas) y el CAJÓN por delante.',
        'Llena el depósito hasta la raya, pon la tapa (su agujerito deja entrar aire: sin él el agua no baja). Pulsa: cae el agua.'],
      consejos: ['Si gotea con el botón suelto: pon el suplemento de 2 mm detrás del muelle (o el de 4).', 'Vacía el cajón antes de que llegue a su raya.', 'Para lavar el depósito, vacíalo primero pulsando el botón; luego se levanta con el tubo.'],
      cuidados: ['Lávalo con agua templada y jabón. No lo metas en el lavavajillas.', 'El tubo de silicona se cambia cuando se ponga amarillo (cuesta céntimos).'] }) } };
