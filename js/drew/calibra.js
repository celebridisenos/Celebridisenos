// ================= 👗 CelebriDREW · CALIBRAR: la FOTO con un folio A4 y la IMPRESORA con una hoja de prueba (16-10-2026) =================
// Ella: «que se pueda CALIBRAR (se exporta para imprimir y hacer la prenda real)» y «el programa tiene que decir qué foto le va bien».
// · FOTO: un folio A4 (21 × 29,7 cm) plano junto a la prenda. Se busca SOLO (lo blanco, sin color y rectangular más grande que no toca el
//   borde de la foto), se afinan sus 4 lados con menos de un píxel de error (el borde del papel buscado a lo largo de su perpendicular en la
//   foto entera) y con sus 4 esquinas se ENDEREZA la foto (r8/foto_medida.js `endereza`): sin perspectiva y con los mm por píxel sabidos.
//   Si no lo encuentra, lo dice y las esquinas se ponen a mano (se arrastran).
// · IMPRESORA: una hoja de prueba con dos rayas (170 mm a lo ancho, 250 mm a lo alto). Ella las mide y se guarda la corrección de cada
//   sentido; drew/pdf.js la aplica a TODOS los PDF. Si las dos salen al 94–98 % por igual, es «Ajustar a la página»: se le avisa.
import { nuevoPDF, anchoTexto, CLAVE_IMPRESORA, escalaImpresora } from './pdf.js';
import { homografia, aplicaH, inversaH } from '../r8/foto_medida.js';

export const FOLIO = [210, 297];
export const PRUEBA = { h: 170, v: 250 };
export const impresora = escalaImpresora;
const coma = (v, d = 1) => v.toFixed(d).replace('.', ',');
export const pct = v => (v >= 1 ? '+' : '−') + coma(Math.abs(v - 1) * 100, 2) + ' %';
const num = v => Number(String(v == null ? '' : v).trim().replace(',', '.'));

// ---------- la IMPRESORA ----------
// mh, mv: lo que miden en SU papel las rayas de la hoja de prueba (mm) → { ok, x, y (lo que hay que multiplicar), avisos } | { ok: false, error }
export function revisaMedidas(mh, mv) {
  mh = num(mh); mv = num(mv);
  if (!(mh > 0 && mv > 0)) return { ok: false, error: 'Escribe lo que miden las dos rayas, en milímetros (por ejemplo 169,5).' };
  const rx = mh / PRUEBA.h, ry = mv / PRUEBA.v, avisos = [];
  if (rx > 0.9 && rx < 0.985 && ry > 0.9 && ry < 0.985 && Math.abs(rx - ry) < 0.012) return { ok: false, error: 'Ha salido al ' + Math.round((rx + ry) * 50) + ' %: eso es «Ajustar a la página». Vuelve a imprimir la hoja al 100 % («Tamaño real») y mide otra vez.' };
  if (Math.abs(rx - 1) > 0.05 || Math.abs(ry - 1) > 0.05) return { ok: false, error: 'Sale un ' + coma(Math.max(Math.abs(rx - 1), Math.abs(ry - 1)) * 100) + ' % distinto: demasiado para ser la impresora. Mira que sean MILÍMETROS (la raya de lado a lado ronda los ' + PRUEBA.h + ' y la de arriba abajo los ' + PRUEBA.v + ') y que se imprimió al 100 %.' };
  if (Math.abs(rx - 1) < 0.002 && Math.abs(ry - 1) < 0.002) avisos.push('Tu impresora es exacta (menos de un 0,2 % de error): casi no hay nada que corregir.');
  else if (Math.abs(rx - ry) > 0.006) avisos.push('Estira distinto a lo ancho que a lo alto: es normal (el papel avanza con rodillos). Se corrige cada sentido por separado.');
  return { ok: true, x: PRUEBA.h / mh, y: PRUEBA.v / mv, mh, mv, avisos };
}
export function guardaImpresora(mh, mv) {
  const R = revisaMedidas(mh, mv); if (!R.ok) return R;
  const j = { x: R.x, y: R.y, mh: R.mh, mv: R.mv, fecha: new Date().toISOString() };
  try { localStorage.setItem(CLAVE_IMPRESORA, JSON.stringify(j)); } catch (e) { return { ok: false, error: 'No se ha podido guardar en este aparato.' }; }
  return Object.assign(R, { guardada: j });
}
export function quitaImpresora() { try { localStorage.removeItem(CLAVE_IMPRESORA); } catch (e) { } }

// la HOJA DE PRUEBA (A4, SIN ninguna corrección: es la que sirve para medir la impresora tal cual)
// o.comprobar = la MISMA hoja pero YA corregida con la calibración guardada: al imprimirla, las rayas tienen que dar 170 y 250 mm justos
export function hojaPrueba(o = {}) {
  const E = o.comprobar ? escalaImpresora() : null;
  const doc = nuevoPDF({ titulo: 'CelebriDREW - hoja de ' + (E ? 'comprobacion' : 'prueba') + ' de la impresora', escala: E || false }), g = doc.pagina(210, 297);
  const VX = 14, VY = 24, HX = 30, HY = 196, gris = 0.32;
  g.texto(30, 281, E ? 'Hoja de COMPROBACIÓN de la impresora' : 'Hoja de prueba de la impresora', { tam: 7, negrita: true });
  g.texto(30, 274, 'CelebriDREW · para que tus patrones salgan a su tamaño EXACTO', { tam: 3.6, gris });
  let y = 264;
  (E ? ['Esta hoja YA va corregida con tu calibración (a lo ancho ×' + E.x.toFixed(4).replace('.', ',') + ', a lo alto ×' + E.y.toFixed(4).replace('.', ',') + '), igual que tus patrones.',
    '1. Imprímela al 100 % («Tamaño real»), en la MISMA impresora y con el mismo papel.',
    '2. Mide las dos rayas: tienen que dar ' + PRUEBA.h + ' mm y ' + PRUEBA.v + ' mm JUSTOS. Si es así, la calibración está bien. Si no, vuelve a calibrar con la hoja de prueba.']
    : ['1. Imprímela al 100 % («Tamaño real» o «Escala 100 %»). NUNCA con «Ajustar a la página».',
    '2. Con una regla, mide en MILÍMETROS la raya de lado a lado (de una barra a la otra) y la raya de arriba abajo (igual, de barra a barra).',
    '3. Escribe las dos medidas en CelebriDREW -> Foto -> «Calibrar la impresora». Desde ese momento, todos tus PDF salen corregidos para esta impresora.'])
    .forEach(s => { y = g.parrafo(30, y, s, { tam: 3.5, ancho: 166 }) - 1.6; });
  // la raya de LADO A LADO (con milímetros, medios centímetros y centímetros) y sus barras de punta
  g.linea(HX, HY, HX + PRUEBA.h, HY, { ancho: 0.25 });
  for (let mm = 0; mm <= PRUEBA.h; mm++) { const L = mm % 10 === 0 ? 4 : mm % 5 === 0 ? 2.6 : 1.5; g.linea(HX + mm, HY, HX + mm, HY - L, { ancho: mm % 10 ? 0.1 : 0.2 }); if (mm % 10 === 0 && mm && mm < PRUEBA.h) g.texto(HX + mm, HY - 7.5, String(mm / 10), { tam: 2.4, centro: true, gris }); }
  [HX, HX + PRUEBA.h].forEach(x => g.linea(x, HY - 6, x, HY + 6, { ancho: 0.35 }));
  g.texto(HX + PRUEBA.h / 2, HY + 4, 'De lado a lado: tiene que medir ' + PRUEBA.h + ' mm', { tam: 3.4, negrita: true, centro: true });
  // la raya de ARRIBA ABAJO
  g.linea(VX, VY, VX, VY + PRUEBA.v, { ancho: 0.25 });
  for (let mm = 0; mm <= PRUEBA.v; mm++) { const L = mm % 10 === 0 ? 4 : mm % 5 === 0 ? 2.6 : 1.5; g.linea(VX, VY + mm, VX + L, VY + mm, { ancho: mm % 10 ? 0.1 : 0.2 }); if (mm % 10 === 0 && mm && mm < PRUEBA.v) g.texto(VX + 5.2, VY + mm - 0.9, String(mm / 10), { tam: 2.4, gris }); }
  [VY, VY + PRUEBA.v].forEach(yy => g.linea(VX - 6, yy, VX + 6, yy, { ancho: 0.35 }));
  const tv = 'De arriba abajo: tiene que medir ' + PRUEBA.v + ' mm'; g.texto(VX + 13, VY + PRUEBA.v / 2 - anchoTexto(tv, 3.4) / 2, tv, { tam: 3.4, negrita: true, giro: 90 });
  // comprobaciones sin regla: el cuadrado de 5 cm, una tarjeta (DNI o del banco: 85,60 × 53,98 mm) y una moneda de 1 € (23,25 mm)
  g.rect(40, 118, 50, 50, { ancho: 0.4 }); g.texto(65, 171, 'Cuadrado de 5 × 5 cm', { tam: 3.2, negrita: true, centro: true });
  g.rect(104, 118, 85.6, 53.98, { ancho: 0.35, trazos: [2, 1.2] }); g.texto(146.8, 175, 'Una tarjeta (DNI o del banco) cabe JUSTA', { tam: 3.2, negrita: true, centro: true });
  g.circulo(60, 92, 23.25 / 2, { ancho: 0.35 }); g.texto(78, 93, 'Una moneda de 1 € tapa el círculo justo', { tam: 3.2, negrita: true }); g.texto(78, 88, '(si sobra o falta papel alrededor, la impresora no imprime a tamaño real)', { tam: 2.7, gris });
  y = g.parrafo(30, 66, E ? 'Si las rayas dan sus medidas justas (con medio milímetro arriba o abajo, lo que se ve a ojo con una regla), tus patrones salen a tamaño real en esta impresora. Si cambias de impresora o de papel, vuelve a calibrar.'
    : 'Si una raya sale distinta de la otra, tu impresora estira un poco más en un sentido que en el otro: es normal y CelebriDREW lo corrige en cada sentido por separado. Esta hoja va SIN corregir a propósito: es la que sirve para medir.', { tam: 3.1, ancho: 166, gris });
  g.parrafo(30, y - 2, 'Para medir bien: regla metálica o escuadra, mirando desde arriba (no de lado), y del borde de una barra al mismo borde de la otra.', { tam: 3.1, ancho: 166, gris });
  g.texto(30, 12, '© CelebriDiseños · CelebriDREW', { tam: 2.6, gris: 0.5 });
  return doc.bytes();
}

// ---------- la FOTO: buscar el FOLIO A4 ----------
// D = { data, width, height } (ImageData) → { quad: [[x, y] × 4] (arriba-izq, arriba-der, abajo-der, abajo-izq, en px de D), ancho, alto (mm),
//   conf: 'alta' | 'media', puntos (cuántos puntos de borde afinados) } o null si no hay nada que parezca un folio
export function detectaFolio(D) {
  const W = D.width, H = D.height, s = Math.max(1, Math.ceil(Math.max(W, H) / 900)), w = Math.floor(W / s), hh = Math.floor(H / s), n = w * hh, px = D.data;
  const L = new Float32Array(n), Sa = new Float32Array(n);
  for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) { let r = 0, g = 0, b = 0; for (let bb = 0; bb < s; bb++) for (let a = 0; a < s; a++) { const o = ((j * s + bb) * W + i * s + a) * 4; r += px[o]; g += px[o + 1]; b += px[o + 2]; }
    const k = s * s; r /= k; g /= k; b /= k; L[j * w + i] = 0.299 * r + 0.587 * g + 0.114 * b; Sa[j * w + i] = Math.max(r, g, b) - Math.min(r, g, b); }
  // umbrales a probar: el de Otsu y varios de la parte clara (el folio suele ser lo más blanco, pero no siempre lo único claro)
  const hist = new Float64Array(256); for (let q = 0; q < n; q++) hist[Math.min(255, L[q] | 0)]++;
  let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sB = 0, wB = 0, mejorV = 0, otsu = 128; for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = n - wB; if (!wF) break; sB += t * hist[t]; const v = wB * wF * (sB / wB - (sum - sB) / wF) ** 2; if (v > mejorV) { mejorV = v; otsu = t; } }
  const cuantil = f => { let c = 0; for (let t = 0; t < 256; t++) { c += hist[t]; if (c >= f * n) return t; } return 255; };
  // (16-10: también los MUY claros: con la prenda entera en la foto, el folio es solo un 3–6 % de ella y los cuantiles de antes no lo separaban del fondo)
  const umbrales = [...new Set([otsu, cuantil(0.6), cuantil(0.75), cuantil(0.85), cuantil(0.92), cuantil(0.95), cuantil(0.97), cuantil(0.985)].map(t => Math.max(90, Math.min(245, t))))];
  const lab = new Int32Array(n), pila = new Int32Array(n); let mejor = null;
  for (const T of umbrales) {
    lab.fill(0); let id = 0;
    for (let q0 = 0; q0 < n; q0++) { if (lab[q0] || !(L[q0] > T && Sa[q0] < Math.max(40, 0.3 * L[q0]))) continue; id++; let sp = 0, area = 0, borde = false; const bordes = []; pila[sp++] = q0; lab[q0] = id;
      while (sp) { const q = pila[--sp], i = q % w, j = (q - i) / w; area++; if (i === 0 || j === 0 || i === w - 1 || j === hh - 1) borde = true; let esBorde = false;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const I = i + di, J = j + dj; if (I < 0 || J < 0 || I >= w || J >= hh) { esBorde = true; continue; } const r = J * w + I; if (lab[r] === id) continue; if (!lab[r] && L[r] > T && Sa[r] < Math.max(40, 0.3 * L[r])) { lab[r] = id; pila[sp++] = r; } else esBorde = true; }
        if (esBorde) bordes.push([i, j]); }
      if (borde || area < 0.004 * n || area > 0.6 * n || bordes.length < 40) continue;
      const Q = cuadri(envolvente(bordes)); if (!Q) continue; const aQ = areaPol(Q), rect = area / aQ, lados = Q.map((p, k) => Math.hypot(Q[(k + 1) % 4][0] - p[0], Q[(k + 1) % 4][1] - p[1]));
      const rel = (lados[0] + lados[2] > lados[1] + lados[3] ? (lados[0] + lados[2]) / (lados[1] + lados[3]) : (lados[1] + lados[3]) / (lados[0] + lados[2]));
      if (rect < 0.86 || rect > 1.08 || rel < 1.12 || rel > 1.8 || deforme(Q)) continue; /* (16-10: un folio pegado a una mancha clara del fondo daba un cuadrilátero torcido que ganaba por área) */
      const nota = area * rect * (1 - Math.min(0.8, Math.abs(Math.log(rel / Math.SQRT2)) * 1.5));
      if (!mejor || nota > mejor.nota) mejor = { nota, Q, T, rect }; }
  }
  if (!mejor) return null;
  // del pequeño a la foto entera (centro del píxel reducido) y AFINAR cada lado con su borde de verdad (si al afinar sale torcido, se queda el de antes)
  const Q = mejor.Q.map(([i, j]) => [i * s + (s - 1) / 2, j * s + (s - 1) / 2]), A0 = afinaQuad(D, Q, 3 * s + 6), A = deforme(A0.quad) ? { quad: ordena(Q), puntos: 0 } : A0, quad = A.quad, puntos = A.puntos;
  const lado = (a, b) => Math.hypot(quad[b][0] - quad[a][0], quad[b][1] - quad[a][1]), apaisado = lado(0, 1) + lado(2, 3) > lado(1, 2) + lado(3, 0);
  return { quad, ancho: apaisado ? FOLIO[1] : FOLIO[0], alto: apaisado ? FOLIO[0] : FOLIO[1], conf: puntos >= 120 ? 'alta' : 'media', puntos, umbral: mejor.T, relleno: +mejor.rect.toFixed(3) };
}
// AFINAR 4 esquinas aproximadas (las de la búsqueda o las que se han puesto a mano) al borde DE VERDAD del papel: cada lado se busca a lo
// largo de su perpendicular (± R px, en la foto entera) donde lo claro de dentro pasa a lo oscuro de fuera, se ajusta una recta y las
// esquinas son los cortes de las rectas. Un lado sin borde claro se queda como estaba. → { quad, puntos, lados (cuántos lados afinados) }
export function afinaQuad(D, Q, R = 9) {
  const W = D.width, H = D.height, px = D.data; Q = ordena(Q);
  const lum = (x, y) => { if (x < 0 || y < 0 || x >= W - 1 || y >= H - 1) return null; const xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, o = (yi * W + xi) * 4, v = k => 0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2];
    return (v(o) * (1 - fx) + v(o + 4) * fx) * (1 - fy) + (v(o + W * 4) * (1 - fx) + v(o + W * 4 + 4) * fx) * fy; };
  const cx = Q.reduce((a, p) => a + p[0], 0) / 4, cy = Q.reduce((a, p) => a + p[1], 0) / 4;
  let puntos = 0, lados = 0; const lineas = Q.map((P, k) => { const B = Q[(k + 1) % 4], dx = B[0] - P[0], dy = B[1] - P[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len; let nx = -uy, ny = ux;
    const mx = (P[0] + B[0]) / 2, my = (P[1] + B[1]) / 2; if ((cx - mx) * nx + (cy - my) * ny > 0) { nx = -nx; ny = -ny; } /* (n apunta hacia FUERA del folio) */
    // los puntos del borde a lo largo del lado, buscando ± r; si con r no salen (una esquina puesta lejos), se busca más ancho (2,5 r y 5 r)
    const busca = r => { const pts = [], paso = r > R ? r / 24 : 0.5;
      for (let m = 0; m <= 48; m++) { const t = 0.1 + 0.8 * m / 48, bx = P[0] + dx * t, by = P[1] + dy * t, perfil = [];
        for (let d = -r; d <= r; d += paso) { const v = lum(bx + nx * d, by + ny * d); if (v == null) { perfil.length = 0; break; } perfil.push(v); } if (perfil.length < 8) continue;
        const k4 = Math.max(2, Math.round(perfil.length / 8)), dentro = perfil.slice(0, k4).reduce((a, b) => a + b, 0) / k4, fuera = perfil.slice(-k4).reduce((a, b) => a + b, 0) / k4; if (dentro - fuera < 20) continue;
        const mitad = (dentro + fuera) / 2; let cruce = null; for (let q = perfil.length - 2; q >= 0; q--) if (perfil[q] >= mitad && perfil[q + 1] < mitad) { cruce = q + (perfil[q] - mitad) / (perfil[q] - perfil[q + 1]); break; } if (cruce == null) continue;
        const d = -r + cruce * paso; pts.push([bx + nx * d, by + ny * d]); }
      return pts; };
    let pts = busca(R); if (pts.length < 8) pts = busca(2.5 * R); if (pts.length < 8) pts = busca(5 * R);
    let Lr = recta(pts); if (Lr) { const res = pts.filter(p => Math.abs((p[0] - Lr.c[0]) * Lr.n[0] + (p[1] - Lr.c[1]) * Lr.n[1]) < 1.5); if (res.length >= 8) Lr = recta(res); puntos += res.length; }
    if (pts.length >= 8 && Lr) { lados++; return Lr; } return { c: [mx, my], n: [nx, ny] }; });
  let quad = lineas.map((l, k) => corta(lineas[(k + 3) % 4], l));
  if (quad.some(p => !p || !isFinite(p[0]) || Math.hypot(p[0] - cx, p[1] - cy) > 2 * Math.max(W, H))) { quad = Q; lados = 0; }
  return { quad: ordena(quad), puntos, lados };
}
// ¿un cuadrilátero que NO puede ser un folio visto con el móvil algo inclinado? (lados opuestos muy distintos o ángulos muy cerrados)
export function deforme(q) { q = ordena(q); const L = q.map((p, k) => Math.hypot(q[(k + 1) % 4][0] - p[0], q[(k + 1) % 4][1] - p[1])), op = Math.max(L[0] / L[2], L[2] / L[0], L[1] / L[3], L[3] / L[1]);
  const ang = q.map((p, k) => { const a = q[(k + 3) % 4], b = q[(k + 1) % 4], u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]]; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)))) * 180 / Math.PI; });
  return !(op <= 1.5) || Math.min(...ang) < 55 || Math.max(...ang) > 125; }
// las 4 esquinas en orden: arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda (y hacia ABAJO, como en la foto)
export function ordena(P) { const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length, A = P.slice().sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  let k0 = 0; A.forEach((p, k) => { if (p[0] + p[1] < A[k0][0] + A[k0][1]) k0 = k; }); return A.slice(k0).concat(A.slice(0, k0)); }
// orientación de las medidas del folio según cómo está en la foto (apaisado o de pie)
export function medidasFolio(quad) { const lado = (a, b) => Math.hypot(quad[b][0] - quad[a][0], quad[b][1] - quad[a][1]); return lado(0, 1) + lado(2, 3) > lado(1, 2) + lado(3, 0) ? [FOLIO[1], FOLIO[0]] : [FOLIO[0], FOLIO[1]]; }
function envolvente(P) { const A = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of A) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = A.length - 1; i >= 0; i--) { const p = A[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); }
// el cuadrilátero que mejor llena la envolvente: su diagonal más larga y, a cada lado, el punto más alejado de ella
function cuadri(Hh) { if (Hh.length < 4) return null; let a = 0, c = 0, dm = -1; for (let i = 0; i < Hh.length; i++) for (let j = i + 1; j < Hh.length; j++) { const d = (Hh[i][0] - Hh[j][0]) ** 2 + (Hh[i][1] - Hh[j][1]) ** 2; if (d > dm) { dm = d; a = i; c = j; } }
  const A = Hh[a], C = Hh[c], dist = p => (C[0] - A[0]) * (p[1] - A[1]) - (C[1] - A[1]) * (p[0] - A[0]); let b = null, d = null, bm = 0, dmn = 0;
  Hh.forEach(p => { const v = dist(p); if (v > bm) { bm = v; b = p; } if (v < dmn) { dmn = v; d = p; } }); if (!b || !d) return null; return [A, b, C, d]; }
const areaPol = P => { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return Math.abs(s / 2); };
// recta por mínimos cuadrados «de verdad» (perpendiculares): centro + normal
function recta(P) { if (P.length < 2) return null; let mx = 0, my = 0; P.forEach(p => { mx += p[0]; my += p[1]; }); mx /= P.length; my /= P.length; let sxx = 0, syy = 0, sxy = 0; P.forEach(p => { const x = p[0] - mx, y = p[1] - my; sxx += x * x; syy += y * y; sxy += x * y; });
  const t = 0.5 * Math.atan2(2 * sxy, sxx - syy); return { c: [mx, my], n: [-Math.sin(t), Math.cos(t)] }; }
function corta(l1, l2) { const [a1, b1] = l1.n, [a2, b2] = l2.n, c1 = a1 * l1.c[0] + b1 * l1.c[1], c2 = a2 * l2.c[0] + b2 * l2.c[1], det = a1 * b2 - a2 * b1; if (Math.abs(det) < 1e-9) return null; return [(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det]; }

// ---------- ENDEREZAR la foto con las 4 esquinas del folio (sin perspectiva, mm por píxel sabidos) ----------
// D = ImageData (o { data, width, height }) · quad = esquinas en la foto · an × al = lo que mide el folio así colocado (mm)
// → { data, width, height, mmPorPx, folio: [x0, y0, x1, y1] (el folio en la foto nueva, px) }. El marco es la foto entera enderezada
// (hasta 7 folios por cada lado: cabe una camiseta con las mangas abiertas, un pantalón largo o un vestido aunque el folio esté a un lado) y nunca con más detalle del que tiene la foto (no se inventa nada).
export function endereza(D, quad, an, al, o = {}) {
  const W0 = D.width, H0 = D.height, S = D.data, Hm = homografia(quad, [[0, 0], [an, 0], [an, al], [0, al]]), Hi = inversaH(Hm), max = o.max || 3000;
  const wDe = p => Hm[6] * p[0] + Hm[7] * p[1] + Hm[8], sg = Math.sign(wDe([(quad[0][0] + quad[2][0]) / 2, (quad[0][1] + quad[2][1]) / 2]));
  const lim = [-7 * an, -7 * al, 8 * an, 8 * al]; /* (16-10: con 4 folios la manga de una camiseta de 1 m quedaba cortada) */ let x0 = 0, y0 = 0, x1 = an, y1 = al;
  const ppmFoto = Math.max(Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]), Math.hypot(quad[2][0] - quad[3][0], quad[2][1] - quad[3][1])) / an;
  // el marco: lo que sale en la foto, menos lo que está tan LEJOS que se ve 3 veces más pequeño que el folio (borroso y enorme: no sirve
  // para medir y dejaría la foto enderezada sin detalle). 16-10: antes entraba hasta el horizonte y la foto útil quedaba en un rincón.
  const escLocal = m => { const a = aplicaH(Hi, m), b = aplicaH(Hi, [m[0] + 1, m[1]]), c = aplicaH(Hi, [m[0], m[1] + 1]); return Math.sqrt(Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))); };
  for (let j = 0; j <= 48; j++) for (let i = 0; i <= 48; i++) { const p = [i / 48 * W0, j / 48 * H0]; if (Math.sign(wDe(p)) !== sg) continue;
    const m = aplicaH(Hm, p); if (!(escLocal(m) >= 0.45 * ppmFoto)) continue; /* (16-10: 0,45 = lo que se ve más de 2 veces más pequeño que el folio no entra; con el marco de 7 folios, 0,33 dejaba la foto inclinada sin detalle) */ x0 = Math.min(x0, m[0]); y0 = Math.min(y0, m[1]); x1 = Math.max(x1, m[0]); y1 = Math.max(y1, m[1]); }
  x0 = Math.max(lim[0], x0); y0 = Math.max(lim[1], y0); x1 = Math.min(lim[2], x1); y1 = Math.min(lim[3], y1);
  const k = Math.min(ppmFoto, 2 * max / Math.max(x1 - x0, y1 - y0), max / Math.sqrt((x1 - x0) * (y1 - y0))), /* (16-10: el tope es de SUPERFICIE —3000 × 3000— y el lado largo hasta 6000: una foto inclinada sale apaisada y estrecha) */ W = Math.max(8, Math.round((x1 - x0) * k)), H = Math.max(8, Math.round((y1 - y0) * k)), O = new Uint8ClampedArray(W * H * 4);
  for (let j = 0; j < H; j++) { const my = y0 + (j + 0.5) / k; for (let i = 0; i < W; i++) { const mx = x0 + (i + 0.5) / k, w = Hi[6] * mx + Hi[7] * my + Hi[8], sx = (Hi[0] * mx + Hi[1] * my + Hi[2]) / w, sy = (Hi[3] * mx + Hi[4] * my + Hi[5]) / w, o4 = (j * W + i) * 4;
    if (!(sx >= 0 && sy >= 0 && sx < W0 - 1 && sy < H0 - 1)) { O[o4] = O[o4 + 1] = O[o4 + 2] = 255; O[o4 + 3] = 0; continue; }
    const xi = sx | 0, yi = sy | 0, fx = sx - xi, fy = sy - yi, a = (yi * W0 + xi) * 4, b = a + 4, c = a + W0 * 4, d = c + 4;
    for (let q = 0; q < 4; q++) O[o4 + q] = (S[a + q] * (1 - fx) + S[b + q] * fx) * (1 - fy) + (S[c + q] * (1 - fx) + S[d + q] * fx) * fy; } }
  return { data: O, width: W, height: H, mmPorPx: 1 / k, folio: [-x0 * k, -y0 * k, (an - x0) * k, (al - y0) * k] };
}

// ---------- la GUÍA: qué foto sirve (ella: «tips») ----------
export const GUIA = [
  { k: 'arriba', t: 'Desde arriba, el móvil paralelo al suelo', d: 'Súbete a una silla si hace falta. Torcida, lo de lejos sale más pequeño (el folio lo corrige, pero mejor recta).' },
  { k: 'plana', t: 'La prenda plana y estirada', d: 'Sin arrugas ni pliegues, las mangas abiertas hacia los lados, los bajos rectos. Una prenda por foto.' },
  { k: 'fondo', t: 'Fondo liso que contraste', d: 'Suelo o sábana de un color. Prenda clara → fondo oscuro; prenda oscura → fondo claro. Nada de baldosas con dibujo.' },
  { k: 'luz', t: 'Luz pareja, sin flash', d: 'De día junto a una ventana o con la luz del techo. Sin sombras fuertes ni la sombra del móvil encima.' },
  { k: 'folio', t: 'Un folio A4 al lado, entero', d: 'Plano, sin doblar ni tapar, separado un poco de la prenda: con él se calibra la foto (milímetros de verdad).' },
  { k: 'entera', t: 'Toda la prenda dentro, con margen', d: 'Que no se corte nada en los bordes de la foto. Mejor la foto entera que de cerca: la resolución del móvil sobra.' },
];
