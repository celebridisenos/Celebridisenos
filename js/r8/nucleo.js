// ================= v20 · 🧊 CelebriR8 · NÚCLEO 3D: sólidos de verdad =================
// La dueña (9-10-2026): «estoy acostumbrada a Fusion: que pueda hacer un boceto, medir, extruir, añadir formas, partir una
// pieza con conectores como en Bambu pero mejorado». Para eso hace falta un motor que UNA, RESTE y CORTE piezas sin romper
// la malla. Es Manifold (Apache-2.0, vendor/manifold): lo mismo que usa por dentro OpenSCAD. Todo pasa en este aparato.
//
// Convenio de todo CelebriR8: milímetros, Z hacia arriba, la pieza apoyada en Z = 0 y centrada en X e Y.
// Memoria: Manifold vive fuera de JavaScript y no se borra solo. Todo lo que se crea entra en «vivos»; quien quiera
// conservar algo lo saca con guarda() y, cuando ya no lo quiera, lo borra con suelta(). limpia() borra el resto.
import Module from '../../vendor/manifold/manifold.js';
import { texto, forma, ENCAJES, circulo, rectR, stlBinario, zip } from './motor.js';
import earcut from '../../vendor/earcut/earcut.js';

let W = null, prom = null;
const vivos = new Set();
const apunta = r => { if (r && typeof r === 'object') { if (Array.isArray(r)) r.forEach(apunta); else if (typeof r.delete === 'function') vivos.add(r); } return r; };
const envuelve = (o, nombres) => nombres.forEach(n => { const f = o[n]; if (typeof f === 'function') o[n] = function (...a) { return apunta(f.apply(this, a)); }; });

export function cargar() {
  return prom || (prom = Module().then(w => {
    w.setup();
    envuelve(w.Manifold, ['cube', 'cylinder', 'sphere', 'tetrahedron', 'extrude', 'revolve', 'compose', 'union', 'difference', 'intersection', 'levelSet', 'smooth', 'ofMesh', 'hull']);
    envuelve(w.Manifold.prototype, ['add', 'subtract', 'intersect', 'decompose', 'warp', 'transform', 'translate', 'rotate', 'scale', 'mirror', 'calculateNormals', 'refine', 'refineToLength', 'setProperties', 'setTolerance', 'simplify', 'asOriginal', 'trimByPlane', 'split', 'splitByPlane', 'slice', 'project', 'hull', 'minkowskiSum', 'minkowskiDifference', 'smoothOut']);
    envuelve(w.CrossSection, ['square', 'circle', 'union', 'difference', 'intersection', 'compose', 'ofPolygons', 'hull']);
    envuelve(w.CrossSection.prototype, ['add', 'subtract', 'intersect', 'rectClip', 'decompose', 'transform', 'translate', 'rotate', 'scale', 'mirror', 'simplify', 'offset', 'hull', 'extrude', 'revolve']);
    W = w; return w;
  }));
}
export const listo = () => !!W;
export const MF = () => w().Manifold; // para los diseños del catálogo
export const CSX = () => w().CrossSection;
const w = () => { if (!W) throw new Error('El motor 3D todavía se está cargando.'); return W; };
export const guarda = o => { vivos.delete(o); return o; };
export const protegidas = new WeakSet(); // piezas de la caché del proyecto: nadie las borra por su cuenta
export const suelta = o => { if (o && typeof o.delete === 'function' && !protegidas.has(o)) { vivos.delete(o); try { o.delete(); } catch (e) { } } };
export const sueltaCache = o => { if (o) { protegidas.delete(o); suelta(o); } };
export function limpia() { for (const o of vivos) { try { o.delete(); } catch (e) { } } vivos.clear(); }
export const cuantosVivos = () => vivos.size;
export const mal = t => { const e = new Error(t); e.r8 = 1; throw e; };

// ---------- de y a «sopa de triángulos» (lo que usa motor.js y los STL) ----------
// Une los vértices repetidos (a 1/10 000 de mm) para que Manifold vea una pieza cerrada.
export function deSopa(p) {
  const n = p.length / 3, mapa = new Map(), vert = [], tri = new Uint32Array(n), q = 1e4;
  for (let i = 0; i < n; i++) {
    const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2], k = Math.round(x * q) + ',' + Math.round(y * q) + ',' + Math.round(z * q);
    let id = mapa.get(k); if (id === undefined) { id = vert.length / 3; mapa.set(k, id); vert.push(x, y, z); } tri[i] = id;
  }
  // fuera los triángulos que se quedan en una línea (dos vértices iguales)
  const buenos = []; for (let t = 0; t < n; t += 3) if (tri[t] !== tri[t + 1] && tri[t + 1] !== tri[t + 2] && tri[t] !== tri[t + 2]) buenos.push(tri[t], tri[t + 1], tri[t + 2]);
  const mesh = new (w().Mesh)({ numProp: 3, vertProperties: new Float32Array(vert), triVerts: new Uint32Array(buenos) });
  try { mesh.merge(); } catch (e) { }
  const m = apunta(new (w().Manifold)(mesh)), st = m.status();
  if (st !== 'NoError' || m.isEmpty()) mal(st === 'NotManifold' ? 'Esa pieza tiene la malla abierta o rota (agujeros o caras sueltas): se puede ver y cortar, pero no unir ni restar.' : 'No he podido leer esa pieza como un sólido.');
  return m;
}
export function aSopa(m) {
  const M = m.getMesh(), P = M.vertProperties, T = M.triVerts, k = M.numProp, o = new Float32Array(T.length * 3);
  for (let i = 0; i < T.length; i++) { const v = T[i] * k; o[i * 3] = P[v]; o[i * 3 + 1] = P[v + 1]; o[i * 3 + 2] = P[v + 2]; }
  return o;
}
// Para pintarla en pantalla: vértices, normales (suaves en las curvas, con arista en las esquinas) e índices
// (las normales van en el canal 0 de Manifold = justo después de x, y, z)
// Las normales se calculan aquí (v20): «calculateNormals» de Manifold tardaba 39 s con el bote de rosca (119 000
// triángulos casi planos en espiral) y congelaba la pantalla. Esto es lineal: cada esquina suma las caras de su vértice
// que no se doblan más de «angulo» grados respecto a la suya (las aristas vivas quedan vivas, lo curvo queda suave).
export function aVista(m, angulo = 38) {
  const M = m.getMesh(), k = M.numProp, V = M.vertProperties, T = M.triVerts, nv = V.length / k, nt = T.length / 3, cosA = Math.cos(angulo * Math.PI / 180);
  const fn = new Float64Array(nt * 3), fu = new Float32Array(nt * 3); // normal de cada cara (con su área) y unitaria
  for (let f = 0; f < nt; f++) {
    const a = T[f * 3] * k, b = T[f * 3 + 1] * k, c = T[f * 3 + 2] * k, ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx, l = Math.hypot(x, y, z) || 1;
    fn[f * 3] = x; fn[f * 3 + 1] = y; fn[f * 3 + 2] = z; fu[f * 3] = x / l; fu[f * 3 + 1] = y / l; fu[f * 3 + 2] = z / l;
  }
  const cuenta = new Uint32Array(nv + 1); for (let i = 0; i < T.length; i++) cuenta[T[i] + 1]++;
  for (let i = 0; i < nv; i++) cuenta[i + 1] += cuenta[i];
  const caras = new Uint32Array(T.length), lleno = cuenta.slice(0, nv); for (let i = 0; i < T.length; i++) caras[lleno[T[i]]++] = (i / 3) | 0;
  // cada vértice puede salir varias veces (una por cada «cara viva» distinta); se reutiliza si la normal es la misma
  const pos = [], nor = [], idx = new Uint32Array(T.length), usados = new Map();
  for (let i = 0; i < T.length; i++) {
    const v = T[i], f = (i / 3) | 0; let x = 0, y = 0, z = 0;
    for (let j = cuenta[v]; j < cuenta[v + 1]; j++) { const g = caras[j]; if (fu[f * 3] * fu[g * 3] + fu[f * 3 + 1] * fu[g * 3 + 1] + fu[f * 3 + 2] * fu[g * 3 + 2] >= cosA) { x += fn[g * 3]; y += fn[g * 3 + 1]; z += fn[g * 3 + 2]; } }
    const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
    let L = usados.get(v), n = -1;
    if (L) for (const q of L) if (Math.abs(nor[q * 3] - x) < 1e-4 && Math.abs(nor[q * 3 + 1] - y) < 1e-4 && Math.abs(nor[q * 3 + 2] - z) < 1e-4) { n = q; break; }
    if (n < 0) { n = pos.length / 3; pos.push(V[v * k], V[v * k + 1], V[v * k + 2]); nor.push(x, y, z); if (L) L.push(n); else usados.set(v, [n]); }
    idx[i] = n;
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx };
}
export function caja(m) { const b = m.boundingBox(); return { min: [b.min[0], b.min[1], b.min[2]], max: [b.max[0], b.max[1], b.max[2]], dims: [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]] }; }
export const vacia = m => !m || m.isEmpty();
export function info(m) { const b = caja(m); return { dims: b.dims, min: b.min, max: b.max, vol: m.volume(), area: m.surfaceArea(), tri: m.numTri(), genero: m.genus() }; }
// En la cama: centrada en X e Y y apoyada en Z = 0
export function aLaCama(m) { const b = caja(m); return m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]); }
export const union = L => { L = L.filter(x => x && !x.isEmpty()); return !L.length ? w().Manifold.cube([0, 0, 0]) : L.length === 1 ? L[0] : w().Manifold.union(L); };

// ---------- 2D ----------
const area2 = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return s / 2; };
export const ccw = r => (area2(r) >= 0 ? r : r.slice().reverse());
export function cs(contornos, regla = 'EvenOdd') { return apunta(new (w().CrossSection)(contornos.filter(r => r && r.length > 2), regla)); }
// los polígonos de motor.js ({ ext, huecos }) → CrossSection
export const dePols = pols => cs(pols.flatMap(p => [p.ext].concat(p.huecos || [])));
export const csVacia = () => w().CrossSection.square([0, 0]);
export const csUnion = L => { L = L.filter(x => x && !x.isEmpty()); return !L.length ? csVacia() : L.length === 1 ? L[0] : w().CrossSection.union(L); };
export function estrella2(puntas, R, r, giro = 90) { const o = []; for (let i = 0; i < puntas * 2; i++) { const a = (giro + i * 180 / puntas) * Math.PI / 180, q = i % 2 ? r : R; o.push([q * Math.cos(a), q * Math.sin(a)]); } return o; }
export function poligono2(n, d, giro = 90) { const o = [], R = d / 2; for (let i = 0; i < n; i++) { const a = (giro + i * 360 / n) * Math.PI / 180; o.push([R * Math.cos(a), R * Math.sin(a)]); } return o; }
// corazón de «ancho» mm de ancho (curva clásica), centrado
export function corazon2(ancho) {
  const o = []; for (let i = 0; i < 96; i++) { const t = i / 96 * 2 * Math.PI, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); o.push([x, y]); }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; o.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
  const k = ancho / (x1 - x0); return ccw(o.map(q => [(q[0] - (x0 + x1) / 2) * k, (q[1] - (y0 + y1) / 2) * k]));
}
export function elipse2(a, b, n = 72) { const o = []; for (let i = 0; i < n; i++) { const t = i / n * 2 * Math.PI; o.push([a / 2 * Math.cos(t), b / 2 * Math.sin(t)]); } return o; }
// ranura (como un óvalo alargado): largo total y ancho
export function ranura2(largo, ancho) { const r = ancho / 2, c = Math.max(0, largo / 2 - r), o = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + i / 24 * Math.PI; o.push([c + r * Math.cos(a), r * Math.sin(a)]); } for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 + i / 24 * Math.PI; o.push([-c + r * Math.cos(a), r * Math.sin(a)]); } return o; }
// un texto como CrossSection (de «alto» mm de alto real), centrado
export function texto2(txt, fuente, alto, espejo = false) {
  txt = String(txt || '').trim(); if (!txt) mal('Escribe algún texto.');
  const T = texto(txt, fuente, alto), S = forma(T.w, T.h, g => T.pinta(g, 0, 0, { espejo }));
  if (!S.length) mal('Ese texto no se ve: prueba con otra letra.');
  return dePols(S);
}
export const cajaCS = s => { const b = s.bounds(); return { min: [b.min[0], b.min[1]], max: [b.max[0], b.max[1]], w: b.max[0] - b.min[0], h: b.max[1] - b.min[1] }; };
export function centraCS(s) { const b = cajaCS(s); return s.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]); }

// ---------- formas básicas (apoyadas en Z = 0, centradas) ----------
const seg = d => 4 * Math.round(Math.max(24, Math.min(160, d * 1.6 + 20)) / 4); // múltiplo de 4: los círculos llegan EXACTOS a sus extremos (medidas al 0,01)
const num = (v, def) => { if (v === undefined || v === null || v === '') return def; const x = Number(String(v).replace(',', '.')); return isFinite(x) ? x : def; };
export const FORMAS3D = {
  caja: { e: '🟦', t: 'Caja', p: { x: 30, y: 30, z: 20, radio: 0, redondeo: 0 } },
  cilindro: { e: '🛢️', t: 'Cilindro', p: { d: 30, h: 20, lados: 0 } },
  esfera: { e: '⚪', t: 'Esfera', p: { d: 30 } },
  semiesfera: { e: '◓', t: 'Media esfera', p: { d: 30 } },
  cono: { e: '🔺', t: 'Cono', p: { d: 30, d2: 0, h: 30 } },
  piramide: { e: '🔼', t: 'Pirámide', p: { base: 30, h: 30, lados: 4 } },
  tubo: { e: '⭕', t: 'Tubo', p: { d: 30, interior: 24, h: 20 } },
  toro: { e: '🍩', t: 'Rosco', p: { d: 40, grueso: 10 } },
  prisma: { e: '⬢', t: 'Polígono', p: { lados: 6, d: 30, h: 10 } },
  estrella: { e: '⭐', t: 'Estrella', p: { puntas: 5, d: 40, interior: 45, h: 6 } },
  corazon: { e: '❤️', t: 'Corazón', p: { ancho: 40, h: 6 } },
  cuna: { e: '📐', t: 'Cuña', p: { x: 30, y: 30, z: 20 } },
  texto: { e: '🔤', t: 'Texto', p: { txt: 'Hola', fuente: 'gorda', alto: 12, h: 3 } },
  rosca: { e: '🔩', t: 'Rosca', p: { d: 30, paso: 3, h: 12, hembra: false } },
  muelle: { e: '🌀', t: 'Espiral', p: { d: 30, grueso: 4, vueltas: 4, paso: 8 } }
};
export function forma3d(tipo, p) {
  const M = w().Manifold, CS = w().CrossSection;
  switch (tipo) {
    case 'caja': {
      const x = Math.max(0.1, num(p.x, 30)), y = Math.max(0.1, num(p.y, 30)), z = Math.max(0.1, num(p.z, 20)), rb = Math.max(0, Math.min(num(p.redondeo, 0), x / 2 - 0.01, y / 2 - 0.01, z / 2 - 0.01)), rv = Math.max(0, Math.min(num(p.radio, 0), x / 2 - 0.01, y / 2 - 0.01));
      if (rb > 0.05) { // todos los bordes redondeados: la «envoltura» de 8 esferas (o 8 roscos si las esquinas de pie son más redondas)
        const R = Math.max(rb, rv), L = [];
        [-1, 1].forEach(a => [-1, 1].forEach(b => [rb, z - rb].forEach(zz => L.push((R > rb + 0.05 ? CS.circle(rb, Math.max(12, seg(rb))).translate([R - rb, 0]).revolve(seg(R * 2)) : M.sphere(rb, Math.max(12, seg(rb * 2)))).translate([a * (x / 2 - R), b * (y / 2 - R), zz])))));
        return M.hull(L);
      }
      if (rv > 0.05) return cs([rectR(x, y, rv)]).extrude(z);
      return M.cube([x, y, z], true).translate([0, 0, z / 2]);
    }
    case 'cilindro': { const d = Math.max(0.2, num(p.d, 30)), h = Math.max(0.1, num(p.h, 20)), n = Math.round(num(p.lados, 0)); return M.cylinder(h, d / 2, d / 2, n >= 3 ? n : seg(d)); }
    case 'esfera': { const d = Math.max(0.2, num(p.d, 30)); return M.sphere(d / 2, seg(d)).translate([0, 0, d / 2]); }
    case 'semiesfera': { const d = Math.max(0.2, num(p.d, 30)); return M.sphere(d / 2, seg(d)).trimByPlane([0, 0, 1], 0); }
    case 'cono': { const d = Math.max(0.2, num(p.d, 30)), d2 = Math.max(0, num(p.d2, 0)), h = Math.max(0.1, num(p.h, 30)); return M.cylinder(h, d / 2, d2 / 2, seg(Math.max(d, d2))); }
    case 'piramide': { const n = Math.max(3, Math.round(num(p.lados, 4))), b = Math.max(0.5, num(p.base, 30)), h = Math.max(0.1, num(p.h, 30)), R = n === 4 ? b / Math.SQRT2 : b / 2; return cs([poligono2(n, R * 2, n === 4 ? 45 : 90)]).extrude(h, 0, 0, [0, 0]); }
    case 'tubo': { const d = Math.max(0.4, num(p.d, 30)), i = Math.max(0, Math.min(num(p.interior, 24), d - 0.2)), h = Math.max(0.1, num(p.h, 20)); return cs(i > 0.05 ? [circulo(d / 2, 0, 0, seg(d)), circulo(i / 2, 0, 0, seg(d))] : [circulo(d / 2, 0, 0, seg(d))]).extrude(h); }
    case 'toro': { const g = Math.max(0.4, num(p.grueso, 10)), D = Math.max(g + 0.2, num(p.d, 40)); return CS.circle(g / 2, Math.max(16, seg(g))).translate([D / 2 - g / 2, 0]).revolve(seg(D) * 2).translate([0, 0, g / 2]); }
    case 'prisma': { const n = Math.max(3, Math.round(num(p.lados, 6))), d = Math.max(0.4, num(p.d, 30)), h = Math.max(0.1, num(p.h, 10)); return cs([poligono2(n, d)]).extrude(h); }
    case 'estrella': { const n = Math.max(3, Math.round(num(p.puntas, 5))), d = Math.max(1, num(p.d, 40)), r = Math.max(5, Math.min(95, num(p.interior, 45))) / 100, h = Math.max(0.1, num(p.h, 6)); return cs([estrella2(n, d / 2, d / 2 * r)]).extrude(h); }
    case 'corazon': return cs([corazon2(Math.max(2, num(p.ancho, 40)))]).extrude(Math.max(0.1, num(p.h, 6)));
    case 'cuna': { const x = Math.max(0.1, num(p.x, 30)), y = Math.max(0.1, num(p.y, 30)), z = Math.max(0.1, num(p.z, 20)); return cs([[[-y / 2, 0], [y / 2, 0], [-y / 2, z]]]).extrude(x).rotate([90, 0, 90]).translate([-x / 2, 0, 0]); }
    case 'texto': return centraCS(texto2(p.txt, p.fuente, Math.max(1, num(p.alto, 12)))).extrude(Math.max(0.1, num(p.h, 3)));
    case 'rosca': return rosca(num(p.d, 30), num(p.paso, 3), num(p.h, 12), !!p.hembra);
    case 'muelle': return espiral(num(p.d, 30), num(p.grueso, 4), num(p.vueltas, 4), num(p.paso, 8));
  }
  mal('No conozco la forma «' + tipo + '».');
}
// ROSCA redonda (como la de los botes): un círculo descentrado que gira mientras sube. «d» es el diámetro de fuera de la
// parte macho; la hembra (para restar) sale con la holgura «gira» de la dueña. Profundidad del filete = 0,6 × paso.
export function rosca(d, paso, h, hembra = false, holgura) {
  d = Math.max(4, d); paso = Math.max(0.8, Math.min(paso, d / 3)); h = Math.max(paso, h);
  const prof = paso * 0.6, e = prof / 2, hol = hembra ? (holgura ?? ENCAJES.gira) + 0.1 : 0, r = d / 2 - e + hol;
  const c = w().CrossSection.circle(r, seg(d)).translate([e, 0]);
  return c.extrude(h, Math.ceil(h / paso * 36), -360 * h / paso);
}
// ESPIRAL (muelle de adorno): un círculo que da vueltas alrededor del eje a lo alto
export function espiral(d, grueso, vueltas, paso) {
  vueltas = Math.max(0.25, Math.min(30, vueltas)); grueso = Math.max(0.8, grueso); d = Math.max(grueso * 2 + 1, d); paso = Math.max(grueso + 0.4, paso);
  const n = Math.round(vueltas * 64), cs0 = w().CrossSection.circle(grueso / 2, 20).translate([d / 2 - grueso / 2, 0]);
  return cs0.extrude(paso * vueltas, n, -360 * vueltas).translate([0, 0, 0]);
}

// ---------- colocar ----------
// t = { pos:[x,y,z], rot:[gx,gy,gz] (grados), esc:[sx,sy,sz] }. Se gira y se escala alrededor del centro de la base.
export function coloca(m, t) {
  if (!t) return m;
  const e = t.esc || [1, 1, 1], r = t.rot || [0, 0, 0], p = t.pos || [0, 0, 0];
  if (e.some(x => Math.abs(x - 1) > 1e-6)) m = m.scale(e.map(x => (Math.abs(x) < 1e-4 ? 1e-4 : x)));
  if (r.some(x => Math.abs(x) > 1e-6)) m = m.rotate(r);
  if (p.some(x => Math.abs(x) > 1e-9)) m = m.translate(p);
  return m;
}

// ---------- BOCETO → pieza ----------
// Un boceto es una lista de formas planas; cada una «suma» o es «agujero». Se puede extruir (con desmoldeo y giro),
// girar alrededor de su eje (revolución) y redondear las esquinas del perfil.
export const FORMAS2D = { trazo: '✏️ Trazo', rect: '▭ Rectángulo', circulo: '◯ Círculo', poligono: '⬡ Polígono', estrella: '☆ Estrella', linea: '✎ Líneas', corazon: '♡ Corazón', elipse: '⬭ Elipse', ranura: '⊂⊃ Ranura', texto: 'T Texto' };
export function contornoDe(f) {
  const gira = (r, ang, x, y) => { const a = (ang || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return r.map(q => [x + q[0] * c - q[1] * s, y + q[0] * s + q[1] * c]); };
  const x = num(f.x, 0), y = num(f.y, 0);
  switch (f.t) {
    case 'rect': return [gira(rectR(Math.max(0.1, num(f.w, 20)), Math.max(0.1, num(f.h, 20)), Math.max(0, num(f.r, 0))).map(q => q), f.ang, x, y)];
    case 'circulo': return [circulo(Math.max(0.05, num(f.d, 20)) / 2, x, y, seg(num(f.d, 20)))];
    case 'poligono': return [gira(poligono2(Math.max(3, Math.round(num(f.n, 6))), Math.max(0.1, num(f.d, 20))), f.ang, x, y)];
    case 'estrella': return [gira(estrella2(Math.max(3, Math.round(num(f.n, 5))), Math.max(0.1, num(f.d, 30)) / 2, Math.max(0.1, num(f.d, 30)) / 2 * Math.max(5, Math.min(95, num(f.ri, 45))) / 100), f.ang, x, y)];
    case 'corazon': return [gira(corazon2(Math.max(1, num(f.w, 30))), f.ang, x, y)];
    case 'elipse': return [gira(elipse2(Math.max(0.1, num(f.w, 30)), Math.max(0.1, num(f.h, 20))), f.ang, x, y)];
    case 'ranura': return [gira(ranura2(Math.max(0.2, num(f.l, 30)), Math.max(0.1, num(f.w, 8))), f.ang, x, y)];
    case 'linea': return f.pts && f.pts.length > 2 ? [f.pts.map(q => [num(q[0], 0), num(q[1], 0)])] : [];
  }
  return [];
}
export function perfil(formas) {
  const suma = [], quita = [];
  (formas || []).forEach(f => {
    let s;
    if (f.t === 'texto') { if (!String(f.txt || '').trim()) return; s = centraCS(texto2(f.txt, f.fuente, Math.max(1, num(f.alto, 10)))); if (num(f.ang, 0)) s = s.rotate(num(f.ang, 0)); s = s.translate([num(f.x, 0), num(f.y, 0)]); }
    else if (f.t === 'trazo') s = trazo2(f);
    else { const c = contornoDe(f); if (!c.length) return; s = cs(c.map(ccw), 'Positive'); }
    (f.modo === 'agujero' ? quita : suma).push(s);
  });
  let r = csUnion(suma); if (quita.length) r = r.subtract(csUnion(quita));
  return r;
}
// Un trazo ABIERTO del lápiz o del ratón: una línea con grosor (si el lápiz aprieta más, más gruesa)
export function trazo2(f) {
  const P = (f.pts || []).map(q => [num(q[0], 0), num(q[1], 0), Math.max(0.2, num(q[2], num(f.ancho, 2)))]); if (P.length < 2) return csVacia();
  const L = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i]; L.push(w().CrossSection.circle(a[2] / 2, 16).translate([a[0], a[1]]));
    if (i) { const b = P[i - 1], dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy); if (l < 1e-6) continue; const nx = -dy / l, ny = dx / l; L.push(cs([ccw([[b[0] + nx * b[2] / 2, b[1] + ny * b[2] / 2], [a[0] + nx * a[2] / 2, a[1] + ny * a[2] / 2], [a[0] - nx * a[2] / 2, a[1] - ny * a[2] / 2], [b[0] - nx * b[2] / 2, b[1] - ny * b[2] / 2]])], 'Positive')); }
  }
  return csUnion(L);
}
// p = { formas, modo: 'extruir'|'revolucion'|'inflar', alto, desmoldeo (% arriba), giro (°), redondeo (mm), angulo (°), base, doble }
export function boceto(p) {
  let s = perfil(p.formas); if (s.isEmpty()) mal('El boceto está vacío: dibuja una forma cerrada (rectángulo, círculo, líneas que se cierran…).');
  const r = num(p.redondeo, 0); if (r > 0.05) s = s.offset(-r, 'Round', 2, 24).offset(r, 'Round', 2, 24);
  if (p.modo === 'inflar') return inflar(s, { alto: num(p.alto, 12), base: num(p.base, 1.2), doble: !!p.doble });
  if (p.modo === 'revolucion') {
    const b = cajaCS(s); if (b.max[0] <= 0.01) mal('Para girar el perfil, dibújalo a la DERECHA del eje (la línea roja vertical).');
    return s.revolve(seg(b.max[0] * 2) * 2, Math.max(1, Math.min(360, num(p.angulo, 360))));
  }
  const alto = Math.max(0.1, num(p.alto, 10)), k = Math.max(0, num(p.desmoldeo, 100)) / 100, g = num(p.giro, 0);
  return s.extrude(alto, g ? Math.ceil(Math.abs(g) / 4) + 2 : 0, g, [k, k]);
}

// ---------- PARTIR con conectores (como Bambu, mejorado) ----------
// Corta por un plano (tumbado a una altura, o de pie de lado a lado o de delante atrás, y además inclinado si quieres) y
// pone los conectores DENTRO del corte, lejos del borde. Tipos:
//  · pasadores: agujeros en las dos partes y unos pasadores sueltos (con TU holgura «justo»)
//  · espiga: una parte lleva el saliente y la otra el agujero (sin piezas sueltas)
//  · imanes: alojamientos para imanes (p. ej. 6 × 3 mm) en las dos caras: se unen y se separan
//  · cuadrada: espiga cuadrada (no gira)
//  · cola: cola de milano que se desliza (no se separa tirando)
export const CONECTORES = { ninguno: 'Sin conectores (solo cortar)', pasadores: 'Pasadores sueltos (agujero en las dos partes)', espiga: 'Espiga redonda (una parte entra en la otra)', cuadrada: 'Espiga cuadrada (no gira)', imanes: 'Imanes (alojamiento en las dos caras)', cola: 'Cola de milano (se desliza y no se suelta)' };
const giroA = (eje, inclina) => { // ángulos que llevan la normal del plano a +Z
  const i = num(inclina, 0);
  if (eje === 'x') return [0, -90 + i, 0];
  if (eje === 'y') return [90 + i, 0, 0];
  return [i, 0, 0];
};
const mat = (rx, ry, rz) => { // la misma rotación que Manifold.rotate([rx,ry,rz]) (X, luego Y, luego Z), como matriz 3×3
  const r = a => a * Math.PI / 180, [cx, sx, cy, sy, cz, sz] = [Math.cos(r(rx)), Math.sin(r(rx)), Math.cos(r(ry)), Math.sin(r(ry)), Math.cos(r(rz)), Math.sin(r(rz))];
  const X = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]], Y = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], Z = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
  const mul = (A, B) => A.map((f, i) => [0, 1, 2].map(j => f[0] * B[0][j] + f[1] * B[1][j] + f[2] * B[2][j]));
  return mul(Z, mul(Y, X));
};
const aplica = (R, v) => [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]];
const traspuesta = R => [[R[0][0], R[1][0], R[2][0]], [R[0][1], R[1][1], R[2][1]], [R[0][2], R[1][2], R[2][2]]];
const aMat4x3 = R => [R[0][0], R[1][0], R[2][0], R[0][1], R[1][1], R[2][1], R[0][2], R[1][2], R[2][2], 0, 0, 0];
const dentroAnillos = (q, anillos) => { let d = false; anillos.forEach(r => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) d = !d; } }); return d; };
const distBorde = (q, anillos) => { let d = Infinity; anillos.forEach(r => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[j], b = r[i], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1e-12))); d = Math.min(d, Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy)); } }); return d; };
// Dónde van los conectores: dentro del corte, a «margen» del borde, lo más separados posible (uno por isla como mínimo)
export function sitiosConectores(seccion, radio, n, margen = 1.6) {
  const dentro = seccion.offset(-(radio + margen), 'Round', 2, 24); if (dentro.isEmpty()) return [];
  const islas = dentro.decompose(), out = [], A = seccion.area(), auto = !(n > 0);
  const total = auto ? Math.max(1, Math.min(8, Math.round(A / 900) + 1)) : Math.round(n);
  const cands = islas.map(isla => {
    const an = isla.toPolygons(), b = cajaCS(isla), paso = Math.max(0.6, Math.min(b.w, b.h) / 24), L = [];
    for (let x = b.min[0]; x <= b.max[0]; x += paso) for (let y = b.min[1]; y <= b.max[1]; y += paso) { const q = [x, y]; if (dentroAnillos(q, an)) L.push({ q, d: distBorde(q, an) }); }
    if (!L.length) { const c = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2]; L.push({ q: c, d: 0 }); }
    return { L, area: isla.area() };
  }).sort((a, b) => b.area - a.area);
  // uno en cada isla (la más grande primero), en su punto más «hondo»
  cands.forEach(c => { if (out.length < Math.max(total, auto ? cands.length : 0)) { const m = c.L.reduce((a, b) => (b.d > a.d ? b : a)); out.push(m.q); } });
  const todos = cands.flatMap(c => c.L), sep = 2 * radio + 2 * margen;
  while (out.length < total) {
    let mejor = null, md = -1;
    todos.forEach(c => { const d = Math.min(...out.map(o => Math.hypot(o[0] - c.q[0], o[1] - c.q[1]))); const v = Math.min(d, 1e9) + c.d * 0.35; if (d >= sep && v > md) { md = v; mejor = c.q; } });
    if (!mejor) break; out.push(mejor);
  }
  return out;
}
// o = { eje: 'z'|'x'|'y', pos (mm, en la dirección del eje), inclina (°), tipo, n (0 = auto), d, largo, imanD, imanH, encaje }
export function partir(m, o = {}) {
  const M = w().Manifold, CS = w().CrossSection;
  const ang = giroA(o.eje || 'z', o.inclina), R = mat(...ang), Rt = traspuesta(R);
  const m2 = m.rotate(ang), b = caja(m2);
  // «pos» se cuenta desde el principio de la pieza en esa dirección (como la altura de corte de Bambu)
  const b0 = caja(m), ax = { x: 0, y: 1, z: 2 }[o.eje || 'z'], pos = num(o.pos, b0.dims[ax] / 2);
  const centro = [(b0.min[0] + b0.max[0]) / 2, (b0.min[1] + b0.max[1]) / 2, (b0.min[2] + b0.max[2]) / 2]; centro[ax] = b0.min[ax] + pos;
  const zc = aplica(R, centro)[2];
  if (!(zc > b.min[2] + 0.05 && zc < b.max[2] - 0.05)) mal('El corte se sale de la pieza: muévelo hacia dentro.');
  const [arriba0, abajo0] = m2.splitByPlane([0, 0, 1], zc);
  if (arriba0.isEmpty() || abajo0.isEmpty()) mal('Por ahí no se parte nada: mueve el corte.');
  const sec = m2.slice(zc), tipo = o.tipo || 'pasadores', hol = ENCAJES[o.encaje || 'justo'] ?? ENCAJES.justo;
  let arriba = arriba0, abajo = abajo0; const sueltas = [], avisos = []; let sitios = [];
  if (tipo !== 'ninguno') {
    const d = tipo === 'imanes' ? Math.max(1, num(o.imanD, 6)) : Math.max(1.5, num(o.d, 5)), L = Math.max(2, num(o.largo, 10)), prof = tipo === 'imanes' ? Math.max(0.6, num(o.imanH, 3)) + 0.2 : L / 2 + 0.4;
    if (tipo === 'cola') { // colas de milano: atraviesan el corte de delante atrás, repartidas a lo ancho
      const b2 = cajaCS(sec), k = Math.max(1, Math.min(4, o.n > 0 ? Math.round(o.n) : Math.round(b2.w / 60) + 1));
      sitios = b2.w > d * 2.4 ? Array.from({ length: k }, (_, i) => [b2.min[0] + b2.w * (i + 0.5) / k, (b2.min[1] + b2.max[1]) / 2]) : [];
    } else sitios = sitiosConectores(sec, d / 2 + hol, o.n, 1.6);
    if (!sitios.length) avisos.push('El corte es demasiado estrecho para conectores de ' + String(d).replace('.', ',') + ' mm: lo parto sin ellos (o prueba con uno más fino).');
    // cuánto «hondo» cabe en cada lado sin atravesar la pieza
    const cil = (dd, z0, z1, q, cuadrado) => (cuadrado ? M.cube([dd, dd, z1 - z0], true).translate([q[0], q[1], (z0 + z1) / 2]) : M.cylinder(z1 - z0, dd / 2, dd / 2, seg(dd)).translate([q[0], q[1], z0]));
    const H = [], A = [], Ab = [];
    sitios.forEach(q => {
      if (tipo === 'pasadores') { H.push(cil(d + 2 * hol, zc - prof, zc + prof, q)); sueltas.push(M.cylinder(L - 0.4, d / 2, d / 2, seg(d)).translate([q[0], q[1], 0])); }
      else if (tipo === 'espiga' || tipo === 'cuadrada') { const c = tipo === 'cuadrada'; A.push(cil(d, zc - L / 2, zc + 0.01, q, c)); Ab.push(cil(d + 2 * hol, zc - L / 2 - 0.4, zc + 0.01, q, c)); }
      else if (tipo === 'imanes') { H.push(cil(d + 2 * ENCAJES.justo, zc - prof, zc + prof, q)); }
      else if (tipo === 'cola') { // cola de milano: trapecio en el plano del corte, se desliza en Y
        const ancho = d * 1.8, cuello = d * 1.1, alto = Math.min(L / 2, d), b2 = cajaCS(sec), largo = b2.h + 2;
        const tr = (k) => cs([[[-cuello / 2 - k, 0], [cuello / 2 + k, 0], [ancho / 2 + k, -alto - k], [-ancho / 2 - k, -alto - k]]]);
        const pieza = (k) => tr(k).extrude(largo).rotate([90, 0, 0]).translate([q[0], b2.max[1] + 1, zc + 0.01]);
        A.push(pieza(0).intersect(sec.extrude(alto + 1).translate([0, 0, zc - alto - 0.5]))); Ab.push(pieza(hol));
      }
    });
    if (H.length) { const u = union(H); arriba = arriba.subtract(u); abajo = abajo.subtract(u); }
    if (A.length) { arriba = arriba.add(union(A)); abajo = abajo.subtract(union(Ab)); }
  }
  // para verla montada (un poco abierta) y para imprimirla (cada parte con el corte hacia la cama)
  const vuelve = x => x.transform(aMat4x3(Rt));
  const abre = Math.max(4, Math.min(30, Math.max(...b0.dims) * 0.12)), nrm = aplica(Rt, [0, 0, 1]);
  const montadas = [{ t: 'arriba', m: vuelve(arriba.translate([0, 0, abre / 2])) }, { t: 'abajo', m: vuelve(abajo.translate([0, 0, -abre / 2])) }];
  const imprimir = [], pon = (t, x) => imprimir.push({ t, m: aLaCama(x) });
  pon('parte_A', tipo === 'espiga' || tipo === 'cuadrada' || tipo === 'cola' ? arriba.rotate([180, 0, 0]) : arriba); // la espiga apunta hacia arriba al imprimir
  pon('parte_B', tipo === 'espiga' || tipo === 'cuadrada' || tipo === 'cola' ? abajo : abajo.rotate([180, 0, 0]));
  sueltas.forEach((s, i) => pon('pasador_' + (i + 1), s.rotate([90, 0, 0])));
  return { montadas, imprimir, sitios, seccion: sec.area(), normal: nrm, avisos, plano: { R, zc } };
}

// ---------- vaciar (paredes de «pared» mm, abierta por arriba si quieres) ----------
// Para formas «simples» (sin agujeros finos): se encoge la pieza por dentro con una esfera (erosión) y se resta.
export function vaciar(m, pared = 2, abierta = true) {
  const s = w().Manifold.sphere(Math.max(0.4, pared), 16), dentro = m.minkowskiDifference(s);
  if (dentro.isEmpty()) mal('Con esa pared no queda hueco: hazla más fina.');
  let hueco = dentro;
  if (abierta) { // la boca: la forma del hueco justo debajo de su techo, subida hasta salir por arriba
    const b = caja(dentro), top = caja(m).max[2], boca = dentro.slice(b.max[2] - Math.min(0.5, b.dims[2] / 4));
    if (!boca.isEmpty()) hueco = dentro.add(boca.extrude(top - b.max[2] + 2).translate([0, 0, b.max[2] - Math.min(0.5, b.dims[2] / 4)]));
  }
  return m.subtract(hueco);
}

// ---------- DEFORMAR: doblar, retorcer, estrechar, inclinar y ondas ----------
// «Una función de poder doblar la pieza inclinada sería top» (la dueña, 9-10-2026). Primero se trocea la malla en
// triángulos pequeños (para que la curva salga suave) y luego se mueve cada punto. La pieza sigue cerrada.
export const DEFORMACIONES = {
  doblar: { t: '🌈 Doblar (curvar)', c: [['ang', 'Ángulo total', 45, -270, 270, 1, '°'], ['eje', 'A lo largo de', 'x', [['x', 'X (a lo ancho)'], ['y', 'Y (a lo largo)']]]] },
  retorcer: { t: '🌀 Retorcer', c: [['ang', 'Vueltas (en grados, de abajo arriba)', 90, -1080, 1080, 5, '°']] },
  estrechar: { t: '🔻 Estrechar / ensanchar arriba', c: [['arriba', 'Tamaño arriba', 70, 5, 300, 1, '%']] },
  inclinar: { t: '📐 Inclinar', c: [['ang', 'Inclinación', 15, -60, 60, 1, '°'], ['eje', 'Hacia', 'x', [['x', 'X'], ['y', 'Y']]]] },
  ondas: { t: '〰️ Ondas alrededor', c: [['n', 'Número de ondas', 8, 2, 48, 1, ''], ['amp', 'Fuerza de la onda', 2, 0.2, 15, 0.1, 'mm'], ['giro', 'Que giren al subir', 0, -720, 720, 5, '°']] },
  olas: { t: '🌊 Olas al subir', c: [['n', 'Olas de abajo arriba', 4, 1, 30, 1, ''], ['amp', 'Fuerza', 2, 0.2, 15, 0.1, 'mm']] }
};
export function deformar(m, mods) {
  mods = (mods || []).filter(d => d && DEFORMACIONES[d.t]); if (!mods.length) return m;
  const b0 = caja(m), L = Math.max(...b0.dims), area = m.surfaceArea();
  const lado = Math.max(0.5, L / 100, Math.sqrt(area / 60000) * 1.5); // trocitos pequeños, sin pasar de ~150 000 triángulos
  m = m.refineToLength(lado);
  const rad = a => num(a, 0) * Math.PI / 180;
  for (const d of mods) {
    const b = caja(m), [x0, y0, z0] = b.min, [x1, y1, z1] = b.max, H = Math.max(1e-6, z1 - z0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (d.t === 'retorcer') { const a = rad(d.ang) / H; m = m.warp(v => { const t = (v[2] - z0) * a, c = Math.cos(t), s = Math.sin(t), x = v[0] - cx, y = v[1] - cy; v[0] = cx + x * c - y * s; v[1] = cy + x * s + y * c; }); }
    else if (d.t === 'estrechar') { const k = Math.max(0.05, num(d.arriba, 70) / 100); m = m.warp(v => { const f = 1 + (k - 1) * (v[2] - z0) / H; v[0] = cx + (v[0] - cx) * f; v[1] = cy + (v[1] - cy) * f; }); }
    else if (d.t === 'inclinar') { const t = Math.tan(rad(d.ang)), k = d.eje === 'y' ? 1 : 0; m = m.warp(v => { v[k] += (v[2] - z0) * t; }); }
    else if (d.t === 'ondas') { const n = Math.max(2, Math.round(num(d.n, 8))), amp = num(d.amp, 2), g = rad(d.giro); m = m.warp(v => { const x = v[0] - cx, y = v[1] - cy, r = Math.hypot(x, y); if (r < 1e-6) return; const th = Math.atan2(y, x), k = (r + amp * Math.sin(n * (th - g * (v[2] - z0) / H))) / r; v[0] = cx + x * k; v[1] = cy + y * k; }); }
    else if (d.t === 'olas') { const n = Math.max(1, num(d.n, 4)), amp = num(d.amp, 2); m = m.warp(v => { const x = v[0] - cx, y = v[1] - cy, r = Math.hypot(x, y); if (r < 1e-6) return; const k = (r + amp * Math.sin(2 * Math.PI * n * (v[2] - z0) / H)) / r; v[0] = cx + x * k; v[1] = cy + y * k; }); }
    else if (d.t === 'doblar') {
      const a = rad(d.ang); if (Math.abs(a) < 1e-4) continue;
      const k = d.eje === 'y' ? 1 : 0, c = k ? cy : cx, Lk = k ? y1 - y0 : x1 - x0, R = Lk / a;
      m = m.warp(v => { const u = v[k] - c, zz = v[2] - z0, f = u / R; v[k] = c + (R - zz) * Math.sin(f); v[2] = z0 + R - (R - zz) * Math.cos(f); });
    }
  }
  return m;
}

// ---------- INFLAR un dibujo (como un globo) ----------
// Un dibujo plano (lo que dibujas con el lápiz del iPad o el ratón) se convierte en una figura redondeada y blandita, con
// la base plana para imprimirla. La altura de cada punto depende de lo lejos que está del borde (más gordo en el centro).
export function inflar(s, o = {}) {
  const alto = Math.max(1, num(o.alto, 12)), base = Math.max(0, num(o.base, 1.2)), doble = !!o.doble;
  const b = cajaCS(s), paso = Math.max(0.35, Math.max(b.w, b.h) / 220), an = s.toPolygons();
  const nx = Math.ceil(b.w / paso) + 3, ny = Math.ceil(b.h / paso) + 3, D = new Float32Array(nx * ny); let dmax = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = [b.min[0] + (i - 1) * paso, b.min[1] + (j - 1) * paso]; const d = dentroAnillos(q, an) ? distBorde(q, an) : -distBorde(q, an); D[j * nx + i] = d; if (d > dmax) dmax = d; }
  if (dmax <= 0) mal('El dibujo es demasiado pequeño para inflarlo.');
  const dist = (x, y) => { const fx = (x - b.min[0]) / paso + 1, fy = (y - b.min[1]) / paso + 1, i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(ny - 2, Math.floor(fy))), u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fy - j));
    return D[j * nx + i] * (1 - u) * (1 - v) + D[j * nx + i + 1] * u * (1 - v) + D[(j + 1) * nx + i] * (1 - u) * v + D[(j + 1) * nx + i + 1] * u * v; };
  const perfil = d => { if (d <= 0) return d; const t = Math.min(1, d / dmax); return Math.sqrt(t * (2 - t)) * alto; }; // un cuarto de círculo: borde redondo, centro alto
  const sdf = v => { const d = dist(v[0], v[1]); if (d <= 0) return d; const hz = perfil(d); return doble ? Math.min(hz + base / 2 - Math.abs(v[2]), d) : Math.min(hz + base - v[2], v[2] + 0.001, d); };
  const z0 = doble ? -(alto + base) : -0.01, z1 = alto + base + 0.5;
  let m = w().Manifold.levelSet(sdf, { min: [b.min[0] - paso, b.min[1] - paso, z0], max: [b.max[0] + paso, b.max[1] + paso, z1] }, Math.max(0.4, paso), 0, paso / 8);
  if (m.isEmpty()) mal('No he podido inflar ese dibujo.');
  if (doble) m = m.translate([0, 0, alto + base / 2]);
  return m;
}

// ---------- RELIEVE desde una imagen de alturas (fotos, litofanías) ----------
// H: alturas en mm (nx × ny, fila 0 = abajo) encima de una base de «base» mm. Sale una pieza cerrada: la cara de arriba
// con el relieve, las paredes y el fondo plano. «ancho» × «largo» en mm, centrada.
export function campo(H, nx, ny, ancho, largo, base = 1) {
  const dx = ancho / (nx - 1), dy = largo / (ny - 1), x0 = -ancho / 2, y0 = -largo / 2, V = [], T = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V.push(x0 + i * dx, y0 + j * dy, base + Math.max(0, H[j * nx + i] || 0));
  const id = (i, j) => j * nx + i;
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1); T.push(a, b, c, a, c, d); }
  const anillo = []; for (let i = 0; i < nx; i++) anillo.push(id(i, 0)); for (let j = 1; j < ny; j++) anillo.push(id(nx - 1, j)); for (let i = nx - 2; i >= 0; i--) anillo.push(id(i, ny - 1)); for (let j = ny - 2; j >= 1; j--) anillo.push(id(0, j));
  const n0 = V.length / 3; anillo.forEach(k => V.push(V[k * 3], V[k * 3 + 1], 0));
  for (let k = 0; k < anillo.length; k++) { const t1 = anillo[k], t2 = anillo[(k + 1) % anillo.length], b1 = n0 + k, b2 = n0 + (k + 1) % anillo.length; T.push(b1, b2, t2, b1, t2, t1); }
  const d2 = []; anillo.forEach(k => d2.push(V[k * 3], V[k * 3 + 1])); const ea = earcut(d2);
  for (let k = 0; k < ea.length; k += 3) T.push(n0 + ea[k], n0 + ea[k + 2], n0 + ea[k + 1]); // el fondo mira hacia abajo
  const mesh = new (w().Mesh)({ numProp: 3, vertProperties: new Float32Array(V), triVerts: new Uint32Array(T) }); try { mesh.merge(); } catch (e) { }
  const m = apunta(new (w().Manifold)(mesh)); if (m.status() !== 'NoError') mal('No he podido cerrar el relieve (' + m.status() + ').'); return m;
}
// Relieve RECORTADO: solo donde la máscara A (0..1, nx × ny) está encendida (una figura sin fondo)
export function campoMascara(H, A, nx, ny, ancho, largo, base = 1) {
  const dx = ancho / (nx - 1), dy = largo / (ny - 1), x0 = -ancho / 2, y0 = -largo / 2, paso = Math.max(dx, dy);
  const muestra = (G, x, y) => { const fx = (x - x0) / dx, fy = (y - y0) / dy, i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(ny - 2, Math.floor(fy))), u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fy - j));
    return G[j * nx + i] * (1 - u) * (1 - v) + G[j * nx + i + 1] * u * (1 - v) + G[(j + 1) * nx + i] * (1 - u) * v + G[(j + 1) * nx + i + 1] * u * v; };
  let hmax = 0; for (let k = 0; k < H.length; k++) if (A[k] > 0.5 && H[k] > hmax) hmax = H[k];
  const sdf = v => { const a = (muestra(A, v[0], v[1]) - 0.5) * paso * 6; if (a <= 0) return a; return Math.min(base + muestra(H, v[0], v[1]) - v[2], v[2] + 0.001, a); };
  const m = w().Manifold.levelSet(sdf, { min: [x0 - paso, y0 - paso, -0.01], max: [x0 + ancho + paso, y0 + largo + paso, base + hmax + 0.5] }, Math.max(0.3, paso * 1.15), 0, paso / 6);
  if (m.isEmpty()) mal('La figura ha salido vacía: prueba con otra foto o sin recortar el fondo.'); return m;
}

// ---------- exportar ----------
export function stl(m, nombre) { return stlBinario(aSopa(m), nombre); }
// 3MF con cada parte como objeto (y su color): Bambu Studio la abre con las partes separadas.
// v20: con «ajustes» (claves de Bambu Studio: layer_height, wall_loops, enable_support, brim_type…) se escriben DENTRO de cada
// objeto, igual que hace Bambu Studio en sus proyectos (Metadata/model_settings.config): al abrirlo, la pieza ya los lleva.
export function tresMF(partes, nombre = 'pieza', ajustes = null) {
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const cols = [...new Set(partes.map(p => (p.color || '#9b8cff').toUpperCase()))];
  let objs = '', build = '', ms = '';
  partes.forEach((p, i) => {
    // p.m = sólido de Manifold · p.malla = { V, T } de cualquier malla (v20: el Print Doctor exporta también mallas abiertas)
    const M = p.malla ? null : p.m.getMesh(), P = p.malla ? p.malla.V : M.vertProperties, k = p.malla ? 3 : M.numProp, T = p.malla ? p.malla.T : M.triVerts, v = [], t = [];
    // v20: cada pieza centrada en sí misma y su sitio en la cama en la «transformación» del 3MF (como hace Bambu Studio en sus
    // proyectos; sin ella, al pedirle que respete la colocación, ponía todas las piezas en la esquina y «se salían de la cama»)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity;
    for (let j = 0; j < P.length / k; j++) { const X = P[j * k], Y = P[j * k + 1], Z = P[j * k + 2]; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; if (Z < z0) z0 = Z; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = z0;
    for (let j = 0; j < P.length / k; j++) v.push('<vertex x="' + (P[j * k] - cx).toFixed(4) + '" y="' + (P[j * k + 1] - cy).toFixed(4) + '" z="' + (P[j * k + 2] - cz).toFixed(4) + '"/>');
    for (let j = 0; j < T.length; j += 3) t.push('<triangle v1="' + T[j] + '" v2="' + T[j + 1] + '" v3="' + T[j + 2] + '"/>');
    const id = i + 2, nom = esc(p.nombre || ('parte ' + (i + 1)));
    objs += '<object id="' + id + '" name="' + nom + '" type="model" pid="1" pindex="' + cols.indexOf((p.color || '#9b8cff').toUpperCase()) + '"><mesh><vertices>' + v.join('') + '</vertices><triangles>' + t.join('') + '</triangles></mesh></object>';
    build += '<item objectid="' + id + '" transform="1 0 0 0 1 0 0 0 1 ' + cx.toFixed(4) + ' ' + cy.toFixed(4) + ' ' + cz.toFixed(4) + '"/>';
    if (ajustes) ms += '  <object id="' + id + '">\n    <metadata key="name" value="' + nom + '"/>\n    <metadata key="extruder" value="' + (cols.indexOf((p.color || '#9b8cff').toUpperCase()) + 1) + '"/>\n' + Object.entries(ajustes).map(([a, b]) => '    <metadata key="' + esc(a) + '" value="' + esc(b) + '"/>\n').join('') + '  </object>\n';
  });
  const modelo = '<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="es-ES" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">' + esc(nombre) + '</metadata><metadata name="Application">CelebriDiseños · CelebriR8</metadata><resources><basematerials id="1">' +
    cols.map((c, i) => '<base name="color ' + (i + 1) + '" displaycolor="' + c + 'FF"/>').join('') + '</basematerials>' + objs + '</resources><build>' + build + '</build></model>';
  const te = new TextEncoder(), extra = ajustes ? [{ nombre: 'Metadata/model_settings.config', datos: te.encode('<?xml version="1.0" encoding="UTF-8"?>\n<config>\n' + ms + '</config>\n') }] : [];
  return zip([
    { nombre: '[Content_Types].xml', datos: te.encode('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>') },
    { nombre: '_rels/.rels', datos: te.encode('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>') },
    { nombre: '3D/3dmodel.model', datos: te.encode(modelo) }
  ].concat(extra));
}
