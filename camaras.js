// ================= v11.7 · Cámaras de las Bambu Lab (P1P, P1S, A1, A1 mini) =================
// La imagen viene de la cámara que ya lleva cada impresora, por la red local, a través del programa del PC.
// No se instala nada. Solo se conecta mientras la estás mirando. El código de acceso nunca llega a la app.
// En el móvil no hay cámaras (están en la red del taller): no se enseña nada vacío.
import { h, mount, btn, modal, toast, pill } from './ui.js';
import { S, byId } from './store.js';
import { desktop } from './desktop.js';
import { BAMBU } from './bambu.js';
import { BAMBU_PILL, bambuLine } from './views/centro_impresion.js';

const COMPAT = s => /^(01S|01P|030|039)/.test(String(s || ''));
export const camList = () => (desktop.on ? BAMBU.list : []);
export const camsAvailable = () => camList().length > 0;
const hhmm = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };
const MSG = { conectando: 'Conectando con la cámara…', apagada: 'Conectando con la cámara…', sin_imagen: 'Esperando imagen…' };

// v13.1 · estado de todas las cámaras (una sola consulta pequeña compartida: tiempos, imágenes/s, errores)
let estCache = null, estAt = 0, estP = null;
async function estadoCams() {
  if (estCache && Date.now() - estAt < 1200) return estCache;
  if (!estP) estP = desktop.camaras().then(r => { estCache = (r && r.camaras) || []; estAt = Date.now(); return estCache; }).catch(() => estCache || []).finally(() => { estP = null; });
  return estP;
}
const sg = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';

// Una cámara en DIRECTO: el programa del PC manda cada imagen en cuanto llega de la impresora (el <img> abre una conexión y ya está:
// nadie «pregunta» cada X ms). Se conecta al montarse y se corta sola al dejar de verse. Los tiempos reales salen a la vista.
export function camTile(b, opts = {}) {
  const big = !!opts.big;
  const img = h('img.cam-img', { alt: 'Cámara de ' + (b.nombre || b.modelo), style: { display: 'none' }, draggable: false });
  const msg = h('div.cam-msg', COMPAT(b.serial) ? MSG.conectando : 'Esta impresora usa otro tipo de vídeo (RTSPS) que aún no está incluido.');
  const live = h('span.cam-live', { style: { display: 'none' } }, '● EN DIRECTO');
  const view = h('div.cam-view' + (big ? '.big' : ''), { title: big ? '' : 'Ampliar', onclick: () => !big && openCam(b.serial) }, img, msg, live);
  const foot = h('div.cam-foot'), meta = h('div.cam-meta.tiny.muted');
  const el = h('div.cam-tile' + (big ? '.big' : ''), view, foot, meta);
  let alive = true, streaming = false, retry = 0, hasFrame = false;
  const drawFoot = () => {
    const x = BAMBU.list.find(z => z.serial === b.serial) || b;
    const busy = ['imprimiendo', 'pausada', 'preparando'].includes(x.estado);
    mount(foot, h('div.row', { style: { gap: '6px', alignItems: 'center' } }, h('b.small.grow.ellipsis', '📷 ' + (x.nombre || x.modelo)), pill(x.estadoTexto || x.estado || '—', BAMBU_PILL[x.estado] || '')),
      busy ? h('div.tiny.muted.ellipsis', (x.trabajo ? x.trabajo + ' · ' : '') + x.pct + ' %' + (x.fin ? ' · termina a las ' + hhmm(x.fin) : '')) : x.errorTexto ? h('div.tiny.bad-t', '⚠️ ' + x.errorTexto) : null);
  };
  drawFoot();
  const start = () => {
    if (streaming || !alive || !COMPAT(b.serial) || !desktop.on) return;
    streaming = true; img.src = desktop.camaraStream(b.serial);
  };
  const stop = () => { if (!streaming) return; streaming = false; hasFrame = false; img.removeAttribute('src'); img.style.display = 'none'; live.style.display = 'none'; };
  img.onload = () => { hasFrame = true; retry = 0; img.style.display = ''; msg.style.display = 'none'; };
  img.onerror = () => { if (!streaming || !alive) return; streaming = false; hasFrame = false; img.style.display = 'none'; clearTimeout(retry); retry = setTimeout(start, 1500); }; // el programa se reinició o se cortó: se reabre solo
  const tick = async () => {
    if (!alive) return;
    if (!el.isConnected) { if (++tick.miss > 3) { alive = false; stop(); return; } }
    else tick.miss = 0;
    if (el.isConnected && !document.hidden && COMPAT(b.serial)) {
      start();
      const c = (await estadoCams()).find(z => z.serial === b.serial);
      if (c) {
        const fresh = c.edadSeg >= 0 && c.edadSeg < 6;
        live.style.display = hasFrame && fresh ? '' : 'none';
        if (c.estado === 'error') { img.style.display = 'none'; msg.textContent = c.problema || 'Sin imagen'; msg.style.display = ''; msg.classList.add('bad'); }
        else if (!hasFrame) { msg.textContent = c.problema || MSG[c.estado] || 'Conectando con la cámara…'; msg.style.display = ''; msg.classList.remove('bad'); }
        else msg.classList.remove('bad');
        mount(meta, c.estado === 'en_directo' ? '⏱ ' + (c.fps ? String(c.fps.toFixed(1)).replace('.', ',') + ' imágenes/s · ' : '') + 'conexión ' + sg(c.conexionMs) + ' · 1.ª imagen ' + sg(c.primeraImagenMs) : '');
      }
      drawFoot();
    } else if (document.hidden) stop(); // pestaña oculta: se corta (la impresora no trabaja de más)
    setTimeout(tick, 1500);
  };
  tick.miss = 0;
  if (COMPAT(b.serial)) { start(); setTimeout(tick, 400); } else msg.classList.add('bad');
  // foto de lo que se ve ahora mismo (asíncrona: se copia el fotograma actual)
  el.photo = () => new Promise(res => {
    if (!hasFrame || !img.naturalWidth) return res(null);
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    try { cv.getContext('2d').drawImage(img, 0, 0); cv.toBlob(bl => res(bl), 'image/jpeg', 0.92); } catch (e) { res(null); }
  });
  el.stop = () => { alive = false; clearTimeout(retry); stop(); };
  el.alive = () => alive;
  return el;
}

// Cámara en grande: vista en directo, estado, foto y pantalla completa
export function openCam(serial) {
  const b = BAMBU.list.find(z => z.serial === serial);
  if (!b) return;
  const tile = camTile(b, { big: true }), st = h('div');
  const upd = () => { const x = BAMBU.list.find(z => z.serial === serial) || b; mount(st, bambuLine(x)); };
  upd();
  const job = () => { const x = BAMBU.list.find(z => z.serial === serial) || b; return (S.t.trabajos || []).find(j => j.impresoraId && j.impresoraId === x.impresoraId && (j.estado === 'Imprimiendo' || j.estado === 'En cola')); };
  const name = () => 'camara_' + String(b.nombre || b.modelo).replace(/[^\w-]+/g, '_') + '_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.jpg';
  const save = async () => { const p = await tile.photo(); if (!p) return toast('Todavía no hay imagen', 'warn'); const u = URL.createObjectURL(p); const a = h('a', { href: u, download: name() }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 20000); };
  const toOrder = async () => {
    const p = await tile.photo(), j = job(), o = j && j.pedidoId ? byId('pedidos', j.pedidoId) : null;
    if (!p || !o) return;
    try { const F = await import('./files.js'); await F.uploadFile(new File([p], name(), { type: 'image/jpeg' }), { entidad: 'pedidos', entidadId: o.id, original: true }); toast('📸 Foto guardada en el pedido nº ' + o.numero, 'ok'); } catch (e) { toast(e.message, 'bad'); }
  };
  const j0 = job(), o0 = j0 && j0.pedidoId ? byId('pedidos', j0.pedidoId) : null;
  const iv = setInterval(upd, 5000);
  modal('📷 ' + (b.nombre || b.modelo), h('div.col', tile, st, h('p.tiny.muted', 'Conexión directa con la cámara de la impresora: cada imagen se ve en cuanto la manda (las P1P y A1 mandan pocas por segundo, no es vídeo fluido). Debajo, los tiempos reales. Solo se conecta mientras la miras.')),
    close => [btn('Pantalla completa', () => { const v = tile.querySelector('.cam-view'); (v.requestFullscreen ? v.requestFullscreen() : Promise.reject(new Error('No disponible'))).catch(e => toast(e.message, 'warn')); }, { cls: 'ghost' }),
      btn('📸 Guardar foto', save),
      o0 ? btn('📎 Foto al pedido nº ' + o0.numero, toOrder) : null,
      btn('Cerrar', close, { cls: 'primary' })],
    { size: 'wide', onclose: () => { clearInterval(iv); tile.stop(); } });
}

// Tarjeta para la pantalla principal (se reutiliza entre redibujos para que la imagen no parpadee)
let homeCard = null, homeSig = '';
export function homeCameras() {
  const list = camList();
  if (!list.length) return null;
  const sig = list.map(b => b.serial).join(',');
  if (homeCard && homeSig === sig && [...homeCard.querySelectorAll('.cam-tile')].every(t => t.alive && t.alive())) return homeCard;
  homeSig = sig;
  homeCard = h('section.card.cams-home', h('div.card-h', h('h3', '📷 Cámaras de las impresoras'), h('button.btn.ghost.sm', { onclick: () => { location.hash = '#/camaras'; } }, 'Ver en grande')),
    h('div.cam-grid', list.map(b => camTile(b))));
  return homeCard;
}
