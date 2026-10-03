# Publicar la tienda (paso a paso, sin instalar nada)

Todo se hace desde el navegador. **No contrates nada:** todo cabe en los planes gratuitos (ver `COSTES_DEL_SISTEMA.md`). Las cuentas las creas tú; Claude no crea cuentas ni mete contraseñas.

## 1. GitHub: repositorio privado (gratis)
1. Entra en github.com con tu cuenta → **New repository**.
2. Nombre: `celebridisenos-tienda`. Marca **Private** → **Create repository**.
3. Pulsa **uploading an existing file** y arrastra **el contenido** de la carpeta de la tienda: `public`, `functions`, `src`, `schema.sql`, `package.json`, `.gitignore`, `docs`, `README.md`, `COSTES_DEL_SISTEMA.md` y, si quieres, `test`.
4. Pulsa **Commit changes**.

✅ **Comprobar:** en el repositorio NO debe haber ningún archivo `.env`, `.dev.vars` ni claves. Este proyecto no tiene ninguno.

## 2. Cloudflare Pages: la web y la API
1. Crea una cuenta gratuita en dash.cloudflare.com. Elige el plan **Free**; no hace falta tarjeta.
2. **Workers y Pages → Crear → Pages → Conectar con Git** → elige `celebridisenos-tienda`.
3. Configuración de compilación:
   - Framework preset: **None**;
   - Build command: **(vacío)**;
   - Build output directory: **`public`**.
4. **Guardar e implementar.** Te dará una dirección del estilo `https://celebridisenos-tienda.pages.dev`.

La carpeta `functions` se detecta sola: es la API segura.

## 3. D1: la base de datos de la tienda
1. **Almacenamiento y bases de datos → D1 → Crear**. Nombre: `celebridisenos-tienda`.
2. Abre la base de datos → **Consola**.
3. Pega TODO el contenido de `schema.sql` → **Ejecutar**.
4. Vuelve al proyecto de Pages → **Configuración → Enlaces (Bindings) → Añadir → Base de datos D1**:
   - nombre de la variable: **`DB`**;
   - base de datos: `celebridisenos-tienda`.

## 4. Claves (secretos), nunca en GitHub
1. En el **programa**: **Tienda web → Conexión → 🔑 Generar claves nuevas**. Aparecen tres valores.
2. En Cloudflare, proyecto → **Configuración → Variables y secretos → Añadir**. Crea, tipo **Secreto**:
   - `CLAVE_PUBLICAR`;
   - `CLAVE_PEDIDOS`;
   - `SAL_REGISTRO`.
3. En el programa pulsa **Guardar en el programa**.
4. En Cloudflare: **Implementaciones → … → Reintentar implementación**, para que coja los secretos y la base de datos.
5. En el programa: pega la dirección de la tienda → **Guardar dirección → Probar conexión**. Debe salir **«✓ Conectada»**.

## 5. Antes de vender
1. **Envíos:** pon TUS precios y marca «Confirmo que estos son MIS precios reales». Sin eso, esa opción no aparece en la web.
2. **Quiénes somos y legal:** titular, NIF, domicilio y email. Revisa los textos con tu gestoría.
3. **Datos y margen:** WhatsApp, Instagram y, si quieres, tu **margen mínimo**.
4. **Productos:** en cada producto, pestaña **🛍️ Tienda web** → precio, fotos (las tuyas), colores → **Publicar en la tienda**.

## 6. Pagos con Stripe: PRIMERO EN MODO PRUEBA
Mientras no pongas las claves de Stripe, la web **no cobra**: ofrece hacer el pedido por WhatsApp.

1. Crea la cuenta de Stripe y quédate en **modo de prueba**.
2. **Desarrolladores → Claves de API.** Lo más seguro es una **clave restringida** (`rk_test_…`) con permiso de **escritura** en *Checkout Sessions* y *Coupons* (nada más). Si al probar Stripe pide algún permiso más, añádelo. También vale la secreta de prueba (`sk_test_…`).
3. **Desarrolladores → Webhooks → Añadir destino:**
   - URL: `https://TU-TIENDA.pages.dev/api/stripe/webhook`;
   - eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` y `checkout.session.expired`.

   Copia el **secreto de firma** (`whsec_…`).
4. En Cloudflare añade los secretos `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` → **Reintentar implementación**.
5. **Pruebas obligatorias** (con las tarjetas de PRUEBA que publica Stripe en su documentación):
   - pago correcto → el pedido llega al programa como «Tienda web» (botón «Traer pedidos web ahora» o espera 15 minutos);
   - tarjeta rechazada → no se crea ningún pedido pagado;
   - cancelar en la página de Stripe → vuelves a la cesta y no se cobra;
   - pagar dos veces el mismo pedido → no se duplica.
6. **Bizum:** actívalo en Stripe (Ajustes → Métodos de pago) **después de mirar su precio** en tu panel.
7. **Cobros reales:** solo cuando tú lo decidas. Cambia las dos claves por las «live» y crea el webhook en modo real. **Nunca se activa solo.**

## 7. Dominio propio (opcional, de pago)
Cuando quieras: Pages → **Dominios personalizados → Configurar**. Antes de comprar el dominio, mira su precio anual.

## Volver atrás (rollback)
- **Web/API:** Cloudflare → proyecto → **Implementaciones** → la anterior → **Revertir**.
- **Base de datos:** D1 → **Viaje en el tiempo** (hasta 7 días atrás en el plan gratis).
- **Código:** GitHub guarda todas las versiones (historial).
- **Programa:** la versión anterior sigue en `00_SISTEMA\V11_8`.
