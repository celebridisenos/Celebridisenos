// ================= 👗 CelebriDREW · 🧵 LA TELA DE LA FOTO (18-10-2026) =================
// Ella: «cuando pongo referencia de fotos… no se ve igual». Una prenda de cuadros, de rayas o estampada salía LISA (solo con su color).
// Aquí, sin IA y en menos de un segundo: dentro de lo recortado de la prenda se busca el CUADRADO más grande sin bordes, se le quitan las
// sombras grandes de los pliegues (si no, al repetirlo saldrían franjas oscuras), se mira si la tela es LISA o tiene DIBUJO y, si lo tiene,
// se hace una pieza que se REPITE sin que se note la unión (las orillas se funden con lo que sigue) y se calcula cuánto mide de verdad (mm),
// para que en el 3D los cuadros salgan del tamaño de los de la foto.
// Todo puro (sin pantalla): img = { w, h, d (RGBA) }, mk = { w, h, m (0/1) } (la máscara de la prenda, a cualquier resolución).

// el cuadrado más grande dentro de la máscara (en la rejilla de la máscara) → { x, y, s } en píxeles de la máscara
export function cuadradoDentro(mk) {
  const { w, h, m } = mk, I = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) { let f = 0; for (let x = 0; x < w; x++) { f += m[y * w + x] ? 1 : 0; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + f; } }
  const suma = (x, y, s) => I[(y + s) * (w + 1) + x + s] - I[y * (w + 1) + x + s] - I[(y + s) * (w + 1) + x] + I[y * (w + 1) + x];
  const cabe = s => { let mejor = null; for (let y = 0; y + s <= h; y++) for (let x = 0; x + s <= w; x++) if (suma(x, y, s) === s * s) { const c = Math.abs(x + s / 2 - w / 2) + Math.abs(y + s / 2 - h * 0.45); if (!mejor || c < mejor.c) mejor = { x, y, s, c }; } return mejor; };
  let a = 1, b = Math.min(w, h), mejor = null; while (a <= b) { const s = (a + b) >> 1, r = cabe(s); if (r) { mejor = r; a = s + 1; } else b = s - 1; }
  return mejor ? { x: mejor.x, y: mejor.y, s: mejor.s } : null;
}
// media móvil (caja) de un canal, radio r (dos pasadas: filas y columnas)
function caja(L, w, h, r) {
  const t = new Float32Array(w * h), o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { let s = 0, n = 0; for (let x = -r; x < w; x++) { if (x + r < w) { s += L[y * w + x + r]; n++; } if (x - r - 1 >= 0) { s -= L[y * w + x - r - 1]; n--; } if (x >= 0) t[y * w + x] = s / n; } }
  for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let y = -r; y < h; y++) { if (y + r < h) { s += t[(y + r) * w + x]; n++; } if (y - r - 1 >= 0) { s -= t[(y - r - 1) * w + x]; n--; } if (y >= 0) o[y * w + x] = s / n; } }
  return o;
}
// → { liso, color '#rrggbb', tile: { w, h, d } (la pieza que se repite, sin sombras), mm (lo que mide de lado), px (lado en la foto), caja } o null
// o.mmPorPx = cuánto mide un píxel de la foto en la prenda (si se sabe; si no, null y mm = null)
export function telaDeFoto(img, mk, o = {}) {
  const sq = cuadradoDentro(mk); if (!sq || sq.s < 6) return null;
  const kx = img.w / mk.w, ky = img.h / mk.h, mg = Math.max(1, Math.round(sq.s * 0.06)); // (un poco hacia dentro: la orilla de la máscara aún es borde)
  const x0 = Math.round((sq.x + mg) * kx), y0 = Math.round((sq.y + mg) * ky), n = Math.max(8, Math.floor(Math.min((sq.s - 2 * mg) * kx, (sq.s - 2 * mg) * ky)));
  if (x0 + n > img.w || y0 + n > img.h) return null;
  const R = new Float32Array(n * n), Gc = new Float32Array(n * n), B = new Float32Array(n * n), L = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = ((y0 + y) * img.w + x0 + x) * 4, j = y * n + x; R[j] = img.d[i]; Gc[j] = img.d[i + 1]; B[j] = img.d[i + 2]; L[j] = 0.2126 * R[j] + 0.7152 * Gc[j] + 0.0722 * B[j]; }
  // sin sombras grandes: cada píxel se divide por la luz media de su alrededor (radio = 1/4 del lado) y se lleva a la luz media del trozo
  const Lm = L.reduce((a, v) => a + v, 0) / L.length, Lb = caja(L, n, n, Math.max(2, Math.round(n / 4)));
  for (let j = 0; j < n * n; j++) { const k = Math.max(0.55, Math.min(1.8, Lm / Math.max(4, Lb[j]))); R[j] *= k; Gc[j] *= k; B[j] *= k; L[j] *= k; }
  // ¿tiene dibujo? lo que varía la luz y el color en distancias PEQUEÑAS (lo grande ya se ha quitado), relativo a la luz media
  let v = 0, vc = 0; const Rm = R.reduce((a, x) => a + x, 0) / R.length, Gm = Gc.reduce((a, x) => a + x, 0) / Gc.length, Bm = B.reduce((a, x) => a + x, 0) / B.length;
  for (let j = 0; j < n * n; j++) { v += (L[j] - Lm) ** 2; vc += (R[j] - Rm) ** 2 + (Gc[j] - Gm) ** 2 + (B[j] - Bm) ** 2; }
  const desv = Math.sqrt(v / (n * n)), desvC = Math.sqrt(vc / (3 * n * n)), contraste = desv / Math.max(18, Lm), liso = contraste < 0.09 && desvC < 16;
  const hex = c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'), color = '#' + hex(Rm) + hex(Gm) + hex(Bm);
  // la pieza que se REPITE: la banda de la derecha (y la de abajo) se funde con la izquierda (y la de arriba): sin costura al repetir
  const b = Math.max(2, Math.round(n * 0.18)), m = n - b, d = new Uint8ClampedArray(m * m * 4);
  const px = (C, x, y) => C[y * n + x];
  for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) {
    const wx = x < b ? x / b : 1, wy = y < b ? y / b : 1, o4 = (y * m + x) * 4;
    [R, Gc, B].forEach((C, c) => { const a = px(C, x, y), ax = x < b ? px(C, x + m, y) : a, ay = y < b ? px(C, x, y + m) : a, axy = x < b && y < b ? px(C, x + m, y + m) : (x < b ? ax : ay);
      const fila = a * wx + ax * (1 - wx), filaB = ay * wx + axy * (1 - wx); d[o4 + c] = fila * wy + filaB * (1 - wy); });
    d[o4 + 3] = 255; }
  const mm = o.mmPorPx > 0 ? Math.round(m * o.mmPorPx) : null;
  return { liso, color, contraste: Math.round(contraste * 1000) / 1000, tile: { w: m, h: m, d }, px: m, mm, caja: [x0, y0, n, n] };
}
// cuánto mide un píxel de la foto en la prenda: el ANCHO de la máscara a la altura del pecho (un 25 % del alto de la prenda) es medio
// contorno de la prenda (delantero) → anchoMm = lo que mide de verdad ese ancho en la prenda del avatar
export function mmPorPxDe(mk, anchoMm, kImg = 1) {
  if (!(anchoMm > 0)) return null; const { w, h, m } = mk; let y0 = -1, y1 = -1; for (let y = 0; y < h; y++) { let hay = false; for (let x = 0; x < w; x++) if (m[y * w + x]) { hay = true; break; } if (hay) { if (y0 < 0) y0 = y; y1 = y; } }
  if (y0 < 0) return null; const anchos = []; for (const f of [0.22, 0.25, 0.28, 0.31]) { const y = Math.round(y0 + f * (y1 - y0)); let a = -1, b = -1; for (let x = 0; x < w; x++) if (m[y * w + x]) { if (a < 0) a = x; b = x; } if (a >= 0) anchos.push(b - a + 1); }
  if (!anchos.length) return null; anchos.sort((p, q) => p - q); const wpx = anchos[anchos.length >> 1] * kImg; return wpx > 4 ? anchoMm / wpx : null;
}
