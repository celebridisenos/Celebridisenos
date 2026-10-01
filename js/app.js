// ================= Arranque, navegación y estructura =================
import { h, mount, clear, icon, btn, modal, toast, avatar, ago, debounce, field, inp, area, confirmDlg, setAvatarSource } from './ui.js';
import { S, on, onStatus, emit, api, pull, loadLocal, startAutoSync, logout, can, onAuthLostHandler, unreadCount, dash, mutate, onQueueFailure, kv, unlock, APP_VERSION, flush, setServer, switchWs, wsInfo } from './store.js';
import { desktop } from './desktop.js';
import { renderSetup, renderLogin, renderConnect, renderInvite } from './views/setup.js';
import { roleLabel } from './roles.js';
import { startChat, CHAT } from './chat.js';
import { startWorker, warmUp } from './ai/engine.js';

const CL = window.CL;
const VIEWS = {
  inicio: () => import('./views/home.js'),
  hoy: () => import('./views/hoy.js'),
  pedidos: () => import('./views/pedidos.js'),
  clientes: () => import('./views/clientes.js'),
  productos: () => import('./views/productos.js'),
  catalogo: () => import('./views/catalogo.js'),
  gastos: () => import('./views/gastos.js'),
  costes: () => import('./views/costes.js'),
  anuncios: () => import('./views/anuncios.js'),
  taller: () => import('./views/taller.js'),
  stock: () => import('./views/stock.js'),
  presupuestos: () => import('./views/presupuestos.js'),
  facturas: () => import('./views/facturas.js'),
  tareas: () => import('./views/tareas.js'),
  noticias: () => import('./views/noticias.js'),
  redes: () => import('./views/redes.js'),
  archivos: () => import('./views/archivos.js'),
  ia: () => import('./views/ia.js'),
  nova: () => import('./views/celebrynova.js'),
  chat: () => import('./views/chat.js'),
  estado: () => import('./views/estado.js'),
  informes: () => import('./views/informes.js'),
  notificaciones: () => import('./views/notificaciones.js'),
  config: () => import('./views/config.js')
};
export const NAV = [
  { k: 'inicio', t: 'Inicio', i: 'home' },
  { k: 'hoy', t: 'Hoy en el taller', i: 'play', p: 'pedidos.ver' },
  { k: 'pedidos', t: 'Pedidos', i: 'truck', p: 'pedidos.ver' },
  { k: 'clientes', t: 'Clientes', i: 'users', p: 'clientes.ver' },
  { k: 'productos', t: 'Productos', i: 'cube', p: 'productos.ver' },
  { k: 'catalogo', t: 'Catálogo', i: 'store', p: 'productos.ver' },
  { k: 'anuncios', t: 'Anuncios con IA', i: 'sparkles', p: 'productos.ver' },
  { k: 'costes', t: 'Materiales y costes', i: 'euro', p: 'productos.costes' },
  { k: 'gastos', t: 'Gastos', i: 'euro', p: 'productos.costes' },
  { k: 'taller', t: 'Taller 3D', i: 'cube', p: 'taller.ver' },
  { k: 'stock', t: 'Stock', i: 'box', p: 'productos.ver' },
  { k: 'presupuestos', t: 'Presupuestos', i: 'file', p: 'presupuestos.gestionar' },
  { k: 'facturas', t: 'Facturas', i: 'archive', p: 'facturas.emitir' },
  { k: 'tareas', t: 'Tareas', i: 'tasks', p: 'tareas.ver' },
  { sep: true, t: 'Equipo' },
  { k: 'chat', t: 'Chat', i: 'msg', p: 'chat.usar' },
  { k: 'noticias', t: 'Noticias', i: 'news', p: 'noticias.ver' },
  { k: 'redes', t: 'Redes sociales', i: 'calendar', p: 'redes.ver' },
  { k: 'archivos', t: 'Archivos', i: 'folder', p: 'archivos.ver' },
  { k: 'ia', t: 'Celebrity', i: 'sparkles', p: 'ia.usar' },
  { k: 'nova', t: 'CelebryNova', i: 'play', p: 'config.ver', d: true }, // v11.1: operador autónomo (solo en el PC)
  { k: 'informes', t: 'Informes', i: 'chart', p: 'informes.ver' },
  { sep: true },
  { k: 'config', t: 'Configuración', i: 'settings' },
  { k: 'estado', t: 'Estado del sistema', i: 'shield', p: 'config.ver' }
];

const app = document.getElementById('app');
setAvatarSource(id => { const a = S.t.archivos.find(x => x.id === id); return a && a.miniatura || ''; });
let current = { name: '', view: null, params: [] };
let shell = null;

// ---------- Router ----------
export function go(path) { if (location.hash !== '#/' + path) location.hash = '#/' + path; else route(); }
function parseHash() { const p = (location.hash || '#/inicio').replace(/^#\/?/, '').split('/').map(decodeURIComponent); return { name: p[0] || 'inicio', params: p.slice(1) }; }
async function route() {
  if (!S.token || !S.me) return;
  const { name, params } = parseHash();
  // v11: QR universal → #/q/<tipo>/<id> abre directamente la ficha
  if (name === 'q') { const T = { pedido: 'pedidos', producto: 'productos', cliente: 'clientes', factura: 'facturas', stock: 'stock', caja: 'stock', presupuesto: 'presupuestos' }; const t = T[params[0]]; return go(t ? t + '/' + encodeURIComponent(params[1] || '') : 'inicio'); }
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

// ---------- v10: menú lateral y cuenta ----------
function openNav() { document.body.classList.add('nav-open'); }
export function closeNav() { document.body.classList.remove('nav-open'); }
function toggleNav() {
  if (document.body.classList.contains('nav-pinned') && matchMedia('(min-width: 900px)').matches) return pinNav(false);
  document.body.classList.toggle('nav-open');
}
function pinNav(v) {
  document.body.classList.toggle('nav-pinned', v); closeNav();
  try { localStorage.setItem('cd.navFijo', v ? '1' : '0'); } catch (e) { }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) closeNav(); });
function accountMenu(anchor) {
  const old = document.querySelector('.acct-menu'); if (old) { old.remove(); return; }
  const r = anchor.getBoundingClientRect();
  const m = h('div.acct-menu', { style: { top: (r.bottom + 6) + 'px', right: Math.max(8, innerWidth - r.right) + 'px' } },
    h('div.acct-head', avatar(S.me), h('div', h('b', S.me.nombre), h('div.tiny.muted', S.me.usuario + ' · ' + roleName(S.me.rol)), h('div.tiny', h('span.st-dot.' + (S.online ? 'on' : 'off')), ' ', S.online ? 'Conectado' : 'Sin conexión'))),
    wsInfo().lista.length > 1 ? h('div.acct-ws', h('div.tiny.muted', 'Espacio de trabajo'), wsInfo().lista.map(w => h('button' + (w.id === S.ws ? '.on' : ''), { onclick: () => { m.remove(); changeWs(w.id); } }, h('span.ws-mark.' + (w.tema || 'principal')), w.nombre, w.id === S.ws ? ' ✓' : ''))) : null,
    h('button', { onclick: () => { m.remove(); go('config/perfil'); } }, icon('user', 's'), 'Mi perfil'),
    h('button', { onclick: () => { m.remove(); go('config'); } }, icon('settings', 's'), 'Configuración'),
    h('button.danger', { onclick: async () => { m.remove(); await logout(); start(); } }, icon('logout', 's'), 'Cerrar sesión'));
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('click', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
}

// ---------- v10.5: espacios de trabajo (Negocio principal / THE NOORKO) ----------
export async function changeWs(id) {
  const w = wsInfo().lista.find(x => x.id === id);
  if (!w) return;
  if (!w.listo) { toast('Este espacio aún no está preparado. Configuración → Espacios → Preparar.', 'warn', 6000); return; }
  closeNav();
  toast('Entrando en ' + w.nombre + '…');
  await switchWs(id);
  go('inicio');
}
function wsSwitch() {
  const list = wsInfo().lista;
  if (list.length < 2) return null;
  const cur = list.find(w => w.id === S.ws) || list[0];
  return h('div.ws-switch', list.map(w => h('button' + (w.id === cur.id ? '.on' : ''), { title: 'Cambiar a ' + w.nombre, dataset: { ws: w.id }, onclick: () => w.id !== S.ws && changeWs(w.id) }, h('span.ws-mark.' + (w.tema || 'principal')), h('span.ellipsis', w.nombre))));
}

// ---------- Estructura ----------
function buildShell() {
  if (shell && document.body.contains(shell.root)) return;
  const nav = h('nav.nav', { 'aria-label': 'Secciones' });
  // v10: menú tipo "cajón": se abre con ☰, se cierra con ←, al pulsar fuera, con Esc o al elegir
  // una sección. En pantallas grandes se puede FIJAR (📌) y funciona como barra lateral.
  const closeB = h('button.btn.ghost.icon.sm.nav-close', { title: 'Cerrar menú', 'aria-label': 'Cerrar menú', onclick: () => closeNav() }, icon('left', 's'));
  const pinB = h('button.btn.ghost.icon.sm.nav-pin', { title: 'Fijar el menú a la izquierda', 'aria-label': 'Fijar menú', onclick: () => pinNav(!document.body.classList.contains('nav-pinned')) }, '📌');
  const sidebar = h('aside.sidebar', { 'aria-label': 'Menú' }, h('div.brand', h('div.logo', h('img.brand-logo', { src: (S.cfg && S.cfg.empresa && S.cfg.empresa.logo) || 'icons/icon-192.png', alt: '' })), h('div.grow', h('b.ellipsis', (S.cfg && S.cfg.empresa.nombre) || 'CelebriDiseños'), h('small', 'Gestión del negocio')), pinB, closeB), h('div.ws-box'), nav, h('div.me', { onclick: () => go('config/perfil') }));
  const scrim = h('div.scrim', { onclick: () => closeNav() });
  const syncEl = h('button.sync', { title: 'Estado de la sincronización', onclick: () => syncPanel() });
  const bell = h('button.btn.ghost.icon.icon-btn', { title: 'Notificaciones', onclick: () => go('notificaciones') }, icon('bell'));
  const chatB = can('chat.usar') ? h('button.btn.ghost.icon.icon-btn.chat-btn', { title: 'Chat del equipo', 'aria-label': 'Chat', onclick: () => go('chat') }, icon('msg')) : h('span');
  const meDot = h('span.st-dot.on');
  const meBtn = h('button.me-chip', { title: 'Tu cuenta', 'aria-label': 'Tu cuenta', onclick: e => accountMenu(e.currentTarget) });
  const topbar = h('header.topbar',
    h('button.btn.ghost.icon.menu-btn', { onclick: () => toggleNav(), title: 'Menú', 'aria-label': 'Abrir menú' }, icon('menu')),
    h('button.search-btn', { onclick: () => palette() }, icon('search', 's'), h('span.ellipsis', 'Buscar pedidos, clientes, seguimiento…'), h('kbd', 'Ctrl K')),
    h('div.right.row', syncEl, chatB, bell, meBtn));
  const banner = h('div');
  const content = h('main.content', { id: 'main' });
  const tabbar = h('nav.tabbar', { 'aria-label': 'Secciones principales' });
  const fab = h('button.fab', { title: 'Crear', onclick: () => quickCreate() }, icon('plus', 'l'));
  const root = h('div.shell', sidebar, scrim, h('div.main', topbar, banner, content), tabbar, fab);
  mount(app, root);
  sidebar.addEventListener('click', e => { if (e.target.closest('a') && !document.body.classList.contains('nav-pinned')) closeNav(); });
  try { if (localStorage.getItem('cd.navFijo') === '1') document.body.classList.add('nav-pinned'); } catch (e) { }
  shell = { root, nav, sidebar, syncEl, bell, chatB, banner, content, tabbar, meBtn, meDot };
  refreshShell();
}
function markNav(name) { if (!shell) return; shell.nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.k === name)); shell.tabbar.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.k === name)); }

// v11.1: decisiones pendientes de CelebryNova en el menú (solo en el PC y para quien lo administra)
let novaTimer = null;
function startNovaWatch() {
  if (!desktop.on || novaTimer) return;
  const tick = async () => {
    if (!S.me || !can('config.ver')) return;
    try { const st = await desktop.novaApi('estado'); const n = st.preguntas || 0; if (n !== S.novaPend) { S.novaPend = n; refreshShell(); } } catch (e) { if (S.novaPend) { S.novaPend = 0; refreshShell(); } }
  };
  novaTimer = setInterval(tick, 30000);
  setTimeout(tick, 8000);
}

function refreshShell() {
  if (!shell) return;
  const d = S.cfg ? dash() : null;
  const counts = d ? { pedidos: d.pedidos.urgentes.length, tareas: d.tareas.mias, chat: S.chatUnread || 0, nova: S.novaPend || 0 } : {};
  // v11: solo se redibuja el menú si ha cambiado algo (antes se rehacía en cada sincronización y parpadeaba)
  const navSig = JSON.stringify([counts, S.perms, S.ws]);
  if (shell.navSig !== navSig) { shell.navSig = navSig;
  mount(shell.nav, NAV.filter(n => n.sep || ((!n.p || can(n.p)) && (!n.d || desktop.on))).map(n => n.sep ? [h('div.sep'), n.t ? h('div.grp', n.t) : null] :
    h('a', { href: '#/' + n.k, dataset: { k: n.k } }, icon(n.i), h('span', n.t), counts[n.k] ? h('span.count' + (n.k === 'tareas' ? '.soft' : ''), String(counts[n.k])) : null))); }
  const tabs = [{ k: 'inicio', t: 'Inicio', i: 'home' }, { k: 'hoy', t: 'Hoy', i: 'play', p: 'pedidos.ver' }, { k: 'pedidos', t: 'Pedidos', i: 'truck', p: 'pedidos.ver' }, { k: 'chat', t: 'Chat', i: 'msg', p: 'chat.usar' }, { k: 'ia', t: 'IA', i: 'sparkles', p: 'ia.usar' }, { k: 'tareas', t: 'Tareas', i: 'tasks', p: 'tareas.ver' }, { k: 'clientes', t: 'Clientes', i: 'users', p: 'clientes.ver' }]
    .filter(n => !n.p || can(n.p)).slice(0, 5);
  if (shell.tabSig !== navSig) { shell.tabSig = navSig; mount(shell.tabbar, tabs.map(n => h('a', { href: '#/' + n.k, dataset: { k: n.k } }, icon(n.i), n.t, counts[n.k] ? h('span.count', String(counts[n.k])) : null))); }
  markNav(parseHash().name);
  const me = shell.sidebar.querySelector('.me');
  const meSig = S.me ? JSON.stringify([S.me.nombre, S.me.rol, S.me.avatarId, S.online]) : '';
  if (S.me && shell.meSig !== meSig) { shell.meSig = meSig;
  mount(me, avatar(S.me), h('div.grow', h('div.bold.ellipsis', S.me.nombre), h('div.tiny.muted', roleName(S.me.rol))), icon('settings', 's'));
  // v10: quién está conectado, arriba y siempre a la vista
  mount(shell.meBtn, h('span.av-wrap', avatar(S.me, 's'), shell.meDot), h('span.me-txt', h('b.ellipsis', S.me.nombre.split(' ')[0]), h('small', S.online ? 'Conectado' : 'Sin conexión'))); }
  const noorko = S.ws === 'noorko';
  const brand = shell.sidebar.querySelector('.brand b'); if (brand && S.cfg) brand.textContent = noorko ? 'THE NOORKO' : S.cfg.empresa.nombre;
  const bsm = shell.sidebar.querySelector('.brand small'); if (bsm) bsm.textContent = noorko ? 'Streetwear · espacio propio' : 'Gestión del negocio';
  const wb = shell.sidebar.querySelector('.ws-box'); if (wb) { const k = S.ws + ':' + JSON.stringify(wsInfo().lista.map(w => w.id + w.listo)); if (wb.dataset.k !== k) { wb.dataset.k = k; mount(wb, wsSwitch()); } }
  document.documentElement.dataset.ws = S.ws;
  const lg = shell.sidebar.querySelector('.brand-logo'); if (lg && S.cfg) { const src = S.cfg.empresa.logo || 'icons/icon-192.png'; if (lg.getAttribute('src') !== src) { lg.setAttribute('src', src); const fav = document.querySelector('link[rel="icon"]'); if (fav) fav.href = S.cfg.empresa.logo || 'icons/favicon.png'; } }
  const oc = shell.chatB.querySelector && shell.chatB.querySelector('.badge-n'); if (oc) oc.remove();
  if (S.chatUnread && shell.chatB.appendChild) shell.chatB.appendChild(h('span.badge-n', S.chatUnread > 99 ? '99+' : String(S.chatUnread)));
  updateSync();
  const n = unreadCount();
  const old = shell.bell.querySelector('.badge-n'); if (old) old.remove();
  if (n) shell.bell.appendChild(h('span.badge-n', n > 99 ? '99+' : String(n)));
  refreshBanner(n);
}
// Indicador de sincronización (se actualiza solo, sin redibujar nada más)
let lastSync = '';
function updateSync() {
  if (!shell) return;
  const q = S.queue.length;
  // v10: ● Conectado · ● Reconectando… · ● Sin conexión · "Conexión restablecida" (3 s)
  const restored = S.online && S.restored && Date.now() - S.restored < 3000;
  const cls = !S.online ? (S.reconnecting ? 'recon' : 'off') : S.syncError ? 'err' : restored ? 'ok' : (S.busy || S.syncing) ? 'busy' : '';
  const txt = !S.online ? ((S.reconnecting ? 'Reconectando…' : 'Sin conexión') + (q ? ` · ${q} pendiente(s)` : ''))
    : S.syncError ? 'Error de sincronización' : restored ? 'Conexión restablecida' : q ? `Enviando ${q}…` : (S.busy || S.syncing) ? 'Sincronizando…' : 'Conectado';
  if (shell.meDot) { shell.meDot.className = 'st-dot ' + (!S.online ? 'off' : 'on'); shell.meDot.title = S.online ? 'Conectado' : 'Sin conexión'; }
  if (lastSync === cls + '|' + txt && shell.syncEl.firstChild) return;
  lastSync = cls + '|' + txt;
  shell.syncEl.className = 'sync ' + cls;
  mount(shell.syncEl, h('span.dot'), h('span.txt', txt));
}
function refreshBanner(n) {
  // Avisos generales
  const errs = Object.keys(S.errors || {});
  mount(shell.banner,
    S.cfg && S.cfg.bloqueo && S.cfg.bloqueo.activo ? h('div.banner.bad', icon('lock', 's'), h('span', '🚨 BLOQUEO DE EMERGENCIA activo desde ' + new Date(S.cfg.bloqueo.desde).toLocaleString('es-ES') + ' (' + (S.cfg.bloqueo.motivo || '') + '). Solo administradoras.'), h('a', { href: '#/config/seguridad' }, 'Ver')) : null,
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
  // v10.6: avisar al programa del PC de que la app arranca bien (confirma la actualización)
  if (desktop.on && !start._ready) { start._ready = true; desktop.ready(); desktop.anterior().then(r => { if (r && r.aviso) { toast('⚠️ ' + r.aviso, 'warn', 15000); desktop.avisoVisto(); } }).catch(() => { }); }
  onAuthLostHandler(msg => { toast(msg || 'Vuelve a entrar', 'warn'); shell = null; start(); });
  // Enlace de invitación (móvil): ?s=servidor&inv=CD-XXXX-XXXX
  const qs = new URLSearchParams(location.search), invCode = qs.get('inv');
  if (invCode && (!S.token || !S.me)) {
    if (qs.get('s') && qs.get('s') !== S.server) await setServer(qs.get('s'));
    if (S.server) return renderInvite(app, () => { history.replaceState(null, '', location.pathname + location.hash); start(); }, { codigo: invCode, auto: true });
  }
  if (!S.server) return renderConnect(app, start);
  if (!S.token || !S.me) {
    let st = null;
    try { st = await api('sys.estado', {}, { token: '' }); } catch (e) { st = null; }
    if (st && !st.instalado) return renderSetup(app, start);
    return renderLogin(app, start, st);
  }
  applyTheme();
  buildShell();
  onStatus(() => updateSync());
  if (!unsub) unsub = on(debounce(() => { refreshShell(); if (current.view && current.view.update) current.view.update(); }, 60));
  route();
  window.__appStarted = true;
  if (!start._watch) { start._watch = true; import('./views/notificaciones.js').then(m => m.watchNotifications()).catch(() => { }); }
  startAutoSync();
  pull().then(() => { startChat(); startWorker(); import('./popups.js').then(m => m.startPopups()); startNovaWatch(); import('./bambu.js').then(m => m.startBambuSync()); });
  api('roles.lista', {}).then(r => { S._roles = r.roles; refreshShell(); }).catch(() => { });
  if (desktop.on) { desktopDaily(); setTimeout(warmUp, 6000); }
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
