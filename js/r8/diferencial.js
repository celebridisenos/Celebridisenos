// ================= v20 · 🏎️ CelebriR8 · DIFERENCIAL RC COMPLETO, CON MONTAJE VIRTUAL =================
// Lo pidió la dueña: «diferencial COMPLETO con su estructura: carcasa con corona cónica, tapa atornillada, cruceta, piñón
// de ataque y caja con alojamientos de rodamientos estándar… que compruebe que nada choca y que las distancias de engrane
// salgan de la fórmula». Diseño PROPIO (sin copiar ninguna marca); las medidas de partida son las habituales en RC 1/10 y
// los rodamientos son tamaños NORMALIZADOS (10×15×4, 5×11×4…): todo se marca como «estimado» hasta que lo midas.
//
// Ejes: X = el de las ruedas (el del diferencial) · Y = el del piñón de ataque (el motor queda hacia −Y) · Z hacia arriba.
// Los dos cruces de ejes (corona con piñón, planetarios con satélites) caen en el origen: así lo exige un par cónico a 90°.
//   · CORONA (z₂) y PIÑÓN (z₁): tan δ₁ = z₁/z₂, δ₂ = 90° − δ₁. Talón de la corona a r₁ = m·z₁/2 del centro (en X) y talón
//     del piñón a r₂ = m·z₂/2 (en −Y): es la fórmula (distancia del vértice al talón = r / tan δ).
//   · PLANETARIOS en ±X y SATÉLITES en ±Y (y ±Z si son 4), con su propio módulo.
// MONTAJE VIRTUAL: se colocan todas las piezas en su sitio y se MIDE el volumen que comparte cada pareja (Manifold). Para
// que engranen, cada pareja se gira hasta que diente y hueco casan (también medido). Y se comprueba que de verdad engranan:
// con un diente un poco más grueso (sin juego) SÍ chocarían.
import * as N from './nucleo.js';
import * as G from './engranajes.js';
import { ENCAJES } from './motor.js';

export const RODAMIENTOS = { '5x11x4': [5, 11, 4], '6x10x3': [6, 10, 3], '6x12x4': [6, 12, 4], '8x12x3.5': [8, 12, 3.5], '8x16x5': [8, 16, 5], '10x15x4': [10, 15, 4], '10x19x5': [10, 19, 5], '12x18x4': [12, 18, 4], '13x19x4': [13, 19, 4] };
// agujero para ROSCAR el tornillo en plástico impreso ≈ 0,85 × métrica (estimado: depende del material) · pasante = métrica + 0,3
export const TORNILLOS = { M2: { d: 2, rosca: 1.7, pasa: 2.3, cabeza: 3.8 }, 'M2.5': { d: 2.5, rosca: 2.15, pasa: 2.8, cabeza: 4.5 }, M3: { d: 3, rosca: 2.55, pasa: 3.3, cabeza: 5.5 } };

const f2 = x => G.fmt(x, 2);
const cil = (r, h, segs) => N.MF().cylinder(h, r, r, segs || Math.max(32, Math.ceil(r * 8 / 4) * 4));
const cilX = (r, x0, x1) => cil(r, x1 - x0).rotate([0, 90, 0]).translate([x0, 0, 0]);
const cilY = (r, y0, y1) => cil(r, y1 - y0).rotate([-90, 0, 0]).translate([0, y0, 0]);
const cilZ = (r, z0, z1) => cil(r, z1 - z0).translate([0, 0, z0]);
const tuboX = (ro, ri, x0, x1) => cilX(ro, x0, x1).subtract(cilX(ri, x0 - 1, x1 + 1));
const tuboY = (ro, ri, y0, y1) => cilY(ro, y0, y1).subtract(cilY(ri, y0 - 1, y1 + 1));
const volCruce = (a, b) => { try { return Math.max(0, a.intersect(b).volume()); } catch (e) { return 0; } };
// el radio más lejano de una pieza respecto al eje X (o Y), mirando sus vértices
function radioMax(m, eje = 'x') { const M = m.getMesh(), P = M.vertProperties, k = M.numProp; let r = 0; for (let i = 0; i < P.length; i += k) { const a = eje === 'x' ? Math.hypot(P[i + 1], P[i + 2]) : Math.hypot(P[i], P[i + 2]); if (a > r) r = a; } return r; }
const extX = m => { const b = N.caja(m); return [b.min[0], b.max[0]]; };
// gira «movil» alrededor de su eje hasta que choque lo menos posible con «fijos» (búsqueda gruesa + fina, medida)
function casa(movil, eje, paso, fijos) {
  const giro = a => movil.rotate(eje === 'x' ? [a, 0, 0] : eje === 'y' ? [0, a, 0] : [0, 0, a]);
  const choque = a => fijos.reduce((s, f) => s + volCruce(giro(a), f), 0);
  let mejor = 0, v0 = Infinity; for (let i = 0; i < 12; i++) { const a = i * paso / 12, v = choque(a); if (v < v0) { v0 = v; mejor = a; } if (v0 < 1e-6) break; }
  if (v0 > 1e-6) for (let d = paso / 24; d > paso / 400; d /= 2) { for (const a of [mejor - d, mejor + d]) { const v = choque(a); if (v < v0) { v0 = v; mejor = a; } } if (v0 < 1e-6) break; }
  return { m: giro(mejor), angulo: mejor, choque: v0 };
}

// el cuerpo de un cónico (en su sistema local: vértice en el origen, eje +Z): rellena por dentro de la llanta, de la punta al
// talón, y añade detrás un «respaldo» de grosor «atras» (y radio «rAtras», si se da)
function cuerpo(C, atras, rAtras) {
  const K = C.K, z0 = K.k * K.zIn, h = K.zIn - z0;
  let m = C.m.add(N.MF().cylinder(h, K.k * K.rIn + 0.05, K.rIn + 0.05, Math.max(48, K.z * 4)).translate([0, 0, z0]));
  if (atras > 0) m = m.add(cil(rAtras || K.rIn, atras + 0.3).translate([0, 0, K.zIn - 0.3]));
  return m;
}

// p: m, zc, zpi, alfa, juego, ms, zpl, zsa, ns, salida, ejeSal, cruceta, rodCaja, rodPinon, ejePinon, torTapa, torCaja, pared, holg, b
export function diferencial(p) {
  const A = Number(p.alfa) || 20, J = p.juego || 0, pres = ENCAJES.presion, gira = ENCAJES.gira, pared = p.pared || 2.5, holg = p.holg || 1.5;
  const RC = RODAMIENTOS[p.rodCaja] || RODAMIENTOS['10x15x4'], RP = RODAMIENTOS[p.rodPinon] || RODAMIENTOS['5x11x4'], TT = TORNILLOS[p.torTapa] || TORNILLOS['M2.5'], TC = TORNILLOS[p.torCaja] || TORNILLOS.M3;
  const avisos = [], err = t => avisos.push({ n: 'error', t }), avi = t => avisos.push({ n: 'aviso', t }), ok = t => avisos.push({ n: 'ok', t });
  // ---------- corona y piñón: los dos vértices en el origen (la fórmula: talón de la corona a r₁ en X, del piñón a r₂ en −Y) ----------
  const Cg = G.conico({ z: p.zc, zPareja: p.zpi, m: p.m, alfa: A, juego: J, b: p.b }), Pg = G.conico({ z: p.zpi, zPareja: p.zc, m: p.m, alfa: A, juego: J, b: Cg.K.b });
  const H2 = Cg.K.H, H1 = Pg.K.H;
  const corona0 = Cg.m.rotate([0, 90, 0]); // dientes de la corona (el cuerpo lo pone la carcasa)
  // ---------- planetarios (±X) y satélites (±Y, ±Z) ----------
  const ns = Number(p.ns) === 4 ? 4 : 2;
  if (ns === 4 && Math.round(p.zpl) % 2) err('Con 4 satélites, los planetarios necesitan un número PAR de dientes (si no, los satélites no caben repartidos).');
  const SG = G.conico({ z: p.zpl, zPareja: p.zsa, m: p.ms, alfa: A, juego: J }), SP = G.conico({ z: p.zsa, zPareja: p.zpl, m: p.ms, alfa: A, juego: J, b: SG.K.b });
  const tb = Math.max(1.2, 1.2 * p.ms); // espalda de cada piñón (la cara que roza con la carcasa)
  const salida = (L, sobra) => { const e = p.ejeSal + 2 * pres; let s = p.salida === 'hex' ? N.cs([N.poligono2(6, e / Math.cos(Math.PI / 6), 0)], 'Positive') : N.CSX().circle(e / 2, 48); if (p.salida === 'd') s = s.subtract(N.CSX().square([e, e]).translate([e * 0.4, -e / 2])); return s.extrude(L + 2 * sobra).translate([0, 0, -sobra]); };
  const plan0 = cuerpo(SG, tb).subtract(salida(SG.K.zIn + tb + 2, 1));
  const sat0 = cuerpo(SP, tb).subtract(cil(p.cruceta / 2 + gira, SP.K.zIn + tb + 4).translate([0, 0, -2]));
  let planD = plan0.rotate([0, 90, 0]), planI = plan0.rotate([0, -90, 0]);
  const sats = [sat0.rotate([-90, 0, 0]), sat0.rotate([90, 0, 0])];
  if (ns === 4) sats.push(sat0, sat0.rotate([180, 0, 0]));
  // engranar (medido): el primer satélite con el planetario derecho; el izquierdo con él; el resto con los dos
  sats[0] = casa(sats[0], 'y', 360 / SP.K.z, [planD]).m;
  planI = casa(planI, 'x', 360 / SG.K.z, [sats[0]]).m;
  for (let i = 1; i < sats.length; i++) sats[i] = casa(sats[i], i === 1 ? 'y' : 'z', 360 / SP.K.z, [planD, planI]).m;
  // ---------- la carcasa (gira con la corona) ----------
  const internos = N.union([planD, planI, ...sats]);
  const Rin = radioMax(internos, 'x') + 0.5, [xi0, xi1] = extX(internos), Xi = Math.max(Math.abs(xi0), Math.abs(xi1)) + 0.3, Rk = Rin + pared;
  const largoCruceta = Rk; // la cruceta atraviesa la carcasa de lado a lado
  const pasador = N.union([cilY(p.cruceta / 2, -largoCruceta, largoCruceta)].concat(ns === 4 ? [cilZ(p.cruceta / 2, -largoCruceta, largoCruceta)] : []));
  // la corona: dientes + su alma (de la llanta hacia dentro, hasta la carcasa) + un disco detrás del talón
  const tDisco = Math.max(2.5, 2.2 * p.m), K2 = Cg.K, z0c = K2.k * K2.zIn;
  const alma = N.MF().cylinder(K2.zIn - z0c, K2.k * K2.rIn + 0.05, K2.rIn + 0.05, Math.max(96, K2.z * 4)).translate([0, 0, z0c]).add(cil(K2.rRaiz - 0.05, tDisco + (K2.zIn - K2.zRaiz)).translate([0, 0, K2.zRaiz + 0.05])).subtract(cil(Rk - 0.5, 200).translate([0, 0, -100]));
  const corona = corona0.add(alma.rotate([0, 90, 0]));
  const finCaja = Math.max(Xi + pared, K2.zIn + tDisco); // donde acaba el cuerpo por +X (detrás del disco de la corona)
  const anilloInt = (RC[0] - 2 * pres) / 2, bujeL = holg + RC[2] + 0.4, boca = (p.salida === 'hex' ? p.ejeSal / Math.cos(Math.PI / 6) : p.ejeSal) / 2 + gira + 0.15;
  if (anilloInt - boca < 1.0) err('El buje de la carcasa no cabe: con rodamientos ' + p.rodCaja + ' quedan ' + f2(anilloInt - boca) + ' mm de pared alrededor de la salida (mínimo 1). Usa rodamientos más grandes o una salida más fina.');
  // tornillos de la tapa: paralelos al eje X, en diagonal (lejos del piñón, que está en −Y)
  const Rt = Rk + TT.cabeza / 2 - 0.4, angT = [45, 135, 225, 315].map(a => a * Math.PI / 180), posT = angT.map(a => [Math.cos(a) * Rt, Math.sin(a) * Rt]); // (y, z)
  const tetones = N.union(posT.map(([y, z]) => cilX(TT.cabeza / 2 + 0.8, -Xi, -Xi + 7).translate([0, y, z])));
  let carcasa = cilX(Rk, -Xi, finCaja).subtract(cilX(Rin, -Xi - 1, Xi)).add(corona).add(tuboX(anilloInt, boca, finCaja - 0.01, finCaja + bujeL)).add(tetones);
  const agujCruceta = N.union([cilY(p.cruceta / 2 + gira, -largoCruceta - 1, largoCruceta + 1)].concat(ns === 4 ? [cilZ(p.cruceta / 2 + gira, -largoCruceta - 1, largoCruceta + 1)] : []));
  carcasa = carcasa.subtract(cilX(boca, -Xi - 1, finCaja + bujeL + 1)).subtract(agujCruceta);
  carcasa = carcasa.subtract(N.union(posT.map(([y, z]) => cilX(TT.rosca / 2, -Xi - 1, -Xi + 6.5).translate([0, y, z]))));
  // la TAPA: cierra por −X, con un reborde que entra en la carcasa (centra), los pasantes de los tornillos y su buje
  const reborde = tuboX(Rk + ENCAJES.justo + 1.2, Rk + ENCAJES.justo, -Xi - 0.01, -Xi + 1.5).subtract(N.union(posT.map(([y, z]) => cilX(TT.cabeza / 2 + 0.8 + ENCAJES.justo, -Xi - 1, -Xi + 3).translate([0, y, z]))));
  const tapa0 = cilX(Rk + ENCAJES.justo + 1.2, -Xi - pared, -Xi).add(N.union(posT.map(([y, z]) => cilX(TT.cabeza / 2 + 0.8, -Xi - pared, -Xi).translate([0, y, z])))).add(reborde).add(tuboX(anilloInt, boca, -Xi - pared - bujeL, -Xi - pared + 0.01));
  const tapa = tapa0.subtract(cilX(boca, -Xi - pared - bujeL - 1, -Xi + 2)).subtract(N.union(posT.map(([y, z]) => cilX(TT.pasa / 2, -Xi - pared - 1, -Xi + 0.5).translate([0, y, z]))));
  // ---------- el piñón de ataque y su eje ----------
  const bujeP = 2, ejeP = p.ejePinon;
  let pinon = cuerpo(Pg, bujeP, Math.max(Pg.K.rIn, ejeP / 2 + 1.5)).subtract(cil(ejeP / 2 + pres, Pg.K.zIn + bujeP + 4).translate([0, 0, -1])).rotate([90, 0, 0]); // talón hacia −Y
  const cp = casa(pinon, 'y', 360 / Pg.K.z, [corona0]); pinon = cp.m;
  const yTalon = -Pg.K.zIn - bujeP; // detrás del buje del piñón
  // rodamientos del piñón y su eje
  const yb1 = yTalon - 0.5, yb2 = yb1 - RP[2] - 6; // dos rodamientos separados 6 mm (más firme)
  const ejeLargo = -(yb2 - RP[2] - 9);
  const eje = cilY(ejeP / 2, -ejeLargo, -Pg.K.k * Pg.K.zIn + 0.5).subtract(N.forma3d('caja', { x: ejeP + 1, y: 8, z: ejeP, radio: 0 }).translate([0, -ejeLargo + 4, ejeP * 0.4]));
  // ---------- la CAJA (dos mitades, partida por el plano del eje) ----------
  const giratorio = N.union([carcasa, tapa, internos, pasador]);
  const Rrot = radioMax(giratorio, 'x') + holg, [gx0, gx1] = extX(giratorio);
  const bCaja = [ // rodamientos de la carcasa: en sus bujes, a «holg» de la cara que gira
    { x0: finCaja + holg, x1: finCaja + holg + RC[2] }, { x0: -Xi - pared - holg - RC[2], x1: -Xi - pared - holg }];
  const xIn0 = -Xi - pared - holg, xIn1 = finCaja + holg; // la cámara llega hasta los rodamientos
  const Rpin = radioMax(pinon, 'y') + holg;
  const camara = N.union([cilX(Rrot, xIn0, xIn1), cilY(Rpin, yTalon - 0.4, -Pg.K.k * Pg.K.zIn + holg)]); void gx0; void gx1;
  const RcajaX = RC[1] / 2 + pres + pared, RcajaP = RP[1] / 2 + pres + pared;
  const xFin1 = bCaja[0].x1 + 1.5, xFin0 = bCaja[1].x0 - 1.5;
  let caja = N.union([cilX(Math.max(Rrot + pared, RcajaX), xFin0, xFin1), cilY(Math.max(Rpin + pared, RcajaP), yb2 - RP[2] - 1.5, -Pg.K.k * Pg.K.zIn + holg + pared)]);
  // pestaña de unión en el plano z = 0 con los tornillos de la caja
  const bb = N.caja(caja), mx = 6 + TC.cabeza / 2, ancho = (bb.max[0] - bb.min[0]) + 2 * mx, largo = (bb.max[1] - bb.min[1]) + 2 * mx;
  const ptsC = [[bb.min[0] - mx / 2, bb.max[1] - 4], [bb.max[0] + mx / 2, bb.max[1] - 4], [bb.min[0] - mx / 2, bb.min[1] + 6], [bb.max[0] + mx / 2, bb.min[1] + 6]];
  const losa = N.forma3d('caja', { x: 2000, y: 2000, z: 4, radio: 0 }).translate([0, 0, -2]); void ancho; void largo;
  const pestana = N.MF().hull([caja.intersect(losa), ...ptsC.map(([x, y]) => cilZ(TC.cabeza / 2 + 2, -2, 2).translate([x, y, 0]))]).intersect(losa);
  caja = caja.add(pestana).subtract(camara);
  // alojamientos de los rodamientos (a presión: diámetro + 2 × 0,05) y salidas de los ejes
  bCaja.forEach(b => { caja = caja.subtract(cilX(RC[1] / 2 + pres, b.x0, b.x1)); });
  caja = caja.subtract(cilX(Math.max(boca + 0.6, RC[0] / 2), xFin0 - 1, xFin1 + 1));
  [[yb1 - RP[2], yb1], [yb2 - RP[2], yb2]].forEach(([y0, y1]) => { caja = caja.subtract(cilY(RP[1] / 2 + pres, y0, y1)); });
  caja = caja.subtract(cilY(ejeP / 2 + 0.8, yb2 - RP[2] - 3, yb1 + 1)).subtract(cilY(ejeP / 2 + 1.2, yb1 - 0.01, yTalon + 0.01)); // eje: pasa holgado entre los rodamientos
  caja = caja.subtract(N.union(ptsC.map(([x, y]) => cilZ(TC.rosca / 2, -6, 6).translate([x, y, 0]))));
  const mitad = s => N.forma3d('caja', { x: 1000, y: 1000, z: 500, radio: 0 }).translate([0, 0, s > 0 ? 0 : -500]);
  let cajaArriba = caja.intersect(mitad(1)), cajaAbajo = caja.intersect(mitad(-1));
  cajaArriba = cajaArriba.subtract(N.union(ptsC.map(([x, y]) => cilZ(TC.pasa / 2, -1, 6).translate([x, y, 0])))); // arriba pasan; abajo se roscan
  // ---------- piezas de mentira para comprobar: rodamientos y tornillos con sus medidas reales ----------
  const rodam = [...bCaja.map(b => tuboX(RC[1] / 2, RC[0] / 2, b.x0, b.x1)), tuboY(RP[1] / 2, RP[0] / 2, yb1 - RP[2], yb1), tuboY(RP[1] / 2, RP[0] / 2, yb2 - RP[2], yb2)];
  const tornillosT = posT.map(([y, z]) => cilX(TT.pasa / 2 - 0.15, -Xi - pared, -Xi + 6).translate([0, y, z]));
  // ---------- MONTAJE VIRTUAL: lo que NO debe chocar (volumen compartido medido) ----------
  const giratorioMasTornillos = N.union([giratorio, ...tornillosT]);
  const prueba = [
    ['Corona con piñón de ataque', corona0, pinon],
    ['Planetarios con satélites', N.union([planD, planI]), N.union(sats)],
    ['Planetarios y satélites con la carcasa y la tapa', internos, N.union([carcasa, tapa])],
    ['Cruceta con planetarios', pasador, N.union([planD, planI])],
    ['Carcasa con la tapa (solo apoyan)', carcasa, tapa],
    ['Lo que gira con la caja', giratorioMasTornillos, caja],
    ['Piñón y su eje con la caja', N.union([pinon, eje]), caja],
    ['Piñón con la carcasa', pinon, N.union([carcasa, tapa])],
    ['Rodamientos (medidas reales) con la caja', N.union(rodam), caja],
    ['Rodamientos con los bujes y el eje', N.union(rodam), N.union([carcasa, tapa, eje])]];
  const choques = prueba.map(([t, a, b]) => ({ t, vol: volCruce(a, b) }));
  // ¿engranan de verdad? Sin ningún juego y con el diente 0,08 mm más gordo, SÍ deben tocarse
  const Cg2 = G.conico({ z: p.zc, zPareja: p.zpi, m: p.m, alfa: A, juego: -(J + 0.08), b: p.b }), cor2 = Cg2.m.rotate([0, 90, 0]); // quita el juego de los DOS y engorda 0,08: si engranan, ahora se tocan
  const engrana = volCruce(cor2, pinon) > 0.001;
  const SG2 = G.conico({ z: p.zpl, zPareja: p.zsa, m: p.ms, alfa: A, juego: -(J + 0.08) }), engranaPl = volCruce(SG2.m.rotate([0, 90, 0]), sats[0]) > 0.0005;
  if (!engranaPl) err('Los planetarios y los satélites no llegan a tocarse: revisa su módulo o sus dientes.');
  choques.forEach(c => { if (c.vol > 0.05) err('CHOCAN: ' + c.t + ' (' + f2(c.vol) + ' mm³ se pisan).'); });
  if (!engrana) err('La corona y el piñón no llegan a tocarse: revisa el módulo o los dientes.');
  if (choques.every(c => c.vol <= 0.05) && engrana && engranaPl) ok('Montaje virtual: ' + choques.length + ' comprobaciones sin choques; la corona ENGRANA con el piñón y los planetarios con los satélites (con el diente sin juego, se tocan).');
  const relacion = p.zc / p.zpi;
  if (Pg.K.z < 9) avi('Un piñón de ' + Pg.K.z + ' dientes es muy pequeño: los dientes salen débiles (mejor 10 o más).');
  if (p.m < 0.8) avi('Módulo ' + p.m + ': dientes muy pequeños para imprimir con boquilla de 0,4.');
  return {
    partes: { carcasa, tapa, planD, planI, sats, pasador, pinon, eje, cajaArriba, cajaAbajo, corona },
    // para IMPRIMIR, cada pieza apoyada sobre su cara plana (comprobado con Bambu Studio: «de canto», un planetario no se lamina):
    // los engranajes por su espalda (dientes hacia arriba), carcasa y tapa por su buje, cada mitad de la caja por la cara de unión
    piezasImprimir: [['Carcasa con la corona', carcasa.rotate([0, 90, 0]), '#e2231a'], ['Tapa', tapa.rotate([0, -90, 0]), '#ff8a3d'], ['Planetario', planD.rotate([0, 90, 0]), '#2457d6'], ['Planetario', planI.rotate([0, -90, 0]), '#2457d6'],
      ...sats.map((s, i) => ['Satélite', s.rotate(i === 0 ? [-90, 0, 0] : i === 1 ? [90, 0, 0] : i === 2 ? [180, 0, 0] : [0, 0, 0]), '#29d3ff']), ['Piñón de ataque', pinon.rotate([90, 0, 0]), '#7c6cff'], ['Caja (arriba)', cajaArriba, '#8e9196'], ['Caja (abajo)', cajaAbajo.rotate([180, 0, 0]), '#8e9196']],
    rodam, tornillosT, choques, engrana, engranaPl, avisos,
    cuentas: { delta1: Pg.K.deltaG, delta2: Cg.K.deltaG, r1: Pg.K.r, r2: Cg.K.r, Rc: Cg.K.Rc, b: Cg.K.b, H1, H2, relacion, Rin, Rk, Rrot, Xi, faseCorona: cp.angulo, sumaPlan: SG.K.r, deltaPl: SG.K.deltaG, deltaSa: SP.K.deltaG },
    lista: [[2, 'Rodamiento ' + p.rodCaja + ' (carcasa)'], [2, 'Rodamiento ' + p.rodPinon + ' (piñón)'], [4, 'Tornillo ' + p.torTapa + ' × ' + Math.round(pared + 6) + ' mm (tapa)'], [4, 'Tornillo ' + p.torCaja + ' × 10 mm (caja)'], [ns === 4 ? 2 : 1, 'Pasador de acero Ø ' + p.cruceta + ' × ' + f2(2 * largoCruceta) + ' mm (cruceta)'], [1, 'Eje de acero Ø ' + ejeP + ' mm con plano (piñón), o el impreso'], [2, 'Salidas (vasos) de ' + (p.salida === 'hex' ? 'hexágono ' : p.salida === 'd' ? 'eje en D ' : 'Ø ') + p.ejeSal + ' mm']]
  };
}
