// ================= 20-10-2026 · 🛻 CAMIÓN RC 1/10 POR PIEZAS (estadio · short course · monster): el kit entero, solo pones los componentes =================
// Ella (20-10): «los coches RC de varios estilos… así de profesionales y funcionales; uno tipo TRAXXAS, a piezas, listo para montar; dónde va
// la tornillería, en el manual, y el tipo de rodamiento; todos los componentes necesarios para comprar únicamente». DISEÑO PROPIO © CelebriDiseños
// de esa categoría (1/10, tracción trasera, suspensión independiente en las 4 ruedas), SIN copiar las piezas de ninguna marca ni usar su nombre:
// compatible con lo ESTÁNDAR del mercado (ruedas 1/10 con hexágono de 12 mm, motor 540, servo estándar, amortiguadores 1/10, rodamientos 5×11×4
// y 10×15×4, tornillería M3/M5, rótulas M3).
// CÓMO ES (x hacia delante, y a la izquierda, z arriba; el suelo en z = 0; el eje de atrás en x = 0 y el de delante en x = WB):
//  · SUSPENSIÓN de doble trapecio en las 4 esquinas (vista de frente, plana): TRAPECIO abajo (gira en un tornillo M3 en sus orejetas del chasis),
//    BIELA DE CAÍDA arriba (varilla roscada M3 con dos rótulas), AMORTIGUADOR de aceite (se compra) entre la torre y el trapecio. La biela es más corta
//    que el trapecio y sube hacia fuera: al comprimir, la rueda se cierra por arriba (caída negativa), como en los de carreras.
//  · DELANTE: la PIEZA EN C (gira en el trapecio) con la MANGUETA dentro sobre dos tornillos-pivote; la mangueta lleva DOS RODAMIENTOS 5×11×4 y el
//    eje es un TORNILLO M5 que gira con la rueda (el hexágono de 12 lleva una tuerca M5 dentro y la rueda se aprieta con una autoblocante).
//  · DETRÁS: el PORTAMANGUETA (gira en el trapecio) con dos 5×11×4; el tornillo M5 se mueve por su CABEZA, metida en la COPA que empuja el PALIER.
//  · Lo que se compra se dibuja en gris para comprobar que cabe: ruedas, amortiguadores, rótulas, tornillos de los ejes.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';
import * as B from './cat_bici.js';

const { n, s, M, CS, circ, rr, poli, cil, caja, n2, conBisel } = A;
const { PRES, JUSTO, GIRA } = B, U = B.UTIL;
const { R2, capsula, M4 } = U;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const rot2 = (p, c, a) => { const sn = Math.sin(a), co = Math.cos(a), dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * co - dy * sn, c[1] + dx * sn + dy * co]; };
// cilindros a lo largo de cada eje (d = diámetro)
const cilX = (d, x0, x1, y, z) => cil(d, x1 - x0).rotate([0, 90, 0]).translate([x0, y, z]);
const cilY = (d, y0, y1, x, z) => cil(d, y1 - y0).rotate([-90, 0, 0]).translate([x, y0, z]);
const cilZ = (d, z0, z1, x, y) => cil(d, z1 - z0, z0).translate([x, y, 0]);
const bloque = (x0, x1, y0, y1, z0, z1, r = 0) => caja(x1 - x0, y1 - y0, z1 - z0, r).translate([(x0 + x1) / 2, (y0 + y1) / 2, z0]);
// girar alrededor de una recta paralela a x que pasa por (y0, z0) · a en grados (+ = de +y hacia +z)
const giraX = (m, y0, z0, a) => a ? m.translate([0, -y0, -z0]).rotate([a, 0, 0]).translate([0, y0, z0]) : m;
const giraZ = (m, x0, y0, a) => a ? m.translate([-x0, -y0, 0]).rotate([0, 0, a]).translate([x0, y0, 0]) : m;
const espejoY = m => m.mirror([0, 1, 0]);

// ---------- la TORNILLERÍA y los RODAMIENTOS (medidas de catálogo: ISO/DIN) ----------
export const TOR = { m3: { paso: 3.3, gira: 3.5, rosca: 2.6, cabeza: 5.5, hCab: 3, tuerca: 5.5, hTuerca: 2.4, hAuto: 4 }, m5: { paso: 5.3, rosca: 4.3, cabezaHex: 8, hCabHex: 3.5, tuerca: 8, hTuerca: 4, hAuto: 5 } };
export const ROD = { r5: { t: 'Rodamiento 5×11×4 (MR115ZZ / 685ZZ de 4 mm)', d: 5, D: 11, b: 4 }, r10: { t: 'Rodamiento 10×15×4 (6700ZZ)', d: 10, D: 15, b: 4 } };
export const LARGOS_M3 = [6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60];
export const largoM3 = L => LARGOS_M3.find(x => x >= L - 0.2) || 60; // el largo de catálogo que alcanza (L = lo que hace falta de agarre)

// ---------- los ESTILOS (medidas de un 1/10 de cada tipo; los amortiguadores: [largo estirado, largo comprimido] de ojo a ojo, los habituales) ----------
export const ESTILOS = {
  estadio: { t: 'Estadio (stadium truck: ruedas grandes, mucho recorrido)', WB: 324, via: 252, D: 110, A: 48, amD: [90, 63], amT: [110, 78] },
  corto: { t: 'Short course (camioneta de carreras, carrocería que tapa las ruedas)', WB: 334, via: 262, D: 108, A: 44, amD: [90, 63], amT: [110, 78] },
  monster: { t: 'Monster (ruedas gigantes, muy alto)', WB: 334, via: 286, D: 136, A: 62, amD: [110, 78], amT: [125, 88] }
};

// ---------- las MEDIDAS: todo sale del estilo (y de lo que ella cambie) ----------
export function medidasCamion(p) {
  const E = ESTILOS[p.estilo] || ESTILOS.estadio, WB = clamp(+p.batalla || E.WB, 300, 360), via = clamp(+p.via || E.via, 240, 300), D = clamp(+p.rueda || E.D, 100, 145), A_ = clamp(+p.anchoRueda || E.A, 38, 70);
  const R = D / 2, zA = R, zF0 = zA - 31, tF = 3.5, zF1 = zF0 + tF, yWi = via / 2 - A_ / 2, yK = yWi + 2;
  const amD = [+p.amDl || E.amD[0], +p.amDc || E.amD[1]], amT = [+p.amTl || E.amT[0], +p.amTc || E.amT[1]];
  // las dos esquinas, en (y, z): L0 bisagra del trapecio · L1 su punta (pasador de la C / del portamangueta) · U0 rótula de la torre · U1 rótula de la C ·
  // S el ojo de abajo del amortiguador (en el trapecio) · T el de arriba (en la torre) · W el centro de la rueda
  // en x: xT la placa de la torre · xS el plano del amortiguador (a 11,5 de la torre: su cuerpo, Ø21, no la toca) · xU el de la biela · hb lo que ocupa la bisagra del trapecio
  //  · DELANTE: torre en el eje, amortiguadores delante, bielas detrás (su rótula, detrás del lomo de la C; la dirección, por debajo de ellas)
  //  · DETRÁS: torre por detrás de la caja de cambios, amortiguadores delante de ella (y detrás de la copa), bielas por delante del eje
  const esquina = (del) => { const L0 = [del ? 32 : 40, zA - 22], L1 = del ? [yK - 9, zA - 18] : [yK + 2, zA - 16], U0 = [del ? 34 : 42, zA + (del ? 12 : 14)] /* (20-10, 9d1c9ad6: detrás, la biela de caída 2 mm más alta en sus DOS puntas —misma caída— para que su brazo de la torre pase por encima de la copa de salida) */, U1 = del ? [yK - 17, zA + 23] : [yK - 8, zA + 21], W = [via / 2, zA];
    const am = del ? amD : amT, tS = 0.78, a = [L1[0] - L0[0], L1[1] - L0[1]], la = Math.hypot(...a), nn = [-a[1] / la, a[0] / la], S = [L0[0] + tS * a[0] + 10 * nn[0], L0[1] + tS * a[1] + 10 * nn[1]];
    const yT = del ? 60 : 64, Lr = am[1] + 0.62 * (am[0] - am[1]), T = [yT, S[1] + Math.sqrt(Math.max(1, Lr * Lr - (yT - S[0]) ** 2))];
    const xT = del ? [WB, WB + 5] : [-37.5, -32.5], xS = del ? WB + 16.5 : -21, xU = del ? WB - 11 : 15, hb = del ? [-22.8, 24.5] : [-36, 20], hueco = del ? 15 : 6.5; // (hueco: lo que entra la C entre las orejas del trapecio)
    return { del, L0, L1, U0, U1, W, S, T, am, tS, la, ang0: Math.atan2(a[1], a[0]) / R2, xS, xU, xT, hb, hueco, xa: del ? WB : 0 }; };
  const F = esquina(true), T = esquina(false);
  return { estilo: p.estilo in ESTILOS ? p.estilo : 'estadio', E, WB, via, D, R, A: A_, zA, zF0, zF1, tF, yWi, yK, F, T, xJ: Math.round(WB * 0.54) };
}

// ---------- 1) la CINEMÁTICA de una esquina (vista de frente): giro del trapecio phi → dónde quedan la pieza en C / portamangueta y la rueda ----------
// psi: lo que gira la C alrededor de su pasador (en grados, + = de +y hacia +z: la parte de arriba hacia dentro = caída negativa)
export function poseEsquina(G, phi) {
  const L1 = rot2(G.L1, G.L0, phi * R2), dL = [L1[0] - G.L1[0], L1[1] - G.L1[1]], c = d2(G.U0, G.U1), U1b = [G.U1[0] + dL[0], G.U1[1] + dL[1]];
  const f = a => d2(rot2(U1b, L1, a * R2), G.U0) - c; let lo = -30, hi = 30, best = null;
  for (let a = -30; a <= 30; a += 0.25) { const v = Math.abs(f(a)); if (!best || v < best.v) best = { a, v }; }
  lo = best.a - 0.25; hi = best.a + 0.25; for (let k = 0; k < 40; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1; }
  const psi = (lo + hi) / 2, W = rot2([G.W[0] + dL[0], G.W[1] + dL[1]], L1, psi * R2), S = rot2(G.S, G.L0, phi * R2);
  return { phi, psi, L1, dL, U1: rot2(U1b, L1, psi * R2), W, S, am: d2(S, G.T), err: Math.abs(f(psi)) };
}
// el recorrido: de lo que deja el amortiguador estirado (abajo) a comprimido (arriba)
export function recorrido(G) { const Lam = phi => poseEsquina(G, phi).am; let a = 0; while (a > -40 && Lam(a - 0.25) <= G.am[0]) a -= 0.25; let b = 0; while (b < 40 && Lam(b + 0.25) >= G.am[1]) b += 0.25; return { abajo: a, arriba: b }; }

// ---------- 2) el TRAPECIO (se imprime plano): marco propio: x a lo largo de la bisagra, u del pasador de la bisagra a la punta, w hacia arriba ----------
const OREJA = [6.2, 10.2]; // las orejas de la punta (la C / el portamangueta entra entre ellas)
export function trapecioPlano(G) { const a = G.la, xS = G.xS - G.xa, tS = G.tS * a, e = 3.5, [h0, h1] = G.hb;
  const hPad = xS < 0 ? h0 + 4.5 : h1 - 4.5; // (la pata del amortiguador sale de la punta de la bisagra de su lado: así la esquina de fuera no roza la rueda)
  const plan = CS().hull([circ(9).translate([h0 + 4.5, 0]), circ(9).translate([h1 - 4.5, 0]), circ(9).translate([-OREJA[1] + 4.5, a - 2]), circ(9).translate([OREJA[1] - 4.5, a - 2])]).add(CS().hull([rr(14.2, 12, 4).translate([xS, tS]), circ(9).translate([hPad, 0]), circ(9).translate([xS * 0.4, tS * 0.6])]));
  const ventana = CS().hull([circ(2).translate([h0 + 11, 7.5]), circ(2).translate([h1 - 11, 7.5]), circ(2).translate([0, a - 13])]).subtract(rr(18, 16).translate([xS, tS]));
  let m = plan.subtract(ventana).extrude(2 * e).translate([0, 0, -e]);
  m = m.add(cilX(9, h0, h1, 0, 0)).add(cilX(9, -OREJA[1], -OREJA[0], a, 0)).add(cilX(9, OREJA[0], OREJA[1], a, 0)); // la bisagra y las orejas
  m = m.subtract(bloque(-OREJA[0] + 0.01, OREJA[0] - 0.01, a - G.hueco, a + 6, -e - 1, e + 1)); // el hueco de la C / del portamangueta
  [-1, 1].forEach(sg => { m = m.add(M().hull([bloque(xS + sg * 5.1 - 2, xS + sg * 5.1 + 2, tS - 5.5, tS + 5.5, e - 0.01, e), cilX(9, xS + sg * 5.1 - 2, xS + sg * 5.1 + 2, tS, 10)])); }); // las dos orejas del amortiguador
  m = m.subtract(cilX(TOR.m3.gira, h0 - 1, h1 + 1, 0, 0)).subtract(cilX(TOR.m3.paso, -OREJA[1] - 1, OREJA[1] + 1, a, 0)).subtract(cilX(TOR.m3.paso, xS - 9, xS + 9, tS, 10));
  return m.intersect(bloque(G.hb[0] - 20, G.hb[1] + 20, -20, a + 20, -e, 30)); } // (la base, plana: los tubos de Ø9 se recortan 1 mm por abajo y la pieza apoya entera en la cama)
// del marco del trapecio a su sitio (con su giro phi): la bisagra en (L0), a lo largo de x en el eje que toque
export const trapecioEnSitio = (G, phi, izq = true) => { const m = giraX(trapecioPlano(G).rotate([G.ang0, 0, 0]).translate([G.xa, G.L0[0], G.L0[1]]), G.L0[0], G.L0[1], phi); return izq ? m : espejoY(m); };
// el alojamiento de la RÓTULA: dos mejillas con una ranura de 9 (la rótula dentro) y el tornillo M3 a lo largo de x por las dos
const ranuraRotula = (xc, U) => bloque(xc - 4.5, xc + 4.5, U[0] - 10, U[0] + 10, U[1] - 8, U[1] + 10);

// ---------- 3) DELANTE: la PIEZA EN C (con su pasador abajo) y la MANGUETA (gira entre sus dos pivotes) ----------
// la C: el LOMO por DENTRO (entre la punta del trapecio y la mangueta), placa de abajo (con el tubo del pasador) y de arriba hasta el pivote;
// arriba, detrás del pivote, el alojamiento de la rótula de la biela de caída
export const KP = { z0: -10, z1: 14 }; // la mangueta, entre zA−10 y zA+14 (las placas de la C, fuera de eso)
export function piezaC(Q) { const G = Q.F, x0 = Q.WB, { yK, zA } = Q, L1 = G.L1, U1 = G.U1;
  const tubo = cilX(9, x0 - 5.9, x0 + 5.9, L1[0], L1[1]), pieLomo = bloque(x0 - 5.9, x0 + 5.9, yK - 21, yK - 13, zA - 13, zA + KP.z0 - 0.2);
  let m = tubo.add(bloque(x0 - 5.9, x0 + 5.9, yK - 21, yK - 13, zA - 13, U1[1] + 5, 1.5)); // el lomo (sube hasta la rótula de la biela, que va atornillada a él por detrás)
  m = m.add(M().hull([tubo, cilZ(12, zA - 15.2, zA + KP.z0 - 0.2, x0, yK), pieLomo])); // la placa de abajo
  m = m.add(M().hull([bloque(x0 - 5.9, x0 + 5.9, yK - 21, yK - 13, zA + KP.z1 + 0.2, zA + 19.2), cilZ(12, zA + KP.z1 + 0.2, zA + 19.2, x0, yK)])); // la de arriba
  m = m.subtract(cilX(TOR.m3.gira, x0 - 7, x0 + 7, L1[0], L1[1])); // gira en su pasador
  m = m.subtract(cilZ(TOR.m3.paso, zA - 16, zA + KP.z0 + 0.1, x0, yK)).subtract(cilZ(TOR.m3.paso, zA + KP.z1 - 0.1, zA + 20, x0, yK)); // los dos pivotes de la mangueta
  return m.subtract(cilX(TOR.m3.paso, x0 - 7, x0 + 7, U1[0], U1[1])); } // el tornillo de la rótula (M3 × 20 por delante, a través del lomo; autoblocante detrás de la rótula)
// la MANGUETA (en su sitio sin girar): el cuerpo del pivote, el alojamiento de los dos rodamientos (hacia fuera) y el brazo de dirección
// (hacia ATRÁS y un poco hacia dentro: apunta al centro del eje de atrás → Ackermann)
export const BRAZO_DIR = { x: -16, y: -5, z: 7.5 };
export function mangueta(Q) { const x0 = Q.WB, { yK, zA } = Q, r = ROD.r5, [yR0, yR1] = yRod(Q, true);
  let m = cilZ(10, zA + KP.z0, zA + KP.z1, x0, yK).add(cilY(17, yK - 4.5, yR1, x0, zA)).add(M().hull([cilZ(10, zA + KP.z0, zA + KP.z1, x0, yK), cilY(15, yK, yR0, x0, zA)]));
  const q = [x0 + BRAZO_DIR.x, yK + BRAZO_DIR.y]; m = m.add(M().hull([cilZ(10, zA + 6.5, zA + BRAZO_DIR.z + 4, x0, yK), cilZ(8, zA + 6.5, zA + BRAZO_DIR.z + 4, q[0], q[1])])); // el brazo de dirección (por encima de la cabeza del tornillo-eje; la rótula, 6 mm por debajo)
  m = m.subtract(cilY(r.D + 2 * PRES, yR0, yR1 + 1, x0, zA)).subtract(cilY(7.6, yK - 6, yR0 + 0.1, x0, zA)); // los rodamientos (a presión) y el paso del SEPARADOR del tornillo-eje
  m = m.subtract(cilZ(TOR.m3.rosca, zA + KP.z0 - 0.1, zA - 4, x0, yK)).subtract(cilZ(TOR.m3.rosca, zA + 6, zA + KP.z1 + 0.1, x0, yK)); // los pivotes (rosca en el plástico)
  return m.subtract(cilZ(TOR.m3.rosca, zA + 6.4, zA + BRAZO_DIR.z + 4.2, q[0], q[1])); }
// el SEPARADOR de delante: la cabeza del tornillo-eje aprieta el aro de dentro del rodamiento a través de él (gira con la rueda)
export const SEP_EJE = Q => ({ y0: Q.yK - 5.8, y1: yRod(Q, true)[0] });
export const separadorEje = Q => { const S = SEP_EJE(Q); return cil(7, S.y1 - S.y0).subtract(cil(TOR.m5.paso, S.y1 - S.y0 + 2, -1)); };

// ---------- 4) DETRÁS: el PORTAMANGUETA (gira en el trapecio, justo debajo de sus dos 5×11×4) ----------
// abajo el tubo del pasador (entre las orejas del trapecio); el cuerpo de los rodamientos; por fuera de la copa, el alma que sube; arriba, por
// encima de la copa y por dentro de la rueda, el alojamiento de la rótula de la biela de caída (delante del eje)
export function portamanguetaT(Q) { const G = Q.T, { yK, zA } = Q, L1 = G.L1, U1 = G.U1, r = ROD.r5, [yR0, yR1] = yRod(Q, false);
  let m = cilX(9, -5.9, 5.9, L1[0], L1[1]).add(cilY(17, yK - 2, yR1, 0, zA)); // el tubo del pasador · el cuerpo de los rodamientos
  m = m.add(bloque(-5.9, 5.9, yK - 1.5, L1[0] + 4.5, L1[1], zA - 4)); // del tubo al cuerpo (entre las orejas)
  m = m.add(bloque(-6, 6, yK - 2, yK + 1, zA, zA + 23, 1)); // el alma que sube (por fuera de la copa, dentro de la rueda: radio < 24)
  m = m.add(bloque(-6, G.xU + 10, yK - 12, yK - 2.6, zA + 12, U1[1] + 5, 1.5)).subtract(ranuraRotula(G.xU, U1)); // arriba: la rótula, entre dos mejillas (por dentro de la rueda)
  m = m.add(bloque(-5, 5, yK - 4, yK - 1, zA + 13, zA + 22)); // (20-10 noche: esas mejillas quedaban SUELTAS, a 0,6 mm del alma —la pieza salía en 2 trozos—; este puente las une al alma, dentro del radio de 24 de la rueda)
  m = m.subtract(cilX(TOR.m3.gira, -7, 7, L1[0], L1[1])).subtract(cilY(r.D + 2 * PRES, yR0, yR1 + 1, 0, zA)).subtract(cilY(7.4, yK - 3, yR0 + 0.1, 0, zA)); // pasador · rodamientos · el resalte de la copa
  return m.subtract(cilX(TOR.m3.paso, -7, G.xU + 11, U1[0], U1[1])); }

// ---------- 5) los EJES: tornillo M5 (gris), el HEXÁGONO de 12 (con su tuerca M5 dentro) y, detrás, la COPA ----------
export const yRod = (Q, del) => del ? [Q.yK + 3.5, Q.yK + 3.5 + 8] : [Q.yK + 1.5, Q.yK + 1.5 + 8]; // dónde van los rodamientos
export const HEXR = { L: 9, cuello: 1.5 }; // el hexágono (largo) y su cuello (toca solo el aro de dentro del rodamiento)
export function hexagonoRueda() { const L = HEXR.L, c = HEXR.cuello; let m = A.hex(12).extrude(L - c).translate([0, 0, c]).add(cil(7, c + 0.01)); // (cuello de Ø7, como la copa y el separador: toca el aro de dentro y no llega a la tapa del rodamiento)
  return m.subtract(cil(TOR.m5.paso, L + 2, -1)).subtract(A.hex(TOR.m5.tuerca + 2 * PRES).extrude(TOR.m5.hTuerca + 0.3).translate([0, 0, L - TOR.m5.hTuerca - 0.3 + 0.01])); } // (la tuerca M5, por fuera: se ve y se aprieta)
export const hexEnSitio = (Q, del) => hexagonoRueda().rotate([-90, 0, 0]).translate([del ? Q.WB : 0, yRod(Q, del)[1] + 0.05, Q.zA]);
export const caraRueda = (Q, del) => yRod(Q, del)[1] + 0.05 + HEXR.L; // donde apoya la rueda (su cara del hexágono)
// la COPA de atrás: el palier la empuja por su pasador; dentro lleva la CABEZA del tornillo M5 (hexágono de 8): así mueve la rueda
export const COPA = { D: 19, hondo: 11, bola: 9.6, ranura: 3.4 };
export function copaRueda() { const C = COPA, L = C.hondo + 5; let m = cil(C.D, L).add(cil(7, 3.4 + 0.01, L - 0.01)); // (el resalte de 7: entra por el portamangueta y toca el aro de dentro)
  m = m.subtract(cil(C.bola + 2 * GIRA, C.hondo + 0.01, -0.01)).subtract(caja(C.ranura, C.D - 3.5, C.hondo + 0.01).translate([0, 0, -0.01])); // el hueco del palier (como el de la copa de salida: 0,2 de aire) y la ranura de su pasador (hasta 7,75 del centro: el pasador de 3×14, con el palier inclinado, cabe)
  m = m.subtract(M().cylinder(5.2, 8.5, C.bola / 2 + GIRA, 64).translate([0, 0, -0.01])); // la BOCA abocinada: el palier se puede inclinar ~34° sin tocarla (medido, con la bola al fondo)
  return m.subtract(A.hex(TOR.m5.cabezaHex + 2 * PRES).extrude(TOR.m5.hCabHex + 0.3).translate([0, 0, L - TOR.m5.hCabHex - 0.3 - 0.5])).subtract(cil(TOR.m5.paso, 12, L - 2)); }
export const copaEnSitio = Q => { const L = COPA.hondo + 5; return copaRueda().rotate([-90, 0, 0]).translate([0, Q.yK - 2.3 - L, Q.zA]); };

// ---------- 6) TORRES de los amortiguadores: placa con los ojos de arriba y las rótulas de las bielas (detrás: los SOPORTES de las bielas, aparte) ----------
export const PIE_TORRE = 7; // lo que sale el pie de la torre por detrás de su placa
// el SOPORTE de la biela de atrás (el izquierdo; el derecho, su reflejo): de la cara de delante de la torre hasta la rótula, delante del eje;
// 2 tornillos M3 por detrás de la torre (rosca en el soporte) y, en la punta, la rótula (tornillo M3 × 16 por delante, rosca en el soporte)
export function soporteBielaT(Q) { const G = Q.T, x1 = G.xT[1], U = G.U0, y = U[0];
  let m = bloque(x1, G.xU - 4.5, y - 5, y + 5, U[1] - 3.3, U[1] + 6, 1.5).add(bloque(x1, x1 + 6, y - 9, y + 9, U[1] - 8, U[1] + 8, 1.5));
  [-4.5, 4.5].forEach(dz => { m = m.subtract(cilX(TOR.m3.rosca, x1 - 1, x1 + 10, y, U[1] + dz)); });
  return m.subtract(cilX(TOR.m3.rosca, G.xU - 14, G.xU, y, U[1])); }
export function torre(Q, del) { const G = del ? Q.F : Q.T, [x0, x1] = G.xT, yT = G.T[0], zT = G.T[1], zb = Q.zF1, za = Q.zA;
  const perfil = N.csUnion([rr(48, za - zb).translate([0, (za + zb) / 2]), CS().hull([rr(2 * (yT + 7), 14, 6).translate([0, zT]), rr(48, 10).translate([0, za + 2])]).add(del ? CS().hull([rr(2 * (G.U0[0] + 7), 12, 5).translate([0, G.U0[1]]), rr(48, 10).translate([0, za + 2])]) : N.csVacia())]);
  const ventana = CS().hull([circ(10).translate([-yT + 16, zT - 7]), circ(10).translate([yT - 16, zT - 7]), circ(8).translate([0, za + 16])]);
  let m = perfil.subtract(ventana).extrude(x1 - x0).rotate([90, 0, 90]).translate([x0, 0, 0]);
  m = m.add(bloque(x0 - PIE_TORRE, x1, -24, 24, zb, zb + 4, 2)); // el pie, SOLO por detrás (así la torre se imprime tumbada sobre su cara de delante): 2 M3 con tuerca por debajo del chasis
  if (!del) [1, -1].forEach(sg => { const U = G.U0, y = sg * U[0]; m = m.add(M().hull([bloque(x0, x1, y - 9, y + 9, U[1] - 8, U[1] + 8), bloque(x0, x1, sg * 20 - 4, sg * 20 + 4, za, za + 10)])); }); // la oreja donde se atornilla el SOPORTE de cada biela (pieza aparte)
  [1, -1].forEach(sg => { m = m.subtract(cilX(TOR.m3.paso, x0 - 1, x1 + 1, sg * yT, zT)); const U = G.U0; m = m.subtract(del ? cilX(TOR.m3.rosca, x0 - 1, x1 + 1, sg * U[0], U[1]) : cilX(TOR.m3.paso, x0 - 1, x1 + 1, sg * U[0], U[1] - 4.5).add(cilX(TOR.m3.paso, x0 - 1, x1 + 1, sg * U[0], U[1] + 4.5)));
    [-14, 14].forEach(y => { m = m.subtract(cilZ(TOR.m3.paso, zb - 1, zb + 5, x0 - PIE_TORRE / 2, y)); }); });
  return m; }

// ---------- 7) el CHASIS de bañera (en DOS mitades: cada una cabe en la P1P) y la placa que las une ----------
export function contornoChasis(Q) { const { WB } = Q, xr = -48, xf = WB + 62;
  const P = [[xr, 30], [xr + 6, 48], [70, 48], [92, 60], [WB - 70, 60], [WB - 40, 42], [WB + 34, 42], [xf, 26]];
  return P.concat(P.slice().reverse().map(q => [q[0], -q[1]])); }
export function orejetas(Q, G) { const L = [], [h0, h1] = G.hb; // las dos orejetas de la bisagra de cada trapecio (con su agujero M3)
  [1, -1].forEach(sg => [[G.xa + h0 - 5.2, G.xa + h0 - 0.2], [G.xa + h1 + 0.2, G.xa + h1 + 5.2]].forEach(([x0, x1]) => {
    L.push(M().hull([bloque(x0, x1, sg * G.L0[0] - 6, sg * G.L0[0] + 6, Q.zF1 - 0.01, Q.zF1 + 1), cilX(12, x0, x1, sg * G.L0[0], G.L0[1])])); })); return N.union(L); }
export function chasisEntero(Q) { const { zF0, tF } = Q; let m = conBisel(poli(contornoChasis(Q)), tF, 0.6).translate([0, 0, zF0]);
  m = m.add(orejetas(Q, Q.F)).add(orejetas(Q, Q.T));
  [1, -1].forEach(sg => { m = m.add(bloque(92, Q.WB - 70, sg * 57.5 - 1.25, sg * 57.5 + 1.25, Q.zF1 - 0.01, Q.zF1 + 14)); }); // las paredes de la bañera (le dan rigidez)
  [Q.F, Q.T].forEach(G => { const [h0, h1] = G.hb; m = m.subtract(cilX(TOR.m3.paso, G.xa + h0 - 7, G.xa + h1 + 7, G.L0[0], G.L0[1])).subtract(cilX(TOR.m3.paso, G.xa + h0 - 7, G.xa + h1 + 7, -G.L0[0], G.L0[1])); }); // los pasadores de los trapecios
  [Q.F, Q.T].forEach(G => { const x = G.xT[0] - PIE_TORRE / 2; [-14, 14].forEach(y => { m = m.subtract(cilZ(TOR.m3.paso, zF0 - 1, Q.zF1 + 0.5, x, y)); if (G.del) m = m.subtract(A.hex(TOR.m3.tuerca + 2 * PRES).extrude(2.6).translate([x, y, zF0 - 0.01])); }); }); // las torres (delante: M3 × 12 con su tuerca por debajo del chasis; detrás: M3 × 16, la tuerca en el parachoques)
  return m; }

// ---------- 8) lo que se COMPRA (gris): rueda, amortiguador, biela con sus rótulas, tornillos de los ejes ----------
export function ruedaFalsa(Q, del) { const y0 = Q.yWi, y1 = y0 + Q.A, yc = caraRueda(Q, del), x0 = del ? Q.WB : 0;
  return cilY(Q.D, y0, y1, x0, Q.zA).subtract(cilY(Q.D > 120 ? 62 : 50, y0 - 1, yc, x0, Q.zA)); } // (por dentro de la llanta —2,2": Ø50; 2,8": Ø62— hay hueco hasta la cara del hexágono)
// un cilindro a lo largo del segmento P0 → P1 (en el plano y-z, a la x dada), desde i0 después de P0 hasta i1 antes de P1
export function cilEntre(x, P0, P1, d, i0, i1) { const dy = P1[0] - P0[0], dz = P1[1] - P0[1], L = Math.hypot(dy, dz), a = Math.atan2(dz, dy) / R2;
  return cilY(d, i0, L - i1, 0, 0).rotate([a, 0, 0]).translate([x, P0[0], P0[1]]); }
const ojo = (x, P) => cilX(7, x - 3, x + 3, P[0], P[1]);
// el amortiguador entre sus dos ojos: el cuerpo con el muelle (Ø21) de 6 mm tras el ojo de abajo a 9 antes del de arriba
export const amortiguadorFalso = (x, P0, P1) => N.union([ojo(x, P0), ojo(x, P1), cilEntre(x, P0, P1, 21, 6, 9), cilEntre(x, P0, P1, 4, 2, 2)]);
// la biela de caída: varilla M3 y dos rótulas (cuerpo de Ø8 desde la bola hasta 6 mm dentro)
export const bielaFalsa = (x, P0, P1) => { const L = d2(P0, P1); return N.union([cilEntre(x, P0, P1, 3, 4, 4), cilEntre(x, P0, P1, 8, -4.5, L - 6), cilEntre(x, P0, P1, 8, L - 6, -4.5)]); };

// ---------- 9) MONTADO: cada esquina con su pose (phi: giro del trapecio · delta: giro de la dirección, delante) ----------
// grupos: 'fijo' (chasis, torres) · 'tr' (trapecio) · 'c' (la C / el portamangueta) · 'rueda' (lo que gira con la rueda) · 'comp' (se compra)
// giroRueda: lo que ha girado la rueda sobre su eje (grados): la copa, el hexágono y el tornillo-eje giran con ella (la ranura de la copa sigue al pasador del palier)
export function esquinaEnSitio(Q, del, izq, phi = 0, delta = 0, giroRueda = 0) { const G = del ? Q.F : Q.T, P = poseEsquina(G, phi), L = [], k0 = (del ? 'D' : 'T') + (izq ? 'i' : 'd');
  const enC = m => giraX(m.translate([0, P.dL[0], P.dL[1]]), P.L1[0], P.L1[1], P.psi), lado = m => izq ? m : espejoY(m), x0 = del ? Q.WB : 0;
  const pon = (k, m, g, o) => L.push(Object.assign({ k: k + k0, m: lado(m), g }, o || {})), gR = m => giroRueda ? m.translate([-x0, 0, -Q.zA]).rotate([0, giroRueda, 0]).translate([x0, 0, Q.zA]) : m;
  pon('trapecio', trapecioEnSitio(G, phi), 'tr');
  const dir = m => del ? giraZ(m, Q.WB, Q.yK, izq ? delta : -delta) : m; // (la de la derecha se dibuja como la izquierda girada al revés y luego se refleja)
  if (del) { pon('piezaC', enC(piezaC(Q)), 'c'); pon('mangueta', enC(dir(mangueta(Q))), 'c');
    pon('separador', enC(dir(gR(separadorEje(Q).rotate([-90, 0, 0]).translate([x0, SEP_EJE(Q).y0, Q.zA])))), 'rueda'); }
  else { pon('portamangueta', enC(portamanguetaT(Q)), 'c'); pon('copa', enC(gR(copaEnSitio(Q))), 'rueda'); }
  pon('hexagono', enC(dir(gR(hexEnSitio(Q, del)))), 'rueda'); pon('rueda', enC(dir(ruedaFalsa(Q, del))), 'comp');
  const yH = del ? SEP_EJE(Q).y0 - TOR.m5.hCabHex : Q.yK - 2.3 - 0.5 - TOR.m5.hCabHex; // la cabeza del tornillo-eje (delante: contra el separador; detrás: dentro de la copa)
  pon('ejeM5', enC(dir(gR(cilY(TOR.m5.cabezaHex * 1.1, yH, yH + TOR.m5.hCabHex, x0, Q.zA).add(cilY(5, yH + TOR.m5.hCabHex - 0.01, caraRueda(Q, del) + 12, x0, Q.zA))))), 'comp');
  pon('amortiguador', amortiguadorFalso(G.xS, P.S, G.T), 'comp'); pon('biela', bielaFalsa(G.xU, G.U0, P.U1), 'comp');
  return L; }
export function camionEnSitio(Q, pose = {}) { const L = [{ k: 'chasis', m: chasisEntero(Q), g: 'fijo' }, { k: 'torreD', m: torre(Q, true), g: 'fijo' }, { k: 'torreT', m: torre(Q, false), g: 'fijo' }];
  for (const del of [true, false]) for (const izq of [true, false]) L.push(...esquinaEnSitio(Q, del, izq, del ? (pose.phiF || 0) : (pose.phiT || 0), del ? (pose.delta || 0) : 0));
  return L; }
