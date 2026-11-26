// ================= 25-11-2026 · 🖨️ IMPRENTA · LA HOJA: reparte piezas de distintos tamaños para gastar el menor papel =================
// Puro (se prueba con node) salvo canvasHoja(). Todo en mm, esquina de arriba a la izquierda. Nada se solapa y nada cae en lo que la
// impresora no pinta (margen). «sep» = blanco que queda entre el color de una pieza y el de la siguiente (el sangrado va aparte).
//   piezas: [{ id, w, h, sangrado, n, girar (def. true), forma, dorso }] · opts: { W, H, margen, sep, girar, pie }
//   → { paginas: [[item]], hojas, uso (% del papel imprimible que se aprovecha), usoPaginas, fuera: [ids que no caben], total, W, H, margen, sep }
//   item = { p (posición en piezas), id, x, y, w, h (caja de CORTE en la hoja), rot: 0|90, b (sangrado) }
import { MARGEN_EPSON } from './modelo.js';
const E = 1e-6;
const toca = (a, b) => a.x < b.x + b.w - E && b.x < a.x + a.w - E && a.y < b.y + b.h - E && b.y < a.y + a.h - E;

// ---------- Huecos libres (MaxRects) ----------
function elige(libres, w, h, girar, modo) {
  let m = null;
  libres.forEach(f => {
    const prueba = (a, b, rot) => {
      if (a > f.w + E || b > f.h + E) return; const dx = f.w - a, dy = f.h - b;
      const s = modo === 0 ? [Math.min(dx, dy), Math.max(dx, dy)] : modo === 1 ? [Math.max(dx, dy), Math.min(dx, dy)] : modo === 2 ? [f.w * f.h - a * b, Math.min(dx, dy)] : [f.y + b, f.x];
      if (!m || s[0] < m.s[0] - E || (Math.abs(s[0] - m.s[0]) <= E && s[1] < m.s[1] - E)) m = { x: f.x, y: f.y, w: a, h: b, rot, s };
    };
    prueba(w, h, 0); if (girar && Math.abs(w - h) > E) prueba(h, w, 90);
  });
  return m;
}
function ocupa(libres, u) {
  const n = [];
  libres.forEach(f => {
    if (!toca(f, u)) { n.push(f); return; }
    if (u.x > f.x + E) n.push({ x: f.x, y: f.y, w: u.x - f.x, h: f.h });
    if (u.x + u.w < f.x + f.w - E) n.push({ x: u.x + u.w, y: f.y, w: f.x + f.w - u.x - u.w, h: f.h });
    if (u.y > f.y + E) n.push({ x: f.x, y: f.y, w: f.w, h: u.y - f.y });
    if (u.y + u.h < f.y + f.h - E) n.push({ x: f.x, y: u.y + u.h, w: f.w, h: f.y + f.h - u.y - u.h });
  });
  return n.filter((a, i) => a.w > 1 && a.h > 1 && !n.some((b, j) => i !== j && a.x >= b.x - E && a.y >= b.y - E && a.x + a.w <= b.x + b.w + E && a.y + a.h <= b.y + b.h + E && (j < i || a.w < b.w - E || a.h < b.h - E)));
}
function conHuecos(L, AW, AH, orden, modo) {
  const pags = [];
  L.slice().sort(orden).forEach(r => {
    let mejor = null;
    for (const P of pags) { const m = elige(P.libres, r.w, r.h, r.girar, modo); if (m) { mejor = { P, m }; break; } } // (primero se llenan las hojas ya empezadas)
    if (!mejor) { const P = { libres: [{ x: 0, y: 0, w: AW, h: AH }], it: [] }; const m = elige(P.libres, r.w, r.h, r.girar, modo); pags.push(P); mejor = { P, m }; }
    mejor.P.libres = ocupa(mejor.P.libres, mejor.m); mejor.P.it.push({ p: r.p, x: mejor.m.x, y: mejor.m.y, w: mejor.m.w, h: mejor.m.h, rot: mejor.m.rot });
  });
  return pags.map(P => P.it);
}
// Todas iguales: bloques derechos + bloques girados (lo que haría un buen cortador). Devuelve las posiciones de UNA hoja llena.
export function bloques(W, H, w, h, girar, prof = 2) {
  const rej = (X, Y, A, B, a, b, rot) => { const c = Math.floor((A + E) / a), f = Math.floor((B + E) / b), o = []; for (let j = 0; j < f; j++) for (let i = 0; i < c; i++) o.push({ x: X + i * a, y: Y + j * b, w: a, h: b, rot }); return o; };
  const una = (X, Y, A, B, n) => {
    let m = rej(X, Y, A, B, w, h, 0); if (!girar) return m;
    const g = rej(X, Y, A, B, h, w, 90); if (g.length > m.length) m = g;
    if (n <= 0) return m;
    const nec = Math.floor((A * B + E) / (w * h)); if (m.length >= nec) return m;
    for (const [paso, eje] of [[w, 'x'], [h, 'x'], [w, 'y'], [h, 'y']]) {
      const tope = eje === 'x' ? A : B;
      for (let t = paso; t < tope - E; t += paso) {
        const r = eje === 'x' ? una(X, Y, t, B, n - 1).concat(una(X + t, Y, A - t, B, n - 1)) : una(X, Y, A, t, n - 1).concat(una(X, Y + t, A, B - t, n - 1));
        if (r.length > m.length) { m = r; if (m.length >= nec) return m; }
      }
    }
    return m;
  };
  return una(0, 0, W, H, prof);
}

export function repartir(piezas, o = {}) {
  const W = o.W || 210, H = o.H || 297, margen = Math.max(0, o.margen === undefined ? 5 : Number(o.margen)), sep = Math.max(0, o.sep === undefined ? 2 : Number(o.sep)), pie = Number(o.pie) || 0;
  const AW = W - 2 * margen + sep, AH = H - 2 * margen - pie + sep, fuera = [], L = [];
  piezas.forEach((z, p) => {
    const b = Math.max(0, Number(z.sangrado) || 0), w = z.w + 2 * b + sep, h = z.h + 2 * b + sep, girar = o.girar !== false && z.girar !== false, n = Math.max(0, Math.round(Number(z.n === undefined ? 1 : z.n)));
    if (!n) return;
    if (!((w <= AW + E && h <= AH + E) || (girar && h <= AW + E && w <= AH + E))) { fuera.push({ id: z.id, p, n }); return; }
    for (let i = 0; i < n; i++) L.push({ p, w, h, girar });
  });
  let mejor = null;
  const prueba = pags => {
    pags = pags.filter(P => P.length); const u = pags[pags.length - 1] || [];
    const alto = Math.max(0, ...u.map(r => r.y + r.h)), ancho = Math.max(0, ...u.map(r => r.x + r.w)), giradas = pags.reduce((a, P) => a + P.filter(r => r.rot).length, 0);
    const s = [pags.length, Math.round(u.length ? u.reduce((a, r) => a + r.w * r.h, 0) : 0), Math.round(Math.min(alto * AW, ancho * AH)), giradas];
    if (!mejor || cmp(s, mejor.s) < 0) mejor = { s, pags };
  };
  const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  if (L.length) {
    const areas = (a, b) => b.w * b.h - a.w * a.h, ordenes = [areas, (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || areas(a, b), (a, b) => b.h - a.h || b.w - a.w, (a, b) => b.w - a.w || b.h - a.h, (a, b) => Math.min(b.w, b.h) - Math.min(a.w, a.h) || areas(a, b)];
    const oo = L.length > 260 ? ordenes.slice(0, 2) : ordenes, mm = L.length > 260 ? [0, 3] : [0, 1, 2, 3];
    oo.forEach(or => mm.forEach(m => prueba(conHuecos(L, AW, AH, or, m))));
    // una sola medida (o varias piezas iguales de tamaño): rejilla y bloques
    const a = L[0]; if (L.every(r => Math.abs(r.w - a.w) < E && Math.abs(r.h - a.h) < E)) {
      const B = bloques(AW, AH, a.w, a.h, L.every(r => r.girar)); if (B.length) { const pags = []; for (let i = 0; i < L.length; i += B.length) pags.push(B.slice(0, Math.min(B.length, L.length - i)).map((q, j) => Object.assign({}, q, { p: L[i + j].p }))); prueba(pags); }
    }
  }
  const paginas = (mejor ? mejor.pags : []).map(P => P.map(r => { const z = piezas[r.p], b = Math.max(0, Number(z.sangrado) || 0); return { p: r.p, id: z.id, x: margen + r.x + b, y: margen + r.y + b, w: r.w - 2 * b - sep, h: r.h - 2 * b - sep, rot: r.rot, b }; }));
  // cada hoja, centrada en su sitio: quedan blancos iguales a los lados y las marcas de corte caben
  paginas.forEach(P => {
    const x0 = Math.min(...P.map(i => i.x - i.b)), x1 = Math.max(...P.map(i => i.x + i.w + i.b)), y0 = Math.min(...P.map(i => i.y - i.b)), y1 = Math.max(...P.map(i => i.y + i.h + i.b));
    const dx = o.centrar === false ? 0 : (W - x1 - x0) / 2, dy = o.centrar === false || paginas.length && P.length < 2 && y1 - y0 < (H - 2 * margen) * 0.5 ? 0 : (H - pie - y1 - y0) / 2;
    P.forEach(i => { i.x = red(i.x + dx); i.y = red(i.y + (o.centrarAlto === false ? 0 : dy)); i.w = red(i.w); i.h = red(i.h); });
  });
  const util = (W - 2 * MARGEN_EPSON) * (H - 2 * MARGEN_EPSON), usoPaginas = paginas.map(P => Math.round(P.reduce((a, i) => a + i.w * i.h, 0) / util * 1000) / 10);
  return { paginas, hojas: paginas.length, usoPaginas, uso: paginas.length ? Math.round(usoPaginas.reduce((a, b) => a + b, 0) / paginas.length * 10) / 10 : 0, fuera, total: L.length, W, H, margen, sep, pie };
}
const red = v => Math.round(v * 1000) / 1000;

// ¿Cuántas caben en una hoja? (una sola pieza)
export function cuantasCaben(z, o = {}) { const r = repartir([Object.assign({}, z, { n: 1 })], o); if (r.fuera.length) return 0; let lo = 1, hi = 2; const una = n => repartir([Object.assign({}, z, { n })], o).hojas === 1; while (una(hi) && hi < 500) { lo = hi; hi *= 2; } while (hi - lo > 1) { const m = (lo + hi) >> 1; if (una(m)) lo = m; else hi = m; } return lo; }
// Rellena los huecos de las hojas que ya se van a gastar con más copias (por turnos). Devuelve las piezas con su «n» nuevo.
export function rellenarHuecos(piezas, o = {}) {
  const Z = piezas.map(z => Object.assign({}, z, { n: Math.max(0, Math.round(Number(z.n === undefined ? 1 : z.n))) })), base = repartir(Z, o).hojas; if (!base) return Z;
  let vivas = Z.map((_, i) => i).filter(i => Z[i].n > 0), pasos = 0;
  while (vivas.length && pasos++ < 400) { const i = vivas.shift(); Z[i].n++; if (repartir(Z, o).hojas > base) Z[i].n--; else vivas.push(i); }
  return Z;
}

// ---------- La otra cara (doble cara a MANO: la Epson ET-2860 no la hace sola) ----------
// Al dar la vuelta a la hoja por el lado largo (como la página de un libro), la izquierda pasa a la derecha: se reparte espejado.
export function dorsoDe(pag, W, H, borde = 'largo') {
  return pag.map(i => borde === 'corto' ? Object.assign({}, i, { y: red(H - i.y - i.h), rot: (180 - i.rot + 360) % 360 }) : Object.assign({}, i, { x: red(W - i.x - i.w), rot: (360 - i.rot) % 360 }));
}
export const INSTRUCCION_DORSO = [
  'Imprime la cara A y espera 5 minutos a que seque la tinta.',
  'Coge el montón TAL CUAL ha salido y dale la vuelta como la página de un libro (izquierda ↔ derecha). Lo de arriba sigue arriba.',
  'Vuelve a ponerlo en la bandeja de atrás, con la cara en blanco hacia donde mira la impresora, y pulsa «Imprimir cara B».',
  'Haz la primera con UNA hoja y míralas a contraluz: si no casan, gira el montón y repite.'
];
// Dónde cae en la hoja un punto (u, v) de la pieza (mm desde su esquina de corte, sin girar)
export function aHoja(i, u, v) { return i.rot === 90 ? [i.x + i.w - v, i.y + u] : i.rot === 180 ? [i.x + i.w - u, i.y + i.h - v] : i.rot === 270 ? [i.x + v, i.y + i.h - u] : [i.x + u, i.y + v]; }
// Matriz (mm) para pintar la pieza en su sitio: [a, b, c, d, e, f]
export function matriz(i) { const [e, f] = aHoja(i, 0, 0), [x1, y1] = aHoja(i, 1, 0), [x2, y2] = aHoja(i, 0, 1); return [x1 - e, y1 - f, x2 - e, y2 - f, e, f].map(v => Math.round(v * 1e6) / 1e6); }

// ---------- Marcas de corte, guías de esquina y contornos ----------
// tipo: 'corte' (rayitas por fuera) · 'esquinas' (escuadras en la esquina) · 'contorno' (línea fina por donde se corta) · 'nada'
// → { lineas: [[x1,y1,x2,y2]], contornos: [item con forma], bordes: [item con forma], color, grosor, colorBorde, grosorBorde }
// 26-11-2026 (Biou; ajustes probados en papel por la Claude del portátil): en las hojas de RECORTABLES, marcas NEGRAS en las 4 esquinas
// de cada pieza, por fuera, de 0,8 a 3,8 mm de la esquina y de 0,3 mm de grueso, y una raya de 0,2 mm justo en el borde (la línea de corte).
// Si la pieza lleva sangrado, la marca empieza 0,2 mm después del sangrado (nunca encima del color) y mide lo mismo (3 mm).
// Nunca entra en otra pieza ni en su sangrado (deja 0,4 mm): si no cabe entera se acorta, y si se queda en menos de 0,6 mm no se pinta.
export const MARCA = Object.freeze({ desde: 0.8, hasta: 3.8, grosor: 0.3, color: '#000000', borde: 0.2, colorBorde: '#000000', holgura: 0.4, minimo: 0.6 });
export function marcas(pag, formas, o = {}) {
  const tipo = o.tipo || 'corte', W = o.W || 210, H = o.H || 297, lim = MARGEN_EPSON, lineas = [], contornos = [], bordes = [];
  if (tipo === 'nada') return { lineas, contornos, bordes };
  const conForma = i => { const f = formas[i.p] || {}; return Object.assign({}, i, { forma: f.forma || 'rect', radio: Number(f.radio) || 0 }); };
  const recta = i => { const f = formas[i.p] || {}; return !(f.forma === 'circulo' || f.forma === 'ovalo'); };
  // rayita desde la esquina (x,y) hacia (dx,dy), de «a» a «b» mm; se corta antes de otra pieza (con su sangrado) o del margen que no pinta
  const raya = (yo, x, y, dx, dy, a, b) => {
    if (dy === 0 && (y < lim - E || y > H - lim + E)) return 0;
    if (dx === 0 && (x < lim - E || x > W - lim + E)) return 0;
    let t = Math.min(b, dx > 0 ? W - lim - x : dx < 0 ? x - lim : Infinity, dy > 0 ? H - lim - y : dy < 0 ? y - lim : Infinity);
    for (const j of pag) {
      if (j === yo) continue;
      const g = (j.b || 0) + MARCA.holgura, X0 = j.x - g, X1 = j.x + j.w + g, Y0 = j.y - g, Y1 = j.y + j.h + g;
      let s0, s1;
      if (dy === 0) { if (y <= Y0 || y >= Y1) continue; s0 = dx > 0 ? X0 - x : x - X1; s1 = dx > 0 ? X1 - x : x - X0; }
      else { if (x <= X0 || x >= X1) continue; s0 = dy > 0 ? Y0 - y : y - Y1; s1 = dy > 0 ? Y1 - y : y - Y0; }
      if (s1 < a) continue; // (queda detrás)
      t = Math.min(t, s0);  // (si s0 ≤ a, ya empezaría dentro de la otra: no se pinta)
    }
    if (t - a < MARCA.minimo - E) return 0;
    lineas.push([x + dx * a, y + dy * a, x + dx * t, y + dy * t].map(red)); return 1;
  };
  const marca = (yo, x, y, dx, dy) => {
    const b = yo.b || 0, a = Math.max(MARCA.desde, b + 0.2);
    if (raya(yo, x, y, dx, dy, a, a + MARCA.hasta - MARCA.desde)) return;
    if (b > MARCA.desde) raya(yo, x, y, dx, dy, MARCA.desde, MARCA.hasta); // piezas muy juntas: dentro de su propio sangrado (que se tira)
  };
  pag.forEach(i => {
    const x2 = i.x + i.w, y2 = i.y + i.h, f = formas[i.p] || {};
    if (tipo === 'contorno' || !recta(i) || (f.forma === 'redondo' && f.radio > 0)) contornos.push(conForma(i));
    if (tipo === 'contorno') return;
    if (tipo === 'esquinas' && recta(i)) { const l = Math.min(3, i.w / 4, i.h / 4); [[i.x, i.y, 1, 1], [x2, i.y, -1, 1], [i.x, y2, 1, -1], [x2, y2, -1, -1]].forEach(([x, y, sx, sy]) => { lineas.push([x, y, x + l * sx, y].map(red), [x, y, x, y + l * sy].map(red)); }); return; }
    if (tipo === 'corte' && o.raya !== false) bordes.push(conForma(i));
    if (recta(i)) [[i.x, -1], [x2, 1]].forEach(([x, sx]) => [[i.y, -1], [y2, 1]].forEach(([y, sy]) => { marca(i, x, y, sx, 0); marca(i, x, y, 0, sy); }));
    else { const cx = i.x + i.w / 2, cy = i.y + i.h / 2; marca(i, i.x, cy, -1, 0); marca(i, x2, cy, 1, 0); marca(i, cx, i.y, 0, -1); marca(i, cx, y2, 0, 1); }
  });
  const vistos = new Set(), unicas = lineas.filter(l => { const k = l.join(); if (vistos.has(k)) return false; vistos.add(k); return true; });
  const fina = tipo === 'esquinas'; // las escuadras siguen siendo guías finas en grafito
  return { lineas: unicas, contornos, bordes, color: fina ? '#1F2328' : MARCA.color, grosor: fina ? 0.1 : MARCA.grosor, colorContorno: '#8A8F98', colorBorde: MARCA.colorBorde, grosorBorde: MARCA.borde };
}

// ---------- La hoja como imagen (para la impresora) ----------
// docs = [doc de cada pieza] · o: { dpi, cara, marcas, formas, regla (comprobación de 50 mm en el pie), texto }
export async function canvasHoja(rep, n, docs, o = {}) {
  const P = await import('./pintar.js'); await P.preparar(...docs);
  const k = (o.dpi || 300) / 25.4, c = document.createElement('canvas'); c.width = Math.round(rep.W * k); c.height = Math.round(rep.H * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  pintaHoja(g, k, rep, n, docs, Object.assign({}, o, { P })); return c;
}
export function pintaHoja(g, k, rep, n, docs, o) {
  const dorso = o.cara === 'dorso', pag = dorso ? dorsoDe(rep.paginas[n], rep.W, rep.H, o.borde) : rep.paginas[n];
  pag.forEach(i => {
    const d = docs[i.p]; if (!d || (dorso && !d.dorso)) return; const m = matriz(i);
    g.save(); g.translate(Math.round(m[4] * k), Math.round(m[5] * k)); g.rotate(i.rot * Math.PI / 180); o.P.pintarCara(g, d, { k, cara: o.cara, sangrado: true, huecos: o.huecos }); g.restore();
  });
  if (!dorso || o.marcasDorso) {
    const M = marcas(pag, docs, { tipo: o.marcas || 'corte', W: rep.W, H: rep.H, sep: rep.sep, raya: o.raya });
    // raya de 0,2 mm justo en la línea de corte (mitad dentro, mitad fuera)
    const conRaya = new Set((M.bordes || []).map(i => i.p + ':' + i.x + ':' + i.y));
    g.strokeStyle = M.colorBorde || '#000000'; (M.bordes || []).forEach(i => { g.save(); g.translate(i.x * k, i.y * k); o.P.rutaCorte(g, i, k, 0); g.lineWidth = Math.max(1, (M.grosorBorde || 0.2) * k); g.stroke(); g.restore(); });
    g.strokeStyle = M.color || '#000000'; g.lineWidth = Math.max(1, (M.grosor || 0.1) * k); g.lineCap = 'butt'; M.lineas.forEach(l => { g.beginPath(); g.moveTo(l[0] * k, l[1] * k); g.lineTo(l[2] * k, l[3] * k); g.stroke(); });
    g.strokeStyle = M.colorContorno || '#8A8F98'; M.contornos.filter(i => !conRaya.has(i.p + ':' + i.x + ':' + i.y)).forEach(i => { g.save(); g.translate(i.x * k, i.y * k); o.P.rutaCorte(g, i, k, 0); g.setLineDash([1 * k, 1 * k]); g.lineWidth = Math.max(1, 0.1 * k); g.stroke(); g.restore(); });
  }
  if (o.regla && rep.pie >= 4) pieDeHoja(g, k, rep, n, o);
}
// Pie: regla de 50 mm (si al medirla con una regla no da 50, la impresora ha encogido la hoja) y qué hoja es
function pieDeHoja(g, k, rep, n, o) {
  const y = rep.H - MARGEN_EPSON - 1.2, x = MARGEN_EPSON + 4; g.strokeStyle = g.fillStyle = '#1F2328'; g.lineWidth = Math.max(1, 0.15 * k); g.beginPath(); g.moveTo(x * k, y * k); g.lineTo((x + 50) * k, y * k);
  for (let i = 0; i <= 50; i += 5) { g.moveTo((x + i) * k, y * k); g.lineTo((x + i) * k, (y - (i % 10 ? 0.8 : 1.5)) * k); } g.stroke();
  g.font = '500 ' + 2.1 * k + 'px "Imp Inter", "Segoe UI", sans-serif'; g.textBaseline = 'alphabetic'; g.fillText('50 mm justos = tamaño real · hoja ' + (n + 1) + ' de ' + rep.hojas + (o.cara === 'dorso' ? ' · cara B' : ' · cara A') + (o.texto ? ' · ' + o.texto : ''), (x + 53) * k, y * k);
}
