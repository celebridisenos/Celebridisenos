// ================= 19-10-2026 · 🏍️ MOTO PRO POR PIEZAS: con su MOTOR de verdad y su PIÑÓN (la cadena mueve la rueda de atrás) =================
// Ella (18-10): «… también en moto y posibilidad de engranar un motor y ponerle un piñón».
// (El `motoKit` plano de la v30.5 sigue. Esta es otra: por piezas, como la bici PRO, y reutiliza sus ruedas, cadena, frenos y peana.)
//
// CÓMO ES (x hacia delante, y hacia arriba, z al lado: +z = el lado de la cadena; medidas de motos de verdad escaladas con la rueda):
//  · CUADRO de espina central (como las Honda Monkey/CB) en dos MITADES de tubo redondo: pipa de dirección, espina, subchasis, montante del
//    amortiguador, eje del basculante y dos orejas que sujetan el MOTOR.
//  · MOTOR: el bloque (cárter, cilindro con aletas alrededor, culata, tapas del embrague y del generador) es una caja que guarda un MOTORREDUCTOR N20 (12 × 10 mm, eje de 3 en D):
//    entra por la derecha y su eje sale justo donde va el PIÑÓN de la cadena. Los cables suben por dentro hasta el DEPÓSITO, que es la caja
//    de las PILAS (con su tapa y la ventana de un interruptor pequeño). Enciendes y la moto anda.
//  · TRANSMISIÓN: piñón en el eje del motor → CADENA de TPU (la misma de la bici: paso 4) → CORONA en el eje de atrás (que gira con la rueda).
//  · BASCULANTE de dos brazos planos con su TRAVESAÑO y un AMORTIGUADOR de TPU (monoamortiguador detrás del motor: la suspensión cede).
//  · HORQUILLA telescópica (botella y barra) con dos TIJAS (abajo y arriba de la pipa), la de arriba con el puente del MANILLAR.
//  · RUEDAS: llanta de aleación de 5 radios dobles (calle) o de radios (campo), neumático de TPU liso o de tacos, frenos de DISCO con pinza.
//  · ESCAPE (por la izquierda), ESTRIBERAS, ASIENTO con hueco de LED de 5 mm para la luz de atrás, y la PEANA de la bici.
// Holguras de sus Bambu (por lado): 0,05 a presión · 0,10 encaja · 0,2 gira.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';
import * as B from './cat_bici.js';
import { EJES_MOTOR, agujeroMotor } from './cat_engranajes.js';

const { n, s, tx, M, CS, circ, rr, poli, cil, caja, n2, conBisel } = A;
const { PRES, JUSTO, GIRA, CADENA } = B, U = B.UTIL;
const { sum, dif, lon, uni, en, entre, R2, Rprim, tramos, rodillos, tubo3, cilZ, cilPl, mitad, perfilD, varilla, capsula, M4, varZ, girosZ } = U;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), perp = w => [-w[1], w[0]], ang = w => Math.atan2(w[1], w[0]) / R2;
const enY = (a, b, y) => entre(a, b, (y - a[1]) / (b[1] - a[1]));

// ---------- ESTILOS (en mm de verdad, desde el eje de atrás; luego se escalan con la rueda) ----------
// D = Ø de la rueda con su neumático · nTr/nDe = ancho de los neumáticos · asp = alto/ancho del neumático · ba = distancia entre ejes · lanz =
// lanzamiento (ángulo de la dirección) · horq = eje → tija de abajo · av = avance de las tijas · tubo = pipa · pv = eje del basculante · mp = piñón
// del motor · sp1 = donde la espina se dobla hacia el basculante · cola = final del subchasis · pata0 = pie del montante · amort = altura de
// la cabeza del amortiguador · dep = alto del depósito · plato/corona = dientes de verdad (cadena 520, paso 15,875) · man = ancho del manillar
export const ESTILOS_MOTO = {
  calle: { t: 'Calle (naked): llantas de aleación, ruedas lisas, manillar ancho', D: 630, nTr: 180, nDe: 120, asp: 0.6, ba: 1400, lanz: 25, horq: 640, av: 30, tubo: 150, pv: [555, 60], mp: [705, 90], sp1: [640, 520], cola: [150, 580], pata0: [555, 200], amort: 400, dep: 160, tacos: false, llanta: 'aleacion', plato: 15, corona: 45, man: 720 },
  campo: { t: 'Campo (motocross): ruedas de radios con tacos, horquilla larga', D: 700, nTr: 120, nDe: 90, asp: 0.9, ba: 1480, lanz: 27, horq: 820, av: 22, tubo: 160, pv: [585, 110], mp: [735, 150], sp1: [660, 640], cola: [120, 720], pata0: [585, 260], amort: 480, dep: 130, tacos: true, llanta: 'radios', plato: 13, corona: 50, man: 800 }
};
// el MOTOR visto de lado (mm de verdad, desde el piñón): el CÁRTER (ancho) y el CILINDRO (más estrecho, inclinado hacia delante, con aletas
// alrededor) de CIL0 a CIL1, con la CULATA arriba
const CARTER = [[-55, -240], [215, -240], [295, -130], [305, 60], [225, 200], [135, 220], [55, 175], [-55, 145]], CIL = [[200, 175], [240, 470]];
// el ESCAPE (mm de verdad, desde el piñón): de la culata baja por delante, pasa por debajo del cárter y sube al silenciador
const ESCAPE = [[300, 420], [290, 250], [275, 120], [255, -150], [150, -270], [-40, -265], [-120, -120], [-200, 20]], SILEN = [[-200, 20], [-430, 130]];
// el MOTOR (medidas HABITUALES de un N20 con reductora, ESTIMADAS: mídelo) y las PILAS que caben en el depósito
export const N20 = { D: 12, plano: 10, largo: 24.5, bornes: 1.5, eje: EJES_MOTOR.n20 };
export const PILAS = { aa2: { t: '2 pilas AA en su portapilas (3 V)', L: 58, W: 32, H: 16, v: 3 }, aaa2: { t: '2 pilas AAA en su portapilas (3 V)', L: 53, W: 26, H: 13, v: 3 }, lipo: { t: 'LiPo 1S de 3,7 V (tipo 802540: 40 × 25 × 8)', L: 42, W: 26, H: 9, v: 3.7 }, lipo2: { t: 'LiPo 1S de 3,7 V pequeña (tipo 502030: 30 × 20 × 5)', L: 32, W: 21, H: 6, v: 3.7 } };
// «la que quepa»: la más grande que entra en el depósito de esta moto
export function pilaDe(Q, k) { if (k && k !== 'auto' && PILAS[k]) return k; const T = tramoEspina(Q), Wt = Math.max(2 * Q.zR + 8, Q.sc(330)); return Object.keys(PILAS).find(c => PILAS[c].L + 7.2 <= T.L && PILAS[c].W + 7.2 <= Wt) || 'lipo2'; }
export const INTERRUPTOR = { w: 8.6, h: 3.8 }; // la ventana de un interruptor deslizante pequeño (tipo SS12D00)

// ---------- las MEDIDAS de esta moto ----------
export function medidasMoto(p) {
  const E = ESTILOS_MOTO[p.estilo] || ESTILOS_MOTO.calle, D = clamp(+p.rueda || 110, 80, 150), f = D / E.D, R = D / 2, sc = x => x * f, C = CADENA, anchoC = B.anchoCadena();
  const ruedaQ = (ancho, alto) => { const aN = Math.max(5, sc(ancho) * 0.95); return { R, D, aN, Rll: R - Math.max(3, sc(alto)) * 0.82, wR: Math.max(4.4, aN * 0.62), E: { tacos: E.tacos }, eje: 4, sc }; };
  const QR = ruedaQ(E.nTr, E.nTr * E.asp), QF = ruedaQ(E.nDe, E.nDe * E.asp);
  // tubos y gruesos (con un mínimo que se imprima fuerte)
  const rS = Math.max(4, sc(32)), rSub = Math.max(2.8, sc(14)), rP = rSub, rD = Math.max(5, sc(30)), rPv = Math.max(5.5, sc(28)), tSw = Math.max(3, sc(18)), steer = 4.6;
  // a lo ancho: el basculante por fuera del neumático; el bloque del motor tan ancho como el basculante (dentro cabe el N20 entero); la cadena por fuera
  const zSw = Math.max(QR.aN / 2 + 1.2, QR.wR / 2 + 3.1, rS + 1, (N20.largo + 0.5 + N20.bornes + 1.2) / 2 - tSw), zR = zSw + tSw, zCad = zR + 0.5 + anchoC / 2;
  const Pg = { t: Math.max(3.6, sc(22)), wB: Math.max(5, sc(60)), wU: Math.max(4.2, sc(42)) }, zDel = Math.max(QF.aN / 2 + 1.2, QF.wR / 2 + 3.1, rD + 0.8);
  QR.zPun = zSw; QF.zDel = zDel;
  // dientes a escala (cadena de moto 520: paso 15,875)
  const aEsc = (Nr, lo, hi) => { const x = C.p / (2 * (15.875 / (2 * Math.sin(Math.PI / Nr))) * f); return clamp(x >= 1 ? lo : Math.round(Math.PI / Math.asin(x)), lo, hi); };
  const N1 = +p.pinon > 0 ? clamp(Math.round(+p.pinon), 9, 16) : aEsc(E.plato, 9, 16), N2 = +p.corona > 0 ? clamp(Math.round(+p.corona), 18, 44) : aEsc(E.corona, 18, 44);
  // la cadena: se corre la parte de delante (hasta 2 eslabones) para que los dos tramos cuadren con el TPU estirado
  const A0 = [0, R], q = C.p * (1 + C.estira), mp0 = [E.mp[0] * f, E.mp[1] * f + R]; let mejor = null;
  for (let d = 0; d <= 2 * C.p + 1e-9; d += 0.05) { const T = tramos(A0, [mp0[0] + d, mp0[1]], Rprim(N1), Rprim(N2), N1, N2, q); if (!mejor || T.c < mejor.T.c - 1e-6) mejor = { d, T }; if (T.c < 0.008) break; }
  const T = mejor.T, X = r => [r[0] * f + mejor.d, r[1] * f + R], rel = r => X([E.mp[0] + r[0], E.mp[1] + r[1]]);
  const PV = X(E.pv), MP = X(E.mp), SP1 = X(E.sp1), SP2 = X([E.pv[0] + 30, E.pv[1] + 85]), COLA = X(E.cola), PATA0 = X(E.pata0), PATA1 = entre(SP1, COLA, 0.45), F = X([E.ba, 0]);
  // la dirección
  const u = [-Math.sin(E.lanz * R2), Math.cos(E.lanz * R2)], v = [Math.cos(E.lanz * R2), Math.sin(E.lanz * R2)], c1 = Math.max(5, sc(40)), c2 = Math.max(5, sc(35));
  const Cr = sum(sum(F, u, sc(E.horq)), v, -sc(E.av)), HB = sum(Cr, u, c1 + 0.3), HT = sum(HB, u, Math.max(14, sc(E.tubo))), TOP = sum(HT, u, 0.3 + c2);
  // el basculante, su travesaño y el amortiguador
  const XS = entre(A0, PV, 0.78), nsw = perp(uni(dif(PV, A0))), hL = Math.max(6, sc(40)), SB = sum(XS, nsw, hL), ST = enY(PATA0, PATA1, E.amort * f + R);
  const rod = rodillos(A0, MP, Rprim(N1), Rprim(N2), T);
  return { E, f, sc, D, R, QR, QF, rS, rSub, rP, rD, rPv, tSw, steer, zSw, zR, zCad, zDel, Pg, anchoC, N1, N2, Rp1: Rprim(N1), Rp2: Rprim(N2), A0, PV, MP, SP1, SP2, COLA, PATA0, PATA1, F, u, v, c1, c2, Cr, HB, HT, TOP,
    XS, nsw, hL, SB, ST, CARTER: CARTER.map(rel), CIL0: rel(CIL[0]), CIL1: rel(CIL[1]), dCil: sc(160), zCil: zR * 0.62, hCul: sc(70), GEN: rel([40, -90]), ESC: ESCAPE.map(rel), SIL: SILEN.map(rel), CULATA: rel(CIL[1]), TRASERA: rel([-55, 130]), ESTRIB: rel([-20, -150]), EMBR: rel([200, -50]), arriba: rel([0, 155]),
    nE: rod.length, rodillos: rod, fasePinon: T.t1 / R2, faseCorona: T.t2 / R2, tensa: [T.L1 / T.m1 / C.p - 1, T.L2 / T.m2 / C.p - 1], corre: mejor.d, rEsc: Math.max(2, sc(22)), rSil: Math.max(4, sc(55)),
    lw: Math.max(6, sc(36)), lugT: 5, discoTr: Math.max(25, sc(220)), discoDe: Math.max(25, sc(300)) };
}

// ---------- 1) el CUADRO (dos mitades iguales) ----------
const META = 5; // lo que entran las orejas en el bloque del motor
export const orejas = Q => { const spDe = (a, b, x) => entre(a, b, (x - a[0]) / (b[0] - a[0])), HTs = sum(Q.HT, Q.u, -(Q.rS + 1.8)), cu = Q.CULATA, re = Q.TRASERA;
  return { del: [spDe(HTs, Q.SP1, cu[0]), sum(cu, [0, -1], META)], tras: [enY(Q.SP1, Q.SP2, re[1]), sum(re, [1, 0], META)] }; };
export function cuadroMoto(Q) {
  const { HB, HT, SP1, SP2, PV, COLA, PATA0, PATA1, rS, rSub, rP, rD, rPv, zSw, u } = Q, HTs = sum(HT, u, -(rS + 1.8)), O = orejas(Q); // (la espina entra en la pipa 1,3 más abajo: el rebaje del depósito deja 1,2 sobre su canal)
  let m = mitad(N.union([cilPl(HB, HT, rD), tubo3(HTs, SP1, rS), tubo3(SP1, SP2, rS), tubo3(SP2, PV, rS), tubo3(SP1, COLA, rSub), tubo3(SP2, PATA0, rP), tubo3(PATA0, PATA1, rP)]));
  m = m.add(cilZ(PV, 2 * rPv, 0, zSw)); // el eje del basculante (hasta los brazos)
  [O.del, O.tras].forEach(([a, b]) => { m = m.add(CS().hull([circ(Q.lw).translate(a), circ(Q.lw).translate(b)]).extrude(Q.lugT / 2)); }); // las orejas del motor (5 de grueso entre las dos mitades)
  m = m.subtract(U.gotaPl(sum(HB, u, -1.5), sum(HT, u, 1.5), Q.steer / 2 + GIRA)).subtract(cilZ(PV, B.EJE_BB + 2 * GIRA, -1, zSw + 1)).subtract(cilZ(Q.ST, B.PIN + 2 * PRES, -1, rP + 1));
  [O.del[1], O.tras[1]].forEach(q => { m = m.subtract(cilZ(q, B.PASADOR + 2 * JUSTO, -1, Q.lugT)); });
  [entre(HTs, SP1, 0.5), entre(SP1, COLA, 0.75), entre(PATA0, PATA1, 0.25)].forEach(q => { m = m.subtract(cilZ(q, B.PIN + 2 * PRES, -0.01, B.HONDO_PAS)); }); // pasadores que juntan las mitades
  return m; }
export const pasadoresCuadroMoto = Q => { const HTs = sum(Q.HT, Q.u, -(Q.rS + 1.8)); return [entre(HTs, Q.SP1, 0.5), entre(Q.SP1, Q.COLA, 0.75), entre(Q.PATA0, Q.PATA1, 0.25)]; };

// ---------- 2) el BLOQUE DEL MOTOR con el N20 dentro (en el montaje, centrado; se imprime DE PIE sobre el fondo del cárter) ----------
const huecoN20 = (mas = JUSTO) => circ(N20.D + 2 * mas).intersect(rr(N20.D + 4, N20.plano + 2 * mas));
// un prisma de esquinas redondas a lo largo del eje a (en la vista de lado): de s0 a s1, «fondo» d (en la vista de lado) y ancho w (de lado)
function prismaEje(c0, a, s0, s1, d, w, r) { const p = perp(a), L = s1 - s0, o = sum(c0, a, s0); return N.transforma(conBisel(rr(d, w, r), L, Math.min(0.6, L * 0.3)), M4([p[0], p[1], 0], [0, 0, 1], [a[0], a[1], 0], [o[0], o[1], 0])); }
export const anchoCulata = Q => Q.zCil * 1.12;
export function bloqueMotor(Q) {
  const { zR, MP, CIL0, CIL1 } = Q, O = orejas(Q), Dv = zR - (N20.largo + 0.5), a = uni(dif(CIL1, CIL0)), Lc = lon(dif(CIL1, CIL0)), dc = Q.dCil, zc = Q.zCil, hh = Q.hCul, zH = anchoCulata(Q); // (Dv: el fondo del hueco del motor; su reductora queda 0,5 hundida)
  let m = conBisel(poli(Q.CARTER).offset(-2, 'Round').offset(2, 'Round'), 2 * zR, 2).translate([0, 0, -zR]); // el cárter
  m = m.add(prismaEje(CIL0, a, -4, Lc - hh + 0.5, dc, 2 * zc, 3)); // el cilindro
  const al = []; for (let t = Lc * 0.12; t < Lc - hh - 1.4; t += 2.6) al.push(prismaEje(CIL0, a, t, t + 1.2, dc + 2.8, 2 * zc + 2.8, 4)); m = m.add(N.union(al)); // sus ALETAS, alrededor
  m = m.add(prismaEje(CIL0, a, Lc - hh, Lc, dc * 1.08, 2 * zH, 3)).add(prismaEje(CIL0, a, Lc - 0.3, Lc + 1.8, 3.2, 3.2, 1)); // la CULATA y la bujía
  const rE = Q.rEsc, e0 = Q.ESC[0]; m = m.add(M().hull([cil(2 * rE, zR + 0.3 - zc + 0.5, -zR - 0.3), cil(0.1, zR + 0.3 - zc + 0.5, -zR - 0.3).translate([0, rE * Math.SQRT2, 0])]).translate([e0[0], e0[1], 0])); // la salida del escape (en gota)
  m = m.add(conBisel(circ(Math.max(12, Q.sc(150))).translate(Q.EMBR), 1.2, 0.4).translate([0, 0, zR - 0.01])).add(conBisel(circ(Math.max(10, Q.sc(120))).translate(Q.GEN), 1.2, 0.4).translate([0, 0, -zR - 1.19])); // tapas del embrague (dcha.) y del generador (izda.)
  // el hueco del N20 (entra por la derecha) y el de sus bornes; el canal de los cables sube por dentro hasta arriba
  m = m.subtract(huecoN20().translate(MP).extrude(N20.largo + 0.5 + 1).translate([0, 0, Dv])).subtract(circ(8).translate(MP).extrude(N20.bornes + 0.01).translate([0, 0, Dv - N20.bornes]));
  m = m.subtract(caja(3, Q.arriba[1] - MP[1] + 3, 3).translate([MP[0], (Q.arriba[1] + MP[1]) / 2 + 1.5, Dv - N20.bornes]));
  // las ranuras de las orejas del cuadro (en el centro) y sus pasadores (de lado a lado)
  [[O.del[1], [0, 1], zH], [O.tras[1], [-1, 0], zR]].forEach(([q, h, zz]) => { m = m.subtract(CS().hull([circ(Q.lw + 2 * JUSTO).translate(q), circ(Q.lw + 2 * JUSTO).translate(sum(q, h, META + 3))]).extrude(Q.lugT + 2 * JUSTO).translate([0, 0, -Q.lugT / 2 - JUSTO])).subtract(cilZ(q, B.PASADOR + 2 * PRES, -zz - 2, zz + 2)); });
  m = m.subtract(perfilD(4, PRES).translate(Q.ESTRIB).extrude(2 * zR + 4).translate([0, 0, -zR - 2])); // la estribera
  sitiosEscape(Q).forEach(q => { m = m.subtract(cilZ(q, B.PIN + 2 * PRES, -zR - 1.3, -zR + 3)); }); // donde se clava el escape (cara izquierda)
  return m; }
export const bloqueImpresion = Q => bloqueMotor(Q).rotate([90, 0, 0]); // de pie: el fondo del cárter en la cama
export const sitiosEscape = Q => [entre(Q.ESC[2], Q.ESC[3], 0.3), entre(Q.ESC[2], Q.ESC[3], 0.75)]; // (bien dentro del cárter: lejos de su bisel)
// el N20 de mentira (para verlo montado y comprobar que cabe): reductora + motor + eje
export function n20Muestra(Q, fase = 0) { const c = huecoN20(0).translate(Q.MP), W = 2 * Q.zR; return c.extrude(N20.largo).translate([0, 0, W - N20.largo - 0.5]).add(cil(4, 1, 0).translate([Q.MP[0], Q.MP[1], W - 0.5])).add(agujeroMotor(N20.eje, 0).rotate(fase).translate(Q.MP).extrude(9.5).translate([0, 0, W - 0.5])).translate([0, 0, -Q.zR]); } // (la cara plana de su eje, girada como el piñón)

// ---------- 3) el PIÑÓN del motor y la CORONA de la rueda ----------
export const sepPinonMoto = Q => Q.zCad - CADENA.diente / 2 - (Q.zR + 0.7); // (deja sitio al resalte de la cara de la reductora)
export function pinonMotor(Q) { const h = agujeroMotor(N20.eje, PRES); return B.dentado(Q.N1).cs.subtract(h).extrude(CADENA.diente).add(circ(Math.min(8, 2 * (Q.Rp1 - 1.5))).subtract(h).extrude(sepPinonMoto(Q)).translate([0, 0, CADENA.diente])); }
export const sepCorona = Q => Q.zCad - CADENA.diente / 2 - (Q.zR + 0.15);
export function corona(Q) { const { cs, Rp } = B.dentado(Q.N2), h = perfilD(4, PRES), rB = Math.min(6.5, Rp - 4), rI = Rp - 3;
  let c2 = cs; if (rI - rB > 4) { const ag = []; for (let i = 0; i < 5; i++) ag.push(CS().hull([circ(2.2).translate(en([0, 0], rB + 1.8, (i * 72 + 36) * R2)), circ((rI - rB) * 0.9).translate(en([0, 0], (rB + rI) / 2 + 0.4, (i * 72 + 36) * R2))])); c2 = c2.subtract(N.csUnion(ag)); } // aligerada
  return c2.subtract(h).extrude(CADENA.diente).add(circ(2 * rB).subtract(h).extrude(sepCorona(Q)).translate([0, 0, CADENA.diente])); }

// ---------- 4) BASCULANTE: dos brazos, el travesaño (con la oreja del amortiguador) y el AMORTIGUADOR de TPU ----------
export function brazoBasculante(Q, izq) {
  const { A0, PV, XS, tSw, rPv, nsw } = Q, r = tSw / 1.1, dsw = uni(dif(PV, A0));
  let m = mitad(tubo3(PV, A0, r * 1.1, r * 0.9));
  m = m.add(conBisel(circ(2 * rPv * 0.9).translate(PV), tSw, 0.4)).add(conBisel(circ(9.2).translate(A0), tSw, 0.4)).add(conBisel(circ(9).translate(XS), tSw, 0.4));
  let pz = null;
  if (izq) { const P = B.sitioPinzaD(Q.discoTr, A0, [-1, 0], [0, 1]), tg = perp(P.dir), h1 = sum(P.c, tg, B.PINZA.px), h2 = sum(P.c, tg, -B.PINZA.px);
    m = m.add(conBisel(CS().hull([circ(5.6).translate(h1), circ(5.6).translate(h2), circ(5).translate(sum(A0, dsw, 6))]), tSw, 0.4)); pz = { c: P.c, dir: P.dir, h1, h2 };
    m = m.subtract(cilZ(h1, B.PIN + 2 * PRES, -1, tSw + 1)).subtract(cilZ(h2, B.PIN + 2 * PRES, -1, tSw + 1)); }
  m = m.subtract(cilZ(A0, Q.QR.eje + 2 * GIRA, -1, tSw + 1)).subtract(cilZ(PV, B.EJE_BB + 2 * PRES, -1, tSw + 1)).subtract(perfilD(4, PRES).rotate(ang(nsw) - 90).translate(XS).extrude(tSw + 2).translate([0, 0, -1]));
  return { m, pz }; }
// el TRAVESAÑO (en el montaje: a lo largo de z, con la oreja hacia nsw) · se imprime tumbado sobre su cara plana, con la oreja de pie
export function travesanoLocal(Q) { const L = 2 * Q.zR, r = Q.rP;
  let m = perfilD(4).extrude(L).translate([0, 0, -L / 2]).add(CS().hull([circ(6.4), circ(6.4).translate([0, Q.hL])]).extrude(2 * r).translate([0, 0, -r]));
  const rh = B.PIN / 2 + PRES; m = m.subtract(M().hull([cil(2 * rh, 2 * r + 2, -r - 1), cil(0.1, 2 * r + 2, -r - 1).translate([0, rh * Math.SQRT2, 0])]).translate([0, Q.hL, 0]));
  return m.intersect(M().cube([40, 40, L + 20]).translate([-20, -0.82 * 2, -L / 2 - 10])); } // (20-10 noche: la orejeta, cortada a ras de la cara plana del eje en D: antes la pieza apoyaba solo en el canto redondo de la orejeta —9 mm²— y el eje quedaba en el aire; ahora apoya entera, eje y orejeta)
export const travesano = Q => N.transforma(travesanoLocal(Q), M4([-1, 0, 0], [0, 0, 1], [0, 1, 0], [0, 0, 0]));
// el AMORTIGUADOR (TPU, plano): dos ojos y el cuerpo con sus anillos (cede un poco: la suspensión de verdad)
export const AMORT = Q => ({ L: lon(dif(Q.ST, Q.SB)), De: 6.4, t: 3 });
export function amortiguador(Q) { const { L, De, t } = AMORT(Q); let cs = N.csUnion([circ(De), circ(De).translate([L, 0]), capsula([0, 0], [L, 0], De * 0.78)]);
  const hb = De * 0.39; for (let x = De / 2 + 1; x < L - De / 2 - 2.5; x += 3) cs = cs.subtract(rr(0.6, hb + 1.6).translate([x, (hb + 0.4) / 2])).subtract(rr(0.6, hb + 1.6).translate([x + 1.5, -(hb + 0.4) / 2])); // el muelle: cortes alternos (zigzag de 0,9 de grueso: cede)
  return conBisel(cs, t, 0.5).subtract(cil(B.PIN + 2 * GIRA, t + 2, -1)).subtract(cil(B.PIN + 2 * GIRA, t + 2, -1).translate([L, 0, 0])); }
export const largoPasAmort = Q => 2 * Q.rP + 0.2 + AMORT(Q).t + 0.05 + 1.4;

// ---------- 5) HORQUILLA: barras (botella + barra), dos TIJAS y la dirección; MANILLAR ----------
export function piernaMoto(Q, izq) {
  const { F, u, v, Pg, Cr, TOP } = Q, av = Q.sc(Q.E.av), base = sum(Cr, v, av), topL = sum(TOP, v, av), Fb = sum(F, u, lon(dif(base, F)) * 0.55);
  let cs = N.csUnion([capsula(F, Fb, Pg.wB, Pg.wB * 0.92), rr(Pg.wU, lon(dif(topL, Fb)) + 2).rotate(ang(u) - 90).translate(entre(sum(Fb, u, -2), topL, 0.5)), circ(9.6).translate(F)]);
  let pz = null;
  if (izq) { const P = B.sitioPinzaD(Q.discoDe, F, [-v[0], -v[1]], u), tg = perp(P.dir), h1 = sum(P.c, tg, B.PINZA.px), h2 = sum(P.c, tg, -B.PINZA.px);
    cs = cs.add(CS().hull([circ(5.8).translate(h1), circ(5.8).translate(h2), circ(5).translate(sum(F, u, 6))])); pz = { c: P.c, dir: P.dir, h1, h2 }; }
  let m = conBisel(cs, Pg.t, Math.min(0.8, Pg.t * 0.22)).subtract(cil(Q.QF.eje + 2 * JUSTO, Pg.t + 2, -1).translate([F[0], F[1], 0]));
  if (pz) [pz.h1, pz.h2].forEach(h => { m = m.subtract(cil(B.PIN + 2 * PRES, Pg.t + 2, -1).translate([h[0], h[1], 0])); });
  return { m, pz }; }
// una TIJA (de pie: x = v, y = de lado, z = a lo largo de la dirección); la de arriba lleva el puente del manillar
// el puente del manillar, sobre el eje y tan alto que, al girar, el manillar y sus manetas pasan por encima del depósito
export const MANILLAR = Q => ({ W: Math.max(60, Q.sc(Q.E.man)), hr: Math.max(6, Q.sc(80), DEPO(Q).H - (Q.rS + 0.8 + Q.c2) + 9), xb: 0 });
// lo que barre la tija de arriba al girar (radio desde el eje): el depósito lleva ese rebaje delante
export const barreTija = Q => Math.hypot(Q.sc(Q.E.av) + (Q.Pg.wU + 4.4) / 2, Q.zDel + Q.Pg.t / 2 + (Q.Pg.t + 4.4) / 2) + 0.8; // (el puente, sobre el eje: al girar no toca el depósito; alto: el manillar pasa por encima)
export function tijaMoto(Q, arriba) { const { Pg } = Q, av = Q.sc(Q.E.av), zL = Q.zDel + Pg.t / 2, h = arriba ? Q.c2 : Q.c1, Mn = MANILLAR(Q);
  let m = conBisel(CS().hull([circ(Q.steer + 5.4), rr(Pg.wU + 4.4, Pg.t + 4.4, 1.6).translate([av, zL]), rr(Pg.wU + 4.4, Pg.t + 4.4, 1.6).translate([av, -zL])]), h, 0.8);
  if (arriba) { const rb = 2 + 2.2; m = m.add(M().hull([caja(9, 8, 0.1).translate([Mn.xb, 0, h - 0.1]), M().cylinder(8, rb, rb, 32).rotate([90, 0, 0]).translate([Mn.xb, 4, h + Mn.hr])]));
    m = m.subtract(M().hull([M().cylinder(10, 2 + PRES, 2 + PRES, 32), M().cylinder(10, 0.05, 0.05, 8).translate([0, (2 + PRES) * Math.SQRT2, 0])]).rotate([90, 0, 0]).translate([Mn.xb, 5, h + Mn.hr])); }
  return m.subtract(perfilD(Q.steer, PRES).extrude(h + 2).translate([0, 0, -1])).subtract(N.csUnion([rr(Pg.wU + 2 * PRES, Pg.t + 2 * PRES).translate([av, zL]), rr(Pg.wU + 2 * PRES, Pg.t + 2 * PRES).translate([av, -zL])]).extrude(h + 2).translate([0, 0, -1])); }
export const largoDirMoto = Q => Q.c1 + 0.3 + lon(dif(Q.HT, Q.HB)) + 0.3 + Q.c2 - 0.4;

// ---------- 6) RUEDAS: llanta de aleación (5 radios dobles) o de radios; el resto, como la bici ----------
export function llantaAleacion(Q) { const { Rll, wR } = Q, { alto, ala, fl } = B.LLANTA, rH = B.HEX / 2 + 2.4, ri = Rll - alto, w = Math.max(3, Rll * 0.09), ts = Math.max(2, wR * 0.35), rm = rH + 0.45 * (ri - rH), L = [];
  const anillo = circ(2 * Rll).subtract(circ(2 * ri)), alaR = circ(2 * (Rll + ala)).subtract(circ(2 * (Rll - 0.01)));
  for (let i = 0; i < 5; i++) { const a = i * 72; L.push(capsula(en([0, 0], rH, a * R2), en([0, 0], rm, a * R2), w * 1.2, w), capsula(en([0, 0], rm, a * R2), en([0, 0], ri + 0.4, (a + 9) * R2), w * 0.8, w * 0.7), capsula(en([0, 0], rm, a * R2), en([0, 0], ri + 0.4, (a - 9) * R2), w * 0.8, w * 0.7)); }
  return anillo.extrude(wR).add(alaR.extrude(fl)).add(alaR.extrude(fl).translate([0, 0, wR - fl])).add(N.csUnion(L).extrude(ts)).add(circ(2 * rH + 1).extrude(wR)).subtract(B.hexCS(B.HEX, PRES).extrude(wR + 2).translate([0, 0, -1])); }
const llantaDe = Q => Q.E.llanta === 'radios' ? B.llanta : llantaAleacion;

// ---------- 7) DEPÓSITO (la caja de las PILAS), su tapa, el ASIENTO (con la luz de atrás) y el ESCAPE ----------
const tramoEspina = Q => { const HTs = sum(Q.HT, Q.u, -(Q.rS + 1.8)), d = uni(dif(HTs, Q.SP1)), a = sum(Q.SP1, d, 3), b = sum(HTs, d, -(Q.rD + 1.5)); return { a, b, d, L: lon(dif(b, a)) }; };
export const DEPO = Q => { const Pi = PILAS[Q.pila] || PILAS.aaa2, T = tramoEspina(Q); return { Pi, T, L: T.L, W: Math.max(2 * Q.zR + 8, Q.sc(330), Pi.W + 7.2), H: Pi.H + Q.rS + 7.2 }; }; // (alto: espina + pilas + tapa; más alto chocaría con el manillar al girar)
export function deposito(Q) { const { Pi, L, W, H } = DEPO(Q), xc = L / 2;
  if (L < Pi.L + 7.2) N.mal('Las pilas (' + Pi.t + ') no caben en el depósito de esta moto (' + Math.round(L) + ' mm de largo): pon la rueda más grande o elige otras pilas.');
  const forma = CS().hull([circ(W).translate([Math.max(W / 2, L - W / 2), 0]), circ(W * 0.62).translate([Math.min(L - W * 0.31, W * 0.31), 0]), rr(Pi.L + 7.2, Pi.W + 7.2, 3).translate([xc, 0])]).intersect(rr(L, W * 2).translate([L / 2, 0])); // (siempre con 1,6 de pared alrededor de la tapa)
  let m = conBisel(forma, H, Math.min(3, H * 0.2)).subtract(M().cylinder(L + 2, Q.rS + JUSTO, Q.rS + JUSTO, 48).rotate([0, 90, 0]).translate([-1, 0, 0])); // el canal de la espina
  m = m.subtract(rr(Pi.L + 1, Pi.W + 1, 1).extrude(Pi.H + 0.6 + 0.01).translate([xc, 0, H - 2 - Pi.H - 0.6])).subtract(rr(Pi.L + 4, Pi.W + 4, 2).extrude(2.01).translate([xc, 0, H - 2])); // las pilas y el escalón de la tapa
  m = m.subtract(cil(4, H, -1).translate([xc - Pi.L / 2 + 4, 0, 0])); // los cables bajan al motor
  { const { a, d } = DEPO(Q).T, nT = perp(d), o = sum(Q.HT, Q.u, 0.3 - 0.8), inv = [d[0], 0, nT[0], 0, d[1], 0, nT[1], 0, 0, -1, 0, 0, -(d[0] * a[0] + d[1] * a[1]), 0, -(nT[0] * a[0] + nT[1] * a[1]), 1]; // (de la moto al depósito)
    m = m.subtract(N.transforma(N.transforma(cil(2 * barreTija(Q), 80, 0), M4([Q.v[0], Q.v[1], 0], [0, 0, -1], [Q.u[0], Q.u[1], 0], [o[0], o[1], 0])), inv)); } // el rebaje: por ahí pasa la tija al girar
  const yw = (W / 2 + Pi.W / 2) / 2; return m.subtract(caja(INTERRUPTOR.w, W / 2 - Pi.W / 2 + 1, INTERRUPTOR.h).translate([xc + Pi.L / 2 - INTERRUPTOR.w / 2 - 3, -yw, H - Pi.H / 2 - 0.6 - INTERRUPTOR.h / 2])); } // la ventana del interruptor (lado derecho)
export function tapaDeposito(Q) { const { Pi } = DEPO(Q); return conBisel(rr(Pi.L + 4 - 2 * PRES, Pi.W + 4 - 2 * PRES, 2), 2, 0.4).add(conBisel(circ(Math.max(7, Q.sc(60))).translate([Pi.L / 2 - 6, 0]), 1.5, 0.4).translate([0, 0, 1.99])); }
export const ASIENTO = Q => { const d = uni(dif(Q.SP1, Q.COLA)), a = Q.COLA, b = sum(Q.SP1, d, -(Q.rS + 1)); return { a, b, d, L: lon(dif(b, a)), W: Math.max(14, Q.sc(260)), H: Math.max(4, Q.sc(70)) }; }; // (empieza detrás del codo de la espina)
export function asiento(Q) { const { L, W, H } = ASIENTO(Q), r = 2.55;
  const forma = CS().hull([circ(W).translate([L - W / 2, 0]), circ(W * 0.55).translate([W * 0.3, 0])]).intersect(rr(L, W * 2).translate([L / 2, 0]));
  return conBisel(forma, H, Math.min(2.5, H * 0.35)).subtract(M().cylinder(L + 2, Q.rSub + JUSTO, Q.rSub + JUSTO, 40).rotate([0, 90, 0]).translate([-1, 0, 0]))
    .subtract(M().hull([M().cylinder(9, r, r, 32), M().cylinder(9, 0.05, 0.05, 8).translate([0, r * Math.SQRT2, 0])]).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([-1, 0, Math.max(Q.rSub + r + 1, H * 0.55)])); } // la luz de atrás: un LED de 5 mm
export function escape(Q) { const P = Q.ESC, S = Q.SIL;
  let m = mitad(N.union(P.slice(1).map((q, i) => tubo3(P[i], q, Q.rEsc)).concat([tubo3(S[0], S[1], Q.rSil, Q.rSil * 0.85)])));
  m = m.subtract(cilZ(S[1], Q.rSil * 0.8, Q.rSil * 0.4, 20).translate([0, 0, 0])); // la boca del silenciador (hueca)
  sitiosEscape(Q).forEach(q => { m = m.subtract(cilZ(q, B.PIN + 2 * PRES, -0.01, 2.5)); }); return m; }
export const largoEstribera = Q => 2 * Q.zR + 2 * Math.max(6, Q.sc(60));

// ---------- 8) TODO EL KIT y la moto MONTADA ----------
// grupos: 'fijo' · 'sw' (basculante: sube y baja) · 'tr' (gira con la rueda de atrás) · 'mot' (gira con el motor) · 'cad' · 'amo' (amortiguador)
// · 'dir' (gira con el manillar) · 'de' (gira con la rueda de delante) · 'peana' · 'comp' (lo que no se imprime: el N20 y las pilas, para ver dónde van)
export function moto(p) {
  const Q = medidasMoto(p); Q.pila = pilaDe(Q, p.pila); const C = CADENA, piezas = [], mon = [], pon = (k, m, g = 'fijo') => { mon.push({ k, m, g }); return m; }, add = (t, m, v = 1) => { for (let i = 0; i < v; i++) piezas.push([t, m]); };
  const { zR, zSw, zCad, zDel, tSw, Pg } = Q;
  // cuadro
  const cm = cuadroMoto(Q); add('Cuadro (mitad: se imprimen 2)', cm, 2); pon('cuadroD', cm); pon('cuadroI', cm.mirror([0, 0, 1]));
  add('Pasador del cuadro', varilla(B.PIN, 2 * B.HONDO_PAS - 0.2), 3); pasadoresCuadroMoto(Q).forEach((q, i) => pon('pasCuadro' + i, varZ(B.PIN, 2 * B.HONDO_PAS - 0.2, q, -B.HONDO_PAS + 0.1)));
  // el motor y lo que lleva
  add('Bloque del motor (de pie: guarda el N20)', bloqueImpresion(Q)); pon('bloque', bloqueMotor(Q));
  const O = orejas(Q), zH = anchoCulata(Q); add('Pasador del motor (culata)', varilla(B.PASADOR, 2 * zH - 0.2)); add('Pasador del motor (cárter)', varilla(B.PASADOR, 2 * zR - 0.2)); pon('pasMotor0', varZ(B.PASADOR, 2 * zH - 0.2, O.del[1], -zH + 0.1)); pon('pasMotor1', varZ(B.PASADOR, 2 * zR - 0.2, O.tras[1], -zR + 0.1));
  const Le = largoEstribera(Q); add('Estriberas (una barra)', varilla(4, Le)); pon('estribera', varZ(4, Le, Q.ESTRIB, -Le / 2));
  pon('n20', n20Muestra(Q, Q.fasePinon), 'comp');
  add('Piñón del motor (' + Q.N1 + ' dientes, en el eje del N20)', pinonMotor(Q)); pon('pinonMotor', girosZ(pinonMotor(Q).mirror([0, 0, 1]).translate([0, 0, zCad + C.diente / 2]), Q.fasePinon, Q.MP), 'mot');
  add('Escape (por la izquierda)', escape(Q)); pon('escape', escape(Q).mirror([0, 0, 1]).translate([0, 0, -zR - 0.3]));
  add('Pasador del escape', varilla(B.PIN, 5.3), 2); sitiosEscape(Q).forEach((q, i) => pon('pasEscape' + i, varZ(B.PIN, 5.3, q, -zR - 2.7)));
  // depósito y asiento (a lo largo de la espina y del subchasis)
  const Dp = DEPO(Q), nT = perp(Dp.T.d), mT = M4([Dp.T.d[0], Dp.T.d[1], 0], [0, 0, -1], [nT[0], nT[1], 0], [Dp.T.a[0], Dp.T.a[1], 0]);
  add('Depósito (la caja de las pilas)', deposito(Q)); add('Tapa del depósito', tapaDeposito(Q)); pon('deposito', N.transforma(deposito(Q), mT)); pon('tapaDep', N.transforma(tapaDeposito(Q).translate([Dp.L / 2, 0, Dp.H - 2 + 0.01]), mT));
  pon('pilas', N.transforma(caja(Dp.Pi.L, Dp.Pi.W, Dp.Pi.H).translate([Dp.L / 2, 0, Dp.H - 2 - Dp.Pi.H - 0.55]), mT), 'comp');
  const As = ASIENTO(Q), nA = perp(As.d); add('Asiento (con la luz de atrás)', asiento(Q)); pon('asiento', N.transforma(asiento(Q), M4([As.d[0], As.d[1], 0], [0, 0, -1], [nA[0], nA[1], 0], [As.a[0], As.a[1], 0])));
  // basculante
  const BD = brazoBasculante(Q, false), BI = brazoBasculante(Q, true); add('Brazo derecho del basculante', BD.m); add('Brazo izquierdo del basculante (con la pestaña del freno)', BI.m);
  pon('brazoD', BD.m.translate([0, 0, zSw]), 'sw'); pon('brazoI', BI.m.mirror([0, 0, 1]).translate([0, 0, -zSw]), 'sw');
  add('Eje del basculante', varilla(B.EJE_BB, 2 * zR - 0.2)); pon('ejeBasc', varZ(B.EJE_BB, 2 * zR - 0.2, Q.PV, -zR + 0.1), 'sw');
  add('Travesaño del basculante', travesano(Q)); pon('travesano', girosZ(travesanoLocal(Q), ang(Q.nsw) - 90, Q.XS), 'sw');
  // el amortiguador (al lado de las orejas, a la derecha) con sus pasadores y tapas
  const Am = AMORT(Q), za = Q.rP + 0.2, Lpa = largoPasAmort(Q); add('Amortiguador (TPU)', amortiguador(Q));
  pon('amort', amortiguador(Q).rotate([0, 0, ang(dif(Q.ST, Q.SB))]).translate([Q.SB[0], Q.SB[1], za]), 'amo');
  add('Pasador del amortiguador', varilla(B.PIN, Lpa), 2); add('Tapa pequeña (del amortiguador)', B.tapaPequena(), 2);
  [[Q.SB, 'sw'], [Q.ST, 'fijo']].forEach(([q, g], i) => { pon('pasAmort' + i, varZ(B.PIN, Lpa, q, -Q.rP + 0.05), g); pon('tapaAmort' + i, B.tapaPequena().mirror([0, 0, 1]).translate([q[0], q[1], za + Am.t + 0.05 + 2]), g); });
  // rueda de atrás (el eje gira con ella; corona por fuera del brazo derecho)
  { const QR = Q.QR, g = Q.faseCorona, Lh = B.largoBuje(QR, true), z0 = -(zR + 0.15 + B.METE), z1 = zCad + C.diente / 2 + 0.02 + B.METE, ll = llantaDe(Q)(QR);
    add('Llanta trasera', ll); add('Neumático trasero (TPU)', B.neumatico(QR)); add('Buje trasero', B.buje(QR, true)); add('Eje trasero (gira con la rueda)', varilla(4, z1 - z0)); add('Tapa de eje (el tope)', B.tapaEje(QR), 2); add('Disco de freno trasero', B.discoDe(Q.discoTr)); add('Corona (' + Q.N2 + ' dientes)', corona(Q));
    const at = (k, m) => pon(k, girosZ(m, g, Q.A0), 'tr');
    at('llantaTr', ll.mirror([0, 0, 1]).translate([0, 0, QR.wR / 2])); at('neumTr', B.neumatico(QR).translate([0, 0, -QR.aN / 2])); at('bujeTr', B.buje(QR, true).translate([0, 0, -Lh / 2])); at('ejeTr', perfilD(4).extrude(z1 - z0).translate([0, 0, z0]));
    at('discoTr', B.discoDe(Q.discoTr).translate([0, 0, -(zSw - B.PROF) - B.discoT / 2])); at('corona', corona(Q).mirror([0, 0, 1]).translate([0, 0, zCad + C.diente / 2]));
    at('tapaTrI', B.tapaEje(QR).translate([0, 0, z0 - 0.9])); at('tapaTrD', B.tapaEje(QR).mirror([0, 0, 1]).translate([0, 0, z1 + 0.9])); }
  // la cadena
  add('Cadena (TPU: ' + Q.nE + ' eslabones)', B.cadena(Q)); pon('cadena', B.cadenaDe(Q.rodillos).translate([0, 0, zCad - Q.anchoC / 2]), 'cad');
  // horquilla, tijas, dirección, manillar
  const mD = (o) => M4([Q.v[0], Q.v[1], 0], [0, 0, -1], [Q.u[0], Q.u[1], 0], [o[0], o[1], 0]);
  const PD = piernaMoto(Q, false), PI = piernaMoto(Q, true); add('Barra de la horquilla derecha', PD.m); add('Barra de la horquilla izquierda (con la pestaña del freno)', PI.m);
  pon('piernaD', PD.m.translate([0, 0, zDel]), 'dir'); pon('piernaI', PI.m.mirror([0, 0, 1]).translate([0, 0, -zDel]), 'dir');
  add('Tija de abajo', tijaMoto(Q, false)); add('Tija de arriba (con el manillar)', tijaMoto(Q, true)); pon('tijaAb', N.transforma(tijaMoto(Q, false), mD(Q.Cr)), 'dir'); pon('tijaAr', N.transforma(tijaMoto(Q, true), mD(sum(Q.HT, Q.u, 0.3))), 'dir');
  const Ls = largoDirMoto(Q); add('Dirección (el tubo que gira)', varilla(Q.steer, Ls)); pon('direccion', N.transforma(perfilD(Q.steer).extrude(Ls), mD(Q.Cr)), 'dir');
  const Mn = MANILLAR(Q), cl = sum(sum(Q.TOP, Q.u, Mn.hr), Q.v, Mn.xb), Qb = { E: { manillar: 'recto' }, sc: Q.sc }, Lg = B.largoManguito(Qb);
  add('Manillar', varilla(4, Mn.W)); pon('manillar', varZ(4, Mn.W, cl, -Mn.W / 2), 'dir');
  add('Puño (TPU)', B.manguito(Qb), 2); add('Maneta', B.maneta(Qb), 2);
  pon('punoD', B.manguito(Qb).mirror([0, 0, 1]).translate([cl[0], cl[1], Mn.W / 2 + 1]), 'dir'); pon('punoI', B.manguito(Qb).translate([cl[0], cl[1], -Mn.W / 2 - 1]), 'dir');
  pon('manetaD', B.maneta(Qb).translate([cl[0], cl[1], Mn.W / 2 + 1 - Lg - 0.4 - 2.6]), 'dir'); pon('manetaI', B.maneta(Qb).translate([cl[0], cl[1], -(Mn.W / 2 + 1 - Lg - 0.4)]), 'dir');
  // rueda de delante (eje quieto entre las barras)
  { const QF = Q.QF, Lh = B.largoBuje(QF, false), ze = zDel + Pg.t + 0.02 + B.METE, F = Q.F, ll = llantaDe(Q)(QF);
    add('Llanta delantera', ll); add('Neumático delantero (TPU)', B.neumatico(QF)); add('Buje delantero', B.buje(QF, false)); add('Eje delantero', varilla(4, 2 * ze)); add('Tapa de eje (el tope)', B.tapaEje(QF), 2); add('Disco de freno delantero', B.discoDe(Q.discoDe));
    pon('llantaDe', ll.mirror([0, 0, 1]).translate([F[0], F[1], QF.wR / 2]), 'de'); pon('neumDe', B.neumatico(QF).translate([F[0], F[1], -QF.aN / 2]), 'de'); pon('bujeDe', B.buje(QF, false).translate([F[0], F[1], -Lh / 2]), 'de');
    pon('discoDe', B.discoDe(Q.discoDe).translate([F[0], F[1], -(zDel - B.PROF) - B.discoT / 2]), 'de'); pon('ejeDe', varZ(4, 2 * ze, F, -ze), 'dir');
    pon('tapaDeI', B.tapaEje(QF).translate([F[0], F[1], -ze - 0.9]), 'dir'); pon('tapaDeD', B.tapaEje(QF).mirror([0, 0, 1]).translate([F[0], F[1], ze + 0.9]), 'dir'); }
  // las PINZAS (iguales): atrás en el brazo izquierdo; delante, en la barra izquierda
  const Pz = B.pinzaA(), Lpz = t => t + Pz.t - 0.1;
  add('Pinza de freno (de pie sobre sus orejas)', B.pinzaImpresion(), 2); add('Pasador de la pinza trasera', varilla(B.PIN, Lpz(tSw)), 2); add('Pasador de la pinza delantera', varilla(B.PIN, Lpz(Pg.t)), 2);
  [[BI.pz, zSw, tSw, 'Tr', 'sw'], [PI.pz, zDel, Pg.t, 'De', 'dir']].forEach(([pz, zc, tt, k, gr]) => { const O2 = sum(pz.c, pz.dir, -B.PINZA.oy), tg = perp(pz.dir);
    pon('pinza' + k, N.transforma(Pz.m, M4([-tg[0], -tg[1], 0], [pz.dir[0], pz.dir[1], 0], [0, 0, 1], [O2[0], O2[1], -zc])), gr);
    [pz.h1, pz.h2].forEach((h, i) => pon('pasPinza' + k + i, varZ(B.PIN, Lpz(tt), h, -zc - tt + 0.05), gr)); });
  // la PEANA (la de la bici: dos cunas y su barra)
  const QpR = { R: Q.R, aN: Q.QR.aN, zPun: zR, F: Q.F, A0: Q.A0 }, QpF = { R: Q.R, aN: Q.QF.aN, zPun: zR, F: Q.F, A0: Q.A0 }, Qb2 = { R: Q.R, zPun: zR, F: Q.F, A0: Q.A0 }, Pe = B.PEANA(QpR), xc = (Q.A0[0] + Q.F[0]) / 2, zS = Pe.bas - Pe.hund + 0.05;
  add('Cuna de la peana (atrás)', B.cunaPeana(QpR)); add('Cuna de la peana (delante)', B.cunaPeana(QpF)); add('Barra de la peana' + (String(p.txt || '').trim() ? ' (con el nombre)' : ''), B.barraPeana(Qb2, p.txt));
  const montaje = mon.map(x => ({ k: x.k, g: x.g, m: x.m.rotate([90, 0, 0]).translate([-xc, 0, zS]) }));
  montaje.push({ k: 'cunaTr', g: 'peana', m: B.cunaPeana(QpR).translate([Q.A0[0] - xc, 0, 0]) }, { k: 'cunaDe', g: 'peana', m: B.cunaPeana(QpF).rotate([0, 0, 180]).translate([Q.F[0] - xc, 0, 0]) }, { k: 'barraPeana', g: 'peana', m: B.barraPeana(Qb2, p.txt).translate([0, 0, 0.02]) });
  return { Q, piezas, montaje, xc, zS };
}
// la PRUEBA DE ENCAJE: el hueco del N20 (corto), el piñón, un trozo de cadena, la puntera con el eje que gira, buje y tapa
export function pruebaMoto(p) { const Q = medidasMoto(p), L = [];
  L.push(conBisel(rr(N20.D + 5, N20.plano + 5, 2), 10, 0.4).subtract(huecoN20().extrude(10).translate([0, 0, 2]))); // un trozo del hueco del motor: el N20 entra justo
  L.push(pinonMotor(Q)); L.push(conBisel(circ(12), Q.tSw, 0.4).subtract(cil(4 + 2 * GIRA, Q.tSw + 2, -1))); L.push(conBisel(B.hexCS(B.HEX), 6, 0.5).subtract(perfilD(4, PRES).extrude(8).translate([0, 0, -1]))); L.push(varilla(4, 16)); L.push(B.tapaEje(Q.QR));
  const P = []; for (let i = 0; i < 9; i++) P.push([i * CADENA.p, 0]); const cs = N.csUnion(P.slice(1).map((q, i) => B.ochoCadena(P[i], q))), al = B.anchoCadena(), rod = N.csUnion(P.map(q => circ(CADENA.dr).translate(q)));
  L.push(cs.extrude(CADENA.placa).add(cs.extrude(CADENA.placa).translate([0, 0, al - CADENA.placa])).add(rod.extrude(al)));
  return L; }
function camasDe(R) { const I = R.piezas.map((x, i) => i), rig = I.filter(i => !U.esTPU(R.piezas[i][0])), blan = I.filter(i => U.esTPU(R.piezas[i][0])), dims = i => N.caja(R.piezas[i][1]).dims;
  return { pla: B.repartir(rig.map(dims)).map(c => c.map(j => rig[j])), tpu: B.repartir(blan.map(dims)).map(c => c.map(j => blan[j])) }; }
const GRUPOS = { cuadro: /^Cuadro|^Pasador del cuadro|^Brazo|^Eje del basculante|^Travesaño|^Amortiguador|^Pasador del amortiguador|^Tapa pequeña/, motor: /^Bloque|^Pasador del motor|^Piñón|^Escape|^Pasador del escape|^Estribera|^Depósito|^Tapa del depósito/, ruedas: /^Llanta|^Neumático|^Buje|^Eje (trasero|delantero)|^Tapa de eje|^Corona|^Cadena/, horquilla: /^Barra de la horquilla|^Tija|^Dirección|^Manillar|^Puño|^Maneta/, frenos: /^Pinza|^Pasador de la pinza|^Disco/, peana: /^Cuna|^Barra de la peana|^Asiento/ };
export function genMoto(p) { const que = p.que || 'cama1';
  if (que === 'prueba') return U.enCama(pruebaMoto(p));
  const R = moto(p);
  if (que === 'montado') return N.union(R.montaje.map(x => x.m));
  let L = R.piezas.map((x, i) => i);
  if (GRUPOS[que]) L = L.filter(i => GRUPOS[que].test(R.piezas[i][0]));
  else if (/^(cama|tpu)\d$/.test(que)) { const Cs = camasDe(R), lista = que[0] === 't' ? Cs.tpu : Cs.pla, k = +que.slice(-1) - 1;
    if (!lista[k]) N.mal('Esta moto va en ' + Cs.pla.length + ' camas de PLA (o PETG) y ' + Cs.tpu.length + ' de TPU: elige «Cama 1»…«Cama ' + Cs.pla.length + '» o «TPU 1»' + (Cs.tpu.length > 1 ? '…«TPU ' + Cs.tpu.length + '»' : '') + '.'); L = lista[k]; }
  if (!L.length) N.mal('No hay piezas en «' + que + '».');
  return U.enCama(L.map(i => R.piezas[i][1])); }
export function camasMoto(p) { const R = moto(p), Cs = camasDe(R), nom = c => { const k = {}; c.forEach(i => { const t = R.piezas[i][0].replace(/ \(.*\)$/, ''); k[t] = (k[t] || 0) + 1; }); return Object.entries(k).map(([t, v]) => (v > 1 ? v + ' × ' : '') + t.toLowerCase()).join(', '); };
  return { pla: Cs.pla.map(nom), tpu: Cs.tpu.map(nom), R }; }

const QUE = [['cama1', 'Cama 1 (PLA)'], ['cama2', 'Cama 2 (PLA)'], ['cama3', 'Cama 3 (PLA)'], ['cama4', 'Cama 4 (PLA)'], ['cama5', 'Cama 5 (PLA)'], ['cama6', 'Cama 6 (PLA)'], ['cama7', 'Cama 7 (PLA)'], ['cama8', 'Cama 8 (PLA)'], ['tpu1', 'TPU 1: cadena, neumáticos, amortiguador, puños'], ['tpu2', 'TPU 2 (si no cabe en una)'], ['tpu3', 'TPU 3 (ruedas grandes)'],
  ['prueba', '🧪 Prueba de encaje (el N20, el piñón, la cadena)'], ['cuadro', 'Solo cuadro y basculante'], ['motor', 'Solo motor, escape y depósito'], ['ruedas', 'Solo ruedas, corona y cadena'], ['horquilla', 'Solo horquilla, tijas y manillar'], ['frenos', 'Solo los frenos de disco'], ['peana', 'Solo asiento y peana'], ['montado', '👀 Verla montada (solo para mirar)']];
export const DISENOS_MOTO = {
  motoPro: { cat: 'juguetes', tambien: ['rc', 'pro', 'regalos', 'mecanica'], nuevo: true, busca: 'moto motocicleta motor n20 piñón corona cadena kit piezas naked motocross basculante amortiguador horquilla freno disco maqueta funciona', e: '🏍️', t: 'Moto PRO por piezas con motor (anda de verdad)', d: 'Un motor N20 dentro del bloque mueve el piñón, la cadena de TPU y la corona de la rueda; pilas en el depósito con su interruptor. Basculante con amortiguador, horquilla con dos tijas, frenos de disco. Calle o campo', uso: 'mecanica', color: '#1b1b1d',
    campos: [s('estilo', 'Estilo', 'calle', Object.entries(ESTILOS_MOTO).map(([k, X]) => [k, X.t])), n('rueda', 'Rueda (Ø con su neumático)', 110, 80, 150, 1), s('que', 'Qué imprimo', 'cama1', QUE), s('pila', 'Pilas (en el depósito)', 'auto', [['auto', 'Las que quepan (las más grandes)']].concat(Object.entries(PILAS).map(([k, X]) => [k, X.t]))),
      n('pinon', 'Dientes del piñón del motor (0 = los de su estilo)', 0, 0, 16, 1, ''), n('corona', 'Dientes de la corona (0 = los de su estilo)', 0, 0, 44, 1, ''), tx('txt', 'Nombre en la peana', '')],
    gen: p => genMoto(Object.assign({}, p, { pinon: +p.pinon || 0, corona: +p.corona || 0 })),
    nota: p => { let C = null; try { C = camasMoto(Object.assign({}, p, { pinon: +p.pinon || 0, corona: +p.corona || 0 })); } catch (e) { return '⚠️ ' + e.message; } const Q = C.R.Q, larga = Math.round(Q.F[0] - Q.A0[0] + Q.D), Pi = PILAS[Q.pila];
      if (p.que === 'montado') return '👀 Así queda montada (solo para mirar; en gris, el motor N20 y las pilas: no se imprimen): ' + larga + ' mm de larga. Para imprimir: «Cama 1»…«Cama ' + C.pla.length + '» en PLA o PETG y «TPU 1»' + (C.tpu.length > 1 ? ' y «TPU 2»' : '') + '.';
      if (p.que === 'prueba') return '🧪 PRUEBA DE ENCAJE (unos 8 g): mete tu N20 en el trozo de hueco: tiene que entrar JUSTO (sin bailar, sin forzar). Clava el PIÑÓN en su eje: a presión. Pasa el trozo de CADENA por el piñón: los rodillos entre los dientes. El EJE gira suelto en la puntera; buje y tapa entran a presión. Si algo no casa, dime cuánto y lo ajusto antes de imprimir la moto.';
      return 'PARA QUÉ: una ' + Q.E.t.split(':')[0].toLowerCase() + ' de ' + larga + ' mm que ANDA: el motor N20 (dentro del bloque) mueve el piñón de ' + Q.N1 + ' dientes, la cadena y la corona de ' + Q.N2 + ' (la rueda da 1 vuelta cada ' + n2(Q.N2 / Q.N1) + ' del motor). Con un N20 de 6 V y 300 rpm a ' + n2(Pi.v) + ' V, la rueda da unas ' + Math.round(300 * Pi.v / 6 * Q.N1 / Q.N2) + ' vueltas por minuto (anda despacio, como una de verdad en una maqueta). '
        + 'LO QUE COMPRAS (lo demás se imprime): un motorreductor N20 de 6 V (300 rpm; eje de 3 mm en D), ' + Pi.t + ', un interruptor deslizante pequeño (tipo SS12D00) y dos cables; opcional, un LED de 5 mm para la luz de atrás (con su resistencia). Las medidas del N20 y de las pilas son las HABITUALES: haz antes la «🧪 Prueba de encaje». '
        + 'VA EN ' + C.pla.length + ' CAMAS de la P1P en PLA o PETG (' + C.pla.map((t, i) => 'Cama ' + (i + 1) + ': ' + t).join(' · ') + ') y ' + C.tpu.length + ' de TPU (' + C.tpu.map((t, i) => 'TPU ' + (i + 1) + ': ' + t).join(' · ') + '). Todo sin soportes. '
        + 'CÓMO SE MONTA: (1) las dos mitades del cuadro con sus 3 pasadores; (2) el N20 en el bloque (entra por la derecha; los cables suben por su canal) y el bloque a las dos orejas del cuadro con sus 2 pasadores; el PIÑÓN a presión en el eje del motor; (3) el basculante: los dos brazos, el travesaño (su oreja hacia arriba) y el eje del basculante por el cuadro; el AMORTIGUADOR de TPU de la oreja del travesaño a la del cuadro, con sus pasadores y tapas; '
        + '(4) la rueda de atrás: neumático, llanta y disco en el buje, el EJE por el brazo izquierdo, el buje y el brazo derecho; fuera, la CORONA (separador hacia el brazo) con la cadena puesta en el piñón y las dos TAPAS: son el TOPE; (5) la horquilla: las barras por las dos tijas, la dirección por la tija de abajo, la pipa y la de arriba; el manillar en su puente, puños y manetas; la rueda de delante con su eje y sus tapas; (6) las pinzas en sus pestañas; el escape con sus 2 pasadores y la estribera; '
        + '(7) los cables: del motor al interruptor y a las pilas (en el depósito); el depósito se apoya en la espina (se quita para cambiar las pilas) y el asiento en el subchasis. Si la rueda gira al revés, da la vuelta a los cables del motor. '
        + 'HOLGURAS (las de tus Bambu): gira 0,2 (eje de atrás en el basculante, eje del basculante en el cuadro, dirección, amortiguador en sus pasadores); justo 0,1 (el N20 en su hueco, el eje de delante); a presión 0,05 (pasadores, tapas, buje de atrás, piñón, corona, tijas). '
        + 'Probado con el ordenador (test/unit/moto_pro.mjs): ninguna pieza se pisa, el N20 cabe y su eje llega al piñón, las pilas caben en el depósito, las ruedas y el motor giran sin rozar, el basculante sube y baja, el manillar gira, la cadena engrana en sus asientos. Lo que no se puede probar sin imprimir: tu N20 y tu TPU.'; } }
};
