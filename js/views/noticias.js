// ================= Noticias: el tablón interno del equipo =================
import { h, mount, icon, btn, modal, toast, fdt, ago, pill, empty, field, inp, sel, area, debounce, confirmDlg, uid, avatar, sw, copyText } from '../ui.js';
import { S, can, mutate, api, byId, upsertLocal, removeLocal, emit } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { dropZone, gallery, filesOf, mediaFeed } from '../files.js';
import { toast as toast2 } from '../ui.js';

const CL = window.CL;
const TIPOS = ['Noticia', 'Anuncio', 'Campaña', 'Objetivo', 'Reconocimiento', 'Novedad de producto'];
const TIPO_I = { 'Noticia': '📰', 'Anuncio': '📣', 'Campaña': '🎯', 'Objetivo': '🏁', 'Reconocimiento': '🏆', 'Novedad de producto': '✨', 'Informe': '📊' };
const EMOJIS = ['👍', '❤️', '🎉', '😂', '😮', '👏'];

// v10: lo que se está escribiendo en cada noticia se guarda aparte: aunque lleguen datos
// nuevos y se redibuje una noticia, el texto y el cursor se conservan.
const drafts = new Map();

export function render(el, params) {
  const st = { q: '', tipo: '', focus: '', comment: '' };
  const cache = new Map(); // id → { sig, el }: solo se redibuja la noticia que ha cambiado
  const search = inp({ type: 'search', placeholder: 'Buscar en noticias…' });
  search.addEventListener('input', debounce(() => { st.q = search.value; drawFeed(); }, 150));
  const fTipo = sel([{ v: '', t: 'Todas' }].concat(TIPOS), ''); fTipo.addEventListener('change', () => { st.tipo = fTipo.value; drawFeed(); });
  const feed = h('div.col', { style: { gap: '14px' } });
  // v13.10: dos pestañas — 🌍 Actualidad (titulares reales de Google Noticias por temas) y 👥 Del equipo (el tablón de siempre)
  const actBox = h('div.act'), equipoBox = h('div.not-equipo');
  let tab = (() => { try { return localStorage.getItem('cd.noticias.tab') || 'actualidad'; } catch (e) { return 'actualidad'; } })();
  const tabs = h('div.seg.not-tabs');
  const pubBtn = can('noticias.publicar') ? btn('Publicar', () => postForm(), { cls: 'primary', icon: 'plus' }) : null;
  const ponTab = k => { tab = k; try { localStorage.setItem('cd.noticias.tab', k); } catch (e) { } mount(tabs, [['actualidad', '🌍 Actualidad'], ['equipo', '👥 Del equipo']].map(([v, t]) => h('button' + (tab === v ? '.on' : ''), { type: 'button', 'data-tab': v, onclick: () => ponTab(v) }, t)));
    actBox.style.display = tab === 'actualidad' ? '' : 'none'; equipoBox.style.display = tab === 'equipo' ? '' : 'none'; if (tab !== 'actualidad') { callar(); actBox.classList.remove('tk-full'); document.body.classList.remove('tk-abierto'); } if (pubBtn) pubBtn.style.display = tab === 'equipo' ? '' : 'none'; if (tab === 'actualidad') actualidad(actBox); };
  equipoBox.append(h('div.row.wrap', { style: { marginBottom: '14px' } }, h('div.inp-icon.grow', icon('search', 's'), search), h('div', { style: { width: '200px' } }, fTipo)),
    h('div', { style: { maxWidth: '760px' } }, feed));
  el.append(h('div.page-head', h('h1', 'Noticias'), pubBtn), tabs, actBox, equipoBox);
  ponTab(tab);
  function drawFeed() {
    const now = new Date().toISOString();
    const list = S.t.noticias.filter(n => (!st.tipo || n.tipo === st.tipo) && (!st.q || CL.matches(n.titulo + ' ' + n.texto + ' ' + n.etiquetas + ' ' + n.autor, st.q)))
      .sort((a, b) => (b.fijada - a.fijada) || String(b.publicarEn || b.creado).localeCompare(String(a.publicarEn || a.creado)));
    if (!list.length) { cache.clear(); return mount(feed, h('div.card', empty('news', S.t.noticias.length ? 'Nada con este filtro' : 'Todavía no hay noticias', can('noticias.publicar') ? 'Comparte novedades, objetivos o reconocimientos con el equipo.' : 'Aquí aparecerán las novedades del equipo.', can('noticias.publicar') && !S.t.noticias.length ? btn('Publicar la primera', () => postForm(), { cls: 'primary' }) : null))); }
    const nodes = list.map(n => {
      const sig = postSig(n, now, st.focus === n.id);
      const c = cache.get(n.id);
      if (c && c.sig === sig) return c.el;
      // si en esa noticia hay un comentario a medias con el cursor dentro, se recupera el foco
      const had = c && c.el.contains(document.activeElement) && document.activeElement.matches('input') ? { s: document.activeElement.selectionStart, e: document.activeElement.selectionEnd } : null;
      const el2 = post(n, now, st.focus === n.id, st.comment);
      if (c && c.el.parentNode) c.el.replaceWith(el2);
      cache.set(n.id, { sig, el: el2 });
      if (had) { const i = el2.querySelector('input.c-in'); if (i) { i.focus(); try { i.setSelectionRange(had.s, had.e); } catch (x) { } } }
      return el2;
    });
    // colocar en orden sin quitar del documento lo que no cambia
    if (feed.firstChild && !feed.firstChild.dataset) feed.textContent = '';
    nodes.forEach((node, i) => { if (feed.children[i] !== node) feed.insertBefore(node, feed.children[i] || null); });
    while (feed.children.length > nodes.length) feed.lastChild.remove();
    if (st.focus) {
      const x = feed.querySelector('[data-id="' + st.focus + '"]');
      const cm = st.comment && x ? x.querySelector('[data-c="' + st.comment + '"]') : null;
      if (x) (cm || x).scrollIntoView({ behavior: 'smooth', block: 'center' });
      else toast2('Esta noticia ya no existe o no tienes permiso para verla.', 'warn');
      if (cm) { cm.classList.add('hl'); setTimeout(() => cm.classList.remove('hl'), 3500); }
      st.focus = ''; st.comment = '';
    }
  }
  function applyParams(p) {
    const ps = (p || []).filter(x => x && !x.startsWith('?'));
    const id = ps[0] || '';
    if (id === 'actualidad' || id === 'equipo') { ponTab(id); return; }
    if (id && tab !== 'equipo') ponTab('equipo'); // un enlace a una noticia del equipo
    if (id === 'nueva') { history.replaceState(null, '', '#/noticias'); postForm(); }
    else if (id) { st.focus = id; st.comment = ps[1] || ''; }
    drawFeed();
  }
  applyParams(params);
  // al abrir Noticias, marcamos como leídas sus notificaciones
  const unread = S.t.notificaciones.filter(n => !n.leida && (n.tipo === 'noticia' || n.tipo === 'comentario' || n.tipo === 'mencion')).map(n => n.id);
  if (unread.length) api('notificaciones.leer', { ids: unread }).then(() => { unread.forEach(id => { const n = byId('notificaciones', id); if (n) n.leida = true; }); emit(); }).catch(() => { });
  return { params: applyParams, update: drawFeed, guardaLoEscrito: true, destroy: () => { callar(); document.body.classList.remove('tk-abierto'); if (actTeclas) { document.removeEventListener('keydown', actTeclas); actTeclas = null; } } }; // v14.0: este tablón ya conserva el comentario a medias y el cursor al actualizarse
}

function postSig(n, now, focus) {
  const f = (n.archivos || []).concat(filesOf('noticias', n.id).map(a => a.id)).map(id => { const a = byId('archivos', id); return a ? a.id + (a.miniatura ? 1 : 0) : ''; }).join(',');
  return JSON.stringify([n, focus, n.publicarEn && n.publicarEn > now, f,
    S.t.reacciones.filter(r => r.noticiaId === n.id).map(r => r.emoji + r.userId).sort(),
    S.t.comentarios.filter(c => c.noticiaId === n.id).map(c => c.id + c.texto)]);
}
function post(n, now, focus) {
  const mine = n.autorId === S.me.id;
  const scheduled = n.publicarEn && n.publicarEn > now;
  const reacts = S.t.reacciones.filter(r => r.noticiaId === n.id);
  const comments = S.t.comentarios.filter(c => c.noticiaId === n.id).sort((a, b) => String(a.creado).localeCompare(String(b.creado)));
  const files = (n.archivos || []).map(id => byId('archivos', id)).filter(Boolean).concat(filesOf('noticias', n.id).filter(a => !(n.archivos || []).includes(a.id)));
  const cInput = inp({ placeholder: 'Escribe un comentario… (usa @Nombre para mencionar)', value: drafts.get(n.id) || '', class: 'inp c-in' });
  cInput.addEventListener('input', () => { if (cInput.value) drafts.set(n.id, cInput.value); else drafts.delete(n.id); });
  const sendC = async () => {
    const t = cInput.value.trim(); if (!t) return;
    const id = uid('m');
    cInput.value = ''; drafts.delete(n.id);
    try { await mutate('noticias.comentar', { id, noticiaId: n.id, texto: t }, { label: 'Comentario', tables: ['comentarios'], optimistic: T => T.comentarios.push({ id, noticiaId: n.id, autor: S.me.nombre, autorId: S.me.id, texto: t, creado: new Date().toISOString() }) }); }
    catch (e) { handleError(e, 'noticias'); }
  };
  cInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendC(); });
  return h('article.post' + (n.fijada ? '.pinned' : ''), { dataset: { id: n.id }, style: focus ? { boxShadow: 'var(--focus)' } : {} },
    h('div.row', avatar(byId('usuarios', n.autorId) || n.autor), h('div.grow', h('div.bold', n.autor), h('div.tiny.muted', (scheduled ? '⏰ Programada para ' + fdt(n.publicarEn) : ago(n.publicarEn || n.creado)) + (n.editado ? ' · editada' : '') + (n.tienda ? ' · ' + n.tienda : ''))),
      n.fijada ? pill('📌 Fijada', 'brand') : null, pill((TIPO_I[n.tipo] || '📰') + ' ' + (n.tipo || 'Noticia')),
      (mine && can('noticias.publicar')) || can('noticias.moderar') ? btn('', () => postMenu(n), { cls: 'ghost icon sm', icon: 'menu', title: 'Opciones' }) : null),
    h('h2', n.titulo), n.texto ? h('div.body', n.texto) : null,
    files.length ? mediaFeed(files) : null,
    n.etiquetas ? h('div.tags', n.etiquetas.split(',').map(t => t.trim()).filter(Boolean).map(t => pill('#' + t))) : null,
    h('div.reacts', EMOJIS.map(e => {
      const who = reacts.filter(r => r.emoji === e);
      const onMe = who.some(r => r.userId === S.me.id);
      if (!who.length && !can('noticias.comentar')) return null;
      return h('button.react' + (onMe ? '.on' : ''), { title: who.map(r => (byId('usuarios', r.userId) || {}).nombre).filter(Boolean).join(', ') || 'Reaccionar', disabled: !can('noticias.comentar'), onclick: () => react(n, e, onMe) }, e + (who.length ? ' ' + who.length : ''));
    })),
    comments.length ? h('div', comments.map(c => h('div.comment', { dataset: { c: c.id } }, avatar(byId('usuarios', c.autorId) || c.autor, 's'), h('div.bubble', h('div.small', h('b', c.autor), h('span.tiny.muted', ' · ' + ago(c.creado))), h('div', c.texto)),
      (c.autorId === S.me.id || can('noticias.moderar')) ? btn('', () => delComment(c), { cls: 'ghost icon sm', icon: 'x', title: 'Borrar comentario' }) : null))) : null,
    can('noticias.comentar') ? h('div.row', cInput, btn('', sendC, { cls: 'icon', icon: 'send', title: 'Enviar' })) : null);
}
async function react(n, emoji, onMe) {
  const id = 'tmp_' + n.id + S.me.id + emoji;
  try {
    await mutate('noticias.reaccionar', { noticiaId: n.id, emoji }, { label: 'Reacción', tables: ['reacciones'], optimistic: T => { if (onMe) T.reacciones = T.reacciones.filter(r => !(r.noticiaId === n.id && r.userId === S.me.id && r.emoji === emoji)); else T.reacciones.push({ id, noticiaId: n.id, userId: S.me.id, emoji }); } });
  } catch (e) { handleError(e, 'noticias'); }
}
async function delComment(c) {
  if (!await confirmDlg('Borrar comentario', '¿Seguro?', 'Borrar', true)) return;
  try { await mutate('noticias.borrarComentario', { id: c.id }, { tables: ['comentarios'], optimistic: T => { T.comentarios = T.comentarios.filter(x => x.id !== c.id); } }); } catch (e) { handleError(e, 'noticias'); }
}
function postMenu(n) {
  const m = modal(n.titulo, h('div.col',
    btn('Editar', () => { m.close(); postForm(n); }, { icon: 'edit' }),
    can('noticias.moderar') ? btn(n.fijada ? 'Quitar de fijadas' : 'Fijar arriba', async () => { m.close(); try { await mutate('noticias.guardar', { id: n.id, datos: { fijada: !n.fijada }, orig: { fijada: n.fijada } }, { onlineOnly: true }); toast(n.fijada ? 'Desfijada' : 'Fijada', 'ok'); } catch (e) { handleError(e); } }, { icon: 'pin' }) : null,
    btn('Borrar', async () => { m.close(); if (!await confirmDlg('Borrar noticia', 'Se moverá a la papelera.', 'Borrar', true)) return; try { await mutate('noticias.borrar', { id: n.id }, { onlineOnly: true }); removeLocal('noticias', n.id); emit(); toast('Noticia borrada', 'ok'); } catch (e) { handleError(e); } }, { icon: 'trash', cls: 'danger' })), null, { size: 'narrow' });
}

export function postForm(n) {
  if (!can('noticias.publicar')) return requestAccess('noticias.publicar', 'noticias');
  const isNew = !n;
  n = n || {};
  const f = {
    titulo: inp({ value: n.titulo || '', placeholder: 'Título' }), texto: area({ value: n.texto || '', placeholder: '¿Qué quieres contar al equipo?', style: { minHeight: '140px' } }),
    tipo: sel(TIPOS, n.tipo || 'Noticia'), etiquetas: inp({ value: n.etiquetas || '', placeholder: 'navidad, objetivos…' }), tienda: inp({ value: n.tienda || '', placeholder: 'Opcional' }),
    publicarEn: inp({ type: 'datetime-local', value: n.publicarEn ? new Date(new Date(n.publicarEn).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '' })
  };
  let fijada = !!n.fijada;
  const zones = [dropZone('foto', { title: 'Fotos' }), dropZone('video', { title: 'Vídeos' }), dropZone('doc', { title: 'Archivos' })];
  const msg = h('p.bad-t');
  modal(isNew ? 'Publicar noticia' : 'Editar noticia', h('div.col',
    h('div.form', field('Tipo', f.tipo), field('Tienda / sección', f.tienda), field('Título *', f.titulo, null, 'full'), field('Texto', f.texto, null, 'full'), field('Etiquetas', f.etiquetas), field('Programar (opcional)', f.publicarEn, 'Vacío = se publica ya')),
    can('noticias.moderar') ? h('label.check', sw(fijada, v => { fijada = v; }), 'Fijar arriba del todo') : null,
    h('div.drops', zones.map(z => z.el)), msg), close => [btn('Cancelar', close), btn(isNew ? 'Publicar' : 'Guardar', async ev => {
      const b = ev.target.closest('button');
      if (!f.titulo.value.trim()) return msg.textContent = 'Pon un título.';
      if (zones.some(z => z.busy())) return msg.textContent = 'Espera a que se preparen los archivos…';
      b.disabled = true; b.textContent = 'Publicando…';
      // v9.7: noticia nueva con fotos → se publica YA y las fotos suben por detrás
      const pend = zones.reduce((a, z) => a + z.pendingCount(), 0);
      if (isNew && pend) {
        try {
          const id = uid('w');
          const datos = { titulo: f.titulo.value.trim(), texto: f.texto.value.trim(), tipo: f.tipo.value, etiquetas: f.etiquetas.value.trim(), tienda: f.tienda.value.trim(), publicarEn: f.publicarEn.value ? new Date(f.publicarEn.value).toISOString() : '', fijada, archivos: [] };
          const r = await mutate('noticias.guardar', { id, datos }, { onlineOnly: true });
          upsertLocal('noticias', r); emit(); close();
          toast('Publicada 🎉 · subiendo ' + pend + ' archivo(s) por detrás…', 'ok', 4000);
          (async () => {
            try {
              const up = [];
              for (const z of zones) up.push(...await z.uploadAll('noticias', ''));
              if (up.length) { const r2 = await api('noticias.guardar', { id, adjuntar: true, datos: { archivos: up.map(a => a.id) } }); upsertLocal('noticias', r2); emit(); }
              if (zones.some(z => z.hasErrors())) toast('Algún archivo de «' + datos.titulo + '» no se pudo subir. Edita la noticia para añadirlo otra vez.', 'warn', 9000);
              else toast('Archivos de «' + datos.titulo + '» subidos ✓', 'ok');
            } catch (e) { toast('No se pudieron subir los archivos de la noticia: ' + e.message, 'bad', 9000); }
          })();
        } catch (e) { msg.textContent = e.message; b.disabled = false; b.textContent = 'Publicar'; handleError(e); }
        return;
      }
      try {
        const up = [];
        for (const z of zones) up.push(...await z.uploadAll('noticias', ''));
        if (zones.some(z => z.hasErrors())) { msg.textContent = 'Algún archivo no se pudo subir. Quítalo o reinténtalo.'; b.disabled = false; b.textContent = 'Publicar'; return; }
        const datos = { titulo: f.titulo.value.trim(), texto: f.texto.value.trim(), tipo: f.tipo.value, etiquetas: f.etiquetas.value.trim(), tienda: f.tienda.value.trim(), publicarEn: f.publicarEn.value ? new Date(f.publicarEn.value).toISOString() : '', fijada, archivos: (n.archivos || []).concat(up.map(a => a.id)) };
        const r = isNew ? await mutate('noticias.guardar', { id: uid('w'), datos }, { onlineOnly: true }) : await mutate('noticias.guardar', { id: n.id, datos, orig: { titulo: n.titulo } }, { onlineOnly: true });
        upsertLocal('noticias', r); emit();
        close(); toast(datos.publicarEn && datos.publicarEn > new Date().toISOString() ? 'Noticia programada' : 'Publicada 🎉', 'ok');
      } catch (e) { msg.textContent = e.message; b.disabled = false; b.textContent = 'Publicar'; handleError(e); }
    }, { cls: 'primary' })], { size: 'wide' });
}

// ---------- v13.10 · 🌍 ACTUALIDAD: noticias reales por temas (política, deporte, moda, entretenimiento, arte…) ----------
// v15.3 · 📱 TIPO TIKTOK: una noticia por pantalla, con su FOTO detrás y el texto encima. Se pasa con el dedo (o la rueda / ↓ ↑),
// y cada una se puede ESCUCHAR en voz alta 🔊, guardar ❤️, compartir 📤 o abrir entera ↗.
let actCat = (() => { try { return localStorage.getItem('cd.noticias.cat') || 'portada'; } catch (e) { return 'portada'; } })();
const actMem = new Map();
const ACT_ICO = { portada: '🗞️', politica: '🏛️', deporte: '⚽', moda: '👗', entretenimiento: '🎬', arte: '🎨', impresion3d: '🖨️', guardadas: '❤️' };
const ACT_COLOR = { portada: ['#1e3a8a', '#7c3aed'], politica: ['#334155', '#0f766e'], deporte: ['#065f46', '#16a34a'], moda: ['#9d174d', '#f472b6'], entretenimiento: ['#7c2d12', '#f59e0b'], arte: ['#4c1d95', '#db2777'], impresion3d: ['#0e7490', '#7c3aed'], guardadas: ['#9f1239', '#f43f5e'] };
const guardadas = () => { try { return JSON.parse(localStorage.getItem('cd.noticias.guardadas') || '[]'); } catch (e) { return []; } };
const ponGuardadas = l => { try { localStorage.setItem('cd.noticias.guardadas', JSON.stringify(l.slice(0, 100))); } catch (e) { } };
let actTeclas = null, actHabla = null;
function callar() { try { speechSynthesis.cancel(); } catch (e) { } if (actHabla) { actHabla.classList.remove('on'); actHabla = null; } }
function escuchar(x, b) {
  if (!('speechSynthesis' in window)) return toast('Este aparato no sabe leer en voz alta.', 'warn');
  const era = actHabla === b; callar(); if (era) return;
  const u = new SpeechSynthesisUtterance(x.titulo + '. ' + (x.resumen || ''));
  u.lang = 'es-ES'; u.rate = 0.95;
  const v = speechSynthesis.getVoices().find(v => /^es(-|_)ES/i.test(v.lang)) || speechSynthesis.getVoices().find(v => /^es/i.test(v.lang)); if (v) u.voice = v;
  u.onend = u.onerror = () => { if (actHabla === b) callar(); };
  actHabla = b; b.classList.add('on'); speechSynthesis.speak(u);
}
async function actualidad(box, recargar) {
  if (box.dataset.cargando === '1') return;
  callar();
  const temasDef = [['portada', 'Portada'], ['politica', 'Política'], ['deporte', 'Deporte'], ['moda', 'Moda'], ['entretenimiento', 'Entretenimiento'], ['arte', 'Arte'], ['impresion3d', 'Impresión 3D'], ['guardadas', 'Guardadas']];
  const chips = h('div.act-chips', temasDef.map(([k, t]) => h('button.chip' + (actCat === k ? '.on' : ''), { type: 'button', 'data-cat': k, onclick: () => { actCat = k; try { localStorage.setItem('cd.noticias.cat', k); } catch (e) { } actualidad(box); } }, (ACT_ICO[k] || '') + ' ' + t)),
    btn('↻', () => actualidad(box, true), { cls: 'sm ghost act-recargar', title: 'Actualizar las noticias' }),
    btn('⛶', () => { box.classList.toggle('tk-full'); document.body.classList.toggle('tk-abierto', box.classList.contains('tk-full')); }, { cls: 'sm ghost act-full', title: 'Pantalla completa' }));
  const lista = h('div.act-lista.tk', { tabindex: '0', 'aria-label': 'Noticias: desliza hacia arriba para ver la siguiente' });
  mount(box, chips, lista);
  if (actTeclas) document.removeEventListener('keydown', actTeclas);
  actTeclas = e => {
    if (!lista.isConnected) { document.removeEventListener('keydown', actTeclas); actTeclas = null; callar(); document.body.classList.remove('tk-abierto'); return; }
    if (box.style.display === 'none' || e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'Escape' && box.classList.contains('tk-full')) { box.classList.remove('tk-full'); document.body.classList.remove('tk-abierto'); return; }
    const d = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j' ? 1 : e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k' ? -1 : 0;
    if (!d) return; e.preventDefault();
    lista.scrollBy({ top: d * lista.clientHeight, behavior: 'smooth' });
  };
  document.addEventListener('keydown', actTeclas);
  const abrir = u => import('../desktop.js').then(D => D.desktop.on ? D.desktop.openUrl(u) : window.open(u, '_blank', 'noopener')).catch(() => window.open(u, '_blank', 'noopener'));
  const tarjeta = (x, i, r) => {
    const [c1, c2] = ACT_COLOR[x.cat || actCat] || ACT_COLOR.portada;
    const fondo = h('div.tk-fondo', { style: { background: 'linear-gradient(160deg,' + c1 + ',' + c2 + ')' } }, h('span.tk-emoji', ACT_ICO[x.cat || actCat] || '📰'));
    if (x.imagen) {
      const f = h('img.tk-foto', { src: x.imagen, alt: '', loading: i < 2 ? 'eager' : 'lazy', referrerpolicy: 'no-referrer', decoding: 'async' });
      const bg = h('img.tk-borroso', { src: x.imagen, alt: '', loading: i < 2 ? 'eager' : 'lazy', referrerpolicy: 'no-referrer', 'aria-hidden': 'true' });
      f.onerror = () => { f.remove(); bg.remove(); };
      fondo.append(bg, f);
    }
    const g = guardadas(), esta = g.some(y => y.enlace === x.enlace);
    const bG = h('button.tk-acc' + (esta ? '.on' : ''), { type: 'button', title: 'Guardar', 'aria-label': 'Guardar', onclick: () => { let l = guardadas(); const ya = l.some(y => y.enlace === x.enlace); l = ya ? l.filter(y => y.enlace !== x.enlace) : [Object.assign({ cat: x.cat || actCat }, x)].concat(l); ponGuardadas(l); bG.classList.toggle('on', !ya); bG.firstChild.textContent = !ya ? '❤️' : '🤍'; toast(ya ? 'Quitada de guardadas' : '❤️ Guardada', 'ok', 1500); } }, h('span', esta ? '❤️' : '🤍'), h('small', 'Guardar'));
    const bV = h('button.tk-acc.tk-voz', { type: 'button', title: 'Escuchar', 'aria-label': 'Escuchar en voz alta', onclick: () => escuchar(x, bV) }, h('span', '🔊'), h('small', 'Escuchar'));
    const bC = h('button.tk-acc', { type: 'button', title: 'Compartir', 'aria-label': 'Compartir', onclick: async () => { try { if (navigator.share) await navigator.share({ title: x.titulo, url: x.enlace }); else copyText(x.titulo + '\n' + x.enlace); } catch (e) { } } }, h('span', '📤'), h('small', 'Compartir'));
    const bA = h('button.tk-acc', { type: 'button', title: 'Leer entera', 'aria-label': 'Abrir la noticia entera', onclick: () => abrir(x.enlace) }, h('span', '↗'), h('small', 'Abrir'));
    return h('article.act-item.tk-card', { 'data-i': i, 'data-enlace': x.enlace },
      fondo, h('div.tk-sombra'),
      h('div.tk-txt',
        h('div.tk-fuente', [x.fuente, x.fecha ? ago(x.fecha) : ''].filter(Boolean).join(' · ')),
        h('h2.act-t', x.titulo),
        x.resumen ? h('p.tk-resumen', x.resumen) : null,
        h('button.tk-leer', { type: 'button', onclick: () => abrir(x.enlace) }, 'Leer la noticia entera ↗')),
      h('div.tk-acciones', bG, bV, bC, bA),
      i === 0 && r.items.length > 1 ? h('div.tk-pista', '⬆️ Desliza para ver la siguiente') : null,
      h('div.tk-num', (i + 1) + ' / ' + r.items.length));
  };
  const pinta = r => {
    if (!r.items.length) return mount(lista, h('div.tk-card.tk-vacia', h('div.tk-txt', h('h2', actCat === 'guardadas' ? '❤️ Aún no has guardado ninguna noticia' : 'Ahora mismo no hay noticias de este tema.'), actCat === 'guardadas' ? h('p.tk-resumen', 'Pulsa 🤍 Guardar en una noticia y aparecerá aquí.') : null)));
    mount(lista, r.items.map((x, i) => tarjeta(x, i, r)));
    lista.scrollTop = 0;
  };
  if (actCat === 'guardadas') return pinta({ items: guardadas() });
  const mem = actMem.get(actCat);
  if (mem && !recargar && Date.now() - mem.t < 10 * 60000) return pinta(mem.r);
  mount(lista, h('div.tk-card.tk-cargando', h('div.tk-txt', h('div.skeleton', { style: { height: '34px', width: '80%', marginBottom: '12px' } }), h('div.skeleton', { style: { height: '18px', width: '95%', marginBottom: '8px' } }), h('div.skeleton', { style: { height: '18px', width: '70%' } }))));
  box.dataset.cargando = '1';
  try { const r = await api('actualidad.lista', { cat: actCat, recargar: !!recargar }, { quiet: true, timeout: 40000 }); actMem.set(actCat, { t: Date.now(), r }); pinta(r); }
  catch (e) { mount(lista, h('div.tk-card.tk-vacia', h('div.tk-txt', h('h2', '📡 ' + (e.code === 'NOT_FOUND' || /desconocida|Acción/i.test(e.message) ? 'Actualiza el servidor (Servidor.gs) para ver las noticias.' : e.message)), btn('Reintentar', () => actualidad(box, true), { cls: 'primary' })))); }
  finally { box.dataset.cargando = ''; }
}
