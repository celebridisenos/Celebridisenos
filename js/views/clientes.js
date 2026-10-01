// ================= Clientes: seguimiento del cliente y sus pedidos =================
import { h, mount, icon, btn, modal, drawer, toast, eur, fdate, ago, pill, dueBadge, empty, field, inp, sel, area, debounce, confirmDlg, uid, avatar, na, sw } from '../ui.js';
import { S, can, mutate, byId, upsertLocal, removeLocal, emit, clientStats, timing, stateColor } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { filesSection, filesOf } from '../files.js';
import { orderForm } from './pedidos.js';

const CL = window.CL;
const FILTERS = [
  { k: 'todos', t: 'Todos', f: () => true },
  { k: 'atencion', t: 'Para seguimiento', f: s => s.atencion },
  { k: 'frecuentes', t: '⭐ Frecuentes', f: s => s.frecuente },
  { k: 'activos', t: '📦 Con pedido en curso', f: s => s.activos > 0 },
  { k: 'incidencias', t: '⚠️ Con incidencias', f: s => s.incidencias > 0 },
  { k: 'altovalor', t: '👑 VIP', f: s => s.etiquetas.some(e => e.k === 'altovalor') },
  { k: 'recurrentes', t: '🔁 Recurrentes', f: s => s.etiquetas.some(e => e.k === 'recurrente') },
  { k: 'mayoristas', t: '🏭 Mayoristas', f: s => s.etiquetas.some(e => e.k === 'mayorista') },
  { k: 'inactivos', t: '💤 Hace tiempo que no compran', f: s => s.etiquetas.some(e => e.k === 'inactivo') }
];
const SORTS = [{ v: 'ultimo', t: 'Último pedido' }, { v: 'gasto', t: 'Más gasto' }, { v: 'pedidos', t: 'Más pedidos' }, { v: 'nombre', t: 'Nombre (A-Z)' }];

export function render(el, params) {
  const st = { f: 'todos', q: '', sort: 'ultimo', limit: 80 };
  const search = inp({ type: 'search', placeholder: 'Buscar por nombre, usuario, email, teléfono, etiqueta…' });
  search.addEventListener('input', debounce(() => { st.q = search.value; drawList(); }, 120));
  const sort = sel(SORTS, st.sort); sort.addEventListener('change', () => { st.sort = sort.value; drawList(); });
  const chips = h('div.seg', { style: { marginBottom: '12px' } });
  const listBox = h('div');
  el.append(h('div.page-head', h('h1', 'Clientes'), can('clientes.editar') ? btn('Nuevo cliente', () => clientForm(), { cls: 'primary', icon: 'plus' }) : null),
    h('div.row.wrap', { style: { marginBottom: '10px' } }, h('div.inp-icon.grow', icon('search', 's'), search), h('div', { style: { width: '200px' } }, sort)), chips, listBox);
  function drawChips() {
    const stats = clientStats();
    mount(chips, FILTERS.map(x => h('button' + (st.f === x.k ? '.on' : ''), { onclick: () => { st.f = x.k; drawChips(); drawList(); } }, x.t + ' ' + S.t.clientes.filter(c => stats[c.id] && x.f(stats[c.id])).length)));
  }
  function drawList() {
    const stats = clientStats();
    const fl = FILTERS.find(x => x.k === st.f);
    const rows = S.t.clientes.filter(c => stats[c.id] && fl.f(stats[c.id]) && (!st.q || CL.matches([c.nombre, c.usuarios, c.email, c.telefono, c.etiquetas, c.notas, c.canal].join(' '), st.q)))
      .sort((a, b) => { const x = stats[a.id], y = stats[b.id]; return st.sort === 'gasto' ? y.gasto - x.gasto : st.sort === 'pedidos' ? y.pedidos - x.pedidos : st.sort === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es') : String(y.ultimo).localeCompare(String(x.ultimo)); });
    if (!S.t.clientes.length) return mount(listBox, h('div.card', empty('users', 'Aún no hay clientes', 'Se crean solos al hacer un pedido, o puedes añadirlos a mano.', can('clientes.editar') ? btn('Nuevo cliente', () => clientForm(), { cls: 'primary', icon: 'plus' }) : null)));
    if (!rows.length) return mount(listBox, h('div.card', empty('search', 'Ningún cliente con este filtro')));
    mount(listBox, h('div.list.boxed', rows.slice(0, st.limit).map(c => {
      const s = stats[c.id];
      return h('div.item', { onclick: () => go('clientes/' + c.id) }, avatar(c),
        h('div.grow', h('div.row', h('b.ellipsis', c.nombre), s.etiquetas.slice(0, 3).map(e => h('span', { title: e.t }, e.i))),
          h('div.tiny.muted.ellipsis', [s.pedidos + (s.pedidos === 1 ? ' pedido' : ' pedidos'), s.ultimo ? 'último ' + ago(s.ultimo) : 'sin pedidos', c.canal].filter(Boolean).join(' · ')),
          s.pedidoActivo ? h('div', { style: { marginTop: '4px' } }, pill('📦 ' + s.pedidoActivo.estado, '', stateColor(s.pedidoActivo.estado))) : null),
        can('informes.ver') ? h('div.bold.nowrap', eur(s.gasto)) : null);
    })), rows.length > st.limit ? h('div.pager', btn('Mostrar más', () => { st.limit += 200; drawList(); })) : null);
  }
  let openId = null, dr = null;
  function applyParams(p) {
    const q = {}; let id = '';
    (p || []).forEach(x => { if (x.startsWith('?')) new URLSearchParams(x.slice(1)).forEach((v, k) => { q[k] = v; }); else if (x) id = x; });
    if (q.f && FILTERS.some(x => x.k === q.f)) st.f = q.f;
    drawChips(); drawList();
    if (id === 'nuevo') { history.replaceState(null, '', '#/clientes'); clientForm(); }
    else if (id && (id !== openId || !document.querySelector('.drawer'))) { openId = id; dr = clientDrawer(id, () => { openId = null; dr = null; history.replaceState(null, '', '#/clientes'); }); }
  }
  applyParams(params);
  return { params: applyParams, update: () => { drawChips(); drawList(); if (dr) dr.update(); }, destroy: () => dr && dr.close() };
}

function clientDrawer(id, onClose) {
  let tab = 'resumen', ctl;
  const res = { update: () => { }, close: () => ctl && ctl.close() };
  ctl = drawer((d, close) => {
    const closeAll = () => { close(); onClose(); };
    const draw = () => {
      const c = byId('clientes', id);
      if (!c) return mount(d, h('div.drawer-h', h('h2.grow', 'Cliente'), btn('', closeAll, { cls: 'ghost icon', icon: 'x' })), h('div.drawer-b', empty('alert', 'Este cliente ya no existe')));
      const s = clientStats()[c.id];
      const orders = (CL.ordersByClient([c], S.t.pedidos)[c.id] || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
      const body = h('div');
      const tabs = [['resumen', 'Resumen'], ['pedidos', 'Pedidos (' + orders.length + ')'], ['historial', 'Historial de compras'], ['notas', 'Notas'], ['info', 'Información adicional'], ['archivos', 'Archivos (' + filesOf('clientes', c.id).length + ')']];
      mount(d, h('div.drawer-h', avatar(c, 'l'), h('div.grow', h('h2.ellipsis', c.nombre), h('div.tags', { style: { marginTop: '4px' } }, s.etiquetas.map(e => pill(e.i + ' ' + e.t, e.k === 'incidencia' || e.k === 'incidencias' ? 'bad' : e.k === 'inactivo' ? '' : 'brand')))), btn('', closeAll, { cls: 'ghost icon', icon: 'x' })),
        h('div.drawer-b.col', { style: { gap: '14px' } },
          h('div.tabs', tabs.map(x => h('button' + (tab === x[0] ? '.on' : ''), { onclick: () => { tab = x[0]; draw(); } }, x[1]))), body,
          h('div.row.wrap', { style: { borderTop: '1px solid var(--line)', paddingTop: '14px' } },
            can('pedidos.crear') ? btn('Nuevo pedido para ' + c.nombre.split(' ')[0], () => orderForm({ cliente: c.nombre, clienteId: c.id }), { cls: 'primary', icon: 'plus' }) : null,
            can('clientes.editar') ? btn('Editar', () => clientForm(c), { icon: 'edit' }) : null,
            btn('QR', () => import('../labels.js').then(L => L.labelDialog('qr', [L.dataFor('qr', { tipo: 'cliente', id: c.id, titulo: c.nombre })])), { icon: 'printer', title: 'Etiqueta con QR que abre esta ficha' }), h('span.grow'),
            can('clientes.borrar') ? btn('Borrar', () => delClient(c, s, closeAll), { cls: 'danger', icon: 'trash' }) : null)));
      TABS[tab](body, c, s, orders, draw);
    };
    res.update = draw; draw();
  });
  return res;
}
const TABS = {
  resumen(el, c, s, orders) {
    const act = s.pedidoActivo;
    mount(el, h('div.facts',
      big('🛍', s.pedidos + (s.pedidos === 1 ? ' pedido' : ' pedidos')),
      can('informes.ver') ? big('💰', eur(s.gasto) + ' gastados') : null,
      can('productos.costes') && can('informes.ver') ? (() => { const pr = orders.filter(o => !CL.stateOf(S.cfg.pedidos, o.estado).cancelled).map(o => CL.orderProfit(o, S.t, S.cfg)).filter(p => p.beneficio !== null); return big('📈', pr.length ? eur(pr.reduce((a, p) => a + p.beneficio, 0)) + ' de beneficio' : 'Beneficio: sin costes', null, pr.length && pr.reduce((a, p) => a + p.beneficio, 0) < 0 ? 'bad' : ''); })() : null,
      big('📅', s.ultimo ? 'Último pedido: ' + ago(s.ultimo) + ' (' + fdate(s.ultimo) + ')' : 'Sin pedidos todavía'),
      big(s.frecuente ? '⭐' : '👤', s.frecuente ? 'Cliente frecuente' : s.pedidos > 1 ? 'Cliente recurrente' : 'Cliente'),
      big('📦', act ? (s.activos > 1 ? s.activos + ' pedidos en curso (último: ' + act.estado + ')' : 'Pedido actual: ' + act.estado) : 'Sin pedido en curso', act ? () => go(s.activos > 1 ? 'pedidos/?cliente=' + encodeURIComponent(c.nombre) : 'pedidos/' + act.id) : null),
      s.incidencias ? big('⚠️', s.incidencias + (s.incidencias === 1 ? ' incidencia' : ' incidencias'), null, 'bad') : null),
      tagToggles(c, s),
      opportunities(s),
      c.notas ? h('div.card.flat', { style: { marginTop: '12px' } }, h('div.lbl', 'Notas'), h('p', { style: { whiteSpace: 'pre-wrap', margin: '4px 0 0' } }, c.notas)) : null);
  },
  pedidos(el, c, s, orders) {
    mount(el, orders.length ? h('div.list.boxed', orders.map(o => { const t = timing(o); return h('div.item', { onclick: () => go('pedidos/' + o.id) }, h('div.grow', h('div.row', h('b', 'nº ' + o.numero), h('span.small.muted', fdate(o.fecha))), h('div.small.ellipsis', (o.cantidad > 1 ? o.cantidad + ' × ' : '') + o.producto), h('div.row.wrap', { style: { gap: '8px', marginTop: '4px' } }, pill(o.estado, '', stateColor(o.estado)), t.abierto ? dueBadge(t) : null)), h('b.nowrap', eur(CL.orderTotal(o)))); })) : h('p.muted', 'Todavía no ha hecho pedidos.'));
  },
  historial(el, c, s, orders) {
    const valid = orders.filter(o => !CL.stateOf(S.cfg.pedidos, o.estado).cancelled);
    const byProd = {};
    valid.forEach(o => { byProd[o.producto] = (byProd[o.producto] || 0) + (Number(o.cantidad) || 1); });
    const months = {};
    valid.forEach(o => { const k = String(o.fecha).slice(0, 7); (months[k] = months[k] || []).push(o); });
    mount(el, !valid.length ? h('p.muted', 'Sin compras.') : h('div.col',
      h('div.facts', fact('Primera compra', s.primero ? fdate(s.primero) : '—'), fact('Última compra', s.ultimo ? fdate(s.ultimo) : '—'), fact('Ticket medio', eur(s.gasto / (s.pedidos || 1))), fact('Compra cada', valid.length > 1 && s.primero ? Math.round(CL.days(s.primero, s.ultimo) / (valid.length - 1)) + ' días de media' : '—')),
      h('h4', 'Lo que más compra'), h('div.tags', Object.keys(byProd).sort((a, b) => byProd[b] - byProd[a]).slice(0, 8).map(p => pill(p + ' × ' + byProd[p], 'brand'))),
      h('h4', 'Por meses'), h('div.timeline', Object.keys(months).sort().reverse().map(k => h('div.tl', h('span.b'), h('div', h('b', k), h('div.small.muted', months[k].map(o => o.producto + (can('informes.ver') ? ' (' + eur(CL.orderTotal(o)) + ')' : '')).join(' · '))))))));
  },
  notas(el, c) {
    const t = area({ value: c.notas || '', placeholder: 'Gustos, tallas, cómo prefiere que le escribas, si conviene hacerle un detalle…', style: { minHeight: '160px' } });
    mount(el, field('Notas sobre ' + c.nombre, t), can('clientes.editar') ? btn('Guardar notas', () => saveClient(c, { notas: t.value.trim() }), { cls: 'primary' }) : null);
  },
  info(el, c) {
    const extra = S.cfg.clientes.camposExtra || [];
    const rows = [['Teléfono', c.telefono], ['Email', c.email], ['Dirección de envío', c.direccion], ['Ciudad', c.ciudad], ['País', c.pais], ['Usuarios en plataformas', c.usuarios], ['Canal principal', c.canal], ['Etiquetas', c.etiquetas]]
      .concat(extra.map(f => [f.nombre, c.extra && c.extra[f.id] !== undefined ? (f.tipo === 'si_no' ? (c.extra[f.id] ? 'Sí' : 'No') : c.extra[f.id]) : '']));
    const filled = rows.filter(r => r[1] !== '' && r[1] !== undefined && r[1] !== null);
    mount(el, filled.length ? h('dl.kv', filled.map(r => [h('dt', r[0]), h('dd', String(r[1]))])) : h('p.muted', 'No hay información adicional. No es obligatoria: solo añade lo que os sea útil.'),
      !can('clientes.datos') ? h('p.tiny.muted', '🔒 Los datos personales están ocultos para tu usuario.') : null,
      can('clientes.editar') ? btn('Editar información', () => clientForm(c, true), { icon: 'edit', cls: 'sm' }) : null);
  },
  archivos(el, c) { mount(el, filesSection('clientes', c.id, { tipos: ['foto', 'doc'] }).el); }
};
// v11: etiquetas del CRM con un toque (se guardan en "Etiquetas" del cliente; las automáticas no se pueden quitar)
function tagToggles(c, s) {
  if (!can('clientes.editar')) return null;
  const list = String(c.etiquetas || '').split(',').map(x => x.trim()).filter(Boolean);
  const auto = k => s.etiquetas.some(e => e.k === k) && !list.some(x => CL.norm(x) === CL.norm({ altovalor: 'VIP', recurrente: 'Recurrente', mayorista: 'Mayorista' }[k]));
  const T = [['VIP', 'altovalor', '👑'], ['Recurrente', 'recurrente', '🔁'], ['Mayorista', 'mayorista', '🏭']];
  return h('div.row.wrap', { style: { marginTop: '12px', gap: '6px' } }, h('span.small.muted', 'Etiquetas:'), T.map(([t, k, i]) => {
    const on = list.some(x => CL.norm(x) === CL.norm(t)), a = auto(k);
    return h('button.chip' + (on || a ? '.on' : ''), { title: a ? 'Automática (por sus compras)' : on ? 'Quitar' : 'Poner', disabled: a, onclick: () => saveClient(c, { etiquetas: (on ? list.filter(x => CL.norm(x) !== CL.norm(t)) : list.concat(t)).join(', ') }) }, i + ' ' + t + (a ? ' · auto' : ''));
  }));
}
function big(ic, t, onclick, cls) { return h('div.fact' + (onclick ? '.click' : ''), { onclick, style: onclick ? { cursor: 'pointer' } : {} }, h('div', { style: { fontSize: '20px' } }, ic), h('div.v' + (cls ? '.' + cls + '-t' : ''), t)); }
function fact(l, v) { return h('div.fact', h('div.l', l), h('div.v', v)); }
function opportunities(s) {
  const tips = [];
  if (s.etiquetas.some(e => e.k === 'descuento')) tips.push('🎁 Es cliente frecuente y no tiene pedido en curso: buen momento para ofrecerle un detalle o descuento.');
  if (s.etiquetas.some(e => e.k === 'inactivo')) tips.push('💤 Hace tiempo que no compra: podéis escribirle con una novedad.');
  if (s.etiquetas.some(e => e.k === 'altovalor')) tips.push('📈 Es de vuestros clientes de más valor.');
  if (s.incidenciasAbiertas) tips.push('⚠️ Tiene una incidencia abierta: revísala antes de nada.');
  if (!tips.length) return null;
  return h('div.card.flat', { style: { marginTop: '12px', background: 'var(--brand-soft)' } }, h('div.lbl', 'Oportunidades'), h('ul.small', { style: { margin: '6px 0 0', paddingLeft: '18px' } }, tips.map(t => h('li', t))), h('p.tiny.muted', 'Solo es información para que decidáis: la app no aplica descuentos.'));
}

async function saveClient(c, ch) {
  const orig = {}; Object.keys(ch).forEach(k => { orig[k] = c[k] ?? ''; });
  try {
    const r = await mutate('clientes.guardar', { id: c.id, datos: ch, orig }, { label: 'Cliente ' + c.nombre, tables: ['clientes', 'pedidos'], optimistic: t => { const x = t.clientes.find(y => y.id === c.id); if (x) Object.assign(x, ch); } });
    if (r && r.id) { upsertLocal('clientes', r); emit(); }
    toast(r && r.queued ? 'Guardado en el dispositivo (se enviará al volver la conexión)' : 'Cliente guardado', r && r.queued ? 'warn' : 'ok');
    return true;
  } catch (e) { handleError(e, 'clientes'); return false; }
}
async function delClient(c, s, done) {
  if (s.pedidos || S.t.pedidos.some(o => o.clienteId === c.id)) return toast('No se puede borrar: tiene pedidos. Así no se pierde su historial.', 'warn');
  if (!await confirmDlg('Borrar cliente', 'Se moverá a la papelera. ¿Seguro?', 'Borrar', true)) return;
  try { await mutate('clientes.borrar', { id: c.id }, { onlineOnly: true }); removeLocal('clientes', c.id); emit(); toast('Cliente en la papelera', 'ok'); done(); } catch (e) { handleError(e, 'clientes'); }
}

export function clientForm(c, openExtra) {
  const isNew = !c;
  c = c || {};
  const pii = can('clientes.datos');
  const extraDefs = S.cfg.clientes.camposExtra || [];
  const f = {
    nombre: inp({ value: c.nombre || '', placeholder: 'Nombre o usuario (p. ej. maria_g en Vinted)' }),
    canal: sel([''].concat(S.cfg.pedidos.canales), c.canal || ''),
    usuarios: inp({ value: c.usuarios || '', placeholder: 'Vinted: maria_g · IG: @maria' }),
    notas: area({ value: c.notas || '', style: { minHeight: '70px' } }),
    etiquetas: inp({ value: c.etiquetas || '', placeholder: 'regalo, mayorista…' })
  };
  const p = pii ? { telefono: inp({ value: c.telefono || '', type: 'tel' }), email: inp({ value: c.email || '', type: 'email' }), direccion: area({ value: c.direccion || '', style: { minHeight: '64px' } }), ciudad: inp({ value: c.ciudad || '' }), pais: inp({ value: c.pais || '' }) } : {};
  const ex = {};
  extraDefs.forEach(d => {
    const v = c.extra ? c.extra[d.id] : undefined;
    ex[d.id] = d.tipo === 'si_no' ? h('input', { type: 'checkbox', checked: !!v }) : inp({ type: d.tipo === 'numero' ? 'number' : d.tipo === 'fecha' ? 'date' : 'text', value: v ?? '' });
  });
  const msg = h('p.bad-t');
  const body = h('div.col',
    h('div.form', field('Nombre o usuario *', f.nombre, null, 'full'), field('Canal principal', f.canal), field('Usuarios en plataformas', f.usuarios), field('Notas', f.notas, null, 'full')),
    h('details.more', { open: openExtra || undefined }, h('summary', 'Información adicional (opcional)'), h('div.in.form',
      pii ? [field('Teléfono', p.telefono), field('Email', p.email), field('Dirección de envío', p.direccion, null, 'full'), field('Ciudad', p.ciudad), field('País', p.pais)] : h('p.small.muted.full', '🔒 No tienes permiso para ver ni cambiar datos personales.'),
      field('Etiquetas', f.etiquetas, 'Separadas por comas', 'full'),
      extraDefs.map(d => d.tipo === 'si_no' ? h('label.check', ex[d.id], d.nombre) : field(d.nombre, ex[d.id])))),
    msg);
  modal(isNew ? 'Nuevo cliente' : 'Editar ' + c.nombre, body, close => [btn('Cancelar', close), btn(isNew ? 'Crear cliente' : 'Guardar', async () => {
    const datos = {};
    Object.keys(f).forEach(k => { datos[k] = f[k].value.trim(); });
    Object.keys(p).forEach(k => { datos[k] = p[k].value.trim(); });
    if (extraDefs.length) { datos.extra = Object.assign({}, c.extra || {}); extraDefs.forEach(d => { datos.extra[d.id] = d.tipo === 'si_no' ? ex[d.id].checked : ex[d.id].value; }); }
    if (!datos.nombre) return msg.textContent = 'Escribe el nombre o usuario del cliente.';
    if (isNew) {
      const dup = S.t.clientes.find(x => CL.norm(x.nombre) === CL.norm(datos.nombre));
      if (dup) return msg.textContent = 'Ya existe "' + dup.nombre + '".';
      try {
        const id = uid('c');
        const r = await mutate('clientes.guardar', { id, datos }, { tables: ['clientes'], label: 'Nuevo cliente ' + datos.nombre, optimistic: t => t.clientes.push(Object.assign({ id, creado: new Date().toISOString() }, datos)) });
        if (r && r.id) { upsertLocal('clientes', r); emit(); }
        close(); toast('Cliente creado', 'ok'); go('clientes/' + id);
      } catch (e) { msg.textContent = e.message; }
    } else {
      const ch = {}; Object.keys(datos).forEach(k => { if (JSON.stringify(datos[k]) !== JSON.stringify(c[k] ?? (k === 'extra' ? {} : ''))) ch[k] = datos[k]; });
      if (!Object.keys(ch).length) return close();
      if (await saveClient(c, ch)) close();
    }
  }, { cls: 'primary' })]);
}
