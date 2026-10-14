// ================= 13-10-2026 · 🧾 TAPETE DE CALCO: calcar repuestos con precisión, sin regla y sin marcar nada =================
// La dueña: «mejora más la precisión o invierte más tiempo en diseñar otro mecanismo para mejorar calcar repuestos».
// Lo que más resta precisión al calcar desde una foto es: 1) la PERSPECTIVA (el móvil nunca está perfectamente paralelo), 2) la
// ESCALA (marcar a mano dos puntos de una regla: ±1–2 píxeles en cada uno) y 3) la ALTURA de la pieza (su cara de arriba está más
// cerca del móvil y sale más grande: con el móvil a 30 cm, una pieza de 10 mm de grueso sale un 3 % mayor).
// El tapete lo resuelve todo de una vez: una hoja (en papel, o impresa en la Bambu) con 8 MARCAS de medida conocida (cuadrado negro
// con un hueco blanco y un punto negro en medio: no se confunden con nada). Se pone la pieza dentro del recuadro, se hace la foto
// como salga y el programa:
//  · encuentra las marcas SOLO (sin tocar nada) y su centro con precisión de décimas de píxel;
//  · con las 8 (sobran 4) calcula cómo está la foto respecto al tapete y lo comprueba: lo que NO cuadra entre ellas es el error real
//    de esa foto, y se dice en mm («precisión ±0,08 mm»), sin inventar;
//  · ENDEREZA la foto (vista desde arriba) y la deja ya CALIBRADA (sabe cuántos mm es cada píxel);
//  · saca dónde estaba el móvil (altura y punto debajo) y, cuando sepas el grosor de la pieza, corrige el aumento de su cara de arriba.
// Todo con cuentas propias (homografía por mínimos cuadrados, pose de la cámara a partir de ella): sin internet ni librerías.

// ---------- los tapetes (mm) ----------
// m = lado de cada marca · marcas: [x, y, esEsquina] (el centro) · hm = altura de la cara de las marcas sobre la mesa (papel 0;
// el impreso las lleva 0,6 mm en relieve, en otro color)
const marcasDe = (W, H, m, extra) => { const a = m / 2, L = [[a, a, 1], [W - a, a, 1], [W - a, H - a, 1], [a, H - a, 1]]; extra.forEach(p => L.push([p[0], p[1], 0])); return L; };
export const TAPETES = {
  t170: { t: 'Tapete 170 × 170 mm (cabe en tus dos Bambu y en un folio)', W: 170, H: 170, m: 18, marcas: marcasDe(170, 170, 18, [[85, 9], [161, 85], [85, 161], [9, 85]]) },
  // 13-10-2026 (noche) · la dueña: «¿se puede hacer en la Svantto para tenerlo más pequeño?» (su impresora de etiquetas de 100 × 150).
  // OJO: la foto no dice el TAMAÑO de un tapete, solo cómo están puestas sus marcas. Uno igual que el de 170 pero encogido sería
  // indistinguible (y cualquier rectángulo con marcas en la MITAD de cada lado, también: de un rectángulo a un cuadrado se pasa
  // estirando, y la mitad sigue en la mitad). Por eso este lleva las marcas de los lados largos a 1/4 y a 3/4: ni el de 170 ni la hoja grande.
  etiqueta: { t: 'Tapete pequeño, para una etiqueta de 100 × 150 mm', W: 94, H: 144, m: 12, pag: [100, 150], marcas: marcasDe(94, 144, 12, [[6, 39], [6, 105], [88, 39], [88, 105]]) },
  folio: { t: 'Hoja de calco grande, en papel A4 (180 × 260 mm)', W: 180, H: 260, m: 18, marcas: marcasDe(180, 260, 18, [[90, 9], [171, 260 / 3 + 3], [171, 2 * 260 / 3 - 3], [90, 251], [9, 2 * 260 / 3 - 3], [9, 260 / 3 + 3]]) }
};
// 13-10-2026 (noche) · «la barra me mide 97 mm»: una impresora puede encoger (o estirar, y distinto a lo ancho que a lo largo, como las de
// etiquetas). El tapete MEDIDO: [ancho, largo] reales de borde a borde de las marcas → el mismo tapete con todo en su sitio de verdad.
export function medido(T, md) {
  if (!md || !(md[0] > 0) || !(md[1] > 0)) return T; const fx = md[0] / T.W, fy = md[1] / T.H; if (fx < 0.25 || fx > 1.6 || fy < 0.25 || fy > 1.6 || (Math.abs(fx - 1) < 0.0005 && Math.abs(fy - 1) < 0.0005)) return T;
  return Object.assign({}, T, { W: T.W * fx, H: T.H * fy, m: T.m * Math.sqrt(fx * fy), marcas: T.marcas.map(q => [q[0] * fx, q[1] * fy, q[2]]), escala: [fx, fy], nominal: [T.W, T.H] });
}
// el recuadro donde va la pieza (la línea de puntos) y lo que se recorta para trabajar (un poco por dentro de esa línea)
export const recuadro = T => ({ x0: T.m + 3, y0: T.m + 3, x1: T.W - T.m - 3, y1: T.H - T.m - 3 });
export const zonaTrabajo = T => ({ x0: T.m + 4.5, y0: T.m + 4.5, x1: T.W - T.m - 4.5, y1: T.H - T.m - 4.5 });
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');

// ---------- dibujarlo (para el papel, para la pantalla y para las pruebas) ----------
// g = contexto 2D ya colocado en mm (1 unidad = 1 mm) · fondo blanco · marcas · recuadro de puntos · reglilla de 100 mm para comprobar
export function dibuja(g, T, o = {}) {
  g.save(); g.fillStyle = o.fondo || '#ffffff'; g.fillRect(0, 0, T.W, T.H);
  T.marcas.forEach(([x, y]) => { const m = T.m; g.fillStyle = '#000'; g.fillRect(x - m / 2, y - m / 2, m, m); g.fillStyle = o.fondo || '#fff'; g.fillRect(x - 0.3 * m, y - 0.3 * m, 0.6 * m, 0.6 * m); g.fillStyle = '#000'; g.fillRect(x - 0.15 * m, y - 0.15 * m, 0.3 * m, 0.3 * m); });
  const R = recuadro(T); g.strokeStyle = '#9a9aa6'; g.lineWidth = 0.35; g.setLineDash([2.5, 2.5]); g.strokeRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); g.setLineDash([]);
  g.restore();
}

// ---------- el PDF para imprimirlo en papel, a TAMAÑO REAL (A4) ----------
// Un PDF hecho a mano (vector puro: cuadrados, líneas y letras Helvetica), para que al imprimirlo «a tamaño real / 100 %» las marcas
// midan exactamente lo que tienen que medir. Lleva una barra de 100 mm para comprobarlo con una regla.
export function pdfPapel(T) {
  const pt = 72 / 25.4, PW = T.pag ? T.pag[0] : 210, PH = T.pag ? T.pag[1] : 297, ox = (PW - T.W) / 2, oy = T.pag ? (PH - T.H) / 2 : T.H > 200 ? (PH - T.H) / 2 - 6 : 16, X = x => ((ox + x) * pt).toFixed(2), Y = y => ((PH - oy - y) * pt).toFixed(2);
  const c = [], rect = (x, y, w, h, gris) => c.push(gris + ' g ' + X(x) + ' ' + Y(y + h) + ' ' + (w * pt).toFixed(2) + ' ' + (h * pt).toFixed(2) + ' re f');
  const txt = (x, y, tam, s, gris = 0.15) => c.push('BT /F1 ' + tam + ' Tf ' + gris + ' g ' + X(x) + ' ' + Y(y) + ' Td (' + s.replace(/[\\()]/g, m => '\\' + m) + ') Tj ET');
  T.marcas.forEach(([x, y]) => { const m = T.m; rect(x - m / 2, y - m / 2, m, m, 0); rect(x - 0.3 * m, y - 0.3 * m, 0.6 * m, 0.6 * m, 1); rect(x - 0.15 * m, y - 0.15 * m, 0.3 * m, 0.3 * m, 0); });
  const R = recuadro(T); c.push((T.pag ? '0 G 0.5 w [4 5] 0 d ' : '0.6 G 0.8 w [5 5] 0 d ') + X(R.x0) + ' ' + Y(R.y1) + ' ' + ((R.x1 - R.x0) * pt).toFixed(2) + ' ' + ((R.y1 - R.y0) * pt).toFixed(2) + ' re S [] 0 d');
  // (nada escrito DENTRO del recuadro: en la foto se confundiría con la pieza; el rótulo va fuera, junto a la barra)
  // la barra de comprobación (100 mm) y las instrucciones, debajo
  // (el pequeño no tiene sitio para la barra: se comprueba midiendo el tapete entero, de borde a borde de los cuadrados; los rótulos van entre las marcas de arriba y de abajo)
  if (T.pag) { const x = T.m + 3; txt(x, 4.6, 6.5, 'CelebriDiseños · tapete pequeño'); txt(x, 8.4, 6.5, 'De borde a borde mide ' + T.W + ' × ' + T.H + ' mm'); txt(x, T.H - 7.4, 6.5, 'Imprime a TAMAÑO REAL (100 %)'); txt(x, T.H - 3.6, 6.5, 'Pieza dentro de la línea de puntos'); }
  const yb = T.H + 7; if (T.pag) { /* hecho */ } else if (oy + yb + 14 < PH) { rect(0, yb, 100, 1.2, 0); rect(0, yb - 2, 0.5, 5.2, 0); rect(99.5, yb - 2, 0.5, 5.2, 0); txt(0, yb + 7, 8, 'Esta barra mide 100 mm. Si no, imprime otra vez a TAMA\xd1O REAL (100 %, sin ajustar a la p\xe1gina).');
    txt(0, yb + 11.5, 8, 'Foto: la pieza dentro del recuadro y las ' + T.marcas.length + ' marcas a la vista. El programa hace el resto.'); txt(104, yb + 1.6, 7, 'CelebriDise\xf1os \xb7 tapete de calco ' + T.W + ' \xd7 ' + T.H + ' mm', 0.5); }
  else txt(0, -4, 7, 'Imprime a TAMA\xd1O REAL (100 %). Lado de cada marca: ' + T.m + ' mm.');
  const flujo = c.join('\n'), objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + (PW * pt).toFixed(2) + ' ' + (PH * pt).toFixed(2) + '] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + flujo.length + ' >>\nstream\n' + flujo + '\nendstream', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  let pdf = '%PDF-1.4\n', off = []; objs.forEach((o, i) => { off.push(pdf.length); pdf += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = pdf.length; pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + off.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  const u = new Uint8Array(pdf.length); for (let i = 0; i < pdf.length; i++) u[i] = pdf.charCodeAt(i) & 255; return u;
}

// ---------- el tapete para la Bambu (dos colores: la base y, desde 1,2 mm, las marcas en relieve) ----------
export const BASE3D = 1.2, RELIEVE3D = 0.6;
export function tapete3D(N, T, o = {}) {
  const MF = N.MF(), caja = (x0, y0, x1, y1, z0, z1) => MF.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]), L = [caja(0, 0, T.W, T.H, 0, BASE3D)], z1 = BASE3D + RELIEVE3D;
  T.marcas.forEach(([x, y]) => { const m = T.m; L.push(caja(x - m / 2, y - m / 2, x + m / 2, y + m / 2, BASE3D, z1).subtract(caja(x - 0.3 * m, y - 0.3 * m, x + 0.3 * m, y + 0.3 * m, BASE3D - 0.1, z1 + 0.1))); L.push(caja(x - 0.15 * m, y - 0.15 * m, x + 0.15 * m, y + 0.15 * m, BASE3D, z1)); });
  // (las marcas, giradas para la cama: y hacia arriba en el tapete = −y en la impresora; da igual, es simétrico por dentro)
  let m = N.union(L).translate([-T.W / 2, -T.H / 2, 0]); if (o.soloMarcas) m = m.intersect(caja(-T.W, -T.H, T.W, T.H, BASE3D, z1 + 1));
  return m;
}

// ---------- ENCONTRAR LAS MARCAS en una foto ----------
function grisDe(D) { const W = D.width, H = D.height, S = D.data, g = new Float32Array(W * H); for (let i = 0; i < W * H; i++) g[i] = S[i * 4 + 3] < 128 ? 255 : 0.299 * S[i * 4] + 0.587 * S[i * 4 + 1] + 0.114 * S[i * 4 + 2]; return { W, H, g }; }
function achica(G, lado) { const k = Math.min(1, lado / Math.max(G.W, G.H)); if (k >= 1) return { W: G.W, H: G.H, g: G.g, k: 1 };
  const w = Math.max(4, Math.round(G.W * k)), h = Math.max(4, Math.round(G.H * k)), g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const x0 = Math.floor(x / k), y0 = Math.floor(y / k), x1 = Math.max(x0 + 1, Math.min(G.W, Math.floor((x + 1) / k))), y1 = Math.max(y0 + 1, Math.min(G.H, Math.floor((y + 1) / k))); let s = 0, n = 0; for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { s += G.g[yy * G.W + xx]; n++; } g[y * w + x] = s / n; }
  return { W: w, H: h, g, k }; }
// componentes conexas de un mapa de 0/1 (las de 1 y las de 0), con quién toca a quién
function componentes(B, W, H) {
  const lab = new Int32Array(W * H).fill(-1), C = [], pila = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) { if (lab[i] >= 0) continue; const v = B[i], id = C.length, c = { v, a: 0, sx: 0, sy: 0, x0: W, y0: H, x1: 0, y1: 0, borde: false, vecs: [] }; C.push(c); let sp = 0; pila[sp++] = i; lab[i] = id;
    while (sp) { const j = pila[--sp], x = j % W, y = (j - x) / W; c.a++; c.sx += x; c.sy += y; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) c.borde = true;
      if (x > 0 && lab[j - 1] < 0 && B[j - 1] === v) { lab[j - 1] = id; pila[sp++] = j - 1; } if (x < W - 1 && lab[j + 1] < 0 && B[j + 1] === v) { lab[j + 1] = id; pila[sp++] = j + 1; }
      if (y > 0 && lab[j - W] < 0 && B[j - W] === v) { lab[j - W] = id; pila[sp++] = j - W; } if (y < H - 1 && lab[j + W] < 0 && B[j + W] === v) { lab[j + W] = id; pila[sp++] = j + W; } } }
  const toca = (a, b) => { const L = C[a].vecs; if (L.length < 6 && !L.includes(b)) L.push(b); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const j = y * W + x, a = lab[j]; if (x < W - 1 && lab[j + 1] !== a) { toca(a, lab[j + 1]); toca(lab[j + 1], a); } if (y < H - 1 && lab[j + W] !== a) { toca(a, lab[j + W]); toca(lab[j + W], a); } }
  return { lab, C };
}
// → [{ x, y (px de la foto), lado (px) }]: los centros de las marcas, finos
export function buscaMarcas(D, o = {}) {
  const G = grisDe(D), S = achica(G, o.lado || 1400), { W, H, g } = S;
  // gris de corte adaptado: la media de alrededor (imagen integral)
  const I = new Float64Array((W + 1) * (H + 1)); for (let y = 0; y < H; y++) { let f = 0; for (let x = 0; x < W; x++) { f += g[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + f; } }
  const r = Math.max(6, Math.round(Math.max(W, H) / 36)), B = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const xa = Math.max(0, x - r), ya = Math.max(0, y - r), xb = Math.min(W, x + r + 1), yb = Math.min(H, y + r + 1), m = (I[yb * (W + 1) + xb] - I[ya * (W + 1) + xb] - I[yb * (W + 1) + xa] + I[ya * (W + 1) + xa]) / ((xb - xa) * (yb - ya)); B[y * W + x] = g[y * W + x] < m - 12 ? 1 : 0; }
  const { C } = componentes(B, W, H), hijos = new Map();
  // (un componente rodeado por UNO solo es su «hijo»: el punto lo está por el hueco; el hueco, por el cuadrado… y por su punto)
  C.forEach((c, i) => { if (!c.borde && c.vecs.length === 1) { const L = hijos.get(c.vecs[0]) || []; L.push(i); hijos.set(c.vecs[0], L); } });
  const cand = [];
  C.forEach((h, iw) => { // h = el hueco blanco; su padre, el cuadrado negro; su hijo, el punto
    if (h.v !== 0 || h.borde || h.a < 6) return; const Lh = hijos.get(iw) || [], padres = h.vecs.filter(x => !Lh.includes(x)); if (Lh.length !== 1 || padres.length !== 1) return; const P = C[padres[0]], d = C[Lh[0]]; if (P.v !== 1 || d.v !== 1) return;
    const rw = h.a / P.a, ri = d.a / P.a, tot = P.a + h.a + d.a, cx = (P.sx + h.sx + d.sx) / tot, cy = (P.sy + h.sy + d.sy) / tot, dx = d.sx / d.a - cx, dy = d.sy / d.a - cy, lado = Math.sqrt(tot);
    const caja = (P.x1 - P.x0 + 1) * (P.y1 - P.y0 + 1); if (rw < 0.18 || rw > 0.9 || ri < 0.05 || ri > 0.4 || Math.hypot(dx, dy) > 0.12 * lado || tot / caja < 0.42 || lado < 7) return;
    cand.push({ x: cx, y: cy, lado, caja: [P.x0, P.y0, P.x1, P.y1] }); });
  // las de un tamaño parecido (lo que se aparta mucho de la mediana es otra cosa)
  const med = cand.map(c => c.lado).sort((a, b) => a - b)[Math.floor(cand.length / 2)] || 0;
  const buenas = cand.filter(c => c.lado > med * 0.45 && c.lado < med * 2.2);
  // el centro FINO, a la resolución de la foto: el centro del cuadrado relleno (todo lo que no se alcanza desde fuera por lo claro)
  return buenas.map(c => fino(G, c, S.k)).filter(Boolean);
}
function fino(G, c, k) {
  const m = 3, x0 = Math.max(0, Math.floor((c.caja[0] - m) / k)), y0 = Math.max(0, Math.floor((c.caja[1] - m) / k)), x1 = Math.min(G.W - 1, Math.ceil((c.caja[2] + m + 1) / k)), y1 = Math.min(G.H - 1, Math.ceil((c.caja[3] + m + 1) / k)), w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w < 4 || h < 4) return null; let mn = 255, mx = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const v = G.g[y * G.W + x]; if (v < mn) mn = v; if (v > mx) mx = v; }
  const t = (mn + mx) / 2, fuera = new Uint8Array(w * h), pila = [];
  for (let x = 0; x < w; x++) { pila.push(x, (h - 1) * w + x); } for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);
  while (pila.length) { const j = pila.pop(); if (fuera[j]) continue; const x = j % w, y = (j - x) / w; if (G.g[(y0 + y) * G.W + x0 + x] < t) continue; fuera[j] = 1; if (x > 0) pila.push(j - 1); if (x < w - 1) pila.push(j + 1); if (y > 0) pila.push(j - w); if (y < h - 1) pila.push(j + w); }
  // peso suave en el borde (cuánto del píxel es «negro»): el centro sale con décimas de píxel
  let s = 0, sx = 0, sy = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = y * w + x, v = G.g[(y0 + y) * G.W + x0 + x], cov = Math.max(0, Math.min(1, (mx - v) / Math.max(1, mx - mn))); let p = fuera[j] ? (cov > 0.15 ? cov : 0) : v < t ? cov : 1; if (!p) continue; s += p; sx += p * (x0 + x + 0.5); sy += p * (y0 + y + 0.5); }
  if (!s) return null; return { x: sx / s, y: sy / s, lado: Math.sqrt(s) };
}

// ---------- homografía por mínimos cuadrados (DLT normalizada) y lo que no cuadra ----------
function resuelve(A, b) { const n = b.length, M = A.map((f, i) => f.concat([b[i]])); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-14) return null; for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((f, i) => f[n] / f[i]); }
const normaliza = P => { let cx = 0, cy = 0; P.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= P.length; cy /= P.length; let d = 0; P.forEach(p => { d += Math.hypot(p[0] - cx, p[1] - cy); }); const s = Math.SQRT2 / (d / P.length || 1); return { T: [s, 0, -s * cx, 0, s, -s * cy, 0, 0, 1], f: p => [(p[0] - cx) * s, (p[1] - cy) * s] }; };
const mul = (A, B) => { const C = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j]; return C; };
export function inv3(H) { const [a, b, c, d, e, f, g, h, i] = H, A = e * i - f * h, B = -(d * i - f * g), Cc = d * h - e * g, det = a * A + b * B + c * Cc; if (Math.abs(det) < 1e-18) return null; return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, Cc / det, -(a * h - b * g) / det, (a * e - b * d) / det]; }
export const aplica = (H, p) => { const w = H[6] * p[0] + H[7] * p[1] + H[8]; return [(H[0] * p[0] + H[1] * p[1] + H[2]) / w, (H[3] * p[0] + H[4] * p[1] + H[5]) / w]; };
// pares [[mm], [px]] → H (mm → px)
export function homografiaLS(pares) {
  if (pares.length < 4) return null; const Nm = normaliza(pares.map(p => p[0])), Np = normaliza(pares.map(p => p[1])), AtA = Array.from({ length: 8 }, () => new Array(8).fill(0)), Atb = new Array(8).fill(0);
  pares.forEach(([a, b]) => { const [x, y] = Nm.f(a), [u, v] = Np.f(b); [[x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]].forEach(f => { for (let i = 0; i < 8; i++) { Atb[i] += f[i] * f[8]; for (let j = 0; j < 8; j++) AtA[i][j] += f[i] * f[j]; } }); });
  const h = resuelve(AtA, Atb); if (!h) return null; const Hn = h.concat([1]), Ti = inv3(Np.T); return mul(mul(Ti, Hn), Nm.T);
}
// ---------- dónde estaba el móvil (de la homografía, con la cámara «normal» de un móvil) ----------
// → { f (px), alto (mm, del móvil a la cara de las marcas), pie: [x, y] (mm, el punto del tapete justo debajo del móvil) }
export function pose(H, W, Hh) {
  const cx = W / 2, cy = Hh / 2, P = [H[0] - cx * H[6], H[1] - cx * H[7], H[2] - cx * H[8], H[3] - cy * H[6], H[4] - cy * H[7], H[5] - cy * H[8], H[6], H[7], H[8]];
  const h1 = [P[0], P[3], P[6]], h2 = [P[1], P[4], P[7]], h3 = [P[2], P[5], P[8]], L = Math.max(W, Hh); let f2 = [];
  if (Math.abs(h1[2] * h2[2]) > 1e-12) f2.push(-(h1[0] * h2[0] + h1[1] * h2[1]) / (h1[2] * h2[2]));
  if (Math.abs(h2[2] ** 2 - h1[2] ** 2) > 1e-12) f2.push((h1[0] ** 2 + h1[1] ** 2 - h2[0] ** 2 - h2[1] ** 2) / (h2[2] ** 2 - h1[2] ** 2));
  f2 = f2.filter(v => v > (0.45 * L) ** 2 && v < (2.2 * L) ** 2); const f = f2.length ? Math.sqrt(f2.reduce((s, v) => s + v, 0) / f2.length) : 0.8 * L, porF = !!f2.length;
  const k = v => [v[0] / f, v[1] / f, v[2]], a = k(h1), b = k(h2), t0 = k(h3), lam = 2 / (Math.hypot(...a) + Math.hypot(...b)); let r1 = a.map(x => x * lam), r2 = b.map(x => x * lam), t = t0.map(x => x * lam);
  if (t[2] < 0) { r1 = r1.map(x => -x); r2 = r2.map(x => -x); t = t.map(x => -x); }
  const r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const C = [-dot(r1, t), -dot(r2, t), -dot(r3, t)];
  return { f, deF: porF ? 'calculada' : 'supuesta', alto: Math.abs(C[2]), pie: [C[0], C[1]], inclinacion: Math.acos(Math.min(1, Math.abs(r3[2]))) * 180 / Math.PI };
}

// ---------- todo junto: la foto → el tapete que es, cómo está, y lo bien que cuadra ----------
// D = ImageData de la foto · o.tapete (clave) si se sabe · → null o { tapete, T, H (mm→px), Hi, n, err (mm, media), errMax, pose, puntos }
export function buscaTapete(D, o = {}) {
  const M = buscaMarcas(D, o); if (M.length < 4) return null;
  // las 4 esquinas: el cuadrilátero de más área con 4 de las marcas
  const areaQ = q => { let s = 0; for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; };
  let mejorQ = null, aQ = 0; const n = Math.min(M.length, 12);
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) { const P = [M[a], M[b], M[c], M[d]], cx = (P[0].x + P[1].x + P[2].x + P[3].x) / 4, cy = (P[0].y + P[1].y + P[2].y + P[3].y) / 4; P.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx)); const ar = areaQ(P); if (ar > aQ) { aQ = ar; mejorQ = P; } }
  if (!mejorQ) return null;
  const claves = o.tapete && TAPETES[o.tapete] ? [o.tapete] : Object.keys(TAPETES); let mejor = null;
  for (const clave of claves) { const T = medido(TAPETES[clave], o.medido && o.medido[clave]), esq = T.marcas.filter(m => m[2]); // (o.medido: { clave: [ancho, largo] } = lo que mide el suyo impreso)
    for (let r = 0; r < 4; r++) { // a qué esquina del tapete va cada esquina de la foto (girando)
      const H4 = homografiaLS(mejorQ.map((p, i) => [esq[(i + r) % 4], [p.x, p.y]])); if (!H4) continue;
      // cada marca del tapete, a la foto: ¿hay una marca de verdad cerca?
      const pares = []; let lejos = 0; for (const m of T.marcas) { const q = aplica(H4, m), cerca = M.reduce((b, p) => { const d = Math.hypot(p.x - q[0], p.y - q[1]); return d < b.d ? { d, p } : b; }, { d: Infinity }); if (cerca.p && cerca.d < cerca.p.lado * 0.6) pares.push([[m[0], m[1]], [cerca.p.x, cerca.p.y]]); else lejos++; }
      if (pares.length < 4) continue; const H = homografiaLS(pares); if (!H) continue; const Hi = inv3(H);
      const errs = pares.map(([mm, px]) => { const q = aplica(Hi, px); return Math.hypot(q[0] - mm[0], q[1] - mm[1]); }), err = errs.reduce((s, v) => s + v, 0) / errs.length, errMax = Math.max(...errs);
      const nota = pares.length * 10 - err * 4 - lejos * 3; if (!mejor || nota > mejor.nota) mejor = { nota, tapete: clave, T, H, Hi, n: pares.length, err, errMax, pares, sobran: pares.length - 4 }; } }
  if (!mejor) return null;
  // con 4 marcas no hay comprobación posible (cuadran siempre): se dice
  mejor.comprobado = mejor.n > 4; mejor.pose = pose(mejor.H, D.width, D.height); mejor.marcasFoto = M.length;
  // la precisión que se puede prometer: lo que no cuadra entre las marcas + lo que mide un píxel de la foto en el tapete
  const J = jac(mejor.Hi, aplica(mejor.H, [mejor.T.W / 2, mejor.T.H / 2])); mejor.mmPorPxFoto = J; mejor.precision = Math.max(mejor.comprobado ? mejor.errMax : 0.25, J * 0.5);
  delete mejor.nota; return mejor;
}
const jac = (Hi, p) => { const a = aplica(Hi, p), b = aplica(Hi, [p[0] + 1, p[1]]), c = aplica(Hi, [p[0], p[1] + 1]); return Math.sqrt(Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))); };

// ---------- ENDEREZAR: la zona de trabajo vista desde arriba, ya calibrada ----------
// im = imagen (HTMLImage o canvas) · R = buscaTapete · → { canvas, mmPorPx, zona } (el canvas: (0,0) = esquina de la zona de trabajo)
export function endereza(im, R, o = {}) {
  const Wf = im.naturalWidth || im.width, Hf = im.naturalHeight || im.height, Z = zonaTrabajo(R.T), wmm = Z.x1 - Z.x0, hmm = Z.y1 - Z.y0;
  let ppm = o.ppm || Math.min(12, Math.max(4, 1 / R.mmPorPxFoto)); const max = o.max || 2600; if (Math.max(wmm, hmm) * ppm > max) ppm = max / Math.max(wmm, hmm);
  const W = Math.round(wmm * ppm), H = Math.round(hmm * ppm), c0 = document.createElement('canvas'); c0.width = Wf; c0.height = Hf; const g0 = c0.getContext('2d', { willReadFrequently: true }); g0.drawImage(im, 0, 0); const S = g0.getImageData(0, 0, Wf, Hf).data;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), out = g.createImageData(W, H), O = out.data;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const [sx, sy] = aplica(R.H, [Z.x0 + (i + 0.5) / ppm, Z.y0 + (j + 0.5) / ppm]), oo = (j * W + i) * 4;
    if (!(sx >= 0 && sy >= 0 && sx < Wf - 1 && sy < Hf - 1)) { O[oo] = O[oo + 1] = O[oo + 2] = 255; O[oo + 3] = 255; continue; }
    const xi = Math.floor(sx), yi = Math.floor(sy), fx = sx - xi, fy = sy - yi, a = (yi * Wf + xi) * 4, b = a + 4, c = a + Wf * 4, d = c + 4;
    for (let q = 0; q < 3; q++) O[oo + q] = (S[a + q] * (1 - fx) + S[b + q] * fx) * (1 - fy) + (S[c + q] * (1 - fx) + S[d + q] * fx) * fy; O[oo + 3] = 255; }
  // LA PIEZA TIENE GROSOR (o.alto, mm desde la mesa; o.hm = altura de las marcas): su cara de arriba se ve más grande y CORRIDA,
  // alejándose del punto que hay debajo del móvil (F), y por el lado de cerca se ven sus paredes. Lo que se ve (S) es la cara de
  // abajo (B) más la de arriba proyectada: S = B ∪ σ(B), con σ(X) = F + s·(X − F) y s = altura del móvil / (altura − grosor).
  // Entonces B = S ∩ σ⁻¹(S): un punto es pieza si lo es él Y su imagen por σ. En la foto: de los dos, se queda el que más se
  // parece al FONDO (así vale para piezas oscuras sobre claro y al revés, sin saber cuál es).
  let alto = 0, s = 1; if (o.alto > 0 && R.pose) { const h = R.pose.alto, t = o.alto - (o.hm || 0); if (h > t * 3) { s = h / (h - t); alto = o.alto; } }
  if (s > 1.0005) { const fondo = (() => { const L = []; for (let i = 0; i < W; i += 3) { L.push(O[i * 4 + 1], O[((H - 1) * W + i) * 4 + 1]); } for (let j = 0; j < H; j += 3) { L.push(O[(j * W) * 4 + 1], O[(j * W + W - 1) * 4 + 1]); } L.sort((a, b) => a - b); return L[L.length >> 1]; })();
    const F = R.pose.pie, N2 = new Uint8ClampedArray(O);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const X = Z.x0 + (i + 0.5) / ppm, Y = Z.y0 + (j + 0.5) / ppm, qx = (F[0] + s * (X - F[0]) - Z.x0) * ppm - 0.5, qy = (F[1] + s * (Y - F[1]) - Z.y0) * ppm - 0.5, oo = (j * W + i) * 4;
      let v2; if (qx < 0 || qy < 0 || qx >= W - 1 || qy >= H - 1) v2 = [fondo, fondo, fondo]; else { const xi = Math.floor(qx), yi = Math.floor(qy), fx = qx - xi, fy = qy - yi, a = (yi * W + xi) * 4, b = a + 4, c = a + W * 4, d = c + 4; v2 = [0, 1, 2].map(q => (O[a + q] * (1 - fx) + O[b + q] * fx) * (1 - fy) + (O[c + q] * (1 - fx) + O[d + q] * fx) * fy); }
      if (Math.abs(v2[1] - fondo) < Math.abs(O[oo + 1] - fondo)) { N2[oo] = v2[0]; N2[oo + 1] = v2[1]; N2[oo + 2] = v2[2]; } }
    out.data.set(N2); }
  g.putImageData(out, 0, 0);
  return { canvas: cv, mmPorPx: 1 / ppm, zona: Z, W, H, corregidaAlto: alto, aumento: s };
}
// el aumento de la cara de arriba de una pieza de grosor «alto» (mm, desde la mesa): lo que hay que multiplicar a sus medidas
// (hm = altura de la cara de las marcas sobre la mesa: papel 0, el impreso 0,6) · alto = 0 → 1
export function correccionAltura(R, alto, hm = 0) { if (!R || !R.pose || !(alto > 0)) return 1; const h = R.pose.alto, t = alto - hm; if (!(h > t * 3)) return 1; return (h - t) / h; }
export function resumen(R, hm = 0) {
  if (!R) return 'No veo el tapete (hacen falta al menos 4 de sus marcas a la vista).';
  return (R.T && R.T.escala ? 'Con TU medida del tapete (' + n2(R.T.W) + ' × ' + n2(R.T.H) + ' mm). ' : '') + (R.comprobado ? 'Tapete encontrado: ' + R.n + ' marcas, cuadran entre sí a ±' + n2(R.errMax) + ' mm' : 'Tapete encontrado con 4 marcas (sin comprobación: saca todas en la foto)') + ' · precisión de esta foto ≈ ±' + n2(R.precision) + ' mm · el móvil estaba a ' + Math.round(R.pose.alto / 10) + ' cm' + (R.pose.inclinacion > 3 ? ', inclinado ' + Math.round(R.pose.inclinacion) + '°' : ', recto') + '.' + (R.pose.inclinacion > 12 ? ' Para los AGUJEROS de una pieza gruesa, mejor otra foto desde justo encima: así inclinada, la pared tapa parte del agujero.' : '');
}
