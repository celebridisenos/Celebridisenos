// ================= Archivos: validar, miniaturas, subir por trozos, ver =================
import { h, mount, icon, btn, bytes, toast, modal, uid, fdt, confirmDlg } from './ui.js';
import { S, api, can, upsertLocal, removeLocal, emit, kv } from './store.js';
import { parse3D, viewer, thumb3D } from './stl.js';
import { desktop } from './desktop.js';
import { editPhoto } from './fotoeditor.js';
const esFoto = f => /^image\/(jpeg|png|webp)/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name || ''); // (HEIC/GIF se suben tal cual: el navegador no los edita)
const retocarOn = () => { try { return localStorage.getItem('cd.retocar') === '1'; } catch (e) { return false; } };

export const RULES = {
  foto: { ext: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'], max: 25 * 1048576, accept: 'image/*,.heic,.heif', t: 'Foto', s: 'Foto', i: 'camera', hint: 'JPG, PNG, WEBP o HEIC · máx. 25 MB' },
  video: { ext: ['mp4', 'mov', 'webm', 'm4v', '3gp', 'avi', 'mkv'], max: 500 * 1048576, accept: 'video/*', t: 'Vídeo', s: 'Vídeo', i: 'video', hint: 'MP4, MOV o WEBM · máx. 500 MB' },
  stl: { ext: ['stl', '3mf', 'obj', 'step', 'stp', 'gcode', 'bgcode'], max: 300 * 1048576, accept: '.stl,.3mf,.obj,.step,.stp,.gcode,.bgcode', t: 'Archivo 3D (STL)', s: '3D', i: 'cube', hint: 'STL, 3MF, OBJ, STEP o GCODE · máx. 300 MB' },
  doc: { ext: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'md', 'markdown', 'json', 'html', 'htm', 'odt', 'ods', 'ppt', 'pptx', 'zip', 'svg', 'ai', 'psd'], max: 100 * 1048576, accept: '', t: 'Documento', s: 'Doc', i: 'file', hint: 'PDF, Word, Excel, ZIP… · máx. 100 MB' }
};
export const extOf = n => { const s = String(n || ''), i = s.lastIndexOf('.'); return i > 0 && i > s.lastIndexOf('/') ? s.slice(i + 1).toLowerCase() : ''; };
export function kindOf(name) { const e = extOf(name); for (const k in RULES) if (RULES[k].ext.includes(e)) return k; return ''; }
// v13.5 · ARCHIVOS DEL MÓVIL. Android (galería, Google Fotos, Drive, «Descargas», WhatsApp…) entrega a veces el
// archivo SIN extensión («1000012345», «image:4521», «document») o con una rara; el programa decidía el tipo solo
// por la extensión y daba «Formato no admitido» aunque fuera una foto o un PDF normal. Ahora se mira también el
// tipo (MIME) que da el móvil, se le pone la extensión que le toca y se limpia el nombre (sin caracteres que
// Google Drive o Windows no aceptan), conservando siempre la extensión aunque el nombre sea muy largo.
export const MIME_EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/pjpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif', 'image/heic-sequence': 'heic', 'image/heif-sequence': 'heif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/x-m4v': 'm4v', 'video/3gpp': '3gp', 'video/3gpp2': '3gp', 'video/x-msvideo': 'avi', 'video/x-matroska': 'mkv',
  'application/pdf': 'pdf', 'application/x-pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'text/csv': 'csv', 'text/comma-separated-values': 'csv', 'text/plain': 'txt', 'text/markdown': 'md',
  'application/json': 'json', 'text/html': 'html', 'application/vnd.oasis.opendocument.text': 'odt', 'application/vnd.oasis.opendocument.spreadsheet': 'ods', 'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx', 'application/zip': 'zip', 'application/x-zip-compressed': 'zip', 'image/svg+xml': 'svg',
  'model/stl': 'stl', 'application/sla': 'stl', 'application/vnd.ms-pki.stl': 'stl', 'model/3mf': '3mf', 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml': '3mf', 'model/obj': 'obj'
};
const ALL_EXT = Object.values(RULES).flatMap(r => r.ext);
export function cleanName(name, ext) {
  let n = String(name || '').normalize ? String(name || '').normalize('NFC') : String(name || '');
  n = n.replace(/^.*[\\/]/, '').replace(/[\u0000-\u001f\u007f]+/g, '').replace(/[\\/:*?"<>|#%]+/g, '_').replace(/\s+/g, ' ').trim();
  let base = n, e = extOf(n);
  if (e && ALL_EXT.includes(e)) { base = n.slice(0, -(e.length + 1)); e = n.slice(-e.length); } else e = ''; // conserva «.JPG» tal cual
  if (ext) e = ext;
  base = base.replace(/^[.\s_]+|[.\s]+$/g, '') || 'archivo';
  if (base.length > 120) base = base.slice(0, 120).trim();
  return e ? base + '.' + e : base;
}
// Devuelve un File con un nombre válido y la extensión correcta (o el mismo si ya lo era)
export function normalizeFile(f) {
  if (!f) return f;
  const e = extOf(f.name), known = e && ALL_EXT.includes(e), type = String(f.type || '').toLowerCase().split(';')[0];
  const fromMime = MIME_EXT[type] || (type.startsWith('image/') && !known ? 'jpg' : '') || '';
  const name = known ? cleanName(f.name) : cleanName(f.name, fromMime);
  if (name === f.name) return f;
  try { return new File([f], name, { type: f.type || '', lastModified: f.lastModified }); }
  catch (x) { try { const b = f.slice(0, f.size, f.type); b.name = name; b.lastModified = f.lastModified; return b; } catch (y) { return f; } }
}
const touchDevice = () => { try { return (navigator.maxTouchPoints || 0) > 0 && /Android|iP(hone|ad|od)|Mobi/i.test(navigator.userAgent || ''); } catch (e) { return false; } };
export function validate(file, tipo) {
  const k = kindOf(file.name);
  if (!k) return extOf(file.name) ? 'Formato no admitido (.' + extOf(file.name) + '). Fotos: JPG, PNG, WEBP o HEIC · Vídeos: MP4 o MOV · Documentos: PDF, Word, Excel…' : 'No se reconoce el tipo de este archivo (no tiene extensión ni tipo conocido). Prueba a guardarlo primero en el móvil y elígelo desde «Archivos».';
  if (tipo && k !== tipo) return 'Aquí van archivos de tipo ' + RULES[tipo].t.toLowerCase() + '. Este es ' + RULES[k].t.toLowerCase() + '.';
  if (!file.size) return 'El archivo está vacío.';
  if (file.size > RULES[k].max) return 'Pesa ' + bytes(file.size) + '. El máximo es ' + bytes(RULES[k].max) + '.';
  return '';
}
export async function sha256(file) {
  // v13.5: en el móvil, leer de golpe un vídeo de 150 MB para la huella podía cerrar la página (memoria). Allí el límite es 40 MB.
  if (file.size > (touchDevice() ? 40 : 200) * 1048576 || !crypto.subtle) return '';
  const d = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
}
export async function makeThumb(file, kind) {
  try {
    if (kind === 'foto') {
      const bmp = await createImageBitmap(file);
      const s = 200 / Math.max(bmp.width, bmp.height);
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.72);
    }
    if (kind === 'video') {
      const url = URL.createObjectURL(file);
      try {
        const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
        await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(rej, 8000); });
        v.currentTime = Math.min(1, (v.duration || 2) / 3);
        await new Promise(res => { v.onseeked = res; setTimeout(res, 3000); });
        const s = 200 / Math.max(v.videoWidth, v.videoHeight);
        const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.7);
      } finally { URL.revokeObjectURL(url); }
    }
    if (kind === 'stl' && ['stl', '3mf', 'obj'].includes(extOf(file.name)) && file.size < 120 * 1048576) {
      return (await thumb3D(await file.arrayBuffer(), file.name)).url;
    }
  } catch (e) { console.warn('miniatura', e); }
  return '';
}

// v9.7: las fotos del móvil (3-8 MB) se reducen antes de subir (lado mayor 2048 px, JPEG 85 %).
// Se ven igual de bien en la app y en las redes y suben 10-20 veces más rápido.
export async function shrinkPhoto(file, max = 2048, q = 0.85) {
  try {
    if (!/^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(file.type || '') || file.size < 700 * 1024) return file;
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (s === 1 && file.size < 2.5 * 1048576) return file;
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const png = /png/i.test(file.type);
    const type = png ? 'image/webp' : 'image/jpeg'; // webp mantiene la transparencia de los PNG
    const blob = await new Promise(r => c.toBlob(r, type, q));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + (png ? '.webp' : '.jpg'), { type, lastModified: file.lastModified });
  } catch (e) { return file; }
}

// Sube un archivo a Drive por trozos. onProgress(0..1)
// v13.5 · más fiable en el móvil: trozos de 2 MB (antes 4 MB) con datos móviles, si un trozo no llega se parte por la
// mitad y se pregunta al servidor hasta dónde ha llegado (nunca se duplica ni se corrompe el archivo), y los errores
// se explican con palabras normales. Si falla, queda apuntado en Auditoría («subida fallida») para poder revisarlo.
const MB = 1048576, ALIGN = 256 * 1024, MIN_CHUNK = 512 * 1024;
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function readError(e) {
  const n = (e && e.name) || '';
  return /NotReadable|NotFound|Security|Abort/i.test(n) || /could not be read|permission|requested file/i.test((e && e.message) || '');
}
export function friendlyUploadError(e, file) {
  if (e && e.amigable) return e;
  const code = (e && e.code) || '', msg = (e && e.message) || String(e || '');
  let t;
  if (readError(e)) t = 'El móvil no deja leer «' + (file && file.name) + '» (puede que esté solo en la nube —Google Fotos, Drive, iCloud— o que se haya movido). Ábrelo o descárgalo primero en el móvil y vuelve a elegirlo.';
  else if (code === 'NET') t = /tarda demasiado/.test(msg) ? 'La subida tarda demasiado (conexión lenta). Prueba con Wi-Fi o con un archivo más pequeño; puedes reintentarlo con ↻.' : 'Sin conexión: vuelve a intentarlo cuando tengas Internet.';
  else if (code === 'SERVER') t = 'Google Drive no ha podido guardar el archivo ahora mismo. Vuelve a intentarlo en un momento (↻).' + (msg ? ' (' + msg.replace(/^Error interno del servidor\.\s*/, '').slice(0, 140) + ')' : '');
  else if (code === 'BUSY') t = 'El servidor está ocupado. Vuelve a intentarlo en unos segundos (↻).';
  else if (code === 'AUTH') t = 'Tu sesión ha caducado: vuelve a entrar y repite la subida.';
  else t = msg || 'No se pudo subir el archivo.';
  const out = new Error(t); out.code = code || 'CLIENTE'; out.amigable = true; out.original = msg;
  return out;
}
function reportFailure(file, meta, e) {
  if (e && e.code === 'NET' && !/tarda demasiado/.test(e.message || '')) return; // sin Internet no se puede avisar
  try {
    api('archivos.fallo', { nombre: file && file.name, tamano: file && file.size, mime: file && file.type, entidad: meta && meta.entidad, entidadId: meta && meta.entidadId,
      codigo: (e && e.code) || (e && e.name) || '', mensaje: String((e && (e.original || e.message)) || e).slice(0, 300), navegador: String(navigator.userAgent || '').slice(0, 200) }, { quiet: true, timeout: 20000 }).catch(() => { });
  } catch (x) { }
}
export async function uploadFile(file, meta, onProgress) {
  file = normalizeFile(file);
  try { return await uploadInner(file, meta, onProgress); }
  catch (e) { const fe = friendlyUploadError(e, file); reportFailure(file, meta, fe); throw fe; }
}
async function uploadInner(file, meta, onProgress) {
  if (kindOf(file.name) === 'foto' && !meta.original) file = await shrinkPhoto(file);
  const tipo = kindOf(file.name);
  const huella = meta.huella !== undefined ? meta.huella : await sha256(file).catch(() => '');
  const miniatura = meta.miniatura !== undefined ? meta.miniatura : await makeThumb(file, tipo);
  const st = await api('archivos.iniciar', { nombre: file.name, tamano: file.size, mime: file.type || '', huella, miniatura, tipo, entidad: meta.entidad || '', entidadId: meta.entidadId || '', rutaLocal: meta.rutaLocal || '', visibilidad: meta.visibilidad || '' });
  if (st.duplicado) { upsertLocal('archivos', st.archivo); emit(); return Object.assign({ aviso: st.mensaje }, st.archivo); }
  const conn = (navigator.connection || {}), lento = touchDevice() || /2g|3g/.test(conn.effectiveType || '') || conn.saveData;
  let size = Math.max(MIN_CHUNK, Math.min(st.trozo || 4 * MB, lento ? 2 * MB : (st.trozo || 4 * MB)));
  let off = 0, last = null, fails = 0;
  while (off < file.size) {
    const chunk = file.slice(off, off + size);
    const b64 = await blobToB64(chunk);
    try {
      last = await api('archivos.trozo', { subida: st.subida, desde: off, datos: b64 }, { timeout: Math.max(90000, Math.round(chunk.size / MB * 45000)) });
      fails = 0;
    } catch (e) {
      if (!['NET', 'SERVER', 'BUSY'].includes(e.code) || ++fails > 5) throw e;
      if (e.code === 'NET' && size > MIN_CHUNK) size = Math.max(MIN_CHUNK, Math.floor(size / 2 / ALIGN) * ALIGN);
      await sleep(1500 * fails);
      // ¿llegó el trozo aunque no llegara la respuesta? Se pregunta en qué punto va la subida
      let est = null;
      try { est = await api('archivos.estado', { subida: st.subida }, { timeout: 30000, quiet: true }); } catch (x) { if (x.code === 'VALIDATION') throw x; }
      if (est && est.hecho) { last = est; off = file.size; break; }
      if (est && typeof est.recibido === 'number') off = est.recibido;
      continue;
    }
    off = last.hecho ? file.size : (last.recibido || off + chunk.size);
    onProgress && onProgress(off / file.size);
  }
  if (!last || !last.archivo) throw Object.assign(new Error('La subida no se ha completado. Vuelve a intentarlo (↻).'), { code: 'SERVER' });
  upsertLocal('archivos', last.archivo); emit();
  // v10: vista previa ligera para el feed y el catálogo (el original queda intacto en Drive)
  if (tipo === 'foto' && last.archivo && last.archivo.driveId) makePreview(file).then(async pv => {
    if (!pv) return;
    try { await api('archivos.previewGuardar', { id: last.archivo.id, datos: await blobToB64(pv), mime: pv.type }, { quiet: true }); } catch (e) { }
    try { await kv.set('pv:' + last.archivo.id, pv); } catch (e) { }
  }).catch(() => { });
  return last.archivo;
}
// Vista previa: lado mayor 1080 px, JPEG 80 % (≈100-250 KB)
export async function makePreview(file) {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1080 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const png = /png|webp/i.test(file.type || '');
    const b = await new Promise(r => c.toBlob(r, png ? 'image/webp' : 'image/jpeg', 0.8));
    return b && b.size < 1400 * 1024 ? b : null;
  } catch (e) { return null; }
}
// URL de la vista previa de una foto (se descarga una vez y se guarda en el dispositivo)
const pvUrls = new Map(), pvLoading = new Map();
export function previewUrl(a) {
  if (pvUrls.has(a.id)) return Promise.resolve(pvUrls.get(a.id));
  if (pvLoading.has(a.id)) return pvLoading.get(a.id);
  const p = (async () => {
    if (!a.driveId && a.rutaLocal && desktop.on) return desktop.fileUrl(a.rutaLocal);
    let b = null;
    try { b = await kv.get('pv:' + a.id); } catch (e) { }
    if (!b) {
      const r = await api('archivos.preview', { id: a.id }, { quiet: true, timeout: 60000 });
      if (!r.datos) return r.miniatura || a.miniatura || '';
      const bin = atob(r.datos), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      b = new Blob([u], { type: r.mime || 'image/jpeg' });
      kv.set('pv:' + a.id, b).catch(() => { });
    }
    const url = URL.createObjectURL(b); pvUrls.set(a.id, url); return url;
  })().finally(() => pvLoading.delete(a.id));
  pvLoading.set(a.id, p);
  return p;
}
// Fotos grandes tipo Instagram: se ven directamente (primero la miniatura borrosa, luego la
// vista previa al llegar a la pantalla). Pulsar = verla a pantalla completa.
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); e.target._load && e.target._load(); } }), { rootMargin: '400px' }) : null;
export function mediaFeed(list) {
  const fotos = list.filter(a => a.tipo === 'foto'), otros = list.filter(a => a.tipo !== 'foto');
  const box = h('div.media-feed');
  if (fotos.length) {
    const track = h('div.mf-track' + (fotos.length > 1 ? '.multi' : ''), fotos.map((a, i) => {
      const img = h('img', { alt: a.nombre, src: a.miniatura || '', decoding: 'async', class: 'blur' });
      const fig = h('figure.mf', { onclick: () => lightbox(fotos, i) }, img, fotos.length > 1 ? h('span.mf-n', (i + 1) + '/' + fotos.length) : null);
      fig._load = () => previewUrl(a).then(u => { if (!u) return; const t = new Image(); t.onload = () => { img.src = u; img.classList.remove('blur'); }; t.src = u; }).catch(() => { });
      if (io) io.observe(fig); else fig._load();
      return fig;
    }));
    box.appendChild(track);
  }
  if (otros.length) box.appendChild(gallery(otros));
  return box;
}
export function lightbox(fotos, i) {
  let k = i;
  const img = h('img', { alt: '' });
  const cap = h('div.lb-cap');
  const show = () => { const a = fotos[k]; img.src = a.miniatura || ''; mount(cap, h('span', a.nombre), h('span.grow'), fotos.length > 1 ? h('span', (k + 1) + ' / ' + fotos.length) : null); previewUrl(a).then(u => { if (u && fotos[k] === a) img.src = u; }).catch(() => { }); };
  const close = () => { lb.remove(); document.removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' && k < fotos.length - 1) { k++; show(); } if (e.key === 'ArrowLeft' && k > 0) { k--; show(); } };
  const lb = h('div.lightbox', { onclick: e => { if (e.target === lb || e.target === img) close(); } },
    h('div.lb-bar', h('button.btn.ghost.sm', { onclick: close }, '✕ Cerrar'), h('span.grow'),
      h('button.btn.ghost.sm', { onclick: async () => { try { toast('Descargando el original…'); download(await fetchFile(fotos[k]), fotos[k].nombre); } catch (e) { toast(e.message, 'bad'); } } }, '⬇ Descargar original')),
    img, cap,
    fotos.length > 1 ? h('button.lb-prev', { onclick: e => { e.stopPropagation(); if (k > 0) { k--; show(); } } }, '‹') : null,
    fotos.length > 1 ? h('button.lb-next', { onclick: e => { e.stopPropagation(); if (k < fotos.length - 1) { k++; show(); } } }, '›') : null);
  document.body.appendChild(lb); document.addEventListener('keydown', key); show();
}
function blobToB64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}

// Descarga un archivo de Drive (por trozos) y devuelve un Blob
const blobCache = new Map();
// v15.3: lo que se acaba de subir desde este aparato se recuerda: así no se vuelve a descargar para verlo o imprimirlo
export function recordarBlob(id, blob) { if (id && blob && blob.size < 60 * 1048576) blobCache.set(id, blob); }
export const aBase64 = blob => blobToB64(blob);
export async function fetchFile(a, onProgress) {
  if (blobCache.has(a.id)) return blobCache.get(a.id);
  if (!a.driveId && a.rutaLocal && desktop.on) { const b = new Blob([await desktop.file(a.rutaLocal)], { type: a.mime || '' }); blobCache.set(a.id, b); return b; }
  if (!a.driveId) throw new Error('Este archivo solo está en la carpeta del ordenador' + (a.rutaLocal ? ' (' + a.rutaLocal + ')' : '') + '.');
  const parts = []; let off = 0, total = a.tamano || 1;
  for (;;) {
    const r = await api('archivos.leer', { id: a.id, desde: off, largo: 5 * 1048576 }, { timeout: 120000 });
    const bin = atob(r.datos); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    parts.push(u); off += u.length; total = r.total || total;
    onProgress && onProgress(Math.min(1, off / total));
    if (r.fin || !u.length) break;
  }
  const b = new Blob(parts, { type: a.mime || '' });
  if (b.size < 60 * 1048576) blobCache.set(a.id, b);
  return b;
}
export function download(blob, name) { const u = URL.createObjectURL(blob); const x = h('a', { href: u, download: name }); document.body.appendChild(x); x.click(); x.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); }

// ---------- Visor de archivos ----------
export async function openFile(a) {
  const k = a.tipo;
  const box = h('div.col', h('p.muted', 'Cargando…'));
  const bar = h('div.file', h('div.grow', h('div.bar', h('i'))));
  const m = modal(a.nombre, box, close => [
    a.rutaLocal && desktop.on ? btn('Abrir carpeta', () => desktop.open(a.rutaLocal.replace(/[\\/][^\\/]+$/, '')).catch(e => toast(e.message, 'bad')), { icon: 'folder' }) : null,
    btn('Descargar', async () => { try { download(await fetchFile(a), a.nombre); } catch (e) { toast(e.message, 'bad'); } }, { icon: 'download' }),
    k === 'foto' && can('archivos.subir') && a.entidad && a.entidadId ? btn('Retocar copia', async () => {
      try {
        const blob = await fetchFile(a), ed = await editPhoto(new File([blob], a.nombre, { type: blob.type || a.mime || 'image/jpeg' }), { titulo: 'Retocar copia · ' + a.nombre, aceptar: 'Guardar como copia nueva' });
        if (!ed) return;
        const [th, hu] = await Promise.all([makeThumb(ed, 'foto'), sha256(ed)]);
        const r = await uploadFile(ed, { entidad: a.entidad, entidadId: a.entidadId, huella: hu, miniatura: th });
        upsertLocal('archivos', r); emit(); toast('Copia retocada guardada (la original sigue igual)', 'ok');
      } catch (e) { toast(e.message, 'bad'); }
    }, { icon: 'edit' }) : null,
    (a.subidoPor === (S.me && S.me.nombre) || can('archivos.borrar')) ? btn('Borrar', async () => {
      if (!await confirmDlg('Borrar archivo', 'Se moverá a la papelera (recuperable). ¿Seguro?', 'Borrar', true)) return;
      try { await api('archivos.borrar', { id: a.id }); removeLocal('archivos', a.id); emit(); close(); toast('Archivo en la papelera', 'ok'); } catch (e) { toast(e.message, 'bad'); }
    }, { cls: 'danger', icon: 'trash' }) : null,
    btn('Cerrar', close, { cls: 'primary' })], { size: 'wide' });
  mount(box, bar, h('p.muted.small', 'Descargando ' + bytes(a.tamano || 0) + '…'));
  try {
    const blob = await fetchFile(a, p => { bar.querySelector('i').style.width = Math.round(p * 100) + '%'; });
    const url = URL.createObjectURL(blob);
    const info = h('p.small.muted', [RULES[k] ? RULES[k].t : k, bytes(a.tamano || blob.size), 'subido por ' + (a.subidoPor || '?'), fdt(a.creado)].filter(Boolean).join(' · '));
    if (k === 'foto') mount(box, h('img', { src: url, alt: a.nombre, style: { maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px', alignSelf: 'center' } }), info);
    else if (k === 'video') mount(box, h('video', { src: url, controls: true, playsinline: true, style: { width: '100%', maxHeight: '70vh', borderRadius: '12px', background: '#000' } }), info);
    else if (k === 'stl' && ['stl', '3mf', 'obj'].includes(extOf(a.nombre))) {
      const c = h('canvas.stl-view'), sim = h('div.row.wrap', { style: { gap: '6px' } });
      mount(box, c, info, h('p.tiny.muted', 'Arrastra para girar · rueda o pellizco para acercar'), sim);
      const pos = await parse3D(await blob.arrayBuffer(), a.nombre), v = viewer(c, pos);
      // v13.10: ver cómo se imprime capa a capa (y sacar un vídeo corto)
      mount(sim, btn('▶️ Ver cómo se imprime', () => import('./simulacion.js').then(SM => SM.simularImpresion(pos, { nombre: a.nombre, productoId: a.entidad === 'productos' ? a.entidadId : '' })), { cls: 'primary sm' }), h('span.tiny.muted', 'Simulación capa a capa · vídeo de 3 s'));
      info.textContent += ' · ' + v.dims.map(x => x.toFixed(1)).join(' × ') + ' mm · ' + v.triangles.toLocaleString('es-ES') + ' triángulos';
      m.el.addEventListener('remove', () => v.destroy());
    } else if (extOf(a.nombre) === 'pdf' || /pdf/i.test(a.mime || '')) {
      // v13.5: antes un <iframe> con el PDF: en Android salía en blanco y en el iPhone solo la 1.ª página.
      // Ahora se dibujan las páginas aquí (funciona en todos) y el visor da imprimir / descargar / compartir.
      URL.revokeObjectURL(url);
      const PV = await import('./pdfview.js');
      const pv = h('div.pdfv-pages', h('p.muted.small', 'Dibujando el PDF…'));
      mount(box, h('div.row.wrap', btn('Ver a pantalla completa · imprimir', () => PV.showPdf({ blob, title: a.nombre, fileName: a.nombre }), { cls: 'primary sm', icon: 'printer' })), pv, info);
      try {
        const r = await PV.renderPdf(blob, { maxPages: 10, targetPx: 1000 });
        mount(pv, r.pages.map((p, i) => { const im = h('img', { alt: 'Página ' + (i + 1), style: { aspectRatio: p.wmm + ' / ' + p.hmm } }); p.canvas.toBlob(b => { const u = URL.createObjectURL(b); im.src = u; m.el.addEventListener('remove', () => URL.revokeObjectURL(u)); }, 'image/jpeg', 0.9); return h('figure.pdfv-page', im); }),
          r.total > r.pages.length ? h('p.tiny.muted', 'Se ven las ' + r.pages.length + ' primeras páginas de ' + r.total + '. Descárgalo para verlo entero.') : null);
        info.textContent += ' · ' + r.total + (r.total === 1 ? ' página' : ' páginas');
      } catch (e) { mount(pv, h('p.bad-t.small', 'No se puede mostrar: ' + e.message + ' Puedes descargarlo.')); }
    }
    else mount(box, h('div.empty', icon('file'), h('h3', a.nombre), h('p', 'Vista previa no disponible para este tipo. Puedes descargarlo.')), info);
  } catch (e) { mount(box, h('p.bad-t', 'No se pudo abrir: ' + e.message)); }
}

// ---------- Galería de archivos de una ficha ----------
export function gallery(list, opts = {}) {
  if (!list.length) return h('p.muted.small', opts.emptyText || 'Sin archivos todavía.');
  return h('div.gallery', list.map(a => {
    const g = h('div.g', { onclick: () => openFile(a), title: a.nombre },
      a.miniatura ? h('img', { src: a.miniatura, alt: '', loading: 'lazy' }) : h('div', { style: { display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)' } }, icon(RULES[a.tipo] ? RULES[a.tipo].i : 'file', 'l')),
      h('span.ty', (RULES[a.tipo] ? RULES[a.tipo].s : a.tipo) + (a.driveId ? '' : ' · solo PC')), h('div.cap.ellipsis', a.nombre));
    if (!a.miniatura && a.driveId && a.tipo === 'foto') api('archivos.miniatura', { id: a.id }).then(r => { if (r.miniatura) { a.miniatura = r.miniatura; g.firstChild.replaceWith(h('img', { src: r.miniatura, alt: '' })); } }).catch(() => { });
    return g;
  }));
}
export const filesOf = (entidad, id) => S.t.archivos.filter(a => a.entidad === entidad && a.entidadId === id).sort((a, b) => String(b.creado).localeCompare(String(a.creado)));

// ---------- Zona de adjuntos (Foto / Vídeo / STL / Documento) ----------
// Si todavía no existe el registro (p. ej. producto nuevo), los archivos quedan
// preparados y se suben al llamar a uploadAll(entidad, id).
export function dropZone(tipo, opts = {}) {
  const R = RULES[tipo];
  const items = [];
  const list = h('div.files');
  const inputFile = h('input', { type: 'file', accept: R.accept, multiple: opts.multiple !== false, style: { display: 'none' }, onchange: e => { addFiles(e.target.files); e.target.value = ''; } });
  const inputCam = tipo === 'foto' || tipo === 'video' ? h('input', { type: 'file', accept: tipo === 'foto' ? 'image/*' : 'video/*', capture: 'environment', style: { display: 'none' }, onchange: e => { addFiles(e.target.files); e.target.value = ''; } }) : null;
  const zone = h('div.drop-zone', { tabindex: 0, role: 'button', onclick: () => inputFile.click(), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') inputFile.click(); } }, 'Arrastra aquí o pulsa para elegir');
  const el = h('div.drop', h('div.drop-h', h('span.ic', icon(R.i)), h('div.grow', h('b', opts.title || R.t), h('small', R.hint))),
    zone, h('div.drop-actions', btn('Elegir archivo', () => inputFile.click(), { icon: 'upload', cls: 'sm' }), inputCam ? btn(tipo === 'foto' ? 'Hacer foto' : 'Grabar vídeo', () => inputCam.click(), { icon: tipo === 'foto' ? 'camera' : 'video', cls: 'sm' }) : null),
    tipo === 'foto' ? h('label.check.small', { style: { marginTop: '6px' } }, h('input', { type: 'checkbox', checked: retocarOn(), onchange: e => { try { localStorage.setItem('cd.retocar', e.target.checked ? '1' : '0'); } catch (x) { } } }), '✏️ Retocar cada foto antes de subirla (recortar, girar, luz)') : null,
    list, inputFile, inputCam);
  ['dragenter', 'dragover'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); if (ev === 'dragleave' && el.contains(e.relatedTarget)) return; el.classList.remove('over'); }));
  el.addEventListener('drop', e => addFiles(e.dataTransfer.files));

  async function addFiles(fl) {
    for (let f of Array.from(fl || [])) {
      f = normalizeFile(f); // v13.5: nombre sin extensión / raro del móvil → nombre válido con su extensión
      // v12.2: si lo has activado, cada foto pasa antes por el editor (la original no se toca; «Subir tal cual» la deja como está)
      if (tipo === 'foto' && retocarOn() && esFoto(f) && !validate(f, tipo)) { const ed = await editPhoto(f, { titulo: 'Retocar foto · ' + f.name, omitir: 'Subir tal cual', aceptar: 'Usar la foto retocada' }); if (ed) f = ed; }
      const it = { id: uid('f'), file: f, err: validate(f, tipo), state: 'pendiente', progress: 0, thumb: '', huella: '' };
      if (!it.err && items.some(x => x.file.name === f.name && x.file.size === f.size && !x.err)) it.err = 'Ya has añadido este archivo.';
      if (!it.err && opts.existing) { const dupe = opts.existing().find(a => a.nombre === f.name && Number(a.tamano) === f.size); if (dupe) it.err = 'Este archivo ya está adjuntado.'; }
      if (opts.single) items.splice(0, items.length);
      items.push(it); draw();
      if (it.err) continue;
      it.state = 'preparando'; draw();
      // v13.5: ¿se puede leer? (Android: fotos que solo están en Google Fotos/Drive, o el permiso del selector caducado)
      try { await f.slice(0, 1).arrayBuffer(); } catch (e) { it.err = friendlyUploadError(e, f).message; it.state = 'error'; draw(); reportFailure(f, { entidad: opts.entidad, entidadId: opts.entidadId }, Object.assign(new Error(e.message), { code: e.name || 'LECTURA', original: e.message })); continue; }
      try { [it.thumb, it.huella] = await Promise.all([makeThumb(f, tipo), sha256(f)]); } catch (e) { }
      if (tipo === 'stl' && ['stl', '3mf', 'obj'].includes(extOf(f.name))) { try { const r = await thumb3D(await f.arrayBuffer(), f.name); it.dims = r.dims; } catch (e) { it.err = 'El archivo 3D parece dañado: ' + e.message; } }
      if (opts.onReady && !it.err) { try { opts.onReady(it); } catch (e) { } } // v16: p. ej. medir la pieza al subir el STL / 3MF
      it.state = it.err ? 'error' : 'listo'; draw();
      if (!it.err && opts.entidadId) upload(it, opts.entidad, opts.entidadId);
      opts.onchange && opts.onchange(items);
    }
  }
  async function upload(it, entidad, entidadId) {
    if (it.err || it.state === 'subido' || it.state === 'subiendo') return it.result;
    it.state = 'subiendo'; it.progress = 0; draw();
    try {
      if (opts.local && desktop.on && opts.local(it)) {
        const path = opts.local(it);
        await desktop.save(path, it.file);
        it.result = await api('archivos.enlazarLocal', { nombre: it.file.name, rutaLocal: path, tamano: it.file.size, huella: it.huella, entidad, entidadId, miniatura: it.thumb, mime: it.file.type });
        upsertLocal('archivos', it.result); emit();
        if (opts.alsoDrive && opts.alsoDrive(it)) await uploadFile(it.file, { entidad, entidadId, huella: it.huella, miniatura: it.thumb }, p => { it.progress = p; drawBar(it); });
      } else {
        it.result = await uploadFile(it.file, { entidad, entidadId, huella: it.huella, miniatura: it.thumb }, p => { it.progress = p; drawBar(it); });
      }
      it.state = 'subido'; it.progress = 1;
      if (it.result && it.result.aviso) it.note = it.result.aviso;
    } catch (e) { it.state = 'error'; it.err = friendlyUploadError(e, it.file).message; }
    draw();
    opts.onchange && opts.onchange(items);
    return it.result;
  }
  // Retocar una foto de la lista: si aún no se ha subido, se sustituye; si ya está subida, la editada se sube como COPIA NUEVA
  async function retouch(it) {
    const ed = await editPhoto(it.file, { titulo: 'Retocar foto · ' + it.file.name, aceptar: it.state === 'subido' ? 'Guardar como copia nueva' : 'Usar la foto retocada' });
    if (!ed) return;
    if (it.state === 'subido') { const n = { id: uid('f'), file: ed, err: '', state: 'preparando', progress: 0, thumb: '', huella: '' }; items.push(n); draw(); try { [n.thumb, n.huella] = await Promise.all([makeThumb(ed, tipo), sha256(ed)]); } catch (e) { } n.state = 'listo'; draw(); if (opts.entidadId) upload(n, opts.entidad, opts.entidadId); opts.onchange && opts.onchange(items); return; }
    it.file = ed; it.state = 'preparando'; draw();
    try { [it.thumb, it.huella] = await Promise.all([makeThumb(ed, tipo), sha256(ed)]); } catch (e) { }
    it.state = 'listo'; draw(); opts.onchange && opts.onchange(items);
  }
  function drawBar(it) { const b = list.querySelector('[data-id="' + it.id + '"] .bar i'); if (b) b.style.width = Math.round(it.progress * 100) + '%'; }
  function draw() {
    mount(list, items.map(it => {
      const stTxt = it.err ? it.err : { pendiente: 'Pendiente', preparando: 'Preparando vista previa…', listo: opts.entidadId ? 'Listo' : 'Se subirá al guardar', subiendo: 'Subiendo…', subido: it.note || 'Subido ✓' }[it.state];
      const th = h('div.th');
      if (it.thumb) th.appendChild(h('img', { src: it.thumb, alt: '' })); else th.appendChild(icon(R.i));
      return h('div.file' + (it.err ? '.err' : ''), { dataset: { id: it.id } }, th,
        h('div', { style: { minWidth: 0 } }, h('div.nm.ellipsis', { title: it.file.name }, it.file.name),
          h('div.mt', [extOf(it.file.name).toUpperCase(), bytes(it.file.size), it.dims ? it.dims.map(x => x.toFixed(0)).join('×') + ' mm' : ''].filter(Boolean).join(' · ') + ' · ' + stTxt),
          it.state === 'subiendo' ? h('div.bar', h('i', { style: { width: Math.round(it.progress * 100) + '%' } })) : null),
        h('div.row', { style: { gap: '4px' } },
          tipo === 'foto' && esFoto(it.file) && !it.err && (it.state === 'listo' || it.state === 'subido') ? btn('', () => retouch(it), { cls: 'ghost icon sm', icon: 'edit', title: it.state === 'subido' ? 'Retocar (se sube como copia nueva)' : 'Retocar antes de subir' }) : null,
          it.state === 'error' && !validate(it.file, tipo) ? btn('', () => { it.err = ''; it.state = 'listo'; opts.entidadId ? upload(it, opts.entidad, opts.entidadId) : draw(); }, { cls: 'ghost icon sm', icon: 'refresh', title: 'Reintentar' }) : null,
          it.state !== 'subiendo' && it.state !== 'subido' ? btn('', () => { items.splice(items.indexOf(it), 1); draw(); opts.onchange && opts.onchange(items); }, { cls: 'ghost icon sm', icon: 'x', title: 'Quitar' }) : null));
    }));
  }
  return {
    el, items,
    hasPending: () => items.some(i => !i.err && i.state !== 'subido'),
    hasErrors: () => items.some(i => i.err),
    busy: () => items.some(i => i.state === 'preparando' || i.state === 'subiendo'),
    // v9.7: se suben de 2 en 2 (más rápido) y en el orden en que se añadieron
    uploadAll: async (entidad, id) => {
      const res = new Array(items.length); let next = 0;
      const worker = async () => { while (next < items.length) { const i = next++; res[i] = await upload(items[i], entidad, id); } };
      await Promise.all([worker(), worker()]);
      return res.filter(Boolean);
    },
    pendingCount: () => items.filter(i => !i.err && i.state !== 'subido').length,
    // v13.5: quita de la lista lo ya subido (ya sale en la galería)
    prune: () => { for (let i = items.length - 1; i >= 0; i--) if (items[i].state === 'subido') items.splice(i, 1); draw(); }
  };
}

// Sección "Archivos" para fichas (pedido, cliente, producto)
// v13.5 · CAUSA DEL FALLO AL ADJUNTAR DESDE EL MÓVIL: al abrir la cámara o el selector de archivos, el móvil pone la app
// en segundo plano; al volver, la app sincroniza (visibilitychange → pull) y, si llegaba algo nuevo (un mensaje del chat,
// otro pedido…), la ficha del pedido se REPINTABA y creaba zonas de adjuntos nuevas: la foto elegida, su barra de progreso
// y cualquier error se quedaban en la zona vieja, ya fuera de la pantalla. Parecía que no subía o que fallaba.
// Ahora la zona de cada ficha se conserva entre repintados (con lo que estuviera subiendo).
const ZONES = new Map();
function keptZone(key, make) {
  let z = ZONES.get(key);
  if (z) { ZONES.delete(key); ZONES.set(key, z); if (!z.busy()) z.prune(); return z; }
  z = make(); ZONES.set(key, z);
  while (ZONES.size > 40) { const k0 = ZONES.keys().next().value, z0 = ZONES.get(k0); if (z0.busy()) break; ZONES.delete(k0); }
  return z;
}
export function filesSection(entidad, id, opts = {}) {
  const wrap = h('div.col');
  const drawIt = () => {
    const list = filesOf(entidad, id);
    const zones = can('archivos.subir') ? h('div.drops', (opts.tipos || ['foto', 'video', 'doc']).map(t => keptZone(entidad + '|' + id + '|' + t, () => dropZone(t, { entidad, entidadId: id, existing: () => filesOf(entidad, id), onchange: () => { } })).el)) : null;
    mount(wrap, gallery(list), zones);
  };
  drawIt();
  return { el: wrap, refresh: drawIt };
}
