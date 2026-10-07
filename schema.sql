-- CelebriDiseños · Tienda web · Base de datos D1 (Cloudflare)
-- Solo contiene lo PÚBLICO (catálogo, fotos publicadas, configuración de la tienda) y los pedidos hechos en la web.
-- Nunca contiene costes, márgenes, proveedores ni datos del programa interno.
-- Se ejecuta una vez en el panel de Cloudflare → D1 → la base de datos → Console (o con «wrangler d1 execute»).

CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY,               -- el mismo id del producto en el programa
  slug TEXT NOT NULL UNIQUE,         -- dirección limpia: /p/maceta-luna
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  caracteristicas TEXT NOT NULL DEFAULT '[]', -- JSON: [["Material","PLA"],["Medidas","15 × 10 cm"]]
  categoria TEXT NOT NULL DEFAULT '',
  precio_cent INTEGER NOT NULL,      -- precio normal en céntimos (IVA incluido). Los descuentos SOLO salen de «promociones»
  destacado INTEGER NOT NULL DEFAULT 0,
  personalizable INTEGER NOT NULL DEFAULT 0,
  novedad INTEGER NOT NULL DEFAULT 0,
  peso_g INTEGER NOT NULL DEFAULT 0, -- peso con embalaje para calcular el envío
  variantes TEXT NOT NULL DEFAULT '[]', -- JSON: [{"nombre":"Color","valores":["Blanco","Negro"]}]
  stock INTEGER,                     -- NULL = se fabrica bajo pedido
  reservado INTEGER NOT NULL DEFAULT 0, -- unidades apartadas mientras otras personas pagan (la reserva caduca sola)
  plazo_dias INTEGER NOT NULL DEFAULT 3,
  fotos TEXT NOT NULL DEFAULT '[]',  -- JSON: ids de fotos en orden (la primera es la principal)
  relacionados TEXT NOT NULL DEFAULT '[]',
  seo_titulo TEXT NOT NULL DEFAULT '',
  seo_desc TEXT NOT NULL DEFAULT '',
  orden INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'publicado', -- publicado | retirado
  actualizado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS productos_estado ON productos(estado, orden);

CREATE TABLE IF NOT EXISTS fotos (
  id TEXT PRIMARY KEY,
  producto_id TEXT NOT NULL,
  mime TEXT NOT NULL,
  ancho INTEGER NOT NULL DEFAULT 0,
  alto INTEGER NOT NULL DEFAULT 0,
  datos TEXT NOT NULL,               -- base64 (fotos ya reducidas por el programa antes de publicar)
  actualizado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS fotos_producto ON fotos(producto_id);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,            -- 'publica' (tienda, WhatsApp, quiénes somos, envíos, textos legales)
  valor TEXT NOT NULL,
  actualizado TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,               -- W-AAAAMMDD-XXXXXX
  token TEXT NOT NULL UNIQUE,        -- aleatorio: solo para la página de confirmación del cliente
  creado TEXT NOT NULL,
  estado TEXT NOT NULL,              -- pendiente_pago | whatsapp (v1.5, sin pago online) | pagado | expirado | fallido | cancelado
  cliente TEXT NOT NULL,             -- JSON con los datos de envío (se borra a los 30 días de recogerlo el programa)
  lineas TEXT NOT NULL,              -- JSON
  envio TEXT NOT NULL,               -- JSON
  subtotal_cent INTEGER NOT NULL,
  descuento_cent INTEGER NOT NULL DEFAULT 0, -- descuento por cantidad aplicado (promoción real)
  promos TEXT NOT NULL DEFAULT '[]', -- JSON: qué promociones se aplicaron (para el programa)
  envio_cent INTEGER NOT NULL,
  total_cent INTEGER NOT NULL,
  pago_ref TEXT,                     -- id de la sesión de Stripe (nunca datos de tarjeta)
  pagado_en TEXT,
  aviso TEXT NOT NULL DEFAULT '',    -- p. ej. «sin stock al pagar»
  recogido INTEGER NOT NULL DEFAULT 0,
  recogido_en TEXT,
  purgar_en TEXT,
  reserva INTEGER NOT NULL DEFAULT 0, -- 1 = este pedido tiene unidades apartadas
  reserva_hasta TEXT,
  ip_h TEXT NOT NULL DEFAULT '',     -- huella de la IP (con sal) y del email: frenan que alguien aparte todo el stock sin pagar
  email_h TEXT NOT NULL DEFAULT '',
  fase TEXT NOT NULL DEFAULT '',            -- v1.4 · seguimiento: recibido | imprimiendo | preparando | enviado | entregado (la publica el programa)
  transportista TEXT NOT NULL DEFAULT '',
  codigo_seg TEXT NOT NULL DEFAULT '',
  fase_en TEXT,
  metodo TEXT NOT NULL DEFAULT ''            -- v1.5 · pedido por WhatsApp: «bizum» | «efectivo»
);
CREATE INDEX IF NOT EXISTS pedidos_estado ON pedidos(estado, recogido);

-- Campañas (CUÁNDO y CÓMO se ve la web) y promociones (el descuento), SEPARADAS de los productos.
-- Las publica el programa; sin valor configurado no hay descuento.
CREATE TABLE IF NOT EXISTS campanas (id TEXT PRIMARY KEY, datos TEXT NOT NULL, actualizado TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS promociones (id TEXT PRIMARY KEY, campana_id TEXT, datos TEXT NOT NULL, actualizado TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS nonces (n TEXT PRIMARY KEY, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS limites (clave TEXT PRIMARY KEY, ventana INTEGER NOT NULL, n INTEGER NOT NULL);
-- Registro de seguridad: SIN datos personales (la IP se guarda como huella con sal, no en claro)
CREATE TABLE IF NOT EXISTS seguridad (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, tipo TEXT NOT NULL, ruta TEXT NOT NULL, ip TEXT NOT NULL, detalle TEXT NOT NULL DEFAULT '');
