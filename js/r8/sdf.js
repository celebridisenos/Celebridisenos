// ================= v30.3 · ESCULPIR CON FORMAS QUE SE FUNDEN (campos de distancia, «SDF») =================
// Para las figuras de decoración que la dueña pidió con fotos (11-10-2026): figuras abstractas lisas, cisnes, la cesta con lazo,
// siluetas de gatos o del árbol con columpio. Cada forma es una función p → «cuánto estoy DENTRO» (mm; positivo dentro, negativo
// fuera), y se combinan con uniones SUAVES (se funden como arcilla). Al final Manifold saca la malla cerrada (levelSet).
// Las siluetas (2D) se esculpen igual en una losa fina y se cortan por la mitad: sale un contorno suave, sin escalones.
// Todo es nuestro (geometría hecha aquí, sin modelos de nadie).
import * as N from './nucleo.js';

// Math.hypot es MUY lenta en el navegador (se llama millones de veces): la cuenta directa va varias veces más rápido
const hyp = (a, b, c) => Math.sqrt(a * a + b * b + (c === undefined ? 0 : c * c));
// ---------- formas 3D (p = [x, y, z]) ----------
export const esfera = (c, r) => p => r - hyp(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
export function elipsoide(c, r) { // aproximación de Íñigo Quílez (buena cerca de la superficie, que es lo que importa)
  return p => { const x = p[0] - c[0], y = p[1] - c[1], z = p[2] - c[2], k0 = hyp(x / r[0], y / r[1], z / r[2]), k1 = hyp(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2])); return k1 < 1e-9 ? Math.min(...r) : -(k0 * (k0 - 1) / k1); };
}
// cápsula (o cono redondeado) de a a b, con radio ra en a y rb en b
export function capsula(a, b, ra, rb = ra) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], l2 = bx * bx + by * by + bz * bz || 1e-9;
  return p => { const px = p[0] - a[0], py = p[1] - a[1], pz = p[2] - a[2]; let t = (px * bx + py * by + pz * bz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t; return ra + (rb - ra) * t - hyp(px - bx * t, py - by * t, pz - bz * t); };
}
// rosquilla de radio R (al centro del tubo) y tubo r, tumbada (eje Z), centrada en c
export const toro = (c, R, r) => p => r - hyp(hyp(p[0] - c[0], p[1] - c[1]) - R, p[2] - c[2]);
// caja con las esquinas redondeadas (medio lado h = [hx, hy, hz], radio rr)
export const cajaR = (c, h, rr = 0) => p => { const qx = Math.abs(p[0] - c[0]) - h[0] + rr, qy = Math.abs(p[1] - c[1]) - h[1] + rr, qz = Math.abs(p[2] - c[2]) - h[2] + rr; return -(hyp(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rr); };
// un tubo que pasa por varios puntos (con su radio en cada uno), fundido en las uniones
export function tubo(P, R, k = 0) { const L = []; for (let i = 0; i < P.length - 1; i++) L.push(capsula(P[i], P[i + 1], Array.isArray(R) ? R[i] : R, Array.isArray(R) ? R[i + 1] : R)); return k ? unionS(k, ...L) : union(...L); }
// curva de Bézier cúbica (para cuellos, asas, colas…): n puntos
export function bezier(a, b, c, d, n = 16) { const L = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; L.push([0, 1, 2].map(k => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k])); } return L; }
// ---------- combinar ----------
export const union = (...F) => p => { let m = -Infinity; for (const f of F) { const v = f(p); if (v > m) m = v; } return m; };
export const interseccion = (...F) => p => { let m = Infinity; for (const f of F) { const v = f(p); if (v < m) m = v; } return m; };
export const resta = (a, b) => p => Math.min(a(p), -b(p));
const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
export const unionS = (k, ...F) => p => { let m = F[0](p); for (let i = 1; i < F.length; i++) m = smax(m, F[i](p), k); return m; };
export const restaS = (k, a, b) => p => -smax(-a(p), b(p), k);
// mover, girar (grados, en Z, Y y X), escalar y espejo (la figura de la derecha igual que la de la izquierda)
export const mueve = (f, d) => p => f([p[0] - d[0], p[1] - d[1], p[2] - d[2]]);
export function gira(f, az = 0, ay = 0, ax = 0) {
  const cz = Math.cos(-az * Math.PI / 180), sz = Math.sin(-az * Math.PI / 180), cy = Math.cos(-ay * Math.PI / 180), sy = Math.sin(-ay * Math.PI / 180), cx = Math.cos(-ax * Math.PI / 180), sx = Math.sin(-ax * Math.PI / 180);
  return p => { let x = p[0] * cz - p[1] * sz, y = p[0] * sz + p[1] * cz, z = p[2]; let x2 = x * cy + z * sy, z2 = -x * sy + z * cy; let y3 = y * cx - z2 * sx, z3 = y * sx + z2 * cx; return f([x2, y3, z3]); };
}
export const escala = (f, s) => p => f([p[0] / s, p[1] / s, p[2] / s]) * s;
export const espejoX = f => p => f([Math.abs(p[0]), p[1], p[2]]);
export const suelo = (f, z0 = 0) => p => Math.min(f(p), p[2] - z0); // corta todo lo que baja de z0 (base plana para la cama)
// ---------- formas 2D (p = [x, y]) para siluetas ----------
export const circulo2 = (c, r) => p => r - hyp(p[0] - c[0], p[1] - c[1]);
export function elipse2(c, rx, ry, ang = 0) { const ca = Math.cos(-ang * Math.PI / 180), sa = Math.sin(-ang * Math.PI / 180); return p => { const x0 = p[0] - c[0], y0 = p[1] - c[1], x = x0 * ca - y0 * sa, y = x0 * sa + y0 * ca, k0 = hyp(x / rx, y / ry), k1 = hyp(x / (rx * rx), y / (ry * ry)); return k1 < 1e-9 ? Math.min(rx, ry) : -(k0 * (k0 - 1) / k1); }; }
export function trazo2(a, b, ra, rb = ra) { const bx = b[0] - a[0], by = b[1] - a[1], l2 = bx * bx + by * by || 1e-9; return p => { const px = p[0] - a[0], py = p[1] - a[1]; let t = (px * bx + py * by) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t; return ra + (rb - ra) * t - hyp(px - bx * t, py - by * t); }; }
export function linea2(P, R, k = 0) { const L = []; for (let i = 0; i < P.length - 1; i++) L.push(trazo2(P[i], P[i + 1], Array.isArray(R) ? R[i] : R, Array.isArray(R) ? R[i + 1] : R)); return k ? unionS(k, ...L) : union(...L); }
export function bezier2(a, b, c, d, n = 14) { const L = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; L.push([0, 1].map(k => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k])); } return L; }
export function triangulo2(A, B, C) { // relleno (para orejas); positivo dentro
  const E = [[A, B], [B, C], [C, A]], s = Math.sign((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])) || 1;
  return p => { let d = Infinity, dentro = true; for (const [P1, P2] of E) { const ex = P2[0] - P1[0], ey = P2[1] - P1[1], px = p[0] - P1[0], py = p[1] - P1[1], l2 = ex * ex + ey * ey; let t = (px * ex + py * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t; d = Math.min(d, hyp(px - ex * t, py - ey * t)); if (s * (ex * py - ey * px) < 0) dentro = false; } return dentro ? d : -d; };
}
export const caja2 = (c, hx, hy, rr = 0) => p => { const qx = Math.abs(p[0] - c[0]) - hx + rr, qy = Math.abs(p[1] - c[1]) - hy + rr; return -(hyp(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr); };
export const mueve2 = (f, d) => p => f([p[0] - d[0], p[1] - d[1]]);
export const gira2 = (f, ang) => { const c = Math.cos(-ang * Math.PI / 180), s = Math.sin(-ang * Math.PI / 180); return p => f([p[0] * c - p[1] * s, p[0] * s + p[1] * c]); };
export const espejo2 = f => p => f([-p[0], p[1]]);
export const escala2 = (f, s) => p => f([p[0] / s, p[1] / s]) * s;
export const engorda = (f, d) => p => f(p) + d; // más gordo (+) o más fino (−)


// ---------- v30.4 · ESCULPIDOR PROPIO (tetraedros de Kuhn), capa a capa y en JavaScript ----------
// El levelSet de Manifold deja memoria del motor ocupada con rejillas grandes (con las esculturas acababa en 2 GB y todo fallaba).
// Este hace lo mismo con memoria normal (la libera el navegador) y de dos en dos capas: cada cubo de la rejilla se parte en 6
// tetraedros que comparten aristas, así la superficie sale SIEMPRE cerrada. Dentro = f > 0. Fuera de la caja cuenta como «fuera».
const KUHN = [[1, 2, 4], [1, 4, 2], [2, 1, 4], [2, 4, 1], [4, 1, 2], [4, 2, 1]]; // orden de los ejes (bits x=1, y=2, z=4)
export function tetraedros(f, min, max, h) {
  const nx = Math.max(2, Math.round((max[0] - min[0]) / h) + 1), ny = Math.max(2, Math.round((max[1] - min[1]) / h) + 1), nz = Math.max(2, Math.round((max[2] - min[2]) / h) + 1), nxy = nx * ny;
  const capa = k => { const L = new Float32Array(nxy), z = min[2] + k * h; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let v = (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) ? -1 : f([min[0] + i * h, min[1] + j * h, z]); if (!(v === v)) v = -1; L[j * nx + i] = v === 0 ? -1e-7 : v; } return L; };
  let V = new Float32Array(1 << 16), nv = 0, T = new Uint32Array(1 << 16), nt = 0;
  const pon = (x, y, z) => { if (nv * 3 + 3 > V.length) { const W = new Float32Array(V.length * 2); W.set(V); V = W; } V[nv * 3] = x; V[nv * 3 + 1] = y; V[nv * 3 + 2] = z; return nv++; };
  const tri = (a, b, c) => { if (nt * 3 + 3 > T.length) { const U = new Uint32Array(T.length * 2); U.set(T); T = U; } T[nt * 3] = a; T[nt * 3 + 1] = b; T[nt * 3 + 2] = c; nt++; };
  let A = capa(0), B = capa(1), MA = new Map(), MB = new Map();
  const val = (i, j, kk) => (kk ? B : A)[j * nx + i];
  // vértice sobre la arista que sale del punto (i, j, kk) en la dirección d (bits), compartido entre todos los cubos que la usan
  const arista = (i, j, kk, d, k) => { const M = kk ? MB : MA, key = (j * nx + i) * 8 + d; let id = M.get(key); if (id !== undefined) return id;
    const i2 = i + (d & 1), j2 = j + ((d >> 1) & 1), k2 = kk + ((d >> 2) & 1), fa = val(i, j, kk), fb = val(i2, j2, k2);
    const x0 = min[0] + i * h, y0 = min[1] + j * h, z0 = min[2] + (k + kk) * h, ex = (i2 - i) * h, ey = (j2 - j) * h, ez = (k2 - kk) * h;
    // la línea recta da un primer punto; dos pasos más (regula falsi con la forma de verdad) lo dejan SOBRE la superficie: sin rayas
    let a = 0, b = 1, va = fa, vb = fb, t = fa / (fa - fb);
    for (let it = 0; it < 2; it++) { const vt = f([x0 + t * ex, y0 + t * ey, z0 + t * ez]); if (!(vt === vt)) break; if ((vt > 0) === (va > 0)) { a = t; va = vt; } else { b = t; vb = vt; } t = a + (b - a) * va / (va - vb); }
    t = Math.min(0.998, Math.max(0.002, t)); /* nunca encima del punto: dos vértices pegados confunden al motor */
    id = pon(x0 + t * ex, y0 + t * ey, z0 + t * ez); M.set(key, id); return id; };
  const P = [0, 0, 0, 0], F = [0, 0, 0, 0], X = [0, 0, 0, 0], Y = [0, 0, 0, 0], Z = [0, 0, 0, 0];
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let dentro = 0; for (let c = 0; c < 8; c++) if (val(i + (c & 1), j + ((c >> 1) & 1), (c >> 2) & 1) > 0) dentro++;
      if (dentro === 0 || dentro === 8) continue;
      for (const ord of KUHN) {
        P[0] = 0; P[1] = ord[0]; P[2] = ord[0] | ord[1]; P[3] = 7; let msk = 0;
        for (let q = 0; q < 4; q++) { const c = P[q]; X[q] = i + (c & 1); Y[q] = j + ((c >> 1) & 1); Z[q] = (c >> 2) & 1; F[q] = val(X[q], Y[q], Z[q]); if (F[q] > 0) msk |= 1 << q; }
        if (msk === 0 || msk === 15) continue;
        const ins = [], out = []; for (let q = 0; q < 4; q++) (msk >> q & 1 ? ins : out).push(q);
        const e = (a, b) => { const lo = P[a] < P[b] ? a : b, hi = lo === a ? b : a; return arista(X[lo], Y[lo], Z[lo], P[hi] ^ P[lo], k); };
        // orientar: la normal hacia fuera (de lo de dentro a lo de fuera)
        let cx = 0, cy = 0, cz = 0; for (const q of out) { cx += X[q]; cy += Y[q]; cz += Z[q]; } cx /= out.length; cy /= out.length; cz /= out.length; let dx = 0, dy = 0, dz = 0; for (const q of ins) { dx += X[q]; dy += Y[q]; dz += Z[q]; } dx = cx - dx / ins.length; dy = cy - dy / ins.length; dz = cz - dz / ins.length;
        const tr = (a, b, c) => { const ax = V[b * 3] - V[a * 3], ay = V[b * 3 + 1] - V[a * 3 + 1], az = V[b * 3 + 2] - V[a * 3 + 2], bx = V[c * 3] - V[a * 3], by = V[c * 3 + 1] - V[a * 3 + 1], bz = V[c * 3 + 2] - V[a * 3 + 2], s = (ay * bz - az * by) * dx + (az * bx - ax * bz) * dy + (ax * by - ay * bx) * dz; if (s >= 0) tri(a, b, c); else tri(a, c, b); };
        if (ins.length === 1 || out.length === 1) { const o = ins.length === 1 ? ins[0] : out[0], r = (ins.length === 1 ? out : ins); tr(e(o, r[0]), e(o, r[1]), e(o, r[2])); }
        else { const [a, b] = ins, [c, d] = out, p1 = e(a, c), p2 = e(a, d), p3 = e(b, d), p4 = e(b, c); tr(p1, p2, p3); tr(p1, p3, p4); }
      }
    }
    if (k + 2 < nz) { A = B; MA = MB; MB = new Map(); B = capa(k + 2); } // la capa de arriba pasa a ser la de abajo
  }
  V = V.slice(0, nv * 3); T = T.slice(0, nt * 3);
  relaja(f, V, T, nv, h);
  return { vert: V, tri: T };
}
// v30.4 · RELAJAR la malla: los tetraedros dejan triángulos muy alargados (en la vista salen rayitas). Cada vértice se mueve hacia el
// centro de sus vecinos SOLO por la superficie (sin la parte de la normal) y se vuelve a poner sobre la forma (un paso de Newton).
function relaja(f, V, T, nv, h, vueltas = 2) {
  const cnt = new Uint32Array(nv), S = new Float32Array(nv * 3), e = h * 0.25;
  for (let it = 0; it < vueltas; it++) {
    cnt.fill(0); S.fill(0);
    for (let t = 0; t < T.length; t += 3) for (let q = 0; q < 3; q++) { const a = T[t + q], b = T[t + (q + 1) % 3]; S[a * 3] += V[b * 3]; S[a * 3 + 1] += V[b * 3 + 1]; S[a * 3 + 2] += V[b * 3 + 2]; cnt[a]++; }
    for (let v = 0; v < nv; v++) {
      if (!cnt[v]) continue; const x = V[v * 3], y = V[v * 3 + 1], z = V[v * 3 + 2], f0 = f([x, y, z]);
      const gx = (f([x + e, y, z]) - f0) / e, gy = (f([x, y + e, z]) - f0) / e, gz = (f([x, y, z + e]) - f0) / e, g2 = gx * gx + gy * gy + gz * gz;
      if (!(g2 > 1e-8)) continue; const gl = Math.sqrt(g2), nx = gx / gl, ny = gy / gl, nz = gz / gl;
      let dx = S[v * 3] / cnt[v] - x, dy = S[v * 3 + 1] / cnt[v] - y, dz = S[v * 3 + 2] / cnt[v] - z; const dn = dx * nx + dy * ny + dz * nz; dx -= dn * nx; dy -= dn * ny; dz -= dn * nz;
      const lim = h * 0.5, dl = Math.hypot(dx, dy, dz); if (dl > lim) { dx *= lim / dl; dy *= lim / dl; dz *= lim / dl; }
      let px = x + dx * 0.6, py = y + dy * 0.6, pz = z + dz * 0.6; const f1 = f([px, py, pz]), k = Math.max(-h * 0.5, Math.min(h * 0.5, f1 / gl)); // de vuelta a la superficie
      px -= k * nx; py -= k * ny; pz -= k * nz; if (px === px && py === py && pz === pz) { V[v * 3] = px; V[v * 3 + 1] = py; V[v * 3 + 2] = pz; }
    }
  }
}

// ---------- de la función a la pieza ----------
// ajustes.rapido: para las miniaturas del catálogo (malla más gorda: no se congela la pantalla mientras se dibujan)
export const ajustes = { rapido: false };
// 3D: caja = { min: [x,y,z], max: [x,y,z] } que la contiene (se ajusta sola con una pasada gruesa); paso = tamaño de la malla (mm);
// simpl = cuánto se simplifica después (0 = nada; grande = facetas grandes, estilo «low poly», sin que se suelte nada)
export function malla(f, caja, paso = 0.8, simpl = 0) {
  if (ajustes.rapido) paso *= 2.2;
  // pasada gruesa: dónde hay figura de verdad (así la malla fina no recorre aire)
  const g = Math.max(paso * 3, 1.5), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let x = caja.min[0]; x <= caja.max[0]; x += g) for (let y = caja.min[1]; y <= caja.max[1]; y += g) for (let z = caja.min[2]; z <= caja.max[2]; z += g) if (f([x, y, z]) > -g) { const q = [x, y, z]; for (let k = 0; k < 3; k++) { if (q[k] < lo[k]) lo[k] = q[k]; if (q[k] > hi[k]) hi[k] = q[k]; } }
  if (lo[0] === Infinity) N.mal('La figura ha salido vacía.');
  const min = lo.map((v, k) => Math.max(caja.min[k], v - 2 * g)), max = hi.map((v, k) => Math.min(caja.max[k], v + 2 * g));
  // v30.4 · rejilla gruesa primero: lejos de la superficie se usa su valor (interpolado) y solo cerca se calcula la forma de verdad
  const g1 = paso * 2.5, nx = Math.ceil((max[0] - min[0]) / g1) + 2, ny = Math.ceil((max[1] - min[1]) / g1) + 2, nz = Math.ceil((max[2] - min[2]) / g1) + 2, G = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) G[(k * ny + j) * nx + i] = f([min[0] + i * g1, min[1] + j * g1, min[2] + k * g1]);
  const banda = g1 * 1.6, f2 = q => { const fx = (q[0] - min[0]) / g1, fy = (q[1] - min[1]) / g1, fz = (q[2] - min[2]) / g1, i = Math.min(nx - 2, Math.max(0, fx | 0)), j = Math.min(ny - 2, Math.max(0, fy | 0)), k = Math.min(nz - 2, Math.max(0, fz | 0)), u = fx - i, v = fy - j, w = fz - k, o = (k * ny + j) * nx + i, a = nx, b = nx * ny;
    const c00 = G[o] * (1 - u) + G[o + 1] * u, c10 = G[o + a] * (1 - u) + G[o + a + 1] * u, c01 = G[o + b] * (1 - u) + G[o + b + 1] * u, c11 = G[o + a + b] * (1 - u) + G[o + a + b + 1] * u, val = (c00 * (1 - v) + c10 * v) * (1 - w) + (c01 * (1 - v) + c11 * v) * w;
    return val > banda || val < -banda ? val : f(q); };
  // v30.4 · POR TROZOS: una rejilla de millones de puntos de golpe agotaba la memoria del motor (y después TODO fallaba). Se parte en
  // rodajas a lo largo del lado más largo (alineadas con la rejilla y solapadas 2 celdas) y se unen.
  const dims = [0, 1, 2].map(k => max[k] - min[k]), puntos = dims.reduce((a, d) => a * (d / paso + 1), 1), LIM = 1.8e6;
  let m;
  const ls = (mn, mx) => N.levelSetAparte(f2, { min: mn, max: mx }, paso, 0, paso / 8) || N.MF().levelSet(q => f2(q), { min: mn, max: mx }, paso, 0, paso / 8);
  // v30.4 · primero el esculpidor propio (memoria normal, sin límite de rejilla); si algo no cerrara, el de Manifold
  try { const R = tetraedros(f2, min, max, paso); m = N.deTriangulos(R.vert, R.tri); } catch (e) { m = null; }
  if (m) { /* hecho */ }
  else if (puntos <= LIM) m = ls(min, max);
  else {
    const ax = dims.indexOf(Math.max(...dims)), k = Math.ceil(puntos / LIM), paso1 = Math.ceil(dims[ax] / k / paso) * paso, trozos = [];
    for (let a = min[ax]; a < max[ax] - 1e-9; a += paso1) { const mn = min.slice(), mx = max.slice(); mn[ax] = a === min[ax] ? a : a - paso; mx[ax] = Math.min(max[ax], a + paso1) + paso; let t = ls(mn, mx); if (t && !t.isEmpty()) { try { const t2 = t.simplify(paso * 0.04); if (t2 && !t2.isEmpty()) { N.suelta(t); t = t2; } } catch (e) { } trozos.push(t); } }
    m = trozos.length ? N.MF().union(trozos) : null;
  }
  if (!m || m.isEmpty()) N.mal('La figura ha salido vacía.');
  // v30.4 · menos triángulos (mismo aspecto: tolerancia de 4 centésimas del paso): menos memoria en todo lo que viene después
  try { const m2 = m.simplify(paso * 0.04); if (m2 && !m2.isEmpty()) { N.suelta(m); m = m2; } } catch (e) { }
  // fuera migas: trocitos sueltos diminutos que salen al mallar (no son parte de la figura)
  const P = m.decompose(); if (P.length > 1) { const v = P.map(q => q.volume()), vm = Math.max(...v); m = N.MF().union(P.filter((q, i) => v[i] >= vm * 0.01)); }
  if (simpl > 0 && m.simplify) { try { const s2 = m.simplify(ajustes.rapido ? simpl * 0.5 : simpl); if (s2 && !s2.isEmpty()) m = s2; } catch (e) { } }
  return m;
}
// 2D → CrossSection (contorno suave): se esculpe en una losa fina y se corta por la mitad
export function silueta(f2, x0, y0, x1, y1, paso = 0.35) {
  if (ajustes.rapido) paso *= 2;
  // la función 2D se mide UNA vez en una rejilla (antes, 5 veces por cada punto: con un árbol de 300 hojas tardaba un minuto)
  const X0 = x0 - 1.5, Y0 = y0 - 1.5, nx = Math.ceil((x1 - x0 + 3) / paso) + 2, ny = Math.ceil((y1 - y0 + 3) / paso) + 2, G = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) G[j * nx + i] = f2([X0 + i * paso, Y0 + j * paso]);
  const g = (x, y) => { const fx = (x - X0) / paso, fy = (y - Y0) / paso, i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(ny - 2, Math.floor(fy))), u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fy - j)); return G[j * nx + i] * (1 - u) * (1 - v) + G[j * nx + i + 1] * u * (1 - v) + G[(j + 1) * nx + i] * (1 - u) * v + G[(j + 1) * nx + i + 1] * u * v; };
  const f = p => Math.min(g(p[0], p[1]), 0.6 - Math.abs(p[2]));
  const m = N.MF().levelSet(f, { min: [X0, Y0, -0.8], max: [X0 + (nx - 1) * paso, Y0 + (ny - 1) * paso, 0.8] }, paso, 0, paso / 8);
  if (!m || m.isEmpty()) N.mal('La silueta ha salido vacía.');
  let cs = m.slice(0); m.delete && m.delete();
  // fuera migas (trocitos sueltos diminutos del mallado)
  try { const P = cs.decompose(); if (P.length > 1) { const A = P.map(q => q.area()), am = Math.max(...A); cs = N.CSX().union(P.filter((q, i) => A[i] >= am * 0.004)); } } catch (e) { }
  return cs;
}
