// ================= v13.10 · 💬 RESPUESTAS RÁPIDAS =================
// El manual del equipo para contestar igual de bien a cualquier cliente: buscas, eliges el canal (WhatsApp, Instagram o
// correo), y la respuesta sale con los datos de la empresa y, si eliges un pedido, con los del cliente. Un clic: copiada.
import { h, mount, btn, toast, inp, sel, copyText } from '../ui.js';
import { S, byId } from '../store.js';
import { NORMAS, CATEGORIAS, RESPUESTAS, preparar } from '../respuestas_lib.js';

const CL = window.CL;
const eurTxt = v => (Number(v) || 0) ? (Math.round(Number(v) * 100) / 100).toFixed(2).replace('.', ',') + ' €' : '';
export function datosBase() {
  const c = S.cfg || {}, e = c.empresa || {}, t = c.tienda || {}, pg = ((c.envio || {}).tarjeta || {}).pagina || {};
  const ig = String(t.instagram || pg.instagram || '').replace(/^@?/, '');
  return { tienda: e.nombre || 'CelebriDiseños', web: t.url || e.web || '', instagram: ig ? '@' + ig : '', plazo: (c.pedidos || {}).plazoDias || 7, firma: (S.me && S.me.nombre || '').split(' ')[0] };
}
export function datosPedido(o) {
  if (!o) return {};
  const lo = o;
  return { cliente: String(o.cliente || '').split(/\s+/)[0], producto: o.producto || '', pedido: o.numero || '', seguimiento: lo.seguimiento || '', transportista: lo.envio || (lo.etiquetaEnvio && lo.etiquetaEnvio.transportista) || '', precio: eurTxt(CL.orderTotal(o)) };
}
export function render(el) {
  let canal = (() => { try { return localStorage.getItem('cd.rapidas.canal') || 'whatsapp'; } catch (e) { return 'whatsapp'; } })(), cat = '', q = '';
  const pedidos = (S.t.pedidos || []).slice().sort((a, b) => String(b.creado || '').localeCompare(String(a.creado || ''))).slice(0, 150);
  const selPed = sel([{ v: '', t: '— Sin pedido (opcional) —' }].concat(pedidos.map(o => ({ v: o.id, t: 'nº ' + o.numero + ' · ' + o.cliente + ' · ' + o.producto }))), '', { 'aria-label': 'Pedido' });
  const nombre = inp({ placeholder: 'Nombre del cliente (opcional)', 'aria-label': 'Nombre del cliente' });
  const buscar = inp({ type: 'search', placeholder: 'Buscar: envío, roto, precio, regalo…', 'aria-label': 'Buscar respuesta' });
  const canales = h('div.seg.rq-canal'), chips = h('div.row.wrap.rq-chips', { style: { gap: '6px' } }), lista = h('div.rq-lista');
  const datos = () => { const o = selPed.value ? byId('pedidos', selPed.value) : null; const d = Object.assign(datosBase(), datosPedido(o)); if (nombre.value.trim()) d.cliente = nombre.value.trim(); return d; };
  const telefono = () => { const o = selPed.value ? byId('pedidos', selPed.value) : null; const c = o && (byId('clientes', o.clienteId) || (S.t.clientes || []).find(x => CL.norm(x.nombre) === CL.norm(o.cliente))); return c && c.telefono && c.telefono !== '•••' ? String(c.telefono).replace(/[^\d+]/g, '') : ''; };
  const pintaCanales = () => mount(canales, [['whatsapp', '🟢 WhatsApp'], ['instagram', '📸 Instagram / Vinted / Wallapop'], ['correo', '✉️ Correo']].map(([k, t]) => h('button' + (canal === k ? '.on' : ''), { type: 'button', 'data-canal': k, onclick: () => { canal = k; try { localStorage.setItem('cd.rapidas.canal', k); } catch (e) { } pintaCanales(); pinta(); } }, t)));
  const pintaChips = () => mount(chips, [['', 'Todas']].concat(CATEGORIAS).map(([k, t]) => h('button.chip' + (cat === k ? '.on' : ''), { type: 'button', 'data-cat': k, onclick: () => { cat = k; pintaChips(); pinta(); } }, t)));
  function pinta() {
    const d = datos(), qq = CL.norm(q), tel = telefono();
    const items = RESPUESTAS.filter(r => (!cat || r[0] === cat) && (!qq || CL.norm(r[1] + ' ' + r[2]).includes(qq)));
    if (!items.length) return mount(lista, h('p.muted', 'No hay respuestas con esa palabra. Prueba con otra (envío, roto, precio…).'));
    mount(lista, CATEGORIAS.filter(c => items.some(r => r[0] === c[0])).map(([k, t]) => h('div.rq-grupo', h('h3', t), items.filter(r => r[0] === k).map(r => {
      const txt = preparar(r[2], d, canal), faltan = (txt.match(/\[[^\]]+\]/g) || []).length;
      return h('div.card.flat.rq-op', h('div.row', { style: { gap: '8px', alignItems: 'baseline' } }, h('b.grow', r[1]), faltan ? h('span.tiny.warn-t', '✏️ ' + faltan + ' hueco' + (faltan > 1 ? 's' : '') + ' por completar') : null),
        h('pre.rq-txt', txt),
        h('div.row.wrap', { style: { gap: '6px' } },
          btn('Copiar', () => { copyText(txt); }, { cls: 'sm primary', icon: 'copy' }),
          canal === 'whatsapp' && tel ? btn('Abrir en WhatsApp', () => window.open('https://wa.me/' + tel.replace(/^\+/, '') + '?text=' + encodeURIComponent(txt), '_blank', 'noopener'), { cls: 'sm ghost' }) : null,
          canal === 'correo' ? btn('Abrir en el correo', () => { location.href = 'mailto:?subject=' + encodeURIComponent((d.tienda || '') + (d.pedido ? ' · pedido ' + d.pedido : '')) + '&body=' + encodeURIComponent(txt); }, { cls: 'sm ghost' }) : null));
    }))));
  }
  selPed.onchange = pinta; nombre.oninput = pinta; buscar.oninput = () => { q = buscar.value.trim(); pinta(); };
  const descargar = async () => {
    const D = await import('../docventa.js'), d = datosBase(), b = [];
    b.push(['Manual de respuestas · ' + d.tienda, { b: true, sz: 40, after: 60 }], ['Cómo contestamos a los clientes (WhatsApp, Instagram, plataformas y correo). Actualizado el ' + new Date().toLocaleDateString('es-ES') + '.', { color: '777777', sz: 18, after: 240 }]);
    b.push(['NORMAS DEL EQUIPO', { b: true, sz: 28, color: '5B21B6', after: 100 }]);
    NORMAS.forEach((n, i) => b.push([(i + 1) + '. ' + preparar(n, d), { after: 60 }]));
    b.push(['Los huecos entre corchetes [así] se completan antes de enviar.', { color: '777777', after: 240 }]);
    CATEGORIAS.forEach(([k, t]) => {
      b.push([t.replace(/^\S+\s/, '').toUpperCase(), { b: true, sz: 28, color: '5B21B6', after: 100 }]);
      RESPUESTAS.filter(r => r[0] === k).forEach(r => { b.push([r[1], { b: true, after: 30 }]); b.push([preparar(r[2], Object.assign({}, d, { cliente: '[nombre]' }), 'whatsapp'), { after: 160 }]); });
    });
    const F = await import('../files.js');
    F.download(D.docxDe(b), 'Manual de respuestas - ' + String(d.tienda).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w .-]+/g, '_') + '.docx');
    toast('📄 Manual descargado (Word)', 'ok');
  };
  el.append(h('div.page-head', h('div.grow', h('h1', '💬 Respuestas rápidas'), h('p.small.muted', { style: { margin: '2px 0 0' } }, 'El manual del equipo: busca, copia y pega. Con el pedido elegido se rellenan solos el nombre, el producto y el seguimiento.')),
    btn('📄 Descargar manual (Word)', descargar, { cls: 'ghost' })),
    h('details.more.rq-normas', h('summary', '📏 Normas del equipo para contestar (léelas una vez)'), h('div.in', h('ol', NORMAS.map(n => h('li', preparar(n, datosBase())))))),
    h('div.card.rq-filtros', canales, h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } }, h('div.grow', { style: { minWidth: '220px' } }, selPed), h('div', { style: { minWidth: '200px' } }, nombre)),
      h('div', { style: { marginTop: '10px' } }, buscar), h('div', { style: { marginTop: '10px' } }, chips)),
    lista);
  pintaCanales(); pintaChips(); pinta();
  return { update: () => { } };
}
