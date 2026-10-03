// Pedido por WhatsApp (v1.5): sin pago online, el cliente registra el pedido, queda apartado 48 h, el programa lo recoge y
// lo cobra (Bizum/efectivo) o lo cancela. node test/whatsapp.test.js
import assert from 'node:assert/strict';
import { start } from './servidor.js';
import { ejemplo } from './ejemplo.js';

let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('  ✔ ' + name); } catch (e) { fail++; out.push('  ✘ ' + name + '\n      ' + String(e.stack || e).split('\n').slice(0, 4).join(' | ')); } }
const s = await start({ stripe: false });
await ejemplo(s);
const F = s.realFetch, U = p => s.url + p, DB = s.env.DB;
const postJ = async (p, d, h) => { const r = await F(U(p), { method: 'POST', body: JSON.stringify(d), headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}) }); return { status: r.status, data: await r.json().catch(() => null) }; };
const getJ = async p => { const r = await F(U(p)); return { status: r.status, data: await r.json().catch(() => null) }; };
const cliente = (email = 'ana@example.com') => ({ nombre: 'Ana Prueba', email, telefono: '+34 600 000 001', direccion: 'Calle Falsa 1, 2ºB', cp: '28001', ciudad: 'Madrid', provincia: 'Madrid', pais: 'ES' });
let ipN = 1; const ip = () => ({ 'X-Test-IP': '10.9.0.' + (ipN++) });
const pedir = (lineas, extra, email, h) => postJ('/api/pedido', Object.assign({ lineas, cliente: cliente(email), envio: 'economico', acepto: true, ms: 9000, metodo: 'bizum' }, extra || {}), h || ip());
const stock = async id => DB.prepare('SELECT stock, reservado FROM productos WHERE id = ?').bind(id).first();
const fila = async id => DB.prepare('SELECT * FROM pedidos WHERE id = ?').bind(id).first();
const cobro = (id, c) => s.interno('POST', '/api/interno/seguimiento', { pedidos: [{ id, fase: 'recibido', cobro: c }] });

out.push('\nPEDIDO POR WHATSAPP');
const A = await pedir([{ id: 'p_soporte', cant: 1 }], { metodo: 'efectivo' });
await t('El pedido se registra, aparta la unidad y no toca Stripe; el cliente ve «whatsapp» y su forma de pago', async () => {
  assert.equal(A.status, 201, JSON.stringify(A.data)); assert.equal(A.data.modo, 'whatsapp'); assert.match(A.data.pedido, /^W-\d{8}-[0-9A-F]{6}$/);
  assert.deepEqual(await stock('p_soporte'), { stock: 2, reservado: 1 }, 'apartada, no descontada');
  const g = await getJ('/api/pedido/' + A.data.token); assert.equal(g.data.estado, 'whatsapp'); assert.equal(g.data.metodo, 'efectivo');
  assert.equal((await getJ('/api/catalogo')).data.productos.find(p => p.id === 'p_soporte').stock, 1, 'a los demás les queda 1');
  const f = await fila(A.data.pedido); assert(new Date(f.reserva_hasta) - Date.now() > 47 * 3600e3, 'reserva de 48 h');
  assert.equal(s.stripeCalls.length, 0);
});
await t('Forma de pago inventada → Bizum por defecto; sin aceptar condiciones o con campo trampa se rechaza como siempre', async () => {
  const r = await pedir([{ id: 'p_llavero', cant: 1 }], { metodo: 'bitcoin<script>' }, 'x1@example.com'); assert.equal(r.status, 201); assert.equal(r.data.metodo, 'bizum');
  assert.equal((await pedir([{ id: 'p_llavero', cant: 1 }], { acepto: false }, 'x2@example.com')).status, 422);
  assert.equal((await pedir([{ id: 'p_llavero', cant: 1 }], { web: 'http://spam' }, 'x3@example.com')).status, 422);
});
await t('El programa lo recoge con su forma de pago y el pedido sigue VIVO (sin fecha de borrado) hasta que se cobre o cancele', async () => {
  const l = await s.interno('GET', '/api/interno/pedidos'); const w = l.data.pedidos.find(x => x.id === A.data.pedido);
  assert(w); assert.equal(w.estado, 'whatsapp'); assert.equal(w.metodo, 'efectivo'); assert.equal(w.totalCent, A.data.totalCent); assert.equal(w.cliente.nombre, 'Ana Prueba');
  await s.interno('POST', '/api/interno/pedidos/recoger', { ids: [A.data.pedido] });
  const f = await fila(A.data.pedido); assert.equal(f.recogido, 1); assert.equal(f.purgar_en, null); assert.equal(f.estado, 'whatsapp');
  assert(!(await s.interno('GET', '/api/interno/pedidos')).data.pedidos.some(x => x.id === A.data.pedido), 'no vuelve a salir');
});
await t('Confirmado en el programa (cobro = cobrado): pasa a PAGADO, descuenta el stock UNA vez, se purga a los 30 días y el seguimiento avanza', async () => {
  const r = await cobro(A.data.pedido, 'cobrado'); assert.equal(r.status, 200); assert.equal(r.data.cobrados, 1);
  assert.deepEqual(await stock('p_soporte'), { stock: 1, reservado: 0 });
  const f = await fila(A.data.pedido); assert.equal(f.estado, 'pagado'); assert(f.pagado_en); assert(new Date(f.purgar_en) - Date.now() > 29 * 864e5);
  const r2 = await cobro(A.data.pedido, 'cobrado'); assert.equal(r2.data.cobrados, 0, 'repetido: nada'); assert.deepEqual(await stock('p_soporte'), { stock: 1, reservado: 0 });
  await s.interno('POST', '/api/interno/seguimiento', { pedidos: [{ id: A.data.pedido, fase: 'imprimiendo', cobro: 'cobrado' }] });
  const v = await postJ('/api/seguimiento', { pedido: A.data.pedido, email: 'ANA@example.com' }, ip()); assert.equal(v.data.seguimiento.fase, 'imprimiendo');
});
const B = await pedir([{ id: 'p_soporte', cant: 1 }], {}, 'b@example.com');
await t('Cancelado en el programa: se libera lo apartado, el pedido queda «cancelado» y NO se puede cobrar después', async () => {
  assert.deepEqual(await stock('p_soporte'), { stock: 1, reservado: 1 });
  const r = await cobro(B.data.pedido, 'cancelado'); assert.equal(r.data.cancelados, 1);
  assert.deepEqual(await stock('p_soporte'), { stock: 1, reservado: 0 }); assert.equal((await fila(B.data.pedido)).estado, 'cancelado');
  assert.equal((await cobro(B.data.pedido, 'cobrado')).data.cobrados, 0); assert.equal((await fila(B.data.pedido)).estado, 'cancelado');
  assert.equal((await getJ('/api/pedido/' + B.data.token)).data.estado, 'cancelado');
});
await t('Un cobro NO se puede forzar en pedidos de otro tipo ni inventados (solo los «por WhatsApp»)', async () => {
  await DB.prepare("INSERT INTO pedidos (id, token, creado, estado, cliente, lineas, envio, subtotal_cent, envio_cent, total_cent, pago_ref) VALUES ('W-20260101-AAAAAA', 'tk', ?, 'pendiente_pago', '{}', '[]', '{}', 100, 0, 100, 'cs_test_x')").bind(new Date().toISOString()).run();
  const r = await cobro('W-20260101-AAAAAA', 'cobrado'); assert.equal(r.data.cobrados, 0); assert.equal((await fila('W-20260101-AAAAAA')).estado, 'pendiente_pago');
  await DB.prepare("INSERT INTO pedidos (id, token, creado, estado, cliente, lineas, envio, subtotal_cent, envio_cent, total_cent, pago_ref) VALUES ('W-20260101-CCCCCC', 'tk2', ?, 'expirado', '{}', '[]', '{}', 100, 0, 100, 'cs_test_y')").bind(new Date().toISOString()).run();
  assert.equal((await cobro('W-20260101-CCCCCC', 'cobrado')).data.cobrados, 0, 'un pago de Stripe caducado NO se da por cobrado desde el programa'); assert.equal((await fila('W-20260101-CCCCCC')).estado, 'expirado');
  assert.equal((await cobro('W-20260101-BBBBBB', 'cobrado')).data.cobrados, 0);
  assert.equal((await cobro(A.data.pedido, 'otra cosa')).data.cobrados, 0);
});
await t('Caduca a las 48 h si nadie lo confirma (se libera solo); si luego se cobra, entra como pagado con aviso para revisar', async () => {
  const C = await pedir([{ id: 'p_soporte', cant: 1 }], {}, 'c@example.com'); assert.equal(C.status, 201);
  await DB.prepare('UPDATE pedidos SET reserva_hasta = ? WHERE id = ?').bind(new Date(Date.now() - 1000).toISOString(), C.data.pedido).run();
  await getJ('/api/catalogo'); await postJ('/api/envio/cotizar', { lineas: [{ id: 'p_soporte', cant: 1 }], pais: 'ES' }, ip());
  assert.equal((await fila(C.data.pedido)).estado, 'expirado'); assert.deepEqual(await stock('p_soporte'), { stock: 1, reservado: 0 });
  const r = await cobro(C.data.pedido, 'cobrado'); assert.equal(r.data.cobrados, 1);
  const f = await fila(C.data.pedido); assert.equal(f.estado, 'pagado'); assert.match(f.aviso, /caducar la reserva/); assert.deepEqual(await stock('p_soporte'), { stock: 0, reservado: 0 });
});
await t('Anti-acaparamiento: la misma persona no puede dejar apartados pedidos sin confirmar en más de 3 a la vez', async () => {
  const D = await pedir([{ id: 'p_soporte', cant: 0 + 1 }], {}, 'hoard@example.com'); // el stock está agotado a estas alturas: no se puede apartar
  assert.equal(D.status, 422);
  await DB.prepare('UPDATE productos SET stock = 10 WHERE id = ?').bind('p_soporte').run();
  const ids = []; for (let i = 0; i < 3; i++) { const r = await pedir([{ id: 'p_soporte', cant: 1 }], {}, 'hoard@example.com'); assert.equal(r.status, 201); ids.push(r.data.pedido); }
  const x = await pedir([{ id: 'p_soporte', cant: 1 }], {}, 'hoard@example.com'); assert.equal(x.status, 429); assert.equal(x.data.error, 'demasiados_pendientes');
  for (const id of ids) await cobro(id, 'cancelado'); assert.deepEqual(await stock('p_soporte'), { stock: 10, reservado: 0 });
});
await t('Sin número de WhatsApp configurado no se aceptan pedidos (no habría a dónde confirmarlos)', async () => {
  const row = await DB.prepare("SELECT valor FROM config WHERE clave = 'publica'").first(); const cfg = JSON.parse(row.valor); const w = cfg.whatsapp; delete cfg.whatsapp;
  await DB.prepare("UPDATE config SET valor = ? WHERE clave = 'publica'").bind(JSON.stringify(cfg)).run();
  try {
    const r = await pedir([{ id: 'p_llavero', cant: 1 }], {}, 'nowa@example.com'); assert.equal(r.status, 503); assert.equal(r.data.error, 'pago_no_activo');
    assert.equal((await getJ('/api/catalogo')).data.config.pago.manual, false);
  } finally { cfg.whatsapp = w; await DB.prepare("UPDATE config SET valor = ? WHERE clave = 'publica'").bind(JSON.stringify(cfg)).run(); }
});
await t('Un pedido por WhatsApp sin resolver durante 30 días se da por caducado y se borra de la tienda (nunca queda basura)', async () => {
  const E = await pedir([{ id: 'p_llavero', cant: 1 }], {}, 'old@example.com');
  await DB.prepare('UPDATE pedidos SET creado = ? WHERE id = ?').bind(new Date(Date.now() - 31 * 864e5).toISOString(), E.data.pedido).run();
  await s.interno('GET', '/api/interno/pedidos'); assert.equal(await fila(E.data.pedido), null);
  const R = await pedir([{ id: 'p_llavero', cant: 1 }], {}, 'reciente@example.com'); await s.interno('GET', '/api/interno/pedidos'); assert.equal((await fila(R.data.pedido)).estado, 'whatsapp', 'uno reciente no se toca');
});
await s.close();
console.log(out.join('\n')); console.log(`\n${pass} correctas · ${fail} fallidas`); process.exit(fail ? 1 : 0);
