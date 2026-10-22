// ================= 20-10-2026 (noche) · 🛻 CAMIÓN RC 1/10 · 3.ª PARTE: PIEZAS PARA IMPRIMIR, CAMAS, PRUEBA DE ENCAJE, TORNILLERÍA, MANUAL Y FICHA =================
// La 1.ª parte (r8/cat_camion.js) es la suspensión, las torres y el chasis; la 2.ª (r8/cat_camion2.js), la transmisión, la dirección y el camión
// montado. Aquí:
//  · cada PIEZA tumbada como se imprime (la postura elegida midiendo sus voladizos en las 6 posibles: test/tmp_posturas*.mjs) y las CAMAS de la P1P;
//  · la 🧪 PRUEBA DE ENCAJE (rodamientos, hexágono, bisagra del trapecio, copa con su palier, un par de cónicos);
//  · la TORNILLERÍA: cada tornillo con su medida, cuántos y DÓNDE va, sacada del propio diseño (los largos que cambian con el estilo, calculados);
//    los rodamientos (5×11×4 y 8×12×4: los que ella tiene), las rótulas, los pasadores y la varilla roscada;
//  · el 📄 MANUAL (los pasos en el orden del 🔧 montaje paso a paso), la ficha del catálogo y la animación (ruedas y transmisión girando con su
//    relación de verdad, y la dirección a un lado y al otro).
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';
import * as B from './cat_bici.js';
import * as C from './cat_camion.js';
import * as T from './cat_camion2.js';

const { n, s, cil, n2 } = A;
const { PRES } = B;
const { TOR, ROD } = C, R2 = Math.PI / 180;
const enCama = (m, rot) => { const r = rot && rot.some(Boolean) ? m.rotate(rot) : m, b = N.caja(r); return r.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]); };
const espejo = m => m.mirror([0, 1, 0]);
const LARGOS_M5 = [16, 20, 25, 30, 35, 40, 45, 50, 55, 60], largoM5 = L => LARGOS_M5.find(x => x >= L - 0.2) || 60;
// el ESPACIADOR (impreso): de la torre al ojo del amortiguador, o a la rótula de la biela
export const espaciador = L => cil(7, L).subtract(cil(TOR.m3.paso, L + 2, -1));
export const ESPACIADORES = Q => ({ amortiguador: 8.5, bielaDel: Math.round((Q.F.xT[0] - (Q.F.xU + 3.4)) * 10) / 10 });
export const medidas = p => { const Q = C.medidasCamion(p); T.fases(Q); return Q; };

// ---------- 1) las PIEZAS PARA IMPRIMIR (cada una tumbada como se imprime) ----------
// [título, pieza en su sitio, giro para la cama, cantidad, cómo se imprime, grupo]
export function piezasCamion(Q) { const P = [], add = (t, m, rot, k = 1, como = '', g = '') => { const mm = enCama(m, rot); for (let i = 0; i < k; i++) P.push({ t, m: mm, como, g }); }, E = ESPACIADORES(Q);
  add('Chasis, mitad de atrás', T.mitadChasis(Q, false), null, 1, 'plano', 'chasis'); add('Chasis, mitad de delante', T.mitadChasis(Q, true), null, 1, 'plano', 'chasis');
  add('Bandeja central', T.bandeja(Q), null, 1, 'plana', 'chasis'); add('Parachoques de delante', T.parachoquesDel(Q), [0, 90, 0], 1, 'de lado', 'chasis'); add('Parachoques de detrás', T.parachoquesTras(Q), null, 1, 'como va', 'chasis');
  add('Poste de la carrocería (delante)', T.posteCarroceria(T.altoPoste(Q)), [0, -90, 0], 2, 'tumbado, sobre su cara plana', 'chasis'); add('Poste de la carrocería (detrás)', T.posteCarroceria(Math.round(Q.F.T[1] + 8 - (Q.zF1 + 10))), [0, -90, 0], 2, 'tumbado, sobre su cara plana', 'chasis');
  add('Torre de delante', C.torre(Q, true), [0, 90, 0], 1, 'tumbada', 'suspension'); add('Torre de detrás', C.torre(Q, false), [0, 90, 0], 1, 'tumbada', 'suspension');
  add('Soporte de la biela de atrás, izquierdo', C.soporteBielaT(Q), [0, -90, 0], 1, 'de lado', 'suspension'); add('Soporte de la biela de atrás, derecho', espejo(C.soporteBielaT(Q)), [0, -90, 0], 1, 'de lado', 'suspension');
  add('Trapecio de delante, izquierdo', C.trapecioPlano(Q.F), null, 1, 'plano', 'suspension'); add('Trapecio de delante, derecho', espejo(C.trapecioPlano(Q.F)), null, 1, 'plano', 'suspension');
  add('Trapecio de detrás, izquierdo', C.trapecioPlano(Q.T), null, 1, 'plano', 'suspension'); add('Trapecio de detrás, derecho', espejo(C.trapecioPlano(Q.T)), null, 1, 'plano', 'suspension');
  add('Pieza en C, izquierda', C.piezaC(Q), [90, 0, 0], 1, 'de lado', 'suspension'); add('Pieza en C, derecha', espejo(C.piezaC(Q)), [-90, 0, 0], 1, 'de lado', 'suspension');
  add('Mangueta, izquierda', C.mangueta(Q), [-90, 0, 0], 1, 'tumbada (con soportes en árbol, solo en la cama)', 'suspension'); add('Mangueta, derecha', espejo(C.mangueta(Q)), [90, 0, 0], 1, 'tumbada (con soportes en árbol, solo en la cama)', 'suspension');
  add('Separador del eje de delante', C.separadorEje(Q), null, 2, 'de pie', 'suspension');
  add('Portamangueta de detrás, izquierdo', C.portamanguetaT(Q), [180, 0, 0], 1, 'boca abajo (con soportes en árbol, solo en la cama)', 'suspension'); add('Portamangueta de detrás, derecho', espejo(C.portamanguetaT(Q)), [180, 0, 0], 1, 'boca abajo (con soportes en árbol, solo en la cama)', 'suspension');
  add('Hexágono de la rueda (con tuerca M5 dentro)', C.hexagonoRueda(), [180, 0, 0], 4, 'boca abajo', 'suspension'); add('Copa de la rueda de atrás', C.copaRueda(), null, 2, 'boca abajo', 'transmision');
  add('Espaciador del amortiguador (' + n2(E.amortiguador) + ' mm)', espaciador(E.amortiguador), null, 4, 'de pie', 'suspension'); add('Espaciador de la biela de delante (' + n2(E.bielaDel) + ' mm)', espaciador(E.bielaDel), null, 2, 'de pie', 'suspension');
  add('Placa izquierda de la caja (la del motor)', T.placaCaja(Q, 'izq'), [-90, 0, 0], 1, 'tumbada', 'transmision'); add('Placa derecha de la caja (con los postes)', T.placaCaja(Q, 'der'), [90, 0, 0], 1, 'tumbada', 'transmision'); // (girada, NUNCA reflejada: placaParaImprimir reflejaba la izquierda)
  add('Caja del diferencial, mitad izquierda', T.casaDif('izq'), [90, 0, 0], 1, 'el corte en la cama', 'transmision'); add('Caja del diferencial, mitad derecha (con la corona)', T.casaDif('der'), [-90, 0, 0], 1, 'el corte en la cama', 'transmision');
  add('Planetario (13 dientes)', T.planetario('izq'), [180, 0, 0], 2, 'la espalda en la cama', 'transmision'); add('Satélite (9 dientes)', T.satelite(), [180, 0, 0], 2, 'la espalda en la cama', 'transmision');
  add('Tubo del planetario izquierdo', T.tuboPlanetario('izq'), null, 1, 'de pie', 'transmision'); add('Tubo del planetario derecho', T.tuboPlanetario('der'), null, 1, 'de pie', 'transmision');
  add('Engranaje intermedio (40 + 13)', T.intermedio(), [-90, 0, 0], 1, 'tumbado', 'transmision');
  add('Copa de salida izquierda', T.copaSalida('izq'), null, 1, 'de pie', 'transmision'); add('Copa de salida derecha', T.copaSalida('der'), null, 1, 'de pie', 'transmision');
  add('Palier', T.palier(T.largoPalier(Q)), null, 2, 'tumbado, sobre su cara plana', 'transmision');
  add('Base de la dirección', T.baseDireccion(Q), null, 1, 'plana', 'direccion'); add('Balancín izquierdo', T.balancin(Q), null, 1, 'como va', 'direccion'); add('Balancín derecho', espejo(T.balancin(Q)), null, 1, 'como va', 'direccion');
  add('Barra de la dirección', T.barraDir(Q), null, 1, 'plana', 'direccion'); add('Brazo del servo', T.brazoServo(Q), null, 1, 'plano', 'direccion');
  return P; }
// las CAMAS de la P1P (250 × 250). 20-10 noche: el reparto de la bici («la siguiente que quepa») dejaba camas medio vacías —el monster iba en 5, dos de
// ellas con una sola torre—. Aquí cada pieza, de la más larga a la más corta, va a la PRIMERA cama y fila donde cabe, girada 90° si así cabe (girar en la
// cama no cambia cómo se imprime). Devuelve, por cama, [{ i, x, y, gira }] (x, y: la esquina de la pieza en la cama).
export function colocaCamas(D, lado = 250, sep = 5) { const E = 1e-6, camas = [];
  const orden = D.map((d, i) => i).sort((a, b) => Math.max(D[b][0], D[b][1]) - Math.max(D[a][0], D[a][1]) || D[b][0] * D[b][1] - D[a][0] * D[a][1]);
  const enFila = (C, i, w, h, gira) => { for (const F of C.filas) if (h <= F.h + E && F.x + w <= lado + E) { C.L.push({ i, x: F.x, y: F.y, gira }); F.x += w + sep; return true; } return false; };
  const filaNueva = (C, i, w, h, gira) => { if (C.y + h > lado + E || w > lado + E) return false; C.filas.push({ y: C.y, h, x: w + sep }); C.L.push({ i, x: 0, y: C.y, gira }); C.y += h + sep; return true; };
  for (const i of orden) { const [a, b] = D[i], tum = [[Math.max(a, b), Math.min(a, b), a < b], [Math.min(a, b), Math.max(a, b), a >= b]]; // (tumbada a lo largo · de pie)
    const pon = C => tum.some(([w, h, g]) => enFila(C, i, w, h, g)) || tum.some(([w, h, g]) => filaNueva(C, i, w, h, g));
    if (!camas.some(pon)) { const C = { filas: [], y: 0, L: [] }; camas.push(C); if (!pon(C)) N.mal('Una pieza no cabe en la cama de 250 × 250.'); } }
  return camas.map(C => C.L); }
export const camasDe = P => colocaCamas(P.map(x => N.caja(x.m).dims)).map(c => c.map(x => x.i));
// una cama, tal cual la ha repartido colocaCamas
function camaN(P, k) { const Cs = colocaCamas(P.map(x => N.caja(x.m).dims)); if (!Cs[k]) N.mal('Este camión va en ' + Cs.length + ' camas: elige «Cama 1»…«Cama ' + Cs.length + '».');
  return N.aLaCama(N.union(Cs[k].map(({ i, x, y, gira }) => { const m = gira ? P[i].m.rotate([0, 0, 90]) : P[i].m, b = N.caja(m); return m.translate([x - b.min[0], y - b.min[1], -b.min[2]]); }))); }

// ---------- 2) la TORNILLERÍA, los RODAMIENTOS y lo demás que se compra (sacado del diseño) ----------
// cada fila: [cuántos, qué, dónde va]
export function tornilleria(Q) { const L = [], t = (k, q, d) => L.push([k, q, d]), r = C.recorrido, E = ESPACIADORES(Q);
  const hb = G => Math.ceil(G.hb[1] - G.hb[0] + 10.4 + 2 * TOR.m3.hAuto + 1), bF = Math.round(C.poseEsquina(Q.F, 0).U1 && Math.hypot(Q.F.U1[0] - Q.F.U0[0], Q.F.U1[1] - Q.F.U0[1])), bT = Math.round(Math.hypot(Q.T.U1[0] - Q.T.U0[0], Q.T.U1[1] - Q.T.U0[1]));
  const gR = T.giroRuedas(Q, 0), bD = Math.round(gR.Lizq);
  // los ejes de las ruedas (de rosca completa: el cubo de la llanta, ~7 mm, y la autoblocante)
  const ejeD = largoM5(C.caraRueda(Q, true) + 7 + TOR.m5.hAuto + 1 - C.SEP_EJE(Q).y0), ejeT = largoM5(C.caraRueda(Q, false) + 7 + TOR.m5.hAuto + 1 - (Q.yK - 2.3 - 0.5));
  // los ejes de salida del diferencial: de la cabeza (dentro del planetario) a la tuerca (dentro de la copa)
  const cab = DIF_CABEZA(), sal = lado => largoM5(T.SALIDA[lado].placa + 0.6 + T.COPA_S.hex + T.COPA_S.tuerca - cab);
  t(8, 'Rodamiento 5×11×4 (MR115ZZ)', 'dos en cada mangueta (delante) y dos en cada portamangueta (detrás)'); t(2, 'Rodamiento 5×11×4 (MR115ZZ)', 'en el engranaje intermedio, uno en cada punta');
  t(2, ROD.r8.t, 'el diferencial: uno en cada placa de la caja de cambios (el tubo de cada salida gira en él)');
  t(12, 'Rótula M3 (de bola, para 1/10)', 'dos en cada biela de caída (4 bielas) y dos en cada bieleta de la dirección');
  t(1, 'Varilla roscada M3 de 1 m', 'se corta: 2 de ' + hb(Q.F) + ' mm (ejes de los trapecios de delante) · 2 de ' + hb(Q.T) + ' mm (los de detrás) · 2 de ' + (bF - 8) + ' mm (bielas de caída de delante, ' + bF + ' mm de centro a centro) · 2 de ' + (bT - 8) + ' mm (las de detrás, ' + bT + ' mm) · 2 de ' + (bD - 8) + ' mm (bieletas, ' + bD + ' mm) · 4 de 20 mm (los postes de la carrocería)');
  t(8, 'Tuerca M3 autoblocante', 'en las puntas de los 4 ejes de los trapecios');
  t(4, 'Pasador de acero 3 × 14', 'en las bolas de los palieres (dos en cada uno)');
  t(4, 'Tornillo M3 × 25 + autoblocante', 'el pasador de la punta de cada trapecio (atraviesa sus orejas y la pieza en C / el portamangueta)');
  t(2, 'Tornillo M3 × 12', 'el pivote de arriba de cada mangueta (por la placa de arriba de la C, rosca en la mangueta)'); t(2, 'Tornillo M3 × 10', 'el pivote de abajo de cada mangueta');
  t(4, 'Tornillo M3 × 25 + autoblocante + espaciador impreso de ' + n2(E.amortiguador) + ' mm', 'el ojo de arriba de cada amortiguador, en su torre'); t(4, 'Tornillo M3 × 20 + autoblocante', 'el ojo de abajo de cada amortiguador, entre las dos orejas del trapecio');
  t(2, 'Tornillo M3 × 25 + autoblocante + espaciador impreso de ' + n2(E.bielaDel) + ' mm', 'la rótula de dentro de cada biela de delante (rosca en la torre; la autoblocante, detrás de la rótula)');
  t(2, 'Tornillo M3 × 25 + autoblocante', 'la rótula de fuera de cada biela de delante (por el lomo de la pieza en C)');
  t(2, 'Tornillo M3 × 16', 'la rótula de dentro de cada biela de detrás (rosca en su soporte)'); t(2, 'Tornillo M3 × 35 + autoblocante', 'la rótula de fuera de cada biela de detrás (por las dos mejillas del portamangueta)');
  t(4, 'Tornillo M3 × 10', 'cada soporte de biela de detrás a la torre (2 cada uno; rosca en el soporte)');
  t(2, 'Tornillo M3 × 14', 'la rótula de cada bieleta en el brazo de su mangueta (rosca en la mangueta, la rótula por debajo)'); t(2, 'Tornillo M3 × 16 + autoblocante', 'la rótula de cada bieleta en su balancín (la autoblocante, encima)');
  t(2, 'Tornillo M3 × 25', 'el eje de cada balancín (rosca en su poste de la base)'); t(3, 'Tornillo M3 × 10', 'la barra de la dirección: en los dos balancines y en el brazo del servo');
  t(4, 'Tornillo M3 × 12', 'las orejas del servo en sus postes'); t(4, 'Tornillo M3 × 10 + tuerca', 'la base de la dirección al chasis (la tuerca, metida por debajo del chasis)');
  t(2, 'Tornillo M3 × 12 + tuerca', 'la torre de delante al chasis (tuerca por debajo)'); t(2, 'Tornillo M3 × 16 + tuerca', 'la torre de detrás: por el chasis y la placa del parachoques (la tuerca, debajo de él)');
  t(3, 'Tornillo M3 × 16', 'los postes de la caja de cambios (por la placa izquierda, rosca en los postes de la derecha)'); t(4, 'Tornillo M3 × 10', 'las 4 patas de la caja de cambios, desde debajo del chasis (rosca en las patas)');
  t(2, 'Tornillo M3 × 8', 'el motor en la placa izquierda (en las ranuras: así se ajusta el engrane)');
  t(4, 'Tornillo M3 × 30 + tuerca', 'las dos mitades de la caja del diferencial (la tuerca, metida en la mitad de la corona)'); t(1, 'Tornillo M3 × 40 (o pasador de 3 × 38)', 'el eje de los satélites: queda atrapado entre las dos mitades');
  t(1, 'Tornillo M5 × ' + sal('izq') + ' + tuerca M5', 'la salida izquierda del diferencial (cabeza dentro del planetario, tuerca dentro de la copa)'); t(1, 'Tornillo M5 × ' + sal('der') + ' + tuerca M5', 'la salida derecha');
  t(1, 'Tornillo M5 × 60 + autoblocante', 'el eje del engranaje intermedio (atraviesa la caja de cambios)');
  t(2, 'Tornillo M5 × ' + ejeD + ' de rosca completa + autoblocante', 'el eje de cada rueda de delante (la cabeza por dentro, contra el separador)'); t(2, 'Tornillo M5 × ' + ejeT + ' de rosca completa + autoblocante', 'el eje de cada rueda de detrás (la cabeza, dentro de su copa)');
  t(4, 'Tuerca M5 (normal)', 'dentro de cada hexágono de rueda (a presión): con fijador de roscas');
  t(8, 'Tornillo M3 × 10 + tuerca', 'la bandeja central a las dos mitades del chasis (tuercas en la bandeja)'); t(3, 'Tornillo M3 × 10 + tuerca', 'el parachoques de delante (tuercas por debajo del chasis)');
  // el RESUMEN para comprarlo de una vez (sumado de lo de arriba)
  const suma = (re, f = x => x[0]) => L.filter(x => re.test(x[1])).reduce((a, x) => a + f(x), 0), largos = [...new Set(L.filter(x => /^Tornillo M3 × \d+/.test(x[1])).map(x => +x[1].match(/M3 × (\d+)/)[1]))].sort((a, b) => a - b);
  const autoM3 = suma(/Tornillo M3.*autoblocante/) + suma(/^Tuerca M3 autoblocante/), tuercaM3 = suma(/Tornillo M3.*\+ tuerca/), m3 = suma(/^Tornillo M3/);
  t(m3, 'EN TOTAL: tornillos M3 (cabeza Allen, DIN 912), de ' + largos.join(', ') + ' mm', 'un surtido de M3 de 300 piezas los trae todos; y ' + autoM3 + ' tuercas M3 AUTOBLOCANTES y ' + tuercaM3 + ' tuercas M3 normales');
  return L; }
// la cabeza del tornillo M5 de salida, desde el centro del diferencial: el fondo de su hueco en el planetario (hacia fuera)
let DCAB = null; // (solo un número: se calcula una vez, en el motor aparte, sin fabricar los dos piñones cónicos en cada nota)
const DIF_CABEZA = () => { if (DCAB === null) { const haz = () => { const K = T.juegoConico().P.K; return K.zRaiz - 0.6 + TOR.m5.hCabHex + 0.6; }; let r = N.enAparteDatos(haz); if (r === undefined) r = N.enAmbito(haz); DCAB = r; } return DCAB; };
// lo que se COMPRA además (la electrónica y las piezas de 1/10 estándar)
export function compras(Q) { const Cm = T.COMP, E = C.ESTILOS[Q.estilo];
  return [Cm.motor.t, Cm.pinon.t, Cm.esc.t, Cm.bateria.t + ' y 2 correas de velcro de 20 mm', Cm.receptor.t, Cm.servo.t,
    'Cuatro amortiguadores de aceite de 1/10: delante de ' + E.amD[0] + ' mm estirados (' + E.amD[1] + ' comprimidos) y detrás de ' + E.amT[0] + ' (' + E.amT[1] + '), de ojo a ojo, con ojo para M3',
    Cm.ruedas.t.replace('Cuatro ruedas de 1/10', 'Cuatro ruedas de 1/10 de Ø' + Math.round(Q.D) + ' mm'), Cm.carroceria.t]; }

// ---------- 3) 🧪 la PRUEBA DE ENCAJE: lo que hay que comprobar con TUS rodamientos, TU rueda y TUS pasadores antes de imprimir todo ----------
export function pruebaCamion(p) { const Q = medidas(p), L = [], r5 = ROD.r5, r8 = ROD.r8;
  // un bloque con los dos alojamientos de rodamiento (a presión) y el agujero del eje M5
  L.push(A.conBisel(A.rr(46, 24, 3), 6, 0.5).subtract(cil(r5.D + 2 * PRES, r5.b + 0.01, 6 - r5.b).translate([-11, 0, 0])).subtract(cil(TOR.m5.paso, 8, -1).translate([-11, 0, 0])).subtract(cil(r8.D + 2 * PRES, r8.b + 0.01, 6 - r8.b).translate([11, 0, 0])).subtract(cil(10.5, 8, -1).translate([11, 0, 0])));
  L.push(T.tuboPlanetario('der')); // el TUBO de una salida: su Ø7,9 entra a presión en TU 8×12×4 y su hexágono pasa por el agujero del rodamiento
  L.push(C.hexagonoRueda().rotate([180, 0, 0])); // en TU rueda: el hexágono de 12 tiene que entrar justo
  L.push(C.copaRueda()); L.push(T.palier(14)); // la copa con un palier corto (tus pasadores de 3 × 14)
  L.push(C.trapecioPlano(Q.F).intersect(A.caja(52, 16, 40).translate([0, 0, -20]))); // la bisagra del trapecio (con su tornillo M3)
  L.push(T.planetario('izq').rotate([180, 0, 0])); L.push(T.satelite().rotate([180, 0, 0])); // un planetario y un satélite: casan a mano
  return L; }

// ---------- 4) la FICHA y el MANUAL ----------
export const NOMBRES = { chasisT: ['Chasis, mitad de atrás', 1], chasisD: ['Chasis, mitad de delante', 2], bandeja: ['Bandeja central', 3], placaDer: ['Placa derecha de la caja', 4], intermedio: ['Engranaje intermedio', 5],
  difDer: ['Caja del diferencial (mitad con la corona)', 6], satD: ['Satélite', 6], satT: ['Satélite', 6], planDer: ['Planetario derecho', 6], planIzq: ['Planetario izquierdo', 6], tuboIzq: ['Tubo del planetario izquierdo', 6], tuboDer: ['Tubo del planetario derecho', 6], difIzq: ['Caja del diferencial (otra mitad)', 7],
  placaIzq: ['Placa izquierda de la caja', 8], motor: ['Motor', 9], pinon: ['Piñón del motor', 9], copaSIzq: ['Copa de salida izquierda', 10], copaSDer: ['Copa de salida derecha', 10],
  torreD: ['Torre de delante', 11], torreT: ['Torre de detrás', 11], soporteBielaIzq: ['Soporte de la biela de atrás', 11], soporteBielaDer: ['Soporte de la biela de atrás', 11],
  trapecio: ['Trapecio', 12], portamangueta: ['Portamangueta de detrás', 13], copa: ['Copa de la rueda', 13], palierIzq: ['Palier izquierdo', 13], palierDer: ['Palier derecho', 13],
  piezaC: ['Pieza en C', 14], mangueta: ['Mangueta', 14], separador: ['Separador del eje', 14], ejeM5: ['Tornillo-eje M5', 15], hexagono: ['Hexágono de la rueda', 15], rueda: ['Rueda', 15],
  amortiguador: ['Amortiguador', 16], biela: ['Biela de caída', 17], baseDir: ['Base de la dirección', 18], servo: ['Servo', 18], balancinIzq: ['Balancín izquierdo', 19], balancinDer: ['Balancín derecho', 19], barraDir: ['Barra de la dirección', 19], brazoServo: ['Brazo del servo', 19],
  bieletaIzq: ['Bieleta izquierda', 20], bieletaDer: ['Bieleta derecha', 20], bateria: ['Batería', 21], esc: ['Variador (ESC)', 21], receptor: ['Receptor', 21], parachoquesD: ['Parachoques de delante', 22], parachoquesT: ['Parachoques de detrás', 22], poste: ['Poste de la carrocería', 22] };
// (solo los postes llevan número detrás: el 5 de «ejeM5» no se quita)
export const nombreDe = k => { let k0 = k.replace(/(D|T)(i|d)$/, ''); if (/^poste\d+$/.test(k0)) k0 = 'poste'; const e = NOMBRES[k] || NOMBRES[k0]; if (!e) return [k, 30]; const lado = /Di$|Ti$/.test(k) ? ' (izquierda)' : /Dd$|Td$/.test(k) ? ' (derecha)' : '', delante = /D(i|d)$/.test(k) ? ' de delante' : /T(i|d)$/.test(k) && !/detrás|de atrás/.test(e[0]) ? ' de detrás' : '';
  return [e[0] + delante + lado, e[1]]; };
// (20-10 noche: la nota y el manual solo necesitan CONTAR piezas y camas, pero fabricaban las 57 piezas en el motor principal cada vez; con eso y las
// vistas, a las ~15 vistas el motor se quedaba sin memoria —«memory access out of bounds»— y ya no salía nada. Se cuenta en el motor aparte, que luego
// se tira, y se guarda: solo números y textos, por medidas)
const RESUMEN = new Map();
function resumen(p) { const clave = JSON.stringify(Object.entries(p || {}).filter(([k]) => k !== 'que').sort()); if (RESUMEN.has(clave)) return RESUMEN.get(clave);
  const haz = () => { const P = piezasCamion(medidas(p)), cuenta = new Map(); P.forEach(x => { const c = cuenta.get(x.t) || { k: 0, como: x.como }; c.k++; cuenta.set(x.t, c); });
    const Cs = camasDe(P); return { camas: Cs.length, piezas: [...cuenta].map(([t, c]) => [t, c.k, c.como]), conSoportes: Cs.map((c, i) => c.some(j => SOPORTES.test(P[j].t)) ? i + 1 : 0).filter(Boolean) }; };
const SOPORTES = /^Mangueta|^Portamangueta/; // (las únicas que llevan soportes, de árbol)
  let r = N.enAparteDatos(haz); if (r === undefined) r = N.enAmbito(haz);
  RESUMEN.set(clave, r); return r; }
export function manualCamion(p) { const Q = medidas(p), E = ESPACIADORES(Q), g = T.giroRuedas(Q, 24), R = resumen(p);
  const tor = tornilleria(Q), rT = C.recorrido(Q.T), rF = C.recorrido(Q.F);
  return { vistas: [['montado', 'Así queda montado (con los componentes en gris)'], ['despiece', 'Dónde va cada pieza'], ['transmision', 'La caja de cambios y el diferencial, por piezas']],
    piezas: R.piezas.map(x => x.slice()), tornilleria: tor,
    herramientas: 'Llaves Allen de 2 y 2,5 mm, llave de 5,5 y de 8, alicates, sierra para metal (la varilla roscada), fijador de roscas azul, grasa (el diferencial) y cinta de doble cara. Lo que se compra: ' + compras(Q).join(' · ') + '.',
    edad: 'A partir de 14 años; con un adulto al cargar la batería (LiPo) y la primera vez que se prueba.',
    pasos: ['Imprime antes la 🧪 PRUEBA DE ENCAJE con TUS rodamientos, TU rueda y TUS pasadores: el rodamiento entra a presión, el hexágono justo en la rueda, el palier se inclina en su copa y la bisagra gira. Si algo no casa, dime cuánto y se ajusta.',
      'CHASIS: atornilla las dos mitades a la BANDEJA central (8 M3 × 10, tuercas en la bandeja).',
      'CAJA DE CAMBIOS: en la PLACA DERECHA (la de los postes), su rodamiento 8×12×4; el ENGRANAJE INTERMEDIO con sus dos 5×11×4 en el tornillo M5 × 60.',
      'DIFERENCIAL: en la mitad de la corona, sus 4 tuercas M3; los dos SATÉLITES en su eje M3 × 40 (en el corte), los PLANETARIOS con la cabeza de su tornillo M5 dentro, sus TUBOS; grasa; la otra mitad y sus 4 M3 × 30. Gira a mano: un lado al revés que el otro.',
      'Mete el diferencial en su rodamiento, pon la PLACA IZQUIERDA (con su 8×12×4) y los 3 M3 × 16 de los postes; la autoblocante del M5 del intermedio.',
      'El MOTOR en la placa izquierda (2 M3 × 8 en las ranuras) con su PIÑÓN de metal: aprieta el piñón contra el engranaje de 40 con un papel en medio y quita el papel (ese es el juego bueno).',
      'Las COPAS DE SALIDA en el hexágono de cada tubo, con su tuerca M5 dentro (fijador de roscas). La caja al chasis: 4 M3 × 10 desde abajo.',
      'TORRES: la de delante (2 M3 × 12, tuercas por debajo) y la de detrás (2 M3 × 16 por el chasis y el parachoques de detrás); los SOPORTES de las bielas de detrás (2 M3 × 10 cada uno).',
      'TRAPECIOS: cada uno entre sus dos orejetas con su eje de varilla roscada M3 y dos autoblocantes (que giren sin holgura).',
      'DETRÁS: el PORTAMANGUETA en la punta del trapecio (M3 × 25), sus dos 5×11×4, la COPA con la cabeza del tornillo-eje M5 dentro, el PALIER con sus dos pasadores 3×14 entre la copa de salida y la de la rueda.',
      'DELANTE: la PIEZA EN C en la punta del trapecio (M3 × 25); la MANGUETA dentro con sus dos pivotes (M3 × 12 arriba, M3 × 10 abajo) y sus dos 5×11×4; el SEPARADOR y el tornillo-eje M5.',
      'Los HEXÁGONOS (con su tuerca M5 dentro), las RUEDAS y sus autoblocantes M5 (fijador de roscas en los de detrás).',
      'AMORTIGUADORES: arriba en su torre con el espaciador impreso de ' + n2(E.amortiguador) + ' mm (M3 × 25), abajo entre las orejas del trapecio (M3 × 20).',
      'BIELAS DE CAÍDA (varilla roscada con dos rótulas): delante, en la torre con el espaciador de ' + n2(E.bielaDel) + ' mm y en el lomo de la C; detrás, en su soporte y entre las dos mejillas del portamangueta. Ajústalas para que las ruedas queden rectas o con 1° de caída.',
      'DIRECCIÓN: la BASE al chasis (4 M3 × 10 con tuerca), el SERVO de pie en sus postes, los dos BALANCINES en sus postes (M3 × 25), la BARRA y el BRAZO DEL SERVO (3 M3 × 10). Las dos BIELETAS (rótulas) del balancín a la mangueta.',
      'Centra el servo con la emisora y ajusta las bieletas hasta que las ruedas miren rectas. En la emisora, deja el recorrido del servo en ±24° (las ruedas giran unos ' + Math.round(Math.max(Math.abs(g.izq), Math.abs(g.der))) + '° la de dentro): más, y tocan los trapecios.',
      'BATERÍA en su bandeja (2 correas de velcro), VARIADOR y RECEPTOR en sus marcos (cinta de doble cara), la antena por su tubo; PARACHOQUES de delante (3 M3 × 10) y los POSTES con su trozo de varilla roscada; la carrocería.'],
    consejos: ['Reducción ' + n2(Math.round(T.relacion() * 100) / 100) + ' : 1 (piñón 13 → 40 · 13 → corona 47). Con un 540 de 21–27 vueltas y 2S, unos 25–30 km/h; si se calienta el motor, un piñón de 11–12.',
      'Suspensión: delante sube ' + Math.round(C.poseEsquina(Q.F, rF.arriba).W[1] - Q.zA) + ' mm y baja ' + Math.round(Q.zA - C.poseEsquina(Q.F, rF.abajo).W[1]) + '; detrás sube ' + Math.round(C.poseEsquina(Q.T, rT.arriba).W[1] - Q.zA) + ' y baja ' + Math.round(Q.zA - C.poseEsquina(Q.T, rT.abajo).W[1]) + ' (lo que dejan tus amortiguadores). Al comprimir, la rueda se cierra por arriba (como en los de carreras).',
      'Los PALIERES impresos aguantan lo que agarran las ruedas en tierra; si usas un sin escobillas potente en asfalto, imprímelos en PETG con 6 paredes y 100 % de relleno.',
      'En el 🎬 Catálogo de CelebriR8 → 🔧 Montaje paso a paso se ve este mismo orden, pieza a pieza.'],
    cuidados: ['Mira después de cada salida que los tornillos de los trapecios y de las ruedas no se hayan aflojado.', 'Engrasa el diferencial y los engranajes cada 5–10 baterías (grasa de litio o de silicona).', 'La batería LiPo, siempre con su cargador y vigilada; si se hincha, no la uses.'] }; }

export function notaCamion(p) { let Q, nCamas; try { Q = medidas(p); nCamas = resumen(p).camas; } catch (e) { return '⚠️ ' + e.message; } const E = C.ESTILOS[Q.estilo], g = T.giroRuedas(Q, 24), rF = C.recorrido(Q.F), rT = C.recorrido(Q.T), tor = tornilleria(Q);
  if (p.que === 'despiece') return '📐 EL DIBUJO DE MONTAJE: el chasis abajo; encima la caja de cambios, la suspensión, la dirección y los componentes. Gíralo con el ratón.';
  if (p.que === 'prueba') return '🧪 PRUEBA DE ENCAJE (unos 30 g, en PETG): el BLOQUE con los alojamientos de un 5×11×4 y de un 8×12×4 (tus rodamientos entran a presión); el TUBO de una salida (entra a presión en tu 8×12×4 y su hexágono pasa por dentro); el HEXÁGONO en TU rueda (justo); la COPA con un palier corto y TUS pasadores 3×14 (se inclina sin tocar); la BISAGRA del trapecio con un tornillo M3 (gira sin holgura); un PLANETARIO y un SATÉLITE (casan a mano). Si algo no casa, dime cuánto y lo ajusto.';
  const n5 = tor.filter(x => /5×11×4/.test(x[1])).reduce((a, x) => a + x[0], 0), n8 = tor.filter(x => /8×12×4/.test(x[1])).reduce((a, x) => a + x[0], 0);
  return 'PARA QUÉ: un CAMIÓN RC 1/10 de verdad, estilo ' + E.t.toLowerCase() + ': ' + Math.round(Q.WB + 110) + ' mm de largo, batalla ' + Q.WB + ', vía ' + Q.via + ', ruedas de Ø' + Math.round(Q.D) + '. Tracción trasera con DIFERENCIAL de piñones cónicos, suspensión independiente en las 4 ruedas con amortiguadores de aceite, dirección con balancines (Ackermann) y todo lo que va girando, sobre rodamientos. Diseño propio © CelebriDiseños, compatible con lo estándar de 1/10. '
    + 'LO QUE COMPRAS: ' + compras(Q).join('; ') + '. Y la TORNILLERÍA (en el 📄 manual, cada tornillo con su medida y dónde va): ' + n5 + ' rodamientos 5×11×4, ' + n8 + ' de 8×12×4 (los dos, de los que ya tienes), 12 rótulas M3, una varilla roscada M3 de 1 m, 4 pasadores de 3 × 14 y tornillos M3/M5 de catálogo. '
    + 'DÓNDE VA CADA COSA: el MOTOR detrás a la izquierda, en la caja de cambios; el SERVO de pie delante, en su base; la BATERÍA en la bandeja (lado derecho), el VARIADOR y el RECEPTOR a la izquierda. '
    + 'NÚMEROS (calculados): reducción ' + n2(Math.round(T.relacion() * 100) / 100) + ' : 1; la suspensión de delante recorre ' + Math.round(C.poseEsquina(Q.F, rF.arriba).W[1] - C.poseEsquina(Q.F, rF.abajo).W[1]) + ' mm y la de detrás ' + Math.round(C.poseEsquina(Q.T, rT.arriba).W[1] - C.poseEsquina(Q.T, rT.abajo).W[1]) + '; con el servo a ±24° la rueda de dentro gira ' + Math.round(Math.max(Math.abs(g.izq), Math.abs(g.der))) + '° y la de fuera ' + Math.round(Math.min(Math.abs(g.izq), Math.abs(g.der))) + '° (Ackermann); al subir y bajar la suspensión, la rueda casi no se tuerce. '
    + 'VA EN ' + nCamas + ' CAMAS de la P1P, en PETG con 6 paredes y 60 % de relleno (el programa lo pone solo al exportar: «⚙️ Mecánica a medida»). Sin soportes salvo las 2 manguetas y los 2 portamanguetas (en árbol, solo en la cama). '
    + 'CÓMO SE MONTA: (1) la prueba de encaje; (2) el chasis con su bandeja; (3) la caja de cambios con el diferencial y el motor; (4) las torres y los trapecios; (5) detrás, portamanguetas, copas y palieres; delante, la pieza en C y la mangueta; las ruedas; (6) amortiguadores y bielas de caída; (7) la dirección con el servo; (8) la electrónica, los parachoques y la carrocería. Todo, paso a paso y con la tornillería, en el 📄 manual. '
    + 'Probado con el ordenador (test/unit/camion.mjs): en los 3 estilos nada se pisa en reposo, con la suspensión arriba y abajo del todo, con la dirección a tope y con el diferencial girando; los engranajes casan; los palieres no se salen de sus copas. Lo que no se puede probar sin montarlo: tus componentes (por eso la prueba de encaje).'; }

// ---------- 5) GENERAR (lo que se ve en el catálogo) ----------
const GRUPOS = { chasis: 'chasis', suspension: 'suspension', transmision: 'transmision', direccion: 'direccion' };
export function despieceCamion(Q, L) { const c = [Q.WB / 2, 0];
  return L.map(x => { const b = N.caja(x.m), q = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2], zc = (b.min[2] + b.max[2]) / 2, d = [q[0] - c[0], q[1] - c[1]];
    const capa = /^chasis/.test(x.k) ? 0 : /^(bandeja|parachoques|poste)/.test(x.k) ? 0.3 : /^(placa|dif|plan|sat|tubo|intermedio|motor|pinon|copaS)/.test(x.k) ? 0.7 : /^(rueda|hexagono|ejeM5)/.test(x.k) ? 1.6 : 1.1;
    return { k: x.k, g: x.g, m: x.m.translate([d[0] * 0.15 * capa, d[1] * 0.55 * capa, /^chasis/.test(x.k) ? 0 : 25 + zc * 0.5 * capa]) }; }); }
export function genCamion(p) { const que = p.que || 'cama1';
  if (que === 'prueba') return U.enCama(pruebaCamion(p));
  const Q = medidas(p);
  if (que === 'montado' || que === 'girado') return N.union(T.camionCompleto(Q, que === 'girado' ? { th: 20 } : {}).map(x => x.m));
  if (que === 'despiece') return N.union(despieceCamion(Q, T.camionCompleto(Q, {})).map(x => x.m));
  const P = piezasCamion(Q); let I = P.map((x, i) => i);
  if (GRUPOS[que]) I = I.filter(i => P[i].g === GRUPOS[que]);
  else if (/^cama\d+$/.test(que)) return camaN(P, +que.slice(4) - 1);
  if (!I.length) N.mal('No hay piezas en «' + que + '».');
  return U.enCama(I.map(i => P[i].m)); }
const U = B.UTIL;

// ---------- 6) la ANIMACIÓN (movimiento exacto): ruedas y transmisión girando con su relación; la dirección a un lado y al otro ----------
const M4rot = (eje, c, a) => { const [x, y, z] = eje, co = Math.cos(a), si = Math.sin(a), t = 1 - co, R = [[t * x * x + co, t * x * y - si * z, t * x * z + si * y], [t * x * y + si * z, t * y * y + co, t * y * z - si * x], [t * x * z - si * y, t * y * z + si * x, t * z * z + co]];
  const o = [0, 1, 2].map(i => c[i] - (R[i][0] * c[0] + R[i][1] * c[1] + R[i][2] * c[2])); return [R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, o[0], o[1], o[2], 1]; };
const mult = (A2, B2) => { const Cm = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) Cm[j * 4 + i] += A2[k * 4 + i] * B2[j * 4 + k]; return Cm; };
const tras = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
// la matriz que lleva el segmento A0→B0 al A1→B1 (sin estirarlo): para las bieletas, que van de bola a bola
function deSegmento(A0, B0, A1, B1) { const u = [B0[0] - A0[0], B0[1] - A0[1], B0[2] - A0[2]], v = [B1[0] - A1[0], B1[1] - A1[1], B1[2] - A1[2]], nu = Math.hypot(...u), nv = Math.hypot(...v);
  const a = u.map(x => x / nu), b = v.map(x => x / nv), ax = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], s2 = Math.hypot(...ax), c2 = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const R = s2 < 1e-9 ? tras(0, 0, 0) : M4rot(ax.map(x => x / s2), [0, 0, 0], Math.atan2(s2, c2)); const p = [R[0] * A0[0] + R[4] * A0[1] + R[8] * A0[2], R[1] * A0[0] + R[5] * A0[1] + R[9] * A0[2], R[2] * A0[0] + R[6] * A0[1] + R[10] * A0[2]];
  return mult(tras(A1[0] - p[0], A1[1] - p[1], A1[2] - p[2]), R); }
export function montadasCamion(p) { const Q = medidas(p), L = T.camionCompleto(Q, {}), K = T.centros(Q), D = T.sitioDir(Q), Y = [0, 1, 0], Z = [0, 0, 1], v = 0.5; // (media vuelta de rueda por segundo, a cámara lenta)
  const w = t => 2 * Math.PI * v * t, th = t => 20 * Math.sin(2 * Math.PI * 0.2 * t), r1 = TREN_R().corona / TREN_R().top, r2 = TREN_R().spur / TREN_R().pin;
  const giroRueda = t => M4rot(Y, [0, 0, Q.zA], -w(t)); // (hacia delante)
  const delante = (izq, t) => { const g = T.giroRuedas(Q, th(t)), d = izq ? g.izq : g.der; return mult(M4rot(Z, [Q.WB, izq ? Q.yK : -Q.yK, 0], d * R2), M4rot(Y, [Q.WB, 0, Q.zA], -w(t))); };
  const steer = (izq, t) => { const g = T.giroRuedas(Q, th(t)), d = izq ? g.izq : g.der; return M4rot(Z, [Q.WB, izq ? Q.yK : -Q.yK, 0], d * R2); };
  return L.map(x => { const [nombre, paso] = nombreDe(x.k), o = { m: x.m, nombre, paso }, k = x.k;
    if (/^(dif|plan|sat|tubo|copaS|palier)/.test(k) || /^(copa|hexagono|ejeM5|rueda)T[id]$/.test(k)) o.mov = { f: giroRueda };
    else if (k === 'intermedio') o.mov = { f: t => M4rot(Y, [K.I[0], 0, K.I[1]], w(t) * r1) };
    else if (k === 'pinon') o.mov = { f: t => M4rot(Y, [K.M[0], 0, K.M[1]], -w(t) * r1 * r2) };
    else if (/^(hexagono|ejeM5|rueda|separador)D[id]$/.test(k)) { const izq = /i$/.test(k); o.mov = { f: t => delante(izq, t) }; }
    else if (/^manguetaD[id]$/.test(k)) { const izq = /i$/.test(k); o.mov = { f: t => steer(izq, t) }; }
    else if (k === 'brazoServo') o.mov = { f: t => M4rot(Z, [D.eje[0], D.eje[1], 0], th(t) * R2) };
    else if (k === 'balancinIzq' || k === 'balancinDer') { const sg = k === 'balancinIzq' ? 1 : -1; o.mov = { f: t => M4rot(Z, [D.piv[0], sg * D.piv[1], 0], th(t) * R2) }; }
    else if (k === 'barraDir') o.mov = { f: t => { const a = th(t) * R2; return tras(T.DIR.brazo * (1 - Math.cos(a)), -T.DIR.brazo * Math.sin(a), 0); } };
    else if (k === 'bieletaIzq' || k === 'bieletaDer') { const sg = k === 'bieletaIzq' ? 1 : -1, A0 = T.bolaBalancin(Q, sg, 0), B0 = T.bolaMangueta(Q, sg, 0, 0);
      o.mov = { f: t => { const g = T.giroRuedas(Q, th(t)); return deSegmento(A0, B0, T.bolaBalancin(Q, sg, th(t)), T.bolaMangueta(Q, sg, 0, sg * (sg > 0 ? g.izq : g.der))); } }; }
    if (k === 'rueda' + 'Ti') o.que = 'las ruedas y la transmisión giran (el piñón del motor ' + n2(Math.round(T.relacion() * 10) / 10) + ' veces más rápido que las ruedas) y la dirección va a un lado y al otro';
    return o; }); }
const TREN_R = () => T.TREN;

const QUE = Array.from({ length: 12 }, (_, i) => ['cama' + (i + 1), 'Cama ' + (i + 1)]).concat([['chasis', 'Solo el chasis, la bandeja y los parachoques'], ['suspension', 'Solo la suspensión (torres, trapecios, C, manguetas…)'], ['transmision', 'Solo la caja de cambios y el diferencial'], ['direccion', 'Solo la dirección'],
  ['prueba', '🧪 Prueba de encaje (rodamientos, hexágono, bisagra, copa y palier, cónicos)'], ['montado', '👀 Montado (con los componentes en gris)'], ['girado', '👀 Montado con la dirección girada'], ['despiece', '📐 Despiece: el dibujo de montaje']]);
export const DISENOS_CAMION = {
  camionRC: { cat: 'rc', tambien: ['juguetes', 'pro', 'mecanica'], nuevo: true, busca: 'camión rc 1/10 truck stadium short course monster kit chasis suspensión independiente amortiguadores diferencial cónico caja de cambios motor 540 servo dirección balancines rodamientos 5x11x4 8x12x4 mr115 mr128 traxxas compatible radiocontrol',
    e: '🛻', t: 'Camión RC 1/10 por piezas (estadio, short course o monster)', d: 'Chasis de bañera, suspensión independiente con amortiguadores de aceite, caja de cambios con diferencial de piñones cónicos (11,1 : 1) y motor 540, dirección con balancines y Ackermann, todo sobre rodamientos. El manual trae cada tornillo con su medida y dónde va. Solo pones los componentes', uso: 'mecanica', color: '#d62828',
    campos: [s('estilo', 'Estilo', 'estadio', [['estadio', 'Estadio (stadium truck)'], ['corto', 'Short course'], ['monster', 'Monster']]), s('que', 'Qué imprimo', 'cama1', QUE)],
    pesado: true, soportes: p => { const q = p.que || 'cama1'; return /^cama\d+$/.test(q) ? resumen(p).conSoportes.includes(+q.slice(4)) : q === 'suspension'; }, gen: p => genCamion(p), manual: p => manualCamion(p), nota: p => notaCamion(p) } // (pesado: se fabrica en el motor aparte, que se tira cada 3: el principal no se llena)
};
