// Pruebas de la API segura (y pruebas de seguridad DEFENSIVAS sobre nuestro propio sistema).
// node test/api.test.js
import assert from 'node:assert/strict';
import { start, firmar, randKey } from './servidor.js';
import { ejemplo, PRODUCTOS_PRUEBA, pngDemo } from './ejemplo.js';
import { cotizar, validarCliente } from '../src/logica.js';
import { estadoCampana, promosActivas } from '../src/campanas.js';

let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('  ✔ ' + name); } catch (e) { fail++; out.push('  ✘ ' + name + '\n      ' + String(e.stack || e).split('\n').slice(0, 4).join(' | ')); } }

const s = await start({ stripe: true });
await ejemplo(s);
const F = s.realFetch, U = p => s.url + p;
const getJ = async (p, h) => { const r = await F(U(p), { headers: h }); return { status: r.status, headers: r.headers, data: await r.json().catch(() => null) }; };
const postJ = async (p, d, h) => { if (p === '/api/pedido' && d && d.ms === undefined) d = Object.assign({ ms: 9000 }, d); const r = await F(U(p), { method: 'POST', body: JSON.stringify(d), headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}) }); return { status: r.status, headers: r.headers, data: await r.json().catch(() => null) }; };
const cliente = { nombre: 'Ana Prueba', email: 'ana@example.com', telefono: '+34 600 000 001', direccion: 'Calle Falsa 1, 2ºB', cp: '28001', ciudad: 'Madrid', provincia: 'Madrid', pais: 'ES' };
let ipN = 1; const ip = () => ({ 'X-Test-IP': '10.0.0.' + (ipN++) });

out.push('\nCATÁLOGO PÚBLICO');
await t('El catálogo solo trae lo público (sin costes ni nada interno) y SIN campañas no hay ningún descuento ni precio tachado', async () => {
  const r = await getJ('/api/catalogo');
  assert.equal(r.status, 200); assert.equal(r.data.productos.length, 6);
  assert(r.data.productos.every(p => p.antes === null && p.descuento === 0 && p.promo === null), 'nada tachado');
  assert.equal(r.data.promos.campana, null); assert.deepEqual(r.data.promos.promociones, []);
  assert(/^\d{4}-\d{2}-\d{2}T/.test(r.data.ahora), 'hora del servidor para el temporizador');
  const txt = JSON.stringify(r.data);
  assert(!/coste|margen|proveedor|CLAVE|whsec|sk_test/i.test(txt), 'nada interno en el catálogo');
  assert.deepEqual(r.data.config.envios.opciones.map(o => o.id), ['economico', 'estandar'], 'la opción no confirmada no se publica');
  assert.equal(r.data.config.pago.activo, true); assert.equal(r.data.config.pago.prueba, true);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});
await t('Fotos: se sirven con su tipo y caché larga; un id raro no llega a la base de datos', async () => {
  const c = (await getJ('/api/catalogo')).data, id = c.productos[0].fotos[0];
  const r = await F(U('/api/img/' + id)); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/png'); assert.match(r.headers.get('cache-control'), /immutable/);
  const b = Buffer.from(await r.arrayBuffer()); assert.equal(b.slice(1, 4).toString(), 'PNG');
  const q0 = s.env.DB.queries; assert.equal((await F(U("/api/img/f_' OR 1=1"))).status, 404); assert.equal(s.env.DB.queries, q0, 'ni siquiera consulta');
});
await t('Ficha /p/<slug> generada en el servidor: título, descripción, canónica, datos estructurados y CSP', async () => {
  const r = await F(U('/p/maceta-luna')), h = await r.text();
  assert.equal(r.status, 200); assert.match(h, /<title>Maceta Luna · CelebriDiseños<\/title>/); assert.match(h, /"@type":"Product"/); assert.match(h, /"price":"18.00"/); assert(!/badge-oferta|<s>/.test(h), 'sin tachados');
  assert.match(h, /rel="canonical" href="http:\/\/127\.0\.0\.1:\d+\/p\/maceta-luna"/);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal((await F(U('/p/no-existe'))).status, 404);
  const sm = await (await F(U('/sitemap.xml'))).text(); assert.match(sm, /\/p\/lampara-nube/);
  assert.match(await (await F(U('/robots.txt'))).text(), /Disallow: \/api\/\nDisallow: \/cesta/);
});

out.push('\nENVÍOS (tarifas publicadas desde el programa)');
await t('Solo se ofrecen opciones CONFIRMADAS que cubren el peso y el país; envío gratis desde el importe configurado', async () => {
  const r = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_maceta', cant: 1, variante: { Color: 'Rosa' } }], pais: 'ES' }, ip());
  assert.equal(r.status, 200); assert.deepEqual(r.data.opciones.map(o => [o.id, o.cent]), [['economico', 433], ['estandar', 1365]]);
  const pt = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_maceta', cant: 1, variante: { Color: 'Rosa' } }], pais: 'PT' }, ip());
  assert.deepEqual(pt.data.opciones.map(o => o.id), ['estandar'], 'InPost solo España');
  const fr = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_maceta', cant: 1, variante: { Color: 'Rosa' } }], pais: 'FR' }, ip());
  assert.equal(fr.data.opciones.length, 0); assert.match(fr.data.aviso, /WhatsApp/);
  const big = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_lampara', cant: 2, variante: { Color: 'Azul' } }], pais: 'ES' }, ip());
  assert.deepEqual(big.data.opciones.map(o => [o.id, o.cent, o.gratis]), [['economico', 579, false], ['estandar', 0, true]], '64 € ≥ 60 €: estándar gratis');
  const heavy = cotizar({ envios: { paises: ['ES'], opciones: [{ id: 'a', nombre: 'A', confirmado: true, tramos: [{ hastaG: 1000, cent: 100 }] }] } }, 1500, 'ES', 0);
  assert.equal(heavy.opciones.length, 0, 'si el peso supera los tramos, no se inventa un precio');
});
await t('Variantes y cantidades se comprueban en el servidor', async () => {
  assert.equal((await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_maceta', cant: 1 }], pais: 'ES' }, ip())).data.mensaje, 'Elige color en «Maceta Luna».');
  assert.equal((await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_maceta', cant: 1, variante: { Color: 'Verde' } }], pais: 'ES' }, ip())).status, 422);
  assert.equal((await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_llavero', cant: 0 }], pais: 'ES' }, ip())).status, 422);
  assert.equal((await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_llavero', cant: 2.5 }], pais: 'ES' }, ip())).status, 422);
  assert.match((await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_organizador', cant: 1 }], pais: 'ES' }, ip())).data.mensaje, /agotado/);
  assert.match((await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_soporte', cant: 3 }], pais: 'ES' }, ip())).data.mensaje, /Solo quedan 2/);
  assert.equal((await postJ('/api/envio/cotizar', { lineas: [{ id: "x' OR '1'='1", cant: 1 }], pais: 'ES' }, ip())).status, 422, 'inyección: solo «no disponible»');
});

out.push('\nCOMPRA');
let pedido;
await t('Crear pedido: el PRECIO lo pone el servidor (lo que mande el navegador se ignora) y se abre el pago de Stripe', async () => {
  const r = await postJ('/api/pedido', { lineas: [{ id: 'p_maceta', cant: 2, variante: { Color: 'Blanco' }, precio: 1 }], cliente, envio: 'economico', acepto: true, totalVisto: 4033 }, ip());
  assert.equal(r.status, 201, JSON.stringify(r.data)); assert.match(r.data.pedido, /^W-\d{8}-[0-9A-F]{6}$/); assert.match(r.data.token, /^[0-9a-f]{32}$/);
  assert.equal(r.data.totalCent, 4033);
  const call = s.stripeCalls.at(-1).params;
  assert.equal(call.get('line_items[0][price_data][unit_amount]'), '1800'); assert(!call.has('discounts[0][coupon]'), 'sin promoción no hay cupón'); assert.equal(call.get('line_items[0][quantity]'), '2');
  assert.equal(call.get('line_items[1][price_data][product_data][name]'), 'Envío: Económico'); assert.equal(call.get('line_items[1][price_data][unit_amount]'), '433');
  assert.equal(call.get('customer_email'), 'ana@example.com'); assert.equal(call.get('metadata[pedido]'), r.data.pedido);
  assert(!call.has('payment_method_types[0]'), 'métodos de pago (tarjeta, Bizum…) los decide el panel de Stripe');
  assert.equal(s.stripeCalls.at(-1).headers['Idempotency-Key'], 'sesion-' + r.data.pedido);
  pedido = r.data;
});
await t('Sin aceptar condiciones, con datos mal o si el precio cambió: se explica y no se cobra', async () => {
  const L = [{ id: 'p_llavero', cant: 1 }];
  assert.equal((await postJ('/api/pedido', { lineas: L, cliente, envio: 'economico' }, ip())).data.error, 'condiciones');
  const bad = await postJ('/api/pedido', { lineas: L, cliente: Object.assign({}, cliente, { email: 'no', cp: '123', telefono: 'abc' }), envio: 'economico', acepto: true }, ip());
  assert.equal(bad.status, 422); assert.deepEqual(Object.keys(bad.data.errores).sort(), ['cp', 'email', 'telefono']);
  const ch = await postJ('/api/pedido', { lineas: L, cliente, envio: 'economico', acepto: true, totalVisto: 100 }, ip());
  assert.equal(ch.status, 409); assert.equal(ch.data.totalCent, 1033);
  assert.equal((await postJ('/api/pedido', { lineas: L, cliente, envio: 'rapido', acepto: true }, ip())).data.error, 'envio', 'opción no confirmada');
  const v = validarCliente(Object.assign({}, cliente, { nombre: '<img src=x onerror=alert(1)>' }), ['ES']); assert(!/[<>]/.test(v.cliente.nombre), 'sin etiquetas');
});
await t('Estado del pedido por su token: sin dirección, email ni teléfono', async () => {
  const r = await getJ('/api/pedido/' + pedido.token);
  assert.equal(r.status, 200); assert.equal(r.data.estado, 'pendiente_pago');
  assert(!/ana@example|Calle Falsa|600 000/.test(JSON.stringify(r.data)));
  assert.equal((await getJ('/api/pedido/' + 'f'.repeat(32))).status, 404);
});
await t('Webhook de Stripe: sin firma válida se rechaza; con firma, el pedido pasa a PAGADO y se descuenta el stock una sola vez', async () => {
  const ses = [...s.sessions.values()].find(x => x.pedido === pedido.pedido);
  const raw = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: ses.id, payment_status: 'paid', metadata: { pedido: pedido.pedido } } } });
  assert.equal((await F(U('/api/stripe/webhook'), { method: 'POST', body: raw, headers: { 'Stripe-Signature': 't=' + Math.floor(Date.now() / 1000) + ',v1=' + 'a'.repeat(64) } })).status, 400);
  assert.equal((await F(U('/api/stripe/webhook'), { method: 'POST', body: raw })).status, 400);
  assert.equal((await s.sendWebhook('checkout.session.completed', ses)).status, 200);
  assert.equal((await getJ('/api/pedido/' + pedido.token)).data.estado, 'pagado');
  // compra con stock contado
  const r = await postJ('/api/pedido', { lineas: [{ id: 'p_soporte', cant: 2 }], cliente, envio: 'economico', acepto: true }, ip());
  const s2 = [...s.sessions.values()].find(x => x.pedido === r.data.pedido);
  await s.sendWebhook('checkout.session.completed', s2); await s.sendWebhook('checkout.session.completed', s2);
  assert.equal(await s.env.DB.prepare("SELECT stock FROM productos WHERE id = 'p_soporte'").first('stock'), 0, '2 − 2 = 0 (el aviso repetido no descuenta dos veces)');
  assert.equal((await getJ('/api/catalogo')).data.productos.find(p => p.id === 'p_soporte').disponible, 'agotado');
  const reg = (await s.env.DB.prepare("SELECT * FROM seguridad WHERE tipo = 'webhook_rechazado'").all()).results; assert(reg.length >= 2);
});
await t('Sin claves de Stripe el pedido se REGISTRA «por WhatsApp» (apartado, sin llamar a Stripe) y la web lo anuncia como pago manual', async () => {
  const s2 = await start({ stripe: false }); await ejemplo(s2);
  try {
    const r = await s2.realFetch(s2.url + '/api/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lineas: [{ id: 'p_llavero', cant: 1 }], cliente, envio: 'economico', acepto: true, ms: 9000, metodo: 'efectivo' }) });
    const j = await r.json(); assert.equal(r.status, 201, JSON.stringify(j)); assert.equal(j.modo, 'whatsapp'); assert.equal(j.metodo, 'efectivo'); assert(!j.pagoUrl, 'no hay página de pago');
    assert.equal(s2.stripeCalls.length, 0, 'no se llama a Stripe');
    const p = await s2.env.DB.prepare('SELECT estado, metodo, pago_ref FROM pedidos WHERE id = ?').bind(j.pedido).first(); assert.equal(p.estado, 'whatsapp'); assert.equal(p.metodo, 'efectivo');
    const cfg = (await (await s2.realFetch(s2.url + '/api/catalogo')).json()).config;
    assert.equal(cfg.pago.activo, false); assert.equal(cfg.pago.manual, true); assert.deepEqual(cfg.pago.metodos, ['bizum', 'efectivo']);
  } finally { await s2.close(); }
});

out.push('\nPROGRAMA ↔ API (rutas internas firmadas)');
await t('El programa recoge los pedidos PAGADOS con los datos de envío; al marcarlos recogidos ya no vuelven', async () => {
  const r = await s.interno('GET', '/api/interno/pedidos');
  assert.equal(r.status, 200); assert.equal(r.data.pedidos.length, 2);
  const p = r.data.pedidos.find(x => x.id === pedido.pedido);
  assert.equal(p.cliente.email, 'ana@example.com'); assert.equal(p.totalCent, 4033); assert.equal(p.lineas[0].variante.Color, 'Blanco');
  assert.equal((await s.interno('POST', '/api/interno/pedidos/recoger', { ids: r.data.pedidos.map(x => x.id).concat(["x'; DROP TABLE pedidos;--"]) })).data.recogidos, 2);
  assert.equal((await s.interno('GET', '/api/interno/pedidos')).data.pedidos.length, 0);
  // minimización: 30 días después se borran los datos personales
  await s.env.DB.prepare("UPDATE pedidos SET purgar_en = '2000-01-01T00:00:00Z'").run();
  await s.interno('GET', '/api/interno/estado', null, 'ped');
  const c = await s.env.DB.prepare('SELECT cliente FROM pedidos WHERE id = ?').bind(pedido.pedido).first('cliente');
  assert.equal(c, '{"purgado":true}');
});
await t('Firma obligatoria: sin firma, firma falsa, hora antigua, nonce repetido o clave de otro permiso → NO AUTORIZADO', async () => {
  const body = JSON.stringify({ id: 'p_llavero' });
  assert.equal((await F(U('/api/interno/retirar'), { method: 'POST', body, headers: { 'Content-Type': 'application/json' } })).status, 401);
  const h = firmar(randKey(), 'pub', 'POST', '/api/interno/retirar', body);
  assert.equal((await F(U('/api/interno/retirar'), { method: 'POST', body, headers: Object.assign({ 'Content-Type': 'application/json' }, h) })).status, 401, 'clave inventada');
  const ok = firmar(s.env.CLAVE_PUBLICAR, 'pub', 'POST', '/api/interno/retirar', body);
  const tampered = JSON.stringify({ id: 'p_maceta' });
  assert.equal((await F(U('/api/interno/retirar'), { method: 'POST', body: tampered, headers: Object.assign({ 'Content-Type': 'application/json' }, ok) })).status, 401, 'cuerpo cambiado');
  const old = firmar(s.env.CLAVE_PUBLICAR, 'pub', 'POST', '/api/interno/retirar', body); old['X-Celebri-Ts'] = String(Date.now() - 10 * 60 * 1000);
  assert.equal((await F(U('/api/interno/retirar'), { method: 'POST', body, headers: Object.assign({ 'Content-Type': 'application/json' }, old) })).status, 401, 'hora antigua');
  const ped = firmar(s.env.CLAVE_PEDIDOS, 'ped', 'POST', '/api/interno/retirar', body);
  assert.equal((await F(U('/api/interno/retirar'), { method: 'POST', body, headers: Object.assign({ 'Content-Type': 'application/json' }, ped) })).status, 401, 'la clave de PEDIDOS no puede publicar');
  const pub = firmar(s.env.CLAVE_PUBLICAR, 'pub', 'GET', '/api/interno/pedidos', '');
  assert.equal((await F(U('/api/interno/pedidos'), { headers: pub })).status, 401, 'la clave de PUBLICAR no puede leer pedidos (datos personales)');
  const good = firmar(s.env.CLAVE_PEDIDOS, 'ped', 'GET', '/api/interno/estado', '');
  assert.equal((await F(U('/api/interno/estado'), { headers: good })).status, 200);
  assert.equal((await F(U('/api/interno/estado'), { headers: good })).status, 401, 'la misma petición copiada no se puede repetir');
  const reg = (await s.env.DB.prepare('SELECT * FROM seguridad').all()).results, regTxt = JSON.stringify(reg);
  assert(reg.some(r => r.detalle === 'firma_incorrecta') && reg.some(r => r.detalle === 'nonce_repetido') && reg.some(r => r.detalle === 'clave_no_permitida'));
  assert(!/127\.0\.0\.1|10\.0\.0\.|ana@example|whsec|sk_test/.test(regTxt), 'el registro no guarda IPs, emails ni secretos');
});
await t('Muchos intentos fallidos desde la misma IP → bloqueo de 10 minutos (aunque luego firme bien)', async () => {
  const h = { 'X-Test-IP': '10.9.9.9' };
  for (let i = 0; i < 20; i++) await F(U('/api/interno/estado'), { headers: Object.assign({}, h, firmar(randKey(), 'pub', 'GET', '/api/interno/estado', '')) });
  const r = await F(U('/api/interno/estado'), { headers: Object.assign({}, h, firmar(s.env.CLAVE_PUBLICAR, 'pub', 'GET', '/api/interno/estado', '')) });
  assert.equal(r.status, 429);
  assert.equal((await F(U('/api/interno/estado'), { headers: Object.assign({ 'X-Test-IP': '10.9.9.10' }, firmar(s.env.CLAVE_PUBLICAR, 'pub', 'GET', '/api/interno/estado', '')) })).status, 200, 'otra IP sigue funcionando');
});
await t('Clave no configurada o demasiado corta en el servidor → la API se niega (no funciona «abierta»)', async () => {
  const s3 = await start({ stripe: false, env: { CLAVE_PUBLICAR: 'corta' } });
  const r = await s3.interno('GET', '/api/interno/estado', null, 'pub', 'corta');
  assert.equal(r.status, 503); assert.match(r.data.mensaje, /no está configurada/);
  await s3.close();
});
await t('Publicar: valida todo (fotos reales WebP/JPEG/PNG, tamaños), IGNORA cualquier «precio de oferta» suelto y borra las fotos que sobran', async () => {
  const base = JSON.parse(JSON.stringify(PRODUCTOS_PRUEBA[2]));
  assert.equal((await s.interno('POST', '/api/interno/producto', Object.assign({}, base, { producto: Object.assign({}, base.producto, { oferta_cent: 300 }) }))).status, 200);
  assert.equal((await getJ('/api/producto/llavero-personalizado')).data.producto.antes, null, 'un descuento solo puede venir de una promoción real');
  assert.equal((await s.interno('POST', '/api/interno/producto', Object.assign({}, base, { fotos: [{ mime: 'image/png', datos: Buffer.from('<svg onload=alert(1)>').toString('base64') }] }))).status, 422, 'no es un PNG de verdad');
  assert.equal((await s.interno('POST', '/api/interno/producto', Object.assign({}, base, { fotos: [{ mime: 'image/svg+xml', datos: 'PHN2Zz4=' }] }))).status, 422, 'SVG no permitido');
  const before = (await s.env.DB.prepare("SELECT fotos FROM productos WHERE id = 'p_llavero'").first('fotos'));
  const nueva = { mime: 'image/png', datos: pngDemo(300, 300, '#000000', '#ffffff').toString('base64') };
  const r = await s.interno('POST', '/api/interno/producto', Object.assign({}, base, { fotos: [nueva] }));
  assert.equal(r.status, 200); assert.notEqual(JSON.stringify(r.data.fotos), before);
  assert.equal(await s.env.DB.prepare("SELECT COUNT(*) n FROM fotos WHERE producto_id = 'p_llavero'").first('n'), 1, 'la foto antigua se borró');
  const keep = await s.interno('POST', '/api/interno/producto', Object.assign({}, base, { fotos: [{ id: r.data.fotos[0] }] }));
  assert.deepEqual(keep.data.fotos, r.data.fotos, 'mantener una foto ya publicada sin volver a enviarla');
  // dirección única
  const dup = await s.interno('POST', '/api/interno/producto', { producto: Object.assign({}, base.producto, { id: 'p_llavero2' }), fotos: [] });
  assert.equal(dup.data.slug, 'llavero-personalizado-2');
});
await t('XSS: un nombre con HTML se muestra como texto (nunca se ejecuta) en la ficha del servidor', async () => {
  await s.interno('POST', '/api/interno/producto', { producto: { id: 'p_xss', nombre: '<script>alert(1)</script> Taza', precio_cent: 500, descripcion: '"><img src=x onerror=alert(1)>' }, fotos: [] });
  const h = await (await F(U('/p/script-alert-1-script-taza'))).text();
  assert(!/<script>alert\(1\)<\/script>/.test(h) && /&lt;script&gt;alert\(1\)&lt;\/script&gt;/.test(h), 'escapado');
  assert(!/<img src=x/.test(h), 'descripción escapada');
  const ld = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]; assert(!/<\/script/i.test(ld), 'el JSON-LD no puede cerrar la etiqueta');
  await s.interno('POST', '/api/interno/retirar', { id: 'p_xss' });
  assert.equal((await F(U('/p/script-alert-1-script-taza'))).status, 404, 'retirado: ya no se ve');
});

out.push('\nCAMPAÑAS Y PROMOCIONES REALES (CELEBRY DAY)');
const iso = ms => new Date(ms).toISOString();
const CELEBRY = (extra) => Object.assign({ id: 'celebry', nombre: 'CELEBRY DAY', descripcion: 'Días especiales', estado: 'lista', tipo: 'manual', inicio: iso(Date.now() - 3600e3), fin: iso(Date.now() + 2 * 864e5), incluidos: [], excluidos: ['p_organizador'], aspecto: { color: '#ff3d7f', emoji: '✨', titulo: 'CELEBRY DAY', mensaje: 'Solo estos días' } }, extra || {});
await t('CELEBRY DAY preparada pero con el descuento PENDIENTE: la web sigue normal (sin campaña, sin tachados, sin contador)', async () => {
  const r = await s.interno('POST', '/api/interno/campanas', { campanas: [CELEBRY()], promociones: [{ id: 'tres', campanaId: 'celebry', nombre: '3 o más productos', tipo: 'cantidad_porcentaje', valor: null, minimo: 3, activa: true }] });
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.campanas[0].estado, 'activa'); assert.deepEqual(r.data.activas, []);
  const c = (await getJ('/api/catalogo')).data;
  assert.equal(c.promos.campana, null, 'sin promoción con valor la web no se pone «de campaña»'); assert(c.productos.every(p => !p.antes));
  const q = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_llavero', cant: 4 }], pais: 'ES' }, ip());
  assert.equal(q.data.descuentoCent, 0);
});
await t('Campaña ACTIVA con promoción real: precio rebajado solo en los productos incluidos, campaña con su fecha de fin y caché que no dura más que la campaña', async () => {
  const fin = Date.now() + 40e3;
  await s.interno('POST', '/api/interno/campanas', { campanas: [CELEBRY({ fin: iso(fin) })], promociones: [{ id: 'maceta10', campanaId: 'celebry', nombre: 'Maceta −10 %', tipo: 'porcentaje', valor: 10, incluidos: ['p_maceta'], activa: true }] });
  const r = await getJ('/api/catalogo'), c = r.data, m = c.productos.find(p => p.id === 'p_maceta');
  assert.equal(m.precio, 1620); assert.equal(m.antes, 1800); assert.equal(m.descuento, 10); assert.equal(m.promo.campana, 'CELEBRY DAY');
  assert(c.productos.filter(p => p.id !== 'p_maceta').every(p => !p.antes), 'los demás, a su precio');
  assert.equal(c.promos.campana.nombre, 'CELEBRY DAY'); assert.equal(c.promos.campana.hasta, iso(fin)); assert.equal(c.promos.campana.aspecto.emoji, '✨');
  const age = Number(r.headers.get('cache-control').match(/max-age=(\d+)/)[1]); assert(age <= 40, 'caché ' + age + ' s');
  const h = await (await F(U('/p/maceta-luna'))).text(); assert.match(h, /"price":"16.20"/); assert.match(h, /<s>18,00/);
});
await t('«3 o más productos → descuento»: no se aplica con 2, sí con 3 (cupón de un solo uso en Stripe por el importe exacto); no combinable con otra promoción', async () => {
  await s.interno('POST', '/api/interno/campanas', { campanas: [CELEBRY()], promociones: [
    { id: 'maceta10', campanaId: 'celebry', nombre: 'Maceta −10 %', tipo: 'porcentaje', valor: 10, incluidos: ['p_maceta'], activa: true },
    { id: 'tres', campanaId: 'celebry', nombre: '3 o más productos', tipo: 'cantidad_porcentaje', valor: 5, minimo: 3, combinable: false, activa: true }] });
  const dos = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_llavero', cant: 2 }], pais: 'ES' }, ip());
  assert.equal(dos.data.descuentoCent, 0); assert.deepEqual(dos.data.pistas.map(x => x.faltan), [1], '«añade 1 más»');
  const L = [{ id: 'p_llavero', cant: 3 }, { id: 'p_maceta', cant: 1, variante: { Color: 'Rosa' } }];
  const tres = await postJ('/api/envio/cotizar', { lineas: L, pais: 'ES' }, ip());
  // 3 llaveros × 6 € = 18 € → 5 % = 0,90 €; la maceta ya tiene su promoción y esta no se combina
  assert.equal(tres.data.descuentoCent, 90); assert.equal(tres.data.descuento.nombre, '3 o más productos'); assert.equal(tres.data.subtotalCent, 1800 + 1620); assert.equal(tres.data.productosCent, 3420 - 90);
  const env = tres.data.opciones.find(o => o.id === 'economico').cent;
  const r = await postJ('/api/pedido', { lineas: L, cliente, envio: 'economico', acepto: true, totalVisto: 3330 + env }, ip());
  assert.equal(r.status, 201, JSON.stringify(r.data)); assert.equal(r.data.totalCent, 3330 + env);
  const call = s.stripeCalls.at(-1).params, cup = s.coupons.get(call.get('discounts[0][coupon]'));
  assert(cup && cup.amount_off === 90, 'cupón por el descuento exacto'); assert.match(cup.name, /3 o más productos/);
  const pr = (await s.env.DB.prepare('SELECT promos, descuento_cent FROM pedidos WHERE id = ?').bind(r.data.pedido).first());
  assert.equal(pr.descuento_cent, 90); assert.deepEqual(JSON.parse(pr.promos).map(x => [x.tipo, x.cent]), [['producto', 180], ['cantidad', 90]], 'el programa sabrá qué promociones se aplicaron');
});
await t('Al TERMINAR la campaña todo vuelve solo a la normalidad; si el cliente pagaba con el precio de campaña, se le avisa (no se cobra otro importe)', async () => {
  const visto = 1620 + 433;
  await s.interno('POST', '/api/interno/campanas', { campanas: [CELEBRY({ inicio: iso(Date.now() - 864e5), fin: iso(Date.now() - 1000) })], promociones: [{ id: 'maceta10', campanaId: 'celebry', nombre: 'Maceta −10 %', tipo: 'porcentaje', valor: 10, incluidos: ['p_maceta'], activa: true }] });
  const c = (await getJ('/api/catalogo')).data;
  assert.equal(c.promos.campana, null); assert(c.productos.every(p => !p.antes), 'sin tachados');
  const r = await postJ('/api/pedido', { lineas: [{ id: 'p_maceta', cant: 1, variante: { Color: 'Rosa' } }], cliente, envio: 'economico', acepto: true, totalVisto: visto }, ip());
  assert.equal(r.status, 409); assert.equal(r.data.error, 'precio_cambiado'); assert.equal(r.data.totalCent, 1800 + 433);
});
await t('Publicar campañas: se valida (fechas, porcentaje máximo, campaña inexistente) y SOLO con la clave de PUBLICAR', async () => {
  assert.equal((await s.interno('POST', '/api/interno/campanas', { campanas: [CELEBRY({ fin: '' })] })).status, 422, 'activa sin fecha de fin');
  assert.equal((await s.interno('POST', '/api/interno/campanas', { campanas: [], promociones: [{ id: 'x', tipo: 'porcentaje', valor: 95, activa: true }] })).status, 422, 'más del 90 %');
  assert.equal((await s.interno('POST', '/api/interno/campanas', { campanas: [], promociones: [{ id: 'x', campanaId: 'nada', tipo: 'porcentaje', valor: 5, activa: true }] })).status, 422);
  assert.equal((await s.interno('POST', '/api/interno/campanas', { campanas: [] }, 'ped')).status, 401, 'la clave de pedidos no publica campañas');
  assert.equal((await s.interno('POST', '/api/interno/campanas', { campanas: [], promociones: [] })).status, 200, 'se pueden vaciar');
});
await t('Pago caducado o cancelado en Stripe: el pedido NO se da por pagado y no descuenta stock', async () => {
  const r = await postJ('/api/pedido', { lineas: [{ id: 'p_lampara', cant: 1, variante: { Color: 'Azul' } }], cliente, envio: 'economico', acepto: true }, ip());
  const ses = [...s.sessions.values()].find(x => x.pedido === r.data.pedido);
  const st0 = await s.env.DB.prepare("SELECT stock FROM productos WHERE id = 'p_lampara'").first('stock');
  await F(r.data.pagoUrl + '?accion=caducar');
  assert.equal((await getJ('/api/pedido/' + r.data.token)).data.estado, 'expirado');
  assert.equal(await s.env.DB.prepare("SELECT stock FROM productos WHERE id = 'p_lampara'").first('stock'), st0);
  await s.sendWebhook('checkout.session.completed', ses); // un aviso tardío de «completado» de una sesión caducada sí se respeta (Stripe es la referencia del pago)
});

out.push('\nPROTECCIÓN GENERAL');
await t('Formularios de otras webs (sin JSON) y cuerpos enormes se rechazan; límite de pedidos por IP', async () => {
  const r = await F(U('/api/pedido'), { method: 'POST', body: 'lineas=1', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(r.status, 400, 'CSRF: un formulario de otra web no puede crear pedidos');
  assert.equal((await F(U('/api/pedido'), { method: 'POST', body: 'x'.repeat(20000), headers: { 'Content-Type': 'application/json' } })).status, 400);
  assert.equal(r.headers.get('access-control-allow-origin'), null, 'sin CORS: otras webs no pueden leer la API');
  const h = { 'X-Test-IP': '10.7.7.7' }; let last;
  for (let i = 0; i < 11; i++) last = await postJ('/api/pedido', { lineas: [{ id: 'p_llavero', cant: 1 }], cliente, envio: 'economico' }, h);
  assert.equal(last.status, 429);
});
await t('Un fallo interno nunca enseña detalles al público', async () => {
  const s4 = await start({ stripe: false }); s4.env.DB.db.exec('DROP TABLE productos');
  const r = await s4.realFetch(s4.url + '/api/catalogo'); const j = await r.json();
  assert.equal(r.status, 500); assert.equal(j.mensaje, 'Ha habido un problema. Inténtalo de nuevo en unos minutos.'); assert(!/no such table|sqlite|productos/i.test(JSON.stringify(j)));
  await s4.close();
});
await t('Campañas periódicas: inactiva sin «lista», programada, activa y finalizada, según la HORA REAL', async () => {
  const D = 864e5, ini = Date.parse('2026-10-01T10:00:00Z');
  const c = { id: 'celebry', nombre: 'CELEBRY DAY', estado: 'lista', tipo: 'periodica', inicio: new Date(ini).toISOString(), cadaDias: 3, duracionHoras: 24, repetirHasta: new Date(ini + 9 * D).toISOString() };
  assert.equal(estadoCampana(Object.assign({}, c, { estado: 'borrador' }), ini + 1000).estado, 'inactiva');
  assert.equal(estadoCampana(c, ini - 1000).estado, 'programada');
  const a = estadoCampana(c, ini + 3600e3); assert.equal(a.estado, 'activa'); assert.equal(a.hasta, new Date(ini + D).toISOString());
  const p = estadoCampana(c, ini + 2 * D); assert.equal(p.estado, 'programada'); assert.equal(p.proxima, new Date(ini + 3 * D).toISOString());
  assert.equal(estadoCampana(c, ini + 3 * D + 5).estado, 'activa', 'se repite cada 3 días');
  assert.equal(estadoCampana(c, ini + 10 * D).estado, 'finalizada');
  const pr = [{ id: 'q', campanaId: 'celebry', tipo: 'cantidad_porcentaje', valor: null, minimo: 3, activa: true }];
  assert.equal(promosActivas([c], pr, ini + 3600e3).length, 0, 'sin porcentaje configurado NO hay descuento');
});


await s.close();
console.log(out.join('\n') + `\n\n${pass} correctas · ${fail} fallidas`);
process.exit(fail ? 1 : 0);
