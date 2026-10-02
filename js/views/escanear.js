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
    catch (e) { mount(result, empty('alert', e.code === 'NOT_FOUND' ? 'No encontrado' : 'No se pudo buscar', e.message)); return; }
  }
  if (!o) { mount(result, empty('alert', 'No encontrado', code ? 'No hay ningún pedido con el código ' + code + '.' : 'Escribe el código CEB-AAAA-NNNNNN (o el nº de pedido).')); return; }
  recent.unshift({ id: o.id, at: new Date().toISOString() }); recent.splice(8);
  showOrder(o, extra, result, true);
  drawHist(hist);
  if (history.replaceState && o.codigo) history.replaceState(null, '', '#/escanear/' + o.codigo);
}
function drawHist(el) {
  const list = recent.filter((x, i, a) => a.findIndex(y => y.id === x.id) === i).slice(1);
  mount(el, list.length ? h('div', { style: { marginTop: '14px' } }, h('h3', 'Escaneados antes'), h('div.list', list.map(x => { const o = byId('pedidos', x.id); return o ? h('div.item', { onclick: () => go('escanear/' + (o.codigo || o.numero)) }, h('b', 'Nº ' + o.numero), h('span.grow.small', o.cliente + ' · ' + o.producto), h('span.tiny.muted', fdt(x.at))) : null; }))) : null);
}

function showOrder(o, extra, el, fresh) {
  if (!o) { mount(el, empty('alert', 'Este pedido ya no existe', '')); delete el.dataset.id; return; }
  el.dataset.id = o.id;
  const D = { materiales: S.t.materiales || [], embalajes: S.t.embalajes || [], recetas: S.t.recetas || [], productos: S.t.productos || [], calculadora: S.t.calculadora || [], gastos: S.t.gastos || [] };
  const c = CL.orderCosts(o, D, cfg()), ph = CL.phaseOf(cfg().pedidos, o.estado);
  const cli = o.clienteId ? byId('clientes', o.clienteId) : null, xc = extra && extra.cliente;
  const pais = (cli && cli.pais && cli.pais !== '•••' && cli.pais) || (xc && xc.pais) || '';
  const dir = (cli && cli.direccion && cli.direccion !== '•••' && cli.direccion) || (xc && xc.direccion) || '';
  const hidden = !can('clientes.datos');
  const caja = (o.embalaje && o.embalaje.snap && o.embalaje.snap.caja) || c.embalaje.caja || (extra && extra.caja) || '';
  const peso = c.pesos.total !== null ? c.pesos.total : (extra && extra.peso);
  const fact = (l, v) => h('div.fact', h('div.l', l), h('div.v', v));
  const miss = t => h('span.warn-t', t);
  const st = (cfg().pedidos.estados || []).find(s => s.k === o.estado) || {};
  const edit = can('pedidos.editar');
  const redraw = () => showOrder(byId('pedidos', o.id), extra, el, false);
  mount(el,
    h('div.card', { style: { borderColor: ph === 'empaquetar' ? 'var(--brand)' : undefined } },
      h('div.row.wrap', h('h2.grow', 'Pedido nº ' + o.numero), o.codigo ? h('code', o.codigo) : null, pill(o.estado, '', st.c)),
      h('div.facts', fact('Cliente', o.cliente || miss('sin nombre')), fact('País', pais || miss('sin indicar')),
        fact('Dirección', hidden ? h('span.muted', '🔒 sin permiso para verla') : dir || miss('no está guardada')),
        fact('Producto', o.producto), fact('Cantidad', String(o.cantidad || 1)),
        fact('Caja', caja || miss('sin elegir')), fact('Peso del paquete', peso !== null && peso !== undefined && peso !== '' ? Math.round(peso).toLocaleString('es-ES') + ' g' : miss('PENDIENTE')),
        o.envio ? fact('Envío', o.envio + (o.seguimiento ? ' · ' + o.seguimiento : '')) : null),
      o.personalizacion ? h('p.small', '✏️ Personalización: ', h('b', o.personalizacion)) : null,
      o.incidencia ? h('p.small.bad-t', '⚠️ ' + o.incidencia) : null),
    E.printBlock(o, { redraw }),
    h('div.row.wrap', { style: { gap: '8px' } },
      edit && ['reserva', 'confirmado', 'impresion', 'postpro'].includes(ph) ? btn('Pasar a «' + (CL.stateOfPhase(cfg().pedidos, 'empaquetar') || 'Empaquetar') + '»', async () => { const P = await import('./pedidos.js'); await P.changeState(o, CL.stateOfPhase(cfg().pedidos, 'empaquetar')); redraw(); }, { icon: 'box' }) : null,
      edit && ph === 'empaquetar' ? btn('✅ Paquete hecho', async () => { const EM = await import('./embalaje.js'); if (await EM.closePack(o)) redraw(); }, { cls: 'primary' }) : null,
      btn('📦 Abrir el embalaje', () => import('./embalaje.js').then(EM => EM.packPanel(o.id))),
      btn('Abrir el pedido', () => go('pedidos/' + o.id), { cls: 'ghost' })));
  // opcional (Embalaje → Tarjeta y mensajes): al escanear un pedido en «Empaquetar» se imprime lo que falta
  if (fresh && edit && ph === 'empaquetar' && (cfg().envio || {}).autoAlEscanear && E.pendingOf(o).length) E.printPending(o).then(redraw).catch(e => handleError(e));
}
