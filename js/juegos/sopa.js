// ================= v13.4 · Descanso 🎮 : «Sopa de ideas» (sopa de letras infinita) =================
// Para los ratos de descanso en el taller. Juego de verdad, SIN relación con los datos del negocio:
//   · no usa el servidor ni toca pedidos, stock ni puntos reales; el mejor nivel se guarda solo en este aparato (localStorage)
//   · cada nivel se genera con una semilla (mulberry32): 8×8 al principio, hasta 14×14; de 6 a 12 palabras
//   · las palabras son IDEAS de qué fabricar en un taller de impresión 3D; al encontrarlas se anota su idea
//   · arrastra el dedo/ratón sobre las letras en línea recta, o pulsa la primera y la última letra; con teclado: flechas + Intro
import { h, btn } from '../ui.js';

export const meta = { id: 'sopa', titulo: 'Sopa de ideas', emoji: '🔤', desc: 'Sopa de letras infinita. Cada palabra que encuentras es una idea de qué fabricar.' };

// ---------- Banco de palabras: «PALABRA|idea» (sin tildes ni espacios en la palabra; la idea sí lleva tildes) ----------
const RAW = [
  'MACETA|maceta con reserva de agua, en 3 colores',
  'LLAVERO|llavero con el nombre de cada cliente',
  'SOPORTE|soporte de móvil plegable para la mesa del taller',
  'PEONZA|peonza que gira un minuto entero con su cordel',
  'DADO|dados de rol con los números en relieve',
  'FIGURA|figura personalizada a partir de una foto',
  'LAMPARA|lámpara de noche con pantalla de capas finas',
  'ORGANIZADOR|organizador de escritorio con huecos a medida',
  'POSAVASOS|posavasos con el logo de la cafetería de la esquina',
  'IMAN|imán de nevera con la silueta de tu ciudad',
  'COLGADOR|colgador de pared para llaves, bolsos y mochilas',
  'GANCHO|gancho adhesivo que aguanta tres kilos sin taladrar',
  'CAJITA|cajita para anillos con tapa a presión',
  'TORNILLO|tornillo especial de repuesto que ya nadie encuentra',
  'ENGRANAJE|engranaje de repuesto para la batidora de la abuela',
  'MARCAPAGINAS|marcapáginas con forma de gato asomado al libro',
  'PORTALAPICES|portalápices de hexágonos que se encajan como un panal',
  'PORTAVELAS|portavelas calado que dibuja sombras en la pared',
  'BOTON|botón de repuesto para el abrigo favorito',
  'TAPON|tapón a medida para botellas de aceite',
  'PERCHA|percha infantil con forma de animal',
  'JARRON|jarrón en espiral que se imprime sin soportes',
  'CASCOS|soporte de cascos con forma de cabeza',
  'MANDO|soporte para el mando de la consola con hueco para el cable',
  'CABLES|organizador de cables con clips numerados',
  'CLIP|clip para bolsas de patatas con forma de dinosaurio',
  'PINZA|pinza de ropa extrafuerte para días de viento',
  'TECLADO|reposamuñecas para teclado con relieve de panal',
  'PEANA|peana para figuras y trofeos con el nombre grabado',
  'TROFEO|trofeo para el torneo del cole',
  'MEDALLA|medalla para la carrera solidaria del barrio',
  'PLACA|placa con el número de la casa, resistente al sol',
  'CARTEL|cartel de «vuelvo en cinco minutos» con colgador',
  'LETRERO|letrero para la tienda con letras de colores',
  'LETRAS|letras sueltas para decorar el cuarto del bebé',
  'NOMBRE|nombre en 3D para la puerta de la habitación',
  'CUMPLE|topper de tarta de cumpleaños con nombre y edad',
  'CORTADOR|cortador de galletas con tu propio dibujo',
  'MOLDE|molde de jabón con forma de estrella',
  'SELLO|sello de repostería con el logo del obrador',
  'EMBUDO|embudo con filtro para el aceite usado',
  'MEDIDOR|cucharilla medidora de café, justo siete gramos',
  'SALERO|salero con tapa giratoria y cierre hermético',
  'ABRIDOR|abridor de frascos que agarra sin esfuerzo',
  'PINCEL|bote para pinceles con huecos de colores',
  'ESPATULA|espátula fina para despegar piezas de la cama',
  'BOQUILLA|boquilla de repuesto para la impresora de la vecina',
  'BOBINA|portabobinas silencioso con rodamientos',
  'FILAMENTO|guía de filamento que evita los enredos',
  'RODAMIENTO|rueda con rodamiento impreso para un coche de juguete',
  'COCHE|coche de juguete que rueda de verdad',
  'CAMION|camión volquete para el arenero',
  'TREN|tren de vías encajables, ampliable sin fin',
  'BARCO|barquito que flota y no se hunde en la bañera',
  'AVION|avioncito de planeo para lanzar desde el balcón',
  'COHETE|cohete de juguete con base de lanzamiento',
  'ROBOT|robot articulado que se monta sin pegamento',
  'DINOSAURIO|dinosaurio articulado que mueve la cola',
  'DRAGON|dragón articulado en colores brillantes',
  'GATO|gato sentado para decorar la estantería',
  'PERRO|placa identificativa con forma de hueso para el collar',
  'COMEDERO|comedero antivoracidad con laberinto para mascotas',
  'PUZZLE|puzle 3D con tu foto en relieve',
  'LABERINTO|laberinto de bolas para entretener en el autobús',
  'AJEDREZ|ajedrez con piezas de personajes del cole',
  'TABLERO|tablero de juego plegable que guarda sus fichas',
  'FICHAS|fichas de parchís en tu color favorito',
  'MINIATURA|miniatura de rol lista para pintar',
  'ESCENARIO|escenario modular para partidas de rol',
  'CASTILLO|castillo desmontable para el cuarto de juegos',
  'CASITA|casita de muñecas con muebles diminutos',
  'MESITA|mesita de noche en miniatura con cajón que abre',
  'ESTANTERIA|estantería modular que crece añadiendo módulos',
  'FLORERO|florero de pared para tres flores',
  'CACTUS|cactus que nunca se seca ni pincha',
  'SUCULENTA|set de suculentas de colores para quien olvida regar',
  'JARDINERA|jardinera colgante para la barandilla del balcón',
  'REGADERA|regadera de interior con pico largo',
  'ETIQUETA|etiquetas de plantas con el nombre y el riego',
  'SEMILLERO|bandeja de semillero con tapa de mini invernadero',
  'NIDO|caja nido para pajarillos del jardín',
  'MARIPOSA|móvil de mariposas colgantes para el techo',
  'MOVIL|móvil de cuna con nubes y estrellitas',
  'SONAJERO|sonajero sin piezas pequeñas ni aristas',
  'REGLA|regla de bolsillo con escala en relieve',
  'PLANTILLA|plantilla de dibujo con figuras geométricas',
  'CHAPA|chapa personalizada para la mochila',
  'BROCHE|broche floral para la solapa',
  'PENDIENTES|pendientes ligeros con formas geométricas',
  'COLGANTE|colgante con la inicial de quien lo lleva',
  'ANILLO|anillo ajustable con diseño de panal',
  'PULSERA|pulsera flexible de eslabones articulados',
  'DIADEMA|diadema con orejas de gato',
  'GAFAS|soporte de gafas de lectura para la mesilla',
  'PEINE|peine con forma de dinosaurio y dientes anchos',
  'CEPILLO|soporte de cepillos de dientes para cuatro',
  'JABONERA|jabonera con rejilla para que se seque rápido',
  'TOALLERO|toallero adhesivo sin taladrar',
  'ESPEJO|marco de espejo con estrellas caladas',
  'MARCO|marco de fotos con el relieve de la ciudad',
  'PORTAFOTOS|portafotos de sobremesa con forma de casita',
  'CALENDARIO|calendario perpetuo con piezas giratorias',
  'RELOJ|reloj de pared con números gigantes',
  'TABLET|atril para tablet con ángulo ajustable',
  'CARGADOR|base de cargador para el móvil con salida de cable',
  'FUNDA|funda con ranuras para el mando de la tele',
  'CARCASA|carcasa para la placa electrónica del proyecto de clase',
  'PROTOTIPO|prototipo rápido para probar una idea antes de fabricarla en serie',
  'REPUESTO|repuesto de una pieza descatalogada de la lavadora',
  'ASA|asa para la taza que se rompió',
  'TIRADOR|tirador de armario con forma de hoja',
  'BISAGRA|bisagra impresa en una sola pieza, sin tornillos',
  'PATA|pata ajustable para la mesa coja',
  'RUEDA|rueda de repuesto para el carrito de la compra',
  'TAPA|tapa de repuesto para el termo',
  'PERILLA|perilla de horno con marcas en relieve',
  'HUEVERA|huevera apilable para seis huevos',
  'ESCURRIDOR|escurridor plegable de platos',
  'BANDEJA|bandeja de desayuno con asas',
  'ATRIL|atril de partituras plegable',
  'PUAS|púas de guitarra de varios grosores',
  'OCARINA|ocarina con forma de pez que suena de verdad',
  'SILBATO|silbato de entrenador con cordón de colores',
  'YOYO|yoyó con rodamiento que no se enreda',
  'BUMERAN|bumerán flexible que vuelve de verdad',
  'LINTERNA|carcasa para linterna con filtros de colores',
  'LUPA|soporte de lupa con manos libres para soldar',
  'PLANETA|maqueta del sistema solar con planetas desmontables',
  'VOLCAN|maqueta de volcán que erupciona con bicarbonato',
  'ESQUELETO|esqueleto desmontable para la clase de ciencias',
  'MOLECULA|kit de moléculas con bolas y enlaces para el instituto',
  'TORRE|torre de Hanói con discos de colores',
  'PIRAMIDE|pirámide con cámaras secretas para la clase de historia',
  'MAPA|mapa en relieve de la montaña de la excursión',
  'BRAILLE|rótulo en braille para la entrada de un museo',
  'CARRITO|carrito de ruedas para pasear al peluche',
  'ESTRELLA|estrella de Navidad para la punta del árbol',
  'BOLA|bola de Navidad calada con tu nombre',
  'BELEN|figuras de belén en tres tamaños',
  'CALABAZA|calabaza de Halloween con hueco para la luz',
  'FANTASMA|fantasma colgante para la fiesta',
  'MASCARA|máscara de carnaval ligera y con goma',
  'CORONA|corona de rey para el cumpleaños',
  'GUIRNALDA|guirnalda de letras para la fiesta',
  'INVITACION|invitación en relieve para la boda',
  'BOTELLERO|botellero de vino para ocho botellas',
  'SERVILLETERO|servilletero de mesa con forma de pájaro',
  'MENU|atril de menú para la mesa del bar',
  'PRECIO|cartelitos de precio para la tienda del mercadillo',
  'EXPOSITOR|expositor escalonado para el puesto del mercadillo',
  'EMBALAJE|calzos a medida para que el pedido no se mueva',
  'PEDIDO|tarjeta de agradecimiento con el número de pedido',
  'CATALOGO|catálogo físico con muestras de cada color',
  'MUESTRARIO|muestrario de filamentos para enseñar a los clientes',
  'PORTATARJETAS|portatarjetas de visita con el logo de la empresa',
  'CAJON|divisor de cajón para cubiertos y utensilios',
  'ESTUCHE|estuche rígido para las gafas de sol'
];
export const BANCO = RAW.map(s => { const i = s.indexOf('|'); return { palabra: s.slice(0, i), idea: s.slice(i + 1) }; });
const IDEA = new Map(BANCO.map(b => [b.palabra, b.idea]));
export const ideaDe = palabra => IDEA.get(palabra) || '';

// ---------- Lógica pura (se prueba sin pantalla) ----------
// RNG determinista
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// 8 direcciones [dx, dy]: → ↓ ↘ ↗ (las 4 primeras) y luego las invertidas ← ↑ ↖ ↙
export const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]];
export const MAX_NIVEL_TAM = 14;
export const tamano = nivel => Math.min(14, 8 + Math.floor((Math.max(1, nivel) - 1) * 0.75));
export const numPalabras = nivel => Math.min(12, 6 + Math.floor((Math.max(1, nivel) - 1) * 2 / 3));
export const dirsNivel = nivel => DIRS.slice(0, nivel <= 2 ? 2 : nivel <= 4 ? 4 : 8);

const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FREC = 'AAAAEEEEIIIOOOOSSSRRNNLLDDCCTTMMPPUUBGVHQFZJXKWY';
const alReves = s => s.split('').reverse().join('');
const mezcla = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dentro = (n, x, y) => x >= 0 && y >= 0 && x < n && y < n;

// Todas las apariciones de una palabra en la cuadrícula (8 direcciones), sin contar dos veces la misma línea leída al revés
export function apariciones(filas, palabra) {
  const n = filas.length, L = palabra.length, out = [], vistos = new Set();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) for (const [dx, dy] of DIRS) {
    const ex = x + dx * (L - 1), ey = y + dy * (L - 1); if (!dentro(n, ex, ey)) continue;
    let ok = true; for (let i = 0; i < L && ok; i++) if (filas[y + dy * i][x + dx * i] !== palabra[i]) ok = false;
    if (!ok) continue;
    const k = Math.min(y * n + x, ey * n + ex) + '-' + Math.max(y * n + x, ey * n + ex);
    if (vistos.has(k)) continue; vistos.add(k); out.push({ x, y, dx, dy });
  }
  return out;
}

function elegir(rnd, n, k, nivel) {
  const maxLen = nivel <= 2 ? Math.min(n - 1, 7) : n, presupuesto = Math.floor(n * n * 0.5);
  const cand = mezcla(BANCO.filter(b => b.palabra.length <= maxLen && b.palabra.length >= 3), rnd), el = []; let letras = 0;
  for (const b of cand) {
    if (el.length >= k) break;
    if (letras + b.palabra.length > presupuesto) continue;
    const w = b.palabra, r = alReves(w);
    if (el.some(o => o.palabra.includes(w) || o.palabra.includes(r) || w.includes(o.palabra) || r.includes(o.palabra) || w === r)) continue;
    el.push(b); letras += w.length;
  }
  return el.length === k ? el : null;
}
function colocar(celdas, n, w, dirs, rnd) {
  const L = w.length;
  for (let t = 0; t < 500; t++) {
    const [dx, dy] = dirs[Math.floor(rnd() * dirs.length)];
    const xs = dx > 0 ? n - L + 1 : dx < 0 ? n - L + 1 : n, ys = dy > 0 ? n - L + 1 : dy < 0 ? n - L + 1 : n;
    let x = Math.floor(rnd() * xs), y = Math.floor(rnd() * ys);
    if (dx < 0) x += L - 1; if (dy < 0) y += L - 1;
    let ok = true;
    for (let i = 0; i < L && ok; i++) { const c = celdas[(y + dy * i) * n + (x + dx * i)]; if (c && c !== w[i]) ok = false; }
    if (!ok) continue;
    for (let i = 0; i < L; i++) celdas[(y + dy * i) * n + (x + dx * i)] = w[i];
    return { x, y, dx, dy };
  }
  return null;
}
// Una tirada del generador. Devuelve null si no cabe, o { sopa, limpio } (limpio = ninguna palabra aparece fuera de su sitio)
function intentar(rnd, n, k, nivel, dirs) {
  const el = elegir(rnd, n, k, nivel); if (!el) return null;
  const celdas = Array(n * n).fill(''), pals = [];
  for (const b of el.slice().sort((a, b) => b.palabra.length - a.palabra.length)) {
    const p = colocar(celdas, n, b.palabra, dirs, rnd); if (!p) return null;
    pals.push({ palabra: b.palabra, idea: b.idea, x: p.x, y: p.y, dx: p.dx, dy: p.dy });
  }
  const fija = celdas.map(Boolean), pool = pals.map(p => p.palabra).join('');
  const letra = () => rnd() < 0.45 ? pool[Math.floor(rnd() * pool.length)] : FREC[Math.floor(rnd() * FREC.length)];
  for (let i = 0; i < celdas.length; i++) if (!celdas[i]) celdas[i] = letra();
  const filasDe = () => Array.from({ length: n }, (_, y) => celdas.slice(y * n, y * n + n).join(''));
  // Quita apariciones no declaradas: cambia una letra de relleno de cada una
  let limpio = false;
  for (let pasada = 0; pasada < 60; pasada++) {
    const filas = filasDe(); let extras = 0, imposible = false;
    for (const p of pals) {
      for (const a of apariciones(filas, p.palabra)) {
        const propia = (a.x === p.x && a.y === p.y && a.dx === p.dx && a.dy === p.dy) ||
          (a.x === p.x + p.dx * (p.palabra.length - 1) && a.y === p.y + p.dy * (p.palabra.length - 1) && a.dx === -p.dx && a.dy === -p.dy);
        if (propia) continue; extras++;
        const libres = []; for (let i = 0; i < p.palabra.length; i++) { const idx = (a.y + a.dy * i) * n + (a.x + a.dx * i); if (!fija[idx]) libres.push(idx); }
        if (!libres.length) { imposible = true; continue; }
        const idx = libres[Math.floor(rnd() * libres.length)]; let c = celdas[idx]; while (c === celdas[idx]) c = letra(); celdas[idx] = c;
      }
    }
    if (!extras) { limpio = true; break; }
    if (imposible) break;
  }
  return { limpio, sopa: { n, grid: filasDe(), palabras: pals } };
}

// generar(semilla, nivel) → { semilla, nivel, n, grid:[filas], palabras:[{palabra, idea, x, y, dx, dy}] }  (x,y = primera letra; dx,dy = dirección)
export function generar(semilla, nivel = 1) {
  nivel = Math.max(1, Math.floor(nivel) || 1); semilla = (Number(semilla) >>> 0);
  const n = tamano(nivel), k = numPalabras(nivel), dirs = dirsNivel(nivel); let ultimo = null;
  for (let intento = 0; intento < 80; intento++) {
    const rnd = mulberry32((Math.imul(semilla, 2654435761) ^ Math.imul(nivel, 40503) ^ Math.imul(intento + 1, 9973)) >>> 0);
    const r = intentar(rnd, n, k, nivel, dirs); if (!r) continue;
    ultimo = r.sopa; if (r.limpio) break;
  }
  if (!ultimo) throw new Error('No se pudo generar la sopa (semilla ' + semilla + ', nivel ' + nivel + ')');
  return { semilla, nivel, n, grid: ultimo.grid, palabras: ultimo.palabras };
}

// Celdas [x,y] del tramo recto entre dos casillas; null si no es una línea recta (horizontal, vertical o diagonal)
export function tramo(n, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;
  if (![x0, y0, x1, y1].every(v => Number.isInteger(v)) || !dentro(n, x0, y0) || !dentro(n, x1, y1)) return null;
  const L = Math.max(Math.abs(dx), Math.abs(dy)) + 1, sx = Math.sign(dx), sy = Math.sign(dy), out = [];
  for (let i = 0; i < L; i++) out.push([x0 + sx * i, y0 + sy * i]);
  return out;
}
// validarSeleccion(sopa, x0, y0, x1, y1, hallados) → { ok, motivo?, idx?, palabra?, celdas?, declarada? }
// Cuenta cualquier aparición de una palabra objetivo (declarada o no) y leída en cualquier sentido. hallados: Set/array de índices ya encontrados.
export function validarSeleccion(sopa, x0, y0, x1, y1, hallados = []) {
  const ya = hallados instanceof Set ? hallados : new Set(hallados);
  const celdas = tramo(sopa.n, x0, y0, x1, y1);
  if (!celdas) return { ok: false, motivo: 'recta' };
  if (celdas.length < 2) return { ok: false, motivo: 'corta' };
  const s = celdas.map(([x, y]) => sopa.grid[y][x]).join(''), r = alReves(s);
  const i = sopa.palabras.findIndex(p => p.palabra === s || p.palabra === r);
  if (i < 0) return { ok: false, motivo: 'nada', texto: s };
  if (ya.has(i)) return { ok: false, motivo: 'repetida', idx: i, palabra: sopa.palabras[i].palabra };
  const p = sopa.palabras[i], L = p.palabra.length, fx = p.x + p.dx * (L - 1), fy = p.y + p.dy * (L - 1);
  const declarada = (x0 === p.x && y0 === p.y && x1 === fx && y1 === fy) || (x1 === p.x && y1 === p.y && x0 === fx && y0 === fy);
  return { ok: true, idx: i, palabra: p.palabra, celdas, declarada };
}
// Cuadrícula completa: ¿cada palabra declarada está de verdad en su sitio y solo ahí?
export function verificar(sopa) {
  const errores = [];
  for (const p of sopa.palabras) {
    const L = p.palabra.length;
    for (let i = 0; i < L; i++) {
      const x = p.x + p.dx * i, y = p.y + p.dy * i;
      if (!dentro(sopa.n, x, y) || sopa.grid[y][x] !== p.palabra[i]) { errores.push(p.palabra + ': no está en su sitio'); break; }
    }
    const a = apariciones(sopa.grid, p.palabra).length; if (a !== 1) errores.push(p.palabra + ': aparece ' + a + ' veces');
  }
  return errores;
}

// ---------- Guardado local (solo en este aparato) ----------
const LS = 'cd.descanso.sopa';
const lee = () => { try { const o = JSON.parse(localStorage.getItem(LS) || '{}'); return { mejor: Math.max(0, Math.floor(Number(o.mejor)) || 0), palabras: Math.max(0, Math.floor(Number(o.palabras)) || 0) }; } catch (e) { return { mejor: 0, palabras: 0 }; } };
const guarda = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { } };
const semillaNueva = () => (Math.floor(Math.random() * 4294967296)) >>> 0;
const HUES = [338, 200, 140, 38, 275, 8, 172, 58, 312, 96, 228, 22];
const fmtT = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export function render(el, ctx) {
  let nivel = 1, semilla = semillaNueva(), sopa, hallados, pistasNivel = 0, pistasTotal = 0, ideas = [], completo = false, anc = null, cur = { x: 0, y: 0 }, pistaIdx = -1, t0 = Date.now(), tFin = 0;
  let rec = lee(), drag = null; const timers = [];
  const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t; };

  const sNivel = h('b', '1'), sPal = h('b', '0/0'), sPistas = h('b', '0'), sMejor = h('b', String(rec.mejor));
  const flash = h('div.sopa-flash', { 'aria-live': 'polite' });
  const grid = h('div.sopa-grid', { tabindex: 0, role: 'application', 'aria-label': 'Sopa de letras. Arrastra sobre las letras de una palabra, o con el teclado usa las flechas y Intro en la primera y en la última letra' });
  const win = h('div.sopa-win');
  const lista = h('div.sopa-words');
  const ul = h('ul.sopa-ideas-list'), vacioIdeas = h('p.muted.tiny.sopa-vacio', 'Aquí irán apareciendo las ideas de lo que encuentres.');
  const bPista = btn('Pista', () => pista(), { title: 'Resalta la primera letra de una palabra pendiente' });
  const root = h('div.sopa',
    h('div.sopa-top',
      h('div.sopa-stat', h('span', 'Nivel'), sNivel), h('div.sopa-stat', h('span', 'Palabras'), sPal), h('div.sopa-stat', h('span', 'Pistas'), sPistas), h('div.sopa-stat', h('span', 'Mejor nivel'), sMejor)),
    h('div.sopa-actions', bPista, btn('Nueva sopa', () => nueva(), { cls: 'primary', icon: 'plus', title: 'Otra sopa distinta del mismo nivel' }), btn('Reiniciar', () => cero(), { cls: 'ghost', title: 'Volver al nivel 1 y vaciar las ideas' })),
    flash,
    h('div.sopa-main',
      h('div.sopa-board', grid, win),
      h('div.sopa-side', lista, h('div.sopa-ideas', h('h3', '💡 Ideas encontradas'), vacioIdeas, ul))),
    h('p.muted.tiny', 'Arrastra el dedo o el ratón sobre las letras de una palabra (en línea recta, en cualquier sentido), o toca la primera y la última letra. Con teclado: flechas e Intro. Las palabras pueden ir en horizontal, vertical y diagonal.'));
  el.append(root);

  let cel = [];
  function pintaTabla() {
    grid.replaceChildren(); cel = [];
    grid.style.setProperty('--n', String(sopa.n));
    for (let y = 0; y < sopa.n; y++) for (let x = 0; x < sopa.n; x++) {
      const c = h('div.sopa-c', { 'data-x': String(x), 'data-y': String(y) }, sopa.grid[y][x]); cel.push(c); grid.append(c);
    }
    hallados.forEach((v, i) => marcaCeldas(i, v));
  }
  const celda = (x, y) => cel[y * sopa.n + x];
  function marcaCeldas(i, v) { for (const [x, y] of v.celdas) { const c = celda(x, y); c.classList.add('ok'); c.style.setProperty('--h', String(HUES[i % HUES.length])); } }
  function pintaLista() {
    lista.replaceChildren(h('div.sopa-words-t', 'Palabras por encontrar'), h('div.sopa-chips', sopa.palabras.map((p, i) => h('span.sopa-chip' + (hallados.has(i) ? '.on' : ''), { 'data-w': p.palabra }, (hallados.has(i) ? '✔ ' : '') + p.palabra))));
  }
  function pintaIdeas() {
    ul.replaceChildren(...ideas.map(i => h('li' + (i.nueva ? '.nueva' : ''), h('b', i.palabra), ': ' + i.idea, h('span.muted.tiny', ' · nivel ' + i.nivel))));
    vacioIdeas.style.display = ideas.length ? 'none' : '';
  }
  function stats() {
    sNivel.textContent = String(nivel); sPal.textContent = hallados.size + '/' + sopa.palabras.length; sPistas.textContent = String(pistasNivel); sMejor.textContent = String(rec.mejor);
  }
  function limpiaSel() { cel.forEach(c => c.classList.remove('sel', 'anc', 'mal')); if (anc) celda(anc.x, anc.y).classList.add('anc'); }
  function cargar() {
    sopa = generar(semilla, nivel); hallados = new Map(); pistasNivel = 0; completo = false; anc = null; drag = null; pistaIdx = -1; cur = { x: 0, y: 0 }; t0 = Date.now(); tFin = 0;
    win.className = 'sopa-win'; win.replaceChildren(); flash.textContent = ''; flash.className = 'sopa-flash';
    pintaTabla(); pintaLista(); pintaIdeas(); stats(); bPista.disabled = false;
  }
  function nueva() { semilla = semillaNueva(); cargar(); }
  function cero() { nivel = 1; semilla = semillaNueva(); ideas = []; pistasTotal = 0; cargar(); }
  function siguiente() { nivel++; semilla = semillaNueva(); cargar(); grid.scrollIntoView && grid.scrollIntoView({ block: 'nearest' }); }

  function pista() {
    if (completo) return;
    const i = sopa.palabras.findIndex((p, k) => !hallados.has(k)); if (i < 0) return;
    const q = sopa.palabras[i]; cel.forEach(c => c.classList.remove('pista')); celda(q.x, q.y).classList.add('pista');
    pistaIdx = i; pistasNivel++; pistasTotal++; stats();
    flash.className = 'sopa-flash on'; flash.textContent = '🔎 Pista: una palabra de ' + q.palabra.length + ' letras empieza en la casilla resaltada.';
  }
  function marcar(res) {
    const v = { celdas: res.celdas }; hallados.set(res.idx, v); marcaCeldas(res.idx, v);
    const p = sopa.palabras[res.idx]; if (pistaIdx === res.idx) { cel.forEach(c => c.classList.remove('pista')); pistaIdx = -1; }
    ideas.forEach(x => { x.nueva = false; }); ideas.unshift({ palabra: p.palabra, idea: p.idea, nivel, nueva: true });
    flash.className = 'sopa-flash on'; flash.textContent = '💡 ' + p.palabra + ': ' + p.idea;
    pintaLista(); pintaIdeas(); stats(); limpiaSel();
    if (hallados.size === sopa.palabras.length) terminar();
  }
  function terminar() {
    completo = true; tFin = Date.now(); bPista.disabled = true; cel.forEach(c => c.classList.remove('pista'));
    const nuevoRec = nivel > rec.mejor; rec = { mejor: Math.max(rec.mejor, nivel), palabras: rec.palabras + sopa.palabras.length }; guarda(rec); stats();
    win.className = 'sopa-win on';
    win.replaceChildren(h('b.sopa-win-t', '¡Nivel completo!'), h('span', sopa.palabras.length + ' ideas en ' + fmtT(tFin - t0) + (pistasNivel ? ' · ' + pistasNivel + (pistasNivel === 1 ? ' pista' : ' pistas') : ' · sin pistas')),
      nuevoRec ? h('span.sopa-rec', '🏆 ¡Nuevo mejor nivel!') : null,
      btn('Siguiente nivel', () => siguiente(), { cls: 'primary', title: 'Una sopa más grande y más difícil' }));
    flash.className = 'sopa-flash on'; flash.textContent = '🎉 ¡Has encontrado todas las ideas de este nivel!';
  }
  function evaluar(x0, y0, x1, y1) {
    const res = validarSeleccion(sopa, x0, y0, x1, y1, new Set(hallados.keys()));
    anc = null; limpiaSel();
    if (res.ok) { marcar(res); return; }
    const t = tramo(sopa.n, x0, y0, x1, y1);
    if (t && t.length > 1) { t.forEach(([x, y]) => celda(x, y).classList.add('mal')); later(() => cel.forEach(c => c.classList.remove('mal')), 380); }
    if (res.motivo === 'repetida') { flash.className = 'sopa-flash on'; flash.textContent = 'Esa ya la tienes: ' + res.palabra + '.'; }
  }

  // ----- ratón / dedo -----
  function casilla(e) {
    const a = cel[0].getBoundingClientRect(), b = cel[cel.length - 1].getBoundingClientRect(), n = sopa.n;
    const sx = n > 1 ? (b.left - a.left) / (n - 1) : a.width, sy = n > 1 ? (b.top - a.top) / (n - 1) : a.height;
    const x = Math.round((e.clientX - (a.left + a.width / 2)) / sx), y = Math.round((e.clientY - (a.top + a.height / 2)) / sy);
    return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
  }
  // ajusta el final del arrastre a la recta (8 direcciones) más cercana
  function ajusta(x0, y0, p) {
    const dx = p.x - x0, dy = p.y - y0; if (!dx && !dy) return { x: x0, y: y0 };
    const k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)), ux = Math.round(Math.cos(k * Math.PI / 4)), uy = Math.round(Math.sin(k * Math.PI / 4));
    let L = Math.max(0, Math.round((dx * ux + dy * uy) / (ux * ux + uy * uy)));
    while (L > 0 && !dentro(sopa.n, x0 + ux * L, y0 + uy * L)) L--;
    return { x: x0 + ux * L, y: y0 + uy * L };
  }
  function previa(x0, y0, x1, y1) { limpiaSel(); (tramo(sopa.n, x0, y0, x1, y1) || []).forEach(([x, y]) => celda(x, y).classList.add('sel')); }
  grid.addEventListener('pointerdown', e => {
    if (completo || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); const p = casilla(e); drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, moved: false };
    try { grid.setPointerCapture(e.pointerId); } catch (err) { }
    cur = { x: p.x, y: p.y }; previa(p.x, p.y, p.x, p.y);
  });
  grid.addEventListener('pointermove', e => {
    if (!drag) return; const f = ajusta(drag.x0, drag.y0, casilla(e));
    if (f.x !== drag.x1 || f.y !== drag.y1) { drag.x1 = f.x; drag.y1 = f.y; if (f.x !== drag.x0 || f.y !== drag.y0) drag.moved = true; previa(drag.x0, drag.y0, f.x, f.y); }
  });
  grid.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null; try { grid.releasePointerCapture(e.pointerId); } catch (err) { }
    const f = ajusta(d.x0, d.y0, casilla(e));
    if (f.x !== d.x0 || f.y !== d.y0) { evaluar(d.x0, d.y0, f.x, f.y); return; }
    // toque: primera y última letra
    if (!anc) { anc = { x: d.x0, y: d.y0 }; limpiaSel(); return; }
    if (anc.x === d.x0 && anc.y === d.y0) { anc = null; limpiaSel(); return; }
    if (tramo(sopa.n, anc.x, anc.y, d.x0, d.y0)) evaluar(anc.x, anc.y, d.x0, d.y0); else { anc = { x: d.x0, y: d.y0 }; limpiaSel(); }
  });
  grid.addEventListener('pointercancel', () => { drag = null; limpiaSel(); });
  // ----- teclado -----
  const mueveCur = (dx, dy) => { cel.forEach(c => c.classList.remove('cur')); cur = { x: Math.min(sopa.n - 1, Math.max(0, cur.x + dx)), y: Math.min(sopa.n - 1, Math.max(0, cur.y + dy)) }; celda(cur.x, cur.y).classList.add('cur'); if (anc) previa(anc.x, anc.y, ...(f => [f.x, f.y])(ajusta(anc.x, anc.y, cur))); };
  grid.addEventListener('focus', () => { cel.forEach(c => c.classList.remove('cur')); celda(cur.x, cur.y).classList.add('cur'); });
  grid.addEventListener('blur', () => cel.forEach(c => c.classList.remove('cur')));
  grid.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || completo) return;
    const K = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (K[e.key]) { e.preventDefault(); mueveCur(...K[e.key]); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!anc) { anc = { x: cur.x, y: cur.y }; limpiaSel(); return; }
      if (anc.x === cur.x && anc.y === cur.y) { anc = null; limpiaSel(); return; }
      if (tramo(sopa.n, anc.x, anc.y, cur.x, cur.y)) evaluar(anc.x, anc.y, cur.x, cur.y); else { anc = { x: cur.x, y: cur.y }; limpiaSel(); }
    } else if (e.key === 'Escape') { anc = null; limpiaSel(); }
  });

  cargar();
  window.__sopa = {
    palabras: () => sopa.palabras.map(p => p.palabra),
    solucion: () => sopa.palabras.map(p => ({ palabra: p.palabra, x: p.x, y: p.y, dx: p.dx, dy: p.dy, idea: p.idea })),
    nivel: () => nivel, semilla: () => semilla, n: () => sopa.n, grid: () => sopa.grid.slice(),
    hallados: () => [...hallados.keys()].map(i => sopa.palabras[i].palabra), completo: () => completo,
    pistas: () => pistasNivel, pistasTotal: () => pistasTotal, ideas: () => ideas.map(i => i.palabra), mejor: () => rec.mejor
  };
  return { destroy() { timers.forEach(clearTimeout); delete window.__sopa; } };
}
