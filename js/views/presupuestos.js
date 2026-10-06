// ================= 📄 Presupuestos para encargos =================
// Precio calculado con los costes reales (filamento, luz, mano de obra, margen), PDF con el logo
// y, si el cliente acepta, un clic lo convierte en pedido(s).
import { h, mount, btn, modal, toast, eur, fdate, pill, empty, field, inp, sel, area, confirmDlg, copyText } from '../ui.js';
import { S, can, api, upsertLocal, removeLocal, emit, byId, pull } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { budgetDoc, printDoc, preview, emisor } from '../print.js';

const CL = window.CL;
const n = v => Number(v) || 0;
const ST = { Borrador: '', Enviado: 'info', Aceptado: 'ok', Rechazado: 'bad' };
const expired = p => p.estado === 'Enviado' && p.validoHasta && p.validoHasta < S.hoy;
const stPill = p => expired(p) ? pill('Caducado', 'warn') : pill(p.estado, ST[p.estado] || '');

export function render(el, params) {
  if (!can('presupuestos.gestionar')) { mount(el, h('div.card', h('h3', '🔒 Presupuestos'), h('p.muted', 'Necesitas el permiso "Crear, enviar y convertir presupuestos".'))); return {}; }
  const st = { f: 'abiertos', q: '' };
  const kpis = h('div.grid.g4.kpis', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', marginBottom: '14px' } });
  const q = inp({ type: 'search', placeholder: 'Buscar cliente, número o pieza…' });
  q.addEventListener('input', () => { st.q = q.value; drawList(); });
  const list = h('div');
  el.append(h('div.page-head', h('div', h('h1', '📄 Presupuestos'), h('div.muted.small', 'Para encargos personalizados: precio con vuestros costes reales, PDF con el logo y, si aceptan, se convierte en pedido.')),
    btn('Nuevo presupuesto', () => budgetForm(), { cls: 'primary', icon: 'plus' })), kpis, h('div.row', { style: { marginBottom: '10px' } }, q), list);
  const F = [['abiertos', 'Pendientes', p => ['Borrador', 'Enviado'].includes(p.estado)], ['aceptados', 'Aceptados', p => p.estado === 'Aceptado'], ['rechazados', 'Rechazados', p => p.estado === 'Rechazado'], ['todos', 'Todos', () => true]];
  function drawKpis() {
    const all = S.t.presupuestos || [], ms = S.hoy.slice(0, 7);
    const sent = all.filter(p => p.estado !== 'Borrador'), acc = sent.filter(p => p.estado === 'Aceptado');
    mount(kpis, F.map(x => h('button.kpi' + (st.f === x[0] ? '.on' : ''), { onclick: () => { st.f = x[0]; drawKpis(); drawList(); } }, h('span.n', String(all.filter(x[2]).length)), h('span.l', x[1]))),
      h('div.kpi', h('span.n', sent.length ? Math.round(acc.length / sent.length * 100) + ' %' : '—'), h('span.l', 'Aceptación')),
      h('div.kpi', h('span.n', eur(acc.filter(p => String(p.actualizado || p.fecha).slice(0, 7) === ms).reduce((a, p) => a + n(p.total), 0))), h('span.l', 'Aceptado este mes')));
  }
  function drawList() {
    const f = F.find(x => x[0] === st.f)[2];
    const rows = (S.t.presupuestos || []).filter(f).filter(p => !st.q || CL.matches([p.numero, p.cliente, p.contacto, (p.lineas || []).map(l => l.descripcion).join(' ')].join(' '), st.q))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.numero).localeCompare(String(a.numero)));
    if (!(S.t.presupuestos || []).length) { mount(list, h('div.card', empty('file', 'Todavía no hay presupuestos', 'Crea el primero: calcula el precio con los gramos y horas de la pieza.', btn('Nuevo presupuesto', () => budgetForm(), { cls: 'primary', icon: 'plus' })))); return; }
    if (!rows.length) { mount(list, h('div.card', h('p.muted', 'No hay presupuestos con este filtro.'))); return; }
    mount(list, h('div.card', h('div.list', rows.map(p => h('div.item', { onclick: () => budgetView(p.id) },
      h('div.grow', h('div.row', h('b', p.numero), h('span.grow.ellipsis', p.cliente)), h('div.tiny.muted.ellipsis', (p.lineas || []).map(l => (n(l.cantidad) > 1 ? l.cantidad + '× ' : '') + l.descripcion).join(' · ')),
        h('div.tiny.muted', fdate(p.fecha) + (p.validoHasta ? ' · válido hasta ' + fdate(p.validoHasta) : ''))),
      h('div.col', { style: { alignItems: 'flex-end', gap: '4px' } }, h('b', eur(p.total)), stPill(p)))))));
  }
  const draw = () => { drawKpis(); drawList(); };
  draw();
  if (params && params[0] && params[0] !== 'nuevo') setTimeout(() => budgetView(params[0]), 50);
  if (params && params[0] === 'nuevo') setTimeout(() => budgetForm(), 50);
  return { update: draw, params: p => { if (p && p[0] && p[0] !== 'nuevo') budgetView(p[0]); } };
}

function msgFor(p) {
  const name = String(p.cliente || '').split(/\s|@/)[0];
  const lines = (p.lineas || []).map(l => '• ' + (n(l.cantidad) > 1 ? l.cantidad + ' × ' : '') + l.descripcion + ': ' + eur(n(l.cantidad) * n(l.precio))).join('\n');
  return `¡Hola ${name}! 😊 Te paso el presupuesto ${p.numero}:\n${lines}` + (n(p.envio) ? `\n• Envío: ${eur(p.envio)}` : '') + (n(p.descuento) ? `\n• Descuento: −${eur(p.descuento)}` : '') +
    `\nTotal: ${eur(p.total)} (IVA incluido)` + (p.validoHasta ? `\nVálido hasta el ${fdate(p.validoHasta, true)}.` : '') + `\nSi te parece bien, dime y lo empezamos. ¡Gracias! — ${emisor().comercial || emisor().nombre}`;
}

export function budgetView(id) {
  const p = byId('presupuestos', id);
  if (!p) return toast('Ese presupuesto ya no existe', 'warn');
  const acts = [];
  const m = modal('Presupuesto ' + p.numero, h('div.col',
    h('div.row.wrap', stPill(p), h('b', eur(p.total)), h('span.small.muted', p.cliente), p.pedidos && p.pedidos.length ? h('span.small', '→ pedidos: ', p.pedidos.map((pid, i) => { const o = byId('pedidos', pid); return h('a', { href: '#/pedidos/' + pid, style: { marginRight: '6px' }, onclick: () => m.close() }, o ? 'nº ' + o.numero : 'pedido ' + (i + 1)); })) : null),
    preview(budgetDoc(p))),
    close => h('div.row.wrap', { style: { width: '100%' } },
      p.estado !== 'Aceptado' ? btn('Editar', () => { close(); budgetForm(p); }, { icon: 'edit' }) : null,
      btn('Duplicar', () => { close(); budgetForm(Object.assign({}, p, { id: '', numero: '', estado: 'Borrador', fecha: '', validoHasta: '', pedidos: [] })); }, { icon: 'copy', cls: 'ghost' }),
      p.estado === 'Borrador' || p.estado === 'Rechazado' ? btn('Borrar', async () => { if (!await confirmDlg('Borrar presupuesto', '¿Borrar ' + p.numero + '? Irá a la papelera.', 'Borrar', true)) return; try { await api('presupuestos.borrar', { id: p.id }); removeLocal('presupuestos', p.id); emit(); close(); toast('Presupuesto en la papelera', 'ok'); } catch (e) { handleError(e); } }, { cls: 'ghost danger', icon: 'trash' }) : null,
      h('span.grow'),
      btn('Copiar mensaje', () => copyText(msgFor(p)), { icon: 'copy' }),
      btn('PDF / imprimir', () => printDoc(budgetDoc(p)), { icon: 'printer' }),
      p.estado === 'Borrador' ? btn('Marcar enviado', () => setState(p, 'Enviado', close), { icon: 'send' }) : null,
      p.estado === 'Enviado' ? btn('Rechazado', () => setState(p, 'Rechazado', close), { cls: 'ghost' }) : null,
      p.estado !== 'Aceptado' && can('pedidos.crear') ? btn('Aceptado → crear pedido', () => convert(p, close), { cls: 'primary', icon: 'check' }) : null), { size: 'wide' });
  return m;
}
async function setState(p, estado, close) {
  try { const r = await api('presupuestos.estado', { id: p.id, estado }); upsertLocal('presupuestos', r); emit(); close(); toast('Presupuesto ' + p.numero + ': ' + estado.toLowerCase(), 'ok'); } catch (e) { handleError(e); }
}
async function convert(p, close) {
  const canal = sel([''].concat(S.cfg.pedidos.canales), '');
  modal('Convertir en pedido', h('div.col', h('p', 'Se creará ' + ((p.lineas || []).length === 1 ? 'un pedido' : (p.lineas || []).length + ' pedidos (uno por línea)') + ' para ' + p.cliente + '.' + (n(p.descuento) ? ' El descuento se reparte entre las líneas.' : '')), field('Canal', canal)),
    c2 => [btn('Cancelar', c2), btn('Crear pedido' + ((p.lineas || []).length > 1 ? 's' : ''), async ev => {
      ev.target.closest('button').disabled = true;
      try {
        const r = await api('presupuestos.convertir', { id: p.id, canal: canal.value });
        upsertLocal('presupuestos', r.presupuesto); r.pedidos.forEach(o => upsertLocal('pedidos', o)); emit(); c2(); close();
        toast('✅ ' + r.pedidos.length + ' pedido(s) creado(s)', 'ok');
        go('pedidos/' + r.pedidos[0].id);
        pull().catch(() => { });
      } catch (e) { handleError(e); ev.target.closest('button').disabled = false; }
    }, { cls: 'primary', icon: 'check' })], { size: 'narrow' });
}

// Mini-calculadora de precio de una pieza (mismas fórmulas que la calculadora de costes)
function priceHelper(onUse) {
  const pp = Object.assign({}, S.cfg.precios || {});
  const gastos = {}; (S.t.gastos || []).forEach(x => { gastos[CL.norm(x.nombre)] = n(x.coste); });
  const f = { gramos: inp({ type: 'number', min: 0, step: 1, placeholder: 'Ej.: 120' }), horas: inp({ type: 'number', min: 0, step: 0.1, placeholder: 'Ej.: 4' }), horasMO: inp({ type: 'number', min: 0, step: 0.25, value: 0.25 }),
    costePintado: inp({ type: 'number', min: 0, step: 0.5, value: 0 }), gasto1: sel([''].concat((S.t.gastos || []).map(x => x.nombre)), ''), plat: sel([{ v: 'general', t: 'Venta directa / WhatsApp / Wallapop' }, { v: 'vinted', t: 'Vinted' }, { v: 'etsy', t: 'Etsy' }], 'general') };
  const out = h('div.small');
  let rec = null;
  // v13.10: ¿cómo lo envías? (sobre / caja / bolsa) → su coste se suma al precio recomendado
  const sc = CL.simpleCfg((S.cfg.embalaje || {}).simple), envSt = { tipo: '', cinta: true };
  const envBox = h('div.pz-envio');
  const envCoste = () => envSt.tipo === 'nada' ? 0 : envSt.tipo ? n(sc.precioEnvase) + (envSt.cinta ? n(sc.cinta) : 0) : null;
  const drawEnv = () => mount(envBox, h('div.lbl', { style: { fontWeight: 700 } }, '📦 ¿Cómo lo envías?'),
    h('div.row.wrap', { style: { gap: '6px', marginTop: '4px' } }, [['sobre', '✉️ Sobre'], ['caja', '📦 Caja'], ['bolsa', '🛍️ Bolsa'], ['nada', 'Sin embalaje']].map(([k, t]) =>
      h('button.chip' + (envSt.tipo === k ? '.on' : ''), { type: 'button', 'data-tipo': k, onclick: () => { envSt.tipo = envSt.tipo === k ? '' : k; drawEnv(); calc(); } }, t + (k !== 'nada' ? ' · ' + eur(sc.precioEnvase) : '')))),
    envSt.tipo && envSt.tipo !== 'nada' ? h('label.check', { style: { marginTop: '4px' } }, h('input', { type: 'checkbox', checked: envSt.cinta, onchange: e => { envSt.cinta = e.target.checked; calc(); } }), '🧻 Con cinta (' + eur(sc.cinta) + ')') : null);
  const calc = () => {
    const c = { gramos: n(f.gramos.value), horas: n(f.horas.value), horasMO: n(f.horasMO.value), pintado: n(f.costePintado.value) > 0 ? 'Sí' : 'No', costePintado: n(f.costePintado.value), gasto1: f.gasto1.value };
    const ec = envCoste(); if (ec !== null) c.embalaje = ec;
    if (!c.gramos && !c.horas && !c.horasMO) { mount(out, h('span.muted', 'Rellena gramos y horas.')); rec = null; return; }
    const r = CL.prices(c, pp, gastos);
    rec = r.recomendado[f.plat.value]; const min = r.minimo[f.plat.value];
    mount(out, h('div.profit', h('span.l', 'Coste de fabricación (con IVA)'), h('span.v', eur(r.desglose.costeTotal)), h('span.l', 'Precio recomendado'), h('b.v', eur(rec)), h('span.l', 'Precio mínimo (no bajes de aquí)'), h('span.v', eur(min))),
      h('p.tiny.muted', 'Filamento ' + eur(r.desglose.filamento) + ' · luz ' + eur(r.desglose.luz) + ' · mano de obra ' + eur(r.desglose.manoObra) + (r.desglose.gastosExtra ? ' · extras ' + eur(r.desglose.gastosExtra) : '') + ' · embalaje ' + eur(r.desglose.embalaje) + ' · margen ' + Math.round(n(pp.margen) * 100) + ' %'),
      envSt.tipo && envSt.tipo !== 'nada' ? h('p.tiny.pz-env-ok', '📦 ' + ({ sobre: 'Sobre', caja: 'Caja', bolsa: 'Bolsa' })[envSt.tipo] + ' ' + eur(sc.precioEnvase) + (envSt.cinta ? ' + cinta ' + eur(sc.cinta) : '') + ' = ' + eur(envCoste()) + ' · ya está sumado al precio recomendado') : null);
  };
  Object.values(f).forEach(x => x.addEventListener('input', calc));
  drawEnv(); calc();
  modal('🧮 Calcular precio de la pieza', h('div.col', envBox, h('div.form', field('Gramos de filamento', f.gramos), field('Horas de impresión', f.horas), field('Horas de mano de obra', f.horasMO, 'Preparar, lijar, montar…'), field('Pintado (€)', f.costePintado), field('Gasto extra', f.gasto1), field('Dónde se vende', f.plat)), out),
    close => [btn('Cancelar', close), btn('Usar este precio', () => { if (!rec) return toast('Rellena gramos y horas', 'warn'); onUse(rec, { gramos: n(f.gramos.value), horas: n(f.horas.value), horasMO: n(f.horasMO.value) }); close(); }, { cls: 'primary', icon: 'check' })]);
}

export function budgetForm(p, preset) {
  if (!can('presupuestos.gestionar')) return requestAccess('presupuestos.gestionar', 'presupuestos');
  const isNew = !p || !p.id; p = p || {};
  const fc = S.cfg.facturacion || {};
  const f = {
    cliente: inp({ value: p.cliente || (preset && preset.cliente) || '', list: 'dl-bcli', placeholder: 'Nombre o usuario', autocomplete: 'off' }),
    contacto: inp({ value: p.contacto || '', placeholder: 'Teléfono o email (opcional)' }),
    fecha: inp({ type: 'date', value: p.fecha || S.hoy }),
    validoHasta: inp({ type: 'date', value: p.validoHasta || CL.addDays(p.fecha || S.hoy, n(fc.validezPresupuesto) || 15) }),
    envio: inp({ type: 'number', min: 0, step: 0.01, value: p.envio || '', placeholder: '0' }),
    descuento: inp({ type: 'number', min: 0, step: 0.01, value: p.descuento || '', placeholder: '0' }),
    notas: area({ value: p.notas || '', placeholder: 'Detalles del encargo: medidas, colores, texto grabado…', style: { minHeight: '60px' } }),
    condiciones: area({ value: p.condiciones ?? fc.condiciones ?? '', style: { minHeight: '50px' } })
  };
  const lines = (p.lineas && p.lineas.length ? p.lineas : [{ descripcion: (preset && preset.descripcion) || '', cantidad: 1, precio: '' }]).map(l => Object.assign({}, l));
  const box = h('div.lines'), tot = h('div.totals');
  const dlP = h('datalist', { id: 'dl-bprod' }, S.t.productos.map(x => h('option', { value: x.nombre })));
  const drawLines = () => {
    mount(box, h('div.line-row.hdr', h('span', 'Descripción'), h('span', 'Cant.'), h('span', 'Precio (IVA inc.)'), h('span.lr-imp', 'Importe'), h('span'), h('span')),
      lines.map((l, i) => {
        const d = inp({ value: l.descripcion, list: 'dl-bprod', placeholder: 'Pieza o producto' }), c = inp({ type: 'number', min: 0, step: 1, value: l.cantidad }), pr = inp({ type: 'number', min: 0, step: 0.01, value: l.precio });
        const imp = h('span.lr-imp.small', eur(n(l.cantidad) * n(l.precio)));
        d.addEventListener('input', () => { l.descripcion = d.value; });
        d.addEventListener('change', () => { const prod = S.t.productos.find(x => CL.norm(x.nombre) === CL.norm(d.value)); if (prod) { l.productoId = prod.id; if (!l.precio) { const cal = (S.t.calculadora || []).find(x => x.nombre === prod.nombre); l.precio = prod.precio || (cal && cal.precioVenta) || ''; drawLines(); } } else delete l.productoId; });
        [c, pr].forEach(x => x.addEventListener('input', () => { l.cantidad = c.value; l.precio = pr.value; imp.textContent = eur(n(l.cantidad) * n(l.precio)); drawTot(); }));
        return h('div.line-row', d, c, pr, imp, btn('🧮', () => priceHelper((v, extra) => { l.precio = v; Object.assign(l, extra); drawLines(); }), { cls: 'ghost icon sm', title: 'Calcular precio con gramos y horas' }),
          btn('', () => { lines.splice(i, 1); if (!lines.length) lines.push({ descripcion: '', cantidad: 1, precio: '' }); drawLines(); }, { cls: 'ghost icon sm', icon: 'x', title: 'Quitar línea' }));
      }),
      h('div', btn('Añadir línea', () => { lines.push({ descripcion: '', cantidad: 1, precio: '' }); drawLines(); }, { cls: 'ghost sm', icon: 'plus' })));
    drawTot();
  };
  const drawTot = () => {
    const sub = lines.reduce((a, l) => a + n(l.cantidad) * n(l.precio), 0), total = sub + n(f.envio.value) - n(f.descuento.value);
    mount(tot, h('div', h('span', 'Subtotal'), h('span', eur(sub))), n(f.envio.value) ? h('div', h('span', 'Envío'), h('span', eur(f.envio.value))) : null, n(f.descuento.value) ? h('div', h('span', 'Descuento'), h('span', '−' + eur(f.descuento.value))) : null, h('div.big', h('span', 'Total (IVA incl.)'), h('span', eur(total))));
  };
  [f.envio, f.descuento].forEach(x => x.addEventListener('input', drawTot));
  f.fecha.addEventListener('change', () => { f.validoHasta.value = CL.addDays(f.fecha.value, n(fc.validezPresupuesto) || 15); });
  drawLines();
  const msg = h('p.bad-t');
  modal(isNew ? 'Nuevo presupuesto' : 'Editar ' + p.numero, h('div.col', h('datalist', { id: 'dl-bcli' }, S.t.clientes.map(c => h('option', { value: c.nombre }))), dlP,
    h('div.form', field('Cliente *', f.cliente), field('Contacto', f.contacto), field('Fecha', f.fecha), field('Válido hasta', f.validoHasta)),
    h('h4', { style: { margin: '6px 0 0' } }, 'Qué incluye'), box,
    h('div.row.wrap.top', h('div.form.grow', field('Envío que se cobra (€)', f.envio), field('Descuento (€)', f.descuento)), tot),
    h('details.more', h('summary', 'Notas y condiciones'), h('div.in.form', field('Notas para el cliente', f.notas, null, 'full'), field('Condiciones', f.condiciones, null, 'full'))), msg),
    close => [btn('Cancelar', close), btn(isNew ? 'Crear presupuesto' : 'Guardar', async ev => {
      msg.textContent = '';
      const ls = lines.filter(l => String(l.descripcion || '').trim() || n(l.precio)).map(l => Object.assign({}, l, { descripcion: String(l.descripcion || '').trim(), cantidad: n(l.cantidad), precio: n(l.precio) }));
      if (!f.cliente.value.trim()) return msg.textContent = 'Indica el cliente.';
      if (!ls.length) return msg.textContent = 'Añade al menos una línea.';
      if (ls.some(l => !l.descripcion)) return msg.textContent = 'Cada línea necesita una descripción.';
      if (ls.some(l => !(l.cantidad > 0))) return msg.textContent = 'Las cantidades deben ser mayores que 0.';
      const datos = { cliente: f.cliente.value.trim(), contacto: f.contacto.value.trim(), fecha: f.fecha.value, validoHasta: f.validoHasta.value, lineas: ls, envio: n(f.envio.value), descuento: n(f.descuento.value), notas: f.notas.value.trim(), condiciones: f.condiciones.value.trim() };
      const b = ev.target.closest('button'); b.disabled = true;
      try {
        const r = await api('presupuestos.guardar', isNew ? { datos } : { id: p.id, datos });
        upsertLocal('presupuestos', r); emit(); close();
        toast(isNew ? 'Presupuesto ' + r.numero + ' creado' : 'Presupuesto guardado', 'ok');
        budgetView(r.id);
      } catch (e) { msg.textContent = e.message; b.disabled = false; }
    }, { cls: 'primary', icon: 'check' })], { size: 'wide' });
}
