// ================= v14.1 · 📬 BANDEJA DE VENTAS: los correos de TODAS tus cuentas de Vinted, Wallapop… en un sitio =================
// El servidor lee del Gmail del programa los avisos de las plataformas (cada cuenta los reenvía allí) y aquí salen juntos:
// venta, mensaje, oferta, reserva o envío, de qué plataforma y de qué cuenta. Una venta se convierte en pedido con un botón
// (ya con su plataforma, su cuenta y, si el correo lo dice, el producto). Nada se crea solo: tú decides.
import { h, mount, btn, toast, ago, fdt, sel } from '../ui.js';
import { S, can, api, upsertLocal, emit, byId, pull } from '../store.js';
import { go } from '../app.js';
import { cuentasVenta, textoCuenta, emojiCuenta } from '../cuentas.js';

const CL = window.CL;
const TIPOS = [['todo', 'Todo'], ['venta', '💶 Ventas'], ['mensaje', '💬 Mensajes'], ['oferta', '🏷️ Ofertas'], ['reserva', '📌 Reservas'], ['envio', '📦 Envíos'], ['aviso', '🔔 Otros']];
const TIPO_I = { venta: '💶', mensaje: '💬', oferta: '🏷️', reserva: '📌', envio: '📦', aviso: '🔔' };
const TIPO_T = { venta: 'Venta', mensaje: 'Mensaje', oferta: 'Oferta', reserva: 'Reserva', envio: 'Envío', aviso: 'Aviso' };
let filtro = 'todo', soloPend = true, cuentaF = '';
const TANDA = 40; // v16.2 · VELOCIDAD: se pintan de 40 en 40 (con cientos de correos a la vez, el ratón y el scroll iban a tirones)
export const pendientesBandeja = () => (S.t.correosPlat || []).filter(r => r.estado !== 'hecho').length;

export function render(el, params) {
  let foco = params && params[0] || '';
  const raiz = h('div.bz');
  el.append(h('div.page-head', h('div', h('h1', '📬 Bandeja de ventas'), h('div.muted.small', 'Los correos de todas tus cuentas de Vinted, Wallapop… juntos')),
    h('div.right.row', can('config.editar') ? btn('↻ Revisar ahora', async ev => { const b = ev.currentTarget; b.disabled = true; try { const r = await api('plataformas.revisar', {}); await pull(); toast(r.error ? '⚠️ ' + r.error : r.nuevos ? r.nuevos + ' correo(s) nuevo(s)' : 'Nada nuevo en el correo', r.error ? 'bad' : 'ok', 6000); } catch (e) { toast(e.message, 'bad'); } b.disabled = false; }, { cls: 'ghost' }) : null,
      can('config.editar') ? btn('➕ Conectar una cuenta', () => asistente(), { cls: 'primary' }) : null,
      can('config.editar') ? btn('⚙️ Configurar', () => go('config/plataformas'), { cls: 'ghost' }) : null)), raiz);
  // v15.1 · asistente de 4 pasos (siguiente → terminado)
  const asistente = async () => { const AC = await import('../asistente_correo.js'); if (await AC.abrirAsistenteCorreo()) { await pull().catch(() => { }); pinta(); } };
  const marcar = async (r, estado, pedidoId) => {
    try { const x = await api('correos.marcar', { id: r.id, estado, pedidoId }); upsertLocal('correosPlat', x.row); emit(); }
    catch (e) { toast(e.message, 'bad'); }
  };
  const crearPedido = async r => {
    const P = await import('./pedidos.js');
    const cu = cuentasVenta().find(c => textoCuenta(c) === r.cuenta);
    const canal = (S.cfg.pedidos.canales || []).find(c => CL.norm(c) === CL.norm(cu ? cu.plataforma : r.plataforma)) || '';
    const prod = r.producto ? (S.t.productos.find(p => CL.norm(p.nombre) === CL.norm(r.producto)) || null) : null;
    P.orderForm({ canal, cuenta: r.cuenta || '', producto: prod ? prod.nombre : (r.producto || ''), notas: 'Venta avisada por correo: «' + r.asunto + '»' }, true, { alCrear: o => marcar(r, 'hecho', o.id) });
  };
  let limite = TANDA, pintado = '';
  // lo que hay que enseñar, resumido: si no cambia, NO se vuelve a dibujar la lista en cada sincronización
  const firma = () => [filtro, soloPend, cuentaF, limite, foco, !!(S.cfg.plataformas || {}).activo, (S.t.correosPlat || []).map(r => r.id + (r.estado || '') + (r.pedidoId || '')).join('|')].join('#');
  function pinta() {
    pintado = firma();
    const todos = (S.t.correosPlat || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const cuentas = [...new Set(todos.map(r => r.cuenta || r.plataforma))].filter(Boolean);
    const vis = todos.filter(r => (filtro === 'todo' || r.tipo === filtro) && (!soloPend || r.estado !== 'hecho' || r.id === foco) && (!cuentaF || (r.cuenta || r.plataforma) === cuentaF));
    const cfgP = S.cfg.plataformas || {};
    const cuentaSel = sel([{ v: '', t: 'Todas las cuentas' }].concat(cuentas.map(c => ({ v: c, t: emojiCuenta(c) + ' ' + c }))), cuentaF);
    cuentaSel.setAttribute('aria-label', 'Cuenta'); cuentaSel.onchange = () => { cuentaF = cuentaSel.value; limite = TANDA; pinta(); };
    mount(raiz,
      !cfgP.activo ? h('div.card.bz-off', h('h3', '📭 La bandeja aún no está encendida'),
        h('p.small', 'Para que lleguen aquí los avisos de todas tus cuentas (ventas, mensajes, ofertas…) hay que hacerlo una vez: cada cuenta reenvía sus correos de Vinted/Wallapop al Gmail del programa, y el programa los lee solo cada 5 minutos.'),
        can('config.editar') ? btn('📬 Conectar una cuenta paso a paso', () => asistente(), { cls: 'primary' }) : h('p.small.muted', 'Pídeselo a quien administra el programa.')) : null,
      h('div.bz-filtros', TIPOS.map(([k, t]) => { const n = todos.filter(r => r.estado !== 'hecho' && (k === 'todo' || r.tipo === k)).length;
        return h('button.chip' + (filtro === k ? '.on' : ''), { type: 'button', 'data-tipo': k, onclick: () => { filtro = k; limite = TANDA; pinta(); } }, t, n ? h('span.c', String(n)) : null); }),
        cuentas.length > 1 ? cuentaSel : null,
        h('label.check.tiny', h('input', { type: 'checkbox', checked: soloPend, onchange: e => { soloPend = e.target.checked; pinta(); } }), 'Solo pendientes')),
      vis.length ? h('div.bz-lista', vis.slice(0, Math.max(limite, foco ? vis.findIndex(r => r.id === foco) + 1 : 0)).map(r => {
        const o = r.pedidoId ? byId('pedidos', r.pedidoId) : null;
        return h('div.bz-item.' + (r.tipo || 'aviso') + '.' + (r.estado === 'hecho' ? 'hecho' : 'nuevo') + (r.id === foco ? '.foco' : ''), { 'data-id': r.id },
          h('div.bz-ic', TIPO_I[r.tipo] || '🔔'),
          h('div.grow', h('div.bz-cab', h('b', TIPO_T[r.tipo] || 'Aviso'), h('span.bz-cuenta', (r.emoji || '') + ' ' + (r.cuenta || r.plataforma)), !r.cuenta && r.correoCuenta ? h('span.tiny.muted', r.correoCuenta) : null, h('span.tiny.muted', '· ' + ago(r.fecha)), r.verificado ? null : h('span.tiny.warn-t', '· remitente sin verificar')),
            h('div', r.asunto), r.texto ? h('div.small.muted', r.texto) : null,
            r.producto ? h('div.small', '🧩 Producto: ', h('b', r.producto)) : null,
            h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } },
              r.tipo === 'venta' && !o && can('pedidos.crear') ? btn('➕ Crear el pedido', () => crearPedido(r), { cls: 'primary sm' }) : null,
              o ? btn('Ver pedido nº ' + o.numero, () => go('pedidos/' + o.id), { cls: 'sm' }) : null,
              can('pedidos.editar') ? (r.estado === 'hecho' ? btn('↩️ Pendiente', () => marcar(r, 'nuevo'), { cls: 'sm ghost' }) : btn('✓ Hecho', () => marcar(r, 'hecho'), { cls: 'sm ghost' })) : null,
              r.estado === 'hecho' && r.hechoPor ? h('span.tiny.muted', 'Hecho por ' + r.hechoPor) : null)));
      })) : h('div.card', h('p.muted', todos.length ? 'Nada pendiente con este filtro. 🎉' : 'Aún no ha llegado ningún correo de las plataformas.')),
      vis.length > limite ? h('div.pager', btn('Mostrar ' + Math.min(TANDA, vis.length - limite) + ' más (quedan ' + (vis.length - limite) + ')', () => { limite += TANDA; pinta(); })) : null);
    if (foco) { const x = raiz.querySelector('.bz-item.foco'); if (x) { x.scrollIntoView({ block: 'center' }); setTimeout(() => { foco = ''; }, 4000); } }
  }
  pinta();
  return { update: () => { if (firma() !== pintado) pinta(); }, params: p => { foco = p && p[0] || ''; pinta(); } };
}
