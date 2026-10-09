// ================= v13.12 · VIDA · GRÁFICOS PIXEL (estilo Pokémon / Animal Crossing) =================
// Todo se dibuja aquí con píxeles de verdad (casillas de 16 px que luego se ven ×3, sin difuminar): el suelo con hierba,
// flores y caminos, el agua, los árboles y, sobre todo, cada edificio con lo que es (la casa con chimenea y jardín, el
// mercado con su toldo y cajas de fruta, la cafetería con mesas y sombrillas, la tienda con escaparate y maniquíes…)
// y los personajes, con su pelo, su ropa y su forma de andar en 4 direcciones. Sin imágenes externas.
export const PX = 3, TS = 16; // 1 píxel = 3 px de pantalla · casilla = 16 píxeles (= 48 px)

const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function oscurecer(hex, k) { const n = parseInt(String(hex || '#888888').slice(1), 16); let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, Math.round(r * k))); gg = Math.max(0, Math.min(255, Math.round(gg * k))); b = Math.max(0, Math.min(255, Math.round(b * k))); return '#' + ((1 << 24) + (r << 16) + (gg << 8) + b).toString(16).slice(1); }

// ---------- Suelo del barrio (se dibuja una vez) ----------
export function mapaBase(MW, MH, zonas) {
  const [c, g] = lienzo(MW * TS, MH * TS), r = rng('suelo');
  // hierba con tres verdes y matitas
  for (let y = 0; y < MH * TS; y += 2) for (let x = 0; x < MW * TS; x += 2) { const v = r(); R(g, v < 0.55 ? '#7ccf63' : v < 0.9 ? '#74c65b' : '#86d66d', x, y, 2, 2); }
  for (let i = 0; i < MW * MH * 1.4; i++) { const x = Math.floor(r() * MW * TS), y = Math.floor(r() * MH * TS); R(g, '#5fb04a', x, y, 1, 2); R(g, '#5fb04a', x + 2, y + 1, 1, 1); }
  // flores sueltas
  const FL = ['#fde047', '#f472b6', '#ffffff', '#a78bfa', '#fb923c'];
  for (let i = 0; i < MW * MH * 0.35; i++) { const x = Math.floor(r() * MW * TS), y = Math.floor(r() * MH * TS), col = FL[Math.floor(r() * FL.length)]; R(g, col, x, y, 1, 1); R(g, col, x + 2, y, 1, 1); R(g, col, x + 1, y - 1, 1, 1); R(g, col, x + 1, y + 1, 1, 1); R(g, '#fbbf24', x + 1, y, 1, 1); }
  // parque más oscuro con caminitos
  const [px0, py0, pw, ph] = zonas.parque; for (let y = py0 * TS; y < (py0 + ph) * TS; y += 2) for (let x = px0 * TS; x < (px0 + pw) * TS; x += 2) R(g, r() < 0.6 ? '#68bd52' : '#5fb04a', x, y, 2, 2);
  // calles: adoquín gris con bordillo y raya
  zonas.calles.forEach(([x0, y0, w, h]) => {
    for (let y = y0 * TS; y < (y0 + h) * TS; y += 4) for (let x = x0 * TS; x < (x0 + w) * TS; x += 4) { R(g, r() < 0.5 ? '#9ca3af' : '#a3aab5', x, y, 4, 4); R(g, '#8b929d', x, y + 3, 4, 1); R(g, '#8b929d', x + 3, y, 1, 4); }
    if (w > h) { R(g, '#d1d5db', x0 * TS, y0 * TS, w * TS, 1); R(g, '#d1d5db', x0 * TS, (y0 + h) * TS - 1, w * TS, 1); for (let x = x0 * TS; x < (x0 + w) * TS; x += 12) R(g, '#fde68a', x, (y0 + h / 2) * TS - 1, 6, 2); }
    else { R(g, '#d1d5db', x0 * TS, y0 * TS, 1, h * TS); R(g, '#d1d5db', (x0 + w) * TS - 1, y0 * TS, 1, h * TS); for (let y = y0 * TS; y < (y0 + h) * TS; y += 12) R(g, '#fde68a', (x0 + w / 2) * TS - 1, y, 2, 6); }
  });
  // plaza: baldosas crema en damero
  const [qx, qy, qw, qh] = zonas.plaza;
  for (let y = qy * TS; y < (qy + qh) * TS; y += 8) for (let x = qx * TS; x < (qx + qw) * TS; x += 8) { R(g, ((x + y) / 8) % 2 ? '#f1e3cc' : '#e8d5b5', x, y, 8, 8); R(g, '#d9c29b', x, y + 7, 8, 1); }
  // huerto: tierra con surcos y valla
  if (zonas.huerto) {
    const [hx, hy, hw, hh] = zonas.huerto;
    R(g, '#8b5a2b', hx * TS, hy * TS, hw * TS, hh * TS);
    for (let y = hy * TS + 2; y < (hy + hh) * TS; y += 4) R(g, '#7a4b22', hx * TS, y, hw * TS, 1);
    for (let x = hx * TS - 2; x <= (hx + hw) * TS + 1; x += 6) { R(g, '#fef3c7', x, hy * TS - 6, 2, 8); R(g, '#fef3c7', x, (hy + hh) * TS - 2, 2, 8); }
    R(g, '#fde68a', hx * TS - 2, hy * TS - 4, hw * TS + 4, 1); R(g, '#fde68a', hx * TS - 2, (hy + hh) * TS + 1, hw * TS + 4, 1);
  }
  return c;
}
// El estanque, con borde de piedras y reflejos que se mueven
export function agua(g, x, y, w, h, t) {
  g.save(); g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#3b82f6'; g.fillRect(x, y, w, h);
  g.fillStyle = '#60a5fa'; for (let i = 0; i < 9; i++) { const xx = x + ((i * 37 + t / 40) % w), yy = y + 6 + (i * 13) % (h - 10); g.fillRect(Math.round(xx / PX) * PX, Math.round(yy / PX) * PX, 4 * PX, PX); }
  g.fillStyle = '#bfdbfe'; for (let i = 0; i < 5; i++) { const xx = x + ((i * 53 + t / 25) % w), yy = y + 10 + (i * 17) % (h - 16); g.fillRect(Math.round(xx / PX) * PX, Math.round(yy / PX) * PX, 2 * PX, PX); }
  g.restore();
  g.strokeStyle = '#94a3b8'; g.lineWidth = PX * 2; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.stroke();
}

// ---------- Árboles, arbustos, farolas y bancos (sprites pequeños) ----------
const cacheS = new Map();
function sprite(key, w, h, f) { if (cacheS.has(key)) return cacheS.get(key); const [c, g] = lienzo(w, h); f(g); cacheS.set(key, c); return c; }
export const arbol = (v = 0) => sprite('arbol' + v, 24, 30, g => {
  const hoja = ['#16a34a', '#15803d', '#22c55e'][v % 3], luz = ['#4ade80', '#22c55e', '#86efac'][v % 3], som = '#14532d';
  R(g, 'rgba(0,0,0,.18)', 4, 26, 16, 3); R(g, '#7c4a2a', 10, 18, 4, 10); R(g, '#5b341c', 13, 18, 1, 10);
  const bola = (cx, cy, rr, col) => { for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr + rr * 0.6) R(g, col, cx + x, cy + y, 1, 1); };
  bola(12, 12, 9, som); bola(12, 11, 8, hoja); bola(9, 8, 4, luz); R(g, '#bbf7d0', 7, 6, 2, 1);
  if (v % 3 === 2) [[6, 13], [16, 9], [14, 15], [9, 16]].forEach(([x, y]) => { R(g, '#ef4444', x, y, 2, 2); R(g, '#fecaca', x, y, 1, 1); }); // manzanas
});
export const farola = () => sprite('farola', 8, 30, g => { R(g, '#334155', 3, 6, 2, 22); R(g, '#1e293b', 1, 27, 6, 2); R(g, '#1f2937', 1, 2, 6, 5); R(g, '#fde68a', 2, 3, 4, 3); R(g, '#fff7cc', 3, 3, 1, 1); });
export const banco = () => sprite('banco', 22, 12, g => { R(g, 'rgba(0,0,0,.18)', 1, 10, 20, 2); R(g, '#92400e', 1, 2, 20, 2); R(g, '#b45309', 1, 5, 20, 3); R(g, '#78350f', 1, 8, 20, 1); R(g, '#374151', 2, 8, 2, 3); R(g, '#374151', 18, 8, 2, 3); });
export const arbusto = () => sprite('arbusto', 14, 10, g => { R(g, 'rgba(0,0,0,.15)', 1, 8, 12, 2); R(g, '#15803d', 1, 3, 12, 6); R(g, '#16a34a', 2, 1, 10, 6); R(g, '#4ade80', 3, 2, 3, 2); R(g, '#f472b6', 8, 3, 2, 2); R(g, '#f472b6', 4, 5, 2, 2); });

// ---------- Edificios (cada uno con lo que es) ----------
// Devuelve un lienzo en píxeles del tamaño w×h casillas + tejado; puerta en el centro de la fachada de abajo.
export function edificio(b) {
  return sprite('ed:' + b.id + ':' + b.w + 'x' + b.h, b.w * TS + 8, b.h * TS + 22, g => {
    const W = b.w * TS, H = b.h * TS, ox = 4, oy = 18, fach = Math.min(H * 0.55, 38), techoH = H - fach, puertaX = ox + W / 2;
    // sombra
    R(g, 'rgba(0,0,0,.2)', ox + 3, oy + H - 2, W, 5);
    const pared = (c1, c2) => { R(g, c1, ox, oy + techoH, W, fach); for (let y = oy + techoH + 3; y < oy + H; y += 4) R(g, c2, ox, y, W, 1); };
    const tejado = (c1, c2, c3) => { for (let y = 0; y < techoH + 4; y++) { const inset = Math.max(0, 4 - y); R(g, y % 4 === 3 ? c2 : c1, ox - 3 + inset, oy - 2 + y, W + 6 - inset * 2, 1); } for (let x = ox - 2; x < ox + W + 3; x += 6) R(g, c2, x, oy, 1, techoH + 1); R(g, c3, ox - 3, oy + techoH + 1, W + 6, 2); };
    const ventana = (x, y, w, h, luz) => { R(g, '#f8fafc', x - 1, y - 1, w + 2, h + 2); R(g, luz || '#93c5fd', x, y, w, h); R(g, '#dbeafe', x + 1, y + 1, Math.max(1, w / 3), 1); R(g, '#f8fafc', x + w / 2 - 0.5, y, 1, h); };
    const puerta = (col, w = 8, h = 12) => { R(g, '#3f2a1a', puertaX - w / 2 - 1, oy + H - h - 1, w + 2, h + 1); R(g, col, puertaX - w / 2, oy + H - h, w, h); R(g, '#fbbf24', puertaX + w / 2 - 3, oy + H - h / 2, 1, 1); R(g, '#d6d3d1', puertaX - w / 2 - 2, oy + H, w + 4, 2); };
    const letrero = (txtCol, fondo, borde) => { R(g, borde, puertaX - 13, oy + techoH - 9, 26, 9); R(g, fondo, puertaX - 12, oy + techoH - 8, 24, 7); };
    switch (b.id) {
      case 'casa': // casita con chimenea, jardín y flores
        pared('#fde7c8', '#f5d6ae'); tejado('#ea580c', '#c2410c', '#9a3412');
        R(g, '#78716c', ox + W - 18, oy - 12, 7, 14); R(g, '#57534e', ox + W - 19, oy - 13, 9, 2);
        ventana(ox + 8, oy + techoH + 8, 12, 10); ventana(ox + W - 20, oy + techoH + 8, 12, 10);
        [[ox + 7, '#ef4444'], [ox + W - 21, '#f472b6']].forEach(([x, col]) => { R(g, '#92400e', x, oy + techoH + 19, 14, 3); for (let i = 0; i < 6; i++) R(g, i % 2 ? col : '#22c55e', x + 1 + i * 2, oy + techoH + 17, 2, 2); });
        puerta('#b45309'); break;
      case 'vip': // club con neón, alfombra roja y cordones
        pared('#2e1065', '#1e0b47'); tejado('#4c1d95', '#3b0764', '#7c3aed');
        for (let x = ox; x < ox + W; x += 4) { R(g, '#f0abfc', x, oy + techoH, 2, 1); R(g, '#67e8f9', x + 2, oy + H - 1, 2, 1); }
        ventana(ox + 6, oy + techoH + 7, 10, 12, '#a855f7'); ventana(ox + W - 16, oy + techoH + 7, 10, 12, '#a855f7');
        puerta('#111827', 12, 14); R(g, '#dc2626', puertaX - 6, oy + H, 12, 6); R(g, '#fbbf24', puertaX - 12, oy + H - 6, 1, 8); R(g, '#fbbf24', puertaX + 11, oy + H - 6, 1, 8); R(g, '#b91c1c', puertaX - 12, oy + H - 5, 24, 1);
        R(g, '#fde047', puertaX - 3, oy + techoH - 12, 6, 6); R(g, '#fef9c3', puertaX - 1, oy + techoH - 11, 2, 2); break;
      case 'mercado': // toldo de rayas verdes y cajas de fruta
        pared('#fef3c7', '#fde68a'); tejado('#15803d', '#166534', '#14532d');
        for (let x = ox - 2; x < ox + W + 2; x += 6) { R(g, '#16a34a', x, oy + techoH + 2, 3, 6); R(g, '#f8fafc', x + 3, oy + techoH + 2, 3, 6); R(g, (x / 6) % 2 ? '#16a34a' : '#f8fafc', x, oy + techoH + 8, 3, 2); }
        [['#ef4444', ox + 4], ['#f97316', ox + 18], ['#facc15', ox + W - 30], ['#22c55e', ox + W - 16]].forEach(([col, x]) => { R(g, '#a16207', x, oy + H - 9, 12, 8); R(g, '#854d0e', x, oy + H - 5, 12, 1); for (let i = 0; i < 5; i++) R(g, col, x + 1 + i * 2, oy + H - 11 + (i % 2), 2, 2); });
        puerta('#15803d', 10, 11); break;
      case 'cafe': // toldo rosa festoneado, mesas con sombrilla y taza
        pared('#fde2e4', '#fbcfe8'); tejado('#be185d', '#9d174d', '#831843');
        for (let x = ox - 2; x < ox + W + 2; x += 6) { R(g, '#ec4899', x, oy + techoH + 2, 6, 5); R(g, '#fdf2f8', x + 2, oy + techoH + 2, 2, 5); R(g, '#ec4899', x + 1, oy + techoH + 7, 4, 1); }
        ventana(ox + 6, oy + techoH + 11, 14, 9, '#fde68a'); ventana(ox + W - 20, oy + techoH + 11, 14, 9, '#fde68a');
        R(g, '#fff', puertaX - 4, oy + techoH - 8, 8, 6); R(g, '#7c2d12', puertaX - 3, oy + techoH - 7, 6, 2); R(g, '#fff', puertaX + 4, oy + techoH - 7, 2, 3);
        puerta('#9d174d'); break;
      case 'salud': // blanco con cruz y puertas de cristal
        pared('#f8fafc', '#e2e8f0'); tejado('#0284c7', '#0369a1', '#075985');
        R(g, '#ef4444', puertaX - 2, oy + techoH - 12, 4, 10); R(g, '#ef4444', puertaX - 5, oy + techoH - 9, 10, 4);
        ventana(ox + 6, oy + techoH + 7, 12, 10); ventana(ox + W - 18, oy + techoH + 7, 12, 10);
        R(g, '#7dd3fc', puertaX - 7, oy + H - 13, 14, 13); R(g, '#e0f2fe', puertaX - 6, oy + H - 12, 2, 11); R(g, '#0ea5e9', puertaX, oy + H - 13, 1, 13); break;
      case 'tienda': // escaparate con maniquíes y percha
        pared('#fce7f3', '#fbcfe8'); tejado('#db2777', '#be185d', '#9d174d');
        R(g, '#f9fafb', ox + 4, oy + techoH + 5, W - 8, 16); R(g, '#bae6fd', ox + 5, oy + techoH + 6, W - 10, 14);
        [[ox + 10, '#f472b6'], [ox + 22, '#60a5fa'], [ox + W - 26, '#facc15'], [ox + W - 14, '#a78bfa']].forEach(([x, col]) => { R(g, '#fde7d6', x + 1, oy + techoH + 7, 3, 3); R(g, col, x, oy + techoH + 10, 5, 6); R(g, '#374151', x + 1, oy + techoH + 16, 1, 3); R(g, '#374151', x + 3, oy + techoH + 16, 1, 3); });
        R(g, '#111827', puertaX - 4, oy + techoH - 10, 8, 1); R(g, '#111827', puertaX, oy + techoH - 12, 1, 2); R(g, '#111827', puertaX - 4, oy + techoH - 10, 1, 3); R(g, '#111827', puertaX + 3, oy + techoH - 10, 1, 3);
        puerta('#be185d'); break;
      case 'escuela': // ladrillo, campanario, reloj y bandera
        pared('#c2410c', '#9a3412'); for (let y = oy + techoH + 2; y < oy + H; y += 4) for (let x = ox + ((y / 4) % 2) * 3; x < ox + W; x += 6) R(g, '#7c2d12', x, y, 1, 3);
        tejado('#6d28d9', '#5b21b6', '#4c1d95');
        R(g, '#ede9fe', puertaX - 6, oy - 16, 12, 14); R(g, '#5b21b6', puertaX - 7, oy - 18, 14, 3); R(g, '#fff', puertaX - 3, oy - 12, 6, 6); R(g, '#111827', puertaX, oy - 11, 1, 3); R(g, '#111827', puertaX, oy - 9, 2, 1);
        R(g, '#6b7280', puertaX + 7, oy - 26, 1, 12); R(g, '#ef4444', puertaX + 8, oy - 26, 7, 2); R(g, '#facc15', puertaX + 8, oy - 24, 7, 2); R(g, '#ef4444', puertaX + 8, oy - 22, 7, 2);
        ventana(ox + 4, oy + techoH + 6, 8, 9); ventana(ox + W - 12, oy + techoH + 6, 8, 9); puerta('#4c1d95'); break;
      case 'gimnasio': // gris con ventanales y pesa
        pared('#e5e7eb', '#d1d5db'); tejado('#374151', '#1f2937', '#111827');
        ventana(ox + 5, oy + techoH + 5, W / 2 - 14, 14); ventana(ox + W / 2 + 9, oy + techoH + 5, W / 2 - 14, 14);
        R(g, '#111827', puertaX - 9, oy + techoH - 7, 18, 2); R(g, '#111827', puertaX - 11, oy + techoH - 10, 3, 8); R(g, '#111827', puertaX + 8, oy + techoH - 10, 3, 8);
        puerta('#1f2937', 10, 12); break;
      default: pared('#f5f5f4', '#e7e5e4'); tejado('#64748b', '#475569', '#334155'); puerta('#475569');
    }
  });
}
// Puesto del mercadillo (en la plaza): toldo morado de rayas
export const puesto = () => sprite('puesto', 40, 34, g => {
  R(g, 'rgba(0,0,0,.18)', 3, 30, 36, 4); R(g, '#78350f', 4, 12, 2, 20); R(g, '#78350f', 34, 12, 2, 20);
  for (let x = 1; x < 39; x += 6) { R(g, '#7c3aed', x, 4, 3, 9); R(g, '#f5f3ff', x + 3, 4, 3, 9); }
  R(g, '#5b21b6', 1, 13, 38, 2); R(g, '#a16207', 4, 22, 32, 8); R(g, '#854d0e', 4, 26, 32, 1);
  [['#fde047', 7], ['#f472b6', 14], ['#67e8f9', 21], ['#a78bfa', 28]].forEach(([c, x]) => { R(g, c, x, 18, 5, 4); R(g, '#fff', x + 1, 18, 1, 1); });
  R(g, '#fde047', 17, 0, 6, 5); R(g, '#7c3aed', 18, 1, 4, 3);
});
// Cofre del día
export const cofre = abierto => sprite('cofre' + (abierto ? 1 : 0), 18, 16, g => {
  R(g, 'rgba(0,0,0,.2)', 1, 13, 16, 3); R(g, '#92400e', 2, 6, 14, 8); R(g, '#78350f', 2, 9, 14, 1);
  if (abierto) { R(g, '#78350f', 2, 0, 14, 4); R(g, '#fde047', 4, 5, 10, 2); } else { R(g, '#b45309', 1, 2, 16, 5); R(g, '#d97706', 2, 2, 14, 1); }
  R(g, '#facc15', 8, 6, 2, 4); R(g, '#a16207', 2, 6, 1, 8); R(g, '#a16207', 15, 6, 1, 8);
});
export const moneda = f => sprite('moneda' + f, 8, 8, g => { const w = [6, 4, 2, 4][f % 4]; R(g, '#a16207', 4 - w / 2, 1, w, 6); R(g, '#facc15', 4 - w / 2, 1, Math.max(1, w - 1), 5); R(g, '#fef08a', 4 - w / 2 + (w > 2 ? 1 : 0), 2, 1, 2); });

// ---------- Personajes (pixel, 4 direcciones × 3 pasos) ----------
// look = { sexo, aspecto: { piel, pelo, ojos, peinado }, ropa: { top, bajo, zapatos, accesorio } } con los colores ya resueltos
export function personaje(look, dir, paso) {
  const k = JSON.stringify([look.piel, look.pelo, look.ojos, look.peinado, look.top, look.bajo, look.zapatos, look.acc, look.accEst, look.topEst, look.bajoEst, look.nino, dir, paso]);
  return sprite('pj:' + k, 16, 22, g => {
    const piel = look.piel || '#f6d2b8', pelo = look.pelo || '#3b2a20', top = look.top || '#f8fafc', bajo = look.bajo || '#1e40af', zap = look.zapatos || '#e5e7eb', ojo = '#1f2937';
    const pSom = oscurecer(piel, 0.85), peloL = oscurecer(pelo, 1.35), topS = oscurecer(top, 0.8), bajoS = oscurecer(bajo, 0.8);
    const nino = !!look.nino, dy = nino ? 3 : 0;
    // sombra
    R(g, 'rgba(0,0,0,.22)', 3, 20, 10, 2);
    // piernas y zapatos (con el paso)
    const pL = paso === 1 ? -1 : paso === 2 ? 1 : 0;
    if (look.bajoEst === 'falda') { R(g, bajo, 4, 14, 8, 3); R(g, bajoS, 4, 16, 8, 1); R(g, piel, 5, 17 + dy * 0, 2, 2 + pL); R(g, piel, 9, 17, 2, 2 - pL); }
    else if (look.bajoEst === 'corto') { R(g, bajo, 5, 14, 6, 3); R(g, piel, 5, 17, 2, 2 + pL); R(g, piel, 9, 17, 2, 2 - pL); }
    else { R(g, bajo, 5, 14, 3, 5 + pL); R(g, bajo, 8, 14, 3, 5 - pL); R(g, bajoS, 7, 14, 1, 4); }
    R(g, zap, 4, 19 + pL, 4, 1); R(g, zap, 8, 19 - pL, 4, 1); R(g, oscurecer(zap, 0.7), 4, 20 + Math.min(0, pL), 4, 1); R(g, oscurecer(zap, 0.7), 8, 20 + Math.min(0, -pL), 4, 1);
    // cuerpo (camiseta) y brazos que se mueven
    const bA = paso === 1 ? 1 : paso === 2 ? -1 : 0;
    R(g, top, 4, 9, 8, 6); R(g, topS, 4, 13, 8, 1);
    if (look.topEst === 'kimono') { R(g, top, 3, 12, 10, 4); R(g, '#be185d', 4, 12, 8, 1); }
    if (look.topEst === 'chaqueta' || look.topEst === 'sudadera') R(g, topS, 7, 9, 2, 5);
    if (look.topEst === 'marinero') { R(g, '#f8fafc', 5, 9, 6, 2); R(g, '#ef4444', 7, 11, 2, 1); }
    if (dir === 'l' || dir === 'r') { R(g, top, dir === 'r' ? 6 : 7, 9 + bA, 3, 4); R(g, piel, dir === 'r' ? 7 : 7, 13 + bA, 2, 2); }
    else { R(g, top, 3, 9 + bA, 2, 4); R(g, top, 11, 9 - bA, 2, 4); R(g, piel, 3, 13 + bA, 2, 1); R(g, piel, 11, 13 - bA, 2, 1); }
    // cabeza
    R(g, piel, 4, 2, 8, 7); R(g, pSom, 4, 8, 8, 1);
    // pelo según peinado y dirección
    const pz = look.peinado || 'corto';
    R(g, pelo, 3, 1, 10, 3); R(g, peloL, 5, 1, 4, 1);
    if (dir === 'u') R(g, pelo, 3, 1, 10, 8);
    else {
      if (pz === 'largo' || pz === 'media') { R(g, pelo, 3, 3, 2, pz === 'largo' ? 9 : 6); R(g, pelo, 11, 3, 2, pz === 'largo' ? 9 : 6); }
      if (pz === 'coletas') { R(g, pelo, 1, 3, 2, 6); R(g, pelo, 13, 3, 2, 6); R(g, '#f472b6', 2, 3, 2, 1); R(g, '#f472b6', 12, 3, 2, 1); }
      if (pz === 'mono') { R(g, pelo, 6, -1 + 1, 4, 2); R(g, pelo, 5, 0, 6, 1); }
      if (pz === 'flequillo') R(g, pelo, 4, 3, 8, 1);
      if (pz === 'despeinado') { R(g, pelo, 3, 0, 2, 2); R(g, pelo, 9, 0, 3, 1); R(g, pelo, 12, 2, 1, 2); }
      if (pz === 'corto') R(g, pelo, 4, 3, 2, 1);
      // cara: ojos y mejillas
      if (dir === 'd') { R(g, ojo, 5, 5, 2, 2); R(g, ojo, 9, 5, 2, 2); R(g, '#fff', 5, 5, 1, 1); R(g, '#fff', 9, 5, 1, 1); R(g, '#f9a8d4', 4, 7, 1, 1); R(g, '#f9a8d4', 11, 7, 1, 1); R(g, '#be123c', 7, 7, 2, 1); }
      if (dir === 'l') { R(g, ojo, 5, 5, 2, 2); R(g, '#fff', 5, 5, 1, 1); R(g, pelo, 10, 3, 3, 5); R(g, '#f9a8d4', 5, 7, 1, 1); }
      if (dir === 'r') { R(g, ojo, 9, 5, 2, 2); R(g, '#fff', 10, 5, 1, 1); R(g, pelo, 3, 3, 3, 5); R(g, '#f9a8d4', 10, 7, 1, 1); }
    }
    // accesorios
    if (look.accEst === 'gafas' && dir !== 'u') { R(g, '#111827', 4, 5, 8, 1); R(g, '#111827', 4, 5, 3, 3); R(g, '#111827', 9, 5, 3, 3); R(g, '#bfdbfe', 5, 6, 1, 1); R(g, '#bfdbfe', 10, 6, 1, 1); }
    if (look.accEst === 'gorra') { R(g, look.acc, 3, 0, 10, 3); R(g, oscurecer(look.acc, 0.75), dir === 'l' ? 1 : dir === 'r' ? 10 : 4, 2, dir === 'u' ? 0 : 5, 1); }
    if (look.accEst === 'lazo') { R(g, look.acc, 9, 0, 4, 2); R(g, oscurecer(look.acc, 0.7), 10, 0, 2, 2); }
    if (look.accEst === 'gato') { R(g, look.acc, 3, 0, 2, 2); R(g, look.acc, 11, 0, 2, 2); R(g, look.acc, 2, 4, 2, 3); R(g, look.acc, 12, 4, 2, 3); }
  });
}
// Convierte el estado de la Vida en los colores que usa el dibujo
export function lookDe(s, V, edad) {
  const busca = id => (V.buscar(V.CAT.ropa, id) || {}), r = s.ropa || {}, a = s.aspecto || {};
  const t = busca(r.top), b = busca(r.bajo), z = busca(r.zapatos), ac = r.accesorio ? busca(r.accesorio) : {};
  return { piel: a.piel, pelo: a.pelo, ojos: a.ojos, peinado: a.peinado, top: t.color, topEst: t.estilo, bajo: b.color, bajoEst: b.estilo, zapatos: z.color, acc: ac.color, accEst: ac.estilo, nino: (edad || 20) < 12 };
}

// ---------- Casa por dentro: suelo de madera y pared con papel pintado ----------
export function habitacion(gw, gh, estilo = 0) {
  return sprite('hab:' + gw + 'x' + gh + ':' + estilo, gw * TS, (gh + 2) * TS, g => {
    const papel = [['#fde2e4', '#fbcfe8'], ['#e0f2fe', '#bae6fd'], ['#ecfccb', '#d9f99d'], ['#fef3c7', '#fde68a']][estilo % 4];
    R(g, papel[0], 0, 0, gw * TS, 2 * TS); for (let x = 0; x < gw * TS; x += 6) R(g, papel[1], x, 0, 2, 2 * TS - 4);
    R(g, '#fff', 0, 2 * TS - 4, gw * TS, 2); R(g, '#d6d3d1', 0, 2 * TS - 2, gw * TS, 2);
    for (let i = 1; i < gw; i += 3) { R(g, '#f8fafc', i * TS + 3, 6, 10, 12); R(g, '#93c5fd', i * TS + 4, 7, 8, 10); R(g, '#f8fafc', i * TS + 8, 7, 1, 10); R(g, '#dbeafe', i * TS + 5, 8, 2, 1); }
    R(g, '#d6a56c', 0, 2 * TS, gw * TS, gh * TS);
    for (let y = 0; y < gh * TS; y += 4) { for (let x = ((y / 4) % 2) * 8 - 8; x < gw * TS; x += 16) { R(g, '#d6a56c', x, 2 * TS + y, 16, 4); R(g, '#c48f55', x, 2 * TS + y + 3, 16, 1); R(g, '#b77f45', x + 15, 2 * TS + y, 1, 4); } }
  });
}
