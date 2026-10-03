// Servidor LOCAL que reproduce Cloudflare Pages para pruebas y desarrollo:
//   · archivos de public/ con direcciones limpias (/cesta → cesta.html) y las cabeceras de public/_headers
//   · /api/*  → API segura (functions/api)      · /p/<slug> → ficha generada en el servidor
//   · /sitemap.xml y /robots.txt
//   · Stripe SIMULADO (solo pruebas): crea la «sesión de pago» y una página falsa que, al pulsar «Pagar»,
//     envía el aviso firmado (webhook) igual que Stripe y vuelve a la tienda.
// Uso: node test/servidor.js   (abre http://127.0.0.1:8788 con datos de ejemplo y claves de PRUEBA generadas al vuelo)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { D1 } from './d1.js';
import { handleApi } from '../src/api.js';
import { paginaProducto, sitemap, robots } from '../src/paginas.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

function parseHeaders() {
  const out = []; let cur = null;
  for (const line of fs.readFileSync(path.join(PUB, '_headers'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { cur = { pat: line.trim(), h: {} }; out.push(cur); } else if (cur) { const i = line.indexOf(':'); cur.h[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  }
  return out;
}
const HEADERS = parseHeaders();
const headersFor = p => Object.assign({}, ...HEADERS.filter(x => x.pat === '/*' || (x.pat.endsWith('/*') && p.startsWith(x.pat.slice(0, -1))) || x.pat === p).map(x => x.h));

export const randKey = () => crypto.randomBytes(32).toString('base64url'); // ≥ 32 caracteres

// Firma una petición interna exactamente como lo hará el programa (Apps Script)
export function firmar(secret, keyId, method, pathAndQuery, bodyStr) {
  const ts = String(Date.now()), nonce = crypto.randomBytes(12).toString('base64url');
  const bh = crypto.createHash('sha256').update(bodyStr || '').digest('hex');
  const firma = crypto.createHmac('sha256', secret).update([method.toUpperCase(), pathAndQuery, ts, nonce, bh].join('\n')).digest('hex');
  return { 'X-Celebri-Clave': keyId, 'X-Celebri-Ts': ts, 'X-Celebri-Nonce': nonce, 'X-Celebri-Firma': firma };
}

export async function start(opts = {}) {
  const env = Object.assign({ DB: new D1(opts.dbFile), CLAVE_PUBLICAR: randKey(), CLAVE_PEDIDOS: randKey(), SAL_REGISTRO: randKey() }, opts.env || {});
  if (opts.stripe !== false) Object.assign(env, { STRIPE_SECRET_KEY: 'sk_test_' + 'SIMULADO'.repeat(3), STRIPE_WEBHOOK_SECRET: 'whsec_' + randKey() });
  const sessions = new Map(), stripeCalls = [], coupons = new Map();
  let base = '';
  // ---- Stripe simulado: se intercepta SOLO api.stripe.com ----
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, init) => {
    const url = String(u && u.url || u);
    if (!url.startsWith('https://api.stripe.com/')) return realFetch(u, init);
    const params = new URLSearchParams(init.body); stripeCalls.push({ url, params, headers: init.headers });
    if (opts.stripeFalla) return new Response(JSON.stringify({ error: { type: 'api_error' } }), { status: 500 });
    if (url.endsWith('/v1/coupons')) { coupons.set(params.get('id'), { id: params.get('id'), amount_off: Number(params.get('amount_off')), name: params.get('name') }); return new Response(JSON.stringify({ id: params.get('id') }), { status: 200 }); }
    const id = 'cs_test_' + crypto.randomBytes(8).toString('hex');
    sessions.set(id, { id, pedido: params.get('metadata[pedido]'), success: params.get('success_url'), cancel: params.get('cancel_url'), params });
    return new Response(JSON.stringify({ id, url: base + '/__stripe/' + id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  async function sendWebhook(type, s, extra) {
    const body = JSON.stringify({ id: 'evt_' + crypto.randomBytes(6).toString('hex'), type, data: { object: Object.assign({ id: s.id, object: 'checkout.session', payment_status: type === 'checkout.session.completed' ? 'paid' : 'unpaid', client_reference_id: s.pedido, metadata: { pedido: s.pedido } }, extra || {}) } });
    const t = Math.floor(Date.now() / 1000), sig = crypto.createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(t + '.' + body).digest('hex');
    return realFetch(base + '/api/stripe/webhook', { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=' + t + ',v1=' + sig } });
  }

  const server = http.createServer(async (rq, rs) => {
    try {
      const url = new URL(rq.url, base), p = decodeURIComponent(url.pathname);
      const chunks = []; for await (const c of rq) chunks.push(c);
      const body = Buffer.concat(chunks);
      const headers = new Headers(); Object.entries(rq.headers).forEach(([k, v]) => headers.set(k, Array.isArray(v) ? v.join(', ') : v));
      headers.set('CF-Connecting-IP', opts.ip || rq.headers['x-test-ip'] || rq.socket.remoteAddress || '127.0.0.1');
      const req = new Request(url, { method: rq.method, headers, body: ['GET', 'HEAD'].includes(rq.method) ? undefined : body });
      let res = null;
      if (p.startsWith('/__stripe/')) {
        const s = sessions.get(p.split('/')[2]);
        if (!s) res = new Response('Sesión no encontrada', { status: 404 });
        else if (url.searchParams.get('accion') === 'pagar') { const w = await sendWebhook('checkout.session.completed', s); res = w.ok ? Response.redirect(s.success, 303) : new Response('webhook ' + w.status, { status: 500 }); }
        else if (url.searchParams.get('accion') === 'cancelar') res = Response.redirect(s.cancel, 303);
        else if (url.searchParams.get('accion') === 'caducar') { const w = await sendWebhook('checkout.session.expired', s); res = new Response('caducada ' + w.status); }
        else {
          const items = [...s.params.keys()].filter(k => /^line_items\[\d+\]\[price_data\]\[product_data\]\[name\]$/.test(k)).map(k => { const i = k.match(/\d+/)[0]; return s.params.get(k) + ' × ' + s.params.get('line_items[' + i + '][quantity]') + ' — ' + (Number(s.params.get('line_items[' + i + '][price_data][unit_amount]')) / 100).toFixed(2) + ' €'; });
          const cup = coupons.get(s.params.get('discounts[0][coupon]'));
          res = new Response(`<!doctype html><meta charset="utf-8"><title>Stripe (SIMULADO)</title><body style="font-family:sans-serif;padding:30px"><h1>Pago simulado (pruebas)</h1><p>Email: ${s.params.get('customer_email')}</p><ul>${items.map(x => '<li>' + x.replace(/</g, '&lt;') + '</li>').join('')}</ul>${cup ? '<p id="cupon">' + String(cup.name).replace(/</g, '&lt;') + ': −' + (cup.amount_off / 100).toFixed(2) + ' €</p>' : ''}<p><a id="pagar" href="?accion=pagar">Pagar</a> · <a id="cancelar" href="?accion=cancelar">Cancelar</a></p></body>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
      } else if (p.startsWith('/api/')) res = await handleApi(req, env, { waitUntil() { } });
      else if (/^\/p\/[^/]+$/.test(p)) res = await paginaProducto(req, env, p.split('/')[2]);
      else if (p === '/sitemap.xml') res = await sitemap(req, env);
      else if (p === '/robots.txt') res = robots(req);
      else {
        let f = p === '/' ? '/index.html' : p;
        if (!path.extname(f)) f += '.html';
        const file = path.join(PUB, path.normalize(f).replace(/^(\.\.[\/\\])+/, ''));
        if (file.startsWith(PUB) && fs.existsSync(file) && fs.statSync(file).isFile() && !file.endsWith('_headers')) res = new Response(fs.readFileSync(file), { status: 200, headers: Object.assign({ 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }, headersFor(p)) });
        else res = new Response(fs.readFileSync(path.join(PUB, '404.html')), { status: 404, headers: Object.assign({ 'Content-Type': MIME['.html'] }, headersFor('/404')) });
      }
      const out = {}; res.headers.forEach((v, k) => { out[k] = v; });
      rs.writeHead(res.status, out);
      rs.end(Buffer.from(await res.arrayBuffer()));
    } catch (e) { console.error(e); rs.writeHead(500); rs.end('error'); }
  });
  await new Promise(r => server.listen(opts.port || 0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  // llamada interna firmada (como el programa)
  const interno = async (method, p, data, keyId = /^\/api\/interno\/(pedidos|seguimiento)/.test(p) ? 'ped' : 'pub', secret) => {
    const body = method === 'GET' ? '' : JSON.stringify(data || {});
    const h = firmar(secret || (keyId === 'ped' ? env.CLAVE_PEDIDOS : env.CLAVE_PUBLICAR), keyId, method, p, body);
    const r = await realFetch(base + p, { method, body: method === 'GET' ? undefined : body, headers: Object.assign({ 'Content-Type': 'application/json' }, h) });
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  return { url: base, env, sessions, stripeCalls, coupons, sendWebhook, interno, realFetch, close: () => { globalThis.fetch = realFetch; return new Promise(r => server.close(r)); } };
}

// ---- Arranque manual con datos de ejemplo (solo desarrollo) ----
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { ejemplo } = await import('./ejemplo.js');
  // (pruebas del programa: las claves de PRUEBA llegan por variables de entorno; nunca son claves reales)
  const env = {}; if (process.env.TEST_CLAVE_PUBLICAR) env.CLAVE_PUBLICAR = process.env.TEST_CLAVE_PUBLICAR; if (process.env.TEST_CLAVE_PEDIDOS) env.CLAVE_PEDIDOS = process.env.TEST_CLAVE_PEDIDOS;
  const s = await start({ port: Number(process.env.PORT) || 8788, env, stripe: process.env.SIN_STRIPE !== '1' });
  if (process.env.EJEMPLO !== '0') await ejemplo(s);
  console.log('LISTO ' + s.url);
  console.log('Tienda de PRUEBA en ' + s.url + ' (pago simulado; claves generadas al vuelo, no se guardan)');
}
