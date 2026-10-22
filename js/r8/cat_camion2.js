// ================= 20-10-2026 · 🛻 CAMIÓN RC 1/10 · 2.ª PARTE: TRANSMISIÓN, DIRECCIÓN, COMPONENTES, CATÁLOGO, MANUAL =================
// La 1.ª parte (r8/cat_camion.js, sesión 06483d86) tiene la suspensión de las 4 esquinas, las torres y el chasis. Aquí (sesión 9d1c9ad6):
//  · TRANSMISIÓN (detrás, tracción trasera): caja de cambios de DOS PLACAS con postes; MOTOR 540 en la placa izquierda con su PIÑÓN METÁLICO de
//    módulo 1 y 13 dientes (se compra: uno impreso en el eje de un 540 se come los dientes); ENGRANAJE INTERMEDIO (40 + 13) sobre dos 5×11×4 y un
//    eje M5 fijo; DIFERENCIAL de piñones cónicos (módulo 1,5: planetarios de 13, satélites de 9) en una caja de dos mitades con la CORONA de 47,
//    que va montada sobre los TUBOS de salida, y cada tubo gira en un 8×12×4 de su placa (20-10 noche: antes, dos 12×18×4 que ella no tiene). Reducción total (40/13)·(47/13) = 11,1 : 1. Las SALIDAS: el tubo de cada planetario sale por la caja
//    y por el rodamiento, lleva un HEXÁGONO al final y entra en su COPA DE SALIDA; un tornillo M5 (cabeza dentro del planetario, tuerca dentro de
//    la copa) lo aprieta todo. De la copa de salida a la copa de la rueda, el PALIER (bola con pasador de acero de 3 mm en cada punta).
//  · DIRECCIÓN: el servo TUMBADO (el eje mirando hacia delante) en su placa, el BRAZO del servo (va atornillado al disco que trae el servo) y dos
//    bieletas (varilla M3 con dos rótulas: se compran) hasta el brazo de cada mangueta.
//  · COMPONENTES: bandeja de la batería (2S «stick» de 1/10) con su correa, sitio del variador y del receptor, poste de la antena, parachoques y
//    postes de la carrocería.
// Todo con la tornillería y los rodamientos ESTÁNDAR, y comprobado con el ordenador: los engranajes casan, nada choca en todo el recorrido de
// la suspensión ni con la dirección girada, y el palier no se sale de sus copas (test/unit/camion.mjs).
import * as N from './nucleo.js';
import * as G from './engranajes.js';
import { AYUDAS as A } from './cat_utiles.js';
import * as B from './cat_bici.js';
import * as C from './cat_camion.js';
import * as CFE from './cat_engranajes.js';

const { n, s, M, CS, circ, rr, poli, cil, caja, n2, conBisel } = A;
const { PRES, JUSTO, GIRA } = B, U = B.UTIL;
const { R2 } = U;
const { TOR, ROD } = C;
const cilX = (d, x0, x1, y, z) => cil(d, x1 - x0).rotate([0, 90, 0]).translate([x0, y, z]);
const cilY = (d, y0, y1, x, z) => cil(d, y1 - y0).rotate([-90, 0, 0]).translate([x, y0, z]);
const cilZ = (d, z0, z1, x, y) => cil(d, z1 - z0, z0).translate([x, y, 0]);
const bloque = (x0, x1, y0, y1, z0, z1, r = 0) => caja(x1 - x0, y1 - y0, z1 - z0, r).translate([(x0 + x1) / 2, (y0 + y1) / 2, z0]);
const hexY = (e, y0, y1, x, z) => A.hex(e).extrude(y1 - y0).rotate([-90, 0, 0]).translate([x, y0, z]); // hexágono (e entre caras) a lo largo de y
// lo que se dibuja en el plano (x, z) de la caja y se «estira» a lo ancho: un punto (u, v) del plano 2D va a (x = u, z = −v); la cara z = 0 a y0
const aLoAncho = (cs2, y0, y1, P) => cs2.extrude(y1 - y0).rotate([-90, 0, 0]).translate([P[0], y0, P[1]]);

// ---------- 1) los NÚMEROS de la transmisión ----------
export const TREN = { m: 1, pin: 13, spur: 40, top: 13, corona: 47, juego: 0.15, mDif: 1.5, zPl: 13, zSa: 9 };
export const relacion = () => (TREN.spur / TREN.pin) * (TREN.corona / TREN.top);
// (20-10 noche: el rodamiento del diferencial, uno de los que ELLA tiene: 8×12×4. El estándar MR128ZZ es de 3,5 de ancho: su alojamiento es de 4 y
// vale también —queda 0,5 de juego—)
ROD.r8 = { t: 'Rodamiento 8×12×4 (MR128ZZ; el de 8×12×3,5 también vale)', d: 8, D: 12, b: 4 };
export const MOTOR = { t: 'Motor 540 de escobillas (Ø35,8 × 50, eje de 3,175 mm, 2 tornillos M3 a 25 mm) o sin escobillas «3650» de 1/10', D: 35.8, L: 50, eje: 3.175, sep: 25, boss: 12.7 };
// las Y de la caja (desde el eje del coche, +y = izquierda): las dos placas · el carril de la corona (y del 13 del intermedio) · la caja del diferencial ·
// el carril del 40 del intermedio y del piñón del motor
export const CY = { pD: [-22, -17], corona: [-6, 0], dif: [-15, 15], spur: [19, 24], pI: [25, 30], pin: [17.5, 24.5] }; // (20-10 noche: la corona, junto al corte de la caja del diferencial: así esa mitad se imprime con la corona en la cama, sin soportes)
// los centros en el plano (x, z): D el diferencial (en el eje de las ruedas de atrás), I el intermedio (a 20° hacia arriba y delante), M el motor (10°)
export function centros(Q) { const T = TREN, D = [0, Q.zA], dI = T.m * (T.top + T.corona) / 2, dM = T.m * (T.pin + T.spur) / 2, a = 20 * R2, b = 10 * R2;
  const I = [D[0] + dI * Math.cos(a), D[1] + dI * Math.sin(a)], Mo = [I[0] + dM * Math.cos(b), I[1] + dM * Math.sin(b)]; return { D, I, M: Mo, dI, dM }; }
const engr2D = z => G.perfilEngranaje2D({ por: 'modulo', m: TREN.m, z, alfa: 20, juego: TREN.juego }).cs;
const r2v = P => [P[0], -P[1]]; // (x, z) → el punto del plano 2D
// la FASE de cada pareja (solo para dibujarlas casadas: al montar se casan solas). Se calcula una vez, en cortes planos (rápido).
let FASES = null;
export function fases(Q) { if (FASES) return FASES; const K = centros({ zA: 0 }), T = TREN;
  const cor = engr2D(T.corona), top = engr2D(T.top), spur = engr2D(T.spur), pin = engr2D(T.pin);
  const aTop = CF.fase(a => top.rotate(a).translate(r2v(K.I)), cor.translate(r2v(K.D)), 360 / T.top, (x, y) => { try { return x.intersect(y).area(); } catch (e) { return 0; } });
  const aPin = CF.fase(a => pin.rotate(a).translate(r2v(K.M)), spur.rotate(aTop).translate(r2v(K.I)), 360 / T.pin, (x, y) => { try { return x.intersect(y).area(); } catch (e) { return 0; } });
  return (FASES = { top: aTop, pin: aPin }); }
const CF = CFE; export async function preparaFases() { } // (20-10 noche: cat_engranajes se importa arriba, sin esperas: el catálogo genera sin «await»)

// ---------- 2) el DIFERENCIAL de piñones cónicos ----------
export function juegoConico() { const T = TREN, P = G.conico({ z: T.zPl, zPareja: T.zSa, m: T.mDif, juego: 0.1 }), S = G.conico({ z: T.zSa, zPareja: T.zPl, m: T.mDif, juego: 0.1, b: P.K.b }); return { P, S }; }
// (20-10 noche: la caché guardaba piezas 3D que el programa BORRA al acabar cada cálculo —«Cannot pass deleted object» la 2.ª vez— y que, además, son de UN
// motor: el de las miniaturas es otro. Ahora se guardan a salvo (N.guarda) y por motor)
let JC = null, JCw = null; const jc = () => { const w = N.MF(); if (JC && JCw === w) return JC; JC = juegoConico(); N.guarda(JC.P.m); N.guarda(JC.S.m); JCw = w; return JC; };
export const DIF = { rIn: 15.2, rOut: 19.5, yIn: 13.2, yOut: 15, tubo: 9, tuboRod: 8 - 2 * PRES, tuboHex: 6.8, buje: 13, bujeHueco: 9 + 2 * GIRA, pasador: 3, rTecho: 9 }; // (20-10 noche, con el 8×12×4: tubo de Ø9 hasta el rodamiento —su escalón apoya en el aro de DENTRO—, Ø7,9 dentro de él (a presión) y un hexágono de 6,8 que pasa por su agujero de 8; la caja, con su buje de Ø13, gira sobre el tubo de Ø9) // (rTecho: hasta ahí el techo de dentro es plano —un puente de Ø18—; de ahí a rIn, cono a 45°)
// hasta dónde llega cada lado: la placa (cara de fuera) · el hexágono del tubo (5 mm) · la copa de salida
export const SALIDA = { izq: { placa: CY.pI[1], fin: CY.pI[1] + 5.4 }, der: { placa: -CY.pD[0], fin: -CY.pD[0] + 5.4 } };
// el PLANETARIO (en su marco: eje z, vértice en el origen; se coloca con el eje hacia +y o −y): dientes · cuerpo hasta la pared de la caja ·
// TUBO por el buje de la caja y por el rodamiento · HEXÁGONO al final · el hueco de la cabeza del tornillo M5 · el paso del tornillo
export function planetario(lado) { const { P } = jc(), K = P.K, yEsp = DIF.yIn - 0.3; // (la espalda, a 0,3 de la pared de la caja)
  let m = P.m.add(cil(2 * K.rIn, yEsp - K.zIn + 0.01, K.zIn - 0.01)).add(cil(2 * K.rRaiz - 0.1, K.zIn - K.zRaiz + 0.02, K.zRaiz));
  return m.subtract(cil(TOR.m5.paso, yEsp + 2, -1)).subtract(A.hex(TOR.m5.cabezaHex + 2 * PRES).extrude(TOR.m5.hCabHex + 0.6).translate([0, 0, K.zRaiz - 0.6])); }
// el TUBO del planetario (20-10 noche: pieza aparte, para que el planetario se imprima sin soportes): de su espalda, por el buje de la caja y por el
// rodamiento, hasta el HEXÁGONO que entra en la copa de salida. El par lo lleva el tornillo M5 de acero (cabeza en el planetario, tuerca en la copa);
// el tubo hace de separador y su hexágono, de guía. Marco: eje z, z = 0 en la espalda del planetario.
export function tuboPlanetario(lado) { const S = SALIDA[lado], y0 = DIF.yIn - 0.3, yHex = S.placa + 0.3, yR = caraRodDif(lado); // yR: la cara de dentro del rodamiento 8×12×4
  return cil(DIF.tubo, yR - y0).add(cil(DIF.tuboRod, yHex - yR + 0.01).translate([0, 0, yR - y0 - 0.01])).add(A.hex(DIF.tuboHex).extrude(S.fin - yHex).translate([0, 0, yHex - y0])).subtract(cil(TOR.m5.paso, S.fin - y0 + 2, -1)); }
// dónde empieza el rodamiento del diferencial, desde el centro del coche hacia su lado (la cara de dentro de la placa: el rodamiento entra por dentro)
export const caraRodDif = lado => lado === 'izq' ? CY.pI[0] : -CY.pD[1];
// el SATÉLITE (marco: eje z, vértice en el origen): dientes, su respaldo (apoya en la pared de la caja) y el agujero del pasador M3 (gira)
export function satelite() { const { S } = jc(), K = S.K; return S.m.add(cil(2 * K.rIn, 1.6, K.zIn - 0.01)).add(cil(2 * K.rRaiz - 0.1, K.zIn - K.zRaiz + 0.02, K.zRaiz)).subtract(cil(DIF.pasador + 2 * GIRA, 30, -1)); }
export const largoRespaldoSat = () => { const K = jc().S.K; return K.zIn + 1.6; }; // (hasta aquí llega el satélite desde el vértice)
// la CAJA del diferencial (a lo largo de y), en DOS MITADES que se atornillan (4 M3): la derecha (y ≤ 0) lleva la CORONA de 47.
// Cada mitad: el vaso (radio de dentro 15,2) · su pared · el BUJE (gira sobre el tubo de Ø9; acaba a 0,3 del rodamiento) · los medios agujeros del pasador M3 (a lo largo de x)
export function casaDif(lado) { const d = DIF, izq = lado === 'izq', yB = caraRodDif(lado) - 0.3;
  const yC = d.yIn - (d.rIn - DIF.rTecho); // (donde empieza el cono del techo: de radio rIn a rTecho a 45°)
  let m = cilY(2 * d.rOut, 0, d.yOut, 0, 0).subtract(cilY(2 * d.rIn, -1, yC + 0.01, 0, 0)).subtract(M().cylinder(d.yIn - yC, d.rIn, DIF.rTecho, 96).rotate([-90, 0, 0]).translate([0, yC, 0])).subtract(cilY(2 * DIF.rTecho, yC, d.yIn, 0, 0))
    .add(cilY(d.buje, d.yOut - 0.01, yB, 0, 0)).subtract(cilY(d.bujeHueco, d.yIn - 1, yB + 1, 0, 0));
  m = m.subtract(cilX(d.pasador + 2 * PRES, -d.rOut - 1, d.rOut + 1, 0, 0)); // el pasador (a presión en la caja; los satélites giran en él)
  const T4 = [45, 135, 225, 315].map(g => [16.8 * Math.cos(g * R2), 16.8 * Math.sin(g * R2)]);
  T4.forEach(([x, z]) => { m = m.subtract(cilY(TOR.m3.paso, -1, d.yOut + 1, x, z)); if (!izq) m = m.subtract(hexY(TOR.m3.tuerca + 2 * PRES, d.yOut - 2.6, d.yOut + 0.1, x, z)); });
  if (!izq) { // la CORONA: alrededor del vaso, en su carril (y de 9 a 15 en esta mitad, que luego se refleja a −9…−15)
    const c2 = engr2D(TREN.corona).subtract(circ(2 * d.rOut - 1)); m = m.add(aLoAncho(c2, -CY.corona[1], -CY.corona[0], [0, 0])); }
  return izq ? m : m.mirror([0, 1, 0]); }
// las FASES del diferencial (calculadas una vez con test/tmp_fase_dif.mjs: con ellas los cónicos casan sin tocarse; al montarlo se casan solos)
export const FASE_DIF = { satD: 30, satT: 10, planDer: 13.846 };
// el diferencial montado en su sitio (marco del coche): D = (0, 0, zA)
const enD = (Q, m) => m.translate([0, 0, Q.zA]);
export function difEnSitio(Q, giro = 0) { const { P, S } = jc(), L = [], gi = m => giro ? m.rotate([0, giro, 0]) : m; // (giro: lo que gira toda la caja alrededor de y)
  L.push({ k: 'difIzq', m: enD(Q, gi(casaDif('izq'))) }); L.push({ k: 'difDer', m: enD(Q, gi(casaDif('der'))) });
  L.push({ k: 'planIzq', m: enD(Q, gi(planetario('izq').rotate([-90, 0, 0]))) }); L.push({ k: 'planDer', m: enD(Q, gi(planetario('der').rotate([-90, 0, 0]).mirror([0, 1, 0]).rotate([0, FASE_DIF.planDer, 0]))) });
  const y0 = DIF.yIn - 0.3; L.push({ k: 'tuboIzq', m: enD(Q, gi(tuboPlanetario('izq').rotate([-90, 0, 0]).translate([0, y0, 0]))) }); L.push({ k: 'tuboDer', m: enD(Q, gi(tuboPlanetario('der').rotate([-90, 0, 0]).translate([0, y0, 0]).mirror([0, 1, 0]).rotate([0, FASE_DIF.planDer, 0]))) });
  [1, -1].forEach(sg => L.push({ k: 'sat' + (sg > 0 ? 'D' : 'T'), m: enD(Q, gi(satelite().rotate([0, 0, sg > 0 ? FASE_DIF.satD : FASE_DIF.satT]).rotate([0, sg * 90, 0]))) }));
  return L; }

// ---------- 3) el INTERMEDIO (40 + 13 de una pieza, con un 5×11×4 en cada punta) y el piñón del motor (se compra) ----------
export function intermedio() { const T = TREN, yT0 = CY.corona[0], yT1 = CY.corona[1], yS0 = CY.spur[0], yS1 = CY.spur[1];
  let m = aLoAncho(engr2D(T.top), yT0, yT1 + 0.41, [0, 0]).add(aLoAncho(engr2D(T.spur), yS0, yS1, [0, 0])).add(cilY(14, yT1 + 0.4, yS0 + 0.01, 0, 0)); // (el tubo, a 0,4 de la cara de la corona)
  const r = ROD.r5; m = m.subtract(cilY(r.D + 2 * PRES, yT0 - 1, yT0 + r.b, 0, 0)).subtract(cilY(r.D + 2 * PRES, yS1 - r.b, yS1 + 1, 0, 0)).subtract(cilY(7, yT0, yS1, 0, 0));
  return m; }
export const pinonFalso = () => aLoAncho(engr2D(TREN.pin).subtract(circ(MOTOR.eje)), CY.pin[0], CY.pin[1], [0, 0]);
export const motorFalso = (Q) => { const K = centros(Q); return cilY(MOTOR.D, CY.pI[1], CY.pI[1] + MOTOR.L, K.M[0], K.M[1]).add(cilY(MOTOR.eje, CY.pin[0], CY.pI[1] + 0.01, K.M[0], K.M[1])); };
export function transmisionEnSitio(Q, giroDif = 0) { const K = centros(Q), F = FASES || { top: 0, pin: 0 }, L = difEnSitio(Q, giroDif);
  const gI = -giroDif * TREN.corona / TREN.top, gP = -gI * TREN.spur / TREN.pin; // (los engranajes que casan giran al revés, con la relación de sus dientes)
  L.push({ k: 'intermedio', m: intermedio().rotate([0, F.top + gI, 0]).translate([K.I[0], 0, K.I[1]]) }); // (un giro a en el plano 2D es un giro +a alrededor de y)
  L.push({ k: 'pinon', m: pinonFalso().rotate([0, F.pin + gP, 0]).translate([K.M[0], 0, K.M[1]]), g: 'comp' });
  L.push({ k: 'motor', m: motorFalso(Q), g: 'comp' });
  return L; }

// ---------- 4) las PLACAS de la caja de cambios (se imprimen tumbadas): la DERECHA lleva los 3 POSTES; la IZQUIERDA, el MOTOR ----------
// postes (x, z respecto al eje de atrás): por detrás y abajo del diferencial · delante y abajo del intermedio · encima de los dos (fuera de los engranajes)
export const postesCaja = Q => [[-24, Q.zA - 17], [36, Q.zA - 15], [10, Q.zA + 33]];
export const PATAS = [[-24, -16], [30, 40]]; // las dos patas de cada placa (x), con un M3 al chasis cada una
export function placaCaja(Q, lado) { const K = centros(Q), izq = lado === 'izq', [y0, y1] = izq ? CY.pI : CY.pD, yIn = izq ? y0 : y1, t = y1 - y0, P = postesCaja(Q);
  const pz = p => [p[0], -p[1]]; // (al plano 2D)
  let cs = CS().hull([circ(54).translate(pz(K.D)), circ(48).translate(pz(K.I)), ...P.map(p => circ(12).translate(pz(p))), izq ? circ(42).translate(pz(K.M)) : N.csVacia(),
    rr(60, 6).translate([10, -(Q.zF1 + 3)])]);
  let m = aLoAncho(cs, y0, y1, [0, 0]);
  const dentro = izq ? 1 : -1; // hacia dónde está el interior (desde la placa)
  PATAS.forEach(([x0, x1]) => { const ya = izq ? yIn - 8 : yIn, yb = izq ? yIn : yIn + 8; m = m.add(bloque(x0, x1, ya, yb, Q.zF1, Q.zF1 + 4)).add(bloque(x0, x1, y0, y1, Q.zF1, Q.zF1 + 8));
    m = m.subtract(cilZ(TOR.m3.rosca, Q.zF1 - 1, Q.zF1 + 7.5, (x0 + x1) / 2, (ya + yb) / 2)); }); // (rosca en la pata: el tornillo entra por debajo del chasis)
  const rD = ROD.r8, r5 = ROD.r5;
  // el rodamiento del diferencial (8×12×4, entra por dentro) y el paso del tubo (Ø10,5: el escalón solo toca el aro de FUERA)
  m = izq ? m.subtract(cilY(rD.D + 2 * PRES, y0 - 1, y0 + rD.b, K.D[0], K.D[1])).subtract(cilY(10.5, y0, y1 + 1, K.D[0], K.D[1]))
    : m.subtract(cilY(rD.D + 2 * PRES, y1 - rD.b, y1 + 1, K.D[0], K.D[1])).subtract(cilY(10.5, y0 - 1, y1, K.D[0], K.D[1]));
  // el eje del intermedio: tornillo M5 fijo, con un resalte de 1,5 que solo toca el aro de dentro del rodamiento
  m = m.add(izq ? cilY(7.5, CY.spur[1] + 0.05, y0 + 0.01, K.I[0], K.I[1]) : cilY(7.5, y1 - 0.01, CY.corona[0] - 0.05, K.I[0], K.I[1])).subtract(cilY(TOR.m5.paso, y0 - 3, y1 + 3, K.I[0], K.I[1])); // (antes el de la izquierda se metía 0,5 en el rodamiento)
  if (izq) { // el MOTOR: el paso del piñón y sus dos tornillos M3 en RANURA (±1,5 mm a lo largo de la línea intermedio → motor: el engrane se ajusta)
    m = m.subtract(cilY(17, y0 - 1, y1 + 1, K.M[0], K.M[1])); const u = [(K.M[0] - K.I[0]) / K.dM, (K.M[1] - K.I[1]) / K.dM], v = [-u[1], u[0]];
    [1, -1].forEach(sg => { const c = [K.M[0] + sg * v[0] * MOTOR.sep / 2, K.M[1] + sg * v[1] * MOTOR.sep / 2]; m = m.subtract(M().hull([cilY(TOR.m3.paso, y0 - 1, y1 + 1, c[0] - 1.5 * u[0], c[1] - 1.5 * u[1]), cilY(TOR.m3.paso, y0 - 1, y1 + 1, c[0] + 1.5 * u[0], c[1] + 1.5 * u[1])])); }); }
  // los POSTES: salen de la placa derecha hasta la izquierda (rosca M3 dentro); en la izquierda, el agujero pasante del tornillo y el hueco de su cabeza
  P.forEach(p => { if (!izq) m = m.add(cilY(8, y1 - 0.01, CY.pI[0], p[0], p[1])).subtract(cilY(TOR.m3.rosca, y1, CY.pI[0] + 1, p[0], p[1]));
    else m = m.subtract(cilY(TOR.m3.paso, y0 - 1, y1 + 1, p[0], p[1])).subtract(cilY(TOR.m3.cabeza + 0.6, y1 - 1.6, y1 + 1, p[0], p[1])); });
  return m; }
// tumbada para imprimir: la cara de FUERA en la cama
export const placaParaImprimir = (Q, lado) => { const m = placaCaja(Q, lado), [y0, y1] = lado === 'izq' ? CY.pI : CY.pD; return lado === 'izq' ? m.rotate([-90, 0, 0]).translate([0, 0, 0]).mirror([0, 0, 1]) : m.rotate([90, 0, 0]); };

// ---------- 5) las COPAS DE SALIDA (en el hexágono de cada planetario) y el PALIER ----------
// la copa: la base con el hueco hexagonal del tubo · la tuerca M5 · (la derecha, 8 mm de cuello: así las dos bolas quedan a la misma distancia del centro)
// · el hueco de la bola con la ranura del pasador y la BOCA abocinada (medido: deja inclinar el palier ~34° con la bola al fondo, ~43° cuando ha salido 2 mm)
export const COPA_S = { base0: 0.3, hex: 5, tuerca: TOR.m5.hTuerca + 0.2, pared: 1, cuelloDer: 8 };
export const largoCopaS = lado => COPA_S.hex + COPA_S.tuerca + COPA_S.pared + (lado === 'der' ? COPA_S.cuelloDer : 0) + C.COPA.hondo;
export const BOCA = { h: 5.2, r: 8.4 }; // la boca abocinada de las copas (la de la rueda, en cat_camion: la misma idea)
export function boca(Cp, h0) { return M().cylinder(BOCA.h, Cp.bola / 2 + GIRA, BOCA.r, 64).translate([0, 0, h0 - BOCA.h]); } // (cono: de la bola a Ø16,8 en la boca)
export function copaSalida(lado) { const Cp = C.COPA, L = largoCopaS(lado), zS = L - Cp.hondo; // marco: eje z, la base en z = 0, la boca en z = L
  let m = cil(Cp.D, L).subtract(A.hex(DIF.tuboHex + 2 * PRES).extrude(COPA_S.hex + 0.01).translate([0, 0, -0.01])).subtract(cil(TOR.m5.paso, zS, -1));
  m = m.subtract(A.hex(TOR.m5.tuerca + 2 * PRES).extrude(COPA_S.tuerca + 0.02).translate([0, 0, COPA_S.hex - 0.01])); // (pegado al hueco del hexágono del tubo: antes quedaba una lámina de 0,01 entre los dos)
  m = m.subtract(cil(Cp.bola + 2 * GIRA, Cp.hondo + 1, zS)).subtract(caja(Cp.ranura, Cp.D - 3.5, Cp.hondo + 1).translate([0, 0, zS])).subtract(boca(Cp, L + 0.01));
  return m; }
// en su sitio: la base contra el final del rodamiento (+0,6 de aire con la placa), a lo largo de ±y
export const yBaseCopa = lado => (lado === 'izq' ? 1 : -1) * (SALIDA[lado].placa + 0.6);
// (la copa, girada como su planetario: el hexágono casa)
export const copaSEnSitio = (Q, lado, giro = 0) => { const m = copaSalida(lado).rotate([-90, 0, 0]).translate([0, SALIDA[lado].placa + 0.6, 0]), m2 = lado === 'izq' ? m : m.mirror([0, 1, 0]).rotate([0, FASE_DIF.planDer, 0]); return (giro ? m2.rotate([0, giro, 0]) : m2).translate([0, 0, Q.zA]); };
// dónde queda el centro de la bola de cada palier (en reposo, metida hasta el fondo de su copa): en la copa de salida (fija) y en la de la rueda
export const bolaSalida = (Q, lado) => { const L = largoCopaS(lado), zS = L - C.COPA.hondo; return (lado === 'izq' ? 1 : -1) * (SALIDA[lado].placa + 0.6 + zS + C.COPA.bola / 2 + 0.3); };
export const bolaRuedaY = Q => Q.yK - 2.3 - (C.COPA.hondo + 5) + C.COPA.hondo - C.COPA.bola / 2 - 0.3; // (la copa de la rueda: su boca a yK − 2,3 − 16, el fondo 11 más fuera)
// el PALIER: dos bolas de Ø(bola − 0,2) con su agujero del pasador de acero de 3 mm y la caña de Ø7, plano por abajo (se imprime tumbado sin soportes)
export const PALIER = { cana: 7, pasador: 3, largoPas: 14, plano: 0.6 }; // (el pasador: de acero, 3 × 14, el de catálogo · plano: lo que se corta por abajo A LA CAÑA, para que apoye entera en la cama)
export function palier(L) { const Cp = C.COPA, rb = (Cp.bola - 0.2) / 2;
  const bola = x => M().sphere(rb, 48).translate([x, 0, 0]);
  let m = N.union([bola(0), bola(L), cilX(PALIER.cana, 0, L, 0, 0)]);
  [0, L].forEach(x => { m = m.subtract(cilY(PALIER.pasador + 2 * PRES, -6, 6, x, 0)); });
  return m.intersect(bloque(-10, L + 10, -10, 10, -PALIER.cana / 2 + PALIER.plano, 10)); } // (20-10 noche: antes el corte solo tocaba las bolas —la caña quedaba en el aire— y se imprimía DE PIE sobre una bola: 2 mm² de apoyo; ahora tumbado, sobre la caña y las bolas, y no llega al ecuador de la bola)

// ---------- 6) la DIRECCIÓN, como en los 1/10 de verdad: dos BALANCINES, su BARRA y el SERVO de pie en el centro ----------
// Calculado (test/tmp_bump.mjs): para que la rueda NO se tuerza al subir y bajar la suspensión, la bieleta tiene que empezar a 38 mm del centro y
// 7 mm por debajo del eje (se tuerce como mucho 0,1°; saliendo del centro del coche, 14°). Ahí está el agujero de abajo de cada BALANCÍN; los dos
// balancines giran en sus POSTES de la BASE de la dirección, unidos arriba por la BARRA; el BRAZO del servo, del mismo largo, mueve el centro de la
// barra: es un paralelogramo (los dos balancines giran exactamente lo que el servo). La diferencia entre la rueda de dentro y la de fuera (Ackermann)
// la dan los brazos de las manguetas, que apuntan hacia atrás y hacia dentro.
// SERVO ESTÁNDAR (medidas de catálogo): cuerpo 40,5 × 20 × 37,2; orejas de 54,5 de punta a punta, agujeros a 49,5 × 10; las orejas a 27 mm del
// culo; el eje a 10,25 de una punta. De pie, el eje hacia arriba y hacia delante.
export const SERVO = { L: 40.5, W: 20, H: 37.2, orejas: 54.5, eOrejas: 2.5, hOreja: 27, agL: 49.5, agW: 10, eje: 10.25, cuerno: 4.5 };
// (x respecto al eje de delante, y a la izquierda, z respecto al eje de las ruedas)
export const DIR = { piv: [-36, 38], T: [-22, 38], zT: -7, brazo: 12, zAbajo: [0, 4], zArriba: [10.5, 14], zBarra: [14.2, 17.2], zSuelo: 0.5 };
export function sitioDir(Q) { const d = DIR, x = v => Q.WB + v, z = v => Q.zA + v, S = SERVO;
  const piv = [x(d.piv[0]), d.piv[1]], T = [x(d.T[0]), d.T[1]], eje = [x(d.piv[0]), 0], zCara = z(d.zArriba[0]) - S.cuerno; // (el servo: su eje en la línea de los pivotes)
  return { piv, T, eje, zT: z(d.zT), zR: z(d.zSuelo), zCara, zCulo: zCara - S.H, xCentro: eje[0] + S.eje - S.L / 2, zOreja: zCara - S.H + S.hOreja, xt: T[0], K: [x(C.BRAZO_DIR.x), Q.yK + C.BRAZO_DIR.y] }; }
export const servoFalso = Q => { const D = sitioDir(Q), S = SERVO; return bloque(D.xCentro - S.L / 2, D.xCentro + S.L / 2, -S.W / 2, S.W / 2, D.zCulo, D.zCara, 1)
  .add(bloque(D.xCentro - S.orejas / 2, D.xCentro + S.orejas / 2, -S.W / 2 + 1, S.W / 2 - 1, D.zOreja, D.zOreja + S.eOrejas)).add(cilZ(21, D.zCara + 1, D.zCara + S.cuerno, D.eje[0], 0)); };
// la BASE: placa sobre el chasis con la ventana del servo, los 2 POSTES de los balancines y los 2 de las orejas del servo; 4 M3 al chasis
export function baseDireccion(Q) { const D = sitioDir(Q), S = SERVO, zb = Q.zF1, x0 = D.xCentro - S.orejas / 2 - 3, x1 = D.xCentro + S.orejas / 2 + 3;
  const xw0 = D.piv[0] - 6, xw1 = D.piv[0] + 6; // (las alas de los postes de los balancines, por detrás de las orejetas de los trapecios)
  let m = bloque(x0, x1, -25, 25, zb, zb + 3, 3).add(bloque(xw0, xw1, -D.piv[1] - 5, D.piv[1] + 5, zb, zb + 3, 3)).subtract(bloque(D.xCentro - S.L / 2 - 0.4, D.xCentro + S.L / 2 + 0.4, -S.W / 2 - 0.4, S.W / 2 + 0.4, zb - 1, zb + 4));
  [1, -1].forEach(sg => { m = m.add(cilZ(9, zb + 2.99, Q.zA + DIR.zAbajo[0] - 0.4, D.piv[0], sg * D.piv[1])).subtract(cilZ(TOR.m3.rosca, zb, Q.zA, D.piv[0], sg * D.piv[1])); });
  [1, -1].forEach(sx => { const xo = D.xCentro + sx * S.agL / 2; m = m.add(bloque(xo - 2.7, xo + 2.7, -8, 8, zb + 2.99, D.zOreja - 0.05, 1)); [-1, 1].forEach(sy => { m = m.subtract(cilZ(TOR.m3.rosca, D.zOreja - 9, D.zOreja + 1, xo, sy * S.agW / 2)); }); });
  [[x0 + 5, 19], [x0 + 5, -19], [x1 - 5, 19], [x1 - 5, -19]].forEach(([x, y]) => { m = m.subtract(cilZ(TOR.m3.paso, zb - 1, zb + 4, x, y)); });
  return m; }
// el BALANCÍN (el izquierdo; el derecho es su reflejo): cubo que gira en el tornillo del poste · brazo de ABAJO hasta la bieleta · brazo de ARRIBA hacia atrás (la barra)
export function balancin(Q) { const D = sitioDir(Q), za = v => Q.zA + v, [ab0, ab1] = DIR.zAbajo, [ar0, ar1] = DIR.zArriba, P = D.piv;
  let m = cilZ(10, za(ab0), za(ar1), P[0], P[1]).add(M().hull([cilZ(10, za(ab0), za(ab1), P[0], P[1]), cilZ(9, za(ab0), za(ab1), D.T[0], D.T[1])]))
    .add(M().hull([cilZ(10, za(ar0), za(ar1), P[0], P[1]), cilZ(9, za(ar0), za(ar1), P[0] - DIR.brazo, P[1])]));
  return m.subtract(cilZ(TOR.m3.gira, za(ab0) - 1, za(ar1) + 1, P[0], P[1])).subtract(cilZ(TOR.m3.paso, za(ab0) - 1, za(ab1) + 1, D.T[0], D.T[1])).subtract(cilZ(TOR.m3.rosca, za(ar0) - 1, za(ar1) + 1, P[0] - DIR.brazo, P[1])); }
// la BARRA (une los dos balancines y el brazo del servo: 3 tornillos M3 que hacen de eje) y el BRAZO del servo (se atornilla a su disco)
export function barraDir(Q) { const D = sitioDir(Q), x = D.piv[0] - DIR.brazo, y = D.piv[1], [z0, z1] = DIR.zBarra.map(v => Q.zA + v);
  let m = M().hull([cilZ(9, z0, z1, x, y), cilZ(9, z0, z1, x, -y)]); [y, 0, -y].forEach(q => { m = m.subtract(cilZ(TOR.m3.gira, z0 - 1, z1 + 1, x, q)); }); return m; }
export function brazoServo(Q) { const D = sitioDir(Q), [z0, z1] = [D.zCara + SERVO.cuerno, Q.zA + DIR.zArriba[1]];
  let m = M().hull([cilZ(21, z0, z1, D.eje[0], 0), cilZ(9, z0, z1, D.eje[0] - DIR.brazo, 0)]).subtract(cilZ(7.5, z0 - 1, z1 + 1, D.eje[0], 0));
  [45, 135, 225, 315].forEach(g => { m = m.subtract(cilZ(1.8, z0 - 1, z1 + 1, D.eje[0] + 7.5 * Math.cos(g * R2), 7.5 * Math.sin(g * R2))); }); // (el tornillo del eje y los 4 del disco del servo)
  return m.subtract(cilZ(TOR.m3.rosca, z0 - 1, z1 + 1, D.eje[0] - DIR.brazo, 0)); }
// la CINEMÁTICA: el servo gira th (grados, + = a la izquierda) → los balancines giran lo mismo → dónde está cada bola de dentro → cuánto gira cada rueda
const rotPt = (p, c, a) => { const s2 = Math.sin(a), co = Math.cos(a), dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * co - dy * s2, c[1] + dx * s2 + dy * co]; };
export function bolaBalancin(Q, sg, th) { const D = sitioDir(Q), P = [D.piv[0], sg * D.piv[1]], T0 = [D.T[0], sg * D.T[1]], q = rotPt(T0, P, th * R2); return [q[0], q[1], D.zT]; }
// la bola de la rótula de la mangueta, en el mundo, con la suspensión (phi) y la dirección (delta) de esa esquina: los mismos giros que C.esquinaEnSitio
export function bolaMangueta(Q, sg, phi = 0, delta = 0) { const G = Q.F, P = C.poseEsquina(G, phi), b = C.BRAZO_DIR, D = sitioDir(Q), a = delta * R2;
  let q = [b.x, b.y]; q = [Q.WB + q[0] * Math.cos(a) - q[1] * Math.sin(a), Q.yK + q[0] * Math.sin(a) + q[1] * Math.cos(a)]; // (dirección: alrededor del pivote, en el marco de la izquierda)
  let y = q[1] + P.dL[0], z = D.zR + P.dL[1]; const ps = P.psi * R2, dy = y - P.L1[0], dz = z - P.L1[1]; y = P.L1[0] + dy * Math.cos(ps) - dz * Math.sin(ps); z = P.L1[1] + dy * Math.sin(ps) + dz * Math.cos(ps);
  return [q[0], sg * y, z]; } // (la derecha: la misma, reflejada)
// giro de cada rueda (izq / der, en grados; + = hacia la izquierda en el mundo) para un giro th del servo y una suspensión phi
export function giroRuedas(Q, th, phi = 0) { const res = {};
  for (const sg of [1, -1]) { const k0 = bolaMangueta(Q, sg, 0, 0), I0 = bolaBalancin(Q, sg, 0), L = Math.hypot(k0[0] - I0[0], k0[1] - I0[1], k0[2] - I0[2]), I = bolaBalancin(Q, sg, th);
    const f = d => { const k = bolaMangueta(Q, sg, phi, sg * d); return Math.hypot(k[0] - I[0], k[1] - I[1], k[2] - I[2]) - L; }; // (la derecha gira al revés en su marco)
    let best = null; for (let d = -60; d <= 60; d += 0.5) { const v = Math.abs(f(d)); if (!best || v < best.v) best = { d, v }; } let lo = best.d - 0.5, hi = best.d + 0.5;
    for (let k = 0; k < 50; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1; }
    res[sg > 0 ? 'izq' : 'der'] = (lo + hi) / 2; res['L' + (sg > 0 ? 'izq' : 'der')] = L; }
  return res; }
export const bieletaFalsa = (P0, P1) => { const d = [P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]], L = Math.hypot(...d), u = d.map(v => v / L);
  const m = N.union([cilX(3, 4, L - 4, 0, 0), cilX(8, -4.5, 6, 0, 0), cilX(8, L - 6, L + 4.5, 0, 0)]), ay = Math.atan2(-u[2], Math.hypot(u[0], u[1])) / R2, az = Math.atan2(u[1], u[0]) / R2;
  return m.rotate([0, ay, 0]).rotate([0, 0, az]).translate(P0); };

// ---------- 7) los COMPONENTES que se compran (gris: para comprobar que caben) ----------
export const COMP = {
  bateria: { t: 'Batería LiPo 2S (7,4 V) «stick» de 1/10, de 3000 a 5000 mAh, con caja dura (como mucho 139 × 47 × 26)', L: 139, W: 47, H: 26 },
  esc: { t: 'Variador (ESC) de 1/10 para tu motor, con su ventilador (como mucho 50 × 36 × 36)', L: 50, W: 36, H: 36 },
  receptor: { t: 'Receptor de 2,4 GHz de 2–3 canales y su emisora (como mucho 40 × 28 × 15)', L: 40, W: 28, H: 15 },
  servo: { t: 'Servo ESTÁNDAR (40,5 × 20 × 37,2) de 10 kg·cm o más, con engranajes de metal y su disco' },
  motor: { t: MOTOR.t }, pinon: { t: 'Piñón de METAL de módulo 1 (32P) y 13 dientes, para eje de 3,175 mm, con su prisionero' },
  ruedas: { t: 'Cuatro ruedas de 1/10 con hexágono de 12 mm (estadio: 2,2"; monster: 2,8"), ya pegadas' },
  amortiguadores: { t: 'Cuatro amortiguadores de aceite de 1/10 (sus largos van en la ficha)' }, carroceria: { t: 'Carrocería de policarbonato de 1/10 (estadio / short course / monster) y sus 4 clips' }
};
export const sitioBateria = Q => { const x0 = 100, x1 = Q.WB - 82; return { x: (x0 + x1) / 2, y: -28.5, z: Q.zF1 + 3 }; };
export const sitioEsc = Q => ({ x: 128, y: 30, z: Q.zF1 + 3 }), sitioReceptor = Q => ({ x: Q.WB - 112, y: 30, z: Q.zF1 + 3 });
export function componentesEnSitio(Q) { const L = [], c = (k, d, p) => L.push({ k, m: caja(d.L, d.W, d.H, 3).translate([p.x, p.y, p.z]), g: 'comp' });
  c('bateria', COMP.bateria, sitioBateria(Q)); c('esc', COMP.esc, sitioEsc(Q)); c('receptor', COMP.receptor, sitioReceptor(Q)); L.push({ k: 'servo', m: servoFalso(Q), g: 'comp' }); return L; }

// ---------- 8) el CHASIS en DOS MITADES (no cabe entero en la cama), la BANDEJA CENTRAL que las une, los PARACHOQUES y los POSTES ----------
export const BANDEJA = Q => ({ x0: 96, x1: Q.WB - 78, y: 55, t: 3 });
const tornBandeja = Q => { const B = BANDEJA(Q); return [B.x0 + 6, Q.xJ - 14, Q.xJ + 14, B.x1 - 6].flatMap(x => [[x, 49], [x, -49]]); };
const ranurasCorrea = Q => { const b = sitioBateria(Q); return [b.x - 40, b.x + 40].flatMap(x => [[x, -54.5], [x, -2.5]]); }; // (las correas de velcro de 20, alrededor de la batería)
// los agujeros que la 2.ª parte necesita en el chasis: patas de la caja, base de la dirección (y la ventana del servo), bandeja, parachoques, correas
export function chasisCompleto(Q) { const K = centros(Q), D = sitioDir(Q), S = SERVO, zb = Q.zF0 - 1, zt = Q.zF1 + 1;
  let m = C.chasisEntero(Q);
  [CY.pI, CY.pD].forEach(([y0, y1], i) => PATAS.forEach(([x0, x1]) => { const izq = i === 0, yIn = izq ? y0 : y1, ya = izq ? yIn - 8 : yIn, yb = izq ? yIn : yIn + 8; m = m.subtract(cilZ(TOR.m3.paso, zb, zt, (x0 + x1) / 2, (ya + yb) / 2)); })); // (las patas de la caja: M3 × 12 por debajo, rosca en la pata)
  m = m.subtract(bloque(D.xCentro - S.L / 2 - 0.4, D.xCentro + S.L / 2 + 0.4, -S.W / 2 - 0.4, S.W / 2 + 0.4, zb, zt)); // la ventana del culo del servo
  const x0 = D.xCentro - S.orejas / 2 - 3, x1 = D.xCentro + S.orejas / 2 + 3; [[x0 + 5, 19], [x0 + 5, -19], [x1 - 5, 19], [x1 - 5, -19]].forEach(([x, y]) => { m = m.subtract(cilZ(TOR.m3.paso, zb, zt, x, y)).subtract(A.hex(TOR.m3.tuerca + 2 * PRES).extrude(2.6).translate([x, y, Q.zF0 - 0.01])); }); // (la base de la dirección: M3 × 10 con tuerca por debajo)
  tornBandeja(Q).forEach(([x, y]) => { m = m.subtract(cilZ(TOR.m3.paso, zb, zt, x, y)); });
  ranurasCorrea(Q).forEach(([x, y]) => { m = m.subtract(bloque(x - 11, x + 11, y - 1.6, y + 1.6, zb, zt)); });
  [[Q.WB + 46, 14], [Q.WB + 46, -14], [Q.WB + 56, 0]].forEach(([x, y]) => { m = m.subtract(cilZ(TOR.m3.paso, zb, zt, x, y)).subtract(A.hex(TOR.m3.tuerca + 2 * PRES).extrude(2.6).translate([x, y, Q.zF0 - 0.01])); }); // el parachoques de delante (M3 × 10 con tuerca por debajo)
  return m; }
export const mitadChasis = (Q, delante) => chasisCompleto(Q).intersect(delante ? bloque(Q.xJ, Q.WB + 100, -80, 80, -10, 200) : bloque(-100, Q.xJ, -80, 80, -10, 200));
// la BANDEJA: une las dos mitades (8 M3 con tuerca), lleva la batería (dos rieles y las ranuras de sus 2 correas) y el sitio del variador y del receptor
export function bandeja(Q) { const B = BANDEJA(Q), b = sitioBateria(Q), z0 = Q.zF1, z1 = z0 + B.t, bt = COMP.bateria;
  let m = bloque(B.x0, B.x1, -B.y, B.y, z0, z1, 4);
  [-1, 1].forEach(s2 => { m = m.add(bloque(b.x - bt.L / 2 + 6, b.x + bt.L / 2 - 6, b.y + s2 * (bt.W / 2 + 0.6) + (s2 > 0 ? 0 : -2), b.y + s2 * (bt.W / 2 + 0.6) + (s2 > 0 ? 2 : 0), z1 - 0.01, z1 + 6)); }); // los rieles
  [-1, 1].forEach(s2 => { m = m.add(bloque(b.x + s2 * (bt.L / 2 + 0.6) + (s2 > 0 ? 0 : -2), b.x + s2 * (bt.L / 2 + 0.6) + (s2 > 0 ? 2 : 0), b.y - 10, b.y + 10, z1 - 0.01, z1 + 6)); }); // los topes
  [[sitioEsc(Q), COMP.esc], [sitioReceptor(Q), COMP.receptor]].forEach(([p, d]) => { const o = rr(d.L + 3, d.W + 3, 3).subtract(rr(d.L + 0.6, d.W + 0.6, 2)); m = m.add(o.extrude(1.5).translate([p.x, p.y, z1 - 0.01])); }); // el marco de cada uno (cinta de doble cara dentro)
  m = m.add(cilZ(7, z1 - 0.01, z1 + 40, Q.WB - 112, 52)).subtract(cilZ(3.2, z1 + 3, z1 + 41, Q.WB - 112, 52)); // el tubo de la antena
  tornBandeja(Q).forEach(([x, y]) => { m = m.subtract(cilZ(TOR.m3.paso, z0 - 1, z1 + 1, x, y)).subtract(A.hex(TOR.m3.tuerca + 2 * PRES).extrude(2.6).translate([x, y, z1 - 2.5])); });
  ranurasCorrea(Q).forEach(([x, y]) => { m = m.subtract(bloque(x - 11, x + 11, y - 1.6, y + 1.6, z0 - 1, z1 + 1)); });
  return m; }
// el hueco que deja el chasis (su contorno + 0,15) entre dos alturas: así los parachoques no lo pisan en ninguna esquina
const huecoChasis = (Q, z0, z1) => poli(C.contornoChasis(Q)).offset(0.15, 'Round').extrude(z1 - z0).translate([0, 0, z0]);
// los PARACHOQUES: delante, sobre la punta del chasis (3 M3); detrás, debajo de la cola, con los 2 tornillos de atrás de la torre (más largos)
export function parachoquesDel(Q) { const x0 = Q.WB + 40, xf = Q.WB + 62, zb = Q.zF0, zt = Q.zF1;
  let m = bloque(x0, xf - 2, -24, 24, zt, zt + 4, 3).add(CS().hull([rr(10, 120, 5).translate([xf + 6, 0]), rr(4, 60, 2).translate([xf - 1, 0])]).extrude(zt + 14 - zb).translate([0, 0, zb]));
  m = m.subtract(bloque(xf - 4, xf + 0.2, -27, 27, zb - 1, zt + 0.01)).subtract(huecoChasis(Q, zb - 1, zt)); // (la punta del chasis entra por debajo: con su forma exacta y 0,15 de aire)
  [[Q.WB + 46, 14], [Q.WB + 46, -14], [Q.WB + 56, 0]].forEach(([x, y]) => { m = m.subtract(cilZ(TOR.m3.paso, zt - 1, zt + 5, x, y)); });
  [1, -1].forEach(sg => { m = m.subtract(cilZ(TOR.m3.rosca, zt + 4, zt + 15, xf + 6, sg * 22)); }); return m; } // (los postes de la carrocería, atornillados por debajo)
export function parachoquesTras(Q) { const zb = Q.zF0, xr = -48; let m = bloque(xr, -30, -26, 26, zb - 5, zb, 3).add(CS().hull([rr(10, 110, 5).translate([xr - 8, 0]), rr(4, 56, 2).translate([xr + 1, 0])]).extrude(Q.zF1 + 10 - (zb - 5)).translate([0, 0, zb - 5]));
  m = m.subtract(bloque(xr - 0.2, xr + 6, -31, 31, zb - 0.01, Q.zF1 + 11)).subtract(huecoChasis(Q, zb, Q.zF1 + 11)); // (la cola del chasis apoya encima: con su forma exacta y 0,15 de aire)
  const xt = C.PIE_TORRE ? Q.T.xT[0] - C.PIE_TORRE / 2 : -41; [-14, 14].forEach(y => { m = m.subtract(cilZ(TOR.m3.paso, zb - 6, zb + 1, xt, y)).subtract(A.hex(TOR.m3.tuerca + 2 * PRES).extrude(2.6).translate([xt, y, zb - 5 - 0.01])); }); // (los 2 tornillos de la torre de atrás: M3 × 16 por la torre, el chasis y esta placa; la tuerca, aquí debajo)
  [1, -1].forEach(sg => { m = m.subtract(cilZ(TOR.m3.rosca, Q.zF1, Q.zF1 + 11, xr - 8, sg * 22)); }); return m; }
// el POSTE de la carrocería: Ø7, 5 agujeros para el clip (cada 6 mm, arriba), rosca M3 abajo
export const altoPoste = Q => Math.round(Q.F.T[1] + 8 - (Q.zF1 + 14)); // (llega 8 mm por encima de las torres)
export function posteCarroceria(L) { let m = cil(7, L).subtract(cil(TOR.m3.rosca, 12, -1)); for (let k = 0; k < 5; k++) m = m.subtract(cilY(1.8, -5, 5, 0, L - 4 - 6 * k)); return m.intersect(bloque(-2.7, 5, -5, 5, -1, L + 1)); } // (20-10 noche: con una cara plana detrás, de 4,5 mm: se imprime TUMBADO —de pie, 7 mm de grueso y 90–110 de alto, temblaba y con un golpe se partía por las capas—)
export function postesEnSitio(Q) { const L = altoPoste(Q), P = []; [1, -1].forEach(sg => { P.push(posteCarroceria(L).translate([Q.WB + 68, sg * 22, Q.zF1 + 14])); P.push(posteCarroceria(Q.F.T[1] + 8 - (Q.zF1 + 10)).translate([-56, sg * 22, Q.zF1 + 10])); }); return P; }

// ---------- 9) EL CAMIÓN MONTADO: pose = { phiF, phiT (suspensión), th (servo, grados), giro (ruedas, grados), giroDif } ----------
const rotZen = (m, c, a) => a ? m.translate([-c[0], -c[1], 0]).rotate([0, 0, a]).translate([c[0], c[1], 0]) : m;
export const largoPalier = Q => Math.round((distPalier(Q).min - 0.2) * 10) / 10;
export function bolaRueda(Q, phi) { const P = C.poseEsquina(Q.T, phi), bR = bolaRuedaY(Q), q0 = [bR + P.dL[0], Q.zA + P.dL[1]], a = P.psi * R2, dx = q0[0] - P.L1[0], dz = q0[1] - P.L1[1];
  return [P.L1[0] + dx * Math.cos(a) - dz * Math.sin(a), P.L1[1] + dx * Math.sin(a) + dz * Math.cos(a)]; }
export function distPalier(Q) { const r = C.recorrido(Q.T), bS = bolaSalida(Q, 'izq'); let min = 1e9, max = 0, ang = 0;
  for (let phi = r.abajo; phi <= r.arriba + 1e-9; phi += 0.5) { const q = bolaRueda(Q, phi), d = Math.hypot(q[0] - bS, q[1] - Q.zA); min = Math.min(min, d); max = Math.max(max, d); ang = Math.max(ang, Math.abs(Math.asin((q[1] - Q.zA) / d)) / R2); }
  return { min, max, ang }; }
// (los dos PASADORES de acero, a lo largo de z como las ranuras de las copas; el de la derecha, girado lo que su planetario: FASE_DIF.planDer,
// y la copa de esa rueda gira lo mismo. Con conPasadores, también los pasadores, para comprobar que caben en sus ranuras)
export const fasePalier = sg => sg > 0 ? 0 : FASE_DIF.planDer;
// las dos BOLAS van guiadas por el hueco de su copa: cada centro, en el EJE de su copa (la de salida, a lo largo de y; la de la rueda, inclinada
// con el portamangueta), separados justo el largo del palier; lo que sobra (el palier «entra y sale») se reparte entre las dos copas
export function bolasPalier(Q, phi) { const bS = bolaSalida(Q, 'izq'), q = bolaRueda(Q, phi), ps = C.poseEsquina(Q.T, phi).psi * R2, u = [Math.cos(ps), Math.sin(ps)], Lp = largoPalier(Q);
  const pos = s2 => { const B1 = [bS + s2, Q.zA], B2 = [q[0] - s2 * u[0], q[1] - s2 * u[1]]; return { B1, B2, d: Math.hypot(B2[0] - B1[0], B2[1] - B1[1]) }; };
  let lo = 0, hi = 6; for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; if (pos(mid).d > Lp) lo = mid; else hi = mid; } const r = pos((lo + hi) / 2); return Object.assign(r, { sale: (lo + hi) / 2 }); }
export function palierEnSitio(Q, sg, phi, conPasadores = false) { const { B1, B2 } = bolasPalier(Q, phi), Lp = largoPalier(Q), a = Math.atan2(B2[1] - B1[1], B2[0] - B1[0]) / R2;
  let base = palier(Lp); if (conPasadores) [0, Lp].forEach(x => { base = base.add(cilY(PALIER.pasador, -PALIER.largoPas / 2, PALIER.largoPas / 2, x, 0)); });
  // (el palier gira solo sobre sí mismo hasta que su pasador cae en la ranura de la copa: inclinado a, eso es atan(cos a · tan fase))
  const F = fasePalier(sg) * R2, rho = Math.atan(Math.cos(a * R2) * Math.tan(F)) / R2;
  const m = base.rotate([0, 0, 90]).rotate([0, 90 + rho, 0]).rotate([a, 0, 0]).translate([0, B1[0], B1[1]]); return sg > 0 ? m : m.mirror([0, 1, 0]); }
export function camionCompleto(Q, pose = {}) { const L = [], pon = (k, m, g = 'fijo', o) => L.push(Object.assign({ k, m, g }, o || {})), phiF = pose.phiF || 0, phiT = pose.phiT || 0, th = pose.th || 0;
  pon('chasisT', mitadChasis(Q, false)); pon('chasisD', mitadChasis(Q, true)); pon('bandeja', bandeja(Q)); pon('torreD', C.torre(Q, true)); pon('torreT', C.torre(Q, false)); pon('soporteBielaIzq', C.soporteBielaT(Q)); pon('soporteBielaDer', C.soporteBielaT(Q).mirror([0, 1, 0]));
  pon('parachoquesD', parachoquesDel(Q)); pon('parachoquesT', parachoquesTras(Q)); postesEnSitio(Q).forEach((m, i) => pon('poste' + i, m));
  pon('placaIzq', placaCaja(Q, 'izq')); pon('placaDer', placaCaja(Q, 'der'));
  transmisionEnSitio(Q, pose.giroDif || 0).forEach(x => pon(x.k, x.m, x.g || 'tren'));
  pon('copaSIzq', copaSEnSitio(Q, 'izq', pose.giroDif || 0), 'tren'); pon('copaSDer', copaSEnSitio(Q, 'der', pose.giroDif || 0), 'tren');
  pon('palierIzq', palierEnSitio(Q, 1, phiT, pose.pasadores), 'tren'); pon('palierDer', palierEnSitio(Q, -1, phiT, pose.pasadores), 'tren');
  // la dirección
  const D = sitioDir(Q), g = giroRuedas(Q, th, phiF);
  pon('baseDir', baseDireccion(Q)); pon('brazoServo', rotZen(brazoServo(Q), D.eje, th), 'dir');
  pon('balancinIzq', rotZen(balancin(Q), [D.piv[0], D.piv[1]], th), 'dir'); pon('balancinDer', rotZen(balancin(Q).mirror([0, 1, 0]), [D.piv[0], -D.piv[1]], th), 'dir');
  const a = th * R2; pon('barraDir', barraDir(Q).translate([DIR.brazo * (1 - Math.cos(a)), -DIR.brazo * Math.sin(a), 0]), 'dir');
  [1, -1].forEach(sg => pon('bieleta' + (sg > 0 ? 'Izq' : 'Der'), bieletaFalsa(bolaBalancin(Q, sg, th), bolaMangueta(Q, sg, phiF, sg * (sg > 0 ? g.izq : g.der))), 'comp'));
  // las 4 esquinas (la suspensión y la dirección de cada una)
  for (const del of [true, false]) for (const izq of [true, false]) C.esquinaEnSitio(Q, del, izq, del ? phiF : phiT, del ? (izq ? g.izq : g.der) : 0, del ? 0 : fasePalier(izq ? 1 : -1)).forEach(x => L.push(x));
  componentesEnSitio(Q).forEach(x => L.push(x)); L.push({ k: 'motor', m: motorFalso(Q), g: 'comp' }); // (el motor ya va en la transmisión: se quita el repetido)
  return L.filter((x, i) => !(x.k === 'motor' && L.findIndex(y => y.k === 'motor') !== i)); }
