// ================= Arranque, navegación y estructura =================
import { h, mount, clear, icon, btn, modal, toast, avatar, ago, debounce, field, inp, area, confirmDlg, setAvatarSource } from './ui.js';
import { S, on, onStatus, emit, api, pull, loadLocal, startAutoSync, logout, can, onAuthLostHandler, unreadCount, dash, mutate, onQueueFailure, kv, unlock, APP_VERSION, flush, setServer, switchWs, wsInfo, pwPendientes } from './store.js';
import { botonActualizar, dialogoActualizar } from './actualizar.js'; // v16.3.2: botón fijo «Buscar actualización»
import { aplicarUI, instalarEfectos, entrada, debeInaugurar, inauguracion, uiNueva } from './ui14.js'; // v14.0: interfaz nueva + inauguración
import { desktop } from './desktop.js';
import { botonRegalo, abrirRegalo } from './sorpresa.js'; // v16.1 🎁
import { BAMBU } from './bambu.js';
import { menuNav, editarMenu } from './menuorden.js';
import { renderSetup, renderLogin, renderConnect, renderInvite } from './views/setup.js';
import { roleLabel } from './roles.js';
import { startChat, CHAT } from './chat.js';
import { startWorker, warmUp } from './ai/engine.js';

const CL = window.CL;
const VIEWS = {
  inicio: () => import('./views/home.js'),
  hoy: () => import('./views/hoy.js'),
  tv: () => import('./views/tv.js'), // v12.3: pantalla TV del taller (v13.10: fuera del menú; sigue en #/tv)
  estudio: () => import('./views/estudio.js'), // v13.10: 📸 Estudio de fotos
  reels: () => import('./views/reels.js'), // v15.3: 🎬 Reels con Remotion (el vídeo lo hace el PC)
  mitienda: () => import('./views/mitienda.js'), // v13.10: acceso directo para difundir la tienda web
  rapidas: () => import('./views/rapidas.js'), // v13.10: respuestas rápidas (manual del equipo)
  pedidos: () => import('./views/pedidos.js'),
  clientes: () => import('./views/clientes.js'),
  descanso: () => import('./views/descanso.js'), // v13.3: juego para los ratos de descanso
  estanteria: () => import('./views/estanteria.js'), // v13: la tienda web como un mundo virtual (sustituye al Universo)
  productos: () => import('./views/productos.js'),
  catalogo: () => import('./views/catalogo.js'),
  gastos: () => import('./views/gastos.js'),
  ingresos: () => import('./views/ingresos.js'), // v16: lo cobrado, mes a mes
  inventario: () => import('./views/inventario.js'), // v16: materiales, filamento por color, compra rápida y avisos
  costes: () => import('./views/costes.js'),
  embalaje: () => import('./views/embalaje.js'),
  escanear: () => import('./views/escanear.js'),
  tienda: () => import('./views/tienda.js'), // v12: Tienda web (sustituye a THE NOORKO)
  cotizador: () => import('./views/cotizador.js'), // v16.2: STL / 3MF → coste y precio al momento
  camaras: () => import('./views/camaras.js'), // v11.7: cámaras de las Bambu Lab (en el PC) // v11.6: escanear el QR del paquete y empaquetar
  anuncios: () => import('./views/anuncios.js'),
  taller: () => import('./views/taller.js'),
  stock: () => import('./views/stock.js'),
  presupuestos: () => import('./views/presupuestos.js'),
  facturas: () => import('./views/facturas.js'),
  tareas: () => import('./views/tareas.js'),
  noticias: () => import('./views/noticias.js'),
  redes: () => import('./views/redes.js'),
  instagram: () => import('./views/instagram.js'), // v15.3: 📸 Instagram Studio VIP (API oficial de Meta)
  centroia: () => import('./views/centroia.js'), // v15.3: 🧠 Centro de IA (semáforo, biblioteca, prompts, descargas)
  archivos: () => import('./views/archivos.js'),
  ia: () => import('./views/ia.js'),
  nova: () => Promise.resolve({ render: () => { location.hash = '#/ia/operar'; return {}; } }), // v11.5: CelebryNova vive dentro de Celeby Nova
  chat: () => import('./views/chat.js'),
  estado: () => import('./views/estado.js'),
  informes: () => import('./views/informes.js'),
  notificaciones: () => import('./views/notificaciones.js'),
  pedidosweb: () => import('./views/pedidosweb.js'),
  bandeja: () => import('./views/bandeja.js'), // v14.1: correos de todas las cuentas de Vinted, Wallapop…
  config: () => import('./views/config.js')
};
// v16: el menú va por GRUPOS que se pliegan (menos desorden, más lógica). Cada apartado es el mismo de siempre.
export const NAV = [
  // v16.2: grupos pedidos por la dueña: Pedidos · Productos · Producción · Embalaje y logística · Ventas y web · Marketing · Equipo
  { k: 'inicio', t: 'Inicio', i: 'home' },
  { k: 'hoy', t: 'Hoy en el taller', i: 'play', p: 'pedidos.ver' },
  { sep: true, t: 'Pedidos' },
  { k: 'pedidos', t: 'Pedidos', i: 'truck', p: 'pedidos.ver' },
  { k: 'pedidosweb', t: 'Pedidos web', i: 'store', p: 'pedidos.ver' }, // v13.7: solicitudes de la tienda web (con contador de pendientes),
  { k: 'bandeja', t: 'Bandeja de ventas 📬', i: 'bell', p: 'pedidos.ver' }, // v14.1: correos de todas las cuentas,
  { k: 'clientes', t: 'Clientes', i: 'users', p: 'clientes.ver' },
  { sep: true, t: 'Productos' },
  { k: 'productos', t: 'Productos', i: 'cube', p: 'productos.ver' },
  { k: 'catalogo', t: 'Catálogo', i: 'store', p: 'productos.ver' },
  { k: 'stock', t: 'Stock', i: 'box', p: 'productos.ver' },
  { sep: true, t: 'Producción' },
  { k: 'taller', t: 'Impresión', i: 'printer', p: 'taller.ver' }, // v11.5: 3D + etiquetas y papel en un solo sitio,
  { k: 'cotizador', t: 'Cotizador 3D ⚡', i: 'cube', p: 'productos.ver' }, // v16.2: en lugar de «Cámaras» (no se usaba; sigue existiendo en #/camaras)
  { k: 'costes', t: 'Materiales y costes', i: 'euro', p: 'productos.costes' },
  { sep: true, t: 'Embalaje y logística' },
  { k: 'embalaje', t: 'Embalaje', i: 'box', p: 'pedidos.ver' }, // v11.4: centro de embalaje,
  { k: 'inventario', t: 'Inventario y compras', i: 'box', p: 'productos.ver' }, // v16,
  { k: 'escanear', t: 'Escanear paquete', i: 'qr', p: 'pedidos.ver' }, // v11.6: QR del paquete (móvil, cámara o lector),
  { sep: true, t: 'Ventas y web' },
  { k: 'tienda', t: 'Tienda web', i: 'store', p: 'tienda.gestionar' }, // v12 // v11.7: P1P y A1 mini en directo (programa del PC),
  { k: 'mitienda', t: 'Mi tienda 🛍️', i: 'store', p: 'productos.ver' }, // v13.10: abrir, copiar, compartir y QR de la tienda web,
  { k: 'estanteria', t: 'Estantería 🏬', i: 'store', p: 'productos.ver' }, // v13,
  { k: 'ingresos', t: 'Ingresos 💶', i: 'euro', p: 'productos.costes' }, // v16,
  { k: 'presupuestos', t: 'Presupuestos', i: 'file', p: 'presupuestos.gestionar' },
  { k: 'facturas', t: 'Facturas', i: 'archive', p: 'facturas.emitir' },
  { k: 'informes', t: 'Informes', i: 'chart', p: 'informes.ver' },
  { sep: true, t: 'Marketing' },
  { k: 'reels', t: 'Reels 🎬', i: 'play', p: 'productos.ver' }, // v15.3: vídeos para Instagram/TikTok,
  { k: 'instagram', t: 'Instagram Studio 📸', i: 'camera', p: 'redes.ver' }, // v15.3,
  { k: 'redes', t: 'Redes sociales', i: 'calendar', p: 'redes.ver' },
  { k: 'estudio', t: 'Biouvision 📸', i: 'camera', p: 'productos.ver' }, // v13.10: en lugar de la Pantalla TV · v13.12: editor «Biouvision»,
  { k: 'anuncios', t: 'Anuncios con IA', i: 'sparkles', p: 'productos.ver' },
  { k: 'rapidas', t: 'Respuestas rápidas 💬', i: 'msg' }, // v13.10: manual para contestar a los clientes,
  { sep: true, t: 'Equipo' },
  { k: 'chat', t: 'Chat', i: 'msg', p: 'chat.usar' },
  { k: 'tareas', t: 'Tareas', i: 'tasks', p: 'tareas.ver' },
  { k: 'noticias', t: 'Noticias', i: 'news', p: 'noticias.ver' },
  { k: 'archivos', t: 'Archivos', i: 'folder', p: 'archivos.ver' },
  { k: 'ia', t: 'Celeby Nova', i: 'sparkles', p: 'ia.usar' },
  { k: 'centroia', t: 'Centro de IA 🧠', i: 'sparkles' }, // v15.3 // v11.5: Celebrity + CelebryNova en un solo asistente,
  { k: 'descanso', t: 'Descanso 🎮', i: 'play' }, // v13.3: juego para el rato de descanso,
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
  if (name === 'universo') return go('estanteria'); // v13: el Universo (galaxia) se sustituyó por la Estantería; los enlaces antiguos siguen funcionando
  if (name === 'q' && params[0] === 'ceb') return go('escanear/' + encodeURIComponent(params[1] || '')); // v11.6: QR del paquete
  if (name === 'q' && params[0] === 'mesa') return go({ escanear: 'escanear/camara', empaquetar: 'embalaje', hoy: 'hoy' }[params[1]] || 'inicio'); // v12.2: QR de la mesa de trabajo
  if (name === 'q' && params[0] === 'prueba') { toast('✅ Este QR se ha leído bien: puntos de ' + (params[1] || '?') + ' px. Anota el más pequeño que te funcione.', 'ok', 9000); return go('inicio'); } // v12.10: hoja «Prueba de QR»
  if (name === 'q') { const T = { pedido: 'pedidos', producto: 'productos', cliente: 'clientes', factura: 'facturas', stock: 'stock', caja: 'stock', presupuesto: 'presupuestos' }; const t = T[params[0]]; return go(t ? t + '/' + encodeURIComponent(params[1] || '') : 'inicio'); }
  const def = NAV.find(n => n.k === name);
  if (!VIEWS[name]) return go('inicio');
  buildShell();
  navActual = name; refreshShell(); // v16: si su grupo está plegado, el apartado abierto se enseña igualmente (y su grupo se abre)
  markNav(name);
  if (current.name === name && current.view && current.view.params) { current.view.params(params); return; }
  // v16.2 · ESTABILIDAD: si ya estás en esta misma pantalla (misma dirección) y has escrito o tocado algo en ella en el último
  // cuarto de hora, NO se vacía ni se vuelve a montar (Tienda web perdía lo escrito en las promociones cuando algo la recargaba).
  if (current.name === name && current.view && JSON.stringify(current.params || []) === JSON.stringify(params || []) && trabajandoAqui()) return;
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
    entrada(content); // v14.0: el contenido entra suave
    if (!route._calor) { route._calor = true; setTimeout(precalentar, 2500); } // v16.1
    if (!route._inau && debeInaugurar()) { route._inau = true; setTimeout(() => { if (S.me && !document.querySelector('.modal, .lockbox-full')) inauguracion({ ir: go }); }, 700); }
  } catch (e) {
    console.error(e);
    mount(content, h('div.card', h('h3', 'No se pudo abrir esta sección'), h('p.muted', String(e.message || e)), btn('Reintentar', () => location.reload(), { cls: 'primary' })));
  }
}
window.addEventListener('hashchange', route);
// v16.1 · VELOCIDAD: las pantallas que más se usan se cargan en los ratos libres; el primer clic en cada una ya no espera.
function precalentar() {
  const lista = ['hoy', 'pedidos', 'productos', 'inventario', 'embalaje', 'ingresos', 'clientes', 'stock', 'costes'].filter(k => VIEWS[k]);
  const libre = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));
  const sig = () => { const k = lista.shift(); if (!k || document.hidden) return; VIEWS[k]().catch(() => { }).then(() => libre(sig)); };
  libre(sig);
}

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
    h('button.acct-ui', { onclick: () => { m.remove(); const n = aplicarUI(!uiNueva()); toast(n ? '✨ Interfaz nueva' : '🗂️ Interfaz clásica', 'ok', 2500); } }, icon('sparkles', 's'), uiNueva() ? 'Volver a la interfaz clásica' : 'Usar la interfaz nueva 14.0'),
    h('button.danger', { onclick: async () => { m.remove(); await logout(); start(); } }, icon('logout', 's'), 'Cerrar sesión'));
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('click', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
}

// ---------- v10.5: espacios de trabajo (motor genérico; v12: THE NOORKO retirado → solo queda el Negocio principal) ----------
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
  const sidebar = h('aside.sidebar', { 'aria-label': 'Menú' }, h('div.brand', h('div.logo', h('img.brand-logo', { src: (S.cfg && S.cfg.empresa && S.cfg.empresa.logo) || 'icons/icon-192.png', alt: '' })), h('div.grow', h('b.ellipsis', (S.cfg && S.cfg.empresa.nombre) || 'CelebriDiseños'), h('small', 'Gestión del negocio')), pinB, closeB), h('div.ws-box'), nav, botonActualizar(), h('div.me', { onclick: () => go('config/perfil') }));
  const scrim = h('div.scrim', { onclick: () => closeNav() });
  const syncEl = h('button.sync', { title: 'Estado de la sincronización', onclick: () => syncPanel() });
  const bell = h('button.btn.ghost.icon.icon-btn', { title: 'Notificaciones', onclick: () => go('notificaciones') }, icon('bell'));
  const actB = h('button.btn.ghost.icon.icon-btn.act-top', { title: 'Buscar actualización · v' + APP_VERSION, 'aria-label': 'Buscar actualización', onclick: () => dialogoActualizar() }, '🔄'); // v16.3.3: fijo y a la vista
  const chatB = can('chat.usar') ? h('button.btn.ghost.icon.icon-btn.chat-btn', { title: 'Chat del equipo', 'aria-label': 'Chat', onclick: () => go('chat') }, icon('msg')) : h('span');
  const meDot = h('span.st-dot.on');
  const meBtn = h('button.me-chip', { title: 'Tu cuenta', 'aria-label': 'Tu cuenta', onclick: e => accountMenu(e.currentTarget) });
  const quick = h('nav.quickbar', { 'aria-label': 'Acceso rápido' }); // v11.5: lo que más se usa, a un clic desde cualquier pantalla
  const topbar = h('header.topbar',
    h('button.btn.ghost.icon.menu-btn', { onclick: () => toggleNav(), title: 'Menú', 'aria-label': 'Abrir menú' }, icon('menu')),
    h('button.search-btn', { onclick: () => palette() }, icon('search', 's'), h('span.ellipsis', 'Buscar pedidos, clientes, seguimiento…'), h('kbd', 'Ctrl K')),
    quick,
    h('div.right.row', syncEl, actB, botonRegalo(), chatB, bell, meBtn));
  const banner = h('div');
  const content = h('main.content', { id: 'main' });
  const tabbar = h('nav.tabbar', { 'aria-label': 'Secciones principales' });
  const fab = h('button.fab', { title: 'Crear', onclick: () => quickCreate() }, icon('plus', 'l'));
  const root = h('div.shell', sidebar, scrim, h('div.main', topbar, banner, content), tabbar, fab);
  mount(app, root);
  sidebar.addEventListener('click', e => { if (e.target.closest('a') && !document.body.classList.contains('nav-pinned')) closeNav(); });
  try { if (localStorage.getItem('cd.navFijo') === '1') document.body.classList.add('nav-pinned'); } catch (e) { }
  shell = { root, nav, sidebar, syncEl, bell, chatB, banner, content, tabbar, meBtn, meDot, quick };
  refreshShell();
}
function markNav(name) { if (!shell) return; shell.nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.k === name)); if (shell.quick) shell.quick.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.k === name)); shell.tabbar.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.k === name)); }

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

// ================= v13.10 · LA PANTALLA NO SE MUEVE AL SINCRONIZAR =================
// Mientras escribes en un campo (ficha de un pedido, formulario…) los datos nuevos que llegan del servidor NO repintan la
// pantalla: se guardan y se aplican en cuanto sales del campo, sin perder lo escrito. Al repintar se conserva el scroll.
const EDITABLE = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]):not([type=range]):not([type=search]), textarea, select, [contenteditable="true"], [contenteditable=""]';
// «A medias» = has escrito en un campo y aún no lo has confirmado (Enter, salir del campo o elegir en la lista).
let aMedias = null, vistaPendiente = false;
document.addEventListener('input', e => { const t = e.target; if (t && t.matches && t.matches(EDITABLE) && t.type !== 'number' || (t && t.tagName === 'TEXTAREA')) aMedias = t; }, true);
document.addEventListener('change', e => { if (e.target === aMedias) aMedias = null; }, true);
// v14.0: Enviar con Intro (comentario, chat…) también confirma lo escrito: la pantalla se actualiza al momento
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === aMedias && e.target.tagName === 'INPUT') setTimeout(() => { if (aMedias === e.target) aMedias = null; if (vistaPendiente && !editandoAhora()) repintarVista(); }, 0); }, true);
// v16: con el foco puesto en un campo de la pantalla (aunque esté vacío, o sea un desplegable o una fecha) tampoco se
// repinta debajo del dedo. Si pasan 20 s sin tocar nada, se deja de esperar. Los buscadores no cuentan (filtran en vivo).
// Solo cuenta el campo que has tocado TÚ (con el dedo, el ratón o el teclado): si el programa pone el cursor en un campo
// por su cuenta (p. ej. al abrir una noticia), la pantalla se sigue actualizando con normalidad.
let ultimoToque = 0, campoTocado = null;
['input', 'change', 'keydown', 'pointerdown'].forEach(ev => document.addEventListener(ev, e => { const t = e.target; if (t && t.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.closest('.content, .drawer')) { ultimoToque = Date.now(); campoTocado = t; } }, true));
// ¿Has tocado un campo de ESTA pantalla hace poco y sigue ahí? (para no rehacerla y perder lo escrito)
function trabajandoAqui() { return !!(campoTocado && campoTocado.isConnected && campoTocado.closest('.content') && Date.now() - ultimoToque < 15 * 60000); }
function enUnCampo() {
  const a = document.activeElement;
  return !!(a && a === campoTocado && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !/^(search|checkbox|radio|button|submit|file)$/.test(a.type || '') && a.closest('.content, .drawer') && !a.closest('.topbar, .quickbar, .inp-icon, .palette') && Date.now() - ultimoToque < 20000);
}
export function editandoAhora() {
  const a = document.activeElement;
  if (enUnCampo()) return true;
  return !!(aMedias && a === aMedias && aMedias.isConnected && String(aMedias.value || aMedias.textContent || '').trim() !== '' && a.closest('.drawer, .content, .modal') && !a.closest('.topbar, .quickbar, .inp-icon, .palette'));
}
function repintarVista() {
  if (!current.view || !current.view.update) return;
  if (editandoAhora() && !current.view.guardaLoEscrito) { vistaPendiente = true; return; } // las vistas que ya conservan lo escrito se actualizan al momento
  vistaPendiente = false;
  const se = document.scrollingElement, y = se ? se.scrollTop : 0;
  const cajas = [...document.querySelectorAll('.drawer, .drawer .drawer-b, .content .scroll, .modal-b')].map(el => [el, el.scrollTop]);
  const abiertos = [...document.querySelectorAll('.content details[open] > summary')].map(x => x.textContent); // v16: lo que tenías desplegado sigue desplegado
  current.view.update();
  if (abiertos.length) document.querySelectorAll('.content details:not([open]) > summary').forEach(x => { if (abiertos.includes(x.textContent)) x.parentElement.open = true; });
  if (se && se.scrollTop !== y) se.scrollTop = y;
  cajas.forEach(([el, t]) => { if (el.isConnected && el.scrollTop !== t) el.scrollTop = t; });
}
document.addEventListener('focusout', () => setTimeout(() => { if (vistaPendiente && !editandoAhora()) repintarVista(); }, 350), true);
setInterval(() => { if (vistaPendiente && !editandoAhora()) repintarVista(); }, 2000);

// v16: grupos del menú plegados (se recuerda en cada aparato)
let navActual = '';
// v16.3.3 · SUBMENÚS DE VERDAD: cada grupo viene PLEGADO y se abre al tocarlo (el del apartado en el que estás, siempre abierto).
// Se recuerda en cada aparato qué grupos tienes abiertos. «*» = todos abiertos (botón «Abrir todo»).
const navGrupos = () => NAV.filter(n => n.sep && n.t).map(n => n.t);
function navAbiertos() { let l = []; try { l = JSON.parse(localStorage.getItem('cd.nav.abiertos') || '[]'); } catch (e) { } return new Set(l.includes('*') ? navGrupos() : l); }
function navGuardar(set) { try { localStorage.setItem('cd.nav.abiertos', JSON.stringify(set.size >= navGrupos().length ? ['*'] : [...set])); } catch (e) { } refreshShell(); markNav(navActual || current.name); }
function navCerrados() { const a = navAbiertos(); return new Set(navGrupos().filter(g => !a.has(g))); }
function navPlegar(g) { const a = navAbiertos(); if (a.has(g)) a.delete(g); else a.add(g); navGuardar(a); }
function navTodo() { navGuardar(navAbiertos().size >= navGrupos().length ? new Set() : new Set(navGrupos())); }
function refreshShell() {
  if (!shell) return;
  const d = S.cfg ? dash() : null;
  const counts = d ? { pedidos: d.pedidos.urgentes.length, tareas: d.tareas.mias, chat: S.chatUnread || 0, ia: S.novaPend || 0, pedidosweb: can('pedidos.ver') ? pwPendientes() : 0, bandeja: can('pedidos.ver') ? (S.t.correosPlat || []).filter(r => r.estado !== 'hecho').length : 0 } : {};
  // v11: solo se redibuja el menú si ha cambiado algo (antes se rehacía en cada sincronización y parpadeaba)
  const navSig = JSON.stringify([counts, S.perms, S.ws, S.cfg && S.cfg.menu, [...navCerrados()], navActual || current.name]);
  const visible = n => (!n.p || can(n.p)) && (!n.d || desktop.on);
  if (shell.navSig !== navSig) { shell.navSig = navSig;
  // v13.10: el administrador ordena y oculta los apartados del menú a su gusto (para todo el equipo)
  const lista = menuNav(NAV).filter(n => n.sep || visible(n)).filter((n, i, a) => !(n.sep && (!a[i + 1] || a[i + 1].sep)));
  // v16: grupos plegables. Un grupo cerrado enseña la suma de sus avisos; el apartado en el que estás nunca se esconde.
  const cerr = navCerrados(); let grupo = '';
  const sumas = {}; lista.forEach(n => { if (n.sep) grupo = n.t || ''; else if (grupo && counts[n.k]) sumas[grupo] = (sumas[grupo] || 0) + counts[n.k]; }); grupo = '';
  mount(shell.nav, lista.map(n => {
    if (n.sep) { grupo = n.t || ''; const c = grupo && cerr.has(grupo);
      return [h('div.sep'), n.t ? h('button.grp.grp-b' + (c ? '.cerrado' : ''), { type: 'button', 'aria-expanded': c ? 'false' : 'true', title: c ? 'Abrir ' + n.t : 'Plegar ' + n.t, onclick: e => { e.stopPropagation(); navPlegar(n.t); } }, h('span.grow', n.t), c && sumas[n.t] ? h('span.count', String(sumas[n.t])) : null, h('span.fl', c ? '▸' : '▾')) : null]; }
    if (grupo && cerr.has(grupo) && n.k !== (navActual || current.name)) return null;
    return h('a', { href: '#/' + n.k, dataset: { k: n.k } }, icon(n.i), h('span', n.t), counts[n.k] ? h('span.count' + (n.k === 'tareas' ? '.soft' : ''), String(counts[n.k])) : null); }),
    can('config.editar') ? h('button.nav-orden', { type: 'button', title: 'Cambiar el orden del menú u ocultar apartados', onclick: e => { e.stopPropagation(); closeNav(); editarMenu(NAV, visible, refreshShell); } }, '↕️ Ordenar el menú') : null,
    h('button.nav-todo', { type: 'button', title: 'Abrir o plegar todos los grupos del menú', onclick: e => { e.stopPropagation(); navTodo(); } }, navCerrados().size ? '▾ Abrir todo' : '▸ Plegar todo')); }
  const tabs = [{ k: 'inicio', t: 'Inicio', i: 'home' }, { k: 'pedidos', t: 'Pedidos', i: 'truck', p: 'pedidos.ver' }, { k: 'escanear', t: 'Escanear', i: 'qr', p: 'pedidos.ver' }, { k: 'hoy', t: 'Hoy', i: 'play', p: 'pedidos.ver' }, { k: 'chat', t: 'Chat', i: 'msg', p: 'chat.usar' }, { k: 'ia', t: 'IA', i: 'sparkles', p: 'ia.usar' }, { k: 'tareas', t: 'Tareas', i: 'tasks', p: 'tareas.ver' }, { k: 'clientes', t: 'Clientes', i: 'users', p: 'clientes.ver' }]
    .filter(n => !n.p || can(n.p)).slice(0, 5);
  if (shell.tabSig !== navSig) { shell.tabSig = navSig; mount(shell.tabbar, tabs.map(n => h('a', { href: '#/' + n.k, dataset: { k: n.k } }, icon(n.i), n.t, counts[n.k] ? h('span.count', String(counts[n.k])) : null))); }
  // v11.5: barra de acceso rápido · v11.7: «Cámaras» solo en el PC y si hay Bambu Lab vinculadas (nunca botones vacíos)
  const emq = S.cfg ? (S.t.pedidos || []).filter(o => CL.phaseOf(S.cfg.pedidos, o.estado) === 'empaquetar').length : 0;
  const QB = [['pedidos', 'Pedidos', 'truck', 'pedidos.ver'], ['embalaje', 'Empaquetar', 'box', 'pedidos.ver', emq], ['escanear', 'Escanear', 'qr', 'pedidos.ver'], ['taller', 'Impresión', 'printer', 'taller.ver'], desktop.on && BAMBU.list.length ? ['camaras', 'Cámaras', 'camera', 'taller.ver'] : null, ['anuncios', 'Publicar', 'sparkles', 'productos.ver'], S.cfg && S.cfg.tienda && S.cfg.tienda.url ? ['mitienda', 'Mi tienda', 'store', 'productos.ver'] : null, ['stock', 'Stock', 'cube', 'productos.ver'], ['ia', 'Celeby Nova', 'sparkles', 'ia.usar']].filter(x => x && can(x[3]));
  const qSig = JSON.stringify([QB.map(x => x[0]), emq]);
  if (shell.quick && shell.qSig !== qSig) { shell.qSig = qSig; mount(shell.quick, QB.map(x => h('a', { href: '#/' + x[0], dataset: { k: x[0] }, title: x[1] }, icon(x[2], 's'), h('span.t', x[1]), x[4] ? h('span.count', String(x[4])) : null))); }
  markNav(parseHash().name);
  const me = shell.sidebar.querySelector('.me');
  const meSig = S.me ? JSON.stringify([S.me.nombre, S.me.rol, S.me.avatarId, S.online]) : '';
  if (S.me && shell.meSig !== meSig) { shell.meSig = meSig;
  mount(me, avatar(S.me), h('div.grow', h('div.bold.ellipsis', S.me.nombre), h('div.tiny.muted', roleName(S.me.rol))), icon('settings', 's'));
  // v10: quién está conectado, arriba y siempre a la vista
  mount(shell.meBtn, h('span.av-wrap', avatar(S.me, 's'), shell.meDot), h('span.me-txt', h('b.ellipsis', S.me.nombre.split(' ')[0]), h('small', S.online ? 'Conectado' : 'Sin conexión'))); }
  const brand = shell.sidebar.querySelector('.brand b'); if (brand && S.cfg) brand.textContent = S.cfg.empresa.nombre;
  const bsm = shell.sidebar.querySelector('.brand small'); if (bsm) bsm.textContent = 'Gestión del negocio';
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

// v12.3: Ctrl+K también EJECUTA acciones (solo las que tu rol permite). Escribe «>» para ver solo acciones.
export function accionesPaleta() {
  const nav = (t, ic, path, perm, kw) => ({ t, ic, path, perm, kw: kw || '' });
  const fn = (t, ic, run, perm, kw, sub) => ({ t, ic, fn: run, perm, kw: kw || '', sub });
  const lista = [
    nav('Nuevo pedido', 'plus', 'pedidos/nuevo', 'pedidos.crear', 'crear añadir venta'),
    nav('Nuevo producto', 'plus', 'productos/nuevo', 'productos.editar', 'crear añadir'),
    nav('Nueva tarea', 'plus', 'tareas/nueva', 'tareas.crear', 'crear añadir'),
    nav('Nuevo cliente', 'plus', 'clientes/nuevo', 'clientes.editar', 'crear añadir'),
    nav('Ir a Inicio', 'home', 'inicio', '', 'panel resumen'),
    nav('Estantería: mi tienda web como un mundo virtual', 'store', 'estanteria', 'productos.ver', 'tienda virtual estanterias productos mundo escaparate 3d'),
    nav('Descanso: jugar un rato (Villa Celebri · Macedonia)', 'play', 'descanso', '', 'juego jugar descanso entretenimiento villa mundo macedonia frutas'),
    nav('Ir a Hoy en el taller', 'play', 'hoy', 'pedidos.ver', 'producción imprimir preparar enviar'),
    fn('Modo taller (botones grandes)', 'play', () => { try { localStorage.setItem('cd.operario', '1'); } catch (e) { } document.body.classList.add('operario'); go('hoy'); }, 'pedidos.ver', 'operario tablet'),
    nav('Biouvision (editor de fotos)', 'camera', 'estudio', 'productos.ver', 'foto editar retocar mejorar imagen estudio cara piel filtros fondo'),
    fn('Biouvision: restaurar fotos antiguas hasta 4K (app propia)', 'sparkles', () => import('./views/estudio.js').then(m => m.abrirBiouvision('#/restaurar')), '', 'foto antigua vieja restaurar reparar arañazos 4k ampliar color abuela 1890 biouvision'),
    fn('Biouvision: quitar el fondo de una foto (app propia)', 'sparkles', () => import('./views/estudio.js').then(m => m.abrirBiouvision('#/fondo')), '', 'quitar fondo recortar transparente png biouvision birefnet'),
    nav('Reels: hacer un vídeo de un producto', 'play', 'reels', 'productos.ver', 'reel video vídeo instagram tiktok remotion animación anuncio'),
    nav('Centro de IA: ver si todo funciona (🟢🟡🔴), biblioteca, prompts y descargas', 'sparkles', 'centroia', '', 'ia diagnostico estado semaforo solucionar biblioteca medios fotos videos prompt descargar modelos remotion'),
    nav('Instagram Studio: crear, programar y ver estadísticas', 'camera', 'instagram', 'redes.ver', 'instagram publicar post carrusel historia reel programar hashtags estadisticas feed'),
    nav('Respuestas rápidas', 'msg', 'rapidas', '', 'whatsapp instagram correo contestar mensaje cliente manual plantilla'),
    nav('Escanear paquete', 'qr', 'escanear/camara', 'pedidos.ver', 'qr cámara lector empaquetar'),
    nav('Ir a Embalaje', 'box', 'embalaje', 'pedidos.ver', 'cajas paquete'),
    nav('Ir a Stock', 'box', 'stock', 'productos.ver', 'existencias inventario'),
    nav('Ir a Impresión (impresoras y etiquetas)', 'printer', 'taller', 'taller.ver', 'cola bambu filamento'),
    nav('Ir a Facturas', 'archive', 'facturas', 'facturas.emitir', ''),
    nav('Ir a Informes', 'chart', 'informes', 'informes.ver', 'ventas beneficios'),
    nav('Ir a Tienda web', 'store', 'tienda', 'tienda.gestionar', 'stripe publicar'),
    nav('Ir a Configuración', 'settings', 'config', '', 'ajustes opciones'),
    nav('Ir a Estado del sistema', 'shield', 'estado', 'config.ver', 'diagnóstico copia seguridad'),
    fn('Tarjeta de resultados para redes', 'camera', () => import('./tarjeta.js').then(m => m.abrirTarjeta()), 'pedidos.ver', 'instagram imagen compartir resumen'),
    fn('Celebrar pedidos nuevos: cartel y confeti (sí/no)', 'sparkles', () => import('./nuevopedido.js').then(m => { const v = !m.prefs().on; m.guardarPrefs({ on: v }); toast(v ? '🎉 Celebración de pedidos nuevos activada' : 'Celebración de pedidos nuevos apagada'); }), 'pedidos.ver', 'pedido nuevo confeti cartel celebrar'),
    fn('Hologramas 3D: figuras que aparecen unos segundos (sí/no)', 'sparkles', () => import('./hologramas.js').then(m => { const v = m.setHolo(!m.holoOn()); toast(v ? '✨ Hologramas activados' : 'Hologramas apagados en este aparato', 'ok'); }), '', 'holograma figuras 3d animacion efecto rendimiento'),
    fn('🎁 Mi regalo: mi taller en números', 'sparkles', () => abrirRegalo(), '', 'regalo sorpresa numeros poster taller'),
    fn('Holograma: enseñar uno ahora', 'sparkles', () => import('./hologramas.js').then(m => m.mostrar()), '', 'holograma figura 3d ver'),
    fn('Sonido al entrar un pedido nuevo (sí/no)', 'sparkles', () => import('./nuevopedido.js').then(m => { const v = !m.prefs().sonido; m.guardarPrefs({ sonido: v }); if (v) m.sonar(); toast(v ? '🔔 Sonido de pedido nuevo activado' : 'Sonido de pedido nuevo apagado'); }), 'pedidos.ver', 'pedido nuevo sonido campana'),
    fn('Voz del taller: activar o apagar', 'sparkles', () => import('./voz.js').then(m => { const v = !m.vozOn(); if (m.setVoz(v)) toast(v ? '🔊 Voz del taller activada' : '🔇 Voz del taller apagada'); }), 'pedidos.ver', 'hablar avisos sonido'),
    fn(uiNueva() ? 'Interfaz clásica (la de antes)' : 'Interfaz nueva 14.0', 'sparkles', () => { const n = aplicarUI(!uiNueva()); toast(n ? '✨ Interfaz nueva' : '🗂️ Interfaz clásica', 'ok', 2500); }, '', 'aspecto diseño antes nueva vieja'),
    fn('Ver la inauguración de la 14.0', 'sparkles', () => inauguracion({ ir: go }), '', 'estreno cinta fiesta novedades'),
    fn('Tema oscuro / claro', 'sparkles', () => { const cur = document.documentElement.dataset.theme; applyTheme(cur === 'oscuro' ? 'claro' : 'oscuro'); }, '', 'modo noche día apariencia'),
    fn('Bloquear la pantalla', 'shield', () => lockScreen(), '', 'seguridad candado'),
    fn('Cerrar sesión', 'logout', async () => { await logout(); start(); }, '', 'salir')
  ];
  return lista.filter(a => !a.perm || can(a.perm));
}
// ---------- Buscador global (Ctrl+K) ----------
export function palette(initial) {
  const q = h('input.inp', { placeholder: 'Busca un pedido, cliente, producto… o escribe > para acciones (tarjeta para redes, pantalla TV, voz…)', value: initial || '', 'aria-label': 'Buscar' });
  const res = h('div.res');
  let items = [], sel = 0;
  const m = modal('Buscar', h('div', q, res), null, { size: 'palette' });
  m.el.classList.add('palette'); m.el.parentElement.classList.add('palette-o');
  m.el.querySelector('.modal-h').remove();
  m.el.querySelector('.modal-b').style.padding = '0';
  const run = () => {
    const s = q.value.trim().replace(/^#/, '');
    items = [];
    const todas = accionesPaleta(), modoAcc = q.value.trim().startsWith('>');
    const ac = (a, grp) => ({ grp, ic: a.ic, t: a.t, sub: a.sub || '', path: a.path, fn: a.fn });
    if (modoAcc) {
      const t = q.value.trim().slice(1).trim();
      todas.filter(a => !t || CL.matches(a.t + ' ' + a.kw, t)).slice(0, t ? 30 : 100).forEach(a => items.push(ac(a, 'Acciones')));
    } else if (s.length >= 1) {
      todas.filter(a => s.length >= 2 && CL.matches(a.t + ' ' + a.kw, s)).slice(0, 4).forEach(a => items.push(ac(a, 'Acciones')));
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
      todas.slice(0, 9).forEach(a => items.push(ac(a, 'Acciones rápidas')));
      if (todas.length > 9) items.push({ grp: 'Acciones rápidas', ic: 'search', t: 'Ver todas las acciones…', sub: 'Escribe > para verlas todas', fn: () => { q.value = '>'; run(); } , keep: true });
    }
    sel = 0;
    draw();
  };
  const exec = it => { if (it.keep) return it.fn(); m.close(); if (it.fn) { try { const r = it.fn(); if (r && r.catch) r.catch(handleError); } catch (e) { handleError(e); } } else go(it.path); };
  const draw = () => {
    clear(res);
    if (!items.length) { res.appendChild(h('div.empty', h('p', q.value ? 'Nada encontrado con "' + q.value + '".' : ''))); return; }
    let last = '';
    items.forEach((it, i) => {
      if (it.grp !== last) { res.appendChild(h('div.grp-t', it.grp)); last = it.grp; }
      res.appendChild(h('div.it' + (i === sel ? '.on' : ''), { onclick: () => exec(it) }, icon(it.ic), h('div.grow', h('div.bold.ellipsis', it.t), it.sub ? h('div.tiny.muted.ellipsis', it.sub) : null)));
    });
  };
  q.addEventListener('input', debounce(run, 80));
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    if (e.key === 'Enter' && items[sel]) exec(items[sel]);
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
  if (!mins || document.body.classList.contains('tv-on')) return; // por defecto no se bloquea: la sesión queda abierta en tu dispositivo (y la pantalla TV del taller nunca se bloquea)
  if (Date.now() - lastAct > mins * 60000) lockScreen();
}, 20000);
function lockScreen() {
  if (locked) return;
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

window.__lockScreen = lockScreen; // (también lo usan las pruebas)

// ---------- Tema ----------
// v11.8: temas · normales para todo el equipo y PREMIUM para administradoras (preparado para añadir más)
export const THEMES = [
  { k: 'claro', t: '☀️ Claro' }, { k: 'rosa', t: '🌸 Rosa' }, { k: 'oscuro', t: '🌙 Oscuro' }, { k: 'sistema', t: '💻 Como Windows' },
  { k: 'adriana', t: '💎 Adriana', d: 'Rosa con identidad propia, degradados rosa → malva', premium: true },
  { k: 'bio', t: '⚡ BIO', d: 'Minimalista y tecnológico: grafito y cian', premium: true }
];
export const isAdminUser = () => !!(S.perms && S.perms.all);
export function applyTheme(t) {
  let theme = t || (S.me && S.me.tema) || localStorage.getItem('cd.theme') || 'claro';
  const def = THEMES.find(x => x.k === theme);
  if (!def || (def.premium && S.perms && !isAdminUser())) theme = 'claro';
  const real = theme === 'sistema' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro') : theme;
  document.documentElement.dataset.theme = real;
  localStorage.setItem('cd.theme', theme);
}

// ---------- Arranque ----------
let unsub = null;
export async function start() {
  applyTheme(); aplicarUI(); instalarEfectos();
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
  if (!unsub) unsub = on(debounce(() => { if (!S.me || !shell) return; /* v12.2: tras cerrar sesión no se repinta nada (daba errores) */ refreshShell(); repintarVista(); }, 60));
  route();
  window.__appStarted = true;
  if (!start._watch) { start._watch = true; import('./views/notificaciones.js').then(m => m.watchNotifications()).catch(() => { }); }
  startAutoSync();
  import('./hologramas.js').then(m => m.iniciar()).catch(() => { }); // v16
  pull().then(() => { startChat(); startWorker(); import('./popups.js').then(m => m.startPopups()); startNovaWatch(); import('./bambu.js').then(m => m.startBambuSync()); import('./autoimpresion.js').then(m => m.startAutoPrint()); import('./premium.js').then(m => m.startCelebraciones()); import('./voz.js').then(m => m.startVoz()); import('./nuevopedido.js').then(m => m.startNuevoPedido()); if (desktop.on) import('./biou/motor.js').then(() => import('./reels/render.js')).then(() => import('./trabajospc.js')).then(m => m.startTrabajadorPC()).catch(() => { }); });
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
