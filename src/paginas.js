// ================= Páginas generadas en el servidor (SEO) =================
// /p/<slug>     ficha de producto con título, descripción, imagen y datos estructurados (schema.org/Product)
// /sitemap.xml  todas las páginas públicas
// /robots.txt
import { publico } from './logica.js';
import { promosActivas, proximoCambio } from './campanas.js';
import { parseJSON } from './logica.js';
import { getConfig } from './api.js';
import { SEC_HEADERS } from './seguridad.js';

export const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = c => (Number(c) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
// JSON dentro de <script type="application/ld+json">: se escapan «<» para que no pueda cerrar la etiqueta
const safeJson = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export const CSP = "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'none'; worker-src 'none'; media-src 'none'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'; upgrade-insecure-requests";
const html = (status, body, cache) => new Response(body, { status, headers: Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP, 'Cache-Control': cache || 'public, max-age=60' }, SEC_HEADERS) });

export function pageShell({ title, desc, canonical, image, page, head = '', body = '', datos = null, tienda = 'CelebriDiseños' }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="${esc(tienda)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="theme-color" content="#0fb5d4">
<link rel="icon" href="/img/icono.png">
<link rel="stylesheet" href="/css/tienda.css">
${head}
</head>
<body data-page="${esc(page)}">
<div id="cabecera"></div>
<main id="main">${body}</main>
<div id="pie"></div>
${datos ? `<script type="application/json" id="datos">${safeJson(datos)}</script>` : ''}
<script type="module" src="/js/tienda.js"></script>
</body>
</html>`;
}

export async function paginaProducto(req, env, slug) {
  const url = new URL(req.url), origin = url.origin;
  if (!env.DB || !/^[a-z0-9-]{1,80}$/.test(slug)) return noEncontrado(origin);
  const row = await env.DB.prepare("SELECT * FROM productos WHERE slug = ? AND estado = 'publicado'").bind(slug).first();
  if (!row) return noEncontrado(origin);
  const cfg = await getConfig(env), tienda = (cfg.tienda && cfg.tienda.nombre) || 'CelebriDiseños';
  const cs = ((await env.DB.prepare('SELECT datos FROM campanas').all()).results || []).map(r => parseJSON(r.datos, null)).filter(Boolean);
  const ps = ((await env.DB.prepare('SELECT datos FROM promociones').all()).results || []).map(r => parseJSON(r.datos, null)).filter(Boolean);
  const now = Date.now(), prox = proximoCambio(cs, ps, now), cacheP = 'public, max-age=' + Math.max(0, Math.min(60, Math.floor((prox - now) / 1000)));
  const p = publico(row, promosActivas(cs, ps, now)), img = p.fotos[0] ? origin + '/api/img/' + p.fotos[0] : '';
  const title = (p.seoTitulo || p.nombre) + ' · ' + tienda, desc = (p.seoDesc || p.descripcion || p.nombre).replace(/\s+/g, ' ').slice(0, 160);
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.nombre, description: desc, sku: p.id, image: p.fotos.map(f => origin + '/api/img/' + f), category: p.categoria || undefined,
    brand: { '@type': 'Brand', name: tienda },
    offers: { '@type': 'Offer', priceCurrency: 'EUR', price: (p.precio / 100).toFixed(2), url: origin + '/p/' + p.slug, availability: p.disponible === 'agotado' ? 'https://schema.org/OutOfStock' : p.disponible === 'bajo_pedido' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock', priceValidUntil: p.promo && p.promo.hasta ? p.promo.hasta.slice(0, 10) : undefined } };
  // contenido inicial ya escrito (lo ven los buscadores y la gente aunque el JavaScript tarde); luego tienda.js lo hace interactivo
  const body = `<article class="ficha" id="ficha">
  <nav class="migas" aria-label="Estás en"><a href="/">Inicio</a>${p.categoria ? ` › <a href="/?c=${encodeURIComponent(p.categoria)}">${esc(p.categoria)}</a>` : ''} › <span>${esc(p.nombre)}</span></nav>
  <div class="ficha-grid">
    <div class="galeria">${p.fotos.length ? `<img class="foto-principal" src="/api/img/${esc(p.fotos[0])}" alt="${esc(p.nombre)}" width="900" height="900" fetchpriority="high">` : '<div class="sin-foto">Sin foto</div>'}</div>
    <div class="info">
      <h1>${esc(p.nombre)}</h1>
      <div class="precio-grande"><b>${eur(p.precio)}</b>${p.antes ? ` <s>${eur(p.antes)}</s> <span class="badge-oferta">−${p.descuento} %</span>` : ''}</div>
      <p class="descripcion">${esc(p.descripcion).replace(/\n/g, '<br>')}</p>
    </div>
  </div>
</article>`;
  return html(200, pageShell({ title, desc, canonical: origin + '/p/' + p.slug, image: img, page: 'producto', tienda, head: `<script type="application/ld+json">${safeJson(ld)}</script>`, body, datos: { producto: p } }), cacheP);
}
function noEncontrado(origin) {
  return html(404, pageShell({ title: 'Producto no encontrado', desc: 'Este producto no existe o ya no está a la venta.', canonical: origin + '/', page: 'no-encontrado', body: '<section class="vacio"><h1>Este producto ya no está a la venta</h1><p><a class="btn" href="/">Ver la tienda</a></p></section>' }), 'no-store');
}

export async function sitemap(req, env) {
  const origin = new URL(req.url).origin;
  const rows = env.DB ? ((await env.DB.prepare("SELECT slug, actualizado FROM productos WHERE estado = 'publicado'").all()).results || []) : [];
  const urls = ['/', '/quienes-somos', '/envios'].map(u => `<url><loc>${esc(origin + u)}</loc></url>`)
    .concat(rows.map(r => `<url><loc>${esc(origin + '/p/' + r.slug)}</loc><lastmod>${esc(String(r.actualizado).slice(0, 10))}</lastmod></url>`));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, { headers: Object.assign({ 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }, SEC_HEADERS) });
}
export function robots(req) {
  const origin = new URL(req.url).origin;
  return new Response(`User-agent: *\nAllow: /\nAllow: /api/img/\nDisallow: /api/\nDisallow: /cesta\nDisallow: /comprar\nDisallow: /gracias\nSitemap: ${origin}/sitemap.xml\n`, { headers: Object.assign({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }, SEC_HEADERS) });
}
