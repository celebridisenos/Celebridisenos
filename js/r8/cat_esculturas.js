// ================= v30.4 · 🗿 ESCULTURAS DE LAS FOTOS DE LA DUEÑA: la mano titiritera y la chica en el columpio de la luna =================
// Estilo «maniquí» liso (como sus fotos): formas que se funden (sdf.js) con proporciones humanas medidas (mano de 180 mm, cuerpo de
// 1,70 m) y luego se escalan. Lo que no es orgánico (hilos, cuerdas, peana) se hace con piezas exactas. Una sola pieza: la marioneta
// cuelga de sus hilos y la chica toca la hierba con la punta del pie. Se imprimen DE PIE con soportes de árbol (como las de la foto).
import * as N from './nucleo.js';
import * as S from './sdf.js';
import { rectR } from './motor.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const M = () => N.MF();
const rr = (w, h, r = 0) => N.cs([N.ccw(rectR(w, h, r))], 'Positive');
const R2 = Math.PI / 180;
const sum = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// cilindro entre dos puntos (hilos, cuerdas)
function barra(a, b, r, lados = 12) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d); if (L < 1e-6) return M().sphere(r, lados);
  const ay = Math.atan2(Math.hypot(d[0], d[1]), d[2]) / R2, az = Math.atan2(d[1], d[0]) / R2;
  return M().cylinder(L, r, r, lados).rotate([0, ay, 0]).rotate([0, 0, az]).translate(a);
}
// unión SUAVE con «cajas» de cada forma: lejos de una forma no se calcula (así va 5–10 veces más rápido)
function fundidas(k, L) { // L = [[f, centro, radio que la contiene]]
  return p => { let m = -Infinity; for (const [f, c0, r] of L) { const dx = p[0] - c0[0], dy = p[1] - c0[1], dz = p[2] - c0[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) - r; if (-d < m - k) continue; const v = f(p); if (m === -Infinity) m = v; else { const h = Math.max(k - Math.abs(m - v), 0) / k; m = Math.max(m, v) + h * h * k * 0.25; } } return m; };
}
const cap = (a, b, ra, rb = ra) => [S.capsula(a, b, ra, rb), mul(sum(a, b), 0.5), Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2 + Math.max(ra, rb)];
const eli = (c0, r) => [S.elipsoide(c0, r), c0, Math.max(...r)];

// ---------- MANO (derecha, palma abajo, dedos hacia −X, pulgar hacia −Y). Unidades de una mano real de 180 mm; muñeca en 0 ----------
const DEDOS = { // nudillo, abertura (°), largos de falanges, radio de la base
  indice: { k: [-95, -29, 2], a: -15, L: [37, 22, 17], r: 8.6 }, medio: { k: [-100, -9, 3], a: -4, L: [41, 26, 18], r: 9.0 },
  anular: { k: [-97, 11, 2], a: 9, L: [39, 24, 17], r: 8.5 }, menique: { k: [-88, 29, 0], a: 22, L: [31, 18, 15], r: 7.3 }
};
function dedo(D, flex) { // puntos de las articulaciones, doblando hacia abajo
  const P = [D.k], a = D.a * R2; let phi = 0;
  D.L.forEach((l, i) => { phi += flex[i] * R2; const d = [-Math.cos(a) * Math.cos(phi), Math.sin(a) * Math.cos(phi), -Math.sin(phi)]; P.push(sum(P[i], mul(d, l))); });
  return P;
}
function mano(flex = [10, 22, 16]) {
  const F = [], puntos = {};
  F.push(eli([-50, 0, 0], [55, 44, 15]), eli([-14, 0, 0], [30, 33, 17]), cap([-90, -30, 2], [-88, 28, 1], 12.5), eli([22, 0, 1], [36, 31, 19]), eli([62, 0, 1], [44, 30, 19]));
  for (const [nm, D] of Object.entries(DEDOS)) {
    const P = dedo(D, flex), r = [D.r, D.r * 0.9, D.r * 0.8, D.r * 0.7]; puntos[nm] = P;
    for (let i = 0; i < 3; i++) F.push(cap(P[i], P[i + 1], r[i], r[i + 1]));
    F.push(eli(sum(P[0], [0, 0, D.r * 0.55]), [D.r * 0.9, D.r * 0.85, D.r * 0.5])); // nudillo
    const u = sum(mul(P[2], 0.35), mul(P[3], 0.65)); F.push(eli(sum(u, [0, 0, r[3] * 0.72]), [D.L[2] * 0.36, r[3] * 0.72, 1.6])); // uña
  }
  const T = [[-25, -34, -4], [-48, -52, -9], [-70, -62, -14], [-90, -66, -18]]; puntos.pulgar = T;
  F.push(cap(T[0], T[1], 13, 11), cap(T[1], T[2], 10, 9), cap(T[2], T[3], 9, 7.2), eli(sum(sum(mul(T[2], 0.35), mul(T[3], 0.65)), [0, -1, 5.5]), [7, 5.5, 1.6]));
  const nPalma = 5, palma = fundidas(7, F.slice(0, nPalma)), grupos = []; let i = nPalma;
  for (const nm of Object.keys(DEDOS)) { grupos.push(fundidas(3, F.slice(i, i + 5))); i += 5; } grupos.push(fundidas(3, F.slice(i)));
  const f = q => { let m = palma(q); for (const g of grupos) { const v = g(q); const h = Math.max(6 - Math.abs(m - v), 0) / 6; m = Math.max(m, v) + h * h * 6 * 0.25 * (v > -6 ? 1 : 0); } return m; }, corte = p => Math.min(f(p), 92 - p[0]); // el antebrazo termina plano (entra en la peana)
  return { f: corte, puntos };
}
// ---------- MARIONETA (maniquí de 1,70 m), boca arriba, la espalda arqueada; la cabeza hacia +X ----------
function marioneta(v) {
  const F = [], A = v.brazos, Lg = v.piernas; void Lg;
  F.push(eli([0, 0, 0], [115, 160, 100]), eli([180, 0, 18], [125, 128, 85]), eli([370, 0, 28], [170, 150, 102]));
  F.push(cap([450, -150, 22], [450, 150, 22], 55)); // hombros
  F.push(cap([520, 0, 12], [600, 0, -28], 46), eli([690, 0, -62], [112, 74, 92]), eli([745, 0, -40], [40, 30, 34])); // cuello, cabeza, barbilla
  [-1, 1].forEach(sy => { // brazos colgando, algo abiertos
    const h = [450, sy * 188, 12], co = [395 + sy * 10, sy * (232 + A * 20), -250], mu = [345, sy * (255 + A * 30), -495], de = [318, sy * (262 + A * 32), -670];
    F.push(cap(h, co, 50, 39), cap(co, mu, 37, 26), cap(mu, de, 25, 18), eli(sum(mul(mu, 0.45), mul(de, 0.55)), [36, 16, 50]));
  });
  // piernas: la izquierda (+Y) estirada y la derecha (−Y) doblada, colgando
  const ca = [-20, 92, -12], ro = [-430, 112, -70], to = [-835, 122, -170], pie = [-905, 126, -350];
  const caD = [-20, -92, -12], roD = [-380, -118, -10], toD = [-700, -124, -260], pieD = [-735, -126, -460];
  F.push(cap(ca, ro, 86, 56), cap(ro, to, 54, 33), cap(to, pie, 34, 22), cap(caD, roD, 86, 56), cap(roD, toD, 54, 33), cap(toD, pieD, 34, 22));
  return fundidas(30, F);
}

function titiritero(p) {
  const s = p.mano / 180, sf = p.figura / 1700, Hh = p.alto - 18, xw = 0; // muñeca en (0, 0, Hh)
  const H = mano(), fh = q => H.f([(q[0] - xw) / s, q[1] / s, (q[2] - Hh) / s]) * s;
  const cf = [xw - 0.42 * p.mano, 0, Hh - p.caida], fig = marioneta({ brazos: 0, piernas: 0 }), ff = q => fig([(q[0] - cf[0]) / sf, (q[1] - cf[1]) / sf, (q[2] - cf[2]) / sf]) * sf;
  const paso = p.detalle === 'fino' ? 0.55 : 0.8;
  const manoM = S.malla(fh, { min: [xw - 200 * s, -80 * s, Hh - 60 * s], max: [xw + 95 * s, 80 * s, Hh + 25 * s] }, paso * 1.15);
  const figM = S.malla(ff, { min: [cf[0] - 960 * sf, -340 * sf, cf[2] - 720 * sf], max: [cf[0] + 820 * sf, 340 * sf, cf[2] + 140 * sf] }, paso * 0.8);
  // HILOS como en la foto: rectos y paralelos, desde muchos puntos de la parte de abajo de los dedos y la palma, hasta la marioneta
  const hilos = [], rH = p.hilo / 2, sep = Math.max(3.4, p.hilo * 2.6);
  for (let x = xw - 195 * s; x < xw + 10 * s; x += sep) for (let y = -60 * s; y <= 60 * s; y += sep * 0.8) {
    let z = Hh + 20 * s; while (z > Hh - 60 * s && fh([x, y, z]) <= 0) z -= 0.6; if (z <= Hh - 60 * s) continue; // no hay mano encima
    while (fh([x, y, z]) > 0) z -= 0.25; const zTop = z + 1.0; let zb = z - 2;
    while (zb > 6 && ff([x, y, zb]) <= -1) zb -= 0.8; while (zb > 6 && ff([x, y, zb]) <= 0) zb -= 0.2; if (zb <= 6) continue; // debajo no hay marioneta
    if (hilos.some(([x0, y0]) => Math.hypot(x0 - x, y0 - y) < sep)) continue; hilos.push([x, y, zb - 0.9, zTop]);
  }
  const H2 = hilos.filter((h, i) => i % Math.max(1, Math.round(hilos.length / p.nhilos)) === 0);

  let m = manoM.add(figM).add(N.union(H2.map(([x, y, z0, z1]) => M().cylinder(z1 - z0, rH, rH, 10).translate([x, y, z0]))));
  // PEANA en L: columna detrás de la muñeca, brazo que entra en ella y un marco en el suelo que llega bajo la marioneta
  const cw = Math.max(10, 12 * s / 0.7), xc = xw + 90 * s + cw / 2 - 2, alto = Hh + 22 * s;
  m = m.add(M().cube([cw, cw * 1.2, alto]).translate([xc - cw / 2, -cw * 0.6, 0]));
  m = m.add(M().cube([cw + 10 * s, cw * 1.6, 24 * s]).translate([xc - cw / 2 - 10 * s, -cw * 0.8, Hh - 10 * s]));
  const x0 = cf[0] - 900 * sf * 0.75, x1 = xc + cw / 2, w = 10, yb = 34 * Math.max(1, p.mano / 120);
  const marco = rr(x1 - x0, 2 * yb, 4).subtract(rr(x1 - x0 - 2 * w, 2 * yb - 2 * w, 2)).translate([(x0 + x1) / 2, 0]).add(rr(cw + 6, 2 * yb, 3).translate([xc, 0]));
  m = m.add(marco.extrude(5));
  return m;
}

// ---------- 🌙 LA CHICA EN EL COLUMPIO DE LA LUNA (unidades de una mujer de 1,65 m; la punta de abajo de la luna en 0) ----------
const nrm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
function chica(pelo) {
  const F = [], Se = [-630, 0, -900], t = nrm([-0.5, 0, 0.866]), at = k => sum(Se, mul(t, k));
  const W = at(180), C = at(360), Sh = at(470), N0 = at(520), fr = nrm([0.866, 0, 0.5]); // fr: hacia delante del pecho
  F.push(eli(sum(Se, [25, 0, 8]), [118, 148, 88]), cap(Se, W, 118, 102), cap(W, C, 102, 122), cap(sum(Sh, [0, -150, 0]), sum(Sh, [0, 150, 0]), 62)); // cadera, cintura, pecho, hombros
  [-1, 1].forEach(sy => F.push(eli(sum(sum(C, mul(fr, 92)), [0, sy * 68, -20]), [58, 58, 58]))); // pecho
  const dm = nrm([0.96, 0, -0.13]); F.push(eli(sum(Se, mul(dm, 150)), [200, 168, 92])); // falda del vestido corto, que tapa medio muslo
  const N1 = sum(N0, mul(nrm([-0.7, 0, 0.71]), 95)), up = nrm([-0.3, 0, 0.95]), fa = nrm([0.95, 0, 0.3]), Hc = sum(N1, mul(up, 105));
  F.push(cap(N0, N1, 48, 44), eli(Hc, [100, 76, 110]), eli(sum(sum(Hc, mul(fa, 62)), mul(up, -70)), [48, 40, 40])); // cuello, cabeza, barbilla
  F.push(cap(sum(sum(Hc, mul(fa, 92)), mul(up, 8)), sum(sum(Hc, mul(fa, 112)), mul(up, -22)), 14, 9)); // nariz
  // pelo largo: casquete y mechones que caen por la espalda (con onda)
  F.push(eli(sum(sum(Hc, mul(fa, -18)), mul(up, 18)), [112, 86, 116]));
  [-62, -22, 22, 62].forEach((yy, i) => { const a = sum(sum(Hc, mul(fa, -70)), [0, yy, 20]), b = sum(a, [-34 - (i % 2) * 10, yy * 0.15, -150]), c2 = sum(b, [-12, yy * 0.1, -170 * pelo]), d = sum(c2, [6 + (i % 2) * 10, 0, -140 * pelo]); F.push(cap(a, b, 58, 48), cap(b, c2, 48, 36), cap(c2, d, 36, 14)); });
  // brazos hasta las cuerdas
  const manos = [-1, 1].map(sy => { const sh = sum(Sh, [0, sy * 165, 0]), hd = [-291, sy * 72, -499], el = sum(mul(sum(sh, hd), 0.5), [0, sy * 15, -45]); F.push(cap(sh, el, 46, 37), cap(el, hd, 36, 26), eli(hd, [42, 36, 42])); return hd; });
  // piernas: la de delante estirada (+Y) y la de atrás doblada con la punta en la hierba (−Y)
  const h1 = [-630, 85, -905], k1 = sum(h1, mul([Math.cos(10 * R2), 0, Math.sin(10 * R2)], 420)), a1 = sum(k1, mul([Math.cos(15 * R2), 0, Math.sin(15 * R2)], 400)), t1 = sum(a1, [195, 0, -12]);
  const h2 = [-630, -85, -905], k2 = sum(h2, mul([Math.cos(-25 * R2), 0, Math.sin(-25 * R2)], 420)), a2 = sum(k2, [70, 0, -394]), t2 = sum(a2, [66, 0, -178]);
  F.push(cap(h1, k1, 86, 56), cap(k1, a1, 54, 31), cap(a1, t1, 31, 15), cap(h2, k2, 86, 56), cap(k2, a2, 54, 31), cap(a2, t2, 31, 13));
  return { f: fundidas(26, F), manos, punta: t2 };
}
// cuerda de 3 cabos retorcidos entre a y b
function cuerda(a, b, r, paso) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), ra = r * 0.56, cs = N.csUnion([0, 1, 2].map(i => N.cs([N.ccw(Array.from({ length: 14 }, (_, k) => [r * 0.47 * Math.cos(i * 2.094) + ra * Math.cos(k / 14 * 6.283), r * 0.47 * Math.sin(i * 2.094) + ra * Math.sin(k / 14 * 6.283)]))], 'Positive')));
  const cue = cs.extrude(L, Math.max(8, Math.round(L / 0.8)), L / paso * 360);
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ay = Math.atan2(Math.hypot(d[0], d[1]), d[2]) / R2, az = Math.atan2(d[1], d[0]) / R2;
  return cue.rotate([0, ay, 0]).rotate([0, 0, az]).translate(a);
}
function columpioLuna(p) {
  const sf = (p.alto - 14) / 2080, Q = q => mul(q, sf); // de unidades de persona a mm (luego se sube sobre la peana)
  const C = chica(p.pelo), f = q => C.f([q[0] / sf, q[1] / sf, q[2] / sf]) * sf;
  const paso = p.detalle === 'fino' ? 0.5 : 0.68;
  let cuerpo = S.malla(f, { min: Q([-1250, -300, -1700]), max: Q([450, 300, -150]) }, paso);
  // LO QUE CUELGA (piezas exactas): su punto de atar en el origen, de donde salen las cuerdas
  const abombado = (cs, T) => { const m1 = cs.extrude(T / 2, 0, 0, [0.72, 0.72]); return m1.add(m1.mirror([0, 0, 1])).rotate([90, 0, 0]); }; // 2D (x, z), grosor en Y con bisel
  const atar = (cs, pt) => cs.translate([-pt[0], -pt[1]]);
  let luna;
  if (p.cuelga === 'luna') { const R1 = 265 * sf, c1 = [185 * sf, 0, 215 * sf], o = mul(nrm([-0.62, 0, 0.78]), 118 * sf), R2b = 246 * sf; luna = M().sphere(R1, 72).scale([1, 0.42, 1]).translate(c1).subtract(M().sphere(R2b, 72).scale([1, 0.6, 1]).translate(sum(c1, o))); }
  else if (p.cuelga === 'corazon') { let h = N.cs([N.ccw(N.corazon2(420 * sf))], 'Positive').rotate(-35); const P = h.toPolygons()[0]; let lo = P[0]; P.forEach(q => { if (q[1] < lo[1]) lo = q; }); luna = abombado(atar(h, lo).offset(-1, 'Round').offset(1, 'Round'), 70 * sf).translate([4 * sf, 0, 6 * sf]); }
  else if (p.cuelga === 'nube') { const r = 95 * sf; let nb = N.csUnion([[0, 0, 1], [1.3, 0.25, 1.15], [2.6, 0.05, 0.95], [0.7, 0.85, 1.05], [1.9, 0.95, 1.2], [3.3, 0.6, 0.8]].map(([x, y, k]) => N.cs([N.ccw(Array.from({ length: 40 }, (_, i) => [x * r + r * k * Math.cos(i / 40 * 6.283), y * r + r * k * Math.sin(i / 40 * 6.283)]))], 'Positive'))); nb = nb.rotate(-12); const b2 = N.cajaCS(nb); luna = abombado(atar(nb, [b2.min[0] + r * 0.9, b2.min[1] + r * 0.35]), 120 * sf); }
  else { // ⭐ estrella fugaz: una punta hacia la cuerda y la estela hacia arriba
    const R = 320 * sf, st = N.cs([N.ccw(N.estrella2(5, R, R * 0.47, 234))], 'Positive').offset(-R * 0.04, 'Round').offset(R * 0.04, 'Round'); const P = st.toPolygons()[0]; let lo = P[0]; P.forEach(q => { if (q[0] + q[1] < lo[0] + lo[1]) lo = q; });
    luna = abombado(atar(st, lo), 95 * sf).translate([3 * sf, 0, 3 * sf]); const c0 = [-lo[0], 0, -lo[1]], dE = nrm([0.8, 0, 0.6]);
    [[-0.24, 1, 30], [0, 1.3, 36], [0.24, 0.95, 28]].forEach(([de, lar, r0]) => { const a0 = sum(c0, [de * R * 0.6 * 0.6, 0, -de * R * 0.6 * 0.8]), b0 = sum(a0, mul(dE, R * 1.6 * lar)); luna = luna.add(M().hull([M().sphere(r0 * sf, 16).scale([1, 0.7, 1]).translate(a0), M().sphere(Math.max(0.8, 8 * sf), 8).translate(b0)])); }); }
  luna = luna.translate(mul(nrm([-0.5, 0, -0.86]), (p.cuelga === 'luna' ? 22 : 34) * sf)); // la punta entra en la cuerda: sale de una pieza
  // CUERDAS: de la punta de la luna, por las manos, hasta debajo del muslo (asiento)
  const rc = 30 * sf, cuerdas = [-1, 1].map(sy => { const top = [8 * sf, sy * 18 * sf, 12 * sf], man = Q(C.manos[sy < 0 ? 0 : 1]), dir = nrm([man[0] - top[0], man[1] - top[1], man[2] - top[2]]), bot = sum(man, mul(dir, 520 * sf)); return cuerda(top, bot, rc, rc * 7); });
  let m = cuerpo.add(luna).add(N.union(cuerdas));
  // sobre la PEANA: la punta del pie entra en un mechón de hierba
  const b = N.caja(m), zt = 14 + 3, tp = Q(C.punta); m = m.translate([0, 0, zt - b.min[2]]); const tpz = [tp[0], tp[1], zt - b.min[2] + tp[2]];
  const wB = p.alto * 0.56, dB = p.alto * 0.36, xB = tp[0] - wB * 0.18;
  let base = N.cs([N.ccw(rectR(wB, dB, 4))], 'Positive').extrude(14).translate([xB, 0, 0]);
  const az = (sem => () => { sem = (sem * 1664525 + 1013904223) % 4294967296; return sem / 4294967296; })(7);
  const hoja = (x, y, h, r, giro, cae) => { const m0 = [x, y, 13.5], m1 = [x + cae * h * 0.25, y, 13.5 + h * 0.55], m2 = [x + cae * h * 0.7, y, 13.5 + h]; const e = q => M().sphere(q, 12).scale([1, 0.5, 1]); return M().hull([e(r).translate(m0), e(r * 0.8).translate(m1)]).add(M().hull([e(r * 0.8).translate(m1), e(Math.max(0.9, r * 0.45)).translate(m2)])).translate([-x, -y, 0]).rotate([0, 0, giro]).translate([x, y, 0]); };
  const hierba = []; for (let i = 0; i < 44; i++) { const x = xB + (az() - 0.5) * wB * 0.7, y = (az() - 0.5) * dB * 0.62, h = 5 + az() * 7, r = 2.6 + az() * 1.6; if (Math.hypot(x - tp[0], y - tp[1]) < 6.5) continue; hierba.push(hoja(x, y, h, r, az() * 180, (az() - 0.5) * 1.4)); }
  hierba.push(M().cylinder(tpz[2] - 13.5 + 1.2, 5.5, 2.6, 16).translate([tp[0], tp[1], 13.5]));
  const tot = m.add(base).add(N.union(hierba)), k = p.alto / N.caja(tot).dims[2]; return tot.scale([k, k, k]); // el alto que se pide, exacto
}

export const DISENOS_ESCULTURAS = {
  titiritero: { cat: 'adultos', tambien: ['deco'], e: '🎭', t: 'Mano titiritera con marioneta', d: 'La mano con sus hilos y la marioneta colgando, sobre peana en L (escultura de escritorio)', uso: 'deco', color: '#f2a7bb', acabado: 'seda', soportes: true, nuevo: true,
    campos: [n('alto', 'Alto', 200, 150, 250, 1), n('mano', 'Largo de la mano', 125, 90, 160, 1), n('figura', 'Largo de la marioneta', 130, 80, 160, 1), n('caida', 'Cuánto cuelga', 88, 60, 130, 1), n('hilo', 'Grosor de los hilos', 1.4, 1, 2.2, 0.1), n('nhilos', 'Hilos (más o menos)', 26, 8, 60, 1, ''), s('detalle', 'Detalle', 'normal', [['normal', 'Normal'], ['fino', 'Fino (tarda más)']])],
    gen: p => titiritero(p), nota: () => 'Se imprime DE PIE con soportes de árbol (la mano y la marioneta vuelan): en Bambu, «Habilitar el soporte», tipo árbol (auto), y relleno 15 %. Los hilos son de 1,4 mm: PLA seda rosa como la foto, a 0,12–0,16 de capa y velocidad baja en la pared exterior. Una sola pieza: la marioneta cuelga de sus hilos.' },
  columpioLuna: { cat: 'adultos', tambien: ['deco', 'regalos'], e: '🌙', t: 'Chica en el columpio de las estrellas', d: 'Se columpia de una estrella fugaz, un corazón, una nube o la luna con cuerdas trenzadas; la punta del pie roza la hierba', uso: 'deco', color: '#f3efe8', acabado: 'mate', soportes: true, nuevo: true,
    campos: [s('cuelga', 'De qué se columpia', 'estrella', [['estrella', '⭐ Estrella fugaz'], ['corazon', '❤️ Corazón'], ['nube', '☁️ Nube'], ['luna', '🌙 Luna']]), n('alto', 'Alto', 230, 160, 250, 1), n('pelo', 'Largo del pelo', 1, 0.6, 1.4, 0.05, '×'), s('detalle', 'Detalle', 'normal', [['normal', 'Normal'], ['fino', 'Fino (tarda más)']])],
    gen: p => columpioLuna(p), nota: () => 'Se imprime DE PIE con soportes de árbol (en Bambu: «Habilitar el soporte», árbol (auto), «Sólo en la placa de impresión» desactivado). PLA blanco mate o «mármol»: queda como la de la foto. Una sola pieza: la chica cuelga de las cuerdas y apoya la punta del pie en la hierba.' }
};
