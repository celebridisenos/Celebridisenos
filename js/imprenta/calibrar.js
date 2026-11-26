// ================= 25-11-2026 · 🖨️ IMPRENTA · CALIBRAR la Epson ET-2860 (hojas de prueba + perfiles por papel) =================
// Lo que hay aquí:
//   1) HOJAS de prueba (colores, degradados, grises, nitidez, alineación, márgenes y una corta de «combinación»), dibujadas en mm
//      en un canvas (A4 vertical 210 × 297, todo dentro de la zona imprimible de 3 mm, salvo la hoja de márgenes, que lo necesita).
//   2) PERFILES (puro, sin pantalla): uno por papel/material. NADIE los marca como buenos salvo Biou, mirando la hoja física.
//   3) renderCalibrar(el, api): el asistente de 3 pasos.
// REGLAS: no se imprime nada sin que Biou lo confirme (siempre confirmDlg con hojas y papel). Ningún valor «calibrado» se inventa:
// los SUGERIDOS son puntos de partida SIN PROBAR y el estado solo pasa a 'elegido_por_biou' dentro de elegir().
// La Epson (leída de su controlador el 25-11-2026): tipos de papel y calidades de las listas de abajo; sin doble cara automática;
// sin bordes; 3 mm sin imprimir por cada lado. El gramaje máximo NO se conoce: «mira el manual de Epson».
import { PAPELES, MARGEN_EPSON, COLORES, PT_MM, papel as papelDe } from './modelo.js';
import { qrMatrix } from '../qr.js';

// ---------- listas REALES de la impresora ----------
// 26-11-2026: nombres en español como los del paquete (iguales que epson.js y el host), sin inglés.
export const TIPOS_PAPEL = [
  { v: 'psk:Plain', t: 'Papel normal' }, { v: 'psk:Bond', t: 'Papel de calidad fotográfica (inyección)' }, { v: 'psk:PhotographicMatte', t: 'Papel fotográfico mate' },
  { v: 'psk:HighResolution', t: 'Papel fotográfico ultra brillante' }, { v: 'psk:PhotographicHighGloss', t: 'Papel fotográfico brillante premium' },
  { v: 'psk:PhotographicSemiGloss', t: 'Papel fotográfico satinado' }, { v: 'ns0000:EpsonPhotoPaperGlossy', t: 'Papel fotográfico brillante' },
  { v: 'psk:EnvelopePlain', t: 'Sobre' }
];
export const CALIDADES = [{ v: 'ns0000:Draft', t: 'Borrador' }, { v: 'ns0000:Standard', t: 'Estándar' }, { v: 'ns0000:HighQuality', t: 'Alta' }]; // AdvancedSetting NO se usa en pruebas
export const COLORES_IMP = [{ v: 'psk:Color', t: 'Color' }, { v: 'psk:Monochrome', t: 'Blanco y negro' }];
const nombreDe = (lista, v) => (lista.find(x => x.v === v) || { t: String(v) }).t;
export const nombreTipo = v => nombreDe(TIPOS_PAPEL, v);
export const nombreCalidad = v => nombreDe(CALIDADES, v);
export const nombreColor = v => nombreDe(COLORES_IMP, v);

export const A4W = 210, A4H = 297;
const M = MARGEN_EPSON;                                   // 3 mm
const TINTA = COLORES.grafito;

// ---------- la lista de hojas ----------
// tinta: lo medido con cobertura() a 100 ppp (ver RELEVO / informe): baja < 12 %, media 12–30 %, alta > 30 %
export const HOJAS = [
  { id: 'colores', t: 'Colores', d: 'Mira cada parche con su letra-número (A1, B3…) y dime los que se ven apagados, con otro tono o rayados.', tinta: 'alta' },
  { id: 'degradados', t: 'Degradados', d: 'Busca escalones o rayas en las rampas: la suave es la buena.', tinta: 'media' },
  { id: 'grises', t: 'Negros y grises', d: 'Cuenta cuántos escalones distingues al principio y al final, y mira si algún gris tira a verde, rojo o azul.', tinta: 'media' },
  { id: 'nitidez', t: 'Nitidez', d: 'Apunta el texto más pequeño que se lee, la línea más fina que sale entera y si el QR más pequeño se escanea.', tinta: 'baja' },
  { id: 'alineacion', t: 'Alineación', d: 'Con una regla, mide cuánto se corre la hoja: ese número (en mm) es el desplazamiento X/Y.', tinta: 'baja' },
  { id: 'margenes', t: 'Márgenes', d: 'Mira desde qué raya (0, 1, 2… mm) empieza a salir tinta de verdad en cada borde.', tinta: 'baja' },
  { id: 'combinacion', t: 'Combinación (corta)', d: 'Una muestra de todo en media hoja, grande con el nombre de la combinación (P1, P2…) para compararlas juntas en la mesa.', tinta: 'baja' }
];
export const hojaInfo = id => HOJAS.find(x => x.id === id) || null;

// ================= PERFILES (puro) =================
const hoyIso = () => new Date().toISOString();
const hoyEs = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear(); };
const r1 = v => Math.round(v * 10) / 10;
const numMm = (v, def = 0) => { const n = Number(v); return v === '' || v === null || v === undefined || !isFinite(n) ? def : r1(n); };
const esDe = (lista, v) => lista.some(x => x.v === v);
const idPerfil = () => 'pf' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
export const ESTADOS = {
  sin_probar: { t: 'Sin probar', color: COLORES.piedra },
  en_prueba: { t: 'En prueba', color: COLORES.ambar },
  elegido_por_biou: { t: 'Elegido por Biou', color: COLORES.turquesa }
};

export function perfilNuevo(o = {}) {
  const tipo = o.tipo || 'psk:Plain', calidad = o.calidad || 'ns0000:Standard', color = o.color || 'psk:Color', papelId = o.papelId || 'A4';
  if (!esDe(TIPOS_PAPEL, tipo)) throw new Error('Tipo de papel que la Epson no tiene: ' + tipo);
  if (!esDe(CALIDADES, calidad)) throw new Error('Calidad que la Epson no tiene: ' + calidad);
  if (!esDe(COLORES_IMP, color)) throw new Error('Color que la Epson no tiene: ' + color);
  if (!PAPELES.some(p => p.id === papelId)) throw new Error('Tamaño de papel desconocido: ' + papelId);
  const ahora = hoyIso();
  return {
    id: o.id || idPerfil(), nombre: String(o.nombre || 'Papel nuevo').trim() || 'Papel nuevo', papelId, tipo, calidad, color,
    offx: numMm(o.offx), offy: numMm(o.offy), notas: String(o.notas || ''),
    estado: 'sin_probar', ronda: null,
    historial: [{ fecha: ahora, que: 'creado', texto: 'Perfil creado, sin probar.' }], creado: ahora, cambiado: ahora
  };
}

const NOTA_SUGERIDO = 'Punto de partida, sin probar. Lo decides tú mirando la hoja impresa.';
const sug = (id, nombre, tipo, calidad, extra) => Object.assign(perfilNuevo({ id, nombre, papelId: 'A4', tipo, calidad, color: 'psk:Color', notas: NOTA_SUGERIDO }), extra || {});
// SIN PROBAR: son solo la primera hipótesis razonable con las opciones reales del controlador.
export const SUGERIDOS = Object.freeze([
  sug('sug_normal', 'Papel normal', 'psk:Plain', 'ns0000:Standard'),
  sug('sug_cartulina', 'Cartulina mate', 'psk:PhotographicMatte', 'ns0000:Standard', { notas: NOTA_SUGERIDO + ' Mira en el manual de Epson hasta qué gramaje admite la bandeja.' }),
  sug('sug_foto_mate', 'Papel fotográfico mate', 'psk:PhotographicMatte', 'ns0000:HighQuality'),
  sug('sug_foto_brillo', 'Papel fotográfico brillante · Alta', 'ns0000:EpsonPhotoPaperGlossy', 'ns0000:HighQuality', { notas: 'Punto de partida, sin probar por ti aquí. La Claude del portátil lo probó en papel el 26-11 («ha quedado excelente», según su texto). Es el perfil por defecto de la Imprenta (epson.js).' }),
  sug('sug_pegatinas', 'Papel adhesivo para pegatinas', 'psk:PhotographicMatte', 'ns0000:Standard', { notas: NOTA_SUGERIDO + ' Si la hoja se atasca, prueba con «Normal».' }),
  sug('sug_sobres', 'Sobres', 'psk:EnvelopePlain', 'ns0000:Standard', { notas: NOTA_SUGERIDO + ' El tamaño del sobre no está en la lista de papeles: pruébalo con un sobre real.' })
].map(p => Object.freeze(p)));

// combinaciones = [{ tipo, calidad, color? }] → perfil con ronda { fecha, combos: [{ id:'P1', tipo, calidad, color }] }
export function rondaNueva(perfil, combinaciones) {
  const vistos = new Set(), combos = [];
  (combinaciones || []).forEach(c => {
    const tipo = c.tipo || perfil.tipo, calidad = c.calidad || perfil.calidad, color = c.color || perfil.color || 'psk:Color';
    if (!esDe(TIPOS_PAPEL, tipo) || !esDe(CALIDADES, calidad) || !esDe(COLORES_IMP, color)) throw new Error('Combinación que la Epson no tiene: ' + tipo + ' / ' + calidad + ' / ' + color);
    const k = tipo + '|' + calidad + '|' + color;
    if (vistos.has(k)) return;
    vistos.add(k); combos.push({ id: 'P' + (combos.length + 1), tipo, calidad, color });
  });
  if (!combos.length) throw new Error('Una ronda necesita al menos una combinación.');
  if (combos.length > 9) throw new Error('Más de 9 combinaciones en una ronda son muchas hojas: usa menos.');
  const ahora = hoyIso(), n = JSON.parse(JSON.stringify(perfil));
  n.ronda = { fecha: ahora, combos };
  if (n.estado !== 'elegido_por_biou') n.estado = 'en_prueba'; // lo elegido antes sigue valiendo hasta que Biou elija otra cosa
  n.historial.push({ fecha: ahora, que: 'ronda', texto: 'Ronda para comparar: ' + combos.map(c => c.id + ' ' + nombreTipo(c.tipo) + ' · ' + nombreCalidad(c.calidad)).join('; ') });
  n.cambiado = ahora;
  return n;
}

// SOLO se llama cuando Biou elige mirando las hojas. offset = { x, y } en mm medidos con regla (opcional).
export function elegir(perfil, comboId, notaDeBiou, offset) {
  const combo = perfil.ronda && perfil.ronda.combos.find(c => c.id === comboId);
  if (!combo) throw new Error('Esa combinación (' + comboId + ') no está en la ronda de este perfil.');
  const ahora = hoyIso(), n = JSON.parse(JSON.stringify(perfil));
  n.tipo = combo.tipo; n.calidad = combo.calidad; n.color = combo.color;
  if (offset && (offset.x !== undefined || offset.y !== undefined)) { n.offx = numMm(offset.x, n.offx); n.offy = numMm(offset.y, n.offy); }
  const nota = String(notaDeBiou || '').trim();
  if (nota) n.notas = nota; else if (n.notas === NOTA_SUGERIDO || /^Punto de partida, sin probar/.test(n.notas)) n.notas = '';
  n.estado = 'elegido_por_biou'; n.elegidoEn = ahora;
  n.historial.push({ fecha: ahora, que: 'elegido', combo: comboId, texto: 'Biou eligió ' + comboId + ' (' + nombreTipo(combo.tipo) + ' · ' + nombreCalidad(combo.calidad) + ')' + (nota ? ': ' + nota : '') + ' · desplazamiento X ' + n.offx + ' / Y ' + n.offy + ' mm' });
  n.ronda = null; n.cambiado = ahora;
  return n;
}

// Lo que se le manda a la impresora. Solo valores de las listas reales.
export function ajustesDeImpresion(perfil) {
  const tipo = esDe(TIPOS_PAPEL, perfil.tipo) ? perfil.tipo : 'psk:Plain';
  const calidad = esDe(CALIDADES, perfil.calidad) ? perfil.calidad : 'ns0000:Standard';
  const color = esDe(COLORES_IMP, perfil.color) ? perfil.color : 'psk:Color';
  const p = papelDe(perfil.papelId);
  return { tipo, calidad, color, offx: numMm(perfil.offx), offy: numMm(perfil.offy), papel: { id: p.id, t: p.t, w: p.w, h: p.h, ticket: p.ticket } };
}

// ================= DIBUJO =================
// % de superficie con tinta (aprox.): media de (1 − el canal más oscuro) de cada píxel. Blanco = 0, negro o cualquier color pleno = 1.
export function cobertura(canvas) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, d = g.getImageData(0, 0, W, H).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += 1 - Math.min(d[i], d[i + 1], d[i + 2]) / 255;
  return Math.round(s / (W * H) * 1000) / 10;
}

const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lum = hex => { const [r, gg, b] = rgb(hex); return (0.299 * r + 0.587 * gg + 0.114 * b) / 255; };
const mezcla = (a, b, t) => { const A = rgb(a), B = rgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };
const gris = p => { const v = Math.round(255 * (1 - p / 100)); return 'rgb(' + v + ',' + v + ',' + v + ')'; };

function texto(g, s, x, y, pt, o = {}) {
  g.font = (o.cursiva ? 'italic ' : '') + (o.peso || 400) + ' ' + (pt * PT_MM) + 'px ' + (o.fam || 'Inter, Manrope, Arial, sans-serif');
  g.fillStyle = o.color || TINTA; g.textAlign = o.alin || 'left'; g.textBaseline = o.base || 'top';
  g.fillText(s, x, y);
}
function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function lin(g, x1, y1, x2, y2, w, c) { g.strokeStyle = c || TINTA; g.lineWidth = w; g.lineCap = 'butt'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function marco(g, x, y, w, h, grosor, c) { g.strokeStyle = c || TINTA; g.lineWidth = grosor; g.strokeRect(x, y, w, h); }

const AJ0 = { tipo: 'psk:Plain', calidad: 'ns0000:Standard', color: 'psk:Color', papelId: 'A4' };
export const textoAjustes = a => 'Papel: ' + nombreTipo(a.tipo) + ' · Calidad: ' + nombreCalidad(a.calidad) + ' · Color: ' + nombreColor(a.color) + ' · Hoja A4';

// Cabecera pequeña en cada hoja: nombre de la prueba, fecha y ajustes. Devuelve la «y» donde empieza lo útil.
function cabecera(g, id, a, x0 = M + 1, y0 = M + 0.6) {
  const hj = hojaInfo(id);
  texto(g, 'CelebriDiseños · Prueba: ' + hj.t.toUpperCase() + ' · ' + hoyEs() + (a.id ? ' · ' + a.id : ''), x0, y0, 6, { peso: 700 });
  texto(g, textoAjustes(a), x0, y0 + 2.7, 5.5);
  return y0 + 7.4;
}

// ---------- 1 · colores ----------
const GRUPOS_COLOR = [
  { l: 'A', t: 'Primarios y secundarios', c: [['Rojo', '#FF0000'], ['Verde', '#00FF00'], ['Azul', '#0000FF'], ['Cian', '#00FFFF'], ['Magenta', '#FF00FF'], ['Amarillo', '#FFFF00']] },
  { l: 'B', t: 'Tintas puras (CMYK)', c: [['Cian', '#00AEEF'], ['Magenta', '#EC008C'], ['Amarillo', '#FFF200'], ['Negro', '#000000'], ['Gris 50 %', '#808080'], ['Papel (sin tinta)', '#FFFFFF']] },
  { l: 'C', t: 'Colores de marca', c: [['Grafito', COLORES.grafito], ['Carbón', COLORES.carbon], ['Piedra', COLORES.piedra], ['Hueso', COLORES.hueso], ['Turquesa', COLORES.turquesa], ['Turquesa logo', COLORES.turquesaLogo], ['Ámbar', COLORES.ambar], ['Lila', COLORES.lila], ['Pizarra', COLORES.pizarra], ['Pino', COLORES.pino], ['Oro', COLORES.oro], ['Arándano', COLORES.arandano]] },
  { l: 'D', t: 'Tonos de piel (de claro a oscuro)', c: [['Piel 1', '#FBE3D3'], ['Piel 2', '#F3C9A9'], ['Piel 3', '#E0A981'], ['Piel 4', '#C68863'], ['Piel 5', '#8D5A3B'], ['Piel 6', '#5C3A28']] },
  { l: 'E', t: 'Tonos de madera (de clara a oscura)', c: [['Madera 1', '#E8C99A'], ['Madera 2', '#D2A56B'], ['Madera 3', '#B07A44'], ['Madera 4', '#8A5A2E'], ['Madera 5', '#5E3B1F'], ['Madera 6', '#3E2614']] }
];
function hojaColores(g, a, y) {
  const anchoC = 34, pw = 31, ph = 25;
  GRUPOS_COLOR.forEach(gr => {
    texto(g, gr.l + ' · ' + gr.t, M, y, 6.5, { peso: 700 }); y += 3.8;
    gr.c.forEach(([nom, hex], i) => {
      const col = i % 6, fila = Math.floor(i / 6), x = M + col * anchoC, yy = y + fila * (ph + 6.4);
      rect(g, x, yy, pw, ph, hex);
      if (lum(hex) > 0.93) marco(g, x + 0.1, yy + 0.1, pw - 0.2, ph - 0.2, 0.2, COLORES.piedra);
      texto(g, gr.l + (i + 1), x + 1.4, yy + 1.2, 11, { peso: 800, color: lum(hex) > 0.55 ? '#000000' : '#FFFFFF' });
      texto(g, nom + ' ' + hex.toUpperCase(), x, yy + ph + 0.9, 5, { peso: 500 });
    });
    y += Math.ceil(gr.c.length / 6) * (ph + 6.4) + 1.2;
  });
}

// ---------- 2 · degradados ----------
const RAMPAS = [
  ['Cian', '#FFFFFF', '#00AEEF'], ['Magenta', '#FFFFFF', '#EC008C'], ['Amarillo', '#FFFFFF', '#FFF200'], ['Negro (gris de blanco a negro)', '#FFFFFF', '#000000'],
  ['Rojo', '#FFFFFF', '#FF0000'], ['Verde', '#FFFFFF', '#00FF00'], ['Azul', '#FFFFFF', '#0000FF'], ['Turquesa de marca', '#FFFFFF', COLORES.turquesa],
  ['Turquesa a grafito', COLORES.turquesa, COLORES.grafito], ['Ámbar a arándano', COLORES.ambar, COLORES.arandano], ['Lila a pizarra', COLORES.lila, COLORES.pizarra],
  ['Sombras: de negro a gris 20 %', '#000000', '#CCCCCC'], ['Luces: de blanco a gris 20 %', '#FFFFFF', '#CCCCCC']
];
function rampa(g, x, y, w, h, c1, c2, k) {
  const n = Math.max(2, Math.round(w * k));
  for (let i = 0; i < n; i++) rect(g, x + i * w / n, y, w / n + 0.02, h, mezcla(c1, c2, i / (n - 1)));
}
function hojaDegradados(g, a, y, k) {
  const x = 10, w = 190;
  RAMPAS.forEach(([nom, c1, c2], i) => {
    texto(g, (i + 1) + ' · ' + nom, x, y, 5.5, { peso: 600 });
    rampa(g, x, y + 3.2, w, 10, c1, c2, k);
    for (let t = 0; t <= 10; t++) lin(g, x + w * t / 10, y + 13.4, x + w * t / 10, y + (t % 5 === 0 ? 15.4 : 14.4), 0.15);
    texto(g, '0 %', x, y + 15.6, 4.5); texto(g, '50 %', x + w / 2, y + 15.6, 4.5, { alin: 'center' }); texto(g, '100 %', x + w, y + 15.6, 4.5, { alin: 'right' });
    y += 20.4;
  });
}

// ---------- 3 · negros y grises ----------
function filaGrises(g, titulo, valores, y, x0, ancho, ph, pie) {
  texto(g, titulo, M, y, 6.5, { peso: 700 }); y += 3.8;
  const pw = ancho / valores.length;
  valores.forEach((p, i) => {
    const x = x0 + i * pw; rect(g, x, y, pw - 0.6, ph, gris(p)); if (p < 3) marco(g, x + 0.1, y + 0.1, pw - 0.8, ph - 0.2, 0.15, COLORES.piedra);
    texto(g, String(p), x + (pw - 0.6) / 2, y + ph + 0.6, 4.8, { alin: 'center', peso: 600 });
  });
  if (pie) texto(g, pie, M, y + ph + 3.6, 5);
  return y + ph + (pie ? 8 : 4.8);
}
function hojaGrises(g, a, y) {
  y = filaGrises(g, 'Negro (tinta) de 0 a 100 %, de 5 en 5', Array.from({ length: 21 }, (_, i) => i * 5), y, M, 204, 26, '¿Cuántos escalones seguidos se distinguen? ¿Hay dos iguales juntos?');
  y = filaGrises(g, 'Los claros: de 0 a 10 %, de 1 en 1', Array.from({ length: 11 }, (_, i) => i), y, M, 204, 24, 'El 0 % es el papel. ¿Desde qué número se nota que ya hay tinta?');
  y = filaGrises(g, 'Los oscuros: de 90 a 100 %, de 1 en 1', Array.from({ length: 11 }, (_, i) => 90 + i), y, M, 204, 24, 'El 100 % es negro pleno. ¿Desde qué número se pierde la diferencia con el negro?');
  texto(g, 'Negro puro o negro mezclado', M, y, 6.5, { peso: 700 }); y += 3.8;
  const N = [['#000000', 'Negro #000000'], ['#0D0D0D', '#0D0D0D'], ['#1A1A1A', '#1A1A1A'], [COLORES.grafito, 'Grafito ' + COLORES.grafito], [COLORES.carbon, 'Carbón ' + COLORES.carbon]];
  N.forEach(([c, t], i) => { const x = M + i * 40.8; rect(g, x, y, 38, 18, c); texto(g, t, x, y + 18.6, 5, { peso: 500 }); });
  y += 22.6;
  texto(g, 'El controlador decide si el negro sale solo con tinta negra o mezclando las otras: mira si alguno tira a azul, marrón o verde.', M, y, 5); y += 5;
  texto(g, 'Neutralidad: tres grises grandes (25, 50 y 75 %)', M, y, 6.5, { peso: 700 }); y += 3.8;
  [25, 50, 75].forEach((p, i) => { const x = M + i * 68; rect(g, x, y, 66, 22, gris(p)); texto(g, p + ' %', x + 2, y + 1.5, 8, { peso: 800, color: p > 50 ? '#FFFFFF' : '#000000' }); });
  y += 24.4;
  texto(g, '¿Tiran a verde, a rojo o a azul? Apúntalo en la nota.', M, y, 5); y += 5.6;
  texto(g, 'Texto sobre fondo', M, y, 6.5, { peso: 700 }); y += 3.8;
  rect(g, M, y, 100, 14, '#000000'); texto(g, 'Blanco sobre negro · 6 pt', M + 2, y + 1.6, 6, { color: '#FFFFFF' }); texto(g, 'Blanco sobre negro · 10 pt negrita', M + 2, y + 6.6, 10, { color: '#FFFFFF', peso: 700 });
  rect(g, M + 104, y, 100, 14, gris(10)); texto(g, 'Negro sobre gris 10 % · 6 pt', M + 106, y + 1.6, 6); texto(g, 'Negro sobre gris 10 % · 10 pt negrita', M + 106, y + 6.6, 10, { peso: 700 });
}

// ---------- 4 · nitidez ----------
function estrella(g, cx, cy, r, pares) {
  const n = pares * 2;
  g.fillStyle = TINTA;
  for (let i = 0; i < n; i += 2) { g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, i * 2 * Math.PI / n, (i + 1) * 2 * Math.PI / n); g.closePath(); g.fill(); }
}
function qrEn(g, x, y, mod, datos) {
  const m = qrMatrix(datos, 'L'), n = m.length, q = 4, T = (n + 2 * q) * mod;
  rect(g, x, y, T, T, '#FFFFFF');
  g.fillStyle = '#000000';
  m.forEach((fila, r) => fila.forEach((v, c) => { if (v) g.fillRect(x + (c + q) * mod, y + (r + q) * mod, mod + 0.004, mod + 0.004); }));
  return T;
}
function hojaNitidez(g, a, y) {
  const y0 = y;
  texto(g, 'Texto de 4 a 14 pt, normal y negrita', M, y, 6.5, { peso: 700 }); y += 3.8;
  [4, 5, 6, 7, 8, 9, 10, 12, 14].forEach(pt => {
    const hl = pt * PT_MM * 1.25;
    texto(g, pt + ' pt normal · Hamburgefonstiv 0123456789 áéíóú ñ', M, y, pt, { peso: 400 }); y += hl;
    texto(g, pt + ' pt negrita · Hamburgefonstiv 0123456789 áéíóú ñ', M, y, pt, { peso: 800 }); y += hl + 0.4;
  });
  // estrella de Siemens
  const cx = 177, cy = y0 + 33, r = 26;
  estrella(g, cx, cy, r, 36);
  texto(g, 'Estrella de Siemens (Ø 52 mm)', cx, cy - r - 4.2, 5.5, { alin: 'center', peso: 600 });
  texto(g, 'Mira hasta qué círculo se ven los radios', cx, cy + r + 1.2, 4.8, { alin: 'center' });
  y = Math.max(y, cy + r + 6) + 2;
  // líneas finas
  texto(g, 'Líneas finas (grosor en mm) · horizontales y verticales', M, y, 6.5, { peso: 700 }); y += 4;
  const G = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5];
  G.forEach((w, i) => { const yy = y + i * 4.4; lin(g, M + 11, yy + 1.4, M + 91, yy + 1.4, w); texto(g, w.toFixed(2).replace('.', ',') + ' mm', M, yy, 5); });
  G.forEach((w, i) => { const xx = M + 106 + i * 12; lin(g, xx, y, xx, y + 24, w); texto(g, w.toFixed(2).replace('.', ',') + '', xx, y + 25.4, 4.6, { alin: 'center' }); });
  // pares de líneas muy juntas (¿se separan?)
  texto(g, 'Pares separados 0,2 / 0,3 / 0,5 mm', M + 193 - 40, y - 4, 4.8, { alin: 'right' });
  [0.2, 0.3, 0.5].forEach((s, i) => { const x1 = M + 156 + i * 14; lin(g, x1, y + 2, x1, y + 16, 0.2); lin(g, x1 + s, y + 2, x1 + s, y + 16, 0.2); texto(g, String(s).replace('.', ','), x1 + 1, y + 17, 4.6, { alin: 'center' }); });
  y += 33;
  // QR
  texto(g, 'QR de prueba: el tamaño del módulo está escrito debajo. ¿Cuál se escanea con el móvil?', M, y, 6.5, { peso: 700 }); y += 4;
  let x = M;
  [0.25, 0.3, 0.4, 0.5, 0.6].forEach(mod => {
    const dat = 'CD-CAL ' + mod.toFixed(2), T = qrEn(g, x, y, mod, dat), lado = qrMatrix(dat, 'L').length * mod;
    texto(g, 'módulo ' + mod.toFixed(2).replace('.', ',') + ' mm', x, y + T + 0.6, 4.8, { peso: 600 });
    texto(g, 'QR ' + lado.toFixed(1).replace('.', ',') + ' mm', x, y + T + 3, 4.6);
    x += Math.max(T, 30) + 4;
  });
  y += 29 * 0.6 + 8;
  // texto al revés (blanco sobre color) y texto sobre color
  texto(g, 'Texto sobre fondos de color', M, y, 6.5, { peso: 700 }); y += 3.8;
  [[COLORES.turquesa, '#FFFFFF', 'Blanco sobre turquesa'], [COLORES.grafito, '#FFFFFF', 'Blanco sobre grafito'], [COLORES.ambar, '#000000', 'Negro sobre ámbar'], [COLORES.hueso, COLORES.grafito, 'Grafito sobre hueso']].forEach(([f, c, t], i) => {
    const xx = M + i * 51; rect(g, xx, y, 49, 15, f); if (lum(f) > 0.93) marco(g, xx + 0.1, y + 0.1, 48.8, 14.8, 0.2, COLORES.piedra);
    texto(g, t + ' 6 pt', xx + 1.5, y + 1.5, 6, { color: c }); texto(g, t + ' 9 pt', xx + 1.5, y + 6, 9, { color: c, peso: 700 });
  });
}

// ---------- 5 · alineación ----------
function cruz(g, x, y, brazo, w) { lin(g, x - brazo, y, x + brazo, y, w); lin(g, x, y - brazo, x, y + brazo, w); }
function regla(g, horizontal, fijo, desde, hasta, haciaDentro) {
  // marcas de 1 mm (0,1 mm), de 5 mm (0,15) y de 10 mm (0,2 con número) desde la esquina del PAPEL
  const s = haciaDentro ? 1 : -1;
  for (let v = Math.ceil(desde); v <= hasta; v++) {
    const L = v % 10 === 0 ? 3 : v % 5 === 0 ? 2.2 : 1.2, w = v % 10 === 0 ? 0.2 : v % 5 === 0 ? 0.15 : 0.1;
    if (horizontal) lin(g, v, fijo, v, fijo + s * L, w); else lin(g, fijo, v, fijo + s * L, v, w);
    if (v % 10 === 0 && v > 0) { if (horizontal) texto(g, String(v), v, fijo + s * 3.4 - (s < 0 ? 1.8 : 0), 4.5, { alin: 'center' }); else texto(g, String(v), fijo + s * 3.4 - (s < 0 ? 4 : 0), v, 4.5, { base: 'middle', alin: 'left' }); }
  }
}
function hojaAlineacion(g, a) {
  // reglas en los 4 bordes, en mm desde el borde del papel (0 = esquina izquierda/arriba del PAPEL)
  regla(g, true, M + 0.2, M + 1, A4W - M - 1, true); regla(g, true, A4H - M - 0.2, M + 1, A4W - M - 1, false);
  regla(g, false, M + 0.2, 16, 284, true); regla(g, false, A4W - M - 0.2, 16, 284, false);
  marco(g, 10, 10, 190, 277, 0.2);
  texto(g, 'Marco a 10 mm de cada borde del papel', 12, 11.2, 4.8);
  [[22, 24], [105, 24], [188, 24], [22, 148.5], [105, 148.5], [188, 148.5], [22, 268], [105, 268], [188, 268]].forEach(([x, y]) => {
    cruz(g, x, y, 6, 0.2); g.strokeStyle = TINTA; g.lineWidth = 0.15; g.beginPath(); g.arc(x, y, 2.5, 0, 6.2832); g.stroke();
    texto(g, 'X ' + x + ' · Y ' + String(y).replace('.', ','), x, y + 7.4, 5, { alin: 'center' });
  });
  const t = ['CÓMO MEDIR (con una regla de metal, en mm)', '1. Pon la hoja sin mover. Mide desde el borde IZQUIERDO del papel hasta la línea central vertical de las cruces del medio.',
    '   Tendría que dar 105 mm. Si da 106, el desplazamiento X es +1,0 (se corre a la derecha).',
    '2. Mide desde el borde de ARRIBA hasta la línea central horizontal de la cruz del medio. Tendría que dar 148,5 mm.',
    '   Si da 147,5, el desplazamiento Y es −1,0 (se corre hacia arriba).',
    '3. Mira también si el marco se ve torcido: mide su lado de arriba y el de abajo (debe dar 190 mm) y los lados (277 mm).',
    '4. Apunta X e Y en el paso 3 del asistente. Esta hoja se imprime SIN corregir el desplazamiento.'];
  t.forEach((s, i) => texto(g, s, 22, 52 + i * 5.2, i === 0 ? 7 : 5.8, { peso: i === 0 ? 800 : 400 }));
}

// ---------- 6 · márgenes (la ÚNICA que pinta dentro de los 3 mm, a propósito) ----------
function hojaMargenes(g, a) {
  const L = 80, W = 0.3;
  for (let d = 0; d <= 10; d++) {
    const c = d <= M ? TINTA : TINTA;
    lin(g, 65, d, 65 + L, d, W, c); lin(g, 65, A4H - d, 65 + L, A4H - d, W, c);          // arriba y abajo
    lin(g, d, 108, d, 108 + L, W, c); lin(g, A4W - d, 108, A4W - d, 108 + L, W, c);      // izquierda y derecha
    // los números van DENTRO de la zona imprimible, unidos a su raya con una guía fina (las rayas 0–2 caen fuera)
    const esc = 4.2, e = 65 + L, ye = 108 + L, ly = 5 + d * 1.9, lx = 5 + d * 3.2;
    lin(g, e + 0.5, d, e + 7, ly + 0.7, 0.08); texto(g, String(d), e + 7.6, ly, esc, { peso: 700 });
    lin(g, e + 0.5, A4H - d, e + 7, A4H - ly - 0.7, 0.08); texto(g, String(d), e + 7.6, A4H - ly - 1.4, esc, { peso: 700 });
    lin(g, d, ye + 0.5, lx, ye + 7, 0.08); texto(g, String(d), lx, ye + 7.4, esc, { peso: 700, alin: 'center' });
    lin(g, A4W - d, ye + 0.5, A4W - lx, ye + 7, 0.08); texto(g, String(d), A4W - lx, ye + 7.4, esc, { peso: 700, alin: 'center' });
  }
  // marco del área imprimible (3 mm) a rayas
  g.save(); g.setLineDash([2, 2]); marco(g, M, M, A4W - 2 * M, A4H - 2 * M, 0.2, COLORES.turquesa); g.restore();
  texto(g, 'CelebriDiseños · Prueba: MÁRGENES · ' + hoyEs() + (a.id ? ' · ' + a.id : ''), 20, 30, 6, { peso: 700 });
  texto(g, textoAjustes(a), 20, 32.7, 5.5);
  const t = ['CÓMO LEERLA', 'Cada raya está a ese número de milímetros del borde del papel (la 0 está justo en el borde).',
    'En cada borde, la primera raya que sale ENTERA es donde de verdad empieza a pintar la impresora.',
    'La Epson dice 3 mm: las rayas 0, 1 y 2 deberían NO salir (o salir cortadas).',
    'Apunta en la nota el número de la primera raya completa de cada lado (arriba, abajo, izquierda, derecha).',
    'La línea turquesa a rayas es el margen de 3 mm que dice el controlador.',
    'Si una raya sale cortada o pegada al borde, no pasa nada: esta hoja se hace justo para verlo.'];
  t.forEach((s, i) => texto(g, s, 20, 50 + i * 5.6, i === 0 ? 7 : 5.8, { peso: i === 0 ? 800 : 400 }));
  texto(g, 'ARRIBA ↑', 105, 14, 5, { alin: 'center', peso: 700 }); texto(g, 'ABAJO ↓', 105, A4H - 18, 5, { alin: 'center', peso: 700 });
  texto(g, 'IZQUIERDA', 14, 100, 5, { peso: 700 }); texto(g, 'DERECHA', A4W - 14, 100, 5, { peso: 700, alin: 'right' });
}

// ---------- 7 · combinación (corta) ----------
function hojaCombinacion(g, a, _y, k) {
  const id = a.id || 'P?';
  texto(g, id, M + 2, M + 1.5, 70, { peso: 800, color: COLORES.turquesa });
  texto(g, nombreTipo(a.tipo), 68, M + 3, 16, { peso: 800 });
  texto(g, 'Calidad ' + nombreCalidad(a.calidad) + ' · ' + nombreColor(a.color), 68, M + 12, 11, { peso: 600 });
  texto(g, 'CelebriDiseños · Combinación · ' + hoyEs() + ' · Hoja A4', 68, M + 19.5, 6);
  let y = 38;
  const col = [['Cian', '#00AEEF'], ['Magenta', '#EC008C'], ['Amarillo', '#FFF200'], ['Negro', '#000000'], ['Rojo', '#FF0000'], ['Verde', '#00FF00'], ['Azul', '#0000FF'], ['Turquesa', COLORES.turquesa]];
  col.forEach(([n, c], i) => { const x = M + i * 25.5; rect(g, x, y, 24, 10, c); texto(g, n, x, y + 10.5, 5); });
  y += 17;
  for (let i = 0; i <= 10; i++) { const x = M + i * 18.5; rect(g, x, y, 17.5, 8, gris(i * 10)); if (i === 0) marco(g, x + 0.1, y + 0.1, 17.3, 7.8, 0.15, COLORES.piedra); texto(g, String(i * 10), x, y + 8.4, 4.6); }
  y += 14;
  rampa(g, M, y, 204, 6, '#FFFFFF', COLORES.turquesa, k); y += 7; rampa(g, M, y, 204, 6, '#000000', '#FFFFFF', k); y += 10;
  [[6, 400], [8, 400], [10, 400], [7, 800]].forEach(([pt, pe]) => { texto(g, pt + ' pt ' + (pe > 500 ? 'negrita' : 'normal') + ' · Hamburgefonstiv 0123456789 áéíóú', M, y, pt, { peso: pe }); y += pt * PT_MM * 1.3; });
  y += 3;
  [0.1, 0.2, 0.3, 0.5].forEach((w, i) => { lin(g, M, y + i * 3.4, M + 60, y + i * 3.4, w); texto(g, String(w).replace('.', ',') + ' mm', M + 63, y + i * 3.4 - 1, 4.6); });
  qrEn(g, 100, y - 3, 0.4, 'CD-CAL ' + id);
  texto(g, 'QR módulo 0,40 mm', 100, y + 14, 4.6);
  estrella(g, 165, y + 7, 11, 24); texto(g, 'Siemens Ø 22 mm', 165, y + 19, 4.6, { alin: 'center' });
  y += 28;
  cruz(g, 20, y + 6, 6, 0.2); texto(g, 'cruz a 20 mm del borde izq.', 29, y + 5, 5);
  for (let v = 0; v <= 40; v++) { const L = v % 10 === 0 ? 3 : v % 5 === 0 ? 2.2 : 1.2; lin(g, 100 + v, y + 3, 100 + v, y + 3 + L, v % 10 === 0 ? 0.2 : 0.1); if (v % 10 === 0) texto(g, String(v), 100 + v, y + 7, 4.4, { alin: 'center' }); }
  texto(g, 'regla en mm', 150, y + 4, 4.6);
  y += 14;
  g.save(); g.setLineDash([1.5, 1.5]); lin(g, M, y, A4W - M, y, 0.15, COLORES.piedra); g.restore();
  texto(g, '✂ Aquí acaba la muestra: el resto de la hoja está en blanco (puedes cortarla y guardar el trozo de abajo).', M, y + 1.4, 5, { color: COLORES.piedra });
}

const DIBUJOS = { colores: hojaColores, degradados: hojaDegradados, grises: hojaGrises, nitidez: hojaNitidez, alineacion: hojaAlineacion, margenes: hojaMargenes, combinacion: hojaCombinacion };

// g = CanvasRenderingContext2D de A4 vertical; k = píxeles por mm. Se pinta en mm (la escala se pone aquí).
export function dibujarHoja(id, g, k, ajustes) {
  if (!DIBUJOS[id]) throw new Error('Hoja de prueba desconocida: ' + id);
  const a = Object.assign({}, AJ0, ajustes || {});
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, Math.round(A4W * k), Math.round(A4H * k));
  g.scale(k, k);
  g.imageSmoothingEnabled = true;
  const solo = ['alineacion', 'margenes', 'combinacion'].includes(id);          // estas llevan su propia cabecera
  const y = solo ? 0 : cabecera(g, id, a);
  DIBUJOS[id](g, a, y, k);
  g.restore();
}

export function hojaCanvas(id, { dpi = 300, ajustes } = {}) {
  const k = dpi / 25.4, c = document.createElement('canvas');
  c.width = Math.round(A4W * k); c.height = Math.round(A4H * k);
  dibujarHoja(id, c.getContext('2d', { willReadFrequently: true }), k, ajustes);
  return c;
}

// ================= INTERFAZ =================
const CSS = `
.imp-cal{color:#1F2328;max-width:980px;margin:0 auto;padding:12px 16px 40px;font-family:Inter,Manrope,system-ui,sans-serif}
.imp-cal h2{font-size:20px;margin:0 0 4px}
.imp-cal-sub{color:#4A4F57;font-size:14px;margin:0 0 12px}
.imp-cal-pasos{display:flex;gap:8px;margin:10px 0 16px;flex-wrap:wrap}
.imp-cal-paso{flex:1 1 150px;border:2px solid #1F2328;border-radius:12px;padding:10px 12px;background:#F6F5F2;cursor:pointer;font-weight:700;font-size:15px;text-align:left}
.imp-cal-paso.on{background:#1F2328;color:#F6F5F2}
.imp-cal-paso[disabled]{opacity:.45;cursor:default}
.imp-cal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.imp-cal-card{border-radius:14px;padding:14px;color:#1F2328;cursor:pointer;border:3px solid transparent;text-align:left;font:inherit;min-height:120px;display:flex;flex-direction:column;gap:4px}
.imp-cal-card.sel{border-color:#1F2328;box-shadow:0 0 0 3px #F6F5F2 inset}
.imp-cal-card b{font-size:16px}.imp-cal-card span{font-size:13px}
.imp-cal-card.nuevo{background:#F6F5F2;border:2px dashed #1F2328}
.imp-cal-est{font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.imp-cal-bloque{background:#F6F5F2;border-radius:14px;padding:14px;margin:12px 0}
.imp-cal-hojas{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.imp-cal-chip{border:2px solid #1F2328;border-radius:999px;padding:6px 12px;background:#fff;cursor:pointer;font:inherit;font-size:14px;font-weight:600}
.imp-cal-chip.on{background:#00A6A6;color:#1F2328}
.imp-cal-visor{display:block;margin:10px auto;width:100%;max-width:560px;border:1px solid #8A8F98;background:#fff;box-shadow:0 2px 10px rgba(31,35,40,.25)}
.imp-cal-acc{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.imp-cal-big{display:flex;gap:10px;flex-wrap:wrap}
.imp-cal-elige{border:3px solid #1F2328;background:#fff;border-radius:14px;padding:12px 16px;min-width:140px;cursor:pointer;font:inherit;text-align:left}
.imp-cal-elige b{font-size:30px;display:block;color:#00A6A6}
.imp-cal-elige.on{background:#00A6A6;color:#1F2328}.imp-cal-elige.on b{color:#1F2328}
.imp-cal-fila{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin:8px 0}
.imp-cal-fila label{display:flex;flex-direction:column;font-size:13px;gap:3px;font-weight:600}
.imp-cal-fila input,.imp-cal-fila select,.imp-cal-bloque textarea{font:inherit;padding:8px;border:1px solid #8A8F98;border-radius:8px;background:#fff}
.imp-cal-aviso{background:#FFF3DC;border-left:5px solid #E0922F;padding:8px 12px;border-radius:8px;font-size:14px;margin:8px 0}
.imp-cal-nota{font-size:13px;color:#4A4F57}
`;

export async function renderCalibrar(el, api) {
  const U = await import('../ui.js');
  const { h, mount, btn, toast, confirmDlg } = U;
  if (!document.getElementById('imp-cal-css')) { const s = document.createElement('style'); s.id = 'imp-cal-css'; s.textContent = CSS; document.head.appendChild(s); }
  el.classList.add('imp-cal-raiz');
  const S = { paso: 1, perfiles: [], selId: null, hoja: 'colores', caps: null, combo: '' };
  try { S.perfiles = (await api.leerPerfiles()) || []; } catch (e) { S.perfiles = []; }
  try { S.caps = await api.capacidades(); } catch (e) { S.caps = null; }
  const perfil = () => S.perfiles.find(p => p.id === S.selId) || null;
  const guardar = async () => { try { await api.guardarPerfiles(S.perfiles); } catch (e) { toast('No se pudo guardar los perfiles: ' + (e && e.message || e), 'bad'); } };
  const poner = async nuevo => { S.perfiles = S.perfiles.map(p => p.id === nuevo.id ? nuevo : p); await guardar(); };
  const opt = (lista, v) => lista.map(o => { const op = h('option', { value: o.v }, o.t); if (o.v === v) op.selected = true; return op; });
  const hojaAjustes = (p, comboId, hoja) => {
    const base = ajustesDeImpresion(p), c = p.ronda && comboId ? p.ronda.combos.find(x => x.id === comboId) : null;
    const med = hoja === 'alineacion' || hoja === 'margenes';                // para medir se imprime SIN corregir el desplazamiento
    return { tipo: c ? c.tipo : base.tipo, calidad: c ? c.calidad : base.calidad, color: c ? c.color : base.color, offx: med ? 0 : base.offx, offy: med ? 0 : base.offy, papel: papelDe('A4'), papelId: 'A4', id: c ? c.id : '' };
  };

  const pinta = () => {
    const p = perfil();
    const pasos = h('div.imp-cal-pasos', [['1 · El papel', 1, true], ['2 · La hoja de prueba', 2, !!p], ['3 · ¿Cuál salió mejor?', 3, !!p]].map(([t, n, ok]) =>
      h('button.imp-cal-paso' + (S.paso === n ? '.on' : ''), { type: 'button', disabled: !ok, onclick: () => { S.paso = n; pinta(); } }, t)));
    const cab = [h('h2', 'Calibrar la impresora'), h('p.imp-cal-sub', 'Epson ET-2860. Imprimes una hoja, la miras con tus ojos y eliges tú. Yo no doy nada por bueno.'), pasos];
    mount(el, cab, S.paso === 1 ? paso1() : S.paso === 2 && p ? paso2(p) : p ? paso3(p) : paso1());
  };

  // ---------- paso 1 ----------
  function tarjeta(p, onclick, extra) {
    const e = ESTADOS[p.estado] || ESTADOS.sin_probar;
    return h('button.imp-cal-card' + (p.id === S.selId ? '.sel' : ''), { type: 'button', style: { background: e.color }, onclick },
      h('span.imp-cal-est', e.t), h('b', p.nombre), h('span', nombreTipo(p.tipo) + ' · ' + nombreCalidad(p.calidad)),
      h('span', 'Desplazamiento X ' + String(p.offx).replace('.', ',') + ' · Y ' + String(p.offy).replace('.', ',') + ' mm'), extra || null);
  }
  function paso1() {
    const sugeridos = SUGERIDOS.filter(s => !S.perfiles.some(p => p.id === s.id));
    const nombre = U.inp({ placeholder: 'Ej.: Cartulina 250 g', value: '' });
    const tipo = h('select', opt(TIPOS_PAPEL, 'psk:Plain')), cal = h('select', opt(CALIDADES, 'ns0000:Standard')), col = h('select', opt(COLORES_IMP, 'psk:Color'));
    return [
      h('h3', 'Elige el papel o material'),
      S.perfiles.length ? h('div.imp-cal-grid', S.perfiles.map(p => tarjeta(p, () => { S.selId = p.id; S.paso = 2; S.combo = ''; pinta(); }))) : h('p.imp-cal-nota', 'Todavía no hay ningún papel guardado. Coge un punto de partida de abajo o crea uno nuevo.'),
      sugeridos.length ? h('div.imp-cal-bloque', h('b', 'Puntos de partida (sin probar)'), h('p.imp-cal-nota', 'Son solo una primera idea con las opciones que tiene tu Epson. Hasta que tú los pruebes no valen como buenos.'),
        h('div.imp-cal-grid', sugeridos.map(s => tarjeta(s, async () => { S.perfiles = S.perfiles.concat([JSON.parse(JSON.stringify(s))]); S.selId = s.id; await guardar(); S.paso = 2; pinta(); })))) : null,
      h('div.imp-cal-bloque', h('b', 'Otro papel o material'),
        h('div.imp-cal-fila', h('label', 'Nombre', nombre), h('label', 'Tipo de papel en la Epson', tipo), h('label', 'Calidad', cal), h('label', 'Color', col),
          btn('Crear', async () => {
            if (!nombre.value.trim()) { toast('Ponle un nombre al papel', 'bad'); return; }
            try { const n = perfilNuevo({ nombre: nombre.value, tipo: tipo.value, calidad: cal.value, color: col.value, notas: 'Creado por ti, sin probar.' }); S.perfiles = S.perfiles.concat([n]); S.selId = n.id; await guardar(); S.paso = 2; pinta(); } catch (e) { toast(e.message, 'bad'); }
          }, { cls: 'primary' })),
        h('p.imp-cal-nota', 'Si no sabes el gramaje máximo que admite tu bandeja, mira el manual de Epson.'))
    ];
  }

  // ---------- paso 2 ----------
  function paso2(p) {
    const info = hojaInfo(S.hoja), aj = hojaAjustes(p, S.combo, S.hoja);
    const prev = hojaCanvas(S.hoja, { dpi: 100, ajustes: aj }); const cob = cobertura(prev); prev.className = 'imp-cal-visor'; // (no tocar width/height: vaciaría el canvas)
    const combos = p.ronda ? p.ronda.combos : [];
    const imprimibles = S.hoja === 'combinacion' && combos.length ? combos.map(c => c.id) : [S.combo || ''];
    const texPapel = c => { const a = hojaAjustes(p, c, S.hoja); return nombreTipo(a.tipo) + ' · ' + nombreCalidad(a.calidad); };
    const imprimir = async ids => {
      const n = ids.length, tot = Math.round(cob * 10) / 10;
      const ok = await confirmDlg('¿Imprimo?', 'Vas a gastar ' + n + (n === 1 ? ' hoja' : ' hojas') + ' A4 de «' + (ids.length === 1 ? texPapel(ids[0]) : ids.map(texPapel).join(' + ')) + '» y tinta (≈' + String(tot).replace('.', ',') + ' % de ' + (n === 1 ? 'la hoja' : 'cada hoja') + '). ¿' + (n === 1 ? 'La' : 'Las') + ' imprimo?', 'Sí, imprimir', false);
      if (!ok) return;
      try { for (const c of ids) { const a = hojaAjustes(p, c, S.hoja); await api.imprimir([{ canvas: hojaCanvas(S.hoja, { dpi: 300, ajustes: a }), wmm: A4W, hmm: A4H }], a); } toast('Mandado a la impresora', 'ok'); } catch (e) { toast('No se pudo imprimir: ' + (e && e.message || e), 'bad'); }
    };
    const pdf = async () => {
      try { await api.exportarPdf(imprimibles.map(c => ({ canvas: hojaCanvas(S.hoja, { dpi: 200, ajustes: hojaAjustes(p, c, S.hoja) }), wmm: A4W, hmm: A4H })), 'Prueba ' + info.t + ' ' + p.nombre); toast('PDF listo', 'ok'); } catch (e) { toast('No se pudo guardar el PDF: ' + (e && e.message || e), 'bad'); }
    };
    // ronda
    const ronTipo = h('select', opt(TIPOS_PAPEL, p.tipo)), ronCal = h('select', opt(CALIDADES, p.calidad));
    let pend = (p.ronda ? p.ronda.combos : []).map(c => ({ tipo: c.tipo, calidad: c.calidad, color: c.color }));
    const listaRonda = h('div');
    const pintaLista = () => mount(listaRonda, pend.length ? h('div.imp-cal-big', pend.map((c, i) => h('button.imp-cal-chip', { type: 'button', title: 'Quitar', onclick: () => { pend.splice(i, 1); pintaLista(); } }, 'P' + (i + 1) + ' · ' + nombreTipo(c.tipo) + ' · ' + nombreCalidad(c.calidad) + '  ✕'))) : h('p.imp-cal-nota', 'Aún no hay combinaciones. Añade al menos dos para poder compararlas.'));
    pintaLista();
    return [
      h('div.imp-cal-fila', tarjeta(p, () => { S.paso = 1; pinta(); })),
      h('h3', 'Hoja de prueba'),
      h('div.imp-cal-hojas', HOJAS.map(x => h('button.imp-cal-chip' + (x.id === S.hoja ? '.on' : ''), { type: 'button', onclick: () => { S.hoja = x.id; pinta(); } }, x.t))),
      h('p', h('b', 'Qué mirar: '), info.d),
      h('p.imp-cal-nota', 'Gasta ≈ ' + String(cob).replace('.', ',') + ' % de la hoja (tinta ' + info.tinta + ') · papel: ' + nombreTipo(aj.tipo) + ' · calidad: ' + nombreCalidad(aj.calidad) + ' · ' + nombreColor(aj.color) + '. ' + (S.hoja === 'alineacion' || S.hoja === 'margenes' ? 'Se imprime sin corregir el desplazamiento, para poder medirlo.' : '')),
      !S.caps ? h('div.imp-cal-aviso', 'Aquí no veo la impresora (no es el PC del taller). Puedes mirar las hojas y guardar el PDF; para imprimir abre el programa en el PC.') : null,
      prev,
      h('div.imp-cal-acc',
        S.caps ? (S.hoja === 'combinacion' && combos.length > 1
          ? [btn('Imprimir ' + combos.length + ' hojas (una por combinación)', () => imprimir(imprimibles), { cls: 'primary' }), ...combos.map(c => btn('Solo ' + c.id, () => imprimir([c.id])))]
          : [btn('Imprimir 1 hoja', () => imprimir([imprimibles[0]]), { cls: 'primary' })]) : null,
        btn('Guardar PDF', pdf)),
      p.ronda && S.hoja !== 'combinacion' ? h('div.imp-cal-fila', h('label', 'Imprimir con los ajustes de', h('select', { onchange: e => { S.combo = e.target.value; pinta(); } }, [h('option', { value: '' }, 'El perfil (' + nombreTipo(p.tipo) + ' · ' + nombreCalidad(p.calidad) + ')'), ...combos.map(c => { const o = h('option', { value: c.id }, c.id + ' · ' + nombreTipo(c.tipo) + ' · ' + nombreCalidad(c.calidad)); if (c.id === S.combo) o.selected = true; return o; })]))) : null,
      h('div.imp-cal-bloque', h('b', 'Comparar combinaciones (papel + calidad)'),
        h('p.imp-cal-nota', 'Imprime la hoja «Combinación» una vez por cada una y ponlas juntas en la mesa. Cada hoja lleva su P1, P2… en grande.'),
        listaRonda,
        h('div.imp-cal-fila', h('label', 'Tipo de papel', ronTipo), h('label', 'Calidad', ronCal),
          btn('Añadir', () => { if (pend.length >= 9) { toast('Son muchas hojas: máximo 9', 'bad'); return; } if (pend.some(c => c.tipo === ronTipo.value && c.calidad === ronCal.value)) { toast('Esa ya está', 'bad'); return; } pend.push({ tipo: ronTipo.value, calidad: ronCal.value, color: p.color }); pintaLista(); }),
          btn('Guardar ronda', async () => { try { await poner(rondaNueva(p, pend)); S.combo = ''; S.hoja = 'combinacion'; toast('Ronda guardada', 'ok'); pinta(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'primary' }))),
      h('div.imp-cal-acc', btn('Ya las he impreso: elegir la mejor →', () => { S.paso = 3; pinta(); }, { cls: p.ronda ? 'primary' : '', disabled: !p.ronda }))
    ];
  }

  // ---------- paso 3 ----------
  function paso3(p) {
    if (!p.ronda) return [h('div.imp-cal-aviso', 'Todavía no hay una ronda para comparar. Vuelve al paso 2 y guarda al menos una combinación.'), btn('← Volver al paso 2', () => { S.paso = 2; pinta(); })];
    let elegida = '';
    const nota = h('textarea', { rows: 3, placeholder: 'Lo que has visto: colores, negros, bandas, olor a papel mojado… (opcional)', style: { width: '100%' } });
    const ox = h('input', { type: 'number', step: '0.1', value: String(p.offx), style: { width: '110px' } }), oy = h('input', { type: 'number', step: '0.1', value: String(p.offy), style: { width: '110px' } });
    const botGuardar = btn('Guardar como elegido', async () => {
      if (!elegida) return;
      try { const n = elegir(p, elegida, nota.value, { x: ox.value, y: oy.value }); await poner(n); toast('Guardado: «' + p.nombre + '» queda elegido por ti', 'ok'); S.paso = 1; pinta(); } catch (e) { toast(e.message, 'bad'); }
    }, { cls: 'primary', disabled: true });
    const botones = p.ronda.combos.map(c => h('button.imp-cal-elige', { type: 'button', onclick: ev => { elegida = c.id; botones.forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); botGuardar.disabled = false; } },
      h('b', c.id), h('span', nombreTipo(c.tipo)), h('br'), h('span', 'Calidad ' + nombreCalidad(c.calidad))));
    return [
      h('h3', '¿Cuál ha salido mejor?'),
      h('p.imp-cal-nota', 'Mira las hojas impresas juntas, con buena luz y cuando la tinta ya esté seca. El número que ves en grande en cada hoja es el de aquí.'),
      h('div.imp-cal-big', botones),
      h('div.imp-cal-bloque', h('b', 'Desplazamiento medido con regla (mm)'), h('p.imp-cal-nota', 'De la hoja «Alineación». Si no la has medido, déjalo como está.'),
        h('div.imp-cal-fila', h('label', 'X (derecha +)', ox), h('label', 'Y (abajo +)', oy))),
      h('div.imp-cal-bloque', h('b', 'Tu nota'), nota),
      h('div.imp-cal-acc', botGuardar, btn('← Volver', () => { S.paso = 2; pinta(); })),
      h('p.imp-cal-nota', 'Hasta que pulses «Guardar como elegido», este papel no cuenta como calibrado.')
    ];
  }

  pinta();
}
