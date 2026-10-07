// Pruebas de SEGURIDAD ofensivo-defensivas de la tienda (v1.3). node test/seguridad.test.js
import assert from 'node:assert/strict';
import { start } from './servidor.js';
import { ejemplo } from './ejemplo.js';

let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('  ✔ ' + name); } catch (e) { fail++; out.push('  ✘ ' + name + '\n      ' + String(e.stack || e).split('\n').slice(0, 4).join(' | ')); } }
const s = await start({ stripe: true });
await ejemplo(s);
const F = s.realFetch, U = p => s.url + p, DB = s.env.DB;
const postJ = async (p, d, h) => { const r = await F(U(p), { method: 'POST', body: JSON.stringify(d), headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}) }); return { status: r.status, data: await r.json().catch(() => null) }; };
const base = { nombre: 'Ana Prueba', email: 'ana@example.com', telefono: '+34 600 000 001', direccion: 'Calle Falsa 1, 2ºB', cp: '28001', ciudad: 'Madrid', provincia: 'Madrid', pais: 'ES' };
let ipN = 1; const ip = () => ({ 'X-Test-IP': '10.5.0.' + (ipN++) });
const mk = id => ({ id, cant: 1, variante: id === 'p_lampara' ? { Color: 'Azul' } : undefined });
await DB.prepare("UPDATE productos SET stock = 100 WHERE id = 'p_lampara'").run();
const pedido = (extra, cliente, id = 'p_soporte') => postJ('/api/pedido', Object.assign({ lineas: [mk(id)], cliente: Object.assign({}, base, cliente || {}), envio: 'economico', acepto: true, ms: 9000 }, extra || {}), ip());
const n = async sql => (await DB.prepare(sql).first()).n;

out.push('\nANTI-BOTS');
await t('Campo trampa relleno → rechazado y no se crea pedido; sin tiempo (página antigua) o demasiado rápido → no se crea nada', async () => {
  const n0 = await n('SELECT COUNT(*) n FROM pedidos');
  const a = await pedido({ web: 'http://spam.example' }); assert.equal(a.status, 422);
  const b = await pedido({ ms: undefined }); assert.equal(b.status, 409); assert.equal(b.data.error, 'version_antigua');
  const c = await pedido({ ms: 300 }); assert.equal(c.status, 429); assert.equal(c.data.error, 'muy_rapido');
  const d = await pedido({ ms: 'abc' }); assert.equal(d.status, 429);
  assert.equal(await n('SELECT COUNT(*) n FROM pedidos'), n0);
  assert.equal(await n("SELECT COUNT(*) n FROM seguridad WHERE tipo = 'bot'"), 3);
  assert.equal((await pedido({ web: '' })).status, 201, 'una persona normal (trampa vacía, tarda >1,5 s) compra sin problema');
});
out.push('\nANTI-ACAPARAMIENTO DE STOCK');
await t('Una misma persona (email) con 3 pedidos sin pagar que apartan stock: el 4.º se frena aunque cambie de IP', async () => {
  const c = { email: 'acapara@example.com' };
  for (let i = 0; i < 3; i++) assert.equal((await pedido({}, c, 'p_lampara')).status, 201, 'pedido ' + (i + 1));
  const r = await pedido({}, c, 'p_lampara'); assert.equal(r.status, 429, JSON.stringify(r.data)); assert.equal(r.data.error, 'demasiados_pendientes');
  assert.equal((await pedido({}, { email: 'otra@example.com' }, 'p_lampara')).status, 201, 'otra persona sí puede comprar');
});
await t('Lo mismo por IP aunque cambie de email cada vez', async () => {
  const h = { 'X-Test-IP': '10.99.0.1' }; let ult;
  for (let i = 0; i < 4; i++) ult = await postJ('/api/pedido', { lineas: [mk('p_lampara')], cliente: Object.assign({}, base, { email: 'x' + i + '@example.com' }), envio: 'economico', acepto: true, ms: 9000 }, h);
  assert.equal(ult.status, 429); assert.equal(ult.data.error, 'demasiados_pendientes');
});
await t('Al pagar o caducar, esa persona vuelve a poder comprar (se libera solo)', async () => {
  const c = { email: 'libera@example.com' }, ids = [];
  for (let i = 0; i < 3; i++) ids.push((await pedido({}, c, 'p_lampara')).data.pedido);
  assert.equal((await pedido({}, c, 'p_lampara')).status, 429);
  await s.sendWebhook('checkout.session.expired', [...s.sessions.values()].find(x => x.pedido === ids[0]));
  assert.equal((await pedido({}, c, 'p_lampara')).status, 201);
});
await t('Los productos «bajo pedido» (sin stock contado) no se acaparan: no cuentan para el límite', async () => {
  const c = { email: 'bajo@example.com' };
  for (let i = 0; i < 5; i++) assert.equal((await pedido({}, c, 'p_llavero')).status, 201);
});
out.push('\nLÍMITES Y CUERPOS');
await t('Límite ATÓMICO: 25 peticiones simultáneas de la misma IP → como mucho 10 pasan (no se cuela ninguna por carrera)', async () => {
  const h = { 'X-Test-IP': '10.77.0.1' };
  const rs = await Promise.all(Array.from({ length: 25 }, () => postJ('/api/pedido', { lineas: [{ id: 'p_llavero', cant: 1 }], cliente: base, envio: 'economico', ms: 9000 }, h)));
  const pasan = rs.filter(r => r.status !== 429).length;
  assert.equal(pasan, 10, 'pasaron ' + pasan);
});
await t('Una IP ya bloqueada NO escribe más en la base de datos (no se pueden agotar las escrituras gratuitas insistiendo)', async () => {
  const h = { 'X-Test-IP': '10.77.0.2' };
  for (let i = 0; i < 12; i++) await postJ('/api/pedido', { lineas: [], cliente: base, ms: 9000 }, h);
  const antes = { l: await n('SELECT SUM(n) n FROM limites'), s: await n('SELECT COUNT(*) n FROM seguridad') };
  for (let i = 0; i < 30; i++) assert.equal((await postJ('/api/pedido', { lineas: [], cliente: base, ms: 9000 }, h)).status, 429);
  assert.deepEqual({ l: await n('SELECT SUM(n) n FROM limites'), s: await n('SELECT COUNT(*) n FROM seguridad') }, antes);
  // lo mismo con las rutas internas tras 20 firmas falsas
  const hi = { 'X-Test-IP': '10.77.0.3' };
  for (let i = 0; i < 22; i++) await F(U('/api/interno/estado'), { headers: Object.assign({ 'X-Celebri-Clave': 'pub', 'X-Celebri-Ts': String(Date.now()), 'X-Celebri-Nonce': 'n'.repeat(20) + i, 'X-Celebri-Firma': 'a'.repeat(64) }, hi) });
  const s0 = await n('SELECT COUNT(*) n FROM seguridad');
  for (let i = 0; i < 20; i++) assert.equal((await F(U('/api/interno/estado'), { headers: Object.assign({ 'X-Celebri-Clave': 'pub' }, hi) })).status, 429);
  assert.equal(await n('SELECT COUNT(*) n FROM seguridad'), s0);
});
await t('Cuerpo enorme SIN Content-Length (por trozos) se corta en el límite y no se procesa', async () => {
  const trozo = new TextEncoder().encode('x'.repeat(8192)); let sent = 0;
  const stream = new ReadableStream({ pull(c) { if (sent >= 40) return c.close(); sent++; c.enqueue(trozo); } });
  const r = await F(U('/api/pedido'), { method: 'POST', body: stream, duplex: 'half', headers: { 'Content-Type': 'application/json', 'X-Test-IP': '10.77.0.4' } });
  assert.equal(r.status, 400);
});
out.push('\nPAGO');
await t('Webhook con importe DISTINTO al del pedido: no se pierde la venta pero queda «REVISAR» y en el registro de seguridad', async () => {
  const r = await pedido({}, { email: 'importe@example.com' }, 'p_llavero'); assert.equal(r.status, 201);
  const ses = [...s.sessions.values()].find(x => x.pedido === r.data.pedido);
  await s.sendWebhook('checkout.session.completed', ses, { amount_total: 1, currency: 'eur' });
  const p = await DB.prepare('SELECT estado, aviso FROM pedidos WHERE id = ?').bind(r.data.pedido).first();
  assert.equal(p.estado, 'pagado'); assert.match(p.aviso, /REVISAR/);
  assert.equal(await n("SELECT COUNT(*) n FROM seguridad WHERE tipo = 'importe_distinto'"), 1);
});
await t('Webhook con importe correcto: sin aviso', async () => {
  const r = await pedido({}, { email: 'bien@example.com' }, 'p_llavero');
  const ses = [...s.sessions.values()].find(x => x.pedido === r.data.pedido);
  const tot = (await DB.prepare('SELECT total_cent FROM pedidos WHERE id = ?').bind(r.data.pedido).first()).total_cent;
  await s.sendWebhook('checkout.session.completed', ses, { amount_total: tot, currency: 'eur' });
  assert.equal((await DB.prepare('SELECT aviso FROM pedidos WHERE id = ?').bind(r.data.pedido).first()).aviso, '');
});
out.push('\nCABECERAS');
await t('Todas las páginas llevan CSP estricta (sin frames, workers ni medios), HSTS, nosniff, no-embed y permisos cerrados; la API no tiene CORS', async () => {
  for (const p of ['/', '/cesta', '/p/soporte-movil', '/api/catalogo']) {
    const r = await F(U(p)); const h = r.headers;
    if (p.startsWith('/api')) { assert.equal(h.get('access-control-allow-origin'), null); assert.equal(h.get('cache-control'), 'public, max-age=60'.replace('public, max-age=60', h.get('cache-control'))); continue; }
    const csp = h.get('content-security-policy') || '';
    assert.match(csp, /default-src 'self'/, p); assert.match(csp, /frame-src 'none'/, p); assert.match(csp, /worker-src 'none'/, p); assert.match(csp, /frame-ancestors 'none'/, p);
    assert(!/unsafe-inline|unsafe-eval|\*/.test(csp), 'CSP sin comodines: ' + p);
    assert.equal(h.get('x-frame-options'), 'DENY'); assert.equal(h.get('x-content-type-options'), 'nosniff'); assert.match(h.get('strict-transport-security'), /max-age=31536000/);
    assert.match(h.get('permissions-policy'), /camera=\(\)/);
  }
});
await t('Sondeos típicos (.env, .git, wp-admin, ../, rutas internas sin firma, métodos raros) → siempre 404/401/405 sin filtrar nada', async () => {
  for (const p of ['/.env', '/.git/config', '/wp-admin', '/api/../../etc/passwd', '/api/interno/pedidos', '/api/interno/config', '/api/admin', '/api/img/..%2f..%2fschema', '/schema.sql', '/src/api.js', '/COSTES_DEL_SISTEMA.md']) {
    const r = await F(U(p)); const txt = await r.text();
    assert([401, 404, 400].includes(r.status), p + ' → ' + r.status);
    assert(!/CLAVE_PEDIDOS|CREATE TABLE|STRIPE_SECRET|import \{/.test(txt), p + ' filtra contenido');
  }
  for (const m of ['PUT', 'DELETE', 'PATCH']) assert([404, 405].includes((await F(U('/api/pedido'), { method: m })).status), m);
});
await t('Inyección SQL / XSS / formato en todos los campos del cliente: se guarda como texto inofensivo y nunca rompe la base de datos', async () => {
  const mal = { nombre: "Robert'); DROP TABLE pedidos;--", direccion: '<img src=x onerror=alert(1)> calle 12', ciudad: '" OR 1=1 --', notas: '=IMPORTDATA("http://malo")\n<script>alert(1)</script>' };
  const r = await pedido({}, Object.assign({ email: 'sqli@example.com' }, mal), 'p_llavero'); assert.equal(r.status, 201, JSON.stringify(r.data));
  assert(await n('SELECT COUNT(*) n FROM pedidos') > 0, 'la tabla sigue ahí');
  const row = await DB.prepare('SELECT cliente FROM pedidos WHERE id = ?').bind(r.data.pedido).first(); const c = JSON.parse(row.cliente);
  assert(!/[<>]/.test(c.direccion + c.notas), 'sin etiquetas HTML'); assert(c.nombre.includes('DROP TABLE'), 'texto tal cual, sin ejecutarse');
});
out.push('\n' + `${pass} correctas · ${fail} fallidas`);
console.log(out.join('\n'));
await s.close();
process.exit(fail ? 1 : 0);
