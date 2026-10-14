// ================= 13-10-2026 · 👁️ DIFERENCIAL ABIERTO (horquilla a la vista), con MONTAJE VIRTUAL =================
// La dueña mandó la foto de uno (corona cónica tumbada, dos brazos que suben con el pasador, satélites y planetarios a la vista y un disco
// arriba): «esto también, antes de darme algo así». Diseño PROPIO con las MISMAS cuentas del diferencial completo (diferencial.js):
// corona y piñón con los vértices en el origen, planetarios en ±X, satélites en ±Y sobre el pasador. En vez de la carcasa cerrada:
//  · la corona lleva de UNA PIEZA la HORQUILLA: dos brazos curvos (trozos del mismo cilindro que sería la carcasa) con el agujero del
//    pasador; se imprime con la espalda de la corona en la cama y los brazos hacia arriba, sin soportes;
//  · arriba, el DISCO-PUENTE une los dos brazos (dos tetones a presión) y hace de casquillo de la salida de ese lado;
//  · el casquillo del otro lado va DENTRO del disco de la corona (nada sobresale por detrás: apoya plana en la cama).
// Sirve para ver cómo funciona (demostración, clases, escaparate) y para coches y robots donde no hace falta cerrarlo.
// Ejes: X = el de las ruedas · Y = el pasador de los satélites · el piñón de ataque en −Y… como en diferencial.js.
import * as N from './nucleo.js';
import * as G from './engranajes.js';
import { ENCAJES } from './motor.js';

const f2 = x => G.fmt(x, 2);
const cil = (r, h, segs) => N.MF().cylinder(h, r, r, segs || Math.max(32, Math.ceil(r * 8 / 4) * 4));
const cilX = (r, x0, x1) => cil(r, x1 - x0).rotate([0, 90, 0]).translate([x0, 0, 0]);
const cilY = (r, y0, y1) => cil(r, y1 - y0).rotate([-90, 0, 0]).translate([0, y0, 0]);
const tuboX = (ro, ri, x0, x1) => cilX(ro, x0, x1).subtract(cilX(ri, x0 - 1, x1 + 1));
const volCruce = (a, b) => { try { return Math.max(0, a.intersect(b).volume()); } catch (e) { return 0; } };
function radioMax(m, eje = 'x') { const M = m.getMesh(), P = M.vertProperties, k = M.numProp; let r = 0; for (let i = 0; i < P.length; i += k) { const a = eje === 'x' ? Math.hypot(P[i + 1], P[i + 2]) : Math.hypot(P[i], P[i + 2]); if (a > r) r = a; } return r; }
function casa(movil, eje, paso, fijos) {
  const giro = a => movil.rotate(eje === 'x' ? [a, 0, 0] : eje === 'y' ? [0, a, 0] : [0, 0, a]), choque = a => fijos.reduce((s, f) => s + volCruce(giro(a), f), 0);
  let mejor = 0, v0 = Infinity; for (let i = 0; i < 12; i++) { const a = i * paso / 12, v = choque(a); if (v < v0) { v0 = v; mejor = a; } if (v0 < 1e-6) break; }
  if (v0 > 1e-6) for (let d = paso / 24; d > paso / 400; d /= 2) { for (const a of [mejor - d, mejor + d]) { const v = choque(a); if (v < v0) { v0 = v; mejor = a; } } if (v0 < 1e-6) break; }
  return { m: giro(mejor), angulo: mejor, choque: v0 };
}
function cuerpo(C, atras, rAtras) { const K = C.K, z0 = K.k * K.zIn, h = K.zIn - z0; let m = C.m.add(N.MF().cylinder(h, K.k * K.rIn + 0.05, K.rIn + 0.05, Math.max(48, K.z * 4)).translate([0, 0, z0])); if (atras > 0) m = m.add(cil(rAtras || K.rIn, atras + 0.3).translate([0, 0, K.zIn - 0.3])); return m; }

// p: m, zc, zpi, ms, zpl, zsa, alfa, juego, b, salida, ejeSal, cruceta, ejePinon, pared
export function diferencialAbierto(p) {
  const A = Number(p.alfa) || 20, J = p.juego ?? 0.1, pres = ENCAJES.presion, gira = ENCAJES.gira, pared = p.pared || 2.5;
  const avisos = [], err = t => avisos.push({ n: 'error', t }), avi = t => avisos.push({ n: 'aviso', t }), ok = t => avisos.push({ n: 'ok', t });
  const Cg = G.conico({ z: p.zc, zPareja: p.zpi, m: p.m, alfa: A, juego: J, b: p.b }), Pg = G.conico({ z: p.zpi, zPareja: p.zc, m: p.m, alfa: A, juego: J, b: Cg.K.b });
  const corona0 = Cg.m.rotate([0, 90, 0]);
  const SG = G.conico({ z: p.zpl, zPareja: p.zsa, m: p.ms, alfa: A, juego: J }), SP = G.conico({ z: p.zsa, zPareja: p.zpl, m: p.ms, alfa: A, juego: J, b: SG.K.b });
  const tb = Math.max(1.2, 1.2 * p.ms), e = p.ejeSal + 2 * pres;
  const hueco = L => { let s = p.salida === 'hex' ? N.cs([N.poligono2(6, e / Math.cos(Math.PI / 6), 0)], 'Positive') : N.CSX().circle(e / 2, 48); if (p.salida === 'd') s = s.subtract(N.CSX().square([e, e]).translate([e * 0.4, -e / 2])); return s.extrude(L + 2).translate([0, 0, -1]); };
  const plan0 = cuerpo(SG, tb).subtract(hueco(SG.K.zIn + tb + 2)), sat0 = cuerpo(SP, tb).subtract(cil(p.cruceta / 2 + gira, SP.K.zIn + tb + 4).translate([0, 0, -2]));
  let planD = plan0.rotate([0, 90, 0]), planI = plan0.rotate([0, -90, 0]); const sats = [sat0.rotate([-90, 0, 0]), sat0.rotate([90, 0, 0])];
  sats[0] = casa(sats[0], 'y', 360 / SP.K.z, [planD]).m; planI = casa(planI, 'x', 360 / SG.K.z, [sats[0]]).m; sats[1] = casa(sats[1], 'y', 360 / SP.K.z, [planD, planI]).m;
  const internos = N.union([planD, planI, ...sats]), Rin = radioMax(internos, 'x') + 0.5, Rk = Rin + pared;
  const bD = N.caja(planD), bI = N.caja(planI), Xd = bD.max[0], Xi = -bI.min[0];
  const yS = Math.max(N.caja(sats[0]).max[1], -N.caja(sats[1]).min[1]) + 0.5; // (la espalda de los satélites, más aire)
  const boca = (p.salida === 'hex' ? p.ejeSal / Math.cos(Math.PI / 6) : p.ejeSal) / 2 + gira + 0.15; // (el paso de la salida por el casquillo)
  // ---------- la corona con su disco (el casquillo de este lado va DENTRO del disco: la espalda queda plana) ----------
  const K2 = Cg.K, z0c = K2.k * K2.zIn, tDisco = Math.max(3, 2.2 * p.m), finD = Math.max(Xd + 0.3 + 3.5, K2.zIn + tDisco);
  const alma = N.MF().cylinder(K2.zIn - z0c, K2.k * K2.rIn + 0.05, K2.rIn + 0.05, Math.max(96, K2.z * 4)).translate([0, 0, z0c]).add(cil(K2.rRaiz - 0.05, finD - K2.zRaiz).translate([0, 0, K2.zRaiz + 0.05]));
  let corona = corona0.add(alma.rotate([0, 90, 0]));
  const RplD = radioMax(planD, 'x') + 0.6; corona = corona.subtract(cilX(RplD, -50, Xd + 0.3)).subtract(cilX(boca, -50, finD + 1)); // (el sitio del planetario y su casquillo)
  // ---------- la HORQUILLA: dos brazos (trozos del cilindro de radio Rk), desde el disco de la corona hasta arriba del planetario ----------
  const wA = Math.max(p.cruceta + 9, 12), xTop = -Xi - 0.3, xBase = Math.min(K2.zRaiz + 1, Xd + 0.3 + 1);
  const brazo = sg => { let b = N.forma3d('caja', { x: xBase - xTop, y: Rk - yS + 2, z: wA, radio: 0 }).translate([(xBase + xTop) / 2, sg * (yS + (Rk - yS + 2) / 2), -wA / 2]); return b.intersect(cilX(Rk, xTop - 1, xBase + 1)); };
  let horquilla = brazo(1).add(brazo(-1));
  if (Rk - yS < 2) err('Los brazos de la horquilla quedan muy finos (' + f2(Rk - yS) + ' mm): sube la pared.');
  // los tetones de arriba (entran a presión en el disco-puente) y el agujero del pasador (a presión: el pasador no gira; los satélites sí)
  const tet = sg => cilX(1.5, xTop - 2.5, xTop + 0.01).translate([0, sg * (yS + (Rk - yS) / 2), 0]);
  horquilla = horquilla.add(tet(1)).add(tet(-1)).subtract(cilY(p.cruceta / 2 + pres, -Rk - 1, Rk + 1));
  let pieza = corona.add(horquilla);
  // ---------- el DISCO-PUENTE de arriba: une los brazos y es el casquillo de la salida de ese lado ----------
  const tP = 3, bujeL = 4; let puente = cilX(Rk, xTop - tP, xTop).add(tuboX(boca + 2.2, boca, xTop - tP - bujeL, xTop - tP + 0.01)).subtract(cilX(boca, xTop - tP - bujeL - 1, xTop + 1));
  [1, -1].forEach(sg => { puente = puente.subtract(cilX(1.5 + pres, xTop - 2.7, xTop + 0.01).translate([0, sg * (yS + (Rk - yS) / 2), 0])); });
  const pasador = cilY(p.cruceta / 2, -(Rk - 0.3), Rk - 0.3);
  // ---------- el piñón de ataque ----------
  let pinon = cuerpo(Pg, 2, Math.max(Pg.K.rIn, p.ejePinon / 2 + 1.5)).subtract(cil(p.ejePinon / 2 + pres, Pg.K.zIn + 6).translate([0, 0, -1])).rotate([90, 0, 0]);
  pinon = casa(pinon, 'y', 360 / Pg.K.z, [corona0]).m;
  // ---------- MONTAJE VIRTUAL ----------
  const prueba = [['Corona con el piñón de ataque', corona0, pinon], ['Planetarios con satélites', N.union([planD, planI]), N.union(sats)], ['Planetarios y satélites con la corona y la horquilla', internos, pieza],
    ['Planetarios y satélites con el disco-puente', internos, puente], ['Pasador con los planetarios', pasador, N.union([planD, planI])], ['Piñón con la horquilla y el disco', pinon, N.union([horquilla, puente])], ['Disco-puente con la horquilla (solo apoya)', puente, pieza.subtract(N.union([tet(1), tet(-1)]))]];
  const choques = prueba.map(([t, a, b]) => ({ t, vol: volCruce(a, b) }));
  choques.forEach(c => { if (c.vol > 0.05) err('CHOCAN: ' + c.t + ' (' + f2(c.vol) + ' mm³ se pisan).'); });
  const cor2 = G.conico({ z: p.zc, zPareja: p.zpi, m: p.m, alfa: A, juego: -(J + 0.08), b: p.b }).m.rotate([0, 90, 0]), engrana = volCruce(cor2, pinon) > 0.001;
  const engranaPl = volCruce(G.conico({ z: p.zpl, zPareja: p.zsa, m: p.ms, alfa: A, juego: -(J + 0.08) }).m.rotate([0, 90, 0]), sats[0]) > 0.0005;
  if (!engrana) err('La corona y el piñón no llegan a tocarse: revisa el módulo o los dientes.'); if (!engranaPl) err('Los planetarios y los satélites no llegan a tocarse.');
  if (choques.every(c => c.vol <= 0.05) && engrana && engranaPl) ok('Montaje virtual: ' + choques.length + ' comprobaciones sin choques; la corona ENGRANA con el piñón y los planetarios con los satélites (con el diente sin juego, se tocan).');
  if (Pg.K.z < 9) avi('Un piñón de ' + Pg.K.z + ' dientes es muy pequeño: dientes débiles (mejor 10 o más).');
  // para IMPRIMIR: la corona con la horquilla de espalda (brazos arriba), el disco plano, los engranajes por su espalda
  const enCama = m => { const b = N.caja(m); return m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]); };
  const piezasImprimir = [['Corona con la horquilla', enCama(pieza.rotate([0, 90, 0])), '#e2231a'], ['Disco-puente', enCama(puente.rotate([0, 90, 0])), '#ff8a3d'], ['Planetario', enCama(planD.rotate([0, 90, 0])), '#2457d6'], ['Planetario', enCama(planI.rotate([0, -90, 0])), '#2457d6'],
    ['Satélite', enCama(sats[0].rotate([-90, 0, 0])), '#29d3ff'], ['Satélite', enCama(sats[1].rotate([90, 0, 0])), '#29d3ff'], ['Piñón de ataque', enCama(pinon.rotate([90, 0, 0])), '#7c6cff'], ['Pasador (mejor de acero)', enCama(pasador.rotate([90, 0, 0])), '#b8bec4']];
  return { avisos, choques, engrana, engranaPl, partes: { pieza, corona, horquilla, puente, planD, planI, sats, pasador, pinon }, piezasImprimir,
    cuentas: { Rk, Rin, Xi, Xd, relacion: p.zc / p.zpi, ancho: 2 * Rk, alto: finD + Xi + 0.3 + tP + bujeL },
    lista: [[1, 'Pasador de acero Ø ' + f2(p.cruceta) + ' × ' + f2(2 * (Rk - 0.3)) + ' mm (o el impreso)'], [1, 'Eje del piñón Ø ' + f2(p.ejePinon)]] };
}
