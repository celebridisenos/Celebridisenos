// ================= v16 · Medidas REALES de un archivo 3D (STL · 3MF · OBJ) =================
// No se estiman a ojo: se recorre la geometría y se toma su caja envolvente (bounding box) X × Y × Z en milímetros.
//  · 3MF: guarda la unidad (milímetros, pulgadas…) y la colocación de cada pieza (transformaciones). Se aplican.
//  · STL y OBJ: el formato NO guarda la unidad. Se leen como milímetros (lo normal en impresión 3D) y se dice;
//    si el tamaño resultante no es creíble, se marca «revisar» en vez de darlo por bueno.
import { unzip } from './stl.js';

const UNIDAD_MM = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };
const r1 = v => Math.round(v * 10) / 10;
const caja = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], n: 0 });
function meter(b, x, y, z) {
  if (x < b.min[0]) b.min[0] = x; if (x > b.max[0]) b.max[0] = x;
  if (y < b.min[1]) b.min[1] = y; if (y > b.max[1]) b.max[1] = y;
  if (z < b.min[2]) b.min[2] = z; if (z > b.max[2]) b.max[2] = z;
  b.n++;
}
const dims = b => [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
const vol = d => d[0] * d[1] * d[2];

// Transformación 3MF: 12 números (matriz 4×3 por filas). Punto fila × matriz.
const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
function leerT(s) { const a = String(s || '').trim().split(/\s+/).map(Number); return a.length === 12 && a.every(isFinite) ? a : ID; }
function aplicar(t, x, y, z) { return [x * t[0] + y * t[3] + z * t[6] + t[9], x * t[1] + y * t[4] + z * t[7] + t[10], x * t[2] + y * t[5] + z * t[8] + t[11]]; }
// c = a seguido de b (primero a, luego b)
function componer(a, b) {
  const o = new Array(12);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  for (let j = 0; j < 3; j++) o[9 + j] = a[9] * b[j] + a[10] * b[3 + j] + a[11] * b[6 + j] + b[9 + j];
  return o;
}
const atr = (tag, k) => { const m = new RegExp('(?:^|\\s)' + k + '\\s*=\\s*"([^"]*)"').exec(tag); return m ? m[1] : ''; };
const ruta = p => String(p || '').replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();

function leerModelo(txt, nombre) {
  const raiz = /<model\b([^>]*)>/.exec(txt), objetos = {}, items = [];
  const unidad = raiz ? (atr(raiz[1], 'unit') || 'millimeter') : 'millimeter';
  const reObj = /<object\b([^>]*)>([\s\S]*?)<\/object>/g; let m;
  while ((m = reObj.exec(txt))) {
    const id = atr(m[1], 'id'), cuerpo = m[2], o = { v: null, comps: [] };
    const iv = cuerpo.indexOf('<vertices');
    if (iv >= 0) {
      const fin = cuerpo.indexOf('</vertices>', iv), tramo = cuerpo.substring(iv, fin < 0 ? cuerpo.length : fin), v = [];
      const re = /<vertex\b([^>]*)\/?>/g; let q;
      while ((q = re.exec(tramo))) { const x = /\bx="([^"]*)"/.exec(q[1]), y = /\by="([^"]*)"/.exec(q[1]), z = /\bz="([^"]*)"/.exec(q[1]); if (x && y && z) v.push(+x[1], +y[1], +z[1]); }
      o.v = new Float64Array(v);
    }
    const reC = /<component\b([^>]*)\/?>/g; let c;
    while ((c = reC.exec(cuerpo))) o.comps.push({ id: atr(c[1], 'objectid'), path: ruta(atr(c[1], 'p:path') || atr(c[1], 'path')) || nombre, t: leerT(atr(c[1], 'transform')) });
    objetos[nombre + '#' + id] = o;
  }
  const build = /<build\b[^>]*>([\s\S]*?)<\/build>/.exec(txt);
  if (build) { const reI = /<item\b([^>]*)\/?>/g; let it; while ((it = reI.exec(build[1]))) { if (atr(it[1], 'printable') === '0') continue; items.push({ id: atr(it[1], 'objectid'), path: ruta(atr(it[1], 'p:path') || atr(it[1], 'path')) || nombre, t: leerT(atr(it[1], 'transform')) }); } }
  return { unidad, objetos, items };
}

async function medir3MF(buf) {
  const files = await unzip(buf, n => /\.model$/i.test(n));
  const nombres = Object.keys(files);
  if (!nombres.length) throw new Error('No he encontrado piezas dentro del 3MF.');
  const dec = new TextDecoder(), objetos = {}; let items = [], unidad = 'millimeter', principal = '';
  nombres.sort((a, b) => (/3dmodel\.model$/i.test(b) ? 1 : 0) - (/3dmodel\.model$/i.test(a) ? 1 : 0));
  nombres.forEach(n => {
    const mod = leerModelo(dec.decode(files[n]), ruta(n));
    Object.assign(objetos, mod.objetos);
    if (mod.items.length && !items.length) { items = mod.items; unidad = mod.unidad; principal = n; }
    else if (!principal && !items.length) unidad = mod.unidad;
  });
  const escala = UNIDAD_MM[unidad];
  if (!escala) throw new Error('El 3MF usa una unidad que no conozco («' + unidad + '»).');
  function recorrer(clave, t, b, nivel) {
    const o = objetos[clave];
    if (!o || nivel > 8) return;
    if (o.v) for (let i = 0; i < o.v.length; i += 3) { const p = aplicar(t, o.v[i], o.v[i + 1], o.v[i + 2]); meter(b, p[0], p[1], p[2]); }
    o.comps.forEach(c => recorrer(c.path + '#' + c.id, componer(c.t, t), b, nivel + 1));
  }
  let piezas = [];
  if (items.length) piezas = items.map(it => { const b = caja(); recorrer(it.path + '#' + it.id, it.t, b, 0); return b; }).filter(b => b.n);
  if (!piezas.length) { // 3MF sin <build>: cada objeto con malla es una pieza
    piezas = Object.keys(objetos).filter(k => objetos[k].v && objetos[k].v.length).map(k => { const b = caja(); recorrer(k, ID, b, 0); return b; });
  }
  if (!piezas.length) throw new Error('No he encontrado piezas dentro del 3MF.');
  piezas.sort((a, b) => vol(dims(b)) - vol(dims(a)));
  const d = dims(piezas[0]).map(x => x * escala), todo = caja();
  piezas.forEach(b => { meter(todo, b.min[0], b.min[1], b.min[2]); meter(todo, b.max[0], b.max[1], b.max[2]); });
  const out = { x: r1(d[0]), y: r1(d[1]), z: r1(d[2]), formato: '3MF', unidad, estado: 'medido', piezas: piezas.length, vertices: piezas.reduce((a, b) => a + b.n, 0), aviso: '' };
  if (piezas.length > 1) { const t = dims(todo).map(x => r1(x * escala)); out.conjunto = { x: t[0], y: t[1], z: t[2] }; out.aviso = 'El archivo trae ' + piezas.length + ' piezas: esta es la medida de la mayor. Todas juntas, como están colocadas, ocupan ' + t.join(' × ') + ' mm.'; }
  if (unidad !== 'millimeter') out.aviso = ('El archivo está en ' + ({ inch: 'pulgadas', centimeter: 'centímetros', meter: 'metros', micron: 'micras', foot: 'pies' })[unidad] + ': ya está pasado a milímetros. ' + out.aviso).trim();
  return out;
}

function cajaSTL(buf) {
  const dv = new DataView(buf), b = caja();
  const binario = buf.byteLength >= 84 && 84 + dv.getUint32(80, true) * 50 === buf.byteLength;
  if (binario) {
    const n = dv.getUint32(80, true);
    for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; for (let j = 0; j < 3; j++) meter(b, dv.getFloat32(o + j * 12, true), dv.getFloat32(o + j * 12 + 4, true), dv.getFloat32(o + j * 12 + 8, true)); }
  } else {
    const txt = new TextDecoder().decode(buf), re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g; let m;
    while ((m = re.exec(txt))) meter(b, +m[1], +m[2], +m[3]);
  }
  if (!b.n) throw new Error('El archivo STL está vacío o dañado.');
  return b;
}
function cajaOBJ(buf) {
  const b = caja(), re = /^v\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/gm, txt = new TextDecoder().decode(buf); let m;
  while ((m = re.exec(txt))) meter(b, +m[1], +m[2], +m[3]);
  if (!b.n) throw new Error('El archivo OBJ no tiene puntos.');
  return b;
}
// Sin unidad en el archivo: milímetros salvo que el tamaño no sea creíble para una pieza impresa
function sinUnidad(b, formato) {
  const d = dims(b), mayor = Math.max(d[0], d[1], d[2]);
  const fino = v => mayor < 2 ? Math.round(v * 1e5) / 1e5 : r1(v); // una pieza «diminuta» conserva decimales para poder corregir la escala
  const out = { x: fino(d[0]), y: fino(d[1]), z: fino(d[2]), formato, unidad: 'sin unidad (se lee en mm)', estado: 'supuesto', piezas: 1, vertices: b.n,
    aviso: 'El ' + formato + ' no guarda la unidad: se ha leído en milímetros, que es lo habitual.' };
  if (mayor < 2) { out.estado = 'revisar'; out.aviso = 'El ' + formato + ' no guarda la unidad y la pieza mediría menos de 2 mm: seguramente está en metros o pulgadas. Confirma la medida real.'; out.sugerencias = [{ t: 'Está en pulgadas', f: 25.4 }, { t: 'Está en centímetros', f: 10 }, { t: 'Está en metros', f: 1000 }]; }
  else if (mayor > 600) { out.estado = 'revisar'; out.aviso = 'El ' + formato + ' no guarda la unidad y la pieza mediría más de 60 cm: confirma la medida real.'; out.sugerencias = [{ t: 'Está en décimas de mm', f: 0.1 }, { t: 'Está en micras', f: 0.001 }]; }
  return out;
}

export async function medir3D(buf, nombre) {
  const ext = String(nombre || '').split('.').pop().toLowerCase();
  if (ext === '3mf') return medir3MF(buf);
  if (ext === 'obj') return sinUnidad(cajaOBJ(buf), 'OBJ');
  if (ext === 'stl') return sinUnidad(cajaSTL(buf), 'STL');
  throw new Error('Solo sé medir archivos STL, 3MF y OBJ.');
}
export const esArchivo3D = nombre => /\.(stl|3mf|obj)$/i.test(String(nombre || ''));
export const escalar = (m, f) => Object.assign({}, m, { x: r1(m.x * f), y: r1(m.y * f), z: r1(m.z * f), estado: 'manual', aviso: '' });
export const textoMedidas = p => p && Number(p.dimX) > 0 ? [p.dimX, p.dimY, p.dimZ].map(v => String(Math.round(Number(v) * 10) / 10).replace('.', ',')).join(' × ') + ' mm' : '';
