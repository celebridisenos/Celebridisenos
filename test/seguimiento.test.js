// Seguimiento del pedido para el cliente (v1.4). node test/seguimiento.test.js
import assert from 'node:assert/strict';
import { start } from './servidor.js';
import { ejemplo } from './ejemplo.js';
import { urlSeguimiento, vistaSeguimiento, codigoOk } from '../src/logica.js';

let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('  ✔ ' + name); } catch (e) { fail++; out.push('  ✘ ' + name + '\n      ' + String(e.stack || e).split('\n').slice(0, 4).join(' | ')); } }
const s = await start({ stripe: true });
await ejemplo(s);
const F = s.realFetch, U = p => s.url + p;
const postJ = async (p, d, h) => { const r = await F(U(p), { method: 'POST', body: JSON.stringify(d), headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}) }); return { status: r.status, data: await r.json().catch(() => null) }; };
const cliente = { nombre: 'Ana Prueba', email: 'Ana@Example.com', telefono: '+34 600 000 001', direccion: 'Calle Falsa 1, 2ºB', cp: '28001', ciudad: 'Madrid', provincia: 'Madrid', pais: 'ES' };
let ipN = 1; const ip = () => ({ 'X-Test-IP': '10.8.0.' + (ipN++) });
async function comprarPagado(extra) {
  const r = await postJ('/api/pedido', { lineas: [{ id: 'p_llavero', cant: 1 }], cliente: Object.assign({}, cliente, extra || {}), envio: 'economico', acepto: true, ms: 9000 }, ip());
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const ses = [...s.sessions.values()].find(x => x.pedido === r.data.pedido);
  await s.sendWebhook('checkout.session.completed', ses);
  return r.data;
}
const ver = (pedido, email, h) => postJ('/api/seguimiento', { pedido, email }, h || ip());
const publicar = (pedidos) => s.interno('POST', '/api/interno/seguimiento', { pedidos });

out.push('\nSEGUIMIENTO DEL PEDIDO');
const A = await comprarPagado();
await t('Pedido pagado sin publicar nada: «recibido» (no se inventa), con número+email (sin importar mayúsculas) y con el enlace secreto', async () => {
  const r = await ver(A.pedido, 'ana@example.com'); assert.equal(r.status, 200); assert.equal(r.data.seguimiento.fase, 'recibido'); assert.equal(r.data.seguimiento.codigo, '');
  assert.equal((await ver(A.pedido.toLowerCase(), ' ANA@example.com ')).status, 200, 'tolera mayúsculas y espacios');
  const g = await (await F(U('/api/pedido/' + A.token))).json(); assert.equal(g.seguimiento.fase, 'recibido');
});
await t('Privacidad: la respuesta no lleva dirección, teléfono, email, token ni importes internos', async () => {
  const r = await ver(A.pedido, 'ana@example.com'); const txt = JSON.stringify(r.data);
  assert(!/Falsa|28001|600 000|ana@|example\.com|Madrid|token|pago_ref|ip_h|email_h/i.test(txt), txt);
  assert.deepEqual(Object.keys(r.data.seguimiento).sort(), ['codigo', 'creado', 'envio', 'estado', 'fase', 'faseEn', 'id', 'lineas', 'pagadoEn', 'transportista', 'url']);
});
await t('Pedido sin pagar: dice que falta el pago y no tiene fase; caducado no avanza', async () => {
  const r = await postJ('/api/pedido', { lineas: [{ id: 'p_llavero', cant: 1 }], cliente: Object.assign({}, cliente, { email: 'pend@example.com' }), envio: 'economico', acepto: true, ms: 9000 }, ip());
  const v = await ver(r.data.pedido, 'pend@example.com'); assert.equal(v.data.seguimiento.estado, 'pendiente_pago'); assert.equal(v.data.seguimiento.fase, '');
  // aunque el programa intente publicar algo de un pedido NO pagado, no se aplica
  const pb = await publicar([{ id: r.data.pedido, fase: 'enviado', transportista: 'Correos', codigo: 'ABCD1234' }]); assert.equal(pb.data.actualizados, 0);
  assert.equal((await ver(r.data.pedido, 'pend@example.com')).data.seguimiento.fase, '');
});
await t('El programa publica la fase con firma: imprimiendo → preparando → enviado (transportista, código y enlace de Correos) → entregado', async () => {
  for (const f of ['imprimiendo', 'preparando']) { const pb = await publicar([{ id: A.pedido, fase: f }]); assert.equal(pb.data.actualizados, 1); assert.equal((await ver(A.pedido, 'ana@example.com')).data.seguimiento.fase, f); }
  assert.equal((await publicar([{ id: A.pedido, fase: 'preparando' }])).data.actualizados, 0, 'sin cambios no escribe');
  await publicar([{ id: A.pedido, fase: 'enviado', transportista: 'Correos', codigo: 'PQ 7321 9988 01' }]);
  const e = (await ver(A.pedido, 'ana@example.com')).data.seguimiento; assert.equal(e.fase, 'enviado'); assert.equal(e.transportista, 'Correos'); assert.equal(e.codigo, 'PQ7321998801');
  assert.equal(e.url, 'https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=PQ7321998801');
  await publicar([{ id: A.pedido, fase: 'entregado', transportista: 'Correos', codigo: 'PQ7321998801' }]);
  assert.equal((await ver(A.pedido, 'ana@example.com')).data.seguimiento.fase, 'entregado');
});
await t('Entradas hostiles al publicar: fase inventada, id raro, código con HTML/enlaces, transportista largo → nada peligroso llega al cliente', async () => {
  const B = await comprarPagado({ email: 'b@example.com' });
  await publicar([{ id: B.pedido, fase: 'volando' }, { id: "x'; DROP TABLE pedidos;--", fase: 'enviado' }, { id: B.pedido, fase: 'enviado', transportista: '<script>alert(1)</script>Correos' + 'x'.repeat(80), codigo: 'javascript:alert(1)' }]);
  const v = (await ver(B.pedido, 'b@example.com')).data.seguimiento;
  assert.equal(v.fase, 'enviado'); assert.equal(v.codigo, '', 'un código con símbolos no es válido'); assert.equal(v.url, '');
  assert(!/[<>]/.test(v.transportista) && v.transportista.length <= 30, v.transportista);
  assert.equal((await s.env.DB.prepare('SELECT COUNT(*) n FROM pedidos').first()).n >= 3, true, 'la tabla sigue ahí');
});
await t('La publicación exige la FIRMA de la clave de pedidos (sin firma, con la clave de publicar o con otra clave → 401)', async () => {
  const body = JSON.stringify({ pedidos: [{ id: A.pedido, fase: 'recibido' }] });
  assert.equal((await F(U('/api/interno/seguimiento'), { method: 'POST', body, headers: { 'Content-Type': 'application/json' } })).status, 401);
  assert.equal((await s.interno('POST', '/api/interno/seguimiento', { pedidos: [] }, 'pub')).status, 401);
  assert.equal((await s.interno('POST', '/api/interno/seguimiento', { pedidos: [] }, 'ped', 'k'.repeat(43))).status, 401);
  assert.equal((await ver(A.pedido, 'ana@example.com')).data.seguimiento.fase, 'entregado', 'no cambió');
});
await t('No se puede adivinar: pedido inexistente, email equivocado y formato raro dan la MISMA respuesta', async () => {
  const a = await ver(A.pedido, 'otro@example.com'), b = await ver('W-20200101-ABCDEF', 'ana@example.com'), c = await ver('lo-que-sea', 'x'), d = await postJ('/api/seguimiento', { pedido: { $ne: 1 }, email: ['a'] }, ip());
  for (const r of [a, b, c, d]) { assert.equal(r.status, 404); assert.deepEqual(r.data, a.data); }
  assert.equal((await F(U('/api/seguimiento'), { method: 'POST', body: 'pedido=1', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Test-IP': '10.8.9.9' } })).status, 400, 'solo JSON (no formularios de otras webs)');
});
await t('Fuerza bruta: 8 fallos con un pedido lo bloquean una hora para ese pedido (aunque cambie de IP); el enlace secreto sigue funcionando', async () => {
  const C = await comprarPagado({ email: 'c@example.com' });
  for (let i = 0; i < 8; i++) assert.equal((await ver(C.pedido, 'mal' + i + '@example.com')).status, 404);
  assert.equal((await ver(C.pedido, 'c@example.com')).status, 404, 'bloqueado aunque el email sea correcto');
  assert.equal((await (await F(U('/api/pedido/' + C.token))).json()).seguimiento.fase, 'recibido');
});
await t('Límite por IP: la 21.ª consulta seguida se frena (y una IP frenada no escribe más en la base de datos)', async () => {
  const h = { 'X-Test-IP': '10.77.7.7' }; let ult;
  for (let i = 0; i < 22; i++) ult = await ver(A.pedido, 'ana@example.com', h);
  assert.equal(ult.status, 429);
  const n0 = (await s.env.DB.prepare('SELECT SUM(n) n FROM limites').first()).n; await ver(A.pedido, 'ana@example.com', h); await ver(A.pedido, 'ana@example.com', h);
  assert.equal((await s.env.DB.prepare('SELECT SUM(n) n FROM limites').first()).n, n0);
});
await t('Enlaces de transportista: solo los conocidos y con códigos válidos; el resto muestra el código sin enlace', async () => {
  assert.match(urlSeguimiento('SEUR', 'AB123456'), /^https:\/\/www\.seur\.com\//); assert.match(urlSeguimiento('Correos Express', 'AB123456'), /^https:\/\/s\.correosexpress\.com\//);
  assert.equal(urlSeguimiento('Vinted To Go', 'AB123456'), ''); assert.equal(urlSeguimiento('InPost', 'AB123456'), ''); assert.equal(urlSeguimiento('Correos', '../../etc'), ''); assert.equal(urlSeguimiento('Correos', 'a b<c>'), '');
  assert(codigoOk('PQ7321998801') && !codigoOk('ab') && !codigoOk('a'.repeat(50)) && !codigoOk('x;y;z;1'));
  assert.equal(vistaSeguimiento({ id: 'W-1', estado: 'pagado', fase: 'preparando', transportista: 'Correos', codigo_seg: 'ABCD1234', lineas: '[]', envio: '{}' }).codigo, '', 'el código solo se enseña al enviar');
});

await s.close();
console.log('\nTIENDA · SEGUIMIENTO\n' + out.join('\n') + `\n\n${pass} correctas · ${fail} fallidas`);
process.exit(fail ? 1 : 0);
