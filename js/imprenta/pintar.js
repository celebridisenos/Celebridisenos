// ================= 25-11-2026 · 🖨️ IMPRENTA · PINTAR una pieza (a cualquier tamaño: pantalla, 300 ppp, 600 ppp…) =================
// Todo se mide en mm y se pinta con k = píxeles por mm. La letra se reparte en líneas con una medida que NO depende de k:
// lo que ves en la pantalla es lo que sale en el papel. La parte de medir texto es pura (se prueba con node).
import { PT_MM, cajaGirada, caraDe } from './modelo.js';
import { qrMatrix } from '../qr.js';

// ---------- Letras (guardadas dentro del programa) ----------
const url = p => new URL(p, import.meta.url).href;
const FAM = { 'Inter': 'Imp Inter', 'Manrope': 'Imp Manrope', 'Instrument Serif': 'Imp Instrument', 'Great Vibes': 'Imp Vibes' };
const CARAS = [
  ...[[200, 'ExtraLight'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'SemiBold']].map(([w, n]) => ['Imp Inter', '../../vendor/fonts/inter/Inter-' + n + '.woff2', { weight: String(w) }]),
  ['Imp Manrope', '../../css/fuentes/manrope-latin-wght-normal.woff2', { weight: '200 800' }],
  ['Imp Instrument', '../../vendor/fonts/instrument/InstrumentSerif-Italic.woff2', { weight: '400', style: 'italic' }],
  ['Imp Vibes', '../../vendor/fonts/greatvibes/GreatVibes-Regular.ttf', { weight: '400' }]
];
let fuentesP = null; export const faltanFuentes = [];
export function cargarFuentes() {
  if (fuentesP) return fuentesP;
  fuentesP = Promise.all(CARAS.map(async ([f, u, d]) => {
    try { const x = new FontFace(f, 'url(' + url(u) + ')', d); await x.load(); document.fonts.add(x); if (f === 'Imp Instrument') { const y = new FontFace(f, 'url(' + url(u) + ')', { weight: '400', style: 'normal' }); await y.load(); document.fonts.add(y); } }
    catch (e) { faltanFuentes.push(f); } // (sin esa letra se pinta con la siguiente: nunca se queda en blanco)
  }));
  return fuentesP;
}
export function fuenteCss(c, px) {
  const f = c.fuente || 'Inter';
  const fam = f === 'monospace' ? '"Cascadia Mono", Consolas, "Courier New", monospace' : '"' + (FAM[f] || f) + '", ' + (f === 'Great Vibes' ? '"Segoe Script", cursive, ' : f === 'Instrument Serif' ? 'Georgia, serif, ' : '"Imp Inter", ') + '"Segoe UI", sans-serif';
  return (c.cursiva || f === 'Instrument Serif' ? 'italic ' : '') + (f === 'Instrument Serif' || f === 'Great Vibes' ? 400 : c.peso || 500) + ' ' + px + 'px ' + fam;
}

// ---------- Texto: partir en líneas y encoger si no cabe (puro: medir(texto, capa) = ancho con letra de 1 mm) ----------
export const textoDe = c => c.mayus ? String(c.texto || '').toLocaleUpperCase('es-ES') : String(c.texto || '');
export function maquetar(c, medir) {
  const esp = (Number(c.espaciado) || 0) / 1000, il = Number(c.interlinea) || 1.2;
  const ancho = (t, tam) => (medir(t, c) + esp * Math.max(0, [...t].length - 1)) * tam;
  const parte = tam => {
    const L = [];
    textoDe(c).split('\n').forEach(par => {
      if (c.curva) { L.push(par); return; }
      let linea = '';
      par.split(/ +/).forEach(p => { const t = linea ? linea + ' ' + p : p; if (linea && ancho(t, tam) > c.w + 0.01) { L.push(linea); linea = p; } else linea = t; });
      L.push(linea);
    });
    return L;
  };
  let pt = Math.max(1, Number(c.tam) || 10), L, n = 0;
  for (;;) {
    const tam = pt * PT_MM; L = parte(tam);
    if (!c.ajustar || c.curva || pt <= 3 || ++n > 200) break;
    const alto = ((L.length - 1) * il + 1) * tam;
    if (alto <= c.h + 0.05 && L.every(l => ancho(l, tam) <= c.w + 0.05)) break;
    pt = Math.max(3, Math.round((pt - Math.max(0.1, pt * 0.015)) * 100) / 100);
  }
  const tam = pt * PT_MM;
  return { pt, tam, il, lineas: L.map(t => ({ t, w: ancho(t, tam) })), alto: ((L.length - 1) * il + 1) * tam };
}
let gm = null, cacheM = new Map();
export function medirNavegador(t, c) {
  const f = fuenteCss(c, 100), k = f + '\n' + t; if (cacheM.has(k)) return cacheM.get(k);
  if (!gm) gm = document.createElement('canvas').getContext('2d');
  gm.font = f; const v = gm.measureText(t).width / 100; if (cacheM.size > 4000) cacheM = new Map(); cacheM.set(k, v); return v;
}
// La caja que ocupan de verdad las letras (para elegir, imantar y revisar)
export function cajaTexto(c, medir = medirNavegador) {
  if (c.t !== 'texto' || c.curva) return cajaGirada(c);
  const M = maquetar(c, medir), w = Math.max(0.5, ...M.lineas.map(l => l.w)), hh = M.alto;
  const x = c.alin === 'centro' ? c.x + (c.w - w) / 2 : c.alin === 'der' ? c.x + c.w - w : c.x, y = c.vAlin === 'centro' ? c.y + (c.h - hh) / 2 : c.vAlin === 'abajo' ? c.y + c.h - hh : c.y;
  if (!c.rot) return { x, y, w, h: hh };
  const a = c.rot * Math.PI / 180, cx = c.x + c.w / 2, cy = c.y + c.h / 2, dx = x + w / 2 - cx, dy = y + hh / 2 - cy;
  return cajaGirada({ x: cx + dx * Math.cos(a) - dy * Math.sin(a) - w / 2, y: cy + dx * Math.sin(a) + dy * Math.cos(a) - hh / 2, w, h: hh, rot: c.rot });
}

// ---------- Imágenes y logos ----------
const imgs = new Map(); // src → imagen o lienzo ya cargado
const cargando = new Map();
const imagen = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('No se puede leer una imagen')); im.src = src; });
const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
// El logo de CD es una imagen sobre negro (480 px). De ahí salen: 'celebri' (sin el negro y sin el aro, para fondos oscuros),
// 'celebri-circulo' (tal cual, en círculo negro: para fondos claros), 'celebri-blanco' y 'celebri-grafito' (silueta de un color).
async function logo(cual) {
  const im = await imagen(url('../../icons/logo-full.png')), W = im.naturalWidth, H = im.naturalHeight, k = W / 480;
  if (cual === 'celebri-circulo') { const c = lienzo(W, H), g = c.getContext('2d'); g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, 7); g.clip(); g.drawImage(im, 0, 0); return c; }
  // sin el aro: el símbolo (C y destello) y la palabra
  const z = cual === 'celebri-simbolo' || cual === 'celebri-simbolo-blanco' || cual === 'celebri-simbolo-grafito' ? [108, 70, 264, 264] : [36, 70, 420, 326];
  const c = lienzo(z[2] * k, z[3] * k), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, z[0] * k, z[1] * k, z[2] * k, z[3] * k, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data, plano = /blanco$/.test(cual) ? 255 : /grafito$/.test(cual) ? 0 : -1;
  for (let i = 0, n = 0; i < p.length; i += 4, n++) {
    const x = (n % c.width) / k + z[0], y = Math.floor(n / c.width) / k + z[1], m = Math.max(p[i], p[i + 1], p[i + 2]);
    if (Math.abs(Math.hypot(x - 240, y - 240) - 226) < 9 && !(y > 333 && y < 386)) { p[i + 3] = 0; continue; } // (el aro, fuera; donde cruza la palabra, se queda la palabra)
    if (plano < 0) { const a = Math.min(1, m / 200); p[i + 3] = Math.round(255 * a); if (a > 0) for (let q = 0; q < 3; q++) p[i + q] = Math.min(255, p[i + q] / a); }
    else { const t = Math.max(0, Math.min(1, (m - 34) / 70)); p[i + 3] = Math.round(255 * t * t * (3 - 2 * t)); p[i] = plano ? 255 : 31; p[i + 1] = plano ? 255 : 35; p[i + 2] = plano ? 255 : 40; }
  }
  g.putImageData(d, 0, 0); return c;
}
export function traer(src) {
  if (!src || imgs.has(src)) return Promise.resolve(imgs.get(src) || null);
  if (cargando.has(src)) return cargando.get(src);
  const p = (src.startsWith('logo:') ? logo(src.slice(5)) : /^(data:image\/|blob:|\/|\.|https?:\/\/(127\.0\.0\.1|localhost))/.test(src) ? imagen(src) : Promise.reject(new Error('Imagen de fuera')))
    .then(im => { if (imgs.size > 120) imgs.delete(imgs.keys().next().value); imgs.set(src, im); cargando.delete(src); return im; }, () => { cargando.delete(src); return null; });
  cargando.set(src, p); return p;
}
export const tamImagen = src => { const im = imgs.get(src); return im ? { w: im.naturalWidth || im.width, h: im.naturalHeight || im.height } : null; };
export async function preparar(...docs) {
  await cargarFuentes();
  const s = new Set(); docs.filter(Boolean).forEach(d => [d.capas || [], (d.dorso && d.dorso.capas) || []].forEach(L => L.forEach(c => { if (c.t === 'imagen' && c.src) s.add(c.src); })));
  await Promise.all([...s].map(traer));
}

// ---------- Pintar ----------
export function rutaCorte(g, doc, k, exp = 0) { // el contorno de corte (esquina en 0,0), agrandado «exp» mm
  const x = -exp * k, y = -exp * k, w = (doc.w + 2 * exp) * k, h = (doc.h + 2 * exp) * k;
  g.beginPath();
  if (doc.forma === 'circulo' || doc.forma === 'ovalo') g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (doc.forma === 'redondo' && doc.radio > 0) g.roundRect(x, y, w, h, (Number(doc.radio) + exp) * k);
  else g.rect(x, y, w, h);
}
function rellenoFondo(g, f, x, y, w, h) {
  if (f && typeof f === 'object') {
    if (f.tipo === 'degradado') { const a = (Number(f.ang) || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), L = (Math.abs(w * c) + Math.abs(h * s)) / 2, cx = x + w / 2, cy = y + h / 2, q = g.createLinearGradient(cx - c * L, cy - s * L, cx + c * L, cy + s * L); q.addColorStop(0, f.a); q.addColorStop(1, f.b); return q; }
    return f.color || '#ffffff';
  }
  return f || '#ffffff';
}
function trazaForma(g, c, k) { // ruta de una forma dentro de su caja (0,0)–(w,h) en px
  const w = c.w * k, h = c.h * k; g.beginPath();
  if (c.forma === 'elipse') g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (c.forma === 'linea') { g.moveTo(0, h / 2); g.lineTo(w, h / 2); }
  else if (c.forma === 'rect') { if (c.radio > 0) g.roundRect(0, 0, w, h, Math.min(c.radio * k, w / 2, h / 2)); else g.rect(0, 0, w, h); }
  else { puntosForma(c).forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x * k, y * k)); g.closePath(); }
}
export function puntosForma(c) { // triángulo, rombo, estrella → puntos en mm
  const w = c.w, h = c.h;
  if (c.forma === 'triangulo') return [[w / 2, 0], [w, h], [0, h]];
  if (c.forma === 'rombo') return [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
  const n = Math.max(3, Number(c.puntas) || 5), r = c.hondo || 0.42, P = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : 1; P.push([w / 2 + Math.cos(a) * w / 2 * q, h / 2 + Math.sin(a) * h / 2 * q]); } return P;
}
export function planQr(c) { const M = qrMatrix(String(c.datos || ' '), c.nivel || 'M'), N = M.length, q = Math.max(0, Math.min(4, Number(c.margen) || 0)); return { M, N, q }; }

function pintaTexto(g, c, k) {
  const M = maquetar(c, medirNavegador), px = M.tam * k; if (px < 0.4) return;
  g.font = fuenteCss(c, px); g.fillStyle = c.color; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const esp = (Number(c.espaciado) || 0) / 1000 * px, conLS = 'letterSpacing' in g; if (conLS) g.letterSpacing = esp.toFixed(3) + 'px';
  if (c.curva) { pintaCurva(g, c, k, M, esp); if (conLS) g.letterSpacing = '0px'; return; }
  const y0 = c.vAlin === 'centro' ? (c.h - M.alto) / 2 : c.vAlin === 'abajo' ? c.h - M.alto : 0, base = c.fuente === 'Great Vibes' ? 0.72 : 0.855;
  M.lineas.forEach((l, i) => {
    const x = c.alin === 'centro' ? (c.w - l.w) / 2 : c.alin === 'der' ? c.w - l.w : 0;
    g.fillText(l.t, x * k, (y0 + i * M.il * M.tam + base * M.tam) * k);
  });
  if (conLS) g.letterSpacing = '0px';
}
function pintaCurva(g, c, k, M, esp) { // el texto sobre un círculo (centro = centro de la caja)
  const r = Math.abs(c.curva) * k, arriba = c.curva > 0, t = textoDe(c).replace(/\n/g, ' '), L = [...t];
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  const w = L.map(ch => g.measureText(ch).width + esp), total = w.reduce((a, b) => a + b, 0) - esp; let a = arriba ? -total / r / 2 : total / r / 2;
  g.save(); g.translate(c.w * k / 2, c.h * k / 2); g.textAlign = 'center';
  L.forEach((ch, i) => { const m = (w[i] - esp) / 2 / r, av = w[i] / r; g.save(); if (arriba) { g.rotate(a + m); g.fillText(ch, 0, -r); a += av; } else { g.rotate(a - m); g.fillText(ch, 0, r); a -= av; } g.restore(); });
  g.restore(); g.textAlign = 'left';
}
function pintaImagen(g, c, k, o) {
  const im = c.src ? imgs.get(c.src) : null, W = c.w * k, H = c.h * k;
  if (!im) {
    if (o.huecos === false) return;
    g.save(); g.fillStyle = 'rgba(138,143,152,.16)'; g.strokeStyle = 'rgba(138,143,152,.9)'; g.lineWidth = Math.max(1, 0.25 * k); g.setLineDash([1.4 * k, 1 * k]); g.beginPath(); if (c.radio > 0) g.roundRect(0, 0, W, H, c.radio * k); else g.rect(0, 0, W, H); g.fill(); g.stroke(); g.setLineDash([]);
    const z = Math.min(2.6, c.w * 0.1, c.h * 0.16) * k; if (z > 3) { g.fillStyle = 'rgba(110,116,126,1)'; g.font = fuenteCss({ fuente: 'Inter', peso: 500 }, z); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.hueco || 'Foto', W / 2, H / 2 - z * 0.7); g.fillText('por rellenar', W / 2, H / 2 + z * 0.7); g.textAlign = 'left'; }
    g.restore(); return;
  }
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height; g.save();
  if (c.radio > 0 || c.ajuste === 'cubrir') { g.beginPath(); if (c.radio > 0) g.roundRect(0, 0, W, H, Math.min(c.radio * k, W / 2, H / 2)); else g.rect(0, 0, W, H); g.clip(); }
  let w = W, h = H; if (c.ajuste !== 'estirar') { const e = (c.ajuste === 'cubrir' ? Math.max : Math.min)(W / iw, H / ih); w = iw * e; h = ih * e; }
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); g.restore();
}
function pintaQr(g, c, k) {
  const W = c.w * k, H = c.h * k, lado = Math.min(W, H), P = planQr(c); let mod = lado / (P.N + 2 * P.q); if (mod >= 1) mod = Math.floor(mod + 1e-6); // (cuadros de píxeles enteros: nada de bordes a medias)
  const t = mod * (P.N + 2 * P.q); let x = (W - t) / 2, y = (H - t) / 2; if (mod >= 1) { x = Math.round(x); y = Math.round(y); }
  if (c.fondoQr) { g.fillStyle = c.fondoQr; g.fillRect(Math.round((W - lado) / 2), Math.round((H - lado) / 2), Math.round(lado), Math.round(lado)); }
  g.fillStyle = c.color || '#000'; const q = P.q * mod; g.beginPath();
  P.M.forEach((f, r) => { for (let i = 0; i < P.N; i++) if (f[i]) { let n = 1; while (i + n < P.N && f[i + n]) n++; g.rect(x + q + i * mod, y + q + r * mod, n * mod, mod); i += n; } });
  g.fill();
}
function pintaDibujo(g, c, k) {
  const sx = c.w / (c.w0 || c.w || 1) * k, sy = c.h / (c.h0 || c.h || 1) * k, s = Math.min(sx, sy);
  (c.trazos || []).forEach(t => {
    if (!t.p || !t.p.length) return; g.beginPath(); t.p.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x * sx, y * sy)); if (t.cerrado) g.closePath();
    if (t.relleno) { g.fillStyle = t.relleno; g.fill(); }
    if (t.color && t.grosor > 0) { g.strokeStyle = t.color; g.lineWidth = t.grosor * s; g.lineCap = t.punta || 'round'; g.lineJoin = 'round'; g.stroke(); }
  });
}
export function pintarCapa(g, c, k, o = {}) {
  if (c.oculta) return;
  g.save(); let x = c.x * k, y = c.y * k;
  if (c.t === 'qr' && !c.rot) { x = Math.round(x); y = Math.round(y); }
  g.translate(x, y); if (c.rot) { g.translate(c.w * k / 2, c.h * k / 2); g.rotate(c.rot * Math.PI / 180); g.translate(-c.w * k / 2, -c.h * k / 2); }
  if (c.op !== undefined && c.op !== null && c.op < 1) g.globalAlpha *= Math.max(0, Number(c.op));
  if (c.t === 'texto') pintaTexto(g, c, k);
  else if (c.t === 'imagen') pintaImagen(g, c, k, o);
  else if (c.t === 'qr') { if (String(c.datos || '').trim()) pintaQr(g, c, k); else pintaImagen(g, Object.assign({}, c, { src: '', hueco: 'QR', radio: 1 }), k, o); }
  else if (c.t === 'dibujo') pintaDibujo(g, c, k);
  else if (c.t === 'forma') {
    trazaForma(g, c, k);
    if (c.relleno && c.forma !== 'linea') { g.fillStyle = c.relleno; g.fill(); }
    const col = c.borde || (c.forma === 'linea' ? c.relleno : ''); if (col && c.grosor > 0) { g.strokeStyle = col; g.lineWidth = c.grosor * k; g.lineJoin = 'round'; if (c.raya) g.setLineDash(c.raya.map(v => v * k)); g.stroke(); g.setLineDash([]); }
  }
  g.restore();
}
// o: { cara, k, sangrado: bool (pinta también lo que sale del corte), recorte: bool (recorta con la forma), huecos: bool, sinFondo }
// La esquina del CORTE queda en el (0,0) del lienzo actual: haz antes g.translate(…).
export function pintarCara(g, doc, o = {}) {
  const k = o.k, F = caraDe(doc, o.cara), e = o.sangrado ? Number(doc.sangrado) || 0 : 0;
  g.save(); if (o.recorte !== false) { rutaCorte(g, doc, k, e); g.clip(); }
  if (!o.sinFondo) { g.fillStyle = rellenoFondo(g, F.fondo, -e * k, -e * k, (doc.w + 2 * e) * k, (doc.h + 2 * e) * k); g.fillRect(-e * k - 1, -e * k - 1, (doc.w + 2 * e) * k + 2, (doc.h + 2 * e) * k + 2); }
  (F.capas || []).forEach(c => pintarCapa(g, c, k, o));
  g.restore();
}
// Un lienzo con una cara de la pieza · { dpi, cara, sangrado, transparente (fuera de la forma, sin color), recorte }
export async function canvasPieza(doc, o = {}) {
  await preparar(doc);
  const k = (o.dpi || 300) / 25.4, e = o.sangrado ? Number(doc.sangrado) || 0 : 0, c = lienzo((doc.w + 2 * e) * k, (doc.h + 2 * e) * k), g = c.getContext('2d');
  if (!o.transparente) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
  g.translate(Math.round(e * k), Math.round(e * k)); pintarCara(g, doc, Object.assign({}, o, { k }));
  return c;
}
// Vista previa rápida (miniatura) que cabe en maxW × maxH píxeles
export async function miniatura(doc, maxW, maxH, o = {}) {
  await preparar(doc);
  const k = Math.min(maxW / doc.w, maxH / doc.h) * (o.escala || window.devicePixelRatio || 1), c = lienzo(doc.w * k, doc.h * k), g = c.getContext('2d');
  pintarCara(g, doc, { k, cara: o.cara }); return c;
}
