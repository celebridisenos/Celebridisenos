// ================= Pedidos: panel, filtros, ficha y formulario =================
import { h, mount, clear, icon, btn, modal, drawer, toast, eur, fdate, fdt, ago, pill, dueBadge, empty, field, inp, sel, area, debounce, confirmDlg, uid, copyText, avatar, na } from '../ui.js';
import { S, can, mutate, api, timing, stateColor, byId, upsertLocal, removeLocal, emit, clientStats } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { filesSection, filesOf } from '../files.js';

const CL = window.CL;
const PRESETS = [
  { k: 'abiertos', t: 'En curso', f: (o, t) => t.abierto },
  { k: 'urgentes', t: 'Urgentes', cls: 'bad', f: (o, t) => CL.isUrgent(o, t) },
  { k: 'fabricar', t: 'Por empezar', f: o => ['Nuevo', 'Pendiente de revisión', 'Pendiente de fabricación'].includes(o.estado) },
  { k: 'fabricando', t: 'En fabricación', f: o => o.estado === 'En fabricación' },
  { k: 'empaquetar', t: 'Por empaquetar', f: o => o.estado === 'Fabricado' },
  { k: 'enviar', t: 'Por enviar', f: o => ['Empaquetado', 'Listo para enviar'].includes(o.estado) },
  { k: 'enviados', t: 'Enviados', cls: 'ok', f: o => ['Enviado', 'En tránsito'].includes(o.estado) },
  { k: 'incidencias', t: 'Incidencias', cls: 'warn', f: (o, t) => t.incidencia },
  { k: 'todos', t: 'Todos', f: () => true },
  { k: 'vencidos', t: 'Vencidos', hidden: true, f: (o, t) => t.abierto && t.nivel === 'late' },
  { k: 'hoy', t: 'Vencen hoy', hidden: true, f: (o, t) => t.abierto && t.nivel === 'today' },
  { k: 'proximos', t: 'Próximos a vencer', hidden: true, f: (o, t) => t.abierto && (t.nivel === 'soon' || t.nivel === 'today') }
];
const SORTS = [{ v: 'limite', t: 'Fecha límite (más urgente primero)' }, { v: 'reciente', t: 'Más recientes primero' }, { v: 'antiguo', t: 'Más antiguos primero' }, { v: 'numero', t: 'Nº de pedido' }, { v: 'cliente', t: 'Cliente (A-Z)' }, { v: 'importe', t: 'Importe (mayor primero)' }];

function parseParams(params) {
  const out = { id: '', q: {} };
  (params || []).forEach(p => { if (p.startsWith('?')) new URLSearchParams(p.slice(1)).forEach((v, k) => { out.q[k] = v; }); else if (p) out.id = p; });
  return out;
}

export function render(el, params) {
  const st = { preset: 'abiertos', q: '', estado: '', canal: '', resp: '', desde: '', hasta: '', sort: 'limite', limit: 60 };
  const head = h('div.page-head', h('h1', 'Pedidos'), h('div.row',
    can('pedidos.crear') ? btn('Nuevo pedido', () => orderForm(), { cls: 'primary', icon: 'plus' }) : null));
  const kpis = h('div.grid.g4.kpis', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', marginBottom: '14px' } });
  const search = inp({ placeholder: 'Buscar nº, cliente, producto, seguimiento…', type: 'search', 'aria-label': 'Buscar pedidos' });
  search.addEventListener('input', debounce(() => { st.q = search.value; st.limit = 60; drawList(); }, 120));
  const fEstado = h('select.inp'), fCanal = h('select.inp'), fResp = h('select.inp');
  const fDesde = inp({ type: 'date', title: 'Desde' }), fHasta = inp({ type: 'date', title: 'Hasta' });
  const fSort = sel(SORTS, st.sort);
  [fEstado, fCanal, fResp, fDesde, fHasta, fSort].forEach(x => x.addEventListener('change', () => { st.estado = fEstado.value; st.canal = fCanal.value; st.resp = fResp.value; st.desde = fDesde.value; st.hasta = fHasta.value; st.sort = fSort.value; st.limit = 60; drawList(); }));
  const moreFilters = h('details.more', { style: { marginBottom: '12px' } }, h('summary', icon('filter', 's'), 'Filtros y orden'), h('div.in', h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' } },
    field('Estado', fEstado), field('Canal / tienda', fCanal), field('Responsable', fResp), field('Desde', fDesde), field('Hasta', fHasta), field('Ordenar por', fSort)),
    btn('Quitar filtros', () => { [fEstado, fCanal, fResp].forEach(x => x.value = ''); fDesde.value = fHasta.value = ''; search.value = ''; Object.assign(st, { q: '', estado: '', canal: '', resp: '', desde: '', hasta: '' }); drawList(); }, { cls: 'ghost sm' })));
  const listBox = h('div');
  el.append(head, kpis, h('div.row', { style: { marginBottom: '10px' } }, h('div.inp-icon.grow', icon('search', 's'), search)), moreFilters, listBox);

  function fillSelects() {
    const keep = [fEstado.value, fCanal.value, fResp.value];
    mount(fEstado, h('option', { value: '' }, 'Todos'), S.cfg.pedidos.estados.map(s => h('option', { value: s.k }, s.k)));
    const canales = [...new Set(S.cfg.pedidos.canales.concat(S.t.pedidos.map(o => o.canal).filter(Boolean)))];
    mount(fCanal, h('option', { value: '' }, 'Todos'), canales.map(c => h('option', { value: c }, c)));
    mount(fResp, h('option', { value: '' }, 'Todas las personas'), h('option', { value: '__none' }, 'Sin responsable'), S.t.usuarios.filter(u => u.activo).map(u => h('option', { value: u.nombre }, u.nombre)));
    [fEstado.value, fCanal.value, fResp.value] = keep;
  }
  function filtered() {
    const pr = PRESETS.find(p => p.k === st.preset) || PRESETS[0];
    return S.t.pedidos.map(o => ({ o, t: timing(o) })).filter(({ o, t }) => {
      if (!pr.f(o, t)) return false;
      if (st.q && !CL.matches([o.numero, o.cliente, o.producto, o.seguimiento, o.notas, o.color, o.personalizacion, o.canal, o.envio, o.responsable].join(' '), st.q.replace(/^#/, ''))) return false;
      if (st.estado && o.estado !== st.estado) return false;
      if (st.canal && o.canal !== st.canal) return false;
      if (st.resp === '__none' ? !!o.responsable : (st.resp && o.responsable !== st.resp)) return false;
      if (st.desde && (!o.fecha || o.fecha < st.desde)) return false;
      if (st.hasta && (!o.fecha || o.fecha > st.hasta)) return false;
      return true;
    }).sort((a, b) => {
      switch (st.sort) {
        case 'reciente': return String(b.o.fecha || b.o.creado).localeCompare(String(a.o.fecha || a.o.creado));
        case 'antiguo': return String(a.o.fecha || a.o.creado).localeCompare(String(b.o.fecha || b.o.creado));
        case 'numero': return String(a.o.numero).localeCompare(String(b.o.numero), 'es', { numeric: true });
        case 'cliente': return String(a.o.cliente).localeCompare(String(b.o.cliente), 'es');
        case 'importe': return CL.orderTotal(b.o) - CL.orderTotal(a.o);
        default: { // abiertos primero, luego por fecha límite
          if (a.t.abierto !== b.t.abierto) return a.t.abierto ? -1 : 1;
          const la = a.t.limite || '9999', lb = b.t.limite || '9999';
          if (a.o.prioridad === 'Urgente' && b.o.prioridad !== 'Urgente' && la >= lb) return -1;
          return la.localeCompare(lb) || String(b.o.fecha).localeCompare(String(a.o.fecha));
        }
      }
    });
  }
  function drawKpis() {
    const all = S.t.pedidos.map(o => ({ o, t: timing(o) }));
    const vis = PRESETS.filter(p => !p.hidden || p.k === st.preset);
    mount(kpis, vis.map(p => {
      const n = all.filter(x => p.f(x.o, x.t)).length;
      return h('button.kpi' + (st.preset === p.k ? '.on' : '') + (p.cls && n ? '.' + p.cls : ''), { onclick: () => { st.preset = p.k; st.limit = 60; drawKpis(); drawList(); history.replaceState(null, '', '#/pedidos/?f=' + p.k); } }, h('span.n', String(n)), h('span.l', p.t));
    }));
  }
  function drawList() {
    const rows = filtered();
    if (!S.t.pedidos.length) { mount(listBox, h('div.card', empty('truck', 'Todavía no hay pedidos', 'Crea el primero o añádelos en la hoja Pedidos de vuestro Google Sheet: aparecerán aquí solos.', can('pedidos.crear') ? btn('Nuevo pedido', () => orderForm(), { cls: 'primary', icon: 'plus' }) : null))); return; }
    if (!rows.length) { mount(listBox, h('div.card', empty('search', 'No hay pedidos con estos filtros', 'Prueba con "Todos" o quita filtros.'))); return; }
    const shown = rows.slice(0, st.limit);
    const total = rows.reduce((s, x) => s + CL.orderTotal(x.o), 0);
    const mobile = window.innerWidth <= 860;
    const body = mobile
      ? h('div.list.boxed', shown.map(({ o, t }) => h('div.item', { onclick: () => go('pedidos/' + o.id) },
          h('div.grow', h('div.row', h('b', 'nº ' + o.numero), h('span.ellipsis.grow', o.cliente), o.prioridad === 'Urgente' ? pill('Urgente', 'bad') : null),
            h('div.small.muted.ellipsis', (o.cantidad > 1 ? o.cantidad + ' × ' : '') + o.producto),
            h('div.row.wrap', { style: { marginTop: '4px', gap: '8px' } }, pill(o.estado, '', stateColor(o.estado)), dueBadge(t))),
          h('div.bold', eur(CL.orderTotal(o))))))
      : h('div.table-wrap', h('table.t', h('thead', h('tr', ['Nº', 'Fecha', 'Cliente', 'Producto', 'Estado', 'Plazo', 'Importe', 'Responsable', 'Canal'].map(x => h('th', x)))),
          h('tbody', shown.map(({ o, t }) => h('tr', { onclick: () => go('pedidos/' + o.id) },
            h('td.bold.nowrap', o.numero, o.prioridad === 'Urgente' ? h('span', { title: 'Urgente' }, ' ⚡') : null),
            h('td.nowrap', fdate(o.fecha)), h('td', h('div.ellipsis', { style: { maxWidth: '200px' } }, o.cliente)),
            h('td', h('div.ellipsis', { style: { maxWidth: '240px' } }, (o.cantidad > 1 ? o.cantidad + ' × ' : '') + o.producto)),
            h('td', pill(o.estado, '', stateColor(o.estado))), h('td', dueBadge(t)), h('td.nowrap', eur(CL.orderTotal(o))),
            h('td', o.responsable || h('span.muted', '—')), h('td', o.canal || h('span.muted', '—')))))));
    mount(listBox, h('div.row.small.muted', { style: { margin: '0 0 8px' } }, h('span', rows.length + (rows.length === 1 ? ' pedido' : ' pedidos')), can('informes.ver') ? h('span', '· ' + eur(total)) : null),
      body, rows.length > st.limit ? h('div.pager', btn('Mostrar más (' + (rows.length - st.limit) + ')', () => { st.limit += 100; drawList(); })) : null);
  }
  let openId = null, dr = null;
  function applyParams(p) {
    const pp = parseParams(p);
    if (pp.q.f && PRESETS.some(x => x.k === pp.q.f)) st.preset = pp.q.f;
    if (pp.q.cliente) { st.q = pp.q.cliente; search.value = pp.q.cliente; st.preset = 'todos'; }
    drawKpis(); drawList();
    if (pp.id === 'nuevo') { history.replaceState(null, '', '#/pedidos'); orderForm(); }
    else if (pp.id && (pp.id !== openId || !document.querySelector('.drawer'))) { openId = pp.id; dr = orderDrawer(pp.id, () => { openId = null; dr = null; if (location.hash.startsWith('#/pedidos/' + pp.id)) history.replaceState(null, '', '#/pedidos'); }); }
  }
  fillSelects();
  applyParams(params);
  return {
    params: applyParams,
    update: () => { fillSelects(); drawKpis(); drawList(); if (dr && dr.update) dr.update(); },
    destroy: () => { if (dr) dr.close(); }
  };
}

// ---------- Ficha del pedido ----------
function nextState(o) {
  const list = S.cfg.pedidos.estados.filter(s => !s.issue && !s.cancelled);
  const i = list.findIndex(s => s.k === o.estado);
  if (o.estado === 'Incidencia') return null;
  return i >= 0 && i < list.length - 1 ? list[i + 1].k : (i < 0 ? list[0].k : null);
}
export function orderDrawer(id, onClose) {
  let tab = 'resumen', ctl;
  const res = { update: null, close: () => ctl && ctl.close() };
  ctl = drawer((d, close) => {
    const closeAll = () => { close(); onClose && onClose(); };
    const draw = () => {
      const o = byId('pedidos', id);
      if (!o) { mount(d, h('div.drawer-h', h('h2.grow', 'Pedido'), btn('', closeAll, { cls: 'ghost icon', icon: 'x' })), h('div.drawer-b', empty('alert', 'Este pedido ya no existe', 'Puede que otra persona lo haya borrado. Está en la papelera.'))); return; }
      const t = timing(o);
      const nx = nextState(o);
      const editable = can('pedidos.editar');
      const states = S.cfg.pedidos.estados.filter(s => !s.issue && !s.cancelled);
      const idx = states.findIndex(s => s.k === o.estado);
      const c = byId('clientes', o.clienteId);
      const tabs = [['resumen', 'Resumen'], ['fechas', 'Fechas'], ['envio', 'Envío'], ['archivos', 'Archivos (' + filesOf('pedidos', o.id).length + ')'], ['tareas', 'Tareas (' + S.t.tareas.filter(k => k.pedidoId === o.id).length + ')'], ['historial', 'Historial']];
      const body = h('div');
      mount(d,
        h('div.drawer-h', h('div.grow', h('h2', 'Pedido nº ' + o.numero), h('div.row.wrap', { style: { gap: '8px', marginTop: '4px' } }, pill(o.estado, '', stateColor(o.estado)), dueBadge(t), o.prioridad === 'Urgente' ? pill('⚡ Urgente', 'bad') : null)),
          btn('', closeAll, { cls: 'ghost icon', icon: 'x', title: 'Cerrar' })),
        h('div.drawer-b.col', { style: { gap: '14px' } },
          h('div.steps', { title: 'Progreso' }, states.map((s, i) => h('div.s' + (o.estado === 'Incidencia' ? '.bad' : i <= idx ? '.on' : ''), { title: s.k }))),
          editable ? h('div.row.wrap',
            nx ? btn('Pasar a: ' + nx, () => changeState(o, nx), { cls: 'primary', icon: 'check' }) : null,
            !t.enviado && !t.cancelado ? btn('Enviar pedido', () => shipDialog(o), { icon: 'truck' }) : null,
            btn('Cambiar estado', () => stateDialog(o), { icon: 'refresh' }),
            o.estado !== 'Incidencia' && t.abierto ? btn('Incidencia', () => issueDialog(o), { icon: 'alert', cls: 'danger' }) : null)
            : h('p.small.muted', 'Solo lectura: no tienes permiso para cambiar pedidos.'),
          h('div.tabs', tabs.map(x => h('button' + (tab === x[0] ? '.on' : ''), { onclick: () => { tab = x[0]; draw(); } }, x[1]))),
          body,
          h('div.row.wrap', { style: { marginTop: '10px', borderTop: '1px solid var(--line)', paddingTop: '14px' } },
            editable ? btn('Editar', () => orderForm(o), { icon: 'edit' }) : null,
            can('pedidos.crear') ? btn('Duplicar', () => orderForm(Object.assign({}, o, { id: '', numero: '', fecha: '', estado: 'Nuevo', seguimiento: '', fechaEnvio: '', fechaEntrega: '', incidencia: '' }), true), { icon: 'copy' }) : null,
            btn('Mensaje para el cliente', () => messageDialog(o), { icon: 'msg' }),
            h('span.grow'),
            can('pedidos.borrar') ? btn('Borrar', () => delOrder(o, closeAll), { cls: 'danger', icon: 'trash' }) : btn('Borrar', () => requestAccess('pedidos.borrar', 'pedidos', 'Borrar pedido nº ' + o.numero), { cls: 'ghost locked', icon: 'trash' }))));
      TABS[tab](body, o, t, c);
    };
    res.update = draw;
    draw();
  });
  return res;
}
const TABS = {
  resumen(el, o, t, c) {
    const cs = c ? clientStats()[c.id] : null;
    mount(el, h('div.facts',
      fact('Cliente', c ? h('a', { href: '#/clientes/' + c.id }, o.cliente) : na(o.cliente)),
      fact('Producto', o.productoId && byId('productos', o.productoId) ? h('a', { href: '#/productos/' + o.productoId }, o.producto) : na(o.producto)),
      fact('Cantidad', na(o.cantidad)), fact('Precio unidad', eur(o.precio)), fact('Total', h('b', eur(CL.orderTotal(o)))),
      fact('Canal / tienda', na(o.canal)), fact('Responsable', na(o.responsable, 'Sin asignar')), fact('Prioridad', o.prioridad || 'Normal')),
      h('h4', { style: { margin: '16px 0 8px' } }, 'Personalización'),
      h('dl.kv', h('dt', 'Color'), h('dd', na(o.color)), h('dt', 'Personalización'), h('dd', na(o.personalizacion))),
      o.incidencia ? h('div.card.flat', { style: { background: 'var(--bad-soft)', marginTop: '12px' } }, h('b.bad-t', '⚠️ Incidencia'), h('p', o.incidencia)) : null,
      h('h4', { style: { margin: '16px 0 8px' } }, 'Notas'), o.notas ? h('p', { style: { whiteSpace: 'pre-wrap' } }, o.notas) : h('p.na', 'Sin notas'),
      cs ? h('div.card.flat', { style: { marginTop: '12px' } }, h('div.row', h('b', 'Sobre ' + c.nombre), h('span.tiny.muted', cs.pedidos + ' pedidos · ' + eur(cs.gasto))), h('div.tags', { style: { marginTop: '6px' } }, cs.etiquetas.map(e => pill(e.i + ' ' + e.t, 'brand')))) : null);
  },
  fechas(el, o, t) {
    mount(el, h('div.facts',
      fact('Fecha del pedido', o.fecha ? fdate(o.fecha) : na('')), fact('Plazo', o.plazoDias !== '' ? o.plazoDias + ' días' : na('')), fact('Fecha límite', t.limite ? fdate(t.limite) : na('')),
      fact('Días transcurridos', t.transcurridos !== null ? String(t.transcurridos) : na('')), fact('Días restantes', t.restantes !== null ? String(Math.max(t.restantes, 0)) : (t.enviado ? 'Enviado' : na(''))),
      fact('Retraso', t.retraso ? h('b.bad-t', t.retraso + ' días') : 'Ninguno'), fact('Entrega estimada', o.entregaEstimada ? fdate(o.entregaEstimada) : na('')),
      fact('Enviado el', o.fechaEnvio ? fdate(o.fechaEnvio) : na('Aún no')), fact('Entregado el', o.fechaEntrega ? fdate(o.fechaEntrega) : na('Aún no'))),
      h('p.small.muted', { style: { marginTop: '10px' } }, dueBadge(t), ' · Los días se recalculan solos cada día.'),
      h('p.tiny.muted', 'Creado por ' + (o.creadoPor || '—') + ' · ' + fdt(o.creado) + (o.actualizado ? ' · última modificación ' + ago(o.actualizado) + ' por ' + (o.actualizadoPor || '—') : '')));
  },
  envio(el, o) {
    const track = trackingUrl(o.envio, o.seguimiento);
    mount(el, h('div.facts', fact('Método / transportista', na(o.envio)), fact('Nº de seguimiento', o.seguimiento ? h('span.row', o.seguimiento, btn('', () => copyText(o.seguimiento), { cls: 'ghost icon sm', icon: 'copy', title: 'Copiar' })) : na('Sin número')),
      fact('Enviado el', o.fechaEnvio ? fdate(o.fechaEnvio) : na('Aún no')), fact('Entregado el', o.fechaEntrega ? fdate(o.fechaEntrega) : na('Aún no'))),
      track ? h('p', { style: { marginTop: '12px' } }, btn('Ver seguimiento en la web del transportista', () => window.open(track, '_blank', 'noopener'), { icon: 'external' })) : null,
      c_addr(o));
  },
  archivos(el, o) { mount(el, h('p.small.muted', 'Fotos del producto terminado, del paquete, del justificante de envío o de una incidencia. En el móvil puedes hacer la foto directamente.'), filesSection('pedidos', o.id, { tipos: ['foto', 'video', 'doc'] }).el); },
  tareas(el, o) {
    const list = S.t.tareas.filter(k => k.pedidoId === o.id);
    mount(el, list.length ? h('div.list.boxed', list.map(k => h('div.item', { onclick: () => go('tareas/' + k.id) }, icon(k.estado === 'Completada' ? 'check' : 'tasks', 's'), h('span.grow', { style: k.estado === 'Completada' ? { textDecoration: 'line-through', color: 'var(--muted)' } : {} }, k.titulo), pill(k.estado)))) : h('p.muted.small', 'Sin tareas para este pedido.'),
      can('tareas.crear') ? btn('Añadir tarea para este pedido', () => import('./tareas.js').then(m => m.taskForm({ pedidoId: o.id, titulo: '', clienteId: o.clienteId })), { icon: 'plus', cls: 'sm' }) : null);
  },
  historial(el, o) {
    mount(el, h('p.muted', 'Cargando historial…'));
    api('auditoria.lista', { entidad: 'pedidos', entidadId: o.id }).then(r => mount(el, r.filas.length ? h('div.timeline', r.filas.map(a => h('div.tl', h('span.b'), h('div', h('div.small', h('b', a.usuario), ' ', accionTxt(a.accion)), h('div.tiny.muted', fdt(a.fecha)), a.detalle ? h('div.tiny.muted', resumenDetalle(a.detalle)) : null)))) : h('p.muted.small', 'Sin historial registrado.')))
      .catch(e => mount(el, h('p.bad-t', e.message)));
  }
};
function c_addr(o) {
  const c = byId('clientes', o.clienteId);
  if (!c || !can('clientes.datos') || !c.direccion) return null;
  return h('div.card.flat', { style: { marginTop: '12px' } }, h('div.row', h('b', 'Dirección de envío'), btn('', () => copyText(c.nombre + '\n' + c.direccion + (c.telefono ? '\n' + c.telefono : '')), { cls: 'ghost icon sm', icon: 'copy', title: 'Copiar' })), h('p', { style: { whiteSpace: 'pre-wrap' } }, c.direccion));
}
export function accionTxt(a) { return { crear: 'lo creó', editar: 'lo modificó', borrar: 'lo borró', restaurar: 'lo restauró', subir_archivo: 'subió un archivo', vincular_archivo: 'vinculó un archivo', borrar_archivo: 'borró un archivo', estado_tarea: 'cambió el estado' }[a] || a.replace(/_/g, ' '); }
export function resumenDetalle(d) {
  try {
    const x = JSON.parse(d);
    if (x.despues) return Object.keys(x.despues).filter(k => !k.startsWith('_')).map(k => k + ': ' + (x.antes && x.antes[k] !== undefined && x.antes[k] !== '' ? '"' + x.antes[k] + '" → ' : '') + '"' + x.despues[k] + '"').join(' · ');
    return Object.keys(x).map(k => k + ': ' + (typeof x[k] === 'object' ? JSON.stringify(x[k]) : x[k])).join(' · ').slice(0, 200);
  } catch (e) { return String(d).slice(0, 200); }
}
function fact(l, v) { return h('div.fact', h('div.l', l), h('div.v', v)); }
function trackingUrl(envio, num) {
  if (!num) return '';
  const e = CL.norm(envio);
  if (e.includes('correos express')) return 'https://s.correosexpress.com/SeguimientoSinCP/search?n=' + encodeURIComponent(num);
  if (e.includes('correos')) return 'https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=' + encodeURIComponent(num);
  if (e.includes('inpost')) return 'https://inpost.es/seguimiento?number=' + encodeURIComponent(num);
  if (e.includes('seur')) return 'https://www.seur.com/livetracking/?segOnlineIdentificador=' + encodeURIComponent(num);
  if (e.includes('gls')) return 'https://gls-group.com/ES/es/seguimiento-envios?match=' + encodeURIComponent(num);
  if (e.includes('mrw')) return 'https://www.mrw.es/seguimiento_envios/MRW_resultados_consultas.asp?modo=nacional&envio=' + encodeURIComponent(num);
  return 'https://www.google.com/search?q=' + encodeURIComponent((envio || '') + ' seguimiento ' + num);
}

async function save(o, changes, label) {
  const orig = {}; Object.keys(changes).forEach(k => { orig[k] = o[k] === undefined ? '' : o[k]; });
  try {
    const r = await mutate('pedidos.guardar', { id: o.id, datos: changes, orig }, { label: label || 'Pedido nº ' + o.numero, tables: ['pedidos'], optimistic: t => { const x = t.pedidos.find(p => p.id === o.id); if (x) Object.assign(x, changes, { actualizado: new Date().toISOString(), actualizadoPor: S.me.nombre }); } });
    if (r && r.id) { upsertLocal('pedidos', r); emit(); }
    toast(r && r.queued ? 'Guardado en este dispositivo. Se enviará al volver la conexión.' : 'Pedido nº ' + o.numero + ' actualizado', r && r.queued ? 'warn' : 'ok');
    return true;
  } catch (e) { handleError(e, 'pedidos'); return false; }
}
function changeState(o, estado, extra) {
  const ch = Object.assign({ estado }, extra || {});
  const st = S.cfg.pedidos.estados.find(s => s.k === estado) || {};
  if (st.shipped && !o.fechaEnvio && !ch.fechaEnvio) ch.fechaEnvio = S.hoy;
  if (st.done && !o.fechaEntrega) ch.fechaEntrega = S.hoy;
  return save(o, ch, 'Estado de nº ' + o.numero + ' → ' + estado);
}
function stateDialog(o) {
  const groups = { entrada: 'Entrada', produccion: 'Producción', preparacion: 'Preparación', envio: 'Envío', fin: 'Final', incidencia: 'Incidencia' };
  const m = modal('Cambiar estado · nº ' + o.numero, h('div.col', Object.keys(groups).map(g => {
    const list = S.cfg.pedidos.estados.filter(s => s.g === g);
    if (!list.length) return null;
    return h('div', h('div.lbl', { style: { marginBottom: '6px' } }, groups[g]), h('div.row.wrap', list.map(s => h('button.btn' + (s.k === o.estado ? '.primary' : ''), { onclick: () => { m.close(); if (s.issue) issueDialog(o); else if (s.shipped && !o.seguimiento) shipDialog(o, s.k); else changeState(o, s.k); } }, h('span.pill', { style: { background: 'transparent', padding: 0 } }, h('span.d', { style: { background: s.c } })), s.k))));
  })), null, { size: 'narrow' });
}
function shipDialog(o, estado) {
  const envio = sel([''].concat(S.cfg.pedidos.envios), o.envio);
  const seg = inp({ value: o.seguimiento || '', placeholder: 'Ej.: PK123456789ES' });
  const fecha = inp({ type: 'date', value: S.hoy });
  modal('Enviar pedido nº ' + o.numero, h('div.form', field('Transportista / método', envio), field('Nº de seguimiento', seg, 'Si no tiene, déjalo vacío.'), field('Fecha de envío', fecha)), close => [
    btn('Cancelar', close),
    btn('Marcar como enviado', async () => { close(); await changeState(o, estado || 'Enviado', { envio: envio.value, seguimiento: seg.value.trim(), fechaEnvio: fecha.value }); const x = byId('pedidos', o.id); if (x) messageDialog(x, 'enviado'); }, { cls: 'primary', icon: 'truck' })], { size: 'narrow' });
}
function issueDialog(o) {
  const t = area({ value: o.incidencia || '', placeholder: 'Qué ha pasado: pieza rota, cliente no responde, paquete perdido…' });
  modal('Incidencia · nº ' + o.numero, field('Descripción', t), close => [btn('Cancelar', close), btn('Guardar incidencia', () => { if (!t.value.trim()) return toast('Describe la incidencia', 'warn'); close(); changeState(o, 'Incidencia', { incidencia: t.value.trim() }); }, { cls: 'danger solid' })], { size: 'narrow' });
}
async function delOrder(o, done) {
  if (!await confirmDlg('Borrar pedido nº ' + o.numero, 'Se moverá a la papelera y se podrá restaurar. ¿Seguro?', 'Borrar', true)) return;
  try { await mutate('pedidos.borrar', { id: o.id }, { onlineOnly: true, label: 'Borrar nº ' + o.numero }); removeLocal('pedidos', o.id); emit(); toast('Pedido en la papelera', 'ok'); done(); }
  catch (e) { handleError(e, 'pedidos'); }
}
function messageDialog(o, kind) {
  const emp = S.cfg.empresa.nombre;
  const name = String(o.cliente || '').split(/\s|@/)[0];
  const T = {
    enviado: `¡Hola ${name}! 😊 Tu pedido de ${o.producto} ya está en camino.` + (o.seguimiento ? `\nNº de seguimiento: ${o.seguimiento}` + (o.envio ? ` (${o.envio})` : '') : '') + `\n¡Gracias por confiar en ${emp}!`,
    fabricacion: `¡Hola ${name}! Ya estamos fabricando tu ${o.producto}. Te aviso en cuanto salga. ✨`,
    retraso: `¡Hola ${name}! Te escribo para avisarte de que tu ${o.producto} va a tardar un poco más de lo previsto. Siento las molestias, te mantengo informada/o. 🙏`,
    gracias: `¡Hola ${name}! Muchas gracias por tu compra 💜 Si te ha gustado, nos ayudaría muchísimo una valoración. ¡Hasta pronto!`
  };
  const s = sel([{ v: 'enviado', t: 'Pedido enviado' }, { v: 'fabricacion', t: 'En fabricación' }, { v: 'retraso', t: 'Aviso de retraso' }, { v: 'gracias', t: 'Gracias / pedir valoración' }], kind || 'enviado');
  const t = area({ value: T[s.value], style: { minHeight: '140px' } });
  s.addEventListener('change', () => { t.value = T[s.value]; });
  modal('Mensaje para ' + o.cliente, h('div.col', field('Plantilla', s), field('Texto (puedes cambiarlo)', t), h('p.tiny.muted', 'Cópialo y pégalo en Vinted, Wallapop, WhatsApp…')), close => [btn('Cerrar', close), btn('Copiar', () => { copyText(t.value); close(); }, { cls: 'primary', icon: 'copy' })]);
}

// ---------- Formulario (nuevo / editar) ----------
export function orderForm(o, duplicate) {
  const isNew = !o || !o.id;
  o = o || {};
  const cfg = S.cfg.pedidos;
  const dlC = h('datalist', { id: 'dl-clientes' }, S.t.clientes.map(c => h('option', { value: c.nombre })));
  const dlP = h('datalist', { id: 'dl-productos' }, S.t.productos.map(p => h('option', { value: p.nombre }, p.id)));
  const f = {
    cliente: inp({ value: o.cliente || '', list: 'dl-clientes', placeholder: 'Nombre o usuario (Vinted, Instagram…)', autocomplete: 'off' }),
    producto: inp({ value: o.producto || '', list: 'dl-productos', placeholder: 'Producto', autocomplete: 'off' }),
    cantidad: inp({ type: 'number', min: 1, step: 1, value: o.cantidad || 1 }),
    precio: inp({ type: 'number', min: 0, step: 0.01, value: o.precio ?? '', placeholder: 'Se rellena con el precio del producto' }),
    canal: sel([''].concat(cfg.canales), o.canal || ''),
    plazoDias: inp({ type: 'number', min: 0, max: 365, value: o.plazoDias ?? cfg.plazoDias }),
    prioridad: sel(['Normal', 'Urgente'], o.prioridad || 'Normal'),
    responsable: sel([{ v: '', t: 'Sin asignar' }].concat(S.t.usuarios.filter(u => u.activo).map(u => ({ v: u.nombre, t: u.nombre }))), o.responsable || ''),
    color: inp({ value: o.color || '', placeholder: 'Ej.: rosa pastel' }),
    personalizacion: area({ value: o.personalizacion || '', placeholder: 'Nombre grabado, medidas, dedicatoria…', style: { minHeight: '64px' } }),
    notas: area({ value: o.notas || '', style: { minHeight: '64px' } }),
    numero: inp({ value: isNew ? '' : o.numero || '', placeholder: 'Automático' }),
    fecha: inp({ type: 'date', value: (isNew && !duplicate) ? S.hoy : (o.fecha || S.hoy) }),
    envio: sel([''].concat(cfg.envios), o.envio || ''),
    seguimiento: inp({ value: o.seguimiento || '' }),
    entregaEstimada: inp({ type: 'date', value: o.entregaEstimada || '' })
  };
  const limitTxt = h('span.small.muted');
  const clientInfo = h('div.small.muted');
  const updLimit = () => { const d = CL.addDays(f.fecha.value, f.plazoDias.value); limitTxt.textContent = d ? 'Fecha límite: ' + fdate(d, true) + ' (' + (CL.days(S.hoy, d) >= 0 ? 'quedan ' + CL.days(S.hoy, d) + ' días' : 'ya vencida') + ')' : ''; };
  const updClient = () => {
    const c = S.t.clientes.find(x => CL.norm(x.nombre) === CL.norm(f.cliente.value));
    if (!f.cliente.value.trim()) { clientInfo.textContent = ''; return; }
    if (!c) { clientInfo.textContent = '✨ Cliente nuevo: se creará automáticamente.'; return; }
    const st = clientStats()[c.id];
    clientInfo.textContent = st ? `${st.pedidos} pedidos anteriores · ${st.etiquetas.map(e => e.i + ' ' + e.t).join(' · ') || 'cliente registrado'}` : '';
  };
  const updPrice = () => {
    const p = S.t.productos.find(x => CL.norm(x.nombre) === CL.norm(f.producto.value));
    if (p && !f.precio.value) { const calc = S.t.calculadora.find(c => c.nombre === p.nombre); const pr = p.precio || (calc && calc.precioVenta) || ''; if (pr) f.precio.value = pr; }
  };
  // ---- Asistente de precio: coste, beneficio, margen y descuento con los datos reales ----
  const assist = h('div.price-assist');
  const updAssist = () => {
    if (!f.producto.value.trim()) { mount(assist, null); return; }
    const p = S.t.productos.find(x => CL.norm(x.nombre) === CL.norm(f.producto.value));
    const a = CL.orderAssist({ id: o.id, producto: f.producto.value, productoId: p ? p.id : '', cliente: f.cliente.value, cantidad: f.cantidad.value, precio: f.precio.value }, S.t, S.cfg, S.hoy);
    const costs = can('productos.costes');
    const pc = x => x === null || x === undefined ? '—' : Math.round(x * 100) + ' %';
    const box = (l, v, cls) => h('div.pa-k' + (cls ? '.' + cls : ''), h('span.l', l), h('span.v', v));
    mount(assist, h('div.pa-head', '🤖 Asistente de precio', a.fuente ? h('span.tiny.muted', ' · ' + a.fuente) : null),
      h('div.pa-grid',
        box('Precio sugerido', a.sugerido ? eur(a.sugerido) : '—', 'brand'),
        costs ? box('Coste', a.coste !== null ? eur(a.coste) : 'sin datos') : null,
        costs ? box('Beneficio' + (a.cantidad > 1 ? ' (' + a.cantidad + ' uds.)' : ''), a.beneficio !== undefined ? eur(a.beneficio) : '—', a.beneficio < 0 ? 'bad' : '') : null,
        costs ? box('Margen', pc(a.margen), a.margen !== undefined && a.margen < ((S.cfg.alertas && S.cfg.alertas.margenMinimo) || 0.15) ? 'warn' : '') : null,
        box('Descuento recomendado', a.descuentoRecomendado ? pc(a.descuentoRecomendado) + (a.sugerido ? ' → ' + eur(CL.sale.discount(a.sugerido, a.descuentoRecomendado)) : '') : 'ninguno')),
      a.anteriorCliente ? h('div.tiny.muted', 'Este cliente pagó ' + eur(a.anteriorCliente) + ' la última vez.') : a.anterior ? h('div.tiny.muted', 'Último precio de venta de este producto: ' + eur(a.anterior) + ' (' + a.ventasPrevias + ' ventas).') : null,
      costs && a.descuentoMax !== null && a.descuentoMax !== undefined ? h('div.tiny.muted', 'Descuento máximo sin bajar del margen mínimo: ' + pc(a.descuentoMax) + (a.minimo ? ' · precio mínimo ' + eur(a.minimo) : '')) : null,
      a.notas.map(n => h('div.tiny', '💡 ' + n)),
      costs ? a.avisos.map(n => h('div.tiny.warn-t', n)) : null,
      h('div.row.wrap', a.sugerido && Number(f.precio.value) !== a.sugerido ? btn('Usar ' + eur(a.sugerido), () => { f.precio.value = a.sugerido; updAssist(); }, { cls: 'sm' }) : null,
        a.descuentoRecomendado && a.sugerido ? btn('Aplicar descuento (' + pc(a.descuentoRecomendado) + ')', () => { f.precio.value = CL.sale.discount(a.sugerido, a.descuentoRecomendado); updAssist(); }, { cls: 'sm ghost' }) : null,
        h('span.tiny.muted', 'El precio se puede cambiar a mano.')));
  };
  [f.fecha, f.plazoDias].forEach(x => x.addEventListener('input', updLimit));
  f.cliente.addEventListener('input', () => { updClient(); updAssist(); }); f.producto.addEventListener('change', () => { updPrice(); updAssist(); });
  [f.producto, f.cantidad, f.precio].forEach(x => x.addEventListener('input', updAssist));
  updLimit(); updClient();
  const msg = h('p.bad-t');
  const body = h('div.col', dlC, dlP,
    h('div.form', field('Cliente *', f.cliente, null, 'full'), h('div.full', clientInfo), field('Producto *', f.producto, 'Elige uno del catálogo o escribe uno nuevo.', 'full'), field('Cantidad', f.cantidad), field('Precio por unidad (€)', f.precio), h('div.full', assist),
      field('Canal / tienda', f.canal), field('Prioridad', f.prioridad), field('Plazo para prepararlo (días)', f.plazoDias), field('Responsable', f.responsable), h('div.full', limitTxt)),
    h('details.more', h('summary', 'Personalización y notas'), h('div.in.form', field('Color', f.color), h('div'), field('Personalización', f.personalizacion, null, 'full'), field('Notas internas', f.notas, null, 'full'))),
    h('details.more', h('summary', 'Número, fecha y envío'), h('div.in.form', field('Nº de pedido', f.numero, 'Vacío = número automático. Puedes poner el de Vinted/Etsy.'), field('Fecha del pedido', f.fecha), field('Método de envío', f.envio), field('Nº de seguimiento', f.seguimiento), field('Entrega estimada', f.entregaEstimada))),
    msg);
  const m = modal(isNew ? 'Nuevo pedido' : 'Editar pedido nº ' + o.numero, body, close => [btn('Cancelar', close), btn(isNew ? 'Crear pedido' : 'Guardar cambios', async (ev) => {
    msg.textContent = '';
    const datos = {};
    Object.keys(f).forEach(k => { let v = f[k].value; if (typeof v === 'string') v = v.trim(); if (['cantidad', 'precio', 'plazoDias'].includes(k) && v !== '') v = Number(v); datos[k] = v; });
    if (!datos.cliente) return msg.textContent = 'Indica el cliente.';
    if (!datos.producto) return msg.textContent = 'Indica el producto.';
    if (!(datos.cantidad > 0)) return msg.textContent = 'La cantidad debe ser mayor que 0.';
    if (!datos.numero) delete datos.numero;
    const b = ev.target.closest('button'); b.disabled = true;
    try {
      if (isNew) {
        const id = uid('o');
        const r = await mutate('pedidos.guardar', { id, datos }, { label: 'Nuevo pedido de ' + datos.cliente, tables: ['pedidos'], optimistic: t => t.pedidos.push(Object.assign({ id, numero: datos.numero || '(pendiente)', estado: 'Nuevo', creado: new Date().toISOString(), creadoPor: S.me.nombre, version: 0 }, datos)) });
        if (r && r.id) { upsertLocal('pedidos', r); emit(); }
        close();
        toast(r && r.queued ? 'Pedido guardado en este dispositivo: se enviará al volver la conexión.' : 'Pedido nº ' + r.numero + ' creado', r && r.queued ? 'warn' : 'ok');
        go('pedidos/' + id);
      } else {
        const ch = {}; Object.keys(datos).forEach(k => { if (String(datos[k] ?? '') !== String(o[k] ?? '')) ch[k] = datos[k]; });
        if (!Object.keys(ch).length) { close(); return; }
        if (await save(o, ch)) close();
      }
    } catch (e) { msg.textContent = e.message; handleError(e, 'pedidos'); } finally { b.disabled = false; }
  }, { cls: 'primary' })], { size: 'wide' });
  updAssist();
  setTimeout(() => { if (!m.el.contains(document.activeElement) || document.activeElement === f.cliente && !f.cliente.value) (o.cliente ? f.producto : f.cliente).focus(); }, 50);
}
