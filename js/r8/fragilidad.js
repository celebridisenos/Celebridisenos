// ================= 13-10-2026 · 🛡️ CelebriR8 · DETECTOR DE FRAGILIDAD =================
// La dueña: «estaría guay que implementaras un sistema de fragilidad detector, porque hay piezas que se ven bien pero las tocas y se
// rompen; que pueda detectar y ajustar a más robusto tocando esa zona que dice que es débil y subirle la dureza».
// Una pieza impresa se rompe por dos cosas, y aquí se miden las dos sobre la malla de verdad (no «a ojo»):
//  A) PAREDES FINAS. Desde cada cara se mira hacia dentro, en perpendicular, hasta la cara de enfrente: eso es el grosor ahí. Solo
//     cuenta si la cara de enfrente está de verdad enfrente (casi paralela): el canto de un chaflán no es «una pared fina».
//     Con boquilla de 0,4: menos de 0,8 mm (2 líneas) se parte al tocarla; menos de 1,2, floja; por debajo del objetivo, justa.
//  B) CUELLOS QUE HACEN PALANCA. La pieza se corta en rodajas (a lo alto, y también de lado y de frente). Cada rodaja son «islas»;
//     se mira qué isla de una rodaja sigue en la siguiente y sale el esqueleto de la pieza. Donde TODO lo que hay más allá cuelga de
//     una sola isla pequeña (un pivote, una patilla, un cuello), esa isla trabaja como una palanca: la fuerza que aguanta empujando
//     en la punta es   F = resistencia del plástico × módulo de la sección ÷ brazo de palanca   (la cuenta de una viga en voladizo).
//       · La resistencia depende del MATERIAL y de la DIRECCIÓN: entre capas el plástico aguanta más o menos la mitad que a lo largo
//         del hilo. Por eso un pivote impreso de pie se parte por una capa y el mismo, tumbado, aguanta el doble.
//       · La sección no es maciza: son las paredes y un relleno. Se descuenta (con las paredes y el relleno que vayas a usar).
//       · Si la sección cambia de golpe (esquina viva), ahí se concentra el esfuerzo: se cuenta, y se propone redondear la base.
//     Lo que está sujeto por dos sitios (un asa, un puente) no es una palanca y no se marca por esto.
// Resultado: zonas en rojo («se parte al tocarla»), naranja («frágil») y amarillo («justa para lo que le pides»), cada una con su
// medida y con lo que aguanta en kilos. Es una ESTIMACIÓN de primer orden (una viga), no un ensayo: sirve para comparar y para no
// imprimir lo que se va a partir seguro; la prueba de verdad sigue siendo imprimir la zona.
// REFORZAR (abajo, necesita el motor de sólidos): la zona se rehace capa a capa (0,2 mm), engordando SOLO lo fino hasta el objetivo,
// con la base más ancha (una cartela redondeada). El resto de la pieza no se toca.

const lim = (x, a, b) => (x < a ? a : x > b ? b : x);
export const n1 = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('es-ES');
// resistencia a tracción (MPa): a lo largo del hilo (xy) y entre capas (z). Valores prudentes de piezas impresas, no del fabricante.
export const MATERIALES = { PLA: { t: 'PLA', xy: 50, z: 25 }, PETG: { t: 'PETG', xy: 45, z: 28 }, ABS: { t: 'ABS / ASA', xy: 38, z: 20 }, TPU: { t: 'TPU (flexible)', xy: 30, z: 18, flexible: true } };
// «¿cuánto tiene que aguantar?»: grosor de pared que se pide (mm) y fuerza en la punta que se pide a un cuello (N; 10 N ≈ 1 kg)
export const DUREZAS = { deco: { t: '🎀 Decoración (que no se rompa al cogerla)', pared: 1.2, F: 6 }, normal: { t: '👍 Normal (uso de cada día)', pared: 1.6, F: 15 }, fuerte: { t: '💪 Fuerte (pieza que trabaja)', pared: 2.4, F: 35 }, muy: { t: '🦾 Muy fuerte (aguanta golpes)', pared: 3.2, F: 70 } };
export const IMPRESION = { ligera: { t: '2 paredes · 15 % de relleno', paredes: 2, relleno: 0.15 }, media: { t: '3 paredes · 25 %', paredes: 3, relleno: 0.25 }, fuerte: { t: '4 paredes · 40 %', paredes: 4, relleno: 0.4 }, maciza: { t: '6 paredes · 100 % (maciza)', paredes: 6, relleno: 1 } };
const LINEA = 0.45; // ancho de una línea con boquilla de 0,4 (mm)
const EJES = { z: { n: 'de pie', u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, x: { n: 'de lado', u: [0, 0, -1], v: [0, 1, 0], w: [1, 0, 0] }, y: { n: 'de frente', u: [1, 0, 0], v: [0, 0, -1], w: [0, 1, 0] } };
// coordenadas de un punto en el marco de cada eje de corte: (u, v) en el plano y w a lo largo. Las mismas que da el motor de sólidos
// al girar la pieza para cortarla (ver «refuerza»): eje z tal cual · eje x: giro [0, −90, 0] · eje y: giro [90, 0, 0]
export const aMarco = (eje, p) => (eje === 'z' ? [p[0], p[1], p[2]] : eje === 'x' ? [-p[2], p[1], p[0]] : [p[0], -p[2], p[1]]);
export const deMarco = (eje, q) => (eje === 'z' ? [q[0], q[1], q[2]] : eje === 'x' ? [q[2], q[1], -q[0]] : [q[0], q[2], -q[1]]);

// ---------- A) GROSOR DE PARED con rayos ----------
// árbol de cajas sobre los triángulos (para que cada rayo mire pocos)
function arbol(V, T) {
  const nt = T.length / 3, cen = new Float32Array(nt * 3), bb = new Float32Array(nt * 6), idx = new Uint32Array(nt);
  for (let f = 0; f < nt; f++) { idx[f] = f; for (let a = 0; a < 3; a++) { const p = V[T[f * 3] * 3 + a], q = V[T[f * 3 + 1] * 3 + a], r = V[T[f * 3 + 2] * 3 + a]; bb[f * 6 + a] = Math.min(p, q, r); bb[f * 6 + 3 + a] = Math.max(p, q, r); cen[f * 3 + a] = (p + q + r) / 3; } }
  const nodos = []; // [min x3, max x3, izq, der, ini, n]  (hoja: izq = -1)
  const haz = (ini, fin) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity], cmn = [Infinity, Infinity, Infinity], cmx = [-Infinity, -Infinity, -Infinity];
    for (let i = ini; i < fin; i++) { const f = idx[i]; for (let a = 0; a < 3; a++) { if (bb[f * 6 + a] < mn[a]) mn[a] = bb[f * 6 + a]; if (bb[f * 6 + 3 + a] > mx[a]) mx[a] = bb[f * 6 + 3 + a]; const c = cen[f * 3 + a]; if (c < cmn[a]) cmn[a] = c; if (c > cmx[a]) cmx[a] = c; } }
    const id = nodos.length, nd = { mn, mx, izq: -1, der: -1, ini, n: fin - ini }; nodos.push(nd);
    if (fin - ini > 6) { let eje = 0; if (cmx[1] - cmn[1] > cmx[eje] - cmn[eje]) eje = 1; if (cmx[2] - cmn[2] > cmx[eje] - cmn[eje]) eje = 2; const medio = (cmn[eje] + cmx[eje]) / 2; let i = ini, j = fin - 1;
      while (i <= j) { if (cen[idx[i] * 3 + eje] < medio) i++; else { const t = idx[i]; idx[i] = idx[j]; idx[j] = t; j--; } }
      if (i === ini || i === fin) i = (ini + fin) >> 1; nd.izq = haz(ini, i); nd.der = haz(i, fin); }
    return id; };
  haz(0, nt); return { nodos, idx };
}
// el primer triángulo que toca el rayo (origen o, dirección d ya de largo 1), sin contar «salta» → { t, f } o null
function rayo(A, V, T, o, d, salta, tMax = Infinity) {
  const { nodos, idx } = A, pila = [0]; let mejor = tMax, cual = -1; const inv = [1 / (d[0] || 1e-30), 1 / (d[1] || 1e-30), 1 / (d[2] || 1e-30)];
  while (pila.length) { const nd = nodos[pila.pop()]; let t0 = 0, t1 = mejor, fuera = false;
    for (let a = 0; a < 3; a++) { let ta = (nd.mn[a] - o[a]) * inv[a], tb = (nd.mx[a] - o[a]) * inv[a]; if (ta > tb) { const t = ta; ta = tb; tb = t; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) { fuera = true; break; } }
    if (fuera) continue;
    if (nd.izq >= 0) { pila.push(nd.izq, nd.der); continue; }
    for (let i = nd.ini; i < nd.ini + nd.n; i++) { const f = idx[i]; if (f === salta) continue; const a = T[f * 3] * 3, b = T[f * 3 + 1] * 3, c = T[f * 3 + 2] * 3;
      const e1x = V[b] - V[a], e1y = V[b + 1] - V[a + 1], e1z = V[b + 2] - V[a + 2], e2x = V[c] - V[a], e2y = V[c + 1] - V[a + 1], e2z = V[c + 2] - V[a + 2];
      const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x, det = e1x * px + e1y * py + e1z * pz; if (det > -1e-12 && det < 1e-12) continue;
      const id = 1 / det, tx = o[0] - V[a], ty = o[1] - V[a + 1], tz = o[2] - V[a + 2], u = (tx * px + ty * py + tz * pz) * id; if (u < -1e-7 || u > 1 + 1e-7) continue;
      const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (d[0] * qx + d[1] * qy + d[2] * qz) * id; if (v < -1e-7 || u + v > 1 + 1e-7) continue;
      const t = (e2x * qx + e2y * qy + e2z * qz) * id; if (t > 1e-5 && t < mejor) { mejor = t; cual = f; } } }
  return cual < 0 ? null : { t: mejor, f: cual };
}
function normales(V, T) { const nt = T.length / 3, N = new Float32Array(nt * 3), Ar = new Float32Array(nt); let vol = 0;
  for (let f = 0; f < nt; f++) { const a = T[f * 3] * 3, b = T[f * 3 + 1] * 3, c = T[f * 3 + 2] * 3, ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx, l = Math.hypot(x, y, z) || 1; N[f * 3] = x / l; N[f * 3 + 1] = y / l; N[f * 3 + 2] = z / l; Ar[f] = l / 2;
    vol += (V[a] * (V[b + 1] * V[c + 2] - V[b + 2] * V[c + 1]) - V[a + 1] * (V[b] * V[c + 2] - V[b + 2] * V[c]) + V[a + 2] * (V[b] * V[c + 1] - V[b + 1] * V[c])) / 6; }
  if (vol < 0) for (let i = 0; i < N.length; i++) N[i] = -N[i]; // (malla del revés: las normales, hacia fuera)
  return { N, Ar, vol: Math.abs(vol) };
}
// grosor en cada cara (mm; Infinity = no hay pared enfrente) · tope = no hace falta saber más allá de eso
export function grosores(M, tope = 8, alAvanzar) {
  const { V, T } = M, nt = T.length / 3, A = arbol(V, T), { N, Ar, vol } = normales(V, T), g = new Float32Array(nt).fill(Infinity), enfrente = new Int32Array(nt).fill(-1), salto = Math.max(1, Math.ceil(nt / 250000)); let ult = -1;
  const mira = (f, px, py, pz) => { const n = [N[f * 3], N[f * 3 + 1], N[f * 3 + 2]], h = rayo(A, V, T, [px - n[0] * 1e-4, py - n[1] * 1e-4, pz - n[2] * 1e-4], [-n[0], -n[1], -n[2]], f, tope + 1); ult = -1; if (!h) return Infinity;
    if (n[0] * N[h.f * 3] + n[1] * N[h.f * 3 + 1] + n[2] * N[h.f * 3 + 2] < -0.8) { ult = h.f; return h.t; } return Infinity; };
  for (let f = 0; f < nt; f += salto) { if (Ar[f] < 1e-6) continue; const a = T[f * 3] * 3, b = T[f * 3 + 1] * 3, c = T[f * 3 + 2] * 3;
    let t = mira(f, (V[a] + V[b] + V[c]) / 3, (V[a + 1] + V[b + 1] + V[c + 1]) / 3, (V[a + 2] + V[b + 2] + V[c + 2]) / 3); enfrente[f] = ult;
    if (Ar[f] > 12) for (const [p, q, r] of [[0.66, 0.17, 0.17], [0.17, 0.66, 0.17], [0.17, 0.17, 0.66]]) { const t2 = mira(f, V[a] * p + V[b] * q + V[c] * r, V[a + 1] * p + V[b + 1] * q + V[c + 1] * r, V[a + 2] * p + V[b + 2] * q + V[c + 2] * r); if (t2 < t) { t = t2; enfrente[f] = ult; } } // (triángulos grandes: 3 miradas más)
    g[f] = t; if (alAvanzar && f % 20000 === 0) alAvanzar(f / nt); }
  return { g, N, Ar, vol, enfrente };
}

// ---------- B) RODAJAS, ISLAS Y PALANCAS ----------
const dentro = (q, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
function momentos(r) { let A = 0, cx = 0, cy = 0, ixx = 0, iyy = 0, ixy = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const x0 = r[j][0], y0 = r[j][1], x1 = r[i][0], y1 = r[i][1], k = x0 * y1 - x1 * y0; A += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k; ixx += (y0 * y0 + y0 * y1 + y1 * y1) * k; iyy += (x0 * x0 + x0 * x1 + x1 * x1) * k; ixy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * k; }
  return { A: A / 2, sx: cx / 6, sy: cy / 6, ixx: ixx / 12, iyy: iyy / 12, ixy: ixy / 24 }; }
// las islas de una rodaja a partir de sus trozos de borde (segmentos sueltos [u0, v0, u1, v1…])
function islasDe(seg) {
  const n = seg.length / 4; if (n < 3) return [];
  const clave = (u, v) => Math.round(u * 2000) + ',' + Math.round(v * 2000), mapa = new Map(), usado = new Uint8Array(n);
  for (let i = 0; i < n; i++) for (const k of [clave(seg[i * 4], seg[i * 4 + 1]), clave(seg[i * 4 + 2], seg[i * 4 + 3])]) { const L = mapa.get(k); if (L) L.push(i); else mapa.set(k, [i]); }
  const lazos = [];
  for (let i0 = 0; i0 < n; i0++) { if (usado[i0]) continue; const r = [[seg[i0 * 4], seg[i0 * 4 + 1]]]; let i = i0, fin = clave(seg[i0 * 4 + 2], seg[i0 * 4 + 3]), cerrado = false; usado[i0] = 1; const k0 = clave(seg[i0 * 4], seg[i0 * 4 + 1]); let pu = seg[i0 * 4 + 2], pv = seg[i0 * 4 + 3];
    for (let guard = 0; guard < n + 2; guard++) { if (fin === k0) { cerrado = true; break; } r.push([pu, pv]); const L = mapa.get(fin); let sig = -1; if (L) for (const j of L) if (!usado[j]) { sig = j; break; } if (sig < 0) break; usado[sig] = 1;
      if (clave(seg[sig * 4], seg[sig * 4 + 1]) === fin) { pu = seg[sig * 4 + 2]; pv = seg[sig * 4 + 3]; } else { pu = seg[sig * 4]; pv = seg[sig * 4 + 1]; } fin = clave(pu, pv); i = sig; }
    if (cerrado && r.length >= 3) { const m = momentos(r); if (Math.abs(m.A) > 1e-4) { let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity; for (const p of r) { if (p[0] < u0) u0 = p[0]; if (p[0] > u1) u1 = p[0]; if (p[1] < v0) v0 = p[1]; if (p[1] > v1) v1 = p[1]; } lazos.push({ r, m, a: Math.abs(m.A), caja: [u0, v0, u1, v1] }); } } }
  // quién está dentro de quién: de mayor a menor; el padre es el más pequeño de los mayores que lo contienen
  lazos.sort((a, b) => b.a - a.a); const islas = [];
  lazos.forEach((L, i) => { L.padre = -1; for (let j = i - 1; j >= 0; j--) { const P = lazos[j]; if (L.caja[0] >= P.caja[0] - 1e-6 && L.caja[2] <= P.caja[2] + 1e-6 && L.caja[1] >= P.caja[1] - 1e-6 && L.caja[3] <= P.caja[3] + 1e-6 && dentro(L.r[0], P.r)) { L.padre = j; break; } } L.prof = L.padre < 0 ? 0 : lazos[L.padre].prof + 1; });
  lazos.forEach((L, i) => { if (L.prof % 2 === 0) { L.isla = islas.length; islas.push({ fuera: L.r, huecos: [], caja: L.caja, lazos: [L] }); } else { const I = islas[lazos[L.padre].isla]; if (I) { I.huecos.push(L.r); I.lazos.push(L); } } void i; });
  // de cada isla: área, centro y cómo de dura es su sección al doblarla por su lado flojo
  islas.forEach(I => { let A = 0, sx = 0, sy = 0, ixx = 0, iyy = 0, ixy = 0; I.lazos.forEach((L, k) => { const s = (k === 0 ? 1 : -1) * Math.sign(L.m.A || 1); A += s * L.m.A; sx += s * L.m.sx; sy += s * L.m.sy; ixx += s * L.m.ixx; iyy += s * L.m.iyy; ixy += s * L.m.ixy; });
    const cx = sx / A, cy = sy / A, Ix = ixx - A * cy * cy, Iy = iyy - A * cx * cx, Ixy = ixy - A * cx * cy, th = 0.5 * Math.atan2(-2 * Ixy, Ix - Iy);
    const Ien = t => Ix * Math.cos(t) ** 2 + Iy * Math.sin(t) ** 2 - 2 * Ixy * Math.sin(t) * Math.cos(t); let tm = th, Im = Ien(th); if (Ien(th + Math.PI / 2) < Im) { tm = th + Math.PI / 2; Im = Ien(tm); }
    // (el eje flojo pasa por el centro con dirección tm; lo que cuenta es lo lejos que queda el borde de ese eje)
    let c0 = 0, c1 = 0, l0 = 0, l1 = 0; const ex = Math.cos(tm), ey = Math.sin(tm); for (const p of I.fuera) { const d = -(p[0] - cx) * ey + (p[1] - cy) * ex, l = (p[0] - cx) * ex + (p[1] - cy) * ey; if (d < c0) c0 = d; if (d > c1) c1 = d; if (l < l0) l0 = l; if (l > l1) l1 = l; }
    const cmax = Math.max(-c0, c1, 1e-6); const Imax = Ix + Iy - Im, igual = Imax < Im * 1.15; // (un cuadrado o un círculo: el «lado flojo» sale en diagonal; para NOMBRARLA valen las medidas de su caja)
    Object.assign(I, { A, c: [cx, cy], Imin: Math.max(0, Im), Z: Math.max(0, Im) / cmax, fino: c1 - c0, largo: l1 - l0, eje: [ex, ey], dims: igual ? [Math.min(I.caja[2] - I.caja[0], I.caja[3] - I.caja[1]), Math.max(I.caja[2] - I.caja[0], I.caja[3] - I.caja[1])] : [c1 - c0, l1 - l0] }); delete I.lazos; });
  return islas.filter(I => I.A > 0.02);
}
// todas las rodajas de la pieza a lo largo de un eje → { paso, w0, capas: [[isla…]…] }
function rodajas(M, eje, nMax) {
  const { V, T } = M, nt = T.length / 3, W = new Float32Array(V.length / 3), U = new Float32Array(V.length / 3), Vv = new Float32Array(V.length / 3); let w0 = Infinity, w1 = -Infinity;
  for (let i = 0; i < W.length; i++) { const q = aMarco(eje, [V[i * 3], V[i * 3 + 1], V[i * 3 + 2]]); U[i] = q[0]; Vv[i] = q[1]; W[i] = q[2]; if (q[2] < w0) w0 = q[2]; if (q[2] > w1) w1 = q[2]; }
  const alto = w1 - w0; if (!(alto > 0.2)) return null; const paso = lim(alto / nMax, 0.3, 4), n = Math.max(1, Math.floor(alto / paso)), ini = w0 + (alto - (n - 1) * paso) / 2 + 1.37e-4, segs = Array.from({ length: n }, () => []);
  for (let f = 0; f < nt; f++) { const a = T[f * 3], b = T[f * 3 + 1], c = T[f * 3 + 2], wa = W[a], wb = W[b], wc = W[c], mn = Math.min(wa, wb, wc), mx = Math.max(wa, wb, wc); let k0 = Math.ceil((mn - ini) / paso), k1 = Math.floor((mx - ini) / paso); if (k0 < 0) k0 = 0; if (k1 > n - 1) k1 = n - 1;
    for (let k = k0; k <= k1; k++) { const w = ini + k * paso, P = []; for (const [i, j, wi, wj] of [[a, b, wa, wb], [b, c, wb, wc], [c, a, wc, wa]]) { if ((wi > w) !== (wj > w)) { const t = (w - wi) / (wj - wi); P.push(U[i] + (U[j] - U[i]) * t, Vv[i] + (Vv[j] - Vv[i]) * t); } } if (P.length === 4) segs[k].push(P[0], P[1], P[2], P[3]); } }
  return { eje, paso, ini, n, capas: segs.map((s, k) => { const L = islasDe(s); L.forEach(I => { I.k = k; I.w = ini + k * paso; }); return L; }) };
}
const seTocan = (A, B) => { if (A.caja[0] > B.caja[2] || B.caja[0] > A.caja[2] || A.caja[1] > B.caja[3] || B.caja[1] > A.caja[3]) return false; if (dentro(A.c, B.fuera) || dentro(B.c, A.fuera)) return true;
  const pa = Math.max(1, Math.floor(A.fuera.length / 24)), pb = Math.max(1, Math.floor(B.fuera.length / 24)); for (let i = 0; i < A.fuera.length; i += pa) if (dentro(A.fuera[i], B.fuera)) return true; for (let i = 0; i < B.fuera.length; i += pb) if (dentro(B.fuera[i], A.fuera)) return true; return false; };
// el esqueleto (qué isla sigue en la rodaja de al lado) y, en cada isla de la que CUELGA algo, cuánto aguanta
function palancas(R, o) {
  const nodos = []; R.capas.forEach(L => L.forEach(I => { I.id = nodos.length; I.vec = []; nodos.push(I); }));
  if (nodos.length < 2) return [];
  for (let k = 0; k + 1 < R.capas.length; k++) for (const A of R.capas[k]) for (const B of R.capas[k + 1]) if (seTocan(A, B)) { A.vec.push(B.id); B.vec.push(A.id); }
  const n = nodos.length, vol = I => I.A * R.paso; let tot = 0; nodos.forEach(I => { tot += vol(I); });
  // recorrido en profundidad desde la isla más grande (sin recursión: una pieza larga son cientos de rodajas)
  const raiz = nodos.reduce((m, I) => (I.A > m.A ? I : m), nodos[0]).id, disc = new Int32Array(n).fill(-1), low = new Int32Array(n), padre = new Int32Array(n).fill(-1), orden = [];
  const agg = nodos.map(I => ({ vol: vol(I), w0: I.w - R.paso / 2, w1: I.w + R.paso / 2, u0: I.caja[0], v0: I.caja[1], u1: I.caja[2], v1: I.caja[3], n: 1 })); let reloj = 0;
  const hallazgos = [];
  for (const r0 of [raiz].concat(nodos.map(I => I.id))) { if (disc[r0] >= 0) continue; const pila = [[r0, 0]]; disc[r0] = low[r0] = reloj++;
    while (pila.length) { const top = pila[pila.length - 1], u = top[0], I = nodos[u];
      if (top[1] < I.vec.length) { const v = I.vec[top[1]++]; if (disc[v] < 0) { padre[v] = u; disc[v] = low[v] = reloj++; pila.push([v, 0]); } else if (v !== padre[u]) low[u] = Math.min(low[u], disc[v]); }
      else { pila.pop(); orden.push(u); const p = padre[u]; if (p >= 0) { low[p] = Math.min(low[p], low[u]);
          if (low[u] >= disc[p]) hallazgos.push({ en: p, rama: u, a: Object.assign({}, agg[u]) }); // todo lo de «u» cuelga SOLO de «p»
          const a = agg[p], b = agg[u]; a.vol += b.vol; a.n += b.n; a.w0 = Math.min(a.w0, b.w0); a.w1 = Math.max(a.w1, b.w1); a.u0 = Math.min(a.u0, b.u0); a.v0 = Math.min(a.v0, b.v0); a.u1 = Math.max(a.u1, b.u1); a.v1 = Math.max(a.v1, b.v1); } } } }
  const sig = R.eje === 'z' ? o.mat.z : o.mat.xy, w = o.imp.paredes * LINEA, out = [];
  const todo = agg[raiz];
  for (const H of hallazgos) { const I = nodos[H.en]; let a = H.a;
    // (si lo que «cuelga» de aquí es más de media pieza, lo que hace palanca es EL OTRO lado: se toma el resto, por su caja)
    if (a.vol > tot * 0.5) { const arriba = (a.w0 + a.w1) / 2 > I.w; a = { vol: tot - a.vol, w0: arriba ? todo.w0 : I.w, w1: arriba ? I.w : todo.w1, u0: todo.u0, v0: todo.v0, u1: todo.u1, v1: todo.v1 }; if (a.vol < tot * 0.002) continue; }
    // el brazo: de la sección a la esquina más lejana de lo que cuelga
    let L = 0; for (const uu of [a.u0, a.u1]) for (const vv of [a.v0, a.v1]) for (const ww of [a.w0, a.w1]) { const d = Math.hypot(uu - I.c[0], vv - I.c[1], ww - I.w); if (d > L) L = d; }
    if (L < 2.5) continue;
    // la sección de verdad: paredes + relleno (si es más ancha que dos veces las paredes, por dentro va el relleno)
    const s = Math.max(0, 1 - 2 * w / Math.max(I.fino, 1e-6)), Zef = I.Z * (1 - (1 - o.imp.relleno) * s * s * s);
    // ¿cambia la sección de golpe hacia el cuerpo? (esquina viva = el esfuerzo se concentra)
    const cuerpo = padre[H.en] >= 0 ? nodos[padre[H.en]] : null, salto = cuerpo ? cuerpo.A / Math.max(I.A, 1e-6) : 1, viva = salto > 2.2 || (nodos[H.rama].A / Math.max(I.A, 1e-6) > 2.2), Kt = viva ? 1.7 : 1;
    const F = sig * Zef / (L * Kt);
    out.push({ eje: R.eje, k: I.k, w: I.w, c: I.c, caja: I.caja, A: I.A, fino: I.dims[0], largo: I.dims[1], Z: I.Z, Zef, L, F, viva, vol: a.vol, rama: { w0: a.w0, w1: a.w1, u0: a.u0, v0: a.v0, u1: a.u1, v1: a.v1 }, haciaArriba: a.w1 - I.w > I.w - a.w0, id: H.en, ramaId: H.rama, fuera: I.fuera });
  }
  return out;
}

// ---------- TODO JUNTO ----------
// M = { V, T } (soldada, en mm, COMO SE VA A IMPRIMIR: Z hacia arriba) · o = { material, dureza, impresion }
export function analiza(M, o = {}) {
  const mat = MATERIALES[o.material] || MATERIALES.PLA, dur = DUREZAS[o.dureza] || DUREZAS.normal, imp = IMPRESION[o.impresion] || IMPRESION.media, { V, T } = M, nt = T.length / 3;
  const G = grosores(M, Math.max(4, dur.pared + 1), o.alAvanzar ? p => o.alAvanzar(p * 0.5, 'midiendo el grosor de las paredes') : null), g = G.g, zonas = [];
  let b0 = [Infinity, Infinity, Infinity], b1 = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < V.length; i += 3) for (let a = 0; a < 3; a++) { if (V[i + a] < b0[a]) b0[a] = V[i + a]; if (V[i + a] > b1[a]) b1[a] = V[i + a]; }
  const cen = f => [(V[T[f * 3] * 3] + V[T[f * 3 + 1] * 3] + V[T[f * 3 + 2] * 3]) / 3, (V[T[f * 3] * 3 + 1] + V[T[f * 3 + 1] * 3 + 1] + V[T[f * 3 + 2] * 3 + 1]) / 3, (V[T[f * 3] * 3 + 2] + V[T[f * 3 + 1] * 3 + 2] + V[T[f * 3 + 2] * 3 + 2]) / 3];
  // --- A) paredes finas: caras por debajo del objetivo, juntadas por vecindad ---
  { const pad = new Int32Array(V.length / 3).fill(-1), raiz = x => { while (pad[x] !== x) { pad[x] = pad[pad[x]]; x = pad[x]; } return x; }, finas = [];
    for (let f = 0; f < nt; f++) if (g[f] < dur.pared - 0.02) { finas.push(f); for (let k = 0; k < 3; k++) { const v = T[f * 3 + k]; if (pad[v] < 0) pad[v] = v; } const r = raiz(T[f * 3]); pad[raiz(T[f * 3 + 1])] = r; pad[raiz(T[f * 3 + 2])] = r; }
    // (las dos caras de una misma pared son UNA zona: cada cara fina se junta con la que tiene enfrente)
    for (const f of finas) { const e = G.enfrente[f]; if (e >= 0 && g[e] < dur.pared - 0.02 && pad[T[e * 3]] >= 0) pad[raiz(T[e * 3])] = raiz(T[f * 3]); }
    const grupos = new Map(); for (const f of finas) { const r = raiz(T[f * 3]); let L = grupos.get(r); if (!L) grupos.set(r, L = []); L.push(f); }
    const minArea = Math.max(2.5, 0.0004 * G.Ar.reduce((s, a) => s + a, 0));
    grupos.forEach(L => { let area = 0; const c = [0, 0, 0], nn = [0, 0, 0], mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (const f of L) { const a = G.Ar[f], q = cen(f); area += a; for (let k = 0; k < 3; k++) { c[k] += q[k] * a; nn[k] += Math.abs(G.N[f * 3 + k]) * a; for (let j = 0; j < 3; j++) { const x = V[T[f * 3 + j] * 3 + k]; if (x < mn[k]) mn[k] = x; if (x > mx[k]) mx[k] = x; } } }
      if (area < minArea) return; const ord = L.slice().sort((a, b) => g[a] - g[b]); let acum = 0, min = g[ord[0]]; for (const f of ord) { acum += G.Ar[f]; if (acum >= area * 0.1) { min = g[f]; break; } }
      const nivel = min < 0.8 ? 'rojo' : min < 1.2 ? 'naranja' : 'amarillo', lineas = Math.max(1, Math.round(min / LINEA));
      zonas.push({ tipo: 'pared', nivel, caras: L, centro: c.map(x => x / area), caja: { min: mn, max: mx }, min, area, normal: nn.map(x => x / area),
        titulo: 'Pared de ' + n1(min) + ' mm', texto: (nivel === 'rojo' ? 'Se parte al tocarla: ' : nivel === 'naranja' ? 'Floja: ' : 'Justa para lo que le pides: ') + 'ahí la pieza mide ' + n1(min) + ' mm de grueso (' + lineas + (lineas === 1 ? ' línea' : ' líneas') + ' de tu boquilla) en ' + n1(area / 100, 1) + ' cm². Le pides ' + n1(dur.pared) + ' mm.' }); }); }
  // --- B) cuellos que hacen palanca, en los tres sentidos ---
  const cuellos = [], todas = []; let rodajasHechas = 0;
  for (const eje of ['z', 'x', 'y']) { if (o.alAvanzar) o.alAvanzar(0.5 + 0.15 * 'zxy'.indexOf(eje), 'cortando la pieza ' + EJES[eje].n); const R = rodajas(M, eje, eje === 'z' ? 150 : 110); if (!R) continue; rodajasHechas += R.n;
    const nIslas = R.capas.reduce((s, L) => s + L.length, 0); if (nIslas > 60000) continue; // (una celosía enorme: se queda con las paredes)
    for (const H of palancas(R, { mat, imp })) { todas.push([H.eje, H.F]); if (H.F < dur.F) cuellos.push(Object.assign(H, { paso: R.paso, flexible: !!mat.flexible })); } }
  // ¿Y EN OTRA POSTURA? Lo mismo, imprimiéndola con otro lado hacia arriba: cambia qué cuellos quedan «entre capas» (los flojos)
  const posturas = {}; for (const P of ['z', 'x', 'y']) { let mn = Infinity; for (const [eje, F] of todas) { const f = F * (eje === P ? mat.z : mat.xy) / (eje === 'z' ? mat.z : mat.xy); if (f < mn) mn = f; } posturas[P] = mn; }
  const mejorPostura = ['x', 'y'].reduce((m, P) => (posturas[P] > posturas[m] * 1.3 ? P : m), 'z');
  // un mismo cuello sale varias veces (rodajas seguidas, y a veces en dos sentidos): se queda el peor de cada sitio
  cuellos.sort((a, b) => a.F - b.F); const vistos = [];
  // (y lo que está MÁS ALLÁ de un cuello más flojo, dentro de lo que cuelga de él, es el mismo palito: un pivote de 25 mm cortado en
  // rodajas daba 15 «zonas» —una por rodaja—; ahora es una, la de su base. Al reforzarla se vuelve a mirar y sale lo siguiente)
  const enRama = (Q, H) => Q.eje === H.eje && H.c[0] >= Q.rama.u0 - 0.3 && H.c[0] <= Q.rama.u1 + 0.3 && H.c[1] >= Q.rama.v0 - 0.3 && H.c[1] <= Q.rama.v1 + 0.3 && (Q.haciaArriba ? H.w >= Q.w - Q.paso * 1.5 && H.w <= Q.rama.w1 : H.w <= Q.w + Q.paso * 1.5 && H.w >= Q.rama.w0);
  for (const H of cuellos) { const p = deMarco(H.eje, [H.c[0], H.c[1], H.w]), r = Math.max(2, H.fino * 1.5, H.paso * 2); if (vistos.some(q => Math.hypot(q.p[0] - p[0], q.p[1] - p[1], q.p[2] - p[2]) < Math.max(r, q.r) || enRama(q.H, H))) continue; vistos.push({ p, r, H }); }
  for (const { p, H } of vistos.slice(0, 40)) { const kg = H.F / 9.81, nivel = H.F < 4 ? 'rojo' : H.F < 12 ? 'naranja' : 'amarillo', otro = H.eje === 'z' ? H.F * mat.xy / mat.z : null;
    // la zona en la pieza: el tramo del cuello (desde la sección floja hacia lo que cuelga, hasta donde engorda) y sus caras
    const haciaW = H.haciaArriba ? 1 : -1, largoZona = Math.max(H.paso * 2, Math.min(H.L, Math.max(4, 3 * H.fino))), wA = H.w - haciaW * H.paso * 1.5, wB = H.w + haciaW * largoZona, wmin = Math.min(wA, wB), wmax = Math.max(wA, wB), mg = Math.max(0.6, 0.35 * H.fino);
    const caras = []; for (let f = 0; f < nt; f++) { const q = aMarco(H.eje, cen(f)); if (!(q[0] >= H.caja[0] - mg && q[0] <= H.caja[2] + mg && q[1] >= H.caja[1] - mg && q[1] <= H.caja[3] + mg)) continue;
      let fa = Infinity, fb = -Infinity; for (let j = 0; j < 3; j++) { const v = T[f * 3 + j] * 3, ww = aMarco(H.eje, [V[v], V[v + 1], V[v + 2]])[2]; if (ww < fa) fa = ww; if (ww > fb) fb = ww; } if (fb >= wmin && fa <= wmax) caras.push(f); }
    const e0 = deMarco(H.eje, [H.caja[0] - mg, H.caja[1] - mg, wmin]), e1 = deMarco(H.eje, [H.caja[2] + mg, H.caja[3] + mg, wmax]);
    zonas.push({ tipo: 'cuello', nivel, caras, centro: p, caja: { min: e0.map((x, i) => Math.min(x, e1[i])), max: e0.map((x, i) => Math.max(x, e1[i])) }, min: H.fino, F: H.F, kg, L: H.L, eje: H.eje, w: H.w, wmin, wmax, haciaW, c: H.c, cajaUV: H.caja, seccion: [H.fino, H.largo], wRama: H.haciaArriba ? H.rama.w1 : H.rama.w0, viva: H.viva, paso: H.paso, tumbada: otro, flexible: !!H.flexible,
      titulo: 'Cuello de ' + n1(H.fino) + ' × ' + n1(H.largo) + ' mm', texto: (H.flexible ? 'En TPU se dobla, no se parte; aun así es muy fina: ' : nivel === 'rojo' ? 'Se parte al tocarla: ' : nivel === 'naranja' ? 'Frágil: ' : 'Justa para lo que le pides: ') + 'de esta sección de ' + n1(H.fino) + ' × ' + n1(H.largo) + ' mm cuelgan ' + n1(H.L, 0) + ' mm de pieza. Aguanta ≈ ' + (kg < 1 ? n1(kg * 1000, 0) + ' g' : n1(kg) + ' kg') + ' empujando en la punta (le pides ' + n1(dur.F / 9.81) + ' kg).'
        + (H.eje === 'z' ? ' Se parte POR UNA CAPA (está de pie)' + (otro ? ': tumbada aguantaría ≈ ' + n1(otro / 9.81) + ' kg.' : '.') : ' Aquí el hilo va a lo largo: es la mejor postura para esta zona.') + (H.viva ? ' La base hace esquina viva: redondearla ayuda mucho.' : '') }); }
  // lo más grave primero; colores de cada cara
  const peso = { rojo: 0, naranja: 1, amarillo: 2 }; zonas.sort((a, b) => peso[a.nivel] - peso[b.nivel] || (a.F ?? 1e9) - (b.F ?? 1e9) || a.min - b.min); zonas.forEach((z, i) => { z.id = i; });
  const deCara = new Int32Array(nt).fill(-1); for (let i = zonas.length - 1; i >= 0; i--) for (const f of zonas[i].caras) deCara[f] = i;
  const cuenta = { rojo: 0, naranja: 0, amarillo: 0 }; zonas.forEach(z => { cuenta[z.nivel]++; });
  const peor = cuenta.rojo ? 'rojo' : cuenta.naranja ? 'naranja' : cuenta.amarillo ? 'amarillo' : 'verde';
  return { zonas, deCara, grosor: g, cuenta, peor, vol: G.vol, caja: { min: b0, max: b1 }, material: mat, dureza: dur, impresion: imp, rodajas: rodajasHechas, posturas, mejorPostura,
    veredicto: peor === 'verde' ? 'No encuentro zonas frágiles para lo que le pides (' + dur.t.replace(/^\S+ /, '').toLowerCase() + ').' : peor === 'rojo' ? cuenta.rojo + (cuenta.rojo === 1 ? ' zona se parte' : ' zonas se parten') + ' al tocarla' + (cuenta.rojo === 1 ? '' : 's') + '.' : peor === 'naranja' ? cuenta.naranja + (cuenta.naranja === 1 ? ' zona frágil.' : ' zonas frágiles.') : cuenta.amarillo + (cuenta.amarillo === 1 ? ' zona justa' : ' zonas justas') + ' para lo que le pides.' };
}
export const COLORES = { verde: [0.36, 0.78, 0.6], amarillo: [1, 0.82, 0.25], naranja: [1, 0.5, 0.16], rojo: [1, 0.2, 0.3], sel: [0.35, 0.85, 1] };
// la pieza pintada por zonas: una vista sin índices (cada cara, su color), para la escena 3D y para saber qué cara se toca
export function vistaColores(M, R, sel = -1) {
  const { V, T } = M, nt = T.length / 3, pos = new Float32Array(nt * 9), nor = new Float32Array(nt * 9), col = new Float32Array(nt * 9), idx = new Uint32Array(nt * 3);
  for (let f = 0; f < nt; f++) { const a = T[f * 3] * 3, b = T[f * 3 + 1] * 3, c = T[f * 3 + 2] * 3, ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; const z = R.deCara[f], k = z < 0 ? COLORES.verde : z === sel ? COLORES.sel : COLORES[R.zonas[z].nivel];
    [a, b, c].forEach((p, j) => { const o = (f * 3 + j) * 3; pos[o] = V[p]; pos[o + 1] = V[p + 1]; pos[o + 2] = V[p + 2]; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz; col[o] = k[0]; col[o + 1] = k[1]; col[o + 2] = k[2]; idx[f * 3 + j] = f * 3 + j; }); }
  return { pos, nor, col, idx };
}

// ---------- REFORZAR UNA ZONA (con el motor de sólidos) ----------
// N = nucleo.js ya cargado · m = la pieza (Manifold, en las mismas coordenadas que la malla analizada) · z = zona · R = el análisis
// o = { modo: 'engordar' | 'base', mas (mm de más sobre lo calculado) } → { m (pieza nueva), añadido (mm³), capas, delta }
// Cómo: la pieza se gira para que el eje de la zona quede hacia arriba, se corta en capas de 0,2 mm solo en el tramo de la zona y en
// cada capa se toma SU trozo: un cuello se engorda todo alrededor (y más hacia la base: cartela redondeada); una pared se engorda
// solo donde es más fina que el objetivo. Cada capa engordada se levanta 0,2 mm y todo se suma a la pieza. Lo demás no se toca.
export function refuerza(N, m, z, R, o = {}) {
  const MF = N.MF(), CS = N.CSX(), capa = 0.2, dur = R.dureza, modo = o.modo || 'engordar', mas = o.mas || 0;
  const giro = { z: [0, 0, 0], x: [0, -90, 0], y: [90, 0, 0] }, vuelta = { z: [0, 0, 0], x: [0, 90, 0], y: [-90, 0, 0] };
  let eje = z.eje;
  if (z.tipo === 'pared') { // el corte, a lo largo de la pared: el eje en el que menos mira su normal (a igualdad, de pie)
    const n = z.normal; eje = n[2] <= n[0] + 0.05 && n[2] <= n[1] + 0.05 ? 'z' : n[0] <= n[1] ? 'x' : 'y'; }
  const mg = eje === 'z' ? m : m.rotate(giro[eje]);
  // el tramo y la ventana (u, v) de la zona en ese marco
  const e0 = aMarco(eje, z.caja.min), e1 = aMarco(eje, z.caja.max), u0 = Math.min(e0[0], e1[0]), u1 = Math.max(e0[0], e1[0]), v0 = Math.min(e0[1], e1[1]), v1 = Math.max(e0[1], e1[1]); let w0 = Math.min(e0[2], e1[2]), w1 = Math.max(e0[2], e1[2]);
  // (un cuello se engorda a lo largo de TODO lo que cuelga, no solo en la base: si no, se partiría un poco más arriba)
  if (z.tipo === 'cuello' && modo !== 'base' && z.wRama != null) { w0 = Math.min(w0, z.wRama); w1 = Math.max(w1, z.wRama); }
  const bb = mg.boundingBox(); w0 = Math.max(w0, bb.min[2] + 0.01); w1 = Math.min(w1, bb.max[2] - 0.01); if (!(w1 - w0 > capa)) N.mal('La zona es demasiado pequeña para reforzarla.');
  const nc = Math.min(1200, Math.max(1, Math.round((w1 - w0) / capa))), h = (w1 - w0) / nc, trozos = [];
  let delta = 0, radioBase = 0; const falta = z.tipo === 'cuello' ? Math.max(1, dur.F * 1.3 / Math.max(z.F, 1e-6)) * (z.viva ? 1 / 1.7 : 1) : 1; // (con la base redondeada ya no hay esquina viva)
  if (z.tipo === 'cuello') { // cuánto hay que engordar el lado fino para llegar a lo pedido (el módulo de la sección va con el cubo del grueso)
    delta = modo === 'base' ? 0 : lim(z.seccion[0] / 2 * (Math.cbrt(falta) - 1) * 1.08 + mas, 0.15, 4); radioBase = lim(Math.max(1, z.seccion[0] * 0.7) + (modo === 'base' ? mas : 0), 0.8, 6); }
  const objetivo = dur.pared + mas, margen = 0.5, lejos = Math.max(4, 3 * objetivo), ventana = CS.square([u1 - u0 + 2 * margen, v1 - v0 + 2 * margen]).translate([u0 - margen, v0 - margen]), grande = CS.square([u1 - u0 + 2 * lejos, v1 - v0 + 2 * lejos]).translate([u0 - lejos, v0 - lejos]);
  for (let i = 0; i < nc; i++) { const w = w0 + (i + 0.5) * h; let s = mg.slice(w); if (s.isEmpty()) continue; let add = null;
    if (z.tipo === 'cuello') { // la isla del cuello: la que contiene (o tiene más cerca) su centro
      const islas = s.decompose(); let mejor = null, dm = Infinity; for (const I of islas) { const b = I.bounds(), cx = lim(z.c[0], b.min[0], b.max[0]), cy = lim(z.c[1], b.min[1], b.max[1]), d = Math.hypot(cx - z.c[0], cy - z.c[1]); if (d < dm) { dm = d; mejor = I; } }
      if (!mejor || dm > Math.max(1, z.seccion[1])) continue;
      const b = mejor.bounds(); if (b.max[0] - b.min[0] > (z.cajaUV[2] - z.cajaUV[0]) * 2.6 + 4 || b.max[1] - b.min[1] > (z.cajaUV[3] - z.cajaUV[1]) * 2.6 + 4) continue; // (ya es el cuerpo: ahí no se engorda)
      // más ancho hacia la base (la sección floja está en z.w; la base queda del otro lado de lo que cuelga)
      const s0 = (w - z.w) * z.haciaW, t = lim(1 - Math.max(0, s0) / Math.max(radioBase, 1e-6), 0, 1), cartela = radioBase * (1 - Math.sqrt(Math.max(0, 1 - t * t))); // (s0 = cuánto nos hemos alejado de la base hacia la punta: cuarto de círculo)
      // lo que falta en ESTE punto: el brazo se acorta hacia la punta, así que hace falta cada vez menos (viga «de igual resistencia»)
      const Lw = Math.max(1e-6, Math.abs((z.wRama ?? z.w) - z.w)), queda = lim(1 - Math.max(0, s0) / Lw, 0, 1), dAqui = modo === 'base' ? 0 : Math.max(0, z.seccion[0] / 2 * (Math.cbrt(falta * queda) - 1) * 1.1 + mas * queda);
      const d = dAqui + cartela; if (d < 0.05) continue; add = mejor.offset(d, 'Round', 2, 24);
    } else { // una pared: solo lo más fino que el objetivo, dentro de la ventana de la zona
      // «fino» = lo que desaparece al encoger la capa medio objetivo y volver a crecerla. Se mira en un trozo amplio de la capa (para
      // que el corte de la ventana no parezca una pared fina) y se queda lo que cae en la zona; eso se engorda lo que le falta por
      // cada lado
      const loc = s.intersect(grande); if (loc.isEmpty()) continue; const r = objetivo / 2 * 0.97, gordo = loc.offset(-r, 'Round', 2, 16).offset(r, 'Round', 2, 16), fino = loc.subtract(gordo.offset(0.03, 'Round', 2, 8)).intersect(ventana); if (fino.isEmpty() || fino.area() < 0.02) continue;
      add = fino.offset((objetivo - z.min) / 2 + 0.04, 'Round', 2, 16); }
    if (!add || add.isEmpty()) continue; trozos.push(add.extrude(h + 0.02).translate([0, 0, w - h / 2 - 0.01]));
  }
  if (!trozos.length) N.mal('No he encontrado qué engordar en esa zona (puede que ya esté reforzada).');
  let extra = N.union(trozos); if (eje !== 'z') extra = extra.rotate(vuelta[eje]);
  const nuevo = m.add(extra), añadido = nuevo.volume() - m.volume();
  if (!(añadido > 0.5)) N.mal('Esa zona ya tiene el grueso que le pides.');
  return { m: nuevo, añadido, capas: trozos.length, delta, eje };
}
