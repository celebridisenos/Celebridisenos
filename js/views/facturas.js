// ================= 🧾 Facturas y paquete trimestral para el gestor =================
// Numeración correlativa automática (F = completa con NIF, FS = simplificada, R = rectificativa).
// Las facturas no se borran: si hay un error se rectifican.
import { h, mount, btn, modal, toast, eur, fdate, pill, empty, field, inp, sel, area } from '../ui.js';
import { S, can, api, upsertLocal, emit, byId } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { invoiceDoc, printDoc, preview, fiscalReady } from '../print.js';
import { xlsxBlob } from '../xlsx.js';

const CL = window.CL;
const n = v => Number(v) || 0;
const quarterOf = ds => Math.floor((Number(String(ds).slice(5, 7)) - 1) / 3) + 1;
const Q = { 1: ['01-01', '03-31'], 2: ['04-01', '06-30'], 3: ['07-01', '09-30'], 4: ['10-01', '12-31'] };
const IVAS = [{ v: 0.21, t: '21 % (general)' }, { v: 0.10, t: '10 %' }, { v: 0.04, t: '4 %' }, { v: 0, t: '0 % (exento)' }];

function fiscalBanner() {
  return h('div.banner-soft', { style: { marginBottom: '14px' } }, h('b', '⚠️ Faltan tus datos fiscales. '), 'Para emitir facturas rellena nombre o razón social y NIF en ',
    can('config.editar') ? h('a', { href: '#/config/facturacion' }, 'Configuración → Facturación') : 'Configuración → Facturación (pídeselo a una administradora)', '.');
}

export function render(el, params) {
  if (!can('facturas.emitir')) { mount(el, h('div.card', h('h3', '🔒 Facturas'), h('p.muted', 'Necesitas el permiso "Emitir facturas y exportar el trimestre".'))); return {}; }
  const y0 = Number(S.hoy.slice(0, 4));
  const st = { y: y0, q: quarterOf(S.hoy) };
  const head = h('div'), kpis = h('div.grid.g4.kpis', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', margin: '12px 0 14px' } }), list = h('div');
  const ySel = sel([y0, y0 - 1, y0 - 2].map(x => ({ v: x, t: String(x) })), st.y), qSel = sel([1, 2, 3, 4].map(x => ({ v: x, t: x + 'º trimestre' })), st.q);
  [ySel, qSel].forEach(x => x.addEventListener('change', () => { st.y = Number(ySel.value); st.q = Number(qSel.value); draw(); }));
  el.append(h('div.page-head', h('div', h('h1', '🧾 Facturas'), h('div.muted.small', 'Numeración automática y correlativa. Cada trimestre, un Excel listo para el gestor.')),
    h('div.row.wrap', btn('Nueva factura', () => invoiceForm(), { cls: 'primary', icon: 'plus' }), btn('Excel del trimestre', () => exportQuarter(st.y, st.q), { icon: 'download' }))),
    head, h('div.row.wrap', ySel, qSel), kpis, list,
    h('p.tiny.muted', { style: { marginTop: '14px' } }, 'ℹ️ A partir del 1 de julio de 2027 (1 de enero de 2027 para sociedades) Hacienda exige facturar con un programa certificado VERI*FACTU. Este módulo no lo está: hasta entonces vale, y antes de esa fecha tu gestor te dirá qué programa usar.'));
  function draw() {
    mount(head, fiscalReady() ? null : fiscalBanner());
    const [a, b] = Q[st.q], from = st.y + '-' + a, to = st.y + '-' + b;
    const rows = (S.t.facturas || []).filter(f => f.fecha >= from && f.fecha <= to).sort((x, y) => String(y.fecha).localeCompare(String(x.fecha)) || String(y.numero).localeCompare(String(x.numero)));
    const val = rows.filter(f => f.estado !== 'Anulada');
    const base = val.reduce((s, f) => s + n(f.base), 0), cuota = val.reduce((s, f) => s + n(f.cuota), 0), total = val.reduce((s, f) => s + n(f.total), 0);
    mount(kpis, h('div.kpi', h('span.n', String(rows.length)), h('span.l', 'Facturas')), h('div.kpi', h('span.n', eur(base)), h('span.l', 'Base imponible')), h('div.kpi', h('span.n', eur(cuota)), h('span.l', 'IVA repercutido')), h('div.kpi', h('span.n', eur(total)), h('span.l', 'Total facturado')));
    const pend = S.t.pedidos.filter(o => !o.factura && CL.stateOf(S.cfg.pedidos, o.estado).shipped && o.fecha >= from && o.fecha <= to).length;
    mount(list,
      pend ? h('p.small', { style: { margin: '0 0 10px' } }, '💡 Hay ' + pend + ' pedido(s) enviados de este trimestre sin factura. Se factura desde la ficha del pedido (botón "Factura").') : null,
      rows.length ? h('div.card', h('div.table-wrap', h('table.t', h('thead', h('tr', ['Nº', 'Fecha', 'Cliente', 'Tipo', 'Base', 'IVA', 'Total', ''].map(x => h('th', x)))),
        h('tbody', rows.map(f => h('tr', { onclick: () => invoiceView(f.id) }, h('td.bold.nowrap', f.numero), h('td.nowrap', fdate(f.fecha)), h('td', h('div.ellipsis', { style: { maxWidth: '220px' } }, f.cliente)), h('td.small', f.tipo),
          h('td.nowrap', eur(f.base)), h('td.nowrap', eur(f.cuota)), h('td.nowrap.bold', eur(f.total)), h('td', f.estado === 'Rectificada' ? pill('Rectificada', 'warn') : f.tipo === 'Rectificativa' ? pill('Rectificativa', 'info') : pill('Emitida', 'ok')))))))) :
        h('div.card', empty('file', 'No hay facturas en este trimestre', 'Se crean desde la ficha de cada pedido (botón "Factura") o con "Nueva factura".')));
  }
  draw();
  // v11: QR universal → #/facturas/<id> abre la factura
  const pid = (params || []).find(x => x && !x.startsWith('?')); if (pid) setTimeout(() => invoiceView(pid), 50);
  return { update: draw };
}

export function invoiceView(id) {
  const f = byId('facturas', id);
  if (!f) return toast('Esa factura no existe', 'warn');
  modal('Factura ' + f.numero, h('div.col', h('div.row.wrap', pill(f.estado, f.estado === 'Emitida' ? 'ok' : 'warn'), f.pedidoId ? h('a.small', { href: '#/pedidos/' + f.pedidoId }, 'ver pedido') : null, f.rectificadaPor ? h('span.small.muted', 'Rectificada por ' + f.rectificadaPor + (f.motivo ? ' · ' + f.motivo : '')) : null), preview(invoiceDoc(f))),
    close => h('div.row.wrap', { style: { width: '100%' } },
      f.estado === 'Emitida' && f.tipo !== 'Rectificativa' ? btn('Rectificar', () => rectify(f, close), { cls: 'ghost danger' }) : null, h('span.grow'),
      btn('PDF / imprimir', () => printDoc(invoiceDoc(f)), { cls: 'primary', icon: 'printer' })), { size: 'wide' });
}
function rectify(f, close) {
  const m = area({ placeholder: 'Ej.: devolución del producto, error en el precio…' });
  modal('Rectificar ' + f.numero, h('div.col', h('p.small', 'Se emite una factura rectificativa por el importe total en negativo (' + eur(-n(f.total)) + '). La original queda como "Rectificada". Después podrás emitir una nueva correcta.'), field('Motivo *', m)),
    c2 => [btn('Cancelar', c2), btn('Emitir rectificativa', async () => {
      if (!m.value.trim()) return toast('Escribe el motivo', 'warn');
      try { const r = await api('facturas.rectificar', { id: f.id, motivo: m.value.trim() }); upsertLocal('facturas', r.original); upsertLocal('facturas', r.rectificativa); if (r.pedido) upsertLocal('pedidos', r.pedido); emit(); c2(); close(); toast('Rectificativa ' + r.rectificativa.numero + ' emitida', 'ok'); invoiceView(r.rectificativa.id); }
      catch (e) { handleError(e); }
    }, { cls: 'danger solid' })], { size: 'narrow' });
}

// Nueva factura: desde un pedido (con sus datos) o a mano
export function invoiceForm(o) {
  if (!can('facturas.emitir')) return requestAccess('facturas.emitir', 'facturas');
  if (o && o.factura) { const ex = (S.t.facturas || []).find(f => f.numero === o.factura); if (ex) return invoiceView(ex.id); }
  const c = o ? byId('clientes', o.clienteId) : null;
  const ex = (c && c.extra) || {};
  const fc = S.cfg.facturacion || {};
  const f = {
    cliente: inp({ value: o ? o.cliente : '', list: 'dl-fcli', placeholder: 'Nombre y apellidos o empresa', autocomplete: 'off' }),
    nif: inp({ value: ex.nif || '', placeholder: 'Vacío = factura simplificada' }),
    direccion: area({ value: ex.direccionFiscal || (c && c.direccion && c.direccion !== '•••' ? c.direccion : ''), placeholder: 'Obligatoria si hay NIF', style: { minHeight: '52px' } }),
    email: inp({ value: c && c.email && c.email !== '•••' ? c.email : '', placeholder: 'Opcional' }),
    fecha: inp({ type: 'date', value: S.hoy, max: S.hoy }),
    iva: sel(IVAS, n(fc.tipoIva ?? 0.21)),
    notas: inp({ placeholder: 'Opcional (p. ej. forma de pago)' })
  };
  f.cliente.addEventListener('change', () => { const cc = S.t.clientes.find(x => CL.norm(x.nombre) === CL.norm(f.cliente.value)); if (cc && cc.extra) { if (!f.nif.value && cc.extra.nif) f.nif.value = cc.extra.nif; if (!f.direccion.value && (cc.extra.direccionFiscal || cc.direccion)) f.direccion.value = cc.extra.direccionFiscal || cc.direccion; } upd(); });
  const lines = o ? [{ descripcion: o.producto + (o.personalizacion ? ' (' + o.personalizacion + ')' : ''), cantidad: n(o.cantidad) || 1, precio: n(o.precio) }] : [{ descripcion: '', cantidad: 1, precio: '' }];
  const box = h('div.lines'), tot = h('div.totals'), tipo = h('div.small');
  const upd = () => {
    const am = CL.invoiceAmounts(lines.map(l => ({ descripcion: l.descripcion, cantidad: n(l.cantidad), precio: n(l.precio) })), n(f.iva.value));
    mount(tot, h('div', h('span', 'Base imponible'), h('span', eur(am.base))), h('div', h('span', 'IVA ' + Math.round(n(f.iva.value) * 100) + ' %'), h('span', eur(am.cuota))), h('div.big', h('span', 'Total'), h('span', eur(am.total))));
    tipo.textContent = f.nif.value.trim() ? '🧾 Factura completa (serie F): con NIF y dirección del cliente.' : '🧾 Factura simplificada (serie FS): sin NIF, válida para particulares' + (am.total > 400 ? '. Si el cliente es empresa o autónomo, pídele el NIF.' : '.');
  };
  const drawLines = () => {
    mount(box, h('div.line-row.hdr', h('span', 'Concepto'), h('span', 'Cant.'), h('span', 'Precio (IVA inc.)'), h('span.lr-imp', 'Importe'), h('span'), h('span')),
      lines.map((l, i) => {
        const d = inp({ value: l.descripcion, placeholder: 'Concepto' }), q = inp({ type: 'number', min: 0, step: 1, value: l.cantidad }), p = inp({ type: 'number', min: 0, step: 0.01, value: l.precio });
        const imp = h('span.lr-imp.small', eur(n(l.cantidad) * n(l.precio)));
        d.addEventListener('input', () => { l.descripcion = d.value; });
        [q, p].forEach(x => x.addEventListener('input', () => { l.cantidad = q.value; l.precio = p.value; imp.textContent = eur(n(l.cantidad) * n(l.precio)); upd(); }));
        return h('div.line-row', d, q, p, imp, h('span'), btn('', () => { lines.splice(i, 1); if (!lines.length) lines.push({ descripcion: '', cantidad: 1, precio: '' }); drawLines(); }, { cls: 'ghost icon sm', icon: 'x', title: 'Quitar' }));
      }), h('div', btn('Añadir concepto (p. ej. envío cobrado)', () => { lines.push({ descripcion: '', cantidad: 1, precio: '' }); drawLines(); }, { cls: 'ghost sm', icon: 'plus' })));
    upd();
  };
  [f.nif, f.iva].forEach(x => x.addEventListener('input', upd)); f.iva.addEventListener('change', upd);
  drawLines();
  const msg = h('p.bad-t');
  modal(o ? 'Factura del pedido nº ' + o.numero : 'Nueva factura', h('div.col', fiscalReady() ? null : fiscalBanner(), h('datalist', { id: 'dl-fcli' }, S.t.clientes.map(x => h('option', { value: x.nombre }))),
    h('div.form', field('Cliente *', f.cliente), field('NIF / CIF', f.nif), field('Dirección fiscal', f.direccion, null, 'full'), field('Email', f.email), field('Fecha', f.fecha, 'No puede ser anterior a la última factura.')), tipo,
    h('h4', { style: { margin: '6px 0 0' } }, 'Conceptos'), box, h('div.row.wrap.top', h('div.form.grow', field('Tipo de IVA', f.iva), field('Notas', f.notas)), tot), msg),
    close => [btn('Cancelar', close), btn('Emitir factura', async ev => {
      msg.textContent = '';
      const ls = lines.filter(l => String(l.descripcion || '').trim() || n(l.precio)).map(l => ({ descripcion: String(l.descripcion || '').trim(), cantidad: n(l.cantidad), precio: n(l.precio) }));
      if (!f.cliente.value.trim()) return msg.textContent = 'Indica el cliente.';
      if (!ls.length || ls.some(l => !l.descripcion)) return msg.textContent = 'Cada concepto necesita una descripción.';
      if (f.nif.value.trim() && !f.direccion.value.trim()) return msg.textContent = 'Con NIF hace falta la dirección fiscal del cliente.';
      const b = ev.target.closest('button'); b.disabled = true;
      try {
        const r = await api('facturas.emitir', { pedidoId: o ? o.id : '', datos: { cliente: f.cliente.value.trim(), clienteId: c ? c.id : '', nif: f.nif.value.trim(), direccion: f.direccion.value.trim(), email: f.email.value.trim(), fecha: f.fecha.value, tipoIva: n(f.iva.value), lineas: ls, notas: f.notas.value.trim() } });
        upsertLocal('facturas', r.factura); if (r.pedido) upsertLocal('pedidos', r.pedido); emit(); close();
        toast('Factura ' + r.factura.numero + ' emitida', 'ok');
        invoiceView(r.factura.id);
      } catch (e) { msg.textContent = e.message; b.disabled = false; }
    }, { cls: 'primary', icon: 'check' })], { size: 'wide' });
}

// ---------- Excel del trimestre para el gestor ----------
export function exportQuarter(y, q) {
  const [a, b] = Q[q], from = y + '-' + a, to = y + '-' + b;
  const fs = (S.t.facturas || []).filter(f => f.fecha >= from && f.fecha <= to).sort((x, z) => String(x.fecha).localeCompare(String(z.fecha)) || String(x.numero).localeCompare(String(z.numero)));
  const r2 = x => Math.round(n(x) * 100) / 100;
  const facturas = [['Nº factura', 'Fecha', 'Tipo', 'Cliente', 'NIF', 'Base imponible (€)', 'Tipo IVA', 'Cuota IVA (€)', 'Total (€)', 'Estado', 'Rectifica a', 'Pedido']]
    .concat(fs.map(f => [f.numero, f.fecha, f.tipo, f.cliente, f.nif || '', r2(f.base), Math.round(n(f.tipoIva) * 100) + ' %', r2(f.cuota), r2(f.total), f.estado, f.rectificaA || '', f.pedidoId ? ((byId('pedidos', f.pedidoId) || {}).numero || '') : '']));
  const byIva = {};
  fs.forEach(f => { const k = Math.round(n(f.tipoIva) * 100) + ' %'; const x = byIva[k] || (byIva[k] = { base: 0, cuota: 0, total: 0, n: 0 }); x.base += n(f.base); x.cuota += n(f.cuota); x.total += n(f.total); x.n++; });
  const resumen = [['Concepto', 'Valor'], ['Periodo', q + 'º trimestre ' + y + ' (' + from + ' a ' + to + ')'], ['Nº de facturas', fs.length]]
    .concat(Object.keys(byIva).flatMap(k => [['IVA ' + k + ' · base imponible (€)', r2(byIva[k].base)], ['IVA ' + k + ' · cuota (€)', r2(byIva[k].cuota)], ['IVA ' + k + ' · total (€)', r2(byIva[k].total)]]))
    .concat([['Total base imponible (€)', r2(fs.reduce((s, f) => s + n(f.base), 0))], ['Total IVA repercutido (€)', r2(fs.reduce((s, f) => s + n(f.cuota), 0))], ['Total facturado (€)', r2(fs.reduce((s, f) => s + n(f.total), 0))],
      ['Nota', 'Resumen orientativo para el gestor (modelos 303 y 130). Revísalo con él antes de presentar nada.']]);
  const cp = S.cfg.pedidos, costOf = CL.costIndex(S.t, S.cfg.precios);
  const peds = S.t.pedidos.filter(o => o.fecha >= from && o.fecha <= to && !CL.stateOf(cp, o.estado).cancelled).sort((x, z) => String(x.fecha).localeCompare(String(z.fecha)));
  const costes = can('productos.costes');
  const ventas = [['Nº pedido', 'Fecha', 'Cliente', 'Producto', 'Cantidad', 'Total cobrado (€)', 'Canal', 'Estado', 'Factura'].concat(costes ? ['Coste fabricación (€)', 'Envío pagado (€)', 'Comisión (€)', 'Otros gastos (€)', 'Beneficio real (€)', 'Margen', 'Nota'] : [])]
    .concat(peds.map(o => { const p = CL.orderProfit(o, S.t, S.cfg, costOf); const base = [o.numero, o.fecha, o.cliente, o.producto, n(o.cantidad) || 1, r2(p.total), o.canal || '', o.estado, o.factura || ''];
      return costes ? base.concat([p.produccion === null ? '' : p.produccion, p.envio, p.comision, p.otros, p.beneficio === null ? '' : p.beneficio, p.margen === null ? '' : Math.round(p.margen * 100) + ' %', [!p.conCoste ? 'sin coste del producto' : '', p.envioEstimado ? 'envío estimado' : '', p.comisionEstimada ? 'comisión estimada' : ''].filter(Boolean).join(', ')]) : base; }));
  const sheets = [{ nombre: 'Facturas', filas: facturas }, { nombre: 'Resumen IVA', filas: resumen }, { nombre: 'Ventas y beneficio', filas: ventas }];
  if (costes) {
    const gastos = [['Nº pedido', 'Fecha', 'Concepto', 'Importe (€)']];
    peds.forEach(o => { if (o.costeEnvio !== '' && o.costeEnvio != null) gastos.push([o.numero, o.fecha, 'Envío pagado (' + (o.envio || 'transportista') + ')', r2(o.costeEnvio)]); if (o.comision !== '' && o.comision != null) gastos.push([o.numero, o.fecha, 'Comisión ' + (o.canal || 'plataforma'), r2(o.comision)]); (Array.isArray(o.gastosPedido) ? o.gastosPedido : []).forEach(g => gastos.push([o.numero, o.fecha, g.concepto, r2(g.coste)])); });
    sheets.push({ nombre: 'Gastos de pedidos', filas: gastos });
  }
  const a2 = h('a', { href: URL.createObjectURL(xlsxBlob(sheets)), download: 'trimestre_' + y + '_T' + q + '_' + String(S.cfg.empresa.nombre || 'empresa').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_') + '.xlsx' });
  document.body.appendChild(a2); a2.click(); setTimeout(() => { URL.revokeObjectURL(a2.href); a2.remove(); }, 2000);
  toast('Excel del ' + q + 'º trimestre descargado', 'ok');
}
