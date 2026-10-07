// ================= CelebriDiseños · Tienda (navegador) =================
// Sin librerías. Todo el contenido se construye con textContent (nunca HTML de los datos): no hay XSS posible.
// La cesta se guarda SOLO en este navegador (localStorage) para que no se pierda; los precios los calcula el servidor.

const $ = (s, el = document) => el.querySelector(s);
function h(tag, attrs, ...kids) {
  const m = tag.match(/^([a-z0-9]+)((?:[.#][\w-]+)*)$/i), el = document.createElement(m[1]);
  (m[2].match(/[.#][\w-]+/g) || []).forEach(x => x[0] === '.' ? el.classList.add(x.slice(1)) : el.id = x.slice(1));
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  const add = k => { if (k === null || k === undefined || k === false) return; if (Array.isArray(k)) k.forEach(add); else el.append(k instanceof Node ? k : document.createTextNode(String(k))); };
  kids.forEach(add);
  return el;
}
const eur = c => (Number(c) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const img = id => '/api/img/' + encodeURIComponent(id);
const params = new URLSearchParams(location.search);
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

// ---------- Datos ----------
let CAT = null;
let OFFSET = 0; // diferencia entre la hora del servidor (la que manda) y la de este dispositivo
const ahora = () => Date.now() + OFFSET;
async function catalogo() {
  if (CAT) return CAT;
  const o = { headers: { Accept: 'application/json' } };
  try { if (sessionStorage.getItem('cd.recargar')) { o.cache = 'reload'; sessionStorage.removeItem('cd.recargar'); } } catch (e) { }
  const r = await fetch('/api/catalogo', o);
  if (!r.ok) throw new Error('No se pudo cargar la tienda');
  CAT = await r.json();
  if (CAT.ahora) OFFSET = Date.parse(CAT.ahora) - Date.now();
  if (CAT.config && CAT.config.tienda && /^#[0-9a-f]{6}$/i.test(CAT.config.tienda.color || '')) document.documentElement.style.setProperty('--acc', CAT.config.tienda.color);
  return CAT;
}
// ---------- Campaña REAL (solo si el servidor dice que hay una activa con promoción) ----------
const hex = (v, d) => /^#[0-9a-f]{6}$/i.test(v || '') ? v : d;
function campana(C) { const c = C.promos && C.promos.campana; return c && Date.parse(c.hasta) > ahora() ? c : null; }
const enAlcance = (id, inc, exc) => (!inc || !inc.length || inc.includes(id)) && !(exc && exc.includes(id));
function finCampana() { try { sessionStorage.setItem('cd.recargar', '1'); } catch (e) { } location.reload(); }
// Temporizador: se calcula SIEMPRE con la fecha real de fin y la hora del servidor (no se reinicia al recargar)
const RELOJES = new Set();
function reloj(hasta, grande) {
  const el = h(grande ? 'div.reloj' : 'span.mini-reloj', { role: 'timer', 'aria-label': 'Tiempo hasta el final de la campaña' });
  el._fin = Date.parse(hasta); el._grande = grande; RELOJES.add(el); pintarReloj(el); return el;
}
function pintarReloj(el) {
  let r = Math.max(0, Math.floor((el._fin - ahora()) / 1000));
  const d = Math.floor(r / 86400); r %= 86400; const hh = Math.floor(r / 3600); r %= 3600; const mm = Math.floor(r / 60), ss = r % 60, z = n => String(n).padStart(2, '0');
  if (el._grande) el.replaceChildren(...[[d, 'días'], [hh, 'horas'], [mm, 'min'], [ss, 'seg']].map(([v, t]) => h('div', h('b', z(v)), h('span', t))));
  else el.textContent = (d ? d + 'd ' : '') + z(hh) + ':' + z(mm) + ':' + z(ss);
}
setInterval(() => { let fin = false; RELOJES.forEach(el => { if (!el.isConnected) { RELOJES.delete(el); return; } pintarReloj(el); if (el._fin <= ahora()) fin = true; }); if (fin) finCampana(); }, 1000);
function modoCampana(C) {
  const c = campana(C); if (!c) return;
  const a = c.aspecto || {}, R = document.documentElement.style;
  R.setProperty('--camp1', hex(a.color, '#ff3d7f')); R.setProperty('--camp2', hex(a.color2, '#7b2cff'));
  document.body.classList.add('modo-campana'); if (a.efectos === false) document.body.classList.add('sin-efectos');
  $('#cabecera').prepend(h('a.cinta-campana', { href: '/?promo=1' }, h('span', (a.emoji || '✨') + ' ' + (a.titulo || c.nombre)), h('span.sep', '·'), h('span', 'termina en'), reloj(c.hasta, false)));
}

async function api(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ mensaje: 'Error de conexión' }));
  return { ok: r.ok, status: r.status, data: j };
}

// ---------- Cesta ----------
const Cesta = {
  lineas() { const l = store.get('cd.cesta', []); return Array.isArray(l) ? l.filter(x => x && x.id && Number.isInteger(x.cant) && x.cant > 0) : []; },
  guardar(l) { store.set('cd.cesta', l); pintarContador(); },
  clave: (id, v) => id + '|' + JSON.stringify(v || {}),
  anadir(id, cant, variante) {
    const l = this.lineas(), k = this.clave(id, variante), x = l.find(y => this.clave(y.id, y.variante) === k);
    if (x) x.cant = Math.min(20, x.cant + cant); else l.push({ id, cant, variante: variante || {} });
    this.guardar(l);
  },
  cambiar(i, cant) { const l = this.lineas(); if (!l[i]) return; if (cant <= 0) l.splice(i, 1); else l[i].cant = Math.min(20, cant); this.guardar(l); },
  vaciar() { this.guardar([]); },
  unidades() { return this.lineas().reduce((a, x) => a + x.cant, 0); }
};
function pintarContador() { const c = $('#contador-cesta'); if (c) c.textContent = Cesta.unidades() || ''; }

// ---------- Avisos ----------
let tt = null;
function toast(texto, enlace) {
  let t = $('.toast'); if (!t) { t = h('div.toast', { role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.replaceChildren(h('span', texto), enlace ? h('a', { href: enlace[1] }, enlace[0]) : null);
  t.classList.add('ver'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('ver'), 3200);
}

// ---------- Cabecera, pie y WhatsApp ----------
function cabecera(cfg) {
  const nombre = (cfg.tienda && cfg.tienda.nombre) || 'CelebriDiseños';
  const q = h('input', { type: 'search', name: 'q', placeholder: 'Buscar productos…', 'aria-label': 'Buscar productos', value: params.get('q') || '', enterkeyhint: 'search' });
  // barra superior: SOLO datos reales de la configuración publicada (nada inventado)
  const env = cfg.envios || {}, partes = [];
  if (env.gratisDesdeCent) partes.push('🚚 Envío gratis desde ' + eur(env.gratisDesdeCent));
  if (cfg.pago && cfg.pago.activo) partes.push('🔒 Pago seguro con tarjeta');
  if (CAT && CAT.productos.some(p => p.personalizable)) partes.push('✨ Piezas personalizables');
  $('#cabecera').replaceChildren(...[partes.length ? h('div.anuncio', h('div.anuncio-in', partes.map(t => h('span', t)))) : null, h('header.cab', h('div.cab-in',
    h('a.marca', { href: '/' }, h('img', { src: '/img/icono.png', alt: '', width: 38, height: 38 }), h('span', nombre)),
    h('nav.menu', { 'aria-label': 'Secciones' }, h('a', { href: '/#catalogo' }, 'Colección'), h('a', { href: '/quienes-somos' }, 'Quiénes somos'), h('a', { href: '/envios' }, 'Envíos')),
    h('form.buscar', { action: '/', role: 'search' }, q, h('button', { type: 'submit' }, 'Buscar')),
    h('nav.cab-acc', h('a.icono-btn', { href: '/cesta', 'aria-label': 'Cesta', title: 'Cesta' }, '🛒', h('span.contador#contador-cesta')))))].filter(Boolean));
  pintarContador();
}
function waLink(cfg, texto) { const w = cfg.whatsapp; return w ? 'https://wa.me/' + w.numero + '?text=' + encodeURIComponent(texto || w.mensaje || 'Hola') : null; }
function pie(cfg) {
  const t = cfg.tienda || {}, wa = waLink(cfg), nombre = t.nombre || 'CelebriDiseños';
  $('#pie').replaceChildren(h('footer.pie', h('div.pie-in',
    h('div.pie-marca', h('b', nombre), h('span', t.lema || 'Diseños impresos en 3D'), wa ? h('a.btn.wa', { href: wa, rel: 'noopener', target: '_blank' }, '💬 Escríbenos') : null),
    h('div', h('b', 'Tienda'), h('a', { href: '/' }, 'Todos los productos'),  CAT && CAT.productos.some(p => p.antes) ? h('a', { href: '/?promo=1' }, campana(CAT) ? '✨ ' + campana(CAT).nombre : 'Promociones') : null, h('a', { href: '/quienes-somos' }, 'Quiénes somos')),
    h('div', h('b', 'Ayuda'), h('a', { href: '/seguimiento' }, '📦 Seguir mi pedido'), h('a', { href: '/envios' }, 'Envíos y devoluciones'), wa ? h('a', { href: wa, rel: 'noopener', target: '_blank' }, 'WhatsApp Business') : null, t.instagram ? h('a', { href: 'https://www.instagram.com/' + t.instagram + '/', rel: 'noopener', target: '_blank' }, 'Instagram') : null, t.tiktok ? h('a', { href: 'https://www.tiktok.com/@' + t.tiktok, rel: 'noopener', target: '_blank' }, 'TikTok') : null),
    h('div', h('b', 'Legal'), h('a', { href: '/condiciones' }, 'Condiciones de venta'), h('a', { href: '/privacidad' }, 'Privacidad'), h('a', { href: '/cookies' }, 'Cookies'), h('a', { href: '/aviso-legal' }, 'Aviso legal'))),
    h('div.pie-base', h('span', '© ' + new Date().getFullYear() + ' ' + nombre), cfg.pago && cfg.pago.activo ? h('span', '🔒 Pago seguro con Stripe: nunca vemos tu tarjeta') : null)));
  if (wa && !$('.wa-flotante')) document.body.append(h('a.wa-flotante', { href: wa, target: '_blank', rel: 'noopener', 'aria-label': 'Escríbenos por WhatsApp Business' }, '💬', h('span.t', 'WhatsApp')));
}

// ---------- Tarjeta de producto ----------
const DISP = { en_stock: ['En stock', 'ok'], bajo_pedido: ['Se fabrica para ti', ''], agotado: ['Agotado', 'warn'] };
function tarjeta(p) {
  const enC = p.promo && p.promo.campana && CAT && campana(CAT);
  const etiq = h('div.etiq', enC ? h('span.e-campana', ((campana(CAT).aspecto || {}).emoji || '✨') + ' ' + p.promo.campana) : null, p.antes ? h('span.e-oferta', '−' + p.descuento + ' %') : null, p.personalizable && !p.antes ? h('span.e-perso', '✨ Personalizable') : null, p.novedad ? h('span.e-nuevo', 'Nuevo') : null, p.disponible === 'agotado' ? h('span.e-agotado', 'Agotado') : null);
  const rapido = !p.variantes.length && p.disponible !== 'agotado' ? h('button.mas', { type: 'button', title: 'Añadir a la cesta', 'aria-label': 'Añadir ' + p.nombre + ' a la cesta', onclick: ev => { ev.preventDefault(); Cesta.anadir(p.id, 1, {}); toast('Añadido a la cesta', ['Ver cesta', '/cesta']); } }, '+') : null;
  const d = DISP[p.disponible] || ['', ''];
  return h('a.tarjeta' + (p.antes ? '.oferta' : '') + (enC ? '.en-campana' : ''), { href: '/p/' + p.slug },
    h('div.img', p.fotos[0] ? h('img', { src: img(p.fotos[0]), alt: p.nombre, loading: 'lazy', decoding: 'async', width: 400, height: 400 }) : null, p.fotos[1] ? h('img.alt', { src: img(p.fotos[1]), alt: '', loading: 'lazy', decoding: 'async', width: 400, height: 400 }) : null),
    etiq, rapido,
    h('div.cuerpo', h('div.nombre', p.nombre), h('div.precio', h('b', eur(p.precio)), p.antes ? h('s', eur(p.antes)) : null), p.precioWeb && p.precioWeb < p.precio ? h('div.pweb', '🛒 ', h('b', eur(p.precioWeb)), ' comprando en la web') : null, h('div.disp' + (d[1] ? '.' + d[1] : ''), p.disponible === 'en_stock' && p.stock !== null && p.stock <= 3 ? 'Últimas ' + p.stock + ' unidades' : d[0])));
}

// ---------- Bloques de la portada (solo datos reales de la configuración publicada) ----------
function portadaHero(cfg, todos) {
  const vit = todos.filter(p => p.fotos[0] && p.disponible !== 'agotado').sort((a, b) => (b.destacado - a.destacado) || (b.novedad - a.novedad)).slice(0, 3);
  const env = cfg.envios || {}, desde = (env.opciones || []).map(o => o.desdeCent).filter(x => x >= 0 && isFinite(x));
  const pruebas = [cfg.pago && cfg.pago.activo ? '🔒 Pago seguro' : null, desde.length ? '🚚 Envío desde ' + eur(Math.min(...desde)) : null, todos.some(p => p.personalizable) ? '✨ Personalizable' : null].filter(Boolean);
  const wa = waLink(cfg, 'Hola, tengo una idea y quiero que la fabriquéis');
  return h('section.hero.premium',
    h('div.hero-txt', h('span.kicker', 'Impreso en 3D · Hecho con cuidado'), h('h1', cfg.tienda.lema || 'Diseños impresos en 3D, hechos para ti'),
      h('p', 'Regalos únicos, piezas personalizadas, repuestos y mejoras para tu día a día. Fabricados por nosotros y revisados uno a uno.'),
      h('div.hero-cta', h('a.btn.acc', { href: '#catalogo' }, 'Ver la colección'), wa ? h('a.btn.fantasma', { href: wa, target: '_blank', rel: 'noopener' }, '💬 Cuéntanos tu idea') : null),
      pruebas.length ? h('ul.hero-pruebas', pruebas.map(t => h('li', t))) : null),
    vit.length ? h('div.hero-vitrina.n' + vit.length, vit.map((p, i) => h('a.vit.v' + i, { href: '/p/' + p.slug, 'aria-label': p.nombre + ' ' + eur(p.precio) }, h('img', { src: img(p.fotos[0]), alt: '', width: 360, height: 360, decoding: 'async', fetchpriority: i ? 'auto' : 'high', loading: i ? 'lazy' : 'eager' }), h('span.vit-p', h('i', p.nombre), h('b', eur(p.precio)))))) : null);
}
function ventajasBloque(cfg, todos, promos) {
  const env = cfg.envios || {}, desde = (env.opciones || []).map(o => o.desdeCent).filter(x => x >= 0 && isFinite(x));
  const caja = (ic, t, d) => h('div.conf', h('span.conf-ic', { 'aria-hidden': 'true' }, ic), h('div', h('b', t), h('span', d)));
  const items = [
    cfg.pago && cfg.pago.activo ? caja('🔒', 'Pago seguro', 'Con tarjeta en la página de Stripe. Nunca vemos tus datos de pago.') : null,
    desde.length ? caja('🚚', 'Envío desde ' + eur(Math.min(...desde)), env.gratisDesdeCent ? 'Gratis a partir de ' + eur(env.gratisDesdeCent) + '. El precio exacto, antes de pagar.' : 'El precio exacto, antes de pagar.') : null,
    caja('✨', todos.some(p => p.personalizable) ? 'Hecho para ti' : 'Fabricado y revisado', todos.some(p => p.personalizable) ? 'Colores, nombres y medidas a tu gusto.' : 'Cada pieza se revisa antes de salir.'),
    caja('💬', 'Trato directo', cfg.whatsapp ? 'Hablas por WhatsApp con quien diseña tu pieza.' : 'Hablas con quien diseña tu pieza.')
  ].filter(Boolean);
  return h('div', h('section.confianza', items), promos.filter(p => p.tipo.startsWith('cantidad') && !p.campana).length ? h('div.ventajas', promos.filter(p => p.tipo.startsWith('cantidad') && !p.campana).map(p => h('span.v-promo', '🛍️ ' + p.texto))) : null);
}
function comoFunciona(cfg) {
  const paso = (n, t, d) => h('li', h('span.n', n), h('div', h('b', t), h('span', d)));
  const wa = waLink(cfg, 'Hola, tengo una idea y quiero que la fabriquéis');
  return h('section.seccion.como', h('div.seccion-h', h('h2', 'Así de fácil')),
    h('ol.pasos', paso('1', 'Elige o cuéntanos tu idea', 'Un producto de la colección o algo hecho a tu medida.'), paso('2', 'Lo fabricamos', 'Lo imprimimos en 3D y lo revisamos a mano.'), paso('3', 'Lo recibes en casa', 'Te lo enviamos bien embalado y te avisamos de cada paso.')),
    wa ? h('div.idea', h('div', h('b', '¿Tienes una idea o necesitas un repuesto?'), h('span', 'Cuéntanosla y la diseñamos y fabricamos para ti.')), h('a.btn.acc', { href: wa, target: '_blank', rel: 'noopener' }, '💬 Hablemos')) : null);
}

// ---------- Portada ----------
async function inicio(C) {
  const cfg = C.config, todos = C.productos, main = $('#main');
  const cats = [...new Set((cfg.categorias || []).concat(todos.map(p => p.categoria)).filter(c => c && todos.some(p => p.categoria === c)))];
  let cat = params.get('c') || '', q = (params.get('q') || '').trim(), soloOferta = params.get('promo') === '1', orden = 'rec';
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const camp = campana(C), promos = (C.promos && C.promos.promociones) || [], a = camp ? camp.aspecto || {} : {};
  const hero = camp
    ? h('section.hero.hero-campana', h('div.camp-emoji', { 'aria-hidden': 'true' }, a.emoji || '✨'), h('span.hero-tag', 'Campaña'), h('h1', a.titulo || camp.nombre), h('p', a.mensaje || camp.descripcion || ''),
        h('div.promo-chips', promos.filter(p => p.campana === camp.nombre).map(p => h('span', p.texto))), h('div.reloj-t', 'La campaña termina en:'), reloj(camp.hasta, true),
        h('a.btn.blanco', { href: '/?promo=1' }, 'Ver productos en campaña'))
    : portadaHero(cfg, todos);
  // ventajas: SOLO lo que es verdad con la configuración publicada
  const ventajas = ventajasBloque(cfg, todos, promos);
  const chips = h('div.chips', { role: 'tablist', 'aria-label': 'Categorías' });
  const zonas = h('div'), rejilla = h('div.rejilla'), titulo = h('h2', 'Todos los productos');
  const sel = h('select', { 'aria-label': 'Ordenar', onchange: e => { orden = e.target.value; pintar(); } }, h('option', { value: 'rec' }, 'Recomendados'), h('option', { value: 'asc' }, 'Precio: de menor a mayor'), h('option', { value: 'desc' }, 'Precio: de mayor a menor'), h('option', { value: 'nuevo' }, 'Novedades primero'));
  function pintarChips() {
    chips.replaceChildren(...[['', 'Todo']].concat(C.productos.some(p => p.antes) ? [['__oferta', camp ? (a.emoji || '✨') + ' ' + camp.nombre : '🏷️ Promociones']] : []).concat(cats.map(c => [c, c])).map(([k, t]) => h('button.chip' + ((k === '__oferta' ? soloOferta : !soloOferta && k === cat) ? '.on' : ''), { type: 'button', role: 'tab', onclick: () => { if (k === '__oferta') { soloOferta = true; cat = ''; } else { soloOferta = false; cat = k; } pintarChips(); pintar(); } }, t)));
  }
  function carrusel(t, list) { return list.length ? h('section.seccion', h('div.seccion-h', h('h2', t)), h('div.carrusel', list.slice(0, 12).map(tarjeta))) : null; }
  function pintar() {
    let list = todos.filter(p => (!cat || p.categoria === cat) && (!soloOferta || p.antes) && (!q || norm(p.nombre + ' ' + p.descripcion + ' ' + p.categoria).includes(norm(q))));
    if (orden === 'asc') list.sort((a, b) => a.precio - b.precio); else if (orden === 'desc') list.sort((a, b) => b.precio - a.precio); else if (orden === 'nuevo') list.sort((a, b) => b.novedad - a.novedad);
    else list.sort((a, b) => (a.disponible === 'agotado') - (b.disponible === 'agotado'));
    const filtrando = cat || q || soloOferta;
    const masV = (cfg.masVendidos || []).map(id => todos.find(p => p.id === id)).filter(Boolean); // solo con ventas REALES (lo calcula el programa)
    // secciones de portada sin repetir productos; con pocos productos basta la colección completa
    const visto = new Set(), unicos = l => l.filter(p => !visto.has(p.id) && visto.add(p.id));
    const grande = todos.length > 8, banda = (t, l) => carrusel(t, unicos(l));
    zonas.replaceChildren(...(filtrando ? [] : [banda(camp ? (a.emoji || '✨') + ' En ' + camp.nombre : '🏷️ Promociones', todos.filter(p => p.antes && p.disponible !== 'agotado')), banda('🔥 Lo más vendido', masV), grande ? banda('⭐ Destacados', todos.filter(p => p.destacado)) : null, grande ? banda('✨ Novedades', todos.filter(p => p.novedad)) : null]).filter(Boolean));
    titulo.textContent = q ? 'Resultados de «' + q + '»' : soloOferta ? (camp ? camp.nombre : 'Promociones') : cat || 'Todos los productos';
    rejilla.replaceChildren(...(list.length ? list.map(tarjeta) : [h('div.vacio', h('div.grande', '🔎'), h('p', 'No hemos encontrado productos.'), cfg.whatsapp ? h('a.btn.wa', { href: waLink(cfg, 'Hola, busco: ' + q), target: '_blank', rel: 'noopener' }, '💬 Pregúntanos por WhatsApp') : null)]));
  }
  pintarChips(); pintar();
  main.replaceChildren(...[hero, ventajas, zonas, h('section.seccion#catalogo', h('div.seccion-h', titulo, sel), chips, rejilla), q || cat || soloOferta ? null : comoFunciona(cfg)].filter(Boolean));
}

// ---------- Ficha de producto ----------
const COLORES = { blanco: '#ffffff', negro: '#111111', rosa: '#f4a7c3', rojo: '#e53935', azul: '#3b82f6', 'azul marino': '#1e3a8a', celeste: '#7dd3fc', verde: '#22c55e', amarillo: '#facc15', gris: '#9ca3af', morado: '#8b5cf6', lila: '#c4b5fd', naranja: '#fb923c', dorado: '#d4af37', oro: '#d4af37', plateado: '#c0c0c0', plata: '#c0c0c0', marron: '#8b5a2b', beige: '#e8d8b8', turquesa: '#2dd4bf', fucsia: '#e11d74', crema: '#f5f0e1', madera: '#b07a4a' };
const colorDe = v => COLORES[String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()];
async function producto(C) {
  const datos = JSON.parse($('#datos').textContent), p = datos.producto, cfg = C.config;
  const vivo = C.productos.find(x => x.id === p.id) || p; // datos frescos del catálogo si los hay
  const sel = {}; let cant = 1;
  // galería
  const pista = h('div.pista', vivo.fotos.map((f, i) => h('img', { src: img(f), alt: vivo.nombre + (i ? ' · foto ' + (i + 1) : ''), width: 900, height: 900, loading: i ? 'lazy' : 'eager', decoding: 'async' })));
  const minis = vivo.fotos.length > 1 ? h('div.miniaturas', vivo.fotos.map((f, i) => h('button' + (i ? '' : '.on'), { type: 'button', 'aria-label': 'Ver foto ' + (i + 1), onclick: ev => { pista.children[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); minis.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === ev.currentTarget)); } }, h('img', { src: img(f), alt: '', loading: 'lazy', width: 64, height: 64 })))) : null;
  pista.addEventListener('scroll', () => { if (!minis) return; const i = Math.round(pista.scrollLeft / pista.clientWidth); minis.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', i === j)); }, { passive: true });
  const galeria = h('div.galeria', vivo.fotos.length ? pista : h('div.sin-foto', 'Sin foto'), minis);
  // opciones
  const aviso = h('div');
  const opciones = vivo.variantes.map(v => {
    const elegido = h('span');
    const btns = v.valores.map(val => { const c = colorDe(val); return h('button.valor', { type: 'button', 'aria-pressed': 'false', onclick: ev => { sel[v.nombre] = val; elegido.textContent = ': ' + val; ev.currentTarget.parentNode.querySelectorAll('.valor').forEach(b => { const on = b === ev.currentTarget; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); aviso.replaceChildren(); refrescaWa(); } }, c ? h('span.muestra', { 'data-c': c }) : null, val); });
    return h('div.opcion', h('div.lbl', v.nombre, elegido), h('div.valores', btns));
  });
  const out = h('output', '1');
  const cantidad = h('div.cantidad', h('button', { type: 'button', 'aria-label': 'Menos', onclick: () => { cant = Math.max(1, cant - 1); out.textContent = cant; refrescaWa(); } }, '−'), out, h('button', { type: 'button', 'aria-label': 'Más', onclick: () => { cant = Math.min(vivo.stock !== null ? Math.max(1, vivo.stock) : 20, cant + 1); out.textContent = cant; refrescaWa(); } }, '+'));
  const agotado = vivo.disponible === 'agotado';
  function anadir() {
    const falta = vivo.variantes.find(v => !sel[v.nombre]);
    if (falta) { aviso.replaceChildren(h('p.aviso.warn', 'Elige ' + falta.nombre.toLowerCase() + ' antes de añadir.')); aviso.scrollIntoView({ block: 'center', behavior: 'smooth' }); return false; }
    Cesta.anadir(vivo.id, cant, Object.assign({}, sel)); toast('Añadido a la cesta', ['Ver cesta', '/cesta']); return true;
  }
  const btnAnadir = (cls = '') => h('button.btn.pri.grande' + cls, { type: 'button', disabled: agotado, onclick: anadir }, agotado ? 'Agotado' : 'Añadir a la cesta');
  // «Comprar ahora»: añade y va directo a la compra (camino distinto de WhatsApp)
  const btnComprar = (cls = '') => agotado ? null : h('button.btn.acc.grande' + cls, { type: 'button', onclick: () => { if (anadir()) location.href = '/comprar'; } }, 'Comprar ahora');
  const url = location.origin + '/p/' + vivo.slug;
  const wa = waLink(cfg, 'Hola, tengo una pregunta sobre «' + vivo.nombre + '» (' + url + ')');
  // Mensaje de WhatsApp con lo que el cliente tiene elegido AHORA (variante y cantidad); se actualiza solo al cambiar
  const waTexto = () => { const v = Object.entries(sel).filter(([, x]) => x).map(([k, x]) => k + ': ' + x).join(', '); return 'Hola, quiero comprar «' + vivo.nombre + '»' + (v ? ' (' + v + ')' : '') + ' · Cantidad: ' + cant + '\n' + url; };
  const waBtn = cfg.whatsapp ? h('a.btn.wa', { href: waLink(cfg, waTexto()), target: '_blank', rel: 'noopener' }, '💬 Comprar por WhatsApp') : null;
  const refrescaWa = () => { if (waBtn) waBtn.href = waLink(cfg, waTexto()); };
  const dwPct = vivo.precioWeb && vivo.precioWeb < vivo.precio ? vivo.descuentoWebPct : 0;
  const pasosWa = waBtn ? h('details.wa-pasos', h('summary', '¿Cómo es comprar por WhatsApp?'), h('ol',
    h('li', 'Pulsa «Comprar por WhatsApp»: se abre el chat con el producto, la variante y la cantidad ya escritos.'),
    h('li', 'Envía el mensaje (puedes añadir lo que quieras personalizar).'),
    h('li', 'Te confirmamos disponibilidad, plazo y precio final.'),
    h('li', 'Acordamos entrega: envío a casa o recogida.'),
    h('li', 'Acordamos la forma de pago.'),
    h('li', 'Preparamos tu pedido y te avisamos de cada paso.')), dwPct ? h('p.tiny', 'Comprando en la web ahorras un ' + dwPct + ' %' + (cfg.pago.activo ? ' y pagas al momento con tarjeta.' : '.')) : null) : null;
  const env = cfg.envios || {}, desde = (env.opciones || []).map(o => o.desdeCent).filter(x => x >= 0 && x !== null && isFinite(x));
  const dias = (cfg.legal && cfg.legal.devolucionesDias) || '14';
  const datosEnvio = h('div.datos-envio',
    h('div', h('span.ic', '🏭'), h('span', vivo.disponible === 'bajo_pedido' ? 'Se fabrica para ti' + (vivo.plazoDias ? ': listo en unos ' + vivo.plazoDias + ' días' : '') : vivo.disponible === 'en_stock' ? (vivo.stock !== null && vivo.stock <= 3 ? 'En stock · últimas ' + vivo.stock + ' unidades' : 'En stock: sale enseguida') : 'Agotado ahora mismo')),
    h('div', h('span.ic', '🚚'), h('span', desde.length ? 'Envío desde ' + eur(Math.min(...desde)) + (env.gratisDesdeCent ? ' · gratis desde ' + eur(env.gratisDesdeCent) : '') + ' (precio exacto antes de pagar)' : 'Envío: consúltanos')),
    vivo.personalizable ? h('div', h('span.ic', '✨'), h('span', 'Personalizable: cuéntanos tu idea por WhatsApp antes de comprar.')) : null,
    h('div', h('span.ic', '↩️'), h('span', dias + ' días para devolverlo (salvo productos personalizados)')),
    cfg.pago && cfg.pago.activo ? h('div', h('span.ic', '🔒'), h('span', 'Pago seguro con tarjeta (y Bizum si está disponible), en la página de Stripe')) : h('div', h('span.ic', '💬'), h('span', 'De momento, los pedidos se cierran por WhatsApp')));
  const C2 = campana(C), qtyP = ((C.promos && C.promos.promociones) || []).filter(p => p.tipo.startsWith('cantidad') && enAlcance(vivo.id, p.alcance && p.alcance.inc, p.alcance && p.alcance.exc) && enAlcance(vivo.id, p.alcance && p.alcance.cInc, p.alcance && p.alcance.cExc));
  const campStrip = vivo.promo && C2 && vivo.promo.campana ? h('div.camp-ficha', h('b', ((C2.aspecto || {}).emoji || '✨') + ' ' + C2.nombre), h('span', 'termina en'), reloj(C2.hasta, false)) : null;
  const car = vivo.caracteristicas.length ? h('table.tabla-car', h('tbody', vivo.caracteristicas.map(c => h('tr', h('th', c[0]), h('td', c[1]))))) : null;
  const info = h('div.info',
    h('h1', vivo.nombre),
    h('div.precio-grande' + (vivo.antes ? '.oferta' : ''), h('b', eur(vivo.precio)), vivo.antes ? h('s', eur(vivo.antes)) : null, vivo.antes ? h('span.badge-oferta', '−' + vivo.descuento + ' %') : null),
    dwPct ? h('div.precio-web', '🛒 ', h('b', eur(vivo.precioWeb)), ' comprando en la web ', h('span.badge-web', '−' + dwPct + ' %')) : null,
    campStrip, qtyP.map(p => h('div.aviso.campana', '🛍️ ' + p.texto + (p.campana ? ' · ' + p.campana : ''))),
    opciones, h('div.comprar-fila', cantidad, btnAnadir()), btnComprar(), aviso,
    agotado && wa ? h('a.btn.wa', { href: waLink(cfg, 'Hola, ¿cuándo volveréis a tener «' + vivo.nombre + '»?'), target: '_blank', rel: 'noopener' }, '💬 Avísame cuando haya') : null,
    datosEnvio,
    waBtn, pasosWa,
    wa ? h('a.enlace-wa', { href: wa, target: '_blank', rel: 'noopener' }, 'Solo tengo una pregunta') : null,
    vivo.descripcion ? h('section.seccion', h('h2', 'Descripción'), h('p.descripcion', vivo.descripcion)) : null,
    car ? h('section.seccion', h('h2', 'Características'), car) : null);
  const migas = h('nav.migas', { 'aria-label': 'Estás en' }, h('a', { href: '/' }, 'Inicio'), vivo.categoria ? [' › ', h('a', { href: '/?c=' + encodeURIComponent(vivo.categoria) }, vivo.categoria)] : null, ' › ', h('span', vivo.nombre));
  const rel = C.productos.filter(x => x.id !== vivo.id && (vivo.relacionados.includes(x.id) || x.categoria === vivo.categoria)).slice(0, 8);
  $('#main').replaceChildren(...[h('article.ficha', migas, h('div.ficha-grid', galeria, info)), rel.length ? h('section.seccion', h('div.seccion-h', h('h2', 'También te puede gustar')), h('div.carrusel', rel.map(tarjeta))) : null,
    h('div.barra-movil', h('div.precio' + (vivo.antes ? '.oferta' : ''), h('b', eur(vivo.precio))), btnAnadir('.mini'), btnComprar('.mini'))].filter(Boolean));
  document.querySelectorAll('.muestra[data-c]').forEach(m => { m.style.background = m.dataset.c; });
}

// ---------- Cesta ----------
async function cesta(C) {
  const cfg = C.config, main = $('#main');
  let pais = store.get('cd.pais', 'ES'), envio = store.get('cd.envio', ''), Q = null;
  if (params.get('cancelado')) toast('Pago cancelado: tu cesta sigue aquí.');
  async function pintar() {
    const L = Cesta.lineas();
    if (!L.length) { main.replaceChildren(h('div.pagina-h', h('h1', 'Tu cesta')), h('div.vacio', h('div.grande', '🛒'), h('p', 'Tu cesta está vacía.'), h('a.btn.pri', { href: '/' }, 'Ver productos'))); return; }
    main.replaceChildren(h('div.pagina-h', h('h1', 'Tu cesta')), h('p.cargando', 'Calculando…'));
    const r = await api('/api/envio/cotizar', { lineas: L, pais });
    if (!r.ok) {
      // un producto ya no está o falta algo: se dice y se puede quitar
      main.replaceChildren(h('div.pagina-h', h('h1', 'Tu cesta')), h('p.aviso.mal', r.data.mensaje || 'Revisa tu cesta.'), lista(L, null), h('div.botones', h('button.btn', { type: 'button', onclick: () => { Cesta.vaciar(); pintar(); } }, 'Vaciar la cesta'), h('a.btn', { href: '/' }, 'Continuar comprando')));
      return;
    }
    Q = r.data;
    if (!Q.opciones.find(o => o.id === envio)) envio = Q.opciones[0] ? Q.opciones[0].id : '';
    const op = Q.opciones.find(o => o.id === envio);
    const paisSel = h('select', { 'aria-label': 'País de envío', onchange: e => { pais = e.target.value; store.set('cd.pais', pais); pintar(); } }, (cfg.envios.paises.length ? cfg.envios.paises : ['ES']).map(c => h('option', { value: c, selected: c === pais }, nombrePais(c))));
    const ops = h('div.envios-op', Q.opciones.map(o => h('label.op' + (o.id === envio ? '.on' : ''), h('input', { type: 'radio', name: 'envio', value: o.id, checked: o.id === envio, onchange: () => { envio = o.id; store.set('cd.envio', envio); pintar(); } }), h('span.t', h('b', o.nombre + (o.transportista ? ' · ' + o.transportista : '')), h('small', [o.descripcion, o.plazo].filter(Boolean).join(' · '))), h('span.p', o.gratis ? 'Gratis' : eur(o.cent)))));
    const total = Q.productosCent + (op ? op.cent : 0);
    const resumen = h('aside.resumen.caja', h('h2', 'Resumen'),
      h('div.fila', h('span', 'Subtotal'), h('b', eur(Q.subtotalCent))), ...descuentoFilas(Q),
      h('div.campo', h('label', 'Enviar a'), paisSel), Q.opciones.length ? ops : h('p.aviso.warn', Q.aviso),
      h('div.fila', h('span', 'Envío'), h('b', op ? (op.gratis ? 'Gratis' : eur(op.cent)) : '—')),
      h('div.fila.total', h('span', 'Total'), h('span', eur(total))), h('div.tiny', 'IVA incluido'),
      h('div.botones', h('a.btn.acc.grande' + (op ? '' : '.oculto'), { href: '/comprar', id: 'comprar' }, 'COMPRAR'), h('a.btn.grande', { href: '/' }, 'CONTINUAR COMPRANDO')),
      !op && cfg.whatsapp ? h('a.btn.wa.grande', { href: waLink(cfg, 'Hola, quiero hacer un pedido:\n' + Q.lineas.map(l => '· ' + l.cant + ' × ' + l.nombre + varTxt(l.variante)).join('\n') + '\nEnvío a: ' + nombrePais(pais)), target: '_blank', rel: 'noopener' }, '💬 Pedir por WhatsApp') : null,
      h('div.seguro', cfg.pago.activo ? '🔒 Pagas en la página segura de Stripe: tus datos de tarjeta nunca pasan por esta web.' : '💬 Cierras el pedido por WhatsApp y pagas por Bizum o en efectivo.'));
    main.replaceChildren(h('div.pagina-h', h('h1', 'Tu cesta'), h('span.disp', Cesta.unidades() + ' artículo(s)')), h('div.dos-col', lista(L, Q), resumen));
  }
  function lista(L, Q) {
    return h('section', L.map((l, i) => {
      const p = C.productos.find(x => x.id === l.id), q = Q && Q.lineas[i];
      return h('div.linea', p && p.fotos[0] ? h('img', { src: img(p.fotos[0]), alt: '', width: 84, height: 84, loading: 'lazy' }) : h('div.ph'),
        h('div', p ? h('a.n', { href: '/p/' + p.slug }, p.nombre) : h('span.n', 'Producto no disponible'), h('div.v', varTxt(l.variante).replace(/^ · /, '')),
          h('div.acciones', h('div.cantidad', h('button', { type: 'button', 'aria-label': 'Menos', onclick: () => { Cesta.cambiar(i, l.cant - 1); pintar(); } }, '−'), h('output', String(l.cant)), h('button', { type: 'button', 'aria-label': 'Más', onclick: () => { Cesta.cambiar(i, l.cant + 1); pintar(); } }, '+')),
            h('button.enlace', { type: 'button', onclick: () => { Cesta.cambiar(i, 0); pintar(); } }, 'Quitar'))),
        h('div.imp', q ? [q.antesCent ? h('s.tiny', eur(q.antesCent * q.cant)) : null, h('div', eur(q.totalCent))] : ''));
    }));
  }
  await pintar();
}
// Descuento REAL por cantidad (si se cumple) o lo que falta para conseguirlo; nada si no hay promoción activa
function descuentoFilas(Q) {
  const out = [];
  if (Q.descuento && Q.descuento.cent > 0) out.push(h('div.fila.desc', h('span', '✨ ' + Q.descuento.nombre + (Q.descuento.campana ? ' · ' + Q.descuento.campana : '')), h('b.ahorro', '−' + eur(Q.descuento.cent))));
  if (Q.descuentoWeb && Q.descuentoWeb.cent > 0) out.push(h('div.fila.desc', h('span', '🛒 ' + Q.descuentoWeb.nombre + ' (por comprar en la web)'), h('b.ahorro', '−' + eur(Q.descuentoWeb.cent))));
  (Q.pistas || []).forEach(p => out.push(h('p.aviso.campana', '🛍️ Añade ' + p.faltan + ' producto' + (p.faltan > 1 ? 's' : '') + ' más y consigue ' + (p.tipo === 'cantidad_porcentaje' ? '−' + p.valor + ' %' : '−' + eur(p.valor)) + ' («' + p.promo + '»).')));
  if (Q.ahorroCent > (Q.descuentoCent || 0)) out.push(h('div.fila', h('span', 'Ahorras en total'), h('span.ahorro', '−' + eur(Q.ahorroCent))));
  return out;
}
const varTxt = v => { const x = Object.entries(v || {}).map(([k, val]) => k + ': ' + val); return x.length ? ' · ' + x.join(', ') : ''; };
const PAISES = { ES: 'España', PT: 'Portugal', FR: 'Francia', IT: 'Italia', DE: 'Alemania', AD: 'Andorra' };
const nombrePais = c => PAISES[c] || c;

// ---------- Comprar: datos → envío → pago ----------
async function comprar(C) {
  const cfg = C.config, main = $('#main'), L = Cesta.lineas();
  if (!L.length) { location.replace('/cesta'); return; }
  const guardado = store.get('cd.cliente', {});
  const campos = [['nombre', 'Nombre y apellidos', 'name', 'ancho'], ['email', 'Email', 'email'], ['telefono', 'Teléfono', 'tel'], ['direccion', 'Dirección (calle, número, piso)', 'street-address', 'ancho'], ['cp', 'Código postal', 'postal-code'], ['ciudad', 'Población', 'address-level2'], ['provincia', 'Provincia', 'address-level1'], ['pais', 'País', 'country']];
  const F = {}, E = {};
  const campo = ([k, t, ac, cls]) => {
    const inp = k === 'pais' ? h('select', { id: 'f-' + k, autocomplete: ac }, (cfg.envios.paises.length ? cfg.envios.paises : ['ES']).map(c => h('option', { value: c, selected: c === (guardado.pais || store.get('cd.pais', 'ES')) }, nombrePais(c))))
      : h('input', { id: 'f-' + k, name: k, autocomplete: ac, type: k === 'email' ? 'email' : k === 'telefono' ? 'tel' : 'text', inputmode: k === 'cp' ? 'numeric' : k === 'telefono' ? 'tel' : null, value: guardado[k] || '', required: k !== 'provincia' });
    F[k] = inp; E[k] = h('div.err', { role: 'alert' });
    return h('div.campo' + (cls ? '.' + cls : ''), h('label', { for: 'f-' + k }, t + (k === 'provincia' ? ' (opcional)' : '')), inp, E[k]);
  };
  const notas = h('textarea', { id: 'f-notas', rows: 2, maxlength: 300, placeholder: 'Personalización, horario de entrega…' });
  let Q = null, envio = store.get('cd.envio', '');
  const opsBox = h('div.envios-op'), resumen = h('aside.resumen.caja'), acepto = h('input', { type: 'checkbox', id: 'acepto' }), errBox = h('div');
  const man = !cfg.pago.activo, metodo = h('select', { id: 'f-metodo', 'aria-label': 'Forma de pago' }, h('option', { value: 'bizum' }, 'Bizum'), h('option', { value: 'efectivo' }, 'Efectivo (en mano al recoger o entregar)'));
  const pagar = h('button.btn.acc.grande', { type: 'button', onclick: enviar }, man ? 'Enviar mi pedido' : 'Pagar de forma segura');
  async function cotizarYpintar() {
    const r = await api('/api/envio/cotizar', { lineas: L, pais: F.pais.value });
    if (!r.ok) { errBox.replaceChildren(h('p.aviso.mal', r.data.mensaje || 'Revisa tu cesta.', ' ', h('a', { href: '/cesta' }, 'Ir a la cesta'))); return; }
    Q = r.data; if (!Q.opciones.find(o => o.id === envio)) envio = Q.opciones[0] ? Q.opciones[0].id : '';
    opsBox.replaceChildren(...(Q.opciones.length ? Q.opciones.map(o => h('label.op' + (o.id === envio ? '.on' : ''), h('input', { type: 'radio', name: 'envio', value: o.id, checked: o.id === envio, onchange: () => { envio = o.id; store.set('cd.envio', envio); cotizarYpintar(); } }), h('span.t', h('b', o.nombre + (o.transportista ? ' · ' + o.transportista : '')), h('small', [o.descripcion, o.plazo].filter(Boolean).join(' · '))), h('span.p', o.gratis ? 'Gratis' : eur(o.cent)))) : [h('p.aviso.warn', Q.aviso)]));
    const op = Q.opciones.find(o => o.id === envio), total = Q.productosCent + (op ? op.cent : 0);
    resumen.replaceChildren(h('h2', 'Tu pedido'), ...Q.lineas.map(l => h('div.fila', h('span', l.cant + ' × ' + l.nombre + varTxt(l.variante)), h('b', eur(l.totalCent)))),
      h('div.fila', h('span', 'Subtotal'), h('b', eur(Q.subtotalCent))), ...descuentoFilas(Q), h('div.fila', h('span', 'Envío'), h('b', op ? (op.gratis ? 'Gratis' : eur(op.cent)) : '—')), h('div.fila.total', h('span', 'Total'), h('span', eur(total))), h('div.disp', 'IVA incluido'));
    pagar.textContent = op ? (man ? 'Enviar mi pedido · ' : 'Pagar ') + eur(total) + (man ? '' : ' de forma segura') : 'Elige un envío';
    pagar.disabled = !op; pagar.dataset.total = String(total);
  }
  // anti-bots: campo trampa invisible (las personas no lo ven; los bots lo rellenan) y tiempo desde que se abrió el formulario
  const t0 = Date.now(), trampa = h('input', { type: 'text', name: 'fax_empresa', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
  const form = h('div', h('div.trampa', { 'aria-hidden': 'true' }, trampa), h('section.paso', h('h2', h('span.num', '1'), 'Tus datos'), h('div.campos', campos.map(campo), h('div.campo.ancho', h('label', { for: 'f-notas' }, 'Notas (opcional)'), notas))),
    h('section.paso', h('h2', h('span.num', '2'), 'Envío'), opsBox),
    h('section.paso', h('h2', h('span.num', '3'), man ? 'Cómo quieres pagar' : 'Pago'), man ? h('div.campo', h('label', { for: 'f-metodo' }, 'Pagarás al confirmar el pedido por WhatsApp'), metodo) : null,
      h('label.check', acepto, h('span', 'He leído y acepto las ', h('a', { href: '/condiciones', target: '_blank' }, 'condiciones de venta'), ' y la ', h('a', { href: '/privacidad', target: '_blank' }, 'política de privacidad'), '.')),
      errBox, pagar, h('div.seguro', man ? '💬 Tu pedido queda apartado 48 horas. Te escribimos por WhatsApp para confirmar la entrega y el pago; hasta entonces no pagas nada.' : '🔒 Se abrirá la página segura de Stripe para pagar con tarjeta (y Bizum, si está disponible). Esta web nunca ve tu tarjeta.')));
  main.replaceChildren(h('div.pagina-h', h('h1', 'Finalizar compra')), h('div.dos-col', form, resumen));
  F.pais.addEventListener('change', () => { store.set('cd.pais', F.pais.value); cotizarYpintar(); });
  await cotizarYpintar();
  async function enviar() {
    Object.values(E).forEach(e => { e.textContent = ''; e.parentNode.classList.remove('mal'); }); errBox.replaceChildren();
    const cliente = {}; Object.keys(F).forEach(k => { cliente[k] = F[k].value.trim(); }); cliente.notas = notas.value.trim();
    store.set('cd.cliente', Object.assign({}, cliente, { notas: '' })); // para no tener que volver a escribirlo (solo en este navegador)
    if (!acepto.checked) { errBox.replaceChildren(h('p.aviso.warn', 'Marca la casilla de condiciones y privacidad para continuar.')); return; }
    pagar.disabled = true; const txt = pagar.textContent; pagar.textContent = man ? 'Registrando tu pedido…' : 'Abriendo el pago seguro…';
    const pedir = () => api('/api/pedido', { lineas: L, cliente, envio, acepto: true, totalVisto: Number(pagar.dataset.total), web: trampa.value, ms: Date.now() - t0, metodo: metodo.value });
    let r = await pedir();
    if (r.data && r.data.error === 'muy_rapido') { await new Promise(x => setTimeout(x, 1700)); r = await pedir(); } // pulsó tan rápido que parece un robot: se espera un instante y se reintenta solo
    if (r.ok && r.data.modo === 'whatsapp') { store.set('cd.ultimo', r.data.token); location.href = '/gracias?p=' + r.data.token; return; }
    if (r.ok && r.data.pagoUrl && /^https:\/\/|^http:\/\/127\.0\.0\.1/.test(r.data.pagoUrl)) { store.set('cd.ultimo', r.data.token); location.href = r.data.pagoUrl; return; }
    pagar.disabled = false; pagar.textContent = txt;
    const d = r.data || {};
    if (d.errores && !Array.isArray(d.errores)) { Object.entries(d.errores).forEach(([k, m]) => { if (E[k]) { E[k].textContent = m; E[k].parentNode.classList.add('mal'); } }); const first = Object.keys(d.errores)[0]; if (F[first]) F[first].focus(); errBox.replaceChildren(h('p.aviso.mal', 'Revisa los datos marcados.')); return; }
    if (d.error === 'muy_rapido') { errBox.replaceChildren(h('p.aviso.warn', d.mensaje)); return; }
    if (d.error === 'precio_cambiado') { await cotizarYpintar(); errBox.replaceChildren(h('p.aviso.warn', d.mensaje + ' Nuevo total: ' + eur(d.totalCent) + '.')); return; }
    if (d.error === 'pago_no_activo' && cfg.whatsapp) {
      const msg = 'Hola, quiero hacer este pedido:\n' + Q.lineas.map(l => '· ' + l.cant + ' × ' + l.nombre + varTxt(l.variante)).join('\n') + '\nEnvío: ' + ((Q.opciones.find(o => o.id === envio) || {}).nombre || '') + '\nTotal: ' + eur(Number(pagar.dataset.total)) + '\nA nombre de: ' + cliente.nombre + ' (' + cliente.cp + ' ' + cliente.ciudad + ')';
      errBox.replaceChildren(h('p.aviso.warn', d.mensaje), h('a.btn.wa.grande', { href: waLink(cfg, msg), target: '_blank', rel: 'noopener' }, '💬 Hacer el pedido por WhatsApp')); return;
    }
    errBox.replaceChildren(h('p.aviso.mal', d.mensaje || 'No se pudo continuar. Inténtalo de nuevo.'));
  }
}

// ---------- Gracias ----------
async function gracias(C) {
  const token = (params.get('p') || '').replace(/[^0-9a-f]/g, ''), main = $('#main');
  if (token.length !== 32) { main.replaceChildren(h('div.vacio', h('h1', 'Pedido no encontrado'), h('a.btn', { href: '/' }, 'Volver a la tienda'))); return; }
  const box = h('div.vacio', h('p.cargando', 'Comprobando el pago…'));
  main.replaceChildren(box);
  for (let i = 0; i < 20; i++) {
    const r = await fetch('/api/pedido/' + token); const d = await r.json().catch(() => ({}));
    if (r.ok && d.estado === 'pagado') {
      Cesta.vaciar();
      box.replaceChildren(h('div.grande', '🎉'), h('h1', '¡Gracias por tu pedido!'), h('p', 'Pedido ', h('b', d.id), ' · ' + eur(d.totalCent)), h('div.caja.texto', d.lineas.map(l => h('div.fila', h('span', l.cant + ' × ' + l.nombre + varTxt(l.variante)), h('b', eur(l.totalCent)))), d.descuentoCent ? h('div.fila', h('span', '✨ Descuento de la promoción'), h('b.ahorro', '−' + eur(d.descuentoCent))) : null, h('div.fila', h('span', 'Envío: ' + d.envio), h('b', eur(d.envioCent)))),
        h('p', 'Te llegará el recibo del pago por email.'), h('div.caja.texto', h('b', '📦 Guarda este enlace'), h('p', 'Aquí verás cómo va tu pedido y su código de seguimiento.'), h('a.btn.acc', { href: '/seguimiento?p=' + token }, 'Seguir mi pedido')), C.config.whatsapp ? h('a.btn.wa', { href: waLink(C.config, 'Hola, sobre mi pedido ' + d.id), target: '_blank', rel: 'noopener' }, '💬 ¿Dudas? Escríbenos') : null, h('p', h('a.btn', { href: '/' }, 'Seguir mirando')));
      return;
    }
    if (r.ok && d.estado === 'whatsapp') { Cesta.vaciar(); box.replaceChildren(...(await import('/js/whatsapp.js')).graciasWa(d, token, C, { h, eur, varTxt, waLink })); return; }
    if (r.ok && (d.estado === 'expirado' || d.estado === 'fallido' || d.estado === 'cancelado')) { box.replaceChildren(h('h1', 'El pago no se completó'), h('p', 'No se ha cobrado nada. Tu cesta sigue guardada.'), h('a.btn.pri', { href: '/cesta' }, 'Volver a la cesta')); return; }
    await new Promise(r => setTimeout(r, i < 5 ? 1000 : 3000));
  }
  box.replaceChildren(h('h1', 'Estamos confirmando tu pago'), h('p', 'Puede tardar unos minutos (por ejemplo, con Bizum). Recibirás el recibo por email.'), h('a.btn', { href: location.href }, 'Volver a comprobar'));
}


// Seguimiento del pedido (v1.4): se carga SOLO en su página (la portada no pesa más)
const seguimiento = C => import('/js/seguimiento.js').then(m => m.seguimiento(C, { h, $, params, waLink, varTxt }));

// ---------- Páginas de texto ----------
const pend = (v, que) => v ? v : h('span.pendiente', 'Pendiente de completar: ' + que);
const QUIENES_DEF = {
  titulo: 'Diseñamos y fabricamos lo que imaginas',
  texto: 'En CelebriDiseños convertimos ideas en piezas reales. Diseñamos e imprimimos en 3D objetos personalizados, regalos únicos, repuestos que ya no se encuentran y mejoras para las cosas que usas cada día.\n\nCada pedido pasa por nuestras manos: cuidamos el acabado, revisamos cada pieza y te atendemos de tú a tú. ¿Tienes una idea? Cuéntanosla.',
  puntos: [{ icono: '🎨', titulo: 'Personalización', texto: 'Colores, nombres, medidas… lo hacemos a tu manera.' }, { icono: '✨', titulo: 'Alto acabado', texto: 'Revisamos cada pieza antes de enviarla.' }, { icono: '🔧', titulo: 'Repuestos', texto: '¿Se rompió una pieza que ya no venden? La diseñamos y la fabricamos.' }, { icono: '🚀', titulo: 'Mejoras y soluciones', texto: 'Adaptamos objetos para que funcionen mejor en tu día a día.' }, { icono: '💶', titulo: 'Buen precio', texto: 'Lo fabricamos nosotros, sin intermediarios.' }, { icono: '💬', titulo: 'Atención cercana', texto: 'Hablas directamente con quien diseña tu pieza.' }, { icono: '💡', titulo: 'Creatividad', texto: 'Diseños propios que no verás en otra tienda.' }, { icono: '🏅', titulo: 'Calidad', texto: 'Materiales elegidos para que duren.' }]
};
function quienes(C) {
  const q = C.config.quienes && C.config.quienes.titulo ? C.config.quienes : QUIENES_DEF, wa = waLink(C.config, 'Hola, tengo una idea para un diseño');
  $('#main').replaceChildren(h('section.quienes-hero', h('h1', q.titulo), h('p', q.texto)), h('div.puntos', (q.puntos && q.puntos.length ? q.puntos : QUIENES_DEF.puntos).map(x => h('div.punto', h('div.i', x.icono), h('b', x.titulo), h('p', x.texto)))),
    h('section.seccion', h('div.botones', h('a.btn.pri.grande', { href: '/' }, 'Ver la tienda'), wa ? h('a.btn.wa.grande', { href: wa, target: '_blank', rel: 'noopener' }, '💬 Cuéntanos tu idea por WhatsApp') : null)));
}
function envios(C) {
  const E = C.config.envios || {}, L = C.config.legal || {}, dias = L.devolucionesDias || '14';
  $('#main').replaceChildren(h('article.texto', h('h1', 'Envíos y devoluciones'),
    h('h2', 'Formas de envío'), E.opciones && E.opciones.length ? h('ul', E.opciones.map(o => h('li', h('b', o.nombre + (o.transportista ? ' (' + o.transportista + ')' : '')), ': ' + [o.descripcion, o.plazo].filter(Boolean).join(' · ') + (isFinite(o.desdeCent) ? ' · desde ' + eur(o.desdeCent) : '')))) : h('p', pend('', 'formas de envío')),
    E.gratisDesdeCent ? h('p', '🚚 Envío gratis en pedidos desde ' + eur(E.gratisDesdeCent) + ' (en la opción indicada al comprar).') : null,
    h('p', 'Enviamos a: ' + ((E.paises || []).map(nombrePais).join(', ') || '—') + '. El precio exacto del envío se calcula con el peso del pedido y se muestra ANTES de pagar.'),
    h('p', 'Los productos «bajo pedido» se fabrican para ti: el plazo de fabricación se indica en cada producto y se suma al del transporte.'),
    h('h2', 'Devoluciones'), h('p', 'Tienes ' + dias + ' días naturales desde que recibes el pedido para desistir de la compra, sin dar explicaciones. Escríbenos y te diremos cómo devolverlo. Te devolvemos el importe en un máximo de 14 días desde que nos comunicas el desistimiento (podemos esperar a recibir el producto).'),
    h('p', 'No se pueden devolver los productos hechos según tus indicaciones o claramente personalizados (por ejemplo, con tu nombre o medidas a medida), salvo que lleguen defectuosos.'),
    h('p', 'Si algo llega roto o con un defecto, escríbenos con una foto y lo solucionamos.'), h('p', 'Más detalles en las ', h('a', { href: '/condiciones' }, 'condiciones de venta'), '.')));
}
const legal = (C, doc) => import('/js/legal.js').then(m => m.legal(C, doc, { h, $, pend }));

// ---------- Arranque ----------
const PAGES = { inicio, producto, cesta, comprar, gracias, quienes, envios, seguimiento };
(async () => {
  const page = document.body.dataset.page;
  try {
    const C = await catalogo();
    cabecera(C.config); modoCampana(C); pie(C.config);
    if (PAGES[page]) await PAGES[page](C);
    else if (['aviso-legal', 'privacidad', 'cookies', 'condiciones'].includes(page)) legal(C, page);
  } catch (e) {
    console.error(e);
    if (!$('#cabecera').children.length) $('#cabecera').replaceChildren(h('header.cab', h('div.cab-in', h('a.marca', { href: '/' }, h('img', { src: '/img/icono.png', alt: '', width: 38, height: 38 }), h('span', 'CelebriDiseños')))));
    if (page !== 'producto') $('#main').replaceChildren(h('div.vacio', h('div.grande', '⚠️'), h('p', 'No se ha podido cargar la tienda. Comprueba tu conexión e inténtalo de nuevo.'), h('a.btn', { href: location.href }, 'Reintentar')));
  }
})();
