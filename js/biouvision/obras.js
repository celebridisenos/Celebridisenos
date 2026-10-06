// ================= v15.4 · BIOUVISION · MIS FOTOS (en este aparato) =================
// Cada foto restaurada o recortada se guarda sola aquí (en el navegador de este aparato, sin subir nada).
// Se guardan las 40 últimas. Para tenerla en el negocio: «☁️ Guardar en la biblioteca».
const MAX = 40;
let dbp;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('biouvision', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('obras')) r.result.createObjectStore('obras', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(modo, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction('obras', modo), st = t.objectStore('obras'), r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
}
export async function miniatura(blob, lado = 360) {
  const bm = await createImageBitmap(blob);
  const k = Math.min(1, lado / Math.max(bm.width, bm.height)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bm.width * k)); c.height = Math.max(1, Math.round(bm.height * k));
  c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
  const w = bm.width, hh = bm.height; bm.close && bm.close();
  return { url: c.toDataURL('image/jpeg', 0.82), w, h: hh };
}
// obra: { tipo: 'restaurada'|'recorte'|'estudio', nombre, blob, antes?, info? }
export async function guardarObra(o) {
  const m = await miniatura(o.blob);
  const fila = { id: 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fecha: new Date().toISOString(), tipo: o.tipo, nombre: o.nombre || 'foto', blob: o.blob, antes: o.antes || null, info: o.info || {}, mini: m.url, w: m.w, h: m.h };
  await tx('readwrite', s => s.put(fila));
  const todas = await listarObras();
  for (const x of todas.slice(MAX)) await borrarObra(x.id);
  return fila;
}
export async function listarObras() {
  const l = (await tx('readonly', s => s.getAll()).catch(() => [])) || [];
  return l.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
}
export const obra = id => tx('readonly', s => s.get(id));
export const borrarObra = id => tx('readwrite', s => s.delete(id));
