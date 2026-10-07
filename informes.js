// ================= Informes: ventas, pedidos, clientes, productos, tareas y redes =================
import { h, mount, icon, btn, toast, eur, fdate, pill, empty, sel, inp, field, num } from '../ui.js';
import { S, can, api } from '../store.js';
import { xlsxBlob } from '../xlsx.js';
import { richText } from './ia.js';

const CL = window.CL;
function range(p, a, b) {
  const hoy = S.hoy;
  const ms = hoy.slice(0, 8) + '01';
  switch (p) {
    case 'hoy': return [hoy, hoy];
    case 'ayer': { const y = CL.addDays(hoy, -1); return [y, y]; }
    case 'semana': return [CL.weekStart(hoy), hoy];
    case 'mes': return [ms, hoy];
    case 'mes_anterior': { const e = CL.addDays(ms, -1); return [e.slice(0, 8) + '01', e]; }
    case 'trimestre': return [CL.addDays(hoy, -90), hoy];
    case 'año': return [hoy.slice(0, 5) + '01-01', hoy];
    case 'rango': return [a || '0000-01-01', b || hoy];
    default: return ['0000-01-01', '9999-12-31'];
  }
}
function bars(rows, fmt) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return h('div.col', { style: { gap: '6px' } }, rows.map(r => h('div', h('div.row.small', h('span.grow.ellipsis', r[0]), h('b', fmt ? fmt(r[1]) : String(r[1]))), h('div', { style: { height: '8px', background: 'var(--surface-3)', borderRadius: '9px', overflow: 'hidden' } }, h('i', { style: { display: 'block', height: '100%', width: (r[1] / max * 100) + '%', background: r[2] || 'var(--brand)', borderRadius: '9px' } })))));
}

export function render(el) {
  const st = { p: 'mes', a: '', b: '' };
  const pSel = sel([{ v: 'hoy', t: 'Hoy (diario)' }, { v: 'ayer', t: 'Ayer' }, { v: 'semana', t: 'Esta semana' }, { v: 'mes', t: 'Este mes' }, { v: 'mes_anterior', t: 'Mes anterior' }, { v: 'trimestre', t: 'Últimos 90 días' }, { v: 'año', t: 'Este año' }, { v: 'todo', t: 'Todo' }, { v: 'rango', t: 'Elegir fechas…' }], st.p);
  const dA = inp({ type: 'date' }), dB = inp({ type: 'date' });
  const rangeBox = h('div.row.hidden', field('Desde', dA), field('Hasta', dB));
  pSel.addEventListener('change', () => { st.p = pSel.value; rangeBox.classList.toggle('hidden', st.p !== 'rango'); draw(); });
  [dA, dB].forEach(x => x.addEventListener('change', () => { st.a = dA.value; st.b = dB.value; draw(); }));
  const aiBox = h('div');
  const box = h('div.col', { style: { gap: 'var(--gap)' } });
  el.append(h('div.page-head', h('h1', 'Informes'), h('div.row', h('div', { style: { width: '200px' } }, pSel),
    can('ia.usar') ? btn('Redactar con IA', aiSummary, { icon: 'sparkles', cls: 'no-print' }) : null, btn('PDF', () => window.print(), { icon: 'printer', cls: 'no-print', title: 'Imprimir o guardar como PDF' }), btn('Excel', xlsx, { icon: 'download', cls: 'no-print' }), btn('CSV', csv, { icon: 'download', cls: 'no-print' }))), rangeBox, aiBox, box);

  function data() {
    const [a, b] = range(st.p, st.a, st.b);
    const cp = S.cfg.pedidos;
    const ped = S.t.pedidos.filter(o => o.fecha && o.fecha >= a && o.fecha <= b);
    const valid = ped.filter(o => !CL.stateOf(cp, o.estado).cancelled);
    const total = valid.reduce((s, o) => s + CL.orderTotal(o), 0);
    const shipped = S.t.pedidos.filter(o => o.fechaEnvio && o.fechaEnvio >= a && o.fechaEnvio <= b);
    const late = shipped.filter(o => { const t = CL.orderTiming(Object.assign({}, o, { estado: 'Nuevo' }), cp, o.fechaEnvio); return t.limite && o.fechaEnvio > t.limite; });
    const group = (list, key, val) => { const m = {}; list.forEach(o => { const k = key(o) || '—'; m[k] = (m[k] || 0) + val(o); }); return Object.keys(m).map(k => [k, m[k]]).sort((x, y) => y[1] - x[1]); };
    const firstOrder = {};
    S.t.pedidos.filter(o => !CL.stateOf(cp, o.estado).cancelled).forEach(o => { const k = o.clienteId || CL.norm(o.cliente); if (!firstOrder[k] || o.fecha < firstOrder[k]) firstOrder[k] = o.fecha; });
    const clientsIn = [...new Set(valid.map(o => o.clienteId || CL.norm(o.cliente)))];
    const nuevos = clientsIn.filter(k => firstOrder[k] >= a).length;
    const tareas = S.t.tareas.filter(t => t.estado === 'Completada' && CL.day(t.completado) >= a && CL.day(t.completado) <= b);
    const redes = S.t.redes.filter(r => r.fecha >= a && r.fecha <= b && r.estado !== 'Cancelado');
    const months = {};
    S.t.pedidos.filter(o => !CL.stateOf(cp, o.estado).cancelled && o.fecha).forEach(o => { const k = o.fecha.slice(0, 7); months[k] = (months[k] || 0) + CL.orderTotal(o); });
    return { a, b, ped, valid, total, shipped, late, nuevos, clientsIn, tareas, redes, months,
      porEstado: group(ped, o => o.estado, () => 1), porCanal: group(valid, o => o.canal || 'Sin canal', o => CL.orderTotal(o)),
      topProd: group(valid, o => o.producto, o => Number(o.cantidad) || 1).slice(0, 8), topCli: group(valid, o => o.cliente, o => CL.orderTotal(o)).slice(0, 8),
      tareasPor: group(tareas, t => t.completadoPor, () => 1), redesPor: group(redes, r => r.red, () => 1) };
  }
  function draw() {
    const d = data();
    const sales = can('informes.ver');
    if (!S.t.pedidos.length && !S.t.tareas.length) return mount(box, h('div.card', empty('chart', 'Aún no hay datos para informes', 'Cuando registréis pedidos, tareas y publicaciones, aquí veréis la evolución.')));
    const last12 = []; const dt = CL.parse(S.hoy); for (let i = 11; i >= 0; i--) { const x = new Date(dt.getFullYear(), dt.getMonth() - i, 1, 12); const k = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); last12.push([k, d.months[k] || 0]); }
    const maxM = Math.max(1, ...last12.map(x => x[1]));
    mount(box,
      h('p.muted.small', 'Del ' + (d.a === '0000-01-01' ? 'inicio' : fdate(d.a)) + ' al ' + (d.b === '9999-12-31' ? 'hoy' : fdate(d.b)) + ' · calculado con los datos reales de la app'),
      biCard(),
      h('div.grid.g4.kpis', [sales ? ['Ventas', eur(d.total)] : null, ['Pedidos', num(d.valid.length)], sales ? ['Ticket medio', eur(d.valid.length ? d.total / d.valid.length : 0)] : null, ['Enviados', num(d.shipped.length)], ['A tiempo', d.shipped.length ? Math.round((d.shipped.length - d.late.length) / d.shipped.length * 100) + '%' : '—'],
        ['Clientes que compran', num(d.clientsIn.length)], ['Clientes nuevos', num(d.nuevos)], ['Tareas completadas', num(d.tareas.length)]].filter(Boolean).map(x => h('div.kpi', { style: { cursor: 'default' } }, h('span.n', x[1]), h('span.l', x[0])))),
      sales ? h('div.card', h('div.card-h', h('h3', 'Ventas de los últimos 12 meses')), h('div.row', { style: { alignItems: 'flex-end', gap: '6px', height: '160px' } }, last12.map(m => h('div.col', { style: { flex: 1, alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }, title: m[0] + ': ' + eur(m[1]) },
        h('div.tiny.muted', m[1] ? Math.round(m[1]) + '€' : ''), h('div', { style: { width: '100%', maxWidth: '38px', height: Math.max(2, m[1] / maxM * 120) + 'px', background: 'var(--brand)', borderRadius: '6px 6px 2px 2px', opacity: m[0] === S.hoy.slice(0, 7) ? 1 : .6 } }), h('div.tiny.muted', m[0].slice(5)))))) : null,
      h('div.grid.g2',
        h('div.card', h('h3', { style: { marginBottom: '10px' } }, 'Pedidos por estado'), d.porEstado.length ? bars(d.porEstado.map(x => [x[0], x[1], (S.cfg.pedidos.estados.find(s => s.k === x[0]) || {}).c])) : h('p.muted.small', 'Sin pedidos')),
        sales ? h('div.card', h('h3', { style: { marginBottom: '10px' } }, 'Ventas por canal'), d.porCanal.length ? bars(d.porCanal, eur) : h('p.muted.small', 'Sin ventas')) : null,
        h('div.card', h('h3', { style: { marginBottom: '10px' } }, 'Productos más vendidos (unidades)'), d.topProd.length ? bars(d.topProd) : h('p.muted.small', 'Sin ventas')),
        sales ? h('div.card', h('h3', { style: { marginBottom: '10px' } }, 'Mejores clientes'), d.topCli.length ? bars(d.topCli, eur) : h('p.muted.small', 'Sin ventas')) : null,
        h('div.card', h('h3', { style: { marginBottom: '10px' } }, 'Tareas completadas por persona'), d.tareasPor.length ? bars(d.tareasPor) : h('p.muted.small', 'Ninguna en este periodo')),
        h('div.card', h('h3', { style: { marginBottom: '10px' } }, 'Publicaciones en redes'), d.redesPor.length ? bars(d.redesPor) : h('p.muted.small', 'Ninguna en este periodo'), h('p.small.muted', d.redes.filter(r => r.estado === 'Publicado').length + ' publicadas de ' + d.redes.length + ' planificadas'))),
      d.late.length ? h('div.card', h('h3', 'Enviados con retraso (' + d.late.length + ')'), h('div.list', d.late.slice(0, 20).map(o => h('div.item', { onclick: () => location.hash = '#/pedidos/' + o.id }, h('b', 'nº ' + o.numero), h('span.grow', o.cliente + ' · ' + o.producto), h('span.small.bad-t', 'enviado ' + fdate(o.fechaEnvio)))))) : null);
  }
  function biPer() { return { hoy: 'hoy', semana: 'semana', mes: 'mes', año: 'año', trimestre: '30d' }[st.p] || null; }
  function biCard() {
    const per = biPer();
    if (!per || !can('informes.ver')) return null;
    const bi = CL.bi(S.t, S.cfg, S.hoy, per);
    const costs = can('productos.costes');
    return h('div.card', h('div.card-h', h('h3', '📈 Conclusiones (' + ({ hoy: 'hoy frente a ayer', semana: 'esta semana frente a la anterior', mes: 'este mes frente al anterior', año: 'este año frente al anterior', '30d': 'últimos 30 días frente a los 30 anteriores' }[per]) + ')')),
      bi.conclusiones.length ? h('ul', bi.conclusiones.filter(c => costs || !/margen|beneficio|rentable|coste/i.test(c)).map(c => h('li', c))) : h('p.muted.small', 'Todavía no hay datos suficientes para sacar conclusiones.'),
      costs ? h('div.grid.g4.kpis', [['Beneficio', eur(bi.actual.beneficio)], ['Margen', bi.actual.margen === null ? '—' : Math.round(bi.actual.margen * 100) + ' %'], ['Clientes activos', num(bi.clientesActivos)], ['Clientes inactivos', num(bi.clientesInactivos)]].map(x => h('div.kpi', { style: { cursor: 'default' } }, h('span.n', x[1]), h('span.l', x[0])))) : null,
      costs && bi.rentables.length ? h('div', h('div.lbl', 'Productos más rentables'), bars(bi.rentables.map(p => [p.producto + (p.margen !== null ? ' · ' + Math.round(p.margen * 100) + ' %' : ''), p.beneficio]), eur)) : null);
  }
  function xlsx() {
    const d = data();
    const cols = ['numero', 'fecha', 'cliente', 'producto', 'cantidad', 'precio', 'estado', 'canal', 'envio', 'seguimiento', 'fechaEnvio', 'responsable'];
    const heads = ['Nº', 'Fecha', 'Cliente', 'Producto', 'Cantidad', 'Precio (€)', 'Estado', 'Canal', 'Envío', 'Seguimiento', 'Fecha envío', 'Responsable', 'Total (€)'];
    const numv = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? v : Number(v);
    const sheets = [{ nombre: 'Pedidos', filas: [heads].concat(d.ped.map(o => cols.map(c => ['cantidad', 'precio'].includes(c) ? numv(o[c]) : o[c]).concat([CL.orderTotal(o)]))) }];
    const sales = can('informes.ver');
    sheets.unshift({ nombre: 'Resumen', filas: [['Concepto', 'Valor'], ['Desde', d.a === '0000-01-01' ? 'inicio' : d.a], ['Hasta', d.b === '9999-12-31' ? S.hoy : d.b], ['Pedidos', d.valid.length]].concat(sales ? [['Ventas (€)', Math.round(d.total * 100) / 100], ['Ticket medio (€)', d.valid.length ? Math.round(d.total / d.valid.length * 100) / 100 : 0]] : []).concat([['Enviados', d.shipped.length], ['Clientes que compran', d.clientsIn.length], ['Clientes nuevos', d.nuevos], ['Tareas completadas', d.tareas.length]]) });
    sheets.push({ nombre: 'Productos', filas: [['Producto', 'Unidades']].concat(d.topProd) });
    if (sales) sheets.push({ nombre: 'Clientes', filas: [['Cliente', 'Ventas (€)']].concat(d.topCli.map(x => [x[0], Math.round(x[1] * 100) / 100])) });
    const per = biPer();
    if (per && can('productos.costes')) { const bi = CL.bi(S.t, S.cfg, S.hoy, per); sheets.push({ nombre: 'Márgenes', filas: [['Producto', 'Unidades', 'Ventas (€)', 'Beneficio (€)', 'Margen (%)']].concat(bi.masVendidos.concat(bi.rentables).filter((x, i, a) => a.findIndex(y => y.producto === x.producto) === i).map(p => [p.producto, p.unidades, p.ventas, p.conCoste ? p.beneficio : 'sin coste', p.margen === null ? '' : Math.round(p.margen * 1000) / 10])) }); sheets.push({ nombre: 'Conclusiones', filas: [['Conclusión']].concat(bi.conclusiones.map(c => [c])) }); }
    const a = h('a', { href: URL.createObjectURL(xlsxBlob(sheets)), download: 'informe_' + d.a.replace('0000-01-01', 'inicio') + '_' + d.b.replace('9999-12-31', S.hoy) + '.xlsx' });
    document.body.appendChild(a); a.click(); a.remove();
    toast('Excel descargado', 'ok');
  }
  async function aiSummary(ev) {
    const b = ev.target.closest('button'); b.disabled = true; b.textContent = 'Redactando…';
    const out = h('div');
    mount(aiBox, h('div.card', { style: { background: 'var(--brand-soft)' } }, h('div.card-h', h('h3', '✨ Informe redactado por la IA local'), btn('', () => aiBox.textContent = '', { cls: 'ghost icon sm', icon: 'x' })), out, h('p.tiny.muted', 'Redactado solo con las cifras de esta pantalla.')));
    mount(out, h('span.sync.busy', h('span.dot'), 'Preparando…'));
    const d = data(), per = biPer(), bi = per ? CL.bi(S.t, S.cfg, S.hoy, per) : null;
    const costs = can('productos.costes');
    const facts = ['Periodo: ' + d.a + ' a ' + d.b, 'Pedidos: ' + d.valid.length, can('informes.ver') ? 'Ventas: ' + d.total.toFixed(2) + ' €' : '', 'Enviados: ' + d.shipped.length + ' (' + d.late.length + ' con retraso)', 'Clientes que compran: ' + d.clientsIn.length + ' (nuevos: ' + d.nuevos + ')', 'Productos más vendidos: ' + d.topProd.slice(0, 5).map(x => x[0] + ' (' + x[1] + ')').join(', '), 'Tareas completadas: ' + d.tareas.length]
      .concat(bi ? bi.conclusiones.filter(c => costs || !/margen|beneficio|rentable|coste/i.test(c)) : []).filter(Boolean);
    try {
      const { write } = await import('../ai/engine.js');
      const txt = await write('Redacta un informe breve para el equipo (máximo 10 líneas, con viñetas) usando SOLO estos datos reales, y termina con 2 recomendaciones concretas:\n' + facts.map(f => '- ' + f).join('\n'), { onToken: t => mount(out, richText(t)) });
      mount(out, richText(txt));
    } catch (e) { mount(out, h('div', h('p.small.warn-t', e.message), h('p', 'Resumen automático (sin IA):'), h('ul', facts.map(f => h('li', f))))); }
    b.disabled = false; b.textContent = 'Redactar con IA';
  }
  function csv() {
    const d = data();
    const cols = ['numero', 'fecha', 'cliente', 'producto', 'cantidad', 'precio', 'estado', 'canal', 'envio', 'seguimiento', 'fechaEnvio', 'responsable'];
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const txt = '﻿' + cols.join(';') + '\n' + d.ped.map(o => cols.map(c => esc(o[c])).join(';') + ';' + esc(CL.orderTotal(o))).join('\n');
    const a = h('a', { href: URL.createObjectURL(new Blob([txt], { type: 'text/csv' })), download: 'pedidos_' + d.a + '_' + d.b + '.csv' });
    document.body.appendChild(a); a.click(); a.remove();
    toast('CSV descargado (se abre con Excel)', 'ok');
  }
  draw();
  return { update: draw };
}
