// ================= 18-10-2026 · ⚙️ MECANISMOS QUE SE MUEVEN (y se venden) + 🔥 EXPOSITOR DE MECHEROS =================
// Ella: «más diseño para vender más… más cosas para vender en Cults, más mecanismos, más funcionalidades» · «los engranajes también, de
// una forma u otra que se engranen y se vea el movimiento».
// Tres mecanismos clásicos de demostración (se venden como juguete de escritorio y para clase de tecnología), cada uno en piezas planas
// que se imprimen sin soportes, con su vista «Montado» y su MOVIMIENTO EXACTO para la animación (r8/cat_anima.js → «⚙️ Que se mueva»):
//  · RUEDA DE GINEBRA (cruz de Malta): la rueda motriz gira sin parar y la cruz avanza a saltos (¼ de vuelta por vuelta) y se queda
//    BLOQUEADA entre salto y salto por el disco de bloqueo: es el mecanismo de los relojes y de los proyectores de cine.
//  · BIELA Y MANIVELA (pistón): la manivela gira y el pistón va y viene por su guía, como en un motor.
//  · LEVA DE CORAZÓN y su seguidor: la leva gira y el seguidor avanza y vuelve a velocidad constante (una goma lo mantiene pegado).
//  · YUGO ESCOCÉS: la manivela empuja un marco que va y viene en línea recta, exactamente como un seno.
//  · DIRECCIÓN DE COCHE: volante → piñón → cremallera, con dientes de evolvente de verdad.
// Holguras de la casa (sus Bambu): «gira» 0,15 por lado en ejes y pasadores; las piezas van separadas 0,3–0,4 en altura (arandelas).
// Comprobado en el ordenador con test/unit/mecanismos_1810.mjs: en TODA la vuelta ninguna pieza se pisa con otra.
import * as N from './nucleo.js';
import { MECHEROS } from './cat_fumar.js';
import * as G from './engranajes.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(128, Math.round(d * 1.6 + 24)));
const rr = (w, h, r = 0, x = 0, y = 0) => { const S = CS().square([Math.max(0.02, w - 2 * r), Math.max(0.02, h - 2 * r)], true); return (r > 0.05 ? S.offset(r, 'Round', 2, seg(2 * r)) : S).translate([x, y]); };
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cil = (d, z0, z1, x = 0, y = 0) => M().cylinder(z1 - z0, d / 2, d / 2, seg(d)).translate([x, y, z0]);
const circ = (d, x = 0, y = 0) => CS().circle(d / 2, seg(d)).translate([x, y]);
const P2 = pts => N.cs([N.ccw(pts)], 'Positive');
// las piezas planas, repartidas en la cama en filas de 175 mm como mucho (así caben también en la A1 mini, de 180 × 180)
// (si en 175 no caben, prueba filas más anchas, hasta los 250 de la P1P, y se queda con el reparto más recogido)
const enCama = (L, sep = 6) => { const C = L.map(m => ({ m, b: N.caja(m) }));
  const reparto = W0 => { let x = 0, y = 0, fila = 0, X = 0; const pos = C.map(c => { if (x > 0 && x + c.b.dims[0] > W0) { x = 0; y += fila + sep; fila = 0; } const o = [x - c.b.min[0], y - c.b.min[1]]; x += c.b.dims[0] + sep; X = Math.max(X, x - sep); fila = Math.max(fila, c.b.dims[1]); return o; }); return { pos, lado: Math.max(X, y + fila) }; };
  let mejor = null; for (const W0 of [175, 200, 225, 250]) { const r = reparto(Math.max(W0, ...C.map(c => c.b.dims[0]))); if (!mejor || r.lado < mejor.lado - 0.5) mejor = r; if (mejor.lado <= 175) break; }
  return N.aLaCama(N.union(C.map((c, i) => c.m.translate([mejor.pos[i][0], mejor.pos[i][1], -c.b.min[2]])))); };
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
const GI = 0.15, EJE = 6, BASE = 3, ARANDELA = 0.6;
// el nombre grabado en la base (si se puede: en las pruebas sin navegador no hay letras)
function grabaNombre(base, txt, x, y, ancho, alto) { const t = String(txt || '').trim(); if (!t) return base; try { let T = N.centraCS(N.texto2(t, 'gorda', 8)); const b = N.cajaCS(T), k = Math.min(ancho / b.w, alto / b.h, 1.4); T = T.scale([k, k]).translate([x, y]); return base.subtract(T.extrude(0.8).translate([0, 0, BASE - 0.79])); } catch (e) { return base; } }
// una pieza girada alrededor de un eje vertical que pasa por (cx, cy)
const giraZ = (m, ang, cx = 0, cy = 0) => m.translate([-cx, -cy, 0]).rotate([0, 0, ang * 180 / Math.PI]).translate([cx, cy, 0]);
// el POMO que se mete A PRESIÓN en un pasador de Ø dp (0,05 por lado, su «a presión»): 5 mm de pasador dentro, 0,3 de aire en el fondo
const PRESION = 0.05;
const pomo = (dp, x, y, z0) => M().cylinder(8, 5, 4.2, seg(10)).translate([x, y, z0]).subtract(cil(dp + 2 * PRESION, z0 - 1, z0 + 5.3, x, y));

// ======================= ✚ RUEDA DE GINEBRA (cruz de Malta) =======================
// n ranuras · a = distancia entre ejes · la cruz (radio R2 = a·cos(π/n)) · el pasador va a r1 = a·sin(π/n) del eje motriz
export function ginebraMedidas(p) {
  const nr = Math.max(4, Math.round(p.n)), dp = p.pasador, sn = Math.sin(Math.PI / nr), cs = Math.cos(Math.PI / nr), rD0 = dp / 2 + 2.2, dPed = 10;
  // el disco de la motriz (radio r1 + rD0) no puede tocar el pedestal de la cruz: si la distancia pedida no da, se agranda lo justo
  const aMin = Math.ceil((rD0 + 0.8 + dPed / 2) / (1 - sn)), a = Math.max(p.a, aMin), R2 = a * cs, r1 = a * sn, rD = r1 + rD0, hs = dp / 2 + GI;
  // el disco de bloqueo: lo más grande que deja la punta de los brazos (a la orilla de cada ranura) y el propio pasador
  const de = Math.asin(hs / R2), dPunta = Math.sqrt(a * a + R2 * R2 - 2 * a * R2 * Math.cos(Math.PI / nr - de)), Rd = Math.min(r1 * 0.75, dPunta - 3, r1 - dp / 2 - 1.5);
  const zD = BASE + ARANDELA, hD = 3.5, zG = zD + hD + 0.4, hG = 5, zT = zG + hG;
  return { nr, a, aPedida: p.a, R2, r1, dp, hs, rD, dPed, Rd, zD, hD, zG, hG, zT, alfa: Math.PI / 2 - Math.PI / nr };
}
// el ángulo de la cruz (relativo al montaje) cuando la motriz ha girado θ desde su posición de montaje (pasador al lado contrario)
export function ginebraAngulo(Q, th) {
  const g = t => { const tp = t + Math.PI, j = Math.floor(tp / (2 * Math.PI)), u = tp - (j + 0.5) * 2 * Math.PI, paso = 2 * Math.PI / Q.nr; // u en (−π, π]: 0 = el pasador apunta a la cruz
    let gg; if (u < -Q.alfa) gg = 0; else if (u > Q.alfa) gg = -paso; else { const px = Q.r1 * Math.cos(u), py = Q.r1 * Math.sin(u); let off = Math.atan2(py, px - Q.a) - Math.PI; while (off > Math.PI) off -= 2 * Math.PI; while (off <= -Math.PI) off += 2 * Math.PI; gg = off - Math.PI / Q.nr; }
    return -j * paso + gg; };
  return g(Math.PI + th) - g(Math.PI);
}
export function ginebraPiezas(p) {
  const Q = ginebraMedidas(p), { nr, a, R2, r1, dp, hs, rD, dPed, Rd, zD, hD, zG, zT } = Q, hueco = EJE + 2 * GI;
  // MOTRIZ (montada con el pasador al lado contrario de la cruz: ángulo π): disco, pasador, disco de bloqueo con su media luna y pomo
  let mot = cil(2 * rD, zD, zD + hD).add(cil(dp, zD + hD - 0.01, zT + 1.5, r1, 0));
  let bloq = circ(2 * Rd).subtract(circ(2 * (R2 + 0.7), a, 0)); // (la media luna: por ahí pasa la cruz mientras el pasador la arrastra)
  mot = mot.add(bloq.extrude(zT - zD - hD).translate([0, 0, zD + hD - 0.01])).add(cil(12, zT - 0.01, zT + 8)).subtract(cil(hueco, zD - 1, zT - 0.3));
  mot = giraZ(mot, Math.PI);
  // CRUZ: disco de radio R2 con sus ranuras (hacia π + π/n + k·2π/n) y los arcos de bloqueo (hacia π + k·2π/n), en su eje (a, 0)
  let cr = circ(2 * R2), cortes = [];
  for (let k = 0; k < nr; k++) { const ar = Math.PI + Math.PI / nr + k * 2 * Math.PI / nr, ab = Math.PI + k * 2 * Math.PI / nr, r0 = a - r1 - hs - 0.3; // (el fondo de la ranura, 0,3 más allá de donde llega el pasador)
    cortes.push(rr(R2 - r0 + 4, 2 * hs, hs).translate([r0 + (R2 - r0 + 4) / 2, 0]).rotate(ar * 180 / Math.PI));
    cortes.push(circ(2 * (Rd + 0.35), a * Math.cos(ab), a * Math.sin(ab))); }
  cr = cr.subtract(N.csUnion(cortes)).subtract(circ(hueco)).extrude(zT - zG).translate([a, 0, zG]);
  // BASE: placa con los dos ejes; el de la cruz, con su pedestal más alto
  const x0 = -(rD + 5), x1 = a + R2 + 5, H2 = Math.max(rD, R2) + 5;
  let base = rr(x1 - x0, 2 * H2, 8, (x0 + x1) / 2).extrude(BASE);
  base = base.add(cil(10, BASE - 0.01, zD)).add(cil(EJE, zD - 0.01, zT - 0.4)).add(cil(dPed, BASE - 0.01, zG, a, 0)).add(cil(EJE, zG - 0.01, zT - 0.3, a, 0));
  base = grabaNombre(base, p.txt, a / 2, -H2 + 5, Math.min(50, a), 6);
  return { Q, base, motriz: mot, cruz: cr };
}
function ginebra(p) {
  const R = ginebraPiezas(p);
  if (p.ver === 'montada') return N.union([R.base, R.motriz, R.cruz]);
  return enCama([R.base, R.motriz, R.cruz]);
}

// ======================= 🛞 BIELA Y MANIVELA (pistón) =======================
export function bielaMedidas(p) {
  const rc = p.r, L = Math.max(p.L, 2 * rc + 20), dp = 5, wp = 12, lp = 16;
  const zC = BASE + ARANDELA, hC = 4, zR = zC + hC + 2.2, hR = 3, zP = BASE + 0.3, hP = 6;
  return { rc, L, dp, wp, lp, zC, hC, zR, hR, zP, hP, xg0: L - rc - lp / 2 - 4, xg1: L + rc + lp / 2 + 4 };
}
export function bielaPose(Q, th) { // la manivela girada θ: dónde está el pasador, el ángulo de la biela y cuánto se ha movido el pistón
  const px = Q.rc * Math.cos(th), py = Q.rc * Math.sin(th), xp = px + Math.sqrt(Q.L * Q.L - py * py);
  return { px, py, xp, beta: Math.atan2(-py, xp - px), dxPiston: xp - (Q.rc + Q.L) };
}
export function bielaPiezas(p) {
  const Q = bielaMedidas(p), { rc, L, dp, wp, lp, zC, hC, zR, hR, zP, hP, xg0, xg1 } = Q, hueco = EJE + 2 * GI, hp = dp + 2 * GI;
  // MANIVELA (montada con el pasador en +x): disco y pasador alto; el POMO va aparte y entra a presión en el pasador cuando la biela
  // ya está puesta (18-10: pegado al pasador era más ancho que el agujero de la biela y la biela no se podía meter)
  const man = cil(2 * rc + 12, zC, zC + hC).add(cil(dp, zC + hC - 0.01, zR + hR + 6, rc, 0)).subtract(cil(hueco, zC - 1, zC + hC - 0.6));
  const pom = pomo(dp, rc, 0, zR + hR + 1);
  // BIELA: de pasador a pasador
  const biela = rr(L + 11, 11, 5.5, rc + L / 2, 0).subtract(circ(hp, rc, 0)).subtract(circ(hp, rc + L, 0)).extrude(hR).translate([0, 0, zR]);
  // PISTÓN: el bloque que corre por la guía y su pasador
  const pis = cubo(rc + L - lp / 2, rc + L + lp / 2, -wp / 2, wp / 2, zP, zP + hP).add(cil(dp, zP + hP - 0.01, zR + hR + 1.5, rc + L, 0));
  // BASE: placa, eje de la manivela y la GUÍA (dos carriles); por debajo de la biela
  const yR = wp / 2 + GI + 2.5 / 2 + 0.05, W = 2 * Math.max(rc + 10, wp / 2 + 10);
  let base = rr(xg1 + 6 + rc + 10, W, 8, (xg1 + 6 - (rc + 10)) / 2).extrude(BASE);
  base = base.add(cil(10, BASE - 0.01, zC)).add(cil(EJE, zC - 0.01, zC + hC - 0.9));
  [-1, 1].forEach(k => { base = base.add(cubo(xg0, xg1, k * yR - 1.25, k * yR + 1.25, BASE - 0.01, zR - 0.4)); });
  base = grabaNombre(base, p.txt, (xg0 + xg1) / 2, -W / 2 + 6, 46, 7);
  return { Q, base, manivela: man, biela, piston: pis, pomo: pom };
}
function biela(p) {
  const R = bielaPiezas(p), L = [R.base, R.manivela, R.biela, R.piston, R.pomo];
  return p.ver === 'montada' ? N.union(L) : enCama(L);
}

// ======================= ↔️ YUGO ESCOCÉS =======================
// La manivela gira y su pasador corre por la ranura de un marco que solo puede ir y venir en línea recta: el marco se mueve
// EXACTAMENTE como un seno (x = r·cos θ), sin biela. Es el mecanismo de las bombas y de las válvulas de los barcos.
export function yugoMedidas(p) {
  const rc = p.r, dp = 5, hs = dp / 2 + GI, fw = hs + 3.5, wr = 8, Lv = 2 * rc + 12;
  const zC = BASE + ARANDELA, hC = 4, zY = zC + hC + 0.6, hY = 4;
  const xg0 = rc + fw + 1, xg1 = rc + fw + Lv + 2, W = 2 * (rc + 10);
  return { rc, dp, hs, fw, wr, Lv, zC, hC, zY, hY, xg0, xg1, W, alto: rc + hs + 3.5 };
}
export function yugoPiezas(p) {
  const Q = yugoMedidas(p), { rc, dp, hs, fw, wr, Lv, zC, hC, zY, hY, xg0, xg1, W, alto } = Q, hueco = EJE + 2 * GI;
  // MANIVELA (pasador en +x) y su pomo a presión (el pomo, además, no deja que el marco se salga hacia arriba)
  const man = cil(2 * rc + 12, zC, zC + hC).add(cil(dp, zC + hC - 0.01, zY + hY + 6, rc, 0)).subtract(cil(hueco, zC - 1, zC + hC - 0.6));
  const pom = pomo(dp, rc, 0, zY + hY + 1);
  // el MARCO (centrado en el pasador: x = rc) con su ranura a lo largo de y, y las dos varillas que corren por las guías
  const sl = rc + hs + 0.3; // (media ranura: el pasador llega a ±rc)
  let yugo = rr(2 * fw, 2 * alto, 3, rc, 0).add(rr(2 * (fw + Lv), wr, 2, rc, 0)).subtract(rr(2 * hs, 2 * sl, hs, rc, 0)).extrude(hY).translate([0, 0, zY]);
  // BASE: eje de la manivela y CUATRO carriles (dos a cada lado), por fuera de donde llega el marco
  const yR = wr / 2 + GI + 1.25;
  let base = rr(2 * (xg1 + 6), W, 8).extrude(BASE);
  base = base.add(cil(10, BASE - 0.01, zC)).add(cil(EJE, zC - 0.01, zC + hC - 0.9));
  [-1, 1].forEach(s => [-1, 1].forEach(k => { const a = s * xg0, b = s * xg1; base = base.add(cubo(Math.min(a, b), Math.max(a, b), k * yR - 1.25, k * yR + 1.25, BASE - 0.01, zY + hY - 0.6)); }));
  base = grabaNombre(base, p.txt, (xg0 + xg1) / 2, -W / 2 + 5, Math.min(44, xg1 - xg0 - 4), 6);
  return { Q, base, manivela: man, yugo, pomo: pom };
}
function yugo(p) {
  const R = yugoPiezas(p), L = [R.base, R.manivela, R.yugo, R.pomo];
  return p.ver === 'montada' ? N.union(L) : enCama(L);
}

// ======================= 🚗 DIRECCIÓN DE COCHE: volante, piñón y cremallera =======================
// Giras el volante, el piñón engrana con la cremallera y la cremallera va de lado a lado: lo que mueve las ruedas de un coche.
// Dientes de evolvente de verdad (r8/engranajes.js) con 0,15 de juego en cada pieza; con menos de 17 dientes el piñón lleva
// desplazamiento de perfil (si no, la punta de la cremallera se comería el pie del diente).
export function direccionMedidas(p) {
  const m = p.m, z = Math.max(12, Math.round(p.z)), x = z < 17 ? (17 - z) / 17 : 0, n = 2 * Math.floor(Math.max(9, Math.round(p.n)) / 2) + 1, b = 6, fondo = 6;
  const r = m * z / 2, ra = r + m * (1 + x), yc = r + x * m, ha = m, hf = 1.25 * m, paso = Math.PI * m, L = n * paso;
  const zR = BASE + 0.3, zG = BASE + ARANDELA, hCol = 7, zH = zG + b + hCol, hHex = 4.2, Rv = Math.max(ra + 5, 22);
  const yT = ha + GI + 2.5, xF = Math.sqrt(Math.max(0, ra * ra - (yc - yT) ** 2)) + 2.5, Lb = L + 12;
  const recorrido = Math.max(4, Math.min(L / 2 - xF - 5, L / 2 - ra - 2)), A = 0.92 * recorrido / r; // (lo que se mueve a cada lado sin salirse de sus guías)
  return { m, z, x, n, b, fondo, r, ra, yc, ha, hf, paso, L, zR, zG, hCol, zH, hHex, Rv, yT, xF, Lb, recorrido, A };
}
export function direccionPiezas(p) {
  const Q = direccionMedidas(p), { m, z, x, n, b, fondo, r, yc, ha, hf, zR, zG, hCol, zH, hHex, Rv, yT, xF, Lb } = Q, hueco = EJE + 2 * GI;
  const gp = { por: 'modulo', m, z, alfa: 20, juego: 0.15, x, b, eje: 0 };
  // PIÑÓN: el engranaje (girado para que mire a la cremallera con un HUECO, donde ella tiene un diente), columna y hexágono para el volante
  let pin = G.engranaje(gp).m.rotate([0, 0, -90 - 180 / z]).translate([0, 0, zG]);
  pin = pin.add(cil(10, zG + b - 0.01, zH)).add(M().cylinder(hHex, 3 / Math.cos(Math.PI / 6), 3 / Math.cos(Math.PI / 6), 6).translate([0, 0, zH - 0.01])).subtract(cil(hueco, zG - 1, zH - 0.6)).translate([0, yc, 0]);
  // VOLANTE: aro, tres radios y el cubo con el hexágono (6 entre caras + 0,05 por lado: entra a presión y arrastra el piñón)
  const hexA = N.cs([N.poligono2(6, (6 + 2 * PRESION) / Math.cos(Math.PI / 6), 0)], 'Positive');
  let vol2 = circ(2 * Rv).subtract(circ(2 * Rv - 7)).add(circ(16)); for (let i = 0; i < 3; i++) vol2 = vol2.add(rr(Rv - 2, 5, 2, (Rv - 2) / 2).rotate(90 + i * 120));
  const vol = vol2.subtract(hexA).extrude(4).translate([0, yc, zH + 0.2]); // (se apoya en la columna)
  // CREMALLERA: dientes hacia el piñón, línea primitiva en y = 0; con n impar tiene un diente justo en el centro
  const cre = G.cremallera({ por: 'modulo', m, alfa: 20, n, b, fondo, juego: 0.15 }).m.translate([0, 0, zR]);
  // BASE: el pie del piñón, una guía por detrás de la cremallera (entera) y dos por delante (en los extremos, lejos del piñón)
  const yB = -hf - fondo - GI, y0 = yB - 2.5 - 5, y1 = yc + 12;
  let base = rr(Lb, y1 - y0, 6, 0, (y0 + y1) / 2).extrude(BASE);
  base = base.add(cil(10, BASE - 0.01, zG, 0, yc)).add(cil(EJE, zG - 0.01, zH - 0.9, 0, yc));
  base = base.add(cubo(-Lb / 2 + 1, Lb / 2 - 1, yB - 2.5, yB, BASE - 0.01, zR + b - 0.5));
  [-1, 1].forEach(s => { const a = s * xF, c = s * (Lb / 2 - 1); base = base.add(cubo(Math.min(a, c), Math.max(a, c), yT - 2.5, yT, BASE - 0.01, zR + b - 0.5)); });
  base = grabaNombre(base, p.txt, -(xF + Lb / 2) / 2, (yT + y1) / 2, Math.max(10, Lb / 2 - xF - 8), Math.min(7, y1 - yT - 4));
  return { Q, base, pinon: pin, volante: vol, cremallera: cre };
}
function direccion(p) {
  const R = direccionPiezas(p), L = [R.base, R.pinon, R.cremallera, R.volante];
  return p.ver === 'montada' ? N.union(L) : enCama(L);
}

// ======================= ❤️ LEVA DE CORAZÓN y su seguidor =======================
export function levaMedidas(p) { const r0 = p.r0, h = p.carrera, zL = BASE + ARANDELA, hL = 6, zS = BASE + 0.3, hS = 6; return { r0, h, zL, hL, zS, hS, xg0: r0 + h + 6, Ls: 46 }; }
export const radioLeva = (Q, fi) => { let f = ((fi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); if (f > Math.PI) f = 2 * Math.PI - f; return Q.r0 + Q.h * f / Math.PI; }; // (sube y baja a velocidad constante: el corazón)
// el seguidor tiene la punta REDONDA (radio RHO): dónde queda el centro de la punta cuando la leva ha girado θ, lo justo para tocarla
// sin entrar en ella (en las cuestas la toca un poco de lado, no justo enfrente: por eso no basta con el radio de la leva)
const RHO = 1.5;
export function levaX(Q, th) { let x = -1e9; const lim = Math.asin(Math.min(1, RHO / Q.r0)); for (let i = -120; i <= 120; i++) { const fi = i / 120 * lim, rc = radioLeva(Q, fi - th), y = rc * Math.sin(fi); if (Math.abs(y) <= RHO) x = Math.max(x, rc * Math.cos(fi) + Math.sqrt(RHO * RHO - y * y)); } return x; }
export function levaPiezas(p) {
  const Q = levaMedidas(p), { r0, h, zL, hL, zS, hS, xg0, Ls } = Q, hueco = EJE + 2 * GI, ws = 8;
  const pts = []; for (let i = 0; i < 240; i++) { const f = i / 240 * 2 * Math.PI, r = radioLeva(Q, f); pts.push([r * Math.cos(f), r * Math.sin(f)]); }
  const leva = P2(pts).subtract(circ(hueco)).extrude(hL).translate([0, 0, zL]).add(cil(6, zL + hL - 0.01, zL + hL + 10, -(r0 - 4), 0)); // (con su mango para girarla)
  // el SEGUIDOR (montado tocando la leva en +x, a 0,1 mm): punta redondeada de radio 1,5 y su pivote para la goma al otro extremo
  const xc = levaX(Q, 0) + 0.1, seg2 = M().hull([cil(2 * RHO, zS, zS + hS, xc, 0), cubo(xc + 4.5, xc + Ls - 1.5, -ws / 2, ws / 2, zS, zS + hS)]).add(cil(4, zS + hS - 0.01, zS + hS + 6, xc + Ls - 5.5, 0));
  // BASE: eje de la leva, guía de dos carriles y dos postes para la goma (la goma tira del seguidor hacia la leva)
  const yR = ws / 2 + GI + 1.25 + 0.05, xg1 = xg0 + 30, W = 2 * Math.max(r0 + h + 6, 22);
  let base = rr(xg1 + 24 + r0 + h + 6, W, 8, (xg1 + 24 - (r0 + h + 6)) / 2).extrude(BASE);
  base = base.add(cil(10, BASE - 0.01, zL)).add(cil(EJE, zL - 0.01, zL + hL - 0.4));
  [-1, 1].forEach(k => { base = base.add(cubo(xg0, xg1, k * yR - 1.25, k * yR + 1.25, BASE - 0.01, zS + hS - 0.6)).add(cil(5, BASE - 0.01, zS + hS + 6, xg0 - 2, k * (yR + 8))); });
  base = grabaNombre(base, p.txt, xg0 + 18, -W / 2 + 6, 40, 7);
  return { Q, base, leva, seguidor: seg2 };
}
function leva(p) {
  const R = levaPiezas(p);
  if (p.ver === 'montada') return N.union([R.base, R.leva, R.seguidor]);
  return enCama([R.base, R.leva, R.seguidor]);
}

// ======================= 🔥 EXPOSITOR DE MECHEROS (para el mostrador) =======================
export function expositor(p) {
  const B = MECHEROS[p.modelo] || MECHEROS.bicMaxi, c = 0.5, w = B.w + 2 * c, g = B.g + 2 * c, filas = Math.round(p.filas), cols = Math.max(1, Math.min(8, Math.round(p.porFila))), sep = 4, prof = Math.min(28, B.h * 0.38);
  const paso = w + sep, ancho = cols * paso + sep + 4, fondoFila = g + 10, alto0 = prof + 4, subida = 14;
  let m = null;
  for (let f = 0; f < filas; f++) { const y0 = f * fondoFila, z1 = alto0 + f * subida; const bloque = rr(ancho, fondoFila + 0.02, 0).extrude(z1).translate([0, y0 + fondoFila / 2, 0]); m = m ? m.add(bloque) : bloque;
    for (let i = 0; i < cols; i++) { const x = -ancho / 2 + sep + 2 + paso * i + w / 2, hue = rr(w, g, Math.min(B.r, g / 2 - 0.2) + c).extrude(prof + 1).rotate([-10, 0, 0]).translate([x, y0 + fondoFila / 2 - 1, z1 - prof]); m = m.subtract(hue); } }
  // el letrero de delante, grabado
  const t = String(p.txt || '').trim(); if (t) { try { let T = N.centraCS(N.texto2(t, 'gorda', 8)); const b = N.cajaCS(T), k = Math.min((ancho - 10) / b.w, (alto0 - 8) / b.h); T = T.scale([k, k]); m = m.subtract(T.extrude(1.4).rotate([90, 0, 0]).translate([0, 0.7, alto0 / 2])); } catch (e) { } }
  return m;
}

// ======================= el catálogo =======================
const VER = s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir (piezas planas)'], ['montada', 'Montado']]);
export const DISENOS_1810 = {
  ruedaGinebra: { cat: 'mecanica', tambien: ['ciencia', 'oficina', 'juegos'], e: '✚', t: 'Rueda de Ginebra (cruz de Malta)', d: 'La rueda gira sin parar y la cruz avanza a saltos y se queda bloqueada: el mecanismo de los relojes y del cine', uso: 'encaje', color: '#3a86ff', nuevo: true,
    campos: [n('n', 'Ranuras de la cruz', 4, 4, 8, 1, ''), n('a', 'Distancia entre ejes', 40, 30, 60, 1), n('pasador', 'Pasador', 5, 4, 8, 0.5), tx('txt', 'Nombre en la base', ''), VER],
    gen: p => ginebra(p),
    nota: p => { const Q = ginebraMedidas(p); return 'Por cada vuelta de la rueda motriz, la cruz da 1/' + Q.nr + ' de vuelta y se queda BLOQUEADA el resto de la vuelta. ' + (Q.a > Q.aPedida ? 'He separado los ejes a ' + Q.a + ' mm (con ' + n1(Q.aPedida) + ' el disco de la rueda tocaba el pie de la cruz). ' : '') + 'Cruz de Ø' + n1(2 * Q.R2) + ' y pasador a ' + n1(Q.r1) + ' mm del eje. Ejes de Ø' + EJE + ' impresos en la base; las piezas giran con 0,15 mm de holgura por lado. 3 piezas planas, sin soportes. Comprobado montado: en toda la vuelta no se pisa nada.'; } },
  bielaManivela: { cat: 'mecanica', tambien: ['ciencia', 'oficina', 'rc'], e: '🛞', t: 'Biela y manivela (el pistón de un motor)', d: 'Gira la manivela y el pistón va y viene por su guía, como dentro de un motor', uso: 'encaje', color: '#ff6a13', nuevo: true,
    campos: [n('r', 'Radio de la manivela', 15, 10, 25, 1), n('L', 'Largo de la biela', 50, 40, 90, 1), tx('txt', 'Nombre en la base', ''), VER],
    gen: p => biela(p),
    nota: p => { const Q = bielaMedidas(p); return 'Carrera del pistón: ' + n1(2 * Q.rc) + ' mm (el doble del radio de la manivela). Biela de ' + n1(Q.L) + ' mm entre ejes. 5 piezas planas, sin soportes; pasadores de Ø5 con 0,15 de holgura. Montaje: manivela, biela y pistón en sus pasadores y, al final, el pomo A PRESIÓN en el pasador de la manivela. Comprobado montado: en toda la vuelta no se pisa nada.'; } },
  levaCorazon: { cat: 'mecanica', tambien: ['ciencia', 'oficina'], e: '❤️', t: 'Leva de corazón y seguidor', d: 'La leva gira y el seguidor avanza y vuelve a velocidad constante; una goma lo mantiene pegado', uso: 'encaje', color: '#c8102e', nuevo: true,
    campos: [n('r0', 'Radio pequeño de la leva', 12, 8, 20, 0.5), n('carrera', 'Carrera (lo que se mueve el seguidor)', 12, 6, 20, 0.5), tx('txt', 'Nombre en la base', ''), VER],
    gen: p => leva(p),
    nota: p => { const Q = levaMedidas(p); return 'El seguidor se mueve ' + n1(Q.h) + ' mm a velocidad constante (la forma de corazón): media vuelta va, media vuelta vuelve. Pon una goma elástica del pivote del seguidor a los dos postes de la base: así se queda pegado a la leva. 3 piezas planas, sin soportes.'; } },
  yugoEscoces: { cat: 'mecanica', tambien: ['ciencia', 'oficina'], e: '↔️', t: 'Yugo escocés (vaivén perfecto)', d: 'Gira la manivela y el marco va y viene en línea recta, suave como una ola: el de las bombas de agua', uso: 'encaje', color: '#2a9d8f', nuevo: true,
    campos: [n('r', 'Radio de la manivela', 12, 8, 20, 1), tx('txt', 'Nombre en la base', ''), VER],
    gen: p => yugo(p),
    nota: p => { const Q = yugoMedidas(p); return 'El marco recorre ' + n1(2 * Q.rc) + ' mm (el doble del radio) y se mueve EXACTAMENTE como un seno: rápido en el centro y frenando en los extremos, sin biela. 4 piezas planas, sin soportes. Montaje: manivela en su eje, el marco encima con el pasador en su ranura y el pomo a presión en el pasador (sujeta el marco). Comprobado montado: en toda la vuelta no se pisa nada.'; } },
  direccionCoche: { cat: 'mecanica', tambien: ['ciencia', 'rc', 'juegos', 'oficina'], e: '🚗', t: 'Dirección de coche: volante, piñón y cremallera', d: 'Giras el volante y la cremallera va de lado a lado: lo que mueve las ruedas de un coche', uso: 'encaje', color: '#e63946', nuevo: true,
    campos: [n('m', 'Tamaño del diente (módulo)', 2, 1.5, 2.5, 0.25), n('z', 'Dientes del piñón', 16, 12, 22, 1, ''), n('n', 'Dientes de la cremallera', 19, 11, 25, 2, ''), tx('txt', 'Nombre en la base', ''), VER],
    gen: p => direccion(p),
    nota: p => { const Q = direccionMedidas(p); return 'Por cada vuelta del volante la cremallera avanza ' + n1(2 * Math.PI * Q.r) + ' mm. Va ' + n1(Q.recorrido) + ' mm a cada lado sin salirse de sus guías (el volante gira ' + Math.round(Q.recorrido / Q.r * 180 / Math.PI) + '° a cada lado). Piñón de ' + Q.z + ' dientes' + (Q.x ? ' con desplazamiento de perfil ' + n1(Q.x) + ' (con tan pocos dientes, para que no se coman)' : '') + ' y cremallera de ' + Q.n + ', dientes de evolvente con 0,15 mm de juego. El volante entra A PRESIÓN en el hexágono del piñón. 4 piezas planas, sin soportes.' + (Q.Lb > 175 ? ' OJO: la base mide ' + Math.round(Q.Lb) + ' mm: en la A1 mini no cabe (en la P1P sí).' : ''); } },
  expositorMecheros: { cat: 'jovenes', tambien: ['empresas', 'adultos'], e: '🔥', t: 'Expositor de mecheros para el mostrador', d: 'Filas en escalera, cada hueco a la medida de su mechero (BIC o Clipper) y con letrero', uso: 'deco', color: '#1b1b1d', nuevo: true,
    campos: [s('modelo', 'Mechero', 'bicMaxi', Object.entries(MECHEROS).filter(([k]) => k !== 'medida').map(([k, B]) => [k, B.t])), n('filas', 'Filas', 2, 1, 3, 1, ''), n('porFila', 'Mecheros por fila', 6, 3, 8, 1, ''), tx('txt', 'Letrero', 'MECHEROS')],
    gen: p => expositor(p),
    nota: p => { const B = MECHEROS[p.modelo] || MECHEROS.bicMaxi; return Math.round(p.filas) * Math.round(p.porFila) + ' ' + B.t + ', con 0,5 mm de aire por lado e inclinados 10° hacia atrás (se ven mejor y no se caen). Se imprime tal cual, sin soportes.'; } }
};

// ======================= las piezas montadas, con su MOVIMIENTO EXACTO (para «⚙️ Que se mueva») =======================
// → [{ m, mov }] · mov.f(s) = la matriz (16 números) de la pieza cuando la manivela/motriz/leva ha girado W·s vueltas
const W = 0.25, rotZ = (ang, cx = 0, cy = 0) => { const c = Math.cos(ang), sn = Math.sin(ang); return [c, sn, 0, 0, -sn, c, 0, 0, 0, 0, 1, 0, cx - c * cx + sn * cy, cy - sn * cx - c * cy, 0, 1]; };
const traslada = (x, y = 0, z = 0) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const mult = (A, B) => { const C = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) C[j * 4 + i] += A[k * 4 + i] * B[j * 4 + k]; return C; }; // (columnas, como three.js)
export function montadas1810(k, p) {
  const th = sv => 2 * Math.PI * W * sv;
  if (k === 'ruedaGinebra') { const R = ginebraPiezas(p), Q = R.Q; return [{ m: R.base, nombre: 'base' }, { m: R.motriz, nombre: 'rueda motriz', mov: { f: sv => rotZ(th(sv)) }, que: 'la rueda motriz gira sin parar' }, { m: R.cruz, nombre: 'cruz', mov: { f: sv => rotZ(ginebraAngulo(Q, th(sv)), Q.a, 0) }, que: 'la cruz avanza 1/' + Q.nr + ' de vuelta de golpe y se queda BLOQUEADA hasta la vuelta siguiente' }]; }
  if (k === 'bielaManivela') { const R = bielaPiezas(p), Q = R.Q, p0 = [Q.rc, 0];
    return [{ m: R.base, nombre: 'base' }, { m: R.manivela, nombre: 'manivela', mov: { f: sv => rotZ(th(sv)) }, que: 'la manivela gira' }, { m: R.pomo, nombre: 'pomo', mov: { f: sv => rotZ(th(sv)) } },
      { m: R.biela, nombre: 'biela', mov: { f: sv => { const P = bielaPose(Q, th(sv)); return mult(traslada(P.px - p0[0], P.py - p0[1]), rotZ(P.beta, p0[0], p0[1])); } } },
      { m: R.piston, nombre: 'pistón', mov: { f: sv => traslada(bielaPose(Q, th(sv)).dxPiston) }, que: 'la biela empuja el pistón, que va y viene ' + n1(2 * Q.rc) + ' mm por su guía, como en un motor' }]; }
  if (k === 'yugoEscoces') { const R = yugoPiezas(p), Q = R.Q, gira = { f: sv => rotZ(th(sv)) };
    return [{ m: R.base, nombre: 'base' }, { m: R.manivela, nombre: 'manivela', mov: gira, que: 'la manivela gira' }, { m: R.pomo, nombre: 'pomo', mov: gira },
      { m: R.yugo, nombre: 'marco', mov: { f: sv => traslada(Q.rc * Math.cos(th(sv)) - Q.rc) }, que: 'el marco va y viene ' + n1(2 * Q.rc) + ' mm en línea recta (un seno perfecto)' }]; }
  if (k === 'direccionCoche') { const R = direccionPiezas(p), Q = R.Q, ang = sv => Q.A * Math.sin(th(sv)), gira = { f: sv => rotZ(ang(sv), 0, Q.yc) };
    return [{ m: R.base, nombre: 'base' }, { m: R.pinon, nombre: 'piñón', mov: gira, que: 'el volante y el piñón giran a un lado y al otro' }, { m: R.volante, nombre: 'volante', mov: gira },
      { m: R.cremallera, nombre: 'cremallera', mov: { f: sv => traslada(Q.r * ang(sv)) }, que: 'la cremallera va de lado a lado ' + n1(Q.r * Q.A) + ' mm (lo que gira el piñón por su radio)' }]; }
  if (k === 'levaCorazon') { const R = levaPiezas(p), Q = R.Q;
    return [{ m: R.base, nombre: 'base' }, { m: R.leva, nombre: 'leva', mov: { f: sv => rotZ(th(sv)) }, que: 'la leva de corazón gira' }, { m: R.seguidor, nombre: 'seguidor', mov: { f: sv => traslada(levaX(Q, th(sv)) - levaX(Q, 0)) }, que: 'el seguidor avanza y vuelve ' + n1(Q.h) + ' mm a velocidad constante' }]; }
  return null;
}
