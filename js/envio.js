// ================= v11.6 · FASE 4 · EMPAQUETAR automático =================
// Todo lo que se imprime o se envía al cliente con cada paquete, desde un solo sitio:
// · Etiqueta de envío OFICIAL (Vinted, Correos, InPost…): se ADJUNTA (PDF o imagen) y sale tal cual. Nunca se inventa.
// · Código del paquete 50 × 50 (QR + CEB-AAAA-NNNNNN): al escanearlo se abre el pedido.
// · Tarjeta de agradecimiento 50 × 50 con tu logo y tu texto ({cliente}, {producto}, {pedido}…).
// · Cada impresión queda registrada: Pendiente / Enviando / Impreso / Error. Lo ya impreso solo se repite con «Reimprimir».
// · Mensajes al cliente para copiar y pegar (Vinted, Wallapop, WhatsApp…): lo que falta se avisa, no se rellena.
import { h, mount, btn, modal, toast, field, inp, area, sel, pill, fdt, copyText, confirmDlg } from './ui.js';
import { S, api, can, byId, upsertLocal, emit } from './store.js';
import { appUrl, emisor } from './print.js';

const CL = window.CL;
const ecfg = () => (S.cfg && S.cfg.envio) || {};
export const PRINT_TIPOS = {
  oficial: { t: 'Etiqueta de envío oficial', tpl: 'oficial', f: '100x150', i: '🏷️' },
  propia: { t: 'Etiqueta de dirección propia', tpl: 'envio', f: '100x150', i: '✉️' },
  paquete: { t: 'Código del paquete (QR)', tpl: 'paquete', f: '50x50', i: '🔳' },
  gracias: { t: 'Tarjeta de agradecimiento', tpl: 'gracias', f: '50x50', i: '💌' }
};
const EST_CLS = { Pendiente: 'warn', Enviando: 'brand', Impreso: 'ok', Error: 'bad' };
// lo que ve la persona (en el registro se guarda Enviando/Impreso)
const EST_TXT = { Pendiente: 'PENDIENTE', Enviando: 'IMPRIMIENDO', Impreso: 'IMPRESO', Error: 'ERROR' };
export const CODE_RX = /CEB-\d{4}-\d{6}/i;
export const codeFrom = t => { const m = String(t || '').match(CODE_RX); return m ? m[0].toUpperCase() : ''; };

// ---------- Código del paquete ----------
export function qrPayload(o) { const b = appUrl(); return o.codigo ? (b ? b + '#/q/ceb/' + o.codigo : o.codigo) : ''; }
export async function ensureCode(o) {
  if (o.codigo) return o;
  const r = await api('pedidos.codigo', { id: o.id });
  upsertLocal('pedidos', r); emit();
  return r;
}
export function findByCode(code) { code = codeFrom(code); return code ? (S.t.pedidos || []).find(o => o.codigo === code) || null : null; }

// ---------- Plantillas con {marcadores} ----------
export const MARCAS = [['cliente', 'nombre del cliente'], ['producto', 'producto'], ['pedido', 'nº de pedido'], ['codigo', 'código del paquete'], ['cantidad', 'unidades'], ['tienda', 'tu tienda'], ['transportista', 'transportista'], ['seguimiento', 'nº de seguimiento']];
export function ctxOf(o) {
  const em = emisor();
  return { cliente: String(o.cliente || '').trim(), producto: String(o.producto || '').trim(), pedido: String(o.numero || ''), codigo: o.codigo || '', cantidad: String(o.cantidad || 1),
    tienda: em.comercial || em.nombre || (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || '', transportista: o.envio || '', seguimiento: o.seguimiento || '' };
}
// Rellena los marcadores. Lo que falta NO se inventa: queda marcado y se devuelve en «faltan».
export function fill(text, ctx) {
  const faltan = [];
  const out = String(text || '').replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in ctx)) return m;
    const v = String(ctx[k] || '').trim();
    if (!v) { faltan.push(k); return '[' + ((MARCAS.find(x => x[0] === k) || [k, k])[1]).toUpperCase() + ' — FALTA]'; }
    return k === 'cliente' ? v.split(/\s+/)[0] : v;
  });
  return { texto: out, faltan: [...new Set(faltan)] };
}
export function thanksData(o, g) {
  g = Object.assign({}, ecfg().gracias || {}, g || {});
  const c = ctxOf(o), F = t => fill(t, c);
  const parts = [F(g.titulo), F(g.texto), F(g.firma)];
  return { titulo: parts[0].texto, texto: parts[1].texto, firma: parts[2].texto, faltan: [...new Set(parts.flatMap(p => p.faltan))], logo: g.logo !== false, qr: g.qrCodigo && o.codigo ? qrPayload(o) : '' };
}

// ---------- v11.8 · Tarjeta UNIVERSAL en hoja A4 (no lleva datos del cliente) ----------
export const cardMode = () => (((ecfg().tarjeta || {}).modo) === 'etiqueta' ? 'etiqueta' : 'hoja');
const UNIVERSAL_OK = ['tienda'];
export function thanksUrl(t) {
  t = t || ecfg().tarjeta || {}; const b = appUrl(); if (!b) return '';
  const pg = t.pagina || {}, em = emisor(), q = new URLSearchParams();
  q.set('n', em.comercial || em.nombre || (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || '');
  if (pg.mensaje) q.set('m', pg.mensaje); if (pg.instagram) q.set('ig', pg.instagram); if (pg.tiktok) q.set('tt', pg.tiktok);
  if (pg.web) q.set('w', pg.web); if (pg.whatsapp) q.set('wa', pg.whatsapp); if (pg.email) q.set('e', pg.email);
  if (t.color) q.set('c', t.color.replace('#', ''));
  return b + 'gracias.html?' + q.toString();
}
export function universalCard(g, t) {
  g = Object.assign({}, ecfg().gracias || {}, g || {}); t = Object.assign({ tam: '85x55', corte: 'marcas', color: '#e0457b' }, ecfg().tarjeta || {}, t || {});
  const quitados = new Set(), em = emisor(), tienda = em.comercial || em.nombre || (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || '';
  const F = x => String(x || '').replace(/\{(\w+)\}/g, (m, k) => { if (k === 'tienda') return tienda; quitados.add(k); return ''; }).replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').replace(/^[,\s]+|[,\s]+$/g, '').trim();
  const qrUrl = t.qr ? thanksUrl(t) : '';
  return { titulo: F(g.titulo), texto: F(g.texto), firma: F(g.firma), logo: g.logo !== false, qr: qrUrl, tam: t.tam, n: Number(t.n) || 0, corte: t.corte, color: t.color, fondo: !!t.fondo,
    avisos: [...quitados].length ? ['La tarjeta es universal: no lleva ' + [...quitados].map(k => '{' + k + '}').join(', ') + ' (sirve para todos los clientes).'] : [], sinQr: t.qr && !qrUrl ? 'Falta la dirección pública de la app (la de GitHub Pages): sin ella el QR no puede abrir la página de agradecimiento.' : '' };
}
export async function printCardSheets(d, opts = {}) {
  const L = await import('./labels.js');
  if (d.logo) d.logoImg = await L.loadLogo();
  const hojas = Math.max(1, Math.min(20, Number(opts.hojas) || 1)), dpi = opts.dpi || 300;
  const r = await L.sendLabel('tarjetas', () => Array.from({ length: hojas }, () => L.drawCardSheet(d, dpi)), { printer: opts.printer, calidad: 'foto', fileName: 'tarjetas_agradecimiento' });
  api('etiquetas.registrar', { plantilla: 'tarjetas', entidad: 'etiqueta', entidadId: 'tarjetas-A4', titulo: hojas + ' hoja(s) de tarjetas ' + d.tam, impresora: r.printer, copias: hojas }, { quiet: true }).catch(() => { });
  return r;
}

// ---------- Estado de impresión de cada cosa del paquete ----------
export const printsOf = o => (S.t.impresiones || []).filter(r => r.pedidoId === o.id).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
export function wanted(o) {
  const im = Object.assign({ paquete: true, gracias: true, propiaSinOficial: false }, ecfg().imprimir || {}), out = [];
  if (o.etiquetaEnvio && o.etiquetaEnvio.archivoId) out.push('oficial'); else if (im.propiaSinOficial) out.push('propia');
  if (im.paquete) out.push('paquete');
  if (im.gracias) out.push('gracias');
  return out;
}
export function statusOf(o, tipo) {
  const rows = printsOf(o).filter(r => r.tipo === tipo), last = rows[rows.length - 1];
  const done = rows.filter(r => r.estado === 'Impreso');
  if (!last) return { estado: 'Pendiente', rows, done };
  // un «Impreso» anterior manda sobre un error de una reimpresión
  const estado = last.estado === 'Error' && done.length ? 'Impreso' : last.estado;
  return { estado, last, rows, done, fallo: last.estado === 'Error' ? last : null };
}
export const pendingOf = o => wanted(o).filter(t => ['Pendiente', 'Error'].includes(statusOf(o, t).estado));

// ---------- Etiqueta oficial: de su PDF o imagen a 100 × 150 sin deformarla ----------
let pdfjs = null;
async function pdfLib() {
  if (pdfjs) return pdfjs;
  pdfjs = await import('../vendor/pdfjs/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
  return pdfjs;
}
const isPdf = (name, mime) => /pdf/i.test(mime || '') || /\.pdf$/i.test(name || '');
// Recorta el blanco alrededor (las etiquetas suelen venir en un folio A4) y gira si viene apaisada
function cropRotate(src, portrait) {
  const g = src.getContext('2d', { willReadFrequently: true }), W = src.width, H = src.height, px = g.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const i = (y * W + x) * 4; if (px[i + 3] > 20 && px[i] + px[i + 1] + px[i + 2] < 600) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) return { canvas: src, recorte: false, giro: false };
  const pad = Math.round(Math.max(W, H) * 0.008);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, recorte = cw * ch < W * H * 0.9;
  const giro = portrait && cw > ch * 1.08;
  const out = document.createElement('canvas'); out.width = giro ? ch : cw; out.height = giro ? cw : ch;
  const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
  if (giro) { o.translate(out.width, 0); o.rotate(Math.PI / 2); }
  o.drawImage(src, x0, y0, cw, ch, 0, 0, cw, ch);
  return { canvas: out, recorte, giro };
}
const officialCache = new Map();
export async function officialCanvas(o, opts = {}) {
  const e = o.etiquetaEnvio;
  if (!e || !e.archivoId) throw new Error('Este pedido no tiene la etiqueta oficial adjunta.');
  const pagina = Math.max(1, Number(opts.pagina || e.pagina) || 1), key = e.archivoId + ':' + pagina + ':' + (opts.recortar === false ? 0 : 1);
  if (officialCache.has(key)) return officialCache.get(key);
  const a = byId('archivos', e.archivoId) || { id: e.archivoId, nombre: e.nombre, mime: e.mime, driveId: 'x' };
  const F = await import('./files.js');
  const blob = opts.blob || await F.fetchFile(a);
  let src, paginas = 1;
  if (isPdf(a.nombre, a.mime || blob.type)) {
    const lib = await pdfLib();
    const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
    paginas = doc.numPages;
    const page = await doc.getPage(Math.min(pagina, paginas)), vp = page.getViewport({ scale: 300 / 72 });
    src = document.createElement('canvas'); src.width = Math.round(vp.width); src.height = Math.round(vp.height);
    const g = src.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, src.width, src.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
  } else {
    const bmp = await createImageBitmap(blob);
    src = document.createElement('canvas'); src.width = bmp.width; src.height = bmp.height;
    const g = src.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, src.width, src.height); g.drawImage(bmp, 0, 0);
  }
  const r = opts.recortar === false ? { canvas: src, recorte: false, giro: false } : cropRotate(src, true);
  const out = Object.assign(r, { paginas, pagina });
  officialCache.set(key, out);
  return out;
}
// Posibles números de seguimiento escritos en la etiqueta (solo se PROPONEN; la persona elige)
export async function trackingCandidates(blob, name) {
  try {
    if (!isPdf(name, blob.type)) return [];
    const lib = await pdfLib();
    const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
    let txt = '';
    for (let i = 1; i <= Math.min(doc.numPages, 3); i++) { const tc = await (await doc.getPage(i)).getTextContent(); txt += ' ' + tc.items.map(x => x.str).join(' '); }
    const found = new Set();
    [/\b[A-Z]{2}\d{9}[A-Z]{2}\b/g, /\bPQ[A-Z0-9]{10,22}\b/g, /\b\d{12,24}\b/g, /\b[A-Z]{2,4}\d{8,20}[A-Z]{0,2}\b/g].forEach(rx => (txt.replace(/\s(?=\d{4}\b)/g, ' ').match(rx) || []).forEach(x => found.add(x)));
    return [...found].filter(x => !/^(19|20)\d{6}$/.test(x)).slice(0, 5);
  } catch (e) { return []; }
}

// ---------- Imprimir una cosa del paquete, registrada y sin dobles ----------
async function buildFor(o, tipo, L) {
  const T = PRINT_TIPOS[tipo];
  if (tipo === 'oficial') { const r = await officialCanvas(o); return { tpl: 'oficial', data: { canvas: r.canvas } }; }
  if (tipo === 'propia') { return { tpl: 'envio', data: L.dataFor('envio', { o, c: o.clienteId ? byId('clientes', o.clienteId) : null }) }; }
  if (tipo === 'paquete') return { tpl: 'paquete', data: { qr: qrPayload(o), codigo: o.codigo, numero: o.numero, cliente: String(o.cliente || '').split(/\s+/)[0] } };
  const d = thanksData(o);
  if (d.logo) d.logoImg = await L.loadLogo();
  return { tpl: T.tpl, data: d };
}
// Modo hoja A4: la tarjeta ya está impresa en hojas; en el pedido solo se apunta que va DENTRO del paquete
export async function cardIncluded(o) {
  let row;
  try { row = (await api('impresiones.iniciar', { pedidoId: o.id, tipo: 'gracias', formato: 'A4', impresora: 'Tarjetas de las hojas A4', dispositivo: S.device || '' })).impresion; }
  catch (e) { toast(e.code === 'YA_IMPRESO' ? 'La tarjeta ya estaba metida en este paquete.' : e.message, 'warn'); return null; }
  upsertLocal('impresiones', row); emit();
  const r = await api('impresiones.resultado', { id: row.id, ok: true, impresora: 'Tarjetas de las hojas A4' });
  upsertLocal('impresiones', r.impresion); emit(); toast('💌 Tarjeta metida en el paquete', 'ok');
  return r.impresion;
}
export async function printOne(o, tipo, opts = {}) {
  if (tipo === 'gracias' && cardMode() === 'hoja') return (await cardIncluded(o)) ? { estado: 'Impreso' } : { estado: 'omitido' };
  const L = await import('./labels.js');
  if (tipo !== 'oficial' && tipo !== 'propia') o = await ensureCode(o);
  const b = await buildFor(o, tipo, L); // si falta algo (la etiqueta no se puede leer…) no se registra nada
  const t = await L.targetFor(b.tpl);
  let row;
  try {
    row = (await api('impresiones.iniciar', { pedidoId: o.id, tipo, formato: PRINT_TIPOS[tipo].f, reimprimir: !!opts.reimprimir, motivo: opts.motivo || '', impresora: t.pr ? t.pr.name : 'PDF', dispositivo: S.device || '' })).impresion;
  } catch (e) {
    if (e.code === 'YA_IMPRESO' && !opts.auto) return reprintDialog(o, tipo, e.message);
    if (e.code === 'YA_IMPRESO' || e.code === 'EN_CURSO') { if (!opts.auto) toast(e.message, 'warn', 7000); return { estado: 'omitido', motivo: e.message }; }
    throw e;
  }
  upsertLocal('impresiones', row); emit();
  const answer = async (ok, error, impresora) => { try { const r = await api('impresiones.resultado', { id: row.id, ok, error: error || '', impresora: impresora || '' }); upsertLocal('impresiones', r.impresion); emit(); return r.impresion; } catch (e) { return null; } };
  try {
    const res = await L.sendLabel(b.tpl, (dpi, s) => [L.draw(b.tpl, b.data, dpi, s)], { silent: true, fileName: tipo + '_pedido_' + o.numero });
    if (res.how === 'printer') { await answer(true, '', res.printer); return { estado: 'Impreso', impresora: res.printer }; }
    // en el móvil (PDF) no sabemos si la impresora lo sacó bien: se pregunta
    const okp = await askPrinted(PRINT_TIPOS[tipo].t);
    await answer(okp, okp ? '' : 'No salió bien (PDF)', 'PDF');
    return { estado: okp ? 'Impreso' : 'Error' };
  } catch (e) {
    await answer(false, e.message, t.pr ? t.pr.name : '');
    toast('❌ ' + PRINT_TIPOS[tipo].t + ': ' + e.message, 'bad', 9000);
    return { estado: 'Error', error: e.message };
  }
}
function askPrinted(what) {
  return new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    modal('¿Se ha impreso bien?', h('p', 'Se ha abierto el PDF de «' + what + '» a tamaño real. Imprímelo (escala 100 %) y dime cómo ha salido.'),
      close => [btn('No, ha fallado', () => { fin(false); close(); }, { cls: 'ghost' }), btn('Sí, impreso', () => { fin(true); close(); }, { cls: 'primary' })], { size: 'narrow', onclose: () => fin(false) });
  });
}
// Reimprimir: lo pide la persona, con motivo; queda como copia 2, 3…
export function reprintDialog(o, tipo, aviso) {
  return new Promise(res => {
    const motivo = sel(['Salió mal / manchada', 'Se ha perdido o roto', 'Hace falta otra copia', 'Otro'].map(x => ({ v: x, t: x })), 'Salió mal / manchada'), otro = inp({ placeholder: 'Escribe el motivo' });
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    modal('Reimprimir · ' + PRINT_TIPOS[tipo].t, h('div.col', aviso ? h('p.small.warn-t', aviso) : null, h('p.small', 'Queda apuntado como reimpresión, con fecha, quién y el motivo.'), field('Motivo', motivo), field('Detalle (opcional)', otro)),
      close => [btn('Cancelar', () => { fin({ estado: 'cancelado' }); close(); }), btn('Reimprimir', async () => { close(); fin(await printOne(o, tipo, { reimprimir: true, motivo: motivo.value + (otro.value.trim() ? ': ' + otro.value.trim() : '') })); }, { cls: 'primary', icon: 'printer' })],
      { size: 'narrow', onclose: () => fin({ estado: 'cancelado' }) });
  });
}
// Imprime en orden todo lo que falta (sin repetir lo ya impreso)
export async function printPending(o) {
  const list = pendingOf(o).filter(t => !(t === 'gracias' && cardMode() === 'hoja')), out = [];
  for (const t of list) { out.push([t, await printOne(byId('pedidos', o.id) || o, t, { auto: true })]); }
  const ok = out.filter(x => x[1].estado === 'Impreso').length, bad = out.filter(x => x[1].estado === 'Error').length;
  if (list.length) toast(ok + ' de ' + list.length + ' impreso(s)' + (bad ? ' · ' + bad + ' con error' : ''), bad ? 'warn' : 'ok', 6000);
  return out;
}

// ---------- Bloque «ETIQUETAS E IMPRESIÓN» (Embalaje y Escanear) ----------
export function printBlock(o, opts = {}) {
  const edit = can('pedidos.editar'), list = wanted(o), e = o.etiquetaEnvio;
  const row = tipo => {
    if (tipo === 'gracias' && cardMode() === 'hoja') {
      const st = statusOf(o, 'gracias'), inc = st.estado === 'Impreso', last = st.done[st.done.length - 1];
      return h('div.item', { style: { cursor: 'default', flexWrap: 'wrap' } }, h('span', '💌'), h('span.grow.small', h('b', 'Tarjeta de agradecimiento'), h('span.tiny.muted', ' · de las hojas A4'),
        last ? h('div.tiny.muted', 'Metida ' + fdt(last.fecha) + ' por ' + last.usuario) : h('div.tiny.muted', 'Las tarjetas se imprimen en hojas (Embalaje → Tarjeta y mensajes).')),
        pill(inc ? 'INCLUIDA' : 'PENDIENTE', inc ? 'ok' : 'warn'), edit && !inc ? btn('✓ Metida en el paquete', () => cardIncluded(o).then(() => opts.redraw && opts.redraw()), { cls: 'sm' }) : null);
    }
    const st = statusOf(o, tipo), T = PRINT_TIPOS[tipo], last = st.done[st.done.length - 1];
    return h('div.item', { style: { cursor: 'default', flexWrap: 'wrap' } }, h('span', T.i), h('span.grow.small', h('b', T.t), h('span.tiny.muted', ' · ' + T.f.replace('x', ' × ') + ' mm'),
      last ? h('div.tiny.muted', 'Impreso ' + fdt(last.fecha) + ' por ' + last.usuario + (st.done.length > 1 ? ' · ' + st.done.length + ' copias' : '') + (last.impresora ? ' · ' + last.impresora : '')) : null,
      st.fallo ? h('div.tiny.bad-t', 'Error: ' + st.fallo.error) : null),
      pill(tipo === 'gracias' && st.estado === 'Impreso' ? 'IMPRESA' : EST_TXT[st.estado] || st.estado.toUpperCase(), EST_CLS[st.estado]),
      edit ? (st.estado === 'Impreso' ? btn('Reimprimir', () => reprintDialog(o, tipo).then(() => opts.redraw && opts.redraw()), { cls: 'sm ghost', icon: 'printer' })
        : st.estado === 'Enviando' ? null : btn(st.estado === 'Error' ? 'Reintentar' : 'Imprimir', () => printOne(o, tipo).then(() => opts.redraw && opts.redraw()).catch(err => toast(err.message, 'bad', 8000)), { cls: 'sm', icon: 'printer' })) : null,
      tipo !== 'oficial' && tipo !== 'propia' ? btn('', () => previewDialog(o, tipo), { cls: 'sm ghost icon', icon: 'eye', title: 'Ver cómo queda' }) : null);
  };
  const pend = pendingOf(o).filter(t => !(t === 'gracias' && cardMode() === 'hoja'));
  return h('div.card.flat', { style: { marginBottom: '10px' } }, h('div.row', h('div.lbl.grow', { style: { fontWeight: 700 } }, 'ETIQUETAS E IMPRESIÓN'), o.codigo ? h('code.small', o.codigo) : null),
    h('div.row.wrap', { style: { margin: '4px 0 8px', gap: '6px', alignItems: 'center' } },
      e && e.archivoId ? h('span.small.grow', '🏷️ Etiqueta oficial: ', h('b', e.nombre), e.transportista ? ' · ' + e.transportista : '', h('span.tiny.muted', ' · adjuntada por ' + (e.por || '?')))
        : h('span.small.grow.warn-t', '🏷️ Falta la etiqueta de envío oficial (la de Vinted, Correos, InPost…). Adjúntala: nunca se inventa.'),
      edit ? btn(e && e.archivoId ? 'Cambiar' : 'Adjuntar etiqueta', () => attachDialog(o, opts.redraw), { cls: 'sm' + (e && e.archivoId ? ' ghost' : ' primary'), icon: 'upload' }) : null,
      e && e.archivoId ? btn('', () => officialPreview(o), { cls: 'sm ghost icon', icon: 'eye', title: 'Ver la etiqueta' }) : null),
    h('div.list', !(e && e.archivoId) ? h('div.item', { style: { cursor: 'default' } }, h('span', '🏷️'), h('span.grow.small', h('b', 'Etiqueta de envío oficial'), h('div.tiny.muted', 'No se imprime una etiqueta que no existe: adjúntala primero.')), pill('🟠 FALTA', 'warn')) : null, list.map(row)),
    edit && pend.length ? h('div.row', { style: { marginTop: '8px' } }, btn('🖨️ Imprimir lo que falta (' + pend.length + ')', () => printPending(o).then(() => opts.redraw && opts.redraw()), { cls: 'primary' }), h('span.tiny.muted', 'No repite lo ya impreso.')) : null,
    h('div.row.wrap', { style: { marginTop: '6px' } }, btn('💬 Mensaje para el cliente', () => messageDialog(o), { cls: 'sm ghost' })));
}

// Vista previa de la tarjeta de gracias / código del paquete
export async function previewDialog(o, tipo) {
  const L = await import('./labels.js');
  if (tipo === 'paquete' && !o.codigo) { try { o = await ensureCode(o); } catch (e) { return toast(e.message, 'bad'); } }
  const b = await buildFor(o, tipo, L), s = L.sizeOf(b.tpl, await L.labelCfg());
  const cv = L.draw(b.tpl, b.data, 300, s); cv.className = 'lbl-canvas'; cv.style.width = Math.round(s.w * 4) + 'px'; cv.style.maxWidth = '100%';
  const faltan = tipo === 'gracias' ? b.data.faltan : [];
  modal(PRINT_TIPOS[tipo].t + ' · ' + s.w + ' × ' + s.h + ' mm', h('div.col', h('div.lbl-prev', cv), faltan.length ? h('p.small.warn-t', 'Falta: ' + faltan.join(', ')) : null,
    tipo === 'gracias' ? h('p.tiny.muted', 'El texto se cambia en Embalaje → Tarjeta y mensajes.') : null), close => [btn('Cerrar', close)], { size: 'narrow' });
}
export async function officialPreview(o) {
  const box = h('div.col', h('p.muted', 'Leyendo la etiqueta…'));
  modal('Etiqueta oficial · pedido nº ' + o.numero, box, close => [btn('Cerrar', close)], { size: 'narrow' });
  try {
    const r = await officialCanvas(o), cv = document.createElement('canvas');
    cv.width = r.canvas.width; cv.height = r.canvas.height; cv.getContext('2d').drawImage(r.canvas, 0, 0);
    cv.className = 'lbl-canvas'; cv.style.width = '100%'; cv.style.maxWidth = '320px';
    mount(box, h('div.lbl-prev', cv), h('p.tiny.muted', 'Se imprime a 100 × 150 mm sin deformarla' + (r.recorte ? ' · recortado el blanco de alrededor' : '') + (r.giro ? ' · girada para que quepa' : '') + (r.paginas > 1 ? ' · página ' + r.pagina + ' de ' + r.paginas : '') + '. Es tu archivo original: no se cambia nada de lo que pone.'));
  } catch (e) { mount(box, h('p.bad-t', 'No se pudo leer la etiqueta: ' + e.message)); }
}

// ---------- Adjuntar la etiqueta oficial ----------
export function attachDialog(o, after) {
  const fi = h('input', { type: 'file', accept: 'application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp' });
  const tr = sel([{ v: '', t: o.envio ? o.envio + ' (el del pedido)' : '—' }].concat(((S.cfg && S.cfg.pedidos && S.cfg.pedidos.envios) || []).map(x => ({ v: x, t: x }))), '');
  const seg = inp({ placeholder: 'Nº de seguimiento (si lo sabes)', value: '' }), sug = h('div.row.wrap', { style: { gap: '6px' } }), prev = h('div.lbl-prev'), info = h('p.tiny.muted');
  const pagSel = sel([{ v: 1, t: 'Página 1' }], 1);
  let file = null;
  const showPrev = async () => {
    if (!file) return;
    mount(prev, h('p.muted.small', 'Preparando la vista previa…'));
    try {
      const r = await officialCanvas({ etiquetaEnvio: { archivoId: 'local:' + file.name + ':' + file.size, nombre: file.name, mime: file.type } }, { blob: file, pagina: Number(pagSel.value) });
      if (r.paginas > 1 && pagSel.options.length !== r.paginas) mount(pagSel, Array.from({ length: r.paginas }, (_, i) => h('option', { value: i + 1, selected: i + 1 === r.pagina }, 'Página ' + (i + 1))));
      const cv = r.canvas; cv.className = 'lbl-canvas'; cv.style.width = '100%'; cv.style.maxWidth = '260px';
      mount(prev, cv); info.textContent = 'Así saldrá (100 × 150 mm)' + (r.recorte ? ' · sin el blanco de alrededor' : '') + (r.giro ? ' · girada' : '') + (r.paginas > 1 ? ' · el PDF tiene ' + r.paginas + ' páginas: elige la de la etiqueta' : '') + '.';
    } catch (e) { mount(prev, h('p.bad-t.small', 'No se puede leer este archivo: ' + e.message)); }
  };
  pagSel.onchange = showPrev;
  fi.onchange = async () => {
    file = fi.files[0] || null; mount(sug);
    if (!file) return;
    showPrev();
    if (o.seguimiento) return;
    const c = await trackingCandidates(file, file.name);
    if (c.length) mount(sug, h('span.tiny.muted', 'En la etiqueta pone (¿es el seguimiento?):'), c.map(x => h('button.chip', { onclick: () => { seg.value = x; } }, x)));
  };
  modal('Adjuntar la etiqueta oficial · nº ' + o.numero, h('div.col',
    h('p.small', 'La etiqueta que te da la plataforma o la empresa de envíos (Vinted, Wallapop, Correos, InPost…), en PDF o foto. Se imprime tal cual: el programa no la inventa ni cambia lo que pone.'),
    fi, prev, info, h('div.form', field('Página del PDF', pagSel), field('Transportista', tr), field('Nº de seguimiento', seg, o.seguimiento ? 'Ya tiene: ' + o.seguimiento + ' (no se cambia)' : 'Solo si es el de la etiqueta')), sug),
  close => [btn('Cancelar', close), btn('Adjuntar', async ev => {
    if (!file) return toast('Elige el archivo de la etiqueta', 'warn');
    const bt = ev.target.closest('button'); bt.disabled = true;
    try {
      await attachFile(o, file, { transportista: tr.value || o.envio || '', seguimiento: seg.value.trim(), paginas: pagSel.options.length, pagina: Number(pagSel.value) || 1 });
      close(); toast('🏷️ Etiqueta oficial adjuntada', 'ok'); after && after();
    } catch (e) { toast(e.message, 'bad', 8000); bt.disabled = false; }
  }, { cls: 'primary', icon: 'upload' })], { size: 'wide' });
}

// ---------- Mensaje para el cliente (idea 6): elegir, revisar y copiar ----------
export function messageDialog(o, kind) {
  const ms = (ecfg().mensajes || []).length ? ecfg().mensajes : [];
  const ph = CL.phaseOf(S.cfg.pedidos, o.estado);
  const def = (ms.find(m => m.k === (kind || { enviado: 'enviado', entregado: 'gracias', listo: 'empaquetado', empaquetar: 'empaquetado' }[ph] || 'preparando')) || ms[0] || {}).k;
  const pick = sel(ms.map(m => ({ v: m.k, t: m.t })), def), ta = area({ rows: 6 }), warn = h('p.small');
  const upd = () => { const m = ms.find(x => x.k === pick.value) || {}; const r = fill(m.texto, ctxOf(o)); ta.value = r.texto; mount(warn, r.faltan.length ? h('span.warn-t', '⚠️ Falta: ' + r.faltan.map(k => (MARCAS.find(x => x[0] === k) || [k, k])[1]).join(', ') + '. Complétalo antes de enviarlo (no se inventa).') : h('span.ok-t', '✓ Todo relleno con los datos del pedido.')); };
  pick.onchange = upd; upd();
  modal('💬 Mensaje para ' + (o.cliente || 'el cliente') + ' · nº ' + o.numero, h('div.col', field('Plantilla', pick), ta, warn, h('p.tiny.muted', 'Se copia para pegarlo en Vinted, Wallapop, WhatsApp… El programa no lo envía solo. Las plantillas se cambian en Embalaje → Tarjeta y mensajes.')),
    close => [btn('Cerrar', close), btn('Copiar', () => { copyText(ta.value); }, { cls: 'primary', icon: 'copy' })], { size: 'narrow' });
}

// ---------- v11.7 · La etiqueta de envío vive en el PEDIDO (crear, ver, sustituir) ----------
export const hasLabel = o => !!(o && o.etiquetaEnvio && o.etiquetaEnvio.archivoId);
export async function attachFile(o, file, extra = {}) {
  const F = await import('./files.js');
  const a = await F.uploadFile(file, { entidad: 'pedidos', entidadId: o.id, original: true });
  const r = await api('pedidos.etiquetaOficial', Object.assign({ id: o.id, archivoId: a.id, transportista: o.envio || '' }, extra));
  upsertLocal('pedidos', r); emit();
  return r;
}
// Estado + botones (Adjuntar / Ver / Sustituir) para la ficha del pedido y su formulario
export function labelRow(o, after) {
  const ok = hasLabel(o), e = o.etiquetaEnvio || {}, edit = can('pedidos.editar');
  return h('div.lbl-row' + (ok ? '.ok' : '.warn'),
    h('span.grow', h('b', ok ? '🟢 ETIQUETA ADJUNTADA' : '🟠 FALTA ETIQUETA DE ENVÍO'), ok ? h('span.tiny', ' · ' + e.nombre + (e.transportista ? ' · ' + e.transportista : '')) : h('span.tiny', ' · la de Vinted, InPost, Correos… (nunca se inventa)')),
    ok ? btn('Ver', () => officialPreview(o), { cls: 'sm ghost', icon: 'eye' }) : null,
    edit ? btn(ok ? 'Sustituir' : 'Adjuntar etiqueta', () => attachDialog(o, after), { cls: 'sm' + (ok ? ' ghost' : ' primary'), icon: 'upload' }) : null);
}
// «Omitir por ahora»: deja seguir trabajando; la falta sigue marcada en 🟠
const OMIT = 'cd.etiquetaOmitida';
export const labelSkipped = o => { try { return (JSON.parse(sessionStorage.getItem(OMIT) || '[]')).includes(o.id); } catch (e) { return false; } };
export function skipLabel(o) { try { const l = JSON.parse(sessionStorage.getItem(OMIT) || '[]'); if (!l.includes(o.id)) l.push(o.id); sessionStorage.setItem(OMIT, JSON.stringify(l)); } catch (e) { } }
export function prepareBanner(o, redraw) {
  if (hasLabel(o) || labelSkipped(o) || !can('pedidos.editar')) return null;
  return h('div.prep-banner', h('div.grow', h('b', '📦 PREPARAR PEDIDO'), h('div.small', 'Antes de imprimir, adjunta la etiqueta de envío del cliente.')),
    btn('ADJUNTAR ETIQUETA', () => attachDialog(o, redraw), { cls: 'primary', icon: 'upload' }),
    btn('Omitir por ahora', () => { skipLabel(o); redraw && redraw(); }, { cls: 'ghost' }));
}

// ---------- «Preparado para enviar»: se comprueba todo antes de marcar como enviado (sin repetir impresiones) ----------
export function sendCheck(o, after) {
  o = byId('pedidos', o.id) || o;
  const packed = !!(o.embalaje && o.embalaje.hecho), items = [
    ['🏷️ Etiqueta de envío', hasLabel(o) ? (statusOf(o, 'oficial').estado === 'Impreso' ? 'ok' : 'warn') : 'warn', hasLabel(o) ? (statusOf(o, 'oficial').estado === 'Impreso' ? 'Adjuntada e impresa' : 'Adjuntada, sin imprimir') : 'FALTA (no se puede imprimir lo que no existe)'],
    ['📦 Paquete', packed ? 'ok' : 'warn', packed ? 'Hecho el ' + String(o.embalaje.hecho).split('-').reverse().join('/') : 'Sin cerrar'],
    ['🔳 Código del paquete (QR)', statusOf(o, 'paquete').estado === 'Impreso' ? 'ok' : wanted(o).includes('paquete') ? 'warn' : 'ok', statusOf(o, 'paquete').estado === 'Impreso' ? 'Impreso' : wanted(o).includes('paquete') ? 'Sin imprimir' : 'No se usa'],
    ['💌 Tarjeta', statusOf(o, 'gracias').estado === 'Impreso' ? 'ok' : wanted(o).includes('gracias') ? 'warn' : 'ok', statusOf(o, 'gracias').estado === 'Impreso' ? (cardMode() === 'hoja' ? 'Metida en el paquete' : 'Impresa') : wanted(o).includes('gracias') ? (cardMode() === 'hoja' ? 'Sin meter en el paquete' : 'Sin imprimir') : 'No se usa']
  ];
  const carrier = o.envio || (o.etiquetaEnvio && o.etiquetaEnvio.transportista) || '';
  const pend = pendingOf(o).filter(t => !(t === 'gracias' && cardMode() === 'hoja'));
  const cardPend = cardMode() === 'hoja' && wanted(o).includes('gracias') && statusOf(o, 'gracias').estado !== 'Impreso';
  modal('🚚 Preparado para enviar · nº ' + o.numero, h('div.col', h('div.list', items.map(([t, nv, d]) => h('div.item', { style: { cursor: 'default' } }, h('span.grow', h('b', t), h('div.tiny.muted', d)), pill(nv === 'ok' ? '✓' : 'REVISAR', nv)))),
    pend.length || cardPend ? h('p.small', 'Puedes completar lo que falta (sin repetir lo ya impreso) o enviarlo igualmente.') : h('p.small.ok-t', '✓ Todo listo.')),
  close => [btn('Cancelar', close),
    cardPend && can('pedidos.editar') ? btn('💌 Tarjeta metida', async () => { close(); await cardIncluded(o); sendCheck(o, after); }) : null,
    pend.length && can('pedidos.editar') ? btn('🖨️ Imprimir lo que falta (' + pend.length + ')', async () => { close(); await printPending(o); sendCheck(o, after); }) : null,
    btn(carrier ? '🚚 Enviar con ' + carrier : '🚚 Marcar como enviado', async () => { close(); const P = await import('./views/pedidos.js'); P.shipDialog(byId('pedidos', o.id) || o); after && after(); }, { cls: 'primary' })], { size: 'narrow' });
}
