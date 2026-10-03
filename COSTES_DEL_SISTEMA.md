# COSTES DEL SISTEMA · Tienda web de CelebriDiseños

Comprobado el **2 de octubre de 2026** en las páginas oficiales (enlaces al final). Los planes pueden cambiar: revísalos antes de dar cada paso.

> **Regla:** 0 € si es posible y, si hay que pagar, lo mínimo, sin sacrificar seguridad, datos ni capacidad de crecer.
> **Nada se ha contratado.** No hay ninguna cuenta de pago creada ni ningún plan activado.

## 1. GRATIS (0 €)

| Pieza | Servicio | Qué incluye gratis | Por qué este |
|---|---|---|---|
| Repositorio del código | **GitHub Free** (privado) | Repositorios privados ilimitados, historial, ramas y copias | Privado y gratis |
| Web (páginas, CSS, JS, imágenes del diseño) | **Cloudflare Pages** | Peticiones a archivos estáticos **gratis e ilimitadas**; 500 publicaciones al mes; hasta 100 dominios por proyecto; HTTPS automático | Permite uso comercial (GitHub Pages prohíbe tiendas; Vercel gratis es solo para uso no comercial) |
| API segura | **Cloudflare Pages Functions** | **100.000 peticiones al día** (se reinicia a medianoche UTC); 10 ms de CPU por petición | Va dentro del mismo proyecto: sin servidor propio |
| Base de datos | **Cloudflare D1** | 5 GB en total (500 MB por base de datos); 5 millones de filas leídas al día; 100.000 filas escritas al día; «viaje en el tiempo» de 7 días | Sin tarjeta y suficiente para catálogo, fotos reducidas y pedidos |
| WhatsApp | Enlace `wa.me` | Abre el WhatsApp Business que ya usas | No hace falta la API de WhatsApp (que sí es de pago) |
| Avisos de pedidos | Telegram y la app | Ya funcionan en el programa | 0 € |
| Programa interno ↔ tienda | Google Apps Script | El servidor que ya tienes | 0 € |

**Con cuánta gente llega el plan gratis:** cada visita gasta 1 petición del catálogo y 1 por foto vista la primera vez. Las fotos se quedan en la caché del navegador y de Cloudflare. Abrir una ficha gasta unas 2–4 peticiones. Por eso 100.000 peticiones al día dan para **miles de visitas diarias**.

## 2. COSTE POR USO (solo si vendes)

| Pieza | Servicio | Precio | Cuándo se paga |
|---|---|---|---|
| Cobro con tarjeta | **Stripe Checkout** | **1,5 % + 0,25 €** por tarjeta europea estándar. Premium del EEE: 2,8 % + 0,25 €. Reino Unido: 2,5 % + 0,25 €. Internacional: 3,15 % + 0,25 €. +2 % si hay cambio de moneda | Solo cuando un cliente paga. Sin cuota mensual ni de alta |
| Bizum | Stripe (se activa en su panel) | Stripe no indica el precio en su página general: **consúltalo en tu panel de Stripe antes de activarlo** | Solo si lo activas |
| Alternativa | PayPal | 2,90 % + 0,35 € por venta nacional | **No se usa** (más caro) |

En el programa, los pedidos «Tienda web» calculan la comisión **estimada** de Stripe (1,5 % + 0,25 €). Es ajustable en Precios.

## 3. COSTE AL CRECER (cuando haya mucho tráfico)

| Si pasa esto… | Opción | Precio |
|---|---|---|
| Más de 100.000 peticiones a la API en un día, o más de 5 GB de datos | Cloudflare **Workers Paid** | **5 $ al mes** (mínimo de la cuenta; incluye mucho más uso) |
| Más de 500 publicaciones al mes | Plan de pago de Cloudflare Pages | Solo con cambios muy frecuentes. Ahora no hace falta |

## 4. OPCIONAL (tú decides; nada está contratado)

| Pieza | Para qué | Coste |
|---|---|---|
| **Dominio propio** (p. ej. celebridisenos.es / .com) | Que la tienda no sea «…pages.dev» | De pago, **anual**. Depende del registrador y de la terminación. Se mira el precio exacto antes de comprar. Funciona perfectamente sin él |
| Correo con tu dominio | info@tudominio | Recibir y reenviar con Cloudflare Email Routing es gratis (requiere dominio propio). Enviar correos desde la tienda no hace falta: **Stripe manda el recibo** al cliente |
| Revisión legal de los textos | Aviso legal, privacidad, condiciones | Lo que cobre tu gestoría |

## 5. NO NECESARIO

- **Hosting de pago** (servidores, VPS…): Cloudflare lo cubre.
- **API de WhatsApp Business** (de pago por conversación): basta el enlace al WhatsApp Business que ya usas.
- **Pasarela «integral» de PayPal** (15 € al mes): no se usa.
- **Plugins de tienda, plantillas de pago, CDN de imágenes, servicios de analítica:** no hacen falta.
- **Cloudflare R2** (almacén de archivos): las fotos reducidas caben en D1 sin tarjeta.
- **Programas en tu ordenador:** no hay que instalar nada (ni Node, ni Wrangler).

## Secretos (dónde están, nunca en GitHub)

| Secreto | Dónde se guarda | Quién lo usa |
|---|---|---|
| `CLAVE_PUBLICAR` | Cloudflare (Secretos) + Propiedades del script de Google | Publicar productos, campañas y configuración |
| `CLAVE_PEDIDOS` | Cloudflare (Secretos) + Propiedades del script de Google | Leer y recoger pedidos web (datos de clientes) |
| `SAL_REGISTRO` | Solo Cloudflare (Secretos) | Para que el registro de seguridad no guarde IP en claro |
| `STRIPE_SECRET_KEY` | Solo Cloudflare (Secretos) | Crear el pago. Usa primero la de **prueba** (`sk_test_…` o una restringida `rk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Solo Cloudflare (Secretos) | Comprobar que el aviso de pago viene de Stripe |

## Fuentes (consultadas el 02/10/2026)

- [GitHub Pages: límites y usos prohibidos](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Planes de GitHub](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
- [Cloudflare Workers: precios y límites (incluye D1 y KV)](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Pages: límites](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages Functions: precios (estáticos gratis e ilimitados)](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudflare D1: límites](https://developers.cloudflare.com/d1/platform/limits/)
- [Vercel Hobby (uso no comercial)](https://vercel.com/docs/plans/hobby)
- [Netlify: planes por créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Stripe: precios en España](https://stripe.com/es/pricing)
- [Stripe: Bizum](https://docs.stripe.com/payments/bizum)
- [PayPal: comisiones en España](https://www.paypal.com/es/business/paypal-business-fees)
- Tarifas de referencia de envío:
  - [Correos 2026, península y Baleares](https://www.correos.es/content/dam/correos/documentos/atc/tarifas/2026/Tarifas_Correos_2026_Peninsula_y_Baleares.pdf);
  - [InPost en Packlink](https://www.packlink.es/inpost/).

  Son **POR CONFIRMAR** hasta que pongas tus precios reales.
