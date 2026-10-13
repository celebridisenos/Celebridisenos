// ================= 13-10-2026 · ⚙️ MECANISMOS DE PRECISIÓN: TRINQUETES y ACOPLAMIENTOS =================
// La dueña: «piensa que se harán trinquetes y mecanismos de carcasa también y tiene que ser preciso» y «piezas de corte y
// acoplamiento». Diseño propio, con TUS holguras (0,05 a presión · 0,10 encaja · 0,15 gira) y montaje virtual MEDIDO.
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';

const RAD = Math.PI / 180, f = (x, d = 2) => x == null || !isFinite(x) ? '—' : Number(x).toLocaleString('es-ES', { maximumFractionDigits: d });
const C2 = () => N.CSX();
const cil = (d, h, z = 0) => N.forma3d('cilindro', { d, h }).translate([0, 0, z]);
const volCruce = (a, b) => { try { const v = a.intersect(b).volume(); return v > 0 ? v : 0; } catch (e) { return 0; } };
// agujero para un eje: redondo, en D (con su plano) o hexagonal (entre caras); en 2D
export function hueco2(forma, d, plano) {
  if (!(d > 0)) return null; let s;
  if (forma === 'hex') s = N.cs([N.poligono2(6, d / Math.cos(Math.PI / 6), 0)], 'Positive');
  else if (forma === 'cuadrado') s = C2().square([d, d], true);
  else { s = C2().circle(d / 2, Math.max(48, Math.round(d * 6))); if (forma === 'd' && plano > 0 && plano < d) s = s.subtract(C2().square([d, d]).translate([plano - d / 2, -d / 2])); }
  return s;
}

// ---------- 🔒 TRINQUETE: rueda de dientes de sierra + uñeta con su muelle impreso + placa base ----------
// p = { z, D (Ø exterior), h (alto del diente), b (grosor), eje, ejeForma, plano, L (largo de la uñeta), sentido: 'horario'|'antihorario', placa: bool }
// La rueda gira LIBRE en un sentido y la uñeta la BLOQUEA en el otro. Cuentas (contacto en la cara recta del diente, sobre el eje X):
//  · la fuerza del diente sobre la uñeta va por la tangente (+Y). Para que esa fuerza METE la uñeta en el diente (se engancha sola), el
//    eje de la uñeta tiene que quedar más ARRIBA y más FUERA que la punta (r = punta − eje con rx·ry > 0) → la uñeta sale inclinada
//    un ángulo β hacia fuera de la tangente;
//  · y el cuerpo de la uñeta tiene que pasar POR ENCIMA de la rampa del diente siguiente: β se sube de 4 en 4° hasta que, MEDIDO, no
//    roza (y ni la uñeta ni su eje tocan la rueda);
//  · el muelle es un brazo de 1 mm que sale de la uñeta hacia fuera y apoya en un tope de la placa por el lado del eje: así su
//    fuerza gira la uñeta hacia la rueda (también comprobado con la cuenta del giro). Precarga: 0,6 mm.
export function trinquete(p) {
  const z = Math.round(p.z), Ra = p.D / 2, h = Math.min(p.h, Ra * 0.35), Rf = Ra - h, b = p.b, paso = 2 * Math.PI / z, g = ENCAJES.gira, pres = ENCAJES.presion;
  const avisos = [], err = t => avisos.push({ n: 'error', t }), avi = t => avisos.push({ n: 'aviso', t }), ok = t => avisos.push({ n: 'ok', t });
  if (z < 6) err('Con menos de 6 dientes no hace de trinquete.');
  if (h < 1.2) avi('Dientes de ' + f(h) + ' mm: muy bajos para imprimir con boquilla de 0,4 (mejor 1,5 o más). Agarran poco.');
  const rampa = Math.atan(h / (Ra * paso)) / RAD; if (rampa > 45) avi('Rampa muy empinada (' + Math.round(rampa) + '°): la uñeta saltará a golpes. Pon menos dientes o más bajos.');
  // la rueda: rampa que sube de la raíz a la punta y cara RECTA (radial) que cae; punta con un pequeño plano (0,08 del paso)
  const o = [], pl = 0.08 * paso, nR = 10;
  for (let i = 0; i < z; i++) { const t0 = i * paso; for (let k = 0; k <= nR; k++) { const u = k / nR, a = t0 + u * (paso - pl), r = Rf + (Ra - Rf) * u; o.push([r * Math.cos(a), r * Math.sin(a)]); } o.push([Ra * Math.cos(t0 + paso), Ra * Math.sin(t0 + paso)]); }
  let rueda2 = N.cs([N.ccw(o)], 'Positive'); const ag = hueco2(p.ejeForma || 'redondo', (p.eje || 0) + 2 * pres, (p.plano || 0) + pres); if (ag) rueda2 = rueda2.subtract(ag);
  if (p.eje > 0 && Rf - (p.eje / 2) < 2) err('El agujero del eje (Ø ' + f(p.eje) + ') casi llega a los dientes: quedan ' + f(Rf - p.eje / 2) + ' mm (mínimo 2).');
  const pivRueda = !(p.eje > 0) ? Math.max(3, 2 * Rf * 0.3) : 0; if (pivRueda) rueda2 = rueda2.subtract(C2().circle(pivRueda / 2 + g, 48));
  const ruedaM = rueda2.extrude(b);
  // la uñeta, con la punta en el hueco de encima de la cara recta (de la raíz + 0,3 hasta pasada la punta del diente)
  const L0 = Math.max(p.L || 0, 3 * h + 10), w = Math.max(3.2, Math.min(7, 0.3 * L0)), y0 = 0.12, Ti = [Rf + 0.3, y0], To = [Ra + 0.8, y0];
  const dPin = Math.max(2.5, Math.min(5, w - 1)), rPiv = dPin / 2 + g + 1.8;
  let beta = Math.max(16, rampa + 6), una2 = null, P = null, nO = null, dir = null, L = L0, rueda2D = rueda2;
  for (let intento = 0; intento < 12; intento++, beta += 4) {
    dir = [Math.sin(beta * RAD), Math.cos(beta * RAD)]; nO = [Math.cos(beta * RAD), -Math.sin(beta * RAD)]; // nO: perpendicular, hacia fuera
    L = L0; P = [Ti[0] + w / 2 * nO[0] + dir[0] * L, y0 + dir[1] * L];
    while (Math.hypot(P[0], P[1]) < Ra + rPiv + 1 && L < 6 * L0) { L += 1; P = [Ti[0] + w / 2 * nO[0] + dir[0] * L, y0 + dir[1] * L]; } // el eje de la uñeta, fuera de la rueda
    const cuerpo = N.cs([N.ccw([Ti, To, [P[0] + nO[0] * rPiv, P[1] + nO[1] * rPiv], [P[0] - nO[0] * rPiv, P[1] - nO[1] * rPiv]])], 'Positive').add(C2().circle(rPiv, 48).translate(P));
    if (cuerpo.intersect(rueda2D).area() <= 0.01) { una2 = cuerpo; break; }
  }
  if (!una2) { err('No encuentro una posición de la uñeta que no roce la rueda (dientes demasiado empinados). Pon menos dientes o más bajos.'); return { avisos, choques: [], partes: {}, cuentas: {} }; }
  // el muelle: brazo de 1 mm desde el borde de fuera de la uñeta (a media altura), hacia fuera; su tope en la placa, por el lado del eje
  const grueso = 1.0, brazoL = Math.max(9, 0.6 * L), B = [Ti[0] + w / 2 * nO[0] + dir[0] * L * 0.45 + nO[0] * w / 2, y0 + dir[1] * L * 0.45 + nO[1] * w / 2];
  const brazo = N.cs([N.ccw([B, [B[0] + nO[0] * brazoL, B[1] + nO[1] * brazoL], [B[0] + nO[0] * brazoL + dir[0] * grueso, B[1] + nO[1] * brazoL + dir[1] * grueso], [B[0] + dir[0] * grueso, B[1] + dir[1] * grueso]])], 'Positive');
  const E = [B[0] + nO[0] * (brazoL - 1.2) + dir[0] * grueso / 2, B[1] + nO[1] * (brazoL - 1.2) + dir[1] * grueso / 2], rTope = 1.6, pre = 0.6;
  const tope = [E[0] + dir[0] * (grueso / 2 + rTope - pre), E[1] + dir[1] * (grueso / 2 + rTope - pre)];
  una2 = una2.add(brazo).subtract(C2().circle(dPin / 2 + g, 32).translate(P));
  let una = una2.extrude(b), rueda = ruedaM, placa = null;
  if (p.placa !== false) {
    placa = N.MF().hull([cil(2 * Ra + 6, 2.4, -2.4), cil(2 * rPiv + 6, 2.4, -2.4).translate([P[0], P[1], 0]), cil(2 * rTope + 5, 2.4, -2.4).translate([tope[0], tope[1], 0])]);
    placa = placa.add(cil(dPin, b + 0.6, -0.01).translate([P[0], P[1], 0])).add(cil(2 * rTope, b + 0.6, -0.01).translate([tope[0], tope[1], 0]));
    placa = pivRueda ? placa.add(cil(pivRueda, b + 0.6, -0.01)) : placa.subtract(cil(p.eje + 2 * g, 10, -5));
  }
  // montaje virtual (medido)
  const topeM = cil(2 * rTope, b + 1, -0.5).translate([tope[0], tope[1], 0]);
  const choqueRU = volCruce(rueda, una), choqueRP = placa ? volCruce(rueda, placa) : 0, choqueUP = placa ? volCruce(una, placa.subtract(topeM)) : 0, precarga = placa ? volCruce(una, topeM) : 0;
  const agarre = (Ra - Ti[0]) / h;
  const choques = [{ t: 'Uñeta con la rueda (en su sitio, enganchada)', vol: choqueRU }, ...(placa ? [{ t: 'Rueda con la placa y sus pivotes', vol: choqueRP }, { t: 'Uñeta con la placa (sin contar el tope del muelle)', vol: choqueUP }] : [])];
  choques.forEach(c => { if (c.vol > 0.05) err('CHOCAN: ' + c.t + ' (' + f(c.vol) + ' mm³).'); });
  if (placa && !(precarga > 0)) err('El muelle no llega a su tope: no empujaría la uñeta.');
  if (choques.every(c => c.vol <= 0.05) && (!placa || precarga > 0)) ok('Montaje virtual: la uñeta cubre el ' + Math.round(agarre * 100) + ' % de la cara del diente sin rozar la rueda; sale inclinada ' + Math.round(beta) + '° hacia fuera (se engancha sola al empujar)' + (placa ? '; el muelle apoya en su tope con ' + f(pre, 1) + ' mm de precarga' : '') + '.');
  if (p.sentido === 'horario') { const M = m => m && m.mirror([0, 1, 0]); rueda = M(rueda); una = M(una); placa = M(placa); }
  return { avisos, choques, partes: { rueda, una, placa }, cuentas: { z, Ra, Rf, h, L, beta, rampa, agarre, paso: Ra * paso, precarga, P } };
}

// ---------- 🔗 ACOPLAMIENTOS: garras con estrella, Oldham, flexible en espiral y manguito ----------
// p = { tipo: 'garras'|'oldham'|'flexible'|'manguito', D (Ø exterior), L (largo total), eje1, forma1, plano1, eje2, forma2, plano2, n (garras), prisioneros: bool }
export function acople(p) {
  const D = p.D, R = D / 2, g = ENCAJES.gira, pres = ENCAJES.presion, j = ENCAJES.justo;
  const avisos = [], err = t => avisos.push({ n: 'error', t }), avi = t => avisos.push({ n: 'aviso', t }), ok = t => avisos.push({ n: 'ok', t });
  const maxEje = Math.max(p.eje1 || 0, p.eje2 || 0); if (R - maxEje / 2 < 2.2) err('El Ø exterior (' + f(D) + ') es poco para ejes de ' + f(maxEje) + ' mm: quedan ' + f(R - maxEje / 2) + ' mm de pared (mínimo 2,2).');
  const agujero = (k, h, z0) => { const s = hueco2(p['forma' + k] || 'redondo', (p['eje' + k] || 0) + 2 * pres, (p['plano' + k] || 0) + pres); return s ? s.extrude(h).translate([0, 0, z0]) : null; };
  const prisionero = (z0, hz) => { const L = []; for (const a of [0, 90]) L.push(N.forma3d('cilindro', { d: 2.55, h: R + 2 }).rotate([0, 90, 0]).rotate([0, 0, a]).translate([0, 0, z0 + hz / 2])); return N.union(L); }; // M3 roscado en el plástico, a 90°
  const piezas = [], fantasma = []; let choques = [];
  if (p.tipo === 'garras') {
    const n = Math.max(2, Math.min(6, Math.round(p.n || 3))), Lg = Math.max(6, Math.min(D * 0.45, p.L * 0.25)), Lh = (p.L - Lg) / 2, ri = Math.max(maxEje / 2 + 1.2, R * 0.38), rc = ri - g - 0.6;
    const sector = 360 / (2 * n), aJ = sector * 0.56, aS = sector - aJ; // ancho de cada garra y de cada brazo de la estrella (en grados)
    const garra2 = rot => { const L = []; for (let i = 0; i < n; i++) { const a0 = (rot + i * 2 * sector) * RAD, a1 = a0 + aJ * RAD, pts = [[ri * Math.cos(a0), ri * Math.sin(a0)]]; for (let k = 0; k <= 12; k++) { const a = a0 + (a1 - a0) * k / 12; pts.push([R * Math.cos(a), R * Math.sin(a)]); } pts.push([ri * Math.cos(a1), ri * Math.sin(a1)]); L.push(N.cs([N.ccw(pts)], 'Positive')); } return N.csUnion(L); };
    const holgA = 2 * Math.asin(Math.min(0.9, g / ri)) / RAD; // holgura angular entre garra y brazo (en el radio interior: lo más justo)
    const estrella2 = (() => { const L = [C2().circle(rc, 48)]; for (let i = 0; i < 2 * n; i++) { const a0 = (aJ + holgA + i * sector) * RAD, a1 = a0 + (aS - 2 * holgA) * RAD, pts = [[0, 0]]; for (let k = 0; k <= 10; k++) { const a = a0 + (a1 - a0) * k / 10; pts.push([(R - 0.4) * Math.cos(a), (R - 0.4) * Math.sin(a)]); } L.push(N.cs([N.ccw(pts)], 'Positive')); } return N.csUnion(L).subtract(C2().circle(Math.max(0.1, maxEje / 2 + 0.6), 32)); })();
    const mitadA = cil(D, Lh).add(garra2(0).extrude(Lg + 0.01).translate([0, 0, Lh - 0.01])), mitadB0 = cil(D, Lh).add(garra2(sector).extrude(Lg + 0.01).translate([0, 0, Lh - 0.01]));
    let A = mitadA, B = mitadB0.mirror([0, 0, 1]).translate([0, 0, p.L]); const a1 = agujero(1, Lh + Lg + 1, -0.5), a2 = agujero(2, Lh + Lg + 1, p.L - Lh - Lg - 0.5); if (a1) A = A.subtract(a1); if (a2) B = B.subtract(a2);
    if (p.prisioneros) { A = A.subtract(prisionero(0, Lh)); B = B.subtract(prisionero(p.L - Lh, Lh)); }
    const estrella = estrella2.extrude(Lg - 0.4).translate([0, 0, Lh + 0.2]);
    piezas.push({ m: A, nombre: 'mitad 1', color: '#2457d6' }, { m: B, nombre: 'mitad 2', color: '#ff8a3d' }, { m: estrella, nombre: 'estrella (TPU)', color: '#3ddc97' });
    choques = [{ t: 'Mitad 1 con la estrella', vol: volCruce(A, estrella) }, { t: 'Mitad 2 con la estrella', vol: volCruce(B, estrella) }, { t: 'Las dos mitades entre sí', vol: volCruce(A, B) }];
    ok('Garras: ' + n + ' por lado, ' + f(Lg) + ' mm de alto; la estrella (imprímela en TPU) entra con tu holgura «gira» a cada lado.');
    avisos.push({ n: 'aviso', t: 'La estrella amortigua y deja que los ejes no estén perfectamente alineados: en TPU. En PLA o PETG funciona, pero sin amortiguar.' });
  } else if (p.tipo === 'oldham') {
    const t = Math.max(4, Math.min(p.L * 0.22, D * 0.35)), Lh = (p.L - t) / 2 - 0.3, ancho = Math.max(3, D * 0.28), prof = Math.min(Lh * 0.6, Math.max(2.5, D * 0.18));
    const ranura = (h, z0, giro) => N.forma3d('caja', { x: D + 2, y: ancho + 2 * g, z: h + 0.01, radio: 0 }).rotate([0, 0, giro]).translate([0, 0, z0]);
    let A = cil(D, Lh).subtract(ranura(prof, Lh - prof, 0)), B = cil(D, Lh).subtract(ranura(prof, Lh - prof, 90)).mirror([0, 0, 1]).translate([0, 0, p.L]);
    const a1 = agujero(1, Lh + 1, -0.5), a2 = agujero(2, Lh + 1, p.L - Lh - 0.5); if (a1) A = A.subtract(a1); if (a2) B = B.subtract(a2);
    if (p.prisioneros) { A = A.subtract(prisionero(0, Lh - prof)); B = B.subtract(prisionero(p.L - Lh + prof, Lh - prof)); }
    const zc = Lh + 0.3, disco = cil(D - 0.4, t, zc).add(N.forma3d('caja', { x: D - 0.4, y: ancho, z: prof - 0.4, radio: 0 }).translate([0, 0, zc - prof + 0.4 - 0.01 + 0])).add(N.forma3d('caja', { x: ancho, y: D - 0.4, z: prof - 0.4, radio: 0 }).translate([0, 0, zc + t - 0.01]));
    const discoF = disco.intersect(cil(D - 0.4, p.L, 0));
    piezas.push({ m: A, nombre: 'mitad 1', color: '#2457d6' }, { m: B, nombre: 'mitad 2', color: '#ff8a3d' }, { m: discoF, nombre: 'disco central', color: '#3ddc97' });
    choques = [{ t: 'Mitad 1 con el disco', vol: volCruce(A, discoF) }, { t: 'Mitad 2 con el disco', vol: volCruce(B, discoF) }];
    ok('Oldham: corrige ejes paralelos desplazados (hasta ≈ ' + f(D * 0.1, 1) + ' mm). Las lengüetas del disco van a 90° y deslizan con tu holgura «gira».');
  } else if (p.tipo === 'flexible') {
    const Lh = Math.min(p.L * 0.28, Math.max(6, D * 0.6)), Lz = p.L - 2 * Lh, ranura = Math.max(1.0, Math.min(1.6, D * 0.05)), vueltas = Math.max(2, Math.round(Lz / (D * 0.35)));
    let m = cil(D, p.L); const a1 = agujero(1, Lh + Lz / 2 + 1, -0.5), a2 = agujero(2, Lh + Lz / 2 + 1, p.L - Lh - Lz / 2 - 0.5); if (a1) m = m.subtract(a1); if (a2) m = m.subtract(a2);
    // el hueco del medio (para que la espiral sea un fleje y no un tubo macizo) y la ESPIRAL cortada (una tira que gira mientras sube)
    m = m.subtract(cil(Math.max(maxEje + 1.2, D * 0.45), Lz, Lh));
    // la espiral: un SECTOR del anillo que gira mientras sube. Un punto fijo de la pared ve pasar el sector durante (ángulo ÷ 360) × paso
    // de altura: ese es el hueco que queda entre vuelta y vuelta. Con el sector de 360 × hueco ÷ paso grados, el hueco mide justo «ranura»
    // (la primera versión cortaba con una hoja de canto y el hueco salía de 0,13 mm: se cerraba al imprimir)
    const pasoH = Lz / vueltas, ang = 360 * ranura / pasoH, rIn = Math.max(maxEje + 1.2, D * 0.45) / 2 - 0.5, seg = [];
    for (let k = 0; k <= 16; k++) { const a = (-ang / 2 + ang * k / 16) * RAD; seg.push([(R + 1) * Math.cos(a), (R + 1) * Math.sin(a)]); }
    for (let k = 16; k >= 0; k--) { const a = (-ang / 2 + ang * k / 16) * RAD; seg.push([rIn * Math.cos(a), rIn * Math.sin(a)]); }
    const tira = N.cs([N.ccw(seg)], 'Positive').extrude(Lz, Math.max(64, vueltas * 64), vueltas * 360).translate([0, 0, Lh]);
    m = m.subtract(tira);
    if (p.prisioneros) m = m.subtract(prisionero(0, Lh)).subtract(prisionero(p.L - Lh, Lh));
    piezas.push({ m, nombre: 'acople flexible', color: '#2457d6' });
    ok('Flexible: una sola pieza, con una espiral de ' + vueltas + ' vueltas y ' + f(ranura) + ' mm de corte. Absorbe pequeños desalineados. Mejor en PETG (el PLA se cansa).');
  } else { // manguito rígido
    let m = cil(D, p.L); const a1 = agujero(1, p.L / 2 + 0.5, -0.5), a2 = agujero(2, p.L / 2 + 0.5, p.L / 2); if (a1) m = m.subtract(a1); if (a2) m = m.subtract(a2);
    if (p.prisioneros !== false) m = m.subtract(prisionero(0, p.L / 2)).subtract(prisionero(p.L / 2, p.L / 2));
    piezas.push({ m, nombre: 'manguito', color: '#2457d6' });
    ok('Manguito rígido: los dos ejes tienen que estar bien alineados (si no, usa garras, Oldham o el flexible).');
  }
  choques.forEach(c => { if (c.vol > 0.05) err('CHOCAN: ' + c.t + ' (' + f(c.vol) + ' mm³).'); });
  if (choques.length && choques.every(c => c.vol <= 0.05)) ok('Montaje virtual: ' + choques.length + ' comprobaciones sin choques.');
  if (p.prisioneros) avi('Prisioneros M3: el agujero es de 2,55 mm para roscar el tornillo en el plástico (ESTIMADO para PLA/PETG). Mejor con un punto plano en el eje.');
  return { avisos, choques, piezas };
}

// ---------- 🔑 CERRAJERÍA: cuadradillos, escudos (perfil europeo de bombín), cerraderos, pomos y levas de buzón o mueble ----------
// La dueña: «para hacer repuestos de cerrajería también». Medidas tuyas; el perfil del bombín es el EUROPEO normal (DIN 18252): círculo
// de Ø 17 y cola de 10 mm de ancho, 33 mm de alto en total.
const perfilEuropeo = hol => { const r = 8.5 + hol, a = 5 + hol, alto = 33 + 2 * hol; return N.csUnion([C2().circle(r, 64), C2().square([2 * a, alto - r - a]).translate([-a, -(alto - r - a)]), C2().circle(a, 48).translate([0, -(alto - r - a)])]); };
const avellanado = (d, cab, z0, alto) => cil(d, alto + 2, z0 - 1).add(N.forma3d('cono', { d: d, d2: cab, h: (cab - d) / 2 }).translate([0, 0, z0 + alto - (cab - d) / 2 + 0.01]));
export function cerrajeria(p) {
  const g = ENCAJES.gira, pres = ENCAJES.presion, avisos = [], err = t => avisos.push({ n: 'error', t }), avi = t => avisos.push({ n: 'aviso', t }), ok = t => avisos.push({ n: 'ok', t });
  let m;
  if (p.pieza === 'cuadradillo') { // adaptador: cuadradillo fino dentro, cuadrado gordo fuera
    const pared = (p.A - p.a) / 2; if (pared < 1.2) avi('Pared de ' + f(pared) + ' mm entre los dos cuadrados: impresa es frágil (mejor 1,2 o más). Un adaptador de 7 a 8 mm se hace en metal.');
    m = C2().square([p.A, p.A], true).subtract(C2().square([p.a + 2 * pres, p.a + 2 * pres], true)).extrude(p.L); ok('Adaptador de cuadradillo ' + f(p.a) + ' → ' + f(p.A) + ' mm, el interior a presión (tu holgura 0,05).');
  } else if (p.pieza === 'escudo') { // roseta / escudo de puerta
    let s2 = C2().circle(p.D / 2, 96); const hueco = p.hueco === 'bombin' ? perfilEuropeo(g) : p.hueco === 'cuadradillo' ? C2().square([p.a + 2 * g, p.a + 2 * g], true) : C2().circle(p.dHueco / 2 + g, 64);
    s2 = s2.subtract(hueco); m = s2.extrude(p.e);
    // los tornillos, a los LADOS del hueco (arriba y abajo los pisaría el bombín); si aun así caen en el hueco, se dice
    if (p.dTor > 0 && p.sepTor > 0) { [-1, 1].forEach(k => { m = m.subtract(avellanado(p.dTor + 0.3, p.dTor * 2 + 0.6, 0, p.e).translate([k * p.sepTor / 2, 0, 0])); });
      if (hueco.intersect(C2().circle(p.dTor, 24).translate([p.sepTor / 2, 0])).area() > 0.01) err('Los tornillos caen dentro del hueco del centro: sepáralos más (más de ' + f(p.hueco === 'bombin' ? 2 * (8.5 + p.dTor) + 1 : 0) + ' mm).');
      if (p.sepTor / 2 + p.dTor > p.D / 2 - 1) err('Los tornillos se salen del escudo: júntalos o haz el escudo más grande.'); }
    if (p.hueco === 'bombin' && p.D < 40) err('Un escudo de bombín necesita al menos Ø 40 (el perfil mide 33 mm de alto).');
    ok('Escudo Ø ' + f(p.D) + (p.hueco === 'bombin' ? ' con el perfil EUROPEO de bombín (17 · 10 · 33 mm) y tu holgura «gira»' : '') + '.');
  } else if (p.pieza === 'cerradero') { // la placa del marco donde entra el pestillo
    m = N.forma3d('caja', { x: p.ancho, y: p.largo, z: p.e, radio: Math.min(3, p.ancho / 4) }).subtract(N.forma3d('caja', { x: p.hAncho + 2 * g, y: p.hAlto + 2 * g, z: p.e + 2, radio: 1 }).translate([0, 0, -1]));
    if (p.dTor > 0 && p.sepTor > 0) [-1, 1].forEach(k => { m = m.subtract(avellanado(p.dTor + 0.3, p.dTor * 2 + 0.6, 0, p.e).translate([0, k * p.sepTor / 2, 0])); });
    if (p.sepTor / 2 - p.dTor < p.hAlto / 2 + 1.5) err('Los tornillos caen dentro del hueco del pestillo: sepáralos más.');
    ok('Cerradero de ' + f(p.ancho) + ' × ' + f(p.largo) + ' mm con el hueco del pestillo de ' + f(p.hAncho) + ' × ' + f(p.hAlto) + ' (+ tu holgura).');
  } else if (p.pieza === 'pomo') { // pomo con agujero de cuadradillo a presión y estrías para agarrar
    const n = 24; let s2 = C2().circle(p.D / 2, 96); for (let i = 0; i < n; i++) s2 = s2.subtract(C2().circle(p.D * 0.045, 16).translate([p.D / 2 * Math.cos(i * 2 * Math.PI / n), p.D / 2 * Math.sin(i * 2 * Math.PI / n)]));
    m = s2.extrude(p.alto).add(N.forma3d('semiesfera', { d: p.D }).scale([1, 1, 0.25]).translate([0, 0, p.alto - 0.01]));
    m = m.subtract(N.forma3d('caja', { x: p.a + 2 * pres, y: p.a + 2 * pres, z: p.prof + 0.01, radio: 0 }).translate([0, 0, -0.01]));
    if (p.prof > p.alto - 2) err('El agujero del cuadradillo (' + f(p.prof) + ' mm) casi atraviesa el pomo: hazlo más alto o menos hondo.');
    ok('Pomo Ø ' + f(p.D) + ' con agujero de cuadradillo de ' + f(p.a) + ' a presión y ' + n + ' estrías.');
  } else { // leva de cerradura de buzón o de mueble
    const hueco = p.hueco === 'cuadrado' ? C2().square([p.a + 2 * pres, p.a + 2 * pres], true) : (() => { const d = p.dEje + 2 * pres; return C2().circle(d / 2, 48).intersect(C2().square([p.a + 2 * pres, d + 2], true)); })(); // doble D: Ø y entre planos
    let s2 = N.csUnion([C2().circle(p.ancho / 2, 48), C2().square([p.ancho, p.largo - p.ancho / 2]).translate([-p.ancho / 2, 0]), C2().circle(p.ancho / 2, 48).translate([0, p.largo - p.ancho / 2])]);
    s2 = s2.subtract(hueco); m = s2.extrude(p.e);
    if (p.ancho / 2 - Math.max(p.a, p.dEje || 0) / 2 < 1.5) err('La leva es muy estrecha para ese agujero: quedan ' + f(p.ancho / 2 - Math.max(p.a, p.dEje || 0) / 2) + ' mm (mínimo 1,5).');
    ok('Leva de ' + f(p.largo) + ' mm con agujero ' + (p.hueco === 'cuadrado' ? 'cuadrado de ' + f(p.a) : 'en doble D (Ø ' + f(p.dEje) + ', ' + f(p.a) + ' entre planos)') + ' a presión.');
  }
  return { m, avisos };
}

// ---------- 🔪 PORTACUCHILLAS, FUNDAS Y GUÍAS DE CORTE ----------
// La dueña («piezas de corte»: portacuchillas y guías). Con las medidas de TU hoja (largo, ancho y grueso, con el calibre).
//  · funda: protector que tapa el filo, con un resalte que la sujeta (clic) para que no se caiga;
//  · portacuchillas: mango con la ranura de la hoja y un prisionero M3 que la aprieta (la hoja sale lo que quieras);
//  · guía: regla de corte con tope a escuadra que se engancha en el borde de la mesa (cortes rectos y repetidos).
export function corte(p) {
  const g = ENCAJES.gira, j = ENCAJES.justo, avisos = [], err = t => avisos.push({ n: 'error', t }), ok = t => avisos.push({ n: 'ok', t }), avi = t => avisos.push({ n: 'aviso', t });
  let m;
  if (p.pieza === 'funda') {
    const pared = 1.6, Li = p.Lh + 1, Wi = p.Wh + 2 * j, Ti = p.th + 0.3; // la hoja entra holgada de grueso (0,3) y justa de ancho
    m = N.forma3d('caja', { x: Wi + 2 * pared, y: Li + pared, z: Ti + 2 * pared, radio: 0 }).translate([0, (Li + pared) / 2, 0]).subtract(N.forma3d('caja', { x: Wi, y: Li + 0.01, z: Ti, radio: 0 }).translate([0, Li / 2 - 0.01, pared]));
    m = m.add(N.forma3d('cilindro', { d: 0.9, h: Wi }).rotate([0, 90, 0]).translate([-Wi / 2, 2.5, pared + Ti + 0.15])); // el resalte del «clic», dentro, cerca de la boca
    ok('Funda para una hoja de ' + f(p.Lh) + ' × ' + f(p.Wh) + ' × ' + f(p.th) + ' mm: entra justa de ancho, holgada de grueso, y un resalte la sujeta.');
  } else if (p.pieza === 'portacuchillas') {
    const L = Math.max(p.Lmango || 100, 60), A = Math.max(p.Wh + 8, 16), E = Math.max(p.th + 7, 11), prof = Math.min(p.Lh * 0.6, L * 0.5);
    m = N.forma3d('caja', { x: A, y: L, z: E, radio: 0, redondeo: 2 }).translate([0, L / 2, 0]);
    m = m.subtract(N.forma3d('caja', { x: p.Wh + 2 * j, y: prof + 0.01, z: p.th + 0.12, radio: 0 }).translate([0, L - prof / 2 + 0.01, E / 2 - (p.th + 0.12) / 2]));
    m = m.subtract(N.forma3d('cilindro', { d: 2.55, h: E / 2 + 1 }).translate([0, L - prof / 2, E / 2])); // prisionero M3 que aprieta la hoja
    if (p.th > 1.5) avi('Hoja gruesa (' + f(p.th) + ' mm): mejor dos prisioneros; dímelo y lo cambio.');
    ok('Mango de ' + f(L) + ' mm con la ranura de la hoja (' + f(prof, 1) + ' mm de hondo) y un prisionero M3 que la aprieta.');
  } else { // guía de corte con tope a escuadra
    const L = p.Lguia || 300, A = p.Aguia || 40, e = 4, tope = 15;
    m = N.forma3d('caja', { x: A, y: L, z: e, radio: 2 }).translate([0, L / 2, 0]).add(N.forma3d('caja', { x: A, y: e, z: tope + e, radio: 0 }).translate([0, e / 2, -tope]));
    if (L > 250) avi('Una guía de ' + f(L) + ' mm no cabe entera en tu P1P (256 mm): pártela en dos con pasadores en el Estudio (🔪 Partir) o hazla de 250.');
    ok('Guía de ' + f(L) + ' × ' + f(A) + ' mm con tope a escuadra de ' + tope + ' mm que se engancha en el borde de la mesa.');
  }
  return { m, avisos };
}
