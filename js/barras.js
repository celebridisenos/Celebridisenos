// ================= v30.6.1 · LEER los códigos de una etiqueta de envío: CODE 128 (las barras) y QR =================
// La dueña (12-10-2026): «cuando pide la etiqueta tiene que haber una forma que identifique el número de seguimiento». Muchas
// etiquetas llegan como FOTO o como un PDF sin letras dentro: el número está, pero solo en las barras. Aquí se leen las barras de
// la propia etiqueta (CODE 128, el que usan InPost, Vinted Go, SEUR, Correos…) y su QR, sin internet y sin librerías nuevas
// (el QR, con el lector que el programa ya trae para «Escanear»). Solo se da por bueno un código cuya suma de control cuadra.
const P = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
  '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
  '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
  '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
  '114131 311141 411131 211412 211214 211232 233111').split(' ').map(s => s.split('').map(Number)); // (el último es el FINAL: 2331112, sin su última barra)
const FIN = 106;

// de una tira de grises (0 negro … 255 blanco) a tramos [esNegro, ancho]
function tramos(gris, n, umbral) { const T = []; let negro = gris[0] < umbral, ini = 0; for (let x = 1; x <= n; x++) { const b = x < n ? gris[x] < umbral : !negro; if (b !== negro) { T.push(negro ? x - ini : -(x - ini)); negro = b; ini = x; } } return T; } // + = barra, − = espacio
// el símbolo que mejor casa con 6 tramos seguidos (como hacen los lectores: cuánto se aparta cada tramo de lo que debería medir)
function casa(T, j, desde = 0, hasta = 106) {
  if (j + 6 > T.length) return null; let tot = 0; for (let k = 0; k < 6; k++) tot += Math.abs(T[j + k]); const u = tot / 11; let mejor = -1, mv = 0.26;
  for (let c = desde; c <= hasta; c++) { const p = P[c]; let v = 0, mal = false; for (let k = 0; k < 6; k++) { const d = Math.abs(Math.abs(T[j + k]) - p[k] * u); if (d > 0.75 * u) { mal = true; break; } v += d; } if (!mal && v / tot < mv) { mv = v / tot; mejor = c; } }
  return mejor < 0 ? null : { c: mejor, tot };
}
function aTexto(C) { // C = códigos entre el de inicio y el de control (sin ellos); C[0] = inicio
  let juego = { 103: 'A', 104: 'B', 105: 'C' }[C[0]], out = '', turno = '';
  for (let i = 1; i < C.length; i++) { const c = C[i], j = turno || juego; turno = '';
    if (j === 'C') { if (c < 100) out += String(c).padStart(2, '0'); else if (c === 100) juego = 'B'; else if (c === 101) juego = 'A'; /* 102 = FNC1: nada */ }
    else { if (c === 98) turno = j === 'A' ? 'B' : 'A'; else if (c === 99) juego = 'C'; else if (c === 100 && j === 'A') juego = 'B'; else if (c === 101 && j === 'B') juego = 'A'; else if (c >= 96) { /* funciones: nada */ }
      else out += j === 'B' ? String.fromCharCode(32 + c) : (c < 64 ? String.fromCharCode(32 + c) : ''); } }
  return out;
}
// todos los CODE 128 que hay en una tira de tramos (la tira empieza y acaba donde sea)
function enTira(T, out) {
  for (let i = 0; i + 12 < T.length; i++) {
    if (T[i] <= 0) continue; const ini = casa(T, i, 103, 105); if (!ini) continue;
    if (i > 0 && -T[i - 1] < ini.tot * 0.4) continue; // zona blanca delante (al menos media anchura del símbolo de inicio)
    const C = [ini.c]; let j = i + 6, bien = false;
    while (j + 6 <= T.length && C.length < 90) { const s = casa(T, j); if (!s) break; if (s.c === FIN) { bien = j + 6 < T.length && T[j + 6] > 0; break; } if (s.c >= 103) break; C.push(s.c); j += 6; }
    if (!bien || C.length < 3) continue;
    const control = C.pop(); let suma = C[0]; for (let k = 1; k < C.length; k++) suma += C[k] * k; if (suma % 103 !== control) continue;
    const t = aTexto(C).trim(); if (t.length >= 4) { out.set(t, (out.get(t) || 0) + 1); i = j + 6; }
  }
}
// ---------- v30.7.1 · ITF («2 de 5 entrelazado»): el código de barras de las etiquetas de SEUR ----------
// Solo dos anchos (fino y gordo). Empieza con cuatro finos (barra, hueco, barra, hueco), cada PAR de cifras son 5 barras y 5 huecos
// entrelazados (cada cifra, dos gordos de cinco) y acaba en barra gorda, hueco fino, barra fina. No lleva suma de control: por eso
// solo se da por bueno si sale IGUAL en varias tiras (lo decide quien llama, con «veces»).
const ITF = { nnWWn: 0, WnnnW: 1, nWnnW: 2, WWnnn: 3, nnWnW: 4, WnWnn: 5, nWWnn: 6, nnnWW: 7, WnnWn: 8, nWnWn: 9 };
function itfEnTira(T, out) {
  for (let i = 0; i + 17 <= T.length; i++) {
    if (T[i] <= 0) continue; const a = [T[i], -T[i + 1], T[i + 2], -T[i + 3]]; if (a.some(v => !(v > 0))) continue;
    const n = (a[0] + a[1] + a[2] + a[3]) / 4; if (n < 1.5 || Math.max(...a) > n * 1.6 || Math.min(...a) < n * 0.5) continue;
    if (i > 0 && -T[i - 1] < n * 6) continue; // zona blanca delante
    let j = i + 4, cifras = '', fin = false;
    for (let vueltas = 0; vueltas < 40; vueltas++) {
      if (j + 2 < T.length && T[j] > n * 1.7 && -T[j + 1] < n * 1.7 && T[j + 2] < n * 1.7 && (j + 3 >= T.length || -T[j + 3] > n * 6)) { fin = true; break; }
      if (j + 10 > T.length) break; let b = '', e = '', mal = false;
      for (let k = 0; k < 5; k++) { const vb = T[j + 2 * k], ve = -T[j + 2 * k + 1]; if (!(vb > 0) || !(ve > 0) || vb > n * 5 || ve > n * 5) { mal = true; break; } b += vb > n * 1.7 ? 'W' : 'n'; e += ve > n * 1.7 ? 'W' : 'n'; }
      if (mal || !(b in ITF) || !(e in ITF)) break; cifras += ITF[b] + '' + ITF[e]; j += 10;
    }
    if (fin && cifras.length >= 8) { out.set(cifras, (out.get(cifras) || 0) + 1); i = j + 2; }
  }
}
export function leeITF(D, o = {}) {
  const W = D.width, H = D.height, S = D.data, out = new Map(), lineas = o.lineas || 90;
  const gris = (x, y) => { const i = (y * W + x) * 4; return S[i + 3] < 128 ? 255 : (S[i] * 3 + S[i + 1] * 6 + S[i + 2]) / 10; };
  const pasa = (largo, lee) => { const g = new Float32Array(largo); for (let k = 0; k < lineas; k++) { const pos = (k + 0.5) / lineas; let min = 255, max = 0; for (let x = 0; x < largo; x++) { const v = lee(x, pos); g[x] = v; if (v < min) min = v; if (v > max) max = v; } if (max - min < 60) continue; const T = tramos(g, largo, (min + max) / 2); if (T.length < 20) continue; itfEnTira(T, out); itfEnTira(T.slice().reverse(), out); } };
  pasa(W, (x, pos) => gris(x, Math.min(H - 1, Math.floor(pos * H)))); pasa(H, (y, pos) => gris(Math.min(W - 1, Math.floor(pos * W)), y));
  return [...out.entries()].filter(x => x[1] >= (o.minVeces || 3)).sort((a, b) => b[1] - a[1]).map(([texto, veces]) => ({ texto, veces }));
}
// imagen (ImageData) → los CODE 128 que se leen, del más visto al menos: [{ texto, veces }]. Mira en horizontal y en vertical, y del derecho y del revés.
export function leeCode128(D, o = {}) {
  const W = D.width, H = D.height, S = D.data, out = new Map(), lineas = o.lineas || 90;
  const pasa = (largo, n, lee) => { // «n» tiras a lo largo de «largo» píxeles
    const g = new Float32Array(largo);
    for (let k = 0; k < n; k++) { const pos = (k + 0.5) / n; let min = 255, max = 0; for (let x = 0; x < largo; x++) { const v = lee(x, pos); g[x] = v; if (v < min) min = v; if (v > max) max = v; }
      if (max - min < 60) continue; const T = tramos(g, largo, (min + max) / 2); if (T.length < 20) continue; enTira(T, out); enTira(T.slice().reverse(), out); }
  };
  const gris = (x, y) => { const i = (y * W + x) * 4; return S[i + 3] < 128 ? 255 : (S[i] * 3 + S[i + 1] * 6 + S[i + 2]) / 10; };
  pasa(W, lineas, (x, pos) => { const y = Math.min(H - 2, Math.floor(pos * H)); return (gris(x, y) + gris(x, y + 1)) / 2; });           // barras de pie (lo normal)
  pasa(H, lineas, (y, pos) => { const x = Math.min(W - 2, Math.floor(pos * W)); return (gris(x, y) + gris(x + 1, y)) / 2; });           // etiqueta girada un cuarto de vuelta
  return [...out.entries()].sort((a, b) => b[1] - a[1]).map(([texto, veces]) => ({ texto, veces }));
}

// ---------- el QR, con el lector que el programa ya trae (vendor/jsqr) ----------
let cargando = null;
function jsqr() { if (window.jsQR) return Promise.resolve(window.jsQR); if (!cargando) cargando = new Promise((res, rej) => { const s = document.createElement('script'); s.src = new URL('../vendor/jsqr/jsQR.js', import.meta.url).href; s.onload = () => res(window.jsQR); s.onerror = () => { cargando = null; rej(new Error('No se pudo cargar el lector de QR')); }; document.head.append(s); }); return cargando; }
export async function leeQR(canvas) {
  try { const lee = await jsqr(), max = 1500, k = Math.min(1, max / Math.max(canvas.width, canvas.height)); let c = canvas;
    if (k < 1) { c = document.createElement('canvas'); c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(canvas, 0, 0, c.width, c.height); }
    const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height), r = lee(d.data, c.width, c.height, { inversionAttempts: 'dontInvert' }); return r && r.data ? String(r.data) : ''; }
  catch (e) { return ''; }
}
// ---------- 13-10-2026 · BARRAS EN FOTOS DIFÍCILES (la dueña: «las de Vinted sí las coge bien, las de SEUR no ni las de InPost») ----------
// Las de Vinted Go llevan QR (fácil). SEUR (ITF) e InPost (CODE 128 de 26 cifras, finito) solo tienen barras, y en una foto de móvil
// salen pequeñas, torcidas, borrosas o con sombra. Antes solo se miraba en horizontal y en vertical con un único gris de corte por
// línea. Ahora, si así no sale nada:
//  1) se BUSCAN las barras en la foto: en cada cuadradito se mira hacia dónde cambia la luz; donde casi todo cambia en la MISMA
//     dirección (muchas rayas paralelas) hay barras, y esa dirección dice cuánto están giradas;
//  2) cada zona se lee A LO LARGO de su inclinación, ampliada ×2–×3 (con interpolación), en muchas líneas paralelas;
//  3) cada línea se corta con un gris que se ADAPTA a lo que tiene al lado (la sombra ya no la parte en dos).
// Sigue sin internet y sin librerías: cuentas propias, y solo vale un CODE 128 cuya suma de control cuadra (el ITF, si sale igual
// en varias líneas).
function grises(D) { const W = D.width, H = D.height, S = D.data, g = new Float32Array(W * H); for (let i = 0; i < W * H; i++) g[i] = S[i * 4 + 3] < 128 ? 255 : (S[i * 4] * 3 + S[i * 4 + 1] * 6 + S[i * 4 + 2]) / 10; return { W, H, g }; }
// el gris de corte que se adapta: el medio entre lo más oscuro y lo más claro de alrededor (ventana deslizante, mín./máx. en O(n))
function corteAdaptado(g, n, ven) {
  const t = new Float32Array(n), mins = new Float32Array(n), maxs = new Float32Array(n), d1 = new Int32Array(n), d2 = new Int32Array(n); let a1 = 0, z1 = 0, a2 = 0, z2 = 0, ult = 128;
  for (let x = 0; x < n + ven; x++) { // ventana [x − 2·ven, x], que se apunta en su centro
    if (x < n) { while (z1 > a1 && g[d1[z1 - 1]] >= g[x]) z1--; d1[z1++] = x; while (z2 > a2 && g[d2[z2 - 1]] <= g[x]) z2--; d2[z2++] = x; }
    while (z1 > a1 && d1[a1] < x - 2 * ven) a1++; while (z2 > a2 && d2[a2] < x - 2 * ven) a2++;
    const c = x - ven; if (c >= 0 && c < n) { mins[c] = g[d1[a1]]; maxs[c] = g[d2[a2]]; } }
  for (let x = 0; x < n; x++) { if (maxs[x] - mins[x] > 45) ult = (mins[x] + maxs[x]) / 2; t[x] = ult; }
  return t;
}
// por los BORDES: donde la luz cambia más deprisa (picos de la derivada, alternando oscurece / aclara), con posición fina por
// parábola. Con la foto movida o desenfocada un hueco estrecho entre dos barras ya no llega al gris de corte, pero su borde sigue ahí.
function tramosBordes(L, n) {
  const d = new Float32Array(n); let dm = 0; for (let i = 1; i < n - 1; i++) { d[i] = (L[i + 1] - L[i - 1]) / 2; if (Math.abs(d[i]) > dm) dm = Math.abs(d[i]); }
  if (dm < 4) return []; const um = dm * 0.1, E = []; // [posición, signo]
  for (let i = 2; i < n - 2; i++) { const v = d[i]; if (Math.abs(v) < um) continue; if (!(Math.abs(v) >= Math.abs(d[i - 1]) && Math.abs(v) > Math.abs(d[i + 1]))) continue; if (Math.sign(d[i - 1]) !== Math.sign(v) && Math.sign(d[i + 1]) !== Math.sign(v)) continue;
    const a = Math.abs(d[i - 1]), b = Math.abs(v), c = Math.abs(d[i + 1]), den = a - 2 * b + c, pos = i + (den ? 0.5 * (a - c) / den : 0), sg = v < 0 ? -1 : 1;
    if (E.length && E[E.length - 1][1] === sg) { if (b > E[E.length - 1][2]) E[E.length - 1] = [pos, sg, b]; } else E.push([pos, sg, b]); }
  let i0 = E.findIndex(e => e[1] < 0); if (i0 < 0) return []; const T = [-(E[i0][0])];
  for (let i = i0; i + 1 < E.length; i++) { const w = E[i + 1][0] - E[i][0]; T.push(E[i][1] < 0 ? w : -w); }
  T.push(E[E.length - 1][1] < 0 ? (n - E[E.length - 1][0]) : -(n - E[E.length - 1][0])); return T;
}
function tramosT(g, n, t) { const T = []; let negro = g[0] < t[0], ini = 0; for (let x = 1; x <= n; x++) { const b = x < n ? g[x] < t[x] : !negro; if (b !== negro) { T.push(negro ? x - ini : -(x - ini)); negro = b; ini = x; } } return T; }
// 1) dónde hay barras y con qué giro: [{ cx, cy, ang (dirección PERPENDICULAR a las barras), largo, ancho }] en píxeles de la imagen
export function buscaZonas(G, o = {}) {
  const { W, H, g } = G, k = Math.min(1, (o.lado || 640) / Math.max(W, H)), w = Math.max(8, Math.round(W * k)), h = Math.max(8, Math.round(H * k)), p = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; const x0 = Math.floor(x / k), y0 = Math.floor(y / k), x1 = Math.max(x0 + 1, Math.min(W, Math.floor((x + 1) / k))), y1 = Math.max(y0 + 1, Math.min(H, Math.floor((y + 1) / k)));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { s += g[yy * W + xx]; n++; } p[y * w + x] = s / n; }
  const B = 8, bw = Math.floor(w / B), bh = Math.floor(h / B), celdas = [];
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) { let xx = 0, yy = 0, xy = 0;
    for (let y = by * B + 1; y < by * B + B - 1; y++) for (let x = bx * B + 1; x < bx * B + B - 1; x++) { const gx = p[y * w + x + 1] - p[y * w + x - 1], gy = p[(y + 1) * w + x] - p[(y - 1) * w + x]; xx += gx * gx; yy += gy * gy; xy += gx * gy; }
    const e = xx + yy, coh = e > 0 ? Math.sqrt((xx - yy) ** 2 + 4 * xy * xy) / e : 0; celdas.push({ bx, by, e, coh, ang: 0.5 * Math.atan2(2 * xy, xx - yy) }); }
  const eMed = celdas.map(c => c.e).sort((a, b) => a - b)[Math.floor(celdas.length * 0.6)] || 1, buena = c => c.e > eMed * 1.5 && c.e > 300 * B * B && c.coh > 0.7;
  const vista = new Uint8Array(celdas.length), zonas = [];
  for (let i = 0; i < celdas.length; i++) { if (vista[i] || !buena(celdas[i])) continue; const grupo = [], cola = [i]; vista[i] = 1;
    while (cola.length) { const j = cola.pop(), c = celdas[j]; grupo.push(c);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = c.bx + dx, ny = c.by + dy; if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue; const q = ny * bw + nx;
        if (vista[q] || !buena(celdas[q])) continue; let d = Math.abs(celdas[q].ang - c.ang); d = Math.min(d, Math.PI - d); if (d > 0.25) continue; vista[q] = 1; cola.push(q); } }
    if (grupo.length < 3) continue;
    // la dirección media (con el ángulo doble, para que 0° y 180° sean lo mismo) y la caja girada de la zona
    let sx = 0, sy = 0; grupo.forEach(c => { sx += Math.cos(2 * c.ang) * c.e; sy += Math.sin(2 * c.ang) * c.e; }); const ang = 0.5 * Math.atan2(sy, sx), ux = Math.cos(ang), uy = Math.sin(ang);
    let cx = 0, cy = 0; grupo.forEach(c => { cx += (c.bx + 0.5) * B; cy += (c.by + 0.5) * B; }); cx /= grupo.length; cy /= grupo.length;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; grupo.forEach(c => { const dx = (c.bx + 0.5) * B - cx, dy = (c.by + 0.5) * B - cy, a = dx * ux + dy * uy, b = -dx * uy + dy * ux; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); });
    zonas.push({ cx: (cx + ux * (a0 + a1) / 2 - uy * (b0 + b1) / 2) / k, cy: (cy + uy * (a0 + a1) / 2 + ux * (b0 + b1) / 2) / k, ang, largo: (a1 - a0 + B * 2) / k, ancho: (b1 - b0 + B) / k, celdas: grupo.length, peso: grupo.reduce((s, c) => s + c.e, 0) }); }
  return zonas.sort((a, b) => b.peso - a.peso).slice(0, o.max || 6);
}
// 2) leer una zona a lo largo de su giro, ampliada, con el corte de siempre y con el que se adapta
function leeZona(G, z, out128, outItf) {
  const { W, H, g } = G, ux = Math.cos(z.ang), uy = Math.sin(z.ang), vx = -uy, vy = ux, largo = z.largo * 1.35 + 40;
  for (const amp of [2, 3]) { const n = Math.min(9000, Math.round(largo * amp)), linea = new Float32Array(n), lineas = Math.max(9, Math.min(41, Math.round(z.ancho / 3)));
    for (let k = 0; k < lineas; k++) { const off = (k / (lineas - 1) - 0.5) * z.ancho * 0.85; let mn = 255, mx = 0;
      for (let i = 0; i < n; i++) { const a = (i / amp) - largo / 2, x = z.cx + ux * a + vx * off, y = z.cy + uy * a + vy * off; if (x < 0 || y < 0 || x >= W - 1 || y >= H - 1) { linea[i] = 255; continue; }
        const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, i0 = y0 * W + x0, v = g[i0] * (1 - fx) * (1 - fy) + g[i0 + 1] * fx * (1 - fy) + g[i0 + W] * (1 - fx) * fy + g[i0 + W + 1] * fx * fy; linea[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
      if (mx - mn < 40) continue;
      const cortes = [tramos(linea, n, (mn + mx) / 2), tramosT(linea, n, corteAdaptado(linea, n, Math.max(12, Math.round(n / 14)))), tramosBordes(linea, n)];
      for (const T of cortes) { if (T.length < 20) continue; enTira(T, out128); enTira(T.slice().reverse(), out128); itfEnTira(T, outItf); itfEnTira(T.slice().reverse(), outItf); } }
    if (out128.size || outItf.size) break; }
}
export function leeDificil(D, o = {}) {
  const G = grises(D), zonas = buscaZonas(G, o), o128 = new Map(), oItf = new Map();
  for (const z of zonas) leeZona(G, z, o128, oItf);
  return { barras: [...o128.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]), itf: [...oItf.entries()].filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1]).map(x => x[0]), zonas };
}
// todo lo que se lee de una etiqueta ya pintada en un lienzo: { barras: [textos], qr: texto, dificil, ms }
export async function leeCodigos(canvas) {
  const t0 = performance.now(), D = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  let barras = leeCode128(D).map(x => x.texto), dificil = false; const qr = await leeQR(canvas); let itf = []; try { itf = leeITF(D).map(x => x.texto); } catch (e) { itf = []; }
  // (13-10) si en horizontal / vertical no sale ninguna barra, se buscan las zonas de barras y se leen a su giro, ampliadas
  if (!barras.length && !itf.length) { try { const R = leeDificil(D); barras = R.barras; itf = R.itf; dificil = !!(barras.length || itf.length); } catch (e) { } }
  return { barras, itf, qr, dificil, ms: Math.round(performance.now() - t0) };
}
