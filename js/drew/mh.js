// ================= 👗 CelebriDREW · el AVATAR PREMIUM (cuerpo humano real de MakeHuman, CC0) a SUS medidas =================
// El cuerpo base de MakeHuman (hm08) + sus «targets» (sexo × músculo × peso, rasgos, pecho y las 20 medidas de sastrería), ya en mm y en
// binario (tools/drew_mh/prepara_mh.py → web/data/drew/mh). Se arma así:
//   1) sexo, peso (por el IMC si se sabe, si no por los contornos) y músculo → la forma general
//   2) cada medida pedida mueve SU target (pecho → «bust-circ», cintura → «waist-circ»…) y se MIDE el cuerpo como una cinta (envolvente
//      del lazo de MakeHuman en su plano); se corrige por la secante hasta dar lo pedido (± 0,3 cm); la altura, escalando.
//   3) de la malla salen la rejilla de choque de la tela, los niveles (pecho, cintura…), las secciones del tronco, brazos, piernas y cabeza:
//      lo mismo que da el avatar sencillo (avatar.js), así la tela no nota la diferencia.
// Coordenadas: mm, Y hacia arriba, pies en Y = 0, mira hacia +Z, +X es su lado IZQUIERDO (igual que MakeHuman).
import { CAMPOS, base, compruebaMedidas } from './avatar.js';

let DATOS = null;
export async function carga(raiz) {
  if (DATOS) return DATOS;
  const u = n => new URL(n, raiz || new URL('../../data/drew/mh/', import.meta.url)).href;
  const [info, b1, b2] = await Promise.all([fetch(u('mh_cuerpo.json')).then(r => { if (!r.ok) throw new Error('No encuentro el cuerpo premium (mh_cuerpo.json).'); return r.json(); }), fetch(u('mh_cuerpo.bin')).then(r => r.arrayBuffer()), fetch(u('mh_targets.bin')).then(r => r.arrayBuffer())]);
  DATOS = desdeBuffers(info, b1, b2); return DATOS;
}
export function desdeBuffers(info, b1, b2) {
  const pos0 = new Float32Array(b1, 0, info.bytesPos / 4), tris = new Uint32Array(b1, info.bytesPos, info.nt * 3), T = {};
  Object.entries(info.targets).forEach(([n, t]) => { if (!t.n) return; T[n] = { idx: new Uint32Array(b2.slice(t.off, t.off + 4 * t.n)), d: new Int16Array(b2.slice(t.off + 4 * t.n, t.off + 4 * t.n + 6 * t.n)), esc: t.esc }; });
  return { info, pos0, tris, T, nv: info.nv };
}

// ---------- armar la malla con unos valores ----------
const val3 = x => { const mx = Math.max(0, x * 2 - 1), mn = Math.max(0, 1 - x * 2); return { min: mn, average: 1 - mx - mn, max: mx }; };
export const MEDIDAS_MH = ['neck-circ', 'upperarm-circ', 'upperarm-length', 'lowerarm-length', 'wrist-circ', 'bust-circ', 'underbust-circ', 'waist-circ', 'napetowaist-dist', 'waisttohip-dist', 'shoulder-dist', 'hips-circ', 'upperleg-height', 'thigh-circ', 'lowerleg-height', 'calf-circ', 'knee-circ', 'ankle-circ', 'frontchest-dist', 'neck-height'];
export function arma(D, p) {
  const pos = Float32Array.from(D.pos0), add = (n, w) => { const t = D.T[n]; if (!t || !w) return; const { idx, d, esc } = t, k = w * esc; for (let j = 0; j < idx.length; j++) { const i = 3 * idx[j]; pos[i] += d[3 * j] * k; pos[i + 1] += d[3 * j + 1] * k; pos[i + 2] += d[3 * j + 2] * k; } };
  const g = p.genero, sx = { female: 1 - g, male: g }, mu = val3(p.musculo), we = val3(p.peso);
  Object.entries(sx).forEach(([s, sv]) => { if (!sv) return;
    ['min', 'average', 'max'].forEach(m => ['min', 'average', 'max'].forEach(w => add('universal-' + s + '-young-' + m + 'muscle-' + w + 'weight', sv * mu[m] * we[w])));
    Object.entries(p.raza).forEach(([r, rv]) => add(r + '-' + s + '-young', sv * rv)); });
  if (sx.female) { const cu = val3(p.copa), fi = val3(p.firmeza); ['min', 'average', 'max'].forEach(c => ['min', 'average', 'max'].forEach(f => add('pecho-' + c + 'cup-' + f + 'firmness', sx.female * cu[c] * fi[f]))); }
  Object.entries(p.med || {}).forEach(([m, v]) => { if (v > 0) add('measure-' + m + '-incr', v); else if (v < 0) add('measure-' + m + '-decr', -v); });
  return pos;
}

// ---------- MEDIR (como una cinta: envolvente del lazo de MakeHuman, en el plano del lazo) ----------
function perimetroPlano(P) {
  const n = P.length; if (n < 3) return 0; const c = [0, 0, 0]; P.forEach(p => { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; });
  // normal del plano = dirección de menos varianza (iteración de potencias sobre la covarianza invertida en espectro: se usa la de MÁS varianza dos veces)
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; P.forEach(p => { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; });
  const mul = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]], nor = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  let e1 = nor([1, 0.3, 0.2]); for (let k = 0; k < 40; k++) e1 = nor(mul(C, e1));
  const l1 = mul(C, e1).reduce((s, x, i) => s + x * e1[i], 0), C2 = C.map((r, i) => r.map((x, j) => x - l1 * e1[i] * e1[j]));
  let e2 = nor([0.2, 1, 0.4]); for (let k = 0; k < 40; k++) { e2 = mul(C2, e2); const dd = e2[0] * e1[0] + e2[1] * e1[1] + e2[2] * e1[2]; e2 = nor([e2[0] - dd * e1[0], e2[1] - dd * e1[1], e2[2] - dd * e1[2]]); }
  const Q = P.map(p => { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; return [d[0] * e1[0] + d[1] * e1[1] + d[2] * e1[2], d[0] * e2[0] + d[1] * e2[1] + d[2] * e2[2]]; });
  Q.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  Q.forEach(p => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
  for (let i = Q.length - 1; i >= 0; i--) { const p = Q[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const Hh = lo.slice(0, -1).concat(up.slice(0, -1)); let s = 0; for (let i = 0; i < Hh.length; i++) { const a = Hh[i], b = Hh[(i + 1) % Hh.length]; s += Math.hypot(a[0] - b[0], a[1] - b[1]); } return s;
}
const V3 = (pos, i) => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function centro(pos, L) { const c = [0, 0, 0]; L.forEach(i => { c[0] += pos[3 * i] / L.length; c[1] += pos[3 * i + 1] / L.length; c[2] += pos[3 * i + 2] / L.length; }); return c; }
// el vértice más cercano al reflejo (−x) de uno dado (para el otro hombro)
function espejo(D, pos, i) { const p = V3(pos, i); let m = Infinity, j = i; for (let k = 0; k < D.nv; k++) { const d = (pos[3 * k] + p[0]) ** 2 + (pos[3 * k + 1] - p[1]) ** 2 + (pos[3 * k + 2] - p[2]) ** 2; if (d < m) { m = d; j = k; } } return j; }
// todas las medidas (cm) del cuerpo armado (pos ya en su sitio y a su escala)
export function mide(D, pos, aux) {
  const L = D.info.lazos, lz = n => L['measure-' + n] || [], per = n => perimetroPlano(lz(n).map(i => V3(pos, i))) / 10, tramo = n => { const l = lz(n); return l.length >= 2 ? dist(V3(pos, l[0]), V3(pos, l[l.length - 1])) / 10 : 0; };
  const sh = lz('shoulder-dist'), acI = sh[sh.length - 1], acD = aux.acD;
  return { pecho: per('bust-circ'), bajoPecho: per('underbust-circ'), cintura: per('waist-circ'), cadera: per('hips-circ'), cuello: per('neck-circ'), biceps: per('upperarm-circ'), muneca: per('wrist-circ'),
    muslo: per('thigh-circ'), rodilla: per('knee-circ'), gemelo: per('calf-circ'), tobillo: per('ankle-circ'), espalda: tramo('napetowaist-dist'), brazo: tramo('upperarm-length') + tramo('lowerarm-length'),
    hombros: dist(V3(pos, acI), V3(pos, acD)) / 10, entrepierna: entrepierna(D, pos) / 10 };
}
// la entrepierna: lo más bajo del tronco entre las dos piernas (cerca de x = 0, entre las caderas y las rodillas)
// (es un vértice FIJO de la malla: el más bajo del plano de simetría en la pelvis del cuerpo base; así no se confunde con la cara
// interna de los muslos cuando se tocan)
function entrepierna(D, pos) {
  if (D.iCrotch == null) { const P = D.pos0, J = D.info.juntas, yH = centro(P, J['l-upper-leg'])[1], yK = centro(P, J['l-knee'])[1]; let m = Infinity;
    for (let k = 0; k < D.nv; k++) { if (D.esCuerpo && !D.esCuerpo[k]) continue; const x = P[3 * k], y = P[3 * k + 1]; if (Math.abs(x) < 0.5 && y < yH + 40 && y > (yH + yK) / 2 && y < m) { m = y; D.iCrotch = k; } } }
  return pos[3 * D.iCrotch + 1]; }
// colocar: pies en el suelo y el centro de la pelvis en x = 0, z = 0; escalar a la altura (sin las articulaciones)
function coloca(D, pos, altura) {
  let y0 = Infinity, y1 = -Infinity; const nb = D.cuerpoN; for (let k = 0; k < D.nv; k++) { if (!D.esCuerpo[k]) continue; const y = pos[3 * k + 1]; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const s = altura ? altura / (y1 - y0) : 1, pc = centro(pos, D.info.juntas.pelvis);
  for (let k = 0; k < D.nv; k++) { pos[3 * k] = (pos[3 * k] - pc[0]) * s; pos[3 * k + 1] = (pos[3 * k + 1] - y0) * s; pos[3 * k + 2] = (pos[3 * k + 2] - pc[2]) * s; }
  return s;
}

// el pecho de MANIQUÍ DE TIENDA (16-10): MakeHuman trae pezones (unos 5 mm) que la tela, con un punto cada 14 mm, no siempre tapaba
// (asomaba un punto blanco). Se alisan en la propia malla ANTES de medir (Taubin: quita lo pequeño sin encoger lo grande): el ajuste a la
// medida de pecho lo compensa, y la tela choca con el mismo cuerpo que se ve.
function liso(D, pos) {
  if (!D.vecinos) { const V = Array.from({ length: D.nv }, () => new Set()); for (let q = 0; q < D.tris.length; q += 3) { const a = D.tris[q], b = D.tris[q + 1], c = D.tris[q + 2]; V[a].add(b).add(c); V[b].add(a).add(c); V[c].add(a).add(b); } D.vecinos = V.map(x => Uint32Array.from(x)); }
  const L = D.info.lazos['measure-bust-circ']; if (!L) return; let yb = 0, zc = 0; L.forEach(i => { yb += pos[3 * i + 1]; zc += pos[3 * i + 2]; }); yb /= L.length; zc /= L.length;
  const sel = []; for (let k = 0; k < D.nv; k++) if (D.esCuerpo[k] && Math.abs(pos[3 * k + 1] - yb) < 70 && pos[3 * k + 2] > zc) sel.push(k);
  const t = new Float32Array(sel.length * 3);
  for (let it = 0; it < 24; it++) { const f = it % 2 ? -0.53 : 0.5;
    sel.forEach((k, j) => { const N = D.vecinos[k], n = N.length || 1; let x = 0, y = 0, z = 0; for (let r = 0; r < N.length; r++) { const v = N[r]; x += pos[3 * v]; y += pos[3 * v + 1]; z += pos[3 * v + 2]; }
      t[3 * j] = pos[3 * k] + f * (x / n - pos[3 * k]); t[3 * j + 1] = pos[3 * k + 1] + f * (y / n - pos[3 * k + 1]); t[3 * j + 2] = pos[3 * k + 2] + f * (z / n - pos[3 * k + 2]); });
    sel.forEach((k, j) => { pos[3 * k] = t[3 * j]; pos[3 * k + 1] = t[3 * j + 1]; pos[3 * k + 2] = t[3 * j + 2]; }); }
  // y la PUNTA (lo más saliente de cada lado, 2,2 cm alrededor) se aplana del todo: en un vestido ceñido aún asomaba (16-10)
  [1, -1].forEach(sg => { let ap = -1; sel.forEach(k => { if (Math.sign(pos[3 * k]) === sg && (ap < 0 || pos[3 * k + 2] > pos[3 * ap + 2])) ap = k; }); if (ap < 0) return;
    const c = [pos[3 * ap], pos[3 * ap + 1], pos[3 * ap + 2]], zona = sel.filter(k => Math.hypot(pos[3 * k] - c[0], pos[3 * k + 1] - c[1], pos[3 * k + 2] - c[2]) < 22), t2 = new Float32Array(zona.length * 3);
    for (let it = 0; it < 20; it++) { zona.forEach((k, j) => { const N = D.vecinos[k], n = N.length || 1; let x = 0, y = 0, z = 0; for (const v of N) { x += pos[3 * v]; y += pos[3 * v + 1]; z += pos[3 * v + 2]; } t2[3 * j] = pos[3 * k] + 0.6 * (x / n - pos[3 * k]); t2[3 * j + 1] = pos[3 * k + 1] + 0.6 * (y / n - pos[3 * k + 1]); t2[3 * j + 2] = pos[3 * k + 2] + 0.6 * (z / n - pos[3 * k + 2]); });
      zona.forEach((k, j) => { pos[3 * k] = t2[3 * j]; pos[3 * k + 1] = t2[3 * j + 1]; pos[3 * k + 2] = t2[3 * j + 2]; }); } });
}

// ---------- el cuerpo A MEDIDA ----------
const LIM = 2; // (MakeHuman deja cada medida entre −1 y 1; los targets son lineales y hasta 2 siguen viéndose naturales: así llegan los cuerpos que se salen de lo típico)
const MANDO = { pecho: 'bust-circ', bajoPecho: 'underbust-circ', cintura: 'waist-circ', cadera: 'hips-circ', cuello: 'neck-circ', biceps: 'upperarm-circ', muneca: 'wrist-circ', muslo: 'thigh-circ', rodilla: 'knee-circ', gemelo: 'calf-circ', tobillo: 'ankle-circ', espalda: 'napetowaist-dist', hombros: 'shoulder-dist', brazo: 'upperarm-length', entrepierna: 'upperleg-height' };
export function construye(D, med, o = {}) {
  const sexo = o.sexo === 'hombre' ? 'hombre' : 'mujer', m = Object.assign(base(sexo), med || {}); compruebaMedidas(m, sexo);
  if (!D.esCuerpo) { D.esCuerpo = new Uint8Array(D.nv); for (let q = 0; q < D.tris.length; q++) D.esCuerpo[D.tris[q]] = 1; }
  const obj = {}; Object.keys(MANDO).forEach(k => { if (m[k] > 0 && !(sexo === 'hombre' && k === 'bajoPecho')) obj[k] = m[k]; });
  const p = { genero: sexo === 'hombre' ? 1 : 0, musculo: o.musculo != null ? o.musculo : 0.5, peso: 0.5, raza: o.raza || { african: 1 / 3, asian: 1 / 3, caucasian: 1 / 3 }, copa: 0.5, firmeza: 0.5, med: {} };
  if (sexo === 'mujer' && m.bajoPecho) p.copa = Math.max(0, Math.min(1, 0.5 + (m.pecho - m.bajoPecho - 13) / 18));
  if (o.peso && m.altura) { const imc = o.peso / (m.altura / 100) ** 2; p.peso = Math.max(0, Math.min(1, 0.5 + (imc - 22) / (imc > 22 ? 20 : 12))); }
  let pos, s, M, aux = null; const t0 = Date.now();
  const traza = []; const paso = () => { pos = arma(D, p); s = coloca(D, pos, m.altura * 10); liso(D, pos); if (!aux) { const sh = D.info.lazos['measure-shoulder-dist']; aux = { acD: espejo(D, pos, sh[sh.length - 1]) }; } M = mide(D, pos, aux); if (o.traza) traza.push({ peso: +p.peso.toFixed(3), s: +s.toFixed(3), err: Object.fromEntries(Object.keys(obj).map(k => [k, +(M[k] - obj[k]).toFixed(1)])), med: Object.fromEntries(Object.entries(p.med).map(([k, v]) => [k, +v.toFixed(2)])) }); };
  paso();
  // por FASES, como un sastre: (A) proporciones (los largos cambian la altura y, al reescalar, todos los contornos) · (B) el peso general
  // por los contornos grandes · (C) cada contorno con su mando · (D) todo junto, con pasos suaves. Cada medida, por la secante.
  const LARGOS = ['entrepierna', 'espalda', 'brazo', 'hombros'], prev = {};
  const ajusta = (ks, amort = 1) => { ks.forEach(k => { const v = obj[k]; if (v == null) return; const n = MANDO[k], x = p.med[n] || 0, y = M[k] - v, P = prev[k]; let nx;
      if (P && Math.abs(x - P.x) > 1e-4 && Math.abs(y - P.y) > 1e-3) { const sl = (y - P.y) / (x - P.x); nx = sl > 0.05 ? x - amort * y / sl : x - y * 0.05; } else nx = x - y * (LARGOS.includes(k) ? 0.08 : 0.04);
      prev[k] = { x, y }; p.med[n] = Math.max(-LIM, Math.min(LIM, nx)); if (k === 'brazo') p.med['lowerarm-length'] = p.med[n]; if (k === 'entrepierna') p.med['lowerleg-height'] = p.med[n]; }); paso(); };
  const err = ks => Math.max(0, ...ks.filter(k => obj[k] != null).map(k => Math.abs(M[k] - obj[k])));
  for (let it = 0; it < 8 && err(LARGOS) > 0.2; it++) ajusta(LARGOS);
  for (let it = 0; it < 6; it++) { /* el IMC solo da el punto de partida: manda lo que mide */ const ks = ['pecho', 'cintura', 'cadera', 'muslo'].filter(k => obj[k]), r = ks.reduce((a, k) => a + obj[k] / M[k], 0) / ks.length; if (Math.abs(r - 1) < 0.01) break; p.peso = Math.max(0, Math.min(1.3, p.peso + (r - 1) * 2.2)); paso(); }
  const CONT = Object.keys(obj).filter(k => !LARGOS.includes(k)); Object.keys(prev).forEach(k => delete prev[k]);
  let pasos = 0;
  for (; pasos < 12 && err(CONT) > 0.2; pasos++) ajusta(CONT);
  Object.keys(prev).forEach(k => delete prev[k]);
  for (let it = 0; it < (o.pasos || 8) && err(Object.keys(obj)) > 0.25; it++, pasos++) ajusta(Object.keys(obj), 0.7);
  const C = deMalla(D, pos, m, sexo); C.med = m; C.medido = M; C.objetivo = obj; C.pasos = pasos; C.params = p; C.ms = Date.now() - t0; C.premium = true; C.traza = traza;
  C.desvio = Math.max(...Object.keys(obj).map(k => Math.abs(M[k] - obj[k]))); C.fuera = Object.keys(obj).filter(k => Math.abs(M[k] - obj[k]) > 1); // (si alguna no se puede alcanzar con MakeHuman, se dice)
  return C;
}

// ---------- de la malla, lo que necesita la tela (igual que avatar.js) ----------
function deMalla(D, pos, m, sexo) {
  const J = D.info.juntas, jc = n => centro(pos, J[n]), L = D.info.lazos, nivel = n => centro(pos, L['measure-' + n] || [0])[1];
  let H = 0; for (let k = 0; k < D.nv; k++) if (D.esCuerpo[k]) H = Math.max(H, pos[3 * k + 1]);
  const sh = L['measure-shoulder-dist'], acI = V3(pos, sh[sh.length - 1]), nape = V3(pos, (L['measure-napetowaist-dist'] || [0])[0]);
  const brazos = [1, -1].map(sg => { const k = sg > 0 ? 'l' : 'r', Jn = jc(k + '-shoulder'), E = jc(k + '-elbow'), W = jc(k + '-hand'); let Mx = W, md = 0;
    const d0 = [W[0] - Jn[0], W[1] - Jn[1], W[2] - Jn[2]], l0 = Math.hypot(...d0), d = d0.map(x => x / l0);
    for (let q = 0; q < D.nv; q++) { if (!D.esCuerpo[q] || Math.sign(pos[3 * q]) !== sg) continue; const v = [pos[3 * q] - W[0], pos[3 * q + 1] - W[1], pos[3 * q + 2] - W[2]], t = v[0] * d[0] + v[1] * d[1] + v[2] * d[2]; if (t > md && Math.hypot(v[0] - d[0] * t, v[1] - d[1] * t, v[2] - d[2] * t) < 60) { md = t; Mx = V3(pos, q); } }
    return { sg, J: Jn, E, W, M: Mx, d }; });
  const piernas = [1, -1].map(sg => { const k = sg > 0 ? 'l' : 'r'; return { sg, Hj: jc(k + '-upper-leg'), Ki: jc(k + '-knee'), An: jc(k + '-ankle') }; });
  const yCr = entrepierna(D, pos), niveles = { cabeza: H, c7: nape[1], hombro: acI[1], axila: (acI[1] + nivel('bust-circ')) / 2 + 10, pecho: nivel('bust-circ'), bajoPecho: nivel('underbust-circ'), cintura: nivel('waist-circ'), cadera: nivel('hips-circ'), entrepierna: yCr, rodilla: nivel('knee-circ'), tobillo: nivel('ankle-circ') };
  niveles.caderaAlta = (niveles.cintura + niveles.cadera) / 2;
  // las secciones del TRONCO (cada 5 mm, de la entrepierna al hombro): corte horizontal sin los brazos → elipse (a, b, centro z)
  const y0 = yCr - 10, y1 = acI[1] + 40, paso = 5, nS = Math.ceil((y1 - y0) / paso) + 1, SA = new Float32Array(nS), SB = new Float32Array(nS), SC = new Float32Array(nS), T = D.tris;
  const xmin = new Float32Array(nS).fill(1e9), xmax = new Float32Array(nS).fill(-1e9), zmin = new Float32Array(nS).fill(1e9), zmax = new Float32Array(nS).fill(-1e9);
  const enBrazo = (x, y, z) => brazos.some(B => { const v = [x - B.J[0], y - B.J[1], z - B.J[2]], t = v[0] * B.d[0] + v[1] * B.d[1] + v[2] * B.d[2]; if (t < -10) return false; const r = Math.hypot(v[0] - B.d[0] * t, v[1] - B.d[1] * t, v[2] - B.d[2] * t); return r < 70 && Math.abs(x) > Math.abs(B.J[0]) - 25; });
  for (let q = 0; q < T.length; q += 3) { const A = V3(pos, T[q]), B = V3(pos, T[q + 1]), Cc = V3(pos, T[q + 2]);
    [[A, B], [B, Cc], [Cc, A]].forEach(([a, b]) => { const ya = a[1], yb = b[1]; if (ya === yb) return; const lo = Math.min(ya, yb), hi = Math.max(ya, yb); let i0 = Math.ceil((lo - y0) / paso), i1 = Math.floor((hi - y0) / paso); i0 = Math.max(0, i0); i1 = Math.min(nS - 1, i1);
      for (let i = i0; i <= i1; i++) { const y = y0 + i * paso, t = (y - ya) / (yb - ya), x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t; if (y < yCr + 20 && Math.abs(x) > 40) continue; if (enBrazo(x, y, z)) continue; if (x < xmin[i]) xmin[i] = x; if (x > xmax[i]) xmax[i] = x; if (z < zmin[i]) zmin[i] = z; if (z > zmax[i]) zmax[i] = z; } }); }
  for (let i = 0; i < nS; i++) { if (xmax[i] < xmin[i]) { SA[i] = i ? SA[i - 1] : 60; SB[i] = i ? SB[i - 1] : 60; SC[i] = i ? SC[i - 1] : 0; continue; } SA[i] = Math.max(Math.abs(xmin[i]), Math.abs(xmax[i])); SB[i] = (zmax[i] - zmin[i]) / 2; SC[i] = (zmax[i] + zmin[i]) / 2; }
  const secc = y => { const f = Math.max(0, Math.min(nS - 1.001, (y - y0) / paso)), i = Math.floor(f), w = f - i; return { a: SA[i] * (1 - w) + SA[i + 1] * w, b: SB[i] * (1 - w) + SB[i + 1] * w, c: SC[i] * (1 - w) + SC[i + 1] * w }; };
  // la cabeza (caja de lo que está por encima del cuello)
  const yN = jc('neck')[1]; let hx = 0, hz0 = 1e9, hz1 = -1e9, hy0 = 1e9; for (let q = 0; q < D.nv; q++) { if (!D.esCuerpo[q] || pos[3 * q + 1] < yN + 40 || Math.abs(pos[3 * q]) > 130) continue; hx = Math.max(hx, Math.abs(pos[3 * q])); hz0 = Math.min(hz0, pos[3 * q + 2]); hz1 = Math.max(hz1, pos[3 * q + 2]); hy0 = Math.min(hy0, pos[3 * q + 1]); }
  const cabeza = { c: [0, (H + hy0) / 2, (hz0 + hz1) / 2], r: [hx, (H - hy0) / 2, (hz1 - hz0) / 2] };
  const cm = v => v * 10 / (2 * Math.PI);
  return { H, s: H / 1650, sexo, niveles, secc, brazos, piernas, cabeza, rN: cm(m.cuello), hS: Math.abs(acI[0]), rB: cm(m.biceps), rW: cm(m.muneca), rM: cm(m.muslo), rS: cm(m.biceps) * 1.05,
    puntos: { cuelloI: [cm(m.cuello) * 0.92, niveles.hombro + 0.012 * H, 0], cuelloD: [-cm(m.cuello) * 0.92, niveles.hombro + 0.012 * H, 0], hombroI: acI, hombroD: [-acI[0], acI[1], acI[2]] }, pos, tris: D.tris };
}

// ---------- la MALLA que se ve (con sus normales suaves) ----------
// (18-10) dónde está cada ARTICULACIÓN en este cuerpo (ojos, párpados, boca, cabeza, columna, hombros, codos, manos, caderas, rodillas, tobillos,
// pies…): la media de sus puntos (como hace MakeHuman) → { nombre: [x, y, z] } en mm
export function juntasDe(D, pos) { const o = {}; Object.entries(D.info.juntas).forEach(([k, L]) => { o[k] = centro(pos, L); }); return o; }
export function malla(C) {
  const P = C.pos, T = C.tris, N = new Float32Array(P.length);
  for (let q = 0; q < T.length; q += 3) { const a = 3 * T[q], b = 3 * T[q + 1], c = 3 * T[q + 2], ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    [a, b, c].forEach(i => { N[i] += nx; N[i + 1] += ny; N[i + 2] += nz; }); }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  // lo que se VE va 1 mm por dentro de la piel con la que choca la tela: entre punto y punto la tela se hunde hasta 0,5 mm en lo que
  // sobresale y, si no, el maniquí blanco se cuela a la vista (16-10). 1 mm no cambia ninguna medida que se aprecie
  const V = Float32Array.from(P); for (let i = 0; i < V.length; i++) V[i] -= N[i] * 1;
  return { pos: V, nor: N, idx: Uint32Array.from(T) };
}

// ---------- la REJILLA de choque desde la malla (banda estrecha + relleno para saber dentro/fuera) ----------
export function rejilla(C, paso = 9) {
  const P = C.pos, T = C.tris, banda = 2.2 * paso, TOPE = 80; let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let q = 0; q < T.length; q++) { const i = 3 * T[q]; x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); z0 = Math.min(z0, P[i + 2]); z1 = Math.max(z1, P[i + 2]); }
  x0 -= 60; y0 -= 2 * paso; z0 -= 60; x1 += 60; y1 += 60; z1 += 60;
  const nx = Math.ceil((x1 - x0) / paso) + 1, ny = Math.ceil((y1 - y0) / paso) + 1, nz = Math.ceil((z1 - z0) / paso) + 1, n = nx * ny * nz, d = new Float32Array(n).fill(1e9), sg = new Int8Array(n);
  const at = (i, j, k) => (k * ny + j) * nx + i;
  for (let q = 0; q < T.length; q += 3) { const a = 3 * T[q], b = 3 * T[q + 1], c = 3 * T[q + 2], A = [P[a], P[a + 1], P[a + 2]], B = [P[b], P[b + 1], P[b + 2]], Cc = [P[c], P[c + 1], P[c + 2]];
    const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], ac = [Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2]], nn = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const i0 = Math.max(0, Math.floor((Math.min(A[0], B[0], Cc[0]) - banda - x0) / paso)), i1 = Math.min(nx - 1, Math.ceil((Math.max(A[0], B[0], Cc[0]) + banda - x0) / paso));
    const j0 = Math.max(0, Math.floor((Math.min(A[1], B[1], Cc[1]) - banda - y0) / paso)), j1 = Math.min(ny - 1, Math.ceil((Math.max(A[1], B[1], Cc[1]) + banda - y0) / paso));
    const k0 = Math.max(0, Math.floor((Math.min(A[2], B[2], Cc[2]) - banda - z0) / paso)), k1 = Math.min(nz - 1, Math.ceil((Math.max(A[2], B[2], Cc[2]) + banda - z0) / paso));
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const p = [x0 + i * paso, y0 + j * paso, z0 + k * paso], cp = masCerca(p, A, B, Cc, ab, ac), dd = Math.hypot(p[0] - cp[0], p[1] - cp[1], p[2] - cp[2]); const r = at(i, j, k);
      if (dd < d[r]) { d[r] = dd; sg[r] = ((p[0] - cp[0]) * nn[0] + (p[1] - cp[1]) * nn[1] + (p[2] - cp[2]) * nn[2]) >= 0 ? 1 : -1; } } }
  // fuera de la banda: relleno desde el borde (lo que se alcanza sin cruzar la banda está fuera; lo demás, dentro)
  const fuera = new Uint8Array(n), pila = [];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if ((i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) && d[at(i, j, k)] > banda) { fuera[at(i, j, k)] = 1; pila.push(at(i, j, k)); }
  while (pila.length) { const r = pila.pop(), i = r % nx, j = ((r - i) / nx) % ny, k = Math.floor(r / (nx * ny)); [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(([a, b, c]) => { const I = i + a, Jj = j + b, K = k + c; if (I < 0 || Jj < 0 || K < 0 || I >= nx || Jj >= ny || K >= nz) return; const s2 = at(I, Jj, K); if (!fuera[s2] && d[s2] > banda) { fuera[s2] = 1; pila.push(s2); } }); }
  for (let r = 0; r < n; r++) d[r] = d[r] <= banda ? Math.min(TOPE, d[r]) * sg[r] : fuera[r] ? TOPE : -1e6;
  // DENTRO del cuerpo, la distancia de verdad hasta la piel (chaflán 3D en dos pasadas): así un punto de tela que se cuele (al colocar
  // una manga, al cerrar una costura de golpe) sabe por dónde salir. Antes ahí solo ponía «−80» y el empuje era cero (16-10)
  const pasoD = [paso, paso * Math.SQRT2, paso * Math.sqrt(3)];
  const relaja = (i, j, k, dir) => { const r = at(i, j, k); if (d[r] >= 0) return; let m = -d[r];
    for (let c = -1; c <= 1; c++) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { if (!a && !b && !c) continue; const kk = k + c, jj = j + b, ii = i + a; if ((kk * ny + jj) * nx + ii > r === (dir > 0)) continue;
      if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue; const v = d[at(ii, jj, kk)]; if (v >= 0) continue; const cand = -v + pasoD[Math.abs(a) + Math.abs(b) + Math.abs(c) - 1]; if (cand < m) m = cand; }
    d[r] = -m; };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) relaja(i, j, k, 1);
  for (let k = nz - 1; k >= 0; k--) for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) relaja(i, j, k, -1);
  for (let r = 0; r < n; r++) if (d[r] < -400) d[r] = -400;
  // la rejilla NO puede quedarse corta: entre sus nudos (cada 9 mm) la distancia se interpola y en lo que sobresale (la punta del pecho,
  // el codo) quedaba hasta 2,6 mm por dentro de la piel → la tela se apoyaba ahí y la piel la atravesaba (la «mota blanca» del pecho, 16-10).
  // Para cada punto de la piel que la rejilla ve «fuera», se bajan sus 8 nudos lo que sobra: así ningún punto de la piel queda fuera de lo que ve la tela
  const lee = (x, y, z) => { const fx = (x - x0) / paso, fy = (y - y0) / paso, fz = (z - z0) / paso, i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz); if (i < 0 || j < 0 || k < 0 || i >= nx - 1 || j >= ny - 1 || k >= nz - 1) return null; return [i, j, k, fx - i, fy - j, fz - k]; };
  const usados = new Uint8Array(P.length / 3); for (let q = 0; q < T.length; q++) usados[T[q]] = 1;
  for (let vuelta = 0; vuelta < 4; vuelta++) { let malos = 0;
    for (let q = 0; q < usados.length; q++) { if (!usados[q]) continue; const L = lee(P[3 * q], P[3 * q + 1], P[3 * q + 2]); if (!L) continue; const [i, j, k, u, v, w] = L; let s = 0;
      for (let c = 0; c < 2; c++) for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) s += d[at(i + a, j + b, k + c)] * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
      const sobra = s + 0.4; if (sobra <= 0) continue; malos++;
      for (let c = 0; c < 2; c++) for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) d[at(i + a, j + b, k + c)] -= sobra; }
    if (!malos) break; }
  return { x0, y0, z0, nx, ny, nz, paso, d, tope: TOPE };
}
function masCerca(p, a, b, c, ab, ac) { // punto del triángulo más cercano a p (Ericson)
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], d1 = ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2], d2 = ac[0] * ap[0] + ac[1] * ap[1] + ac[2] * ap[2]; if (d1 <= 0 && d2 <= 0) return a;
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]], d3 = ab[0] * bp[0] + ab[1] * bp[1] + ab[2] * bp[2], d4 = ac[0] * bp[0] + ac[1] * bp[1] + ac[2] * bp[2]; if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]; }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], d5 = ab[0] * cp[0] + ab[1] * cp[1] + ab[2] * cp[2], d6 = ac[0] * cp[0] + ac[1] * cp[1] + ac[2] * cp[2]; if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]; }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}
export { CAMPOS };
