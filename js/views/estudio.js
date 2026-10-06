// ================= v13.10 · 📸 ESTUDIO DE FOTOS → v13.12 · BIOUVISION =================
// v13.12: se llama Biouvision y suma retoque de cara (perfiles de belleza), filtros (de serie, de tu carpeta RECURSOS o
// cargados: LUT .cube y presets .xmp de Lightroom) y un banco de fondos para el recorte.
// Editor sencillo para dejar perfectas las fotos de producto: «✨ Mejorar» automático (balance de blancos, luz, contraste suave,
// color y nitidez), luz, contraste, color, calidez, sombras, luces, nitidez y viñeta; girar, voltear y encuadre (1:1, 4:5, 16:9…).
// Se trabaja con una vista previa rápida, pero el resultado se calcula SIEMPRE a la resolución ORIGINAL de la foto
// (PNG sin pérdida o JPG al 97 %). Todo ocurre en este aparato: la foto no sale a ningún servicio externo.
// v15.2 · BIOUVISION PRO: «✨ Quitar el fondo con IA» (pelo y bordes finos; lo hace el PC del taller, también si se pide
// desde el móvil), pincel para corregir el recorte, caras con ojos, nariz y boca (IA del PC), biblioteca de filtros con
// miniaturas y ★ favoritos, comparar antes / después, «✨ Mejorar automáticamente» y ↶ Deshacer / ↷ Rehacer (Ctrl+Z / Ctrl+Y).
import { h, mount, btn, toast, sel, modal } from '../ui.js';
import { S, can, byId, api } from '../store.js';
import { transformed } from '../fotoeditor.js';
import { desktop } from '../desktop.js';
import { downloadBlob } from '../pdfview.js';
import { mascara, componer, FONDOS } from '../fondo.js';
import { aplicarLut, efectosPreset } from '../biou/lut.js';
import { detectarCara, retocar, PERFILES, CERO_CARA, BARRAS_CARA } from '../biou/cara.js';
import { BANCO, miniatura } from '../biou/banco.js';
import * as FIL from '../biou/filtros.js';
import { recortarConIA, carasConIA, estadoMotor } from '../biou/motor.js';
import { subMascara, aplicarTrazos, capaRoja, historial, teclasDeshacer, favoritos, alternarFavorito } from '../biou/pro.js';

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
  const m = fd ? mascaraDe(out, st) : null; // v13.10: el recorte se calcula sobre la foto sin retocar (igual en la vista previa)
  if (st.cara && st.caraAj) retocar(out, st.cara, st.caraAj); // v13.12: retoque de cara
  const img = g.getImageData(0, 0, out.width, out.height); ajustar(img, st);
  if (st.filtro && st.filtro.lut) { aplicarLut(img, st.filtro.lut, st.filtro.k); efectosPreset(img, st.filtro.lut, st.filtro.k); } // v13.12: filtro
  g.putImageData(img, 0, 0);
  enfocar(out, st.adj.nitidez + (st.auto ? 25 : 0));
  return m ? componer(out, m, fd) : out;
}
// v15.2: la máscara del encuadre: la de la IA (si se pidió) o la de colores, con los retoques del pincel encima
export function mascaraBase(cv, st) {
  const fd = st.fondo;
  return fd.modo === 'ia' && fd.ia ? subMascara(fd.ia, st.crop) : mascara(cv, { tol: fd.tol });
}
export function mascaraDe(cv, st) { return aplicarTrazos(mascaraBase(cv, st), st.fondo.trazos, st.crop, cv.width, cv.height); }
const MB = b => Math.round(b / 1048576);
// v15.4 · motor del recorte con IA (se comparte con «✂️ Quitar fondo» de Biouvision)
const MOTORES_IA = [['auto', 'Automático'], ['birefnet-massive', 'Máxima calidad ⭐'], ['birefnet-portrait', 'Personas (pelo)'], ['birefnet-lite', 'Rápido']];
const opIA = () => { try { return Object.assign({ modelo: 'auto', ultra: true }, JSON.parse(localStorage.getItem('bv.fondo.op') || '{}')); } catch (e) { return { modelo: 'auto', ultra: true }; } };
const guardaOpIA = op => { try { localStorage.setItem('bv.fondo.op', JSON.stringify(op)); } catch (e) { } };
let RECURSOS = null, recursosAuto = false; // los filtros de la carpeta RECURSOS (se buscan una vez por sesión)
async function cargar(file) {
  if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { } }
  return await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('No se pudo abrir esa imagen.')); im.src = u; });
}

// v15.4 · Biouvision, la app propia de fotos (su ventana en el PC; en el móvil, su página)
export function abrirBiouvision(ruta) {
  if (desktop.on) return desktop.ventana('biouvision', ruta || '').then(() => toast('✨ Abriendo Biouvision…', 'ok')).catch(e => toast(e.message, 'bad'));
  location.href = 'biouvision.html' + (ruta || '').replace(/^#\//, '#');
}

// ---------- Pantalla ----------
export function render(el) {
  let src = null, nombre = 'foto', st = null, prev = null, verOriginal = false, pend = 0;
  const cv = h('canvas.es-cv'), vacio = h('div.es-vacio');
  const elegir = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, 'aria-label': 'Elegir foto', onchange: () => { const f = elegir.files[0]; elegir.value = ''; if (f) abrir(f); } });
  const panel = h('div.es-panel'), info = h('div.tiny.muted.es-info');
  const capa = h('div.es-capa'), pincelCapa = h('div.es-pincel-capa', { 'aria-label': 'Pintar el recorte' }), lienzo = h('div.es-lienzo', cv, pincelCapa, capa);
  // v15.2 · ↶ Deshacer / ↷ Rehacer (también Ctrl+Z / Ctrl+Y) y comparar antes / después
  const bDes = btn('↶ Deshacer', () => deshacer(), { cls: 'sm', title: 'Deshacer (Ctrl+Z)' }), bReh = btn('↷ Rehacer', () => rehacer(), { cls: 'sm', title: 'Rehacer (Ctrl+Y)' });
  bDes.setAttribute('aria-label', 'Deshacer'); bReh.setAttribute('aria-label', 'Rehacer'); bDes.disabled = bReh.disabled = true;
  const bComp = btn('◧ Antes / después', () => { comparar = comparar == null ? 0.5 : null; bComp.classList.toggle('on', comparar != null); pinta(); }, { cls: 'sm ghost es-comp', title: 'Comparar con la foto original' });
  const herr = h('div.es-herr', { style: { display: 'none' } }, bDes, bReh, bComp);
  const hist = historial(e => { bDes.disabled = !e.atras; bReh.disabled = !e.adelante; });
  const zona = h('div.es-zona', { ondragover: e => { e.preventDefault(); zona.classList.add('drop'); }, ondragleave: () => zona.classList.remove('drop'),
    ondrop: e => { e.preventDefault(); zona.classList.remove('drop'); const f = [...(e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (f) abrir(f); } }, vacio, lienzo);
  el.append(h('div.page-head', h('div.grow', h('h1', h('span', '📸 '), h('span.biou-t', 'Biouvision')), h('p.small.muted', { style: { margin: '2px 0 0' } }, 'Tu editor de fotos: mejora, retoca caras, filtros y cambia el fondo. Se guarda a la máxima calidad (tamaño original).')),
    btn('🕰️ Fotos antiguas · Biouvision', () => abrirBiouvision('#/restaurar'), { cls: 'es-biou-app', title: 'Abre Biouvision: restaurar fotos antiguas hasta 4K, quitar fondos y más' }),
    btn('Abrir foto', () => elegir.click(), { cls: 'primary', icon: 'image' })), herr, h('div.es', zona, panel), info, elegir);
  mount(vacio, h('div.es-vacio-in', h('div', { style: { fontSize: '54px' } }, '📸'), h('h3', 'Arrastra aquí una foto o pulsa «Abrir foto»'), h('p.small.muted', 'Después pulsa ✨ Mejorar y, si quieres, retoca con las barras.'),
    btn('Abrir foto', () => elegir.click(), { cls: 'primary' })));
  cv.style.display = 'none';
  const nuevoEstado = () => ({ rot: 0, flip: false, crop: null, ratio: 0, adj: CERO(), auto: null, estilo: 'natural', fondo: { tipo: 'original', color: '#f3ece4', tol: 26, suave: 2, sombra: true, imagen: null, banco: 'estudio_blanco', modo: 'color', ia: null, trazos: [] },
    cara: null, caraAj: CERO_CARA(), perfil: '', filtro: null });
  let caraKey = '', buscandoCara = false, abiertos = { cara: false, filtros: false };
  let mCache = { prev: null, tol: 0, modo: '', ia: null, m: null }, avisoMask = false;
  let comparar = null, pincel = null, radioPincel = 0.035, tApunte = 0, nCaras = 0, iaCtl = null, iaMsg = ''; // pincel: '+' recuperar, '-' borrar
  const apuntar = () => { clearTimeout(tApunte); if (st) hist.apuntar(st); };
  function restaurar(s2) {
    if (!s2) return;
    const geo = x => JSON.stringify([x.rot, x.flip, x.crop]), cambiaGeo = geo(s2) !== geo(st);
    st = s2; if (cambiaGeo) { caraKey = geo(st); previa(); }
    pintaPanel(); pinta();
  }
  function deshacer() { if (!st) return; apuntar(); restaurar(hist.atras()); }
  function rehacer() { if (!st) return; apuntar(); restaurar(hist.adelante()); }
  const aLaVista = () => el.isConnected && el.getClientRects().length > 0; // v15.4: en Biouvision convive con otras secciones
  const quitaTeclas = teclasDeshacer(() => aLaVista() && deshacer(), () => aLaVista() && rehacer());
  async function abrir(f) {
    try { src = await cargar(f); } catch (e) { return toast(e.message, 'bad'); }
    nombre = String(f.name || 'foto').replace(/\.[^.]+$/, ''); st = nuevoEstado(); vacio.style.display = 'none'; cv.style.display = ''; herr.style.display = '';
    comparar = null; caraKey = ''; st.cara = null; pincel = null; bComp.classList.remove('on'); if (iaCtl) iaCtl.abort();
    previa(); hist.vaciar(st); pintaPanel(); pinta();
    window.__cdEstudio = { get st() { return st; }, src, procesar, pinta, mejorar, buscarCara, deshacer, rehacer, recorteIA };
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
      cv.classList.toggle('transp', !verOriginal && fd.tipo === 'transparente' && !pincel);
      if (!verOriginal && fd.tipo !== 'original' && (fd.tipo !== 'foto' || fd.imagen || pincel)) {
        const usaIA = fd.modo === 'ia' && !!fd.ia;
        if (mCache.prev !== prev || mCache.tol !== fd.tol || mCache.modo !== (usaIA ? 'ia' : 'color') || mCache.ia !== fd.ia)
          mCache = { prev, tol: fd.tol, modo: usaIA ? 'ia' : 'color', ia: fd.ia, m: mascaraBase(prev, st) };
        const m = aplicarTrazos(mCache.m, fd.trazos, st.crop, prev.width, prev.height);
        if (m && pincel) g.drawImage(capaRoja(m, cv.width, cv.height), 0, 0); // con el pincel se ve en rojo lo que se quita
        else if (m) { const r = componer(cv, m, fd); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(r, 0, 0); }
        else if (!avisoMask) { avisoMask = true; toast(usaIA ? 'La IA no encontró el producto en este encuadre. Prueba con «🖌️ Recuperar».' : 'No distingo bien el producto del fondo. Pulsa «✨ Quitar el fondo con IA», sube «Recorte» o usa una foto con el fondo liso.', 'warn', 7000); }
      }
      if (comparar != null && !verOriginal) { // antes (izquierda) / después (derecha)
        const x = Math.round(cv.width * comparar);
        g.save(); g.beginPath(); g.rect(0, 0, x, cv.height); g.clip(); g.clearRect(0, 0, x, cv.height); g.drawImage(prev, 0, 0); g.restore();
        g.fillStyle = '#fff'; g.fillRect(x - 1, 0, 2, cv.height);
      }
      const t = transformed(src, st.rot, st.flip), cr = st.crop || { w: 1, h: 1 };
      info.textContent = 'Original ' + src.width + ' × ' + src.height + ' px → se guardará a ' + Math.round(cr.w * t.width) + ' × ' + Math.round(cr.h * t.height) + ' px' + (verOriginal ? ' · viendo la ORIGINAL' : '');
      pintaMarcas();
      clearTimeout(tApunte); tApunte = setTimeout(apuntar, 400); // un paso de «Deshacer» por cada cambio (las barras se juntan)
    });
  }
  // ---------- v13.12 · cara: detectar, marcar a mano y mover los puntos de los ojos ----------
  async function buscarCara() {
    if (!prev || buscandoCara) return; buscandoCara = true; const k = caraKey;
    try {
      let c = null; nCaras = 0;
      if (desktop.on) { // v15.2: en el PC, la IA (YuNet) encuentra la cara con ojos, nariz y boca
        try { const cs = await carasConIA(prev); if (cs && cs.length) { nCaras = cs.length; c = deIA(cs.sort((a, b) => b.w * b.h - a.w * a.h)[0]); } } catch (e) { }
      }
      if (!c) c = await detectarCara(prev);
      if (k === caraKey && st) { apuntar(); st.cara = c; hist.rebase(st); } // encontrar la cara no es un paso de «Deshacer»
    } catch (e) { } finally { buscandoCara = false; }
    pintaPanel(); pinta();
  }
  function deIA(f) { // cara de la IA → la forma que usa el retoque
    const [a, b] = f.ojos, d = Math.hypot((b.x - a.x) * prev.width, (b.y - a.y) * prev.height);
    return { x: f.x, y: f.y, w: f.w, h: f.h, ojos: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }], nariz: f.nariz || null, boca: f.boca || null, r: d * 0.28 / Math.max(prev.width, prev.height), como: 'ia' };
  }
  function caraDeOjos(c) { // caja de la cara calculada a partir de los ojos (cuando la persona los mueve)
    const [a, b] = c.ojos, d = Math.hypot((b.x - a.x) * prev.width, (b.y - a.y) * prev.height), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const w = d * 2.5 / prev.width, hh = d * 3.2 / prev.height;
    return Object.assign(c, { x: cx - w / 2, y: cy - hh * 0.42, w, h: hh, r: d * 0.28 / Math.max(prev.width, prev.height) });
  }
  function marcaComparar() { // la raya de antes / después se arrastra
    const m = h('div.es-split', { title: 'Arrastra para comparar', style: { left: comparar * 100 + '%' } }, h('span.es-split-a', 'Antes'), h('span.es-split-d', 'Después'));
    m.addEventListener('pointerdown', e => { e.preventDefault(); m.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect();
      const mv = ev => { comparar = Math.max(0.02, Math.min(0.98, (ev.clientX - r.left) / r.width)); m.style.left = comparar * 100 + '%'; pinta(); };
      const up = () => { m.removeEventListener('pointermove', mv); m.removeEventListener('pointerup', up); m.removeEventListener('pointercancel', up); };
      m.addEventListener('pointermove', mv); m.addEventListener('pointerup', up); m.addEventListener('pointercancel', up); });
    return m;
  }
  function pintaMarcas() {
    pincelCapa.style.display = pincel && !verOriginal ? '' : 'none';
    const extra = comparar != null && !verOriginal ? [marcaComparar()] : [];
    if (!st || !st.cara || !abiertos.cara || verOriginal) return capa.replaceChildren(...extra);
    const c = st.cara, punto = (p, t) => p ? h('div.es-punto', { title: t, style: { left: p.x * 100 + '%', top: p.y * 100 + '%' } }) : null;
    capa.replaceChildren(...extra, h('div.es-caja', { style: { left: c.x * 100 + '%', top: c.y * 100 + '%', width: c.w * 100 + '%', height: c.h * 100 + '%' } }),
      punto(c.nariz, 'Nariz'), ...(c.boca || []).map(b => punto(b, 'Boca')),
      ...c.ojos.map((o, i) => { const m = h('div.es-ojo', { title: 'Arrastra al centro del ojo', 'data-ojo': i, style: { left: o.x * 100 + '%', top: o.y * 100 + '%' } });
        m.addEventListener('pointerdown', e => { e.preventDefault(); m.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect();
          const mv = ev => { o.x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); o.y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)); m.style.left = o.x * 100 + '%'; m.style.top = o.y * 100 + '%'; };
          const up = () => { m.removeEventListener('pointermove', mv); m.removeEventListener('pointerup', up); m.removeEventListener('pointercancel', up); caraDeOjos(c); c.ojos.sort((a, b) => a.x - b.x); c.nariz = null; c.boca = null; pinta(); };
          m.addEventListener('pointermove', mv); m.addEventListener('pointerup', up); m.addEventListener('pointercancel', up); });
        return m; }));
  }
  function mejorar() { // v15.2 · «✨ Mejorar automáticamente»: blancos, luz, sombras, luces quemadas, color, nitidez y (si hay cara) retoque natural
    const t = document.createElement('canvas'); t.width = prev.width; t.height = prev.height; const g = t.getContext('2d', { willReadFrequently: true }); g.drawImage(prev, 0, 0);
    const img = g.getImageData(0, 0, t.width, t.height), d = img.data;
    st.auto = analizar(img);
    let osc = 0, que = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; if (y < 45) osc++; if (y > 242) que++; n++; }
    const a = CERO(); a.sombras = osc / n > 0.18 ? 28 : osc / n > 0.08 ? 14 : 0; a.luces = que / n > 0.06 ? -22 : que / n > 0.02 ? -10 : 0; a.nitidez = 12; a.color = 4;
    st.adj = a; st.estilo = '';
    if (st.cara && !st.perfil) { st.perfil = 'natural'; st.caraAj = Object.assign(CERO_CARA(), PERFILES[0][2]); }
    pintaPanel(); pinta();
    toast('✨ Foto mejorada: luz, blancos, sombras, color y nitidez' + (st.cara ? ', y un retoque natural de la cara' : '') + '. Si no te gusta, pulsa ↶ Deshacer.', 'ok', 5000);
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
  // v15.3 · la foto retocada, directa a Instagram Studio (se prepara a su medida al publicar)
  async function aInstagram(b) {
    const t0 = b.textContent; b.disabled = true; b.textContent = 'Preparando…';
    try { const f = await resultado('jpg'); if (window.__biouIrAInstagram) return await window.__biouIrAInstagram(f); window.__cdIgPendiente = { medios: [{ file: f }] }; location.hash = '#/instagram'; }
    catch (e) { toast(e.message, 'bad'); } finally { b.disabled = false; b.textContent = t0; }
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
  // v15.2: biblioteca con miniaturas de TU foto, ★ favoritos, por carpetas y búsqueda automática en RECURSOS
  let buscaF = '', verLog = false, escaneando = false, soloFav = false, grupoF = '', limiteF = 48;
  function miniFiltro(lut) { // miniatura de la foto con el filtro
    const k = 64 / Math.max(prev.width, prev.height), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(prev.width * k)); c.height = Math.max(1, Math.round(prev.height * k));
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(prev, 0, 0, c.width, c.height); if (lut) { const im = g.getImageData(0, 0, c.width, c.height); aplicarLut(im, lut, 1); g.putImageData(im, 0, 0); } return c;
  }
  const ponFiltro = (id, nombre, lut) => { st.filtro = lut ? { id, nombre, lut, k: st.filtro ? st.filtro.k : 1 } : null; pintaPanel(); pinta(); };
  function seccionFiltros() {
    const f = st.filtro, mis = h('div.es-mis'), fav = favoritos();
    const intens = h('input', { type: 'range', min: 0, max: 100, value: f ? Math.round(f.k * 100) : 100, 'aria-label': 'Intensidad del filtro', disabled: !f, oninput: () => { if (st.filtro) { st.filtro.k = Number(intens.value) / 100; iv.textContent = intens.value; pinta(); } } }), iv = h('b.es-val', String(f ? Math.round(f.k * 100) : 100));
    const looks = h('div.es-looks', h('button.es-look' + (!f ? '.on' : ''), { type: 'button', onclick: () => ponFiltro() }, miniFiltro(null), h('span', 'Original')),
      [...FIL.LOOKS].sort((x, y) => fav.has('look:' + y.nombre) - fav.has('look:' + x.nombre)).map(l => { const lut = FIL.lutDeLook(l), id = 'look:' + l.nombre; return h('div.es-look-w', h('button.es-look' + (f && f.id === id ? '.on' : ''), { type: 'button', 'data-filtro': l.nombre, onclick: () => ponFiltro(id, l.nombre, lut) }, miniFiltro(lut), h('span', l.nombre)), estrella(id)); }));
    const d = h('details.es-sec.es-filtros', { open: abiertos.filtros }, h('summary.lbl', '🎨 Filtros' + (f ? ' · ' + f.nombre : '')), looks,
      h('label.es-bar', h('span', 'Intensidad'), intens, iv),
      f ? h('p.tiny.muted', { style: { margin: '0 0 6px' } }, 'Para comparar, pulsa «◧ Antes / después» encima de la foto.') : null, mis);
    d.addEventListener('toggle', () => { abiertos.filtros = d.open; if (d.open) pintaMis(mis); });
    if (abiertos.filtros) pintaMis(mis);
    return d;
  }
  function estrella(id, alCambiar) {
    const b = h('button.es-fav', { type: 'button', title: 'Favorito', 'aria-label': 'Favorito', 'data-fav': id }, favoritos().has(id) ? '★' : '☆');
    b.onclick = ev => { ev.stopPropagation(); const on = alternarFavorito(id); b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); if (alCambiar) alCambiar(); };
    b.classList.toggle('on', favoritos().has(id));
    return b;
  }
  async function buscarRecursos(b, box, elegir) {
    if (escaneando) return; escaneando = true; if (b) b.disabled = true;
    try {
      let raiz = elegir ? '' : await FIL.carpetaRecursos(); if (!raiz) raiz = await FIL.elegirCarpeta(); if (!raiz) return;
      RECURSOS = await FIL.escanear(raiz, n => { if (b) b.textContent = 'Buscando… ' + n; });
      toast('🎨 ' + RECURSOS.length + ' filtros en RECURSOS', 'ok');
    } catch (e) { toast(e.message, 'bad'); } finally { escaneando = false; if (box.isConnected) pintaMis(box); }
  }
  async function pintaMis(box) {
    // la primera vez en el PC, se buscan solos los filtros de la carpeta RECURSOS
    if (desktop.on && !RECURSOS && !recursosAuto) { recursosAuto = true; FIL.carpetaRecursos().then(r => { if (r && !RECURSOS) { escaneando = true; return FIL.escanear(r).then(l => { RECURSOS = l; }).finally(() => { escaneando = false; if (box.isConnected) pintaMis(box); }); } }).catch(() => { }); }
    const fav = favoritos(), lista = [].concat(RECURSOS || [], await FIL.misFiltros()).filter(x => verLog || !x.log);
    const grupos = [...new Set(lista.map(x => x.grupo))].sort();
    const buscar = h('input.inp', { type: 'search', placeholder: 'Buscar filtro…', value: buscaF, 'aria-label': 'Buscar filtro', oninput: () => { buscaF = buscar.value; limiteF = 48; pintaLista(); } });
    const cargarIn = h('input', { type: 'file', accept: '.cube,.xmp', multiple: true, style: { display: 'none' }, 'aria-label': 'Cargar filtros', onchange: async () => { const n = await FIL.anadirArchivos([...cargarIn.files]); cargarIn.value = ''; toast(n ? '🎨 ' + n + ' filtro(s) añadidos' : 'No se pudo leer ningún filtro (.cube o .xmp de Lightroom)', n ? 'ok' : 'warn'); pintaMis(box); } });
    const listaEl = h('div.es-mis-lista');
    const base = miniFiltro(null);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); e.target.__cargar(); } }), { root: null, rootMargin: '120px' }) : null;
    const ficha = x => {
      const c = document.createElement('canvas'); c.width = base.width; c.height = base.height; c.getContext('2d').drawImage(base, 0, 0);
      c.__cargar = async () => { try { const lut = await FIL.lutDe(x); const g = c.getContext('2d', { willReadFrequently: true }), im = g.getImageData(0, 0, c.width, c.height); aplicarLut(im, lut, 1); g.putImageData(im, 0, 0); c.classList.add('ok'); } catch (e) { c.classList.add('mal'); } };
      if (io) io.observe(c); else c.__cargar();
      return h('div.es-mio-w', h('button.es-mio' + (st.filtro && st.filtro.id === x.id ? '.on' : ''), { type: 'button', title: x.grupo + ' › ' + x.nombre, 'data-mio': x.nombre, onclick: async ev => { const b = ev.currentTarget; b.disabled = true; try { ponFiltro(x.id, x.nombre, await FIL.lutDe(x)); } catch (e) { toast('No se pudo usar «' + x.nombre + '»: ' + e.message, 'bad'); b.disabled = false; } } },
        c, h('span', (x.tipo === 'xmp' ? '◐ ' : '◆ ') + x.nombre)), estrella(x.id, () => { if (soloFav) pintaLista(); }));
    };
    const pintaLista = () => {
      const q2 = buscaF.toLowerCase(), f2 = favoritos();
      const v2 = lista.filter(x => (!q2 || (x.nombre + ' ' + x.grupo).toLowerCase().includes(q2)) && (!grupoF || x.grupo === grupoF) && (!soloFav || f2.has(x.id)))
        .sort((a, b2) => f2.has(b2.id) - f2.has(a.id));
      listaEl.replaceChildren(...(v2.length ? v2.slice(0, limiteF).map(ficha)
        : [h('p.tiny.muted', soloFav ? 'Aún no tienes favoritos: pulsa la ☆ de un filtro.' : lista.length ? 'Ningún filtro con ese nombre.' : desktop.on ? (escaneando ? 'Buscando tus filtros en RECURSOS…' : 'Pulsa «Buscar en RECURSOS» para ver tus filtros.') : 'Carga tus filtros .cube o .xmp (Lightroom) para usarlos aquí.')]),
        v2.length > limiteF ? h('button.chip.sm.es-mas', { type: 'button', onclick: () => { limiteF += 48; pintaLista(); } }, 'Ver más (' + (v2.length - limiteF) + ')') : '');
    };
    mount(box, h('div.lbl', { style: { marginTop: '10px' } }, '📁 Mis filtros' + (lista.length ? ' (' + lista.length + ')' : '') + (escaneando ? ' · buscando…' : '')),
      h('div.row.wrap', { style: { gap: '6px', margin: '4px 0' } },
        desktop.on ? btn(escaneando ? 'Buscando…' : RECURSOS ? '↻ Volver a buscar' : '🔎 Buscar en RECURSOS', ev => buscarRecursos(ev.currentTarget, box), { cls: 'sm' }) : null,
        desktop.on ? btn('📂 Elegir carpeta', ev => buscarRecursos(ev.currentTarget, box, true), { cls: 'sm ghost' }) : null,
        btn('➕ Cargar .cube / .xmp', () => cargarIn.click(), { cls: 'sm ghost' }), cargarIn),
      lista.length ? h('div.row.wrap', { style: { gap: '6px', margin: '4px 0', alignItems: 'center' } },
        h('button.chip.sm' + (soloFav ? '.on' : ''), { type: 'button', 'data-solo-fav': '1', onclick: () => { soloFav = !soloFav; pintaMis(box); } }, '★ Favoritos' + (fav.size ? ' (' + lista.filter(x => fav.has(x.id)).length + ')' : '')),
        grupos.length > 1 ? sel([{ v: '', t: 'Todas las carpetas' }].concat(grupos.map(g => ({ v: g, t: g }))), grupoF, { 'aria-label': 'Carpeta de filtros', onchange: e => { grupoF = e.target.value; limiteF = 48; pintaLista(); } }) : null) : null,
      lista.length > 8 ? buscar : null,
      h('label.check.tiny', h('input', { type: 'checkbox', checked: verLog, onchange: e => { verLog = e.target.checked; pintaMis(box); } }), 'Mostrar también los LUT de vídeo LOG (se ven mal en fotos normales)'),
      listaEl, h('p.tiny.muted', '◆ LUT (.cube) · ◐ preset de Lightroom (.xmp, aproximado) · ★ favoritos primero. Se leen de tu carpeta: el programa no los copia.'));
    pintaLista();
  }
  // v13.10 · 🪄 Cambiar el fondo (recorte automático del producto) · v15.2: con IA y pincel
  async function recorteIA() {
    if (iaCtl || !st) return;
    const geo = JSON.stringify([st.rot, st.flip]);
    iaCtl = new AbortController(); iaMsg = 'Preparando la foto…'; pintaPanel();
    try {
      const m = await recortarConIA(transformed(src, st.rot, st.flip), { signal: iaCtl.signal, modelo: opIA().modelo === 'auto' ? '' : opIA().modelo, calidad: opIA().ultra ? 'ultra' : '', onStatus: t => { iaMsg = t; const e = panel.querySelector('.es-ia-msg'); if (e) e.textContent = t; } });
      if (!m) throw new Error('La IA no encontró nada que recortar en esta foto.');
      if (!st || JSON.stringify([st.rot, st.flip]) !== geo) throw new Error('Giraste la foto mientras se recortaba: vuelve a pulsar «✨ Quitar el fondo con IA».');
      apuntar();
      st.fondo = Object.assign({}, st.fondo, { ia: m, modo: 'ia', tipo: st.fondo.tipo === 'original' ? 'blanco' : st.fondo.tipo });
      toast('✨ Fondo quitado con IA' + (m.modelo ? ' (' + m.modelo + ')' : '') + '. Si algo no quedó bien, usa el pincel 🖌️.', 'ok', 6000);
    } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'bad', 9000); }
    finally { iaCtl = null; iaMsg = ''; avisoMask = false; pintaPanel(); pinta(); }
  }
  // Estado de la IA de recorte: en el PC (modelos, descarga con permiso) o en el móvil (si el PC del taller está encendido)
  async function pintaEstadoIA(box) {
    try {
      if (desktop.on) {
        const e = await desktop.motorEstado(false).catch(() => null) || await estadoMotor();
        if (!box.isConnected) return;
        if (!e || !e.listo) return box.replaceChildren(h('span', '⚠️ La IA de este PC no está lista (' + ((e && e.error) || 'falta el Python de EDITOR_VIDEO con OpenCV') + '). Mira «Centro de IA» para arreglarlo. Mientras, se usa el recorte por colores.'));
        const mods = e.modelos || [], bajando = mods.find(m => m.descarga && m.descarga.estado === 'descargando'), hay = mods.find(m => m.presente);
        if (bajando) { box.replaceChildren(h('span', '⬇️ Descargando ' + bajando.nombre + '… ' + Math.floor(100 * bajando.descarga.hecho / Math.max(1, bajando.descarga.total)) + ' %')); return setTimeout(() => pintaEstadoIA(box), 1500); }
        const fallo = mods.find(m => m.descarga && m.descarga.estado === 'error');
        if (hay) return box.replaceChildren(h('span', '🧠 IA de recorte lista en este PC: ' + hay.nombre + ' ✅'));
        const rec = mods[0];
        return box.replaceChildren(h('span', (fallo ? '⚠️ ' + fallo.descarga.error + '. ' : '') + '🧠 Para recortar pelo y bordes finos hace falta descargar UNA vez el modelo «' + rec.nombre + '» (' + MB(rec.bytes) + ' MB, uso comercial libre). Sin él se usa un recorte más sencillo.'),
          h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } },
            btn('⬇️ Descargar ahora', async () => { try { await desktop.motorDescargar(rec.id); pintaEstadoIA(box); } catch (x) { toast(x.message, 'bad'); } }, { cls: 'sm primary' }),
            btn('Después', () => box.replaceChildren(h('span', 'Vale. Lo puedes descargar cuando quieras desde aquí o desde «Centro de IA».')), { cls: 'sm ghost' })));
      }
      const w = await api('pc.servidor', {}, { quiet: true }).catch(() => null);
      if (box.isConnected) box.replaceChildren(h('span', w ? '🖥️ La IA la hace el PC del taller (' + w.dispositivo + ', encendido ✅). Tu foto viaja por el servidor del negocio.' : '🖥️ La IA la hace el PC del taller. Ahora no está encendido con el programa abierto: el encargo esperará a que lo enciendas.'));
    } catch (e) { }
  }
  // v15.4 · qué motor usa el recorte con IA (el mismo ajuste que «Quitar fondo» de Biouvision) y 💎 Ultra
  function opcionesIA() {
    const op = opIA(), s = sel(MOTORES_IA.map(([v, t]) => ({ v, t })), op.modelo, { 'aria-label': 'Motor de recorte', onchange: () => guardaOpIA(Object.assign(opIA(), { modelo: s.value })) });
    return h('div.row.wrap', { style: { gap: '8px', marginTop: '6px', alignItems: 'center' } }, h('span.tiny.muted', 'Motor:'), s,
      h('label.row.tiny', { style: { gap: '4px', alignItems: 'center' }, title: 'Pelo y bordes finos (tarda un poco más)' }, h('input', { type: 'checkbox', checked: op.ultra, onchange: e => guardaOpIA(Object.assign(opIA(), { ultra: e.target.checked })) }), '💎 Ultra'));
  }
  function seccionFondo() {
    const fd = st.fondo;
    const set = (k, v, panel) => { fd[k] = v; avisoMask = false; if (panel) pintaPanel(); pinta(); };
    const color = h('input', { type: 'color', value: fd.color, 'aria-label': 'Color del fondo', oninput: e => set('color', e.target.value) });
    const fotoIn = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, 'aria-label': 'Foto de fondo', onchange: async () => { const f = fotoIn.files[0]; fotoIn.value = ''; if (!f) return; try { fd.imagen = await cargar(f); set('tipo', 'foto', true); } catch (e) { toast(e.message, 'bad'); } } });
    const rng = (k, t, min, max, ayuda) => { const r = h('input', { type: 'range', min, max, value: fd[k], 'aria-label': t, title: ayuda, oninput: () => { val.textContent = r.value; set(k, Number(r.value)); } }), val = h('b.es-val', String(fd[k])); return h('label.es-bar', h('span', t), r, val); };
    const puedeIA = desktop.on || can('archivos.subir'), estadoIA = h('div.tiny.muted.es-ia-estado');
    if (puedeIA) setTimeout(() => pintaEstadoIA(estadoIA), 0);
    const modoPincel = k => { pincel = pincel === k ? null : k; pintaPanel(); pinta(); };
    const tamPincel = h('input', { type: 'range', min: 1, max: 12, value: Math.round(radioPincel * 100), 'aria-label': 'Tamaño del pincel', oninput: () => { radioPincel = Number(tamPincel.value) / 100; } });
    return h('div.es-sec.es-fondo', h('div.lbl', '🪄 Cambiar el fondo'),
      puedeIA ? h('div.es-ia', iaCtl
        ? h('div.row', { style: { gap: '8px', alignItems: 'center' } }, h('span.es-ia-msg.small', iaMsg || 'Quitando el fondo…'), btn('Cancelar', () => iaCtl && iaCtl.abort(), { cls: 'sm ghost' }))
        : btn(fd.modo === 'ia' && fd.ia ? '✨ Fondo quitado con IA · repetir' : '✨ Quitar el fondo con IA', () => recorteIA(), { cls: 'primary es-ia-btn', title: 'Recorte de calidad (pelo, dedos, bordes finos). Lo hace el PC del taller.' }),
        fd.modo === 'ia' && fd.ia ? h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } }, h('span.tiny.muted', 'Recorte:'),
          h('button.chip.sm.on', { type: 'button', 'data-modo': 'ia' }, '✨ IA'), h('button.chip.sm', { type: 'button', 'data-modo': 'color', onclick: () => { st.fondo = Object.assign({}, fd, { modo: 'color', ia: null }); pintaPanel(); pinta(); } }, 'Volver al de colores')) : null,
        iaCtl ? null : opcionesIA(), estadoIA) : null,
      h('div.row.wrap', { style: { gap: '6px' } }, FONDOS.map(([k, t]) => h('button.chip' + (fd.tipo === k ? '.on' : ''), { type: 'button', 'data-fondo': k, onclick: () => { if (k === 'foto' && !fd.imagen) return fotoIn.click(); set('tipo', k, true); } }, t))), fotoIn,
      fd.tipo !== 'original' ? h('div', { style: { marginTop: '8px' } },
        fd.tipo === 'color' || fd.tipo === 'degradado' ? h('label.row', { style: { gap: '8px', alignItems: 'center', marginBottom: '6px' } }, h('span.small', 'Color'), color, ['#ffffff', '#f3ece4', '#fde2e4', '#e2f0cb', '#dbeafe', '#ede9fe', '#1f2937'].map(c => h('button.es-sw', { type: 'button', style: { background: c }, title: c, onclick: () => { color.value = c; set('color', c); } }))) : null,
        fd.tipo === 'foto' ? btn('Cambiar la foto de fondo', () => fotoIn.click(), { cls: 'sm ghost' }) : null,
        fd.tipo === 'banco' ? h('div.es-banco', BANCO.map(([k, t]) => { const c = miniatura(k, 84, 60); return h('button.es-bf' + (fd.banco === k ? '.on' : ''), { type: 'button', 'data-banco': k, title: t, onclick: () => set('banco', k, true) }, c, h('span', t)); })) : null,
        fd.modo === 'ia' && fd.ia ? null : rng('tol', 'Recorte', 8, 70, 'Más alto = quita más fondo (si queda fondo alrededor). Más bajo = respeta más el producto.'),
        rng('suave', 'Borde suave', 0, 8, 'Suaviza el borde del recorte'),
        fd.tipo !== 'transparente' ? h('label.check', h('input', { type: 'checkbox', checked: fd.sombra, onchange: e => set('sombra', e.target.checked) }), 'Sombra suave debajo') : h('p.tiny.muted', 'Guárdala en PNG para mantener el fondo transparente.'),
        // 🖌️ pincel para corregir el recorte a mano
        h('div.es-pincel', h('div.small', { style: { fontWeight: 700, margin: '8px 0 4px' } }, '🖌️ Corregir el recorte con el dedo o el ratón'),
          h('div.row.wrap', { style: { gap: '6px', alignItems: 'center' } },
            h('button.chip' + (pincel === '+' ? '.on' : ''), { type: 'button', 'data-pincel': '+', onclick: () => modoPincel('+') }, '➕ Recuperar'),
            h('button.chip' + (pincel === '-' ? '.on' : ''), { type: 'button', 'data-pincel': '-', onclick: () => modoPincel('-') }, '➖ Borrar'),
            fd.trazos && fd.trazos.length ? btn('Quitar retoques', () => { st.fondo = Object.assign({}, fd, { trazos: [] }); pintaPanel(); pinta(); }, { cls: 'sm ghost' }) : null),
          pincel ? h('label.es-bar', h('span', 'Tamaño'), tamPincel) : null,
          pincel ? h('p.tiny.muted', 'Pinta sobre la foto. En rojo se ve lo que se quita. Pulsa otra vez el botón para terminar.') : null),
        fd.modo === 'ia' && fd.ia ? null : h('p.tiny.muted', 'Funciona mejor con el producto sobre un fondo liso. Si queda fondo, sube «Recorte»; si se come el producto, bájalo (o usa ✨ IA).')) : null);
  }
  // Pintar con el pincel: los trazos se guardan en coordenadas de la foto (no se pierden al cambiar el encuadre)
  pincelCapa.addEventListener('pointerdown', e => {
    if (!pincel || !st) return; e.preventDefault(); pincelCapa.setPointerCapture(e.pointerId);
    const r = cv.getBoundingClientRect(), cr = st.crop || { x: 0, y: 0, w: 1, h: 1 };
    const pt = ev => [cr.x + Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * cr.w, cr.y + Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)) * cr.h];
    const t = { modo: pincel, r: radioPincel * cr.w, pts: [pt(e)] };
    st.fondo = Object.assign({}, st.fondo, { trazos: [...(st.fondo.trazos || []), t] });
    pinta();
    const mv = ev => { t.pts.push(pt(ev)); pinta(); };
    const up = () => { pincelCapa.removeEventListener('pointermove', mv); pincelCapa.removeEventListener('pointerup', up); pincelCapa.removeEventListener('pointercancel', up); if (!panel.querySelector('.es-pincel button.ghost')) pintaPanel(); };
    pincelCapa.addEventListener('pointermove', mv); pincelCapa.addEventListener('pointerup', up); pincelCapa.addEventListener('pointercancel', up);
  });
  // al girar o voltear, el recorte de la IA y los trazos del pincel ya no encajan (se pueden recuperar con ↶ Deshacer)
  function sinRecorte() { const fd = st.fondo; if (fd.ia || (fd.trazos && fd.trazos.length)) { st.fondo = Object.assign({}, fd, { ia: null, trazos: [] }); if (fd.ia) toast('Has girado la foto: pulsa otra vez «✨ Quitar el fondo con IA».', 'warn', 6000); } }
  function pintaPanel() {
    if (!st) return mount(panel, h('p.small.muted', 'Abre una foto para empezar.'));
    const barra = ([k, t]) => { const r = h('input', { type: 'range', min: k === 'nitidez' || k === 'vineta' ? 0 : -100, max: 100, value: st.adj[k], 'aria-label': t, oninput: () => { st.adj[k] = Number(r.value); val.textContent = r.value; pinta(); } }), val = h('b.es-val', String(st.adj[k]));
      return h('label.es-bar', h('span', t), r, val); };
    const ver = btn('👁 Ver original', null, { cls: 'sm ghost es-ver' });
    const on = () => { verOriginal = true; pinta(); }, off = () => { verOriginal = false; pinta(); };
    ver.addEventListener('pointerdown', on); ver.addEventListener('pointerup', off); ver.addEventListener('pointerleave', off);
    mount(panel,
      btn(st.auto ? '✨ Mejorada (pulsa para quitar)' : '✨ Mejorar automáticamente', () => { if (st.auto) { st.auto = null; pintaPanel(); pinta(); } else mejorar(); }, { cls: 'primary es-mejorar' + (st.auto ? ' on' : '') }),
      h('div.es-sec', h('div.lbl', 'Estilo'), h('div.row.wrap', { style: { gap: '6px' } }, ESTILOS.map(([k, t, v]) => h('button.chip' + (st.estilo === k ? '.on' : ''), { type: 'button', onclick: () => { st.estilo = k; st.adj = Object.assign(CERO(), v); pintaPanel(); pinta(); } }, t)))),
      seccionCara(),
      seccionFiltros(),
      seccionFondo(),
      h('div.es-sec', h('div.lbl', 'Ajustes'), AJ.map(barra)),
      h('div.es-sec', h('div.lbl', 'Girar y encuadrar'), h('div.row.wrap', { style: { gap: '6px' } },
        btn('⟲', () => { st.rot--; st.crop = null; st.ratio = 0; sinRecorte(); previa(); pintaPanel(); pinta(); }, { cls: 'sm', title: 'Girar a la izquierda' }), btn('⟳', () => { st.rot++; st.crop = null; st.ratio = 0; sinRecorte(); previa(); pintaPanel(); pinta(); }, { cls: 'sm', title: 'Girar a la derecha' }),
        btn('⇋', () => { st.flip = !st.flip; sinRecorte(); previa(); pintaPanel(); pinta(); }, { cls: 'sm', title: 'Voltear' })),
        h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } }, RAT.map(([v, t]) => h('button.chip' + (String(st.ratio) === v || (!st.ratio && v === '0') ? '.on' : ''), { type: 'button', onclick: () => encuadre(v) }, t))),
        st.crop ? h('div.row.wrap', { style: { gap: '4px', marginTop: '6px' } }, h('span.tiny.muted', 'Mover encuadre:'), btn('←', () => mover(-0.04, 0), { cls: 'sm' }), btn('→', () => mover(0.04, 0), { cls: 'sm' }), btn('↑', () => mover(0, -0.04), { cls: 'sm' }), btn('↓', () => mover(0, 0.04), { cls: 'sm' })) : null),
      h('div.row.wrap', { style: { gap: '6px' } }, ver, btn('Deshacer todo', () => { st = Object.assign(nuevoEstado()); caraKey = ''; previa(); pintaPanel(); pinta(); }, { cls: 'sm ghost' })),
      h('div.es-sec.es-guardar', h('div.lbl', 'Guardar (tamaño original)'),
        h('div.row.wrap', { style: { gap: '6px' } }, btn('⬇️ JPG máxima calidad', ev => guardar('jpg', ev.target.closest('button')), { cls: 'primary sm' }), btn('⬇️ PNG sin pérdida', ev => guardar('png', ev.target.closest('button')), { cls: 'sm' }),
          can('archivos.subir') ? btn('🧩 Guardar en un producto', ev => aProducto(ev.target.closest('button')), { cls: 'sm' }) : null, btn('📤 Compartir', ev => compartir(ev.target.closest('button')), { cls: 'sm ghost' }),
          can('redes.ver') ? btn('📸 Enviar a Instagram', ev => aInstagram(ev.target.closest('button')), { cls: 'sm es-ig' }) : null),
        h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } }, btn('🎬 Vídeo de 3 s (movimiento suave)', ev => videoFoto(ev.target.closest('button')), { cls: 'sm' }))));
  }
  pintaPanel();
  const onR = () => { if (src) { previa(); pinta(); } }; addEventListener('resize', onR);
  return { destroy: () => { removeEventListener('resize', onR); quitaTeclas(); clearTimeout(tApunte); if (iaCtl) iaCtl.abort(); }, abrir: f => abrir(f) };
}
