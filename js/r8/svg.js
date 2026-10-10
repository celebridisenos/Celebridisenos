// ================= v20.4 · 📐 CelebriR8 · IMPORTAR UN SVG (para calcar, extruir o cortar) =================
// La dueña (10-10-2026): «poder insertar svg y calcarlo». Un SVG (de Inkscape, Illustrator, Canva, una web de iconos…) se convierte
// en formas del BOCETO, en milímetros de verdad:
//  · lee <path> (M L H V C S Q T A Z, absolutas y relativas), <rect> (con esquinas redondas), <circle>, <ellipse>, <line>,
//    <polyline> y <polygon>, con sus transform (se usa la matriz que calcula el propio navegador: getCTM);
//  · respeta las UNIDADES del archivo (width="100mm", cm, in, pt, pc, px a 96 ppp); sin unidades, 1 unidad = 1 px = 0,2646 mm;
//  · contornos CERRADOS → formas sólidas; los que quedan DENTRO de otros (las letras «o», los agujeros) → AGUJEROS; los ABIERTOS
//    (líneas sueltas) no se pueden extruir: se dicen y se ponen como trazo con grosor;
//  · nada sale del aparato.
const MM_PX = 25.4 / 96;
const UNIDADES = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: MM_PX, '': MM_PX };
const largoMm = v => { const m = /^\s*([\d.+-eE]+)\s*(mm|cm|in|pt|pc|px)?\s*$/.exec(String(v || '')); return m ? Number(m[1]) * UNIDADES[m[2] || ''] : null; };

// ---------- el atributo «d» de un <path> → subcaminos [{ pts: [[x,y]…], cerrado }] (en las unidades del SVG) ----------
export function leePath(d, paso = 0.35) {
  const T = String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
  const sub = []; let cur = null, x = 0, y = 0, x0 = 0, y0 = 0, cmd = '', i = 0, cx2 = null, cy2 = null, qx = null, qy = null;
  const num = () => Number(T[i++]), hayNum = () => i < T.length && !/^[A-Za-z]$/.test(T[i]);
  const empieza = (a, b) => { cur = { pts: [[a, b]], cerrado: false }; sub.push(cur); };
  const linea = (a, b) => { if (!cur) empieza(x, y); cur.pts.push([a, b]); };
  const n = L => Math.max(2, Math.min(64, Math.ceil(L / paso)));
  const cubica = (x1, y1, x2, y2, x3, y3) => { const L = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2), k = n(L); for (let j = 1; j <= k; j++) { const t = j / k, u = 1 - t; linea(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3); } };
  const cuadratica = (x1, y1, x2, y2) => { const L = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1), k = n(L); for (let j = 1; j <= k; j++) { const t = j / k, u = 1 - t; linea(u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2); } };
  const arco = (rx, ry, rot, grande, barre, x2, y2) => { // SVG 1.1, F.6.5: de los extremos al centro
    if (!rx || !ry) return linea(x2, y2); rx = Math.abs(rx); ry = Math.abs(ry); const f = rot * Math.PI / 180, c = Math.cos(f), s = Math.sin(f);
    const dx = (x - x2) / 2, dy = (y - y2) / 2, x1p = c * dx + s * dy, y1p = -s * dx + c * dy; let L = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry); if (L > 1) { rx *= Math.sqrt(L); ry *= Math.sqrt(L); }
    const sg = grande === barre ? -1 : 1, nu = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, co = sg * Math.sqrt(Math.max(0, nu / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
    const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx, ccx = c * cxp - s * cyp + (x + x2) / 2, ccy = s * cxp + c * cyp + (y + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry); let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!barre && dt > 0) dt -= 2 * Math.PI; else if (barre && dt < 0) dt += 2 * Math.PI;
    const k = n(Math.abs(dt) * Math.max(rx, ry)); for (let j = 1; j <= k; j++) { const t = t1 + dt * j / k; linea(ccx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, ccy + rx * Math.cos(t) * s + ry * Math.sin(t) * c); }
  };
  while (i < T.length) {
    if (/^[A-Za-z]$/.test(T[i])) cmd = T[i++]; else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'Z') { if (cur) { cur.cerrado = true; x = x0; y = y0; } cur = null; cmd = ''; continue; }
    do {
      if (C === 'M') { let a = num(), b = num(); if (rel) { a += x; b += y; } empieza(a, b); x = x0 = a; y = y0 = b; cmd = rel ? 'l' : 'L'; cx2 = qx = null; break; }
      if (C === 'L') { let a = num(), b = num(); if (rel) { a += x; b += y; } linea(a, b); x = a; y = b; cx2 = qx = null; }
      else if (C === 'H') { let a = num(); if (rel) a += x; linea(a, y); x = a; cx2 = qx = null; }
      else if (C === 'V') { let b = num(); if (rel) b += y; linea(x, b); y = b; cx2 = qx = null; }
      else if (C === 'C') { let a = [num(), num(), num(), num(), num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? y : x)); cubica(...a); cx2 = a[2]; cy2 = a[3]; x = a[4]; y = a[5]; qx = null; }
      else if (C === 'S') { let a = [num(), num(), num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? y : x)); const x1 = cx2 == null ? x : 2 * x - cx2, y1 = cy2 == null ? y : 2 * y - cy2; cubica(x1, y1, a[0], a[1], a[2], a[3]); cx2 = a[0]; cy2 = a[1]; x = a[2]; y = a[3]; qx = null; }
      else if (C === 'Q') { let a = [num(), num(), num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? y : x)); cuadratica(...a); qx = a[0]; qy = a[1]; x = a[2]; y = a[3]; cx2 = null; }
      else if (C === 'T') { let a = [num(), num()]; if (rel) { a[0] += x; a[1] += y; } const x1 = qx == null ? x : 2 * x - qx, y1 = qy == null ? y : 2 * y - qy; cuadratica(x1, y1, a[0], a[1]); qx = x1; qy = y1; x = a[0]; y = a[1]; cx2 = null; }
      else if (C === 'A') { const rx = num(), ry = num(), rot = num(), g = num(), b = num(); let a = num(), c = num(); if (rel) { a += x; c += y; } arco(rx, ry, rot, g, b, a, c); x = a; y = c; cx2 = qx = null; }
      else { i++; break; }
    } while (hayNum());
  }
  return sub.map(s => { const p = s.pts; if (p.length > 2 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 1e-6) { p.pop(); s.cerrado = true; } return s; }).filter(s => s.pts.length >= 2);
}

// ---------- el SVG entero → { cerrados: [[[x,y]…]] (mm, Y hacia arriba, centrado), abiertos, ancho, alto, avisos } ----------
export function leeSVG(texto) {
  const doc = new DOMParser().parseFromString(String(texto || ''), 'image/svg+xml'), raiz = doc.documentElement;
  if (!raiz || raiz.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('Ese archivo no es un SVG que se pueda leer.');
  // en la página (oculto) para que el navegador calcule las matrices de cada forma (transform, viewBox…)
  const caja = document.createElement('div'); caja.style.cssText = 'position:fixed;left:-20000px;top:0;width:10px;height:10px;overflow:hidden;visibility:hidden;pointer-events:none';
  const svg = document.importNode(raiz, true); caja.appendChild(svg); document.body.appendChild(caja);
  try {
    // mm por unidad del SVG: con width/height en unidades físicas y viewBox, lo que digan; si no, 1 unidad = 1 px (96 ppp)
    const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number), wMm = largoMm(svg.getAttribute('width')), hMm = largoMm(svg.getAttribute('height'));
    let k = MM_PX; if (vb.length === 4 && vb[2] > 0 && wMm) k = wMm / vb[2]; else if (vb.length === 4 && vb[3] > 0 && hMm) k = hMm / vb[3]; // (sin viewBox, las coordenadas van en px aunque el ancho diga mm)
    // getCTM da la matriz hasta el sistema de la raíz (sin el viewBox): la componemos con la de la raíz para quedarnos en unidades del viewBox
    const Mraiz = svg.getCTM ? svg.getCTM() : null, inv = Mraiz ? Mraiz.inverse() : null;
    const out = [], abiertos = [], avisos = []; let nTexto = 0;
    const aplica = (el, pts) => { const M0 = el.getCTM ? el.getCTM() : null, M = M0 && inv ? inv.multiply(M0) : M0; return pts.map(([x, y]) => M ? [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f] : [x, y]); };
    const pon = (el, sub) => sub.forEach(s => { const p = aplica(el, s.pts); if (s.cerrado && p.length >= 3) out.push(p); else if (p.length >= 2) abiertos.push(p); });
    const n = (el, a) => Number(el.getAttribute(a)) || 0;
    svg.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon, text').forEach(el => {
      if (el.closest('defs, clipPath, mask, symbol, marker, pattern')) return;
      const t = el.nodeName.toLowerCase();
      if (t === 'text') { nTexto++; return; }
      if (t === 'path') return pon(el, leePath(el.getAttribute('d')));
      if (t === 'rect') { const x = n(el, 'x'), y = n(el, 'y'), w = n(el, 'width'), h = n(el, 'height'); let rx = el.hasAttribute('rx') ? n(el, 'rx') : n(el, 'ry'), ry = el.hasAttribute('ry') ? n(el, 'ry') : rx; rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
        if (!(w > 0 && h > 0)) return; if (!(rx > 0)) return pon(el, [{ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], cerrado: true }]);
        return pon(el, leePath(`M${x + rx},${y}H${x + w - rx}A${rx},${ry} 0 0 1 ${x + w},${y + ry}V${y + h - ry}A${rx},${ry} 0 0 1 ${x + w - rx},${y + h}H${x + rx}A${rx},${ry} 0 0 1 ${x},${y + h - ry}V${y + ry}A${rx},${ry} 0 0 1 ${x + rx},${y}Z`)); }
      if (t === 'circle' || t === 'ellipse') { const cx = n(el, 'cx'), cy = n(el, 'cy'), rx = t === 'circle' ? n(el, 'r') : n(el, 'rx'), ry = t === 'circle' ? n(el, 'r') : n(el, 'ry'); if (!(rx > 0 && ry > 0)) return; const m = Math.max(24, Math.min(160, Math.round(Math.max(rx, ry) * k * 6)));
        return pon(el, [{ pts: Array.from({ length: m }, (_, j) => [cx + rx * Math.cos(j * 2 * Math.PI / m), cy + ry * Math.sin(j * 2 * Math.PI / m)]), cerrado: true }]); }
      if (t === 'line') return pon(el, [{ pts: [[n(el, 'x1'), n(el, 'y1')], [n(el, 'x2'), n(el, 'y2')]], cerrado: false }]);
      const nums = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number), pts = []; for (let j = 0; j + 1 < nums.length; j += 2) pts.push([nums[j], nums[j + 1]]);
      return pon(el, [{ pts, cerrado: t === 'polygon' }]);
    });
    if (nTexto) avisos.push('Tiene ' + nTexto + ' texto' + (nTexto === 1 ? '' : 's') + ' sin convertir a trazado: no se pueden leer (en Inkscape: Trayecto → Objeto a trayecto). Escríbelo con la herramienta T del boceto.');
    if (!out.length && !abiertos.length) throw new Error('No encuentro formas en ese SVG.');
    // a mm, Y hacia arriba, centrado en (0, 0)
    const todos = out.concat(abiertos).flat(); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; todos.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, mm = p => p.map(([x, y]) => [Math.round((x - cx) * k * 1000) / 1000, Math.round(-(y - cy) * k * 1000) / 1000]);
    const cerrados = out.map(mm), ab = abiertos.map(mm);
    if (ab.length) avisos.push(ab.length + ' línea' + (ab.length === 1 ? '' : 's') + ' ABIERTA' + (ab.length === 1 ? '' : 'S') + ': no encierra' + (ab.length === 1 ? '' : 'n') + ' nada, así que no se puede' + (ab.length === 1 ? '' : 'n') + ' extruir como sólido: va' + (ab.length === 1 ? '' : 'n') + ' como trazo con grosor (o ciérrala' + (ab.length === 1 ? '' : 's') + ' en tu programa de dibujo).');
    return { cerrados, abiertos: ab, ancho: (x1 - x0) * k, alto: (y1 - y0) * k, mmPorUnidad: k, avisos };
  } finally { caja.remove(); }
}
// ¿qué anillos van DENTRO de otros? (dentro de un número impar = agujero)
const area = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return s / 2; };
const dentro = (q, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
export function aFormas(R) {
  const L = R.cerrados.map(p => ({ p, a: Math.abs(area(p)) })).filter(x => x.a > 1e-4).sort((a, b) => b.a - a.a);
  const formas = L.map((x, i) => { const n = L.slice(0, i).filter(o => o.a > x.a && dentro(x.p[0], o.p)).length; return { t: 'linea', pts: x.p, suave: true, modo: n % 2 ? 'agujero' : 'suma', svg: 1 }; });
  R.abiertos.forEach(p => formas.push({ t: 'trazo', pts: p.map(q => [q[0], q[1], 1]), ancho: 1, modo: 'suma', svg: 1 }));
  return formas;
}
