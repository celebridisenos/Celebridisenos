// ================= v20 · 🧊 CelebriR8 · LO QUE COMPARTEN TODAS LAS PESTAÑAS =================
// · LA MESA: el modelo con el que estás trabajando pasa de una pestaña a otra (Foto → Reparar → Imprimir) sin descargar
//   ni volver a abrir archivos. Se guarda SIEMPRE el original y un historial para deshacer. Los últimos modelos quedan en
//   «Recientes» (en este aparato, IndexedDB «celebrir8_mesa»), para recuperarlos aunque cierres el programa.
// · LAS TAREAS: lo que tarda (generar, Blender, el Smart Lab) se apunta aquí con su avance REAL; la barra de estado lo enseña.
// · EL SISTEMA: qué hay de verdad en este PC (tarjeta gráfica y su memoria libre, Blender, motores instalados, nube).

// ---------- avisos entre pestañas ----------
const oyentes = new Map();
export function escucha(tipo, fn) { if (!oyentes.has(tipo)) oyentes.set(tipo, new Set()); oyentes.get(tipo).add(fn); return () => oyentes.get(tipo).delete(fn); }
function avisa(tipo, dato) { (oyentes.get(tipo) || []).forEach(fn => { try { fn(dato); } catch (e) { console.error(e); } }); }

// ---------- TAREAS ----------
let sec = 0;
export const TAREAS = new Map(); // id → { id, nombre, pct, txt, t0, estado: 'va'|'bien'|'mal', fin }
export function tarea(nombre) {
  const id = ++sec, T = { id, nombre, pct: null, txt: '', t0: Date.now(), estado: 'va' };
  TAREAS.set(id, T); avisa('tareas', T);
  const cierra = (estado, txt) => { T.estado = estado; T.txt = txt || T.txt; T.fin = Date.now(); avisa('tareas', T); setTimeout(() => { TAREAS.delete(id); avisa('tareas', null); }, estado === 'bien' ? 6000 : 15000); };
  return {
    avance(pct, txt) { if (T.estado !== 'va') return; if (pct != null) T.pct = Math.max(0, Math.min(100, pct)); if (txt != null) T.txt = txt; avisa('tareas', T); },
    bien(txt) { cierra('bien', txt); }, mal(txt) { cierra('mal', txt); }
  };
}
export const enMarcha = () => [...TAREAS.values()].filter(t => t.estado === 'va');

// ---------- SISTEMA ----------
export const SIS = { listo: false, pc: false, python: false, blender: false, tarjeta: null, motores: [], nube: {}, hora: 0 };
let pidiendo = null;
export async function sistema(forzar) {
  if (!forzar && SIS.listo && Date.now() - SIS.hora < 20000) return SIS;
  if (pidiendo) return pidiendo;
  pidiendo = (async () => {
    const d = await import('../desktop.js').catch(() => null), D = d && d.desktop;
    SIS.pc = !!(D && D.on);
    if (SIS.pc) {
      const [a, b] = await Promise.all([D.motor3dEstado ? D.motor3dEstado().catch(e => ({ error: e.message })) : null, D.nube3dEstado ? D.nube3dEstado().catch(() => ({})) : null]);
      if (a && !a.error) Object.assign(SIS, { python: !!a.python, blender: !!a.blender, blenderVer: a.blender_version || '', bambu: !!a.bambu, tarjeta: a.tarjeta || null, motores: a.motores || [] });
      SIS.error = a && a.error; SIS.nube = b || {};
    }
    SIS.listo = true; SIS.hora = Date.now(); avisa('sistema', SIS); return SIS;
  })().finally(() => { pidiendo = null; });
  return pidiendo;
}
export const motorListo = id => !!(SIS.motores.find(m => m.id === id) || {}).listo;
export const gbLibres = () => SIS.tarjeta && SIS.tarjeta.total_mb ? SIS.tarjeta.libre_mb / 1024 : null;

// ---------- LA MESA ----------
// pieza = { id, nombre, origen ('foto'|'lab'|'estudio'|'precision'|'archivo'|'taller'), motor?, stl: Uint8Array (STL binario),
//           original: Uint8Array, historial: [{ stl, que }], medidas?, notas? }
let MESA = null;
export const mesa = () => MESA;
export function ponEnMesa(p, sinGuardar) {
  const stl = p.stl instanceof Uint8Array ? p.stl : new Uint8Array(p.stl);
  MESA = { id: p.id || ('m' + Date.now().toString(36)), nombre: p.nombre || 'Modelo', origen: p.origen || 'archivo', motor: p.motor || '', stl, original: p.original || stl, historial: p.historial || [], datos: p.datos || null, fecha: Date.now() };
  avisa('mesa', MESA); if (!sinGuardar) guardaReciente(MESA).catch(() => { });
  return MESA;
}
// un cambio (reparar, aligerar…): se apila lo anterior para poder deshacer; el original no se toca nunca
export function cambiaMesa(stl, que) { if (!MESA) return null; MESA.historial.push({ stl: MESA.stl, que }); MESA.stl = stl; MESA.fecha = Date.now(); avisa('mesa', MESA); guardaReciente(MESA).catch(() => { }); return MESA; }
export function deshazMesa() { if (!MESA || !MESA.historial.length) return null; const u = MESA.historial.pop(); MESA.stl = u.stl; avisa('mesa', MESA); guardaReciente(MESA).catch(() => { }); return u.que; }
export function originalMesa() { if (!MESA) return; if (MESA.stl !== MESA.original) { MESA.historial.push({ stl: MESA.stl, que: 'volver al original' }); MESA.stl = MESA.original; avisa('mesa', MESA); guardaReciente(MESA).catch(() => { }); } }

// ---------- RECIENTES (IndexedDB aparte: no toca la base de proyectos del Estudio) ----------
const BD = 'celebrir8_mesa', AL = 'recientes', MAX = 16;
function abre() { return new Promise((res, rej) => { const r = indexedDB.open(BD, 1); r.onupgradeneeded = () => r.result.createObjectStore(AL, { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function tx(modo, f) { const db = await abre(); return new Promise((res, rej) => { const t = db.transaction(AL, modo), s = t.objectStore(AL); let out; Promise.resolve(f(s)).then(r => { if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; }; else out = r; }); t.oncomplete = () => { db.close(); res(out); }; t.onerror = () => { db.close(); rej(t.error); }; }); }
async function guardaReciente(M) {
  await tx('readwrite', s => s.put({ id: M.id, nombre: M.nombre, origen: M.origen, motor: M.motor, fecha: M.fecha, stl: M.stl, original: M.original === M.stl ? null : M.original, pasos: M.historial.map(x => x.que), datos: M.datos }));
  const L = await recientes(); if (L.length > MAX) await tx('readwrite', s => { L.slice(MAX).forEach(x => s.delete(x.id)); });
  avisa('recientes', null);
}
export async function recientes() { try { const L = await tx('readonly', s => s.getAll()); return (L || []).map(x => ({ id: x.id, nombre: x.nombre, origen: x.origen, motor: x.motor, fecha: x.fecha, kb: Math.round(((x.stl && x.stl.byteLength) || 0) / 1024), pasos: x.pasos || [] })).sort((a, b) => b.fecha - a.fecha); } catch (e) { return []; } }
export async function abreReciente(id) { const x = await tx('readonly', s => s.get(id)); if (!x) throw new Error('Ese modelo ya no está en Recientes.'); MESA = null; return ponEnMesa({ id: x.id, nombre: x.nombre, origen: x.origen, motor: x.motor, stl: x.stl, original: x.original || x.stl, historial: (x.pasos || []).map(q => ({ stl: x.original || x.stl, que: q })).slice(-1), datos: x.datos }, true); }
export async function quitaReciente(id) { await tx('readwrite', s => s.delete(id)); avisa('recientes', null); }

// ---------- la foto con la que estás (Foto → 3D se la pasa al Smart Lab) ----------
let FOTO = null;
export const compartirFoto = f => { FOTO = f; };
// v20.2 · un archivo 3D que otra pantalla (Productos → «🧰 Abrir en el Estudio») deja para el Estudio: el Estudio lo recoge al abrirse
let PARA_ESTUDIO = null;
export const paraEstudio = f => { PARA_ESTUDIO = f; try { localStorage.setItem('cd.r8.pest', 'estudio'); } catch (e) { } };
export const tomaParaEstudio = () => { const f = PARA_ESTUDIO; PARA_ESTUDIO = null; return f; };
export const fotoCompartida = () => FOTO;

// ---------- utilidades ----------
export function b64aU8(b64) { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }
export const ORIGEN = { foto: '🪄 Foto → 3D', lab: '🧪 Smart Lab', estudio: '🧰 Estudio', precision: '📏 Precision Lab', archivo: '📂 Archivo', taller: '🛠️ Blender Workshop', catalogo: '🛍️ Catálogo' };
export function fechaCorta(t) { const d = new Date(t), hoy = new Date(); return d.toDateString() === hoy.toDateString() ? 'hoy ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
