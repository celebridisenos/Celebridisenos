// ================= v11 · Etiquetas profesionales al tamaño EXACTO =================
// Problema: imprimir desde el navegador escala y añade márgenes (las etiquetas salían mal).
// Solución: la etiqueta se DIBUJA a la resolución de la impresora (203 ppp térmica / 300 ppp tinta)
// y, en el PC, el programa la manda directa a la impresora con su tamaño en milímetros, márgenes 0
// y escala 100 % (sin diálogo). En el móvil se genera un PDF con el tamaño de página exacto.
// Plantillas: envío 10×15, producto, almacén/caja y QR. La impresora se elige sola (térmica 4×6
// para envíos; si no hay, la de folios con la etiqueta a tamaño real) y cada PC recuerda la suya.
import { h, mount, btn, modal, toast, field, sel, inp, eur, fdate } from './ui.js';
import { S, api } from './store.js';
import { desktop } from './desktop.js';
import { qrPlan, qrPlanFixed } from './qr.js';
import * as RP from './rawprint.js';
import { appUrl, emisor } from './print.js';

const CL = window.CL;
export const TEMPLATES = {
  envio: { t: 'Envío', w: 100, h: 150, d: '10 × 15 cm · para el paquete' },
  producto: { t: 'Producto', w: 50, h: 30, d: 'nombre, SKU, precio y QR' },
  almacen: { t: 'Almacén / caja', w: 100, h: 50, d: 'ubicación grande y QR del stock' },
  qr: { t: 'QR', w: 40, h: 40, d: 'QR universal: abre la ficha al escanearlo' },
  mesa: { t: 'QR de la mesa de trabajo', w: 100, h: 100, d: 'QR grande para pegar en la mesa: al escanearlo con el móvil abre Escanear paquete / Empaquetar / Hoy' },
  // v11.6 · EMPAQUETAR
  oficial: { t: 'Etiqueta de envío oficial', w: 100, h: 150, d: 'la de Vinted, Correos, InPost…: la adjuntas y sale tal cual (nunca se inventa)' },
  paquete: { t: 'Código del paquete', w: 50, h: 50, d: 'QR + código interno CEB + nº de pedido: se escanea al empaquetar' },
  qrtest: { t: 'Prueba de QR (6 tamaños)', w: 100, h: 150, d: 'el mismo QR en 6 tamaños: sirve para ver cuál lee mejor tu móvil con tu impresora' },
  regalo: { t: 'Tarjeta de regalo con QR', w: 85, h: 55, d: 'QR único: abre la página «Tu regalo» de la tienda (con tu dedicatoria)' },
  gracias: { t: 'Tarjeta de agradecimiento (50 × 50, modo antiguo)', w: 50, h: 50, d: 'en la impresora de etiquetas, una por pedido' },
  // v11.8: tarjetas UNIVERSALES en hoja A4 para la impresora de papel fotográfico (varias por hoja, con corte)
  tarjetas: { t: 'Tarjetas de agradecimiento (hoja A4)', w: 210, h: 297, d: 'varias tarjetas por hoja, para papel fotográfico' }
};
export const CARD_SIZES = { '85x55': { w: 85, h: 55, t: '85 × 55 mm (como una tarjeta de visita)' }, '100x70': { w: 100, h: 70, t: '100 × 70 mm' }, '105x74': { w: 105, h: 74, t: '105 × 74 mm (A7)' }, '148x105': { w: 148, h: 105, t: '148 × 105 mm (A6, postal)' } };
const A4 = { w: 210, h: 297 };

// ---------- Configuración de este PC (impresora por plantilla, tamaños y calibración) ----------
let cfgCache = null, printersCache = null;
export async function labelCfg() {
  if (cfgCache) return cfgCache;
  let c = null;
  try { c = JSON.parse((await desktop.getConfig('etiquetas')) || 'null'); } catch (e) { }
  if (!c) { try { c = JSON.parse(localStorage.getItem('cd.etiquetas') || 'null'); } catch (e) { } }
  cfgCache = Object.assign({ impresora: {}, tam: {}, ajuste: {} }, c || {});
  return cfgCache;
}
export async function saveLabelCfg(c) {
  cfgCache = c;
  const s = JSON.stringify(c);
  if (desktop.on) await desktop.setConfig('etiquetas', s); else { try { localStorage.setItem('cd.etiquetas', s); } catch (e) { } }
}
export async function printers(force) {
  if (printersCache && !force) return printersCache;
  let list = [];
  if (desktop.on) { try { list = (await desktop.printers()).impresoras || []; } catch (e) { list = []; } }
  // v13.2: impresora por Bluetooth directa (la configurada en «Impresión → Impresora Bluetooth»): aparece como una más
  const c = await labelCfg(), bt = c.bt;
  if (bt && bt.lang) {
    const base = { label: true, label4x6: true, conexion: 'Bluetooth directo', estado: 'Lista', papers: [{ name: '100x150mm', wmm: 100, hmm: 150 }, { name: '50x50mm', wmm: 50, hmm: 50 }], bt: true };
    if (desktop.on && bt.port) {
      let falta = false;
      try { const r = await desktop.puertos(); falta = !(r.puertos || []).some(x => x.port === bt.port); } catch (e) { }
      list.push(Object.assign(base, { name: btPrinterName(bt), raw: { port: bt.port, lang: bt.lang }, offline: falta, problema: falta ? 'Windows ya no tiene el puerto ' + bt.port + ' (¿impresora sin emparejar?)' : '' }));
    } else if (!desktop.on && bt.web && RP.webBtOk()) {
      list.push(Object.assign(base, { name: btPrinterName(bt), webbt: true, raw: { lang: bt.lang }, offline: false, problema: '' }));
    }
  }
  printersCache = list;
  return printersCache;
}
export const btPrinterName = bt => 'Bluetooth · ' + ((bt && bt.nombre) || (bt && bt.port) || 'impresora') + ' (directa)';
// v11.2: impresoras reales (sin colas duplicadas del mismo aparato ni impresoras virtuales tipo PDF)
export const realPrinters = list => (list || []).filter(p => !p.duplicadaDe && p.conexion !== 'Virtual');
export function sizeOf(tpl, c) { const t = TEMPLATES[tpl]; const s = (c && c.tam && c.tam[tpl]) || {}; return { w: Number(s.w) || t.w, h: Number(s.h) || t.h }; }
// Elige la impresora: la guardada para esa plantilla; si no, la que la persona vinculó («Esta es mi impresora
// de etiquetas / de folios»); si no, una de etiquetas 10×15 para envíos y la de folios para el resto.
export function pickPrinter(tpl, list, c) {
  const saved = c && c.impresora && c.impresora[tpl];
  if (saved && list.some(p => p.name === saved)) return list.find(p => p.name === saved);
  const v = (c && c.vinculo) || {};
  const real = realPrinters(list), on = real.filter(p => !p.offline);
  const byName = n => n && real.find(p => p.name === n);
  const lab = byName(v.etiquetas) || on.find(p => p.label && p.label4x6) || on.find(p => p.label);
  const sheet = byName(v.folios) || on.find(p => p.default && !p.label) || on.find(p => !p.label);
  if (tpl === 'envio' || tpl === 'oficial' || tpl === 'mesa') return lab || sheet || null;
  if (tpl === 'tarjetas') return sheet || null; // nunca a la de etiquetas
  // v11.6: código del paquete y tarjeta de gracias (50 × 50): mejor una de etiquetas con ese papel; si no, la de etiquetas
  if (tpl === 'paquete' || tpl === 'gracias') {
    const sq = on.find(p => p.label && (p.papers || []).some(x => Math.abs(x.wmm - 50) <= 4 && Math.abs(x.hmm - 50) <= 4));
    return sq || lab || sheet || null;
  }
  return sheet || lab || null;
}
const dpiOf = p => (p && p.label ? 203 : 300);
// ¿Cabe la etiqueta en el papel de esa impresora o es de folios (A4)? En A4 se colocan varias por hoja.
const isSheet = (p, s) => !!p && !p.label && (p.a4 || !(p.papers || []).some(x => Math.abs(Math.min(x.wmm, x.hmm) - Math.min(s.w, s.h)) <= 4 && Math.abs(Math.max(x.wmm, x.hmm) - Math.max(s.w, s.h)) <= 6));

// ---------- QR universal ----------
// v12.2 · QR de la MESA DE TRABAJO: se pega una vez y, con la cámara del móvil, abre directamente cada pantalla
export const MESA = [
  { id: 'escanear', t: 'ESCANEAR PAQUETE', d: 'Abre la cámara para leer el QR del paquete' },
  { id: 'empaquetar', t: 'EMPAQUETAR', d: 'Pedidos que esperan caja y etiquetas' },
  { id: 'hoy', t: 'HOY', d: 'Qué fabricar, preparar y enviar hoy' }
];
export const mesaData = a => ({ qr: qrLink('mesa', a.id), titulo: a.t, ref: { entidad: 'mesa', id: a.id } });
export function qrLink(tipo, id) { const b = appUrl(); return b ? b + '#/q/' + tipo + '/' + encodeURIComponent(id) : ''; }

// ---------- Dibujo ----------
function mk(wmm, hmm, dpi) {
  const c = document.createElement('canvas');
  c.width = Math.round(wmm / 25.4 * dpi); c.height = Math.round(hmm / 25.4 * dpi);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000'; g.strokeStyle = '#000';
  g.textBaseline = 'top';
  const k = dpi / 25.4; // px por mm
  const F = (pt, w) => (w || 400) + ' ' + Math.round(pt * 0.3528 * k) + 'px "Segoe UI", Arial, sans-serif';
  return { c, g, k, F };
}
function wrap(g, text, maxW) {
  const out = [];
  String(text || '').split('\n').forEach(par => {
    let line = '';
    par.split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
    out.push(line);
  });
  return out;
}
function text(g, F, s, x, y, maxW, pt, weight, maxLines) {
  g.font = F(pt, weight);
  let lines = wrap(g, s, maxW).filter((l, i, a) => l !== '' || i < a.length - 1);
  if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,1}$/, '…'); }
  const lh = pt * 0.3528 * g.__k * 1.2;
  lines.forEach((l, i) => g.fillText(l, x, y + i * lh));
  return y + lines.length * lh;
}
function qr(g, data, x, y, size) {
  if (!data) return;
  // v12.10: «size» es la caja que ocupa el QR CON su zona blanca. Módulos de píxeles enteros, centrado y en blanco/negro puros.
  const k = g.__k || 8, P = qrPlan(data, Math.floor(size), Math.round(1.0 * k)), ox = Math.round(x + (size - P.side) / 2), oy = Math.round(y + (size - P.side) / 2);
  g.fillStyle = '#fff'; g.fillRect(Math.floor(x), Math.floor(y), Math.ceil(size), Math.ceil(size)); g.fillStyle = '#000';
  P.M.forEach((row, r) => row.forEach((v, c) => { if (v) g.fillRect(ox + (c + P.q) * P.mod, oy + (r + P.q) * P.mod, P.mod, P.mod); }));
}
function fit(g, s, maxW) { s = String(s || ''); while (s.length > 1 && g.measureText(s).width > maxW) s = s.slice(0, -2) + '…'; return s; }
// Tarjeta de gracias: título, texto y firma centrados; devuelve dónde acaba (mm). dry = solo medir.
function centered(g, F, k, d, y, cw, W, sz, dry) {
  const parts = [[d.titulo, 11, 800], [d.texto, 8, 400], [d.firma, 7.5, 600]].filter(p => p[0]);
  g.textAlign = 'center';
  parts.forEach(([t, pt, wt], i) => {
    g.font = F(pt * sz, wt);
    const lh = pt * sz * 0.3528 * 1.18;
    wrap(g, t, cw * k).forEach(l => { if (!dry) g.fillText(l, (W / 2) * k, y * k); y += lh; });
    if (i < parts.length - 1) y += 1.2 * sz;
  });
  g.textAlign = 'left';
  return y;
}
// Logo de la empresa (cargado una vez) para la tarjeta de gracias
let logoP = null;
export function loadLogo() {
  if (logoP) return logoP;
  logoP = new Promise(res => { const src = emisor().logo; if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  return logoP;
}
export function resetLogo() { logoP = null; }
function line(g, x1, y1, x2, y2, w) { g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }

export function draw(tpl, d, dpi, size) {
  const s = size || TEMPLATES[tpl], { c, g, k, F } = mk(s.w, s.h, dpi);
  g.__k = k;
  const W = s.w, H = s.h, m = 3; // margen interior en mm
  const T = (str, xmm, ymm, wmm, pt, weight, maxLines) => text(g, F, str, xmm * k, ymm * k, wmm * k, pt, weight, maxLines) / k;
  if (tpl === 'envio') {
    g.lineWidth = 0.6 * k; g.strokeRect(1.5 * k, 1.5 * k, (W - 3) * k, (H - 3) * k);
    // cabecera: nº de pedido y fecha
    g.fillRect(1.5 * k, 1.5 * k, (W - 3) * k, 11 * k); g.fillStyle = '#fff';
    T('PEDIDO Nº ' + (d.numero || ''), m + 1, 3.2, W - 40, 15, 800, 1);
    g.textAlign = 'right'; g.font = F(9, 600); g.fillText(d.fecha ? fdate(d.fecha) : '', (W - m - 1) * k, 4.8 * k); g.textAlign = 'left';
    g.fillStyle = '#000';
    // remitente
    let y = 16;
    T('REMITENTE', m + 1, y, 40, 6.5, 700); y += 3.5;
    y = T([d.de.nombre, d.de.direccion, d.de.localidad, d.de.telefono].filter(Boolean).join('\n'), m + 1, y, W - 2 * m - 2, 8, 400, 4) + 1.5;
    line(g, 1.5 * k, y * k, (W - 1.5) * k, y * k, 0.4 * k); y += 3;
    // destinatario (lo más grande)
    T('DESTINATARIO', m + 1, y, 40, 7, 800); y += 4;
    y = T(d.para.nombre || '', m + 1, y, W - 2 * m - 2, 18, 800, 2) + 1.5;
    y = T(d.para.direccion || 'Dirección: ____________________________\n____________________________________', m + 1, y, W - 2 * m - 2, 14, 500, 6) + 1.5;
    if (d.para.telefono) y = T('Tel. ' + d.para.telefono, m + 1, y, W - 2 * m - 2, 12, 700, 1);
    // pie: QR + contenido + transportista
    const qs = 40, qy = H - m - qs - 1.5; // v12.10: QR de 40 mm (antes 32): se lee a más distancia con la cámara del PC
    line(g, 1.5 * k, (qy - 2.5) * k, (W - 1.5) * k, (qy - 2.5) * k, 0.4 * k);
    qr(g, d.qr, (m + 0.5) * k, qy * k, qs * k);
    let y2 = qy;
    y2 = T(d.contenido || '', m + qs + 3, y2, W - qs - 2 * m - 4, 9, 700, 3) + 1;
    if (d.envio) y2 = T(d.envio + (d.seguimiento ? ' · ' + d.seguimiento : ''), m + qs + 3, y2, W - qs - 2 * m - 4, 8.5, 500, 2) + 1;
    if (d.qr) T('Escanea al entregarlo: se marca como enviado.', m + qs + 3, Math.max(y2, qy + qs - 7), W - qs - 2 * m - 4, 6.5, 400, 2);
  } else if (tpl === 'producto') {
    const qs = Math.min(H - 3, W * 0.48); // v12.10: QR más grande (incluye su zona blanca)
    qr(g, d.qr, (W - 1 - qs) * k, ((H - qs) / 2) * k, qs * k);
    const tw = W - qs - 2 * m - 1;
    let y = m - 0.5;
    y = T(d.nombre || '', m, y, tw, H < 35 ? 8.5 : 10, 800, 2) + 0.5;
    if (d.sku) y = T(d.sku, m, y, tw, 6.5, 500, 1) + 0.5;
    if (d.extra) y = T(d.extra, m, y, tw, 6.5, 400, 1);
    if (d.precio) { g.font = F(H < 35 ? 13 : 16, 800); g.fillText(eur(d.precio), m * k, (H - m - (H < 35 ? 5.5 : 7)) * k); }
  } else if (tpl === 'almacen') {
    g.lineWidth = 0.5 * k; g.strokeRect(1 * k, 1 * k, (W - 2) * k, (H - 2) * k);
    const qs = H - 2 * m - 2;
    qr(g, d.qr, (W - m - qs - 1) * k, (m + 1) * k, qs * k);
    const tw = W - qs - 2 * m - 4;
    let y = m + 0.5;
    T('UBICACIÓN', m + 1, y, tw, 6.5, 700); y += 3.5;
    y = T(d.ubicacion || '—', m + 1, y, tw, 20, 800, 2) + 1;
    y = T(d.nombre || '', m + 1, y, tw, 9, 700, 2) + 0.5;
    if (d.sku) T(d.sku, m + 1, y, tw, 7, 400, 1);
  } else if (tpl === 'oficial') {
    // la etiqueta oficial ya viene dibujada (de su PDF o imagen): se coloca entera, sin deformarla
    const src = d.canvas;
    if (src) { const sc = Math.min(c.width / src.width, c.height / src.height), w = src.width * sc, hh = src.height * sc; g.drawImage(src, (c.width - w) / 2, (c.height - hh) / 2, w, hh); }
    else T('Falta la etiqueta oficial', m, m, W - 2 * m, 12, 700, 2);
  } else if (tpl === 'paquete') {
    const cap = 12, qs = Math.min(W - 2 * m, H - cap - m);
    qr(g, d.qr, ((W - qs) / 2) * k, (m - 1.5) * k, qs * k);
    g.textAlign = 'center';
    g.font = F(W < 45 ? 7.5 : 9, 800); g.fillText(d.codigo || '', (W / 2) * k, (H - cap + 0.5) * k);
    g.font = F(W < 45 ? 6 : 7, 500); g.fillText(fit(g, ['Nº ' + (d.numero || ''), d.cliente || ''].filter(Boolean).join(' · '), (W - 2 * m) * k), (W / 2) * k, (H - cap + 5) * k);
    g.textAlign = 'left';
  } else if (tpl === 'gracias') {
    let y = m - 0.5;
    const cw = W - 2 * m;
    if (d.logoImg && d.logoImg.width) {
      const lh = Math.min(H * 0.26, 14), lw = Math.min(cw, d.logoImg.width / d.logoImg.height * lh);
      const lh2 = lw / (d.logoImg.width / d.logoImg.height);
      g.drawImage(d.logoImg, ((W - lw) / 2) * k, y * k, lw * k, lh2 * k); y += lh2 + 1.5;
    }
    const qs = d.qr ? 18 : 0, bottom = H - m - (qs ? qs + 0.5 : 0);
    // el texto se ajusta solo al hueco (de grande a pequeño) para que nunca se corte
    let sz = 1;
    for (; sz > 0.55; sz -= 0.05) { if (centered(g, F, k, d, y, cw, W, sz, true) <= bottom) break; }
    centered(g, F, k, d, y, cw, W, sz, false);
    if (qs) qr(g, d.qr, ((W - qs) / 2) * k, (H - qs - 1) * k, qs * k);
  } else if (tpl === 'regalo') { // v12.9 · tarjeta de regalo: texto a la izquierda y QR único a la derecha
    const acc = d.color || '#e0457b', qs = Math.min(H - 2 * m - 4, W * 0.42), qx = W - m - qs, qy = (H - qs) / 2 - 1.5, tw = qx - 2 * m, cx = m + tw / 2;
    const FS = (pt, w) => w + ' ' + Math.round(pt * 0.3528 * k) + 'px Georgia, "Times New Roman", serif';
    g.strokeStyle = acc; g.lineWidth = 0.5 * k; g.strokeRect(1.2 * k, 1.2 * k, (W - 2.4) * k, (H - 2.4) * k);
    if (d.qr) { qr(g, d.qr, qx * k, qy * k, qs * k); g.textAlign = 'center'; g.fillStyle = '#7a6f80'; g.font = F(5, 600); g.fillText('Ábrelo aquí', (qx + qs / 2) * k, (qy + qs + 0.8) * k); }
    g.textAlign = 'center'; g.textBaseline = 'top';
    const L1 = (g.font = FS(15, 700), wrap(g, '¡Tienes un regalo!', tw * k));
    const L2 = (g.font = F(7.6, 400), wrap(g, 'Escanea el código con la cámara de tu móvil y ábrelo.', tw * k));
    const lh = pt => pt * 0.3528 * 1.25, tot = L1.length * lh(15) + 3 + L2.length * lh(7.6) + (d.firma ? 3 + lh(7) : 0);
    let y = Math.max(m, (H - tot) / 2);
    g.fillStyle = '#2b2230'; g.font = FS(15, 700); L1.forEach(l => { g.fillText(l, cx * k, y * k); y += lh(15); });
    y += 1.5; g.strokeStyle = acc; g.lineWidth = 0.35 * k; g.beginPath(); g.moveTo((cx - 9) * k, y * k); g.lineTo((cx + 9) * k, y * k); g.stroke(); y += 1.5;
    g.fillStyle = '#54495c'; g.font = F(7.6, 400); L2.forEach(l => { g.fillText(l, cx * k, y * k); y += lh(7.6); });
    if (d.firma) { y += 3; g.fillStyle = acc; g.font = F(7, 700); g.fillText(fit(g, String(d.firma).toUpperCase(), tw * k), cx * k, y * k); }
    g.textAlign = 'left';
  } else if (tpl === 'qrtest') { // v12.10 · el mismo QR con puntos de 3 a 10 píxeles: se imprime, se prueba con el móvil y se ve cuál funciona
    g.font = F(10, 800); g.fillText('PRUEBA DE QR · ' + (W) + '×' + (H) + ' mm', m * k, m * k);
    g.font = F(6.5, 400); g.fillText('Escanea cada uno con la cámara del móvil: te dirá cuál has leído.', m * k, (m + 5) * k); g.fillText('Apunta el MÁS PEQUEÑO que se lea bien (y que se abra).', m * k, (m + 8.5) * k);
    let yy = 18; const rows = [[3, 4, 5], [6, 8], [10]];
    rows.forEach(row => {
      let xx = m, rowH = 0;
      row.forEach(md => {
        const P = qrPlanFixed(d.qr(md), md), side = P.side / k;
        g.fillStyle = '#fff'; g.fillRect(xx * k, yy * k, P.side, P.side); g.fillStyle = '#000';
        P.M.forEach((r2, r) => r2.forEach((v, c) => { if (v) g.fillRect(Math.round(xx * k) + (c + P.q) * md, Math.round(yy * k) + (r + P.q) * md, md, md); }));
        g.font = F(7, 700); g.fillText(md + ' px · ' + (md / k).toFixed(2) + ' mm', xx * k, (yy + side + 0.6) * k);
        xx += side + 4; rowH = Math.max(rowH, side);
      });
      yy += rowH + 6.5;
    });
  } else { // qr
    const cap = d.titulo ? (H >= 90 ? 13 : 7) : 0, qs = Math.min(W, H - cap) - 2;
    qr(g, d.qr, ((W - qs) / 2) * k, 1 * k, qs * k);
    if (d.titulo) { g.textAlign = 'center'; g.font = F(H < 45 ? 7 : H >= 90 ? 18 : 9, 700); const l = wrap(g, d.titulo, (W - 2 * m) * k)[0]; g.fillText(l, (W / 2) * k, (H - cap + (H >= 90 ? 3 : 0.5)) * k); g.textAlign = 'left'; }
  }
  return c;
}

// ---------- Datos de cada plantilla ----------
export function dataFor(tpl, x) {
  if (tpl === 'envio') {
    const o = x.o, c = x.c, em = emisor();
    const addr = c && c.direccion && c.direccion !== '•••' ? c.direccion : '';
    return { numero: o.numero, fecha: o.fecha, de: { nombre: em.comercial || em.nombre, direccion: em.direccion, localidad: em.localidad, telefono: em.telefono },
      para: { nombre: o.cliente, direccion: addr, telefono: c && c.telefono && c.telefono !== '•••' ? c.telefono : '' },
      contenido: (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + o.producto + (o.color ? ' · ' + o.color : '') + (o.personalizacion ? '\n' + o.personalizacion : ''),
      envio: o.envio || '', seguimiento: o.seguimiento || '', qr: (() => { const b = appUrl(); return b ? b + '#/pedidos/' + o.id + '/?enviar=1' : ''; })(), titulo: 'Pedido nº ' + o.numero, ref: { entidad: 'pedidos', id: o.id } };
  }
  if (tpl === 'producto') { const p = x.p; return { nombre: p.nombre, sku: p.sku || p.id, precio: p.precio, extra: [p.material, p.color, p.tamano].filter(Boolean).join(' · '), qr: qrLink('producto', p.id), titulo: p.nombre, ref: { entidad: 'productos', id: p.id } }; }
  if (tpl === 'almacen') { const p = x.p || {}; return { ubicacion: x.ubicacion, nombre: x.nombre, sku: p.sku || p.id || '', qr: qrLink('stock', x.nombre), titulo: x.nombre, ref: { entidad: 'stock', id: x.nombre } }; }
  if (tpl === 'qrtest') return { qr: md => qrLink('prueba', md), titulo: 'Prueba de QR', ref: { entidad: 'prueba', id: 'qr' } };
  if (tpl === 'regalo') { const em = emisor(); return { qr: x.url, color: x.color || '', firma: em.comercial || em.nombre || '', titulo: 'Regalo · pedido nº ' + (x.numero || ''), ref: { entidad: 'pedidos', id: x.id } }; }
  return { qr: qrLink(x.tipo, x.id), titulo: x.titulo || '', ref: { entidad: x.tipo, id: x.id } };
}

// ---------- PDF de tamaño exacto (móvil o PC sin el programa) ----------
function pdfFromCanvases(pages) {
  const enc = new TextEncoder(), parts = [], offs = [];
  let len = 0;
  const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const obj = (n, body) => { offs[n] = len; push(n + ' 0 obj\n'); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = pages.length, kids = [];
  for (let i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push('<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>'));
  pages.forEach((p, i) => {
    const pg = 3 + i * 3, im = pg + 1, ct = pg + 2;
    const wpt = (p.wmm * 72 / 25.4).toFixed(2), hpt = (p.hmm * 72 / 25.4).toFixed(2);
    const bin = atob(p.canvas.toDataURL('image/jpeg', 0.95).split(',')[1]), jpg = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) jpg[j] = bin.charCodeAt(j);
    obj(pg, () => push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + wpt + ' ' + hpt + '] /Resources << /XObject << /Im' + i + ' ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>'));
    obj(im, () => { push('<< /Type /XObject /Subtype /Image /Width ' + p.canvas.width + ' /Height ' + p.canvas.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'); push(jpg); push('\nendstream'); });
    const cs = 'q ' + wpt + ' 0 0 ' + hpt + ' 0 0 cm /Im' + i + ' Do Q';
    obj(ct, () => push('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream'));
  });
  const xref = len, total = 3 + n * 3;
  push('xref\n0 ' + total + '\n0000000000 65535 f \n');
  for (let i = 1; i < total; i++) push(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  push('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
  return new Blob(parts, { type: 'application/pdf' });
}

// Varias etiquetas en folios A4 (para la impresora de tinta): a tamaño real, con marcas de corte
function sheets(canvases, s, dpi) {
  const gap = 4, cols = Math.max(1, Math.floor((A4.w - 10 + gap) / (s.w + gap))), rows = Math.max(1, Math.floor((A4.h - 10 + gap) / (s.h + gap))), per = cols * rows;
  const out = [];
  for (let i = 0; i < canvases.length; i += per) {
    const { c, g, k } = mk(A4.w, A4.h, dpi);
    canvases.slice(i, i + per).forEach((cv, j) => {
      const x = 5 + (j % cols) * (s.w + gap), y = 5 + Math.floor(j / cols) * (s.h + gap);
      g.drawImage(cv, x * k, y * k, s.w * k, s.h * k);
      g.strokeStyle = '#999'; g.lineWidth = 0.15 * k; g.setLineDash([1 * k, 1 * k]); g.strokeRect(x * k, y * k, s.w * k, s.h * k); g.setLineDash([]);
    });
    out.push(c);
  }
  return out;
}

// ---------- Imprimir (una o varias) ----------
// items: [{ tpl, data }] — misma plantilla. Devuelve true si se envió.
export async function printLabels(tpl, datas, opts = {}) {
  const copies = Math.max(1, Math.min(50, Number(opts.copies) || 1));
  const r = await sendLabel(tpl, (dpi, s) => { const canv = []; datas.forEach(d => { for (let i = 0; i < copies; i++) canv.push(draw(tpl, d, dpi, s)); }); return canv; }, opts);
  datas.forEach(d => { if (d.ref) api('etiquetas.registrar', { plantilla: tpl, entidad: d.ref.entidad, entidadId: d.ref.id, titulo: d.titulo || '', impresora: r.how === 'pdf' ? 'PDF' : r.printer, copias: copies }, { quiet: true }).catch(() => { }); });
  return true;
}
// v11.6: impresora que se usará para una plantilla (con su resolución y si es de folios)
export async function targetFor(tpl, printerName) {
  const c = await labelCfg(), list = await printers(), s = sizeOf(tpl, c);
  const pr = printerName ? list.find(p => p.name === printerName) : pickPrinter(tpl, list, c);
  const usable = pr && (desktop.on || pr.webbt) ? pr : null;
  return { c, pr: usable, dpi: dpiOf(usable), size: s, sheet: isSheet(pr, s), list };
}
// Envía a la impresora (PC) o crea el PDF de tamaño exacto (móvil). build(dpi, size) → [canvas]. Lanza el error si falla.
export async function sendLabel(tpl, build, opts = {}) {
  const t = await targetFor(tpl, opts.printer), s = t.size, dpi = t.dpi;
  const canv = await build(dpi, s);
  if (t.pr && t.pr.raw) {
    // v13.2: directo por Bluetooth (sin controlador de Windows). PC → puerto COM; móvil Android → Web Bluetooth
    const pr = t.pr;
    if (pr.offline) throw new Error(pr.problema || 'La impresora «' + pr.name + '» está desconectada o apagada.');
    for (const cv of canv) {
      const bytes = RP.encode(pr.raw.lang, cv, { wmm: s.w, hmm: s.h, copies: 1 });
      if (pr.webbt) await RP.btSend(bytes); else await desktop.rawPrint(pr.raw.port, bytes);
    }
    if (!opts.silent) toast('🖨️ ' + canv.length + (canv.length === 1 ? ' etiqueta enviada' : ' etiquetas enviadas') + ' por Bluetooth a ' + pr.name, 'ok', 5000);
    return { how: 'printer', printer: pr.name, sheet: false, count: canv.length };
  }
  if (desktop.on && t.pr) {
    const pr = t.pr, adj = (t.c.ajuste && t.c.ajuste[pr.name]) || {};
    if (pr.offline) throw new Error('La impresora «' + pr.name + '» está desconectada o apagada.');
    const tile = t.sheet && tpl !== 'tarjetas';
    const pages = tile ? sheets(canv, s, dpi).map(cv => ({ cv, w: A4.w, h: A4.h })) : canv.map(cv => ({ cv, w: s.w, h: s.h }));
    for (const p of pages) await desktop.print({ printer: pr.name, png: p.cv.toDataURL('image/png'), wmm: p.w, hmm: p.h, copies: 1, offx: Number(adj.x) || 0, offy: Number(adj.y) || 0, calidad: opts.calidad || '' });
    if (!opts.silent) toast('🖨️ ' + canv.length + (canv.length === 1 ? ' etiqueta enviada' : ' etiquetas enviadas') + ' a ' + pr.name + (tile ? ' (a tamaño real en folio A4)' : ''), 'ok', 5000);
    return { how: 'printer', printer: pr.name, sheet: tile, count: canv.length };
  }
  // Sin el programa del PC: PDF con el tamaño exacto de la etiqueta
  const blob = pdfFromCanvases(canv.map(cv => ({ canvas: cv, wmm: s.w, hmm: s.h })));
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) { const a = h('a', { href: url, download: (opts.fileName || 'etiquetas_' + tpl) + '.pdf' }); document.body.appendChild(a); a.click(); a.remove(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  if (!opts.silent) toast('📄 PDF de ' + s.w + ' × ' + s.h + ' mm listo. Al imprimir elige "Tamaño real" o "100 %".', 'ok', 7000);
  return { how: 'pdf', printer: 'PDF', count: canv.length };
}

// ---------- Diálogo único: vista previa a tamaño real + IMPRIMIR ETIQUETA ----------
export async function labelDialog(tpl, datas, opts = {}) {
  datas = Array.isArray(datas) ? datas : [datas];
  const c = await labelCfg(), list = await printers();
  const choices = opts.plantillas || [tpl];
  let cur = tpl;
  const tplSel = choices.length > 1 ? sel(choices.map(k => ({ v: k, t: TEMPLATES[k].t + ' · ' + sizeOf(k, c).w + ' × ' + sizeOf(k, c).h + ' mm' })), cur) : null;
  const shown = realPrinters(list).length ? realPrinters(list) : list;
  const prSel = shown.length ? sel(shown.map(p => ({ v: p.name, t: p.name + (p.label ? (p.label4x6 ? ' · etiquetas 10×15' : ' · etiquetas') : p.a4 ? ' · folios A4' : '') + (p.default ? ' (predeterminada)' : '') + (p.offline ? ' · DESCONECTADA' : p.problema ? ' · ' + p.problema.toUpperCase() : '') })), '') : null;
  const copies = inp({ type: 'number', min: 1, max: 50, value: 1, style: { width: '80px' } });
  const real = h('input', { type: 'checkbox', checked: true });
  const box = h('div.lbl-prev'), info = h('div.tiny.muted');
  const refresh = () => {
    const s = sizeOf(cur, c), pr = prSel ? list.find(p => p.name === prSel.value) : null, dpi = dpiOf(pr);
    const cv = draw(cur, opts.dataFor ? opts.dataFor(cur) : datas[0], dpi, s);
    cv.className = 'lbl-canvas';
    if (real.checked) { cv.style.width = s.w + 'mm'; cv.style.height = s.h + 'mm'; } else { cv.style.width = '100%'; cv.style.height = 'auto'; cv.style.maxWidth = Math.round(s.w * 3.2) + 'px'; }
    mount(box, h('div.lbl-ruler', { style: real.checked ? { width: s.w + 'mm' } : {} }, h('span', s.w + ' mm')), cv);
    const sheet = isSheet(pr, s);
    info.textContent = s.w + ' × ' + s.h + ' mm · escala 100 % · márgenes 0 mm · ' + dpi + ' ppp' + (pr ? ' · ' + (sheet ? 'en folio A4 a tamaño real (' + Math.max(1, Math.floor(205 / (s.w + 4))) * Math.max(1, Math.floor(291 / (s.h + 4))) + ' por hoja)' : 'papel ' + s.w + ' × ' + s.h + ' mm') : ' · PDF de tamaño exacto') + (datas.length > 1 ? ' · ' + datas.length + ' etiquetas' : '');
  };
  if (prSel) { const p = pickPrinter(cur, list, c); if (p) prSel.value = p.name; prSel.onchange = refresh; }
  if (tplSel) tplSel.onchange = () => { cur = tplSel.value; const p = pickPrinter(cur, list, c); if (p && prSel) prSel.value = p.name; refresh(); };
  real.onchange = refresh;
  const m = modal('Etiqueta' + (datas.length > 1 ? 's (' + datas.length + ')' : '') + ' · ' + TEMPLATES[cur].t, h('div.col',
    tplSel ? field('Plantilla', tplSel) : null,
    box, h('label.check.small', real, 'Ver a tamaño real en pantalla'), info,
    h('div.form', prSel ? field('Impresora', prSel, 'Elegida sola. Se recuerda en este PC.') : h('p.small.muted.full', desktop.on ? 'No se encuentran impresoras en Windows.' : 'En el móvil se crea un PDF con el tamaño exacto de la etiqueta.'), field('Copias', copies)),
    opts.aviso ? h('p.small.warn-t', opts.aviso) : null),
  close => [btn('Cerrar', close), btn('IMPRIMIR ETIQUETA', async ev => {
    const b = ev.target.closest('button'); b.disabled = true;
    try {
      if (prSel && prSel.value) { c.impresora = c.impresora || {}; c.impresora[cur] = prSel.value; await saveLabelCfg(c); }
      const ds = opts.dataFor ? datas.map((_, i) => opts.dataFor(cur, i)) : datas;
      await printLabels(cur, ds, { printer: prSel && prSel.value, copies: copies.value });
      close();
    } catch (e) { toast('No se pudo imprimir: ' + e.message, 'bad', 8000); b.disabled = false; }
  }, { cls: 'primary', icon: 'printer' })], { size: 'wide' });
  refresh();
  return m;
}

// ================= v11.8 · TARJETAS DE AGRADECIMIENTO EN HOJA A4 (papel fotográfico) =================
// Tarjeta UNIVERSAL (sin el nombre del cliente): sirve para todos los pedidos y se imprimen varias por hoja.
// Corte: marcas en las esquinas (fuera de la tarjeta, no estropean el diseño) o un borde fino.
export function cardLayout(size, n) {
  const c = CARD_SIZES[size] || CARD_SIZES['85x55'], m = 10, gap = 8;
  const cols = Math.max(1, Math.floor((A4.w - 2 * m + gap) / (c.w + gap))), rows = Math.max(1, Math.floor((A4.h - 2 * m + gap) / (c.h + gap)));
  const per = cols * rows, gw = cols * c.w + (cols - 1) * gap, gh = rows * c.h + (rows - 1) * gap;
  return { w: c.w, h: c.h, cols, rows, per, n: Math.max(1, Math.min(per, Number(n) || per)), x0: (A4.w - gw) / 2, y0: (A4.h - gh) / 2, gap };
}
function rgba(hex, a) { const m = String(hex || '').match(/^#?([0-9a-f]{6})$/i); const v = m ? parseInt(m[1], 16) : 0xe0457b; return 'rgba(' + (v >> 16) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')'; }
function drawOneCard(g, k, x, y, w, hgt, d) {
  g.__k = k;
  const acc = d.color || '#e0457b', P = 4; // margen interior (mm)
  g.save(); g.translate(x * k, y * k);
  g.fillStyle = '#fff'; g.fillRect(0, 0, w * k, hgt * k);
  if (d.fondo) { g.fillStyle = rgba(acc, 0.06); g.fillRect(0, 0, w * k, hgt * k); }
  if (d.corte === 'borde') { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 0.2 * k; const r = 2.5 * k; g.beginPath(); g.moveTo(r, 0.1 * k); g.arcTo(w * k, 0, w * k, hgt * k, r); g.arcTo(w * k, hgt * k, 0, hgt * k, r); g.arcTo(0, hgt * k, 0, 0, r); g.arcTo(0, 0, w * k, 0, r); g.stroke(); }
  const qs = d.qr ? Math.min(hgt * 0.36, 20) : 0, tw = w - 2 * P - (qs ? qs + 3 : 0), cx = P + tw / 2;
  let y0 = P + 1;
  // tamaño de todo el bloque para centrarlo en vertical
  const sc = Math.min(w / 85, hgt / 55) || 1;
  const parts = [];
  if (d.logoImg && d.logoImg.width) { const lh = Math.min(hgt * 0.24, 16 * sc), lw = Math.min(tw, d.logoImg.width / d.logoImg.height * lh); parts.push({ t: 'logo', h: lw / (d.logoImg.width / d.logoImg.height), w: lw }); }
  const font = (pt, wt, fam) => (wt || 400) + ' ' + Math.round(pt * sc * 0.3528 * k) + 'px ' + (fam || '"Segoe UI", Arial, sans-serif');
  const lines = (txt, pt, wt, fam) => { g.font = font(pt, wt, fam); return wrap(g, txt, tw * k).filter(Boolean); };
  const T1 = d.titulo ? lines(d.titulo, 15, 700, 'Georgia, "Times New Roman", serif') : [], T2 = d.texto ? lines(d.texto, 7.6, 400) : [], T3 = d.firma ? lines(d.firma, 7, 700) : [];
  const lh = pt => pt * sc * 0.3528 * 1.25;
  const total = (parts[0] ? parts[0].h + 2.2 : 0) + T1.length * lh(15) + (T1.length && (T2.length || T3.length) ? 3.2 : 0) + T2.length * lh(7.6) + (T3.length ? 2 + T3.length * lh(7) : 0);
  y0 = Math.max(P, (hgt - total) / 2);
  g.textAlign = 'center'; g.textBaseline = 'top';
  if (parts[0]) { g.drawImage(d.logoImg, (cx - parts[0].w / 2) * k, y0 * k, parts[0].w * k, parts[0].h * k); y0 += parts[0].h + 2.2; }
  g.fillStyle = '#2b2230'; g.font = font(15, 700, 'Georgia, "Times New Roman", serif'); T1.forEach(l => { g.fillText(l, cx * k, y0 * k); y0 += lh(15); });
  if (T1.length && (T2.length || T3.length)) { g.strokeStyle = acc; g.lineWidth = 0.35 * k; g.beginPath(); g.moveTo((cx - 9) * k, (y0 + 1.2) * k); g.lineTo((cx + 9) * k, (y0 + 1.2) * k); g.stroke(); y0 += 3.2; }
  g.fillStyle = '#54495c'; g.font = font(7.6, 400); T2.forEach(l => { g.fillText(l, cx * k, y0 * k); y0 += lh(7.6); });
  if (T3.length) { y0 += 2; g.fillStyle = acc; g.font = font(7, 700); T3.forEach(l => { g.fillText(l.toUpperCase(), cx * k, y0 * k); y0 += lh(7); }); }
  if (qs) { const qx = w - P - qs, qy = (hgt - qs) / 2 - 1.5; qr(g, d.qr, qx * k, qy * k, qs * k); g.fillStyle = '#7a6f80'; g.font = font(5, 600); g.fillText('Escanéame', (qx + qs / 2) * k, (qy + qs + 0.6) * k); }
  g.restore(); g.textAlign = 'left';
}
function cropMarks(g, k, x, y, w, hgt) {
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 0.15 * k; const L = 3, o = 1;
  [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + hgt, -1, 1], [x + w, y + hgt, 1, 1]].forEach(([px, py, sx, sy]) => {
    g.beginPath(); g.moveTo((px + sx * o) * k, py * k); g.lineTo((px + sx * (o + L)) * k, py * k); g.stroke();
    g.beginPath(); g.moveTo(px * k, (py + sy * o) * k); g.lineTo(px * k, (py + sy * (o + L)) * k); g.stroke();
  });
}
// Una hoja A4 con n tarjetas iguales
export function drawCardSheet(d, dpi) {
  const L = cardLayout(d.tam, d.n), { c, g, k } = mk(A4.w, A4.h, dpi);
  for (let i = 0; i < L.n; i++) {
    const x = L.x0 + (i % L.cols) * (L.w + L.gap), y = L.y0 + Math.floor(i / L.cols) * (L.h + L.gap);
    drawOneCard(g, k, x, y, L.w, L.h, d);
    if (d.corte === 'marcas') cropMarks(g, k, x, y, L.w, L.h);
  }
  return c;
}
export function drawOneCardCanvas(d, dpi) { const s = CARD_SIZES[d.tam] || CARD_SIZES['85x55'], { c, g, k } = mk(s.w, s.h, dpi); drawOneCard(g, k, 0, 0, s.w, s.h, d); return c; }
