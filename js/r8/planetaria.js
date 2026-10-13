// ================= 13-10-2026 · 🪐 REDUCTORA PLANETARIA DE PRECISIÓN (con su carcasa) =================
// La dueña: «poder hacer cajas reductoras planetarias … tiene que ser preciso … no quiero fallos».
// Una, dos o tres etapas dentro de una CARCASA que ya lleva la corona (los dientes por dentro), con su TAPA, el soporte del motor
// (NEMA 17 o el tuyo, con sus medidas) y la salida (agujero para tu eje: hexágono, D o redondo). Todo con la geometría de evolvente
// exacta de engranajes.js y tu calibración de engranajes (lo que engorda tu impresora el diente).
// Las reglas que tiene que cumplir una planetaria (se comprueban y se dice cómo arreglarlas):
//   · corona = sol + 2 × planeta (si no, los planetas no tocan a la vez el sol y la corona);
//   · (sol + corona) ÷ planetas = número entero (si no, los planetas no quedan repartidos por igual: no se puede montar);
//   · los planetas no se tocan entre ellos (2·a·sen(180°/n) > Ø exterior del planeta + 1 mm);
//   · relación de contacto, socavado, punta afilada… (engranajes.js).
// Y el MONTAJE VIRTUAL: cada planeta se gira hasta el punto en que engrana (se prueban 32 giros y se MIDE el choque: se elige el
// centro de la ventana sin choque, no una fórmula), lo mismo la corona; después se mide que nada choque (sol, planetas, corona,
// portaplanetas, tapa) y que, con el diente 0,08 mm más gordo y sin juego, SÍ se toquen (prueba de que engranan de verdad).
// Diseño propio. Los pasadores de los planetas, mejor de ACERO (varilla o tornillo de esa medida); también se pueden imprimir.
import * as N from './nucleo.js';
import * as G from './engranajes.js';
import { ENCAJES } from './motor.js';

const f = (x, d = 2) => G.fmt(x, d);
const cil = (d, h, z = 0, n) => N.forma3d('cilindro', { d, h }).translate([0, 0, z]);
const volCruce = (a, b) => { try { const v = a.intersect(b).volume(); return v > 0 ? v : 0; } catch (e) { return 0; } };
// agujero para un eje: redondo, en D (con su plano) o hexagonal (medido entre caras)
function agujero(forma, d, plano, h, z) {
  const C = N.CSX(); let s;
  if (forma === 'hex') s = N.cs([N.poligono2(6, d / Math.cos(Math.PI / 6), 0)], 'Positive');
  else { s = C.circle(d / 2, Math.max(48, Math.round(d * 6))); if (forma === 'd' && plano > 0 && plano < d) s = s.subtract(C.square([d, d]).translate([plano - d / 2, -d / 2])); }
  return s.extrude(h).translate([0, 0, z]);
}
export const MOTORES = { ninguno: null, nema17: { t: 'NEMA 17 (paso a paso)', ag: 31, tor: 3.4, boss: 22.4, eje: 5, plano: 4.5 } };

// p = { m, zs, zp, np, alfa, juego, b, etapas, ejeSol, formaSol, planoSol, pin, salida, ejeSal, planoSal, motor, mAg, mTor, mBoss, pared, holgAx }
export function planetaria(p) {
  const zs = Math.round(p.zs), zp = Math.round(p.zp), np = Math.round(p.np), zr = zs + 2 * zp, m = p.m, alfa = Number(p.alfa) || 20, J = p.juego || 0;
  const etapas = Math.max(1, Math.min(3, Math.round(p.etapas || 1))), b = p.b, gx = p.holgAx ?? 0.4, pared = Math.max(2, p.pared || 3), gira = ENCAJES.gira, presion = ENCAJES.presion;
  const avisos = [], err = t => avisos.push({ n: 'error', t }), avi = t => avisos.push({ n: 'aviso', t }), ok = t => avisos.push({ n: 'ok', t });
  const gp = (z, extra = {}) => Object.assign({ por: 'modulo', m, z, alfa, juego: J, b }, extra);
  const Ks = G.numeros(gp(zs)), Kp = G.numeros(gp(zp)), Kr = G.numeros(gp(zr)), a = Ks.r + Kp.r; // distancia del centro a cada planeta
  // ---------- las reglas ----------
  if ((zs + zr) % np) { const sug = []; for (let d = 1; d < 6 && sug.length < 3; d++) for (const s of [zs + d, zs - d]) if (s >= 8 && (2 * s + 2 * zp) % np === 0 && !sug.includes(s)) sug.push(s); err('NO SE PUEDE MONTAR: (sol ' + zs + ' + corona ' + zr + ') = ' + (zs + zr) + ' no se divide entre ' + np + ' planetas. Prueba con ' + sug.map(s => s + ' dientes en el sol').join(' o ') + ' (o cambia los del planeta).'); }
  const huecoPl = 2 * a * Math.sin(Math.PI / np) - 2 * Kp.ra; if (huecoPl < 1) err('Los planetas se tocan entre ellos (quedan ' + f(Math.max(0, huecoPl), 2) + ' mm entre sus puntas; hacen falta más de 1). Pon menos planetas o un planeta más pequeño.');
  [['Sol', gp(zs)], ['Planeta', gp(zp)]].forEach(([n, P]) => G.revisaPieza(P).filter(x => x.n !== 'ok').forEach(x => avisos.push(Object.assign({}, x, { t: n + ': ' + x.t }))));
  const cSP = G.casan(gp(zs), gp(zp), 'exterior'), cPR = G.casan(gp(zp), gp(zr), 'interior');
  [['Sol con planeta', cSP], ['Planeta con corona', cPR]].forEach(([n, C]) => C.avisos.filter(x => x.n !== 'ok').forEach(x => avisos.push(Object.assign({}, x, { t: n + ': ' + x.t }))));
  const pin = p.pin || 3, Dpl = 2 * Kp.rf - (pin + 2 * gira); if (Dpl < 1.6) err('El pasador de los planetas (Ø ' + f(pin) + ') es demasiado gordo para un planeta de ' + zp + ' dientes: quedan ' + f(Math.max(0, Dpl / 2), 2) + ' mm de pared. Usa un pasador más fino o más dientes.');
  if (avisos.some(x => x.n === 'error')) return { avisos, cuentas: cuentas() };
  function cuentas() { const i1 = 1 + zr / zs; return { zr, a, i1, i: Math.pow(i1, etapas), rPuntaCorona: Kr.r - m, Rext: 0 }; }

  // ---------- las medidas de la carcasa ----------
  const rRaiz = Kr.r + 1.25 * m, Rext = rRaiz + pared, hz = b + 2 * gx; // cada etapa: dientes + aire arriba y abajo
  const tb = 3, tc = 3.2, tl = 3, rPuntaR = Kr.r - m, rCarrier = Math.min(rPuntaR - 0.6, a + pin / 2 + 3.2); // portaplanetas: el plato pasa por dentro de las puntas de la corona
  if (a + pin / 2 + 1.2 > rPuntaR - 0.6) { err('El portaplanetas no cabe dentro de la corona: los pasadores quedan demasiado cerca de las puntas. Usa un pasador más fino o planetas con más dientes.'); return { avisos, cuentas: cuentas() }; }
  // las alturas, de abajo arriba: suelo (tb) · aire · dientes de la etapa (b) · aire · plato del portaplanetas (tc) · aire · dientes de
  // la siguiente… · plato del último · aire · tapa. zD(e) = suelo de los dientes de la etapa e; zP(e) = suelo de su portaplanetas.
  const zD = e => tb + gx + e * (b + gx + tc + gx), zP = e => zD(e) + b + gx;
  const altoCorona = zP(etapas - 1) - tb; // la corona cubre los dientes de todas las etapas (y los platos de en medio, que pasan por dentro)
  const Hcarcasa = zP(etapas - 1) + tc + gx; // la tapa apoya encima
  const orejas = [0, 1, 2].map(i => i * 2 * Math.PI / 3 + Math.PI / 6), rOreja = Rext + 2.6, dOreja = 8.2;
  const fase = (A, B, giraA, pasos = 32, paso) => { // gira A (alrededor de su centro, por la función giraA) y mide el choque con B: el centro de la ventana libre
    const v = []; for (let j = 0; j < pasos; j++) v.push(volCruce(giraA(j / pasos * paso), B));
    const libres = v.map((x, j) => x <= 1e-4 ? j : -1).filter(j => j >= 0); if (!libres.length) { const j = v.indexOf(Math.min(...v)); return j / pasos * paso; }
    // la ventana libre más larga (dando la vuelta)
    let mejor = null; for (const j0 of libres) { if (libres.includes((j0 - 1 + pasos) % pasos) && libres.length < pasos) continue; let L = 0; while (L < pasos && v[(j0 + L) % pasos] <= 1e-4) L++; if (!mejor || L > mejor.L) mejor = { j0, L }; }
    return ((mejor.j0 + (mejor.L - 1) / 2) % pasos) / pasos * paso;
  };

  // ---------- las piezas de cada etapa ----------
  const sol0 = G.engranaje(gp(zs, { eje: 0 })).m, planetaB = G.engranaje(gp(zp, { eje: pin, holgura: gira })).m;
  const solesM = [], planetasM = [], portas = [], pasadores = [];
  const corona1 = G.corona(gp(zr, { aro: pared, b: altoCorona })).m; // una corona alta que sirve a todas las etapas
  // giros: el sol se queda quieto; cada planeta se gira hasta engranar con él; la corona, hasta engranar con los planetas
  const posPl = i => [a * Math.cos(2 * Math.PI * i / np), a * Math.sin(2 * Math.PI * i / np)];
  const pasoP = 2 * Math.PI / zp * 180 / Math.PI, pasoR = 2 * Math.PI / zr * 180 / Math.PI;
  const giros = []; for (let i = 0; i < np; i++) { const [x, y] = posPl(i); giros.push(fase(null, sol0, g => planetaB.rotate([0, 0, g]).translate([x, y, 0]), 32, pasoP)); }
  const plEn = (i, z) => { const [x, y] = posPl(i); return planetaB.rotate([0, 0, giros[i]]).translate([x, y, z]); };
  const pl0 = N.union(Array.from({ length: np }, (_, i) => plEn(i, 0))), corB = G.corona(gp(zr, { aro: pared, b })).m;
  const giroR = fase(null, pl0, g => corB.rotate([0, 0, g]), 32, pasoR);
  const corona = corona1.rotate([0, 0, giroR]).translate([0, 0, tb]); // (la corona empieza encima del suelo)
  for (let e = 0; e < etapas; e++) {
    const z0 = zD(e); // los dientes de esta etapa
    // el sol: en la 1.ª, con el agujero del motor; en las demás, va pegado al portaplanetas de la etapa de abajo
    let sol = sol0.translate([0, 0, z0]);
    if (e === 0) sol = sol.add(cil(Math.min(2 * Ks.rf - 0.6, (p.ejeSol || 5) + 6), gx + tb - 0.6, z0 - gx - tb + 0.6)).subtract(agujero(p.formaSol || 'd', (p.ejeSol || 5) + 2 * presion, (p.planoSol || 0) + presion, tb + hz + 2, -1));
    solesM.push(sol);
    for (let i = 0; i < np; i++) planetasM.push(plEn(i, z0));
    // el portaplanetas: plato encima de los dientes con los agujeros de los pasadores (a presión, ciegos desde abajo) y, arriba, el sol
    // de la etapa siguiente o el buje de salida
    const zc = zP(e); let porta = cil(2 * rCarrier, tc, zc);
    for (let i = 0; i < np; i++) { const [x, y] = posPl(i); porta = porta.subtract(cil(pin + 2 * presion, tc - 0.8 + 0.01, zc - 0.01).translate([x, y, 0])); }
    if (e < etapas - 1) porta = porta.add(sol0.translate([0, 0, zD(e + 1)])).add(cil(Math.min(2 * Ks.rf - 0.6, 10), zD(e + 1) - (zc + tc) + 0.02, zc + tc - 0.01)); // el sol de la etapa de arriba, pegado por un cuello
    else { const dSal = (p.ejeSal || 5), dBuje = Math.max(dSal * 1.7 + 4, dSal + 6), hBuje = gx + tl + 6; porta = porta.add(cil(dBuje, hBuje + 0.01, zc + tc - 0.01)).subtract(agujero(p.salida || 'hex', dSal + 2 * presion, (p.planoSal || 0) + presion, tc + hBuje + 1, zc + 0.8)); porta.dBuje = dBuje; portas.dBuje = dBuje; }
    portas.push(porta);
    // los pasadores (se imprimen aparte o se ponen de acero): del fondo del agujero del portaplanetas al suelo del planeta
    const largo = (tc - 0.8) + gx + b - 0.2; for (let i = 0; i < np; i++) { const [x, y] = posPl(i); pasadores.push(cil(pin, largo, zc + tc - 0.8 - largo).translate([x, y, 0])); }
  }
  // ---------- la carcasa: suelo + la corona + las orejas de los tornillos (+ el motor) ----------
  let carcasa = cil(2 * Rext, tb + 0.01).add(corona);
  carcasa = carcasa.add(N.forma3d('tubo', { d: 2 * Rext, interior: 2 * (rRaiz + 0.4), h: Hcarcasa - tb - altoCorona }).translate([0, 0, tb + altoCorona]));
  orejas.forEach(t => { carcasa = carcasa.add(cil(dOreja, Hcarcasa).translate([rOreja * Math.cos(t), rOreja * Math.sin(t), 0])).add(N.forma3d('caja', { x: 2.6 + 2, y: dOreja, z: Hcarcasa, radio: 0 }).rotate([0, 0, t * 180 / Math.PI]).translate([(Rext + 0.6) * Math.cos(t), (Rext + 0.6) * Math.sin(t), 0])); });
  orejas.forEach(t => { carcasa = carcasa.subtract(cil(2.5, Hcarcasa - 1.2, 1.2).translate([rOreja * Math.cos(t), rOreja * Math.sin(t), 0])); }); // M3 roscado en el plástico (ciego desde arriba)
  // el paso del eje del motor por el suelo, y el motor
  const M = p.motor === 'nema17' ? MOTORES.nema17 : p.motor === 'propio' ? { ag: p.mAg, tor: p.mTor || 3.4, boss: p.mBoss || 0 } : null;
  carcasa = carcasa.subtract(cil(Math.max((p.ejeSol || 5) + 2 * 1, Math.min(2 * Ks.rf - 0.6, (p.ejeSol || 5) + 6) + 2 * 0.6), tb + 2, -1));
  if (M) { if (M.boss > 0) carcasa = carcasa.subtract(cil(M.boss + 0.4, 2, -0.01)); if (M.ag > 0) [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => { const x = sx * M.ag / 2, y = sy * M.ag / 2; if (Math.hypot(x, y) < Rext - 1) carcasa = carcasa.subtract(cil(M.tor, tb + 2, -1).translate([x, y, 0])).subtract(cil(M.tor * 1.9, 1.6, tb - 1.6 + 0.01).translate([x, y, 0])); else avi('El motor tiene los tornillos a ' + f(M.ag) + ' mm: se salen de la carcasa (Ø ' + f(2 * Rext, 1) + '). Hazla más grande (más dientes o más pared) o pon un adaptador.'); }); }
  // la tapa
  let tapa = cil(2 * Rext, tl, Hcarcasa); orejas.forEach(t => { tapa = tapa.add(cil(dOreja, tl, Hcarcasa).translate([rOreja * Math.cos(t), rOreja * Math.sin(t), 0])).add(N.forma3d('caja', { x: 4.6, y: dOreja, z: tl, radio: 0 }).rotate([0, 0, t * 180 / Math.PI]).translate([(Rext + 0.6) * Math.cos(t), (Rext + 0.6) * Math.sin(t), Hcarcasa])); });
  tapa = tapa.subtract(cil((portas.dBuje || 10) + 2 * 0.5, tl + 2, Hcarcasa - 1)); orejas.forEach(t => { tapa = tapa.subtract(cil(3.4, tl + 2, Hcarcasa - 1).translate([rOreja * Math.cos(t), rOreja * Math.sin(t), 0])).subtract(cil(6.2, 1.8, Hcarcasa + tl - 1.8 + 0.01).translate([rOreja * Math.cos(t), rOreja * Math.sin(t), 0])); });

  // ---------- montaje virtual ----------
  const soles = N.union(solesM), planetas = N.union(planetasM), porta = N.union(portas), pas = N.union(pasadores);
  const prueba = [['Sol con los planetas', soles, planetas], ['Planetas con la corona y la carcasa', planetas, carcasa], ['Planetas entre sí', ...(() => { const imp = planetasM.filter((x, i) => i % 2 === 0), par = planetasM.filter((x, i) => i % 2 === 1); return [N.union(imp), par.length ? N.union(par) : N.forma3d('caja', { x: 0.01, y: 0.01, z: 0.01, radio: 0 }).translate([999, 0, 0])]; })()],
    ['Portaplanetas con la carcasa', porta, carcasa], ['Portaplanetas con los planetas', porta, planetas], ['Sol con la carcasa', soles, carcasa], ['Tapa con el portaplanetas', tapa, porta], ['Tapa con la carcasa (solo apoya)', tapa, carcasa]];
  const choques = prueba.map(([t, A, B]) => ({ t, vol: volCruce(A, B) }));
  choques.forEach(c => { if (c.vol > 0.05) err('CHOCAN: ' + c.t + ' (' + f(c.vol) + ' mm³ se pisan).'); });
  // ¿engranan de verdad? con el diente 0,08 mm más gordo y sin juego, el sol y el planeta 1, y el planeta 1 y la corona, SE TOCAN
  const gordo = { juego: -(J + 0.08) }, solG = G.engranaje(gp(zs, gordo)).m, plG = G.engranaje(gp(zp, gordo)).m.rotate([0, 0, giros[0]]).translate([posPl(0)[0], posPl(0)[1], 0]), corG = G.corona(gp(zr, Object.assign({ aro: pared }, gordo))).m.rotate([0, 0, giroR]);
  const engrana = volCruce(solG, plG) > 0.0005 && volCruce(plG, corG) > 0.0005;
  if (!engrana) err('Los dientes no llegan a tocarse (sol, planeta y corona): revisa el módulo y los dientes.');
  if (choques.every(c => c.vol <= 0.05) && engrana) ok('Montaje virtual: ' + choques.length + ' comprobaciones sin choques; el sol, los planetas y la corona ENGRANAN (con el diente sin juego, se tocan).');
  if (pin < 2.5) avi('Pasadores de Ø ' + f(pin) + ': impresos son débiles. Mejor de ACERO (varilla, clavo o tornillo de esa medida).');
  const C = cuentas(); C.Rext = Rext; C.H = Hcarcasa + tl; C.giros = giros; C.giroR = giroR;
  // para IMPRIMIR: cada pieza sobre su cara plana (la carcasa por el suelo, la tapa del revés, los portaplanetas por el plato)
  const enCama = m => { const B = N.caja(m); return m.translate([-(B.min[0] + B.max[0]) / 2, -(B.min[1] + B.max[1]) / 2, -B.min[2]]); };
  const piezasImprimir = [['Carcasa con la corona', enCama(carcasa), '#e2231a'], ['Tapa', enCama(tapa.rotate([180, 0, 0])), '#ff8a3d'], ...solesM.slice(0, 1).map(s => ['Sol (motor)', enCama(s), '#2457d6']),
    ...portas.map((q, e) => ['Portaplanetas ' + (e + 1) + (e < etapas - 1 ? ' (con el sol de la etapa ' + (e + 2) + ')' : ' (salida)'), enCama(q.translate([0, 0, 0])), '#7c6cff']),
    ...planetasM.map((q, i) => ['Planeta', enCama(q), '#29d3ff']), ...pasadores.map(q => ['Pasador (mejor de acero)', enCama(q), '#b8bec4'])];
  return { avisos, choques, engrana, cuentas: C, partes: { carcasa, tapa, soles, planetas, porta, pasadores: pas }, piezasImprimir,
    lista: [[pasadores.length, 'Pasador de acero Ø ' + f(pin) + ' × ' + f((tc - 0.8) + gx + b - 0.2, 1) + ' mm (o los impresos)'], [3, 'Tornillo M3 × ' + Math.round(tl + 8) + ' mm (tapa)']].concat(M ? [[4, 'Tornillo M3 para el motor']] : []) };
}
// una prueba rápida: el sol y un planeta con 3 mm de alto, y un cuarto de la corona, para ver que engranan antes de imprimirla entera
export function pruebaPlanetaria(p) {
  const zs = Math.round(p.zs), zp = Math.round(p.zp), zr = zs + 2 * zp, gp = (z, e = {}) => Object.assign({ por: 'modulo', m: p.m, z, alfa: Number(p.alfa) || 20, juego: p.juego || 0, b: 3 }, e);
  const Kr = G.numeros(gp(zr)), Rext = Kr.r + 1.25 * p.m + Math.max(2, p.pared || 3);
  const cuarto = G.corona(gp(zr, { aro: Math.max(2, p.pared || 3) })).m.intersect(N.forma3d('caja', { x: Rext + 2, y: Rext + 2, z: 10, radio: 0 }).translate([Rext / 2, Rext / 2, 0]));
  return [{ m: G.engranaje(gp(zs, { eje: p.ejeSol || 0, ejeForma: p.formaSol, plano: p.planoSol, holgura: ENCAJES.presion })).m, nombre: 'sol_prueba' }, { m: G.engranaje(gp(zp, { eje: p.pin || 3, holgura: ENCAJES.gira })).m, nombre: 'planeta_prueba' }, { m: cuarto, nombre: 'corona_cuarto' }];
}
