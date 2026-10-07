// Pruebas de RESERVA TEMPORAL DE STOCK y DESCUENTO WEB (v1.2). node test/reservas.test.js
import assert from 'node:assert/strict';
import { start } from './servidor.js';
import { ejemplo, CONFIG_PRUEBA } from './ejemplo.js';

let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('  ✔ ' + name); } catch (e) { fail++; out.push('  ✘ ' + name + '\n      ' + String(e.stack || e).split('\n').slice(0, 4).join(' | ')); } }

const s = await start({ stripe: true });
await ejemplo(s);
const F = s.realFetch, U = p => s.url + p, DB = s.env.DB;
const getJ = async p => { const r = await F(U(p)); return { status: r.status, data: await r.json().catch(() => null) }; };
const postJ = async (p, d, h) => { if (p === '/api/pedido' && d && d.ms === undefined) d = Object.assign({ ms: 9000 }, d); const r = await F(U(p), { method: 'POST', body: JSON.stringify(d), headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}) }); return { status: r.status, data: await r.json().catch(() => null) }; };
const cliente = { nombre: 'Ana Prueba', email: 'ana@example.com', telefono: '+34 600 000 001', direccion: 'Calle Falsa 1, 2ºB', cp: '28001', ciudad: 'Madrid', provincia: 'Madrid', pais: 'ES' };
let ipN = 1; const ip = () => ({ 'X-Test-IP': '10.9.0.' + (ipN++) });
const row = async id => DB.prepare('SELECT stock, reservado FROM productos WHERE id = ?').bind(id).first();
const pedidoRow = async id => DB.prepare('SELECT estado, reserva, reserva_hasta, descuento_cent, promos, total_cent FROM pedidos WHERE id = ?').bind(id).first();
const comprar = (id, cant, extra) => postJ('/api/pedido', Object.assign({ lineas: [{ id, cant, variante: id === 'p_lampara' ? { Color: 'Azul' } : undefined }], cliente, envio: 'economico', acepto: true }, extra || {}), ip());
const sesion = pedido => [...s.sessions.values()].find(x => x.pedido === pedido);
const iso = ms => new Date(ms).toISOString();

out.push('\nRESERVA TEMPORAL DE STOCK');
await t('Al crear el pedido se APARTAN las unidades: disponible baja, el stock físico no se toca hasta pagar', async () => {
  const r = await comprar('p_soporte', 1); assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.deepEqual(await row('p_soporte'), { stock: 2, reservado: 1 });
  const p = await pedidoRow(r.data.pedido); assert.equal(p.reserva, 1); assert(p.reserva_hasta > iso(Date.now() + 30 * 60e3), 'dura más que la sesión de Stripe (31 min)');
  const cat = (await getJ('/api/catalogo')).data.productos.find(x => x.id === 'p_soporte'); assert.notEqual(cat.disponible, 'agotado', 'queda 1');
  r.id = r.data.pedido; s.p1 = r.id;
});
await t('Segundo comprador que pide más de lo que queda (lo apartado ya no cuenta): rechazo claro con «Solo quedan N», y no se crea pedido ni sesión de Stripe', async () => {
  const n0 = (await DB.prepare('SELECT COUNT(*) n FROM pedidos').first()).n, ses0 = s.sessions.size;
  const r = await comprar('p_soporte', 2); assert.equal(r.status, 422); assert.equal(r.data.error, 'cesta'); assert.match(r.data.mensaje, /Solo quedan 1/i, 'el carrito ya descuenta lo apartado');
  assert.equal((await DB.prepare('SELECT COUNT(*) n FROM pedidos').first()).n, n0); assert.equal(s.sessions.size, ses0);
  assert.deepEqual(await row('p_soporte'), { stock: 2, reservado: 1 }, 'la reserva fallida no deja restos');
});
await t('El pago del primero convierte la reserva en VENTA: stock 2→1, reservado 1→0 y un aviso repetido no descuenta dos veces', async () => {
  const ses = sesion(s.p1);
  assert.equal((await s.sendWebhook('checkout.session.completed', ses)).status, 200);
  assert.equal((await s.sendWebhook('checkout.session.completed', ses)).status, 200);
  assert.deepEqual(await row('p_soporte'), { stock: 1, reservado: 0 });
  const p = await pedidoRow(s.p1); assert.equal(p.estado, 'pagado'); assert.equal(p.reserva, 0);
});
await t('Dos compradores A LA VEZ por la última unidad: exactamente uno la consigue', async () => {
  // quedan 1 de p_soporte
  const [a, b] = await Promise.all([comprar('p_soporte', 1), comprar('p_soporte', 1)]);
  const ok = [a, b].filter(x => x.status === 201), no = [a, b].filter(x => x.status !== 201);
  assert.equal(ok.length, 1, JSON.stringify([a, b])); assert.equal(no.length, 1); assert(['sin_stock', 'cesta'].includes(no[0].data.error), JSON.stringify(no[0]));
  assert.deepEqual(await row('p_soporte'), { stock: 1, reservado: 1 });
  s.p2 = ok[0].data.pedido;
});
await t('Cancelar/caducar en Stripe LIBERA la unidad al instante (y un segundo aviso no la libera dos veces)', async () => {
  const ses = sesion(s.p2);
  assert.equal((await s.sendWebhook('checkout.session.expired', ses)).status, 200);
  assert.equal((await s.sendWebhook('checkout.session.expired', ses)).status, 200);
  assert.deepEqual(await row('p_soporte'), { stock: 1, reservado: 0 });
  assert.equal((await pedidoRow(s.p2)).estado, 'expirado');
  const r = await comprar('p_soporte', 1); assert.equal(r.status, 201, 'otra persona ya puede comprarla'); s.p3 = r.data.pedido;
});
await t('Sin aviso de Stripe: la reserva VENCE sola por tiempo y la unidad vuelve a estar disponible', async () => {
  assert.deepEqual(await row('p_soporte'), { stock: 1, reservado: 1 });
  await DB.prepare('UPDATE pedidos SET reserva_hasta = ? WHERE id = ?').bind(iso(Date.now() - 1000), s.p3).run();
  const q = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_soporte', cant: 1 }], pais: 'ES' }, ip()); // el carrito barre las vencidas al momento
  assert.equal(q.status, 200, JSON.stringify(q.data));
  assert.deepEqual(await row('p_soporte'), { stock: 1, reservado: 0 });
  assert.equal((await pedidoRow(s.p3)).estado, 'expirado');
});
await t('Pago TARDÍO de una reserva ya liberada: se cobra (Stripe ya cobró) pero no deja el stock en negativo y queda AVISO para el programa', async () => {
  // otra persona se llevó la última unidad entre tanto
  const otro = await comprar('p_soporte', 1); assert.equal(otro.status, 201);
  await s.sendWebhook('checkout.session.completed', sesion(otro.data.pedido));
  assert.deepEqual(await row('p_soporte'), { stock: 0, reservado: 0 });
  const w = await s.sendWebhook('checkout.session.completed', sesion(s.p3)); assert.equal(w.status, 200);
  const st = await row('p_soporte'); assert(st.stock >= 0 && st.reservado >= 0, JSON.stringify(st));
  const p = await pedidoRow(s.p3); assert.equal(p.estado, 'pagado', 'el dinero está cobrado: el pedido existe y se atiende');
  const av = (await DB.prepare("SELECT * FROM seguridad WHERE tipo LIKE '%stock%'").all()).results;
  const pj = await DB.prepare('SELECT * FROM pedidos WHERE id = ?').bind(s.p3).first();
  assert(av.length > 0 || /stock|aviso/i.test(JSON.stringify(pj)), 'queda constancia del aviso');
});
await t('Producto BAJO PEDIDO (stock null): nunca se reserva ni se agota', async () => {
  const rs = await Promise.all([comprar('p_llavero', 3), comprar('p_llavero', 3), comprar('p_llavero', 3)]);
  assert(rs.every(x => x.status === 201));
  assert.deepEqual(await row('p_llavero'), { stock: null, reservado: 0 });
});
await t('Mismo producto en dos líneas (variantes): se suma para comprobar el stock (no se burla repartiendo la cantidad)', async () => {
  const antes = await row('p_lampara'); assert.equal(antes.stock, 5);
  const r = await postJ('/api/pedido', { lineas: [{ id: 'p_lampara', cant: 3, variante: { Color: 'Azul' } }, { id: 'p_lampara', cant: 3, variante: { Color: 'Blanco' } }], cliente, envio: 'economico', acepto: true }, ip());
  assert.equal(r.status, 422, JSON.stringify(r.data)); assert.match(r.data.mensaje, /Solo quedan 2/); assert.deepEqual(await row('p_lampara'), antes, 'no queda nada apartado');
  const ok = await postJ('/api/pedido', { lineas: [{ id: 'p_lampara', cant: 3, variante: { Color: 'Azul' } }, { id: 'p_lampara', cant: 2, variante: { Color: 'Blanco' } }], cliente, envio: 'economico', acepto: true }, ip());
  assert.equal(ok.status, 201, JSON.stringify(ok.data)); assert.deepEqual(await row('p_lampara'), { stock: 5, reservado: 5 });
  await s.sendWebhook('checkout.session.expired', sesion(ok.data.pedido)); assert.deepEqual(await row('p_lampara'), { stock: 5, reservado: 0 });
});
await t('Si Stripe falla al crear la sesión: la reserva se deshace (no quedan unidades «fantasma»)', async () => {
  const s2 = await start({ stripe: true, stripeFalla: true }); await ejemplo(s2);
  const r = await s2.realFetch(s2.url + '/api/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Test-IP': '10.8.0.1' }, body: JSON.stringify({ lineas: [{ id: 'p_soporte', cant: 1 }], cliente, envio: 'economico', acepto: true, ms: 9000 }) });
  assert(r.status >= 500 || r.status === 502 || r.status === 503, 'status ' + r.status);
  const x = await s2.env.DB.prepare("SELECT stock, reservado FROM productos WHERE id = 'p_soporte'").first(); assert.deepEqual(x, { stock: 2, reservado: 0 });
  await s2.close();
});

out.push('\nDESCUENTO WEB (−4 %)');
await t('SIN configurar no hay descuento web (la tienda nunca inventa rebajas)', async () => {
  const c = (await getJ('/api/catalogo')).data; assert.equal(c.config.descuentoWeb, null); assert(c.productos.every(p => !p.precioWeb));
});
const cfgWeb = (d) => s.interno('POST', '/api/interno/config', { config: Object.assign({}, CONFIG_PRUEBA, { descuentoWeb: d }) });
await t('Con 4 % activo el catálogo publica el «precio web» y la ficha lo muestra; el precio normal no cambia', async () => {
  assert.equal((await cfgWeb({ activo: true, pct: 4, combinable: false })).status, 200);
  const c = (await getJ('/api/catalogo')).data, m = c.productos.find(p => p.id === 'p_maceta');
  assert.equal(c.config.descuentoWeb.pct, 4); assert.equal(m.precio, 1800); assert.equal(m.precioWeb, 1728); assert.equal(m.descuentoWebPct, 4);
});
await t('Carrito 2 × 18 € → descuento web 1,44 €, total exacto; el cupón de Stripe lleva ese importe y el pedido lo registra como promo «web»', async () => {
  const L = [{ id: 'p_maceta', cant: 2, variante: { Color: 'Rosa' } }];
  const q = await postJ('/api/envio/cotizar', { lineas: L, pais: 'ES' }, ip());
  assert.equal(q.data.subtotalCent, 3600); assert.equal(q.data.descuentoCent, 144); assert.equal(q.data.descuentoWeb.cent, 144); assert.equal(q.data.productosCent, 3456);
  const env = q.data.opciones.find(o => o.id === 'economico').cent;
  const r = await postJ('/api/pedido', { lineas: L, cliente, envio: 'economico', acepto: true, totalVisto: 3456 + env }, ip());
  assert.equal(r.status, 201, JSON.stringify(r.data)); assert.equal(r.data.totalCent, 3456 + env);
  const call = s.stripeCalls.at(-1).params, cup = s.coupons.get(call.get('discounts[0][coupon]'));
  assert(cup && cup.amount_off === 144, 'cupón por el descuento exacto'); assert.match(cup.name, /web/i);
  const p = await pedidoRow(r.data.pedido); assert.equal(p.descuento_cent, 144); assert.deepEqual(JSON.parse(p.promos).map(x => [x.tipo, x.cent]), [['web', 144]]);
});
await t('A prueba de manipulación: el cliente no puede mandar su propio descuento; si el total visto no coincide se rechaza', async () => {
  const L = [{ id: 'p_maceta', cant: 1, variante: { Color: 'Rosa' } }];
  const r = await postJ('/api/pedido', { lineas: L, cliente, envio: 'economico', acepto: true, totalVisto: 1000, descuentoCent: 9999, descuentoWeb: { pct: 50 } }, ip());
  assert.equal(r.status, 409); assert.equal(r.data.error, 'precio_cambiado'); assert.equal(r.data.totalCent, 1728 + 433);
  const q = await postJ('/api/envio/cotizar', { lineas: L, pais: 'ES', descuentoWeb: { pct: 50 }, descuentoCent: 5000 }, ip()); assert.equal(q.data.descuentoCent, 72);
});
await t('Porcentaje fuera de rango se recorta (máx. 30 %) y 0 % o desactivado = sin descuento', async () => {
  await cfgWeb({ activo: true, pct: 90 });
  assert.equal((await getJ('/api/catalogo')).data.config.descuentoWeb.pct, 30);
  await cfgWeb({ activo: true, pct: 0 }); assert.equal((await getJ('/api/catalogo')).data.config.descuentoWeb, null);
  await cfgWeb({ activo: false, pct: 4 }); assert.equal((await getJ('/api/catalogo')).data.config.descuentoWeb, null);
  const q = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_llavero', cant: 1 }], pais: 'ES' }, ip()); assert.equal(q.data.descuentoCent, 0);
  await cfgWeb({ activo: true, pct: 4, combinable: false });
});
const CELEBRY = (extra) => Object.assign({ id: 'celebry', nombre: 'CELEBRY DAY', descripcion: 'Días especiales', estado: 'lista', tipo: 'manual', inicio: iso(Date.now() - 3600e3), fin: iso(Date.now() + 2 * 864e5), incluidos: [], excluidos: [], aspecto: { color: '#ff3d7f', emoji: '✨', titulo: 'CELEBRY DAY', mensaje: 'Solo estos días' } }, extra || {});
await t('No combinable: NUNCA se acumula con la promoción de un producto (se aplica solo la mejor) → no hay pérdidas de margen por sorpresa', async () => {
  await s.interno('POST', '/api/interno/campanas', { campanas: [CELEBRY()], promociones: [{ id: 'maceta10', campanaId: 'celebry', nombre: 'Maceta −10 %', tipo: 'porcentaje', valor: 10, incluidos: ['p_maceta'], activa: true }] });
  const L = [{ id: 'p_maceta', cant: 1, variante: { Color: 'Rosa' } }, { id: 'p_llavero', cant: 1 }];
  const q = await postJ('/api/envio/cotizar', { lineas: L, pais: 'ES' }, ip());
  // maceta con −10 % (1620) sin web; llavero 600 con web 4 % = 24
  assert.equal(q.data.descuentoWeb.cent, 24); assert.deepEqual(q.data.descuentoWeb.lineas.length, 1);
  assert.equal(q.data.productosCent, 1620 + 576);
  const c = (await getJ('/api/catalogo')).data.productos.find(p => p.id === 'p_maceta'); assert.equal(c.precio, 1620); assert(!c.precioWeb || c.precioWeb >= 1620, 'la maceta no baja más del precio de campaña');
});
await t('Con «3 o más» (cantidad) no combinable gana el mejor de los dos y nunca se suman', async () => {
  await s.interno('POST', '/api/interno/campanas', { campanas: [CELEBRY()], promociones: [{ id: 'tres', campanaId: 'celebry', nombre: '3 o más', tipo: 'cantidad_porcentaje', valor: 10, minimo: 3, combinable: false, activa: true }] });
  const q = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_llavero', cant: 3 }], pais: 'ES' }, ip());
  assert.equal(q.data.descuentoCent, 180, '10 % de 18 € gana al 4 % (72 c)'); assert(!q.data.descuentoWeb || q.data.descuentoWeb.cent === 0);
  const q1 = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_llavero', cant: 2 }], pais: 'ES' }, ip());
  assert.equal(q1.data.descuentoCent, 48, 'con 2 aún no hay cantidad: vale el web');
});
await t('Combinable = true: el web se aplica sobre lo ya rebajado por cantidad (suma controlada, cálculo en céntimos exacto)', async () => {
  await cfgWeb({ activo: true, pct: 4, combinable: true });
  const q = await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_llavero', cant: 3 }], pais: 'ES' }, ip());
  // 1800 − 10 % (180) = 1620; 4 % de 1620 = 64,8 → 65
  assert.equal(q.data.descuentoCent, 180 + 65);
  const r = await postJ('/api/pedido', { lineas: [{ id: 'p_llavero', cant: 3 }], cliente, envio: 'economico', acepto: true }, ip());
  assert.equal(r.status, 201); const p = await pedidoRow(r.data.pedido); assert.equal(p.descuento_cent, 245);
  assert.equal(s.coupons.get(s.stripeCalls.at(-1).params.get('discounts[0][coupon]')).amount_off, 245);
});

await s.close();
console.log(out.join('\n') + `\n\n${pass} correctas · ${fail} fallidas`);
process.exit(fail ? 1 : 0);
