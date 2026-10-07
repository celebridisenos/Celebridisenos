// ================= v12.8 · Modelo 3D ligero para la tienda (formato CDM1) =================
// Convierte el STL/3MF/OBJ REAL del producto en una versión ligera (≤ 30 000 triángulos, ≤ ~400 KB) que la web enseña en 3D.
// No se inventa nada: es la misma forma, con menos detalle fino (agrupa los vértices en una rejilla y quita los triángulos que se aplastan).
// Formato: 'CDM1' | u32 nV | u32 nT | f32×6 caja (mín/máx en mm) | nV×3 u16 (posición dentro de la caja) | nT×3 u16 (índices)
import { parse3D } from './stl.js';

export const MAX_TRIS = 30000, MAX_BYTES = 700 * 1024;
const REJILLAS = [4096, 220, 180, 150, 128, 104, 84, 68, 54, 42, 32];

export function aCDM(pos, opts = {}) {
  const maxT = opts.maxTris || MAX_TRIS, cnt = pos.length / 3;
  if (cnt < 3) throw new Error('El modelo no tiene triángulos.');
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < cnt; i++) for (let k = 0; k < 3; k++) { const v = pos[i * 3 + k]; if (!Number.isFinite(v)) throw new Error('El modelo tiene valores dañados.'); if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
  const size = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  if (!(size > 0)) throw new Error('El modelo no tiene tamaño.');
  let mejor = null;
  for (const G of REJILLAS) {
    const cell = size / G, map = new Map(), cid = new Int32Array(cnt), sx = [], sy = [], sz = [], sn = [];
    const stride = G + 2;
    for (let i = 0; i < cnt; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const key = (Math.floor((x - mn[0]) / cell) * stride + Math.floor((y - mn[1]) / cell)) * stride + Math.floor((z - mn[2]) / cell);
      let id = map.get(key); if (id === undefined) { id = sx.length; map.set(key, id); sx.push(0); sy.push(0); sz.push(0); sn.push(0); }
      cid[i] = id; sx[id] += x; sy[id] += y; sz[id] += z; sn[id]++;
    }
    const remap = new Int32Array(sx.length).fill(-1), tri = []; let nV = 0;
    for (let t = 0; t < cnt; t += 3) {
      const a = cid[t], b = cid[t + 1], c = cid[t + 2];
      if (a === b || b === c || a === c) continue;
      for (const q of [a, b, c]) if (remap[q] < 0) remap[q] = nV++;
      tri.push(remap[a], remap[b], remap[c]);
    }
    const nT = tri.length / 3;
    mejor = { G, nV, nT, tri, remap, sx, sy, sz, sn };
    if (nT <= maxT && nV <= 40000) break;
  }
  const { nV, nT, tri, remap, sx, sy, sz, sn } = mejor;
  if (nT < 4 || nV < 4) throw new Error('El modelo es demasiado pequeño o plano para una vista 3D.');
  if (nV > 65535) throw new Error('El modelo es demasiado complejo.');
  const out = new Uint8Array(36 + nV * 6 + nT * 6), dv = new DataView(out.buffer);
  out.set([67, 68, 77, 49], 0); dv.setUint32(4, nV, true); dv.setUint32(8, nT, true);
  for (let k = 0; k < 3; k++) { dv.setFloat32(12 + k * 4, mn[k], true); dv.setFloat32(24 + k * 4, mx[k], true); }
  for (let id = 0; id < remap.length; id++) {
    const r = remap[id]; if (r < 0) continue;
    const p = [sx[id] / sn[id], sy[id] / sn[id], sz[id] / sn[id]];
    for (let k = 0; k < 3; k++) { const span = mx[k] - mn[k] || 1; dv.setUint16(36 + (r * 3 + k) * 2, Math.max(0, Math.min(65535, Math.round((p[k] - mn[k]) / span * 65535))), true); }
  }
  const io = 36 + nV * 6; for (let i = 0; i < tri.length; i++) dv.setUint16(io + i * 2, tri[i], true);
  if (out.length > MAX_BYTES) throw new Error('El modelo ligero pesa demasiado (' + Math.round(out.length / 1024) + ' KB).');
  return { bytes: out, vertices: nV, triangulos: nT, original: cnt / 3, rejilla: mejor.G, dims: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
}

// Lectura (la misma que hace la tienda): sirve para la vista previa y para comprobar que lo preparado es válido
export function leerCDM(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length < 60 || String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'CDM1') throw new Error('No es un modelo CDM1.');
  const nV = dv.getUint32(4, true), nT = dv.getUint32(8, true);
  if (!nV || !nT || nV > 65535 || b.length !== 36 + nV * 6 + nT * 6) throw new Error('Modelo CDM1 dañado.');
  const box = []; for (let i = 0; i < 6; i++) box.push(dv.getFloat32(12 + i * 4, true));
  const V = new Float32Array(nV * 3); for (let i = 0; i < nV; i++) for (let k = 0; k < 3; k++) V[i * 3 + k] = box[k] + dv.getUint16(36 + (i * 3 + k) * 2, true) / 65535 * (box[k + 3] - box[k]);
  const io = 36 + nV * 6, pos = new Float32Array(nT * 9);
  for (let t = 0; t < nT * 3; t++) { const v = dv.getUint16(io + t * 2, true); if (v >= nV) throw new Error('Modelo CDM1 dañado.'); pos.set(V.subarray(v * 3, v * 3 + 3), t * 3); }
  return { pos, dims: [box[3] - box[0], box[4] - box[1], box[5] - box[2]], triangulos: nT };
}

export function aBase64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

// Del archivo 3D del producto a lo que se manda a la tienda
export async function prepararModelo(buf, nombre) {
  const r = aCDM(await parse3D(buf, nombre));
  return { datos: aBase64(r.bytes), tris: r.triangulos, verts: r.vertices, original: r.original, kb: Math.round(r.bytes.length / 1024), dims: r.dims, rejilla: r.rejilla, bytes: r.bytes };
}
