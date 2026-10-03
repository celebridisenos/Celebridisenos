// ================= Seguimiento del pedido (v1.4) · se carga solo en /seguimiento =================
const PASOS = [['recibido', '🧾', 'Recibido', 'Hemos recibido tu pedido y tu pago.'], ['imprimiendo', '🖨️', 'Fabricando', 'Tu pieza se está haciendo.'], ['preparando', '📦', 'Preparando', 'Revisándola y empaquetándola con cuidado.'], ['enviado', '🚚', 'Enviado', 'Tu paquete ya va de camino.'], ['entregado', '🏠', 'Entregado', '¡Entregado! Esperamos que te guste.']];
function lineaTiempo(v, C, D) {
  const { h, waLink } = D;
  if (v.estado === 'whatsapp') return h('div.aviso.warn', 'Tu pedido está registrado y apartado. Falta confirmarlo con nosotros por WhatsApp y acordar el pago (Bizum o efectivo). En cuanto lo confirmemos, aquí verás cómo avanza.', waLink(C.config, 'Hola, sobre mi pedido ' + v.id) ? h('p', h('a.btn.wa', { href: waLink(C.config, 'Hola, quiero confirmar mi pedido ' + v.id), target: '_blank', rel: 'noopener' }, '💬 Confirmar por WhatsApp')) : null);
  if (v.estado === 'cancelado') return h('div.aviso.mal', 'Este pedido se ha cancelado y no se ha cobrado nada.');
  if (v.estado === 'pendiente_pago') return h('div.aviso.warn', 'Todavía no hemos recibido el pago de este pedido. Si ya pagaste, puede tardar unos minutos en aparecer.');
  if (v.estado === 'expirado' || v.estado === 'fallido') return h('div.aviso.mal', 'El pago de este pedido no se completó, así que no se ha cobrado ni preparado nada.');
  const idx = Math.max(0, PASOS.findIndex(x => x[0] === v.fase)), actual = PASOS[idx];
  const wa = waLink(C.config, 'Hola, sobre mi pedido ' + v.id);
  const copiar = () => { try { navigator.clipboard.writeText(v.codigo).then(() => { b.textContent = '✓ Copiado'; }); } catch (e) { } };
  const b = h('button.btn.sm', { type: 'button', onclick: copiar }, 'Copiar código');
  return h('div.seg',
    h('div.seg-cab', h('span.seg-ic', actual[1]), h('div', h('b', actual[2]), h('p', actual[3]))),
    h('ol.seg-pasos', { 'aria-label': 'Progreso del pedido' }, PASOS.map((x, i) => h('li' + (i < idx ? '.hecho' : i === idx ? '.ahora' : ''), { 'aria-current': i === idx ? 'step' : null }, h('span.pt', i < idx ? '✓' : x[1]), h('span.pn', x[2])))),
    v.codigo ? h('div.caja.seg-env', h('div', h('small', (v.transportista || 'Transportista')), h('b.cod', v.codigo)), h('div.botones', b, v.url ? h('a.btn.acc.sm', { href: v.url, target: '_blank', rel: 'noopener noreferrer' }, 'Ver en la web del transportista') : null)) : (v.fase === 'enviado' ? h('p.muted', 'Tu paquete ya ha salido' + (v.transportista ? ' con ' + v.transportista : '') + '. En cuanto tengamos el código de seguimiento aparecerá aquí.') : null),
    wa ? h('p', h('a.btn.wa', { href: wa, target: '_blank', rel: 'noopener' }, '💬 ¿Dudas con tu pedido?')) : null);
}
function vistaPedido(v, C, D) {
  const { h, varTxt } = D;
  return h('div.seg-wrap', h('h1', 'Tu pedido ', h('span.num', v.id)), h('p.muted', 'Pedido del ' + new Date(v.creado).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) + (v.envio ? ' · ' + v.envio : '')),
    lineaTiempo(v, C, D),
    h('div.caja.texto', h('b', 'Qué incluye'), v.lineas.map(l => h('div.fila', h('span', l.cant + ' × ' + l.nombre + varTxt(l.variante))))));
}
export async function seguimiento(C, D) {
  const { h, $, params } = D;
  const main = $('#main'), token = (params.get('p') || '').replace(/[^0-9a-f]/g, '');
  document.title = 'Seguir mi pedido · ' + ((C.config.tienda || {}).nombre || 'CelebriDiseños');
  const out = h('div.seg-out');
  const num = h('input', { type: 'text', name: 'pedido', placeholder: 'W-20261003-A1B2C3', autocomplete: 'off', autocapitalize: 'characters', maxlength: 24, required: true, 'aria-label': 'Número de pedido' });
  const mail = h('input', { type: 'email', name: 'email', placeholder: 'El email con el que compraste', autocomplete: 'email', maxlength: 120, required: true, 'aria-label': 'Email de la compra' });
  const go = h('button.btn.pri.grande', { type: 'submit' }, 'Ver mi pedido');
  const form = h('form.seg-form', { onsubmit: async ev => {
    ev.preventDefault(); go.disabled = true; out.replaceChildren(h('p.cargando', 'Buscando tu pedido…'));
    try {
      const r = await fetch('/api/seguimiento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedido: num.value, email: mail.value }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.seguimiento) { form.classList.add('oculto'); out.replaceChildren(vistaPedido(d.seguimiento, C, D)); } else out.replaceChildren(h('div.aviso.mal', d.mensaje || 'No se pudo consultar. Inténtalo de nuevo en unos minutos.'));
    } catch (e) { out.replaceChildren(h('div.aviso.mal', 'No hay conexión. Inténtalo de nuevo.')); }
    go.disabled = false;
  } }, h('label', h('span', 'Número de pedido'), num), h('label', h('span', 'Email de la compra'), mail), go, h('p.tiny.muted', 'El número empieza por W- y lo tienes en la página de gracias y en tu recibo.'));
  main.replaceChildren(h('section.seg-intro', h('h1', '¿Dónde está mi pedido?'), h('p.muted', 'Consulta en qué punto está y, cuando salga, el código de seguimiento.')), form, out);
  if (token.length === 32) {
    form.classList.add('oculto'); out.replaceChildren(h('p.cargando', 'Buscando tu pedido…'));
    const r = await fetch('/api/pedido/' + token); const d = await r.json().catch(() => ({}));
    if (r.ok && d.seguimiento) out.replaceChildren(vistaPedido(d.seguimiento, C, D));
    else { form.classList.remove('oculto'); out.replaceChildren(h('div.aviso.mal', 'Este enlace no es válido. Usa tu número de pedido y tu email.')); }
  }
}

