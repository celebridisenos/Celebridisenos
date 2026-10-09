// ================= v18 · 🧊 CelebriR8 · EL MOTOR =================
// Lo pidió la dueña (9-10-2026): «un Fusion dentro de mi programa pero más fácil, con cosas ya hechas (cajas, engranajes,
// figuras, moldes…) y que pueda editar un STL de verdad para cambiar el nombre o una parte. Que se llame CelebriR8».
//
// Cómo está hecho (para que sea FÁCIL y salgan piezas que se imprimen bien):
//  · Toda pieza es una pila de CAPAS: una forma plana (con sus agujeros) que sube de una altura a otra. Una caja es un suelo
//    y, encima, un marco; un llavero es una placa y, encima, las letras.
//  · Las formas exactas (cajas, círculos, engranajes) se calculan con geometría. Las «libres» (letras, emojis, una imagen) se
//    DIBUJAN en un lienzo del navegador y se les saca el contorno (un punto cada ~0,07 mm): así cualquier letra del
//    ordenador, cualquier dibujo y cualquier resta («este bloque MENOS esta figura») sale sin fórmulas.
//  · Cada capa se convierte en una malla cerrada (tapa de arriba, tapa de abajo y paredes) con earcut.
//  · Un STL que ya existe se puede escalar, cortar por una altura (con su tapa) y ponerle encima un parche y un nombre nuevo.
// Todo se calcula en este aparato: no sale nada a ningún sitio. Medidas siempre en milímetros.
import earcut from '../../vendor/earcut/earcut.js';

export const CAMA = 256; // lado máximo que cabe en las impresoras del taller (mm)
// ENCAJES: la holgura que se deja POR CADA LADO entre dos piezas que encajan. Son los valores que la dueña ha comprobado en
// sus Bambu (9-10-2026): «0,05 encaja pero con fuerza · 0,10 encaja · 0,15 gira bien».
export const ENCAJES = { presion: 0.05, justo: 0.10, gira: 0.15 };
const hol = p => (ENCAJES[p && p.encaje] !== undefined ? ENCAJES[p.encaje] : ENCAJES.justo);
// Cada impresora y cada filamento tienen su punto. Con la plantilla «Prueba de holgura» se mide de verdad y se guardan aquí
// los tres valores de ESTE taller (la pantalla los recuerda en el aparato). Entre 0 y 0,6 mm por lado.
export function ponEncajes(o) { ['presion', 'justo', 'gira'].forEach(k => { const v = Number(String(o && o[k]).replace(',', '.')); if (isFinite(v) && v >= 0 && v <= 0.6) ENCAJES[k] = Math.round(v * 100) / 100; }); return ENCAJES; }
// Medidas que SÍ son un estándar (comprobadas el 9-10-2026): monedas de euro (BCE) y manillares de moto.
export const MONEDAS = { '1': [23.25, 2.33, '1 €'], '2': [25.75, 2.2, '2 €'] }; // diámetro y grosor, mm
export const MANILLARES = [[22.2, '22,2 mm (7/8"): el normal, y la zona de los puños'], [25.4, '25,4 mm (1")'], [28.6, '28,6 mm (manillar grueso, en el centro)']];
const U = 127.5, PPM = 14, LADO = 1900;

// ---------- polígonos ----------
const areaR = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return s / 2; }; // > 0: antihorario
const dentro = (p, r) => { let d = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) d = !d; } return d; };
const orienta = (r, antih) => ((areaR(r) > 0) === antih ? r : r.slice().reverse());
export const pol = (ext, ...huecos) => ({ ext: orienta(ext, true), huecos: huecos.filter(h => h && h.length > 2).map(h => orienta(h, false)) });
export function circulo(r, cx = 0, cy = 0, n) { n = n || Math.max(28, Math.min(200, Math.round(r * 5 + 18))); const o = []; for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; }
export function rectR(w, h, r = 0, cx = 0, cy = 0) {
  r = Math.max(0, Math.min(r, w / 2 - 0.01, h / 2 - 0.01));
  if (r < 0.05) return [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
  const o = [], n = Math.max(5, Math.round(r * 2 + 5));
  [[w / 2 - r, h / 2 - r], [-w / 2 + r, h / 2 - r], [-w / 2 + r, -h / 2 + r], [w / 2 - r, -h / 2 + r]].forEach(([x, y], k) => { for (let i = 0; i <= n; i++) { const a = (k + i / n) * Math.PI / 2; o.push([cx + x + r * Math.cos(a), cy + y + r * Math.sin(a)]); } });
  return o;
}
// Quita los puntos que no aportan (se separan de la línea menos que «tol»)
function rdp(L, tol) {
  const keep = new Uint8Array(L.length), st = [[0, L.length - 1]]; keep[0] = keep[L.length - 1] = 1;
  while (st.length) {
    const [a, b] = st.pop(), ax = L[a][0], ay = L[a][1], dx = L[b][0] - ax, dy = L[b][1] - ay, l2 = dx * dx + dy * dy || 1e-12; let mx = 0, k = -1;
    for (let i = a + 1; i < b; i++) { const t = Math.max(0, Math.min(1, ((L[i][0] - ax) * dx + (L[i][1] - ay) * dy) / l2)), ex = L[i][0] - ax - t * dx, ey = L[i][1] - ay - t * dy, d = ex * ex + ey * ey; if (d > mx) { mx = d; k = i; } }
    if (k >= 0 && mx > tol * tol) { keep[k] = 1; st.push([a, k], [k, b]); }
  }
  return L.filter((_, i) => keep[i]);
}
function simplifica(r, tol) {
  if (r.length < 8) return r;
  let far = 0, dm = -1; for (let i = 1; i < r.length; i++) { const d = (r[i][0] - r[0][0]) ** 2 + (r[i][1] - r[0][1]) ** 2; if (d > dm) { dm = d; far = i; } }
  return rdp(r.slice(0, far + 1), tol).slice(0, -1).concat(rdp(r.slice(far).concat([r[0]]), tol).slice(0, -1));
}
// Anillos sueltos → polígonos con sus agujeros (el que está dentro de otro es su agujero; dentro de un agujero, otra pieza)
function anidar(anillos, areaMin) {
  const R = anillos.filter(r => r.length >= 3 && Math.abs(areaR(r)) > areaMin).map(r => ({ r, a: Math.abs(areaR(r)), padre: null, prof: 0, p: null })).sort((p, q) => q.a - p.a), pols = [];
  R.forEach((x, i) => { for (let j = i - 1; j >= 0; j--) if (dentro(x.r[0], R[j].r)) { x.padre = R[j]; x.prof = R[j].prof + 1; break; } });
  R.forEach(x => { if (x.prof % 2 === 0) { x.p = pol(x.r); pols.push(x.p); } else if (x.padre && x.padre.p) x.padre.p.huecos.push(orienta(x.r, false)); });
  return pols;
}
// Une trocitos sueltos (cada punto toca a otros dos) en anillos cerrados
function encadena(ady, punto) {
  const visto = new Set(), anillos = [];
  for (const ini of ady.keys()) {
    if (visto.has(ini)) continue;
    const r = []; let prev = null, cur = ini, ok = true;
    for (;;) { visto.add(cur); r.push(punto(cur)); const v = ady.get(cur); if (!v || v.length !== 2) { ok = false; break; } const nx = v[0] === prev ? v[1] : v[0]; prev = cur; cur = nx; if (cur === ini) break; if (visto.has(cur)) { ok = false; break; } }
    if (ok && r.length >= 3) anillos.push(r);
  }
  return anillos;
}

// ---------- del dibujo al contorno ----------
// d = los puntos del lienzo (RGBA); se mira solo cuánto de «lleno» está cada uno. Devuelve polígonos en mm (centro en 0,0; +Y arriba)
export function trazar(d, W, H, ppm) {
  const ady = new Map(), W4 = W * 4, une = (a, b) => { let l = ady.get(a); if (!l) ady.set(a, l = []); l.push(b); l = ady.get(b); if (!l) ady.set(b, l = []); l.push(a); };
  for (let y = 0; y < H - 1; y++) {
    let o = y * W4 + 3;
    for (let x = 0; x < W - 1; x++, o += 4) {
      const tl = d[o], tr = d[o + 4], bl = d[o + W4], br = d[o + W4 + 4], k = (tl > U ? 8 : 0) | (tr > U ? 4 : 0) | (br > U ? 2 : 0) | (bl > U ? 1 : 0);
      if (!k || k === 15) continue;
      const T = 2 * (y * W + x), B = T + 2 * W, L = T + 1, R = T + 3, medio = (tl + tr + br + bl) / 4 > U;
      if (k === 1 || k === 14) une(L, B); else if (k === 2 || k === 13) une(B, R); else if (k === 3 || k === 12) une(L, R); else if (k === 4 || k === 11) une(T, R);
      else if (k === 6 || k === 9) une(T, B); else if (k === 7 || k === 8) une(T, L);
      else if (k === 5) { if (medio) { une(T, L); une(B, R); } else { une(T, R); une(L, B); } }
      else { if (medio) { une(T, R); une(L, B); } else { une(T, L); une(B, R); } }
    }
  }
  const punto = id => { const v = id & 1, q = id >> 1, x = q % W, y = (q - x) / W, a = d[(y * W + x) * 4 + 3], b = v ? d[((y + 1) * W + x) * 4 + 3] : d[(y * W + x + 1) * 4 + 3], t = (U - a) / (b - a);
    return [((v ? x : x + t) + 0.5 - W / 2) / ppm, (H / 2 - (v ? y + t : y) - 0.5) / ppm]; };
  return anidar(encadena(ady, punto).map(r => simplifica(r, 0.42 / ppm)), 3 / (ppm * ppm));
}
// Dibuja con «pinta(g)» (en mm, centro en 0,0, +Y arriba; negro = material) y devuelve su contorno
export function forma(ancho, alto, pinta) {
  const m = 1.5, ppm = Math.min(PPM, LADO / (Math.max(ancho, alto) + 2 * m)), W = Math.ceil((ancho + 2 * m) * ppm) + 4, H = Math.ceil((alto + 2 * m) * ppm) + 4;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  g.setTransform(ppm, 0, 0, -ppm, W / 2, H / 2); g.fillStyle = g.strokeStyle = '#000'; g.lineJoin = g.lineCap = 'round';
  pinta(g);
  return trazar(g.getImageData(0, 0, W, H).data, W, H, ppm);
}
export function trazaPols(g, pols, conHuecos = true) {
  const anillo = r => { r.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); };
  g.beginPath(); pols.forEach(p => { anillo(p.ext); if (conHuecos) p.huecos.forEach(anillo); });
}
// La silueta rellena (sin agujeros), engordada «d» mm por todos lados
function gruesa(g, pols, d) { const una = () => { trazaPols(g, pols, false); g.fill(); }; for (let i = 0; d > 0 && i < 28; i++) { const a = i / 28 * 2 * Math.PI; g.save(); g.translate(d * Math.cos(a), d * Math.sin(a)); una(); g.restore(); } una(); }

// ---------- letras ----------
export const FUENTES = {
  gorda: ['Gorda', '900 {t}px "Arial Black", "Segoe UI Black", Impact, Arial, sans-serif'], redonda: ['Redonda', '700 {t}px "Segoe UI", "Arial Rounded MT Bold", Arial, sans-serif'],
  cursiva: ['Cursiva', '700 {t}px "Segoe Script", "Brush Script MT", "Comic Sans MS", cursive'], clasica: ['Clásica', '700 {t}px Georgia, "Times New Roman", serif'], estrecha: ['Estrecha', '400 {t}px Impact, "Arial Narrow", sans-serif']
};
let MED = null;
// Un texto de «alto» mm de altura REAL (de lo más alto a lo más bajo de sus letras). → { w, h, pinta(g, cx, cy, { espejo, borde }) }
export function texto(txt, fuente, alto) {
  MED = MED || document.createElement('canvas').getContext('2d');
  const F = (FUENTES[fuente] || FUENTES.gorda)[1]; MED.font = F.replace('{t}', 100);
  const m = MED.measureText(txt), asc = m.actualBoundingBoxAscent || 72, des = m.actualBoundingBoxDescent || 0, izq = m.actualBoundingBoxLeft || 0, der = m.actualBoundingBoxRight || m.width || 50;
  const k = alto / Math.max(1, asc + des), w = Math.max(0.5, (izq + der) * k);
  return { w, h: alto, pinta(g, cx = 0, cy = 0, o = {}) {
    g.save(); g.translate(cx, cy); g.scale(o.espejo ? -1 : 1, -1); g.font = F.replace('{t}', (100 * k).toFixed(3)); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const x = (izq - der) / 2 * k, y = (asc - des) / 2 * k;
    if (o.borde > 0) { g.lineWidth = o.borde * 2; g.strokeText(txt, x, y); } g.fillText(txt, x, y); g.restore(); } };
}
// La figura de una herramienta: una imagen (ya pasada a silueta) o un texto/emoji, de «ancho» mm
function figuraDe(p) {
  if (p.mask && p.mask.width) { const w = p.ancho, h = w * p.mask.height / p.mask.width; return { w, h, pinta(g, cx = 0, cy = 0, o = {}) { g.save(); g.translate(cx, cy); g.scale(o.espejo ? -1 : 1, -1); g.drawImage(p.mask, -w / 2, -h / 2, w, h); g.restore(); } }; }
  const t0 = texto(p.texto || '❤', p.fuente, 10); return texto(p.texto || '❤', p.fuente, 10 * p.ancho / t0.w);
}

// El contorno de la figura, ajustado para que mida EXACTAMENTE «ancho» mm (cada letra o emoji trae su propio margen) → { pols, w, h }
function siluetaDe(p) {
  const F = figuraDe(p), S = forma(F.w, F.h, g => F.pinta(g)); if (!S.length) mal('No se ve ninguna figura. Prueba con otra.');
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; S.forEach(P => P.ext.forEach(q => { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }));
  const k = p.ancho / (x1 - x0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a = r => r.map(q => [(q[0] - cx) * k, (q[1] - cy) * k]);
  return { pols: S.map(P => ({ ext: a(P.ext), huecos: P.huecos.map(a) })), w: p.ancho, h: (y1 - y0) * k };
}

// ---------- de la forma plana a la pieza ----------
function tapa(pols, z, arriba, out) {
  pols.forEach(p => {
    const d = [], hi = []; p.ext.forEach(q => d.push(q[0], q[1])); p.huecos.forEach(h => { hi.push(d.length / 2); h.forEach(q => d.push(q[0], q[1])); });
    const t = earcut(d, hi, true); // true: la tapa usa TODOS los puntos del contorno (los mismos que las paredes)
    // todos los triángulos de earcut giran igual: se mira el giro del conjunto (no el de cada uno: los hay finísimos, casi sin
    // área, que hacen falta para que la tapa case punto por punto con las paredes) y se les da la vuelta a todos si toca
    let giro = 0; for (let i = 0; i < t.length; i += 3) { const a = t[i] * 2, b = t[i + 1] * 2, c = t[i + 2] * 2; giro += (d[b] - d[a]) * (d[c + 1] - d[a + 1]) - (d[c] - d[a]) * (d[b + 1] - d[a + 1]); }
    const vuelta = (giro > 0) !== arriba;
    for (let i = 0; i < t.length; i += 3) { const a = t[i] * 2, b = t[i + (vuelta ? 2 : 1)] * 2, c = t[i + (vuelta ? 1 : 2)] * 2; out.push(d[a], d[a + 1], z, d[b], d[b + 1], z, d[c], d[c + 1], z); }
  });
  return out;
}
export function prisma(pols, z0, z1, out = []) {
  if (!(z1 > z0)) return out;
  tapa(pols, z1, true, out); tapa(pols, z0, false, out);
  pols.forEach(p => [p.ext].concat(p.huecos).forEach(r => { for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; out.push(a[0], a[1], z0, b[0], b[1], z0, b[0], b[1], z1, a[0], a[1], z0, b[0], b[1], z1, a[0], a[1], z1); } }));
  return out;
}
export const malla = (...partes) => { let n = 0; partes.forEach(p => { n += p.length; }); const o = new Float32Array(n); let k = 0; partes.forEach(p => { o.set(p, k); k += p.length; }); return o; };
export function mover(p, dx, dy, dz) { const o = new Float32Array(p.length); for (let i = 0; i < p.length; i += 3) { o[i] = p[i] + dx; o[i + 1] = p[i + 1] + dy; o[i + 2] = p[i + 2] + dz; } return o; }
export function escalar(p, sx, sy, sz) { const o = new Float32Array(p.length), inv = sx * sy * sz < 0, ord = inv ? [0, 2, 1] : [0, 1, 2]; for (let i = 0; i < p.length; i += 9) for (let v = 0; v < 3; v++) { const s = i + v * 3, d = i + ord[v] * 3; o[d] = p[s] * sx; o[d + 1] = p[s + 1] * sy; o[d + 2] = p[s + 2] * sz; } return o; }
// Gira 90°: lo que miraba hacia arriba pasa a mirar al frente (para poner letras en la cara de delante)
export function tumbar(p) { const o = new Float32Array(p.length); for (let i = 0; i < p.length; i += 3) { o[i] = p[i]; o[i + 1] = -p[i + 2]; o[i + 2] = p[i + 1]; } return o; }
export function medidas(p) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; let vol = 0, area = 0;
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8];
    for (let k = 0; k < 9; k++) { const v = p[i + k], e = k % 3; if (v < mn[e]) mn[e] = v; if (v > mx[e]) mx[e] = v; }
    vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az; area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return { min: mn, max: mx, dims: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], vol: Math.abs(vol) / 6, area, triangulos: p.length / 9 };
}
// Aristas que no casan con otra (0 = la malla está bien cerrada). Para las pruebas.
export function abierta(p) {
  const m = new Map(), k = i => Math.round(p[i] * 2000) + ',' + Math.round(p[i + 1] * 2000) + ',' + Math.round(p[i + 2] * 2000);
  for (let i = 0; i < p.length; i += 9) { const a = k(i), b = k(i + 3), c = k(i + 6); if (a === b || b === c || a === c) continue; [[a, b], [b, c], [c, a]].forEach(([u, v]) => { const bw = v + '>' + u; if (m.get(bw) > 0) m.set(bw, m.get(bw) - 1); else m.set(u + '>' + v, (m.get(u + '>' + v) || 0) + 1); }); }
  let n = 0; m.forEach(v => { n += v; }); return n;
}
export function stlBinario(p, nombre) {
  const n = p.length / 9, buf = new ArrayBuffer(84 + n * 50), dv = new DataView(buf), cab = new TextEncoder().encode('CelebriR8 ' + String(nombre || '').replace(/[^\w .-]/g, '').slice(0, 60));
  new Uint8Array(buf, 0, 80).set(cab.subarray(0, 80)); dv.setUint32(80, n, true);
  for (let i = 0; i < n; i++) {
    const s = i * 9, o = 84 + i * 50, ux = p[s + 3] - p[s], uy = p[s + 4] - p[s + 1], uz = p[s + 5] - p[s + 2], vx = p[s + 6] - p[s], vy = p[s + 7] - p[s + 1], vz = p[s + 8] - p[s + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true);
    for (let j = 0; j < 9; j++) dv.setFloat32(o + 12 + j * 4, p[s + j], true);
  }
  return buf;
}
// Rebana una malla por la altura «zc»: los triángulos del lado que se queda (sin tapa) y el dibujo del corte (polígonos)
function rebana(p, zc, abajo) {
  const s = abajo ? 1 : -1, out = [], ady = new Map(), pts = new Map(), clave = q => Math.round(q[0] * 2000) + ',' + Math.round(q[1] * 2000);
  for (let i = 0; i < p.length; i += 9) {
    const v = [[p[i], p[i + 1], p[i + 2]], [p[i + 3], p[i + 4], p[i + 5]], [p[i + 6], p[i + 7], p[i + 8]]], d = v.map(q => (q[2] - zc) * s);
    if (d[0] <= 0 && d[1] <= 0 && d[2] <= 0) { out.push(...v[0], ...v[1], ...v[2]); continue; }
    if (d[0] > 0 && d[1] > 0 && d[2] > 0) continue;
    const pg = [], corte = [];
    for (let k = 0; k < 3; k++) { const a = v[k], b = v[(k + 1) % 3], da = d[k], db = d[(k + 1) % 3];
      if (da <= 0) pg.push(a);
      if ((da <= 0) !== (db <= 0)) { const t = da / (da - db), q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zc]; pg.push(q); corte.push(q); } }
    for (let k = 1; k < pg.length - 1; k++) out.push(...pg[0], ...pg[k], ...pg[k + 1]);
    if (corte.length === 2) { const ka = clave(corte[0]), kb = clave(corte[1]); if (ka !== kb) { pts.set(ka, corte[0]); pts.set(kb, corte[1]); (ady.get(ka) || ady.set(ka, []).get(ka)).push(kb); (ady.get(kb) || ady.set(kb, []).get(kb)).push(ka); } }
  }
  let cerrado = true; ady.forEach(v => { if (v.length !== 2) cerrado = false; });
  return { tri: out, pols: anidar(encadena(ady, k => [pts.get(k)[0], pts.get(k)[1]]), 1e-4), cerrado };
}
// Corta una malla por la altura «zc» y se queda con lo de abajo (o lo de arriba), cerrando el corte con su tapa
export function cortarZ(p, zc, abajo = true) { const r = rebana(p, zc, abajo); tapa(r.pols, zc, abajo, r.tri); const m = new Float32Array(r.tri); m.cerrado = r.cerrado; return m; }
// Girar la pieza para que otro eje haga de «alto» (para cortar de lado): 1 = (x,y,z)→(y,z,x) · 2 = (x,y,z)→(z,x,y). Uno deshace al otro.
export function rotar(p, k) { const o = new Float32Array(p.length); for (let i = 0; i < p.length; i += 3) { if (k === 1) { o[i] = p[i + 1]; o[i + 1] = p[i + 2]; o[i + 2] = p[i]; } else { o[i] = p[i + 2]; o[i + 1] = p[i]; o[i + 2] = p[i + 1]; } } return o; }

// ---------- PARTIR EN DOS CON PASADORES (encaje automático) ----------
const dentroPol = (q, P) => dentro(q, P.ext) && !P.huecos.some(h => dentro(q, h));
function distSeg(q, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1e-12))); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy); }
// Cuánto material hay alrededor de un punto del corte (distancia al borde); −1 si el punto cae fuera de la pieza
function holgado(q, pols) { for (const P of pols) if (dentroPol(q, P)) { let d = Infinity; [P.ext].concat(P.huecos).forEach(r => { for (let i = 0; i < r.length; i++) d = Math.min(d, distSeg(q, r[i], r[(i + 1) % r.length])); }); return d; } return -1; }
// Parte la pieza por una altura y deja en las dos mitades los agujeros para unos pasadores (que se imprimen aparte).
// El programa busca SOLO dónde ponerlos: donde más material hay alrededor, también a la profundidad del agujero, y lo más
// separados posible entre sí para que las mitades no giren. Si en algún sitio no caben, pone menos (o ninguno) y lo dice.
// o = { pasadores (0-4), diametro, hondo, holgura }  →  { abajo, arriba, pasadores: [malla], puestos, cerrado }
export function partir(p, alto, o = {}) {
  const I = medidas(p), zc = I.min[2] + alto, n = Math.max(0, Math.min(4, o.pasadores === undefined ? 2 : Math.round(o.pasadores))), rp = (o.diametro || 4) / 2, hondo = o.hondo || 5, h = o.holgura === undefined ? ENCAJES.justo : o.holgura, rh = rp + h;
  const A = rebana(p, zc, true), B = rebana(p, zc, false), pts = [];
  if (n) {
    const S = [A.pols, rebana(p, zc - hondo - 1, true).pols, rebana(p, zc + hondo + 1, true).pols], paso = Math.max(0.8, Math.max(I.dims[0], I.dims[1]) / 44), cand = [];
    for (let x = I.min[0] + paso / 2; x < I.max[0]; x += paso) for (let y = I.min[1] + paso / 2; y < I.max[1]; y += paso) { const q = [x, y], d = Math.min(holgado(q, S[0]), holgado(q, S[1]), holgado(q, S[2])); if (d >= rh + 1.2) cand.push({ q, d }); }
    const gx = cand.reduce((s, c) => s + c.q[0], 0) / (cand.length || 1), gy = cand.reduce((s, c) => s + c.q[1], 0) / (cand.length || 1);
    while (pts.length < n && cand.length) { let mejor = 0, mv = -1;
      cand.forEach((c, i) => { const v = pts.length ? Math.min(...pts.map(t => Math.hypot(t[0] - c.q[0], t[1] - c.q[1]))) : n === 1 ? c.d : Math.hypot(c.q[0] - gx, c.q[1] - gy) + c.d * 0.01; if (v > mv) { mv = v; mejor = i; } });
      if (pts.length && mv < rh * 3) break; pts.push(cand[mejor].q); cand.splice(mejor, 1); }
  }
  const mitad = (R, deAbajo) => { const pols = R.pols.map(P => ({ ext: P.ext, huecos: P.huecos.slice() })), tri = R.tri, zf = deAbajo ? zc - hondo - 0.4 : zc + hondo + 0.4, z0 = Math.min(zc, zf), z1 = Math.max(zc, zf);
    pts.forEach(q => { const P = pols.find(X => dentroPol(q, X)); if (!P) return; const c = circulo(rh, q[0], q[1], 40); P.huecos.push(orienta(c, false));
      for (let i = 0; i < c.length; i++) { const a = c[i], b = c[(i + 1) % c.length]; tri.push(a[0], a[1], z0, b[0], b[1], z1, b[0], b[1], z0, a[0], a[1], z0, a[0], a[1], z1, b[0], b[1], z1); } // las paredes del pozo miran hacia dentro del agujero
      tapa([pol(c)], zf, deAbajo, tri); }); // y su fondo
    tapa(pols, zc, deAbajo, tri); return new Float32Array(tri); };
  const abajo = mitad(A, true), arriba = mitad(B, false), pin = pts.length ? malla(prisma([pol(circulo(rp, 0, 0, 40))], 0, 2 * hondo)) : null;
  return { abajo, arriba, pasadores: pts.map((_, i) => mover(pin, I.max[0] + 6 + rp + i * (2 * rp + 3), I.min[1] + rp, I.min[2])), puestos: pts.length, pedidos: n, puntos: pts, radioAgujero: rh, radioPasador: rp, cerrado: A.cerrado && B.cerrado };
}

// ---------- SEPARAR: las piezas sueltas de un archivo, cada una por su lado ----------
// Dos trozos son la misma pieza si comparten puntos o si se tocan o se montan (letras sobre una placa). Devuelve [malla, …], la mayor primero.
export function separar(p) {
  const n = p.length / 9, padre = new Int32Array(n), raiz = i => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; }, visto = new Map();
  for (let i = 0; i < n; i++) padre[i] = i;
  for (let t = 0; t < n; t++) for (let v = 0; v < 3; v++) { const i = t * 9 + v * 3, k = Math.round(p[i] * 500) + ',' + Math.round(p[i + 1] * 500) + ',' + Math.round(p[i + 2] * 500), o = visto.get(k); if (o === undefined) visto.set(k, t); else { const a = raiz(o), b = raiz(t); if (a !== b) padre[b] = a; } }
  const G = new Map();
  for (let t = 0; t < n; t++) { const r = raiz(t); let g = G.get(r); if (!g) G.set(r, g = { t: [], mn: [1e9, 1e9, 1e9], mx: [-1e9, -1e9, -1e9] }); g.t.push(t); for (let k = 0; k < 9; k++) { const v = p[t * 9 + k], e = k % 3; if (v < g.mn[e]) g.mn[e] = v; if (v > g.mx[e]) g.mx[e] = v; } }
  const L = [...G.values()];
  for (let cambio = true; cambio;) { cambio = false; fuera: for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if ([0, 1, 2].every(e => a.mn[e] <= b.mx[e] + 0.02 && b.mn[e] <= a.mx[e] + 0.02)) { a.t = a.t.concat(b.t); for (let e = 0; e < 3; e++) { a.mn[e] = Math.min(a.mn[e], b.mn[e]); a.mx[e] = Math.max(a.mx[e], b.mx[e]); } L.splice(j, 1); cambio = true; break fuera; } } }
  const vol = g => (g.mx[0] - g.mn[0]) * (g.mx[1] - g.mn[1]) * (g.mx[2] - g.mn[2]);
  return L.sort((a, b) => vol(b) - vol(a)).map(g => { const m = new Float32Array(g.t.length * 9); g.t.forEach((t, i) => { for (let k = 0; k < 9; k++) m[i * 9 + k] = p[t * 9 + k]; }); return m; });
}
// Varios archivos en un .zip (sin comprimir: los STL pequeños no lo necesitan y así no hace falta ninguna librería)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function zip(archivos) {
  const enc = new TextEncoder(), cuerpo = [], indice = []; let off = 0;
  archivos.forEach(a => {
    const nom = enc.encode(a.nombre), d = a.datos instanceof Uint8Array ? a.datos : new Uint8Array(a.datos); let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ (c >>> 8); c = (c ^ 0xFFFFFFFF) >>> 0;
    const cab = (firma, extra) => { const v = new DataView(new ArrayBuffer(extra ? 46 : 30)); let o = 0; v.setUint32(o, firma, true); o += 4; if (extra) { v.setUint16(o, 20, true); o += 2; } v.setUint16(o, 20, true); v.setUint16(o + 2, 0x0800, true); v.setUint16(o + 4, 0, true); v.setUint16(o + 6, 0, true); v.setUint16(o + 8, (46 << 9) | (10 << 5) | 9, true);
      v.setUint32(o + 10, c, true); v.setUint32(o + 14, d.length, true); v.setUint32(o + 18, d.length, true); v.setUint16(o + 22, nom.length, true); if (extra) v.setUint32(42, off, true); return v.buffer; };
    cuerpo.push(cab(0x04034b50, false), nom, d); indice.push(cab(0x02014b50, true), nom); off += 30 + nom.length + d.length;
  });
  const tam = indice.reduce((s, x) => s + x.byteLength, 0), fin = new DataView(new ArrayBuffer(22)); fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tam, true); fin.setUint32(16, off, true);
  return new Blob(cuerpo.concat(indice, [fin.buffer]), { type: 'application/zip' });
}

// ---------- el perfil de un engranaje recto (dientes de evolvente, ángulo de presión de 20°) ----------
export function perfilEngranaje(N, m) {
  const A = 20 * Math.PI / 180, r = m * N / 2, rb = r * Math.cos(A), ra = r + m, rf = Math.max(r - 1.25 * m, r * 0.2), inv = a => Math.tan(a) - a, beta = Math.PI / (2 * N) + inv(A), r0 = Math.max(rb, rf), o = [], fl = [];
  for (let i = 0; i <= 8; i++) { const R = r0 + (ra - r0) * i / 8; fl.push([R, Math.max(0.0015, beta - inv(Math.acos(Math.min(1, rb / R))))]); } // [radio, medio ángulo del diente a ese radio]
  for (let k = 0; k < N; k++) {
    const c = k / N * 2 * Math.PI, pt = (R, a) => o.push([R * Math.cos(a), R * Math.sin(a)]);
    pt(rf, c - Math.PI / N); if (rf < rb - 1e-6) pt(rf, c - fl[0][1]);
    fl.forEach(([R, a]) => pt(R, c - a)); fl.slice().reverse().forEach(([R, a]) => pt(R, c + a));
    if (rf < rb - 1e-6) pt(rf, c + fl[0][1]);
  }
  return o;
}

// ---------- formas para llaveros y placas (se dibujan del tamaño que necesita el texto) ----------
// w(T) y h(T, W): el tamaño de la figura para que quepa el texto · dy: cuánto se sube o baja el texto · oreja: dónde va la anilla
export const FORMAS = {
  ovalo: { t: 'Óvalo', w: T => T.w * 1.42 + 4, h: T => T.h * 2.05 + 4, oreja: (W, H) => [0, H / 2 + 1.6], pinta(g, W, H) { g.beginPath(); g.ellipse(0, 0, W / 2, H / 2, 0, 0, 7); g.fill(); } },
  corazon: { t: 'Corazón', w: T => Math.max(T.w * 1.55, T.h * 3.3), h: (T, W) => W * 0.92, dy: 0.09, oreja: (W, H) => [-W / 4, H / 2 + 1.2],
    pinta(g, W, H) { const x = W / 2, y = H / 2; g.beginPath(); g.moveTo(0, -y); g.bezierCurveTo(-x * 0.35, -y * 0.55, -x, -y * 0.1, -x, y * 0.38); g.bezierCurveTo(-x, y * 0.83, -x * 0.62, y, -x * 0.5, y); g.bezierCurveTo(-x * 0.24, y, 0, y * 0.82, 0, y * 0.5); g.bezierCurveTo(0, y * 0.82, x * 0.24, y, x * 0.5, y); g.bezierCurveTo(x * 0.62, y, x, y * 0.83, x, y * 0.38); g.bezierCurveTo(x, -y * 0.1, x * 0.35, -y * 0.55, 0, -y); g.fill(); } },
  hueso: { t: 'Hueso (mascotas)', w: T => T.w + T.h * 2.7, h: T => T.h * 2.35, oreja: (W, H) => [0, H * 0.27 + 2.6],
    pinta(g, W, H) { g.fillRect(-W * 0.36, -H * 0.27, W * 0.72, H * 0.54); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j]) => { g.beginPath(); g.arc(i * (W / 2 - H * 0.3), j * H * 0.2, H * 0.3, 0, 7); g.fill(); }); } },
  hexagono: { t: 'Hexágono', w: T => T.w * 1.5 + 5, h: (T, W) => Math.max(T.h * 2.4, W * 0.56), oreja: (W, H) => [0, H / 2 + 1.6], pinta(g, W, H) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(W / 2 * Math.cos(a), H / 2 * Math.sin(a) / Math.sin(Math.PI / 3)); } g.closePath(); g.fill(); } },
  estrella: { t: 'Estrella', w: T => Math.max(T.w * 2.5, T.h * 5), h: (T, W) => W * 0.96, dy: -0.06, oreja: (W, H) => [0, H / 2 - 1.5], pinta(g, W, H) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.5 : 1; g.lineTo(W / 2 * r * Math.cos(a), H / 2 * r * Math.sin(a) * 1.04 - H * 0.02); } g.closePath(); g.fill(); } },
  nube: { t: 'Nube', w: T => T.w * 1.5 + 8, h: T => T.h * 2.7, dy: -0.08, oreja: (W, H) => [W * 0.1, H / 2 + 0.6], pinta(g, W, H) { g.beginPath(); g.ellipse(0, -H * 0.14, W / 2, H * 0.36, 0, 0, 7); g.fill(); [[-0.24, 0.1, 0.3], [0.1, 0.16, 0.34], [0.33, 0.02, 0.24]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * W, y * H, r * H, 0, 7); g.fill(); }); } },
  escudo: { t: 'Escudo', w: T => T.w * 1.3 + 7, h: (T, W) => Math.max(T.h * 2.7, W * 0.92), dy: 0.12, oreja: (W, H) => [0, H / 2 + 1.6], pinta(g, W, H) { const x = W / 2, y = H / 2; g.beginPath(); g.moveTo(-x, y); g.lineTo(x, y); g.lineTo(x, -y * 0.1); g.bezierCurveTo(x, -y * 0.7, x * 0.4, -y * 0.9, 0, -y); g.bezierCurveTo(-x * 0.4, -y * 0.9, -x, -y * 0.7, -x, -y * 0.1); g.closePath(); g.fill(); } }
};

// ---------- LAS PLANTILLAS: cada una recibe sus medidas y devuelve la pieza (triángulos, en mm) ----------
const mal = t => { throw new Error(t); };
export const PIEZAS = {
  caja(p) {
    const { x, y, z, pared: t, radio: r } = p; if (2 * t >= Math.min(x, y) - 1) mal('La pared es demasiado gruesa para esa caja.'); if (z <= t) mal('La caja tiene que ser más alta que su suelo.');
    const ext = rectR(x, y, r), int = rectR(x - 2 * t, y - 2 * t, Math.max(0, r - t)), partes = [prisma([pol(ext)], 0, t), prisma([pol(ext, int)], t, z)];
    if (p.tapa) { const h = hol(p), lab = Math.max(1.2, Math.min(t, 2)), xi = x - 2 * t - 2 * h, yi = y - 2 * t - 2 * h, ri = Math.max(0, r - t - h);
      const labio = xi - 2 * lab > 2 && yi - 2 * lab > 2 ? prisma([pol(rectR(xi, yi, ri), rectR(xi - 2 * lab, yi - 2 * lab, Math.max(0, ri - lab)))], t, t + Math.min(5, Math.max(2.5, z * 0.15))) : [];
      const caja = malla(...partes), tapa2 = mover(malla(prisma([pol(ext)], 0, t), labio), x + 8, 0, 0), todo = malla(caja, tapa2); // la tapa, al lado, lista para imprimir boca arriba
      todo.partes = [{ t: 'caja', m: caja }, { t: 'tapa', m: tapa2 }]; return todo; }
    return malla(...partes);
  },
  engranaje(p) {
    const N = Math.round(p.dientes), m = p.modulo, raiz = m * N - 2.5 * m; if (N < 6) mal('Un engranaje necesita al menos 6 dientes.'); if (p.eje >= raiz - 2) mal('El agujero del eje es demasiado grande para ese engranaje.');
    return malla(prisma([pol(perfilEngranaje(N, m), p.eje > 0 ? circulo(p.eje / 2 + hol(p)) : null)], 0, p.grosor)); // el agujero, con la holgura del encaje elegido
  },
  arandela(p) { if (p.interior >= p.exterior - 1) mal('El agujero tiene que ser más pequeño que la pieza.'); return malla(prisma([pol(circulo(p.exterior / 2), p.interior > 0 ? circulo(p.interior / 2 + hol(p)) : null)], 0, p.grosor)); },
  // ---- 📏 PRUEBA DE HOLGURA ----
  // Una plaquita con 7 agujeros y un pasador. El pasador mide «diametro» exacto; cada agujero es un poco más grande que el
  // anterior. El número de cada agujero son las CENTÉSIMAS de holgura POR CADA LADO (0 · 5 · 10 · 15 · 20 · 25 · 30).
  // Se imprime, se prueba el pasador en cada agujero y se apunta en cuál entra a presión, en cuál justo y en cuál gira.
  holgura(p) {
    const d = p.diametro, H = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3], paso = d + 7, W = H.length * paso + 4, A = d + 16, g = p.grosor, cx = i => -W / 2 + 2 + paso / 2 + i * paso;
    const placa = malla(prisma([pol(rectR(W, A, 2.5), ...H.map((h, i) => circulo(d / 2 + h, cx(i), 3.2, 72)))], 0, g), // los agujeros, exactos (geometría, no dibujo)
      prisma(forma(W, A, G => H.forEach((h, i) => texto(String(Math.round(h * 100)), 'gorda', 3.6).pinta(G, cx(i), -A / 2 + 3.9))), g, g + 0.6)); // los números, en relieve
    const pin = mover(malla(prisma([pol(circulo(d / 2 + 2.5, 0, 0, 72))], 0, 2), prisma([pol(circulo(d / 2, 0, 0, 72))], 2, 2 + g + 9)), W / 2 + d / 2 + 8, 0, 0); // con cabeza, para cogerlo
    const todo = malla(placa, pin); todo.partes = [{ t: 'placa', m: placa }, { t: 'pasador', m: pin }]; return todo;
  },
  // ---- 🚗 🏍️ COCHE Y MOTO · REGALOS ----
  // Llavero con forma de matrícula (coche: alargada; moto: casi cuadrada, en dos líneas). La banda de la izquierda y las letras
  // van en relieve: con un cambio de color a esa altura salen en otro color. Vale para una matrícula o para un nombre.
  matricula(p) {
    const moto = p.tipo === 'moto', W = p.ancho, H = W * (moto ? 160 / 220 : 110 / 520), gb = p.base, rel = p.saliente, m = Math.max(0.9, H * 0.07), wb = p.banda ? (moto ? W * 0.17 : H * 0.42) : 0;
    const txt = String(p.texto || '').trim().toUpperCase() || '1234 ABC', lineas = moto && /\s/.test(txt) ? txt.split(/\s+/).slice(0, 2) : [txt], aro = p.anilla ? 4.2 : 0, xa = -W / 2 - aro * 0.45, Wt = W + 2.2 * aro + 2;
    const base = forma(Wt, H + 2, g => { trazaPols(g, [pol(rectR(W, H, H * 0.09))]); g.fill(); if (aro) { g.beginPath(); g.arc(xa, 0, aro, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(xa, 0, aro * 0.5, 0, 7); g.fill(); } });
    const cara = forma(Wt, H + 2, g => { g.lineWidth = m * 0.7; g.beginPath(); if (g.roundRect) g.roundRect(-W / 2 + m * 0.7, -H / 2 + m * 0.7, W - m * 1.4, H - m * 1.4, H * 0.06); else g.rect(-W / 2 + m * 0.7, -H / 2 + m * 0.7, W - m * 1.4, H - m * 1.4); g.stroke(); // el marco
      const x0 = -W / 2 + m * 1.6, aw = W - m * 3.2 - (wb ? wb + m * 0.6 : 0), cx = x0 + (wb ? wb + m * 0.6 : 0) + aw / 2, ah = (H - m * 3.2) / lineas.length;
      if (wb) { g.fillRect(x0, -H / 2 + m * 1.6, wb, H - m * 3.2); g.globalCompositeOperation = 'destination-out'; texto('E', 'gorda', Math.min(wb * 0.62, H * 0.3)).pinta(g, x0 + wb / 2, -H * 0.2); g.globalCompositeOperation = 'source-over'; } // la banda, con su «E» calada
      lineas.forEach((l, i) => { const t0 = texto(l, 'estrecha', 10), al = Math.min(ah * 0.74, 10 * (aw * 0.94) / t0.w); texto(l, 'estrecha', al).pinta(g, cx, H / 2 - m * 1.6 - ah * (i + 0.5)); }); });
    return malla(prisma(base, 0, gb), prisma(cara, gb, gb + rel));
  },
  // Ficha para el carro de la compra: la parte redonda mide EXACTAMENTE lo que la moneda (diámetro y grosor oficiales) y el
  // mango lleva el nombre en relieve y el agujero para el llavero.
  ficha(p) {
    const M = MONEDAS[p.moneda] || MONEDAS['1'], r = M[0] / 2, t = M[1], txt = String(p.texto || '').trim(), T = txt ? texto(txt, p.fuente, 5.6) : null, L = Math.max(24, (T ? T.w : 0) + 15), hm = 12.5, W = M[0] + L + 2;
    const cuerpo = forma(W, M[0] + 1, g => { const x = -W / 2 + 1 + r; g.beginPath(); g.arc(x, 0, r - 0.15, 0, 7); g.fill(); g.beginPath(); if (g.roundRect) g.roundRect(x + r - 5, -hm / 2, L + 5, hm, hm / 2); else g.rect(x + r - 5, -hm / 2, L + 5, hm); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x + r + L - hm / 2, 0, 2.3, 0, 7); g.fill(); });
    const disco = [pol(circulo(r, -W / 2 + 1 + r, 0, 96))]; // el círculo de la moneda, exacto: es lo que entra en el carro
    const partes = [prisma(cuerpo, 0, t - 0.01), prisma(disco, 0, t)];
    if (T) partes.push(prisma(forma(W, M[0] + 1, g => T.pinta(g, -W / 2 + 1 + M[0] + (L - hm - 1) / 2 - 1.5, 0)), t - 0.01, t + 0.6));
    return malla(...partes);
  },
  // Base para la pata de cabra de la moto (para que no se hunda en tierra, hierba o asfalto blando), con nombre o figura grabados
  pata(p) {
    const W = p.ancho, g = p.grosor, hondo = Math.min(p.hondo, g - 1.5), F = { redonda: [W, W, (G, w) => { G.beginPath(); G.arc(0, 0, w / 2, 0, 7); G.fill(); }], hexagono: [W, W * 0.9, (G, w, h) => FORMAS.hexagono.pinta(G, w, h)], escudo: [W * 0.88, W, (G, w, h) => FORMAS.escudo.pinta(G, w, h)], corazon: [W, W * 0.92, (G, w, h) => FORMAS.corazon.pinta(G, w, h)] }[p.forma] || null;
    if (!F) mal('Elige una forma.'); if (!(hondo > 0)) mal('Tiene que ser más gruesa para poder grabarla.');
    const w = F[0], h = F[1], yC = p.forma === 'corazon' ? h * 0.08 : p.forma === 'escudo' ? h * 0.1 : 0, cuerpo = G => { F[2](G, w, h); if (p.cordon) { G.globalCompositeOperation = 'destination-out'; G.beginPath(); G.arc(p.forma === 'corazon' ? -w * 0.25 : 0, h / 2 - (p.forma === 'corazon' ? h * 0.2 : 7), 2.6, 0, 7); G.fill(); G.globalCompositeOperation = 'source-over'; } };
    const motivo = G => { G.globalCompositeOperation = 'destination-out'; if (p.motivo === 'figura') { const S = siluetaDe({ texto: p.texto || '🏍', fuente: p.fuente, mask: p.mask, ancho: w * 0.5 }); G.translate(0, yC - h * 0.04); trazaPols(G, S.pols); G.fill('evenodd'); } else { const txt = String(p.texto || '').trim() || 'Nombre', t0 = texto(txt, p.fuente, 10); texto(txt, p.fuente, Math.min(h * 0.24, 10 * (w * 0.66) / t0.w)).pinta(G, 0, yC - h * 0.04); } };
    if (p.motivo === 'liso') return malla(prisma(forma(w, h, cuerpo), 0, g));
    return malla(prisma(forma(w, h, cuerpo), 0, g - hondo), prisma(forma(w, h, G => { cuerpo(G); motivo(G); }), g - hondo, g));
  },
  // Posavasos para el hueco del coche: se pide el diámetro del hueco y sale con la holgura para que entre y salga bien
  posavasos(p) {
    const R = p.diametro / 2 - hol(p), t = p.grosor, graba = p.motivo !== 'liso' ? Math.min(0.8, t - 1) : 0; if (R < 15) mal('Ese hueco es demasiado pequeño.');
    const disco = G => { G.beginPath(); G.arc(0, 0, R, 0, 7); G.fill(); if (p.muesca) { G.globalCompositeOperation = 'destination-out'; G.beginPath(); G.arc(R + 3, 0, 9, 0, 7); G.fill(); G.globalCompositeOperation = 'source-over'; } }; // la muesca: para meter el dedo y sacarlo
    const motivo = G => { G.globalCompositeOperation = 'destination-out'; if (p.motivo === 'figura') { const S = siluetaDe({ texto: p.texto || '★', fuente: p.fuente, mask: p.mask, ancho: R * 0.95 }); trazaPols(G, S.pols); G.fill('evenodd'); } else { const txt = String(p.texto || '').trim() || 'Nombre', t0 = texto(txt, p.fuente, 10); texto(txt, p.fuente, Math.min(R * 0.42, 10 * (R * 1.3) / t0.w)).pinta(G, 0, 0); } };
    const partes = [prisma(forma(2 * R, 2 * R, disco), 0, t - graba)]; if (graba > 0) partes.push(prisma(forma(2 * R, 2 * R, G => { disco(G); motivo(G); }), t - graba, t));
    if (p.borde) partes.push(prisma(forma(2 * R, 2 * R, G => { disco(G); G.globalCompositeOperation = 'destination-out'; G.beginPath(); G.arc(0, 0, R - 2.2, 0, 7); G.fill(); }), t, t + 1.6)); // el borde que sujeta el vaso
    return malla(...partes);
  },
  // Colgante para el retrovisor (o para la llave): una figura arriba, el nombre debajo, todo unido por detrás y con su anilla
  colgante(p) {
    const W = p.ancho, S = siluetaDe({ texto: p.figura || '🏍', fuente: p.fuente, mask: p.mask, ancho: W * 0.86 }), txt = String(p.texto || '').trim(), t0 = txt ? texto(txt, p.fuente, 10) : null, T = txt ? texto(txt, p.fuente, Math.min(W * 0.26, 10 * W / t0.w)) : null;
    const b = Math.max(1.8, W * 0.045), hT = T ? T.h + b : 0, alto = S.h + hT, yF = alto / 2 - S.h / 2, yT = -alto / 2 + (T ? T.h / 2 : 0), aro = 4.4, sube = P => P.map(q => ({ ext: q.ext.map(v => [v[0], v[1] + yF]), huecos: q.huecos.map(r => r.map(v => [v[0], v[1] + yF])) })), fig = sube(S.pols);
    const Wc = Math.max(W, T ? T.w : 0) + 2 * b + 4, Hc = alto + 2 * b + 2 * aro + 6, yA = alto / 2 + b + aro * 0.45;
    const base = forma(Wc, Hc, g => { gruesa(g, fig, b); if (T) { T.pinta(g, 0, yT, { borde: b }); g.fillRect(-Math.min(S.w, T.w) * 0.3, yT, Math.min(S.w, T.w) * 0.6, yF - yT); } // un puente por detrás: figura y nombre son UNA pieza
      g.fillRect(-aro * 0.7, yF, aro * 1.4, yA - yF); g.beginPath(); g.arc(0, yA, aro, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, yA, aro * 0.5, 0, 7); g.fill(); });
    return malla(prisma(base, 0, p.base), prisma(forma(Wc, Hc, g => { trazaPols(g, fig); g.fill('evenodd'); if (T) T.pinta(g, 0, yT); }), p.base, p.base + p.saliente));
  },
  // ---- 📱 FUNDA DE MÓVIL ----
  // La funda se dibuja boca arriba, vista desde la pantalla (así se imprime: la trasera sobre la cama). Por eso lo que por
  // detrás está «arriba a la izquierda» (la cámara) aquí se dibuja a la derecha, y las letras de la trasera van del revés.
  // Capas: trasera (con la ventana de la cámara y el diseño) → paredes (con las aberturas de abajo y de los lados) → labio.
  funda(p) {
    const W = p.ancho + 2 * p.ajuste, H = p.alto + 2 * p.ajuste, t = p.pared, r = Math.max(0.5, p.radio), Wo = W + 2 * t, Ho = H + 2 * t, f = p.prueba ? 0.6 : p.fondo, m = 2.5;
    if (!(p.ancho > 20 && p.alto > 40 && p.grosor > 3)) mal('Pon las medidas del móvil: alto, ancho y grosor.');
    const fuera = rectR(Wo, Ho, r + t), cw = Math.min(W - 2 * m, W * p.camAncho / 100), ch = H * p.camAlto / 100, yCam = H / 2 - m - ch, rr = (g, x, y, w, h, q) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.max(0, Math.min(q, w / 2, h / 2))); else g.rect(x, y, w, h); g.fill(); };
    const camara = g => { if (p.camara === 'ancha' || cw >= W - 2 * m - 0.5) rr(g, -W / 2 + m, yCam, W - 2 * m, ch, 6); else if (p.camara === 'centro') rr(g, -cw / 2, yCam, cw, ch, 8); else rr(g, W / 2 - m - cw, yCam, cw, ch, 8); };
    const libre = g => { g.beginPath(); g.rect(-W / 2 + 6, -H / 2 + 9, W - 12, (p.camara === 'sin' ? H / 2 - 9 : yCam - 5) + H / 2 - 9); g.clip(); }; // donde puede ir el dibujo: lejos de los bordes y de la cámara
    const dibujo = g => { g.save(); libre(g);
      if (p.diseno === 'panal') { const R = 4.6, dx = R * 1.5 + 1.1, dy = R * Math.sqrt(3) + 1.3; for (let i = -12; i <= 12; i++) for (let j = -22; j <= 22; j++) { const x = i * dx, y = j * dy + (i & 1 ? dy / 2 : 0); g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(x + R * Math.cos(k * Math.PI / 3), y + R * Math.sin(k * Math.PI / 3)); g.closePath(); g.fill(); } }
      else if (p.diseno === 'puntos') { for (let i = -14; i <= 14; i++) for (let j = -28; j <= 28; j++) { g.beginPath(); g.arc(i * 7 + (j & 1 ? 3.5 : 0), j * 6.2, 2.1, 0, 7); g.fill(); } }
      else if (p.diseno === 'rayas') { g.lineWidth = 2.6; g.lineCap = 'round'; for (let i = -40; i <= 40; i++) { g.beginPath(); g.moveTo(i * 8 - 60, -100); g.lineTo(i * 8 + 60, 100); g.stroke(); } }
      g.restore(); };
    const cyMotivo = ((p.camara === 'sin' ? H / 2 : yCam) - H / 2) / 2; // el nombre o la figura, centrados en la parte libre de la trasera
    const motivo = g => { g.save(); libre(g); if (p.diseno === 'nombre') { const txt = String(p.texto || '').trim() || 'Nombre', t0 = texto(txt, p.fuente, 10), T = texto(txt, p.fuente, Math.min(10 * (W - 18) / t0.w, H * 0.16)); T.pinta(g, 0, cyMotivo, { espejo: true }); }
      else if (p.diseno === 'figura') { const S = siluetaDe({ texto: p.texto || '❤', fuente: p.fuente, mask: p.mask, ancho: Math.min(W * 0.52, 44) }); g.translate(0, cyMotivo); g.scale(-1, 1); trazaPols(g, S.pols); g.fill('evenodd'); } g.restore(); };
    const trasera = conMotivo => forma(Wo, Ho, g => { trazaPols(g, [pol(fuera)]); g.fill(); g.globalCompositeOperation = 'destination-out'; if (p.camara !== 'sin') camara(g); dibujo(g); if (conMotivo) motivo(g); });
    const grab = (p.diseno === 'nombre' || p.diseno === 'figura') && !p.prueba ? Math.min(0.6, f - 0.6) : 0, partes = [];
    if (grab > 0) partes.push(prisma(trasera(true), 0, grab)); // el nombre o la figura, grabados por fuera (0,6 mm)
    partes.push(prisma(trasera(false), Math.max(0, grab), f));
    const muescas = g => { g.globalCompositeOperation = 'destination-out'; const ab = W * p.abajo / 100; if (ab > 0) g.fillRect(-ab / 2, -Ho / 2 - 1, ab, t + 2.5); // abajo: el puerto de carga y los altavoces
      if (p.lados) { const y1 = H / 2 - H * p.desde / 100, y0 = H / 2 - H * p.hasta / 100; if (y1 > y0) [-1, 1].forEach(s => g.fillRect(s > 0 ? W / 2 - 1.5 : -Wo / 2 - 1, y0, t + 2.5, y1 - y0)); } }; // a los lados: los botones
    const marco = dentro => forma(Wo, Ho, g => { trazaPols(g, [pol(fuera, dentro)]); g.fill('evenodd'); muescas(g); }), sube = p.prueba ? 3 : p.grosor + 0.3;
    partes.push(prisma(marco(rectR(W, H, r)), f, f + sube));
    if (!p.prueba && p.labio > 0) partes.push(prisma(marco(rectR(W - 2 * p.labio, H - 2 * p.labio, Math.max(0.5, r - p.labio))), f + sube, f + sube + 0.8)); // el labio que sujeta el móvil por delante
    return malla(...partes);
  },
  // ---- REPUESTOS ----
  tapon(p) { // «fuera»: un capuchón que cubre el tubo o la pata · «dentro»: un tapón que entra en el tubo
    const r = p.diametro / 2, t = p.pared, h = hol(p); if (p.alto <= t) mal('Tiene que ser más alto que su fondo.');
    if (p.tipo === 'dentro') { const R = r - h; if (R - t < 0.6) mal('La pared es demasiado gruesa para ese diámetro.'); return malla(prisma([pol(circulo(r + p.ala))], 0, t), prisma([pol(circulo(R), circulo(R - t))], t, p.alto)); }
    return malla(prisma([pol(circulo(r + h + t))], 0, t), prisma([pol(circulo(r + h + t), circulo(r + h))], t, p.alto));
  },
  pomo(p) { // un mando redondo con estrías y el agujero del eje por debajo (redondo o en «D»)
    const R = p.diametro / 2, n = Math.round(p.estrias), re = p.eje / 2 + hol(p), hondo = Math.min(p.hondo, p.alto - 1.2), per = [], eje = []; if (re >= R - 2) mal('El eje es demasiado grande para ese pomo.'); if (!(hondo > 0)) mal('El pomo tiene que ser más alto.');
    for (let i = 0; i < 240; i++) { const a = i / 240 * 2 * Math.PI, rr = n > 0 ? R - R * 0.07 * (1 + Math.cos(n * a)) / 2 : R; per.push([rr * Math.cos(a), rr * Math.sin(a)]); }
    circulo(re, 0, 0, 48).forEach(q => eje.push([p.plano ? Math.min(q[0], re * 0.5) : q[0], q[1]])); // eje en D: se le aplana un lado
    return malla(prisma([pol(per, eje)], 0, hondo), prisma([pol(per)], hondo, p.alto));
  },
  pletina(p) { // una placa con agujeros para atornillar
    const { x, y } = p, ra = p.agujero / 2 + hol(p), n = Math.max(0, Math.round(p.agujeros)), m = Math.max(ra + 2, Math.min(y / 2, ra * 2 + 2)), A = []; if (2 * ra >= y - 2) mal('Los agujeros no caben en esa placa.');
    if (p.patron === 'esquinas') [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j]) => A.push(circulo(ra, i * (x / 2 - m), j * (y / 2 - m))));
    else for (let i = 0; i < n; i++) A.push(circulo(ra, n === 1 ? 0 : -x / 2 + m + i * (x - 2 * m) / (n - 1), 0));
    if (p.patron !== 'esquinas' && n > 1 && (x - 2 * m) / (n - 1) < 2 * ra + 1) mal('Son demasiados agujeros para ese largo.');
    return malla(prisma([pol(rectR(x, y, p.radio), ...A)], 0, p.grosor));
  },
  gancho(p) { // se imprime tumbado: el dibujo de perfil, con el grosor de la pieza, sube «ancho» mm
    const e = p.espesor, a = p.hueco, g = p.fondo, L = p.caida;
    if (p.tipo === 's') { const r1 = a / 2 + e / 2, r2 = g / 2 + e / 2; // una «S»: arriba abraza la barra, abajo cuelga
      return malla(prisma(forma(2 * (r1 + r2) + 2 * e, 2 * r1 + 2 * r2 + L + 3 * e, G => { G.lineWidth = e; const y0 = (L + r2 - r1) / 2; G.beginPath(); G.arc(0, y0, r1, -0.15 * Math.PI, 1.0 * Math.PI); G.lineTo(-r1, y0 - L); G.arc(-r1 + r2, y0 - L, r2, Math.PI, 2.15 * Math.PI); G.stroke(); }), 0, p.ancho)); }
    const xi = -(a + e) / 2, xd = (a + e) / 2, r = g / 2 + e / 2, tras = Math.min(L, Math.max(15, L * 0.5)); // de puerta: baja por detrás, pasa por encima y cuelga por delante
    return malla(prisma(forma(a + g + 4 * e + 4, L + 2 * r + 3 * e + 4, G => { G.lineWidth = e; const y0 = (L + r) / 2; G.translate(-(r + e / 2) / 2 + e / 4, 0); G.beginPath(); G.moveTo(xi, y0 - tras); G.lineTo(xi, y0); G.lineTo(xd, y0); G.lineTo(xd, y0 - L); G.arc(xd + r, y0 - L, r, Math.PI, 2 * Math.PI); G.lineTo(xd + 2 * r, y0 - L + r * 0.6); G.stroke(); }), 0, p.ancho));
  },
  clip(p) { // abrazadera en «C» para un tubo o un cable, con base plana para pegar o atornillar de lado
    const e = p.espesor, r = p.tubo / 2 + hol(p) + e / 2, ab = Math.max(20, Math.min(170, p.abertura)) * Math.PI / 180, W = 2 * r + 2 * e + 4;
    return malla(prisma(forma(W, W + e + 2, G => { G.lineWidth = e; G.beginPath(); G.arc(0, e / 2, r, Math.PI / 2 + ab / 2, Math.PI / 2 - ab / 2 + 2 * Math.PI); G.stroke(); if (p.base) G.fillRect(-r * 0.75, e / 2 - r - e, r * 1.5, e); }), 0, p.ancho));
  },
  nombre(p) {
    const txt = String(p.texto || '').trim() || 'Nombre', T = texto(txt, p.fuente, p.alto), gb = p.base, rel = p.saliente, aro = p.anilla ? 4.6 : 0;
    if (p.estilo === 'silueta') { // la base tiene la forma de las propias letras
      const borde = Math.max(1.6, p.alto * 0.17), cx = aro * 0.78, xa = cx - T.w / 2 - borde - aro * 0.55, W = T.w + 2 * borde + 1.56 * aro + 3, H = Math.max(T.h + 2 * borde, 2 * aro) + 3;
      const base = forma(W, H, g => { T.pinta(g, cx, 0, { borde }); if (aro) { g.beginPath(); g.arc(xa, 0, aro, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(xa, 0, aro * 0.5, 0, 7); g.fill(); } });
      return malla(prisma(base, 0, gb), prisma(forma(W, H, g => T.pinta(g, cx, 0)), gb, gb + rel));
    }
    if (FORMAS[p.estilo]) { // corazón, hueso, estrella…: la base es esa figura, con una orejita para la anilla
      const F = FORMAS[p.estilo], W = F.w(T), H = F.h(T, W), dy = (F.dy || 0) * H, o = F.oreja(W, H), base = g => { F.pinta(g, W, H); if (aro) { g.beginPath(); g.arc(o[0], o[1], aro, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(o[0], o[1], aro * 0.5, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; } };
      const A = W + 4 * aro + 6, B = H + 4 * aro + 6;
      if (p.relieve === 'grabado') { const hondo = Math.min(rel, gb - 0.6); if (!(hondo > 0)) mal('Para grabar, la base tiene que ser más gruesa.');
        return malla(prisma(forma(A, B, base), 0, gb - hondo), prisma(forma(A, B, g => { base(g); g.globalCompositeOperation = 'destination-out'; T.pinta(g, 0, dy); }), gb - hondo, gb)); }
      return malla(prisma(forma(A, B, base), 0, gb), prisma(forma(A, B, g => T.pinta(g, 0, dy)), gb, gb + rel));
    }
    const mg = Math.max(2, p.alto * 0.42), W = T.w + 2 * mg + (aro ? 2 * aro + 1 : 0), H = T.h + 2 * mg, cx = aro ? aro + 0.5 : 0;
    const placa = pol(rectR(W, H, Math.min(H * 0.28, 7)), aro ? circulo(2.3, -W / 2 + mg * 0.6 + 3.1, 0) : null);
    if (p.relieve === 'grabado') { const hondo = Math.min(rel, gb - 0.6); if (!(hondo > 0)) mal('Para grabar, la base tiene que ser más gruesa.');
      return malla(prisma([placa], 0, gb - hondo), prisma(forma(W, H, g => { trazaPols(g, [placa]); g.fill('evenodd'); g.globalCompositeOperation = 'destination-out'; T.pinta(g, cx, 0); }), gb - hondo, gb)); }
    return malla(prisma([placa], 0, gb), prisma(forma(W, H, g => T.pinta(g, cx, 0)), gb, gb + rel));
  },
  molde(p) {
    const F = siluetaDe(p), W = F.w + 2 * p.margen, H = F.h + 2 * p.margen, bloque = pol(rectR(W, H, 3));
    const hueco = forma(W, H, g => { trazaPols(g, [bloque]); g.fill(); g.globalCompositeOperation = 'destination-out'; if (p.espejo) g.scale(-1, 1); trazaPols(g, F.pols); g.fill('evenodd'); });
    return malla(prisma([bloque], 0, p.fondo), prisma(hueco, p.fondo, p.fondo + p.hondo));
  },
  cortador(p) {
    const F = siluetaDe(p), S = F.pols, t = p.pared, a = p.ala;
    const anillo = d => forma(F.w + 2 * d, F.h + 2 * d, g => { gruesa(g, S, d); g.globalCompositeOperation = 'destination-out'; gruesa(g, S, 0); });
    return malla(prisma(anillo(t + a), 0, 1.6), prisma(anillo(t), 1.6, p.alto)); // el ala abajo (para apretar) y el filo arriba
  },
  figura(p) {
    const F = siluetaDe(p), S = F.pols;
    if (!(p.borde > 0)) return malla(prisma(S, 0, p.grosor));
    return malla(prisma(forma(F.w + 2 * p.borde, F.h + 2 * p.borde, g => gruesa(g, S, p.borde)), 0, p.peana), prisma(S, p.peana, p.peana + p.grosor));
  }
};

// ---------- EDITAR UN STL que ya existe ----------
// base = triángulos del archivo. p = { escala %, modo 'entera'|'abajo'|'partir' (o cortar: true), eje 'z'|'x'|'y', corte (mm desde abajo o desde un lado),
//   pasadores, diam, encaje, texto, fuente, alto, saliente, cara 'arriba'|'frente', dx, dy, tapar, parche (mm) }
export function editar(base, p) {
  let m = base; const f = (Number(p.escala) || 100) / 100;
  if (Math.abs(f - 1) > 1e-6) m = escalar(m, f, f, f);
  let M = medidas(m); const avisos = [], modo = p.modo || (p.cortar ? 'abajo' : 'entera'), ida = p.eje === 'x' ? 1 : p.eje === 'y' ? 2 : 0, vuelta = ida === 1 ? 2 : 1, tope = M.dims[ida === 1 ? 0 : ida === 2 ? 1 : 2];
  let dos = null;
  if (modo !== 'entera' && p.corte > 0 && p.corte < tope) {
    const g = ida ? rotar(m, ida) : m, G = medidas(g), des = x => (ida ? rotar(x, vuelta) : x);
    if (modo === 'partir') { const R = partir(g, p.corte, { pasadores: p.pasadores, diametro: p.diam, hondo: Math.max(2.5, Math.min(6, p.corte - 1.5, G.dims[2] - p.corte - 1.5)), holgura: hol(p) });
      dos = { abajo: des(R.abajo), arriba: des(R.arriba), pasadores: R.pasadores.map(des), puestos: R.puestos, pedidos: R.pedidos };
      if (!R.cerrado) avisos.push('El corte no ha podido cerrarse del todo (el archivo tenía huecos): revísalo en el laminador.');
      if (R.pedidos && R.puestos < R.pedidos) avisos.push(R.puestos ? 'Solo caben ' + R.puestos + ' pasadores en ese corte (no hay más sitio con material alrededor).' : 'En ese corte no hay sitio para pasadores: las dos mitades salen lisas, para pegarlas.');
    } else { const c = cortarZ(g, G.min[2] + p.corte, true); if (!c.cerrado) avisos.push('El corte no ha podido cerrarse del todo (el archivo tenía huecos): revísalo en el laminador.'); m = des(c); M = medidas(m); }
  }
  const txt = String(p.texto || '').trim(), extra = [];
  if (txt) {
    const T = texto(txt, p.fuente, p.alto), rel = p.saliente, hundido = 0.25, cx = (M.min[0] + M.max[0]) / 2 + (p.dx || 0), letras = forma(T.w + 1, T.h + 1, g => T.pinta(g, 0, 0));
    const parche = p.tapar && p.parche > 0 ? prisma([pol(rectR(T.w + T.h * 0.7, T.h * 1.55, T.h * 0.25))], 0, p.parche + hundido) : null, sube = parche ? p.parche : 0;
    if (p.cara === 'frente') { const cz = (M.min[2] + M.max[2]) / 2 + (p.dy || 0), y0 = M.min[1] + hundido; // las letras miran hacia delante
      if (parche) extra.push(mover(tumbar(parche), cx, y0, cz)); extra.push(mover(tumbar(prisma(letras, 0, rel + hundido)), cx, y0 - sube, cz)); }
    else { const cy = (M.min[1] + M.max[1]) / 2 + (p.dy || 0), z0 = M.max[2] - hundido; // encima de la pieza
      if (parche) extra.push(mover(parche, cx, cy, z0)); extra.push(mover(prisma(letras, 0, rel + hundido), cx, cy, z0 + sube)); }
  }
  if (dos) { // partida en dos: en pantalla se ve la de arriba un poco levantada; al descargar, cada parte en su archivo
    const arriba = malla(dos.arriba, ...extra), sep = ida === 1 ? [8, 0, 0] : ida === 2 ? [0, 8, 0] : [0, 0, 8], out = malla(dos.abajo, mover(arriba, sep[0], sep[1], sep[2]), ...dos.pasadores);
    out.partes = [{ t: ida ? 'mitad_1' : 'abajo', m: dos.abajo }, { t: ida ? 'mitad_2' : 'arriba', m: arriba }].concat(dos.pasadores.map((x, i) => ({ t: 'pasador_' + (i + 1), m: x }))); out.puestos = dos.puestos; out.avisos = avisos; return out; }
  const out = malla(m, ...extra); out.avisos = avisos; return out;
}
