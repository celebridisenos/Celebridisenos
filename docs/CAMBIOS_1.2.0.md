# Tienda 1.2.0
- Reserva temporal de stock durante el pago (apartado atómico, liberación por cancelación/caducidad/tiempo, sin dobles descuentos).
- Descuento web calculado en el servidor (config `descuentoWeb {activo,pct,combinable}`; 0–30 %; apagado si no se configura).
- Sesión de Stripe con caducidad de 31 min (`expires_at`).
- Ficha: precio web, «Comprar por WhatsApp» con variante/cantidad elegidas y 6 pasos.
- Migración de D1 automática (`productos.reservado`, `pedidos.reserva`, `pedidos.reserva_hasta`); `schema.sql` actualizado para instalaciones nuevas.
- Pruebas: `node test/api.test.js` (25), `node test/reservas.test.js` (18), `node test/e2e.test.js` (18).
