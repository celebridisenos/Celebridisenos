// ================= 📄 Catálogo PDF para clientes, con los productos de AHORA (16-10-2026) =================
// Ella: «tiene que haber una opción que ponga exportar catálogo y directamente te lo hace, así siempre estamos actualizados» y
// «más estético, con más inspiración y el aura de la marca, como los catálogos de marcas famosas, una página para el producto del mes…
// pero continuando sobre la línea que ya tenemos».
// Aquí solo se MONTA la página (puro: sin pantalla ni servidor, se prueba en Node con test/unit/catalogo_pdf.mjs). Las fotos, el PDF y
// el botón están en catalogo_exporta.js. La línea es la del catálogo aprobado el 16-10 (00_SISTEMA/CATALOGO_CLIENTES): negro + blanco +
// el turquesa del logo, letra Inter, 4 piezas por hoja, y para pedir: tocar la pieza en el móvil (abre WhatsApp con el mensaje escrito) o
// escanear su QR en papel. Encima, lo «de marca»: frase en la portada, bienvenida con índice, LA PIEZA DEL MES con sus fotos y detalles,
// cada sección abre con una foto a toda página, guía de regalos, y títulos con una letra de revista (Instrument Serif cursiva).
// Nada de «3D» ni «impresión»: el cliente compra el producto.
import { qrMatrix } from './qr.js';

// lo que se cuenta de cada pieza que ya existía (escrito mirando sus fotos, pensado para quien compra). Las piezas NUEVAS sacan
// nombre y texto de su ficha (la descripción de la tienda, sin emojis ni frases de «impresión 3D»).
export const TEXTOS = {
  'HOG-0001': ['Maceta balón de baloncesto', 'Un balón de baloncesto convertido en maceta o en lapicero. Para la habitación, el escritorio o para regalar a un fan del basket.'],
  'HOG-0003': ['Soporte de pared para 3 rollos', 'Papel de horno, aluminio y film, cada uno en su sitio y siempre a mano. Se pega a la pared con cinta de doble cara: sin taladrar.'],
  'HOG-0004': ['Portacepillos con rejilla', 'Cada cepillo en su hueco y la rejilla deja escurrir el agua. Ocupa poco y mantiene el lavabo limpio.'],
  'HOG-0005': ['Vaso para cepillos con desagüe', 'Cepillos y pasta juntos, y el agua sale por abajo: se acabaron los charcos en el fondo del vaso.'],
  'HOG-0006': ['Organizador de baño de 2 niveles', 'Arriba jabones y botes, abajo las toallas. Compacto para el lavabo, la encimera o la cocina.'],
  'HOG-0007': ['Organizador de maquillaje', 'Brochas de pie, labiales y máscaras, cada uno en su hueco. El tocador ordenado y bonito sin ocupar casi sitio.'],
  'MIN-0001': ['Figura Crash', 'Figura de 23 cm en estilo low poly, para coleccionistas y fans de los videojuegos. Llega en blanco, lista para pintarla a tu gusto.'],
  'HOG-0008': ['Mano titiritera', 'Una mano que mueve los hilos de una pequeña figura. Una pieza de arte que llama la atención en cualquier estantería.'],
  'HOG-0009': ['No veo, no oigo, no hablo', 'Las tres figuras sabias en versión moderna y minimalista. Para el salón, el recibidor o la oficina.'],
  'HOG-0010': ['Cuadros de gatos', 'Tres siluetas de gatos en sus marcos para alegrar una pared. Ligeros y fáciles de colgar. Para los que aman a los gatos.'],
  'HOG-0011': ['Niña en el columpio de la luna', 'Una niña que se columpia colgada de la luna. Elegante en la estantería o la mesilla, y un regalo precioso.'],
  'HOG-0012': ['Copa «Vaso de almas»', 'Una copa escultura formada por dos rostros que se miran. Pieza decorativa (no es para beber) que no pasa desapercibida.'],
  'HOG-0013': ['Pareja de cisnes', 'Dos cisnes enfrentados, uno blanco y otro negro, o en los colores que elijas. Un regalo bonito para parejas y aniversarios.'],
  'HOG-0014': ['Cesta con lazo para el tocador', 'Cestita con lazo para perfumes, cremas o maquillaje. Ordena el tocador y, de paso, lo decora.'],
  'HOG-0015': ['Bandeja joyero con lazo', 'Bandeja para anillos y pulseras, con un arco para colgar collares. Preciosa en el tocador o la mesilla.'],
  'HOG-0016': ['Mano joyero', 'Una mano para lucir anillos, pulseras y relojes. En el tocador, todo a la vista y bien ordenado.'],
  'HOG-0017': ['Figura con pajarito', 'Una figura que se arquea hacia atrás con un pajarito posado encima. Un toque de arte para el escritorio o la estantería.'],
  'MAS-0001': ['Dispensador de chuches', 'Rellena el rodillo con sus premios: al girarlo, van cayendo. Juego y recompensa a la vez para tu gato o tu perro.'],
  'HOG-0018': ['Cubo infinito', 'El cubo «imposible»: lo miras dos veces y sigue sin cuadrar. Para el escritorio o la estantería, y un regalo curioso.'],
  'HOG-0019': ['Cuadro árbol de hexágonos', 'Un árbol geométrico para vestir la pared del salón o del dormitorio. Plano y ligero: decora sin obras.'],
  'HOG-0020': ['Árbol en 3 cuadros', 'Un árbol repartido en tres paneles para el cabecero, el salón o la entrada. Llena una pared vacía en un momento.'],
  'HOG-0021': ['Figura de meditación', 'Una figura en meditación dentro de un aro: pura calma para tu rincón zen, el escritorio o la estantería.'],
  'HOG-0022': ['Escultura de dos rostros', 'Dos caras que se funden entre las manos. Una pieza moderna que llama la atención en la mesa o la estantería.'],
  'HOG-0023': ['Figura con corazón', 'Una figura sentada que guarda un corazón rojo entre las manos. Para la mesilla, la estantería o para regalar a alguien especial.'],
  'HOG-0024': ['Corazón de rosas', 'Un corazón hecho de rosas que cuelga de su soporte. Para San Valentín, un aniversario o el Día de la Madre.'],
  'HOG-0025': ['Taza de café flotante', 'La taza que se derrama y se queda en el aire. Sorprende a todos junto a la cafetera o en la cocina.'],
  'PRD-0001': ['Gato con bandeja', 'Un gato panza arriba que sujeta una bandeja: para joyas, perfumes, velas o las llaves. Decora y ordena a la vez.'],
  'HOG-0026': ['Letras HOME', 'La palabra HOME en letras grandes y apiladas. Da la bienvenida en el recibidor y queda genial en una estantería.'],
  'HOG-0027': ['Rostro que se deshace', 'Un rostro sereno que se deshace en fragmentos, sostenido por una mano. Escultura de estilo galería para el salón o el escritorio.'],
  'HOG-0028': ['Trío de pensadores', 'Tres figuras en pose de pensar, de líneas suaves y estilo nórdico. Quedan perfectas juntas en una estantería.'],
};
// para cuando una de estas sea LA PIEZA DEL MES: un poco más de historia y tres claves (solo lo que se ve en sus fotos o en su ficha)
export const HISTORIAS = {
  'HOG-0009': ['Las tres figuras sabias de siempre, en versión moderna: una se tapa los ojos, otra los oídos y otra la boca. Un recordatorio de calma que queda precioso en una balda, en el recibidor o en la mesa del despacho.', ['Juego de tres figuras', 'En negro, en blanco o en el color que elijas', 'Un regalo con mensaje']],
  'HOG-0001': ['Un balón de baloncesto que se convierte en maceta para flores o en lapicero para el escritorio. Divertido, distinto y con mucho rollo para la habitación de un fan del basket.', ['Para flores, plantas o lápices', 'En el color que quieras', 'Regalo perfecto para deportistas']],
  'HOG-0008': ['Una mano que mueve los hilos de una pequeña figura, como un titiritero. Una pieza de arte que hace pensar y que nadie pasa por alto en una estantería.', ['Pieza de arte para la estantería', 'En blanco o en negro', 'Llama la atención en cualquier rincón']],
  'HOG-0010': ['Tres gatos en sus marcos, jugando con una mariposa. Ligeros, fáciles de colgar y con mucha gracia: alegran una pared vacía en un momento.', ['Juego de tres cuadros', 'Ligeros y fáciles de colgar', 'Para los que aman a los gatos']],
  'HOG-0017': ['Una figura que se arquea hacia atrás con un pajarito posado encima: equilibrio, calma y un toque de humor. Arte para el escritorio o la estantería.', ['Figura de estilo galería', 'En varios colores', 'Para el escritorio o la estantería']],
  'HOG-0007': ['El tocador por fin ordenado: brochas de pie, labiales y máscaras, cada uno en su hueco. Ocupa muy poco y queda bonito a la vista.', ['Cada cosa en su hueco', 'Ocupa muy poco', 'Tocador ordenado y bonito']],
  'HOG-0011': ['Una niña que se columpia colgada de la luna. Delicada y poética: en la estantería o en la mesilla, cuenta una historia.', ['Pieza decorativa elegante', 'Queda preciosa con luz cálida', 'Un regalo que emociona']],
  'HOG-0025': ['La taza que se derrama… y se queda en el aire. Una pieza que sorprende a todo el que la ve junto a la cafetera.', ['Efecto «flotante» que sorprende', 'En 7 colores', 'Para la cocina o el rincón del café']],
  'HOG-0012': ['Dos rostros que se miran y forman una copa. Una escultura con mucho que decir (es decorativa, no es para beber).', ['Escultura decorativa', 'En varios colores', 'No pasa desapercibida']],
  'HOG-0013': ['Dos cisnes enfrentados que dibujan un corazón: uno blanco y otro negro, o en los colores que elijas. El regalo de aniversario que siempre funciona.', ['Pareja de figuras', 'Blanco y negro, o a tu gusto', 'Para parejas y aniversarios']],
};
// el nombre que tenía cada pieza en su ficha cuando se escribió lo de arriba: lo escrito para una referencia SOLO se usa si la pieza sigue
// llamándose así (si se renombra, o el número lo lleva otra pieza —otra instalación, una pieza nueva—, sale lo de su ficha y no lo de otra)
export const NOMBRE_FICHA = { 'HOG-0001': "Maceta Basquetball", 'HOG-0003': "Soporte de pared multirrollo", 'HOG-0004': "Portacepillos", 'HOG-0005': "Vaso Escurridor para Cepillos de Dientes", 'HOG-0006': "Organizador Toallas", 'HOG-0007': "organizador de maquillaje", 'MIN-0001': "Figura Crash", 'HOG-0008': "Mano Magic", 'HOG-0009': "Trío Decorativo", 'HOG-0010': "Gato Pared", 'HOG-0011': "Columpio a la Luna", 'HOG-0012': "VASO DE ALMAS", 'HOG-0013': "Pareja de Cisnes", 'HOG-0014': "Organizador de Cesta con lazo", 'HOG-0015': "Bandeja de joyas  con Lazo", 'HOG-0016': "JewleryHand", 'HOG-0017': "Pajaro Caido", 'MAS-0001': "Dispensador de chuches para mascotas", 'HOG-0018': "Cubo Infinito", 'HOG-0019': "Cuadro Árbol Central", 'HOG-0020': "Trio de Cuadros Árbol", 'HOG-0021': "Figura Templo", 'HOG-0022': "Figura Doble Rostro", 'HOG-0023': "Figura Mirando el Amor", 'HOG-0024': "Soporte Rosa", 'HOG-0025': "Taza de Café / Chocolate", 'PRD-0001': "Gato con Bandeja", 'HOG-0026': "Home Letras", 'HOG-0027': "Escultura Rostro Desintegrándose", 'HOG-0028': "Trio Pensador" };
const sin0 = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
export const conocida = p => !!(p && NOMBRE_FICHA[p.id] && sin0(p.nombre) === sin0(NOMBRE_FICHA[p.id]));
// encuadre de fotos (qué parte se ve al recortarla): [x %, y %, zoom]
export const ENCUADRE = { 'HOG-0017': [50, 32, 1] };
// zonas de una foto que se TAPAN con su propio color al prepararla (x0, y0, x1, y1 en fracciones de la foto original):
// p. ej. el lomo de un libro del fondo que pone «3D PRINTING» (el cliente compra la pieza; cómo se hace no le hace falta)
export const RETOQUES = { 'HOG-0017': [[0, 0.405, 0.255, 0.442]] };
export const retoquesDe = p => (conocida(p) && RETOQUES[p.id]) || null;
// medidas guardadas que no son las de la pieza montada (se callan)
const SIN_MEDIDAS = ['MAS-0001', 'HOG-0024'];
export const SECCIONES = [
  { t: 'Decoración', d: 'Piezas con personalidad para el salón, el dormitorio o la entrada.', frase: 'Piezas que cuentan algo.', orden: ['HOG-0013', 'HOG-0011', 'HOG-0025', 'HOG-0012', 'HOG-0023', 'HOG-0021', 'HOG-0028', 'HOG-0009', 'HOG-0022', 'HOG-0027', 'HOG-0017', 'HOG-0008', 'HOG-0018', 'HOG-0024', 'HOG-0026', 'HOG-0019', 'HOG-0020', 'HOG-0010', 'HOG-0001', 'MIN-0001'] },
  { t: 'Orden y casa', d: 'Para el tocador, el baño, la cocina… y tu mascota.', frase: 'Cada cosa en su sitio. Y bonita.', orden: ['HOG-0015', 'HOG-0014', 'HOG-0007', 'PRD-0001', 'HOG-0016', 'HOG-0006', 'HOG-0005', 'HOG-0004', 'HOG-0003', 'MAS-0001'],
    // una pieza nueva va aquí si su categoría o su nombre suenan a ordenar (si no, a Decoración)
    re: /ba[ñn]o|cocina|organiz|ordena|mascota|perro|gato|joyer|tocador|percher|gancho|almacen|escritorio|soporte|portacepillo|dispensador|bandeja|cesta|caja/i },
];
// lo que cuenta la marca (si en Tienda → Datos hay texto de «Quiénes somos», se usa el suyo, sin frases técnicas)
export const MARCA = { frase: 'Pequeñas piezas que cambian un espacio.', texto: 'Piezas de decoración y orden para que tu casa se parezca a ti. Cuidamos el acabado, revisamos cada pieza antes de enviarla y te atendemos de tú a tú. Colores, nombres, medidas… lo hacemos a tu manera.', lema: 'Piezas con alma para tu casa' };
export const COL = { amarillo: '#F2C230', azul: '#2F6FD6', blanco: '#FFFFFF', naranja: '#F28C28', negro: '#1E1E1E', rojo: '#D93636', marron: '#8B5A2B', 'marrón': '#8B5A2B', rosa: '#F4A7BB', 'rosa pastel': '#F6C1CF', verde: '#3FA34D', morado: '#8E5BD9', gris: '#9AA0A6', dorado: '#C9A227' };
const EMO = { '🟤': 'marron', '🟣': 'morado', '🔵': 'azul', '🟡': 'amarillo', '🟠': 'naranja', '🔴': 'rojo', '🤍': 'blanco', '⚪': 'blanco', '🖤': 'negro', '⚫': 'negro', '🟢': 'verde' };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const sin = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const may = s => s.charAt(0).toUpperCase() + s.slice(1);

// colores de la pieza: los de sus variantes de la tienda (emojis) o los escritos en la ficha · 'varios' si pone multicolor
export function colores(p) {
  const v = p.web && Array.isArray(p.web.variantes) && p.web.variantes.find(x => /color/i.test(x && x.nombre)); let L = [];
  if (v && Array.isArray(v.valores)) L = [...v.valores.join('')].map(ch => EMO[ch]).filter(Boolean);
  if (!L.length && p.color) { const c = sin(p.color); if (/multicolor|color$/.test(c) && !/,/.test(c)) return 'varios'; L = c.split(/[,/]| y /).map(x => x.trim()).filter(x => COL[x]); }
  return [...new Set(L)];
}
const coloresHtml = C => C === 'varios' ? '<span class="cols"><i class="arco"></i><em>Varios colores</em></span>' : C.length ? '<span class="cols">' + C.map(c => `<i style="background:${COL[c]}"></i>`).join('') + '<em>' + (C.length > 1 ? C.length + ' colores' : may(C[0])) + '</em></span>' : '';
// medidas (solo las MEDIDAS de verdad), en cm redondeados a medio centímetro: «14 × 14 × 19 cm»
export function medidas(p) {
  if ((conocida(p) && SIN_MEDIDAS.includes(p.id)) || p.dimEstado !== 'medido') return '';
  const d = [p.dimX, p.dimY, p.dimZ].map(Number).filter(x => x > 0); if (d.length < 3) return '';
  return d.map(x => String(Math.round(x / 5) / 2).replace('.', ',')).join(' × ') + ' cm';
}
// el precio que ve el cliente: el de la tienda si está publicada; si no, el de la ficha
export function precioDe(p) { const w = p.web && p.web.publicado && Number(p.web.precio) > 0 ? Number(p.web.precio) : Number(p.precio); return w > 0 ? w : 0; }
export const precioTxt = v => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + ' €';
// nombre y texto para el cliente
const sinEmoji = s => String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/[ \t]+/g, ' ');
const tecnico = /\b3\s?d\b|impres|imprim|filamento|\bpla\b|\bpetg\b|makerworld|stl\b|laminad|bambu/i;
const frasesDe = t => sinEmoji(t).split(/\n+/).map(x => x.trim()).filter(Boolean).join(' ').split(/(?<=[.!?…])\s+/).map(x => x.replace(/^[-•·✓✔*]\s*/, '').trim()).filter(x => x.length > 3 && !tecnico.test(x));
export function textoDe(p) {
  const t = conocida(p) && TEXTOS[p.id]; if (t) return { nombre: t[0], texto: t[1] };
  let n = sinEmoji(p.nombre).trim(); if (n === n.toUpperCase()) n = n.toLowerCase(); n = may(n);
  const frases = frasesDe((p.web && p.web.descripcion) || p.descripcion || '');
  let texto = ''; for (const f of frases) { if ((texto + ' ' + f).trim().length > 150) break; texto = (texto + ' ' + f).trim(); }
  if (!texto && frases[0]) texto = frases[0].slice(0, 140).replace(/\s+\S*$/, '') + '…';
  return { nombre: n, texto };
}
export function seccionDe(p) {
  if (conocida(p)) for (let i = 0; i < SECCIONES.length; i++) if (SECCIONES[i].orden.includes(p.id)) return i;
  const o = SECCIONES.findIndex(s => s.re); return o >= 0 && SECCIONES[o].re.test([p.categoria, p.subcategoria, p.nombre].join(' ')) ? o : 0;
}
// WhatsApp: «+34 642 00 52 81», «642005281»… → { num: '34642005281', ver: '642 00 52 81' } · null si no hay
export function telefono(t) {
  let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.length === 9) d = '34' + d; if (d.length < 10) return null;
  return { num: d, ver: d.startsWith('34') && d.length === 11 ? d.slice(2).replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4') : '+' + d };
}
export function temporada(f = new Date()) { const m = f.getMonth(); return (m >= 2 && m <= 4 ? 'Primavera' : m >= 5 && m <= 7 ? 'Verano' : m >= 8 && m <= 10 ? 'Otoño' : 'Invierno') + ' · ' + f.getFullYear(); }
export function nombreArchivo(f = new Date()) { const p = n => String(n).padStart(2, '0'); return 'Catálogo CelebriDiseños - ' + p(f.getDate()) + '-' + p(f.getMonth() + 1) + '-' + f.getFullYear() + '.pdf'; }
// QR con corrección L (menos cuadritos → cuadritos más grandes → se lee mejor impreso)
export function qrSvgL(txt, cls) { const M = qrMatrix(txt, 'L'), N = M.length, q = 4; let d = ''; M.forEach((row, r) => row.forEach((v, c) => { if (v) d += `M${c + q} ${r + q}h1v1h-1z`; }));
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N + 2 * q} ${N + 2 * q}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`; }
// el texto de «Quiénes somos» de la tienda → lo de la marca (sin frases técnicas; si no hay, el de siempre)
export function marcaDe(quienes) {
  const f = frasesDe(quienes && quienes.texto || ''); let t = ''; for (const x of f) { if ((t + ' ' + x).length > 260) break; t = (t + ' ' + x).trim(); }
  return Object.assign({}, MARCA, t.length > 60 ? { texto: t } : {});
}

// qué piezas entran (con foto y precio) y en qué orden → { secciones: [[p…], …], fuera: [{ nombre, por }] }
export function elige(productos, fotos) {
  const sec = SECCIONES.map(() => []), fuera = [];
  (productos || []).forEach(p => { if (!p || !p.id) return; const n = textoDe(p).nombre;
    if (!(precioDe(p) > 0)) fuera.push({ id: p.id, nombre: n, por: 'no tiene precio' }); else if (!fotos[p.id]) fuera.push({ id: p.id, nombre: n, por: 'no tiene foto' }); else sec[seccionDe(p)].push(p); });
  sec.forEach((L, i) => { const o = SECCIONES[i].orden; L.sort((a, b) => { const ia = conocida(a) ? o.indexOf(a.id) : -1, ib = conocida(b) ? o.indexOf(b.id) : -1; return (ia < 0 ? 1e4 : ia) - (ib < 0 ? 1e4 : ib) || textoDe(a).nombre.localeCompare(textoDe(b).nombre, 'es'); }); });
  return { secciones: sec, fuera };
}
// LA PIEZA DEL MES (si no se elige a mano): la marcada como «destacada» en la tienda; si no, la más vendida del último mes; si no, la primera
export function piezaDelMes(productos, ventas = {}) {
  const L = (productos || []).filter(p => p && precioDe(p) > 0); if (!L.length) return null;
  const d = L.find(p => p.web && p.web.destacado); if (d) return d.id;
  const v = L.slice().sort((a, b) => (ventas[b.id] || 0) - (ventas[a.id] || 0))[0]; return v && ventas[v.id] > 0 ? v.id : L[0].id;
}
// las fotos grandes: la de la bienvenida y la que abre cada sección (las de más resolución, apaisadas, sin repetir la del mes)
// tamanos: { id → [ancho, alto] en px } · → { bienvenida: id, aperturas: [id por sección], regalos: [ids] }
export function planFotos(secciones, tamanos = {}, mesId = null, ventas = {}) {
  const usadas = new Set([mesId]), area = id => { const t = tamanos[id]; return t ? t[0] * t[1] * (t[0] >= t[1] * 1.15 ? 1 : 0.35) : 0; };
  const mejor = L => L.filter(p => !usadas.has(p.id)).sort((a, b) => area(b.id) - area(a.id))[0];
  const aperturas = secciones.map(L => { const m = mejor(L); if (m) usadas.add(m.id); return m ? m.id : null; });
  const todas = secciones.flat(), b = mejor(todas); if (b) usadas.add(b.id);
  let tope = 10, baratas = todas.filter(p => p.id !== mesId && precioDe(p) <= tope); if (baratas.length < 6) { tope = 15; baratas = todas.filter(p => p.id !== mesId && precioDe(p) <= tope); }
  const regalos = baratas.length >= 3 ? baratas.slice().sort((x, y) => (ventas[y.id] || 0) - (ventas[x.id] || 0) || area(y.id) - area(x.id)).slice(0, 6).map(p => p.id) : [];
  return { bienvenida: b ? b.id : null, aperturas, regalos, tope };
}

const DIB_LLAVERO = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"><defs><filter id="so" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="5"/></filter></defs>
  <g transform="translate(70 42) rotate(-9)"><rect x="6" y="24" width="150" height="62" rx="16" fill="#000" opacity=".16" filter="url(#so)"/><rect x="0" y="14" width="150" height="62" rx="16" fill="#00CDE6"/><circle cx="20" cy="45" r="7" fill="#F4F4F5"/><text x="88" y="56" text-anchor="middle" font-family="In, Inter, sans-serif" font-weight="600" font-size="30" fill="#fff">Lucía</text></g>
  <g transform="translate(150 108) rotate(7)"><rect x="6" y="10" width="118" height="52" rx="14" fill="#000" opacity=".16" filter="url(#so)"/><rect x="0" y="0" width="118" height="52" rx="14" fill="#161616"/><circle cx="17" cy="26" r="6" fill="#F4F4F5"/><text x="70" y="35" text-anchor="middle" font-family="In, Inter, sans-serif" font-weight="500" font-size="24" letter-spacing="1" fill="#fff">M &amp; J</text></g>
  <circle cx="68" cy="66" r="21" fill="none" stroke="#A1A1A6" stroke-width="3.2"/><circle cx="148" cy="132" r="17" fill="none" stroke="#A1A1A6" stroke-width="3"/></svg>`;
const DIB_STL = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"><defs><filter id="so2" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="5"/></filter></defs>
  <g transform="translate(62 36)"><path d="M6 10h66l26 26v104H6z" fill="#000" opacity=".14" filter="url(#so2)"/><path d="M0 0h66l26 26v104H0z" fill="#fff"/><path d="M66 0v26h26" fill="#E8E8EA"/><rect x="14" y="88" width="48" height="22" rx="5" fill="#00CDE6"/><text x="38" y="104" text-anchor="middle" font-family="In, Inter, sans-serif" font-weight="600" font-size="13" fill="#fff">.STL</text><rect x="14" y="44" width="58" height="5" rx="2.5" fill="#E8E8EA"/><rect x="14" y="58" width="44" height="5" rx="2.5" fill="#E8E8EA"/></g>
  <path d="M168 104h22" stroke="#A1A1A6" stroke-width="3" stroke-linecap="round"/><path d="M184 97l8 7-8 7" fill="none" stroke="#A1A1A6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="translate(204 76)"><rect x="4" y="8" width="96" height="48" rx="14" fill="#000" opacity=".12" filter="url(#so2)"/><path d="M14 0h70a14 14 0 0 1 14 14v20a14 14 0 0 1-14 14H18l-14 9 3-12A14 14 0 0 1 0 34V14A14 14 0 0 1 14 0z" fill="#161616"/><text x="49" y="22" text-anchor="middle" font-family="In, Inter, sans-serif" font-weight="500" font-size="11.5" fill="#fff">Presupuesto</text><text x="49" y="36" text-anchor="middle" font-family="In, Inter, sans-serif" font-weight="300" font-size="11" fill="#00CDE6">al momento</text></g></svg>`;

const CSS = `
@page { size: A4; margin: 0; }
:root { --negro: #000000; --tinta: #161616; --gris: #55555B; --claro: #8E8E94; --linea: #E8E8EA; --placa: #F4F4F5; --cian: #00CDE6; --cian-t: #0A8FA3; --hueso: #F7F6F3; }
* { box-sizing: border-box; margin: 0; padding: 0; } html, body { background: #fff; color: var(--tinta); font-family: In, Inter, 'Segoe UI', system-ui, sans-serif; font-weight: 400; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
a { color: inherit; text-decoration: none; }
.se { font-family: Se, 'Instrument Serif', Georgia, 'Times New Roman', serif; font-style: italic; font-weight: 400; letter-spacing: -.01em; }
.hoja { width: 210mm; height: 297mm; padding: 15mm 18mm 15mm; position: relative; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
.hoja:last-child { page-break-after: auto; break-after: auto; }
.hoja.sangre { padding: 0; }
.negra { background: var(--negro); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.negra .logo { width: 96mm; height: 96mm; display: block; }
.negra .t1 { font-weight: 200; font-size: 30pt; letter-spacing: .32em; text-transform: uppercase; margin-top: 12mm; padding-left: .32em; }
.negra .t2 { font-weight: 300; font-size: 10pt; letter-spacing: .3em; text-transform: uppercase; color: #8E8E94; margin-top: 4mm; padding-left: .3em; }
.negra .lema { font-size: 17pt; color: #D7D7DB; margin-top: 9mm; }
.negra .raya { width: 12mm; height: .35mm; background: var(--cian); margin: 9mm auto 0; }
.negra .wa { position: absolute; bottom: 18mm; left: 0; right: 0; font-size: 8.5pt; letter-spacing: .2em; text-transform: uppercase; color: #8E8E94; } .negra .wa b { color: var(--cian); font-weight: 400; letter-spacing: .08em; }
.cab { display: flex; align-items: center; gap: 2.5mm; height: 9mm; border-bottom: .2mm solid var(--linea); padding-bottom: 3mm; }
.cab img { width: 6.5mm; height: 6.5mm; } .cab span { font-size: 8.5pt; font-weight: 500; } .cab b { margin-left: auto; font-size: 7pt; font-weight: 500; letter-spacing: .22em; text-transform: uppercase; color: var(--claro); }
.pie-hoja { position: absolute; bottom: 8mm; left: 18mm; right: 18mm; display: flex; align-items: baseline; gap: 6mm; font-size: 7pt; color: var(--claro); }
.pie-hoja .como { flex: 1; line-height: 1.4; } .pie-hoja .como b { font-weight: 500; color: var(--gris); } .pie-hoja .num { letter-spacing: .14em; margin-left: auto; }
.kicker { font-size: 7pt; font-weight: 500; letter-spacing: .26em; text-transform: uppercase; color: var(--claro); }
/* fotos a toda página (con su pie: «En la foto: …») */
.foto-g { position: relative; overflow: hidden; background: var(--placa); } .foto-g img { width: 100%; height: 100%; object-fit: cover; display: block; }
.foto-g .leyenda { position: absolute; left: 0; right: 0; bottom: 0; padding: 14mm 18mm 5mm; background: linear-gradient(to top, rgba(0,0,0,.45), rgba(0,0,0,0)); color: #fff; font-size: 7.4pt; letter-spacing: .06em; }
.foto-g .leyenda b { font-weight: 500; }
/* bienvenida */
.bv .foto-g { height: 166mm; }
.bv-cuerpo { display: grid; grid-template-columns: 1fr 58mm; gap: 14mm; padding: 13mm 18mm 0; }
.bv-cuerpo h1 { font-size: 31pt; line-height: 1.05; margin: 3mm 0 5mm; } .bv-cuerpo p { font-size: 10pt; line-height: 1.65; color: var(--gris); }
.firma { margin-top: 6mm; font-size: 8pt; font-weight: 500; letter-spacing: .2em; text-transform: uppercase; } .firma::before { content: ''; display: inline-block; width: 8mm; height: .3mm; background: var(--cian); vertical-align: middle; margin-right: 3mm; }
.indice { list-style: none; margin-top: 4mm; border-top: .2mm solid var(--linea); } .indice li { display: flex; align-items: baseline; gap: 2mm; padding: 2.6mm 0; border-bottom: .2mm solid var(--linea); font-size: 9.5pt; }
.indice li span { flex: 1; } .indice li b { font-weight: 400; color: var(--cian-t); letter-spacing: .08em; font-size: 9pt; }
.valores { position: absolute; left: 18mm; right: 18mm; bottom: 19mm; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; border-top: .2mm solid var(--linea); padding-top: 4.5mm; }
.valores div { font-size: 8.4pt; color: var(--gris); line-height: 1.5; } .valores b { display: block; font-size: 14pt; color: var(--tinta); margin-bottom: .6mm; }
/* la pieza del mes */
.mos { position: relative; height: 156mm; display: grid; gap: 1.6mm; background: #fff; }
.mos.n1 { grid-template-columns: 1fr; } .mos.n2 { grid-template-columns: 1.55fr 1fr; } .mos.n3 { grid-template-columns: 1.55fr 1fr; grid-template-rows: 1fr 1fr; } .mos.n3 .m1 { grid-row: 1 / 3; }
.mos > div { overflow: hidden; background: var(--placa); } .mos img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sello { position: absolute; top: 14mm; left: 18mm; background: #fff; color: var(--tinta); padding: 2.4mm 4.2mm; font-size: 7pt; font-weight: 500; letter-spacing: .24em; text-transform: uppercase; border-radius: .6mm; }
.sello b { color: var(--cian-t); font-weight: 500; }
.mes-cuerpo { display: grid; grid-template-columns: 1fr 60mm; gap: 12mm; padding: 11mm 18mm 0; }
.mes-cuerpo .se.k { font-size: 17pt; color: var(--cian-t); } .mes-cuerpo h2 { font-weight: 200; font-size: 27pt; letter-spacing: -.02em; line-height: 1.08; margin: 1.5mm 0 4mm; }
.mes-cuerpo .hist { font-size: 10pt; line-height: 1.65; color: var(--gris); }
.claves { list-style: none; margin-top: 5mm; } .claves li { font-size: 9.3pt; padding: 1.6mm 0 1.6mm 6mm; position: relative; } .claves li::before { content: ''; position: absolute; left: 0; top: 3.5mm; width: 3mm; height: .3mm; background: var(--cian); }
.ficha { border-top: .2mm solid var(--tinta); } .ficha div { display: flex; justify-content: space-between; align-items: center; gap: 3mm; padding: 2.6mm 0; border-bottom: .2mm solid var(--linea); font-size: 8.6pt; }
.ficha dt { color: var(--claro); font-size: 6.8pt; letter-spacing: .2em; text-transform: uppercase; } .ficha dd { text-align: right; } .ficha .pz dd { font-weight: 600; font-size: 19pt; letter-spacing: -.01em; }
.cta { display: flex; align-items: center; gap: 3.5mm; margin-top: 5mm; background: var(--negro); color: #fff; border-radius: 2mm; padding: 3.2mm; }
.combina { margin-top: 7mm; } .combina a { display: grid; grid-template-columns: 17mm 1fr auto; gap: 3mm; align-items: center; padding: 2mm 0; border-bottom: .2mm solid var(--linea); }
.combina .t { width: 17mm; height: 14mm; border-radius: 1mm; overflow: hidden; background: var(--placa); } .combina .t img { width: 100%; height: 100%; object-fit: cover; display: block; } .combina span { font-size: 8.2pt; line-height: 1.3; } .combina b { font-size: 9pt; font-weight: 600; }
.cta svg { width: 19mm; height: 19mm; display: block; border-radius: .8mm; } .cta b { display: block; font-weight: 500; font-size: 9.5pt; } .cta span { font-size: 7.2pt; color: #A9A9AE; line-height: 1.4; }
/* apertura de sección */
.ap .foto-g { height: 198mm; }
.ap-cuerpo { padding: 12mm 18mm 0; display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 10mm; }
.ap-num { font-weight: 200; font-size: 11pt; letter-spacing: .3em; color: var(--cian-t); } .ap-cuerpo h2 { font-size: 58pt; line-height: .95; margin: 3mm 0 4mm; } .ap-cuerpo .fr { font-size: 15pt; color: var(--tinta); } .ap-cuerpo p { font-size: 10pt; color: var(--gris); margin-top: 2mm; line-height: 1.55; max-width: 110mm; }
.ap-meta { text-align: right; font-size: 7.4pt; letter-spacing: .2em; text-transform: uppercase; color: var(--claro); line-height: 2; } .ap-meta b { display: block; font-weight: 200; font-size: 26pt; letter-spacing: -.01em; color: var(--tinta); text-transform: none; line-height: 1.1; }
/* «cómo pedir» */
.h1 { font-weight: 200; font-size: 34pt; letter-spacing: -.02em; line-height: 1.05; margin-top: 13mm; } .h1 .se { font-size: 38pt; } .lead { font-size: 11pt; font-weight: 300; color: var(--gris); line-height: 1.6; margin-top: 5mm; max-width: 140mm; }
.pasos { margin-top: 10mm; border-top: .2mm solid var(--linea); }
.paso { display: grid; grid-template-columns: 22mm 1fr; padding: 6mm 0; border-bottom: .2mm solid var(--linea); }
.paso .n { font-weight: 200; font-size: 24pt; color: var(--cian-t); line-height: 1; } .paso h3 { font-weight: 500; font-size: 12.5pt; margin-bottom: 1.8mm; } .paso p { font-size: 10pt; font-weight: 400; color: var(--gris); line-height: 1.6; } .paso p b { font-weight: 500; color: var(--tinta); } .paso p + p { margin-top: 1.5mm; }
.burbuja { display: inline-block; margin: 3mm 0 2mm; background: var(--placa); border-radius: 4mm 4mm 4mm 1mm; padding: 2.4mm 4.5mm; font-size: 9.5pt; color: var(--tinta); }
.contacto { display: grid; grid-template-columns: 34mm 1fr; gap: 9mm; align-items: center; margin-top: 9mm; }
.contacto svg { width: 34mm; height: 34mm; display: block; } .contacto .et { font-size: 7pt; letter-spacing: .22em; text-transform: uppercase; color: var(--claro); } .contacto .tel { font-weight: 300; font-size: 22pt; letter-spacing: .02em; margin: 1.5mm 0 2mm; display: inline-block; } .contacto p { font-size: 9.5pt; font-weight: 400; color: var(--gris); line-height: 1.6; max-width: 105mm; }
.notas { position: absolute; left: 18mm; right: 18mm; bottom: 18mm; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; border-top: .2mm solid var(--linea); padding-top: 5mm; }
.notas div { font-size: 8.6pt; font-weight: 400; color: var(--gris); line-height: 1.55; } .notas b { display: block; font-weight: 500; color: var(--tinta); font-size: 9pt; margin-bottom: 1mm; }
/* hojas de piezas */
.titsec { height: 23mm; display: flex; align-items: flex-end; gap: 7mm; padding-bottom: 6mm; } .titsec h2 { font-size: 32pt; line-height: 1; white-space: nowrap; } .titsec p { font-size: 9.5pt; font-weight: 400; color: var(--gris); padding-bottom: 1mm; }
.titsec.vacio { height: 8mm; padding: 0; } .titsec.dentro { height: 19mm; margin-top: 2mm; border-top: .2mm solid var(--linea); }
.rejilla { display: grid; grid-template-columns: 1fr 1fr; column-gap: 10mm; row-gap: 8mm; }
.prod { display: flex; flex-direction: column; height: 110mm; }
.prod .foto { flex: none; height: 56mm; background: var(--placa); border-radius: 2mm; overflow: hidden; } .prod .foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
.prod .foto.dib svg { width: 100%; height: 100%; display: block; }
.prod .txt { flex: 1; display: flex; flex-direction: column; padding-top: 3.6mm; }
.ref { font-size: 6.8pt; font-weight: 500; letter-spacing: .18em; text-transform: uppercase; color: var(--cian-t); }
.prod h3 { font-weight: 500; font-size: 12pt; letter-spacing: -.005em; margin: 1.1mm 0 1.4mm; } .prod p { font-size: 8.9pt; font-weight: 400; line-height: 1.48; color: var(--gris); max-height: 3lh; overflow: hidden; }
.datos { display: flex; gap: 4mm; align-items: center; margin: 2mm 0 3mm; font-size: 7.6pt; color: var(--claro); }
.ejemplo { margin: 2mm 0 3mm; font-size: 8.3pt; font-style: italic; color: var(--claro); }
.cols { display: inline-flex; align-items: center; gap: .9mm; } .cols i { width: 2.4mm; height: 2.4mm; border-radius: 50%; display: inline-block; box-shadow: inset 0 0 0 .2mm rgba(0,0,0,.22); } .cols em { font-style: normal; margin-left: 1mm; }
.cols i.arco { background: conic-gradient(#D93636, #F28C28, #F2C230, #3FA34D, #2F6FD6, #8E5BD9, #D93636); }
.pie { margin-top: auto; display: flex; align-items: center; justify-content: space-between; border-top: .2mm solid var(--linea); padding-top: 2.2mm; }
.precio { font-weight: 600; font-size: 14.5pt; letter-spacing: -.01em; } .precio.pre { font-size: 9.5pt; font-weight: 500; line-height: 1.25; letter-spacing: 0; }
.pide { display: flex; align-items: center; gap: 2.2mm; font-size: 6.9pt; color: var(--claro); text-align: right; line-height: 1.3; letter-spacing: .03em; } .pide .qr { width: 14mm; height: 14mm; display: block; }
/* ideas para regalar */
.rg-tit { padding: 9mm 0 7mm; display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 8mm; } .rg-tit h2 { font-size: 40pt; line-height: 1; } .rg-tit p { font-size: 10pt; color: var(--gris); line-height: 1.55; margin-top: 3mm; max-width: 112mm; }
.rg-tope { text-align: right; font-size: 7pt; letter-spacing: .22em; text-transform: uppercase; color: var(--claro); } .rg-tope b { display: block; font-weight: 200; font-size: 30pt; letter-spacing: -.02em; color: var(--tinta); text-transform: none; line-height: 1; }
.rg-rejilla { display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 7mm; row-gap: 8mm; }
.rg .f { height: 71mm; border-radius: 2mm; overflow: hidden; background: var(--placa); } .rg .f img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rg .n { font-size: 9.6pt; font-weight: 500; margin-top: 3mm; line-height: 1.3; } .rg .p { display: flex; justify-content: space-between; align-items: baseline; margin-top: 1.2mm; font-size: 11.5pt; font-weight: 600; } .rg .p span { font-size: 6.6pt; font-weight: 500; letter-spacing: .16em; color: var(--cian-t); }
.rg-banda { position: absolute; left: 18mm; right: 18mm; bottom: 19mm; background: var(--negro); color: #fff; border-radius: 2mm; padding: 6mm 8mm; display: flex; align-items: center; gap: 8mm; }
.rg-banda .se { font-size: 19pt; color: #fff; white-space: nowrap; } .rg-banda p { font-size: 9pt; color: #BDBDC2; line-height: 1.55; }
/* contraportada */
.negra h2 { font-size: 36pt; letter-spacing: -.01em; margin-top: 10mm; } .negra p { font-weight: 300; font-size: 10.5pt; color: #A9A9AE; line-height: 1.6; margin-top: 4mm; }
.negra .qrbox { display: block; background: #fff; padding: 4mm; border-radius: 2.5mm; margin-top: 10mm; } .negra .qrbox svg { width: 44mm; height: 44mm; display: block; } .negra .tel { font-weight: 300; font-size: 22pt; color: var(--cian); margin-top: 7mm; letter-spacing: .04em; }
.negra .ico { width: 22mm; height: 22mm; }
.negra .letra { position: absolute; bottom: 14mm; left: 0; right: 0; font-size: 6.8pt; letter-spacing: .14em; color: #6E6E73; }
@media screen { body { background: #8a8a8e; } .hoja { margin: 0 auto 6mm; box-shadow: 0 2mm 8mm rgba(0,0,0,.25); } }
@media print { body { background: #fff; } }`;

// → { html, hojas, piezas, fuera, mes, plan }. o = {
//   productos, fotos: { id → foto para su tarjeta (data:… o url) }, grandes: { id → la misma, más grande, para las fotos a toda página },
//   tamanos: { id → [ancho, alto] px }, mes: { id, fotos: [url…] } (la pieza del mes y sus fotos; si falta, se elige sola), ventas: { id → unidades },
//   tel (WhatsApp), logo, icono, fuentes: { 200…600: url (Inter), serif: url (Instrument Serif cursiva) }, marca: { frase, texto, lema }, fecha, nombre }
export function armaCatalogo(o) {
  const T = telefono(o.tel); if (!T) throw new Error('Falta el número de WhatsApp: ponlo en Tienda → Datos de la tienda.');
  const fotos = o.fotos || {}, grandes = o.grandes || {}, fecha = o.fecha || new Date(), marca = esc(o.nombre || 'CelebriDiseños'), M = Object.assign({}, MARCA, o.marca || {}), ventas = o.ventas || {};
  const { secciones, fuera } = elige(o.productos, fotos);
  const piezas = secciones.reduce((a, L) => a + L.length, 0); if (!piezas) throw new Error('No hay ninguna pieza con foto y precio para el catálogo.');
  const todas = secciones.flat(), porId = Object.fromEntries(todas.map(p => [p.id, p]));
  const mesId = o.mes && porId[o.mes.id] ? o.mes.id : piezaDelMes(todas, ventas), mesP = porId[mesId];
  const plan = planFotos(secciones, o.tamanos || {}, mesId, ventas), mesFotos = [fotos[mesId]].concat((o.mes && o.mes.id === mesId && o.mes.fotos) || []).filter(Boolean).slice(0, 3);
  const wa = txt => 'https://wa.me/' + T.num + '?text=' + encodeURIComponent(txt), WA = 'https://wa.me/' + T.num;
  const img = (id, grande, extra = '') => { const e = conocida(porId[id]) && ENCUADRE[id], st = e ? ` style="object-position:${e[0]}% ${e[1]}%;transform:scale(${e[2]});transform-origin:${e[0]}% ${e[1]}%"` : ''; return `<img src="${esc(grande && grandes[id] || fotos[id])}" alt=""${st}${extra}>`; };
  const pedir = (p, n) => esc(wa('Hola, me interesa la Ref. ' + p.id + ' (' + n + '). ¿Está disponible?'));
  const tarjeta = p => { const { nombre: n, texto: d } = textoDe(p), m = medidas(p);
    // tocar la tarjeta (PDF en el móvil) abre WhatsApp con el nombre; el QR (papel) lleva un texto corto para que sea más grande y se lea mejor
    return `<a class="prod" href="${pedir(p, n)}"><div class="foto">${img(p.id)}</div><div class="txt"><div class="ref">Ref. ${esc(p.id)}</div><h3>${esc(n)}</h3><p>${esc(d)}</p>
    <div class="datos">${coloresHtml(colores(p))}${m ? '<span class="med">' + m + '</span>' : ''}</div>
    <div class="pie"><span class="precio">${precioTxt(precioDe(p))}</span><span class="pide"><span>Pídelo<br>por WhatsApp</span>${qrSvgL(wa('Hola, quiero la Ref. ' + p.id), 'qr')}</span></div></div></a>`; };
  const tarjetaP = (dib, n, d, ej, msj, corto) => `<a class="prod pers" href="${esc(wa(msj))}"><div class="foto dib">${dib}</div><div class="txt"><div class="ref">Personalizado</div><h3>${n}</h3><p>${d}</p>
    <div class="ejemplo">«${ej}»</div>
    <div class="pie"><span class="precio pre">Presupuesto<br>al momento</span><span class="pide"><span>Pídelo<br>por WhatsApp</span>${qrSvgL(wa(corto), 'qr')}</span></div></div></a>`;
  const PERS = tarjetaP(DIB_LLAVERO, 'Llaveros con tu nombre', 'Con un nombre, unas iniciales, una fecha o un dibujo sencillo, en el color que quieras. Para regalar, para eventos o para tu negocio.', 'Quiero un llavero con el nombre Lucía en turquesa', 'Hola, quiero un llavero personalizado. ¿Me das precio?', 'Hola, quiero un llavero')
    + tarjetaP(DIB_STL, '¿Tienes tu propio diseño?', 'Si tienes el archivo STL de la pieza que quieres, mándamelo por WhatsApp: lo miro y te digo el precio al momento.', 'Tengo este archivo STL, ¿cuánto me costaría?', 'Hola, tengo un archivo STL y quiero presupuesto', 'Hola, tengo un STL');
  const COMO = '<div class="como">Para pedir: <b>toca la pieza</b> o escanea su código y escríbeme por WhatsApp · Te confirmo si está disponible y te paso el enlace de compra</div>';
  const pieN = (n, como) => `<footer class="pie-hoja">${como ? COMO : ''}<span class="num">${String(n).padStart(2, '0')}</span></footer>`;
  const cab = (t, n) => `<header class="cab"><img src="${esc(o.icono || '')}" alt=""><span>${marca}</span><b>${t}</b></header>${pieN(n, true)}`;
  const leyenda = id => { const p = porId[id]; return p ? `<div class="leyenda">En la foto: <b>${esc(textoDe(p).nombre)}</b> · Ref. ${esc(id)} · ${precioTxt(precioDe(p))}</div>` : ''; };
  const desde = L => precioTxt(Math.min(...L.map(precioDe)));

  // ---------- las hojas, en orden (cada una sabe montarse con su número) ----------
  const H = [], indice = [];
  const pon = (fn, entrada) => { H.push(fn); if (entrada) indice.push([entrada, H.length]); };
  pon(() => `<section class="hoja negra"><img class="logo" src="${esc(o.logo || '')}" alt="${marca}"><div class="t1">Catálogo</div><div class="t2">${temporada(fecha)}</div><div class="lema se">${esc(M.lema)}</div><div class="raya"></div><a class="wa" href="${WA}">Pídelo por WhatsApp &nbsp;·&nbsp; <b>${T.ver}</b></a></section>`);
  const bienv = plan.bienvenida;
  pon(n => `<section class="hoja sangre bv">${bienv ? `<a class="foto-g" href="${pedir(porId[bienv], textoDe(porId[bienv]).nombre)}" style="display:block">${img(bienv, true)}${leyenda(bienv)}</a>` : ''}
  <div class="bv-cuerpo"><div><div class="kicker">Bienvenida</div><h1 class="se">${esc(M.frase)}</h1><p>${esc(M.texto)}</p><div class="firma">${marca}</div></div>
  <div><div class="kicker">En este catálogo</div><ol class="indice">@@INDICE@@</ol></div></div>
  <div class="valores"><div><b class="se">Hecha para ti</b>En el color que elijas y, si quieres, con su nombre.</div><div><b class="se">Revisada a mano</b>Cada pieza se revisa antes de enviarla.</div><div><b class="se">Trato cercano</b>Me escribes por WhatsApp y te atiendo de tú a tú.</div></div>${pieN(n)}</section>`);
  if (mesP) { const { nombre: n, texto: d } = textoDe(mesP), hi = conocida(mesP) && HISTORIAS[mesId], m = medidas(mesP), C = colores(mesP), nf = mesFotos.length;
    // «Combínala con»: las dos siguientes de su misma sección (que no sean las fotos grandes)
    const L = secciones[seccionDe(mesP)], k0 = L.findIndex(p => p.id === mesId), grandesYa = [plan.bienvenida].concat(plan.aperturas);
    const combina = L.slice(k0 + 1).concat(L.slice(0, k0)).filter(p => !grandesYa.includes(p.id)).slice(0, 2);
    pon(num => `<section class="hoja sangre mes"><div class="mos n${nf}">${mesFotos.map((u, i) => `<div class="m${i + 1}">${i === 0 ? img(mesId, true) : `<img src="${esc(u)}" alt="">`}</div>`).join('')}<div class="sello">La pieza del mes · <b>${may(MESES[fecha.getMonth()])}</b></div></div>
  <div class="mes-cuerpo"><div><div class="ref">Ref. ${esc(mesId)}</div><div class="se k">La pieza del mes</div><h2>${esc(n)}</h2><p class="hist">${esc(hi ? hi[0] : d)}</p>${hi ? '<ul class="claves">' + hi[1].map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' : ''}</div>
  <div><dl class="ficha">${C === 'varios' || C.length ? '<div><dt>Colores</dt><dd>' + coloresHtml(C) + '</dd></div>' : ''}${m ? '<div><dt>Medidas</dt><dd>' + m + '</dd></div>' : ''}<div><dt>Referencia</dt><dd>${esc(mesId)}</dd></div><div class="pz"><dt>Precio</dt><dd>${precioTxt(precioDe(mesP))}</dd></div></dl>
  <a class="cta" href="${pedir(mesP, n)}">${qrSvgL(wa('Hola, quiero la Ref. ' + mesId), 'qrm')}<div><b>Pídela por WhatsApp</b><span>Escanea el código o, en el móvil, toca aquí.</span></div></a>
  ${combina.length ? '<div class="combina"><div class="kicker">Combínala con</div>' + combina.map(q => { const t = textoDe(q); return `<a href="${pedir(q, t.nombre)}"><div class="t">${img(q.id)}</div><span>${esc(t.nombre)}</span><b>${precioTxt(precioDe(q))}</b></a>`; }).join('') + '</div>' : ''}</div></div>${pieN(num)}</section>`, 'La pieza del mes'); }
  pon(n => `<section class="hoja">${cab('Cómo pedir', n)}
  <div class="h1">Pedir es <span class="se">muy fácil</span></div><p class="lead">Me escribes, te confirmo si está disponible y te paso el enlace para comprarlo con total seguridad.</p>
  <div class="pasos">
    <div class="paso"><div class="n">01</div><div><h3>Elige tu pieza</h3><p>Apunta la <b>referencia</b> que aparece encima de cada nombre (por ejemplo, <b>Ref. ${esc(todas[0].id)}</b>) y el color que te guste.</p></div></div>
    <div class="paso"><div class="n">02</div><div><h3>Escríbeme por WhatsApp</h3><p>¿Lo estás viendo en el móvil? <b>Toca la pieza</b> y se abrirá WhatsApp con el mensaje ya escrito. ¿En papel? Escanea su código con la cámara del móvil. O escríbeme al <b style="white-space: nowrap">${T.ver}</b>:</p><div class="burbuja">Hola, quiero la Ref. ${esc(todas[0].id)}</div><p>Te contesto con la disponibilidad, los colores y cuándo lo tienes.</p></div></div>
    <div class="paso"><div class="n">03</div><div><h3>Te paso el enlace y listo</h3><p>Te envío el enlace del producto en <b>Vinted</b> o <b>Wallapop</b> y lo compras allí, con su pago seguro y su envío a casa. Si lo prefieres, te paso también mi perfil para que veas todo lo que tengo.</p></div></div>
  </div>
  <a class="contacto" href="${esc(wa('Hola, he visto vuestro catálogo y quiero preguntar por una pieza'))}">${qrSvgL(wa('Hola, he visto vuestro catálogo y quiero preguntar por una pieza'), 'qrg')}<div><div class="et">WhatsApp</div><div class="tel">${T.ver}</div><p>¿Dudas o algo especial? Escanea el código (o tócalo en el móvil) y hablamos. Te ayudo a elegir y te enseño más colores.</p></div></a>
  <div class="notas"><div><b>En tu color</b>Muchas piezas vienen en varios colores: dime cuál quieres al pedirla.</div><div><b>Para regalar</b>¿Es un regalo? Avísame y te lo preparo para que llegue perfecto.</div><div><b>Precios</b>Por pieza. El envío lo calcula Vinted o Wallapop al comprar.</div></div></section>`, 'Cómo pedir');
  const PT = 'Personalizados', PD = '¿Buscas algo único? Te lo preparo a tu gusto.', conPiezas = secciones.map((L, i) => L.length ? i : -1).filter(i => i >= 0), ult = conPiezas[conPiezas.length - 1];
  const regalos = () => { const R = plan.regalos.map(id => porId[id]);
    pon(n => `<section class="hoja">${cab('Ideas para regalar', n)}<div class="rg-tit"><div><h2 class="se">Ideas para regalar</h2><p>Detalles bonitos para cumpleaños, amigos invisibles, aniversarios… o porque sí.</p></div><div class="rg-tope">Por menos de<b>${plan.tope} €</b></div></div>
  <div class="rg-rejilla">${R.map(p => { const t = textoDe(p); return `<a class="rg" href="${pedir(p, t.nombre)}"><div class="f">${img(p.id)}</div><div class="n">${esc(t.nombre)}</div><div class="p">${precioTxt(precioDe(p))}<span>REF. ${esc(p.id)}</span></div></a>`; }).join('')}</div>
  <div class="rg-banda"><div class="se">¿Es un regalo?</div><p>Dímelo al pedir y te lo preparo para que llegue perfecto. Y si quieres algo con su nombre, mira los personalizados al final.</p></div></section>`, 'Ideas para regalar'); };
  secciones.forEach((L, si) => { if (!L.length) return; const S = SECCIONES[si], ap = plan.aperturas[si], k = conPiezas.indexOf(si) + 1;
    pon(n => `<section class="hoja sangre ap">${ap ? `<a class="foto-g" href="${pedir(porId[ap], textoDe(porId[ap]).nombre)}" style="display:block">${img(ap, true)}${leyenda(ap)}</a>` : ''}
  <div class="ap-cuerpo"><div><div class="ap-num">${String(k).padStart(2, '0')}</div><h2 class="se">${S.t}</h2><div class="fr se">${esc(S.frase)}</div><p>${S.d}</p></div><div class="ap-meta"><b>${L.length}</b>${L.length === 1 ? 'pieza' : 'piezas'}<br>desde ${desde(L)}</div></div>${pieN(n)}</section>`, S.t);
    for (let i = 0; i < L.length; i += 4) { const trozo = L.slice(i, i + 4), ultima = si === ult && i + 4 >= L.length, conPers = ultima && trozo.length <= 2;
      // la última hoja: si sobran 1 o 2 piezas, debajo van los personalizados (sin hojas medio vacías)
      pon(n => `<section class="hoja">${cab(conPers ? S.t + ' · ' + PT : S.t, n)}<div class="titsec vacio"></div><div class="rejilla">${trozo.map(tarjeta).join('')}</div>${conPers ? `<div class="titsec dentro"><h2 class="se">${PT}</h2><p>${PD}</p></div><div class="rejilla">${PERS}</div>` : ''}</section>`, conPers ? PT : null);
      if (ultima && !conPers) pon(n => `<section class="hoja">${cab(PT, n)}<div class="titsec"><h2 class="se">${PT}</h2><p>${PD}</p></div><div class="rejilla">${PERS}</div></section>`, PT); }
    // la guía de regalos, entre la primera sección y la siguiente (o al final si solo hay una)
    if (plan.regalos.length && (si === conPiezas[0] && conPiezas.length > 1 || conPiezas.length === 1)) regalos(); });
  pon(() => `<section class="hoja negra"><img class="ico" src="${esc(o.icono || '')}" alt=""><h2 class="se">¿Te ha gustado alguna?</h2><p>Escanea el código o escríbeme por WhatsApp<br>y te la preparo.</p><a class="qrbox" href="${esc(wa('Hola, he visto vuestro catálogo y me interesa una pieza'))}">${qrSvgL(wa('Hola, he visto vuestro catálogo y me interesa una pieza'), 'qrf')}</a><a class="tel" href="${WA}">${T.ver}</a><div class="letra">${marca} · Catálogo ${temporada(fecha).replace(' · ', ' ').toLowerCase()} · Precios por pieza, según disponibilidad</div></section>`);
  const IND = indice.map(([t, n]) => `<li><span>${t}</span><b>${String(n).padStart(2, '0')}</b></li>`).join('');
  const ff = Object.keys(o.fuentes || {}).map(w => w === 'serif' ? `@font-face { font-family: Se; src: url('${o.fuentes[w]}') format('woff2'); font-style: italic; font-weight: 400; font-display: block; }`
    : `@font-face { font-family: In; src: url('${o.fuentes[w]}') format('woff2'); font-weight: ${w}; font-display: block; }`).join('\n');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${marca} · Catálogo ${temporada(fecha).replace(' · ', ' ').toLowerCase()}</title><meta name="author" content="${marca}"><style>${ff}${CSS}</style></head><body>
${H.map((fn, i) => fn(i + 1)).join('\n').replace('@@INDICE@@', IND)}
</body></html>`;
  return { html, hojas: H.length, piezas, fuera, mes: mesId, plan };
}
