// ================= v15.3 · REELS: vista previa al momento (en cualquier aparato) =================
// Dibuja en un lienzo lo mismo que hará Remotion en el PC (mismas escenas, colores, tiempos y transiciones), con
// animaciones parecidas. Sirve para editar rápido (también en el móvil); el vídeo final lo hace el PC.
import { estiloDe, tiempos, duracion, FORMATOS } from './modelo.js';

const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = x => 1 - Math.pow(1 - cl(x), 3);
const easeBack = x => { x = cl(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const trozos = t => String(t || '').split(/(\*[^*]+\*)/).filter(Boolean).flatMap(p => { const r = /^\*(.+)\*$/.exec(p), x = r ? r[1] : p; return x.split(/\s+/).filter(Boolean).map(w => ({ w, res: !!r })); });

function fondo(g, W, H, e, clave, t) {
  if (clave === 'premium') {
    const r = g.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, H * 0.8); r.addColorStop(0, e.fondo2); r.addColorStop(1, e.fondo); g.fillStyle = r; g.fillRect(0, 0, W, H);
    const x = ((t * 0.25) % 1.6 - 0.3) * W, l = g.createLinearGradient(x - W * 0.25, 0, x + W * 0.25, H * 0.2);
    l.addColorStop(0, 'rgba(212,175,55,0)'); l.addColorStop(0.5, 'rgba(212,175,55,.10)'); l.addColorStop(1, 'rgba(212,175,55,0)'); g.fillStyle = l; g.fillRect(0, 0, W, H);
  } else if (clave === 'oferta') {
    g.fillStyle = e.fondo; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.rotate(t * 0.35 * Math.PI / 180 * 30); g.fillStyle = e.fondo2; g.globalAlpha = 0.55;
    const R = Math.hypot(W, H); for (let i = 0; i < 36; i += 2) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, i * Math.PI / 18, (i + 1) * Math.PI / 18); g.fill(); }
    g.restore(); g.globalAlpha = 1;
  } else {
    const l = g.createLinearGradient(0, 0, W * 0.3, H); l.addColorStop(0, e.fondo); l.addColorStop(1, e.fondo2); g.fillStyle = l; g.fillRect(0, 0, W, H);
  }
}
// Texto con palabras resaltadas, en varias líneas, centrado en (cx, cy). anim: 0..1 por palabra (o null)
function texto(g, txt, cx, cy, maxW, tam, e, { color, fuente, peso, mayus, anim, alpha = 1, sombra } = {}) {
  const ws = trozos(mayus ? String(txt || '').toUpperCase() : txt); if (!ws.length) return 0;
  g.font = (peso || e.pesoTitulo) + ' ' + tam + 'px ' + (fuente || e.fuenteTitulo); g.textBaseline = 'middle';
  const sp = g.measureText(' ').width, lineas = [[]]; let w = 0;
  ws.forEach(p => { const ww = g.measureText(p.w).width; if (w + ww > maxW && lineas[lineas.length - 1].length) { lineas.push([]); w = 0; } lineas[lineas.length - 1].push(Object.assign(p, { ww })); w += ww + sp; });
  const lh = tam * 1.15, y0 = cy - (lineas.length - 1) * lh / 2; let k = 0;
  if (sombra) { g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = tam * 0.35; g.shadowOffsetY = tam * 0.08; }
  lineas.forEach((ln, i) => {
    const tot = ln.reduce((a, p) => a + p.ww, 0) + sp * (ln.length - 1); let x = cx - tot / 2;
    ln.forEach(p => { const a = anim ? anim(k++) : 1; g.globalAlpha = alpha * cl(a * 1.4); g.fillStyle = p.res ? e.acento : (color || e.texto); g.fillText(p.w, x, y0 + i * lh + (1 - cl(a)) * tam * 0.4); x += p.ww + sp; });
  });
  g.globalAlpha = 1; g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  return lineas.length * lh;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function foto(g, im, x, y, w, h, zoom = 1, dx = 0, cubrir = true) {
  if (!im) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, y, w, h); return; }
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, s = (cubrir ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih)) * zoom;
  g.drawImage(im, x + (w - iw * s) / 2 + dx * w, y + (h - ih * s) / 2, iw * s, ih * s);
}
const clave = p => (p.estilo in { minimal: 1, premium: 1, oferta: 1 } ? p.estilo : 'minimal');

function escena(g, W, H, p, s, u, d, imgs, logo) {
  const e = estiloDe(p), k = clave(p), rebote = k === 'oferta', ent = x => (rebote ? easeBack : easeOut)(x), base = W / 1080;
  const anim = (ret = 0) => i => ent((u - ret - i * 0.1) / 0.55);
  fondo(g, W, H, e, k, u);
  const im = s.foto ? imgs.get(s.foto.id || s.foto.local) : null;
  const tt = (txt, cy, tam, o = {}) => texto(g, txt, W / 2, cy, W * 0.86, tam * base, e, Object.assign({ mayus: e.mayus, sombra: k !== 'minimal', anim: k === 'minimal' ? anim(o.ret || 0) : i => ent((u - (o.ret || 0)) / 0.5) }, o));
  if (s.tipo === 'logo') {
    const a = ent(u / 0.7);
    if (logo) { const lw = W * 0.42 * lerp(0.75, 1, a); g.globalAlpha = cl(a); foto(g, logo, (W - lw) / 2, H * 0.5 - lw * 0.65, lw, lw, 1, 0, false); g.globalAlpha = 1; }
    tt(s.texto || p.__marca || '', logo ? H * 0.5 + W * 0.14 : H / 2, logo ? 64 : 110, { mayus: k !== 'minimal', ret: logo ? 0.3 : 0 });
    if (k === 'premium') { g.fillStyle = e.acento; const lw = W * 0.36 * cl((u - 0.25) / 0.7); g.fillRect((W - lw) / 2, H * 0.5 + W * (logo ? 0.22 : 0.1), lw, 2 * base); }
  } else if (s.tipo === 'producto') {
    const a = ent(u / 0.8), z = s.mov === 'alejar' ? lerp(1.12, 1, u / d) : s.mov === 'quieto' ? 1 : lerp(1, 1.09, u / d), dx = s.mov === 'panor' ? lerp(-0.04, 0.04, u / d) : 0;
    if (k === 'premium' && im) { g.save(); g.filter = 'blur(' + Math.round(40 * base) + 'px) brightness(.35)'; foto(g, im, -W * 0.1, -H * 0.1, W * 1.2, H * 1.2); g.restore(); g.filter = 'none'; }
    const fw = W * (k === 'premium' ? 0.78 : 0.84), fh = H * (p.formato === '9:16' ? 0.56 : 0.5), x = (W - fw) / 2, y = H * 0.1 + (1 - a) * 140 * base;
    g.save(); g.globalAlpha = cl(a * 1.3); g.translate(W / 2, y + fh / 2); g.scale(lerp(0.86, 1, a), lerp(0.86, 1, a)); if (k === 'oferta') g.rotate(lerp(-8, -2, a) * Math.PI / 180); g.translate(-W / 2, -(y + fh / 2));
    g.shadowColor = k === 'minimal' ? 'rgba(60,40,20,.2)' : 'rgba(0,0,0,.45)'; g.shadowBlur = 60 * base; g.shadowOffsetY = 30 * base;
    rr(g, x, y, fw, fh, (k === 'premium' ? 6 : k === 'oferta' ? 36 : 28) * base); g.fillStyle = '#fff'; g.fill(); g.shadowColor = 'transparent';
    g.save(); g.clip(); foto(g, im, x, y, fw, fh, z, dx, s.ajuste !== 'entera'); g.restore();
    if (k !== 'minimal') { g.lineWidth = (k === 'oferta' ? 10 : 2) * base; g.strokeStyle = k === 'oferta' ? '#fff' : e.acento; g.stroke(); }
    g.restore();
    let yy = H * (im ? 0.69 : 0.4) + 50 * base;
    if (s.titulo) yy += tt(s.titulo, yy, s.titulo.length > 26 ? 70 : 88, { ret: 0.25 }) * 0.5 + 40 * base;
    if (s.texto) texto(g, s.texto, W / 2, yy + 20 * base, W * 0.86, 50 * base, e, { color: e.suave, fuente: e.fuente, peso: e.peso, alpha: cl((u - 0.5) / 0.4) });
  } else if (s.tipo === 'precio') {
    if (im) { g.save(); g.globalAlpha = k === 'minimal' ? 0.22 : 0.3; g.filter = 'blur(6px)'; foto(g, im, 0, 0, W, H); g.restore(); g.filter = 'none'; }
    const a = ent((u - (s.texto ? 0.25 : 0)) / 0.6), cy = H / 2 + (s.texto ? 90 * base : 0);
    if (s.texto) tt(s.texto, H / 2 - 220 * base, 76);
    g.save(); g.translate(W / 2, cy); g.scale(cl(a, 0, 1.3), cl(a, 0, 1.3)); g.globalAlpha = cl(a * 1.5);
    if (k === 'oferta') { g.rotate(-8 * Math.PI / 180); g.fillStyle = e.acento; g.beginPath(); for (let i = 0; i < 48; i++) { const r = (i % 2 ? 0.82 : 1) * 230 * base, an = i * Math.PI / 24; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill(); }
    if (s.antes) { g.font = '600 ' + 54 * base + 'px ' + e.fuente; g.fillStyle = k === 'oferta' ? '#111' : e.suave; g.textAlign = 'center'; g.fillText(s.antes, 0, -95 * base); const mw = g.measureText(s.antes).width; g.fillRect(-mw / 2, -95 * base, mw, 4 * base); }
    g.font = (k === 'oferta' ? 900 : 800) + ' ' + (k === 'premium' ? 120 : 104) * base + 'px ' + e.fuenteTitulo; g.textAlign = 'center'; g.textBaseline = 'middle';
    const pw = g.measureText(s.precio || '').width;
    if (k === 'minimal') { rr(g, -pw / 2 - 56 * base, -70 * base, pw + 112 * base, 140 * base, 70 * base); g.fillStyle = e.acento; g.fill(); g.fillStyle = '#fff'; }
    else g.fillStyle = k === 'oferta' ? '#111' : e.acento;
    g.fillText(s.precio || '', 0, 0);
    if (k === 'premium') { g.fillStyle = e.acento; g.fillRect(-pw / 2, 80 * base, pw, 2 * base); }
    g.restore(); g.textAlign = 'start';
  } else if (s.tipo === 'cta') {
    const a = ent((u - 0.13) / 0.6), lat = 1 + 0.04 * Math.sin(Math.max(0, u - 0.5) * 6);
    g.font = e.pesoTitulo + ' ' + 72 * base + 'px ' + e.fuenteTitulo; const txt = ((e.mayus || k === 'premium') ? String(s.texto || '').toUpperCase() : s.texto || '') + '  →', tw = Math.min(W * 0.86, g.measureText(txt).width + 140 * base), th = 150 * base;
    g.save(); g.translate(W / 2, H / 2 - 30 * base); g.scale(a * lat, a * lat); g.globalAlpha = cl(a * 1.5);
    rr(g, -tw / 2, -th / 2, tw, th, (k === 'premium' ? 8 : 75) * base);
    if (k === 'premium') { g.lineWidth = 3 * base; g.strokeStyle = e.acento; g.stroke(); g.fillStyle = e.acento; }
    else { g.fillStyle = k === 'oferta' ? '#fff' : e.acento; g.fill(); g.fillStyle = k === 'oferta' ? e.fondo : '#fff'; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 0, tw - 60 * base); g.restore(); g.textAlign = 'start';
    if (s.sub) texto(g, s.sub, W / 2, H / 2 + 120 * base, W * 0.86, 52 * base, e, { color: e.suave, fuente: e.fuente, peso: 600, alpha: cl((u - 0.5) / 0.4) });
  } else {
    if (im) { g.globalAlpha = 0.35; foto(g, im, 0, 0, W, H); g.globalAlpha = 1; }
    const largo = String(s.texto || '').length > 40;
    tt(s.texto, H / 2, s.tipo === 'gancho' ? (largo ? 92 : 112) : 78);
  }
  // logo pequeño en la esquina
  if (logo && p.marcaAgua !== false && s.tipo !== 'logo' && s.tipo !== 'cta') { g.globalAlpha = 0.85 * cl(u / 0.6); const lw = W * 0.13; foto(g, logo, W - W * 0.05 - lw, W * 0.06, lw, lw, 1, 0, false); g.globalAlpha = 1; }
}

// Dibuja el fotograma del segundo t
export function dibujar(g, W, H, p, t, imgs, logo) {
  const e = estiloDe(p), T = tiempos(p), tr = e.tTrans;
  if (!T.length) { g.fillStyle = e.fondo; g.fillRect(0, 0, W, H); return; }
  let i = T.findIndex(x => t < x.fin); if (i < 0) i = T.length - 1;
  const s = p.escenas[i], u = t - T[i].ini, d = T[i].fin - T[i].ini;
  // ¿estamos en la transición con la siguiente?
  const sig = p.escenas[i + 1], enTr = sig && t > T[i].fin - tr;
  if (!enTr) return escena(g, W, H, p, s, u, d, imgs, logo);
  const k = cl((t - (T[i].fin - tr)) / tr), u2 = t - T[i + 1].ini, d2 = T[i + 1].fin - T[i + 1].ini;
  escena(g, W, H, p, s, u, d, imgs, logo);
  g.save();
  if (e.transicion === 'slide') { g.translate(W * (1 - easeOut(k)), 0); }
  else if (e.transicion === 'wipe') { g.beginPath(); g.rect(0, 0, W * k, H); g.clip(); }
  else g.globalAlpha = k;
  escena(g, W, H, p, sig, u2, d2, imgs, logo);
  g.restore(); g.globalAlpha = 1;
}

// Reproductor en un lienzo: play / pausa / ir a un segundo
export function reproductor(cv, obtener) {
  let t = 0, play = false, raf = 0, last = 0;
  const alCambiar = new Set();
  const pinta = () => {
    const { p, imgs, logo } = obtener(); if (!p) return;
    const f = FORMATOS[p.formato] || FORMATOS['9:16'], k = Math.min(1, 720 / f.alto);
    const W = Math.round(f.ancho * k), H = Math.round(f.alto * k);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = cv.getContext('2d'); g.save(); g.scale(k, k); dibujar(g, f.ancho, f.alto, p, t, imgs, logo); g.restore();
    alCambiar.forEach(fn => fn(t, duracion(p)));
  };
  const bucle = ts => {
    if (!play) return;
    const { p } = obtener(); const D = p ? duracion(p) : 0;
    if (last) t += (ts - last) / 1000; last = ts;
    if (t >= D) t = 0; // en bucle, como en Instagram
    pinta(); raf = requestAnimationFrame(bucle);
  };
  return {
    get t() { return t; }, get play() { return play; },
    reproducir() { if (play) return; play = true; last = 0; raf = requestAnimationFrame(bucle); },
    pausar() { play = false; cancelAnimationFrame(raf); pinta(); },
    ir(x) { t = Math.max(0, x); pinta(); },
    pinta, alCambiar: fn => alCambiar.add(fn),
    destruir() { play = false; cancelAnimationFrame(raf); }
  };
}
