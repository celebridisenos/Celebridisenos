// ================= Textos legales (v1.5) · se cargan SOLO en sus páginas (la portada no pesa más) =================
export function legal(C, doc, X) {
  const { h, $, pend } = X;
  // (cada uso crea su propio elemento: un mismo nodo no puede estar en dos sitios)
  const L = C.config.legal || {}, t = (C.config.tienda || {}).nombre || 'CelebriDiseños';
  const D = (() => { const email = () => L.email ? h('a', { href: 'mailto:' + L.email }, L.email) : pend('', 'email de contacto'), titular = () => pend(L.titular, 'nombre o razón social'), nif = () => pend(L.nif, 'NIF'), dir = () => pend(L.direccion, 'domicilio'); return {
    'aviso-legal': ['Aviso legal', [
      h('p', 'En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), estos son los datos del titular() de esta web:'),
      h('ul', h('li', 'Titular: ', titular()), h('li', 'NIF: ', nif()), h('li', 'Domicilio: ', dir()), h('li', 'Email: ', email()), L.telefono ? h('li', 'Teléfono: ' + L.telefono) : null, L.registro ? h('li', 'Datos registrales: ' + L.registro) : null),
      h('h2', 'Uso de la web'), h('p', 'Esta web es la tienda online de ' + t + '. Los textos, fotos y diseños son propiedad de su titular() o se usan con permiso; no se pueden copiar sin autorización.'),
      h('h2', 'Responsabilidad'), h('p', 'Trabajamos para que la información sea correcta y esté actualizada. Si ves un error, avísanos y lo corregimos.')]],
    privacidad: ['Política de privacidad', [
      h('h2', 'Quién trata tus datos'), h('p', 'Responsable: ', titular(), ' · NIF: ', nif(), ' · Contacto: ', email(), '.'),
      h('h2', 'Para qué'), h('p', 'Usamos los datos que nos das al comprar (nombre, email(), teléfono y dirección) solo para preparar y enviar tu pedido, atenderte y cumplir las obligaciones legales (por ejemplo, facturación). No los vendemos ni los usamos para publicidad sin tu permiso.'),
      h('h2', 'Base legal'), h('p', 'La ejecución del contrato de compra y el cumplimiento de obligaciones legales.'),
      h('h2', 'Quién más los recibe'), h('ul', h('li', 'La empresa de transporte que elijas, para entregar el paquete.'), C.config.pago.activo ? h('li', 'Stripe, que procesa el pago en su propia página segura (nosotros nunca vemos tu tarjeta).') : null, h('li', 'Cloudflare, que aloja esta web.')),
      h('h2', 'Cuánto tiempo'), h('p', 'Los datos de envío se borran de la web 30 días después de preparar el pedido; en nuestra gestión se guardan el tiempo que exija la ley (por ejemplo, para la contabilidad).'),
      h('h2', 'Tus derechos'), h('p', 'Puedes pedir acceso, rectificación, supresión, oposición, limitación o portabilidad escribiendo a ', email(), '. Si crees que no hemos respetado tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).')]],
    cookies: ['Cookies', [
      h('p', 'Esta web no usa cookies de análisis ni de publicidad.'),
      h('p', 'Tu cesta y los datos del formulario se guardan solo en tu navegador (almacenamiento local) para que no se pierdan mientras compras. Es imprescindible para que la tienda funcione y puedes borrarlo cuando quieras desde la configuración de tu navegador.'),
      C.config.pago.activo ? h('p', 'Al pagar, se abre la página de Stripe, que usa sus propias cookies para que el pago sea seguro y evitar fraudes. Puedes consultarlas en la web de Stripe.') : null]],
    condiciones: ['Condiciones de venta', [
      h('p', 'Vendedor: ', titular(), ' · NIF: ', nif(), ' · ', dir(), ' · ', email(), '.'),
      h('h2', 'Precios'), h('p', 'Los precios incluyen el IVA. El coste del envío se muestra antes de pagar y depende del peso y del destino.'),
      h('h2', 'Cómo comprar'), h('p', C.config.pago.activo ? 'Añade productos a la cesta, rellena tus datos, elige el envío y paga en la página segura de Stripe. El pedido queda confirmado cuando el pago se completa; recibirás el recibo por email().' : 'Añade productos a la cesta, rellena tus datos, elige el envío y la forma de pago (Bizum o efectivo) y envía tu pedido. Queda apartado 48 horas; te escribimos por WhatsApp para confirmar disponibilidad, entrega y pago. El pedido queda confirmado cuando recibimos el pago.'),
      h('h2', 'Plazos'), h('p', 'Los productos en stock salen normalmente en pocos días laborables. Los que se fabrican bajo pedido indican su plazo de fabricación en la ficha. A eso se suma el plazo del transportista.'),
      h('h2', 'Derecho de desistimiento'), h('p', 'Dispones de ' + (L.devolucionesDias || '14') + ' días naturales desde la entrega para desistir sin dar explicaciones, salvo en productos confeccionados según tus especificaciones o claramente personalizados. Para ejercerlo, escríbenos a ', email(), '. Te devolveremos lo pagado (incluido el envío estándar) en un máximo de 14 días desde que nos lo comuniques; podemos esperar a recibir el producto. Los gastos de devolución corren de tu cuenta salvo que el producto sea defectuoso.'),
      h('h2', 'Garantía'), h('p', 'Los productos tienen la garantía legal de conformidad. Si un producto llega defectuoso, escríbenos con una foto y lo reparamos, lo sustituimos o te devolvemos el dinero.'),
      h('h2', 'Atención'), h('p', 'Para cualquier duda o reclamación: ', email(), C.config.whatsapp ? ' o por WhatsApp Business.' : '.')]]
  }; })()[doc];
  if (!D) return;
  document.title = D[0] + ' · ' + t;
  $('#main').replaceChildren(h('article.texto', h('h1', D[0]), D[1]));
}
