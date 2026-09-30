// ================= Arranque, navegación y estructura =================
import { h, mount, clear, icon, btn, modal, toast, avatar, ago, debounce, field, inp, area, confirmDlg } from './ui.js';
import { S, on, emit, api, pull, loadLocal, startAutoSync, logout, can, onAuthLostHandler, unreadCount, dash, mutate, onQueueFailure, kv, unlock, APP_VERSION, flush } from './store.js';
import { desktop } from './desktop.js';
import { renderSetup, renderLogin, renderConnect } from './views/setup.js';
import { roleLabel } from './roles.js';
import { startChat, CHAT } from './chat.js';
import { startWorker } from './ai/engine.js';

const CL = window.CL;
const VIEWS = {
  inicio: () => import('./views/home.js'),
  pedidos: () => import('./views/pedidos.js'),
  clientes: () => import('./views/clientes.js'),
  productos: () => import('./views/productos.js'),
  tareas: () => import('./views/tareas.js'),
  noticias: () => import('./views/noticias.js'),
  redes: () => import('./views/redes.js'),
  archivos: () => import('./views/archivos.js'),
  ia: () => import('./views/ia.js'),
  chat: () => import('./views/chat.js'),
  estado: () => import('./views/estado.js'),
  informes: () => import('./views/informes.js'),
  notificaciones: () => import('./views/notificaciones.js'),
  config: () => import('./views/config.js')
};
export const NAV = [
  { k: 'inicio', t: 'Inicio', i: 'home' },
  { k: 'pedidos', t: 'Pedidos', i: 'truck', p: 'pedidos.ver' },
  { k: 'clientes', t: 'Clientes', i: 'users', p: 'clientes.ver' },
  { k: 'productos', t: 'Productos', i: 'cube', p: 'productos.ver' },
  { k: 'tareas', t: 'Tareas', i: 'tasks', p: 'tareas.ver' },
  { sep: true, t: 'Equipo' },
  { k: 'chat', t: 'Chat', i: 'msg', p: 'chat.usar' },
  { k: 'noticias', t: 'Noticias', i: 'news', p: 'noticias.ver' },
  { k: 'redes', t: 'Redes sociales', i: 'calendar', p: 'redes.ver' },
  { k: 'archivos', t: 'Archivos', i: 'folder', p: 'archivos.ver' },
  { k: 'ia', t: 'Asistente IA', i: 'sparkles', p: 'ia.usar' },
  { k: 'informes', t: 'Informes', i: 'chart', p: 'informes.ver' },
  { sep: true },
  { k: 'config', t: 'Configuración', i: 'settings' },
  { k: 'estado', t: 'Estado del sistema', i: 'shield', p: 'config.ver' }
];

const app = document.getElementById('app');
let current = { name: '', view: null, params: [] };
let shell = null;

// ---------- Router ----------
export function go(path) { if (location.hash !== '#/' + path) location.hash = '#/' + path; else route(); }
function parseHash() { const p = (location.hash || '#/inicio').replace(/^#\/?/, '').split('/').map(decodeURIComponent); return { name: p[0] || 'inicio', params: p.slice(1) }; }
async function route() {
  if (!S.token || !S.me) return;
  const { name, params } = parseHash();
  const def = NAV.find(n => n.k === name);
  if (!VIEWS[name]) return go('inicio');
  buildShell();
  markNav(name);
  if (current.name === name && current.view && current.view.params) { current.view.params(params); return; }
  if (current.view && current.view.destroy) current.view.destroy();
  const content = shell.content;
  clear(content);
  if (def && def.p && !can(def.p)) { mount(content, lockBox(def.p, def.t)); current = { name, view: null }; return; }
  content.appendChild(h('div', h('div.skeleton', { style: { width: '30%', height: '28px', marginBottom: '20px' } }), h('div.skeleton', { style: { height: '120px' } })));
  document.body.dataset.view = name;
  current = { name, view: null, params }; // cargando: si se vuelve rápido a la vista anterior, se dibuja de nuevo
  try {
    const mod = await VIEWS[name]();
    if (parseHash().name !== name) return;
    clear(content);
    current = { name, view: mod.render(content, params) || {}, params };
    window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    mount(content, h('div.card', h('h3', 'No se pudo abrir esta sección'), h('p.muted', String(e.message || e)), btn('Reintentar', () => location.reload(), { cls: 'primary' })));
  }
}
window.addEventListener('hashchange', route);

// ---------- Estructura ----------
function buildShell() {
  if (shell && document.body.contains(shell.root)) return;
  const nav = h('nav.nav', { 'aria-label': 'Secciones' });
  const sidebar = h('aside.sidebar', h('div.brand', h('div.logo', h('img.brand-logo', { src: (S.cfg && S.cfg.empresa && S.cfg.empresa.logo) || 'icons/icon-192.png', alt: '' })), h('div', h('b.ellipsis', (S.cfg && S.cfg.empresa.nombre) || 'CelebriDiseños'), h('small', 'Gestión del negocio'))), nav, h('div.me', { onclick: () => go('config/perfil') }));
  const syncEl = h('button.sync', { title: 'Estado de la sincronización', onclick: () => syncPanel() });
  const bell = h('button.btn.ghost.icon.icon-btn', { title: 'Notificaciones', onclick: () => go('notificaciones') }, icon('bell'));
  const chatB = can('chat.usar') ? h('button.btn.ghost.icon.icon-btn.chat-btn', { title: 'Chat del equipo', 'aria-label': 'Chat', onclick: () => go('chat') }, icon('msg')) : h('span');
  const topbar = h('header.topbar',
    h('button.btn.ghost.icon.show-m', { onclick: () => sidebar.classList.toggle('open'), title: 'Menú' }, icon('menu')),
    h('button.search-btn', { onclick: () => palette() }, icon('search', 's'), h('span.ellipsis', 'Buscar pedidos, clientes, seguimiento…'), h('kbd', 'Ctrl K')),
    h('div.right.row', syncEl, chatB, bell));
  const banner = h('div');
  const content = h('main.content', { id: 'main' });
  const tabbar = h('nav.tabbar', { 'aria-label': 'Secciones principales' });
  const fab = h('button.fab', { title: 'Crear', onclick: () => quickCreate() }, icon('plus', 'l'));
  const root = h('div.shell', sidebar, h('div.main', topbar, banner, content), tabbar, fab);
  mount(app, root);
  sidebar.addEventListener('click', e => { if (e.target.closest('a')) sidebar.classList.remove('open'); });
  shell = { root, nav, sidebar, syncEl, bell, chatB, banner, content, tabbar };
  refreshShell();
}
function markNav(name) { if (!shell) return; shell.nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.k === name)); shell.tabbar.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.k === name)); }

function refreshShell() {
  if (!shell) return;
  const d = S.cfg ? dash() : null;
  const counts = d ? { pedidos: d.pedidos.urgentes.length, tareas: d.tareas.mias, chat: S.chatUnread || 0 } : {};
  mount(shell.nav, NAV.filter(n => n.sep || !n.p || can(n.p)).map(n => n.sep ? [h('div.sep'), n.t ? h('div.grp', n.t) : null] :
    h('a', { href: '#/' + n.k, dataset: { k: n.k } }, icon(n.i), h('span', n.t), counts[n.k] ? h('span.count' + (n.k === 'tareas' ? '.soft' : ''), String(counts[n.k])) : null)));
  const tabs = [{ k: 'inicio', t: 'Inicio', i: 'home' }, { k: 'pedidos', t: 'Pedidos', i: 'truck', p: 'pedidos.ver' }, { k: 'chat', t: 'Chat', i: 'msg', p: 'chat.usar' }, { k: 'ia', t: 'IA', i: 'sparkles', p: 'ia.usar' }, { k: 'tareas', t: 'Tareas', i: 'tasks', p: 'tareas.ver' }, { k: 'clientes', t: 'Clientes', i: 'users', p: 'clientes.ver' }]
    .filter(n => !n.p || can(n.p)).slice(0, 5);
  mount(shell.tabbar, tabs.map(n => h('a', { href: '#/' + n.k, dataset: { k: n.k } }, icon(n.i), n.t, counts[n.k] ? h('span.count', String(counts[n.k])) : null)));
  markNav(parseHash().name);
  const me = shell.sidebar.querySelector('.me');
  if (S.me) mount(me, avatar(S.me), h('div.grow', h('div.bold.ellipsis', S.me.nombre), h('div.tiny.muted', roleName(S.me.rol))), icon('settings', 's'));
  const brand = shell.sidebar.querySelector('.brand b'); if (brand && S.cfg) brand.textContent = S.cfg.empresa.nombre;
  const lg = shell.sidebar.querySelector('.brand-logo'); if (lg && S.cfg) { const src = S.cfg.empresa.logo || 'icons/icon-192.png'; if (lg.getAttribute('src') !== src) { lg.setAttribute('src', src); const fav = document.querySelector('link[rel="icon"]'); if (fav) fav.href = S.cfg.empresa.logo || 'icons/favicon.png'; } }
  const oc = shell.chatB.querySelector && shell.chatB.querySelector('.badge-n'); if (oc) oc.remove();
  if (S.chatUnread && shell.chatB.appendChild) shell.chatB.appendChild(h('span.badge-n', S.chatUnread > 99 ? '99+' : String(S.chatUnread)));
  // Estado de sincronización
  const q = S.queue.length;
  const cls = !S.online ? 'off' : S.syncError ? 'err' : (S.busy || S.syncing) ? 'busy' : '';
  const txt = !S.online ? (q ? `Sin conexión · ${q} cambio(s) pendiente(s)` : 'Sin conexión') : S.syncError ? 'Error de sincronización' : (S.busy || S.syncing) ? 'Consultando…' : q ? `Enviando ${q}…` : 'Al día';
  shell.syncEl.className = 'sync ' + cls;
  mount(shell.syncEl, h('span.dot'), h('span.txt', txt));
  const n = unreadCount();
  const old = shell.bell.querySelector('.badge-n'); if (old) old.remove();
  if (n) shell.bell.appendChild(h('span.badge-n', n > 99 ? '99+' : String(n)));
  // Avisos generales
  const errs = Object.keys(S.errors || {});
  mount(shell.banner,
    !S.online ? h('div.banner.warn', icon('wifioff', 's'), h('span', 'Sin conexión con el servidor. Puedes seguir trabajando: los cambios se guardan en este dispositivo y se enviarán solos al volver la conexión.')) : null,
    errs.length ? h('div.banner.bad', icon('alert', 's'), h('span', 'No se pudo leer: ' + errs.map(k => k + ' (' + S.errors[k] + ')').join(' · '))) : null,
    S.perms && S.perms.temp && S.perms.temp.length ? h('div.banner.info', icon('key', 's'), h('span', 'Tienes acceso temporal a: ' + S.perms.temp.map(t => (S.cfg.permisos[t.permiso] || t.permiso) + ' (hasta ' + new Date(t.hasta).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ')').join(', '))) : null);
  document.title = (n ? `(${n}) ` : '') + ((S.cfg && S.cfg.empresa.nombre) || 'CelebriDiseños');
}
export function roleName(r) { return roleLabel(r); }

function syncPanel() {
  const q = S.queue;
  modal('Sincronización', h('div.col',
    h('div.kv', h('dt', 'Servidor'), h('dd', S.online ? 'Conectado' : 'Sin conexión'), h('dt', 'Última actualización'), h('dd', S.lastSync ? ago(S.lastSync) : 'Nunca'), h('dt', 'Cambios pendientes'), h('dd', String(q.length)), h('dt', 'Dispositivo'), h('dd', S.device), h('dt', 'Versión'), h('dd', APP_VERSION + (desktop.on ? ' · Escritorio' : ''))),
    q.length ? h('div.list.boxed', q.map(x => h('div.item', icon('clock', 's'), h('span.grow', x.label), h('span.tiny.muted', ago(new Date(x.t).toISOString()))))) : null,
    S.syncError ? h('p.bad-t', S.syncError) : null
  ), close => [btn('Actualizar ahora', async () => { await flush(); await pull(true); close(); toast('Datos actualizados', 'ok'); }, { cls: 'primary', icon: 'refresh' })]);
}

// ---------- Permisos: bloqueo y solicitud de acceso ----------
export function lockBox(perm, what) {
  return h('div.card.lockbox', h('div.ic', icon('lock', 'l')), h('h2', 'Esta sección requiere autorización'), h('p.muted', 'Necesitas el permiso: ' + ((S.cfg && S.cfg.permisos[perm]) || perm)),
    btn('Solicitar acceso a una administradora', () => requestAccess(perm, what), { cls: 'primary', icon: 'key' }));
}
export function requestAccess(perm, what, action) {
  const mot = area({ placeholder: 'Ej.: necesito borrar un pedido duplicado' });
  modal('Esta acción requiere autorización', h('div.col', h('p', 'Esta acción requiere autorización de administrador.'), h('p.muted', 'Permiso: ' + ((S.cfg && S.cfg.permisos[perm]) || perm)), field('Motivo (opcional)', mot)), close => [
    btn('Cancelar', close),
    btn('Crear solicitud', async () => {
      try { const r = await api('solicitudes.crear', { permiso: perm, seccion: what || '', accion: action || '', motivo: mot.value }); close(); toast(r.yaTienes ? 'Ya tienes ese permiso' : 'Solicitud enviada. Te avisaremos cuando la revisen.', 'ok'); pull(); }
      catch (e) { toast(e.message, 'bad'); }
    }, { cls: 'primary' })], { size: 'narrow' });
}
// Maneja errores de cualquier acción de forma uniforme
export function handleError(e, what) {
  if (!e) return;
  if (e.code === 'PERM' && e.extra && e.extra.permiso) return requestAccess(e.extra.permiso, what);
  if (e.code === 'CONFLICT') {
    const cur = e.extra && e.extra.current;
    return modal('Otra persona ha cambiado esto', h('div.col', h('p', 'Mientras lo editabas, alguien guardó otros cambios en los mismos campos. Para no perder su trabajo, no se ha guardado lo tuyo.'),
      cur ? h('p.muted', 'Valores actuales: ' + (e.extra.fields || []).map(f => f + ' = "' + (cur[f] ?? '') + '"').join(', ')) : null,
      h('p', 'Revisa los datos actualizados y vuelve a aplicar tu cambio si sigue siendo necesario.')), close => [btn('Entendido', () => { close(); pull(); }, { cls: 'primary' })], { size: 'narrow' });
  }
  toast(e.message || String(e), 'bad');
}
onQueueFailure((x, err) => {
  if (err.code === 'CONFLICT') handleError({ code: 'CONFLICT', extra: err.extra });
  else toast('No se pudo guardar "' + x.label + '" (hecho sin conexión): ' + err.msg, 'bad', 10000);
});

// ---------- Buscador global (Ctrl+K) ----------
export function palette(initial) {
  const q = h('input.inp', { placeholder: 'Busca: nº de pedido, cliente, producto, seguimiento, tarea, noticia, archivo…', value: initial || '', 'aria-label': 'Buscar' });
  const res = h('div.res');
  let items = [], sel = 0;
  const m = modal('Buscar', h('div', q, res), null, { size: 'palette' });
  m.el.classList.add('palette'); m.el.parentElement.classList.add('palette-o');
  m.el.querySelector('.modal-h').remove();
  m.el.querySelector('.modal-b').style.padding = '0';
  const run = () => {
    const s = q.value.trim().replace(/^#/, '');
    items = [];
    if (s.length >= 1) {
      const add = (grp, ic, t, sub, path) => items.push({ grp, ic, t, sub, path });
      const match = (hay) => CL.matches(hay, s);
      if (can('pedidos.ver')) S.t.pedidos.filter(o => match([o.numero, o.cliente, o.producto, o.seguimiento, o.notas, o.personalizacion, o.canal].join(' '))).slice(-15).reverse().forEach(o => add('Pedidos', 'truck', 'Pedido nº ' + o.numero + ' · ' + o.cliente, o.producto + ' · ' + o.estado + (o.seguimiento ? ' · ' + o.seguimiento : ''), 'pedidos/' + o.id));
      if (can('clientes.ver')) S.t.clientes.filter(c => match([c.nombre, c.usuarios, c.email, c.telefono, c.etiquetas].join(' '))).slice(0, 8).forEach(c => add('Clientes', 'user', c.nombre, c.usuarios || c.canal || '', 'clientes/' + c.id));
      if (can('productos.ver')) S.t.productos.filter(p => match([p.id, p.nombre, p.categoria, p.subcategoria, p.color].join(' '))).slice(0, 8).forEach(p => add('Productos', 'cube', p.nombre, p.id + ' · ' + (p.categoria || ''), 'productos/' + p.id));
      if (can('tareas.ver')) S.t.tareas.filter(t => match(t.titulo + ' ' + t.notas)).slice(0, 6).forEach(t => add('Tareas', 'tasks', t.titulo, t.estado + (t.responsable ? ' · ' + t.responsable : ''), 'tareas/' + t.id));
      if (can('noticias.ver')) S.t.noticias.filter(n => match(n.titulo + ' ' + n.texto)).slice(0, 5).forEach(n => add('Noticias', 'news', n.titulo, n.autor, 'noticias/' + n.id));
      if (can('redes.ver')) S.t.redes.filter(r => match([r.titulo, r.texto, r.hashtags, r.red].join(' '))).slice(0, 5).forEach(r => add('Redes', 'calendar', r.titulo || r.red, r.fecha + ' · ' + r.estado, 'redes/' + r.id));
      if (can('archivos.ver')) S.t.archivos.filter(a => match(a.nombre)).slice(0, 6).forEach(a => add('Archivos', 'file', a.nombre, a.tipo + ' · ' + a.entidad, 'archivos/' + a.id));
      (S.t.biblioteca || []).filter(b => match([b.titulo, b.etiquetas, b.categoria].join(' '))).slice(0, 6).forEach(b => add('Documentos', 'file', b.titulo, b.categoria + ' · ' + (b.propietario || ''), 'ia/biblioteca'));
      (S.t.memoria || []).filter(m => match(m.texto)).slice(0, 4).forEach(m => add('Memoria de la IA', 'sparkles', m.texto.slice(0, 80), m.ambito, 'ia/memoria'));
      if (can('chat.usar')) CHAT.msgs.filter(m => match(m.autor + ' ' + m.texto)).slice(-6).reverse().forEach(m => add('Conversaciones (chat)', 'msg', m.texto.slice(0, 90), m.autor + ' · ' + new Date(m.creado).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), 'chat'));
      (S.t.usuarios || []).filter(u => match(u.nombre + ' ' + u.usuario)).slice(0, 4).forEach(u => add('Usuarios', 'user', u.nombre, roleLabel(u.rol), can('usuarios.admin') ? 'config/usuarios' : 'chat'));
      if (can('informes.ver')) [['Informe de ventas', 'informes'], ['Informe de productos y márgenes', 'informes'], ['Informe de clientes', 'informes'], ['Centro de inteligencia', 'inicio']].filter(x => match(x[0])).forEach(x => add('Informes', 'chart', x[0], '', x[1]));
      if (s.length >= 4 && can('ia.usar')) import('./ai/rag.js').then(r => r.search(s, { k: 3 })).then(list => { if (!list.length || q.value.trim().replace(/^#/, '') !== s) return; list.forEach(d => items.push({ grp: 'En la biblioteca (búsqueda inteligente)', ic: 'sparkles', t: d.titulo + (d.seccion ? ' › ' + d.seccion : ''), sub: d.texto.slice(0, 90) + '…', path: 'ia/biblioteca' })); draw(); }).catch(() => { });
    } else {
      [['Nuevo pedido', 'plus', 'pedidos/nuevo', 'pedidos.crear'], ['Nuevo producto', 'plus', 'productos/nuevo', 'productos.editar'], ['Nueva tarea', 'plus', 'tareas/nueva', 'tareas.crear'], ['Preguntar a la IA', 'sparkles', 'ia', 'ia.usar']]
        .filter(x => can(x[3])).forEach(x => items.push({ grp: 'Acciones rápidas', ic: x[1], t: x[0], sub: '', path: x[2] }));
    }
    sel = 0;
    draw();
  };
  const draw = () => {
    clear(res);
    if (!items.length) { res.appendChild(h('div.empty', h('p', q.value ? 'Nada encontrado con "' + q.value + '".' : ''))); return; }
    let last = '';
    items.forEach((it, i) => {
      if (it.grp !== last) { res.appendChild(h('div.grp-t', it.grp)); last = it.grp; }
      res.appendChild(h('div.it' + (i === sel ? '.on' : ''), { onclick: () => { m.close(); go(it.path); } }, icon(it.ic), h('div.grow', h('div.bold.ellipsis', it.t), it.sub ? h('div.tiny.muted.ellipsis', it.sub) : null)));
    });
  };
  q.addEventListener('input', debounce(run, 80));
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    if (e.key === 'Enter' && items[sel]) { m.close(); go(items[sel].path); }
  });
  run();
  setTimeout(() => q.focus(), 30);
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.me) { e.preventDefault(); palette(); }
});

function quickCreate() {
  const opts = [['Pedido', 'truck', 'pedidos/nuevo', 'pedidos.crear'], ['Tarea', 'tasks', 'tareas/nueva', 'tareas.crear'], ['Producto', 'cube', 'productos/nuevo', 'productos.editar'], ['Cliente', 'user', 'clientes/nuevo', 'clientes.editar'], ['Foto o vídeo', 'camera', 'archivos/subir', 'archivos.subir'], ['Idea para redes', 'calendar', 'redes/nueva', 'redes.preparar'], ['Noticia', 'news', 'noticias/nueva', 'noticias.publicar']].filter(x => can(x[3]));
  const m = modal('Crear', h('div.grid.g2', opts.map(o => h('button.kpi', { onclick: () => { m.close(); go(o[2]); } }, icon(o[1]), h('span.bold', o[0])))), null, { size: 'narrow' });
}

// ---------- Bloqueo por inactividad ----------
let lastAct = Date.now(), locked = false;
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
setInterval(() => {
  if (!S.me || locked || !S.cfg) return;
  const mins = Number(S.cfg.seguridad.bloqueoMin) || 0;
  if (!mins) return; // por defecto no se bloquea: la sesión queda abierta en tu dispositivo
  if (Date.now() - lastAct > mins * 60000) lockScreen();
}, 20000);
function lockScreen() {
  locked = true;
  const p = inp({ type: 'password', placeholder: 'Tu contraseña', autocomplete: 'current-password' });
  const msg = h('p.bad-t');
  const go2 = async () => {
    try { await unlock(p.value); locked = false; o.remove(); lastAct = Date.now(); }
    catch (e) { msg.textContent = e.message; p.value = ''; p.focus(); }
  };
  p.addEventListener('keydown', e => { if (e.key === 'Enter') go2(); });
  const o = h('div.overlay', { style: { background: 'var(--bg)', zIndex: 300 } }, h('div.card.auth-card.col', { style: { padding: '28px' } },
    h('div.row', avatar(S.me, 'l'), h('div', h('h2', 'Pantalla bloqueada'), h('p.muted', S.me.nombre + ' · por inactividad'))),
    field('Contraseña', p), msg, btn('Desbloquear', go2, { cls: 'primary' }),
    btn('Cambiar de usuario', async () => { o.remove(); locked = false; await logout(); start(); }, { cls: 'ghost' })));
  document.body.appendChild(o);
  setTimeout(() => p.focus(), 50);
}

// ---------- Tema ----------
export function applyTheme(t) {
  const theme = t || (S.me && S.me.tema) || localStorage.getItem('cd.theme') || 'claro';
  const real = theme === 'sistema' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro') : theme;
  document.documentElement.dataset.theme = real;
  localStorage.setItem('cd.theme', theme);
}

// ---------- Arranque ----------
let unsub = null;
export async function start() {
  applyTheme();
  await loadLocal();
  onAuthLostHandler(msg => { toast(msg || 'Vuelve a entrar', 'warn'); shell = null; start(); });
  if (!S.server) return renderConnect(app, start);
  if (!S.token || !S.me) {
    let st = null;
    try { st = await api('sys.estado', {}, { token: '' }); } catch (e) { st = null; }
    if (st && !st.instalado) return renderSetup(app, start);
    return renderLogin(app, start, st);
  }
  applyTheme();
  buildShell();
  if (!unsub) unsub = on(debounce(() => { refreshShell(); if (current.view && current.view.update) current.view.update(); }, 60));
  route();
  window.__appStarted = true;
  if (!start._watch) { start._watch = true; import('./views/notificaciones.js').then(m => m.watchNotifications()).catch(() => { }); }
  startAutoSync();
  pull().then(() => { startChat(); startWorker(); });
  api('roles.lista', {}).then(r => { S._roles = r.roles; refreshShell(); }).catch(() => { });
  if (desktop.on) desktopDaily();
}
// En el PC: copia local diaria de todos los datos (por si Google fallara algún día)
async function desktopDaily() {
  try {
    const last = await kv.get('localBackup');
    const today = CL.today();
    if (last === today || !can('datos.exportar')) return;
    const data = await api('copias.exportar', {});
    await desktop.backup(data);
    await kv.set('localBackup', today);
  } catch (e) { console.warn('copia local', e); }
}

start();
