// ================= 👗 CelebriDREW · 📐 DE UNA IMAGEN DE PATRÓN A LA PRENDA (18-10-2026) =================
// Ella: «quiero otra función de patrón a ropa de una imagen: el patrón tiene que saber rediseñarlo, ponerle las medidas y comenzar a trabajarlo».
// Una imagen de un PATRÓN (una hoja escaneada, una foto del papel, un dibujo de internet con sus piezas) → sus PIEZAS (las líneas cerradas),
// QUÉ ES cada una por su forma (delantero, espalda, manga, falda, pernera, capucha, tira, bolsillo), sus MEDIDAS (pecho, largo, hombros,
// cuello, escotes, sisa, manga…) y, con ellas, la prenda REDISEÑADA en la plantilla de CelebriDREW: limpia, cosible en 3D, graduable y
// editable. Se dice cuánto se PARECE a la de la imagen (pieza a pieza). Sin IA: todo con la forma de las piezas (se prueba en Node:
// test/unit/drew_patron_img.mjs, con patrones dibujados a partir de las plantillas, de medidas conocidas).
// La ESCALA: o la da ella (dos puntos y lo que mide, o «este ancho mide…»), o se SUPONE la de su avatar (el pecho de la prenda) y se dice.

import * as BL from '../bloques/index.js';
import * as Z from '../pieza.js';

// ---------- 1 · la imagen → la máscara de cada pieza ----------
function luz(img) { const { w, h, d } = img, L = new Uint8Array(w * h); for (let i = 0, j = 0; i < w * h; i++, j += 4) { const a = d[j + 3] / 255; L[i] = Math.round((0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) * a + 255 * (1 - a)); } return L; }
function otsu(L) { const H = new Float64Array(256); L.forEach(v => H[v]++); const N = L.length; let s = 0; for (let i = 0; i < 256; i++) s += i * H[i];
  // (el corte, a MEDIO CAMINO entre la media de lo oscuro y la de lo claro: con una hoja de dos tonos, el «mejor» corte caía justo en el tono de la línea)
  let sB = 0, wB = 0, mejor = 0, t = 127; for (let i = 0; i < 256; i++) { wB += H[i]; if (!wB) continue; const wF = N - wB; if (!wF) break; sB += i * H[i]; const mB = sB / wB, mF = (s - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > mejor) { mejor = v; t = (mB + mF) / 2; } } return t; }
// dilatar (cuadrado de radio r) con dos pasadas de ventana
function dilata(M, w, h, r) { if (r <= 0) return M; const T = new Uint8Array(w * h), O = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { let c = 0; for (let x = -r; x < w; x++) { if (x + r < w && M[y * w + x + r]) c++; if (x - r - 1 >= 0 && M[y * w + x - r - 1]) c--; if (x >= 0) T[y * w + x] = c > 0 ? 1 : 0; } }
  for (let x = 0; x < w; x++) { let c = 0; for (let y = -r; y < h; y++) { if (y + r < h && T[(y + r) * w + x]) c++; if (y - r - 1 >= 0 && T[(y - r - 1) * w + x]) c--; if (y >= 0) O[y * w + x] = c > 0 ? 1 : 0; } }
  return O; }
const erosiona = (M, w, h, r) => { const N = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) N[i] = M[i] ? 0 : 1; const D = dilata(N, w, h, r); for (let i = 0; i < w * h; i++) D[i] = D[i] ? 0 : 1; return D; };
// lo que se alcanza desde el borde de la imagen sin cruzar una línea
function fuera(paso, w, h) { const F = new Uint8Array(w * h), cola = new Int32Array(w * h); let a = 0, b = 0; const mete = i => { if (!F[i] && paso[i]) { F[i] = 1; cola[b++] = i; } };
  for (let x = 0; x < w; x++) { mete(x); mete((h - 1) * w + x); } for (let y = 0; y < h; y++) { mete(y * w); mete(y * w + w - 1); }
  while (a < b) { const i = cola[a++], x = i % w; if (x > 0) mete(i - 1); if (x < w - 1) mete(i + 1); if (i >= w) mete(i - w); if (i < w * (h - 1)) mete(i + w); } return F; }
// trozos (4-vecinos) → etiquetas y datos de cada uno
function trozos(M, w, h) { const E = new Int32Array(w * h), cola = new Int32Array(w * h), T = []; let n = 0;
  for (let s = 0; s < w * h; s++) { if (!M[s] || E[s]) continue; n++; let a = 0, b = 0, area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0; E[s] = n; cola[b++] = s;
    while (a < b) { const i = cola[a++], x = i % w, y = (i - x) / w; area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && M[j] && !E[j]) { E[j] = n; cola[b++] = j; } }
    T.push({ id: n, area, caja: [x0, y0, x1, y1], ini: s }); }
  return { E, T }; }
// el CONTORNO de un trozo (Moore, en el sentido de las agujas con y hacia abajo) → puntos (centros de píxel)
const DIR = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
function contornoDe(E, w, h, id, ini) {
  const dentro = (x, y) => x >= 0 && y >= 0 && x < w && y < h && E[y * w + x] === id, x0 = ini % w, y0 = (ini - x0) / w, P = [[x0 + 0.5, y0 + 0.5]];
  let cx = x0, cy = y0, b = 4, primero = -1; // (b: hacia dónde queda lo de fuera que se acaba de mirar; al empezar, el oeste)
  for (let it = 0; it < 4 * w * h; it++) { let k, hallado = -1;
    for (k = 1; k <= 8; k++) { const dd = (b + k) % 8, nx = cx + DIR[dd][0], ny = cy + DIR[dd][1]; if (dentro(nx, ny)) { hallado = dd; break; } }
    if (hallado < 0) break; // (un píxel suelto)
    if (cx === x0 && cy === y0) { if (primero < 0) primero = hallado; else if (hallado === primero) break; }
    const px = cx + DIR[(hallado + 7) % 8][0], py = cy + DIR[(hallado + 7) % 8][1]; cx += DIR[hallado][0]; cy += DIR[hallado][1];
    b = DIR.findIndex(d => d[0] === px - cx && d[1] === py - cy); if (b < 0) b = (hallado + 4) % 8;
    if (cx === x0 && cy === y0 && P.length > 2 && primero >= 0) { /* (vuelta completa: se mira el siguiente paso para cerrar) */ } else P.push([cx + 0.5, cy + 0.5]); }
  return P;
}
// simplificar (Douglas–Peucker) un contorno cerrado
function rdp(P, eps) { if (P.length < 4) return P.slice(); const d2 = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; if (!L) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2; };
  const abre = L => { const st = [[0, L.length - 1]], keep = new Uint8Array(L.length); keep[0] = keep[L.length - 1] = 1; while (st.length) { const [i, j] = st.pop(); let m = -1, md = eps * eps; for (let k = i + 1; k < j; k++) { const v = d2(L[k], L[i], L[j]); if (v > md) { md = v; m = k; } } if (m >= 0) { keep[m] = 1; st.push([i, m], [m, j]); } } return L.filter((_, k) => keep[k]); };
  let far = 0, fd = 0; P.forEach((p, k) => { const v = (p[0] - P[0][0]) ** 2 + (p[1] - P[0][1]) ** 2; if (v > fd) { fd = v; far = k; } });
  const A = abre(P.slice(0, far + 1)), B = abre(P.slice(far).concat([P[0]])); return A.concat(B.slice(1, -1)); }

// → { modo: 'lineas' | 'relleno', piezas: [{ poly (px, y hacia abajo), area, caja }], avisos, r }
export function piezasDeImagen(img, o = {}) {
  const { w, h } = img, L = luz(img), borde = []; for (let x = 0; x < w; x += 3) borde.push(L[x], L[(h - 1) * w + x]); for (let y = 0; y < h; y += 3) borde.push(L[y * w], L[y * w + w - 1]);
  borde.sort((a, b) => a - b); const fondo = borde[borde.length >> 1], t = otsu(L), claroFondo = fondo > t, tinta = new Uint8Array(w * h); let nT = 0;
  for (let i = 0; i < w * h; i++) { const v = claroFondo ? L[i] < Math.min(t, fondo - 25) : L[i] > Math.max(t, fondo + 25); if (v) { tinta[i] = 1; nT++; } }
  const fr = nT / (w * h), modo = fr > 0.2 ? 'relleno' : 'lineas', avisos = [], lado = Math.max(w, h), minArea = Math.max(400, (o.minFrac || 0.004) * w * h);
  let mejor = null;
  for (const k of modo === 'lineas' ? [1, 2, 4] : [1]) {
    const r = Math.max(1, Math.round(lado * 0.0022 * k)); let M;
    if (modo === 'lineas') { const D = dilata(tinta, w, h, r), paso = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) paso[i] = D[i] ? 0 : 1; const F = fuera(paso, w, h); M = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) M[i] = F[i] ? 0 : 1; M = erosiona(M, w, h, r); }
    else { const paso = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) paso[i] = tinta[i] ? 0 : 1; const F = fuera(paso, w, h); M = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) M[i] = F[i] ? 0 : 1; }
    let { E, T } = trozos(M, w, h);
    // un MARCO alrededor de toda la hoja (encierra todo): se mira solo lo de dentro
    const marco = T.find(q => (q.caja[2] - q.caja[0]) > 0.9 * w && (q.caja[3] - q.caja[1]) > 0.9 * h);
    if (marco && !o.sinMarco) { const m = Math.round(lado * 0.012) + 2 * r + 2, x0 = marco.caja[0] + m, y0 = marco.caja[1] + m, x1 = marco.caja[2] - m, y1 = marco.caja[3] - m;
      if (x1 - x0 > 40 && y1 - y0 > 40) { const W2 = x1 - x0, H2 = y1 - y0, d2 = new Uint8ClampedArray(W2 * H2 * 4); for (let y = 0; y < H2; y++) d2.set(img.d.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1) * 4), y * W2 * 4);
        const R = piezasDeImagen({ w: W2, h: H2, d: d2 }, Object.assign({}, o, { sinMarco: true })); R.piezas.forEach(p => { p.poly = p.poly.map(([x, y]) => [x + x0, y + y0]); p.caja = [p.caja[0] + x0, p.caja[1] + y0, p.caja[2] + x0, p.caja[3] + y0]; }); R.avisos.unshift('La hoja tiene un marco: he mirado lo de dentro.'); return R; } }
    // fuera lo pequeño (letras, flechas, números) y lo que es casi todo tinta sin hueco dentro (un título en negrita)
    const P = T.filter(q => q.area >= minArea).map(q => { let tin = 0; for (let y = q.caja[1]; y <= q.caja[3]; y++) for (let x = q.caja[0]; x <= q.caja[2]; x++) { const i = y * w + x; if (E[i] === q.id && tinta[i]) tin++; } return Object.assign(q, { tinta: tin / q.area }); })
      .filter(q => modo === 'relleno' || q.tinta < 0.6);
    const piezas = P.map(q => { const C = contornoDe(E, w, h, q.id, q.ini); return { poly: rdp(C, Math.max(1, lado * 0.0018)), area: q.area, caja: q.caja }; }).filter(p => p.poly.length >= 4);
    const nota = piezas.reduce((s, p) => s + p.area, 0);
    if (!mejor || piezas.length > mejor.piezas.length || (piezas.length === mejor.piezas.length && nota > mejor.nota * 1.02)) mejor = { modo, piezas, r, nota };
    if (piezas.length >= 2) break; // (con las líneas cortadas o a trazos, se cierran con un pincel más gordo; si ya salen, no hace falta)
  }
  mejor.piezas.sort((a, b) => b.area - a.area);
  if (!mejor.piezas.length) avisos.push('No encuentro piezas cerradas: ¿las líneas del patrón están cortadas o la foto está muy oscura?');
  return { modo: mejor.modo, piezas: mejor.piezas, avisos, r: mejor.r };
}

// ---------- 2 · qué es cada pieza (por su forma) ----------
// el ancho de la pieza a cada altura: [xmin, xmax] de la fila (y hacia ABAJO, en la imagen)
function filas(poly, n = 80) { const ys = poly.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys), F = [];
  for (let k = 0; k <= n; k++) { const y = y0 + (y1 - y0) * (0.01 + 0.98 * k / n), xs = []; /* (no justo en el borde de arriba o de abajo: ahí una raya horizontal da cruces de más) */ for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xa, ya] = poly[j], [xb, yb] = poly[i]; if ((ya <= y) !== (yb <= y)) xs.push(xa + (y - ya) / (yb - ya) * (xb - xa)); }
    xs.sort((p, q) => p - q); let seg = 0; for (let i = 0; i + 1 < xs.length; i += 2) seg += xs[i + 1] - xs[i];
    F.push(xs.length >= 2 ? { y, a: xs[0], b: xs[xs.length - 1], seg } : { y, a: NaN, b: NaN, seg: 0 }); }
  return { y0, y1, F }; }
// la parte de ARRIBA del contorno en cada columna (y hacia abajo: el menor y)
function techo(poly, x) { let best = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xa, ya] = poly[j], [xb, yb] = poly[i]; if ((xa <= x) !== (xb <= x)) { const y = ya + (x - xa) / (xb - xa) * (yb - ya); if (y < best) best = y; } } return best; }
export function forma(poly) {
  const xs = poly.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), W = x1 - x0, { y0, y1, F } = filas(poly), H = y1 - y0, val = F.filter(f => isFinite(f.a));
  const tol = Math.max(1.5, 0.015 * W), izq = val.filter(f => f.a - x0 < tol).length / val.length, der = val.filter(f => x1 - f.b < tol).length / val.length;
  const cx = (x0 + x1) / 2, asim = val.reduce((s, f) => s + Math.abs((cx - f.a) - (f.b - cx)), 0) / val.length / Math.max(1, W);
  const ancho = f => f.b - f.a, en = q => val[Math.max(0, Math.min(val.length - 1, Math.round(q * (val.length - 1))))];
  const maxW = Math.max(...val.map(ancho)), iMax = val.findIndex(f => ancho(f) >= maxW - 0.5);
  let ar = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) ar += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  const llena = Math.abs(ar / 2) / Math.max(1, W * H), dob = izq >= 0.5 && izq >= der ? 'izq' : der >= 0.5 ? 'der' : null;
  // la SISA: por el lado de fuera, desde lo más saliente de arriba (el hombro) hasta la axila (donde llega al ancho del costado), la línea ENTRA
  const ext = f => (dob === 'izq' ? f.b - x0 : dob === 'der' ? x1 - f.a : (f.b - f.a) / 2), E = val.map(ext), n = E.length;
  // (el hombro: el PRIMER saliente bajando desde arriba —la línea crece por el hombro y luego entra en la sisa—; sin ese saliente, no hay sisa)
  let iSp = -1; for (let i = 1; i < Math.round(n * 0.45); i++) { let mx = i; for (let j = 0; j <= i; j++) if (E[j] > E[mx]) mx = j; if (E[mx] - E[i] > 0.012 * W) { iSp = mx; break; } }
  const lado = E.slice(Math.round(n * 0.45), Math.round(n * 0.85)).sort((a, b) => a - b), Wc = lado[lado.length >> 1] || Math.max(...E);
  let iAx = -1; for (let i = iSp + 1; i < Math.round(n * 0.8); i++) if (E[i] >= 0.97 * Wc) { iAx = i; break; }
  let entra = 0; if (iSp >= 0 && iAx > iSp + 2) for (let i = iSp + 1; i < iAx; i++) { const t = (i - iSp) / (iAx - iSp), cuerda = E[iSp] + t * (E[iAx] - E[iSp]); entra = Math.max(entra, cuerda - E[i]); }
  const sisa = iSp >= 0 && entra > 0.02 * W && E[iSp] < 0.97 * Wc, eMax = Math.max(...E), iMx = E.indexOf(eMax);
  // el GANCHO del tiro (pernera): arriba sale hacia un lado más que la cintura y que la pierna de más abajo
  const An = val.map(f => f.b - f.a), gMax = Math.max(...An.slice(Math.round(n * 0.12), Math.round(n * 0.45))), gancho = gMax > 1.1 * An[0] && gMax > 1.05 * An[Math.round(n * 0.6)];
  // la CAPUCHA: redonda por detrás (lo más ancho en medio; arriba y abajo, menos)
  const redonda = iMx > 0.2 * n && iMx < 0.8 * n && E[0] < 0.9 * eMax && E[n - 1] < 0.95 * eMax;
  // la cintura de una falda: lo que mide la tela JUSTO bajo el borde de arriba (las pinzas, abiertas del todo)
  const yTop = y0 + 0.004 * H, xsT = []; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xa, ya] = poly[j], [xb, yb] = poly[i]; if ((ya <= yTop) !== (yb <= yTop)) xsT.push(xa + (yTop - ya) / (yb - ya) * (xb - xa)); }
  xsT.sort((p, q) => p - q); let segTop = 0; for (let i = 0; i + 1 < xsT.length; i += 2) segTop += xsT[i + 1] - xsT[i];
  return { x0, x1, y0, y1, W, H, F: val, llena, sisa, redonda, segTop, gancho, entra: entra / Math.max(1, W), doblez: izq >= 0.5 && izq >= der ? 'izq' : der >= 0.5 ? 'der' : null, izq, der, asim, maxW, fMax: iMax / Math.max(1, val.length - 1),
    arriba: ancho(en(0.04)), medio: ancho(en(0.5)), abajo: ancho(en(0.97)), largoAncho: Math.max(W, H) / Math.max(1, Math.min(W, H)) };
}
export function cinturaArriba(poly, Fm) { let L = 0, prev = null; const banda = Fm.y0 + 0.07 * Fm.H;
  for (let k = 0; k <= 240; k++) { const x = Fm.x0 + (Fm.x1 - Fm.x0) * (0.002 + 0.996 * k / 240), y = techo(poly, x), q = isFinite(y) && y < banda ? [x, y] : null;
    if (q && prev && Math.abs(q[1] - prev[1]) < 1.2 * Math.abs(q[0] - prev[0])) L += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
  return L; }
export const TIPOS = { cuerpo: 'Cuerpo (delantero o espalda)', delantero: 'Delantero', espalda: 'Espalda', manga: 'Manga', falda: 'Falda', pernera: 'Pernera (pantalón)', capucha: 'Capucha', tira: 'Tira (cuello, puño, cintura)', bolsillo: 'Bolsillo', otra: 'Otra pieza' };
// → el tipo de UNA pieza, con lo que lo dice (para enseñarlo)
export function tipoDe(Fm, areaRel) {
  const sim = Fm.asim < 0.06 && !Fm.doblez, grande = areaRel >= 0.35;
  if (Fm.llena > 0.95 && (Fm.largoAncho >= 3.4 || !grande)) return { tipo: 'tira', porque: 'un rectángulo (tira, puño o cintura)' };
  if (Fm.largoAncho >= 3.4) return { tipo: 'tira', porque: 'larga y estrecha' };
  // MANGA: simétrica, lo más ancho (la axila) en el tercio de arriba y la COPA redonda encima
  if (sim && Fm.fMax < 0.6 && Fm.arriba < 0.55 * Fm.maxW && Fm.H > 0.45 * Fm.maxW) return { tipo: 'manga', porque: 'simétrica, con la copa redonda arriba' };
  // PERNERA: alta (más del doble que ancha) y más ancha arriba (el tiro) que abajo
  // (el doblez de una falda va de arriba abajo ENTERO; la costura de fuera de un pantalón ancho baja recta solo desde la cadera)
  const recto = Math.max(Fm.izq, Fm.der);
  if (Fm.H > 2 * Fm.W && !Fm.sisa && (Fm.gancho || recto < 0.85)) return { tipo: 'pernera', porque: 'alta y estrecha, sin doblez entero, con el tiro arriba' };
  // CUERPO: con el DOBLEZ (o simétrico entero), alto, con la SISA (el lado de fuera entra bajo el hombro)
  if ((Fm.doblez || sim) && Fm.sisa && Fm.H > 0.9 * Fm.W) return { tipo: 'cuerpo', porque: (Fm.doblez ? 'tiene el doblez del centro' : 'simétrica (entera)') + ' y la sisa' };
  if (areaRel < 0.12 && Fm.largoAncho < 2.2) return { tipo: 'bolsillo', porque: 'pequeña' };
  // CAPUCHA: redonda por detrás, sin sisa
  if (Fm.redonda && !Fm.sisa && Fm.H > 0.8 * Fm.W && Fm.H < 1.9 * Fm.W) return { tipo: 'capucha', porque: 'redonda por detrás, sin sisa' };
  // FALDA: grande, sin sisa, con el doblez o entera, y que no se estrecha hacia abajo
  if (grande && !Fm.sisa && (recto >= 0.85 || sim) && Fm.abajo >= 0.97 * Fm.arriba) return { tipo: 'falda', porque: 'sin sisa, con el doblez entero, y no se estrecha hacia abajo' };
  if (!grande) return { tipo: 'bolsillo', porque: 'pequeña y sin sisa' };
  return { tipo: 'otra', porque: 'no la reconozco' };
}
// los PUNTOS de un cuerpo (medio, con el doblez a la izquierda; y hacia ARRIBA, en px desde el bajo): axila, hombro, cuello, escote
export function puntosCuerpo(poly, Fm) {
  const mx = Fm.doblez === 'der' ? x => Fm.x1 - x : Fm.doblez === 'izq' ? x => x - Fm.x0 : x => x - (Fm.x0 + Fm.x1) / 2, ent = !Fm.doblez;
  const P = poly.map(([x, y]) => [mx(x), Fm.y1 - y]).map(([x, y]) => [ent ? Math.abs(x) : x, y]);
  const Yt = Math.max(...P.map(p => p[1])), F = Fm.F.map(f => ({ y: Fm.y1 - f.y, ext: ent ? (f.b - f.a) / 2 : Math.max(mx(f.a), mx(f.b)) })).sort((a, b) => a.y - b.y);
  // el ancho del costado: el de media altura de la parte baja; la axila, lo más alto que aún tiene (casi) ese ancho
  // (el ancho de PECHO, en la axila: lo más ancho entre un 35 y un 80 % del alto —un cuerpo de vestido se estrecha hacia la cintura y la mediana
  //  quedaba baja—; con lo de abajo de la sisa recto, es el mismo)
  const lado = F.filter(f => f.y > 0.35 * Yt && f.y < 0.8 * Yt).map(f => f.ext), Wc = lado.length ? Math.max(...lado) : Math.max(...F.map(f => f.ext));
  let yAx = 0; F.forEach(f => { if (f.y < 0.85 * Yt && f.ext >= 0.97 * Wc) yAx = Math.max(yAx, f.y); });
  // el techo (arriba) en cada x: el cuello es lo más alto; el escote, el techo junto al doblez
  const xs = []; for (let k = 0; k <= 60; k++) xs.push(Wc * k / 60);
  const techoY = x => { let best = -Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xa, ya] = P[j], [xb, yb] = P[i]; if ((xa <= x) !== (xb <= x)) { const y = ya + (x - xa) / (xb - xa) * (yb - ya); if (y > best) best = y; } } return best; };
  const T = xs.map(x => [x, techoY(x)]).filter(p => isFinite(p[1])), hps = T.reduce((m, p) => (p[1] > m[1] + 0.5 ? p : m), T[0] || [0, Yt]);
  const cc = [0, techoY(Math.max(0.5, Wc * 0.01))];
  // la punta del hombro: lo más afuera en la parte de arriba (por encima de la axila)
  const alto = P.filter(p => p[1] > yAx + 0.35 * (Yt - yAx)), sp = alto.reduce((m, p) => (p[0] > m[0] ? p : m), alto[0] || [Wc, Yt]);
  const bajo = F.filter(f => f.y < 0.04 * Yt).map(f => f.ext), Wb = bajo.length ? bajo.reduce((a, b) => a + b, 0) / bajo.length : Wc;
  // lo que mide la TELA abajo (sin el hueco de las pinzas de cintura): la fila de más abajo
  const fb = Fm.F.slice().sort((a, b) => b.y - a.y)[0], tela = fb ? (ent ? fb.seg / 2 : fb.seg) : Wb;
  return { Wc, Wb, yAx, Yt, hps, cc, sp, bajada: hps[1] - cc[1], hombro: sp[0], cuello: hps[0], caida: hps[1] - sp[1], sisa: hps[1] - yAx, /* (la sisa de la plantilla se mide desde el CUELLO en el hombro) */ tela, largo: hps[1], entera: ent };
}
export function puntosManga(Fm) { const F = Fm.F.slice().sort((a, b) => a.y - b.y), anchos = F.map(f => f.b - f.a), iB = anchos.indexOf(Math.max(...anchos)), yB = F[iB].y;
  const abajo = F.slice(-3).map(f => f.b - f.a); return { biceps: Fm.maxW, copa: yB - Fm.y0, largo: Fm.H, boca: abajo.reduce((a, b) => a + b, 0) / abajo.length }; }
export function puntosFalda(Fm) { const F = Fm.F.slice().sort((a, b) => a.y - b.y), d = Fm.doblez ? 1 : 0.5, an = f => (f.b - f.a) * d, arr = [Fm.segTop * d] /* (la cintura: lo que mide la tela, sin los huecos de las pinzas) */, aba = F.slice(-3).map(an), m = A => A.reduce((a, b) => a + b, 0) / A.length;
  return { cintura: m(arr), bajo: m(aba), largo: Fm.H, cadera: (y => an(F.reduce((b, f) => (Math.abs(f.y - y) < Math.abs(b.y - y) ? f : b), F[0])))(Fm.y0 + Math.min(0.35 * Fm.H, Fm.H)) }; }
// la pernera (y hacia abajo): el TIRO es la fila más ancha de arriba (la punta del gancho); el ancho a una distancia del tiro se pide con anchoA(px)
export function puntosPernera(Fm) { const F = Fm.F.slice().sort((a, b) => a.y - b.y), an = f => f.b - f.a, m = A => A.reduce((a, b) => a + b, 0) / A.length;
  let iT = 0; F.forEach((f, i) => { if (f.y - Fm.y0 < 0.45 * Fm.H && an(f) >= an(F[iT])) iT = i; });
  const tiro = F[iT].y - Fm.y0, anchoA = d => an(F.reduce((b, f) => (Math.abs(f.y - (F[iT].y + d)) < Math.abs(b.y - (F[iT].y + d)) ? f : b), F[0]));
  return { tiro, ancho: an(F[iT]), anchoA, bajo: m(F.slice(-3).map(an)), largo: Fm.H }; }

// ---------- 3 · la PRENDA: qué es, sus medidas (con la escala) y el patrón rediseñado ----------
// P = piezas (de piezasDeImagen) con, si ella lo ha dicho, p.tipo · o = { mmPorPx (la escala dada) | pechoPrenda / caderaPrenda (mm, el avatar) }
export function prendaDe(piezas, o = {}) {
  const A0 = Math.max(...piezas.map(p => p.area)), avisos = [];
  const L = piezas.map((p, i) => { const Fm = forma(p.poly), t = p.tipo ? { tipo: p.tipo, porque: 'lo has dicho tú' } : tipoDe(Fm, p.area / A0); return Object.assign({ i, Fm, area: p.area }, t, { tuyo: !!p.tipo }); });
  const de = t => L.filter(x => x.tipo === t || (t === 'cuerpo' && (x.tipo === 'delantero' || x.tipo === 'espalda')));
  const cuerpos = de('cuerpo'), mangas = de('manga'), faldas = de('falda'), perneras = de('pernera'), capuchas = de('capucha'), tiras = de('tira');
  let k = perneras.length ? 'pantalon' : cuerpos.length && faldas.length ? 'vestido' : faldas.length && !cuerpos.length ? 'falda' : capuchas.length ? 'sudadera' : cuerpos.length ? 'camiseta' : null;
  if (!k) return { k: null, piezas: L, avisos: ['No reconozco qué prenda es: dime qué es cada pieza (tócala).'] };
  // delantero y espalda: el de escote más hondo es el DELANTERO
  let del = null, esp = null; const C = cuerpos.map(x => Object.assign(x, { Pc: puntosCuerpo(piezas[x.i].poly, x.Fm) }));
  const marcadoDel = C.find(x => x.tipo === 'delantero'), marcadoEsp = C.find(x => x.tipo === 'espalda');
  if (marcadoDel || marcadoEsp) { del = marcadoDel || C.find(x => x !== marcadoEsp) || null; esp = marcadoEsp || C.find(x => x !== marcadoDel) || null; }
  else if (C.length >= 2) { const s = C.slice(0, 2).sort((a, b) => b.Pc.bajada - a.Pc.bajada); del = s[0]; esp = s[1]; }
  else if (C.length === 1) { del = C[0]; avisos.push('Solo hay una pieza de cuerpo: la uso de delantero y de espalda (con el escote de la espalda normal).'); }
  if (del) del.rol = 'delantero'; if (esp) esp.rol = 'espalda';
  // la ESCALA (mm por px)
  let mmPorPx = o.mmPorPx > 0 ? o.mmPorPx : null, escala = mmPorPx ? 'tuya' : null;
  const medio = x => (x.Pc.entera ? 1 : 1); /* (Wc ya es medio ancho en las dos: en la entera se toma la mitad) */ void medio;
  const Wpx = C.length ? C.slice(0, 2).reduce((s, x) => s + x.Pc.Wc, 0) / Math.min(2, C.length) : null;
  if (!mmPorPx) {
    if (Wpx && o.pechoPrenda > 0) { mmPorPx = o.pechoPrenda / (4 * Wpx); escala = 'avatar'; }
    else if (k === 'falda' && o.caderaPrenda > 0) { const F = faldas.map(x => puntosFalda(x.Fm)); mmPorPx = o.caderaPrenda / (F.reduce((s, f) => s + f.cadera, 0) * (faldas.length >= 2 ? 2 : 4)); escala = 'avatar'; }
    else if (k === 'pantalon' && o.caderaPrenda > 0) { const F = perneras.slice(0, 2).map(x => puntosPernera(x.Fm)); mmPorPx = o.caderaPrenda / (F.reduce((s, f) => s + f.cadera, 0) * (F.length >= 2 ? 2 : 4)); escala = 'avatar'; }
  }
  if (!mmPorPx) return { k, piezas: L, avisos: avisos.concat(['Dime cuánto mide algo (dos puntos de la imagen y sus centímetros) para saber el tamaño.']) };
  const mm = v => Math.round(v * mmPorPx), med = {}, opciones = {}, m2 = (a, b, f) => (a && b ? (f(a) + f(b)) / 2 : f(a || b));
  if (k === 'camiseta' || k === 'sudadera' || k === 'vestido') {
    const pD = del && del.Pc, pE = (esp || del).Pc;
    med.pecho = mm(4 * m2(pD, pE, p => p.Wc)); med.hombros = mm(2 * m2(pD, pE, p => p.hombro)); med.cuello = mm(2 * m2(pD, pE, p => p.cuello));
    med.bajadaDel = mm(pD.bajada); med.bajadaEsp = esp ? mm(pE.bajada) : 20; med.sisa = mm(m2(pD, pE, p => p.sisa)); med.caida = mm(m2(pD, pE, p => p.caida));
    if (k !== 'vestido') { med.largo = mm(m2(pD, pE, p => p.largo)); med.bajo = mm(4 * m2(pD, pE, p => p.Wb)); }
    else { med.espalda = mm(pE.largo); med.cintura = mm(4 * m2(pD, pE, p => p.tela)); }
    if (mangas.length) { const M = puntosManga(mangas[0].Fm); med.manga = mm(M.largo); med.biceps = mm(M.biceps); med.boca = mm(M.boca); opciones.mangaTipo = M.largo * mmPorPx > 380 ? 'larga' : 'corta'; }
    else opciones.mangaTipo = 'sin';
    if (k === 'sudadera') { const c = puntosCuerpoCapucha(capuchas[0].Fm); med.altoCapucha = mm(c.alto); med.fondoCapucha = mm(c.fondo); opciones.cuelloTipo = 'capucha';
      // (la cintura y los puños de punto se dibujan DOBLADOS: su alto acabado es la mitad del lado corto; en la plantilla el largo y la manga los incluyen)
      const corto = t => Math.min(t.Fm.W, t.Fm.H), largoT = t => Math.max(t.Fm.W, t.Fm.H), Wp = 4 * m2(pD, pE, p => p.Wc);
      const cin = tiras.filter(t => largoT(t) > 0.33 * Wp).sort((a, b) => largoT(b) - largoT(a))[0], pun = tiras.filter(t => t !== cin && largoT(t) <= 0.33 * Wp && largoT(t) > 0.1 * Wp).sort((a, b) => b.area - a.area)[0];
      opciones.bajo = cin ? 'elastico' : 'recto'; opciones.puno = pun ? 'elastico' : 'sin';
      if (cin) { med.alturaCintura = mm(corto(cin) / 2); med.largo += med.alturaCintura; } if (pun && med.manga) { med.alturaPuno = mm(corto(pun) / 2); med.manga += med.alturaPuno; }
      if (opciones.mangaTipo) delete opciones.mangaTipo; }
    if (k === 'camiseta') { opciones.escote = pD.bajada > 0.6 * pD.cuello ? 'pico' : 'redondo'; opciones.rib = tiras.length ? 'si' : 'no'; }
    if (k === 'vestido') { const F = faldas.map(x => puntosFalda(x.Fm)), f = F[0]; med.largo = mm(f.largo); med.cadera = mm(f.cadera * (faldas.length >= 2 || !faldas[0].Fm.doblez ? 2 : 4) / (faldas[0].Fm.doblez ? 1 : 1));
      const vuelo = mm((f.bajo - f.cadera) * (faldas[0].Fm.doblez ? 1 : 1)); med.vuelo = Math.max(0, vuelo); opciones.falda = vuelo > 25 ? 'evase' : 'recta'; }
  }
  if (k === 'falda') { const F = faldas.slice(0, 2).map(x => puntosFalda(x.Fm)), f = { cintura: F.reduce((a, x) => a + x.cintura, 0) / F.length, cadera: F.reduce((a, x) => a + x.cadera, 0) / F.length, bajo: F.reduce((a, x) => a + x.bajo, 0) / F.length, largo: F.reduce((a, x) => a + x.largo, 0) / F.length }, n = faldas[0].Fm.doblez ? 4 : 2; /* (medio delantero y media espalda al doblez = ¼ de la vuelta cada una; enteras, ½) */
    med.cintura = mm(f.cintura * n); med.cadera = mm(f.cadera * n); med.largo = mm(f.largo); med.vuelo = Math.max(0, mm(f.bajo - f.cadera)); opciones.forma = med.vuelo > 25 ? 'evase' : 'recta'; }
  if (k === 'pantalon') {
    // (como traza la plantilla: el delantero lleva el gancho corto —cadera/16— y la espalda el largo —cadera/8—; en el tiro el delantero mide
    //  5/16 de la cadera − 1 cm y la espalda 3/8 + 0,5; rodilla y bajo: delantero + espalda; la cintura, lo que mide la tela sin las pinzas)
    const Pp = perneras.slice(0, 2).map(x => Object.assign({ x, cintura: cinturaArriba(piezas[x.i].poly, x.Fm) }, puntosPernera(x.Fm))).sort((a, b) => a.ancho - b.ancho), fD = Pp[0], fE = Pp[1] || Pp[0], dos = Pp.length >= 2;
    med.largo = mm(fD.largo); med.tiro = mm(fD.tiro);
    const cD = (mm(fD.ancho) + 10) * 16 / 5, cE = (mm(fE.ancho) - 5) * 8 / 3; med.cadera = Math.round(dos ? (cD + cE) / 2 : cD);
    const bajaRod = ((med.largo - med.tiro) / 2 - 50) / mmPorPx; med.rodilla = mm(dos ? fD.anchoA(bajaRod) + fE.anchoA(bajaRod) : 2 * fD.anchoA(bajaRod));
    med.bajo = mm(dos ? fD.bajo + fE.bajo : 2 * fD.bajo); med.cintura = mm(dos ? 2 * (fD.cintura + fE.cintura) : 4 * fD.cintura);
    if (fD.x) fD.x.rol = 'delantero'; if (dos) fE.x.rol = 'espalda';
    const r = med.bajo / Math.max(1, med.rodilla); opciones.pierna = r > 1.05 ? 'ancha' : r < 0.85 ? 'pitillo' : 'recta'; }
  return { k, medidas: med, opciones, mmPorPx, escala, piezas: L, avisos, partes: { del: del ? del.i : (L.find(x => x.rol === 'delantero') || {}).i, esp: esp ? esp.i : (L.find(x => x.rol === 'espalda') || {}).i, mangas: mangas.map(x => x.i), faldas: faldas.map(x => x.i), perneras: perneras.map(x => x.i), capuchas: capuchas.map(x => x.i), tiras: tiras.map(x => x.i) } };
}
function puntosCuerpoCapucha(Fm) { return { alto: Fm.H, fondo: Fm.W }; }
// las medidas dentro de lo que admite la plantilla (y lo que se ha tenido que mover, dicho)
export function aPlantilla(R, BLOQUES) {
  const D = BLOQUES[R.k], out = {}, movidas = []; if (!D) return { medidas: {}, movidas };
  D.medidas.forEach(m => { const v = R.medidas[m.k]; if (!isFinite(v)) return; const c = Math.max(m.min, Math.min(m.max, v)); out[m.k] = c; if (Math.abs(c - v) > 2) movidas.push(m.t + ': ' + (v / 10).toFixed(1) + ' → ' + (c / 10).toFixed(1) + ' cm (lo que admite la plantilla)'); });
  return { medidas: out, movidas };
}
// ---------- 4 · ¿se PARECE? la pieza de la imagen y la rediseñada, encima (área común / área de las dos) ----------
// a = polígono de la imagen (px, y abajo) con su escala; b = polígono de la plantilla (mm, y ARRIBA). Se alinean por su caja (y por el doblez).
export function parecido(a, mmPorPx, b, doblezA, rejilla = 160) {
  const A = a.map(([x, y]) => [x * mmPorPx, -y * mmPorPx]), bb = P => { const xs = P.map(p => p[0]), ys = P.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
  const ca = bb(A), cb = bb(b), alinea = (P, c, der) => P.map(([x, y]) => [der ? c[2] - x : x - c[0], y - c[1]]);
  // la plantilla tiene el doblez a la IZQUIERDA (x = 0); si en la imagen está a la derecha, se da la vuelta
  const A2 = alinea(A, ca, doblezA === 'der'), B2 = alinea(b, cb, false), W = Math.max(ca[2] - ca[0], cb[2] - cb[0]), H = Math.max(ca[3] - ca[1], cb[3] - cb[1]), paso = Math.max(W, H) / rejilla;
  const dentro = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xa, ya] = P[j], [xb, yb] = P[i]; if ((ya > y) !== (yb > y) && x < xa + (y - ya) / (yb - ya) * (xb - xa)) c = !c; } return c; };
  let ambas = 0, alguna = 0; for (let y = paso / 2; y < H; y += paso) for (let x = paso / 2; x < W; x += paso) { const p = dentro(A2, x, y), q = dentro(B2, x, y); if (p && q) ambas++; if (p || q) alguna++; }
  return alguna ? ambas / alguna : 0;
}
// ---------- 5 · AFINAR: se mueven las medidas de la plantilla, poco a poco, hasta que sus piezas CALQUEN las de la imagen ----------
// (lo medido con las reglas es el punto de partida; lo que manda es el DIBUJO: así sirve también con opciones que cambian la forma —pierna
//  ancha, evasé…— y con patrones de otros que no se trazan como los nuestros). → { medidas, parecido (0–1), porPieza, evaluaciones }
const NOMBRES = { camiseta: { delantero: ['Delantero'], espalda: ['Espalda'] }, sudadera: { delantero: ['Delantero', 'Delantero (dos piezas)'], espalda: ['Espalda'] }, vestido: { delantero: ['Cuerpo delantero'], espalda: ['Cuerpo espalda'] }, falda: { delantero: ['Delantero'], espalda: ['Espalda'] }, pantalon: { delantero: ['Delantero'], espalda: ['Espalda'] } };
export function parejas(R, G) {
  const N = NOMBRES[R.k] || {}, busca = L => G.piezas.find(z => (L || []).includes(z.nombre)), out = [], pon = (i, pz, t) => { if (i != null && pz) out.push({ i, pz, t }); };
  if (R.k === 'falda') { pon(R.partes.faldas[0], busca(N.delantero), 'falda delantera'); if (R.partes.faldas[1] != null) pon(R.partes.faldas[1], busca(N.espalda), 'falda espalda'); return out; }
  pon(R.partes.del, busca(N.delantero), 'delantero'); pon(R.partes.esp, busca(N.espalda), 'espalda');
  if (R.partes.mangas.length) pon(R.partes.mangas[0], G.piezas.find(z => z.nombre === 'Manga'), 'manga');
  if (R.partes.capuchas.length) pon(R.partes.capuchas[0], G.piezas.find(z => z.nombre === 'Capucha'), 'capucha');
  if (R.k === 'vestido' && R.partes.faldas.length) pon(R.partes.faldas[0], G.piezas.find(z => z.nombre === 'Falda delantera'), 'falda');
  return out;
}
export function afina(R, piezasImg, o = {}) {
  const D = BL.BLOQUES[R.k]; if (!D || !(R.mmPorPx > 0)) return null;
  const lim = Object.fromEntries(D.medidas.map(m => [m.k, m])), M = {}; D.medidas.forEach(m => { M[m.k] = Math.max(m.min, Math.min(m.max, R.medidas[m.k] != null ? R.medidas[m.k] : m.v)); });
  const fijas = new Set(o.fijas || []), claves = D.medidas.map(m => m.k).filter(k => !fijas.has(k)); let ev = 0;
  const nota = X => { ev++; try { const G = BL.genera(R.k, X, R.opciones), P = parejas(R, G); if (!P.length) return { v: 0, pp: [] };
      const pp = P.map(q => ({ t: q.t, v: parecido(piezasImg[q.i].poly, R.mmPorPx, Z.contorno(q.pz, 0.8), R.piezas[q.i].Fm.doblez, o.rejilla || 110) })); return { v: pp.reduce((a, q) => a + q.v, 0) / pp.length, pp }; }
    catch (e) { return { v: -1, pp: [] }; } };
  let X = Object.assign({}, M), mejor = nota(X);
  // (si la plantilla no admite el punto de partida —p. ej. una cintura más ancha que el pecho—, se parte de sus medidas normales con el pecho, la
  //  cadera y los largos medidos; y si tampoco, de las normales)
  if (mejor.v < 0) { const Y = Object.fromEntries(D.medidas.map(m => [m.k, ['pecho', 'cadera', 'largo', 'espalda', 'tiro'].includes(m.k) ? M[m.k] : m.v])), nY = nota(Y); if (nY.v >= 0) { X = Y; mejor = nY; } }
  if (mejor.v < 0) { X = Object.fromEntries(D.medidas.map(m => [m.k, m.v])); mejor = nota(X); }
  for (const paso of o.pasos || [0.08, 0.04, 0.02, 0.01]) { for (let vuelta = 0; vuelta < 3; vuelta++) { let mejora = false;
      for (const k of claves) { const l = lim[k], base = X[k], d = Math.max(2, Math.abs(base) * paso);
        for (const s of [1, -1]) { const v = Math.max(l.min, Math.min(l.max, base + s * d)); if (v === X[k]) continue; const Y = Object.assign({}, X, { [k]: v }), n = nota(Y); if (n.v > mejor.v + 1e-4) { mejor = n; X = Y; mejora = true; break; } } }
      if (!mejora) break; } }
  return { medidas: Object.fromEntries(Object.entries(X).map(([k, v]) => [k, Math.round(v)])), parecido: mejor.v, porPieza: mejor.pp, evaluaciones: ev };
}
