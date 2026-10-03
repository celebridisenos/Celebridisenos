# Tienda 1.3.0 · Cambios

**Seguridad** (ver `SEGURIDAD.md → Refuerzo v1.3`): anti-acaparamiento de stock, anti-bots, límites atómicos y que no gastan escrituras, tope real del cuerpo de las peticiones, comprobación del importe del webhook, CSP más cerrada, `SITIO_URL` opcional.

**Base de datos**: dos columnas nuevas en `pedidos` (`ip_h`, `email_h`: huellas con sal, nunca la IP ni el email en claro). Se añaden solas al primer arranque; no hay que ejecutar SQL.

**Compatibilidad**: la página de compra de esta versión envía el campo trampa y el tiempo. Si un cliente tiene abierta la versión anterior mientras actualizas, verá «Recarga la página (F5)» y no se le cobra nada raro.

**Diseño premium (portada y ficha)**
- Barra superior con lo que es verdad en tu configuración (envío gratis desde…, pago seguro, piezas personalizables) y menú de secciones.
- Portada: hero con titular grande, botones «Ver la colección» y «Cuéntanos tu idea» (WhatsApp) y una vitrina con tus productos REALES (destacados/novedades) y su precio.
- Bloque de confianza (pago seguro, envío, hecho para ti, trato directo): solo aparece lo que está activo.
- Tarjetas limpias: segunda foto al pasar el ratón, botón «+» rápido, etiquetas redondeadas. Ningún producto repetido en la portada; con catálogo pequeño solo se muestra «Todos los productos».
- «Así de fácil» (3 pasos) y banner «¿Tienes una idea o necesitas un repuesto?».
- Ficha: título y precio grandes, variantes en píldoras, bloque de envío/devolución/pago en tarjeta, barra de compra fija en móvil.
- Pie oscuro con contacto y «Pago seguro con Stripe».
- Sin reseñas, contadores de visitas ni «quedan X» inventados: no se muestra nada que no sea real.
- Las fotos de las capturas de prueba son cuadros de color: la tienda se verá mucho mejor con tus fotos reales (fondo limpio, luz suave, cuadradas).
