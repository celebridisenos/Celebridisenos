// ================= 👗 CelebriDREW · los PUNTOS y las MEDIDAS de la prenda en la foto (en píxeles) =================
// Para una prenda EXTENDIDA y de FRENTE (lo más común en fotos de producto). Trabaja sobre la máscara (1 = prenda), fila a fila:
// · ARRIBA (camiseta, sudadera, camisa…): el bajo, la AXILA (donde la manga se junta con el cuerpo: el tramo del centro de la fila se
//   ensancha de golpe), el pecho justo debajo, el cuello por arriba (los dos puntos más altos junto al centro = cuello en el hombro), la
//   PUNTA DEL HOMBRO (donde la línea de arriba cambia de pendiente al pasar a la manga), y en cada manga su boca (el lado del final más
//   atravesado al eje de la manga), su largo y su ancho en la axila.
// · PANTALÓN: la entrepierna (el hueco entre las piernas, por el centro), cintura, cadera (lo más ancho por encima), tiro, largo, rodilla y bajo.
// · FALDA: cintura, cadera, altura de cadera, largo y bajo.
// Cada medida es un VECTOR en píxeles ([dx, dy], para poder usar escalas distintas en horizontal y en vertical) con su CONFIANZA y cómo
// se ha medido. Los contornos de una prenda plana miden la MITAD (delante): se multiplican por 2 al pasarlos a contornos (plano: true).
// Lo que no se puede ver no se inventa: se queda sin medir y lo pondrá la plantilla, marcado como «inferido».
import * as G from '../geom.js';
import { caja, tramosFila, simetria, contorno } from './imagen.js';

const mediana = a => { const v = a.filter(x => isFinite(x)).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : NaN; };
const H = (px, conf, como, o = {}) => Object.assign({ vec: [px, 0], conf, como }, o), V = (px, conf, como, o = {}) => Object.assign({ vec: [0, px], conf, como }, o), D = (a, b, conf, como, o = {}) => Object.assign({ vec: [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])], conf, como }, o);
export function filas(M, xs) {
  const B = caja(M), F = [];
  for (let y = B.y0; y <= B.y1; y++) { const R = tramosFila(M, y); let c = R.find(([a, b]) => a <= xs && b >= xs); if (!c && R.length) c = R.reduce((m, r) => (Math.min(Math.abs(r[0] - xs), Math.abs(r[1] - xs)) < Math.min(Math.abs(m[0] - xs), Math.abs(m[1] - xs)) ? r : m));
    F[y] = { R, c, cw: c ? c[1] - c[0] + 1 : 0, e: R.length ? [R[0][0], R[R.length - 1][1]] : null }; }
  return { B, F };
}
// la línea de arriba: el primer píxel de prenda de cada columna
function arriba(M, B) { const T = []; for (let x = B.x0; x <= B.x1; x++) { let y = B.y0; while (y <= B.y1 && !M.m[y * M.w + x]) y++; T[x] = y <= B.y1 ? y : NaN; } return T; }
// ¿el punto toca una zona TAPADA de la foto (el folio)? (M.tapas: [[x0, y0, x1, y1]] en píxeles de la máscara)
export const tocaTapa = (M, p, m = 4) => (M.tapas || []).some(r => p[0] >= r[0] - m && p[0] <= r[2] + m && p[1] >= r[1] - m && p[1] <= r[3] + m);
// recta x = a + m·y por mínimos cuadrados de puntos [y, x]
const rectaYX = P => { const n = P.length, my = P.reduce((s, p) => s + p[0], 0) / n, mx = P.reduce((s, p) => s + p[1], 0) / n; let a = 0, b = 0; P.forEach(([y, x]) => { a += (y - my) * (x - mx); b += (y - my) ** 2; }); const m = b ? a / b : 0; return [mx - m * my, m]; };
// (16-10) las ESQUINAS DEL BAJO: en una fila un poco por encima del bajo (si el bajo sale algo torcido, la última fila solo tiene un trozo) y,
// en esa columna, hasta donde llega la prenda. El punto de la derecha va al borde DERECHO de su píxel (así su distancia al de la izquierda es el ancho)
function esquinasBajo(M, F, B, alto) {
  const yh = Math.max(B.y0, B.y1 - Math.max(2, Math.round(0.015 * alto))), f = F[yh]; if (!f || !f.c) return null;
  const fondo = x => { let y = yh; while (y + 1 <= B.y1 && M.m[(y + 1) * M.w + x]) y++; return y; }, xi = f.c[0], xd = f.c[1];
  return [{ x: xi, y: fondo(Math.min(xd, xi + 2)), conf: 0.8 }, { x: xd + 1, y: fondo(Math.max(xi, xd - 2)), conf: 0.8 }];
}
// el vértice de más giro de una polilínea (para la punta del hombro)
function codo(P, desde = 1, hasta) { hasta = hasta == null ? P.length - 1 : hasta; let mejor = null; for (let i = Math.max(1, desde); i < Math.min(P.length - 1, hasta); i++) { const a = G.norma(G.sub(P[i], P[i - 1])), b = G.norma(G.sub(P[i + 1], P[i])), ang = Math.acos(Math.max(-1, Math.min(1, G.punto(a, b)))) * 180 / Math.PI; if (!mejor || ang > mejor.ang) mejor = { i, ang, p: P[i] }; } return mejor; }

export function rasgosArriba(M) {
  const S = simetria(M), xs = S.x, { B, F } = filas(M, Math.round(xs)), alto = B.h, avisos = [], P = {}, med = {}, extra = {};
  const banda = (f0, f1) => { const out = []; for (let y = Math.round(B.y1 - f1 * alto); y <= Math.round(B.y1 - f0 * alto); y++) if (F[y]) out.push(F[y].cw); return out; };
  const base = mediana(banda(0.04, 0.25)), hem = mediana(banda(0.005, 0.03));
  // la AXILA: subiendo desde abajo, la primera fila cuyo tramo central se ensancha de golpe (manga pegada)
  let yAx = null; for (let y = Math.round(B.y1 - 0.05 * alto); y > B.y0 + 0.08 * alto; y--) { const f = F[y]; if (f && f.cw > base * 1.25 && f.e && f.cw >= 0.93 * (f.e[1] - f.e[0] + 1)) { yAx = y; break; } }
  let mangas = 'si'; if (yAx == null) { // sin salto: o no tiene mangas, o están pegadas al cuerpo
    let y2 = null; for (let y = Math.round(B.y1 - 0.4 * alto); y > B.y0; y--) { const f = F[y]; if (f && f.cw < base * 0.9) { y2 = y; break; } }
    if (y2 != null) { yAx = y2; mangas = 'sin'; avisos.push('No veo mangas separadas del cuerpo: parece SIN MANGAS (si las tiene pegadas al cuerpo, sepáralas en la foto o marca la axila a mano).');
      // (16-10) sin mangas, la axila es donde la sisa empieza a entrar: lo más alto de la parte más ancha del cuerpo (entre el 12 y el 60 % del alto);
      // antes se tomaba donde el ancho bajaba del 90 % del bajo, que en un vestido (bajo = cintura estrecha) caía en los hombros
      let mx = 0; const y0 = Math.round(B.y0 + 0.12 * alto), y1 = Math.round(B.y0 + 0.6 * alto); for (let y = y0; y <= y1; y++) if (F[y] && F[y].cw > mx) mx = F[y].cw;
      for (let y = y0; y <= y1; y++) if (F[y] && F[y].cw >= mx - Math.max(1, 0.003 * mx)) { yAx = y; break; } }
    else { yAx = Math.round(B.y0 + 0.33 * alto); mangas = 'pegadas'; avisos.push('No encuentro la axila: las mangas parecen pegadas al cuerpo. He puesto la axila a un tercio: muévela a mano.'); } }
  const yAx0 = yAx; if (mangas === 'si') { // (16-10) el recorte CIERRA la punta estrecha entre el costado y la manga (la axila salía 0,5–1,5 cm baja): se prolongan los dos bordes hasta que se cruzan
    const cruce = s => { const A = [], Bm = []; for (let y = yAx + 2; y <= Math.min(B.y1, yAx + Math.round(0.1 * alto)); y++) { const f = F[y]; if (!f || !f.c) continue; const otro = f.R[f.R.indexOf(f.c) + s]; if (!otro) continue;
        const xb = s > 0 ? f.c[1] + 1 : f.c[0], xm = s > 0 ? otro[0] : otro[1] + 1; if (Math.abs(xm - xb) < 3) continue; A.push([y, xb]); Bm.push([y, xm]); }
      if (A.length < 5) return null; const [a1, m1] = rectaYX(A), [a2, m2] = rectaYX(Bm); if (Math.abs(m1 - m2) < 0.1) return null; const y = (a2 - a1) / (m1 - m2); return y < yAx + 1 && y > yAx - 0.06 * alto ? y : null; };
    const cs = [cruce(-1), cruce(1)].filter(v => v != null); if (cs.length) yAx = Math.round(cs.reduce((a, b) => a + b, 0) / cs.length); }
  const yP = Math.min(B.y1, Math.max(yAx0 + 2, yAx + Math.max(3, Math.round(0.02 * alto)))), fP = F[yP] || F[yAx]; /* (el pecho, donde el cuerpo ya está separado de las mangas) */
  P.axilaIzq = { x: fP.c[0], y: yAx, conf: mangas === 'si' ? 0.8 : mangas === 'sin' ? 0.65 : 0.4 }; P.axilaDer = { x: fP.c[1] + 1, y: yAx, conf: P.axilaIzq.conf }; /* (+1: el borde derecho del píxel) */
  const pecho = fP.cw;
  // el CUELLO: los dos puntos más altos a los lados del centro
  const T = arriba(M, B), lado = (s) => { let mejor = null; const x0 = Math.round(xs + s * 0.03 * pecho), x1 = Math.round(xs + s * 0.48 * pecho);
    for (let x = x0; s < 0 ? x >= x1 : x <= x1; x += s) { if (!isFinite(T[x])) continue; if (!mejor || T[x] < mejor.y - 0.5) mejor = { x, y: T[x] }; } return mejor; };
  const hl = lado(-1), hr = lado(1);
  if (!hl || !hr) { avisos.push('No encuentro el cuello.'); return { tipo: 'arriba', puntos: P, medidas: med, extra, avisos, B, xs, sim: S.iou }; }
  P.cuelloIzq = { x: hl.x, y: hl.y, conf: 0.75 }; P.cuelloDer = { x: hr.x, y: hr.y, conf: 0.75 };
  const yH = (hl.y + hr.y) / 2, yC = T[Math.round(xs)];
  P.escote = { x: xs, y: yC, conf: 0.7 };
  // ¿pico o redondo? lo que se aparta la curva del cuello de su cuerda
  const dev = (h) => { let m = 0; const a = [h.x, h.y], b = [xs, yC], L = G.dist(a, b) || 1; for (let x = Math.min(h.x, xs); x <= Math.max(h.x, xs); x++) if (isFinite(T[x])) m = Math.max(m, G.distAPolilinea([x, T[x]], [a, b]).d); return m / L; };
  const desv = (dev(hl) + dev(hr)) / 2; extra.escote = yC - yH < 0.01 * alto ? 'alto' : desv < 0.07 ? 'pico' : 'redondo';
  // la PUNTA DEL HOMBRO: el codo de la línea de arriba entre el cuello y el final de la manga
  const sp = (h, s) => { const L = []; for (let x = h.x; s < 0 ? x >= B.x0 : x <= B.x1; x += s) if (isFinite(T[x])) L.push([x, T[x]]); if (L.length < 6) return null;
    const R = G.simplifica(L, Math.max(1.5, 0.008 * alto)), c = codo(R, 1, Math.max(2, R.length - 1)); return c ? { x: c.p[0], y: c.p[1], ang: c.ang } : null; };
  const sl = sp(hl, -1), sr = sp(hr, 1);
  if (sl && sr) { const cf = Math.min(mangas === 'si' ? 0.9 : mangas === 'sin' ? 0.65 : 0.5, Math.min(sl.ang, sr.ang) / 25); /* (sin mangas, el codo cae donde el hombro pasa a la sisa: algo menos fiable) */ P.hombroIzq = { x: sl.x, y: sl.y, conf: cf }; P.hombroDer = { x: sr.x, y: sr.y, conf: cf }; if (cf < 0.35) avisos.push('La punta del hombro no se ve clara (la costura del hombro no marca codo): revísala.'); }
  // las MANGAS: la boca es el lado del contorno, en la punta de la manga, más atravesado a su eje
  const C = contorno(M), Cs = G.simplifica(C.concat([C[0]]), Math.max(1.5, 0.006 * Math.max(B.w, alto)));
  const manga = (s) => { const ax = s < 0 ? P.axilaIzq : P.axilaDer, hm = s < 0 ? P.hombroIzq : P.hombroDer; if (!hm || mangas !== 'si') return null;
    const punta = s < 0 ? B.x0 : B.x1, lim = ax.x + s * 0.25 * Math.abs(ax.x - punta), mid = [(hm.x + ax.x) / 2, (hm.y + ax.y) / 2];
    const zona = []; for (let i = 0; i < Cs.length - 1; i++) { const a = Cs[i], b = Cs[i + 1]; if ((s < 0 ? Math.min(a[0], b[0]) < lim : Math.max(a[0], b[0]) > lim)) zona.push([a, b, i]); } // (los lados que llegan a la punta de la manga)
    if (!zona.length) return null; const ext = zona.flat().reduce((m, p) => (s < 0 ? p[0] < m[0] : p[0] > m[0]) ? p : m), eje = G.norma(G.sub(ext, mid)), perp = [-eje[1], eje[0]];
    if (ext[0] <= 1 || ext[0] >= M.w - 2 || ext[1] <= 1 || ext[1] >= M.h - 2 || tocaTapa(M, ext)) return { cortada: true }; /* (16-10: la manga se sale de la foto o queda debajo del folio: no se mide con ella) */
    let mejor = null; zona.forEach(([a, b, i]) => { const d = G.sub(b, a), L = Math.hypot(d[0], d[1]), cr = Math.abs(G.punto(G.norma(d), perp)), lejos = G.punto(G.sub(G.lerp(a, b, 0.5), mid), eje); const v = L * cr * cr * (lejos > 0 ? 1 : 0); if (!mejor || v > mejor.v) mejor = { a, b, v, L, i }; });
    // (16-10) las esquinas de la boca, donde se CRUZAN las rectas de los lados de la manga con la de la boca: el recorte redondea las esquinas
    // y la boca salía 0,5–1 cm corta. Si los lados no están claros, se queda como estaba.
    if (mejor) { const n = Cs.length - 1, lg = i => G.dist(Cs[i], Cs[i + 1]), seg = i => [Cs[i], Cs[i + 1]];
      let ia = (mejor.i - 1 + n) % n, ib = (mejor.i + 1) % n, k = 0; while (lg(ia) < 0.3 * mejor.L && k++ < 6) ia = (ia - 1 + n) % n; k = 0; while (lg(ib) < 0.3 * mejor.L && k++ < 6) ib = (ib + 1) % n;
      const pa = G.cortaRectas(...seg(ia), mejor.a, mejor.b), pb = G.cortaRectas(...seg(ib), mejor.a, mejor.b);
      if (pa && pb && G.dist(pa, mejor.a) < 0.25 * mejor.L && G.dist(pb, mejor.b) < 0.25 * mejor.L) { mejor.a = pa; mejor.b = pb; mejor.L = G.dist(pa, pb); } }
    if (!mejor) return null; const top = mejor.a[1] < mejor.b[1] ? mejor.a : mejor.b, bot = top === mejor.a ? mejor.b : mejor.a, hP = [hm.x, hm.y];
    const lt = G.distAPolilinea([ax.x, ax.y], [hP, top]).d; return { top, bot, boca: mejor.L, largo: G.dist(hP, top), biceps: lt, hP };
  };
  const ml0 = manga(-1), mr0 = manga(1), ml = ml0 && !ml0.cortada ? ml0 : null, mr = mr0 && !mr0.cortada ? mr0 : null;
  if ((ml0 && ml0.cortada) || (mr0 && mr0.cortada)) avisos.push(ml || mr ? 'Una manga se sale de la foto o queda debajo del folio: se mide con la otra.' : 'Las mangas se salen de la foto o quedan debajo del folio: no se pueden medir (sale la manga típica, por confirmar).');
  // las medidas (en píxeles)
  med.pecho = H(pecho, mangas === 'si' ? 0.8 : mangas === 'sin' ? 0.65 : 0.45, 'ancho de axila a axila (plana: × 2)', { plano: true }); /* (16-10: sin mangas, con la axila donde entra la sisa, es fiable) */
  med.largo = V(B.y1 - yH, 0.8, 'del cuello en el hombro al bajo');
  med.bajo = H(hem, 0.8, 'ancho del bajo (plana: × 2)', { plano: true });
  med.cuello = H(hr.x - hl.x, 0.7, 'de cuello a cuello por arriba');
  med.bajadaDel = V(Math.max(0, yC - yH), 0.6, 'del cuello en el hombro al centro del escote');
  med.sisa = V(yAx - yH, mangas === 'si' ? 0.65 : mangas === 'sin' ? 0.6 : 0.4, 'del cuello en el hombro a la axila, en vertical');
  if (P.hombroIzq) { med.hombros = H(P.hombroDer.x - P.hombroIzq.x, P.hombroIzq.conf, 'de punta a punta del hombro'); med.caida = V(((P.hombroIzq.y + P.hombroDer.y) / 2) - yH, P.hombroIzq.conf * 0.8, 'lo que baja el hombro desde el cuello'); }
  const mm = [ml, mr].filter(Boolean);
  if (mm.length) { const prom = k => mm.reduce((s, x) => s + x[k], 0) / mm.length, m0 = mm[0];
    med.manga = Object.assign(D(m0.hP, m0.top, 0.6, 'de la punta del hombro al final de la manga (por arriba)'), { vec: G.esc(G.norma(G.sub(m0.top, m0.hP)).map(Math.abs), prom('largo')) });
    med.boca = Object.assign(D(m0.top, m0.bot, mm.length > 1 ? 0.6 : 0.5, 'boca de la manga (plana: × 2)' + (mm.length > 1 ? '' : ' · con UNA manga sola (la otra no se ve): confírmala'), { plano: true }), { vec: G.esc(G.norma(G.sub(m0.bot, m0.top)).map(Math.abs), prom('boca')) }); /* (16-10: es un borde corto; con las dos mangas se promedia, con una sola el error de sus esquinas pesa el doble) */
    med.biceps = H(prom('biceps'), 0.5, 'ancho de la manga en la axila (plana: × 2)', { plano: true });
    P.mangaIzq = ml ? { x: ml.top[0], y: ml.top[1], conf: 0.6 } : undefined; P.mangaDer = mr ? { x: mr.top[0], y: mr.top[1], conf: 0.6 } : undefined;
    P.bocaIzq = ml ? { x: ml.bot[0], y: ml.bot[1], conf: 0.6 } : undefined; P.bocaDer = mr ? { x: mr.bot[0], y: mr.bot[1], conf: 0.6 } : undefined; /* (16-10: la otra punta de la boca, para arrastrarla en la pantalla) */
    extra.manga = prom('largo') > 0.55 * (B.y1 - yH) ? 'larga' : 'corta'; if (mm.length === 1) avisos.push('Solo se ve bien una manga: se usa esa.');
  } else extra.manga = mangas === 'sin' ? 'sin' : 'desconocida';
  { const Q = esquinasBajo(M, F, B, alto); if (Q) { P.bajoIzq = Q[0]; P.bajoDer = Q[1]; } else { P.bajoIzq = { x: B.x0, y: B.y1, conf: 0.5 }; P.bajoDer = { x: B.x1 + 1, y: B.y1, conf: 0.5 }; } }
  if (S.iou < 0.82) avisos.push('La prenda no sale simétrica (' + Math.round(S.iou * 100) + ' %): puede estar torcida, doblada o en perspectiva. Las medidas pierden fiabilidad.');
  return { tipo: 'arriba', puntos: P, medidas: med, extra, avisos, B, xs, sim: S.iou };
}

export function rasgosPantalon(M) {
  const S = simetria(M), xs = Math.round(S.x), { B, F } = filas(M, xs), alto = B.h, avisos = [], P = {}, med = {};
  let yC = null; for (let y = B.y1; y >= B.y0; y--) if (M.m[y * M.w + xs]) { yC = y; break; }
  if (yC == null || B.y1 - yC < 0.15 * alto) return null;
  // la punta de la entrepierna: el recorte «cierra» la punta estrecha del hueco; se prolongan los bordes de dentro de las dos perneras
  // (recta por mínimos cuadrados en la parte de arriba del hueco) hasta que se cruzan
  { const XL = [], XR = []; for (let y = Math.round(yC + 0.02 * alto); y <= Math.round(yC + 0.3 * alto) && y <= B.y1; y++) { const f = F[y]; if (!f) continue; const L = f.R.filter(r => r[1] < xs), R = f.R.filter(r => r[0] > xs); if (L.length && R.length && R[0][0] - L[L.length - 1][1] >= 6) { XL.push([y, L[L.length - 1][1]]); XR.push([y, R[0][0]]); } } /* (solo donde el hueco ya mide 6 px: más arriba, el recorte lo estrecha) */
    const recta = P => { const n = P.length, my = P.reduce((s, p) => s + p[0], 0) / n, mx = P.reduce((s, p) => s + p[1], 0) / n; let a = 0, b = 0; P.forEach(([y, x]) => { a += (y - my) * (x - mx); b += (y - my) ** 2; }); const m = b ? a / b : 0; return [mx - m * my, m]; };
    var tiroFiable = false; if (XL.length > 5) { const [a1, m1] = recta(XL), [a2, m2] = recta(XR); if (Math.abs(m1 - m2) > 0.14) { const y = (a2 - a1) / (m1 - m2); if (y < yC && y > yC - 0.08 * alto) { yC = Math.round(y); tiroFiable = true; } } } }
  const wc = mediana([0, 1, 2, 3].map(k => F[B.y0 + k] && F[B.y0 + k].cw)), yTope = Math.round(yC - 0.02 * alto);
  let cad = { w: 0, y: B.y0 }; for (let y = B.y0; y <= yTope; y++) if (F[y] && F[y].cw > cad.w) cad = { w: F[y].cw, y };
  const piernas = y => { const f = F[y]; if (!f) return null; const L = f.R.filter(r => r[1] < xs), R = f.R.filter(r => r[0] > xs); if (!L.length || !R.length) return null; const a = L[L.length - 1], b = R[0]; return [a[1] - a[0] + 1, b[1] - b[0] + 1]; };
  const yB = Math.round(B.y1 - 0.01 * alto), pb = piernas(yB), yK = Math.round(yC + 0.44 * (B.y1 - yC)), pk = piernas(yK);
  P.cinturaIzq = { x: F[B.y0].c[0], y: B.y0, conf: 0.8 }; P.cinturaDer = { x: F[B.y0].c[1] + 1, y: B.y0, conf: 0.8 }; P.entrepierna = { x: xs, y: yC, conf: 0.8 }; P.cadera = { x: F[cad.y].c[0], y: cad.y, conf: 0.6 };
  med.cintura = H(wc, 0.8, 'ancho de la cintura (plana: × 2)', { plano: true }); med.cadera = H(cad.w, 0.6, 'lo más ancho por encima del tiro (plana: × 2)', { plano: true });
  med.tiro = V(yC - B.y0, tiroFiable ? 0.7 : 0.45, 'de la cintura a la entrepierna' + (tiroFiable ? '' : ' · el hueco entre las piernas es muy cerrado en la foto: la entrepierna puede estar 1–3 cm más arriba: MÍDELO')); med.altoCadera = V(cad.y - B.y0, 0.45, 'de la cintura a lo más ancho'); med.largo = V(B.y1 - B.y0, 0.85, 'de la cintura al bajo (por el costado)');
  if (pb) med.bajo = H((pb[0] + pb[1]) / 2, 0.75, 'ancho del bajo de cada pierna (plana: × 2)', { plano: true }); if (pk) med.rodilla = H((pk[0] + pk[1]) / 2, 0.6, 'ancho a la altura de la rodilla (plana: × 2)', { plano: true });
  // (16-10) los puntos que faltaban para poder ARRASTRARLOS en la pantalla: el otro lado de la cadera y los bordes de cada pernera en la rodilla y el bajo
  P.caderaDer = { x: F[cad.y].c[1] + 1, y: cad.y, conf: 0.6 };
  const hasta = x => { let y = yB; while (y + 1 <= B.y1 && M.m[(y + 1) * M.w + x]) y++; return y; }; // (en el bajo, hasta donde llega cada pernera en esa columna)
  const bordes = (y, n, conf, alBajo) => { const f = F[y]; if (!f) return; const L = f.R.filter(r => r[1] < xs), R = f.R.filter(r => r[0] > xs); if (!L.length || !R.length) return; const a = L[L.length - 1], b = R[0], Y = x => (alBajo ? hasta(x) : y);
    P[n + 'IzqF'] = { x: a[0], y: Y(Math.min(a[1], a[0] + 2)), conf }; P[n + 'IzqD'] = { x: a[1] + 1, y: Y(Math.max(a[0], a[1] - 2)), conf }; P[n + 'DerD'] = { x: b[0], y: Y(Math.min(b[1], b[0] + 2)), conf }; P[n + 'DerF'] = { x: b[1] + 1, y: Y(Math.max(b[0], b[1] - 2)), conf }; };
  bordes(yB, 'bajo', 0.75, true); bordes(yK, 'rodilla', 0.6, false);
  if (S.iou < 0.8) avisos.push('El pantalón no sale simétrico (' + Math.round(S.iou * 100) + ' %): puede estar torcido o con una pierna doblada.');
  return { tipo: 'pantalon', puntos: P, medidas: med, extra: {}, avisos, B, xs, sim: S.iou };
}

export function rasgosFalda(M) {
  const S = simetria(M), xs = Math.round(S.x), { B, F } = filas(M, xs), alto = B.h, avisos = [], P = {}, med = {};
  const wc = mediana([0, 1, 2, 3].map(k => F[B.y0 + k] && F[B.y0 + k].cw)); let cad = { w: 0, y: B.y0 }; for (let y = B.y0; y <= B.y0 + 0.35 * alto; y++) if (F[y] && F[y].cw > cad.w) cad = { w: F[y].cw, y };
  const hem = mediana([1, 2, 3, 4].map(k => F[B.y1 - k] && F[B.y1 - k].cw));
  P.cinturaIzq = { x: F[B.y0].c[0], y: B.y0, conf: 0.8 }; P.cinturaDer = { x: F[B.y0].c[1] + 1, y: B.y0, conf: 0.8 }; P.cadera = { x: F[cad.y].c[0], y: cad.y, conf: 0.5 };
  med.cintura = H(wc, 0.8, 'ancho de la cintura (plana: × 2)', { plano: true }); med.cadera = H(cad.w, 0.5, 'lo más ancho del primer tercio (plana: × 2)', { plano: true }); med.altoCadera = V(cad.y - B.y0, 0.4, 'de la cintura a lo más ancho');
  med.largo = V(B.y1 - B.y0, 0.85, 'de la cintura al bajo'); med.bajoPlano = H(hem, 0.8, 'ancho del bajo (plana)', { plano: false });
  { P.caderaDer = { x: F[cad.y].c[1] + 1, y: cad.y, conf: 0.5 }; const Q = esquinasBajo(M, F, B, alto); if (Q) { P.bajoIzq = Q[0]; P.bajoDer = Q[1]; } } /* (16-10: para arrastrarlos) */
  if (S.iou < 0.8) avisos.push('La falda no sale simétrica (' + Math.round(S.iou * 100) + ' %).');
  return { tipo: 'falda', puntos: P, medidas: med, extra: {}, avisos, B, xs, sim: S.iou };
}
// VESTIDO (16-10; ella: «ojo con los vestidos»): el CUERPO se mide como una prenda de arriba cortada en la CINTURA (lo más estrecho entre el
// 20 y el 62 % del alto) y la FALDA como una falda que empieza ahí: cadera (lo más ancho de su primer 36 %), largo y bajo. El talle de la
// espalda no se ve de frente: sale del alto del cuerpo (del cuello en el hombro a la cintura) y se marca para confirmar.
export function rasgosVestido(M) {
  const S = simetria(M), xs = Math.round(S.x), { B, F } = filas(M, xs), alto = B.h, avisos = [];
  let cin = null; for (let y = Math.round(B.y0 + 0.2 * alto); y <= Math.round(B.y0 + 0.62 * alto); y++) { const f = F[y]; if (f && f.c && (!cin || f.cw < cin.w)) cin = { y, w: f.cw, c: f.c }; }
  if (!cin) return null;
  { // (la cintura de un vestido es una curva suave: muchas filas miden casi lo mismo; se toma la ÚLTIMA de esa zona, no la primera)
    // (y la costura de la cintura suele estar ABAJO de esa zona: el cuerpo se estrecha poco a poco y la falda se abre enseguida)
    const tol = Math.max(0.5, 0.002 * cin.w), dentro = y => F[y] && F[y].c && F[y].cw <= cin.w + tol; let b = cin.y; while (dentro(b + 1)) b++;
    if (F[b] && F[b].c) cin = { y: b, w: F[b].cw, c: F[b].c }; }
  const cuerpo = { w: M.w, h: M.h, m: new Uint8Array(M.m), tapas: M.tapas }; cuerpo.m.fill(0, (cin.y + 1) * M.w); // (solo lo de encima de la cintura)
  const R = rasgosArriba(cuerpo); if (!R.puntos.cuelloIzq || !R.medidas.pecho) return null;
  const P = R.puntos, med = R.medidas; delete P.bajoIzq; delete P.bajoDer; const talle = med.largo; delete med.largo; delete med.bajo;
  const yF = cin.y + Math.max(1, Math.round(0.36 * (B.y1 - cin.y))); let cad = { w: 0, y: cin.y, c: cin.c }; for (let y = cin.y; y <= yF; y++) if (F[y] && F[y].c && F[y].cw > cad.w) cad = { w: F[y].cw, y, c: F[y].c };
  const hem = mediana([1, 2, 3, 4].map(k => F[B.y1 - k] && F[B.y1 - k].cw)), Q = esquinasBajo(M, F, B, alto);
  const marcada = cin.w < 0.93 * Math.min(R.medidas.pecho.vec[0], cad.w);
  if (!marcada) avisos.push('No se nota la cintura (el vestido es casi recto): la he puesto donde es más estrecho. Muévela a mano si no es ahí.');
  P.cinturaIzq = { x: cin.c[0], y: cin.y, conf: marcada ? 0.75 : 0.45 }; P.cinturaDer = { x: cin.c[1] + 1, y: cin.y, conf: P.cinturaIzq.conf };
  P.caderaIzq = { x: cad.c[0], y: cad.y, conf: 0.5 }; P.caderaDer = { x: cad.c[1] + 1, y: cad.y, conf: 0.5 };
  if (Q) { P.bajoIzq = Q[0]; P.bajoDer = Q[1]; }
  med.talle = Object.assign(talle, { conf: 0.5, como: 'del cuello en el hombro a la cintura (de frente: el de la espalda se calcula y hay que confirmarlo)' });
  med.cintura = H(cin.w, marcada ? 0.75 : 0.45, 'ancho de la cintura (plana: × 2)', { plano: true });
  med.cadera = H(cad.w, 0.5, 'lo más ancho del primer tercio de la falda (plana: × 2)', { plano: true }); med.altoCadera = V(cad.y - cin.y, 0.45, 'de la cintura a lo más ancho');
  med.largo = V(B.y1 - cin.y, 0.85, 'de la cintura al bajo'); med.bajoPlano = H(hem, 0.8, 'ancho del bajo (plana)', { plano: false });
  return { tipo: 'vestido', puntos: P, medidas: med, extra: R.extra, avisos: R.avisos.filter(a => !/simétric/.test(a)).concat(avisos, S.iou < 0.8 ? ['El vestido no sale simétrico (' + Math.round(S.iou * 100) + ' %).'] : []), B, xs, sim: S.iou };
}
// ¿qué es, por la forma? (una pista: la IA de visión o la persona deciden) → [{ k, conf, porque }]
export function formaSugiere(M) {
  const S = simetria(M), { B, F } = filas(M, Math.round(S.x)), xs = Math.round(S.x), alto = B.h, L = [];
  let yC = null; for (let y = B.y1; y >= B.y0; y--) if (M.m[y * M.w + xs]) { yC = y; break; }
  const hueco = yC != null ? (B.y1 - yC) / alto : 0, wTop = F[B.y0 + 2] ? F[B.y0 + 2].cw : 0, wBot = F[B.y1 - 2] ? F[B.y1 - 2].cw : 0;
  let saltos = 0; for (let y = Math.round(B.y0 + 0.1 * alto); y < B.y1 - 0.05 * alto; y++) { const f = F[y]; if (f && f.R.length >= 3) saltos++; }
  if (hueco > 0.25) L.push({ k: 'pantalon', conf: Math.min(0.85, 0.4 + hueco), porque: 'Tiene dos perneras (hueco entre las piernas de ' + Math.round(hueco * 100) + ' % del alto).' });
  if (saltos > 0.05 * alto) L.push({ k: 'camiseta', conf: 0.6, porque: 'Tiene mangas separadas del cuerpo.' });
  else if (hueco < 0.05) { // (16-10) mangas cortas pegadas arriba: el ancho SALTA en las axilas (arriba es mucho más ancha que el cuerpo de abajo)
    const base = mediana([0.65, 0.75, 0.85].map(f => { const r = F[Math.round(B.y0 + f * alto)]; return r ? r.cw : NaN; })); let salta = false; for (let y = Math.round(B.y0 + 0.15 * alto); y <= Math.round(B.y0 + 0.5 * alto); y++) if (F[y] && F[y].cw > 1.3 * base) { salta = true; break; }
    if (salta) L.push({ k: 'camiseta', conf: 0.6, porque: 'Tiene mangas (el ancho salta en las axilas).' }); }
  // el escote: en el centro, la línea de arriba baja respecto a los lados (las faldas y los pantalones tienen la cintura recta)
  const T = x => { let y = B.y0; while (y <= B.y1 && !M.m[y * M.w + x]) y++; return y; }, yCen = T(xs), yLados = Math.min(T(Math.round(xs - 0.2 * B.w)), T(Math.round(xs + 0.2 * B.w))), escote = (yCen - yLados) / alto;
  // (16-10) un VESTIDO: escote arriba, sin perneras y mucho más largo que el ancho de su cuerpo (una camiseta es casi tan ancha como larga)
  const anchoCuerpo = mediana([0.3, 0.4, 0.5].map(f => { const r = F[Math.round(B.y0 + f * alto)]; return r ? r.cw : NaN; }));
  if (hueco < 0.05 && escote > 0.02 && alto > 1.75 * anchoCuerpo) L.push({ k: 'vestido', conf: 0.62, porque: 'Tiene escote y es mucho más larga que ancha: parece un vestido.' });
  if (hueco < 0.05 && saltos < 0.02 * alto && escote > 0.03) L.push({ k: 'camiseta', conf: 0.55, porque: 'Tiene escote y no tiene mangas separadas: prenda de arriba sin mangas (o con las mangas pegadas).' });
  else if (hueco < 0.05 && saltos < 0.02 * alto && wBot > wTop * 1.05 && B.w < alto * 1.1) L.push({ k: 'falda', conf: 0.5, porque: 'Sin mangas, sin escote ni perneras, y más ancha abajo que arriba.' });
  if (!L.length) L.push({ k: 'camiseta', conf: 0.25, porque: 'No está claro por la forma.' });
  return L.sort((a, b) => b.conf - a.conf);
}
