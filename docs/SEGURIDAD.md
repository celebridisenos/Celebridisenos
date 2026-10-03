# Seguridad de la tienda (defensiva)

## Frontera de datos

```
PROGRAMA INTERNO (Sheets, Drive, costes, clientes…)  ← privado; la web NUNCA entra aquí
        │  solo el servidor de Google, con claves firmadas
        ▼
API SEGURA (Cloudflare Pages Functions)               ← puerta controlada
        │
        ▼
D1 de la tienda: catálogo publicado, fotos reducidas, campañas, configuración pública,
pedidos web (los datos de envío se borran 30 días después de recogerlos)
        │
        ▼
WEB PÚBLICA: solo lo que se publica a propósito
```

- La web **nunca** recibe costes, márgenes, recetas, proveedores, stock interno, impresoras, cámaras, archivos privados ni datos fiscales. Hay pruebas que lo comprueban.
- El programa **solo** habla con la tienda desde el servidor de Google. Las claves no están en la app ni en el navegador.

## Autenticación y autorización
- Rutas internas (`/api/interno/*`): firma **HMAC-SHA256** de método, ruta, hora, nonce y huella del cuerpo.
  - La hora debe estar a ±5 min.
  - Cada nonce sirve **una sola vez**: una petición copiada no se puede repetir.
- **Dos claves separadas:**
  - `CLAVE_PUBLICAR`: productos, campañas y configuración; no puede leer pedidos;
  - `CLAVE_PEDIDOS`: leer y recoger pedidos; no puede publicar.
- Las claves deben tener al menos 32 caracteres. Si faltan, la API **se niega**: nunca funciona «abierta».
- Tras 20 intentos fallidos desde la misma IP, esa IP queda bloqueada 10 minutos.

## Compra
- **Precios:** los calcula SIEMPRE el servidor con lo publicado. Lo que mande el navegador se ignora.
  - Si el precio cambió mientras comprabas (por ejemplo, terminó una campaña), se avisa y no se cobra otro importe.
- **Pago:** en la página de **Stripe Checkout**. Esta web nunca ve números de tarjeta, CVV ni contraseñas de pago.
  - Las condiciones de Cloudflare no permiten recoger tarjetas en webs del plan gratis, y así no lo hacemos.
- **Descuentos:** solo por promociones reales publicadas desde el programa. El descuento por cantidad va en un cupón de Stripe de **un solo uso**, por el importe exacto.
- **Webhook:** firma de Stripe comprobada y tolerancia de 5 minutos.
  - Un aviso repetido no descuenta stock dos veces.
  - Un aviso de una sesión que no corresponde al pedido se ignora y queda en el registro.
- **Pedidos duplicados:** claves de idempotencia en Stripe. El programa no importa dos veces el mismo pedido web.

## Protecciones generales
- HTTPS, HSTS y CSP estricta (`script-src 'self'`, sin scripts en línea, sin iframes); `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- **Sin CORS:** otras webs no pueden leer la API. Los POST exigen `application/json`, así un formulario de otra web no puede crear pedidos (CSRF).
- **Validación estricta** de todo lo que entra:
  - longitudes, tipos y códigos postales;
  - fotos: solo WebP/JPEG/PNG reales (se comprueba el contenido) y como máximo 1,2 MB.
- Consultas preparadas (sin inyección SQL). Todo el HTML se escapa (sin XSS). Hay pruebas con intentos de inyección y XSS.
- Límites de peticiones por IP: pedidos (10 cada 10 min), consultas de envío y estado.
- **Errores:** el público solo ve «Ha habido un problema»; el detalle no sale nunca.
- **Registro de seguridad:** tipo, ruta, huella de la IP con sal y motivo corto. **Sin** IP en claro, emails, direcciones ni secretos. Se borra a los 90 días.
- **Minimización de datos:**
  - datos de envío borrados 30 días después de que el programa recoge el pedido;
  - pedidos no pagados, borrados a los 7 días.

## Lo que NO hay
Puertas traseras, accesos ocultos, herramientas ofensivas, claves en el código o en GitHub, cookies de seguimiento.

## Refuerzo v1.3 (octubre 2026)
Lo que se ha añadido tras revisar la tienda como lo haría un atacante (todo tiene prueba en `test/seguridad.test.js`):

| Ataque | Defensa |
|---|---|
| **Inyección de fórmulas** (un cliente pone `=IMPORTDATA(…)` en su nombre para que tu hoja de Google ejecute algo) | El servidor del programa marca como *texto* toda celda que empiece por `= + - @` antes de escribirla. Se guarda y se lee tal cual, nunca se ejecuta. |
| **Acaparar el stock** (apartar todo sin pagar) | Una persona (misma IP o mismo email) no puede tener más de 3 pedidos sin pagar con unidades apartadas. La reserva caduca sola a los 35 min. |
| **Bots de formularios** | Campo trampa invisible + el formulario no se envía en menos de 1,5 s (si alguien pulsa tan rápido, se reintenta solo un instante después). |
| **Carreras en el límite de peticiones** (25 a la vez para colarse) | Límite atómico: pasan exactamente las permitidas. |
| **Agotar las escrituras gratuitas de la base de datos insistiendo** | Una IP ya bloqueada no escribe nada más (ni límites ni registro). |
| **Cuerpos enormes sin `Content-Length`** | Se lee por trozos con tope real y se corta al instante. |
| **Importe de pago manipulado/erróneo** | Si Stripe avisa de un importe distinto al del pedido, el pedido se conserva pero queda marcado «REVISAR» y en el registro de seguridad. |
| **Cabeceras** | CSP más cerrada (`frame-src`, `worker-src`, `media-src` = ninguno), `X-Permitted-Cross-Domain-Policies`, permisos de hardware cerrados. |
| **Desvío tras el pago** (cabecera Host falsa) | Si defines `SITIO_URL` (https://tu-dominio) las vueltas del pago usan siempre esa dirección. |

### Qué NO se puede resolver solo desde el código (acciones tuyas, gratis, 5 minutos)
1. **Cloudflare → tu dominio → Seguridad → Bots → «Bot Fight Mode»: activar.** Frena el tráfico automático antes de que llegue a la tienda.
2. **Cloudflare → Seguridad → WAF → Reglas de limitación de velocidad**: crea 1 regla (el plan gratis permite una): *si la ruta empieza por `/api/` y hay más de 100 peticiones por 10 s desde la misma IP → bloquear 1 min*.
3. **Cloudflare → Pages → tu proyecto → Configuración → Variables**: añade `SITIO_URL` = la dirección de tu tienda (ej. `https://celebridisenos.com`) y `SAL_REGISTRO` = un texto aleatorio largo (sale en *Generar claves nuevas* del programa o escribe 40 letras cualquiera). No cambian lo que ve el cliente.
4. **Stripe → Desarrolladores → Webhooks**: comprueba que el endpoint apunta a `/api/stripe/webhook` y que solo escucha `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.
5. **GitHub → Settings → Password and authentication**: renueva los códigos de recuperación (ver aviso del programa) y activa 2FA con app (no SMS).
6. **Stripe Radar** (viene incluido en Stripe): déjalo en la configuración por defecto; bloquea tarjetas robadas y pagos sospechosos.

### Qué se ha probado y qué no
- Probado en local con ataques simulados: inyección SQL/XSS/fórmulas, CSRF, replay, firmas falsas, fuerza bruta, carreras, cuerpos enormes, sondeos de rutas, acaparamiento, webhook falso o con importe distinto.
- **No** probado contra la tienda publicada (Cloudflare real) ni con un pago real de Stripe: eso requiere que hagas un pago de prueba (ver el informe).

## Si crees que una clave se ha visto
1. En el programa: **Tienda web → Conexión → Generar claves nuevas**.
2. Cámbialas en Cloudflare.
3. Reintenta la implementación.

Las antiguas dejan de valer en ese momento. Para Stripe: **Desarrolladores → Claves de API → Rotar**.
