// ================= v17.2 · 🎬 «MIRA CÓMO NACIÓ TU PIEZA»  ·  v17.3: vídeo SUAVE, tipo TikTok =================
// El programa del PC guarda una foto limpia por capa de la cámara de la impresora (nacer.go: sin el cabezal en P1P/P1S).
// Aquí se ven las piezas grabadas y se monta el vídeo: VERTICAL, encuadrado solo en la pieza, con FUNDIDO entre fotos
// (la pieza crece seguida, no a saltos), un acercamiento lento, la luz igualada y el nombre del cliente.
// v17.4 · EDITOR: imagen (luz, contraste, color, calidez, viñeta y estilos «Estudio», «Cine»…), cámara rápida, SONIDO
// («blup-blup» que sube de tono mientras crece la pieza, hecho con el propio navegador, y un «tin» al terminar) y
// «✨ Montaje automático»: el programa mira la luz y el color de las fotos y lo deja montado solo.
// Todo ocurre en ESTE ordenador: las fotos no salen de él y el vídeo se hace en el propio navegador (sin servicios de fuera).
import { h, mount, btn, modal, toast, fdt, inp, sel, confirmDlg } from './ui.js';
import { S, timing } from './store.js';
import { desktop } from './desktop.js';
import { grabarLienzo, formatoVideo } from './simulacion.js';
import { download } from './files.js';

const CL = window.CL;
export const NACER = { max: 150 }; // como mucho estas fotos por vídeo (si hay más, se reparten)
const nombre1 = t => String(t || '').trim().split(/\s+/)[0] || '';
const limpio = t => CL.norm(String(t || '').replace(/\.(3mf|gcode|stl)$/i, '').replace(/[_\-.]+/g, ' '));
const entre = (v, a, b) => Math.max(a, Math.min(b, v));

// ¿De qué pedido es esta pieza? Los pedidos abiertos, primero los que se parecen al nombre del trabajo de la impresora
export function candidatos(pieza) {
  const t = limpio(pieza && pieza.trabajo).split(' ').filter(x => x.length > 2);
  return (S.t.pedidos || []).filter(o => !o.eliminado && !o.archivado && (timing(o) || {}).abierto).map(o => {
    const p = limpio(o.producto), n = t.filter(x => p.includes(x)).length;
    return { o, parecido: n };
  }).sort((a, b) => b.parecido - a.parecido || String(b.o.creado || '').localeCompare(String(a.o.creado || '')));
}
// Los tiempos del vídeo (segundos): entrada, la pieza creciendo y el final con la pieza terminada
// ritmo: 'suave' (de 7 a 13 s creciendo) o 'rapida' (cámara rápida: de 3,5 a 6 s). El fundido entre fotos se mantiene en los dos.
export function tiempos(nFotos, ritmo = 'suave') {
  const cuerpo = ritmo === 'rapida' ? entre(Math.round(nFotos / 30 * 10) / 10, 3.5, 6) : entre(Math.round(nFotos / 15 * 10) / 10, 7, 13);
  return { portada: 0.6, cuerpo, final: 2, total: Math.round((0.6 + cuerpo + 2) * 10) / 10 };
}

// ---------- v17.4 · LA IMAGEN: estilos y ajustes ----------
// brillo, contraste y color: 1 = sin tocar · calidez: de −1 (fría) a 1 (cálida) · viñeta y foco: de 0 a 1
export const ESTILOS = {
  natural: { t: 'Natural', brillo: 1, contraste: 1, color: 1, calidez: 0, vineta: 0, foco: 0 },
  estudio: { t: 'Estudio', brillo: 1.08, contraste: 1.14, color: 1.1, calidez: 0.05, vineta: 0.5, foco: 0.35 },
  cine: { t: 'Cine', brillo: 0.98, contraste: 1.22, color: 0.92, calidez: 0.28, vineta: 0.6, foco: 0.15 },
  vivo: { t: 'Vivo', brillo: 1.05, contraste: 1.1, color: 1.45, calidez: 0.05, vineta: 0.2, foco: 0.1 },
  calido: { t: 'Cálido', brillo: 1.03, contraste: 1.06, color: 1.12, calidez: 0.5, vineta: 0.25, foco: 0.1 },
  frio: { t: 'Frío', brillo: 1.02, contraste: 1.08, color: 1.05, calidez: -0.5, vineta: 0.25, foco: 0.1 },
  bn: { t: 'Blanco y negro', brillo: 1.04, contraste: 1.22, color: 0, calidez: 0, vineta: 0.45, foco: 0.2 }
};
// Mira unas cuantas fotos y dice cuánto hay que corregir: si está oscura, plana, apagada o tirando a azul / naranja
export function analiza(muestras) {
  let n = 0, sl = 0, sr = 0, sv = 0, sb = 0, ss = 0; const hist = new Uint32Array(256);
  muestras.forEach(im => { const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], v = d[i + 1], b = d[i + 2], l = Math.round(r * 0.3 + v * 0.6 + b * 0.1), mx = Math.max(r, v, b), mn = Math.min(r, v, b); hist[l]++; sl += l; sr += r; sv += v; sb += b; ss += mx ? (mx - mn) / mx : 0; n++; } });
  if (!n) return { brillo: 1, contraste: 1, color: 1, calidez: 0, luz: 0 };
  const pct = q => { let a = 0; for (let i = 0; i < 256; i++) { a += hist[i]; if (a >= n * q) return i; } return 255; }, p5 = pct(0.05), p95 = pct(0.95), luz = sl / n, sat = ss / n;
  const r2 = x => Math.round(x * 100) / 100;
  return { luz: Math.round(luz), brillo: r2(entre(112 / Math.max(20, luz), 0.82, 1.45)), contraste: r2(entre(175 / Math.max(40, p95 - p5), 0.92, 1.3)), color: r2(sat < 0.16 ? 1.3 : sat < 0.3 ? 1.15 : sat > 0.5 ? 0.95 : 1.05), calidez: r2(entre((sb - sr) / n / 140, -0.2, 0.2)) }; // poco: una pieza naranja o azul no es un fallo de la cámara
}
// Un estilo + la corrección automática
export const mezcla = (e, a) => ({ brillo: Math.round(entre(e.brillo * (a ? a.brillo : 1), 0.6, 1.6) * 100) / 100, contraste: Math.round(entre(e.contraste * (a ? a.contraste : 1), 0.7, 1.5) * 100) / 100, color: Math.round(entre(e.color * (a ? a.color : 1), 0, 2) * 100) / 100, calidez: Math.round(entre(e.calidez + (a ? a.calidez : 0), -1, 1) * 100) / 100, vineta: e.vineta, foco: e.foco });

// ---------- v17.4 · EL SONIDO: se fabrica con el navegador (no se descarga nada) ----------
// tipo: 'blup' (burbujas que suben de tono con la pieza), 'subida' (un tono que sube) o 'nada'. Al terminar, un «tin».
export function planSonido(tm, tipo) {
  if (!tipo || tipo === 'nada') return [];
  const ev = [], t0 = tm.portada, T = tm.cuerpo;
  if (tipo === 'blup') { let t = 0, k = 0; while (t < T - 0.02) { const x = t / T; ev.push({ s: 'blup', t: Math.round((t0 + t) * 1000) / 1000, f: Math.round(190 * Math.pow(2, x * 2.1) * (1 + ((k * 37) % 7 - 3) * 0.012)), d: 0.09, v: 0.22 }); t += 0.13 - 0.05 * x; k++; } }
  else ev.push({ s: 'sube', t: t0, f: 200, f2: 900, d: T, v: 0.12 });
  const fin = t0 + T; ev.push({ s: 'tin', t: fin, f: 880, d: 0.7, v: 0.22 }, { s: 'tin', t: fin + 0.09, f: 1318.5, d: 0.8, v: 0.18 }, { s: 'tin', t: fin + 0.18, f: 1760, d: 0.9, v: 0.12 });
  return ev;
}
export function suena(AC, salida, plan) {
  const b = AC.currentTime + 0.06, m = AC.createGain(); m.gain.value = 2; m.connect(salida); // v17.4.1: el primer vídeo real salió con el pico a −13 dB; así queda sobre −6 dB
  plan.forEach(e => { const o = AC.createOscillator(), g = AC.createGain(), a = b + e.t; o.connect(g); g.connect(m);
    if (e.s === 'blup') { o.type = 'sine'; o.frequency.setValueAtTime(e.f, a); o.frequency.exponentialRampToValueAtTime(e.f * 1.9, a + 0.07); g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(e.v, a + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, a + e.d); }
    else if (e.s === 'sube') { o.type = 'triangle'; o.frequency.setValueAtTime(e.f, a); o.frequency.exponentialRampToValueAtTime(e.f2, a + e.d); g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(e.v, a + 0.25); g.gain.setValueAtTime(e.v, a + e.d - 0.15); g.gain.exponentialRampToValueAtTime(0.0001, a + e.d); }
    else { o.type = 'triangle'; o.frequency.setValueAtTime(e.f, a); g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(e.v, a + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, a + e.d); }
    o.start(a); o.stop(a + e.d + 0.03); });
  return b;
}
// Graba el lienzo CON el sonido dentro. Si el aparato no sabe, lo graba sin sonido (y lo dice).
export async function grabarConSonido(canvas, seg, paso, plan) {
  const C = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'], AClase = window.AudioContext || window.webkitAudioContext;
  const tipos = !plan.length || !AClase || typeof MediaRecorder === 'undefined' || !canvas.captureStream ? [] : C.filter(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } });
  const vistos = new Set();
  for (const tipo of tipos) {
    const fam = /mp4/.test(tipo) ? 'mp4' : 'webm'; if (vistos.has(fam)) continue; vistos.add(fam);
    let blob = null, AC = null;
    try {
      AC = new AClase(); try { await AC.resume(); } catch (e) { }
      const dest = AC.createMediaStreamDestination(), st = canvas.captureStream(30); dest.stream.getAudioTracks().forEach(t => st.addTrack(t));
      const rec = new MediaRecorder(st, { mimeType: tipo, videoBitsPerSecond: 6000000, audioBitsPerSecond: 128000 }), trozos = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); };
      const fin = new Promise(res => { rec.onstop = res; rec.onerror = res; });
      rec.start(200); if (typeof plan === 'function') plan(AC, dest); else suena(AC, dest, plan); // v18: el Tráiler del mes trae su propia música
      const t0 = performance.now() + 60;
      await new Promise(res => { const f = () => { const x = entre((performance.now() - t0) / (seg * 1000), 0, 1); paso(x); if (x < 1) requestAnimationFrame(f); else setTimeout(res, 350); }; requestAnimationFrame(f); });
      try { rec.stop(); } catch (e) { } await fin; st.getTracks().forEach(t => t.stop());
      blob = new Blob(trozos, { type: tipo.split(';')[0] });
    } catch (e) { blob = null; }
    try { AC && AC.close(); } catch (e) { }
    if (blob && blob.size > 2000) return { blob, ext: fam, sonido: true };
  }
  return Object.assign(await grabarLienzo(canvas, seg, paso), { sonido: false });
}

// Qué fotos se usan (repartidas por igual; siempre la primera y la última)
export function reparto(total, max = NACER.max) {
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
  const out = []; for (let i = 0; i < max; i++) out.push(1 + Math.round(i * (total - 1) / (max - 1)));
  return [...new Set(out)];
}
// Por dónde va la película en el segundo t: foto i, y cuánto de la siguiente se mezcla (0..1). Arranca y frena con suavidad.
export function instante(t, n, tm) {
  if (n < 2 || t <= tm.portada) return { i: 0, f: 0, x: 0 };
  if (t >= tm.portada + tm.cuerpo) return { i: n - 1, f: 0, x: 1 };
  const x = (t - tm.portada) / tm.cuerpo, e = x * x * (3 - 2 * x), u = (0.65 * x + 0.35 * e) * (n - 1), i = Math.min(n - 2, Math.floor(u));
  return { i, f: u - i, x };
}
// Dónde está la pieza: lo que cambia entre la primera foto y la última. Devuelve el centro y el ancho (de 0 a 1) de esa zona.
export function zona(primera, ultima) {
  const W = 160, H = 90, gris = im => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data, o = new Float32Array(W * H); for (let i = 0; i < o.length; i++) o[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.6 + d[i * 4 + 2] * 0.1; return o; };
  const a = gris(primera), b = gris(ultima), col = new Float32Array(W), fil = new Float32Array(H); let total = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dif = Math.abs(a[y * W + x] - b[y * W + x]); if (dif > 30) { col[x]++; fil[y]++; total++; } }
  if (total < 40) return { cx: 0.5, cy: 0.5, ancho: 1, alto: 1, seguro: false }; // casi no cambia nada: toda la imagen
  const rango = (v, n) => { let s = 0, lo = 0, hi = n - 1; for (let i = 0; i < n; i++) { s += v[i]; if (s >= total * 0.04) { lo = i; break; } } s = 0; for (let i = n - 1; i >= 0; i--) { s += v[i]; if (s >= total * 0.04) { hi = i; break; } } return [lo, hi]; };
  const [x0, x1] = rango(col, W), [y0, y1] = rango(fil, H);
  return { cx: (x0 + x1 + 1) / 2 / W, cy: (y0 + y1 + 1) / 2 / H, ancho: (x1 - x0 + 1) / W, alto: (y1 - y0 + 1) / H, seguro: true };
}
const FORMATOS = { vertical: [1080, 1920, 'Vertical · TikTok, reel o historia'], cuadrado: [1080, 1080, 'Cuadrado · WhatsApp'] };
// El trozo de la foto que se usa (en píxeles de la foto): alrededor de la pieza, con la forma del vídeo todo lo que se pueda
export function encuadre(fw, fh, formato, centro, zoom) {
  const [W, H] = FORMATOS[formato] || FORMATOS.vertical, forma = W / H;
  let w = entre(fw / entre(zoom, 1, 4), Math.min(fw, fh * forma), fw), hh = Math.min(fh, w / forma);
  if (w / hh < forma) w = Math.min(fw, hh * forma);
  const x = entre(centro.cx * fw - w / 2, 0, fw - w), y = entre(centro.cy * fh - hh / 2, 0, fh - hh);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) };
}
// v17.4.1 · QUITAR EL CABEZAL de verdad: cada foto se rehace con la MEDIANA, punto a punto, de ella y sus vecinas (2 capas
// antes y 2 después). El cabezal está en un sitio distinto en cada capa y desaparece; la pieza, que casi no cambia entre
// capas seguidas, se queda. (Visto en la P1P real: la mediana dentro de UNA capa dejaba el cabezal como una mancha.)
// Solo vale si la cama no se mueve de lado (P1P / P1S): en la A1 la pieza cambia de sitio y saldría borrosa.
export function mediana5(lista) { // lista = 5 ImageData del mismo tamaño → ImageData
  const n = lista[0].data.length, out = new ImageData(lista[0].width, lista[0].height), o = out.data, A = lista[0].data, B = lista[1].data, C = lista[2].data, D = lista[3].data, E = lista[4].data;
  for (let i = 0; i < n; i++) {
    if ((i & 3) === 3) { o[i] = 255; continue; }
    let a = A[i], b = B[i], c = C[i], d = D[i], e = E[i], t;
    if (a > b) { t = a; a = b; b = t; } if (d > e) { t = d; d = e; e = t; } if (a > d) { t = a; a = d; d = t; t = b; b = e; e = t; }
    if (b > c) { t = b; b = c; c = t; } if (b > d) { t = d; d = b; b = t; t = c; c = e; e = t; } o[i] = c < d ? c : d;
  }
  return out;
}
export async function limpiaCabezal(fotos, alAvanzar) { // fotos = [{ bm }] → mismas fotos con bm limpio
  const n = fotos.length; if (n < 5) return fotos;
  const w = fotos[0].bm.width, hh = fotos[0].bm.height, c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d', { willReadFrequently: true });
  const dato = i => { g.drawImage(fotos[i].bm, 0, 0); return g.getImageData(0, 0, w, hh); }, at = i => Math.max(0, Math.min(n - 1, i));
  const cache = new Map(), pide = i => { i = at(i); if (!cache.has(i)) cache.set(i, dato(i)); return cache.get(i); }, limpias = [];
  for (let i = 0; i < n; i++) {
    const m = mediana5([pide(i - 2), pide(i - 1), pide(i), pide(i + 1), pide(i + 2)]); cache.delete(i - 2);
    g.putImageData(m, 0, 0); limpias.push(await createImageBitmap(c));
    if (alAvanzar && i % 5 === 0) { alAvanzar((i + 1) / n); await new Promise(r => setTimeout(r, 0)); }
  }
  fotos.forEach((f, i) => { try { f.bm.close(); } catch (e) { } f.bm = limpias[i]; });
  return fotos;
}
// La luz de una foto (0..255), para igualarla con las vecinas y que el vídeo no parpadee
export function luzDe(bm) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bm, 0, 0, 16, 16); const d = g.getImageData(0, 0, 16, 16).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * 0.3 + d[i + 1] * 0.6 + d[i + 2] * 0.1; return s / 256; }
export function igualaLuz(fotos) { const n = fotos.length; fotos.forEach((f, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 4); j <= Math.min(n - 1, i + 4); j++) { s += fotos[j].luz; c++; } f.k = f.luz > 4 ? entre(s / c / f.luz, 0.85, 1.18) : 1; }); return fotos; }

// Un fotograma del vídeo. t en segundos. fotos = [{ bm, k }] (ya recortadas) · T = { titulo, para, marca } · E = estilo de imagen (v17.4)
export function pintaCuadro(g, W, H, fotos, t, T, tm, E) {
  E = E || ESTILOS.natural;
  const n = fotos.length, I = instante(t, n, tm), fin = t >= tm.portada + tm.cuerpo, u = W / 1080, a = fotos[I.i], b = fotos[Math.min(n - 1, I.i + 1)];
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none'; g.fillStyle = '#05070c'; g.fillRect(0, 0, W, H);
  if (a && a.bm) {
    const iw = a.bm.width, ih = a.bm.height, acerca = 1 + 0.07 * (fin ? 1 : I.x), s = Math.max(W / iw, Math.min(H / ih, W / iw * 1.0001)) * acerca, dw = iw * s, dh = ih * s, dx = (W - dw) / 2, dy = (H - dh) / 2;
    const dibuja = (f, alfa) => { const br = (f.k || 1) * E.brillo, fl = (Math.abs(br - 1) > 0.01 ? 'brightness(' + br.toFixed(3) + ') ' : '') + (Math.abs(E.contraste - 1) > 0.01 ? 'contrast(' + E.contraste.toFixed(3) + ') ' : '') + (Math.abs(E.color - 1) > 0.01 ? 'saturate(' + E.color.toFixed(3) + ')' : ''); g.globalAlpha = alfa; g.filter = fl.trim() || 'none'; g.drawImage(f.bm, dx, dy, dw, dh); };
    if (dh < H - 2) { // la foto no llena el alto: detrás, ella misma grande y desenfocada
      const s0 = Math.max(W / iw, H / ih) * 1.12; g.save(); g.filter = 'blur(' + Math.round(28 * u) + 'px) brightness(.5)'; g.drawImage(a.bm, (W - iw * s0) / 2, (H - ih * s0) / 2, iw * s0, ih * s0); g.restore();
    }
    dibuja(a, 1); if (I.f > 0.003 && b && b !== a) dibuja(b, I.f); // FUNDIDO con la siguiente: crece seguido, sin saltos
    g.globalAlpha = 1; g.filter = 'none';
    // v17.4 · el «revelado»: calidez (un velo naranja o azul), foco de estudio en el centro y viñeta
    if (Math.abs(E.calidez) > 0.02) { g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = E.calidez > 0 ? 'rgba(255,150,50,' + (0.5 * E.calidez).toFixed(3) + ')' : 'rgba(50,130,255,' + (0.5 * -E.calidez).toFixed(3) + ')'; g.fillRect(0, 0, W, H); g.restore(); }
    if (E.foco > 0.02) { g.save(); g.globalCompositeOperation = 'soft-light'; const fo = g.createRadialGradient(W / 2, H * 0.52, 0, W / 2, H * 0.52, Math.max(W, H) * 0.55); fo.addColorStop(0, 'rgba(255,255,255,' + (0.7 * E.foco).toFixed(3) + ')'); fo.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = fo; g.fillRect(0, 0, W, H); g.restore(); }
    if (E.vineta > 0.02) { const vi = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.hypot(W, H) * 0.56); vi.addColorStop(0, 'rgba(0,0,0,0)'); vi.addColorStop(1, 'rgba(0,0,0,' + (0.8 * E.vineta).toFixed(3) + ')'); g.fillStyle = vi; g.fillRect(0, 0, W, H); }
    // sombreado arriba y abajo para que se lean las letras
    let gr = g.createLinearGradient(0, 0, 0, H * 0.24); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.24);
    gr = g.createLinearGradient(0, H * 0.72, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = gr; g.fillRect(0, H * 0.72, W, H * 0.28);
  }
  const sombra = () => { g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 18 * u; g.shadowOffsetY = 3 * u; };
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const entra = entre(t / 0.5, 0, 1); // el título entra suave
  g.save(); sombra(); g.globalAlpha = entra; g.fillStyle = '#fff'; g.font = '800 ' + Math.round(66 * u) + 'px system-ui, "Segoe UI", sans-serif'; g.fillText(T.titulo || '', W / 2, H * 0.075 + (1 - entra) * 20 * u, W * 0.92); g.restore();
  if (!fin) {
    const pct = Math.round(I.x * 100); g.save(); g.globalAlpha = entra; g.fillStyle = 'rgba(0,0,0,.55)'; const bw = 190 * u, bh = 62 * u, bx = W / 2 - bw / 2, by = H * 0.075 + 62 * u; g.beginPath(); g.roundRect ? g.roundRect(bx, by, bw, bh, bh / 2) : g.rect(bx, by, bw, bh); g.fill();
    g.fillStyle = '#fde047'; g.font = '800 ' + Math.round(38 * u) + 'px system-ui, sans-serif'; g.fillText(pct + ' %', W / 2, by + bh / 2 + 2 * u); g.restore();
  }
  // abajo: para quién y de quién. Al terminar, el nombre crece con un brillo.
  const pop = fin ? entre((t - tm.portada - tm.cuerpo) / 0.45, 0, 1) : 0, rebote = fin ? 1 + 0.14 * Math.sin(pop * Math.PI) : 1;
  g.save(); sombra();
  if (T.para) { g.fillStyle = '#fff'; g.font = '800 ' + Math.round((fin ? 84 : 60) * u * rebote) + 'px system-ui, "Segoe UI", sans-serif'; if (fin) { g.shadowColor = 'rgba(34,211,238,.95)'; g.shadowBlur = 34 * u; g.shadowOffsetY = 0; } g.fillText((fin ? '✨ ' : '') + T.para, W / 2, H * 0.875, W * 0.92); }
  if (T.marca) { g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 14 * u; g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '600 ' + Math.round(34 * u) + 'px system-ui, sans-serif'; g.fillText(T.marca, W / 2, H * 0.875 + 72 * u, W * 0.9); }
  g.restore();
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, H - 10 * u, W, 10 * u); g.fillStyle = '#22d3ee'; g.fillRect(0, H - 10 * u, W * entre(t / tm.total, 0, 1), 10 * u);
  return I;
}

// ---------- montar el vídeo de UNA pieza ----------
export async function montar(pieza) {
  const C = candidatos(pieza), o0 = C[0] && C[0].parecido ? C[0].o : null, empresa = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || '';
  const titulo = inp({ value: 'Así nació tu pieza', maxlength: 40, 'aria-label': 'Título del vídeo' }), para = inp({ value: o0 ? 'Para ' + nombre1(o0.cliente) : '', maxlength: 40, placeholder: 'Para Lucía', 'aria-label': 'Para quién es' });
  const pedido = sel([{ v: '', t: '— Sin pedido (escribe tú el nombre) —' }].concat(C.slice(0, 40).map(x => ({ v: x.o.id, t: 'nº ' + x.o.numero + ' · ' + x.o.cliente + ' · ' + x.o.producto }))), o0 ? o0.id : '', { 'aria-label': 'Pedido de esta pieza' });
  const formato = sel(Object.keys(FORMATOS).map(k => ({ v: k, t: FORMATOS[k][2] })), 'vertical', { 'aria-label': 'Formato del vídeo' });
  const mueve = h('input', { type: 'range', min: 0, max: 100, value: 50, 'aria-label': 'Mover el encuadre' }), zoomI = h('input', { type: 'range', min: 100, max: 300, value: 100, 'aria-label': 'Acercar' });
  // v17.4 · el editor: imagen, ritmo y sonido
  const mando = (et, min, max, v) => h('input', { type: 'range', min, max, value: v, 'aria-label': et });
  const M = { brillo: mando('Luz', 60, 160, 100), contraste: mando('Contraste', 70, 150, 100), color: mando('Color', 0, 200, 100), calidez: mando('Calidez', -100, 100, 0), vineta: mando('Viñeta', 0, 100, 0) };
  const ritmo = sel([{ v: 'rapida', t: '⚡ Cámara rápida (5–8 s)' }, { v: 'suave', t: '🌊 Suave (10–16 s)' }], 'rapida', { 'aria-label': 'Ritmo del vídeo' }), sonido = sel([{ v: 'blup', t: '🫧 Blup-blup que sube' }, { v: 'subida', t: '🎵 Un tono que sube' }, { v: 'nada', t: '🔇 Sin sonido' }], 'blup', { 'aria-label': 'Sonido del vídeo' });
  const camaMovil = /^(030|039)/.test(String(pieza.serial || '')), limpiar = h('input', { type: 'checkbox', checked: !camaMovil, 'aria-label': 'Quitar el cabezal' });
  const estilosB = h('div.nc-estilos'), autoTxt = h('div.tiny.muted.nc-auto-t'); let estilo = 'estudio', foco = ESTILOS.estudio.foco, AU = null, ACp = null;
  const E = () => ({ brillo: Number(M.brillo.value) / 100, contraste: Number(M.contraste.value) / 100, color: Number(M.color.value) / 100, calidez: Number(M.calidez.value) / 100, vineta: Number(M.vineta.value) / 100, foco });
  const ponEstilo = (k, auto) => { estilo = k; const x = mezcla(ESTILOS[k], auto); M.brillo.value = Math.round(x.brillo * 100); M.contraste.value = Math.round(x.contraste * 100); M.color.value = Math.round(x.color * 100); M.calidez.value = Math.round(x.calidez * 100); M.vineta.value = Math.round(x.vineta * 100); foco = x.foco; pintaEstilos(); apunta(); };
  const pintaEstilos = () => mount(estilosB, Object.keys(ESTILOS).map(k => h('button.chip' + (estilo === k ? '.on' : ''), { type: 'button', 'data-estilo': k, onclick: () => { ponEstilo(k, AU); pinta(); } }, ESTILOS[k].t)));
  const apunta = () => { window.__nacer = Object.assign(window.__nacer || {}, { estilo, ritmo: ritmo.value, sonido: sonido.value, imagen: E(), auto: AU }); };
  // ✨ lo deja montado solo: mira la luz y el color de las fotos, pone el estilo «Estudio» corregido, cámara rápida y blup-blup
  function automatico(avisa) { if (!fotos.length) return; const n = fotos.length, ms = [0, 0.25, 0.5, 0.75, 1].map(q => fotos[Math.round(q * (n - 1))].bm); AU = analiza(ms); ritmo.value = 'rapida'; sonido.value = 'blup'; ponEstilo('estudio', AU);
    autoTxt.textContent = '✨ Montado solo: ' + (AU.brillo > 1.04 ? 'estaba oscuro, le subo la luz un ' + Math.round((AU.brillo - 1) * 100) + ' %' : AU.brillo < 0.96 ? 'estaba muy claro, le bajo la luz un ' + Math.round((1 - AU.brillo) * 100) + ' %' : 'la luz estaba bien') + (AU.calidez > 0.08 ? ', tiraba a azul y lo caliento' : AU.calidez < -0.08 ? ', tiraba a naranja y lo enfrío' : '') + (AU.color > 1.1 ? ', le doy más color' : '') + '. Estilo Estudio, cámara rápida y blup-blup.'; if (avisa) toast('✨ Montaje automático hecho', 'ok', 2500); refresca(); }
  const refresca = () => { apunta(); if (fotos.length) { const x = tm(); estado.textContent = fotos.length + ' fotos · vídeo de ' + String(x.total).replace('.', ',') + ' s' + (formatoVideo() ? '' : ' · este aparato no puede grabar vídeo'); } t = 0; pinta(); };
  const oir = () => { const Cl = window.AudioContext || window.webkitAudioContext; if (!Cl || sonido.value === 'nada') return toast(sonido.value === 'nada' ? 'Este vídeo va sin sonido.' : 'Este aparato no puede sonar.', 'warn'); try { ACp && ACp.close(); } catch (e) { } ACp = new Cl(); ACp.resume && ACp.resume(); t = 0; suena(ACp, ACp.destination, planSonido(tm(), sonido.value)); };
  const cv = h('canvas.nc-cv', { width: 1080, height: 1920 }), estado = h('div.nc-estado', 'Cargando las fotos…'), acciones = h('div.row.wrap.nc-acc', { style: { gap: '8px' } });
  let blobs = [], fotos = [], t = 0, vivo = true, grabando = false, ultimo = performance.now(), hecho = null, Z = { cx: 0.5, cy: 0.5, ancho: 1, alto: 1 }, tam = [1280, 720], turno = 0, espera = 0;
  const T = () => ({ titulo: titulo.value.trim(), para: para.value.trim(), marca: empresa }), tm = () => tiempos(fotos.length, ritmo.value);
  const pinta = () => { const esc = grabando ? 1 : 0.5, W = FORMATOS[formato.value][0] * esc, H = FORMATOS[formato.value][1] * esc; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } pintaCuadro(cv.getContext('2d'), W, H, fotos, t, T(), tm(), E()); };
  const bucle = now => { if (!vivo || !cv.isConnected) { vivo = false; return; } requestAnimationFrame(bucle); if (now - ultimo < 30) return; const dt = Math.min(0.2, (now - ultimo) / 1000); ultimo = now; if (fotos.length && !grabando) { t += dt; if (t > tm().total + 0.8) t = 0; pinta(); } };
  // recorta todas las fotos alrededor de la pieza (se repite si cambias el formato o mueves el encuadre)
  async function recorta() {
    const mio = ++turno, R = encuadre(tam[0], tam[1], formato.value, { cx: Number(mueve.value) / 100, cy: Z.cy }, Number(zoomI.value) / 100), nuevas = [];
    for (let k = 0; k < blobs.length; k++) { try { const bm = await createImageBitmap(blobs[k], R.x, R.y, R.w, R.h); nuevas.push({ bm, luz: luzDe(bm), k: 1 }); } catch (e) { } if (mio !== turno || !vivo) { nuevas.forEach(f => { try { f.bm.close(); } catch (e) { } }); return; } }
    if (limpiar.checked && nuevas.length >= 5) { await limpiaCabezal(nuevas, f => { if (mio === turno) estado.textContent = 'Quitando el cabezal de las fotos… ' + Math.round(f * 100) + ' %'; }); nuevas.forEach(f => { f.luz = luzDe(f.bm); }); if (mio !== turno || !vivo) { nuevas.forEach(f => { try { f.bm.close(); } catch (e) { } }); return; } }
    const viejas = fotos; fotos = igualaLuz(nuevas); viejas.forEach(f => { try { f.bm.close(); } catch (e) { } });
    window.__nacer = Object.assign(window.__nacer || {}, { fotos: fotos.length, encuadre: R, zona: Z, formato: formato.value, limpio: limpiar.checked && fotos.length >= 5 });
    if (!AU) automatico(false); // la primera vez, montado solo
    refresca(); pintaAcc();
  }
  const luego = () => { clearTimeout(espera); espera = setTimeout(recorta, 350); };
  pedido.onchange = () => { const o = (S.t.pedidos || []).find(x => x.id === pedido.value); para.value = o ? 'Para ' + nombre1(o.cliente) : ''; pinta(); };
  [titulo, para].forEach(x => x.addEventListener('input', pinta)); formato.onchange = () => recorta(); mueve.oninput = luego; zoomI.oninput = luego; limpiar.onchange = () => recorta();
  Object.values(M).forEach(x => x.addEventListener('input', () => { apunta(); pinta(); })); ritmo.onchange = refresca; sonido.onchange = refresca;
  const nombreArchivo = ext => 'asi_nacio_' + (CL.norm(para.value.replace(/^para\s+/i, '')) || 'pieza').replace(/\s+/g, '_') + '.' + ext;
  const pintaAcc = () => mount(acciones,
    btn(grabando ? 'Creando el vídeo…' : '🎬 Crear el vídeo', crear, { cls: 'primary nc-crear', disabled: grabando || !fotos.length }),
    hecho ? btn('⬇️ Guardar otra vez', () => download(hecho.blob, nombreArchivo(hecho.ext)), { cls: 'ghost' }) : null,
    hecho && navigator.canShare && navigator.canShare({ files: [new File([hecho.blob], nombreArchivo(hecho.ext), { type: hecho.blob.type })] }) ? btn('📤 Compartir', () => navigator.share({ files: [new File([hecho.blob], nombreArchivo(hecho.ext), { type: hecho.blob.type })] }).catch(() => { }), { cls: 'ghost' }) : null);
  async function crear() {
    if (grabando || !fotos.length) return;
    grabando = true; pintaAcc(); const total = tm().total; t = 0; pinta(); // (el lienzo pasa a tamaño completo ANTES de empezar a grabar)
    try {
      estado.textContent = 'Creando el vídeo (' + String(total).replace('.', ',') + ' s)… no cierres esta ventana.';
      try { ACp && ACp.close(); } catch (e) { } ACp = null;
      hecho = await grabarConSonido(cv, total, x => { t = x * total; pinta(); }, planSonido(tm(), sonido.value));
      download(hecho.blob, nombreArchivo(hecho.ext));
      estado.textContent = '✅ Vídeo guardado en Descargas (' + (hecho.blob.size / 1048576).toFixed(1).replace('.', ',') + ' MB, .' + hecho.ext + (sonido.value === 'nada' ? ', sin sonido' : hecho.sonido ? ', con sonido' : ', SIN sonido: este aparato no ha sabido grabarlo') + ').' + (hecho.ext === 'webm' ? ' Ojo: TikTok, WhatsApp e Instagram no aceptan .webm; este aparato no sabe grabar .mp4.' : ' Vale para TikTok, WhatsApp e Instagram.');
      window.__nacerVideo = { bytes: hecho.blob.size, ext: hecho.ext, seg: total, sonido: !!hecho.sonido }; window.__nacerBlob = hecho.blob;
    } catch (e) { estado.textContent = '❌ ' + (e.message || e); toast(e.message || 'No se pudo crear el vídeo', 'bad', 8000); }
    grabando = false; t = 0; pintaAcc(); pinta();
  }
  const m = modal('🎬 Así nació · ' + (pieza.trabajo || 'pieza'), h('div.nc-montar',
    h('div.nc-izq', cv, estado),
    h('div.nc-der',
      h('div.nc-auto', btn('✨ Montaje automático', () => automatico(true), { cls: 'nc-auto-b', title: 'El programa mira la luz y el color de las fotos y lo deja montado solo' }), autoTxt), acciones,
      h('label.nc-l', h('span', '¿De qué pedido es?'), pedido), h('div.holo-fila', h('label.nc-l', h('span', 'Para quién'), para), h('label.nc-l', h('span', 'Título'), titulo)),
      h('details.more.nc-sec', { open: true }, h('summary', '🎨 Imagen: luz y color'), h('div.in.nc-sec-in', estilosB,
        h('label.check.nc-limpiar', limpiar, h('span', '🧹 Quitar el cabezal de las fotos' + (camaMovil ? ' (en la A1 la cama se mueve: puede emborronar la pieza)' : ''))),
        h('div.nc-mandos', h('label.nc-l', h('span', 'Luz'), M.brillo), h('label.nc-l', h('span', 'Contraste'), M.contraste), h('label.nc-l', h('span', 'Color'), M.color), h('label.nc-l', h('span', 'Calidez (frío ↔ cálido)'), M.calidez), h('label.nc-l', h('span', 'Viñeta (bordes oscuros)'), M.vineta)))),
      h('details.more.nc-sec', { open: true }, h('summary', '⚡ Ritmo y sonido'), h('div.in.nc-sec-in', h('div.holo-fila', h('label.nc-l', h('span', 'Ritmo'), ritmo), h('label.nc-l', h('span', 'Sonido'), sonido)), btn('🔊 Oírlo ahora', oir, { cls: 'sm ghost nc-oir' }))),
      h('details.more.nc-sec', h('summary', '✂️ Formato y encuadre'), h('div.in.nc-sec-in', h('label.nc-l', h('span', 'Formato'), formato),
        h('label.nc-l', h('span', 'Encuadre: el programa busca la pieza solo. Muévelo si no acierta.'), mueve), h('label.nc-l', h('span', 'Acercar'), zoomI))),
      h('p.tiny.muted', 'El vídeo y su sonido se hacen en este ordenador con las fotos de la cámara de tu impresora. No se sube a ningún sitio: lo envías tú a quien quieras.'))),
    close => [btn('Cerrar', close)], { size: 'wide', noFocus: true, onclose: () => { vivo = false; turno++; clearTimeout(espera); try { ACp && ACp.close(); } catch (e) { } fotos.forEach(f => { try { f.bm.close(); } catch (e) { } }); } });
  pintaEstilos(); pintaAcc(); requestAnimationFrame(bucle);
  const ns = reparto(pieza.fotos);
  for (let k = 0; k < ns.length && vivo; k++) { try { blobs.push(await desktop.nacerFoto(pieza.id, ns[k])); } catch (e) { /* una foto rota no para el vídeo */ } estado.textContent = 'Cargando las fotos… ' + Math.round((k + 1) / ns.length * 100) + ' %'; }
  if (!blobs.length) { estado.textContent = '❌ No he podido leer las fotos de esta pieza.'; return m; }
  try { // ¿dónde está la pieza? lo que cambia entre el principio y el final
    const a = await createImageBitmap(blobs[0]), b = await createImageBitmap(blobs[blobs.length - 1]); tam = [b.width, b.height]; Z = zona(a, b); a.close(); b.close();
    mueve.value = Math.round(Z.cx * 100); zoomI.value = Math.round(entre(Z.seguro ? 1 / Math.max(Z.ancho * 1.5, 0.34) : 1, 1, 3) * 100);
  } catch (e) { }
  estado.textContent = 'Preparando el encuadre…'; await recorta();
  return m;
}

// ---------- la lista de piezas grabadas ----------
export function dialogoNacer() {
  const caja = h('div.nc-lista'), urls = [];
  let m = null;
  async function pinta() {
    if (!desktop.on) return mount(caja, h('div.nc-vacio', h('i', '🖥️'), h('b', 'Esto se ve en el PC del taller'), h('p', 'Las fotos las hace el programa del ordenador que está en la misma red que la impresora, y se quedan en él. Ábrelo allí.')));
    let D; try { D = await desktop.nacer(); } catch (e) { return mount(caja, h('p.bad-t', 'No se pudo leer: ' + (e.message || e) + (/404|desconocid/i.test(String(e.message)) ? ' Actualiza el programa del PC.' : ''))); }
    const interruptor = h('input', { type: 'checkbox', checked: !!D.activo, 'aria-label': 'Grabar cómo nace cada pieza', onchange: async () => { try { await desktop.nacerAccion({ accion: 'activar', activo: interruptor.checked }); toast(interruptor.checked ? '🎬 A partir de ahora se graba cada pieza' : 'Ya no se graba', 'ok'); pinta(); } catch (e) { toast(e.message, 'bad'); } } });
    const aviso = !D.impresoras ? 'No hay ninguna impresora Bambu vinculada en este ordenador. Vincúlala en Impresión → Bambu Lab.' : !D.compatibles ? 'Tus impresoras usan otro tipo de vídeo (X1, P2S, H2) que todavía no se puede grabar. Funciona con P1P, P1S, A1 y A1 mini.' : D.problema ? 'La última foto falló: ' + D.problema : '';
    const tarjeta = p => {
      const im = h('img.nc-mini', { alt: '', width: 160, height: 90 });
      desktop.nacerFoto(p.id, p.fotos).then(b => { const u = URL.createObjectURL(b); urls.push(u); im.src = u; }).catch(() => { });
      return h('div.nc-pieza', { 'data-id': p.id }, im, h('div.grow', h('b', (p.trabajo || 'Pieza').replace(/\.(3mf|gcode)$/i, '')), h('small', (p.impresora || '') + ' · ' + fdt(p.inicio) + ' · ' + p.fotos + ' fotos'),
        h('span.nc-est' + (p.grabando ? '.rec' : p.terminada ? '.ok' : ''), p.grabando ? '🔴 Grabando · ' + p.pct + ' %' : p.terminada ? '✅ Pieza terminada' : '⏹️ Se quedó en el ' + p.pct + ' %')),
        p.fotos >= 5 ? btn('🎬 Hacer el vídeo', () => montar(p), { cls: 'primary sm nc-hacer' }) : h('span.tiny.muted', 'Aún pocas fotos'),
        p.grabando ? null : btn('', async () => { if (!await confirmDlg('Borrar esta pieza', 'Se borran sus fotos de este ordenador. ¿Seguro?', 'Borrar', true)) return; try { await desktop.nacerAccion({ accion: 'borrar', id: p.id }); pinta(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm ghost icon', icon: 'trash', title: 'Borrar' }));
    };
    mount(caja,
      h('label.nc-activar' + (D.activo ? '.on' : ''), interruptor, h('span', h('b', 'Grabar cómo nace cada pieza'), h('small', 'Una foto limpia por capa (en la P1P, sin el cabezal por medio). Mientras graba, la cámara de la impresora está encendida. Se guardan las 20 últimas piezas, en este ordenador.'))),
      aviso ? h('p.nc-aviso', '⚠️ ' + aviso) : null,
      D.piezas.length ? D.piezas.map(tarjeta) : h('div.nc-vacio', h('i', '🎬'), h('b', D.activo ? 'Todavía no hay ninguna pieza grabada' : 'Actívalo y pon algo a imprimir'), h('p', D.activo ? 'En cuanto la impresora empiece una pieza, aparecerá aquí y se irá llenando sola.' : 'Mañana tendrás el vídeo de tu primera pieza, con el nombre del cliente.')));
  }
  m = modal('🎬 Mira cómo nació tu pieza', caja, close => [btn('Actualizar', pinta, { cls: 'ghost' }), btn('Cerrar', close, { cls: 'primary' })], { size: 'wide', noFocus: true, onclose: () => urls.forEach(u => URL.revokeObjectURL(u)) });
  pinta();
  return m;
}
