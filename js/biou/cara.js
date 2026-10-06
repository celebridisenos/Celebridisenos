// ================= v13.12 · BIOUVISION · RETOQUE DE CARA =================
// 1) Detectar la cara: con el detector del sistema si el navegador lo trae (FaceDetector) y, si no, buscando la mancha de
//    piel más grande con forma de cara; los ojos son las zonas más oscuras de la parte de arriba de la cara.
//    Todo queda en coordenadas 0..1 de la foto y se puede corregir arrastrando los puntos.
// 2) Retocar: piel lisa SIN perder detalle (desenfoque que respeta los bordes, solo donde hay piel), luz en la cara,
//    ojos brillantes y nítidos, ojos un poco más grandes (deformación suave), rubor en las mejillas y bronceado.
// Todo se hace en este aparato: la foto no sale a ningún sitio.

export const PERFILES = [
  ['natural', 'Natural', { piel: 25, luz: 8, ojos: 20, grandes: 0, rubor: 0, bronce: 0, glow: 0 }],
  ['perfecta', 'Piel perfecta', { piel: 70, luz: 12, ojos: 30, grandes: 8, rubor: 6, bronce: 0, glow: 10 }],
  ['glow', 'Glow', { piel: 50, luz: 22, ojos: 35, grandes: 10, rubor: 10, bronce: 0, glow: 45 }],
  ['maquillaje', 'Maquillaje suave', { piel: 55, luz: 10, ojos: 45, grandes: 12, rubor: 30, bronce: 5, glow: 15 }],
  ['bronceado', 'Bronceado', { piel: 40, luz: 6, ojos: 25, grandes: 5, rubor: 8, bronce: 45, glow: 10 }],
  ['ojos', 'Mirada', { piel: 30, luz: 8, ojos: 70, grandes: 25, rubor: 0, bronce: 0, glow: 0 }],
  ['joven', 'Joven', { piel: 85, luz: 18, ojos: 40, grandes: 15, rubor: 12, bronce: 0, glow: 25 }]
];
export const CERO_CARA = () => ({ piel: 0, luz: 0, ojos: 0, grandes: 0, rubor: 0, bronce: 0, glow: 0 });
export const BARRAS_CARA = [['piel', 'Piel lisa'], ['luz', 'Luz en la cara'], ['ojos', 'Ojos brillantes'], ['grandes', 'Ojos más grandes'], ['rubor', 'Rubor'], ['bronce', 'Bronceado'], ['glow', 'Brillo (glow)']];

const esPiel = (r, g, b) => { const y = 0.299 * r + 0.587 * g + 0.114 * b, cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b; return y > 45 && cb > 77 && cb < 130 && cr > 132 && cr < 178 && r > b; };
function pequeno(fuente, lado) { const k = Math.min(1, lado / Math.max(fuente.width, fuente.height)), c = document.createElement('canvas'); c.width = Math.max(4, Math.round(fuente.width * k)); c.height = Math.max(4, Math.round(fuente.height * k)); const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(fuente, 0, 0, c.width, c.height); return { c, g, d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height }; }

// Devuelve { x, y, w, h, ojos: [{x,y},{x,y}], r (radio de ojo) } en 0..1, o null
export async function detectarCara(fuente) {
  try {
    if ('FaceDetector' in window) {
      const fd = new window.FaceDetector({ fastMode: false, maxDetectedFaces: 3 }), caras = await fd.detect(fuente);
      if (caras && caras.length) {
        const c = caras.sort((a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height)[0], bb = c.boundingBox, W = fuente.width, H = fuente.height;
        const ojos = (c.landmarks || []).filter(l => l.type === 'eye').map(l => { const p = l.locations && l.locations[0]; return p ? { x: p.x / W, y: p.y / H } : null; }).filter(Boolean);
        const caja = { x: bb.x / W, y: bb.y / H, w: bb.width / W, h: bb.height / H };
        return completar(caja, ojos.length === 2 ? ojos.sort((a, b) => a.x - b.x) : null, fuente, 'sistema');
      }
    }
  } catch (e) { }
  return heuristica(fuente);
}
function heuristica(fuente) {
  const { d, W, H } = pequeno(fuente, 220), N = W * H, piel = new Uint8Array(N);
  for (let p = 0, i = 0; p < N; p++, i += 4) piel[p] = esPiel(d[i], d[i + 1], d[i + 2]) ? 1 : 0;
  // manchas de piel conectadas
  const et = new Int32Array(N).fill(-1), cola = new Int32Array(N), manchas = [];
  for (let p = 0; p < N; p++) {
    if (!piel[p] || et[p] >= 0) continue;
    let a = 0, b = 0, x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0; cola[b++] = p; et[p] = manchas.length;
    while (a < b) { const q = cola[a++], x = q % W, y = (q / W) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const r of [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1]) if (r >= 0 && piel[r] && et[r] < 0) { et[r] = manchas.length; cola[b++] = r; } }
    manchas.push({ n, x0, y0, x1, y1 });
  }
  const cands = manchas.filter(m => m.n > N * 0.01).map(m => { const w = m.x1 - m.x0 + 1, hh = Math.min(m.y1 - m.y0 + 1, w * 1.45); return Object.assign(m, { w, hh, lleno: m.n / (w * (m.y1 - m.y0 + 1)) }); })
    .filter(m => m.w / m.hh > 0.45 && m.w / m.hh < 1.6 && m.lleno > 0.35).sort((a, b) => b.n - a.n);
  if (!cands.length) return null;
  const m = cands[0], caja = { x: m.x0 / W, y: m.y0 / H, w: m.w / W, h: m.hh / H };
  return completar(caja, null, fuente, 'piel');
}
// Si faltan los ojos, se buscan las zonas oscuras en la franja de arriba de la cara
function completar(caja, ojos, fuente, como) {
  if (!ojos) {
    const { d, W, H } = pequeno(fuente, 360);
    const busca = (x0, x1) => {
      const ya = caja.y + caja.h * 0.24, yb = caja.y + caja.h * 0.55; let sx = 0, sy = 0, sw = 0, suma = 0, n = 0;
      for (let y = Math.floor(ya * H); y < yb * H; y++) for (let x = Math.floor(x0 * W); x < x1 * W; x++) { const i = (y * W + x) * 4; suma += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; }
      const media = n ? suma / n : 128;
      for (let y = Math.floor(ya * H); y < yb * H; y++) for (let x = Math.floor(x0 * W); x < x1 * W; x++) { const i = (y * W + x) * 4, l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2], w = Math.max(0, media * 0.78 - l); sx += x * w; sy += y * w; sw += w; }
      return sw > 0 ? { x: sx / sw / W, y: sy / sw / H } : { x: (x0 + x1) / 2, y: caja.y + caja.h * 0.4 };
    };
    ojos = [busca(caja.x + caja.w * 0.12, caja.x + caja.w * 0.48), busca(caja.x + caja.w * 0.52, caja.x + caja.w * 0.88)];
  }
  const r = Math.max(0.01, Math.hypot(ojos[1].x - ojos[0].x, (ojos[1].y - ojos[0].y)) * 0.28);
  return Object.assign({}, caja, { ojos, r, como });
}

// ---------- Retoque (sobre un lienzo ya del tamaño final). cara en 0..1 · a = ajustes 0..100 ----------
function desenfocar(cv, r) { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d', { willReadFrequently: true }); if ('filter' in g) g.filter = 'blur(' + r + 'px)'; g.drawImage(cv, 0, 0); g.filter = 'none'; return g.getImageData(0, 0, c.width, c.height); }
export function retocar(cv, cara, a) {
  if (!cara || !a) return cv;
  const W = cv.width, H = cv.height, g = cv.getContext('2d', { willReadFrequently: true });
  const fx = cara.x * W, fy = cara.y * H, fw = cara.w * W, fh = cara.h * H, fcx = fx + fw / 2, fcy = fy + fh / 2;
  const total = Object.values(a).reduce((s, v) => s + (Number(v) || 0), 0); if (!total) return cv;
  // 1) agrandar ojos (deformación suave alrededor de cada ojo)
  if (a.grandes > 0) {
    const src = g.getImageData(0, 0, W, H), dst = g.createImageData(W, H); dst.data.set(src.data);
    const R = Math.max(6, cara.r * Math.max(W, H) * 2.1), k = a.grandes / 100 * 0.35;
    cara.ojos.forEach(o => {
      const ox = o.x * W, oy = o.y * H;
      for (let y = Math.max(0, Math.floor(oy - R)); y < Math.min(H, oy + R); y++) for (let x = Math.max(0, Math.floor(ox - R)); x < Math.min(W, ox + R); x++) {
        const dx = x - ox, dy = y - oy, dd = Math.hypot(dx, dy) / R; if (dd >= 1) continue;
        const s = 1 - k * (1 - dd * dd), sx = ox + dx * s, sy = oy + dy * s, x0 = Math.floor(sx), y0 = Math.floor(sy), tx = sx - x0, ty = sy - y0;
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) { const p = (yy, xx) => src.data[(Math.min(H - 1, Math.max(0, yy)) * W + Math.min(W - 1, Math.max(0, xx))) * 4 + c]; dst.data[i + c] = (p(y0, x0) * (1 - tx) + p(y0, x0 + 1) * tx) * (1 - ty) + (p(y0 + 1, x0) * (1 - tx) + p(y0 + 1, x0 + 1) * tx) * ty; }
      }
    });
    g.putImageData(dst, 0, 0);
  }
  const img = g.getImageData(0, 0, W, H), d = img.data;
  const rB = Math.max(1.5, fw / 55), bl = a.piel > 0 ? desenfocar(cv, rB).data : null, glow = a.glow > 0 ? desenfocar(cv, Math.max(3, fw / 14)).data : null;
  const kP = a.piel / 100, kL = a.luz / 100 * 26, kO = a.ojos / 100, kR = a.rubor / 100, kB = a.bronce / 100, kG = a.glow / 100;
  const er = Math.max(4, cara.r * Math.max(W, H) * 1.5), ojosPx = cara.ojos.map(o => [o.x * W, o.y * H]);
  const mej = [[fx + fw * 0.24, fy + fh * 0.66], [fx + fw * 0.76, fy + fh * 0.66]], mr = fw * 0.17;
  const x0 = Math.max(0, Math.floor(fx - fw * 0.25)), x1 = Math.min(W, Math.ceil(fx + fw * 1.25)), y0 = Math.max(0, Math.floor(fy - fh * 0.25)), y1 = Math.min(H, Math.ceil(fy + fh * 1.35));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4; let r = d[i], gg = d[i + 1], b = d[i + 2];
    // peso de la cara: 1 dentro del óvalo, se apaga suave fuera
    const ex = (x - fcx) / (fw * 0.62), ey = (y - fcy) / (fh * 0.68), dc = ex * ex + ey * ey; if (dc > 1.6) continue;
    const wc = dc < 1 ? 1 : Math.max(0, 1 - (dc - 1) / 0.6);
    const piel = esPiel(r, gg, b) ? 1 : 0.15;
    // ojos: cerca de ellos no se alisa
    let wOjo = 0; for (const [ox, oy] of ojosPx) { const de = Math.hypot(x - ox, (y - oy) * 1.5) / er; if (de < 1) wOjo = Math.max(wOjo, 1 - de); }
    if (bl) { const j = i, diff = Math.abs(bl[j] - r) + Math.abs(bl[j + 1] - gg) + Math.abs(bl[j + 2] - b), borde = Math.exp(-diff * diff / 1800), k = kP * wc * piel * borde * (1 - wOjo) * 0.92;
      r += (bl[j] - r) * k; gg += (bl[j + 1] - gg) * k; b += (bl[j + 2] - b) * k; }
    if (kL) { const k = kL * wc * (piel > 0.5 ? 1 : 0.08); r += k; gg += k; b += k * 0.9; }
    if (kB) { const k = kB * wc * piel; r = r * (1 - 0.1 * k) + 18 * k; gg = gg * (1 - 0.14 * k) + 6 * k; b = b * (1 - 0.26 * k); }
    if (kR) { let wm = 0; for (const [mx, my] of mej) { const dm = Math.hypot(x - mx, y - my) / mr; if (dm < 1) wm = Math.max(wm, (1 - dm) * (1 - dm)); } if (wm) { const k = kR * wm * piel * 0.32; r += (232 - r) * k; gg += (128 - gg) * k * 0.6; b += (140 - b) * k * 0.6; } }
    if (kO && wOjo) { const k = kO * wOjo; const l = 0.299 * r + 0.587 * gg + 0.114 * b, c = 1 + 0.45 * k; r = l + (r - l) * (1 + 0.3 * k); gg = l + (gg - l) * (1 + 0.3 * k); b = l + (b - l) * (1 + 0.3 * k); r = 128 + (r - 128) * c + 10 * k; gg = 128 + (gg - 128) * c + 10 * k; b = 128 + (b - 128) * c + 12 * k; }
    if (glow) { const k = kG * wc * 0.45 * (piel > 0.5 ? 1 : 0.1); r = 255 - (255 - r) * (255 - glow[i] * k) / 255; gg = 255 - (255 - gg) * (255 - glow[i + 1] * k) / 255; b = 255 - (255 - b) * (255 - glow[i + 2] * k) / 255; }
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r; d[i + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg; d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  g.putImageData(img, 0, 0);
  return cv;
}
