// ================= Redes sociales: calendario visual y accesos =================
import { h, mount, icon, btn, modal, toast, fdate, pill, empty, field, inp, sel, area, confirmDlg, uid, DIAS, monthName, copyText } from '../ui.js';
import { S, can, mutate, api, byId, upsertLocal, removeLocal, emit } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { dropZone, gallery, filesOf } from '../files.js';
import { desktop } from '../desktop.js';

const CL = window.CL;
const ST_CLS = { Idea: '', Pendiente: 'warn', Preparando: 'info', Programado: 'info', Publicado: 'ok', Cancelado: '' };
const RED_I = { Instagram: '📸', TikTok: '🎵', Facebook: '👥', WhatsApp: '💬', Vinted: '👗', Wallapop: '🛒', Milanuncios: '📢', Etsy: '🧶', YouTube: '▶️' };

export function render(el, params) {
  const today = CL.parse(S.hoy);
  const st = { y: today.getFullYear(), m: today.getMonth(), view: window.innerWidth <= 860 ? 'semana' : 'mes', ws: CL.weekStart(S.hoy), red: '', est: '' };
  const cal = h('div'), head = h('div'), links = h('div');
  el.append(h('div.page-head', h('h1', 'Redes sociales'), can('redes.preparar') ? btn('Nueva publicación', () => socialForm({ fecha: S.hoy }), { cls: 'primary', icon: 'plus' }) : null), links, head, cal);
  function drawLinks() {
    if (!can('redes.abrir')) { mount(links, can('redes.ver') ? h('p.small.muted', { style: { marginBottom: '10px' } }, '🔒 Para abrir las redes desde aquí necesitas el permiso "Abrir las redes sociales".') : null); return; }
    const acc = (S.cfg.redes && S.cfg.redes.accesos) || [];
    const goal = Number(S.cfg.redes.objetivoSemanal) || 0;
    const ws = CL.weekStart(S.hoy), we = CL.addDays(ws, 6);
    const done = S.t.redes.filter(r => r.estado === 'Publicado' && r.fecha >= ws && r.fecha <= we).length;
    mount(links, h('div.card', { style: { marginBottom: '14px' } }, h('div.row.wrap', { style: { gap: '8px' } }, acc.map(a => btn((RED_I[a.red] || '🌐') + ' ' + a.red, () => openNet(a), { cls: 'sm' })),
      desktop.on ? btn('Carpeta de contenido', openFolder, { cls: 'sm ghost', icon: 'folder' }) : null),
      goal ? h('div.row', { style: { marginTop: '10px' } }, h('div.grow', h('div.bar', { style: { height: '8px', background: 'var(--line)', borderRadius: '9px', overflow: 'hidden' } }, h('i', { style: { display: 'block', height: '100%', width: Math.min(100, done / goal * 100) + '%', background: done >= goal ? 'var(--ok)' : 'var(--brand)' } }))), h('span.small', done + ' de ' + goal + ' publicaciones esta semana' + (done >= goal ? ' 🎉' : ''))) : null));
  }
  function drawHead() {
    const redes = [...new Set((S.cfg.redesLista || []).concat(S.t.redes.map(r => r.red).filter(Boolean)))];
    const fRed = sel([{ v: '', t: 'Todas las redes' }].concat(redes), st.red); fRed.onchange = () => { st.red = fRed.value; drawCal(); };
    const fEst = sel([{ v: '', t: 'Todos los estados' }].concat(S.cfg.estadosRedes || []), st.est); fEst.onchange = () => { st.est = fEst.value; drawCal(); };
    const title = st.view === 'mes' ? monthName(st.m).replace(/^./, c => c.toUpperCase()) + ' ' + st.y : 'Semana del ' + fdate(st.ws);
    mount(head, h('div.row.wrap', { style: { marginBottom: '12px' } },
      btn('', () => move(-1), { cls: 'icon', icon: 'left', title: 'Anterior' }), h('h2', { style: { minWidth: '210px', textAlign: 'center' } }, title), btn('', () => move(1), { cls: 'icon', icon: 'right', title: 'Siguiente' }),
      btn('Hoy', () => { const t = CL.parse(S.hoy); st.y = t.getFullYear(); st.m = t.getMonth(); st.ws = CL.weekStart(S.hoy); drawHead(); drawCal(); }, { cls: 'sm' }),
      h('div.seg', ['mes', 'semana'].map(v => h('button' + (st.view === v ? '.on' : ''), { onclick: () => { st.view = v; drawHead(); drawCal(); } }, v === 'mes' ? 'Mes' : 'Semana'))),
      h('span.grow'), h('div', { style: { width: '170px' } }, fRed), h('div', { style: { width: '170px' } }, fEst)));
  }
  function move(d) { if (st.view === 'mes') { st.m += d; if (st.m < 0) { st.m = 11; st.y--; } if (st.m > 11) { st.m = 0; st.y++; } } else st.ws = CL.addDays(st.ws, 7 * d); drawHead(); drawCal(); }
  function items(day) { return S.t.redes.filter(r => r.fecha === day && (!st.red || r.red === st.red) && (!st.est || r.estado === st.est)).sort((a, b) => String(a.hora).localeCompare(String(b.hora))); }
  function drawCal() {
    let start, days;
    if (st.view === 'mes') { const first = CL.dateStr(new Date(st.y, st.m, 1, 12)); start = CL.weekStart(first); const last = new Date(st.y, st.m + 1, 0, 12); days = CL.days(start, CL.addDays(CL.weekStart(CL.dateStr(last)), 6)) + 1; }
    else { start = st.ws; days = 7; }
    const cells = [];
    for (let i = 0; i < days; i++) {
      const d = CL.addDays(start, i);
      const list = items(d);
      const out = st.view === 'mes' && Number(d.slice(5, 7)) - 1 !== st.m;
      const max = st.view === 'mes' ? 3 : 20;
      cells.push(h('div.d' + (out ? '.out' : '') + (d === S.hoy ? '.today' : ''), { onclick: () => dayPanel(d), title: fdate(d, true) },
        h('span.num', String(Number(d.slice(8)))),
        list.slice(0, max).map(r => h('div.ev.st-' + r.estado, { title: r.red + ': ' + (r.titulo || '') + ' (' + r.estado + ')', onclick: e => { e.stopPropagation(); socialForm(r); } }, (r.hora ? r.hora + ' ' : '') + (RED_I[r.red] || '') + ' ' + (r.titulo || r.red))),
        list.length > max ? h('div.more-ev', '+' + (list.length - max) + ' más') : null));
    }
    mount(cal, h('div.cal', DIAS.map(d => h('div.dh', d)), cells),
      h('div.row.wrap.small.muted', { style: { marginTop: '10px', gap: '14px' } }, (S.cfg.estadosRedes || []).map(s => h('span.row', { style: { gap: '6px' } }, h('span.ev.st-' + s, { style: { width: '14px', height: '10px', padding: 0 } }), s))));
  }
  function applyParams(p) {
    const id = (p || []).find(x => x && !x.startsWith('?')) || '';
    drawLinks(); drawHead(); drawCal();
    if (id === 'nueva') { history.replaceState(null, '', '#/redes'); socialForm({ fecha: S.hoy }); }
    else if (id) { history.replaceState(null, '', '#/redes'); const r = byId('redes', id); if (r) socialForm(r); }
  }
  applyParams(params);
  return { params: applyParams, update: () => { drawLinks(); drawCal(); } };
}

// Abre la APLICACIÓN instalada si está configurada en este PC; la web solo como alternativa
async function openNet(a) {
  if (desktop.on) {
    let apps = {};
    try { apps = JSON.parse((await desktop.getConfig('apps')) || '{}'); } catch (e) { }
    const key = Object.keys(apps).find(k => k.toLowerCase() === String(a.red).toLowerCase());
    if (key) {
      try { await desktop.appsAbrir(apps[key]); return; }
      catch (e) {
        toast((e.message || 'No se encuentra la aplicación.') + ' Mientras tanto se abre la web.', 'warn', 9000);
      }
    }
    try { await desktop.openUrl(a.web, a.app || ''); return; } catch (e) { }
  }
  window.open(a.web, '_blank', 'noopener');
}
async function openFolder() {
  const root = await desktop.getConfig('productRoot');
  if (!root) return toast('Configura primero la carpeta de productos (Configuración > Este ordenador).', 'warn');
  const sep = root.includes('\\') ? '\\' : '/';
  const dir = root + sep + 'REDES_SOCIALES';
  try { await desktop.mkdir(dir); ['01_REELS_Y_TIKTOK', '02_FOTOS_PRODUCTO', '03_HISTORIAS', '04_PUBLICADO', '05_PLANTILLAS_Y_MUSICA'].forEach(s => desktop.mkdir(dir + sep + s).catch(() => { })); await desktop.open(dir); } catch (e) { toast(e.message, 'bad'); }
}

function dayPanel(d) {
  const list = S.t.redes.filter(r => r.fecha === d).sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  const m = modal(fdate(d, true).toUpperCase(), h('div.col', list.length ? h('div.list.boxed', list.map(r => h('div.item', { onclick: () => { m.close(); socialForm(r); } },
    h('span', { style: { fontSize: '20px' } }, RED_I[r.red] || '🌐'), h('div.grow', h('div.bold.ellipsis', r.titulo || r.red), h('div.tiny.muted', [r.hora, r.red, r.responsable].filter(Boolean).join(' · '))), pill(r.estado, ST_CLS[r.estado])))) : h('p.muted', 'Nada planificado este día.')),
    close => [btn('Cerrar', close), can('redes.preparar') ? btn('Añadir publicación', () => { close(); socialForm({ fecha: d }); }, { cls: 'primary', icon: 'plus' }) : null], { size: 'narrow' });
}

export function socialForm(r) {
  const isNew = !r.id;
  if (isNew && !can('redes.preparar')) return requestAccess('redes.preparar', 'redes');
  const canEdit = can('redes.preparar');
  const redes = [...new Set((S.cfg.redesLista || []).concat(S.t.redes.map(x => x.red).filter(Boolean)))];
  const states = (S.cfg.estadosRedes || []).filter(s => can('redes.publicar') || !['Programado', 'Publicado'].includes(s) || s === r.estado);
  const f = {
    fecha: inp({ type: 'date', value: r.fecha || S.hoy }), hora: inp({ type: 'time', value: r.hora || '' }), red: sel(redes, r.red || 'Instagram'),
    titulo: inp({ value: r.titulo || '', placeholder: 'Ej.: Reel maceta geométrica' }), texto: area({ value: r.texto || '', placeholder: 'Texto de la publicación', style: { minHeight: '110px' } }),
    hashtags: inp({ value: r.hashtags || '', placeholder: '#impresion3d #hechoamano' }),
    responsable: sel([{ v: '', t: 'Sin asignar' }].concat(S.t.usuarios.filter(u => u.activo).map(u => ({ v: u.nombre, t: u.nombre }))), r.responsable || (isNew ? S.me.nombre : '')),
    estado: sel(states, r.estado || 'Idea'), enlace: inp({ value: r.enlace || '', placeholder: 'Enlace a la publicación (cuando esté publicada)' }), notas: area({ value: r.notas || '', style: { minHeight: '60px' } }),
    productoId: sel([{ v: '', t: 'Ninguno' }].concat(S.t.productos.map(p => ({ v: p.id, t: p.nombre + ' (' + p.id + ')' }))), r.productoId || '')
  };
  if (!canEdit) Object.values(f).forEach(x => { x.disabled = true; });
  const zones = canEdit ? [dropZone('foto', { title: 'Fotos', entidad: 'redes', entidadId: r.id || '' }), dropZone('video', { title: 'Vídeos', entidad: 'redes', entidadId: r.id || '' })] : [];
  const existing = r.id ? (r.archivos || []).map(id => byId('archivos', id)).filter(Boolean).concat(filesOf('redes', r.id).filter(a => !(r.archivos || []).includes(a.id))) : [];
  const msg = h('p.bad-t');
  const aiBtn = can('ia.usar') && canEdit ? btn('Escribir el texto con IA', async ev => {
    const b = ev.target.closest('button'); b.disabled = true; b.textContent = 'Consultando…';
    const prod = f.productoId.value ? byId('productos', f.productoId.value) : null;
    try {
      const { write } = await import('../ai/engine.js');
      const datos = prod ? '\nDatos reales del producto: ' + JSON.stringify({ nombre: prod.nombre, categoria: prod.categoria, color: prod.color, tamano: prod.tamano, material: prod.material, descripcion: prod.descripcion, precio: prod.precio }) : '';
      const txt = (await write(`Escribe el texto para una publicación de ${f.red.value}${f.titulo.value ? ' sobre: ' + f.titulo.value : ''}. Tono cercano y alegre, con 2-3 emojis, máximo 5 líneas, y al final una línea con 6-10 hashtags. Devuelve SOLO el texto.${datos}`, { onToken: t => { f.texto.value = t; } })).trim();
      const tags = (txt.match(/(^|\n)((#[\wáéíóúñü]+\s*){3,})\s*$/i) || [])[2];
      f.texto.value = tags ? txt.replace(tags, '').trim() : txt;
      if (tags && !f.hashtags.value) f.hashtags.value = tags.trim();
    } catch (e) { toast(e.message, 'bad'); } finally { b.disabled = false; b.textContent = 'Escribir el texto con IA'; }
  }, { icon: 'sparkles', cls: 'sm' }) : null;
  modal(isNew ? 'Nueva publicación' : (r.titulo || 'Publicación'), h('div.col',
    h('div.form', field('Fecha', f.fecha), field('Hora', f.hora), field('Red social', f.red), field('Estado', f.estado), field('Título / idea *', f.titulo, null, 'full'), field('Texto', f.texto, null, 'full'), h('div.full.row', aiBtn, f.texto.value ? btn('Copiar texto + hashtags', () => copyText(f.texto.value + '\n\n' + f.hashtags.value), { cls: 'sm ghost', icon: 'copy' }) : null),
      field('Hashtags', f.hashtags, null, 'full'), field('Responsable', f.responsable), field('Producto', f.productoId), field('Enlace', f.enlace, null, 'full'), field('Notas', f.notas, null, 'full')),
    existing.length ? h('div', h('div.lbl', { style: { marginBottom: '6px' } }, 'Archivos'), gallery(existing)) : null,
    zones.length ? h('div.drops', { style: { gridTemplateColumns: 'repeat(2, minmax(0,1fr))' } }, zones.map(z => z.el)) : null,
    !can('redes.publicar') ? h('p.tiny.muted', '🔒 Programar o marcar como publicado lo hace una persona con permiso de publicar.') : null, msg),
    close => [!isNew && (can('redes.admin') || (r.creadoPor === S.me.nombre && r.estado === 'Idea')) ? btn('Borrar', async () => {
      if (!await confirmDlg('Borrar publicación', 'Se moverá a la papelera.', 'Borrar', true)) return;
      try { await mutate('redes.borrar', { id: r.id }, { onlineOnly: true }); removeLocal('redes', r.id); emit(); close(); } catch (e) { handleError(e, 'redes'); }
    }, { cls: 'danger', icon: 'trash' }) : null, h('span.grow'), btn('Cerrar', close), canEdit ? btn('Guardar', async ev => {
      const datos = {}; Object.keys(f).forEach(k => { datos[k] = f[k].value.trim ? f[k].value.trim() : f[k].value; });
      if (!datos.titulo && !datos.texto) return msg.textContent = 'Escribe al menos una idea o título.';
      const b = ev.target.closest('button'); b.disabled = true;
      try {
        const id = r.id || uid('r');
        const up = []; for (const z of zones) up.push(...await z.uploadAll('redes', r.id || ''));
        if (up.length) datos.archivos = (r.archivos || []).concat(up.map(a => a.id));
        if (isNew) { const res = await mutate('redes.guardar', { id, datos }, { label: 'Publicación ' + datos.titulo, tables: ['redes'], optimistic: T => T.redes.push(Object.assign({ id, creadoPor: S.me.nombre }, datos)) }); if (res && res.id) upsertLocal('redes', res); }
        else { const ch = {}, orig = {}; Object.keys(datos).forEach(k => { if (JSON.stringify(datos[k]) !== JSON.stringify(r[k] ?? '')) { ch[k] = datos[k]; orig[k] = r[k] ?? ''; } }); if (Object.keys(ch).length) { const res = await mutate('redes.guardar', { id: r.id, datos: ch, orig }, { label: 'Publicación', tables: ['redes'], optimistic: T => { const x = T.redes.find(y => y.id === r.id); if (x) Object.assign(x, ch); } }); if (res && res.id) upsertLocal('redes', res); } }
        emit(); close(); toast('Guardado', 'ok');
      } catch (e) { msg.textContent = e.message; handleError(e, 'redes'); b.disabled = false; }
    }, { cls: 'primary' }) : null], { size: 'wide' });
}
