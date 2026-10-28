// ================= 👗 CelebriDREW · MOTOR GEOMÉTRICO 2D (patronaje) =================
// Todo en MILÍMETROS, con la Y hacia arriba. Sin dependencias: lo usan el patrón, la validación, la exportación y las pruebas en node.
// Un TRAMO es una recta (a → b) o una curva de Bézier cúbica (a, c1, c2, b). Las longitudes de las curvas se calculan por cuadratura
// de Gauss-Legendre con subdivisión adaptativa (error < 0,001 mm en curvas de patronaje); los dibujos y las comprobaciones usan la
// curva aplanada con una tolerancia de 0,05 mm (la distancia máxima entre la curva y sus rectas).
export const TOL = 0.05;
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const suma = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const esc = (a, k) => [a[0] * k, a[1] * k];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const cruz = (a, b) => a[0] * b[1] - a[1] * b[0];
export const punto = (a, b) => a[0] * b[0] + a[1] * b[1];
export const norma = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
export const gira = (p, ang, o = [0, 0]) => { const c = Math.cos(ang), s = Math.sin(ang), x = p[0] - o[0], y = p[1] - o[1]; return [o[0] + x * c - y * s, o[1] + x * s + y * c]; };
export const espejoX = (p, x0 = 0) => [2 * x0 - p[0], p[1]];

// ---------- Bézier cúbica ----------
export function bez(a, c1, c2, b, t) { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]; }
export function bezD(a, c1, c2, b, t) { const u = 1 - t; return [3 * u * u * (c1[0] - a[0]) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (b[0] - c2[0]), 3 * u * u * (c1[1] - a[1]) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (b[1] - c2[1])]; }
// partir en t: [mitad 1, mitad 2] (De Casteljau)
export function bezParte(a, c1, c2, b, t) { const p01 = lerp(a, c1, t), p12 = lerp(c1, c2, t), p23 = lerp(c2, b, t), p012 = lerp(p01, p12, t), p123 = lerp(p12, p23, t), m = lerp(p012, p123, t); return [[a, p01, p012, m], [m, p123, p23, b]]; }
const GL = [[-0.9739065285171717, 0.0666713443086881], [-0.8650633666889845, 0.1494513491505806], [-0.6794095682990244, 0.2190863625159820], [-0.4333953941292472, 0.2692667193099963], [-0.1488743389816312, 0.2955242247147529], [0.1488743389816312, 0.2955242247147529], [0.4333953941292472, 0.2692667193099963], [0.6794095682990244, 0.2190863625159820], [0.8650633666889845, 0.1494513491505806], [0.9739065285171717, 0.0666713443086881]];
function glLen(a, c1, c2, b, t0, t1) { let s = 0; const h = (t1 - t0) / 2, m = (t1 + t0) / 2; for (const [x, w] of GL) { const d = bezD(a, c1, c2, b, m + h * x); s += w * Math.hypot(d[0], d[1]); } return s * h; }
export function bezLargo(a, c1, c2, b, t0 = 0, t1 = 1, prof = 0) {
  const L = glLen(a, c1, c2, b, t0, t1), m = (t0 + t1) / 2, L2 = glLen(a, c1, c2, b, t0, m) + glLen(a, c1, c2, b, m, t1);
  if (Math.abs(L - L2) < 1e-6 || prof > 12) return L2;
  return bezLargo(a, c1, c2, b, t0, m, prof + 1) + bezLargo(a, c1, c2, b, m, t1, prof + 1);
}
// el t donde la curva lleva recorrida la distancia s (bisección sobre la longitud: exacto a 0,001 mm)
export function bezTEnLargo(a, c1, c2, b, s) { const L = bezLargo(a, c1, c2, b); if (s <= 0) return 0; if (s >= L) return 1; let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (bezLargo(a, c1, c2, b, 0, m) < s) lo = m; else hi = m; } return (lo + hi) / 2; }
// aplanar: puntos (sin el primero) con error < tol
export function bezAplana(a, c1, c2, b, tol = TOL, out = [], prof = 0) {
  // planitud: distancia de los controles a la cuerda
  const d = sub(b, a), l = Math.hypot(d[0], d[1]) || 1e-9, e1 = Math.abs(cruz(sub(c1, a), d)) / l, e2 = Math.abs(cruz(sub(c2, a), d)) / l;
  if ((Math.max(e1, e2) * 0.75 <= tol && l > 0) || prof > 16) { out.push(b); return out; }
  const [m1, m2] = bezParte(a, c1, c2, b, 0.5); bezAplana(m1[0], m1[1], m1[2], m1[3], tol, out, prof + 1); bezAplana(m2[0], m2[1], m2[2], m2[3], tol, out, prof + 1); return out;
}

// ---------- tramos ----------
// { a: [x,y], b: [x,y], c1?: [x,y], c2?: [x,y] } (sin c1/c2 = recta)
export const esCurva = t => !!(t.c1 && t.c2);
export const tramoLargo = t => (esCurva(t) ? bezLargo(t.a, t.c1, t.c2, t.b) : dist(t.a, t.b));
export const tramoPunto = (t, u) => (esCurva(t) ? bez(t.a, t.c1, t.c2, t.b, u) : lerp(t.a, t.b, u));
export const tramoTangente = (t, u) => norma(esCurva(t) ? bezD(t.a, t.c1, t.c2, t.b, u) : sub(t.b, t.a));
export const tramoAplana = (t, tol = TOL) => (esCurva(t) ? bezAplana(t.a, t.c1, t.c2, t.b, tol) : [t.b]);
export const tramoInverso = t => (esCurva(t) ? { a: t.b, c1: t.c2, c2: t.c1, b: t.a } : { a: t.b, b: t.a });
// el punto a la distancia s desde el principio del tramo
export function tramoEnLargo(t, s) { if (esCurva(t)) return bez(t.a, t.c1, t.c2, t.b, bezTEnLargo(t.a, t.c1, t.c2, t.b, s)); const L = dist(t.a, t.b) || 1; return lerp(t.a, t.b, Math.max(0, Math.min(1, s / L))); }
// partir un tramo en la distancia s: [antes, después]
export function tramoParte(t, s) { if (esCurva(t)) { const u = bezTEnLargo(t.a, t.c1, t.c2, t.b, s), [m1, m2] = bezParte(t.a, t.c1, t.c2, t.b, u); return [{ a: m1[0], c1: m1[1], c2: m1[2], b: m1[3] }, { a: m2[0], c1: m2[1], c2: m2[2], b: m2[3] }]; } const p = tramoEnLargo(t, s); return [{ a: t.a, b: p }, { a: p, b: t.b }]; }
// una cadena de tramos seguidos → polilínea (con el primer punto)
export function cadenaAplana(L, tol = TOL) { if (!L.length) return []; const out = [L[0].a]; L.forEach(t => tramoAplana(t, tol).forEach(p => out.push(p))); return out; }
export const cadenaLargo = L => L.reduce((s, t) => s + tramoLargo(t), 0);
export function cadenaEnLargo(L, s) { for (const t of L) { const l = tramoLargo(t); if (s <= l) return { p: tramoEnLargo(t, s), tg: tramoTangente(t, esCurva(t) ? bezTEnLargo(t.a, t.c1, t.c2, t.b, s) : (s / (l || 1))) }; s -= l; } const u = L[L.length - 1]; return { p: u.b, tg: tramoTangente(u, 1) }; }

// ---------- polígonos (cerrados: el último punto se une con el primero) ----------
export const area = P => { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return s / 2; };
export const perimetro = P => { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += dist(P[i], P[j]); return s; };
export const polilineaLargo = P => { let s = 0; for (let i = 1; i < P.length; i++) s += dist(P[i - 1], P[i]); return s; };
export const caja = P => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; P.forEach(([x, y]) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }); return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }; };
export const quitaDobles = (P, eps = 1e-6) => P.filter((p, i) => dist(p, P[(i + 1) % P.length]) > eps);
export function dentro(p, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
// cruce de dos segmentos (sin contar los extremos que se tocan): { t, u, p } o null
export function cruceSeg(a, b, c, d, eps = 1e-9) {
  const r = sub(b, a), s = sub(d, c), den = cruz(r, s); if (Math.abs(den) < eps) return null;
  const t = cruz(sub(c, a), s) / den, u = cruz(sub(c, a), r) / den;
  if (t > eps && t < 1 - eps && u > eps && u < 1 - eps) return { t, u, p: [a[0] + r[0] * t, a[1] + r[1] * t] };
  return null;
}
// AUTOINTERSECCIONES de un contorno cerrado (pares de segmentos no vecinos que se cruzan), con rejilla para no ser cuadrático
export function autocruces(P, max = 20) {
  const n = P.length, out = []; if (n < 4) return out;
  const B = caja(P), cel = Math.max(1, Math.sqrt(B.w * B.h / Math.max(1, n))), mapa = new Map(), clave = (i, j) => i + ',' + j;
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], i0 = Math.floor((Math.min(a[0], b[0]) - B.x0) / cel), i1 = Math.floor((Math.max(a[0], b[0]) - B.x0) / cel), j0 = Math.floor((Math.min(a[1], b[1]) - B.y0) / cel), j1 = Math.floor((Math.max(a[1], b[1]) - B.y0) / cel);
    for (let x = i0; x <= i1; x++) for (let y = j0; y <= j1; y++) { const k = clave(x, y); if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(i); } }
  const visto = new Set();
  for (const L of mapa.values()) for (let p = 0; p < L.length; p++) for (let q = p + 1; q < L.length; q++) {
    const i = Math.min(L[p], L[q]), j = Math.max(L[p], L[q]); if (j - i <= 1 || (i === 0 && j === n - 1)) continue; const k = i + '-' + j; if (visto.has(k)) continue; visto.add(k);
    const x = cruceSeg(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n]); if (x) { out.push({ i, j, p: x.p }); if (out.length >= max) return out; }
  }
  return out;
}
// Ramer–Douglas–Peucker (polilínea abierta)
export function simplifica(L, tol = 0.5) {
  if (L.length < 3) return L.slice();
  const d = (q, a, b) => { const ab = sub(b, a), l2 = punto(ab, ab) || 1e-12, t = Math.max(0, Math.min(1, punto(sub(q, a), ab) / l2)); return dist(q, [a[0] + ab[0] * t, a[1] + ab[1] * t]); };
  let im = 0, dm = 0; for (let i = 1; i < L.length - 1; i++) { const x = d(L[i], L[0], L[L.length - 1]); if (x > dm) { dm = x; im = i; } }
  if (dm <= tol) return [L[0], L[L.length - 1]];
  return simplifica(L.slice(0, im + 1), tol).slice(0, -1).concat(simplifica(L.slice(im), tol));
}

// ---------- DESFASE de una polilínea abierta (para los márgenes de costura): d > 0 = a la DERECHA del sentido de avance ----------
// Une los segmentos desplazados por su cruce (inglete); si la esquina es muy aguda, la corta (chaflán a 2·d).
export function desfasaPolilinea(L, d) {
  const n = L.length; if (n < 2 || !d) return L.map(p => p.slice());
  const nor = i => { const t = norma(sub(L[i + 1], L[i])); return [t[1], -t[0]]; }; // la normal a la derecha
  const segs = []; for (let i = 0; i < n - 1; i++) { if (dist(L[i], L[i + 1]) < 1e-9) continue; const m = nor(i); segs.push([suma(L[i], esc(m, d)), suma(L[i + 1], esc(m, d))]); }
  if (!segs.length) return L.map(p => p.slice());
  const out = [segs[0][0]];
  for (let i = 1; i < segs.length; i++) { const [a, b] = segs[i - 1], [c, e] = segs[i], x = cortaRectas(a, b, c, e);
    if (x && dist(x, b) < 2 * Math.abs(d) + 1e-6) out.push(x); else { out.push(b, c); } }
  out.push(segs[segs.length - 1][1]); return out;
}
// el cruce de las RECTAS (infinitas) a-b y c-d
export function cortaRectas(a, b, c, d) { const r = sub(b, a), s = sub(d, c), den = cruz(r, s); if (Math.abs(den) < 1e-12) return null; const t = cruz(sub(c, a), s) / den; return [a[0] + r[0] * t, a[1] + r[1] * t]; }
// distancia de un punto a una polilínea (y dónde)
export function distAPolilinea(p, L, cerrada = false) { let m = Infinity, mp = null; const n = L.length, k = cerrada ? n : n - 1; for (let i = 0; i < k; i++) { const a = L[i], b = L[(i + 1) % n], ab = sub(b, a), l2 = punto(ab, ab) || 1e-12, t = Math.max(0, Math.min(1, punto(sub(p, a), ab) / l2)), q = [a[0] + ab[0] * t, a[1] + ab[1] * t], x = dist(p, q); if (x < m) { m = x; mp = q; } } return { d: m, p: mp }; }
// remuestrear una polilínea en n+1 puntos iguales a lo largo
export function remuestrea(L, n) { const T = polilineaLargo(L), out = [L[0]]; let i = 0, acc = 0; for (let k = 1; k < n; k++) { const s = T * k / n; while (i < L.length - 2 && acc + dist(L[i], L[i + 1]) < s) { acc += dist(L[i], L[i + 1]); i++; } const l = dist(L[i], L[i + 1]) || 1; out.push(lerp(L[i], L[i + 1], Math.max(0, Math.min(1, (s - acc) / l)))); } out.push(L[L.length - 1]); return out; }
// números para personas: mm → «12,5» cm
export const cm = (mm, dec = 1) => { const k = 10 ** dec; return (Math.round(mm / 10 * k) / k).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: dec }); };
export const r2 = x => Math.round(x * 100) / 100;
