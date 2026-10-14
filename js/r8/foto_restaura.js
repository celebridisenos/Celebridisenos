// ================= 13-10-2026 · 🩹 CelebriR8 · RESTAURADOR DE FOTOS PARA COPIAR PIEZAS =================
// La dueña: «tienes que perfeccionar más el clonador de fotos, subí foto pero no la detecta bien; te dije que aunque la foto esté
// medio mal se pueda; eso implica, no sé, un restaurador».
// Antes la pieza se separaba del fondo con UN corte de claro/oscuro para toda la foto: bastaba un brillo en el metal, una sombra, un
// fondo con textura (tela, madera) o más luz en un lado para que saliera rota, con trozos de fondo o sin media pieza.
// Ahora, antes de medir nada, la foto pasa por aquí:
//  1) Se APRENDE EL FONDO mirando el marco de la foto: su color y cómo cambia la luz de un lado a otro (una superficie curva), y
//     cuánto «baila» (su textura). Cada punto de la foto se compara con el fondo que le tocaría ahí, en color y en luz, medido en
//     «veces lo que baila el fondo». Así un brillo o una zona oscura del metal siguen siendo pieza (no se parecen al fondo) y una
//     tela con pelusas sigue siendo fondo.
//  2) Se prueban VARIAS FORMAS de separar la pieza (por parecido al fondo, quitando sombras, por luz corregida, el corte de antes, y la
//     IA del PC si está) y cada una se PUNTÚA sola: ¿su borde cae encima de bordes de verdad de la foto?, ¿es una pieza entera?,
//     ¿se sale de la foto?, ¿tiene el borde limpio? Gana la mejor, y las otras quedan a un toque por si el programa se equivoca.
//  3) Se LIMPIA: fuera motas y pelusas, se unen los trozos que un reflejo había separado, se rellenan los brillos de dentro y se
//     respetan los AGUJEROS de verdad (por un agujero se ve el fondo).
//  4) Se AFINA el borde a tamaño real (a medio camino entre el tono de la pieza y el del fondo, punto a punto) y la foto se RECORTA Y
//     AMPLÍA a la pieza: las marcas ya no se montan unas sobre otras cuando la pieza salía pequeña.
//  5) Se dice LO QUE SE HA ARREGLADO y lo que no se puede arreglar (foto movida, muy poca resolución), con una nota de confianza.
// Y si aun así falla: «retocar» (pintar «esto es pieza» / «esto no») sin salir del programa.
// Todo se hace en este aparato, también en el móvil. No necesita internet ni el PC.

const lim = (x, a, b) => (x < a ? a : x > b ? b : x);
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');

// ---------- utilidades de imagen (sobre vectores planos) ----------
// reduce una foto RGBA a como mucho «max» de lado (media de cada bloque) y la pasa a luz (Y) y color (Cb, Cr)
export function reduce(D, max = 720) {
  const W = D.width, H = D.height, S = D.data, f = Math.max(1, Math.max(W, H) / max), w = Math.max(8, Math.round(W / f)), h = Math.max(8, Math.round(H / f));
  const Y = new Float32Array(w * h), Cb = new Float32Array(w * h), Cr = new Float32Array(w * h), fx = W / w, fy = H / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.min(H, Math.floor((y + 1) * fy)));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.min(W, Math.floor((x + 1) * fx))); let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * W + xx) * 4; if (S[i + 3] < 128) { r += 255; g += 255; b += 255; } else { r += S[i]; g += S[i + 1]; b += S[i + 2]; } n++; }
      r /= n; g /= n; b /= n; const i = y * w + x; Y[i] = 0.299 * r + 0.587 * g + 0.114 * b; Cb[i] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b; Cr[i] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    }
  }
  return { w, h, f, fx, fy, Y, Cb, Cr };
}
// media de un cuadrado de lado 2r+1 (con tabla de sumas: el radio no cuesta)
export function caja(src, w, h, r) {
  const I = new Float64Array((w + 1) * (h + 1)), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { let f = 0; for (let x = 0; x < w; x++) { f += src[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + f; } }
  for (let y = 0; y < h; y++) { const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r); for (let x = 0; x < w; x++) { const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r); out[y * w + x] = (I[(y1 + 1) * (w + 1) + x1 + 1] - I[y0 * (w + 1) + x1 + 1] - I[(y1 + 1) * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((x1 - x0 + 1) * (y1 - y0 + 1)); } }
  return out;
}
const mediana = L => { const s = Array.from(L).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
function gauss(A, b) { // sistema pequeño, con pivote
  const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-10) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]);
}
// ajuste por mínimos cuadrados de v ≈ Σ c_k · base_k(u, v) sobre unas muestras, quitando lo que no es fondo (3 vueltas)
function ajusta(P, V, base, deMediana) {
  const nb = base(0, 0).length; let pesos = new Float32Array(P.length).fill(1), c = null, sig = 1;
  // (deMediana: se EMPIEZA solo con lo que tiene el tono más corriente. Si no, un dibujo grande en medio de la pieza tuerce el primer
  // ajuste —una superficie curva se dobla hasta «explicarlo»— y ya no se le puede echar)
  if (deMediana) { const med = mediana(V), mad = Math.max(4, 1.4826 * mediana(Array.from(V, v => Math.abs(v - med)))); let n = 0; for (let i = 0; i < P.length; i++) { pesos[i] = Math.abs(V[i] - med) < 2.5 * mad ? 1 : 0; n += pesos[i]; } if (n < nb * 6) pesos.fill(1); }
  for (let it = 0; it < 4; it++) {
    const A = Array.from({ length: nb }, () => new Array(nb).fill(0)), b = new Array(nb).fill(0);
    for (let i = 0; i < P.length; i++) { if (!pesos[i]) continue; const B = base(P[i][0], P[i][1]); for (let j = 0; j < nb; j++) { b[j] += B[j] * V[i]; for (let k = 0; k < nb; k++) A[j][k] += B[j] * B[k]; } }
    for (let j = 0; j < nb; j++) A[j][j] += 1e-6;
    const s = gauss(A, b); if (!s) break; c = s;
    const res = P.map((p, i) => { const B = base(p[0], p[1]); let v = 0; for (let j = 0; j < nb; j++) v += c[j] * B[j]; return V[i] - v; });
    sig = Math.max(0.5, 1.4826 * mediana(res.map(Math.abs)));
    let n = 0; for (let i = 0; i < P.length; i++) { pesos[i] = Math.abs(res[i]) < 2.8 * sig ? 1 : 0; n += pesos[i]; }
    if (n < nb * 4) break;
  }
  let n = 0; for (let i = 0; i < pesos.length; i++) n += pesos[i];
  return { c, sig, dentro: n / Math.max(1, P.length) };
}
const B2 = (u, v) => [1, u, v, u * u, v * v, u * v], B1 = (u, v) => [1, u, v];
// una superficie curva ajustada a unos puntos [u, v] (entre −1 y 1) y sus valores, sin hacer caso de lo que se sale (para quitar la
// luz desigual de DENTRO de una pieza sin que sus relieves la tuerzan) → c, o null · luego: superficieEn(c, u, v)
export function superficie(P, V) { const r = ajusta(P, V, B2, true); return r.c ? r : null; }
export const superficieEn = (c, u, v) => val(c, B2(u, v));
const val = (c, B) => { let s = 0; for (let j = 0; j < c.length; j++) s += c[j] * B[j]; return s; };

// ---------- 1) APRENDER EL FONDO (del marco de la foto) ----------
export function aprendeFondo(R) {
  const { w, h, Y, Cb, Cr } = R, m = Math.max(3, Math.round(0.045 * Math.min(w, h))), P = [], vy = [], vb = [], vr = [];
  const paso = Math.max(1, Math.round(Math.sqrt((2 * m * (w + h)) / 5000)));
  for (let y = 0; y < h; y += paso) for (let x = 0; x < w; x += paso) { if (x >= m && y >= m && x < w - m && y < h - m) continue; const i = y * w + x; P.push([2 * x / (w - 1) - 1, 2 * y / (h - 1) - 1]); vy.push(Y[i]); vb.push(Cb[i]); vr.push(Cr[i]); }
  const fy = ajusta(P, vy, B2), fb = ajusta(P, vb, B1), fr = ajusta(P, vr, B1);
  if (!fy.c || !fb.c || !fr.c) return null;
  const sY = Math.max(3.2, fy.sig), sC = Math.max(2.2, Math.max(fb.sig, fr.sig));
  // cuánto cambia la luz del fondo de una punta a otra de la foto
  const esq = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].map(q => val(fy.c, B2(q[0], q[1]))), luzMin = Math.min(...esq), luzMax = Math.max(...esq), luzMed = val(fy.c, B2(0, 0));
  return { fy: fy.c, fb: fb.c, fr: fr.c, sY, sC, textura: fy.sig, marcoLimpio: fy.dentro, luzMin, luzMax, luzMed, desigual: (luzMax - luzMin) / Math.max(20, (luzMax + luzMin) / 2) };
}
// cuánto se aparta cada punto del fondo que le tocaría (en «veces lo que baila el fondo») · sombras: versión que las perdona
export function distancias(R, F) {
  const { w, h, Y, Cb, Cr } = R, d = new Float32Array(w * h), ds = new Float32Array(w * h), luz = new Float32Array(w * h), clara = F.luzMed > 95;
  for (let y = 0; y < h; y++) { const v = 2 * y / (h - 1) - 1; for (let x = 0; x < w; x++) { const u = 2 * x / (w - 1) - 1, i = y * w + x, yb = val(F.fy, B2(u, v)), dy = (Y[i] - yb) / F.sY, cbb = val(F.fb, B1(u, v)), crb = val(F.fr, B1(u, v)), db = (Cb[i] - cbb) / F.sC, dr = (Cr[i] - crb) / F.sC, dc = Math.hypot(db, dr);
    luz[i] = Y[i] - yb; d[i] = Math.hypot(dy, dc);
    // una SOMBRA sobre un fondo claro: más oscuro (hasta la mitad), con el mismo color → casi no cuenta
    // (sobre un fondo DE COLOR —madera— la sombra también apaga el color: se compara el color «puesto a la luz del fondo»)
    let dys = dy, dcs = dc; if (clara && dy < 0 && Y[i] > 0.42 * yb) { const e = yb / Math.max(1, Y[i]), dc2 = Math.hypot((128 + (Cb[i] - 128) * e - cbb) / F.sC, (128 + (Cr[i] - 128) * e - crb) / F.sC); if (Math.min(dc, dc2) < 3) { dys = Math.max(dy * 0.22, -2.4); dcs = Math.min(dc, dc2, 2.2); } }
    ds[i] = Math.hypot(dys, dcs); } }
  // TEXTURA: si el fondo tiene trama (tela, madera), una zona LISA no es fondo aunque tenga su mismo tono (el acero que refleja la
  // tela negra). Se mide cuánto «baila» la luz alrededor de cada punto (5 × 5) y se compara con lo que baila en el marco. Solo cuenta
  // lo MÁS LISO que el fondo: junto al borde de la pieza la luz baila mucho y, si contara, la pieza saldría con un halo.
  let dt = d, conTextura = false;
  if (F.textura > 4.5) {
    const m1 = caja(Y, w, h, 2), y2 = new Float32Array(w * h); for (let i = 0; i < w * h; i++) y2[i] = Y[i] * Y[i]; const m2 = caja(y2, w, h, 2), sl = new Float32Array(w * h); for (let i = 0; i < w * h; i++) sl[i] = Math.log(Math.sqrt(Math.max(0, m2[i] - m1[i] * m1[i])) + 0.6);
    const mg = Math.max(3, Math.round(0.045 * Math.min(w, h))), mu = []; for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (x < mg || y < mg || x >= w - mg || y >= h - mg) mu.push(sl[y * w + x]);
    const med = mediana(mu), esp = Math.max(0.22, 1.4826 * mediana(mu.map(v => Math.abs(v - med))));
    if (Math.exp(med) > 3) { conTextura = true; dt = new Float32Array(w * h); const liso = new Float32Array(w * h); for (let i = 0; i < w * h; i++) liso[i] = Math.max(0, (med - sl[i]) / esp);
      const ls = caja(liso, w, h, 1); for (let i = 0; i < w * h; i++) dt[i] = Math.hypot(d[i], 0.85 * ls[i]); }
  }
  return { d, ds, luz, dt, conTextura };
}
// corte de Otsu de un vector (entre lo y hi, 256 cajas)
export function otsu(v, lo, hi, m) {
  const hist = new Float64Array(256), k = 255 / (hi - lo); let tot = 0;
  for (let i = 0; i < v.length; i++) { if (m && !m[i]) continue; hist[lim(Math.round((v[i] - lo) * k), 0, 255)]++; tot++; }
  let suma = 0; for (let t = 0; t < 256; t++) suma += t * hist[t]; let sB = 0, wB = 0, mejor = -1, corte = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (suma - sB) / wF, q = wB * wF * (mB - mF) * (mB - mF); if (q > mejor) { mejor = q; corte = t; } }
  return lo + (corte + 0.5) / k;
}

// ---------- manchas: etiquetar, quedarse con las buenas, cerrar huecos ----------
// etiqueta las manchas de «valor» (4 vecinos) → { et (Int32, −1 = no es), L: [{ n, x0, y0, x1, y1, borde (toca el marco), suma }] }
export function manchas(m, w, h, valor = 1, peso = null) {
  const et = new Int32Array(w * h).fill(-1), L = [], pila = new Int32Array(w * h);
  for (let i0 = 0; i0 < w * h; i0++) {
    if (et[i0] >= 0 || (m[i0] ? 1 : 0) !== valor) continue; const id = L.length, c = { n: 0, x0: w, y0: h, x1: 0, y1: 0, borde: false, suma: 0 }; let top = 0; pila[top++] = i0; et[i0] = id;
    while (top) { const i = pila[--top], x = i % w, y = (i - x) / w; c.n++; if (peso) c.suma += peso[i]; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) c.borde = true;
      if (x > 0 && et[i - 1] < 0 && (m[i - 1] ? 1 : 0) === valor) { et[i - 1] = id; pila[top++] = i - 1; } if (x < w - 1 && et[i + 1] < 0 && (m[i + 1] ? 1 : 0) === valor) { et[i + 1] = id; pila[top++] = i + 1; }
      if (y > 0 && et[i - w] < 0 && (m[i - w] ? 1 : 0) === valor) { et[i - w] = id; pila[top++] = i - w; } if (y < h - 1 && et[i + w] < 0 && (m[i + w] ? 1 : 0) === valor) { et[i + w] = id; pila[top++] = i + w; } }
    L.push(c);
  }
  return { et, L };
}
function dilata(m, w, h, r) { let a = m; for (let k = 0; k < r; k++) { const n = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; n[i] = a[i] || (x > 0 && a[i - 1]) || (x < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w]) ? 1 : 0; } a = n; } return a; }
function erosiona(m, w, h, r) { let a = m; for (let k = 0; k < r; k++) { const n = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; n[i] = a[i] && (x === 0 || a[i - 1]) && (x === w - 1 || a[i + 1]) && (y === 0 || a[i - w]) && (y === h - 1 || a[i + w]) ? 1 : 0; } a = n; } return a; }
// corte con dos niveles: lo que pasa del alto, y lo que pasa del bajo y está pegado a eso
function corteDoble(d, w, h, alto, bajo) {
  const m = new Uint8Array(w * h), pila = []; for (let i = 0; i < w * h; i++) if (d[i] > alto) { m[i] = 1; pila.push(i); }
  while (pila.length) { const i = pila.pop(), x = i % w; for (const j of [i - 1, i + 1, i - w, i + w]) { if (j < 0 || j >= w * h || m[j] || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue; if (d[j] > bajo) { m[j] = 1; pila.push(j); } } }
  return m;
}
// de un corte en bruto a UNA pieza limpia: fuera motas, unir trozos cercanos, agujeros de verdad sí, brillos no
export function limpiaMascara(m0, w, h, d, bajo, dHueco = d) {
  const info = { motas: 0, trozos: 0, brillos: 0, agujeros: 0 }; let m = m0;
  let C = manchas(m, w, h, 1); if (!C.L.length) return null;
  const orden = C.L.map((c, id) => ({ c, id })).sort((a, b) => b.c.n - a.c.n), total = orden.reduce((s, x) => s + x.c.n, 0);
  // la pieza: la mancha más grande que no sea «el marco» (algo que toca el borde y lo rodea casi todo no es la pieza)
  let pp = orden.find(x => !(x.c.borde && (x.c.x1 - x.c.x0 > 0.97 * w || x.c.y1 - x.c.y0 > 0.97 * h))) || orden[0];
  const main = pp.c, diag = Math.hypot(w, h), cerca = 0.03 * diag, elegidas = new Set([pp.id]); let hueco = 0;
  orden.forEach(x => { if (x.id === pp.id || x.c.n < 0.045 * main.n) return; const gx = Math.max(0, Math.max(x.c.x0 - main.x1, main.x0 - x.c.x1)), gy = Math.max(0, Math.max(x.c.y0 - main.y1, main.y0 - x.c.y1)), g = Math.hypot(gx, gy); if (g <= cerca) { elegidas.add(x.id); hueco = Math.max(hueco, g); } });
  info.motas = orden.filter(x => !elegidas.has(x.id)).length; info.trozos = elegidas.size - 1; info.descartado = 1 - [...elegidas].reduce((s, id) => s + C.L[id].n, 0) / Math.max(1, total);
  let p = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) if (elegidas.has(C.et[i])) p[i] = 1;
  // cerrar: un píxel siempre (rayitas); más si hay trozos que unir
  const r = Math.min(8, 1 + (info.trozos ? Math.ceil(hueco / 2) + 1 : 0)); p = erosiona(dilata(p, w, h, r), w, h, r);
  if (info.trozos) { const C2 = manchas(p, w, h, 1), g = C2.L.map((c, id) => ({ c, id })).sort((a, b) => b.c.n - a.c.n)[0]; for (let i = 0; i < w * h; i++) p[i] = C2.et[i] === g.id ? 1 : 0; }
  // los huecos de dentro: AGUJERO si se parece al fondo y no es una mota; si no, es un brillo o un dibujo → pieza
  let np = 0; for (let i = 0; i < w * h; i++) np += p[i];
  const fondoLike = new Float32Array(w * h); for (let i = 0; i < w * h; i++) fondoLike[i] = dHueco[i] < bajo ? 1 : 0;
  const Hh = manchas(p, w, h, 0, fondoLike);
  Hh.L.forEach((c, id) => { if (c.borde) return; const parte = c.suma / c.n, esAgujero = c.n >= Math.max(6, 0.0012 * np) && parte >= 0.42; // (casi la mitad del hueco es fondo: su canto, con brillo o sombra, no cuenta)
    if (esAgujero) info.agujeros++; else { info.brillos++; for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (Hh.et[y * w + x] === id) p[y * w + x] = 1; } });
  np = 0; let x0 = w, y0 = h, x1 = 0, y1 = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (p[y * w + x]) { np++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (np < 20) return null;
  return { m: p, n: np, caja: [x0, y0, x1, y1], info };
}

// ---------- OPCIÓN B · EL IMÁN: lo marcado a ojo se AJUSTA a la pieza ----------
// Ella marca el contorno «por fuera, más o menos». Entre su línea y la pieza queda un margen de fondo. Desde su línea se avanza hacia
// dentro SOLO por lo que parece fondo, como mucho D puntos: si por ese camino se llega a la pieza, ese margen se quita (el contorno se
// pega a la pieza); si a los D puntos sigue siendo «fondo» (un trozo de pieza con el tono del fondo, o un margen enorme), no hay
// prueba de dónde está el borde y se respeta lo que ella marcó. Lo que NO es fondo no se toca nunca.
export function ajustaGuia(guia, dref, w, h, bajo = 3.1, D = 24) {
  const prof = new Int16Array(w * h).fill(-1), niveles = [[]], fondo = i => guia[i] && dref[i] < bajo;
  // el primer anillo: lo marcado que toca el exterior
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!guia[i]) continue; const fr = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !guia[i - 1] || !guia[i + 1] || !guia[i - w] || !guia[i + w]; if (fr && fondo(i)) { prof[i] = 0; niveles[0].push(i); } }
  for (let d = 0; d < D && niveles[d].length; d++) { const sig = []; for (const i of niveles[d]) { const x = i % w; for (const j of [i - 1, i + 1, i - w, i + w]) { if (j < 0 || j >= w * h || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1) || prof[j] >= 0 || !fondo(j)) continue; prof[j] = d + 1; sig.push(j); } } niveles.push(sig); }
  // ¿qué caminos llegan a la pieza? de dentro afuera: vale el punto que toca pieza, o que tiene delante (un paso más adentro) uno que vale
  const vale = new Uint8Array(w * h);
  for (let d = niveles.length - 1; d >= 0; d--) for (const i of niveles[d]) { const x = i % w; let v = 0; for (const j of [i - 1, i + 1, i - w, i + w]) { if (j < 0 || j >= w * h || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue; if ((guia[j] && prof[j] < 0 && dref[j] >= bajo) || (prof[j] === d + 1 && vale[j])) { v = 1; break; } } vale[i] = v; }
  // (un punto vale también si lo vale un vecino de su mismo anillo: los caminos van en abanico y dejarían rayas)
  for (let p = 0; p < 2; p++) for (let d = 0; d < niveles.length; d++) for (const i of niveles[d]) { if (vale[i]) continue; const x = i % w; for (const j of [i - 1, i + 1, i - w, i + w]) { if (j < 0 || j >= w * h || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue; if (vale[j] && prof[j] >= 0 && Math.abs(prof[j] - d) <= 1) { vale[i] = 1; break; } } }
  const out = guia.slice(); let quitados = 0; for (let i = 0; i < w * h; i++) if (vale[i]) { out[i] = 0; quitados++; }
  return { m: out, quitados };
}

// ---------- 2) PUNTUAR una forma de separar la pieza ----------
export function bordesDe(R) { // fuerza del borde en cada punto (luz + color), suavizada, entre 0 y 1 (1 = de los más fuertes de la foto)
  const { w, h } = R, Y = caja(R.Y, w, h, 1), B = caja(R.Cb, w, h, 1), C = caja(R.Cr, w, h, 1), G = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, g = (A) => Math.hypot(A[i + 1] - A[i - 1], A[i + w] - A[i - w]); G[i] = g(Y) + 0.7 * (g(B) + g(C)); }
  // (1 = como los bordes más fuertes de la foto: el 0,4 % de arriba. Con el 3 % de arriba, en una foto de fondo liso casi cualquier
  // cosa —el borde blando de una sombra— ya contaba como «borde fuerte», porque los bordes de verdad son menos del 1 % de los puntos)
  const s = Array.from(G).filter((_, i) => i % 3 === 0).sort((a, b) => a - b), top = s[Math.floor(s.length * 0.996)] || 1, med = s[s.length >> 1] || 0;
  for (let i = 0; i < w * h; i++) G[i] = lim((G[i] - med) / Math.max(1e-6, top - med), 0, 1);
  return G;
}
export function puntua(L, w, h, G, d, dRef = d, bajoRef = 3.1) {
  const m = L.m; let nb = 0, sg = 0, enMarco = 0, per = 0, perS = 0;
  // el borde de la pieza: ¿cae sobre un borde de la foto? (se mira también un píxel alrededor)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!m[i]) continue; const fr = x === 0 || y === 0 || x === w - 1 || y === h - 1, b = fr || !m[i - 1] || !m[i + 1] || !m[i - w] || !m[i + w]; if (!b) continue;
    nb++; if (x < 2 || y < 2 || x > w - 3 || y > h - 3) { enMarco++; continue; } let g = G[i]; if (G[i - 1] > g) g = G[i - 1]; if (G[i + 1] > g) g = G[i + 1]; if (G[i - w] > g) g = G[i - w]; if (G[i + w] > g) g = G[i + w]; sg += g; }
  const E = nb - enMarco > 0 ? sg / (nb - enMarco) : 0;
  // ¿borde limpio? el contorno, después de alisarlo, no debería encoger mucho
  const s = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += m[i + dy * w + dx]; s[i] = c >= 5 ? 1 : 0; }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (m[i] && (!m[i - 1] || !m[i + 1] || !m[i - w] || !m[i + w])) per++; if (s[i] && (!s[i - 1] || !s[i + 1] || !s[i - w] || !s[i + w])) perS++; }
  const liso = per ? lim(perS / per, 0, 1) : 0;
  // contraste: lo de dentro frente a un anillo de fuera
  const fuera = dilata(m, w, h, 4); let si = 0, ni = 0, so = 0, no = 0; for (let i = 0; i < w * h; i++) { if (m[i]) { si += Math.min(30, d[i]); ni++; } else if (fuera[i]) { so += Math.min(30, d[i]); no++; } }
  const contraste = lim(((ni ? si / ni : 0) - (no ? so / no : 0)) / 9, 0, 1);
  // ¿se deja FUERA algo que no es fondo? (un corte que pasa por mitad de la pieza tiene pieza a los dos lados): el anillo de justo
  // fuera (sin el primer píxel, que es el borde borroso) tiene que parecerse al fondo
  const pegado = dilata(m, w, h, 1); let nf = 0, nr = 0; for (let i = 0; i < w * h; i++) if (fuera[i] && !pegado[i]) { nr++; if (dRef[i] > bajoRef) nf++; }
  const dejado = nr ? nf / nr : 0;
  const a = L.n / (w * h), marco = nb ? enMarco / nb : 0, entera = 1 - lim(L.info.descartado || 0, 0, 1);
  let p = 0.5 * E + 0.17 * liso + 0.13 * entera + 0.2 * contraste - 0.6 * marco - 0.9 * dejado; if (a < 0.003 || a > 0.82) p -= 0.5;
  return { p, E, liso, entera, contraste, marco, dejado, area: a };
}

// ---------- 2 bis) LAS FORMAS de separar la pieza ----------
const NOMBRES = { textura: 'Por tono y textura', fondo: 'Por parecido al fondo', sombra: 'Quitando la sombra', luz: 'Por luz (corregida)', color: 'Por color', otsu: 'Claro / oscuro (como antes)', ia: 'La IA de tu PC', mano: 'Retocada a mano' };
// R = foto reducida · ia = máscara de la IA reducida al mismo tamaño (0/1), si la hay → lista de candidatas ya limpias y puntuadas
export function candidatas(R, F, DS, G, ia, guia) {
  const { w, h } = R, out = [], pon = (metodo, m0, d, alto, bajo) => { if (!m0) return; const L = limpiaMascara(m0, w, h, d, bajo, metodo === 'sombra' ? d : DS.dt); if (!L) return;
    { let si = 0; const dv = metodo === 'sombra' ? DS.ds : DS.dt; for (let i = 0; i < w * h; i++) if (L.m[i]) si += Math.min(30, dv[i]); L.dMedio = si / L.n; if (metodo !== 'ia' && L.dMedio < 3.4) return; } const P = puntua(L, w, h, G, DS.d, metodo === 'sombra' ? DS.ds : DS.dt, G.bajoRef || 3.1); out.push(Object.assign(L, P, { metodo, nombre: NOMBRES[metodo], alto, bajo, d, dTono: metodo === 'textura' ? DS.d : d })); };
  // el corte ALTO (lo que seguro es pieza) y el BAJO (lo que se le pega). El bajo va en proporción a cuánto se distingue la pieza:
  // junto a una pieza negra sobre papel, una mancha suave del papel (5 veces lo que baila el fondo) NO es pieza; antes se le pegaba
  // y tapaba el hueco entre dos dientes (contaba 36 de 37)
  const corta = (d, metodo, piso = 3.1) => { const alto = Math.max(piso + 0.9, otsu(d, 0, 16)), fuertes = []; for (let i = 0; i < w * h; i += 3) if (d[i] > alto) fuertes.push(Math.min(60, d[i]));
    const bajo = Math.max(piso, 0.45 * alto, 0.2 * mediana(fuertes)); if (metodo === 'fondo') G.bajoRef = bajo; pon(metodo, corteDoble(d, w, h, alto, bajo), d, alto, bajo); };
  corta(DS.d, 'fondo');
  if (DS.conTextura) corta(DS.dt, 'textura');
  if (F.luzMed > 95) corta(DS.ds, 'sombra');
  // solo luz (con la luz desigual quitada), en veces lo que baila el fondo
  { const dl = new Float32Array(w * h); for (let i = 0; i < w * h; i++) dl[i] = Math.abs(DS.luz[i]) / F.sY; corta(dl, 'luz'); }
  // solo color (piezas de color sobre fondo gris/blanco/negro: la sombra no tiene color)
  { const dc = new Float32Array(w * h); let mx = 0; for (let y = 0; y < h; y++) { const v = 2 * y / (h - 1) - 1; for (let x = 0; x < w; x++) { const u = 2 * x / (w - 1) - 1, i = y * w + x; dc[i] = Math.hypot((R.Cb[i] - val(F.fb, B1(u, v))) / F.sC, (R.Cr[i] - val(F.fr, B1(u, v))) / F.sC); if (dc[i] > mx) mx = dc[i]; } } if (mx > 9) corta(dc, 'color', 3.6); }
  // el corte de siempre (claro/oscuro de toda la foto), por si acaso es el bueno
  { const t = otsu(R.Y, 0, 255), m = new Uint8Array(w * h), bR = G.bajoRef || 3.1; let claros = 0, n = 0; for (let x = 0; x < w; x++) { claros += R.Y[x] > t; claros += R.Y[(h - 1) * w + x] > t; n += 2; } for (let y = 0; y < h; y++) { claros += R.Y[y * w] > t; claros += R.Y[y * w + w - 1] > t; n += 2; } const osc = claros > n / 2; for (let i = 0; i < w * h; i++) m[i] = (osc ? R.Y[i] < t : R.Y[i] > t) ? 1 : 0; pon('otsu', m, DS.d, 0, bR); }
  // la IA entiende QUÉ es la pieza (también lo que tiene el tono del fondo), pero su borde es blando: gana casi siempre, y el borde
  // se afina luego con la foto allí donde el tono lo deja claro
  if (ia) { pon('ia', ia, DS.d, 0, G.bajoRef || 3.1); const c = out.find(x => x.metodo === 'ia'); if (c && c.area > 0.003 && c.marco < 0.25) c.p += 0.22; }
  // lo que ELLA ha pintado o contorneado: no se discute (ni se limpia: un trozo suelto que ha pintado, se queda)
  if (guia) { // «no es fondo» dentro de lo marcado: se distingue por tono (en proporción a la pieza) o es claramente más liso que el fondo
    const bR = G.bajoRef || 3.1, nf = new Float32Array(w * h); for (let i = 0; i < w * h; i++) nf[i] = DS.d[i] >= bR || (DS.conTextura && Math.sqrt(Math.max(0, DS.dt[i] * DS.dt[i] - DS.d[i] * DS.d[i])) >= 2.6) ? 1 : 0;
    let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (guia[y * w + x]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    // …pero los AGUJEROS de dentro sí se buscan: zonas con pinta de fondo, rodeadas de pieza (que no llegan al borde de lo marcado)
    if (n >= 20 && G.iman !== 0) { const aj = ajustaGuia(guia, nf, w, h, 0.5, G.iman || Math.max(10, Math.round(0.07 * Math.max(x1 - x0, y1 - y0)))); if (aj.quitados && n - aj.quitados >= 20) { guia = erosiona(dilata(aj.m, w, h, 1), w, h, 1); n = 0; x0 = w; y0 = h; x1 = 0; y1 = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (guia[y * w + x]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } }
    let nAg = 0; if (n >= 20) { const dentro = erosiona(guia, w, h, 3), bg = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) bg[i] = guia[i] && !nf[i] ? 1 : 0;
      const Cb = manchas(bg, w, h, 1), toca = new Uint8Array(Cb.L.length); for (let i = 0; i < w * h; i++) if (Cb.et[i] >= 0 && !dentro[i]) toca[Cb.et[i]] = 1;
      const quita = new Uint8Array(Cb.L.length); Cb.L.forEach((c, id) => { if (!toca[id] && c.n >= Math.max(8, 0.0012 * n)) { quita[id] = 1; nAg++; } });
      if (nAg) { guia = guia.slice(); for (let i = 0; i < w * h; i++) if (Cb.et[i] >= 0 && quita[Cb.et[i]]) { guia[i] = 0; n--; } } }
    if (n >= 20) { const L = { m: guia, n, caja: [x0, y0, x1, y1], info: { motas: 0, trozos: 0, brillos: 0, agujeros: nAg, descartado: 0 } }; out.push(Object.assign(L, puntua(L, w, h, G, DS.d, DS.dt, G.bajoRef || 3.1), { metodo: 'mano', nombre: NOMBRES.mano, alto: 0, bajo: 3.1, d: DS.d, dTono: DS.d })); } }
  // ¿SOMBRA o pieza? Lo que «quitando la sombra» deja fuera, ¿acaba en un borde blando (sombra) o en uno nítido (pieza gris clara)?
  { const cf = out.find(x => x.metodo === 'fondo'), cs = out.find(x => x.metodo === 'sombra');
    if (cf && cs && cs.n >= cf.n * 0.975) out.splice(out.indexOf(cs), 1);
    else if (cf && cs && cs.n > cf.n * 0.45) { const cerca = dilata(cs.m, w, h, 3), m = cf.m; let sg = 0, n = 0;
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const i = y * w + x; if (!m[i] || cerca[i] || (m[i - 1] && m[i + 1] && m[i - w] && m[i + w])) continue; sg += Math.max(G[i], G[i - 1], G[i + 1], G[i - w], G[i + w]); n++; }
      const blando = n > 12 ? sg / n : 1; cs.blando = blando;
      if (blando < 0.42) cs.p = Math.max(cs.p, ...out.filter(x => x.metodo !== 'ia').map(x => x.p)) + 0.03; else cs.p -= 0.12; } }
  return out.sort((a, b) => b.p - a.p);
}

// ---------- 3 y 4) AFINAR a tamaño real, RECORTAR y AMPLIAR ----------
// ---------- 13-10-2026 (noche) · MOTAS PEGADAS AL BORDE DE LA PIEZA ----------
// Una pelusa clara que cae justo PEGADA a la pieza no se puede separar por el tono: se une a ella y engordaba el contorno ahí
// (0,7 mm en una placa de 38: lo cazó una prueba, 1 vuelta de cada 5). Se reconoce por la FORMA: un bulto MUY PEQUEÑO (más estrecho
// que el ~3 % del lado corto de la pieza), SUELTO (si hay muchos iguales son dientes o un moleteado: no se toca ninguno) y sobre un
// borde que a los dos lados sigue RECTO o en curva suave (la punta de una esquina o de un diente no lo cumple). Solo eso se quita, y
// se dice: si era un saliente de verdad, «Usar la foto tal cual» o «Retocar» lo devuelven. Los entrantes (muescas) no se tocan nunca.
function pasaMorf(a, w, h, c, dilatar, ocho) { // una pasada de dilatar o erosionar dentro de la caja c (a 4 o a 8 vecinos: alternando sale un octógono)
  const n = new Uint8Array(a), [x0, y0, x1, y1] = c;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * w + x, iz = x > 0, de = x < w - 1, ar = y > 0, ab = y < h - 1;
    if (dilatar) { if (a[i]) continue; let v = (iz && a[i - 1]) || (de && a[i + 1]) || (ar && a[i - w]) || (ab && a[i + w]); if (!v && ocho) v = (iz && ar && a[i - w - 1]) || (de && ar && a[i - w + 1]) || (iz && ab && a[i + w - 1]) || (de && ab && a[i + w + 1]); if (v) n[i] = 1; }
    else { if (!a[i]) continue; let v = (!iz || a[i - 1]) && (!de || a[i + 1]) && (!ar || a[i - w]) && (!ab || a[i + w]); if (v && ocho) v = (!(iz && ar) || a[i - w - 1]) && (!(de && ar) || a[i - w + 1]) && (!(iz && ab) || a[i + w - 1]) && (!(de && ab) || a[i + w + 1]); if (!v) n[i] = 0; } }
  return n;
}
// bin = la pieza (0/1), se corrige EN SITIO → { quitados, px, r }
export function quitaBultos(bin, w, h, o = {}) {
  let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (bin[y * w + x]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (n < 400) return { quitados: 0, px: 0, r: 0 };
  const corto = n / Math.max(x1 - x0 + 1, y1 - y0 + 1), r = o.r || lim(Math.round(0.0125 * corto), 1, 6), c = [Math.max(0, x0 - 1), Math.max(0, y0 - 1), Math.min(w - 1, x1 + 1), Math.min(h - 1, y1 + 1)];
  let a = bin; for (let k = 0; k < r; k++) a = pasaMorf(a, w, h, c, false, k % 2 === 1); for (let k = 0; k < r; k++) a = pasaMorf(a, w, h, c, true, k % 2 === 1); // «abrir»: lo que no aguanta un octógono de radio r
  const prot = new Uint8Array(w * h); let np = 0; for (let y = c[1]; y <= c[3]; y++) for (let x = c[0]; x <= c[2]; x++) { const i = y * w + x; if (!bin[i]) a[i] = 0; else if (!a[i]) { prot[i] = 1; np++; } }
  if (!np) return { quitados: 0, px: 0, r };
  const C = manchas(prot, w, h, 1), aMax = (2 * r + 1) * (2 * r + 2), ladoMax = 3 * r + 2, tol = 0.6 + 0.08 * r, cand = [];
  C.L.forEach((b, id) => {
    if (b.n < 3 || b.n > aMax || b.x1 - b.x0 + 1 > ladoMax || b.y1 - b.y0 + 1 > ladoMax) return;
    // ¿cuánto sobresale? (lo más lejos que queda uno de sus puntos de la pieza «abierta»)
    let alto = 0, gx = 0, gy = 0; const D = 2 * r + 3, mios = [];
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { if (C.et[y * w + x] !== id) continue; gx += x; gy += y; mios.push(x, y); let d2 = 1e9;
      for (let v = Math.max(0, y - D); v <= Math.min(h - 1, y + D); v++) for (let u = Math.max(0, x - D); u <= Math.min(w - 1, x + D); u++) if (a[v * w + u]) { const q = (u - x) * (u - x) + (v - y) * (v - y); if (q < d2) d2 = q; }
      if (d2 > alto) alto = d2; }
    alto = Math.sqrt(alto); gx /= b.n; gy /= b.n; if (alto < 2 || alto > 1e4) return; // (un escalón de un punto no es una mota; y si no toca la pieza abierta, no es un bulto de su borde)
    // el borde de la pieza abierta alrededor del bulto → su dirección
    const Rd = Math.ceil(ladoMax / 2 + 3 * r + 8), P = []; let m = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let y = Math.max(1, Math.floor(gy - Rd)); y <= Math.min(h - 2, Math.ceil(gy + Rd)); y++) for (let x = Math.max(1, Math.floor(gx - Rd)); x <= Math.min(w - 2, Math.ceil(gx + Rd)); x++) { const i = y * w + x; if (a[i] && !(a[i - 1] && a[i + 1] && a[i - w] && a[i + w]) && (x - gx) * (x - gx) + (y - gy) * (y - gy) <= Rd * Rd) { P.push(x, y); m++; sx += x; sy += y; } }
    if (m < 2 * r + 6) return; sx /= m; sy /= m; for (let k = 0; k < P.length; k += 2) { const dx = P[k] - sx, dy = P[k + 1] - sy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(ang), uy = Math.sin(ang), T = (x, y) => (x - gx) * ux + (y - gy) * uy, V = (x, y) => -(x - gx) * uy + (y - gy) * ux;
    // lo que ocupa el bulto a lo largo del borde, y los FLANCOS: el borde a un lado y a otro, sin el bulto ni su joroba
    let tb0 = 1e9, tb1 = -1e9; for (let k = 0; k < mios.length; k += 2) { const t = T(mios[k], mios[k + 1]); if (t < tb0) tb0 = t; if (t > tb1) tb1 = t; }
    const Lc = Math.max(-tb0, tb1) + r + 2, Lf = Lc + 2 * r + 6; let n0 = 0, n1 = 0; const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [0, 0, 0], Fl = [];
    for (let k = 0; k < P.length; k += 2) { const t = T(P[k], P[k + 1]), at = Math.abs(t); if (at <= Lc || at > Lf) continue; const v = V(P[k], P[k + 1]), q = [1, t, t * t]; if (t < 0) n0++; else n1++; Fl.push(t, v); for (let i = 0; i < 3; i++) { B[i] += q[i] * v; for (let j = 0; j < 3; j++) S[i][j] += q[i] * q[j]; } }
    if (n0 < r + 3 || n1 < r + 3) return; // (tiene que haber borde a los DOS lados del bulto)
    const co = gauss(S, B); if (!co || Math.abs(co[2]) > 1 / (12 * r + 12)) return; // (una curva más cerrada que un radio de 6 r no es «borde liso»: dos lados de una esquina también se dejan ajustar por una parábola)
    const curva = t => co[0] + co[1] * t + co[2] * t * t; let e2 = 0; for (let k = 0; k < Fl.length; k += 2) { const e = Fl[k + 1] - curva(Fl[k]); e2 += e * e; }
    if (Math.sqrt(e2 / (Fl.length / 2)) > tol) return; // los flancos no siguen una línea recta o una curva suave: es una esquina o la punta de un diente → es de la pieza
    const lado = Math.sign(V(gx, gy) - curva(0)) || 1; if (lado * (V(gx, gy) - curva(0)) < 0.5) return;
    cand.push({ id, n: b.n, alto, gx, gy, ux, uy, Lc, curva, lado });
  });
  if (!cand.length || cand.length > (o.max || 8)) return { quitados: 0, px: 0, r, vistos: cand.length }; // muchos iguales = dientes o moleteado: no se toca ninguno
  // se corta lo que sobresale del borde que marcan los flancos (el bulto Y la joroba baja que deja al alisar), solo ahí
  const fuera = []; cand.forEach(q => { const Rc = Math.ceil(q.Lc + q.alto + 6);
    for (let y = Math.max(0, Math.floor(q.gy - Rc)); y <= Math.min(h - 1, Math.ceil(q.gy + Rc)); y++) for (let x = Math.max(0, Math.floor(q.gx - Rc)); x <= Math.min(w - 1, Math.ceil(q.gx + Rc)); x++) { const i = y * w + x; if (!bin[i]) continue; const t = (x - q.gx) * q.ux + (y - q.gy) * q.uy; if (Math.abs(t) > q.Lc) continue; const e = q.lado * (-(x - q.gx) * q.uy + (y - q.gy) * q.ux - q.curva(t)); if (e > 0.6 && e <= q.alto + 4) fuera.push(i); } });
  if (fuera.length > 0.02 * n) return { quitados: 0, px: 0, r, vistos: cand.length };
  fuera.forEach(i => { bin[i] = 0; });
  return { quitados: cand.length, px: fuera.length, r, vistos: cand.length };
}
function bilineal(A, w, h, x, y) { x = lim(x, 0, w - 1); y = lim(y, 0, h - 1); const xi = Math.min(w - 2, Math.floor(x)), yi = Math.min(h - 2, Math.floor(y)), fx = x - xi, fy = y - yi, i = yi * w + xi; return (A[i] * (1 - fx) + A[i + 1] * fx) * (1 - fy) + (A[i + w] * (1 - fx) + A[i + w + 1] * fx) * fy; }
// D = foto entera · R = reducida · F = fondo · K = candidata elegida → { D (recortada y ampliada), mascara (suave, 0–255), caja, k }
export function recortaYAfina(D, R, F, K, o = {}) {
  const W = D.width, H = D.height, S = D.data, { w, h } = R, [bx0, by0, bx1, by1] = K.caja;
  const mg = Math.max(8, Math.round(0.11 * Math.max(bx1 - bx0, by1 - by0))), cx0 = o.sinRecorte ? 0 : Math.max(0, (bx0 - mg) * R.fx), cy0 = o.sinRecorte ? 0 : Math.max(0, (by0 - mg) * R.fy), cx1 = o.sinRecorte ? W : Math.min(W, (bx1 + 1 + mg) * R.fx), cy1 = o.sinRecorte ? H : Math.min(H, (by1 + 1 + mg) * R.fy);
  const cw = cx1 - cx0, ch = cy1 - cy0, lado = o.lado || 1200, k = o.sinRecorte ? 1 : Math.max(cw, ch) >= lado ? Math.min(1, 2000 / Math.max(cw, ch)) : Math.min(lado / Math.max(cw, ch), o.maxAmpliar || 3), ow = Math.max(16, Math.round(cw * k)), oh = Math.max(16, Math.round(ch * k));
  const out = new Uint8ClampedArray(ow * oh * 4), campo = new Float32Array(ow * oh);
  // la máscara reducida, alisada (para saber dónde está el borde y qué tono tiene la pieza cerca de cada punto)
  const mf = new Float32Array(w * h); for (let i = 0; i < w * h; i++) mf[i] = K.m[i]; const mb = caja(mf, w, h, K.metodo === 'ia' ? 3 : K.metodo === 'mano' ? 3 : 2), conD = K.metodo !== 'otsu' && K.d && !(K.metodo === 'mano' && o.iman === 0);
  let dIn = null; if (conD) { const dm = new Float32Array(w * h); const dT = K.dTono || K.d; for (let i = 0; i < w * h; i++) dm[i] = K.m[i] ? Math.min(400, dT[i]) : 0; const a = caja(dm, w, h, 5), b = caja(mf, w, h, 5); dIn = new Float32Array(w * h); for (let i = 0; i < w * h; i++) dIn[i] = b[i] > 0.02 ? a[i] / b[i] : 0; }
  const clara = F.luzMed > 95, sombra = K.metodo === 'sombra', soloLuz = K.metodo === 'luz', soloColor = K.metodo === 'color';
  for (let y = 0; y < oh; y++) { const sy = cy0 + (y + 0.5) / k - 0.5, v = 2 * (sy / R.fy) / (h - 1) - 1, ry = (sy + 0.5) / R.fy - 0.5;
    for (let x = 0; x < ow; x++) { const sx = cx0 + (x + 0.5) / k - 0.5, o4 = (y * ow + x) * 4;
      const xi = lim(Math.floor(sx), 0, W - 2), yi = lim(Math.floor(sy), 0, H - 2), fx = lim(sx - xi, 0, 1), fy = lim(sy - yi, 0, 1), a = (yi * W + xi) * 4, b = a + 4, c = a + W * 4, e = c + 4;
      const r = (S[a] * (1 - fx) + S[b] * fx) * (1 - fy) + (S[c] * (1 - fx) + S[e] * fx) * fy, g = (S[a + 1] * (1 - fx) + S[b + 1] * fx) * (1 - fy) + (S[c + 1] * (1 - fx) + S[e + 1] * fx) * fy, bl = (S[a + 2] * (1 - fx) + S[b + 2] * fx) * (1 - fy) + (S[c + 2] * (1 - fx) + S[e + 2] * fx) * fy;
      out[o4] = r; out[o4 + 1] = g; out[o4 + 2] = bl; out[o4 + 3] = 255;
      const rx = (sx + 0.5) / R.fx - 0.5, mm = bilineal(mb, w, h, rx, ry); let f = 2 * mm - 1;
      if (conD && mm > 0.04 && mm < 0.96) { // en la franja del borde, decide la foto a tamaño real: a medio camino entre la pieza y el fondo
        const u = 2 * (sx / R.fx) / (w - 1) - 1, yb = val(F.fy, B2(u, v)), Yp = 0.299 * r + 0.587 * g + 0.114 * bl, Cbp = 128 - 0.168736 * r - 0.331264 * g + 0.5 * bl, Crp = 128 + 0.5 * r - 0.418688 * g - 0.081312 * bl;
        const cbb = val(F.fb, B1(u, v)), crb = val(F.fr, B1(u, v)); let dy = (Yp - yb) / F.sY, dc = Math.hypot((Cbp - cbb) / F.sC, (Crp - crb) / F.sC);
        if (sombra && clara && dy < 0 && Yp > 0.42 * yb) { const e = yb / Math.max(1, Yp), dc2 = Math.hypot((128 + (Cbp - 128) * e - cbb) / F.sC, (128 + (Crp - 128) * e - crb) / F.sC); if (Math.min(dc, dc2) < 3) { dy = Math.max(dy * 0.22, -2.4); dc = Math.min(dc, dc2, 2.2); } }
        // (donde la pieza tiene casi el tono del fondo —el acero que refleja la tela— el tono no puede decidir el borde: se deja el de la máscara)
        const din = bilineal(dIn, w, h, rx, ry), dd = soloLuz ? Math.abs(dy) : soloColor ? dc : Math.hypot(dy, dc), thr = Math.max(K.bajo, 0.5 * din), fd = lim((dd - thr) / thr, -1, 1), peso = lim((din - 1.6 * K.bajo) / K.bajo, 0, 1); // (en la franja del borde, si la pieza se distingue bien, decide la foto)
        f = fd * peso + f * (1 - peso); }
      campo[y * ow + x] = f; } }
  // alisar un poco y quedarse con UNA pieza también a este tamaño (el afinado puede dejar motas en la franja)
  const cs = caja(campo, ow, oh, 1), bin = new Uint8Array(ow * oh); for (let i = 0; i < ow * oh; i++) bin[i] = cs[i] > 0 ? 1 : 0;
  const C = manchas(bin, ow, oh, 1); if (!C.L.length) return null; let gid = 0; C.L.forEach((c, id) => { if (c.n > C.L[gid].n) gid = id; });
  // huecos pequeñísimos de dentro (ruido del afinado) → pieza; los agujeros de verdad ya venían en la máscara reducida
  for (let i = 0; i < ow * oh; i++) bin[i] = C.et[i] === gid ? 1 : 0;
  const bultos = o.sinBultos || K.metodo === 'mano' ? { quitados: 0 } : quitaBultos(bin, ow, oh); // 13-10 (noche): motas pegadas al borde (lo que marcas tú a mano no se toca) // 13-10 (noche): motas pegadas al borde (lo que marcas tú a mano no se toca)
  const Hh = manchas(bin, ow, oh, 0), minH = Math.max(12, 0.0004 * C.L[gid].n), relleno = new Uint8Array(ow * oh); Hh.L.forEach((c, id) => { if (!c.borde && c.n < minH) for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (Hh.et[y * ow + x] === id) relleno[y * ow + x] = 1; });
  const M = new Uint8ClampedArray(ow * oh * 4); let n = 0;
  for (let i = 0; i < ow * oh; i++) { let v = relleno[i] ? 255 : bin[i] ? lim(128 + cs[i] * 420, 129, 255) : lim(128 + Math.min(0, cs[i]) * 420, 0, 127); if (!bin[i] && !relleno[i] && cs[i] > 0) v = 60; M[i * 4] = M[i * 4 + 1] = M[i * 4 + 2] = v; M[i * 4 + 3] = 255; if (v > 127) n++; }
  return { D: { width: ow, height: oh, data: out }, mascara: { width: ow, height: oh, data: M }, caja: [cx0, cy0, cx1, cy1], k, n, bultos: bultos.quitados };
}

// ---------- 5) LO QUE SE HA ARREGLADO, LO QUE NO, Y LA NOTA ----------
function informe(R, F, K, alt, rec, D) {
  const pasos = [], avisos = [], a = K.area;
  if (F.textura > 5.5) pasos.push('El fondo tiene textura (tela, madera o grano): he aprendido cómo es para no confundirlo con la pieza.');
  if (F.desigual > 0.22) pasos.push('La luz no era igual en toda la foto (un lado ' + Math.round(F.desigual * 100) + ' % más claro que otro): corregida.');
  if (K.metodo === 'sombra') pasos.push('Había sombra junto a la pieza: no la cuento como pieza.');
  if (K.info.brillos) pasos.push('He rellenado ' + K.info.brillos + (K.info.brillos === 1 ? ' brillo o reflejo' : ' brillos o reflejos') + ' de dentro de la pieza (antes salían como agujeros).');
  if (K.info.trozos) pasos.push('La pieza salía partida en ' + (K.info.trozos + 1) + ' trozos (un reflejo la cortaba): los he unido.');
  if (K.info.motas > 0) pasos.push('He quitado ' + K.info.motas + (K.info.motas === 1 ? ' mota' : ' motas, pelusas o manchas') + ' del fondo.');
  if (rec && rec.bultos) pasos.push('He quitado ' + (rec.bultos === 1 ? 'una mota pegada' : rec.bultos + ' motas pegadas') + ' al borde de la pieza (un bulto muy pequeño en un borde liso). Si era un saliente de verdad, «Usar la foto tal cual» o «🩹 Retocar» lo devuelven.');
  if (K.info.agujeros) pasos.push((K.info.agujeros === 1 ? 'Un agujero' : K.info.agujeros + ' agujeros') + ' de verdad (se ve el fondo a través): ' + (K.info.agujeros === 1 ? 'respetado' : 'respetados') + '.');
  if (rec && (a < 0.2 || rec.k > 1.15)) pasos.push('La pieza ocupaba el ' + n1(a * 100) + ' % de la foto: la he recortado' + (rec.k > 1.15 ? ' y ampliado ×' + n1(rec.k) : '') + ' para que las marcas se lean.');
  if (K.metodo === 'ia') pasos.push('La ha separado la IA de tu PC y el borde lo he afinado con la foto.');
  if (K.metodo === 'mano') pasos.push('El contorno lo has marcado tú; lo he pegado al borde de la foto donde se ve claro.');
  // nitidez: cuánto ocupa el borde (en píxeles de la foto original)
  const anchoBorde = K.E > 0.02 ? lim(0.9 / K.E, 1, 12) * R.f : 12 * R.f, largoPx = Math.max(K.caja[2] - K.caja[0], K.caja[3] - K.caja[1]) * R.f;
  if (K.E < 0.2) avisos.push('La foto está movida o desenfocada: el borde puede bailar ±' + Math.max(2, Math.round(anchoBorde / 2)) + ' píxeles. Vale para la forma; las medidas, con el calibre.');
  if (largoPx < 260) avisos.push('La pieza tiene muy pocos píxeles (' + Math.round(largoPx) + ' de largo): los detalles pequeños no se ven. Si puedes, acércate más.');
  if (K.marco > 0.04) avisos.push('La pieza toca el borde de la foto: puede faltar un trozo.');
  if (F.marcoLimpio < 0.55) avisos.push('El fondo no es uno solo (hay más cosas alrededor): comprueba el contorno y, si hace falta, retócalo.');
  const seg = alt[1], ventaja = seg ? K.p - seg.p : 0.3;
  let nota = lim(0.25 + 0.9 * K.p + 0.25 * Math.min(0.3, Math.max(0, ventaja)), 0, 1); if (K.marco > 0.04) nota *= 0.7; if (F.marcoLimpio < 0.55 && K.metodo !== 'ia') nota *= 0.8;
  if (K.metodo !== 'ia' && K.metodo !== 'mano' && K.dejado > 0.1) { nota = Math.min(nota, 0.58); avisos.push('Pegado al contorno hay zonas que NO parecen fondo (lisas u oscuras): puede que a la pieza le falte un trozo que tiene el tono del fondo. Mira la línea verde; en el PC lo resuelve la IA, y si no, «🩹 Retocar».'); }
  if (K.metodo === 'mano') nota = Math.max(nota, 0.8);
  const confianza = nota >= 0.62 ? 'alta' : nota >= 0.42 ? 'media' : 'baja';
  if (confianza === 'baja') avisos.push('No estoy seguro del contorno: míralo en la foto (línea verde) y usa «🩹 Retocar» o prueba otra de las formas.');
  return { pasos, avisos, nota, confianza };
}

// ---------- TODO JUNTO ----------
// una pasada: aprender el fondo, probar las formas y puntuarlas
function pasada(D, o, ia, guia) {
  const R = reduce(D, o.trabajo || 720), F = aprendeFondo(R); if (!F) return null;
  const DS = distancias(R, F), G = bordesDe(R), aMasc = I => { if (!I) return null; const Ri = reduce(I, o.trabajo || 720); if (Ri.w !== R.w || Ri.h !== R.h) return null; const m = new Uint8Array(R.w * R.h); for (let i = 0; i < m.length; i++) m[i] = Ri.Y[i] > 127 ? 1 : 0; return m; };
  if (o.iman != null) G.iman = o.iman === 0 ? 0 : Math.max(1, Math.round(o.iman / R.f)); // (o.iman: alcance en píxeles de la foto; 0 = sin imán)
  const alt = candidatas(R, F, DS, G, aMasc(ia), aMasc(guia)); if (!alt.length) return null;
  return { R, F, alt, K: alt.find(x => x.metodo === 'mano') || (o.forzar && alt.find(x => x.metodo === o.forzar)) || alt[0] };
}
export function recorte(D, x0, y0, x1, y1) { const w = x1 - x0, h = y1 - y0, out = new Uint8ClampedArray(w * h * 4), S = D.data, W = D.width; for (let y = 0; y < h; y++) out.set(S.subarray(((y + y0) * W + x0) * 4, ((y + y0) * W + x1) * 4), y * w * 4); return { width: w, height: h, data: out }; }
// D = ImageData (o { width, height, data }) · o.ia = máscara de la IA (misma forma, blanco = pieza) · o.forzar = método
// → { ok, D, mascara, caja (en la foto original), k, metodo, nombre, confianza, nota, pasos, avisos, alternativas: [{ metodo, nombre, p }] }
// Va en DOS PASADAS: la primera, con la foto entera, dice dónde está la pieza; la segunda repite todo solo con ese trozo, a más
// resolución y con el fondo de alrededor de la pieza (una pieza pequeña en una foto grande se veía con 90 píxeles: sin detalle).
export function restaura(D, o = {}) {
  const P1 = pasada(D, o, o.ia || null, o.guia || null);
  if (!P1) return { ok: false, error: 'No encuentro la pieza: no hay nada en la foto que se distinga del fondo. Ponla sobre algo de otro color.' };
  let P = P1, base = D, off = [0, 0], area1 = P1.K.area;
  if (P1.K.area < 0.3 && !o.unaPasada && !o.sinRecorte && !o.guia) {
    const R = P1.R, [bx0, by0, bx1, by1] = P1.K.caja, mg = Math.max(10, Math.round(0.3 * Math.max(bx1 - bx0, by1 - by0)));
    const x0 = Math.max(0, Math.floor((bx0 - mg) * R.fx)), y0 = Math.max(0, Math.floor((by0 - mg) * R.fy)), x1 = Math.min(D.width, Math.ceil((bx1 + 1 + mg) * R.fx)), y1 = Math.min(D.height, Math.ceil((by1 + 1 + mg) * R.fy));
    if (x1 - x0 > 40 && y1 - y0 > 40 && (x1 - x0) * (y1 - y0) < 0.85 * D.width * D.height) {
      const Dc = recorte(D, x0, y0, x1, y1), P2 = pasada(Dc, o, o.ia ? recorte(o.ia, x0, y0, x1, y1) : null);
      // la segunda vale si encuentra una pieza que no se sale del recorte (si se sale, la primera se había dejado un trozo: se queda la primera)
      if (P2 && P2.K.marco < 0.02 && P2.K.p > P1.K.p - 0.35) { P = P2; base = Dc; off = [x0, y0]; }
    }
  }
  const K = P.K, rec = recortaYAfina(base, P.R, P.F, K, o); if (!rec) return { ok: false, error: 'No he podido sacar el contorno de la pieza.' };
  rec.caja = [rec.caja[0] + off[0], rec.caja[1] + off[1], rec.caja[2] + off[0], rec.caja[3] + off[1]];
  const Ki = Object.assign({}, K, { area: Math.min(area1, rec.n / (rec.k * rec.k) / (D.width * D.height)) }), inf = informe(P.R, P.F, Ki, P.alt, rec, D);
  return Object.assign({ ok: true, metodo: K.metodo, nombre: K.nombre, pasadas: P === P1 ? 1 : 2, alternativas: P.alt.map(x => ({ metodo: x.metodo, nombre: x.nombre, p: x.p, area: x.area, E: x.E, liso: x.liso, entera: x.entera, contraste: x.contraste, dejado: x.dejado, marco: x.marco, dMedio: x.dMedio })), puntos: { p: K.p, E: K.E, liso: K.liso, entera: K.entera, contraste: K.contraste, marco: K.marco, dejado: K.dejado, area: Ki.area }, fondo: { textura: P.F.textura, desigual: P.F.desigual, luz: P.F.luzMed, marcoLimpio: P.F.marcoLimpio } }, rec, inf);
}

// ---------- RETOCAR A MANO: pintar «esto es pieza» / «esto no» sobre la foto ya recortada ----------
// M = máscara (ImageData, se cambia) · trazo = { modo: 'mas' | 'menos', pts: [[x, y]…], r } en píxeles de la foto recortada
export function pinta(M, trazo) {
  const w = M.width, h = M.height, A = M.data, v = trazo.modo === 'mas' ? 255 : 0, r = Math.max(1, trazo.r || 8), pts = trazo.pts || [];
  const punto = (cx, cy) => { const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) { const i = (y * w + x) * 4; A[i] = A[i + 1] = A[i + 2] = v; } };
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / Math.max(1, r / 2))); for (let k = 0; k <= n; k++) punto(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n); }
  return M;
}
// varita: desde un punto, todo lo de alrededor que tiene su mismo color (para añadir un trozo que faltaba o quitar uno que sobra)
export function varita(D, M, p, modo, tol = 22) {
  const w = D.width, h = D.height, S = D.data, A = M.data, x0 = lim(Math.round(p[0]), 0, w - 1), y0 = lim(Math.round(p[1]), 0, h - 1), i0 = (y0 * w + x0) * 4, r0 = S[i0], g0 = S[i0 + 1], b0 = S[i0 + 2], v = modo === 'mas' ? 255 : 0, visto = new Uint8Array(w * h), pila = [y0 * w + x0], tope = Math.round(w * h * 0.45); let n = 0;
  visto[y0 * w + x0] = 1;
  while (pila.length && n < tope) { const i = pila.pop(), x = i % w; A[i * 4] = A[i * 4 + 1] = A[i * 4 + 2] = v; n++;
    for (const j of [i - 1, i + 1, i - w, i + w]) { if (j < 0 || j >= w * h || visto[j] || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue; visto[j] = 1; const q = j * 4; if (Math.abs(S[q] - r0) + Math.abs(S[q + 1] - g0) + Math.abs(S[q + 2] - b0) <= tol * 3) pila.push(j); } }
  return n;
}
// después de retocar: alisar el borde y dejar una sola pieza (lo pintado manda)
export function asienta(M) {
  const w = M.width, h = M.height, A = M.data, f = new Float32Array(w * h); for (let i = 0; i < w * h; i++) f[i] = A[i * 4] > 127 ? 1 : -1;
  const cs = caja(f, w, h, 1), bin = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) bin[i] = cs[i] > 0 ? 1 : 0;
  const C = manchas(bin, w, h, 1); if (!C.L.length) return 0; let gid = 0; C.L.forEach((c, id) => { if (c.n > C.L[gid].n) gid = id; });
  for (let i = 0; i < w * h; i++) { const v = C.et[i] === gid ? lim(128 + cs[i] * 300, 129, 255) : lim(128 + Math.min(0, cs[i]) * 300, 0, 127); A[i * 4] = A[i * 4 + 1] = A[i * 4 + 2] = C.et[i] !== gid && cs[i] > 0 ? 60 : v; A[i * 4 + 3] = 255; }
  return C.L[gid].n;
}
