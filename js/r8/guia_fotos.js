// ================= 14-10-2026 · 📷 LA GUÍA DE FOTOS: «ahora de frente, ahora de lado» con DIBUJOS de dónde va el móvil =================
// La dueña (14-10-2026): «el que calca la imagen no me dice ahora de frente, ahora de lado, las que necesite» y «las posiciones de la
// cámara también, pequeños dibujos de cómo hacer la foto correctamente, tips de mejora».
// Aquí: los DIBUJOS (una escena en 3D sencilla: la mesa, el tapete, la pieza y el móvil donde tiene que estar, con lo que ve), los
// CONSEJOS de cada foto, los «así NO» y, tras subir una foto, lo que se puede MEJORAR de ESA foto (inclinada, pequeña, poca luz…).
// Lo usan CelebriCLON (📸 Desde foto → Repuesto a medida) y el asistente «Copiar con fotos» del Lab de precisión.

// ---------- una escena isométrica hecha con cajas ----------
// x hacia abajo-derecha, y hacia abajo-izquierda, z hacia arriba. Se ven las caras +x, +y y +z.
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
function escena(dib, o = {}) {
  const k = o.k || 1.8, ox = o.ox || 160, oy = o.oy || 104, P = ([x, y, z]) => [ox + (x - y) * C30 * k, oy + ((x + y) * S30 - z) * k];
  const pts = L => L.map(p => P(p).map(v => v.toFixed(1)).join(',')).join(' ');
  const out = [];
  const api = {
    P, quad: (L, f, s = 'none', extra = '') => out.push(`<polygon points="${pts(L)}" fill="${f}" stroke="${s}" stroke-width="1" stroke-linejoin="round" ${extra}/>`),
    caja: (a, b, col, o2 = {}) => { const [x0, y0, z0] = a, [x1, y1, z1] = b;
      api.quad([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], col[1], o2.borde || 'rgba(0,0,0,.35)'); // +y
      api.quad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], col[2], o2.borde || 'rgba(0,0,0,.35)'); // +x
      api.quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col[0], o2.borde || 'rgba(0,0,0,.35)'); }, // +z
    aro: (c, r, z, f, s = 'none') => { const L = []; for (let i = 0; i < 28; i++) { const a = i / 28 * 2 * Math.PI; L.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), z]); } api.quad(L, f, s); },
    raya: (a, b, col, o2 = {}) => { const A = P(a), B = P(b); out.push(`<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="${col}" stroke-width="${o2.w || 1.3}" ${o2.dash ? `stroke-dasharray="${o2.dash}"` : ''} stroke-linecap="round" ${o2.flecha ? 'marker-end="url(#gfF)"' : ''}/>`); },
    texto: (p, t, o2 = {}) => { const A = Array.isArray(p[0]) ? p[0] : P(p); out.push(`<text x="${A[0].toFixed(1)}" y="${A[1].toFixed(1)}" font-size="${o2.t || 10}" font-weight="${o2.peso || 700}" fill="${o2.col || 'currentColor'}" text-anchor="${o2.ancla || 'middle'}" font-family="system-ui,Segoe UI,sans-serif">${t}</text>`); },
    svg: s => out.push(s) };
  dib(api);
  return `<svg viewBox="0 0 320 ${o.alto || 200}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.titulo || ''}"><defs><marker id="gfF" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#ffb020"/></marker></defs>${out.join('')}</svg>`;
}
const MESA = ['rgba(150,160,190,.20)'], PAPEL = '#f4f4f0', PIEZA = ['#9d8cff', '#6a58e8', '#5443c9'], MOVIL = ['#20263a', '#2d3550', '#3a4466'], PANT = '#29d3ff', AM = '#ffb020', ROJO = '#ff4d6d';
function mesaYtapete(a, o = {}) {
  a.quad([[-52, -40, 0], [52, -40, 0], [52, 40, 0], [-52, 40, 0]], MESA[0], 'rgba(150,160,190,.35)');
  a.quad([[-30, -21, 0], [30, -21, 0], [30, 21, 0], [-30, 21, 0]], PAPEL, 'rgba(0,0,0,.25)');
  if (o.marcas !== false) [[-27, -18], [27, -18], [27, 18], [-27, 18]].forEach(([x, y]) => a.quad([[x - 2, y - 2, 0.1], [x + 2, y - 2, 0.1], [x + 2, y + 2, 0.1], [x - 2, y + 2, 0.1]], '#111'));
  a.quad([[-22, -14, 0.05], [22, -14, 0.05], [22, 14, 0.05], [-22, 14, 0.05]], 'none', 'rgba(0,0,0,.35)', 'stroke-dasharray="2 2"');
}
function pieza(a, o = {}) { const h = o.h || 6; if (o.sombra) a.quad([[-14, -8, 0.1], [26, -8, 0.1], [30, 8, 0.1], [-10, 8, 0.1]], 'rgba(0,0,0,.45)');
  a.caja([-14, -8, 0], [14, 8, h], PIEZA); if (o.escalon) a.caja([-14, -8, h], [0, 8, h + 5], PIEZA); a.aro([7, 0], 3, h + 0.01, '#2a2148'); a.aro([-7, 0], 2, (o.escalon ? h + 5 : h) + 0.01, '#2a2148'); }
// el cono de lo que ve el móvil (de la lente a las esquinas)
const cono = (a, de, a4) => a4.forEach(p => a.raya(de, p, AM, { dash: '3 3', w: 1 }));

export const DIBUJOS = {
  principal: () => escena(a => { mesaYtapete(a); pieza(a);
    cono(a, [0, 0, 44], [[-30, -21, 0], [30, -21, 0], [30, 21, 0], [-30, 21, 0]]);
    a.caja([-7, -12, 44], [7, 12, 46], MOVIL); a.quad([[-6, -11, 46.05], [6, -11, 46.05], [6, 11, 46.05], [-6, 11, 46.05]], PANT); a.quad([[-3.5, -2, 46.1], [3.5, -2, 46.1], [3.5, 2, 46.1], [-3.5, 2, 46.1]], '#7c6cff');
    a.raya([36, -21, 0], [36, -21, 44], AM, { flecha: true }); a.raya([36, -21, 44], [36, -21, 0], AM, { flecha: true }); a.texto([36, -21, 26], '25–30 cm', { col: AM, ancla: 'start', t: 10.5 });
    a.texto([[160, 194]], 'DE FRENTE: el móvil ENCIMA, plano (paralelo a la mesa)', { t: 10.5 }); }, { titulo: 'Foto de frente: el móvil encima de la pieza, paralelo a la mesa' }),
  lado: () => escena(a => { mesaYtapete(a); pieza(a);
    cono(a, [0, 46, 4], [[-14, 8, 0], [14, 8, 0], [14, 8, 6], [-14, 8, 6]]);
    a.caja([-11, 46, 0], [11, 47.6, 12], MOVIL); a.quad([[-10, 47.65, 1], [10, 47.65, 1], [10, 47.65, 11], [-10, 47.65, 11]], PANT); a.quad([[-5, 47.7, 4], [5, 47.7, 4], [5, 47.7, 7], [-5, 47.7, 7]], '#7c6cff');
    a.texto([-26, 50, 20], 'a su altura', { col: AM, t: 10 });
    a.texto([[160, 194]], 'DE LADO: el móvil de pie, a la altura de la pieza', { t: 10.5 }); }, { titulo: 'Foto de lado: el móvil de pie, a la altura de la pieza' }),
  canto: () => escena(a => { mesaYtapete(a); pieza(a, { escalon: true });
    cono(a, [44, 0, 4], [[14, -8, 0], [14, 8, 0], [14, 8, 6], [14, -8, 6]]);
    a.caja([44, -10, 0], [45.6, 10, 12], MOVIL); a.quad([[45.65, -9, 1], [45.65, 9, 1], [45.65, 9, 11], [45.65, -9, 11]], PANT); a.quad([[45.7, -4, 3], [45.7, 4, 3], [45.7, 4, 8], [45.7, -4, 8]], '#7c6cff');
    a.texto([[160, 194]], 'DESDE LA PUNTA: el móvil de pie, mirando lo CORTO', { t: 10.5 }); }, { titulo: 'Foto desde la punta (de canto)' }),
  // «así NO»
  inclinado: () => escena(a => { mesaYtapete(a); pieza(a);
    const ph = [[-7, -12, 30], [7, -12, 30], [7, 12, 46], [-7, 12, 46]]; a.quad(ph, MOVIL[0], 'rgba(0,0,0,.4)'); cono(a, [0, 0, 38], [[-30, -21, 0], [30, 21, 0]]);
    cruz(a); a.texto([[160, 194]], 'Móvil INCLINADO: lo de lejos sale más pequeño', { t: 10.5, col: ROJO }); }, { titulo: 'Así no: móvil inclinado' }),
  cerca: () => escena(a => { mesaYtapete(a); pieza(a);
    cono(a, [0, 0, 14], [[-30, -21, 0], [30, -21, 0], [30, 21, 0], [-30, 21, 0]]); a.caja([-7, -12, 14], [7, 12, 16], MOVIL);
    cruz(a); a.texto([[160, 194]], 'MUY CERCA: deforma. Mejor de lejos y con zoom ×2', { t: 10.5, col: ROJO }); }, { titulo: 'Así no: muy cerca' }),
  sombra: () => escena(a => { mesaYtapete(a); pieza(a, { sombra: true });
    a.svg('<circle cx="270" cy="30" r="11" fill="#ffd23f"/>'); cruz(a); a.texto([[160, 194]], 'SOMBRA DURA o flash: la sombra parece pieza', { t: 10.5, col: ROJO }); }, { titulo: 'Así no: sombra dura' }),
};
function cruz(a) { a.svg(`<g stroke="${ROJO}" stroke-width="5" stroke-linecap="round" opacity=".9"><line x1="262" y1="128" x2="292" y2="158"/><line x1="292" y1="128" x2="262" y2="158"/></g>`); }

// ---------- lo que se dice de cada foto ----------
export const PASOS = {
  principal: { titulo: 'De FRENTE', corto: 'De frente', porque: 'Para su silueta, sus agujeros y el largo y el ancho.',
    tips: ['El móvil ENCIMA y plano, como si fueras a escanear un papel.', 'De un poco lejos (25–30 cm) y con zoom ×2: deforma menos.', 'Sobre el tapete de calco (o un folio liso) y que la pieza no toque el borde de la foto.', 'Luz de día o de lámpara por arriba; SIN flash.'] },
  lado: { titulo: 'De LADO', corto: 'De lado', porque: 'Para el grosor y para ver si tiene escalones o salientes.',
    tips: ['El móvil DE PIE, a la ALTURA de la pieza (apóyalo en la mesa o en un libro).', 'Mirando su lado LARGO, de frente, sin girar.', 'Fondo liso detrás (una cartulina de pie).', 'Si es plana, del mismo grosor en todas partes, no hace falta: mide el grosor con el calibre.'] },
  canto: { titulo: 'Desde la PUNTA', corto: 'Desde la punta', porque: 'Tiene escalones: desde la punta veo si cambian también a lo ancho.',
    tips: ['Igual que la de lado, pero mirando el lado CORTO (la punta derecha de la foto de frente).', 'El móvil de pie y a la altura de la pieza.', 'Si la haces desde la otra punta, marca «Hecha desde el otro lado».'] },
};
export const CONSEJOS = ['📏 Cuanto más grande salga la pieza en la foto, más exacta: que ocupe al menos la mitad.', '🧾 Con el tapete de calco la foto se endereza y calibra sola (y te dice la precisión).', '💡 Luz pareja y sin flash: las sombras duras parecen pieza.', '🎯 Enfoca tocando la pieza en la pantalla del móvil antes de disparar.', '🧹 Quita pelusas y migas del tapete: el programa las quita, pero mejor sin ellas.', '📐 Lo que mides con el calibre MANDA sobre la foto: la foto da la forma, el calibre la medida.'];

// ---------- lo que se puede MEJORAR de una foto ya subida ----------
// f = la foto de CelebriCLON ({ vista, tapete, rest, analisis… }) · I = { w, h } de la imagen de trabajo · E = escala (escalaDe) o null
// → [{ t, grave }]
export function mejoras(f, I, E) {
  const L = [], A = f && f.analisis;
  if (f.tapete && f.tapete.pose && f.tapete.pose.inclinacion > 8) L.push({ t: 'El móvil estaba inclinado ' + Math.round(f.tapete.pose.inclinacion) + '°: la próxima, más plano (el tapete lo corrige, pero plano sale mejor).' });
  if (A && A.R && I && I.w) { const frac = Math.max(A.R.L / I.w, A.R.W / (I.h || I.w)); if (!f.rest && frac < 0.35) L.push({ t: 'La pieza sale pequeña en la foto (' + Math.round(frac * 100) + ' %): acércate o usa el zoom para que ocupe más.' }); }
  if (E && E.mmPorPx > 0.25) L.push({ t: 'Poca resolución (1 píxel = ' + E.mmPorPx.toFixed(2).replace('.', ',') + ' mm): acércate o usa el zoom.', grave: E.mmPorPx > 0.5 });
  if (f.rest && f.rest.confianza === 'baja') L.push({ t: 'Me ha costado separar la pieza del fondo: un fondo más liso y que contraste (folio blanco con pieza oscura, cartulina negra con pieza clara).', grave: true });
  else if (f.rest && f.rest.confianza === 'media') L.push({ t: 'El contorno es dudoso en alguna zona: mira la línea verde y, si falla, «🩹 Retocar».' });
  if (A && A.error) L.push({ t: A.error, grave: true });
  if (!E && f.vista !== 'otra') L.push({ t: 'Sin escala: usa el tapete, pon una regla al lado o escribe el largo (C1).' });
  return L;
}

// ---------- ¿qué fotos faltan? ----------
// fotos = [{ vista }] · o = { plana (no hace falta de lado), sinCanto, escalones (la de lado tiene escalones) }
// → [{ v, estado: 'hecha' | 'ahora' | 'luego' | 'no' | 'opcional', motivo }]
export function plan(fotos, o = {}) {
  const tiene = v => fotos.some(f => f.vista === v), L = [];
  L.push({ v: 'principal', estado: tiene('principal') ? 'hecha' : 'ahora' });
  L.push({ v: 'lado', estado: tiene('lado') ? 'hecha' : o.plana ? 'no' : 'luego', motivo: o.plana ? 'Es plana: el grosor se mide con el calibre.' : '' });
  L.push({ v: 'canto', estado: tiene('canto') ? 'hecha' : o.sinCanto ? 'no' : o.escalones ? 'luego' : tiene('lado') || o.plana ? 'no' : 'opcional',
    motivo: o.escalones ? 'La de lado tiene escalones: desde la punta salen exactos también a lo ancho.' : o.sinCanto ? 'Dicho que no hace falta.' : tiene('lado') ? 'La de lado no tiene escalones: no hace falta.' : o.plana ? 'Es plana: no hace falta.' : 'Solo si tiene escalones (lo sabré con la de lado).' });
  const i = L.findIndex(p => p.estado === 'luego' || (p.estado === 'ahora')); if (i >= 0) L[i].estado = 'ahora';
  return L;
}
