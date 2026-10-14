// ================= 13-10-2026 · ⚙️ DIFERENCIAL DE ENGRANAJES RECTOS (y 🔒 BLOQUEADO, intercambiable) =================
// La dueña: «diseña más tipos de diferenciales a piezas que se puedan montar».
// El de siempre (diferencial.js) es CÓNICO: corona + piñón de ataque en ángulo y satélites cónicos. Este otro va TODO CON DIENTES
// RECTOS (como los de los robots y muchos coches impresos): se imprime plano, cada diente sale con la mejor calidad de la Bambu, es
// más fuerte y más fácil de montar.
// Cómo funciona: dos SOLES (uno por rueda) en el mismo eje, uno abajo y otro arriba; entre ellos, PAREJAS de satélites largos: el
// satélite A engrana con el sol de abajo y, en la franja de en medio, con su pareja B; B engrana arriba con el otro sol. Si la caja
// está quieta y giras una rueda, la otra gira al revés (sol → A → B → sol: dos cambios de sentido y otro más = al revés); si la caja
// gira (la mueve la corona de entrada), las dos ruedas van con ella y pueden ir a distinta velocidad en las curvas. Eso es un diferencial.
// Las reglas (se comprueban y se dice cómo arreglarlas):
//   · cada satélite A y su pareja B están a la distancia justa para engranar: ángulo entre ellos φ = 2·asen(zSat ÷ (zSol + zSat));
//   · lo de una pareja no toca lo de la de al lado (B de una con A de la siguiente);
//   · dientes del sol divisibles entre el número de parejas (si no, el sol de arriba no engrana a la vez con todas las B);
//   · el pasador cabe en el satélite y no roza los soles; cada sol, con su salida (hexágono, D o redonda) y su buje por la tapa.
// MONTAJE VIRTUAL como en la planetaria: cada satélite se gira hasta engranar (se MIDE el choque en 32 giros y se toma el centro de la
// ventana libre), después se mide que nada choque y que, con el diente 0,08 mm más gordo y sin juego, sí se toquen.
// El BLOQUEADO («spool», para drift y crawler: las dos ruedas siempre iguales) tiene la MISMA caja, corona y salidas: se cambia uno
// por otro sin tocar el coche. Diseño propio.
import * as N from './nucleo.js';
import * as G from './engranajes.js';
import { ENCAJES } from './motor.js';

const f = (x, d = 2) => G.fmt(x, d);
const cil = (d, h, z = 0) => N.forma3d('cilindro', { d, h }).translate([0, 0, z]);
const volCruce = (a, b) => { try { const v = a.intersect(b).volume(); return v > 0 ? v : 0; } catch (e) { return 0; } };
function agujero(forma, d, plano, h, z) {
  const C = N.CSX(); let s;
  if (forma === 'hex') s = N.cs([N.poligono2(6, d / Math.cos(Math.PI / 6), 0)], 'Positive');
  else { s = C.circle(d / 2, Math.max(48, Math.round(d * 6))); if (forma === 'd' && plano > 0 && plano < d) s = s.subtract(C.square([d, d]).translate([plano - d / 2, -d / 2])); }
  return s.extrude(h).translate([0, 0, z]);
}
// gira A (por la función) y mide el choque con B en «pasos» giros dentro de un paso de diente: el centro de la ventana sin choque
function fase(giraA, B, paso, pasos = 32) {
  const v = []; for (let j = 0; j < pasos; j++) v.push(volCruce(giraA(j / pasos * paso), B));
  const libres = v.map((x, j) => (x <= 1e-4 ? j : -1)).filter(j => j >= 0); if (!libres.length) { const j = v.indexOf(Math.min(...v)); return { g: j / pasos * paso, libre: false }; }
  let mejor = null; for (const j0 of libres) { if (libres.includes((j0 - 1 + pasos) % pasos) && libres.length < pasos) continue; let L = 0; while (L < pasos && v[(j0 + L) % pasos] <= 1e-4) L++; if (!mejor || L > mejor.L) mejor = { j0, L }; }
  return { g: ((mejor.j0 + (mejor.L - 1) / 2) % pasos) / pasos * paso, libre: true };
}

// p = { m, zs, zp, pares, b, alfa, juego, pin, salida, ejeSal, planoSal, zc (0 = el justo), bc, zpi, ejePinon, pared, bloqueado }
export function diferencialRectos(p) {
  const m = p.m || 1, zs = Math.round(p.zs || 18), zp = Math.round(p.zp || 9), pares = Math.max(2, Math.min(4, Math.round(p.pares || 3))), b = p.b || 6, alfa = Number(p.alfa) || 20, J = p.juego ?? 0.1;
  const gx = 0.4, g = 0.6, tp = 3, pared = Math.max(2, p.pared || 2.5), gira = ENCAJES.gira, presion = ENCAJES.presion, pin = p.pin || 3;
  const avisos = [], err = t => avisos.push({ n: 'error', t }), avi = t => avisos.push({ n: 'aviso', t }), ok = t => avisos.push({ n: 'ok', t });
  const gp = (z, extra = {}) => Object.assign({ por: 'modulo', m, z, alfa, juego: J, b }, extra);
  const Ks = G.numeros(gp(zs)), Kp = G.numeros(gp(zp)), a = Ks.r + Kp.r, phi = 2 * Math.asin(Kp.r / a) /* (distancia A–B = 2·rp) */;
  // ---------- las reglas ----------
  if (zs % pares) { const sug = []; for (let d = 1; d < 8 && sug.length < 3; d++) for (const s of [zs + d, zs - d]) if (s >= 10 && s % pares === 0 && !sug.includes(s)) sug.push(s); err('NO SE PUEDE MONTAR: los ' + zs + ' dientes del sol no se dividen entre ' + pares + ' parejas (el sol de arriba no engranaría con todas a la vez). Prueba con ' + sug.join(', ') + ' dientes.'); }
  const sep = 2 * a * Math.sin((2 * Math.PI / pares - phi) / 2) - 2 * Kp.ra; if (sep < 0.8) err('Las parejas se tocan entre ellas (quedan ' + f(Math.max(0, sep), 2) + ' mm entre la B de una y la A de la siguiente; hacen falta 0,8). Pon menos parejas, satélites más pequeños o un sol más grande.');
  const paredPl = Kp.rf - (pin / 2 + gira); if (paredPl < 0.9) err('El pasador (Ø ' + f(pin) + ') no cabe en un satélite de ' + zp + ' dientes: quedarían ' + f(Math.max(0, paredPl), 2) + ' mm de pared. Pasador más fino o más dientes.');
  if (a - pin / 2 - presion < Ks.ra + 0.5) err('El pasador de los satélites roza los dientes del sol: pon satélites con más dientes o un pasador más fino.');
  [['Sol', gp(zs)], ['Satélite', gp(zp)]].forEach(([n, P]) => G.revisaPieza(P).filter(x => x.n !== 'ok').forEach(x => avisos.push(Object.assign({}, x, { t: n + ': ' + x.t }))));
  [['Sol con satélite', G.casan(gp(zs), gp(zp), 'exterior')], ['Satélite con satélite', G.casan(gp(zp), gp(zp), 'exterior')]].forEach(([n, C]) => C.avisos.filter(x => x.n !== 'ok').forEach(x => avisos.push(Object.assign({}, x, { t: n + ': ' + x.t }))));
  // ---------- las medidas ----------
  const z1 = tp + gx, zS1 = [z1, z1 + b], zA = [z1, z1 + 2 * b + g], zB = [z1 + b + g, z1 + 3 * b + 2 * g], zS2 = [z1 + 2 * b + 2 * g, z1 + 3 * b + 2 * g], Hint = zS2[1] + gx, H = Hint + tp;
  const Rin = a + Kp.ra + 0.8, Rext = Rin + pared, dSal = p.ejeSal || 5, dHub = Math.max(dSal * 1.7 + 4, dSal + 6), lHub = 6;
  if (dHub / 2 > Ks.rf - 0.4) { const nuevo = Math.ceil((dHub / 2 + 0.4 + 1.25 * m) * 2 / m); err('La salida (Ø ' + f(dSal) + ') es grande para un sol de ' + zs + ' dientes: su buje no cabe. Pon el sol de ' + nuevo + ' dientes o más.'); }
  // la corona de ENTRADA: recta, por fuera de la caja (la mueve un piñón recto: ejes paralelos, sin ángulos)
  const zcMin = Math.ceil((Rext + 1.6) * 2 / m + 2.5), zc = Math.max(p.zc || 0, zcMin), Kc = G.numeros(gp(zc)), bc = Math.min(p.bc || 8, Hint - 2), zpi = Math.round(p.zpi || 13), Kpi = G.numeros(gp(zpi)), ac = Kc.r + Kpi.r;
  if (p.zc && p.zc < zcMin) avi('Con ' + p.zc + ' dientes la corona de entrada no cabe por fuera de la caja (Ø ' + f(2 * Rext, 1) + '): uso ' + zc + '.');
  const cuentas = { faseSol2: null, a, phi: phi * 180 / Math.PI, Rext, H, zc, zpi, ac, i: zc / zpi, dHub, salida: (p.salida || 'hex') + ' ' + f(dSal) };
  if (avisos.some(x => x.n === 'error')) return { avisos, cuentas };

  // ---------- la caja (vaso con la corona por fuera) y la tapa ----------
  const posA = k => { const t = 2 * Math.PI * k / pares; return [a * Math.cos(t), a * Math.sin(t)]; }, posB = k => { const t = 2 * Math.PI * k / pares + phi; return [a * Math.cos(t), a * Math.sin(t)]; };
  const zcI = (Hint - bc) / 2; // la corona de entrada, centrada en la altura de la caja
  let caja = cil(2 * Rext, Hint).subtract(cil(2 * Rin, Hint, tp)), corona = G.engranaje(gp(zc, { b: bc })).m.translate([0, 0, zcI]);
  corona = corona.subtract(cil(2 * Rext - 0.2, bc + 2, zcI - 1)); caja = caja.add(corona).add(cil(2 * Kc.rf + 0.4, bc, zcI).subtract(cil(2 * Rext - 0.5, bc + 2, zcI - 1))); // (el aro bajo los dientes, pegado a la caja)
  caja = caja.subtract(cil(dHub + 2 * gira, tp + 2, -1)); // el paso del buje del sol de abajo
  const pinesXY = []; for (let k = 0; k < pares; k++) pinesXY.push(posA(k), posB(k));
  pinesXY.forEach(([x, y]) => { caja = caja.subtract(cil(pin + 2 * presion, tp - 0.8 + 0.02, 0.8).translate([x, y, 0])); }); // ciegos: abiertos hacia dentro (a presión), cerrados por fuera 0,8
  // la tapa: un disco que apoya en el borde del vaso; la centran y la sujetan los propios pasadores (a presión en sus agujeros ciegos)
  let tapa = cil(2 * Rext, tp, Hint).subtract(cil(dHub + 2 * gira, tp + 2, Hint - 1));
  pinesXY.forEach(([x, y]) => { tapa = tapa.subtract(cil(pin + 2 * presion, tp - 0.8 + 0.01, Hint - 0.01).translate([x, y, 0])); });

  // ---------- 🔒 bloqueado: un solo tambor con las dos salidas, la misma corona y la misma caja por fuera ----------
  if (p.bloqueado) {
    let tambor = cil(2 * Rext, H).add(corona);
    [[-lHub, true], [H, false]].forEach(([z]) => { tambor = tambor.add(cil(dHub, lHub, z)); });
    tambor = tambor.subtract(agujero(p.salida || 'hex', dSal + 2 * presion, (p.planoSal || 0) + presion, lHub + 8, -lHub - 0.01)).subtract(agujero(p.salida || 'hex', dSal + 2 * presion, (p.planoSal || 0) + presion, lHub + 8, H - 8 + 0.01));
    tambor = tambor.subtract(cil(dSal * 0.6, H - 16, 8)); // (aligerado por dentro)
    const pinon = G.engranaje(gp(zpi, { b: bc, eje: p.ejePinon || 5, ejeForma: 'd', plano: (p.ejePinon || 5) * 0.9, holgura: presion })).m;
    const fp = fase(gg => pinon.rotate([0, 0, gg]).translate([ac, 0, zcI]), tambor, 360 / zpi), pin1 = pinon.rotate([0, 0, fp.g]).translate([ac, 0, zcI]);
    const ch = volCruce(pin1, tambor); if (ch > 0.05) err('CHOCAN: el piñón de entrada con la corona (' + f(ch) + ' mm³).'); else ok('Montaje virtual: el piñón de entrada engrana con la corona sin chocar. Las dos ruedas giran SIEMPRE juntas (bloqueado).');
    const enCama = mm => { const B = N.caja(mm); return mm.translate([-(B.min[0] + B.max[0]) / 2, -(B.min[1] + B.max[1]) / 2, -B.min[2]]); };
    return { avisos, cuentas, choques: [{ t: 'Piñón con la corona', vol: ch }], engrana: ch <= 0.05, partes: { tambor, pinon: pin1 }, piezasImprimir: [['Diferencial bloqueado (una pieza)', enCama(tambor), '#e2231a'], ['Piñón de entrada', enCama(pinon), '#ff8a3d']], lista: [[1, 'Nada más: es una sola pieza (más el piñón)']] };
  }

  // ---------- los soles (con su salida y su buje), los satélites y los pasadores ----------
  const solB = G.engranaje(gp(zs)).m, satB = G.engranaje(gp(zp, { eje: pin, holgura: gira })).m;
  const tope = Math.min(2 * Ks.rf - 0.6, 2 * (a - Kp.ra - 0.6)); // el tetón del centro que separa los dos soles (pasa por dentro de los satélites)
  const midZ = (zS1[1] + zS2[0]) / 2;
  const hazSol = abajo => { const z0 = abajo ? zS1[0] : zS2[0]; let s = solB.translate([0, 0, z0]);
    s = abajo ? s.add(cil(dHub, z0 + lHub + 0.01, -lHub)).add(cil(tope, midZ - 0.1 - zS1[1] + 0.01, zS1[1] - 0.01)) : s.add(cil(dHub, H + lHub - zS2[1] + 0.01, zS2[1] - 0.01)).add(cil(tope, zS2[0] - midZ - 0.1 + 0.01, midZ + 0.1));
    return s.subtract(agujero(p.salida || 'hex', dSal + 2 * presion, (p.planoSal || 0) + presion, H + 2 * lHub + 4, -lHub - 2)); };
  let sol1 = hazSol(true);
  const largoA = zA[1] - zA[0], largoB = zB[1] - zB[0], satA0 = G.engranaje(gp(zp, { b: largoA, eje: pin, holgura: gira })).m, satB0 = G.engranaje(gp(zp, { b: largoB, eje: pin, holgura: gira })).m;
  const paso = 360 / zp, gA = [], gB = [];
  const sol1Dientes = solB.translate([0, 0, zS1[0]]);
  // la pareja 1 se monta MIDIENDO (A contra el sol de abajo, B contra A); las demás son la misma pareja girada alrededor del eje: como
  // los dientes del sol se dividen entre las parejas, el sol se ve igual desde cada una (así engranan todas a la vez, como en la realidad)
  { const [x, y] = posA(0); gA.push(fase(gg => satB.rotate([0, 0, gg]).translate([x, y, zS1[0]]), sol1Dientes, paso).g); }
  let A0 = (() => { const [x, y] = posA(0); return satA0.rotate([0, 0, gA[0]]).translate([x, y, zA[0]]); })();
  { const [x, y] = posB(0); gB.push(fase(gg => satB0.rotate([0, 0, gg]).translate([x, y, zB[0]]), A0, paso).g); }
  let B0 = (() => { const [x, y] = posB(0); return satB0.rotate([0, 0, gB[0]]).translate([x, y, zB[0]]); })();
  // p.mueve (grados): se GIRA el sol de abajo con la caja quieta, y todo lo demás lo que le toca (A al revés ×zs/zp, B a favor, el sol
  // de arriba al revés): sirve para comprobar que el mecanismo se MUEVE sin chocar, no solo que monta
  const d = p.mueve || 0, rotEn = (mm, [x, y], ang) => mm.translate([-x, -y, 0]).rotate([0, 0, ang]).translate([x, y, 0]);
  if (d) { sol1 = sol1.rotate([0, 0, d]); A0 = rotEn(A0, posA(0), -d * zs / zp); B0 = rotEn(B0, posB(0), d * zs / zp); }
  const A = k => (k ? A0.rotate([0, 0, 360 * k / pares]) : A0), B = k => (k ? B0.rotate([0, 0, 360 * k / pares]) : B0);
  const Bs = N.union(Array.from({ length: pares }, (_, k) => B(k))), As = N.union(Array.from({ length: pares }, (_, k) => A(k)));
  const f2 = d ? (p.faseSol2 != null ? { g: p.faseSol2 - d, libre: true } : fase(gg => solB.rotate([0, 0, gg]).translate([0, 0, zS2[0]]), Bs, 360 / zs, 48)) : fase(gg => solB.rotate([0, 0, gg]).translate([0, 0, zS2[0]]), Bs, 360 / zs, 48); const sol2 = hazSol(false).rotate([0, 0, f2.g]);
  if (!f2.libre) err('El sol de arriba no encuentra hueco para engranar con todas las B a la vez: cambia los dientes del sol (múltiplo de ' + pares + ').');
  const largoPin = Hint + tp - 1.6, pines = pinesXY.map(([x, y]) => cil(pin, largoPin, 0.8).translate([x, y, 0])); // de fondo a fondo de sus agujeros
  const pinon = G.engranaje(gp(zpi, { b: bc, eje: p.ejePinon || 5, ejeForma: 'd', plano: (p.ejePinon || 5) * 0.9, holgura: presion })).m;
  const fp = fase(gg => pinon.rotate([0, 0, gg]).translate([ac, 0, zcI]), caja, 360 / zpi), pinonM = pinon.rotate([0, 0, fp.g]).translate([ac, 0, zcI]);

  // ---------- montaje virtual ----------
  const soles = sol1.add(sol2), Pines = N.union(pines);
  const prueba = [['Sol de abajo con los satélites A', sol1, As], ['Sol de arriba con los satélites B', sol2, Bs], ['Sol de abajo con los B (no deben tocarse)', sol1, Bs], ['Sol de arriba con los A (no deben tocarse)', sol2, As],
    ['Satélites A con B', As, Bs], ['Satélites con la caja', As.add(Bs), caja], ['Satélites con la tapa', As.add(Bs), tapa], ['Los dos soles entre sí', sol1, sol2], ['Soles con la caja', soles, caja], ['Soles con la tapa', soles, tapa],
    ['Pasadores con los soles', Pines, soles], ['Piñón de entrada con la corona', pinonM, caja], ['Tapa con la caja (solo apoya)', tapa, caja]];
  const choques = prueba.map(([t, X, Y]) => ({ t, vol: volCruce(X, Y) }));
  choques.forEach(c => { if (c.vol > 0.05) err('CHOCAN: ' + c.t + ' (' + f(c.vol) + ' mm³ se pisan).'); });
  // ¿engranan de verdad? con el diente 0,08 mm más gordo y sin juego: sol–A, A–B y B–sol de arriba SE TOCAN
  const gordo = { juego: -(J + 0.08) }, sG = G.engranaje(gp(zs, gordo)).m, aG = G.engranaje(gp(zp, gordo)).m, [ax, ay] = posA(0), [bx, by] = posB(0);
  const t1 = volCruce(sG, aG.rotate([0, 0, gA[0]]).translate([ax, ay, 0])) > 0.0005, t2 = volCruce(aG.rotate([0, 0, gA[0]]).translate([ax, ay, 0]), aG.rotate([0, 0, gB[0]]).translate([bx, by, 0])) > 0.0005, t3 = volCruce(sG.rotate([0, 0, f2.g]), aG.rotate([0, 0, gB[0]]).translate([bx, by, 0])) > 0.0005;
  const engrana = t1 && t2 && t3; if (!engrana) err('Los dientes no llegan a tocarse (' + [t1 ? '' : 'sol–A', t2 ? '' : 'A–B', t3 ? '' : 'B–sol'].filter(Boolean).join(', ') + '): revisa el módulo y los dientes.');
  if (choques.every(c => c.vol <= 0.05) && engrana) ok('Montaje virtual: ' + choques.length + ' comprobaciones sin choques; sol–A, A–B y B–sol ENGRANAN (con el diente sin juego, se tocan). Con la caja quieta, una rueda gira al revés que la otra: es un diferencial.');
  cuentas.faseSol2 = f2.g + d;
  if (pin < 2.5) avi('Pasadores de Ø ' + f(pin) + ': impresos son débiles. Mejor de ACERO (varilla o clavo de esa medida).');
  const enCama = mm => { const Bx = N.caja(mm); return mm.translate([-(Bx.min[0] + Bx.max[0]) / 2, -(Bx.min[1] + Bx.max[1]) / 2, -Bx.min[2]]); };
  const piezasImprimir = [['Caja con la corona de entrada', enCama(caja), '#e2231a'], ['Tapa (entra a presión)', enCama(tapa.rotate([180, 0, 0])), '#ff8a3d'], ['Sol de abajo (salida)', enCama(sol1), '#2457d6'], ['Sol de arriba (salida)', enCama(sol2.rotate([180, 0, 0])), '#2457d6'],
    ...Array.from({ length: pares }, (_, k) => ['Satélite A (largo)', enCama(A(k)), '#29d3ff']), ...Array.from({ length: pares }, (_, k) => ['Satélite B (largo)', enCama(B(k)), '#7c6cff']), ['Piñón de entrada', enCama(pinon), '#ff8a3d'], ...pines.map(q => ['Pasador (mejor de acero)', enCama(q), '#b8bec4'])];
  return { avisos, choques, engrana, cuentas, partes: { caja, tapa, soles, sol1, sol2, satA: As, satB: Bs, pines: Pines, pinon: pinonM }, piezasImprimir,
    lista: [[2 * pares, 'Pasador de acero Ø ' + f(pin) + ' × ' + f(largoPin, 1) + ' mm (o los impresos)'], [1, 'Eje del piñón Ø ' + f(p.ejePinon || 5) + ' en D']] };
}
// la prueba: el sol, un satélite y una pareja de satélites con 3 mm de alto, para ver que engranan antes de imprimir la caja
export function pruebaRectos(p) {
  const gp = (z, e = {}) => Object.assign({ por: 'modulo', m: p.m || 1, z, alfa: Number(p.alfa) || 20, juego: p.juego || 0, b: 3 }, e);
  return [{ m: G.engranaje(gp(Math.round(p.zs || 18), { eje: p.ejeSal || 5, ejeForma: p.salida === 'redondo' ? 'redondo' : p.salida === 'd' ? 'd' : 'hex', plano: p.planoSal, holgura: ENCAJES.presion })).m, nombre: 'sol_prueba' },
    { m: G.engranaje(gp(Math.round(p.zp || 9), { eje: p.pin || 3, holgura: ENCAJES.gira })).m, nombre: 'satelite_prueba_1' }, { m: G.engranaje(gp(Math.round(p.zp || 9), { eje: p.pin || 3, holgura: ENCAJES.gira })).m, nombre: 'satelite_prueba_2' }];
}
