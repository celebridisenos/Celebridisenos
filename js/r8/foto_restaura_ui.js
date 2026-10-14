// ================= 13-10-2026 · 🩹 RESTAURADOR DE FOTOS · la parte de pantalla =================
// (las cuentas están en foto_restaura.js; aquí: pasar una foto por el restaurador —con la IA del PC si hace falta—, contar lo que
// se ha arreglado y la OPCIÓN B: la ventana de retoque para pintar, usar la varita o contornear con imán cuando lo automático falla)
// La dueña: «y si tiene una opción B por si falla, que puedas pintar o contornear fácil con ayuda automática».
import { h, mount, btn, toast } from '../ui.js';
import * as FM from './foto_medida.js';
import * as FR from './foto_restaura.js';

// ---------- de ImageData a imagen guardada (y al revés) ----------
export function deDatos(D, tipo = 'image/png', calidad = 0.93) {
  const c = document.createElement('canvas'); c.width = D.width; c.height = D.height; c.getContext('2d').putImageData(D instanceof ImageData ? D : new ImageData(D.data, D.width, D.height), 0, 0);
  const id = FM.nuevoIdImg(), url = c.toDataURL(tipo, calidad); FM.IMAGENES.set(id, { url, w: D.width, h: D.height }); return { id, url, w: D.width, h: D.height };
}
export const datosDe = async id => FM.pixeles(await FM.imagenDe(id));
const aBlob = (D, tipo = 'image/jpeg', q = 0.93) => new Promise(res => { const c = document.createElement('canvas'); c.width = D.width; c.height = D.height; c.getContext('2d').putImageData(D instanceof ImageData ? D : new ImageData(D.data, D.width, D.height), 0, 0); c.toBlob(b => res(b), tipo, q); });
async function motor() { try { const d = await import('../desktop.js'); return d && d.desktop && d.desktop.on && d.desktop.motorFondo ? d.desktop : null; } catch (e) { return null; } }
// la máscara de la IA del PC para un trozo de foto (del mismo tamaño que el trozo), o null
async function iaDe(D, desk) {
  const r = await desk.motorFondo(await aBlob(D)); if (!r || !r.ok || !r.mascara) return null;
  const im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = () => rej(new Error('máscara')); x.src = r.mascara; });
  const c = document.createElement('canvas'); c.width = D.width; c.height = D.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, D.width, D.height); return g.getImageData(0, 0, D.width, D.height);
}

// ---------- PASAR UNA FOTO POR EL RESTAURADOR ----------
// imgId = la foto tal cual (en FM.IMAGENES) · o.ia: 'auto' (solo si lo de aquí no está claro) | 'si' | 'no' · o.forzar = método
// → { img (restaurada: recortada y ampliada), mascara, rest: { original, metodo, nombre, confianza, nota, pasos, avisos, alternativas, caja, k, conIA } }
export async function restauraImagen(imgId, o = {}) {
  const D = await datosDe(imgId); let X = FR.restaura(D, { forzar: o.forzar }), conIA = false, falloIA = '';
  const quiere = o.ia === 'si' || (o.ia !== 'no' && !o.forzar && (!X.ok || X.confianza !== 'alta')), desk = quiere ? await motor() : null;
  if (desk) {
    try { // la IA mira solo el trozo donde está la pieza (más grande = mejor): lo encontrado aquí con margen, o la foto entera
      let x0 = 0, y0 = 0, x1 = D.width, y1 = D.height;
      if (X.ok) { const [a, b, c, d] = X.caja, m = 0.22 * Math.max(c - a, d - b); x0 = Math.max(0, Math.floor(a - m)); y0 = Math.max(0, Math.floor(b - m)); x1 = Math.min(D.width, Math.ceil(c + m)); y1 = Math.min(D.height, Math.ceil(d + m)); }
      const Dc = x0 || y0 || x1 < D.width || y1 < D.height ? FR.recorte(D, x0, y0, x1, y1) : D;
      if (o.alEsperar) o.alEsperar('✨ La IA de tu PC está separando la pieza…');
      const mi = await iaDe(Dc, desk);
      if (mi) { const X2 = FR.restaura(Dc, { ia: mi, forzar: o.ia === 'si' ? 'ia' : undefined }); if (X2.ok && (X2.metodo === 'ia' || !X.ok)) { X2.caja = [X2.caja[0] + x0, X2.caja[1] + y0, X2.caja[2] + x0, X2.caja[3] + y0]; X = X2; conIA = X2.metodo === 'ia'; } }
    } catch (e) { falloIA = e.message || String(e); }
  }
  if (!X.ok) throw new Error(X.error);
  const I = deDatos(X.D, 'image/jpeg', 0.94), M = deDatos(X.mascara, 'image/png');
  return { img: I.id, mascara: M.id, rest: { original: imgId, metodo: X.metodo, nombre: X.nombre, confianza: X.confianza, nota: Math.round(X.nota * 100) / 100, pasos: X.pasos, avisos: X.avisos, alternativas: X.alternativas.map(a => ({ metodo: a.metodo, nombre: a.nombre, p: Math.round(a.p * 100) / 100 })), caja: X.caja.map(v => Math.round(v * 10) / 10), k: Math.round(X.k * 1000) / 1000, conIA, falloIA, hayIA: !!desk || !!(await motor()) } };
}
// pasar unas referencias (calibrar) hechas sobre la foto de antes a la restaurada, y al revés
export const refsA = (refs, rest) => (refs || []).map(r => ({ a: [(r.a[0] - rest.caja[0]) * rest.k, (r.a[1] - rest.caja[1]) * rest.k], b: [(r.b[0] - rest.caja[0]) * rest.k, (r.b[1] - rest.caja[1]) * rest.k], mm: r.mm }));

// ---------- CONTAR LO QUE SE HA ARREGLADO (para poner debajo de la foto) ----------
const SELLO = { alta: ['✅', 'Contorno claro'], media: ['🟡', 'Contorno dudoso: míralo'], baja: ['🔴', 'No estoy seguro: retócalo'] };
export function resumen(rest) { const s = SELLO[rest.confianza] || SELLO.media; return s[0] + ' ' + s[1] + ' · ' + rest.nombre; }
export function panel(rest, acc = {}) {
  if (!rest) return null; const s = SELLO[rest.confianza] || SELLO.media;
  return h('details.frp.' + rest.confianza, { open: !!acc.abierto }, // (cerrado: va encima de la foto; el sello ya dice si hay que mirarlo)
    h('summary', h('b', '🩹 Foto restaurada'), h('span.frp-sello', s[0] + ' ' + s[1]), h('small', rest.nombre + (rest.k > 1.15 ? ' · ampliada ×' + (Math.round(rest.k * 10) / 10).toLocaleString('es-ES') : ''))),
    rest.pasos.length ? h('ul.frp-pasos', rest.pasos.map(t => h('li', t))) : h('p.small', 'La foto estaba bien: solo la he recortado a la pieza.'),
    rest.avisos.map(t => h('p.frp-aviso', '⚠️ ' + t)),
    h('div.frp-acc', acc.retocar ? btn('🩹 Retocar (pintar o contornear)', acc.retocar, { cls: 'sm frp-retocar', title: 'Opción B: pinta lo que es pieza, borra lo que no, usa la varita o marca el contorno a ojo y se pega solo al borde' }) : null,
      acc.ia && rest.hayIA && !rest.conIA ? btn('✨ Probar con la IA del PC', acc.ia, { cls: 'sm frp-ia' }) : null,
      acc.otra && rest.alternativas.length > 1 ? h('label.frp-otra', h('span', 'Otra forma:'), h('select.inp', { 'data-k': 'frp-metodo', onchange: e => acc.otra(e.target.value) }, rest.alternativas.map(a => h('option', { value: a.metodo, selected: a.metodo === rest.metodo }, a.nombre)))) : null,
      acc.original ? btn('↺ Usar la foto tal cual', acc.original, { cls: 'sm ghost frp-original', title: 'Sin restaurar: como se hacía antes' }) : null),
    h('p.frp-cal', '📏 Una foto da la FORMA. Para que la medida sea exacta, ', acc.calibrar ? h('button.frp-link', { type: 'button', onclick: acc.calibrar }, 'calibra la foto') : 'calibra la foto', ' (dos puntos de algo que conozcas) o escribe las medidas con el calibre: lo que escribas manda.'));
}

// ---------- OPCIÓN B · LA VENTANA DE RETOQUE ----------
// o = { img (la foto restaurada), mascara, alGuardar(idMascaraNueva) }
export async function abreRetoque(o) {
  document.querySelectorAll('.frr').forEach(x => x.remove());
  const D = await datosDe(o.img); let M = await datosDe(o.mascara); const W = D.width, H = D.height, M0 = new Uint8ClampedArray(M.data);
  const cv = h('canvas.frr-cv', { 'aria-label': 'La foto: en verde, lo que el programa toma por pieza' }), barra = h('div.frr-barra'), pista = h('p.frr-pista'), raiz = h('div.frr', { role: 'dialog', 'aria-label': 'Retocar el contorno' });
  let modo = 'mas', radio = Math.max(6, Math.round(Math.max(W, H) / 70)), tol = 22, tr = null, poli = [], pila = [], cambiado = false, vista = { s: 1, ox: 0, oy: 0 }, ocupado = false;
  const capa = document.createElement('canvas'); capa.width = W; capa.height = H; const gc = capa.getContext('2d'), foto = document.createElement('canvas'); foto.width = W; foto.height = H; foto.getContext('2d').putImageData(D, 0, 0);
  function rehazCapa() { // verde translúcido = pieza · línea viva en el borde
    const I = gc.createImageData(W, H), A = I.data, S = M.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (S[i] <= 127) continue; const b = x === 0 || y === 0 || x === W - 1 || y === H - 1 || S[i - 4] <= 127 || S[i + 4] <= 127 || S[i - W * 4] <= 127 || S[i + W * 4] <= 127; A[i] = 45; A[i + 1] = 212; A[i + 2] = 191; A[i + 3] = b ? 255 : 70; }
    gc.putImageData(I, 0, 0);
  }
  function pinta() {
    const cw = cv.parentElement.clientWidth || 800, ch = cv.parentElement.clientHeight || 520, dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    const s = Math.min(cw / W, ch / H) * 0.98; vista = { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2 };
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(s * dpr, 0, 0, s * dpr, vista.ox * dpr, vista.oy * dpr); g.imageSmoothingQuality = 'high';
    g.drawImage(foto, 0, 0); g.drawImage(capa, 0, 0);
    if (poli.length) { g.lineWidth = 2.5 / s; g.strokeStyle = '#ffd23f'; g.fillStyle = 'rgba(255,210,63,.18)'; g.beginPath(); poli.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (poli.length > 2) g.fill(); g.stroke(); poli.forEach((p, i) => { g.beginPath(); g.arc(p[0], p[1], (i ? 4 : 7) / s, 0, 7); g.fillStyle = i ? '#ffd23f' : '#ff7a1a'; g.fill(); }); }
    if (cursor && modo !== 'contorno' && !/varita/.test(modo)) { g.lineWidth = 1.5 / s; g.strokeStyle = modo === 'mas' ? '#2dd4bf' : '#ff5c7a'; g.beginPath(); g.arc(cursor[0], cursor[1], radio, 0, 7); g.stroke(); }
  }
  let cursor = null;
  const aImg = ev => { const r = cv.getBoundingClientRect(); return [((ev.clientX - r.left) - vista.ox) / vista.s, ((ev.clientY - r.top) - vista.oy) / vista.s]; };
  const apunta = () => { pila.push(new Uint8ClampedArray(M.data)); if (pila.length > 14) pila.shift(); cambiado = true; };
  const asienta = () => { const n = FR.asienta(M); if (!n) { M.data.set(pila.pop() || M0); toast('Así no queda pieza: lo dejo como estaba.', 'warn'); } rehazCapa(); pinta(); pintaBarra(); };
  // contornear: el polígono marcado a ojo → se pega al borde de la foto donde se ve claro (y se buscan los agujeros de dentro)
  function cierraContorno() {
    if (poli.length < 3) return toast('Marca al menos 3 puntos alrededor de la pieza.', 'warn');
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.beginPath(); poli.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    apunta(); poli = []; pega(g.getImageData(0, 0, W, H), 'Contorno puesto y pegado al borde de la foto.');
  }
  function pega(guia, texto) { // 🧲 lo marcado manda; el borde se pega al de la foto donde el tono lo deja claro
    ocupado = true; pintaBarra();
    setTimeout(() => { try { const X = FR.restaura(D, { guia, sinRecorte: true }); if (X.ok && X.mascara.width === W) { M = new ImageData(X.mascara.data, W, H); toast('🧲 ' + texto, 'ok', 4000); } else { M = guia instanceof ImageData ? guia : new ImageData(guia.data, W, H); FR.asienta(M); } }
      catch (e) { toast(e.message || String(e), 'bad'); } ocupado = false; rehazCapa(); pinta(); pintaBarra(); }, 30);
  }
  cv.addEventListener('pointerdown', ev => { if (ocupado || (ev.button !== 0 && ev.pointerType === 'mouse')) return; const p = aImg(ev); try { cv.setPointerCapture(ev.pointerId); } catch (e) { }
    if (modo === 'contorno') { if (poli.length > 2 && Math.hypot(p[0] - poli[0][0], p[1] - poli[0][1]) < 14 / vista.s) return cierraContorno(); poli.push(p); pinta(); pintaBarra(); return; }
    if (modo === 'varita-mas' || modo === 'varita-menos') { apunta(); const n = FR.varita(D, M, p, modo === 'varita-mas' ? 'mas' : 'menos', tol); if (n < 4) toast('Ahí no hay nada que coger: toca dentro de la zona.', 'warn', 2500); asienta(); return; }
    apunta(); tr = { modo, pts: [p], r: radio }; FR.pinta(M, tr); rehazCapa(); pinta(); });
  cv.addEventListener('pointermove', ev => { const p = aImg(ev); cursor = p; if (tr) { const u = tr.pts[tr.pts.length - 1]; FR.pinta(M, { modo: tr.modo, pts: [u, p], r: tr.r }); tr.pts.push(p); rehazCapa(); } pinta(); });
  const suelta = () => { if (tr) { tr = null; asienta(); } };
  cv.addEventListener('pointerup', suelta); cv.addEventListener('pointercancel', suelta); cv.addEventListener('pointerleave', () => { cursor = null; pinta(); });
  cv.addEventListener('dblclick', () => { if (modo === 'contorno') cierraContorno(); });
  const MODOS = [['mas', '🖌️ Pintar pieza', 'Pasa el pincel por lo que SÍ es pieza y el programa no ha cogido'], ['menos', '🧽 Borrar', 'Pasa el pincel por lo que NO es pieza (fondo, sombra, otra cosa)'], ['varita-mas', '🪄 Varita: añadir', 'Un toque: coge todo lo de alrededor que tiene ese mismo color'], ['varita-menos', '🪄 Varita: quitar', 'Un toque: quita todo lo de alrededor que tiene ese mismo color'], ['contorno', '✏️ Contornear', 'Marca puntos alrededor de la pieza, a ojo; al cerrar, el contorno se pega solo al borde de la foto']];
  const AYUDA = { mas: 'Pinta por encima de lo que es PIEZA. Al soltar se alisa solo.', menos: 'Pinta por encima de lo que NO es pieza. Al soltar se alisa solo.', 'varita-mas': 'Toca una zona de la pieza que falte: se añade todo lo que tiene ese color.', 'varita-menos': 'Toca una zona que sobre (fondo, sombra): se quita todo lo que tiene ese color.', contorno: 'Ve tocando puntos ALREDEDOR de la pieza (no hace falta afinar). Para cerrar: doble clic o toca el primer punto (naranja). Se pega solo al borde.' };
  function pintaBarra() {
    mount(barra, h('div.frr-modos', MODOS.map(([k, t, ti]) => h('button.frr-b' + (modo === k ? '.on' : ''), { type: 'button', 'data-modo': k, title: ti, disabled: ocupado, onclick: () => { modo = k; poli = []; pintaBarra(); pinta(); } }, t))),
      h('div.frr-ops', modo === 'mas' || modo === 'menos' ? h('label', h('span', 'Pincel'), h('input', { type: 'range', min: 3, max: Math.round(Math.max(W, H) / 12), value: radio, 'data-k': 'radio', oninput: e => { radio = Number(e.target.value); } })) : null,
        /varita/.test(modo) ? h('label', h('span', 'Cuánto coge'), h('input', { type: 'range', min: 6, max: 70, value: tol, 'data-k': 'tol', oninput: e => { tol = Number(e.target.value); } })) : null,
        modo === 'contorno' ? btn('✔ Cerrar el contorno (' + poli.length + ')', cierraContorno, { cls: 'sm frr-cierra', disabled: poli.length < 3 || ocupado }) : null,
        btn('🧲 Pegar al borde', () => { apunta(); pega(new ImageData(new Uint8ClampedArray(M.data), W, H), 'Borde pegado al de la foto donde se ve claro.'); }, { cls: 'sm frr-iman', disabled: ocupado, title: 'Lo que has marcado manda; el borde se ajusta al de la foto donde el tono lo deja claro, y se buscan los agujeros de dentro' }),
        btn('↶ Deshacer', () => { const u = pila.pop(); if (u) { M.data.set(u); rehazCapa(); pinta(); pintaBarra(); } }, { cls: 'sm ghost frr-deshacer', disabled: !pila.length || ocupado }),
        btn('↺ Como estaba', () => { apunta(); M.data.set(M0); rehazCapa(); pinta(); pintaBarra(); }, { cls: 'sm ghost', disabled: ocupado })),
      h('div.frr-fin', ocupado ? h('span.frr-esp', 'Ajustando…') : null, btn('Cancelar', () => raiz.remove(), { cls: 'ghost' }), btn('✓ Listo', guarda, { cls: 'primary frr-listo', disabled: ocupado })));
    mount(pista, AYUDA[modo]);
  }
  function guarda() { if (!cambiado) return raiz.remove(); const I = deDatos(M, 'image/png'); raiz.remove(); if (o.alGuardar) o.alGuardar(I.id); }
  raiz.append(h('div.frr-caja', h('div.frr-cab', h('div', h('small', 'OPCIÓN B · RETOCAR EL CONTORNO'), h('b', '🩹 En verde, lo que tomo por pieza. Corrígelo tú')), h('button.frr-x', { type: 'button', 'aria-label': 'Cerrar', onclick: () => raiz.remove() }, '✕')), barra, h('div.frr-lienzo', cv), pista));
  document.body.appendChild(raiz); rehazCapa(); pintaBarra(); pinta();
  const ro = window.ResizeObserver ? new ResizeObserver(() => { if (raiz.isConnected) pinta(); else ro.disconnect(); }) : null; if (ro) ro.observe(cv.parentElement);
  window.__frr = { get modo() { return modo; }, pon: k => { modo = k; poli = []; pintaBarra(); }, aPantalla: (x, y) => { const r = cv.getBoundingClientRect(); return { x: r.left + vista.ox + x * vista.s, y: r.top + vista.oy + y * vista.s }; }, cuenta: () => { let n = 0; for (let i = 0; i < W * H; i++) if (M.data[i * 4] > 127) n++; return n; }, W, H, get ocupado() { return ocupado; }, guarda, cierraContorno };
  return raiz;
}
