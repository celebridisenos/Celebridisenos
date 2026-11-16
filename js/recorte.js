// ================= v14.1 · ✂️ RECORTE DE LA ETIQUETA DE ENVÍO (inteligente y a mano) =================
// Algunas etiquetas (Vinted, sobre todo) vienen en un folio con instrucciones alrededor. Aquí se elige SOLO el recuadro de la
// etiqueta: el programa lo busca solo (donde está el código de barras o el QR y su marco) y la persona lo puede ajustar
// arrastrando las esquinas. El recorte se guarda en el pedido y vale para todas las impresiones y reimpresiones.
import { h, btn, modal, toast } from './ui.js';

// ---------- Recorte inteligente ----------
// Devuelve { x, y, w, h } en partes de la página (0–1) o null si no encuentra nada mejor que «toda la etiqueta».
export function detectarEtiqueta(src) {
  const W = 800, H = Math.max(1, Math.round(src.height / src.width * W));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(src, 0, 0, W, H);
  const px = g.getImageData(0, 0, W, H).data, osc = new Uint8Array(W * H);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let i = 0, p = 0; i < W * H; i++, p += 4) { const l = px[p] * 0.3 + px[p + 1] * 0.59 + px[p + 2] * 0.11; if (l < 150) { osc[i] = 1; const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) return null;
  // 1) se «engorda» la tinta para que cada bloque (marco, código, texto cercano) sea una sola mancha
  const r = Math.max(3, Math.round(W * 0.011)), I = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) { s += osc[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s; } }
  const suma = (a, b, c2, d) => I[d * (W + 1) + c2] - I[b * (W + 1) + c2] - I[d * (W + 1) + a] + I[b * (W + 1) + a];
  const gordo = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) gordo[y * W + x] = suma(Math.max(0, x - r), Math.max(0, y - r), Math.min(W, x + r + 1), Math.min(H, y + r + 1)) > 0 ? 1 : 0;
  // 2) manchas (componentes conectadas)
  const lab = new Int32Array(W * H), comps = [], cola = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!gordo[i] || lab[i]) continue;
    const id = comps.length + 1; let qa = 0, qb = 0; cola[qb++] = i; lab[i] = id;
    let bx0 = W, by0 = H, bx1 = 0, by1 = 0, n = 0;
    while (qa < qb) {
      const j = cola[qa++], x = j % W, y = (j / W) | 0; n++;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
      if (x > 0 && gordo[j - 1] && !lab[j - 1]) { lab[j - 1] = id; cola[qb++] = j - 1; }
      if (x < W - 1 && gordo[j + 1] && !lab[j + 1]) { lab[j + 1] = id; cola[qb++] = j + 1; }
      if (y > 0 && gordo[j - W] && !lab[j - W]) { lab[j - W] = id; cola[qb++] = j - W; }
      if (y < H - 1 && gordo[j + W] && !lab[j + W]) { lab[j + W] = id; cola[qb++] = j + W; }
    }
    comps.push({ x0: bx0, y0: by0, x1: bx1, y1: by1, n });
  }
  // 3) ¿tiene código de barras o QR? → muchas filas seguidas casi iguales y con muchos cambios blanco/negro
  // (17-10-2026: también con las barras tumbadas, si la etiqueta va girada en el folio)
  const codigo = b => {
    const enFilas = (n0, n1, m0, m1, px) => {
      let racha = 0, mejor = 0, prev = null;
      for (let a = n0; a <= n1; a++) {
        const fila = new Uint8Array(m1 - m0 + 1); for (let c = m0; c <= m1; c++) fila[c - m0] = px(a, c);
        let tr = 0; for (let x = 1; x < fila.length; x++) if (fila[x] !== fila[x - 1]) tr++;
        let dif = 0; if (prev) for (let x = 0; x < fila.length; x++) if (fila[x] !== prev[x]) dif++;
        if (tr >= 24 && prev && dif <= fila.length * 0.06) { racha++; if (racha > mejor) mejor = racha; } else racha = 0;
        prev = fila;
      }
      return mejor;
    };
    return Math.max(enFilas(b.y0, b.y1, b.x0, b.x1, (y, x) => osc[y * W + x]), enFilas(b.x0, b.x1, b.y0, b.y1, (x, y) => osc[y * W + x]));
  };
  const area = b => (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1), pagina = W * H;
  const pad = Math.round(W * 0.008);
  const devuelve = u => { const rx0 = Math.max(0, u.x0 - pad), ry0 = Math.max(0, u.y0 - pad), rx1 = Math.min(W - 1, u.x1 + pad), ry1 = Math.min(H - 1, u.y1 + pad); return { x: rx0 / W, y: ry0 / H, w: (rx1 - rx0 + 1) / W, h: (ry1 - ry0 + 1) / H }; };
  // 17-10-2026 · 0) primero, el MARCO: si la etiqueta va dentro de un rectángulo (lo normal en las de folio A4), es ese rectángulo, con
  // su código de barras o QR dentro. Antes la tinta «engordada» unía el marco con la raya de cortar y el recibo de debajo, y como
  // eso ocupaba casi todo, se daba por buena la página entera (la etiqueta salía pequeña, con las instrucciones).
  const marco = (() => {
    const fino = new Uint8Array(W * H); // (la tinta engordada 1 punto: une los trocitos de una raya fina)
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; fino[i] = osc[i] | osc[i - 1] | osc[i + 1] | osc[i - W] | osc[i + W]; }
    const visto = new Uint8Array(W * H), cand = [];
    for (let i = 0; i < W * H; i++) {
      if (!fino[i] || visto[i]) continue;
      let qa = 0, qb = 0; cola[qb++] = i; visto[i] = 1; let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
      while (qa < qb) { const j = cola[qa++], x = j % W, y = (j / W) | 0; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
        for (const v of [j - 1, j + 1, j - W, j + W]) if (v >= 0 && v < W * H && fino[v] && !visto[v] && Math.abs((v % W) - x) <= 1) { visto[v] = 1; cola[qb++] = v; } }
      const b = { x0: bx0, y0: by0, x1: bx1, y1: by1 }, bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
      if (area(b) < pagina * 0.03 || area(b) > pagina * 0.8 || bw < W * 0.15 || bh < H * 0.1) continue;
      // ¿sus cuatro lados son raya oscura (casi entera)?
      const lado = (horiz, fija) => { let n = 0, t = 0; const a0 = horiz ? bx0 : by0, a1 = horiz ? bx1 : by1; for (let a = a0; a <= a1; a++) { t++; let hay = 0; for (let e = -2; e <= 2 && !hay; e++) { const f = fija + e; if (f < 0 || f >= (horiz ? H : W)) continue; hay = horiz ? fino[f * W + a] : fino[a * W + f]; } n += hay; } return n / t; };
      if (Math.min(lado(true, by0 + 1), lado(true, by1 - 1), lado(false, bx0 + 1), lado(false, bx1 - 1)) < 0.85) continue;
      cand.push(b);
    }
    const conCod = cand.filter(b => codigo(b) >= 10).sort((a, b) => area(b) - area(a));
    return conCod[0] || null;
  })();
  if (marco) { const contenido = (x1 - x0 + 1) * (y1 - y0 + 1); return area(marco) > contenido * 0.9 ? null : devuelve(marco); }
  const conCodigo = comps.filter(b => area(b) > pagina * 0.004).map(b => Object.assign(b, { cod: codigo(b) })).filter(b => b.cod >= 10);
  if (!conCodigo.length) return null;
  // la mancha con código más grande (si hay marco, el marco engloba toda la etiqueta)
  conCodigo.sort((a, b) => area(b) - area(a));
  const u = Object.assign({}, conCodigo[0]);
  // 4) se le suman las manchas pegadas (sin marco, la dirección y los datos van sueltos al lado del código)
  const d = Math.round(W * 0.02);
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    let crecio = false;
    for (const b of comps) {
      if (b.x0 >= u.x0 && b.x1 <= u.x1 && b.y0 >= u.y0 && b.y1 <= u.y1) continue;
      const cerca = b.x0 <= u.x1 + d && b.x1 >= u.x0 - d && b.y0 <= u.y1 + d && b.y1 >= u.y0 - d;
      if (!cerca) continue;
      const nu = { x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) };
      if (area(nu) > pagina * 0.62) continue; // no se come la página entera (las instrucciones)
      Object.assign(u, nu); crecio = true;
    }
    if (!crecio) break;
  }
  const contenido = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (area(u) > contenido * 0.88) return null; // la etiqueta ya es todo lo que hay: no hace falta recortar
  return devuelve(u);
}

// ---------- 16-11-2026 · Biou: «los QR de Wallapop salen enormes: recortarlos o ponerlos más pequeños» ----------
// El arreglo del 12-11 solo valía si la etiqueta era UN QR solo (casi cuadrada). El de Wallapop trae letras, el logo o el código
// debajo: no se reconocía y se estiraba a todo lo ancho. Ahora se BUSCA el QR por sus tres cuadrados de las esquinas y se mira si
// hay código de barras de rayas (las etiquetas de transportista siempre lo llevan; el QR de Wallapop, no).
const pequeno = (src, max) => {
  const k = Math.min(1, max / Math.max(src.width, src.height)), W = Math.max(1, Math.round(src.width * k)), H = Math.max(1, Math.round(src.height * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(src, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data, bin = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) bin[i] = d[p] * 0.3 + d[p + 1] * 0.59 + d[p + 2] * 0.11 < 128 ? 1 : 0;
  return { W, H, k, bin };
};
// ¿Dónde está el QR? → { x0, y0, x1, y1, modulo } en píxeles de la imagen, o null. Solo QR derechos (o girados 90°), que es como vienen.
export function buscarQR(src) {
  if (!src || !src.width || !src.height) return null;
  const { W, H, k, bin } = pequeno(src, 1200);
  const proporcion = r => { const t = r[0] + r[1] + r[2] + r[3] + r[4]; if (t < 7) return 0; const m = t / 7, v = m * 0.6;
    return Math.abs(r[0] - m) < v && Math.abs(r[1] - m) < v && Math.abs(r[2] - 3 * m) < 3 * v && Math.abs(r[3] - m) < v && Math.abs(r[4] - m) < v ? m : 0; };
  const enCol = (x, y) => { // el mismo 1:1:3:1:1 de arriba abajo, cruzando el centro
    if (!bin[y * W + x]) return 0; let a = y, b = y; while (a > 0 && bin[(a - 1) * W + x]) a--; while (b < H - 1 && bin[(b + 1) * W + x]) b++;
    const r = [0, 0, b - a + 1, 0, 0]; let j = a - 1; while (j >= 0 && !bin[j * W + x]) { r[1]++; j--; } while (j >= 0 && bin[j * W + x]) { r[0]++; j--; }
    j = b + 1; while (j < H && !bin[j * W + x]) { r[3]++; j++; } while (j < H && bin[j * W + x]) { r[4]++; j++; }
    const m = r[0] && r[4] ? proporcion(r) : 0; return m ? { cy: (a + b) / 2, m } : 0; };
  const grupos = [];
  for (let y = 0; y < H; y++) {
    const runs = []; let x = 0;
    while (x < W) { const c = bin[y * W + x], s = x; while (x < W && bin[y * W + x] === c) x++; runs.push([c, s, x - s]); }
    for (let i = 0; i + 4 < runs.length; i++) {
      if (!runs[i][0]) continue;
      const mh = proporcion([runs[i][2], runs[i + 1][2], runs[i + 2][2], runs[i + 3][2], runs[i + 4][2]]); if (!mh) continue;
      const cx = runs[i + 2][1] + runs[i + 2][2] / 2, v = enCol(Math.round(cx), y); if (!v || v.m > mh * 1.6 || v.m < mh / 1.6) continue;
      const m = (mh + v.m) / 2, gr = grupos.find(q => Math.abs(q.x - cx) < m * 2 && Math.abs(q.y - v.cy) < m * 2 && q.m < m * 1.6 && q.m > m / 1.6);
      if (gr) { gr.n++; gr.sx += cx; gr.sy += v.cy; gr.sm += m; gr.x = gr.sx / gr.n; gr.y = gr.sy / gr.n; gr.m = gr.sm / gr.n; }
      else grupos.push({ x: cx, y: v.cy, m, n: 1, sx: cx, sy: v.cy, sm: m });
    }
  }
  const P = grupos.filter(q => q.n >= 3).sort((a, b) => b.n - a.n).slice(0, 14);
  let mejor = null;
  for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) for (let c = b + 1; c < P.length; c++) {
    const t = [P[a], P[b], P[c]], ms = t.map(q => q.m); if (Math.max(...ms) > Math.min(...ms) * 1.45) continue;
    const m = (ms[0] + ms[1] + ms[2]) / 3, dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    // la esquina es el que está a la misma distancia de los otros dos (y ellos, a la diagonal)
    for (let e = 0; e < 3; e++) {
      const E = t[e], [A, B] = t.filter((_, i) => i !== e), dA = dist(E, A), dB = dist(E, B), dAB = dist(A, B);
      if (dA < m * 12 || dB < m * 12 || Math.max(dA, dB) > Math.min(dA, dB) * 1.15 || Math.abs(dAB / ((dA + dB) / 2) - Math.SQRT2) > 0.15) continue;
      // derecho: un lado en horizontal y el otro en vertical
      const recto = (p, q) => Math.min(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) < Math.max(m * 1.5, Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) * 0.06);
      if (!recto(E, A) || !recto(E, B)) continue;
      const nota = t.reduce((s, q) => s + q.n, 0) + (dA + dB) / m;
      if (!mejor || nota > mejor.nota) mejor = { nota, t, m };
    }
  }
  if (!mejor) return null;
  const xs = mejor.t.map(q => q.x), ys = mejor.t.map(q => q.y), m = mejor.m;
  const x0 = Math.max(0, Math.min(...xs) - 3.5 * m), y0 = Math.max(0, Math.min(...ys) - 3.5 * m), x1 = Math.min(W - 1, Math.max(...xs) + 3.5 * m), y1 = Math.min(H - 1, Math.max(...ys) + 3.5 * m);
  return { x0: x0 / k, y0: y0 / k, x1: x1 / k, y1: y1 / k, modulo: m / k };
}
// ¿Lleva código de barras de RAYAS? Muchas rayas seguidas, altas y con el mismo arriba y abajo (de pie o tumbadas).
export function tieneBarras(src) {
  if (!src || !src.width || !src.height) return false;
  const { W, H, bin } = pequeno(src, 1400);
  const mira = (L, A, px) => { // L = a lo largo (donde van las rayas), A = alto de cada raya
    const minAlto = Math.max(12, Math.round(A * 0.035)), tol = Math.max(2, Math.round(A * 0.012)), hueco = Math.max(5, Math.round(L * 0.012));
    const rayas = []; let abiertas = [];
    for (let u = 0; u < L; u++) {
      const aqui = []; let v = 0;
      while (v < A) { if (!px(u, v)) { v++; continue; } const s = v; while (v < A && px(u, v)) v++; if (v - s >= minAlto) aqui.push({ a: s, b: v - 1 }); }
      const siguen = [];
      for (const r of aqui) { const o = abiertas.find(q => Math.abs(q.a - r.a) <= tol && Math.abs(q.b - r.b) <= tol); if (o) { o.u1 = u; siguen.push(o); } else siguen.push({ a: r.a, b: r.b, u0: u, u1: u }); }
      abiertas.filter(q => !siguen.includes(q)).forEach(q => rayas.push(q)); abiertas = siguen;
    }
    rayas.push(...abiertas);
    rayas.sort((p, q) => p.u0 - q.u0);
    const grupos = [];
    for (const r of rayas) {
      if (r.u1 - r.u0 + 1 > L * 0.04) continue; // (una raya de código es fina; un bloque gordo es otra cosa)
      const g = grupos.find(q => Math.abs(q.a - r.a) <= tol * 2 && Math.abs(q.b - r.b) <= tol * 2 && r.u0 - q.u1 <= hueco && r.u0 >= q.u1);
      if (g) { g.n++; g.u1 = r.u1; } else grupos.push({ a: r.a, b: r.b, u0: r.u0, u1: r.u1, n: 1 });
    }
    return grupos.some(g => g.n >= 15 && g.u1 - g.u0 > L * 0.12);
  };
  return mira(W, H, (x, y) => bin[y * W + x]) || mira(H, W, (y, x) => bin[y * W + x]);
}

// Aplica un recorte guardado ({x,y,w,h,giro}) a la página
export function aplicar(src, rc) {
  const sx = Math.round(rc.x * src.width), sy = Math.round(rc.y * src.height), sw = Math.max(1, Math.round(rc.w * src.width)), sh = Math.max(1, Math.round(rc.h * src.height));
  const giro = ((Number(rc.giro) || 0) % 360 + 360) % 360, rot = giro === 90 || giro === 270;
  const out = document.createElement('canvas'); out.width = rot ? sh : sw; out.height = rot ? sw : sh;
  const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
  o.translate(out.width / 2, out.height / 2); o.rotate(giro * Math.PI / 180); o.drawImage(src, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
  return out;
}

// ---------- Ventana para recortar a mano ----------
// src = página entera (canvas). inicial = recorte guardado o propuesto. Devuelve el recorte elegido, null = «toda la página», undefined = cancelar.
export function recortarDialog(src, inicial, opts = {}) {
  return new Promise(res => {
    let rc = inicial ? Object.assign({ giro: 0 }, inicial) : { x: 0, y: 0, w: 1, h: 1, giro: 0 }, hecho = false;
    const auto = opts.auto !== undefined ? opts.auto : detectarEtiqueta(src);
    const fin = v => { if (!hecho) { hecho = true; res(v); } };
    const img = h('img.rc-img', { src: src.toDataURL('image/png'), alt: 'Etiqueta', draggable: false });
    const caja = h('div.rc-caja', ['nw', 'ne', 'sw', 'se'].map(k => h('i.rc-h.' + k, { 'data-h': k })));
    const marco = h('div.rc-marco', img, caja);
    const prev = h('canvas.rc-prev'), info = h('div.tiny.muted');
    const pinta = () => {
      Object.assign(caja.style, { left: rc.x * 100 + '%', top: rc.y * 100 + '%', width: rc.w * 100 + '%', height: rc.h * 100 + '%' });
      const c = aplicar(src, rc), k = Math.min(180 / c.width, 240 / c.height);
      prev.width = Math.max(1, Math.round(c.width * k)); prev.height = Math.max(1, Math.round(c.height * k)); prev.getContext('2d').drawImage(c, 0, 0, prev.width, prev.height);
      info.textContent = 'Recorte: ' + Math.round(rc.w * 100) + ' % × ' + Math.round(rc.h * 100) + ' % de la página' + (rc.giro ? ' · girada ' + rc.giro + '°' : '') + '. Se imprime a 100 × 150 mm sin deformarse.';
    };
    // arrastrar la caja o sus esquinas
    caja.addEventListener('pointerdown', e => {
      e.preventDefault(); const r = marco.getBoundingClientRect(), k = e.target.dataset.h || 'mover', ini = Object.assign({}, rc), ex = e.clientX, ey = e.clientY;
      try { caja.setPointerCapture(e.pointerId); } catch (x) { }
      const mv = ev => {
        const dx = (ev.clientX - ex) / r.width, dy = (ev.clientY - ey) / r.height, min = 0.05;
        let { x, y, w, h: hh } = ini;
        if (k === 'mover') { x = Math.max(0, Math.min(1 - w, x + dx)); y = Math.max(0, Math.min(1 - hh, y + dy)); }
        else {
          if (k.includes('w')) { const nx = Math.max(0, Math.min(x + w - min, x + dx)); w += x - nx; x = nx; }
          if (k.includes('e')) w = Math.max(min, Math.min(1 - x, w + dx));
          if (k.includes('n')) { const ny = Math.max(0, Math.min(y + hh - min, y + dy)); hh += y - ny; y = ny; }
          if (k.includes('s')) hh = Math.max(min, Math.min(1 - y, hh + dy));
        }
        Object.assign(rc, { x, y, w, h: hh, modo: 'mano' }); pinta();
      };
      const up = () => { caja.removeEventListener('pointermove', mv); caja.removeEventListener('pointerup', up); caja.removeEventListener('pointercancel', up); };
      caja.addEventListener('pointermove', mv); caja.addEventListener('pointerup', up); caja.addEventListener('pointercancel', up);
    });
    const cuerpo = h('div.rc', h('p.small', auto ? '✨ He encontrado la etiqueta y he dejado fuera las instrucciones. Si hace falta, arrastra las esquinas del recuadro.' : 'Arrastra las esquinas del recuadro para dejar SOLO la etiqueta (sin las instrucciones).'),
      h('div.rc-fila', marco, h('div.rc-lado', h('div.lbl', 'Así se imprimirá'), prev, info,
        h('div.col', { style: { gap: '6px', marginTop: '8px' } },
          btn('✨ Recorte automático', () => { if (!auto) return toast('No encuentro un código de barras o QR para recortar solo: ajústalo a mano.', 'warn', 5000); Object.assign(rc, auto, { modo: 'auto' }); pinta(); }, { cls: 'sm', disabled: !auto }),
          btn('🗎 Toda la página', () => { Object.assign(rc, { x: 0, y: 0, w: 1, h: 1 }); pinta(); }, { cls: 'sm ghost' }),
          btn('↻ Girar', () => { rc.giro = ((rc.giro || 0) + 90) % 360; pinta(); }, { cls: 'sm ghost' })))));
    modal('✂️ Recortar la etiqueta', cuerpo, close => [btn('Cancelar', () => { close(); fin(undefined); }), btn('✅ Guardar recorte', () => { const todo = rc.x <= 0.001 && rc.y <= 0.001 && rc.w >= 0.999 && rc.h >= 0.999 && !rc.giro; fin(todo ? null : rc); close(); }, { cls: 'primary' })], { size: 'wide', onclose: () => fin(undefined) });
    requestAnimationFrame(pinta);
  });
}
