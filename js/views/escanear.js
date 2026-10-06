// ================= v11.6 · ESCANEAR Y EMPAQUETAR (idea 1) =================
// Escaneas el QR del paquete (con la cámara del móvil o del portátil, o con un lector USB) y sale el pedido:
// cliente, país, dirección (si tienes permiso), producto, cantidad, estado, caja y peso, con lo que falta por imprimir.
// Desde aquí se cierra el paquete y se imprime lo pendiente. No cambia nada solo.
import { h, mount, btn, toast, empty, pill, inp, fdt } from '../ui.js';
import { S, can, api, byId, upsertLocal, emit, on } from '../store.js';
import { go, handleError } from '../app.js';
import * as E from '../envio.js';
import { miniPedido } from '../fotopedido.js';
import { qrSvg } from '../qr.js';
import * as L from '../labels.js';
import { modal } from '../ui.js';

// ---------- v12.2 · QR para la mesa de trabajo ----------
// Se imprime UNA vez (etiqueta 10 × 10 cm o folio) y se pega en la mesa: con la cámara del móvil abre al instante
// «Escanear paquete» (con la cámara ya encendida), «Empaquetar» u «Hoy». Sin dirección pública de la app no hay QR (se dice).
export function mesaDialog() {
  const items = L.MESA.map(a => ({ a, d: L.mesaData(a) }));
  const sinUrl = !items[0].d.qr;
  const body = h('div.col', { style: { gap: '12px' } },
    h('p.small.muted', 'Imprime estos QR y pégalos en tu mesa. Con la cámara normal del móvil se abre la app en esa pantalla (hace falta haber entrado una vez en el móvil).'),
    sinUrl ? h('p.small.warn-t', 'Falta la dirección pública de la app (la de GitHub Pages). Ponla en Configuración → Aplicación y vuelve aquí: sin ella el QR no puede abrir nada.') : null,
    h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '10px' } }, items.map(({ a, d }) => h('div.card.flat', { style: { textAlign: 'center' } },
      d.qr ? h('div', { style: { width: '150px', margin: '0 auto' }, html: qrSvg(d.qr, 4) }) : h('div.muted', 'Sin QR'),
      h('b', a.t), h('div.tiny.muted', a.d),
      d.qr ? btn('Imprimir este', () => L.labelDialog('mesa', [d]), { cls: 'sm', icon: 'printer' }) : null))));
  return modal('📍 QR para mi mesa de trabajo', body, close => [btn('Cerrar', close), sinUrl ? null : btn('Imprimir los 3', () => { close(); L.labelDialog('mesa', items.map(x => x.d)); }, { cls: 'primary', icon: 'printer' })], { size: 'wide' });
}

export function pruebaQrDialog() {
  const code = 'CD-PRUEBA-QR-' + Date.now().toString(36).toUpperCase();
  const body = h('div.col', h('p.small', 'QR de demostración: al escanearlo verás una confirmación verde. No busca ni cambia ningún pedido real.'),
    h('div', { style: { width: '220px', margin: '0 auto' }, html: qrSvg(code, 5) }), h('code', { style: { textAlign: 'center' } }, code),
    btn('🖨️ Imprimir prueba 50 × 50 mm', () => L.labelDialog('paquete', [{ qr: code, codigo: 'PRUEBA', numero: 'PRUEBA', cliente: 'TEST' }]), { cls: 'primary' }));
  return modal('Prueba del lector QR', body, close => [btn('Cerrar', close)], { size: 'narrow' });
}

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
    h('div.card', h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, camBtn, h('span.small.muted', '✍️ o escribe el código a mano:'), code, btn('Buscar', () => lookup(code.value, result, hist), { icon: 'search' }), btn('QR para mi mesa', () => mesaDialog(), { icon: 'printer', cls: 'ghost' }), btn('Probar QR', () => pruebaQrDialog(), { icon: 'qr', cls: 'ghost' })), camMsg, camBox,
      h('p.tiny.muted', 'También funciona escaneando el QR con la cámara normal del móvil: abre esta pantalla directamente.')),
    result, hist);
  setTimeout(() => code.focus(), 50);
  let cur = params[0] ? decodeURIComponent(params[0]) : '';
  if (cur === 'camara') { cur = ''; setTimeout(() => camBtn.click(), 200); } // v12.2: viene del QR de la mesa → abre la cámara solo
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
    // v13.2: si la cámara no admite lo que pedimos (resolución/modo), se reintenta con lo más simple antes de dar error
    const tries = [{ facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, { width: { ideal: 1280 }, height: { ideal: 720 } }, true];
    let last = null;
    for (const v of tries) { try { stream = await navigator.mediaDevices.getUserMedia({ video: v, audio: false }); break; } catch (e) { last = e; if (e.name === 'NotAllowedError' || e.name === 'SecurityError' || e.name === 'NotFoundError' || e.name === 'NotReadableError') break; } }
    if (!stream) throw last || new Error('sin cámara');
    video.srcObject = stream; await video.play().catch(() => { });
    // v12.10: enfoque continuo si la cámara lo ofrece (con el enfoque fijo, un QR pequeño sale borroso)
    try { const tr = stream.getVideoTracks()[0], cap = tr.getCapabilities ? tr.getCapabilities() : {}; if (cap.focusMode && cap.focusMode.includes('continuous')) await tr.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch (e) { }
    box.style.display = ''; b.querySelector('span') ? b.querySelector('span').textContent = 'Cerrar la cámara' : (b.textContent = 'Cerrar la cámara');
    msg.textContent = 'Buscando un QR…';
    const detect = await detector(), c = document.createElement('canvas'); let tick = 0;
    timer = setInterval(async () => {
      if (!video.videoWidth) return;
      // v12.10: se lee a la resolución de la cámara (antes se reducía a 720 px y un QR pequeño dejaba de verse) y, un fotograma de cada dos, ampliando el centro (zoom digital)
      tick++;
      const zoom = tick % 2 === 0, sc = Math.min(1, 1600 / video.videoWidth), vw = video.videoWidth, vh = video.videoHeight;
      const sw = zoom ? vw / 2 : vw, sh = zoom ? vh / 2 : vh, sx = zoom ? vw / 4 : 0, sy = zoom ? vh / 4 : 0;
      c.width = Math.round(sw * sc * (zoom ? 1.6 : 1)); c.height = Math.round(sh * sc * (zoom ? 1.6 : 1));
      c.getContext('2d', { willReadFrequently: true }).drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
      try { const v = await detect(c); if (v) { const k = E.codeFrom(v) || v; if (k !== lastHit.code || Date.now() - lastHit.at > 4000) { lastHit = { code: k, at: Date.now() }; try { navigator.vibrate && navigator.vibrate(60); } catch (e) { } onCode(v); } } } catch (e) { }
    }, 220);
  } catch (e) { msg.textContent = camError(e); stopCam(box, b); }
}
export function camError(e) {
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Sin permiso para la cámara. En Windows: Configuración → Privacidad y seguridad → Cámara → activa «Permitir que las aplicaciones de escritorio accedan a la cámara». En el navegador, permítela en el candado de la barra de direcciones. Mientras tanto puedes escribir el código.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No se encuentra ninguna cámara conectada. Conecta una (o escribe el código / usa un lector USB).';
  if (n === 'NotReadableError' || n === 'AbortError') return 'La cámara está en uso por otro programa (Teams, Zoom, la app Cámara, otra pestaña…). Ciérralo y vuelve a pulsar «Abrir la cámara».';
  return 'No se pudo abrir la cámara (' + (n || 'error') + (e && e.message ? ': ' + e.message : '') + '). Escribe el código mientras tanto.';
}
function stopCam(box, b) {
  clearInterval(timer); timer = null;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (box) box.style.display = 'none';
  if (b) { const s = b.querySelector('span'); if (s) s.textContent = 'Abrir la cámara'; }
}

// «https://…/#/pedidos/o_123/?enviar=1» → «#/pedidos/o_123/?enviar=1» (solo rutas de la propia app; nada de otras webs)
export function appLinkFrom(text) {
  const t = String(text || '').trim(), i = t.indexOf('#/');
  if (i < 0 || !/^(https?:\/\/\S*|#\/.*)$/i.test(t) || /\s/.test(t)) return '';
  const route = t.slice(i + 2);
  if (!/^[a-z]{1,20}(\/|$)/i.test(route)) return '';
  if (/^q\/ceb\//i.test(route)) return '';   // el código del paquete lo resuelve «lookup» sin salir de esta pantalla
  return '#/' + route;
}

// ---------- Buscar el pedido ----------
async function lookup(text, result, hist) {
  text = String(text || '').trim();
  if (!text) return;
  if (/^CD-PRUEBA-QR-[A-Z0-9]+$/i.test(text)) {
    mount(result, h('div.scan-card.scan-ok', h('div.scan-big', '✅'), h('h2', 'QR de prueba leído'), h('p', 'Cámara y lectura correctas. No se ha consultado ni modificado ningún pedido.')));
    flash(result.firstChild, true); return;
  }
  // v13.2: los QR de las etiquetas son ENLACES de la app (envío → #/pedidos/<id>/?enviar=1, producto, almacén, mesa, prueba…).
  // La cámara normal del móvil los abre; la de aquí tenía que entenderlos igual (antes solo entendía el código CEB-… y daba error).
  const link = appLinkFrom(text);
  if (/^#\/q\/mesa\/escanear/i.test(link)) { toast('Ya estás en «Escanear paquete».', 'ok'); return; }
  if (link) { beep(true); stopCam(null, null); location.hash = link; return; }
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
// v13.3: borde de TODA la pantalla: verde = QR leído bien, rojo = no vale (se ve aunque mires la cámara y no el resultado)
function edge(ok) {
  try {
    document.querySelectorAll('.scan-edge').forEach(x => x.remove());
    const d = document.createElement('div'); d.className = 'scan-edge ' + (ok ? 'ok' : 'bad'); d.setAttribute('aria-hidden', 'true');
    document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
  } catch (e) { }
}
function beep(ok) {
  edge(ok);
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
  const dir = (o.direccionEnvio && o.direccionEnvio !== '•••' && o.direccionEnvio) || (cli && cli.direccion && cli.direccion !== '•••' && cli.direccion) || (xc && xc.direccion) || ''; // v13.7: primero la dirección de envío del pedido
  const hidden = !can('clientes.datos');
  const st = (cfg().pedidos.estados || []).find(x => x.k === o.estado) || {};
  const edit = can('pedidos.editar');
  const redraw = () => showOrder(byId('pedidos', o.id), extra, el, false);
  const when = t.enviado ? (o.fechaEnvio ? 'Enviado el ' + o.fechaEnvio.split('-').reverse().join('/') : 'Enviado') : t.limite ? t.limite.split('-').reverse().join('/') + ' · ' + t.texto.toLowerCase() : 'sin fecha';
  // v13.8.1: pedido CANCELADO → pantalla en ROJO, vibración larga y sonido de error. No se puede empaquetar ni enviar.
  if (ph === 'cancelado') {
    const cc = h('div.scan-card.scan-cancelado',
      h('div.scan-big', '⛔'), h('h2.scan-cancel-t', 'CANCELADO'), h('div.fp-scan', miniPedido(o, 110)),
      h('p', h('b', 'Nº ' + o.numero), ' · ' + (o.cliente || '') + ' · ' + (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + (o.producto || '')),
      h('p', 'Este pedido está cancelado. No lo empaquetes ni lo envíes.'),
      o.incidencia ? h('p.small', '⚠️ ' + o.incidencia) : null,
      h('div.row.wrap', { style: { gap: '8px', justifyContent: 'center' } }, btn('Abrir el pedido', () => go('pedidos/' + o.id))));
    mount(el, cc);
    if (fresh) { flash(cc, false); try { navigator.vibrate && navigator.vibrate([400, 150, 400, 150, 400]); } catch (e) { } }
    return;
  }
  const row = (ic, label, v, cls) => h('div.scan-row' + (cls ? '.' + cls : ''), h('span.scan-ic', ic), h('div.grow', h('div.scan-l', label), h('div.scan-v', v)));
  const lbl = E.hasLabelEnvio(o); // v13.8: en un envío conjunto vale la etiqueta de cualquier pedido del paquete
  const card = h('div.scan-card',
    h('div.scan-head', h('b', 'Nº ' + o.numero), o.codigo ? h('code', o.codigo) : null, h('span.grow'), pill(o.estado, '', st.c)),
    row('👤', 'Cliente', o.cliente || '—'),
    row('📍', 'Dirección', hidden ? '🔒 sin permiso para verla' : dir || h('span.warn-t', 'no está guardada')),
    h('div.fp-scan', miniPedido(o, 150, 'grande')), // v13.10: la foto de lo que pidió, para comprobar que metes lo correcto
    row('📦', 'Producto', (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + o.producto),
    row('🎨', 'Color', o.color || h('span.muted', 'sin indicar')),
    row('📅', 'Cuándo se envía', when, t.nivel === 'late' ? 'late' : t.nivel === 'today' ? 'today' : ''),
    row('🚚', 'Empresa de envío', o.envio || h('span.muted', 'sin indicar')),
    row('🛒', 'Plataforma', o.canal || h('span.muted', 'sin indicar')),
    o.personalizacion ? row('✏️', 'Personalización', o.personalizacion) : null,
    o.incidencia ? row('⚠️', 'Incidencia', o.incidencia, 'late') : null,
    h('div.scan-lbl' + (lbl ? '.ok' : '.warn'), lbl ? '🟢 ETIQUETA ADJUNTADA' : '🟠 FALTA ETIQUETA DE ENVÍO', !lbl && edit ? h('button.btn.sm', { style: { marginLeft: '10px' }, onclick: () => E.attachDialog(E.labelOwner(o), redraw) }, 'Adjuntar') : null),
    E.conjuntoBlock(o, redraw));
  const photo = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' }, onchange: async () => {
    const f = photo.files[0]; photo.value = ''; if (!f) return;
    try { const F = await import('../files.js'); await F.uploadFile(f, { entidad: 'pedidos', entidadId: o.id }); toast('📷 Foto guardada en el pedido nº ' + o.numero, 'ok'); } catch (e) { handleError(e); }
  } });
  const P = () => import('./pedidos.js');
  const wasOpen = !!(el.querySelector('details.scan-more') || {}).open;
  mount(el, card,
    edit ? h('div.scan-actions',
      // v13.8: con el QR interno (desde Postprocesado) «📦 Envío empaquetado» pide la PRUEBA DE EMPAQUETADO y pasa a «Listo para envío»
      ph === 'empaquetar' || ph === 'postpro' ? btn('📦 Envío empaquetado', async () => { const EM = await import('./embalaje.js'); if (await EM.closePack(o)) redraw(); }, { cls: 'primary' })
        : ph === 'listo' ? btn('🚚 Enviar pedido', () => E.sendCheck(o, redraw), { cls: 'primary' }) : null,
      ['reserva', 'confirmado', 'impresion', 'postpro'].includes(ph) ? btn('📦 Pasar a «' + (CL.stateOfPhase(cfg().pedidos, 'empaquetar') || 'Empaquetar') + '»', async () => { await (await P()).changeState(o, CL.stateOfPhase(cfg().pedidos, 'empaquetar')); redraw(); }, { cls: ph === 'postpro' ? '' : 'primary' }) : null,
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
