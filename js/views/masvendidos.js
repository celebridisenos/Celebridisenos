// ================= 22-11-2026 · 🏆 MÁS VENDIDOS =================
// Biou: «un apartado de Más vendidos… ordenar por unidades vendidas, ingresos, periodo, canal y rendimiento. Datos reales: no confundas
// visitas o favoritos con ventas. Para decidir qué mejorar, qué priorizar y qué diseños desarrollar».
// Solo pedidos de verdad (sin cancelados) por su fecha: CL.masVendidosRanking (shared/logic.js). El beneficio es el de cada pedido
// (el mismo de Ingresos e Informes); si falta el coste, se dice y no cuenta en el margen.
import { h, mount, eur, fdate, num, sel, empty } from '../ui.js';
import { S, can } from '../store.js';

const CL = window.CL;
const PERIODOS = [['30d', 'Últimos 30 días'], ['90d', 'Últimos 90 días'], ['mes', 'Este mes'], ['mes_anterior', 'Mes anterior'], ['año', 'Este año'], ['todo', 'Desde el principio']];
const ORDEN = [['unidades', 'Unidades vendidas'], ['ingresos', 'Dinero que entra'], ['beneficio', 'Beneficio'], ['margen', 'Margen (% que te queda)']];
function rango(p) {
  const hoy = S.hoy, ms = hoy.slice(0, 8) + '01';
  if (p === '30d') return [CL.addDays(hoy, -29), hoy];
  if (p === '90d') return [CL.addDays(hoy, -89), hoy];
  if (p === 'mes') return [ms, hoy];
  if (p === 'mes_anterior') { const e = CL.addDays(ms, -1); return [e.slice(0, 8) + '01', e]; }
  if (p === 'año') return [hoy.slice(0, 5) + '01-01', hoy];
  return ['', ''];
}
const pc = x => x === null || x === undefined ? '—' : Math.round(x * 100) + ' %';

export function render(el) {
  const st = { p: '90d', canal: '', orden: 'unidades' };
  try { Object.assign(st, JSON.parse(localStorage.getItem('cd.masvendidos') || '{}')); } catch (e) { }
  const costes = can('productos.costes');
  if (!costes && (st.orden === 'beneficio' || st.orden === 'margen')) st.orden = 'unidades';
  const pSel = sel(PERIODOS.map(x => ({ v: x[0], t: x[1] })), st.p), oSel = sel(ORDEN.filter(x => costes || (x[0] !== 'beneficio' && x[0] !== 'margen')).map(x => ({ v: x[0], t: x[1] })), st.orden);
  const cBox = h('div', { style: { minWidth: '170px' } }), box = h('div.col', { style: { gap: 'var(--gap)' } });
  const guarda = () => { try { localStorage.setItem('cd.masvendidos', JSON.stringify(st)); } catch (e) { } };
  pSel.onchange = () => { st.p = pSel.value; guarda(); draw(); };
  oSel.onchange = () => { st.orden = oSel.value; guarda(); draw(); };
  el.append(h('div.page-head', h('div', h('h1', '🏆 Más vendidos'), h('div.muted.small', 'Con tus pedidos de verdad (sin cancelados). Las visitas y los favoritos no cuentan.')),
    h('div.row.wrap.mv-filtros', h('label.mv-f', h('span', 'Periodo'), pSel), h('label.mv-f', h('span', 'Canal'), cBox), h('label.mv-f', h('span', 'Ordenar por'), oSel))), box);

  function draw() {
    const [a, b] = rango(st.p);
    const R = CL.masVendidosRanking(S.t, S.cfg, { desde: a, hasta: b, canal: st.canal, orden: st.orden });
    const cSel = sel([{ v: '', t: 'Todos los canales' }].concat(R.canales.map(c => ({ v: c, t: c }))), st.canal);
    cSel.onchange = () => { st.canal = cSel.value; guarda(); draw(); };
    mount(cBox, cSel);
    if (!R.lista.length) return mount(box, h('div.card', empty('chart', 'Sin ventas en este periodo', st.canal ? 'Prueba con «Todos los canales» o con un periodo más largo.' : 'Prueba con un periodo más largo.')));
    const max = Math.max(1, ...R.lista.map(p => st.orden === 'ingresos' ? p.ingresos : st.orden === 'beneficio' ? Math.max(0, p.beneficio) : st.orden === 'margen' ? Math.max(0, p.margen || 0) : p.unidades));
    const valor = p => st.orden === 'ingresos' ? p.ingresos : st.orden === 'beneficio' ? Math.max(0, p.beneficio) : st.orden === 'margen' ? Math.max(0, p.margen || 0) : p.unidades;
    const medalla = i => ['🥇', '🥈', '🥉'][i] || String(i + 1);
    const cambio = p => p.cambio === null || p.cambio === undefined ? (a && p.antes === 0 ? h('span.tiny.ok-t', 'nuevo') : null)
      : h('span.tiny' + (p.cambio >= 0 ? '.ok-t' : '.bad-t'), { title: 'Frente al periodo anterior: ' + num(p.antes) + ' uds' }, (p.cambio >= 0 ? '▲ ' : '▼ ') + Math.round(Math.abs(p.cambio) * 100) + ' %');
    const fila = (p, i) => h('div.mv-fila', { 'data-producto': p.producto, onclick: p.id ? () => { location.hash = '#/productos/' + p.id; } : null, style: p.id ? { cursor: 'pointer' } : null },
      h('span.mv-pos', medalla(i)),
      h('div.mv-quien', h('b', p.producto), h('small.muted', num(p.pedidos) + ' pedido' + (p.pedidos === 1 ? '' : 's') + (p.canalPrincipal ? ' · sobre todo ' + p.canalPrincipal : '') + (p.ultima ? ' · última ' + fdate(p.ultima) : ''))),
      h('div.mv-barra', h('i', { style: { width: Math.max(1, valor(p) / max * 100) + '%' } })),
      h('div.mv-num', h('b', num(p.unidades) + ' uds'), h('small', eur(p.ingresos)), cambio(p)),
      costes ? h('div.mv-num', p.sinCoste ? h('small.warn-t', { title: p.sinCoste + ' pedido(s) sin coste del producto: su beneficio no se inventa' }, 'sin coste') : h('b' + (p.beneficio < 0 ? '.bad-t' : ''), eur(p.beneficio)), h('small.muted', 'margen ' + pc(p.margen))) : null);
    const sinCoste = R.lista.filter(p => p.sinCoste).length;
    mount(box,
      h('div.grid.g4.kpis', [['Unidades vendidas', num(R.total.unidades)], ['Pedidos', num(R.total.pedidos)], can('informes.ver') ? ['Dinero que entra', eur(R.total.ingresos)] : null, ['Productos distintos', num(R.lista.length)]].filter(Boolean)
        .map(x => h('div.kpi', { style: { cursor: 'default' } }, h('span.n', x[1]), h('span.l', x[0])))),
      h('div.card', h('div.card-h', h('h3', ORDEN.find(x => x[0] === st.orden)[1]), a ? h('span.tiny.muted', 'del ' + fdate(a) + ' al ' + fdate(b) + (R.antesDesde ? ' · ▲▼ frente al ' + fdate(R.antesDesde) + ' – ' + fdate(R.antesHasta) : '')) : null),
        h('div.mv-lista', R.lista.slice(0, 50).map(fila)),
        R.lista.length > 50 ? h('p.tiny.muted', 'Y ' + (R.lista.length - 50) + ' productos más con menos ventas.') : null,
        costes && sinCoste ? h('p.small.warn-t', '⚠️ ' + sinCoste + ' producto(s) tienen pedidos sin coste: su beneficio y su margen no se calculan (se pone el coste en Productos).') : null));
  }
  draw();
  return { update: draw };
}
