// ================= v20 · 🔬 CelebriR8 · ANÁLISIS DE MALLAS EN LA PROPIA PANTALLA =================
// Para cualquier malla, también ROTA (la que Manifold no acepta): se sueldan los vértices y se cuentan agujeros (bordes
// abiertos), aristas raras (más de dos caras), piezas sueltas, caras al revés, volumen y área. Y la ORIENTACIÓN: para
// cada forma de apoyarla en la cama, cuánta superficie queda en voladizo (necesita soporte), cuánto apoya y lo alta que
// queda. Todo son MEDIDAS de la malla (no estimaciones), salvo lo que se marca como estimado (gramos, tiempo).
// Una «sopa» es Float32Array con x,y,z de cada vértice de cada triángulo (9 números por triángulo), como da stl.js.

// ---------- soldar: sopa → vértices + triángulos ----------
export function suelda(sopa, q = 1e5) { // 0,00001 mm: une los puntos repetidos sin juntar dos distintos (con 1e4 una figura de TripoSR salía con 2 aristas raras que no tiene)
  const n = sopa.length / 3, mapa = new Map(), V = [], T = new Uint32Array(n);
  for (let i = 0; i < n; i++) { const x = sopa[i * 3], y = sopa[i * 3 + 1], z = sopa[i * 3 + 2], k = Math.round(x * q) + ',' + Math.round(y * q) + ',' + Math.round(z * q); let id = mapa.get(k); if (id === undefined) { id = V.length / 3; mapa.set(k, id); V.push(x, y, z); } T[i] = id; }
  const buenos = []; let degeneradas = 0;
  for (let t = 0; t < n; t += 3) { if (T[t] !== T[t + 1] && T[t + 1] !== T[t + 2] && T[t] !== T[t + 2]) buenos.push(T[t], T[t + 1], T[t + 2]); else degeneradas++; }
  return { V: new Float32Array(V), T: new Uint32Array(buenos), degeneradas };
}

// ---------- normales suaves con aristas vivas (lo mismo que N.aVista, pero para cualquier malla) ----------
export function vista(M, angulo = 38, colores) {
  const { V, T } = M, k = 3, nv = V.length / 3, nt = T.length / 3, cosA = Math.cos(angulo * Math.PI / 180);
  const fn = new Float64Array(nt * 3), fu = new Float32Array(nt * 3);
  for (let f = 0; f < nt; f++) { const a = T[f * 3] * k, b = T[f * 3 + 1] * k, c = T[f * 3 + 2] * k, ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2]; const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx, l = Math.hypot(x, y, z) || 1; fn[f * 3] = x; fn[f * 3 + 1] = y; fn[f * 3 + 2] = z; fu[f * 3] = x / l; fu[f * 3 + 1] = y / l; fu[f * 3 + 2] = z / l; }
  const cu = new Uint32Array(nv + 1); for (let i = 0; i < T.length; i++) cu[T[i] + 1]++; for (let i = 0; i < nv; i++) cu[i + 1] += cu[i];
  const ca = new Uint32Array(T.length), ll = cu.slice(0, nv); for (let i = 0; i < T.length; i++) ca[ll[T[i]]++] = (i / 3) | 0;
  const pos = [], nor = [], col = colores ? [] : null, idx = new Uint32Array(T.length), us = new Map();
  for (let i = 0; i < T.length; i++) {
    const v = T[i], f = (i / 3) | 0; let x = 0, y = 0, z = 0;
    for (let j = cu[v]; j < cu[v + 1]; j++) { const g = ca[j]; if (fu[f * 3] * fu[g * 3] + fu[f * 3 + 1] * fu[g * 3 + 1] + fu[f * 3 + 2] * fu[g * 3 + 2] >= cosA) { x += fn[g * 3]; y += fn[g * 3 + 1]; z += fn[g * 3 + 2]; } }
    const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
    let L = us.get(v), n = -1; if (L) for (const q of L) if (Math.abs(nor[q * 3] - x) < 1e-4 && Math.abs(nor[q * 3 + 1] - y) < 1e-4 && Math.abs(nor[q * 3 + 2] - z) < 1e-4) { n = q; break; }
    if (n < 0) { n = pos.length / 3; pos.push(V[v * 3], V[v * 3 + 1], V[v * 3 + 2]); nor.push(x, y, z); if (col) col.push(colores[v * 3], colores[v * 3 + 1], colores[v * 3 + 2]); if (L) L.push(n); else us.set(v, [n]); }
    idx[i] = n;
  }
  const r = { pos: new Float32Array(pos), nor: new Float32Array(nor), idx }; if (col) r.col = new Float32Array(col); return r;
}
export const vistaDeSopa = (sopa, angulo) => vista(suelda(sopa), angulo);

// ---------- caja, volumen, área ----------
export function caja(V) { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < V.length; i += 3) for (let a = 0; a < 3; a++) { const v = V[i + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; } return { min: mn, max: mx, dims: mx.map((v, a) => v - mn[a]) }; }

// ---------- la revisión ----------
export function revisa(M) {
  const { V, T } = M, nt = T.length / 3, aristas = new Map();
  const clave = (a, b) => a < b ? a * 4294967296 + b : b * 4294967296 + a;
  let vol = 0, area = 0, invertidas = 0; const af = new Float64Array(nt);
  for (let f = 0; f < nt; f++) {
    const a = T[f * 3], b = T[f * 3 + 1], c = T[f * 3 + 2];
    for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = clave(p, q), e = aristas.get(k); if (!e) aristas.set(k, { n: 1, dir: p < q ? 1 : -1 }); else { e.n++; e.dir += p < q ? 1 : -1; } }
    const ax = V[a * 3], ay = V[a * 3 + 1], az = V[a * 3 + 2], bx = V[b * 3], by = V[b * 3 + 1], bz = V[b * 3 + 2], cx = V[c * 3], cy = V[c * 3 + 1], cz = V[c * 3 + 2];
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az; const a1 = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2; area += a1; af[f] = a1;
  }
  let abiertos = 0, raros = 0; aristas.forEach(e => { if (e.n === 1) abiertos++; else if (e.n > 2) raros++; else if (e.dir !== 0) invertidas++; });
  // piezas: unión por vértices compartidos
  const pad = new Int32Array(V.length / 3).map((_, i) => i), raiz = x => { while (pad[x] !== x) { pad[x] = pad[pad[x]]; x = pad[x]; } return x; };
  for (let i = 0; i < T.length; i += 3) { const r0 = raiz(T[i]); pad[raiz(T[i + 1])] = r0; pad[raiz(T[i + 2])] = r0; }
  // cada pieza con su SUPERFICIE: un «trocito suelto» es la que no llega al 1 % (lo mismo que Blender y el motor 3D)
  const tam = new Map(); for (let f = 0; f < nt; f++) { const r = raiz(T[f * 3]); tam.set(r, (tam.get(r) || 0) + af[f]); }
  const piezas = [...tam.values()].sort((x, y) => y - x), migas = piezas.filter(a => a < area * 0.01).length;
  const C = caja(V);
  return { caras: nt, vertices: V.length / 3, degeneradas: M.degeneradas || 0, bordes_abiertos: abiertos, bordes_raros: raros, caras_al_reves: invertidas, estanca: abiertos === 0 && raros === 0, piezas: piezas.length, migas, volumen_cm3: abiertos === 0 ? Math.abs(vol) / 1000 : null, volumen_signo: Math.sign(vol), area_cm2: area / 100, dims: C.dims, min: C.min, max: C.max };
}

// ---------- ORIENTACIÓN: las 6 caras de la caja (y la actual) ----------
// Para cada giro: área en voladizo (caras mirando hacia abajo más de 90°−umbral que no están en la cama), área que apoya
// en la cama, alto. Medido sobre la malla; el soporte real depende del laminador (por eso se dice «aprox.»).
export const GIROS = [{ k: 'tal', t: 'Como está', r: [0, 0, 0] }, { k: 'boca', t: 'Boca abajo', r: [180, 0, 0] }, { k: 'frente', t: 'Sobre su frente', r: [-90, 0, 0] }, { k: 'espalda', t: 'Sobre su espalda', r: [90, 0, 0] }, { k: 'izq', t: 'Sobre su lado izquierdo', r: [0, 90, 0] }, { k: 'der', t: 'Sobre su lado derecho', r: [0, -90, 0] }];
function gira(V, r) {
  const [ax, ay, az] = r.map(g => g * Math.PI / 180), out = new Float32Array(V.length), cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
  for (let i = 0; i < V.length; i += 3) { let x = V[i], y = V[i + 1], z = V[i + 2]; let y1 = y * cx - z * sx, z1 = y * sx + z * cx; y = y1; z = z1; let x1 = x * cy + z * sy; z1 = -x * sy + z * cy; x = x1; z = z1; x1 = x * cz - y * sz; y1 = x * sz + y * cz; out[i] = x1; out[i + 1] = y1; out[i + 2] = z; }
  return out;
}
// umbral = «Ángulo de umbral» de Bambu Studio (30° en sus perfiles): una cara que mira hacia abajo y está a MENOS de esos
// grados de la horizontal necesita soporte. Las caras que tocan la cama (z < 0,2 mm) no cuentan.
export function orientaciones(M, umbral = 30) {
  const { T } = M, nt = T.length / 3, cosU = Math.cos(umbral * Math.PI / 180);
  return GIROS.map(G => {
    const V = gira(M.V, G.r), C = caja(V), z0 = C.min[2]; let voladizo = 0, apoyo = 0, zv = 0;
    const marcadas = [];
    for (let f = 0; f < nt; f++) {
      const a = T[f * 3] * 3, b = T[f * 3 + 1] * 3, c = T[f * 3 + 2] * 3, ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz); if (!l) continue; const ar = l / 2, cz = nz / l, zm = Math.min(V[a + 2], V[b + 2], V[c + 2]) - z0;
      if (cz < -0.999 && zm < 0.05) apoyo += ar;
      else if (cz < -cosU && zm > 0.2) { voladizo += ar; zv += ar * zm; marcadas.push(f); }
    }
    return { k: G.k, t: G.t, r: G.r, voladizo_cm2: voladizo / 100, apoyo_cm2: apoyo / 100, alto: C.dims[2], dims: C.dims, marcadas };
  });
}
// la mejor: poco voladizo, buen apoyo, no muy alta (el texto explica por qué)
export function mejorOrientacion(L, area_cm2) {
  const nota = o => o.voladizo_cm2 / Math.max(1, area_cm2) * 100 * 3 + (o.apoyo_cm2 < 0.5 ? 25 : o.apoyo_cm2 < 2 ? 8 : 0) + o.alto / 40;
  const ord = L.slice().sort((a, b) => nota(a) - nota(b)); return { mejor: ord[0], orden: ord.map(o => o.k), nota };
}

// ---------- la malla de una orientación, apoyada en la cama y centrada (para exportar o enseñar) ----------
export function giraSopa(sopa, r) { const V = gira(sopa, r), C = caja(V), cx = (C.min[0] + C.max[0]) / 2, cy = (C.min[1] + C.max[1]) / 2; for (let i = 0; i < V.length; i += 3) { V[i] -= cx; V[i + 1] -= cy; V[i + 2] -= C.min[2]; } return V; }
export function giraMalla(M, r) { const V = giraSopa(M.V, r); return { V, T: M.T }; }
export function aSopa(M) { const s = new Float32Array(M.T.length * 3); for (let i = 0; i < M.T.length; i++) { s[i * 3] = M.V[M.T[i] * 3]; s[i * 3 + 1] = M.V[M.T[i] * 3 + 1]; s[i * 3 + 2] = M.V[M.T[i] * 3 + 2]; } return s; }
// las caras marcadas (voladizos) como malla aparte, para pintarlas en rojo
export function subMalla(M, caras) { const T = new Uint32Array(caras.length * 3); caras.forEach((f, i) => { T[i * 3] = M.T[f * 3]; T[i * 3 + 1] = M.T[f * 3 + 1]; T[i * 3 + 2] = M.T[f * 3 + 2]; }); return { V: M.V, T }; }

// ---------- STL binario ----------
export function stlDeSopa(sopa, nombre = 'CelebriR8') {
  const nt = sopa.length / 9, b = new ArrayBuffer(84 + nt * 50), dv = new DataView(b), u8 = new Uint8Array(b);
  const cab = ('CelebriR8 · ' + nombre).slice(0, 79); for (let i = 0; i < cab.length; i++) u8[i] = cab.charCodeAt(i) & 0x7f;
  dv.setUint32(80, nt, true);
  for (let t = 0; t < nt; t++) { const o = 84 + t * 50, p = t * 9; const ux = sopa[p + 3] - sopa[p], uy = sopa[p + 4] - sopa[p + 1], uz = sopa[p + 5] - sopa[p + 2], vx = sopa[p + 6] - sopa[p], vy = sopa[p + 7] - sopa[p + 1], vz = sopa[p + 8] - sopa[p + 2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true); for (let j = 0; j < 9; j++) dv.setFloat32(o + 12 + j * 4, sopa[p + j], true); }
  return new Uint8Array(b);
}
// la sopa de un STL (binario o de texto), sin más dependencias
export async function sopaDe(u8, nombre = 'modelo.stl') { const { parse3D } = await import('../stl.js'); return parse3D(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength), nombre); }

// ---------- colores de desviación (verde = igual · amarillo · rojo = se ha movido) ----------
export function coloresDesviacion(d, tope) { const c = new Float32Array(d.length * 3); for (let i = 0; i < d.length; i++) { const t = Math.min(1, d[i] / tope); const r = t < 0.5 ? t * 2 : 1, g = t < 0.5 ? 0.85 : 0.85 * (1 - (t - 0.5) * 2); c[i * 3] = 0.15 + 0.85 * r; c[i * 3 + 1] = 0.25 + 0.6 * g; c[i * 3 + 2] = 0.3 * (1 - t); } return c; }
// distancia de cada vértice de B a la superficie más cercana de A (aproximada por vértices de A; rejilla de búsqueda)
export function desviacion(A, B, paso) {
  const C = caja(A.V), cel = paso || Math.max(0.5, Math.max(...C.dims) / 120), grid = new Map(), key = (x, y, z) => x + ',' + y + ',' + z;
  for (let i = 0; i < A.V.length; i += 3) { const k = key(Math.floor(A.V[i] / cel), Math.floor(A.V[i + 1] / cel), Math.floor(A.V[i + 2] / cel)); let L = grid.get(k); if (!L) grid.set(k, L = []); L.push(i); }
  const d = new Float32Array(B.V.length / 3);
  for (let j = 0; j < B.V.length; j += 3) {
    const x = B.V[j], y = B.V[j + 1], z = B.V[j + 2], gx = Math.floor(x / cel), gy = Math.floor(y / cel), gz = Math.floor(z / cel); let best = Infinity;
    // anillos de celdas hasta encontrarlo (antes paraba a 6: un punto a 5 mm salía «infinito»)
    for (let r = 0; r < 400 && best > Math.pow(Math.max(0, r - 1) * cel, 2); r++) { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) { if (Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) !== r) continue; const L = grid.get(key(gx + a, gy + b, gz + c)); if (L) for (const i of L) { const e = (A.V[i] - x) ** 2 + (A.V[i + 1] - y) ** 2 + (A.V[i + 2] - z) ** 2; if (e < best) best = e; } } }
    d[j / 3] = Math.sqrt(best);
  }
  return d;
}

// ---------- dónde están los agujeros: el centro de los bordes abiertos (para marcarlos en la vista) ----------
export function puntosBorde(M, max = 200) {
  const { V, T } = M, cuenta = new Map(), clave = (a, b) => a < b ? a * 4294967296 + b : b * 4294967296 + a;
  for (let i = 0; i < T.length; i += 3) for (const [p, q] of [[T[i], T[i + 1]], [T[i + 1], T[i + 2]], [T[i + 2], T[i]]]) { const k = clave(p, q); const e = cuenta.get(k); if (e) e.n++; else cuenta.set(k, { n: 1, p, q }); }
  const L = []; cuenta.forEach(e => { if (e.n === 1) L.push([(V[e.p * 3] + V[e.q * 3]) / 2, (V[e.p * 3 + 1] + V[e.q * 3 + 1]) / 2, (V[e.p * 3 + 2] + V[e.q * 3 + 2]) / 2]); });
  if (L.length <= max) return L; const paso = L.length / max, out = []; for (let i = 0; i < max; i++) out.push(L[Math.floor(i * paso)]); return out;
}

// ---------- el mapa de cambios POR CARAS: cada cara se mide en su centro (una tapa nueva sobre un agujero no tiene puntos
// propios: medida por vértices saldría «igual»). Devuelve una vista sin índices, con el color de cada cara ----------
export function vistaMapa(Morig, M, tope = 0.5) {
  const { V, T } = M, nt = T.length / 3, C = new Float32Array(nt * 3);
  for (let f = 0; f < nt; f++) for (let a = 0; a < 3; a++) C[f * 3 + a] = (V[T[f * 3] * 3 + a] + V[T[f * 3 + 1] * 3 + a] + V[T[f * 3 + 2] * 3 + a]) / 3;
  // el original, más denso: sus vértices y los centros de sus caras (para no confundir «lejos de un vértice» con «fuera de la superficie»)
  const no = Morig.T.length / 3, Vo = new Float32Array(Morig.V.length + no * 3); Vo.set(Morig.V);
  for (let f = 0; f < no; f++) for (let a = 0; a < 3; a++) Vo[Morig.V.length + f * 3 + a] = (Morig.V[Morig.T[f * 3] * 3 + a] + Morig.V[Morig.T[f * 3 + 1] * 3 + a] + Morig.V[Morig.T[f * 3 + 2] * 3 + a]) / 3;
  const d = desviacion({ V: Vo, T: new Uint32Array(0) }, { V: C, T: new Uint32Array(0) }), col = coloresDesviacion(d, tope);
  const pos = new Float32Array(nt * 9), nor = new Float32Array(nt * 9), cc = new Float32Array(nt * 9), idx = new Uint32Array(nt * 3);
  for (let f = 0; f < nt; f++) {
    const a = T[f * 3] * 3, b = T[f * 3 + 1] * 3, c = T[f * 3 + 2] * 3, ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    [a, b, c].forEach((p, k) => { const o = (f * 3 + k) * 3; pos[o] = V[p]; pos[o + 1] = V[p + 1]; pos[o + 2] = V[p + 2]; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz; cc[o] = col[f * 3]; cc[o + 1] = col[f * 3 + 1]; cc[o + 2] = col[f * 3 + 2]; idx[f * 3 + k] = f * 3 + k; });
  }
  let mx = 0; for (let i = 0; i < d.length; i++) if (d[i] > mx) mx = d[i];
  return { vista: { pos, nor, col: cc, idx }, max: mx };
}
