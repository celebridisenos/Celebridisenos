// ================= 👗 CelebriDREW · COPIA EXACTA desde una FOTO DE PRODUCTO (fondo blanco o liso) (17-10-2026) =================
// Ella: «mejorar la IA de CelebriDREW: no copia exactamente lo que pido; solo subir fotos con fondo blanco del producto, que se consiguen por
// internet fácil poniendo cualquier prenda con fondo blanco».
// Antes, «Diseñar desde una imagen» solo ponía NOMBRES a la prenda (sudadera, manga larga, ajuste normal…) y el patrón salía de la plantilla con
// las medidas del avatar: de la foto no se copiaba la FORMA. Con fondo liso la prenda se recorta al píxel por colores (sin IA: también en el
// iPad) y se MIDE ENTERA con el mismo medidor que la foto con folio (rasgos.js): pecho, largo, bajo, hombros, caída, cuello, escote, sisa,
// manga, boca, ancho de manga y la capucha. Lo que la foto no trae es la ESCALA (centímetros), y sale de una de dos:
//   · la TABLA DE TALLAS de la tienda (una medida: ancho de pecho, largo…) → la prenda EXACTA, con sus centímetros;
//   · el AVATAR: el pecho (o la cadera) de la prenda = el de su cuerpo con la holgura elegida, y TODO lo demás guarda las proporciones de la
//     foto → la misma prenda, a su talla.
// Del recorte salen también el COLOR, la altura de la CINTURA y de los PUÑOS de punto (la raya donde cambia el tejido), si lleva CREMALLERA
// delante y el ESTAMPADO del pecho (recortado, para ponerlo en el delantero). Lo que no se ve no se inventa: queda «supuesto» o «por confirmar».
// Sin pantalla: se prueba en Node (test/unit/drew_producto.mjs).
import { analiza, familia } from './pipeline.js';
import * as DF from './desde_foto.js';
import { reduce, lab } from './imagen.js';
import { REFERENCIAS } from './escala.js';
import { familiaDe } from './puntos.js';

const mediana = a => { const v = Float64Array.from(a.filter(isFinite)).sort(); return v.length ? v[v.length >> 1] : NaN; };

// ---------- ¿el fondo es liso (blanco, gris claro, un color plano)? ----------
// Se mira el MARCO de la foto (un 2,5 % de cada lado): su color mediano, cuánto se aparta el 90 % de él y qué parte del marco es «fondo».
export function fondoLiso(img) {
  const { w, h, d } = img, b = Math.max(2, Math.round(0.025 * Math.min(w, h))), paso = Math.max(1, Math.round(Math.sqrt(w * h / 250000))), C = [[], [], []], idx = [];
  for (let y = 0; y < h; y += paso) for (let x = 0; x < w; x += paso) if (x < b || y < b || x >= w - b || y >= h - b) { const i = (y * w + x) * 4; C[0].push(d[i]); C[1].push(d[i + 1]); C[2].push(d[i + 2]); idx.push(i); }
  const F = C.map(mediana), dist = idx.map(i => Math.hypot(d[i] - F[0], d[i + 1] - F[1], d[i + 2] - F[2])).sort((p, q) => p - q);
  const ruido = dist[Math.floor(dist.length * 0.9)] || 0, frac = dist.filter(v => v < 24).length / Math.max(1, dist.length), lum = 0.299 * F[0] + 0.587 * F[1] + 0.114 * F[2], croma = Math.max(...F) - Math.min(...F);
  return { liso: frac >= 0.82 && ruido < 30, claro: lum > 190, blanco: lum > 222 && croma < 18, color: F.map(Math.round), ruido: Math.round(ruido * 10) / 10, frac: Math.round(frac * 100) / 100 };
}

// las medidas que se pueden escribir de la TABLA DE TALLAS (las de escala.js) y si son anchos de prenda plana (contornos / 2)
export const TABLA = { arriba: REFERENCIAS.arriba, vestido: REFERENCIAS.arriba, pantalon: REFERENCIAS.pantalon, falda: REFERENCIAS.falda };
export const ES_ANCHO = { pecho: 1, bajo: 1, cintura: 1, cadera: 1 };
// la medida de referencia de cada familia cuando la escala la da el AVATAR
export const REF_AVATAR = { arriba: 'pecho', vestido: 'pecho', pantalon: 'cadera', falda: 'cadera' };

// ---------- la cadena entera ----------
// o = { categoria, escala: { modo: 'tabla', k, mm, contorno } | { modo: 'avatar', pecho, cadera (contornos de la PRENDA, mm) } | null,
//       iaVision() → JSON (opcional), segmentaIA(img, lado) (opcional), lado }
export async function analizaProducto(img, o = {}) {
  const lado = o.lado || 1100, FP = { id: o.id || 'pr' + Date.now().toString(36), producto: true, img, lado, categoria: o.categoria || null, movidos: new Set(), confirmadas: new Set(), avisos: [], E: { mmPorPx: null }, escala: o.escala || null };
  FP.fondo = fondoLiso(img); FP.avisosPropios = FP.fondo.liso ? [] : ['El fondo no es liso (' + Math.round(FP.fondo.frac * 100) + ' % del borde): el recorte por colores puede fallar. Mejor una foto de producto con fondo blanco o gris liso.'];
  FP.reglas = reglas; FP.trasRasgos = trasRasgos; FP.trasEscala = trasEscala;
  FP.T = await analiza(img, { lado, categoria: o.categoria || undefined, origen: 'foto de producto (fondo ' + (FP.fondo.blanco ? 'blanco' : 'liso') + ')', iaVision: o.iaVision || null, segmentaIA: o.segmentaIA ? () => o.segmentaIA(img, lado) : null });
  // con CAPUCHA es una sudadera (si nadie ha dicho otra cosa): la forma sola no lo sabía
  const R = FP.T.etapas.RASGOS && FP.T.etapas.RASGOS.datos, C = FP.T.etapas.CLASIFICACION && FP.T.etapas.CLASIFICACION.datos;
  if (R && R.extra && R.extra.capucha && C && !o.categoria && familia(C.categoria) === 'arriba' && C.categoria !== 'sudadera') { C.categoria = 'sudadera'; C.fuente = 'forma (asoma una capucha)'; }
  return DF.termina(FP);
}
// la escala nueva (otra medida de la tabla, otra holgura…): se rehace del paso de escala en adelante
export async function ponEscala(FP, escala) { FP.escala = escala; await DF.sigue(FP); return FP; }
// las «reglas» de escala para la cadena (pipeline.continua): la medida de la tabla o la del avatar sobre la medida de la foto
function reglas(FP) {
  const e = FP.escala, R = FP.T.etapas.RASGOS && FP.T.etapas.RASGOS.datos; if (!e || !R) return [];
  if (e.modo === 'tabla') return e.k && e.mm > 0 ? [{ k: e.k, mm: ES_ANCHO[e.k] && e.contorno ? e.mm / 2 : e.mm }] : [];
  const k = REF_AVATAR[familiaDe(R)], v = e[k]; return v > 0 && R.medidas[k] ? [{ k, mm: v / 2 }] : [];
}
function trasEscala(FP) { const E = FP.T.etapas.ESCALA; FP.E.mmPorPx = E && E.datos && E.datos.mmPx ? E.datos.mmPx * FP.k : null; }

// ---------- lo que se saca del recorte además de la silueta ----------
// (se calcula una vez por foto y se añade a los rasgos cada vez que se rehacen: al cambiar de prenda o mover puntos)
function trasRasgos(FP, R) {
  if (!FP.extra) FP.extra = extras(FP, R);
  const X = FP.extra, med = Object.assign({}, R.medidas), ex = Object.assign({}, R.extra || {});
  if (X.cintura) med.alturaCintura = { vec: [0, X.cintura.px], conf: X.cintura.conf, como: 'la cintura de punto: del bajo a la raya donde cambia el tejido' };
  if (X.puno) med.alturaPuno = Object.assign({ vec: X.puno.vec, conf: X.puno.conf, como: 'el puño: de la boca de la manga a la raya donde cambia el tejido' });
  if (X.cremallera) ex.cremallera = true;
  return Object.assign({}, R, { medidas: med, extra: ex });
}
function extras(FP, R) {
  const S = FP.T.etapas.SEGMENTACION, M = S && S.mascara; if (!M) return {}; const red = reduce(FP.img, FP.lado).img;
  if (R.tipo !== 'arriba') return { color: colorDe(red, M, null) };
  const L = luz(red), out = {};
  out.cintura = bandaBajo(L, red.w, M, R); out.puno = bandaPuno(L, red.w, M, R); out.cremallera = cremallera(L, red.w, M, R, out.cintura);
  out.estampado = estampado(FP, red, M, R, out.cremallera); out.color = colorDe(red, M, out.estampado);
  return out;
}
const luz = img => { const g = new Float32Array(img.w * img.h); for (let i = 0; i < g.length; i++) g[i] = 0.299 * img.d[i * 4] + 0.587 * img.d[i * 4 + 1] + 0.114 * img.d[i * 4 + 2]; return g; };
// el ESCALÓN de un perfil (luz y textura fila a fila): dónde cambia de golpe, entre «desde» y «hasta» (índices). → { i, fuerza } | null
function escalon(Lz, Tx, desde, hasta) {
  const n = Lz.length, liso = a => a.map((_, i) => { let s = 0, c = 0; for (let j = i - 1; j <= i + 1; j++) if (j >= 0 && j < n && isFinite(a[j])) { s += a[j]; c++; } return c ? s / c : NaN; });
  const A = liso(Lz), B = liso(Tx), m = (a, i, j) => { let s = 0, c = 0; for (let k = i; k <= j; k++) if (k >= 0 && k < n && isFinite(a[k])) { s += a[k]; c++; } return c ? s / c : NaN; };
  const dif = []; for (let i = 1; i < n; i++) if (isFinite(A[i]) && isFinite(A[i - 1])) dif.push(Math.abs(A[i] - A[i - 1]));
  const ruido = Math.max(0.6, mediana(dif) * 1.4826); let mejor = null;
  for (let i = Math.max(3, desde); i <= Math.min(n - 4, hasta); i++) {
    const dl = Math.abs(m(A, i - 3, i - 1) - m(A, i + 1, i + 3)), t1 = m(B, i - 3, i - 1), t2 = m(B, i + 1, i + 3), dt = Math.abs(Math.log((t1 + 1) / (t2 + 1)));
    const f = dl / ruido + 6 * dt; if (!mejor || f > mejor.f) mejor = { i, f, dl, dt };
  }
  return mejor && (mejor.dl > Math.max(3, 4 * ruido) || mejor.dt > 0.35) ? mejor : null;
}
// la CINTURA de punto: en el centro del cuerpo, del bajo hacia arriba (hasta un 18 % del largo)
function bandaBajo(L, w, M, R) {
  const P = R.puntos, lg = R.medidas.largo; if (!P.axilaIzq || !P.axilaDer || !P.bajoIzq || !lg) return null;
  const an = P.axilaDer.x - P.axilaIzq.x, x0 = Math.round(P.axilaIzq.x + 0.22 * an), x1 = Math.round(P.axilaDer.x - 0.22 * an), yB = Math.round((P.bajoIzq.y + P.bajoDer.y) / 2), largo = lg.vec[1];
  const Lz = [], Tx = []; for (let i = 0; i < 0.24 * largo; i++) { const y = yB - 2 - i; let s = 0, t = 0, c = 0; for (let x = x0; x < x1; x++) { const q = y * w + x; if (!M.m[q] || !M.m[q + 1]) continue; s += L[q]; t += Math.abs(L[q + 1] - L[q]); c++; } Lz.push(c > 5 ? s / c : NaN); Tx.push(c > 5 ? t / c : NaN); }
  const e = escalon(Lz, Tx, Math.round(0.03 * largo), Math.round(0.18 * largo)); return e ? { px: e.i + 2, conf: Math.min(0.75, 0.4 + 0.05 * e.f) } : null;
}
// los PUÑOS: a lo largo de la manga, desde la boca hacia el hombro (hasta un 30 % de la manga); se usa la manga que se vea mejor
function bandaPuno(L, w, M, R) {
  const P = R.puntos, out = []; ['Izq', 'Der'].forEach(s => { const a = P['manga' + s], b = P['boca' + s], hm = P['hombro' + s]; if (!a || !b || !hm) return;
    const c = [(a.x + b.x) / 2, (a.y + b.y) / 2], ux = hm.x - c[0], uy = hm.y - c[1], Ls = Math.hypot(ux, uy), u = [ux / Ls, uy / Ls], ex = b.x - a.x, ey = b.y - a.y, le = Math.hypot(ex, ey), e = [ex / le, ey / le];
    const Lz = [], Tx = []; for (let t = 0; t < 0.34 * Ls; t++) { let s2 = 0, tt = 0, n = 0; for (let f = -0.32; f <= 0.32; f += 0.04) { const x = Math.round(c[0] + u[0] * (t + 2) + e[0] * f * le), y = Math.round(c[1] + u[1] * (t + 2) + e[1] * f * le), q = y * w + x;
        if (x < 1 || y < 1 || x >= M.w - 2 || y >= M.h - 2 || !M.m[q]) continue; const x2 = Math.round(x + e[0] * 2), y2 = Math.round(y + e[1] * 2); s2 += L[q]; tt += Math.abs(L[y2 * w + x2] - L[q]); n++; }
      Lz.push(n > 4 ? s2 / n : NaN); Tx.push(n > 4 ? tt / n : NaN); }
    const k = escalon(Lz, Tx, Math.round(0.04 * Ls), Math.round(0.3 * Ls)); if (k) out.push({ px: k.i + 2, f: k.f, u }); });
  if (!out.length) return null; const px = out.reduce((s, x) => s + x.px, 0) / out.length, u = out[0].u;
  return { vec: [Math.abs(u[0]) * px, Math.abs(u[1]) * px], conf: Math.min(0.7, (out.length > 1 ? 0.45 : 0.35) + 0.04 * Math.max(...out.map(x => x.f))) };
}
// ¿CREMALLERA delante? una raya fina en el eje, distinta de lo de al lado, de la axila a la cintura en casi todas las filas
function cremallera(L, w, M, R, cin) {
  const P = R.puntos; if (!P.axilaIzq || !P.bajoIzq) return false; const xs = Math.round(R.xs), an = P.axilaDer.x - P.axilaIzq.x, d = Math.max(4, Math.round(0.035 * an)), y0 = Math.round(P.axilaIzq.y + 4), y1 = Math.round((P.bajoIzq.y + P.bajoDer.y) / 2 - (cin ? cin.px : 0) - 4);
  let si = 0, n = 0; for (let y = y0; y < y1; y++) { const q = y * w; if (!M.m[q + xs - d] || !M.m[q + xs + d]) continue; const a = L[q + xs - d], b = L[q + xs + d], ref = (a + b) / 2; let c = 0;
    for (let x = xs - 2; x <= xs + 2; x++) c = Math.max(c, Math.abs(L[q + x] - ref)); n++; if (c > 14 && Math.abs(a - b) < 12) si++; }
  return n > 20 && si / n > 0.8;
}
// el COLOR de la prenda: la mediana del cuerpo (sin el estampado, los brillos ni las sombras más fuertes)
function colorDe(red, M, est) {
  const C = [[], [], []]; let paso = Math.max(1, Math.round(Math.sqrt(M.w * M.h / 60000)));
  for (let y = 0; y < M.h; y += paso) for (let x = 0; x < M.w; x += paso) { const q = y * M.w + x; if (!M.m[q] || (est && x >= est.caja[0] && x <= est.caja[2] && y >= est.caja[1] && y <= est.caja[3])) continue; C[0].push(red.d[q * 4]); C[1].push(red.d[q * 4 + 1]); C[2].push(red.d[q * 4 + 2]); }
  if (C[0].length < 20) return null; return '#' + C.map(a => Math.round(mediana(a)).toString(16).padStart(2, '0')).join('');
}
// el ESTAMPADO del pecho: lo que dentro del cuerpo (entre axilas, del cuello a la cintura) se aparta del color de la prenda; se queda la mancha
// más grande (con lo que la rodea a 2 % del pecho) → { caja (px de la silueta), rgba (en la resolución de la foto), w, h } | null
function estampado(FP, red, M, R, zip) {
  const P = R.puntos; if (!P.axilaIzq || !P.cuelloIzq || !P.bajoIzq) return null;
  const an = P.axilaDer.x - P.axilaIzq.x, x0 = Math.round(P.axilaIzq.x + 0.06 * an), x1 = Math.round(P.axilaDer.x - 0.06 * an), y0 = Math.round(Math.max(P.cuelloIzq.y, P.cuelloDer.y) + 0.03 * an), y1 = Math.round((P.bajoIzq.y + P.bajoDer.y) / 2 - 0.1 * an);
  if (x1 - x0 < 20 || y1 - y0 < 20) return null; const W = x1 - x0, H = y1 - y0, Lb = new Float32Array(W * H * 3), dentro = new Uint8Array(W * H), A = [[], [], []];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const q = (y + y0) * M.w + x + x0, i = y * W + x; if (!M.m[q]) continue; dentro[i] = 1; const c = lab(red.d[q * 4], red.d[q * 4 + 1], red.d[q * 4 + 2]); Lb[i * 3] = c[0]; Lb[i * 3 + 1] = c[1]; Lb[i * 3 + 2] = c[2]; if ((x + y) % 3 === 0) { A[0].push(c[0]); A[1].push(c[1]); A[2].push(c[2]); } }
  const F = A.map(mediana), dif = new Uint8Array(W * H); let nd = 0, nt = 0;
  const xz = R.xs - x0, rz = zip ? Math.max(4, 0.035 * an) : -1; /* (con cremallera, su raya del centro no es estampado) */
  for (let i = 0; i < W * H; i++) { if (!dentro[i]) continue; nt++; if (rz > 0 && Math.abs((i % W) - xz) < rz) continue; const de = Math.hypot(Lb[i * 3] - F[0], Lb[i * 3 + 1] - F[1], Lb[i * 3 + 2] - F[2]); if (de > 20) { dif[i] = 1; nd++; } }
  if (nd < 0.004 * nt || nd > 0.6 * nt) return null;
  // la mancha más grande, uniendo trozos cercanos (las letras de un logo van separadas): se dilata 2 % del pecho y se buscan regiones
  // (dilatación de verdad, en cuadrado de lado 2r+1, por filas y luego por columnas con sumas acumuladas: junta huecos de hasta 2r = 6 % del pecho)
  const r = Math.max(2, Math.round(0.03 * an)), dh = new Uint8Array(W * H), dil = new Uint8Array(W * H), acc = new Int32Array(Math.max(W, H) + 1);
  for (let y = 0; y < H; y++) { acc[0] = 0; for (let x = 0; x < W; x++) acc[x + 1] = acc[x] + dif[y * W + x]; for (let x = 0; x < W; x++) dh[y * W + x] = acc[Math.min(W, x + r + 1)] - acc[Math.max(0, x - r)] > 0 ? 1 : 0; }
  for (let x = 0; x < W; x++) { acc[0] = 0; for (let y = 0; y < H; y++) acc[y + 1] = acc[y] + dh[y * W + x]; for (let y = 0; y < H; y++) dil[y * W + x] = acc[Math.min(H, y + r + 1)] - acc[Math.max(0, y - r)] > 0 ? 1 : 0; }
  const eti = new Int32Array(W * H), cajas = []; let n = 0;
  for (let i = 0; i < W * H; i++) { if (!dil[i] || eti[i]) continue; n++; const pila = [i]; eti[i] = n; const cj = { a: 0, x0: W, y0: H, x1: 0, y1: 0, n };
    while (pila.length) { const p = pila.pop(), px = p % W, py = (p - px) / W; if (dif[p]) { cj.a++; cj.x0 = Math.min(cj.x0, px); cj.x1 = Math.max(cj.x1, px); cj.y0 = Math.min(cj.y0, py); cj.y1 = Math.max(cj.y1, py); } /* (la caja, solo con lo que de verdad es dibujo) */
      [p - 1, p + 1, p - W, p + W].forEach(q => { if (q >= 0 && q < W * H && dil[q] && !eti[q] && Math.abs((q % W) - px) <= 1) { eti[q] = n; pila.push(q); } }); }
    cajas.push(cj); }
  // (una RAYA larga y fina —una costura, una cremallera, un cordón— no es un estampado)
  const raya = c => { const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1; return Math.min(w, h) < 0.05 * an && Math.max(w, h) > 4 * Math.max(1, Math.min(w, h)); };
  cajas.sort((a, b) => b.a - a.a); const cj = cajas.find(c => !raya(c)); if (!cj || cj.a < 0.004 * nt) return null;
  const mg = Math.max(2, Math.round(0.006 * an)), caja = [cj.x0 + x0 - mg, cj.y0 + y0 - mg, cj.x1 + x0 + 1 + mg, cj.y1 + y0 + 1 + mg].map(Math.round);
  // en la resolución de la foto, con lo del color de la prenda transparente (borde suave)
  const k = FP.k, img = FP.img, X0 = Math.max(0, Math.floor(caja[0] / k)), Y0 = Math.max(0, Math.floor(caja[1] / k)), X1 = Math.min(img.w, Math.ceil(caja[2] / k)), Y1 = Math.min(img.h, Math.ceil(caja[3] / k)), w2 = X1 - X0, h2 = Y1 - Y0;
  if (w2 < 4 || h2 < 4) return null; const rgba = new Uint8ClampedArray(w2 * h2 * 4);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) { const i = ((y + Y0) * img.w + x + X0) * 4, o = (y * w2 + x) * 4, c = lab(img.d[i], img.d[i + 1], img.d[i + 2]), de = Math.hypot(c[0] - F[0], c[1] - F[1], c[2] - F[2]);
    rgba[o] = img.d[i]; rgba[o + 1] = img.d[i + 1]; rgba[o + 2] = img.d[i + 2]; rgba[o + 3] = Math.round(255 * Math.max(0, Math.min(1, (de - 10) / 14))); }
  return { caja, rgba, w: w2, h: h2, area: cj.a / nt };
}

// ---------- a la PRENDA ----------
// lo de la foto con folio (desde_foto.aProyecto) + el color, el estampado (en mm, sobre el delantero: x desde el centro, y desde el bajo) y lo
// que se ha visto de la construcción (cremallera, puños, cintura) en las opciones
export function aProyecto(FP, o = {}) {
  const A = DF.aProyecto(FP), R = FP.T.etapas.RASGOS.datos, X = FP.extra || {}, mm = FP.E.mmPorPx, k = FP.k;
  A.nombre = A.nombre.replace(/de la foto$/, 'copiada de la foto'); A.deFoto.producto = true; A.deFoto.escala = FP.escala; A.deFoto.fondo = FP.fondo;
  if (A.k === 'sudadera' && (X.cremallera || o.cremallera)) A.opciones.cierre = 'cremallera';
  if (X.color) A.color = X.color;
  if (X.estampado && mm) { const c = X.estampado.caja, yB = (R.puntos.bajoIzq.y + R.puntos.bajoDer.y) / 2, cx = (c[0] + c[2]) / 2, cy = (c[1] + c[3]) / 2, s = mm / k;
    // (la altura, como en una ficha técnica: cuánto queda su CENTRO por debajo del cuello en el hombro; así no se mueve si cambia el largo ni
    //  depende de dónde empiece la pieza —en la sudadera, encima de la cintura de punto—)
    const yH = (R.puntos.cuelloIzq.y + R.puntos.cuelloDer.y) / 2;
    A.estampado = { rgba: X.estampado.rgba, pw: X.estampado.w, ph: X.estampado.h, x: Math.round((cx - R.xs) * s), yc: Math.round((cy - yH) * s), y: Math.round((yB - cy) * s), w: Math.round((c[2] - c[0]) * s), h: Math.round((c[3] - c[1]) * s), pieza: A.k === 'vestido' ? 'Cuerpo delantero' : 'Delantero' }; }
  return A;
}
// lo que se enseña de la escala: «a la talla de tu avatar» o «con tu medida de la tabla» (y cuántos mm mide un píxel de la foto)
export function textoEscala(FP) { const e = FP.escala; if (!e) return 'Falta la escala.'; if (e.modo === 'tabla') { const L = (TABLA[familiaDe(FP.T.etapas.RASGOS.datos)] || []).find(x => x[0] === e.k); return 'Con tu medida de la tabla de tallas: ' + (L ? L[1].toLowerCase() : e.k) + ' = ' + (e.mm / 10).toLocaleString('es-ES') + ' cm' + (ES_ANCHO[e.k] && e.contorno ? ' (contorno)' : '') + '.'; }
  return 'A la talla de tu avatar: el ' + (REF_AVATAR[familiaDe(FP.T.etapas.RASGOS.datos)] === 'cadera' ? 'contorno de cadera' : 'contorno de pecho') + ' de la prenda es el de tu cuerpo con la holgura «' + (e.ajuste || 'normal') + '»; todo lo demás, en las proporciones de la foto.'; }
export { familiaDe };
