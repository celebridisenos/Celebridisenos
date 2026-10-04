// ================= v11.4 · CENTRO DE EMBALAJE =================
// Un pedido se prepara desde una sola pantalla: producto (peso y medidas) · caja recomendada y su stock ·
// packaging calculado solo (caja, kraft, burbuja, cinta…) · trabajo adicional (solo si lo indicas) ·
// pérdidas de impresión pendientes (solo si lo confirmas) · costes y beneficio.
// FABRICACIÓN ≠ EMBALAJE ≠ MANO DE OBRA. Peso del producto ≠ peso del embalaje ≠ peso total.
import { h, mount, btn, modal, toast, eur, empty, field, inp, area, sel, pill, confirmDlg, fdt, fdate } from '../ui.js';
import { S, can, api, upsertLocal, emit, byId, pull, mutate, on } from '../store.js';
import { handleError, requestAccess, go } from '../app.js';
import * as E from '../envio.js';

const CL = window.CL;
const cfg = () => S.cfg || {};
const pp = () => cfg().precios || {};
const ec = () => cfg().embalaje || {};
const ph = o => CL.phaseOf(cfg().pedidos, o.estado);
export const packData = () => ({ materiales: S.t.materiales || [], embalajes: S.t.embalajes || [], recetas: S.t.recetas || [], productos: S.t.productos || [], calculadora: S.t.calculadora || [], gastos: S.t.gastos || [] });
const verCostes = () => can('productos.costes');
const g = v => v === null || v === undefined || v === '' ? null : Math.round(Number(v));
const gTxt = v => g(v) === null ? null : g(v).toLocaleString('es-ES') + ' g';
const CONF_CLS = { confirmado: 'ok', estimado: 'warn', orientativo: 'warn', revisar: 'bad', pendiente: 'bad', calculado: '', importado: '' };
const conf = e => pill(CL.CONF_TXT[e] || e || '—', CONF_CLS[e]);
const call = async (a, d, okMsg) => { try { const r = await api(a, d, { timeout: 120000 }); if (okMsg) toast(okMsg, 'ok'); try { await pull(); } catch (e) { } emit(); return r; } catch (e) { handleError(e); throw e; } };
const cajas = () => (S.t.materiales || []).filter(m => m.tipo === 'caja' && CL.norm(m.activo) !== 'no');
const fallosPend = () => (S.t.fallos || []).filter(f => f.estado === 'pendiente' && Number(f.coste) > 0);
export const isPacked = o => !!(o.embalaje && o.embalaje.hecho);

const VIEWS = {};
export function render(el, params) {
  Object.assign(VIEWS, { pedidos: drawOrders, cajas: drawBoxes, config: drawConfig, perdidas: drawLosses, tarjeta: drawCard });
  const cur = String(cfg().version || '0').split('.').map(Number);
  if ((cur[0] || 0) * 10000 + (cur[1] || 0) * 100 + (cur[2] || 0) < 110400) { import('./costes.js').then(C => C.needServer(el, '11.4.0')); return {}; }
  let tab = params[0] || 'pedidos';
  const body = h('div'), tabs = h('div.tabs');
  el.append(h('div.page-head', h('div', h('h1', '📦 Embalaje'), h('div.muted.small', 'Prepara cada paquete desde aquí: caja, packaging, peso, etiquetas, trabajo adicional y costes. El packaging se calcula solo.')),
    h('div.row', btn('Escanear paquete', () => go('escanear'), { icon: 'qr' }), btn('QR para mi mesa', () => import('./escanear.js').then(m => m.mesaDialog()), { icon: 'printer', cls: 'ghost' }))), tabs, body);
  const T = { pedidos: 'Para empaquetar', cajas: 'Cajas', config: 'Packaging (consumos y precios)', tarjeta: 'Tarjeta y mensajes', perdidas: 'Pérdidas de impresión' };
  const draw = () => {
    mount(tabs, Object.keys(T).map(k => h('button' + (tab === k ? '.on' : ''), { onclick: () => { tab = k; history.replaceState(null, '', '#/embalaje/' + k); draw(); } }, T[k] + (k === 'perdidas' && fallosPend().length ? ' (' + fallosPend().length + ')' : ''))));
    (VIEWS[tab] || drawOrders)(body);
  };
  draw();
  // los formularios (Packaging, Tarjeta y mensajes) no se rehacen al sincronizar: se perdería lo que estás escribiendo
  return { update: () => { if (tab !== 'config' && tab !== 'tarjeta') draw(); } };
}

// ---------- Para empaquetar ----------
function drawOrders(el) {
  const ped = S.t.pedidos || [];
  const now = ped.filter(o => ph(o) === 'empaquetar'), next = ped.filter(o => ph(o) === 'postpro'), done = ped.filter(o => isPacked(o) && o.embalaje.hecho === S.hoy);
  const low = cajas().filter(m => m.stock !== '' && m.stock !== undefined && Number(m.stock) <= (m.stockMin !== '' && m.stockMin !== undefined ? Number(m.stockMin) : Number(ec().avisoCajas || 0)));
  const card = o => {
    const c = CL.orderCosts(o, packData(), cfg()), p = CL.productOf(o, packData());
    return h('div.card', { style: { cursor: 'pointer' }, onclick: () => packPanel(o.id) },
      h('div.row', h('b.grow', 'Nº ' + o.numero + ' · ' + o.cliente), pill(o.estado, '', (cfg().pedidos.estados.find(s => s.k === o.estado) || {}).c)),
      h('div.small', (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + o.producto),
      h('div.tiny.muted', [c.embalaje.caja ? '📦 ' + c.embalaje.caja : '📦 sin caja', c.pesos.total !== null ? '⚖️ ' + gTxt(c.pesos.total) : (p && p.pesoG ? '⚖️ pieza ' + gTxt(p.pesoG) + ' + embalaje ¿?' : '⚖️ peso pendiente'),
        verCostes() ? '🧾 packaging ' + eur(c.embalaje.coste) : null].filter(Boolean).join(' · ')),
      h('div.tiny.muted', [o.codigo || null, o.etiquetaEnvio && o.etiquetaEnvio.archivoId ? '🏷️ etiqueta oficial adjunta' : '🏷️ sin etiqueta oficial', E.pendingOf(o).length ? '🖨️ ' + E.pendingOf(o).length + ' por imprimir' : '🖨️ todo impreso'].filter(Boolean).join(' · ')));
  };
  mount(el,
    low.length ? h('div.card.flat', { style: { borderColor: 'var(--warn)', marginBottom: '12px' } }, h('b', '📦 Quedan pocas cajas: '), low.map(m => m.nombre + ' (' + m.stock + ')').join(' · '), ' ', btn('Ver cajas', () => go('embalaje/cajas'), { cls: 'sm' })) : null,
    h('h3', 'Para empaquetar (' + now.length + ')'),
    now.length ? h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' } }, now.map(card)) : empty('box', 'Nada para empaquetar', 'Cuando un pedido pase a «Empaquetar», aparecerá aquí con su caja y su packaging calculados.'),
    next.length ? h('div', h('h3', { style: { marginTop: '18px' } }, 'Próximos (en postprocesado: ' + next.length + ')'), h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' } }, next.map(card))) : null,
    done.length ? h('div', h('h3', { style: { marginTop: '18px' } }, 'Cerrados hoy (' + done.length + ')'), h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' } }, done.map(card))) : null);
}

// ---------- Panel de un pedido: todo en una pantalla ----------
export function packPanel(id) {
  let m;
  const box = h('div');
  const draw = () => {
    const o = byId('pedidos', id);
    if (!o) { mount(box, empty('alert', 'Este pedido ya no existe', '')); return; }
    const D = packData(), c = CL.orderCosts(o, D, cfg()), p = CL.productOf(o, D), cli = o.clienteId ? byId('clientes', o.clienteId) : null;
    const packed = isPacked(o), edit = can('pedidos.editar') && !packed;
    const dims = CL.parseDims(p ? p.tamano : '');
    const opts = CL.boxOptions(dims, o.cantidad, cajas(), ec().margenProteccion);
    const curCaja = c.embalaje.caja;
    const sec = (t, ...k) => h('div.card.flat', { style: { marginBottom: '10px' } }, h('div.lbl', { style: { marginBottom: '6px', fontWeight: 700 } }, t), ...k);
    const fact = (l, v) => h('div.fact', h('div.l', l), h('div.v', v));
    mount(box,
      E.prepareBanner(o, draw),
      sec('PRODUCTO', h('div.facts', fact('Producto', (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + o.producto),
        fact('Peso del producto (la pieza)', c.pesos.producto !== null ? gTxt(c.pesos.producto) + (Number(o.cantidad) > 1 ? ' × ' + o.cantidad + ' = ' + gTxt(c.pesos.productoTotal) : '') : h('span.warn-t', 'PENDIENTE: apúntalo en la ficha del producto')),
        fact('Medidas', dims ? dims.map(x => String(x).replace('.', ',')).join(' × ') + ' cm' : h('span.warn-t', 'PENDIENTE: «Tamaño» en la ficha')))),
      sec('CAJA', packed ? h('div', '📦 ', h('b', o.embalaje.snap ? o.embalaje.snap.caja || '—' : '—'), o.embalaje.cajaDescontada ? h('span.small.muted', ' · descontada del stock' + (o.embalaje.cajaQueda !== '' && o.embalaje.cajaQueda !== undefined ? ' (quedan ' + o.embalaje.cajaQueda + ')' : '')) : null)
        : h('div.col', { style: { gap: '6px' } },
          opts.length ? opts.slice(0, 4).map((x, i) => h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } },
            h('b', { style: { minWidth: '180px' } }, (curCaja === x.nombre ? '✅ ' : '') + x.nombre), pill(x.cabe === 'si' ? 'CABE' : x.cabe === 'probable' ? 'PROBABLE' : x.cabe === 'no' ? 'NO CABE' : 'SIN DATOS', x.cabe === 'si' ? 'ok' : x.cabe === 'no' ? 'bad' : 'warn'),
            h('span.small.muted.grow', x.motivo), h('span.small', x.stock === null ? 'stock sin contar' : 'stock: ' + x.stock),
            edit && curCaja !== x.nombre && x.cabe !== 'no' ? btn('Usar esta', () => setPack(o, { cajaId: x.id }), { cls: 'sm' + (i === 0 ? ' primary' : '') }) : null))
            : h('p.small.warn-t', 'No hay cajas en Materiales. Añádelas en la pestaña Cajas.'),
          h('p.tiny.muted', 'Protección: ' + String(ec().margenProteccion ?? 0).replace('.', ',') + ' cm por lado (ESTIMACIÓN que puedes cambiar en «Packaging»). No se inventan medidas: lo que falta se dice.'))),
      sec('PACKAGING', h('div.row.wrap', h('span.grow.small', c.embalaje.plantilla ? 'Embalaje: ' + c.embalaje.plantilla.nombre + (c.embalaje.congelado ? ' (congelado el ' + c.embalaje.fecha + ')' : '') : h('span.warn-t', 'No hay embalaje estándar: créalo en «Packaging»')),
        edit && (S.t.embalajes || []).length > 1 ? sel([{ v: '', t: 'Cambiar embalaje…' }].concat((S.t.embalajes || []).map(e => ({ v: e.id, t: e.nombre }))), '', { onchange: e => e.target.value && setPack(o, { plantillaId: e.target.value }) }) : null),
        h('div.list', (c.embalaje.lineas || []).map(l => h('div.item', { style: { cursor: 'default' } }, h('span.grow.small', h('b', l.n || l.nombre), ' ', h('span.tiny.muted', (l.q !== undefined ? l.q : l.cantidad) + ' ' + ((CL.UNITS[l.u || l.unidad] || {}).t || ''))),
          (l.est || l.estimado) ? pill('ESTIMADO', 'warn') : null, verCostes() ? h('span.small', (l.c !== undefined ? l.c : l.coste) === null ? 'PENDIENTE' : eur(l.c !== undefined ? l.c : l.coste)) : null))),
        (c.embalaje.pendientes || []).length ? h('p.small.warn-t', '⏳ Falta: ' + c.embalaje.pendientes.map(x => x.nombre + ' — ' + x.falta).join(' · ')) : null),
      sec('PESO', h('div.facts', fact('Producto', c.pesos.productoTotal !== null ? gTxt(c.pesos.productoTotal) : h('span.warn-t', 'PENDIENTE')),
        fact('Embalaje', c.pesos.embalaje !== null && c.pesos.embalaje !== undefined ? gTxt(c.pesos.embalaje) + (c.pesos.embalajeFuente === 'medido' ? ' (pesado)' : ' (calculado)') : h('span.warn-t', 'PENDIENTE: pesa el embalaje vacío una vez (Packaging)')),
        fact('TOTAL del paquete', c.pesos.total !== null ? h('b', gTxt(c.pesos.total)) : h('span.warn-t', 'PENDIENTE')))),
      sec('TRABAJO ADICIONAL', h('div.row.wrap', h('span.grow', c.manoObra.respondido ? (c.manoObra.minutos ? c.manoObra.minutos + ' min' + (verCostes() ? ' = ' + eur(c.manoObra.coste) : '') + ' · ' + c.manoObra.lineas.map(l => (CL.LABOR_TIPOS.find(t => t[0] === l.tipo) || [0, l.tipo])[1] + ' ' + l.min + ' min').join(', ') : 'No hubo trabajo adicional (0 €)')
        : h('span.muted', 'Sin indicar: 0 € (se pregunta al cerrar el paquete)')), can('pedidos.editar') ? btn(c.manoObra.respondido ? 'Cambiar' : 'Indicar', () => laborDialog(o, true), { cls: 'sm' }) : null)),
      lossesBlock(o, c),
      sec('PEDIDO', h('div.facts', fact('Cliente', o.cliente), fact('País', (cli && cli.pais && cli.pais !== '•••') ? cli.pais : h('span.muted', 'sin indicar')), fact('Envío', o.envio || h('span.muted', 'sin indicar')),
        fact('Estado', pill(o.estado, '', (cfg().pedidos.estados.find(s => s.k === o.estado) || {}).c)), o.seguimiento ? fact('Seguimiento', o.seguimiento) : null)),
      E.printBlock(o, { redraw: draw }),
      verCostes() ? costCenter(c) : null,
      h('div.row.wrap', { style: { marginTop: '6px' } },
        can('pedidos.editar') && !packed && ['reserva', 'confirmado', 'impresion', 'postpro'].includes(ph(o)) ? btn('Pasar a «' + (CL.stateOfPhase(cfg().pedidos, 'empaquetar') || 'Empaquetar') + '»', async () => { await changeTo(o, CL.stateOfPhase(cfg().pedidos, 'empaquetar')); draw(); }, { icon: 'box' }) : null,
        can('pedidos.editar') && !packed ? btn('✅ Paquete hecho → ' + (CL.stateOfPhase(cfg().pedidos, 'listo') || 'Listo para envío'), async () => { if (await closePack(o)) { draw(); } }, { cls: 'primary' }) : null,
        packed && can('pedidos.editar') && ph(o) === 'listo' ? btn('🚚 Preparado para enviar', () => E.sendCheck(o, draw), { cls: 'primary' }) : null,
        packed && can('pedidos.editar') ? btn('Rehacer el embalaje', () => redoDialog(o, draw), { cls: 'ghost' }) : null,
        btn('Etiqueta de dirección propia', () => import('./pedidos.js').then(P => P.labelDialog(o)), { icon: 'printer', cls: 'ghost' }),
        h('span.grow'), btn('Abrir el pedido', () => { m && m.close(); go('pedidos/' + o.id); }, { cls: 'ghost' })));
  };
  draw();
  const o0 = byId('pedidos', id);
  let off = null;
  m = modal('📦 Embalaje · pedido nº ' + (o0 ? o0.numero : ''), box, null, { size: 'wide', onclose: () => off && off() });
  off = on(draw); // se redibuja solo cuando cambian los datos (otra persona, la caja, el estado…)
  return m;
}
async function setPack(o, choice) {
  try {
    const r = await mutate('pedidos.guardar', { id: o.id, datos: { embalaje: choice } }, { onlineOnly: true, label: 'Embalaje nº ' + o.numero });
    if (r && r.id) { upsertLocal('pedidos', r); emit(); }
  } catch (e) { handleError(e, 'pedidos'); }
}
async function changeTo(o, estado) { const P = await import('./pedidos.js'); return P.changeState(o, estado); }
// Cierra el paquete: pregunta el trabajo adicional y pasa a «Listo para envío» (la caja sale del stock)
export async function closePack(o, estado) {
  const target = estado || CL.stateOfPhase(cfg().pedidos, 'listo');
  const P = await import('./pedidos.js');
  return P.changeState(o, target);
}
function redoDialog(o, after) {
  const back = h('input', { type: 'checkbox', checked: !!o.embalaje.cajaDescontada }), motivo = inp({ placeholder: 'Ej.: me equivoqué de caja' });
  modal('Rehacer el embalaje · nº ' + o.numero, h('div.col', h('p.small', 'El paquete vuelve a calcularse (caja y packaging de hoy).'), o.embalaje.cajaDescontada ? h('label.check', back, 'Devolver la caja al stock') : null, field('Motivo', motivo)),
    close => [btn('Cancelar', close), btn('Rehacer', async () => { close(); try { const r = await call('pedidos.embalajeRehacer', { id: o.id, devolverCaja: back.checked, motivo: motivo.value }, 'Embalaje abierto de nuevo'); if (r && r.pedido) { upsertLocal('pedidos', r.pedido); emit(); } after && after(); } catch (e) { } }, { cls: 'primary' })], { size: 'narrow' });
}

// ---------- ¿Has realizado trabajo adicional? (10 €/h ÷ 60 × minutos; sin respuesta → 0 €) ----------
// Devuelve el trabajo indicado, {lineas:[]} si «No», o null si se cancela.
export function askLabor(o) {
  return new Promise(resolve => {
    const rate = Number(pp().manoObraHora) || 0, sel0 = {};
    ((o.trabajoExtra && o.trabajoExtra.lineas) || []).forEach(l => { sel0[l.tipo] = l.min; });
    const total = h('p.bold'), rows = h('div.col', { style: { gap: '8px' } });
    const fab = verCostes() ? CL.fabOf(o, packData(), pp()) : null;
    const hint = fab && fab.excluido && fab.excluido.manoObra ? h('p.tiny.muted', 'La receta del producto lleva ' + eur(fab.excluido.manoObra) + ' de mano de obra: ya NO se suma sola; indícalo aquí si lo has hecho.') : null;
    const upd = () => { const min = Object.values(sel0).reduce((a, v) => a + (Number(v) || 0), 0); total.textContent = min ? min + ' min × ' + String(rate).replace('.', ',') + ' €/h = ' + eur(Math.round(rate / 60 * min * 100) / 100) : 'Sin trabajo adicional: 0 €'; };
    const draw = () => mount(rows, CL.LABOR_TIPOS.map(([k, t]) => {
      const on = sel0[k] !== undefined;
      const custom = inp({ type: 'number', min: 1, max: 600, step: 1, placeholder: 'min', value: on && !CL.LABOR_MIN.includes(Number(sel0[k])) ? sel0[k] : '', style: { width: '80px' }, 'aria-label': 'Minutos de ' + t });
      custom.oninput = () => { if (custom.value) { sel0[k] = Number(custom.value); upd(); } };
      return h('div.row.wrap', { style: { gap: '6px', alignItems: 'center' } },
        h('button.chip' + (on ? '.on' : ''), { onclick: () => { if (on) delete sel0[k]; else sel0[k] = 20; draw(); upd(); } }, t),
        on ? h('div.seg.sm', CL.LABOR_MIN.filter(x => x > 0).map(mn => h('button' + (Number(sel0[k]) === mn ? '.on' : ''), { onclick: () => { sel0[k] = mn; draw(); upd(); } }, mn + ' min'))) : null,
        on ? custom : null);
    }));
    draw(); upd();
    let done = false;
    const finish = v => { if (done) return; done = true; resolve(v); };
    modal('¿Has realizado trabajo adicional? · nº ' + o.numero, h('div.col', h('p.small.muted', 'Solo se cobra lo que indiques (' + String(rate).replace('.', ',') + ' €/h). Los 20 min son solo una referencia: elige lo que has hecho de verdad.'), rows, total, hint),
      close => [btn('Cancelar', () => { finish(null); close(); }, { cls: 'ghost' }), h('span.grow'),
        btn('No, nada (0 €)', () => { finish({ lineas: [] }); close(); }),
        btn('Guardar', () => { finish({ lineas: Object.keys(sel0).map(k => ({ tipo: k, min: Number(sel0[k]) || 0 })).filter(l => l.min > 0) }); close(); }, { cls: 'primary' })], { size: 'narrow', onclose: () => finish(null) });
  });
}
export async function laborDialog(o, standalone) {
  const tr = await askLabor(o);
  if (!tr) return null;
  if (standalone) {
    try { const r = await call('pedidos.trabajo', { id: o.id, trabajoExtra: tr }, 'Trabajo adicional guardado'); if (r && r.id) { upsertLocal('pedidos', r); emit(); } } catch (e) { }
  }
  return tr;
}

// ---------- Pérdidas de impresión pendientes: SOLO si lo confirmas ----------
function lossesBlock(o, c) {
  if (!verCostes() || !can('pedidos.editar')) return null;
  const inc = c.perdidasLista || [], pend = fallosPend();
  if (!inc.length && (!pend.length || ec().preguntarPerdidas === false)) return null;
  const tot = Math.round(pend.reduce((a, f) => a + Number(f.coste), 0) * 100) / 100;
  return h('div.card.flat', { style: { marginBottom: '10px', borderColor: pend.length ? 'var(--warn)' : undefined } }, h('div.lbl', { style: { fontWeight: 700, marginBottom: '6px' } }, 'PÉRDIDAS DE IMPRESIÓN'),
    inc.length ? h('div.list', inc.map(x => h('div.item', { style: { cursor: 'default' } }, h('span.grow.small', 'Incluida: ' + (x.titulo || x.falloId)), h('b.small', eur(x.importe)),
      btn('Quitar', () => call('fallos.liberar', { id: x.falloId }, 'Pérdida quitada de este pedido').catch(() => { }), { cls: 'sm ghost' })))) : null,
    pend.length ? h('div', h('p.small', 'Hay ', h('b', eur(tot)), ' de pérdidas de impresión pendientes. ¿Quieres incluirlas en este pedido?'),
      h('div.row.wrap', btn('Elegir cuáles…', () => pickLosses(o, pend), { cls: 'sm' }), h('span.tiny.muted', 'Nunca se suman solas.'))) : null);
}
function pickLosses(o, pend) {
  const checks = pend.map(f => ({ f, c: h('input', { type: 'checkbox', checked: false }) }));
  modal('Incluir pérdidas en el pedido nº ' + o.numero, h('div.list', checks.map(x => h('label.item', { style: { cursor: 'pointer' } }, x.c, h('span.grow.small', h('b', x.f.titulo), ' · ' + fdate(String(x.f.fecha).slice(0, 10)) + ' · ' + x.f.motivo), h('b.small', eur(x.f.coste))))),
    close => [btn('Cancelar', close), btn('Incluir las marcadas', async () => {
      const ids = checks.filter(x => x.c.checked).map(x => x.f.id); if (!ids.length) return toast('Marca al menos una', 'warn');
      close(); try { const r = await call('fallos.recuperar', { pedidoId: o.id, ids }, 'Incluidas en el pedido'); if (r && r.pedido) { upsertLocal('pedidos', r.pedido); emit(); } } catch (e) { }
    }, { cls: 'primary' })], { size: 'narrow' });
}

// ---------- Centro de costes del pedido (fabricación ≠ embalaje ≠ mano de obra) ----------
export function costCenter(c) {
  const row = (t, v, extra, cls) => h('div.item' + (cls ? '.' + cls : ''), { style: { cursor: 'default' } }, h('span.grow', t, extra ? h('span.tiny.muted', ' ' + extra) : null), h('b', v));
  const fab = c.fabricacion, fil = fab && fab.filamento;
  return h('div.card.flat', { style: { marginBottom: '10px' } }, h('div.lbl', { style: { fontWeight: 700, marginBottom: '6px' } }, 'COSTES Y RESULTADO'),
    h('div.list',
      row('Ingreso (precio de venta)', eur(c.ingreso)),
      h('div.item', { style: { cursor: 'default', flexDirection: 'column', alignItems: 'stretch' } },
        h('div.row', h('span.grow', 'Fabricación', fab ? h('span.tiny.muted', ' ' + fab.fuente + (c.cantidad > 1 ? ' · ' + eur(fab.unidad) + ' × ' + c.cantidad : '')) : null), h('b', fab ? eur(fab.total) : h('span.warn-t', 'SIN COSTE'))),
        fil && fil.coste !== null ? h('div.tiny', fil.fuente === 'bambu' ? '🧵 Coste de filamento: ' + eur(fil.coste) + ' · Fuente: Bambu Studio' : '🧵 Coste estimado de filamento: ' + eur(fil.coste) + ' · Fuente: cálculo propio') : null,
        fab && fab.aviso ? h('div.tiny.warn-t', fab.aviso) : null,
        fab && fab.lineas ? h('div.tiny.muted', fab.lineas.filter(l => l.n !== 'Filamento').map(l => l.n + ' ' + eur(l.c)).join(' · ')) : null),
      row('Embalaje', eur(c.embalaje.coste), (c.embalaje.congelado ? 'congelado' : 'calculado') + (c.embalaje.completo ? '' : ' · INCOMPLETO') + (c.embalaje.estado === 'estimado' ? ' · consumos ESTIMADOS' : '')),
      row('Mano de obra', eur(c.manoObra.coste), c.manoObra.respondido ? (c.manoObra.minutos ? c.manoObra.minutos + ' min indicados' : 'sin trabajo adicional') : 'sin indicar'),
      c.perdidas ? row('Pérdidas de impresión incluidas', eur(c.perdidas)) : null,
      c.otros ? row('Extraordinarios', eur(c.otros), (c.gastos || []).map(x => x.concepto).filter(Boolean).join(', ')) : null,
      row('Envío', eur(c.envio), c.envioEstimado ? 'ESTIMADO' : ''),
      row('Comisión', eur(c.comision), c.comisionEstimada ? 'ESTIMADA' : ''),
      row('Coste total', c.coste === null ? '—' : eur(c.coste), '', 'bold'),
      h('div.item', { style: { cursor: 'default' } }, h('span.grow', h('b', 'Beneficio')), c.beneficio === null ? h('span.warn-t', 'Falta el coste de fabricación') : h('b', { class: c.beneficio < 0 ? 'bad-t' : 'ok-t' }, eur(c.beneficio) + (c.margen !== null ? ' · ' + Math.round(c.margen * 100) + ' %' : '')))));
}

// ---------- Cajas: inventario, aviso de stock bajo, entradas y recuentos ----------
function drawBoxes(el) {
  const list = cajas(), mov = (S.t.movMateriales || []).slice(-15).reverse(), dflt = Number(ec().avisoCajas || 0);
  const mover = can('stock.mover');
  mount(el,
    h('p.small.muted', 'Cada caja usada al cerrar un paquete se descuenta sola (13 → 12). El precio y las medidas son los tuyos; lo que no sabemos queda PENDIENTE.'),
    can('costes.editar') ? h('div.row', { style: { margin: '10px 0' } }, btn('NUEVA CAJA (otro tamaño)', () => import('./costes.js').then(C => C.matForm({ tipo: 'caja', unidad: 'ud', cantidad: 1 })), { cls: 'primary', icon: 'plus' })) : null,
    list.length ? h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'Caja'), h('th', 'Medidas'), h('th', 'Stock'), h('th.hide-m', 'Avisar si quedan'), h('th', 'Precio/ud'), h('th.hide-m', 'Peso'), h('th', ''))),
      h('tbody', list.map(m => {
        const st = m.stock === '' || m.stock === undefined ? null : Number(m.stock), min = m.stockMin !== '' && m.stockMin !== undefined ? Number(m.stockMin) : dflt, c = CL.matCost(m);
        return h('tr', h('td.bold', m.nombre), h('td', [m.largo, m.ancho, m.alto].map(v => v === '' || v === undefined ? '¿?' : v).join(' × ') + ' cm'),
          h('td', st === null ? h('span.muted', 'sin contar') : h('b', { class: st <= 0 ? 'bad-t' : st <= min ? 'warn-t' : '' }, st)), h('td.hide-m', min || '—'),
          h('td', c.coste === null ? h('span.warn-t', 'PENDIENTE') : eur(c.coste)), h('td.hide-m', m.pesoG ? m.pesoG + ' g' : h('span.muted', '¿?')),
          h('td', h('div.row', mover ? btn('+ Entrada', () => stockDialog(m, 'entrada'), { cls: 'sm' }) : null, mover ? btn('Recuento', () => stockDialog(m, 'recuento'), { cls: 'sm ghost' }) : null,
            can('costes.editar') ? btn('', () => import('./costes.js').then(C => C.matForm(m)), { cls: 'sm ghost icon', icon: 'edit', title: 'Editar' }) : null)));
      })))) : empty('box', 'Sin cajas', 'Añade tus cajas con su tamaño, precio y unidades.'),
    mov.length ? h('div', h('h3', { style: { marginTop: '16px' } }, 'Últimos movimientos'), h('div.list', mov.map(x => h('div.item', { style: { cursor: 'default' } }, h('span.tiny.muted', fdt(x.fecha)), h('span.grow.small', x.material + ' · ' + x.motivo + (x.pedido ? ' · pedido nº ' + x.pedido : '')),
      h('b.small', (Number(x.cambio) > 0 ? '+' : '') + x.cambio + ' → ' + x.despues))))) : null);
}
function stockDialog(m, kind) {
  const n = inp({ type: 'number', min: kind === 'recuento' ? 0 : 1, step: 1, value: kind === 'recuento' ? (m.stock ?? '') : '', placeholder: kind === 'recuento' ? 'Cuántas hay ahora' : 'Cuántas entran' });
  const motivo = inp({ placeholder: kind === 'recuento' ? 'Recuento' : 'Compra' });
  modal((kind === 'recuento' ? 'Recuento · ' : 'Entrada · ') + m.nombre, h('div.form', field(kind === 'recuento' ? 'Unidades que hay' : 'Unidades que entran', n), field('Motivo', motivo)),
    close => [btn('Cancelar', close), btn('Guardar', async () => {
      if (n.value === '') return toast('Escribe la cantidad', 'warn');
      close(); await call('materiales.stock', kind === 'recuento' ? { id: m.id, nuevo: Number(n.value), motivo: motivo.value || 'Recuento' } : { id: m.id, cambio: Number(n.value), motivo: motivo.value || 'Compra' }, 'Stock actualizado').catch(() => { });
    }, { cls: 'primary' })], { size: 'narrow' });
}

// ---------- Packaging: el embalaje estándar con sus consumos (ESTIMADOS) y los precios reales ----------
function drawConfig(el) {
  const embs = S.t.embalajes || [], std = CL.defaultPack(packData());
  const packMats = (S.t.materiales || []).filter(m => (m.tipo === 'embalaje' || m.tipo === 'caja') && CL.norm(m.activo) !== 'no');
  const editCost = can('costes.editar'), editCfg = can('config.editar');
  const margen = inp({ type: 'number', min: 0, max: 10, step: 0.5, value: ec().margenProteccion ?? '', style: { width: '90px' } });
  const aviso = inp({ type: 'number', min: 0, max: 100, step: 1, value: ec().avisoCajas ?? '', style: { width: '90px' } });
  const askT = h('input', { type: 'checkbox', checked: ec().preguntarTrabajo !== false }), askP = h('input', { type: 'checkbox', checked: ec().preguntarPerdidas !== false });
  let stdBox = h('div');
  if (std) {
    const lineas = JSON.parse(JSON.stringify(std.lineas || []));
    const peso = inp({ type: 'number', min: 0, step: 1, value: std.pesoMedido ?? '', placeholder: 'g', style: { width: '100px' } });
    const out = h('div');
    const recalc = () => { const c = CL.linesCost(lineas, packData(), pp()); mount(out, h('div.row.wrap', h('b.grow', 'Coste por paquete: ' + (c.total === null ? 'al menos ' + eur(c.conocido) + ' (falta algún dato)' : eur(c.total))), conf(c.estado)),
      h('div.tiny.muted', 'Peso calculado del embalaje: ' + (c.peso === null ? 'PENDIENTE (falta el peso de: ' + c.pesoFalta.join(', ') + ')' : c.peso + ' g'))); };
    stdBox = h('div.card', h('div.row', h('h3.grow', '⭐ ' + std.nombre + ' (se usa en cada pedido)'), editCost ? btn('Editar materiales', () => go('costes/embalajes'), { cls: 'sm ghost' }) : null),
      h('div.list', lineas.map(l => {
        const mat = byId('materiales', l.materialId), q = inp({ type: 'number', min: 0, step: 'any', value: l.cantidad, style: { width: '90px' }, disabled: !editCost, 'aria-label': 'Consumo de ' + (mat ? mat.nombre : '') });
        const est = h('input', { type: 'checkbox', checked: !!l.estimado, disabled: !editCost });
        q.oninput = () => { l.cantidad = Number(q.value); recalc(); }; est.onchange = () => { l.estimado = est.checked; recalc(); };
        return h('div.item', { style: { cursor: 'default' } }, h('span.grow.small', h('b', mat ? mat.nombre : 'Material borrado')), q, h('span.small', (CL.UNITS[l.unidad || (mat && mat.unidad) || 'ud'] || {}).t || ''), h('label.check.tiny', est, 'estimado'));
      })),
      out, h('div.row.wrap', { style: { marginTop: '8px', alignItems: 'center' } }, h('span.small', 'Peso del embalaje vacío pesado en báscula (opcional):'), peso, h('span.tiny.muted', 'Si lo pesas una vez, se usa ese peso.')),
      editCost ? h('div.row', { style: { marginTop: '10px' } }, btn('Guardar consumos', async () => {
        await call('embalajes.guardar', { id: std.id, datos: { lineas: lineas.filter(l => l.materialId && Number(l.cantidad) > 0), pesoMedido: peso.value === '' ? '' : Number(peso.value) } }, 'Packaging guardado: los pedidos nuevos usan estos consumos').catch(() => { });
      }, { cls: 'primary' })) : null);
    recalc();
  } else stdBox = h('div.card', h('h3', 'No hay embalaje estándar'), h('p.small.muted', 'Crea un embalaje en Materiales y costes → Embalajes y márcalo como estándar, o carga tus precios en Materiales.'),
    editCost && embs.length ? h('div.row.wrap', embs.map(e => btn('Usar «' + e.nombre + '» como estándar', () => call('embalajes.guardar', { id: e.id, datos: { predeterminado: 'Sí' } }, 'Embalaje estándar elegido').catch(() => { }), { cls: 'sm' }))) : null);
  mount(el,
    h('p.small.muted', 'No hace falta medir cada centímetro: los consumos son ESTIMADOS y los cambias cuando sepas que gastas más o menos. Tus precios reales mandan sobre cualquier estimación.'),
    stdBox,
    h('div.card', { style: { marginTop: '12px' } }, h('h3', 'Precios y rollos (tus datos)'),
      h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'Material'), h('th', 'Precio'), h('th', 'Trae'), h('th.hide-m', 'Peso'), h('th', 'Coste/ud'), h('th.hide-m', 'Proveedor'), h('th.hide-m', 'Actualizado'), h('th', ''))),
        h('tbody', packMats.map(m => { const c = CL.matCost(m); return h('tr', { style: { cursor: editCost ? 'pointer' : 'default' }, onclick: () => editCost && import('./costes.js').then(C => C.matForm(m)) },
          h('td.bold', m.nombre), h('td', m.precio === '' || m.precio === undefined ? h('span.warn-t', 'PENDIENTE') : eur(m.precio)),
          h('td', m.cantidad === '' || m.cantidad === undefined ? h('span.warn-t', 'PENDIENTE') : String(m.cantidad).replace('.', ',') + ' ' + ((CL.UNITS[CL.unitKey(m.unidad) || 'ud'] || {}).t || ''), ' ', m.estadoCantidad && m.estadoCantidad !== 'confirmado' ? conf(m.estadoCantidad) : null),
          h('td.hide-m', m.pesoG ? m.pesoG + ' g' : '¿?'), h('td', c.coste === null ? '—' : (Math.round(c.coste * 10000) / 10000).toLocaleString('es-ES') + ' €/' + c.unidadTxt),
          h('td.hide-m', m.proveedor || '—'), h('td.hide-m', m.actualizado ? fdate(String(m.actualizado).slice(0, 10)) : '—'), h('td', editCost ? h('span.tiny.muted', 'editar') : null)); }))))),
    h('div.card', { style: { marginTop: '12px' } }, h('h3', 'Opciones'),
      h('div.form', field('Protección por lado al elegir caja (cm)', margen, 'ESTIMACIÓN: holgura para papel y burbuja'), field('Aviso de stock bajo de cajas', aviso, 'Para las cajas sin su propio aviso')),
      h('label.check', askT, 'Preguntar «¿Has realizado trabajo adicional?» al cerrar el paquete'), h('label.check', askP, 'Ofrecer incluir pérdidas de impresión pendientes'),
      editCfg ? btn('Guardar opciones', () => call('config.guardar', { clave: 'embalaje', valor: Object.assign({}, ec(), { margenProteccion: Number(margen.value) || 0, avisoCajas: Number(aviso.value) || 0, preguntarTrabajo: askT.checked, preguntarPerdidas: askP.checked }) }, 'Opciones guardadas').then(r => { if (r) S.cfg = Object.assign(S.cfg, r); }).catch(() => { }), { cls: 'primary' }) : h('p.tiny.muted', 'Solo una administradora puede cambiarlo.')));
}

// ---------- Pérdidas de impresión ----------
function drawLosses(el) {
  const all = (S.t.fallos || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const sum = st => Math.round(all.filter(f => f.estado === st).reduce((a, f) => a + (Number(f.coste) || 0), 0) * 100) / 100;
  const editT = can('taller.editar');
  mount(el,
    h('div.facts', h('div.fact', h('div.l', 'Pendiente de recuperar'), h('div.v.warn-t', eur(sum('pendiente')))), h('div.fact', h('div.l', 'Recuperado en pedidos'), h('div.v', eur(sum('recuperado')))), h('div.fact', h('div.l', 'Asumido (pérdida)'), h('div.v', eur(sum('asumido'))))),
    h('p.small.muted', { style: { margin: '8px 0' } }, 'Cada impresión que sale mal queda aquí con su coste ESTIMADO. Al preparar un pedido se te pregunta si quieres incluir lo pendiente: nunca se suma solo.'),
    editT ? h('div.row', { style: { marginBottom: '10px' } }, btn('Apuntar una pérdida', () => lossForm(), { icon: 'plus' })) : null,
    all.length ? h('div.list', all.map(f => h('div.item', { style: { cursor: 'default' } }, h('span.tiny.muted', fdt(f.fecha)),
      h('span.grow.small', h('b', f.titulo), ' · ' + (f.impresora ? f.impresora + ' · ' : '') + f.motivo + (f.progreso !== '' ? ' · al ' + f.progreso + ' %' : '') + ' · ' + (f.gramos || 0) + ' g', h('div.tiny.muted', f.fuenteCoste || '')),
      pill(f.estado === 'pendiente' ? 'PENDIENTE' : f.estado === 'recuperado' ? 'RECUPERADO (nº ' + f.recuperadoPedido + ')' : 'ASUMIDO', f.estado === 'pendiente' ? 'warn' : f.estado === 'recuperado' ? 'ok' : ''),
      can('productos.costes') ? h('b.small', eur(f.coste)) : null,
      editT && f.estado === 'pendiente' ? btn('Asumir', () => call('fallos.asumir', { id: f.id }, 'Marcada como pérdida').catch(() => { }), { cls: 'sm ghost' }) : null,
      editT && f.estado === 'asumido' ? btn('Deshacer', () => call('fallos.asumir', { id: f.id, deshacer: true }, 'Vuelve a estar pendiente').catch(() => { }), { cls: 'sm ghost' }) : null))) : empty('check', 'Sin pérdidas', 'Cuando una impresión salga mal aparecerá aquí.'));
}
function lossForm() {
  const imp = sel([{ v: '', t: '—' }].concat((S.t.impresoras || []).map(p => ({ v: p.id, t: p.nombre }))), ''), prod = sel([{ v: '', t: '—' }].concat((S.t.productos || []).map(p => ({ v: p.id, t: p.nombre }))), '');
  const motivo = sel(CL.FALLO_MOTIVOS.map(x => ({ v: x, t: x })), CL.FALLO_MOTIVOS[0]), gr = inp({ type: 'number', min: 0, step: 1, placeholder: 'g' }), hr = inp({ type: 'number', min: 0, step: 0.1, placeholder: 'h' }), titulo = inp({ placeholder: 'Qué se imprimía' }), notas = area({});
  modal('Apuntar una pérdida de impresión', h('div.form', field('Impresión', titulo), field('Impresora', imp), field('Producto', prod), field('Motivo', motivo), field('Filamento perdido (g)', gr), field('Horas de impresora', hr), field('Notas', notas, null, 'full')),
    close => [btn('Cancelar', close), btn('Guardar', async () => { close(); await call('fallos.registrar', { titulo: titulo.value, impresoraId: imp.value, productoId: prod.value, motivo: motivo.value, gramos: gr.value === '' ? 0 : Number(gr.value), horas: hr.value === '' ? 0 : Number(hr.value), notas: notas.value }, 'Pérdida apuntada').catch(() => { }); }, { cls: 'primary' })], { size: 'narrow' });
}

// ---------- v11.6 · Tarjeta de gracias, mensajes al cliente y qué se imprime en cada paquete ----------
function drawCard(el) {
  const c0 = JSON.parse(JSON.stringify(cfg().envio || {})), g = Object.assign({ titulo: '', texto: '', firma: '', logo: true, qrCodigo: false }, c0.gracias || {});
  const tj = Object.assign({ modo: 'hoja', tam: '85x55', n: 0, corte: 'marcas', color: '#e0457b', fondo: false, qr: false, pagina: {} }, c0.tarjeta || {}); tj.pagina = Object.assign({ mensaje: '', instagram: '', tiktok: '', web: '', whatsapp: '', email: '' }, tj.pagina || {});
  const im = Object.assign({ paquete: true, gracias: true, propiaSinOficial: false }, c0.imprimir || {});
  const msgs = (c0.mensajes || []).map(m => Object.assign({}, m));
  // v13.5: forma de cada tarjeta / etiqueta (círculo, rectángulo, esquinas redondeadas…) y línea de corte
  const formas = Object.assign({ tarjetas: 'rect', gracias: 'rect', regalo: 'rect', paquete: 'rect', qr: 'rect' }, c0.formas || {});
  const contorno = h('input', { type: 'checkbox', checked: c0.contorno !== false });
  const editCfg = can('config.editar');
  const ti = inp({ value: g.titulo, maxlength: 60 }), tx = area({ rows: 3, maxlength: 220 }), fi = inp({ value: g.firma, maxlength: 60 });
  tx.value = g.texto;
  const lg = h('input', { type: 'checkbox', checked: g.logo !== false }), qr = h('input', { type: 'checkbox', checked: !!tj.qr }), fo = h('input', { type: 'checkbox', checked: !!tj.fondo });
  const tam = sel(Object.keys({ '85x55': 1, '100x70': 1, '105x74': 1, '148x105': 1 }).map(k => ({ v: k, t: k.replace('x', ' × ') + ' mm' })), tj.tam);
  const corte = sel([{ v: 'marcas', t: 'Marcas de corte en las esquinas' }, { v: 'borde', t: 'Borde fino redondeado' }, { v: 'ninguno', t: 'Sin marcas' }], tj.corte);
  const color = inp({ type: 'color', value: tj.color || '#e0457b', style: { width: '60px', padding: '2px' } });
  const nIn = inp({ type: 'number', min: 1, max: 40, value: tj.n || '', placeholder: 'llenar la hoja', style: { width: '120px' } });
  const modo = sel([{ v: 'hoja', t: 'Hoja A4 con varias tarjetas (papel fotográfico) · recomendado' }, { v: 'etiqueta', t: 'Una etiqueta de 50 × 50 por pedido (impresora de etiquetas)' }], tj.modo);
  const pg = {}; ['mensaje', 'instagram', 'tiktok', 'web', 'whatsapp', 'email'].forEach(k => { pg[k] = inp({ value: tj.pagina[k] || '', placeholder: { mensaje: 'Tu apoyo hace posible que sigamos creando.', instagram: 'usuario (sin @)', tiktok: 'usuario (sin @)', web: 'https://tu-tienda…', whatsapp: '+34…', email: 'hola@…' }[k] }); });
  const sheetBox = h('div.card-sheet'), oneBox = h('div'), warn = h('div.small'), infoN = h('span.tiny.muted');
  const curG = () => ({ titulo: ti.value, texto: tx.value, firma: fi.value, logo: lg.checked, qrCodigo: false });
  const curT = () => ({ modo: modo.value, tam: tam.value, n: Number(nIn.value) || 0, corte: corte.value, color: color.value, fondo: fo.checked, qr: qr.checked, pagina: Object.fromEntries(Object.keys(pg).map(k => [k, pg[k].value.trim()])) });
  let timer = null;
  const redraw = () => { clearTimeout(timer); timer = setTimeout(paint, 120); };
  const shapeBox = h('div.shape-grid');
  const paint = async () => {
    const L = await import('../labels.js'), d = E.universalCard(curG(), curT(), formas.tarjetas);
    if (d.logo) d.logoImg = await L.loadLogo();
    const lay = L.cardLayout(d.tam, d.n, d.forma); infoN.textContent = lay.per + ' tarjetas caben en una hoja A4 (' + lay.cols + ' × ' + lay.rows + ')' + (d.forma !== 'rect' ? ' · forma: ' + L.SHAPES[d.forma].t.toLowerCase() : '');
    const sh = L.drawCardSheet(d, 60); sh.className = 'sheet-prev'; mount(sheetBox, sh);
    const one = L.drawOneCardCanvas(d, 300), s = L.oneCardSize(d); one.className = 'lbl-canvas'; one.style.width = s.w + 'mm'; one.style.height = s.h + 'mm'; one.dataset.forma = d.forma; L.cutPreview(one, d.forma, s.w); mount(oneBox, one);
    paintShapes(L, d);
    mount(warn, d.avisos.concat(d.sinQr ? [d.sinQr] : []).map(x => h('div.warn-t', '⚠️ ' + x)), d.qr ? h('div.tiny.muted', 'El QR abre: ', h('a', { href: d.qr, target: '_blank', rel: 'noopener' }, 'la página de agradecimiento')) : null);
  };
  // v13.5 · Una fila por plantilla con forma: botones de forma + vista previa en miniatura con esa forma
  const paintShapes = (L, dU) => {
    const cfgPrev = { formas, contorno: contorno.checked };
    const sample = k => k === 'tarjetas' ? null : k === 'gracias' ? Object.assign({ logoImg: dU.logoImg }, E.thanksData({ cliente: 'Lucía', producto: 'Maceta', numero: '1000' }, curG()), { qr: '' })
      : k === 'regalo' ? L.dataFor('regalo', { url: 'https://celebridisenos.github.io/regalo#ejemplo', numero: '1000', id: 'ejemplo', color: color.value })
      : k === 'paquete' ? { qr: 'CEB-2026-000000', codigo: 'CEB-2026-000000', numero: '1000', cliente: 'Lucía' } : { qr: 'https://celebridisenos.github.io/#/q/pedido/ejemplo', titulo: 'Pedido nº 1000' };
    const names = { tarjetas: 'Tarjeta de agradecimiento (hoja A4)', gracias: 'Tarjeta de gracias 50 × 50 (etiqueta)', regalo: 'Tarjeta de regalo con QR', paquete: 'Código del paquete (QR)', qr: 'Etiqueta QR' };
    mount(shapeBox, L.SHAPED.map(k => {
      let cv;
      try {
        if (k === 'tarjetas') cv = L.drawOneCardCanvas(Object.assign({}, dU, { forma: formas.tarjetas, corte: contorno.checked ? 'borde' : dU.corte }), 110);
        else { const sz = L.TEMPLATES[k]; cv = L.draw(k, Object.assign({}, sample(k), { forma: formas[k], contorno: contorno.checked }), 110, { w: sz.w, h: sz.h }); }
      } catch (e) { cv = h('div.tiny.bad-t', e.message); }
      if (cv.tagName === 'CANVAS') { cv.className = 'shape-prev'; cv.dataset.forma = formas[k]; L.cutPreview(cv, formas[k], k === 'tarjetas' ? L.oneCardSize(dU).w : L.TEMPLATES[k].w); }
      const btns = Object.keys(L.SHAPES).map(f => h('button.chip' + (formas[k] === f ? '.on' : ''), { type: 'button', disabled: !editCfg, title: L.SHAPES[f].t, 'aria-pressed': String(formas[k] === f), dataset: { forma: f, plantilla: k }, onclick: () => { formas[k] = f; redraw(); } }, L.SHAPES[f].i + ' ' + L.SHAPES[f].t.replace('Rectángulo con esquinas redondeadas', 'Esquinas redondeadas')));
      const sz = k === 'tarjetas' ? L.oneCardSize(dU) : L.TEMPLATES[k];
      return h('div.shape-row', { dataset: { plantilla: k } }, h('div.shape-pv', cv), h('div.grow', h('b.small', names[k]), h('div.tiny.muted', Math.round(sz.w) + ' × ' + Math.round(sz.h) + ' mm · ' + L.SHAPES[formas[k]].t), h('div.row.wrap.shape-btns', btns)));
    }));
  };
  contorno.addEventListener('change', redraw);
  [ti, tx, fi, nIn, color].concat(Object.values(pg)).forEach(x => x.addEventListener('input', redraw)); [lg, qr, fo, tam, corte, modo].forEach(x => x.addEventListener('change', redraw));
  const ck = (k, t) => { const c = h('input', { type: 'checkbox', checked: !!im[k] }); c.onchange = () => { im[k] = c.checked; }; return h('label.check', c, t); };
  const auto = h('input', { type: 'checkbox', checked: !!c0.autoAlEscanear });
  const autoImp = h('input', { type: 'checkbox', checked: c0.autoImprimir !== false });
  const mbox = h('div.col', { style: { gap: '10px' } });
  const drawMsgs = () => mount(mbox, msgs.map((m, i) => {
    const t = inp({ value: m.t, maxlength: 60 }), x = area({ rows: 3, maxlength: 1000 }); x.value = m.texto;
    t.oninput = () => { m.t = t.value; }; x.oninput = () => { m.texto = x.value; };
    return h('div.card.flat', h('div.row', t, editCfg ? btn('', () => { msgs.splice(i, 1); drawMsgs(); }, { cls: 'sm ghost icon', icon: 'trash', title: 'Quitar' }) : null), x);
  }), editCfg ? btn('Añadir mensaje', () => { msgs.push({ k: 'm' + Date.now().toString(36), t: 'Mensaje nuevo', texto: '¡Hola {cliente}! ' }); drawMsgs(); }, { cls: 'sm', icon: 'plus' }) : null);
  drawMsgs();
  const save = () => call('config.guardar', { clave: 'envio', valor: { gracias: curG(), tarjeta: curT(), imprimir: im, autoAlEscanear: auto.checked, autoImprimir: autoImp.checked, mensajes: msgs, formas, contorno: contorno.checked } }, 'Tarjeta y mensajes guardados').then(r => { if (r) S.cfg = Object.assign(S.cfg, r); }).catch(() => { });
  mount(el,
    h('div.card', h('h3', '💌 Tarjetas de agradecimiento'),
      h('p.small.muted', 'Tarjeta UNIVERSAL: sin el nombre del cliente, sirve para todos los pedidos. Así se imprimen varias juntas en una hoja A4 de papel fotográfico y se recortan.'),
      field('Cómo se imprimen', modo),
      h('div.thanks-edit', h('div.col',
        field('Título', ti), field('Texto', tx), field('Firma', fi, '{tienda} = el nombre de tu empresa'),
        h('div.form', field('Tamaño de cada tarjeta', tam), field('Corte', corte), field('Color de acento', color), field('Tarjetas por hoja', nIn, 'Vacío = las que quepan')),
        h('label.check', lg, 'Con mi logo (Configuración → Empresa y logo)'), h('label.check', fo, 'Fondo suave del color de acento'),
        h('label.check', qr, 'Con un QR a una página de agradecimiento (opcional)'),
        h('details.more', h('summary', 'Página de agradecimiento del QR'), h('div.in.form', field('Mensaje', pg.mensaje, null, 'full'), field('Instagram', pg.instagram), field('TikTok', pg.tiktok), field('Tienda / web', pg.web), field('WhatsApp', pg.whatsapp), field('Email', pg.email),
          h('p.tiny.muted.full', 'Solo sale lo que rellenes: no se inventa ninguna red ni contacto. La página es pública y no tiene acceso a tus datos.'))),
        warn),
        h('div.col', { style: { alignItems: 'center', gap: '6px' } }, h('div.tiny.muted', 'Una tarjeta a tamaño real'), oneBox, h('div.tiny.muted', 'Hoja A4'), sheetBox, infoN))),
    h('div.card.shapes-card', { style: { marginTop: '12px' } }, h('h3', '🔷 Forma de cada tarjeta y etiqueta'),
      h('p.small.muted', 'Cada diseño puede tener su forma: círculo, rectángulo, esquinas redondeadas u óvalo. Se usa en la vista previa, al imprimir (PC, Bluetooth), en el PDF y en la hoja A4. Las etiquetas de envío siempre son rectangulares (las pide el transportista).'),
      shapeBox, h('label.check', contorno, 'Dibujar la línea de corte de la forma (quítala si usas etiquetas ya troqueladas con esa forma)'),
      editCfg ? h('p.tiny.muted', 'Pulsa «Guardar» abajo para que la forma quede para todo el equipo.') : null),
    h('div.card', { style: { marginTop: '12px' } }, h('h3', '🖨️ Imprimir hojas de tarjetas'), h('div', { id: 'card-print' })),
    h('div.card', { style: { marginTop: '12px' } }, h('h3', '📦 Qué va con cada paquete'),
      ck('paquete', 'Código del paquete 50 × 50 (QR + CEB-…) para escanearlo'), ck('gracias', 'Tarjeta de agradecimiento (se marca «metida en el paquete»; en modo etiqueta se imprime)'), ck('propiaSinOficial', 'Si no hay etiqueta oficial, mi etiqueta de dirección 10 × 15'),
      h('label.check', autoImp, 'Imprimir solo lo que falte cuando un pedido llegue a «Empaquetar» (programa del PC; si falla, avisa)'),
      h('label.check', auto, 'Al escanear un pedido en «Empaquetar», imprimir solo lo que falte'),
      h('p.tiny.muted', 'La etiqueta oficial (Vinted, Correos, InPost…) se imprime siempre que esté adjunta. Nada se imprime dos veces: para otra copia está «Reimprimir», que queda apuntado.')),
    h('div.card', { style: { marginTop: '12px' } }, h('h3', '💬 Mensajes para el cliente'), h('p.small.muted', 'Para copiar y pegar en Vinted, Wallapop, WhatsApp… Se rellenan con los datos del pedido; el programa no los envía solo.'), mbox),
    editCfg ? h('div.row', { style: { marginTop: '12px' } }, btn('Guardar', save, { cls: 'primary' })) : h('p.tiny.muted', 'Solo una administradora puede cambiarlo.'),
    h('div', { id: 'lbl-printers' }));
  paint();
  cardPrintBox(el.querySelector('#card-print'), () => E.universalCard(curG(), curT(), formas.tarjetas));
  labelPrinterBox(el.querySelector('#lbl-printers'));
}
// Imprimir hojas de tarjetas: impresora de folios/fotos, calidad máxima que dice SU controlador, papel fotográfico
async function cardPrintBox(el, getCard) {
  const L = await import('../labels.js'), D = await import('../desktop.js');
  const hojas = inp({ type: 'number', min: 1, max: 20, value: 1, style: { width: '80px' } });
  const calidad = sel([{ v: 300, t: 'Alta (300 ppp) · recomendada' }, { v: 600, t: 'Máxima (600 ppp) · más lenta' }], 300);
  const info = h('div.small'), out = h('div');
  let prSel = null;
  if (D.desktop.on) {
    const list = L.realPrinters(await L.printers()), t = await L.targetFor('tarjetas');
    prSel = sel(list.filter(p => !p.label).map(p => ({ v: p.name, t: p.name + (p.offline ? ' · DESCONECTADA' : '') })), t.pr ? t.pr.name : '');
    const caps = async () => {
      if (!prSel.value) { mount(info, h('span.warn-t', 'No hay ninguna impresora de folios/fotos en este ordenador.')); return; }
      mount(info, h('span.muted', 'Leyendo lo que puede hacer la impresora…'));
      try {
        const c = await D.desktop.printerCaps(prSel.value);
        mount(info, h('div', '🖨️ Según su controlador: ', h('b', c.mejor || 'resolución no indicada'), c.color ? ' · en color' : ' · solo blanco y negro', (c.papeles || []).some(x => /a4/i.test(x)) ? ' · admite A4' : h('span.warn-t', ' · no dice que admita A4')),
          h('div.tiny.muted', 'El programa usa la mejor resolución que ofrece el controlador. El TIPO DE PAPEL (fotográfico, brillo/mate) y la calidad «Foto/Máxima» se eligen una vez en las preferencias de la impresora: Windows no deja cambiarlos desde aquí.'),
          btn('Abrir preferencias de la impresora (papel fotográfico)', () => D.desktop.printerPrefs(prSel.value).catch(e => toast(e.message, 'bad')), { cls: 'sm ghost' }));
      } catch (e) { mount(info, h('span.warn-t', 'No se pudo leer la impresora: ' + e.message)); }
    };
    prSel.onchange = caps; caps();
  } else mount(info, h('p.small.muted', 'En el móvil se crea un PDF A4 a tamaño real: imprímelo al 100 % (sin «Ajustar a la página») en papel fotográfico.'));
  mount(el, h('div.form', prSel ? field('Impresora', prSel) : null, field('Hojas', hojas), field('Calidad', calidad)), info,
    h('div.row', { style: { marginTop: '8px' } }, btn('🖨️ IMPRIMIR TARJETAS', async ev => {
      const b = ev.target.closest('button'); b.disabled = true;
      try { const d = getCard(); const r = await E.printCardSheets(d, { hojas: hojas.value, dpi: Number(calidad.value), printer: prSel && prSel.value }); mount(out, h('p.small.ok-t', r.how === 'printer' ? '✓ Enviado a ' + r.printer : '✓ PDF listo')); }
      catch (e) { toast('No se pudo imprimir: ' + e.message, 'bad', 8000); } b.disabled = false;
    }, { cls: 'primary' })), out);
}
// Mini panel de la impresora de etiquetas de ESTE ordenador
async function labelPrinterBox(el) {
  const L = await import('../labels.js'), D = await import('../desktop.js');
  if (!D.desktop.on) { mount(el, h('div.card', { style: { marginTop: '12px' } }, h('h3', '🏷️ Impresora de etiquetas'), h('p.small.muted', 'En el móvil se crea un PDF del tamaño exacto (100 × 150 o 50 × 50 mm). La impresora de etiquetas se elige en el programa del PC.'))); return; }
  const rows = await Promise.all(['oficial', 'paquete', 'gracias'].map(async k => { const t = await L.targetFor(k); return [k, t]; }));
  mount(el, h('div.card', { style: { marginTop: '12px' } }, h('h3', '🏷️ Impresoras de etiquetas de este ordenador'),
    h('div.list', rows.map(([k, t]) => h('div.item', { style: { cursor: 'default', flexWrap: 'wrap' } }, h('span.grow.small', h('b', L.TEMPLATES[k].t), ' · ' + t.size.w + ' × ' + t.size.h + ' mm'),
      t.pr ? h('span.small', t.pr.name + (t.pr.conexion ? ' · ' + t.pr.conexion : '')) : h('span.small.warn-t', 'No hay impresora: saldrá en PDF'),
      t.pr ? pill(t.pr.offline ? 'DESCONECTADA' : t.pr.problema ? t.pr.problema.toUpperCase() : 'LISTA', t.pr.offline || t.pr.problema ? 'bad' : 'ok') : null,
      t.pr ? btn('Prueba', () => L.printLabels('qr', [{ qr: 'CelebriDisenos-prueba', titulo: 'Prueba ' + t.size.w + '×' + t.size.h }], { printer: t.pr.name }).catch(e => toast(e.message, 'bad', 8000)), { cls: 'sm ghost', icon: 'printer' }) : null))),
    h('div.row', { style: { marginTop: '8px' } }, btn('Elegir impresoras, tamaños y calibrar', () => go('taller/papel'), { cls: 'sm' }), btn('Comprobar de nuevo', async () => { await L.printers(true); labelPrinterBox(el); }, { cls: 'sm ghost', icon: 'refresh' }))));
}
