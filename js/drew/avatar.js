// ================= 👗 CelebriDREW · EL AVATAR: un cuerpo 3D a medida (cm → mm) =================
// El cuerpo es una FUNCIÓN DE DISTANCIA (SDF): para cada punto del espacio dice a cuántos mm está de la piel (negativo = dentro). Se arma
// con piezas suaves unidas sin costura (tronco por secciones elípticas, cuello, cabeza, hombros, brazos y piernas en «conos redondos»,
// pecho y glúteos), y de esa misma función salen:
//   · la MALLA que se ve (superficie a partir de una rejilla, con cada vértice llevado a la piel de verdad),
//   · la REJILLA de choque de la tela (la tela no atraviesa el cuerpo),
//   · las MEDIDAS que tiene de verdad: se corta el cuerpo a la altura del pecho, la cintura, la cadera y el muslo y se mide el contorno
//     como lo haría una cinta (por fuera, sin meterse en los huecos). El cuerpo se CORRIGE hasta que da lo pedido (± 0,3 cm).
// Coordenadas: milímetros, Y hacia arriba, los pies en Y = 0, mira hacia +Z; +X es su lado IZQUIERDO.
// Postura «A» (brazos a 38° del cuerpo), como los maniquíes de los programas de moda: así las mangas no rozan el costado.

// ---------- las medidas (cm) ----------
// [clave, texto, mujer M, hombre M, cómo se mide]
export const CAMPOS = [
  ['altura', 'Altura', 165, 178, 'Descalza, de pie, de la coronilla al suelo.'],
  ['pecho', 'Pecho / busto', 88, 98, 'Por la parte más saliente del pecho, la cinta horizontal y sin apretar.'],
  ['bajoPecho', 'Bajo pecho', 75, 0, 'Justo debajo del pecho (donde va la banda del sujetador). En hombre se deja en 0.'],
  ['cintura', 'Cintura', 70, 84, 'Por la parte más estrecha, a la altura del ombligo o un poco más arriba.'],
  ['cadera', 'Cadera', 96, 100, 'Por la parte más ancha de los glúteos, de pie con los pies juntos.'],
  ['cuello', 'Cuello', 35, 39, 'Por la base del cuello.'],
  ['hombros', 'Ancho de hombros', 39, 46, 'Por la espalda, de la punta de un hombro a la del otro.'],
  ['espalda', 'Talle de espalda', 41, 45, 'De la nuca (el huesito que sobresale) a la cintura.'],
  ['brazo', 'Largo de brazo', 60, 62, 'De la punta del hombro a la muñeca, con el brazo estirado.'],
  ['biceps', 'Contorno de brazo', 28, 32, 'Por la parte más gruesa del brazo, relajado.'],
  ['muneca', 'Muñeca', 16, 17.5, 'Por el hueso de la muñeca.'],
  ['entrepierna', 'Entrepierna', 76, 81, 'De la entrepierna al suelo, descalza.'],
  ['muslo', 'Muslo', 56, 56, 'Por la parte más gruesa del muslo, justo debajo de la entrepierna.'],
  ['rodilla', 'Rodilla', 36, 38, 'Por el centro de la rodilla.'],
  ['gemelo', 'Gemelo', 35, 37, 'Por la parte más gruesa de la pantorrilla.'],
  ['tobillo', 'Tobillo', 22, 23.5, 'Por encima del hueso del tobillo.'],
];
export const PESO_BASE = { mujer: 60, hombre: 76 };
export const base = sexo => Object.fromEntries(CAMPOS.map(c => [c[0], c[sexo === 'hombre' ? 3 : 2]]));

// ---------- avatar por ALTURA y PESO (ESTIMADO) ----------
// Se parte de la talla M del sexo elegido y se escala: las LONGITUDES con la altura y los CONTORNOS con la raíz de (peso / altura)
// relativos a la base (el peso va con el volumen: contorno² × altura). Cada contorno engorda distinto (la cintura más que la muñeca).
// Es una ESTIMACIÓN (± 3–5 cm en los contornos): para que la prenda caiga como en la persona, se ponen sus medidas con la cinta.
const EXP = { pecho: 0.95, bajoPecho: 0.95, cintura: 1.35, cadera: 1.0, cuello: 0.75, biceps: 1.2, muneca: 0.5, muslo: 1.1, rodilla: 0.75, gemelo: 0.85, tobillo: 0.5, hombros: 0.3 };
export function estimaPorPeso({ sexo = 'mujer', altura, peso }) {
  const B = base(sexo), H0 = B.altura, W0 = PESO_BASE[sexo === 'hombre' ? 'hombre' : 'mujer'], h = (altura || H0) / H0, w = (peso || W0) / W0, g = Math.sqrt(w / h);
  const out = { altura: altura || H0 };
  CAMPOS.forEach(([k]) => { if (k === 'altura') return; const v = B[k]; if (!v) { out[k] = 0; return; }
    if (k in EXP) out[k] = v * Math.pow(g, EXP[k]) * (k === 'hombros' ? Math.pow(h, 0.9) : k === 'muneca' || k === 'tobillo' || k === 'cuello' ? Math.pow(h, 0.3) : 1);
    else out[k] = v * h; // espalda, brazo, entrepierna
    out[k] = Math.round(out[k] * 2) / 2; });
  return out;
}
// el índice de masa corporal (para decir si el peso pedido es razonable)
export const imc = (altura, peso) => peso / Math.pow(altura / 100, 2);

// ---------- las piezas del cuerpo (funciones de distancia) ----------
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function dElipse(px, pz, a, b) { const u = px / a, v = pz / b, k0 = Math.sqrt(u * u + v * v), k1 = Math.sqrt((u / a) * (u / a) + (v / b) * (v / b)); return k1 < 1e-9 ? -Math.min(a, b) : k0 * (k0 - 1) / k1; }
function dElipsoide(px, py, pz, rx, ry, rz) { const u = px / rx, v = py / ry, w = pz / rz, k0 = Math.sqrt(u * u + v * v + w * w), k1 = Math.sqrt((u / rx) * (u / rx) + (v / ry) * (v / ry) + (w / rz) * (w / rz)); return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1; }
// cono redondo de A (radio r1) a B (radio r2) (Í. Quílez)
function conoR(A, B, r1, r2) {
  const ba = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], l2 = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2], rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  return (x, y, z) => {
    const pa0 = x - A[0], pa1 = y - A[1], pa2 = z - A[2], yy = pa0 * ba[0] + pa1 * ba[1] + pa2 * ba[2], zz = yy - l2;
    const q0 = pa0 * l2 - ba[0] * yy, q1 = pa1 * l2 - ba[1] * yy, q2 = pa2 * l2 - ba[2] * yy, x2 = q0 * q0 + q1 * q1 + q2 * q2, y2 = yy * yy * l2, z2 = zz * zz * l2, k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
  };
}
// interpolación suave y sin rebotes (Fritsch–Carlson) de las secciones del tronco
function monotona(X, Y) {
  const n = X.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((Y[i + 1] - Y[i]) / (X[i + 1] - X[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return x => { if (x <= X[0]) return Y[0]; if (x >= X[n - 1]) return Y[n - 1]; let i = 0; while (x > X[i + 1]) i++; const h = X[i + 1] - X[i], t = (x - X[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * Y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * Y[i + 1] + (t3 - t2) * h * m[i + 1]; };
}
// semiancho a de una elipse de contorno P con fondo/ancho = k (Ramanujan)
const semiancho = (P, k) => P / (Math.PI * (3 * (1 + k) - Math.sqrt((3 + k) * (1 + 3 * k))));

// ---------- CONSTRUIR el cuerpo ----------
// m = medidas en cm (las de CAMPOS) · o.sexo 'mujer' | 'hombre' · o.corr = correcciones de la calibración (las pone construye)
function arma(m, o, corr) {
  const mujer = o.sexo !== 'hombre', H = m.altura * 10, s = H / 1650, cm = v => v * 10, c = corr;
  // alturas
  const yC7 = 0.853 * H, yW = yC7 - cm(m.espalda), yS = yC7 - 0.03 * H, yA = yS - 0.075 * H, yB = yS - 0.098 * H, yUB = yB - 0.055 * H;
  const yCr = Math.min(cm(m.entrepierna), yW - 0.15 * H), yH = Math.max(yCr + 0.035 * H, yW - 0.11 * H), yHH = (yW + yH) / 2, yK = 0.285 * H, yAn = 0.045 * H;
  // contornos del tronco (mm) y su fondo/ancho
  const P = { B: cm(mujer ? (m.bajoPecho || m.pecho * 0.86) * 0.5 + m.pecho * 0.5 * 0.94 : m.pecho), UB: cm(mujer ? (m.bajoPecho || m.pecho * 0.86) : m.pecho * 0.97), W: cm(m.cintura), H: cm(m.cadera) };
  const K = mujer ? { A: 0.66, B: 0.70, UB: 0.72, W: 0.74, HH: 0.70, H: 0.68, Cr: 0.72 } : { A: 0.68, B: 0.72, UB: 0.74, W: 0.78, HH: 0.75, H: 0.72, Cr: 0.75 };
  const sec = (y, P0, k, cz, f = 1) => { const a = semiancho(P0, k) * f; return { y, a, b: a * k, c: cz }; };
  const aB = semiancho(P.B * c.B, K.B), rN = cm(m.cuello) / (2 * Math.PI), hS = cm(m.hombros) / 2 * 0.94;
  const rB = cm(m.biceps) / (2 * Math.PI) * c.bic, rW = cm(m.muneca) / (2 * Math.PI), rS = Math.max(rB * 1.05, 0.024 * H);
  const S = [
    Object.assign(sec(0, P.H * c.H * 0.34, 1.1, -2 * s), { y: yCr - 0.004 * H }), // la entrepierna: estrecha y redonda (los muslos ponen el volumen)
    sec(yCr + 0.016 * H, P.H * c.H * 0.72, K.Cr, -6 * s),
    sec(yCr + 0.032 * H, P.H * c.H * 0.93, K.H, -10 * s),
    sec(Math.max(yH, yCr + 0.045 * H), P.H * c.H, K.H, -12 * s),
    sec(yHH, (P.H * c.H + P.W * c.W) / 2 * 1.01, K.HH, -6 * s),
    sec(yW, P.W * c.W, K.W, 0),
    sec(mujer ? yUB : (yW + yB) / 2, mujer ? P.UB * c.UB : (P.W * c.W + P.B * c.B) / 2, K.UB, 4 * s),
    sec(yB, P.B * c.B, K.B, (mujer ? 4 : 8) * s),
    // por encima del pecho: el tórax sigue casi igual de hondo hasta las clavículas y luego se recoge hacia el cuello (trapecio)
    { y: yA, a: aB * 1.02, b: aB * K.B * 1.0, c: (mujer ? 3 : 6) * s },
    { y: yS - 0.035 * H, a: Math.max(aB * 0.99, hS - 34 * s), b: aB * K.B * 0.93, c: (mujer ? -2 : 0) * s },
    { y: yS - 0.008 * H, a: Math.max(aB * 0.8, hS - rS * 0.9), b: aB * K.B * 0.72, c: -8 * s },
    { y: yS + 0.013 * H, a: rN * 1.9, b: aB * K.B * 0.5, c: -16 * s },
    { y: yS + 0.03 * H, a: rN * 1.15, b: rN * 1.1, c: -18 * s },
  ];
  const Y = S.map(q => q.y), fa = monotona(Y, S.map(q => q.a)), fb = monotona(Y, S.map(q => q.b)), fc = monotona(Y, S.map(q => q.c));
  const y0 = Y[0], y1 = Y[Y.length - 1], N = Math.ceil(y1 - y0) + 1, TA = new Float32Array(N), TB = new Float32Array(N), TC = new Float32Array(N), DA = new Float32Array(N), DB = new Float32Array(N);
  for (let i = 0; i < N; i++) { TA[i] = fa(y0 + i); TB[i] = fb(y0 + i); TC[i] = fc(y0 + i); }
  for (let i = 0; i < N; i++) { const i0 = Math.max(0, i - 3), i1 = Math.min(N - 1, i + 3); DA[i] = (TA[i1] - TA[i0]) / (i1 - i0); DB[i] = (TB[i1] - TB[i0]) / (i1 - i0); }
  const tronco = (x, y, z) => {
    // (las secciones están tabuladas cada mm y se interpolan: la superficie sale continua y sin escalones)
    const yy = Math.min(y1, Math.max(y0, y)) - y0, i = Math.min(N - 2, Math.floor(yy)), f = yy - i, g1 = 1 - f;
    const a = TA[i] * g1 + TA[i + 1] * f, b = TB[i] * g1 + TB[i + 1] * f, px = x, pz = z - (TC[i] * g1 + TC[i + 1] * f), da = DA[i] * g1 + DA[i + 1] * f, db = DB[i] * g1 + DB[i + 1] * f;
    let d2 = dElipse(px, pz, a, b); const u = (px / a) ** 2, v = (pz / b) ** 2, w = u + v || 1, sl = (Math.abs(da) * u + Math.abs(db) * v) / w; d2 /= Math.sqrt(1 + sl * sl);
    const dy = Math.max(y0 - y, y - y1); return Math.min(Math.max(d2, dy), 0) + Math.hypot(Math.max(d2, 0), Math.max(dy, 0));
  };
  // cuello y cabeza
  const cuello = conoR([0, yS - 0.02 * H, -18 * s], [0, 0.905 * H, -8 * s], rN * 1.04, rN * 0.96);
  const cab = { c: [0, H - 0.066 * H, 6 * s], r: [0.047 * H, 0.066 * H, 0.058 * H] };
  const cabeza = (x, y, z) => dElipsoide(x - cab.c[0], y - cab.c[1], z - cab.c[2], cab.r[0], cab.r[1], cab.r[2]);
  // hombros (trapecio) y brazos en postura A
  const al = 38 * Math.PI / 180, Lb = cm(m.brazo);
  const brazos = [1, -1].map(sg => {
    const A = [sg * (hS - rS * 0.55), yS - rS * 0.62, -10 * s], d = [sg * Math.sin(al), -Math.cos(al), 0.06], dl = Math.hypot(...d); d.forEach((v, i) => { d[i] = v / dl; });
    const J = A, E = [J[0] + d[0] * Lb * 0.52, J[1] + d[1] * Lb * 0.52, J[2] + d[2] * Lb * 0.52 + 6 * s], W = [E[0] + d[0] * Lb * 0.46, E[1] + d[1] * Lb * 0.46, E[2] + d[2] * Lb * 0.46 + 14 * s];
    const M = [W[0] + d[0] * 0.105 * H, W[1] + d[1] * 0.105 * H, W[2] + d[2] * 0.105 * H + 6 * s];
    return { sg, J, E, W, M, d, f: [conoR([sg * rN * 0.6, yS + 0.012 * H, -22 * s], [J[0], J[1] + rS * 0.25, J[2]], rS * 1.02, rS), conoR(J, E, rS * 1.0, rB * 0.84), conoR(E, W, rB * 0.84, rW * 0.98), conoR(W, M, rW * 0.98, rW * 0.62)] };
  });
  // piernas
  const rM = cm(m.muslo) / (2 * Math.PI) * c.mus, rK = cm(m.rodilla) / (2 * Math.PI), rG = cm(m.gemelo) / (2 * Math.PI), rT = cm(m.tobillo) / (2 * Math.PI), sep = (mujer ? 0.054 : 0.052) * H * Math.max(0.9, Math.min(1.25, cm(m.cadera) / (mujer ? 960 : 1000))), be = 3.2 * Math.PI / 180;
  const piernas = [1, -1].map(sg => {
    const Hj = [sg * sep, yCr + 0.055 * H, -6 * s], t = y => [sg * (sep + (Hj[1] - y) * Math.tan(be)), y, -6 * s + (Hj[1] - y) * 0.012];
    const Mu = t(yCr - 0.03 * H), Ki = t(yK), Ca = t(yK - 0.32 * (yK - yAn)), An = t(yAn), Pie = [An[0] + sg * 6 * s, 0.03 * H, An[2] + 0.13 * H];
    return { sg, Hj, Ki, An, f: [conoR(Hj, Mu, rM * 1.12, rM), conoR(Mu, Ki, rM, rK * 0.97), conoR(Ki, Ca, rK * 0.97, rG), conoR(Ca, An, rG, rT * 0.98), conoR([An[0], yAn * 0.75, An[2] - 0.022 * H], Pie, rT * 1.05, 0.016 * H)] };
  });
  // pecho y glúteos
  const extra = [];
  if (mujer) { const cup = 0.044 * H * c.cup, bx = 0.052 * H, bz = TC[Math.round(Math.min(y1, yB) - y0)] + TB[Math.round(Math.min(y1, yB) - y0)] * 0.42;
    [1, -1].forEach(sg => extra.push({ k: 22 * s, f: (x, y, z) => dElipsoide(x - sg * bx, y - (yB + 0.004 * H), z - bz, cup * 0.98, cup * 0.92, cup * 0.82) })); }
  { const gz = TC[Math.round(yH - y0)] - TB[Math.round(yH - y0)] * 0.38, gx = 0.042 * H, gr = (mujer ? 0.05 : 0.044) * H * c.glu;
    [1, -1].forEach(sg => extra.push({ k: 30 * s, f: (x, y, z) => dElipsoide(x - sg * gx, y - (yH + 0.012 * H), z - gz, gr * 0.95, gr * 1.1, gr * 0.75) })); }
  // la unión suave de todo (con «cajas» para no calcular lo que está lejos)
  const P3 = [];
  const caja = (pts, r) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; pts.forEach(p => p.forEach((v, i) => { lo[i] = Math.min(lo[i], v - r); hi[i] = Math.max(hi[i], v + r); })); return { lo, hi }; };
  const amax = Math.max(...S.map(q => q.a)), bmax = Math.max(...S.map(q => Math.abs(q.c) + q.b));
  P3.push({ f: tronco, k: 0, ...caja([[0, y0, 0], [0, y1, 0]], Math.max(amax, bmax) + 5) });
  P3.push({ f: cuello, k: 26 * s, ...caja([[0, yS - 0.02 * H, -18 * s], [0, 0.905 * H, -8 * s]], rN * 1.1 + 5) });
  P3.push({ f: cabeza, k: 28 * s, ...caja([cab.c], Math.max(...cab.r) + 5) });
  brazos.forEach(B => { P3.push({ f: B.f[0], k: 30 * s, ...caja([[B.sg * rN * 0.6, yS + 0.012 * H, -22 * s], B.J], rS * 1.05 + 5) }); P3.push({ f: B.f[1], k: 24 * s, ...caja([B.J, B.E], rS + 5) }); P3.push({ f: B.f[2], k: 3 * s, ...caja([B.E, B.W], rB + 5) }); P3.push({ f: B.f[3], k: 3 * s, ...caja([B.W, B.M], rW * 1.1 + 5) }); });
  piernas.forEach(L => { const Mu = [L.Hj[0], yCr - 0.03 * H, L.Hj[2]]; P3.push({ f: L.f[0], k: 46 * s, ...caja([L.Hj, Mu], rM * 1.15 + 5) }); P3.push({ f: L.f[1], k: 3 * s, ...caja([Mu, L.Ki], rM + 5) }); P3.push({ f: L.f[2], k: 3 * s, ...caja([L.Ki, [L.Ki[0], yK - 0.32 * (yK - yAn), L.Ki[2]]], rG + 5) }); P3.push({ f: L.f[3], k: 3 * s, ...caja([[L.An[0], yK - 0.32 * (yK - yAn), L.An[2]], L.An], rG + 5) });
    P3.push({ f: L.f[4], k: 16 * s, ...caja([[L.An[0], yAn * 0.75, L.An[2] - 0.022 * H], [L.An[0] + L.sg * 6 * s, 0.03 * H, L.An[2] + 0.13 * H]], 0.03 * H) }); });
  extra.forEach(e => P3.push({ f: e.f, k: e.k, lo: [-0.2 * H, 0, -0.25 * H], hi: [0.2 * H, H, 0.25 * H] }));
  const sdf = (x, y, z) => {
    let d = 1e9;
    for (let i = 0; i < P3.length; i++) { const p = P3[i], lim = d + p.k; if (lim < 0) continue;
      const ex = x < p.lo[0] ? p.lo[0] - x : x > p.hi[0] ? x - p.hi[0] : 0, ey = y < p.lo[1] ? p.lo[1] - y : y > p.hi[1] ? y - p.hi[1] : 0, ez = z < p.lo[2] ? p.lo[2] - z : z > p.hi[2] ? z - p.hi[2] : 0;
      if (ex * ex + ey * ey + ez * ez > lim * lim) continue; const v = p.f(x, y, z); d = p.k ? smin(d, v, p.k) : Math.min(d, v); }
    return Math.max(d, -y); // los pies, planos en el suelo
  };
  const niveles = { cabeza: H, c7: yC7, hombro: yS, axila: yA, pecho: yB, bajoPecho: yUB, cintura: yW, caderaAlta: yHH, cadera: yH, entrepierna: yCr, rodilla: yK, tobillo: yAn };
  const secc = y => { const yy = Math.min(y1, Math.max(y0, y)) - y0, i = Math.min(N - 2, Math.floor(yy)), f = yy - i; return { a: TA[i] + (TA[i + 1] - TA[i]) * f, b: TB[i] + (TB[i + 1] - TB[i]) * f, c: TC[i] + (TC[i + 1] - TC[i]) * f }; };
  return { H, s, sexo: mujer ? 'mujer' : 'hombre', niveles, sdf, secc, brazos, piernas, rN, hS, rB, rW, rM, rS, cabeza: cab,
    puntos: { cuelloI: [rN * 0.92, yS + 0.012 * H, -10 * s], cuelloD: [-rN * 0.92, yS + 0.012 * H, -10 * s], hombroI: [hS, yS, -10 * s], hombroD: [-hS, yS, -10 * s] } };
}

// ---------- MEDIR el cuerpo como una cinta (contorno por fuera de un corte horizontal) ----------
// Se corta a la altura y, se queda la mancha que contiene la «semilla» (para no sumar los brazos) y se mide su envolvente convexa.
export function contornoEn(sdf, y, semilla, radio, paso = 3, xMin = -Infinity) {
  const n = Math.ceil(2 * radio / paso) + 1, x0 = semilla[0] - radio, z0 = semilla[1] - radio, D = new Float32Array(n * n), dentro = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = x0 + i * paso; D[j * n + i] = x < xMin ? 1 : sdf(x, y, z0 + j * paso); } // xMin: solo una pierna (la cinta pasa entre los muslos aunque se toquen)
  let si = Math.round((semilla[0] - x0) / paso), sj = Math.round((semilla[1] - z0) / paso);
  if (!(D[sj * n + si] < 0)) { let mejor = null; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (D[j * n + i] < 0) { const dd = (i - si) ** 2 + (j - sj) ** 2; if (!mejor || dd < mejor[0]) mejor = [dd, i, j]; } if (!mejor) return 0; si = mejor[1]; sj = mejor[2]; }
  const pila = [sj * n + si]; dentro[sj * n + si] = 1;
  while (pila.length) { const q = pila.pop(), i = q % n, j = (q - i) / n; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= n || b >= n) return; const r = b * n + a; if (!dentro[r] && D[r] < 0) { dentro[r] = 1; pila.push(r); } }); }
  const pts = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const q = j * n + i; if (!dentro[q]) continue;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= n || b >= n) return; const r = b * n + a; if (dentro[r]) return; const t = D[q] / (D[q] - D[r]); pts.push([x0 + (i + di * t) * paso, z0 + (j + dj * t) * paso]); }); }
  return perimetroEnvolvente(pts);
}
function perimetroEnvolvente(P) {
  if (P.length < 3) return 0; P.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  P.forEach(p => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const H = lo.slice(0, -1).concat(up.slice(0, -1)); let s = 0; for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length]; s += Math.hypot(a[0] - b[0], a[1] - b[1]); } return s;
}
// lo que mide el cuerpo armado (en cm)
export function mide(C) {
  const N = C.niveles, out = {}, en = (k, y) => { const q = C.secc(y); out[k] = contornoEn(C.sdf, y, [0, q.c], Math.max(q.a, q.b) * 1.35 + 40, 3) / 10; };
  en('pecho', N.pecho); if (C.sexo === 'mujer') en('bajoPecho', N.bajoPecho); en('cintura', N.cintura); en('cadera', N.cadera);
  const L = C.piernas[0], ym = N.entrepierna - 0.03 * C.H; out.muslo = contornoEn(C.sdf, ym, [L.Hj[0] + (L.Hj[1] - ym) * Math.tan(3.2 * Math.PI / 180), -6 * C.s], C.rM * 1.6 + 30, 2.5, 0) / 10;
  return out;
}

// ---------- el cuerpo A MEDIDA: se arma, se mide y se corrige hasta que da lo pedido ----------
export function construye(med, o = {}) {
  const sexo = o.sexo === 'hombre' ? 'hombre' : 'mujer', m = Object.assign(base(sexo), med || {}), corr = { B: 1, UB: 1, W: 1, H: 1, cup: 1, glu: 1, mus: 1, bic: 1 };
  compruebaMedidas(m, sexo);
  let C = arma(m, { sexo }, corr), M = mide(C), pasos = 0;
  const obj = { pecho: m.pecho, cintura: m.cintura, cadera: m.cadera, muslo: m.muslo }; if (sexo === 'mujer') obj.bajoPecho = m.bajoPecho || m.pecho * 0.86;
  // corrección por la SECANTE (cada medida con su mando): converge en 3–6 vueltas aunque los glúteos o los muslos también sumen
  const mandos = { cintura: 'W', cadera: 'H', muslo: 'mus' }; if (sexo === 'mujer') Object.assign(mandos, { bajoPecho: 'UB', pecho: 'cup' }); else mandos.pecho = 'B';
  const prev = {};
  for (; pasos < (o.pasos != null ? o.pasos : 10); pasos++) {
    const err = Object.keys(obj).map(k => Math.abs(M[k] - obj[k])); if (Math.max(...err) < 0.2) break;
    Object.entries(mandos).forEach(([k, c]) => { const x = corr[c], y = M[k] - obj[k]; let nx;
      const P = prev[k]; if (P && Math.abs(x - P.x) > 1e-4 && Math.abs(y - P.y) > 1e-4) { const sl = (y - P.y) / (x - P.x); nx = sl > 0 ? x - y / sl : x * Math.pow(obj[k] / M[k], k === 'pecho' && sexo === 'mujer' ? 3 : 1.2); }
      else nx = x * Math.pow(obj[k] / M[k], k === 'pecho' && sexo === 'mujer' ? 3 : 1.2);
      prev[k] = { x, y }; corr[c] = Math.max(x * 0.6, Math.min(x * 1.6, nx)); });
    corr.cup = Math.max(0.3, Math.min(2.4, corr.cup));
    C = arma(m, { sexo }, corr); M = mide(C);
  }
  C.med = m; C.medido = M; C.objetivo = obj; C.corr = corr; C.pasos = pasos;
  C.desvio = Math.max(...Object.keys(obj).map(k => Math.abs(M[k] - obj[k])));
  return C;
}
export function compruebaMedidas(m, sexo) {
  const mal = t => { const e = new Error(t); e.drew = 1; throw e; };
  if (!(m.altura >= 120 && m.altura <= 215)) mal('La altura tiene que estar entre 120 y 215 cm.');
  [['pecho', 60, 170], ['cintura', 45, 170], ['cadera', 60, 180], ['cuello', 25, 60], ['hombros', 28, 65], ['espalda', 30, 60], ['brazo', 40, 80], ['biceps', 18, 55], ['muneca', 12, 25], ['entrepierna', 55, 100], ['muslo', 35, 90], ['rodilla', 25, 60], ['gemelo', 25, 55], ['tobillo', 16, 35]].forEach(([k, a, b]) => {
    if (!(m[k] >= a && m[k] <= b)) mal('«' + (CAMPOS.find(c => c[0] === k) || [k, k])[1] + '» = ' + m[k] + ' cm: fuera de lo posible (' + a + '–' + b + ' cm).'); });
  if (sexo === 'mujer' && m.bajoPecho && !(m.bajoPecho < m.pecho)) mal('El bajo pecho tiene que ser menor que el pecho.');
  if (m.cintura > m.cadera * 1.35) mal('La cintura es mucho mayor que la cadera: revisa las medidas.');
}

// ---------- la REJILLA de distancias (para la tela) ----------
export function rejilla(C, paso = 8) {
  const H = C.H, ax = Math.max(...C.brazos.map(b => Math.abs(b.M[0]))) + 0.06 * H, x0 = -ax, y0 = -paso * 2, z0 = -0.2 * H, nx = Math.ceil(2 * ax / paso) + 1, ny = Math.ceil((H + 4 * paso) / paso) + 1, nz = Math.ceil(0.42 * H / paso) + 1;
  const d = new Float32Array(nx * ny * nz), TOPE = 80, G = 4, gx = Math.ceil((nx - 1) / G) + 1, gy = Math.ceil((ny - 1) / G) + 1, gz = Math.ceil((nz - 1) / G) + 1, g = new Float32Array(gx * gy * gz);
  // primero una rejilla gruesa (cada 4 pasos); luego, fino SOLO donde la piel está cerca (lejos basta con «lejos»)
  for (let k = 0; k < gz; k++) for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) g[(k * gy + j) * gx + i] = C.sdf(x0 + i * G * paso, y0 + j * G * paso, z0 + k * G * paso);
  const lejos = G * paso * 0.9 + 4;
  for (let k = 0; k < nz; k++) { const K = Math.min(gz - 2, Math.floor(k / G)), w = k / G - K;
    for (let j = 0; j < ny; j++) { const J = Math.min(gy - 2, Math.floor(j / G)), v = j / G - J;
      for (let i = 0; i < nx; i++) { const I = Math.min(gx - 2, Math.floor(i / G)), u = i / G - I, b0 = (K * gy + J) * gx + I;
        const c = [g[b0], g[b0 + 1], g[b0 + gx], g[b0 + gx + 1], g[b0 + gx * gy], g[b0 + gx * gy + 1], g[b0 + gx * gy + gx], g[b0 + gx * gy + gx + 1]];
        let mn = c[0]; for (let q = 1; q < 8; q++) if (Math.abs(c[q]) < Math.abs(mn)) mn = c[q];
        let val;
        if (Math.abs(mn) > lejos && c.every(x => (x > 0) === (mn > 0))) { const a0 = c[0] + (c[1] - c[0]) * u, a1 = c[2] + (c[3] - c[2]) * u, a2 = c[4] + (c[5] - c[4]) * u, a3 = c[6] + (c[7] - c[6]) * u, b1 = a0 + (a1 - a0) * v, b2 = a2 + (a3 - a2) * v; val = b1 + (b2 - b1) * w; }
        else val = C.sdf(x0 + i * paso, y0 + j * paso, z0 + k * paso);
        d[(k * ny + j) * nx + i] = Math.min(TOPE, val); } } }
  return { x0, y0, z0, nx, ny, nz, paso, d, tope: TOPE };
}
// distancia y gradiente en un punto (trilineal) → out = [d, gx, gy, gz]; fuera de la rejilla, «lejos»
export function muestra(R, x, y, z, out) {
  const fx = (x - R.x0) / R.paso, fy = (y - R.y0) / R.paso, fz = (z - R.z0) / R.paso, i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
  if (i < 0 || j < 0 || k < 0 || i >= R.nx - 1 || j >= R.ny - 1 || k >= R.nz - 1) { out[0] = R.tope; out[1] = out[2] = out[3] = 0; return out; }
  const u = fx - i, v = fy - j, w = fz - k, nx = R.nx, nxy = R.nx * R.ny, b = (k * R.ny + j) * nx + i, D = R.d;
  const c000 = D[b], c100 = D[b + 1], c010 = D[b + nx], c110 = D[b + nx + 1], c001 = D[b + nxy], c101 = D[b + nxy + 1], c011 = D[b + nxy + nx], c111 = D[b + nxy + nx + 1];
  const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u, x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u, y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  out[0] = y0 + (y1 - y0) * w;
  const gx = ((c100 - c000) * (1 - v) + (c110 - c010) * v) * (1 - w) + ((c101 - c001) * (1 - v) + (c111 - c011) * v) * w;
  const gy = (x10 - x00) * (1 - w) + (x11 - x01) * w, gz = y1 - y0, l = Math.hypot(gx, gy, gz) || 1;
  out[1] = gx / l; out[2] = gy / l; out[3] = gz / l; return out;
}

// ---------- la MALLA que se ve («surface nets» sobre la rejilla, cada vértice llevado a la piel) ----------
export function malla(C, R) {
  const { nx, ny, nz, paso, x0, y0, z0, d } = R, at = (i, j, k) => d[(k * ny + j) * nx + i], idv = new Int32Array(nx * ny * nz).fill(-1), P = [], N = [];
  const g = (x, y, z) => { const e = 0.6, a = C.sdf(x + e, y, z) - C.sdf(x - e, y, z), b = C.sdf(x, y + e, z) - C.sdf(x, y - e, z), c = C.sdf(x, y, z + e) - C.sdf(x, y, z - e), l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; };
  const AR = [[0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 1, 0], [0, 0, 1, 1, 0, 1], [0, 1, 1, 1, 1, 1], [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0], [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const e of AR) { const a = at(i + e[0], j + e[1], k + e[2]), b = at(i + e[3], j + e[4], k + e[5]); if ((a < 0) === (b < 0)) continue; const t = a / (a - b); sx += e[0] + (e[3] - e[0]) * t; sy += e[1] + (e[4] - e[1]) * t; sz += e[2] + (e[5] - e[2]) * t; n++; }
    if (!n) continue;
    let x = x0 + (i + sx / n) * paso, y = y0 + (j + sy / n) * paso, z = z0 + (k + sz / n) * paso;
    for (let it = 0; it < 3; it++) { const dd = C.sdf(x, y, z); if (Math.abs(dd) < 0.05) break; const q = g(x, y, z); x -= q[0] * dd; y -= q[1] * dd; z -= q[2] * dd; }
    idv[(k * ny + j) * nx + i] = P.length / 3; P.push(x, y, z); N.push(...g(x, y, z));
  }
  const I = [], v = (i, j, k) => idv[(k * ny + j) * nx + i];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = at(i, j, k) < 0;
    if (a !== (at(i + 1, j, k) < 0)) quad(I, v(i, j - 1, k - 1), v(i, j, k - 1), v(i, j, k), v(i, j - 1, k), a);
    if (a !== (at(i, j + 1, k) < 0)) quad(I, v(i - 1, j, k - 1), v(i, j, k - 1), v(i, j, k), v(i - 1, j, k), !a);
    if (a !== (at(i, j, k + 1) < 0)) quad(I, v(i - 1, j - 1, k), v(i, j - 1, k), v(i, j, k), v(i - 1, j, k), a);
  }
  return { pos: new Float32Array(P), nor: new Float32Array(N), idx: new Uint32Array(I) };
}
function quad(I, a, b, c, d, inv) { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (inv) I.push(a, b, c, a, c, d); else I.push(a, c, b, a, d, c); }

// ---------- avatar por TALLA (de una tabla de tallas: lo que falta se saca a la proporción de la talla M) ----------
export function desdeTabla(sexo, v) {
  const B = base(sexo), out = Object.assign({}, B, v), r = k => (v[k] && B[k] ? v[k] / B[k] : 1);
  if (sexo !== 'hombre') out.bajoPecho = Math.round(B.bajoPecho * r('pecho') * 2) / 2; else out.bajoPecho = 0;
  out.muslo = Math.round(B.muslo * r('cadera') * 2) / 2; out.gemelo = Math.round(B.gemelo * Math.sqrt(r('rodilla') * r('cadera')) * 2) / 2; out.tobillo = Math.round(B.tobillo * Math.sqrt(r('rodilla')) * 2) / 2;
  if (!v.altura) out.altura = Math.round(B.altura * Math.sqrt(r('entrepierna') * r('espalda')));
  return out;
}
// las medidas del CUERPO que usan las tallas de las prendas (tallas.js), sacadas del avatar
export function cuerpoParaPrenda(med, niveles) {
  const c = Object.assign({}, med); c.tiro = niveles ? Math.round(((niveles.cintura - niveles.entrepierna) / 10 + 2) * 2) / 2 : 27; return c;
}
