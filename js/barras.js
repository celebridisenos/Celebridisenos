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
// todo lo que se lee de una etiqueta ya pintada en un lienzo: { barras: [textos], qr: texto, ms }
export async function leeCodigos(canvas) {
  const t0 = performance.now(), D = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const barras = leeCode128(D).map(x => x.texto), qr = await leeQR(canvas);
  return { barras, qr, ms: Math.round(performance.now() - t0) };
}
