// ================= v30.5 · 🏎️ CHASIS RC: de bañera, de doble placa y de largueros (crawler), en varias escalas =================
// La dueña (11-10-2026): «aprende a hacer chasis de RC también» y «el RC es obligatorio: varios chasis». Su referencia (un 1/10 de
// MakerWorld, solo para mirar medidas: ni una malla copiada) enseña lo importante: un 1/10 mide ~35 cm y NO cabe en la cama, así que
// va en dos mitades. Aquí todos siguen las MISMAS normas, para que casen con las piezas RC que ya hay en el catálogo:
//  · OREJAS DE TRAPECIO: dos mamparos por eje, separados lo que mide el trapecio («separación de los anclajes», 30 de serie) + 0,3
//    por lado, con el agujero del pasador (varilla de 3 o un tornillo M3 largo). El trapecio del catálogo entra tal cual.
//  · TORRE DE AMORTIGUADORES: dos agujeros para roscar a 40 mm (los de la base de la torre), a 4,5 mm del suelo, en el mamparo de fuera.
//  · PLACA DE MONTAJE UNIVERSAL: ranuras de 14 mm cada 20 a lo largo y columnas cada 15 mm a lo ancho: cualquier pieza de dos
//    tornillos (soporte de servo, de motor, sujeta-batería, receptor) cae en ranura, tenga la separación que tenga; y por ellas
//    pasan las cintas de velcro de la batería.
//  · MORRO Y COLA: una ranura atravesada para el parachoques (agujeros hasta 36 mm).
// Marco: X a lo ancho, Y a lo largo (+Y = morro), Z arriba; el suelo en z ∈ [0, g]. Tornillería M3 (M2 en las escalas pequeñas).
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, M, seg, circ, rr, poli, cil, caja, n2, R2, enRejilla } = A;
const cilY = (d, y0, y1, x, z) => M().cylinder(y1 - y0, d / 2, d / 2, seg(d)).rotate([-90, 0, 0]).translate([x, y0, z]);
const cilX = (d, x0, x1, y, z) => M().cylinder(x1 - x0, d / 2, d / 2, seg(d)).rotate([0, 90, 0]).translate([x0, y, z]);
const ranuraY = (largo, ancho) => poli(N.ranura2(largo, ancho)).rotate(90);
const ranuraX = (largo, ancho) => poli(N.ranura2(largo, ancho));
const avellanado = (d, x, y) => M().cylinder(d * 0.55, d * 1.05, d / 2, 32).translate([x, y, -0.01]); // cabeza avellanada por debajo (a 45°: se imprime sin soporte)
let _trapecio = null; export const ponTrapecio = f => { _trapecio = f; }; // (lo pone catalogo.js: así el chasis se comprueba con el trapecio DE VERDAD)

// escala → [nombre, batalla, ancho en el centro, ancho en los ejes, métrica]
const ESCALAS = { '10': ['1/10 turismo (batalla 257)', 257, 96, 64, 3], '10b': ['1/10 buggy (batalla 280)', 280, 100, 64, 3], '12': ['1/12 (batalla 200)', 200, 86, 60, 3], '16': ['1/16 (batalla 180)', 180, 78, 56, 3],
  '18': ['1/18 (batalla 150)', 150, 66, 46, 2], '24': ['1/24 (batalla 133)', 133, 58, 42, 2], '28': ['1/28 (batalla 98)', 98, 50, 38, 2] };
const OPS_ESC = Object.entries(ESCALAS).map(([k, v]) => [k, v[0]]);
export function medidasChasis(p, tipo) {
  const E = ESCALAS[p.escala] || ESCALAS['10'], B = p.batalla > 0 ? p.batalla : E[1], k = B / 257, tor = E[4], wM = p.ancho > 0 ? p.ancho : E[2], wE = Math.min(wM, E[3] * (p.ancho > 0 ? Math.min(1, p.ancho / E[2] + 0.2) : 1));
  const pin = p.pin > 0 ? p.pin : (tor === 3 ? 3 : 2), trapA = p.trapA > 0 ? p.trapA : Math.max(24, Math.round(30 * Math.min(1, k * 1.2) / 2) * 2); // (nunca menos de 24: la horquilla del trapecio del catálogo mide 23,6 de ancho y con anclajes más juntos el brazo rozaría los mamparos)
  const wallT = tipo === 'doble' ? (tor === 3 ? 7 : 5) : (tor === 3 ? 5 : 4), g = Math.max(2, p.g || 3), Rb = (pin + 2 * ENCAJES.gira) / 2 + 2.2, hP = Rb + 2, hW = hP + 4;
  const zn = trapA / 2 + 0.3 + wallT + 3, vol = zn + Math.max(9, 14 * k), L = B + 2 * vol, trans = (wM - wE) / 2, xP = wE / 2 - 4.5, sepT = Math.min(40, Math.floor((2 * xP - 2 * (pin / 2 + 1.6 + tor / 2)) / 2) * 2);
  const pasa = tor + 2 * ENCAJES.gira, rosca = tor - 0.4, partido = !!p.partir || L > 248;
  return { B, k, tor, wM, wE, pin, trapA, wallT, g, Rb, hP, hW, zn, vol, L, trans, xP, sepT, pasa, rosca, partido, yIn: B / 2 - trapA / 2 - 0.3, xo: tipo === 'doble' ? 6 : 0, borde: Math.max(6, Math.min(p.borde || 10, 20)), Hs: Math.max(14, p.alto || 22) };
}
// la placa de abajo (común a los tres de «placa»): contorno entallado en los ejes, ranuras, morro y cola
function placaBase(Q, tipo) {
  const { B, wM, wE, g, L, zn, trans, pasa } = Q, medio = [[wE / 2, -L / 2], [wE / 2, -B / 2 + zn], [wM / 2, -B / 2 + zn + trans], [wM / 2, B / 2 - zn - trans], [wE / 2, B / 2 - zn], [wE / 2, L / 2]];
  const r = Math.min(5, wE / 8), contorno = poli(medio.concat(medio.slice().reverse().map(([x, y]) => [-x, y]))).offset(-r, 'Round').offset(2 * r, 'Round').offset(-r, 'Round');
  // ranuras de montaje (rejilla universal) en la parte ancha; la zona de la unión de las dos mitades queda maciza
  const R = [], yW = B / 2 - zn - trans - 6, xMax = wM / 2 - (tipo === 'banera' ? 2.4 : 0) - 6, paso = Q.tor === 3 ? 20 : 14, lr = Q.tor === 3 ? 14 : 10, col = Q.tor === 3 ? 15 : 10;
  for (let i = -30; i <= 30; i++) { const y = i * paso; if (Math.abs(y) + lr / 2 > yW) continue; if (Q.partido && Math.abs(y) < 30) continue;
    for (let j = -12; j <= 12; j++) { const x = j * col; if (Math.abs(x) > xMax) continue; R.push(ranuraY(lr, pasa).translate([x, y])); } }
  [-1, 1].forEach(sg => R.push(ranuraX(Math.min(36, wE - 16) + pasa, pasa).translate([0, sg * (L / 2 - 6)])));
  return { contorno, placa: contorno.subtract(N.csUnion(R)).extrude(g) };
}
// los cuatro mamparos (dos por eje): integrados en la placa (bañera) o sueltos (doble placa: se atornillan a las dos placas)
function mamparo(Q, alto, suelto) {
  const { wE, wallT, xP, hP, sepT, rosca, pin } = Q; let m = caja(wE, wallT, alto, 1);
  [-1, 1].forEach(sx => { m = m.subtract(cilY(pin + 2 * ENCAJES.justo, -wallT, wallT, sx * xP, hP)).subtract(cilY(rosca, -wallT, wallT, sx * sepT / 2, 4.5)); });
  if (suelto) [-1, 1].forEach(sx => { m = m.subtract(cil(rosca, 9, -0.01).translate([sx * Q.xB, 0, 0])).subtract(cil(rosca, 9, alto - 8.99).translate([sx * Q.xB, 0, 0])); });
  return m;
}
const yMamparos = Q => { const L = []; [-1, 1].forEach(sg => [-1, 1].forEach(k => L.push({ y: sg * Q.B / 2 + k * (Q.trapA / 2 + 0.3 + Q.wallT / 2), eje: sg, fuera: k === sg }))); return L; };
// partir en dos mitades por y = 0: colas de milano (con tu holgura «encaja») + un puente atornillado encima
function partir(Q, entero) {
  const { wM, g, pasa } = Q, a = 6, b = 10, lt = 12, xs = [-wM / 6, wM / 6], cola = xo => poli([[xo - a, 0.6], [xo - b, -lt], [xo + b, -lt], [xo + a, 0.6]]);
  const xh = [-(wM / 2 - 11), 0, wM / 2 - 11], yh = [-22, -9, 9, 22], H = []; xh.forEach(x => yh.forEach(y => H.push([x, y])));
  const taladros = N.union(H.map(([x, y]) => cil(pasa, 40, -5).translate([x, y, 0]))), cabezas = N.union(H.map(([x, y]) => avellanado(pasa, x, y)));
  const colas = N.csUnion(xs.map(cola)), tras = entero.trimByPlane([0, -1, 0], 0).subtract(colas.offset(ENCAJES.justo, 'Round').extrude(g + 60).translate([0, 0, -1])).subtract(taladros).subtract(cabezas);
  const del = entero.trimByPlane([0, 1, 0], 0).add(colas.extrude(g)).subtract(taladros).subtract(cabezas);
  const puente = rr(2 * (wM / 2 - 11) + 12, 56, 3).extrude(3).subtract(taladros);
  return { tras, del, puente, tornillos: H };
}
function chasisPlacaPiezas(p, tipo) {
  const Q = medidasChasis(p, tipo), { B, wM, wE, g, L, zn, trans, pasa, hW } = Q; Q.xB = Math.min(10, Q.sepT / 2 - 5);
  const P0 = placaBase(Q, tipo); let entero = P0.placa; const piezas = [], montaje = [];
  if (tipo === 'banera') { // el borde de la bañera: una pared de 2,4 mm por el contorno de la parte ancha
    const borde = P0.contorno.subtract(P0.contorno.offset(-2.4, 'Round')).intersect(rr(wM + 10, B - 2 * zn - 2).translate([0, 0])).subtract(rr(wE - 6, B + 10)); entero = entero.add(borde.extrude(Q.borde + g)); }
  const mam = yMamparos(Q);
  if (tipo !== 'doble') mam.forEach(o => { let m = mamparo(Q, hW, false); if (!o.fuera) m = caja(wE, Q.wallT, hW, 1).subtract(N.union([-1, 1].map(sx => cilY(Q.pin + 2 * ENCAJES.justo, -Q.wallT, Q.wallT, sx * Q.xP, Q.hP)))); entero = entero.add(m.translate([0, o.y, g - 0.01])); });
  else { // doble placa: agujeros avellanados para los mamparos sueltos y los postes
    const H = []; mam.forEach(o => [-1, 1].forEach(sx => H.push([sx * Q.xB, o.y]))); [-1, 1].forEach(sg => H.push([Q.xo, sg * Math.round(B / 6)]));
    entero = entero.add(N.csUnion(H.map(([x, y]) => circ(pasa + 7).translate([x, y]))).intersect(P0.contorno).extrude(g)).subtract(N.union(H.map(([x, y]) => cil(pasa, g + 2, -1).translate([x, y, 0]).add(avellanado(pasa, x, y))))); Q.agujerosBajo = H; }
  let K = null;
  if (Q.partido) { K = partir(Q, entero); piezas.push(['Mitad trasera', K.tras], ['Mitad delantera', K.del], ['Puente de unión', K.puente]); montaje.push(K.tras, K.del, K.puente.translate([0, 0, g])); }
  else { piezas.push(['Chasis', entero]); montaje.push(entero); }
  if (tipo === 'doble') {
    const Hs = Q.Hs, bar = mamparo(Q, Hs, true); mam.forEach((o, i) => { piezas.push(['Mamparo ' + (i + 1), bar]); montaje.push(bar.translate([0, o.y, g])); });
    // placa de arriba: de mamparo interior a mamparo interior, con sus «zapatas» y agujeros para los postes
    const yI = Q.yIn, wT = Math.max(22, Math.min(30, wE * 0.45)), zap = [-1, 1].map(sg => rr(wE, Q.wallT + 6, 2).translate([0, sg * (yI - (Q.wallT + 6) / 2)]));
    let arriba = N.csUnion(zap.concat([rr(wT, 2 * yI - 6, 4).translate([Q.xo, 0])])).offset(-3, 'Round').offset(6, 'Round').offset(-3, 'Round'); const Ha = [];
    mam.filter(o => !o.fuera).forEach(o => [-1, 1].forEach(sx => Ha.push([sx * Q.xB, o.y]))); [-1, 1].forEach(sg => Ha.push([Q.xo, sg * Math.round(B / 6)]));
    const ventanas = []; for (let y = -(yI - 40); y <= yI - 40; y += 28) if (Math.abs(Math.abs(y) - Math.round(B / 6)) > 16) ventanas.push(ranuraY(18, wT - 14).translate([Q.xo, y]));
    arriba = arriba.subtract(N.csUnion(ventanas)).extrude(2.4).subtract(N.union(Ha.map(([x, y]) => cil(pasa, 6, -1).translate([x, y, 0]))));
    if (2 * yI > 250) N.mal('La placa de arriba mediría ' + n2(2 * yI) + ' mm y no cabe en la cama: baja la batalla a 275 o menos.');
    const poste = N.cs([N.ccw(N.poligono2(6, 9 / Math.cos(30 * R2), 0))], 'Positive').extrude(Hs).subtract(cil(Q.rosca, Hs + 2, -1));
    piezas.push(['Placa de arriba', arriba], ['Poste 1', poste], ['Poste 2', poste]); montaje.push(arriba.translate([0, 0, g + Hs])); [-1, 1].forEach(sg => montaje.push(poste.translate([Q.xo, sg * Math.round(B / 6), g])));
  }
  return { Q, piezas, montaje, entero, K };
}
// ¿está bien? las piezas montadas no se pisan, cada una cabe en la cama y el TRAPECIO del catálogo entra, gira y su pasador pasa
const _comp = new Map();
export function compruebaChasis(p, tipo) {
  const k = JSON.stringify([tipo, p.escala, p.batalla, p.ancho, p.g, p.borde, p.alto, p.pin, p.trapA, p.partir]); if (_comp.has(k)) return _comp.get(k);
  const r = N.enAmbito(() => { const C = chasisPlacaPiezas(p, tipo), Q = C.Q; let pisa = 0, grande = 0;
    for (let i = 0; i < C.montaje.length; i++) for (let j = i + 1; j < C.montaje.length; j++) pisa = Math.max(pisa, C.montaje[i].intersect(C.montaje[j]).volume());
    C.piezas.forEach(([, m]) => { const b = N.caja(m); grande = Math.max(grande, Math.min(Math.max(b.dims[0], b.dims[1]), Math.hypot(b.dims[0], b.dims[1]) * 0.72)); });
    const todo = N.union(C.montaje); let trap = null;
    if (_trapecio) { const largo = Math.max(30, Math.round(60 * Math.min(1, Q.k * 1.1))), T = _trapecio({ largo, ancho: Q.trapA, pin: Q.pin, g: Q.tor === 3 ? 6 : 4, forma: 'A', amort: 0, agAm: 3 });
      const pon = ang => T.translate([0, 0, -Q.Rb]).rotate([0, ang, 0]).translate([Q.xP, Q.B / 2, Q.g + Q.hP]);
      const pas = cilY(Q.pin - 0.1, Q.B / 2 - Q.trapA / 2 - Q.wallT - 2, Q.B / 2 + Q.trapA / 2 + Q.wallT + 2, Q.xP, Q.g + Q.hP);
      trap = { roce: pon(0).intersect(todo).volume(), abajo: pon(18).intersect(todo).volume(), arriba: pon(-30).intersect(todo).volume(), pasador: pas.intersect(todo.add(pon(0))).volume(), largo }; }
    return { pisa, grande, trap, piezas: C.piezas.length, L: Q.L, partido: Q.partido }; });
  if (_comp.size > 40) _comp.clear(); _comp.set(k, r); return r;
}
const camposPlaca = extra => [s('que', 'Qué imprimo', extra.que[0][0], extra.que.concat([['montado', '👀 Verlo montado (solo para mirar)']])), s('escala', 'Escala', '10', OPS_ESC), n('batalla', 'Batalla, de eje a eje (0 = la de la escala)', 0, 0, 330, 1), n('ancho', 'Ancho en el centro (0 = el de la escala)', 0, 0, 200, 1),
  n('g', 'Grosor de la placa', 3, 2, 6, 0.5)].concat(extra.campos || []).concat([n('trapA', 'Trapecios: separación de sus anclajes (0 = la de la escala)', 0, 0, 80, 1), n('pin', 'Pasador de los trapecios (0 = el de la escala)', 0, 0, 5, 0.5), c('partir', 'Partirlo en dos mitades aunque quepa entero', false)]);
function genPlaca(p, tipo) { const C = chasisPlacaPiezas(p, tipo); if (p.que === 'montado') return N.union(C.montaje);
  const una = { tras: 'Mitad trasera', del: 'Mitad delantera', puente: 'Puente de unión', arriba: 'Placa de arriba' }[p.que]; if (una) { const f = C.piezas.find(x => x[0] === una); if (!f) N.mal('Con estas medidas no hay «' + una + '» (el chasis sale entero).'); return f[1]; }
  const de = re => enRejilla(C.piezas.filter(x => re.test(x[0])).map(x => x[1]), 250, 5);
  if (p.que === 'cama2') return de(/Placa de arriba|Mamparo|Poste/); if (p.que === 'cama1') return de(/Mitad|Puente|Chasis/);
  return enRejilla(C.piezas.map(x => x[1]), 250, 5); }
function notaPlaca(p, tipo) { let R = null, Q = null; try { Q = medidasChasis(p, tipo); R = compruebaChasis(p, tipo); } catch (e) { return '⚠️ ' + e.message; }
  if (p.que === 'montado') return '👀 Esto es solo para VERLO montado. Para imprimir elige las piezas arriba (por camas o de una en una): salen planas, sin soportes.';
  const bien = R.pisa < 0.01 && (!R.trap || (R.trap.roce < 0.01 && R.trap.abajo < 0.01 && R.trap.arriba < 0.01 && R.trap.pasador < 0.01));
  return (bien ? 'COMPROBADO (en el ordenador): montado, ninguna pieza pisa a otra' + (R.trap ? '; el TRAPECIO del catálogo entra entre los mamparos, su pasador pasa por los cuatro agujeros y sube 30° y baja 18° sin tocar el chasis' : '') : '⚠️ Con estas medidas algo se pisa (' + n2(Math.max(R.pisa, R.trap ? R.trap.roce : 0)) + ' mm³): revisa el ancho o la batalla')
    + '. Batalla ' + n2(Q.B) + ' mm, largo total ' + n2(Q.L) + ' mm' + (Q.partido ? ': va en DOS MITADES (cada una cabe en la cama) que encajan con dos colas de milano (tu holgura «encaja») y se cierran con el puente y 12 tornillos M' + Q.tor + ' avellanados por debajo, con tuerca arriba' : ', de una pieza') + '. '
    + 'PARA TUS TRAPECIOS (pon esto en «Trapecio» o «Esquina»): separación de los anclajes ' + n2(Q.trapA) + ', pasador ' + n2(Q.pin) + (R.trap ? ', largo ' + R.trap.largo + ' o el que quieras' : '') + '; el pasador es una varilla de ' + n2(Q.pin) + ' × ' + n2(Q.trapA + 2 * Q.wallT + 1) + ' mm (o un tornillo M' + n2(Q.pin) + ' largo con tuerca). '
    + 'TORRE de amortiguadores: se rosca en el mamparo de fuera de cada eje (pon «separación de los tornillos de la base» = ' + n2(Q.sepT) + '). Las RANURAS valen para cualquier pieza de dos tornillos M' + Q.tor + ' (servo, motor, receptor) y para las cintas de la batería; la ranura del morro y la de la cola, para el parachoques. '
    + (tipo === 'doble' ? 'Son DOS CAMAS de impresión (elige «Cama 1» y luego «Cama 2»). Los 4 mamparos y los 2 postes se atornillan por abajo y por arriba (se roscan solos en el plástico): la placa de arriba, de ' + n2(2 * Q.yIn) + ' mm, cierra la caja y lo hace rígido. La batería (hasta ' + n2(Q.wM / 2 + Q.xo - 5) + ' mm de ancho) va a la izquierda de los postes. ' : 'El borde de ' + n2(Q.borde) + ' mm le da rigidez. ')
    + 'Imprime en PETG, 4 paredes y 40 % de relleno. Es un chasis para montar, aprender y rodar; para saltos y carreras, el de fibra o aluminio.'; }

// ======================= 🪜 CHASIS DE LARGUEROS (crawler / escalador) =======================
// Dos largueros de pie unidos por travesaños, dos bandejas (servo y batería) y la placa central (skid), que además UNE las dos
// mitades de cada larguero cuando no caben enteros (1/10). Todo se atornilla desde fuera y se rosca en el plástico.
const CRAWLER = { '10': ['1/10 (batalla 313, tipo SCX10)', 313, 64, 3, 24, 4], '12': ['1/12 (batalla 255)', 255, 54, 3, 20, 3.5], '18': ['1/18 (batalla 155, tipo TRX-4M)', 155, 38, 2, 14, 3], '24': ['1/24 (batalla 134, tipo SCX24)', 134, 27, 2, 11, 2.4] };
function crawlerPiezas(p) {
  const E = CRAWLER[p.escala] || CRAWLER['10'], B = p.batalla > 0 ? p.batalla : E[1], Wi = p.ancho > 0 ? p.ancho : E[2], tor = E[3], H = E[4], g = Math.max(2, p.g > 0 ? p.g : E[5]), k = B / 313;
  const pasa = tor + 2 * ENCAJES.gira, rosca = tor - 0.4, dv = tor === 3 ? 10 : 7, pAm = Math.max(6, 9 * k), vol = 2 * pAm + dv + pasa + 8, Lr = B + 2 * vol, uc = B / 2 - 62 * k, sube = 0.34 * H, partido = !!p.partir || Lr > 248;
  // perfil del larguero (u a lo largo, v hacia arriba): recto en el centro y con las puntas levantadas
  const P = [[-Lr / 2, sube], [-uc - 40 * k, sube], [-uc, 0], [uc, 0], [uc + 40 * k, sube], [Lr / 2, sube], [Lr / 2, H], [-Lr / 2, H]], r = Math.min(3, H / 8);
  const perfil = poli(P).offset(-r, 'Round').offset(2 * r, 'Round').offset(-r, 'Round'), vMed = u => { const a = Math.abs(u), v0 = a <= uc ? 0 : a >= uc + 40 * k ? sube : sube * (a - uc) / (40 * k); return (v0 + H) / 2; };
  // estaciones (todas con DOS agujeros en horizontal): travesaños, bandejas, placa central (4 por lado) y la fila de los amortiguadores
  const hT = 2 * (rosca / 2 + 2.2), fT = dv + 2 * (rosca / 2 + 2.6), mS = Math.max(6, tor + 3), uT = B / 2 - 2 * pAm - (dv / 2 + pasa + 2.5), uE = Lr / 2 - (dv / 2 + pasa / 2 + 3), uTrav = [-uE, -uT, uT, uE];
  // en las escalas grandes hay sitio para dos bandejas aparte; en las pequeñas la placa central se alarga y hace de suelo (servo y batería van en ella)
  const conBandejas = k >= 0.7, uS2 = conBandejas ? 24 * k + 8 : uT - fT / 2 - 2 - mS, uSkid = [-uS2, -8, 8, uS2], vSkid = Math.max(3.5, H * 0.24);
  const sepB = 30, uB = (uS2 + uT - dv / 2) / 2, uBan = conBandejas ? [-uB, uB] : [], vBan = H * 0.5;
  const AG = []; uTrav.forEach(u => [-1, 1].forEach(q => AG.push([u + q * dv / 2, vMed(u)]))); uBan.forEach(u => [-1, 1].forEach(q => AG.push([u + q * sepB / 2, vBan]))); uSkid.forEach(u => AG.push([u, vSkid]));
  const AM = []; [-1, 1].forEach(sg => { for (let i = -2; i <= 2; i++) AM.push([sg * B / 2 + i * pAm, H - Math.max(3, 4.2 * Math.min(1, k * 1.5))]); });
  const VEN = []; [-1, 1].forEach(sg => { const u0 = uB + sepB / 2 + 8, u1 = uT - dv / 2 - 8; if (u1 - u0 > 16) VEN.push(poli(N.ranura2(u1 - u0, Math.max(4, H * 0.3))).translate([sg * (u0 + u1) / 2, H * 0.52])); });
  const larguero2 = perfil.subtract(N.csUnion(AG.concat(AM).map(([u, v]) => circ(pasa).translate([u, v])).concat(VEN)));
  const lar = larguero2.extrude(g); // tumbado: así se imprime
  const dePie = (m, x) => m.rotate([90, 0, 0]).rotate([0, 0, 90]).translate([x, 0, 0]); // (u, v, grosor) → (y, z, x): de pie, a lo largo del coche
  const piezas = [], montaje = [];
  const mitades = partido ? [lar.trimByPlane([-1, 0, 0], 0), lar.trimByPlane([1, 0, 0], 0)] : [lar];
  [-1, 1].forEach(sx => mitades.forEach((m, i) => { piezas.push(['Larguero ' + (sx < 0 ? 'izquierdo' : 'derecho') + (partido ? (i ? ' (delante)' : ' (detrás)') : ''), m]); montaje.push(dePie(m, sx < 0 ? -Wi / 2 - g : Wi / 2)); }));
  // travesaños: barra entre los dos largueros, con dos agujeros para roscar en cada punta
  const trav = caja(Wi, fT, hT, 1).subtract(N.union([-1, 1].map(q => cilX(rosca, -Wi / 2 - 1, -Wi / 2 + 10, q * dv / 2, hT / 2).add(cilX(rosca, Wi / 2 - 10, Wi / 2 + 1, q * dv / 2, hT / 2)))));
  uTrav.forEach((u, i) => { piezas.push(['Travesaño ' + (i + 1), trav]); montaje.push(trav.translate([0, u, vMed(u) - hT / 2])); });
  // bandejas (servo delante, batería detrás): placa con ranuras y dos orejas que se atornillan a los largueros
  const lb = sepB + 2 * Math.max(5, tor + 2.5), hOre = Math.max(8, tor * 2 + 4), nR = Math.max(1, Math.floor((Wi - 12) / (tor === 3 ? 15 : 10)));
  const R = []; for (let j = 0; j < nR; j++) R.push(ranuraY(lb - 10, pasa).translate([(j - (nR - 1) / 2) * (tor === 3 ? 15 : 10), 0]));
  let ban = rr(Wi, lb, 1.5).subtract(N.csUnion(R)).extrude(3).add(N.union([-1, 1].map(sx => caja(4, lb, hOre + 3, 1).translate([sx * (Wi / 2 - 2), 0, 0]))));
  ban = ban.subtract(N.union([-1, 1].map(q => cilX(rosca, -Wi / 2 - 1, Wi / 2 + 1, q * sepB / 2, 3 + hOre / 2))));
  uBan.forEach((u, i) => { piezas.push([i ? 'Bandeja de delante (servo)' : 'Bandeja de detrás (batería)', ban]); montaje.push(ban.translate([0, u, vBan - 3 - hOre / 2])); });
  // placa central (skid): por debajo protege; sus dos orejas largas unen las mitades de cada larguero
  const ls = uSkid[3] - uSkid[0] + 2 * mS, hS = vSkid + Math.max(4, tor + 1.5), R2s = []; for (let j = 0; j < nR; j++) R2s.push(ranuraY(ls - 16, pasa).translate([(j - (nR - 1) / 2) * (tor === 3 ? 15 : 10), 0]));
  let skid = rr(Wi, ls, 1.5).subtract(N.csUnion(R2s)).extrude(3).add(N.union([-1, 1].map(sx => caja(4.5, ls, hS + 3, 1).translate([sx * (Wi / 2 - 2.25), 0, 0]))));
  skid = skid.subtract(N.union(uSkid.map(u => cilX(rosca, -Wi / 2 - 1, Wi / 2 + 1, u, 3 + vSkid))));
  piezas.push(['Placa central (une las mitades)', skid]); montaje.push(skid.translate([0, 0, -3]));
  return { piezas, montaje, B, Wi, tor, H, g, Lr, partido, pasa, rosca, AG, dePie, sepB, dv, conBandejas };
}
const _compC = new Map();
export function compruebaCrawler(p) {
  const k = JSON.stringify([p.escala, p.batalla, p.ancho, p.g, p.partir]); if (_compC.has(k)) return _compC.get(k);
  const r = N.enAmbito(() => { const C = crawlerPiezas(p); let pisa = 0, grande = 0;
    for (let i = 0; i < C.montaje.length; i++) for (let j = i + 1; j < C.montaje.length; j++) pisa = Math.max(pisa, C.montaje[i].intersect(C.montaje[j]).volume());
    C.piezas.forEach(([, m]) => { const b = N.caja(m); grande = Math.max(grande, Math.max(b.dims[0], b.dims[1])); });
    // cada tornillo: una varilla un pelo más fina que el agujero, de lado a lado del coche, no puede tocar nada
    const todo = N.union(C.montaje), T = N.union(C.AG.map(([u, v]) => cilX(C.tor - 0.5, -C.Wi / 2 - C.g - 2, -C.Wi / 2 + 6, u, v).add(cilX(C.tor - 0.5, C.Wi / 2 - 6, C.Wi / 2 + C.g + 2, u, v))));
    return { pisa, grande, tornillos: T.intersect(todo).volume(), n: C.AG.length * 2, piezas: C.piezas.length, Lr: C.Lr, partido: C.partido, bandejas: C.conBandejas }; });
  if (_compC.size > 30) _compC.clear(); _compC.set(k, r); return r;
}

export const DISENOS_CHASIS = {
  chasisBanera: { cat: 'rc', e: '🏎️', t: 'Chasis de bañera (1/10 a 1/28)', d: 'Con las orejas para TUS trapecios, el anclaje de las torres y placa de montaje universal; el 1/10 va en dos mitades', uso: 'mecanica', color: '#1b1b1d',
    campos: camposPlaca({ que: [['todo', 'Todas las piezas (caben en una cama)'], ['tras', 'Solo la mitad trasera'], ['del', 'Solo la mitad delantera'], ['puente', 'Solo el puente de unión']], campos: [n('borde', 'Alto del borde', 10, 6, 20, 1)] }),
    gen(p) { return genPlaca(p, 'banera'); }, nota: p => notaPlaca(p, 'banera') },
  chasisDoble: { cat: 'rc', e: '🏁', t: 'Chasis de doble placa (turismo / drift)', d: 'Placa de abajo, 4 mamparos, placa de arriba y postes: una caja rígida, con las mismas normas', uso: 'mecanica', color: '#2457d6',
    campos: camposPlaca({ que: [['cama1', 'Cama 1: la placa de abajo (sus dos mitades y el puente)'], ['cama2', 'Cama 2: placa de arriba, 4 mamparos y 2 postes'], ['tras', 'Solo la mitad trasera'], ['del', 'Solo la mitad delantera'], ['puente', 'Solo el puente de unión'], ['arriba', 'Solo la placa de arriba']], campos: [n('alto', 'Separación entre las dos placas', 22, 14, 40, 1)] }),
    gen(p) { return genPlaca(p, 'doble'); }, nota: p => notaPlaca(p, 'doble') },
  chasisCrawler: { cat: 'rc', e: '🪜', t: 'Chasis de largueros (crawler 1/10 · 1/12 · 1/18 · 1/24)', d: 'Dos largueros, 4 travesaños, 2 bandejas y la placa central: se atornilla desde fuera', uso: 'mecanica', color: '#9d6d3f',
    campos: [s('que', 'Qué imprimo', 'largueros', [['largueros', 'Cama 1: los largueros'], ['resto', 'Cama 2: travesaños, bandejas y placa central'], ['todo', 'Todo junto (solo en las escalas pequeñas cabe en una cama)'], ['montado', '👀 Verlo montado (solo para mirar)']]), s('escala', 'Escala', '10', Object.entries(CRAWLER).map(([k, v]) => [k, v[0]])),
      n('batalla', 'Batalla, de eje a eje (0 = la de la escala)', 0, 0, 340, 1), n('ancho', 'Ancho entre largueros, por dentro (0 = el de la escala)', 0, 0, 120, 1), n('g', 'Grosor de los largueros (0 = el de la escala)', 0, 0, 6, 0.2), c('partir', 'Partir los largueros aunque quepan enteros', false)],
    gen(p) { const C = crawlerPiezas(p); if (p.que === 'montado') return N.union(C.montaje); const L = C.piezas.filter(x => p.que === 'largueros' ? /Larguero/.test(x[0]) : p.que === 'resto' ? !/Larguero/.test(x[0]) : true).map(x => x[1]); return enRejilla(L, 250, 5); },
    nota: p => { let R = null, C = null; try { R = compruebaCrawler(p); C = CRAWLER[p.escala] || CRAWLER['10']; } catch (e) { return '⚠️ ' + e.message; }
      if (p.que === 'montado') return '👀 Esto es solo para VERLO montado. Para imprimir elige «Cama 1» y luego «Cama 2»: salen tumbadas, sin soportes.';
      const B = p.batalla > 0 ? p.batalla : C[1], tor = C[3];
      return (R.pisa < 0.01 && R.tornillos < 0.01 ? 'COMPROBADO (en el ordenador): montado, ninguna pieza pisa a otra y los ' + R.n + ' tornillos pasan por sus agujeros de lado a lado' : '⚠️ Con estas medidas algo no casa (' + n2(Math.max(R.pisa, R.tornillos)) + ' mm³): revisa el ancho') + '. Batalla ' + n2(B) + ' mm; largueros de ' + n2(R.Lr) + ' mm' + (R.partido ? ', cada uno en DOS MITADES que une la placa central (4 tornillos por lado)' : ', enteros') + '. Son DOS CAMAS de impresión. ' + R.piezas + ' piezas: largueros (tumbados), 4 travesaños' + (R.bandejas ? ', bandeja del servo, bandeja de la batería y placa central' : ' y la placa central, que en esta escala es larga y hace de suelo para el servo y la batería') + '. Todo con tornillos M' + tor + ' × ' + (tor === 3 ? '10' : '6') + ' desde FUERA, que se roscan solos en el plástico. La fila de 5 agujeros de arriba, sobre cada eje, es para los amortiguadores; las ranuras, para servo, batería (con cintas) y transmisión. En PETG, 4 paredes. La pieza más larga mide ' + n2(R.grande) + ' mm: cabe en la P1P' + (R.grande <= 178 ? ' y en la A1 mini' : '') + '.'; } },
};
