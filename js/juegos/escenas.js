// ================= v13.6 · DETECTIVES: dibujos de las escenas =================
// Cada expediente indica un tipo de escena («museo», «tren», «granja»…). Aquí se dibuja en SVG (vectorial, se ve nítido en
// móvil y PC y no pesa nada). Las pruebas se colocan ENCIMA como botones (accesibles) en las posiciones x/y del expediente.
// Para una escena nueva: añade una entrada a ESC con su función de dibujo. Si un tipo no existe se usa «generica».
// Solo se usan constantes propias (nunca texto de fuera), así que el SVG se puede insertar con seguridad.

const R = (x, y, w, h, f, ex = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${ex}/>`;
const C = (x, y, r, f, ex = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${ex}/>`;
const P = (d, f, ex = '') => `<path d="${d}" fill="${f}" ${ex}/>`;
const L = (d, s, w = 2, ex = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" ${ex}/>`;
const E = (x, y, rx, ry, f, ex = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${ex}/>`;
const COL = ['#e0457b', '#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#a855f7'];

// ---------- fondos ----------
const interior = (pared, suelo, zocalo = '#0002') => R(0, 0, 400, 165, pared) + R(0, 158, 400, 7, zocalo) + R(0, 165, 400, 75, suelo) +
  L('M0 200 H400 M60 165 L0 240 M150 165 L120 240 M250 165 L280 240 M340 165 L400 240', '#0001', 1.5);
const exterior = (cielo, suelo, horizonte = 150) => `<defs><linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cielo[0]}"/><stop offset="1" stop-color="${cielo[1]}"/></linearGradient></defs>` +
  R(0, 0, 400, horizonte, 'url(#cielo)') + R(0, horizonte, 400, 240 - horizonte, suelo);
const noche = () => [[30, 20], [80, 40], [140, 15], [200, 35], [260, 18], [320, 42], [370, 22], [110, 60], [300, 64]].map(([x, y]) => C(x, y, 1.6, '#fff', 'opacity=".85"')).join('') + C(350, 34, 14, '#fef3c7') + C(344, 30, 12, '#1e1b4b');
const sol = (x = 340, y = 40) => C(x, y, 18, '#fde68a') + C(x, y, 26, '#fde68a', 'opacity=".25"');
const nubes = () => E(90, 40, 30, 10, '#fff', 'opacity=".9"') + E(110, 34, 20, 10, '#fff', 'opacity=".9"') + E(250, 60, 26, 8, '#fff', 'opacity=".8"');
const montes = (c1 = '#94a3b8', c2 = '#64748b') => P('M0 150 L70 80 L130 130 L190 60 L270 140 L330 90 L400 150 Z', c1) + P('M170 80 L190 60 L210 82 Z', '#fff') + P('M0 150 L60 115 L120 150 Z', c2);

// ---------- objetos ----------
const cuadro = (x, y, w, h, f = '#fcd34d', inner = '#93c5fd') => R(x - 4, y - 4, w + 8, h + 8, f, 'rx="2"') + R(x, y, w, h, inner) + P(`M${x} ${y + h} L${x + w * 0.4} ${y + h * 0.45} L${x + w * 0.7} ${y + h * 0.75} L${x + w} ${y + h * 0.5} V${y + h} Z`, '#16a34a', 'opacity=".7"') + C(x + w * 0.75, y + h * 0.25, Math.min(w, h) * 0.1, '#fde047');
const ventana = (x, y, w, h, cielo = '#bfdbfe') => R(x - 3, y - 3, w + 6, h + 6, '#e5e7eb') + R(x, y, w, h, cielo) + L(`M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`, '#e5e7eb', 3);
const puerta = (x, y = 70, c = '#92400e') => R(x, y, 46, 95, c, 'rx="2"') + R(x + 6, y + 8, 34, 34, '#0002') + R(x + 6, y + 50, 34, 38, '#0002') + C(x + 38, y + 52, 3, '#fcd34d');
const estanteria = (x, y, w, h, c = '#78350f') => {
  let s = R(x, y, w, h, c); const fil = Math.floor(h / 30);
  for (let f = 0; f < fil; f++) { const yy = y + 4 + f * 30; s += R(x + 4, yy, w - 8, 26, '#0003'); let xx = x + 6; let k = f * 3; while (xx < x + w - 12) { const bw = 6 + (k * 7) % 6; s += R(xx, yy + 4 + (k % 3) * 2, bw, 22 - (k % 3) * 2, COL[k % COL.length]); xx += bw + 1; k++; } }
  return s;
};
const mesa = (x, y, w, c = '#a16207') => R(x, y, w, 8, c, 'rx="2"') + R(x + 6, y + 8, 5, 34, c) + R(x + w - 11, y + 8, 5, 34, c);
const mostrador = (x, y, w, h, c = '#7c2d12', tapa = '#d6d3d1') => R(x, y, w, h, c) + R(x - 4, y - 6, w + 8, 8, tapa, 'rx="2"');
const vitrina = (x, y, w, h) => R(x, y + h * 0.55, w, h * 0.45, '#334155') + R(x, y, w, h * 0.55, '#bae6fd', 'opacity=".55" stroke="#64748b" stroke-width="2"') + L(`M${x + 6} ${y + 6} L${x + 18} ${y + h * 0.4}`, '#fff', 2, 'opacity=".7"');
const lampara = (x, y = 0, l = 40) => L(`M${x} ${y} V${y + l}`, '#334155') + P(`M${x - 14} ${y + l + 14} L${x - 7} ${y + l} H${x + 7} L${x + 14} ${y + l + 14} Z`, '#fbbf24') + E(x, y + l + 30, 30, 10, '#fde68a', 'opacity=".25"');
const planta = (x, y) => R(x - 10, y, 20, 20, '#b45309', 'rx="3"') + E(x - 8, y - 10, 8, 14, '#22c55e', 'transform="rotate(-25 ' + (x - 8) + ' ' + (y - 10) + ')"') + E(x + 8, y - 10, 8, 14, '#16a34a', 'transform="rotate(25 ' + (x + 8) + ' ' + (y - 10) + ')"') + E(x, y - 16, 7, 16, '#4ade80');
const arbol = (x, y, s = 1, c = '#16a34a') => R(x - 5 * s, y - 10 * s, 10 * s, 40 * s, '#92400e') + C(x, y - 25 * s, 26 * s, c) + C(x - 16 * s, y - 12 * s, 16 * s, c) + C(x + 16 * s, y - 12 * s, 16 * s, c);
const valla = (x, y, w, c = '#fef3c7') => { let s = R(x, y + 8, w, 5, c) + R(x, y + 22, w, 5, c); for (let i = x; i < x + w; i += 16) s += P(`M${i} ${y + 38} V${y + 4} L${i + 5} ${y} L${i + 10} ${y + 4} V${y + 38} Z`, c); return s; };
const barril = (x, y, s = 1) => E(x, y + 24 * s, 20 * s, 26 * s, '#92400e') + L(`M${x - 19 * s} ${y + 12 * s} H${x + 19 * s} M${x - 19 * s} ${y + 36 * s} H${x + 19 * s}`, '#44403c', 3) + E(x, y, 15 * s, 5 * s, '#78350f');
const caja = (x, y, w = 40, h = 30, c = '#d97706') => R(x, y, w, h, c, 'rx="2"') + L(`M${x} ${y + 8} H${x + w} M${x + w / 2} ${y} V${y + 8}`, '#0003', 2);
const pantalla = (x, y, w = 50, h = 34, c = '#0ea5e9') => R(x, y, w, h, '#1f2937', 'rx="3"') + R(x + 3, y + 3, w - 6, h - 6, c) + R(x + w / 2 - 4, y + h, 8, 10, '#374151') + R(x + w / 2 - 14, y + h + 10, 28, 4, '#374151');
const cinta = () => P('M250 240 L400 150 L400 166 L274 240 Z', '#facc15') + `<text x="318" y="205" font-size="10" font-weight="800" fill="#111" transform="rotate(-31 318 205)" font-family="sans-serif">NO PASAR · NO PASAR</text>`;
const tienda_c = (x, y, c) => P(`M${x} ${y + 50} L${x + 40} ${y} L${x + 80} ${y + 50} Z`, c) + P(`M${x + 32} ${y + 50} L${x + 40} ${y + 20} L${x + 48} ${y + 50} Z`, '#0004');
const toldo = (x, y, w, c1, c2 = '#fff') => { let s = ''; for (let i = 0; i < w; i += 20) s += P(`M${x + i} ${y} H${x + i + 20} V${y + 18} Q${x + i + 10} ${y + 28} ${x + i} ${y + 18} Z`, (i / 20) % 2 ? c2 : c1); return s; };
const caballete = (x, y) => L(`M${x} ${y + 70} L${x + 20} ${y} L${x + 40} ${y + 70} M${x + 20} ${y} V${y + 70}`, '#78350f', 3) + cuadro(x + 2, y + 10, 36, 28, '#fafaf9', '#fde68a');
const flores = (x, y) => [0, 1, 2, 3, 4].map(i => L(`M${x + i * 6} ${y} V${y - 18 - (i % 2) * 6}`, '#16a34a', 2) + C(x + i * 6, y - 20 - (i % 2) * 6, 4, COL[i])).join('');

// ---------- escenas ----------
const ESC = {
  generica: () => interior('#e7e5e4', '#a8a29e') + puerta(40) + ventana(260, 40, 80, 60) + mesa(150, 150, 100) + lampara(200, 0, 30),
  museo: () => interior('#f5f5f4', '#d6c7a1') + cuadro(40, 40, 70, 55) + R(160, 36, 78, 63, 'none', 'stroke="#a8a29e" stroke-width="5" stroke-dasharray="6 5"') + cuadro(290, 45, 60, 50, '#fcd34d', '#fca5a5') + L('M140 150 H260', '#ef4444', 3) + C(140, 150, 4, '#a8a29e') + C(260, 150, 4, '#a8a29e') + lampara(200, 0, 18) + cinta(),
  galeria: () => interior('#fafaf9', '#e7e5e4') + cuadro(30, 35, 60, 80, '#111827', '#fde68a') + cuadro(130, 45, 90, 60, '#111827', '#c4b5fd') + cuadro(270, 35, 70, 80, '#111827', '#fca5a5') + caballete(340, 120) + lampara(80, 0, 14) + lampara(300, 0, 14),
  banco: () => interior('#e2e8f0', '#94a3b8') + C(300, 90, 58, '#64748b') + C(300, 90, 48, '#94a3b8') + C(300, 90, 10, '#475569') + L('M300 52 V128 M262 90 H338', '#475569', 4) + mostrador(20, 110, 180, 55, '#334155') + R(30, 70, 160, 40, '#bae6fd', 'opacity=".4"') + cinta(),
  joyeria: () => interior('#fdf2f8', '#e9d5ff') + vitrina(30, 90, 110, 75) + vitrina(250, 90, 120, 75) + C(70, 112, 6, '#fde047') + C(95, 115, 5, '#a5f3fc') + C(300, 112, 6, '#f9a8d4') + lampara(85, 0, 30) + lampara(310, 0, 30) + cinta(),
  tren: () => R(0, 0, 400, 240, '#7c2d12') + R(0, 20, 400, 110, '#fef3c7') + [20, 120, 220, 320].map(x => ventana(x, 35, 70, 55, '#1e3a8a')).join('') + R(0, 130, 400, 110, '#57534e') + [30, 130, 230, 330].map(x => R(x, 150, 50, 50, '#991b1b', 'rx="6"')).join('') + R(0, 200, 400, 40, '#44403c'),
  castillo: () => interior('#a8a29e', '#78716c', '#57534e') + [0, 40, 80, 120, 160, 200, 240, 280, 320, 360].map((x, i) => R(x + (i % 2) * 10, 20 + (i % 3) * 40, 36, 18, '#0001')).join('') + P('M150 160 V80 Q200 30 250 80 V160 Z', '#44403c') + vitrina(170, 110, 60, 55) + C(200, 128, 9, '#fde047') + lampara(80, 0, 40) + lampara(320, 0, 40),
  calle: () => exterior(['#93c5fd', '#e0f2fe'], '#9ca3af', 170) + sol() + R(10, 40, 110, 130, '#fca5a5') + R(130, 70, 120, 100, '#fde68a') + R(260, 30, 130, 140, '#a5b4fc') + [20, 60, 140, 190, 270, 330].map((x, i) => ventana(x + 4, 60 + (i % 2) * 20, 26, 24)).join('') + R(0, 200, 400, 6, '#fff', 'opacity=".7"') + R(40, 175, 60, 30, '#475569', 'rx="6"'),
  biblioteca: () => interior('#fef3c7', '#b45309') + estanteria(10, 25, 120, 135) + estanteria(270, 25, 120, 135) + mesa(150, 150, 100, '#92400e') + lampara(200, 0, 60) + caja(185, 132, 30, 18, '#7f1d1d'),
  teatro: () => R(0, 0, 400, 240, '#1f2937') + R(40, 30, 320, 140, '#111827') + P('M0 0 H140 Q120 80 140 170 H0 Z', '#b91c1c') + P('M400 0 H260 Q280 80 260 170 H400 Z', '#b91c1c') + R(0, 0, 400, 24, '#991b1b') + R(20, 170, 360, 14, '#78350f') + E(200, 150, 70, 14, '#fde68a', 'opacity=".25"') + [40, 100, 160, 220, 280, 340].map(x => R(x, 200, 44, 30, '#7f1d1d', 'rx="6"')).join(''),
  taller: () => interior('#e5e7eb', '#78716c') + R(20, 40, 160, 80, '#a16207') + [40, 70, 100, 130, 160].map((x, i) => L(`M${x} 55 V${80 + i * 4}`, '#334155', 4)).join('') + mesa(200, 140, 170, '#57534e') + caja(220, 110, 50, 30, '#64748b') + caja(300, 120, 40, 20, '#b45309') + lampara(280, 0, 50),
  puerto: () => exterior(['#7dd3fc', '#e0f2fe'], '#1d4ed8', 130) + sol(60, 40) + nubes() + R(0, 160, 400, 80, '#57534e') + R(20, 110, 90, 50, '#ef4444') + R(110, 120, 90, 40, '#2563eb') + R(60, 80, 90, 30, '#16a34a') + L('M330 160 V20 H260 M300 20 V60', '#f59e0b', 5) + caja(285, 60, 30, 22, '#f97316'),
  pasteleria: () => interior('#fce7f3', '#fbcfe8') + vitrina(30, 95, 340, 70) + [70, 150, 230, 310].map((x, i) => R(x - 18, 128, 36, 14, COL[i], 'rx="3"') + R(x - 14, 120, 28, 10, '#fef3c7', 'rx="3"')).join('') + toldo(0, 0, 400, '#f472b6') + lampara(200, 20, 30),
  jardin: () => exterior(['#bae6fd', '#ecfeff'], '#4ade80', 120) + sol() + nubes() + arbol(60, 120, 1.2) + arbol(340, 125, 1) + P('M150 240 Q200 170 260 160 Q330 150 400 170 V185 Q330 168 270 178 Q220 190 190 240 Z', '#38bdf8') + flores(120, 200) + flores(300, 215),
  club: () => interior('#312e81', '#1e1b4b', '#0004') + [[80, 150], [200, 140], [320, 150]].map(([x, y]) => E(x, y, 40, 10, '#78350f') + R(x - 4, y, 8, 40, '#78350f')).join('') + [[60, 30], [200, 20], [340, 30]].map(([x, y]) => lampara(x, 0, y)).join('') + estanteria(150, 40, 100, 60, '#1c1917'),
  hotel: () => interior('#fef9c3', '#a16207') + R(40, 110, 160, 50, '#f5f5f4', 'rx="6"') + R(40, 95, 40, 30, '#fff', 'rx="8"') + R(30, 80, 12, 85, '#78350f') + R(280, 90, 70, 70, '#334155', 'rx="4"') + C(315, 125, 10, '#94a3b8') + R(304, 95, 22, 10, '#22c55e', 'rx="2"') + ventana(230, 25, 120, 50, '#1e3a8a') + lampara(120, 0, 28),
  colegio: () => interior('#ecfccb', '#d6d3d1') + R(80, 25, 240, 100, '#14532d', 'stroke="#92400e" stroke-width="6"') + L('M110 60 H180 M110 80 H220 M240 55 Q260 45 280 60', '#f8fafc', 2, 'opacity=".8"') + [40, 160, 280].map(x => mesa(x, 160, 80, '#d97706')).join('') + cinta(),
  granja: () => exterior(['#bae6fd', '#fef9c3'], '#84cc16', 140) + sol(60, 40) + P('M230 140 V70 L290 30 L350 70 V140 Z', '#b91c1c') + P('M270 140 V95 H310 V140 Z', '#7f1d1d') + L('M270 95 L310 140 M310 95 L270 140', '#fef3c7', 3) + valla(0, 150, 200) + E(120, 210, 18, 6, '#a3a3a3') + E(80, 220, 8, 3, '#92400e', 'opacity=".5"'),
  observatorio: () => exterior(['#0f172a', '#312e81'], '#1e293b', 170) + noche() + R(130, 110, 140, 60, '#cbd5e1') + P('M130 112 Q200 20 270 112 Z', '#e2e8f0') + P('M195 40 L205 40 L215 112 H185 Z', '#0f172a') + L('M200 60 L250 25', '#94a3b8', 8),
  mercado: () => exterior(['#bae6fd', '#f0f9ff'], '#d6d3d1', 120) + sol() + [[10, '#ef4444'], [140, '#16a34a'], [270, '#3b82f6']].map(([x, c]) => toldo(x, 60, 120, c) + mostrador(x + 6, 130, 108, 40, '#a16207') + caja(x + 20, 110, 30, 20, '#f59e0b') + caja(x + 66, 112, 30, 18, '#84cc16')).join(''),
  fabrica: () => interior('#e2e8f0', '#64748b') + R(0, 120, 400, 18, '#334155') + [20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map(x => C(x, 138, 8, '#1f2937')).join('') + [60, 170, 290].map((x, i) => caja(x, 92, 34, 28, COL[i])).join('') + R(20, 20, 100, 60, '#94a3b8') + pantalla(300, 30, 70, 44, '#22c55e') + cinta(),
  cocina: () => interior('#f0fdf4', '#e5e7eb') + mostrador(0, 110, 400, 55, '#f5f5f4', '#9ca3af') + R(150, 115, 100, 45, '#1f2937', 'rx="4"') + R(160, 122, 80, 30, '#f97316', 'opacity=".5"') + [40, 80, 300, 340].map((x, i) => R(x, 30, 30, 30, '#e5e7eb', 'stroke="#9ca3af"') + E(x + 15, 92, 14, 8, COL[i])).join('') + L('M120 20 V60 M130 20 V50 M280 20 V55', '#64748b', 3),
  gimnasio: () => interior('#fee2e2', '#334155') + R(30, 50, 340, 6, '#475569') + [60, 120, 180, 240, 300].map((x, i) => R(x, 56, 6, 50, '#475569') + C(x + 3, 110, 12 - i, '#111827')).join('') + R(120, 160, 160, 8, '#9ca3af') + C(110, 164, 22, '#111827') + C(290, 164, 22, '#111827') + ventana(30, 0, 90, 40),
  nieve: () => exterior(['#bfdbfe', '#f8fafc'], '#f8fafc', 120) + montes('#e2e8f0', '#cbd5e1') + sol(320, 30) + arbol(50, 150, 0.8, '#166534') + arbol(350, 160, 0.9, '#166534') + R(180, 120, 6, 70, '#78350f') + R(150, 120, 70, 30, '#ef4444', 'rx="3"') + L('M100 240 Q200 180 300 240', '#94a3b8', 2, 'stroke-dasharray="6 6"'),
  tienda: () => interior('#ede9fe', '#a78bfa', '#0003') + [[20, 30], [140, 30], [260, 30]].map(([x, y], k) => R(x, y, 110, 100, '#4c1d95') + [0, 1, 2, 3].map(i => C(x + 18 + i * 26, y + 30, 11, '#111827') + C(x + 18 + i * 26, y + 30, 4, COL[(i + k) % 8]) + C(x + 18 + i * 26, y + 72, 11, '#111827') + C(x + 18 + i * 26, y + 72, 4, COL[(i + k + 3) % 8])).join('')).join('') + mostrador(120, 150, 160, 40, '#5b21b6'),
  correos: () => interior('#fef3c7', '#a8a29e') + R(30, 30, 160, 110, '#facc15', 'rx="4"') + [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => R(40 + c * 37, 40 + r * 25, 32, 20, '#ca8a04', 'rx="2"')).join('')).join('') + mostrador(220, 110, 170, 55, '#1d4ed8') + caja(240, 80, 40, 30) + caja(300, 88, 30, 22, '#f59e0b'),
  zoo: () => exterior(['#bae6fd', '#ecfccb'], '#65a30d', 140) + sol() + [30, 60, 90, 300, 330, 360].map((x, i) => R(x, 40 + (i % 2) * 15, 8, 110, '#4d7c0f') + L(`M${x + 4} 70 l14 -8 M${x + 4} 100 l-14 -8`, '#65a30d', 3)).join('') + valla(130, 150, 150, '#a16207') + C(200, 130, 22, '#f5f5f4') + C(186, 112, 8, '#111827') + C(214, 112, 8, '#111827') + E(192, 128, 5, 6, '#111827') + E(208, 128, 5, 6, '#111827'),
  festival: () => exterior(['#1e1b4b', '#7c3aed'], '#292524', 150) + noche() + R(80, 60, 240, 90, '#111827') + R(70, 50, 260, 14, '#374151') + [100, 160, 240, 300].map((x, i) => P(`M${x} 64 L${x - 30} 150 H${x + 30} Z`, COL[i], 'opacity=".25"') + C(x, 62, 6, COL[i])).join('') + [30, 60, 340, 370].map(x => C(x, 200, 12, '#0008') + R(x - 10, 210, 20, 30, '#0008')).join(''),
  estudio: () => interior('#e0e7ff', '#475569') + [[30, 70], [150, 60], [270, 70]].map(([x, y], i) => pantalla(x, y, 90, 56, COL[i + 3]) + mesa(x - 10, 140, 110, '#334155')).join('') + lampara(200, 0, 20) + caja(170, 180, 40, 20, '#94a3b8'),
  carretera: () => exterior(['#7dd3fc', '#e0f2fe'], '#65a30d', 140) + montes() + P('M150 240 L190 140 H210 L250 240 Z', '#4b5563') + L('M200 150 V240', '#fff', 3, 'stroke-dasharray="10 10"') + R(280, 150, 80, 30, '#fff', 'rx="3"') + `<text x="320" y="170" text-anchor="middle" font-size="11" font-weight="800" fill="#b91c1c" font-family="sans-serif">META 2 km</text>`,
  aeropuerto: () => exterior(['#cbd5e1', '#f1f5f9'], '#6b7280', 150) + nubes() + P('M20 150 V80 Q120 30 220 80 V150 Z', '#94a3b8') + R(60, 100, 120, 50, '#334155') + P('M270 130 H380 L390 120 H300 L290 100 H280 L285 120 Z', '#f8fafc') + L('M300 128 L330 140', '#ef4444', 3) + L('M0 200 H400', '#fde047', 3, 'stroke-dasharray="20 14"'),
  bodega: () => interior('#57534e', '#44403c', '#0004') + P('M0 0 Q200 60 400 0 V20 Q200 80 0 20 Z', '#44403c') + [[60, 120], [140, 120], [260, 120], [340, 120], [100, 70], [300, 70]].map(([x, y]) => barril(x, y, 0.9)).join('') + lampara(200, 0, 50),
  panaderia: () => interior('#fef3c7', '#d6d3d1') + P('M240 160 V60 Q300 10 360 60 V160 Z', '#b45309') + P('M260 160 V90 Q300 60 340 90 V160 Z', '#1c1917') + E(300, 140, 34, 10, '#f97316', 'opacity=".7"') + estanteria(20, 40, 180, 100, '#92400e').replace(/fill="(#e0457b|#7c3aed|#3b82f6|#a855f7|#14b8a6)"/g, 'fill="#d97706"') + mesa(40, 160, 150, '#a16207'),
  boda: () => exterior(['#fce7f3', '#fff1f2'], '#bbf7d0', 150) + sol(330, 40) + P('M130 160 V70 Q200 0 270 70 V160', 'none', 'stroke="#fff" stroke-width="10"') + flores(140, 80) + flores(240, 80) + [60, 100, 300, 340].map(x => R(x - 12, 170, 24, 30, '#fff', 'rx="4"')).join('') + R(170, 120, 60, 40, '#fff', 'rx="4"'),
  laboratorio: () => interior('#ecfeff', '#cbd5e1') + mesa(30, 130, 340, '#e5e7eb') + [[70, '#22c55e'], [120, '#a855f7'], [170, '#f59e0b'], [260, '#ef4444'], [310, '#3b82f6']].map(([x, c]) => P(`M${x - 6} 92 V105 L${x - 16} 128 H${x + 16} L${x + 6} 105 V92 Z`, c, 'opacity=".75" stroke="#64748b"')).join('') + pantalla(200, 40, 60, 40, '#0ea5e9') + R(20, 20, 90, 60, '#f1f5f9', 'stroke="#94a3b8"') + cinta(),
  barco: () => exterior(['#1e3a8a', '#3b82f6'], '#1e40af', 130) + noche() + P('M0 150 H400 V240 H0 Z', '#78350f') + L('M0 150 H400', '#fef3c7', 4) + R(40, 70, 120, 80, '#f8fafc') + [55, 90, 125].map(x => C(x, 100, 9, '#fde68a')).join('') + R(260, 20, 8, 130, '#f8fafc') + L('M20 135 H380', '#fef3c7', 2, 'stroke-dasharray="4 8"'),
  camping: () => exterior(['#fb923c', '#fde68a'], '#4d7c0f', 130) + sol(200, 110) + P('M0 130 H400 V160 Q200 140 0 160 Z', '#38bdf8') + tienda_c(40, 140, '#f97316') + tienda_c(260, 150, '#2563eb') + arbol(180, 160, 0.7, '#166534') + arbol(370, 140, 0.8, '#166534') + C(200, 210, 10, '#f97316') + L('M190 220 L210 205 M210 220 L190 205', '#78350f', 3),
  radio: () => interior('#fef2f2', '#78716c') + R(30, 100, 220, 60, '#1f2937', 'rx="4"') + [50, 80, 110, 140, 170, 200].map((x, i) => R(x, 110 + (i % 3) * 6, 8, 30, '#64748b') + C(x + 4, 118 + (i % 3) * 6, 4, COL[i])).join('') + L('M140 100 V60', '#334155', 3) + R(132, 40, 16, 26, '#475569', 'rx="8"') + R(290, 20, 80, 50, '#ef4444', 'rx="4"') + `<text x="330" y="52" text-anchor="middle" font-size="14" font-weight="900" fill="#fff" font-family="sans-serif">EN EL AIRE</text>` + ventana(280, 90, 90, 60, '#1e3a8a'),
  floristeria: () => interior('#ecfccb', '#a3a3a3') + P('M0 0 L80 0 L0 60 Z M400 0 L320 0 L400 60 Z', '#bbf7d0', 'opacity=".6"') + mesa(30, 140, 340, '#78350f') + [60, 120, 180, 240, 300].map((x, i) => R(x - 10, 116, 20, 24, '#64748b', 'rx="3"') + flores(x - 12, 116)).join('') + planta(360, 200) + planta(30, 200),
  comisaria: () => interior('#e2e8f0', '#64748b') + [[20, 30], [70, 30], [120, 30]].map(([x, y]) => R(x, y, 44, 130, '#475569', 'stroke="#334155"') + R(x + 34, y + 60, 4, 14, '#cbd5e1')).join('') + R(200, 40, 180, 110, '#94a3b8') + [0, 1, 2].map(r => [0, 1, 2].map(c => caja(210 + c * 58, 48 + r * 34, 50, 28, r === 1 && c === 2 ? '#fde68a' : '#b45309')).join('')).join('') + `<text x="377" y="98" font-size="10" font-weight="800" fill="#7f1d1d" font-family="sans-serif" text-anchor="end">12</text>` + cinta()
};

export const TIPOS = Object.keys(ESC);
// SVG de la escena (cadena). «noche» oscurece un poco cualquier interior.
export function escenaSVG(tipo, titulo) {
  const f = ESC[tipo] || ESC.generica;
  return `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Dibujo de la escena${titulo ? ': ' + String(titulo).replace(/[<>&"]/g, '') : ''}" xmlns="http://www.w3.org/2000/svg">${f()}</svg>`;
}

// Retrato sencillo de una persona del expediente (siempre el mismo para el mismo nombre). Sin rasgos de nadie real.
const PIEL = ['#fde7d6', '#f6d0b1', '#e8b48f', '#c98e66', '#9c6644', '#6f4a2f'], PELO = ['#1f2937', '#4b2e1a', '#7c4a1e', '#d6a35c', '#9ca3af', '#b91c1c', '#111827'];
function hash(s) { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }
export function retratoSVG(nombre, rol) {
  const k = hash(nombre), piel = PIEL[k % PIEL.length], pelo = PELO[(k >> 3) % PELO.length], ropa = COL[(k >> 6) % COL.length], estilo = (k >> 9) % 4;
  const animal = /animal|mapache|zorro|perro|gato|panda/i.test(String(rol) + ' ' + nombre);
  if (animal) return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${R(0, 0, 80, 80, '#ecfccb')}${C(40, 46, 24, '#9ca3af')}${C(22, 26, 9, '#6b7280')}${C(58, 26, 9, '#6b7280')}${E(40, 46, 17, 8, '#374151')}${C(32, 44, 3.5, '#fff')}${C(48, 44, 3.5, '#fff')}${C(32, 44, 1.8, '#111')}${C(48, 44, 1.8, '#111')}${C(40, 56, 3, '#111')}</svg>`;
  const peinado = [P('M18 38 Q18 12 40 12 Q62 12 62 38 Q56 22 40 22 Q24 22 18 38 Z', pelo),
    P('M16 44 Q14 10 40 10 Q66 10 64 44 L60 60 Q62 30 40 22 Q18 30 20 60 Z', pelo),
    P('M20 34 Q22 14 40 14 Q58 14 60 34 Q50 26 40 30 Q30 26 20 34 Z', pelo) + C(40, 12, 7, pelo),
    P('M19 36 Q20 16 40 15 Q60 16 61 36 Z', pelo) + R(17, 33, 46, 4, '#0003', 'rx="2"')][estilo];
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${R(0, 0, 80, 80, '#f1f5f9')}${P('M10 80 Q12 58 40 56 Q68 58 70 80 Z', ropa)}${R(34, 48, 12, 10, piel)}${E(40, 38, 20, 23, piel)}${peinado}${C(32, 40, 2.4, '#1f2937')}${C(48, 40, 2.4, '#1f2937')}${L('M34 50 Q40 53 46 50', '#9a3412', 1.6)}${E(28, 46, 3, 2, '#f472b6', 'opacity=".35"')}${E(52, 46, 3, 2, '#f472b6', 'opacity=".35"')}</svg>`;
}
