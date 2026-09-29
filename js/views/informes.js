// ================= Informes: ventas, pedidos, clientes, productos, tareas y redes =================
import { h, mount, icon, btn, toast, eur, fdate, pill, empty, sel, inp, field, num } from '../ui.js';
import { S, can, api } from '../store.js';

const CL = window.CL;
function range(p, a, b) {
  const hoy = S.hoy;
  const ms = hoy.slice(0, 8) + '01';
  switch (p) {
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
  const pSel = sel([{ v: 'semana', t: 'Esta semana' }, { v: 'mes', t: 'Este mes' }, { v: 'mes_anterior', t: 'Mes anterior' }, { v: 'trimestre', t: 'Últimos 90 días' }, { v: 'año', t: 'Este año' }, { v: 'todo', t: 'Todo' }, { v: 'rango', t: 'Elegir fechas…' }], st.p);
  const dA = inp({ type: 'date' }), dB = inp({ type: 'date' });
  const rangeBox = h('div.row.hidden', field('Desde', dA), field('Hasta', dB));
  pSel.addEventListener('change', () => { st.p = pSel.value; rangeBox.classList.toggle('hidden', st.p !== 'rango'); draw(); });
  [dA, dB].forEach(x => x.addEventListener('change', () => { st.a = dA.value; st.b = dB.value; draw(); }));
  const aiBox = h('div');
  const box = h('div.col', { style: { gap: 'var(--gap)' } });
  el.append(h('div.page-head', h('h1', 'Informes'), h('div.row', h('div', { style: { width: '200px' } }, pSel),
    can('ia.usar') ? btn('Resumen con IA', aiSummary, { icon: 'sparkles' }) : null, btn('Imprimir / PDF', () => window.print(), { icon: 'printer', cls: 'no-print' }), btn('Exportar CSV', csv, { icon: 'download', cls: 'no-print' }))), rangeBox, aiBox, box);

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
    const tareas = S.t.tareas.filter(t => t.estado === 'Completada' && String(t.completado).slice(0, 10) >= a && String(t.completado).slice(0, 10) <= b);
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
  async function aiSummary(ev) {
    const b = ev.target.closest('button'); b.disabled = true; b.textContent = 'Consultando…';
    mount(aiBox, h('div.card', h('span.sync.busy', h('span.dot'), 'Preparando el resumen con los datos reales…')));
    const map = { semana: 'semana', mes: 'mes', mes_anterior: 'mes_anterior', año: 'año', todo: 'todo', trimestre: 'mes', rango: 'mes' };
    try {
      const r = await api('informes.generar', { periodo: map[st.p], ia: true }, { timeout: 180000 });
      mount(aiBox, h('div.card', { style: { background: 'var(--brand-soft)' } }, h('div.card-h', h('h3', '✨ Resumen'), btn('', () => aiBox.textContent = '', { cls: 'ghost icon sm', icon: 'x' })), h('p', { style: { whiteSpace: 'pre-wrap' } }, r.resumenIA || r.texto), r.errorIA ? h('p.small.warn-t', 'La IA no respondió (' + r.errorIA + '); este es el resumen automático.') : null));
    } catch (e) { mount(aiBox, h('div.card', h('p.bad-t', e.message))); }
    b.disabled = false; b.textContent = 'Resumen con IA';
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
