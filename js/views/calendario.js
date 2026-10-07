// ================= v17 · 🗓️ CALENDARIO DE ENTREGAS =================
// El mes entero de un vistazo: cada pedido abierto en su día límite («enviar antes de»), del color de su estado.
// Lo que va con retraso se ve en rojo; lo ya enviado, apagado con ✓ en el día en que salió. Se toca un pedido y se abre.
import { h, mount, btn } from '../ui.js';
import { S, can, timing } from '../store.js';
import { go } from '../app.js';

const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export function entregasDe(ym) { // { 'YYYY-MM-DD': [{ o, color, enviado, tarde }] }
  const out = {}, hoy = S.hoy || iso(new Date()), est = k => ((S.cfg.pedidos.estados || []).find(s => s.k === k) || {});
  (S.t.pedidos || []).forEach(o => { if (o.eliminado || o.archivado || est(o.estado).cancelled) return;
    const t = timing(o) || {}, enviado = !!est(o.estado).shipped, dia = enviado ? String(o.fechaEnvio || o.fechaEntrega || '').slice(0, 10) : (t.limite || '');
    if (!dia || dia.slice(0, 7) !== ym) return;
    (out[dia] = out[dia] || []).push({ o, color: est(o.estado).c || '#888', enviado, tarde: !enviado && dia < hoy }); });
  Object.values(out).forEach(l => l.sort((a, b) => (a.enviado - b.enviado) || String(a.o.numero).localeCompare(String(b.o.numero))));
  return out;
}
export function render(el) {
  if (!can('pedidos.ver')) { mount(el, h('div.card', h('h3', '🔒 Calendario'), h('p.muted', 'Necesitas permiso para ver los pedidos.'))); return {}; }
  let ref = new Date(); ref.setDate(1); let firma = '';
  const cuerpo = h('div.cal17'), titulo = h('h2.cal17-mes'), pie = h('div.cal17-pie');
  el.append(h('div.page-head', h('div', h('h1', '🗓️ Calendario de entregas'), h('div.muted.small', 'Cada pedido en su día límite, del color de su estado. Toca uno para abrirlo.'))),
    h('div.cal17-barra', btn('◀', () => { ref.setMonth(ref.getMonth() - 1); pinta(); }, { cls: 'sm', title: 'Mes anterior' }), titulo, btn('▶', () => { ref.setMonth(ref.getMonth() + 1); pinta(); }, { cls: 'sm', title: 'Mes siguiente' }), btn('Hoy', () => { ref = new Date(); ref.setDate(1); pinta(); }, { cls: 'sm ghost cal17-hoy' })), cuerpo, pie);
  const sig = () => (S.t.pedidos || []).map(o => o.id + (o.estado || '') + (o.version || '') + (o.fechaLimite || '')).join(',') + '|' + iso(ref) + '|' + S.hoy;
  function pinta() {
    firma = sig();
    const ym = iso(ref).slice(0, 7), E = entregasDe(ym), hoy = S.hoy || iso(new Date()), dias = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate(), hueco = (ref.getDay() + 6) % 7;
    titulo.textContent = ref.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase());
    const celdas = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => h('div.cal17-dow', d));
    for (let i = 0; i < hueco; i++) celdas.push(h('div.cal17-dia.vacio'));
    for (let d = 1; d <= dias; d++) { const f = ym + '-' + String(d).padStart(2, '0'), l = E[f] || [], abiertos = l.filter(x => !x.enviado);
      celdas.push(h('div.cal17-dia' + (f === hoy ? '.hoy' : '') + (abiertos.some(x => x.tarde) ? '.tarde' : '') + (l.length ? '.con' : ''), { 'data-dia': f },
        h('div.cal17-n', String(d), abiertos.length ? h('span', String(abiertos.length)) : null),
        l.slice(0, 4).map(x => { const b = h('button.cal17-p' + (x.enviado ? '.env' : '') + (x.tarde ? '.tarde' : ''), { type: 'button', 'data-pedido': x.o.id, title: 'nº ' + x.o.numero + ' · ' + (x.o.cliente || '') + ' · ' + (x.o.producto || '') + ' · ' + x.o.estado, onclick: () => go('pedidos/' + x.o.id) }, (x.enviado ? '✓ ' : '') + 'nº ' + x.o.numero + ' ' + String(x.o.cliente || '').split(' ')[0]); b.style.setProperty('--c', x.color); return b; }),
        l.length > 4 ? h('div.cal17-mas', '+' + (l.length - 4) + ' más') : null)); }
    mount(cuerpo, celdas);
    const todos = Object.values(E).flat(), ab = todos.filter(x => !x.enviado), tarde = ab.filter(x => x.tarde).length;
    const usados = [...new Map(ab.map(x => [x.o.estado, x.color])).entries()];
    mount(pie, h('span.cal17-res', ab.length ? ab.length + (ab.length === 1 ? ' entrega pendiente' : ' entregas pendientes') + ' este mes' + (tarde ? ' · ⚠️ ' + tarde + ' con retraso' : '') : 'Sin entregas pendientes este mes'),
      usados.map(([k, c]) => { const s = h('span.cal17-ley', h('i'), k); s.firstChild.style.background = c; return s; }));
  }
  pinta();
  return { update: () => { if (sig() !== firma) pinta(); } };
}
