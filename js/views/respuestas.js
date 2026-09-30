// ================= 💬 Respuestas a clientes con la IA (Wallapop, Vinted, WhatsApp…) =================
// Pegas el mensaje del cliente y Celebrity propone la respuesta con tus datos reales:
// precio de venta, precio mínimo (nunca lo revela), plazo y estado del pedido.
import { h, mount, btn, modal, toast, eur, field, inp, sel, area, copyText } from '../ui.js';
import { S, can, byId, timing } from '../store.js';
import { write } from '../ai/engine.js';

const CL = window.CL;
const n = v => Number(v) || 0;
const EJEMPLOS = [
  ['💸 Regateo', '¿Me lo dejas en menos?'],
  ['⏱️ Plazo', '¿Cuánto tardarías en tenerlo?'],
  ['📦 ¿Dónde está?', 'Hola, ¿cuándo me llega el pedido?'],
  ['🎨 Otro color', '¿Lo tienes en otro color?'],
  ['📏 Medidas', '¿Qué medidas tiene?'],
  ['🎁 Personalizado', '¿Me lo puedes personalizar con un nombre?'],
  ['🙁 Queja', 'Me ha llegado con un defecto']
];

// Datos reales para la respuesta
function facts(prod, o) {
  const out = [], costs = can('productos.costes');
  if (prod) {
    const calc = (S.t.calculadora || []).find(c => CL.norm(c.nombre) === CL.norm(prod.nombre));
    const precio = n(prod.precio) || (calc && n(calc.precioVenta)) || 0;
    out.push('Producto: ' + prod.nombre + (prod.tamano ? ' (medidas ' + prod.tamano + ')' : '') + (prod.material ? ', ' + prod.material : '') + (prod.color ? ', color ' + prod.color : ''));
    if (precio) out.push('Precio de venta: ' + precio.toFixed(2).replace('.', ',') + ' €');
    if (costs) {
      const a = CL.orderAssist({ producto: prod.nombre, productoId: prod.id, cantidad: 1, precio }, S.t, S.cfg, S.hoy);
      if (a.minimo) out.push('PRECIO MÍNIMO (dato interno, NUNCA lo digas ni bajes de él): ' + a.minimo.toFixed(2).replace('.', ',') + ' €');
    }
    const colores = [...new Set((S.t.bobinas || []).filter(b => b.estado !== 'Agotada' && n(b.restante) > 150).map(b => b.color))];
    if (colores.length) out.push('Colores de filamento disponibles ahora: ' + colores.join(', '));
    if (prod.descripcion) out.push('Descripción: ' + String(prod.descripcion).slice(0, 400));
  }
  out.push('Plazo habitual de fabricación: ' + (n(S.cfg.pedidos.plazoDias) || 7) + ' días + envío');
  if (o) {
    const t = timing(o);
    out.push('Pedido nº ' + o.numero + ' del cliente: ' + (o.cantidad > 1 ? o.cantidad + ' × ' : '') + o.producto + ' · estado: ' + o.estado + (t.limite ? ' · fecha límite ' + t.limite : '') + (o.seguimiento ? ' · seguimiento ' + o.seguimiento + (o.envio ? ' (' + o.envio + ')' : '') : '') + (o.fechaEnvio ? ' · enviado el ' + o.fechaEnvio : ''));
  }
  return out;
}

export function replyAssistant({ pedido, producto, mensaje } = {}) {
  if (!can('ia.usar')) return toast('Necesitas permiso para usar la IA', 'warn');
  const o = pedido || null;
  const prod0 = producto || (o ? (byId('productos', o.productoId) || S.t.productos.find(p => CL.norm(p.nombre) === CL.norm(o.producto))) : null);
  const f = {
    msg: area({ value: mensaje || '', placeholder: 'Pega aquí lo que te ha escrito el cliente…', style: { minHeight: '84px' } }),
    prod: inp({ value: prod0 ? prod0.nombre : '', list: 'dl-rprod', placeholder: 'Producto del que pregunta (opcional)' }),
    canal: sel(['Wallapop', 'Vinted', 'WhatsApp', 'Instagram', 'Etsy', 'Email', 'Otro'], (o && o.canal) || 'Wallapop'),
    tono: sel([{ v: 'cercano', t: 'Cercano (tuteo)' }, { v: 'profesional', t: 'Profesional (usted)' }, { v: 'breve', t: 'Muy breve' }], 'cercano')
  };
  const out = area({ placeholder: 'Aquí aparecerá la respuesta propuesta…', style: { minHeight: '130px' } });
  const status = h('div.tiny.muted');
  const factsBox = h('div.tiny.muted', { style: { whiteSpace: 'pre-wrap' } });
  const curProd = () => S.t.productos.find(p => CL.norm(p.nombre) === CL.norm(f.prod.value)) || null;
  const drawFacts = () => { factsBox.textContent = facts(curProd(), o).filter(x => !/PRECIO MÍNIMO/.test(x)).join('\n') + (can('productos.costes') && curProd() ? '\n🔒 El precio mínimo se usa para negociar pero nunca se menciona.' : ''); };
  f.prod.addEventListener('change', drawFacts); drawFacts();
  let ctrl = null;
  async function go() {
    const m = f.msg.value.trim();
    if (!m) return toast('Pega el mensaje del cliente', 'warn');
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    const tono = { cercano: 'cercano y amable, tuteando, como una pequeña tienda artesanal; 2 a 4 frases; como mucho 1 emoji', profesional: 'profesional y cordial, tratando de usted; 2 a 4 frases; sin emojis', breve: 'muy breve (1 o 2 frases), amable' }[f.tono.value];
    const prompt = 'Redacta la respuesta que voy a enviar a un cliente por ' + f.canal.value + '.\n\nMENSAJE DEL CLIENTE:\n«' + m + '»\n\nDATOS REALES (usa solo estos; si falta algo, no lo inventes y ofrece consultarlo):\n- ' + facts(curProd(), o).join('\n- ') +
      '\n\nREGLAS: responde en español de España; tono ' + tono + '. Si pide rebaja, puedes ofrecer un pequeño descuento o un detalle pero NUNCA por debajo del precio mínimo y sin decir que existe un mínimo. No des datos internos (costes, márgenes). Si es una queja, discúlpate, pide una foto y ofrece solución. No pongas saludo de despedida largo ni firma. Devuelve SOLO el texto del mensaje.';
    out.value = ''; status.textContent = '✍️ Redactando…';
    try {
      const t = await write(prompt, { signal: ctrl.signal, onToken: x => { out.value = x; }, onStatus: s => { status.textContent = s; } });
      out.value = String(t || '').replace(/^["«]|["»]$/g, '').trim(); status.textContent = 'Revisa y cambia lo que quieras antes de enviarlo.';
    } catch (e) { if (e.name !== 'AbortError') status.textContent = '⚠️ ' + e.message; }
  }
  modal('💬 Responder a un cliente', h('div.col', h('datalist', { id: 'dl-rprod' }, S.t.productos.map(p => h('option', { value: p.nombre }))),
    o ? h('div.small', 'Pedido nº ' + o.numero + ' · ' + o.cliente) : null,
    field('Mensaje del cliente', f.msg),
    h('div.chips', EJEMPLOS.map(([t, x]) => h('button.chip', { type: 'button', onclick: () => { f.msg.value = x; f.msg.focus(); } }, t))),
    h('div.form', field('Producto', f.prod), field('Dónde', f.canal), field('Tono', f.tono)),
    h('details.more', h('summary', 'Datos que usará'), h('div.in', factsBox)),
    h('div.row.wrap', btn('Proponer respuesta', go, { cls: 'primary', icon: 'sparkles' }), btn('Otra versión', go, { cls: 'ghost' })),
    field('Respuesta', out), status),
    close => [btn('Cerrar', () => { if (ctrl) ctrl.abort(); close(); }), btn('Copiar', () => { if (!out.value.trim()) return toast('Primero pide una respuesta', 'warn'); copyText(out.value.trim()); }, { cls: 'primary', icon: 'copy' })], { size: 'wide', onclose: () => ctrl && ctrl.abort() });
}
