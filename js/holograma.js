// ================= v17.3 · 🔮 VÍDEO HOLOGRAMA =================
// La pieza flotando sobre un proyector de luz, con el nombre del cliente en neón. Sale un vídeo vertical para TikTok, reel o
// WhatsApp. No hay que comprar ni montar nada: se hace en el aparato y se envía.
// (En la 17.2 esto era un holograma «de verdad» con una pirámide de acetato. La dueña lo quitó: muy difícil y con gastos.)
//   · Con la FOTO del producto (se le quita el fondo liso) o con su PIEZA EN 3D si el producto tiene el archivo (gira de verdad).
//   · El vídeo dura 8 s y enlaza el final con el principio: se puede poner en bucle.
// Todo se hace en este aparato: nada se sube a ningún sitio.
import { h, mount, btn, modal, toast, inp, sel } from './ui.js';
import { S, byId } from './store.js';
import { grabarLienzo, formatoVideo } from './simulacion.js';
import { fetchFile, filesOf, extOf, download } from './files.js';

export const LUCES = [['Cian', '#22d3ee'], ['Rosa', '#f472b6'], ['Verde', '#4ade80'], ['Oro', '#fde047'], ['Blanco', '#ffffff'], ['Violeta', '#a78bfa']];
export const DURA = 8; // segundos (todo lo que se mueve da vueltas enteras en este tiempo: el vídeo hace bucle)
const FORMATOS = { vertical: [1080, 1920, 'Vertical · TikTok, reel o historia'], cuadrado: [1080, 1080, 'Cuadrado · WhatsApp'] };
const fotosDe = id => (S.t.archivos || []).filter(a => a.entidad === 'productos' && a.entidadId === id && (a.tipo === 'foto' || /^image\//.test(a.mime || '')));
const modeloDe = id => filesOf('productos', id).find(a => ['stl', '3mf', 'obj'].includes(extOf(a.nombre)));
export const conHolograma = () => (S.t.productos || []).filter(p => !p.eliminado && !p.archivado && (fotosDe(p.id).length || modeloDe(p.id)));
const rgb = hex => { const n = parseInt(String(hex || '#22d3ee').slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

// Quita un fondo LISO (blanco, gris, de color…) empezando por los bordes. Si la foto no tiene fondo liso, se recorta en redondo.
// Devuelve { lienzo, modo: 'fondo' | 'redondo' }
export function recorta(img, lado = 640) {
  const s = Math.min(1, lado / Math.max(img.width, img.height)), W = Math.max(8, Math.round(img.width * s)), H = Math.max(8, Math.round(img.height * s));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
  const D = g.getImageData(0, 0, W, H), d = D.data, n = W * H;
  let r = 0, v = 0, b = 0, c = 0; const borde = i => { r += d[i * 4]; v += d[i * 4 + 1]; b += d[i * 4 + 2]; c++; };
  for (let x = 0; x < W; x++) { borde(x); borde((H - 1) * W + x); } for (let y = 0; y < H; y++) { borde(y * W); borde(y * W + W - 1); }
  r /= c; v /= c; b /= c;
  const lejos = i => Math.abs(d[i * 4] - r) + Math.abs(d[i * 4 + 1] - v) + Math.abs(d[i * 4 + 2] - b);
  let disp = 0; for (let x = 0; x < W; x++) disp += lejos(x) + lejos((H - 1) * W + x); for (let y = 0; y < H; y++) disp += lejos(y * W) + lejos(y * W + W - 1); disp /= c;
  const fuera = new Uint8Array(n), cola = new Int32Array(n); let ini = 0, fin = 0;
  const TOL = 60, entra = i => { if (!fuera[i] && lejos(i) <= TOL) { fuera[i] = 1; cola[fin++] = i; } };
  if (disp < 26) {
    for (let x = 0; x < W; x++) { entra(x); entra((H - 1) * W + x); } for (let y = 0; y < H; y++) { entra(y * W); entra(y * W + W - 1); }
    while (ini < fin) { const i = cola[ini++], x = i % W, y = (i - x) / W; if (x > 0) entra(i - 1); if (x < W - 1) entra(i + 1); if (y > 0) entra(i - W); if (y < H - 1) entra(i + W); }
  }
  const quitado = fin / n;
  if (disp < 26 && quitado > 0.08 && quitado < 0.93) {
    for (let i = 0; i < n; i++) { if (fuera[i]) d[i * 4 + 3] = 0; else { const x = i % W, y = (i - x) / W; if ((x > 0 && fuera[i - 1]) || (x < W - 1 && fuera[i + 1]) || (y > 0 && fuera[i - W]) || (y < H - 1 && fuera[i + W])) d[i * 4 + 3] = 150; } }
    g.putImageData(D, 0, 0); return { lienzo: cv, modo: 'fondo', quitado };
  }
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
  for (let i = 0; i < n; i++) { const x = i % W, y = (i - x) / W, q = Math.hypot(x - cx, y - cy) / R; d[i * 4 + 3] = q < 0.72 ? 255 : q > 1 ? 0 : Math.round(255 * (1 - (q - 0.72) / 0.28)); }
  g.putImageData(D, 0, 0); return { lienzo: cv, modo: 'redondo', quitado: 0 };
}

// La escena: fondo oscuro con rejilla, el proyector (base con ondas + haz de luz), la pieza flotando, chispas y el texto.
// t en segundos · o = { luz, texto, marca, tam (0.6–1.2), giro: 'suave' | 'completo' | 'quieto' }
export function pintaEscena(g, W, H, pieza, t, o = {}) {
  const u = W / 1080, [lr, lv, lb] = rgb(o.luz), luz = 'rgb(' + lr + ',' + lv + ',' + lb + ')', la = a => 'rgba(' + lr + ',' + lv + ',' + lb + ',' + a + ')', w0 = 2 * Math.PI / DURA, cx = W / 2;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.shadowBlur = 0;
  let gr = g.createRadialGradient(cx, H * 0.36, 10, cx, H * 0.36, H * 0.75); gr.addColorStop(0, '#12365e'); gr.addColorStop(0.55, '#071226'); gr.addColorStop(1, '#03060d'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = la(0.07); g.lineWidth = 1; g.beginPath(); for (let x = (W / 2) % (60 * u); x < W; x += 60 * u) { g.moveTo(x, 0); g.lineTo(x, H); } for (let y = 0; y < H; y += 60 * u) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
  const by = H * (H > W ? 0.705 : 0.76), rx = W * 0.3, ry = rx * 0.2, alto = H * (H > W ? 0.5 : 0.6), parpadeo = 0.86 + 0.08 * Math.sin(t * w0 * 9) + 0.06 * Math.sin(t * w0 * 23);
  // el haz
  gr = g.createLinearGradient(0, by, 0, by - alto); gr.addColorStop(0, la(0.36 * parpadeo)); gr.addColorStop(1, la(0)); g.fillStyle = gr;
  g.beginPath(); g.moveTo(cx - rx * 0.62, by); g.lineTo(cx + rx * 0.62, by); g.lineTo(cx + W * 0.43, by - alto); g.lineTo(cx - W * 0.43, by - alto); g.closePath(); g.fill();
  // la base y sus ondas
  gr = g.createRadialGradient(cx, by, 2, cx, by, rx); gr.addColorStop(0, la(0.95)); gr.addColorStop(0.45, la(0.4)); gr.addColorStop(1, la(0)); g.save(); g.translate(cx, by); g.scale(1, ry / rx); g.translate(-cx, -by); g.fillStyle = gr; g.beginPath(); g.arc(cx, by, rx, 0, 7); g.fill();
  for (let k = 0; k < 3; k++) { const f = ((t / DURA * 3 + k / 3) % 1); g.strokeStyle = la(0.85 * (1 - f)); g.lineWidth = 5 * u; g.beginPath(); g.arc(cx, by, rx * (0.45 + 0.75 * f), 0, 7); g.stroke(); }
  g.restore();
  // chispas que suben por el haz
  for (let k = 0; k < 28; k++) { const a = (k * 0.6180339) % 1, b = (k * 0.3819660 + 0.17) % 1, f = (t / DURA * (1 + (k % 3)) + a) % 1, y = by - f * alto * 0.95, ancho = rx * 0.62 + (W * 0.43 - rx * 0.62) * f, x = cx + (b * 2 - 1) * ancho * 0.85; g.fillStyle = la(0.75 * Math.sin(f * Math.PI)); g.beginPath(); g.arc(x, y, (2 + (k % 4)) * u, 0, 7); g.fill(); }
  // la pieza
  const c = W * 0.62 * (o.tam || 1), py = by - alto * 0.52 + Math.sin(t * w0 * 2) * 16 * u;
  if (pieza) {
    const pw = pieza.width, ph = pieza.height, e = c / Math.max(pw, ph), w = pw * e, hh = ph * e;
    const ancho = pieza.gira || o.giro === 'quieto' ? 1 : o.giro === 'completo' ? Math.cos(t * w0) : 0.88 + 0.12 * Math.cos(t * w0 * 2);
    g.save(); g.translate(cx, py); g.scale(Math.abs(ancho) < 0.05 ? 0.05 : ancho, 1); g.globalAlpha = 0.9 + 0.1 * parpadeo;
    if (pieza.gira) { g.globalCompositeOperation = 'lighter'; g.filter = 'blur(' + Math.round(c * 0.03) + 'px)'; g.globalAlpha = 0.8; g.drawImage(pieza, -w / 2, -hh / 2, w, hh); g.filter = 'none'; g.globalAlpha = 1; g.drawImage(pieza, -w / 2, -hh / 2, w, hh); }
    else { g.shadowColor = luz; g.shadowBlur = c * 0.14; g.drawImage(pieza, -w / 2, -hh / 2, w, hh); g.shadowBlur = c * 0.04; g.drawImage(pieza, -w / 2, -hh / 2, w, hh); }
    g.restore();
    // las líneas de la proyección, que bajan despacio
    g.save(); g.globalAlpha = 0.13; g.fillStyle = '#000'; const paso = Math.max(4, Math.round(7 * u)), off = (t / DURA * paso * 12) % paso; for (let y = py - c * 0.56 + off; y < py + c * 0.56; y += paso) g.fillRect(cx - c * 0.56, y, c * 1.12, Math.max(1, 1.5 * u)); g.restore();
    // el barrido de luz
    const sy = py - c * 0.5 + ((t / DURA * 2) % 1) * c; gr = g.createLinearGradient(0, sy - 30 * u, 0, sy + 30 * u); gr.addColorStop(0, la(0)); gr.addColorStop(0.5, la(0.22)); gr.addColorStop(1, la(0)); g.fillStyle = gr; g.fillRect(cx - c * 0.56, sy - 30 * u, c * 1.12, 60 * u);
  }
  // el texto en neón y la marca
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (o.texto) { let px = 92 * u; g.font = '800 ' + px + 'px system-ui, "Segoe UI", sans-serif'; const m = g.measureText(o.texto).width; if (m > W * 0.88) { px *= W * 0.88 / m; g.font = '800 ' + px + 'px system-ui, "Segoe UI", sans-serif'; } const ty = H > W ? H * 0.83 : H * 0.9; g.save(); g.shadowColor = luz; g.shadowBlur = 40 * u; g.fillStyle = luz; g.globalAlpha = 0.9 * parpadeo; g.fillText(o.texto, cx, ty); g.shadowBlur = 14 * u; g.fillStyle = '#fff'; g.globalAlpha = 1; g.fillText(o.texto, cx, ty); g.restore(); }
  if (o.marca && H > W) { g.fillStyle = 'rgba(255,255,255,.78)'; g.font = '600 ' + Math.round(36 * u) + 'px system-ui, sans-serif'; g.fillText(o.marca, cx, H * 0.925); }
}

// La pieza de un producto: su 3D si lo tiene y se pide, o su foto recortada. Devuelve { lienzo, modo, destroy }
export async function piezaDe(prod, modo, luz) {
  const mod = modeloDe(prod.id);
  if (mod && modo !== 'foto') {
    const { parse3D } = await import('./stl.js'), { crearPieza } = await import('./piezaviva.js');
    const pos = await parse3D(await (await fetchFile(mod)).arrayBuffer(), mod.nombre);
    const cv = h('canvas.holo-gl', { width: 640, height: 640, 'aria-hidden': 'true' }); document.body.append(cv);
    const col = rgb(luz).map(x => 0.25 + x / 255 * 0.75);
    const P = crearPieza(cv, pos, { color: col, fondo: [0, 0, 0], sinPlaca: true, conservar: true }); P.setProgreso(1, true); cv.gira = true;
    return { lienzo: cv, modo: '3d', destroy: () => { try { P.destroy(); } catch (e) { } cv.remove(); } };
  }
  const fs = fotosDe(prod.id), f = (prod.fotoId && fs.find(a => a.id === prod.fotoId)) || fs[0];
  if (!f) throw new Error('Este producto no tiene foto ni pieza en 3D.');
  const bm = await createImageBitmap(await fetchFile(f)), R = recorta(bm); try { bm.close(); } catch (e) { }
  return { lienzo: R.lienzo, modo: R.modo, destroy: () => { } };
}

// ---------- la ventana ----------
export function dialogoHolograma(ini = {}) {
  const prods = conHolograma(), o0 = ini.pedido || null, empresa = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || '';
  const p0 = (ini.productoId && prods.find(p => p.id === ini.productoId)) || (o0 && prods.find(p => p.id === o0.productoId || p.nombre === o0.producto)) || prods[0];
  if (!p0) return modal('🔮 Vídeo holograma', h('div.nc-vacio', h('i', '🔮'), h('b', 'Hace falta un producto con foto'), h('p', 'Sube una foto a algún producto (o su archivo 3D) y vuelve: con eso se hace el vídeo.')), close => [btn('Cerrar', close, { cls: 'primary' })]);
  const producto = sel(prods.map(p => ({ v: p.id, t: p.nombre + (modeloDe(p.id) ? ' · 🧊 3D' : '') })), p0.id, { 'aria-label': 'Producto del holograma' });
  const texto = inp({ value: o0 ? 'Para ' + String(o0.cliente || '').trim().split(/\s+/)[0] : '', maxlength: 22, placeholder: 'Para Lucía', 'aria-label': 'Texto del holograma' });
  const modoS = sel([{ v: 'auto', t: 'Lo mejor que haya' }, { v: 'foto', t: 'Con la foto' }], 'auto', { 'aria-label': 'Con qué se hace' }), giro = sel([{ v: 'suave', t: 'Se mece' }, { v: 'completo', t: 'Da vueltas' }, { v: 'quieto', t: 'Quieto' }], 'suave', { 'aria-label': 'Movimiento' });
  const formato = sel(Object.keys(FORMATOS).map(k => ({ v: k, t: FORMATOS[k][2] })), 'vertical', { 'aria-label': 'Formato del vídeo' });
  const tam = h('input', { type: 'range', min: 60, max: 120, value: 100, 'aria-label': 'Tamaño' }), luces = h('div.holo-luces'), cv = h('canvas.holo-prev', { width: 540, height: 960 }), estado = h('div.nc-estado', 'Preparando…'), acc = h('div.row.wrap', { style: { gap: '8px' } });
  let luz = LUCES[0][1], pieza = null, vivo = true, t0 = performance.now(), grabando = false, turno = 0;
  const opciones = () => ({ luz, texto: texto.value.trim(), marca: empresa, tam: Number(tam.value) / 100, giro: giro.value });
  const pintaLuces = () => mount(luces, LUCES.map(([n, c]) => { const b = h('button.holo-luz' + (c === luz ? '.on' : ''), { type: 'button', title: n, 'aria-label': 'Luz ' + n, 'aria-pressed': String(c === luz), onclick: () => { luz = c; pintaLuces(); if (pieza && pieza.modo === '3d') carga(); } }); b.style.background = c; return b; }));
  const pintaAcc = () => mount(acc, btn(grabando ? 'Creando el vídeo…' : '🎬 Crear el vídeo (8 s)', video, { cls: 'primary holo-video', disabled: !pieza || grabando }));
  async function carga() {
    const mio = ++turno, prod = byId('productos', producto.value); estado.textContent = 'Preparando la pieza…';
    try {
      const nueva = await piezaDe(prod, modoS.value, luz); if (mio !== turno || !vivo) { nueva.destroy(); return; }
      if (pieza) pieza.destroy(); pieza = nueva;
      estado.textContent = pieza.modo === '3d' ? '🧊 Pieza en 3D: gira de verdad.' : pieza.modo === 'fondo' ? '📷 Foto con el fondo quitado.' : '📷 Foto recortada en redondo (el fondo no es liso: queda mejor con una foto sobre fondo blanco o negro).';
      window.__holo = { modo: pieza.modo, producto: prod.id };
    } catch (e) { if (mio === turno) { estado.textContent = '❌ ' + (e.message || e); } }
    pintaAcc();
  }
  async function video() {
    if (!pieza || grabando) return; grabando = true; pintaAcc();
    const [W, H] = FORMATOS[formato.value], gv = h('canvas.holo-gl', { width: W, height: H }); document.body.append(gv);
    try {
      estado.textContent = 'Creando el vídeo (8 s)… no cierres esta ventana.';
      const r = await grabarLienzo(gv, DURA, x => pintaEscena(gv.getContext('2d'), W, H, pieza.lienzo, x * DURA, opciones()));
      download(r.blob, 'holograma_' + (window.CL.norm(byId('productos', producto.value).nombre).replace(/\s+/g, '_') || 'pieza') + '.' + r.ext);
      estado.textContent = '✅ Vídeo guardado en Descargas (.' + r.ext + ').' + (r.ext === 'webm' ? ' Ojo: TikTok, WhatsApp e Instagram no aceptan .webm.' : ' Vale para TikTok, WhatsApp e Instagram. Hace bucle: puedes repetirlo.');
      window.__holoVideo = { bytes: r.blob.size, ext: r.ext, formato: formato.value };
    } catch (e) { toast(e.message || 'No se pudo crear el vídeo', 'bad', 8000); estado.textContent = '❌ ' + (e.message || e); }
    gv.remove(); grabando = false; pintaAcc();
  }
  const bucle = now => { if (!vivo || !cv.isConnected) { vivo = false; return; } requestAnimationFrame(bucle); const [W, H] = FORMATOS[formato.value], w = 540, hh = Math.round(540 * H / W); if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; } pintaEscena(cv.getContext('2d'), w, hh, pieza && pieza.lienzo, ((now - t0) / 1000) % DURA, opciones()); };
  producto.onchange = carga; modoS.onchange = carga;
  const m = modal('🔮 Vídeo holograma', h('div.holo-dlg',
    h('div.holo-izq2', cv, estado),
    h('div.holo-der2',
      h('p.small.muted', { style: { margin: 0 } }, 'La pieza flotando en un proyector de luz, con el nombre en neón. Sale un vídeo listo para TikTok, un reel o para mandárselo al cliente. No hay que comprar ni montar nada.'),
      h('label.nc-l', h('span', 'Producto'), producto), h('label.nc-l', h('span', 'Texto en luz'), texto),
      h('div.nc-l', h('span', 'Color de la luz'), luces),
      h('div.holo-fila', h('label.nc-l', h('span', 'Se hace con'), modoS), h('label.nc-l', h('span', 'Movimiento'), giro)),
      h('div.holo-fila', h('label.nc-l', h('span', 'Formato'), formato), h('label.nc-l', h('span', 'Tamaño'), tam)), acc,
      h('p.tiny.muted', formatoVideo() ? 'Todo se hace en este aparato. Nada se sube a ningún sitio.' : 'Este aparato no puede grabar vídeo: hazlo en el PC del taller.'))),
    close => [btn('Cerrar', close)], { size: 'wide', noFocus: true, onclose: () => { vivo = false; turno++; if (pieza) pieza.destroy(); } });
  pintaLuces(); pintaAcc(); requestAnimationFrame(bucle); carga();
  return m;
}
