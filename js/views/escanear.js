// ================= v11.6 · ESCANEAR Y EMPAQUETAR (idea 1) =================
// Escaneas el QR del paquete (con la cámara del móvil o del portátil, o con un lector USB) y sale el pedido:
// cliente, país, dirección (si tienes permiso), producto, cantidad, estado, caja y peso, con lo que falta por imprimir.
// Desde aquí se cierra el paquete y se imprime lo pendiente. No cambia nada solo.
import { h, mount, btn, toast, empty, pill, inp, fdt } from '../ui.js';
import { S, can, api, byId, upsertLocal, emit, on } from '../store.js';
import { go, handleError } from '../app.js';
import * as E from '../envio.js';

const CL = window.CL;
const cfg = () => S.cfg || {};
let stream = null, timer = null, lastHit = { code: '', at: 0 };
const recent = [];

export function render(el, params) {
  const head = h('div.page-head', h('div', h('h1', '📷 Escanear paquete'), h('div.muted.small', 'Apunta al QR del paquete (o escribe el código CEB-…). Se abre el pedido con todo lo necesario para empaquetarlo.')));
  const video = h('video.scan-video', { playsinline: true, muted: true, autoplay: true });
  const camBox = h('div.scan-cam', { style: { display: 'none' } }, video, h('div.scan-frame'));
  const camMsg = h('p.small.muted');
  const code = inp({ placeholder: 'CEB-2026-000123 · o nº de pedido · o pasa el lector', autocomplete: 'off', 'aria-label': 'Código del paquete', style: { minWidth: '260px' } });
  const result = h('div', { style: { marginTop: '14px' } }), hist = h('div');
  const camBtn = btn('Abrir la cámara', () => (stream ? stopCam(camBox, camBtn) : startCam(video, camBox, camMsg, camBtn, c => lookup(c, result, hist))), { cls: 'primary', icon: 'camera' });
  code.onkeydown = e => { if (e.key === 'Enter') { lookup(code.value, result, hist); code.select(); } };
  el.append(head,
    h('div.card', h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, camBtn, code, btn('Buscar', () => lookup(code.value, result, hist), { icon: 'search' })), camMsg, camBox,
      h('p.tiny.muted', 'También funciona escaneando el QR con la cámara normal del móvil: abre esta pantalla directamente.')),
    result, hist);
  setTimeout(() => code.focus(), 50);
  let cur = params[0] ? decodeURIComponent(params[0]) : '';
  if (cur) lookup(cur, result, hist);
  const off = on(() => { if (result.dataset.id) showOrder(byId('pedidos', result.dataset.id), null, result, false); });
  return {
    params: p => { if (p && p[0] && decodeURIComponent(p[0]) !== cur) { cur = decodeURIComponent(p[0]); lookup(cur, result, hist); } },
    destroy: () => { off && off(); stopCam(camBox, camBtn); }
  };
}

// ---------- Cámara: BarcodeDetector si el navegador lo trae; si no, jsQR (incluido, sin Internet) ----------
async function detector() {
  if ('BarcodeDetector' in window) { try { const f = await window.BarcodeDetector.getSupportedFormats(); if (f.includes('qr_code')) { const d = new window.BarcodeDetector({ formats: ['qr_code'] }); return async c => { const r = await d.detect(c); return r[0] ? r[0].rawValue : ''; }; } } catch (e) { } }
  if (!window.jsQR) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = new URL('../../vendor/jsqr/jsQR.js', import.meta.url).href; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar el lector de QR')); document.head.appendChild(s); });
  return async c => { const g = c.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, c.width, c.height); const r = window.jsQR(d.data, c.width, c.height, { inversionAttempts: 'attemptBoth' }); return r ? r.data : ''; };
}
async function startCam(video, box, msg, b, onCode) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = 'Este navegador no deja usar la cámara. Escribe el código o usa la cámara del móvil.'; return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
    video.srcObject = stream; await video.play().catch(() => { });
    box.style.display = ''; b.querySelector('span') ? b.querySelector('span').textContent = 'Cerrar la cámara' : (b.textContent = 'Cerrar la cámara');
    msg.textContent = 'Buscando un QR…';
    const detect = await detector(), c = document.createElement('canvas');
    timer = setInterval(async () => {
      if (!video.videoWidth) return;
      const sc = Math.min(1, 720 / video.videoWidth); c.width = Math.round(video.videoWidth * sc); c.height = Math.round(video.videoHeight * sc);
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      try { const v = await detect(c); if (v) { const k = E.codeFrom(v) || v; if (k !== lastHit.code || Date.now() - lastHit.at > 4000) { lastHit = { code: k, at: Date.now() }; try { navigator.vibrate && navigator.vibrate(60); } catch (e) { } onCode(v); } } } catch (e) { }
    }, 300);
  } catch (e) { msg.textContent = e.name === 'NotAllowedError' ? 'Sin permiso para la cámara. Permítelo en el navegador o escribe el código.' : 'No se pudo abrir la cámara: ' + e.message; stopCam(box, b); }
}
function stopCam(box, b) {
  clearInterval(timer); timer = null;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (box) box.style.display = 'none';
  if (b) { const s = b.querySelector('span'); if (s) s.textContent = 'Abrir la cámara'; }
}

// ---------- Buscar el pedido ----------
async function lookup(text, result, hist) {
  text = String(text || '').trim();
  if (!text) return;
  const code = E.codeFrom(text);
  let o = code ? E.findByCode(code) : (S.t.pedidos || []).find(x => String(x.numero) === text.replace(/^n[ºo]?\s*/i, ''));
  let extra = null;
  if (!o && code) {
    try { extra = await api('pedidos.escanear', { codigo: code }); o = extra.pedido; upsertLocal('pedidos', o); emit(); }
    catch (e) { scanFail(result, e.code === 'NOT_FOUND' ? 'No encontrado' : 'No se pudo buscar', e.message); return; }
  }
  if (!o) { scanFail(result, code ? 'QR no encontrado' : 'Código no válido', code ? 'No hay ningún pedido con el código ' + code + '.' : 'Esto no es un código de paquete (CEB-AAAA-NNNNNN) ni un nº de pedido.'); return; }
  recent.unshift({ id: o.id, at: new Date().toISOString() }); recent.splice(8);
  showOrder(o, extra, result, true);
  drawHist(hist);
  if (history.replaceState && o.codigo) history.replaceState(null, '', '#/escanear/' + o.codigo);
}
function drawHist(el) {
  const list = recent.filter((x, i, a) => a.findIndex(y => y.id === x.id) === i).slice(1);
  mount(el, list.length ? h('div', { style: { marginTop: '14px' } }, h('h3', 'Escaneados antes'), h('div.list', list.map(x => { const o = byId('pedidos', x.id); return o ? h('div.item', { onclick: () => go('escanear/' + (o.codigo || o.numero)) }, h('b', 'Nº ' + o.numero), h('span.grow.small', o.cliente + ' · ' + o.producto), h('span.tiny.muted', fdt(x.at))) : null; }))) : null);
}

// ---------- Confirmación inmediata: borde verde + pitido corto (bien) · borde rojo + doble tono grave (mal) ----------
let actx = null;
function beep(ok) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const tones = ok ? [[1046, 0, 0.09], [1568, 0.1, 0.12]] : [[220, 0, 0.18], [196, 0.22, 0.22]];
    tones.forEach(([f, t0, d]) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = ok ? 'sine' : 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, actx.currentTime + t0); g.gain.exponentialRampToValueAtTime(ok ? 0.25 : 0.12, actx.currentTime + t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t0 + d); o.connect(g).connect(actx.destination); o.start(actx.currentTime + t0); o.stop(actx.currentTime + t0 + d + 0.02); });
  } catch (e) { }
  try { navigator.vibrate && navigator.vibrate(ok ? 60 : [80, 60, 80]); } catch (e) { }
}
function flash(el, ok) { el.classList.remove('scan-ok', 'scan-bad'); void el.offsetWidth; el.classList.add(ok ? 'scan-ok' : 'scan-bad'); beep(ok); }
export function scanFail(el, title, text) { mount(el, h('div.scan-card.scan-bad', h('div.scan-big', '❌'), h('h2', title), h('p.muted', text))); delete el.dataset.id; beep(false); }

// ---------- La ficha: SOLO lo que hace falta para preparar el paquete. Se puede escanear las veces que haga falta. ----------
function showOrder(o, extra, el, fresh) {
  if (!o) { scanFail(el, 'Este pedido ya no existe', ''); return; }
  el.dataset.id = o.id;
  const ph = CL.phaseOf(cfg().pedidos, o.estado), t = CL.orderTiming(o, cfg().pedidos, S.hoy);
  const cli = o.clienteId ? byId('clientes', o.clienteId) : null, xc = extra && extra.cliente;
  const dir = (cli && cli.direccion && cli.direccion !== '•••' && cli.direccion) || (xc && xc.direccion) || '';
  const hidden = !can('clientes.datos');
  const st = (cfg().pedidos.estados || []).find(x => x.k === o.estado) || {};
  const edit = can('pedidos.editar');
  const redraw = () => showOrder(byId('pedidos', o.id), extra, el, false);
  const when = t.enviado ? (o.fechaEnvio ? 'Enviado el ' + o.fechaEnvio.split('-').reverse().join('/') : 'Enviado') : t.limite ? t.limite.split('-').reverse().join('/') + ' · ' + t.texto.toLowerCase() : 'sin fecha';
  const row = (ic, label, v, cls) => h('div.scan-row' + (cls ? '.' + cls : ''), h('span.scan-ic', ic), h('div.grow', h('div.scan-l', label), h('div.scan-v', v)));
  const lbl = o.etiquetaEnvio && o.etiquetaEnvio.archivoId;
  const card = h('div.scan-card',
    h('div.scan-head', h('b', 'Nº ' + o.numero), o.codigo ? h('code', o.codigo) : null, h('span.grow'), pill(o.estado, '', st.c)),
    row('👤', 'Cliente', o.cliente || '—'),
    row('📍', 'Dirección', hidden ? '🔒 sin permiso para verla' : dir || h('span.warn-t', 'no está guardada')),
    row('📦', 'Producto', (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + o.producto),
    row('🎨', 'Color', o.color || h('span.muted', 'sin indicar')),
    row('📅', 'Cuándo se envía', when, t.nivel === 'late' ? 'late' : t.nivel === 'today' ? 'today' : ''),
    row('🚚', 'Empresa de envío', o.envio || h('span.muted', 'sin indicar')),
    row('🛒', 'Plataforma', o.canal || h('span.muted', 'sin indicar')),
    o.personalizacion ? row('✏️', 'Personalización', o.personalizacion) : null,
    o.incidencia ? row('⚠️', 'Incidencia', o.incidencia, 'late') : null,
    h('div.scan-lbl' + (lbl ? '.ok' : '.warn'), lbl ? '🟢 ETIQUETA ADJUNTADA' : '🟠 FALTA ETIQUETA DE ENVÍO', !lbl && edit ? h('button.btn.sm', { style: { marginLeft: '10px' }, onclick: () => E.attachDialog(o, redraw) }, 'Adjuntar') : null));
  const photo = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' }, onchange: async () => {
    const f = photo.files[0]; photo.value = ''; if (!f) return;
    try { const F = await import('../files.js'); await F.uploadFile(f, { entidad: 'pedidos', entidadId: o.id }); toast('📷 Foto guardada en el pedido nº ' + o.numero, 'ok'); } catch (e) { handleError(e); }
  } });
  const P = () => import('./pedidos.js');
  const wasOpen = !!(el.querySelector('details.scan-more') || {}).open;
  mount(el, card,
    edit ? h('div.scan-actions',
      ph === 'empaquetar' ? btn('✅ Marcar preparado', async () => { const EM = await import('./embalaje.js'); if (await EM.closePack(o)) redraw(); }, { cls: 'primary' })
        : ph === 'listo' ? btn('🚚 ' + (o.envio ? 'Enviar con ' + o.envio : 'Preparado para enviar'), () => E.sendCheck(o, redraw), { cls: 'primary' })
        : ['reserva', 'confirmado', 'impresion', 'postpro'].includes(ph) ? btn('📦 Pasar a «' + (CL.stateOfPhase(cfg().pedidos, 'empaquetar') || 'Empaquetar') + '»', async () => { await (await P()).changeState(o, CL.stateOfPhase(cfg().pedidos, 'empaquetar')); redraw(); }, { cls: 'primary' }) : null,
      btn('🔄 Cambiar estado', async () => (await P()).stateDialog(o)),
      can('archivos.subir') ? btn('📷 Hacer foto', () => photo.click()) : null,
      !o.incidencia ? btn('⚠️ Incidencia', async () => (await P()).issueDialog(o)) : null, photo) : null,
    h('details.scan-more', { open: wasOpen }, h('summary', 'Etiquetas, impresión y más'),
      E.printBlock(o, { redraw }),
      h('div.row.wrap', { style: { gap: '8px' } }, btn('📦 Abrir el embalaje', () => import('./embalaje.js').then(EM => EM.packPanel(o.id))), btn('Abrir el pedido', () => go('pedidos/' + o.id), { cls: 'ghost' }))));
  if (fresh) flash(card, true);
  // opcional (Embalaje → Tarjeta y mensajes): al escanear un pedido en «Empaquetar» se imprime lo que falta
  if (fresh && edit && ph === 'empaquetar' && (cfg().envio || {}).autoAlEscanear && E.pendingOf(o).length) E.printPending(o).then(redraw).catch(e => handleError(e));
}
