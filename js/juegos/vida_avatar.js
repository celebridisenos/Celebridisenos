// ================= v13.6 · VIDA: dibujo del personaje (estilo anime, SVG propio) =================
// Se dibuja con formas simples a partir de: chico/chica, piel, pelo, ojos, peinado, ropa puesta, accesorio, etapa de la vida
// y estado de ánimo. Diseño original (no copia ningún personaje existente). Se puede ampliar con más peinados/estilos
// añadiendo casos aquí y su prenda en shared/vida.js.
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, at, kids) => { const e = document.createElementNS(NS, tag); Object.entries(at || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) e.setAttribute(k, v); }); (kids || []).forEach(k => k && e.appendChild(k)); return e; };
const oscurece = (hex, f) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex; const n = parseInt(m[1], 16); const c = x => Math.max(0, Math.min(255, Math.round(x * f))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(c).map(x => x.toString(16).padStart(2, '0')).join(''); };

export function avatar(s, opts = {}) {
  const V = window.VIDA, now = opts.ahora || Date.now(), e = V.edad(s, now), et = V.etapa(e).id;
  const A = s.aspecto || {}, piel = A.piel || '#f6d2b8', pelo = et === 'mayor' ? '#c9c9d1' : (A.pelo || '#3b2a20'), ojos = A.ojos || '#6b4f2a', chica = s.sexo === 'chica';
  const prenda = p => V.buscar(V.CAT.ropa, (s.ropa || {})[p]) || {};
  const top = prenda('top'), bajo = prenda('bajo'), zap = prenda('zapatos'), acc = prenda('accesorio');
  const media = V.NEC.reduce((a, n) => a + (s.necesidades[n] || 0), 0) / V.NEC.length, animo = s.salud < 35 ? 'mal' : media >= 60 ? 'feliz' : media < 30 ? 'triste' : 'normal', radiante = media >= 88;
  const bebe = et === 'bebe', nino = et === 'nino', esc = bebe ? 0.62 : nino ? 0.8 : et === 'adolescente' ? 0.92 : 1;
  const svg = el('svg', { viewBox: '0 0 200 260', class: 'vd-avatar' + (opts.cls ? ' ' + opts.cls : ''), role: 'img', 'aria-label': s.nombre + ', ' + Math.floor(e) + ' años' });
  const g = el('g', { transform: `translate(${100 - 100 * esc} ${260 - 260 * esc}) scale(${esc})` }); svg.appendChild(g);
  // sombra
  g.appendChild(el('ellipse', { cx: 100, cy: 252, rx: 46, ry: 7, fill: 'rgba(0,0,0,.12)' }));
  // ---- pelo de detrás ----
  const pz = A.peinado || (chica ? 'largo' : 'corto');
  if (!bebe) {
    if (pz === 'largo') g.appendChild(el('path', { d: 'M48 78 Q44 150 62 176 L138 176 Q156 150 152 78 Z', fill: pelo }));
    if (pz === 'media') g.appendChild(el('path', { d: 'M50 80 Q48 128 62 140 L138 140 Q152 128 150 80 Z', fill: pelo }));
    if (pz === 'coletas') { g.appendChild(el('ellipse', { cx: 40, cy: 104, rx: 14, ry: 34, fill: pelo })); g.appendChild(el('ellipse', { cx: 160, cy: 104, rx: 14, ry: 34, fill: pelo })); }
    if (pz === 'mono') g.appendChild(el('circle', { cx: 100, cy: 22, r: 18, fill: pelo }));
  }
  // ---- cuerpo ----
  if (bebe) {
    g.appendChild(el('path', { d: 'M62 150 Q60 200 74 232 L126 232 Q140 200 138 150 Q100 136 62 150 Z', fill: !top.color || top.color === '#f8fafc' ? (chica ? '#fbcfe8' : '#bae6fd') : top.color }));
    g.appendChild(el('circle', { cx: 66, cy: 196, r: 11, fill: piel })); g.appendChild(el('circle', { cx: 134, cy: 196, r: 11, fill: piel }));
  } else {
    const tc = top.color || '#f8fafc', bc = bajo.color || '#1e40af', zc = zap.color || '#e5e7eb';
    // piernas
    if (bajo.estilo === 'falda') { g.appendChild(el('rect', { x: 80, y: 196, width: 14, height: 44, rx: 6, fill: piel })); g.appendChild(el('rect', { x: 106, y: 196, width: 14, height: 44, rx: 6, fill: piel })); g.appendChild(el('path', { d: 'M70 176 L130 176 L140 210 L60 210 Z', fill: bc })); g.appendChild(el('path', { d: 'M76 186 L124 186 M72 198 L128 198', stroke: oscurece(bc, 0.7), 'stroke-width': 2 })); }
    else if (bajo.estilo === 'corto') { g.appendChild(el('rect', { x: 80, y: 176, width: 16, height: 64, rx: 6, fill: piel })); g.appendChild(el('rect', { x: 104, y: 176, width: 16, height: 64, rx: 6, fill: piel })); g.appendChild(el('path', { d: 'M74 172 L126 172 L128 206 L102 206 L100 192 L98 206 L72 206 Z', fill: bc })); }
    else { g.appendChild(el('path', { d: 'M74 172 L126 172 L124 240 L104 240 L100 196 L96 240 L76 240 Z', fill: bc })); }
    // zapatos
    g.appendChild(el('ellipse', { cx: 86, cy: 242, rx: 13, ry: 6, fill: zc, stroke: oscurece(zc, 0.7), 'stroke-width': 1.5 })); g.appendChild(el('ellipse', { cx: 114, cy: 242, rx: 13, ry: 6, fill: zc, stroke: oscurece(zc, 0.7), 'stroke-width': 1.5 }));
    // brazos
    g.appendChild(el('path', { d: 'M70 132 Q54 156 58 182', stroke: tc, 'stroke-width': 15, 'stroke-linecap': 'round', fill: 'none' })); g.appendChild(el('path', { d: 'M130 132 Q146 156 142 182', stroke: tc, 'stroke-width': 15, 'stroke-linecap': 'round', fill: 'none' }));
    g.appendChild(el('circle', { cx: 58, cy: 186, r: 7, fill: piel })); g.appendChild(el('circle', { cx: 142, cy: 186, r: 7, fill: piel }));
    // torso
    g.appendChild(el('path', { d: 'M70 128 Q100 118 130 128 L134 178 L66 178 Z', fill: tc, stroke: oscurece(tc, 0.85), 'stroke-width': 1.5 }));
    if (top.estilo === 'marinero') { g.appendChild(el('path', { d: 'M78 126 L100 150 L122 126', fill: 'none', stroke: '#fff', 'stroke-width': 4 })); g.appendChild(el('path', { d: 'M94 150 L100 160 L106 150 Z', fill: '#dc2626' })); }
    if (top.estilo === 'sudadera') g.appendChild(el('path', { d: 'M90 150 L110 150 L112 168 L88 168 Z', fill: oscurece(tc, 0.85) }));
    if (top.estilo === 'chaqueta') g.appendChild(el('path', { d: 'M100 126 L100 178 M84 128 L94 150 M116 128 L106 150', stroke: oscurece(tc, 0.7), 'stroke-width': 2.5, fill: 'none' }));
    if (top.estilo === 'kimono') { g.appendChild(el('path', { d: 'M80 126 L106 170 M120 126 L94 170', stroke: '#be185d', 'stroke-width': 3, fill: 'none' })); g.appendChild(el('rect', { x: 68, y: 160, width: 64, height: 8, fill: '#be185d' })); [[82, 140], [116, 146], [96, 132]].forEach(([x, y]) => g.appendChild(el('circle', { cx: x, cy: y, r: 3, fill: '#fff' }))); }
  }
  // cuello y cabeza
  g.appendChild(el('rect', { x: 92, y: 112, width: 16, height: 16, fill: oscurece(piel, 0.93) }));
  const hr = bebe ? 56 : 50, hy = bebe ? 92 : 76;
  g.appendChild(el('ellipse', { cx: 100, cy: hy, rx: hr, ry: hr * 0.98, fill: piel }));
  g.appendChild(el('ellipse', { cx: 100 - hr + 2, cy: hy + 6, rx: 6, ry: 9, fill: piel })); g.appendChild(el('ellipse', { cx: 100 + hr - 2, cy: hy + 6, rx: 6, ry: 9, fill: piel }));
  // ---- ojos anime ----
  const ey = hy + 8, ex = 21, ojo = (cx, lado) => {
    const grupo = el('g');
    if (radiante && !opts.serio) { grupo.appendChild(el('path', { d: `M${cx - 11} ${ey + 2} Q${cx} ${ey - 10} ${cx + 11} ${ey + 2}`, stroke: '#2b2230', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' })); return grupo; }
    grupo.appendChild(el('ellipse', { cx, cy: ey, rx: 11, ry: 14, fill: '#fff' }));
    grupo.appendChild(el('ellipse', { cx, cy: ey + 2, rx: 8.5, ry: 11.5, fill: ojos }));
    grupo.appendChild(el('ellipse', { cx, cy: ey + 4, rx: 4.5, ry: 6, fill: oscurece(ojos, 0.45) }));
    grupo.appendChild(el('circle', { cx: cx - 3.5, cy: ey - 3, r: 3.6, fill: '#fff' })); grupo.appendChild(el('circle', { cx: cx + 3.5, cy: ey + 6, r: 1.8, fill: '#fff' }));
    grupo.appendChild(el('path', { d: `M${cx - 12} ${ey - 11} Q${cx} ${ey - 18} ${cx + 12} ${ey - 11}`, stroke: '#2b2230', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }));
    if (chica && !bebe) grupo.appendChild(el('path', { d: lado < 0 ? `M${cx - 12} ${ey - 11} l-5 -4` : `M${cx + 12} ${ey - 11} l5 -4`, stroke: '#2b2230', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
    if (animo === 'triste' || animo === 'mal') grupo.appendChild(el('path', { d: lado < 0 ? `M${cx - 9} ${ey - 21} L${cx + 7} ${ey - 17}` : `M${cx + 9} ${ey - 21} L${cx - 7} ${ey - 17}`, stroke: oscurece(pelo, 0.8), 'stroke-width': 3, 'stroke-linecap': 'round' }));
    return grupo;
  };
  g.appendChild(ojo(100 - ex, -1)); g.appendChild(ojo(100 + ex, 1));
  // mejillas, nariz y boca
  g.appendChild(el('ellipse', { cx: 100 - 30, cy: ey + 18, rx: 8, ry: 4.5, fill: '#f9a8d4', opacity: 0.7 })); g.appendChild(el('ellipse', { cx: 100 + 30, cy: ey + 18, rx: 8, ry: 4.5, fill: '#f9a8d4', opacity: 0.7 }));
  g.appendChild(el('path', { d: `M99 ${ey + 14} l2 2`, stroke: oscurece(piel, 0.7), 'stroke-width': 2, 'stroke-linecap': 'round' }));
  const by = ey + 25;
  g.appendChild(el('path', { d: animo === 'triste' || animo === 'mal' ? `M92 ${by + 3} Q100 ${by - 4} 108 ${by + 3}` : animo === 'feliz' ? `M90 ${by - 2} Q100 ${by + 10} 110 ${by - 2} Z` : `M93 ${by} Q100 ${by + 4} 107 ${by}`, stroke: '#9f1239', 'stroke-width': 2.5, fill: animo === 'feliz' ? '#f43f5e' : 'none', 'stroke-linecap': 'round' }));
  if (animo === 'mal') g.appendChild(el('path', { d: `M${100 + 34} ${ey - 6} q4 8 0 12 q-4 -4 0 -12`, fill: '#60a5fa' }));
  // ---- pelo de delante ----
  if (bebe) g.appendChild(el('path', { d: `M86 ${hy - 50} q14 -10 20 6 q-8 -4 -12 4`, fill: 'none', stroke: pelo, 'stroke-width': 4, 'stroke-linecap': 'round' }));
  else {
    const top0 = hy - hr;
    const flequillos = {
      corto: `M50 ${hy - 4} Q48 ${top0 - 8} 100 ${top0 - 10} Q152 ${top0 - 8} 150 ${hy - 4} Q140 ${hy - 26} 128 ${hy - 22} L120 ${hy - 34} L108 ${hy - 22} L96 ${hy - 36} L84 ${hy - 22} L72 ${hy - 32} Q58 ${hy - 24} 50 ${hy - 4} Z`,
      flequillo: `M48 ${hy} Q46 ${top0 - 10} 100 ${top0 - 10} Q154 ${top0 - 10} 152 ${hy} Q150 ${hy - 20} 138 ${hy - 14} Q120 ${hy - 26} 100 ${hy - 16} Q80 ${hy - 26} 62 ${hy - 14} Q50 ${hy - 20} 48 ${hy} Z`,
      despeinado: `M46 ${hy - 2} L40 ${hy - 30} L56 ${hy - 36} L52 ${top0 + 2} L74 ${top0 - 8} L84 ${top0 - 18} L100 ${top0 - 6} L118 ${top0 - 18} L126 ${top0 - 6} L148 ${top0 + 2} L144 ${hy - 36} L160 ${hy - 30} L154 ${hy - 2} Q142 ${hy - 22} 126 ${hy - 20} L116 ${hy - 32} L104 ${hy - 20} L90 ${hy - 34} L80 ${hy - 20} Q60 ${hy - 22} 46 ${hy - 2} Z`,
      largo: `M48 ${hy + 10} Q44 ${top0 - 10} 100 ${top0 - 10} Q156 ${top0 - 10} 152 ${hy + 10} Q146 ${hy - 18} 128 ${hy - 20} Q112 ${hy - 10} 104 ${hy - 26} Q92 ${hy - 10} 72 ${hy - 20} Q54 ${hy - 18} 48 ${hy + 10} Z`,
      media: `M48 ${hy + 6} Q44 ${top0 - 10} 100 ${top0 - 10} Q156 ${top0 - 10} 152 ${hy + 6} Q146 ${hy - 16} 126 ${hy - 18} Q110 ${hy - 26} 100 ${hy - 14} Q90 ${hy - 26} 74 ${hy - 18} Q54 ${hy - 16} 48 ${hy + 6} Z`,
      coletas: `M50 ${hy - 2} Q46 ${top0 - 10} 100 ${top0 - 10} Q154 ${top0 - 10} 150 ${hy - 2} Q140 ${hy - 22} 120 ${hy - 20} L100 ${hy - 30} L80 ${hy - 20} Q60 ${hy - 22} 50 ${hy - 2} Z`,
      mono: `M50 ${hy - 2} Q46 ${top0 - 10} 100 ${top0 - 10} Q154 ${top0 - 10} 150 ${hy - 2} Q138 ${hy - 26} 100 ${hy - 24} Q62 ${hy - 26} 50 ${hy - 2} Z`
    };
    g.appendChild(el('path', { d: flequillos[pz] || flequillos.corto, fill: pelo }));
    g.appendChild(el('path', { d: `M70 ${top0 + 6} Q84 ${top0 - 2} 92 ${top0 + 4}`, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' })); // brillo del pelo
  }
  // ---- accesorio ----
  if (acc.estilo === 'gafas') { g.appendChild(el('circle', { cx: 100 - ex, cy: ey + 1, r: 15, fill: 'none', stroke: acc.color, 'stroke-width': 2.5 })); g.appendChild(el('circle', { cx: 100 + ex, cy: ey + 1, r: 15, fill: 'none', stroke: acc.color, 'stroke-width': 2.5 })); g.appendChild(el('path', { d: `M${100 - ex + 15} ${ey} L${100 + ex - 15} ${ey}`, stroke: acc.color, 'stroke-width': 2.5 })); }
  if (acc.estilo === 'lazo') { const ly = hy - hr + 4; g.appendChild(el('path', { d: `M126 ${ly} l-22 -12 l0 24 Z M126 ${ly} l22 -12 l0 24 Z`, fill: acc.color })); g.appendChild(el('circle', { cx: 126, cy: ly, r: 5, fill: oscurece(acc.color, 0.8) })); }
  if (acc.estilo === 'gorra') { const ly = hy - hr + 6; g.appendChild(el('path', { d: `M52 ${ly + 10} Q100 ${ly - 44} 148 ${ly + 10} Z`, fill: acc.color })); g.appendChild(el('path', { d: `M100 ${ly + 6} Q140 ${ly + 2} 170 ${ly + 14} Q140 ${ly + 18} 100 ${ly + 14} Z`, fill: oscurece(acc.color, 0.8) })); }
  if (acc.estilo === 'gato') { const ly = hy - hr; g.appendChild(el('path', { d: `M52 ${ly + 30} Q100 ${ly - 26} 148 ${ly + 30}`, stroke: acc.color, 'stroke-width': 6, fill: 'none' })); g.appendChild(el('path', { d: `M62 ${ly + 6} l8 -26 l16 18 Z M138 ${ly + 6} l-8 -26 l-16 18 Z`, fill: acc.color })); g.appendChild(el('circle', { cx: 50, cy: hy + 4, r: 11, fill: acc.color })); g.appendChild(el('circle', { cx: 150, cy: hy + 4, r: 11, fill: acc.color })); }
  return svg;
}
// Mascota (emoji grande con su estado)
export function mascotaDibujo(s) {
  const V = window.VIDA, m = s.mascota; if (!m) return null;
  const t = V.buscar(V.CAT.mascotas, m.tipo) || { i: '🐾', t: 'Mascota' };
  const d = document.createElement('div'); d.className = 'vd-mascota' + (m.feliz < 30 ? ' triste' : '') + (m.tipo === 'zorro' ? ' brilla' : '');
  d.textContent = t.i; d.title = (m.nombre || t.t) + ' · felicidad ' + m.feliz + ' · comida ' + m.hambre;
  return d;
}
