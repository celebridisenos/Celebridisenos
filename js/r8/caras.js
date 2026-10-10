// ================= v20.2 · 🧊 CelebriR8 · CARAS: elegir una cara y trabajar sobre ella (como en Fusion) =================
// La dueña (10-10-2026): «ni siquiera aquí puedo seleccionar una cara… no se puede hacer desfase… no te deja extruir ni
// cortar». Con esto, al tocar una pieza en modo «Cara» se coge la CARA PLANA ENTERA (todos los triángulos que están en el
// mismo plano y se tocan), con su contorno (y sus agujeros), su plano y su área. Sobre ella: empujar/tirar, boceto encima,
// plano de construcción, medir y «poner esta cara en la cama» (como en Bambu Studio).
// Todo en milímetros y en el mundo (ya con la matriz de la pieza).

const q = 1e4; // 1/10 000 de mm para unir esquinas repetidas
const k3 = (x, y, z) => Math.round(x * q) + ',' + Math.round(y * q) + ',' + Math.round(z * q);
const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Los dos ejes del plano: «u» lo más parecido a X (o a Y si la cara mira hacia X) y «v» = n × u
export function baseDe(n, o) {
  n = unit(n); const a = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(resta(a, n.map(x => x * punto(a, n)))), v = cruz(n, u);
  return { o: o.slice(), u, v, n };
}
export const a2D = (B, p) => { const d = resta(p, B.o); return [punto(d, B.u), punto(d, B.v)]; };
export const a3D = (B, x, y, z = 0) => [0, 1, 2].map(k => B.o[k] + B.u[k] * x + B.v[k] * y + B.n[k] * z);

// vista = { pos, idx } (de la pantalla, en el sitio LOCAL de la pieza) · tri = nº de triángulo tocado · M = matriz (16, por columnas)
export function caraPlana(vista, tri, M) {
  const P = vista.pos, I = vista.idx, nt = I.length / 3, nv = P.length / 3;
  const W = new Float64Array(nv * 3);
  for (let i = 0; i < nv; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; for (let k = 0; k < 3; k++) W[i * 3 + k] = M[k] * x + M[4 + k] * y + M[8 + k] * z + M[12 + k]; }
  const vtx = i => [W[i * 3], W[i * 3 + 1], W[i * 3 + 2]];
  const normal = t => { const a = vtx(I[t * 3]), b = vtx(I[t * 3 + 1]), c = vtx(I[t * 3 + 2]); const n = cruz(resta(b, a), resta(c, a)); const l = Math.hypot(...n); return { n: l ? n.map(x => x / l) : [0, 0, 1], area: l / 2, a }; };
  const s = normal(tri), n0 = s.n, d0 = punto(n0, s.a);
  // 1) los candidatos: triángulos en el MISMO plano (normal igual y a menos de 0,01 mm)
  const cand = new Uint8Array(nt), nrm = new Float32Array(nt * 3);
  for (let t = 0; t < nt; t++) { const r = normal(t); nrm[t * 3] = r.n[0]; nrm[t * 3 + 1] = r.n[1]; nrm[t * 3 + 2] = r.n[2]; if (punto(r.n, n0) > 0.9999 && Math.abs(punto(r.n, r.a) - d0) < 0.01) cand[t] = 1; }
  // 2) los que se tocan con el tocado (por sus esquinas, a 1/10 000 mm)
  const porVertice = new Map();
  for (let t = 0; t < nt; t++) if (cand[t]) for (let j = 0; j < 3; j++) { const v = I[t * 3 + j], k = k3(W[v * 3], W[v * 3 + 1], W[v * 3 + 2]); let L = porVertice.get(k); if (!L) porVertice.set(k, L = []); L.push(t); }
  const enCara = new Uint8Array(nt), cola = [tri]; enCara[tri] = 1; const tris = [];
  while (cola.length) {
    const t = cola.pop(); tris.push(t);
    for (let j = 0; j < 3; j++) { const v = I[t * 3 + j]; (porVertice.get(k3(W[v * 3], W[v * 3 + 1], W[v * 3 + 2])) || []).forEach(u => { if (!enCara[u]) { enCara[u] = 1; cola.push(u); } }); }
  }
  // 3) el contorno: las aristas que solo usa UN triángulo de la cara, encadenadas en anillos (con el giro de los triángulos)
  const usos = new Map(), K = v => k3(W[v * 3], W[v * 3 + 1], W[v * 3 + 2]);
  let area = 0; const cen = [0, 0, 0];
  tris.forEach(t => {
    const r = normal(t); area += r.area; const g = [0, 1, 2].map(j => vtx(I[t * 3 + j]));
    for (let k = 0; k < 3; k++) cen[k] += (g[0][k] + g[1][k] + g[2][k]) / 3 * r.area;
    for (let j = 0; j < 3; j++) { const a = I[t * 3 + j], b = I[t * 3 + (j + 1) % 3], ka = K(a), kb = K(b), clave = ka < kb ? ka + '|' + kb : kb + '|' + ka; const x = usos.get(clave); if (x) x.n++; else usos.set(clave, { n: 1, de: ka, a: kb, pa: vtx(a), pb: vtx(b) }); }
  });
  const sig = new Map(); usos.forEach(x => { if (x.n === 1) sig.set(x.de, x); });
  const anillos3D = [], vistos = new Set();
  sig.forEach((x, k0) => {
    if (vistos.has(k0)) return; const r = []; let k = k0, guard = 0;
    while (sig.has(k) && !vistos.has(k) && guard++ < 200000) { const e = sig.get(k); vistos.add(k); r.push(e.pa); k = e.a; }
    if (r.length >= 3) anillos3D.push(r);
  });
  const o = area > 0 ? cen.map(x => x / area) : s.a, B = baseDe(n0, o);
  // ¿curva? si sus vecinas casi planas (≤ 20°) siguen mucho más allá, la cara tocada es un trocito de una superficie curva
  let suaves = 0;
  for (let t = 0; t < nt && suaves < 50; t++) { if (enCara[t]) continue; const c = nrm[t * 3] * n0[0] + nrm[t * 3 + 1] * n0[1] + nrm[t * 3 + 2] * n0[2]; if (c > 0.94 && c < 0.9999) { const a = vtx(I[t * 3]); if (Math.hypot(...resta(a, s.a)) < Math.sqrt(area) * 2 + 2) suaves++; } }
  const curva = tris.length <= 4 && suaves >= 6;
  const T3 = new Float32Array(tris.length * 9); tris.forEach((t, i) => { for (let j = 0; j < 3; j++) { const v = I[t * 3 + j]; T3[i * 9 + j * 3] = W[v * 3]; T3[i * 9 + j * 3 + 1] = W[v * 3 + 1]; T3[i * 9 + j * 3 + 2] = W[v * 3 + 2]; } });
  return { base: B, n: n0, o, area, curva, triangulos: tris.length, tris: T3, bordes: anillos3D, anillos: anillos3D.map(r => r.map(p => a2D(B, p))) };
}

// Giro que lleva la normal «n» a «hacia» (para «poner esta cara en la cama»: hacia = [0, 0, -1]) como cuaternión [x,y,z,w]
export function giroEntre(n, hacia) {
  n = unit(n); hacia = unit(hacia); const c = punto(n, hacia);
  if (c > 0.999999) return [0, 0, 0, 1];
  if (c < -0.999999) { const ax = unit(Math.abs(n[0]) < 0.9 ? cruz(n, [1, 0, 0]) : cruz(n, [0, 1, 0])); return [ax[0], ax[1], ax[2], 0]; }
  const ax = cruz(n, hacia), w = 1 + c, l = Math.hypot(ax[0], ax[1], ax[2], w); return [ax[0] / l, ax[1] / l, ax[2] / l, w / l];
}
