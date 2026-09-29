// ================= Archivos: validar, miniaturas, subir por trozos, ver =================
import { h, mount, icon, btn, bytes, toast, modal, uid, fdt, confirmDlg } from './ui.js';
import { S, api, can, upsertLocal, removeLocal, emit } from './store.js';
import { parse3D, viewer, thumb3D } from './stl.js';
import { desktop } from './desktop.js';

export const RULES = {
  foto: { ext: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'], max: 25 * 1048576, accept: 'image/*,.heic,.heif', t: 'Foto', s: 'Foto', i: 'camera', hint: 'JPG, PNG, WEBP o HEIC · máx. 25 MB' },
  video: { ext: ['mp4', 'mov', 'webm', 'm4v', '3gp', 'avi', 'mkv'], max: 500 * 1048576, accept: 'video/*', t: 'Vídeo', s: 'Vídeo', i: 'video', hint: 'MP4, MOV o WEBM · máx. 500 MB' },
  stl: { ext: ['stl', '3mf', 'obj', 'step', 'stp', 'gcode', 'bgcode'], max: 300 * 1048576, accept: '.stl,.3mf,.obj,.step,.stp,.gcode,.bgcode', t: 'Archivo 3D (STL)', s: '3D', i: 'cube', hint: 'STL, 3MF, OBJ, STEP o GCODE · máx. 300 MB' },
  doc: { ext: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'odt', 'ods', 'ppt', 'pptx', 'zip', 'svg', 'ai', 'psd'], max: 100 * 1048576, accept: '', t: 'Documento', s: 'Doc', i: 'file', hint: 'PDF, Word, Excel, ZIP… · máx. 100 MB' }
};
export const extOf = n => String(n || '').split('.').pop().toLowerCase();
export function kindOf(name) { const e = extOf(name); for (const k in RULES) if (RULES[k].ext.includes(e)) return k; return ''; }
export function validate(file, tipo) {
  const k = kindOf(file.name);
  if (!k) return 'Formato no admitido (.' + extOf(file.name) + ').';
  if (tipo && k !== tipo) return 'Aquí van archivos de tipo ' + RULES[tipo].t.toLowerCase() + '. Este es ' + RULES[k].t.toLowerCase() + '.';
  if (!file.size) return 'El archivo está vacío.';
  if (file.size > RULES[k].max) return 'Pesa ' + bytes(file.size) + '. El máximo es ' + bytes(RULES[k].max) + '.';
  return '';
}
export async function sha256(file) {
  if (file.size > 200 * 1048576 || !crypto.subtle) return '';
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

// Sube un archivo a Drive por trozos. onProgress(0..1)
export async function uploadFile(file, meta, onProgress) {
  const tipo = kindOf(file.name);
  const huella = meta.huella !== undefined ? meta.huella : await sha256(file);
  const miniatura = meta.miniatura !== undefined ? meta.miniatura : await makeThumb(file, tipo);
  const st = await api('archivos.iniciar', { nombre: file.name, tamano: file.size, mime: file.type || '', huella, miniatura, tipo, entidad: meta.entidad || '', entidadId: meta.entidadId || '', rutaLocal: meta.rutaLocal || '' });
  if (st.duplicado) { upsertLocal('archivos', st.archivo); emit(); return Object.assign({ aviso: st.mensaje }, st.archivo); }
  let off = 0, last = null;
  while (off < file.size) {
    const chunk = file.slice(off, off + st.trozo);
    const b64 = await blobToB64(chunk);
    let tries = 0;
    for (;;) {
      try { last = await api('archivos.trozo', { subida: st.subida, desde: off, datos: b64 }, { timeout: 180000 }); break; }
      catch (e) { if (++tries >= 4 || !['NET', 'SERVER', 'BUSY'].includes(e.code)) throw e; await new Promise(r => setTimeout(r, 1500 * tries)); }
    }
    off = last.hecho ? file.size : (last.recibido || off + chunk.size);
    onProgress && onProgress(off / file.size);
  }
  upsertLocal('archivos', last.archivo); emit();
  return last.archivo;
}
function blobToB64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}

// Descarga un archivo de Drive (por trozos) y devuelve un Blob
const blobCache = new Map();
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
      const c = h('canvas.stl-view');
      mount(box, c, info, h('p.tiny.muted', 'Arrastra para girar · rueda o pellizco para acercar'));
      const v = viewer(c, await parse3D(await blob.arrayBuffer(), a.nombre));
      info.textContent += ' · ' + v.dims.map(x => x.toFixed(1)).join(' × ') + ' mm · ' + v.triangles.toLocaleString('es-ES') + ' triángulos';
      m.el.addEventListener('remove', () => v.destroy());
    } else if (extOf(a.nombre) === 'pdf') mount(box, h('iframe', { src: url, style: { width: '100%', height: '70vh', border: 0, borderRadius: '12px' } }), info);
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
    list, inputFile, inputCam);
  ['dragenter', 'dragover'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); if (ev === 'dragleave' && el.contains(e.relatedTarget)) return; el.classList.remove('over'); }));
  el.addEventListener('drop', e => addFiles(e.dataTransfer.files));

  async function addFiles(fl) {
    for (const f of Array.from(fl || [])) {
      const it = { id: uid('f'), file: f, err: validate(f, tipo), state: 'pendiente', progress: 0, thumb: '', huella: '' };
      if (!it.err && items.some(x => x.file.name === f.name && x.file.size === f.size && !x.err)) it.err = 'Ya has añadido este archivo.';
      if (!it.err && opts.existing) { const dupe = opts.existing().find(a => a.nombre === f.name && Number(a.tamano) === f.size); if (dupe) it.err = 'Este archivo ya está adjuntado.'; }
      if (opts.single) items.splice(0, items.length);
      items.push(it); draw();
      if (it.err) continue;
      it.state = 'preparando'; draw();
      try { [it.thumb, it.huella] = await Promise.all([makeThumb(f, tipo), sha256(f)]); } catch (e) { }
      if (tipo === 'stl' && ['stl', '3mf', 'obj'].includes(extOf(f.name))) { try { const r = await thumb3D(await f.arrayBuffer(), f.name); it.dims = r.dims; } catch (e) { it.err = 'El archivo 3D parece dañado: ' + e.message; } }
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
    } catch (e) { it.state = 'error'; it.err = e.code === 'NET' ? 'Sin conexión: vuelve a intentarlo cuando tengas Internet.' : e.message; }
    draw();
    opts.onchange && opts.onchange(items);
    return it.result;
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
          it.state === 'error' && !validate(it.file, tipo) ? btn('', () => { it.err = ''; it.state = 'listo'; opts.entidadId ? upload(it, opts.entidad, opts.entidadId) : draw(); }, { cls: 'ghost icon sm', icon: 'refresh', title: 'Reintentar' }) : null,
          it.state !== 'subiendo' && it.state !== 'subido' ? btn('', () => { items.splice(items.indexOf(it), 1); draw(); opts.onchange && opts.onchange(items); }, { cls: 'ghost icon sm', icon: 'x', title: 'Quitar' }) : null));
    }));
  }
  return {
    el, items,
    hasPending: () => items.some(i => !i.err && i.state !== 'subido'),
    hasErrors: () => items.some(i => i.err),
    busy: () => items.some(i => i.state === 'preparando' || i.state === 'subiendo'),
    uploadAll: async (entidad, id) => { const out = []; for (const it of items) { const r = await upload(it, entidad, id); if (r) out.push(r); } return out; }
  };
}

// Sección "Archivos" para fichas (pedido, cliente, producto)
export function filesSection(entidad, id, opts = {}) {
  const wrap = h('div.col');
  const drawIt = () => {
    const list = filesOf(entidad, id);
    const zones = can('archivos.subir') ? h('div.drops', (opts.tipos || ['foto', 'video', 'doc']).map(t => dropZone(t, { entidad, entidadId: id, existing: () => filesOf(entidad, id), onchange: () => { } }).el)) : null;
    mount(wrap, gallery(list), zones);
  };
  drawIt();
  return { el: wrap, refresh: drawIt };
}
