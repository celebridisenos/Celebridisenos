// ================= 👗 CelebriDREW · EL PROYECTO: datos, historial (deshacer / rehacer), versiones y guardado =================
// Un proyecto guarda TODO lo de una prenda: sus fotos (aparte, en el almacén de imágenes), el análisis de la foto por etapas, las medidas
// con su ORIGEN ('ia' = estimada por la foto · 'usuario' = la ha puesto una persona · 'calculada' = sale de otras · 'verificada' = medida en
// una prueba física), la prenda (plantilla + medidas + opciones → piezas y costuras), las EDICIONES hechas a mano encima (se vuelven a
// aplicar cuando cambian las medidas: así no se pierden), los materiales, y las versiones guardadas.
// Se guarda solo en ESTE aparato (IndexedDB): las fotos no salen de aquí si no se exportan.
import * as BL from './bloques/index.js';
import * as Z from './pieza.js';

export const ORIGENES = { ia: 'Estimada por la foto', usuario: 'Puesta por ti', calculada: 'Calculada', verificada: 'Comprobada en una prueba', plantilla: 'De la plantilla' };
export function nuevo(nombre = 'Prenda nueva') {
  return { id: Z.nid('pr'), nombre, creado: new Date().toISOString(), modificado: new Date().toISOString(), imagenes: [], analisis: null, medidas: {}, prenda: null, ediciones: [], materiales: [], versiones: [], notas: [] };
}
// generar (o regenerar) la prenda desde su plantilla con las medidas del proyecto, y volver a aplicar las ediciones a mano
export function generaPrenda(P, k, opciones) {
  const base = P.prenda && P.prenda.bloque && P.prenda.bloque.k === k ? P.prenda.bloque : null, med = {};
  Object.entries(P.medidas || {}).forEach(([m, x]) => { if (x && isFinite(x.v)) med[m] = x.v; });
  const R = BL.genera(k, med, opciones || (base && base.opciones));
  const prenda = Object.assign({ nombre: P.nombre, talla: P.prenda && P.prenda.talla, revisado: null }, R);
  const fallos = aplicaEdiciones(prenda, P.ediciones || []);
  P.prenda = prenda; P.modificado = new Date().toISOString();
  // las medidas que no puso nadie se apuntan como «de la plantilla» (para que se vea de dónde sale cada número)
  Object.entries(R.bloque.medidas).forEach(([m, v]) => { if (!P.medidas[m]) P.medidas[m] = { v, origen: 'plantilla', confianza: 1 }; });
  return { prenda, fallos };
}
// las ediciones a mano: { op, pieza (nombre), args } — por nombre de pieza para que sobrevivan a regenerar
export const OPS = {
  muevePunto: (pz, a) => Z.muevePunto(pz, a.punto, a.dx, a.dy),
  ponTirador: (pz, a) => Z.ponTirador(pz, a.tramo, a.k, a.x, a.y),
  aCurva: (pz, a) => Z.aCurva(pz, a.tramo), aRecta: (pz, a) => Z.aRecta(pz, a.tramo),
  margen: (pz, a) => { if (a.borde) pz.margen.borde[a.borde] = a.mm; else pz.margen.def = a.mm; },
  material: (pz, a) => { pz.material = a.material; },
  piquete: (pz, a) => { pz.piquetes.push({ id: Z.nid('pq'), borde: a.borde, d: a.d, n: a.n || 1 }); },
  quitaPiquete: (pz, a) => { pz.piquetes = pz.piquetes.filter((q, i) => !(q.borde === a.borde && Math.abs(q.d - a.d) < 0.5)); },
  cantidad: (pz, a) => { pz.corte.n = a.n; },
  partir: (pz, a) => { Z.partirTramo(pz, a.tramo, a.s, a.nombre || 'Punto añadido', a.id, a.tid); },
  quitarPunto: (pz, a) => { Z.quitarPunto(pz, a.punto); },
  largoBorde: (pz, a) => { Z.largoBordeRecto(pz, a.borde, a.mm); }, // (16-10: escribir el largo exacto de un borde recto: se mueve su punta final)
};
export function aplicaEdiciones(prenda, ediciones) {
  const fallos = [];
  ediciones.forEach(e => { const pz = prenda.piezas.find(p => p.nombre === e.pieza); try { if (!pz) throw new Error('ya no existe la pieza «' + e.pieza + '»'); OPS[e.op](pz, e.args); } catch (x) { fallos.push({ e, motivo: x.message }); } });
  return fallos;
}
// ---------- DESHACER / REHACER (fotos del estado, sin las imágenes) ----------
export function historial(limite = 80) {
  const atras = [], adelante = [];
  return {
    apunta(P, que) { atras.push({ que, s: JSON.stringify(sinPesos(P)) }); if (atras.length > limite) atras.shift(); adelante.length = 0; },
    deshacer(P) { const x = atras.pop(); if (!x) return null; adelante.push({ que: x.que, s: JSON.stringify(sinPesos(P)) }); return { que: x.que, P: Object.assign(JSON.parse(x.s), { imagenes: P.imagenes }) }; },
    rehacer(P) { const x = adelante.pop(); if (!x) return null; atras.push({ que: x.que, s: JSON.stringify(sinPesos(P)) }); return { que: x.que, P: Object.assign(JSON.parse(x.s), { imagenes: P.imagenes }) }; },
    get puedeDeshacer() { return atras.length > 0; }, get puedeRehacer() { return adelante.length > 0; }, get ultimo() { return atras.length ? atras[atras.length - 1].que : ''; },
  };
}
const sinPesos = P => Object.assign({}, P, { imagenes: (P.imagenes || []).map(i => Object.assign({}, i, { datos: undefined })) });
// ---------- VERSIONES (guardadas a propósito, con nombre) ----------
export function guardaVersion(P, nombre) { P.versiones.push({ n: P.versiones.length + 1, fecha: new Date().toISOString(), nombre: nombre || 'Versión ' + (P.versiones.length + 1), prenda: JSON.parse(JSON.stringify(P.prenda)), medidas: JSON.parse(JSON.stringify(P.medidas)), ediciones: JSON.parse(JSON.stringify(P.ediciones)) }); return P.versiones[P.versiones.length - 1]; }
export function recuperaVersion(P, n) { const v = P.versiones.find(x => x.n === n); if (!v) throw new Error('No existe esa versión.'); P.prenda = JSON.parse(JSON.stringify(v.prenda)); P.medidas = JSON.parse(JSON.stringify(v.medidas)); P.ediciones = JSON.parse(JSON.stringify(v.ediciones)); return P; }

// ---------- GUARDAR en este aparato (IndexedDB; en las pruebas de node, en memoria) ----------
const DB = 'celebridrew', VER = 1;
let memoria = null;
function abre() {
  if (typeof indexedDB === 'undefined') { memoria = memoria || { proyectos: new Map(), imagenes: new Map() }; return Promise.resolve(null); }
  return new Promise((res, rej) => { const r = indexedDB.open(DB, VER); r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('proyectos')) d.createObjectStore('proyectos', { keyPath: 'id' }); if (!d.objectStoreNames.contains('imagenes')) d.createObjectStore('imagenes', { keyPath: 'id' }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
const tx = (d, almacen, modo, fn) => new Promise((res, rej) => { const t = d.transaction(almacen, modo), s = t.objectStore(almacen), r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); });
export async function guarda(P) {
  P.modificado = new Date().toISOString(); const d = await abre(), limpio = sinPesos(P);
  const imgs = (P.imagenes || []).filter(i => i.datos).map(i => ({ id: i.id, datos: i.datos }));
  if (!d) { memoria.proyectos.set(P.id, JSON.parse(JSON.stringify(limpio))); imgs.forEach(i => memoria.imagenes.set(i.id, i)); return; }
  await tx(d, 'proyectos', 'readwrite', s => s.put(JSON.parse(JSON.stringify(limpio)))); for (const i of imgs) await tx(d, 'imagenes', 'readwrite', s => s.put(i));
}
export async function abrir(id) {
  const d = await abre(); let P, img = async iid => (d ? await tx(d, 'imagenes', 'readonly', s => s.get(iid)) : memoria.imagenes.get(iid));
  P = d ? await tx(d, 'proyectos', 'readonly', s => s.get(id)) : memoria.proyectos.get(id); if (!P) throw new Error('No encuentro ese proyecto.'); P = JSON.parse(JSON.stringify(P));
  for (const i of P.imagenes || []) { const x = await img(i.id); if (x) i.datos = x.datos; }
  return P;
}
export async function lista() { const d = await abre(); const L = d ? await tx(d, 'proyectos', 'readonly', s => s.getAll()) : [...memoria.proyectos.values()]; return (L || []).map(p => ({ id: p.id, nombre: p.nombre, modificado: p.modificado, categoria: p.prenda && p.prenda.categoria, estado: p.prenda && p.prenda.estado })).sort((a, b) => String(b.modificado).localeCompare(String(a.modificado))); }
export async function borra(id) { const d = await abre(); const P = d ? await tx(d, 'proyectos', 'readonly', s => s.get(id)) : memoria.proyectos.get(id); const ids = ((P && P.imagenes) || []).map(i => i.id);
  if (!d) { memoria.proyectos.delete(id); ids.forEach(i => memoria.imagenes.delete(i)); return; } await tx(d, 'proyectos', 'readwrite', s => s.delete(id)); for (const i of ids) await tx(d, 'imagenes', 'readwrite', s => s.delete(i)); }
export async function borraImagen(P, iid) { P.imagenes = P.imagenes.filter(i => i.id !== iid); const d = await abre(); if (!d) memoria.imagenes.delete(iid); else await tx(d, 'imagenes', 'readwrite', s => s.delete(iid)); }
