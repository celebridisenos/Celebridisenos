// ================= v13.12 · BIOUVISION · FILTROS (LUT .cube y presets de Lightroom .xmp) =================
// · .cube (Adobe/IRIDAS 3D LUT): se lee tal cual y se aplica con interpolación trilineal.
// · .xmp de Lightroom/Camera Raw: se leen sus ajustes principales (exposición, contraste, luces, sombras, blancos, negros,
//   temperatura relativa, intensidad/saturación, HSL por colores, virado partido, curva paramétrica y de puntos, viñeta y
//   grano) y se convierten en una LUT de 33³ equivalente. Es una aproximación fiel del aspecto, no un revelado RAW.
// Los archivos se leen de TU carpeta (RECURSOS) o los eliges tú: el programa no los copia ni los reparte.

export function parseCube(txt) {
  const lines = String(txt).split(/\r?\n/);
  let size = 0, min = [0, 0, 0], max = [1, 1, 1], titulo = '';
  const vals = [];
  for (const l0 of lines) {
    const l = l0.trim(); if (!l || l[0] === '#') continue;
    if (/^TITLE/i.test(l)) { titulo = l.replace(/^TITLE\s*/i, '').replace(/^"|"$/g, ''); continue; }
    if (/^LUT_3D_SIZE/i.test(l)) { size = parseInt(l.split(/\s+/)[1], 10); continue; }
    if (/^LUT_1D_SIZE/i.test(l)) throw new Error('Este .cube es 1D (no se usa para color).');
    if (/^DOMAIN_MIN/i.test(l)) { min = l.split(/\s+/).slice(1, 4).map(Number); continue; }
    if (/^DOMAIN_MAX/i.test(l)) { max = l.split(/\s+/).slice(1, 4).map(Number); continue; }
    if (/^[A-Z_]/i.test(l)) continue;
    const p = l.split(/\s+/); if (p.length >= 3) vals.push(+p[0], +p[1], +p[2]);
  }
  if (!size || vals.length < size * size * size * 3) throw new Error('No parece un archivo .cube válido.');
  return { size, data: new Float32Array(vals.slice(0, size * size * size * 3)), min, max, titulo };
}
// Aplica la LUT a ImageData (en su sitio). intensidad 0..1 mezcla con el original.
export function aplicarLut(img, lut, intensidad = 1) {
  if (!lut || intensidad <= 0) return img;
  const d = img.data, N = lut.size, D = lut.data, n1 = N - 1, k = Math.min(1, intensidad);
  const sx = n1 / ((lut.max[0] - lut.min[0]) || 1) / 255, sy = n1 / ((lut.max[1] - lut.min[1]) || 1) / 255, sz = n1 / ((lut.max[2] - lut.min[2]) || 1) / 255;
  const ox = lut.min[0] * 255, oy = lut.min[1] * 255, oz = lut.min[2] * 255;
  const at = (r, g, b, c) => D[((b * N + g) * N + r) * 3 + c]; // .cube: el rojo cambia más rápido
  for (let i = 0; i < d.length; i += 4) {
    let fr = Math.max(0, Math.min(n1, (d[i] - ox) * sx)), fg = Math.max(0, Math.min(n1, (d[i + 1] - oy) * sy)), fb = Math.max(0, Math.min(n1, (d[i + 2] - oz) * sz));
    const r0 = fr | 0, g0 = fg | 0, b0 = fb | 0, r1 = Math.min(n1, r0 + 1), g1 = Math.min(n1, g0 + 1), b1 = Math.min(n1, b0 + 1);
    const dr = fr - r0, dg = fg - g0, db = fb - b0;
    for (let c = 0; c < 3; c++) {
      const c00 = at(r0, g0, b0, c) * (1 - dr) + at(r1, g0, b0, c) * dr, c10 = at(r0, g1, b0, c) * (1 - dr) + at(r1, g1, b0, c) * dr;
      const c01 = at(r0, g0, b1, c) * (1 - dr) + at(r1, g0, b1, c) * dr, c11 = at(r0, g1, b1, c) * (1 - dr) + at(r1, g1, b1, c) * dr;
      const v = ((c00 * (1 - dg) + c10 * dg) * (1 - db) + (c01 * (1 - dg) + c11 * dg) * db) * 255;
      d[i + c] = d[i + c] + (v - d[i + c]) * k;
    }
  }
  return img;
}

// ---------- Presets de Lightroom (.xmp) ----------
const num = v => { const n = parseFloat(String(v).replace('+', '')); return isFinite(n) ? n : 0; };
export function parseXmp(txt) {
  const t = String(txt);
  if (!/camera-raw-settings/.test(t)) throw new Error('No es un preset de Lightroom.');
  const p = {};
  t.replace(/crs:([A-Za-z0-9]+)="([^"]*)"/g, (m, k, v) => { p[k] = v; return m; });
  const curva = (nombre) => { const m = t.match(new RegExp('<crs:' + nombre + '>[\\s\\S]*?<rdf:Seq>([\\s\\S]*?)</rdf:Seq>')); if (!m) return null; const pts = [...m[1].matchAll(/<rdf:li>\s*(\d+)\s*,\s*(\d+)\s*<\/rdf:li>/g)].map(x => [+x[1], +x[2]]); return pts.length >= 2 ? pts : null; };
  const nombre = ((t.match(/<crs:Name>[\s\S]*?<rdf:li[^>]*>([^<]*)<\/rdf:li>/) || [])[1] || '').trim();
  const grupo = ((t.match(/<crs:Group>[\s\S]*?<rdf:li[^>]*>([^<]*)<\/rdf:li>/) || [])[1] || '').trim();
  if (p.RequiresRGBTables === 'True' || /<crs:RGBTable/.test(t) || p.LookTable) p._tabla = true; // perfiles con tablas internas: solo se aproximan los ajustes
  return { nombre, grupo, p, curvas: { general: curva('ToneCurvePV2012'), r: curva('ToneCurvePV2012Red'), g: curva('ToneCurvePV2012Green'), b: curva('ToneCurvePV2012Blue') } };
}
function curvaTabla(pts) { // spline monótona por los puntos (0..255) → tabla de 256
  const T = new Float32Array(256); if (!pts) { for (let i = 0; i < 256; i++) T[i] = i; return T; }
  const P = pts.slice().sort((a, b) => a[0] - b[0]);
  for (let x = 0; x < 256; x++) {
    let j = 0; while (j < P.length - 2 && x > P[j + 1][0]) j++;
    const [x0, y0] = P[j], [x1, y1] = P[Math.min(j + 1, P.length - 1)], u = x1 === x0 ? 0 : Math.max(0, Math.min(1, (x - x0) / (x1 - x0))), s = u * u * (3 - 2 * u);
    T[x] = y0 + (y1 - y0) * (0.5 * u + 0.5 * s);
  }
  return T;
}
function rgb2hsl(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; if (!s) return [l, l, l]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)]; }
const HUES = [['Red', 0], ['Orange', 30], ['Yellow', 60], ['Green', 120], ['Aqua', 180], ['Blue', 240], ['Purple', 280], ['Magenta', 320]];
// Convierte un preset en LUT 33³
export function lutDePreset(x, N = 33) {
  const p = x.p, ex = num(p.Exposure2012 || p.Exposure), co = num(p.Contrast2012 || p.Contrast) / 100, hi = num(p.Highlights2012) / 100, sh = num(p.Shadows2012) / 100, wh = num(p.Whites2012) / 100, bl = num(p.Blacks2012) / 100;
  const vib = num(p.Vibrance) / 100, sat = num(p.Saturation) / 100, temp = p.IncrementalTemperature !== undefined ? num(p.IncrementalTemperature) / 100 : p.Temperature ? Math.max(-1, Math.min(1, (num(p.Temperature) - 5500) / 3500)) : 0, tint = (p.IncrementalTint !== undefined ? num(p.IncrementalTint) : num(p.Tint)) / 150;
  const fade = 0, clar = num(p.Clarity2012) / 100, deh = num(p.Dehaze) / 100;
  const ps = [num(p.ParametricShadows), num(p.ParametricDarks), num(p.ParametricLights), num(p.ParametricHighlights)].map(v => v / 100);
  const Cg = curvaTabla(x.curvas.general), Cr = curvaTabla(x.curvas.r), Cgg = curvaTabla(x.curvas.g), Cb = curvaTabla(x.curvas.b);
  const hsl = HUES.map(([n, c]) => ({ c, h: num(p['HueAdjustment' + n]) / 100 * 30, s: num(p['SaturationAdjustment' + n]) / 100, l: num(p['LuminanceAdjustment' + n]) / 100 }));
  const st = { sh: num(p.SplitToningShadowHue), ss: num(p.SplitToningShadowSaturation) / 100, hh: num(p.SplitToningHighlightHue), hs: num(p.SplitToningHighlightSaturation) / 100, bal: num(p.SplitToningBalance) / 100 };
  const cg = { s: [num(p.ColorGradeShadowHue), num(p.ColorGradeShadowSat) / 100], m: [num(p.ColorGradeMidtoneHue), num(p.ColorGradeMidtoneSat) / 100], h: [num(p.ColorGradeHighlightHue), num(p.ColorGradeHighlightSat) / 100] };
  const data = new Float32Array(N * N * N * 3), cl = v => v < 0 ? 0 : v > 1 ? 1 : v, lerpT = (T, v) => { const x = cl(v) * 255, i = Math.min(254, x | 0), f = x - i; return (T[i] * (1 - f) + T[i + 1] * f) / 255; };
  for (let bi = 0; bi < N; bi++) for (let gi = 0; gi < N; gi++) for (let ri = 0; ri < N; ri++) {
    let r = ri / (N - 1), g = gi / (N - 1), b = bi / (N - 1);
    // balance de blancos relativo
    r *= 1 + temp * 0.12 + tint * 0.04; b *= 1 - temp * 0.12 + tint * 0.04; g *= 1 - tint * 0.08;
    // exposición
    const e = Math.pow(2, ex); r *= e; g *= e; b *= e;
    // tonos: negros, sombras, luces, blancos (sobre la luminancia, conservando el color)
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b, y2 = y;
    y2 += bl * 0.12 * Math.pow(1 - cl(y), 4) + sh * 0.22 * Math.pow(1 - cl(y), 2) * cl(y) * 2 + hi * 0.22 * cl(y) * cl(y) * (1 - cl(y)) * 2.5 + wh * 0.12 * Math.pow(cl(y), 3);
    y2 += ps[0] * 0.15 * Math.max(0, 1 - y / 0.25) + ps[1] * 0.12 * Math.max(0, 1 - Math.abs(y - 0.37) / 0.2) + ps[2] * 0.12 * Math.max(0, 1 - Math.abs(y - 0.62) / 0.2) + ps[3] * 0.15 * Math.max(0, (y - 0.75) / 0.25);
    // contraste (curva S alrededor de 0.5), claridad y neblina, aproximados globalmente
    const cc = co + clar * 0.25 + deh * 0.3; y2 = 0.5 + (y2 - 0.5) * (1 + cc * 0.6); y2 -= deh * 0.03;
    const f = y > 1e-4 ? y2 / y : 1; r *= f; g *= f; b *= f;
    if (y <= 1e-4) { r = g = b = cl(y2); }
    // curvas de tono
    r = lerpT(Cg, r); g = lerpT(Cg, g); b = lerpT(Cg, b); r = lerpT(Cr, r); g = lerpT(Cgg, g); b = lerpT(Cb, b);
    // HSL por color, intensidad y saturación
    let [hh, ss, ll] = rgb2hsl(cl(r), cl(g), cl(b));
    let dh = 0, ds = 0, dl = 0, wt = 0;
    hsl.forEach(o => { const dist = Math.min(Math.abs(hh - o.c), 360 - Math.abs(hh - o.c)), w = Math.max(0, 1 - dist / 45); if (w) { dh += o.h * w; ds += o.s * w; dl += o.l * w; wt += w; } });
    if (wt) { hh += dh / wt * Math.min(1, wt); ss *= 1 + ds / wt * Math.min(1, wt) * Math.min(1, ss * 2.5); ll += dl / wt * 0.25 * ss * Math.min(1, wt); }
    ss *= 1 + sat; ss *= 1 + vib * (1 - ss) * 0.9; ss = cl(ss); ll = cl(ll);
    [r, g, b] = hsl2rgb(hh, ss, ll);
    // virado partido / gradación de color
    const yy = 0.2126 * r + 0.7152 * g + 0.0722 * b, wS = Math.max(0, 1 - yy * 2 + st.bal * 0.5), wH = Math.max(0, yy * 2 - 1 - st.bal * 0.5);
    const tinta = (hue, s, w) => { if (!s || !w) return; const [tr, tg, tb] = hsl2rgb(hue, 1, 0.5); r += (tr - 0.5) * s * w * 0.35; g += (tg - 0.5) * s * w * 0.35; b += (tb - 0.5) * s * w * 0.35; };
    tinta(st.sh, st.ss, wS); tinta(st.hh, st.hs, wH);
    tinta(cg.s[0], cg.s[1], Math.max(0, 1 - yy * 2)); tinta(cg.m[0], cg.m[1], 1 - Math.abs(yy - 0.5) * 2); tinta(cg.h[0], cg.h[1], Math.max(0, yy * 2 - 1));
    const o = ((bi * N + gi) * N + ri) * 3; data[o] = cl(r); data[o + 1] = cl(g); data[o + 2] = cl(b);
  }
  return { size: N, data, min: [0, 0, 0], max: [1, 1, 1], titulo: x.nombre, vineta: num(p.PostCropVignetteAmount) / 100, grano: num(p.GrainAmount) / 100 };
}
// Viñeta y grano del preset (después de la LUT)
export function efectosPreset(img, lut, k = 1) {
  if (!lut || (!lut.vineta && !lut.grano)) return img;
  const d = img.data, W = img.width, H = img.height, cx = W / 2, cy = H / 2, md = Math.hypot(cx, cy), v = (lut.vineta || 0) * k, gr = (lut.grano || 0) * k * 40;
  let s = 12345;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let m = 1; if (v) { const x = p % W, y = (p / W) | 0; m = 1 + v * 0.8 * Math.pow(Math.hypot(x - cx, y - cy) / md, 2.4); }
    let n = 0; if (gr) { s = (s * 1103515245 + 12345) & 0x7fffffff; n = (s / 0x7fffffff - 0.5) * gr; }
    d[i] = d[i] * m + n; d[i + 1] = d[i + 1] * m + n; d[i + 2] = d[i + 2] * m + n;
  }
  return img;
}
// ¿Es una LUT pensada para vídeo LOG (se ve mal en fotos normales)?
export const esLutLog = nombre => /\blog\s?c?\d?\b|s-?log|v-?log|c-?log|n-?log|f-?log|aces|braw|film gen|redwide|log3g10|lut.*(to|a)\s*rec ?709/i.test(String(nombre || ''));
