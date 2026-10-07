// ================= v16.2 · REELS: BIBLIOTECA DE PLANTILLAS =================
// Antes todos los Reels salían iguales (logo → gancho → fotos → precio → llamada). Ahora cada plantilla tiene SU estructura,
// su ritmo, sus colores, sus ganchos y sus llamadas a la acción, y de un mismo producto salen varias propuestas distintas.
//  · Nada se copia de nadie ni se lee de internet: son estructuras de vídeo corto que funcionan, escritas aquí.
//  · Nada se inventa del producto: nombre, precio, material, color y medidas salen de SU ficha. Lo que solo sabes tú
//    (la opinión de un cliente, el «antes») se deja como texto para que lo escribas, marcado con ✏️.
//  · Funciona con el mismo motor de vídeo del PC: los colores viajan en «colores» (ya los entendía) y el resto son escenas.
import { nuevaEscena, guionPlantilla, eur, usuarioRed } from './modelo.js';

const N = s => String(s || '').trim();
// {N} nombre · {n} nombre en minúscula · {M} material · {C} color · {P} precio · {D} medidas
const rellena = (t, d) => String(t).replace(/\{N\}/g, d.N).replace(/\{n\}/g, d.n).replace(/\{M\}/g, d.M).replace(/\{C\}/g, d.C).replace(/\{P\}/g, d.P).replace(/\{D\}/g, d.D).replace(/\s+([.!?,])/g, '$1').replace(/\s{2,}/g, ' ').trim();
const azar = seed => { let a = (seed >>> 0) || 1; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const elige = (l, r) => l[Math.floor(r() * l.length) % l.length];

// ---------- Estructuras: el «esqueleto» de escenas de cada tipo de vídeo ----------
// f(i) = la foto i (o la última que haya) · g = gancho · t = textos de la plantilla · d = datos del producto · k = ritmo (1 = normal)
const E = {
  hero: ({ f, g, t, d, k, precio }) => [['logo'], ['gancho', { texto: g, foto: f(0) }], ['producto', { foto: f(0), titulo: d.N, texto: t[0], mov: 'zoom', dur: 3.2 * k }], f(1) ? ['producto', { foto: f(1), mov: 'panor', dur: 2.4 * k }] : null, f(2) ? ['producto', { foto: f(2), mov: 'alejar', dur: 2.4 * k }] : null, t[1] ? ['texto', { texto: t[1] }] : null, precio, ['cta']],
  rapido: ({ f, g, d, k, precio }) => [['gancho', { texto: g, foto: f(0), dur: 1.2 * k }], ['producto', { foto: f(0), titulo: d.N, mov: 'zoom', dur: 1.3 * k }], f(1) ? ['producto', { foto: f(1), mov: 'alejar', dur: 1.1 * k }] : null, f(2) ? ['producto', { foto: f(2), mov: 'panor', dur: 1.1 * k }] : null, precio, ['cta', { dur: 1.8 * k }]],
  problema: ({ f, g, t, d, k, precio }) => [['gancho', { texto: g }], ['texto', { texto: t[0], dur: 2 * k }], ['producto', { foto: f(0), titulo: d.N, texto: t[1], mov: 'zoom', dur: 3 * k }], f(1) ? ['producto', { foto: f(1), mov: 'panor', dur: 2 * k }] : null, t[2] ? ['texto', { texto: t[2] }] : null, precio, ['cta']],
  proceso: ({ f, g, t, d, k }) => [['logo'], ['gancho', { texto: g }], ['texto', { texto: t[0], dur: 1.6 * k }], ['producto', { foto: f(0), mov: 'panor', dur: 2.2 * k }], ['texto', { texto: t[1], dur: 1.6 * k }], f(1) ? ['producto', { foto: f(1), mov: 'zoom', dur: 2.2 * k }] : null, ['texto', { texto: t[2], dur: 1.6 * k }], ['producto', { foto: f(2) || f(0), titulo: d.N, mov: 'alejar', dur: 2.8 * k }], ['cta']],
  antes: ({ f, g, t, d, k, precio }) => [['gancho', { texto: g }], ['texto', { texto: t[0], dur: 1.4 * k }], ['producto', { foto: f(0), mov: 'quieto', dur: 2.2 * k }], ['texto', { texto: t[1], dur: 1.4 * k }], ['producto', { foto: f(1) || f(0), titulo: d.N, mov: 'zoom', dur: 3 * k }], precio, ['cta']],
  oferta: ({ f, g, t, d, k, precio }) => [['gancho', { texto: g, foto: f(0), dur: 1.6 * k }], ['producto', { foto: f(0), titulo: d.N, texto: t[0], mov: 'zoom', dur: 2.4 * k }], precio, t[1] ? ['texto', { texto: t[1], dur: 1.8 * k }] : null, f(1) ? ['producto', { foto: f(1), mov: 'alejar', dur: 1.6 * k }] : null, ['cta']],
  emocion: ({ f, g, t, d, k }) => [['gancho', { texto: g, foto: f(0), dur: 2.6 * k }], ['producto', { foto: f(0), mov: 'alejar', dur: 3.4 * k }], ['texto', { texto: t[0], dur: 2.6 * k }], f(1) ? ['producto', { foto: f(1), mov: 'panor', dur: 3.2 * k }] : null, ['texto', { texto: '*' + d.N + '*', dur: 2 * k }], ['cta']],
  lista: ({ f, g, t, d, k, precio }) => [['gancho', { texto: g }], ['producto', { foto: f(0), titulo: d.N, mov: 'zoom', dur: 2.2 * k }], ['texto', { texto: '1 · ' + t[0], dur: 1.7 * k }], ['texto', { texto: '2 · ' + t[1], dur: 1.7 * k }], ['texto', { texto: '3 · ' + t[2], dur: 1.7 * k }], f(1) ? ['producto', { foto: f(1), mov: 'panor', dur: 2 * k }] : null, precio, ['cta']],
  aviso: ({ f, g, t, d, k }) => [['gancho', { texto: g, foto: f(0), dur: 2 * k }], ['producto', { foto: f(0), titulo: d.N, texto: t[0], mov: 'quieto', dur: 2.8 * k }], ['texto', { texto: t[1], dur: 2.2 * k }], ['cta']],
  opinion: ({ f, g, t, d, k, precio }) => [['gancho', { texto: g }], ['texto', { texto: t[0], dur: 3.4 * k }], ['producto', { foto: f(0), titulo: d.N, texto: t[1], mov: 'zoom', dur: 3 * k }], precio, ['cta']],
  cine: ({ f, g, t, d, k }) => [['producto', { foto: f(0), mov: 'alejar', dur: 3.6 * k }], ['gancho', { texto: g, dur: 2.4 * k }], f(1) ? ['producto', { foto: f(1), mov: 'panor', dur: 3.4 * k }] : null, ['texto', { texto: t[0], dur: 2.4 * k }], ['producto', { foto: f(2) || f(0), titulo: d.N, mov: 'zoom', dur: 3.4 * k }], ['logo'], ['cta']]
};

// ---------- Las plantillas ----------
// g = grupo · e = estructura · s = estilo del motor (minimal | premium | oferta) · col = colores · k = ritmo · precio: true/false
// gan = ganchos · tx = juegos de textos (cada juego, lo que pide la estructura) · cta · pt = texto junto al precio · pie = arranque del texto para publicar
export const GRUPOS = { producto: '🛍️ Enseñar el producto', historia: '🎞️ Contar algo', oferta: '🔥 Ofertas y campañas', estado: '📣 Avisos', estilo: '🎨 Con estilo' };
export const PLANTILLAS = [
  { k: 'premium', n: 'Producto premium', i: '💎', g: 'producto', e: 'hero', s: 'premium', k2: 1.1, precio: true, gan: ['Diseñado para *destacar*', 'El detalle que *marca* la diferencia', 'Una pieza con *carácter*', 'Para quien cuida los *detalles*'], tx: [['Acabado cuidado, pieza a pieza', 'Hecho por *encargo*'], ['{M} de calidad, acabado limpio', 'Pocas unidades, mucho *mimo*']], cta: ['Descúbrelo', 'Pídelo por mensaje', 'Hazlo tuyo'], pie: 'Hay piezas que se notan.' },
  { k: 'rapido', n: 'Producto rápido', i: '⚡', g: 'producto', e: 'rapido', s: 'minimal', k2: 1, precio: true, gan: ['Mira *esto*', '*{N}* en 8 segundos', 'Lo ves, *lo quieres*', '¿Lo conocías?'], tx: [[]], cta: ['Escríbeme', 'Pídelo ya', 'Link en la bio'], pie: 'Rápido y al grano:' },
  { k: 'nuevo', n: 'Nuevo producto', i: '🆕', g: 'producto', e: 'hero', s: 'minimal', col: { acento: '#0ea5e9', fondo: '#f0f9ff', texto: '#0c4a6e' }, k2: 1, precio: true, gan: ['*NUEVO* en el taller', 'Recién salido de la *impresora*', 'Estrenamos *{n}*', 'Novedad: *{N}*'], tx: [['Acaba de llegar', 'Primeras unidades *disponibles*'], ['Lo estabais pidiendo', 'Ya se puede *encargar*']], cta: ['Sé de los primeros', 'Pídelo por mensaje', 'Resérvalo'], pie: 'Novedad en el taller 🆕' },
  { k: 'lanzamiento', n: 'Lanzamiento', i: '🚀', g: 'producto', e: 'cine', s: 'premium', col: { acento: '#a78bfa', fondo: '#0b0720', texto: '#f5f3ff' }, k2: 1, precio: false, gan: ['Llevamos tiempo *preparándolo*', 'Hoy por fin lo *enseñamos*', 'Presentamos *{N}*'], tx: [['Ya disponible'], ['Disponible *desde hoy*']], cta: ['Descúbrelo hoy', 'Pídelo el primero'], pie: 'Hoy presentamos algo nuevo 🚀' },
  { k: 'detalles', n: 'Tres razones', i: '✅', g: 'producto', e: 'lista', s: 'minimal', k2: 1, precio: true, gan: ['3 razones para tener *{n}*', 'Por qué *{n}* gusta tanto', 'Lo que nadie te cuenta de *{n}*'], tx: [['Se hace por encargo, a tu gusto', 'Ligero y resistente', 'Llega bien protegido'], ['Lo eliges en tu color', 'Acabado limpio, revisado a mano', 'Un regalo que no se repite']], cta: ['¿Te lo preparo?', 'Pídelo por mensaje'], pie: 'Tres razones:' },
  { k: 'comparativa', n: 'Comparativa', i: '⚖️', g: 'producto', e: 'problema', s: 'minimal', col: { acento: '#16a34a', fondo: '#f7fee7', texto: '#14532d' }, k2: 1, precio: true, gan: ['Lo de siempre *vs* hecho para ti', 'De serie *o* a tu gusto', '¿Uno cualquiera o *el tuyo*?'], tx: [['✗ Igual que el de todo el mundo', '✓ En tu color y a tu medida', '✓ Hecho por encargo'], ['✗ De fábrica, sin alma', '✓ Hecho en un taller pequeño', '✓ Revisado uno a uno']], cta: ['Elige el tuyo', 'Pídelo a tu gusto'], pie: 'No es lo mismo.' },
  { k: 'proceso', n: 'Proceso de fabricación', i: '🛠️', g: 'historia', e: 'proceso', s: 'minimal', k2: 1, precio: false, gan: ['Así se hace *{n}*', 'De un archivo a *tus manos*', 'Del diseño a la *pieza*'], tx: [['1 · Se diseña', '2 · Se imprime capa a capa', '3 · Se remata a mano'], ['Primero, el diseño', 'Después, horas de impresión', 'Y al final, el acabado']], cta: ['¿Te hago uno?', 'Pídelo por mensaje'], pie: 'Cómo se hace, paso a paso 🛠️' },
  { k: 'detras', n: 'Detrás de las cámaras', i: '🎬', g: 'historia', e: 'emocion', s: 'minimal', col: { acento: '#b45309', fondo: '#fffbeb', texto: '#451a03' }, k2: 1, precio: false, gan: ['Un día en el *taller*', 'Lo que no se ve de *{n}*', 'Así empieza cada *pedido*'], tx: [['Cada pieza pasa por nuestras manos'], ['Detrás de cada pedido hay horas de trabajo']], cta: ['Gracias por apoyar', 'Síguenos para ver más'], pie: 'Un trocito del taller 🎬' },
  { k: 'antesdespues', n: 'Antes / después', i: '🔄', g: 'historia', e: 'antes', s: 'minimal', k2: 1, precio: true, gan: ['Antes *y* después', 'De *esto*… a *esto*', 'El cambio se *nota*'], tx: [['ANTES', 'DESPUÉS'], ['RECIÉN IMPRESO', 'TERMINADO']], cta: ['¿Te gusta el resultado?', 'Pídelo por mensaje'], pie: 'El antes y el después 🔄', nota: 'Pon de primera foto el «antes» y de segunda el «después».' },
  { k: 'problema', n: 'Problema → solución', i: '💡', g: 'historia', e: 'problema', s: 'minimal', col: { acento: '#7c3aed', fondo: '#faf5ff', texto: '#3b0764' }, k2: 1, precio: true, gan: ['¿Te pasa *esto*?', '¿Cansado de buscar el *regalo* perfecto?', 'Se acabó el *desorden*'], tx: [['✏️ Escribe aquí el problema que resuelve', 'La solución: *{n}*', 'Y a tu gusto'], ['Nunca sabes qué regalar', 'Algo hecho *solo para esa persona*', 'Por encargo']], cta: ['Soluciónalo hoy', 'Pídelo por mensaje'], pie: 'Problema resuelto 💡' },
  { k: 'emocional', n: 'Vídeo emocional', i: '💜', g: 'historia', e: 'emocion', s: 'premium', col: { acento: '#f0abfc', fondo: '#1a0b1f', texto: '#fdf4ff' }, k2: 1.15, precio: false, gan: ['Hay regalos que se *recuerdan*', 'Para alguien *especial*', 'No es un objeto, es un *detalle*'], tx: [['Hecho pensando en quien lo recibe'], ['Lo pequeño también dice *te quiero*']], cta: ['Regálalo', 'Escríbeme y lo preparamos'], pie: 'Para alguien especial 💜' },
  { k: 'testimonio', n: 'Opinión de un cliente', i: '⭐', g: 'historia', e: 'opinion', s: 'minimal', col: { acento: '#ca8a04', fondo: '#fefce8', texto: '#422006' }, k2: 1, precio: true, gan: ['Lo que dicen de *{n}*', 'Opinión *real*', 'Nos lo ha escrito un *cliente*'], tx: [['✏️ «Escribe aquí la opinión REAL de tu cliente»', 'Gracias por confiar']], cta: ['¿Quieres el tuyo?', 'Pídelo por mensaje'], pie: 'Gracias por estas palabras ⭐', nota: 'Escribe la opinión tal cual te la dieron: el programa no inventa opiniones.' },
  { k: 'educativo', n: 'Educativo', i: '🎓', g: 'historia', e: 'lista', s: 'minimal', col: { acento: '#0891b2', fondo: '#ecfeff', texto: '#083344' }, k2: 1, precio: false, gan: ['¿Sabías *esto* de la impresión 3D?', '3 cosas sobre *{n}*', 'Lo que conviene *saber*'], tx: [['Se fabrica capa a capa', 'Cada pieza tarda horas', 'Por eso se hace por encargo'], ['Está hecho en {M}', 'Se puede hacer en varios colores', 'Se limpia con un paño húmedo']], cta: ['Síguenos para más', 'Pregúntame lo que quieras'], pie: 'Aprende algo en 15 segundos 🎓' },
  { k: 'oferta', n: 'Oferta', i: '🏷️', g: 'oferta', e: 'oferta', s: 'oferta', k2: 1, precio: true, pt: '¡Ahora!', gan: ['¡*Oferta* que vuela!', '¡Precio *especial*!', '¡Esta semana, *{n}*!'], tx: [['¡Aprovecha!', 'Hasta fin de existencias'], ['Solo estos días', '¡No lo dejes pasar!']], cta: ['¡Pídelo ya!', '¡Escríbeme!'], pie: '¡Oferta! 🏷️' },
  { k: 'limitada', n: 'Oferta limitada', i: '⏳', g: 'oferta', e: 'oferta', s: 'oferta', col: { acento: '#fde047', fondo: '#b91c1c', texto: '#ffffff' }, k2: 0.9, precio: true, pt: '¡Solo hoy!', gan: ['¡*Últimas* unidades!', '¡Se *acaba*!', '¡Solo por *tiempo limitado*!'], tx: [['Quedan muy pocas', 'Cuando se acaben, se acaban'], ['Últimas horas', 'No se repite']], cta: ['¡Corre!', '¡Pídelo antes de que vuele!'], pie: '⏳ Tiempo limitado' },
  { k: 'blackfriday', n: 'Black Friday', i: '🖤', g: 'oferta', e: 'oferta', s: 'oferta', col: { acento: '#facc15', fondo: '#0a0a0a', texto: '#ffffff' }, k2: 0.95, precio: true, pt: 'BLACK FRIDAY', gan: ['*BLACK FRIDAY* en el taller', 'El *viernes* más esperado', '*BLACK* · {N}'], tx: [['Solo estos días', 'Hasta agotar existencias'], ['Precios de Black Friday', 'Unidades limitadas']], cta: ['¡Aprovecha!', '¡Pídelo ya!'], pie: '🖤 BLACK FRIDAY' },
  { k: 'happyhour', n: 'Happy Hour', i: '🍹', g: 'oferta', e: 'oferta', s: 'oferta', col: { acento: '#fff7ed', fondo: '#ea580c', texto: '#ffffff' }, k2: 0.85, precio: true, pt: 'HAPPY HOUR', gan: ['*HAPPY HOUR*: solo un rato', '¡Durante *unas horas*!', '¡Ahora o *nunca*!'], tx: [['Solo durante unas horas', '¡Date prisa!'], ['Empieza ya', 'Termina hoy']], cta: ['¡Escríbeme ya!', '¡Antes de que acabe!'], pie: '🍹 HAPPY HOUR' },
  { k: 'navidad', n: 'Navidad y regalos', i: '🎄', g: 'oferta', e: 'hero', s: 'premium', col: { acento: '#fbbf24', fondo: '#0f2f1d', texto: '#fefce8' }, k2: 1.05, precio: true, gan: ['El *regalo* que no se espera', 'Esta *Navidad*, algo hecho a mano', 'Regala *{n}*'], tx: [['Un detalle con historia', 'Pídelo con *tiempo*'], ['Hecho por encargo', 'Llega *a tiempo* si lo pides ya']], cta: ['Encárgalo ya', 'Regálalo'], pie: '🎄 Ideas para regalar' },
  { k: 'agotado', n: 'Producto agotado', i: '🔴', g: 'estado', e: 'aviso', s: 'minimal', col: { acento: '#dc2626', fondo: '#fef2f2', texto: '#450a0a' }, k2: 1, precio: false, gan: ['¡*AGOTADO*!', 'Os lo habéis *llevado todo*', '*{N}*: no queda ni uno'], tx: [['Gracias de corazón', 'Volvemos a hacer más *muy pronto*'], ['Se han acabado', 'Escríbeme y te *aviso* cuando vuelva']], cta: ['Avísame cuando vuelva', 'Apúntate a la lista'], pie: '🔴 ¡Agotado! Gracias 💜' },
  { k: 'restock', n: 'Vuelve a haber', i: '🟢', g: 'estado', e: 'aviso', s: 'minimal', col: { acento: '#16a34a', fondo: '#f0fdf4', texto: '#052e16' }, k2: 1, precio: false, gan: ['¡*Ha vuelto*!', 'Otra vez *disponible*', '*{N}* está de vuelta'], tx: [['Lo pedíais, y aquí está', 'Esta vez no te quedes *sin él*'], ['Nuevas unidades', '¡Vuelan rápido!']], cta: ['Pídelo ya', '¡Que no se te escape!'], pie: '🟢 ¡Vuelve a haber!' },
  { k: 'minimalista', n: 'Minimalista', i: '◻️', g: 'estilo', e: 'rapido', s: 'minimal', col: { acento: '#111827', fondo: '#ffffff', texto: '#111827' }, k2: 1.5, precio: true, gan: ['*{N}*', 'Menos es *más*', 'Sin *adornos*'], tx: [[]], cta: ['Disponible', 'Pídelo'], pie: '{N}.' },
  { k: 'cinematico', n: 'Cinemático', i: '🎥', g: 'estilo', e: 'cine', s: 'premium', k2: 1.1, precio: false, gan: ['Hay cosas que se hacen *despacio*', 'El tiempo también es un *material*', 'Cada capa *cuenta*'], tx: [['Hecho sin prisa'], ['Pieza a pieza']], cta: ['Descúbrelo', 'Pídelo por mensaje'], pie: 'Despacio y bien 🎥' },
  { k: 'dinamico', n: 'Dinámico', i: '💥', g: 'estilo', e: 'rapido', s: 'oferta', col: { acento: '#22d3ee', fondo: '#1e1b4b', texto: '#ffffff' }, k2: 0.8, precio: true, gan: ['¡*BOOM*!', '¡Mira, mira, *mira*!', '¡*{N}*!'], tx: [[]], cta: ['¡Lo quiero!', '¡Pídelo!'], pie: '💥' },
  { k: 'humor', n: 'Con humor', i: '😂', g: 'estilo', e: 'problema', s: 'oferta', col: { acento: '#fde047', fondo: '#0f766e', texto: '#ffffff' }, k2: 0.95, precio: true, gan: ['Yo: no necesito nada. *También yo:*', 'Mi cartera viendo *{n}* 👀', 'Nadie: … Yo: *lo necesito*'], tx: [['«Solo voy a mirar»', '*{N}* en el carrito', 'Sin remordimientos'], ['Dije que no compraba más', 'Pero es que *míralo*', 'Capricho justificado']], cta: ['Capricho autorizado', 'Venga, pídelo'], pie: 'Nos ha pasado a todos 😂' },
  { k: 'viral', n: 'Formato viral', i: '📈', g: 'estilo', e: 'rapido', s: 'minimal', col: { acento: '#e11d48', fondo: '#fff1f2', texto: '#4c0519' }, k2: 0.9, precio: true, gan: ['Espera al *final*', 'No sabía que *necesitaba* esto', 'POV: encuentras *{n}*', 'Guarda este vídeo'], tx: [[]], cta: ['Compártelo con quien lo necesita', 'Guárdalo y pídelo luego'], pie: 'Etiqueta a quien se lo regalarías 👇' }
];
export const porClave = k => PLANTILLAS.find(p => p.k === k) || PLANTILLAS[0];

function datos(prod) {
  const dim = prod && Number(prod.dimX) > 0 ? [prod.dimX, prod.dimY, prod.dimZ].map(v => String(Math.round(Number(v)) / 10).replace('.', ',')).join(' × ') + ' cm' : '';
  const nombre = N(prod && prod.nombre) || 'Nuestro producto';
  return { N: nombre, n: nombre.charAt(0).toLowerCase() + nombre.slice(1), M: N(prod && prod.material) || 'material de calidad', C: N(prod && prod.color).toLowerCase(), P: prod && Number(prod.precio) ? eur(prod.precio) : '', D: dim };
}

// Un Reel completo con una plantilla. semilla = qué gancho / textos / llamada tocan (para que no salga siempre lo mismo)
export function proyectoDePlantilla(prod, clave, { fotos = [], formato = '9:16', semilla = Date.now() } = {}) {
  const T = porClave(clave), d = datos(prod), r = azar(semilla + T.k.length * 7919), k = T.k2 || 1;
  const g = rellena(elige(T.gan, r), d), tx = elige(T.tx, r).map(x => rellena(x, d)), cta = rellena(elige(T.cta, r), d);
  const f = i => fotos[i] || fotos[fotos.length - 1] || null;
  const precio = T.precio && d.P ? ['precio', { precio: d.P, antes: '', texto: T.pt || '', foto: f(0) }] : null;
  let es = E[T.e]({ f, g, t: tx, d, k, precio }).filter(Boolean);
  if (!fotos.length) es = es.map(x => x[0] === 'producto' ? ['texto', { texto: x[1] && x[1].titulo ? '*' + x[1].titulo + '*' : '✏️ Añade una foto aquí', dur: 1.8 }] : x);
  const escenas = es.map(([tipo, o]) => nuevaEscena(tipo, Object.assign({}, o || {}, tipo === 'cta' ? { texto: cta, sub: usuarioRed() } : {}, o && o.dur ? { dur: Math.round(o.dur * 10) / 10 } : {})));
  const base = guionPlantilla(prod, T.s);
  const pie = rellena(T.pie, d) + ' ' + d.N + (d.D ? ' · ' + d.D : '') + (d.P && T.precio ? ' · ' + d.P : '') + '. Escríbenos para pedirlo 💌';
  return { id: 'reel_' + Date.now().toString(36) + Math.floor(r() * 1e3), nombre: d.N + ' · ' + T.n, productoId: prod ? prod.id : '', estilo: T.s, colores: T.col || null, plantilla: T.k, formato, musica: null, marcaAgua: true,
    escenas, caption: pie, hashtags: base.hashtags, creado: new Date().toISOString(), nota: T.nota || '' };
}

// Cinco propuestas DISTINTAS para un producto: una de cada grupo que encaje, sin repetir las últimas que usaste con él.
// ctx: { agotado, vuelve, oferta } (lo que el programa ya sabe del producto)
export function propuestas(prod, ctx = {}, n = 5, semilla = Date.now(), usadas = []) {
  const r = azar(semilla), fuera = new Set(usadas.slice(0, 6));
  const mezcla = l => l.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const de = g => mezcla(PLANTILLAS.filter(p => p.g === g && !fuera.has(p.k) && p.k !== 'agotado' && p.k !== 'restock'));
  const out = [];
  if (ctx.agotado) out.push(porClave('agotado')); else if (ctx.vuelve) out.push(porClave('restock'));
  if (ctx.oferta) out.push(de('oferta')[0]);
  const colas = [de('producto'), de('historia'), de('estilo'), de('producto').slice(1), de('historia').slice(1), ctx.oferta ? [] : de('oferta')];
  for (let i = 0; out.length < n && i < 40; i++) { const c = colas[i % colas.length], x = c.shift(); if (x && !out.includes(x)) out.push(x); }
  return out.filter(Boolean).slice(0, n);
}
// Ficha de consejos de una plantilla: cuánto dura, con qué gancho abre y cómo cierra (para decidir sin crear el vídeo)
export function consejo(T) {
  const dur = { rapido: '7–9 s', hero: '13–16 s', problema: '12–15 s', proceso: '15–18 s', antes: '11–13 s', oferta: '9–11 s', emocion: '14–17 s', lista: '13–15 s', aviso: '8–10 s', opinion: '11–13 s', cine: '17–20 s' }[T.e] || '10–15 s';
  return { duracion: dur, gancho: T.gan[0].replace(/\*/g, '').replace(/\{N\}|\{n\}/g, '…'), cierre: T.cta[0], musica: T.s === 'oferta' ? 'con ritmo' : T.s === 'premium' ? 'tranquila y elegante' : 'alegre y suave' };
}
