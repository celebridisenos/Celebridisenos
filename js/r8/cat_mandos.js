// ================= 21-10-2026 · 🎮 SOPORTES PREMIUM PARA EL MANDO (DualSense de PS5 y otros) · placas con silueta + barras =================
// Ella (plan maestro, tarea 26): «no hay soportes de mando Play 5 premium, con formas que la gente quiera comprar».
// Lo que SÍ se sabe del DualSense (ficha de Sony): 160 × 66 × 106 mm y 280 g. Lo que NO publica nadie: la forma exacta de las asas y de
// los gatillos. Por eso el mando NO se encaja por su forma (sería adivinar): va DE PIE sobre sus asas, inclinado hacia atrás, apoyado en
// dos BARRAS abajo, con una barra de LABIO delante y una de RESPALDO detrás; las dos PLACAS de los lados hacen de mejillas.
// Por qué en piezas: las PLACAS se imprimen TUMBADAS (cualquier silueta —garra, ola, ala, colgador— sale SIN soportes y con la cara de
// fuera lisa contra la cama; se pueden hacer de otro color) y las BARRAS, tumbadas sobre su cara plana, entran a presión en huecos ciegos
// (las tolerancias de su Bambu: 0,05 a presión · 0,10 encaja). Montajes: uno, DOBLE en escalera, con COLGADOR DE CASCOS y de PARED.
// Diseño propio (© CelebriDiseños): sin logotipos ni formas de marca.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, tx, M, CS, rr, poli, cil, n2, conBisel } = A;
// las medidas del mando DE PIE: w = ancho (de asa a asa), g = grueso (de delante a atrás), h = alto (de las asas a los gatillos)
export const MANDOS = {
  ps5: { t: 'PS5 · DualSense (y DualSense Edge)', w: 160, g: 66, h: 106, oficial: true },
  ps4: { t: 'PS4 · DualShock 4', w: 162, g: 52, h: 98 },
  xbox: { t: 'Xbox Series', w: 153, g: 64, h: 103 },
  switch: { t: 'Switch Pro', w: 152, g: 60, h: 106 }
};
export const SILUETAS = { minimal: '◼️ Minimal (curva limpia)', ola: '🌊 Ola', garra: '🐉 Garra de dragón', ala: '🪽 Ala' };
export const MONTAJES = { uno: '🎮 Un mando', doble: '🎮🎮 Dos mandos, en escalera', cascos: '🎧 Mando + colgador de cascos', pared: '🧱 De pared (con tornillos)' };
const PL = 10, SD = 6, BW = 12, BH = 9, RB = 2.5, ALTO_CASCOS = 214; // placa: grueso · hueco ciego · barra: ancho × alto, radio · alto del colgador

// ---------- 2D ----------
const circulo = (c, r, k = 40) => Array.from({ length: k }, (_, i) => [c[0] + r * Math.cos(2 * Math.PI * i / k), c[1] + r * Math.sin(2 * Math.PI * i / k)]);
const bez = (a, b, c, d, k = 24) => Array.from({ length: k + 1 }, (_, i) => { const t = i / k, u = 1 - t; return [0, 1].map(j => u * u * u * a[j] + 3 * u * u * t * b[j] + 3 * u * t * t * c[j] + t * t * t * d[j]); });
// un TRAZO que adelgaza (de w0 a w1) a lo largo de la curva P: un pétalo, una uña, una pluma
function trazo(P, w0, w1) { const L = [], R = [];
  P.forEach((p, i) => { const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], tx_ = q[0] - o[0], ty = q[1] - o[1], l = Math.hypot(tx_, ty) || 1, w = (w0 + (w1 - w0) * (i / (P.length - 1)) ** 0.9) / 2;
    L.push([p[0] - ty / l * w, p[1] + tx_ / l * w]); R.push([p[0] + ty / l * w, p[1] - tx_ / l * w]); });
  return poli(L.concat(R.reverse())); }
const unir = L => N.csUnion(L.filter(Boolean));
const envolver = L => CS().hull(L);

// ---------- dónde van las BARRAS (vista de lado: u = y, de delante a atrás · v = z, hacia arriba) ----------
export function medidas(p) { const Q = MANDOS[p.mando] || MANDOS.ps5, hg = Math.max(0.5, +p.holgura || 1.5), a = Math.max(8, Math.min(25, +p.angulo || 16)), aj = p.ajuste === 'presion' ? 0.05 : 0.10;
  return { Q, hg, a, aj, Wi: Q.w + 2 * hg, mont: p.montaje || 'uno', sil: p.silueta || 'minimal' }; }
// un ASIENTO: las 4 barras de un mando (en su sitio del mando: y de delante (0) a atrás (g), z de las asas (0) a los gatillos (h)), inclinado «a»
function asiento(R, du = 0, dv = 0) { const { Q, a } = R, ca = Math.cos(a * Math.PI / 180), sa = Math.sin(a * Math.PI / 180), w = (y, z) => [y * ca + z * sa + du, -y * sa + z * ca + dv];
  const B = [{ k: 'suelo1', l: [Q.g * 0.25, -BH / 2 - 1.2] }, { k: 'suelo2', l: [Q.g * 0.75, -BH / 2 - 1.2] }, { k: 'labio', l: [-BW / 2 - 1.2, 10] }, { k: 'respaldo', l: [Q.g + BW / 2 + 1.2, Q.h * 0.6] }];
  B.forEach(b => { b.c = w(b.l[0], b.l[1]); });
  return { B, w, a }; }
// todos los asientos del montaje, ya subidos para que lo más bajo quede a 8 mm de la mesa
export function plano(R) { const asis = [asiento(R)];
  if (R.mont === 'doble') { const A0 = asis[0], ymax = Math.max(...A0.B.map(b => b.c[0])), ymin = Math.min(...A0.B.map(b => b.c[0])); asis.push(asiento(R, ymax - ymin + 10, 58)); }
  const vmin = Math.min(...asis.flatMap(x => x.B.map(b => b.c[1] - BH / 2))), dv = 8 - vmin;
  asis.forEach(x => { x.B.forEach(b => { b.c = [b.c[0], b.c[1] + dv]; }); const w0 = x.w; x.w = (y, z) => { const q = w0(y, z); return [q[0], q[1] + dv]; }; });
  const barras = asis.flatMap((x, i) => x.B.map(b => ({ ...b, k: b.k + (asis.length > 1 ? i + 1 : ''), c: b.c, sec: [BW, BH] })));
  const us = barras.map(b => b.c[0]), u0 = Math.min(...us) - 14, u1 = Math.max(...us) + 14;
  if (R.mont === 'pared') barras.push({ k: 'pared', c: [u1 + 4, 40], sec: [12, 56], pared: true });
  const brazo = R.mont === 'cascos' ? { c: [u1 - 22, ALTO_CASCOS], sec: [30, 12] } : null; // el agujero del BRAZO de los cascos (pasa la placa de lado a lado)
  return { asis, barras, u0, u1, brazo };
}

// ---------- la SILUETA de la placa (u, v) ----------
export function silueta(R, P) { let e = R.mont === 'uno' ? 1 : 0.8, X = null;
  for (let k = 0; k < 8; k++, e *= 0.9) { X = silueta1(R, P, e); const b = N.cajaCS(X.S); if (b.w <= 246 && b.h <= 246) break; }
  return X; }
function silueta1(R, P, e) { const { barras, u0, u1, asis } = P, sil = R.sil, h = R.Q.h, g = R.Q.g;
  const pie = poli([[u0, 0], [u1, 0], [u1, 8], [u0, 8]]);
  const cuerpo = envolver([pie].concat(barras.filter(b => b.k !== 'cascos' && !b.pared).map(b => poli(circulo(b.c, Math.max(b.sec[0], b.sec[1]) / 2 + 9)))));
  // las esquinas de ARRIBA del mando (delante y detrás) y las barras del labio y del respaldo: las siluetas se dibujan alrededor
  const A0 = asis[0], AZ = asis[asis.length - 1], TF = A0.w(0, h), TB = AZ.w(g, h), lab = A0.B.find(b => b.k === 'labio').c, res = AZ.B.find(b => b.k === 'respaldo').c;
  const extra = [], trazos = [];
  const T = (P_, w0, w1) => { trazos.push({ P: P_, w0, w1 }); return trazo(P_, w0, w1); };
  if (sil === 'garra') { // la GARRA de lado: tres uñas grandes; la de delante se curva por encima del mando, la del respaldo sube alta, y un espolón atrás
    extra.push(T(bez([lab[0] + 6, 8], [lab[0] - 36 * e, 52 * e], [TF[0] - 20 * e, TF[1] + 28 * e], [TF[0] + 24 * e, TF[1] + 12 * e]), 30, 2.4));
    extra.push(T(bez([res[0] - 2, res[1] - 36], [res[0] + 36 * e, res[1] + 18 * e], [TB[0] + 26 * e, TB[1] + 56 * e], [TB[0] - 18 * e, TB[1] + 44 * e]), 34, 2.8));
    extra.push(T(bez([u1 - 10, 12], [u1 + 32 * e, 16], [u1 + 48 * e, 50 * e], [u1 + 36 * e, 90 * e]), 26, 2.4));
    [[lab[0] + 6, 15], [res[0] + 2, res[1] - 28], [u1 - 4, 17]].forEach(q => extra.push(poli(circulo(q, 15, 40)))); } // los nudillos
  if (sil === 'ola') { // una OLA grande que nace detrás, sube y se RIZA por encima del mando, y otra pequeña delante
    const cima = [TF[0] + 8 * e, TB[1] + 74 * e];
    extra.push(T(bez([u1 - 34, 8], [u1 + 54 * e, 34 * e], [TB[0] + 46 * e, TB[1] + 84 * e], cima), 46, 9));
    extra.push(T(bez(cima, [TF[0] - 20 * e, cima[1] - 12 * e], [TF[0] - 8 * e, cima[1] - 36 * e], [TF[0] + 14 * e, cima[1] - 30 * e]), 9, 3));   // el rizo
    for (let k = 0; k < 4; k++) { const q = bez([u1 - 34, 8], [u1 + 54 * e, 34 * e], [TB[0] + 46 * e, TB[1] + 84 * e], cima, 8)[3 + k], d = 10 + 3 * k; extra.push(T(bez(q, [q[0] + d * 0.4, q[1] + d * 0.6], [q[0] + d * 0.2, q[1] + d], [q[0] - d * 0.3, q[1] + d * 1.1], 8), 9, 1.6)); } // la espuma
    extra.push(T(bez([lab[0] + 2, 6], [lab[0] - 30 * e, 16], [lab[0] - 28 * e, 50 * e], [lab[0] - 4, 48 * e]), 22, 4)); }
  if (sil === 'ala') { // un ALA abierta detrás: 6 plumas largas en abanico (con aire entre las puntas) y las cobertoras redondas en la raíz
    const O = [u1 - 14, 24];
    for (let k = 0; k < 6; k++) { const ang = (38 + k * 12.5) * Math.PI / 180, L = (158 - 14 * Math.abs(k - 2.5)) * e, tip = [O[0] + Math.cos(ang) * L, O[1] + Math.sin(ang) * L], mid = [O[0] + Math.cos(ang + 0.12) * L * 0.55, O[1] + Math.sin(ang + 0.12) * L * 0.55];
      extra.push(T(bez(O, mid, [tip[0] - 6, tip[1] - 8], tip, 16), 30, 4)); }
    [[O[0] - 4, O[1] + 6, 26], [O[0] + 10, O[1] + 26, 20], [res[0] + 6, res[1] - 18, 18]].forEach(([x, y, r]) => extra.push(poli(circulo([x, y], r, 40)))); }
  if (sil === 'minimal') { // MINIMAL: una curva en S que sube detrás y se abre hacia atrás; una ventana redonda en el cuerpo
    extra.push(T(bez([u0 + 12, 4], [u1 + 4, 8], [u1 + 44 * e, TB[1] - 12 * e], [TB[0] + 8, TB[1] + 34 * e]), 34, 12)); }
  if (R.mont === 'cascos') { const b = P.brazo; extra.push(envolver([poli(circulo([res[0] + 4, res[1] - 8], 16)), rr(b.sec[0] + 22, b.sec[1] + 22, 10).translate(b.c)])); }
  if (R.mont === 'pared') { const b = barras.find(x => x.pared); extra.push(envolver([poli(circulo([b.c[0] - 8, 10], 10)), poli([[b.c[0] - 14, 2], [b.c[0] + 6, 2], [b.c[0] + 6, b.c[1] + b.sec[1] / 2 + 12], [b.c[0] - 14, b.c[1] + b.sec[1] / 2 + 12]]), poli(circulo(res, 18))])); }
  let S = unir([cuerpo].concat(extra)).offset(-3, 'Round').offset(3, 'Round'); // (las esquinas de dentro, redondas)
  if (sil === 'minimal') { const cu = N.cajaCS(cuerpo), r = Math.min(cu.h, cu.w) * 0.2; if (r > 8) S = S.subtract(poli(circulo([(cu.min[0] + cu.max[0]) / 2 + cu.w * 0.12, cu.min[1] + cu.h * 0.62], r, 48))); }
  if (R.mont === 'pared') { const b = barras.find(x => x.pared); S = S.intersect(poli([[-500, -10], [b.c[0] + 6, -10], [b.c[0] + 6, 900], [-500, 900]])); } // la espalda plana contra la pared
  return { S, trazos, cuerpo };
}
// lo GRABADO en la cara de fuera (0,6 mm): escamas en la garra, el cañón y las barbas en cada pluma, las líneas del agua en la ola
export function grabado(R, P, Sil) { const L = [], { S, trazos, cuerpo } = Sil, dentro = S.offset(-3.5, 'Round');
  if (R.sil === 'garra') { const b = N.cajaCS(cuerpo); for (let y = b.min[1] + 10; y < b.max[1] - 4; y += 7) for (let x = b.min[0] + 6 + ((Math.round(y) % 2) ? 4 : 0); x < b.max[0] - 4; x += 9) L.push(poli(circulo([x, y], 4.2, 20)).subtract(poli(circulo([x, y + 2.1], 4.2, 20))));
    trazos.forEach(t => L.push(trazo(t.P.slice(2, -2), 2.2, 0.8))); }
  if (R.sil === 'ala') trazos.forEach(t => { const Q = t.P; L.push(trazo(Q.slice(1, -1), 1.6, 0.6)); for (let i = 3; i < Q.length - 2; i += 2) { const a = Q[i], b = Q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (t.w0 + (t.w1 - t.w0) * i / Q.length) * 0.38;
    [-1, 1].forEach(sg => L.push(trazo([a, [a[0] - dy / l * w * sg + dx / l * w * 0.6, a[1] + dx / l * w * sg + dy / l * w * 0.6]], 1.0, 0.5))); } });
  if (R.sil === 'ola') trazos.slice(0, 1).forEach(t => [0.32, -0.32].forEach(f => { const Q = t.P.map((q, i) => { const a = t.P[Math.max(0, i - 1)], b = t.P[Math.min(t.P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (t.w0 + (t.w1 - t.w0) * i / (t.P.length - 1)) * f; return [q[0] - dy / l * w, q[1] + dx / l * w]; }); L.push(trazo(Q.slice(1, -2), 1.4, 0.6)); }));
  if (!L.length) return null;
  return unir(L).intersect(dentro);
}
const seccion = (b, mas = 0) => rr(b.sec[0] + 2 * mas, b.sec[1] + 2 * mas, Math.max(0.5, RB + mas)).translate([b.c[0], b.c[1]]);

// ---------- las PIEZAS ----------
// placa (derecha, la de x > 0): dibujo (u, v) extruido en su z local (0 = cara de DENTRO, PL = cara de FUERA), con los huecos ciegos y el nombre
export function placaLocal(R, P, conNombre) { const Sil = silueta(R, P), { S } = Sil;
  let m = conBisel(S, PL, 1.4);
  const G = grabado(R, P, Sil); if (G && !G.isEmpty()) m = m.subtract(G.extrude(0.61).translate([0, 0, PL - 0.6])); // (la cara de fuera va ABAJO al imprimir: lo grabado sale limpio)
  m = m.subtract(N.union(P.barras.map(b => seccion(b, R.aj).extrude(SD + 0.01).translate([0, 0, -0.01]))));
  if (P.brazo) m = m.subtract(rr(P.brazo.sec[0] + 0.4, P.brazo.sec[1] + 0.4, 0).translate(P.brazo.c).extrude(PL + 2).translate([0, 0, -1])); /* (esquinas vivas, como el brazo; 0,2 de aire por lado) */
  const t = conNombre ? String(R.txt || '').trim() : ''; if (t) { try { const T = N.centraCS(N.texto2(t, R.fuente || 'gorda', 10)), bb = N.cajaCS(T), cu = N.cajaCS(S), k = Math.min(1, (cu.w - 30) / bb.w, 12 / bb.h);
    m = m.subtract(T.scale([k, k]).translate([(cu.min[0] + cu.max[0]) / 2, 24]).extrude(0.81).translate([0, 0, PL - 0.8])); } catch (e) { } }
  return m; }
// en el montaje: la placa derecha con su cara de dentro en x = Wi/2 (y la izquierda, su espejo)
const aMundo = (m, x0) => N.transforma(m, [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1]);
// una barra (a lo largo de x), de hueco a hueco, 0,3 mm más corta que el fondo de los dos
export function montado(p) { const R = medidas(p); R.txt = p.txt; const P = plano(R), pd = placaLocal(R, P, true), pi = placaLocal(R, P, false);
  const L = [{ k: 'placaD', m: aMundo(pd, R.Wi / 2) }, { k: 'placaI', m: aMundo(pi, R.Wi / 2).mirror([1, 0, 0]) }];
  P.barras.forEach(b => { const m = seccion(b).extrude(R.Wi + 2 * SD - 0.6).translate([0, 0, -(R.Wi + 2 * SD - 0.6) / 2]); L.push({ k: 'barra_' + b.k, m: N.transforma(m, [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1]) }); });
  if (P.brazo) { const B = brazoCascos(); L.push({ k: 'brazo', m: B.translate([R.Wi / 2 + PL, P.brazo.c[0], P.brazo.c[1] - 6]) }); }
  // el MANDO de mentira (para comprobar), en cada asiento: caja de w × g × h, de pie e inclinada, apoyada en sus barras
  const mandos = P.asis.map(x => { const ca = Math.cos(R.a * Math.PI / 180), sa = Math.sin(R.a * Math.PI / 180), o = x.w(0, 0);
    const caja0 = M().cube([R.Q.w, R.Q.g, R.Q.h]).translate([-R.Q.w / 2, 0, 0]);
    return N.transforma(caja0, [1, 0, 0, 0, 0, ca, -sa, 0, 0, sa, ca, 0, 0, o[0], o[1], 1]); });
  return { R, P, piezas: L, mandos }; }
// las piezas PARA IMPRIMIR (tumbadas): 2 placas (cara de fuera abajo) y las barras
export function piezasMando(p) { const R = medidas(p); R.txt = p.txt; const P = plano(R), pd = placaLocal(R, P, true), pi = placaLocal(R, P, false), L = [];
  L.push({ t: 'Placa derecha (con el nombre)', m: N.aLaCama(pd.rotate([180, 0, 0])) }, { t: 'Placa izquierda', m: N.aLaCama(pi.rotate([180, 0, 0]).mirror([1, 0, 0])) });
  P.barras.forEach(b => { const Lb = R.Wi + 2 * SD - 0.6, m = N.transforma(rr(b.sec[0], b.sec[1], Math.max(0.5, RB)).extrude(Lb), [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1]); /* (tumbada: lo ancho de su sección abajo, con los cantos redondos a lo largo) */ L.push({ t: 'Barra ' + ({ suelo1: 'de abajo (delante)', suelo2: 'de abajo (detrás)', labio: 'del labio', respaldo: 'del respaldo', cascos: 'del colgador de cascos', pared: 'de la pared (con 2 tornillos)' }[b.k.replace(/\d$/, '')] || b.k) + (/\d$/.test(b.k) ? ' · asiento ' + b.k.slice(-1) : ''), m: b.pared ? paredTornillos(m, Lb, b) : N.aLaCama(m) }); });
  if (P.brazo) L.push({ t: 'Brazo de los cascos', m: N.aLaCama(brazoCascos().rotate([90, 0, 0])) });
  return { R, P, L }; }
// la barra de la pared: tumbada con la cara de la pared ABAJO y 2 agujeros avellanados para tornillos de 4 mm (cabeza enrasada)
function paredTornillos(m, Lb, b) { let q = rr(Lb, b.sec[1], RB).extrude(b.sec[0]); [-1, 1].forEach(sg => { const x = sg * (Lb / 2 - SD - 22); q = q.subtract(cil(4.6, b.sec[0] + 2, -1).translate([x, 0, 0])).subtract(A.cono(4.6, 9.4, 2.5, b.sec[0] - 2.49).translate([x, 0, 0])); }); void m; return N.aLaCama(q); }
// el BRAZO de los cascos: x = 0 en la cara de fuera de la placa; por dentro, un tope de 24 de alto; fuera, 56 mm y la punta levantada
export function brazoCascos() { const e = 12, Pz = [[-PL - 4, -6], [-PL, -6], [-PL, 0], [50, 0], [56, 6], [56, e + 12], [52, e + 12], [48, e], [-PL, e], [-PL, e + 6], [-PL - 4, e + 6]];
  return N.transforma(poli(Pz).offset(-1, 'Round').offset(1, 'Round').extrude(30).translate([0, 0, -15]), [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]); } // (perfil (x, z) → x, z; el ancho a lo largo de y)
// 🧪 la PRUEBA: un trozo de placa con un hueco y un trozo de barra (a presión o encaja, con TU impresora) · y el ancho por dentro, en una regleta
export function pruebaMando(p) { const R = medidas(p), b = { c: [0, 0], sec: [BW, BH] };
  const trozo = conBisel(rr(BW + 16, BH + 16, 5), PL, 1).subtract(seccion(b, R.aj).extrude(SD + 0.01).translate([0, 0, PL - SD])), barra = rr(30, BH, RB).extrude(BW);
  const regla = rr(R.Wi + 2 * PL, 10, 3).extrude(3).add(rr(PL, 10, 2).extrude(14).translate([-(R.Wi / 2 + PL / 2), 0, 0])).add(rr(PL, 10, 2).extrude(14).translate([R.Wi / 2 + PL / 2, 0, 0]));
  return A.enFila([trozo, barra, regla], 6); }
// todo en la cama (si cabe): las placas y las barras en filas
const enCama = L => A.enRejilla(L.map(x => x.m), 236, 6);

export const DISENOS_MANDOS = {
  soporteDualSense: { cat: 'gaming', tambien: ['jovenes', 'regalos', 'pro'], nuevo: true, busca: 'soporte mando ps5 playstation dualsense edge ps4 dualshock xbox switch pro controller stand holder base escritorio pared cascos auriculares headset garra dragon ola ala minimal gaming premium',
    e: '🎮', t: 'Soporte premium para el mando (PS5 DualSense y otros)', d: 'Dos placas con silueta (minimal, ola, garra de dragón o ala) y barras a presión: el mando de pie e inclinado. Para uno, dos en escalera, con colgador de cascos o de pared', uso: 'funcional', color: '#1c1c22',
    campos: [s('mando', 'Mando', 'ps5', Object.entries(MANDOS).map(([k, Q]) => [k, Q.t])), s('silueta', 'Silueta de las placas', 'garra', Object.entries(SILUETAS)), s('montaje', 'Montaje', 'uno', Object.entries(MONTAJES)),
      n('angulo', 'Inclinación hacia atrás', 16, 8, 25, 1, '°'), n('holgura', 'Holgura a los lados (por lado)', 1.5, 0.5, 4, 0.5), s('ajuste', 'Barras en sus huecos', 'encaja', [['encaja', 'Encajan (0,10 por lado: se pueden pegar)'], ['presion', 'A presión (0,05 por lado)']]),
      tx('txt', 'Nombre (en la placa derecha)', ''),
      s('que', 'Qué imprimo', 'placaD', [['placaD', 'Cama 1: la placa derecha (con el nombre)'], ['placaI', 'Cama 2: la placa izquierda'], ['barras', 'Cama 3: las barras' ], ['prueba', '🧪 Prueba: hueco + barra + el ancho (pocos gramos)'], ['montado', '👀 Montado (como queda)']])],
    gen: p => { if (p.que === 'prueba') return pruebaMando(p); if (p.que === 'montado') { const X = montado(p); return N.union(X.piezas.map(x => x.m)); }
      const X = piezasMando(p); return p.que === 'barras' ? enCama(X.L.filter(x => /^Barra|^Brazo/.test(x.t))) : X.L.find(x => (p.que === 'placaI' ? /^Placa izquierda/ : /^Placa derecha/).test(x.t)).m; },
    nota: p => { const R = medidas(p), Q = R.Q, P = plano(R);
      if (p.que === 'prueba') return '🧪 PRUEBA (unos gramos): un TROZO DE PLACA con su hueco, un TROZO DE BARRA y una REGLETA con el ancho por dentro (' + n2(R.Wi) + ' mm). Mete la barra en el hueco: con «encajan» entra con la mano y se queda; con «a presión», con un golpecito. Pon tu mando de pie en la regleta: tiene que entrar sin apretar.';
      return 'PARA QUÉ: tu mando ' + Q.t + ' DE PIE y a la vista, inclinado ' + R.a + '° hacia atrás: apoya en dos barras abajo, una barra de labio delante y una de respaldo detrás; las dos placas, con silueta de ' + SILUETAS[R.sil].replace(/^\S+\s/, '').toLowerCase() + ', hacen de mejillas. '
        + (R.mont === 'doble' ? 'DOS mandos, el de atrás más alto (como unas gradas). ' : '') + (R.mont === 'cascos' ? 'Los CASCOS, colgados por la diadema del BRAZO que sale de lado arriba (a ' + Math.round(ALTO_CASCOS / 10) + ' cm): cuelgan junto al soporte, sin tapar el mando (el agujero está en las dos placas: ponlo a la izquierda o a la derecha). ' : '') + (R.mont === 'pared' ? 'DE PARED: la barra de atrás va contra la pared con 2 tornillos de 4 mm y taco (cabeza enrasada). ' : '')
        + 'MEDIDAS: el mando, ' + Q.w + ' × ' + Q.g + ' × ' + Q.h + ' mm ' + (Q.oficial ? '(las de la ficha de Sony)' : '(las HABITUALES: mide el tuyo)') + '; entre placas, ' + n2(R.Wi) + ' mm. ' + P.barras.length + ' barras. '
        + 'IMPRESIÓN: las placas TUMBADAS (la cara de fuera abajo: sale lisa) y las barras tumbadas, todo SIN soportes; 4 paredes, 20 % de relleno, PLA o PETG. Las placas pueden ir de un color y las barras de otro. Saca antes la «🧪 Prueba». '
        + 'MONTAJE: las barras en los huecos de una placa, luego la otra encima (si «encajan», una gota de pegamento en cada hueco).'; } }
};
