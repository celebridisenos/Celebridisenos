// ================= Pedidos: panel, filtros, ficha y formulario =================
import { menu, h, mount, clear, icon, btn, modal, drawer, toast, eur, fdate, fdt, ago, pill, dueBadge, empty, field, inp, sel, area, debounce, confirmDlg, uid, copyText, avatar, na } from '../ui.js';
import { S, can, mutate, api, timing, stateColor, byId, upsertLocal, removeLocal, emit, clientStats } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { filesSection, filesOf } from '../files.js';
import * as EV from '../envio.js';
import * as ENV from '../envases.js';
import { miniPedido } from '../fotopedido.js'; // v13.10: foto de lo que pidió el cliente
import * as COL from '../colores.js'; // v14.1: selector de colores
import { cuentaSelect, cuentasVenta } from '../cuentas.js'; // v14.1: desde qué cuenta se vendió

const CL = window.CL;
// v11: los filtros van por FASE (no por nombre de estado) y lo terminado hace +30 días se archiva solo
export const ph = o => CL.phaseOf(S.cfg.pedidos, o.estado);
export const archived = o => { const p = ph(o); if (p !== 'entregado' && p !== 'cancelado') return false; const d = o.fechaEntrega || o.fechaEnvio || o.actualizado || o.fecha; return !!d && CL.days(CL.day(d), S.hoy) > 30; };
const PRESETS = [
  { k: 'abiertos', t: 'En curso', f: (o, t) => t.abierto },
  { k: 'urgentes', t: 'Urgentes', cls: 'bad', f: (o, t) => CL.isUrgent(o, t) },
  { k: 'reservas', t: 'Reservas', f: o => ph(o) === 'reserva' },
  { k: 'fabricar', t: 'Por imprimir', f: o => ph(o) === 'confirmado' },
  { k: 'fabricando', t: 'Imprimiendo', f: o => ph(o) === 'impresion' },
  { k: 'postpro', t: 'Acabado', f: o => ph(o) === 'postpro' },
  { k: 'empaquetar', t: 'Empaquetar', f: o => ph(o) === 'empaquetar' },
  { k: 'enviar', t: 'Por enviar', f: o => ph(o) === 'listo' },
  { k: 'enviados', t: 'Enviados', cls: 'ok', f: o => ph(o) === 'enviado' },
  { k: 'completados', t: 'Completados', cls: 'ok', f: o => ph(o) === 'entregado' }, // v16
  { k: 'porcobrar', t: '💶 Por cobrar', cls: 'warn', f: o => (ph(o) === 'enviado' || ph(o) === 'entregado') && !/^s/i.test(String(o.cobrado || '')) },
  { k: 'cobrados', t: '💶 Cobrados', cls: 'ok', f: o => /^s/i.test(String(o.cobrado || '')) && ph(o) !== 'cancelado' },
  { k: 'incidencias', t: 'Incidencias', cls: 'warn', f: (o, t) => t.incidencia },
  { k: 'todos', t: 'Todos', f: o => !archived(o) },
  { k: 'archivo', t: 'Archivados', f: o => archived(o) },
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
  // v13.8.1: los pedidos de un mismo cliente se ven JUNTOS en una fila con su nombre; al pulsarla se despliegan
  st.agrupar = (() => { try { return localStorage.getItem('cd.pedidos.agrupar') !== '0'; } catch (e) { return true; } })();
  const abiertosCli = new Set();
  const agruparBtn = h('button.btn.sm' + (st.agrupar ? '.primary' : ''), { type: 'button', title: 'Ver los pedidos de cada cliente juntos', onclick: () => { st.agrupar = !st.agrupar; try { localStorage.setItem('cd.pedidos.agrupar', st.agrupar ? '1' : '0'); } catch (e) { } agruparBtn.classList.toggle('primary', st.agrupar); drawList(); } }, '👤 Agrupar por cliente');
  const head = h('div.page-head', h('h1', 'Pedidos'), h('div.row',
    can('pedidos.crear') ? btn('Nuevo pedido', () => orderForm(), { cls: 'primary', icon: 'plus' }) : null));
  const kpis = h('div.kpis.compact', { style: { marginBottom: '14px' } });
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
  el.append(head, kpis, h('div.row', { style: { marginBottom: '10px', gap: '8px' } }, h('div.inp-icon.grow', icon('search', 's'), search), agruparBtn), moreFilters, listBox);

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
      if (st.q && !CL.matches([o.numero, o.cliente, o.producto, o.seguimiento, o.notas, o.color, o.personalizacion, o.canal, o.cuenta, o.envio, o.responsable].join(' '), st.q.replace(/^#/, ''))) return false;
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
    const total = rows.reduce((s, x) => s + CL.orderTotal(x.o), 0);
    const mobile = window.innerWidth <= 860;
    // grupos por cliente (misma ficha o mismo nombre), en el orden en que aparece su primer pedido
    const grupos = [];
    if (st.agrupar) {
      const idx = new Map();
      rows.forEach(x => { const k = x.o.clienteId ? 'id:' + x.o.clienteId : 'n:' + CL.norm(x.o.cliente || '—'); if (!idx.has(k)) { idx.set(k, { k, items: [] }); grupos.push(idx.get(k)); } idx.get(k).items.push(x); });
    } else rows.forEach(x => grupos.push({ k: 'o:' + x.o.id, items: [x] }));
    const shownG = grupos.slice(0, st.limit);
    const abierto = k => abiertosCli.has(k) || !!st.q.trim(); // al buscar, se ven desplegados
    const toggle = k => { if (abiertosCli.has(k)) abiertosCli.delete(k); else abiertosCli.add(k); drawList(); };
    const resumen = items => { const c = {}; items.forEach(({ o }) => { c[o.estado] = (c[o.estado] || 0) + 1; }); return Object.keys(c).map(k => pill((c[k] > 1 ? c[k] + ' · ' : '') + k, '', stateColor(k))); };
    const urgente = items => items.map(x => x.t).filter(t => t.abierto && t.limite).sort((a, b) => a.limite.localeCompare(b.limite))[0];
    const mRow = ({ o, t }, hijo) => h('div.item' + (hijo ? '.cli-hijo' : ''), { onclick: () => go('pedidos/' + o.id) },
      miniPedido(o, 46),
      h('div.grow', h('div.row', h('b', 'nº ' + o.numero), hijo ? null : h('span.ellipsis.grow', o.cliente), o.prioridad === 'Urgente' ? pill('Urgente', 'bad') : null),
        h('div.small.muted.ellipsis', (o.cantidad > 1 ? o.cantidad + ' × ' : '') + o.producto, o.color ? [' ', COL.muestras(o.color)] : null, o.cuenta ? h('span.cv-mini', ' · ' + o.cuenta) : null),
        h('div.row.wrap', { style: { marginTop: '4px', gap: '8px' } }, pill(o.estado, '', stateColor(o.estado)), dueBadge(t))),
      h('div.bold', eur(CL.orderTotal(o))));
    const tRow = ({ o, t }, hijo) => h('tr' + (hijo ? '.cli-hijo' : ''), { onclick: () => go('pedidos/' + o.id) },
      h('td.bold.nowrap', o.numero, o.prioridad === 'Urgente' ? h('span', { title: 'Urgente' }, ' ⚡') : null),
      h('td.nowrap', fdate(o.fecha)), h('td', h('div.ellipsis', { style: { maxWidth: '200px' } }, hijo ? h('span.muted', '↳ ') : null, o.cliente)),
      h('td', h('div.row.fp-prod', { style: { gap: '8px', alignItems: 'center', flexWrap: 'nowrap' } }, miniPedido(o, 34), h('div.ellipsis', { style: { maxWidth: '240px' } }, (o.cantidad > 1 ? o.cantidad + ' × ' : '') + o.producto, o.color ? [' ', COL.muestras(o.color)] : null))),
      h('td', pill(o.estado, '', stateColor(o.estado))), h('td', dueBadge(t)), h('td.nowrap', eur(CL.orderTotal(o))),
      h('td', o.responsable || h('span.muted', '—')), h('td', o.canal || h('span.muted', '—'), o.cuenta && o.cuenta.split(' · ')[1] ? h('div.tiny.muted', o.cuenta.split(' · ')[1]) : null));
    const cliTitle = g => (g.items[0].o.cliente || '—');
    // v13.10: «Un paquete, un QR»: junta los pedidos abiertos del cliente en un envío conjunto e imprime UN solo QR para todos
    const abiertosG = g => g.items.map(x => x.o).filter(o => ['reserva', 'confirmado', 'impresion', 'postpro', 'empaquetar', 'listo'].includes(ph(o)) && CL.necesitaEnvio(o));
    const unQr = g => can('pedidos.editar') && abiertosG(g).length > 1 ? btn('📦 1 paquete · 1 QR', ev => { ev.stopPropagation(); unPaquete(abiertosG(g)); }, { cls: 'sm', title: 'Juntar sus pedidos en un solo paquete con un solo QR' }) : null;
    const body = mobile
      ? h('div.list.boxed', shownG.map(g => g.items.length === 1 ? mRow(g.items[0]) : [
          h('div.item.cli-grupo', { onclick: () => toggle(g.k), 'aria-expanded': String(abierto(g.k)) },
            h('div.grow', h('div.row', h('span', abierto(g.k) ? '▾' : '▸'), h('b.ellipsis.grow', '👤 ' + cliTitle(g)), h('span.cli-n', String(g.items.length))),
              h('div.row.wrap', { style: { marginTop: '4px', gap: '6px' } }, resumen(g.items), urgente(g.items) ? dueBadge(urgente(g.items)) : null, unQr(g))),
            h('div.bold', eur(g.items.reduce((s, x) => s + CL.orderTotal(x.o), 0)))),
          abierto(g.k) ? g.items.map(x => mRow(x, true)) : null]))
      : h('div.table-wrap', h('table.t', h('thead', h('tr', ['Nº', 'Fecha', 'Cliente', 'Producto', 'Estado', 'Plazo', 'Importe', 'Responsable', 'Canal'].map(x => h('th', x)))),
          h('tbody', shownG.map(g => g.items.length === 1 ? tRow(g.items[0]) : [
            h('tr.cli-grupo', { onclick: () => toggle(g.k), 'aria-expanded': String(abierto(g.k)) },
              h('td.nowrap', abierto(g.k) ? '▾' : '▸'), h('td', ''),
              h('td', h('div.ellipsis', { style: { maxWidth: '200px' } }, '👤 ' + cliTitle(g), h('span.cli-n', String(g.items.length)))),
              h('td.small.muted', g.items.length + ' pedidos · pulsa para verlos ', unQr(g)),
              h('td', h('div.row.wrap', { style: { gap: '4px' } }, resumen(g.items))), h('td', urgente(g.items) ? dueBadge(urgente(g.items)) : null),
              h('td.nowrap', eur(g.items.reduce((s, x) => s + CL.orderTotal(x.o), 0))), h('td', ''), h('td', '')),
            abierto(g.k) ? g.items.map(x => tRow(x, true)) : null]))));
    mount(listBox, h('div.row.small.muted', { style: { margin: '0 0 8px' } }, h('span', rows.length + (rows.length === 1 ? ' pedido' : ' pedidos')), can('informes.ver') ? h('span', '· ' + eur(total)) : null,
        ['enviar', 'empaquetar'].includes(st.preset) && rows.length ? btn('Imprimir etiquetas (' + rows.length + ')', () => EV.etiquetasEnvio(rows.map(x => x.o)), { cls: 'sm ghost', icon: 'printer' }) : null),
      body, grupos.length > st.limit ? h('div.pager', btn('Mostrar más (' + (grupos.length - st.limit) + ')', () => { st.limit += 100; drawList(); })) : null);
  }
  let openId = null, dr = null;
  function applyParams(p) {
    const pp = parseParams(p);
    if (pp.q.f && PRESETS.some(x => x.k === pp.q.f)) st.preset = pp.q.f;
    if (pp.q.cliente) { st.q = pp.q.cliente; search.value = pp.q.cliente; st.preset = 'todos'; }
    drawKpis(); drawList();
    if (pp.id === 'nuevo') { history.replaceState(null, '', '#/pedidos'); orderForm(); }
    else if (pp.id && (pp.id !== openId || !document.querySelector('.drawer'))) { if (dr && pp.id !== openId) { try { dr.close(); } catch (e) { } } /* v13.7: no apilar fichas al saltar de un pedido a otro */ openId = pp.id; dr = orderDrawer(pp.id, () => { openId = null; dr = null; if (location.hash.startsWith('#/pedidos/' + pp.id)) history.replaceState(null, '', '#/pedidos'); }); }
    // v10.8: QR de la etiqueta → marcar como enviado desde el móvil
    if (pp.id && pp.q.enviar) { const o = byId('pedidos', pp.id); history.replaceState(null, '', '#/pedidos/' + pp.id); if (o && can('pedidos.editar')) { const t = timing(o); if (t.enviado) toast('Este pedido ya estaba enviado (' + o.estado + ').', 'ok'); else setTimeout(() => shipDialog(o), 250); } }
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
  return i >= 0 && i < list.length - 1 ? list[i + 1].k : (i < 0 ? list[0].k : null);
}
// v11: ¿hay piezas libres en la estantería para este pedido? (mismo criterio que el servidor)
export function freePieces(o) {
  const k = CL.norm(o.producto); let fab = 0, out = 0, held = 0;
  (S.t.fabricacion || []).forEach(r => { if (CL.norm(r.producto) === k) fab += Number(r.unidades) || 0; });
  S.t.pedidos.forEach(x => { if (x.id === o.id || CL.norm(x.producto) !== k) return; const p = ph(x), q = Number(x.cantidad) || 1; if (p === 'enviado' || p === 'entregado') out += q; else if (p === 'postpro' || p === 'empaquetar' || p === 'listo') held += q; });
  return fab - out - held;
}
function fromStockBtn(o) {
  if (!['reserva', 'confirmado', 'impresion'].includes(ph(o))) return null;
  const free = freePieces(o), q = Number(o.cantidad) || 1;
  if (free < q) return null;
  return btn('📦 Servir desde stock (' + free + ' en estantería)', async () => {
    try { const r = await mutate('pedidos.desdeStock', { id: o.id }, { onlineOnly: true, label: 'nº ' + o.numero + ' desde stock' }); if (r && r.id) { upsertLocal('pedidos', r); emit(); } toast('Pedido nº ' + o.numero + ' → ' + (r && r.estado), 'ok'); }
    catch (e) { handleError(e, 'pedidos'); }
  }, { cls: 'ok-btn' });
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
      const cobrado = /^s/i.test(String(o.cobrado || '')); // v16
      const tabs = [['resumen', 'Resumen'], can('productos.costes') ? ['beneficio', 'Beneficio'] : null, ['fechas', 'Fechas'], ['envio', 'Envío'], can('taller.ver') ? ['taller', 'Impresión (' + (S.t.trabajos || []).filter(j => j.pedidoId === o.id && j.estado !== 'Cancelado').length + ')'] : null, ['archivos', 'Archivos (' + filesOf('pedidos', o.id).length + ')'], ['tareas', 'Tareas (' + S.t.tareas.filter(k => k.pedidoId === o.id).length + ')'], ['historial', 'Historial']].filter(Boolean);
      if (!tabs.some(x => x[0] === tab)) tab = 'resumen';
      const body = h('div');
      mount(d,
        h('div.drawer-h', miniPedido(o, 76, 'grande'), h('div.grow', h('h2', 'Pedido nº ' + o.numero), h('div.row.wrap', { style: { gap: '8px', marginTop: '4px' } }, pill(o.estado, '', stateColor(o.estado)), dueBadge(t), o.prioridad === 'Urgente' ? pill('⚡ Urgente', 'bad') : null, cobrado ? pill('💶 Cobrado', 'ok') : null, o.codigo ? h('code.small', { title: 'Código interno del paquete (va en su QR)' }, o.codigo) : null)),
          btn('', closeAll, { cls: 'ghost icon', icon: 'x', title: 'Cerrar' })),
        h('div.drawer-b.col', { style: { gap: '14px' } },
          h('div.flow', { title: 'Progreso' }, states.map((s, i) => h('div.fs' + (i < idx ? '.done' : i === idx ? '.on' : '') + (i === idx && o.incidencia ? '.bad' : ''), { title: s.hint || s.k }, h('i'), h('span', s.k))),
            h('div.fs.fs-cobro' + (cobrado ? '.done' : ''), { title: cobrado ? 'Cobrado el ' + fdate(o.cobradoEn) : 'Todavía sin cobrar' }, h('i'), h('span', '💶 Cobrado'))), // v16
          o.incidencia && t.abierto ? h('div.issue-bar', icon('alert', 's'), h('span.grow', h('b', 'Incidencia: '), o.incidencia), editable ? btn('Resuelta', () => save(o, { incidencia: '' }, 'Incidencia resuelta · nº ' + o.numero), { cls: 'sm', icon: 'check' }) : null) : null,
          t.abierto || t.enviado ? EV.labelRow(o, draw) : null,
          t.abierto || t.enviado ? EV.conjuntoBlock(o, draw) : null, // v13.8: envío conjunto
          ENV.bloquePedido(o, draw), // v13.9: EMBALAJE DEL PEDIDO
          editable ? h('div.row.wrap',
            nx && !(ph(o) === 'listo' && nx && S.cfg.pedidos.estados.find(s => s.k === nx && s.shipped)) ? btn('Pasar a: ' + nx, () => changeState(o, nx), { cls: 'primary', icon: 'check' }) : null,
            !t.enviado && !t.cancelado ? btn(ph(o) === 'listo' ? 'Preparado para enviar' : 'Enviar pedido', () => ['listo', 'empaquetar'].includes(ph(o)) ? EV.sendCheck(o) : shipDialog(o), { icon: 'truck', cls: ph(o) === 'listo' ? 'primary' : '' }) : null,
            fromStockBtn(o),
            !t.cancelado ? (cobrado ? btn('💶 Cobrado ✓', () => confirmDlg('¿Quitar el cobro?', 'El pedido nº ' + o.numero + ' dejará de contar en los ingresos de su mes.', 'Quitar cobro', true).then(ok => ok && import('./ingresos.js').then(m => m.cobrarPedido(o, false)).then(draw)), { cls: 'ok-b', title: 'Cobrado el ' + fdate(o.cobradoEn) + '. Pulsa para quitarlo.' })
              : btn('💶 Marcar cobrado', () => import('./ingresos.js').then(m => m.cobrarPedido(o)).then(draw), { cls: t.enviado ? 'primary' : '', title: 'El importe entra solo en los ingresos del mes' })) : null, // v16
            ['postpro', 'empaquetar', 'listo'].includes(ph(o)) ? btn('📦 Embalaje', () => import('./embalaje.js').then(E => E.packPanel(o.id)), { cls: ph(o) === 'empaquetar' ? 'primary' : '' }) : null,
            btn('Cambiar estado', () => stateDialog(o), { icon: 'refresh' }),
            !o.incidencia && t.abierto ? btn('Incidencia', () => issueDialog(o), { icon: 'alert', cls: 'danger' }) : null)
            : h('p.small.muted', 'Solo lectura: no tienes permiso para cambiar pedidos.'),
          h('div.tabs', tabs.map(x => h('button' + (tab === x[0] ? '.on' : ''), { onclick: () => { tab = x[0]; draw(); } }, x[1]))),
          body,
          h('div.row.wrap', { style: { marginTop: '10px', borderTop: '1px solid var(--line)', paddingTop: '14px' } },
            editable ? btn('Editar', () => orderForm(o), { icon: 'edit' }) : null,
            !t.cancelado ? btn('🏷️ Etiqueta de envío', () => EV.etiquetaEnvio(o, draw), { title: 'La etiqueta que adjuntaste (Vinted, Wallapop, Correos…), tal cual' }) : null,
            btn('Mensaje', () => messageDialog(o), { icon: 'msg' }),
            can('facturas.emitir') ? btn(o.factura ? 'Factura ' + o.factura : 'Factura', () => import('./facturas.js').then(m => m.invoiceForm(o)), { icon: 'file' }) : null,
            h('span.grow'),
            menu('Más', [
              can('ia.usar') ? { t: 'Responder con IA', icon: 'sparkles', on: () => import('./respuestas.js').then(m => m.replyAssistant({ pedido: o })) } : null,
              can('taller.editar') && t.abierto && !t.enviado ? { t: 'Imprimir en 3D', icon: 'cube', on: () => import('./taller.js').then(m => m.jobForm(null, o)) } : null,
              can('pedidos.crear') ? { t: 'Duplicar', icon: 'copy', on: () => orderForm(Object.assign({}, o, { id: '', numero: '', fecha: '', estado: '', seguimiento: '', fechaEnvio: '', fechaEntrega: '', incidencia: '' }), true) } : null,
              can('pedidos.editar') ? { t: o.regalo && o.regalo.token ? 'Regalo con QR ✓' : 'Regalo con QR', icon: 'gift', on: () => import('../regalo.js').then(m => m.giftDialog(o)) } : null,
              editable ? { t: '🎥 Prueba de empaquetado (vídeo)', icon: 'camera', on: () => import('./embalaje.js').then(E => E.captureSaleProof(o, { suelta: true })) } : null, // v14.1: cuando quieras, sin obligar
              { t: 'Etiqueta QR del pedido', icon: 'printer', on: () => import('../labels.js').then(L => L.labelDialog('qr', [L.dataFor('qr', { tipo: 'pedido', id: o.id, titulo: 'Pedido nº ' + o.numero })])) },
              can('pedidos.borrar') ? { t: 'Borrar', icon: 'trash', danger: true, on: () => delOrder(o, closeAll) } : { t: 'Borrar (pedir permiso)', icon: 'lock', on: () => requestAccess('pedidos.borrar', 'pedidos', 'Borrar pedido nº ' + o.numero) }
            ]))));
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
      fact('Canal / tienda', na(o.canal)), o.cuenta ? fact('Cuenta de venta', h('b', o.cuenta)) : null, fact('Responsable', na(o.responsable, 'Sin asignar')), fact('Prioridad', o.prioridad || 'Normal')),
      h('h4', { style: { margin: '16px 0 8px' } }, 'Personalización'),
      h('dl.kv', h('dt', 'Color'), h('dd', o.color ? h('span', COL.muestras(o.color), ' ', o.color) : na(o.color)), h('dt', 'Personalización'), h('dd', na(o.personalizacion))),
      o.incidencia ? h('div.card.flat', { style: { background: 'var(--bad-soft)', marginTop: '12px' } }, h('b.bad-t', '⚠️ Incidencia'), h('p', o.incidencia)) : null,
      h('h4', { style: { margin: '16px 0 8px' } }, 'Notas'), o.notas ? h('p', { style: { whiteSpace: 'pre-wrap' } }, o.notas) : h('p.na', 'Sin notas'),
      cs ? h('div.card.flat', { style: { marginTop: '12px' } }, h('div.row', h('b', 'Sobre ' + c.nombre), h('span.tiny.muted', cs.pedidos + ' pedidos · ' + eur(cs.gasto))), h('div.tags', { style: { marginTop: '6px' } }, cs.etiquetas.map(e => pill(e.i + ' ' + e.t, 'brand')))) : null);
  },
  beneficio(el, o) {
    // v11.4: pedidos con el embalaje nuevo → centro de costes (fabricación ≠ embalaje ≠ mano de obra ≠ pérdidas)
    if (o.embalaje && o.embalaje.modelo) {
      import('./embalaje.js').then(E => {
        const c = CL.orderCosts(o, E.packData(), S.cfg);
        mount(el, E.costCenter(c), h('div.row.wrap', btn('📦 Abrir en Embalaje', () => E.packPanel(o.id), { cls: 'sm' }), can('pedidos.editar') ? btn('Envío, comisión y extraordinarios', () => costsDialog(o), { icon: 'euro', cls: 'sm' }) : null,
          can('pedidos.editar') ? btn('Trabajo adicional', () => E.laborDialog(o, true), { cls: 'sm ghost' }) : null),
          h('p.tiny.muted', 'Lo ESTIMADO sale de tus consumos de packaging y de Configuración → Precios. Los extraordinarios (un componente especial, un accesorio…) se apuntan a mano.'));
      });
      return;
    }
    const p = CL.orderProfit(o, S.t, S.cfg);
    const minM = Number((S.cfg.alertas && S.cfg.alertas.margenMinimo) || 0.15);
    const est = x => x ? h('span.est', ' (estimado)') : null;
    const row = (l, v, e) => [h('span.l', l, est(e)), h('span.v', v)];
    mount(el, h('div.card.flat', h('div.profit',
      row('Cobrado al cliente', eur(p.total)),
      row('Fabricación' + (p.costeCongelado ? ' (coste del ' + p.costeCongelado + ')' : '') + (p.unidad !== null && (Number(o.cantidad) || 1) > 1 ? ' (' + (Number(o.cantidad) || 1) + ' × ' + eur(p.unidad) + ')' : ''), p.produccion === null ? h('span.warn-t', 'sin coste') : '− ' + eur(p.produccion)),
      row('Envío que pagaste', '− ' + eur(p.envio), p.envioEstimado),
      row('Comisión ' + (o.canal || 'de la plataforma'), '− ' + eur(p.comision), p.comisionEstimada),
      p.gastos.map(g => row(g.concepto || 'Otro gasto', '− ' + eur(g.coste))),
      h('span.l.sum', 'Beneficio real'), h('span.v.sum' + (p.beneficio !== null && p.beneficio < 0 ? '.bad-t' : ''), p.beneficio === null ? '—' : eur(p.beneficio)),
      h('span.l', 'Margen'), h('span.v', p.margen === null ? '—' : Math.round(p.margen * 100) + ' %'))),
      !p.conCoste ? h('p.small.warn-t', '⚠️ Este producto no tiene coste guardado: añádelo en Productos → Costes y precio para saber el beneficio.') : null,
      p.beneficio !== null && p.beneficio < 0 ? h('p.small.bad-t', '🔴 Con este pedido pierdes dinero.') : p.margen !== null && p.margen < minM ? h('p.small.warn-t', '🟡 Margen por debajo del mínimo (' + Math.round(minM * 100) + ' %).') : p.margen !== null ? h('p.small.ok-t', '🟢 Buen margen.') : null,
      p.envioEstimado || p.comisionEstimada ? h('p.tiny.muted', 'Lo marcado como estimado sale de Configuración → Precios y comisiones. Pon el importe real para que el beneficio sea exacto.') : null,
      can('pedidos.editar') ? btn('Poner costes reales', () => costsDialog(o), { icon: 'euro', cls: 'sm' }) : null,
      h('div', { style: { marginTop: '12px' } }, h('div.cost-snap')));
    // v11.3: coste de fabricación CONGELADO con su desglose (precios del día del pedido)
    import('./costes.js').then(C => { const box = el.querySelector('.cost-snap'); if (box) mount(box, C.orderCostCard(o)); });
  },
  taller(el, o) {
    const js = (S.t.trabajos || []).filter(j => j.pedidoId === o.id && j.estado !== 'Cancelado');
    mount(el, js.length ? h('div.list.boxed', js.map(j => { const p = byId('impresoras', j.impresoraId); return h('div.item', { onclick: () => go('taller') },
      h('span', { Terminado: '✅', Fallido: '❌', Imprimiendo: '🖨️' }[j.estado] || '⏳'), h('div.grow', h('div.small.bold', j.titulo), h('div.tiny.muted', [j.estado, p ? p.nombre : '', (Number(j.horas) || 0) + ' h', j.gramos ? Math.round(j.gramos) + ' g' : '', j.color].filter(Boolean).join(' · ')))); })) : h('p.small.muted', 'Este pedido aún no está en ninguna cola de impresión.'),
      can('taller.editar') ? btn('Mandar a imprimir', () => import('./taller.js').then(m => m.jobForm(null, o)), { icon: 'plus', cls: 'sm' }) : null);
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
      bloqueDatosEnvio(o), c_addr(o));
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
  return h('div.card.flat', { style: { marginTop: '12px' } }, h('div.row', h('b', 'Dirección del cliente (ficha)'), btn('', () => copyText(c.nombre + '\n' + c.direccion + (c.telefono ? '\n' + c.telefono : '')), { cls: 'ghost icon sm', icon: 'copy', title: 'Copiar' })), h('p', { style: { whiteSpace: 'pre-wrap' } }, c.direccion));
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
  const orig = {}; Object.keys(changes).forEach(k => { if (k !== 'trabajoExtra' && k !== 'embalaje') orig[k] = o[k] === undefined ? '' : o[k]; });
  try {
    const r = await mutate('pedidos.guardar', { id: o.id, datos: changes, orig }, { label: label || 'Pedido nº ' + o.numero, tables: ['pedidos'], optimistic: t => { const x = t.pedidos.find(p => p.id === o.id); if (x) Object.assign(x, changes, { actualizado: new Date().toISOString(), actualizadoPor: S.me.nombre }); } });
    if (r && r.id) { upsertLocal('pedidos', r); emit(); }
    toast(r && r.queued ? 'Guardado en este dispositivo. Se enviará al volver la conexión.' : 'Pedido nº ' + o.numero + ' actualizado', r && r.queued ? 'warn' : 'ok');
    return true;
  } catch (e) { handleError(e, 'pedidos'); return false; }
}
// v11.4: al CERRAR el paquete (pasar a «Listo para envío» o más allá desde antes) se pregunta el trabajo adicional
const PACK_BEFORE = { reserva: 1, confirmado: 1, impresion: 1, postpro: 1, empaquetar: 1 };
export async function changeState(o, estado, extra) {
  o = byId('pedidos', o.id) || o;
  const fromPhase = ph(o);
  const to = CL.phaseOf(S.cfg.pedidos, estado);
  const editor = can('pedidos.editar');
  extra = Object.assign({}, extra || {});
  const qrListo = extra._qrInternoListo, pruebaLista = extra._pruebaVentaLista; delete extra._qrInternoListo; delete extra._pruebaVentaLista;
  // v13.8 · QR interno 50 × 50: se imprime al entrar en Postprocesado (o en Empaquetar si se saltó). Antes se pregunta si va junto con otros pedidos del cliente.
  if (editor && !qrListo && (to === 'postpro' || to === 'empaquetar') && to !== fromPhase) {
    if (await EV.conjuntoDialog(o, { auto: true }) === null) return false;
    o = byId('pedidos', o.id) || o;
    if (EV.statusOf(o, 'paquete').estado !== 'Impreso') {
      const g = EV.grupoDe(o);
      if (!await EV.bobinaPaquete('Se imprimirá el QR interno ' + (g.length > 1 ? 'del envío conjunto (nº ' + CL.numerosGrupo(g) + ')' : 'de este pedido') + '.')) return false;
      try { const r = await EV.printOne(o, 'paquete'); if (!r || r.estado !== 'Impreso') return false; }
      catch (e) { toast('No se pudo imprimir el QR interno: ' + e.message, 'bad', 8000); return false; }
    }
  }
  const cierra = PACK_BEFORE[fromPhase] && ['listo', 'enviado', 'entregado'].includes(to);
  if (cierra && !(o.embalaje && o.embalaje.hecho) && !extra.trabajoExtra && (S.cfg.embalaje || {}).preguntarTrabajo !== false && editor) {
    const E = await import('./embalaje.js');
    const tr = await E.askLabor(o);
    if (!tr) return false; // cancelado: no se cambia nada
    extra.trabajoExtra = tr;
  }
  if (cierra && editor && !pruebaLista) {
    const atras = EV.grupoDe(o).filter(p => p.id !== o.id && CL.PHASES.indexOf(ph(p)) < CL.PHASES.indexOf('postpro'));
    if (atras.length && !await confirmDlg('Envío conjunto sin terminar', 'En este paquete también va ' + atras.map(p => 'el nº ' + p.numero + ' (' + p.estado + ')').join(', ') + '. ¿Cerrar el paquete igualmente?', 'Sí, cerrar el paquete')) return false;
  }
  // Cualquier acceso (Hoy, escáner, ficha o cambio manual) guarda la PRUEBA DE EMPAQUETADO antes de cerrar (una por paquete).
  if (cierra && editor && !pruebaLista && (S.cfg.embalaje || {}).pedirPrueba !== false) { // v14.1: se ofrece, no se exige («Seguir sin vídeo»)
    const EM = await import('./embalaje.js');
    if (!await EM.captureSaleProof(o)) return false;
  }
  // Al pasar a Enviado, exige la etiqueta adjunta e imprime en 100 × 150 si aún falta.
  if (to === 'enviado' && fromPhase !== 'enviado' && editor && CL.necesitaEnvio(o)) { // (una venta en persona no lleva etiqueta)
    if (!EV.hasLabelEnvio(o)) { if (!await confirmDlg('Sin etiqueta de envío', 'Este pedido no tiene adjunta la etiqueta de envío de 100 × 150 mm. ¿Lo marcas como enviado igualmente?', 'Sí, enviado sin etiqueta')) return false; }
    else if (EV.statusOf(o, 'oficial').estado !== 'Impreso' && !await EV.offerOfficialLabel(o)) return false;
  }
  const grupo = EV.grupoDe(o);
  const ok = await applyState(o, estado, extra);
  // v13.8: en un envío conjunto todo el paquete cambia a la vez (sin repetir preguntas: el trabajo ya se apuntó en este pedido)
  if (ok && grupo.length > 1 && ['listo', 'enviado', 'entregado'].includes(to)) {
    const comun = {}; ['seguimiento', 'envio', 'fechaEnvio', 'fechaEntrega'].forEach(k => { if (extra[k] !== undefined) comun[k] = extra[k]; });
    for (const p0 of grupo) {
      const p = byId('pedidos', p0.id) || p0;
      if (p.id === o.id || p.estado === estado || CL.PHASES.indexOf(ph(p)) > CL.PHASES.indexOf(to)) continue;
      const ex = Object.assign({}, comun);
      if (PACK_BEFORE[ph(p)] && ['listo', 'enviado', 'entregado'].includes(to) && !(p.embalaje && p.embalaje.hecho) && !p.trabajoExtra) ex.trabajoExtra = { lineas: [] };
      await applyState(p, estado, ex, true);
    }
  }
  if (ok && to === 'listo' && fromPhase !== 'listo' && CL.necesitaEnvio(o)) await EV.offerOfficialLabel(byId('pedidos', o.id) || o);
  return ok;
}
async function applyState(o, estado, extra, quiet) {
  const ch = Object.assign({ estado }, extra || {});
  const st = S.cfg.pedidos.estados.find(s => s.k === estado) || {};
  if (st.shipped && !o.fechaEnvio && !ch.fechaEnvio) ch.fechaEnvio = S.hoy;
  if (st.done && !o.fechaEntrega) ch.fechaEntrega = S.hoy;
  return save(o, ch, 'Estado de nº ' + o.numero + ' → ' + estado);
}
export function stateDialog(o) {
  const groups = { entrada: 'Entrada', produccion: 'Producción', preparacion: 'Preparación', envio: 'Envío', fin: 'Final', incidencia: 'Incidencia' };
  const m = modal('Cambiar estado · nº ' + o.numero, h('div.col', Object.keys(groups).map(g => {
    const list = S.cfg.pedidos.estados.filter(s => s.g === g);
    if (!list.length) return null;
    return h('div', h('div.lbl', { style: { marginBottom: '6px' } }, groups[g]), h('div.row.wrap', list.map(s => h('button.btn' + (s.k === o.estado ? '.primary' : ''), { onclick: () => { m.close(); if (s.issue) issueDialog(o); else if (s.shipped && !o.seguimiento) shipDialog(o, s.k); else changeState(o, s.k); } }, h('span.pill', { style: { background: 'transparent', padding: 0 } }, h('span.d', { style: { background: s.c } })), s.k))));
  })), null, { size: 'narrow' });
}
// ---------- v13.7 · DATOS DEL ENVÍO ----------
// Empresa de transporte (se guarda en «envio», el campo de siempre) · Dirección de envío de ESTE pedido (no cambia la ficha del cliente) · Observaciones.
const otraEmpresa = x => /^otr[oa]s?$/i.test(String(x || '').trim());
export function empresasEnvio() { return (S.cfg.pedidos.envios || []).filter(x => !CL.esRecogida(x) && !otraEmpresa(x)); }
export function datosEnvioDialog(o, opts = {}) {
  return new Promise(resolve => {
    let hecho = false; const fin = v => { if (!hecho) { hecho = true; resolve(v); } };

    const c = byId('clientes', o.clienteId);
    const dirCli = c && c.direccion && c.direccion !== '•••' ? String(c.direccion) : '';
    const pw = o.refWeb ? (S.t.pedidosWeb || []).find(x => x.id === o.refWeb) : null;
    const dirWeb = pw && pw.direccion && pw.direccion !== '•••' ? String(pw.direccion) : '';
    const oculta = o.direccionEnvio === '•••';
    const dir = area({ rows: 3, maxlength: 300, value: oculta ? '' : (o.direccionEnvio || dirWeb || dirCli), placeholder: oculta ? 'Ya hay una dirección guardada (no tienes permiso para verla)' : 'Calle y número, piso · código postal y ciudad · provincia', 'aria-label': 'Dirección de envío' });
    const obs = area({ rows: 2, maxlength: 500, value: o.obsEnvio || '', placeholder: 'Ej.: entregar por la tarde · frágil · llamar antes de ir', 'aria-label': 'Observaciones del envío' });
    const err = h('div');
    const ref = dirCli && !oculta ? h('div.tiny.muted', 'Dirección de la ficha del cliente: ', h('span', dirCli), ' ', h('button.btn.sm.ghost', { type: 'button', onclick: () => { dir.value = dirCli; } }, 'Usar esta')) : null;
    const recogida = (S.cfg.pedidos.envios || []).find(x => CL.esRecogida(x)) || 'Entrega en mano';
    modal('📮 Datos del envío · nº ' + o.numero, h('div.col.datos-envio', { style: { gap: '10px' } },
      h('p.small.muted', 'Completa la dirección y las observaciones solo si te hacen falta.'),
      h('label.field', h('span.lbl', 'Dirección de envío'), dir, h('span.tiny.muted', 'Es la dirección a la que va ESTE paquete. La ficha del cliente no cambia.')), ref,
      h('label.field', h('span.lbl', 'Observaciones del envío'), obs),
      err), close => [
      btn('Cancelar', () => { close(); fin(null); }),
      opts.sinRecogida ? null : btn('No se envía (recogida en persona)', () => { fin({ envio: recogida }); close(); }, { cls: 'ghost', title: 'No pide datos de transporte' }),
      btn('Guardar datos del envío', () => {
        const d = dir.value.trim();
        if (!d && !oculta) return mount(err, h('p.small', { style: { color: 'var(--bad, #b91c1c)' } }, 'Escribe la dirección de envío.'));
        const r = { obsEnvio: obs.value.trim() }; if (d) r.direccionEnvio = d; fin(r); close(); // (primero el resultado: al cerrar se resolvería «cancelado»)
      }, { cls: 'primary', icon: 'truck' })], { size: 'narrow', onclose: () => fin(null) });
  });
}
export async function editarDatosEnvio(o) {
  const r = await datosEnvioDialog(o, { sinRecogida: false });
  if (r) await save(o, r, 'Datos del envío de nº ' + o.numero);
}
function bloqueDatosEnvio(o) {
  const necesita = CL.necesitaEnvio(o), falta = CL.datosEnvioFalta(o);
  const dir = o.direccionEnvio === '•••' ? h('span.muted', 'Guardada (sin permiso para verla)') : o.direccionEnvio ? h('span', { style: { whiteSpace: 'pre-wrap' } }, o.direccionEnvio) : na('Sin indicar');
  return h('div.card.flat.datos-envio-ficha', { style: { marginTop: '12px' } },
    h('div.row', h('b.grow', '📮 DATOS DEL ENVÍO'), can('pedidos.editar') ? btn('Editar', () => editarDatosEnvio(o), { cls: 'sm', icon: 'edit' }) : null),
    !necesita ? h('p.small', '🤝 ' + (o.envio || 'Venta en persona') + ': no se envía, no hacen falta datos de transporte.') :
      h('div.facts', fact('Empresa de transporte', o.envio && !otraEmpresa(o.envio) ? o.envio : na('Sin indicar')), fact('Dirección de envío', dir), fact('Observaciones', o.obsEnvio ? h('span', { style: { whiteSpace: 'pre-wrap' } }, o.obsEnvio) : na('Ninguna'))),
    necesita && falta.includes('dirección de envío') ? h('p.tiny.muted', 'Sin dirección de envío guardada: vale la que lleva la etiqueta de envío adjunta. La empresa de transporte es opcional.') : null);
}
export async function shipDialog(o, estado) {
  const seg = inp({ value: o.seguimiento || '', placeholder: 'Opcional' });
  const fecha = inp({ type: 'date', value: S.hoy });
  const coste = inp({ type: 'number', min: 0, step: 0.01, value: o.costeEnvio ?? '', placeholder: 'Ej.: 3,20' });
  const g = EV.grupoDe(o);
  modal((g.length > 1 ? 'Enviar el envío conjunto nº ' + CL.numerosGrupo(g) : 'Enviar pedido nº ' + o.numero), h('div.form', h('p.small', 'El QR es interno. El transportista no hace falta para cambiar el estado.' + (g.length > 1 ? ' Se marcan como enviados todos los pedidos del paquete.' : '')), field('Nº de seguimiento (opcional)', seg), field('Fecha de envío', fecha), field('Coste del envío (€) (opcional)', coste)), close => [
    btn('Cancelar', close),
    btn('Marcar como enviado', async () => { close(); const ex = { seguimiento: seg.value.trim(), fechaEnvio: fecha.value }; if (coste.value !== '') ex.costeEnvio = Number(coste.value); const ok = await changeState(o, estado || 'Enviado', ex); const x = byId('pedidos', o.id); if (ok && x) messageDialog(x, 'enviado'); }, { cls: 'primary', icon: 'truck' })], { size: 'narrow' });
}

export function issueDialog(o) {
  const t = area({ value: o.incidencia || '', placeholder: 'Qué ha pasado: pieza rota, cliente no responde, paquete perdido…' });
  modal('Incidencia · nº ' + o.numero, h('div.col', field('Descripción', t), h('p.tiny.muted', 'El pedido sigue en su paso (' + o.estado + ') con una marca roja hasta que la marques como resuelta. Se avisa al equipo.')), close => [btn('Cancelar', close), btn('Guardar incidencia', () => { if (!t.value.trim()) return toast('Describe la incidencia', 'warn'); close(); save(o, { incidencia: t.value.trim() }, 'Incidencia en nº ' + o.numero); }, { cls: 'danger solid' })], { size: 'narrow' });
}
async function delOrder(o, done) {
  if (!await confirmDlg('Borrar pedido nº ' + o.numero, 'Se moverá a la papelera y se podrá restaurar. ¿Seguro?', 'Borrar', true)) return;
  try { await mutate('pedidos.borrar', { id: o.id }, { onlineOnly: true, label: 'Borrar nº ' + o.numero }); removeLocal('pedidos', o.id); emit(); toast('Pedido en la papelera', 'ok'); done(); }
  catch (e) { handleError(e, 'pedidos'); }
}
// v11.6: los mensajes al cliente salen de las plantillas editables (Embalaje → Tarjeta y mensajes)
function messageDialog(o, kind) { import('../envio.js').then(E => E.messageDialog(o, kind)); }

// ---------- v10.8: costes reales, etiqueta de envío ----------
function costsEditor(o) {
  const canal = () => o.canal;
  const env = inp({ type: 'number', min: 0, step: 0.01, value: o.costeEnvio ?? '', placeholder: 'Vacío = estimado (' + eur((S.cfg.precios || {}).envio || 0) + ')' });
  const com = inp({ type: 'number', min: 0, step: 0.01, value: o.comision ?? '' });
  const setComPh = (c, total) => { com.placeholder = 'Vacío = estimada (' + eur(CL.estComision(c, total, S.cfg.precios)) + ')'; };
  setComPh(canal(), CL.orderTotal(o));
  const list = (Array.isArray(o.gastosPedido) ? o.gastosPedido : []).map(g => Object.assign({}, g));
  const box = h('div.col', { style: { gap: '6px' } });
  const pick = sel([{ v: '', t: '+ Añadir gasto de la lista…' }].concat((S.t.gastos || []).map(g => ({ v: g.nombre, t: g.nombre + ' · ' + eur(g.coste) }))).concat([{ v: '__otro', t: '+ Otro gasto (escribirlo)' }]), '');
  const draw = () => mount(box, list.map((g, i) => {
    const c = inp({ value: g.concepto, placeholder: 'Concepto' }), v = inp({ type: 'number', min: 0, step: 0.01, value: g.coste, style: { width: '100px' } });
    c.addEventListener('input', () => { g.concepto = c.value; }); v.addEventListener('input', () => { g.coste = v.value; });
    return h('div.row', h('div.grow', c), v, btn('', () => { list.splice(i, 1); draw(); }, { cls: 'ghost icon sm', icon: 'x' }));
  }), pick);
  pick.addEventListener('change', () => { if (!pick.value) return; if (pick.value === '__otro') list.push({ concepto: '', coste: '' }); else { const g = (S.t.gastos || []).find(x => x.nombre === pick.value); list.push({ concepto: g.nombre, coste: Number(g.coste) || 0 }); } pick.value = ''; draw(); });
  draw();
  return {
    el: h('div.form', field('Envío que pagaste (€)', env), field('Comisión de la plataforma (€)', com), h('div.full', h('div.lbl', 'Otros gastos de este pedido'), box)),
    setCanal: (c, total) => setComPh(c, total),
    value: () => ({ costeEnvio: env.value === '' ? '' : Number(env.value), comision: com.value === '' ? '' : Number(com.value), gastosPedido: list.filter(g => String(g.concepto || '').trim() || Number(g.coste)).map(g => ({ concepto: String(g.concepto || '').trim(), coste: Number(g.coste) || 0 })) })
  };
}
function costsDialog(o) {
  const ed = costsEditor(o);
  modal('Costes reales · nº ' + o.numero, h('div.col', h('p.small.muted', 'Lo que te ha costado de verdad este pedido. Si dejas algo vacío se estima con Configuración → Precios.'), ed.el), close => [btn('Cancelar', close), btn('Guardar', async () => {
    const v = ed.value(), ch = {};
    Object.keys(v).forEach(k => { if (JSON.stringify(v[k] ?? '') !== JSON.stringify(o[k] ?? (k === 'gastosPedido' ? [] : ''))) ch[k] = v[k]; });
    if (!Object.keys(ch).length) return close();
    if (await save(o, ch, 'Costes de nº ' + o.numero)) { close(); profitWarn(byId('pedidos', o.id)); }
  }, { cls: 'primary' })], { size: 'wide' });
}
function profitWarn(o) {
  if (!o || !can('productos.costes')) return;
  const p = CL.orderProfit(o, S.t, S.cfg), minM = Number((S.cfg.alertas && S.cfg.alertas.margenMinimo) || 0.15);
  if (p.beneficio !== null && p.beneficio < 0) toast('🔴 Pedido nº ' + o.numero + ': pierdes ' + eur(-p.beneficio), 'bad', 6000);
  else if (p.margen !== null && p.margen < minM) toast('🟡 Pedido nº ' + o.numero + ': margen bajo (' + Math.round(p.margen * 100) + ' %)', 'warn', 6000);
}
// v11: etiqueta al tamaño exacto (plantilla de envío, o QR del pedido) con un único botón
export function labelDialog(o) {
  const c = byId('clientes', o.clienteId);
  const noAddr = !c || !c.direccion || c.direccion === '•••';
  import('../labels.js').then(L => L.labelDialog('envio', [{ o, c }], {
    plantillas: ['envio', 'qr'],
    dataFor: t => t === 'envio' ? L.dataFor('envio', { o, c }) : L.dataFor('qr', { tipo: 'pedido', id: o.id, titulo: 'Pedido nº ' + o.numero }),
    aviso: noAddr ? (can('clientes.datos') ? '⚠️ Este cliente no tiene dirección guardada: saldrá un hueco para escribirla a mano (o añádela en su ficha).' : '🔒 Sin permiso para ver direcciones: saldrá un hueco para escribirla.') : ''
  }));
}
export function printLabels(list) {
  import('../labels.js').then(L => L.labelDialog('envio', list.map(o => ({ o, c: byId('clientes', o.clienteId) })), {
    dataFor: (t, i) => L.dataFor('envio', { o: list[i || 0], c: byId('clientes', list[i || 0].clienteId) })
  }));
}

// v11: al elegir producto, decir si hay stock para enviarlo ya o hay que imprimirlo
function stockHint(name, o) {
  if (!name || !name.trim()) return null;
  const x = CL.stockLevels({ productos: S.t.productos, stock: S.t.stock, fabricacion: S.t.fabricacion || [], pedidos: S.t.pedidos.filter(p => p.id !== o.id) }, S.cfg.pedidos).of(name);
  if (!x || !x.controlado) return null;
  return x.disponible > 0 ? h('div.pi-tip.ok', '📦 Hay ' + x.disponible + ' disponible(s) en la estantería' + (x.ubicacion ? ' (' + x.ubicacion + ')' : '') + ': se puede enviar sin imprimir.')
    : h('div.pi-tip.info', '🖨️ No hay piezas libres en stock' + (x.fisico > 0 ? ' (las ' + x.fisico + ' de la estantería ya están apartadas)' : '') + ': habrá que imprimirlo.');
}

// ---------- Formulario (nuevo / editar) ----------
export function orderForm(o, duplicate, opts = {}) {
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
    color: { value: o.color || '' }, // v14.1: lo rellena el selector de colores
    cuenta: cuentaSelect(o.cuenta || '', o.canal || ''),
    personalizacion: area({ value: o.personalizacion || '', placeholder: 'Nombre grabado, medidas, dedicatoria…', style: { minHeight: '64px' } }),
    notas: area({ value: o.notas || '', style: { minHeight: '64px' } }),
    numero: inp({ value: isNew ? '' : o.numero || '', placeholder: 'Automático' }),
    fecha: inp({ type: 'date', value: (isNew && !duplicate) ? S.hoy : (o.fecha || S.hoy) }),
    envio: sel([''].concat(cfg.envios, o.envio && !cfg.envios.includes(o.envio) ? [o.envio] : []), o.envio || ''),
    seguimiento: inp({ value: o.seguimiento || '' }),
    direccionEnvio: area({ value: o.direccionEnvio || '', maxlength: 300, placeholder: o.direccionEnvio === '•••' ? 'Guardada (sin permiso para verla)' : 'Vacío = se pregunta al preparar el paquete', style: { minHeight: '56px' } }),
    obsEnvio: area({ value: o.obsEnvio || '', maxlength: 500, placeholder: 'Ej.: entregar por la tarde · frágil', style: { minHeight: '48px' } }),
    entregaEstimada: inp({ type: 'date', value: o.entregaEstimada || '' })
  };
  const prodDe = () => S.t.productos.find(x => CL.norm(x.nombre) === CL.norm(f.producto.value)) || null;
  const colSel = COL.selector({ valor: o.color || '', producto: prodDe(), cantidad: () => Number(f.cantidad.value) || 1, alCambiarCantidad: n => { f.cantidad.value = n; f.cantidad.dispatchEvent(new Event('input')); }, onChange: t => { f.color.value = t; } });
  f.producto.addEventListener('change', () => colSel.setProducto(prodDe()));
  // al elegir la cuenta, el canal se pone solo (Vinted, Wallapop…)
  f.cuenta.addEventListener('change', () => { const c = cuentasVenta().find(x => x.id === f.cuenta.selectedOptions[0]?.dataset.id); if (c && (S.cfg.pedidos.canales || []).includes(c.plataforma)) { f.canal.value = c.plataforma; f.canal.dispatchEvent(new Event('input')); } });
  const limitTxt = h('span.small.muted');
  const clientInfo = h('div.small.muted');
  const costs = can('productos.costes') ? costsEditor(o) : null;
  if (costs) [f.canal, f.precio, f.cantidad].forEach(x => x.addEventListener('input', () => costs.setCanal(f.canal.value, (Number(f.cantidad.value) || 1) * (Number(f.precio.value) || 0))));
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
  // v13.9/13.10: EMBALAJE DEL PEDIDO al principio: lo que cuesta se suma al precio recomendado
  const envW = ENV.widget(o, { onChange: () => { if (typeof updAssist === 'function') updAssist(); } });
  const assist = h('div.price-assist');
  const updAssist = () => {
    if (!f.producto.value.trim()) { mount(assist, null); return; }
    const p = S.t.productos.find(x => CL.norm(x.nombre) === CL.norm(f.producto.value));
    const ev0 = envW.value();
    const a = CL.orderAssist({ id: o.id, producto: f.producto.value, productoId: p ? p.id : '', cliente: f.cliente.value, cantidad: f.cantidad.value, precio: f.precio.value, embalaje: ev0 ? { simple: ev0 } : null }, S.t, S.cfg, S.hoy);
    const costs = can('productos.costes');
    const pc = x => x === null || x === undefined ? '—' : Math.round(x * 100) + ' %';
    const box = (l, v, cls) => h('div.pi-k' + (cls ? '.' + cls : ''), h('span.l', l), h('span.v', v));
    // v11: precio inteligente — nunca impone: muestra beneficio, margen y un rango para negociar
    const price = Number(f.precio.value) || 0, minM = (S.cfg.alertas && S.cfg.alertas.margenMinimo) || 0.15;
    const mCls = a.margen === undefined ? '' : a.beneficio < 0 ? 'bad' : a.margen < minM ? 'warn' : 'ok';
    const rg = a.rango, lo = rg ? Math.min(rg[0], a.minimo || rg[0], price || rg[0]) * 0.9 : 0, hi = rg ? Math.max(rg[1], price || 0) * 1.08 : 1;
    const pos = v => Math.max(0, Math.min(100, (v - lo) / Math.max(0.01, hi - lo) * 100)) + '%';
    const e0 = v => Number.isInteger(Number(v)) ? Number(v) + ' €' : eur(v);
    mount(assist,
      h('div.pi-kpis',
        box('Precio acordado' + (a.cantidad > 1 ? ' (ud.)' : ''), price ? eur(price) : '—', 'acc'),
        costs ? box('Beneficio' + (a.cantidad > 1 ? ' (' + a.cantidad + ' uds.)' : ''), a.beneficio !== undefined ? eur(a.beneficio) : 'sin coste', mCls) : null,
        costs ? box('Margen', pc(a.margen), mCls) : null,
        box('Recomendado', a.recomendado ? eur(a.recomendado) : a.sugerido ? eur(a.sugerido) : '—')),
      rg ? h('div.pi-range', { title: 'Rango sugerido' },
        h('div.track', costs && a.minimo ? h('i.min', { style: { left: pos(a.minimo) }, title: 'Mínimo: ' + eur(a.minimo) }) : null,
          h('i.band', { style: { left: pos(rg[0]), width: 'calc(' + pos(rg[1]) + ' - ' + pos(rg[0]) + ')' } }),
          price ? h('i.cur.' + (a.sugerencia ? a.sugerencia.nivel : ''), { style: { left: pos(price) }, title: 'Precio acordado' }) : null),
        h('div.lbls', costs && a.minimo ? h('span', { style: { left: pos(a.minimo) } }, 'mín. ' + e0(a.minimo)) : null, h('span.b', { style: { left: 'calc((' + pos(rg[0]) + ' + ' + pos(rg[1]) + ') / 2)' } }, e0(rg[0]) + ' – ' + e0(rg[1])))) : null,
      a.sugerencia ? h('div.pi-tip.' + a.sugerencia.nivel, a.sugerencia.nivel === 'ok' ? '✓ ' : a.sugerencia.nivel === 'bad' ? '⛔ ' : '💡 ', costs || a.sugerencia.nivel !== 'bad' ? a.sugerencia.texto : 'Precio muy bajo para este producto.') : !costs || a.coste !== null ? null : h('div.pi-tip.warn', 'Este producto no tiene costes guardados: añádelos para saber el beneficio.'),
      a.embalaje ? h('div.tiny', '📦 Embalaje: ' + a.embalaje.lineas.map(l => l.nombre + (l.unidad === 'm' ? ' ' + String(l.cantidad).replace('.', ',') + ' m' : '')).join(' + ') + ' = ' + eur(a.embalaje.total) + ' · ya está sumado al coste y al recomendado') : null,
      a.anteriorCliente ? h('div.tiny.muted', 'Este cliente pagó ' + eur(a.anteriorCliente) + ' la última vez.') : a.anterior ? h('div.tiny.muted', 'Último precio de venta: ' + eur(a.anterior) + ' (' + a.ventasPrevias + ' ventas).') : null,
      a.notas.map(n => h('div.tiny', '💡 ' + n)),
      costs ? a.avisos.filter(x => !/margen bajo/i.test(x)).map(n => h('div.tiny.warn-t', n)) : null,
      h('div.row.wrap', { style: { marginTop: '4px' } },
        rg && price !== rg[1] ? btn('Usar ' + e0(rg[1]), () => { f.precio.value = rg[1]; updAssist(); }, { cls: 'sm' }) : null,
        a.recomendado && price !== a.recomendado ? btn('Usar recomendado ' + eur(a.recomendado), () => { f.precio.value = a.recomendado; updAssist(); }, { cls: 'sm ghost' }) : null,
        a.descuentoRecomendado && a.sugerido ? btn('Descuento ' + pc(a.descuentoRecomendado) + ' → ' + eur(CL.sale.discount(a.sugerido, a.descuentoRecomendado)), () => { f.precio.value = CL.sale.discount(a.sugerido, a.descuentoRecomendado); updAssist(); }, { cls: 'sm ghost' }) : null,
        h('span.tiny.muted', 'Tú decides el precio.')),
      stockHint(f.producto.value, o));
  };
  [f.fecha, f.plazoDias].forEach(x => x.addEventListener('input', updLimit));
  f.cliente.addEventListener('input', () => { updClient(); updAssist(); }); f.producto.addEventListener('change', () => { updPrice(); updAssist(); });
  [f.producto, f.cantidad, f.precio].forEach(x => x.addEventListener('input', updAssist));
  updLimit(); updClient();

  const msg = h('p.bad-t');
  const labelFile = h('input', { type: 'file', accept: 'application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp' });
  const body = h('div.col', dlC, dlP,
    h('div.form', field('Cliente *', f.cliente, null, 'full'), h('div.full', clientInfo), field('Producto *', f.producto, 'Elige uno del catálogo o escribe uno nuevo.', 'full'), field('Cantidad', f.cantidad), field('Precio por unidad (€)', f.precio), h('div.full.card.flat', { style: { margin: '2px 0' } }, envW.el), h('div.full', assist),
      field('Cuenta de venta', f.cuenta, cuentasVenta().length ? 'Desde qué cuenta lo vendiste: sale en la etiqueta del paquete.' : 'Añade tus cuentas (Vinted, Wallapop…) en Configuración → Mis cuentas de venta.'), field('Canal / tienda', f.canal),
      h('div.full', h('div.lbl', '🎨 Color'), colSel.el), field('Prioridad', f.prioridad), field('Plazo para prepararlo (días)', f.plazoDias), field('Responsable', f.responsable), h('div.full', limitTxt)),
    h('details.more', h('summary', 'Personalización y notas'), h('div.in.form', field('Personalización', f.personalizacion, null, 'full'), field('Notas internas', f.notas, null, 'full'))),
    h('details.more', h('summary', 'Número, fecha y envío'), h('div.in.form', field('Nº de pedido', f.numero, 'Vacío = número automático. Puedes poner el de Vinted/Etsy.'), field('Fecha del pedido', f.fecha), field('Nº de seguimiento', f.seguimiento), field('Entrega estimada', f.entregaEstimada), field('Dirección de envío (este pedido)', f.direccionEnvio, 'Solo para este paquete. La ficha del cliente no cambia.'), field('Observaciones del envío', f.obsEnvio))),
    h('details.more', { open: isNew }, h('summary', 'Etiqueta de envío'), h('div.in', isNew
      ? h('div.col', { style: { gap: '6px' } }, labelFile, h('p.tiny.muted', 'Opcional: la etiqueta oficial que te da Vinted, InPost, Correos… (PDF o foto). Si aún no la tienes, la adjuntas después desde el pedido o al empaquetar. Nunca se inventa.'))
      : EV.labelRow(o, () => { }))),
    costs ? h('details.more', h('summary', 'Costes reales del pedido (envío, comisión, caja…)'), h('div.in', costs.el)) : null,
    msg);
  let otroMas = false; // v14.1: «Crear y añadir otro producto» (mismo cliente, misma cuenta y mismo envío)
  const m = modal(isNew ? 'Nuevo pedido' : 'Editar pedido nº ' + o.numero, body, close => [btn('Cancelar', close), isNew ? btn('➕ Crear y añadir otro producto', ev => { otroMas = true; ev.currentTarget.nextSibling.click(); }, { cls: 'ghost', title: 'Otro producto para el mismo cliente (luego van en un solo paquete)' }) : null, btn(isNew ? 'Crear pedido' : 'Guardar cambios', async (ev) => {
    msg.textContent = '';
    const datos = {};
    Object.keys(f).forEach(k => { let v = f[k].value; if (typeof v === 'string') v = v.trim(); if (['cantidad', 'precio', 'plazoDias'].includes(k) && v !== '') v = Number(v); datos[k] = v; });
    if (!datos.cliente) { otroMas = false; return msg.textContent = 'Indica el cliente.'; }
    if (!datos.producto) { otroMas = false; return msg.textContent = 'Indica el producto.'; }
    if (!(datos.cantidad > 0)) { otroMas = false; return msg.textContent = 'La cantidad debe ser mayor que 0.'; }
    const envErr = envW.error(); if (envErr) { otroMas = false; envW.el.scrollIntoView({ block: 'center' }); return msg.textContent = envErr; }
    if (!datos.numero) delete datos.numero;
    if (costs) Object.assign(datos, costs.value());
    const b = ev.target.closest('button'); b.disabled = true;
    try {
      if (isNew) {
        const ev = envW.value(); if (ev) Object.assign(datos, ENV.datosPedido(ev, null));
        const id = uid('o');
        const lf = labelFile.files && labelFile.files[0];
        // v12.2: la ventana se cierra YA (el pedido ya se ve en la lista) y el envío al servidor sigue detrás; antes esperaba
        // 2–5 s con la ventana abierta y parecía que no había hecho nada. Si falla, se vuelve a abrir con todo lo escrito.
        close();
        let r;
        try {
          r = await mutate('pedidos.guardar', { id, datos }, { label: 'Nuevo pedido de ' + datos.cliente, tables: ['pedidos'], optimistic: t => t.pedidos.push(Object.assign({ id, numero: datos.numero || '(pendiente)', estado: CL.stateOfPhase(S.cfg.pedidos, 'confirmado') || 'Confirmado', creado: new Date().toISOString(), creadoPor: S.me.nombre, version: 0 }, datos)) });
        } catch (e) { if (e.code === 'PERM') handleError(e, 'pedidos'); else toast('No se pudo crear el pedido: ' + e.message + ' Tus datos siguen en el formulario.', 'bad', 9000); orderForm(datos); return; }
        if (r && r.id) { upsertLocal('pedidos', r); emit(); }
        toast(r && r.queued ? 'Pedido guardado en este dispositivo: se enviará al volver la conexión.' : 'Pedido nº ' + r.numero + ' creado', r && r.queued ? 'warn' : 'ok', 6000, r && r.id ? { t: 'Abrir', on: () => go('pedidos/' + id) } : null);
        if (r && r.id) setTimeout(() => profitWarn(byId('pedidos', id)), 1200);
        if (lf && r && r.id && !r.queued) EV.leerEtiqueta(lf, lf.name).then(L => EV.attachFile(byId('pedidos', id) || r, lf, { transportista: datos.envio || L.transportista || '', seguimiento: datos.seguimiento ? '' : (L.seguimientos[0] || '') }))
          .then(() => toast('🏷️ Etiqueta de envío adjuntada', 'ok', 9000, { t: '🖨️ Imprimir ya', on: () => EV.printOne(byId('pedidos', id), 'oficial').catch(e => toast(e.message, 'bad')) })).catch(e => toast('El pedido se ha creado, pero la etiqueta no se pudo adjuntar: ' + e.message + '. Adjúntala desde el pedido.', 'warn', 9000));
        else if (lf) toast('Sin conexión: adjunta la etiqueta desde el pedido cuando vuelva la conexión.', 'warn', 8000);
        if (location.hash.startsWith('#/pedidos/nuevo')) go('pedidos');
        if (otroMas) { const base = {}; ['cliente', 'canal', 'cuenta', 'envio', 'direccionEnvio', 'obsEnvio', 'fecha', 'plazoDias', 'prioridad', 'responsable'].forEach(k => { if (datos[k] !== undefined && datos[k] !== '') base[k] = datos[k]; }); setTimeout(() => orderForm(base, true, { otro: true }), 250); }
        if (opts.alCrear && r && r.id) opts.alCrear(r);
      } else {
        if (envW.changed()) Object.assign(datos, ENV.datosPedido(envW.value(), o)); // (solo si se ha cambiado)
        const ch = {}; Object.keys(datos).forEach(k => { const a = datos[k], b0 = o[k]; if (typeof a === 'object' ? JSON.stringify(a || []) !== JSON.stringify(b0 || []) : String(a ?? '') !== String(b0 ?? '')) ch[k] = a; });
        if (!Object.keys(ch).length) { close(); return; }
        if (await save(o, ch)) { close(); profitWarn(byId('pedidos', o.id)); }
      }
    } catch (e) { msg.textContent = e.message; handleError(e, 'pedidos'); } finally { b.disabled = false; }
  }, { cls: 'primary' })], { size: 'wide' });
  updAssist();
  setTimeout(() => { if (!m.el.contains(document.activeElement) || document.activeElement === f.cliente && !f.cliente.value) (o.cliente ? f.producto : f.cliente).focus(); }, 50);
}

// v13.10 · Un cliente con varios pedidos → un solo paquete y un solo QR (con todos los números). Si ya hay un QR impreso, se reutiliza.
export async function unPaquete(lista) {
  const ords = lista.map(o => byId('pedidos', o.id) || o);
  const yaQr = ords.find(o => EV.statusOf(o, 'paquete').estado === 'Impreso');
  const pr = yaQr ? EV.principalDe(yaQr) : ords.slice().sort((a, b) => String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true }))[0];
  const g = await EV.juntar(pr, ords.filter(o => o.id !== pr.id));
  const p0 = byId('pedidos', g[0].id) || g[0];
  if (EV.statusOf(p0, 'paquete').estado === 'Impreso') { toast('📦 Ya tenían su QR: ahora el mismo QR vale para los ' + g.length + ' pedidos (nº ' + CL.numerosGrupo(g) + ').', 'ok', 7000); return g; }
  if (!await EV.bobinaPaquete('Se imprimirá UN solo QR para los ' + g.length + ' pedidos de ' + (p0.cliente || 'este cliente') + ' (nº ' + CL.numerosGrupo(g) + ').')) return g;
  if (EV.formatoPaquete() === 'largo') toast('🏷️ Una sola etiqueta (100 × 150) para los ' + g.length + ' pedidos de ' + (p0.cliente || 'este cliente') + ' (nº ' + CL.numerosGrupo(g) + ')', 'ok', 6000);
  try { await EV.printOne(p0, 'paquete'); } catch (e) { toast('No se pudo imprimir el QR: ' + e.message, 'bad', 8000); }
  return g;
}
