// ================= 👗 CelebriDREW · 🧑 AVATARES HUMANOS: piel, ojos, cejas, labios y PELO de calidad (18-10-2026) =================
// Ella: «los cabellos tienen que ser de mejor calidad; los avatares… tienen que ser avatares con colores humanos, ojos, todo».
// Hasta hoy: un maniquí lacado con el pelo como una pieza lisa. Aquí:
//  · TONOS DE PIEL humanos (8, de porcelana a ébano) con labios y rubor que van con cada tono;
//  · OJOS de verdad: globo blanco, iris con sus vetas y anillo, pupila y brillo (córnea), en el centro EXACTO de los ojos de MakeHuman
//    (sus articulaciones l-eye / r-eye) y mirando a donde miran (l-eye-target);
//  · CEJAS y LABIOS pintados en la piel con la posición de los ojos y la boca de ESE cuerpo (sirven para cualquier talla);
//  · PELO DE MECHONES: miles de cintas finas (con la textura de los pelos, transparentes en los bordes y con el brillo alargado del pelo)
//    peinadas sobre la forma del peinado de siempre —que se queda debajo como base y es con lo que choca la capucha—: moño, coleta, melena
//    y corto, cada uno con su caída (la coleta y el moño, recogidos hacia su sitio).
// Lo que no es de la pantalla (las cuentas de los mechones) se prueba en Node: test/unit/drew_humano.mjs.
import * as PL from './pelo.js';

// ---------- 🎨 tonos de piel (y lo que va con cada uno) ----------
export const PIELES_H = {
  porcelana: { c: '#f3dccb', t: 'Porcelana', labio: '#c98a86', rubor: 0.10 }, clara: { c: '#eccbb0', t: 'Clara', labio: '#c27c74', rubor: 0.10 },
  beige: { c: '#ddb48f', t: 'Beige', labio: '#b56f63', rubor: 0.08 }, media: { c: '#c79670', t: 'Media', labio: '#a5604f', rubor: 0.07 },
  canela: { c: '#a8754f', t: 'Canela', labio: '#8a4d3d', rubor: 0.05 }, morena: { c: '#875a3c', t: 'Morena', labio: '#6e3c2e', rubor: 0.04 },
  oscura: { c: '#5f3d29', t: 'Oscura', labio: '#4f2c22', rubor: 0.03 }, ebano: { c: '#40291c', t: 'Ébano', labio: '#3a2018', rubor: 0.02 },
};
export const OJOS = [['marron', 'Marrones', '#5a3a22'], ['avellana', 'Avellana', '#7b6034'], ['verde', 'Verdes', '#4f6f3a'], ['azul', 'Azules', '#3f6d9a'], ['gris', 'Grises', '#7d8a93'], ['negro', 'Negros', '#241a14']];
export const ojoColor = k => (OJOS.find(o => o[0] === k) || OJOS[0])[2];
export const esHumana = k => !!PIELES_H[k];
// el aspecto de la cara en una pieza: lo que el sombreador necesita (en mm, como el cuerpo)
export function cara(J, H) {
  // (la «mouth» de MakeHuman está DENTRO de la cabeza, a la altura de la nariz: medido en el perfil del cuerpo, la línea de los labios va 62 mm
  //  por debajo de los ojos y unos 3 cm por delante de su centro)
  if (!J || !J['l-eye'] || !J['r-eye']) return null; const s = (H || 1650) / 1650, L = J['l-eye'], R = J['r-eye'], M = [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2 - 62 * s, (L[2] + R[2]) / 2 + 28 * s];
  // el radio del ojo: la mitad de lo que separan los párpados de arriba y de abajo (o 12 mm a la escala del cuerpo)
  const lid = J['l-upperlid'] && J['l-lowerlid'] ? Math.hypot(J['l-upperlid'][0] - J['l-lowerlid'][0], J['l-upperlid'][1] - J['l-lowerlid'][1], J['l-upperlid'][2] - J['l-lowerlid'][2]) : 0;
  // (con 13,5 mm se veía blanco por encima del iris —mirada de susto—: el globo, algo más pequeño y 1,5 mm más adentro, lo tapan los párpados)
  const r = Math.max(10 * s, Math.min(11.6 * s, lid > 0 ? lid * 0.82 : 11.6 * s)), atras = (P, T) => { const d = [T[0] - P[0], T[1] - P[1], T[2] - P[2]], l = Math.hypot(...d) || 1; return [P[0] - 1.5 * s * d[0] / l, P[1] - 1.5 * s * d[1] / l, P[2] - 1.5 * s * d[2] / l]; };
  const tL0 = J['l-eye-target'] || [L[0], L[1], L[2] + 100], tR0 = J['r-eye-target'] || [R[0], R[1], R[2] + 100];
  return { s, L: atras(L, tL0), R: atras(R, tR0), Lc: L, Rc: R, M, r, tL: J['l-eye-target'] || [L[0], L[1], L[2] + 100], tR: J['r-eye-target'] || [R[0], R[1], R[2] + 100] };
}

// ---------- 💇 el PELO de mechones ----------
// Las raíces, sobre el casquete del peinado (la esfera unidad del pelo de siempre, con su línea de nacimiento); cada mechón baja por la
// cabeza (o va hacia la coleta / el moño) en pasos, sin despegarse de la forma de siempre más que un poco (la capucha choca con ella).
// → { pos, uv, col (0–1, la variación de tono), idx } en coordenadas de la CABEZA (las del grupo del pelo: centro de la cabeza, mm)
function azar(sem) { let s = sem >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function mechones(E, cab, o = {}) {
  if (!cab || !E || E === 'no') return null;
  const r = cab.r, gros = PL.grosorPelo(E) * 1.012, lim = PL.LINEA[E] || PL.LINEA.corto, A = azar(o.semilla || 7), n = o.n || ({ corto: 1700, mono: 2000, coleta: 2000, melena: 2600 }[E] || 2000);
  const X = PL.extras(E, r), tope = X.find(x => x.tipo === 'bola' || x.tipo === 'coleta'), dentro = d => { const th = Math.acos(Math.max(-1, Math.min(1, d[1]))) * 180 / Math.PI, f = d[2] / Math.max(1e-6, Math.hypot(d[0], d[2])); return th <= lim(f); };
  // de la esfera unidad a la forma del peinado (como el casquete de siempre: escalada y, en la melena, deformada abajo)
  const forma = d => { let [x, y, z] = d; const th = Math.acos(Math.max(-1, Math.min(1, y))) * 180 / Math.PI, fz = z / Math.max(1e-6, Math.hypot(x, z)), b = PL.bordePelo(E, th, fz) * PL.bultoNuca(th, fz);
    if (E === 'melena') [x, y, z] = PL.deformaMelena(x, y, z); return [x * r[0] * gros * b, y * r[1] * gros * b, z * r[2] * gros * b]; }; /* (en la línea del pelo, pegado a la piel) */
  // hacia dónde va el pelo en cada punto: abajo por la cabeza (melena, corto) o hacia la coleta / el moño (recogidos)
  const destino = tope ? norm([tope.c[0] / r[0], tope.c[1] / r[1], tope.c[2] / r[2]]) : null;
  const rumbo = d => { let g = E === 'melena' || E === 'corto' || !destino ? [0, -1, 0] : [destino[0] - d[0], destino[1] - d[1], destino[2] - d[2]];
    if (E === 'corto') g = norm([d[0] * 0.3, -0.35, -1]); /* (el corto, PEINADO HACIA ATRÁS: de la frente hacia la coronilla, a los lados y detrás hacia abajo; antes los de la frente caían a la cara como pinchos) */
    const t = [g[0] - punto(g, d) * d[0], g[1] - punto(g, d) * d[1], g[2] - punto(g, d) * d[2]], L = Math.hypot(...t); return L < 1e-4 ? null : [t[0] / L, t[1] / L, t[2] / L]; };
  const pos = [], uv = [], col = [], idx = [], ancho = (o.ancho || 7) * (r[0] / 75);
  for (let i = 0; i < n; i++) {
    // raíz: un punto al azar del casquete, dentro de la línea del pelo (más denso arriba, como de verdad)
    // (1 de cada 4, justo en la línea del pelo: que el borde quede cubierto de pelos y no se vea dónde acaba el casquete)
    let d = null; if (i % 4 === 0) for (let t = 0; t < 10 && !d; t++) { const ph = 2 * Math.PI * A(), f = Math.sin(ph), th = (lim(f) - 1 - 7 * A()) * Math.PI / 180; if (E === 'melena' && f < 0.5) break; d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; }
    for (let t = 0; t < 30 && !d; t++) { const u = A(), v = A(), th = Math.acos(1 - 2 * u * 0.78) /* (hasta la nuca: si no, abajo detrás se veía la base sin mechones) */, ph = 2 * Math.PI * v, q = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; if (dentro(q)) d = q; }
    if (!d) continue;
    const tono = 0.82 + 0.36 * A(), pasos = E === 'corto' ? 7 : 14, lar = (E === 'corto' ? 0.05 : E === 'melena' ? 0.11 : 0.085) * (0.75 + 0.5 * A()), cam = [], w0 = ancho * (0.7 + 0.6 * A());
    let p = d; cam.push(p);
    for (let k = 0; k < pasos; k++) { const t = rumbo(p); if (!t) break; const ruido = 0.18 * (A() - 0.5); const q = norm([p[0] + lar * (t[0] + ruido * t[2]), p[1] + lar * t[1], p[2] + lar * (t[2] - ruido * t[0])]);
      if (!dentro(q) && !(E === 'melena' && q[1] < 0.2)) break; // (fuera de la línea del pelo se acaba; la melena sigue cayendo por debajo)
      if (destino && Math.acos(Math.max(-1, Math.min(1, punto(q, destino)))) < 0.12) { cam.push(q); break; } // (llega a la coleta / el moño)
      if (E === 'melena' && q[1] < -0.95) break;
      cam.push(q); p = q; }
    if (cam.length < 3) continue;
    // la cinta: cada punto con su ancho (más fina en la punta), levantada un poco de la forma (los de encima, más)
    const base = pos.length / 3, alza0 = 0.012 + 0.03 * A();
    cam.forEach((q, k) => { const P0 = forma(q), b = Math.hypot(P0[0] / r[0], P0[1] / r[1], P0[2] / r[2]) / gros / PL.bultoNuca(Math.acos(Math.max(-1, Math.min(1, q[1]))) * 180 / Math.PI, q[2] / Math.max(1e-6, Math.hypot(q[0], q[2]))), alza = 1 + alza0 * Math.max(0.25, (b - 0.94) / 0.06), P = P0.map(v => v * alza), sig = cam[Math.min(cam.length - 1, k + 1)], ant = cam[Math.max(0, k - 1)], tg = norm(forma(sig).map((v, j) => v - forma(ant)[j])), nr = norm(forma(q)), lado = norm(cruz(tg, nr)), w = w0 * (1 - 0.55 * k / (cam.length - 1));
      pos.push(P[0] - lado[0] * w / 2, P[1] - lado[1] * w / 2, P[2] - lado[2] * w / 2, P[0] + lado[0] * w / 2, P[1] + lado[1] * w / 2, P[2] + lado[2] * w / 2);
      const vv = k / (cam.length - 1), u0 = (i % 8) / 8; uv.push(u0, vv, u0 + 1 / 8, vv); col.push(tono, tono); });
    for (let k = 0; k < cam.length - 1; k++) { const a = base + 2 * k; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  // la COLETA y el MOÑO, también de mechones: alrededor de su forma (el huso cae; la bola, en espiral)
  X.forEach(x => { const m = x.tipo === 'coleta' ? 520 : x.tipo === 'bola' ? 720 : 0; for (let i = 0; i < m; i++) { const ph = 2 * Math.PI * A(), tono = 0.82 + 0.36 * A(), base = pos.length / 3, w0 = ancho * (0.7 + 0.6 * A()), cam = [];
      if (x.tipo === 'coleta') { const L = x.L, ra = x.ra, rb = x.rb; for (let k = 0; k <= 10; k++) { const f = k / 10, rr = (ra + (rb - ra) * f) * 1.02, yy = L / 2 - f * L; cam.push([Math.cos(ph) * rr, yy, Math.sin(ph) * rr]); }
        const c = Math.cos(x.rot || 0), s2 = Math.sin(x.rot || 0); cam.forEach((q, k) => { cam[k] = [q[0] + x.c[0], q[1] * c - q[2] * s2 + x.c[1], q[1] * s2 + q[2] * c + x.c[2]]; }); }
      else { const R = x.rad * 1.02, sc = x.s || [1, 1, 1]; for (let k = 0; k <= 10; k++) { const a = ph + k * 0.32, el = -0.9 + 1.8 * (i / m) + 0.05 * k; const ce = Math.cos(el); cam.push([x.c[0] + R * sc[0] * ce * Math.cos(a), x.c[1] + R * sc[1] * Math.sin(el), x.c[2] + R * sc[2] * ce * Math.sin(a)]); } }
      // (lo que del moño / la coleta queda dentro de la cabeza se saca a su superficie: así el mechón se apoya en el pelo y no se mete en la cabeza)
      cam.forEach((P, k) => { const e = Math.hypot(P[0] / r[0], P[1] / r[1], P[2] / r[2]), q = [P[0] / r[0] / e, P[1] / r[1] / e, P[2] / r[2] / e], s = gros * 1.012 * PL.bultoNuca(Math.acos(Math.max(-1, Math.min(1, q[1]))) * 180 / Math.PI, q[2] / Math.max(1e-6, Math.hypot(q[0], q[2]))); if (e < s) cam[k] = P.map(v => v * s / Math.max(e, 1e-6)); });
      cam.forEach((P, k) => { const sig = cam[Math.min(cam.length - 1, k + 1)], ant = cam[Math.max(0, k - 1)], tg = norm([sig[0] - ant[0], sig[1] - ant[1], sig[2] - ant[2]]), cen = x.tipo === 'coleta' ? [x.c[0], P[1], x.c[2]] : x.c, nr = norm([P[0] - cen[0], P[1] - cen[1], P[2] - cen[2]]), lado = norm(cruz(tg, nr)), w = w0 * (1 - 0.45 * k / 10);
        pos.push(P[0] - lado[0] * w / 2, P[1] - lado[1] * w / 2, P[2] - lado[2] * w / 2, P[0] + lado[0] * w / 2, P[1] + lado[1] * w / 2, P[2] + lado[2] * w / 2); const vv = k / 10, u0 = (i % 8) / 8; uv.push(u0, vv, u0 + 1 / 8, vv); col.push(tono, tono); });
      for (let k = 0; k < cam.length - 1; k++) { const a = base + 2 * k; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } } });
  return { pos: Float32Array.from(pos), uv: Float32Array.from(uv), col: Float32Array.from(col), idx: Uint32Array.from(idx), n: idx.length / 6 };
}

// ---------- texturas (en la pantalla) ----------
// la de los PELOS: 8 columnas (una por mechón), cada una con 10–14 pelos finos de distinta opacidad, más finos en la punta (abajo)
export function texturaPelo(doc = document) {
  const c = doc.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d'), A = azar(11); g.clearRect(0, 0, 256, 512);
  for (let col = 0; col < 8; col++) for (let k = 0; k < 13; k++) { const x = col * 32 + 2 + A() * 28, a = 0.35 + 0.65 * A(), w = 0.6 + 1.3 * A(), L = 0.75 + 0.25 * A();
    const gr = g.createLinearGradient(0, 0, 0, 512 * L); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.06, 'rgba(255,255,255,' + a + ')'); /* (la raíz, saliendo de la piel: si no, la línea del pelo se veía cortada a tijera) */ gr.addColorStop(0.85, 'rgba(255,255,255,' + a * 0.85 + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = gr; g.lineWidth = w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (A() - 0.5) * 6, 170, x + (A() - 0.5) * 8, 340, x + (A() - 0.5) * 10, 512 * L); g.stroke(); }
  return c;
}
// la del OJO (equirectangular de una esfera de three.js: el centro del iris en u = 0,25 · v = 0,5, que mira a +z)
export function texturaOjo(color, doc = document) {
  const c = doc.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'), cx = 128, cy = 128, A = azar(5);
  const bl = g.createRadialGradient(cx, cy, 20, cx, cy, 300); bl.addColorStop(0, '#fbf8f4'); bl.addColorStop(0.6, '#f1e8e2'); bl.addColorStop(1, '#e2c9c0'); g.fillStyle = bl; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = 'rgba(190,80,80,0.18)'; g.lineWidth = 0.8; for (let i = 0; i < 26; i++) { const a = A() * 2 * Math.PI, r0 = 60 + A() * 20; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0 * 2, cy + Math.sin(a) * r0); g.quadraticCurveTo(cx + Math.cos(a + 0.3) * 140 * 2, cy + Math.sin(a + 0.2) * 110, cx + Math.cos(a + 0.5) * 220 * 2, cy + Math.sin(a + 0.4) * 128); g.stroke(); }
  // el iris (en la esfera, el círculo se ve como una elipse el doble de ancha en la textura)
  g.save(); g.translate(cx, cy); g.scale(2, 1);
  const ir = g.createRadialGradient(0, 0, 4, 0, 0, 30); ir.addColorStop(0, color); ir.addColorStop(0.75, color); ir.addColorStop(1, '#1d140f'); g.fillStyle = ir; g.beginPath(); g.arc(0, 0, 30, 0, 2 * Math.PI); g.fill();
  for (let i = 0; i < 90; i++) { const a = i / 90 * 2 * Math.PI + A() * 0.05, l = 0.55 + 0.4 * A(); g.strokeStyle = 'rgba(255,255,255,' + (0.05 + 0.09 * A()) + ')'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a) * 30 * l, Math.sin(a) * 30 * l); g.stroke(); }
  g.fillStyle = '#0b0807'; g.beginPath(); g.arc(0, 0, 10.5, 0, 2 * Math.PI); g.fill(); g.restore();
  return c;
}
