// ================= 👗 CelebriDREW · herramientas de IMAGEN (sin dependencias: van en el navegador y en las pruebas de node) =================
// Una imagen es { w, h, d: Uint8ClampedArray RGBA }; una máscara, { w, h, m: Uint8Array (1 = prenda) }.
export const nuevaMascara = (w, h) => ({ w, h, m: new Uint8Array(w * h) });
// reducir (media de cada bloque) para analizar rápido; devuelve también el factor
export function reduce(img, lado = 900) {
  const k = Math.min(1, lado / Math.max(img.w, img.h)); if (k >= 1) return { img, k: 1 };
  const w = Math.max(1, Math.round(img.w * k)), h = Math.max(1, Math.round(img.h * k)), d = new Uint8ClampedArray(w * h * 4), sx = img.w / w, sy = img.h / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx)), y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy)); let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * img.w + xx) * 4; r += img.d[i]; g += img.d[i + 1]; b += img.d[i + 2]; a += img.d[i + 3]; n++; }
    const o = (y * w + x) * 4; d[o] = r / n; d[o + 1] = g / n; d[o + 2] = b / n; d[o + 3] = a / n; }
  return { img: { w, h, d }, k };
}
export function gris(img) { const g = new Float32Array(img.w * img.h); for (let i = 0; i < g.length; i++) g[i] = 0.299 * img.d[i * 4] + 0.587 * img.d[i * 4 + 1] + 0.114 * img.d[i * 4 + 2]; return g; }
// sRGB → Lab (D65)
export function lab(r, g, b) {
  const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }, R = f(r), G = f(g), B = f(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883, h = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))];
}
// umbral de Otsu sobre unos valores (0–255 o lo que sean)
export function otsu(v, cubos = 256) {
  let mn = Infinity, mx = -Infinity; for (const x of v) { if (x < mn) mn = x; if (x > mx) mx = x; } if (mx - mn < 1e-9) return mx;
  const H = new Float64Array(cubos); for (const x of v) H[Math.min(cubos - 1, Math.floor((x - mn) / (mx - mn) * (cubos - 1)))]++;
  let tot = v.length, sum = 0; for (let i = 0; i < cubos; i++) sum += i * H[i]; let sB = 0, wB = 0, mejor = 0, t = 0;
  for (let i = 0; i < cubos; i++) { wB += H[i]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += i * H[i]; const mB = sB / wB, mF = (sum - sB) / wF, b = wB * wF * (mB - mF) ** 2; if (b > mejor) { mejor = b; t = i; } }
  return mn + (t + 0.5) / (cubos - 1) * (mx - mn);
}
// morfología con un cuadrado de radio r (dos pasadas separadas)
function pasa(M, r, dilata) { const { w, h, m } = M, t = new Uint8Array(w * h), o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = dilata ? 0 : 1; for (let k = -r; k <= r; k++) { const xx = x + k; const q = xx < 0 || xx >= w ? (dilata ? 0 : 1) : m[y * w + xx]; if (dilata ? q : !q) { v = dilata ? 1 : 0; break; } } t[y * w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = dilata ? 0 : 1; for (let k = -r; k <= r; k++) { const yy = y + k; const q = yy < 0 || yy >= h ? (dilata ? 0 : 1) : t[yy * w + x]; if (dilata ? q : !q) { v = dilata ? 1 : 0; break; } } o[y * w + x] = v; }
  return { w, h, m: o }; }
export const dilata = (M, r) => pasa(M, r, true), erosiona = (M, r) => pasa(M, r, false);
export const cierra = (M, r) => erosiona(dilata(M, r), r), abre = (M, r) => dilata(erosiona(M, r), r);
// componentes conexos (4-vecinos): se queda con el más grande
export function mayor(M) {
  const { w, h, m } = M, et = new Int32Array(w * h), pila = []; let n = 0, mejor = 0, tam = 0;
  for (let i = 0; i < m.length; i++) { if (!m[i] || et[i]) continue; n++; let c = 0; pila.push(i); et[i] = n;
    while (pila.length) { const p = pila.pop(); c++; const x = p % w, y = (p - x) / w; [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([a, b]) => { if (a < 0 || b < 0 || a >= w || b >= h) return; const q = b * w + a; if (m[q] && !et[q]) { et[q] = n; pila.push(q); } }); }
    if (c > tam) { tam = c; mejor = n; } }
  const o = nuevaMascara(w, h); for (let i = 0; i < m.length; i++) o.m[i] = et[i] === mejor ? 1 : 0; return { mascara: o, area: tam };
}
// rellenar agujeros cerrados (lo que no toca el borde de la imagen)
export function rellena(M) { const { w, h, m } = M, fuera = new Uint8Array(w * h), pila = [];
  const mete = i => { if (!m[i] && !fuera[i]) { fuera[i] = 1; pila.push(i); } }; for (let x = 0; x < w; x++) { mete(x); mete((h - 1) * w + x); } for (let y = 0; y < h; y++) { mete(y * w); mete(y * w + w - 1); }
  while (pila.length) { const p = pila.pop(), x = p % w, y = (p - x) / w; if (x > 0) mete(p - 1); if (x < w - 1) mete(p + 1); if (y > 0) mete(p - w); if (y < h - 1) mete(p + w); }
  const o = nuevaMascara(w, h); for (let i = 0; i < m.length; i++) o.m[i] = fuera[i] ? 0 : 1; return o; }
export function caja(M) { const { w, h, m } = M; let x0 = w, y0 = h, x1 = -1, y1 = -1, a = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { a++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, area: a }; }
// los tramos de cada fila: [[a, b], …] (b incluido)
export function tramosFila(M, y) { const { w, m } = M, L = []; let a = -1; for (let x = 0; x < w; x++) { const v = m[y * w + x]; if (v && a < 0) a = x; if (!v && a >= 0) { L.push([a, x - 1]); a = -1; } } if (a >= 0) L.push([a, w - 1]); return L; }
// el eje de SIMETRÍA vertical (x) que más se parece a su espejo, y cuánto (IoU 0–1)
export function simetria(M) {
  const B = caja(M), { w, m } = M; let mejor = { x: (B.x0 + B.x1) / 2, iou: 0 };
  const prueba = xs => { let I = 0, U = 0; for (let y = B.y0; y <= B.y1; y += 2) for (let x = B.x0; x <= B.x1; x += 2) { const a = m[y * w + x], xx = Math.round(2 * xs - x), b = xx >= 0 && xx < w ? m[y * w + xx] : 0; if (a && b) I++; if (a || b) U++; } return U ? I / U : 0; };
  const c = (B.x0 + B.x1) / 2; for (let d = -0.12 * B.w; d <= 0.12 * B.w; d += Math.max(0.5, B.w / 200)) { const iou = prueba(c + d); if (iou > mejor.iou) mejor = { x: c + d, iou }; }
  return mejor;
}
// el contorno exterior (seguimiento de Moore) como polígono en píxeles
export function contorno(M) {
  const { w, h, m } = M, v = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x]; let s = -1;
  for (let i = 0; i < m.length; i++) if (m[i]) { s = i; break; } if (s < 0) return [];
  const sx = s % w, sy = (s - sx) / w, dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], out = [[sx, sy]];
  let x = sx, y = sy, d = 6, it = 0;
  do { let k = 0; for (; k < 8; k++) { const nd = (d + 6 + k) % 8, nx = x + dirs[nd][0], ny = y + dirs[nd][1]; if (v(nx, ny)) { x = nx; y = ny; d = nd; break; } } if (k === 8) break; out.push([x, y]); } while ((x !== sx || y !== sy) && ++it < 4 * w * h);
  out.pop(); return out;
}
// la orientación del eje principal (grados respecto a la vertical) por los momentos de la máscara
export function orientacion(M) { const { w, h, m } = M; let n = 0, sx = 0, sy = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { n++; sx += x; sy += y; } if (!n) return 0; const cx = sx / n, cy = sy / n; let a = 0, b = 0, c = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { const dx = x - cx, dy = y - cy; a += dx * dx; b += dx * dy; c += dy * dy; } const t = 0.5 * Math.atan2(2 * b, a - c); return 90 - t * 180 / Math.PI; }
// girar una imagen (grados, alrededor del centro; lo que queda fuera, del color «fondo»)
export function gira(img, grados, fondo = [255, 255, 255]) {
  const t = grados * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), { w, h } = img, d = new Uint8ClampedArray(w * h * 4), cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = c * (x - cx) + s * (y - cy) + cx, Y = -s * (x - cx) + c * (y - cy) + cy, o = (y * w + x) * 4, xi = Math.round(X), yi = Math.round(Y);
    if (xi >= 0 && yi >= 0 && xi < w && yi < h) { const i = (yi * w + xi) * 4; d[o] = img.d[i]; d[o + 1] = img.d[i + 1]; d[o + 2] = img.d[i + 2]; d[o + 3] = 255; } else { d[o] = fondo[0]; d[o + 1] = fondo[1]; d[o + 2] = fondo[2]; d[o + 3] = 255; } }
  return { w, h, d };
}
export function recorta(img, x0, y0, x1, y1) { x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(img.w, Math.ceil(x1)); y1 = Math.min(img.h, Math.ceil(y1)); const w = x1 - x0, h = y1 - y0, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) d.set(img.d.subarray(((y + y0) * img.w + x0) * 4, ((y + y0) * img.w + x1) * 4), y * w * 4); return { w, h, d }; }
