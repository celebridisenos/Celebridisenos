// ================= 👗 CelebriDREW · la PIEZA hecha MALLA (para la tela 3D) =================
// Cada pieza del patrón (línea de COSTURA, sin márgenes: lo que se ve de la prenda cosida) se convierte en una malla de triángulos casi
// iguales (lado ≈ h). El contorno se reparte por CADENAS: cada borde con nombre, cada pata de pinza y lo que no se cose; cada cadena
// tiene sus puntos a la misma distancia, y su número lo deciden las costuras (las dos orillas de una costura llevan los MISMOS puntos,
// así se cosen punto con punto, también cuando una mide distinto, como el cuello de punto que se estira).
//   · Pieza al DOBLEZ → la pieza ENTERA (la mitad y su espejo; las cadenas del espejo llevan «|m»).
//   · Tiras que se DOBLAN a lo largo (cuello, puños, cinturillas: «Se dobla aquí») → solo la mitad que se ve (hasta el doblez).
// Delaunay (Bowyer–Watson) de los puntos del contorno y de una red hexagonal por dentro; se quitan los triángulos de fuera y se
// comprueba que cada tramo del contorno es un lado de la malla (si no, se dice: la tela saldría rota por ahí).
import * as G from './geom.js';
import * as Z from './pieza.js';

// ---------- las cadenas del contorno (polilíneas densas, en el sentido del contorno) ----------
export function cadenas(pz, tol = 0.3) {
  const out = [];
  pz.contorno.forEach(t => {
    const z = Z.pinzaDe(pz, t.id), B = Z.bordeDeTramo(pz, t.id);
    const key = z ? 'p:' + z.id + ':' + z.tramos.indexOf(t.id) : B ? 'b:' + B.id : 'x:' + t.id, g = Z.tramoGeo(pz, t), L = G.cadenaAplana([g], tol);
    const u = out[out.length - 1]; if (u && u.key === key) u.pts.push(...L.slice(1)); else out.push({ key, borde: B && !z ? B.id : null, pinza: z ? z.id : null, pata: z ? z.tramos.indexOf(t.id) : null, tipo: z ? 'pinza' : B ? B.tipo : 'suelto', pts: L });
  });
  if (out.length > 1 && out[0].key === out[out.length - 1].key) { const z = out.pop(); out[0].pts = z.pts.concat(out[0].pts.slice(1)); }
  return out;
}
// la línea de «Se dobla aquí» (horizontal) de las tiras que se doblan a lo largo
export function lineaDoblez(pz) { const i = pz.internas.find(q => q.tipo === 'linea' && /dobla/i.test(q.n || '') && q.pts.length === 2 && Math.abs(q.pts[0][1] - q.pts[1][1]) < 0.5); return i ? i.pts[0][1] : null; }
// cortar las cadenas por y ≤ yf (lo de arriba se dobla hacia dentro y no se ve); el corte es la nueva cadena «pliegue»
function cortaPorDoblez(C, yf) {
  const seg = []; C.forEach(c => { for (let i = 1; i < c.pts.length; i++) seg.push({ a: c.pts[i - 1], b: c.pts[i], c }); });
  const out = [], pon = (c, p) => { const u = out[out.length - 1]; if (u && u.c === c) { if (G.dist(u.pts[u.pts.length - 1], p) > 1e-6) u.pts.push(p); } else out.push({ c, pts: [p] }); };
  const plie = { key: 'b:__pliegue', borde: '__pliegue', tipo: 'abierto', pts: [] };
  seg.forEach(s => { const ia = s.a[1] <= yf + 1e-6, ib = s.b[1] <= yf + 1e-6;
    if (ia && ib) { pon(s.c, s.a); pon(s.c, s.b); }
    else if (ia && !ib) { const t = (yf - s.a[1]) / (s.b[1] - s.a[1]), x = G.lerp(s.a, s.b, t); pon(s.c, s.a); pon(s.c, x); pon(plie, x); }
    else if (!ia && ib) { const t = (yf - s.a[1]) / (s.b[1] - s.a[1]), x = G.lerp(s.a, s.b, t); pon(plie, x); pon(s.c, x); pon(s.c, s.b); } });
  // juntar los trozos de la misma cadena que quedaron seguidos (y el primero con el último)
  const R = []; out.forEach(o => { const u = R[R.length - 1]; if (u && u.c === o.c) u.pts.push(...o.pts.slice(1)); else R.push({ c: o.c, pts: o.pts }); });
  if (R.length > 1 && R[0].c === R[R.length - 1].c) { const z = R.pop(); R[0].pts = z.pts.concat(R[0].pts.slice(1)); }
  return R.filter(o => o.pts.length > 1 && G.polilineaLargo(o.pts) > 0.5).map(o => Object.assign({}, o.c, { pts: o.pts }));
}
// la pieza ENTERA (si va al doblez): las cadenas de la mitad, sin el doblez, y luego su espejo al revés
function enteraCadenas(C, F) {
  const i = C.findIndex(c => c.borde === F); if (i < 0) return { C, eje: null };
  const L = C[i].pts, a = L[0], b = L[L.length - 1], d = G.norma(G.sub(b, a)), refl = p => { const v = G.sub(p, a), k = G.punto(v, d); return G.suma(a, G.sub(G.esc(d, 2 * k), v)); };
  const resto = []; for (let k = 1; k < C.length; k++) resto.push(C[(i + k) % C.length]);
  const esp = resto.slice().reverse().map(c => Object.assign({}, c, { key: c.key + '|m', espejo: true, pts: c.pts.slice().reverse().map(refl) }));
  return { C: resto.concat(esp), eje: { a, b, refl } };
}
// todas las cadenas con las que se hace la malla de la pieza (y lo que se ha hecho: doblez, pliegue)
export function contornoMalla(pz) {
  let C = cadenas(pz), yf = lineaDoblez(pz), eje = null;
  if (yf != null) C = cortaPorDoblez(C, yf);
  if (pz.corte.doblez) { const r = enteraCadenas(C, pz.corte.doblez); C = r.C; eje = r.eje; }
  return { C, yf, eje };
}
// reparto en n tramos iguales (n+1 puntos)
export function reparte(L, n) {
  const T = G.polilineaLargo(L), out = [L[0]]; let i = 0, acc = 0;
  for (let k = 1; k < n; k++) { const s = T * k / n; while (i < L.length - 2 && acc + G.dist(L[i], L[i + 1]) < s) { acc += G.dist(L[i], L[i + 1]); i++; } const l = G.dist(L[i], L[i + 1]) || 1; out.push(G.lerp(L[i], L[i + 1], Math.min(1, (s - acc) / l))); }
  out.push(L[L.length - 1]); return out;
}

// ---------- Delaunay (Bowyer–Watson) ----------
function delaunay(P) {
  const n = P.length; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; P.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
  const dm = Math.max(x1 - x0, y1 - y0) * 20, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, V = P.concat([[cx - dm, cy - dm], [cx + dm, cy - dm], [cx, cy + dm]]);
  let T = [mkT(V, n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    const p = V[i], malos = [], buenos = [];
    for (const t of T) { const dx = p[0] - t.cx, dy = p[1] - t.cy; (dx * dx + dy * dy < t.r2 * (1 + 1e-9) ? malos : buenos).push(t); }
    const bordes = new Map(); malos.forEach(t => [[t.a, t.b], [t.b, t.c], [t.c, t.a]].forEach(([u, v]) => { const k = u < v ? u + ',' + v : v + ',' + u; bordes.set(k, bordes.has(k) ? null : [u, v]); }));
    T = buenos; bordes.forEach(e => { if (e) T.push(mkT(V, e[0], e[1], i)); });
  }
  return T.filter(t => t.a < n && t.b < n && t.c < n).map(t => [t.a, t.b, t.c]);
}
function mkT(V, a, b, c) {
  const A = V[a], B = V[b], C = V[c], d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1])) || 1e-12;
  const a2 = A[0] * A[0] + A[1] * A[1], b2 = B[0] * B[0] + B[1] * B[1], c2 = C[0] * C[0] + C[1] * C[1];
  const cx = (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d, cy = (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d;
  return { a, b, c, cx, cy, r2: (A[0] - cx) ** 2 + (A[1] - cy) ** 2 };
}

// ---------- la MALLA de un contorno de cadenas ----------
// C = cadenas (con .n = número de tramos de cada una) · h = lado de los triángulos (mm)
export function mallaDe(C, h) {
  const B = [], marca = []; // puntos del contorno y, para cada cadena, sus índices (n+1, el último es el primero de la siguiente)
  C.forEach((c, k) => { const R = reparte(c.pts, c.n); c.idx = []; R.forEach((p, j) => { if (j === R.length - 1) return; c.idx.push(B.length); B.push(p); marca.push(k); }); });
  C.forEach((c, k) => c.idx.push(C[(k + 1) % C.length].idx[0]));
  const nb = B.length, caja = G.caja(B), dentro = [], fila = h * Math.sqrt(3) / 2, lejos = 0.62 * h;
  for (let j = 0, y = caja.y0 + fila / 2; y < caja.y1; j++, y += fila) for (let x = caja.x0 + (j % 2 ? h / 2 : 0) + h / 4; x < caja.x1; x += h) {
    const p = [x, y]; if (!G.dentro(p, B)) continue; if (G.distAPolilinea(p, B, true).d < lejos) continue; dentro.push(p); }
  // si un tramo del contorno no sale en la malla es que un punto de dentro le «pisa» el círculo: se quitan esos puntos y se repite
  let P, T, faltan = 0;
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    P = B.concat(dentro); T = triangula(P, B, nb);
    const lados = new Set(); T.forEach(([a, b, c]) => [[a, b], [b, c], [c, a]].forEach(([i, j]) => lados.add(Math.min(i, j) + ',' + Math.max(i, j))));
    const malos = []; for (let i = 0; i < nb; i++) { const j = (i + 1) % nb; if (!lados.has(Math.min(i, j) + ',' + Math.max(i, j))) malos.push([i, j]); }
    faltan = malos.length; if (!faltan) break;
    const quita = new Set(); malos.forEach(([i, j]) => { const m = G.lerp(B[i], B[j], 0.5), r = G.dist(B[i], B[j]) * 0.75 + 0.3 * h; dentro.forEach((p, k) => { if (G.dist(p, m) < r) quita.add(k); }); });
    if (!quita.size) break; const d2 = dentro.filter((p, k) => !quita.has(k)); dentro.length = 0; dentro.push(...d2);
  }
  return { P, T, nb, faltan, C };
}
function triangula(P, B, nb) {
  let T = delaunay(P);
  // fuera los triángulos que se salen del contorno (por su centro y por el centro de sus lados que no son del contorno)
  const esBorde = (i, j) => i < nb && j < nb && ((j === (i + 1) % nb) || (i === (j + 1) % nb));
  T = T.filter(([a, b, c]) => { const m = [(P[a][0] + P[b][0] + P[c][0]) / 3, (P[a][1] + P[b][1] + P[c][1]) / 3]; if (!G.dentro(m, B)) return false;
    return [[a, b], [b, c], [c, a]].every(([i, j]) => esBorde(i, j) || G.dentro(G.lerp(P[i], P[j], 0.5), B)); });
  // a izquierdas (como el contorno)
  T = T.map(([a, b, c]) => (G.cruz(G.sub(P[b], P[a]), G.sub(P[c], P[a])) < 0 ? [a, c, b] : [a, b, c])).filter(([a, b, c]) => Math.abs(G.cruz(G.sub(P[b], P[a]), G.sub(P[c], P[a]))) > 1e-6);
  return T;
}
