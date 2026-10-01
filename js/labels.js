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
import { qrMatrix } from './qr.js';
import { appUrl, emisor } from './print.js';

const CL = window.CL;
export const TEMPLATES = {
  envio: { t: 'Envío', w: 100, h: 150, d: '10 × 15 cm · para el paquete' },
  producto: { t: 'Producto', w: 50, h: 30, d: 'nombre, SKU, precio y QR' },
  almacen: { t: 'Almacén / caja', w: 100, h: 50, d: 'ubicación grande y QR del stock' },
  qr: { t: 'QR', w: 40, h: 40, d: 'QR universal: abre la ficha al escanearlo' }
};
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
  if (!desktop.on) return [];
  if (printersCache && !force) return printersCache;
  try { printersCache = (await desktop.printers()).impresoras || []; } catch (e) { printersCache = []; }
  return printersCache;
}
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
  if (tpl === 'envio') return lab || sheet || null;
  return sheet || lab || null;
}
const dpiOf = p => (p && p.label ? 203 : 300);
// ¿Cabe la etiqueta en el papel de esa impresora o es de folios (A4)? En A4 se colocan varias por hoja.
const isSheet = (p, s) => !!p && !p.label && (p.a4 || !(p.papers || []).some(x => Math.abs(Math.min(x.wmm, x.hmm) - Math.min(s.w, s.h)) <= 4 && Math.abs(Math.max(x.wmm, x.hmm) - Math.max(s.w, s.h)) <= 6));

// ---------- QR universal ----------
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
  const M = qrMatrix(data), N = M.length + 2, cell = size / N;
  g.fillStyle = '#fff'; g.fillRect(x, y, size, size); g.fillStyle = '#000';
  M.forEach((row, r) => row.forEach((v, c) => { if (v) g.fillRect(Math.floor(x + (c + 1) * cell), Math.floor(y + (r + 1) * cell), Math.ceil(cell), Math.ceil(cell)); }));
}
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
    const qs = 32, qy = H - m - qs - 1.5;
    line(g, 1.5 * k, (qy - 2.5) * k, (W - 1.5) * k, (qy - 2.5) * k, 0.4 * k);
    qr(g, d.qr, (m + 0.5) * k, qy * k, qs * k);
    let y2 = qy;
    y2 = T(d.contenido || '', m + qs + 3, y2, W - qs - 2 * m - 4, 9, 700, 3) + 1;
    if (d.envio) y2 = T(d.envio + (d.seguimiento ? ' · ' + d.seguimiento : ''), m + qs + 3, y2, W - qs - 2 * m - 4, 8.5, 500, 2) + 1;
    if (d.qr) T('Escanea al entregarlo: se marca como enviado.', m + qs + 3, Math.max(y2, qy + qs - 7), W - qs - 2 * m - 4, 6.5, 400, 2);
  } else if (tpl === 'producto') {
    const qs = Math.min(H - 2 * m, W * 0.42);
    qr(g, d.qr, (W - m - qs) * k, ((H - qs) / 2) * k, qs * k);
    const tw = W - qs - 2 * m - 1.5;
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
  } else { // qr
    const cap = d.titulo ? 7 : 0, qs = Math.min(W, H - cap) - 2 * m + 1;
    qr(g, d.qr, ((W - qs) / 2) * k, (m - 1) * k, qs * k);
    if (d.titulo) { g.textAlign = 'center'; g.font = F(H < 45 ? 7 : 9, 700); const l = wrap(g, d.titulo, (W - 2 * m) * k)[0]; g.fillText(l, (W / 2) * k, (H - cap + 0.5) * k); g.textAlign = 'left'; }
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
  const c = await labelCfg(), list = await printers(), s = sizeOf(tpl, c);
  const pr = opts.printer ? list.find(p => p.name === opts.printer) : pickPrinter(tpl, list, c);
  const copies = Math.max(1, Math.min(50, Number(opts.copies) || 1));
  const dpi = dpiOf(pr);
  const canv = []; datas.forEach(d => { for (let i = 0; i < copies; i++) canv.push(draw(tpl, d, dpi, s)); });
  const reg = how => { datas.forEach(d => { if (d.ref) api('etiquetas.registrar', { plantilla: tpl, entidad: d.ref.entidad, entidadId: d.ref.id, titulo: d.titulo || '', impresora: how, copias: copies }, { quiet: true }).catch(() => { }); }); };
  if (desktop.on && pr) {
    const adj = (c.ajuste && c.ajuste[pr.name]) || {};
    const sheet = isSheet(pr, s);
    const pages = sheet ? sheets(canv, s, dpi).map(cv => ({ cv, w: A4.w, h: A4.h })) : canv.map(cv => ({ cv, w: s.w, h: s.h }));
    for (const p of pages) await desktop.print({ printer: pr.name, png: p.cv.toDataURL('image/png'), wmm: p.w, hmm: p.h, copies: 1, offx: Number(adj.x) || 0, offy: Number(adj.y) || 0 });
    reg(pr.name);
    toast('🖨️ ' + canv.length + (canv.length === 1 ? ' etiqueta enviada' : ' etiquetas enviadas') + ' a ' + pr.name + (sheet ? ' (a tamaño real en folio A4)' : ''), 'ok', 5000);
    return true;
  }
  // Sin el programa del PC: PDF con el tamaño exacto de la etiqueta
  const blob = pdfFromCanvases(canv.map(cv => ({ canvas: cv, wmm: s.w, hmm: s.h })));
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) { const a = h('a', { href: url, download: 'etiquetas_' + tpl + '.pdf' }); document.body.appendChild(a); a.click(); a.remove(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  reg('PDF');
  toast('📄 PDF de ' + s.w + ' × ' + s.h + ' mm listo. Al imprimir elige "Tamaño real" o "100 %".', 'ok', 7000);
  return true;
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
