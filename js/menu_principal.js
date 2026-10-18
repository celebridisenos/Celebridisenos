// ================= 🧭 MENÚ PRINCIPAL (17-10-2026) =================
// Ella: «la interfaz no me acaba de convencer: los menús, inventa otra forma más agradable, mejor de deducir y buscar; que siempre haya una
// flecha para atrás y siempre me vuelva al menú principal».
// · El ☰ abre este MENÚ PRINCIPAL: una capa a pantalla completa (no cierra lo que estás haciendo) con un BUSCADOR grande que entiende lo que
//   quieres hacer (sinónimos: «etiquetas», «ropa», «cobrar», «subir a la web»…), lo ÚLTIMO que has usado y todas las secciones agrupadas por
//   LO QUE QUIERES HACER (vender, diseñar, imprimir, enviar…), cada una con una línea que dice para qué sirve y sus avisos.
// · En TODAS las pantallas, arriba: «← Atrás» (vuelve a donde estabas; si no hay dónde, al menú principal) y la ruta «Menú › Grupo › Sección».
// · El menú lateral de siempre sigue: «≡ Lista clásica» dentro de este menú, y fijado (📌) como antes.
// La lógica (grupos, descripciones, búsqueda) es pura y se prueba en Node: test/unit/menu_principal.mjs.

export const GRUPOS = [
  { k: 'dia', t: 'Empezar el día', e: '☀️', c: '#f59e0b', items: ['puente', 'inicio', 'hoy', 'tallervivo'] },
  { k: 'vender', t: 'Vender y atender', e: '🛒', c: '#ec4899', items: ['pedidos', 'pedidosweb', 'bandeja', 'clientes', 'presupuestos', 'facturas', 'rapidas'] },
  { k: 'crear', t: 'Diseñar y crear', e: '✏️', c: '#8b5cf6', items: ['celebrir8', 'celebridrew', 'productos', 'catalogo', 'cotizador'] },
  { k: 'fabricar', t: 'Imprimir y fabricar', e: '🖨️', c: '#0ea5e9', items: ['taller', 'stock', 'inventario', 'costes'] },
  { k: 'enviar', t: 'Empaquetar y enviar', e: '📦', c: '#f97316', items: ['embalaje', 'escanear'] },
  { k: 'web', t: 'Tienda y web', e: '🌐', c: '#14b8a6', items: ['tienda', 'mitienda', 'estanteria'] },
  { k: 'conocer', t: 'Darte a conocer', e: '📣', c: '#e11d48', items: ['reels', 'instagram', 'redes', 'estudio', 'anuncios', 'trailer'] },
  { k: 'numeros', t: 'Tus números', e: '📊', c: '#22c55e', items: ['ingresos', 'informes', 'inteligencia'] },
  { k: 'equipo', t: 'Equipo y ayuda', e: '🤝', c: '#6366f1', items: ['chat', 'tareas', 'noticias', 'archivos', 'ia', 'centroia'] },
  { k: 'ajustes', t: 'Ajustes', e: '⚙️', c: '#64748b', items: ['config', 'estado'] },
];
// para qué sirve cada sección (una línea, como lo diría ella)
export const DESCR = {
  puente: 'El resumen de todo de un vistazo', inicio: 'Tu día: ventas, pedidos y avisos', hoy: 'Lo que toca hacer hoy en el taller', tallervivo: 'Las impresoras y el taller en directo',
  pedidos: 'Ver, crear y seguir pedidos', pedidosweb: 'Lo que te piden desde la tienda web', bandeja: 'Los correos de ventas de todas tus cuentas', clientes: 'Tus clientes y lo que te han comprado',
  presupuestos: 'Hacer y mandar presupuestos', facturas: 'Facturas y cobros', rapidas: 'Respuestas listas para los clientes',
  celebrir8: 'Diseñar piezas en 3D sin saber de 3D', celebridrew: 'Ropa en 3D: patrones, avatar y PDF para coser', productos: 'Tus productos, fotos y abrir en Bambu', catalogo: 'Más de 300 diseños listos para imprimir', cotizador: 'Cuánto cobrar por una pieza impresa',
  taller: 'Impresoras 3D, etiquetas y papel', stock: 'Lo que tienes hecho y dónde', inventario: 'Filamento, cajas y compras', costes: 'Materiales y cuánto te cuesta cada cosa',
  embalaje: 'Empaquetar pedidos y sus etiquetas de envío', escanear: 'Leer el QR de un paquete',
  tienda: 'Tu tienda web: productos y textos', mitienda: 'Abrir, compartir y el QR de tu tienda', estanteria: 'Tus productos en una estantería bonita',
  reels: 'Vídeos para Instagram y TikTok', instagram: 'Publicaciones de Instagram', redes: 'Calendario de redes sociales', estudio: 'Fotos de producto con IA (Biouvision)', anuncios: 'Anuncios con inteligencia artificial', trailer: 'El vídeo resumen de tu mes',
  ingresos: 'Lo que entra y lo que sale', informes: 'Gráficas de ventas y pedidos', inteligencia: 'Metas, clientes y tus números con IA',
  chat: 'Hablar con tu equipo', tareas: 'Tareas del equipo', noticias: 'Novedades del negocio', archivos: 'Tus archivos y documentos', ia: 'Pregúntale a tu asistente', centroia: 'Todas las herramientas de IA',
  config: 'Empresa, usuarios, impresoras…', estado: 'Si todo funciona bien',
};
// palabras con las que ella podría buscarlo (sin acentos, en minúscula)
export const SINONIMOS = {
  pedidos: 'pedido encargo venta vender comanda orden', pedidosweb: 'web solicitud encargo online', bandeja: 'correo email gmail mensajes ventas', clientes: 'cliente comprador contacto',
  presupuestos: 'presupuesto oferta cotizacion precio', facturas: 'factura cobrar cobro facturar pagar recibo iva', rapidas: 'respuesta whatsapp contestar plantilla mensaje',
  celebrir8: 'disenar diseno 3d pieza modelo stl caja llave juguete r8', celebridrew: 'ropa prenda moda costura patron sudadera camiseta vestido falda pantalon avatar drew coser',
  productos: 'producto foto articulo bambu laminar', catalogo: 'catalogo disenos listos imprimir modelos cults', cotizador: 'precio calcular cuanto coste presupuesto cobrar',
  taller: 'imprimir impresion impresora etiqueta etiquetas papel bambu a1 p1p', stock: 'existencias almacen hecho guardado', inventario: 'filamento compras material proveedor', costes: 'coste material gasto margen',
  embalaje: 'empaquetar paquete envio enviar etiqueta etiquetas correos seur caja', escanear: 'qr escaner leer paquete codigo',
  tienda: 'web subir publicar tienda online pagina', mitienda: 'compartir enlace qr tienda', estanteria: 'escaparate exponer',
  reels: 'video tiktok reel', instagram: 'instagram post publicar foto', redes: 'redes calendario publicar', estudio: 'foto fotos fondo ia biouvision producto', anuncios: 'anuncio publicidad ads', trailer: 'video resumen mes',
  ingresos: 'dinero ganancias caja ingresos gastos', informes: 'grafica estadistica ventas', inteligencia: 'metas objetivos numeros ia',
  chat: 'hablar equipo mensaje', tareas: 'tarea pendiente lista', noticias: 'novedad noticia', archivos: 'archivo documento pdf', ia: 'nova asistente ayuda pregunta', centroia: 'ia inteligencia artificial',
  config: 'ajustes configuracion usuario empresa impresora contrasena', estado: 'sistema funciona error diagnostico',
};
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').trim();
// el grupo de una sección (o null)
export const grupoDe = k => GRUPOS.find(g => g.items.includes(k)) || null;
// lista = las secciones que esa persona puede ver [{ k, t, i }] → los grupos con sus secciones (lo que no tenga grupo, en «Más»)
export function agrupa(lista) {
  const ver = new Map(lista.filter(n => n && n.k).map(n => [n.k, n])), usados = new Set(), out = [];
  GRUPOS.forEach(g => { const items = g.items.filter(k => ver.has(k)).map(k => (usados.add(k), ver.get(k))); if (items.length) out.push(Object.assign({}, g, { items })); });
  const resto = [...ver.values()].filter(n => !usados.has(n.k)); if (resto.length) out.push({ k: 'mas', t: 'Más', e: '✨', c: '#94a3b8', items: resto });
  return out;
}
// BUSCAR: cada palabra tiene que estar en el nombre, la descripción, los sinónimos o el grupo; puntúa más lo que empieza por la palabra y el nombre,
// y las 3 primeras palabras de sus sinónimos (las principales). Las palabras de relleno («a», «la», «una», «mi»…) no cuentan.
const RELLENO = new Set(['a', 'al', 'la', 'el', 'lo', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'mi', 'mis', 'tu', 'con', 'para', 'por', 'y', 'o', 'que', 'quiero', 'como', 'hacer', 'ver']);
export function busca(q, lista) {
  const P = norm(q).split(/\s+/).filter(w => w && !RELLENO.has(w)); if (!P.length) return [];
  return lista.map(n => { const nom = norm(n.t), des = norm(DESCR[n.k]), sin = norm(SINONIMOS[n.k]), gr = norm((grupoDe(n.k) || {}).t), todo = nom + ' ' + des + ' ' + sin + ' ' + gr; let p = 0;
    for (const w of P) { if (!todo.includes(w) && !todo.split(' ').some(x => x.startsWith(w.slice(0, Math.max(3, w.length - 2))))) return null; const sw = sin.split(' '); p += (nom.split(' ').some(x => x.startsWith(w)) ? 10 : 0) + (sw.some(x => x.startsWith(w)) ? 5 : 0) + (sw.slice(0, 3).some(x => x.startsWith(w)) ? 3 : 0) + (des.includes(w) ? 2 : 0) + 1; }
    return { n, p }; }).filter(Boolean).sort((a, b) => b.p - a.p).map(x => x.n);
}
// lo ÚLTIMO que ha usado (se recuerda en el aparato)
const CLAVE = 'cd.mp.recientes';
export function recuerda(k) { if (!k || k === 'menu') return; try { const L = JSON.parse(localStorage.getItem(CLAVE) || '[]').filter(x => x !== k); L.unshift(k); localStorage.setItem(CLAVE, JSON.stringify(L.slice(0, 8))); } catch (e) { } }
export function recientes() { try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch (e) { return []; } }

// ---------- la CAPA (en el navegador) ----------
// o = { lista: [{ k, t, i }], counts: { k: n }, ir(k), buscarEnTodo(q), clasico(), actual (sección en la que está), saludo }
export function abre(o) {
  const ya = document.querySelector('.mp'); if (ya) { ya._cierra(); return null; }
  const el = (t, a = {}, ...hijos) => { const e = document.createElement(t); Object.entries(a).forEach(([k, v]) => { if (k === 'onclick' || k === 'oninput' || k === 'onkeydown') e[k] = v; else if (k === 'style') Object.entries(v).forEach(([q, w]) => (q.startsWith('--') ? e.style.setProperty(q, w) : (e.style[q] = w))); else if (v != null) e.setAttribute(k, v); }); hijos.flat().forEach(c => { if (c == null) return; e.append(c.nodeType ? c : document.createTextNode(String(c))); }); return e; };
  const G = agrupa(o.lista), todas = G.flatMap(g => g.items), cuenta = k => (o.counts || {})[k] || 0;
  const tarjeta = (n, g) => el('button', { type: 'button', class: 'mp-t' + (n.k === o.actual ? ' on' : ''), 'data-k': n.k, style: { '--mp-c': (g || grupoDe(n.k) || { c: '#8b5cf6' }).c }, onclick: () => ve(n.k) },
    el('span', { class: 'mp-t-e' }, emoji(n)), el('span', { class: 'mp-t-x' }, el('b', {}, n.t.replace(/\s*[\u{1F300}-\u{1FAFF}☀-➿]️?/gu, '')), el('small', {}, DESCR[n.k] || '')), cuenta(n.k) ? el('i', { class: 'mp-t-n' }, String(cuenta(n.k))) : null);
  const busca2 = el('input', { type: 'search', class: 'mp-busca', placeholder: '¿Qué quieres hacer? Escribe: etiquetas, ropa, cobrar, subir a la web…', 'aria-label': 'Buscar en el menú', autocomplete: 'off' });
  const cuerpo = el('div', { class: 'mp-cuerpo' }), cerrarB = el('button', { type: 'button', class: 'mp-x', 'aria-label': 'Cerrar el menú', title: 'Cerrar (Esc)', onclick: () => cierra() }, '✕');
  const clasico = o.clasico ? el('button', { type: 'button', class: 'mp-lista', title: 'El menú lateral de siempre', onclick: () => { cierra(); o.clasico(); } }, '≡ Lista clásica') : null;
  const capa = el('div', { class: 'mp', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menú principal' }, el('div', { class: 'mp-caja' },
    el('div', { class: 'mp-cab' }, el('div', {}, el('h2', {}, 'Menú principal'), el('small', {}, o.saludo || 'Elige a dónde vas, o búscalo')), el('div', { class: 'mp-cab-d' }, clasico, cerrarB)), busca2, cuerpo));
  function pinta() {
    const q = busca2.value.trim(); cuerpo.replaceChildren();
    if (q) { const R = busca(q, todas); cuerpo.append(el('div', { class: 'mp-g' }, el('h3', {}, R.length ? 'Lo que encaja con «' + q + '»' : 'No hay ninguna sección que se llame así'), el('div', { class: 'mp-ts' }, R.map(n => tarjeta(n))),
        o.buscarEnTodo ? el('button', { type: 'button', class: 'mp-todo', onclick: () => { cierra(); o.buscarEnTodo(q); } }, '🔎 Buscar «' + q + '» en pedidos, clientes y productos →') : null)); return; }
    const rec = recientes().map(k => todas.find(n => n.k === k)).filter(Boolean).slice(0, 6);
    if (rec.length) cuerpo.append(el('div', { class: 'mp-rec' }, el('span', {}, 'Lo último:'), rec.map(n => el('button', { type: 'button', class: 'mp-chip', 'data-k': n.k, onclick: () => ve(n.k) }, emoji(n) + ' ' + n.t.replace(/\s*[\u{1F300}-\u{1FAFF}☀-➿]️?/gu, '')))));
    cuerpo.append(el('div', { class: 'mp-gs' }, G.map(g => el('section', { class: 'mp-g', style: { '--mp-c': g.c }, 'data-g': g.k }, el('h3', {}, el('span', {}, g.e), g.t), el('div', { class: 'mp-ts' }, g.items.map(n => tarjeta(n, g)))))));
  }
  function ve(k) { cierra(); o.ir(k); }
  function cierra() { capa.remove(); document.removeEventListener('keydown', tecla, true); }
  function tecla(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cierra(); } else if (e.key === 'Enter' && document.activeElement === busca2) { const R = busca(busca2.value, todas); if (R[0]) ve(R[0].k); else if (busca2.value.trim() && o.buscarEnTodo) { cierra(); o.buscarEnTodo(busca2.value.trim()); } } }
  busca2.oninput = pinta; capa._cierra = cierra; capa.onclick = e => { if (e.target === capa) cierra(); };
  document.addEventListener('keydown', tecla, true); document.body.append(capa); pinta(); try { busca2.focus(); } catch (e) { } setTimeout(() => { try { if (document.activeElement !== busca2) busca2.focus(); } catch (e) { } }, 30); // (18-10: el foco AL MOMENTO: con Ctrl + espacio y a escribir enseguida, las primeras letras se perdían)
  return capa;
}
const EMO = { puente: '🛰️', inicio: '🏠', hoy: '📋', tallervivo: '🏭', pedidos: '🧾', pedidosweb: '🛍️', bandeja: '📬', clientes: '👥', presupuestos: '💬', facturas: '🧮', rapidas: '⚡', celebrir8: '🧊', celebridrew: '👗', productos: '📦', catalogo: '📚', cotizador: '💶', taller: '🖨️', stock: '🗄️', inventario: '🧵', costes: '⚖️', embalaje: '🎁', escanear: '📷', tienda: '🌐', mitienda: '🔗', estanteria: '🏬', reels: '🎬', instagram: '📸', redes: '🗓️', estudio: '✨', anuncios: '📣', trailer: '🎞️', ingresos: '💰', informes: '📈', inteligencia: '🧠', chat: '💭', tareas: '✅', noticias: '📰', archivos: '📁', ia: '🤖', centroia: '🪄', config: '⚙️', estado: '🩺' };
const emoji = n => EMO[n.k] || '•';
