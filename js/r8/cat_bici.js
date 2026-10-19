// ================= 19-10-2026 · 🚲 BICICLETA PRO POR PIEZAS: como una de verdad, a escala, y que FUNCIONE =================
// Ella (18-10): «las bicicletas más modelos, más estilos, y las piezas no están completas: faltan las varillas para que puedan girar, las
// cadenas bien hechas y el piñón y la corona realista; tiene que ser todo realista hasta la potencia, el manillar, poner manguitos, la
// horquilla, la dirección, el freno de disco, hacer diseño de tope para que no salga la rueda, gire bien, que engrane bien la cadena, el
// sillín, todo a piezas, todo funcional y probado».
// (El kit de la v30.5, `bicicletaKit`, sigue: es el de tres capas planas para niños. Este es otro: por piezas, como una bici real.)
//
// CÓMO ES (escala según la rueda; x hacia delante, y hacia arriba, z al lado: +z = el lado de la cadena):
//  · CUADRO en dos MITADES (izquierda y derecha, la misma pieza) que se imprimen sobre su cara plana: tubos REDONDOS de verdad (medio tubo
//    cada mitad), se juntan con pasadores a presión. Caja del pedalier de lado a lado; tubo de dirección y del sillín huecos (en gota: sin
//    soportes) para la dirección y la tija.
//  · VAINAS Y TIRANTES (izquierda y derecha), planos, por fuera del cuadro: abrazan la caja del pedalier y el «nudo» del sillín y acaban en
//    la PUNTERA. Todas las caras que rozan son paralelas (lo que gira, gira sobre caras planas).
//  · RUEDA DE ATRÁS: eje que GIRA con la rueda (buje, piñón y tapas a presión en su cara plana); el PIÑÓN va por fuera de la puntera derecha
//    con su separador, y las dos TAPAS hacen de TOPE (la rueda no se sale). RUEDA DE DELANTE: eje quieto y buje que gira en él.
//  · TRANSMISIÓN: PLATO con su araña y PIÑÓN con el perfil de dientes de una cadena de rodillos (asiento 0,505·Ø + 0,069, como la norma);
//    CADENA de una pieza en TPU con rodillos y placas en «8» (los dientes entran entre las placas); va un 0,8 % corta: el TPU la tensa.
//  · HORQUILLA: dos barras, la CORONA y la DIRECCIÓN (el tubo que gira); encima, la POTENCIA, el MANILLAR (4 tipos), MANGUITOS y MANETAS.
//  · FRENOS DE DISCO: disco en cada buje y su PINZA (abierta hacia el buje, como las de verdad) en la vaina y en la barra izquierdas.
//  · BIELAS, eje del pedalier y PEDALES; TIJA y SILLÍN; PEANA (dos cunas y una barra con su nombre).
// Holguras de sus Bambu (por lado): 0,05 a presión · 0,10 encaja · 0,2 gira.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, tx, M, CS, circ, rr, poli, cil, caja, n2, conBisel } = A;
export const PRES = 0.05, JUSTO = 0.1, GIRA = 0.2;
const R2 = Math.PI / 180;
const sum = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k], dif = (a, b) => [a[0] - b[0], a[1] - b[1]], lon = v => Math.hypot(v[0], v[1]), uni = v => { const l = lon(v) || 1; return [v[0] / l, v[1] / l]; };
const dirAng = g => [Math.cos(g * R2), Math.sin(g * R2)], en = (c, r, g) => [c[0] + r * Math.cos(g), c[1] + r * Math.sin(g)], entre = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------- los ESTILOS: medidas de bicis reales (en mm de verdad; luego se escalan con la rueda) ----------
// cs = vaina (pedalier → eje trasero) · caida = cuánto baja el pedalier del eje (− = sube) · ba = distancia entre ejes · ad = ángulo de
// dirección · as = ángulo del sillín · st = tubo del sillín · ht = tubo de dirección · a2c = eje-corona de la horquilla · av = avance
// · rueda = diámetro real de la rueda con su neumático · neum = ancho del neumático · plato / pinon = dientes DE VERDAD (cadena de 1/2"):
// a escala salen menos dientes (la cadena de 4 mm no se puede hacer más fina), con el mismo tamaño a la vista
export const ESTILOS = {
  montana: { t: 'Montaña (MTB): horquilla de suspensión, manillar recto, ruedas de tacos', cs: 430, caida: 50, ba: 1130, ad: 68, as: 74, st: 420, ht: 110, a2c: 500, av: 44, rueda: 700, neum: 58, plato: 32, pinon: 18, manillar: 'recto', tacos: true, susp: true, cuadro: 'diamante' },
  carretera: { t: 'Carretera: cuadro largo, manillar curvo, ruedas finas', cs: 410, caida: 70, ba: 990, ad: 73, as: 73.5, st: 520, ht: 150, a2c: 370, av: 45, rueda: 680, neum: 28, plato: 48, pinon: 17, manillar: 'curvo', tacos: false, susp: false, cuadro: 'diamante' },
  bmx: { t: 'BMX: pequeña y fuerte, manillar alto con cruceta, ruedas gordas', cs: 340, caida: -30, ba: 960, ad: 74.5, as: 71, st: 230, ht: 120, a2c: 310, av: 28, rueda: 510, neum: 58, plato: 25, pinon: 9, manillar: 'bmx', tacos: true, susp: false, cuadro: 'diamante' },
  paseo: { t: 'Paseo (cuadro abierto, fácil de subir): manillar hacia atrás', cs: 450, caida: 60, ba: 1100, ad: 69, as: 72, st: 450, ht: 160, a2c: 380, av: 50, rueda: 680, neum: 42, plato: 38, pinon: 18, manillar: 'paseo', tacos: false, susp: false, cuadro: 'abierto' }
};
// la CADENA (igual en todos los tamaños: es lo más fino que sale bien con boquilla de 0,4)
export const CADENA = { p: 4, dr: 2.4, placa: 0.8, hueco: 2.0, alto: 2.2, diente: 1.5, estira: 0.008 }; // paso · Ø del rodillo · grosor de placa · entre placas · alto de placa · grosor del diente · lo que se estira montada
export const anchoCadena = () => CADENA.hueco + 2 * CADENA.placa;
const Rprim = k => CADENA.p / (2 * Math.sin(Math.PI / k)), Rext = k => CADENA.p / 2 * (0.6 + 1 / Math.tan(Math.PI / k));

// ---------- el RECORRIDO DE LA CADENA de verdad: rodillos en los asientos del plato y del piñón, y tramos rectos entre ellos ----------
// los dos tramos (arriba y abajo) van de un asiento al otro (los más cercanos a las tangentes); se elige la fase de cada rueda dentada para
// que en los dos tramos quepa un número entero de eslabones, estirados lo que pide el TPU (si no, salta o se afloja)
function tramos(Ap, Bp, R1, R2c, N1, N2, q) {
  const e = uni(dif(Bp, Ap)), be = Math.asin((R1 - R2c) / lon(dif(Bp, Ap))), aU = Math.atan2(e[1], e[0]) + Math.PI / 2 + be, w1 = Math.PI + 2 * be, w2 = Math.PI - 2 * be, a1 = 2 * Math.PI / N1, a2 = 2 * Math.PI / N2;
  let mejor = null;
  for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) {
    const t1 = i * a1 / 24, t2 = j * a2 / 24, gt = t1 + Math.round((aU - t1) / a1) * a1, gb = t1 + Math.round((aU - w1 - t1) / a1) * a1, ht = t2 + Math.round((aU - t2) / a2) * a2, hb = t2 + Math.round((aU + w2 - t2) / a2) * a2;
    const L1 = lon(dif(en(Bp, R1, gt), en(Ap, R2c, ht))), L2 = lon(dif(en(Ap, R2c, hb), en(Bp, R1, gb))), m1 = Math.max(1, Math.round(L1 / q)), m2 = Math.max(1, Math.round(L2 / q));
    const c = Math.max(Math.abs(L1 / m1 - q), Math.abs(L2 / m2 - q));
    if (!mejor || c < mejor.c - 1e-9) mejor = { c, t1, t2, gt, gb, ht, hb, m1, m2, L1, L2, a1, a2 };
  }
  return mejor;
}
function rodillos(Ap, Bp, R1, R2c, T) {
  const P = [], S2t = en(Ap, R2c, T.ht), S1t = en(Bp, R1, T.gt), S1b = en(Bp, R1, T.gb), S2b = en(Ap, R2c, T.hb);
  P.push(S2t); for (let k = 1; k < T.m1; k++) P.push(entre(S2t, S1t, k / T.m1));
  const n1 = Math.round((T.gt - T.gb) / T.a1); for (let k = 0; k <= n1; k++) P.push(en(Bp, R1, T.gt - k * T.a1));
  for (let k = 1; k < T.m2; k++) P.push(entre(S1b, S2b, k / T.m2));
  const n2v = Math.round((T.hb - T.ht) / T.a2); for (let k = 0; k < n2v; k++) P.push(en(Ap, R2c, T.hb - k * T.a2));
  return P;
}

// ---------- las MEDIDAS de esta bici (lo comparten todas las piezas, el montaje y las pruebas) ----------
export function medidas(p) {
  const E = ESTILOS[p.estilo] || ESTILOS.montana, D = Math.max(80, Math.min(170, +p.rueda || 120)), f = D / E.rueda, R = D / 2, sc = x => x * f;
  // tubos: de verdad ~ 35–45 mm (principales) y ~ 20 (vainas), con un mínimo que se imprima fuerte
  const rT = Math.max(2.8, sc(19)), rST = Math.max(rT, 3.6), rV = Math.max(2.4, sc(11)), rD = Math.max(4.4, sc(23)), rBB = Math.max(5.2, sc(22));
  const eje = 4, steer = 4.6, tija = 4; // ejes de las ruedas Ø4 · la dirección Ø4,6 · la tija Ø4
  // ruedas: neumático (aparte) y llanta
  const neum = Math.max(3.6, sc(E.neum)), aN = Math.max(5, sc(E.neum) * 0.95), Rll = R - neum * 0.82, wR = Math.max(4.4, aN * 0.62);
  // dientes a escala: el plato y el piñón de verdad (paso 12,7) a esta escala, con la cadena de 4 mm
  const C = CADENA, aEsc = (Nr, lo, hi) => { const x = C.p / (2 * (12.7 / (2 * Math.sin(Math.PI / Nr))) * f); return Math.max(lo, Math.min(hi, x >= 1 ? lo : Math.round(Math.PI / Math.asin(x)))); };
  const N1 = +p.plato > 0 ? Math.max(12, Math.min(40, Math.round(+p.plato))) : aEsc(E.plato, 12, 40), N2 = +p.pinon > 0 ? Math.max(9, Math.min(18, Math.round(+p.pinon))) : aEsc(E.pinon, 9, 18);
  const Rp1 = Rprim(N1), Rp2 = Rprim(N2), Ro1 = Rext(N1), Ro2 = Rext(N2), anchoC = anchoCadena();
  // a lo ancho (z): las vainas van de la caja del pedalier a la puntera EN PARALELO (por fuera del neumático); la cadena, por fuera de todo
  const zPun = Math.max(aN / 2 + 1.2, wR / 2 + 3.1, rST + 1, rT * 1.1 + 1, sc(30)); // la cara de dentro de las vainas (y medio ancho de la caja)
  const tV = 1.1 * rV, zCad = zPun + tV + 0.5 + anchoC / 2; // grueso de las vainas · el plano de la cadena: 0,5 por fuera de ellas
  const zDel = Math.max(aN / 2 + 1.2, wR / 2 + 3.1); // la cara de dentro de las barras de la horquilla
  // vista de lado: la rueda de atrás no puede rozar el tubo del sillín ni la caja (si roza, la vaina se alarga)
  const A0 = [0, R], drop = sc(E.caida), dS = [-Math.cos(E.as * R2), Math.sin(E.as * R2)], bbDe = d => [Math.sqrt(Math.max(1, d * d - drop * drop)), R - drop];
  const libre = d => { const B = bbDe(d), w = dif(A0, B); return Math.min(Math.abs(w[0] * dS[1] - w[1] * dS[0]) - rST, d - rBB) - R; };
  const cs0 = sc(E.cs); let csL = cs0; while (libre(csL) < 1.5) csL += 0.25;
  // la cadena: se busca el largo de vaina (hasta 2 eslabones más) y las fases para que los dos tramos cuadren
  const q = C.p * (1 + C.estira); let mejor = null;
  for (let d = csL; d <= csL + 2 * C.p + 1e-9; d += 0.05) { const T = tramos(A0, bbDe(d), Rp1, Rp2, N1, N2, q); if (!mejor || T.c < mejor.T.c - 1e-6) mejor = { d, T }; if (T.c < 0.008) break; }
  csL = mejor.d; const T = mejor.T, BB = bbDe(csL), F = [BB[0] + sc(E.ba) - bbDe(cs0)[0], R];
  const ST = sum(BB, dS, sc(E.st)); // tubo del sillín: de la caja hacia arriba y atrás
  const u = [-Math.cos(E.ad * R2), Math.sin(E.ad * R2)], v = [Math.sin(E.ad * R2), Math.cos(E.ad * R2)]; // eje de la dirección (hacia arriba) y su normal hacia delante
  const corona = Math.max(5, sc(26)), Cr = sum(sum(F, u, sc(E.a2c)), v, -sc(E.av)), HB = sum(Cr, u, corona), HT = sum(HB, u, Math.max(14, sc(E.ht)));
  const rod = rodillos(A0, BB, Rp1, Rp2, T);
  return { E, f, sc, D, R, rT, rST, rV, rD, rBB, eje, steer, tija, neum, aN, Rll, wR, A0, BB, F, ST, dS, u, v, Cr, HB, HT, corona, N1, N2, Rp1, Rp2, Ro1, Ro2, zPun, zCad, zDel, tV, anchoC, csL, cs0,
    nE: rod.length, rodillos: rod, fasePlato: T.t1 / R2, fasePinon: T.t2 / R2, tensa: [T.L1 / T.m1 / C.p - 1, T.L2 / T.m2 / C.p - 1] };
}

// ---------- utilidades 3D ----------
const esfera = (q, r, z = 0) => M().sphere(r, Math.max(24, Math.round(r * 6))).translate([q[0], q[1], z]);
// tubo de A a B (radios ra y rb), con su eje en el plano z = z0: la unión redondeada de dos esferas (cápsula)
const tubo3 = (a, b, ra, rb = ra, z0 = 0) => M().hull([esfera(a, ra, z0), esfera(b, rb, z0)]);
// cilindro de eje z centrado en q (de z0 a z1)
const cilZ = (q, d, z0, z1) => cil(d, z1 - z0, z0).translate([q[0], q[1], 0]);
// cilindro de eje en el plano (de a a b), radio r, a la altura z0
const cilPl = (a, b, r, z0 = 0) => { const d = dif(b, a), L = lon(d), g = Math.atan2(d[1], d[0]) / R2; return M().cylinder(L, r, r, Math.max(24, Math.round(r * 8))).rotate([0, 90, 0]).rotate([0, 0, g]).translate([a[0], a[1], z0]); };
// agujero en GOTA a lo largo de a → b sobre la cara de la cama (z = 0): la punta hacia +z, se imprime sin soportes
const gotaPl = (a, b, r) => M().hull([cilPl(a, b, r), cilPl(a, b, 0.05, r * Math.SQRT2)]);
const mitad = m => m.intersect(caja(2000, 2000, 1000)); // solo z ≥ 0
// eje con una cara plana (se imprime tumbado sobre ella): perfil 2D (la cara plana abajo, a 0,82·r del centro)
const perfilD = (d, mas = 0) => { const r = d / 2 + mas; return circ(2 * r).intersect(rr(2 * r + 2, 2 * r).translate([0, r * 0.18])); };
// una varilla con su cara plana, tumbada sobre ella (a lo largo de Y, centrada)
const varilla = (d, L) => perfilD(d).extrude(L).rotate([90, 0, 0]).translate([0, L / 2, d / 2 * 0.82]);
const capsula = (a, b, w1, w2 = w1) => CS().hull([circ(w1).translate(a), circ(w2).translate(b)]);
// matriz 4×4 (por columnas) de un marco: ejes x, y, z y el origen
const M4 = (cx, cy, cz, o) => [cx[0], cx[1], cx[2], 0, cy[0], cy[1], cy[2], 0, cz[0], cz[1], cz[2], 0, o[0], o[1], o[2], 1];
const varZ = (d, L, q, z0) => perfilD(d).extrude(L).translate([q[0], q[1], z0]); // una varilla a lo largo de z (en el montaje)

// ---------- 1) RUEDAS: llanta con radios (plana), NEUMÁTICO aparte, BUJE de pie, EJES con su cara plana y sus TAPAS (el tope) ----------
export const HEX = 7.6; // el buje es un prisma de 6 caras de 7,6 entre caras: la llanta y el disco entran en él a presión y giran con él
export const hexCS = (d, mas = 0) => { const r = (d / 2 + mas) / Math.cos(Math.PI / 6), P = []; for (let i = 0; i < 6; i++) P.push([r * Math.cos(i * Math.PI / 3), r * Math.sin(i * Math.PI / 3)]); return poli(P); };
export const LLANTA = { alto: 2.6, ala: 1.0, fl: 0.9 };
export function llanta(Q) {
  const { Rll, wR } = Q, { alto, ala, fl } = LLANTA, rH = HEX / 2 + 2.4;
  const anillo = circ(2 * Rll).subtract(circ(2 * (Rll - alto))), alaR = circ(2 * (Rll + ala)).subtract(circ(2 * (Rll - 0.01)));
  let m = anillo.extrude(wR).add(alaR.extrude(fl)).add(alaR.extrude(fl).translate([0, 0, wR - fl]));
  // los RADIOS, cruzados de dos en dos como los de verdad (apoyados en la cama: se imprimen sin soportes)
  const nR = Q.D > 110 ? 24 : 18, Lr = [];
  for (let i = 0; i < nR; i++) { const a = i * 360 / nR, b = a + (i % 2 ? 26 : -26), p0 = dirAng(a), p1 = dirAng(b); Lr.push(CS().hull([circ(1.3).translate([p0[0] * rH, p0[1] * rH]), circ(1.1).translate([p1[0] * (Rll - alto + 0.3), p1[1] * (Rll - alto + 0.3)])])); }
  m = m.add(N.csUnion(Lr).extrude(1.5));
  // el centro: la brida con el agujero de 6 caras (a presión en el buje)
  return m.add(circ(2 * rH + 1).extrude(wR)).subtract(hexCS(HEX, PRES).extrude(wR + 2).translate([0, 0, -1]));
}
// NEUMÁTICO (en TPU agarra y amortigua): el talón, estrecho, entra entre las alas de la llanta; por encima de las alas se ensancha (en
// rampa de 48°: se imprime tumbado sin soportes). Con tacos (montaña, BMX) o con dibujo fino.
export function neumatico(Q) {
  const { R, Rll, aN, wR } = Q, { ala, fl } = LLANTA, bh = wR / 2 - fl - JUSTO, c = aN / 2, r0 = Rll + 0.02, r1 = Rll + ala + 0.15, rw = r1 + (c - bh) * 0.9, bv = Math.max(0.4, Math.min(aN * 0.3, (R - rw) * 0.5));
  const P = [[r0, c - bh], [r1, c - bh], [rw, 0.01], [R - bv, 0], [R, bv], [R, aN - bv], [R - bv, aN], [rw, aN - 0.01], [r1, c + bh], [r0, c + bh]];
  let m = CS().ofPolygons([N.ccw(P)]).revolve(Math.max(96, Math.round(R * 4)));
  const T = []; if (Q.E.tacos) { const nT = Math.round(2 * Math.PI * R / 4.2); for (let i = 0; i < nT; i++) { const g = i * 360 / nT; T.push(caja(1.6, 2.2, aN * 0.28).translate([0, R - 0.5, i % 2 ? 0 : aN * 0.72]).rotate([0, 0, g])); T.push(caja(1.3, 1.6, aN * 0.5).translate([0, R - 0.4, aN * 0.25]).rotate([0, 0, g + 180 / nT])); } }
  else { const nT = Math.round(2 * Math.PI * R / 3); for (let i = 0; i < nT; i++) T.push(caja(0.8, 1, aN * 0.6).translate([0, R - 0.35, aN * 0.2]).rotate([0, 0, i * 360 / nT])); }
  return m.subtract(N.union(T));
}
// BUJE (de pie): prisma de 6 caras. El de ATRÁS va a presión en el eje (gira con él: el eje gira en las punteras); el de DELANTE gira en su eje
export const largoBuje = (Q, trasero) => 2 * ((trasero ? Q.zPun : Q.zDel) - GIRA);
export function buje(Q, trasero) { const L = largoBuje(Q, trasero), m = conBisel(hexCS(HEX), L, 0.5); return trasero ? m.subtract(perfilD(Q.eje, PRES).extrude(L + 2).translate([0, 0, -1])) : m.subtract(cil(Q.eje + 2 * GIRA, L + 2, -1)); }
// TAPA del eje: el TOPE de la rueda (más grande que el agujero de la puntera: la rueda no se sale) · a presión en la cara plana del eje
export const tapaT = 3.6, tapaD = 8.4, METE = tapaT - 0.8 - 0.1; // lo que entra el eje en su tapa
export function tapaEje(Q) { return conBisel(circ(tapaD), tapaT, 0.8).subtract(perfilD(Q.eje, PRES).extrude(tapaT).translate([0, 0, 0.8])); }
// el PIÑÓN va por fuera de la puntera derecha, con un SEPARADOR que lo deja justo en el plano de la cadena
export const sepPinon = Q => Q.zCad - CADENA.diente / 2 - (Q.zPun + Q.tV + 0.15);
// los EJES: el de atrás (gira) va de la tapa izquierda a la tapa derecha (después del piñón); el de delante, de tapa a tapa
export const ejeTr = Q => ({ z0: -(Q.zPun + Q.tV + 0.15 + METE), z1: Q.zCad + CADENA.diente / 2 + 0.02 + METE });
export const ejeDe = Q => { const z = Q.zDel + PIERNA(Q).t + 0.02 + METE; return { z0: -z, z1: z }; };

// ---------- 2) FRENO DE DISCO: el disco (en el buje, lado izquierdo) y la pinza (en la vaina y en la barra izquierdas) ----------
export const discoD = Q => Math.max(25, Q.sc(160)), discoT = 1.2, PROF = 2.1; // (mínimo 25: la pinza no llega a la brida de la llanta) // el plano del disco, a 2,1 de la cara de dentro de la puntera
export const disco = Q => discoDe(discoD(Q));
export function discoDe(D) { // (de cualquier tamaño: lo usa también la moto)
  const r = D / 2; let cs = circ(D).subtract(circ(D - 5.5)); // la pista de frenado
  const brazos = []; for (let i = 0; i < 5; i++) brazos.push(CS().hull([circ(2.6).translate([0, HEX / 2 + 1.6]), circ(2.2).translate([0, r - 2])]).rotate(i * 72 + 18));
  cs = cs.add(N.csUnion(brazos)).add(circ(HEX + 4)); const ag = []; for (let i = 0; i < 20; i++) ag.push(circ(1.1).translate([0, r - 1.4]).rotate(i * 18)); // agujeros de ventilación
  return cs.subtract(N.csUnion(ag)).subtract(hexCS(HEX, PRES)).extrude(discoT);
}
// la PINZA: abierta hacia el buje (el disco entra por ahí) · marco: x a lo largo del disco, y hacia fuera, z hacia dentro desde su cara de
// apoyo · dos orejas con su pasador (Ø2,4) a la pestaña de la vaina o de la barra
export const PINZA = { w: 9, h: 7, px: 5.9, oy: 4.4, pas: 2.4 }; // ancho · alto · dónde van los pasadores (x = ±px, y = oy)
export function pinzaA(prof = PROF) { const { w, h, px, oy, pas } = PINZA, t = prof + discoT / 2 + 0.3 + 1.6, z0 = prof - discoT / 2 - 0.3, top = h / 2 - 1.6;
  let m = conBisel(rr(w, h, 1.6), t, 0.6).subtract(caja(w + 2, top + h / 2 + 1, discoT + 0.6).translate([0, (top - h / 2 - 1) / 2, z0]));
  [-1, 1].forEach(sg => { m = m.add(conBisel(rr(3.4, 5.2, 1).translate([sg * px, oy]), t, 0.4)); }); // las orejas, por fuera del borde del disco y de todo el grueso
  // los agujeros de los pasadores, en gota hacia −y (al imprimirla de pie sobre su lomo, la punta queda arriba)
  [-1, 1].forEach(sg => { const r = pas / 2 + PRES; m = m.subtract(M().hull([cil(2 * r, t + 2, -1), cil(0.1, t + 2, -1).translate([0, -r * Math.SQRT2, 0])]).translate([sg * px, oy, 0])); });
  return { m, t }; }
// se imprime DE PIE sobre las orejas: la ranura del disco queda abierta hacia arriba y el cuerpo es un puente corto entre las orejas
export const pinzaImpresion = () => pinzaA().m.rotate([-90, 0, 0]);
export const ZDISCO = Q => ({ tr: -(Q.zPun - PROF), de: -(Q.zDel - PROF) }); // el plano medio de cada disco
// dónde va la pinza: por encima y detrás del eje, con el borde del disco dentro de la ranura (c = la línea de sus pasadores)
export function sitioPinza(Q, centro, haciaAtras, arriba) { return sitioPinzaD(discoD(Q), centro, haciaAtras, arriba); }
export function sitioPinzaD(D, centro, haciaAtras, arriba) { const dir = uni(sum(haciaAtras, arriba, 1)); return { c: sum(centro, dir, D / 2 - 1.5 + PINZA.oy), dir }; }

// ---------- 3) PLATO, PIÑÓN y CADENA ----------
export function dentado(N1) {
  const C = CADENA, Rp = Rprim(N1), Ro = Rext(N1), rs = 0.505 * C.dr + 0.069, G = [];
  for (let i = 0; i < N1; i++) { const a = i * 2 * Math.PI / N1, q = [Rp * Math.cos(a), Rp * Math.sin(a)], q2 = [(Ro + 0.6) * Math.cos(a), (Ro + 0.6) * Math.sin(a)];
    G.push(CS().hull([circ(2 * rs).translate(q), circ(2 * rs * 1.6).translate(q2)])); } // (el hueco se abre hacia fuera: el rodillo entra y sale solo)
  return { cs: circ(2 * Ro).subtract(N.csUnion(G)), Rp, Ro, rs };
}
// el PIÑÓN: en el eje de atrás (a presión en su cara plana) y su separador hacia la puntera (se imprime con el separador arriba)
export const bossPinon = Q => Math.min(9, 2 * (Q.Rp2 - 1.5));
export function pinon(Q) { const h = perfilD(Q.eje, PRES); return dentado(Q.N2).cs.subtract(h).extrude(CADENA.diente).add(circ(bossPinon(Q)).subtract(h).extrude(sepPinon(Q)).translate([0, 0, CADENA.diente])); }
// el PLATO con su ARAÑA de 5 brazos (acaban antes del fondo de los dientes: no rellenan ningún asiento): a presión en el eje del pedalier; su separador hacia dentro roza la vaina (lo deja en su sitio)
export const sepPlato = Q => Q.zCad - CADENA.diente / 2 - (Q.zPun + Q.tV) - 0.1;
export function plato(Q) { const { cs, Rp } = dentado(Q.N1), rI = Rp - 3.0, rB = 4.6, h = perfilD(EJE_BB, PRES);
  const c2 = cs.subtract(circ(2 * rI)).add(circ(2 * rB)).add(N.csUnion([0, 1, 2, 3, 4].map(i => CS().hull([circ(3.4).translate(en([0, 0], rB, i * 72 * R2)), circ(2.6).translate(en([0, 0], rI + 0.3, (i * 72 + 14) * R2))]))));
  return c2.subtract(h).extrude(CADENA.diente).add(circ(2 * rB).subtract(h).extrude(sepPlato(Q)).translate([0, 0, CADENA.diente])); }
// la CADENA en TPU, de una pieza, impresa en CÍRCULO (al montarla se adapta a plato y piñón): rodillos de pie y dos placas en «8» (abajo y
// arriba, como una cadena de verdad); los dientes entran ENTRE las placas y ENTRE los rodillos; el «8» se estrecha entre rodillos: dobla
export const ochoCadena = (q, q2) => { const C = CADENA, m2 = [(q[0] + q2[0]) / 2, (q[1] + q2[1]) / 2]; return N.csUnion([CS().hull([circ(C.alto).translate(q), circ(C.alto * 0.62).translate(m2)]), CS().hull([circ(C.alto * 0.62).translate(m2), circ(C.alto).translate(q2)])]); };
export function cadenaDe(P) { const C = CADENA, nn = P.length, placa = N.csUnion(P.map((q, i) => ochoCadena(q, P[(i + 1) % nn]))), alto = anchoCadena(), rod = N.csUnion(P.map(q => circ(C.dr).translate(q)));
  return placa.extrude(C.placa).add(placa.extrude(C.placa).translate([0, 0, alto - C.placa])).add(rod.extrude(alto)); }
export function cadena(Q) { const nn = Q.nE, Rc = CADENA.p / (2 * Math.sin(Math.PI / nn)), P = []; for (let i = 0; i < nn; i++) P.push(en([0, 0], Rc, i * 2 * Math.PI / nn)); return cadenaDe(P); }

// ---------- 4) el CUADRO en dos MITADES (iguales: la izquierda es la misma pieza dada la vuelta) ----------
export const EJE_BB = 5, PASADOR = 3, PIN = 2.4, HONDO_PAS = 1.8; // eje del pedalier Ø5 · pasador del nudo Ø3 · pasadores pequeños Ø2,4 (en el cuadro, 1,8 de hondo en cada mitad)
// donde el TUBO DE ABAJO llega a la dirección: tan arriba que su panza no baja de la corona (0,4 por encima) por detrás del eje
export function pDown(Q) { const rho = Q.rT * 1.1, rc = (Q.steer + 5.4) / 2 + 0.5, a = uni(dif(Q.BB, sum(Q.HB, Q.u, Q.rD * 1.1))), av = a[0] * Q.v[0] + a[1] * Q.v[1], au = a[0] * Q.u[0] + a[1] * Q.u[1], s0 = (-rc + rho * au) / av;
  return sum(Q.HB, Q.u, Math.max(Q.rD * 1.1, 0.4 - s0 * au - rho * av)); }
export const nudo = Q => sum(Q.BB, Q.dS, lon(dif(Q.ST, Q.BB)) * 0.84); // el «nudo» del sillín: llegan el tubo de arriba y los tirantes
// sus PASADORES: uno por lado, ciegos en el puente del cuadro (no llegan al agujero de la tija, que pasa por el centro del nudo)
export const NUDO = Q => { const z0 = (Q.tija / 2 + JUSTO) * Math.SQRT2 + 0.6; return { z0, L: Q.zPun + Q.tV - z0 - 0.1 }; };
// el cuadro abierto (paseo): el tubo de arriba baja en curva hasta media altura del tubo del sillín
function curvaAbierta(Q) { const a = sum(Q.HT, Q.u, -Q.rD * 1.1), b = sum(Q.BB, Q.dS, lon(dif(Q.ST, Q.BB)) * 0.42), c = [(a[0] + b[0]) / 2 + Q.sc(40), (a[1] + b[1]) / 2 - Q.sc(70)], P = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12, m = 1 - t; P.push([m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1]]); } return P; }
export function puntosPasadores(Q) { const { BB, u } = Q, pD = pDown(Q), lST = lon(dif(Q.ST, BB)), L = [sum(BB, uni(dif(pD, BB)), lon(dif(pD, BB)) * 0.5), sum(BB, Q.dS, Math.max(Q.rBB + 2, Math.min(lST * 0.42, lST - 30 - 3)))];
  if (Q.E.cuadro === 'abierto') { const P = curvaAbierta(Q); L.push(P[6]); } else { const SC = nudo(Q), pTop = sum(Q.HT, u, -Q.rD * 1.1); L.push([(SC[0] + pTop[0]) / 2, (SC[1] + pTop[1]) / 2]); } return L; }
export function cuadroMitad(Q) {
  const { BB, ST, HB, HT, u, rT, rST, rD, rBB, zPun, rV, steer, tija } = Q, SC = nudo(Q), pTop = sum(HT, u, -rD * 1.1);
  const L = [tubo3(BB, ST, rST), tubo3(BB, pDown(Q), rT * 1.1), cilPl(sum(HB, u, 0.3), HT, rD)]; // (el tubo de dirección empieza 0,3 por encima de la corona)
  if (Q.E.cuadro === 'abierto') { const P = curvaAbierta(Q); for (let i = 1; i < P.length; i++) L.push(tubo3(P[i - 1], P[i], rT)); } else L.push(tubo3(SC, pTop, rT));
  let m = mitad(N.union(L)).add(cilZ(BB, 2 * rBB, 0, zPun)).add(cilZ(SC, 2 * (rV + 0.9), 0, zPun)); // la caja del pedalier y el puente de los tirantes, hasta las vainas
  // la DIRECCIÓN (gira: 0,2 por lado) y la TIJA (encaja: 0,1), en gota · el pedalier (gira) · el pasador de los tirantes (encaja)
  m = m.subtract(gotaPl(sum(HB, u, -1.5), sum(HT, u, 1.5), steer / 2 + GIRA)).subtract(gotaPl(sum(ST, Q.dS, rST + 1), sum(ST, Q.dS, -30), tija / 2 + JUSTO));
  m = m.subtract(cilZ(BB, EJE_BB + 2 * GIRA, -1, zPun + 1)).subtract(cilZ(SC, PASADOR + 2 * JUSTO, NUDO(Q).z0, zPun + 1));
  // los PASADORES que juntan las dos mitades (a presión)
  puntosPasadores(Q).forEach(q => { m = m.subtract(cilZ(q, PIN + 2 * PRES, -0.01, HONDO_PAS)); });
  return m;
}

// ---------- 5) VAINAS Y TIRANTES (un lado): planos, por fuera de la caja; la PUNTERA con el agujero del eje (que gira) ----------
export function vainas(Q, izq) {
  const SC = nudo(Q), qA = Q.A0, qB = Q.BB, r = Q.rV, t = Q.tV, arriba = uni(dif(SC, qA)); // (t = el grueso de las placas: lo que sube el tubo más gordo)
  let m = mitad(N.union([tubo3(qB, qA, r * 1.1, r * 0.9), tubo3(SC, qA, r * 0.95, r * 0.85)]));
  m = m.add(conBisel(circ(2 * Q.rBB * 0.86).translate(qB), t, 0.4)).add(conBisel(circ(2 * (r + 0.9)).translate(SC), t, 0.4)).add(conBisel(circ(9.2).translate(qA), t, 0.4)); // ojal de la caja, del nudo y la puntera
  let pz = null;
  if (izq) { // la pestaña de la pinza: hacia atrás y arriba del eje, a la altura del borde del disco
    const P = sitioPinza(Q, qA, [-1, 0], arriba), tg = [-P.dir[1], P.dir[0]], h1 = sum(P.c, tg, PINZA.px), h2 = sum(P.c, tg, -PINZA.px);
    m = m.add(conBisel(CS().hull([circ(5.6).translate(h1), circ(5.6).translate(h2), circ(5).translate(sum(qA, arriba, 5))]), t, 0.4)); pz = { c: P.c, dir: P.dir, h1, h2 };
    m = m.subtract(cilZ(h1, PIN + 2 * PRES, -1, t + 1)).subtract(cilZ(h2, PIN + 2 * PRES, -1, t + 1)); }
  m = m.subtract(cilZ(qA, Q.eje + 2 * GIRA, -1, t + 1)).subtract(cilZ(qB, EJE_BB + 2 * GIRA, -1, t + 1)).subtract(cilZ(SC, PASADOR + 2 * PRES, -1, t + 1));
  return { m, pz }; // (se imprimen con la cara plana abajo; montadas, la cara plana va por dentro)
}

// ---------- 6) HORQUILLA: dos BARRAS (paralelas a la dirección, con su avance), la CORONA y la DIRECCIÓN; arriba, la POTENCIA ----------
export const PIERNA = Q => ({ t: Math.max(3.4, Q.sc(20)), w: Math.max(4.4, Q.sc(34)), peg: Math.max(3.6, Q.sc(26)) });
// la barra (vista de lado, z = su grosor): del pincho que entra en la corona a la puntera (F)
export function barraHorquilla(Q, izq) {
  const { F, u, v, Cr } = Q, Pg = PIERNA(Q), base = sum(Cr, v, Q.sc(Q.E.av)), wTop = Pg.w * (Q.E.susp ? 0.66 : 0.8), tope = sum(base, u, -(wTop / 2 + 0.3)), mid = sum(F, u, lon(dif(tope, F)) * (Q.E.susp ? 0.5 : 0.3));
  let cs = N.csUnion([capsula(mid, F, Pg.w * (Q.E.susp ? 1.0 : 0.82), Pg.w * 0.82), capsula(tope, mid, wTop, Pg.w * (Q.E.susp ? 0.66 : 0.82)), circ(9.2).translate(F)]);
  if (Q.E.susp) cs = cs.add(capsula(sum(mid, u, -2), sum(mid, u, 2), Pg.w * 1.18)); // el retén de la suspensión
  // el «pincho» que entra en la corona (a presión): de la barra hasta arriba de la corona
  const fin = sum(base, u, Q.corona), ang = Math.atan2(u[1], u[0]) / R2, Lp = lon(dif(fin, tope)); cs = cs.add(rr(Pg.peg, Lp).rotate(ang - 90).translate(entre(tope, fin, 0.5)));
  let pz = null;
  if (izq) { const P = sitioPinza(Q, F, [-v[0], -v[1]], u), tg = [-P.dir[1], P.dir[0]], h1 = sum(P.c, tg, PINZA.px), h2 = sum(P.c, tg, -PINZA.px);
    cs = cs.add(CS().hull([circ(5.8).translate(h1), circ(5.8).translate(h2), circ(5).translate(sum(F, u, 6))])); pz = { c: P.c, dir: P.dir, h1, h2 }; }
  let m = conBisel(cs, Pg.t, Math.min(0.8, Pg.t * 0.22)).subtract(cil(Q.eje + 2 * JUSTO, Pg.t + 2, -1).translate([F[0], F[1], 0]));
  if (pz) m = m.subtract(cil(PIN + 2 * PRES, Pg.t + 2, -1).translate([pz.h1[0], pz.h1[1], 0])).subtract(cil(PIN + 2 * PRES, Pg.t + 2, -1).translate([pz.h2[0], pz.h2[1], 0]));
  return { m, pz };
}
// la CORONA (se imprime con el eje de la dirección de pie): x hacia delante (v), y de lado (z de la bici), z a lo largo de la dirección (u)
export function coronaHorquilla(Q) { const Pg = PIERNA(Q), av = Q.sc(Q.E.av), zL = Q.zDel + Pg.t / 2, h = Q.corona;
  const cs = CS().hull([circ(Q.steer + 5.4), rr(Pg.peg + 4.4, Pg.t + 4.4, 1.6).translate([av, zL]), rr(Pg.peg + 4.4, Pg.t + 4.4, 1.6).translate([av, -zL])]);
  return conBisel(cs, h, 0.8).subtract(perfilD(Q.steer, PRES).extrude(h + 2).translate([0, 0, -1])).subtract(N.csUnion([rr(Pg.peg + 2 * PRES, Pg.t + 2 * PRES).translate([av, zL]), rr(Pg.peg + 2 * PRES, Pg.t + 2 * PRES).translate([av, -zL])]).extrude(h + 2).translate([0, 0, -1])); }
// la DIRECCIÓN: el tubo que gira dentro del tubo de dirección (corona abajo, potencia arriba, las dos a presión en su cara plana)
export const POT = Q => ({ h: 8.4, L: Math.max(9, Q.sc(60)), barra: 4 });
export const largoDireccion = Q => Q.corona + lon(dif(Q.HT, Q.HB)) + 0.3 + POT(Q).h - 0.4;
export const direccion = Q => varilla(Q.steer, largoDireccion(Q));
// la POTENCIA (de pie, como la corona): abraza la dirección y sujeta el manillar (agujero en gota, sin soportes)
const huecoManillar = Q => Q.E.manillar === 'recto' || Q.E.manillar === 'curvo' ? POT(Q).barra / 2 + PRES : 2.25; // (los de BMX y paseo son de sección octogonal: hueco redondo)
export function potencia(Q) { const P = POT(Q), d = Q.steer + 5.2, rb = P.barra / 2 + 2.2, ancho = 8;
  let m = conBisel(circ(d), P.h, 0.6).add(conBisel(CS().hull([circ(d * 0.8), rr(4, ancho, 1).translate([P.L, 0])]), P.h, 0.6));
  m = m.add(M().cylinder(ancho, rb, rb, 32).rotate([90, 0, 0]).translate([P.L, ancho / 2, P.h / 2]));
  const hueco = huecoManillar(Q);
  return m.subtract(perfilD(Q.steer, PRES).extrude(P.h + 2).translate([0, 0, -1])).subtract(M().hull([M().cylinder(ancho + 2, hueco, hueco, 32), M().cylinder(ancho + 2, 0.05, 0.05, 8).translate([0, hueco * Math.SQRT2, 0])]).rotate([90, 0, 0]).translate([P.L, (ancho + 2) / 2, P.h / 2])); }

// ---------- 7) el MANILLAR (4 tipos), los MANGUITOS y las MANETAS ----------
export const ANCHO_MAN = Q => ({ recto: Math.max(70, Q.sc(720)), curvo: Math.max(44, Q.sc(420)), bmx: Math.max(60, Q.sc(700)), paseo: Math.max(64, Q.sc(640)) });
// recto (montaña) y la parte central del curvo: una varilla Ø4 con su cara plana
export const manillarRecto = (Q, L) => varilla(4, L);
// curvo (carretera): la «curva» de cada lado, de perfil, con su casquillo que entra en la punta de la varilla central y la MANETA de
// carretera (la «maneta-cabeza» donde se apoyan las manos) en la parte de delante
export function curvaCarretera(Q) { const a = Q.sc(80), r = Math.max(7, Q.sc(65)), b = Q.sc(90), P = [[0, 0], [a, 0]]; for (let i = 1; i <= 10; i++) { const g = Math.PI / 2 - i * Math.PI / 10; P.push([a + r * Math.cos(g), -r + r * Math.sin(g)]); } P.push([a - b, -2 * r]);
  const cabeza = capsula([a + r * 0.2, 0.6], [a + r * 0.75, 2.4], 5, 3.6), palanca = capsula([a + r * 0.75, 1.8], [a + r * 1.05, -r * 0.9], 3, 2.2);
  const cs = N.csUnion(P.slice(1).map((q, i) => capsula(P[i], q, 4)).concat([cabeza, palanca])); const m = conBisel(cs, 4, 1.1).add(conBisel(circ(7.4), 7, 0.6)); return m.subtract(perfilD(4, PRES).extrude(6).translate([0, 0, 1.2])); }
// BMX (de frente, plano): barra de abajo (va en la potencia), dos montantes, barra de arriba y la CRUCETA
export const altoBMX = Q => Math.max(18, Q.sc(200));
export function manillarBMX(Q) { const W = ANCHO_MAN(Q).bmx / 2, H = altoBMX(Q), b = Q.sc(110), m2 = Q.sc(150);
  return conBisel(N.csUnion([capsula([-b, 0], [b, 0], 4), capsula([-b, 0], [-m2, H], 4), capsula([b, 0], [m2, H], 4), capsula([-W, H], [W, H], 4), capsula([-m2 * 0.9, H * 0.62], [m2 * 0.9, H * 0.62], 3.4)]), 4, 1.17); }
// de paseo (visto desde arriba, plano): el centro va en la potencia, se va hacia atrás y acaba en dos puntas rectas (los puños)
export const PASEO = Q => ({ W: ANCHO_MAN(Q).paseo / 2, B: Math.max(12, Q.sc(160)), c: Q.sc(90), Lp: largoManguito(Q) + 3 });
export function manillarPaseo(Q) { const { W, B, c, Lp } = PASEO(Q), P = [[-W, B + Lp], [-W, B], [-c - (W - c) * 0.4, B * 0.25], [-c, 0], [c, 0], [c + (W - c) * 0.4, B * 0.25], [W, B], [W, B + Lp]];
  return conBisel(N.csUnion(P.slice(1).map((q, i) => capsula(P[i], q, 4))), 4, 1.17); }
// MANGUITOS (de pie; en TPU agarran mejor) y MANETAS (abrazan el manillar) · el agujero: con cara plana (recto) o redondo (BMX, paseo)
export const largoManguito = Q => Math.max(14, Q.sc(130));
const huecoBarra = (Q, mas) => Q.E.manillar === 'recto' ? perfilD(4, mas) : circ(2 * 2.25);
export function manguito(Q) { const L = largoManguito(Q); let m = conBisel(circ(7.2), L, 0.8); for (let z = 2.5; z < L - 2; z += 2.2) m = m.subtract(circ(7.6).subtract(circ(6.7)).extrude(0.7).translate([0, 0, z])); return m.subtract(huecoBarra(Q, PRES).extrude(L - 1).translate([0, 0, 1])); }
export const largoManeta = Q => Math.max(10, Q.sc(90));
export function maneta(Q) { const L = largoManeta(Q); return conBisel(N.csUnion([circ(7.4), capsula([0, 0], [L, -L * 0.35], 3.2, 2.4)]), 2.6, 0.5).subtract(huecoBarra(Q, JUSTO).extrude(4).translate([0, 0, -1])); }

// ---------- 8) BIELAS, EJE DEL PEDALIER, PEDALES; TIJA y SILLÍN ----------
// las bielas van por FUERA de la cadena; cada una lleva su separador hacia dentro (la derecha toca el plato; la izquierda, la vaina)
export const BIELA = Q => ({ L: Math.max(18, Q.sc(170)), t: 3.4, z: Q.zCad + anchoCadena() / 2 + 0.3 }); // z = su cara de dentro
export const sepBiela = (Q, derecha) => derecha ? BIELA(Q).z - (Q.zCad + CADENA.diente / 2) - 0.02 : BIELA(Q).z - (Q.zPun + Q.tV) - 0.1;
export function biela(Q, derecha) { const B = BIELA(Q), h = derecha ? perfilD(EJE_BB, PRES) : perfilD(EJE_BB, PRES).rotate(180); // (la izquierda va girada media vuelta: su cara plana también)
  return conBisel(capsula([0, 0], [B.L, 0], 9.6, 6.4), B.t, 0.6).add(circ(9).extrude(sepBiela(Q, derecha)).translate([0, 0, B.t])).subtract(h.extrude(B.t + 20).translate([0, 0, -1])).subtract(cil(PIN + 2 * PRES, B.t + 2, -1).translate([B.L, 0, 0])); }
export const largoEjeBB = Q => 2 * (BIELA(Q).z + BIELA(Q).t) - 0.2;
export const PEDAL = Q => ({ w: Math.max(11, Q.sc(100)), l: Math.max(9, Q.sc(90)), t: 4.6 });
export function pedal(Q) { const P = PEDAL(Q); let m = conBisel(rr(P.w, P.l, 1.6), P.t, 0.6); for (let i = -1; i <= 1; i++) m = m.subtract(caja(P.w - 3, 0.8, 0.8).translate([0, i * P.l * 0.3, P.t - 0.7]));
  const r = PIN / 2 + GIRA; return m.subtract(M().hull([M().cylinder(P.w + 2, r, r, 24), M().cylinder(P.w + 2, 0.05, 0.05, 8).translate([0, r * Math.SQRT2, 0])]).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([-P.w / 2 - 1, 0, P.t / 2])); }
export const largoPasaPedal = Q => BIELA(Q).t + 0.3 + PEDAL(Q).w + 0.05 + 1.4;
export function tapaPequena() { return conBisel(circ(5.4), 2, 0.5).subtract(perfilD(PIN, PRES).extrude(2).translate([0, 0, 0.5])); }
export const largoTija = Q => 28 + Math.max(10, Q.sc(110));
const SILLIN = Q => ({ L: Math.max(24, Q.sc(270)), W: Math.max(10, Q.sc(150)), nz: Math.max(4.6, Q.sc(40)), inc: 90 - Q.E.as });
export function sillin(Q) { const { L, W, nz, inc } = SILLIN(Q);
  const cs = CS().hull([circ(nz).translate([L / 2 - nz / 2, 0]), circ(W * 0.5).translate([-L / 2 + W * 0.42, W * 0.22]), circ(W * 0.5).translate([-L / 2 + W * 0.42, -W * 0.22])]);
  // se imprime BOCA ABAJO (el asiento en la cama); debajo, el casquillo de la tija con su inclinación (la del tubo del sillín)
  const b = conBisel(circ(Q.tija + 4.4), 9.5, 0.5).rotate([0, inc, 0]).translate([-L * 0.08, 0, 1.2]); // (empieza metido en el sillín: su cara de abajo, inclinada, no deja hueco)
  return conBisel(cs, 3.6, 1.2).add(b).subtract(cil(Q.tija + 2 * PRES, 9, 0).rotate([0, inc, 0]).translate(SILLIN_H0(Q))); }
// el fondo del agujero de la tija en el sillín (en el eje del casquillo, a 4,8 del asiento) y hacia dónde sale
export const SILLIN_H0 = Q => { const { L, inc } = SILLIN(Q); return [-L * 0.08 + 3.6 * Math.tan(inc * R2), 0, 4.8]; };
// la PEANA: dos CUNAS (una por rueda) y una BARRA que las une, con el nombre (así cabe en la cama aunque la bici sea larga)
export const PEANA = Q => ({ lc: Math.max(36, Q.R * 1.1, Q.F ? Q.F[0] - Q.A0[0] + 16 - 0.4 - 240 : 0), wp: Math.max(30, 2 * Q.zPun + 18), bas: 6, hund: 2.4, bw: 10, bh: 3.6, meteB: 8 });
export function cunaPeana(Q) { const P = PEANA(Q), hueco = Q.aN + 0.4, alto = Math.max(6, Q.R * 0.32);
  let m = conBisel(rr(P.lc, P.wp, 6), P.bas, 0.8);
  const mej = k => M().hull([caja(P.lc * 0.9, 3.4, 0.02), caja(P.lc * 0.5, 3.4, 0.02).translate([0, 0, alto])]).translate([0, k * (hueco / 2 + 1.7), P.bas - 0.01]); m = m.add(mej(-1)).add(mej(1));
  m = m.subtract(M().cylinder(P.wp, Q.R + 2, Q.R + 2, 192).rotate([90, 0, 0]).translate([0, P.wp / 2, Q.R + 2 + P.bas - P.hund]).intersect(caja(Q.R * 2, hueco, 60))); // (la rueda apoya abajo, en el fondo)
  // el hueco de la barra (por debajo, abierto hacia el lado de la otra cuna): la barra apoya en la mesa
  return m.subtract(caja(P.meteB * 2, P.bw + 2 * JUSTO, P.bh + JUSTO).translate([P.lc / 2, 0, -0.01])); }
export const largoBarraPeana = Q => { const P = PEANA(Q); return Q.F[0] - Q.A0[0] - P.lc + 2 * P.meteB - 0.4; };
export function barraPeana(Q, txt) { const P = PEANA(Q), L = largoBarraPeana(Q); let m = conBisel(rr(L, P.bw, 1.5), P.bh, 0.5);
  const t = String(txt || '').trim(); if (t) { try { const T = N.centraCS(N.texto2(t, 'gorda', 6)), b = N.cajaCS(T), k = Math.min(1, (L - 2 * P.meteB - 6) / b.w, (P.bw - 3) / b.h); m = m.subtract(T.scale([k, k]).extrude(1).translate([0, 0, P.bh - 0.99])); } catch (e) { } }
  return m; }

// ---------- 9) TODO EL KIT: las piezas para imprimir y la bici MONTADA (y lo que gira con la dirección, para las pruebas) ----------
// grupos del montaje: 'fijo' (cuadro y lo pegado a él) · 'tr' (gira con la rueda de atrás) · 'bie' (gira con las bielas) · 'cad' (la cadena)
// · 'dir' (gira con el manillar) · 'de' (gira con la rueda de delante; y con el manillar) · 'peana'
export function bici(p) {
  const Q = medidas(p), E = Q.E, C = CADENA, piezas = [], mon = [], pon = (k, m, g = 'fijo') => { mon.push({ k, m, g }); return m; };
  const add = (t, m, veces = 1) => { for (let i = 0; i < veces; i++) piezas.push([t, m]); };
  const wR = Q.wR, Pg = PIERNA(Q), ZD = ZDISCO(Q), girosZ = (m, g, q) => m.rotate([0, 0, g]).translate([q[0], q[1], 0]);
  // el CUADRO
  const cm = cuadroMitad(Q); add('Cuadro (mitad: se imprimen 2)', cm, 2); pon('cuadroD', cm); pon('cuadroI', cm.mirror([0, 0, 1]));
  add('Pasador del cuadro', varilla(PIN, 2 * HONDO_PAS - 0.2), 3);
  puntosPasadores(Q).forEach((q, i) => pon('pasCuadro' + i, varZ(PIN, 2 * HONDO_PAS - 0.2, q, -HONDO_PAS + 0.1)));
  // VAINAS Y TIRANTES (montadas: la cara plana por dentro, contra la caja y el nudo)
  const VD = vainas(Q, false), VI = vainas(Q, true); add('Vaina y tirante derechos', VD.m); add('Vaina y tirante izquierdos (con la pestaña del freno)', VI.m);
  pon('vainasD', VD.m.translate([0, 0, Q.zPun])); pon('vainasI', VI.m.mirror([0, 0, 1]).translate([0, 0, -Q.zPun]));
  const SC = nudo(Q), Nu = NUDO(Q); add('Pasador del nudo (tirantes)', varilla(PASADOR, Nu.L), 2); pon('pasNudoD', varZ(PASADOR, Nu.L, SC, Nu.z0 + 0.1)); pon('pasNudoI', varZ(PASADOR, Nu.L, SC, -Nu.z0 - 0.1 - Nu.L));
  // RUEDA DE ATRÁS: todo lo que gira con el eje se monta en el origen, se gira con la fase del piñón y se lleva al eje
  { const g = Q.fasePinon, Lh = largoBuje(Q, true), Et = ejeTr(Q), zt = ZD.tr;
    add('Llanta trasera', llanta(Q)); add('Neumático trasero (TPU)', neumatico(Q)); add('Buje trasero', buje(Q, true)); add('Eje trasero (gira con la rueda)', varilla(Q.eje, Et.z1 - Et.z0)); add('Tapa de eje (el tope)', tapaEje(Q), 2); add('Disco de freno trasero', disco(Q));
    add('Piñón (' + Q.N2 + ' dientes, con su separador)', pinon(Q));
    pon('llantaTr', girosZ(llanta(Q).mirror([0, 0, 1]).translate([0, 0, wR / 2]), g, Q.A0), 'tr'); pon('neumTr', girosZ(neumatico(Q).translate([0, 0, -Q.aN / 2]), g, Q.A0), 'tr');
    pon('bujeTr', girosZ(buje(Q, true).translate([0, 0, -Lh / 2]), g, Q.A0), 'tr'); pon('ejeTr', girosZ(perfilD(Q.eje).extrude(Et.z1 - Et.z0).translate([0, 0, Et.z0]), g, Q.A0), 'tr');
    pon('discoTr', girosZ(disco(Q).translate([0, 0, zt - discoT / 2]), g, Q.A0), 'tr');
    pon('pinon', girosZ(pinon(Q).mirror([0, 0, 1]).translate([0, 0, Q.zCad + C.diente / 2]), g, Q.A0), 'tr');
    pon('tapaTrI', girosZ(tapaEje(Q).translate([0, 0, Et.z0 - 0.9]), g, Q.A0), 'tr'); pon('tapaTrD', girosZ(tapaEje(Q).mirror([0, 0, 1]).translate([0, 0, Et.z1 + 0.9]), g, Q.A0), 'tr'); }
  // RUEDA DE DELANTE: eje quieto (entre las barras) y la rueda gira en él
  { const Lh = largoBuje(Q, false), Ed = ejeDe(Q), zd = ZD.de, F = Q.F;
    add('Llanta delantera', llanta(Q)); add('Neumático delantero (TPU)', neumatico(Q)); add('Buje delantero', buje(Q, false)); add('Eje delantero', varilla(Q.eje, Ed.z1 - Ed.z0)); add('Tapa de eje (el tope)', tapaEje(Q), 2); add('Disco de freno delantero', disco(Q));
    pon('llantaDe', llanta(Q).mirror([0, 0, 1]).translate([F[0], F[1], wR / 2]), 'de'); pon('neumDe', neumatico(Q).translate([F[0], F[1], -Q.aN / 2]), 'de'); pon('bujeDe', buje(Q, false).translate([F[0], F[1], -Lh / 2]), 'de');
    pon('ejeDe', varZ(Q.eje, Ed.z1 - Ed.z0, F, Ed.z0), 'dir'); pon('discoDe', disco(Q).translate([F[0], F[1], zd - discoT / 2]), 'de');
    pon('tapaDeI', tapaEje(Q).translate([F[0], F[1], Ed.z0 - 0.9]), 'dir'); pon('tapaDeD', tapaEje(Q).mirror([0, 0, 1]).translate([F[0], F[1], Ed.z1 + 0.9]), 'dir'); }
  // la CADENA montada, rodillo a rodillo; el PLATO y las BIELAS con la fase del plato (el eje del pedalier y su cara plana giran con ellos)
  add('Cadena (TPU: ' + Q.nE + ' eslabones)', cadena(Q)); pon('cadena', cadenaDe(Q.rodillos).translate([0, 0, Q.zCad - Q.anchoC / 2]), 'cad');
  { const g = Q.fasePlato, Bi = BIELA(Q), Lbb = largoEjeBB(Q), Pd = PEDAL(Q), Lpp = largoPasaPedal(Q);
    add('Plato (' + Q.N1 + ' dientes, con su araña)', plato(Q)); add('Biela derecha', biela(Q, true)); add('Biela izquierda', biela(Q, false)); add('Eje del pedalier', varilla(EJE_BB, Lbb));
    add('Pedal', pedal(Q), 2); add('Pasador del pedal', varilla(PIN, Lpp), 2); add('Tapa pequeña (del pedal)', tapaPequena(), 2);
    pon('plato', girosZ(plato(Q).mirror([0, 0, 1]).translate([0, 0, Q.zCad + C.diente / 2]), g, Q.BB), 'bie'); pon('ejeBB', girosZ(perfilD(EJE_BB).extrude(Lbb).translate([0, 0, -Lbb / 2]), g, Q.BB), 'bie');
    pon('bielaD', girosZ(biela(Q, true).mirror([0, 0, 1]).translate([0, 0, Bi.z + Bi.t]), g, Q.BB), 'bie'); pon('bielaI', girosZ(biela(Q, false).translate([0, 0, -Bi.z - Bi.t]), g + 180, Q.BB), 'bie');
    [1, -1].forEach((sg, i) => { const pe = sum(Q.BB, dirAng(sg > 0 ? g : g + 180), Bi.L), z0 = sg * (Bi.z + Bi.t + 0.3), zc = sg * (Bi.z + Bi.t + 0.3 + Pd.w + 0.05);
      pon('pedal' + i, N.transforma(pedal(Q), M4([0, 0, sg], [sg, 0, 0], [0, 1, 0], [pe[0], pe[1] - Pd.t / 2, z0 + sg * Pd.w / 2])), 'bie');
      pon('pasPedal' + i, sg > 0 ? varZ(PIN, Lpp, pe, Bi.z) : varZ(PIN, Lpp, pe, -Bi.z - Lpp), 'bie');
      pon('tapaPedal' + i, sg > 0 ? tapaPequena().mirror([0, 0, 1]).translate([pe[0], pe[1], zc + 2]) : tapaPequena().translate([pe[0], pe[1], zc - 2]), 'bie'); }); }
  // la HORQUILLA, la CORONA, la DIRECCIÓN y la POTENCIA (su marco: x = v, y = −z de la bici, z = u)
  const { u, v } = Q, mD = M4([v[0], v[1], 0], [0, 0, -1], [u[0], u[1], 0], [Q.Cr[0], Q.Cr[1], 0]);
  const HD = barraHorquilla(Q, false), HI = barraHorquilla(Q, true); add('Barra de la horquilla derecha', HD.m); add('Barra de la horquilla izquierda (con la pestaña del freno)', HI.m);
  pon('barraD', HD.m.translate([0, 0, Q.zDel]), 'dir'); pon('barraI', HI.m.mirror([0, 0, 1]).translate([0, 0, -Q.zDel]), 'dir');
  add('Corona de la horquilla', coronaHorquilla(Q)); pon('corona', N.transforma(coronaHorquilla(Q), mD), 'dir');
  const Ls = largoDireccion(Q); add('Dirección (el tubo que gira)', direccion(Q)); pon('direccion', N.transforma(perfilD(Q.steer).extrude(Ls), mD), 'dir');
  const Po = POT(Q), oP = sum(Q.HT, u, 0.3); add('Potencia', potencia(Q)); pon('potencia', N.transforma(potencia(Q), M4([v[0], v[1], 0], [0, 0, -1], [u[0], u[1], 0], [oP[0], oP[1], 0])), 'dir');
  // el MANILLAR en la potencia, sus MANGUITOS y MANETAS
  const cl = sum(sum(oP, v, Po.L), u, Po.h / 2), AM = ANCHO_MAN(Q), Lg = largoManguito(Q);
  const manetaEn = (k, q, z) => pon(k, maneta(Q).translate([q[0], q[1], z]), 'dir'); // (la palanca hacia delante y abajo)
  if (E.manillar === 'recto') { const Wb = AM.recto; add('Manillar', manillarRecto(Q, Wb)); pon('manillar', varZ(4, Wb, cl, -Wb / 2), 'dir');
    add('Manguito (TPU)', manguito(Q), 2); add('Maneta de freno', maneta(Q), 2);
    pon('manguitoD', manguito(Q).mirror([0, 0, 1]).translate([cl[0], cl[1], Wb / 2 + 1]), 'dir'); pon('manguitoI', manguito(Q).translate([cl[0], cl[1], -Wb / 2 - 1]), 'dir');
    manetaEn('manetaD', cl, Wb / 2 + 1 - Lg - 0.4 - 2.6); manetaEn('manetaI', cl, -(Wb / 2 + 1 - Lg - 0.4)); }
  else if (E.manillar === 'curvo') { const Wb = AM.curvo; add('Manillar (parte central)', manillarRecto(Q, Wb)); pon('manillar', varZ(4, Wb, cl, -Wb / 2), 'dir'); const Cu = curvaCarretera(Q); add('Curva del manillar (con su maneta)', Cu, 2);
    pon('curvaD', Cu.mirror([0, 0, 1]).translate([cl[0], cl[1], Wb / 2 + 1.2]), 'dir'); pon('curvaI', Cu.translate([cl[0], cl[1], -Wb / 2 - 1.2]), 'dir'); }
  else if (E.manillar === 'bmx') { const Wb = AM.bmx, H = altoBMX(Q), Bm = manillarBMX(Q), q = [cl[0], cl[1] + H], fin = Wb / 2 + 2; add('Manillar BMX (con cruceta)', Bm); pon('manillar', N.transforma(Bm, M4([0, 0, -1], [0, 1, 0], [1, 0, 0], [cl[0] - 2, cl[1], 0])), 'dir');
    add('Manguito (TPU)', manguito(Q), 2); add('Maneta de freno', maneta(Q), 2);
    pon('manguitoD', manguito(Q).mirror([0, 0, 1]).translate([q[0], q[1], fin + 1]), 'dir'); pon('manguitoI', manguito(Q).translate([q[0], q[1], -fin - 1]), 'dir');
    manetaEn('manetaD', q, fin + 1 - Lg - 0.4 - 2.6); manetaEn('manetaI', q, -(fin + 1 - Lg - 0.4)); }
  else { const Pa = PASEO(Q), Bp = manillarPaseo(Q); add('Manillar de paseo', Bp); pon('manillar', N.transforma(Bp, M4([0, 0, -1], [-1, 0, 0], [0, 1, 0], [cl[0], cl[1] - 2, 0])), 'dir');
    add('Manguito (TPU)', manguito(Q), 2); add('Maneta de freno', maneta(Q), 2);
    // los puños van hacia atrás (a lo largo de −x): el fondo del manguito en la punta del manillar
    const xF = cl[0] - Pa.B - Pa.Lp - 3.1, gM = M4([0, 0, -1], [0, 1, 0], [1, 0, 0], [0, 0, 0]);
    [1, -1].forEach((sg, i) => { pon('manguito' + i, N.transforma(manguito(Q), gM).translate([xF, cl[1], sg * Pa.W]), 'dir');
      pon('maneta' + i, N.transforma(maneta(Q), M4([0, 0, -sg], [0, 1, 0], [sg, 0, 0], [0, 0, 0])).translate([xF + Lg + 0.4 + (sg > 0 ? 0 : 2.6), cl[1], sg * Pa.W]), 'dir'); }); }
  // la TIJA y el SILLÍN
  const Lt = largoTija(Q), dS = Q.dS, ang = Math.atan2(dS[1], dS[0]) / R2, t0 = sum(Q.ST, dS, -28), PT = sum(t0, dS, Lt);
  add('Tija', varilla(Q.tija, Lt)); pon('tija', perfilD(Q.tija).extrude(Lt).rotate([0, 90, 0]).rotate([0, 0, ang]).translate([t0[0], t0[1], 0]));
  { const Si = sillin(Q), H0 = SILLIN_H0(Q), inc = SILLIN(Q).inc * R2, fin = [H0[0] + Math.sin(inc) * 0.6, H0[1], H0[2] + Math.cos(inc) * 0.6], fS = [fin[0], -fin[2], fin[1]]; // (de impresión a la bici: (x, y, z) → (x, −z, y))
    add('Sillín (boca abajo)', Si); pon('sillin', Si.rotate([90, 0, 0]).translate([PT[0] - fS[0], PT[1] - fS[1], -fS[2]])); }
  // las PINZAS (las dos iguales): la de atrás en la pestaña de la vaina izquierda; la de delante, en la barra izquierda
  const Pz = pinzaA(), Lpz = t => t + Pz.t - 0.1;
  add('Pinza de freno (de pie sobre sus orejas)', pinzaImpresion(), 2); add('Pasador de la pinza trasera', varilla(PIN, Lpz(Q.tV)), 2); add('Pasador de la pinza delantera', varilla(PIN, Lpz(Pg.t)), 2);
  [[VI.pz, Q.zPun, Q.tV, 'Tr', 'fijo'], [HI.pz, Q.zDel, Pg.t, 'De', 'dir']].forEach(([pz, zc, tt, k, gr]) => { const O = sum(pz.c, pz.dir, -PINZA.oy), tg = [-pz.dir[1], pz.dir[0]];
    pon('pinza' + k, N.transforma(Pz.m, M4([-tg[0], -tg[1], 0], [pz.dir[0], pz.dir[1], 0], [0, 0, 1], [O[0], O[1], -zc])), gr);
    [pz.h1, pz.h2].forEach((h, i) => pon('pasPinza' + k + i, varZ(PIN, Lpz(tt), h, -zc - tt + 0.05), gr)); });
  // la PEANA: dos cunas y su barra; todo de pie sobre ella (las ruedas apoyan en el fondo de su cuna)
  const Pe = PEANA(Q), xc = (Q.A0[0] + Q.F[0]) / 2, zS = Pe.bas - Pe.hund + 0.05;
  add('Cuna de la peana', cunaPeana(Q), 2); add('Barra de la peana' + (String(p.txt || '').trim() ? ' (con el nombre)' : ''), barraPeana(Q, p.txt));
  const montaje = mon.map(x => ({ k: x.k, g: x.g, m: x.m.rotate([90, 0, 0]).translate([-xc, 0, zS]) }));
  montaje.push({ k: 'cunaTr', g: 'peana', m: cunaPeana(Q).translate([Q.A0[0] - xc, 0, 0]) }, { k: 'cunaDe', g: 'peana', m: cunaPeana(Q).rotate([0, 0, 180]).translate([Q.F[0] - xc, 0, 0]) },
    { k: 'barraPeana', g: 'peana', m: barraPeana(Q, p.txt).translate([0, 0, 0.02]) });
  return { Q, piezas, montaje, xc, zS };
}
// las CAMAS (P1P, 250 × 250): de la más alta a la más baja, en filas
export function repartir(D, lado = 250, sep = 5) { const C = D.map((b, i) => ({ i, b })).sort((a, b) => b.b[1] - a.b[1] || b.b[0] - a.b[0]), out = []; let cama = [], x = 0, y = 0, fila = 0;
  for (const c of C) { const [w, h] = c.b; if (x > 0 && x + w > lado) { x = 0; y += fila + sep; fila = 0; } if (cama.length && y + h > lado) { out.push(cama); cama = []; x = 0; y = 0; fila = 0; } cama.push(c.i); x += w + sep; fila = Math.max(fila, h); }
  if (cama.length) out.push(cama); return out; }
function enCama(L, sep = 5) { const C = L.map(m => ({ m, b: N.caja(m) })).sort((a, b) => b.b.dims[1] - a.b.dims[1] || b.b.dims[0] - a.b.dims[0]); let x = 0, y = 0, fila = 0;
  const pos = C.map(c => { if (x > 0 && x + c.b.dims[0] > 250) { x = 0; y += fila + sep; fila = 0; } const o = [x - c.b.min[0], y - c.b.min[1]]; x += c.b.dims[0] + sep; fila = Math.max(fila, c.b.dims[1]); return o; });
  return N.aLaCama(N.union(C.map((c, i) => c.m.translate([pos[i][0], pos[i][1], -c.b.min[2]])))); }
const GRUPOS = { cuadro: /^Cuadro|^Vaina|^Pasador del (cuadro|nudo)/, ruedas: /^Llanta|^Neumático|^Buje|^Eje (trasero|delantero)|^Tapa de eje|^Piñón/, transmision: /^Cadena|^Piñón|^Plato|^Biela|^Eje del pedalier|^Pedal|^Pasador del pedal|^Tapa pequeña/, horquilla: /^Barra de la horquilla|^Corona|^Dirección|^Potencia/, mando: /^Manillar|^Curva|^Manguito|^Maneta|^Tija|^Sillín/, frenos: /^Pinza|^Pasador de la pinza|^Disco/, peana: /^Cuna|^Barra de la peana/ };
const esTPU = t => /TPU/.test(t);
// lo que reutiliza la moto (y lo que venga): utilidades, el plan de la cadena, la cama
export const UTIL = { sum, dif, lon, uni, dirAng, en, entre, R2, Rprim, Rext, tramos, rodillos, esfera, tubo3, cilZ, cilPl, gotaPl, mitad, perfilD, varilla, capsula, M4, varZ, girosZ: (m, g, q) => m.rotate([0, 0, g]).translate([q[0], q[1], 0]), enCama, esTPU };
function camasDe(R) { const L = R.piezas.map((x, i) => i), rig = L.filter(i => !esTPU(R.piezas[i][0])), blan = L.filter(i => esTPU(R.piezas[i][0])), dims = i => N.caja(R.piezas[i][1]).dims;
  return { pla: repartir(rig.map(dims)).map(c => c.map(j => rig[j])), tpu: repartir(blan.map(dims)).map(c => c.map(j => blan[j])) }; }
// 🧪 la PRUEBA DE ENCAJE (pocos gramos): puntera, buje, eje, tapa, piñón y un trozo de cadena; un trozo de tija en su tubo; biela en su eje
export function pruebaBici(p) { const Q = medidas(p), t = Q.tV, L = [];
  L.push(conBisel(circ(12), t, 0.4).subtract(cil(Q.eje + 2 * GIRA, t + 2, -1))); // la puntera (el eje gira)
  L.push(conBisel(hexCS(HEX), 6, 0.5).subtract(perfilD(Q.eje, PRES).extrude(8).translate([0, 0, -1]))); // el buje de atrás (a presión en el eje)
  L.push(varilla(Q.eje, 16)); L.push(tapaEje(Q)); L.push(pinon(Q));
  const P = []; for (let i = 0; i < 9; i++) P.push([i * CADENA.p, 0]); const cs = N.csUnion(P.slice(1).map((q, i) => ochoCadena(P[i], q))), al = anchoCadena(), rod = N.csUnion(P.map(q => circ(CADENA.dr).translate(q)));
  L.push(cs.extrude(CADENA.placa).add(cs.extrude(CADENA.placa).translate([0, 0, al - CADENA.placa])).add(rod.extrude(al))); // un trozo de cadena (en PLA vale para probar)
  const lt = 12; L.push(mitad(tubo3([0, 0], [lt, 0], Q.rST)).subtract(gotaPl([-1, 0], [lt + 1, 0], Q.tija / 2 + JUSTO))); L.push(varilla(Q.tija, 14)); // medio tubo del sillín y un trozo de tija
  L.push(conBisel(capsula([0, 0], [14, 0], 9.6, 6.4), BIELA(Q).t, 0.6).subtract(perfilD(EJE_BB, PRES).extrude(6).translate([0, 0, -1])).subtract(cil(PIN + 2 * PRES, 6, -1).translate([14, 0, 0]))); L.push(varilla(EJE_BB, 12)); L.push(varilla(PIN, 8));
  return L; }
export function genBici(p) {
  const que = p.que || 'cama1';
  if (que === 'prueba') return enCama(pruebaBici(p));
  const R = bici(p);
  if (que === 'montado') return N.union(R.montaje.map(x => x.m));
  let L = R.piezas.map((x, i) => i);
  if (GRUPOS[que]) L = L.filter(i => GRUPOS[que].test(R.piezas[i][0]));
  else if (/^(cama|tpu)\d$/.test(que)) { const Cs = camasDe(R), lista = que[0] === 't' ? Cs.tpu : Cs.pla, k = +que.slice(-1) - 1;
    if (!lista[k]) N.mal('Esta bici va en ' + Cs.pla.length + ' camas de PLA (o PETG) y ' + Cs.tpu.length + ' de TPU: elige «Cama 1»…«Cama ' + Cs.pla.length + '» o «TPU 1»' + (Cs.tpu.length > 1 ? '…«TPU ' + Cs.tpu.length + '»' : '') + '.'); L = lista[k]; }
  if (!L.length) N.mal('No hay piezas en «' + que + '».');
  return enCama(L.map(i => R.piezas[i][1]));
}
export function camasBici(p) { const R = bici(p), Cs = camasDe(R), nom = c => { const k = {}; c.forEach(i => { const t = R.piezas[i][0].replace(/ \(.*\)$/, ''); k[t] = (k[t] || 0) + 1; }); return Object.entries(k).map(([t, v]) => (v > 1 ? v + ' × ' : '') + t.toLowerCase()).join(', '); };
  return { pla: Cs.pla.map(nom), tpu: Cs.tpu.map(nom), R }; }

const QUE = [['cama1', 'Cama 1 (PLA)'], ['cama2', 'Cama 2 (PLA)'], ['cama3', 'Cama 3 (PLA)'], ['cama4', 'Cama 4 (PLA)'], ['cama5', 'Cama 5 (PLA)'], ['cama6', 'Cama 6 (PLA)'], ['cama7', 'Cama 7 (PLA)'], ['tpu1', 'TPU 1: cadena, neumáticos, manguitos'], ['tpu2', 'TPU 2 (si no cabe en una)'], ['tpu3', 'TPU 3 (ruedas grandes)'],
  ['prueba', '🧪 Prueba de encaje (pocos gramos)'], ['cuadro', 'Solo el cuadro y las vainas'], ['ruedas', 'Solo las ruedas'], ['transmision', 'Solo plato, piñón, cadena, bielas y pedales'], ['horquilla', 'Solo horquilla, dirección y potencia'], ['mando', 'Solo manillar, manguitos, manetas, tija y sillín'], ['frenos', 'Solo los frenos de disco'], ['peana', 'Solo la peana'], ['montado', '👀 Verla montada (solo para mirar)']];
const conDientes = p => Object.assign({}, p, { plato: +p.plato || 0, pinon: +p.pinon || 0 });
export const DISENOS_BICI = {
  biciPro: { cat: 'juguetes', tambien: ['pro', 'regalos', 'mecanica'], nuevo: true, busca: 'bicicleta bici bike mtb montaña carretera bmx paseo kit piezas cadena plato piñón horquilla dirección freno disco maqueta', e: '🚲', t: 'Bicicleta PRO por piezas (funciona: cadena, dirección y frenos)', d: 'Como una de verdad, a escala: cuadro de tubos redondos, horquilla que gira, cadena de TPU que engrana con plato y piñón, frenos de disco, tapas de tope. Montaña, carretera, BMX y paseo', uso: 'encaje', color: '#e63946',
    campos: [s('estilo', 'Estilo', 'montana', Object.entries(ESTILOS).map(([k, X]) => [k, X.t])), n('rueda', 'Rueda (Ø con su neumático)', 120, 80, 170, 1), s('que', 'Qué imprimo', 'cama1', QUE), n('plato', 'Dientes del plato (0 = los de su estilo)', 0, 0, 40, 1, ''), n('pinon', 'Dientes del piñón (0 = los de su estilo)', 0, 0, 18, 1, ''), tx('txt', 'Nombre en la peana', '')],
    gen: p => genBici(conDientes(p)),
    nota: p => { let C = null; try { C = camasBici(conDientes(p)); } catch (e) { return '⚠️ ' + e.message; } const R = C.R, Q = R.Q, larga = Math.round(Q.F[0] - Q.A0[0] + Q.D);
      if (p.que === 'montado') return '👀 Así queda montada (solo para mirar): ' + larga + ' mm de larga. Para imprimir: «Cama 1»…«Cama ' + C.pla.length + '» en PLA o PETG y «TPU 1»' + (C.tpu.length > 1 ? ' y «TPU 2»' : '') + ' (cadena, neumáticos y manguitos).';
      if (p.que === 'prueba') return '🧪 PRUEBA DE ENCAJE (unos 10 g, 30 minutos): con tus holguras de verdad. Mete el EJE en la PUNTERA: tiene que GIRAR suelto. El BUJE y la TAPA entran en el eje A PRESIÓN (por su cara plana) y no bailan. Pasa el TROZO DE CADENA por el PIÑÓN: los rodillos caen entre los dientes y los dientes entre las placas. La TIJA entra en el medio tubo justa. La BIELA entra a presión en su eje y el pasador en su agujero. Si algo va duro, lija un poco; si baila, dímelo y lo ajusto antes de imprimir la bici entera.';
      return 'PARA QUÉ: una ' + Q.E.t.split(':')[0].toLowerCase() + ' de ' + larga + ' mm que FUNCIONA como una de verdad: pedaleas y la cadena mueve la rueda de atrás (plato de ' + Q.N1 + ' y piñón de ' + Q.N2 + ': cada vuelta de pedal, ' + n2(Q.N1 / Q.N2) + ' vueltas de rueda), el manillar gira la horquilla y los frenos de disco llevan su pinza. '
        + 'VA EN ' + C.pla.length + ' CAMAS de la P1P en PLA o PETG (' + C.pla.map((t, i) => 'Cama ' + (i + 1) + ': ' + t).join(' · ') + ') y ' + C.tpu.length + ' de TPU (' + C.tpu.map((t, i) => 'TPU ' + (i + 1) + ': ' + t).join(' · ') + '). Todo sin soportes. Antes, la «🧪 Prueba de encaje». '
        + 'CÓMO SE MONTA: (1) las dos mitades del cuadro con sus 3 pasadores; (2) las vainas y tirantes por fuera (cara plana hacia dentro): el pasador del nudo arriba; (3) el pedalier: el eje por las vainas y la caja, el PLATO (su separador hacia dentro) y las BIELAS a presión en su cara plana, con la CADENA ya puesta en el plato; '
        + '(4) rueda de atrás: neumático en la llanta, llanta y disco en el buje, y el EJE por la puntera izquierda, el buje (a presión) y la puntera derecha; fuera, el PIÑÓN con la cadena (separador hacia la puntera) y las dos TAPAS a presión: son el TOPE, la rueda ya no se sale. La cadena va un 0,8 % corta: al ponerla en el piñón se estira y queda tensa; '
        + '(5) la horquilla: barras en la corona, la DIRECCIÓN por la corona y el tubo de dirección, la POTENCIA arriba (gira con el manillar); la rueda de delante entre las barras con su eje y sus tapas; (6) manillar' + (Q.E.manillar === 'curvo' ? ' y sus curvas' : ', manguitos y manetas') + '; tija y sillín; (7) las pinzas en sus pestañas con 2 pasadores cada una (el disco entra en su ranura); (8) pedales con su pasador y su tapa; y a la peana. '
        + 'HOLGURAS (las de tus Bambu): lo que gira 0,2 por lado (eje de atrás en las punteras, buje de delante, dirección, pedalier, pedales); lo que encaja 0,1 (tija, eje de delante en las barras); a presión 0,05 (pasadores, tapas, buje de atrás, piñón, plato, bielas, corona, potencia). '
        + 'Rueda Ø' + Math.round(Q.D) + ' mm, tubos de Ø' + n2(2 * Q.rT) + ' a Ø' + n2(2 * Q.rD) + ', cadena de paso 4 mm y ' + Q.nE + ' eslabones. Probado con el ordenador (test/unit/bici_pro.mjs): ninguna pieza se pisa montada, las ruedas giran sin rozar, el manillar gira 35° a cada lado sin tocar el cuadro, la cadena engrana en sus asientos y no roza vainas ni bielas. Lo que no se puede probar sin imprimir: tu TPU (imprime la cadena despacio, a 20–30 mm/s).'; } }
};
