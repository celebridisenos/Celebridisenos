// Prueba de la tienda en un navegador real (Chromium), en MÓVIL y ORDENADOR, con el pago de Stripe SIMULADO.
// node test/e2e.test.js
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from './servidor.js';
import { ejemplo, CONFIG_PRUEBA } from './ejemplo.js';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0, P; const log = [];
const ok = (c, m) => { if (!c) throw new Error(m || 'falló'); };
async function step(n, fn) { try { await fn(); pass++; log.push('  ✔ ' + n); } catch (e) { fail++; log.push('  ✘ ' + n + '\n      ' + String(e.stack || e).split('\n').slice(0, 3).join(' | ')); try { await P.screenshot({ path: path.join(SHOTS, 'FALLO_' + fail + '.png'), fullPage: true }); } catch (x) { } } }
const shot = (n, full = true) => P.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: full });

const s = await start(); await ejemplo(s);
const browser = await pw.chromium.launch();
const errores = [], csp = [];
async function page(vp) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'es-ES', deviceScaleFactor: vp.width < 500 ? 2 : 1, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errores.push(m.text()); });
  return p;
}

// ================= MÓVIL =================
P = await page({ width: 390, height: 844 });
await step('Portada en el móvil SIN campaña: hero con productos reales, confianza, colección sin repetidos y «Así de fácil»; ni ofertas, ni porcentajes, ni contador', async () => {
  await P.goto(s.url + '/');
  await P.waitForSelector('.tarjeta');
  const t = await P.textContent('main');
  ok(/Ver la colección/.test(t) && /Pago seguro/.test(t) && /Así de fácil/.test(t) && /Todos los productos/.test(t), t.slice(0, 300));
  ok(await P.locator('.hero-vitrina .vit').count() >= 1, 'el hero enseña productos reales'); ok(await P.locator('.confianza .conf').count() >= 3, 'bloque de confianza');
  const ids = await P.$$eval('#catalogo .tarjeta', a => a.map(x => x.getAttribute('href'))); ok(new Set(ids).size === ids.length, 'ningún producto repetido');
  ok(!/Promociones|Ofertas|−\d+ %|Ahorras|termina en/.test(t), 'SIN campaña real: ni ofertas, ni porcentajes, ni contador');
  ok(await P.locator('s, .e-oferta, .cinta-campana, .reloj').count() === 0, 'nada tachado');
  ok(await P.locator('.chip', { hasText: 'Accesorios' }).count() === 1);
  ok(await P.locator('a.wa-flotante[href^="https://wa.me/34600000000"]').count() === 1, 'WhatsApp visible');
  ok(await P.locator('img:not([alt])').count() === 0, 'todas las imágenes tienen texto alternativo');
  await shot('movil_portada');
});
await step('Buscar y filtrar por categoría', async () => {
  await P.fill('input[type=search]', 'lampara'); await P.press('input[type=search]', 'Enter');
  await P.waitForSelector('h2:has-text("Resultados de «lampara»")');
  ok(await P.locator('.rejilla .tarjeta').count() === 1 && (await P.textContent('.rejilla')).includes('Lámpara Nube'));
  await P.goto(s.url + '/'); await P.click('.chip:has-text("Accesorios")');
  ok((await P.locator('.rejilla .tarjeta').allTextContents()).every(x => /Llavero|Soporte/.test(x)));
});
await step('Añadir rápido (+) desde la tarjeta: el contador de la cesta sube', async () => {
  await P.click('.rejilla .tarjeta:has-text("Llavero") .mas');
  await P.waitForSelector('#contador-cesta:has-text("1")');
});
await step('Ficha: generada en el servidor, galería, color OBLIGATORIO, cantidad y barra fija abajo', async () => {
  await P.goto(s.url + '/p/maceta-luna');
  await P.waitForSelector('.opcion');
  ok(await P.locator('.barra-movil').isVisible(), 'barra fija en el móvil');
  await P.click('.barra-movil button:has-text("Añadir a la cesta")');
  await P.waitForSelector('text=Elige color antes de añadir.');
  await P.click('.valor:has-text("Rosa")');
  await P.click('.cantidad button[aria-label="Más"]');
  await P.click('.comprar-fila button:has-text("Añadir a la cesta")');
  await P.waitForSelector('#contador-cesta:has-text("3")');
  ok(await P.locator('.miniaturas button').count() === 2, '2 fotos');
  ok((await P.textContent('main')).includes('Envío desde 4,33 €'));
  await shot('movil_ficha');
});
await step('Cesta: líneas, envío según peso y país (InPost solo España), total y botones COMPRAR / CONTINUAR COMPRANDO', async () => {
  await P.goto(s.url + '/cesta');
  await P.waitForSelector('.resumen');
  const t = await P.textContent('main');
  ok(/Maceta Luna/.test(t) && /Color: Rosa/.test(t) && /Llavero personalizado/.test(t), t);
  ok(/Económico · InPost/.test(t) && /4,33/.test(t), 'económico 4,33 € (940 g)');
  ok(/Total\s*46,33\s€/.test(t.replace(/\u00a0/g, ' ')), t.replace(/\u00a0/g, ' ').match(/Total[^I]*/)[0]); // 2×18 + 6 + 4,33
  ok(!/Ahorras|Añade \d/.test(t), 'sin promociones no hay ahorro ni «añade más»');
  await P.selectOption('.resumen select', 'PT');
  await P.waitForFunction(() => !document.body.textContent.includes('InPost'));
  await P.selectOption('.resumen select', 'ES'); await P.waitForSelector('text=Económico · InPost');
  ok(await P.locator('a:has-text("CONTINUAR COMPRANDO")').count() === 1);
  await shot('movil_cesta');
  await P.click('a:has-text("COMPRAR")');
  await P.waitForSelector('h1:has-text("Finalizar compra")');
});
await step('Comprar: los errores se dicen campo a campo (los comprueba el servidor)', async () => {
  await P.fill('#f-nombre', 'Ana Prueba'); await P.fill('#f-email', 'ana@'); await P.fill('#f-telefono', '600000001');
  await P.fill('#f-direccion', 'Calle Falsa 1'); await P.fill('#f-cp', '2800'); await P.fill('#f-ciudad', 'Madrid');
  await P.click('button:has-text("Pagar")');
  await P.waitForSelector('text=Marca la casilla');
  await P.check('#acepto'); await P.click('button:has-text("Pagar")');
  await P.waitForSelector('.campo.mal >> text=El email no parece correcto.');
  ok(await P.locator('.campo.mal >> text=El código postal no es válido').count() === 1);
  await shot('movil_comprar_errores');
});
let tokenPedido = '';
await step('Pagar → página segura de Stripe (simulada) → vuelve a «¡Gracias!»; la cesta se vacía', async () => {
  await P.fill('#f-email', 'ana@example.com'); await P.fill('#f-cp', '28001');
  ok((await P.textContent('button.btn.acc')).includes('Pagar 46,33'));
  await Promise.all([P.waitForURL(/\/__stripe\//), P.click('button:has-text("Pagar")')]);
  ok((await P.textContent('body')).includes('Envío: Económico'));
  await Promise.all([P.waitForURL(/\/gracias/), P.click('#pagar')]);
  await P.waitForSelector('h1:has-text("¡Gracias por tu pedido!")', { timeout: 20000 });
  ok(await P.locator('#contador-cesta').textContent() === '', 'cesta vacía');
  tokenPedido = new URL(P.url()).searchParams.get('p');
  await shot('movil_gracias');
});
await step('Seguimiento: desde «¡Gracias!» → «Seguir mi pedido» (enlace secreto) con línea de tiempo; al enviarlo el programa, aparece el código y el enlace del transportista', async () => {
  await P.goto(s.url + '/gracias?p=' + tokenPedido); await P.waitForSelector('a:has-text("Seguir mi pedido")');
  await Promise.all([P.waitForURL(/\/seguimiento\?p=/), P.click('main a:has-text("Seguir mi pedido")')]);
  await P.waitForSelector('.seg-pasos');
  ok(await P.locator('.seg-pasos li').count() === 5 && /Recibido/.test(await P.textContent('.seg-pasos li.ahora')), 'cinco pasos, el actual es «Recibido»');
  const idp = (await P.textContent('.seg-wrap .num')).trim(); ok(/^W-\d{8}-[0-9A-F]{6}$/.test(idp), idp);
  ok(!/Calle Falsa|ana@example/.test(await P.textContent('main')), 'sin datos personales en pantalla');
  await shot('movil_seguimiento_recibido');
  await s.interno('POST', '/api/interno/seguimiento', { pedidos: [{ id: idp, fase: 'enviado', transportista: 'Correos', codigo: 'PQ7321998801' }] });
  await P.reload(); await P.waitForSelector('.seg-env');
  ok(/Enviado/.test(await P.textContent('.seg-pasos li.ahora')) && (await P.textContent('.seg-env')).includes('PQ7321998801'), 'enviado con código');
  ok((await P.getAttribute('.seg-env a', 'href')).startsWith('https://www.correos.es/'), 'enlace del transportista');
  ok(await P.getAttribute('.seg-env a', 'rel') === 'noopener noreferrer', 'rel seguro');
  await shot('movil_seguimiento_enviado');
  // por formulario: número + email; con un email equivocado se dice sin dar pistas
  await P.goto(s.url + '/seguimiento'); await P.waitForSelector('form.seg-form');
  await P.fill('input[name=pedido]', idp); await P.fill('input[name=email]', 'otra@example.com'); await P.click('button:has-text("Ver mi pedido")');
  await P.waitForSelector('.aviso.mal >> text=No encontramos ese pedido');
  await P.fill('input[name=email]', 'ana@example.com'); await P.click('button:has-text("Ver mi pedido")');
  await P.waitForSelector('.seg-pasos'); ok(/Enviado/.test(await P.textContent('.seg-pasos li.ahora')));
  // desde el pie de la web
  await P.goto(s.url + '/'); await P.waitForSelector('footer a:has-text("Seguir mi pedido")');
});
await step('El programa recoge el pedido PAGADO con sus datos (firma interna)', async () => {
  const r = await s.interno('GET', '/api/interno/pedidos');
  ok(r.data.pedidos.length === 1, JSON.stringify(r.data));
  const p = r.data.pedidos[0];
  ok(p.totalCent === 4633 && p.cliente.cp === '28001' && p.lineas.length === 2 && p.envio.id === 'economico');
});
await step('Páginas: Quiénes somos, Envíos y devoluciones, y legales (lo que falta se marca «Pendiente», no se inventa)', async () => {
  await P.goto(s.url + '/quienes-somos'); await P.waitForSelector('.quienes-hero h1:has-text("Hacemos realidad tus ideas")');
  await shot('movil_quienes');
  await P.goto(s.url + '/envios'); await P.waitForSelector('h2:has-text("Devoluciones")');
  ok((await P.textContent('main')).includes('Enviamos a: España, Portugal'));
  await P.goto(s.url + '/aviso-legal'); await P.waitForSelector('text=Pendiente de completar: NIF');
  await P.goto(s.url + '/condiciones'); await P.waitForSelector('h2:has-text("Derecho de desistimiento")');
  await P.goto(s.url + '/no-existe'); ok((await P.textContent('h1')).includes('no existe'));
});

// ================= ORDENADOR =================
P = await page({ width: 1366, height: 900 });
await step('Ordenador: portada en rejilla de 4 columnas, ficha con galería fija y productos relacionados', async () => {
  await P.goto(s.url + '/'); await P.waitForSelector('.rejilla .tarjeta');
  const cols = await P.evaluate(() => getComputedStyle(document.querySelector('.rejilla')).gridTemplateColumns.split(' ').length);
  ok(cols === 4, 'columnas ' + cols);
  await shot('pc_portada');
  await P.goto(s.url + '/p/clip-de-repuesto'); await P.waitForSelector('h2:has-text("También te puede gustar")');
  ok((await P.textContent('.carrusel')).includes('Soporte de auriculares'));
  ok(!(await P.locator('.barra-movil').isVisible()), 'sin barra móvil en el ordenador');
  await P.goto(s.url + '/p/organizador-de-escritorio'); await P.waitForSelector('button:has-text("Agotado")');
  ok(await P.locator('button:has-text("Agotado")').first().isDisabled() && await P.locator('a:has-text("Avísame cuando haya")').count() === 1);
  await P.goto(s.url + '/p/maceta-luna'); await P.waitForSelector('.opcion'); await shot('pc_ficha', false);
});
await step('Sin errores de JavaScript ni bloqueos de la política de seguridad (CSP)', async () => { ok(!errores.length, errores.join(' | ')); ok(!csp.length, csp.join(' | ')); });
await step('Ligera: HTML + CSS + JS de la portada por debajo de 90 KB sin comprimir (sin librerías ni fuentes externas)', async () => {
  const kb = ['/index.html', '/css/tienda.css', '/js/tienda.js'].map(f => fs.statSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', f)).size).reduce((a, b) => a + b, 0) / 1024;
  ok(kb < 90, kb.toFixed(1) + ' KB');
});

// ================= CELEBRY DAY (campaña REAL publicada por el programa) =================
await step('CELEBRY DAY activa: la web cambia de aspecto (cinta, portada con temporizador real, tarjetas de campaña) y solo rebaja lo configurado', async () => {
  const fin = Date.now() + 30000;
  const r = await s.interno('POST', '/api/interno/campanas', { campanas: [{ id: 'celebry', nombre: 'CELEBRY DAY', estado: 'lista', tipo: 'manual', inicio: new Date(Date.now() - 60000).toISOString(), fin: new Date(fin).toISOString(), aspecto: { color: '#ff3d7f', color2: '#7b2cff', emoji: '✨', titulo: 'CELEBRY DAY', mensaje: 'Días especiales de CelebriDiseños' } }],
    promociones: [{ id: 'maceta10', campanaId: 'celebry', nombre: 'Maceta −10 %', tipo: 'porcentaje', valor: 10, incluidos: ['p_maceta'], activa: true }, { id: 'tres', campanaId: 'celebry', nombre: '3 o más productos', tipo: 'cantidad_porcentaje', valor: 5, minimo: 3, activa: true }] });
  ok(r.status === 200, JSON.stringify(r.data));
  P = await page({ width: 390, height: 844 });
  await P.goto(s.url + '/');
  await P.waitForSelector('.cinta-campana'); await P.waitForSelector('.hero-campana .reloj');
  ok(await P.evaluate(() => document.body.classList.contains('modo-campana')));
  const t = await P.textContent('.hero-campana');
  ok(/CELEBRY DAY/.test(t) && /3 o más productos: −5 %/.test(t) && /La campaña termina en/.test(t), t);
  const seg = await P.evaluate(() => [...document.querySelectorAll('.hero-campana .reloj b')].map(b => Number(b.textContent)));
  ok(seg[0] === 0 && seg[1] === 0 && seg[2] === 0 && seg[3] > 10 && seg[3] <= 30, 'cuenta atrás real: ' + seg.join(':'));
  ok(await P.locator('.tarjeta.en-campana').count() >= 1 && (await P.locator('.tarjeta.en-campana').first().textContent()).includes('−10 %'));
  ok(await P.locator('.tarjeta.en-campana', { hasText: 'Lámpara' }).count() === 0, 'la lámpara no tiene descuento de producto');
  await shot('movil_celebry_portada');
  await P.reload(); await P.waitForSelector('.hero-campana .reloj');
  const seg2 = await P.evaluate(() => Number([...document.querySelectorAll('.hero-campana .reloj b')][3].textContent));
  ok(seg2 <= seg[3], 'tras recargar sigue bajando (no se reinicia): ' + seg2);
});
await step('Cesta en campaña: «añade 1 más» con 2 productos y descuento real con 3; «Comprar ahora» va directo a la compra', async () => {
  await P.evaluate(() => localStorage.removeItem('cd.cesta'));
  await P.goto(s.url + '/p/llavero-personalizado'); await P.waitForSelector('.comprar-fila');
  await P.click('.cantidad button[aria-label="Más"]');
  await P.click('.comprar-fila button:has-text("Añadir a la cesta")');
  await P.goto(s.url + '/cesta'); await P.waitForSelector('.resumen');
  ok((await P.textContent('.resumen')).includes('Añade 1 producto más y consigue −5 %'));
  await P.click('.linea .cantidad button[aria-label="Más"]'); await P.waitForSelector('.fila.desc');
  const t = (await P.textContent('.resumen')).replace(/ /g, ' ');
  ok(/3 o más productos.*−0,90 €/.test(t), t);
  await shot('movil_celebry_cesta');
  await P.goto(s.url + '/p/maceta-luna'); await P.waitForSelector('.camp-ficha');
  await P.click('.valor:has-text("Negro")');
  await Promise.all([P.waitForURL(/\/comprar/), P.click('.info button:has-text("Comprar ahora")')]);
  await P.waitForSelector('.resumen .fila.desc');
  await shot('movil_celebry_comprar');
});
await step('Al llegar a cero la campaña DESAPARECE sola: sin cinta, sin contador, sin tachados y con los precios normales', async () => {
  await P.goto(s.url + '/');
  await P.waitForFunction(() => !document.querySelector('.cinta-campana') && document.querySelector('.tarjeta') && !document.body.classList.contains('modo-campana'), null, { timeout: 45000 });
  await P.waitForSelector('.rejilla .tarjeta');
  ok(await P.locator('s, .e-oferta, .reloj').count() === 0);
  ok((await P.textContent('.rejilla')).includes('18,00'), 'maceta de nuevo a 18 €');
  await shot('movil_celebry_terminada');
});

// ================= PAGO NO ACTIVADO =================
const s2 = await start({ stripe: false }); await ejemplo(s2);
await step('Sin Stripe: «Enviar mi pedido» registra el pedido (Bizum/efectivo), abre «¡Pedido registrado!» con el botón de WhatsApp y el nº de pedido, y se puede seguir', async () => {
  const p = await page({ width: 390, height: 844 }); P = p;
  await p.goto(s2.url + '/p/llavero-personalizado'); await p.waitForSelector('.comprar-fila button');
  await p.click('.comprar-fila button:has-text("Añadir a la cesta")');
  await p.goto(s2.url + '/cesta'); await p.waitForSelector('.resumen');
  const cesta = await p.textContent('.resumen'); ok(/WhatsApp/.test(cesta) && !/Stripe/.test(cesta), 'la cesta no habla de Stripe: ' + cesta);
  await p.goto(s2.url + '/comprar'); await p.waitForSelector('#f-nombre');
  const txt = await p.textContent('main'); ok(!/Stripe/.test(txt) && /48 horas/.test(txt) && /Bizum/.test(txt), 'comprar en modo WhatsApp: ' + txt.slice(0, 300));
  await p.fill('#f-nombre', 'Bea'); await p.fill('#f-email', 'bea@example.com'); await p.fill('#f-telefono', '600000002'); await p.fill('#f-direccion', 'Calle Uno 2'); await p.fill('#f-cp', '08001'); await p.fill('#f-ciudad', 'Barcelona');
  await p.selectOption('#f-metodo', 'efectivo'); await p.check('#acepto');
  ok(/Enviar mi pedido/.test(await p.textContent('.btn.acc.grande')));
  await p.click('button:has-text("Enviar mi pedido")');
  await p.waitForSelector('h1:has-text("Pedido registrado")');
  const wa = await p.waitForSelector('a.btn.wa:has-text("Confirmar por WhatsApp")');
  const href = decodeURIComponent(await wa.getAttribute('href'));
  ok(href.startsWith('https://wa.me/34600000000') && /acabo de hacer el pedido W-\d{8}-[0-9A-F]{6}/.test(href) && href.includes('1 × Llavero personalizado') && href.includes('Total: 10,33') && href.includes('en efectivo'), href);
  ok((await p.textContent('main')).includes('Hasta entonces no has pagado nada'));
  await shot('movil_pedido_whatsapp');
  await p.click('a:has-text("Seguir mi pedido")'); await p.waitForSelector('.aviso.warn');
  ok(/falta confirmarlo|Falta confirmarlo/.test(await p.textContent('main')), 'el seguimiento dice que falta confirmar');
  const filas = (await s2.env.DB.prepare("SELECT estado, metodo FROM pedidos").all()).results; ok(filas.length === 1 && filas[0].estado === 'whatsapp' && filas[0].metodo === 'efectivo', JSON.stringify(filas));
  ok(s2.stripeCalls.length === 0, 'no se llamó a Stripe');
  const pp = await page({ width: 390, height: 844 }); await pp.goto(s2.url + '/condiciones'); await pp.waitForSelector('article.texto');
  const leg = await pp.textContent('article.texto'); ok(!/Stripe/.test(leg) && /Bizum o efectivo/.test(leg), 'condiciones sin Stripe');
  await pp.goto(s2.url + '/privacidad'); await pp.waitForSelector('article.texto'); ok(!/Stripe/.test(await pp.textContent('article.texto')));
});
await s2.close();

// ================= DESCUENTO WEB (−4 %) y WhatsApp con lo elegido =================
await step('Descuento web 4 %: precio web en tarjeta y ficha, fila en la cesta, y «Comprar por WhatsApp» con variante y cantidad elegidas (se actualiza solo)', async () => {
  ok((await s.interno('POST', '/api/interno/config', { config: Object.assign({}, CONFIG_PRUEBA, { descuentoWeb: { activo: true, pct: 4, combinable: false } }) })).status === 200);
  await s.interno('POST', '/api/interno/campanas', { campanas: [], promociones: [] });
  P = await page({ width: 390, height: 844 });
  await P.goto(s.url + '/'); await P.waitForSelector('.tarjeta');
  const tarj = await P.locator('.tarjeta', { hasText: 'Maceta Luna' }).first().textContent();
  ok(/18,00/.test(tarj) && /17,28/.test(tarj) && /comprando en la web/.test(tarj), tarj);
  await P.goto(s.url + '/p/maceta-luna'); await P.waitForSelector('.precio-web');
  ok(/17,28/.test(await P.textContent('.precio-web')) && /−4 %/.test(await P.textContent('.precio-web')));
  await P.click('.valor:has-text("Rosa")');
  await P.click('.cantidad button[aria-label="Más"]');
  const wa = decodeURIComponent(await P.locator('a.btn.wa:has-text("Comprar por WhatsApp")').getAttribute('href'));
  ok(wa.includes('Maceta Luna') && wa.includes('Color: Rosa') && wa.includes('Cantidad: 2') && wa.includes('/p/maceta-luna'), wa);
  ok(await P.locator('details.wa-pasos li').count() === 6, '6 pasos');
  await P.click('.btn.pri.grande:has-text("Añadir a la cesta")'); await P.goto(s.url + '/cesta');
  await P.waitForSelector('.fila.desc');
  const c = await P.textContent('main'); ok(/Descuento web 4 %/.test(c) && /−1,44/.test(c), c.slice(0, 400));
  await shot('movil_descuento_web');
});
await step('Al final de todo (también en campaña): sin errores de JavaScript ni bloqueos de CSP', async () => { ok(!errores.length, errores.join(' | ')); ok(!csp.length, csp.join(' | ')); });

await browser.close(); await s.close();
console.log('\nTIENDA EN EL NAVEGADOR\n' + log.join('\n') + `\n\n${pass} correctas · ${fail} fallidas`);
process.exit(fail ? 1 : 0);
