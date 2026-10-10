// ================= v20.4 · ◜ CelebriR8 · EMPALME (redondeo) y CHAFLÁN de bordes =================
// La dueña (10-10-2026): «que pueda tener empalme». Como en Fusion: eliges una CARA y se redondean (o se biselan) sus bordes.
//  · Bordes RECTOS entre dos caras planas, con cualquier ángulo entre ellas; y bordes CIRCULARES (el de arriba de un cilindro, la boca
//    de un agujero, el pie de un saliente redondo).
//  · Borde EXTERIOR (convexo): se QUITA el canto. Borde INTERIOR (un rincón, cóncavo): se RELLENA con su curva (refuerza la pieza).
//  · Redondeo ≠ chaflán: el redondeo deja un cuarto de cilindro tangente a las dos caras; el chaflán, un corte plano a 45° (o al
//    ángulo que haga falta) que se lleva «r» mm de cada cara.
//  · Radio IMPOSIBLE (más grande que lo que miden las caras al lado del borde): se dice cuál es el máximo y no se hace.
//  · Se guarda como un PARÁMETRO de la pieza (c.empalmes, en su sitio local): se puede cambiar el radio o quitarlo después, deshacer
//    y rehacer; y si la pieza cambia tanto que el borde ya no está, el redondeo NO corta a ciegas: avisa y se salta.
// Lo que NO hace (todavía): bordes de caras curvas libres (esferas, mallas orgánicas) ni la «bola» en una esquina donde se juntan
// tres redondeos (allí quedan dos redondeos que se cruzan, como un inglete).
import * as N from './nucleo.js';
import { caraPlana } from './caras.js';

const M = () => N.MF();
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]), unit = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const r3 = x => Math.round(x * 1e4) / 1e4, R3 = a => a.map(r3);
const q = 1e4, k3 = (x, y, z) => Math.round(x * q) + ',' + Math.round(y * q) + ',' + Math.round(z * q);
const EPS = 0.02; // lo que el cortador sale de la pieza (o entra en ella, al rellenar): corta o funde limpio
export const n1 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');

// ---------- 1) LOS BORDES DE UNA CARA (en el mundo): rectos y circulares, con la cara de al lado ----------
// vista/tri/Mx como en caras.caraPlana. Devuelve { F, rectas: [...], circulos: [...], otras (bordes que no se pueden) }
export function bordesDeCara(vista, tri, Mx) {
  const F = caraPlana(vista, tri, Mx), P = vista.pos, I = vista.idx, nt = I.length / 3, nv = P.length / 3;
  const W = new Float64Array(nv * 3);
  for (let i = 0; i < nv; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; for (let k = 0; k < 3; k++) W[i * 3 + k] = Mx[k] * x + Mx[4 + k] * y + Mx[8 + k] * z + Mx[12 + k]; }
  const vtx = i => [W[i * 3], W[i * 3 + 1], W[i * 3 + 2]], K = i => k3(W[i * 3], W[i * 3 + 1], W[i * 3 + 2]);
  const nTri = t => unit(cross(sub(vtx(I[t * 3 + 1]), vtx(I[t * 3])), sub(vtx(I[t * 3 + 2]), vtx(I[t * 3]))));
  const n0 = F.n, d0 = dot(n0, F.o), enPlano = t => { const n = nTri(t); return dot(n, n0) > 0.9999 && Math.abs(dot(n0, vtx(I[t * 3])) - d0) < 0.01; };
  const porArista = new Map(); // «ka|kb» (ordenadas) → triángulos
  for (let t = 0; t < nt; t++) for (let j = 0; j < 3; j++) { const a = K(I[t * 3 + j]), b = K(I[t * 3 + (j + 1) % 3]), c = a < b ? a + '|' + b : b + '|' + a; let L = porArista.get(c); if (!L) porArista.set(c, L = []); L.push(t); }
  const vecino = (pa, pb) => { const a = k3(...pa), b = k3(...pb), L = porArista.get(a < b ? a + '|' + b : b + '|' + a) || []; const t = L.find(x => !enPlano(x)); return t == null ? null : { t, n: nTri(t) }; };
  const rectas = [], circulos = []; let otras = 0;
  const caras2 = new Map(); // la cara de al lado (para saber cuánto mide junto al borde)
  const caraDe = t => { if (!caras2.has(t)) { try { caras2.set(t, caraPlana(vista, t, Mx)); } catch (e) { caras2.set(t, null); } } return caras2.get(t); };
  const ancho = (anillos, a, f) => { let m = 0; anillos.forEach(r => r.forEach(p => { m = Math.max(m, dot(sub(p, a), f)); })); return m; };
  F.bordes.forEach(r => {
    const segs = r.map((p, i) => { const b = r[(i + 1) % r.length], v = vecino(p, b); return { a: p, b, e: unit(sub(b, p)), L: len(sub(b, p)), v }; }).filter(s => s.L > 1e-6);
    if (!segs.length) return;
    // ¿es un CÍRCULO? (12 lados o más, todos a la misma distancia del centro, y la pared de al lado de pie y en radial)
    const c0 = mul(r.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / r.length), rad = r.map(p => len(sub(sub(p, c0), mul(n0, dot(sub(p, c0), n0))))), Rm = rad.reduce((s, x) => s + x, 0) / rad.length;
    const esCirculo = r.length >= 12 && Rm > 0.3 && rad.every(x => Math.abs(x - Rm) < Math.max(0.01, 0.012 * Rm)) && segs.every(s => s.v && Math.abs(dot(s.v.n, n0)) < 0.03);
    if (esCirculo) {
      const s = segs[0], mid = mul(add(s.a, s.b), 0.5), rr = unit(sub(sub(mid, c0), mul(n0, dot(sub(mid, c0), n0)))), f1 = unit(cross(n0, s.e)), n2 = s.v.n;
      const s1 = Math.sign(dot(f1, rr)), s2 = Math.sign(dot(n2, rr)), f2 = unit(cross(n2, mul(s.e, -1))), z2 = Math.sign(dot(f2, n0));
      if (!segs.every(x => Math.abs(Math.abs(dot(x.v.n, unit(sub(sub(mul(add(x.a, x.b), 0.5), c0), mul(n0, dot(sub(mul(add(x.a, x.b), 0.5), c0), n0)))))) - 1) < 0.03)) { otras++; return; }
      const B = F.base, u = B.u, v = B.v, p0 = sub(r[0], c0), fase = Math.atan2(dot(p0, v), dot(p0, u)) * 180 / Math.PI;
      const C2 = caraDe(s.v.t), alto = C2 ? ancho(C2.bordes, s.a, f2) : 0, dentro = s1 < 0 ? Rm : Infinity; // (en un cilindro, el redondeo no puede pasar del centro)
      circulos.push({ tipo: 'circulo', c: c0, R: Rm, u, v, n: n0, s1, s2, z2, nseg: r.length, fase, convexa: s1 * s2 < 0, maxT: Math.min(dentro - 0.05, alto - 0.01, s1 > 0 ? ancho(F.bordes, s.a, f1) - 0.01 : Infinity) });
      return;
    }
    // RECTOS: los trozos seguidos en línea y con la misma cara al lado, juntos
    let run = null; const cierra = () => { if (!run) return; if (run.L < 0.2 || !run.v) { otras++; run = null; return; }
      const f1 = unit(cross(n0, run.e)), n2 = run.v.n, f2 = unit(cross(n2, mul(run.e, -1))), C2 = caraDe(run.v.t);
      const a1 = ancho(F.bordes, run.a, f1), a2 = C2 ? ancho(C2.bordes, run.a, f2) : 0, alfa = Math.acos(Math.max(-1, Math.min(1, dot(f1, f2))));
      if (alfa < 0.05 || alfa > Math.PI - 0.02) { otras++; run = null; return; } // (casi planas: no hay canto)
      rectas.push({ tipo: 'recta', a: run.a, b: run.b, e: run.e, L: run.L, n1: n0, n2, f1, f2, alfa, convexa: dot(f1, n2) < 0, ancho1: a1, ancho2: a2 }); run = null; };
    segs.forEach(s => {
      if (run && s.v && run.v && dot(s.e, run.e) > 0.9999 && dot(s.v.n, run.v.n) > 0.9999 && len(sub(s.a, run.b)) < 1e-3) { run.b = s.b; run.L += s.L; }
      else { cierra(); run = { a: s.a, b: s.b, e: s.e, L: s.L, v: s.v }; }
    });
    cierra();
    // si el primero y el último son el mismo borde (el anillo empezó a mitad de un lado), júntalos
    if (rectas.length >= 2) { const x = rectas[rectas.length - 1], y = rectas.find(z => z !== x && len(sub(z.a, x.b)) < 1e-3 && dot(z.e, x.e) > 0.9999 && dot(z.n2, x.n2) > 0.9999); if (y) { y.a = x.a; y.L += x.L; rectas.pop(); } }
  });
  // en un borde recto, lo largo que puede ser el redondeo (lo que mide la cara de cada lado)
  rectas.forEach(x => { const tan = Math.tan(x.alfa / 2); x.maxT = Math.min(x.ancho1, x.ancho2) - 0.01; x.maxR = x.maxT * tan; });
  circulos.forEach(x => { x.maxR = x.maxT; });
  return { F, rectas, circulos, otras };
}
// lo que mide como mucho el redondeo (radio) o el chaflán (distancia) en una lista de bordes
// (si en la misma cara hay otro borde marcado paralelo y enfrente, cada redondeo solo puede llegar a la MITAD de lo que hay entre ellos)
export function maximo(bordes, tipo) {
  let m = Infinity;
  bordes.forEach(x => {
    let t = x.maxT;
    if (x.tipo === 'recta') bordes.forEach(y => { if (y === x || y.tipo !== 'recta' || Math.abs(dot(x.e, y.e)) < 0.999) return; const d = dot(sub(y.a, x.a), x.f1); if (d > 0.01) t = Math.min(t, d / 2 - 0.01); });
    m = Math.min(m, tipo === 'chaflan' || x.tipo !== 'recta' ? t : t * Math.tan(x.alfa / 2));
  });
  return m;
}
export const textoBorde = x => x.tipo === 'circulo' ? (x.s1 > 0 ? (x.convexa ? '◯ Boca de agujero Ø' : '◯ Pie de saliente Ø') : '◯ Borde de cilindro Ø') + n1(2 * x.R) : '▬ Recto ' + n1(x.L) + ' mm' + (x.convexa ? '' : ' (rincón: se rellena)') + (Math.abs(x.alfa - Math.PI / 2) > 0.02 ? ' · ' + Math.round(x.alfa * 180 / Math.PI) + '°' : '');

// ---------- 2) DEL MUNDO AL SITIO LOCAL DE LA PIEZA (lo que se guarda) ----------
// Mi = matriz inversa del mundo de la pieza (16, por columnas) · Mt = la del mundo (para las normales)
export function aLocal(b, Mi, Mw) {
  const P = p => [0, 1, 2].map(k => Mi[k] * p[0] + Mi[4 + k] * p[1] + Mi[8 + k] * p[2] + Mi[12 + k]);
  const D = d => unit([0, 1, 2].map(k => Mi[k] * d[0] + Mi[4 + k] * d[1] + Mi[8 + k] * d[2]));
  const Nn = n => unit([0, 1, 2].map(k => Mw[k * 4] * n[0] + Mw[k * 4 + 1] * n[1] + Mw[k * 4 + 2] * n[2])); // normal: con la traspuesta del mundo
  if (b.tipo === 'circulo') return { tipo: 'circulo', c: R3(P(b.c)), R: r3(b.R), u: R3(D(b.u)), v: R3(D(b.v)), n: R3(Nn(b.n)), s1: b.s1, s2: b.s2, z2: b.z2, nseg: b.nseg, fase: r3(b.fase), convexa: b.convexa, Rl: r3(len(sub(P(add(b.c, mul(b.u, b.R))), P(b.c)))) };
  return { tipo: 'recta', a: R3(P(b.a)), b: R3(P(b.b)), n1: R3(Nn(b.n1)), n2: R3(Nn(b.n2)), f1: R3(D(b.f1)), f2: R3(D(b.f2)), convexa: b.convexa };
}

// ---------- 3) EL TROZO QUE SE QUITA (borde exterior) O SE AÑADE (rincón) ----------
// en el plano del corte: E (el canto), T1 y T2 (donde el redondeo toca cada cara), C (centro del redondeo)
function perfil2D(f1, f2, n1, n2, r, tipo, convexa) { // vectores 2D · devuelve la CrossSection
  const alfa = Math.acos(Math.max(-1, Math.min(1, f1[0] * f2[0] + f1[1] * f2[1]))), bis = (() => { const x = f1[0] + f2[0], y = f1[1] + f2[1], l = Math.hypot(x, y) || 1; return [x / l, y / l]; })();
  const s = convexa ? 1 : -1, t = tipo === 'chaflan' ? r : r / Math.tan(alfa / 2);
  const T1 = [f1[0] * t, f1[1] * t], T2 = [f2[0] * t, f2[1] * t], E = [-bis[0] * EPS, -bis[1] * EPS];
  // T1 y T2 EXACTOS sobre las caras; el trocito de fuera (T1b, T2b) solo asegura que el corte (o el relleno) sale limpio
  const T1b = [T1[0] + s * EPS * n1[0], T1[1] + s * EPS * n1[1]], T2b = [T2[0] + s * EPS * n2[0], T2[1] + s * EPS * n2[1]];
  if (tipo === 'chaflan') return N.cs([N.ccw([E, T1b, T1, T2, T2b])], 'Positive');
  const dc = r / Math.sin(alfa / 2), C = [bis[0] * dc, bis[1] * dc];
  const disco = N.cs([N.ccw(Array.from({ length: 96 }, (_, i) => [C[0] + r * Math.cos(i * Math.PI / 48), C[1] + r * Math.sin(i * Math.PI / 48)]))], 'Positive');
  return N.cs([N.ccw([E, T1b, T1, C, T2, T2b])], 'Positive').subtract(disco);
}
export function regionDe(x, tipo, r) {
  if (x.tipo === 'recta') {
    const e = unit(sub(x.b, x.a)), L = len(sub(x.b, x.a)), X = x.f1, Y = unit(sub(x.f2, mul(X, dot(x.f2, X))));
    const d2 = v => [dot(v, X), dot(v, Y)], S = perfil2D(d2(x.f1), d2(x.f2), d2(x.n1), d2(x.n2), r, tipo, x.convexa);
    // el plano del corte: X, Y; a lo largo del borde, Z = e (X × Y = ±e: si sale al revés, se da la vuelta a Y)
    const z = cross(X, Y), sg = dot(z, e) >= 0 ? 1 : -1, Yr = sg > 0 ? Y : mul(Y, -1), S2 = sg > 0 ? S : S.mirror([0, 1]);
    const o = sub(x.a, mul(e, EPS));
    return S2.extrude(L + 2 * EPS).transform([X[0], X[1], X[2], 0, Yr[0], Yr[1], Yr[2], 0, e[0], e[1], e[2], 0, o[0], o[1], o[2], 1]);
  }
  // circular: en el semiplano (ρ, z) a ángulo 0, y luego da la vuelta con los MISMOS lados (y en fase) que el agujero o el cilindro
  const R = x.Rl || x.R, Ep = [R, 0], f1 = [x.s1, 0], f2 = [0, x.z2], S0 = perfil2D(f1, f2, [0, 1], [x.s2, 0], r, tipo, x.convexa).translate(Ep);
  if (S0.bounds().min[0] < 0.02) N.mal('Ese redondeo pasa del centro del círculo: hazlo más pequeño.');
  const sol = S0.revolve(Math.max(12, x.nseg)).rotate([0, 0, x.fase]);
  return sol.transform([x.u[0], x.u[1], x.u[2], 0, x.v[0], x.v[1], x.v[2], 0, x.n[0], x.n[1], x.n[2], 0, x.c[0], x.c[1], x.c[2], 1]);
}

// ---------- 4) APLICARLOS a una pieza (en su sitio local) ----------
// L = [{ tipo: 'redondeo' | 'chaflan', r, aristas: [...] }] → { m, avisos }
export function aplica(m, L) {
  const avisos = [];
  (L || []).forEach((E, i) => {
    const r = Number(E.r) || 0; if (!(r > 0.01)) return;
    (E.aristas || []).forEach((x, j) => {
      let reg; try { reg = regionDe(x, E.tipo, r); } catch (e) { avisos.push('Redondeo ' + (i + 1) + ', borde ' + (j + 1) + ': ' + (e.message || e)); return; }
      if (!(reg.volume() > 1e-6)) return;
      // ¿sigue ahí el borde? (si la pieza cambió, el trozo ya no cae en su sitio: mejor avisar que cortar a ciegas). Se mira con tres
      // cubitos de 0,1 mm junto al borde: encima de cada cara tiene que haber AIRE y detrás de las dos, MATERIAL.
      if (!sigueAhi(m, x)) { avisos.push('El ' + (E.tipo === 'chaflan' ? 'chaflán' : 'redondeo') + ' ' + (i + 1) + ' ya no encuentra su borde ' + (j + 1) + ' (has cambiado la pieza): quítalo y vuelve a hacerlo.'); return; }
      m = x.convexa ? m.subtract(reg) : m.add(reg);
    });
  });
  return { m, avisos };
}
// el borde, en un punto: E, sus dos caras (n1, n2) y hacia dónde va cada cara (f1, f2)
function puntoBorde(x) {
  if (x.tipo === 'recta') return { E: mul(add(x.a, x.b), 0.5), n1: x.n1, n2: x.n2, f1: x.f1, f2: x.f2 };
  const a = x.fase * Math.PI / 180, rr = unit(add(mul(x.u, Math.cos(a)), mul(x.v, Math.sin(a)))), R = x.Rl || x.R;
  return { E: add(x.c, mul(rr, R)), n1: x.n, n2: mul(rr, x.s2), f1: mul(rr, x.s1), f2: mul(x.n, x.z2) };
}
export function sigueAhi(m, x) {
  const B = puntoBorde(x), k = 0.1, cubo = p => M().cube([k, k, k], true).translate(p), lleno = p => m.intersect(cubo(p)).volume() / (k * k * k);
  const aire1 = add(add(B.E, mul(B.n1, 0.12)), mul(B.f1, 0.4)), aire2 = add(add(B.E, mul(B.n2, 0.12)), mul(B.f2, 0.4)), dentro = sub(B.E, mul(add(B.n1, B.n2), 0.3));
  return lleno(aire1) < 0.1 && lleno(aire2) < 0.1 && lleno(dentro) > 0.9;
}
export const AVISOS = new Map(); // id del cuerpo → avisos del último cálculo (los enseña el panel)
