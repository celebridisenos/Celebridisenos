// ================= 👗 CelebriDREW · pestaña 📷 FOTO: QUÉ FOTO SIRVE (guía con dibujos), MEDIR CON UNA FOTO calibrada con un folio A4 y CALIBRAR LA IMPRESORA =================
// La parte de cálculo está en drew/calibra.js (y su prueba en test/unit/drew_calibra.mjs); aquí solo la pantalla.
// · Medir con una foto: se elige la foto → el folio se busca solo → sus 4 esquinas se pueden arrastrar (con LUPA; ratón, dedo o lápiz;
//   «🎯 Ajustar al borde» las pega al borde del papel; flechas o botones = 1 píxel) → «Enderezar» → la foto sin perspectiva con los mm por
//   píxel sabidos → tocar dos puntos (o arrastrar) = una medida en cm; las puntas se pueden mover después → se puede LLEVAR una medida a la
//   prenda (los contornos de una prenda plana, ×2) y descargar la foto con las medidas.
// · Impresora: hoja de prueba → mide las dos rayas → se guarda la corrección (la usan los PDF A4 de CelebriDREW: drew/pdf.js) → hoja de
//   COMPROBACIÓN ya corregida para ver que da justo.
// · Con LÁPIZ (iPad): en cuanto se usa el lápiz, los toques de la mano apoyada no cuentan (dentro del calibrador).
// · 16-10 · 👗 SACAR EL PATRÓN de una foto (drew/foto/desde_foto.js): con la misma foto enderezada por el folio, la cadena foto → patrón recorta
//   la prenda (IA del PC si está; si no, por colores), dice qué prenda es (forma + IA de visión del PC si está), pone sus PUNTOS (axilas,
//   cuello, hombros, mangas, bajo, cintura…) y la mide; los puntos se ARRASTRAN (lupa, flechas, dedo, lápiz) y todo se vuelve a medir; cada
//   medida dice si está VISTA en la foto, SUPUESTA (no se ve) o POR CONFIRMAR; el patrón se dibuja ENCIMA de la foto a tamaño real y
//   «Crear el patrón» lo lleva a la prenda (o.crearPatron), que se ve en el 3D y el 2D.
import { h, btn, toast, modal } from '../ui.js';
import * as CA from './calibra.js';
import { cargaArchivo, imagenDe, pixeles } from '../r8/foto_medida.js';
import * as DF from './foto/desde_foto.js';
import { NOMBRES, usanPunto } from './foto/puntos.js';
import { CATEGORIAS } from './foto/clasifica.js';

const coma = (v, d = 1) => v.toFixed(d).replace('.', ',');
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, at = {}) => { const e = document.createElementNS(SVGNS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ROSA = '#c25d74', VERDE = '#2f7d4f', TINTA = '#1c1916', ORO = '#b0884f', AMBAR = '#c98a1b', ROJO = '#b3352e';
let ultima = null; // la última foto enderezada de esta sesión: { E (la imagen enderezada), medidas: [{ a, b, mm, k }], FP (su análisis para el patrón) }
export const ultimaFoto = () => ultima; // (para las pruebas)

// ---------- los DIBUJOS de la guía (120 × 80) ----------
const CAMI = 'M12 0 L4 4 L0 14 L7 17 L9 12 L9 36 L31 36 L31 12 L33 17 L40 14 L36 4 L28 0 Q20 6 12 0Z';
const cami = (x, y, s, fill, extra = '') => '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="' + CAMI + '" fill="' + fill + '" stroke="#1c1916" stroke-width="' + (1.2 / s).toFixed(2) + '" stroke-linejoin="round"' + extra + '/>';
const OK = '<circle cx="108" cy="12" r="8" fill="#2f7d4f"/><path d="M104 12 l3 3 l5 -6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
const NO = '<circle cx="108" cy="12" r="8" fill="#b3352e"/><path d="M104.5 8.5 l7 7 M111.5 8.5 l-7 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
const SUELO = '<rect x="6" y="40" width="96" height="36" rx="4" fill="#e9e1d3"/>';
const DIBUJOS = {
  arriba: SUELO + cami(38, 44, 0.75, '#c25d74') + '<rect x="40" y="4" width="34" height="12" rx="3" fill="#1c1916"/><circle cx="66" cy="10" r="2.6" fill="#7aa0d8"/><path d="M57 18 V38" stroke="#1c1916" stroke-width="1.4" stroke-dasharray="3 2.5"/><path d="M53 33 L57 39 L61 33" fill="none" stroke="#1c1916" stroke-width="1.4"/>' + OK,
  plana: SUELO + cami(36, 40, 0.92, '#c25d74') + '<path d="M30 52 h-12 M18 52 l4 -3 M18 52 l4 3 M80 52 h12 M92 52 l-4 -3 M92 52 l-4 3" stroke="#2f7d4f" stroke-width="1.6" fill="none" stroke-linecap="round"/>' + OK,
  fondo: '<rect x="6" y="18" width="96" height="58" rx="4" fill="#2c2a2e"/>' + cami(36, 26, 0.95, '#f3eee6') + OK,
  luz: SUELO + '<rect x="8" y="4" width="26" height="30" rx="2" fill="#f6e7c8" stroke="#b0884f" stroke-width="1.2"/><path d="M21 4 V34 M8 19 H34" stroke="#b0884f" stroke-width="1.2"/><path d="M36 22 L50 40 M34 30 L44 44 M30 34 L36 46" stroke="#e8c547" stroke-width="1.6" stroke-linecap="round"/>' + cami(52, 42, 0.75, '#c25d74') + OK,
  folio: SUELO + cami(14, 42, 0.75, '#c25d74') + '<rect x="66" y="44" width="21" height="29.7" fill="#fffdf8" stroke="#1c1916" stroke-width="1"/><text x="76.5" y="62" font-size="8" text-anchor="middle" font-family="Arial" font-weight="700" fill="#1c1916">A4</text>' + OK,
  entera: '<rect x="20" y="6" width="70" height="70" rx="8" fill="#fbf8f3" stroke="#1c1916" stroke-width="1.4"/>' + cami(37, 22, 0.9, '#c25d74') + '<path d="M26 16 v-4 h4 M84 16 v-4 h-4 M26 66 v4 h4 M84 66 v4 h-4" stroke="#2f7d4f" stroke-width="1.5" fill="none"/>' + OK,
  // lo que NO sirve
  torcida: SUELO + '<g transform="rotate(-24 55 58)">' + cami(36, 42, 0.75, '#c25d74') + '</g><rect x="8" y="6" width="34" height="12" rx="3" fill="#1c1916" transform="rotate(-30 25 12)"/><path d="M34 22 L52 40" stroke="#1c1916" stroke-width="1.4" stroke-dasharray="3 2.5"/>' + NO,
  arrugada: SUELO + '<path transform="translate(36 42) scale(0.8)" d="M12 0 L6 6 L3 14 L9 15 L10 12 L8 22 L12 30 L9 36 L22 33 L31 36 L28 26 L32 18 L30 12 L33 15 L38 10 L34 4 L28 0 Q20 7 12 0Z" fill="#c25d74" stroke="#1c1916" stroke-width="1.5"/><path d="M45 52 q4 3 8 0 M48 62 q5 -3 9 1" stroke="#1c1916" stroke-width="1" fill="none"/>' + NO,
  dibujo: '<rect x="6" y="18" width="96" height="58" rx="4" fill="#d9cdb8"/><path d="M6 37 H102 M6 56 H102 M38 18 V76 M70 18 V76" stroke="#8a7f73" stroke-width="2"/><circle cx="22" cy="28" r="4" fill="#8a7f73"/><circle cx="86" cy="66" r="4" fill="#8a7f73"/>' + cami(36, 28, 0.95, '#d9b8a8') + NO,
  cortada: '<rect x="20" y="6" width="70" height="70" rx="8" fill="#fbf8f3" stroke="#1c1916" stroke-width="1.4"/><clipPath id="dwcl"><rect x="20" y="6" width="70" height="70" rx="8"/></clipPath><g clip-path="url(#dwcl)">' + cami(26, 14, 1.6, '#c25d74') + '</g>' + NO,
};
const MAL = [{ k: 'torcida', t: 'Torcida o de lado', d: 'Lo de lejos sale más pequeño y la prenda deformada.' }, { k: 'arrugada', t: 'Arrugada o doblada', d: 'Las arrugas se comen centímetros: estírala antes.' },
  { k: 'dibujo', t: 'Fondo con dibujo', d: 'Baldosas o estampados confunden el borde de la prenda y del folio.' }, { k: 'cortada', t: 'Prenda cortada', d: 'Lo que no sale en la foto no se puede medir.' }];
const dibujo = k => h('span.dw-dib', { html: '<svg viewBox="0 0 120 80" width="120" height="80" aria-hidden="true">' + (DIBUJOS[k] || '') + '</svg>' });
export function guia() {
  modal('📷 Qué foto sirve para medir una prenda', h('div',
    h('p.dw-ayuda', 'Así sale bien a la primera:'),
    h('div.dw-guia', CA.GUIA.map(G => h('div.dw-guia-c', dibujo(G.k), h('b', G.t), h('small', G.d)))),
    h('h4.dw-guia-h', 'Lo que NO sirve'),
    h('div.dw-guia.dw-guia-mal', MAL.map(G => h('div.dw-guia-c', dibujo(G.k), h('b', G.t), h('small', G.d)))),
    h('p.dw-ayuda', 'Con el folio A4 en la foto, CelebriDREW quita la perspectiva y sabe cuántos milímetros es cada píxel. Lo que se mide tiene que estar a la altura del folio (los dos en el suelo).')),
    null, { size: 'wide' });
}

// ---------- el PANEL de la pestaña ----------
// o = { descarga(blob, nombre), repinta(), medidas() → { t, lista: [{ k, t, min, max }] } | null, ponMedida(k, mm) → { ok, error } }
export function panelFoto(o) {
  const E = CA.impresora(), campo = (ph) => h('input.dw-cal-num', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: ph, 'aria-label': ph });
  const mh = campo('p. ej. ' + coma(CA.PRUEBA.h - 0.5)), mv = campo('p. ej. ' + coma(CA.PRUEBA.v - 0.5));
  const guarda = () => { const R = CA.guardaImpresora(mh.value, mv.value); if (!R.ok) return toast(R.error, 'bad', 9000); toast('🖨 Impresora calibrada: a lo ancho ' + CA.pct(R.x) + ' · a lo alto ' + CA.pct(R.y) + '. ' + (R.avisos[0] || 'Los PDF A4 salen ya corregidos.'), 'ok', 9000); o.repinta(); };
  [mh, mv].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') guarda(); }));
  const fecha = E && E.fecha ? new Date(E.fecha).toLocaleDateString('es-ES') : '';
  const elegir = h('label.btn.primary.dw-cal-elegir', '📷 Elegir la foto…', h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files[0]; e.target.value = ''; if (f) calibrador(f, o); } }));
  return [o.desdeImagen ? [h('h3', '🌐 Diseñar desde una imagen'), h('div.dw-ayuda', '¿Una prenda que has visto en internet o en una revista? La IA del PC la lee (qué es, largo, mangas, varillas…), te pregunta lo mínimo y hace su patrón a la medida de tu avatar. En internet: clic derecho en la foto → «Copiar imagen» y aquí Ctrl+V.'),
      btn('🌐 Diseñar desde una imagen…', o.desdeImagen, { cls: 'primary dw-desde-imagen' })] : null,
    h('h3', '📷 Qué foto sirve'), h('div.dw-ayuda', 'Para medir una prenda que ya tienes. Toca un dibujo para ver la guía entera.'),
    h('div.dw-guia.dw-guia-mini', CA.GUIA.slice(0, 4).map(G => h('button.dw-guia-c', { type: 'button', title: G.d, onclick: guia }, dibujo(G.k), h('b', G.t)))),
    btn('Ver la guía completa (y lo que NO sirve)', guia, { cls: 'ghost' }),
    h('h3', '👗 Sacar el patrón de una foto'),
    h('div.dw-ayuda', 'La prenda plana con un folio A4 al lado. El programa la recorta, dice qué prenda es, pone sus puntos (axilas, hombros, cuello, bajo…), la mide en cm y traza su patrón. Lo que no se ve en la foto lo dice, y si un punto no está en su sitio lo arrastras.'),
    h('label.btn.primary.dw-cal-patron-elegir', '👗 Elegir la foto de la prenda…', h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files[0]; e.target.value = ''; if (f) calibrador(f, o, 'patron'); } })),
    ultima && ultima.FP && ultima.FP.T.etapas.CONSTRUCCION ? h('div.dw-ayuda.dw-bien', 'Último patrón de foto: ' + DF.resumen(ultima.FP).t + '. ', h('a', { href: '#', onclick: e => { e.preventDefault(); calibrador(null, o, 'patron'); } }, 'Abrir la foto y sus puntos')) : null,
    h('h3', '📐 Medir con una foto'),
    h('div.dw-ayuda', 'La prenda plana en el suelo y un folio A4 al lado. El programa encuentra el folio, quita la perspectiva y te deja medir en centímetros encima de la foto.'),
    elegir,
    ultima ? h('div.dw-ayuda.dw-bien', 'Última foto: 1 píxel = ' + coma(ultima.E.mmPorPx, 2) + ' mm · ' + ultima.medidas.length + ' medida(s). ', h('a', { href: '#', onclick: e => { e.preventDefault(); calibrador(null, o); } }, 'Abrirla otra vez')) : null,
    h('h3', '🖨 Calibrar la impresora'),
    E ? h('div.dw-ayuda.dw-bien', '✔ Calibrada' + (fecha ? ' el ' + fecha : '') + ': a lo ancho ' + CA.pct(E.x) + ' · a lo alto ' + CA.pct(E.y) + (E.mh ? ' (midió ' + coma(E.mh) + ' y ' + coma(E.mv) + ' mm)' : '') + '. Tus PDF A4 de CelebriDREW salen corregidos (los de hoja grande A0, no: los imprime la copistería).')
      : h('div.dw-ayuda', 'Sin calibrar: los PDF salen tal cual. Casi todas las impresoras se desvían menos de un 1 %… pero en una falda de 70 cm eso son 7 mm.'),
    h('ol.dw-pasos',
      h('li', h('span', 'Descarga la hoja de prueba e imprímela al 100 % («Tamaño real»).'), btn('📄 Hoja de prueba (A4)', () => { o.descarga(new Blob([CA.hojaPrueba()], { type: 'application/pdf' }), 'CelebriDREW_hoja_de_prueba_impresora.pdf'); toast('📄 Hoja de prueba en Descargas. Imprímela al 100 % («Tamaño real») y mide las dos rayas en milímetros.', 'ok', 8000); }, { cls: 'ghost' })),
      h('li', h('span', 'Mide las dos rayas con una regla, en milímetros:'),
        h('div.dw-fila', h('label', 'De lado a lado', h('small', 'tiene que dar ' + CA.PRUEBA.h + ' mm')), mh),
        h('div.dw-fila', h('label', 'De arriba abajo', h('small', 'tiene que dar ' + CA.PRUEBA.v + ' mm')), mv)),
      h('li', h('span', 'Guárdalo: desde ahora todos tus PDF A4 salen corregidos.'), btn('✓ Guardar la calibración', guarda, { cls: 'primary' })),
      E ? h('li', h('span', 'Compruébalo: esta hoja ya va corregida; impresa al 100 %, las rayas dan ' + CA.PRUEBA.h + ' y ' + CA.PRUEBA.v + ' mm justos.'),
        btn('📄 Hoja de comprobación (A4)', () => { o.descarga(new Blob([CA.hojaPrueba({ comprobar: true })], { type: 'application/pdf' }), 'CelebriDREW_hoja_de_comprobacion_impresora.pdf'); toast('📄 Hoja de comprobación en Descargas: impresa al 100 %, las rayas tienen que dar justas.', 'ok', 8000); }, { cls: 'ghost' }),
        btn('Quitar la calibración', () => { CA.quitaImpresora(); toast('Calibración quitada: los PDF salen tal cual.', 'ok'); o.repinta(); }, { cls: 'ghost sm' })) : null)];
}

// ---------- el CALIBRADOR de la foto (ventana grande) ----------
export async function calibrador(file, o, objetivo = 'medir') {
  const lienzo = h('canvas.dw-cal-img'), capa = sv('svg', { class: 'dw-cal-capa' }), lupa = h('canvas.dw-cal-lupa'), marco = h('div.dw-cal-marco', lienzo, capa), caja = h('div.dw-cal-caja', marco, lupa);
  const pasos = h('div.dw-cal-pasos'), info = h('div.dw-cal-info'), botones = h('div.dw-cal-botones'), lista = h('div.dw-cal-lista');
  const otra = h('label.btn.ghost.sm', '📷 Otra foto…', h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files[0]; e.target.value = ''; if (f) abreFoto(f); } }));
  let limpia = () => { };
  const m = modal(objetivo === 'patron' ? '👗 Sacar el patrón de una foto' : '📐 Medir con una foto', h('div.dw-cal', h('div.dw-cal-lado', pasos, info, botones, lista, h('div.dw-cal-otra', otra)), caja), null, { size: 'full', onclose: () => limpia() });
  m.el.classList.add('dw-cal-m');
  let D = null, im = null, quad = null, modo = 'esquinas', E = null, medidas = [], pend = null, W = 0, H = 0, sel = null, arr = null, vioLapiz = false, plana = true;
  let FP = null, selMed = null, selPt = null, verSil = true, verPat = true, cola = Promise.resolve(), iaHay = null, tEmp = 0; // (lo del patrón: el análisis, lo elegido y qué se ve encima)
  const L = 160, dpr = Math.min(2, window.devicePixelRatio || 1); lupa.width = lupa.height = Math.round(L * dpr); lupa.style.width = lupa.style.height = L + 'px';
  // escala: píxeles de la foto por píxel de la pantalla (para que los círculos y letras se vean siempre del mismo tamaño)
  const esc = () => { const r = capa.getBoundingClientRect(); return r.width > 0 ? W / r.width : 1; };
  const ajusta = () => { if (!W) return; const r = caja.getBoundingClientRect(), f = Math.min((r.width - 16) / W, (r.height - 16) / H); if (!(f > 0)) return; marco.style.width = Math.floor(W * f) + 'px'; marco.style.height = Math.floor(H * f) + 'px'; repinta(); };
  const aImagen = e => { const r = capa.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const pon = (w, hh) => { W = w; H = hh; lienzo.width = w; lienzo.height = hh; capa.setAttribute('viewBox', '0 0 ' + w + ' ' + hh); requestAnimationFrame(ajusta); };
  const ro = new ResizeObserver(() => ajusta()); ro.observe(caja);
  const msg = (t, cls = '') => { info.className = 'dw-cal-info ' + cls; info.textContent = t; };
  const mount = (el, kids) => { el.replaceChildren(...[].concat(kids).flat(Infinity).filter(Boolean)); };
  const repinta = () => { if (!W) return; if (modo === 'esquinas') { if (quad) pintaEsquinas(); } else if (modo === 'patron') pintaPatron(); else pintaMedidas(); };
  const verPasos = () => mount(pasos, [['1', 'Esquinas del folio', modo === 'esquinas'], ['2', objetivo === 'patron' ? 'Puntos y patrón' : 'Medir en cm', modo !== 'esquinas']].map(([n, t, on]) => h('span' + (on ? '.on' : ''), h('b', n), t)));

  // la LUPA: la foto de cerca (cada píxel de la foto se ve de 2,5 o más), con cruz, arriba a la izquierda del dedo (que no la tape)
  function verLupa(e, p) {
    const fuente = modo === 'esquinas' ? im : lienzo; if (!fuente) return;
    const pxImg = Math.max(2.5, 4 / esc()), lado = L / pxImg, g = lupa.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#3a3631'; g.fillRect(0, 0, L, L); g.imageSmoothingEnabled = false; g.drawImage(fuente, p[0] - lado / 2, p[1] - lado / 2, lado, lado, 0, 0, L, L);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(L / 2, 8); g.lineTo(L / 2, L / 2 - 6); g.moveTo(L / 2, L / 2 + 6); g.lineTo(L / 2, L - 8); g.moveTo(8, L / 2); g.lineTo(L / 2 - 6, L / 2); g.moveTo(L / 2 + 6, L / 2); g.lineTo(L - 8, L / 2); g.stroke();
    g.strokeStyle = ROSA; g.lineWidth = 1.2; g.stroke();
    const r = caja.getBoundingClientRect(), dedo = e.pointerType === 'mouse' ? 26 : 70; let x = e.clientX - r.left - L - dedo, y = e.clientY - r.top - L - dedo;
    if (x < 6) x = e.clientX - r.left + dedo; if (y < 6) y = e.clientY - r.top + dedo; x = Math.min(x, r.width - L - 6); y = Math.min(y, r.height - L - 6);
    lupa.style.left = Math.max(6, x) + 'px'; lupa.style.top = Math.max(6, y) + 'px'; lupa.style.display = 'block';
  }
  const quitaLupa = () => { lupa.style.display = 'none'; };

  // --- las ESQUINAS del folio ---
  function pintaEsquinas() {
    const s = esc(); capa.replaceChildren();
    capa.appendChild(sv('polygon', { points: quad.map(p => p.join(',')).join(' '), fill: 'rgba(194,93,116,.13)', stroke: ROSA, 'stroke-width': 2 * s, 'stroke-linejoin': 'round' }));
    quad.forEach((q, k) => { const on = sel === q;
      capa.appendChild(sv('circle', { cx: q[0], cy: q[1], r: 15 * s, fill: on ? 'rgba(194,93,116,.28)' : 'rgba(255,255,255,.28)', stroke: on ? '#fff' : ROSA, 'stroke-width': 2.5 * s }));
      capa.appendChild(sv('path', { d: 'M' + (q[0] - 6 * s) + ' ' + q[1] + 'h' + 12 * s + 'M' + q[0] + ' ' + (q[1] - 6 * s) + 'v' + 12 * s, stroke: on ? '#fff' : ROSA, 'stroke-width': 1.6 * s }));
      const t = sv('text', { x: q[0] + 19 * s, y: q[1] - 13 * s, 'font-size': 13 * s, 'font-weight': 700, fill: '#fff', stroke: TINTA, 'stroke-width': 3 * s, 'paint-order': 'stroke', 'font-family': 'Arial' }); t.textContent = String(k + 1); capa.appendChild(t); });
  }
  async function busca() {
    msg('Buscando el folio…'); await new Promise(r => setTimeout(r, 30));
    const R = CA.detectaFolio(D); sel = null;
    if (R) { quad = R.quad; msg('✔ Folio encontrado' + (R.conf === 'alta' ? '' : ' (bordes algo borrosos)') + '. Mira que los 4 círculos estén justo en las 4 esquinas del papel; si no, arrástralos (sale una lupa).', 'ok'); }
    else { const c = [W / 2, H / 2], a = Math.min(W, H) * 0.18; quad = [[c[0] - a * 0.7, c[1] - a], [c[0] + a * 0.7, c[1] - a], [c[0] + a * 0.7, c[1] + a], [c[0] - a * 0.7, c[1] + a]];
      msg('No encuentro el folio solo. Arrastra los 4 círculos a las 4 esquinas del papel y pulsa «🎯 Ajustar al borde». (Consejo: folio blanco y entero sobre un fondo de color.)', 'aviso'); }
    pintaEsquinas();
  }
  // 🎯 pegar las esquinas al borde del papel: se afina varias veces (cada vez la búsqueda sale de lo ya afinado, así llega aunque un círculo
  // esté algo lejos) y solo se acepta si los 4 bordes se ven a lo largo (la mayoría de los puntos de cada lado caen en una recta)
  function ajustaBorde() {
    const s = esc(), q0 = CA.ordena(quad), diag = Math.max(dist(q0[0], q0[2]), dist(q0[1], q0[3])); let q = q0, A = null; // (A = la última vuelta con los 4 bordes vistos)
    for (let i = 0; i < 4; i++) { const B = CA.afinaQuad(D, q, Math.max(10, 8 * s)); if (B.lados < 4) { if (!A) A = B; break; } const paso = Math.max(...B.quad.map((p, k) => dist(p, q[k]))); q = B.quad; A = B; if (paso < 0.05) break; }
    const mov = Math.max(...q.map((p, k) => dist(p, q0[k])));
    if (!A || A.lados < 4) return msg('Solo veo ' + (A ? A.lados : 0) + ' de los 4 bordes del papel cerca de los círculos. Acércalos más a las esquinas (con la lupa) y vuelve a probar, o déjalos a mano.', 'aviso');
    if (A.puntos < 4 * 49 * 0.6 || mov > 0.25 * diag) return msg('El borde del papel no se ve claro ahí (o los círculos están en otra cosa): no los cambio. Ponlos con la lupa en las esquinas del PAPEL.', 'aviso');
    quad = q; sel = null; pintaEsquinas(); msg('🎯 Esquinas pegadas al borde del papel que se ve en la foto (se han movido ' + coma(mov, 0) + ' píxeles). Míralas con la lupa si quieres y pulsa «Enderezar y medir».', 'ok');
  }
  // ¿las 4 esquinas parecen las de un folio visto en perspectiva? (lados opuestos parecidos y ángulos no muy cerrados) → texto del aviso o ''
  function rarezaFolio(q) {
    const L = [dist(q[0], q[1]), dist(q[1], q[2]), dist(q[2], q[3]), dist(q[3], q[0])], r = Math.max(L[0] / L[2], L[2] / L[0], L[1] / L[3], L[3] / L[1]);
    const ang = q.map((p, k) => { const a = q[(k + 3) % 4], b = q[(k + 1) % 4], u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]]; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))))) * 180 / Math.PI; });
    return r > 1.45 || Math.min(...ang) < 60 || Math.max(...ang) > 120 ? 'Ojo: con estas esquinas el folio sale muy deformado (¿hay alguna fuera de su sitio?). Si las medidas no te cuadran, vuelve a «← Corregir las esquinas».' : '';
  }
  // mover el punto elegido 1 píxel (botones para el dedo; flechas del teclado)
  const empuja = (dx, dy) => { if (!sel) return; sel[0] = Math.max(0, Math.min(W, sel[0] + dx)); sel[1] = Math.max(0, Math.min(H, sel[1] + dy)); if (modo === 'patron') return empujaPunto(); if (modo === 'medir') recalcula(); repinta(); };
  const cruceta = () => h('div.dw-cal-cruz', { title: 'Mover el punto elegido 1 píxel' }, [['←', -1, 0, 'izquierda'], ['↑', 0, -1, 'arriba'], ['↓', 0, 1, 'abajo'], ['→', 1, 0, 'derecha']].map(([t, dx, dy, n]) => h('button', { type: 'button', 'aria-label': 'Mover 1 píxel a la ' + n, onclick: () => { if (!sel) toast(modo === 'esquinas' ? 'Toca primero un círculo' : modo === 'patron' ? 'Toca primero un punto' : 'Toca primero la punta de una medida', 'info', 3000); empuja(dx, dy); } }, t)));
  function verEsquinas() {
    modo = 'esquinas'; E = null; pend = null; sel = null; verPasos(); pon(im.naturalWidth || im.width, im.naturalHeight || im.height); lienzo.getContext('2d').drawImage(im, 0, 0); capa.style.cursor = 'default';
    mount(lista, [h('div.dw-ayuda', 'Arrastra un círculo con el ratón, el dedo o el lápiz: sale una LUPA para dejarlo justo en la esquina. Con el ratón, Mayús = movimiento fino. Para afinar: toca un círculo y usa las flechas (1 píxel).'), cruceta()]);
    mount(botones, [btn('🎯 Ajustar al borde del papel', ajustaBorde, { cls: 'ghost', title: 'Busca el borde del papel cerca de los círculos y los pega a él (si no lo ve claro, no los cambia)' }), btn('🔍 Buscar el folio otra vez', busca, { cls: 'ghost' }), btn(objetivo === 'patron' ? '✓ Enderezar y sacar el patrón' : '✓ Enderezar y medir', endereza, { cls: 'primary' })]);
    if (quad) pintaEsquinas();
  }
  async function endereza() {
    const q = CA.ordena(quad), [an, al] = CA.medidasFolio(q), lados = [dist(q[0], q[1]), dist(q[1], q[2]), dist(q[2], q[3]), dist(q[3], q[0])];
    if (Math.min(...lados) < 20) return msg('Las esquinas están demasiado juntas: ponlas en las 4 esquinas del folio.', 'aviso');
    msg('Enderezando la foto…'); await new Promise(r => setTimeout(r, 30));
    try { E = CA.endereza(D, q, an, al); } catch (e) { return msg('❌ No se ha podido enderezar: ' + e.message, 'mal'); }
    E.rareza = rarezaFolio(q); medidas = []; FP = null; ultima = { E, medidas, D, im, quad: q.map(p => p.slice()), FP: null }; if (objetivo === 'patron') verPatron(); else verMedir(); /* (la foto de partida también: al volver a abrirla se pueden corregir las esquinas) */
  }

  // --- MEDIR sobre la foto enderezada ---
  const recalcula = () => medidas.forEach(M => { M.mm = dist(M.a, M.b) * E.mmPorPx; });
  function verMedir() {
    modo = 'medir'; pend = null; sel = null; verPasos(); pon(E.width, E.height); lienzo.getContext('2d').putImageData(new ImageData(E.data, E.width, E.height), 0, 0); capa.style.cursor = 'crosshair';
    msg((E.rareza ? E.rareza + ' ' : '') + 'Foto enderezada: 1 píxel = ' + coma(E.mmPorPx, 2) + ' mm. Toca un punto y luego otro (o arrastra de uno a otro): sale la medida en cm. Las puntas se pueden mover después.', E.rareza ? 'aviso' : 'ok');
    mount(botones, [im ? btn('← Corregir las esquinas', verEsquinas, { cls: 'ghost', title: 'Volver a las esquinas del folio (al enderezar otra vez, las medidas se vuelven a hacer)' }) : null, btn('🗑 Borrar las medidas', () => { medidas.length = 0; pend = null; sel = null; pintaMedidas(); }, { cls: 'ghost' }),
      btn('⬇ Foto con las medidas (PNG)', fotoPNG, { cls: 'ghost' }), btn('👗 Sacar el patrón de esta foto', () => { objetivo = 'patron'; verPatron(); }, { cls: 'ghost', title: 'La prenda se recorta, se le ponen sus puntos y sale su patrón' })]);
    pintaMedidas();
  }
  function pintaMedidas() {
    const s = esc(), f = E.folio; capa.replaceChildren();
    capa.appendChild(sv('rect', { x: f[0], y: f[1], width: f[2] - f[0], height: f[3] - f[1], fill: 'none', stroke: VERDE, 'stroke-width': 1.6 * s, 'stroke-dasharray': 7 * s + ' ' + 5 * s }));
    const tf = sv('text', { x: f[0] + 4 * s, y: f[1] - 6 * s, 'font-size': 12 * s, 'font-weight': 700, fill: VERDE, stroke: '#fff', 'stroke-width': 3 * s, 'paint-order': 'stroke', 'font-family': 'Arial' }); tf.textContent = 'folio A4 (la referencia)'; capa.appendChild(tf);
    medidas.forEach((M, i) => { capa.appendChild(sv('line', { x1: M.a[0], y1: M.a[1], x2: M.b[0], y2: M.b[1], stroke: '#fff', 'stroke-width': 5 * s, 'stroke-linecap': 'round', opacity: 0.7 }));
      capa.appendChild(sv('line', { x1: M.a[0], y1: M.a[1], x2: M.b[0], y2: M.b[1], stroke: TINTA, 'stroke-width': 2.2 * s, 'stroke-linecap': 'round' }));
      [M.a, M.b].forEach(p => capa.appendChild(sv('circle', { cx: p[0], cy: p[1], r: (sel === p ? 8 : 5.5) * s, fill: sel === p ? '#fff' : ROSA, stroke: sel === p ? ROSA : '#fff', 'stroke-width': 2 * s })));
      const R = rotulo(M, s), t = sv('text', { x: R.x, y: R.y, 'font-size': 16 * s, 'text-anchor': R.ancla, 'font-weight': 700, fill: TINTA, stroke: '#fff', 'stroke-width': 4.5 * s, 'paint-order': 'stroke', 'font-family': 'Arial' });
      t.textContent = (i + 1) + ' · ' + coma(M.mm / 10) + ' cm'; capa.appendChild(t); });
    if (pend) { capa.appendChild(sv('circle', { cx: pend[0], cy: pend[1], r: 6 * s, fill: ROSA, stroke: '#fff', 'stroke-width': 2 * s }));
      const t = sv('text', { x: pend[0] + 12 * s, y: pend[1] + 5 * s, 'font-size': 13 * s, 'font-weight': 700, fill: TINTA, stroke: '#fff', 'stroke-width': 4 * s, 'paint-order': 'stroke', 'font-family': 'Arial' }); t.textContent = 'toca el 2.º punto'; capa.appendChild(t); }
    pintaLista();
  }
  // dónde va el rótulo de una medida: encima si la raya va tumbada; a su derecha si va de pie (que no tape la raya)
  function rotulo(M, s) { const mx = (M.a[0] + M.b[0]) / 2, my = (M.a[1] + M.b[1]) / 2, dx = Math.abs(M.b[0] - M.a[0]), dy = Math.abs(M.b[1] - M.a[1]);
    return dy > dx ? { x: mx + 12 * s, y: my + 5 * s, ancla: 'start' } : { x: mx, y: my - 10 * s, ancla: 'middle' }; }
  function pintaLista() {
    const P = o.medidas ? o.medidas() : null;
    mount(lista, [
      medidas.length ? null : h('div.dw-ayuda', 'Aún no hay medidas. Toca dos puntos de la foto.'),
      medidas.map((M, i) => h('div.dw-cal-med',
        h('div.dw-cal-med-c', h('b', (i + 1) + ' · ' + coma(M.mm / 10) + ' cm'),
          h('button', { type: 'button', title: 'Quitar esta medida', 'aria-label': 'Quitar la medida ' + (i + 1), onclick: () => { medidas.splice(i, 1); sel = null; pintaMedidas(); } }, '×')),
        M.k && P ? h('small.dw-cal-llevada', '✔ En la prenda: ' + ((P.lista.find(x => x.k === M.k) || {}).t || M.k)) : null,
        P ? h('select.dw-sel', { 'aria-label': 'Llevar la medida ' + (i + 1) + ' a la prenda', onchange: e => { const k = e.target.value; if (!k) return; lleva(M, k, P); e.target.value = ''; } },
          h('option', { value: '' }, 'Llevar a la prenda (' + P.t + ')…'), P.lista.map(x => h('option', { value: x.k }, x.t + (esContorno(x) && plana ? ' · ×2' : '')))) : null)),
      medidas.length ? h('div.dw-ayuda', 'Precisión: ± ' + coma(Math.max(1, 2 * E.mmPorPx), 1) + ' mm en cada punta (lo que deja ver la foto) y solo para lo que esté a la altura del folio.') : null,
      P && medidas.length ? h('label.dw-ayuda.dw-cal-plana', h('input', { type: 'checkbox', checked: plana, onchange: e => { plana = e.target.checked; pintaLista(); } }), 'La prenda está PLANA: un contorno (pecho, cintura, bajo…) se mide por la mitad y se lleva ×2.') : null,
      sel ? h('div', h('div.dw-ayuda', 'Punta elegida: muévela 1 píxel con las flechas.'), cruceta()) : null]);
  }
  const esContorno = x => /contorno/i.test(x.t);
  function lleva(M, k, P) {
    const x = P.lista.find(q => q.k === k), f = esContorno(x) && plana ? 2 : 1, R = o.ponMedida(k, M.mm * f);
    if (!R || !R.ok) return toast((R && R.error) || 'No se ha podido poner esa medida.', 'bad', 9000);
    M.k = k; pintaLista(); toast('📏 «' + x.t + '» = ' + coma(M.mm * f / 10) + ' cm' + (f === 2 ? ' (' + coma(M.mm / 10) + ' cm plana × 2)' : '') + ': ya está en la prenda y en el 3D. Ctrl+Z lo deshace.', 'ok', 9000);
  }
  // la foto enderezada CON las medidas dibujadas, para guardarla
  function fotoPNG() {
    const c = document.createElement('canvas'), pie = Math.round(Math.max(40, E.height * 0.04)); c.width = E.width; c.height = E.height + pie; const g = c.getContext('2d'), s = Math.max(1, E.width / 1200);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(lienzo, 0, 0);
    const f = E.folio; g.setLineDash([7 * s, 5 * s]); g.strokeStyle = VERDE; g.lineWidth = 1.6 * s; g.strokeRect(f[0], f[1], f[2] - f[0], f[3] - f[1]); g.setLineDash([]);
    g.font = '700 ' + Math.round(16 * s) + 'px Arial'; g.textAlign = 'center'; g.lineJoin = 'round';
    medidas.forEach((M, i) => { g.lineCap = 'round'; [['#fff', 5 * s], [TINTA, 2.2 * s]].forEach(([c2, w]) => { g.strokeStyle = c2; g.lineWidth = w; g.beginPath(); g.moveTo(M.a[0], M.a[1]); g.lineTo(M.b[0], M.b[1]); g.stroke(); });
      [M.a, M.b].forEach(p => { g.fillStyle = ROSA; g.beginPath(); g.arc(p[0], p[1], 5 * s, 0, 2 * Math.PI); g.fill(); });
      const t = (i + 1) + ' · ' + coma(M.mm / 10) + ' cm', R = rotulo(M, s); g.textAlign = R.ancla === 'start' ? 'left' : 'center'; g.strokeStyle = '#fff'; g.lineWidth = 4.5 * s; g.strokeText(t, R.x, R.y); g.fillStyle = TINTA; g.fillText(t, R.x, R.y); });
    // la barra de 10 cm y el pie
    const b = 100 / E.mmPorPx, y0 = E.height + pie / 2; g.fillStyle = TINTA; g.fillRect(16 * s, y0 - 3 * s, b, 6 * s); g.textAlign = 'left'; g.font = '700 ' + Math.round(13 * s) + 'px Arial'; g.fillText('10 cm', 16 * s + b + 8 * s, y0 + 5 * s);
    g.textAlign = 'right'; g.fillText('CelebriDREW · foto enderezada con un folio A4 · 1 píxel = ' + coma(E.mmPorPx, 3) + ' mm', c.width - 16 * s, y0 + 5 * s);
    c.toBlob(bl => { o.descarga(bl, 'foto_medida_' + coma(E.mmPorPx, 3).replace(',', '_') + 'mm_px.png'); toast('⬇ Foto con las medidas en Descargas', 'ok'); }, 'image/png');
  }

  // --- 👗 SACAR EL PATRÓN de la foto enderezada (drew/foto/desde_foto.js): silueta, PUNTOS que se arrastran y vuelven a medir, qué prenda es,
  // lo visto / supuesto / por confirmar, el patrón encima de la foto y «Crear el patrón» (se ve en el 3D y el 2D) ---
  const CAT_RAPIDAS = ['camiseta', 'sudadera', 'vestido', 'falda', 'pantalon'];
  const iaLista = async () => { if (iaHay != null) return iaHay; try { const M = await import('../biou/motor.js'); iaHay = !!(await M.motorAqui()); } catch (e) { iaHay = false; } return iaHay; };
  const lienzoDe = img => { const c = document.createElement('canvas'); c.width = img.w; c.height = img.h; c.getContext('2d').putImageData(new ImageData(img.d, img.w, img.h), 0, 0); return c; };
  const recorteIA = async (img, lado) => { const { segmentaIA } = await import('./foto/segmenta.js'); return segmentaIA(lienzoDe(img), { lado, onStatus: t => msg('✨ IA del PC: ' + (t && t.texto || t || 'recortando…')) }); };
  const enCola = fn => { cola = cola.then(fn).catch(e => msg('❌ ' + e.message, 'mal')); return cola; };
  async function verPatron() {
    modo = 'patron'; objetivo = 'patron'; pend = null; sel = null; verPasos(); pon(E.width, E.height); lienzo.getContext('2d').putImageData(new ImageData(E.data, E.width, E.height), 0, 0); capa.style.cursor = 'default';
    if (!FP || FP.E !== E) return analizaPatron({});
    refrescaPatron();
  }
  async function analizaPatron(op) {
    FP = null; selMed = null; selPt = null; capa.replaceChildren(); mount(botones, [im ? btn('← Corregir las esquinas', verEsquinas, { cls: 'ghost' }) : null]);
    mount(lista, h('div.dw-cal-cargando', h('i'), 'Recortando la prenda, mirando qué es y poniendo sus puntos…')); msg('🔎 Analizando la prenda…'); await new Promise(r => setTimeout(r, 40));
    const ia = op.recorte ? op.recorte === 'ia' : await iaLista(); let F;
    try { F = await DF.analizaFoto(E, { categoria: op.categoria, segmentaIA: ia ? recorteIA : null }); } catch (e) { msg('❌ No se ha podido analizar la foto: ' + e.message, 'mal'); return; }
    if (modo !== 'patron' || F.E !== E) return; FP = F; if (ultima && ultima.E === E) ultima.FP = FP;
    refrescaPatron(); visionIA(FP);
  }
  function refrescaPatron() { if (modo !== 'patron') return; botonesPatron(); pintaPatron(); pintaListaPatron(); mensajePatron(); }
  function mensajePatron() {
    if (!FP) return; const Z = DF.resumen(FP), c = Z.cuenta, vistas = (c.observado || 0) + (c.mano || 0) + (c.confirmada || 0);
    if (Z.falta) return msg('Todavía no sale el patrón (' + Z.falta + '). Di qué prenda es aquí abajo o mueve los puntos.', 'aviso');
    msg('✔ ' + Z.t + ': ' + (Z.valida || '') + '. ' + [vistas ? vistas + ' medidas vistas en la foto' : '', c.inferido ? c.inferido + ' supuestas (no se ven)' : '', c.confirmar ? c.confirmar + ' por confirmar ⚠' : ''].filter(Boolean).join(' · ') + '. Si un punto no está en su sitio, arrástralo: se vuelve a medir todo.', c.confirmar ? 'aviso' : 'ok');
  }
  function botonesPatron() {
    const ya = !!(o.esDeFoto && FP && o.esDeFoto(FP.id));
    mount(botones, [im ? btn('← Corregir las esquinas', verEsquinas, { cls: 'ghost', title: 'Volver a las esquinas del folio (al enderezar otra vez se analiza de nuevo)' }) : null,
      btn('📏 Medir a mano en esta foto', () => { objetivo = 'medir'; verMedir(); }, { cls: 'ghost' }),
      FP && FP.movidos.size ? btn('↺ Volver a los puntos de la máquina', () => enCola(async () => { await DF.puntosMaquina(FP); selPt = null; refrescaPatron(); }), { cls: 'ghost' }) : null,
      FP && FP.T.etapas.RASGOS && FP.T.etapas.RASGOS.datos ? btn('⬇ Foto con los puntos y medidas (PNG)', fotoPatronPNG, { cls: 'ghost' }) : null,
      o.crearPatron && FP && FP.T.etapas.PATRON && FP.T.etapas.PATRON.prenda ? btn(ya ? '👗 Actualizar el patrón de la prenda' : '👗 Crear el patrón (se ve en el 3D)', crearPatron, { cls: 'primary', title: 'Lleva la plantilla, sus opciones y estas medidas a la prenda: se traza el patrón y se cose en el avatar' }) : null]);
  }
  function crearPatron() {
    let A; try { A = DF.aProyecto(FP); } catch (e) { return toast(e.message, 'bad', 9000); }
    const R = o.crearPatron(A); if (R && R.ok === false) return toast(R.error || 'No se ha podido crear el patrón.', 'bad', 9000);
    m.close(); toast('👗 ' + A.nombre + (R && R.valida ? ': «' + R.valida + '»' : '') + '. Se está cosiendo en el avatar. Lo que salía «por confirmar» va con ⚠ en la pestaña Prenda.', 'ok', 9000);
  }
  // el color de cada punto: lo seguro que está la máquina (verde / ámbar / rojo) o tinta si lo ha movido la persona
  const colorPunto = n => { if (FP.movidos.has(n)) return TINTA; const q = FP.T.etapas.RASGOS.datos.puntos[n], c = q ? q.conf : 0; return c >= 0.7 ? VERDE : c >= 0.5 ? AMBAR : ROJO; };
  const poli = L => L.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  function pintaPatron(dib) {
    const s = esc(); capa.replaceChildren(); if (!FP || !E) return; const f = E.folio;
    capa.appendChild(sv('rect', { x: f[0], y: f[1], width: f[2] - f[0], height: f[3] - f[1], fill: 'rgba(255,255,255,.25)', stroke: VERDE, 'stroke-width': 1.6 * s, 'stroke-dasharray': 7 * s + ' ' + 5 * s }));
    const tf = sv('text', { x: (f[0] + f[2]) / 2, y: (f[1] + f[3]) / 2, 'font-size': 13 * s, 'font-weight': 700, 'text-anchor': 'middle', fill: VERDE, 'font-family': 'Arial' }); tf.textContent = 'folio A4 = la escala'; capa.appendChild(tf); /* (dentro del folio: fuera pisaba lo que hay al lado) */
    dib = dib || DF.dibujo(FP); if (!dib) return;
    if (verSil && dib.silueta.length > 2) capa.appendChild(sv('polygon', { points: poli(dib.silueta), fill: 'rgba(47,125,79,.10)', stroke: VERDE, 'stroke-width': 1.8 * s, 'stroke-linejoin': 'round', 'pointer-events': 'none' }));
    if (verPat) DF.superpone(FP).forEach(S => capa.appendChild(sv('polygon', { points: poli(S.L), fill: 'none', stroke: ORO, 'stroke-width': 2.4 * s, 'stroke-dasharray': 10 * s + ' ' + 6 * s, 'stroke-linejoin': 'round', 'pointer-events': 'none', 'data-patron': S.n })));
    const R = FP.T.etapas.RASGOS && FP.T.etapas.RASGOS.datos, resalta = new Set(selPt && R ? usanPunto(R, selPt) : []); if (selMed) resalta.add(selMed);
    const ocupado = Object.values(dib.puntos).map(p => [p[0] - 9 * s, p[1] - 9 * s, p[0] + 9 * s, p[1] + 9 * s]); // (los puntos y los rótulos ya puestos: el siguiente rótulo se aparta si los pisa)
    const sitio = (Rt, txt, fs) => { const w = 0.58 * fs * txt.length, x0 = Rt.ancla === 'middle' ? Rt.x - w / 2 : Rt.x; let dy = 0; for (let i = 0; i < 6; i++) { const c = [x0, Rt.y + dy - fs, x0 + w, Rt.y + dy + 0.25 * fs]; if (!ocupado.some(o2 => c[0] < o2[2] && c[2] > o2[0] && c[1] < o2[3] && c[3] > o2[1])) { ocupado.push(c); return dy; } dy += (i % 2 ? -1 : 1) * (i + 1) * 1.1 * fs; } return 0; };
    dib.lineas.forEach(l => { const on = resalta.has(l.k);
      capa.appendChild(sv('line', { x1: l.a[0], y1: l.a[1], x2: l.b[0], y2: l.b[1], stroke: '#fff', 'stroke-width': (on ? 7 : 4.5) * s, 'stroke-linecap': 'round', opacity: 0.8 }));
      capa.appendChild(sv('line', { x1: l.a[0], y1: l.a[1], x2: l.b[0], y2: l.b[1], stroke: on ? ROSA : TINTA, 'stroke-width': (on ? 3 : 1.6) * s, 'stroke-linecap': 'round', 'data-medida': l.k })); });
    dib.lineas.slice().sort((a, b) => resalta.has(a.k) - resalta.has(b.k)).forEach(l => { const on = resalta.has(l.k); /* (los rótulos, encima de TODAS las rayas; el resaltado, el último) */
      if (l.mm == null) return; const Rt = rotulo(l, s), txt = l.t + ' ' + coma(l.mm / 10), fs = (on ? 15 : 12) * s, dy = sitio(Rt, txt, fs), t = sv('text', { x: Rt.x, y: Rt.y + dy, 'font-size': fs, 'text-anchor': Rt.ancla, 'font-weight': on ? 800 : 700, fill: on ? ROSA : TINTA, stroke: '#fff', 'stroke-width': 4 * s, 'paint-order': 'stroke', 'font-family': 'Arial' });
      t.textContent = txt; capa.appendChild(t); });
    Object.entries(dib.puntos).forEach(([n, p]) => { const on = selPt === n, c = colorPunto(n);
      capa.appendChild(sv('circle', { cx: p[0], cy: p[1], r: (on ? 10 : 7) * s, fill: on ? '#fff' : c, stroke: on ? c : '#fff', 'stroke-width': (on ? 3.5 : 2.2) * s, 'data-punto': n })); });
    if (selPt && dib.puntos[selPt]) { const p = dib.puntos[selPt], t = sv('text', { x: p[0] + 15 * s, y: p[1] - 13 * s, 'font-size': 13 * s, 'font-weight': 700, fill: '#fff', stroke: TINTA, 'stroke-width': 3.5 * s, 'paint-order': 'stroke', 'font-family': 'Arial' }); t.textContent = NOMBRES[selPt] || selPt; capa.appendChild(t); }
  }
  function pintaListaPatron() {
    if (!FP || modo !== 'patron') return; const Z = DF.resumen(FP), otras = Object.keys(CATEGORIAS).filter(k => !CAT_RAPIDAS.includes(k)), esIA = /^ia/.test(Z.recorte);
    const fila = f => h('div.dw-cal-fm.' + f.ver + (f.rk && selMed === f.rk ? '.on' : ''), Object.assign({ 'data-medida': f.k, title: f.como || '' }, f.rk ? { role: 'button', tabindex: 0, onclick: () => { selMed = selMed === f.rk ? null : f.rk; selPt = null; pintaPatron(); pintaListaPatron(); } } : {}),
      h('span.dw-cal-fm-t', f.t), h('b', coma(f.v / 10) + ' cm'), h('span.dw-cal-est.' + f.ver, DF.ESTADO_T[f.ver] || f.ver),
      f.ver === 'confirmar' ? h('button.dw-cal-okbtn', { type: 'button', title: 'La he mirado y está bien', onclick: e => { e.stopPropagation(); DF.confirma(FP, f.k); pintaListaPatron(); mensajePatron(); } }, '✔ Está bien') : null);
    mount(lista, [
      Z.falta ? h('div.dw-ayuda.dw-mal', '✘ ' + Z.falta) : h('div.dw-cal-res', h('b', '👗 ' + Z.t), h('span', (Z.valida || '') + ' · ' + Z.piezas + ' piezas')),
      selPt ? h('div', h('div.dw-ayuda', 'Punto elegido: ', h('b', NOMBRES[selPt] || selPt), '. Arrástralo o muévelo 1 píxel con las flechas (Mayús = 10).'), cruceta()) : null,
      h('h4.dw-cal-h', '¿Qué prenda es?'),
      h('div.dw-chips', CAT_RAPIDAS.map(k => h('button.dw-chip' + (Z.categoria === k ? '.on' : ''), { type: 'button', 'data-cat': k, onclick: () => cambiaCat(k) }, CATEGORIAS[k]))),
      h('select.dw-sel.dw-cal-otra-cat', { 'aria-label': 'Otra prenda', onchange: e => { if (e.target.value) cambiaCat(e.target.value); } }, h('option', { value: '' }, CAT_RAPIDAS.includes(Z.categoria) ? 'Otra prenda…' : 'Otra prenda'), otras.map(k => h('option', { value: k, selected: Z.categoria === k }, CATEGORIAS[k]))),
      h('small.dw-ayuda', (Z.fuenteCat === 'persona' ? 'Lo has dicho tú. ' : '') + (Z.candidatos.length ? 'Por la forma: ' + (CATEGORIAS[Z.candidatos[0].k] || Z.candidatos[0].k).toLowerCase() + ' — ' + String(Z.candidatos[0].porque.join ? Z.candidatos[0].porque.join(' ') : Z.candidatos[0].porque).replace(/^Forma: /, '') : '')),
      iaVisionLinea(Z),
      Z.filas.length ? [h('h4.dw-cal-h', 'Medidas de la prenda'),
        h('div.dw-cal-leyenda', [[VERDE, 'punto seguro'], [AMBAR, 'mírala'], [ROJO, 'dudoso'], [TINTA, 'movido por ti']].map(([c, t]) => h('span', h('i', { style: { background: c } }), t))),
        h('small.dw-ayuda', 'Toca una medida para verla en la foto. Arrastra un punto (ratón, dedo o lápiz) para corregirlo: se mide otra vez y el patrón se rehace.'),
        h('div.dw-cal-meds', Z.filas.map(fila))] : null,
      Z.componentes.length ? [h('h4.dw-cal-h', 'Piezas'), Z.componentes.map(c => h('div.dw-cal-comp', h('span.dw-cal-est.' + c.estado, DF.ESTADO_T[c.estado] || c.estado), h('b', c.n), h('small', c.nota)))] : null,
      h('h4.dw-cal-h', 'Ver encima de la foto'),
      h('label.dw-cal-ver', h('input', { type: 'checkbox', checked: verSil, onchange: e => { verSil = e.target.checked; pintaPatron(); } }), h('i', { style: { background: VERDE } }), 'La silueta recortada'),
      Z.k === 'pantalon' ? h('small.dw-ayuda', 'En el pantalón el patrón no se pone encima: en la foto el delantero y la espalda se solapan y no se parecen a sus piezas.')
        : h('label.dw-cal-ver', h('input', { type: 'checkbox', checked: verPat, onchange: e => { verPat = e.target.checked; pintaPatron(); } }), h('i.dw-cal-raya', { style: { borderColor: ORO } }), 'El patrón encima, a tamaño real (' + (Z.k === 'vestido' ? 'la falda' : 'el delantero') + ')'),
      h('div.dw-ayuda', 'Recorte: ' + (esIA ? '✨ IA del PC (' + Z.recorte.replace(/^ia:/, '') + ')' : '🎨 por colores') + ' · fiable al ' + Math.round(Z.confRecorte * 100) + ' %. ',
        iaHay ? h('a', { href: '#', onclick: e => { e.preventDefault(); analizaPatron({ recorte: esIA ? 'colores' : 'ia', categoria: FP.categoria }); } }, esIA ? 'Probar por colores' : 'Probar con la IA del PC') : null),
      Z.avisos.length ? h('details.dw-cal-avisos', { open: Z.avisos.length <= 3 }, h('summary', '⚠ ' + Z.avisos.length + ' aviso' + (Z.avisos.length > 1 ? 's' : '')), Z.avisos.map(a => h('div', a))) : null,
      h('details.dw-cal-etapas', h('summary', 'Cómo lo ha hecho (' + Z.etapas.length + ' pasos)'), Z.etapas.map(x => h('div', h('span', x.i), x.t + (x.ms != null ? ' · ' + x.ms + ' ms' : '') + (x.conf != null && x.e !== 'pendiente' ? ' · ' + Math.round(x.conf * 100) + ' %' : ''))))]);
  }
  // 👁 la IA de VISIÓN del PC (qwen2.5vl, local): mira la foto mientras tanto; lo que dice se enseña y sus pistas (cuello, cierre, bolsillos) entran en el patrón
  function iaVisionLinea(Z) {
    const v = FP && FP.iaVision; if (!v) return null;
    if (v.pendiente) return h('small.dw-ayuda', '👁 La IA de visión del PC está mirando la foto…');
    if (v.error) return h('small.dw-ayuda', '👁 IA de visión: ' + v.error);
    const r = v.r, nom = CATEGORIAS[r.categoria], otra = nom && r.categoria !== Z.categoria, x = [r.manga && r.manga !== 'desconocida' ? 'manga ' + r.manga.replace('_', ' ') : '', r.cuello && !/descono/.test(r.cuello) ? 'cuello ' + r.cuello : '', r.cierre && !/descono|ninguno/.test(r.cierre) ? r.cierre : ''].filter(Boolean).join(', ');
    return h('div.dw-ayuda', '👁 IA de visión (' + (r.modelo || 'del PC') + '): ' + (nom || 'no lo sabe') + (x ? ', ' + x : '') + ' · ' + Math.round((r.confianza || 0) * 100) + ' %' + (r.notas ? ' — «' + r.notas + '»' : '') + ' ', otra ? h('a', { href: '#', onclick: e => { e.preventDefault(); cambiaCat(r.categoria); } }, 'Usar «' + nom + '»') : null);
  }
  async function visionIA(F) {
    let desk = null; try { desk = (await import('../desktop.js')).desktop; } catch (e) { desk = null; } if (!desk || !desk.on) return; // (solo en el programa del PC)
    F.iaVision = { pendiente: true }; if (FP === F) pintaListaPatron();
    try { const { conIA } = await import('./foto/clasifica.js'), c = document.createElement('canvas'), k = Math.min(1, 896 / Math.max(E.width, E.height)); c.width = Math.round(E.width * k); c.height = Math.round(E.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(lienzoDe({ w: E.width, h: E.height, d: E.data }), 0, 0, c.width, c.height);
      const r = await conIA(c.toDataURL('image/jpeg', 0.85)); F.iaVision = { r };
      const C = F.T.etapas.CLASIFICACION && F.T.etapas.CLASIFICACION.datos; if (C) { C.ia = r; C.pistas = { vista: r.vista, cuello: r.cuello, cierre: r.cierre, bolsillos: r.bolsillos, capucha: r.capucha, presentacion: r.presentacion }; }
      if (FP === F) enCola(async () => { await DF.rehaz(F, []); refrescaPatron(); });
    } catch (e) { F.iaVision = { error: e.message }; if (FP === F) pintaListaPatron(); }
  }
  function cambiaCat(k) { if (!FP) return; enCola(async () => { msg('Poniendo los puntos de ' + (CATEGORIAS[k] || k).toLowerCase() + '…'); await DF.cambiaCategoria(FP, k); selMed = null; selPt = null; refrescaPatron(); }); }
  // al soltar un punto (o tras las flechas): se mide otra vez y se rehace el patrón
  const rehazPunto = n => enCola(async () => { await DF.rehaz(FP, [n]); refrescaPatron(); });
  function empujaPunto() { if (!FP || !selPt) return; pintaPatron(DF.enVivo(FP, selPt)); clearTimeout(tEmp); const n = selPt; tEmp = setTimeout(() => rehazPunto(n), 350); }
  // la foto con la silueta, los puntos, las medidas y el patrón encima, para guardarla
  function fotoPatronPNG() {
    const c = document.createElement('canvas'), pie = Math.round(Math.max(40, E.height * 0.04)); c.width = E.width; c.height = E.height + pie; const g = c.getContext('2d'), s = Math.max(1, E.width / 1200);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(lienzo, 0, 0);
    const cl = capa.cloneNode(true); cl.setAttribute('xmlns', SVGNS); cl.setAttribute('width', E.width); cl.setAttribute('height', E.height); cl.removeAttribute('class');
    const img = new Image(); img.onload = () => { g.drawImage(img, 0, 0, E.width, E.height);
      const b = 100 / E.mmPorPx, y0 = E.height + pie / 2; g.fillStyle = TINTA; g.fillRect(16 * s, y0 - 3 * s, b, 6 * s); g.font = '700 ' + Math.round(13 * s) + 'px Arial'; g.textAlign = 'left'; g.fillText('10 cm', 16 * s + b + 8 * s, y0 + 5 * s);
      g.textAlign = 'right'; g.fillText('CelebriDREW · ' + (DF.resumen(FP).t || 'prenda') + ' · verde = silueta · dorado = patrón · 1 píxel = ' + coma(E.mmPorPx, 3) + ' mm', c.width - 16 * s, y0 + 5 * s);
      c.toBlob(bl => { o.descarga(bl, 'foto_patron_' + (DF.resumen(FP).k || 'prenda') + '.png'); toast('⬇ Foto con los puntos y las medidas en Descargas', 'ok'); }, 'image/png'); };
    img.onerror = () => toast('No se ha podido preparar la foto', 'bad'); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(cl));
  }

  // --- el RATÓN, el DEDO y el LÁPIZ (los tres con «pointer»; la captura va en la capa, que no se borra al repintar) ---
  capa.addEventListener('pointerdown', e => {
    if (e.pointerType === 'pen') vioLapiz = true;
    if ((vioLapiz && e.pointerType === 'touch') || arr || e.button > 0 || !W) return; // (la mano apoyada mientras se usa el lápiz; un solo dedo a la vez)
    const p = aImagen(e), s = esc(), tol = (e.pointerType === 'mouse' ? 18 : 34) * s;
    if (modo === 'esquinas') { if (!quad) return; let k = -1, dm = Infinity; quad.forEach((q, i) => { const d = dist(q, p); if (d < dm) { dm = d; k = i; } }); if (dm > tol) { sel = null; pintaEsquinas(); return; } sel = quad[k]; arr = { id: e.pointerId, pt: quad[k], ult: p }; }
    else if (modo === 'patron') { if (!FP || !FP.vista) return; let k = null, dm = tol; Object.entries(FP.vista).forEach(([n, q]) => { const d = dist(q, p); if (d < dm) { dm = d; k = n; } });
      if (!k) { if (selPt || selMed) { selPt = null; selMed = null; sel = null; pintaPatron(); pintaListaPatron(); } return; } selPt = k; selMed = null; sel = FP.vista[k]; arr = { id: e.pointerId, pt: sel, ult: p, nombre: k }; }
    else { let mejor = null, dm = tol; medidas.forEach(M => [M.a, M.b].forEach(q => { const d = dist(q, p); if (d < dm) { dm = d; mejor = q; } }));
      if (mejor) arr = { id: e.pointerId, pt: mejor, ult: p };
      else if (pend) { const M = { a: pend, b: p.slice(), mm: 0 }; medidas.push(M); pend = null; arr = { id: e.pointerId, pt: M.b, ult: p }; }
      else { const M = { a: p.slice(), b: p.slice(), mm: 0 }; medidas.push(M); arr = { id: e.pointerId, pt: M.b, ult: p, nueva: M, x0: e.clientX, y0: e.clientY }; }
      sel = arr.pt; }
    e.preventDefault(); try { capa.setPointerCapture(e.pointerId); } catch (x) { } verLupa(e, arr.pt); repinta();
  });
  capa.addEventListener('pointermove', e => {
    if (!arr) { // el ratón sin pulsar: mano encima de un círculo; lupa siguiendo al segundo punto
      if (e.pointerType !== 'mouse' || !W) return; const p = aImagen(e), tol = 18 * esc();
      if (modo === 'esquinas') capa.style.cursor = quad && quad.some(q => dist(q, p) < tol) ? 'grab' : 'default';
      else if (modo === 'patron') capa.style.cursor = FP && FP.vista && Object.values(FP.vista).some(q => dist(q, p) < tol) ? 'grab' : 'default';
      else { capa.style.cursor = medidas.some(M => dist(M.a, p) < tol || dist(M.b, p) < tol) ? 'grab' : 'crosshair'; if (pend) verLupa(e, p); }
      return; }
    if (e.pointerId !== arr.id) return;
    const p = aImagen(e), k = e.shiftKey ? 0.25 : 1; arr.pt[0] = Math.max(0, Math.min(W, arr.pt[0] + (p[0] - arr.ult[0]) * k)); arr.pt[1] = Math.max(0, Math.min(H, arr.pt[1] + (p[1] - arr.ult[1]) * k)); arr.ult = p;
    if (modo === 'patron') { arr.movio = true; pintaPatron(DF.enVivo(FP, arr.nombre)); } else { if (modo === 'medir') recalcula(); repinta(); } verLupa(e, arr.pt);
  });
  const suelta = e => {
    if (!arr || e.pointerId !== arr.id) return; const A = arr; arr = null; quitaLupa();
    if (modo === 'esquinas') { quad = CA.ordena(quad); pintaEsquinas(); return; }
    if (modo === 'patron') { if (A.movio) rehazPunto(A.nombre); else { pintaPatron(); pintaListaPatron(); } return; }
    if (A.nueva && Math.hypot(e.clientX - A.x0, e.clientY - A.y0) < 7) { medidas.splice(medidas.indexOf(A.nueva), 1); pend = A.nueva.a; sel = null; } // un toque: el 1.er punto
    for (let i = medidas.length - 1; i >= 0; i--) if (dist(medidas[i].a, medidas[i].b) < 3 * esc()) { if (sel === medidas[i].a || sel === medidas[i].b) sel = null; medidas.splice(i, 1); } // (las de un punto)
    recalcula(); pintaMedidas();
  };
  capa.addEventListener('pointerup', suelta); capa.addEventListener('pointercancel', suelta);
  capa.addEventListener('pointerleave', e => { if (!arr && e.pointerType === 'mouse') quitaLupa(); });
  const teclas = e => { if (!W || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return; const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (d && sel) { e.preventDefault(); const n = e.shiftKey ? 10 : 1; empuja(d[0] * n, d[1] * n); } };
  document.addEventListener('keydown', teclas);
  limpia = () => { ro.disconnect(); document.removeEventListener('keydown', teclas); if (o.repinta) o.repinta(); }; /* (la pestaña enseña «Última foto…» al cerrar) */

  // --- arranque ---
  async function abreFoto(f) {
    msg('Abriendo la foto…'); mount(botones, []); mount(lista, []);
    try { const I = await cargaArchivo(f, 2400); im = await imagenDe(I.id); D = pixeles(im); } catch (e) { msg('❌ ' + e.message + ' Elige otra con «📷 Otra foto…».', 'mal'); return; }
    quad = null; FP = null; verEsquinas(); await busca();
  }
  verPasos();
  if (!file) { if (!ultima) { m.close(); return; } ({ E, medidas, D, im } = ultima); FP = ultima.FP || null; quad = ultima.quad ? ultima.quad.map(p => p.slice()) : null; if (objetivo === 'patron') verPatron(); else verMedir(); return; }
  await abreFoto(file);
  return m;
}
