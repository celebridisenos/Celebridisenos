// ================= v16.2 · TODO lo que un archivo 3D sabe de la pieza =================
// «Si el archivo ya lo dice, no me lo preguntes.» Al subir un STL / 3MF se saca:
//   · medidas X × Y × Z (medidas3d.js, como en la 16.0)
//   · volumen y superficie de la malla (STL y 3MF)
//   · 3MF LAMINADO (Bambu Studio / Orca / MakerWorld, «Metadata/slice_info.config»): gramos de filamento, metros,
//     tiempo de impresión, material y color de cada filamento → son datos REALES del laminador.
//   · 3MF con ajustes («Metadata/project_settings.config»): material, altura de capa, relleno, impresora.
//   · si NO está laminado: los gramos se ESTIMAN con el volumen (paredes + relleno) y se dice que es una estimación.
//     El tiempo de impresión NO se puede saber sin laminar: se deja vacío (no se inventa).
import { unzip } from './stl.js';
import { medir3D } from './medidas3d.js';

const DENSIDAD = { PLA: 1.24, PETG: 1.27, ABS: 1.04, ASA: 1.07, TPU: 1.21, PA: 1.14, PC: 1.2, PVA: 1.23, HIPS: 1.04 }; // g/cm³
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const atr = (tag, k) => { const m = new RegExp('(?:^|\\s)' + k + '\\s*=\\s*"([^"]*)"').exec(tag); return m ? m[1] : ''; };
const materialDe = t => { const s = String(t || '').toUpperCase(); return Object.keys(DENSIDAD).find(k => s.includes(k)) || (s.trim() || ''); };

// Volumen (mm³) y superficie (mm²) de una malla de triángulos sueltos: p = [x,y,z, x,y,z, …] de 9 en 9
function sumar(acc, ax, ay, az, bx, by, bz, cx, cy, cz) {
  acc.v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  acc.a += Math.sqrt(nx * nx + ny * ny + nz * nz) / 2; acc.n++;
}
function mallaSTL(buf) {
  const dv = new DataView(buf), acc = { v: 0, a: 0, n: 0 };
  if (buf.byteLength >= 84 && 84 + dv.getUint32(80, true) * 50 === buf.byteLength) {
    const n = dv.getUint32(80, true), g = o => dv.getFloat32(o, true);
    for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; sumar(acc, g(o), g(o + 4), g(o + 8), g(o + 12), g(o + 16), g(o + 20), g(o + 24), g(o + 28), g(o + 32)); }
  } else {
    const txt = new TextDecoder().decode(buf), re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g, p = []; let m;
    while ((m = re.exec(txt))) { p.push(+m[1], +m[2], +m[3]); if (p.length === 9) { sumar(acc, ...p); p.length = 0; } }
  }
  return acc;
}
// 3MF: suma de las mallas de todos los objetos (cada una en su unidad). Las piezas repetidas por <component> no se
// multiplican: sirve para UNA unidad de cada objeto, que es lo normal en un archivo de producto.
function malla3MF(textos) {
  const acc = { v: 0, a: 0, n: 0 }, UN = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };
  for (const txt of textos) {
    const raiz = /<model\b([^>]*)>/.exec(txt), k = UN[(raiz && atr(raiz[1], 'unit')) || 'millimeter'] || 1;
    const reM = /<mesh>([\s\S]*?)<\/mesh>/g; let mm;
    while ((mm = reM.exec(txt))) {
      const V = [], reV = /<vertex\b([^>]*)\/?>/g, reT = /<triangle\b([^>]*)\/?>/g, sub = { v: 0, a: 0, n: 0 }; let q;
      while ((q = reV.exec(mm[1]))) V.push(+atr(q[1], 'x') * k, +atr(q[1], 'y') * k, +atr(q[1], 'z') * k);
      while ((q = reT.exec(mm[1]))) { const a = +atr(q[1], 'v1') * 3, b = +atr(q[1], 'v2') * 3, c = +atr(q[1], 'v3') * 3; if (c + 2 < V.length && a + 2 < V.length && b + 2 < V.length) sumar(sub, V[a], V[a + 1], V[a + 2], V[b], V[b + 1], V[b + 2], V[c], V[c + 1], V[c + 2]); }
      acc.v += Math.abs(sub.v); acc.a += sub.a; acc.n += sub.n;
    }
  }
  return acc;
}

// «Metadata/slice_info.config» → lo que calculó el laminador (por bandeja)
function leerLaminado(xml) {
  const bandejas = []; const reP = /<plate>([\s\S]*?)<\/plate>/g; let p;
  while ((p = reP.exec(xml))) {
    const meta = k => { const m = new RegExp('<metadata\\s+key="' + k + '"\\s+value="([^"]*)"').exec(p[1]); return m ? m[1] : ''; };
    const fil = []; const reF = /<filament\b([^>]*)\/?>/g; let f;
    while ((f = reF.exec(p[1]))) fil.push({ tipo: materialDe(atr(f[1], 'type')), color: atr(f[1], 'color'), gramos: Number(atr(f[1], 'used_g')) || 0, metros: Number(atr(f[1], 'used_m')) || 0 });
    const seg = Number(meta('prediction')) || 0, peso = Number(meta('weight')) || fil.reduce((s, x) => s + x.gramos, 0);
    const piezas = (p[1].match(/<object\b[^>]*skipped="false"/g) || []).length;
    if (seg > 0 || peso > 0) bandejas.push({ segundos: seg, gramos: peso, filamentos: fil, piezas, soportes: meta('support_used') === 'true', boquilla: meta('nozzle_diameters') });
  }
  if (!bandejas.length) return null;
  const fil = {}; bandejas.forEach(b => b.filamentos.forEach(x => { const k = x.tipo + '|' + x.color; fil[k] = fil[k] || { tipo: x.tipo, color: x.color, gramos: 0, metros: 0 }; fil[k].gramos += x.gramos; fil[k].metros += x.metros; }));
  return { bandejas: bandejas.length, piezas: bandejas.reduce((s, b) => s + b.piezas, 0), segundos: bandejas.reduce((s, b) => s + b.segundos, 0), gramos: r2(bandejas.reduce((s, b) => s + b.gramos, 0)),
    filamentos: Object.values(fil).filter(x => x.gramos > 0 || x.metros > 0).map(x => ({ tipo: x.tipo, color: x.color, gramos: r2(x.gramos), metros: r2(x.metros) })), soportes: bandejas.some(b => b.soportes) };
}
// «Metadata/project_settings.config» (JSON) → ajustes con los que está preparado
function leerAjustes(txt) {
  let j; try { j = JSON.parse(txt); } catch (e) { return null; }
  const uno = v => Array.isArray(v) ? v[0] : v, num = v => { const x = parseFloat(String(uno(v) ?? '')); return isFinite(x) ? x : null; };
  return { material: materialDe(uno(j.filament_type)), colores: (Array.isArray(j.filament_colour) ? j.filament_colour : []).filter(Boolean), capa: num(j.layer_height), relleno: num(j.sparse_infill_density),
    paredes: num(j.wall_loops), impresora: String(uno(j.printer_model) || ''), densidad: num(j.filament_density), boquilla: num(j.nozzle_diameter) };
}

// Gramos ESTIMADOS de una pieza sin laminar: cáscara (paredes + techos) maciza + relleno del interior.
export function estimarGramos(volMm3, areaMm2, opc = {}) {
  if (!(volMm3 > 0)) return null;
  const dens = opc.densidad || DENSIDAD[opc.material] || DENSIDAD.PLA, relleno = (opc.relleno != null ? opc.relleno : 15) / 100, grosor = (opc.paredes || 2) * (opc.boquilla || 0.4) * 1.05 + 0.2;
  const cascara = Math.min(volMm3, (areaMm2 || 0) * grosor), dentro = Math.max(0, volMm3 - cascara);
  return r1((cascara + dentro * relleno) / 1000 * dens);
}

export const horasTxt = seg => { const m = Math.round(seg / 60), hh = Math.floor(m / 60); return (hh ? hh + ' h ' : '') + (m % 60) + ' min'; };

// Devuelve lo que se ha podido saber. Cada dato dice si es REAL (del archivo) o ESTIMADO.
export async function analizar3D(buf, nombre) {
  const ext = String(nombre || '').split('.').pop().toLowerCase();
  const out = { archivo: nombre, medidas: null, volumenCm3: null, laminado: null, ajustes: null, gramos: null, horas: null, material: '', colores: [], notas: [] };
  try { out.medidas = await medir3D(buf, nombre); } catch (e) { out.notas.push(e.message); }
  let malla = null;
  if (ext === 'stl') malla = mallaSTL(buf);
  else if (ext === '3mf') {
    const dec = new TextDecoder(), z = await unzip(buf, n => /\.model$/i.test(n) || /slice_info\.config$/i.test(n) || /project_settings\.config$/i.test(n));
    const de = re => Object.keys(z).filter(n => re.test(n));
    malla = malla3MF(de(/\.model$/i).map(n => dec.decode(z[n])));
    const si = de(/slice_info\.config$/i)[0], ps = de(/project_settings\.config$/i)[0];
    if (si) out.laminado = leerLaminado(dec.decode(z[si]));
    if (ps) out.ajustes = leerAjustes(dec.decode(z[ps]));
  }
  // escala corregida a mano o unidad dudosa: el volumen solo vale si las medidas son creíbles
  const fiable = out.medidas && out.medidas.estado !== 'revisar';
  if (malla && malla.n && Math.abs(malla.v) > 0 && fiable) out.volumenCm3 = r2(Math.abs(malla.v) / 1000);
  const L = out.laminado, A = out.ajustes;
  out.material = (L && L.filamentos[0] && L.filamentos[0].tipo) || (A && A.material) || '';
  out.colores = L && L.filamentos.length ? L.filamentos.map(x => x.color).filter(Boolean) : (A ? A.colores.slice(0, 4) : []);
  if (L && L.gramos > 0) out.gramos = { v: r1(L.gramos), real: true, de: 'el laminado del 3MF' + (L.soportes ? ' (con soportes)' : '') };
  else if (out.volumenCm3) {
    const g = estimarGramos(Math.abs(malla.v), malla.a, A ? { material: A.material, densidad: A.densidad, relleno: A.relleno, paredes: A.paredes, boquilla: A.boquilla } : {});
    if (g) out.gramos = { v: g, real: false, de: 'el volumen de la pieza (' + String(out.volumenCm3).replace('.', ',') + ' cm³), ' + (A && A.relleno != null ? 'con el relleno del archivo (' + A.relleno + ' %)' : 'con 2 paredes y 15 % de relleno') };
  }
  if (L && L.segundos > 0) out.horas = { v: Math.round(L.segundos / 36) / 100, real: true, texto: horasTxt(L.segundos) };
  else out.notas.push(ext === '3mf' ? 'Este 3MF no está laminado: no trae el tiempo de impresión. Si lo guardas ya laminado desde Bambu Studio, lo leo solo.' : 'Un STL no guarda el tiempo de impresión ni el material: eso lo trae un 3MF laminado.');
  return out;
}
