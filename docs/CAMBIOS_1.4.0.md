# Tienda 1.4.0 — Seguimiento del pedido
- Nueva página `/seguimiento` (carga su propio JS/CSS solo ahí; la portada no pesa más) y enlace «Seguir mi pedido» en el pie y en «¡Gracias!».
- API: `POST /api/seguimiento` (nº pedido + email; respuesta idéntica ante cualquier fallo; límites por IP y por pedido), `GET /api/pedido/<token>` ahora incluye `seguimiento`, y `POST /api/interno/seguimiento` (firmada con la clave de pedidos) para que el programa publique fase/transportista/código.
- Base de datos: columnas `fase`, `transportista`, `codigo_seg`, `fase_en` (se añaden solas).
- Privacidad: el cliente nunca recibe dirección, teléfono ni email; el código solo se valida con letras, números y guiones; los enlaces de transportista solo para los conocidos.
- Pruebas: `test/seguimiento.test.js` (10) + 1 paso nuevo en el navegador. Total tienda: 25 + 18 + 13 + 10 en servidor y 19 en navegador.
