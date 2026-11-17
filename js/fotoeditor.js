// ================= v12.2 · EDITOR BÁSICO DE FOTOS =================
// Para dejar listas las fotos antes de subirlas (producto, tienda, anuncios): girar, voltear, recortar (libre o con proporción),
// brillo, contraste, color, calidez, «Mejorar» automático y tamaño/formato de salida. Todo ocurre en este dispositivo: la foto
// no sale a ningún servicio externo y la ORIGINAL nunca se modifica (se crea una copia nueva).
import { h, btn, modal, toast, sel } from './ui.js';
import { historial, teclasDeshacer } from './biou/pro.js'; // v15.2: deshacer / rehacer

// ---------- Proceso de imagen (puro: se puede probar sin pantalla) ----------
export const DEF_ADJ = { brillo: 0, contraste: 0, saturacion: 0, calidez: 0 };
const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;

// Ajusta un ImageData en su sitio. levels = {lo, hi} (estirado de niveles del «Mejorar»).
export function applyAdjust(img, adj, levels) {
  const a = Object.assign({}, DEF_ADJ, adj || {}), d = img.data;
  const noAdj = !a.brillo && !a.contraste && !a.saturacion && !a.calidez && !levels;
  if (noAdj) return img;
  const add = a.brillo * 2.55, c = a.contraste * 2.55, f = (259 * (c + 255)) / (255 * (259 - c)), sat = 1 + a.saturacion / 100, w = a.calidez * 0.3;
  const lo = levels ? levels.lo : 0, sc = levels ? 255 / Math.max(1, levels.hi - levels.lo) : 1;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (levels) { r = (r - lo) * sc; g = (g - lo) * sc; b = (b - lo) * sc; }
    r += add; g += add; b += add;
    if (c) { r = f * (r - 128) + 128; g = f * (g - 128) + 128; b = f * (b - 128) + 128; }
    if (a.saturacion) { const y = 0.299 * r + 0.587 * g + 0.114 * b; r = y + (r - y) * sat; g = y + (g - y) * sat; b = y + (b - y) * sat; }
    if (w) { r += w; b -= w; }
    d[i] = clamp(r); d[i + 1] = clamp(g); d[i + 2] = clamp(b);
  }
  return img;
}
// «Mejorar»: estira el histograma entre el 1 % y el 99 % de luminosidad (sin inventar nada: solo corrige poca luz o neblina)
export function autoLevels(img) {
  const d = img.data, hist = new Uint32Array(256); let n = 0;
  for (let i = 0; i < d.length; i += 16) { hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++; n++; }
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.01) { lo = v; break; } }
  acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.01) { hi = v; break; } }
  return hi - lo < 40 ? null : { lo, hi };
}
// Gira (múltiplos de 90°) y voltea: devuelve un canvas nuevo
export function transformed(src, rot, flip) {
  const sw = src.width, sh = src.height, q = ((rot % 4) + 4) % 4, c = document.createElement('canvas');
  c.width = q % 2 ? sh : sw; c.height = q % 2 ? sw : sh;
  const g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.rotate(q * Math.PI / 2); if (flip) g.scale(-1, 1); g.drawImage(src, -sw / 2, -sh / 2);
  return c;
}
// Foto final: transformar → recortar → ajustar → reducir. crop = fracciones {x,y,w,h} de la imagen girada
export function render(src, st, maxSide) {
  const t = transformed(src, st.rot, st.flip), cr = st.crop || { x: 0, y: 0, w: 1, h: 1 };
  const cx = Math.round(cr.x * t.width), cy = Math.round(cr.y * t.height), cw = Math.max(1, Math.round(cr.w * t.width)), ch = Math.max(1, Math.round(cr.h * t.height));
  const sc = maxSide && Math.max(cw, ch) > maxSide ? maxSide / Math.max(cw, ch) : 1, out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(cw * sc)); out.height = Math.max(1, Math.round(ch * sc));
  const g = out.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(t, cx, cy, cw, ch, 0, 0, out.width, out.height);
  const img = g.getImageData(0, 0, out.width, out.height); applyAdjust(img, st.adj, st.levels); g.putImageData(img, 0, 0);
  return out;
}

const FORMATOS = { jpeg: ['JPG (ligera, para fotos)', 'image/jpeg', 'jpg', 0.9], webp: ['WebP (más ligera)', 'image/webp', 'webp', 0.9], png: ['PNG (sin pérdida, pesa más)', 'image/png', 'png'] };
const PROP = [['', 'Libre'], ['1', '1:1 cuadrada'], ['1.25', '4:5 vertical'], ['0.8', '5:4'], ['1.3333', '4:3'], ['1.7778', '16:9']];
const MAXES = [['0', 'Tamaño original'], ['2400', 'Grande (2400 px)'], ['1600', 'Media (1600 px)'], ['1200', 'Web (1200 px)']];

async function load(file) {
  if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { } }
  return await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { res(im); }; im.onerror = () => rej(new Error('No se pudo abrir la imagen.')); im.src = u; });
}

// ---------- Ventana del editor ----------
// editPhoto(file, { titulo, aceptar }) → Promise<File | null>  (null = cancelado u omitido)
export async function editPhoto(file, opts = {}) {
  let src;
  try { src = await load(file); } catch (e) { toast(e.message, 'bad'); return null; }
  return new Promise(resolve => {
    const st = { rot: 0, flip: false, crop: null, adj: Object.assign({}, DEF_ADJ), levels: null, fmt: /png$/i.test(file.type) && file.size < 600000 ? 'png' : 'jpeg', max: 2400, ratio: 0 };
    let tcv = transformed(src, 0, false), prev = null, dw = 0, dh = 0, box = null; // box: recorte en px de pantalla
    const stage = h('div.fe-stage'), cv = h('canvas.fe-cv'), ov = h('div.fe-ov', { tabindex: -1 });
    stage.append(cv, ov);
    const info = h('div.tiny.muted');
    const fit = () => { // vista previa reducida (rápida) de la imagen girada
      tcv = transformed(src, st.rot, st.flip);
      const mw = Math.min(760, innerWidth - 80), mh = Math.min(460, innerHeight * 0.5), sc = Math.min(1, mw / tcv.width, mh / tcv.height);
      dw = Math.max(40, Math.round(tcv.width * sc)); dh = Math.max(40, Math.round(tcv.height * sc));
      prev = document.createElement('canvas'); prev.width = dw; prev.height = dh; prev.getContext('2d', { willReadFrequently: true }).drawImage(tcv, 0, 0, dw, dh);
      cv.width = dw; cv.height = dh; stage.style.width = dw + 'px'; stage.style.height = dh + 'px';
    };
    const paint = () => {
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(prev, 0, 0);
      const img = g.getImageData(0, 0, dw, dh); applyAdjust(img, st.adj, st.levels); g.putImageData(img, 0, 0);
      const b = box || { x: 0, y: 0, w: dw, h: dh };
      ov.replaceChildren(...(box ? [
        h('i.fe-shade', { style: { left: 0, top: 0, width: dw + 'px', height: b.y + 'px' } }), h('i.fe-shade', { style: { left: 0, top: b.y + b.h + 'px', width: dw + 'px', height: dh - b.y - b.h + 'px' } }),
        h('i.fe-shade', { style: { left: 0, top: b.y + 'px', width: b.x + 'px', height: b.h + 'px' } }), h('i.fe-shade', { style: { left: b.x + b.w + 'px', top: b.y + 'px', width: dw - b.x - b.w + 'px', height: b.h + 'px' } }),
        h('div.fe-box', { style: { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' } }, ['nw', 'ne', 'sw', 'se'].map(k => h('b.fe-h.' + k, { dataset: { h: k } })))] : []));
      st.crop = box ? { x: b.x / dw, y: b.y / dh, w: b.w / dw, h: b.h / dh } : null;
      const cw = Math.round((st.crop ? st.crop.w : 1) * tcv.width), ch = Math.round((st.crop ? st.crop.h : 1) * tcv.height), sc = st.max && Math.max(cw, ch) > st.max ? st.max / Math.max(cw, ch) : 1;
      info.textContent = 'Original ' + src.width + ' × ' + src.height + ' → resultado ' + Math.round(cw * sc) + ' × ' + Math.round(ch * sc) + ' px';
      clearTimeout(tA); tA = setTimeout(apunta, 350);
    };
    // v15.2 · ↶ Deshacer / ↷ Rehacer (Ctrl+Z / Ctrl+Y): cada cambio es un paso
    let tA = 0;
    const foto = () => ({ rot: st.rot, flip: st.flip, adj: Object.assign({}, st.adj), levels: st.levels, ratio: st.ratio, fmt: st.fmt, max: st.max, box: box ? Object.assign({}, box) : null });
    const bU = btn('↶ Deshacer', () => deshacer(), { cls: 'sm', title: 'Deshacer (Ctrl+Z)' }), bR = btn('↷ Rehacer', () => rehacer(), { cls: 'sm', title: 'Rehacer (Ctrl+Y)' });
    bU.setAttribute('aria-label', 'Deshacer'); bR.setAttribute('aria-label', 'Rehacer'); bU.disabled = bR.disabled = true;
    const hist = historial(e => { bU.disabled = !e.atras; bR.disabled = !e.adelante; });
    const apunta = () => { clearTimeout(tA); hist.apuntar(foto()); };
    const vuelve = s2 => {
      if (!s2) return;
      const geo = s2.rot !== st.rot || s2.flip !== st.flip;
      Object.assign(st, { rot: s2.rot, flip: s2.flip, adj: Object.assign({}, s2.adj), levels: s2.levels, ratio: s2.ratio, fmt: s2.fmt, max: s2.max });
      if (geo) fit();
      box = s2.box;
      sliders.forEach(x => { const i = x.querySelector('input'); i.value = st.adj[i.dataset.k] || 0; });
      ratioSel.value = (PROP.find(([v]) => Number(v) === st.ratio && st.ratio) || [''])[0]; fmtSel.value = st.fmt; maxSel.value = String(st.max);
      paint(); clearTimeout(tA);
    };
    const deshacer = () => { apunta(); vuelve(hist.atras()); }, rehacer = () => { apunta(); vuelve(hist.adelante()); };
    const quitaTeclas = teclasDeshacer(deshacer, rehacer);
    const redraw = () => { fit(); box = null; paint(); };
    // ----- recorte con el ratón/dedo -----
    const pt = e => { const r = stage.getBoundingClientRect(); return { x: Math.min(dw, Math.max(0, e.clientX - r.left)), y: Math.min(dh, Math.max(0, e.clientY - r.top)) }; };
    const fitRatio = (ax, ay, px, py) => { // rectángulo entre ancla y punto respetando la proporción
      let w = Math.abs(px - ax), hh = Math.abs(py - ay); const sx = px >= ax ? 1 : -1, sy = py >= ay ? 1 : -1;
      if (st.ratio) { if (w / st.ratio > hh) hh = w / st.ratio; else w = hh * st.ratio; const mx = sx > 0 ? dw - ax : ax, my = sy > 0 ? dh - ay : ay; const k = Math.min(1, mx / w, my / hh); w *= k; hh *= k; }
      return { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - hh, w, h: hh };
    };
    let drag = null;
    ov.addEventListener('pointerdown', e => {
      const p = pt(e), hd = e.target.dataset && e.target.dataset.h;
      if (hd && box) { drag = { m: 'size', ax: hd.includes('w') ? box.x + box.w : box.x, ay: hd.includes('n') ? box.y + box.h : box.y }; }
      else if (box && p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h) drag = { m: 'move', dx: p.x - box.x, dy: p.y - box.y };
      else drag = { m: 'new', ax: p.x, ay: p.y };
      try { ov.setPointerCapture(e.pointerId); } catch (x) { } e.preventDefault();
    });
    ov.addEventListener('pointermove', e => {
      if (!drag) return; const p = pt(e);
      if (drag.m === 'move') box = { x: Math.min(dw - box.w, Math.max(0, p.x - drag.dx)), y: Math.min(dh - box.h, Math.max(0, p.y - drag.dy)), w: box.w, h: box.h };
      else { const r = fitRatio(drag.ax, drag.ay, p.x, p.y); if (r.w > 3 && r.h > 3) box = r; }
      paint();
    });
    const up = () => { if (drag && box && (box.w < 12 || box.h < 12)) { box = null; paint(); } drag = null; };
    ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', up);
    const setRatio = v => { st.ratio = Number(v) || 0; if (!st.ratio) return; // caja centrada lo más grande posible con esa proporción
      let w = dw, hh = w / st.ratio; if (hh > dh) { hh = dh; w = hh * st.ratio; } box = { x: (dw - w) / 2, y: (dh - hh) / 2, w, h: hh }; paint(); };
    // ----- controles -----
    const slider = (k, label) => { const inpR = h('input', { type: 'range', min: -100, max: 100, value: 0, 'aria-label': label, oninput: () => { st.adj[k] = Number(inpR.value); st.levels = st.levels; paint(); } }); inpR.dataset.k = k; return h('label.fe-sl', h('span', label), inpR); };
    const sliders = [slider('brillo', 'Brillo'), slider('contraste', 'Contraste'), slider('saturacion', 'Color'), slider('calidez', 'Calidez')];
    const resetAdj = () => { st.adj = Object.assign({}, DEF_ADJ); st.levels = null; sliders.forEach(s => { s.querySelector('input').value = 0; }); };
    const ratioSel = sel(PROP.map(([v, t]) => ({ v, t })), '', { 'aria-label': 'Proporción del recorte', onchange: () => setRatio(ratioSel.value) });
    const fmtSel = sel(Object.keys(FORMATOS).map(k => ({ v: k, t: FORMATOS[k][0] })), st.fmt, { 'aria-label': 'Formato', onchange: () => { st.fmt = fmtSel.value; } });
    const maxSel = sel(MAXES.map(([v, t]) => ({ v, t })), String(st.max), { 'aria-label': 'Tamaño', onchange: () => { st.max = Number(maxSel.value); paint(); } });
    const body = h('div.col.fe', { style: { gap: '10px' } },
      opts.aviso ? h('p.small.muted', opts.aviso) : null,
      h('div.row', { style: { gap: '6px', justifyContent: 'center' } }, bU, bR),
      h('div.fe-wrap', stage),
      h('div.row.wrap', { style: { gap: '6px', justifyContent: 'center' } },
        btn('Girar ⟲', () => { st.rot--; redraw(); }, { cls: 'sm', title: 'Girar a la izquierda' }), btn('Girar ⟳', () => { st.rot++; redraw(); }, { cls: 'sm', title: 'Girar a la derecha' }), btn('Voltear ⇋', () => { st.flip = !st.flip; redraw(); }, { cls: 'sm' }),
        ratioSel, btn('Quitar recorte', () => { box = null; ratioSel.value = ''; st.ratio = 0; paint(); }, { cls: 'sm ghost' })),
      h('p.tiny.muted', { style: { textAlign: 'center' } }, 'Arrastra sobre la foto para recortar · arrastra el recuadro para moverlo · las esquinas cambian el tamaño'),
      h('div.fe-sliders', sliders),
      h('div.row.wrap', { style: { gap: '6px', justifyContent: 'center' } },
        btn('✨ Mejorar', () => { const g = prev.getContext('2d'); const lv = autoLevels(g.getImageData(0, 0, dw, dh)); if (!lv) toast('La foto ya está bien de luz: no hace falta mejorar.', 'ok'); st.levels = lv; paint(); }, { cls: 'sm' }),
        btn('Deshacer ajustes', () => { resetAdj(); paint(); }, { cls: 'sm ghost' })),
      h('div.row.wrap', { style: { gap: '8px', justifyContent: 'center' } }, fmtSel, maxSel), info);
    let done = false;
    const fin = v => { quitaTeclas(); clearTimeout(tA); if (!done) { done = true; resolve(v); } };
    const m = modal(opts.titulo || 'Editar foto', body, close => [
      btn(opts.omitir || 'Cancelar', () => { fin(null); close(); }),
      btn(opts.aceptar || 'Usar esta foto', async ev => {
        const b = ev.target.closest('button'); b.disabled = true;
        try {
          const f = FORMATOS[st.fmt], out = render(src, st, st.max);
          const blob = await new Promise((res, rej) => out.toBlob(x => x ? res(x) : rej(new Error('No se pudo crear la imagen.')), f[1], f[3]));
          const base = String(file.name || 'foto').replace(/\.[^.]+$/, '');
          fin(new File([blob], base + (opts.sufijo === undefined ? '_editada' : opts.sufijo) + '.' + f[2], { type: f[1], lastModified: Date.now() }));
          close();
        } catch (e) { toast(e.message, 'bad'); b.disabled = false; }
      }, { cls: 'primary', icon: 'image' })], { size: 'wide', sticky: false, onclose: () => fin(null) });
    redraw(); hist.vaciar(foto());
  });
}
