// ================= API SEGURA de la tienda CelebriDiseños =================
// WEB PÚBLICA → API SEGURA → SERVICIO CONTROLADO (D1) → DATOS PERMITIDOS
// · Rutas PÚBLICAS: catálogo, fotos, cotizar envío, crear pedido, estado del pedido (con su token aleatorio)
// · Rutas INTERNAS (/api/interno/…): solo el programa, con firma HMAC y clave separada por permiso
//     publicar  → productos, fotos, configuración pública
//     pedidos   → leer pedidos web y marcarlos como recogidos
// · Webhook de Stripe con su firma
// La API nunca recibe ni guarda costes, márgenes, proveedores ni nada del programa interno.
import { verifyInternal, rateLimit, isLimited, secLog, ipHash, randomId, nowIso, sha256hex, SEC_HEADERS } from './seguridad.js';
import { VERSION, hoyMadrid, parseJSON, slugify, publico, cotizar, validarCliente, calcularCesta, descWebCfg, faseOk, limpiarCodigo, codigoOk, vistaSeguimiento } from './logica.js';
import { promosActivas, resumenPublico, proximoCambio, estadoCampana, limpiarCampana, limpiarPromo } from './campanas.js';
import { pagoActivo, modoPrueba, crearSesion, verificarWebhook } from './pago.js';

export const MIN_FORM_MS = 1500, MAX_PENDIENTES = 3;
const MAX_PUBLIC_BODY = 16 * 1024, MAX_INTERNAL_BODY = 12 * 1024 * 1024, MAX_FOTO = 1200 * 1024, MAX_FOTOS = 10;

export function json(status, obj, extra) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, SEC_HEADERS, extra || {}) });
}
const fail = (status, error, mensaje, extra) => json(status, Object.assign({ error, mensaje }, extra || {}));

// Lee el cuerpo con TOPE real: si alguien envía más de «max» bytes (aunque mienta en Content-Length o use trozos), se corta al instante
async function readBody(req, max) {
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > max) return { error: 'demasiado_grande' };
  if (!req.body || typeof req.body.getReader !== 'function') {
    const buf = new Uint8Array(await req.arrayBuffer());
    return buf.byteLength > max ? { error: 'demasiado_grande' } : { bytes: buf, text: new TextDecoder().decode(buf) };
  }
  const rd = req.body.getReader(), parts = []; let total = 0;
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { try { await rd.cancel(); } catch (e) { } return { error: 'demasiado_grande' }; }
    parts.push(value);
  }
  const buf = new Uint8Array(total); let o = 0; parts.forEach(c => { buf.set(c, o); o += c.byteLength; });
  return { bytes: buf, text: new TextDecoder().decode(buf) };
}
async function readJSON(req, max) {
  const ct = req.headers.get('Content-Type') || '';
  if (!/^application\/json\b/i.test(ct)) return { error: 'tipo_contenido' }; // además bloquea formularios de otras webs (CSRF)
  const b = await readBody(req, max);
  if (b.error) return b;
  try { const v = JSON.parse(b.text || '{}'); if (!v || typeof v !== 'object' || Array.isArray(v)) return { error: 'json' }; return { data: v, bytes: b.bytes }; } catch (e) { return { error: 'json' }; }
}

export async function getConfig(env) {
  const r = await env.DB.prepare("SELECT valor FROM config WHERE clave = 'publica'").first();
  return parseJSON(r && r.valor, {});
}
// configuración que ve el público (sin nada interno)
function configPublica(cfg, env) {
  const c = cfg || {}, dwb = descWebCfg(c), wa = c.whatsapp && /^\+?\d{8,15}$/.test(String(c.whatsapp.numero || '').replace(/\s/g, '')) ? { numero: String(c.whatsapp.numero).replace(/[\s+]/g, ''), mensaje: String(c.whatsapp.mensaje || '') } : null;
  return { tienda: c.tienda || { nombre: 'CelebriDiseños' }, whatsapp: wa, quienes: c.quienes || null, legal: c.legal || {}, masVendidos: c.masVendidos || [],
    envios: { paises: (c.envios && c.envios.paises) || [], gratisDesdeCent: (c.envios && c.envios.gratisDesdeCent) || 0, opciones: ((c.envios && c.envios.opciones) || []).filter(o => o.confirmado).map(o => ({ id: o.id, nombre: o.nombre, descripcion: o.descripcion || '', transportista: o.transportista || '', plazo: o.plazo || '', desdeCent: Math.min(...(o.tramos || []).map(t => Number(t.cent)).filter(x => x >= 0), Infinity) })) },
    pago: { activo: pagoActivo(env), prueba: modoPrueba(env), manual: !pagoActivo(env) && !!wa, metodos: METODOS }, categorias: c.categorias || [], descuentoWeb: dwb ? { pct: dwb.pct, combinable: dwb.combinable } : null };
}

// ---------- Migración automática (v1.2): reserva temporal de stock mientras se paga ----------
// Añade las columnas nuevas sin que haya que ejecutar SQL a mano. Es idempotente y solo se comprueba una vez por arranque.
let migrada = false;
async function migrar(env) {
  if (migrada) return;
  const cols = async t => new Set(((await env.DB.prepare('PRAGMA table_info(' + t + ')').all()).results || []).map(r => r.name));
  const add = async (t, c, def) => { try { await env.DB.prepare('ALTER TABLE ' + t + ' ADD COLUMN ' + c + ' ' + def).run(); } catch (e) { if (!/duplicate column/i.test(String(e && e.message))) throw e; } };
  const cp = await cols('productos'), cd = await cols('pedidos');
  if (!cp.has('reservado')) await add('productos', 'reservado', 'INTEGER NOT NULL DEFAULT 0');
  if (!cd.has('reserva')) await add('pedidos', 'reserva', 'INTEGER NOT NULL DEFAULT 0');
  if (!cd.has('reserva_hasta')) await add('pedidos', 'reserva_hasta', 'TEXT');
  if (!cd.has('ip_h')) await add('pedidos', 'ip_h', "TEXT NOT NULL DEFAULT ''");   // huella de la IP (con sal) para frenar el acaparamiento de stock
  if (!cd.has('email_h')) await add('pedidos', 'email_h', "TEXT NOT NULL DEFAULT ''"); // huella del email
  if (!cd.has('fase')) await add('pedidos', 'fase', "TEXT NOT NULL DEFAULT ''");           // v1.4: seguimiento (la publica el programa)
  if (!cd.has('transportista')) await add('pedidos', 'transportista', "TEXT NOT NULL DEFAULT ''");
  if (!cd.has('codigo_seg')) await add('pedidos', 'codigo_seg', "TEXT NOT NULL DEFAULT ''");
  if (!cd.has('fase_en')) await add('pedidos', 'fase_en', 'TEXT');
  if (!cd.has('metodo')) await add('pedidos', 'metodo', "TEXT NOT NULL DEFAULT ''");       // v1.5: pedido por WhatsApp → «bizum» | «efectivo»
  migrada = true;
}
// La reserva dura lo que la sesión de pago de Stripe (mínimo 30 min) y unos minutos de margen para el aviso del pago
export const RESERVA_MIN = 35, STRIPE_CADUCA_MIN = 31;
// v1.5 · Pedido por WhatsApp (sin pago online): las unidades quedan apartadas 48 h mientras os ponéis de acuerdo por WhatsApp
export const RESERVA_WA_MIN = 48 * 60, METODOS = ['bizum', 'efectivo'], ESTADOS_ABIERTOS = "('pendiente_pago','whatsapp')";
const unidadesPorProducto = lineas => { const m = new Map(); (lineas || []).forEach(l => m.set(l.id, (m.get(l.id) || 0) + (Number(l.cant) || 0))); return m; };
// Aparta las unidades (solo de lo que tiene stock contado). Si falta alguna, no queda NADA apartado.
async function reservar(env, lineas) {
  const hecho = [];
  for (const [id, cant] of unidadesPorProducto(lineas)) {
    const r = await env.DB.prepare('UPDATE productos SET reservado = reservado + ? WHERE id = ? AND stock IS NOT NULL AND stock - reservado >= ?').bind(cant, id, cant).run();
    if (r.meta && r.meta.changes) { hecho.push([id, cant]); continue; }
    const p = await env.DB.prepare('SELECT stock FROM productos WHERE id = ?').bind(id).first();
    if (p && p.stock !== null && p.stock !== undefined) { await soltar(env, hecho); return { ok: false, id }; } // sin existencias libres
    // stock NULL = «se fabrica bajo pedido»: no se aparta nada
  }
  return { ok: true, hecho };
}
async function soltar(env, hecho) { for (const [id, cant] of hecho) await env.DB.prepare('UPDATE productos SET reservado = MAX(reservado - ?, 0) WHERE id = ?').bind(cant, id).run(); }
// Libera la reserva de un pedido UNA sola vez (aunque lleguen dos avisos a la vez): quien «reclama» el cambio es quien suelta
async function liberarPedido(env, id, lineasJson, nuevoEstado) {
  const r = await env.DB.prepare("UPDATE pedidos SET reserva = 0" + (nuevoEstado ? ", estado = ?" : "") + " WHERE id = ? AND reserva = 1" + (nuevoEstado ? " AND estado IN " + ESTADOS_ABIERTOS : "")).bind(...(nuevoEstado ? [nuevoEstado, id] : [id])).run();
  if (!(r.meta && r.meta.changes)) return false;
  await soltar(env, [...unidadesPorProducto(parseJSON(lineasJson, []))]);
  return true;
}
// Pedidos sin pagar cuya reserva ya caducó: se liberan las unidades (como mucho una vez cada 20 s por servidor)
let ultimoBarrido = 0;
async function liberarVencidas(env, forzar) {
  if (!forzar && Date.now() - ultimoBarrido < 20000) return; ultimoBarrido = Date.now();
  const rows = (await env.DB.prepare("SELECT id, lineas FROM pedidos WHERE reserva = 1 AND estado IN " + ESTADOS_ABIERTOS + " AND reserva_hasta < ?").bind(nowIso()).all()).results || [];
  for (const p of rows) await liberarPedido(env, p.id, p.lineas, 'expirado');
}

// Campañas y promociones publicadas (la hora de referencia es la del servidor)
async function loadPromos(env) {
  const c = ((await env.DB.prepare('SELECT datos FROM campanas').all()).results || []).map(r => parseJSON(r.datos, null)).filter(Boolean);
  const p = ((await env.DB.prepare('SELECT datos FROM promociones').all()).results || []).map(r => parseJSON(r.datos, null)).filter(Boolean);
  const now = Date.now();
  return { campanas: c, promos: p, now, activas: promosActivas(c, p, now), proximo: proximoCambio(c, p, now) };
}
// la caché nunca dura más que el próximo cambio de campaña (máx. 60 s)
const cacheHasta = (P, max = 60) => 'public, max-age=' + Math.max(0, Math.min(max, Math.floor((P.proximo - P.now) / 1000)));

async function publishedProducts(env) {
  const r = await env.DB.prepare("SELECT * FROM productos WHERE estado = 'publicado' ORDER BY orden, nombre").all();
  return r.results || [];
}

// ---------- Rutas públicas ----------
async function catalogo(req, env) {
  await liberarVencidas(env);
  const cfg0 = await getConfig(env), dw = descWebCfg(cfg0), P = await loadPromos(env), list = (await publishedProducts(env)).map(p => publico(p, P.activas, dw));
  return json(200, { version: VERSION, hoy: hoyMadrid(), ahora: new Date(P.now).toISOString(), productos: list, promos: resumenPublico(P.campanas, P.promos, P.now), config: configPublica(cfg0, env) }, { 'Cache-Control': cacheHasta(P) });
}
async function producto(req, env, slug) {
  const p = await env.DB.prepare("SELECT * FROM productos WHERE slug = ? AND estado = 'publicado'").bind(slug).first();
  if (!p) return fail(404, 'no_encontrado', 'Este producto no existe o ya no está a la venta.');
  await liberarVencidas(env);
  const P = await loadPromos(env), dw = descWebCfg(await getConfig(env));
  return json(200, { producto: publico(p, P.activas, dw), ahora: new Date(P.now).toISOString() }, { 'Cache-Control': cacheHasta(P) });
}
function b64ToBytes(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
async function imagen(req, env, id, ctx) {
  if (!/^f_[0-9a-f]{20}$/.test(id)) return fail(404, 'no_encontrado', 'Imagen no encontrada.');
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) { const hit = await cache.match(req); if (hit) return hit; }
  const f = await env.DB.prepare('SELECT mime, datos FROM fotos WHERE id = ?').bind(id).first();
  if (!f) return fail(404, 'no_encontrado', 'Imagen no encontrada.');
  const res = new Response(b64ToBytes(f.datos), { status: 200, headers: Object.assign({ 'Content-Type': f.mime, 'Cache-Control': 'public, max-age=31536000, immutable' }, SEC_HEADERS) });
  if (cache && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(req, res.clone()));
  return res;
}
async function cotizarEnvio(req, env, ipH) {
  if (!await rateLimit(env, 'cotizar', ipH, 60, 600)) return fail(429, 'demasiadas_peticiones', 'Demasiadas consultas seguidas. Espera unos minutos.');
  const b = await readJSON(req, MAX_PUBLIC_BODY); if (b.error) return fail(400, 'peticion_invalida', 'Petición no válida.');
  await liberarVencidas(env, true);
  const prods = await publishedProducts(env), cfg = await getConfig(env), P = await loadPromos(env);
  const c = calcularCesta(b.data.lineas, prods, P.activas, descWebCfg(cfg));
  if (!c.ok) return fail(422, 'cesta', c.errores[0], { errores: c.errores });
  const pais = String(b.data.pais || 'ES').toUpperCase();
  return json(200, Object.assign({ subtotalCent: c.subtotalCent, descuentoCent: c.descuentoCent, descuento: c.descuentoCantidad, descuentoWeb: c.descuentoWeb, pistas: c.pistas, productosCent: c.productosCent, ahorroCent: c.ahorroCent, lineas: c.lineas }, cotizar(cfg, c.pesoG, pais, c.productosCent)));
}
async function crearPedido(req, env, ipH, origin) {
  if (!await rateLimit(env, 'pedido', ipH, 10, 600)) return fail(429, 'demasiadas_peticiones', 'Has hecho muchos intentos seguidos. Espera unos minutos o escríbenos por WhatsApp.');
  const b = await readJSON(req, MAX_PUBLIC_BODY); if (b.error) return fail(400, 'peticion_invalida', 'Petición no válida.');
  const d = b.data, cfg = await getConfig(env), paises = (cfg.envios && cfg.envios.paises) || [];
  // Anti-bots básicos: el campo trampa (invisible para personas) debe ir vacío y el formulario no se envía en menos de 1,5 s.
  if (typeof d.web === 'string' && d.web !== '') { await secLog(env, req, 'bot', 'trampa'); return fail(422, 'datos', 'Revisa los datos marcados.'); }
  if (d.ms === undefined) return fail(409, 'version_antigua', 'La página se ha actualizado. Recárgala (F5) y vuelve a intentarlo.');
  if (!(Number(d.ms) >= MIN_FORM_MS)) { await secLog(env, req, 'bot', 'muy_rapido'); return fail(429, 'muy_rapido', 'Un momento… vuelve a pulsar «Pagar» en unos segundos.'); }
  if (d.acepto !== true) return fail(422, 'condiciones', 'Para comprar tienes que aceptar las condiciones de venta y la política de privacidad.');
  const v = validarCliente(d.cliente, paises);
  if (!v.ok) return fail(422, 'datos', 'Revisa los datos marcados.', { errores: v.errores });
  await liberarVencidas(env, true);
  const prods = await publishedProducts(env), P = await loadPromos(env), c = calcularCesta(d.lineas, prods, P.activas, descWebCfg(cfg));
  if (!c.ok) return fail(422, 'cesta', c.errores[0], { errores: c.errores });
  const q = cotizar(cfg, c.pesoG, v.cliente.pais, c.productosCent), op = q.opciones.find(o => o.id === d.envio);
  if (!op) return fail(422, 'envio', q.aviso || 'Elige una forma de envío.');
  // el precio que vio el cliente debe ser el actual (si una campaña acaba o cambia algo, se le avisa en vez de cobrar otro importe)
  const total = c.productosCent + op.cent;
  if (d.totalVisto !== undefined && Number(d.totalVisto) !== total) return fail(409, 'precio_cambiado', 'El precio ha cambiado mientras comprabas. Revisa la cesta.', { totalCent: total });
  // v1.5 · Sin pago online (Stripe sin configurar) el pedido se REGISTRA igualmente («por WhatsApp»): las unidades quedan apartadas 48 h,
  // el cliente confirma por WhatsApp y paga por Bizum o en efectivo. Sin WhatsApp configurado no hay a dónde enviarlo → se avisa.
  const manual = !pagoActivo(env), wa = configPublica(cfg, env).whatsapp;
  if (manual && !wa) return fail(503, 'pago_no_activo', 'La tienda todavía no admite pedidos online. Vuelve en unos días.', { whatsapp: null });
  const metodo = METODOS.includes(String(d.metodo || '').toLowerCase()) ? String(d.metodo).toLowerCase() : 'bizum';
  const fecha = hoyMadrid().replace(/-/g, ''), id = 'W-' + fecha + '-' + randomId(3).toUpperCase(), token = randomId(16);
  const promos = c.lineas.filter(l => l.promo).map(l => ({ tipo: 'producto', id: l.promo.id, nombre: l.promo.nombre, linea: l.id, cent: (l.antesCent - l.unidadCent) * l.cant })).concat(c.descuentoCantidad ? [{ tipo: 'cantidad', id: c.descuentoCantidad.id, nombre: c.descuentoCantidad.nombre, cent: c.descuentoCantidad.cent, lineas: c.descuentoCantidad.lineas }] : [])
    .concat(c.descuentoWeb ? [{ tipo: 'web', id: c.descuentoWeb.id, nombre: c.descuentoWeb.nombre, cent: c.descuentoWeb.cent, lineas: c.descuentoWeb.lineas }] : []);
  const pedido = { id, token, cliente: v.cliente, lineas: c.lineas, envio: op, envioCent: op.cent, descuentoCent: c.descuentoCent, descuentoNombre: [c.descuentoCantidad, c.descuentoWeb].filter(Boolean).map(x => x.nombre).join(' + ') };
  // Anti-acaparamiento: una misma persona (IP o email) no puede tener apartadas unidades en más de 3 pedidos sin pagar a la vez
  // (si no, alguien podría «vaciar» la tienda apartando todo sin comprar nada).
  const emailH = (await sha256hex((env.SAL_REGISTRO || env.CLAVE_PEDIDOS || 'sin-sal') + '|' + v.cliente.email.toLowerCase())).slice(0, 16);
  if (c.lineas.some(l => { const pr = prods.find(x => x.id === l.id); return pr && pr.stock !== null && pr.stock !== undefined; })) {
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM pedidos WHERE estado IN " + ESTADOS_ABIERTOS + " AND reserva = 1 AND (ip_h = ? OR email_h = ?)").bind(ipH, emailH).first();
    if (n && n.n >= MAX_PENDIENTES) { await secLog(env, req, 'acaparamiento', 'pendientes'); return fail(429, 'demasiados_pendientes', 'Ya tienes varios pedidos esperando el pago. Termina uno o espera unos minutos: las unidades apartadas se liberan solas.'); }
  }
  // Reserva temporal: las unidades quedan apartadas mientras se paga, para que nadie descubra «sin stock» DESPUÉS de pagar
  const rs = await reservar(env, c.lineas);
  if (!rs.ok) { const pr = prods.find(x => x.id === rs.id); return fail(409, 'sin_stock', 'Otra persona acaba de apartar la última unidad de «' + (pr ? pr.nombre : 'este producto') + '». Si no termina de pagar, volverá a estar disponible en unos minutos.'); }
  let ses = { id: 'whatsapp', url: '' };
  if (!manual) try { ses = await crearSesion(env, pedido, (/^https:\/\/[a-z0-9.-]+$/i.test(env.SITIO_URL || '') ? env.SITIO_URL : origin), (cfg.tienda && cfg.tienda.nombre) || 'CelebriDiseños'); }
  catch (e) { await soltar(env, rs.hecho); await secLog(env, req, 'pago_error', e.detalle || 'sesion'); return fail(502, 'pago_no_disponible', 'No se pudo abrir el pago ahora mismo. Prueba en unos minutos o escríbenos por WhatsApp.'); }
  try {
    await env.DB.prepare('INSERT INTO pedidos (id, token, creado, estado, cliente, lineas, envio, subtotal_cent, descuento_cent, promos, envio_cent, total_cent, pago_ref, reserva, reserva_hasta, ip_h, email_h, metodo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, token, nowIso(), manual ? 'whatsapp' : 'pendiente_pago', JSON.stringify(v.cliente), JSON.stringify(c.lineas), JSON.stringify(op), c.subtotalCent, c.descuentoCent, JSON.stringify(promos), op.cent, total, ses.id, rs.hecho.length ? 1 : 0, new Date(Date.now() + (manual ? RESERVA_WA_MIN : RESERVA_MIN) * 60000).toISOString(), ipH, emailH, manual ? metodo : '').run();
  } catch (e) { await soltar(env, rs.hecho); throw e; }
  return json(201, manual ? { pedido: id, token, modo: 'whatsapp', metodo, totalCent: total } : { pedido: id, token, pagoUrl: ses.url, totalCent: total });
}
async function estadoPedido(req, env, token, ipH) {
  if (!/^[0-9a-f]{32}$/.test(token)) return fail(404, 'no_encontrado', 'Pedido no encontrado.');
  if (!await rateLimit(env, 'estado', ipH, 120, 600)) return fail(429, 'demasiadas_peticiones', 'Espera un momento.');
  const p = await env.DB.prepare('SELECT id, creado, estado, lineas, envio, subtotal_cent, descuento_cent, envio_cent, total_cent, pagado_en, fase, transportista, codigo_seg, fase_en, metodo FROM pedidos WHERE token = ?').bind(token).first();
  if (!p) return fail(404, 'no_encontrado', 'Pedido no encontrado.');
  // sin dirección, email ni teléfono: solo lo necesario para la página de confirmación
  return json(200, { id: p.id, creado: p.creado, estado: p.estado, lineas: parseJSON(p.lineas, []).map(l => ({ nombre: l.nombre, cant: l.cant, variante: l.variante, totalCent: l.totalCent })), envio: (parseJSON(p.envio, {}) || {}).nombre || '', subtotalCent: p.subtotal_cent, descuentoCent: p.descuento_cent, envioCent: p.envio_cent, totalCent: p.total_cent, metodo: p.metodo || '', seguimiento: vistaSeguimiento(p) });
}

// ---------- v1.4 · Seguimiento: «¿dónde está mi pedido?» ----------
// Dos formas de entrar: el ENLACE SECRETO de la página de gracias (token aleatorio de 128 bits) o el nº de pedido + el EMAIL de la compra.
// Respuesta idéntica si algo no cuadra (no se puede averiguar qué pedidos o emails existen) y límites por IP y por pedido.
const iguales = (a, b) => { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; };
const NO_SEG = ['no_encontrado', 'No encontramos ese pedido. Revisa el número y el email de la compra, o escríbenos y lo miramos.'];
async function seguimiento(req, env, ipH) {
  if (!await rateLimit(env, 'seguir', ipH, 20, 600)) return fail(429, 'demasiadas_peticiones', 'Has consultado muchas veces seguidas. Espera unos minutos o escríbenos por WhatsApp.');
  const b = await readJSON(req, 2048); if (b.error) return fail(400, 'peticion_invalida', 'Petición no válida.');
  const id = String(b.data.pedido || '').trim().toUpperCase().slice(0, 30), email = String(b.data.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^W-\d{8}-[0-9A-F]{6}$/.test(id) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(404, ...NO_SEG);
  if (await isLimited(env, 'seguir_pedido', id, 8, 3600)) return fail(404, ...NO_SEG); // tras 8 fallos con ese pedido, ni se mira (no se puede adivinar el email)
  const p = await env.DB.prepare('SELECT id, creado, estado, lineas, envio, pagado_en, fase, transportista, codigo_seg, fase_en, email_h, cliente FROM pedidos WHERE id = ?').bind(id).first();
  const eh = (await sha256hex((env.SAL_REGISTRO || env.CLAVE_PEDIDOS || 'sin-sal') + '|' + email)).slice(0, 16);
  const cli = p ? parseJSON(p.cliente, {}) || {} : {};
  const ok = !!p && (p.email_h ? iguales(p.email_h, eh) : String(cli.email || '').toLowerCase() === email && !!cli.email);
  if (!ok) { await rateLimit(env, 'seguir_pedido', id, 8, 3600); return fail(404, ...NO_SEG); }
  return json(200, { seguimiento: vistaSeguimiento(p) });
}
// El PROGRAMA publica la fase de cada pedido pagado (firma de la clave de pedidos)
async function publicarSeguimiento(env, d) {
  const lista = (Array.isArray(d.pedidos) ? d.pedidos : []).slice(0, 100), now = nowIso(), ops = [];
  let cobrados = 0, cancelados = 0;
  for (const x of lista) {
    const id = String(x && x.id || ''), fase = String(x && x.fase || '');
    if (!/^W-\d{8}-[0-9A-F]{6}$/.test(id)) continue;
    // v1.5 · pedidos «por WhatsApp»: el estado del pedido en el programa decide. Confirmado o más allá = cobrado (Bizum/efectivo) · Cancelado = se libera lo apartado.
    // (solo pedidos sin pago online: un pedido de Stripe no se toca desde aquí)
    if (x.cobro === 'cobrado' || x.cobro === 'cancelado') {
      const p = await env.DB.prepare("SELECT id, estado, lineas, pago_ref, total_cent FROM pedidos WHERE id = ? AND pago_ref = 'whatsapp'").bind(id).first();
      if (p && x.cobro === 'cobrado' && (p.estado === 'whatsapp' || p.estado === 'expirado')) { await marcarPagado(env, p, p.estado === 'expirado' ? ['Cobrado después de caducar la reserva: revisa el stock'] : []); cobrados++; }
      else if (p && x.cobro === 'cancelado' && p.estado === 'whatsapp') {
        if (!await liberarPedido(env, p.id, p.lineas, 'cancelado')) await env.DB.prepare("UPDATE pedidos SET estado = 'cancelado' WHERE id = ? AND estado = 'whatsapp'").bind(p.id).run();
        cancelados++;
      }
    }
    if (x.cobro === 'cancelado' || !faseOk(fase)) continue; // un pedido cancelado en el programa no cambia de fase
    const cod = limpiarCodigo(x.codigo), transp = String(x.transportista || '').replace(/[^\p{L}\p{N} .&+-]/gu, '').trim().slice(0, 30);
    ops.push(env.DB.prepare("UPDATE pedidos SET fase = ?, transportista = ?, codigo_seg = ?, fase_en = ? WHERE id = ? AND estado = 'pagado' AND (fase <> ? OR transportista <> ? OR codigo_seg <> ?)").bind(fase, transp, codigoOk(cod) ? cod : '', now, id, fase, transp, codigoOk(cod) ? cod : ''));
  }
  const rs = ops.length ? await env.DB.batch(ops) : [];
  return { ok: true, recibidos: lista.length, actualizados: rs.reduce((a, r) => a + ((r.meta && r.meta.changes) || 0), 0), cobrados, cancelados };
}

// Pasa un pedido de «apartado» a «vendido» y lo marca pagado (Stripe o cobro por Bizum/efectivo confirmado desde el programa).
// Solo lo que tiene stock contado descuenta; quien «reclama» el cambio de reserva es el único que descuenta: un aviso repetido no descuenta dos veces.
async function marcarPagado(env, p, avisos) {
  const lines = parseJSON(p.lineas, []), tenia = (await env.DB.prepare('UPDATE pedidos SET reserva = 0 WHERE id = ? AND reserva = 1').bind(p.id).run()).meta.changes > 0;
  for (const [pid, cant] of unidadesPorProducto(lines)) {
    const nom = (lines.find(l => l.id === pid) || {}).nombre || pid;
    const r = await env.DB.prepare('UPDATE productos SET stock = stock - ?' + (tenia ? ', reservado = MAX(reservado - ?, 0)' : '') + ' WHERE id = ? AND stock IS NOT NULL AND stock >= ?').bind(...(tenia ? [cant, cant, pid, cant] : [cant, pid, cant])).run();
    if (!(r.meta && r.meta.changes)) {
      if (tenia) await env.DB.prepare('UPDATE productos SET reservado = MAX(reservado - ?, 0) WHERE id = ?').bind(cant, pid).run();
      const st = await env.DB.prepare('SELECT stock FROM productos WHERE id = ?').bind(pid).first(); if (st && st.stock !== null) avisos.push('Sin stock suficiente de ' + nom + ' al pagar');
    }
  }
  const ahora = nowIso();
  await env.DB.prepare("UPDATE pedidos SET estado = 'pagado', pagado_en = ?, aviso = ?, purgar_en = CASE WHEN recogido = 1 THEN ? ELSE purgar_en END WHERE id = ?").bind(ahora, avisos.join('; '), new Date(Date.now() + 30 * 864e5).toISOString(), p.id).run();
}

// ---------- Webhook de Stripe ----------
async function webhook(req, env) {
  const b = await readBody(req, 256 * 1024); if (b.error) return fail(413, 'demasiado_grande', '');
  const v = await verificarWebhook(env, b.text, req.headers.get('Stripe-Signature'));
  if (!v.ok) { await secLog(env, req, 'webhook_rechazado', v.motivo); return fail(400, 'firma', 'Firma no válida.'); }
  const ev = parseJSON(b.text, {}), s = (ev.data && ev.data.object) || {}, pid = (s.metadata && s.metadata.pedido) || s.client_reference_id;
  if (!pid) return json(200, { recibido: true });
  const p = await env.DB.prepare('SELECT id, estado, lineas, pago_ref, total_cent FROM pedidos WHERE id = ?').bind(pid).first();
  if (!p || (s.id && p.pago_ref && s.id !== p.pago_ref)) { await secLog(env, req, 'webhook_desconocido', 'pedido'); return json(200, { recibido: true }); }
  if ((ev.type === 'checkout.session.completed' && s.payment_status === 'paid') || ev.type === 'checkout.session.async_payment_succeeded') {
    if (p.estado !== 'pagado') {
      const avisos = [];
      // el importe que Stripe dice haber cobrado debe ser el del pedido: si no, se marca para revisar a mano (el pedido NO se pierde)
      if (s.amount_total !== undefined && (Number(s.amount_total) !== Number(p.total_cent) || String(s.currency || 'eur').toLowerCase() !== 'eur')) { avisos.push('REVISAR: Stripe cobró ' + (Number(s.amount_total) / 100).toFixed(2) + ' ' + String(s.currency || '').toUpperCase() + ' y el pedido era de ' + (p.total_cent / 100).toFixed(2) + ' EUR'); await secLog(env, req, 'importe_distinto', 'webhook'); }
      await marcarPagado(env, p, avisos);
    }
  } else if (ev.type === 'checkout.session.expired' && p.estado === 'pendiente_pago') {
    if (!await liberarPedido(env, p.id, p.lineas, 'expirado')) await env.DB.prepare("UPDATE pedidos SET estado = 'expirado' WHERE id = ? AND estado = 'pendiente_pago'").bind(p.id).run();
  } else if (ev.type === 'checkout.session.async_payment_failed' && p.estado === 'pendiente_pago') {
    if (!await liberarPedido(env, p.id, p.lineas, 'fallido')) await env.DB.prepare("UPDATE pedidos SET estado = 'fallido' WHERE id = ? AND estado = 'pendiente_pago'").bind(p.id).run();
  }
  return json(200, { recibido: true });
}

// ---------- Rutas internas (programa) ----------
function validFoto(f) {
  if (!f || typeof f !== 'object') return 'foto';
  if (f.id && !f.datos) return /^f_[0-9a-f]{20}$/.test(f.id) ? '' : 'foto_id';
  if (!['image/webp', 'image/jpeg', 'image/png'].includes(f.mime)) return 'formato';
  if (typeof f.datos !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(f.datos)) return 'base64';
  const head = atob(f.datos.slice(0, 24));
  const ok = f.mime === 'image/jpeg' ? head.charCodeAt(0) === 0xff && head.charCodeAt(1) === 0xd8 : f.mime === 'image/png' ? head.slice(1, 4) === 'PNG' : head.slice(0, 4) === 'RIFF' && head.slice(8, 12) === 'WEBP';
  if (!ok) return 'contenido';
  if (f.datos.length * 0.75 > MAX_FOTO) return 'tamano';
  return '';
}
const int = (v, min, max, def) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : def; };
const str = (v, max) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max);
function cleanProducto(p) {
  const e = [];
  const id = str(p.id, 40); if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) e.push('id');
  const nombre = str(p.nombre, 120).trim(); if (nombre.length < 2) e.push('nombre');
  const precio = int(p.precio_cent, 1, 10000000, null); if (precio === null) e.push('precio');
  // (no hay «precio de oferta» por producto: los descuentos SOLO salen de campañas/promociones reales)
  const vars = Array.isArray(p.variantes) ? p.variantes.slice(0, 4).map(v => ({ nombre: str(v && v.nombre, 30).trim(), valores: (Array.isArray(v && v.valores) ? v.valores : []).slice(0, 30).map(x => str(x, 40).trim()).filter(Boolean) })).filter(v => v.nombre && v.valores.length) : [];
  const car = Array.isArray(p.caracteristicas) ? p.caracteristicas.slice(0, 20).map(x => [str(x && x[0], 40), str(x && x[1], 160)]).filter(x => x[0] && x[1]) : [];
  const stock = p.stock === null || p.stock === undefined || p.stock === '' ? null : int(p.stock, 0, 100000, -1); if (stock === -1) e.push('stock');
  return { errores: e, p: { id, nombre, slug: slugify(p.slug || nombre), descripcion: str(p.descripcion, 4000), caracteristicas: JSON.stringify(car), categoria: str(p.categoria, 60).trim(), precio_cent: precio,
    destacado: p.destacado ? 1 : 0, personalizable: p.personalizable ? 1 : 0, novedad: p.novedad ? 1 : 0, peso_g: int(p.peso_g, 0, 30000, 0), variantes: JSON.stringify(vars), stock, plazo_dias: int(p.plazo_dias, 0, 60, 3),
    relacionados: JSON.stringify((Array.isArray(p.relacionados) ? p.relacionados : []).slice(0, 8).map(x => str(x, 40)).filter(x => /^[A-Za-z0-9_-]{3,40}$/.test(x))), seo_titulo: str(p.seo_titulo, 70), seo_desc: str(p.seo_desc, 170), orden: int(p.orden, -100000, 100000, 0) } };
}
async function upsertProducto(env, d) {
  const c = cleanProducto(d.producto || {});
  if (c.errores.length) return fail(422, 'datos', 'Datos del producto no válidos: ' + c.errores.join(', ') + '.');
  const fotos = Array.isArray(d.fotos) ? d.fotos : [];
  if (fotos.length > MAX_FOTOS) return fail(422, 'fotos', 'Máximo ' + MAX_FOTOS + ' fotos por producto.');
  for (const f of fotos) { const m = validFoto(f); if (m) return fail(422, 'fotos', 'Foto no válida (' + m + '). Solo WebP, JPEG o PNG reducidas (máx. 1,2 MB).'); }
  const p = c.p;
  // dirección única: si otro producto ya usa el slug, se le añade un número
  let slug = p.slug, n = 2;
  while (await env.DB.prepare('SELECT 1 FROM productos WHERE slug = ? AND id <> ?').bind(slug, p.id).first()) slug = p.slug.slice(0, 64) + '-' + n++;
  const ids = [], stmts = [];
  for (const f of fotos) {
    if (f.id && !f.datos) { const ex = await env.DB.prepare('SELECT id FROM fotos WHERE id = ? AND producto_id = ?').bind(f.id, p.id).first(); if (!ex) return fail(422, 'fotos', 'Una foto que se quería mantener ya no existe: vuelve a enviarla.'); ids.push(f.id); continue; }
    const fid = 'f_' + (await sha256hex(f.datos)).slice(0, 20);
    ids.push(fid);
    stmts.push(env.DB.prepare('INSERT INTO fotos (id, producto_id, mime, ancho, alto, datos, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET producto_id = excluded.producto_id').bind(fid, p.id, f.mime, int(f.ancho, 0, 10000, 0), int(f.alto, 0, 10000, 0), f.datos, nowIso()));
  }
  if (stmts.length) await env.DB.batch(stmts);
  const uniq = [...new Set(ids)];
  await env.DB.prepare(`INSERT INTO productos (id, slug, nombre, descripcion, caracteristicas, categoria, precio_cent, destacado, personalizable, novedad, peso_g, variantes, stock, plazo_dias, fotos, relacionados, seo_titulo, seo_desc, orden, estado, actualizado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'publicado', ?)
    ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, nombre=excluded.nombre, descripcion=excluded.descripcion, caracteristicas=excluded.caracteristicas, categoria=excluded.categoria, precio_cent=excluded.precio_cent, destacado=excluded.destacado, personalizable=excluded.personalizable, novedad=excluded.novedad, peso_g=excluded.peso_g, variantes=excluded.variantes, stock=excluded.stock, plazo_dias=excluded.plazo_dias, fotos=excluded.fotos, relacionados=excluded.relacionados, seo_titulo=excluded.seo_titulo, seo_desc=excluded.seo_desc, orden=excluded.orden, estado='publicado', actualizado=excluded.actualizado`)
    .bind(p.id, slug, p.nombre, p.descripcion, p.caracteristicas, p.categoria, p.precio_cent, p.destacado, p.personalizable, p.novedad, p.peso_g, p.variantes, p.stock, p.plazo_dias, JSON.stringify(uniq), p.relacionados, p.seo_titulo, p.seo_desc, p.orden, nowIso()).run();
  // fotos que ya no usa el producto: se borran
  const old = (await env.DB.prepare('SELECT id FROM fotos WHERE producto_id = ?').bind(p.id).all()).results || [];
  const del = old.filter(f => !uniq.includes(f.id)).map(f => env.DB.prepare('DELETE FROM fotos WHERE id = ?').bind(f.id));
  if (del.length) await env.DB.batch(del);
  return json(200, { ok: true, id: p.id, slug, fotos: uniq, url: '/p/' + slug });
}
const CFG_MAX = 64 * 1024;
function cleanConfig(c) {
  const s = (v, m) => str(v, m).trim();
  const E = c.envios || {}, paises = (Array.isArray(E.paises) ? E.paises : []).map(x => s(x, 2).toUpperCase()).filter(x => /^[A-Z]{2}$/.test(x)).slice(0, 30);
  const opciones = (Array.isArray(E.opciones) ? E.opciones : []).slice(0, 3).map(o => ({
    id: s(o.id, 20).replace(/[^a-z0-9_-]/gi, ''), nombre: s(o.nombre, 40), descripcion: s(o.descripcion, 120), transportista: s(o.transportista, 40), plazo: s(o.plazo, 40), confirmado: o.confirmado === true,
    paises: (Array.isArray(o.paises) ? o.paises : []).map(x => s(x, 2).toUpperCase()).filter(x => /^[A-Z]{2}$/.test(x)),
    tramos: (Array.isArray(o.tramos) ? o.tramos : []).slice(0, 20).map(t => ({ hastaG: int(t.hastaG, 1, 100000, 0), cent: int(t.cent, 0, 100000, -1) })).filter(t => t.hastaG > 0 && t.cent >= 0)
  })).filter(o => o.id && o.nombre);
  const wa = c.whatsapp && typeof c.whatsapp === 'object' ? { numero: s(c.whatsapp.numero, 20).replace(/[^\d+]/g, ''), mensaje: s(c.whatsapp.mensaje, 200) } : null;
  const q = c.quienes && typeof c.quienes === 'object' ? { titulo: s(c.quienes.titulo, 80), texto: s(c.quienes.texto, 3000), puntos: (Array.isArray(c.quienes.puntos) ? c.quienes.puntos : []).slice(0, 9).map(x => ({ icono: s(x.icono, 4), titulo: s(x.titulo, 50), texto: s(x.texto, 200) })).filter(x => x.titulo) } : null;
  const L = c.legal || {}, legal = {}; ['titular', 'nif', 'direccion', 'email', 'telefono', 'registro', 'devolucionesDias'].forEach(k => { legal[k] = s(L[k], 200); });
  return { tienda: { nombre: s((c.tienda || {}).nombre, 60) || 'CelebriDiseños', lema: s((c.tienda || {}).lema, 120), color: /^#[0-9a-f]{6}$/i.test((c.tienda || {}).color || '') ? c.tienda.color : '#0fb5d4', instagram: s((c.tienda || {}).instagram, 40).replace(/[^\w.]/g, ''), tiktok: s((c.tienda || {}).tiktok, 40).replace(/[^\w.]/g, '') },
    whatsapp: wa, quienes: q, legal, masVendidos: (Array.isArray(c.masVendidos) ? c.masVendidos : []).slice(0, 12).map(x => s(x, 40)).filter(x => /^[A-Za-z0-9_-]{3,40}$/.test(x)), categorias: (Array.isArray(c.categorias) ? c.categorias : []).slice(0, 30).map(x => s(x, 40)).filter(Boolean),
    envios: { paises, opciones, gratisDesdeCent: int(E.gratisDesdeCent, 0, 10000000, 0), gratisOpcion: s(E.gratisOpcion, 20) },
    descuentoWeb: c.descuentoWeb && typeof c.descuentoWeb === 'object' ? { activo: c.descuentoWeb.activo === true, pct: Math.min(30, Math.max(0, Math.round(Number(c.descuentoWeb.pct) * 100) / 100 || 0)), combinable: c.descuentoWeb.combinable === true } : { activo: false, pct: 0, combinable: false } };
}
async function purgar(env) {
  // minimización de datos: se borran los datos personales 30 días después de que el programa recoge el pedido,
  // y los pedidos que nunca se pagaron, a los 7 días
  const now = nowIso();
  await env.DB.prepare("UPDATE pedidos SET cliente = '{\"purgado\":true}' WHERE recogido = 1 AND purgar_en IS NOT NULL AND purgar_en < ? AND cliente <> '{\"purgado\":true}'").bind(now).run();
  await env.DB.prepare("UPDATE pedidos SET estado = 'expirado' WHERE estado = 'whatsapp' AND creado < ?").bind(new Date(Date.now() - 30 * 864e5).toISOString()).run(); // por WhatsApp sin resolver en 30 días
  await env.DB.prepare("DELETE FROM pedidos WHERE estado IN ('pendiente_pago','expirado','fallido','cancelado') AND creado < ?").bind(new Date(Date.now() - 7 * 864e5).toISOString()).run();
}
async function interno(req, env, path) {
  const isGet = req.method === 'GET';
  let body = { bytes: new Uint8Array(0), data: {} };
  if (!isGet) { body = await readJSON(req, MAX_INTERNAL_BODY); if (body.error) return fail(400, 'peticion_invalida', 'Petición no válida.'); }
  const needed = /^\/api\/interno\/(producto|retirar|config|campanas)$/.test(path) ? ['pub'] : /^\/api\/interno\/(pedidos|seguimiento)/.test(path) ? ['ped'] : ['pub', 'ped'];
  const ipH = await ipHash(req, env);
  if (await isLimited(env, 'auth_fallida', ipH, 20, 600)) return fail(429, 'bloqueado', 'Demasiados intentos fallidos. Espera 10 minutos.');
  const v = await verifyInternal(req, env, body.bytes, needed);
  if (!v.ok) {
    await secLog(env, req, 'acceso_denegado', v.motivo);
    const okRate = await rateLimit(env, 'auth_fallida', ipH, 20, 600);
    if (!okRate) return fail(429, 'bloqueado', 'Demasiados intentos fallidos. Espera 10 minutos.');
    return fail(v.config ? 503 : 401, 'no_autorizado', v.config ? 'La clave de esta API no está configurada en el servidor.' : 'No autorizado.');
  }
  await purgar(env);
  const d = body.data;
  if (path === '/api/interno/estado') {
    const np = await env.DB.prepare("SELECT COUNT(*) AS n FROM productos WHERE estado = 'publicado'").first();
    const nq = await env.DB.prepare("SELECT COUNT(*) AS n FROM pedidos WHERE estado IN ('pagado','whatsapp') AND recogido = 0").first();
    const sg = (await env.DB.prepare('SELECT tipo, COUNT(*) AS n FROM seguridad WHERE ts > ? GROUP BY tipo').bind(new Date(Date.now() - 864e5).toISOString()).all()).results || [];
    return json(200, { ok: true, version: VERSION, clave: v.key, productos: np.n, pedidosPendientes: nq.n, pago: { activo: pagoActivo(env), prueba: modoPrueba(env) }, claves: { publicar: !!(env.CLAVE_PUBLICAR && env.CLAVE_PUBLICAR.length >= 32), pedidos: !!(env.CLAVE_PEDIDOS && env.CLAVE_PEDIDOS.length >= 32) }, seguridad24h: sg });
  }
  if (path === '/api/interno/producto' && !isGet) return upsertProducto(env, d);
  if (path === '/api/interno/retirar' && !isGet) {
    const id = str(d.id, 40); if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) return fail(422, 'datos', 'Producto no válido.');
    const r = await env.DB.prepare("UPDATE productos SET estado = 'retirado', actualizado = ? WHERE id = ?").bind(nowIso(), id).run();
    if (d.borrarFotos) await env.DB.prepare('DELETE FROM fotos WHERE producto_id = ?').bind(id).run();
    return json(200, { ok: true, retirado: !!(r.meta && r.meta.changes) });
  }
  if (path === '/api/interno/config' && !isGet) {
    if (body.bytes.byteLength > CFG_MAX) return fail(413, 'demasiado_grande', 'Configuración demasiado grande.');
    const c = cleanConfig(d.config || {});
    await env.DB.prepare("INSERT INTO config (clave, valor, actualizado) VALUES ('publica', ?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizado = excluded.actualizado").bind(JSON.stringify(c), nowIso()).run();
    return json(200, { ok: true, config: c });
  }
  if (path === '/api/interno/campanas' && !isGet) {
    // se sustituye el conjunto completo (lo que no venga, deja de existir): así la web es siempre copia exacta del programa
    const cs = [], ps = [];
    for (const c of (Array.isArray(d.campanas) ? d.campanas : []).slice(0, 30)) { const r = limpiarCampana(c || {}); if (r.error) return fail(422, 'campana', 'Campaña no válida: ' + r.error + '.'); cs.push(r.campana); }
    for (const p of (Array.isArray(d.promociones) ? d.promociones : []).slice(0, 60)) { const r = limpiarPromo(p || {}); if (r.error) return fail(422, 'promocion', 'Promoción no válida: ' + r.error + '.'); if (r.promo.campanaId && !cs.some(c => c.id === r.promo.campanaId)) return fail(422, 'promocion', 'La promoción «' + r.promo.nombre + '» apunta a una campaña que no existe.'); ps.push(r.promo); }
    const now = nowIso();
    await env.DB.batch([env.DB.prepare('DELETE FROM campanas'), env.DB.prepare('DELETE FROM promociones')]
      .concat(cs.map(c => env.DB.prepare('INSERT INTO campanas (id, datos, actualizado) VALUES (?, ?, ?)').bind(c.id, JSON.stringify(c), now)))
      .concat(ps.map(p => env.DB.prepare('INSERT INTO promociones (id, campana_id, datos, actualizado) VALUES (?, ?, ?, ?)').bind(p.id, p.campanaId || null, JSON.stringify(p), now))));
    const t = Date.now();
    return json(200, { ok: true, campanas: cs.map(c => Object.assign({ id: c.id, nombre: c.nombre }, estadoCampana(c, t))), activas: promosActivas(cs, ps, t).map(p => p.id) });
  }
  if (path === '/api/interno/pedidos' && isGet) {
    const rows = (await env.DB.prepare("SELECT * FROM pedidos WHERE estado IN ('pagado','whatsapp') AND recogido = 0 ORDER BY creado LIMIT 100").all()).results || [];
    return json(200, { pedidos: rows.map(p => ({ id: p.id, creado: p.creado, pagadoEn: p.pagado_en, estado: p.estado, cliente: parseJSON(p.cliente, {}), lineas: parseJSON(p.lineas, []), envio: parseJSON(p.envio, {}), subtotalCent: p.subtotal_cent, descuentoCent: p.descuento_cent, promos: parseJSON(p.promos, []), envioCent: p.envio_cent, totalCent: p.total_cent, pagoRef: p.pago_ref, metodo: p.metodo || '', aviso: p.aviso })) });
  }
  if (path === '/api/interno/seguimiento' && !isGet) return json(200, await publicarSeguimiento(env, d));
  if (path === '/api/interno/pedidos/recoger' && !isGet) {
    const ids = (Array.isArray(d.ids) ? d.ids : []).slice(0, 100).map(x => str(x, 30)).filter(x => /^W-\d{8}-[0-9A-F]{6}$/.test(x));
    const purge = new Date(Date.now() + 30 * 864e5).toISOString(), now = nowIso();
    // los pagados se borran de la tienda a los 30 días; los «por WhatsApp» siguen vivos hasta que se cobren o se cancelen (entonces se purgan igual)
    if (ids.length) await env.DB.batch(ids.flatMap(id => [env.DB.prepare("UPDATE pedidos SET recogido = 1, recogido_en = ?, purgar_en = ? WHERE id = ? AND estado = 'pagado'").bind(now, purge, id), env.DB.prepare("UPDATE pedidos SET recogido = 1, recogido_en = ? WHERE id = ? AND estado = 'whatsapp'").bind(now, id)]));
    return json(200, { ok: true, recogidos: ids.length });
  }
  return fail(404, 'no_encontrado', 'Ruta no encontrada.');
}

// ---------- Entrada ----------
export async function handleApi(req, env, ctx) {
  const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '') || '/', m = req.method;
  try {
    if (!env.DB) return fail(503, 'sin_base_de_datos', 'La base de datos de la tienda no está conectada.');
    await migrar(env);
    if (m === 'OPTIONS') return new Response(null, { status: 204, headers: Object.assign({ Allow: 'GET, POST' }, SEC_HEADERS) }); // sin CORS: solo la propia web
    if (path.startsWith('/api/interno/')) return await interno(req, env, path);
    if (path === '/api/stripe/webhook' && m === 'POST') return await webhook(req, env);
    const ipH = await ipHash(req, env);
    if (m === 'GET' && path === '/api/salud') return json(200, { ok: true, version: VERSION });
    if (m === 'GET' && path === '/api/catalogo') return await catalogo(req, env);
    let mm;
    if (m === 'GET' && (mm = path.match(/^\/api\/producto\/([a-z0-9-]{1,80})$/))) return await producto(req, env, mm[1]);
    if (m === 'GET' && (mm = path.match(/^\/api\/img\/([A-Za-z0-9_]{1,40})$/))) return await imagen(req, env, mm[1], ctx);
    if (m === 'POST' && path === '/api/envio/cotizar') return await cotizarEnvio(req, env, ipH);
    if (m === 'POST' && path === '/api/pedido') return await crearPedido(req, env, ipH, url.origin);
    if (m === 'GET' && (mm = path.match(/^\/api\/pedido\/([^/]{1,64})$/))) return await estadoPedido(req, env, mm[1], ipH);
    if (m === 'POST' && path === '/api/seguimiento') return await seguimiento(req, env, ipH);
    return fail(404, 'no_encontrado', 'Ruta no encontrada.');
  } catch (e) {
    // el detalle del error NUNCA sale al público (podría contener datos internos)
    await secLog(env, req, 'error', String(e && e.name || 'Error'));
    return fail(500, 'error_interno', 'Ha habido un problema. Inténtalo de nuevo en unos minutos.');
  }
}
