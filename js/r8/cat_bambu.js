// ================= 17-10-2026 · 🖨️ PARA TUS BAMBU (A1 mini, A1 y P1P): ver crecer tus piezas y lo que hace falta al imprimir =================
// Ella: «repuestos o inventos para las Bambu A1 mini, P1P y A1: por ejemplo un soporte de cámara; inventa un sistema para dejar el móvil
// grabando, o una GoPro, o una cámara, para ver el crecimiento de sus piezas; piensa en necesidades a la hora de crear; anticípate; quiero
// ver ARTE cuando entre». Todo diseño propio, comprobado MONTADO en el ordenador (test/unit/bambu.mjs), sin soportes y sin comprar nada:
//  🎥 RÓTULA DE CÁMARA impresa sobre una PEANA escultórica (campana y columna en espiral; hueca, por si se quiere llenar de arena).
//     La rótula es de las de verdad: una bola dentro de una copa con 4 pétalos; la TUERCA de arriba, al enroscarla, aprieta los pétalos
//     sobre la bola y la deja FIJA (floja, gira 45° hacia cualquier lado y da la vuelta entera: vertical u horizontal). Cabezales que se
//     cambian (la bola sale a presión): 📱 cuna de MÓVIL a medida (con funda), 🎬 GoPro (3 dedos) y 📷 tornillo de 1/4" (cámaras y trípodes).
//  🐦 PINZA DE BOBINA en forma de pájaro: se posa en el borde de la bobina y sujeta la punta del filamento con el pico.
//  🗂️ SOPORTE DE PLACAS: guarda de pie las placas de la cama (180 de la A1 mini o 256 de la A1/P1P), un poco inclinadas.
import * as N from './nucleo.js';
import { goproDedos } from './cat_compat.js';

const M = () => N.MF(), CS = () => N.CSX(), RAD = Math.PI / 180;
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
const segs = r => Math.max(32, Math.min(128, Math.round(r * 6)));
const cil = (r, z0, z1, n) => M().cylinder(z1 - z0, r, r, n || segs(r)).translate([0, 0, z0]);
const cono = (r0, r1, z0, z1, n) => M().cylinder(z1 - z0, r0, r1, n || segs(Math.max(r0, r1))).translate([0, 0, z0]);
const esfera = (r, z) => M().sphere(r, 72).translate([0, 0, z]);
const caja = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);
const poli = P => N.cs([N.ccw(P)], 'Positive');
// un perfil en el plano (x, z) estirado a lo largo de Y (de y0 a y1)
const perfilY = (cs, y0, y1) => cs.extrude(y1 - y0).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, y0, 0, 1]);
const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });

// ROSCA EN V a 45° (la de los botes de cat_pro, paso gordo): se imprime sin soportes. hol = holgura por lado (hembra).
export function roscaV(d, paso, h, hol = 0) {
  const prof = paso / 2 - 0.3, rmax = d / 2 + hol, rmin = rmax - prof, P = [], nn = 120;
  for (let i = 0; i < nn; i++) { const t = i / nn, tri = t < 0.5 ? t * 2 : 2 - t * 2, r = rmin + Math.max(0, Math.min(prof, tri * (prof + 0.3) - 0.15)), a = t * 2 * Math.PI; P.push([r * Math.cos(a), r * Math.sin(a)]); }
  return poli(P).extrude(h, Math.ceil(h / paso * 60), -360 * h / paso);
}
// ROSCA de 1/4"-20 (la de las cámaras y trípodes): 60°, paso 1,27 mm, macho un pelo más fino (6,15) para que entre bien
export function rosca14(h) {
  const p = 1.27, prof = 0.6 * p, rM = 6.15 / 2, rm = rM - prof, fl = prof * Math.tan(30 * RAD) / p, cr = (1 - 2 * fl) / 2, a = cr / 2, b = a + fl, c = b + cr, d = c + fl, P = [], nn = 180;
  for (let i = 0; i < nn; i++) { const t = i / nn, r = t < a ? rm : t < b ? rm + prof * (t - a) / fl : t < c ? rM : t < d ? rM - prof * (t - c) / fl : rm, an = t * 2 * Math.PI; P.push([r * Math.cos(an), r * Math.sin(an)]); }
  return poli(P).extrude(h, Math.ceil(h / p * 60), -360 * h / p);
}

// ======================= 🎥 LA RÓTULA =======================
// bola de Ø18 en una copa de Ø18,4 (0,2 de aire): la copa la abraza hasta 20° por encima de su centro (la bola entra a presión, con un «clic»
// de 0,35 mm por lado, y ya no se sale sola aunque la tuerca esté floja).
// Cuatro ranuras dejan la copa en 4 PÉTALOS. Por fuera, rosca de Ø26 (paso 2,5) y arriba un bisel a 45°. La TUERCA lleva dentro la
// rosca y, arriba, un labio cónico paralelo a ese bisel: al enroscarla, el labio empuja los pétalos hacia la bola (1 mm de tuerca =
// 1 mm hacia dentro) y la deja fija.
export const ROT = { R: 9, RC: 9.2, PISO: 2.4, LAT: 20, D: 26, PASO: 2.5, HR: 11, BIS: 1.2, RAN: 1.2, DC: 36, LABIO: 2.5, HOL: 0.25 };
export const R_MIN = ROT.D / 2 - (ROT.PASO / 2 - 0.3); // 12,05: el fondo de la rosca de la copa
// la copa con la bola centrada en zc: devuelve la pieza y sus alturas
export function copa(zc) {
  const K = ROT, zTop = zc + K.RC * Math.sin(K.LAT * RAD), z0 = zc - K.RC - K.PISO, zR1 = zTop - K.BIS, zR0 = zR1 - K.HR;
  let m = cil(R_MIN, z0, zTop).add(roscaV(K.D, K.PASO, K.HR).translate([0, 0, zR0]));
  m = m.intersect(cono(R_MIN + 40, R_MIN - K.BIS, zTop - K.BIS - 40, zTop)); // el bisel de arriba, a 45°
  m = m.subtract(esfera(K.RC, zc));
  for (let k = 0; k < 4; k++) m = m.subtract(caja(-K.RAN / 2, K.RAN / 2, 0, 20, zc - 6, zTop + 1).rotate([0, 0, 45 + 90 * k])); // (ranuras largas: los pétalos flexan sin partirse)
  return { m, zc, zTop, z0, zR0, zR1 };
}
// la tuerca (de pie: la rosca abajo, el labio arriba). zFondo(…) = dónde va su base: «floja» (1 mm por encima de tocar) o «apretada».
export const TUERCA_H = ROT.HR + ROT.LABIO;
export function tuerca() {
  const K = ROT, H = TUERCA_H;
  let m = cil(K.DC / 2, 0, H, 96);
  for (let k = 0; k < 18; k++) m = m.subtract(cil(1.5, -1, H + 1, 16).translate([K.DC / 2 + 0.5, 0, 0]).rotate([0, 0, k * 20])); // el moleteado (para apretarla con los dedos)
  m = m.subtract(roscaV(K.D, K.PASO, K.HR + 2, K.HOL).translate([0, 0, -1]));
  return m.subtract(cono(R_MIN + 0.31, R_MIN + 0.29 - K.LABIO, K.HR - 0.01, H + 0.01)); // el labio cónico
}
export const tuercaToca = Q => Q.zTop - ROT.BIS - ROT.HR - 0.3; // su base, cuando el labio justo toca el bisel
// la tuerca en su sitio (sube «sube» mm sobre la que toca; negativo = apretada), girada lo que toca para que su rosca case
export function tuercaEn(Q, sube) {
  const Zc = tuercaToca(Q) + sube, Zf = Zc - 1, phi = 360 * (Q.zR0 - Zf) / ROT.PASO;
  return tuerca().rotate([0, 0, phi]).translate([0, 0, Zc]);
}
// la BOLA con su cabezal. Se imprime de pie: la bola abajo (con la base plana a 45°: sin soportes) y el cabezal arriba.
// cabeza: 'cola' (la cola de milano de la cuna del móvil) · 'gopro' (3 dedos) · 'rosca' (tornillo de 1/4")
export const BOLA_C = ROT.R * Math.sin(45 * RAD); // el centro de la bola, sobre la cama
export const BOLA_TOPE = BOLA_C + ROT.R + 10;      // donde acaba el cuello
export function bola(cabeza) {
  const K = ROT, c = BOLA_C, zS = BOLA_TOPE;
  let m = esfera(K.R, c).intersect(caja(-20, 20, -20, 20, 0, 40)).add(cil(4, c + 6, zS, 48)); // (cuello de Ø8: deja inclinarla 40° con la tuerca puesta)
  if (cabeza === 'gopro') m = m.add(M().hull([cil(4, zS - 6, zS - 5.99, 48), caja(-7.7, 7.7, -7.5, 7.5, zS - 0.01, zS)])).add(goproDedos(3, zS, 1));
  else if (cabeza === 'rosca') m = m.add(cono(4, 16, zS - 12, zS, 96)).add(cil(16, zS - 0.01, zS + 3, 96)).add(rosca14(6.5).translate([0, 0, zS + 3]));
  else m = m.add(M().hull([cil(4, zS - 8, zS - 7.99, 48), caja(-7, 7, -4, 4, zS - 0.01, zS)])).add(poli([[-4, zS - 0.01], [4, zS - 0.01], [6, zS + 4], [-6, zS + 4]]).extrude(14).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, -7, 0, 0, 1])); // (la cola de milano, a lo largo de X)
  return m;
}

// ======================= 📱 LA CUNA DEL MÓVIL (a medida, con funda) =======================
// Dos mordazas que abrazan los lados largos del móvil (0,2 mm de apriete por lado: lo sujeta sin pinzar) con un labio a 45° por encima de la
// pantalla. Mide 18 mm de ancho: el móvil entra deslizándolo y se coloca donde no tape la cámara ni pise los botones. En el canto de una
// mordaza va el ENCHUFE de la bola (cola de milano): así el móvil queda DE PIE, en horizontal, con la cámara hacia la impresora y la
// pantalla hacia ti. Se imprime tumbada (la espalda en la cama) y la ranura de la cola de milano sale vertical: sin soportes.
export const CUNA = { Y: 9, ZP: 6, AP: 0.2, MUR: 3.2, LABIO: 1.6, ENCH: 6.5, LCOLA: 13.5 };
export function cunaMovil(p) {
  const K = CUNA, W = p.ancho, T = p.grueso, xi = W / 2 - K.AP, xe = xi + K.MUR, zT = K.ZP + T, xm = -xe - K.ENCH;
  let m = caja(-xe, xe, -K.Y, K.Y, 0, K.ZP);
  const mord = poli([[xi, K.ZP - 0.01], [xe, K.ZP - 0.01], [xe, zT + 2.8], [xi - K.LABIO, zT + 2.8], [xi - K.LABIO, zT + 0.4 + K.LABIO], [xi, zT + 0.4]]);
  const una = perfilY(mord, -K.Y, K.Y); m = m.add(una).add(una.mirror([1, 0, 0]));
  // el enchufe de la bola, pegado a la mordaza de la izquierda: la ranura (estrecha por fuera, ancha por dentro) va de abajo arriba y
  // acaba en un tope (la bola entra hasta ahí)
  m = m.add(caja(xm, -xe + 0.01, -K.Y, K.Y, 0, K.LCOLA + 2));
  m = m.subtract(poli([[xm - 0.01, -4.15], [xm - 0.01, 4.15], [xm + 4.15, 6.15], [xm + 4.15, -6.15]]).extrude(K.LCOLA + 1).translate([0, 0, -1]));
  return m;
}
// dónde queda la bola en la cuna (en las coordenadas de la cuna): su cuello hacia +x, la cola de milano metida hasta el tope
export const bolaEnCuna = (p, bolaM) => { const K = CUNA, xe = p.ancho / 2 - K.AP + K.MUR, xm = -xe - K.ENCH; return bolaM.rotate([0, 90, 0]).translate([xm - BOLA_TOPE, 0, K.LCOLA - 7.1]); };
// el móvil (para comprobar): un ladrillo con los cantos redondeados, la espalda en z = ZP
export const movilDe = (W, T, L = 160) => CS().square([W - T, L], true).offset(T / 2 - 0.01, 'Round', 2, 48).extrude(T).translate([0, 0, CUNA.ZP]);

// ======================= 🗿 LA PEANA ESCULTÓRICA =======================
// Una campana de 8 lóbulos (Ø140) que sube girando y sigue en columna salomónica hasta la copa. Hueca (paredes a 45°, sin soportes).
// Con un móvil grande de pie (230 g): maciza aguanta inclinada unos 50°; con el relleno normal pesa menos, por eso se llena de arena por el
// tapón de abajo (caben unos 180 g): así aguanta la rótula a tope (40°) con cualquier relleno (calculado en test/unit/bambu.mjs). Tapón a presión.
export const PEANA = { RB: 70, RT: 11, HB: 59, LOB: 8, TAPON: 24 };
// el radio del hueco abajo: lo marca el VALLE entre lóbulos (0,76 del radio), no el radio medio; si no, el hueco atraviesa la pared y salen
// ventanas entre los lóbulos (pasó el 17-10: la arena se habría salido). Hacia arriba la pared engorda (el hueco cierra a 45°, el valle más
// despacio): la más fina es la de abajo, de PARED_PEANA mm.
export const PARED_PEANA = 2.7;
export const HUECO_R0 = 0.76 * PEANA.RB * (1 - (1 - PEANA.RT / PEANA.RB) * 2.4 / PEANA.HB) - PARED_PEANA;
const estrella = R => { const P = []; for (let i = 0; i < 160; i++) { const a = i / 160 * 2 * Math.PI; const r = R * (0.88 + 0.12 * Math.cos(PEANA.LOB * a)); P.push([r * Math.cos(a), r * Math.sin(a)]); } return poli(P); };
export function peanaMedidas(p) { const K = PEANA, H = Math.max(40, Math.min(110, Number(p.alto) || 80)), zCol = K.HB + H, zc = zCol + ROT.PISO + ROT.RC; return { H, zCol, zc, giro: Number(p.giro) || 180 }; }
export function peana(p) {
  const K = PEANA, Q = peanaMedidas(p), g1 = 40;
  let m = estrella(K.RB).extrude(K.HB, 96, g1, [K.RT / K.RB, K.RT / K.RB]);
  m = m.add(estrella(K.RT).rotate(g1).extrude(Q.H + 0.02, Math.max(32, Math.round(Q.H * 1.2)), Q.giro).translate([0, 0, K.HB - 0.01]));
  // de la columna a la copa: un ensanche suave (40°)
  m = m.add(cono(K.RT * 0.88, R_MIN, Q.zCol - 3, Q.zCol + 0.01, 96));
  m = m.add(copa(Q.zc).m);
  // hueca por dentro (el techo a 45°) y el agujero del tapón (con su escalón, para que quede a ras)
  m = m.subtract(cono(HUECO_R0, 0.5, 2.4, 2.4 + HUECO_R0 - 0.5, 128));
  m = m.subtract(cil(K.TAPON / 2, -1, 2.5, 64)).subtract(cil(K.TAPON / 2 + 3, -1, 1.2, 64));
  return m;
}
// el tapón: entra a presión (0,1 mm), a ras de la base; con una ranura para sacarlo con una moneda
export function tapon() {
  const K = PEANA;
  return cil(K.TAPON / 2 + 3 - 0.15, 0, 1.2, 64).add(cil(K.TAPON / 2 + 0.1, 1.19, 2.4, 64)).add(cono(K.TAPON / 2 + 0.1, K.TAPON / 2 - 0.3, 2.39, 2.8, 64)).subtract(caja(-6, 6, -0.6, 0.6, -1, 0.8));
}

// ======================= 🐦 PINZA DE BOBINA (pájaro) =======================
// Se posa en el borde de la bobina (las patas son una pinza para un canto de 1,5 a 3 mm) y sujeta la punta del filamento en el pico
// (una ranura de 1,5 mm que lo aprieta, con su agujerito al fondo). Plana: se imprime tumbada en 5 minutos.
export function pajaro(p) {
  const g = Math.max(1.2, Math.min(4, Number(p.canto) || 2.2)), e = 5;
  let s2 = CS().circle(1, 64).scale([17, 10]).translate([0, 10]);                       // el cuerpo
  s2 = s2.add(CS().circle(7.5, 48).translate([13, 19]));                               // la cabeza
  s2 = s2.add(poli([[19, 22], [30, 19.5], [19.5, 15.5]]));                              // el pico
  s2 = s2.add(poli([[-14, 12], [-27, 21], [-24, 9], [-28, 3], [-15, 6]]));              // la cola
  s2 = s2.add(poli([[-6, 14], [6, 15], [-2, 24]]));                                     // el ala, levantada
  s2 = s2.subtract(CS().circle(1.3, 24).translate([15, 21]));                          // el ojo
  // las patas: una pinza para el canto de la bobina (con un bultito que la sujeta)
  const pata = CS().square([g + 5.2, 15]).translate([-g / 2 - 2.6, -14]); // (dos patas de 2,6: flexan lo justo)
  s2 = s2.add(pata).subtract(CS().square([g, 13.1]).translate([-g / 2, -14.1])).add(CS().circle(0.45, 16).translate([g / 2 + 0.2, -10])).add(CS().circle(0.45, 16).translate([-g / 2 - 0.2, -10]));
  // el pico: la ranura del filamento (1,5 mm: lo aprieta) y el agujero de Ø1,9 al fondo
  s2 = s2.subtract(poli([[30.5, 19.5], [20.5, 19.25], [20.5, 17.75], [30.5, 18]])).subtract(CS().circle(0.95, 24).translate([20.5, 18.5]));
  return s2.extrude(e);
}

// ======================= 🗂️ SOPORTE DE PLACAS =======================
// Peine con ranuras de 2,6 mm inclinadas 8° (las placas quedan apoyadas, sin caerse): de 2 a 6 placas. La base es la de la A1 mini
// (180) o la de la A1 / P1P (256): solo cambia lo ancho del peine.
export function rackPlacas(p) {
  const nP = Math.max(2, Math.min(6, Math.round(Number(p.placas) || 4))), paso = 14, L = nP * paso + 16, W = p.placa === '180' ? 70 : 90, H = 24, ranura = 2.6, inc = 8;
  let m = M().hull([caja(0, L, 0, W, 0, 4), caja(3, L - 3, 3, W - 3, H - 0.01, H)]);
  for (let i = 0; i < nP; i++) { const x = 10 + i * paso + paso / 2; m = m.subtract(caja(-ranura / 2, ranura / 2, -1, W + 1, 0, H + 20).rotate([0, -inc, 0]).translate([x, 0, 5])); }
  return m;
}

// ======================= 🧵 PORTABOBINAS DE RODILLOS (17-10, noche) =======================
// Para imprimir desde FUERA de la impresora (o desde una caja secadora): la bobina se apoya en dos RODILLOS que giran sobre sus EJES y no
// frena el filamento. Marco de una pieza con paredes onduladas y calado de hexágonos (que se vea bonito en la mesa), agujeros en LÁGRIMA
// (sin soportes), un aro guía para el filamento y los ejes con cabeza que entran a presión por un lado. Holguras de sus Bambu: el rodillo gira
// con 0,3 mm por lado (0,15 «gira» + lo que cierran sus agujeros), el eje entra a presión en un lado (0,05) y suelto en el otro.
export const RODB = { D: 200, S: 55, H: 17, RR: 11, EJE: 8, HOL: 0.3, PRES: 0.05, PARED: 4, HUECO: 3, CAB: 2 };
const lagrima = (r, x, z, y0, y1) => perfilY(CS().circle(r, 48).add(poli([[-r * Math.SQRT1_2, r * Math.SQRT1_2], [0, r * Math.SQRT2], [r * Math.SQRT1_2, r * Math.SQRT1_2]])).translate([x, z]), y0, y1);
export function rodillosMedidas(p) { const K = RODB, Wb = Math.max(40, Math.min(90, Number(p.ancho) || 68)), Wi = Wb + 2 * K.HUECO; return { Wb, Wi, y0: -Wi / 2 - K.PARED, y1: Wi / 2 + K.PARED }; }
export function marcoRodillos(p) {
  const K = RODB, Q = rodillosMedidas(p);
  // la pared: una ola alrededor de cada eje sobre una peana baja, con un lomo en el centro y su calado de hexágonos
  let pr = CS().square([2 * K.S + 50, 5]).translate([-(K.S + 25), 0]);
  [-1, 1].forEach(s => { pr = pr.add(CS().hull([CS().circle(K.RR + 5.5, 48).translate([s * K.S, K.H]), CS().square([34, 1]).translate([s * K.S - 17, 0])])); });
  pr = pr.add(CS().hull([CS().circle(10, 48).translate([0, 12]), CS().square([2 * K.S, 1]).translate([-K.S, 0])]));
  for (let i = -2; i <= 2; i++) pr = pr.subtract(CS().circle(2.8, 6).translate([i * 8, 9]));
  const pared = (a, b) => perfilY(pr, a, b);
  let m = pared(Q.y0, Q.y0 + K.PARED).add(pared(Q.y1 - K.PARED, Q.y1));
  // dos travesaños abajo (no tocan la bobina, que queda a ~13 mm del suelo)
  [-1, 1].forEach(s => { m = m.add(caja(s * K.S - 12, s * K.S + 12, Q.y0, Q.y1, 0, 4)); });
  // los ejes: a presión en la pared de atrás (−y) y sueltos en la de delante, en lágrima (sin soportes)
  [-1, 1].forEach(s => { m = m.subtract(lagrima(K.EJE / 2 - K.PRES, s * K.S, K.H, Q.y0 - 1, Q.y0 + K.PARED + 0.5)).subtract(lagrima(K.EJE / 2 + 0.15, s * K.S, K.H, Q.y1 - K.PARED - 0.5, Q.y1 + 1)); });
  // el aro guía del filamento (Ø3 por dentro: el de 1,75 pasa suelto), en el lomo de la pared de delante
  m = m.add(cil(6, 0, 3, 48).subtract(cil(1.5, -1, 4, 32)).rotate([-90, 0, 0]).translate([0, Q.y1 - 3, 27])).add(caja(-2.5, 2.5, Q.y1 - 3, Q.y1, 19, 22));
  return m;
}
// un rodillo (de pie): tubo de Ø22 con el agujero del eje 0,3 mm más ancho por lado y un chaflán arriba y abajo
export function rodillo(p) { const K = RODB, Q = rodillosMedidas(p), L = Q.Wi - 1; return cono(K.RR - 1, K.RR, 0, 1, 64).add(cil(K.RR, 1 - 0.01, L - 1 + 0.01, 64)).add(cono(K.RR, K.RR - 1, L - 1, L, 64)).subtract(cil(K.EJE / 2 + K.HOL, -1, L + 1, 48)); }
// un eje (de pie, con la cabeza abajo): atraviesa las dos paredes; la cabeza queda por fuera de la pared de delante
export function ejeRodillo(p) { const K = RODB, Q = rodillosMedidas(p), L = Q.Wi + 2 * K.PARED - 0.5; return cil(K.EJE / 2 + 2.5, 0, K.CAB, 48).add(cil(K.EJE / 2, K.CAB - 0.01, K.CAB + L - 0.59, 48)).add(cono(K.EJE / 2, K.EJE / 2 - 0.6, K.CAB + L - 0.6, K.CAB + L, 48)); }
// para comprobar: las piezas en su sitio y la bobina apoyada (baja = cuánto se hunde: 0 = justo tocando)
export const rodilloEn = (p, s) => { const K = RODB, Q = rodillosMedidas(p); return rodillo(p).rotate([90, 0, 0]).translate([s * K.S, Q.Wi / 2 - 0.5, K.H]); };
export const ejeEn = (p, s) => { const K = RODB, Q = rodillosMedidas(p); return ejeRodillo(p).rotate([90, 0, 0]).translate([s * K.S, Q.y1 + K.CAB, K.H]); };
export const centroBobina = () => RODB.H + Math.sqrt((RODB.D / 2 + RODB.RR) ** 2 - RODB.S ** 2);
export function bobinaEn(p, baja = 0) { const K = RODB, Q = rodillosMedidas(p), zc = centroBobina() - baja; return cil(K.D / 2, -Q.Wb / 2, Q.Wb / 2, 180).subtract(cil(27.5, -Q.Wb, Q.Wb, 64)).rotate([90, 0, 0]).translate([0, 0, zc]); }

// ======================= el catálogo =======================
const VER = 'Comprobado montado en el ordenador';
export const DISENOS_BAMBU = {
  rotulaTimelapse: { cat: 'impresora3d', tambien: ['regalos'], e: '🎥', t: 'Rótula de cámara para grabar tus impresiones (móvil, GoPro o cámara)', d: 'Peana escultórica en espiral con una rótula de verdad: floja gira 45° y da la vuelta entera; con la tuerca apretada queda fija. Cabezales que se cambian: móvil a medida, GoPro y tornillo de 1/4"', uso: 'funcional', color: '#2b2b33', nuevo: true,
    campos: [s('que', 'Qué sacar', 'todo', [['todo', 'Todo el kit (en la cama)'], ['peana', 'La peana (con la copa)'], ['tuerca', 'La tuerca'], ['tapon', 'El tapón'], ['bolaMovil', 'La bola para el móvil'], ['cuna', 'La cuna del móvil'], ['bolaGopro', 'La bola GoPro'], ['bolaRosca', 'La bola con tornillo de 1/4"']]),
      n('ancho', 'Móvil: ancho CON funda', 78, 60, 95, 0.1), n('grueso', 'Móvil: grueso CON funda', 11, 7, 16, 0.1), n('alto', 'Alto de la columna', 80, 40, 110, 1), n('giro', 'Giro de la espiral', 180, 0, 360, 15, '°')],
    gen: p => {
      const P = {
        peana: () => peana(p), tuerca: () => tuerca(), tapon: () => tapon(), bolaMovil: () => bola('cola'), cuna: () => cunaMovil(p), bolaGopro: () => bola('gopro'), bolaRosca: () => bola('rosca')
      };
      if (P[p.que]) return P[p.que]();
      // todo el kit en la cama (la peana en el centro y lo demás alrededor)
      const L = [[peana(p), 0, 0], [tuerca(), 100, -45], [tapon(), 100, 0], [bola('cola'), 100, 40], [bola('gopro'), -100, -45], [bola('rosca'), -100, 0], [cunaMovil(p).rotate([0, 0, 90]), -100, 75]];
      return N.union(L.map(([m, x, y]) => { const b = N.caja(m); return m.translate([x - (b.min[0] + b.max[0]) / 2, y - (b.min[1] + b.max[1]) / 2, -b.min[2]]); }));
    },
    nota: p => { const Q = peanaMedidas(p); return 'Siete piezas, todas sin soportes: la peana (' + n1(Q.zc + 3) + ' mm de alto, de pie), la tuerca, el tapón, tres bolas (móvil, GoPro y 1/4") y la cuna del móvil (tumbada). Monta: enrosca la tuerca floja en la copa, mete la bola a presión desde arriba (clic), apunta y aprieta la tuerca. Llénala de arena por el tapón de abajo (caben unos 180 g; de arroz, unos 100): así no vuelca ni con un móvil grande y la rótula a tope (40°), aunque la imprimas con poco relleno. Sin arena, impresa maciza, aguanta unos 50°. El kit entero cabe en la cama de la A1 y la P1P; en la A1 mini, saca las piezas de una en una (la peana sola sí cabe: Ø140). Mide tu móvil CON la funda con el pie de rey y pon esas medidas: la cuna lo sujeta con 0,2 mm de apriete; colócala donde no pise los botones. Para grabar el crecimiento: en Bambu Studio activa «Timelapse» (modo «suave» usa torre de purga) o graba vídeo y acelera; ' + VER + '.'; } },
  pinzaBobina: { cat: 'impresora3d', tambien: ['regalos'], e: '🐦', t: 'Pinza de bobina pájaro (sujeta la punta del filamento)', d: 'Se posa en el borde de la bobina y aguanta la punta del filamento con el pico: se acabaron los enredos', uso: 'funcional', color: '#f2b705', nuevo: true,
    campos: [n('canto', 'Grueso del borde de tu bobina', 2.2, 1.2, 4, 0.1)],
    gen: p => pajaro(p),
    nota: p => 'Plana, sin soportes (5 minutos). Mide el borde de tu bobina con el pie de rey y pon ese grueso (' + n1(Number(p.canto) || 2.2) + ' mm): las patas la pellizcan con dos bultitos. Mete la punta del filamento por la ranura del pico hasta el agujerito. ' + VER + '.' },
  rodillosBobina: { cat: 'impresora3d', tambien: ['organizar'], e: '🧵', t: 'Portabobinas de rodillos (la bobina gira sola)', d: 'Para imprimir con la bobina fuera de la impresora o desde una caja secadora: dos rodillos que giran sobre sus ejes, paredes onduladas con calado y aro guía del filamento', uso: 'funcional', color: '#2f6f6a', nuevo: true,
    campos: [s('que', 'Qué sacar', 'todo', [['todo', 'Todo (marco, 2 rodillos y 2 ejes)'], ['marco', 'El marco'], ['rodillo', 'Un rodillo (imprime 2)'], ['eje', 'Un eje (imprime 2)']]), n('ancho', 'Ancho de tu bobina', 68, 40, 90, 1)],
    gen: p => { if (p.que === 'marco') return marcoRodillos(p); if (p.que === 'rodillo') return rodillo(p); if (p.que === 'eje') return ejeRodillo(p);
      const L = [[marcoRodillos(p), 0, 0], [rodillo(p), -45, 66], [rodillo(p), -15, 66], [ejeRodillo(p), 15, 66], [ejeRodillo(p), 45, 66]];
      return N.union(L.map(([m, x, y]) => { const b = N.caja(m); return m.translate([x - (b.min[0] + b.max[0]) / 2, y - (b.min[1] + b.max[1]) / 2, -b.min[2]]); })); },
    nota: p => { const Q = rodillosMedidas(p); return 'Cinco piezas sin soportes (caben juntas en la A1 mini): el marco, 2 rodillos y 2 ejes, todos de pie. Monta: pon un rodillo entre las paredes, mete el eje por la pared de delante (la del aro), atraviesa el rodillo y empújalo hasta que entre a presión en la de atrás; igual con el otro. Para bobinas de ' + Q.Wb + ' mm de ancho (las de 1 kg de Bambu miden unos 66–68): mide la tuya y ponlo. El filamento sale por el aro de delante. ' + VER + '.'; } },
  rackPlacas: { cat: 'impresora3d', tambien: ['organizar'], e: '🗂️', t: 'Soporte de placas de la cama (A1 mini, A1 y P1P)', d: 'Guarda de pie hasta 6 placas, un poco inclinadas: limpias, sin rayarse y a mano', uso: 'funcional', color: '#3a3f4a', nuevo: true,
    campos: [s('placa', 'Placas de', '180', [['180', 'A1 mini (180 mm)'], ['256', 'A1 / P1P (256 mm)']]), n('placas', 'Cuántas placas', 4, 2, 6, 1, 'ud')],
    gen: p => rackPlacas(p),
    nota: () => 'De pie, sin soportes. Ranuras de 2,6 mm inclinadas 8°: la placa entra con holgura y queda apoyada. ' + VER + '.' }
};
