// ================= v11 · Stock (bajo demanda) =================
// Físico = lo que hay en la estantería · Apartado = pedidos abiertos aún sin enviar · Disponible = físico − apartado.
// Todo se calcula con la misma cuenta que el servidor y la hoja Stock del Excel (CL.stockLevels).
// +1 / −1 responden al instante (se guardan en segundo plano y funcionan sin conexión).
import { h, mount, icon, btn, drawer, toast, fdate, ago, pill, empty, inp, field, debounce, uid } from '../ui.js';
import { S, can, mutate, api, byId, emit } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { filesOf } from '../files.js';
import * as ENV from '../envases.js';

const CL = window.CL;
const FILTERS = [
  { k: 'control', t: 'Con stock', f: x => x.controlado },
  { k: 'bajo', t: 'Reponer', cls: 'warn', f: x => x.bajo },
  { k: 'estanteria', t: 'En estantería', f: x => x.fisico > 0 },
  { k: 'sin', t: 'Sin control', f: x => !x.controlado }
];
const EST = { ok: ['OK', 'ok'], bajo: ['Bajo mínimo', 'warn'], agotado: ['Agotado', 'warn'], faltan: ['Faltan', 'bad'], sin: ['Sin control', ''] };
const TIPO_I = { 'Impresión': '🖨️', 'Fabricado (pedido)': '🛠️', 'Entrada': '➕', 'Salida': '➖', 'Recuento': '🔢', 'Rotura': '💥', 'Devolución': '↩️', 'Muestra': '🎁', 'Stock inicial': '📦', 'Envío': '🚚' };

export function levels() {
  return CL.stockLevels({ productos: S.t.productos, stock: S.t.stock, fabricacion: S.t.fabricacion || [], pedidos: S.t.pedidos, trabajos: S.t.trabajos || [] }, S.cfg.pedidos);
}
const thumb = p => { const f = p && (p.fotoId ? byId('archivos', p.fotoId) : filesOf('productos', p.id).find(a => a.miniatura)); return f && f.miniatura ? h('img', { src: f.miniatura, alt: '', loading: 'lazy' }) : icon('cube', 's'); };
const lastMove = x => (S.t.fabricacion || []).filter(r => CL.norm(r.producto) === x.clave).reduce((m, r) => (r.creado || r.fecha || '') > m ? (r.creado || r.fecha) : m, '');

// Movimiento al instante (optimista); el servidor valida y avisa de stock bajo
export async function move(producto, cantidad, motivo, notas) {
  if (!can('stock.mover')) return requestAccess('stock.mover', 'stock');
  const mv = { id: uid('f'), fecha: S.hoy, producto, unidades: cantidad, tipo: motivo || (cantidad > 0 ? 'Entrada' : 'Salida'), referencia: 'Manual', por: S.me.nombre, creado: new Date().toISOString(), notas: notas || '' };
  try {
    await mutate('stock.mover', { producto, cantidad, motivo, notas }, { label: (cantidad > 0 ? '+' : '') + cantidad + ' ' + producto, tables: ['fabricacion'], optimistic: t => { t.fabricacion.push(mv); } });
    return true;
  } catch (e) { handleError(e, 'stock'); return false; }
}

// v13.9: Stock tiene dos partes: «📦 Envases / embalaje» (lo que hay para preparar pedidos) y «🧩 Productos» (lo de siempre)
export function render(el, params) {
  const qs = (params || []).find(x => x && x.startsWith('?')) || '';
  const quiere = new URLSearchParams(qs.slice(1)).get('ver');
  let tab = quiere || ((params || []).some(x => x && !x.startsWith('?')) ? 'productos' : (() => { try { return localStorage.getItem('cd.stock.tab') || 'envases'; } catch (e) { return 'envases'; } })());
  const bar = h('div.tabs.stock-tabs', { style: { marginBottom: '14px' } });
  const pane = h('div');
  const head = h('div.page-head', h('h1', 'Stock'));
  el.append(head, bar, pane);
  let cur = null;
  const show = (k, p) => {
    tab = k; try { localStorage.setItem('cd.stock.tab', k); } catch (e) { }
    mount(bar, [['envases', '📦 Envases / embalaje'], ['productos', '🧩 Productos']].map(([x, l]) => h('button' + (tab === x ? '.on' : ''), { type: 'button', 'data-tab': x, onclick: () => { if (tab !== x) show(x); } }, l)));
    if (cur && cur.destroy) cur.destroy();
    mount(pane);
    if (k === 'envases') cur = ENV.renderStock(pane);
    else cur = renderProductos(pane, p || []);
  };
  show(tab, params);
  return { params: p => { const prod = (p || []).some(x => x && !x.startsWith('?')); if (prod && tab !== 'productos') show('productos', p); else if (cur && cur.params) cur.params(p); },
    update: () => cur && cur.update && cur.update(), destroy: () => cur && cur.destroy && cur.destroy() };
}
function renderProductos(el, params) {
  const st = { f: 'control', q: '' };
  const kpis = h('div.grid.kpis', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: '14px' } });
  const search = inp({ type: 'search', placeholder: 'Buscar producto, ubicación…', 'aria-label': 'Buscar en stock' });
  search.addEventListener('input', debounce(() => { st.q = search.value; draw(); }, 100));
  const chips = h('div.row.wrap', { style: { margin: '0 0 12px' } });
  const box = h('div');
  el.append(h('div.page-head', h('div.grow', h('h1', 'Productos en stock'), h('p.small.muted', { style: { margin: '2px 0 0' } }, 'Bajo demanda: los pedidos apartan, lo impreso entra y lo enviado sale. Todo solo.')),
    can('taller.editar') ? btn('Imprimir para stock', () => import('./taller.js').then(m => m.jobForm()), { icon: 'cube' }) : null),
  kpis, h('div.row', { style: { marginBottom: '10px' } }, h('div.inp-icon.grow', icon('search', 's'), search)), chips, box);
  let dr = null, openName = '';

  function draw() {
    const L = levels(), all = L.list.filter(x => x.producto);
    const ctl = all.filter(x => x.controlado);
    const k = (n, l, cls, on) => h('div.kpi.static' + (cls ? '.' + cls : ''), on ? { onclick: on, style: { cursor: 'pointer' } } : {}, h('span.n', String(n)), h('span.l', l));
    mount(kpis,
      k(ctl.length, 'Productos con stock'),
      k(ctl.reduce((s, x) => s + Math.max(0, x.fisico), 0), 'Piezas en estantería'),
      k(ctl.reduce((s, x) => s + x.reservado, 0), 'Apartadas para pedidos'),
      k(all.filter(x => x.bajo).length, 'Para reponer', all.some(x => x.bajo) ? 'warn' : '', () => { st.f = 'bajo'; draw(); }));
    mount(chips, FILTERS.map(f => { const n = all.filter(f.f).length; return h('button.chip' + (st.f === f.k ? '.on' : '') + (f.cls && n ? '.' + f.cls : ''), { onclick: () => { st.f = f.k; draw(); } }, f.t, h('span.c', String(n))); }));
    const F = FILTERS.find(x => x.k === st.f) || FILTERS[0];
    const rows = all.filter(F.f).filter(x => !st.q || CL.matches(x.producto + ' ' + x.ubicacion + ' ' + (x.productoId || ''), st.q))
      .sort((a, b) => (b.bajo - a.bajo) || a.producto.localeCompare(b.producto, 'es'));
    if (!all.length) return mount(box, h('div.card', empty('box', 'Aún no hay productos', 'Crea un producto y dile cuántas unidades tienes.')));
    if (!rows.length) return mount(box, h('div.card', empty(st.f === 'bajo' ? 'check' : 'search', st.f === 'bajo' ? 'Nada que reponer 🎉' : st.f === 'control' ? 'Ningún producto con stock todavía' : 'Nada con este filtro',
      st.f === 'control' ? 'Bajo demanda es normal. Cuando sobre una pieza o imprimas para la estantería aparecerá aquí. También puedes activarlo en "Sin control".' : '')));
    const editable = can('stock.mover');
    mount(box, h('div.stock-list', rows.slice(0, 300).map(x => {
      const p = x.productoId ? byId('productos', x.productoId) : null;
      const e = EST[x.estado] || EST.ok;
      const step = d => h('button.btn.icon.sm.step', { title: d > 0 ? 'Sumar 1' : 'Restar 1', 'aria-label': d > 0 ? 'Sumar uno' : 'Restar uno', disabled: !editable || (d < 0 && x.fisico <= 0),
        onclick: async ev => { ev.stopPropagation(); await move(x.producto, d); } }, d > 0 ? '+' : '−');
      return h('div.stock-row' + (x.bajo ? '.low' : ''), { onclick: () => open(x.producto) },
        h('div.st-thumb', thumb(p)),
        h('div.grow', h('div.bold.ellipsis', x.producto), h('div.tiny.muted.ellipsis', [x.ubicacion ? '📍 ' + x.ubicacion : null, x.minimo ? 'mín. ' + x.minimo : null, x.controlado ? (lastMove(x) ? 'mov. ' + ago(lastMove(x)) : '') : 'Sin control'].filter(Boolean).join(' · '))),
        h('div.st-nums', h('span', { title: 'En la estantería' }, h('b', String(x.fisico)), h('small', 'estantería')), h('span', { title: 'Apartadas para pedidos abiertos' }, h('b', String(x.reservado)), h('small', 'apartadas')), x.enFabricacion ? h('span', { title: 'En cola o imprimiéndose' }, h('b', String(x.enFabricacion)), h('small', 'en fabr.')) : null,
          h('span.disp.' + e[1], { title: 'Disponibles para vender' }, h('b', String(x.disponible)), h('small', 'disponibles'))),
        x.controlado ? h('div.st-step', step(-1), step(1)) : (editable ? btn('Activar', ev => { ev.stopPropagation(); open(x.producto); }, { cls: 'sm' }) : null));
    })), rows.length > 300 ? h('p.small.muted', 'Mostrando 300 de ' + rows.length + '. Usa el buscador.') : null);
  }
  function open(name) {
    openName = name;
    if (dr) dr.close();
    dr = stockDrawer(name, () => { dr = null; openName = ''; if (location.hash.startsWith('#/stock/')) history.replaceState(null, '', '#/stock'); });
  }
  function applyParams(p) {
    const q = (p || []).find(x => x && !x.startsWith('?'));
    const qs = (p || []).find(x => x && x.startsWith('?'));
    if (qs) { const f = new URLSearchParams(qs.slice(1)).get('f'); if (f && FILTERS.some(x => x.k === f)) st.f = f; }
    draw();
    if (q && q !== openName) open(q);
  }
  applyParams(params);
  return { params: applyParams, update: () => { draw(); if (dr) dr.update(); }, destroy: () => dr && dr.close() };
}

// ---------- Ficha de stock de un producto ----------
export function stockDrawer(name, onClose) {
  let ctl;
  const res = { update: () => { }, close: () => ctl && ctl.close() };
  ctl = drawer((d, close) => {
    const closeAll = () => { close(); onClose && onClose(); };
    const count = inp({ type: 'number', min: 0, step: 1, inputmode: 'numeric', style: { width: '110px' } });
    const minI = inp({ type: 'number', min: 0, step: 1, inputmode: 'numeric', placeholder: '0 = sin aviso' });
    const locI = inp({ placeholder: 'Ej.: Estantería 2 · caja A3' });
    let filled = false;
    const draw = () => {
      const x = levels().of(name) || { producto: name, fisico: 0, reservado: 0, disponible: 0, minimo: 0, ubicacion: '', controlado: false, estado: 'sin', clave: CL.norm(name) };
      const p = x.productoId ? byId('productos', x.productoId) : null;
      if (!filled || document.activeElement !== count) count.value = Math.max(0, x.fisico);
      if (!filled) { minI.value = x.minimo || ''; locI.value = x.ubicacion || ''; filled = true; }
      const editable = can('stock.mover'), cfgEdit = can('stock.mover') || can('productos.editar');
      const e = EST[x.estado] || EST.ok;
      const moves = (S.t.fabricacion || []).filter(r => CL.norm(r.producto) === x.clave).map(r => ({ f: r.creado || r.fecha, i: TIPO_I[r.tipo] || (Number(r.unidades) > 0 ? '➕' : '➖'), t: (Number(r.unidades) > 0 ? '+' : '') + r.unidades + ' · ' + (r.tipo || 'Movimiento'), s: [r.referencia, r.notas, r.por].filter(Boolean).join(' · ') }));
      const ships = S.t.pedidos.filter(o => CL.norm(o.producto) === x.clave && ['enviado', 'entregado'].includes(CL.phaseOf(S.cfg.pedidos, o.estado)))
        .map(o => ({ f: o.fechaEnvio || o.fecha, i: '🚚', t: '−' + (Number(o.cantidad) || 1) + ' · Enviado', s: 'Pedido nº ' + o.numero + ' · ' + o.cliente, go: 'pedidos/' + o.id }));
      const open = S.t.pedidos.filter(o => CL.norm(o.producto) === x.clave && !['enviado', 'entregado', 'cancelado'].includes(CL.phaseOf(S.cfg.pedidos, o.estado)));
      const hist = moves.concat(ships).sort((a, b) => String(b.f).localeCompare(String(a.f))).slice(0, 80);
      const saveCfg = async () => {
        const ch = { producto: x.producto, minimo: minI.value === '' ? '' : Number(minI.value), ubicacion: locI.value.trim() };
        if (String(ch.minimo) === String(x.minimo || '') && ch.ubicacion === (x.ubicacion || '') && x.controlado) return;
        try { await mutate('stock.guardar', ch, { label: 'Stock de ' + x.producto, tables: ['stock'], optimistic: t => { const r = t.stock.find(s => CL.norm(s.producto) === x.clave); if (r) Object.assign(r, { minimo: ch.minimo, ubicacion: ch.ubicacion }); else t.stock.push({ producto: x.producto, minimo: ch.minimo, ubicacion: ch.ubicacion }); } }); toast('Guardado', 'ok'); }
        catch (err) { handleError(err, 'stock'); }
      };
      [minI, locI].forEach(i => { i.onchange = saveCfg; });
      const recount = async () => {
        const v = Math.round(Number(count.value));
        if (!(v >= 0)) return toast('Escribe cuántas hay', 'warn');
        try {
          await mutate('stock.recuento', { producto: x.producto, fisico: v }, { label: 'Recuento de ' + x.producto, tables: ['fabricacion', 'stock'], optimistic: t => { const dlt = v - x.fisico; if (dlt) t.fabricacion.push({ id: uid('f'), fecha: S.hoy, producto: x.producto, unidades: dlt, tipo: 'Recuento', por: S.me.nombre, creado: new Date().toISOString() }); if (!t.stock.some(s => CL.norm(s.producto) === x.clave)) t.stock.push({ producto: x.producto, minimo: '', ubicacion: '' }); } });
          toast('Recuento guardado: ' + v + ' en la estantería', 'ok');
        } catch (err) { handleError(err, 'stock'); }
      };
      count.onkeydown = ev => { if (ev.key === 'Enter') recount(); };
      mount(d, h('div.drawer-h', h('div.st-thumb.l', thumb(p)), h('div.grow', h('h2.ellipsis', x.producto), h('div.row', { style: { marginTop: '4px' } }, pill(e[0], e[1]), x.ubicacion ? h('span.tiny.muted', '📍 ' + x.ubicacion) : null)), btn('', closeAll, { cls: 'ghost icon', icon: 'x' })),
        h('div.drawer-b.col', { style: { gap: '16px' } },
          h('div.st-big', h('div', h('b', String(x.fisico)), h('span', 'En la estantería')), h('div', h('b', String(x.reservado)), h('span', 'Apartadas')), x.enFabricacion ? h('div', h('b', String(x.enFabricacion)), h('span', 'En fabricación')) : null, h('div.' + e[1], h('b', String(x.disponible)), h('span', 'Disponibles'))),
          x.disponible < 0 ? h('p.small.bad-t', '🛠️ Faltan ' + (-x.disponible) + ' para servir los pedidos abiertos' + (x.enFabricacion ? ' · ' + x.enFabricacion + ' ya en cola o imprimiéndose' : '') + (x.porFabricar ? ': faltan por poner a imprimir ' + x.porFabricar + '.' : ': ya están en marcha.')) : null,
          editable ? h('div.card.flat', h('div.row.wrap', h('b.grow', 'Movimiento rápido'), btn('−1', () => move(x.producto, -1), { cls: 'sm', disabled: x.fisico <= 0 }), btn('+1', () => move(x.producto, 1), { cls: 'sm' }), btn('+5', () => move(x.producto, 5), { cls: 'sm' }),
            btn('Rotura', () => move(x.producto, -1, 'Rotura'), { cls: 'sm ghost', disabled: x.fisico <= 0 })),
            h('div.row.wrap', { style: { marginTop: '10px' } }, h('span.small', 'Recuento: en la estantería hay'), count, btn('Guardar recuento', recount, { cls: 'sm primary' })),
            h('p.tiny.muted', { style: { margin: '6px 0 0' } }, 'El recuento apunta la diferencia y queda en el historial. No hace falta tocar el Excel.')) : h('p.small.muted', '🔒 Para sumar o restar unidades hace falta el permiso "Mover stock".'),
          cfgEdit ? h('div.form', field('Stock mínimo (aviso)', minI, 'Al bajar de aquí: aviso en la app y por Telegram.'), field('Ubicación física', locI)) : null,
          open.length ? h('div', h('h4', { style: { marginBottom: '6px' } }, 'Pedidos que la tienen apartada (' + open.length + ')'), h('div.list.boxed', open.map(o => h('div.item', { onclick: () => go('pedidos/' + o.id) }, h('b', 'nº ' + o.numero), h('span.grow.ellipsis', o.cliente), h('span.small', (Number(o.cantidad) || 1) + ' ud.'), pill(o.estado))))) : null,
          h('div', h('h4', { style: { marginBottom: '6px' } }, 'Historial'), hist.length ? h('div.timeline', hist.map(m => h('div.tl', m.go ? { onclick: () => go(m.go), style: { cursor: 'pointer' } } : {}, h('span.b'), h('div', h('div.small', m.i + ' ', h('b', m.t)), h('div.tiny.muted', (m.f ? (String(m.f).length > 10 ? ago(m.f) : fdate(m.f)) : '') + (m.s ? ' · ' + m.s : '')))))) : h('p.small.muted', 'Sin movimientos todavía.')),
          h('div.row.wrap', { style: { borderTop: '1px solid var(--line)', paddingTop: '12px' } },
            p ? btn('Ver producto', () => go('productos/' + p.id), { icon: 'cube', cls: 'sm' }) : null,
            btn('Etiqueta de ubicación', () => import('../labels.js').then(L => L.labelDialog('almacen', [x], { plantillas: ['almacen', 'producto', 'qr'],
              dataFor: t => t === 'almacen' ? L.dataFor('almacen', { p, nombre: x.producto, ubicacion: x.ubicacion }) : t === 'producto' && p ? L.dataFor('producto', { p }) : L.dataFor('qr', { tipo: 'stock', id: x.producto, titulo: x.producto + (x.ubicacion ? ' · ' + x.ubicacion : '') }) })), { icon: 'printer', cls: 'sm' }),
            can('taller.editar') ? btn('Imprimir más', () => import('./taller.js').then(m => m.jobForm({ productoId: p ? p.id : '', titulo: x.producto + ' (para stock)' })), { icon: 'printer', cls: 'sm' }) : null)));
    };
    res.update = draw; draw();
  });
  return res;
}
