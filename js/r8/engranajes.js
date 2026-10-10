// ================= v20 · ⚙️ CelebriR8 · ENGRANAJES DE PRECISIÓN =================
// «Que sean editables los parámetros de los engranajes y, si los valores no son compatibles, que salga una señal (que me
// cambie de módulo o de paso diametral); helicoidales también, todo tipo de engranaje de alta calidad y precisión, de
// barra (cremalleras) y coronas» (la dueña, 10-10-2026).
//
// Geometría de EVOLVENTE de verdad (la de los engranajes de fábrica), calculada con las fórmulas normalizadas:
//   · tamaño por MÓDULO (mm), PASO DIAMETRAL (DP, dientes por pulgada: m = 25,4 / DP) o DIÁMETRO PRIMITIVO (m = d / z);
//   · ÁNGULO DE PRESIÓN 14,5°, 20° (el más común) o 25°; DESPLAZAMIENTO DE PERFIL x (para evitar el socavado);
//   · JUEGO entre dientes (lo que se quita a cada diente para que no se atasque al imprimirlo);
//   · RECTOS, HELICOIDALES (ángulo de hélice y mano: a derechas = como un tornillo normal), EN ESPIGA (doble hélice),
//     CREMALLERAS (rectas o helicoidales) y CORONAS INTERIORES.
// Y las COMPROBACIONES: si dos engranajes no casan (módulo, ángulo, hélice), socavado, punta afilada, diente demasiado
// pequeño para tu boquilla, distancia entre ejes y relación de contacto. Las reglas «prácticas» se dicen como tales.
// Diseño propio: no copia ningún engranaje de marca.
import * as N from './nucleo.js';

export const RAD = Math.PI / 180;
const inv = a => Math.tan(a) - a; // función evolvente
const PULGADA = 25.4;

// ---------- 1 · los números de un engranaje (todo en mm y radianes) ----------
// p = { z, por: 'modulo'|'dp'|'diametro', m, dp, d, alfa (°), beta (° hélice, 0 = recto), mano: 'der'|'izq', x (despl.), juego (mm, total de este diente), b (ancho) }
export function moduloDe(p) {
  if (p.por === 'dp') return p.dp > 0 ? PULGADA / p.dp : NaN;
  if (p.por === 'diametro') return p.d > 0 && p.z > 0 ? p.d / p.z * Math.cos((p.beta || 0) * RAD) : NaN; // el diámetro primitivo es el transversal: mn = d·cosβ / z
  return p.m;
}
export function numeros(p) {
  const z = Math.round(p.z), mn = moduloDe(p), an = (p.alfa || 20) * RAD, be = (p.beta || 0) * RAD, x = p.x || 0;
  const mt = mn / Math.cos(be), at = Math.atan(Math.tan(an) / Math.cos(be));
  const d = mt * z, r = d / 2, rb = r * Math.cos(at), ha = mn * (1 + x), hf = mn * (1.25 - x), ra = r + ha, rf = r - hf;
  const jt = (p.juego || 0) / Math.cos(be); // el juego se mide en la normal; en el corte transversal es algo más
  const s = mt * Math.PI / 2 + 2 * x * mn * Math.tan(at) - jt; // espesor del diente en el primitivo (transversal)
  const psi = R => s / (2 * r) + inv(at) - inv(Math.acos(Math.min(1, rb / R))); // medio ángulo del diente a radio R (≥ rb)
  let raEf = ra, afilado = false; if (psi(ra) <= 0) { afilado = true; let a = Math.max(rb, rf), c = ra; for (let i = 0; i < 40; i++) { const mid = (a + c) / 2; if (psi(mid) > 0) a = mid; else c = mid; } raEf = a; }
  const sa = 2 * raEf * Math.max(0, psi(raEf)); // espesor en la punta
  const zMin = 2 / Math.pow(Math.sin(at), 2), xMin = (zMin - z) / zMin; // sin socavado con x ≥ xMin
  const torsion = p.b && be ? (p.b * Math.tan(be) / r) / RAD : 0; // grados que gira el diente de abajo a arriba
  return { z, mn, mt, an, at, be, x, d, r, rb, ra, rf, raEf, afilado, s, sa, psi, zMin, xMin, socavado: x < xMin - 1e-6, paso: Math.PI * mn, pasoBase: Math.PI * mt * Math.cos(at), torsion, dp: PULGADA / mn };
}

// ---------- 2 · el perfil (2D) de un engranaje exterior ----------
function perfilExterior(K, puntosFlanco) {
  const { z, rb, rf, raEf, psi } = K, o = [], nf = puntosFlanco || (z > 60 ? 10 : 14);
  const r0 = Math.max(rb, rf), radios = []; for (let i = 0; i <= nf; i++) { const t = i / nf; radios.push(r0 + (raEf - r0) * (1 - Math.cos(t * Math.PI / 2))); } // más puntos cerca de la base
  const psi0 = psi(r0), psiA = Math.max(0, psi(raEf)), nTip = 3, nRaiz = 5;
  for (let k = 0; k < z; k++) {
    const c = k / z * 2 * Math.PI, pt = (R, a) => o.push([R * Math.cos(a), R * Math.sin(a)]);
    if (rf < rb - 1e-6) pt(rf, c - psi0);
    radios.forEach(R => pt(R, c - psi(R)));
    for (let i = 1; i < nTip; i++) pt(raEf, c - psiA + 2 * psiA * i / nTip);
    radios.slice().reverse().forEach(R => pt(R, c + psi(R)));
    if (rf < rb - 1e-6) pt(rf, c + psi0);
    const a0 = c + psi0, a1 = c + 2 * Math.PI / z - psi0; for (let i = 1; i < nRaiz; i++) pt(rf, a0 + (a1 - a0) * i / nRaiz);
  }
  return o;
}
// redondeo del fondo del diente (como el de una fresa): se redondean las esquinas cóncavas con +r y −r
function conRaiz(cs, K) { const f = Math.min(0.25 * K.mn, 0.18 * K.paso); return f > 0.03 ? cs.offset(f, 'Round', 2, 12).offset(-f, 'Round', 2, 12) : cs; }
export function perfilEngranaje2D(p) { const K = numeros(p); return { K, cs: conRaiz(N.cs([N.ccw(perfilExterior(K))], 'Positive'), K) }; }

// ---------- 3 · los sólidos ----------
// extrusión con hélice (o en espiga): la torsión sale del ángulo de hélice y del ancho
function extruye(cs, K, b, tipo, mano) {
  const s = mano === 'izq' ? -1 : 1, tw = K.torsion * s;
  if (!K.be || Math.abs(tw) < 0.01) return cs.extrude(b);
  const div = t => Math.max(4, Math.ceil(Math.abs(t) / 1.5));
  if (tipo === 'espiga') { const h1 = cs.extrude(b / 2, div(tw / 2), tw / 2), h2 = cs.rotate(tw / 2).extrude(b / 2, div(tw / 2), -tw / 2).translate([0, 0, b / 2]); return h1.add(h2); }
  return cs.extrude(b, div(tw), tw);
}
const agujero = (eje, forma, plano, alto) => { // eje redondo, en D o hexagonal (para meterlo en un eje existente)
  if (!(eje > 0)) return null; const C = N.CSX();
  let a = C.circle(eje / 2, Math.max(32, Math.ceil(eje * 4 / 4) * 4));
  if (forma === 'd' && plano > 0 && plano < eje) a = a.subtract(C.square([eje, eje]).translate([plano - eje / 2, -eje / 2]));
  if (forma === 'hex') a = N.cs([N.poligono2(6, eje / Math.cos(Math.PI / 6), 0)], 'Positive'); // «eje» = entre caras
  return a.extrude(alto + 2).translate([0, 0, -1]);
};
// p además: tipo ('recto'|'helicoidal'|'espiga'), eje, ejeForma, plano, holgura (por lado), buje, bujeD, bujeH
export function engranaje(p) {
  const { K, cs } = perfilEngranaje2D(p), b = p.b;
  let m = extruye(cs, Object.assign({}, K, { torsion: numeros(Object.assign({}, p, { b })).torsion }), b, p.tipo, p.mano);
  if (p.buje && p.bujeH > 0) m = m.add(N.forma3d('cilindro', { d: Math.min(p.bujeD || p.eje * 2 + 6, 2 * K.rf - 0.4), h: p.bujeH }).translate([0, 0, b - 0.01]));
  const a = agujero((p.eje || 0) + 2 * (p.holgura || 0), p.ejeForma, (p.plano || 0) + (p.holgura || 0), b + (p.buje ? p.bujeH : 0)); if (a) m = m.subtract(a);
  return { m, K };
}
// CREMALLERA: dientes rectos a lo largo de X (paso π·m), flancos con el ángulo de presión; helicoidal = dientes inclinados
// p = { mn/por…, alfa, beta, mano, n (dientes), b (ancho), fondo (grosor bajo el fondo del diente), juego }
export function cremallera(p) {
  const mn = moduloDe(p), an = (p.alfa || 20) * RAD, be = (p.beta || 0) * RAD, mt = mn / Math.cos(be), at = Math.atan(Math.tan(an) / Math.cos(be));
  const paso = Math.PI * mt, ha = mn, hf = 1.25 * mn, s = paso / 2 - (p.juego || 0) / Math.cos(be), n = Math.max(1, Math.round(p.n)), L = n * paso, fondo = Math.max(1, p.fondo || 3 * mn);
  const w = y => s / 2 - y * Math.tan(at); // medio ancho del diente a la altura y (y = 0 en la línea primitiva)
  const x0 = -L / 2, x1 = L / 2, wr = Math.max(0, w(-hf)), wa = Math.max(0.02, w(ha));
  // contorno en sentido antihorario: el fondo de izquierda a derecha, sube por la derecha y vuelve por los dientes
  const o = [[x0, -hf - fondo], [x1, -hf - fondo], [x1, -hf]];
  for (let i = n - 1; i >= 0; i--) { const c = (i - (n - 1) / 2) * paso; o.push([c + wr, -hf], [c + wa, ha], [c - wa, ha], [c - wr, -hf]); }
  o.push([x0, -hf]);
  let cs = N.cs([N.ccw(o)], 'Positive'); const f = Math.min(0.25 * mn, 0.18 * Math.PI * mn); if (f > 0.03) cs = cs.offset(f, 'Round', 2, 12).offset(-f, 'Round', 2, 12);
  // el perfil está en XY (dientes hacia +Y); se extruye el ancho en Z y, si es helicoidal, se inclinan los dientes
  let m = cs.extrude(p.b);
  if (be) { const t = Math.tan(be) * (p.mano === 'izq' ? -1 : 1); m = m.warp(v => { v[0] += v[2] * t; }); } // inclinar es lineal: no hace falta subdividir
  return { m, K: { mn, mt, at, paso, ha, hf, s, L, n, be }, alto: ha + hf + fondo };
}
// CORONA INTERIOR: un aro con los dientes por dentro. El hueco entre sus dientes tiene la forma de un diente exterior.
// p = { z, módulo…, alfa, beta, mano, x, b, aro (grosor del aro por fuera de la raíz), juego, tipo }
export function corona(p) {
  const mn = moduloDe(p), K0 = numeros(Object.assign({}, p, { x: -(p.x || 0), juego: -(p.juego || 0) })); // el «cortador»: diente exterior un poco MÁS GRUESO (el juego agranda el hueco)
  // el cortador llega hasta la raíz de la corona (r + 1,25 m) y su fondo es la punta de la corona (r − m)
  const Kc = Object.assign({}, K0, { ra: K0.r + 1.25 * mn, raEf: K0.r + 1.25 * mn, rf: K0.r - mn }); let raEf = Kc.ra; if (Kc.psi(raEf) <= 0) { let a = Kc.rb, c = raEf; for (let i = 0; i < 40; i++) { const mid = (a + c) / 2; if (Kc.psi(mid) > 0) a = mid; else c = mid; } raEf = a; } Kc.raEf = raEf;
  const cortador = N.cs([N.ccw(perfilExterior(Kc))], 'Positive');
  const rRaiz = K0.r + 1.25 * mn, Rext = rRaiz + Math.max(1.6, p.aro || 3 * mn), C = N.CSX();
  let cs = C.circle(Rext, Math.max(64, Math.round(Rext * 2) * 4)).subtract(cortador);
  const f = Math.min(0.25 * mn, 0.18 * Math.PI * mn); if (f > 0.03) cs = cs.offset(f, 'Round', 2, 12).offset(-f, 'Round', 2, 12);
  const K = Object.assign({}, numeros(p), { rPunta: K0.r - mn, rRaiz, Rext });
  return { m: extruye(cs, Object.assign({}, K, { torsion: numeros(Object.assign({}, p)).torsion }), p.b, p.tipo, p.mano), K };
}

// ---------- 4 · ¿CASAN? Comprobaciones de una pareja y de una pieza sola ----------
// tipo de pareja: 'exterior' (dos engranajes), 'interior' (piñón dentro de corona), 'cremallera'
// Devuelve { avisos: [{ n: 'error'|'aviso'|'ok', t }], a (distancia entre ejes), eps (relación de contacto), i (relación) }
export function casan(A, B, tipo = 'exterior') {
  const L = [], ka = numeros(A), kb = tipo === 'cremallera' ? null : numeros(B), mA = ka.mn, mB = moduloDe(B);
  const err = t => L.push({ n: 'error', t }), avi = t => L.push({ n: 'aviso', t }), ok = t => L.push({ n: 'ok', t });
  const sugiere = () => { const dp = PULGADA / mA; return ' Pon a los dos el mismo: módulo ' + fmt(mA, 3) + ' (≈ DP ' + fmt(dp, 2) + ').'; };
  if (!(Math.abs(mA - mB) < 1e-3)) err('NO ENGRANAN: el tamaño del diente es distinto (' + desc(A) + ' frente a ' + desc(B) + ').' + sugiere());
  else ok('Mismo tamaño de diente: módulo ' + fmt(mA, 3) + ' (DP ' + fmt(PULGADA / mA, 2) + ').');
  if (Math.abs((A.alfa || 20) - (B.alfa || 20)) > 1e-6) err('NO ENGRANAN BIEN: ángulos de presión distintos (' + (A.alfa || 20) + '° y ' + (B.alfa || 20) + '°). Tienen que ser iguales.');
  const bA = A.beta || 0, bB = B.beta || 0;
  if (Math.abs(bA - bB) > 1e-6) err('Ángulos de hélice distintos (' + fmt(bA, 1) + '° y ' + fmt(bB, 1) + '°): tienen que ser iguales.');
  else if (bA > 0) {
    const igualMano = (A.mano || 'der') === (B.mano || 'der');
    if (tipo === 'exterior' && igualMano) err('Dos helicoidales por fuera deben tener la hélice en MANO CONTRARIA (uno a derechas y otro a izquierdas).');
    else if (tipo === 'interior' && !igualMano) err('Un piñón helicoidal dentro de una corona lleva la MISMA mano que la corona.');
    else ok('Hélices compatibles (' + fmt(bA, 1) + '°, ' + (tipo === 'exterior' ? 'manos contrarias' : 'misma mano') + ').');
    if (A.tipo === 'espiga' || B.tipo === 'espiga') { if (A.tipo !== B.tipo) err('Un engranaje en espiga solo casa con otro en espiga.'); }
  }
  let a = null, eps = null, i = null;
  if (tipo === 'cremallera') {
    a = ka.r + mA * (A.x || 0); // del centro del piñón a la línea primitiva de la cremallera
    const lineaAcc = (Math.sqrt(ka.ra ** 2 - ka.rb ** 2) - ka.r * Math.sin(ka.at)) + mA / Math.sin(ka.at);
    eps = lineaAcc / ka.pasoBase; i = null;
  } else {
    const xs = tipo === 'interior' ? (B.x || 0) - (A.x || 0) : (A.x || 0) + (B.x || 0), zs = tipo === 'interior' ? kb.z - ka.z : ka.z + kb.z;
    // ángulo de presión de funcionamiento (con desplazamientos) y distancia entre ejes
    const invw = 2 * Math.tan(ka.an) * xs / zs + inv(ka.at); let aw = ka.at; for (let k = 0; k < 30; k++) aw = aw - (inv(aw) - invw) / (Math.tan(aw) ** 2);
    a = (tipo === 'interior' ? (kb.r - ka.r) : (ka.r + kb.r)) * Math.cos(ka.at) / Math.cos(aw);
    if (tipo === 'interior') { const rPunta = kb.r - mB * (1 - (B.x || 0)); eps = (Math.sqrt(ka.ra ** 2 - ka.rb ** 2) - Math.sqrt(Math.max(0, rPunta ** 2 - kb.rb ** 2)) + a * Math.sin(aw)) / ka.pasoBase; if (kb.z - ka.z < 12) err('La corona tiene ' + kb.z + ' dientes y el piñón ' + ka.z + ': con menos de 12 de diferencia los dientes chocan por la punta (regla práctica para 20°). Pon una corona más grande o un piñón más pequeño.'); }
    else eps = (Math.sqrt(ka.ra ** 2 - ka.rb ** 2) + Math.sqrt(kb.ra ** 2 - kb.rb ** 2) - a * Math.sin(aw)) / ka.pasoBase;
    i = kb.z / ka.z;
  }
  if (eps != null && isFinite(eps)) { if (eps < 1.1) err('Relación de contacto ' + fmt(eps, 2) + ': en algún momento no habrá ningún diente apoyando (tiene que ser más de 1,2). Usa más dientes o un ángulo de presión menor.'); else if (eps < 1.2) avi('Relación de contacto justa (' + fmt(eps, 2) + '): funcionará con golpecitos. Mejor por encima de 1,2.'); else ok('Relación de contacto ' + fmt(eps, 2) + ' (más de 1,2: siempre hay dientes apoyando).'); }
  return { avisos: L, a, eps, i };
}
// comprobaciones de UNA pieza (lo que se puede saber sin la otra)
export function revisaPieza(p, o = {}) {
  const L = [], K = numeros(p), boq = o.boquilla || 0.4;
  if (!(K.mn > 0) || !isFinite(K.mn)) { L.push({ n: 'error', t: 'Falta el tamaño del diente (módulo, paso diametral o diámetro primitivo).' }); return L; }
  if (K.z < 6) L.push({ n: 'error', t: 'Con menos de 6 dientes no sale un engranaje que funcione.' });
  if (K.socavado) L.push({ n: 'aviso', t: 'SOCAVADO: con ' + K.z + ' dientes a ' + (p.alfa || 20) + '°, la fresa se comería el pie del diente (mínimo ' + Math.ceil(K.zMin) + ' dientes, o desplazamiento de perfil x ≥ ' + fmt(K.xMin, 2) + '). En impresión sale el diente igual, pero más débil en la base.' });
  if (K.afilado) L.push({ n: 'aviso', t: 'Punta afilada: el diente se queda en punta antes de llegar a su altura (se ha recortado). Baja el desplazamiento de perfil o el juego.' });
  else if (K.sa < 0.25 * K.mn) L.push({ n: 'aviso', t: 'Punta muy fina (' + fmt(K.sa, 2) + ' mm): menos de 0,25 × módulo.' });
  if (K.sa < 2 * boq && !K.afilado) L.push({ n: 'aviso', t: 'La punta del diente mide ' + fmt(K.sa, 2) + ' mm: menos de 2 líneas de tu boquilla de ' + fmt(boq, 1) + ' mm. Se imprimirá redondeada; con módulo ' + fmt(Math.max(1, K.mn * 1.5), 1) + ' o más irá mejor.' });
  if (K.mn < 0.8) L.push({ n: 'aviso', t: 'Módulo ' + fmt(K.mn, 2) + ': diente muy pequeño para una boquilla de ' + fmt(boq, 1) + ' mm (mejor 1 o más; con 0,8 hace falta capa de 0,12 y boquilla de 0,2 para que salga fiel).' });
  if (p.eje > 0) { const pared = K.rf - (p.eje / 2 + (p.holgura || 0)) - (p.ejeForma === 'hex' ? p.eje * 0.08 : 0); if (pared < 0.8) L.push({ n: 'error', t: 'El agujero del eje (' + fmt(p.eje, 2) + ' mm) es demasiado grande: entre el agujero y el fondo de los dientes quedan ' + fmt(Math.max(0, pared), 2) + ' mm (mínimo 0,8 para imprimirlo; mejor 2 o más).' }); else if (pared < 2) L.push({ n: 'aviso', t: 'Entre el agujero y el fondo de los dientes quedan ' + fmt(pared, 1) + ' mm: es fino; con carga puede partirse.' }); }
  if ((p.beta || 0) > 0 && (p.beta || 0) > 45) L.push({ n: 'aviso', t: 'Hélice de ' + p.beta + '°: muy inclinada (lo normal es de 10° a 30°). Empuja mucho hacia los lados.' });
  if (p.b && K.mn && p.b < 3 * K.mn) L.push({ n: 'aviso', t: 'Ancho de ' + fmt(p.b, 1) + ' mm: menos de 3 × módulo; los dientes cargan poco ancho.' });
  if (!L.length) L.push({ n: 'ok', t: 'Sin problemas en la geometría de esta pieza.' });
  return L;
}
export const fmt = (x, d = 2) => x == null || !isFinite(x) ? '—' : Number(x).toLocaleString('es-ES', { maximumFractionDigits: d });
const desc = p => p.por === 'dp' ? 'DP ' + fmt(p.dp, 2) + ' = módulo ' + fmt(moduloDe(p), 3) : p.por === 'diametro' ? 'Ø primitivo ' + fmt(p.d, 2) + ' con ' + p.z + ' dientes = módulo ' + fmt(moduloDe(p), 3) : 'módulo ' + fmt(p.m, 3);
// los valores normalizados de módulo (ISO 54, serie 1) y de paso diametral (los más usados)
export const MODULOS = [0.5, 0.6, 0.8, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
export const DPS = [48, 32, 24, 20, 16, 12, 10, 8, 6, 5, 4];

// ---------- 5 · PIÑONES CÓNICOS (ejes a 90°) por el método de TREDGOLD ----------
// El diente se define sobre el CONO COMPLEMENTARIO del talón (perpendicular al cono primitivo), como el de un engranaje recto
// VIRTUAL de zv = z / cos δ dientes, y desde ahí se lleva en línea recta hasta el VÉRTICE: todos los flancos pasan por el
// punto donde se cruzan los dos ejes, como en un cónico de verdad. (En una corona casi plana, δ ≈ 70°, la altura del diente
// va casi a lo largo del eje: dibujarlo en un plano perpendicular al eje, como en la primera versión, chocaba.)
// δ = ángulo del cono primitivo (tan δ = z / zPareja) · Rc = distancia del vértice al talón · b = ancho del diente.
// Sistema local: vértice en el origen, eje +Z; el talón queda en z ≈ H = Rc·cos δ y la punta del diente (la «punta» del
// cono, hacia el vértice) en z ≈ H·(Rc − b)/Rc. Devuelve el anillo de dientes (con su llanta) y las cuentas; el cuerpo
// (buje, disco) lo pone quien lo usa con las medidas de K.
export function conico(p) {
  const z = Math.round(p.z), zq = Math.round(p.zPareja), m = p.m, al = (p.alfa || 20) * RAD, jg = p.juego || 0;
  const delta = Math.atan(z / zq), cd = Math.cos(delta), sd = Math.sin(delta), r = m * z / 2, Rc = r / sd, H = Rc * cd;
  const b = Math.min(p.b || Rc / 3, Rc * 0.36), k = (Rc - b) / Rc;
  const rv = r / cd, rbv = rv * Math.cos(al), sp = m * Math.PI / 2 - jg, ha = m, hf = 1.25 * m, llanta = Math.max(1, 0.8 * m);
  const psiV = Rv => sp / (2 * rv) + inv(al) - inv(Math.acos(Math.min(1, rbv / Rv)));
  // perfil «desarrollado»: radio = r + h (h = altura sobre el primitivo, medida sobre el cono complementario), ángulo real θ
  const psi = R => psiV(rv + (R - r)) * rv / r, rb = r + (rbv - rv), rf = r - hf; let ra = r + ha;
  if (psi(ra) <= 0) { let a = Math.max(rb, rf), c = ra; for (let i = 0; i < 40; i++) { const mid = (a + c) / 2; if (psi(mid) > 0) a = mid; else c = mid; } ra = a; }
  const K = { z, mn: m, rb, rf, raEf: ra, psi, paso: Math.PI * m };
  const rHueco = rf - llanta;
  let cs = conRaiz(N.cs([N.ccw(perfilExterior(K, 12))], 'Positive'), K).subtract(N.CSX().circle(rHueco, Math.max(64, z * 4)));
  // cada punto (R, θ, t) → en el talón: Q = Rc·(cono) + h·(complementario); y hacia el vértice: s·Q (s de 1 a k)
  const banda = cs.extrude(1, 1).warp(v => { const R = Math.hypot(v[0], v[1]), th = Math.atan2(v[1], v[0]), h = R - r, s = k + v[2] * (1 - k), rq = Rc * sd + h * cd, zq = Rc * cd - h * sd; v[0] = s * rq * Math.cos(th); v[1] = s * rq * Math.sin(th); v[2] = s * zq; });
  const g = banda.volume() < 0 ? banda.mirror([0, 0, 1]).mirror([0, 0, 1]) : banda;
  // medidas del cuerpo, en el talón y en la punta (radio y altura del borde interior de la llanta)
  const hIn = rHueco - r, rIn = Rc * sd + hIn * cd, zIn = Rc * cd - hIn * sd, hRaiz = -hf, rRaiz = Rc * sd + hRaiz * cd, zRaiz = Rc * cd - hRaiz * sd;
  const rPunta = Rc * sd + (ra - r) * cd, zPunta = Rc * cd - (ra - r) * sd;
  return { m: g, K: { z, zPareja: zq, delta, deltaG: delta / RAD, r, Rc, H, b, k, ra, rf, rIn, zIn, rRaiz, zRaiz, rPunta, zPunta, dExt: 2 * rPunta, bw: b * cd } };
}
