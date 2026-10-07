// ================= v16 · 💶 Ingresos del mes (lo COBRADO) =================
// Cada pedido que marcas como «Cobrado» entra aquí en el mes en que lo cobras.
// Todo sale de tus pedidos reales: sin cobros no hay proyección (no se inventan números).
import { h, mount, btn, eur, empty, toast, fdate, monthName } from '../ui.js';
import { S, can, api, upsertLocal, emit } from '../store.js';
import { handleError, go } from '../app.js';

const hoyMes = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const mesTxt = m => { const p = String(m).split('-'); const n = monthName(Number(p[1]) - 1) || ''; return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + p[0]; };
const mover = (m, d) => { const p = m.split('-').map(Number); const x = new Date(p[0], p[1] - 1 + d, 1); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
const pct = v => v === null || v === undefined ? '—' : Math.round(v * 100) + ' %';
let recordado = ''; // el mes que estabas mirando (no se pierde al volver)

export function render(el) {
  if (!can('productos.costes')) { mount(el, h('div.card', h('h3', '🔒 Ingresos'), h('p.muted', 'Necesitas el permiso «Ver costes y márgenes».'))); return {}; }
  const st = { mes: recordado || hoyMes(), d: null, cargando: false };
  const cuerpo = h('div'), titulo = h('b.ing-mes');
  const sig = btn('›', () => cambiar(1), { cls: 'ghost ing-fl', title: 'Mes siguiente' });
  el.append(
    h('div.page-head', h('div', h('h1', '💶 Ingresos'), h('div.muted.small', 'Lo que has cobrado. Se apunta solo al marcar un pedido como «Cobrado».')),
      h('div.row.ing-nav', btn('‹', () => cambiar(-1), { cls: 'ghost ing-fl', title: 'Mes anterior' }), titulo, sig)),
    cuerpo);
  function cambiar(d) { const n = mover(st.mes, d); if (n > hoyMes()) return; st.mes = n; recordado = n; cargar(); }
  async function cargar() {
    titulo.textContent = mesTxt(st.mes); sig.disabled = st.mes >= hoyMes();
    if (!st.d) mount(cuerpo, h('p.muted', 'Calculando…'));
    const pedido = st.mes;
    try { const d = await api('ingresos.mes', { mes: pedido }); if (pedido !== st.mes) return; st.d = d; pintar(); }
    catch (e) { mount(cuerpo, h('div.card', h('p.bad-t', 'No se pudieron cargar los ingresos.'), btn('Reintentar', cargar))); handleError(e); }
  }
  function kpi(n, l, cls, sub) { return h('div.kpi.static' + (cls ? '.' + cls : ''), h('span.n', n), h('span.l', l), sub ? h('span.tiny.muted', sub) : null); }
  function fila(t, v, nota, cls) { return h('div.ing-fila' + (cls ? '.' + cls : ''), h('span', t, nota ? h('span.tiny.muted', ' · ' + nota) : null), h('b', v)); }
  function pintar() {
    const d = st.d, y = cuerpo.ownerDocument.scrollingElement ? cuerpo.ownerDocument.scrollingElement.scrollTop : 0;
    const pr = d.proyeccion, pend = d.pendientes || { pedidos: 0, importe: 0 };
    const max = Math.max(1, ...d.meses.map(m => m.ingresos));
    mount(cuerpo,
      h('div.kpis.g4',
        kpi(eur(d.ingresos), 'Cobrado este mes', 'ok'),
        kpi(String(d.pedidos), d.pedidos === 1 ? 'Pedido cobrado' : 'Pedidos cobrados'),
        kpi(d.ticket === null ? '—' : eur(d.ticket), 'Ticket medio'),
        kpi(d.pedidos ? eur(d.beneficio) : '—', 'Beneficio neto estimado', d.beneficio < 0 ? 'bad' : '', d.pedidos ? 'Margen ' + pct(d.margen) : '')),
      pend.pedidos ? h('div.banner-soft.ing-pend', h('span', '⏳ ' + pend.pedidos + (pend.pedidos === 1 ? ' pedido enviado sin cobrar' : ' pedidos enviados sin cobrar') + ' · ' + eur(pend.importe)),
        btn('Ver y cobrar', () => go('pedidos'), { cls: 'small' })) : null,
      h('div.ing-grid',
        h('div.card',
          h('h3', '📈 Proyección'),
          d.mensajes.map(m => h('p.ing-msg', m)),
          pr && pr.enCurso ? h('p.tiny.muted', 'Calculado con lo cobrado en ' + pr.diasContados + (pr.diasContados === 1 ? ' día' : ' días') + ' de ' + pr.diasMes + '. Es una estimación: cambia cada día.') : null),
        h('div.card',
          h('h3', '🧮 De lo cobrado al beneficio'),
          fila('Cobrado', eur(d.ingresos)),
          fila('Coste de materiales', '− ' + eur(d.materiales), d.sinCoste ? d.sinCoste + ' sin coste apuntado' : ''),
          fila('Coste de embalaje', '− ' + eur(d.embalaje), 'interno: no se suma al precio'),
          fila('Costes asociados', '− ' + eur(d.asociados), 'envío, comisiones y otros' + (d.estimados ? ' (parte estimada)' : '')),
          fila('Beneficio neto estimado', d.pedidos ? eur(d.beneficio) : '—', '', 'total'))),
      d.meses.length ? h('div.card',
        h('h3', '🗓️ Mes a mes'), h('p.tiny.muted', 'Acumulado cobrado: ' + eur(d.acumulado)),
        h('div.ing-meses', d.meses.slice().reverse().map(m => h('button.ing-m' + (m.mes === st.mes ? '.on' : ''), { type: 'button', onclick: () => { st.mes = m.mes; recordado = m.mes; cargar(); } },
          h('span.t', mesTxt(m.mes)), h('span.bar', h('i', { style: { width: Math.max(3, Math.round(m.ingresos / max * 100)) + '%' } })),
          h('b', eur(m.ingresos)), h('span.tiny.muted', m.pedidos + (m.pedidos === 1 ? ' pedido' : ' pedidos')))))) : null,
      h('div.card',
        h('h3', '✅ Cobrados en ' + mesTxt(st.mes)),
        d.lista.length ? h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'Pedido'), h('th', 'Cliente'), h('th.hide-m', 'Producto'), h('th.hide-m', 'Cobrado el'), h('th', { style: { textAlign: 'right' } }, 'Importe'), h('th.hide-m', { style: { textAlign: 'right' } }, 'Beneficio'))),
          h('tbody', d.lista.map(o => h('tr', { style: { cursor: 'pointer' }, onclick: () => go('pedidos/' + o.id) },
            h('td.bold', 'Nº ' + o.numero), h('td', o.cliente || '—'), h('td.hide-m', o.producto || '—'), h('td.hide-m.small.muted', fdate(o.fecha)),
            h('td.bold', { style: { textAlign: 'right' } }, eur(o.importe)), h('td.hide-m', { style: { textAlign: 'right' } }, o.beneficio === null ? h('span.na', 'falta coste') : eur(o.beneficio)))))))
          : empty('euro', 'Nada cobrado este mes', 'Cuando un pedido esté pagado, ábrelo y pulsa «💶 Cobrado». El importe entra aquí solo.', btn('Ir a pedidos', () => go('pedidos'), { cls: 'primary' }))));
    if (y && cuerpo.ownerDocument.scrollingElement) cuerpo.ownerDocument.scrollingElement.scrollTop = y;
  }
  cargar();
  // v16 · estabilidad: los datos solo se vuelven a pedir si cambia algo de los pedidos (no en cada refresco)
  let firma = firmaPedidos();
  return { update() { const f = firmaPedidos(); if (f !== firma) { firma = f; cargar(); } } };
}
const firmaPedidos = () => (S.t.pedidos || []).map(o => o.id + ':' + (o.cobrado || '') + ':' + (o.cobradoEn || '') + ':' + o.estado + ':' + (o.total || o.precio || '')).join('|');

// Marcar (o desmarcar) un pedido como cobrado. Se usa desde la ficha del pedido y desde «Hoy en el taller».
export async function cobrarPedido(o, cobrado = true) {
  try {
    const r = await api('pedidos.cobrar', { id: o.id, cobrado });
    upsertLocal('pedidos', r.pedido); emit();
    toast(cobrado ? '💶 Cobrado: ' + eur(window.CL.orderTotal(r.pedido)) + ' apuntados en ' + mesTxt(String(r.pedido.cobradoEn || hoyMes()).substring(0, 7)) : 'Cobro quitado', 'ok');
    return r;
  } catch (e) { handleError(e); return null; }
}
export const esCobrado = o => /^s/i.test(String((o && o.cobrado) || ''));
