// ================= 21-10-2026 · 🔘 CLICKERS ANTIESTRÉS CON MUELLES DE BOLI (formas que relajan) =================
// Ella (plan maestro, tarea 30): «juguetes también, clicker con formas para relajar, los muelles que sean los de boli».
// Cada TECLA va en dos piezas: el VÁSTAGO (se imprime de pie: su pie en la cama, con DOS PATAS que suben y se enganchan bajo la tapa) y el
// CAPUCHÓN con la forma (se imprime boca abajo y entra a presión en el vástago: puede ir de otro color). El MUELLE DE BOLI va entre un pivote
// de la tapa de abajo y un hueco del vástago. Al apretar: un «CLIC» (la lengüeta fina de la tapa salta por encima de un diente del vástago)
// y al llegar abajo un «CLAC» (el capuchón toca la tapa); al soltar, otro clic. Las cuentas (no a ojo):
//  · un muelle de boli empuja ~1–2 N con su recorrido: una lengüeta dura no dejaría subir la tecla. La lengüeta es de 0,8 × 3 × 12 mm
//    (en voladizo): con el diente de serie (0,4 mm) empuja ~0,45 N → el muelle la devuelve. Se dobla un 0,3 % (el PLA aguanta mucho más).
//  · las patas de los ganchos NACEN ABAJO (10 mm de largo): al meterlas se doblan 0,8 mm = 1,2 % (sin partirse; arriba serían el 5 %).
// Formas: 🐾 pata de gato (5 teclas), 🎮 mando (cruceta + 4), 💗 corazón (3), ⌨️ teclado mini (3) y ☁️ nube (3). Diseño propio (© CelebriDiseños).
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, tx, M, rr, poli, cil, n2, conBisel } = A;
// ---------- las medidas del mecanismo (mm) ----------
const TP = 3, G = 15, BP = 2.5, WALL = 2.4, TRAV = 2.5, ST = 8, LEG = 1.1, LEGW = 5, GL = 1.0, HOOK = 0.7, HX = 6.3, HY = 4.3, LEN = 0.8, SLOT = 0.8;
// (los ganchos salen hasta |x| = 4 + 1 + 1,1 + 0,7 = 6,8 y el agujero llega a 6,3: 0,5 mm de agarre bajo la tapa; las patas pasan con 0,2 de aire)
export const H = TP + G + BP;  // el alto de la caja
const PEG = 5, CAP = 3.5;       // el pivote del capuchón y su grueso
export const CLICS = { suave: 0.3, medio: 0.4, fuerte: 0.5, sin: 0 }; // lo que se cruzan los dos dientes
// las FORMAS: el contorno (2D, mm) y las teclas: posición, giro del mecanismo y capuchón (forma 2D)
const circ = (d, k = 48) => N.elipse2(d, d, k), elip = (a, b) => N.elipse2(a, b, 48);
const cruz = (L, w) => { const a = L / 2, b = w / 2; return [[-a, -b], [-b, -b], [-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b], [b, a], [-b, a], [-b, b], [-a, b]]; };
const rrP = (w, h, r) => { const P = []; [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]].forEach(([x, y, a0]) => { for (let i = 0; i <= 8; i++) { const a = (a0 + i * 90 / 8) * Math.PI / 180; P.push([x + r * Math.cos(a), y + r * Math.sin(a)]); } }); return P; };
const mueveP = (P, dx, dy) => P.map(q => [q[0] + dx, q[1] + dy]);
export const FORMAS = {
  pata: { t: '🐾 Pata de gato (5 teclas)', teclas: [{ c: [-30, 13], r: -60, cap: elip(20, 17) }, { c: [-11, 26], r: -18, cap: elip(20, 17) }, { c: [11, 26], r: 18, cap: elip(20, 17) }, { c: [30, 13], r: 60, cap: elip(20, 17) }, { c: [0, -12], r: 0, cap: null, almohadilla: true }],
    contorno: () => { const L = [poli(elip(50, 42)).translate([0, -11])]; [[-30, 13], [-11, 26], [11, 26], [30, 13]].forEach(q => L.push(poli(circ(25)).translate(q))); return N.csUnion(L).offset(3.5, 'Round'); } },
  mando: { t: '🎮 Mando (cruceta + 4 botones)', teclas: [{ c: [-34, 4], r: 0, cap: cruz(30, 13.4) }, { c: [34, 23], r: 0, cap: circ(18) }, { c: [34, -15], r: 0, cap: circ(18) }, { c: [15, 4], r: 90, cap: circ(18) }, { c: [53, 4], r: 90, cap: circ(18) }],
    contorno: () => N.csUnion([poli(rrP(132, 58, 22)), poli(elip(46, 52)).translate([-44, -18]), poli(elip(46, 52)).translate([44, -18])]).offset(2, 'Round') },
  corazon: { t: '💗 Corazón (3 teclas)', teclas: [{ c: [-19, 10], r: 0, cap: N.corazon2(28) }, { c: [19, 10], r: 0, cap: N.corazon2(28) }, { c: [0, -18], r: 0, cap: N.corazon2(28) }],
    contorno: () => poli(N.corazon2(104)).translate([0, -3]) },
  teclas: { t: '⌨️ Teclado mini (3 teclas)', teclas: [{ c: [-22, 0], r: 0, cap: rrP(18, 18, 3) }, { c: [0, 0], r: 0, cap: rrP(18, 18, 3) }, { c: [22, 0], r: 0, cap: rrP(18, 18, 3) }],
    contorno: () => poli(rrP(76, 30, 8)) },
  nube: { t: '☁️ Nube (3 teclas)', teclas: [{ c: [-24, -3], r: 0, cap: circ(19) }, { c: [0, 7], r: 0, cap: circ(19) }, { c: [24, -3], r: 0, cap: circ(19) }],
    contorno: () => N.csUnion([poli(circ(36)).translate([-24, -3]), poli(circ(42)).translate([0, 7]), poli(circ(36)).translate([24, -3]), poli(rrP(86, 24, 10)).translate([0, -10])]).offset(2.5, 'Round') }
};
// la almohadilla grande de la pata: un «corazón» redondeado
const almohadilla = () => { const P = []; for (let i = 0; i < 72; i++) { const t = i / 72 * 2 * Math.PI, r = 1 + 0.12 * Math.cos(3 * t + Math.PI / 2); P.push([15 * r * Math.cos(t), 12 * r * Math.sin(t)]); } return P; };
// el contorno SIN agujeros: al unir almohadilla y dedos (o las bolas de la nube) quedaban huequecitos entre ellos que atravesaban la tapa
const areaP = P => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return a / 2; };
export function contornoLleno(F) { const L = F.contorno().toPolygons(); let m = L[0]; L.forEach(P => { if (Math.abs(areaP(P)) > Math.abs(areaP(m))) m = P; }); return N.cs([N.ccw(m)]); }
export function medidas(p) { const F = FORMAS[p.forma] || FORMAS.pata, md = Math.max(3, Math.min(6.5, +p.muelleD || 4)), clic = CLICS[p.clic] != null ? CLICS[p.clic] : CLICS.medio;
  return { F, md, ml: Math.max(10, Math.min(40, +p.muelleL || 20)), clic, aj: p.ajuste === 'presion' ? 0.05 : 0.10 }; }

// ---------- una TECLA, en su sitio local (x, y del mecanismo; z = 0 en la cara de arriba de la caja) ----------
// la PLACA de arriba: el agujero (patas en ±x, lengüeta del clic en +y) + la ranura de detrás de la lengüeta + su diente
function corteTecla() { const hueco = rr(2 * HX, 2 * HY, 0.6), ranura = rr(2 * HX - 1.0, SLOT, 0).translate([-0.5, HY + LEN + SLOT / 2]), libre = rr(SLOT, LEN + SLOT + 0.2, 0).translate([HX - 0.5 - SLOT / 2 + 0.05, HY + (LEN + SLOT) / 2]);
  return N.csUnion([hueco, ranura, libre]); } // (la lengüeta queda sujeta solo por la izquierda: en voladizo, blanda)
// el diente de la lengüeta (entra «clic»/2 en el agujero) y el del vástago (sale lo mismo): dos prismas de caras a 45°
const diente = (sale, z) => M().hull([M().cube([2.2, 0.01, 2 * sale + 0.01]).translate([0, 0, -sale]), M().cube([2.2, sale, 0.01]).translate([0, 0, 0])]).translate([0, 0, z]);
// el CLIC sin roces: el vástago lleva una RANURA (0,35 de honda) por donde corre el diente de la lengüeta (su punta a 0,1 del fondo), y el diente
// del vástago la cruza: solo se tocan al pasar uno sobre el otro (se cruzan «clic» mm). Fuera de ahí, aire.
const RAN = 0.35, XD = [2.0, 4.2], fondoRan = ST / 2 - RAN, puntaLeng = fondoRan + 0.1;
const altoDiente = clic => clic ? HY - puntaLeng : 0;          // lo que sale el diente de la lengüeta (de su cara, y = HY, hasta puntaLeng)
function dienteLengueta(clic) { const d = altoDiente(clic); if (!d) return null; return diente(d + 0.01, 0).mirror([0, 1, 0]).translate([XD[0], HY + 0.01, -TP / 2]); } // (sale hacia −y, dentro del agujero)
// el VÁSTAGO (en reposo): núcleo ST × ST desde abajo (z = −G) hasta debajo del capuchón (z = TRAV), pivote arriba, pie abajo con las dos patas
// que suben y se enganchan bajo la placa (z = −TP), el diente del clic en su cara +y y el hueco del muelle por abajo
export function vastago(R) { const z0 = -G, d = R.clic ? puntaLeng + R.clic - fondoRan : 0; // (el diente del vástago: desde el fondo de la ranura)
  let m = M().cube([ST, ST, TRAV - z0]).translate([-ST / 2, -ST / 2, z0]).add(M().cube([PEG, PEG, CAP - 0.6]).translate([-PEG / 2, -PEG / 2, TRAV]));
  m = m.add(M().cube([2 * (ST / 2 + GL + LEG), LEGW, 2]).translate([-(ST / 2 + GL + LEG), -LEGW / 2, z0]));           // el pie
  [-1, 1].forEach(sg => { const x0 = sg > 0 ? ST / 2 + GL : -(ST / 2 + GL + LEG), zt = -TP - 0.05;
    m = m.add(M().cube([LEG, LEGW, zt - z0]).translate([x0, -LEGW / 2, z0]));                                          // la pata
    const xa = sg > 0 ? x0 + LEG : x0, gancho = M().hull([M().cube([0.01, LEGW, 0.01]).translate([xa, -LEGW / 2, zt - 1.2]), M().cube([0.01, LEGW, 0.6]).translate([xa, -LEGW / 2, zt - 0.6]), M().cube([0.01, LEGW, 0.6]).translate([xa + sg * HOOK + (sg > 0 ? 0 : 0), -LEGW / 2, zt - 0.6])]);
    m = m.add(gancho); });
  if (R.clic) { m = m.subtract(M().cube([XD[1] - XD[0] + 0.3, RAN + 0.01, TRAV - z0 + 1]).translate([XD[0] - 0.15, fondoRan, z0 + 3])); m = m.add(diente(d, 0).translate([XD[0], fondoRan - 0.01, 0.5])); } // la ranura y su diente (en reposo, 0,5 por encima de la placa)
  m = m.subtract(cil(R.md + 0.5, 8, z0 - 0.01));                                                                        // el hueco del muelle
  return m; }
// el CAPUCHÓN (con su forma), en su sitio: de z = TRAV a TRAV + CAP, con el hueco del pivote (encaja / a presión)
export function capuchon(R, k) { const T = R.F.teclas[k], P = T.almohadilla ? almohadilla() : T.cap;
  return conBisel(poli(P), CAP, 1.0).translate([0, 0, TRAV]).subtract(M().cube([PEG + 2 * R.aj, PEG + 2 * R.aj, CAP - 0.4]).translate([-(PEG + 2 * R.aj) / 2, -(PEG + 2 * R.aj) / 2, TRAV - 0.01])); }
// coloca algo del sitio local de una tecla en la caja (giro del mecanismo + posición)
const enSitio = (m, T) => m.rotate([0, 0, T.r]).translate([T.c[0], T.c[1], 0]);
const enSitio2 = (cs2, T) => cs2.rotate(T.r).translate(T.c);

// ---------- la CAJA (tapa de arriba con las paredes) y la TAPA DE ABAJO (con los pivotes de los muelles) ----------
export function caja(R) { const S = contornoLleno(R.F), dentro = S.offset(-WALL, 'Round');
  let m = conBisel(S, H, 1.2).translate([0, 0, -H]).subtract(dentro.extrude(G + BP + 0.01).translate([0, 0, -H - 0.01]));
  // los agujeros de las teclas (con la lengüeta del clic) y su diente
  m = m.subtract(N.csUnion(R.F.teclas.map(T => enSitio2(corteTecla(), T))).extrude(TP + 0.02).translate([0, 0, -TP - 0.01]));
  const dl = R.F.teclas.map(T => dienteLengueta(R.clic)).filter(Boolean).map((d, i) => enSitio(d, R.F.teclas[i])); if (dl.length) m = m.add(N.union(dl));
  return m; }
export function tapaAbajo(R) { const dentro = contornoLleno(R.F).offset(-WALL - 0.05, 'Round'); // (a presión: 0,05 por lado, y una gota de pegamento)
  let m = conBisel(dentro, BP, 0.5).translate([0, 0, -H]);
  R.F.teclas.forEach(T => { const pv = cil(R.md - 0.6 - 0.4, 4, -H + BP - 0.01).add(A.cono(R.md - 1.0, R.md - 2.0, 0.8, -H + BP + 4 - 0.02)); m = m.add(pv.translate([T.c[0], T.c[1], 0])); }); // el pivote del muelle (Ø por dentro del muelle)
  return m; }

// ---------- montado (en reposo o apretando «baja» mm la tecla k) y las piezas para imprimir ----------
export function montado(p, baja = 0, k = -1) { const R = medidas(p), L = [{ k: 'caja', m: caja(R) }, { k: 'tapa', m: tapaAbajo(R) }];
  R.F.teclas.forEach((T, i) => { const dz = i === k || k === 'todas' ? -baja : 0; L.push({ k: 'vastago' + i, m: enSitio(vastago(R), T).translate([0, 0, dz]) }, { k: 'capuchon' + i, m: enSitio(capuchon(R, i), T).translate([0, 0, dz]) }); });
  return { R, L }; }
export function piezasClicker(p) { const R = medidas(p), L = [{ t: 'Caja (boca abajo: la cara de arriba en la cama)', m: N.aLaCama(caja(R).rotate([180, 0, 0])) }, { t: 'Tapa de abajo', m: N.aLaCama(tapaAbajo(R)) }];
  R.F.teclas.forEach((T, i) => { L.push({ t: 'Vástago ' + (i + 1), m: N.aLaCama(vastago(R)) }, { t: 'Capuchón ' + (i + 1), m: N.aLaCama(capuchon(R, i).rotate([180, 0, 0])) }); });
  return { R, L }; }
// 🧪 la PRUEBA: una tecla con su marco (y su tapa), y una regleta con huecos de 3 a 6,5 mm para ver qué Ø tiene TU muelle
export function pruebaClicker(p) { const R = medidas(p), F0 = { teclas: [{ c: [0, 0], r: 0, cap: circ(17) }], contorno: () => poli(rrP(28, 26, 6)) }, R1 = Object.assign({}, R, { F: F0 });
  const regla = N.union([conBisel(poli(rrP(84, 12, 3)), 6, 0.6)].map(x => x)).subtract(N.union([3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5].map((d, i) => cil(d + 0.3, 8, 1.5).translate([-36.75 + i * 10.5, 0, 0]))));
  return A.enFila([N.aLaCama(caja(R1).rotate([180, 0, 0])), N.aLaCama(tapaAbajo(R1)), N.aLaCama(vastago(R1)), N.aLaCama(capuchon(R1, 0).rotate([180, 0, 0])), regla], 5); }

export const DISENOS_CLICKER = {
  clickerMuelle: { cat: 'juegos', tambien: ['jovenes', 'ninos', 'regalos', 'cuqui'], nuevo: true, busca: 'clicker fidget antiestrés antiestres relajar click clic botón teclas muelle boli bolígrafo pata gato mando consola corazón teclado nube juguete ansiedad',
    e: '🔘', t: 'Clicker antiestrés con muelles de boli (pata de gato, mando, corazón…)', d: 'Teclas que hacen CLIC al bajar y al subir, con los muelles de un bolígrafo: pata de gato, mando, corazón, teclado mini o nube', uso: 'juego', color: '#f4a6c0',
    campos: [s('forma', 'Forma', 'pata', Object.entries(FORMAS).map(([k, F]) => [k, F.t])), s('clic', 'Clic', 'medio', [['suave', 'Suave'], ['medio', 'Medio'], ['fuerte', 'Fuerte'], ['sin', 'Sin clic (solo el «clac» de abajo)']]),
      n('muelleD', 'Ø de tu muelle de boli (por fuera)', 4, 3, 6.5, 0.1), n('muelleL', 'Largo de tu muelle (suelto)', 20, 10, 40, 1), s('ajuste', 'Capuchones en su vástago', 'encaja', [['encaja', 'Encajan (0,10: con una gota de pegamento)'], ['presion', 'A presión (0,05)']]),
      s('que', 'Qué imprimo', 'todo', [['todo', 'Todo (caja, tapa, vástagos y capuchones)'], ['prueba', '🧪 Prueba: una tecla y la regleta de muelles'], ['montado', '👀 Montado']])],
    gen: p => { if (p.que === 'prueba') return pruebaClicker(p); if (p.que === 'montado') return N.union(montado(p).L.map(x => x.m)); return A.enRejilla(piezasClicker(p).L.map(x => x.m), 200, 5); },
    nota: p => { const R = medidas(p), nT = R.F.teclas.length, en = Math.round(R.ml - 11), aP = Math.round(R.ml - 8.5);
      if (p.que === 'prueba') return '🧪 PRUEBA: una tecla con su marco y la REGLETA DE MUELLES (huecos de 3 a 6,5 mm). Mete tu muelle de boli en la regleta: el hueco más pequeño donde entra suelto es su Ø (ponlo arriba). Monta la tecla: si el clic es duro y no sube sola, pon «Suave»; si no se oye, «Fuerte».';
      return 'PARA QUÉ: un clicker para las manos (relaja): ' + nT + ' teclas que hacen CLIC al bajar y al subir y CLAC abajo. Cada tecla lleva UN muelle de boli (Ø ' + n2(R.md) + ' por fuera; mídelo con la regleta de la «🧪 Prueba»). '
        + 'El muelle de ' + Math.round(R.ml) + ' mm queda apretado ' + en + ' mm en reposo y ' + aP + ' mm abajo' + (R.ml > 26 ? ' (si es más largo de 26 mm, córtalo con unos alicates de corte: con 20 mm va perfecto)' : '') + '. '
        + 'IMPRESIÓN: todo en una cama, SIN soportes, PLA, 0,16 o 0,20 mm: la caja BOCA ABAJO (la cara de arriba sale lisa), los vástagos de pie y los capuchones boca abajo (de otro color, si quieres). '
        + 'MONTAJE: 1) cada vástago desde arriba por su agujero, apretando hasta que sus dos ganchos hagan clic bajo la tapa; 2) el capuchón en su vástago (una gota de pegamento si van «encajan»); 3) un muelle en cada pivote de la tapa de abajo; 4) la tapa de abajo a presión, con una gota de pegamento en el borde. Medidas: ' + Math.round(N.cajaCS(R.F.contorno()).w) + ' × ' + Math.round(N.cajaCS(R.F.contorno()).h) + ' × ' + n2(H + TRAV + CAP) + ' mm.'; } }
};
