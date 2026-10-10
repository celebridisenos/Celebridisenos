// ================= v18 · 🧊 CelebriR8: diseña piezas sin saber de 3D =================
// «Un Fusion dentro de mi programa pero más fácil» (la dueña, 9-10-2026). Eliges una plantilla, mueves las medidas y la pieza
// cambia delante de ti; cuando te gusta, descargas el STL o le pides precio al Cotizador. Y con «Editar un STL» abres un
// archivo que ya tienes para escalarlo, cortarlo o ponerle (o cambiarle) el nombre.
// La geometría está en js/r8/motor.js. Todo se hace en este aparato; lo estimado (el peso) se marca como ESTIMADO.
import { h, mount, btn, toast } from '../ui.js';
import { go } from '../app.js';
import { parse3D, viewer } from '../stl.js';
import { estimarGramos } from '../datos3d.js';
import { PIEZAS, FUENTES, FORMAS, ENCAJES, MANILLARES, CAMA, editar, medidas, stlBinario, separar, zip, ponEncajes, ponAutoria } from '../r8/motor.js';
import { S as ST } from '../store.js'; // v20.2: lo que sale de CelebriR8 va a nombre de la empresa (Configuración → Empresa)
import { entiende, EJEMPLOS } from '../r8/entiende.js';
import { MOVILES, MATERIAL, movil } from '../r8/moviles.js';

const num = (k, t, v, min, max, paso = 1, u = 'mm') => ({ k, t, v, min, max, paso, u });
const sel = (k, t, v, ops) => ({ k, t, v, ops });
const FU = Object.entries(FUENTES).map(([k, f]) => [k, f[0]]);
// v18 · ENCAJE: la holgura por cada lado. Son los valores que la dueña ha comprobado en sus Bambu.
const cm2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 });
const opsEncaje = () => [['justo', 'Justo: encaja (' + cm2(ENCAJES.justo) + ' mm por lado)'], ['presion', 'A presión: entra con fuerza (' + cm2(ENCAJES.presion) + ')'], ['gira', 'Holgado: gira bien (' + cm2(ENCAJES.gira) + ')']];
const encaje = (t = 'Encaje', v = 'justo') => Object.assign(sel('encaje', t, v, opsEncaje()), { enc: 1 }); // enc: las opciones se pintan con TUS holguras de ahora
// las holguras medidas con la «Prueba de holgura» se recuerdan en este aparato
try { ponEncajes(JSON.parse(localStorage.getItem('cd.r8.encajes') || 'null')); } catch (e) { }
const MOTIVO = [sel('motivo', 'Lleva…', 'nombre', [['nombre', 'Un nombre grabado'], ['figura', 'Una figura grabada'], ['liso', 'Nada (liso)']]), { k: 'texto', t: 'Nombre o figura', v: '', txt: 1, ayuda: 'Un nombre, o una figura: ❤ ★ 🐱 🦋 🐾' }, { k: 'mask', t: 'O una imagen tuya (para la figura)', img: 1 }, sel('fuente', 'Letra', 'gorda', FU)];
// Los apartados de arriba: qué plantillas enseña cada uno
export const GRUPOS = [['', 'Todas'], ['regalo', '🎁 Regalos'], ['repuesto', '🔧 Repuestos']]; // v20: las fundas tienen su taller (pestaña 📱 Fundas) // v20: fuera «Coche» y «Moto» (la dueña: «quítalos, pon cosas que se vendan»)
const EN = { regalo: ['ficha', 'colgante', 'nombre', 'figura', 'molde', 'cortador'], repuesto: ['engranaje', 'arandela', 'tapon', 'pomo', 'pletina', 'gancho', 'clip', 'caja', 'holgura', 'editar'], movil: ['funda'] };
const FO = [['silueta', 'Con la forma de las letras'], ['placa', 'Placa redondeada']].concat(Object.entries(FORMAS).map(([k, f]) => [k, f.t]));
const FIG = [{ k: 'texto', t: 'Figura (letra, palabra o emoji)', v: '❤', txt: 1, ayuda: 'Escribe una letra, una palabra o pega un emoji: ❤ ★ 🐱 🦋' }, { k: 'mask', t: 'O una imagen tuya (silueta)', img: 1 }, sel('fuente', 'Letra', 'gorda', FU)];
export const HERRAMIENTAS = {
  funda: { e: '📱', t: 'Funda de móvil', d: 'iPhone, Samsung S, Xiaomi…', c: [sel('modelo', 'Móvil', 'iPhone 15', MOVILES.map(m => [m[1], m[1]]).concat([['otro', 'Otro: pongo yo las medidas']])), num('alto', 'Alto del móvil', 147.6, 60, 200, 0.05), num('ancho', 'Ancho del móvil', 71.6, 40, 110, 0.05), num('grosor', 'Grosor del móvil', 7.8, 4, 16, 0.05),
      sel('material', 'Se va a imprimir en…', 'tpu', [['tpu', 'TPU (flexible)'], ['pla', 'PLA (rígido)']]), sel('diseno', 'Diseño de la trasera', 'liso', [['liso', 'Lisa'], ['panal', 'Panal (hexágonos calados)'], ['puntos', 'Puntos calados'], ['rayas', 'Rayas caladas'], ['nombre', 'Con un nombre grabado'], ['figura', 'Con una figura grabada']]),
      { k: 'texto', t: 'Nombre o figura (para esos dos diseños)', v: '', txt: 1, ayuda: 'Un nombre, o una figura: ❤ ★ 🐱 🦋' }, sel('fuente', 'Letra', 'gorda', FU),
      { k: 'prueba', t: 'Solo la PRUEBA RÁPIDA (funda bajita de 15 minutos para comprobar el encaje)', v: false, chk: 1 },
      sel('camara', 'Ventana de la cámara (ESTIMADA)', 'izq', [['izq', 'Arriba a la izquierda (vista por detrás)'], ['ancha', 'Una franja de lado a lado'], ['centro', 'Arriba en el centro'], ['sin', 'Sin ventana']]), num('camAncho', 'Cámara: ancho', 56, 15, 100, 1, '%'), num('camAlto', 'Cámara: alto', 29, 8, 60, 1, '%'),
      { k: 'lados', t: 'Aberturas a los lados para los botones', v: true, chk: 1 }, num('desde', 'Botones: desde (contando desde arriba)', 14, 5, 80, 1, '%'), num('hasta', 'Botones: hasta', 62, 15, 92, 1, '%'), num('abajo', 'Abertura de abajo (carga y altavoces)', 62, 0, 90, 1, '%'),
      num('ajuste', 'Holgura alrededor del móvil', 0.1, 0, 0.6, 0.05), num('pared', 'Grosor de las paredes', 1.6, 1, 3, 0.1), num('fondo', 'Grosor de la trasera', 1.4, 0.8, 3, 0.1), num('labio', 'Labio que sujeta por delante', 0.9, 0, 1.6, 0.1), num('radio', 'Redondeo de las esquinas (ESTIMADO)', 7, 0.5, 16, 0.5)],
    nombre: p => 'funda_' + (p.modelo === 'otro' ? p.alto + 'x' + p.ancho : p.modelo) + (p.prueba ? '_prueba' : '_' + p.material),
    nota: p => (p.modelo === 'otro' ? 'Medidas puestas a mano. ' : 'Alto, ancho y grosor: las medidas oficiales del ' + p.modelo + '. ') + 'La ventana de la cámara, las aberturas y el redondeo son ESTIMADOS y van amplios: imprime primero la «prueba rápida» y pon el móvil encima; si algo no coincide, muévelo aquí y listo.',
    // al elegir el móvil se ponen sus medidas; al elegir el material, su holgura, su labio y su pared
    alCambiar(k, v) { if (k === 'modelo') { const m = movil(v.modelo); if (m) Object.assign(v, { alto: m.alto, ancho: m.ancho, grosor: m.grosor, camara: m.camara, camAncho: m.camAncho, camAlto: m.camAlto, radio: m.radio }); return !!m; } if (k === 'material') { Object.assign(v, MATERIAL[v.material] || {}); return true; } return false; } },
  ficha: { e: '🪙', t: 'Ficha del carro', d: 'Moneda con tu nombre', c: [sel('moneda', 'Como la moneda de…', '1', [['1', '1 € (23,25 mm de diámetro, 2,33 de grosor)'], ['2', '2 € (25,75 mm de diámetro, 2,20 de grosor)']]), { k: 'texto', t: 'Nombre en el mango', v: 'Ana', txt: 1, ayuda: 'Vacío = sin nombre.' }, sel('fuente', 'Letra', 'gorda', FU)],
    nombre: p => 'ficha_carro_' + (p.texto || 'lisa'), nota: () => 'La parte redonda mide exactamente lo que la moneda (medidas oficiales del euro). El mango lleva el agujero para el llavero.' },
  colgante: { e: '🧷', t: 'Colgante', d: 'Para llaves o el bolso', c: [{ k: 'figura', t: 'Figura', v: '🦋', txt: 1, ayuda: 'Un emoji o una letra: 🦋 ❤ ★ 🐾 ⚽ 🌙' }, { k: 'mask', t: 'O una imagen tuya (silueta)', img: 1 }, { k: 'texto', t: 'Nombre debajo', v: 'Leo', txt: 1, ayuda: 'Vacío = solo la figura.' }, sel('fuente', 'Letra', 'gorda', FU), num('ancho', 'Ancho', 55, 25, 150), num('base', 'Grosor de la base', 2.4, 1.2, 6, 0.2), num('saliente', 'Relieve', 1.2, 0.4, 4, 0.2)],
    nombre: p => 'colgante_' + (p.texto || 'figura'), nota: () => 'La figura y el nombre van en relieve sobre una base que los une: sale de una pieza, con su anilla arriba.' },
  caja: { e: '📦', t: 'Caja', d: 'Con tapa que encaja', c: [num('x', 'Ancho', 80, 12, 250), num('y', 'Largo', 60, 12, 250), num('z', 'Alto', 40, 4, 250), num('pared', 'Grosor de la pared', 1.6, 0.8, 5, 0.2), num('radio', 'Esquinas redondeadas', 6, 0, 40, 0.5), { k: 'tapa', t: 'Con tapa', v: true, chk: 1 }, encaje('Encaje de la tapa')], nombre: p => 'caja_' + p.x + 'x' + p.y + 'x' + p.z },
  nombre: { e: '🏷️', t: 'Nombre', d: 'Llavero o placa', c: [{ k: 'texto', t: 'Nombre o frase', v: 'Lucía', txt: 1 }, sel('fuente', 'Letra', 'gorda', FU), num('alto', 'Altura de las letras', 14, 5, 80), sel('estilo', 'Forma', 'silueta', FO), sel('relieve', 'Las letras', 'alto', [['alto', 'En relieve'], ['grabado', 'Grabadas (en placa o figura)']]), { k: 'anilla', t: 'Con agujero para la anilla', v: true, chk: 1 }, num('base', 'Grosor de la base', 2.4, 1.2, 8, 0.2), num('saliente', 'Relieve de las letras', 1.2, 0.4, 5, 0.2)], nombre: p => 'nombre_' + p.texto },
  engranaje: { e: '⚙️', t: 'Engranaje', d: 'Dientes de verdad', c: [num('dientes', 'Dientes', 20, 6, 100, 1, ''), num('modulo', 'Tamaño del diente (módulo)', 2, 0.5, 6, 0.25, ''), num('grosor', 'Grosor', 8, 1, 60), num('eje', 'Agujero del eje (diámetro del eje)', 5, 0, 60, 0.5), encaje('Encaje en el eje')], nombre: p => 'engranaje_' + p.dientes + 'd_m' + p.modulo, nota: p => 'Diámetro total: ' + (Math.round(p.modulo * (Number(p.dientes) + 2) * 10) / 10).toLocaleString('es-ES') + ' mm. Dos engranajes encajan si tienen el mismo módulo; entre ejes: (dientes A + dientes B) × módulo ÷ 2.' },
  molde: { e: '🧱', t: 'Molde', d: 'Para jabón, resina, yeso…', c: FIG.concat([num('ancho', 'Ancho de la figura', 50, 10, 220), num('hondo', 'Profundidad del hueco', 10, 2, 60), num('fondo', 'Grosor del fondo', 2, 1, 10, 0.2), num('margen', 'Borde alrededor', 5, 2, 30), { k: 'espejo', t: 'Al revés (para que al desmoldar se lea bien)', v: true, chk: 1 }]), nombre: () => 'molde' },
  cortador: { e: '🍪', t: 'Cortador', d: 'Galletas, plastilina, fondant', c: FIG.concat([num('ancho', 'Ancho de la figura', 60, 15, 220), num('alto', 'Altura', 14, 6, 40), num('pared', 'Grosor del filo', 0.9, 0.5, 2.5, 0.1), num('ala', 'Ala para apretar', 3.5, 1.5, 10, 0.5)]), nombre: () => 'cortador' },
  figura: { e: '🖼️', t: 'Figura', d: 'De un dibujo o un emoji', c: FIG.concat([num('ancho', 'Ancho', 60, 10, 240), num('grosor', 'Grosor', 3, 0.6, 40, 0.2), num('borde', 'Peana alrededor (0 = sin peana)', 0, 0, 15, 0.5), num('peana', 'Grosor de la peana', 1.6, 0.6, 10, 0.2)]), nombre: () => 'figura' },
  arandela: { e: '⭕', t: 'Arandela', d: 'Casquillos y separadores', c: [num('exterior', 'Diámetro de fuera', 30, 4, 250), num('interior', 'Agujero (diámetro del eje o tornillo)', 8, 0, 240, 0.5), num('grosor', 'Grosor o largo', 3, 0.4, 100, 0.2), encaje('Encaje del agujero')], nombre: p => 'arandela_' + p.exterior + 'x' + p.interior + 'x' + p.grosor },
  tapon: { e: '🧢', t: 'Tapón', d: 'Para tubos y patas', c: [num('diametro', 'Diámetro del tubo o la pata', 25, 4, 200, 0.5), sel('tipo', '¿Cómo va?', 'fuera', [['fuera', 'Lo cubre por fuera (capuchón)'], ['dentro', 'Entra en el tubo (tapón)']]), num('alto', 'Alto', 15, 3, 120), num('pared', 'Grosor', 1.6, 0.8, 5, 0.2), num('ala', 'Ala (solo si entra en el tubo)', 2, 0, 15, 0.5), encaje()], nombre: p => 'tapon_' + p.diametro },
  pomo: { e: '🎛️', t: 'Pomo', d: 'Mandos y perillas', c: [num('diametro', 'Diámetro', 30, 10, 120), num('alto', 'Alto', 16, 5, 80), num('estrias', 'Estrías para agarrar (0 = liso)', 12, 0, 40, 1, ''), num('eje', 'Diámetro del eje', 6, 2, 30, 0.5), num('hondo', 'Cuánto entra el eje', 10, 2, 60), { k: 'plano', t: 'Eje con un lado plano (en «D»)', v: false, chk: 1 }, encaje('Encaje en el eje')], nombre: p => 'pomo_' + p.diametro + '_eje' + p.eje },
  pletina: { e: '🔩', t: 'Placa con agujeros', d: 'Para atornillar y reparar', c: [num('x', 'Largo', 60, 10, 250), num('y', 'Ancho', 20, 6, 250), num('grosor', 'Grosor', 3, 0.8, 30, 0.2), num('radio', 'Esquinas redondeadas', 3, 0, 40, 0.5), sel('patron', 'Agujeros', 'fila', [['fila', 'En fila'], ['esquinas', 'En las cuatro esquinas']]), num('agujeros', 'Cuántos (en fila)', 2, 0, 12, 1, ''), num('agujero', 'Diámetro del tornillo', 4, 1, 30, 0.5), encaje('Encaje del tornillo')], nombre: p => 'placa_' + p.x + 'x' + p.y },
  gancho: { e: '🪝', t: 'Gancho', d: 'De puerta o en «S»', c: [sel('tipo', 'Tipo', 'puerta', [['puerta', 'De puerta (se cuelga por arriba)'], ['s', 'En «S» (para una barra)']]), num('hueco', 'Grosor de la puerta o de la barra', 40, 5, 120, 0.5), num('caida', 'Lo que baja', 60, 10, 200), num('fondo', 'Hueco del gancho', 18, 6, 80), num('espesor', 'Grosor de la pieza', 4, 2, 10, 0.5), num('ancho', 'Ancho', 18, 5, 80)], nombre: p => 'gancho_' + p.tipo + '_' + p.hueco },
  clip: { e: '🗜️', t: 'Abrazadera', d: 'Tubos, cables y manillares', alCambiar(k, v) { if (k === 'estandar' && Number(v.estandar) > 0) { v.tubo = Number(v.estandar); return true; } return false; }, c: [sel('estandar', 'Medida estándar', '', [['', 'La mido yo']].concat(MANILLARES.map(m => [String(m[0]), 'Manillar de moto ' + m[1]]))), num('tubo', 'Diámetro del tubo o cable', 20, 3, 120, 0.1), num('espesor', 'Grosor de la pieza', 2.4, 1.2, 8, 0.2), num('ancho', 'Ancho', 12, 4, 80), num('abertura', 'Abertura para meterlo', 70, 20, 170, 5, '°'), { k: 'base', t: 'Con base plana (para pegar o atornillar de lado)', v: true, chk: 1 }, encaje()], nombre: p => 'abrazadera_' + p.tubo },
  holgura: { e: '📏', t: 'Prueba de holgura', d: 'Para saber TU medida', c: [num('diametro', 'Diámetro del pasador', 8, 4, 20, 0.5), num('grosor', 'Grosor de la placa', 6, 3, 12, 0.5)], nombre: () => 'prueba_de_holgura',
    nota: () => '① Imprime las dos piezas con tu filamento y tus ajustes de siempre (unos 20 minutos).  ② Mete el pasador en cada agujero.  ③ Arriba, toca el número del agujero donde entra apretando, donde entra justo y donde gira.  ④ Guardar. Los números de la plaquita son centésimas de milímetro por cada lado (10 = 0,10 mm), pero no hace falta que te acuerdes: solo toca el número.' },
  editar: { e: '✏️', t: 'Editar un STL', d: 'Nombre, corte y tamaño', c: [num('escala', 'Tamaño', 100, 10, 400, 5, '%'), sel('modo', 'Cortar', 'entera', [['entera', 'No cortar'], ['partir', 'Partir en dos con pasadores (encaje automático)'], ['abajo', 'Quedarme solo con una parte']]), sel('eje', 'El corte va…', 'z', [['z', 'Tumbado (a una altura)'], ['x', 'De pie, de lado a lado'], ['y', 'De pie, de delante atrás']]), num('corte', '¿A cuántos mm?', 10, 0.5, 250, 0.5), num('pasadores', 'Pasadores', 2, 0, 4, 1, ''), num('diam', 'Diámetro del pasador', 4, 2, 12, 0.5), encaje('Encaje de los pasadores'), { k: 'texto', t: 'Nombre o texto que le pongo', v: '', txt: 1, ayuda: 'Déjalo vacío si no quieres texto.' }, sel('fuente', 'Letra', 'gorda', FU), num('alto', 'Altura de las letras', 8, 2, 80, 0.5), num('saliente', 'Relieve de las letras', 1, 0.3, 6, 0.1), sel('cara', '¿Dónde va?', 'arriba', [['arriba', 'Encima de la pieza'], ['frente', 'En la cara de delante']]), num('dx', 'Mover a los lados', 0, -150, 150, 0.5), num('dy', 'Mover adelante / arriba', 0, -150, 150, 0.5), { k: 'tapar', t: 'Tapar el nombre que tenía con una plaquita', v: false, chk: 1 }, num('parche', 'Grosor de la plaquita', 1.2, 0.4, 6, 0.2)], nombre: (p, E) => String(E.archivo || 'pieza').replace(/\.[^.]+$/, '') + '_editado' }
};
// lo último que estabas haciendo se conserva al cambiar de pantalla y volver
const E = { k: 'caja', v: {}, base: null, archivo: '', g: '' }; // (si alguien tenía la funda abierta, vuelve a la caja)
const valores = k => (E.v[k] = E.v[k] || Object.fromEntries(HERRAMIENTAS[k].c.map(c => [c.k, c.img ? null : c.v])));

// Una imagen → su silueta (lo que no es transparente; si la imagen no tiene transparencia, lo oscuro)
export function silueta(img) {
  const k = Math.min(1, 1000 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)), c = document.createElement('canvas'); c.width = Math.max(2, Math.round((img.naturalWidth || img.width) * k)); c.height = Math.max(2, Math.round((img.naturalHeight || img.height) * k));
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height); const I = g.getImageData(0, 0, c.width, c.height), d = I.data; let tr = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) tr++;
  const conAlfa = tr > d.length / 4 * 0.03;
  for (let i = 0; i < d.length; i += 4) { const dentro = conAlfa ? d[i + 3] > 127 : (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) < 140; d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = dentro ? 255 : 0; }
  g.putImageData(I, 0, 0); return c;
}

export function renderPlantillas(el) {
  const cv0 = () => h('canvas.r8-cv', { 'aria-label': 'La pieza en 3D: arrastra para girarla' });
  let cv = cv0(), visor = null, pos = null, info = null, tic = 0;
  const grupos = h('div.r8-grupos'), tipos = h('div.r8-tipos'), panel = h('div.r8-campos'), datos = h('div.r8-datos'), aviso = h('div.r8-aviso'), chips = h('div.r8-chips'), hueco = h('div.r8-hueco');
  const escena = h('div.r8-vista', cv, chips, hueco);
  const elegir = h('input', { type: 'file', accept: '.stl,.3mf,.obj', style: { display: 'none' }, onchange: e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) abrir(f); } });
  const acciones = h('div.row.wrap.r8-acc', btn('⬇ Descargar STL', () => descargar(), { cls: 'primary r8-bajar' }), btn('🧩 Por separado (.zip)', () => porSeparado(), { cls: 'r8-separar' }), btn('⚡ Ver precio en el Cotizador', () => cotizar(), { cls: 'r8-precio' }));
  // ✨ pídemelo con palabras
  const frase = h('input.inp.r8-frase', { type: 'text', maxlength: 160, placeholder: 'Escribe lo que necesitas: «una caja de 12 x 8 x 5 cm con tapa»…', 'aria-label': 'Pide la pieza con palabras', onkeydown: e => { if (e.key === 'Enter') pedir(); } }), entendido = h('div.r8-entendido');
  const pedir = t => { if (t !== undefined) frase.value = t; const r = entiende(frase.value); mount(entendido, r.error ? h('span.r8-no', '🤔 ' + r.error) : [h('b', '✨ He entendido: '), r.dicho]); if (r.error) return; E.k = r.k; { const H = HERRAMIENTAS[r.k], v = valores(r.k); Object.assign(v, r.v); if (H.alCambiar) Object.keys(r.v).forEach(c => H.alCambiar(c, v)); } pintaTipos(); monta(); genera(0); window.__r8dicho = r; };
  const pide = h('div.card.r8-pide', h('div.r8-pide-f', h('span', '✨'), frase, btn('Crear', () => pedir(), { cls: 'primary r8-crear' })), h('div.r8-ej', h('small', 'Por ejemplo:'), EJEMPLOS.slice(0, 4).map(x => h('button', { type: 'button', onclick: () => pedir(x) }, x))), entendido, h('small.muted', 'Lo entiende el propio programa, sin internet. Lo que no digas se queda con la medida de siempre, y lo ajustas a la derecha.'));
  el.appendChild(h('div.r8', elegir,
    pide, grupos, tipos, h('div.r8-g', escena, h('div.card.r8-panel', panel, aviso, datos, acciones))));

  const nombre = () => String(HERRAMIENTAS[E.k].nombre(valores(E.k), E) || 'pieza').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'pieza';
  async function abrir(f) {
    try { if (!/\.(stl|3mf|obj)$/i.test(f.name)) throw new Error('Elige un archivo STL, 3MF u OBJ.'); const p = await parse3D(await f.arrayBuffer(), f.name); if (!p || p.length < 9) throw new Error('Ese archivo no tiene ninguna pieza.');
      E.base = p instanceof Float32Array ? p : new Float32Array(p); E.archivo = f.name; if (E.k !== 'editar') { E.k = 'editar'; pintaTipos(); monta(); } const M = medidas(E.base), v = valores('editar'); Object.assign(v, { texto: '', tapar: false, modo: 'entera', escala: 100, dx: 0, dy: 0 }); v.corte = Math.round(M.dims[v.eje === 'x' ? 0 : v.eje === 'y' ? 1 : 2] * 5) / 10; v.alto = Math.max(3, Math.round(Math.min(M.dims[0], M.dims[1]) * 0.18)); monta(); genera(0);
    } catch (e) { toast(e.message || String(e), 'bad', 7000); }
  }
  function pintaTipos() {
    mount(grupos, GRUPOS.map(([g, t]) => h('button.r8-grupo' + (E.g === g ? '.on' : ''), { type: 'button', 'data-g': g, 'aria-pressed': String(E.g === g), onclick: () => { E.g = g; pintaTipos(); } }, t)));
    const lista = (E.g && EN[E.g] ? EN[E.g].map(k => [k, HERRAMIENTAS[k]]) : Object.entries(HERRAMIENTAS)).filter(([k]) => k !== 'funda'); // v20: la funda vive en su taller
    mount(tipos, lista.map(([k, H]) => h('button.r8-tipo' + (k === E.k ? '.on' : ''), { type: 'button', 'data-k': k, title: H.d, 'aria-pressed': String(k === E.k), onclick: () => { E.k = k; pintaTipos(); monta(); genera(0); } }, h('span', H.e), h('b', H.t), h('small', H.d))));
  }
  function monta() {
    const H = HERRAMIENTAS[E.k], v = valores(E.k);
    const campo = c => {
      if (c.chk) return h('label.check.r8-c', h('input', { type: 'checkbox', checked: !!v[c.k], 'data-k': c.k, onchange: e => { v[c.k] = e.target.checked; genera(); } }), c.t);
      if (c.txt) return h('label.r8-c.col', h('span', c.t), h('input.inp', { type: 'text', value: v[c.k] || '', maxlength: 40, 'data-k': c.k, oninput: e => { v[c.k] = e.target.value; if (E.k !== 'editar' && e.target.value && (c.k === 'figura' || !H.c.some(x => x.k === 'figura' || x.k === 'motivo'))) v.mask = null; genera(); } }), c.ayuda ? h('small.muted', c.ayuda) : null);
      if (c.ops) return h('label.r8-c.col', h('span', c.t), h('select.inp', { 'data-k': c.k, onchange: e => { v[c.k] = e.target.value; if (H.alCambiar && H.alCambiar(c.k, v)) monta(); genera(); } }, (c.enc ? opsEncaje() : c.ops).map(([k, t]) => h('option', { value: k, selected: v[c.k] === k }, t))));
      if (c.img) { const fi = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; const im = new Image(), u = URL.createObjectURL(f); im.onload = () => { v.mask = silueta(im); URL.revokeObjectURL(u); monta(); genera(0); }; im.onerror = () => toast('No se pudo abrir esa imagen.', 'bad'); im.src = u; } });
        return h('div.r8-c.col', h('span', c.t), fi, h('div.row.wrap', { style: { gap: '8px' } }, btn(v.mask ? '🖼️ Cambiar la imagen' : '🖼️ Elegir imagen', () => fi.click(), { cls: 'sm' }), v.mask ? btn('Quitarla (usar el texto)', () => { v.mask = null; monta(); genera(0); }, { cls: 'sm ghost' }) : null), h('small.muted', v.mask ? 'Usando tu imagen: se imprime su silueta.' : 'Mejor un dibujo negro sobre blanco o un PNG sin fondo.')); }
      const r = h('input', { type: 'range', min: c.min, max: c.max, step: c.paso, value: v[c.k], 'aria-label': c.t }), n = h('input.inp', { type: 'number', min: c.min, max: c.max, step: c.paso, value: v[c.k], 'data-k': c.k, 'aria-label': c.t });
      const pon = (x, de) => { let y = Number(String(x).replace(',', '.')); if (!isFinite(y)) return; y = Math.max(c.min, Math.min(c.max, y)); v[c.k] = y; if (de !== r) r.value = y; if (de !== n) n.value = y; genera(); };
      r.oninput = () => pon(r.value, r); n.oninput = () => pon(n.value, n); n.onchange = () => { n.value = v[c.k]; };
      return h('label.r8-c.r8-num', h('span', c.t), r, h('span.r8-n', n, c.u ? h('i', c.u) : null));
    };
    // 📏 «Mis holguras», fácil: tres preguntas y se toca el NÚMERO del agujero (el mismo que lleva la plaquita). Sin decimales.
    const mias = () => {
      const N = [0, 5, 10, 15, 20, 25, 30], mio = { presion: Math.round(ENCAJES.presion * 100), justo: Math.round(ENCAJES.justo * 100), gira: Math.round(ENCAJES.gira * 100) }, ojo = h('p.r8-ojo'), caja = h('div.r8-mias');
      const fila = (k, n, t, d) => h('div.r8-preg', h('b', n + ' ' + t), h('small', d), h('div.r8-nums', N.map(x => h('button' + (mio[k] === x ? '.on' : ''), { type: 'button', 'data-enc': k, 'data-v': x, 'aria-pressed': String(mio[k] === x), onclick: () => { mio[k] = x; pinta(); } }, String(x)))));
      const guarda = () => { if (!(mio.presion <= mio.justo && mio.justo <= mio.gira)) { ojo.textContent = '⚠️ Revisa: el agujero donde gira tiene que ser igual o más grande que el de «justo», y el de «justo», igual o más grande que el de «apretando».'; return; }
        ponEncajes({ presion: mio.presion / 100, justo: mio.justo / 100, gira: mio.gira / 100 }); try { localStorage.setItem('cd.r8.encajes', JSON.stringify(ENCAJES)); } catch (e) { } toast('✅ Guardado. Todas tus piezas saldrán ya con tu medida.', 'ok', 6000); monta(); };
      const pinta = () => { ojo.textContent = ''; const igual = mio.presion === Math.round(ENCAJES.presion * 100) && mio.justo === Math.round(ENCAJES.justo * 100) && mio.gira === Math.round(ENCAJES.gira * 100);
        mount(caja, h('b.r8-mias-t', '📏 ¿Qué te ha salido? Toca el número del agujero'),
          fila('presion', '1.', 'Entra APRETANDO', 'El agujero más pequeño en el que entra, haciendo fuerza.'), fila('justo', '2.', 'Entra JUSTO', 'Entra sin fuerza y no baila.'), fila('gira', '3.', 'GIRA suelto', 'Entra fácil y da vueltas sin rozar.'), ojo,
          h('div.row.wrap', { style: { gap: '8px' } }, btn(igual ? '✅ Guardado' : 'Guardar', guarda, { cls: 'primary r8-guardar-enc', disabled: igual }), btn('Volver a las de serie', () => { ponEncajes({ presion: 0.05, justo: 0.1, gira: 0.15 }); try { localStorage.removeItem('cd.r8.encajes'); } catch (e) { } monta(); }, { cls: 'sm ghost r8-serie-enc' })),
          h('p.r8-mias-ok', 'Y ya está: no hay que tocar nada más. Cuando una plantilla te pregunte «Encaje», eliges ', h('b', 'Justo'), ', ', h('b', 'A presión'), ' o ', h('b', 'Que gire'), ' y el programa pone tu medida sola (en tapas, ejes, agujeros y pasadores).')); };
      pinta(); return caja; };
    mount(panel, E.k === 'holgura' ? mias() : null, E.k === 'editar' ? h('div.r8-archivo', h('b', E.archivo || 'Ningún archivo todavía'), btn(E.base ? '📂 Abrir otro' : '📂 Abrir un STL', () => elegir.click(), { cls: 'sm' })) : null, H.c.map(campo));
  }
  function genera(espera = 160) { clearTimeout(tic); tic = setTimeout(hacer, espera); }
  function hacer() {
    const H = HERRAMIENTAS[E.k], v = valores(E.k); mount(aviso);
    if (E.k === 'editar' && !E.base) { pos = null; info = null; escena.classList.add('vacia'); mount(hueco, h('button.r8-soltar', { type: 'button', onclick: () => elegir.click() }, h('span', '✏️'), h('b', 'Abre o suelta aquí un STL'), h('small', 'Podrás cambiarle el tamaño, cortarlo y ponerle un nombre.'))); mount(chips); mount(datos); window.__r8 = { k: E.k, pos: null, info: null }; return; }
    escena.classList.remove('vacia'); mount(hueco);
    try {
      const t0 = performance.now(); pos = E.k === 'editar' ? editar(E.base, v) : PIEZAS[E.k](v); if (!pos || pos.length < 9) throw new Error('Con esas medidas no sale ninguna pieza.');
      info = medidas(pos); info.ms = Math.round(performance.now() - t0); info.gramos = estimarGramos(info.vol, info.area) || 0;
      const [x, y, z] = info.dims, n1 = q => (Math.round(q * 10) / 10).toLocaleString('es-ES'), grande = Math.max(x, y, z) > CAMA;
      mount(chips, h('span', '↔ ' + n1(x) + ' mm'), h('span', '↕ ' + n1(y) + ' mm'), h('span', '⬆ ' + n1(z) + ' mm'));
      mount(datos, h('div', h('span', 'Mide'), h('b', n1(x) + ' × ' + n1(y) + ' × ' + n1(z) + ' mm')), h('div', h('span', 'Volumen'), h('b', n1(info.vol / 1000) + ' cm³')), h('div', h('span', 'Peso'), h('b', '≈ ' + Math.max(1, Math.round(info.gramos)) + ' g'), h('small', 'ESTIMADO (PLA)')));
      mount(aviso, grande ? h('p.r8-ojo', '⚠️ Mide más de ' + (CAMA / 10).toLocaleString('es-ES') + ' cm de lado: no cabe en la impresora. Redúcela.') : null, H.nota ? h('p.r8-nota', H.nota(v)) : null, pos.partes ? h('p.r8-nota', '🧩 Son ' + pos.partes.length + ' partes (' + pos.partes.map(x => x.t.replace(/_/g, ' ')).join(', ') + '). Con «Por separado» te llevas cada una en su archivo.' + (pos.puestos ? ' Los pasadores entran con el encaje elegido.' : '')) : null, (pos.avisos || []).map(a => h('p.r8-ojo', '⚠️ ' + a)));
      if (visor && visor.set) visor.set(pos); else { if (visor) { try { visor.destroy(); } catch (e) { } const n = cv0(); cv.replaceWith(n); cv = n; } visor = viewer(cv, pos, { color: [0.56, 0.51, 1] }); }
    } catch (e) { pos = null; info = null; mount(aviso, h('p.r8-ojo', '⚠️ ' + (e.message || 'Con esas medidas no sale la pieza.'))); mount(datos); }
    window.__r8 = { k: E.k, pos, info, nombre: nombre(), valores: v, partes: pos && pos.partes ? pos.partes.map(x => x.t) : null };
  }
  function archivo() { if (!pos) { toast(E.k === 'editar' && !E.base ? 'Primero abre un STL.' : 'Arregla antes lo que marca el aviso.', 'warn'); return null; } return new File([stlBinario(pos, nombre())], nombre() + '.stl', { type: 'model/stl' }); }
  function descargar() { const f = archivo(); if (!f) return; const u = URL.createObjectURL(f), a = h('a', { href: u, download: f.name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); window.__r8.bajado = { nombre: f.name, bytes: f.size }; toast('⬇ ' + f.name + ' guardado en Descargas', 'ok', 5000); }
  // 🧩 cada parte en su archivo: las que la plantilla sabe que son partes (caja y tapa; las dos mitades y sus pasadores) o,
  // en un STL cualquiera, las piezas sueltas que lleva dentro
  function porSeparado() {
    if (!pos) return toast(E.k === 'editar' && !E.base ? 'Primero abre un STL.' : 'Arregla antes lo que marca el aviso.', 'warn');
    const P = pos.partes ? pos.partes : separar(pos).map((m, i) => ({ t: 'pieza_' + (i + 1), m }));
    if (P.length < 2) return toast('Es una sola pieza: no hay nada que separar.', 'ok', 5000);
    const f = new File([zip(P.map(x => ({ nombre: nombre() + '_' + x.t + '.stl', datos: stlBinario(x.m, x.t) })))], nombre() + '_por_separado.zip', { type: 'application/zip' }), u = URL.createObjectURL(f), a = h('a', { href: u, download: f.name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); window.__r8.zip = { nombre: f.name, n: P.length, partes: P.map(x => x.t) }; toast('🧩 ' + P.length + ' archivos en ' + f.name, 'ok', 6000);
  }
  function cotizar() { const f = archivo(); if (!f) return; import('./cotizador.js').then(m => { m.cotizarArchivo(f); go('cotizador'); }); }
  // soltar un STL encima lo abre para editarlo (aquí manda esta pantalla, no el Cotizador)
  const sobre = e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); escena.classList.add('encima'); } };
  el.addEventListener('dragover', sobre); el.addEventListener('dragleave', () => escena.classList.remove('encima'));
  el.addEventListener('drop', e => { escena.classList.remove('encima'); const f = e.dataTransfer && [...(e.dataTransfer.files || [])].find(x => /\.(stl|3mf|obj)$/i.test(x.name)); if (f) { e.preventDefault(); abrir(f); } });
  pintaTipos(); monta(); hacer();
  window.__r8abrir = abrir;
  return { destroy: () => { clearTimeout(tic); try { visor && visor.destroy(); } catch (e) { } delete window.__r8; delete window.__r8abrir; } };
}

// ================= v20 · 🧊 CelebriR8 · EL MARCO (pestañas por tareas, modo taller, ayuda y barra de estado) =================
// Las pestañas van por lo que quieres HACER: CREAR (Estudio, Catálogo, Foto → 3D, Smart Lab, Precision Lab, Fundas,
// Plantillas) · MEJORAR (Blender Workshop) · IMPRIMIR (Print Doctor). En el PC, CelebriR8 ocupa la pantalla entera
// («modo taller»: el menú del negocio se esconde y vuelve con «← Negocio»). Abajo, la barra de estado dice qué se está
// haciendo y qué hay en este PC (tarjeta gráfica, Blender, motores). Se recuerda la última pestaña.
const PESTANAS = [
  ['inicio', '🏠', 'Inicio', 'Empieza aquí', ''],
  ['estudio', '🧰', 'Estudio', 'Diseña como en Fusion', 'CREAR'], ['catalogo', '🛍️', 'Catálogo', 'Diseños listos', 'CREAR'], ['clon', '🧬', 'CelebriCLON', 'Repuestos desde fotos', 'CREAR'], ['cajas', '📦', 'Cajas', 'Bisagras y cierres', 'CREAR'], ['foto', '🪄', 'Foto → 3D', 'Con IA', 'CREAR'],
  ['lab', '🧪', 'Smart Lab', 'El mejor motor, solo', 'CREAR'], ['precision', '📏', 'Precisión', 'Repuestos a medida', 'CREAR'], ['fundas', '📱', 'Fundas', 'Tu móvil, mil estilos', 'CREAR'], ['plantillas', '📐', 'Plantillas', 'Las de siempre', 'CREAR'],
  ['taller', '🛠️', 'Reparar', 'Blender Workshop', 'MEJORAR'],
  ['doctor', '🩺', 'Imprimir', 'Print Doctor', 'IMPRIMIR']];
const VISTAS = { cajas: ['./r8_cajas.js', 'montarCajas'], clon: ['./r8_clon.js', 'montarClon'], inicio: ['./r8_inicio.js', 'montarInicio'], estudio: ['./r8_estudio.js', 'montarEstudio'], fundas: ['./r8_fundas.js', 'montarFundas'], catalogo: ['./r8_catalogo.js', 'montarCatalogo'], foto: ['./r8_foto.js', 'montarFoto'], lab: ['./r8_lab.js', 'montarLab'], precision: ['./r8_precision.js', 'montarPrecision'], taller: ['./r8_taller.js', 'montarTaller'], doctor: ['./r8_doctor.js', 'montarDoctor'] };
const guardado = (k, def) => { try { return localStorage.getItem(k) ?? def; } catch (e) { return def; } };
const apunta = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
let PEST = guardado('cd.r8.pest', 'inicio');
if (!PESTANAS.some(p => p[0] === PEST)) PEST = 'inicio';
export function render(el) {
  try { ponAutoria(ST.cfg && ST.cfg.empresa && ST.cfg.empresa.nombre); } catch (e) { }
  import('../store.js').then(st => st.pausaSync && st.pausaSync(true)).catch(() => { }); // v20.2: sin sincronizar mientras diseñas
  PEST = guardado('cd.r8.pest', PEST); if (!PESTANAS.some(p => p[0] === PEST)) PEST = 'inicio'; // v20.1: el estreno puede pedir una pestaña
  const tabs = h('div.r8v-tabs', { role: 'tablist', 'aria-label': 'Partes de CelebriR8' }), cuerpo = h('div.r8v-cuerpo');
  const ancho = () => window.innerWidth >= 900;
  let foco = guardado('cd.r8.foco', '1') === '1';
  const ponFoco = v => { foco = v; apunta('cd.r8.foco', v ? '1' : '0'); document.documentElement.classList.toggle('r8-foco', v && ancho()); pintaCab(); };
  const bFoco = h('button.r8v-bt', { type: 'button', onclick: () => ponFoco(!foco) }), bAyuda = h('button.r8v-bt.r8v-ayuda', { type: 'button', title: 'Aprender a utilizar CelebriR8 (visita guiada)', onclick: () => visita() }, '❓ ', h('span', 'Aprender'));
  // Noche / Día también dentro de CelebriR8 (en modo taller la barra del negocio no se ve)
  const bModo = h('button.r8v-bt.r8v-modo', { type: 'button', title: 'Cambiar entre Noche y Día', 'aria-label': 'Cambiar entre Noche y Día', onclick: async () => { const U = await import('../ui18.js'); const m = U.cambiaModo(); bModo.textContent = m === 'noche' ? '🌙' : '☀️'; const b = document.querySelector('.topbar .u18-modo'); if (b) b.textContent = bModo.textContent; } }, document.documentElement.getAttribute('data-modo') === 'dia' ? '☀️' : '🌙');
  const bNegocio = h('button.r8v-bt.r8v-negocio', { type: 'button', title: 'Volver al programa del negocio (pedidos, clientes…)', onclick: () => go('puente') }, '← ', h('span', 'Negocio'));
  const barra = h('div.r8v-estado', { role: 'status', 'aria-live': 'polite' });
  let actual = null, turno = 0, estudioVivo = null; // v20.2: el Estudio no se apaga al cambiar de pestaña (volver es al momento)
  const raiz = h('div.r8v', h('div.r8v-cab', bNegocio, h('div.r8v-logo', h('span.r8v-cubo', '🧊'), h('div', h('b', 'CelebriR8'), h('small', 'ESTUDIO 30'))), tabs, h('div.r8v-acc', bAyuda, bModo, bFoco)), cuerpo, barra);
  el.appendChild(raiz);
  function pintaCab() { bFoco.title = foco ? 'Ver también el menú del negocio' : 'Modo taller: CelebriR8 a pantalla completa'; mount(bFoco, foco ? '⤡' : '⤢'); bFoco.setAttribute('aria-label', bFoco.title); bNegocio.hidden = !(foco && ancho()); }
  const pinta = () => {
    const grupos = []; PESTANAS.forEach(p => { const g = p[4]; if (!grupos.length || grupos[grupos.length - 1].g !== g) grupos.push({ g, L: [] }); grupos[grupos.length - 1].L.push(p); });
    mount(tabs, grupos.map(({ g, L }) => h('div.r8v-g', { 'data-g': g || 'inicio' }, g ? h('small.r8v-grupo', g) : null, h('div.r8v-gb', L.map(([k, ic, t, d]) => h('button.r8v-tab' + (PEST === k ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(PEST === k), 'data-pest': k, title: t + ' · ' + d, onclick: () => ir(k) }, h('span', ic), h('b', t), h('small', d)))))));
  };
  async function ir(k, despues) {
    const yo = ++turno; PEST = k; apunta('cd.r8.pest', k); pinta();
    if (!(estudioVivo && actual === estudioVivo.r)) { try { actual && actual.destroy && actual.destroy(); } catch (e) { } }
    if (estudioVivo && actual === estudioVivo.r && k !== 'estudio') { try { estudioVivo.r.pausa && estudioVivo.r.pausa(); } catch (e) { } }
    actual = null; [...cuerpo.children].forEach(n => { if (estudioVivo && n === estudioVivo.caja) n.hidden = true; else n.remove(); });
    if (k === 'estudio' && estudioVivo) { estudioVivo.caja.hidden = false; actual = estudioVivo.r; try { actual.reanuda && actual.reanuda(); } catch (e) { } if (despues) despues(actual); window.__r8pest = k; return; }
    const caja = h('div.r8v-pest.r8v-' + k); cuerpo.appendChild(caja);
    try {
      let r;
      const ext = { irA: ir, go, visita: () => visita(), alEstudio: (dk, v, o) => ir('estudio', est => est.añadeDiseno(dk, v, o)), alEstudioMalla: (sopa, nombre) => ir('estudio', est => est.añadeMalla(sopa, nombre)) };
      if (VISTAS[k]) { const [mod, fn] = VISTAS[k]; const m = await import(mod); if (yo !== turno) return; r = await m[fn](caja, ext); }
      else r = renderPlantillas(caja);
      if (yo !== turno) { try { r && r.destroy && r.destroy(); } catch (e) { } return; }
      actual = r; if (k === 'estudio' && r) estudioVivo = { caja, r }; if (despues && r) despues(r);
    } catch (e) { console.error(e); mount(caja, h('div.card', h('p.r8e-mal', '⚠️ No se ha podido abrir: ' + (e.message || e)))); }
    window.__r8pest = k;
  }
  // ---------- la barra de estado ----------
  let E = null, quita = [];
  let firmaBarra = '';
  const pintaBarra = () => {
    const S = E ? E.SIS : null, T = E ? E.enMarcha() : [], ult = E ? [...E.TAREAS.values()].filter(t => t.estado !== 'va').sort((a, b) => b.fin - a.fin)[0] : null;
    const chip = (ok, txt, tit) => h('span.r8v-chip' + (ok === true ? '.ok' : ok === false ? '.no' : ''), { title: tit || txt }, txt);
    const tarj = S && S.tarjeta, gb = tarj && tarj.total_mb ? (tarj.libre_mb / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 }) : null;
    // v20.2: sin parpadeos: si nada ha cambiado (lo normal cada 30 s), no se toca
    const firma = JSON.stringify([T.map(t => [t.nombre, t.txt, t.pct, Math.round((Date.now() - t.t0) / 1000)]), ult && [ult.nombre, ult.estado, ult.txt], S && [S.listo, S.pc, gb, S.blender, S.blenderVer, S.motores.map(m => m.listo), S.nube.trellis2 && S.nube.trellis2.sesion]]);
    if (firma === firmaBarra) return; firmaBarra = firma;
    mount(barra,
      h('div.r8v-est-tarea', T.length ? T.map(t => h('span.r8v-tar', h('i.r8v-giro'), h('b', t.nombre), t.txt ? h('small', t.txt) : null, t.pct != null ? h('span.r8v-pbar', h('span', { style: { width: t.pct + '%' } })) : null, h('small', Math.round((Date.now() - t.t0) / 1000) + ' s')))
        : ult ? h('span.r8v-tar.' + ult.estado, ult.estado === 'bien' ? '✅ ' : '⚠️ ', h('b', ult.nombre), h('small', ult.txt || '')) : h('small.muted', 'Listo')),
      h('div.r8v-est-sis', !S || !S.listo ? h('small.muted', 'Mirando este PC…') : !S.pc ? chip(null, '📱 Sin el programa del PC: la IA y Blender no están aquí') : [
        tarj ? chip(tarj.libre_mb >= 3400, '🎮 ' + tarj.nombre.replace('NVIDIA GeForce ', '') + ' · ' + gb + ' GB libres', 'Memoria libre de la tarjeta gráfica ahora mismo (Bambu Studio y el navegador también la usan)') : chip(false, '🎮 Sin tarjeta NVIDIA'),
        chip(S.blender, S.blender ? '🎨 Blender' + (S.blenderVer ? ' ' + S.blenderVer : '') : '🎨 Sin Blender'),
        chip(S.motores.some(m => m.listo), '🤖 ' + (S.motores.filter(m => m.listo).map(m => m.nombre).join(' · ') || 'sin motores 3D'), 'Motores de IA instalados en este PC'),
        chip(!!(S.nube.trellis2 && S.nube.trellis2.sesion), (S.nube.trellis2 && S.nube.trellis2.sesion) ? '☁️ Nube gratis lista' : '☁️ Nube gratis: falta entrar', 'TRELLIS.2 en la nube gratuita de Hugging Face')]));
  };
  let reloj = null;
  import('../r8/estado.js').then(m => { E = m; quita = [m.escucha('tareas', pintaBarra), m.escucha('sistema', pintaBarra)]; m.sistema().catch(() => { }); pintaBarra(); reloj = setInterval(() => { if (m.enMarcha().length) pintaBarra(); }, 1000); });
  const vigia = setInterval(() => { if (E && !E.enMarcha().length) E.sistema(true).catch(() => { }); }, 30000);
  // ---------- la visita guiada ----------
  async function visita(desde) { const V = await import('../r8/visita.js'); V.empezar({ ir, desde, alSalir: () => { } }); }
  const alCambiarTam = () => document.documentElement.classList.toggle('r8-foco', foco && ancho());
  window.addEventListener('resize', alCambiarTam);
  ponFoco(foco); pinta(); ir(PEST);
  if (guardado('cd.r8.visita', '') === '') setTimeout(() => { if (document.body.contains(raiz)) visita(); }, 900);
  window.__r8ir = ir;
  return { destroy: () => { turno++; import('../store.js').then(st => st.pausaSync && st.pausaSync(false)).catch(() => { }); if (estudioVivo && estudioVivo.r !== actual) { try { estudioVivo.r.destroy(); } catch (e) { } } estudioVivo = null; clearInterval(reloj); clearInterval(vigia); quita.forEach(f => f()); window.removeEventListener('resize', alCambiarTam); document.documentElement.classList.remove('r8-foco'); try { actual && actual.destroy && actual.destroy(); } catch (e) { } import('../r8/visita.js').then(V => V.cerrar()).catch(() => { }); } };
}
