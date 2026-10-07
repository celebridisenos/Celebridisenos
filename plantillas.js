// ================= v15.0 · PLANTILLAS DE ETIQUETA (diseño propio, editor visual) =================
// Una plantilla es una lista de piezas colocadas en milímetros sobre la etiqueta: textos con datos del pedido
// ({numero}, {para.nombre}…), logo, QR, código de barras y cajas/líneas. Cada pieza se puede mover, cambiar de
// tamaño y girar. Se guardan para todo el equipo (Configuración del servidor → plantillasEtiqueta) y una puede ser
// la PREDETERMINADA de su tipo de etiqueta: entonces labels.draw() la usa para la vista previa, el PC, Bluetooth,
// el PDF y las hojas A4. Sin plantilla predeterminada todo sale exactamente como antes (nada cambia).
// El dibujo es el mismo en pantalla y en papel: se pinta a la resolución real de la impresora (203 / 300 ppp).
import { S } from './store.js';
import { eur, fdate } from './ui.js';
import { qrPlan } from './qr.js';
import { code128, modulos128 } from './code128.js';
import { desktop } from './desktop.js';
import { emisor } from './print.js';

// Tipos de etiqueta que se pueden diseñar (las tarjetas de agradecimiento ya tienen su propio diseño en Embalaje)
export const EDITABLES = ['envio', 'paquete150', 'paquete', 'producto', 'almacen', 'qr', 'gracias']; // v16: + tarjeta de agradecimiento

// Letras que tiene cualquier Windows y casi cualquier móvil. En el PC se añaden las de RECURSOS\FUENTES.
export const FUENTES = [
  { id: 'segoe', t: 'Segoe UI (la de siempre)', css: '"Segoe UI", Arial, sans-serif' },
  { id: 'arial', t: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { id: 'arialblack', t: 'Arial Black (muy gruesa)', css: '"Arial Black", "Segoe UI", Arial, sans-serif' },
  { id: 'impact', t: 'Impact (estrecha)', css: 'Impact, "Arial Black", sans-serif' },
  { id: 'verdana', t: 'Verdana (muy legible)', css: 'Verdana, Tahoma, sans-serif' },
  { id: 'trebuchet', t: 'Trebuchet', css: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: 'georgia', t: 'Georgia (elegante)', css: 'Georgia, "Times New Roman", serif' },
  { id: 'times', t: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { id: 'courier', t: 'Courier (máquina de escribir)', css: '"Courier New", Courier, monospace' },
  { id: 'consolas', t: 'Consolas (números claros)', css: 'Consolas, "Courier New", monospace' }
];
const fuenteCss = id => {
  if (id && id.indexOf('x:') === 0) return '"' + id.slice(2).replace(/"/g, '') + '", "Segoe UI", Arial, sans-serif';
  return (FUENTES.find(f => f.id === id) || FUENTES[0]).css;
};

// Datos que se pueden poner en cada etiqueta: {clave} en el texto. «tienda» y «hoy» valen en todas.
export const VARS = {
  envio: [['numero', 'Nº de pedido'], ['fecha', 'Fecha'], ['de.nombre', 'Tu tienda'], ['de.direccion', 'Tu dirección'], ['de.localidad', 'Tu localidad'], ['de.telefono', 'Tu teléfono'],
    ['para.nombre', 'Cliente'], ['para.direccion', 'Dirección del cliente'], ['para.telefono', 'Teléfono del cliente'], ['contenido', 'Qué va dentro'], ['envio', 'Transportista'], ['seguimiento', 'Nº de seguimiento']],
  paquete150: [['numero', 'Nº de pedido'], ['codigo', 'Código CEB'], ['cliente', 'Cliente'], ['limite', 'Enviar antes de'], ['transportista', 'Transportista'], ['seguimiento', 'Nº de seguimiento'],
    ['cuenta', 'Cuenta de venta'], ['canal', 'Plataforma'], ['lineas', 'Qué va dentro (lista)'], ['nota', 'Nota de envío'], ['gracias.titulo', 'Gracias: título'], ['gracias.texto', 'Gracias: texto'], ['gracias.firma', 'Gracias: firma']],
  paquete: [['codigo', 'Código CEB'], ['numero', 'Nº de pedido'], ['cliente', 'Cliente'], ['cuenta', 'Cuenta de venta']],
  producto: [['nombre', 'Producto'], ['sku', 'SKU'], ['precio', 'Precio'], ['extra', 'Material · color · tamaño']],
  almacen: [['ubicacion', 'Ubicación'], ['nombre', 'Producto'], ['sku', 'SKU']],
  qr: [['titulo', 'Título']],
  gracias: [['titulo', 'Título'], ['texto', 'Texto de gracias'], ['firma', 'Firma']]
};
export const VARS_COMUNES = [['tienda', 'Nombre de la tienda'], ['hoy', 'Fecha de hoy']];

// Datos de ejemplo para diseñar sin tener un pedido delante
export const EJEMPLO = {
  envio: { numero: 1024, fecha: '2026-10-06', de: { nombre: 'CelebriDiseños', direccion: 'Calle Mayor 1', localidad: '28001 Madrid', telefono: '600 000 000' },
    para: { nombre: 'Ana García López', direccion: 'Avenida de la Paz 23, 4º B\n46001 Valencia', telefono: '611 222 333' }, contenido: 'Maceta Luna · Rosa', envio: 'InPost', seguimiento: 'IP123456789ES', qr: 'https://celebridisenos.example/#/pedidos/demo' },
  paquete150: { numero: 1024, codigo: 'CEB-2026-000123', cliente: 'Ana G.', limite: '08/10', transportista: 'InPost', seguimiento: 'IP123456789ES', cuenta: 'Vinted · Ana', canal: 'Vinted',
    lineas: ['Maceta Luna · Rosa', '2 × Llavero corazón · Rojo'], nota: 'Frágil', gracias: { titulo: '¡Gracias!', texto: 'Cada pieza está hecha con cariño. ¡Disfrútala!', firma: 'CelebriDiseños' }, qr: 'CEB-2026-000123' },
  paquete: { codigo: 'CEB-2026-000123', numero: 1024, cliente: 'Ana', cuenta: 'Vinted · Ana', qr: 'CEB-2026-000123' },
  producto: { nombre: 'Maceta Luna', sku: 'MAC-LUN-01', precio: 12.5, extra: 'PLA · Rosa · M', qr: 'https://celebridisenos.example/#/q/producto/demo' },
  almacen: { ubicacion: 'A-3', nombre: 'Maceta Luna', sku: 'MAC-LUN-01', qr: 'https://celebridisenos.example/#/q/stock/demo' },
  qr: { titulo: 'Maceta Luna', qr: 'https://celebridisenos.example/#/q/producto/demo' },
  gracias: { titulo: '¡Gracias por tu compra!', texto: 'Cada pieza está hecha con cariño.\n¡Disfrútala!', firma: 'CelebriDiseños', qr: 'CEB-2026-000123' }
};

// ---------- Plantillas guardadas (de todo el equipo) ----------
const cfgP = () => (S.cfg && S.cfg.plantillasEtiqueta) || {};
export const lista = tpl => (cfgP().lista || []).filter(p => !tpl || p.tpl === tpl);
export const porId = id => (cfgP().lista || []).find(p => p.id === id) || null;
export const idPredeterminada = tpl => ((cfgP().defecto || {})[tpl]) || '';
// La plantilla que se usa al imprimir ese tipo de etiqueta (o null = el diseño de siempre)
export function activa(tpl) { const id = idPredeterminada(tpl); return id ? porId(id) : null; }

// ---------- Diseño de partida: el de siempre, hecho piezas (para empezar a moverlo) ----------
let nid = 0;
const id = () => 'e' + Date.now().toString(36) + (nid++).toString(36);
const T = (x, y, w, h, texto, o) => Object.assign({ id: id(), t: 'texto', x, y, w, h, r: 0, texto, f: 'segoe', pt: 9, b: 400, al: 'l', va: 't', aj: true, col: '#000000' }, o || {});
const Q = (x, y, s) => ({ id: id(), t: 'qr', x, y, w: s, h: s, r: 0 });
const C = (x, y, w, h, o) => Object.assign({ id: id(), t: 'caja', x, y, w, h, r: 0, relleno: '#000000', borde: 0, radio: 0 }, o || {});
const LOGO = (x, y, w, h) => ({ id: id(), t: 'logo', x, y, w, h, r: 0, src: 'empresa', prop: true, al: 'c' });
const BASE = {
  envio: () => [
    C(1.5, 1.5, 97, 147, { relleno: 'none', borde: 0.6 }), C(1.5, 1.5, 97, 11),
    T(4, 2.5, 60, 9, 'PEDIDO Nº {numero}', { pt: 15, b: 800, col: '#ffffff', va: 'm' }), T(64, 2.5, 32, 9, '{fecha}', { pt: 9, b: 600, col: '#ffffff', al: 'r', va: 'm' }),
    T(4, 16, 40, 3.5, 'REMITENTE', { pt: 6.5, b: 700 }), T(4, 19.5, 92, 16, '{de.nombre}\n{de.direccion}\n{de.localidad}\n{de.telefono}', { pt: 8 }),
    C(1.5, 37, 97, 0.4), T(4, 40, 40, 4, 'DESTINATARIO', { pt: 7, b: 800 }),
    T(4, 44.5, 92, 14, '{para.nombre}', { pt: 18, b: 800, lin: 2 }), T(4, 59, 92, 34, '{para.direccion}', { pt: 14, b: 500 }), T(4, 94, 92, 6, 'Tel. {para.telefono}', { pt: 12, b: 700 }),
    C(1.5, 103, 97, 0.4), Q(3.5, 105.5, 40),
    T(46.5, 105.5, 50.5, 14, '{contenido}', { pt: 9, b: 700, lin: 3 }), T(46.5, 120, 50.5, 9, '{envio}\n{seguimiento}', { pt: 8.5, b: 500 }),
    T(46.5, 138, 50.5, 7, 'Escanea al entregarlo: se marca como enviado.', { pt: 6.5 })],
  paquete150: () => [
    LOGO(30, 3.5, 40, 13),
    T(5, 18, 90, 10, '{gracias.titulo}', { pt: 20, b: 800, al: 'c', va: 'm' }), T(5, 28.5, 90, 21, '{gracias.texto}', { pt: 10, al: 'c', va: 'm' }), T(5, 50, 90, 6, '{gracias.firma}', { pt: 9, b: 600, al: 'c' }),
    C(3, 62.3, 94, 0.3), C(3, 64.5, 94, 10),
    T(5, 64.5, 90, 10, 'PEDIDO Nº {numero}', { pt: 16, b: 800, col: '#ffffff', va: 'm' }),
    Q(3, 76.5, 42),
    T(48, 77, 49, 3, 'CÓDIGO', { pt: 6.5, b: 600 }), T(48, 80, 49, 5, '{codigo}', { pt: 10, b: 800 }),
    T(48, 86, 49, 3, 'CLIENTE', { pt: 6.5, b: 600 }), T(48, 89, 49, 5, '{cliente}', { pt: 10, b: 700 }),
    T(48, 95, 49, 3, 'ENVIAR ANTES DE', { pt: 6.5, b: 600 }), T(48, 98, 49, 5, '{limite}', { pt: 11, b: 800 }),
    T(48, 104, 49, 3, 'TRANSPORTE', { pt: 6.5, b: 600 }), T(48, 107, 49, 5, '{transportista} {seguimiento}', { pt: 8.5, b: 700 }),
    T(48, 113, 49, 3, 'VENDIDO EN', { pt: 6.5, b: 600 }), T(48, 116, 49, 4.5, '{cuenta|canal}', { pt: 9, b: 800 }),
    C(3, 120.8, 94, 0.3), T(3, 122.3, 60, 3, 'QUÉ VA DENTRO', { pt: 6.5, b: 600 }),
    T(3, 125.5, 94, 15, '{lineas}', { pt: 10, b: 700 }), T(3, 140.8, 94, 3.5, '📝 {nota}', { pt: 7.5, b: 500 }),
    T(3, 144.5, 94, 3, 'Uso interno · la dirección va en la etiqueta de la plataforma', { pt: 6, al: 'c' })],
  paquete: () => [Q(7.5, 1.5, 35), T(2, 37, 46, 4, '{codigo}', { pt: 9, b: 800, al: 'c' }), T(2, 41.3, 46, 3.6, 'Nº {numero} · {cliente}', { pt: 7, b: 500, al: 'c' }), T(2, 45.2, 46, 3.6, '{cuenta}', { pt: 7, b: 800, al: 'c' })],
  producto: () => [Q(26.5, 3.75, 22.5), T(3, 2.5, 23, 8, '{nombre}', { pt: 8.5, b: 800, lin: 2 }), T(3, 11, 23, 3, '{sku}', { pt: 6.5, b: 500 }), T(3, 14.5, 23, 3, '{extra}', { pt: 6.5 }), T(3, 20, 23, 7, '{precio}', { pt: 13, b: 800, va: 'b' })],
  almacen: () => [C(1, 1, 98, 48, { relleno: 'none', borde: 0.5 }), Q(55, 4, 42), T(4, 3.5, 48, 3.5, 'UBICACIÓN', { pt: 6.5, b: 700 }), T(4, 7, 48, 18, '{ubicacion}', { pt: 20, b: 800, lin: 2 }),
    T(4, 26, 48, 10, '{nombre}', { pt: 9, b: 700, lin: 2 }), T(4, 37, 48, 4, '{sku}', { pt: 7 })],
  qr: () => [Q(4.5, 1, 31), T(2, 33, 36, 5.5, '{titulo}', { pt: 9, b: 700, al: 'c', lin: 1 })],
  gracias: () => [LOGO(10, 2.5, 30, 10), T(2.5, 13.5, 45, 9, '{titulo}', { pt: 11, b: 800, al: 'c', va: 'm', lin: 2 }), T(3, 23, 44, 17, '{texto}', { pt: 7.5, al: 'c', va: 'm' }), T(3, 41.5, 44, 5, '{firma}', { pt: 7.5, b: 700, al: 'c', va: 'm' })]
};
const BASE_SIZE = { envio: [100, 150], paquete150: [100, 150], paquete: [50, 50], producto: [50, 30], almacen: [100, 50], qr: [40, 40], gracias: [50, 50] };
// Plantilla nueva a partir del diseño de siempre, al tamaño de etiqueta que use este aparato
export function nueva(tpl, size, nombre) {
  const [bw, bh] = BASE_SIZE[tpl] || [100, 150], w = (size && size.w) || bw, hh = (size && size.h) || bh, sx = w / bw, sy = hh / bh;
  const els = (BASE[tpl] || BASE.qr)().map(e => {
    const o = Object.assign({}, e, { x: r2(e.x * sx), y: r2(e.y * sy), w: r2(e.w * sx), h: r2(e.h * sy) });
    if (e.t === 'qr') { const s = Math.min(o.w, o.h); o.x = r2(o.x + (o.w - s) / 2); o.y = r2(o.y + (o.h - s) / 2); o.w = o.h = s; }
    if (e.t === 'texto') o.pt = r2(e.pt * Math.min(sx, sy));
    return o;
  });
  return { id: '', tpl, nombre: nombre || 'Mi diseño', w, h: hh, margen: 1, els };
}
const r2 = v => Math.round(v * 100) / 100;
// ---------- v16 · ESTILOS: el diseño de siempre, vestido de nueve maneras (para empezar rápido y luego retocar) ----------
// Son reglas fijas (letras, marcos, bandas), no dibujos al azar: salen bien en una impresora térmica en blanco y negro.
export const ESTILOS = [['minimalista', 'Minimalista'], ['premium', 'Premium'], ['elegante', 'Elegante'], ['moderno', 'Moderno'], ['divertido', 'Divertido'], ['3d', '3D'], ['tecnologico', 'Tecnológico'], ['artesanal', 'Artesanal'], ['lujo', 'Lujo']];
export function conEstilo(tpl, size, k) {
  const nombre = (ESTILOS.find(e => e[0] === k) || ['', 'Mi diseño'])[1], P = nueva(tpl, size, nombre);
  const W = P.w, H = P.h, m = r2(Math.max(1.5, Math.min(W, H) * 0.03));
  const textos = () => P.els.filter(e => e.t === 'texto'), maxPt = Math.max(1, ...textos().map(e => e.pt));
  const esTitulo = e => e.pt >= maxPt * 0.75;
  const letra = (titulo, resto) => textos().forEach(e => { e.f = esTitulo(e) ? titulo : resto; });
  const sinBandas = () => { P.els = P.els.filter(e => !(e.t === 'caja' && e.relleno !== 'none' && e.h > 2)); textos().forEach(e => { if (e.col === '#ffffff') e.col = '#000000'; }); };
  const sinMarcos = () => { P.els = P.els.filter(e => !(e.t === 'caja' && e.relleno === 'none')); };
  const marco = (d, borde, radio) => C(d, d, r2(W - 2 * d), r2(H - 2 * d), { relleno: 'none', borde, radio: radio || 0 });
  const detras = (...x) => { P.els = x.concat(P.els); };
  if (k === 'minimalista') { sinBandas(); sinMarcos(); letra('segoe', 'segoe'); textos().forEach(e => { e.b = esTitulo(e) ? 600 : 400; }); }
  else if (k === 'premium') { sinMarcos(); letra('georgia', 'segoe'); detras(marco(m, 0.6), marco(r2(m + 1.3), 0.2)); }
  else if (k === 'elegante') { sinBandas(); sinMarcos(); letra('times', 'times'); textos().forEach(e => { if (esTitulo(e)) e.b = 700; }); detras(marco(m, 0.25, 1)); }
  else if (k === 'moderno') { sinMarcos(); letra('trebuchet', 'trebuchet'); P.els.forEach(e => { if (e.t === 'caja' && e.relleno !== 'none' && e.h > 2) e.radio = 2; }); detras(C(0, 0, W, r2(m * 0.9)), C(0, r2(H - m * 0.9), W, r2(m * 0.9))); }
  else if (k === 'divertido') { sinMarcos(); letra('verdana', 'verdana'); textos().forEach(e => { if (e.pt === maxPt && /^\{[^}]+\}$/.test(e.texto)) e.texto = '★ ' + e.texto + ' ★'; }); detras(marco(m, 1, 5)); }
  else if (k === '3d') { sinMarcos(); letra('arialblack', 'arial'); const s = r2(Math.max(1.2, m * 0.7)); detras(C(r2(m + s), r2(m + s), r2(W - 2 * m - s), r2(H - 2 * m - s), { radio: 1.5 }), C(m, m, r2(W - 2 * m - s), r2(H - 2 * m - s), { relleno: '#ffffff', borde: 0.6, radio: 1.5 })); }
  else if (k === 'tecnologico') { sinMarcos(); letra('consolas', 'consolas'); const l = r2(Math.min(W, H) * 0.12), g = 0.5;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(q => { detras(C(r2(q[2] > 0 ? q[0] : q[0] - l), r2(q[3] > 0 ? q[1] : q[1] - g), l, g), C(r2(q[2] > 0 ? q[0] : q[0] - g), r2(q[3] > 0 ? q[1] : q[1] - l), g, l)); }); }
  else if (k === 'artesanal') { sinBandas(); sinMarcos(); letra('georgia', 'georgia'); detras(marco(m, 0.4, 3)); if (H >= 45) P.els.push(T(m, r2(H - m - 4.2), r2(W - 2 * m), 3.4, '· hecho a mano ·', { pt: 6, al: 'c', va: 'm', f: 'georgia' })); }
  else if (k === 'lujo') { sinBandas(); sinMarcos(); letra('times', 'times'); textos().forEach(e => { if (esTitulo(e)) e.b = 800; }); detras(marco(m, 0.9), marco(r2(m + 1.6), 0.25)); }
  return P;
}
export const nuevoId = () => 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Piezas nuevas que se añaden desde el editor (en el centro de la etiqueta)
export function pieza(tipo, P) {
  const cx = P.w / 2, cy = P.h / 2, m = Math.min(P.w, P.h);
  if (tipo === 'texto') return T(r2(cx - Math.min(30, P.w * 0.4)), r2(cy - 4), r2(Math.min(60, P.w * 0.8)), 8, 'Texto nuevo', { pt: 10, b: 700 });
  if (tipo === 'logo') { const w = r2(Math.min(40, P.w * 0.5)), hh = r2(Math.min(15, P.h * 0.3)); return LOGO(r2(cx - w / 2), r2(cy - hh / 2), w, hh); }
  if (tipo === 'qr') { const s = r2(Math.min(30, m * 0.5)); return Q(r2(cx - s / 2), r2(cy - s / 2), s); }
  if (tipo === 'barras') { const w = r2(Math.min(70, P.w * 0.85)), hh = r2(Math.min(16, P.h * 0.3)); return { id: id(), t: 'barras', x: r2(cx - w / 2), y: r2(cy - hh / 2), w, h: hh, r: 0, valor: ({ envio: '{numero}', producto: '{sku}', almacen: '{sku}', qr: '{titulo}' })[P.tpl] || '{codigo}', txt: true }; }
  if (tipo === 'linea') return C(2, r2(cy), r2(P.w - 4), 0.4);
  return C(r2(cx - 15), r2(cy - 5), 30, 10, { relleno: 'none', borde: 0.4, radio: 1.5 });
}

// ---------- Rellenar el texto con los datos ----------
const get = (d, k) => k.split('.').reduce((o, p) => (o == null ? undefined : o[p]), d);
function valor(d, k) {
  if (k === 'tienda') { const em = emisor(); return em.comercial || em.nombre || ''; }
  if (k === 'hoy') return fdate(new Date().toISOString().slice(0, 10));
  const v = get(d || {}, k);
  if (v == null || v === '') return '';
  if (k === 'fecha') return fdate(v);
  if (k === 'precio') return eur(v);
  if (k === 'lineas') return (Array.isArray(v) ? v : [v]).map(l => '☐ ' + l).join('\n');
  if (Array.isArray(v)) return v.join('\n');
  return String(v);
}
// «{a|b}» = el primero que tenga algo. Una línea con datos y todos vacíos desaparece (p. ej. «Tel. {para.telefono}» sin teléfono).
export function rellenar(texto, d) {
  return String(texto == null ? '' : texto).split('\n').map(linea => {
    let hay = false, lleno = false;
    const out = linea.replace(/\{([a-zA-Z0-9_.|]+)\}/g, (_, ks) => { hay = true; for (const k of ks.split('|')) { const v = valor(d, k); if (v) { lleno = true; return v; } } return ''; });
    return hay && !lleno ? null : out.replace(/\s+$/, '');
  }).filter(l => l !== null).join('\n');
}

// ---------- Imágenes (logo) y letras: se cargan ANTES de dibujar (el dibujo no puede esperar) ----------
const imgs = new Map(); // src → imagen (o null si no se pudo)
const cargando = new Map();
const fuentesOk = new Set();
export const imagen = src => imgs.get(src) || null;
function cargarImg(src) {
  if (imgs.has(src)) return Promise.resolve(imgs.get(src));
  if (cargando.has(src)) return cargando.get(src);
  const p = (async () => {
    let url = '';
    if (src === 'empresa') url = emisor().logo;
    else if (/^[A-Za-z0-9_\-]{3,60}$/.test(src)) {
      const a = (S.t.archivos || []).find(x => x.id === src);
      if (a) { const F = await import('./files.js'); url = URL.createObjectURL(await F.fetchFile(a)); }
    }
    if (!url) return null;
    return await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
  })().catch(() => null).then(im => { imgs.set(src, im); cargando.delete(src); return im; });
  cargando.set(src, p);
  return p;
}
export function olvidarImagen(src) { imgs.delete(src); }
async function cargarFuente(e) {
  if (!e.fa || !desktop.on || fuentesOk.has(e.f) || !e.f || e.f.indexOf('x:') !== 0) return;
  try { const ff = new FontFace(e.f.slice(2), 'url("' + desktop.fileUrl(e.fa) + '")'); await ff.load(); document.fonts.add(ff); fuentesOk.add(e.f); } catch (x) { }
}
// Deja listo todo lo que necesita la plantilla de ese tipo (o la plantilla P que se pase)
export async function preparar(tplOrP) {
  const P = typeof tplOrP === 'string' ? activa(tplOrP) : tplOrP;
  if (!P) return null;
  await Promise.all((P.els || []).map(e => e.t === 'logo' ? cargarImg(e.src || 'empresa') : e.t === 'texto' ? cargarFuente(e) : null));
  return P;
}

// ---------- Dibujo ----------
function wrap(g, text, maxW) {
  const out = [];
  String(text || '').split('\n').forEach(par => {
    let line = '';
    par.split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
    out.push(line);
  });
  return out;
}
function dibujaTexto(g, e, d, x, y, w, hh, k, sf) {
  let s = rellenar(e.texto, d);
  if (e.may) s = s.toUpperCase();
  if (!s.trim()) return;
  const fam = fuenteCss(e.f), wt = e.b || 400, lhF = 1.18;
  let pt = (Number(e.pt) || 9) * sf, lines = [], tot = 0;
  for (let i = 0; i < 60; i++) {
    g.font = wt + ' ' + Math.max(1, Math.round(pt * 0.3528 * k)) + 'px ' + fam;
    lines = wrap(g, s, w);
    if (e.lin && lines.length > e.lin) { lines = lines.slice(0, e.lin); lines[e.lin - 1] = lines[e.lin - 1].replace(/.{0,1}$/, '…'); }
    tot = lines.length * pt * 0.3528 * k * lhF;
    const ancho = Math.max(0, ...lines.map(l => g.measureText(l).width));
    if (e.aj === false || (tot <= hh + 0.5 && ancho <= w + 0.5) || pt <= 3) break;
    pt *= 0.94;
  }
  const lh = pt * 0.3528 * k * lhF;
  g.save(); g.beginPath(); g.rect(x - 2, y - 2, w + 4, hh + 4); g.clip();
  g.textBaseline = 'top'; g.fillStyle = e.col || '#000000';
  g.textAlign = e.al === 'c' ? 'center' : e.al === 'r' ? 'right' : 'left';
  const x0 = e.al === 'c' ? x + w / 2 : e.al === 'r' ? x + w : x;
  const y0 = e.va === 'm' ? y + (hh - tot) / 2 : e.va === 'b' ? y + hh - tot : y;
  lines.forEach((l, i) => g.fillText(l, x0, y0 + i * lh + lh * 0.08));
  g.restore();
}
// Floyd–Steinberg: para la térmica (1 bit) el logo se trama aquí, a su tamaño final; el texto sigue nítido
function tramar(im, wpx, hpx) {
  const c = document.createElement('canvas'); c.width = Math.max(1, wpx); c.height = Math.max(1, hpx);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
  const id = g.getImageData(0, 0, c.width, c.height), p = id.data, W = c.width, H = c.height, L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = 0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2];
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const i = yy * W + xx, o = L[i], n = o < 128 ? 0 : 255, er = o - n; L[i] = n;
    if (xx + 1 < W) L[i + 1] += er * 7 / 16;
    if (yy + 1 < H) { if (xx > 0) L[i + W - 1] += er * 3 / 16; L[i + W] += er * 5 / 16; if (xx + 1 < W) L[i + W + 1] += er / 16; }
  }
  for (let i = 0; i < W * H; i++) { p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = L[i]; p[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0);
  return c;
}
// Calidad del logo a ese tamaño: píxeles de la imagen por pulgada de papel (se avisa si sale borroso)
export function ppLogo(e, im) {
  if (!im || !im.width) return 0;
  const r = im.width / im.height, w = e.prop === false ? e.w : Math.min(e.w, e.h * r);
  return Math.round(im.width / (w / 25.4));
}
function dibujaLogo(g, e, x, y, w, hh, dpi, marcarFalta) {
  const im = imagen(e.src || 'empresa');
  if (!im || !im.width) {
    if (marcarFalta) { g.save(); g.strokeStyle = '#999'; g.setLineDash([4, 4]); g.lineWidth = 2; g.strokeRect(x, y, w, hh); g.fillStyle = '#999'; g.font = '600 ' + Math.max(10, Math.round(hh * 0.25)) + 'px "Segoe UI", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LOGO', x + w / 2, y + hh / 2); g.restore(); }
    return;
  }
  let dw = w, dh = hh;
  if (e.prop !== false) { const r = im.width / im.height; if (w / hh > r) dw = hh * r; else dh = w / r; }
  const dx = e.al === 'l' ? x : e.al === 'r' ? x + w - dw : x + (w - dw) / 2, dy = y + (hh - dh) / 2;
  if (dpi <= 203 && e.tramar !== false) g.drawImage(tramar(im, Math.round(dw), Math.round(dh)), Math.round(dx), Math.round(dy));
  else { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(im, dx, dy, dw, dh); }
}
function dibujaQr(g, data, x, y, w, hh, k) {
  if (!data) return;
  const size = Math.min(w, hh), P = qrPlan(String(data), Math.floor(size), Math.round(1.0 * k));
  const bx = x + (w - size) / 2, by = y + (hh - size) / 2, ox = Math.round(bx + (size - P.side) / 2), oy = Math.round(by + (size - P.side) / 2);
  g.fillStyle = '#fff'; g.fillRect(Math.floor(bx), Math.floor(by), Math.ceil(size), Math.ceil(size)); g.fillStyle = '#000';
  P.M.forEach((row, r) => row.forEach((v, c) => { if (v) g.fillRect(ox + (c + P.q) * P.mod, oy + (r + P.q) * P.mod, P.mod, P.mod); }));
}
// Barras de un número ENTERO de píxeles (como el QR): es lo que lee bien cualquier lector
function dibujaBarras(g, e, d, x, y, w, hh, k) {
  const v = rellenar(e.valor || '{codigo}', d).split('\n')[0].trim();
  if (!v) return;
  const an = code128(v); if (!an.length) return;
  const mods = modulos128(an), mod = Math.max(1, Math.floor(w / mods)), bw = mods * mod;
  const txtH = e.txt !== false ? Math.min(hh * 0.28, 3.4 * k) : 0, barH = Math.max(1, hh - txtH);
  const ox = Math.round(x + (w - bw) / 2), oy = Math.round(y);
  g.fillStyle = '#fff'; g.fillRect(ox, oy, bw, Math.ceil(hh)); g.fillStyle = '#000';
  let cx = ox + 10 * mod, barra = true;
  for (const a of an) { if (barra) g.fillRect(cx, oy, a * mod, Math.round(barH)); cx += a * mod; barra = !barra; }
  if (txtH) { g.font = '600 ' + Math.max(6, Math.round(txtH * 0.82)) + 'px Consolas, "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(v, x + w / 2, y + barH + txtH * 0.08, w); }
}
function dibujaCaja(g, e, x, y, w, hh, k) {
  const r = Math.min((Number(e.radio) || 0) * k, w / 2, hh / 2), bo = (Number(e.borde) || 0) * k;
  const path = () => { g.beginPath(); if (r > 0 && g.roundRect) g.roundRect(x + bo / 2, y + bo / 2, w - bo, hh - bo, r); else g.rect(x + bo / 2, y + bo / 2, w - bo, hh - bo); };
  if (e.relleno && e.relleno !== 'none') { g.fillStyle = e.relleno; if (!bo && !r) g.fillRect(x, y, w, hh); else { path(); g.fill(); } }
  if (bo) { g.strokeStyle = e.col || '#000000'; g.lineWidth = bo; path(); g.stroke(); }
}
export function dibujarPieza(g, e, d, dpi, k, sx, sy, opts) {
  if (e.oculto) return;
  const x = e.x * sx * k, y = e.y * sy * k, w = Math.max(1, e.w * sx * k), hh = Math.max(1, e.h * sy * k);
  g.save(); g.translate(x + w / 2, y + hh / 2); if (e.r) g.rotate(e.r * Math.PI / 180);
  const X = -w / 2, Y = -hh / 2;
  if (e.t === 'texto') dibujaTexto(g, e, d, X, Y, w, hh, k, Math.min(sx, sy));
  else if (e.t === 'logo') dibujaLogo(g, e, X, Y, w, hh, dpi, opts && opts.editor);
  else if (e.t === 'qr') dibujaQr(g, d && d.qr, X, Y, w, hh, k);
  else if (e.t === 'barras') dibujaBarras(g, e, d, X, Y, w, hh, k);
  else if (e.t === 'caja') dibujaCaja(g, e, X, Y, w, hh, k);
  g.restore();
}
// Lienzo blanco del tamaño exacto de la etiqueta a la resolución de la impresora, con todas las piezas encima.
// Si la etiqueta de la impresora mide distinto que la plantilla, todo se escala en proporción.
export function dibujar(P, d, dpi, size, opts) {
  const s = size || { w: P.w, h: P.h }, k = dpi / 25.4;
  const c = document.createElement('canvas'); c.width = Math.round(s.w / 25.4 * dpi); c.height = Math.round(s.h / 25.4 * dpi);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
  const sx = s.w / (P.w || s.w), sy = s.h / (P.h || s.h);
  (P.els || []).forEach(e => dibujarPieza(g, e, d || {}, dpi, k, sx, sy, opts));
  c.__plantilla = P.id || 'nueva';
  return c;
}
// Lo que se sale del área imprimible (margen) o de la etiqueta
export function fuera(P) {
  const m = Number(P.margen) || 0;
  return (P.els || []).filter(e => !e.oculto && (e.x < m - 0.05 || e.y < m - 0.05 || e.x + e.w > P.w - m + 0.05 || e.y + e.h > P.h - m + 0.05) && !(e.t === 'caja' && e.relleno === 'none' && (e.borde || 0) > 0 && e.x <= m + 0.1));
}
// «Ajustar al área imprimible»: mete cada pieza dentro del margen (si no cabe, la encoge)
export function ajustarArea(P) {
  const m = Number(P.margen) || 0, W = P.w - 2 * m, H = P.h - 2 * m;
  (P.els || []).forEach(e => {
    if (e.w > W) { const f = W / e.w; e.w = r2(W); if (e.t === 'qr' || (e.t === 'logo' && e.prop !== false)) e.h = r2(e.h * f); }
    if (e.h > H) { const f = H / e.h; e.h = r2(H); if (e.t === 'qr' || (e.t === 'logo' && e.prop !== false)) e.w = r2(e.w * f); }
    if (e.t === 'qr') e.w = e.h = Math.min(e.w, e.h);
    e.x = r2(Math.min(Math.max(e.x, m), P.w - m - e.w)); e.y = r2(Math.min(Math.max(e.y, m), P.h - m - e.h));
  });
  return P;
}
