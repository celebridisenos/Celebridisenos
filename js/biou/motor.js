// ================= v15.2 · BIOUVISION PRO: el motor de fotos del PC =================
// Quitar el fondo con IA (pelo, dedos y bordes finos) y encontrar caras con ojos, nariz y boca.
//   · En el PC: lo hace su motor (Python de EDITOR_VIDEO + modelos BiRefNet / ISNet / U²-Net, con reservas).
//   · En el móvil o el portátil: se ENCARGA al PC del taller (la foto viaja por el servidor del negocio) y vuelve
//     la máscara. El móvil nunca hace el trabajo pesado.
// Si nada de eso está disponible, Biouvision sigue usando su recorte de siempre (por colores).
import { desktop } from '../desktop.js';
import { can, api } from '../store.js';
import { encargarAlPC, registrarTrabajo, refArchivo, archivoDelEncargo } from '../trabajospc.js';

let est = null, estT = 0;
export async function estadoMotor(forzar) {
  if (!desktop.on) return null;
  if (!forzar && est && Date.now() - estT < 60000) return est;
  try { est = await desktop.motorEstado(forzar); estT = Date.now(); } catch (e) { est = { listo: false, error: e.message }; }
  return est;
}
export const hayModelo = st => !!(st && (st.modelos || []).some(m => m.presente));
export async function motorAqui() { const st = await estadoMotor(); return !!(st && st.listo); }

const aBlob = (cv, tipo = 'image/png', q) => new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('No se pudo preparar la foto.')), tipo, q));
const cargarImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('No se pudo leer la máscara.')); im.src = src; });

// PNG en grises (blanco = lo que se queda) → la máscara de Biouvision { w, h, a, caja, area, modelo }
export async function mascaraDeImagen(src, info = {}) {
  const im = await cargarImg(src);
  const c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, N = c.width * c.height, a = new Float32Array(N);
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0, area = 0;
  for (let p = 0; p < N; p++) {
    const v = d[p * 4] / 255; a[p] = v;
    if (v > 0.5) { area++; const x = p % c.width, y = (p / c.width) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (!area) return null;
  return { w: c.width, h: c.height, a, caja: info.caja || { x: x0 / c.width, y: y0 / c.height, w: (x1 - x0 + 1) / c.width, h: (y1 - y0 + 1) / c.height }, area: area / N, modelo: info.modelo || '', ia: true };
}

// Recorte con IA de un lienzo (la foto ya girada/encuadrada). Devuelve la máscara o lanza un error claro.
export async function recortarConIA(cv, { onStatus, signal, modelo, calidad } = {}) {
  // la foto se manda a un tamaño de sobra para el modelo (los modelos trabajan a 1024 px)
  // v15.4 · Ultra: más grande (el borde se ajusta a la foto real: pelo y bordes finos)
  const k = Math.min(1, (calidad === 'ultra' ? 4096 : 2048) / Math.max(cv.width, cv.height)), t = document.createElement('canvas');
  t.width = Math.max(1, Math.round(cv.width * k)); t.height = Math.max(1, Math.round(cv.height * k));
  t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height);
  if (await motorAqui()) {
    onStatus && onStatus(calidad === 'ultra' ? '🖥️ Quitando el fondo con IA en modo Ultra (bordes y pelo)…' : '🖥️ Quitando el fondo con IA en este PC…');
    const r = await desktop.motorFondo(await aBlob(t, calidad === 'ultra' ? 'image/jpeg' : 'image/png', 0.96), modelo, calidad);
    if (!r.ok) throw new Error(r.error || 'No se pudo recortar.');
    return mascaraDeImagen(r.mascara, r);
  }
  if (!can('archivos.subir')) throw new Error('Para el recorte con IA hace falta poder subir archivos.');
  onStatus && onStatus('📤 Enviando la foto al PC del taller…');
  const F = await import('../files.js');
  const f = new File([await aBlob(t, 'image/jpeg', 0.95)], 'biouvision_recorte_' + Date.now() + '.jpg', { type: 'image/jpeg' });
  const a = await F.uploadFile(f, { original: true }); // archivo de trabajo: se borra solo al terminar
  const res = await encargarAlPC('fondo', { archivo: refArchivo(a), modelo: modelo || '', calidad: calidad || '' }, { onStatus, signal });
  onStatus && onStatus('📥 Recibiendo el recorte…');
  const blob = await F.fetchFile(res.archivo);
  const url = URL.createObjectURL(blob);
  try { return await mascaraDeImagen(url, res); } finally { URL.revokeObjectURL(url); api('pc.recibido', { id: res.__id }, { quiet: true }).catch(() => { }); }
}

// Caras con ojos, nariz y boca (solo en el PC; en el móvil sigue el detector ligero de siempre)
export async function carasConIA(cv) {
  if (!(await motorAqui())) return null;
  const st = await estadoMotor(); if (!st.yunet) return null;
  const k = Math.min(1, 1600 / Math.max(cv.width, cv.height)), t = document.createElement('canvas');
  t.width = Math.round(cv.width * k); t.height = Math.round(cv.height * k); t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height);
  const r = await desktop.motorCaras(await aBlob(t, 'image/jpeg', 0.92));
  return r && r.ok ? r.caras || [] : null;
}

// ---------- lo que el PC hace por los demás ----------
registrarTrabajo('fondo', async () => { const st = await estadoMotor(); return !!(st && st.listo); }, async (job, progreso) => {
  progreso(5);
  const blob = await archivoDelEncargo(job.entrada.archivo);
  progreso(25);
  const r = await desktop.motorFondo(blob, job.entrada.modelo || '', job.entrada.calidad || '');
  if (!r.ok) throw new Error(r.error || 'No se pudo recortar.');
  progreso(80);
  const png = await (await fetch(r.mascara)).blob();
  const F = await import('../files.js');
  const m = await F.uploadFile(new File([png], 'biouvision_mascara_' + job.id + '.png', { type: 'image/png' }), { original: true, miniatura: '' });
  return { archivo: refArchivo(m), caja: r.caja, area: r.area, modelo: r.modelo, ms: r.ms };
});

// ================= v15.4 · RESTAURAR FOTOS ANTIGUAS (hasta 4K) =================
// En el PC lo hace su motor (en segundo plano, con el avance en %). En el móvil se ENCARGA al PC del taller: la foto viaja
// por el servidor del negocio y vuelve restaurada. Devuelve { blob, res } (res: tamaño, qué se hizo y avisos).
const esperar = ms => new Promise(r => setTimeout(r, ms));
async function restaurarAqui(blob, mascara, opciones, { onStatus, signal, proteger } = {}) {
  const fd = new FormData();
  fd.append('foto', blob, 'foto.' + (/png/.test(blob.type) ? 'png' : 'jpg'));
  if (mascara) fd.append('mascara', mascara, 'pincel.png');
  if (proteger) fd.append('proteger', proteger, 'proteger.png');
  fd.append('opciones', JSON.stringify(opciones || {}));
  const { id } = await desktop.motorRestaurar(fd);
  let cancelado = false;
  const alCancelar = () => { cancelado = true; desktop.motorRestaurarCancelar(id).catch(() => { }); };
  if (signal) { if (signal.aborted) alCancelar(); else signal.addEventListener('abort', alCancelar, { once: true }); }
  for (;;) {
    await esperar(700);
    if (cancelado) throw new DOMException('cancelado', 'AbortError');
    const st = await desktop.motorRestaurarEstado(id);
    if (st.estado === 'hecho') {
      const res = st.res || {}, out = await desktop.motorRestaurarFoto(id);
      const antes = (res.hecho || []).includes('enderezada') ? await desktop.motorRestaurarFoto(id, 'antes').catch(() => null) : null;
      return { blob: out, antes, res };
    }
    if (st.estado === 'cancelado') throw new DOMException('cancelado', 'AbortError');
    if (st.estado === 'error') throw new Error(st.error || 'No se pudo restaurar.');
    onStatus && onStatus(st.paso || '⏳ Preparando…', st.pct || 0, st.segundos || 0);
  }
}
export async function restaurarFoto(blob, { mascara, proteger, opciones, onStatus, signal } = {}) {
  if (await motorAqui()) return restaurarAqui(blob, mascara, opciones, { onStatus, signal, proteger });
  if (!can('archivos.subir')) throw new Error('Para restaurar fotos hace falta poder subir archivos.');
  onStatus && onStatus('📤 Enviando la foto al PC del taller…', 1, 0);
  const F = await import('../files.js');
  const t0 = Date.now();
  const a = await F.uploadFile(new File([blob], 'biouvision_antigua_' + Date.now() + '.' + (/png/.test(blob.type) ? 'png' : 'jpg'), { type: blob.type || 'image/jpeg' }), { original: true, miniatura: '' });
  const m = mascara ? await F.uploadFile(new File([mascara], 'biouvision_pincel_' + Date.now() + '.png', { type: 'image/png' }), { original: true, miniatura: '' }) : null;
  const pr = proteger ? await F.uploadFile(new File([proteger], 'biouvision_proteger_' + Date.now() + '.png', { type: 'image/png' }), { original: true, miniatura: '' }) : null;
  const res = await encargarAlPC('restaurar', { archivo: refArchivo(a), mascara: m ? refArchivo(m) : null, proteger: pr ? refArchivo(pr) : null, opciones: opciones || {} },
    { onStatus: (t, p) => onStatus && onStatus(t, p || 0, Math.round((Date.now() - t0) / 1000)), signal, maxMs: 3600000 });
  onStatus && onStatus('📥 Recibiendo la foto restaurada…', 99, Math.round((Date.now() - t0) / 1000));
  try { return { blob: await F.fetchFile(res.archivo), antes: res.antes ? await F.fetchFile(res.antes).catch(() => null) : null, res }; }
  finally { api('pc.recibido', { id: res.__id }, { quiet: true }).catch(() => { }); }
}
// Solo ver los daños (polvo, arañazos) para enseñarlos en rojo antes de restaurar (en el PC; es rápido)
export async function verDanos(blob, nivel, enderezar) {
  if (!(await motorAqui())) return null;
  const fd = new FormData(); fd.append('foto', blob, 'foto.jpg'); fd.append('opciones', JSON.stringify({ nivel, enderezar: !!enderezar }));
  const r = await desktop.motorDanos(fd);
  return r && r.ok ? r : null;
}
registrarTrabajo('restaurar', async () => { const st = await estadoMotor(); return !!(st && st.listo); }, async (job, progreso) => {
  progreso(2);
  const e = job.entrada || {}, blob = await archivoDelEncargo(e.archivo), mascara = e.mascara ? await archivoDelEncargo(e.mascara) : null;
  progreso(4);
  const { blob: out, antes, res } = await restaurarAqui(blob, mascara, e.opciones || {}, { proteger: e.proteger ? await archivoDelEncargo(e.proteger) : null, onStatus: (t, p) => progreso(4 + (p || 0) * 0.9) });
  const F = await import('../files.js');
  const f = await F.uploadFile(new File([out], 'biouvision_restaurada_' + job.id + '.' + (res.formato === 'png' ? 'png' : 'jpg'), { type: res.formato === 'png' ? 'image/png' : 'image/jpeg' }), { original: true, miniatura: '' });
  const a = antes ? await F.uploadFile(new File([antes], 'biouvision_antes_' + job.id + '.jpg', { type: 'image/jpeg' }), { original: true, miniatura: '' }) : null;
  return { archivo: refArchivo(f), antes: a ? refArchivo(a) : null, w: res.w, h: res.h, hecho: res.hecho || [], avisos: res.avisos || [], caras: res.caras || 0, monocroma: !!res.monocroma, ms: res.ms };
});
