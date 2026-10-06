// ================= v13.12 · BIOUVISION · BANCO DE FONDOS =================
// Fondos listos para poner detrás del producto recortado. Se GENERAN aquí mismo (estudio, mármol, madera, lino, hormigón,
// terrazo, pastel, luces bokeh, atardecer, papel kraft, ladrillo, navidad…): sin descargas y sin derechos de autor.
function rnd(seed) { let s = seed >>> 0 || 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function ruido(W, H, escala, oct, seed) { // value noise fractal en una rejilla pequeña, escalada suave
  const out = new Float32Array(W * H), r = rnd(seed);
  let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const gw = Math.max(2, Math.ceil(W / escala) + 2), gh = Math.max(2, Math.ceil(H / escala) + 2), grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0; y < H; y++) { const fy = y / escala, y0 = fy | 0, ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < W; x++) { const fx = x / escala, x0 = fx | 0, tx = fx - x0, sx = tx * tx * (3 - 2 * tx), a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1], c = grid[(y0 + 1) * gw + x0], d = grid[(y0 + 1) * gw + x0 + 1];
        out[y * W + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy); } }
    tot += amp; amp *= 0.5; escala /= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function pintaCampo(g, W, H, f) { const im = g.createImageData(W, H), d = im.data; for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) { const c = f(x, y, y * W + x); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } g.putImageData(im, 0, 0); }
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function estudio(g, W, H, c1, c2) { const gr = g.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.05, W / 2, H * 0.5, Math.max(W, H) * 0.75); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, W, H); const s = g.createLinearGradient(0, H * 0.62, 0, H); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,0.07)'); g.fillStyle = s; g.fillRect(0, 0, W, H); }
const GEN = {
  estudio_blanco: (g, W, H) => estudio(g, W, H, '#ffffff', '#e9e6e2'),
  estudio_gris: (g, W, H) => estudio(g, W, H, '#f1f2f4', '#b9bec7'),
  rosa_pastel: (g, W, H) => estudio(g, W, H, '#ffe4ec', '#f6b7c9'),
  menta: (g, W, H) => estudio(g, W, H, '#e6fbf2', '#a9e3cc'),
  lavanda: (g, W, H) => estudio(g, W, H, '#f1ebff', '#c9b8f2'),
  arena: (g, W, H) => estudio(g, W, H, '#fbf3e6', '#e2cfae'),
  marmol_blanco: (g, W, H) => { const n = ruido(W, H, Math.max(W, H) / 3, 6, 11), base = [244, 242, 238], vena = [150, 150, 158]; pintaCampo(g, W, H, (x, y, i) => { const v = Math.abs(Math.sin((x * 0.6 + y) / Math.max(W, H) * 9 + n[i] * 9)); const t = Math.pow(1 - v, 18) * 0.8 + Math.pow(1 - v, 4) * 0.08; return mezcla(base, vena, t); }); },
  marmol_negro: (g, W, H) => { const n = ruido(W, H, Math.max(W, H) / 3, 6, 21), base = [24, 25, 30], vena = [210, 200, 180]; pintaCampo(g, W, H, (x, y, i) => { const v = Math.abs(Math.sin((x + y * 0.4) / Math.max(W, H) * 8 + n[i] * 10)); return mezcla(base, vena, Math.pow(1 - v, 22) * 0.75); }); },
  madera_clara: (g, W, H) => { const n = ruido(W, H, Math.max(W, H) / 5, 5, 31); pintaCampo(g, W, H, (x, y, i) => { const v = (Math.sin((y / H) * 70 + n[i] * 14) + 1) / 2, t = 0.25 + v * 0.35 + n[i] * 0.2, tabla = Math.floor(x / (W / 5)) % 2 ? 0.04 : 0; return mezcla([229, 199, 158], [180, 132, 86], Math.min(1, t + tabla)); }); },
  madera_oscura: (g, W, H) => { const n = ruido(W, H, Math.max(W, H) / 5, 5, 41); pintaCampo(g, W, H, (x, y, i) => { const v = (Math.sin((y / H) * 60 + n[i] * 16) + 1) / 2; return mezcla([118, 76, 46], [58, 34, 20], 0.3 + v * 0.45 + n[i] * 0.2); }); },
  lino: (g, W, H) => { const n = ruido(W, H, 40, 3, 51), r = rnd(5); pintaCampo(g, W, H, (x, y, i) => { const t = (Math.sin(x * 1.3) * Math.sin(y * 1.3) * 0.5 + 0.5) * 0.1 + n[i] * 0.14 + r() * 0.05; return mezcla([238, 232, 220], [196, 186, 168], t); }); },
  hormigon: (g, W, H) => { const n = ruido(W, H, Math.max(W, H) / 4, 7, 61), r = rnd(9); pintaCampo(g, W, H, (x, y, i) => { const t = n[i] * 0.55 + r() * 0.1 + (r() < 0.002 ? 0.3 : 0); return mezcla([206, 205, 202], [128, 127, 124], t); }); },
  terrazo: (g, W, H) => { g.fillStyle = '#f2ede6'; g.fillRect(0, 0, W, H); const r = rnd(71), cols = ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#b8b8b8', '#c9a227']; for (let i = 0; i < W * H / 900; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.beginPath(); const x = r() * W, y = r() * H, s = 2 + r() * Math.max(W, H) / 160; g.moveTo(x, y); for (let k = 0; k < 5; k++) g.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2); g.fill(); } },
  kraft: (g, W, H) => { const n = ruido(W, H, 30, 4, 81), r = rnd(3); pintaCampo(g, W, H, (x, y, i) => mezcla([204, 163, 113], [168, 124, 78], n[i] * 0.6 + r() * 0.12)); },
  ladrillo: (g, W, H) => { g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, W, H); const bh = Math.max(14, H / 18), bw = bh * 2.6; g.strokeStyle = 'rgba(160,150,140,0.55)'; g.lineWidth = Math.max(1, bh / 9); for (let y = 0, f = 0; y < H + bh; y += bh, f++) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (f % 2) * bw / 2; x < W; x += bw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke(); } } const n = ruido(W, H, 60, 4, 91), im = g.getImageData(0, 0, W, H); for (let i = 0; i < n.length; i++) { const k = (n[i] - 0.5) * 22; im.data[i * 4] += k; im.data[i * 4 + 1] += k; im.data[i * 4 + 2] += k; } g.putImageData(im, 0, 0); },
  bokeh: (g, W, H) => { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#1e1b4b'); gr.addColorStop(1, '#4c1d95'); g.fillStyle = gr; g.fillRect(0, 0, W, H); const r = rnd(101); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H, s = Math.max(W, H) * (0.015 + r() * 0.06), c = ['255,200,120', '255,150,200', '160,200,255', '255,240,200'][i % 4], rg = g.createRadialGradient(x, y, 0, x, y, s); rg.addColorStop(0, 'rgba(' + c + ',0.55)'); rg.addColorStop(0.7, 'rgba(' + c + ',0.25)'); rg.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } g.globalCompositeOperation = 'source-over'; },
  navidad: (g, W, H) => { estudio(g, W, H, '#b91c1c', '#5b0d0d'); const r = rnd(111); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 45; i++) { const x = r() * W, y = r() * H * 0.7, s = Math.max(W, H) * (0.01 + r() * 0.04), rg = g.createRadialGradient(x, y, 0, x, y, s); rg.addColorStop(0, 'rgba(255,215,130,0.6)'); rg.addColorStop(1, 'rgba(255,215,130,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } g.globalCompositeOperation = 'source-over'; },
  atardecer: (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b1055'); gr.addColorStop(0.45, '#d16ba5'); gr.addColorStop(0.75, '#ffb88c'); gr.addColorStop(1, '#ffe7c7'); g.fillStyle = gr; g.fillRect(0, 0, W, H); const s = g.createRadialGradient(W / 2, H * 0.78, 0, W / 2, H * 0.78, H * 0.35); s.addColorStop(0, 'rgba(255,240,200,0.9)'); s.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = s; g.fillRect(0, 0, W, H); },
  mesa_blanca: (g, W, H) => { estudio(g, W, H, '#fbfbfb', '#e4e4e4'); const y = H * 0.7, gr = g.createLinearGradient(0, y, 0, H); gr.addColorStop(0, '#f3f1ee'); gr.addColorStop(1, '#dedad4'); g.fillStyle = gr; g.fillRect(0, y, W, H - y); g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, y, W, Math.max(2, H / 300)); }
};
export const BANCO = [['estudio_blanco', 'Estudio blanco'], ['estudio_gris', 'Estudio gris'], ['mesa_blanca', 'Mesa blanca'], ['rosa_pastel', 'Rosa pastel'], ['menta', 'Menta'], ['lavanda', 'Lavanda'], ['arena', 'Arena'],
  ['marmol_blanco', 'Mármol blanco'], ['marmol_negro', 'Mármol negro'], ['madera_clara', 'Madera clara'], ['madera_oscura', 'Madera oscura'], ['lino', 'Lino'], ['hormigon', 'Hormigón'], ['terrazo', 'Terrazo'],
  ['kraft', 'Papel kraft'], ['ladrillo', 'Ladrillo blanco'], ['bokeh', 'Luces bokeh'], ['atardecer', 'Atardecer'], ['navidad', 'Navidad']];
const cache = new Map();
// Lienzo del fondo (máx. 1600 px de lado; se escala al pegarlo). Se guarda en memoria para no repetir.
export function fondoBanco(id, W, H) {
  const k = Math.min(1, 1600 / Math.max(W, H)), w = Math.max(8, Math.round(W * k)), hh = Math.max(8, Math.round(H * k)), key = id + ':' + w + 'x' + hh;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = hh; (GEN[id] || GEN.estudio_blanco)(c.getContext('2d'), w, hh);
  if (cache.size > 12) cache.delete(cache.keys().next().value);
  cache.set(key, c); return c;
}
export function miniatura(id, w = 96, hh = 72) { const c = document.createElement('canvas'); c.width = w; c.height = hh; (GEN[id] || GEN.estudio_blanco)(c.getContext('2d'), w, hh); return c; }
