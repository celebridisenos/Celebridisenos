// ================= v13.10 · 📸 ESTUDIO DE FOTOS → v13.12 · BIOUVISION =================
// v13.12: se llama Biouvision y suma retoque de cara (perfiles de belleza), filtros (de serie, de tu carpeta RECURSOS o
// cargados: LUT .cube y presets .xmp de Lightroom) y un banco de fondos para el recorte.
// Editor sencillo para dejar perfectas las fotos de producto: «✨ Mejorar» automático (balance de blancos, luz, contraste suave,
// color y nitidez), luz, contraste, color, calidez, sombras, luces, nitidez y viñeta; girar, voltear y encuadre (1:1, 4:5, 16:9…).
// Se trabaja con una vista previa rápida, pero el resultado se calcula SIEMPRE a la resolución ORIGINAL de la foto
// (PNG sin pérdida o JPG al 97 %). Todo ocurre en este aparato: la foto no sale a ningún servicio externo.
import { h, mount, btn, toast, sel, modal } from '../ui.js';
import { S, can, byId } from '../store.js';
import { transformed } from '../fotoeditor.js';
import { desktop } from '../desktop.js';
import { downloadBlob } from '../pdfview.js';
import { mascara, componer, FONDOS } from '../fondo.js';
import { aplicarLut, efectosPreset } from '../biou/lut.js';
import { detectarCara, retocar, PERFILES, CERO_CARA, BARRAS_CARA } from '../biou/cara.js';
import { BANCO, miniatura } from '../biou/banco.js';
import * as FIL from '../biou/filtros.js';

const AJ = [['luz', 'Luz'], ['contraste', 'Contraste'], ['color', 'Color'], ['calidez', 'Calidez'], ['sombras', 'Sombras'], ['luces', 'Luces'], ['nitidez', 'Nitidez'], ['vineta', 'Viñeta']];
const CERO = () => Object.fromEntries(AJ.map(([k]) => [k, 0]));
const ESTILOS = [
  ['natural', 'Natural', {}],
  ['producto', 'Producto limpio', { luz: 12, contraste: 10, color: 6, calidez: -6, sombras: 18, nitidez: 35 }],
  ['calido', 'Cálido', { calidez: 22, color: 10, luz: 4, vineta: 18 }],
  ['vivo', 'Vivo', { color: 30, contraste: 16, nitidez: 25 }],
  ['suave', 'Suave', { contraste: -14, luces: -10, sombras: 20, color: -6 }],
  ['bn', 'Blanco y negro', { color: -100, contraste: 18, nitidez: 20 }]
];
const RAT = [['0', 'Libre'], ['1', '1:1'], ['0.8', '4:5'], ['1.7778', '16:9'], ['1.3333', '4:3'], ['0.5625', '9:16']];
const cl = v => v < 0 ? 0 : v > 255 ? 255 : v;

// ---------- Proceso (el mismo para la vista previa y para el resultado en tamaño original) ----------
// «Mejorar»: niveles por canal (balance de blancos), punto medio de luz (gamma) y un poco de color y nitidez
export function analizar(img) {
  const d = img.data, H = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)], L = new Uint32Array(256); let n = 0;
  const paso = Math.max(4, Math.floor(d.length / 4 / 250000) * 4);
  for (let i = 0; i < d.length; i += paso) { H[0][d[i]]++; H[1][d[i + 1]]++; H[2][d[i + 2]]++; L[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++; n++; }
  const pct = (h, p) => { let a = 0; for (let v = 0; v < 256; v++) { a += h[v]; if (a >= n * p) return v; } return 255; };
  const lv = H.map(h => { let lo = pct(h, 0.004), hi = pct(h, 0.996); if (hi - lo < 50) { lo = Math.min(lo, 10); hi = Math.max(hi, 245); } return [lo, hi]; });
  const med = pct(L, 0.5), gamma = Math.max(0.7, Math.min(1.45, Math.log(0.5) / Math.log(Math.max(0.05, Math.min(0.95, med / 255)))));
  return { lv, gamma: Math.round(gamma * 100) / 100 };
}
function tabla(st) { // tabla de 256 valores por canal con niveles + gamma + luz + contraste + sombras + luces
  const a = st.adj, au = st.auto, T = [new Uint8ClampedArray(256), new Uint8ClampedArray(256), new Uint8ClampedArray(256)];
  const c = a.contraste * 1.6, f = (259 * (c + 255)) / (255 * (259 - c)), luz = a.luz * 1.5, w = a.calidez * 0.35;
  for (let ch = 0; ch < 3; ch++) for (let v = 0; v < 256; v++) {
    let x = v;
    if (au) { const [lo, hi] = au.lv[ch]; x = (x - lo) * 255 / Math.max(1, hi - lo); x = 255 * Math.pow(cl(x) / 255, 1 / au.gamma); }
    const t = x / 255;
    if (a.sombras) x += a.sombras * 0.9 * Math.pow(1 - t, 3);   // levanta (o hunde) los oscuros sin tocar las luces
    if (a.luces) x += a.luces * 0.9 * Math.pow(t, 3);           // baja (o sube) las luces
    x += luz; x = f * (x - 128) + 128;
    if (ch === 0) x += w; if (ch === 2) x -= w;
    T[ch][v] = cl(Math.round(x));
  }
  return T;
}
export function ajustar(img, st) {
  const d = img.data, T = tabla(st), sat = 1 + (st.adj.color + (st.auto ? 12 : 0)) / 100, W = img.width, H = img.height, vin = st.adj.vineta / 100;
  const cx = W / 2, cy = H / 2, md = Math.hypot(cx, cy);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let r = T[0][d[i]], g = T[1][d[i + 1]], b = T[2][d[i + 2]];
    if (sat !== 1) { const y = 0.299 * r + 0.587 * g + 0.114 * b; r = y + (r - y) * sat; g = y + (g - y) * sat; b = y + (b - y) * sat; }
    if (vin) { const x = p % W, yy = (p / W) | 0, k = 1 - vin * Math.pow(Math.hypot(x - cx, yy - cy) / md, 2.2) * 0.85; r *= k; g *= k; b *= k; }
    d[i] = cl(r); d[i + 1] = cl(g); d[i + 2] = cl(b);
  }
  return img;
}
function enfocar(cv, cantidad) { // máscara de enfoque: original + cantidad × (original − desenfocado)
  if (!cantidad) return;
  const W = cv.width, H = cv.height, g = cv.getContext('2d', { willReadFrequently: true });
  const bl = document.createElement('canvas'); bl.width = W; bl.height = H; const gb = bl.getContext('2d', { willReadFrequently: true });
  const r = Math.max(1, Math.round(Math.max(W, H) / 1200));
  if ('filter' in gb) { gb.filter = 'blur(' + r + 'px)'; gb.drawImage(cv, 0, 0); gb.filter = 'none'; } else gb.drawImage(cv, 0, 0);
  const o = g.getImageData(0, 0, W, H), b = gb.getImageData(0, 0, W, H), d = o.data, e = b.data, k = cantidad / 100 * 1.2;
  for (let i = 0; i < d.length; i += 4) { d[i] = cl(d[i] + k * (d[i] - e[i])); d[i + 1] = cl(d[i + 1] + k * (d[i + 1] - e[i + 1])); d[i + 2] = cl(d[i + 2] + k * (d[i + 2] - e[i + 2])); }
  g.putImageData(o, 0, 0);
}
export function procesar(src, st, maxLado) {
  const t = transformed(src, st.rot, st.flip), cr = st.crop || { x: 0, y: 0, w: 1, h: 1 };
  const sx = Math.round(cr.x * t.width), sy = Math.round(cr.y * t.height), sw = Math.max(1, Math.round(cr.w * t.width)), sh = Math.max(1, Math.round(cr.h * t.height));
  const k = maxLado && Math.max(sw, sh) > maxLado ? maxLado / Math.max(sw, sh) : 1;
  const out = document.createElement('canvas'); out.width = Math.max(1, Math.round(sw * k)); out.height = Math.max(1, Math.round(sh * k));
  const g = out.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(t, sx, sy, sw, sh, 0, 0, out.width, out.height);
  const fd = st.fondo && st.fondo.tipo && st.fondo.tipo !== 'original' ? st.fondo : null;
  const m = fd ? mascara(out, { tol: fd.tol }) : null; // v13.10: el recorte se calcula sobre la foto sin retocar (igual en la vista previa)
  if (st.cara && st.caraAj) retocar(out, st.cara, st.caraAj); // v13.12: retoque de cara
  const img = g.getImageData(0, 0, out.width, out.height); ajustar(img, st);
  if (st.filtro && st.filtro.lut) { aplicarLut(img, st.filtro.lut, st.filtro.k); efectosPreset(img, st.filtro.lut, st.filtro.k); } // v13.12: filtro
  g.putImageData(img, 0, 0);
  enfocar(out, st.adj.nitidez + (st.auto ? 25 : 0));
  return m ? componer(out, m, fd) : out;
}
async function cargar(file) {
  if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { } }
  return await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('No se pudo abrir esa imagen.')); im.src = u; });
}

// ---------- Pantalla ----------
export function render(el) {
  let src = null, nombre = 'foto', st = null, prev = null, verOriginal = false, pend = 0;
  const cv = h('canvas.es-cv'), vacio = h('div.es-vacio');
  const elegir = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, 'aria-label': 'Elegir foto', onchange: () => { const f = elegir.files[0]; elegir.value = ''; if (f) abrir(f); } });
  const panel = h('div.es-panel'), info = h('div.tiny.muted.es-info');
  const capa = h('div.es-capa'), lienzo = h('div.es-lienzo', cv, capa);
  const zona = h('div.es-zona', { ondragover: e => { e.preventDefault(); zona.classList.add('drop'); }, ondragleave: () => zona.classList.remove('drop'),
    ondrop: e => { e.preventDefault(); zona.classList.remove('drop'); const f = [...(e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (f) abrir(f); } }, vacio, lienzo);
  el.append(h('div.page-head', h('div.grow', h('h1', h('span', '📸 '), h('span.biou-t', 'Biouvision')), h('p.small.muted', { style: { margin: '2px 0 0' } }, 'Tu editor de fotos: mejora, retoca caras, filtros y cambia el fondo. Se guarda a la máxima calidad (tamaño original).')),
    btn('Abrir foto', () => elegir.click(), { cls: 'primary', icon: 'image' })), h('div.es', zona, panel), info, elegir);
  mount(vacio, h('div.es-vacio-in', h('div', { style: { fontSize: '54px' } }, '📸'), h('h3', 'Arrastra aquí una foto o pulsa «Abrir foto»'), h('p.small.muted', 'Después pulsa ✨ Mejorar y, si quieres, retoca con las barras.'),
    btn('Abrir foto', () => elegir.click(), { cls: 'primary' })));
  cv.style.display = 'none';
  const nuevoEstado = () => ({ rot: 0, flip: false, crop: null, ratio: 0, adj: CERO(), auto: null, estilo: 'natural', fondo: { tipo: 'original', color: '#f3ece4', tol: 26, suave: 2, sombra: true, imagen: null, banco: 'estudio_blanco' },
    cara: null, caraAj: CERO_CARA(), perfil: '', filtro: null });
  let caraKey = '', buscandoCara = false, abiertos = { cara: false, filtros: false };
  let mCache = { prev: null, tol: 0, m: null }, avisoMask = false;
  async function abrir(f) {
    try { src = await cargar(f); } catch (e) { return toast(e.message, 'bad'); }
    nombre = String(f.name || 'foto').replace(/\.[^.]+$/, ''); st = nuevoEstado(); vacio.style.display = 'none'; cv.style.display = '';
    previa(); pintaPanel(); pinta();
    window.__cdEstudio = { get st() { return st; }, src, procesar, pinta, mejorar, buscarCara };
  }
  function previa() { // copia reducida (rápida) de la foto girada y recortada, sin ajustes
    const t = transformed(src, st.rot, st.flip), cr = st.crop || { x: 0, y: 0, w: 1, h: 1 };
    const key = JSON.stringify([st.rot, st.flip, st.crop]); if (key !== caraKey) { caraKey = key; st.cara = null; setTimeout(buscarCara, 0); }
    const sw = cr.w * t.width, sh = cr.h * t.height, mw = Math.min(1100, Math.max(320, zona.clientWidth - 8)), mh = Math.min(innerHeight * 0.68, 760), k = Math.min(1, mw / sw, mh / sh);
    prev = document.createElement('canvas'); prev.width = Math.max(1, Math.round(sw * k)); prev.height = Math.max(1, Math.round(sh * k));
    const g = prev.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(t, cr.x * t.width, cr.y * t.height, sw, sh, 0, 0, prev.width, prev.height);
  }
  function pinta() {
    if (!src) return;
    cancelAnimationFrame(pend);
    pend = requestAnimationFrame(() => {
      cv.width = prev.width; cv.height = prev.height;
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(prev, 0, 0);
      if (!verOriginal) {
        if (st.cara && st.caraAj) retocar(cv, st.cara, st.caraAj);
        const img = g.getImageData(0, 0, cv.width, cv.height); ajustar(img, st);
        if (st.filtro && st.filtro.lut) { aplicarLut(img, st.filtro.lut, st.filtro.k); efectosPreset(img, st.filtro.lut, st.filtro.k); }
        g.putImageData(img, 0, 0); enfocar(cv, (st.adj.nitidez + (st.auto ? 25 : 0)) * 0.6);
      }
      const fd = st.fondo;
      cv.classList.toggle('transp', !verOriginal && fd.tipo === 'transparente');
      if (!verOriginal && fd.tipo !== 'original' && (fd.tipo !== 'foto' || fd.imagen)) {
        if (mCache.prev !== prev || mCache.tol !== fd.tol) mCache = { prev, tol: fd.tol, m: mascara(prev, { tol: fd.tol }) };
        if (mCache.m) { const r = componer(cv, mCache.m, fd); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(r, 0, 0); }
        else if (!avisoMask) { avisoMask = true; toast('No distingo bien el producto del fondo. Sube «Recorte» o usa una foto con el fondo liso.', 'warn', 7000); }
      }
      const t = transformed(src, st.rot, st.flip), cr = st.crop || { w: 1, h: 1 };
      info.textContent = 'Original ' + src.width + ' × ' + src.height + ' px → se guardará a ' + Math.round(cr.w * t.width) + ' × ' + Math.round(cr.h * t.height) + ' px' + (verOriginal ? ' · viendo la ORIGINAL' : '');
      pintaMarcas();
    });
  }
  // ---------- v13.12 · cara: detectar, marcar a mano y mover los puntos de los ojos ----------
  async function buscarCara() {
    if (!prev || buscandoCara) return; buscandoCara = true; const k = caraKey;
    try { const c = await detectarCara(prev); if (k === caraKey) st.cara = c; } catch (e) { } finally { buscandoCara = false; }
    pintaPanel(); pinta();
  }
  function caraDeOjos(c) { // caja de la cara calculada a partir de los ojos (cuando la persona los mueve)
    const [a, b] = c.ojos, d = Math.hypot((b.x - a.x) * prev.width, (b.y - a.y) * prev.height), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const w = d * 2.5 / prev.width, hh = d * 3.2 / prev.height;
    return Object.assign(c, { x: cx - w / 2, y: cy - hh * 0.42, w, h: hh, r: d * 0.28 / Math.max(prev.width, prev.height) });
  }
  function pintaMarcas() {
    if (!st || !st.cara || !abiertos.cara || verOriginal) return capa.replaceChildren();
    const c = st.cara;
    capa.replaceChildren(h('div.es-caja', { style: { left: c.x * 100 + '%', top: c.y * 100 + '%', width: c.w * 100 + '%', height: c.h * 100 + '%' } }),
      ...c.ojos.map((o, i) => { const m = h('div.es-ojo', { title: 'Arrastra al centro del ojo', 'data-ojo': i, style: { left: o.x * 100 + '%', top: o.y * 100 + '%' } });
        m.addEventListener('pointerdown', e => { e.preventDefault(); m.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect();
          const mv = ev => { o.x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); o.y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)); m.style.left = o.x * 100 + '%'; m.style.top = o.y * 100 + '%'; };
          const up = () => { m.removeEventListener('pointermove', mv); m.removeEventListener('pointerup', up); m.removeEventListener('pointercancel', up); caraDeOjos(c); c.ojos.sort((a, b) => a.x - b.x); pinta(); };
          m.addEventListener('pointermove', mv); m.addEventListener('pointerup', up); m.addEventListener('pointercancel', up); });
        return m; }));
  }
  function mejorar() {
    const t = document.createElement('canvas'); t.width = prev.width; t.height = prev.height; const g = t.getContext('2d', { willReadFrequently: true }); g.drawImage(prev, 0, 0);
    st.auto = analizar(g.getImageData(0, 0, t.width, t.height)); pintaPanel(); pinta();
    toast('✨ Foto mejorada: luz, blancos, color y nitidez. Mantén «Ver original» para comparar.', 'ok', 4000);
  }
  function encuadre(r) {
    st.ratio = Number(r) || 0;
    if (!st.ratio) st.crop = null;
    else {
      const t = transformed(src, st.rot, st.flip), ar = t.width / t.height;
      st.crop = st.ratio < ar ? { w: st.ratio / ar, h: 1, x: (1 - st.ratio / ar) / 2, y: 0 } : { w: 1, h: ar / st.ratio, x: 0, y: (1 - ar / st.ratio) / 2 };
    }
    previa(); pintaPanel(); pinta();
  }
  function mover(dx, dy) { if (!st.crop) return; st.crop.x = Math.max(0, Math.min(1 - st.crop.w, st.crop.x + dx)); st.crop.y = Math.max(0, Math.min(1 - st.crop.h, st.crop.y + dy)); previa(); pinta(); }
  async function resultado(fmt) {
    let out = procesar(src, st, 0); const tipo = fmt === 'png' ? 'image/png' : 'image/jpeg';
    if (fmt !== 'png' && st.fondo && st.fondo.tipo === 'transparente') { const w = document.createElement('canvas'); w.width = out.width; w.height = out.height; const gw = w.getContext('2d'); gw.fillStyle = '#fff'; gw.fillRect(0, 0, w.width, w.height); gw.drawImage(out, 0, 0); out = w; } // el JPG no admite transparencia
    const blob = await new Promise((res, rej) => out.toBlob(b => b ? res(b) : rej(new Error('No se pudo crear la imagen (la foto es demasiado grande para este aparato).')), tipo, 0.97));
    return new File([blob], nombre + '_biouvision.' + (fmt === 'png' ? 'png' : 'jpg'), { type: tipo, lastModified: Date.now() });
  }
  async function guardar(fmt, b) {
    b.disabled = true; const t0 = b.textContent; b.textContent = 'Preparando a tamaño original…';
    try {
      const f = await resultado(fmt);
      if (desktop.on) { const info = await desktop.info(); const dir = String((info && info.backupDir) || '').replace(/[\\/][^\\/]+$/, ''); const sep = dir.includes('\\') ? '\\' : '/'; const r = await desktop.save(dir + sep + 'FOTOS' + sep + f.name, f, true); toast('📸 Guardada en ' + ((r && r.path) || dir + sep + 'FOTOS'), 'ok', 8000); }
      else { downloadBlob(f, f.name); toast('📸 ' + f.name + ' descargada (' + Math.round(f.size / 1024) + ' KB)', 'ok', 6000); }
    } catch (e) { toast(e.message, 'bad', 8000); } finally { b.disabled = false; b.textContent = t0; }
  }
  // v13.10 · 🎬 vídeo de 3 s a partir de la foto: acercamiento lento, un poco de desplazamiento y un brillo que la recorre
  async function videoFoto(b) {
    const t0 = b.textContent; b.disabled = true; b.textContent = '⏺ Creando el vídeo…';
    const tmp = h('canvas', { style: { position: 'fixed', left: '-9999px', top: '0' } });
    try {
      const S = await import('../simulacion.js');
      const base = procesar(src, st, 1280), W = base.width - base.width % 2, H = base.height - base.height % 2;
      tmp.width = W; tmp.height = H; document.body.append(tmp); const g = tmp.getContext('2d');
      const r = await S.grabarLienzo(tmp, 3, x => {
        const e = x * x * (3 - 2 * x), z = 1 + 0.09 * e, dx = (W * z - W) * (0.35 + 0.3 * e), dy = (H * z - H) * 0.5;
        g.clearRect(0, 0, W, H); g.drawImage(base, -dx, -dy, W * z, H * z);
        const bx = -W * 0.6 + x * W * 2.2, gr = g.createLinearGradient(bx, 0, bx + W * 0.35, H); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      });
      const f = new File([r.blob], nombre + '_video3s.' + r.ext, { type: r.blob.type });
      downloadBlob(f, f.name); toast('🎬 Vídeo de 3 s listo: ' + f.name, 'ok', 6000);
    } catch (e) { toast(e.message, 'bad', 8000); } finally { tmp.remove(); b.disabled = false; b.textContent = t0; }
  }
  async function aProducto(b) {
    const prods = (S.t.productos || []).filter(p => p.activo !== false).sort((a, c) => String(a.nombre).localeCompare(String(c.nombre)));
    if (!prods.length) return toast('Aún no hay productos.', 'warn');
    const s = sel(prods.map(p => ({ v: p.id, t: p.nombre })), prods[0].id, { 'aria-label': 'Producto' });
    modal('Guardar en un producto', h('div.col', h('p.small', 'La foto se añade a las fotos del producto, a tamaño original.'), s), close => [btn('Cancelar', close), btn('Guardar', async ev => {
      const bb = ev.target.closest('button'); bb.disabled = true;
      try { const f = await resultado('jpg'), F = await import('../files.js'); await F.uploadFile(f, { entidad: 'productos', entidadId: s.value, original: true }); toast('📸 Foto guardada en «' + (byId('productos', s.value) || {}).nombre + '»', 'ok'); close(); }
      catch (e) { toast(e.message, 'bad'); bb.disabled = false; }
    }, { cls: 'primary' })], { size: 'narrow' });
  }
  async function compartir(b) {
    try { const f = await resultado('jpg'); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: nombre }); else { downloadBlob(f, f.name); toast('Este aparato no deja compartir: se ha descargado.', 'ok'); } } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'bad'); }
  }
  // v13.12 · 🙂 Retoque de cara con perfiles de belleza
  function seccionCara() {
    const c = st.cara, a = st.caraAj;
    const barra = ([k, t]) => { const r = h('input', { type: 'range', min: 0, max: 100, value: a[k] || 0, 'aria-label': t, oninput: () => { a[k] = Number(r.value); st.perfil = ''; val.textContent = r.value; pinta(); } }), val = h('b.es-val', String(a[k] || 0)); return h('label.es-bar', h('span', t), r, val); };
    const d = h('details.es-sec.es-cara', { open: abiertos.cara }, h('summary.lbl', '🙂 Retoque de cara'),
      h('div.tiny' + (c ? '.ok-t' : '.muted'), { style: { margin: '4px 0 8px' } }, c ? '✓ Cara encontrada. Si los puntos rosas no están en los ojos, arrástralos.' : buscandoCara ? 'Buscando la cara…' : 'No encuentro una cara en esta foto.',
        !c && !buscandoCara ? btn('Marcarla a mano', () => { st.cara = caraDeOjos({ ojos: [{ x: 0.42, y: 0.4 }, { x: 0.58, y: 0.4 }], como: 'mano' }); abiertos.cara = true; pintaPanel(); pinta(); }, { cls: 'sm ghost', style: { marginLeft: '6px' } }) : null),
      h('div.row.wrap', { style: { gap: '6px', marginBottom: '8px' } }, PERFILES.map(([k, t, v]) => h('button.chip' + (st.perfil === k ? '.on' : ''), { type: 'button', 'data-perfil': k, disabled: !c, onclick: () => { st.perfil = k; st.caraAj = Object.assign(CERO_CARA(), v); pintaPanel(); pinta(); } }, t)),
        h('button.chip', { type: 'button', disabled: !c, onclick: () => { st.perfil = ''; st.caraAj = CERO_CARA(); pintaPanel(); pinta(); } }, 'Sin retoque')),
      c ? BARRAS_CARA.map(barra) : null);
    d.addEventListener('toggle', () => { abiertos.cara = d.open; pintaMarcas(); });
    return d;
  }
  // v13.12 · 🎨 Filtros: de serie, de tu carpeta RECURSOS (PC) o cargados por ti (.cube y .xmp de Lightroom)
  let recursos = null, buscaF = '', verLog = false, escaneando = false;
  function miniFiltro(lut) { // miniatura de la foto con el filtro
    const k = 64 / Math.max(prev.width, prev.height), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(prev.width * k)); c.height = Math.max(1, Math.round(prev.height * k));
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(prev, 0, 0, c.width, c.height); if (lut) { const im = g.getImageData(0, 0, c.width, c.height); aplicarLut(im, lut, 1); g.putImageData(im, 0, 0); } return c;
  }
  const ponFiltro = (id, nombre, lut) => { st.filtro = lut ? { id, nombre, lut, k: st.filtro ? st.filtro.k : 1 } : null; pintaPanel(); pinta(); };
  function seccionFiltros() {
    const f = st.filtro, mis = h('div.es-mis');
    const intens = h('input', { type: 'range', min: 0, max: 100, value: f ? Math.round(f.k * 100) : 100, 'aria-label': 'Intensidad del filtro', disabled: !f, oninput: () => { if (st.filtro) { st.filtro.k = Number(intens.value) / 100; iv.textContent = intens.value; pinta(); } } }), iv = h('b.es-val', String(f ? Math.round(f.k * 100) : 100));
    const looks = h('div.es-looks', h('button.es-look' + (!f ? '.on' : ''), { type: 'button', onclick: () => ponFiltro() }, miniFiltro(null), h('span', 'Original')),
      FIL.LOOKS.map(l => { const lut = FIL.lutDeLook(l), id = 'look:' + l.nombre; return h('button.es-look' + (f && f.id === id ? '.on' : ''), { type: 'button', 'data-filtro': l.nombre, onclick: () => ponFiltro(id, l.nombre, lut) }, miniFiltro(lut), h('span', l.nombre)); }));
    const d = h('details.es-sec.es-filtros', { open: abiertos.filtros }, h('summary.lbl', '🎨 Filtros' + (f ? ' · ' + f.nombre : '')), looks,
      h('label.es-bar', h('span', 'Intensidad'), intens, iv), mis);
    d.addEventListener('toggle', () => { abiertos.filtros = d.open; if (d.open) pintaMis(mis); });
    if (abiertos.filtros) pintaMis(mis);
    return d;
  }
  async function pintaMis(box) {
    const lista = [].concat(recursos || [], await FIL.misFiltros()).filter(x => verLog || !x.log);
    const q = buscaF.toLowerCase(), vis = lista.filter(x => !q || (x.nombre + ' ' + x.grupo).toLowerCase().includes(q));
    const buscar = h('input.inp', { type: 'search', placeholder: 'Buscar filtro…', value: buscaF, 'aria-label': 'Buscar filtro', oninput: () => { buscaF = buscar.value; pintaLista(); } });
    const cargarIn = h('input', { type: 'file', accept: '.cube,.xmp', multiple: true, style: { display: 'none' }, 'aria-label': 'Cargar filtros', onchange: async () => { const n = await FIL.anadirArchivos([...cargarIn.files]); cargarIn.value = ''; toast(n ? '🎨 ' + n + ' filtro(s) añadidos' : 'No se pudo leer ningún filtro (.cube o .xmp de Lightroom)', n ? 'ok' : 'warn'); pintaMis(box); } });
    const listaEl = h('div.es-mis-lista');
    const pintaLista = () => {
      const q2 = buscaF.toLowerCase(), v2 = lista.filter(x => !q2 || (x.nombre + ' ' + x.grupo).toLowerCase().includes(q2)).slice(0, 80);
      listaEl.replaceChildren(...(v2.length ? v2.map(x => h('button.chip.sm' + (st.filtro && st.filtro.id === x.id ? '.on' : ''), { type: 'button', title: x.grupo, 'data-mio': x.nombre, onclick: async ev => { const b = ev.currentTarget; b.disabled = true; try { ponFiltro(x.id, x.nombre, await FIL.lutDe(x)); } catch (e) { toast('No se pudo usar «' + x.nombre + '»: ' + e.message, 'bad'); b.disabled = false; } } }, (x.tipo === 'xmp' ? '◐ ' : '◆ ') + x.nombre))
        : [h('p.tiny.muted', lista.length ? 'Ningún filtro con ese nombre.' : desktop.on ? 'Pulsa «Buscar en RECURSOS» para ver tus filtros.' : 'Carga tus filtros .cube o .xmp (Lightroom) para usarlos aquí.')]));
    };
    mount(box, h('div.lbl', { style: { marginTop: '10px' } }, '📁 Mis filtros' + (lista.length ? ' (' + lista.length + ')' : '')),
      h('div.row.wrap', { style: { gap: '6px', margin: '4px 0' } },
        desktop.on ? btn(escaneando ? 'Buscando…' : recursos ? '↻ Volver a buscar' : '🔎 Buscar en RECURSOS', async ev => { const b = ev.currentTarget; b.disabled = true; escaneando = true; try { let raiz = await FIL.carpetaRecursos(); if (!raiz) raiz = await FIL.elegirCarpeta(); if (!raiz) return; recursos = await FIL.escanear(raiz, n => { b.textContent = 'Buscando… ' + n; }); toast('🎨 ' + recursos.length + ' filtros en RECURSOS', 'ok'); } catch (e) { toast(e.message, 'bad'); } finally { escaneando = false; pintaMis(box); } }, { cls: 'sm' }) : null,
        desktop.on ? btn('📂 Elegir carpeta', async () => { const r = await FIL.elegirCarpeta().catch(() => ''); if (r) { recursos = await FIL.escanear(r); pintaMis(box); } }, { cls: 'sm ghost' }) : null,
        btn('➕ Cargar .cube / .xmp', () => cargarIn.click(), { cls: 'sm ghost' }), cargarIn),
      lista.length > 8 ? buscar : null,
      h('label.check.tiny', h('input', { type: 'checkbox', checked: verLog, onchange: e => { verLog = e.target.checked; pintaMis(box); } }), 'Mostrar también los LUT de vídeo LOG (se ven mal en fotos normales)'),
      listaEl, h('p.tiny.muted', '◆ LUT (.cube) · ◐ preset de Lightroom (.xmp, aproximado). Se leen de tu carpeta: el programa no los copia.'));
    pintaLista();
  }
  // v13.10 · 🪄 Cambiar el fondo (recorte automático del producto)
  function seccionFondo() {
    const fd = st.fondo;
    const set = (k, v, panel) => { fd[k] = v; avisoMask = false; if (panel) pintaPanel(); pinta(); };
    const color = h('input', { type: 'color', value: fd.color, 'aria-label': 'Color del fondo', oninput: e => set('color', e.target.value) });
    const fotoIn = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, 'aria-label': 'Foto de fondo', onchange: async () => { const f = fotoIn.files[0]; fotoIn.value = ''; if (!f) return; try { fd.imagen = await cargar(f); set('tipo', 'foto', true); } catch (e) { toast(e.message, 'bad'); } } });
    const rng = (k, t, min, max, ayuda) => { const r = h('input', { type: 'range', min, max, value: fd[k], 'aria-label': t, title: ayuda, oninput: () => { val.textContent = r.value; set(k, Number(r.value)); } }), val = h('b.es-val', String(fd[k])); return h('label.es-bar', h('span', t), r, val); };
    return h('div.es-sec.es-fondo', h('div.lbl', '🪄 Cambiar el fondo'),
      h('div.row.wrap', { style: { gap: '6px' } }, FONDOS.map(([k, t]) => h('button.chip' + (fd.tipo === k ? '.on' : ''), { type: 'button', 'data-fondo': k, onclick: () => { if (k === 'foto' && !fd.imagen) return fotoIn.click(); set('tipo', k, true); } }, t))), fotoIn,
      fd.tipo !== 'original' ? h('div', { style: { marginTop: '8px' } },
        fd.tipo === 'color' || fd.tipo === 'degradado' ? h('label.row', { style: { gap: '8px', alignItems: 'center', marginBottom: '6px' } }, h('span.small', 'Color'), color, ['#ffffff', '#f3ece4', '#fde2e4', '#e2f0cb', '#dbeafe', '#ede9fe', '#1f2937'].map(c => h('button.es-sw', { type: 'button', style: { background: c }, title: c, onclick: () => { color.value = c; set('color', c); } }))) : null,
        fd.tipo === 'foto' ? btn('Cambiar la foto de fondo', () => fotoIn.click(), { cls: 'sm ghost' }) : null,
        fd.tipo === 'banco' ? h('div.es-banco', BANCO.map(([k, t]) => { const c = miniatura(k, 84, 60); return h('button.es-bf' + (fd.banco === k ? '.on' : ''), { type: 'button', 'data-banco': k, title: t, onclick: () => set('banco', k, true) }, c, h('span', t)); })) : null,
        rng('tol', 'Recorte', 8, 70, 'Más alto = quita más fondo (si queda fondo alrededor). Más bajo = respeta más el producto.'),
        rng('suave', 'Borde suave', 0, 8, 'Suaviza el borde del recorte'),
        fd.tipo !== 'transparente' ? h('label.check', h('input', { type: 'checkbox', checked: fd.sombra, onchange: e => set('sombra', e.target.checked) }), 'Sombra suave debajo') : h('p.tiny.muted', 'Guárdala en PNG para mantener el fondo transparente.'),
        h('p.tiny.muted', 'Funciona mejor con el producto sobre un fondo liso. Si queda fondo, sube «Recorte»; si se come el producto, bájalo.')) : null);
  }
  function pintaPanel() {
    if (!st) return mount(panel, h('p.small.muted', 'Abre una foto para empezar.'));
    const barra = ([k, t]) => { const r = h('input', { type: 'range', min: k === 'nitidez' || k === 'vineta' ? 0 : -100, max: 100, value: st.adj[k], 'aria-label': t, oninput: () => { st.adj[k] = Number(r.value); val.textContent = r.value; pinta(); } }), val = h('b.es-val', String(st.adj[k]));
      return h('label.es-bar', h('span', t), r, val); };
    const ver = btn('👁 Ver original', null, { cls: 'sm ghost es-ver' });
    const on = () => { verOriginal = true; pinta(); }, off = () => { verOriginal = false; pinta(); };
    ver.addEventListener('pointerdown', on); ver.addEventListener('pointerup', off); ver.addEventListener('pointerleave', off);
    mount(panel,
      btn(st.auto ? '✨ Mejorada (pulsa para quitar)' : '✨ Mejorar', () => { if (st.auto) { st.auto = null; pintaPanel(); pinta(); } else mejorar(); }, { cls: 'primary es-mejorar' + (st.auto ? ' on' : '') }),
      h('div.es-sec', h('div.lbl', 'Estilo'), h('div.row.wrap', { style: { gap: '6px' } }, ESTILOS.map(([k, t, v]) => h('button.chip' + (st.estilo === k ? '.on' : ''), { type: 'button', onclick: () => { st.estilo = k; st.adj = Object.assign(CERO(), v); pintaPanel(); pinta(); } }, t)))),
      seccionCara(),
      seccionFiltros(),
      seccionFondo(),
      h('div.es-sec', h('div.lbl', 'Ajustes'), AJ.map(barra)),
      h('div.es-sec', h('div.lbl', 'Girar y encuadrar'), h('div.row.wrap', { style: { gap: '6px' } },
        btn('⟲', () => { st.rot--; st.crop = null; st.ratio = 0; previa(); pintaPanel(); pinta(); }, { cls: 'sm', title: 'Girar a la izquierda' }), btn('⟳', () => { st.rot++; st.crop = null; st.ratio = 0; previa(); pintaPanel(); pinta(); }, { cls: 'sm', title: 'Girar a la derecha' }),
        btn('⇋', () => { st.flip = !st.flip; previa(); pinta(); }, { cls: 'sm', title: 'Voltear' })),
        h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } }, RAT.map(([v, t]) => h('button.chip' + (String(st.ratio) === v || (!st.ratio && v === '0') ? '.on' : ''), { type: 'button', onclick: () => encuadre(v) }, t))),
        st.crop ? h('div.row.wrap', { style: { gap: '4px', marginTop: '6px' } }, h('span.tiny.muted', 'Mover encuadre:'), btn('←', () => mover(-0.04, 0), { cls: 'sm' }), btn('→', () => mover(0.04, 0), { cls: 'sm' }), btn('↑', () => mover(0, -0.04), { cls: 'sm' }), btn('↓', () => mover(0, 0.04), { cls: 'sm' })) : null),
      h('div.row.wrap', { style: { gap: '6px' } }, ver, btn('Deshacer todo', () => { st = Object.assign(nuevoEstado()); caraKey = ''; previa(); pintaPanel(); pinta(); }, { cls: 'sm ghost' })),
      h('div.es-sec.es-guardar', h('div.lbl', 'Guardar (tamaño original)'),
        h('div.row.wrap', { style: { gap: '6px' } }, btn('⬇️ JPG máxima calidad', ev => guardar('jpg', ev.target.closest('button')), { cls: 'primary sm' }), btn('⬇️ PNG sin pérdida', ev => guardar('png', ev.target.closest('button')), { cls: 'sm' }),
          can('archivos.subir') ? btn('🧩 Guardar en un producto', ev => aProducto(ev.target.closest('button')), { cls: 'sm' }) : null, btn('📤 Compartir', ev => compartir(ev.target.closest('button')), { cls: 'sm ghost' })),
        h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } }, btn('🎬 Vídeo de 3 s (movimiento suave)', ev => videoFoto(ev.target.closest('button')), { cls: 'sm' }))));
  }
  pintaPanel();
  const onR = () => { if (src) { previa(); pinta(); } }; addEventListener('resize', onR);
  return { destroy: () => removeEventListener('resize', onR) };
}
