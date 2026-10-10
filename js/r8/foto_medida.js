// ================= v20.4 · 📷 CelebriR8 · MEDIR DESDE UNA FOTO: calibrar, enderezar, sacar el contorno y leer la pieza =================
// La dueña (10-10-2026): «insertar imágenes para calcar, la opción de calibrar esa imagen» y «una herramienta que pueda determinar el
// código a partir de una fotografía de una pieza mecánica como un engranaje metálico o un acople mecánico».
//  · IMÁGENES del proyecto: se guardan aparte (como las mallas), no dentro del JSON: así deshacer no copia la foto 120 veces.
//  · CALIBRAR con una o VARIAS referencias (dos puntos y su medida real). Con varias se ve el ERROR: si las referencias no cuadran entre
//    sí, la foto está torcida o deformada (perspectiva, lente) y se dice. Siempre se dice la RESOLUCIÓN (cuántos mm es un píxel): por
//    debajo de ±2 píxeles una foto no puede medir.
//  · ENDEREZAR (perspectiva): 4 esquinas de algo rectangular de medida conocida (una hoja A4, papel milimetrado, la propia pieza) →
//    la foto se rehace vista «desde arriba» y ya sale calibrada.
//  · CONTORNO automático: la pieza sobre un fondo liso → su silueta en mm (con sus agujeros).
//  · LEER LA PIEZA: ENGRANAJE (dientes, módulo, Ø exterior, agujero) y ACOPLAMIENTO DE GARRAS (garras, Ø exterior, agujero).
//    Lo que no se puede saber desde una foto (el ángulo de presión, el grosor) se dice: no se inventa.
// Todo local, en este aparato: la foto no sale a ningún sitio.

export const IMAGENES = new Map(); // id → { url (dataURL), w, h }
export const nuevoIdImg = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');

// ---------- cargar (y achicar a 2400 px como mucho: de sobra para medir y no llena la memoria) ----------
export function cargaArchivo(file, max = 2400) {
  return new Promise((res, rej) => {
    if (!file || !/^image\/(png|jpe?g|webp|bmp|gif)$/i.test(file.type || '') && !/\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name || '')) return rej(new Error('Elige una imagen PNG o JPG.'));
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { try { res(deImagen(im, max, /png$/i.test(file.type || file.name) ? 'image/png' : 'image/jpeg')); } catch (e) { rej(e); } finally { URL.revokeObjectURL(u); } };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('No he podido abrir esa imagen.')); };
    im.src = u;
  });
}
export function deImagen(im, max = 2400, tipo = 'image/jpeg') {
  const k = Math.min(1, max / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height)), w = Math.max(1, Math.round((im.naturalWidth || im.width) * k)), h = Math.max(1, Math.round((im.naturalHeight || im.height) * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
  const id = nuevoIdImg(), url = c.toDataURL(tipo, 0.92); IMAGENES.set(id, { url, w, h }); return { id, url, w, h };
}
export const imagenDe = id => new Promise((res, rej) => { const I = IMAGENES.get(id); if (!I) return rej(new Error('Falta la imagen (vuelve a ponerla).')); const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('La imagen no se puede leer.')); im.src = I.url; });
export function pixeles(im) { const c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height); }

// ---------- CALIBRAR: refs = [{ a: [px, py], b: [px, py], mm }] (en píxeles de la imagen) ----------
export function calibra(refs) {
  const R = (refs || []).filter(r => r && r.mm > 0 && Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]) > 3);
  if (!R.length) return null;
  // mm por píxel: la que mejor cuadra con todas (mínimos cuadrados: Σ mm·px / Σ px²)
  let sxy = 0, sxx = 0; R.forEach(r => { const px = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); sxy += r.mm * px; sxx += px * px; });
  const k = sxy / sxx, errores = R.map(r => { const px = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); return (k * px - r.mm) / r.mm * 100; });
  const errMax = Math.max(...errores.map(Math.abs)), rms = Math.sqrt(errores.reduce((s, e) => s + e * e, 0) / errores.length);
  // lo que no se puede ver: ±2 píxeles en cada punta de lo más corto que midas
  const pxMin = Math.min(...R.map(r => Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1])));
  const aviso = R.length === 1 ? 'Con UNA referencia no se puede saber si la foto está torcida: añade otra en otra dirección (por ejemplo, una a lo ancho y otra a lo alto).'
    : errMax > 2 ? '⚠️ Las referencias NO cuadran (' + n2(errMax) + ' %): la foto está en perspectiva o la lente la deforma. Endereza la foto (4 esquinas) o hazla desde más lejos, de frente y con zoom.'
      : errMax > 0.7 ? 'Cuadran con un ' + n2(errMax) + ' % de diferencia: vale para formas, no para encajes finos.' : 'Las referencias cuadran (' + n2(errMax) + ' %).';
  return { mmPorPx: k, errores, errMax, rms, resol: k, incertidumbre: 2 * k, pxMin, n: R.length, aviso };
}

// ---------- ENDEREZAR (homografía de 4 puntos) ----------
// matriz 3×3 (en fila) que lleva src[i] → dst[i]
export function homografia(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  const h = resuelve(A, b); if (!h) throw new Error('Esas 4 esquinas no forman un rectángulo que se pueda enderezar (¿tres en línea?).');
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}
function resuelve(A, b) { // Gauss con pivote
  const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]);
}
export const aplicaH = (H, p) => { const w = H[6] * p[0] + H[7] * p[1] + H[8]; return [(H[0] * p[0] + H[1] * p[1] + H[2]) / w, (H[3] * p[0] + H[4] * p[1] + H[5]) / w]; };
export function inversaH(H) {
  const [a, b, c, d, e, f, g, h, i] = H, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
// quad = 4 esquinas en la foto (px) en orden: arriba-izq, arriba-der, abajo-der, abajo-izq · ancho×alto en mm · ppm = píxeles por mm
// → { id, url, w, h, mmPorPx, cuadro: [x0, y0, x1, y1] (el rectángulo conocido en la foto nueva, px) }
export function endereza(im, quad, anchoMm, altoMm, ppm = null, max = 2400) {
  if (!(anchoMm > 0 && altoMm > 0)) throw new Error('Escribe lo que mide de verdad el rectángulo (ancho y alto).');
  const W0 = im.naturalWidth || im.width, H0 = im.naturalHeight || im.height;
  const ladoPx = Math.max(Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]), Math.hypot(quad[2][0] - quad[3][0], quad[2][1] - quad[3][1]));
  ppm = ppm || Math.max(2, ladoPx / anchoMm); // sin perder resolución: la del lado más largo de la foto
  const dst = [[0, 0], [anchoMm * ppm, 0], [anchoMm * ppm, altoMm * ppm], [0, altoMm * ppm]];
  const H = homografia(quad, dst), Hi = inversaH(H);
  // el marco de salida: toda la foto enderezada (sin pasarse: como mucho 2,5 veces el rectángulo conocido por cada lado)
  const esq = [[0, 0], [W0, 0], [W0, H0], [0, H0]].map(p => aplicaH(H, p));
  const lim = [-1.5 * anchoMm * ppm, -1.5 * altoMm * ppm, 2.5 * anchoMm * ppm, 2.5 * altoMm * ppm];
  let x0 = Math.max(lim[0], Math.min(...esq.map(p => p[0]))), y0 = Math.max(lim[1], Math.min(...esq.map(p => p[1]))), x1 = Math.min(lim[2], Math.max(...esq.map(p => p[0]))), y1 = Math.min(lim[3], Math.max(...esq.map(p => p[1])));
  let k = Math.min(1, max / Math.max(x1 - x0, y1 - y0)); const W = Math.max(8, Math.round((x1 - x0) * k)), Ht = Math.max(8, Math.round((y1 - y0) * k));
  const src = pixeles(im), S = src.data, out = new ImageData(W, Ht), O = out.data;
  for (let j = 0; j < Ht; j++) for (let i = 0; i < W; i++) {
    const [sx, sy] = aplicaH(Hi, [x0 + (i + 0.5) / k, y0 + (j + 0.5) / k]), o = (j * W + i) * 4;
    if (!(sx >= 0 && sy >= 0 && sx < W0 - 1 && sy < H0 - 1)) { O[o] = O[o + 1] = O[o + 2] = 255; O[o + 3] = 0; continue; }
    const xi = Math.floor(sx), yi = Math.floor(sy), fx = sx - xi, fy = sy - yi, a = (yi * W0 + xi) * 4, b = a + 4, c = a + W0 * 4, d = c + 4;
    for (let q = 0; q < 4; q++) O[o + q] = (S[a + q] * (1 - fx) + S[b + q] * fx) * (1 - fy) + (S[c + q] * (1 - fx) + S[d + q] * fx) * fy;
  }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Ht; cv.getContext('2d').putImageData(out, 0, 0);
  const id = nuevoIdImg(), url = cv.toDataURL('image/png'); IMAGENES.set(id, { url, w: W, h: Ht });
  return { id, url, w: W, h: Ht, mmPorPx: 1 / (ppm * k), cuadro: [(-x0) * k, (-y0) * k, (anchoMm * ppm - x0) * k, (altoMm * ppm - y0) * k] };
}

// ---------- CONTORNO automático (pieza sobre fondo liso) ----------
// imageData → { anillos: [[[x, y] px …]], umbral, oscuraSobreClara } · los anillos van con su sentido (los agujeros al revés)
export function contornos(D, o = {}) {
  const W = D.width, H = D.height, S = D.data, g = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) g[i] = S[i * 4 + 3] < 128 ? 255 : 0.299 * S[i * 4] + 0.587 * S[i * 4 + 1] + 0.114 * S[i * 4 + 2];
  // umbral de Otsu
  const hist = new Array(256).fill(0); for (let i = 0; i < g.length; i++) hist[Math.max(0, Math.min(255, g[i] | 0))]++;
  let tot = g.length, suma = 0; for (let t = 0; t < 256; t++) suma += t * hist[t];
  let sB = 0, wB = 0, mejor = 0, umbral = o.umbral ?? 128; if (o.umbral == null) for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (suma - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > mejor) { mejor = v; umbral = t + 0.5; } }
  // ¿la pieza es oscura sobre fondo claro? (lo que toca el borde de la foto es el fondo)
  let claros = 0, n = 0; for (let x = 0; x < W; x++) { claros += g[x] > umbral; claros += g[(H - 1) * W + x] > umbral; n += 2; } for (let y = 0; y < H; y++) { claros += g[y * W] > umbral; claros += g[y * W + W - 1] > umbral; n += 2; }
  const oscura = o.oscura ?? claros > n / 2, dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (oscura ? g[y * W + x] < umbral : g[y * W + x] > umbral);
  // cuadrados que marchan (con la mitad del píxel: el borde va por en medio) → segmentos → anillos
  const seg = new Map(), k = (x, y) => x + ',' + y, pon = (a, b) => { seg.set(k(a[0], a[1]), b); };
  for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
    const c = (dentro(x, y) ? 8 : 0) | (dentro(x + 1, y) ? 4 : 0) | (dentro(x + 1, y + 1) ? 2 : 0) | (dentro(x, y + 1) ? 1 : 0);
    if (c === 0 || c === 15) continue;
    // la celda une los centros de 4 píxeles (x,y)…(x+1,y+1); sus lados, por la mitad: arriba, derecha, abajo, izquierda
    const a = [x + 1, y + 0.5], r = [x + 1.5, y + 1], b = [x + 1, y + 1.5], l = [x + 0.5, y + 1];
    switch (c) { // siempre con la pieza al MISMO lado de la marcha (así los trozos se encadenan y los agujeros salen al revés)
      case 1: pon(b, l); break; case 2: pon(r, b); break; case 3: pon(r, l); break; case 4: pon(a, r); break;
      case 5: pon(a, l); pon(b, r); break; case 6: pon(a, b); break; case 7: pon(a, l); break; case 8: pon(l, a); break;
      case 9: pon(b, a); break; case 10: pon(l, b); pon(r, a); break; case 11: pon(r, a); break; case 12: pon(l, r); break;
      case 13: pon(b, r); break; case 14: pon(l, b); break;
    }
  }
  const anillos = [], visto = new Set();
  seg.forEach((v, k0) => {
    if (visto.has(k0)) return; const r = []; let kk = k0, guard = 0;
    while (!visto.has(kk) && seg.has(kk) && guard++ < 4e6) { visto.add(kk); const [x, y] = kk.split(',').map(Number); r.push([x, y]); const s = seg.get(kk); kk = k(s[0], s[1]); }
    if (r.length >= 8) anillos.push(r);
  });
  return { anillos: anillos.map(r => simplifica(r, o.tol ?? 0.7)), umbral, oscuraSobreClara: oscura, W, H };
}
// quitar puntos que sobran (Ramer–Douglas–Peucker, cerrado)
export function simplifica(r, tol) {
  if (r.length < 6) return r;
  const d = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1e-12))); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy); };
  const rdp = (L) => { if (L.length < 3) return L; let i0 = 0, dm = 0; for (let i = 1; i < L.length - 1; i++) { const x = d(L[i], L[0], L[L.length - 1]); if (x > dm) { dm = x; i0 = i; } } return dm > tol ? rdp(L.slice(0, i0 + 1)).slice(0, -1).concat(rdp(L.slice(i0))) : [L[0], L[L.length - 1]]; };
  let lej = 0, dl = 0; r.forEach((q, i) => { const x = Math.hypot(q[0] - r[0][0], q[1] - r[0][1]); if (x > dl) { dl = x; lej = i; } });
  return rdp(r.slice(0, lej + 1)).slice(0, -1).concat(rdp(r.slice(lej).concat([r[0]])).slice(0, -1));
}
export const area = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return s / 2; };
export const dentroDe = (q, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
// los anillos de una pieza: el más grande y los que tiene dentro (sus agujeros), ya en mm (aMm: px → [mm, mm])
export function pieza(anillos, aMm, minArea = 4) {
  const L = anillos.map(r => r.map(aMm)).filter(r => Math.abs(area(r)) >= minArea).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  if (!L.length) return null;
  const fuera = L[0], agujeros = L.slice(1).filter(r => dentroDe(r[0], fuera) && Math.abs(area(r)) < Math.abs(area(fuera)) * 0.95);
  return { fuera, agujeros, area: Math.abs(area(fuera)) - agujeros.reduce((s, r) => s + Math.abs(area(r)), 0) };
}
// círculo que mejor pasa por unos puntos (Kåsa) → { c: [x, y], r, desv (mm, la mayor separación) }
export function circulo(P) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0; const n = P.length;
  P.forEach(([x, y]) => { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; });
  const s = resuelve([[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], [sxz, syz, sz]); if (!s) return null;
  const c = [s[0] / 2, s[1] / 2], r = Math.sqrt(s[2] + c[0] * c[0] + c[1] * c[1]);
  return { c, r, desv: Math.max(...P.map(p => Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - r))) };
}
const centroide = r => { let a = 0, cx = 0, cy = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f; } return [cx / (3 * a), cy / (3 * a)]; };
// el radio de la silueta en cada dirección (n trozos de vuelta): lo más lejano del centro
function perfilPolar(r, c, n = 1440) {
  const R = new Float64Array(n).fill(NaN);
  const pon = (x, y) => { const a = Math.atan2(y - c[1], x - c[0]), i = ((Math.round(a / (2 * Math.PI) * n) % n) + n) % n, d = Math.hypot(x - c[0], y - c[1]); if (!(R[i] >= d)) R[i] = d; };
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / 0.05)); for (let k = 0; k < m; k++) pon(a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m); }
  for (let i = 0; i < n; i++) if (isNaN(R[i])) { let j = 1; while (isNaN(R[(i + j) % n]) && j < n) j++; R[i] = R[(i + j) % n]; }
  return R;
}
const mediana = L => { const s = L.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
// los lóbulos (dientes o garras) del perfil polar: cuántos y su radio alto y bajo
function lobulos(R) {
  const n = R.length, lo = Math.min(...R), hi = Math.max(...R), mitad = (lo + hi) / 2, hist = 0.12 * (hi - lo);
  let k0 = 0; for (let i = 0; i < n; i++) if (R[i] < mitad - hist) { k0 = i; break; }
  let arriba = false, z = 0, picos = [], valles = [], act = -Infinity, actV = Infinity, anchos = [], ini = 0;
  for (let s = 0; s <= n; s++) { const i = (k0 + s) % n, v = R[i];
    if (!arriba && v > mitad + hist) { arriba = true; z++; act = v; ini = s; if (actV < Infinity) valles.push(actV); actV = Infinity; }
    else if (arriba && v < mitad - hist) { arriba = false; picos.push(act); anchos.push(s - ini); act = -Infinity; actV = v; }
    if (arriba) act = Math.max(act, v); else actV = Math.min(actV, v); }
  if (arriba) picos.push(act);
  return { z, alto: mediana(picos), bajo: mediana(valles.length ? valles : [lo]), lo, hi, anchoLobulo: mediana(anchos) / n }; // anchoLobulo: fracción de vuelta
}
export const MODULOS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8];
export const PASOS_DP = [64, 48, 40, 32, 24, 20, 16, 12, 10, 8];
// ---------- LEER UN ENGRANAJE (silueta en mm, vista de frente, a lo largo de su eje) ----------
export function leeEngranaje(pz, o = {}) {
  const c = o.centro || (pz.agujeros.length ? (circulo(pz.agujeros.slice().sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0]) || {}).c : null) || centroide(pz.fuera);
  const R = perfilPolar(pz.fuera, c), L = lobulos(R), z = L.z;
  const Da = 2 * L.alto, Df = 2 * L.bajo, h = L.alto - L.bajo;
  // dientes de verdad: altura ≈ 2,25·módulo = 2,25·Da/(z+2) (entre 1,3 y 3,2 veces el módulo). Las rugosidades del borde no son dientes.
  if (z < 6 || h < 0.035 * Da || h / (Da / (z + 2)) < 1.3 || h / (Da / (z + 2)) > 3.2) return { error: 'No veo dientes: ¿la foto es de FRENTE (mirando a lo largo del eje) y la pieza entera, sobre fondo liso?' + (z >= 6 ? ' (Lo que hay en el borde mide ' + n2(h) + ' mm de alto: es demasiado poco para ' + z + ' dientes.)' : '') };
  // el módulo que mejor cuadra: Ø exterior = m·(z + 2) (dientes normales) y altura del diente ≈ 2,25·m
  const cand = MODULOS.map(m => ({ m, tipo: 'módulo', err: Math.abs(m * (z + 2) - Da) })).concat(PASOS_DP.map(dp => ({ m: 25.4 / dp, dp, tipo: 'DP', err: Math.abs(25.4 / dp * (z + 2) - Da) }))).sort((a, b) => a.err - b.err);
  const mMedido = Da / (z + 2), mejor = cand[0], seg = cand[1];
  const agujero = pz.agujeros.length ? circulo(pz.agujeros.slice().sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0]) : null;
  const confianza = mejor.err / mejor.m < 0.12 && Math.abs(h / mejor.m - 2.25) < 0.7 ? 'alta' : mejor.err / mejor.m < 0.3 ? 'media' : 'baja';
  return {
    tipo: 'engranaje', z, Da, Df, h, mMedido, m: mejor.m, dp: mejor.dp || null, sistema: mejor.tipo, err: mejor.err, otra: seg, centro: c, confianza,
    agujero: agujero ? { d: 2 * agujero.r, redondo: agujero.desv < Math.max(0.15, 0.04 * agujero.r) } : null,
    texto: z + ' dientes · ' + (mejor.dp ? mejor.dp + ' DP (módulo ' + n2(mejor.m) + ')' : 'módulo ' + n2(mejor.m)) + ' · Ø exterior ' + n2(mejor.m * (z + 2)) + ' mm (medido ' + n2(Da) + ')' + (agujero ? ' · agujero Ø' + n2(2 * agujero.r) : ''),
    nota: 'El ángulo de presión no se ve en una foto: se usa 20° (el más común). El grosor tampoco: mídelo con el calibre. Si el engranaje es helicoidal (dientes inclinados), una foto de frente no lo dice.'
  };
}
// ---------- LEER UN ACOPLAMIENTO DE GARRAS (vista de frente: las garras alrededor del agujero) ----------
export function leeAcople(pz, o = {}) {
  const ag = pz.agujeros.length ? circulo(pz.agujeros.slice().sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0]) : null;
  const c = o.centro || (ag && ag.c) || centroide(pz.fuera), R = perfilPolar(pz.fuera, c), L = lobulos(R);
  if (L.z < 2 || L.z > 12 || (L.hi - L.lo) < 0.06 * L.hi) return { tipo: 'acople', z: 0, D: 2 * L.hi, agujero: ag ? 2 * ag.r : null, error: L.z < 2 || (L.hi - L.lo) < 0.06 * L.hi ? 'Es redondo por fuera: si es un acoplamiento de garras, haz la foto de frente a las garras (sin la estrella de goma).' : 'Demasiados lóbulos para un acoplamiento de garras (' + L.z + '): ¿es un engranaje?' };
  return { tipo: 'acople', garras: L.z, D: 2 * L.alto, dGarras: 2 * L.bajo, anchoGarra: L.anchoLobulo * 360, agujero: ag ? 2 * ag.r : null, centro: c,
    texto: L.z + ' garras · Ø exterior ' + n2(2 * L.alto) + ' mm' + (ag ? ' · agujero Ø' + n2(2 * ag.r) : '') + ' · cada garra ≈ ' + Math.round(L.anchoLobulo * 360) + '°',
    nota: 'El largo del buje y el alto de las garras no se ven de frente: mídelos con el calibre (o haz otra foto de lado).' };
}
