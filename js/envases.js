// ================= v13.9 · EMBALAJE SENCILLO =================
// Stock → «📦 ENVASES / EMBALAJE»: cajas, sobres y bolsas (1 € cada uno, por medidas), papel kraft y papel marrón por metros (2 €/m)
// y la cinta a un coste fijo por pedido. En cada pedido: «📦 EMBALAJE DEL PEDIDO» (caja / sobre / bolsa + medida + metros + cinta).
// El servidor descuenta del stock al guardar el pedido (y devuelve si se cambia, se cancela o se borra).
import { h, mount, btn, modal, toast, eur, inp, pill, field, confirmDlg } from './ui.js';
import { S, can, api, mutate, byId, upsertLocal, emit } from './store.js';

const CL = window.CL;
export const sc = () => CL.simpleCfg((S.cfg && S.cfg.embalaje && S.cfg.embalaje.simple) || {});
export const TIPOS = CL.ENVASE_TIPOS; // [clave, icono, singular, plural]
export const envasesDe = tipo => (S.t.materiales || []).filter(m => m.tipo === tipo && CL.norm(m.activo) !== 'no')
  .sort((a, b) => (Number(a.largo) || 0) * (Number(a.ancho) || 0) * (Number(a.alto) || 1) - (Number(b.largo) || 0) * (Number(b.ancho) || 0) * (Number(b.alto) || 1) || String(a.nombre).localeCompare(String(b.nombre)));
export const hayEnvases = () => TIPOS.some(t => envasesDe(t[0]).length > 0);
const papel = k => { const id = sc()[k]; return id ? byId('materiales', id) : null; };
const num = v => Number(String(v ?? '').replace(',', '.')) || 0;
const fmt = v => String(Math.round(num(v) * 1000) / 1000).replace('.', ',');
const unidadTxt = m => CL.unitKey(m.unidad) === 'm' ? ' m' : (num(m.stock) === 1 ? ' unidad' : ' unidades');
const EST = { ok: ['🟢 Disponible', 'ok'], bajo: ['🟠 Stock bajo', 'warn'], agotado: ['🔴 Agotado', 'bad'], sin: ['⚪ Sin contar', ''] };
export const estadoPill = m => { const e = EST[CL.stockEstado(m, sc())] || EST.sin; return pill(e[0], e[1]); };
const packData = () => ({ materiales: S.t.materiales || [], simple: (S.cfg.embalaje || {}).simple });
export function costeDe(simple) { return simple && simple.tipo ? CL.simplePlan({ embalaje: { simple } }, packData()) : null; }
export function resumen(simple) {
  if (!simple || !simple.tipo) return '';
  const t = CL.envaseTipo(simple.tipo), m = simple.envaseId ? byId('materiales', simple.envaseId) : null;
  return [t[1] + ' ' + (m ? m.nombre : t[2] + ' (sin medida)'), simple.enMano ? 'entrega en mano' : '', num(simple.kraft) ? 'kraft ' + fmt(simple.kraft) + ' m' : '', num(simple.marron) ? 'papel marrón ' + fmt(simple.marron) + ' m' : '', simple.cinta ? 'cinta' : ''].filter(Boolean).join(' · ');
}

// ---------- «📦 EMBALAJE DEL PEDIDO»: lo que se elige en el pedido ----------
export function widget(o, opts = {}) {
  const s0 = (o && o.embalaje && o.embalaje.simple) || {};
  const st = { tipo: s0.tipo || '', envaseId: s0.envaseId || '', kraft: s0.kraft ? fmt(s0.kraft) : '', marron: s0.marron ? fmt(s0.marron) : '', cinta: !!s0.cinta, enMano: !!s0.enMano };
  const el = h('div.envase-pedido');
  const draw = () => {
    const c = sc(), lista = st.tipo ? envasesDe(st.tipo) : [];
    if (st.tipo && lista.length === 1 && !st.envaseId) st.envaseId = lista[0].id;
    if (st.envaseId && !lista.some(m => m.id === st.envaseId)) st.envaseId = '';
    const kraft = inp({ type: 'number', min: 0, max: 100, step: 0.1, value: st.kraft, placeholder: '0', 'aria-label': 'Papel kraft utilizado (m)', style: { width: '90px' } });
    const marron = inp({ type: 'number', min: 0, max: 100, step: 0.1, value: st.marron, placeholder: '0', 'aria-label': 'Papel marrón utilizado (m)', style: { width: '90px' } });
    kraft.oninput = () => { st.kraft = kraft.value; total(); }; marron.oninput = () => { st.marron = marron.value; total(); };
    const cinta = h('input', { type: 'checkbox', checked: st.cinta, 'aria-label': 'Utilizar cinta', onchange: e => { st.cinta = e.target.checked; total(); } });
    const tot = h('div.envase-total');
    const total = () => { if (opts.onChange) { try { opts.onChange(value()); } catch (e) { } } const p = costeDe(value()); mount(tot, p ? h('div', h('b', 'Coste del embalaje: ' + (p.coste === null ? 'al menos ' + eur(p.conocido) : eur(p.coste))), h('div.tiny.muted', p.lineas.map(l => l.nombre + (l.unidad === 'm' ? ' ' + fmt(l.cantidad) + ' m' : '') + ' ' + (l.coste === null ? 'sin precio' : eur(l.coste))).join(' + '))) : h('span.tiny.muted', 'Elige caja, sobre o bolsa.')); };
    mount(el,
      h('div.lbl', { style: { fontWeight: 700 } }, '📦 EMBALAJE DEL PEDIDO'),
      h('p.small', { style: { margin: '4px 0 6px' } }, '¿Cómo se entrega o se prepara este pedido?'),
      h('div.row.wrap.envase-tipos', { style: { gap: '8px' } }, TIPOS.map(([k, ic, sg]) => h('button.chip' + (st.tipo === k ? '.on' : ''), { type: 'button', 'data-tipo': k, onclick: () => { st.tipo = k; st.envaseId = ''; if (k !== 'bolsa') st.enMano = false; draw(); } }, ic + ' ' + sg + ' · ' + eur(c.precioEnvase)))),
      st.tipo ? (lista.length ? h('div.row.wrap', { style: { gap: '6px', marginTop: '8px' } }, h('span.small', 'Medida:'), lista.map(m => h('button.chip.envase-medida' + (st.envaseId === m.id ? '.on' : ''), { type: 'button', 'data-id': m.id, onclick: () => { st.envaseId = m.id; draw(); } },
          (CL.medidasTxt(m) || m.nombre) + ' · ' + fmt(m.stock || 0) + ' en stock', CL.stockEstado(m, c) === 'agotado' ? ' 🔴' : CL.stockEstado(m, c) === 'bajo' ? ' 🟠' : '')))
        : h('p.small.warn-t', 'No hay ' + CL.envaseTipo(st.tipo)[3].toLowerCase() + ' en Stock. Añádelas en Stock → Envases / Embalaje.')) : null,
      st.tipo === 'bolsa' ? h('label.check', { style: { marginTop: '6px' } }, h('input', { type: 'checkbox', checked: st.enMano, 'aria-label': 'Entrega en mano', onchange: e => { st.enMano = e.target.checked; } }), '🤝 Entrega en mano (también gasta una bolsa)') : null,
      h('div.row.wrap.envase-mats', { style: { gap: '14px', marginTop: '10px', alignItems: 'center' } },
        h('label.row', { style: { gap: '6px' } }, h('span.small', '🟤 Papel kraft (m)'), kraft),
        h('label.row', { style: { gap: '6px' } }, h('span.small', '🟫 Papel marrón (m)'), marron),
        h('label.check', cinta, '🧻 Utilizar cinta (≈ ' + fmt(c.cintaM) + ' m del rollo)')),
      tot);
    total();
  };
  const value = () => st.tipo ? { tipo: st.tipo, envaseId: st.envaseId, kraft: num(st.kraft), marron: num(st.marron), cinta: st.cinta, enMano: st.tipo === 'bolsa' && st.enMano } : null;
  // obligatorio si hay envases en Stock: caja/sobre/bolsa y su medida
  const error = () => {
    if (!hayEnvases()) return '';
    if (!st.tipo) return 'Elige cómo se prepara el pedido: caja, sobre o bolsa.';
    if (envasesDe(st.tipo).length && !st.envaseId) return 'Elige la medida de ' + CL.envaseTipo(st.tipo)[2].toLowerCase() + '.';
    if (num(st.kraft) < 0 || num(st.marron) < 0) return 'Los metros no pueden ser negativos.';
    return '';
  };
  const changed = () => JSON.stringify(value() || {}) !== JSON.stringify(s0.tipo ? { tipo: s0.tipo, envaseId: s0.envaseId || '', kraft: num(s0.kraft), marron: num(s0.marron), cinta: !!s0.cinta, enMano: !!s0.enMano } : {});
  draw();
  return { el, value, error, changed, redraw: draw };
}
// Datos para guardar en el pedido (+ «Entrega en mano» si es una bolsa en mano)
export function datosPedido(v, o) {
  const d = { embalaje: { simple: v } };
  if (v && v.enMano) { const r = (S.cfg.pedidos.envios || []).find(x => CL.esRecogida(x)) || 'Entrega en mano'; if (!o || o.envio !== r) d.envio = r; }
  return d;
}
// Cambiar el embalaje de un pedido ya creado
export function embalajeDialog(o, after) {
  const w = widget(o), msg = h('p.small.bad-t');
  modal('📦 Embalaje del pedido nº ' + o.numero, h('div.col', w.el, msg), close => [btn('Cancelar', close), btn('Guardar', async () => {
    const er = w.error(); if (er) return (msg.textContent = er);
    if (!w.changed()) return close();
    const d = datosPedido(w.value(), o);
    try {
      const r = await mutate('pedidos.guardar', { id: o.id, datos: d, orig: {} }, { onlineOnly: true, label: 'Embalaje nº ' + o.numero });
      if (r && r.id) upsertLocal('pedidos', r);
      emit(); toast('📦 Embalaje guardado: ' + resumen(w.value()), 'ok'); close(); after && after();
    } catch (e) { msg.textContent = e.message; }
  }, { cls: 'primary' })], { size: 'narrow' });
}
// Recuadro de la ficha del pedido
// v16: sin elegir nada, el pedido ya tiene su PLANTILLA (la que le va por medidas, «Entrega en mano» o la estándar)
function bloquePlantilla(o, redraw) {
  const edit = can('pedidos.editar'), e = o.embalaje || {}, cerrado = !!e.hecho, embs = S.t.embalajes || [];
  const pl = CL.packPlan(o, { materiales: S.t.materiales || [], embalajes: embs, recetas: S.t.recetas || [], productos: S.t.productos || [] }, (S.cfg && S.cfg.precios) || {});
  if (!pl || !pl.plantilla) return null;
  const por = cerrado ? 'Paquete cerrado el ' + String(e.hecho).split('-').reverse().join('/') : e.auto === 'medidas' && pl.origen === 'elegido' ? 'Elegida sola por las medidas de la pieza' : e.auto === 'entrega' && pl.origen === 'elegido' ? 'Elegida sola: se entrega en mano' : pl.origen === 'elegido' ? 'Elegida por ti' : pl.origen === 'producto' ? 'La del producto' : 'La estándar';
  const cambiar = async id => { try { const r = await mutate('pedidos.guardar', { id: o.id, datos: { embalaje: { plantillaId: id } } }, { onlineOnly: true, label: 'Embalaje' }); if (r && r.id) upsertLocal('pedidos', r); emit(); toast('Embalaje cambiado', 'ok'); redraw && redraw(); } catch (x) { toast(x.message, 'bad'); } };
  const sel = edit && !cerrado && embs.length > 1 ? h('select.inp.sm', { 'aria-label': 'Plantilla de embalaje', style: { maxWidth: '210px', minHeight: '34px' }, onchange: ev => cambiar(ev.target.value) }, embs.map(x => h('option', { value: x.id, selected: x.id === pl.plantilla.id }, (/^s/i.test(String(x.predeterminado || '')) ? '⭐ ' : '') + x.nombre))) : null;
  return h('div.card.flat.envase-ficha', { style: { marginTop: '10px' } },
    h('div.row.wrap', h('b.grow', '📦 EMBALAJE · ' + pl.plantilla.nombre), sel, edit && !cerrado ? btn('A mano', () => embalajeDialog(o, redraw), { cls: 'sm ghost', title: 'Elegir caja, sobre o bolsa y los metros de papel para este pedido' }) : null),
    h('div.tiny.muted', por + ' · se descuenta del stock al cerrar el paquete · no se suma al precio del cliente'),
    h('div.small', { style: { marginTop: '4px' } }, pl.lineas.map(l => l.nombre + (l.unidad && l.unidad !== 'ud' ? ' ' + fmt(l.cantidad) + ' ' + l.unidad : (l.cantidad > 1 ? ' × ' + l.cantidad : ''))).join(' · ') || 'Sin materiales: duplica la plantilla y pon lo que lleve.'),
    can('productos.costes') ? h('div.row', { style: { borderTop: '1px solid var(--line)', paddingTop: '4px', marginTop: '4px' } }, h('b.grow', 'Coste interno del embalaje' + (pl.estado === 'estimado' ? ' (estimado)' : '')), h('b', pl.coste === null ? 'al menos ' + eur(pl.conocido) : eur(pl.coste))) : null);
}
export function bloquePedido(o, redraw) {
  const s = o.embalaje && o.embalaje.simple, edit = can('pedidos.editar');
  if (!(s && s.tipo)) { const b = bloquePlantilla(o, redraw); if (b) return b; }
  const p = s && s.tipo ? costeDe(s) : null;
  const falta = !(s && s.tipo) && hayEnvases();
  return h('div.card.flat.envase-ficha' + (falta ? '.warn' : ''), { style: { marginTop: '10px' } },
    h('div.row.wrap', h('b.grow', '📦 EMBALAJE DEL PEDIDO'), edit ? btn(s && s.tipo ? 'Cambiar' : 'Elegir', () => embalajeDialog(o, redraw), { cls: 'sm' + (falta ? ' primary' : '') }) : null),
    s && s.tipo ? h('div.small', resumen(s), can('productos.costes') && p ? h('div.envase-coste', { style: { marginTop: '6px' } },
        h('div.list', p.lineas.map(l => h('div.item', { style: { cursor: 'default', padding: '4px 0' } }, h('span.grow', l.nombre + (l.unidad === 'm' ? ' · ' + fmt(l.cantidad) + ' m' : '')), h('span', l.coste === null ? 'sin precio' : eur(l.coste))))),
        h('div.row', { style: { borderTop: '1px solid var(--line)', paddingTop: '4px' } }, h('b.grow', 'Coste del embalaje'), h('b', p.coste === null ? 'al menos ' + eur(p.conocido) : eur(p.coste))),
        s.precios && s.precios.fecha ? h('div.tiny.muted', '🔒 Fijo en este pedido con los precios del ' + String(s.precios.fecha).split('-').reverse().join('/') + ' (no cambia aunque cambies los precios en Stock).') : null) : null)
      : h('p.small' + (falta ? '.warn-t' : '.muted'), falta ? '⚠️ Falta elegir caja, sobre o bolsa (se descuenta del stock al guardarlo).' : 'Sin elegir.'));
}

// ---------- Stock → «📦 ENVASES / EMBALAJE» ----------
async function mover(m, body, txt) {
  if (!can('stock.mover')) return toast('Para cambiar el stock hace falta el permiso «Mover stock».', 'warn');
  try {
    const nuevo = body.nuevo !== undefined ? body.nuevo : Math.round((num(m.stock) + body.cambio) * 1000) / 1000;
    const r = await mutate('materiales.stock', Object.assign({ id: m.id }, body), { label: txt || m.nombre, tables: ['materiales'], optimistic: t => { const x = t.materiales.find(y => y.id === m.id); if (x) x.stock = nuevo; } });
    if (r && r.material) upsertLocal('materiales', r.material);
    emit();
  } catch (e) { toast(e.message, 'bad'); }
}
function aplicar(r) { if (r && r.materiales) r.materiales.forEach(m => upsertLocal('materiales', m)); if (r && r.config) S.cfg = r.config; emit(); }
function cantidadDialog(m, titulo, sugerencias) {
  const metros = CL.unitKey(m.unidad) === 'm';
  const q = inp({ type: 'number', min: 0, step: metros ? 0.1 : 1, value: sugerencias[0], 'aria-label': 'Cantidad a añadir', style: { width: '120px' } });
  modal(titulo, h('div.col', h('p.small', m.nombre + ' · ahora hay ' + fmt(m.stock || 0) + unidadTxt(m)), h('div.row.wrap', { style: { gap: '6px' } }, q, h('span', metros ? 'metros' : 'unidades'),
    sugerencias.slice(1).map(v => btn('+' + fmt(v), () => { q.value = v; }, { cls: 'sm ghost' })))),
  close => [btn('Cancelar', close), btn('Añadir', async () => { const v = num(q.value); if (!(v > 0)) return toast('Escribe cuánto añades', 'warn'); close(); await mover(m, { cambio: v, motivo: 'Compra / reposición' }, '+' + fmt(v) + ' ' + m.nombre); toast('➕ ' + fmt(v) + (metros ? ' m' : ' ud') + ' de ' + m.nombre, 'ok'); }, { cls: 'primary' })], { size: 'narrow' });
}
function envaseForm(tipo, m) {
  const t = CL.envaseTipo(tipo || m.tipo);
  const f = { largo: inp({ type: 'number', min: 0, step: 0.1, value: m ? m.largo : '', placeholder: 'largo' }), ancho: inp({ type: 'number', min: 0, step: 0.1, value: m ? m.ancho : '', placeholder: 'ancho' }),
    alto: inp({ type: 'number', min: 0, step: 0.1, value: m ? m.alto : '', placeholder: t[0] === 'caja' ? 'alto' : 'fuelle (opcional)' }),
    stock: inp({ type: 'number', min: 0, step: 1, value: m ? '' : '', placeholder: '0' }), stockMin: inp({ type: 'number', min: 0, step: 1, value: m ? (m.stockMin ?? '') : '', placeholder: String(sc().avisoUnidades) }) };
  const msg = h('p.small.bad-t');
  modal((m ? 'Editar ' : 'Nueva medida · ') + t[1] + ' ' + (m ? m.nombre : t[2]), h('div.col',
    h('div.row.wrap', { style: { gap: '6px', alignItems: 'center' } }, h('span.small', 'Medida (cm):'), f.largo, h('span', '×'), f.ancho, h('span', '×'), f.alto),
    m ? null : field('Unidades que tienes ahora', f.stock),
    field('Avisar de stock bajo cuando queden', f.stockMin, 'Vacío = ' + sc().avisoUnidades + ' (el aviso general)'),
    h('p.tiny.muted', 'Precio: ' + eur(sc().precioEnvase) + ' por unidad (igual para cajas, sobres y bolsas).'), msg),
  close => [m ? btn('Quitar esta medida', async () => { if (!await confirmDlg('Quitar ' + m.nombre, 'Deja de salir en Stock y en los pedidos. Los pedidos antiguos no cambian.', 'Quitar', true)) return; try { aplicar(await api('envases.guardar', { id: m.id, datos: { activo: false } })); close(); } catch (e) { msg.textContent = e.message; } }, { cls: 'ghost danger' }) : null,
    h('span.grow'), btn('Cancelar', close), btn('Guardar', async () => {
      const d = { largo: f.largo.value, ancho: f.ancho.value, alto: f.alto.value, stockMin: f.stockMin.value };
      if (!m) { d.tipo = t[0]; d.stock = f.stock.value; }
      try { aplicar(await api('envases.guardar', m ? { id: m.id, datos: d } : { datos: d })); toast('Guardado', 'ok'); close(); } catch (e) { msg.textContent = e.message; }
    }, { cls: 'primary' })], { size: 'narrow' });
}
function papelForm(m, k) {
  const pr = inp({ type: 'number', min: 0, step: 0.01, value: m.precio, 'aria-label': 'Precio del rollo (€)' }), mt = inp({ type: 'number', min: 0, step: 0.1, value: m.cantidad, 'aria-label': 'Metros por rollo' });
  const mn = inp({ type: 'number', min: 0, step: 0.1, value: m.stockMin ?? '', placeholder: String(sc().avisoMetros) }), msg = h('p.small.bad-t');
  modal('Editar ' + m.nombre, h('div.col', field('Precio del rollo (€)', pr), field('Metros que trae cada rollo', mt), field('Avisar de stock bajo cuando queden (m)', mn, 'Vacío = ' + fmt(sc().avisoMetros) + ' m'), msg),
    close => [btn('Cancelar', close), btn('Guardar', async () => { try { aplicar(await api('envases.guardar', { id: m.id, datos: { precioRollo: pr.value, metrosRollo: mt.value, stockMin: mn.value } })); close(); } catch (e) { msg.textContent = e.message; } }, { cls: 'primary' })], { size: 'narrow' });
}
function tarjeta(m, opts = {}) {
  const metros = CL.unitKey(m.unidad) === 'm', editable = can('stock.mover'), paso = metros ? 0.5 : 1;
  const v = inp({ type: 'number', min: 0, step: metros ? 0.1 : 1, value: fmt(m.stock || 0).replace(',', '.'), 'aria-label': 'Stock de ' + m.nombre, disabled: !editable, style: { width: '84px', textAlign: 'center' } });
  v.onchange = () => { const nv = num(v.value); if (nv < 0) return; mover(m, { nuevo: nv, motivo: 'Recuento' }, 'Recuento ' + m.nombre); };
  const pm = CL.porMetro(m);
  return h('div.env-card.' + (CL.stockEstado(m, sc())), { 'data-id': m.id },
    h('div.env-t', h('b', opts.icono + ' ' + m.nombre)),
    h('div.env-s', 'Stock: ', h('b', fmt(m.stock || 0) + unidadTxt(m))),
    h('div.env-p.small.muted', metros ? 'Coste: ' + (pm === null ? 'sin precio' : eur(pm) + '/metro') + ' · rollo ' + eur(m.precio) + ' = ' + fmt(m.cantidad) + ' m' : 'Coste: ' + eur(sc().precioEnvase) + '/unidad'),
    h('div', estadoPill(m)),
    h('div.row.env-step', btn('−', () => mover(m, { cambio: -paso, motivo: 'Salida manual' }), { cls: 'sm', disabled: !editable || num(m.stock) <= 0, title: 'Quitar ' + fmt(paso) }), v, btn('+', () => mover(m, { cambio: paso, motivo: 'Entrada manual' }), { cls: 'sm', disabled: !editable, title: 'Sumar ' + fmt(paso) })),
    editable ? h('div.row.wrap', { style: { gap: '6px' } },
      btn(metros ? 'Añadir rollo' : 'Añadir stock', () => metros ? cantidadDialog(m, 'Añadir ' + m.nombre, [num(m.cantidad) || 2, 1, 5, 10]) : cantidadDialog(m, 'Añadir ' + m.nombre, [10, 1, 5, 25, 50]), { cls: 'sm primary' }),
      btn('Editar', () => metros ? papelForm(m) : envaseForm(null, m), { cls: 'sm ghost' })) : null);
}
export function renderStock(el) {
  const box = h('div.envases');
  el.append(box);
  let preparando = false;
  const draw = () => {
    const c = sc(), kraft = papel('kraftId'), marron = papel('marronId'), edit = can('stock.mover');
    if (!can('productos.costes') && !(S.t.materiales || []).length) return mount(box, h('div.card', h('p', '🔒 Para ver el stock de embalaje hace falta el permiso «Ver costes».')));
    if ((!kraft || !marron) && edit && !preparando) { preparando = true; api('envases.preparar', {}, { quiet: true }).then(r => { aplicar(r); api('config.obtener', {}, { quiet: true }).then(cf => { S.cfg = cf; emit(); }).catch(() => { }); }).catch(() => { }); }
    const all = TIPOS.flatMap(t => envasesDe(t[0])).concat([kraft, marron].filter(Boolean));
    const bajos = all.filter(m => ['bajo', 'agotado'].includes(CL.stockEstado(m, c)));
    // v16: la cinta ya NO es un coste fijo por pedido: se cuentan los metros (estimados) y salen del rollo
    const cinta = inp({ type: 'number', min: 0, step: 0.1, value: c.cintaM, 'aria-label': 'Metros de cinta por pedido', disabled: !edit, style: { width: '100px' } });
    cinta.onchange = async () => { try { aplicar(await api('envases.config', { cintaM: cinta.value })); toast('🧻 Cinta: ' + fmt(num(cinta.value)) + ' m por pedido', 'ok'); } catch (e) { toast(e.message, 'bad'); } };
    const avU = inp({ type: 'number', min: 0, step: 1, value: c.avisoUnidades, 'aria-label': 'Aviso de unidades', disabled: !edit, style: { width: '70px' } });
    const avM = inp({ type: 'number', min: 0, step: 0.5, value: c.avisoMetros, 'aria-label': 'Aviso de metros', disabled: !edit, style: { width: '70px' } });
    [avU, avM].forEach(i => { i.onchange = async () => { try { aplicar(await api('envases.config', { avisoUnidades: avU.value, avisoMetros: avM.value })); } catch (e) { toast(e.message, 'bad'); } }; });
    mount(box,
      h('div.card.flat.env-intro', h('h2', { style: { margin: '0 0 4px' } }, '📦 ENVASES / EMBALAJE'), h('p.small.muted', { style: { margin: 0 } }, 'Aquí ves todo lo que tienes para preparar pedidos. Caja, sobre y bolsa cuestan ' + eur(c.precioEnvase) + ' cada una.'),
        bajos.length ? h('p.small.warn-t', { style: { margin: '6px 0 0' } }, '⚠️ Revisa: ' + bajos.map(m => m.nombre + ' (' + fmt(m.stock || 0) + unidadTxt(m).trim().replace('unidades', 'ud').replace('unidad', 'ud') + ')').join(' · ')) : null),
      TIPOS.map(([k, ic, , pl]) => h('section.env-sec', { 'data-tipo': k },
        h('div.row', h('h3.grow', ic + ' ' + pl.toUpperCase()), edit ? btn('+ Añadir medida', () => envaseForm(k), { cls: 'sm' }) : null),
        envasesDe(k).length ? h('div.env-grid', envasesDe(k).map(m => tarjeta(m, { icono: ic }))) : h('p.small.muted', 'Aún no hay ' + pl.toLowerCase() + '. ' + (edit ? 'Pulsa «+ Añadir medida».' : '')))),
      h('section.env-sec', h('h3', '🟤 PAPEL KRAFT'), kraft ? h('div.env-grid', tarjeta(kraft, { icono: '🟤' })) : h('p.small.muted', 'Preparando…')),
      h('section.env-sec', h('h3', '🟫 PAPEL MARRÓN'), marron ? h('div.env-grid', tarjeta(marron, { icono: '🟫' })) : h('p.small.muted', 'Preparando…')),
      h('section.env-sec', h('h3', '🧻 CINTA'), h('div.env-card.ok.env-cinta', h('b', '🧻 Cinta adhesiva'), h('div.small', 'Sale del rollo «Cinta de embalar»: cada pedido que use cinta descuenta estos metros (es una estimación: cámbiala cuando lo midas). No hay coste fijo por pedido.'),
        h('div.row', { style: { gap: '6px', alignItems: 'center' } }, h('span.small', 'Metros por pedido (estimado)'), cinta))),
      h('section.env-sec', h('h3', '🔔 AVISOS'), h('div.row.wrap.small', { style: { gap: '10px', alignItems: 'center' } }, '🟠 Stock bajo cuando queden', avU, 'unidades o', avM, 'metros (cada tarjeta puede tener su propio aviso en «Editar»). 🔴 Agotado = 0.')),
      h('details.more.env-ayuda', h('summary', '¿Qué se descuenta solo y qué hago yo?'), h('div.in.small',
        h('p', h('b', 'Lo descuenta el programa al guardar un pedido: '), '1 caja, sobre o bolsa de la medida elegida y los metros de papel kraft y marrón que pongas. La cinta descuenta sus metros del rollo. Si cambias el pedido se ajusta; si lo cancelas o lo borras, vuelve al stock.'),
        h('p', h('b', 'Lo haces tú cuando compras: '), '«Añadir stock» / «Añadir rollo», o escribir la cantidad que hay. El programa nunca compra nada.'))));
  };
  draw();
  return { update: draw };
}
