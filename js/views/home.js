// ================= Inicio: ¿qué pasa hoy y qué necesita mi atención? =================
import { h, mount, icon, btn, modal, eur, fdate, ago, avatar, sw, pill } from '../ui.js';
import { S, can, dash, unreadCount, byId, timing } from '../store.js';
import { go } from '../app.js';

const MODS = [
  { k: 'produccion', t: 'Producción', p: 'pedidos.ver' },
  { k: 'hoy', t: 'Agenda de hoy' },
  { k: 'ventas', t: 'Ventas', p: 'informes.ver' },
  { k: 'clientes', t: 'Clientes para seguimiento', p: 'clientes.ver' },
  { k: 'noticias', t: 'Últimas noticias', p: 'noticias.ver' }
];
function prefs() {
  try { const p = JSON.parse(localStorage.getItem('cd.dash.' + S.me.id) || 'null'); if (p && Array.isArray(p.order)) return p; } catch (e) { }
  return { order: MODS.map(m => m.k), hidden: [] };
}
function savePrefs(p) { localStorage.setItem('cd.dash.' + S.me.id, JSON.stringify(p)); }

export function render(el) {
  const root = h('div');
  el.appendChild(root);
  const update = () => draw(root);
  update();
  return { update };
}

function greet() {
  const hr = new Date().getHours();
  return (hr < 6 ? 'Buenas noches' : hr < 14 ? 'Buenos días' : hr < 21 ? 'Buenas tardes' : 'Buenas noches') + ', ' + S.me.nombre.split(' ')[0];
}

function draw(root) {
  const d = dash();
  const hoyTxt = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const p = prefs();
  const mods = p.order.filter(k => !p.hidden.includes(k)).map(k => MODS.find(m => m.k === k)).filter(m => m && (!m.p || can(m.p)));
  mount(root,
    h('div.page-head', h('div', h('h1', greet()), h('div.muted', hoyTxt.charAt(0).toUpperCase() + hoyTxt.slice(1))), h('div.right.row',
      can('pedidos.crear') ? btn('Nuevo pedido', () => go('pedidos/nuevo'), { cls: 'primary', icon: 'plus' }) : null,
      btn('', () => customize(() => draw(root)), { cls: 'ghost icon', icon: 'settings', title: 'Personalizar el inicio' }))),
    h('div.grid', { style: { gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', alignItems: 'start' }, class: 'home-grid' },
      attention(d),
      h('div.col', { style: { gap: 'var(--gap)' } }, mods.map(m => MOD_FNS[m.k](d)).filter(Boolean)))
  );
  if (window.innerWidth <= 860) root.querySelector('.home-grid').style.gridTemplateColumns = '1fr';
}

function attention(d) {
  const rows = [];
  const add = (cls, ic, n, t, path, sub) => { if (n > 0) rows.push(h('button.att.' + cls, { onclick: () => go(path) }, h('span.ic', icon(ic)), h('span.n', String(n)), h('span.grow', h('div.bold', t), sub ? h('div.tiny.muted', sub) : null), icon('right', 's'))); };
  if (can('pedidos.ver')) {
    const venc = d.pedidos.vencidos.map(id => byId('pedidos', id)).filter(Boolean);
    add('bad', 'alert', venc.length, venc.length === 1 ? 'pedido vencido' : 'pedidos vencidos', 'pedidos/?f=vencidos', venc.slice(0, 3).map(o => 'nº ' + o.numero + ' ' + o.cliente).join(' · '));
    const hoy = d.pedidos.proximos.map(id => byId('pedidos', id)).filter(o => o && timing(o).nivel === 'today');
    add('bad', 'clock', hoy.length, hoy.length === 1 ? 'pedido vence hoy' : 'pedidos vencen hoy', 'pedidos/?f=hoy', hoy.slice(0, 3).map(o => 'nº ' + o.numero + ' ' + o.cliente).join(' · '));
    const prox = d.pedidos.proximos.length - hoy.length;
    add('warn', 'clock', prox, prox === 1 ? 'pedido próximo a vencer' : 'pedidos próximos a vencer', 'pedidos/?f=proximos', 'En los próximos ' + (S.cfg.pedidos.avisoDias || 2) + ' días');
    add('bad', 'alert', d.pedidos.incidencias.length, d.pedidos.incidencias.length === 1 ? 'pedido con incidencia' : 'pedidos con incidencia', 'pedidos/?f=incidencias');
    const urgMarked = S.t.pedidos.filter(o => o.prioridad === 'Urgente' && timing(o).abierto && !['late', 'today'].includes(timing(o).nivel)).length;
    add('warn', 'star', urgMarked, 'marcados como urgentes', 'pedidos/?f=urgentes');
    add('info', 'truck', d.pedidos.enviar, d.pedidos.enviar === 1 ? 'pedido listo para enviar' : 'pedidos listos para enviar', 'pedidos/?f=enviar');
  }
  if (can('tareas.ver')) {
    const venc = S.t.tareas.filter(t => ['Pendiente', 'En progreso', 'Bloqueada'].includes(t.estado) && t.fechaLimite && t.fechaLimite < S.hoy && (!t.responsable || t.responsable === S.me.nombre)).length;
    add('bad', 'tasks', venc, venc === 1 ? 'tarea tuya vencida' : 'tareas tuyas vencidas', 'tareas/?f=mias');
    add('brand', 'tasks', d.tareas.mias - venc, (d.tareas.mias - venc) === 1 ? 'tarea pendiente para ti' : 'tareas pendientes para ti', 'tareas/?f=mias', d.tareas.pendientes !== d.tareas.mias ? d.tareas.pendientes + ' abiertas en total en el equipo' : '');
    add('warn', 'lock', d.tareas.bloqueadas, d.tareas.bloqueadas === 1 ? 'tarea bloqueada' : 'tareas bloqueadas', 'tareas/?f=bloqueadas');
  }
  if (can('usuarios.admin')) {
    const sol = S.t.solicitudes.filter(s => s.estado === 'pendiente').length;
    add('warn', 'key', sol, sol === 1 ? 'solicitud de acceso pendiente' : 'solicitudes de acceso pendientes', 'config/solicitudes');
  }
  if (can('redes.ver')) {
    add('brand', 'calendar', d.redes.hoy.length, d.redes.hoy.length === 1 ? 'publicación prevista para hoy' : 'publicaciones previstas para hoy', 'redes');
    add('warn', 'calendar', d.redes.sinPreparar, 'publicaciones de los próximos días sin preparar', 'redes');
  }
  if (can('clientes.ver')) add('ok', 'star', d.clientes.seguimiento.length, d.clientes.seguimiento.length === 1 ? 'cliente para seguimiento' : 'clientes para seguimiento', 'clientes/?f=atencion', 'Frecuentes sin pedido activo, incidencias o inactivos');
  const n = unreadCount();
  add('info', 'bell', n, n === 1 ? 'notificación sin leer' : 'notificaciones sin leer', 'notificaciones');
  if (S.queue.length) add('warn', 'refresh', S.queue.length, 'cambios pendientes de enviar', 'inicio', S.online ? 'Enviando…' : 'Se enviarán al volver la conexión');
  return h('section.card', h('div.card-h', h('h3', 'Necesita tu atención'), h('span.tiny.muted', S.lastSync ? 'Actualizado ' + ago(S.lastSync) : '')),
    rows.length ? h('div.attention', rows) : h('div.all-good', h('div.big', '🎉'), h('h3', 'Todo al día'), h('p', 'No hay nada urgente ahora mismo.')));
}

const MOD_FNS = {
  produccion(d) {
    const st = [['Por empezar', d.pedidos.fabricar, 'fabricar', 'var(--brand)'], ['Fabricando', d.pedidos.fabricando, 'fabricando', '#f97316'], ['Por empaquetar', d.pedidos.empaquetar, 'empaquetar', '#0ea5e9'], ['Por enviar', d.pedidos.enviar, 'enviar', '#14b8a6']];
    return h('section.card', h('div.card-h', h('h3', 'Producción'), h('button.btn.ghost.sm', { onclick: () => go('pedidos') }, 'Ver pedidos')),
      h('div.grid.g2.kpis', st.map(x => h('button.kpi', { onclick: () => go('pedidos/?f=' + x[2]) }, h('span.n', { style: { color: x[3] } }, String(x[1])), h('span.l', x[0])))));
  },
  ventas(d) {
    const v = d.ventas;
    const diff = v.mesAnterior ? Math.round((v.mes - v.mesAnterior) / v.mesAnterior * 100) : null;
    return h('section.card', h('div.card-h', h('h3', 'Ventas'), h('button.btn.ghost.sm', { onclick: () => go('informes') }, 'Informes')),
      h('div.grid.g3', [['Hoy', v.hoy], ['Esta semana', v.semana, v.pedidosSemana + ' pedidos'], ['Este mes', v.mes, v.pedidosMes + ' pedidos']].map(x => h('div.fact', h('div.l', x[0]), h('div.v', eur(x[1])), x[2] ? h('div.tiny.muted', x[2]) : null))),
      diff !== null ? h('p.small', { style: { marginTop: '10px' } }, diff >= 0 ? h('span.ok-t', '▲ ' + diff + '%') : h('span.bad-t', '▼ ' + (-diff) + '%'), ' respecto al mes pasado (' + eur(v.mesAnterior) + ')') : null);
  },
  hoy(d) {
    const items = [];
    if (can('tareas.ver')) S.t.tareas.filter(t => t.fechaLimite === S.hoy && ['Pendiente', 'En progreso'].includes(t.estado)).forEach(t => items.push(h('div.item', { onclick: () => go('tareas/' + t.id) }, icon('tasks', 's'), h('span.grow.ellipsis', t.titulo), t.responsable ? h('span.tiny.muted', t.responsable) : null)));
    if (can('redes.ver')) S.t.redes.filter(r => r.fecha === S.hoy && r.estado !== 'Cancelado').forEach(r => items.push(h('div.item', { onclick: () => go('redes/' + r.id) }, icon('calendar', 's'), h('span.grow.ellipsis', (r.hora ? r.hora + ' · ' : '') + r.red + ': ' + (r.titulo || '')), pill(r.estado, r.estado === 'Publicado' ? 'ok' : ''))));
    if (can('pedidos.ver')) S.t.pedidos.filter(o => timing(o).limite === S.hoy && timing(o).abierto).forEach(o => items.push(h('div.item', { onclick: () => go('pedidos/' + o.id) }, icon('truck', 's'), h('span.grow.ellipsis', 'Entregar pedido nº ' + o.numero + ' · ' + o.cliente), h('span.due.today', 'Hoy'))));
    return h('section.card', h('div.card-h', h('h3', 'Agenda de hoy')), items.length ? h('div.list', items) : h('p.muted.small', 'Nada programado para hoy.'));
  },
  clientes(d) {
    const cs = d.clientes.stats || {};
    const list = d.clientes.seguimiento.map(id => byId('clientes', id)).filter(Boolean).slice(0, 5);
    if (!list.length) return null;
    return h('section.card', h('div.card-h', h('h3', 'Clientes para seguimiento'), h('button.btn.ghost.sm', { onclick: () => go('clientes/?f=atencion') }, 'Ver todos')),
      h('div.list', list.map(c => h('div.item', { onclick: () => go('clientes/' + c.id) }, avatar(c, 's'), h('div.grow', h('div.bold.ellipsis', c.nombre), h('div.tiny.muted', cs[c.id].etiquetas.map(e => e.i + ' ' + e.t).join(' · ')))))));
  },
  noticias() {
    const list = S.t.noticias.slice().sort((a, b) => (b.fijada - a.fijada) || String(b.creado).localeCompare(String(a.creado))).slice(0, 3);
    if (!list.length) return null;
    return h('section.card', h('div.card-h', h('h3', 'Últimas noticias'), h('button.btn.ghost.sm', { onclick: () => go('noticias') }, 'Ver todas')),
      h('div.list', list.map(n => h('div.item', { onclick: () => go('noticias/' + n.id) }, n.fijada ? icon('pin', 's') : icon('news', 's'), h('div.grow', h('div.bold.ellipsis', n.titulo), h('div.tiny.muted', n.autor + ' · ' + ago(n.creado)))))));
  }
};

function customize(done) {
  const p = prefs();
  const list = h('div.list.boxed');
  const draw = () => mount(list, p.order.map((k, i) => {
    const m = MODS.find(x => x.k === k); if (!m || (m.p && !can(m.p))) return null;
    return h('div.item', { style: { cursor: 'default' } }, sw(!p.hidden.includes(k), v => { p.hidden = v ? p.hidden.filter(x => x !== k) : p.hidden.concat(k); }), h('span.grow', m.t),
      btn('', () => { if (i > 0) { p.order.splice(i - 1, 0, p.order.splice(i, 1)[0]); draw(); } }, { cls: 'ghost icon sm', icon: 'left', title: 'Subir' }),
      btn('', () => { if (i < p.order.length - 1) { p.order.splice(i + 1, 0, p.order.splice(i, 1)[0]); draw(); } }, { cls: 'ghost icon sm', icon: 'right', title: 'Bajar' }));
  }));
  draw();
  modal('Personalizar el inicio', h('div.col', h('p.muted.small', '"Necesita tu atención" siempre aparece primero. Elige qué más quieres ver y en qué orden.'), list), close => [
    btn('Restablecer', () => { localStorage.removeItem('cd.dash.' + S.me.id); close(); done(); }, { cls: 'ghost' }),
    btn('Guardar', () => { savePrefs(p); close(); done(); }, { cls: 'primary' })], { size: 'narrow' });
}
