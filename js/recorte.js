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
