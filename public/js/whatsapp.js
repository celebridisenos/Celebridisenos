// ================= Pedido por WhatsApp (v1.5) · se carga SOLO al terminar un pedido sin pago online =================
// El pedido ya está registrado y apartado 48 h. Aquí se enseña el siguiente paso: escribir por WhatsApp con el nº de pedido.
export function graciasWa(d, token, C, D) {
  const { h, eur, varTxt, waLink } = D, forma = d.metodo === 'efectivo' ? 'en efectivo' : 'por Bizum';
  const msg = 'Hola, acabo de hacer el pedido ' + d.id + ' en la web:\n' + d.lineas.map(l => '· ' + l.cant + ' × ' + l.nombre + varTxt(l.variante)).join('\n') + '\nEnvío: ' + d.envio + '\nTotal: ' + eur(d.totalCent) + '\nPagaré ' + forma + '. ¿Lo confirmamos?';
  const wa = waLink(C.config, msg);
  return [h('div.grande', '💬'), h('h1', '¡Pedido registrado!'), h('p', 'Pedido ', h('b', d.id), ' · ' + eur(d.totalCent) + ' · pago ' + forma),
    h('div.caja.texto', h('b', 'Último paso: confírmalo por WhatsApp'), h('p', 'Tu pedido está apartado durante 48 horas. Escríbenos con el botón y acordamos la entrega y el pago. Hasta entonces no has pagado nada.'),
      wa ? h('a.btn.wa', { href: wa, target: '_blank', rel: 'noopener' }, '💬 Confirmar por WhatsApp') : null),
    h('div.caja.texto', d.lineas.map(l => h('div.fila', h('span', l.cant + ' × ' + l.nombre + varTxt(l.variante)), h('b', eur(l.totalCent)))), d.descuentoCent ? h('div.fila', h('span', '✨ Descuento de la promoción'), h('b.ahorro', '−' + eur(d.descuentoCent))) : null, h('div.fila', h('span', 'Envío: ' + d.envio), h('b', eur(d.envioCent)))),
    h('div.caja.texto', h('b', '📦 Guarda este enlace'), h('p', 'Aquí verás en qué punto está tu pedido.'), h('a.btn', { href: '/seguimiento?p=' + token }, 'Seguir mi pedido')),
    h('p', h('a.btn', { href: '/' }, 'Seguir mirando'))];
}
