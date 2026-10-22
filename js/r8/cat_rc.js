// ================= 19-10-2026 · 🏎️ COCHE RC DE DRIFT POR PIEZAS: el kit entero, solo pones los componentes =================
// Ella (18-10): «puede hacer coche rc con su dirección, su transmisión, todo el kit, solamente poner la batería que tú digas, el receptor,
// la posición del motor, todo soporte de varilla, todo casi solo poner componentes; las ruedas también ya diseñadas con sus neumáticos
// lisos para drift; hazle dibujo completo».
//
// CÓMO ES (≈ 1/16; x hacia delante, y a la izquierda, z hacia arriba; el suelo en z = 0):
//  · CHASIS de placa (3,5 mm) con: el hueco y los postes del SERVO, la bandeja de la BATERÍA (con ranuras para su correa), dos plataformas
//    para el VARIADOR (ESC) y el RECEPTOR (ranuras de bridas), las ranuras de la caja de cambios y de los portamanguetas, y los postes de
//    la carrocería.
//  · DIRECCIÓN de verdad: dos PORTAMANGUETAS en «C» con su PIVOTE, dos MANGUETAS con su mangueta (eje de la rueda) y su brazo, dos
//    BIELETAS y el BRAZO DEL SERVO en T: Ackermann (la rueda de dentro gira más: 40° y 31° con el servo a 45°); un PUENTE une los portamanguetas.
//  · TRANSMISIÓN atrás (tracción trasera, como los de drift de ahora): CAJA de dos placas con sus separadores; MOTOR 370 en la placa
//    izquierda (2 tornillos M2,6, los del motor); dos etapas de ENGRANAJES de evolvente (módulo 1): piñón 10 → 32 · 12 → 34 (9,07 : 1);
//    EJE TRASERO BLOQUEADO (el «spool» de drift) con los HEXÁGONOS de 12 mm de las ruedas; TAPA de los engranajes.
//  · RUEDAS de drift (las de `ruedaDrift`): llanta con bombeo y NEUMÁTICO DURO Y LISO (PLA/PETG: en drift tiene que deslizar).
//  · PARAGOLPES delante y detrás. En «montado» salen los componentes en gris (motor, servo, batería, variador, receptor) y en
//    «despiece», todo separado: el DIBUJO DE MONTAJE.
// Holguras de sus Bambu (por lado): 0,05 a presión · 0,10 encaja · 0,2 gira.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';
import * as B from './cat_bici.js';
import * as G from './engranajes.js';
import { DISENOS_51 } from './cat_51.js';
import { fase } from './cat_engranajes.js';

const { n, s, tx, M, CS, circ, rr, poli, cil, caja, n2, conBisel } = A;
const { PRES, JUSTO, GIRA } = B, U = B.UTIL;
const { sum, dif, lon, uni, en, entre, R2, perfilD, varilla, capsula, M4 } = U;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), dirA = g => [Math.cos(g * R2), Math.sin(g * R2)];
// un perfil 2D (u, v) puesto de lado: u = x, v = z, a lo largo de y de y0 a y1
const deLado = (cs, y0, y1, x = 0, z = 0) => cs.extrude(y1 - y0).rotate([90, 0, 0]).translate([x, y1, z]);
// un sólido hecho a lo largo de z (su cara z = 0 en y = yc): hacia −y (k = −1) o hacia +y (k = +1), con el centro (x, z)
const aLoAncho = (m, yc, k, x = 0, z = 0) => (k < 0 ? m.rotate([90, 0, 0]) : m.rotate([90, 0, 0]).mirror([0, 1, 0])).translate([x, yc, z]); // (las dos con el mismo (x, z): las caras planas de los ejes, abajo)
const varY = (d, y0, y1, x, z) => deLado(perfilD(d), y0, y1, x, z); // una varilla de lado (su cara plana abajo)

// ---------- los COMPONENTES (lo que se compra; medidas HABITUALES, ESTIMADAS: mídelos) ----------
export const COMPONENTES = {
  motor: { t: 'Motor 370 de escobillas (Ø24,4 × 30,5; eje de 2 mm; 2 tornillos M2,6 a 17 mm)', D: 24.4, L: 30.5, eje: 2, ejeL: 10, boss: 10, bossH: 1.5, sep: 17, tor: 2.6, cola: 3 },
  servo: { t: 'Micro servo SG90 o MG90S (9 g, el MG90S con engranajes de metal aguanta más)', L: 22.8, A: 12.4, H: 22.5, orejas: 32.3, sep: 27.8, zOreja: 15.9, eOreja: 2.5, ejeX: 5.9, estria: 4.8, altoEje: 4 },
  bateria: { t: 'LiPo 2S de 7,4 V y 800–1300 mAh (como mucho 72 × 35 × 20)', L: 72, W: 35, H: 20 },
  esc: { t: 'Variador (ESC) de escobillas 1/16–1/18 (como mucho 45 × 22 × 20)', L: 45, W: 22, H: 20 },
  receptor: { t: 'Receptor de 2,4 GHz de 2–3 canales (como mucho 40 × 22 × 13)', L: 40, W: 22, H: 13 }
};
// los ENGRANAJES (módulo 1): piñón del motor → loco grande · loco pequeño → corona del eje
export const TREN = { m: 1, zp: 10, zb: 32, zs: 12, za: 34, b: 3.5, juego: 0.15 };
export const relacion = () => (TREN.zb / TREN.zp) * (TREN.za / TREN.zs);

// ---------- las MEDIDAS ----------
export function medidasRC(p) {
  const D = clamp(+p.rueda || 52, 44, 64), WB = clamp(+p.batalla || 170, Math.max(150, 138 + D / 2), 180), via = clamp(+p.via || 96, 86, 110); // (la batería tiene que caber entre la caja y la rueda de delante; el chasis, en la cama)
  const W = Math.round(D * 0.42), bombeo = 4, tope = 1.2, Wn = W - tope - 0.3, zA = D / 2, yWo = via / 2 + Wn / 2;
  const zRad = Math.min(bombeo, W - 3.2 - 6), hubTop = Math.max(zRad + 3.2 + 2 + 5, W * 0.6); // (como en la rueda de drift: la cara del cubo hacia dentro)
  const zP0 = 4, zP1 = 7.5, yP = Math.max(17.5, yWo - W - 13.7), yPo = yP + 3, y1 = yPo + 0.4, y2 = yPo + 4.2, yC = yPo + 8.2; // chasis · caja de cambios: placas, los dos planos de engranajes y la tapa
  const T = TREN, dI = T.m * (T.zs + T.za) / 2, dM = T.m * (T.zp + T.zb) / 2, AX = [0, zA], I = sum(AX, dirA(35), dI), MO = sum(I, dirA(10), dM);
  const S1 = [-8, zA + 22], S2 = [MO[0] + 12.5, zP1 + 10.5]; // los separadores de la caja
  // delante: el pivote (portamangueta) justo por dentro de la rueda; la altura de las bieletas la manda el servo
  const yK = yWo - hubTop - 10.3, zT = Math.max(zA + 7.5, 31.5), alfa = Math.atan2(yK, WB) / R2, La = 11, brazo = [-La * Math.cos(alfa * R2), La * Math.sin(alfa * R2)]; // (el brazo, hacia atrás y un poco hacia FUERA: con las bieletas de lado y el brazo del servo en T sale el Ackermann bueno: 40° la rueda de dentro y 31° la de fuera)
  const Sv = COMPONENTES.servo, hH = 9, xS = WB + brazo[0] + hH, zSb = zT - 27.7, xSc = xS - (Sv.L / 2 - Sv.ejeX); // el brazo del servo apunta hacia atrás (hH): sus agujeros, a la altura de los brazos de las manguetas
  const Bt = COMPONENTES.bateria, xB1 = WB - D / 2 - 10, xB0 = xB1 - Bt.L - 2; // (la bandeja acaba antes de donde barre la rueda de delante al girar)
  return { D, WB, via, W, Wn, bombeo, tope, zA, yWo, hubTop, zP0, zP1, yP, yPo, y1, y2, yC, AX, I, MO, S1, S2, yK, zT, alfa, La, brazo, xS, hH, zSb, xSc, xB0, xB1, rueda: { D, W, bombeo, estilo: p.llanta || 'r5d', dibujo: 'liso', hex: 12, eje: 6, prueba: false } };
}

// ---------- 1) RUEDAS (las de la rueda de drift), HEXÁGONOS, TAPAS ----------
export const llantaRC = Q => Q._ll || (Q._ll = DISENOS_51.ruedaDrift.gen(Object.assign({}, Q.rueda, { que: 'llanta' }))); // (una vez por coche: es lenta)
export const neumaticoRC = Q => Q._ne || (Q._ne = DISENOS_51.ruedaDrift.gen(Object.assign({}, Q.rueda, { que: 'neumatico' })));
// lo que va A PRESIÓN a propósito (se pisa un poco montado): el neumático en su llanta y el brazo del servo en su estría
export const aPresion = (a, b) => { const k = [a, b].sort().join('|'), m = k.match(/^llanta(Tr|De)([ID])\|neum(Tr|De)([ID])$/); return (!!m && m[1] === m[3] && m[2] === m[4]) || k === 'brazoServo|servo'; };
// el HEXÁGONO de 12 (entra 5 en la llanta) con su separador redondo; detrás, a presión en el eje (gira con él); delante, gira en su mangueta
export function hexagono(Q, largo, trasero) { const h = 4.9; let m = cil(10, largo - h + 0.01).add(B.hexCS(12).extrude(h).translate([0, 0, largo - h]));
  return trasero ? m.subtract(perfilD(6, PRES).extrude(largo + 2).translate([0, 0, -1])) : m.subtract(cil(6 + 2 * GIRA, largo + 2, -1)); }
export const tapaRC = () => conBisel(circ(12.6), 3.5, 0.6).subtract(perfilD(6, PRES).extrude(3).translate([0, 0, 0.8])); // (3,5: 0,2 de aire con el fondo del hueco de la llanta) // la «tuerca» de la rueda: en el hueco de la cara de la llanta
// dónde va cada cosa a lo ancho (lado izquierdo; el derecho, igual en negativo)
export const ancho = Q => { const a1 = Q.yWo - Q.hubTop + 4.9; return { cara: Q.yWo, cubo: Q.yWo - Q.hubTop, hexFin: a1, tapa: Q.yWo - 0.3, ejeFin: Q.yWo - 1.2,
  hexTrI: Q.yC + 2 + 0.3, hexTrD: Q.yPo + 0.3, hexDe: Q.yK + 8.3 }; };

// ---------- 2) la CAJA DE CAMBIOS: placas, tapa, engranajes, ejes ----------
const perfilCaja = Q => CS().hull([circ(2 * 20.3).translate(Q.AX), circ(2 * 19.3).translate(Q.I), circ(2 * 15).translate(Q.MO), circ(10).translate(Q.S1), circ(10).translate(Q.S2)]).intersect(rr(400, 400).translate([0, Q.zP1 + 200]));
export const pasadoresTapa = Q => [sum(Q.AX, [-1, 0], 20.3 - 1.2), sum(Q.I, [0, 1], 19.3 - 1.2), sum(Q.MO, [1, 0], 9 - 1.2)];
// una placa (de lado: x, z) · la izquierda lleva el motor, el eje del loco y los pasadores de la tapa
export function placaCaja(Q, izq) { const C = COMPONENTES.motor;
  // con dos lengüetas para el chasis. 20-10 noche: la de delante quedaba SUELTA (el borde de la placa pasa por encima de ella: la placa salía en 2 trozos y
  // la lengüeta se habría caído al imprimir); ahora cada lengüeta sube hasta tocar la placa (la envolvente de la lengüeta y la placa en su franja de 8 mm)
  const pf = perfilCaja(Q), leng = x => { const t = rr(8, 3.5).translate([x, Q.zP1 - 1.75]), arriba = pf.intersect(rr(8, 200).translate([x, Q.zP1 + 100])); return arriba.isEmpty() ? t : CS().hull([t, arriba]); };
  let cs = pf.add(leng(-6)).add(leng(Q.S2[0] - 8));
  cs = cs.subtract(circ(6 + 2 * GIRA).translate(Q.AX)).subtract(perfilD(5, PRES).translate(Q.S1)).subtract(perfilD(5, PRES).translate(Q.S2));
  if (izq) cs = cs.subtract(circ(C.boss + 2 * JUSTO).translate(Q.MO)).subtract(circ(C.tor + 0.3).translate(sum(Q.MO, [0, 1], C.sep / 2))).subtract(circ(C.tor + 0.3).translate(sum(Q.MO, [0, -1], C.sep / 2))).subtract(perfilD(4, PRES).translate(Q.I));
  let m = deLado(cs, Q.yP, Q.yP + 3);
  if (izq) pasadoresTapa(Q).forEach(q => { m = m.subtract(deLado(circ(B.PIN + 2 * PRES), Q.yPo - 2, Q.yPo + 0.01, q[0], q[1])); }); // ciegos, desde fuera
  return m; }
// la TAPA de los engranajes: la cara y su pared, hasta la placa; el eje la atraviesa y el eje del loco acaba en ella
export function tapaCaja(Q) { const cs = perfilCaja(Q).intersect(CS().hull([circ(2 * 20.3).translate(Q.AX), circ(2 * 19.3).translate(Q.I), circ(2 * 9).translate(Q.MO)])).intersect(rr(400, 400).translate([0, Q.zP1 + 0.1 + 200]));
  const rc = TREN.m * (TREN.za + 2) / 2 + 0.5; let m = deLado(cs, Q.yC, Q.yC + 2).add(deLado(cs.subtract(cs.offset(-1.6, 'Round')).subtract(circ(2 * rc).translate(Q.AX)), Q.yPo + 0.2, Q.yC + 0.01)); // (la pared, abierta donde pasa la corona) // (la pared, abierta por abajo: ahí pasa la corona, a 0,5 del chasis)
  m = m.subtract(deLado(circ(6 + 2 * GIRA), Q.yC - 1, Q.yC + 3, Q.AX[0], Q.AX[1])).subtract(deLado(perfilD(4, PRES), Q.yC - 0.01, Q.yC + 1.2, Q.I[0], Q.I[1]));
  pasadoresTapa(Q).forEach(q => { m = m.subtract(deLado(circ(B.PIN + 2 * PRES), Q.yPo + 0.19, Q.yPo + 2.7, q[0], q[1])); });
  return m; }
// ENGRANAJES (de evolvente, módulo 1, 0,15 de juego): hechos a lo largo de z (se imprimen así)
const rueda2D = z => G.perfilEngranaje2D({ por: 'modulo', m: TREN.m, z, alfa: 20, juego: TREN.juego });
export function pinonRC() { return rueda2D(TREN.zp).cs.subtract(circ(COMPONENTES.motor.eje)).extrude(TREN.b); } // (agujero de 2 justo: si entra flojo, una gota de pegamento)
export function locoRC() { const g1 = rueda2D(TREN.zb).cs, g2 = rueda2D(TREN.zs).cs, h = circ(4 + 2 * GIRA); return g1.subtract(h).extrude(TREN.b).add(g2.subtract(h).extrude(TREN.b + 0.3).translate([0, 0, TREN.b - 0.01])); }
export function coronaRC(Q) { const h = perfilD(6, PRES); return rueda2D(TREN.za).cs.subtract(h).extrude(TREN.b).add(circ(10).subtract(h).extrude(Q.y2 - Q.y1 + 0.01).translate([0, 0, TREN.b - 0.01])); }
export const largoLoco = Q => Q.yC + 1.2 - Q.yP - 0.05;

// ---------- 3) la DIRECCIÓN: portamanguetas, manguetas, bieletas, brazo del servo, puente ----------
const ZK = Q => ({ b0: Q.zA - 8.4, b1: Q.zT - 0.1, eA0: Q.zA - 12, eA1: Q.zA - 8.5, eB0: Q.zT, eB1: Q.zT + 3.5 }); // la mangueta (b) y las orejas del portamangueta (abajo, arriba)
// el PORTAMANGUETA (lado izquierdo): un perfil en (y, z) de 8 de grueso en x; se imprime tumbado sobre ese perfil
export function portamanguetaPerfil(Q) { const { yK, zP1 } = Q, z = ZK(Q), r = 3.5;
  const post = rr(4, z.eB1 + 2 - zP1).translate([yK - 9, (z.eB1 + 2 + zP1) / 2]), pie = rr(7, 3).translate([yK - 10.5, zP1 + 1.5]); // (el poste, 7 por dentro del pivote: el brazo de la mangueta no lo toca al girar)
  const oreja = (z0, z1) => CS().hull([rr(1, z1 - z0).translate([yK - 10.5, (z0 + z1) / 2]), circ(2 * r).translate([yK, (z0 + z1) / 2]).intersect(rr(2 * r, z1 - z0).translate([yK, (z0 + z1) / 2]))]);
  return N.csUnion([post, pie, oreja(z.eA0, z.eA1), oreja(z.eB0, z.eB1)]); }
const mPorta = Q => M4([0, 1, 0], [0, 0, 1], [1, 0, 0], [Q.WB - 4, 0, 0]); // (y, z, grueso) → la moto… el coche
export function portamanguetaImp(Q) { const { yK } = Q, z = ZK(Q), rh = (3 + 2 * PRES) / 2;
  let m = conBisel(portamanguetaPerfil(Q), 8, 0.6);
  m = m.subtract(M().hull([cil(2 * rh, z.eB1 - z.eA0 + 2), cil(0.1, z.eB1 - z.eA0 + 2).translate([0, -rh * Math.SQRT2, 0])]).rotate([-90, 0, 0]).translate([yK, z.eA0 - 1, 4])); // el pivote (en gota hacia arriba: tumbado)
  [Q.yK - 12.5, Q.yK - 8.5].forEach(y => { m = m.subtract(cil(B.PIN + 2 * PRES, 4.02, 0).rotate([-90, 0, 0]).translate([y, Q.zP1 - 1, 4])); }); // pasadores al chasis
  [Q.yK - 9].forEach(y => { m = m.subtract(cil(B.PIN + 2 * PRES, 3.5, 0).rotate([90, 0, 0]).translate([y, z.eB1 + 2.01, 4])); }); // pasador al puente
  return m; }
export const portamangueta = Q => N.transforma(portamanguetaImp(Q), mPorta(Q));
// la MANGUETA (lado izquierdo, en su sitio): el cilindro del pivote, el bloque de la mangueta y el brazo (arriba); se imprime boca abajo
export function mangueta(Q) { const { WB, yK, zA } = Q, z = ZK(Q), K = [WB, yK], H = Q.brazo;
  let m = cil(8, z.b1 - z.b0, z.b0).translate([K[0], K[1], 0]);
  m = m.add(conBisel(rr(8, 8, 1.5), z.b1 - (zA - 4), 0.5).translate([WB, yK + 4, zA - 4])); // el bloque de la mangueta (hasta arriba: boca abajo sale sin soportes)
  m = m.add(conBisel(capsula(K, sum(K, H), 6, 5), 3, 0.5).translate([0, 0, z.b1 - 3])); // el brazo (Ackermann)
  m = m.subtract(cil(3 + 2 * GIRA, z.b1 - z.b0 + 2, z.b0 - 1).translate([K[0], K[1], 0])); // gira en su pivote
  m = m.subtract(varY(6 + 2 * PRES, yK + 2.5, yK + 9, WB, zA)); // la mangueta, a presión
  const q = sum(K, H); return m.subtract(cil(B.PIN + 2 * PRES, 5, z.b1 - 4).translate([q[0], q[1], 0])); }
export const largoMangueta = Q => ancho(Q).ejeFin - (Q.yK + 2.6);
// la BIELETA: plana, dos ojos; el pasador del ojo, a presión en el brazo (de la mangueta o del servo) y el ojo gira en él
export const largoBieleta = Q => Math.hypot(Q.WB + Q.brazo[0] - (Q.xS - Q.hH), Q.yK + Q.brazo[1] - SEP_BIEL);
export function bieleta(Q) { const L = largoBieleta(Q); return conBisel(capsula([0, 0], [L, 0], 5.4, 4.2).add(circ(5.4).translate([L, 0])), 2.5, 0.4).subtract(cil(B.PIN + 2 * GIRA, 4, -1)).subtract(cil(B.PIN + 2 * GIRA, 4, -1).translate([L, 0, 0])); }
// el BRAZO DEL SERVO: entra a presión en la estría del servo y lleva su tornillo
export const SEP_BIEL = 3.5; // los dos agujeros del brazo del servo, a ±3,5 (uno por bieleta)
export function brazoServo(Q) { const S = COMPONENTES.servo, h = Q.hH, e = SEP_BIEL;
  return conBisel(N.csUnion([capsula([0, 0], [-h, 0], 7, 5), capsula([-h, -e], [-h, e], 5.4)]), 2.5, 0.4).translate([0, 0, 2.5]).add(cil(7.5, 2.6)).subtract(cil(S.estria - 0.1, 4.1, -0.01)).subtract(cil(2.2, 6, -1))
    .subtract(cil(B.PIN + 2 * PRES, 4, 1.5).translate([-h, e, 0])).subtract(cil(B.PIN + 2 * PRES, 4, 1.5).translate([-h, -e, 0])); }
// el PUENTE de delante: une los dos portamanguetas por arriba; lleva los dos postes delanteros de la carrocería
export function puente(Q) { const y = Q.yK - 7, z = ZK(Q).eB1 + 2; let m = conBisel(rr(8, 2 * y, 2), 3, 0.5).translate([Q.WB, 0, z]); // (2 más arriba que las orejas: por debajo pasan las tapas de las bieletas)
  [Q.yK - 9, -(Q.yK - 9)].forEach(yy => { m = m.subtract(cil(B.PIN + 2 * PRES, 4, z - 1).translate([Q.WB, yy, 0])); });
  [12, -12].forEach(yy => { m = m.subtract(perfilD(6, PRES).extrude(5).translate([Q.WB, yy, z - 1])); }); return m; }
// la cinemática: ángulo de cada mangueta para un giro del servo (el cuadrilátero brazo del servo – bieleta – brazo de la mangueta)
export function giroManguetas(Q, sigma) { const L = largoBieleta(Q), S = [Q.xS, 0], res = [];
  for (const sg of [1, -1]) { const c0 = Math.cos(sigma * R2), s0 = Math.sin(sigma * R2), h0 = [-Q.hH, sg * SEP_BIEL], H = sum(S, [h0[0] * c0 - h0[1] * s0, h0[0] * s0 + h0[1] * c0]), K = [Q.WB, sg * Q.yK], a0 = [Q.brazo[0], sg * Q.brazo[1]];
    const f = th => { const c = Math.cos(th * R2), s2 = Math.sin(th * R2), q = sum(K, [a0[0] * c - a0[1] * s2, a0[0] * s2 + a0[1] * c]); return lon(dif(q, H)) - L; };
    let lo = -80, hi = 80, best = null; for (let t = -80; t <= 80; t += 0.5) { const v = Math.abs(f(t)); if (!best || v < best.v) best = { t, v }; }
    lo = best.t - 0.5; hi = best.t + 0.5; for (let k = 0; k < 40; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1; }
    res.push({ th: (lo + hi) / 2, H, err: Math.abs(f((lo + hi) / 2)) }); }
  return { izq: res[0], der: res[1] }; }

// ---------- 4) el CHASIS ----------
// el contorno del chasis (visto desde arriba)
export function contornoChasis(Q) { const { WB, yP, yK, xB0, xB1 } = Q;
  const P = [[-34, 18], [-26, yP + 6], [Q.S2[0] + 6, yP + 6], [xB0 - 2, 44], [xB1 + 2, 44], [xB1 + 8, 21], [WB - 8, 21], [WB - 6, yK - 6], [WB + 6, yK - 6], [WB + 8, 19], [WB + 30, 14], [WB + 34, 0]];
  return P.concat(P.slice().reverse().filter(q => q[1] !== 0).map(q => [q[0], -q[1]])); }
export function chasis(Q) { const { WB, yP, yK, zP0, zP1, xB0, xB1, xSc } = Q, Bt = COMPONENTES.bateria, Sv = COMPONENTES.servo, e = 0.6, h = zP1 - zP0;
  let m = conBisel(poli(contornoChasis(Q)), h, e).translate([0, 0, zP0]);
  m = m.add(N.union([1, -1].map(sg => caja(xB1 - xB0, 2, 4).translate([(xB0 + xB1) / 2, sg * (Bt.W / 2 + 2.2), zP1 - 0.01])))); // las paredes de la bandeja de la batería
  // los postes del SERVO (sus orejas se atornillan con los tornillos del servo)
  [-1, 1].forEach(sg => { const x = xSc + sg * Sv.sep / 2; m = m.add(caja(5, 8, Q.zSb + Sv.zOreja - zP1 + 0.01, 1).translate([x, 0, zP1 - 0.01])).subtract(cil(1.8, 8, Q.zSb + Sv.zOreja - 7).translate([x, 0, 0])); });
  m = m.subtract(caja(Sv.L + 2 * JUSTO, Sv.A + 2 * JUSTO, 20).translate([xSc, 0, zP0 - 1])); // el hueco del servo (va de pie, un poco hundido)
  // las ranuras: lengüetas de la caja de cambios, pasadores de los portamanguetas, correa de la batería, bridas, postes, paragolpes
  [1, -1].forEach(sg => { const y0 = sg * (yP + 1.5); [-6, Q.S2[0] - 8].forEach(x => { m = m.subtract(caja(8 + 2 * PRES, 3 + 2 * PRES, h + 2).translate([x, y0, zP0 - 1])); });
    [yK - 12.5, yK - 8.5].forEach(y => { m = m.subtract(cil(B.PIN + 2 * PRES, h + 2, zP0 - 1).translate([WB, sg * y, 0])); });
    [xB0 + 12, xB1 - 12].forEach(x => { m = m.subtract(caja(21, 3, h + 2).translate([x, sg * (Bt.W / 2 + 5), zP0 - 1])); }); // la correa (velcro de 20)
    [xB0 + 8, xB1 - 8].forEach(x => [-7, 7].forEach(d => { m = m.subtract(caja(4.5, 2.2, h + 2).translate([x + d, sg * 32, zP0 - 1])); })); // bridas del variador y del receptor
    m = m.subtract(perfilD(6, PRES).extrude(h + 2).translate([-24, sg * 12, zP0 - 1])); // postes de atrás
    m = m.subtract(cil(B.PIN + 2 * PRES, h + 2, zP0 - 1).translate([-30, sg * 9, 0])).subtract(cil(B.PIN + 2 * PRES, h + 2, zP0 - 1).translate([WB + 28, sg * 8, 0])); }); // paragolpes
  return m; }
export function paragolpes(Q, delante) { const x0 = delante ? Q.WB + 28 : -30, sg = delante ? 1 : -1, yb = delante ? 8 : 9;
  const cs = N.csUnion([capsula([x0 + sg * 6, -36], [x0 + sg * 9, 0], 6, 7), capsula([x0 + sg * 9, 0], [x0 + sg * 6, 36], 7, 6), capsula([x0, -yb], [x0 + sg * 6, -yb * 2], 6), capsula([x0, yb], [x0 + sg * 6, yb * 2], 6)]);
  let m = conBisel(cs, 7, 1).translate([0, 0, 0.5]); // (de 0,5 del suelo a la altura de la placa)
  m = m.subtract(poli(contornoChasis(Q)).offset(0.2, 'Round').extrude(20).translate([0, 0, Q.zP0 - 0.05])); // por debajo del chasis queda una pestaña: ahí van sus pasadores
  [-yb, yb].forEach(y => { m = m.subtract(cil(B.PIN + 2 * PRES, Q.zP0, 0).translate([x0, y, 0])); }); return m; }
export const POSTE = 55;

// ---------- 5) los COMPONENTES de mentira (para verlos montados) ----------
export function componentes(Q) { const C = COMPONENTES, L = [];
  const mo = C.motor; L.push(['motor', cil(mo.D, mo.L).add(cil(mo.boss, mo.bossH, mo.L)).add(cil(mo.eje, mo.ejeL, mo.L)).add(cil(6, mo.cola, -mo.cola)), 'mot0']);
  const sv = C.servo; L.push(['servo', caja(sv.L, sv.A, sv.H).translate([0, 0, 0]).add(caja(sv.orejas, sv.A, sv.eOreja).translate([0, 0, sv.zOreja])).add(cil(sv.estria, sv.altoEje, sv.H).translate([sv.L / 2 - sv.ejeX, 0, 0])), 'servo']);
  return L; }

// la FASE de cada engranaje (girado hasta que sus dientes caen en los huecos del otro): es la misma en todos los tamaños (los centros
// están siempre igual unos de otros), así que se calcula una vez y se guarda como números
const FASES = new Map();
export function fasesTren(Q) { const T = TREN, k = [T.m, T.zp, T.zb, T.zs, T.za, T.juego].join(','); if (FASES.has(k)) return FASES.get(k);
  const r = N.enAmbito(() => { const pin = aLoAncho(pinonRC(), Q.y1, 1, Q.MO[0], Q.MO[1]), locoEn = g => aLoAncho(locoRC().rotate([0, 0, g]), Q.y1, 1, Q.I[0], Q.I[1]), gL = fase(locoEn, pin, 360 / T.zb);
    const coronaEn = g => aLoAncho(coronaRC(Q).rotate([0, 0, g]), Q.y2 + T.b, -1, Q.AX[0], Q.AX[1]), gC = fase(coronaEn, locoEn(gL), 360 / T.za); return [gL, gC]; });
  FASES.set(k, r); return r; }

// ---------- 6) TODO EL KIT, el coche MONTADO y el DESPIECE ----------
// grupos: 'fijo' · 'tr' (gira con el eje de atrás) · 'loco' · 'mot' (gira con el motor) · 'mI'/'mD' (giran con cada mangueta) · 'rI'/'rD'
// (giran con cada rueda de delante) · 'dir' (brazo del servo y bieletas) · 'comp' (los componentes: no se imprimen)
export function cocheRC(p, sigma = 0) {
  const Q = medidasRC(p), T = TREN, Ab = ancho(Q), piezas = [], mon = [], pon = (k, m, g = 'fijo') => { mon.push({ k, m, g }); return m; }, add = (t, m, v = 1) => { for (let i = 0; i < v; i++) piezas.push([t, m]); };
  const { WB, zA, yK } = Q, C = COMPONENTES;
  add('Chasis', chasis(Q)); pon('chasis', chasis(Q));
  // la caja de cambios
  const pI = placaCaja(Q, true), pD = placaCaja(Q, false).mirror([0, 1, 0]); add('Placa izquierda de la caja (la del motor)', pI.rotate([-90, 0, 0])); add('Placa derecha de la caja', placaCaja(Q, false).rotate([-90, 0, 0])); pon('placaI', pI); pon('placaD', pD);
  const Ls = 2 * (Q.yP + 3) - 0.1; add('Separador de la caja', varilla(5, Ls), 2); [Q.S1, Q.S2].forEach((q, i) => pon('sep' + i, varY(5, -(Q.yP + 3) + 0.05, Q.yP + 3 - 0.05, q[0], q[1])));
  add('Tapa de los engranajes', tapaCaja(Q).rotate([-90, 0, 0])); pon('tapaCaja', tapaCaja(Q));
  add('Pasador de la tapa', varilla(B.PIN, 4.6), 3); pasadoresTapa(Q).forEach((q, i) => pon('pasTapa' + i, varY(B.PIN, Q.yPo - 1.95, Q.yPo + 2.65, q[0], q[1])));
  const Ll = largoLoco(Q); add('Eje del loco', varilla(4, Ll)); pon('ejeLoco', varY(4, Q.yP + 0.05, Q.yP + 0.05 + Ll, Q.I[0], Q.I[1]));
  // los ENGRANAJES con su fase (el piñón, quieto; el loco y la corona, girados hasta que los dientes caen en el hueco)
  const pin = aLoAncho(pinonRC(), Q.y1, 1, Q.MO[0], Q.MO[1]), [gL, gC] = fasesTren(Q), loco = aLoAncho(locoRC().rotate([0, 0, gL]), Q.y1, 1, Q.I[0], Q.I[1]);
  add('Piñón del motor (' + T.zp + ' dientes)', pinonRC()); add('Engranaje loco (' + T.zb + ' + ' + T.zs + ' dientes)', locoRC()); add('Corona del eje (' + T.za + ' dientes)', coronaRC(Q));
  pon('pinon', pin, 'mot'); pon('loco', loco, 'loco');
  // el EJE DE ATRÁS y todo lo que gira con él: se monta sin girar y se gira entero con la fase de la corona (su cara plana va con ella)
  { const gr = [], pg = (k, m) => gr.push({ k, m }), Lh = Ab.hexFin - Ab.hexTrI, Lr = Ab.hexFin - Ab.hexTrD;
    pg('corona', aLoAncho(coronaRC(Q), Q.y2 + T.b, -1)); pg('ejeTr', varY(6, -Ab.ejeFin, Ab.ejeFin, 0, 0));
    add('Eje de atrás (bloqueado: las dos ruedas a la vez)', varilla(6, 2 * Ab.ejeFin)); add('Hexágono de atrás izquierdo', hexagono(Q, Lh, true)); add('Hexágono de atrás derecho', hexagono(Q, Lr, true));
    pg('hexTrI', aLoAncho(hexagono(Q, Lh, true), Ab.hexTrI, 1)); pg('hexTrD', aLoAncho(hexagono(Q, Lr, true), -Ab.hexTrD, -1));
    pg('llantaTrI', aLoAncho(llantaRC(Q), Ab.cara, -1)); pg('neumTrI', aLoAncho(neumaticoRC(Q), Ab.cara, -1)); pg('llantaTrD', aLoAncho(llantaRC(Q), -Ab.cara, 1)); pg('neumTrD', aLoAncho(neumaticoRC(Q), -Ab.cara, 1));
    pg('tapaTrI', aLoAncho(tapaRC(), Ab.tapa, -1)); pg('tapaTrD', aLoAncho(tapaRC(), -Ab.tapa, 1));
    gr.forEach(x => pon(x.k, x.m.rotate([0, -gC, 0]).translate([0, 0, zA]), 'tr')); } // (en el plano x-z, alrededor del eje: el mismo giro que la fase de la corona)
  // la DIRECCIÓN
  const Gm = giroManguetas(Q, sigma), z = ZK(Q);
  add('Portamangueta (izquierdo y derecho: el mismo)', portamanguetaImp(Q), 2); pon('portaI', portamangueta(Q)); pon('portaD', portamangueta(Q).mirror([0, 1, 0]));
  add('Pivote de la mangueta', varilla(3, z.eB1 - z.eA0 - 0.2), 2); [1, -1].forEach((sg, i) => pon('pivote' + i, B.UTIL.varZ(3, z.eB1 - z.eA0 - 0.2, [WB, sg * yK], z.eA0 + 0.1)));
  const Lpp = Q.zP1 + 2.9 - (Q.zP0 + 0.05); add('Pasador del portamangueta', varilla(B.PIN, Lpp), 4); [1, -1].forEach(sg => [yK - 12.5, yK - 8.5].forEach((y, i) => pon('pasPorta' + sg + i, B.UTIL.varZ(B.PIN, Lpp, [WB, sg * y], Q.zP0 + 0.05))));
  add('Puente de delante', puente(Q)); pon('puente', puente(Q));
  add('Pasador del puente', varilla(B.PIN, 6.4), 2); [1, -1].forEach((sg, i) => pon('pasPuente' + i, B.UTIL.varZ(B.PIN, 6.4, [WB, sg * (yK - 9)], z.eB1 + 2 - 3.4)));
  const LmG = largoMangueta(Q), Lhd = Ab.hexFin - Ab.hexDe;
  add('Mangueta (boca abajo)', mangueta(Q).mirror([0, 0, 1])); add('Mangueta derecha (boca abajo)', mangueta(Q).mirror([0, 1, 0]).mirror([0, 0, 1])); add('Eje de la rueda de delante', varilla(6, LmG), 2); add('Hexágono de delante (gira)', hexagono(Q, Lhd, false), 2);
  [[1, 'I', Gm.izq.th], [-1, 'D', Gm.der.th]].forEach(([sg, k, th]) => {
    const K = [WB, sg * yK], gira = m => m.translate([-K[0], -K[1], 0]).rotate([0, 0, th]).translate([K[0], K[1], 0]), espejo = m => sg > 0 ? m : m.mirror([0, 1, 0]);
    pon('mangueta' + k, gira(espejo(mangueta(Q))), 'm' + k); pon('ejeDe' + k, gira(espejo(varY(6, yK + 2.6, Ab.ejeFin, WB, zA))), 'm' + k);
    pon('tapaDe' + k, gira(espejo(aLoAncho(tapaRC(), Ab.tapa, -1, WB, zA))), 'm' + k);
    // la rueda de delante (gira en su eje): hexágono, llanta y neumático
    pon('hexDe' + k, gira(espejo(aLoAncho(hexagono(Q, Lhd, false), Ab.hexDe, 1, WB, zA))), 'r' + k); pon('llantaDe' + k, gira(espejo(aLoAncho(llantaRC(Q), Ab.cara, -1, WB, zA))), 'r' + k); pon('neumDe' + k, gira(espejo(aLoAncho(neumaticoRC(Q), Ab.cara, -1, WB, zA))), 'r' + k); });
  // las BIELETAS y el brazo del servo (girados con el servo)
  const Lb = largoBieleta(Q); add('Bieleta', bieleta(Q), 2); add('Brazo del servo (boca abajo)', brazoServo(Q).mirror([0, 0, 1])); add('Pasador de la bieleta', varilla(B.PIN, 6.6), 4); add('Tapa pequeña (de la bieleta)', B.tapaPequena(), 4);
  pon('brazoServo', brazoServo(Q).rotate([0, 0, sigma]).translate([Q.xS, 0, Q.zT - 5.1]), 'dir');
  [[Gm.izq, 1], [Gm.der, -1]].forEach(([g, sg], i) => { const K = [WB, sg * yK], a0 = [Q.brazo[0], sg * Q.brazo[1]], c = Math.cos(g.th * R2), s2 = Math.sin(g.th * R2), q = sum(K, [a0[0] * c - a0[1] * s2, a0[0] * s2 + a0[1] * c]), an = Math.atan2(q[1] - g.H[1], q[0] - g.H[0]) / R2;
    pon('bieleta' + i, bieleta(Q).rotate([0, 0, an]).translate([g.H[0], g.H[1], Q.zT + 0.05]), 'dir');
    [[g.H, 'dir'], [q, 'm' + (sg > 0 ? 'I' : 'D')]].forEach(([h, gr], j) => { pon('pasBiel' + i + j, B.UTIL.varZ(B.PIN, 6.6, h, Q.zT - 3.55), gr); pon('tapaBiel' + i + j, B.tapaPequena().mirror([0, 0, 1]).translate([h[0], h[1], Q.zT + 2.6 + 2.05]), gr); }); });
  // paragolpes y postes
  add('Paragolpes de delante', paragolpes(Q, true)); add('Paragolpes de atrás', paragolpes(Q, false)); pon('parDe', paragolpes(Q, true)); pon('parTr', paragolpes(Q, false));
  add('Pasador del paragolpes', varilla(B.PIN, 6.9), 4); [[Q.WB + 28, 8], [-30, 9]].forEach(([x, y], i) => [1, -1].forEach(sg => pon('pasPar' + i + sg, B.UTIL.varZ(B.PIN, 6.9, [x, sg * y], 0.55))));
  add('Poste de la carrocería (con agujeros para sus clips)', poste(), 4); [[-24, Q.zP0], [WB, z.eB1 + 2]].forEach(([x, z0], i) => [12, -12].forEach(y => pon('poste' + i + y, B.UTIL.varZ(6, POSTE, [x, y], z0 + 0.05).subtract(N.union([0, 1, 2].map(k => cil(1.7, 8, -4).rotate([90, 0, 0]).translate([x, y, z0 + POSTE - 4 - 5 * k])))))));
  // los COMPONENTES de mentira
  const Cm = componentes(Q), mo = C.motor, sv = C.servo, Bt = C.bateria;
  pon('motor', Cm[0][1].rotate([-90, 0, 0]).rotate([0, 0, 0]).translate([Q.MO[0], Q.yP - mo.L, Q.MO[1]]), 'comp');
  pon('servo', Cm[1][1].translate([Q.xSc, 0, Q.zSb]), 'comp');
  pon('bateria', caja(Bt.L, Bt.W, Bt.H, 3).translate([(Q.xB0 + Q.xB1) / 2, 0, Q.zP1 + 0.05]), 'comp');
  pon('esc', caja(C.esc.L, C.esc.W, C.esc.H, 2).translate([(Q.xB0 + Q.xB1) / 2, 32, Q.zP1 + 0.05]), 'comp'); pon('receptor', caja(C.receptor.L, C.receptor.W, C.receptor.H, 2).translate([(Q.xB0 + Q.xB1) / 2, -32, Q.zP1 + 0.05]), 'comp');
  return { Q, piezas, montaje: mon, Gm, gL, gC };
}
export function poste() { let m = varilla(6, POSTE); for (let k = 0; k < 3; k++) m = m.subtract(cil(1.7, 10, -1).translate([0, POSTE / 2 - 4 - 5 * k, 0])); return m; }
// el DESPIECE: cada pieza se separa de su sitio hacia fuera y por capas (el dibujo de montaje)
export function despiece(R) { const Q = R.Q, c = [Q.WB / 2, 0];
  return R.montaje.map(x => { const b = N.caja(x.m), q = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2], zc = (b.min[2] + b.max[2]) / 2, d = dif(q, c);
    const capa = x.k === 'chasis' ? 0 : /^(placa|sep|tapaCaja|pasTapa|ejeLoco|pinon|loco)/.test(x.k) ? 1 : /^(porta|pivote|pasPorta|puente|pasPuente)/.test(x.k) ? 1.2 : /^(corona|ejeTr|hex|llanta|neum|tapaTr|tapaDe|mangueta|ejeDe)/.test(x.k) ? 1.6 : 1;
    return { k: x.k, g: x.g, m: x.m.translate([d[0] * 0.35 * capa, d[1] * 0.9 * capa, x.k === 'chasis' ? 0 : 18 + zc * 0.5 * capa]) }; }); }

function camasDe(R) { const I = R.piezas.map((x, i) => i), dims = i => N.caja(R.piezas[i][1]).dims; return B.repartir(I.map(dims)).map(c => c.map(j => I[j])); }
const GRUPOS = { chasis: /^Chasis|^Paragolpes|^Pasador del paragolpes|^Poste/, caja: /^Placa|^Separador|^Tapa de los|^Pasador de la tapa|^Eje del loco|^Piñón|^Engranaje|^Corona|^Eje de atrás|^Hexágono de atrás/, direccion: /^Portamangueta|^Pivote|^Pasador del (portamangueta|puente)|^Puente|^Mangueta|^Eje de la rueda|^Hexágono de delante|^Bieleta|^Brazo del servo|^Pasador de la bieleta|^Tapa pequeña/, ruedas: /^Llanta|^Neumático/ };
export function genRC(p) { const que = p.que || 'cama1';
  if (que === 'prueba') return U.enCama(pruebaRC(p));
  if (que === 'ruedas') { const Q = medidasRC(p); return U.enCama([llantaRC(Q), llantaRC(Q), llantaRC(Q), llantaRC(Q), neumaticoRC(Q), neumaticoRC(Q), neumaticoRC(Q), neumaticoRC(Q)]); }
  const R = cocheRC(p, que === 'girado' ? 40 : 0);
  if (que === 'montado' || que === 'girado') return N.union(R.montaje.map(x => x.m));
  if (que === 'despiece') return N.union(despiece(R).map(x => x.m));
  let L = R.piezas.map((x, i) => i);
  if (GRUPOS[que]) L = L.filter(i => GRUPOS[que].test(R.piezas[i][0]) && !/^Llanta|^Neumático/.test(R.piezas[i][0]));
  else if (/^cama\d$/.test(que)) { const Cs = camasDe(R), k = +que.slice(-1) - 1; if (!Cs[k]) N.mal('Este coche va en ' + Cs.length + ' camas: elige «Cama 1»…«Cama ' + Cs.length + '».'); L = Cs[k]; }
  if (!L.length) N.mal('No hay piezas en «' + que + '».');
  return U.enCama(L.map(i => R.piezas[i][1])); }
// 🧪 PRUEBA DE ENCAJE: el piñón (en el eje de 2 del motor), un trozo de placa con el agujero del motor y del eje, el hexágono en un trozo de llanta,
// el brazo del servo (en su estría) y la mangueta con su pivote
export function pruebaRC(p) { const Q = medidasRC(p), C = COMPONENTES.motor, L = [];
  L.push(pinonRC()); L.push(conBisel(rr(30, 22, 3), 3, 0.4).subtract(cil(C.boss + 2 * JUSTO, 5, -1)).subtract(cil(C.tor + 0.3, 5, -1).translate([0, C.sep / 2, 0])).subtract(cil(C.tor + 0.3, 5, -1).translate([0, -C.sep / 2, 0])).subtract(cil(6 + 2 * GIRA, 5, -1).translate([11, 0, 0])));
  L.push(varilla(6, 16)); L.push(hexagono(Q, 8, true)); L.push(conBisel(circ(22), 6, 0.5).subtract(B.hexCS(12, JUSTO).extrude(5).translate([0, 0, 1.01])).subtract(cil(6.3, 8, -1)));
  L.push(brazoServo(Q)); L.push(conBisel(rr(12, 10, 2), 10, 0.5).subtract(cil(3 + 2 * GIRA, 12, -1))); L.push(varilla(3, 12)); return L; }

const QUE = [['cama1', 'Cama 1'], ['cama2', 'Cama 2'], ['cama3', 'Cama 3'], ['cama4', 'Cama 4'], ['cama5', 'Cama 5'], ['ruedas', 'Las 4 ruedas con sus neumáticos (PLA o PETG)'], ['prueba', '🧪 Prueba de encaje (motor, servo, hexágono, mangueta)'],
  ['chasis', 'Solo chasis, paragolpes y postes'], ['caja', 'Solo la caja de cambios y el eje de atrás'], ['direccion', 'Solo la dirección'], ['montado', '👀 Montado (con los componentes en gris)'], ['girado', '👀 Montado con la dirección girada'], ['despiece', '📐 Despiece: el dibujo de montaje']];
export const DISENOS_COCHE_RC = {
  cocheDrift: { cat: 'rc', tambien: ['juguetes', 'pro', 'mecanica'], nuevo: true, busca: 'coche rc drift kit chasis dirección servo sg90 motor 370 engranajes spool eje bloqueado rueda neumático liso 1/16 radiocontrol', e: '🏎️', t: 'Coche RC de DRIFT por piezas (el kit entero)', d: 'Chasis, dirección con Ackermann y servo SG90, caja de cambios con motor 370 y engranajes 9:1, eje de atrás bloqueado, ruedas de drift con neumático duro, bandejas para batería, variador y receptor. Solo pones los componentes', uso: 'mecanica', color: '#2b2d42',
    campos: [n('rueda', 'Rueda (Ø con neumático)', 52, 44, 64, 1), n('batalla', 'Batalla (entre ejes)', 170, 150, 200, 1), n('via', 'Vía (de rueda a rueda, por el centro)', 96, 86, 110, 1), s('llanta', 'Llantas', 'r5d', [['r5d', '5 radios dobles'], ['r6', '6 radios'], ['r10', '10 radios finos'], ['malla', 'Malla'], ['turbina', 'Turbina'], ['estrella', 'Estrella de 5']]), s('que', 'Qué imprimo', 'cama1', QUE)],
    gen: p => genRC(p),
    nota: p => { let R = null, Cs = []; try { R = cocheRC(p); Cs = camasDe(R); } catch (e) { return '⚠️ ' + e.message; } const Q = R.Q, C = COMPONENTES, G2 = giroManguetas(Q, 45), G3 = giroManguetas(Q, -45);
      if (p.que === 'despiece') return '📐 EL DIBUJO DE MONTAJE: cada pieza separada de su sitio, por capas (el chasis abajo; encima la caja de cambios y los portamanguetas; fuera, las ruedas). Gíralo con el ratón para verlo por todos lados.';
      if (p.que === 'prueba') return '🧪 PRUEBA DE ENCAJE (unos 10 g): mete el PIÑÓN en el eje de TU motor 370 (apretado; si baila, pegamento) y prueba la placa en su cara (el resalte en su agujero y los 2 tornillos M2,6). El HEXÁGONO en su trozo de llanta: entra justo. El BRAZO DEL SERVO en la estría de TU servo (a presión, con su tornillo). El PIVOTE gira en su agujero. Si algo no casa, dime cuánto y lo ajusto.';
      const giro = Math.round(Math.min(Math.abs(G2.izq.th), Math.abs(G2.der.th), Math.abs(G3.izq.th), Math.abs(G3.der.th)));
      return 'PARA QUÉ: un coche RC de DRIFT de verdad (≈ 1/16): ' + Math.round(Q.WB + 68) + ' mm de largo, batalla ' + Q.WB + ', vía ' + Q.via + ', ruedas de Ø' + Q.D + ' con neumático DURO y liso (en drift tiene que deslizar: PLA o PETG, NO TPU). Tracción trasera con el eje bloqueado (como los de drift de ahora), reducción ' + n2(relacion()) + ' : 1 con engranajes de evolvente (10 → 32 · 12 → 34). '
        + 'LO QUE COMPRAS (lo demás se imprime): ' + C.motor.t + '; ' + C.servo.t + '; ' + C.bateria.t + ' con su correa de velcro de 20 mm; ' + C.esc.t + '; ' + C.receptor.t + ' y su emisora. Opcional: un giroscopio de drift y una carrocería de lexan 1/16 (los 4 postes tienen agujeros para sus clips). Las medidas son las HABITUALES: haz antes la «🧪 Prueba de encaje». '
        + 'DÓNDE VA CADA COSA: el MOTOR en la placa izquierda de la caja (atrás, con 2 tornillos M2,6); el SERVO de pie delante, atornillado a sus dos postes; la BATERÍA en el centro, en su bandeja, con la correa por sus ranuras; el VARIADOR a la izquierda y el RECEPTOR a la derecha, con bridas por sus ranuras. '
        + 'VA EN ' + Cs.length + ' CAMAS de la P1P (y las ruedas en «Las 4 ruedas»). Todo sin soportes (las manguetas boca abajo, las placas tumbadas, los portamanguetas tumbados). '
        + 'CÓMO SE MONTA: (1) la caja: el motor en la placa izquierda, el eje del loco a presión, los 2 separadores y la placa derecha; las lengüetas en el chasis; (2) el eje de atrás por las placas con la CORONA (su resalte hacia la placa) y el loco; la tapa con sus 3 pasadores; los hexágonos, las ruedas y sus tapas; '
        + '(3) delante: los portamanguetas con 2 pasadores cada uno, las MANGUETAS en sus pivotes, el puente encima; los ejes de las ruedas a presión en las manguetas, los hexágonos (giran), las ruedas y sus tapas; (4) el servo con su brazo y las dos BIELETAS (pasador a presión, el ojo gira; su tapa pequeña); (5) batería, variador, receptor y la carrocería. '
        + 'DIRECCIÓN: Ackermann (los brazos apuntan al centro del eje de atrás); con el servo a ±45° las ruedas giran unos ' + giro + '°. HOLGURAS (las de tus Bambu): gira 0,2 (eje de atrás en las placas, loco, manguetas en sus pivotes, ruedas de delante, bieletas); justo 0,1 (el resalte del motor); a presión 0,05 (corona, hexágonos de atrás, pasadores, ejes, tapas). '
        + 'Probado con el ordenador (test/unit/coche_rc.mjs): ninguna pieza se pisa, los engranajes engranan y giran, las ruedas giran, la dirección gira a los dos lados sin tocar el chasis. Lo que no se puede probar sin imprimir: tus componentes.'; } }
};
