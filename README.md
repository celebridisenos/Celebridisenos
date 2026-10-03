# CelebriDiseños · Tienda web

Tienda online **independiente** del programa interno. Funciona con Cloudflare Pages, Pages Functions (API segura) y D1. No tiene dependencias ni librerías externas.

- `public/`: la web (portada, ficha, cesta, compra, gracias, quiénes somos, envíos, textos legales).
- `functions/`: puntos de entrada de Cloudflare: `/api/*`, `/p/<producto>`, `/sitemap.xml` y `/robots.txt`.
- `src/`:
  - `api.js`: la API segura;
  - `seguridad.js`: firmas HMAC, nonces, límites y registro;
  - `logica.js`: precios, envíos y validación;
  - `campanas.js`: campañas y promociones reales;
  - `pago.js`: Stripe Checkout;
  - `paginas.js`: fichas para buscadores.
- `schema.sql`: la base de datos D1.
- `test/`: pruebas.
  - `node test/api.test.js`: API y seguridad;
  - `node test/e2e.test.js`: navegador real, con el pago de Stripe SIMULADO;
  - `node test/servidor.js`: tienda local de prueba.
- `docs/DESPLIEGUE.md`: cómo publicarla paso a paso sin instalar nada.
- `docs/SEGURIDAD.md`: la frontera de datos y las protecciones.
- `COSTES_DEL_SISTEMA.md`: qué es gratis, qué se paga por uso, qué costaría al crecer y qué es opcional.

**Descuentos:** solo existen si se crea una **promoción real** desde el programa (Tienda web → ✨ Campañas). Sin campaña activa no hay precios tachados, porcentajes ni contadores.
