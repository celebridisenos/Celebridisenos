// ================= 👗 CelebriDREW · 🚶‍♀️ PASARELA: el avatar DESFILA con la prenda puesta (18-10-2026) =================
// Ella: «los avatares deben poderse en animación, movimiento, como modelos modelando, estilo pasarela».
// MakeHuman trae las JUNTAS del cuerpo, pero no los pesos de la piel. Aquí:
//  · un ESQUELETO de 22 huesos con las juntas de ESTE cuerpo (cadera, columna, cuello, cabeza, clavículas, brazos, manos, piernas y pies);
//  · los PESOS de cada punto de la piel: por cercanía a cada hueso, medida con el grosor de esa parte del cuerpo (el pecho no se va con el
//    brazo), solo entre huesos vecinos y suavizados por la malla (las rodillas y los codos doblan redondos);
//  · la PRENDA ya cosida se engancha a la piel que tiene debajo; lo suelto de una falda o un vestido, más a la cadera (no se parte entre
//    las piernas); el pelo y los ojos van con la cabeza;
//  · el PASO DE MODELO: los pies en línea (uno delante del otro), la cadera que se balancea y sube del lado que pisa, los hombros al revés,
//    los brazos sueltos que acompañan y la cabeza firme. Los pies se colocan con IK (dos huesos, la rodilla hacia delante): no patinan ni
//    se meten en el suelo, y el talón se levanta antes de despegar;
//  · el PROGRAMA: sale, desfila hasta el final, frena, POSA, se gira, vuelve y se gira otra vez (en bucle).
// Todo es matemática pura (se prueba en node: test/unit/drew_pasarela.mjs); vista3d.js lo pinta (piel y tela por CPU).

// ---------- vectores y cuaterniones (x, y, z, w) ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], esc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const largo = a => Math.hypot(a[0], a[1], a[2]), uni = a => { const l = largo(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const suave = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const G = Math.PI / 180;
export const Q = {
  id: () => [0, 0, 0, 1],
  eje(e, an) { const s = Math.sin(an / 2); return [e[0] * s, e[1] * s, e[2] * s, Math.cos(an / 2)]; },
  x: an => Q.eje([1, 0, 0], an), y: an => Q.eje([0, 1, 0], an), z: an => Q.eje([0, 0, 1], an),
  mul(a, b) { return [a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1], a[1] * b[3] + a[3] * b[1] + a[2] * b[0] - a[0] * b[2], a[2] * b[3] + a[3] * b[2] + a[0] * b[1] - a[1] * b[0], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; },
  inv: q => [-q[0], -q[1], -q[2], q[3]],
  rota(q, v) { const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
    return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; },
  // matriz 3×3 por filas
  mat(q) { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y), 2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x), 2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]; },
  deMat(m) { const t = m[0] + m[4] + m[8]; let s;
    if (t > 0) { s = 0.5 / Math.sqrt(t + 1); return [(m[7] - m[5]) * s, (m[2] - m[6]) * s, (m[3] - m[1]) * s, 0.25 / s]; }
    if (m[0] > m[4] && m[0] > m[8]) { s = 2 * Math.sqrt(1 + m[0] - m[4] - m[8]); return [0.25 * s, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s]; }
    if (m[4] > m[8]) { s = 2 * Math.sqrt(1 + m[4] - m[0] - m[8]); return [(m[1] + m[3]) / s, 0.25 * s, (m[5] + m[7]) / s, (m[2] - m[6]) / s]; }
    s = 2 * Math.sqrt(1 + m[8] - m[0] - m[4]); return [(m[2] + m[6]) / s, (m[5] + m[7]) / s, 0.25 * s, (m[3] - m[1]) / s]; },
  slerp(a, b, t) { let c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b; if (c < 0) { c = -c; bb = b.map(v => -v); }
    if (c > 0.9995) { const r = a.map((v, i) => v + (bb[i] - v) * t), l = Math.hypot(...r); return r.map(v => v / l); }
    const th = Math.acos(c), s = Math.sin(th), k0 = Math.sin((1 - t) * th) / s, k1 = Math.sin(t * th) / s; return a.map((v, i) => v * k0 + bb[i] * k1); },
};
// la rotación que lleva la base (e1, e2) de reposo a la (f1, f2) de ahora (las dos, ortonormales)
function deBases(e1, e2, f1, f2) { const e3 = cruz(e1, e2), f3 = cruz(f1, f2), m = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[3 * r + c] = f1[r] * e1[c] + f2[r] * e2[c] + f3[r] * e3[c]; return Q.deMat(m); }
const base = (e1, ref) => { e1 = uni(e1); return [e1, uni(sub(ref, esc(e1, dot(ref, e1))))]; };

// ---------- el ESQUELETO ----------
// [nombre, padre, junta donde gira, junta donde acaba su trozo (para los pesos)] · _i = izquierda de ella (+x), _d = derecha (−x)
export const HUESOS = (() => {
  const B = [['cadera', -1, 'pelvis', 'spine-3'], ['lumbar', 0, 'spine-3', 'spine-2'], ['dorsal', 1, 'spine-2', 'spine-1'], ['pecho', 2, 'spine-1', 'neck'], ['cuello', 3, 'neck', 'head'], ['cabeza', 4, 'head', 'head-2']];
  for (const s of ['i', 'd']) { const p = s === 'i' ? 'l-' : 'r-', b = B.length; B.push(['clav_' + s, 3, p + 'clavicle', p + 'shoulder'], ['brazo_' + s, b, p + 'shoulder', p + 'elbow'], ['antebrazo_' + s, b + 1, p + 'elbow', p + 'hand'], ['mano_' + s, b + 2, p + 'hand', p + 'finger-3-4']); }
  for (const s of ['i', 'd']) { const p = s === 'i' ? 'l-' : 'r-', b = B.length; B.push(['muslo_' + s, 0, p + 'upper-leg', p + 'knee'], ['pierna_' + s, b, p + 'knee', p + 'ankle'], ['pie_' + s, b + 1, p + 'ankle', p + 'foot-1'], ['dedos_' + s, b + 2, p + 'foot-1', p + 'foot-2']); }
  return B.map(([k, padre, de, a]) => ({ k, padre, de, a, lado: /_i$/.test(k) ? 1 : /_d$/.test(k) ? -1 : 0, pierna: /^(muslo|pierna|pie|dedos)_/.test(k), brazo: /^(brazo|antebrazo|mano)_/.test(k) }));
})();
export const HU = Object.fromEntries(HUESOS.map((b, i) => [b.k, i]));
// J = juntas del cuerpo (mm), H = estatura
export function esqueleto(J, H) {
  const B = HUESOS.map(b => { if (!J[b.de] || !J[b.a]) throw new Error('Falta la junta ' + (J[b.de] ? b.a : b.de)); return { ...b, p: J[b.de].slice(), f: J[b.a].slice() }; });
  B.forEach(b => { b.ini = b.p; b.o = b.padre < 0 ? b.p.slice() : sub(b.p, B[b.padre].p); });
  // (el trozo de la cadera baja hasta la entrepierna: las nalgas y el pubis son de la cadera, no de los muslos)
  B[0].ini = [B[0].p[0], B[0].p[1] - 0.05 * H, B[0].p[2]];
  // (la junta de la cabeza de MakeHuman está a la altura de los ojos: la CARA de debajo —nariz, boca, barbilla— quedaba más cerca del cuello y
  // se iba con él. La cabeza tiene otro trozo, de la mandíbula a esa junta)
  B.forEach(b => { b.trozos = [[b.ini, b.f]]; }); if (J.jaw) B[HU.cabeza].trozos.push([J.jaw.slice(), B[HU.cabeza].p]);
  const p = new Float64Array(3 * B.length); B.forEach((b, i) => p.set(b.p, 3 * i));
  const pie = s => { const t = B[HU['muslo_' + s]], k = B[HU['pierna_' + s]], a = B[HU['pie_' + s]], d = B[HU['dedos_' + s]]; return { L1: largo(sub(k.p, t.p)), L2: largo(sub(a.p, k.p)), tobillo: a.p, bola: d.p }; };
  return { B, H, p, pies: { i: pie('i'), d: pie('d') } };
}

// ---------- los PESOS de la piel ----------
function dSeg(x, y, z, A, B) { const bx = B[0] - A[0], by = B[1] - A[1], bz = B[2] - A[2], px = x - A[0], py = y - A[1], pz = z - A[2], l2 = bx * bx + by * by + bz * bz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / l2)) : 0; return Math.hypot(px - t * bx, py - t * by, pz - t * bz); }
// los huesos a 2 saltos o menos en el árbol (los únicos que se pueden repartir un punto)
const VECINOS = HUESOS.map((b, i) => { const s = new Set([i]); const sube = j => HUESOS[j].padre; let p = sube(i); if (p >= 0) { s.add(p); const pp = sube(p); if (pp >= 0) s.add(pp); }
  HUESOS.forEach((c, j) => { if (c.padre === i) { s.add(j); HUESOS.forEach((d, k) => { if (d.padre === j) s.add(k); }); } if (p >= 0 && c.padre === p) s.add(j); }); return s; });
// → { I: Uint8Array(4n), w: Float32Array(4n) }
export function pesos(pos, idx, E, o = {}) {
  const B = E.B, nb = B.length, n = pos.length / 3, H = E.H, D = new Float32Array(n * nb);
  // (las piernas no llegan a la tripa: por encima de la cadera se van apagando y, 10 cm más arriba, nada; los brazos no llegan al costado)
  const yP = B[0].p[1], bandaP = 0.06 * H, xBrazo = Math.abs(B[HU.brazo_i].p[0]) - 0.025 * H;
  const permitido = (b, x, y) => !(b.lado && x * b.lado < -0.006 * H) && !(b.pierna && y > yP + bandaP) && !(b.brazo && Math.abs(x) < xBrazo);
  const dist = (b, x, y, z) => { let d = Infinity; for (const [a, f] of b.trozos) d = Math.min(d, dSeg(x, y, z, a, f)); return b.pierna && y > yP ? d * (1 + 2 * (y - yP) / bandaP) : d; };
  for (let v = 0; v < n; v++) { const x = pos[3 * v], y = pos[3 * v + 1], z = pos[3 * v + 2]; for (let b = 0; b < nb; b++) D[v * nb + b] = permitido(B[b], x, y) ? dist(B[b], x, y, z) : Infinity; }
  // el grosor de cada parte: la mediana de la distancia de los puntos que tiene más cerca
  const grupos = B.map(() => []); for (let v = 0; v < n; v++) { let m = 0; for (let b = 1; b < nb; b++) if (D[v * nb + b] < D[v * nb + m]) m = b; grupos[m].push(D[v * nb + m]); }
  const R = grupos.map(g => { if (!g.length) return 0.02 * H; g.sort((a, b) => a - b); return Math.max(0.012 * H, g[g.length >> 1]); }); if (o.radios) o.radios.push(...R);
  // reparto: el más cercano (en grosores) y sus vecinos, con caída fuerte
  const W = new Float32Array(n * nb), p = o.potencia || 6;
  for (let v = 0; v < n; v++) { let m = 0; for (let b = 1; b < nb; b++) if (D[v * nb + b] / R[b] < D[v * nb + m] / R[m]) m = b; const dm = D[v * nb + m] / R[m]; let s = 0;
    for (const b of VECINOS[m]) { const d = D[v * nb + b] / R[b]; if (!isFinite(d)) continue; const w = Math.pow(Math.max(dm, 1e-6) / Math.max(d, 1e-6), p); W[v * nb + b] = w; s += w; }
    for (let b = 0; b < nb; b++) W[v * nb + b] /= s || 1; }
  // suavizado por la malla (los vecinos de verdad: los de los triángulos)
  const vec = vecinos(idx, n); suaviza(W, nb, vec, o.pasadas ?? 10, 0.5, /* (10 pasadas: la ingle y el sobaco se estiran repartido; con 3, hasta un 94 %) */ (v, b) => isFinite(D[v * nb + b]));
  return top4(W, nb, n);
}
function vecinos(idx, n, pares) {
  const L = Array.from({ length: n }, () => new Set()); for (let q = 0; q < idx.length; q += 3) { const a = idx[q], b = idx[q + 1], c = idx[q + 2]; L[a].add(b).add(c); L[b].add(a).add(c); L[c].add(a).add(b); }
  if (pares) for (let q = 0; q + 1 < pares.length; q += 2) { const a = pares[q], b = pares[q + 1]; if (a < n && b < n && a !== b) { L[a].add(b); L[b].add(a); } }
  const off = new Uint32Array(n + 1); L.forEach((s, i) => { off[i + 1] = off[i] + s.size; }); const lst = new Uint32Array(off[n]); L.forEach((s, i) => { let k = off[i]; s.forEach(j => { lst[k++] = j; }); }); return { off, lst };
}
function suaviza(W, nb, { off, lst }, pasadas, lam, vale) {
  const n = off.length - 1, T2 = new Float32Array(W.length);
  for (let it = 0; it < pasadas; it++) { for (let v = 0; v < n; v++) { const k0 = off[v], k1 = off[v + 1], m = k1 - k0; for (let b = 0; b < nb; b++) { let s = 0; for (let k = k0; k < k1; k++) s += W[lst[k] * nb + b]; T2[v * nb + b] = m ? (1 - lam) * W[v * nb + b] + lam * s / m : W[v * nb + b]; } }
    W.set(T2); }
  if (vale) for (let v = 0; v < n; v++) for (let b = 0; b < nb; b++) if (!vale(v, b)) W[v * nb + b] = 0; // (lo prohibido, otra vez a cero)
}
function top4(W, nb, n) {
  const I = new Uint8Array(4 * n), w = new Float32Array(4 * n);
  for (let v = 0; v < n; v++) { const L = []; for (let b = 0; b < nb; b++) if (W[v * nb + b] > 0.01) L.push([b, W[v * nb + b]]); L.sort((a, c) => c[1] - a[1]); const s = L.slice(0, 4).reduce((a, c) => a + c[1], 0) || 1;
    L.slice(0, 4).forEach(([b, x], k) => { I[4 * v + k] = b; w[4 * v + k] = x / s; }); if (!L.length) { I[4 * v] = 0; w[4 * v] = 1; } }
  return { I, w };
}

// ---------- la PRENDA, enganchada a la piel que tiene debajo ----------
// posT = puntos de la tela (cosida, quieta), posC / PC = piel y sus pesos, tris / pares = la malla de la tela (para suavizar)
export function pesosTela(posT, posC, PC, E, o = {}) {
  const nb = E.B.length, n = posT.length / 3, nc = posC.length / 3, H = E.H, c = 25, mapa = new Map(), key = (i, j, k) => ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512);
  for (let v = 0; v < nc; v++) { const k = key(Math.floor(posC[3 * v] / c), Math.floor(posC[3 * v + 1] / c), Math.floor(posC[3 * v + 2] / c)); let l = mapa.get(k); if (!l) mapa.set(k, l = []); l.push(v); }
  const W = new Float32Array(n * nb), yEntre = E.B[0].p[1] - 0.03 * H, mezcla = { [HU.cadera]: 0.5, [HU.muslo_i]: 0.25, [HU.muslo_d]: 0.25 };
  let lejos = 0;
  for (let v = 0; v < n; v++) { const x = posT[3 * v], y = posT[3 * v + 1], z = posT[3 * v + 2], i0 = Math.floor(x / c), j0 = Math.floor(y / c), k0 = Math.floor(z / c); let best = -1, bd = Infinity;
    for (let r = 0; r <= 8; r++) { for (let i = i0 - r; i <= i0 + r; i++) for (let j = j0 - r; j <= j0 + r; j++) for (let k = k0 - r; k <= k0 + r; k++) { if (Math.max(Math.abs(i - i0), Math.abs(j - j0), Math.abs(k - k0)) !== r) continue; const l = mapa.get(key(i, j, k)); if (!l) continue;
        for (const u of l) { const d = Math.hypot(posC[3 * u] - x, posC[3 * u + 1] - y, posC[3 * u + 2] - z); if (d < bd) { bd = d; best = u; } } }
      if (best >= 0 && bd <= r * c) break; }
    if (best < 0) { lejos++; W[v * nb] = 1; continue; }
    for (let k = 0; k < 4; k++) { const w = PC.w[4 * best + k]; if (w) W[v * nb + PC.I[4 * best + k]] += w; }
    // lo SUELTO por debajo de la entrepierna (falda, vestido, abrigo): una parte, a la cadera y a los dos muslos
    if (y < yEntre && bd > 15) { const f = 0.75 * suave((bd - 15) / 60); for (let b = 0; b < nb; b++) W[v * nb + b] *= 1 - f; for (const b in mezcla) W[v * nb + +b] += f * mezcla[b]; } }
  if (o.tris) suaviza(W, nb, vecinos(o.tris, n, o.pares), o.pasadas ?? 6, 0.5);
  const R = top4(W, nb, n); R.lejos = lejos; return R;
}

// ---------- el PASO de modelo ----------
export const PASO = { v: 950, Tc: 1.0, beta: 0.6 }; // velocidad (mm/s), segundos por zancada (2 pasos), parte de la zancada con el pie en el suelo
// s = { phi (0–1, la zancada; 0 = apoya el talón izquierdo), a (0 quieta … 1 andando), posa (0–1) } → { R (9 por hueso), T (3), P (juntas), Q (giros) }
export function pose(E, s = {}) {
  const B = E.B, nb = B.length, H = E.H, a = s.a ?? 0, ph = s.phi || 0, pz = s.posa || 0, S2 = 2 * Math.PI * ph;
  const Ql = B.map(() => Q.id()), Qw = new Array(nb), P = new Array(nb), mundo = new Array(nb).fill(null);
  // la CADERA: se balancea hacia el pie que pisa, sube de ese lado, gira con la pierna que avanza; baja un poco al andar (las rodillas, sueltas)
  const yaw = -7 * G * Math.cos(S2) * a + 6 * G * pz, roll = 6 * G * Math.sin(S2) * a - 5 * G * pz, tilt = 3 * G * a;
  const t0 = [0.022 * H * Math.sin(S2) * a - 0.018 * H * pz, a * (0.008 * H * Math.cos(4 * Math.PI * (ph - 0.3)) - 0.035 * H) - (1 - a) * 0.006 * H, 0];
  Ql[0] = Q.mul(Q.mul(Q.y(yaw), Q.z(roll)), Q.x(tilt));
  // la COLUMNA, al revés (los hombros contra la cadera) · el cuello y la cabeza, firmes y mirando al frente
  Ql[HU.lumbar] = Q.mul(Q.mul(Q.y(-0.5 * yaw), Q.z(-0.4 * roll)), Q.x(-0.8 * tilt)); Ql[HU.dorsal] = Q.mul(Q.y(-0.5 * yaw), Q.z(-0.4 * roll)); Ql[HU.pecho] = Q.mul(Q.y(-0.6 * yaw), Q.z(-0.4 * roll));
  // los BRAZOS: bajan del maniquí en A (unos 30°), se balancean al revés que las piernas y el codo se suelta (más doblado al ir delante)
  for (const [s, lado, ff] of [['i', 1, 0], ['d', -1, 0.5]]) { const d = 13 * G * Math.cos(2 * Math.PI * (ph + ff)) * a + 3 * G * pz;
    Ql[HU['brazo_' + s]] = Q.mul(Q.x(d), Q.z(-lado * 30 * G)); Ql[HU['antebrazo_' + s]] = Q.x(24 * G + 0.6 * Math.min(0, d)); }
  // FK hasta el pecho, para la cabeza
  const fk = b => { const x = B[b]; if (x.padre < 0) { Qw[b] = Ql[b]; P[b] = add(x.p, t0); return; } const pq = Qw[x.padre]; Qw[b] = mundo[b] || Q.mul(pq, Ql[b]); P[b] = add(P[x.padre], Q.rota(pq, x.o)); };
  for (let b = 0; b <= HU.pecho; b++) fk(b);
  const mira = Q.x(1.5 * G * a); Ql[HU.cuello] = Q.slerp(Q.id(), Q.mul(Q.inv(Qw[HU.pecho]), mira), 0.5); fk(HU.cuello); Ql[HU.cabeza] = Q.mul(Q.inv(Qw[HU.cuello]), mira); fk(HU.cabeza);
  for (let b = HU.cabeza + 1; b < HU.muslo_i; b++) fk(b);
  // las PIERNAS con IK: el tobillo donde toca; el pie, plano en el suelo, con el talón arriba al despegar
  const objetivos = {};
  for (const [s, lado, ff] of [['i', 1, 0], ['d', -1, 0.5]]) {
    const F = E.pies[s], u0 = (ph + ff) % 1, beta = PASO.beta, Sz = PASO.v * PASO.Tc * a; let z, alto = 0, p;
    if (u0 < beta) { z = Sz * beta / 2 - Sz * u0; p = u0 < 0.08 ? -7 * G * (1 - u0 / 0.08) : u0 > 0.55 * beta ? 32 * G * suave((u0 - 0.55 * beta) / (0.45 * beta)) : 0; }
    else { const u = (u0 - beta) / (1 - beta); z = -Sz * beta / 2 + Sz * beta * suave(u); alto = 0.03 * H * Math.pow(Math.sin(Math.PI * u), 1.2) * a; p = (32 + (-7 - 32) * suave(u)) * G; }
    p *= a;
    // dónde va el pie: en línea al andar (casi en el centro), algo abierto quieta; posando, el izquierdo delante y abierto
    const xo = lado * (0.05 * H + (0.018 * H - 0.05 * H) * a) + pz * (lado > 0 ? 0.028 * H : -0.01 * H), zo = pz * (lado > 0 ? 0.05 * H : -0.012 * H);
    const tob = [xo, F.tobillo[1] + alto, F.tobillo[2] + z + zo], bola = add(tob, sub(F.bola, F.tobillo));
    let A; if (p > 0) { const r = sub(F.tobillo, F.bola); A = add(bola, Q.rota(Q.x(p), r)); } else { A = tob.slice(); A[1] += 0.035 * H * Math.sin(-p); } /* (punta arriba: gira en el talón) */
    objetivos[s] = A;
    const m = HU['muslo_' + s], k = HU['pierna_' + s], pi = HU['pie_' + s], de = HU['dedos_' + s];
    const cad = P[0], Hp = add(cad, Q.rota(Qw[0], B[m].o)); let d = sub(A, Hp), dist = largo(d); const Lmax = F.L1 + F.L2 - 0.5, Lmin = Math.abs(F.L1 - F.L2) + 1;
    if (dist > Lmax) { d = esc(d, Lmax / dist); dist = Lmax; } if (dist < Lmin) { d = esc(d, Lmin / dist); dist = Lmin; }
    const dir = esc(d, 1 / dist), pol0 = Q.rota(Q.y(yaw), uni([lado * 0.12, 0, 1])), perp = uni(sub(pol0, esc(dir, dot(pol0, dir)))), aa = (F.L1 * F.L1 - F.L2 * F.L2 + dist * dist) / (2 * dist), hh = Math.sqrt(Math.max(0, F.L1 * F.L1 - aa * aa));
    const K = add(Hp, add(esc(dir, aa), esc(perp, hh))), Ap = add(Hp, d);
    const [e1, e2] = base(sub(B[k].p, B[m].p), [0, 0, 1]), [f1, f2] = base(sub(K, Hp), perp); mundo[m] = deBases(e1, e2, f1, f2);
    const [g1, g2] = base(sub(B[pi].p, B[k].p), [0, 0, 1]), [h1, h2] = base(sub(Ap, K), perp); mundo[k] = deBases(g1, g2, h1, h2);
    const abre = Q.y(lado * 6 * G); mundo[pi] = Q.mul(abre, Q.x(p)); mundo[de] = p > 0 ? Q.mul(abre, Q.x(0.3 * p)) : mundo[pi]; /* (los dedos, casi planos: doblan en la bola) */
    [m, k, pi, de].forEach(fk);
  }
  for (let b = 0; b < nb; b++) if (!Qw[b]) fk(b);
  // R y T de cada hueso: piel' = R · piel + T (T = P − R · junta de reposo)
  const R = new Float64Array(9 * nb), T = new Float64Array(3 * nb);
  for (let b = 0; b < nb; b++) { const m = Q.mat(Qw[b]); R.set(m, 9 * b); const p0 = B[b].p; T[3 * b] = P[b][0] - (m[0] * p0[0] + m[1] * p0[1] + m[2] * p0[2]); T[3 * b + 1] = P[b][1] - (m[3] * p0[0] + m[4] * p0[1] + m[5] * p0[2]); T[3 * b + 2] = P[b][2] - (m[6] * p0[0] + m[7] * p0[1] + m[8] * p0[2]); }
  return { R, T, P, Q: Qw, objetivos };
}
// la PIEL (o la tela) en esa postura: out = Σ w · (R · reposo + T)
export function piel(rest, W, ps, out) {
  const { I, w } = W, R = ps.R, T = ps.T, n = rest.length / 3;
  for (let v = 0; v < n; v++) { const x = rest[3 * v], y = rest[3 * v + 1], z = rest[3 * v + 2]; let ox = 0, oy = 0, oz = 0;
    for (let k = 0; k < 4; k++) { const ww = w[4 * v + k]; if (!ww) continue; const b = I[4 * v + k], r = 9 * b, t = 3 * b;
      ox += ww * (R[r] * x + R[r + 1] * y + R[r + 2] * z + T[t]); oy += ww * (R[r + 3] * x + R[r + 4] * y + R[r + 5] * z + T[t + 1]); oz += ww * (R[r + 6] * x + R[r + 7] * y + R[r + 8] * z + T[t + 2]); }
    out[3 * v] = ox; out[3 * v + 1] = oy; out[3 * v + 2] = oz; }
  return out;
}
// la matriz 4×4 (por columnas, la de three.js) de un hueso: para el pelo y los ojos, que van con la cabeza
export function matriz(ps, b) { const R = ps.R, T = ps.T, r = 9 * b, t = 3 * b; return [R[r], R[r + 3], R[r + 6], 0, R[r + 1], R[r + 4], R[r + 7], 0, R[r + 2], R[r + 5], R[r + 8], 0, T[t], T[t + 1], T[t + 2], 1]; }

// ---------- el PROGRAMA del desfile (en bucle) ----------
// sale → desfila → frena → POSA → se gira → vuelve → se gira. o = { desde (z de salida, mm), largo (mm), posa (s) }
export function programa(o = {}) {
  const v = o.v || PASO.v, L = o.largo || 3000, z0 = o.desde ?? -2400, rampa = 0.6, crucero = Math.max(0, (L - v * rampa) / v), posa = o.posa ?? 1.6, giro = 1.2, PI = Math.PI;
  const SEG = [['sale', rampa, 0, 1, 0, 0], ['anda', crucero, 1, 1, 0, 0], ['frena', rampa, 1, 0, 0, 0], ['posa', posa, 0, 0, 0, 0], ['gira', giro, 0.35, 0.35, 0, PI],
    ['sale', rampa, 0, 1, PI, PI], ['anda', crucero, 1, 1, PI, PI], ['frena', rampa, 1, 0, PI, PI], ['gira', giro, 0.35, 0.35, PI, 2 * PI]];
  const dt = 1 / 120, tabla = []; let z = z0, x = 0, t = 0;
  for (const [k, dur, a0, a1, y0, y1] of SEG) { const N = Math.max(1, Math.round(dur / dt)); for (let i = 0; i < N; i++) { const u = i / N, a = a0 + (a1 - a0) * suave(u), yaw = y0 + (y1 - y0) * suave(u), pz = k === 'posa' ? suave(u / 0.25) * suave((1 - u) / 0.25) : 0;
      tabla.push({ t, z, x, yaw: yaw % (2 * PI), a, posa: pz, fase: k }); const sp = k === 'gira' ? 0 : v * a; z += sp * dt * Math.cos(yaw); x += sp * dt * Math.sin(yaw); t += dt; } }
  const dur = t;
  return { dur, desde: z0, hasta: z0 + L, en(tt) { tt = ((tt % dur) + dur) % dur; const i = Math.min(tabla.length - 1, Math.floor(tt / dt)), A = tabla[i], B2 = tabla[Math.min(tabla.length - 1, i + 1)], f = (tt - A.t) / dt;
      const yaw = Math.abs(B2.yaw - A.yaw) > PI ? A.yaw : A.yaw + (B2.yaw - A.yaw) * f;
      return { z: A.z + (B2.z - A.z) * f, x: A.x + (B2.x - A.x) * f, yaw, a: A.a + (B2.a - A.a) * f, posa: A.posa + (B2.posa - A.posa) * f, fase: A.fase, phi: (tt / PASO.Tc) % 1 }; } };
}
