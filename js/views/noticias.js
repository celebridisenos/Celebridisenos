// ================= Noticias: el tablón interno del equipo =================
import { h, mount, icon, btn, modal, toast, fdt, ago, pill, empty, field, inp, sel, area, debounce, confirmDlg, uid, avatar, sw } from '../ui.js';
import { S, can, mutate, api, byId, upsertLocal, removeLocal, emit } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { dropZone, gallery, filesOf } from '../files.js';

const CL = window.CL;
const TIPOS = ['Noticia', 'Anuncio', 'Campaña', 'Objetivo', 'Reconocimiento', 'Novedad de producto'];
const TIPO_I = { 'Noticia': '📰', 'Anuncio': '📣', 'Campaña': '🎯', 'Objetivo': '🏁', 'Reconocimiento': '🏆', 'Novedad de producto': '✨', 'Informe': '📊' };
const EMOJIS = ['👍', '❤️', '🎉', '😂', '😮', '👏'];

export function render(el, params) {
  const st = { q: '', tipo: '', focus: '' };
  const search = inp({ type: 'search', placeholder: 'Buscar en noticias…' });
  search.addEventListener('input', debounce(() => { st.q = search.value; drawFeed(); }, 150));
  const fTipo = sel([{ v: '', t: 'Todas' }].concat(TIPOS), ''); fTipo.addEventListener('change', () => { st.tipo = fTipo.value; drawFeed(); });
  const feed = h('div.col', { style: { gap: '14px' } });
  el.append(h('div.page-head', h('h1', 'Noticias'), can('noticias.publicar') ? btn('Publicar', () => postForm(), { cls: 'primary', icon: 'plus' }) : null),
    h('div.row.wrap', { style: { marginBottom: '14px' } }, h('div.inp-icon.grow', icon('search', 's'), search), h('div', { style: { width: '200px' } }, fTipo)),
    h('div', { style: { maxWidth: '760px' } }, feed));
  function drawFeed() {
    const now = new Date().toISOString();
    const list = S.t.noticias.filter(n => (!st.tipo || n.tipo === st.tipo) && (!st.q || CL.matches(n.titulo + ' ' + n.texto + ' ' + n.etiquetas + ' ' + n.autor, st.q)))
      .sort((a, b) => (b.fijada - a.fijada) || String(b.publicarEn || b.creado).localeCompare(String(a.publicarEn || a.creado)));
    if (!list.length) return mount(feed, h('div.card', empty('news', S.t.noticias.length ? 'Nada con este filtro' : 'Todavía no hay noticias', can('noticias.publicar') ? 'Comparte novedades, objetivos o reconocimientos con el equipo.' : 'Aquí aparecerán las novedades del equipo.', can('noticias.publicar') && !S.t.noticias.length ? btn('Publicar la primera', () => postForm(), { cls: 'primary' }) : null)));
    mount(feed, list.map(n => post(n, now, st.focus === n.id)));
    if (st.focus) { const x = feed.querySelector('[data-id="' + st.focus + '"]'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'center' }); st.focus = ''; }
  }
  function applyParams(p) {
    const id = (p || []).find(x => x && !x.startsWith('?')) || '';
    if (id === 'nueva') { history.replaceState(null, '', '#/noticias'); postForm(); }
    else if (id) st.focus = id;
    drawFeed();
  }
  applyParams(params);
  // al abrir Noticias, marcamos como leídas sus notificaciones
  const unread = S.t.notificaciones.filter(n => !n.leida && (n.tipo === 'noticia' || n.tipo === 'comentario' || n.tipo === 'mencion')).map(n => n.id);
  if (unread.length) api('notificaciones.leer', { ids: unread }).then(() => { unread.forEach(id => { const n = byId('notificaciones', id); if (n) n.leida = true; }); emit(); }).catch(() => { });
  return { params: applyParams, update: drawFeed };
}

function post(n, now, focus) {
  const mine = n.autorId === S.me.id;
  const scheduled = n.publicarEn && n.publicarEn > now;
  const reacts = S.t.reacciones.filter(r => r.noticiaId === n.id);
  const comments = S.t.comentarios.filter(c => c.noticiaId === n.id).sort((a, b) => String(a.creado).localeCompare(String(b.creado)));
  const files = (n.archivos || []).map(id => byId('archivos', id)).filter(Boolean).concat(filesOf('noticias', n.id).filter(a => !(n.archivos || []).includes(a.id)));
  const cInput = inp({ placeholder: 'Escribe un comentario… (usa @Nombre para mencionar)' });
  const sendC = async () => {
    const t = cInput.value.trim(); if (!t) return;
    const id = uid('m');
    cInput.value = '';
    try { await mutate('noticias.comentar', { id, noticiaId: n.id, texto: t }, { label: 'Comentario', tables: ['comentarios'], optimistic: T => T.comentarios.push({ id, noticiaId: n.id, autor: S.me.nombre, autorId: S.me.id, texto: t, creado: new Date().toISOString() }) }); }
    catch (e) { handleError(e, 'noticias'); }
  };
  cInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendC(); });
  return h('article.post' + (n.fijada ? '.pinned' : ''), { dataset: { id: n.id }, style: focus ? { boxShadow: 'var(--focus)' } : {} },
    h('div.row', avatar(byId('usuarios', n.autorId) || n.autor), h('div.grow', h('div.bold', n.autor), h('div.tiny.muted', (scheduled ? '⏰ Programada para ' + fdt(n.publicarEn) : ago(n.publicarEn || n.creado)) + (n.editado ? ' · editada' : '') + (n.tienda ? ' · ' + n.tienda : ''))),
      n.fijada ? pill('📌 Fijada', 'brand') : null, pill((TIPO_I[n.tipo] || '📰') + ' ' + (n.tipo || 'Noticia')),
      (mine && can('noticias.publicar')) || can('noticias.moderar') ? btn('', () => postMenu(n), { cls: 'ghost icon sm', icon: 'menu', title: 'Opciones' }) : null),
    h('h2', n.titulo), n.texto ? h('div.body', n.texto) : null,
    files.length ? gallery(files) : null,
    n.etiquetas ? h('div.tags', n.etiquetas.split(',').map(t => t.trim()).filter(Boolean).map(t => pill('#' + t))) : null,
    h('div.reacts', EMOJIS.map(e => {
      const who = reacts.filter(r => r.emoji === e);
      const onMe = who.some(r => r.userId === S.me.id);
      if (!who.length && !can('noticias.comentar')) return null;
      return h('button.react' + (onMe ? '.on' : ''), { title: who.map(r => (byId('usuarios', r.userId) || {}).nombre).filter(Boolean).join(', ') || 'Reaccionar', disabled: !can('noticias.comentar'), onclick: () => react(n, e, onMe) }, e + (who.length ? ' ' + who.length : ''));
    })),
    comments.length ? h('div', comments.map(c => h('div.comment', avatar(byId('usuarios', c.autorId) || c.autor, 's'), h('div.bubble', h('div.small', h('b', c.autor), h('span.tiny.muted', ' · ' + ago(c.creado))), h('div', c.texto)),
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
