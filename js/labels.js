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
import * as PL from './plantillas.js';

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
  // v13.10: la misma información en la bobina de ENVÍO (100 × 150): arriba «gracias», abajo QR, nº de pedido y qué meter. Sin dirección.
  paquete150: { t: 'Etiqueta del paquete (larga)', w: 100, h: 150, d: 'misma bobina que la de envío: arriba «gracias», abajo QR, nº de pedido y lo que hay que meter (sin dirección)' },
  qrtest: { t: 'Prueba de QR (6 tamaños)', w: 100, h: 150, d: 'el mismo QR en 6 tamaños: sirve para ver cuál lee mejor tu móvil con tu impresora' },
  regalo: { t: 'Tarjeta de regalo con QR', w: 85, h: 55, d: 'QR único: abre la página «Tu regalo» de la tienda (con tu dedicatoria)' },
  gracias: { t: 'Tarjeta de agradecimiento (50 × 50, modo antiguo)', w: 50, h: 50, d: 'en la impresora de etiquetas, una por pedido' },
  // v11.8: tarjetas UNIVERSALES en hoja A4 para la impresora de papel fotográfico (varias por hoja, con corte)
  tarjetas: { t: 'Tarjetas de agradecimiento (hoja A4)', w: 210, h: 297, d: 'varias tarjetas por hoja, para papel fotográfico' },
  // v13.10: las mismas tarjetas, UNA por etiqueta, en la impresora de etiquetas (la que más se usa)
  tarjeta1: { t: 'Tarjeta de agradecimiento (etiqueta)', w: 85, h: 55, d: 'una tarjeta por etiqueta, en la impresora de etiquetas' }
};
// ================= v13.5 · FORMA de la tarjeta / etiqueta según la plantilla =================
// Cada plantilla («etiqueta» o diseño) puede tener su forma: rectángulo, rectángulo con esquinas redondeadas, círculo u
// óvalo. Se guarda para todo el equipo en Configuración del servidor (envio.formas) y se respeta en la vista previa, el
// editor, la impresión (PC, Bluetooth), el PDF y la hoja A4 de tarjetas, porque TODO sale de draw() / drawOneCard().
// Para añadir otra forma: una entrada aquí (path = contorno, inner = hueco seguro para el contenido) y su nombre en
// server/23_envio.gs (FORMAS). Nada más.
export const SHAPES = {
  rect: { t: 'Rectángulo', i: '▭', path: (g, x, y, w, hh) => { g.beginPath(); g.rect(x, y, w, hh); }, inner: (w, hh) => ({ x: 0, y: 0, w, h: hh }) },
  redondeado: { t: 'Rectángulo con esquinas redondeadas', i: '▢', r: (w, hh) => Math.min(6, Math.min(w, hh) * 0.14),
    path(g, x, y, w, hh, k) { k = k || 1; const r = this.r(w / k, hh / k) * k; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); },
    inner(w, hh) { const p = this.r(w, hh) * 0.32; return { x: p, y: p, w: w - 2 * p, h: hh - 2 * p }; } },
  circulo: { t: 'Círculo', i: '◯', path: (g, x, y, w, hh) => { const d = Math.min(w, hh); g.beginPath(); g.arc(x + w / 2, y + hh / 2, d / 2, 0, Math.PI * 2); g.closePath(); },
    // rectángulo con las proporciones de la plantilla, inscrito en el círculo (con 4 % de aire)
    inner: (w, hh, a) => { const d = Math.min(w, hh) * 0.96, k = a || 1, iw = d * k / Math.sqrt(1 + k * k), ih = d / Math.sqrt(1 + k * k); return { x: (w - iw) / 2, y: (hh - ih) / 2, w: iw, h: ih }; } },
  ovalo: { t: 'Óvalo', i: '⬭', path: (g, x, y, w, hh) => { g.beginPath(); g.ellipse(x + w / 2, y + hh / 2, w / 2, hh / 2, 0, 0, Math.PI * 2); g.closePath(); },
    inner: (w, hh) => { const iw = w / Math.SQRT2 * 0.97, ih = hh / Math.SQRT2 * 0.97; return { x: (w - iw) / 2, y: (hh - ih) / 2, w: iw, h: ih }; } }
};
// Plantillas en las que se puede elegir la forma (las de envío siempre son rectangulares: las pide el transportista)
export const SHAPED = ['tarjetas', 'gracias', 'regalo', 'paquete', 'qr'];
export function formaDe(tpl, cfgEnvio) {
  if (!SHAPED.includes(tpl)) return 'rect';
  const f = ((cfgEnvio || (S.cfg && S.cfg.envio) || {}).formas || {})[tpl];
  return SHAPES[f] ? f : 'rect';
}
export const contornoOn = cfgEnvio => ((cfgEnvio || (S.cfg && S.cfg.envio) || {}).contorno) !== false;
// Tamaño real de la pieza: un círculo ocupa un cuadrado (el lado menor)
export const shapeBox = (forma, w, hh) => forma === 'circulo' ? { w: Math.min(w, hh), h: Math.min(w, hh) } : { w, h: hh };
// Pone en forma un lienzo ya dibujado (contenido rectangular): lo encaja en el hueco seguro, recorta fuera
// de la forma (blanco) y, si se pide, dibuja la línea de corte fina.
function shapeCanvas(tpl, forma, d, dpi, size) {
  const S0 = SHAPES[forma], W = size.w, H = size.h, inn = S0.inner(W, H, W / H);
  const conDiseno = !!(d.diseno && tpl === 'gracias'); // v13.7: el fondo del diseño llena toda la forma y el contenido va encima, transparente
  const content = draw(tpl, Object.assign({}, d, { forma: 'rect', __inner: true, __transparente: conDiseno }), dpi, { w: inn.w, h: inn.h });
  const { c, g, k } = mk(W, H, dpi);
  g.save(); S0.path(g, 0.3 * k, 0.3 * k, (W - 0.6) * k, (H - 0.6) * k, k); g.clip();
  if (d.fondoForma) { g.fillStyle = d.fondoForma; g.fillRect(0, 0, c.width, c.height); }
  if (conDiseno && pintaFondo(g, k, 0, 0, W, H, d)) c.__tramado = true;
  g.drawImage(content, Math.round(inn.x * k), Math.round(inn.y * k));
  g.restore();
  if (d.contorno !== false) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1, 0.2 * k); g.setLineDash([1.2 * k, 0.9 * k]); S0.path(g, 0.3 * k, 0.3 * k, (W - 0.6) * k, (H - 0.6) * k, k); g.stroke(); g.setLineDash([]); }
  return c;
}

// Solo para VER en pantalla: lo que queda fuera de la forma se vuelve transparente (al imprimir es papel blanco)
export function cutPreview(cv, forma, wmm) {
  if (!cv || !SHAPES[forma] || forma === 'rect') return cv;
  const g = cv.getContext('2d'); g.save(); g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000';
  SHAPES[forma].path(g, 0, 0, cv.width, cv.height, cv.width / (wmm || 50)); g.fill(); g.restore();
  return cv;
}

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
  // v16: la impresora elegida para esta etiqueta ya no aparece (apagada, desenchufada, sin emparejar): NO se manda a otra.
  if (saved && list.length) return { name: saved, offline: true, falta: true, label: true, problema: 'No encuentro la impresora «' + saved + '» que elegiste para esta etiqueta. Enciéndela o elige otra en Impresión → Etiquetas. No se ha impreso en ninguna otra.' };
  const v = (c && c.vinculo) || {};
  const real = realPrinters(list), on = real.filter(p => !p.offline);
  const byName = n => n && real.find(p => p.name === n);
  // v16: si la impresora de etiquetas vinculada no aparece, tampoco se cambia a otra
  if (v.etiquetas && real.length && !byName(v.etiquetas) && tpl !== 'tarjetas') return { name: v.etiquetas, offline: true, falta: true, label: true, problema: 'No encuentro tu impresora de etiquetas «' + v.etiquetas + '». Enciéndela o vuelve a vincularla en Impresión → Etiquetas. No se ha impreso en ninguna otra.' };
  // v16: una impresora de etiquetas APAGADA sigue siendo la de etiquetas (dará su aviso): antes la etiqueta se iba sola a la de folios
  const lab = byName(v.etiquetas) || on.find(p => p.label && p.label4x6) || on.find(p => p.label) || real.find(p => p.label && p.label4x6) || real.find(p => p.label);
  const sheet = byName(v.folios) || on.find(p => p.default && !p.label) || on.find(p => !p.label);
  if (tpl === 'envio' || tpl === 'oficial' || tpl === 'mesa' || tpl === 'paquete150') return lab || sheet || null;
  if (tpl === 'tarjetas') return sheet || null; // la hoja A4 va a la de folios
  if (tpl === 'tarjeta1') return lab || sheet || null; // v13.10: tarjetas sueltas → impresora de etiquetas
  // v11.6: código del paquete y tarjeta de gracias (50 × 50): mejor una de etiquetas con ese papel; si no, la de etiquetas
  if (tpl === 'paquete' || tpl === 'gracias') {
    const sq = on.find(p => p.label && (p.papers || []).some(x => Math.abs(x.wmm - 50) <= 4 && Math.abs(x.hmm - 50) <= 4));
    return sq || lab || sheet || null;
  }
  return lab || sheet || null; // v13.10: por defecto, casi todo sale por la impresora de etiquetas
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
  const ds = d.diseno ? diseno(d) : null, pc = v => (Number(v) || 100) / 100;
  const parts = [[d.titulo, 11 * (ds ? pc(ds.tamTitulo) : 1), 800, ds && fuenteCss(ds.fuenteTitulo), ds && ds.colorTitulo], [d.texto, 8 * (ds ? pc(ds.tamTexto) : 1), 400, ds && fuenteCss(ds.fuenteTexto), ds && ds.colorTexto], [d.firma, 7.5 * (ds ? pc(ds.tamFirma) : 1), 600, ds && fuenteCss(ds.fuenteTexto), null]].filter(p => p[0]);
  g.textAlign = 'center';
  parts.forEach(([t, pt, wt, fam, col], i) => {
    g.font = fam ? wt + ' ' + Math.round(pt * sz * 0.3528 * k) + 'px ' + fam : F(pt * sz, wt);
    if (!dry) g.fillStyle = col || '#000';
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
  // v13.5: forma de la plantilla (o la que venga en los datos). El contenido se dibuja en el hueco seguro de la forma.
  const forma = d && d.__inner ? 'rect' : (d && SHAPES[d.forma] ? d.forma : formaDe(tpl));
  if (forma !== 'rect' && SHAPED.includes(tpl)) return shapeCanvas(tpl, forma, Object.assign({ contorno: contornoOn() }, d), dpi, size || TEMPLATES[tpl]);
  // v15.0: si el equipo eligió un DISEÑO PROPIO como predeterminado para esta etiqueta, se dibuja con él (editor visual).
  // Sin diseño predeterminado, todo sigue exactamente igual que antes.
  if (!(d && d.__sinPlantilla) && PL.EDITABLES.includes(tpl)) { const P = PL.activa(tpl); if (P) return PL.dibujar(P, d || {}, dpi, size || TEMPLATES[tpl]); }
  const s = size || TEMPLATES[tpl], { c, g, k, F } = mk(s.w, s.h, dpi);
  if (d && d.__transparente) { g.clearRect(0, 0, c.width, c.height); g.fillStyle = '#000'; }
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
    const cap = d.cuenta ? 15.5 : 12, qs = Math.min(W - 2 * m, H - cap - m);
    qr(g, d.qr, ((W - qs) / 2) * k, (m - 1.5) * k, qs * k);
    g.textAlign = 'center';
    g.font = F(W < 45 ? 7.5 : 9, 800); g.fillText(d.codigo || '', (W / 2) * k, (H - cap + 0.5) * k);
    g.font = F(W < 45 ? 6 : 7, 500); g.fillText(fit(g, ['Nº ' + (d.numero || ''), d.cliente || ''].filter(Boolean).join(' · '), (W - 2 * m) * k), (W / 2) * k, (H - cap + 5) * k);
    if (d.cuenta) { g.font = F(W < 45 ? 6 : 7, 800); g.fillText(fit(g, d.cuenta, (W - 2 * m) * k), (W / 2) * k, (H - cap + 9) * k); } // v14.1: cuenta de venta
    g.textAlign = 'left';
  } else if (tpl === 'paquete150') {
    // ── mitad de arriba: GRACIAS (logo, título, texto y firma, ajustados al hueco) ──
    const mid = H * 0.41, cw = W - 2 * m - 4;
    let y = m + 1;
    if (d.logoImg && d.logoImg.width) { const lh = 13, lw = Math.min(cw, d.logoImg.width / d.logoImg.height * lh); g.drawImage(d.logoImg, ((W - lw) / 2) * k, y * k, lw * k, (lw / (d.logoImg.width / d.logoImg.height)) * k); y += lw / (d.logoImg.width / d.logoImg.height) + 2; }
    const gd = Object.assign({ titulo: '¡Gracias!', texto: '', firma: '' }, d.gracias || {});
    let sz = 1.9; for (; sz > 0.6; sz -= 0.05) { if (centered(g, F, k, gd, y, cw, W, sz, true) <= mid - 4) break; }
    const alto = centered(g, F, k, gd, y, cw, W, sz, true) - y; centered(g, F, k, gd, y + Math.max(0, (mid - 2 - y - alto) / 2), cw, W, sz, false);
    g.setLineDash([1.2 * k, 1.2 * k]); line(g, m * k, (mid + 1) * k, (W - m) * k, (mid + 1) * k, 0.3 * k); g.setLineDash([]);
    // ── mitad de abajo: SOLO para el equipo ──
    let yb = mid + 3;
    g.fillRect(m * k, yb * k, (W - 2 * m) * k, 10 * k); g.fillStyle = '#fff';
    g.font = F(d.conjunto ? 13 : 16, 800); g.fillText(fit(g, (d.conjunto ? 'ENVÍO CONJUNTO Nº ' : 'PEDIDO Nº ') + (d.numero || ''), (W - 2 * m - 4) * k), (m + 2) * k, (yb + 2) * k);
    g.fillStyle = '#000'; yb += 12;
    const qs = 42; qr(g, d.qr, m * k, yb * k, qs * k);
    const xr = m + qs + 3, wr = W - xr - m;
    let yr = yb + 1;
    const fila = (et, v, pt, wt) => { if (!v) return; g.font = F(6.5, 600); g.fillText(et.toUpperCase(), xr * k, yr * k); yr += 2.8; yr = T(v, xr, yr, wr, pt || 10, wt || 700, 2) + 1.6; };
    fila('Código', d.codigo, 10, 800);
    fila('Cliente', d.cliente);
    fila('Enviar antes de', d.limite, 11, 800);
    fila('Transporte', [d.transportista, d.seguimiento].filter(Boolean).join(' · '), 8.5, 700);
    if (d.cuenta) fila('Vendido en la cuenta', d.cuenta, 10, 800); else fila('Plataforma', d.canal, 9, 600); // v14.1: varias cuentas de Vinted/Wallapop
    yb += qs + 2;
    line(g, m * k, yb * k, (W - m) * k, yb * k, 0.3 * k); yb += 1.8;
    g.font = F(6.5, 600); g.fillText('QUÉ VA DENTRO', m * k, yb * k); yb += 3;
    const ls = (d.lineas || []).slice(0, 5);
    ls.forEach((l, i) => { if (yb < H - 12) yb = T('☐ ' + l, m, yb, W - 2 * m, ls.length > 3 ? 9 : 10.5, 700, i === ls.length - 1 ? 2 : 1) + 0.6; });
    if ((d.lineas || []).length > 5) yb = T('… y ' + (d.lineas.length - 5) + ' más', m, yb, W - 2 * m, 8, 600, 1);
    if (d.nota && yb < H - 9) T('📝 ' + d.nota, m, yb + 0.8, W - 2 * m, 8, 500, 2);
    g.textAlign = 'center'; g.font = F(6, 500); g.fillText('Uso interno · la dirección va en la etiqueta de la plataforma', (W / 2) * k, (H - m - 1.5) * k); g.textAlign = 'left';
  } else if (tpl === 'gracias') {
    let y = m - 0.5;
    const cw = W - 2 * m;
    if (d.diseno && !d.__inner && pintaFondo(g, k, 0, 0, W, H, d)) c.__tramado = true; // v13.7: mismo diseño que las tarjetas
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
    if (!d.__inner) { g.strokeStyle = acc; g.lineWidth = 0.5 * k; g.strokeRect(1.2 * k, 1.2 * k, (W - 2.4) * k, (H - 2.4) * k); } // dentro de una forma, el borde lo pone la forma
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
    // v13.7: la dirección de ENVÍO del pedido manda; si no hay, la de la ficha del cliente
    const addr = o.direccionEnvio && o.direccionEnvio !== '•••' ? o.direccionEnvio : c && c.direccion && c.direccion !== '•••' ? c.direccion : '';
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
  if (pr && pr.falta && !usable) return { c, pr: null, dpi: dpiOf(null), size: s, sheet: false, list };
  return { c, pr: usable, dpi: dpiOf(usable), size: s, sheet: isSheet(pr, s), list };
}
// Envía a la impresora (PC) o crea el PDF de tamaño exacto (móvil). build(dpi, size) → [canvas]. Lanza el error si falla.
export async function sendLabel(tpl, build, opts = {}) {
  const t = await targetFor(tpl, opts.printer), s = t.size, dpi = t.dpi;
  await prepararPlantilla(tpl); // v15.0: logo y letras del diseño propio, cargados antes de dibujar
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
    if (pr.offline) throw new Error(pr.problema || 'La impresora «' + pr.name + '» está desconectada o apagada. No se ha impreso en ninguna otra.');
    const tile = t.sheet && tpl !== 'tarjetas';
    const pages = tile ? sheets(canv, s, dpi).map(cv => ({ cv, w: A4.w, h: A4.h })) : canv.map(cv => ({ cv, w: s.w, h: s.h }));
    for (const p of pages) await desktop.print({ printer: pr.name, png: p.cv.toDataURL('image/png'), wmm: p.w, hmm: p.h, copies: 1, offx: Number(adj.x) || 0, offy: Number(adj.y) || 0, calidad: opts.calidad || '' });
    if (!opts.silent) toast('🖨️ ' + canv.length + (canv.length === 1 ? ' etiqueta enviada' : ' etiquetas enviadas') + ' a ' + pr.name + (tile ? ' (a tamaño real en folio A4)' : ''), 'ok', 5000);
    return { how: 'printer', printer: pr.name, sheet: tile, count: canv.length };
  }
  // Sin impresora (móvil, o PC sin impresora): PDF con el tamaño exacto de la etiqueta.
  // v13.5: se enseña DENTRO de la app (visor propio): antes se abría con window.open tras esperar al servidor y en
  // el móvil salía bloqueado o en blanco. Desde el visor se imprime, se descarga, se comparte o se abre con el visor del PC.
  const pages = canv.map(cv => ({ canvas: cv, wmm: s.w, hmm: s.h }));
  const blob = pdfFromCanvases(pages);
  const PV = await import('./pdfview.js');
  const view = await PV.showPdf({ blob, pages, title: opts.title || ('PDF · ' + (TEMPLATES[tpl] ? TEMPLATES[tpl].t : tpl) + ' · ' + s.w + ' × ' + s.h + ' mm'), fileName: opts.fileName || ('etiquetas_' + tpl), nota: opts.nota || '' });
  if (!opts.silent) toast('📄 PDF de ' + s.w + ' × ' + s.h + ' mm listo. Al imprimir elige "Tamaño real" o "100 %".', 'ok', 7000);
  if (opts.wait) await view.closed;
  return { how: 'pdf', printer: 'PDF', count: canv.length, blob, view };
}
export { pdfFromCanvases };

// v15.0: deja cargado lo que necesita el diseño propio de esa etiqueta (logo en alta, letras de RECURSOS)
export const prepararPlantilla = tpl => PL.preparar(tpl).catch(() => null);

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
    const pl = PL.EDITABLES.includes(cur) ? PL.activa(cur) : null;
    if (bEdit) bEdit.style.display = PL.EDITABLES.includes(cur) ? '' : 'none';
    info.textContent = (pl ? '✏️ Diseño: ' + pl.nombre + ' · ' : '') + s.w + ' × ' + s.h + ' mm · escala 100 % · márgenes 0 mm · ' + dpi + ' ppp' + (pr ? ' · ' + (sheet ? 'en folio A4 a tamaño real (' + Math.max(1, Math.floor(205 / (s.w + 4))) * Math.max(1, Math.floor(291 / (s.h + 4))) + ' por hoja)' : 'papel ' + s.w + ' × ' + s.h + ' mm') : ' · PDF de tamaño exacto') + (datas.length > 1 ? ' · ' + datas.length + ' etiquetas' : '') + (formaDe(cur) !== 'rect' ? ' · forma: ' + SHAPES[formaDe(cur)].t.toLowerCase() + ' (Embalaje → Tarjeta y mensajes)' : '');
    cv.dataset.forma = formaDe(cur); cutPreview(cv, formaDe(cur), s.w);
  };
  if (prSel) { const p = pickPrinter(cur, list, c); if (p) prSel.value = p.name; prSel.onchange = refresh; }
  if (tplSel) tplSel.onchange = () => { cur = tplSel.value; const p = pickPrinter(cur, list, c); if (p && prSel) prSel.value = p.name; refresh(); };
  real.onchange = refresh;
  // v15.0: «Editar diseño» abre el editor visual con estos mismos datos; al volver, la vista previa se actualiza
  const bEdit = btn('Editar diseño', async () => {
    const ED = await import('./views/editor_etiqueta.js');
    await ED.abrirEditor(cur, { datos: opts.dataFor ? opts.dataFor(cur) : datas[0] });
    await prepararPlantilla(cur); refresh();
  }, { icon: 'edit', cls: 'ghost', title: 'Mover el logo, los textos y los códigos, cambiar letras y tamaños…' });
  for (const k of choices) await prepararPlantilla(k);
  const m = modal('Etiqueta' + (datas.length > 1 ? 's (' + datas.length + ')' : '') + ' · ' + TEMPLATES[cur].t, h('div.col',
    tplSel ? field('Plantilla', tplSel) : null,
    box, h('label.check.small', real, 'Ver a tamaño real en pantalla'), info,
    h('div.form', prSel ? field('Impresora', prSel, 'Elegida sola. Se recuerda en este PC.') : h('p.small.muted.full', desktop.on ? 'No se encuentran impresoras en Windows.' : 'En el móvil se crea un PDF con el tamaño exacto de la etiqueta.'), field('Copias', copies)),
    opts.aviso ? h('p.small.warn-t', opts.aviso) : null),
  close => [btn('Cerrar', close), bEdit, btn('IMPRIMIR ETIQUETA', async ev => {
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
export function cardLayout(size, n, forma) {
  const c0 = CARD_SIZES[size] || CARD_SIZES['85x55'], c = shapeBox(forma || 'rect', c0.w, c0.h), m = 10, gap = 8; // v13.5: un círculo ocupa un cuadrado
  const cols = Math.max(1, Math.floor((A4.w - 2 * m + gap) / (c.w + gap))), rows = Math.max(1, Math.floor((A4.h - 2 * m + gap) / (c.h + gap)));
  const per = cols * rows, gw = cols * c.w + (cols - 1) * gap, gh = rows * c.h + (rows - 1) * gap;
  return { w: c.w, h: c.h, cols, rows, per, n: Math.max(1, Math.min(per, Number(n) || per)), x0: (A4.w - gw) / 2, y0: (A4.h - gh) / 2, gap };
}
function rgba(hex, a) { const m = String(hex || '').match(/^#?([0-9a-f]{6})$/i); const v = m ? parseInt(m[1], 16) : 0xe0457b; return 'rgba(' + (v >> 16) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')'; }
// ---------- v13.7 · DISEÑO de la tarjeta: fondo (color, degradado o imagen difuminada), letras, tamaños, colores y posición ----------
// Una sola implementación para todo: vista previa, hoja A4 / PDF, impresora de papel y la etiqueta 50 × 50 (también por Bluetooth).
export const FUENTES_TARJETA = [
  { k: 'georgia', t: 'Georgia (clásica)', css: 'Georgia, "Times New Roman", serif' },
  { k: 'segoe', t: 'Segoe UI (moderna)', css: '"Segoe UI", Arial, sans-serif' },
  { k: 'palatino', t: 'Palatino (elegante)', css: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { k: 'trebuchet', t: 'Trebuchet (redonda)', css: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { k: 'arialblack', t: 'Arial Black (gruesa)', css: '"Arial Black", "Segoe UI Black", Arial, sans-serif' },
  { k: 'impact', t: 'Impact (titulares)', css: 'Impact, "Arial Black", sans-serif' },
  { k: 'manuscrita', t: 'Manuscrita', css: '"Segoe Script", "Lucida Handwriting", "Brush Script MT", cursive' },
  { k: 'informal', t: 'Informal', css: '"Segoe Print", "Comic Sans MS", cursive' },
  { k: 'maquina', t: 'Máquina de escribir', css: '"Courier New", Courier, monospace' }
];
const fuenteCss = k => (FUENTES_TARJETA.find(f => f.k === k) || {}).css;
export const DISENO_DEF = { fondo: 'blanco', color2: '#ffd6e5', angulo: 135, imagenId: '', ajuste: 'cubrir', difuminado: 0, velo: 0.35, veloColor: 'claro',
  fuenteTitulo: 'georgia', fuenteTexto: 'segoe', tamTitulo: 100, tamTexto: 100, tamFirma: 100, colorTitulo: '#2b2230', colorTexto: '#54495c', posicion: 'centro', alineacion: 'centro' };
export function diseno(d) {
  const x = Object.assign({}, DISENO_DEF, (d && d.diseno) || {});
  if (!(d && d.diseno && d.diseno.fondo) && d && d.fondo) x.fondo = 'suave'; // compatibilidad: «Fondo suave del color de acento» de antes
  return x;
}
// Imagen de fondo (un archivo subido al programa): se descarga una vez y se guarda en memoria
const fondos = new Map();
export async function loadCardBg(ds) {
  const id = ds && ds.fondo === 'imagen' && ds.imagenId;
  if (!id) return null;
  if (fondos.has(id)) return fondos.get(id);
  const p = (async () => {
    const a = (S.t.archivos || []).find(x => x.id === id); if (!a) return null;
    const F = await import('./files.js'); const b = await F.fetchFile(a);
    if (window.createImageBitmap) { try { return await createImageBitmap(b); } catch (e) { } }
    return await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = URL.createObjectURL(b); });
  })().catch(() => null);
  fondos.set(id, p);
  return p;
}
export function resetCardBg() { fondos.clear(); }
// Difuminado: con el filtro del navegador si existe; si no, reduciendo y ampliando (mismo efecto aproximado)
const borrosas = new Map();
function imagenFondo(img, wpx, hpx, ajuste, blurPx) {
  const key = [img.width, img.height, wpx, hpx, ajuste, blurPx].join('|');
  const cache = borrosas.get(img) || new Map(); borrosas.set(img, cache);
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(wpx)); c.height = Math.max(1, Math.round(hpx));
  const g = c.getContext('2d');
  const sc = ajuste === 'contener' ? Math.min(c.width / img.width, c.height / img.height) : Math.max(c.width / img.width, c.height / img.height);
  const dw = img.width * sc, dh = img.height * sc, dx = (c.width - dw) / 2, dy = (c.height - dh) / 2;
  if (blurPx > 0.5 && 'filter' in g) {
    const m = Math.ceil(blurPx * 2); g.filter = 'blur(' + blurPx.toFixed(1) + 'px)'; g.drawImage(img, dx - m, dy - m, dw + 2 * m, dh + 2 * m); g.filter = 'none';
  } else if (blurPx > 0.5) {
    const f = Math.max(2, Math.round(blurPx / 2)), t = document.createElement('canvas'); t.width = Math.max(1, Math.round(c.width / f)); t.height = Math.max(1, Math.round(c.height / f));
    const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(img, dx / f, dy / f, dw / f, dh / f);
    g.imageSmoothingQuality = 'high'; g.drawImage(t, 0, 0, c.width, c.height);
  } else g.drawImage(img, dx, dy, dw, dh);
  cache.set(key, c);
  return c;
}
// Pinta el fondo de una tarjeta (x, y, w, h en mm). Devuelve true si es un fondo «de foto» (para tramar en impresoras térmicas).
export function pintaFondo(g, k, x, y, w, hgt, d) {
  const ds = diseno(d), acc = d.color || '#e0457b', X = x * k, Y = y * k, W = w * k, H = hgt * k;
  if (d.__blanco !== false) { g.fillStyle = '#fff'; g.fillRect(X, Y, W, H); }
  if (ds.fondo === 'suave') { g.fillStyle = rgba(acc, 0.06); g.fillRect(X, Y, W, H); return false; }
  if (ds.fondo === 'degradado') {
    // ángulo como en CSS y en los programas de diseño: 0° hacia arriba, 90° hacia la derecha, 135° de arriba-izquierda a abajo-derecha
    const a = (Number(ds.angulo) || 0) * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), cx = X + W / 2, cy = Y + H / 2, r = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
    const gr = g.createLinearGradient(cx - dx * r, cy - dy * r, cx + dx * r, cy + dy * r);
    gr.addColorStop(0, acc); gr.addColorStop(1, ds.color2 || '#ffffff'); g.fillStyle = gr; g.fillRect(X, Y, W, H);
  } else if (ds.fondo === 'imagen' && d.fondoImg && d.fondoImg.width) {
    const bpx = Math.max(0, Math.min(10, Number(ds.difuminado) || 0)) * k; // difuminado en mm → píxeles de esta resolución
    g.drawImage(imagenFondo(d.fondoImg, W, H, ds.ajuste, bpx), X, Y, W, H);
  } else return false;
  const v = Math.max(0, Math.min(0.9, Number(ds.velo) || 0));
  if (v > 0) { g.fillStyle = ds.veloColor === 'oscuro' ? 'rgba(0,0,0,' + v + ')' : 'rgba(255,255,255,' + v + ')'; g.fillRect(X, Y, W, H); }
  return true;
}

function drawOneCard(g, k, x, y, w, hgt, d) {
  // v13.5: tarjeta con forma (círculo, esquinas redondeadas, óvalo): fondo dentro de la forma, contenido en su hueco
  // seguro, recorte de lo que sobresale y, con «Borde fino», la línea de corte siguiendo la forma.
  const forma = SHAPES[d.forma] && d.forma !== 'rect' ? d.forma : '';
  if (forma) {
    const S0 = SHAPES[forma], inn = S0.inner(w, hgt, w / hgt);
    g.save(); g.fillStyle = '#fff'; g.fillRect(x * k, y * k, w * k, hgt * k);
    S0.path(g, x * k, y * k, w * k, hgt * k, k); g.clip();
    if (pintaFondo(g, k, x, y, w, hgt, d)) g.canvas.__tramado = true; // v13.7: el fondo llena toda la forma
    drawOneCard(g, k, x + inn.x, y + inn.y, inn.w, inn.h, Object.assign({}, d, { forma: 'rect', fondo: false, corte: 'ninguno', __blanco: false, __sinFondo: true }));
    g.restore();
    if (d.corte === 'borde') { g.strokeStyle = 'rgba(0,0,0,.32)'; g.lineWidth = 0.2 * k; S0.path(g, (x + 0.1) * k, (y + 0.1) * k, (w - 0.2) * k, (hgt - 0.2) * k, k); g.stroke(); }
    g.textAlign = 'left';
    return;
  }
  g.__k = k;
  const acc = d.color || '#e0457b', P = 4, ds = diseno(d); // margen interior (mm)
  g.save(); g.translate(x * k, y * k);
  if (!d.__sinFondo && pintaFondo(g, k, 0, 0, w, hgt, d)) g.canvas.__tramado = true;
  if (d.corte === 'borde') { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 0.2 * k; const r = 2.5 * k; g.beginPath(); g.moveTo(r, 0.1 * k); g.arcTo(w * k, 0, w * k, hgt * k, r); g.arcTo(w * k, hgt * k, 0, hgt * k, r); g.arcTo(0, hgt * k, 0, 0, r); g.arcTo(0, 0, w * k, 0, r); g.stroke(); }
  const qs = d.qr ? Math.min(hgt * 0.36, 20) : 0, tw = w - 2 * P - (qs ? qs + 3 : 0), cx = P + tw / 2;
  let y0 = P + 1;
  // tamaño de todo el bloque para centrarlo en vertical
  const sc = Math.min(w / 85, hgt / 55) || 1;
  const parts = [];
  if (d.logoImg && d.logoImg.width) { const lh = Math.min(hgt * 0.24, 16 * sc), lw = Math.min(tw, d.logoImg.width / d.logoImg.height * lh); parts.push({ t: 'logo', h: lw / (d.logoImg.width / d.logoImg.height), w: lw }); }
  const font = (pt, wt, fam) => (wt || 400) + ' ' + Math.round(pt * sc * 0.3528 * k) + 'px ' + (fam || '"Segoe UI", Arial, sans-serif');
  const lines = (txt, pt, wt, fam) => { g.font = font(pt, wt, fam); return wrap(g, txt, tw * k).filter(Boolean); };
  // v13.7: letra, tamaño y color de cada texto, alineación y posición del bloque (arriba, centro o abajo)
  const fT = fuenteCss(ds.fuenteTitulo) || 'Georgia, "Times New Roman", serif', fX = fuenteCss(ds.fuenteTexto);
  const pT = 15 * (Number(ds.tamTitulo) || 100) / 100, pX = 7.6 * (Number(ds.tamTexto) || 100) / 100, pF = 7 * (Number(ds.tamFirma) || 100) / 100;
  const T1 = d.titulo ? lines(d.titulo, pT, 700, fT) : [], T2 = d.texto ? lines(d.texto, pX, 400, fX) : [], T3 = d.firma ? lines(d.firma, pF, 700, fX) : [];
  const lh = pt => pt * sc * 0.3528 * 1.25;
  const total = (parts[0] ? parts[0].h + 2.2 : 0) + T1.length * lh(pT) + (T1.length && (T2.length || T3.length) ? 3.2 : 0) + T2.length * lh(pX) + (T3.length ? 2 + T3.length * lh(pF) : 0);
  y0 = ds.posicion === 'arriba' ? P : ds.posicion === 'abajo' ? Math.max(P, hgt - P - total) : Math.max(P, (hgt - total) / 2);
  const al = ds.alineacion === 'izquierda' ? 'left' : ds.alineacion === 'derecha' ? 'right' : 'center';
  const ax = al === 'left' ? P : al === 'right' ? P + tw : cx;
  g.textAlign = al; g.textBaseline = 'top';
  if (parts[0]) { const lx = al === 'left' ? P : al === 'right' ? P + tw - parts[0].w : cx - parts[0].w / 2; g.drawImage(d.logoImg, lx * k, y0 * k, parts[0].w * k, parts[0].h * k); y0 += parts[0].h + 2.2; }
  g.fillStyle = ds.colorTitulo || '#2b2230'; g.font = font(pT, 700, fT); T1.forEach(l => { g.fillText(l, ax * k, y0 * k); y0 += lh(pT); });
  if (T1.length && (T2.length || T3.length)) { const x1 = al === 'left' ? P : al === 'right' ? P + tw - 18 : cx - 9; g.strokeStyle = acc; g.lineWidth = 0.35 * k; g.beginPath(); g.moveTo(x1 * k, (y0 + 1.2) * k); g.lineTo((x1 + 18) * k, (y0 + 1.2) * k); g.stroke(); y0 += 3.2; }
  g.fillStyle = ds.colorTexto || '#54495c'; g.font = font(pX, 400, fX); T2.forEach(l => { g.fillText(l, ax * k, y0 * k); y0 += lh(pX); });
  if (T3.length) { y0 += 2; g.fillStyle = acc; g.font = font(pF, 700, fX); T3.forEach(l => { g.fillText(l.toUpperCase(), ax * k, y0 * k); y0 += lh(pF); }); }
  g.textAlign = 'center';
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
  const L = cardLayout(d.tam, d.n, d.forma), { c, g, k } = mk(A4.w, A4.h, dpi);
  for (let i = 0; i < L.n; i++) {
    const x = L.x0 + (i % L.cols) * (L.w + L.gap), y = L.y0 + Math.floor(i / L.cols) * (L.h + L.gap);
    drawOneCard(g, k, x, y, L.w, L.h, d);
    if (d.corte === 'marcas') cropMarks(g, k, x, y, L.w, L.h);
  }
  return c;
}
export function drawOneCardCanvas(d, dpi) { const s0 = CARD_SIZES[d.tam] || CARD_SIZES['85x55'], s = shapeBox(d.forma || 'rect', s0.w, s0.h), { c, g, k } = mk(s.w, s.h, dpi); drawOneCard(g, k, 0, 0, s.w, s.h, d); return c; }
export const oneCardSize = d => { const s0 = CARD_SIZES[d.tam] || CARD_SIZES['85x55']; return shapeBox(d.forma || 'rect', s0.w, s0.h); };
