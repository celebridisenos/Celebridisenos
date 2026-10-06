// ================= v13.10 · 🪄 CAMBIAR EL FONDO DE UNA FOTO =================
// Recorte automático del producto, todo en este aparato (la foto no sale a ningún sitio):
// 1) se miran los bordes de la foto para saber cómo es el fondo (hasta 3 tonos: sirve para fondos con degradado o sombra),
// 2) desde los bordes se «inunda» todo lo que se parece al fondo, siguiendo los cambios suaves (sombras, degradados),
// 3) se quitan manchitas sueltas, se suaviza el borde y se pone el fondo nuevo (blanco, color, degradado, desenfocado,
//    transparente o una foto), con una sombra suave debajo si quieres. Funciona mejor con el producto sobre un fondo liso.
import { fondoBanco } from './biou/banco.js';
const LADO = 520; // la máscara se calcula a este tamaño (rápido) y luego se escala suave a la foto real

function dist(r1, g1, b1, r2, g2, b2) { const dr = r1 - r2, dg = g1 - g2, db = b1 - b2; return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 3; }
function kmedias(px, k) {
  const c = []; for (let i = 0; i < k; i++) { const p = px[Math.floor((i + 0.5) / k * px.length)]; c.push([p[0], p[1], p[2], 0]); }
  for (let it = 0; it < 8; it++) {
    const s = c.map(() => [0, 0, 0, 0]);
    px.forEach(p => { let b = 0, bd = 1e9; c.forEach((q, j) => { const d = dist(p[0], p[1], p[2], q[0], q[1], q[2]); if (d < bd) { bd = d; b = j; } }); s[b][0] += p[0]; s[b][1] += p[1]; s[b][2] += p[2]; s[b][3]++; });
    s.forEach((x, j) => { if (x[3]) c[j] = [x[0] / x[3], x[1] / x[3], x[2] / x[3], x[3]]; else c[j][3] = 0; });
  }
  return c.filter(q => q[3] >= px.length * 0.08);
}
// Devuelve { w, h, a: Float32Array (1 = producto, 0 = fondo), caja: {x,y,w,h} en 0..1 } o null si no encuentra el producto
export function mascara(fuente, opts = {}) {
  const tol = Number(opts.tol) || 26;
  const k = Math.min(1, LADO / Math.max(fuente.width, fuente.height)), W = Math.max(8, Math.round(fuente.width * k)), H = Math.max(8, Math.round(fuente.height * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high'; g.drawImage(fuente, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data, N = W * H;
  // 1) cómo es el fondo: los bordes
  const borde = [];
  for (let x = 0; x < W; x += 1) for (const y of [0, 1, H - 2, H - 1]) { const i = (y * W + x) * 4; borde.push([d[i], d[i + 1], d[i + 2]]); }
  for (let y = 2; y < H - 2; y += 1) for (const x of [0, 1, W - 2, W - 1]) { const i = (y * W + x) * 4; borde.push([d[i], d[i + 1], d[i + 2]]); }
  const cen = kmedias(borde, 3);
  const dfondo = new Float32Array(N);
  for (let p = 0, i = 0; p < N; p++, i += 4) { let m = 1e9; for (const q of cen) { const x = dist(d[i], d[i + 1], d[i + 2], q[0], q[1], q[2]); if (x < m) m = x; } dfondo[p] = m; }
  // 2) inundar desde los bordes (siguiendo cambios suaves)
  const fondo = new Uint8Array(N), cola = new Int32Array(N); let a = 0, b = 0;
  const mete = p => { if (!fondo[p] && dfondo[p] < tol * 1.6) { fondo[p] = 1; cola[b++] = p; } };
  for (let x = 0; x < W; x++) { if (dfondo[x] < tol) mete(x); if (dfondo[(H - 1) * W + x] < tol) mete((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { if (dfondo[y * W] < tol) mete(y * W); if (dfondo[y * W + W - 1] < tol) mete(y * W + W - 1); }
  while (a < b) {
    const p = cola[a++], x = p % W, y = (p / W) | 0, i = p * 4;
    const vec = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
    for (const q of vec) {
      if (q < 0 || fondo[q]) continue;
      const j = q * 4, paso = dist(d[i], d[i + 1], d[i + 2], d[j], d[j + 1], d[j + 2]);
      if (dfondo[q] < tol || (paso < tol * 0.22 && dfondo[q] < tol * 2.2)) { fondo[q] = 1; cola[b++] = q; }
    }
  }
  // 3) el producto = lo que no es fondo; se quitan las manchitas sueltas (se queda lo grande)
  const et = new Int32Array(N).fill(-1), tam = []; let n = 0;
  for (let p = 0; p < N; p++) {
    if (fondo[p] || et[p] >= 0) continue;
    let s = 0; a = 0; b = 0; cola[b++] = p; et[p] = n;
    while (a < b) { const q = cola[a++]; s++; const x = q % W, y = (q / W) | 0; for (const r of [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1]) if (r >= 0 && !fondo[r] && et[r] < 0) { et[r] = n; cola[b++] = r; } }
    tam.push(s); n++;
  }
  if (!n) return null;
  const mayor = Math.max(...tam), vale = tam.map(s => s >= Math.max(12, mayor * 0.04));
  const al = new Float32Array(N); let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0;
  for (let p = 0; p < N; p++) if (et[p] >= 0 && vale[et[p]]) { al[p] = 1; area++; const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (area < N * 0.005 || area > N * 0.97) return null; // no se distingue el producto del fondo
  return { w: W, h: H, a: al, caja: { x: x0 / W, y: y0 / H, w: (x1 - x0 + 1) / W, h: (y1 - y0 + 1) / H }, area: area / N };
}
// La máscara como lienzo (alfa), al tamaño pedido y con el borde suavizado
function lienzoMascara(m, W, H, suave) {
  const c = document.createElement('canvas'); c.width = m.w; c.height = m.h; const g = c.getContext('2d');
  const im = g.createImageData(m.w, m.h); for (let p = 0; p < m.a.length; p++) { im.data[p * 4 + 3] = m.a[p] * 255; } g.putImageData(im, 0, 0);
  const o = document.createElement('canvas'); o.width = W; o.height = H; const go = o.getContext('2d');
  go.imageSmoothingEnabled = true; go.imageSmoothingQuality = 'high';
  const r = Math.max(0.4, (Number(suave) || 0) * Math.max(W, H) / 900 + Math.max(W, H) / m.w * 0.35);
  if ('filter' in go) go.filter = 'blur(' + r.toFixed(2) + 'px)';
  go.drawImage(c, 0, 0, W, H); go.filter = 'none';
  return o;
}
// fondo: { tipo: 'blanco'|'color'|'degradado'|'desenfocado'|'transparente'|'foto', color, imagen, sombra, suave }
export function componer(cv, m, fondo) {
  const W = cv.width, H = cv.height, out = document.createElement('canvas'); out.width = W; out.height = H;
  const g = out.getContext('2d'); g.imageSmoothingQuality = 'high';
  const color = fondo.color || '#f4efe9';
  if (fondo.tipo === 'blanco') { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
  else if (fondo.tipo === 'color') { g.fillStyle = color; g.fillRect(0, 0, W, H); }
  else if (fondo.tipo === 'degradado') { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, color); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  else if (fondo.tipo === 'desenfocado') { if ('filter' in g) g.filter = 'blur(' + Math.round(Math.max(W, H) / 70) + 'px) brightness(1.06)'; g.drawImage(cv, -W * 0.03, -H * 0.03, W * 1.06, H * 1.06); g.filter = 'none'; }
  else if (fondo.tipo === 'banco') { const im = fondoBanco(fondo.banco || 'estudio_blanco', W, H); g.drawImage(im, 0, 0, W, H); } // v13.12: banco de fondos
  else if (fondo.tipo === 'foto' && fondo.imagen) { const im = fondo.imagen, s = Math.max(W / im.width, H / im.height); g.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s); }
  // sombra suave debajo del producto
  if (fondo.sombra && fondo.tipo !== 'transparente') {
    const c = m.caja, cx = (c.x + c.w / 2) * W, by = (c.y + c.h) * H, rx = c.w * W * 0.46, ry = Math.max(4, c.h * H * 0.05);
    g.save(); g.translate(cx, by - ry * 0.35); g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(0,0,0,0.30)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // el producto, recortado con la máscara
  const prod = document.createElement('canvas'); prod.width = W; prod.height = H; const gp = prod.getContext('2d');
  gp.drawImage(cv, 0, 0); gp.globalCompositeOperation = 'destination-in'; gp.drawImage(lienzoMascara(m, W, H, fondo.suave), 0, 0);
  g.drawImage(prod, 0, 0);
  return out;
}
export const FONDOS = [['original', 'Original'], ['banco', '🖼️ Banco de fondos'], ['blanco', '⬜ Blanco'], ['color', '🎨 Color'], ['degradado', '🌅 Degradado'], ['desenfocado', '🌫️ Desenfocado'], ['transparente', '🔲 Transparente (PNG)'], ['foto', '🖼️ Foto…']];
