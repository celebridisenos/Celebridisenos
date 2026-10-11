// ================= v30.5 · 🚲 KITS DE DOS RUEDAS: bicicleta y moto que se MONTAN y cuyas ruedas giran =================
// La dueña (11-10-2026): «bicicletas funcionales con sus ruedas girables, manillar, cadena hiperreal, y una moto; sección de juguetes»
// y, al proponerle el kit: «la bici haz como propones, de forma de kit». Tumbada y de una pieza no sale (la rueda quedaría en el
// aire), así que es un KIT de piezas PLANAS, todas sin soportes:
//   · dos PLACAS laterales iguales (horquilla, vainas y tirantes: lo que abraza las ruedas) y un NÚCLEO entre ellas (el cuadro),
//     que es justo tan grueso como la rueda + su holgura: las ruedas giran en el hueco;
//   · las RUEDAS giran sobre un eje con dos tapas a presión; en la bici, las BIELAS giran sobre el eje del pedalier (de dos caras
//     planas) y llevan los pedales; plato, CADENA de eslabones y piñón son una pieza fija entre la placa y la biela;
//   · manillar y sillín entran a presión en dos pestañas del núcleo; dos pasadores alinean las tres capas; y una PEANA con su
//     nombre la tiene de pie («a las figuras ponles una base si no pueden mantenerse de pie»).
// Dibujo: x hacia delante, y hacia arriba (el suelo en y = 0); cada pieza es su dibujo extruido. Holguras de la dueña: lo que
// gira, 0,15–0,25 por lado; lo que va a presión, 0,05.
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, tx, M, CS, circ, rr, poli, cil, caja, n2, R2, enRejilla, conBisel } = A;
const en = (cs2, q) => cs2.translate([q[0], q[1]]);
const disco = (q, d) => en(circ(d), q);
const tubo = (a, b, w, w2 = w) => CS().hull([disco(a, w), disco(b, w2)]);
const cadenaTubos = (P, w) => N.csUnion(P.slice(1).map((q, i) => tubo(P[i], q, w)));
const mas = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const uni = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
const HOL = { gira: 0.2, capa: 0.5 }; // lo que gira sobre un eje, por lado · aire entre la rueda y cada placa
const EJE = 5, PAS = 3; // ejes de Ø5 y pasadores de Ø3: se imprimen tumbados sobre su cara plana
// eje con UNA cara plana (se imprime tumbado sobre ella) o con DOS (el del pedalier: la biela entra a 0° o a 180°)
const perfilEje = (d, caras, mas2 = 0) => { let p = circ(d + 2 * mas2); const f = d * 0.4 + mas2; p = p.intersect(rr(d + 4, 2 * f + (caras === 2 ? 0 : d)).translate([0, caras === 2 ? 0 : d / 2])); return p; };
const ejeTumbado = (d, largo, caras) => perfilEje(d, caras).extrude(largo).rotate([90, 0, 0]).translate([0, largo / 2, d * 0.4]); // a lo largo de Y, apoyado en su cara plana

// ---------- RUEDA: neumático con los cantos redondeados, llanta, radios y buje ----------
function rueda(R, grosor, o = {}) {
  const neum = o.neum || R * 0.16, llanta = o.llanta || R * 0.085, rBuje = o.buje || 5.6, nR = o.radios || 14, taco = o.tacos || 0;
  let goma = circ(2 * R).subtract(circ(2 * (R - neum)));
  if (taco) { const T = []; for (let i = 0; i < taco; i++) T.push(rr(R * 0.09, R * 0.1, 0).translate([0, R - R * 0.01]).rotate(i * 360 / taco)); goma = goma.subtract(N.csUnion(T)); }
  let m = conBisel(goma, grosor, Math.min(grosor * 0.26, neum * 0.42));
  const aro = circ(2 * (R - neum) + 0.4).subtract(circ(2 * (R - neum - llanta)));
  m = m.add(aro.extrude(grosor * 0.78));
  const rad = []; if (o.disco) { rad.push(circ(2 * (R - neum - llanta) + 0.4).subtract(N.csUnion([0, 1, 2, 3, 4].map(i => en(circ(R * 0.34), [(R - neum - llanta) * 0.56, 0]).rotate(i * 72 + 36))))); }
  else for (let i = 0; i < nR; i++) rad.push(tubo([0, 0], [R - neum - llanta + 0.3, 0], 1.3).rotate(i * 360 / nR + (i % 2 ? 4 : -4)));
  m = m.add(N.csUnion(rad).extrude(o.disco ? grosor * 0.45 : Math.min(2.4, grosor * 0.4)));
  m = m.add(circ(2 * rBuje).extrude(grosor)).add(circ(2 * rBuje + 5).extrude(Math.min(2.4, grosor * 0.4) + 0.8));
  return m.subtract(cil(EJE + 2 * HOL.gira, grosor + 2, -1));
}
// tapa a presión para la punta de un eje (como una tuerca ciega)
const tapaEje = () => { const d = EJE + 5.2; return conBisel(circ(d), 3.4, 0.8).subtract(perfilEje(EJE, 1, ENCAJES.presion).extrude(4).translate([0, 0, 0.8])); };

// ---------- EL KIT: se describe con datos y aquí se hacen las piezas y el montaje ----------
// D = { R, gr (grosor de rueda), A (eje trasero), F (eje delantero), nucleo, placa (dibujos), pasadores [puntos], bb (punto del pedalier o null),
//       pestS, pestM (pestañas del sillín y del manillar: [x, y, largo]), opciones de rueda… }
export function kit(D, p) {
  const tp = 2.6, tc = D.gr + 2 * HOL.capa, total = 2 * tp + tc, piezas = [], montaje = [], zR = tp + HOL.capa;
  const agEje = N.csUnion([D.A, D.F].map(q => disco(q, EJE + 2 * ENCAJES.justo))), agPas = N.csUnion(D.pasadores.map(q => disco(q, PAS + 2 * ENCAJES.presion))), agBB = D.bb ? disco(D.bb, EJE + 2 * HOL.gira + 0.1) : null;
  let placa2 = D.placa.subtract(agEje).subtract(agPas), nucleo2 = D.nucleo.subtract(agPas); if (agBB) { placa2 = placa2.subtract(agBB); nucleo2 = nucleo2.subtract(agBB); }
  const placa = placa2.extrude(tp), nucleo = nucleo2.extrude(tc);
  const dePie = m => m.rotate([90, 0, 0]); // (x, y, z) → (x, −z, y): de pie, el grosor hacia −Y
  const pon = (m, z) => dePie(m.translate([0, 0, z]));
  piezas.push(['Placa lateral 1', placa], ['Placa lateral 2', placa], ['Núcleo (cuadro)', nucleo]);
  montaje.push(pon(placa, 0), pon(nucleo, tp), pon(placa, tp + tc));
  const rd = rueda(D.R, D.gr, D.ruedaT), rdel = D.ruedaD ? rueda(D.Rd || D.R, D.gr, D.ruedaD) : rd;
  piezas.push(['Rueda trasera', rd], ['Rueda delantera', rdel]); montaje.push(pon(rd.translate([D.A[0], D.A[1], 0]), zR), pon(rdel.translate([D.F[0], D.F[1], 0]), zR));
  // ejes de las ruedas (con una cara plana) y sus 4 tapas a presión; en la bici, el trasero es más largo: plato-cadena-piñón va entre la placa y la tapa
  const tapa = tapaEje(), grTr = D.bb ? 2.8 : 0;
  [D.A, D.F].forEach((q, i) => { const mas2 = i === 0 ? grTr : 0, lEje = total + 2 * 2.6 + mas2; piezas.push(['Eje de la rueda ' + (i ? 'delantera' : 'trasera'), ejeTumbado(EJE, lEje, 1)]); montaje.push(dePie(perfilEje(EJE, 1).extrude(lEje).translate([q[0], q[1], -2.6])));
    piezas.push(['Tapa de eje', tapa], ['Tapa de eje', tapa]); montaje.push(pon(tapa.translate([q[0], q[1], 0]), -3.4 - 0.01), pon(tapa.mirror([0, 0, 1]).translate([q[0], q[1], 3.4]), total + mas2 + 0.01)); });
  // pasadores que alinean las tres capas
  const pas = ejeTumbado(PAS, total, 1); D.pasadores.forEach((q, i) => { piezas.push(['Pasador ' + (i + 1), pas]); montaje.push(dePie(perfilEje(PAS, 1).extrude(total).translate([q[0], q[1], 0]))); });
  let bielas = null, idxGira = [];
  if (D.bb) { // transmisión fija (plato + cadena + piñón) y bielas con pedal sobre el eje de dos caras
    const tr = D.transmision.extrude(2).add(D.eslabones.extrude(0.5).translate([0, 0, 1.99])); piezas.push(['Plato, cadena y piñón', tr]); montaje.push(pon(tr, total + 0.3));
    const tb = 4, lb = D.biela, bi2 = N.csUnion([tubo([0, 0], [lb, 0], 8.6, 5.4)]).subtract(perfilEje(EJE, 2, ENCAJES.presion));
    const biela = conBisel(bi2, tb, 0.6).add(conBisel(rr(8.5, 4.6, 1.2).translate([lb, 0]), tb + 6.5, 0.6));
    const lBB = total + 0.3 + 2.5 + 0.3 + tb + 0.3 + tb, ejeBB = perfilEje(EJE, 2).extrude(lBB).rotate([90, 0, 0]).translate([0, lBB / 2, EJE * 0.4]);
    piezas.push(['Biela derecha', biela], ['Biela izquierda', biela], ['Eje del pedalier', ejeBB]);
    bielas = ang => [pon(biela.rotate([0, 0, ang]).translate([D.bb[0], D.bb[1], 0]), total + 0.3 + 2.5 + 0.3), pon(biela.mirror([0, 0, 1]).rotate([0, 0, ang + 180]).translate([D.bb[0], D.bb[1], 0]), -0.3)];
    idxGira = [montaje.length, montaje.length + 1, montaje.length + 2]; montaje.push(...bielas(-35), dePie(perfilEje(EJE, 2).rotate(-35).extrude(lBB).translate([D.bb[0], D.bb[1], -0.3 - tb])));
  }
  // manillar y sillín: entran en las pestañas del núcleo (a presión)
  const ranura = L => rr(L + 2 * ENCAJES.presion, tc + 2 * ENCAJES.presion).extrude(4.2).translate([0, 0, -0.01]);
  // (pest = [x, y de ARRIBA de la pestaña, largo]; el manillar va atravesado: su largo es el grosor de la bici)
  if (D.manillar) { const Mn = D.manillar(ranura(D.pestM[2]).rotate([0, 0, 90])); piezas.push(['Manillar', Mn]); montaje.push(dePie(Mn.rotate([-90, -90, 0]).translate([D.pestM[0], D.pestM[1] - 4.2 + 0.05, tp + tc / 2]))); }
  if (D.sillin) { const Sn = D.sillin(ranura(D.pestS[2]).translate([-3, 0, 0])); piezas.push(['Sillín', Sn]); montaje.push(dePie(Sn.rotate([-90, 0, 0]).translate([D.pestS[0] + 3, D.pestS[1] - 4.2 + 0.05, tp + tc / 2]))); }
  // peana: las dos ruedas en su cuna, la trasera entre dos mejillas; con nombre
  const lp = D.F[0] - D.A[0] + 2 * D.R * 0.62, wp = Math.max(30, total + 18), hueco = D.gr + 0.7, xc = (D.A[0] + D.F[0]) / 2, alto = Math.min(D.R * 0.4, 12);
  let peana = conBisel(rr(lp, wp, 8), 3.4, 0.8);
  const mej = k => M().hull([caja(D.R * 0.95, 2.8, 0.02), caja(D.R * 0.5, 2.8, 0.02).translate([0, 0, alto])]).translate([D.A[0] - xc, k * (hueco / 2 + 1.4), 3.39]);
  peana = peana.add(mej(-1)).add(mej(1));
  [D.A, D.F].forEach(q => { peana = peana.subtract(M().cylinder(wp, D.R + 0.15, D.R + 0.15, 96).rotate([90, 0, 0]).translate([q[0] - xc, wp / 2, D.R + 0.15 + 3.4 - 0.9]).intersect(caja(D.R * 2, hueco, 20).translate([q[0] - xc, 0, 0]))); });
  if (p.txt && String(p.txt).trim()) { let T = N.centraCS(N.texto2(String(p.txt).trim(), p.fuente || 'gorda', Math.min(7, (wp - hueco) / 2 - 5))); const bt = N.cajaCS(T), k = Math.min(1, (lp * 0.5) / bt.w); peana = peana.subtract(T.scale([k, k]).translate([lp * 0.08, -(hueco / 2 + (wp - hueco) / 4 + 0.6)]).extrude(1).translate([0, 0, 3.4 - 0.6])); }
  piezas.push(['Peana', peana]);
  const zSuelo = 3.4 - 0.9 + 0.1, enPeana = montaje.map(m => m.translate([-xc, tp + tc / 2, zSuelo])).concat([peana]);
  return { piezas, montaje: enPeana, bielas: bielas ? ang => bielas(ang).map(m => m.translate([-xc, tp + tc / 2, zSuelo])) : null, idxGira, total, tc, tp };
}

// ---------- 🚲 LA BICICLETA ----------
export function datosBici(p) {
  const f = p.rueda / 62, R = 31 * f, mtb = p.tipo === 'montana', gr = mtb ? 9 : 7;
  const Aq = [0, R], F = [(mtb ? 104 : 100) * f, R], BB = [40 * f, R - (mtb ? 3 : 5.5) * f], C = [26 * f, (mtb ? 64 : 70) * f], Hb = [(mtb ? 82 : 80) * f, (mtb ? 64 : 63) * f], Ht = [(mtb ? 79 : 77) * f, (mtb ? 75 : 74) * f];
  const dS = uni(BB, C), dH = uni(Hb, Ht), S = mas(C, dS, (mtb ? 17 : 12) * f), T = mas(Ht, dH, 7 * f), T2 = mas(T, [mtb ? 7 * f : 10 * f, mtb ? 3 * f : 1 * f]), C2 = mas(C, dS, -4 * f);
  const wT = Math.max(4.6, 5.2 * f), pestS = [S[0], S[1] + 7.8, 6], pestM = [T2[0], T2[1] + 7.8, 5]; // (pestañas de 8 de alto: el manillar y el sillín quedan por encima de los tubos)
  // núcleo: el triángulo principal, la tija y la potencia, con sus dos pestañas
  const nucleo = N.csUnion([tubo(BB, S, wT + 0.6, wT - 0.6), tubo(C2, Ht, wT), tubo(BB, Hb, wT + 0.8), tubo(Hb, T, wT + 1.2), tubo(T, T2, wT - 0.6), disco(BB, 13), disco(C, 8.4),
    rr(pestS[2], 8).translate([pestS[0], S[1] + 3.8]), rr(pestM[2], 8).translate([pestM[0], T2[1] + 3.8])]);
  // placa: lo mismo más fino (da relieve de tubo) + tirantes, vainas y horquilla con su curva
  const c1 = mas(Hb, dH, -25 * f), curva = []; for (let i = 0; i <= 10; i++) { const t = i / 10; curva.push([(1 - t) * (1 - t) * Hb[0] + 2 * t * (1 - t) * c1[0] + t * t * F[0], (1 - t) * (1 - t) * Hb[1] + 2 * t * (1 - t) * c1[1] + t * t * F[1]]); } // la horquilla: baja recta y se curva hacia delante al final
  const placa = N.csUnion([tubo(BB, C, wT - 1.4), tubo(C2, Ht, wT - 1.6), tubo(BB, Hb, wT - 1.2), tubo(Hb, Ht, wT), tubo(C, Aq, 3.6, 3.2), tubo(BB, Aq, 4, 3.4), cadenaTubos(curva, 3.9), disco(Aq, 10.4), disco(F, 10.4), disco(BB, 12), disco(C, 7.6)]);
  // transmisión fija: plato (con sus brazos), cadena y piñón
  const Rp = 11 * f, rp = 4.8 * f, banda = CS().hull([disco(BB, 2 * Rp + 4.4), disco(Aq, 2 * rp + 4.4)]).subtract(CS().hull([disco(BB, 2 * Rp), disco(Aq, 2 * rp)]));
  const dientes = (q, r, nD) => { const L = []; for (let i = 0; i < nD; i++) L.push(en(poli([[-0.9, r - 0.4], [0.9, r - 0.4], [0.35, r + 1.5], [-0.35, r + 1.5]]).rotate(i * 360 / nD), q)); return N.csUnion(L); };
  const plato = disco(BB, 2 * Rp - 2.4).subtract(N.csUnion([0, 1, 2, 3, 4].map(i => en(circ(Rp * 0.62).translate([Rp * 0.52, 0]).rotate(i * 72 + 18), BB)))).add(dientes(BB, Rp - 1.4, Math.round(Rp * 2.2)));
  const pinon = disco(Aq, 2 * rp - 2.2).add(dientes(Aq, rp - 1.3, Math.round(rp * 2.4)));
  const transmision = N.csUnion([banda, plato, pinon]).subtract(disco(BB, EJE + 2 * HOL.gira + 0.1)).subtract(disco(Aq, EJE + 2 * ENCAJES.justo));
  // los eslabones: rodillos en relieve a lo largo de la cadena
  const es = [], dir = uni(BB, Aq), nor = [-dir[1], dir[0]], dist = Math.hypot(Aq[0] - BB[0], Aq[1] - BB[1]), incl = Math.asin((Rp - rp) / dist), paso = 2.6;
  [-1, 1].forEach(k => { const a = [BB[0] + (Rp + 1.1) * (nor[0] * k * Math.cos(incl) + dir[0] * Math.sin(incl)), BB[1] + (Rp + 1.1) * (nor[1] * k * Math.cos(incl) + dir[1] * Math.sin(incl))], b = [Aq[0] + (rp + 1.1) * (nor[0] * k * Math.cos(incl) + dir[0] * Math.sin(incl)), Aq[1] + (rp + 1.1) * (nor[1] * k * Math.cos(incl) + dir[1] * Math.sin(incl))];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), nE = Math.floor(L / paso); for (let i = 0; i <= nE; i++) es.push(disco([a[0] + (b[0] - a[0]) * i / nE, a[1] + (b[1] - a[1]) * i / nE], 1.7)); });
  [[BB, Rp + 1.1, 1], [Aq, rp + 1.1, -1]].forEach(([q, r, lado]) => { const a0 = Math.atan2(dir[1], dir[0]) + (lado > 0 ? Math.PI : 0), nE = Math.max(4, Math.round(Math.PI * r / paso)); for (let i = 1; i < nE; i++) { const a = a0 - Math.PI / 2 + i / nE * Math.PI; es.push(disco([q[0] + r * Math.cos(a), q[1] + r * Math.sin(a)], 1.7)); } });
  const eslabones = N.csUnion(es).intersect(banda.offset(-0.15, 'Round'));
  const manillar = hueco => { const L = mtb ? 62 : 54, cuerpo = N.csUnion([rr(L, 5.4, 2.7), rr(12, 9.5, 2.5), rr(11, 7.6, 3.2).translate([-(L / 2 - 5.5), 0]), rr(11, 7.6, 3.2).translate([L / 2 - 5.5, 0])]); return conBisel(cuerpo, 7, 1.2).subtract(hueco); };
  const sillin = hueco => { const pera = CS().hull([en(circ(15 * Math.max(0.9, f)), [-9, 0]), en(circ(5.5), [15, 0])]); return conBisel(pera, 6.5, 1.6).subtract(hueco); };
  return { R, gr, A: Aq, F, nucleo, placa, pasadores: [C, mas(Hb, dH, 5.6 * f)], bb: BB, biela: 16.5 * f, transmision, eslabones, pestS, pestM, manillar, sillin,
    ruedaT: { radios: mtb ? 12 : 16, tacos: mtb ? 36 : 0, neum: R * (mtb ? 0.2 : 0.14) }, tipo: p.tipo };
}

// ---------- 🏍️ LA MOTO ----------
export function datosMoto(p) {
  const f = p.rueda / 50, R = 25 * f, gr = 12, Aq = [0, R], F = [112 * f, R], P = (x, y) => [x * f, y * f];
  // núcleo: motor, depósito, asiento y colín, de una pieza (silueta de «naked»)
  const motor = poli([P(38, 16), P(70, 14), P(78, 30), P(72, 44), P(46, 46), P(34, 34)]).offset(-2, 'Round').offset(4, 'Round').offset(-2, 'Round');
  const deposito = CS().hull([en(circ(20 * f), P(62, 58)), en(circ(15 * f), P(78, 58)), en(circ(10 * f), P(52, 54))]);
  const asiento = CS().hull([en(circ(8 * f), P(46, 55)), en(circ(7 * f), P(22, 58)), en(circ(5 * f), P(8, 63))]);
  const pipa = P(88, 62), tija = P(84, 72), faro = P(95, 60);
  const nucleo = N.csUnion([motor, deposito, asiento, tubo(P(72, 44), pipa, 9 * f), tubo(P(40, 36), P(26, 54), 8 * f), tubo(pipa, tija, 9 * f, 7 * f), CS().hull([en(circ(13 * f), faro), en(circ(8 * f), P(90, 62))]),
    rr(5, 8).translate([tija[0], tija[1] + 3.8 + 2 * f])]);
  // aletas del motor (ranuras) y tapa: detalle que se ve
  const aletas = N.csUnion([0, 1, 2, 3].map(i => rr(26 * f, 1.5 * f, 0.6).rotate(-6).translate([58 * f, (22 + i * 5.2) * f])));
  const nucleo3 = nucleo.subtract(aletas);
  // placa: horquilla (dos barras), basculante, subchasis, escape y guardabarros
  const eje2 = P(40, 30), escape = cadenaTubos([P(60, 16), P(40, 12), P(14, 16), P(-6, 22)], 6.4 * f);
  const placa = N.csUnion([tubo(mas(tija, [2 * f, 0]), F, 6.4 * f, 5.4 * f), tubo(eje2, Aq, 8 * f, 6 * f), tubo(eje2, P(64, 30), 7 * f), tubo(eje2, P(40, 50), 6 * f), tubo(P(40, 50), P(64, 54), 5.5 * f), tubo(P(64, 54), pipa, 6 * f), tubo(P(64, 30), P(70, 46), 6 * f), tubo(P(70, 46), pipa, 6 * f),
    tubo(P(40, 50), P(16, 58), 5 * f), tubo(P(16, 58), Aq, 4.4 * f, 4.4 * f), escape, tubo(P(60, 16), P(64, 30), 5.4 * f), disco(Aq, 11), disco(F, 11), disco(eje2, 10), disco(pipa, 9), disco(tija, 8)]);
  const manillar = hueco => { const L = 58, cuerpo = N.csUnion([rr(L, 5.6, 2.8), rr(12, 9.5, 2.5), rr(13, 8, 3.4).translate([-(L / 2 - 6.5), 0]), rr(13, 8, 3.4).translate([L / 2 - 6.5, 0]), en(circ(9), [-(L / 2 - 16), 6.5]), en(circ(9), [L / 2 - 16, 6.5]), rr(2.4, 6, 0).translate([-(L / 2 - 16), 3]), rr(2.4, 6, 0).translate([L / 2 - 16, 3])]); return conBisel(cuerpo, 7, 1.2).subtract(hueco); };
  return { R, gr, A: Aq, F, nucleo: nucleo3, placa, pasadores: [eje2, pipa, P(70, 46)], bb: null, pestM: [tija[0], tija[1] + 7.8 + 2 * f, 5], manillar, ruedaT: { disco: true, neum: R * 0.3, llanta: R * 0.1, buje: 6 }, ruedaD: { disco: true, neum: R * 0.26, llanta: R * 0.1, buje: 6 } };
}

// ¿se monta y gira? Ninguna pieza pisa a otra; las bielas dan la vuelta entera sin tocar nada; ruedas de revolución con su aire a cada lado
const _ck = new Map();
export function compruebaKit(cual, p) {
  const k = JSON.stringify([cual, p.rueda, p.tipo]); if (_ck.has(k)) return _ck.get(k);
  const r = N.enAmbito(() => { const K = kit(cual === 'moto' ? datosMoto(p) : datosBici(p), p); let pisa = 0, par = '';
    for (let i = 0; i < K.montaje.length; i++) for (let j = i + 1; j < K.montaje.length; j++) { const v = K.montaje[i].intersect(K.montaje[j]).volume(); if (v > pisa) { pisa = v; par = i + '-' + j; } }
    let giro = 0; if (K.bielas) { const fijo = N.union(K.montaje.filter((m, i) => !K.idxGira.includes(i))); for (let a = 0; a < 360; a += 30) { const B = K.bielas(a); giro = Math.max(giro, B[0].intersect(fijo).volume(), B[1].intersect(fijo).volume()); } }
    let grande = 0; K.piezas.forEach(([, m]) => { const b = N.caja(m); grande = Math.max(grande, b.dims[0], b.dims[1]); });
    return { pisa, par, giro, piezas: K.piezas.length, grande, total: K.total }; });
  if (_ck.size > 20) _ck.clear(); _ck.set(k, r); return r;
}
function genKit(cual, p) { const K = kit(cual === 'moto' ? datosMoto(p) : datosBici(p), p); if (p.que === 'montado') return N.union(K.montaje);
  const grandes = /Placa|Núcleo|Rueda|Peana/; if (p.que === 'cama1') return enRejilla(K.piezas.filter(x => grandes.test(x[0])).map(x => x[1]), 250, 5); if (p.que === 'cama2') return enRejilla(K.piezas.filter(x => !grandes.test(x[0])).map(x => x[1]), 200, 5);
  return enRejilla(K.piezas.map(x => x[1]), 250, 5); }
const QUE_KIT = [['cama1', 'Cama 1: placas, núcleo, ruedas y peana'], ['cama2', 'Cama 2: ejes, tapas, pasadores y lo pequeño'], ['montado', '👀 Verlo montado (solo para mirar)']];

export const DISENOS_KITS = {
  bicicletaKit: { cat: 'juguetes', tambien: ['ninos', 'juegos', 'regalos'], e: '🚲', t: 'Bicicleta para montar (las ruedas giran)', d: 'Kit de piezas planas: ruedas y bielas que giran, cadena de eslabones, manillar, sillín y peana con nombre', uso: 'encaje', color: '#e2231a',
    campos: [s('que', 'Qué imprimo', 'cama1', QUE_KIT), s('tipo', 'Bicicleta', 'carretera', [['carretera', 'De carretera'], ['montana', 'De montaña (rueda gorda con tacos)']]), n('rueda', 'Diámetro de las ruedas', 62, 50, 80, 1), tx('txt', 'Nombre en la peana', '')],
    gen(p) { return genKit('bici', p); },
    nota: p => { let R = null; try { R = compruebaKit('bici', p); } catch (e) { return '⚠️ ' + e.message; }
      if (p.que === 'montado') return '👀 Esto es solo para VERLA montada. Para imprimir elige «Cama 1» y luego «Cama 2»: todo sale plano, sin soportes.';
      return (R.pisa < 0.01 && R.giro < 0.01 ? 'COMPROBADA (en el ordenador): montada, ninguna pieza pisa a otra y las bielas dan la vuelta entera sin tocar nada' : '⚠️ Algo se pisa (' + n2(Math.max(R.pisa, R.giro)) + ' mm³): vuelve al tamaño de serie') + '. ' + R.piezas + ' piezas en DOS CAMAS, todas planas. CÓMO SE MONTA: (1) núcleo sobre una placa, con los 2 pasadores; (2) las ruedas en su hueco y sus ejes (la cara plana es solo para imprimirlos); (3) la otra placa encima y las 4 tapas a presión; (4) plato-cadena-piñón por el lado derecho, eje del pedalier y las dos bielas, una hacia arriba y otra hacia abajo; (5) sillín y manillar a presión en sus pestañas; (6) a la peana. Las RUEDAS giran sobre su eje (0,2 mm de holgura) y las BIELAS giran con sus pedales; la cadena es de adorno, con sus eslabones en relieve. Si algo entra flojo, una gota de pegamento. Queda de ' + n2(R.total) + ' mm de gruesa. Bonita a dos colores: cuadro en un color y ruedas, sillín y puños en negro.'; } },
  motoKit: { cat: 'juguetes', tambien: ['ninos', 'juegos', 'regalos'], e: '🏍️', t: 'Moto para montar (las ruedas giran)', d: 'Kit de piezas planas: motor con aletas, depósito, escape, horquilla, basculante, manillar con espejos y peana con nombre', uso: 'encaje', color: '#1b1b1d',
    campos: [s('que', 'Qué imprimo', 'cama1', QUE_KIT), n('rueda', 'Diámetro de las ruedas', 50, 42, 64, 1), tx('txt', 'Nombre en la peana', '')],
    gen(p) { return genKit('moto', p); },
    nota: p => { let R = null; try { R = compruebaKit('moto', p); } catch (e) { return '⚠️ ' + e.message; }
      if (p.que === 'montado') return '👀 Esto es solo para VERLA montada. Para imprimir elige «Cama 1» y luego «Cama 2»: todo sale plano, sin soportes.';
      return (R.pisa < 0.01 ? 'COMPROBADA (en el ordenador): montada, ninguna pieza pisa a otra' : '⚠️ Algo se pisa (' + n2(R.pisa) + ' mm³): vuelve al tamaño de serie') + '. ' + R.piezas + ' piezas en DOS CAMAS, todas planas. CÓMO SE MONTA: (1) el núcleo (motor, depósito y asiento) sobre una placa, con los 3 pasadores; (2) las ruedas en su hueco y sus ejes; (3) la otra placa encima (horquilla, basculante y escape quedan a los dos lados) y las 4 tapas a presión; (4) el manillar con sus espejos, a presión en la pestaña; (5) a la peana. Las RUEDAS giran sobre su eje (0,2 mm de holgura). Queda de ' + n2(R.total) + ' mm de gruesa: una moto con cuerpo. Bonita a dos colores: núcleo en un color vivo y placas y ruedas en negro.'; } },
};
