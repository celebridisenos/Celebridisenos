// ================= v20.4 · 🧬 CelebriCLON · REPUESTOS DESDE FOTOS: qué medir, dónde, y la pieza con TUS medidas =================
// La dueña (10-10-2026): «el programa debe decirme qué tengo que medir, mostrarme exactamente dónde hacerlo mediante imágenes
// marcadas y utilizar mis mediciones para construir un modelo 3D coherente. Debe pedirme los datos que falten en lugar de
// inventárselos». Cómo lo hace (sin nube, sin inventar):
//  1) Cada FOTO se mira por su silueta (pieza sobre fondo liso): el rectángulo más pequeño que la encierra, los AGUJEROS (redondos o
//     ranuras, y cuáles son iguales), y en las fotos de lado los ESCALONES (las alturas donde el borde se queda plano).
//  2) Con eso se hace la LISTA DE MEDIDAS de ESTA pieza (no una plantilla): largo y ancho; un diámetro por cada grupo de agujeros
//     iguales; sus posiciones (lo que está centrado o es simétrico SE DEDUCE y no se pide); ranuras; alto y escalones si hay foto de
//     lado. Cada una con su sitio en la foto (cota con flechas o círculo) para dibujarla marcada.
//  3) La PIEZA: la silueta de cada vista ajustada a TUS medidas (se estira por tramos: lo medido manda) y las vistas se CRUZAN
//     (lo que se ve de frente ∩ lo que se ve de lado); los agujeros y las ranuras van EXACTOS donde tú dices.
//  4) Lo que NO se puede saber (huecos que no se ven, roscas, el radio de las curvas, lo que está a otra altura que la referencia) se
//     dice; y si falta una foto (de lado) o la foto no vale (se sale, poco contraste, sin calibrar, torcida), se PIDE.
import * as N from './nucleo.js';
import * as FM from './foto_medida.js';

const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], dot = (a, b) => a[0] * b[0] + a[1] * b[1], len = a => Math.hypot(a[0], a[1]);
export const VISTAS = { principal: 'Principal (la cara grande, de frente)', lado: 'De lado (se ve el largo y el alto)', canto: 'De canto (se ve el ancho y el alto)', otra: 'Otra (solo para mirar)' };
// La dueña (10-10-2026): «que ponga las medidas en mm y si son piezas muy grandes a cm lo pasa automáticamente; solo orificios
// utilizamos la M». Las cotas se llaman C1, C2…; la «M» es la del TORNILLO de un agujero (M3, M4…: de paso o para roscar).
// Unidad: mm; si la pieza mide 1 m o más, cm (por dentro todo sigue en mm).
export const unidadDe = (largoMm) => (largoMm >= 1000 ? 'cm' : 'mm');
export const fmt = (mm, u = 'mm') => mm == null || !isFinite(mm) ? '—' : u === 'cm' ? (Math.round(mm / 10 * 100) / 100).toLocaleString('es-ES') + ' cm' : (Math.round(mm * 100) / 100).toLocaleString('es-ES') + ' mm';
// agujeros de PASO (ISO 273, fino y medio) y para ROSCAR (broca de macho) de los métricos más usados
const METRICOS = [['M2', 2.2, 2.4, 1.6], ['M2,5', 2.7, 2.9, 2.05], ['M3', 3.2, 3.4, 2.5], ['M4', 4.3, 4.5, 3.3], ['M5', 5.3, 5.5, 4.2], ['M6', 6.4, 6.6, 5.0], ['M8', 8.4, 9.0, 6.8], ['M10', 10.5, 11, 8.5], ['M12', 13, 13.5, 10.2]];
export function metricaDe(d) { // → { M, tipo: 'paso' | 'roscar', t } o null · a igualdad, «de paso» o «para roscar» (lo que se hace en las piezas impresas)
  if (!(d > 0)) return null; let mejor = null;
  METRICOS.forEach(([M, f, m, r]) => { [[f, 'paso'], [m, 'paso'], [r, 'roscar'], [Number(M.slice(1).replace(',', '.')), 'justo']].forEach(([v, tipo]) => { const e0 = Math.abs(d - v), e = e0 + (tipo === 'justo' ? 0.06 : 0); if (e0 <= Math.max(0.12, 0.03 * v) && (!mejor || e < mejor.e)) mejor = { M, tipo, e }; }); });
  if (!mejor) return null;
  return { M: mejor.M, tipo: mejor.tipo, t: mejor.tipo === 'paso' ? 'agujero de paso para tornillo ' + mejor.M : mejor.tipo === 'roscar' ? 'agujero para ROSCAR ' + mejor.M + ' (macho o tornillo autorroscante)' : 'justo para ' + mejor.M + ' (en plástico: para roscar a la fuerza o un inserto)' };
}
export const ESTADOS = { pendiente: 'Pendiente', estimada: 'Estimada (de la foto)', introducida: 'Introducida', verificada: 'Verificada', na: 'No aplicable' };

// ---------- rectángulo más pequeño que encierra unos puntos (por su envolvente convexa) ----------
function envolvente(P) {
  const L = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = []; L.forEach(p => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
  for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
export function rectMinimo(P) {
  const H = envolvente(P); let mejor = null;
  for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length], l = len(sub(b, a)); if (l < 1e-9) continue; const e = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], nn = [-e[1], e[0]];
    let e0 = Infinity, e1 = -Infinity, n0 = Infinity, n1 = -Infinity; H.forEach(p => { const x = dot(p, e), y = dot(p, nn); e0 = Math.min(e0, x); e1 = Math.max(e1, x); n0 = Math.min(n0, y); n1 = Math.max(n1, y); });
    const A = (e1 - e0) * (n1 - n0); if (!mejor || A < mejor.A - 1e-6) mejor = { A, e, nn, e0, e1, n0, n1 }; }
  let { e, nn, e0, e1, n0, n1 } = mejor, cx = (e0 + e1) / 2, cy = (n0 + n1) / 2;
  const c = [e[0] * cx + nn[0] * cy, e[1] * cx + nn[1] * cy]; let L = e1 - e0, W = n1 - n0, ex = e;
  if (W > L) { [L, W] = [W, L]; ex = nn; }
  // el eje largo hacia la derecha (y si va casi en vertical, hacia arriba en la pantalla); «arriba» = −y de la foto
  if (ex[0] < -1e-9 || (Math.abs(ex[0]) < 1e-9 && ex[1] > 0)) ex = [-ex[0], -ex[1]];
  if (Math.abs(ex[1]) > 0.999) ex = ex[1] > 0 ? [-ex[0], -ex[1]] : ex;
  const ey = [ex[1], -ex[0]];
  return { c, ex, ey, L, W, ang: Math.atan2(-ex[1], ex[0]) * 180 / Math.PI };
}
const aMarco = (R, p) => { const d = sub(p, R.c); return [dot(d, R.ex), dot(d, R.ey)]; };
const deMarco = (R, x, y) => [R.c[0] + R.ex[0] * x + R.ey[0] * y, R.c[1] + R.ex[1] * x + R.ey[1] * y];
export { aMarco, deMarco };

// ---------- 1) MIRAR UNA FOTO ----------
// D = ImageData · o.espejo (la foto de lado hecha desde el otro lado) → { R, fuera (marco, px), agujeros, niveles, avisos }
export function analizaFoto(D, o = {}) {
  const C = FM.contornos(D), avisos = [];
  const pz = FM.pieza(C.anillos, q => q, Math.max(30, D.width * D.height * 0.0005));
  if (!pz) return { error: 'No encuentro la pieza: ponla sobre un fondo liso que contraste (papel blanco o cartulina negra) y que se vea entera.' };
  const areaFrac = pz.area / (D.width * D.height);
  const toca = pz.fuera.some(q => q[0] < 2 || q[1] < 2 || q[0] > D.width - 3 || q[1] > D.height - 3);
  if (toca) avisos.push('La pieza se SALE de la foto: hazla otra vez desde más lejos (que se vea entera).');
  if (areaFrac < 0.02) avisos.push('La pieza sale muy pequeña en la foto (' + n2(areaFrac * 100) + ' % de la imagen): acércate o usa el zoom.');
  const R = rectMinimo(pz.fuera), esp = o.espejo ? -1 : 1, M = p => { const q = aMarco(R, p); return [esp * q[0], q[1]]; };
  const fuera = pz.fuera.map(M);
  const agujeros = pz.agujeros.map(r => {
    const rm = r.map(M), ci = FM.circulo(rm), A = Math.abs(FM.area(rm));
    if (ci && ci.desv < Math.max(1.2, 0.07 * ci.r)) return { tipo: 'redondo', c: ci.c, d: 2 * ci.r, area: A };
    const Rr = rectMinimo(rm); return { tipo: 'ranura', c: Rr.c, L: Rr.L, W: Rr.W, ang: Math.atan2(Rr.ex[1], Rr.ex[0]) * 180 / Math.PI, area: A };
  }).filter(a => (a.tipo === 'redondo' ? a.d : a.W) > 3);
  // escalones: tramos casi horizontales del borde (al menos un 5 % del largo), agrupados por altura
  const seg = []; for (let i = 0; i < fuera.length; i++) { const a = fuera[i], b = fuera[(i + 1) % fuera.length], dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]); if (dx >= 0.05 * R.L && dy < 0.15 * dx) seg.push({ y: (a[1] + b[1]) / 2, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), l: dx }); }
  const tolY = Math.max(2, 0.025 * R.W), niveles = [];
  seg.sort((a, b) => a.y - b.y).forEach(s => { const n = niveles.find(k => Math.abs(k.y - s.y) < tolY); if (n) { n.y = (n.y * n.l + s.y * s.l) / (n.l + s.l); n.l += s.l; n.tramos.push([s.x0, s.x1]); } else niveles.push({ y: s.y, l: s.l, tramos: [[s.x0, s.x1]] }); });
  return { R, fuera, agujeros, niveles: niveles.sort((a, b) => a.y - b.y), avisos, areaFrac, toca, umbral: C.umbral };
}

// ---------- la escala de cada foto: calibrada (referencias) o deducida de una medida ya escrita ----------
export function escalaDe(F, medidas, fotos) {
  const C = F.refs && F.refs.length ? FM.calibra(F.refs) : null; if (C) return { mmPorPx: C.mmPorPx, de: 'calibrada', C };
  const A = F.analisis; if (!A || !A.R) return null;
  // sin calibrar: con una medida ya escrita de lo que se ve en ESTA foto (la principal y la de lado enseñan el largo; la de canto, el ancho)
  const de = F.vista === 'canto' ? 'ancho' : 'largo', m = (medidas || []).find(x => x.clave === de && x.valor > 0 && x.estado !== 'na');
  if (m && F.vista !== 'otra') return { mmPorPx: m.valor / A.R.L, de: 'del ' + de + ' (' + m.id + ')' };
  const m2 = F.vista === 'principal' && (medidas || []).find(x => x.clave === 'ancho' && x.valor > 0 && x.estado !== 'na');
  if (m2) return { mmPorPx: m2.valor / A.R.W, de: 'del ancho (' + m2.id + ')' };
  // la de lado o de canto, con el largo (o el ancho) que se ve en la PRINCIPAL ya calibrada
  if ((F.vista === 'lado' || F.vista === 'canto') && fotos) { const Pp = fotos.find(f => f.vista === 'principal' && f.analisis && f.analisis.R), Ep = Pp && escalaDe(Pp, medidas, null);
    if (Ep) { const L = (F.vista === 'canto' ? Pp.analisis.R.W : Pp.analisis.R.L) * Ep.mmPorPx; return { mmPorPx: L / A.R.L, de: 'de la foto principal (' + Ep.de + ')' }; } }
  return null;
}

// ---------- 2) LA LISTA DE MEDIDAS DE ESTA PIEZA ----------
// fotos = [{ i, vista, analisis }] → { medidas: [...], peticiones: [...] } · cada medida: { id, clave, nombre, foto, geo, instr, critica, deduce? }
const igualD = (a, b) => Math.abs(a - b) <= Math.max(1.5, 0.05 * Math.max(a, b));
function agrupa(L, f) { const G = []; L.forEach(x => { const g = G.find(g => f(g[0], x)); if (g) g.push(x); else G.push([x]); }); return G; }
export function planMedidas(fotos, antes = []) {
  const M = [], pet = [], ded = [], previo = new Map(antes.map(m => [m.clave, m])); let k = 0;
  const add = o => { const p = previo.get(o.clave); M.push(Object.assign({ id: 'C' + (++k), valor: null, inc: null, estado: 'pendiente' }, o, p ? { valor: p.valor, inc: p.inc, estado: p.estado } : {})); };
  const P = fotos.find(f => f.vista === 'principal' && f.analisis && f.analisis.R) || fotos.find(f => f.analisis && f.analisis.R && f.vista !== 'otra');
  if (!P) { pet.push({ tipo: 'foto', vista: 'principal', t: 'Haz una foto de la pieza DE FRENTE (por su cara más grande), sobre un fondo liso que contraste, con la cámara paralela a la pieza.' }); return { medidas: M, peticiones: pet, deducidas: ded, principal: null }; }
  const A = P.analisis, R = A.R, off = Math.max(18, 0.08 * R.W);
  add({ clave: 'largo', nombre: 'Largo total', foto: P.i, geo: { tipo: 'cota', a: [-R.L / 2, -R.W / 2], b: [R.L / 2, -R.W / 2], d: [0, -off] }, instr: 'De punta a punta por el lado más largo, con el calibre (o una regla si es grande).', critica: true });
  add({ clave: 'ancho', nombre: 'Ancho total', foto: P.i, geo: { tipo: 'cota', a: [R.L / 2, -R.W / 2], b: [R.L / 2, R.W / 2], d: [off, 0] }, instr: 'De lado a lado por lo más ancho, en perpendicular al largo.', critica: true });
  // agujeros redondos: un diámetro por grupo de iguales; posiciones sin pedir lo que se deduce
  const red = A.agujeros.filter(a => a.tipo === 'redondo'), ran = A.agujeros.filter(a => a.tipo === 'ranura');
  const cent = (v, D) => Math.abs(v) < Math.max(2, 0.025 * D);
  agrupa(red, (a, b) => igualD(a.d, b.d)).forEach((g, gi) => {
    const nom = g.length > 1 ? 'Ø de los ' + g.length + ' agujeros iguales' : 'Ø del agujero';
    add({ clave: 'agD' + gi, nombre: nom, foto: P.i, geo: { tipo: 'circulo', c: g[0].c, r: g[0].d / 2, otros: g.slice(1).map(x => ({ c: x.c, r: x.d / 2 })) }, instr: 'Por dentro del agujero, con las puntas de DENTRO del calibre.' + (g.length > 1 ? ' Son ' + g.length + ' iguales: basta con medir uno.' : ''), critica: true, grupo: { tipo: 'redondo', idx: g.map(x => red.indexOf(x)) } });
    posiciones(g, 'ag' + gi, g.length > 1 ? 'los agujeros' : 'el agujero');
  });
  agrupa(ran, (a, b) => igualD(a.L, b.L) && igualD(a.W, b.W)).forEach((g, gi) => {
    const s = g[0], u = [Math.cos(s.ang * Math.PI / 180), Math.sin(s.ang * Math.PI / 180)], v = [-u[1], u[0]], p = (t, w) => [s.c[0] + u[0] * t + v[0] * w, s.c[1] + u[1] * t + v[1] * w];
    add({ clave: 'raL' + gi, nombre: 'Largo de la ranura' + (g.length > 1 ? ' (las ' + g.length + ' iguales)' : ''), foto: P.i, geo: { tipo: 'cota', a: p(-s.L / 2, 0), b: p(s.L / 2, 0), d: [0, 0], dentro: true }, instr: 'De punta a punta por dentro de la ranura.', critica: true, grupo: { tipo: 'ranura', idx: g.map(x => ran.indexOf(x)) } });
    add({ clave: 'raW' + gi, nombre: 'Ancho de la ranura', foto: P.i, geo: { tipo: 'cota', a: p(0, -s.W / 2), b: p(0, s.W / 2), d: [0, 0], dentro: true }, instr: 'Por dentro, de lado a lado de la ranura.', critica: true });
    posiciones(g, 'ra' + gi, g.length > 1 ? 'las ranuras' : 'la ranura');
  });
  function posiciones(g, cl, que) {
    // por filas (mismo «y»): un «y» por fila (o centrado: se deduce); en cada fila: simétrica → entre centros; si no, desde el borde
    const filas = agrupa(g, (a, b) => Math.abs(a.c[1] - b.c[1]) < Math.max(2, 0.03 * R.W)).map(f => f.sort((a, b) => a.c[0] - b.c[0]));
    filas.forEach((f, fi) => {
      const y = f.reduce((s, x) => s + x.c[1], 0) / f.length, x0 = f[0].c[0], x1 = f[f.length - 1].c[0], xm = (x0 + x1) / 2, cl2 = cl + 'f' + fi;
      const deY = cent(y, R.W) ? true : null; if (deY) ded.push('La altura de ' + que + ': centrado a lo ancho (está en medio), no hace falta medirlo.');
      if (!deY) { const deArriba = y > 0, yb = deArriba ? R.W / 2 : -R.W / 2; add({ clave: cl2 + 'y', nombre: 'Del borde de ' + (deArriba ? 'arriba' : 'abajo') + ' al centro de ' + que, foto: P.i, geo: { tipo: 'cota', a: [f[0].c[0], yb], b: [f[0].c[0], y], d: [0, 0], dentro: true }, instr: 'Del borde hasta el CENTRO: mide hasta el borde del agujero y súmale medio diámetro.', critica: true, ref: { eje: 'y', desde: deArriba ? 1 : -1 } }); }
      if (f.length === 1) {
        if (cent(x0, R.L)) ded.push('Dónde está ' + que + ' a lo largo: en el centro, no hace falta medirlo.');
        if (!cent(x0, R.L)) { const deDcha = x0 > 0, xb = deDcha ? R.L / 2 : -R.L / 2; add({ clave: cl2 + 'x', nombre: 'Del borde ' + (deDcha ? 'derecho' : 'izquierdo') + ' al centro de ' + que, foto: P.i, geo: { tipo: 'cota', a: [xb, y], b: [x0, y], d: [0, 0], dentro: true }, instr: 'Del borde hasta el CENTRO (borde del agujero + medio diámetro).', critica: true, ref: { eje: 'x', desde: deDcha ? 1 : -1 } }); }
      } else {
        const rmax = Math.max(...f.map(h => (h.d || h.W || 10) / 2)); add({ clave: cl2 + 'e', nombre: f.length === 2 ? 'Entre los centros de ' + que : 'Del primer al último centro (' + f.length + ' en fila)', foto: P.i, geo: { tipo: 'cota', a: [x0, y], b: [x1, y], d: [0, (y > 0 ? -1 : 1) * (rmax + Math.max(14, 0.06 * R.W))] }, instr: f.length === 2 ? 'De centro a centro (o de borde a borde del mismo lado de cada agujero: es lo mismo).' : 'Del centro del primero al del último; el resto se reparten igual (se ve en la foto).', critica: true });
        if (cent(xm, R.L)) ded.push('Dónde están ' + que + ' a lo largo: repartidos igual a cada lado del centro, basta con la distancia entre centros.');
        if (!cent(xm, R.L)) { const deDcha = xm > 0, xb = deDcha ? R.L / 2 : -R.L / 2, xx = deDcha ? x1 : x0; add({ clave: cl2 + 'x', nombre: 'Del borde ' + (deDcha ? 'derecho' : 'izquierdo') + ' al centro del ' + (deDcha ? 'último' : 'primero'), foto: P.i, geo: { tipo: 'cota', a: [xb, y], b: [xx, y], d: [0, 0], dentro: true }, instr: 'Del borde hasta el CENTRO del más cercano.', critica: true, ref: { eje: 'x', desde: deDcha ? 1 : -1 } }); }
      }
    });
  }
  // ALTO y ESCALONES (de la foto de lado; si no hay, se pide la foto y el alto se mide a mano)
  const S = fotos.find(f => (f.vista === 'lado' || f.vista === 'canto') && f.analisis && f.analisis.R);
  if (S) {
    const B = S.analisis.R, nv = S.analisis.niveles, y0 = -B.W / 2, y1 = B.W / 2, offS = Math.max(18, 0.08 * B.L), pref = S.vista === 'lado' ? 'lado' : 'canto';
    add({ clave: 'alto', nombre: 'Alto total', foto: S.i, geo: { tipo: 'cota', a: [B.L / 2, y0], b: [B.L / 2, y1], d: [offS, 0] }, instr: 'Del apoyo a lo más alto (calibre, o la profundidad del calibre).', critica: true });
    nv.filter(n => n.y > y0 + 0.04 * B.W && n.y < y1 - 0.04 * B.W).forEach((n, i) => {
      const t = n.tramos.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0], xm = (t[0] + t[1]) / 2;
      add({ clave: pref + 'Esc' + i, nombre: 'Alto hasta el escalón ' + (i + 1), foto: S.i, geo: { tipo: 'cota', a: [xm, y0], b: [xm, n.y], d: [0, 0], dentro: true }, instr: 'Desde el apoyo hasta la parte plana de ese escalón.', critica: true, nivel: n.y });
    });
    // la parte ALTA (si no ocupa todo el largo): su largo, y su sitio si no está centrada
    const top = nv.find(n => Math.abs(n.y - y1) < Math.max(2, 0.025 * B.W));
    if (top && nv.some(n => n.y > y0 + 0.04 * B.W && n.y < y1 - 0.04 * B.W)) { const xs = top.tramos.flat(), a = Math.min(...xs), b = Math.max(...xs);
      if (b - a < 0.92 * B.L) { add({ clave: pref + 'Top', nombre: 'Largo de la parte alta', foto: S.i, geo: { tipo: 'cota', a: [a, y1], b: [b, y1], d: [0, -offS] }, instr: 'De lado a lado de la parte más alta.', critica: true, tramo: [a, b] });
        if (!cent((a + b) / 2, B.L)) add({ clave: pref + 'TopX', nombre: 'Del borde izquierdo a la parte alta', foto: S.i, geo: { tipo: 'cota', a: [-B.L / 2, y1], b: [a, y1], d: [0, -offS * 0.6] }, instr: 'Desde la punta izquierda (en esta foto) hasta donde empieza la parte alta.', critica: true }); } }
  } else {
    add({ clave: 'alto', nombre: 'Alto (grosor) de la pieza', foto: P.i, geo: { tipo: 'nota', a: [R.L / 2, R.W / 2], t: 'grosor: mídelo de lado' }, instr: 'El grosor NO se ve en esta foto: mídelo con el calibre (o haz una foto de lado y lo marco).', critica: true });
    pet.push({ tipo: 'foto', vista: 'lado', t: 'Haz una foto DE LADO (que se vea el largo y el alto), a la altura de la pieza, para ver si tiene escalones o salientes. Si es una pieza plana del mismo grosor, basta con medir el grosor.' });
  }
  // ¿la foto de lado y la principal casan? (el largo de las dos)
  return { medidas: M, peticiones: pet, deducidas: ded, principal: P.i, lado: S ? S.i : null };
}

// ---------- 3) LO QUE VALE CADA MEDIDA (la escrita, o la estimada de la foto si no hay otra) ----------
// lo que dice la FOTO de una medida (aunque ya la hayas escrito): para comparar. «escala» dice de dónde sale la escala de esa foto
export function estimadoDe(m, fotos, medidas) {
  const F = fotos.find(f => f.i === m.foto), E = F && F.analisis && F.analisis.R && escalaDe(F, medidas, fotos); if (!E || !m.geo || m.geo.tipo === 'nota') return null;
  const g = m.geo, px = g.tipo === 'circulo' ? 2 * g.r : len(sub(g.b, g.a));
  return { v: px * E.mmPorPx, inc: 2 * E.mmPorPx, escala: E.de, deEstaMedida: new RegExp('\\(' + m.id + '\\)').test(E.de) };
}
export function valorDe(m, fotos, medidas) {
  if (m.estado === 'na') return { v: null, de: 'na' };
  if (m.valor > 0 && (m.estado === 'introducida' || m.estado === 'verificada')) return { v: m.valor, de: m.estado };
  const e = estimadoDe(m, fotos, medidas); if (!e) return { v: null, de: 'falta' };
  return { v: e.v, de: 'estimada', inc: e.inc };
}
// COMPARAR lo escrito con lo que dice la foto (no basta con que «se parezca»): diferencia en mm y en %, y si es demasiada
// (más de un 3 % o más que lo que la foto puede ver). Si la escala de la foto sale de ESA misma medida, no se puede comparar.
export function comparaMedida(m, fotos, medidas, guardia = 0) {
  if (!(m.valor > 0) || (m.estado !== 'introducida' && m.estado !== 'verificada')) return null;
  const e = estimadoDe(m, fotos, medidas); if (!e) return { sin: 'sin escala en la foto' };
  if (e.deEstaMedida) return { sin: 'la escala de la foto sale de esta medida' };
  // si la escala de esa foto sale de OTRA medida (p. ej. la de lado, del largo C1) y esa no cuadra, el fallo no es de esta: se dice
  const src = (/\((C\d+)\)/.exec(e.escala || '') || [])[1], ms = src && medidas.find(x => x.id === src);
  if (ms && guardia < 2) { const cs = comparaMedida(ms, fotos, medidas, guardia + 1); if (cs && cs.mal) return { sin: 'la escala de esta foto sale de ' + src + ', que no cuadra: arregla primero ' + src }; }
  const d = m.valor - e.v, pct = d / m.valor * 100, lim = Math.max(0.03 * m.valor, e.inc * 1.5);
  return { foto: e.v, d, pct, mal: Math.abs(d) > lim, lim };
}
// resumen: cuántas imprescindibles faltan, cuáles van estimadas
export function estadoMedidas(plan, fotos) {
  const L = plan.medidas.map(m => Object.assign({ m }, valorDe(m, fotos, plan.medidas)));
  return { faltan: L.filter(x => x.m.critica && x.de === 'falta'), estimadas: L.filter(x => x.de === 'estimada'), hechas: L.filter(x => x.de === 'introducida' || x.de === 'verificada'), L };
}

// ---------- 4) LA PIEZA ----------
// por tramos: los puntos de control (de la foto → lo medido) mandan; entre ellos, lineal
const tramos = C => { C = C.slice().sort((a, b) => a[0] - b[0]).filter((c, i, L) => !i || c[0] - L[i - 1][0] > 1e-6); return x => { if (x <= C[0][0]) return C[0][1] + (x - C[0][0]) * (C[1][1] - C[0][1]) / (C[1][0] - C[0][0]); for (let i = 1; i < C.length; i++) if (x <= C[i][0]) return C[i - 1][1] + (x - C[i - 1][0]) * (C[i][1] - C[i - 1][1]) / (C[i][0] - C[i - 1][0]); const n = C.length; return C[n - 1][1] + (x - C[n - 1][0]) * (C[n - 1][1] - C[n - 2][1]) / (C[n - 1][0] - C[n - 2][0]); }; };
// fotos = [{ i, vista, analisis }] · plan · → { m (Manifold), avisos, inciertas, dims }
export function construye(fotos, plan) {
  const V = c => { const m = plan.medidas.find(x => x.clave === c); return m ? valorDe(m, fotos, plan.medidas).v : null; };
  const P = fotos.find(f => f.i === plan.principal); if (!P) N.mal('Falta la foto principal.');
  const A = P.analisis, R = A.R, largo = V('largo'), ancho = V('ancho'), alto = V('alto');
  const falta = [['largo', largo], ['ancho', ancho], ['alto', alto]].filter(x => !(x[1] > 0)).map(x => x[0]);
  if (falta.length) N.mal('Faltan medidas imprescindibles: ' + falta.join(', ') + '. Escríbelas (o calibra la foto para estimarlas).');
  const sx = largo / R.L, sy = ancho / R.W, avisos = [], inciertas = [];
  // la silueta de frente, a TUS medidas
  const perfil = A.fuera.map(q => [q[0] * sx, q[1] * sy]);
  let m = N.cs([N.ccw(perfil)], 'Positive').extrude(alto);
  inciertas.push('La FORMA del contorno (curvas, chaflanes, esquinas redondeadas) sale de la foto: ±' + n2(Math.max(sx, sy) * 2) + ' mm. Lo medido (largo, ancho, agujeros) es exacto.');
  // de lado: se cruza (lo que se ve de frente ∩ lo que se ve de lado), con sus escalones a la altura medida
  const S = plan.lado != null ? fotos.find(f => f.i === plan.lado) : null;
  if (S) {
    const B = S.analisis.R, y0 = -B.W / 2, esc = plan.medidas.filter(x => x.nivel != null && x.foto === S.i);
    const cy = [[y0, 0], [B.W / 2, alto]].concat(esc.map(e => [e.nivel, V(e.clave)]).filter(c => c[1] > 0)), fy = tramos(cy);
    const pref = S.vista === 'lado' ? 'lado' : 'canto', top = plan.medidas.find(x => x.clave === pref + 'Top'), topX = plan.medidas.find(x => x.clave === pref + 'TopX');
    const L2 = S.vista === 'lado' ? largo : ancho, cx = [[-B.L / 2, -L2 / 2], [B.L / 2, L2 / 2]];
    if (top && V(top.clave) > 0) { const lt = V(top.clave), x0 = topX && V(topX.clave) > 0 ? -L2 / 2 + V(topX.clave) : (Math.abs((top.tramo[0] + top.tramo[1]) / 2) < Math.max(2, 0.025 * B.L) ? -lt / 2 : top.tramo[0] * L2 / B.L); cx.push([top.tramo[0], x0], [top.tramo[1], x0 + lt]); }
    const fx = tramos(cx), perfil2 = S.analisis.fuera.map(q => [fx(q[0]), fy(q[1])]);
    const ext = (S.vista === 'lado' ? ancho : largo) + 2;
    let lado = N.cs([N.ccw(perfil2)], 'Positive').extrude(ext).translate([0, 0, -ext / 2]);
    lado = S.vista === 'lado' ? lado.rotate([90, 0, 0]) : lado.rotate([90, 0, 90]);
    m = m.intersect(lado);
    if (esc.length) inciertas.push('Dónde empieza cada escalón (a lo largo) sale de la foto de lado, salvo lo que hayas medido.');
  } else inciertas.push('Sin foto de lado: la pieza sale del MISMO grosor en todas partes. Si tiene escalones o salientes, haz la foto de lado.');
  // agujeros y ranuras EXACTOS
  const red = A.agujeros.filter(a => a.tipo === 'redondo'), ran = A.agujeros.filter(a => a.tipo === 'ranura'), huecos = [], marcas = { largo, ancho, agujeros: [] };
  const posDe = (g, cl) => { // centro (mm) de cada miembro del grupo, con lo medido mandando
    const filas = agrupa(g, (a, b) => Math.abs(a.c[1] - b.c[1]) < Math.max(2, 0.03 * R.W)).map(f => f.sort((a, b) => a.c[0] - b.c[0])), out = new Map();
    filas.forEach((f, fi) => { const cl2 = cl + 'f' + fi, mY = plan.medidas.find(x => x.clave === cl2 + 'y'), mX = plan.medidas.find(x => x.clave === cl2 + 'x'), mE = plan.medidas.find(x => x.clave === cl2 + 'e');
      const yP = f.reduce((s, x) => s + x.c[1], 0) / f.length; let y = Math.abs(yP) < Math.max(2, 0.025 * R.W) ? 0 : yP * sy;
      if (mY && V(mY.clave) > 0) y = mY.ref.desde * (ancho / 2 - V(mY.clave));
      const xsP = f.map(x => x.c[0]); let xs;
      if (f.length === 1) { xs = [Math.abs(xsP[0]) < Math.max(2, 0.025 * R.L) ? 0 : xsP[0] * sx]; if (mX && V(mX.clave) > 0) xs = [mX.ref.desde * (largo / 2 - V(mX.clave))]; }
      else { const e = mE && V(mE.clave) > 0 ? V(mE.clave) : (xsP[xsP.length - 1] - xsP[0]) * sx, xmP = (xsP[0] + xsP[xsP.length - 1]) / 2; let xm = Math.abs(xmP) < Math.max(2, 0.025 * R.L) ? 0 : xmP * sx;
        if (mX && V(mX.clave) > 0) { const ext2 = mX.ref.desde * (largo / 2 - V(mX.clave)); xm = ext2 - mX.ref.desde * e / 2; }
        const t = xsP.map(x => (x - xsP[0]) / (xsP[xsP.length - 1] - xsP[0])); xs = t.map(u => xm - e / 2 + u * e); }
      f.forEach((h, j) => out.set(h, [xs[j], y])); });
    return out; };
  agrupa(red, (a, b) => igualD(a.d, b.d)).forEach((g, gi) => { const d = V('agD' + gi) || g[0].d * (sx + sy) / 2, pos = posDe(g, 'ag' + gi); g.forEach(h => { const [x, y] = pos.get(h); marcas.agujeros.push({ x, y, d }); huecos.push(N.MF().cylinder(alto + 4, d / 2, d / 2, Math.max(32, Math.round(d * 6))).translate([x, y, -2])); }); });
  agrupa(ran, (a, b) => igualD(a.L, b.L) && igualD(a.W, b.W)).forEach((g, gi) => { const Lr = V('raL' + gi) || g[0].L * sx, Wr = V('raW' + gi) || g[0].W * sy, pos = posDe(g, 'ra' + gi);
    g.forEach(s => { const [x, y] = pos.get(s), r = Wr / 2, l = Math.max(0, Lr - Wr), pts = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + Math.PI * i / 24; pts.push([l / 2 + r * Math.cos(a), r * Math.sin(a)]); } for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 + Math.PI * i / 24; pts.push([-l / 2 + r * Math.cos(a), r * Math.sin(a)]); }
      huecos.push(N.cs([N.ccw(pts)], 'Positive').extrude(alto + 4).rotate([0, 0, s.ang]).translate([x, y, -2])); }); });
  if (huecos.length) m = m.subtract(N.union(huecos));
  // comprobaciones de fabricación
  if (m.isEmpty()) N.mal('Con esas medidas no queda pieza: revisa los números.');
  const piezas = m.decompose().length; if (piezas > 1) avisos.push('Sale en ' + piezas + ' trozos: algún agujero corta la pieza o una medida está mal.');
  if (alto < 1.2) avisos.push('Muy fina (' + n2(alto) + ' mm): por debajo de 1,2 mm una pieza impresa se parte.');
  // pared entre agujeros y borde
  const lim = N.cs([N.ccw(perfil)], 'Positive').offset(-1, 'Round', 2, 16);
  huecos.forEach((h, i) => { const b = N.caja(h), c = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2], r = (b.dims[0] + b.dims[1]) / 4, circ = N.cs([N.ccw(Array.from({ length: 48 }, (_, k) => [c[0] + r * Math.cos(k * Math.PI / 24), c[1] + r * Math.sin(k * Math.PI / 24)]))], 'Positive'); if (circ.subtract(lim).area() > 0.05) avisos.push('Un agujero queda a menos de 1 mm del borde (pared muy fina): revisa su posición o su diámetro.'); void i; });
  inciertas.push('Lo que no se ve en ninguna foto (huecos por dentro, roscas, agujeros ciegos) NO sale: añádelo en el Estudio.');
  return { m, avisos, inciertas, dims: N.caja(m).dims, vol: m.volume(), marcas };
}

// ---------- 5) PETICIONES por foto (lo que hay que repetir) ----------
export function peticionesFoto(F, medidas, fotos) {
  const out = [], A = F.analisis; if (!A) return out;
  if (A.error) out.push({ tipo: 'foto', t: A.error });
  (A.avisos || []).forEach(t => out.push({ tipo: 'foto', t }));
  const E = escalaDe(F, medidas, fotos);
  if (!E && F.vista !== 'otra') out.push({ tipo: 'calibrar', t: 'Esta foto no tiene escala: escribe el largo (C1) o calibra con dos puntos de algo que conozcas (una regla junto a la pieza). Así las demás medidas salen ESTIMADAS para comprobarlas.' });
  if (E && E.C && E.C.errMax > 2) out.push({ tipo: 'foto', t: 'Las referencias no cuadran (' + n2(E.C.errMax) + ' %): la foto está torcida. Enderézala (4 esquinas) o repítela de frente.' });
  if (E && E.mmPorPx > 0.25) out.push({ tipo: 'foto', t: 'Poca resolución: 1 px = ' + n2(E.mmPorPx) + ' mm. Acércate más para medir mejor.' });
  return out;
}

// ---------- 6) LA FOTO MARCADA (canvas: la foto + cotas con flechas, círculos y etiquetas) ----------
// devuelve las zonas que se pueden tocar: [{ id, x, y, r }] (en píxeles de la foto)
export function dibujaMarcas(g, F, medidas, o = {}) {
  const A = F.analisis, R = A && A.R; if (!R) return [];
  const k = o.k || 1, esc = F.espejo ? -1 : 1, P = (x, y) => deMarco(R, esc * x, y), zonas = [], W = Math.max(2, 2.2 * k), fuente = Math.round(15 * k);
  const flecha = (a, b, col) => { const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = 9 * k; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] - s * Math.cos(ang - 0.4), b[1] - s * Math.sin(ang - 0.4)); g.lineTo(b[0] - s * Math.cos(ang + 0.4), b[1] - s * Math.sin(ang + 0.4)); g.closePath(); g.fillStyle = col; g.fill(); };
  const ocupadas = [], sitio = (p, dir) => { const r = 13 * k, libre = q => ocupadas.every(o => Math.hypot(o[0] - q[0], o[1] - q[1]) > 2.3 * r); const d = dir && Math.hypot(dir[0], dir[1]) > 1e-6 ? [dir[0] / Math.hypot(dir[0], dir[1]), dir[1] / Math.hypot(dir[0], dir[1])] : [0, -1];
    for (let i = 0; i < 14; i++) { const s = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 2.4 * r, q = [p[0] + d[0] * s, p[1] + d[1] * s]; if (libre(q)) { ocupadas.push(q); return q; } } ocupadas.push(p); return p; };
  const U = o.unidad || 'mm', valorTxt = m => { const v = o.valores && o.valores[m.id]; if (!v || v.v == null) return ''; const met = m.grupo && m.grupo.tipo === 'redondo' ? metricaDe(v.v) : null; return (v.de === 'estimada' ? '≈ ' : '') + fmt(v.v, U) + (met ? ' · ' + met.M + (met.tipo === 'paso' ? ' paso' : met.tipo === 'roscar' ? ' roscar' : '') : ''); };
  const etiqueta = (m, p0, col, sel, dir) => { const t = m.id, r = 13 * k, p = sitio(p0, dir); g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fillStyle = sel ? '#ffd23f' : col; g.fill(); g.lineWidth = 2 * k; g.strokeStyle = '#ffffff'; g.stroke(); g.fillStyle = sel ? '#1b1b1d' : '#ffffff'; g.font = '800 ' + fuente + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, p[0], p[1] + 0.5 * k); zonas.push({ id: m.id, x: p[0], y: p[1], r });
    const vt = valorTxt(m); if (vt) { g.font = '700 ' + Math.round(13 * k) + 'px system-ui, sans-serif'; const w = g.measureText(vt).width + 10 * k; g.fillStyle = 'rgba(12,14,24,.82)'; g.beginPath(); g.roundRect ? g.roundRect(p[0] + r + 3 * k, p[1] - 10 * k, w, 20 * k, 6 * k) : g.rect(p[0] + r + 3 * k, p[1] - 10 * k, w, 20 * k); g.fill(); g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.fillText(vt, p[0] + r + 8 * k, p[1] + 0.5 * k); g.textAlign = 'center'; } };
  medidas.filter(m => m.foto === F.i && m.geo && m.estado !== 'na').forEach(m => {
    const sel = o.sel === m.id, hecho = m.estado === 'introducida' || m.estado === 'verificada', col = sel ? '#ffd23f' : hecho ? '#1fbf6a' : m.critica ? '#ff3b6b' : '#ff9f1a', G = m.geo;
    g.save(); g.lineWidth = sel ? W * 1.6 : W; g.strokeStyle = col; g.setLineDash([]);
    if (G.tipo === 'cota') {
      const a = P(G.a[0], G.a[1]), b = P(G.b[0], G.b[1]), d = G.d || [0, 0], dv = [R.ex[0] * esc * d[0] + R.ey[0] * d[1], R.ex[1] * esc * d[0] + R.ey[1] * d[1]], a2 = [a[0] + dv[0], a[1] + dv[1]], b2 = [b[0] + dv[0], b[1] + dv[1]];
      if (!G.dentro && len(dv) > 0) { g.setLineDash([4 * k, 3 * k]); g.lineWidth = Math.max(1, W * 0.6); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a2[0] + dv[0] * 0.15, a2[1] + dv[1] * 0.15); g.moveTo(b[0], b[1]); g.lineTo(b2[0] + dv[0] * 0.15, b2[1] + dv[1] * 0.15); g.stroke(); g.setLineDash([]); g.lineWidth = sel ? W * 1.6 : W; }
      g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.stroke(); flecha(b2, a2, col); flecha(a2, b2, col);
      etiqueta(m, [(a2[0] + b2[0]) / 2 + (G.dentro ? 0 : dv[0] * 0.35), (a2[1] + b2[1]) / 2 + (G.dentro ? -16 * k : dv[1] * 0.35)], col, sel, [b2[0] - a2[0], b2[1] - a2[1]]);
    } else if (G.tipo === 'circulo') {
      const c = P(G.c[0], G.c[1]); g.beginPath(); g.arc(c[0], c[1], G.r + 5 * k, 0, 7); g.stroke();
      // el diámetro, con flechas, de lado a lado
      const a = [c[0] - G.r, c[1]], b = [c[0] + G.r, c[1]]; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); flecha(a, b, col); flecha(b, a, col);
      (G.otros || []).forEach(x => { const q = P(x.c[0], x.c[1]); g.setLineDash([5 * k, 4 * k]); g.beginPath(); g.arc(q[0], q[1], x.r + 5 * k, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.font = '700 ' + Math.round(12 * k) + 'px system-ui'; g.textAlign = 'center'; g.fillText('=' + m.id, q[0], q[1] - x.r - 10 * k); });
      etiqueta(m, [c[0] + G.r + 20 * k, c[1] - G.r - 6 * k], col, sel);
    } else if (G.tipo === 'nota') { const p = P(G.a[0], G.a[1]); etiqueta(m, [p[0] + 18 * k, p[1] + 18 * k], col, sel); g.fillStyle = col; g.font = '700 ' + Math.round(13 * k) + 'px system-ui'; g.textAlign = 'left'; g.fillText(G.t, p[0] + 36 * k, p[1] + 22 * k); }
    g.restore();
  });
  return zonas;
}
// la silueta del MODELO sobre la foto principal (para comparar): de mm a píxeles de la foto
export function siluetaEnFoto(F, plan, fotos) {
  const R = F.analisis.R, V = c => { const m = plan.medidas.find(x => x.clave === c); return m ? valorDe(m, fotos, plan.medidas).v : null; };
  const largo = V('largo'), ancho = V('ancho'); if (!(largo > 0 && ancho > 0)) return null;
  const sx = R.L / largo, sy = R.W / ancho; return { aFoto: (x, y) => deMarco(R, x * sx, y * sy) };
}
