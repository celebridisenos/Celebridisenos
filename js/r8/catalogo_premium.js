// ================= v20.4 · ✨ CATÁLOGO PREMIUM: miniaturas, jarrones de lujo, esculturas «imposibles», tornillos y macetas =================
// La dueña (10-10-2026): «crear accesorios para miniaturas, mini puertas, mini casitas, mini muebles… para poder vender; también varias
// versiones de jarrones de lujo, y figuras/esculturas de forma imposible o de meditación… cosas de gravedad o que se mantenga, parece
// imposible pero se puede… tornillos… macetas, un poco de todo: dame un catálogo guay».
// Reglas de TODO lo de aquí (las de la casa):
//  · Diseños PROPIOS, a su nombre. Nada copiado.
//  · Todo sale SIN SOPORTES como viene (lo que vuela, a 45° o menos; comprobado por capas en test/prueba_premium.js).
//  · Lo que encaja usa SUS holguras (ENCAJES) y lo que «se sostiene» se CALCULA (centro de gravedad) y se dice en la nota.
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';

const M = () => N.MF(), CS = () => N.CSX();
const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const caja6 = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cilZ = (r, z0, z1, sg) => M().cylinder(z1 - z0, r, r, sg || seg(2 * r)).translate([0, 0, z0]);
const cilY = (r, y0, y1, x = 0, z = 0) => M().cylinder(y1 - y0, r, r, seg(2 * r)).rotate([-90, 0, 0]).translate([x, y0, z]);
const hexZ = (ec, z0, z1) => M().cylinder(z1 - z0, ec / Math.sqrt(3), ec / Math.sqrt(3), 6).translate([0, 0, z0]); // ec = entre caras
const revol = (P, sg) => CS().ofPolygons([N.ccw(P)]).revolve(sg);

// FIRMA discreta «CelebriDiseños» (la dueña, 10-10-2026: «en algunas que quede bien puedes poner CelebriDiseños… las más tops, discreto»):
// grabada 0,4 mm en la cara de ABAJO; se lee al darle la vuelta a la pieza. Si no cabe con letra legible, no se pone.
export function firmaAbajo(m, ancho, cx = 0, cy = 0) {
  try { const t = N.centraCS(N.texto2('CelebriDiseños', 'gorda', 8, true)), b = N.cajaCS(t), k = Math.min(ancho / b.w, 1.1); if (b.w * k < 16) return m;
    return m.subtract(t.scale([k, k]).extrude(0.42).translate([cx, cy, N.caja(m).min[2] - 0.02])); } catch (e) { return m; }
}
// centro de gravedad de una pieza maciza (por tetraedros con el origen): para lo que tiene que SOSTENERSE
export function centroDeGravedad(m) {
  const s = N.aSopa(m), P = s.pos || s.p || s, T = s.tri || s.t || null; let V = 0, cx = 0, cy = 0, cz = 0;
  const tri = (a, b, d) => { const v = (a[0] * (b[1] * d[2] - b[2] * d[1]) - a[1] * (b[0] * d[2] - b[2] * d[0]) + a[2] * (b[0] * d[1] - b[1] * d[0])) / 6; V += v; cx += v * (a[0] + b[0] + d[0]) / 4; cy += v * (a[1] + b[1] + d[1]) / 4; cz += v * (a[2] + b[2] + d[2]) / 4; };
  if (T) for (let i = 0; i < T.length; i += 3) tri([P[3 * T[i]], P[3 * T[i] + 1], P[3 * T[i] + 2]], [P[3 * T[i + 1]], P[3 * T[i + 1] + 1], P[3 * T[i + 1] + 2]], [P[3 * T[i + 2]], P[3 * T[i + 2] + 1], P[3 * T[i + 2] + 2]]);
  else for (let i = 0; i < P.length; i += 9) tri([P[i], P[i + 1], P[i + 2]], [P[i + 3], P[i + 4], P[i + 5]], [P[i + 6], P[i + 7], P[i + 8]]);
  return { x: cx / V, y: cy / V, z: cz / V, vol: V };
}

// ---------- 🏺 JARRONES DE LUJO: una forma (el perfil) × una piel (la textura) ----------
const FORMAS = {
  anfora: ['Ánfora', t => 0.52 + 0.48 * Math.pow(Math.sin(Math.PI * (0.10 + 0.74 * t)), 1.25) - 0.16 * Math.pow(t, 6)],
  tulipan: ['Tulipán', t => 0.50 + 0.30 * Math.sin(Math.PI * (0.05 + 0.55 * t)) + 0.32 * Math.pow(t, 3)],
  gota: ['Gota', t => 0.40 + 0.60 * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(1, t + 0.12), 0.62) * 0.9), 1.1) * (1 - 0.35 * t)],
  columna: ['Columna con cintura', t => 0.78 - 0.20 * Math.sin(Math.PI * t) + 0.10 * Math.pow(t, 4)],
  cuenco: ['Cuenco alto', t => 0.45 + 0.55 * Math.pow(t, 0.55)] };
const PIELES = {
  lisa: ['Lisa', () => 0],
  espiral: ['Espiral facetada', (a, t, o) => { const x = ((o.n * (a + o.g * t)) / (2 * Math.PI)) % 1, u = x < 0 ? x + 1 : x; return Math.abs(2 * u - 1) * 2 - 1; }],
  diamante: ['Diamantes', (a, t, o) => Math.max(Math.cos(o.n * (a + o.g * t)), Math.cos(o.n * (a - o.g * t)))],
  olas: ['Olas', (a, t, o) => Math.cos(o.n * a) * Math.sin(Math.PI * o.m * t)],
  plisado: ['Plisado', (a, t, o) => 1 - 2 * Math.abs(Math.sin(o.n * (a + o.g * t) / 2))],
  seda: ['Seda (ondas que suben)', (a, t, o) => Math.sin(o.n * a + 2 * Math.PI * o.m * t + 1.5 * Math.sin(2 * Math.PI * t))] };
export function jarronLujo(p) {
  const H = p.h, R = p.d / 2, F = (FORMAS[p.forma] || FORMAS.anfora)[1], K = (PIELES[p.piel] || PIELES.lisa)[1];
  const o = { n: Math.max(2, Math.round(p.n)), g: (p.giro || 0) * Math.PI / 180, m: Math.max(1, Math.round(p.n / 3)) }, amp = Math.min(p.relieve, R * 0.25);
  const sg = Math.max(96, Math.min(288, o.n * 24)), capas = Math.max(40, Math.round(H / 1.2));
  const cuerpo = (menos, z0, z1) => CS().circle(1, sg).extrude(z1 - z0, capas).translate([0, 0, z0]).warp(v => { const t = Math.max(0, Math.min(1, v[2] / H)), a = Math.atan2(v[1], v[0]), suave = Math.min(1, t / 0.06), r = Math.max(1.2, R * F(t) + amp * K(a, t, o) * suave - menos); v[0] *= r; v[1] *= r; });
  const fuera = cuerpo(0, 0, H);
  if (!(p.pared > 0)) return fuera; // macizo: para «Jarrón en espiral»
  return fuera.subtract(cuerpo(p.pared, Math.max(1.2, p.pared), H + 1));
}

// ---------- 🪴 MACETA DE AUTORRIEGO: el depósito (fuera) y la maceta (dentro) con su pie que chupa el agua ----------
export function autorriego(p) {
  const R = p.d / 2, H = p.h, pr = p.pared, hol = ENCAJES.gira + 0.15, sg = seg(p.d), Ri = R - pr - hol, rf = Math.max(8, Ri * 0.3), cono = Ri - rf;
  const hDep = Math.max(H * 0.32, cono + 10 + pr - 14), Din = hDep + 14 - pr, zf = Din - cono - 2, Hm = Din + (H - hDep - 14); // Din = lo que la maceta entra en el depósito
  if (Hm < Din + 12) N.mal('Para ese diámetro la maceta tiene que ser más alta: sube «Alto total» a ' + n2(Math.ceil(hDep + 14 + 12)) + ' mm o más.');
  // depósito: vaso recto con una muesca para ver y echar el agua
  const dep = cilZ(R, 0, hDep + 14, sg).subtract(cilZ(R - pr, pr, hDep + 15, sg)).subtract(caja6(R - pr - 1, R + 1, -7, 7, hDep + 4, hDep + 20));
  // maceta (se imprime sobre su pie): pie, embudo a 45°, y el hombro (también a 45°) que apoya en el borde del depósito
  const fuera = [[0, 0], [rf, 0], [rf, zf], [Ri, zf + cono], [Ri, Din - (R - Ri)], [R, Din], [R, Hm]], k = pr * 0.42;
  const dentro = [[R - pr, Hm], [R - pr, Din + k], [Ri - pr, Din - (R - Ri) + k], [Ri - pr, zf + cono + k], [rf - pr, zf + k], [rf - pr, pr], [0, pr]];
  let mac = revol(fuera.concat(dentro), sg);
  for (let i = 0; i < 4; i++) mac = mac.subtract(caja6(-1, 1, -rf - 1, rf + 1, pr + 1.5, Math.max(pr + 4, zf - 1)).rotate([0, 0, i * 45])); // ranuras del pie: por ahí sube el agua
  const agua = cilZ(R - pr, pr, pr + zf + cono * 0.7, sg).subtract(revol(fuera.concat([[0, Hm]]), sg).translate([0, 0, pr])).volume() / 1e6; // litros hasta el 70 % del embudo
  return { dep, mac, hDep, litros: agua };
}

// ---------- 🔩 TORNILLO Y TUERCA que se imprimen (rosca gorda y redondeada: la que de verdad sale bien en plástico) ----------
export function tornilloTuerca(p) {
  const d = p.d, paso = Math.max(1.5, Math.min(p.paso, d / 3)), ec = p.ec > d + 3 ? p.ec : Math.round(d * 1.7), hc = Math.max(3, p.cabeza);
  let tor = hexZ(ec, 0, hc).add(cilZ(d / 2 - paso * 0.3, hc, hc + p.largo)).add(N.rosca(d, paso, p.largo - 1).translate([0, 0, hc]));
  tor = tor.intersect(revol([[0, 0], [ec, 0], [ec, hc + p.largo - d * 0.18], [d / 2 - paso * 0.6, hc + p.largo], [0, hc + p.largo]], 96)); // punta achaflanada: entra sola
  const ht = Math.max(paso * 3, p.tuerca);
  const tue = hexZ(ec, 0, ht).subtract(cilZ(d / 2 - paso * 0.3 + ENCAJES.gira + 0.1, -1, ht + 1)).subtract(N.rosca(d, paso, ht + 2 * paso, true).translate([0, 0, -paso]))
    .subtract(revol([[0, -0.01], [d / 2 + 0.6, -0.01], [d / 2 - 0.4, 1], [0, 1]], 64)).subtract(revol([[0, ht - 1], [d / 2 - 0.4, ht - 1], [d / 2 + 0.6, ht + 0.01], [0, ht + 0.01]], 64)); // bocas abocardadas
  return { tor, tue, paso, ec, hc, ht };
}

// ---------- 🏠 MINIATURAS (casita de muñecas; 1:12 de partida) ----------
// PUERTA QUE SE ABRE: marco y hoja se imprimen tumbados y un trozo de FILAMENTO de 1,75 hace de eje de la bisagra
export function miniPuerta(p) {
  const w = p.ancho, hh = p.alto, g = p.grosor, mk = p.marco, hol = 0.4, rk = 2.2, rp = (p.pasador + 2 * ENCAJES.gira) / 2;
  const xk = -hol / 2, zk = g; // el eje de la bisagra: en la rendija, a ras de la cara de delante
  const nud = (y0, y1, lado) => M().hull([cilY(rk, y0, y1, xk, zk), caja6(lado > 0 ? xk + 0.2 : xk - rk - 1.2, lado > 0 ? xk + rk + 1.2 : xk - 0.2, y0, y1, 0, g)]);
  let hoja = caja6(hol / 2, w + hol / 2, 0, hh, 0, g);
  const cols = 2, filas = Math.max(1, Math.round(p.paneles / 2)), mg = Math.max(4, w * 0.12), pw = (w - mg * (cols + 1)) / cols, ph = (hh - mg * (filas + 1)) / filas;
  for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) hoja = hoja.subtract(caja6(hol / 2 + mg + i * (pw + mg), hol / 2 + mg + i * (pw + mg) + pw, mg + j * (ph + mg), mg + j * (ph + mg) + ph, g - 0.8, g + 1)); // cuarterones hundidos
  hoja = hoja.add(cilZ(1.8, g - 0.1, g + 2.6, 24).translate([w - mg * 0.5, hh * 0.47, 0])); // el pomo
  const Yh = [[0.20, 0.30], [0.70, 0.80]].map(([a, b]) => [hh * a, hh * b]), Ym = [[0.11, 0.20], [0.30, 0.39], [0.61, 0.70], [0.80, 0.89]].map(([a, b], i) => [hh * a + (i % 2 ? 0.35 : 0), hh * b - (i % 2 ? 0 : 0.35)]);
  const hueco = (y0, y1) => caja6(xk - rk - 0.45, xk + rk + 0.45, y0 - 0.35, y1 + 0.35, -1, g + rk + 1);
  Ym.forEach(([a, b]) => { hoja = hoja.subtract(hueco(a, b)); }); Yh.forEach(([a, b]) => { hoja = hoja.add(nud(a, b, 1)); });
  let marco = N.union([caja6(-mk - hol / 2, -hol / 2, -0.01, hh + hol + mk, 0, g), caja6(w + hol * 1.5, w + hol * 1.5 + mk, -0.01, hh + hol + mk, 0, g), caja6(-mk - hol / 2, w + hol * 1.5 + mk, hh + hol, hh + hol + mk, 0, g)]);
  Yh.forEach(([a, b]) => { marco = marco.subtract(hueco(a, b)); }); Ym.forEach(([a, b]) => { marco = marco.add(nud(a, b, -1)); });
  const ag = cilY(rp, hh * 0.05, hh * 0.95, xk, zk); // el agujero del eje (de arriba abajo de la bisagra)
  return { hoja: hoja.subtract(ag), marco: marco.subtract(ag), eje: { x: xk, z: zk }, largoEje: hh * 0.80 };
}
export function abreMiniPuerta(p) { // cuánto abre hacia delante sin tropezar (de 5 en 5 grados)
  try { const Q = miniPuerta(p), gira = a => Q.hoja.translate([-Q.eje.x, 0, -Q.eje.z]).rotate([0, -a, 0]).translate([Q.eje.x, 0, Q.eje.z]); let ok = 0;
    for (let a = 5; a <= 180; a += 5) { if (gira(a).intersect(Q.marco).volume() > 0.02) break; ok = a; } return ok; } finally { N.limpia(); }
}
export function miniMesa(p) { // se imprime boca abajo (el tablero en la cama y las patas hacia arriba)
  const L = p.largo, W = p.ancho, H = p.alto, t = p.tablero, pt = p.pata, m = Math.max(1.5, pt * 0.6);
  let mesa = N.cs([N.ccw([[-L / 2, -W / 2], [L / 2, -W / 2], [L / 2, W / 2], [-L / 2, W / 2]])], 'Positive').offset(-2, 'Round').offset(2, 'Round', 2, 24).extrude(t);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const x = a * (L / 2 - m - pt / 2), y = b * (W / 2 - m - pt / 2); mesa = mesa.add(CS().square([pt, pt], true).extrude(H - t, 0, 0, [0.62, 0.62]).translate([x, y, t])); });
  if (p.faldon) mesa = mesa.add(caja6(-L / 2 + m + pt / 2, L / 2 - m - pt / 2, -W / 2 + m + pt * 0.3, -W / 2 + m + pt * 0.7, t, t + Math.min(6, H * 0.15))).add(caja6(-L / 2 + m + pt / 2, L / 2 - m - pt / 2, W / 2 - m - pt * 0.7, W / 2 - m - pt * 0.3, t, t + Math.min(6, H * 0.15)));
  return mesa;
}
export function miniTaburete(p) { // boca abajo: el asiento en la cama y las patas abiertas hacia arriba
  const R = p.d / 2, H = p.alto, t = p.asiento, np = Math.max(3, Math.round(p.patas)), rp = p.pata / 2, abre = Math.min(0.32, (H - t) > 0 ? R * 0.35 / (H - t) : 0);
  let m = revol([[0, 0], [R - 1, 0], [R, 1], [R, t], [0, t]], seg(p.d));
  for (let i = 0; i < np; i++) { const a = (i + 0.5) * 2 * Math.PI / np, r0 = R * 0.55; const pata = M().hull([cilZ(rp, t - 0.2, t + 0.2, 24).translate([r0 * Math.cos(a), r0 * Math.sin(a), 0]), cilZ(rp * 0.7, H - 0.4, H, 24).translate([(r0 + abre * (H - t)) * Math.cos(a), (r0 + abre * (H - t)) * Math.sin(a), 0])]); m = m.add(pata); }
  if (p.aro) { const zr = t + (H - t) * 0.55, rr = R * 0.55 + abre * (zr - t); m = m.add(revol([[rr - 1.1, zr], [rr + 1.1, zr], [rr + 1.1, zr + 1.6], [rr, zr + 2.7], [rr - 1.1, zr + 1.6]], seg(2 * rr)).subtract(revol([[0, zr - 1], [rr - 1.1, zr - 1], [rr - 1.1, zr + 1.6], [rr - 2.2, zr + 2.7], [0, zr + 2.7]], seg(2 * rr)))); }
  return m;
}
export function miniEstanteria(p) { // tumbada sobre su espalda: todo son paredes de pie
  const W = p.ancho, H = p.alto, F = p.fondo, e = p.grosor, nb = Math.max(1, Math.round(p.baldas));
  let m = caja6(0, W, 0, H, 0, F).subtract(caja6(e, W - e, e, H - e, e * 0.8, F + 1));
  for (let i = 1; i <= nb; i++) { const y = e + (H - 2 * e) * i / (nb + 1); m = m.add(caja6(e - 0.01, W - e + 0.01, y - e / 2, y + e / 2, 0, F - 1)); }
  if (p.zocalo) m = m.subtract(caja6(e * 2, W - e * 2, -1, e + 0.01, e * 0.8 + 1.5, F + 1).intersect(caja6(0, W, -1, e * 0.55, 0, F + 1)));
  return m;
}
export function miniCasita(p) { // las paredes (sin suelo, de pie) y el tejado a dos aguas aparte (a 45° o más: sin soportes)
  const L = p.largo, W = p.fondo, H = p.alto, e = p.pared, ang = Math.max(45, p.tejado) * Math.PI / 180, hol = ENCAJES.justo;
  let cuerpo = caja6(0, L, 0, W, 0, H).subtract(caja6(e, L - e, e, W - e, -1, H + 1));
  const pw = Math.min(L * 0.22, 26), phh = Math.min(H * 0.62, 48), vw = Math.min(L * 0.2, 22);
  const arco = (cx, w, z0, alto) => caja6(cx - w / 2, cx + w / 2, -1, e + 1, z0, z0 + alto - w / 2).add(M().cylinder(e + 2, w / 2, w / 2, 48).rotate([-90, 0, 0]).translate([cx, -1, z0 + alto - w / 2])); // con arco: el dintel se imprime solo
  cuerpo = cuerpo.subtract(arco(L * 0.5, pw, -1, phh + 1));
  [0.2, 0.8].forEach(k => { cuerpo = cuerpo.subtract(arco(L * k, vw, H * 0.42, vw * 1.45)); });
  [0.3, 0.7].forEach(k => { cuerpo = cuerpo.subtract(arco(L * k, vw, H * 0.42, vw * 1.45).translate([0, W - e, 0])); });
  // el tejado: un prisma hueco que apoya en las paredes y lleva un labio por dentro para que no se mueva
  const vuelo = Math.max(4, p.alero), hw = W / 2 + vuelo, alto = hw * Math.tan(ang), g = Math.max(1.6, e * 0.9), k = g / Math.sin(ang);
  const tri = q => N.cs([N.ccw([[-hw + q, 0], [hw - q, 0], [0, (hw - q) * Math.tan(ang)]])], 'Positive');
  const tejado = tri(0).extrude(L + 2 * vuelo).subtract(tri(k).extrude(L + 2 * vuelo - 2 * g).translate([0, 0, g])).rotate([90, 0, 90]).translate([-vuelo, W / 2, 0]);
  return { cuerpo, tejado, altoTejado: alto };
}

// ---------- 🗿 ESCULTURAS «IMPOSIBLES», DE EQUILIBRIO Y DE MEDITACIÓN ----------
// TRIÁNGULO IMPOSIBLE (de Penrose): tres barras en ángulo recto; mirado desde su esquina, el ojo las «cierra» en un triángulo
export function trianguloImposible(p) {
  const L = p.largo, b = p.barra;
  let m = N.union([caja6(0, L, 0, b, 0, b), caja6(0, b, 0, L, 0, b), caja6(L - b, L, 0, b, 0, L)]);
  // el corte que hace la magia: la punta de la barra de pie se bisela para que, desde el punto de vista bueno, «pise» a la tumbada
  m = m.subtract(M().cube([3 * b, 3 * b, 3 * b], true).rotate([0, 45, 0]).translate([L - b - b * 1.06, b / 2, L + b * 1.06]));
  return m.add(revol([[0, 0], [1.6, 0], [1.6, 0.6], [0, 0.6]], 24).translate([b / 2, L - b / 2, b])); // un puntito en la barra del fondo: «mira desde aquí» (está en la nota)
}
// PÁJARO EQUILIBRISTA: se sostiene SOLO sobre el pico en la punta de un dedo. Las alas van hacia delante y sus puntas pesan y cuelgan:
// el centro de gravedad queda justo debajo del pico (se CALCULA y se corrige moviendo las alas hasta que cuadra)
export function pajaroEquilibrista(p) {
  const E = p.envergadura, t = p.grosor, hp = p.peso, sg = 48, yP = -1.6, zHoyo = Math.min(0.8, t * 0.4);
  const haz = (ade) => { // «ade» = cuánto adelantan las puntas de las alas al pico (mm)
    const cuerpo = N.cs([N.ccw([[0, 0], [E * 0.045, -E * 0.06], [E * 0.06, -E * 0.2], [E * 0.03, -E * 0.36], [E * 0.075, -E * 0.5], [0, -E * 0.46], [-E * 0.075, -E * 0.5], [-E * 0.03, -E * 0.36], [-E * 0.06, -E * 0.2], [-E * 0.045, -E * 0.06]])], 'Positive').offset(-1, 'Round').offset(1, 'Round', 2, 16);
    const ala = q => N.cs([N.ccw([[q * E * 0.03, -E * 0.07], [q * E * 0.26, -E * 0.01 + ade * 0.35], [q * E * 0.47, ade + E * 0.02], [q * E * 0.5, ade - E * 0.025], [q * E * 0.4, ade - E * 0.1], [q * E * 0.24, -E * 0.16 + ade * 0.2], [q * E * 0.05, -E * 0.22]])], 'Positive');
    let m = N.csUnion([cuerpo, ala(1), ala(-1)]).extrude(t);
    [-1, 1].forEach(q => { m = m.add(revol([[0, 0], [E * 0.05, 0], [E * 0.05, t + hp * 0.6], [E * 0.02, t + hp], [0, t + hp]], sg).translate([q * E * 0.44, ade - E * 0.045, 0])); }); // los pesos de las puntas (se imprimen hacia arriba; al usarlo, cuelgan)
    return m.subtract(revol([[0, zHoyo], [0.25, zHoyo], [1.9, t + 0.01], [0, t + 0.01]], 24).translate([0, yP, 0])); // el apoyo: un hoyito cónico en el pico
  };
  let ade = E * 0.10, G = null;
  for (let i = 0; i < 16; i++) { const m = haz(ade); G = centroDeGravedad(m); N.suelta(m); const err = G.y - yP; if (Math.abs(err) < 0.02) break; ade -= err * 2.0; }
  let m = haz(ade); G = centroDeGravedad(m);
  if (p.peana) m = m.add(revol([[0, 0], [15, 0], [15, 2], [3.2, 7], [2.2, 44], [0.45, 50], [0, 50]], 48).translate([0, -E * 0.5 - 22, 0])); // la peana: acaba en punta, y la punta entra en el hoyito
  return { m, ade, G, enPunta: G.z - zHoyo, enDedo: G.z - t, yP };
}
// MESA DE TENSEGRIDAD: la tapa «flota» colgada de un hilo en el centro y sujeta por tres en el borde. Cuatro piezas planas
// (dos platos y dos brazos que entran a presión en su ranura) + hilo
export function tensegridad(p) {
  const R = p.d / 2, t = p.grosor, H = p.alto, e = p.brazo, hp = ENCAJES.presion, sg = seg(p.d);
  const ranL = Math.max(12, R * 0.4), x0 = R * 0.74, ab = Math.max(7, e * 2), zg = H * 0.56 - t; // x0 = por dónde entra el brazo (su canto de fuera)
  if (x0 - ranL < 4 || zg < 2 * ab) N.mal('Con esas medidas el brazo no cabe: haz los platos más grandes o la mesa más alta.');
  let plato = cilZ(R, 0, t, sg).subtract(caja6(x0 - ranL - hp, x0 + hp, -e / 2 - hp, e / 2 + hp, -1, t + 1));
  [90, 210, 330].forEach(g => { const a = g * Math.PI / 180; plato = plato.subtract(cilZ(0.9, -1, t + 1, 16).translate([(R - 3.5) * Math.cos(a), (R - 3.5) * Math.sin(a), 0])); }); // los 3 hilos del borde
  // el brazo (tumbado para imprimir; u = hacia el centro del plato, v = hacia arriba): pie que entra en la ranura, columna y gancho en el centro
  const perfil = N.cs([N.ccw([[0, -t], [ranL, -t], [ranL, 0], [ab, 0], [ab, zg - ab], [x0 + ab / 2, zg], [x0 + ab / 2, zg + ab * 0.9], [x0 - ab / 2, zg + ab * 0.9], [0, zg - ab * 0.25]])], 'Positive').offset(-0.6, 'Round').offset(0.6, 'Round', 2, 16);
  const zh = zg + ab * 0.45, brazo = perfil.extrude(e).subtract(cilZ(0.9, -1, e + 1, 16).translate([x0, zh, 0])); // con el agujero del hilo del centro
  // MONTAJE VIRTUAL: el brazo de pie en su plato; la tapa es lo mismo dado la vuelta (girado sobre el eje Y: su brazo queda al otro lado)
  const enPlato = brazo.rotate([90, 0, 0]).translate([0, e / 2, 0]).mirror([1, 0, 0]).translate([x0, 0, t]);
  const tapa = M2 => M2.rotate([0, 180, 0]).translate([0, 0, H]);
  return { plato, brazo, ranL, x0, zg, ab, monta: { platoA: plato, brazoA: enPlato, platoB: tapa(plato), brazoB: tapa(enPlato) }, ganchoA: t + zh, ganchoB: H - t - zh, hiloCentro: 2 * (t + zh) - H, hiloBorde: H - 2 * t };
}
// PIEDRAS ZEN (meditación): un montón de piedras en equilibrio. Cada piedra es redonda por arriba y con la panza a 45° por
// debajo: sale sin soportes, y el montón se sostiene porque su centro de gravedad cae DENTRO de la base (se calcula)
export function piedrasZen(p) {
  const nP = Math.max(3, Math.min(9, Math.round(p.piedras))), R0 = p.d / 2; let z = 0, m = null, x = 0, y = 0; const rnd = (i, k) => { const v = Math.sin((i + 1) * 12.9898 * (k + 1) + (p.semilla || 7) * 78.233) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < nP; i++) {
    const R = R0 * Math.pow(0.80, i) * (0.92 + 0.16 * rnd(i, 0)), hh = R * (0.50 + 0.16 * rnd(i, 1)), base = i === 0 ? R * 0.62 : Math.min(R * 0.5, R0 * Math.pow(0.80, i - 1) * 0.42), panza = Math.min(hh * 0.5, R - base), P = [[0, 0], [base, 0], [base + panza, panza]];
    for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI / 2; P.push([(base + panza) * Math.cos(a) + (R - base - panza) * (Math.cos(a) > 0 ? Math.pow(Math.cos(a), 0.5) : 0), panza + (hh - panza) * Math.sin(a)]); }
    const piedra = revol(P.filter((q, j) => j < 3 || q[0] > 0.01).concat([[0, hh]]), 72).scale([1, 0.86 + 0.14 * rnd(i, 2), 1]).rotate([0, 0, 360 * rnd(i, 3)]);
    if (i > 0) { const d = R0 * Math.pow(0.80, i - 1) * 0.16 * p.atrevido / 100, a = 2 * Math.PI * rnd(i, 4); x += d * Math.cos(a); y += d * Math.sin(a); }
    m = m ? m.add(piedra.translate([x, y, z - 0.6])) : piedra; z += hh - 0.6;
  }
  return { m, alto: z, base: R0 * 0.62 };
}

export const DISENOS_PREMIUM = {
  jarronLujo: { cat: 'jarrones', e: '💎', t: 'Jarrón de lujo', d: '5 formas × 6 pieles: espiral facetada, diamantes, olas, plisado, seda…', uso: 'jarron', color: '#e8c9a0',
    campos: [s('forma', 'Forma', 'anfora', Object.entries(FORMAS).map(([k, v]) => [k, v[0]])), s('piel', 'Piel', 'diamante', Object.entries(PIELES).map(([k, v]) => [k, v[0]])), n('h', 'Alto', 160, 60, 250), n('d', 'Diámetro (lo más ancho)', 95, 40, 220), n('n', 'Cuántas veces se repite el dibujo', 12, 3, 40, 1, ''), n('giro', 'Cuánto se retuerce', 60, -360, 360, 5, '°'), n('relieve', 'Relieve del dibujo', 2.2, 0, 8, 0.1), n('pared', 'Pared (0 = macizo, para «Jarrón en espiral»)', 0, 0, 5, 0.2), c('firma', 'Firma «CelebriDiseños» discreta por debajo', true)],
    gen(p) { const m = jarronLujo(p); return p.firma ? firmaAbajo(m, p.d * 0.5 * 1.25 * (FORMAS[p.forma] || FORMAS.anfora)[1](0)) : m; },
    nota: p => (p.pared > 0 ? 'Con pared de ' + n2(p.pared) + ' mm: se imprime normal (aguanta agua si le das 3 paredes).' : 'Sale MACIZO a propósito: en Bambu Studio elige «Jarrón en espiral» y lo imprime de una sola pared, sin costura (para agua, usa boquilla de 0,6 o dale pared aquí).') + ' ' + (FORMAS[p.forma] || FORMAS.anfora)[0] + ' con piel «' + (PIELES[p.piel] || PIELES.lisa)[0].toLowerCase() + '». En filamento seda o bicolor queda de escaparate.' },
  macetaAutorriego: { cat: 'macetas', e: '💧', t: 'Maceta de autorriego', d: 'Depósito de agua y maceta con pie que la chupa: riegas cada 2 semanas', uso: 'encaje', color: '#7fb77e',
    campos: [n('d', 'Diámetro', 110, 60, 220), n('h', 'Alto total', 110, 60, 220), n('pared', 'Pared', 2, 1.6, 4, 0.2), s('que', 'Qué imprimo', 'todo', [['todo', 'Las dos piezas'], ['dep', 'Solo el depósito'], ['mac', 'Solo la maceta']]), c('firma', 'Firma «CelebriDiseños» discreta por debajo', true)],
    gen(p) { const A = autorriego(p); if (p.firma) A.dep = firmaAbajo(A.dep, p.d * 0.62); if (p.que === 'dep') return A.dep; if (p.que === 'mac') return A.mac; return A.dep.add(A.mac.translate([p.d + 8, 0, 0])); },
    nota: p => { try { const A = autorriego(p); return 'Dos piezas: el DEPÓSITO (caben ' + n2(A.litros) + ' litros) y la MACETA, que se apoya en su borde y mete el pie en el agua. Llena el pie de tierra (o pasa una mecha por sus ranuras): la tierra chupa el agua sola. Por la muesca del depósito ves cuánta queda y la rellenas. PETG, 3 paredes (el PLA con agua se ablanda al sol).'; } catch (e) { return '⚠️ ' + e.message; } finally { N.limpia(); } } },
  tornilloTuerca: { cat: 'mecanica', e: '🔩', t: 'Tornillo y tuerca impresos', d: 'Rosca gorda que sale bien en plástico: enroscan a mano', uso: 'encaje', color: '#8a8f98',
    campos: [n('d', 'Diámetro de la rosca', 12, 6, 40, 1), n('paso', 'Paso de la rosca', 3, 1.5, 8, 0.5), n('largo', 'Largo de la rosca', 30, 8, 150), n('cabeza', 'Alto de la cabeza', 7, 3, 20), n('ec', 'Cabeza: entre caras (0 = automático)', 0, 0, 70, 1), n('tuerca', 'Alto de la tuerca', 10, 4, 40), s('que', 'Qué imprimo', 'todo', [['todo', 'Tornillo y tuerca'], ['tor', 'Solo el tornillo'], ['tue', 'Solo la tuerca']])],
    gen(p) { const T = tornilloTuerca(p); if (p.que === 'tor') return T.tor; if (p.que === 'tue') return T.tue; return T.tor.add(T.tue.translate([T.ec * 1.3 + 4, 0, 0])); },
    nota: p => { try { const T = tornilloTuerca(p); return 'Rosca de Ø' + n2(p.d) + ' con paso ' + n2(T.paso) + ' (redondeada y con tu holgura «gira» + 0,1 en la tuerca: enrosca a mano). Cabeza y tuerca hexagonales de ' + n2(T.ec) + ' mm entre caras. El tornillo se imprime DE PIE sobre su cabeza y la tuerca tumbada, sin soportes. Para apretar de verdad: PETG, 4 paredes.'; } catch (e) { return '⚠️ ' + e.message; } finally { N.limpia(); } } },
  miniPuerta: { cat: 'miniaturas', e: '🚪', t: 'Mini puerta que se abre', d: 'Marco y hoja con cuarterones; un trozo de filamento hace de bisagra', uso: 'encaje', color: '#b98b5e',
    campos: [n('alto', 'Alto de la hoja', 160, 40, 240), n('ancho', 'Ancho de la hoja', 66, 20, 120), n('grosor', 'Grosor', 3, 2.4, 6, 0.2), n('marco', 'Ancho del marco', 8, 4, 20), n('paneles', 'Cuarterones', 4, 2, 8, 2, ''), n('pasador', 'Eje de la bisagra (filamento)', 1.75, 1.5, 3, 0.05)],
    gen(p) { const Q = miniPuerta(p); return Q.marco.add(Q.hoja); },
    nota: p => { let a = 0; try { a = abreMiniPuerta(p); } catch (e) { return '⚠️ ' + e.message; } return 'COMPROBADA: abre ' + a + '° hacia delante sin tropezar. Sale tumbada, con la hoja YA colocada dentro de su marco (dos piezas sueltas). Corta ' + n2(miniLargoEje(p)) + ' mm de filamento de ' + n2(p.pasador) + ' y mételo por la bisagra, de arriba abajo: ese es el eje. Escala 1:12 con las medidas de partida (una puerta de 2 m). Para venderla, queda preciosa en PLA mate color madera o blanco.'; } },
  miniMesa: { cat: 'miniaturas', e: '🪑', t: 'Mini mesa', d: 'Tablero redondeado y patas torneadas: sale de una pieza', uso: 'deco', color: '#b98b5e',
    campos: [n('largo', 'Largo', 90, 20, 220), n('ancho', 'Ancho', 55, 15, 200), n('alto', 'Alto', 62, 10, 150), n('tablero', 'Grosor del tablero', 3, 1.6, 8, 0.2), n('pata', 'Grosor de las patas', 6, 3, 14, 0.5), c('faldon', 'Con faldón bajo el tablero', true)],
    gen(p) { return miniMesa(p); },
    nota: () => 'Se imprime BOCA ABAJO (el tablero en la cama, las patas hacia arriba): sin soportes y con el tablero liso. Escala 1:12 de partida (mesa de comedor). Cambia las medidas y tienes mesita de noche, mesa baja o banco.' },
  miniTaburete: { cat: 'miniaturas', e: '🪵', t: 'Mini taburete', d: 'Asiento redondo y patas abiertas, con su aro', uso: 'deco', color: '#b98b5e',
    campos: [n('d', 'Diámetro del asiento', 28, 10, 80), n('alto', 'Alto', 40, 10, 120), n('asiento', 'Grosor del asiento', 3, 1.6, 8, 0.2), n('patas', 'Patas', 4, 3, 6, 1, ''), n('pata', 'Grosor de las patas', 4, 2.4, 10, 0.2), c('aro', 'Con aro reposapiés', true)],
    gen(p) { return miniTaburete(p); },
    nota: () => 'Se imprime BOCA ABAJO (el asiento en la cama). Las patas abren menos de 20°: sin soportes. Con el aro queda de bar; sin él y más bajo, de cocina.' },
  miniEstanteria: { cat: 'miniaturas', e: '📚', t: 'Mini estantería', d: 'Con las baldas que quieras y zócalo', uso: 'deco', color: '#f4f1ea',
    campos: [n('ancho', 'Ancho', 60, 15, 200), n('alto', 'Alto', 150, 20, 240), n('fondo', 'Fondo', 22, 8, 80), n('grosor', 'Grosor de las tablas', 2, 1.2, 5, 0.2), n('baldas', 'Baldas', 4, 1, 12, 1, ''), c('zocalo', 'Con zócalo abierto abajo', true)],
    gen(p) { return miniEstanteria(p); },
    nota: () => 'Se imprime TUMBADA sobre su espalda: todas las tablas quedan de pie y salen rectas, sin soportes. Escala 1:12 de partida (librería de 1,80 m).' },
  miniCasita: { cat: 'miniaturas', e: '🏡', t: 'Mini casita', d: 'Paredes con puerta y ventanas de arco, y tejado a dos aguas que se quita', uso: 'encaje', color: '#f2e6d0',
    campos: [n('largo', 'Largo', 110, 40, 240), n('fondo', 'Fondo', 80, 30, 200), n('alto', 'Alto de las paredes', 70, 25, 180), n('pared', 'Pared', 2.4, 1.6, 5, 0.2), n('tejado', 'Inclinación del tejado', 45, 45, 65, 1, '°'), n('alero', 'Alero', 5, 4, 15), s('que', 'Qué imprimo', 'todo', [['todo', 'Casa y tejado'], ['casa', 'Solo las paredes'], ['tejado', 'Solo el tejado']])],
    gen(p) { const Q = miniCasita(p); if (p.que === 'casa') return Q.cuerpo; if (p.que === 'tejado') return Q.tejado; return Q.cuerpo.add(Q.tejado.translate([p.largo + 2 * Math.max(4, p.alero) + 10, 0, 0])); },
    nota: p => 'Dos piezas: las PAREDES (de pie; la puerta y las ventanas acaban en arco para que el dintel se imprima solo) y el TEJADO a ' + Math.max(45, Math.round(p.tejado)) + '° (se imprime tal cual, sin soportes), que es una TAPA: baja un poco por fuera de las paredes y se centra sola. Sirve de casita de pueblo, de pájaros de adorno, de lamparita con una vela LED dentro o de maqueta.' },
  trianguloImposible: { cat: 'deco', e: '🔺', t: 'Triángulo imposible', d: 'Tres barras rectas que, desde un punto, parecen un triángulo que no puede existir', uso: 'deco', color: '#ffffff',
    campos: [n('largo', 'Largo de cada barra', 90, 40, 200), n('barra', 'Grosor de las barras', 16, 8, 40), c('firma', 'Firma «CelebriDiseños» discreta por debajo', true)],
    gen(p) { const m = trianguloImposible(p); return p.firma ? firmaAbajo(m, p.largo * 0.5, p.largo * 0.5, p.barra / 2) : m; },
    nota: () => 'El truco: son tres barras en ángulo recto que NO se cierran. Ponlo sobre la mesa, cierra un ojo y míralo desde arriba y en diagonal, alineando la punta biselada de la barra que sube con la barra del fondo (la del puntito): de repente «se cierra» en un triángulo imposible. Hazle la foto desde ahí: es la que vende. Sin soportes, tal como sale.' },
  pajaroEquilibrista: { cat: 'deco', e: '🦅', t: 'Pájaro equilibrista', d: 'Se sostiene solo sobre el pico en la punta de un dedo: parece magia y es física', uso: 'deco', color: '#00a4e4',
    campos: [n('envergadura', 'De punta a punta de las alas', 150, 80, 240), n('grosor', 'Grosor', 2, 1.6, 5, 0.2), n('peso', 'Alto de los pesos de las alas', 16, 6, 30), c('peana', 'Con su peana (acaba en punta)', true)],
    gen(p) { return pajaroEquilibrista(p).m; },
    nota: p => { try { const Q = pajaroEquilibrista(p), bien = Q.enDedo > 0.15; return 'CALCULADO: el centro de gravedad queda a ' + n2(Math.abs(Q.G.y - Q.yP)) + ' mm del apoyo en horizontal y, al darle la vuelta, ' + n2(Q.enPunta) + ' mm POR DEBAJO del apoyo sobre la punta de la peana (' + n2(Q.enDedo) + ' mm sobre un dedo): ' + (bien ? 'se sostiene solo y, si lo empujas, vuelve.' : '⚠️ así se cae: sube el alto de los pesos o baja el grosor.') + ' Se imprime tal cual, con los pesos hacia ARRIBA; para usarlo le das la vuelta (los pesos cuelgan) y apoyas el hoyito del pico en la punta de la peana, en un lápiz o en un dedo. Imprímelo MACIZO (100 % de relleno): los pesos tienen que pesar.'; } catch (e) { return '⚠️ ' + e.message; } finally { N.limpia(); } } },
  tensegridad: { cat: 'deco', e: '🪄', t: 'Mesa que flota (tensegridad)', d: 'La tapa cuelga de un hilo y no toca la base: parece imposible', uso: 'encaje', color: '#1b1b1d',
    campos: [n('d', 'Diámetro de los platos', 90, 50, 200), n('alto', 'Alto total', 90, 50, 220), n('grosor', 'Grosor de los platos', 4, 3, 8, 0.5), n('brazo', 'Grosor de los brazos', 5, 4, 10, 0.5), s('que', 'Qué imprimo', 'todo', [['todo', 'Las 4 piezas'], ['prueba', '🧪 Solo la PRUEBA DE ENCAJE (un brazo y un trocito de plato)']]), c('firma', 'Firma «CelebriDiseños» discreta por debajo', true)],
    gen(p) { const Q = tensegridad(p), b = N.caja(Q.brazo); if (p.firma && p.que !== 'prueba') Q.plato = firmaAbajo(Q.plato, p.d * 0.42, -p.d * 0.2, 0);
      if (p.que === 'prueba') return Q.plato.intersect(caja6(Q.x0 - Q.ranL - 6, Q.x0 + 6, -9, 9, -1, 99)).add(Q.brazo.translate([p.d / 2 + 6 - b.min[0], 0, 0]));
      return N.union([Q.plato, Q.plato.translate([p.d + 5, 0, 0]), Q.brazo.translate([-p.d / 2 - 8 - b.max[0], -b.dims[1] - 3, 0]), Q.brazo.translate([-p.d / 2 - 8 - b.max[0], 3, 0])]); },
    nota: p => { try { const Q = tensegridad(p); return 'Cuatro piezas planas: 2 PLATOS iguales y 2 BRAZOS iguales. Cada brazo entra A PRESIÓN en la ranura de su plato (tu holgura «a presión»: imprime antes la 🧪 prueba). Un plato va boca arriba y el otro boca abajo, con los brazos cruzados en el centro. Hilos (de coser fuerte o de pescar): UNO corto de gancho a gancho en el centro, de ' + n2(Q.hiloCentro) + ' mm entre agujeros (este aguanta todo el peso: el gancho de abajo queda POR ENCIMA del de la tapa), y TRES en el borde, de plato a plato, de ' + n2(Q.hiloBorde) + ' mm, tensos. Al tensarlos, la tapa se queda flotando. Sin soportes.'; } catch (e) { return '⚠️ ' + e.message; } finally { N.limpia(); } } },
  piedrasZen: { cat: 'deco', e: '🪨', t: 'Piedras zen en equilibrio', d: 'Un montón de piedras de meditación: cada vez sale uno distinto', uso: 'deco', color: '#9aa3a8',
    campos: [n('piedras', 'Piedras', 5, 3, 9, 1, ''), n('d', 'Diámetro de la de abajo', 70, 30, 160), n('atrevido', 'Cuánto se descentran', 60, 0, 100, 5, '%'), n('semilla', 'Otro montón (cambia el número)', 7, 1, 999, 1, ''), c('firma', 'Firma «CelebriDiseños» discreta por debajo', true)],
    gen(p) { const Q = piedrasZen(p); return p.firma ? firmaAbajo(Q.m, Q.base * 1.5) : Q.m; },
    nota: p => { try { const Q = piedrasZen(p), G = centroDeGravedad(Q.m), d = Math.hypot(G.x, G.y); return 'CALCULADO: el centro de gravedad cae a ' + n2(d) + ' mm del centro de la base, que tiene ' + n2(Q.base) + ' mm de radio: ' + (d < Q.base * 0.8 ? 'se sostiene con margen.' : '⚠️ está muy al borde: baja «cuánto se descentran».') + ' Es UNA pieza (las piedras salen pegadas), de ' + n2(Q.alto) + ' mm de alto, sin soportes: cada piedra lleva la panza a 45°. En gris mármol o en piedra mate parece de verdad.'; } catch (e) { return '⚠️ ' + e.message; } finally { N.limpia(); } } },
};
function miniLargoEje(p) { return p.alto * 0.90; }
