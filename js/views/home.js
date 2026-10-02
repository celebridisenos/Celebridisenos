// ================= Inicio: ¿qué pasa hoy y qué necesita mi atención? =================
import { h, mount, icon, btn, modal, eur, fdate, ago, avatar, sw, pill } from '../ui.js';
import { S, can, dash, unreadCount, byId, timing } from '../store.js';
import { go } from '../app.js';
import { BAMBU } from '../bambu.js';
import { gameCard, checkLevelUp, loadFrases, fraseDelDia, game } from '../game.js';
import { brief, objetivoTexto } from '../ai/celebrity.js';

const CL = window.CL;

const MODS = [
  { k: 'kpis', t: 'Cifras del negocio (ventas, beneficio, pedidos, taller)' },
  { k: 'celebrity', t: 'Celeby Nova: resumen del día y objetivos' },
  { k: 'motivacion', t: 'Motivación del día' },
  { k: 'alertas', t: 'Alertas inteligentes' },
  { k: 'inteligencia', t: 'Centro de inteligencia (ventas, beneficios, tendencias)', p: 'informes.ver' },
  { k: 'juego', t: 'Tu nivel, insignias y ranking' },
  { k: 'produccion', t: 'Producción', p: 'pedidos.ver' },
  { k: 'taller', t: 'Impresoras y filamento', p: 'taller.ver' },
  { k: 'hoy', t: 'Agenda de hoy' },
  { k: 'ventas', t: 'Ventas', p: 'informes.ver' },
  { k: 'clientes', t: 'Clientes para seguimiento', p: 'clientes.ver' },
  { k: 'noticias', t: 'Últimas noticias', p: 'noticias.ver' }
];
function prefs() {
  try {
    const p = JSON.parse(localStorage.getItem('cd.dash.' + S.me.id) || 'null');
    // módulos nuevos de versiones posteriores: se añaden al principio sin perder tu orden
    if (p && Array.isArray(p.order)) { MODS.forEach((m, i) => { if (!p.order.includes(m.k)) p.order.splice(Math.min(i, p.order.length), 0, m.k); }); return p; }
  } catch (e) { }
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

// v10.5: portada propia de THE NOORKO (estética editorial; solo datos de su espacio)
function noorkoHero() {
  const P = S.t.productos, st = e => P.filter(p => String(p.estado || '').toLowerCase() === e).length;
  const abiertos = S.t.pedidos.filter(o => { try { return CL.orderTiming(o, S.cfg.pedidos, S.hoy).abierto; } catch (e) { return false; } }).length;
  const sem = S.t.redes.filter(r => r.fecha && r.fecha >= S.hoy && r.fecha <= CL.addDays(S.hoy, 7)).length;
  const k = (n, t, path) => h('button.nk-kpi', { onclick: () => go(path) }, h('b', String(n)), h('span', t));
  return h('section.nk-hero',
    h('div.nk-top', h('span.nk-tag', 'ESPACIO INDEPENDIENTE'), h('span.nk-date', S.hoy.split('-').reverse().join('.'))),
    h('h2.nk-word', 'THE NOORKO'),
    h('p.nk-sub', 'Streetwear · drops · catálogo · redes'),
    h('div.nk-kpis', k(st('idea'), 'Ideas', 'productos'), k(st('publicado'), 'Publicados', 'catalogo'), k(st('archivado'), 'Archivados', 'productos'), k(abiertos, 'Pedidos abiertos', 'pedidos'), k(sem, 'Posts 7 días', 'redes')));
}

let frasesLoaded = false, fraseOff = 0;
function draw(root) {
  const d = dash();
  const hoyTxt = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const p = prefs();
  const gameOn = !(S.cfg.gamificacion && S.cfg.gamificacion.activa === false);
  const mods = p.order.filter(k => !p.hidden.includes(k)).map(k => MODS.find(m => m.k === k)).filter(m => m && (!m.p || can(m.p)) && (gameOn || !['juego', 'motivacion'].includes(m.k)));
  if (gameOn) setTimeout(checkLevelUp, 1200);
  if (!frasesLoaded) { frasesLoaded = true; loadFrases().then(() => draw(root)); }
  mount(root,
    S.ws === 'noorko' ? noorkoHero() : null,
    h('div.page-head', h('div', h('h1', greet()), h('div.muted', hoyTxt.charAt(0).toUpperCase() + hoyTxt.slice(1))), h('div.right.row',
      can('pedidos.crear') ? btn('Nuevo pedido', () => go('pedidos/nuevo'), { cls: 'primary', icon: 'plus' }) : null,
      btn('', () => customize(() => draw(root)), { cls: 'ghost icon', icon: 'settings', title: 'Personalizar el inicio' }))),
    mods.some(m => m.k === 'kpis') ? kpiStrip(d) : null,
    mods.some(m => m.k === 'celebrity') ? MOD_FNS.celebrity(d) : null,
    mods.some(m => m.k === 'motivacion') ? MOD_FNS.motivacion(d) : null,
    h('div.grid', { style: { gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', alignItems: 'start' }, class: 'home-grid' },
      h('div.col', { style: { gap: 'var(--gap)' } }, attention(d), ...mods.filter(m => ['inteligencia', 'alertas'].includes(m.k)).map(m => MOD_FNS[m.k](d)).filter(Boolean)),
      h('div.col', { style: { gap: 'var(--gap)' } }, mods.filter(m => !['kpis', 'celebrity', 'motivacion', 'inteligencia', 'alertas'].includes(m.k)).map(m => MOD_FNS[m.k](d)).filter(Boolean)))
  );
  if (window.innerWidth <= 860) root.querySelector('.home-grid').style.gridTemplateColumns = '1fr';
}

// v11: tablero de cifras — lo primero que ves (cada tarjeta lleva a su sitio)
function kpiStrip(d) {
  const costs = can('productos.costes') && can('informes.ver'), sales = can('informes.ver');
  const ms = S.hoy.slice(0, 8) + '01';
  const pHoy = costs ? CL.profitSummary(S.t, S.cfg, S.hoy, S.hoy) : null, pMes = costs ? CL.profitSummary(S.t, S.cfg, ms, S.hoy) : null;
  const jobs = S.t.trabajos || [], busyIds = new Set(jobs.filter(j => j.estado === 'Imprimiendo').map(j => j.impresoraId));
  // v11.2: cuenta también las Bambu que imprimen algo lanzado fuera del programa
  (BAMBU.list || []).filter(b => b.conectada && ['imprimiendo', 'pausada', 'preparando'].includes(b.estado)).forEach(b => busyIds.add(b.impresoraId || b.serial));
  const printing = busyIds.size, queued = jobs.filter(j => j.estado === 'En cola').length;
  const aviso = Number((S.cfg.taller || {}).avisoGramos) || 150;
  const lowSpool = (S.t.bobinas || []).filter(b => b.estado !== 'Agotada' && Number(b.restante) <= aviso).length;
  const top = {}; S.t.pedidos.filter(o => o.fecha >= ms && !CL.stateOf(S.cfg.pedidos, o.estado).cancelled).forEach(o => { top[o.producto] = (top[o.producto] || 0) + (Number(o.cantidad) || 1); });
  const best = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const tile = (ic, v, l, sub, path, cls) => h('button.kt' + (cls ? '.' + cls : ''), { onclick: () => go(path) }, h('span.ki', ic), h('span.kv', v), h('span.kl', l), sub ? h('span.ks', sub) : null);
  const tiles = [
    sales ? tile('💶', eur(d.ventas.hoy), 'Ventas hoy', d.ventas.mes ? eur(d.ventas.mes) + ' este mes' : '', 'informes') : null,
    costs ? tile('📈', eur(pHoy.beneficio), 'Beneficio hoy', pHoy.sinCoste ? pHoy.sinCoste + ' sin coste' : '', 'informes', pHoy.beneficio < 0 ? 'bad' : '') : null,
    costs ? tile('🗓️', eur(pMes.beneficio), 'Beneficio del mes', pMes.margen !== null ? 'margen ' + Math.round(pMes.margen * 100) + ' %' : '', 'informes', pMes.beneficio < 0 ? 'bad' : 'ok') : null,
    can('pedidos.ver') ? tile('📦', String(d.pedidos.abiertos), 'Pedidos pendientes', [d.pedidos.vencidos.length ? d.pedidos.vencidos.length + ' vencidos' : '', d.pedidos.enviar ? d.pedidos.enviar + ' por enviar' : ''].filter(Boolean).join(' · '), 'hoy', d.pedidos.vencidos.length ? 'bad' : '') : null,
    can('chat.usar') ? tile('💬', String(S.chatUnread || 0), 'Mensajes sin leer', '', 'chat', S.chatUnread ? 'warn' : '') : null,
    can('taller.ver') ? tile('🖨️', String(printing), 'Imprimiendo ahora', queued ? queued + ' en cola' : 'cola vacía', 'hoy') : null,
    can('taller.ver') ? tile('🧵', String(lowSpool), 'Filamento crítico', lowSpool ? 'bobinas casi vacías' : 'todo bien', 'taller/filamento', lowSpool ? 'warn' : '') : null,
    best.length ? h('div.kt.top', h('span.ki', '🏆'), h('span.kl', 'Más vendidos del mes'), h('div.kbest', best.map((b, i) => h('div.row', h('span.grow.ellipsis', (i + 1) + '. ' + b[0]), h('b', b[1] + ' ud.'))))) : null
  ].filter(Boolean);
  return tiles.length ? h('section.kstrip', tiles) : null;
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
  // v10.8: qué hace cada impresora ahora y filamento bajo
  taller() {
    const imps = (S.t.impresoras || []).filter(p => p.activa !== false);
    if (!imps.length) return null;
    const jobs = S.t.trabajos || [];
    const aviso = Number((S.cfg.taller || {}).avisoColorGramos) || 300, colors = {};
    (S.t.bobinas || []).forEach(b => { if (b.estado === 'Agotada') return; const k = (b.material || 'PLA') + ' ' + b.color; colors[k] = (colors[k] || 0) + (Number(b.restante) || 0); });
    const low = Object.keys(colors).filter(k => colors[k] <= aviso);
    return h('section.card', h('div.row', h('h3.grow', '🖨️ Impresoras'), btn('Ver taller', () => go('taller'), { cls: 'sm' })),
      h('div.col', { style: { gap: '8px', marginTop: '8px' } }, imps.map(p => {
        const cur = jobs.find(j => j.impresoraId === p.id && j.estado === 'Imprimiendo'), q = jobs.filter(j => j.impresoraId === p.id && j.estado === 'En cola').length;
        const late = cur && cur.finPrevisto && new Date(cur.finPrevisto) < new Date();
        const pc = cur ? Math.max(0, Math.min(1, (Date.now() - new Date(cur.inicio)) / Math.max(1, new Date(cur.finPrevisto) - new Date(cur.inicio)))) : 0;
        return h('div', { onclick: () => go('taller'), style: { cursor: 'pointer' } }, h('div.row.small', h('b', p.nombre), h('span.grow.ellipsis.muted', p.estado === 'Mantenimiento' ? '🔧 mantenimiento' : cur ? cur.titulo : 'libre'), cur ? h('span' + (late ? '.bad-t' : ''), late ? '⏰ revisar' : new Date(cur.finPrevisto).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })) : null, q ? h('span.tiny.muted', '+' + q + ' en cola') : null),
          cur ? h('div.bar' + (late ? '.bad' : ''), { style: { marginTop: '4px' } }, h('i', { style: { width: Math.round(pc * 100) + '%' } })) : null);
      })),
      low.length ? h('p.small.warn-t', { style: { marginTop: '8px' } }, '🧵 Queda poco: ' + low.map(k => k + ' (' + Math.round(colors[k]) + ' g)').join(', ')) : null);
  },
  // v10: Celebrity resume el día en pocas líneas y controla los objetivos
  celebrity() {
    const b = brief();
    const fmt = (v, t) => t === 'ventas' ? v.toFixed(2).replace('.', ',') + ' €' : String(v);
    return h('section.card.celeb-card', h('div.row', h('span.celeb-mark', '✨'), h('div.grow', h('div.tiny.muted', 'CELEBRITY · HOY'), h('div.bold', b.next)),
        can('ia.usar') ? btn('Preguntar', () => go('ia'), { cls: 'sm' }) : null),
      b.items.length ? h('div.celeb-items', b.items.slice(0, 5).map(i => h('button.celeb-it', { onclick: () => go(i.path) }, h('b', String(i.n)), ' ' + i.txt))) : null,
      b.objetivos.length ? h('div.obj-list', b.objetivos.map(o => h('div.obj' + (o.p.hecho ? '.done' : ''), { onclick: () => go('ia/objetivos') }, h('div.row', h('div.grow.small', objetivoTexto(o)), h('b.small', fmt(o.p.valor, o.tipo) + ' / ' + fmt(o.p.meta, o.tipo) + (o.p.hecho ? ' ✓' : ''))), h('div.progress', h('span', { style: { width: Math.round(o.p.pct * 100) + '%' } }))))) : null);
  },
  motivacion() {
    const g = game(), me = g.usuarios[S.me.id] || {};
    const txt = h('p.frase', fraseDelDia(fraseOff));
    const extra = [];
    if (me.pedidosMes) extra.push('Llevas ' + me.pedidosMes + ' pedido' + (me.pedidosMes > 1 ? 's' : '') + ' este mes.');
    if (me.tareasMes) extra.push(me.tareasMes + ' tarea' + (me.tareasMes > 1 ? 's' : '') + ' completada' + (me.tareasMes > 1 ? 's' : '') + '.');
    if (me.racha > 1) extra.push('🔥 ' + me.racha + ' días seguidos con actividad.');
    return h('section.card.motiv', h('div.row', h('span.big', '✨'), h('div.grow', txt, extra.length ? h('div.tiny.muted', extra.join(' ')) : null),
      h('button.btn.ghost.icon.sm', { title: 'Otra frase', onclick: () => { fraseOff++; txt.textContent = fraseDelDia(fraseOff); } }, '↻')));
  },
  juego() { return gameCard(); },
  alertas() {
    const all = CL.alerts(S.t, S.cfg, S.hoy, { biblioteca: S.t.biblioteca || [] });
    const allowed = a => ({ precio: can('productos.costes'), margen: can('productos.costes'), ventas: can('informes.ver'), cliente: can('clientes.ver'), pedido: can('pedidos.ver'), anomalia: can('pedidos.ver'), stock: can('productos.ver'), documento: true })[a.tipo] !== false;
    const list = all.filter(allowed);
    if (!list.length) return h('section.card', h('div.card-h', h('h3', '🛎️ Alertas')), h('p.small.ok-t', '✅ Sin alertas: precios, márgenes, stock, clientes y ventas en orden.'));
    const ic = { bad: '🔴', warn: '🟠', info: '🔵' };
    return h('section.card', h('div.card-h', h('h3', '🛎️ Alertas (' + list.length + ')'), can('config.editar') ? h('button.btn.ghost.sm', { onclick: () => go('config/alertas') }, 'Ajustar') : null),
      h('div.list', list.slice(0, 8).map(a => h('div.item', { onclick: () => go(a.enlace) }, h('span', ic[a.nivel] || '•'), h('span.grow.small', a.texto)))),
      list.length > 8 ? h('p.tiny.muted', 'y ' + (list.length - 8) + ' más…') : null);
  },
  inteligencia() {
    const bi = CL.bi(S.t, S.cfg, S.hoy, 'mes');
    const costs = can('productos.costes');
    const a = bi.actual, b = bi.anterior;
    const delta = (x, y) => y ? Math.round((x - y) / y * 100) : null;
    const dv = delta(a.ventas, b.ventas);
    const maxW = Math.max(1, ...bi.tendencia.map(t => t.ventas));
    const k = (l, v, sub, cls) => h('div.fact', h('div.l', l), h('div.v' + (cls ? '.' + cls : ''), v), sub ? h('div.tiny.muted', sub) : null);
    return h('section.card', h('div.card-h', h('h3', '📈 Centro de inteligencia'), h('button.btn.ghost.sm', { onclick: () => go('informes') }, 'Informes')),
      h('div.grid.g3', k('Ventas del mes', eur(a.ventas), dv === null ? a.pedidos + ' pedidos' : (dv >= 0 ? '▲ ' : '▼ ') + Math.abs(dv) + ' % vs. mes anterior'),
        costs ? k('Beneficio', eur(a.beneficio), a.margen === null ? 'sin costes' : 'margen ' + Math.round(a.margen * 100) + ' %', a.beneficio < 0 ? 'bad-t' : '') : k('Ticket medio', eur(a.ticketMedio)),
        k('Clientes', bi.clientesActivos + ' activos', bi.clientesInactivos + ' inactivos'), k('Pedidos pendientes', String(bi.pendientes))),
      h('div.spark', { title: 'Ventas por semana (12 semanas)' }, bi.tendencia.map(t => h('i', { title: t.semana + ': ' + eur(t.ventas), style: { height: Math.max(3, t.ventas / maxW * 44) + 'px' } }))),
      h('div.tiny.muted', 'Ventas de las últimas 12 semanas'),
      bi.conclusiones.length ? h('ul.small.concl', bi.conclusiones.filter(c => costs || !/margen|beneficio|rentable|coste/i.test(c)).slice(0, 4).map(c => h('li', c))) : null,
      costs && bi.rentables.length ? h('div.tiny', h('b', 'Más rentables: '), bi.rentables.slice(0, 3).map(p => p.producto + ' (' + eur(p.beneficio) + ')').join(' · ')) : null);
  },
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
