# Tienda 1.5.0 · Pedidos por WhatsApp (sin pago online)

Para vender **sin Stripe**: el cliente rellena el pedido en la web, queda registrado y apartado **48 horas**, se abre WhatsApp con su
número de pedido y vosotros acordáis entrega y pago (**Bizum o efectivo**). Cuando cobras, lo pasas a «Confirmado» en el programa.

## Qué cambia para el cliente
- En la cesta y en «Finalizar compra» ya no se habla de Stripe: «Enviar mi pedido», elige **Bizum o efectivo** y acepta las condiciones.
- Pantalla «¡Pedido registrado!» con el botón **Confirmar por WhatsApp** (mensaje ya escrito con nº de pedido, productos, envío, total y forma de pago).
- «Seguir mi pedido» dice «falta confirmarlo por WhatsApp» hasta que lo confirmas; después enseña la línea de tiempo de siempre.
- Condiciones, privacidad y cookies dejan de nombrar a Stripe cuando no está activo.

## Qué cambia para ti (programa 12.4)
- El pedido entra en **Pedidos** como **Reservado** (apartado) con una nota «POR WHATSAPP: cobro pendiente (Bizum/efectivo)» y te llega la notificación.
- Cuando el cliente paga: pasa el pedido a **Confirmado** (o más) → la tienda lo marca pagado y **descuenta el stock**.
- Si no sigue adelante: **Cancelado** → la tienda libera lo apartado.
- Si pasan 48 h sin confirmar, la tienda libera las unidades sola (el pedido sigue en tu programa hasta que decidas). Si luego lo cobras, entra igualmente (con un aviso para revisar el stock).
- Si no confirmas ni cancelas en 30 días, la tienda lo da por caducado y lo borra (sus datos personales no se quedan).

## Seguridad
- Solo el programa (firma de la clave de pedidos) puede cobrar o cancelar; **solo pedidos «por WhatsApp»**: un pago de Stripe caducado nunca se da por cobrado desde el programa.
- Mismo anti-bots (campo trampa, tiempo mínimo), mismos límites por IP y máximo 3 pedidos apartados sin confirmar por persona (anti-acaparamiento).
- Sin número de WhatsApp configurado no se aceptan pedidos (no habría dónde confirmarlos).
- Los datos de envío del cliente se borran 30 días después de cobrar/cancelar, como siempre.

## Para activarlo
1. Sube esta versión de la tienda (GitHub → Cloudflare la despliega sola). La base de datos se actualiza sola (columna nueva `metodo`).
2. En el programa → Tienda web: comprueba que el **número de WhatsApp** está puesto y pulsa **Guardar y publicar**.
3. No hace falta ningún secreto de Stripe. Si algún día lo activas, la web vuelve sola al pago con tarjeta.

## Técnico
- `POST /api/pedido` sin Stripe → `201 { modo: 'whatsapp', pedido, token, metodo, totalCent }` (estado `whatsapp`, reserva de 48 h).
- `/api/interno/seguimiento` acepta `cobro: 'cobrado' | 'cancelado' | 'pendiente'` por pedido (idempotente).
- `/api/interno/pedidos` incluye los pedidos `whatsapp` aún no recogidos (con `metodo`).
- Textos legales movidos a `js/legal.js` (carga bajo demanda): la portada sigue por debajo de 90 KB.
- Pruebas: `node test/whatsapp.test.js` (10), `api.test.js` (25), `reservas.test.js` (18), `seguridad.test.js` (13), `seguimiento.test.js` (10), `e2e.test.js` (19).
