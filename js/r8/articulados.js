// ================= 17-10-2026 · 🐉 FIGURAS ARTICULADAS («flexi») que se imprimen YA MONTADAS =================
// Ella: «más cosas para vender en Cults, hay poca variedad, más objetos». Las figuras articuladas son de lo que más se vende en Cults
// (dragones, pulpos, peces, lagartijas, arañas en Halloween). Diseños PROPIOS, de una sola impresión y SIN soportes.
// LA UNIÓN (nueva, no es la de la serpiente): un pasador en forma de RELOJ DE ARENA (ancho abajo y arriba, estrecho en medio) dentro de
// un anillo con el hueco al revés. Todo empieza en la cama; las caras inclinadas van a 30° de la vertical (se imprimen sin soportes);
// 0,5 mm de aire de lado (0,43 en perpendicular a la cara: lo de «impreso ya montado») y 0,25 más en la primera capa (pie de elefante).
// No se sale ni tirando (el anillo abraza más de media vuelta en lo ancho del pasador) ni hacia arriba o abajo (lo estrecho del medio).
// El cuello que une el pasador con su pieza pasa por una abertura en abanico: cada unión gira ±δ (20° de serie) sin tocar nada.
// Entre pieza y pieza se deja una «V» calculada con el giro de esa unión (y lo que ya está doblada en reposo). Todo se COMPRUEBA en el
// ordenador girando cada unión (con todo lo que cuelga de ella) a un lado y a otro: nada se cruza.
import * as N from './nucleo.js';

const M = () => N.MF(), CS = () => N.CSX();
const RAD = Math.PI / 180;
const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');

// ---------- la unión de doble cono ----------
export const UNION = { g: 0.5, pared: 1.6, cintura: 1.5, pend: 30, cuello: 2.0, delta: 20 };
export function medidas(h) {
  const tg = Math.tan(UNION.pend * RAD), rw = UNION.cintura, rb = rw + h / 2 * tg;
  return { h, tg, rw, rb, g: UNION.g, ro: rb + UNION.g + UNION.pared, wn: UNION.cuello };
}
const rev = (pts, sg = 48) => CS().ofPolygons([N.ccw(pts)]).revolve(sg);
const pasador = U => rev([[0, 0], [U.rb, 0], [U.rw, U.h / 2], [U.rb, U.h], [0, U.h]], 40);
const hueco = U => { const { h, rb, rw, g, tg } = U; return rev([[0, -1], [rb + g + 0.25, -1], [rb + g + 0.25, 0.3], [rb - 0.3 * tg + g, 0.3], [rw + g, h / 2], [rb + g, h], [rb + g, h + 1], [0, h + 1]], 40); };

// ---------- dibujo en el plano ----------
const segR = r => Math.max(28, Math.min(96, Math.round(r * 6 + 24)));
export const C2 = (r, x = 0, y = 0) => CS().circle(Math.max(0.05, r), segR(r)).translate([x, y]);
export const E2 = (a, b, x = 0, y = 0, rot = 0) => CS().circle(1, 56).scale([Math.max(0.05, a), Math.max(0.05, b)]).rotate(rot).translate([x, y]);
export const P2 = pts => N.cs([N.ccw(pts)], 'Positive');
export const H2 = L => CS().hull(L.filter(Boolean));
export const U2 = L => N.csUnion(L.filter(x => x && !x.isEmpty()));
export const cap2 = (x1, y1, r1, x2, y2, r2) => H2([C2(r1, x1, y1), C2(r2, x2, y2)]);
// una tira de cápsulas: [[x, y, r], …] (para patas, cuernos, tentáculos…)
export const tira2 = pts => U2(pts.slice(1).map((q, i) => cap2(pts[i][0], pts[i][1], pts[i][2], q[0], q[1], q[2])));
// abanico: vértice en P (adelantado «off» por su eje), eje «ang» y media apertura «alfa» (grados), radio R
function abanico(P, ang, alfa, R, off = 0) {
  const a0 = ang * RAD, ax = P[0] + off * Math.cos(a0), ay = P[1] + off * Math.sin(a0), pts = [[ax, ay]], k = 28;
  for (let i = 0; i <= k; i++) { const t = (ang - alfa + 2 * alfa * i / k) * RAD; pts.push([ax + R * Math.cos(t), ay + R * Math.sin(t)]); }
  return P2(pts);
}
const normal = a => { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; };
// un dibujo en las coordenadas de un segmento (u hacia la cola, v a su izquierda) → al sitio (giro «ang» y origen «O»)
export const alSitio = (cs, O, ang) => cs.rotate(ang).translate(O);

// el cuerpo de una pieza: recto con el canto de arriba redondeado en dos escalones
function cuerpo(cs, h) {
  if (!cs || cs.isEmpty()) return null;
  const L = [cs.extrude(h - 1)], c1 = cs.offset(-0.45, 'Round', 2, 16), c2 = cs.offset(-1, 'Round', 2, 16);
  if (!c1.isEmpty()) L.push(c1.extrude(0.51).translate([0, 0, h - 1.01]));
  if (!c2.isEmpty()) L.push(c2.extrude(0.51).translate([0, 0, h - 0.51]));
  return N.union(L);
}
// abombado (cabezas, mantos): base recta de «base» mm y encima redondeado hasta «alto» (en el centro), en escalones de 0,3 mm
// (como las capas de la impresora: exacto y sin el motor de esculpir, que con muchas piezas se queda sin memoria)
export function abombado(cs, base, alto) {
  const A = Math.max(0.6, alto - base); let lo = 0, hi = 120;
  for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (cs.offset(-mid, 'Round', 2, 12).isEmpty()) hi = mid; else lo = mid; }
  const L = [cs.extrude(base + 0.01)], nn = Math.max(4, Math.ceil(A / 0.3));
  for (let k = 1; k <= nn; k++) { const f = (k - 0.5) / nn, t = 1 - Math.sqrt(Math.max(0, 1 - f * f)), c = cs.offset(-t * lo, 'Round', 2, 16); if (c.isEmpty()) break; L.push(c.extrude(A / nn + 0.01).translate([0, 0, base + A * (k - 1) / nn])); }
  return N.union(L);
}

// ---------- LA FIGURA ----------
// segs: [{ s: dibujo (en su sitio), alto?, abombado?: { base, alto }, deco?: m => m }]
// uniones: [{ p: [x, y], a: padre, b: hijo, ap: hacia el padre (°), ac: hacia el hijo (°), delta?, rk? }]
export function figura(segs, uniones, o = {}) {
  const h = o.alto || 8, U = medidas(h);
  const S = segs.map(sg => sg.s);
  uniones.forEach(u => {
    u.delta = u.delta || UNION.delta; u.rk = u.rk || U.ro + 22; u.rr = Math.max(U.ro + 1.2, u.rr || 0);
    const beta = Math.abs(normal(u.ac - u.ap - 180)); u.alfa = Math.max(25, (180 - beta - u.delta - 6) / 2);
    const disco = C2(u.rk, u.p[0], u.p[1]), GAP = 0.6;
    // el PADRE: hueco redondo (de radio rr + 0,6) donde gira la «nariz» del hijo, y fuera de su abanico cerca de la unión
    u._padre = U2([C2(u.rr + GAP, u.p[0], u.p[1]), disco.subtract(abanico(u.p, u.ap, u.alfa, u.rk + 6, 0.5))]);
    // el HIJO: su nariz redonda (radio rr) entra en ese hueco; ranura para el cuello del padre; el anillo del pasador va dentro
    u._fan = abanico(u.p, u.ap, u.delta, u.rr + GAP + 3, 0).offset(U.wn / 2 + U.g, 'Round', 2, 16);
    u._hijo = U2([C2(U.ro - 0.8, u.p[0], u.p[1]), disco.subtract(abanico(u.p, u.ac, u.alfa, u.rk + 6, 0.5)).subtract(C2(u.rr, u.p[0], u.p[1])), u._fan]);
  });
  uniones.forEach(u => { S[u.a] = S[u.a].subtract(u._padre); S[u.b] = S[u.b].subtract(u._hijo); });
  for (let i = 0; i < S.length; i++) S[i] = S[i].offset(-0.5, 'Round', 2, 12).offset(0.5, 'Round', 2, 12); // sin picos
  const P = S.map((cs, i) => { const sg = segs[i]; if (sg.abombado) return abombado(cs, sg.abombado.base, sg.abombado.alto); return cuerpo(cs, sg.alto || h); });
  uniones.forEach(u => {
    const [x, y] = u.p, pin = pasador(U).translate([x, y, 0]);
    const Lc = u.rr + 0.6 + 1.8, cuello = P2([[0, -U.wn / 2], [Lc, -U.wn / 2], [Lc, U.wn / 2], [0, U.wn / 2]]).rotate(u.ap).translate([x, y]).extrude(h);
    const anillo = rev([[0, 0], [U.ro, 0], [U.ro, h], [0, h]], 48).subtract(hueco(U)).translate([x, y, 0]).subtract(u._fan.extrude(h + 2).translate([0, 0, -1]));
    P[u.a] = P[u.a].add(pin).add(cuello); P[u.b] = P[u.b].add(anillo);
  });
  segs.forEach((sg, i) => { if (sg.deco) P[i] = sg.deco(P[i], h, S[i]); }); // (los adornos, dentro de lo que le queda a cada pieza tras las uniones)
  return { piezas: P, uniones, U };
}
// lo que se imprime: todo junto, apoyado en la cama y centrado
export function junta(F) { return N.union(F.piezas); }

// ---------- comprobación (pruebas y nota): cada unión, girada a un lado y a otro con todo lo que cuelga de ella ----------
const vol = (a, b) => { try { const v = a.intersect(b).volume(); return v > 0 ? v : 0; } catch (e) { return 0; } };
export function comprueba(F, k = 0.9) {
  const { piezas: P, uniones: Us } = F, hijos = {}; Us.forEach(u => { (hijos[u.a] = hijos[u.a] || []).push(u.b); });
  const rama = i => [i].concat((hijos[i] || []).flatMap(rama));
  const R = { reposo: 0, giro: [], tira: [], sube: [] };
  P.forEach((m, i) => { const otros = N.union(P.filter((_, j) => j > i)); R.reposo = Math.max(R.reposo, vol(m, otros)); });
  Us.forEach((u, j) => {
    const r = rama(u.b), dentro = N.union(r.map(i => P[i])), fuera = N.union(P.filter((_, i) => !r.includes(i)));
    const gira = d => dentro.translate([-u.p[0], -u.p[1], 0]).rotate([0, 0, d]).translate([u.p[0], u.p[1], 0]);
    const g1 = vol(gira(u.delta * k), fuera), g2 = vol(gira(-u.delta * k), fuera); R.giro.push(Math.max(g1, g2));
    if (Math.max(g1, g2) > 0.01) { const d = g1 > g2 ? u.delta * k : -u.delta * k, quien = [];
      r.forEach(i => P.forEach((q, j) => { if (r.includes(j)) return; const v = vol(P[i].translate([-u.p[0], -u.p[1], 0]).rotate([0, 0, d]).translate([u.p[0], u.p[1], 0]), q); if (v > 0.01) quien.push(i + '→' + j + ':' + v.toFixed(2)); }));
      (R.choques = R.choques || []).push('unión ' + j + ' (' + d.toFixed(0) + '°): ' + quien.join(' ')); }
    const a = u.ap * RAD; R.tira.push(vol(P[u.a].translate([Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0]), P[u.b])); // tirando 1,2 mm: tiene que topar
    R.sube.push(vol(P[u.b].translate([0, 0, 1.2]), P[u.a]));
  });
  return R;
}

// ---------- la cadena (columna): de la cabeza a la cola ----------
// P0 = primera unión; ang0 = hacia dónde va la cola (°); L = largo de cada segmento; giros = cuánto se dobla en cada unión (en reposo)
export function cadena(P0, ang0, L, giros = []) {
  const J = [P0.slice()], A = []; let a = ang0, p = P0.slice();
  for (let i = 0; i < L.length; i++) { if (i) a += giros[i - 1] || 0; A.push(a); p = [p[0] + L[i] * Math.cos(a * RAD), p[1] + L[i] * Math.sin(a * RAD)]; J.push(p); }
  return { J, A };
}
// las uniones de una columna: la pieza «cab» (cabeza) tira de la primera; cada segmento, de la siguiente
function unionesColumna(C, cab, primero, o = {}) {
  const U = [], rkDe = i => (o.anchos ? Math.max(o.anchos[i] || 0, o.anchos[i + 1] || 0) / 2 + 4 : undefined), rrDe = i => (o.anchos ? Math.min((o.anchos[i + 1] || 0) / 2 * 0.96, (o.anchos[i] || 0) / 2 + 1, (o.ro || 6) + 7, o.largos && o.largos[i] ? o.largos[i] - (o.ro || 6) - 3 : 99) : undefined);
  U.push({ p: C.J[0], a: cab, b: primero, ap: (o.apCab != null ? o.apCab : C.A[0] + 180), ac: C.A[0], rk: o.rk0 || rkDe(0), rr: o.rr0 || rrDe(0) });
  for (let i = 1; i < C.A.length; i++) U.push({ p: C.J[i], a: primero + i - 1, b: primero + i, ap: C.A[i - 1] + 180, ac: C.A[i], rk: o.rk || rkDe(i), rr: o.rr || rrDe(i) });
  return U;
}
// un segmento de columna: cápsula que va estrechando (de «w0» a «w1» de ancho) entre su unión de delante y la de detrás
const tramo = (C, i, w0, w1, extra) => U2([alSitio(cap2(0, 0, w0 / 2, Math.hypot(C.J[i + 1][0] - C.J[i][0], C.J[i + 1][1] - C.J[i][1]), 0, w1 / 2), C.J[i], C.A[i])].concat(extra ? [alSitio(extra, C.J[i], C.A[i])] : []));

// ---------- detalles ----------
// ojo saltón: un botón de «r» con la pupila hundida que NACE de la pieza (se mide la altura de la pieza en ese punto: nunca flota)
export const ojo = (x, y, r, alto = 1.2) => ({ x, y, r, alto });
const alturaEn = (m, x, y) => { try { const t = m.intersect(M().cylinder(60, 0.35, 0.35, 12).translate([x, y, -5])); return t.isEmpty() ? 0 : N.caja(t).max[2]; } catch (e) { return 0; } };
function ponOjos(m, ojos) {
  ojos.forEach(o => { const z = alturaEn(m, o.x, o.y), zt = z + o.alto; m = m.add(M().cylinder(zt - Math.max(0, z - 3), o.r, o.r * 0.92, segR(o.r)).translate([o.x, o.y, Math.max(0, z - 3)])).subtract(M().cylinder(2, o.r * 0.42, o.r * 0.42, 24).translate([o.x, o.y, zt - 0.7])); });
  return m;
}
// grabar un dibujo en la cara de arriba (hondo «p» mm)
export const graba = (m, cs, h, p = 0.6) => (!cs || cs.isEmpty() ? m : m.subtract(cs.extrude(p + 2).translate([0, 0, h - p])));
// un relieve encima (de «z0» a «z1»)
export const relieve = (m, cs, z0, z1) => (!cs || cs.isEmpty() ? m : m.add(cs.extrude(z1 - z0).translate([0, 0, z0])));
// arcos de escamas (abiertos hacia la cola) dentro de un dibujo
function escamas(dentro, paso, ang) {
  if (!dentro || dentro.isEmpty()) return null; const b = N.cajaCS(dentro), L = [], r = paso * 0.55;
  for (let i = -2; i * paso < b.w + b.h + paso * 4; i++) for (let j = -2; j * paso * 0.8 < b.w + b.h + paso * 4; j++) {
    const x = b.min[0] - b.h + i * paso + (j % 2 ? paso / 2 : 0), y = b.min[1] - b.w + j * paso * 0.8;
    L.push(C2(r, 0, 0).subtract(C2(r - 0.8, 0, 0)).subtract(P2([[0, -r - 1], [r + 1, -r - 1], [r + 1, r + 1], [0, r + 1]])).rotate(ang).translate([x, y]));
  }
  const e = U2(L); return e.intersect(dentro);
}

// ======================= 🐟 PEZ (normal o esqueleto) =======================
function pez(p) {
  const h = p.alto, sc = p.largo / 170, U = medidas(h), esq = p.estilo === 'esqueleto';
  const Lb = 74 * sc, nB = Math.max(3, Math.min(7, Math.floor(Lb / (2 * U.ro + 3.2)))), Ls = Array(nB).fill(Lb / nB);
  const gir = Array.from({ length: nB }, (_, i) => [4, 6, 3, -5, -8, -6, -4][i] * (p.curva || 1));
  const C = cadena([105 * sc, 0], 180, Ls.concat([0.01]), gir);
  const segs = [], ojos = [];
  // cabeza (en sus coordenadas: u hacia la cola, la boca en u negativo)
  const cabL = esq ? U2([E2(24 * sc, 17 * sc, -22 * sc, 0), C2(9 * sc, -47 * sc, 0), cap2(-6 * sc, 0, 5.5, 4, 0, 5.5)])
    : U2([H2([E2(27 * sc, 19.5 * sc, -22 * sc, 0), C2(11.5 * sc, -48 * sc, 0)]), cap2(-6 * sc, 0, 7, 4, 0, 7), E2(10 * sc, 4 * sc, -12 * sc, 17 * sc, 30), E2(10 * sc, 4 * sc, -12 * sc, -17 * sc, -30)]).subtract(E2(4 * sc, 2.6 * sc, -60 * sc, 0)); // (con sus aletas pectorales)
  let cab = alSitio(cabL, C.J[0], C.A[0]);
  if (esq) cab = cab.subtract(alSitio(U2([E2(6 * sc, 5 * sc, -36 * sc, 9.5 * sc), E2(6 * sc, 5 * sc, -36 * sc, -9.5 * sc)]), C.J[0], C.A[0])); // las cuencas
  segs.push({ s: cab, abombado: esq ? null : { base: h - 1.5, alto: h + 3.5 } });
  const P0 = (u, v) => { const a = C.A[0] * RAD; return [C.J[0][0] + u * Math.cos(a) - v * Math.sin(a), C.J[0][1] + u * Math.sin(a) + v * Math.cos(a)]; };
  if (!esq) [9.5, -9.5].forEach(v => { const q = P0(-37 * sc, v * sc); ojos.push(ojo(q[0], q[1], 3.8 * sc, 1.4)); }); // (17-10: en el esqueleto, las cuencas vacías; el ojo quedaba flotando dentro)
  // cuerpo
  for (let i = 0; i < nB; i++) {
    const t0 = i / nB, t1 = (i + 1) / nB, w0 = (39 - 26 * t0) * sc, w1 = (39 - 26 * t1) * sc, Li = Ls[i];
    let ext = null;
    if (esq) { // vértebra + costillas que se curvan hacia la cola
      const larg = (w0 / 2 + 4) * (1 - 0.15 * t0), cost = [];
      [Li * 0.35, Li * 0.75].forEach(u => [1, -1].forEach(sg => cost.push(tira2([[u, sg * 3, 1.3], [u + larg * 0.25, sg * larg * 0.6, 1.2], [u + larg * 0.55, sg * larg * 0.95, 1.0]]))));
      ext = U2(cost.concat([cap2(0, 0, 3, Li, 0, 3)]));
    } // (17-10: las aletas pectorales van en la CABEZA, como en un pez de verdad: en el primer trozo, la junta de detrás las recortaba y se soltaban)
    const base = esq ? alSitio(ext, C.J[i], C.A[i]) : tramo(C, i, w0, w1, ext);
    segs.push({ s: base, esc: !esq });
  }
  // la cola
  const colaL = esq ? U2([cap2(0, 0, 3, 7 * sc, 0, 2.5), ...[-1, 1].flatMap(sg => [0.25, 0.55, 0.85].map(t => tira2([[5 * sc, sg * 1.5, 1.1], [16 * sc, sg * (6 + 12 * t) * sc, 0.9], [26 * sc, sg * (4 + 22 * t) * sc, 0.8]])))])
    : U2([cap2(0, 0, 4.5 * sc, 7 * sc, 0, 4 * sc), H2([C2(3.5 * sc, 6 * sc, 2 * sc), E2(15 * sc, 5.5 * sc, 23 * sc, 12 * sc, 38)]), H2([C2(3.5 * sc, 6 * sc, -2 * sc), E2(15 * sc, 5.5 * sc, 23 * sc, -12 * sc, -38)])]);
  segs.push({ s: alSitio(colaL, C.J[nB], C.A[nB]) });
  const W = [39 * sc].concat(Array.from({ length: nB }, (_, i) => (39 - 26 * i / nB) * sc + (esq ? 8 : 0))).concat([9 * sc]);
  const Us = unionesColumna(C, 0, 1, Object.assign({ anchos: W, ro: U.ro, largos: [0].concat(Ls) }, esq ? { rr: U.ro + 1.2, rr0: U.ro + 1.2 } : {}));
  segs[0].deco = m => ponOjos(m, ojos);
  if (!esq) for (let i = 1; i <= nB; i++) segs[i].deco = (m, hh, cs) => graba(m, escamas(cs.offset(-2.6, 'Round', 2, 12), 6.5 * sc, C.A[i - 1]), hh, 0.5);
  return figura(segs, Us, { alto: h });
}

// ======================= 🐙 PULPO =======================
function pulpo(p) {
  const h = p.alto, U = medidas(h), R = p.cabeza / 2, nT = 8, nS = Math.round(p.segmentos), segs = [], Us = [], ojos = [];
  const manto = U2([C2(R, 0, 0), E2(R * 0.92, R * 1.12, 0, R * 0.45)]);
  segs.push({ s: manto, abombado: { base: h - 1, alto: h + 7 } });
  ojos.push(ojo(-R * 0.36, -R * 0.08, R * 0.17, 1.4), ojo(R * 0.36, -R * 0.08, R * 0.17, 1.4));
  const a0 = 160, a1 = 380; // los tentáculos salen alrededor (de 160° a 20°, por abajo)
  for (let k = 0; k < nT; k++) {
    const th = a0 + (a1 - a0) * k / (nT - 1), sg = k % 2 ? 1 : -1, P0 = [(R - 4.5) * Math.cos(th * RAD), (R - 4.5) * Math.sin(th * RAD)];
    const Ls = Array.from({ length: nS }, (_, i) => Math.max(2 * U.ro + 2.6, (17 - 1.2 * i) * p.largo / 100));
    const C = cadena(P0, th, Ls.concat([0.01]), Array.from({ length: nS }, (_, i) => sg * (8 + 4 * i) * (p.rizo / 10)));
    const primero = segs.length;
    for (let i = 0; i < nS; i++) {
      const w0 = Math.max(6, 13 - 2.2 * i), w1 = Math.max(4.5, 13 - 2.2 * (i + 1)), Li = Ls[i], ult = i === nS - 1;
      let sh = ult ? U2([cap2(0, 0, w0 / 2, Li * 0.7, 0, w1 / 2), tira2([[Li * 0.7, 0, w1 / 2], [Li * 1.1, sg * -2.5, w1 * 0.36], [Li * 1.35, sg * -6.5, 1.4]])]) : cap2(0, 0, w0 / 2, Li, 0, w1 / 2);
      segs.push({ s: alSitio(sh, C.J[i], C.A[i]), ventosas: { C, i, Li, w0, ult } });
    }
    Us.push(...unionesColumna({ J: C.J, A: C.A }, 0, primero, { rk0: U.ro + 5, apCab: th + 180 }).slice(0, nS));
  }
  segs[0].deco = m => ponOjos(graba(m, P2([[-R * 0.22, -R * 0.52], [R * 0.22, -R * 0.52], [0, -R * 0.62]]).offset(0.6, 'Round', 2, 12), h + 7 - 2.4, 0.7), ojos);
  segs.slice(1).forEach(sg => { const V = sg.ventosas; sg.deco = (m, hh, cs) => { const L = []; for (let u = 4; u < V.Li - 2; u += 5) L.push(alSitio(C2(Math.max(1.1, V.w0 * 0.16), u, 0).subtract(C2(Math.max(0.5, V.w0 * 0.07), u, 0)), V.C.J[V.i], V.C.A[V.i])); return graba(m, U2(L).intersect(cs.offset(-1, 'Round', 2, 12)), hh, 0.5); }; });
  return figura(segs, Us, { alto: h });
}

// ======================= 🦎 LAGARTIJA (gecko) =======================
function lagartija(p) {
  const h = p.alto, U = medidas(h), sc = p.largo / 180, segs = [], ojos = [];
  const pitch = Math.max(2 * U.ro + 3, 16 * sc);
  const cuerpoL = [pitch, pitch * 1.25, pitch * 1.25, pitch];            // cuello, pecho (patas), tripa, cadera (patas)
  const colaN = Math.max(4, Math.round(70 * sc / (2 * U.ro + 2.6))), colaL = Array.from({ length: colaN }, (_, i) => Math.max(2 * U.ro + 2.6, 70 * sc / colaN * (1.08 - 0.12 * i / colaN)));
  const giros = [3, 2, -2, -4].concat(Array.from({ length: colaN }, (_, i) => (6 + 4 * i) * (p.curva || 1)));
  const C = cadena([0, 0], 180, cuerpoL.concat(colaL).concat([0.01]), giros);
  const cabL = U2([H2([E2(17 * sc, 14 * sc, -16 * sc, 0), C2(7.5 * sc, -33 * sc, 0)]), cap2(-6, 0, 7, 3, 0, 7)]);
  segs.push({ s: alSitio(cabL, C.J[0], C.A[0]), abombado: { base: h - 1.5, alto: h + 3 } });
  const L0 = (u, v) => { const a = C.A[0] * RAD; return [C.J[0][0] + u * Math.cos(a) - v * Math.sin(a), C.J[0][1] + u * Math.sin(a) + v * Math.cos(a)]; };
  [10, -10].forEach(v => { const q = L0(-20 * sc, v * sc); ojos.push(ojo(q[0], q[1], 4.2 * sc, 1.5)); });
  // una pata con sus 5 dedos redondos: sale del costado (v) hacia «ang» (en el segmento)
  const pata = (u, v, ang, Lp) => { const a = ang * RAD, b = [u, v], c1 = [u + Lp * 0.55 * Math.cos(a), v + Lp * 0.55 * Math.sin(a)], a2 = a + (v > 0 ? 1 : -1) * (u < 10 ? -0.75 : 0.75), c2 = [c1[0] + Lp * 0.45 * Math.cos(a2), c1[1] + Lp * 0.45 * Math.sin(a2)];
    const dedos = [-50, -25, 0, 25, 50].map(d => { const t = a2 + d * RAD; return tira2([[c2[0], c2[1], 2], [c2[0] + 6 * sc * Math.cos(t), c2[1] + 6 * sc * Math.sin(t), 1.3]]).add(C2(2.1, c2[0] + 6.8 * sc * Math.cos(t), c2[1] + 6.8 * sc * Math.sin(t))); });
    return U2([tira2([[b[0], b[1], 3.6], [c1[0], c1[1], 3], [c2[0], c2[1], 2.5]])].concat(dedos)); };
  const anchos = [16, 26, 27, 22], nCu = cuerpoL.length;
  for (let i = 0; i < nCu; i++) {
    const w0 = anchos[i] * sc, w1 = (anchos[i + 1] || 15) * sc, Li = cuerpoL[i];
    const ext = i === 1 ? U2([pata(Li * 0.45, w0 / 2 - 2, 120, 26 * sc), pata(Li * 0.45, -w0 / 2 + 2, -120, 26 * sc)]) : i === 3 ? U2([pata(Li * 0.55, w0 / 2 - 2, 60, 26 * sc), pata(Li * 0.55, -w0 / 2 + 2, -60, 26 * sc)]) : null;
    segs.push({ s: tramo(C, i, w0, w1, ext) });
  }
  for (let i = 0; i < colaN; i++) { const t0 = i / colaN, t1 = (i + 1) / colaN, w0 = (15 - 9 * t0) * sc + 1, w1 = (15 - 9 * t1) * sc + 1, k = nCu + i, ult = i === colaN - 1;
    segs.push({ s: ult ? alSitio(U2([cap2(0, 0, w0 / 2, colaL[i] * 0.6, 0, w1 / 2), tira2([[colaL[i] * 0.6, 0, w1 / 2], [colaL[i] * 1.2, 0, 1.4]])]), C.J[k], C.A[k]) : tramo(C, k, w0, w1) }); }
  const W = [28 * sc].concat(anchos.map(x => x * sc)).concat(Array.from({ length: colaN }, (_, i) => (15 - 9 * i / colaN) * sc + 1));
  const Us = unionesColumna({ J: C.J, A: C.A }, 0, 1, { anchos: W, ro: U.ro, largos: [0].concat(cuerpoL).concat(colaL) }).slice(0, segs.length - 1);
  segs[0].deco = m => ponOjos(m, ojos);
  // manchas en el lomo
  segs.slice(1).forEach((sg, j) => { sg.deco = (m, hh, cs) => { const b = N.cajaCS(cs), L = []; const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2; [[0, 0, 2.6], [b.w * 0.18, b.h * 0.16, 1.6], [-b.w * 0.16, -b.h * 0.14, 1.8]].forEach(([x, y, r], q) => { if (j % 2 === q % 2 || q === 0) L.push(C2(r * sc + 0.4, cx + x, cy + y)); }); return graba(m, U2(L).intersect(cs.offset(-3, 'Round', 2, 12)), hh, 0.5); }; });
  return figura(segs, Us, { alto: h });
}

// ======================= 🐉 DRAGÓN (con alas) =======================
function dragon(p) {
  const h = p.alto, U = medidas(h), sc = p.largo / 230, segs = [], ojos = [], pitch = Math.max(2 * U.ro + 2.8, 17 * sc);
  const colN = Math.max(5, Math.round(95 * sc / (2 * U.ro + 2.6)));
  const Ls = [pitch, pitch, 34 * sc, pitch * 1.05, 26 * sc].concat(Array.from({ length: colN }, (_, i) => Math.max(2 * U.ro + 2.6, 95 * sc / colN * (1.15 - 0.3 * i / colN))));
  const cur = p.curva || 1, gir = [-3, -2, 2, 3, 6].map(x => x * cur).concat(Array.from({ length: colN }, (_, i) => (9 + 3 * i) * cur));
  const C = cadena([0, 0], 180, Ls.concat([0.01]), gir);
  // la cabeza: hocico, cuernos hacia atrás y ojos
  const cabL = U2([H2([E2(19 * sc, 15 * sc, -17 * sc, 0), E2(10 * sc, 8.5 * sc, -38 * sc, 0)]), cap2(-6, 0, 6.5, 3, 0, 6.5),
    tira2([[-13 * sc, 11 * sc, 3.6], [-4 * sc, 17 * sc, 2.6], [4 * sc, 21 * sc, 1.3]]), tira2([[-13 * sc, -11 * sc, 3.6], [-4 * sc, -17 * sc, 2.6], [4 * sc, -21 * sc, 1.3]])]);
  segs.push({ s: alSitio(cabL, C.J[0], C.A[0]), abombado: { base: h - 1.5, alto: h + 3 } });
  const L0 = (u, v) => { const a = C.A[0] * RAD; return [C.J[0][0] + u * Math.cos(a) - v * Math.sin(a), C.J[0][1] + u * Math.sin(a) + v * Math.cos(a)]; };
  [8.5, -8.5].forEach(v => { const q = L0(-21 * sc, v * sc); ojos.push(ojo(q[0], q[1], 3.4 * sc, 1.3)); });
  const garras = (u, v, ang, Lp) => { const a = ang * RAD, sg = v > 0 ? 1 : -1, c1 = [u + Lp * 0.5 * Math.cos(a), v + Lp * 0.5 * Math.sin(a)], a2 = a + sg * 0.6, c2 = [c1[0] + Lp * 0.5 * Math.cos(a2), c1[1] + Lp * 0.5 * Math.sin(a2)];
    return U2([tira2([[u, v, 4], [c1[0], c1[1], 3.2], [c2[0], c2[1], 2.6]])].concat([-35, 0, 35].map(d => { const t = a2 + d * RAD; return tira2([[c2[0], c2[1], 1.8], [c2[0] + 6 * sc * Math.cos(t), c2[1] + 6 * sc * Math.sin(t), 0.7]]); }))); };
  // las alas (en el pecho): membrana más fina con sus huesos en relieve; empiezan por detrás de la unión del cuello
  // ala (en las coordenadas del pecho: u hacia la cola, v hacia su lado): hombro → muñeca → punta, y tres dedos que tensan la membrana
  const ala = sg => { const q = (u, v) => [u * sc, sg * v * sc];
    const hombro = q(13, 12), muneca = q(12, 44), punta = q(24, 78), dedos = [q(40, 66), q(44, 46), q(37, 27)], atras = q(27, 13);
    const borde = [hombro, muneca, punta].concat(dedos).concat([atras]);
    // el borde de atrás, en ondas (cada tramo entre dedos, hacia dentro)
    const tramos = [punta].concat(dedos).concat([atras]), muescas = [];
    for (let i = 0; i < tramos.length - 1; i++) { const A = tramos[i], B = tramos[i + 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 12 * sc) continue; const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, nx = (B[1] - A[1]) / L, ny = -(B[0] - A[0]) / L, sgn = -sg; muescas.push(C2(L * 0.42, mx + sgn * nx * L * 0.3, my + sgn * ny * L * 0.3)); }
    const memb = P2(borde).subtract(U2(muescas));
    const huesos = U2([tira2([[hombro[0], hombro[1], 2.8], [muneca[0], muneca[1], 2.2], [punta[0], punta[1], 1.2]])].concat(dedos.map(d => tira2([[muneca[0], muneca[1], 1.8], [d[0], d[1], 1.0]]))));
    return { memb: U2([memb, huesos]), huesos }; };
  const nCu = 5, anchos = [15, 18, 30, 30, 25];
  for (let i = 0; i < nCu; i++) {
    const w0 = anchos[i] * sc, w1 = (anchos[i + 1] || 17) * sc, Li = Ls[i];
    let ext = null, alas = null;
    if (i === 2) { alas = [ala(1), ala(-1)]; ext = U2([garras(9 * sc, w0 / 2 - 2, 112, 21 * sc), garras(9 * sc, -w0 / 2 + 2, -112, 21 * sc)]); }
    if (i === 4) ext = U2([garras(Li * 0.6, w0 / 2 - 2, 45, 26 * sc), garras(Li * 0.6, -w0 / 2 + 2, -45, 26 * sc)]);
    const sgx = { s: tramo(C, i, w0, w1, ext) };
    if (alas) { const memb = alSitio(U2(alas.map(a => a.memb)), C.J[i], C.A[i]), hue = alSitio(U2(alas.map(a => a.huesos)), C.J[i], C.A[i]);
      sgx.deco = (m, hh) => relieve(m.add(memb.subtract(sgx.s.offset(-0.2)).extrude(2.4)), hue.subtract(sgx.s), 2.39, Math.min(hh, 4.4)); }
    segs.push(sgx);
  }
  for (let i = 0; i < colN; i++) { const t0 = i / colN, t1 = (i + 1) / colN, w0 = (17 - 10 * t0) * sc + 1, w1 = (17 - 10 * t1) * sc + 1, k = nCu + i, ult = i === colN - 1;
    segs.push({ s: ult ? alSitio(U2([cap2(0, 0, w0 / 2, Ls[k] * 0.5, 0, w1 / 2), P2([[Ls[k] * 0.45, 0], [Ls[k] * 0.9, 7 * sc], [Ls[k] * 1.5, 0], [Ls[k] * 0.9, -7 * sc]]).offset(1, 'Round', 2, 12)]), C.J[k], C.A[k]) : tramo(C, k, w0, w1) }); }
  const W = [30 * sc].concat(anchos.map(x => x * sc)).concat(Array.from({ length: colN }, (_, i) => (17 - 10 * i / colN) * sc + 1));
  const Us = unionesColumna({ J: C.J, A: C.A }, 0, 1, { anchos: W, ro: U.ro, largos: [0].concat(Ls) }).slice(0, segs.length - 1);
  segs[0].deco = m => ponOjos(m, ojos);
  // la cresta: rombos en fila sobre el lomo de cada segmento (relieve de 1,2 mm encima)
  segs.slice(1).forEach((sg, j) => { const prev = sg.deco, Lk = Ls[j] || pitch, q = Math.max(1.6, 3.2 * (1 - 0.6 * j / segs.length));
    sg.deco = (m, hh, cs) => { if (prev) m = prev(m, hh, cs); const L = []; for (let u = Lk * 0.3; u < Lk * 0.8; u += Math.max(4 * q, Lk * 0.35)) L.push(P2([[u - q, 0], [u, q * 0.75], [u + q * 1.8, 0], [u, -q * 0.75]]));
      return relieve(m, alSitio(U2(L), C.J[j], C.A[j]).intersect(cs.offset(-1.6, 'Round', 2, 12)), hh - 0.01, hh + 1.2); }; });
  return figura(segs, Us, { alto: h });
}

// ======================= 🕷️ ARAÑA (patas con rodilla y tobillo) =======================
function arana(p) {
  const h = p.alto, U = medidas(h), sc = p.tam / 160, segs = [], Us = [], ojos = [], Rc = 15 * sc + 2;
  segs.push({ s: U2([C2(Rc, 0, 0), E2(Rc * 0.7, Rc * 0.62, Rc * 0.8, 0)]), abombado: { base: h - 1, alto: h + 3 } }); // cefalotórax (con la cabeza hacia +x)
  [[Rc * 1.15, 3.2], [Rc * 1.15, -3.2], [Rc * 1.0, 6.5], [Rc * 1.0, -6.5]].forEach(([x, y], i) => ojos.push(ojo(x, y * sc, (i < 2 ? 2.2 : 1.6) * sc + 0.4, 1)));
  // abdomen, unido por detrás
  const pa = [-Rc + 1, 0]; segs.push({ s: E2(24 * sc + 3, 17 * sc + 3, pa[0] - 24 * sc - 1, 0), abombado: { base: h - 1, alto: h + 9 } });
  Us.push({ p: pa, a: 0, b: 1, ap: 0, ac: 180, rk: U.ro + 9, delta: 12 });
  // las 8 patas: el muslo sale fijo del cefalotórax; rodilla y tobillo giran
  const angs = [40, 70, 100, 122];
  angs.forEach((ang, k) => [1, -1].forEach(sg => {
    const a = sg * ang, ar = a * RAD, femur = Math.max(2 * U.ro + 4, 30 * sc), P1 = [(Rc + femur) * Math.cos(ar), (Rc + femur) * Math.sin(ar)];
    const muslo = tira2([[Rc * 0.6 * Math.cos(ar), Rc * 0.6 * Math.sin(ar), 3.6], [P1[0], P1[1], 3.2]]); segs[0].s = segs[0].s.add(muslo);
    const dobla = (k < 2 ? -1 : 1) * sg * 32; // las de delante se doblan hacia delante y las de atrás hacia atrás
    const L2 = Math.max(2 * U.ro + 3, 32 * sc), L3 = Math.max(2 * U.ro + 3, 24 * sc), C = cadena(P1, a + dobla, [L2, L3, 0.01], [dobla * 0.4]);
    const i2 = segs.length; segs.push({ s: alSitio(cap2(0, 0, 3.1, L2, 0, 2.7), C.J[0], C.A[0]) }); segs.push({ s: alSitio(tira2([[0, 0, 2.6], [L3 * 0.8, 0, 2.0], [L3 * 1.1, dobla > 0 ? 3 : -3, 1.0]]), C.J[1], C.A[1]) });
    Us.push({ p: C.J[0], a: 0, b: i2, ap: a + 180, ac: C.A[0], rk: U.ro + 6 }, { p: C.J[1], a: i2, b: i2 + 1, ap: C.A[0] + 180, ac: C.A[1], rk: U.ro + 6 });
  }));
  segs[0].deco = m => ponOjos(m, ojos);
  segs[1].deco = (m, hh) => graba(m, U2([P2([[0, 0], [5, 7], [0, 14], [-5, 7]]).translate([pa[0] - 24 * sc - 8, -7]), P2([[0, 0], [4, 4], [0, 8], [-4, 4]]).translate([pa[0] - 24 * sc - 8, 9]).add(P2([[0, 0], [4, 4], [0, 8], [-4, 4]]).translate([pa[0] - 24 * sc - 8, -17]))]).scale([sc, sc]), hh + 9 - 1.2, 0.8); // el reloj de arena (como la viuda negra)
  return figura(segs, Us, { alto: h });
}

// ======================= 🦎 AJOLOTE =======================
function ajolote(p) {
  const h = p.alto, U = medidas(h), sc = p.largo / 160, segs = [], ojos = [];
  const pitch = Math.max(2 * U.ro + 3, 16 * sc), cuerpoL = [pitch * 1.2, pitch * 1.2, pitch];
  const colaN = Math.max(3, Math.round(60 * sc / (2 * U.ro + 2.8))), colaL = Array.from({ length: colaN }, () => Math.max(2 * U.ro + 2.6, 60 * sc / colaN));
  const C = cadena([0, 0], 180, cuerpoL.concat(colaL).concat([0.01]), [2, -2, -3].concat(Array.from({ length: colaN }, (_, i) => (5 + 3 * i) * (p.curva || 1))));
  // cabeza ancha con 3 branquias a cada lado (las «plumas»)
  const branq = sg => U2([[-30, 20, 1], [-6, 26, 0.92], [18, 22, 0.86]].map(([gr, len, k]) => { const a = (sg > 0 ? 90 + gr : -90 - gr) * RAD, b0 = [-14 * sc, sg * 15 * sc], e = [b0[0] + len * sc * Math.cos(a) * k, b0[1] + len * sc * Math.sin(a) * k];
    const plumas = [0.45, 0.7, 0.92].map(t => { const q = [b0[0] + (e[0] - b0[0]) * t, b0[1] + (e[1] - b0[1]) * t], a2 = a + sg * 0.9; return tira2([[q[0], q[1], 1.3], [q[0] + 4.5 * sc * Math.cos(a2), q[1] + 4.5 * sc * Math.sin(a2), 0.9]]); });
    return U2([tira2([[b0[0], b0[1], 2.6], [e[0], e[1], 1.6]])].concat(plumas)); }));
  const cabL = U2([E2(23 * sc, 20 * sc, -16 * sc, 0), cap2(-6, 0, 7, 3, 0, 7), branq(1), branq(-1)]);
  segs.push({ s: alSitio(cabL, C.J[0], C.A[0]), abombado: { base: h - 1.5, alto: h + 3.5 } });
  const L0 = (u, v) => { const a = C.A[0] * RAD; return [C.J[0][0] + u * Math.cos(a) - v * Math.sin(a), C.J[0][1] + u * Math.sin(a) + v * Math.cos(a)]; };
  [11, -11].forEach(v => { const q = L0(-26 * sc, v * sc); ojos.push(ojo(q[0], q[1], 2.6 * sc + 0.5, 1.2)); });
  const pata = (u, v, ang) => { const a = ang * RAD, e = [u + 11 * sc * Math.cos(a), v + 11 * sc * Math.sin(a)]; return U2([tira2([[u, v, 3.4], [e[0], e[1], 2.6]])].concat([-40, 0, 40].map(d => { const t = a + d * RAD; return tira2([[e[0], e[1], 1.6], [e[0] + 4.5 * sc * Math.cos(t), e[1] + 4.5 * sc * Math.sin(t), 1.4]]); }))); };
  const anchos = [24, 25, 21];
  for (let i = 0; i < 3; i++) { const w0 = anchos[i] * sc, w1 = (anchos[i + 1] || 15) * sc, Li = cuerpoL[i];
    const ext = i === 0 ? U2([pata(Li * 0.55, w0 / 2 - 2, 96), pata(Li * 0.55, -w0 / 2 + 2, -96)]) : i === 2 ? U2([pata(Li * 0.55, w0 / 2 - 2, 70), pata(Li * 0.55, -w0 / 2 + 2, -70)]) : null;
    segs.push({ s: tramo(C, i, w0, w1, ext) }); }
  for (let i = 0; i < colaN; i++) { const t0 = i / colaN, t1 = (i + 1) / colaN, w0 = (16 - 6 * t0) * sc + 2, w1 = (16 - 6 * t1) * sc + 2, k = 3 + i, ult = i === colaN - 1;
    segs.push({ s: ult ? alSitio(U2([cap2(0, 0, w0 / 2, colaL[i] * 0.5, 0, w1 / 2), E2(colaL[i] * 0.75, w1 * 0.42, colaL[i] * 0.85, 0)]), C.J[k], C.A[k]) : tramo(C, k, w0, w1) }); }
  const W = [40 * sc].concat(anchos.map(x => x * sc)).concat(Array.from({ length: colaN }, (_, i) => (16 - 6 * i / colaN) * sc + 2));
  const Us = unionesColumna({ J: C.J, A: C.A }, 0, 1, { anchos: W, ro: U.ro, largos: [0].concat(cuerpoL).concat(colaL) }).slice(0, segs.length - 1);
  segs[0].deco = (m, hh) => { const a = C.A[0] * RAD, q = L0(-34 * sc, 0), sonrisa = C2(7 * sc, 0, 0).subtract(C2(7 * sc - 0.9, 0, 0)).subtract(P2([[-20, 0], [20, 0], [20, 20], [-20, 20]])).rotate(C.A[0] + 90).translate([q[0] + 3 * sc * Math.cos(a), q[1] + 3 * sc * Math.sin(a)]); void hh;
    return ponOjos(graba(m, sonrisa, h + 3.5 - 1.1, 0.7), ojos); };
  return figura(segs, Us, { alto: h });
}


// ======================= 🦈 TIBURÓN (17-10-2026 tarde: ella pidió «más juguetes, diseños vendibles de verdad») =======================
// Visto desde arriba, como se imprime: hocico en punta, aletas pectorales largas, branquias grabadas y la cola en media luna.
function tiburon(p) {
  const h = p.alto, sc = p.largo / 200, U = medidas(h);
  const Lb = 92 * sc, nB = Math.max(4, Math.min(7, Math.floor(Lb / (2 * U.ro + 3.4)))), Ls = Array(nB).fill(Lb / nB);
  const gir = Array.from({ length: nB }, (_, i) => [3, 5, 4, -3, -6, -5, -3][i] * (p.curva || 1));
  const C = cadena([112 * sc, 0], 180, Ls.concat([0.01]), gir), segs = [], ojos = [];
  const cabL = U2([H2([E2(33 * sc, 20 * sc, -26 * sc, 0), C2(5 * sc, -62 * sc, 0)]), cap2(-6 * sc, 0, 7.5, 4, 0, 7.5)]);
  segs.push({ s: alSitio(cabL, C.J[0], C.A[0]), abombado: { base: h - 1.5, alto: h + 3 } });
  const P0 = (u, v) => { const a = C.A[0] * RAD; return [C.J[0][0] + u * Math.cos(a) - v * Math.sin(a), C.J[0][1] + u * Math.sin(a) + v * Math.cos(a)]; };
  [11, -11].forEach(v => { const q = P0(-40 * sc, v * sc); ojos.push(ojo(q[0], q[1], 3 * sc, 1.2)); });
  for (let i = 0; i < nB; i++) {
    const t0 = i / nB, t1 = (i + 1) / nB, w0 = (40 - 30 * t0) * sc, w1 = (40 - 30 * t1) * sc;
    let ext = null;
    if (i === 0) ext = U2([E2(20 * sc, 5.5 * sc, 14 * sc, w0 / 2 + 7 * sc, 40), E2(20 * sc, 5.5 * sc, 14 * sc, -w0 / 2 - 7 * sc, -40)]); // aletas pectorales hacia atrás
    if (i === Math.floor(nB / 2)) ext = U2([E2(8 * sc, 3.5 * sc, 6 * sc, w0 / 2 + 2 * sc, 35), E2(8 * sc, 3.5 * sc, 6 * sc, -w0 / 2 - 2 * sc, -35)]); // las pequeñas de detrás
    segs.push({ s: tramo(C, i, w0, w1, ext) });
  }
  const colaL = U2([cap2(0, 0, 4 * sc, 8 * sc, 0, 3.5 * sc), H2([C2(3 * sc, 6 * sc, 1.5 * sc), E2(19 * sc, 4.5 * sc, 22 * sc, 15 * sc, 52)]), H2([C2(3 * sc, 6 * sc, -1.5 * sc), E2(13 * sc, 4.2 * sc, 17 * sc, -10 * sc, -50)])]);
  segs.push({ s: alSitio(colaL, C.J[nB], C.A[nB]) });
  const W = [40 * sc].concat(Array.from({ length: nB }, (_, i) => (40 - 30 * i / nB) * sc)).concat([8 * sc]);
  const Us = unionesColumna(C, 0, 1, { anchos: W, ro: U.ro, largos: [0].concat(Ls) });
  // branquias: 4 rayitas a cada lado, detrás de los ojos · boca: un arco grabado
  segs[0].deco = (m, hh) => { const L = []; [1, -1].forEach(sg => [0, 1, 2, 3].forEach(k => L.push(alSitio(cap2(-14 * sc + k * 3.6 * sc, sg * 10 * sc, 0.55, -10 * sc + k * 3.6 * sc, sg * 16 * sc, 0.55), C.J[0], C.A[0]))));
    L.push(alSitio(C2(9 * sc, -50 * sc, 0).subtract(C2(8 * sc, -50 * sc, 0)).subtract(P2([[-50 * sc, -12 * sc], [-70 * sc, -12 * sc], [-70 * sc, 12 * sc], [-50 * sc, 12 * sc]])), C.J[0], C.A[0]));
    return ponOjos(graba(m, U2(L), hh + 3 - 0.8, 0.6), ojos); };
  return figura(segs, Us, { alto: h });
}

// ======================= 🐍 SERPIENTE (cobra con capucha o serpiente lisa) =======================
// Muchas vértebras en S: se mueve ondulando. Rombos grabados en el lomo; la cobra lleva la capucha abierta detrás de la cabeza.
function serpiente(p) {
  const h = p.alto, sc = p.largo / 220, U = medidas(h), cobra = p.estilo === 'cobra';
  const nB = Math.max(8, Math.min(14, Math.round(p.trozos))), paso = Math.max(2 * U.ro + 3, 150 * sc / nB), Ls = Array(nB).fill(paso);
  const gir = Array.from({ length: nB }, (_, i) => 16 * Math.sin((i + 1) / nB * Math.PI * 2.2) * (p.curva || 1));
  const C = cadena([95 * sc, 0], 180, Ls.concat([0.01]), gir), segs = [], ojos = [];
  const cabL = cobra ? U2([E2(17 * sc, 11 * sc, -16 * sc, 0), E2(8 * sc, 21 * sc, -7 * sc, 0), cap2(-4 * sc, 0, 7, 4, 0, 7)]) /* (la capucha, por delante de la unión: detrás chocaba al girar) */
    : U2([H2([E2(17 * sc, 11.5 * sc, -13 * sc, 0), C2(6 * sc, -27 * sc, 0)]), cap2(-4 * sc, 0, 7, 4, 0, 7)]);
  segs.push({ s: alSitio(cabL, C.J[0], C.A[0]), abombado: { base: h - 1.5, alto: h + 2.5 } });
  const P0 = (u, v) => { const a = C.A[0] * RAD; return [C.J[0][0] + u * Math.cos(a) - v * Math.sin(a), C.J[0][1] + u * Math.sin(a) + v * Math.cos(a)]; };
  [6.5, -6.5].forEach(v => { const q = P0(-20 * sc, v * sc); ojos.push(ojo(q[0], q[1], 2.4 * sc + 0.4, 1.2)); });
  for (let i = 0; i < nB; i++) { const w0 = (20 - 9 * i / nB) * sc + 2, w1 = (20 - 9 * (i + 1) / nB) * sc + 2; segs.push({ s: tramo(C, i, w0, w1, null), w0 }); }
  const colaL = tira2([[0, 0, 5 * sc + 1], [10 * sc, 0, 3.5 * sc + 0.6], [20 * sc, 0, 1.6]]);
  segs.push({ s: alSitio(colaL, C.J[nB], C.A[nB]) });
  const W = [24 * sc].concat(Array.from({ length: nB }, (_, i) => (20 - 9 * i / nB) * sc + 2)).concat([10 * sc]);
  const Us = unionesColumna(C, 0, 1, { anchos: W, ro: U.ro, largos: [0].concat(Ls) });
  segs[0].deco = (m, hh) => { const L = [alSitio(cap2(-33 * sc, 0, 0.5, -27 * sc, 0, 0.5), C.J[0], C.A[0])];
    if (cobra) L.push(alSitio(E2(4.5 * sc, 12 * sc, -7 * sc, 0).subtract(E2(3.4 * sc, 10.8 * sc, -7 * sc, 0)), C.J[0], C.A[0]));
    return ponOjos(graba(m, U2(L), hh + 2.5 - 0.8, 0.6), ojos); };
  for (let i = 1; i <= nB; i++) segs[i].deco = (m, hh, cs) => { const r = Math.max(2, segs[i].w0 * 0.22), q = [C.J[i - 1][0] + Math.cos(C.A[i - 1] * RAD) * paso * 0.55, C.J[i - 1][1] + Math.sin(C.A[i - 1] * RAD) * paso * 0.55];
    const rombo = P2([[r, 0], [0, r * 0.75], [-r, 0], [0, -r * 0.75]]).rotate(C.A[i - 1]).translate(q); return graba(m, rombo.subtract(rombo.offset(-0.7, 'Miter', 2)).intersect(cs.offset(-1.5, 'Round', 2, 12)), hh, 0.5); };
  return figura(segs, Us, { alto: h });
}

const GEN = { pez, pulpo, lagartija, dragon, arana, ajolote, tiburon, serpiente };
// lo que sale en el catálogo (o las piezas sueltas para las pruebas, con __piezas)
export function generaFigura(tipo, p) { const F = GEN[tipo](p); if (p.__piezas) return F; return N.aLaCama(junta(F)); }
const notaFlexi = (F0, extra) => 'Se imprime YA MONTADA, de una vez y sin soportes: cada unión es un pasador en forma de reloj de arena dentro de su anillo (0,5 mm de aire), gira ±' + UNION.delta + '° y no se sale ni tirando ni hacia arriba. Al sacarla de la cama, mueve cada unión con suavidad para soltarla. Capa de 0,2 mm, PLA (el seda queda precioso). ' + (extra || '') + (F0 ? '' : '');
const ALTO = n('alto', 'Grosor (alto de la figura)', 8, 7, 10, 0.5);

export const DISENOS_ARTICULADOS = {
  tiburonFlexi: { cat: 'ninos', tambien: ['juegos', 'jovenes'], e: '🦈', t: 'Tiburón articulado', d: 'Hocico en punta, aletas largas, branquias grabadas y cola en media luna: nada como uno de verdad', uso: 'deco', color: '#5b7c99', nuevo: true,
    campos: [n('largo', 'Largo', 200, 180, 240, 1), n('curva', 'Curva en reposo', 1, 0, 1.6, 0.1, ''), ALTO],
    gen: p => generaFigura('tiburon', p), nota: () => notaFlexi(1, 'En gris o azul con la tripa pintada de blanco queda muy real.') },
  serpienteFlexi: { cat: 'ninos', tambien: ['juegos', 'halloween', 'jovenes'], e: '🐍', t: 'Serpiente articulada (cobra o lisa)', d: 'Muchas vértebras: ondula de verdad. Rombos en el lomo; la cobra, con su capucha', uso: 'deco', color: '#2d6a4f', nuevo: true,
    campos: [s('estilo', 'Estilo', 'cobra', [['cobra', '🐍 Cobra con capucha'], ['lisa', 'Serpiente']]), n('largo', 'Largo', 220, 200, 250, 1), n('trozos', 'Vértebras', 11, 8, 14, 1, ''), n('curva', 'Ondulación', 1, 0, 1.5, 0.1, ''), ALTO],
    gen: p => generaFigura('serpiente', p), nota: () => notaFlexi(1, 'Cuantas más vértebras, más ondula (y más tarda en imprimirse).') },
  dragonFlexi: { cat: 'ninos', tambien: ['juegos', 'frikis', 'jovenes'], e: '🐉', t: 'Dragón articulado con alas', d: 'Cabeza con cuernos, alas con sus huesos, garras y cresta: se mueve entero', uso: 'deco', color: '#2a9d8f', nuevo: true,
    campos: [n('largo', 'Largo', 230, 230, 250, 1), n('curva', 'Curva de la cola (0 = recta)', 1, 0, 1.6, 0.1, ''), ALTO], // (17-10: de 230 a 250, lo comprobado: por debajo se cortaban las puntas del cuello; por encima no cabe)
    gen: p => generaFigura('dragon', p), nota: () => notaFlexi(1, 'Las alas son una membrana de 2,4 mm con los huesos en relieve. Mejor en la P1P (mide más de 18 cm).') },
  pulpoFlexi: { cat: 'ninos', tambien: ['juegos', 'cuqui'], e: '🐙', t: 'Pulpo articulado', d: '8 tentáculos que se mueven, con ventosas y el manto abombado', uso: 'deco', color: '#e76f51', nuevo: true,
    campos: [n('cabeza', 'Ancho de la cabeza', 64, 58, 80, 1), n('segmentos', 'Trozos de cada tentáculo', 3, 2, 3, 1, ''), n('largo', 'Largo de los tentáculos', 100, 85, 120, 1, '%'), n('rizo', 'Rizo de las puntas', 10, 0, 16, 1, ''), ALTO],
    gen: p => generaFigura('pulpo', p), nota: () => notaFlexi(1, 'El manto sale abombado (más alto en el centro): no le hace falta soporte, sube poco a poco.') },
  pezFlexi: { cat: 'ninos', tambien: ['juegos', 'cuqui'], e: '🐟', t: 'Pez articulado (normal o esqueleto)', d: 'Se mueve como un pez de verdad; en «esqueleto», con sus costillas y espinas', uso: 'deco', color: '#ffb703', nuevo: true,
    campos: [s('estilo', 'Estilo', 'pez', [['pez', '🐟 Pez con escamas'], ['esqueleto', '🦴 Esqueleto de pez']]), n('largo', 'Largo', 170, 150, 240, 1), n('curva', 'Curva en reposo', 1, 0, 1.6, 0.1, ''), ALTO],
    gen: p => generaFigura('pez', p), nota: () => notaFlexi(1, 'Las escamas van grabadas medio milímetro.') },
  lagartijaFlexi: { cat: 'ninos', tambien: ['juegos', 'mascotas'], e: '🦎', t: 'Lagartija (gecko) articulada', d: 'Patas con dedos redondos, manchas en el lomo y la cola que se enrosca', uso: 'deco', color: '#90be6d', nuevo: true,
    campos: [n('largo', 'Tamaño', 180, 160, 230, 1), n('curva', 'Curva de la cola', 1, 0, 1.6, 0.1, ''), ALTO],
    gen: p => generaFigura('lagartija', p), nota: () => notaFlexi(1) },
  aranaFlexi: { cat: 'halloween', tambien: ['ninos', 'juegos', 'frikis'], e: '🕷️', t: 'Araña articulada (Halloween)', d: '8 patas con rodilla y tobillo que se mueven, y el reloj de arena en el abdomen', uso: 'deco', color: '#1b1b1f', nuevo: true,
    campos: [n('tam', 'Tamaño', 150, 140, 200, 1), ALTO],
    gen: p => generaFigura('arana', p), nota: () => notaFlexi(1, 'En negro mate con el reloj de arena pintado de rojo, da miedo de verdad.') },
  ajoloteFlexi: { cat: 'cuqui', tambien: ['ninos', 'juegos'], e: '🩷', t: 'Ajolote articulado', d: 'Con sus branquias de plumas, sonrisa y la cola con aleta', uso: 'deco', color: '#ffafcc', nuevo: true,
    campos: [n('largo', 'Tamaño', 160, 150, 220, 1), n('curva', 'Curva de la cola', 1, 0, 1.6, 0.1, ''), ALTO],
    gen: p => generaFigura('ajolote', p), nota: () => notaFlexi(1) }
};
