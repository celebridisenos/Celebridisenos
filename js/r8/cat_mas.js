// ================= v30.6 · MÁS CATÁLOGO =================
// La dueña (11-10-2026, tras imprimir la 30.4 y partírsele las cajas): «PON MÁS ACCESORIOS, MÁS ESTILOS DE CAJA, MÁS TIPOS DE BISAGRA,
// MÁS VASOS, JARRONES, MÁS TIPOS DE DECORACIONES». Diseños propios (© CelebriDiseños). Regla de esta tanda, aprendida a golpes:
// NADA FINO. Paredes de 2,4 mm o más, ejes de 4 mm o más, y los agujeros TUMBADOS con sitio de sobra (salen ~0,15 más pequeños):
// agarre = eje + 0,3 · giro = eje + 0,6. Lo que encaja se comprueba en el ordenador (se monta y se mueve) y se dice lo que NO se
// puede saber sin imprimir.
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, M, CS, seg, circ, rr, poli, cil, cono, caja, n2, R2, suave, enFila } = A;
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cilX = (d, x0, x1, y = 0, z = 0) => M().cylinder(x1 - x0, d / 2, d / 2, seg(d)).rotate([0, 90, 0]).translate([x0, y, z]);
const cilY = (d, y0, y1, x = 0, z = 0) => M().cylinder(y1 - y0, d / 2, d / 2, seg(d)).rotate([-90, 0, 0]).translate([x, y0, z]);
const memo = (fn, tope = 40) => { const C = new Map(); return p => { const k = JSON.stringify(p); if (C.has(k)) return C.get(k); const r = N.enAmbito(() => fn(p)); if (C.size > tope) C.clear(); C.set(k, r); return r; }; };
// ---------- recipientes de revolución y prismas «por pisos» ----------
const perfilRev = (h, rad, pasos = 72) => { const P = [[0, 0]]; for (let i = 0; i <= pasos; i++) { const t = i / pasos; P.push([Math.max(0.3, rad(t)), t * h]); } P.push([0, h]); return CS().ofPolygons([N.ccw(P)]).revolve(seg(rad(0.5) * 2) * 2); };
const recipiente = (h, rad, pared, fondo = 2.4, pasos = 72) => { const fuera = perfilRev(h, rad, pasos); if (!(pared > 0)) return fuera;
  const P = [[0, fondo]]; for (let i = 0; i <= pasos; i++) { const z = fondo + (i / pasos) * (h - fondo + 1); P.push([Math.max(0.2, rad(Math.min(1, z / h)) - pared), z]); } P.push([0, h + 1]);
  return fuera.subtract(CS().ofPolygons([N.ccw(P)]).revolve(seg(rad(0.5) * 2) * 2)); };
const pol = (lados, r, ang) => poli(N.poligono2(lados, 2 * r, ang));
// un cuerpo que cambia de tamaño y gira al subir, piso a piso (entre dos pisos, caras planas: aspecto facetado)
const porPisos = (h, pisos, sec, z0 = 0, z1 = h) => { const L = []; for (let i = 0; i < pisos; i++) { const ta = i / pisos, tb = (i + 1) / pisos, za = z0 + (z1 - z0) * ta, zb = z0 + (z1 - z0) * tb; L.push(M().hull([sec(za / h).extrude(0.01).translate([0, 0, za]), sec(zb / h).extrude(0.01).translate([0, 0, zb - 0.01])])); } return N.union(L); };
// vasija de polígono: por fuera r(t) y giro(t); por dentro lo mismo menos la pared (medida de cara a cara), con su fondo
function vasijaPol(p, r, giro, pisos) {
  const L = Math.max(3, Math.round(p.lados)), k = 1 / Math.cos(Math.PI / L), fuera = porPisos(p.h, pisos, t => pol(L, r(t), giro(t)));
  if (!(p.pared > 0)) return fuera;
  const fondo = 2.4, dentro = porPisos(p.h, pisos, t => pol(L, Math.max(0.5, r(t) - p.pared * k), giro(t)), fondo, p.h).add(pol(L, Math.max(0.5, r(1) - p.pared * k), giro(1)).extrude(2).translate([0, 0, p.h - 0.01]));
  return fuera.subtract(dentro);
}
const notaVasija = (p, extra = '') => (p.pared > 0 ? 'Hueco, con pared de ' + n2(p.pared) + ' mm y fondo de 2,4: se imprime normal, sin soportes. ' : 'MACIZO a propósito: en Bambu Studio activa «Jarrón en espiral» y sale con una sola pared y sin costura. ') + extra;
const usoVasija = p => (p.pared > 0 ? 'deco' : 'jarron');
const PARED = n('pared', 'Pared (0 = macizo, para «Jarrón en espiral»)', 2.4, 0, 5, 0.2);

// ======================= 🔗 BISAGRA FUERTE DE DOS HOJAS (se imprime en dos piezas y se une con SU eje) =======================
// Dos hojas planas con nudos gordos (Ø10) y el eje que tú elijas: un trozo de filamento, un pasador impreso de Ø4 o un tornillo M3.
// Cada hoja se imprime tumbada (los nudos apoyan con su parte plana). Los nudos de la hoja A AGARRAN el eje; los de la B giran.
const EJES = { filamento: { t: 'un trozo de tu filamento de 1,75', d: 1.75 }, impreso: { t: 'el pasador impreso de Ø4 (sale al lado)', d: 4 }, tornillo: { t: 'un tornillo M3', d: 3 } };
function bisagraFuertePiezas(p) {
  const LsT = p.eje === 'tornillo' ? [16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].reduce((a2, b2) => (Math.abs(b2 - (p.largo - 2.4)) < Math.abs(a2 - (p.largo - 2.4)) ? b2 : a2)) : 0; // con tornillo, el largo se ajusta al tornillo que existe
  const E = EJES[p.eje] || EJES.impreso, t = Math.max(2.4, p.grosor), Rk = Math.max(5, t + 1.2), L = LsT ? LsT + 2.4 : Math.max(20, p.largo), nN = Math.max(3, Math.round(p.nudos) | 1), ga = 0.5, sN = (L - (nN - 1) * ga) / nN, an = Math.max(12, p.ancho);
  if (sN < 5) N.mal('Demasiados nudos para ese largo: pon menos (cada nudo tiene que medir al menos 5 mm).');
  const rAgarre = E.d / 2 + 0.15, rGiro = E.d / 2 + 0.3, nud = i => [-L / 2 + i * (sN + ga), -L / 2 + i * (sN + ga) + sN];
  // perfil de un nudo con su «pie» plano (para imprimirlo tumbado sin soportes): círculo + bloque hasta la cama
  const nudo = (x0, x1) => cilX(2 * Rk, x0, x1, 0, Rk).add(cubo(x0, x1, -Rk, Rk, 0, Rk)).intersect(cubo(x0, x1, -Rk, Rk, 0, 2 * Rk));
  let Ha = cubo(-L / 2, L / 2, -Rk - an, -Rk + 0.01, 0, t), Hb = cubo(-L / 2, L / 2, Rk - 0.01, Rk + an, 0, t);
  for (let i = 0; i < nN; i++) { const [x0, x1] = nud(i); if (i % 2 === 0) Ha = Ha.add(nudo(x0, x1).intersect(cubo(x0, x1, -Rk, Rk, 0, 2 * Rk))); else Hb = Hb.add(nudo(x0, x1)); }
  // cada hoja deja sitio a los nudos de la otra (0,5 alrededor) y solo conserva su mitad del «pie»
  const sitio = (i) => { const [x0, x1] = nud(i); return cubo(x0 - ga, x1 + ga, -Rk - 0.5, Rk + 0.5, -1, 2 * Rk + 1); };
  for (let i = 0; i < nN; i++) { if (i % 2 === 0) Hb = Hb.subtract(sitio(i)); else Ha = Ha.subtract(sitio(i)); }
  // el agujero del eje: agarra en A (y el último nudo de A rosca el tornillo), gira en B
  Ha = Ha.subtract(cilX(2 * rAgarre, -L / 2 - 1, L / 2 + 1, 0, Rk)); Hb = Hb.subtract(cilX(2 * rGiro, -L / 2 - 1, L / 2 + 1, 0, Rk));
  if (p.eje === 'tornillo') { const [x0] = nud(nN - 1); Ha = Ha.add(nudo(x0, L / 2).subtract(cilX(2.6, x0 - 1, L / 2 + 1, 0, Rk))).subtract(cilX(6.2, -L / 2 - 1, -L / 2 + 2.4, 0, Rk)); } // rosca en el último nudo y hueco para la cabeza en el primero
  // agujeros avellanados para atornillar las hojas
  const ag = Math.max(0, Math.round(p.agujeros));
  if (ag > 0) { const uno = (x, y) => cil(3.6, t + 2, -1).translate([x, y, 0]).add(M().cylinder(1.9, 1.8, 3.7, 24).translate([x, y, t - 1.89])); for (let k = 0; k < ag; k++) { const x = -L / 2 + (k + 0.5) * L / ag; Ha = Ha.subtract(uno(x, -Rk - an / 2 - 1)); Hb = Hb.subtract(uno(x, Rk + an / 2 + 1)); } }
  const pin = p.eje === 'impreso' ? cilX(4, 0, L + 0.6, 0, 0).add(cilX(8, -2, 0.01, 0, 0)).intersect(cubo(-3, L + 2, -5, 5, -1.7, 5)).translate([0, 0, 1.7]) : null; // plano por debajo: se imprime tumbado
  return { A: Ha, B: Hb, pin, Rk, t, L, an, nN, sN, E, rGiro, LsT };
}
const giroBisagraFuerte = memo(p => { const H = bisagraFuertePiezas(p); let abre = 0, cierra = 0; const gira = a => H.B.translate([0, 0, -H.Rk]).rotate([a, 0, 0]).translate([0, 0, H.Rk]);
  for (let a = 5; a <= 180; a += 5) { if (gira(a).intersect(H.A).volume() > 0.01) break; abre = a; } for (let a = 5; a <= 180; a += 5) { if (gira(-a).intersect(H.A).volume() > 0.01) break; cierra = a; }
  return { abre, cierra, plano: H.B.intersect(H.A).volume(), pared: Math.round((H.Rk - H.rGiro) * 100) / 100, sN: Math.round(H.sN * 10) / 10, LsT: H.LsT, L: H.L }; });

// ======================= 🗄️ CAJA CON CAJÓN =======================
// Una funda (abierta por delante) y su cajón, con tirador de una pieza. 0,3 mm de aire por lado: corre sin atascarse.
function cajonPiezas(p) {
  const X = Math.max(40, p.x), Y = Math.max(40, p.y), Z = Math.max(20, p.z), w = Math.max(2, p.pared), a = 0.3;
  // la FUNDA, de pie (como se imprime): el fondo cerrado en la cama y la boca hacia arriba; por dentro, esquinas casi vivas para que el cajón no roce
  const funda = rr(X, Z, 3).extrude(Y).subtract(rr(X - 2 * w, Z - 2 * w, 0.5).extrude(Y).translate([0, 0, w]));
  // el CAJÓN, boca arriba (como se imprime): bandeja de cuatro paredes y, delante, un tirador en lazo que sube desde la cama (sin soportes)
  const xi = X - 2 * w - 2 * a, zi = Z - 2 * w - 2 * a, yi = Y - w - a, tw = Math.min(40, xi * 0.45), th = Math.min(zi, Math.max(8, zi * 0.55));
  let cajon = rr(xi, yi, 1).extrude(zi).subtract(rr(xi - 2 * w, yi - 2 * w, 0.8).extrude(zi).translate([0, 0, w]));
  cajon = cajon.add(rr(tw, 14, 5).translate([0, -yi / 2 - 5]).subtract(rr(tw - 8, 7, 3).translate([0, -yi / 2 - 5.5])).extrude(th));
  return { funda, cajon, X, Y, Z, w, a, xi, yi, zi };
}
// montada: la funda tumbada (boca en y = 0, mirando a −Y) y el cajón dentro; «sale» = cuánto se ha sacado
const cajonMontado = (K, sale = 0) => ({ funda: K.funda.rotate([90, 0, 0]).translate([0, K.Y, K.Z / 2]), cajon: K.cajon.translate([0, K.yi / 2 - sale, K.w + K.a]) });
const pruebaCajon = memo(p => { const K = cajonPiezas(p); let roce = 0; for (const sale of [0, 5, K.Y * 0.25, K.Y * 0.5, K.Y * 0.8]) { const Mo = cajonMontado(K, sale); roce = Math.max(roce, Mo.cajon.intersect(Mo.funda).volume()); }
  const Mo = cajonMontado(K, 0); let justo = 0; for (const v of [[0.2, 0, 0], [-0.2, 0, 0], [0, 0, 0.2], [0, 0, -0.2]]) justo = Math.max(justo, Mo.cajon.translate(v).intersect(Mo.funda).volume()); return { roce, justo, dentro: [K.xi - 2 * K.w, K.yi - 2 * K.w, K.zi - K.w].map(v => Math.round(v * 10) / 10) }; });

// ======================= ⬡ CAJA DE LADOS (hexagonal, octogonal, redonda…) CON TAPA =======================
function cajaLadosPiezas(p) {
  const L = Math.round(p.lados) >= 13 ? 0 : Math.max(3, Math.round(p.lados)), R = Math.max(20, p.d) / 2, w = Math.max(2, p.pared), h = Math.max(15, p.h), hol = Math.max(0.05, p.holgura), lab = 6, tg = 3;
  const k = L ? 1 / Math.cos(Math.PI / L) : 1, sec = (r, red = 0) => { const S = L ? pol(L, r * k, 90) : circ(2 * r); return L && red > 0.1 ? S.offset(-red, 'Round').offset(red, 'Round') : S; };
  const base = sec(R, 2).extrude(h).subtract(sec(R - w, 1).extrude(h).translate([0, 0, 2.4]));
  const tapa = sec(R, 2).extrude(tg).add(sec(R - w - hol, 1).extrude(lab + 0.01).translate([0, 0, tg - 0.01]).subtract(sec(R - w - hol - 2, 0.5).extrude(lab + 1).translate([0, 0, tg]))); // (boca abajo: como se imprime)
  return { base, tapa, R, w, h, hol, lab, tg, L };
}
const pruebaCajaLados = memo(p => { const K = cajaLadosPiezas(p), puesta = K.tapa.rotate([180, 0, 0]).translate([0, 0, K.h + K.tg]); let c0 = puesta.intersect(K.base).volume(), baila = 0; for (const d of [K.hol * 0.9, -K.hol * 0.9]) baila = Math.max(baila, puesta.translate([d, 0, 0]).intersect(K.base).volume()); return { c0, baila }; });

// ======================= 🧺 CUBETA APILABLE =======================
function cubetaPieza(p) {
  const X = Math.max(40, p.x), Y = Math.max(40, p.y), Z = Math.max(20, p.z), w = Math.max(2, p.pared), r = 5, esc = 4, a = 0.35;
  // el fondo se mete «esc» mm dentro de la boca de la de abajo: los 4 mm de abajo van más estrechos (pared + aire)
  const xn = X - 2 * w - 2 * a, yn = Y - 2 * w - 2 * a, rn = Math.max(1, r - w), z1 = esc + 0.3, z2 = z1 + w + a; // estrecha hasta z1 (0,3 por encima de la boca de la de abajo) y abre a 45° hasta z2
  const fuera = rr(xn, yn, rn).extrude(z1 + 0.01).add(M().hull([rr(xn, yn, rn).extrude(0.01).translate([0, 0, z1]), rr(X, Y, r).extrude(0.01).translate([0, 0, z2])])).add(rr(X, Y, r).extrude(Z - z2).translate([0, 0, z2 - 0.01]));
  const dentro = rr(xn - 2 * w, yn - 2 * w, 1).extrude(z1 + 1.2 - 2.4).translate([0, 0, 2.4]).add(M().hull([rr(xn - 2 * w, yn - 2 * w, 1).extrude(0.01).translate([0, 0, z1 + 1.2]), rr(X - 2 * w, Y - 2 * w, rn).extrude(0.01).translate([0, 0, z2 + 1.2])])).add(rr(X - 2 * w, Y - 2 * w, rn).extrude(Z - z2).translate([0, 0, z2 + 1.19]));
  let m = fuera.subtract(dentro);
  if (p.boca) { const bw = Math.min(X * 0.55, 70), bh = Math.min(Z * 0.45, 28); m = m.subtract(M().hull([rr(bw, 2 * w + 2, 0).extrude(0.01).translate([0, -Y / 2, Z - bh]), rr(bw + 2 * bh * 0.6, 2 * w + 2, 0).extrude(0.01).translate([0, -Y / 2, Z + 0.5])])); } // boca delante para meter la mano
  return { m, X, Y, Z, esc, a };
}
const pruebaCubeta = memo(p => { const K = cubetaPieza(p), arriba = K.m.translate([0, 0, K.Z - K.esc]); let c0 = arriba.intersect(K.m).volume(), baila = 0; for (const v of [[0.3, 0, 0], [-0.3, 0, 0], [0, 0.3, 0], [0, -0.3, 0]]) baila = Math.max(baila, arriba.translate(v).intersect(K.m).volume()); return { c0, baila }; });

// ======================= 🔘 POMO Y ASA (para cajones, cajas y puertas) =======================
function pomoPieza(p) {
  const d = Math.max(12, p.d), h = Math.max(10, p.alto), cu = Math.max(8, d * 0.5), E = p.estilo || 'seta';
  const P = E === 'bola' ? (() => { const L = [[cu / 2, 0], [cu / 2, h * 0.35]]; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + Math.PI * i / 24 * 0.98 + 0.4; const r = d / 2, x = r * Math.cos(a), z = h - r + r * Math.sin(a); if (z > h * 0.35 && x > 0.2) L.push([x, z]); } return L; })()
    : E === 'cilindro' ? [[d / 2 - 1, 0], [d / 2, 1], [d / 2, h - 1.5], [d / 2 - 1.5, h]]
      : [[cu / 2 + 1.5, 0], [cu / 2, 2], [cu / 2, h * 0.45], [d / 2, h * 0.72], [d / 2, h - 2.5], [d / 2 - 2.5, h]]; // seta: cuello y cabeza con voladizo de 45° como mucho
  let m = A.torno(P, d);
  const T = N.TORNILLOS[String(p.tornillo)] || N.TORNILLOS['4'], Mt = Number(p.tornillo) || 4, hondo = Math.min(h - 3, 12);
  m = m.subtract(cil(Mt * 0.85, hondo + 0.01, -0.01)); void T; // el tornillo entra por detrás del cajón y hace su rosca en el pomo
  return { m, hondo, Mt };
}
function asaPieza(p) {
  const L = Math.max(40, p.entre), an = Math.max(10, p.ancho), al = Math.max(18, p.alto), g = Math.max(6, p.grueso), Mt = Number(p.tornillo) || 4, ext = L + an;
  // de lado (como se imprime): un arco plano. Perfil en (x, z): dos patas y el puente, con el hueco para los dedos redondeado
  const perfil = rr(ext, al, Math.min(al * 0.45, an * 0.8)).translate([0, al / 2]).subtract(rr(ext - 2 * an, al - g, Math.min((al - g) * 0.6, 10)).translate([0, (al - g) / 2 - 0.01])).subtract(rr(ext + 2, al, 0).translate([0, -al / 2])); // (se corta lo de debajo de la base)
  let m = perfil.extrude(g).rotate([90, 0, 0]).translate([0, g / 2, 0]); // de pie, para verla y comprobarla; se imprime tumbada
  [-L / 2, L / 2].forEach(x => { m = m.subtract(cil(Mt * 0.85, Math.min(al - g - 1, 12) + 0.01, -0.01).translate([x, 0, 0])); });
  return { m, L, Mt };
}

// ======================= ⭐ DECORACIÓN =======================
function estrellaPieza(p) {
  const R = Math.max(20, p.d) / 2, pts = Math.max(4, Math.round(p.puntas)), r = R * Math.max(0.25, Math.min(0.75, p.hondo / 100)), h = Math.max(4, p.alto);
  let m = poli(N.estrella2(pts, R, r, 90)).extrude(h, 0, 0, [0.03, 0.03]);
  if (p.colgar) m = m.subtract(cil(9, 2.4, -0.01).add(caja(4.2, R * 0.3, 2.4).translate([0, R * 0.15, -0.01])).add(cil(4.2, 2.4, -0.01).translate([0, R * 0.3, 0]))); // ojal por detrás: entra la cabeza de un clavo y baja
  return m;
}
function diamantePieza(p) {
  const R = Math.max(10, p.d) / 2, L = Math.max(5, Math.round(p.caras)), cor = R * 0.5, pab = R * Math.max(1, p.punta / 100), k = 1 / Math.cos(Math.PI / L);
  // boca abajo (como se imprime): la «mesa» en la cama, sube ensanchando hasta la cintura (a 45°) y se cierra en la punta (45° o más)
  const gema = M().hull([pol(L, R * 0.55 * k, 90 + 180 / L).extrude(0.01), pol(2 * L, R, 90).extrude(0.5).translate([0, 0, cor]), cil(0.3, 0.2, cor + 0.5 + pab - 0.2)]);
  if (!p.aro) return gema;
  const ra = R * 0.62, aro = cil(2 * ra + 5, 6).subtract(cono(2 * ra - 3, 2 * ra + 1.5, 6.02, -0.01)); // el aro: se apoya la punta dentro y el diamante queda derecho
  return enFila([gema, aro], 8);
}
function arcoIrisPiezas(p) {
  const k = Math.max(2, Math.min(8, Math.round(p.arcos))), g = Math.max(6, p.grueso), a = 0.4, R0 = Math.max(10, p.hueco / 2), f = Math.max(10, p.fondo), L = [];
  for (let i = 0; i < k; i++) { const ri = R0 + i * (g + a), ro = ri + g; L.push(circ(2 * ro).subtract(circ(2 * ri)).subtract(rr(2 * ro + 2, ro + 1, 0).translate([0, -(ro + 1) / 2])).extrude(f)); }
  return { L, alto: R0 + k * (g + a), ancho: 2 * (R0 + k * (g + a)) };
}
function espiralPieza(p) {
  const R = Math.max(30, p.d) / 2, an = Math.max(4, p.ancho), hueco = Math.max(0.8, p.corte), paso = an + hueco, r0 = Math.max(10, p.centro / 2), vueltas = Math.max(1, (R - an - r0) / paso), N2 = Math.max(60, Math.round(vueltas * 72)), fuera = [], dentro = [];
  for (let i = 0; i <= N2; i++) { const th = (i / N2) * vueltas * 2 * Math.PI, r = r0 + paso * th / (2 * Math.PI); fuera.push([(r + an) * Math.cos(th), (r + an) * Math.sin(th)]); dentro.push([r * Math.cos(th), r * Math.sin(th)]); }
  let cs2 = poli(fuera.concat(dentro.reverse())).add(circ(2 * (r0 + an * 0.6)));
  const fin = fuera[fuera.length - 1], m = cs2.extrude(Math.max(1, p.grosor)).subtract(cil(3, 6, -1)).subtract(cil(2.6, 6, -1).translate([fin[0] * (1 - an / 2 / Math.hypot(fin[0], fin[1])), fin[1] * (1 - an / 2 / Math.hypot(fin[0], fin[1])), 0]));
  return { m, vueltas };
}

export const DISENOS_MAS = {
  // ---------- BISAGRAS ----------
  bisagraFuerte: { cat: 'mecanica', tambien: ['componentes', 'taller'], e: '🔗', t: 'Bisagra fuerte de dos hojas', d: 'Nudos gordos y el eje que tú elijas: filamento, pasador impreso o tornillo M3', uso: 'funcional', color: '#2b2f3a',
    campos: [s('que', 'Qué veo', 'cama', [['cama', 'Para imprimir (las dos hojas tumbadas)'], ['montada', '👀 Montada y abierta en plano (solo para mirar)'], ['doblada', '👀 Montada y doblada 90° (solo para mirar)']]), s('eje', 'El eje', 'impreso', [['impreso', 'Pasador impreso de Ø4 (no compras nada)'], ['filamento', 'Un trozo de tu filamento de 1,75'], ['tornillo', 'Tornillo M3 (el más fuerte)']]),
      n('largo', 'Largo', 50, 20, 240), n('ancho', 'Ancho de cada hoja', 22, 12, 80), n('grosor', 'Grosor de las hojas', 3.2, 2.4, 8, 0.2), n('nudos', 'Nudos (impar)', 5, 3, 21, 2, ''), n('agujeros', 'Agujeros de tornillo en cada hoja', 2, 0, 6, 1, '')],
    gen(p) { const H = bisagraFuertePiezas(p); if (p.que === 'montada') return H.A.add(H.B); if (p.que === 'doblada') return H.A.add(H.B.translate([0, 0, -H.Rk]).rotate([90, 0, 0]).translate([0, 0, H.Rk]));
      const L = [H.A, H.B.translate([0, 3, 0])]; let m = N.union(L); if (H.pin) m = m.add(H.pin.translate([-H.L / 2, -H.Rk - H.an - 8, 0])); return m; },
    nota: p => { let G; try { G = giroBisagraFuerte(p); } catch (e) { return '⚠️ ' + e.message; } const E = EJES[p.eje] || EJES.impreso;
      return (G.plano < 0.01 ? 'COMPROBADA EN EL ORDENADOR: montada, las hojas no se pisan y se dobla ' + G.abre + '° hacia un lado y ' + G.cierra + '° hacia el otro sin chocar' : '⚠️ Las hojas se pisan (' + n2(G.plano) + ' mm³): cambia los nudos') + '. Nudos de Ø' + n2(2 * Math.max(5, Math.max(2.4, p.grosor) + 1.2)) + ' y ' + n2(G.sN) + ' mm de largo, con ' + n2(G.pared) + ' mm de pared alrededor del eje. El eje es ' + E.t + ': en la hoja A el agujero es de Ø' + n2(E.d + 0.3) + ' (agarra) y en la B de Ø' + n2(E.d + 0.6) + ' (gira); llevan sitio de más porque los agujeros tumbados salen algo más pequeños. ' + (p.eje === 'tornillo' ? 'La bisagra mide ' + n2(G.L) + ' mm, a la medida de un tornillo M3 × ' + G.LsT + ': la cabeza queda escondida, pasa libre y se rosca en el último nudo entero (' + n2(G.sN) + ' mm), con la punta a ras. ' : p.eje === 'filamento' ? 'Corta el filamento 2 mm más largo y aplasta las puntas con algo caliente para que no se salga. ' : 'El pasador se imprime tumbado (va plano por debajo) y entra por el lado de la cabeza. ') + 'Cada hoja se imprime tumbada, sin soportes. Lo que NO se puede comprobar sin imprimir: si el eje entra suave con TU filamento (si entra duro, repasa el agujero con una broca de ' + n2(E.d + (p.eje === 'filamento' ? 0.25 : 0.2)) + ').'; } },
  // ---------- CAJAS ----------
  cajaCajon: { cat: 'organizar', tambien: ['hogar', 'taller'], e: '🗄️', t: 'Caja con cajón', d: 'Funda y cajón con tirador: sin bisagras ni cierres que se rompan', uso: 'encaje', color: '#c9a227',
    campos: [s('que', 'Qué veo', 'cama', [['cama', 'Para imprimir (funda de pie + cajón)'], ['montada', '👀 Montada (solo para mirar)'], ['abierta', '👀 Con el cajón a medio sacar (solo para mirar)']]), n('x', 'Ancho', 90, 40, 220), n('y', 'Fondo', 110, 40, 220), n('z', 'Alto', 45, 20, 150), n('pared', 'Paredes', 2.4, 2, 4, 0.2)],
    gen(p) { const K = cajonPiezas(p); if (p.que === 'montada' || p.que === 'abierta') { const Mo = cajonMontado(K, p.que === 'abierta' ? K.Y * 0.5 : 0); return Mo.funda.add(Mo.cajon); } return enFila([K.funda, K.cajon], 8); },
    nota: p => { let G; try { G = pruebaCajon(p); } catch (e) { return '⚠️ ' + e.message; } return (G.roce < 0.01 && G.justo < 0.01 ? 'COMPROBADA EN EL ORDENADOR: el cajón entra y sale entero sin rozar, con 0,3 mm de aire por lado (movido 0,2 mm hacia cualquier lado sigue sin tocar)' : '⚠️ El cajón roza (' + n2(Math.max(G.roce, G.justo)) + ' mm³)') + '. Por dentro del cajón caben ' + G.dentro.map(n2).join(' × ') + ' mm. La funda se imprime DE PIE (la boca hacia arriba) y el cajón boca arriba: ninguna necesita soportes. No lleva bisagras ni patillas: nada que se pueda partir.'; } },
  cajaLados: { cat: 'organizar', tambien: ['regalos', 'cuqui'], e: '⬡', t: 'Caja hexagonal (o de los lados que quieras) con tapa', d: 'Hexagonal, octogonal, cuadrada, triangular o redonda; tapa que entra con tu ajuste', uso: 'encaje', color: '#c08ee8',
    campos: [s('que', 'Qué veo', 'cama', [['cama', 'Para imprimir (caja + tapa boca abajo)'], ['cerrada', '👀 Cerrada (solo para mirar)']]), n('lados', 'Lados (13 = redonda)', 6, 3, 13, 1, ''), n('d', 'Ancho (de cara a cara)', 80, 30, 220), n('h', 'Alto', 50, 15, 200), n('pared', 'Paredes', 2.4, 2, 4, 0.2), n('holgura', 'Ajuste de la tapa (por lado)', 0.15, 0.05, 0.4, 0.05)],
    gen(p) { const K = cajaLadosPiezas(p); if (p.que === 'cerrada') return K.base.add(K.tapa.rotate([180, 0, 0]).translate([0, 0, K.h + K.tg + 0.03])); return enFila([K.base, K.tapa], 8); },
    nota: p => { let G; try { G = pruebaCajaLados(p); } catch (e) { return '⚠️ ' + e.message; } return (G.c0 < 0.01 ? 'COMPROBADA EN EL ORDENADOR: la tapa entra sin pisar la caja' + (G.baila < 0.01 ? ' y tiene ' + n2(p.holgura) + ' mm de juego por lado' : '') : '⚠️ La tapa pisa la caja (' + n2(G.c0) + ' mm³)') + '. Labio de 6 mm con 2 de grueso y tapa de 3: nada fino. ' + (p.holgura <= 0.1 ? 'Con ' + n2(p.holgura) + ' queda apretada (para que no se abra sola). ' : p.holgura >= 0.25 ? 'Con ' + n2(p.holgura) + ' entra y sale suelta. ' : 'Con ' + n2(p.holgura) + ' entra suave y no baila. ') + 'Las dos piezas se imprimen sin soportes (la tapa, boca abajo como sale).'; } },
  cubetaApilable: { cat: 'taller', tambien: ['organizar'], e: '🧺', t: 'Cubeta apilable', d: 'Para tornillos, piezas o juguetes: se montan unas sobre otras sin resbalar', uso: 'funcional', color: '#1565d8',
    campos: [n('x', 'Ancho', 100, 40, 240), n('y', 'Fondo', 140, 40, 240), n('z', 'Alto', 60, 20, 200), n('pared', 'Paredes', 2.4, 2, 4, 0.2), c('boca', 'Boca delante (para coger sin desapilar)', true)],
    gen(p) { return cubetaPieza(p).m; },
    nota: p => { let G; try { G = pruebaCubeta(p); } catch (e) { return '⚠️ ' + e.message; } return (G.c0 < 0.01 ? 'COMPROBADA EN EL ORDENADOR: una encima de otra, el fondo entra 4 mm en la boca de la de abajo sin pisarla' + (G.baila < 0.01 ? ' y con 0,35 mm de aire por lado' : ' (queda justa)') : '⚠️ Apiladas se pisan (' + n2(G.c0) + ' mm³)') + '. Paredes de ' + n2(Math.max(2, p.pared)) + ' mm y fondo de 2,4. Sin soportes (el escalón de abajo sube a 45°). Imprime dos antes de hacer la tanda entera y comprueba que apilan a tu gusto.'; } },
  // ---------- ACCESORIOS ----------
  pomoMueble: { cat: 'hogar', tambien: ['componentes', 'organizar'], e: '🔘', t: 'Pomo para cajón o puerta', d: 'Seta, bola o cilindro; se atornilla por detrás', uso: 'funcional', color: '#c9a227',
    campos: [s('estilo', 'Forma', 'seta', [['seta', 'Seta (cuello y cabeza)'], ['bola', 'Bola'], ['cilindro', 'Cilindro']]), n('d', 'Diámetro', 28, 12, 60), n('alto', 'Alto', 24, 10, 50), s('tornillo', 'Tornillo', '4', [['3', 'M3'], ['4', 'M4'], ['5', 'M5']])],
    gen(p) { return pomoPieza(p).m; },
    nota: p => { const K = N.enAmbito(() => { const q = pomoPieza(p); return { hondo: q.hondo, Mt: q.Mt }; }); return 'Se imprime de pie, sin soportes (la cabeza abre a 45° como mucho). Por debajo lleva un agujero de Ø' + n2(K.Mt * 0.85) + ' × ' + n2(K.hondo) + ' mm: el tornillo M' + K.Mt + ' entra por detrás del cajón y hace su rosca en el plástico (si lo vas a quitar y poner muchas veces, mejor PETG). Macizo: ponle 4 paredes en Bambu Studio y aguanta el tirón.'; } },
  asaMueble: { cat: 'hogar', tambien: ['componentes', 'taller'], e: '🫳', t: 'Asa (tirador de puente)', d: 'Para cajones, cajas de herramientas y puertas', uso: 'funcional', color: '#1b1b1d',
    campos: [n('entre', 'Entre tornillos', 96, 40, 192, 1), n('alto', 'Lo que sale', 30, 18, 60), n('ancho', 'Ancho de las patas', 14, 10, 30), n('grueso', 'Grueso', 10, 6, 20), s('tornillo', 'Tornillo', '4', [['3', 'M3'], ['4', 'M4'], ['5', 'M5']])],
    gen(p) { return asaPieza(p).m.rotate([90, 0, 0]); }, // tumbada: así las capas van a lo largo del asa (lo más fuerte)
    nota: p => 'Sale TUMBADA de lado: así las capas van a lo largo del arco y no se parte al tirar (de pie se rompería por las capas). Dos agujeros a ' + n2(Math.max(40, p.entre)) + ' mm para tornillos M' + p.tornillo + ' que entran por detrás y roscan en el plástico (Ø' + n2(Number(p.tornillo) * 0.85) + '). Las medidas habituales entre tornillos son 64, 96, 128 y 160 mm.' },
  // ---------- JARRONES ----------
  jarronBambu: { cat: 'jarrones', tambien: ['adultos'], e: '🎋', t: 'Jarrón bambú', d: 'Caña con sus nudos', uso: 'jarron', usoDe: usoVasija, color: '#8fcf5a',
    campos: [n('h', 'Alto', 190, 60, 250), n('d', 'Ancho', 62, 30, 160), n('nudos', 'Tramos', 4, 2, 9, 1, ''), n('resalte', 'Lo que salen los nudos', 3, 0.5, 8, 0.5), PARED],
    gen(p) { const R = p.d / 2, k = Math.max(2, Math.round(p.nudos)); return recipiente(p.h, t => { const f = (t * k) % 1, u = Math.min(f, 1 - f), nudo = Math.exp(-((u / 0.045) ** 2)); return R * (0.9 + 0.04 * Math.sin(Math.PI * f)) + p.resalte * nudo - (t > 0.999 ? 0 : 0); }, p.pared, 2.4, 40 * k); },
    nota: p => notaVasija(p, 'En verde mate parece una caña de verdad. Varios de alturas distintas juntos quedan muy bien.') },
  jarronGajos: { cat: 'jarrones', tambien: ['adultos'], e: '🏺', t: 'Jarrón de gajos', d: 'Panza con gajos, como una calabaza elegante', uso: 'jarron', usoDe: usoVasija, color: '#f4f4f0', acabado: 'seda',
    campos: [n('h', 'Alto', 150, 60, 250), n('d', 'Ancho de la panza', 120, 40, 220), n('boca', 'Ancho de la boca', 55, 20, 200), n('gajos', 'Gajos', 10, 4, 24, 1, ''), n('fuerza', 'Lo marcados que van', 3.5, 0.5, 10, 0.5), PARED],
    gen(p) { const R = p.d / 2, b = p.boca / 2; return N.deformar(recipiente(p.h, t => { const panza = R * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, 0.1 + t * 1.05)) ** 0.9), kk = suave((t - 0.7) / 0.3); return Math.max(b * 0.9, panza * (1 - kk) + b * kk); }, p.pared, 2.4), [{ t: 'ondas', n: Math.round(p.gajos), amp: p.fuerza, giro: 0 }]); },
    nota: p => notaVasija(p, 'Los gajos suben rectos (sin giro). En blanco o en seda queda muy fino.') },
  jarronTorcido: { cat: 'jarrones', tambien: ['adultos'], e: '🌪️', t: 'Jarrón torcido', d: 'Un prisma que gira y se estrecha en la cintura', uso: 'jarron', usoDe: usoVasija, color: '#00a4e4',
    campos: [n('h', 'Alto', 180, 60, 250), n('d', 'Ancho', 85, 30, 200), n('lados', 'Lados', 4, 3, 10, 1, ''), n('giro', 'Giro total', 90, -360, 360, 5, '°'), n('cintura', 'Cintura', 22, -30, 45, 1, '%'), PARED],
    gen(p) { const R = p.d / 2; return vasijaPol(p, t => R * (1 - p.cintura / 100 * Math.sin(Math.PI * t)), t => 90 + p.giro * t, Math.max(8, Math.min(60, Math.round(Math.abs(p.giro) / 5) + 8))); },
    nota: p => notaVasija(p, 'Con «Cintura» en negativo se abomba en vez de estrecharse.') },
  jarronBotella: { cat: 'jarrones', tambien: ['adultos'], e: '🍾', t: 'Jarrón botella', d: 'Cuerpo liso y cuello largo: para una flor o unas ramas', uso: 'jarron', usoDe: usoVasija, color: '#0b7a4b', acabado: 'seda',
    campos: [n('h', 'Alto', 210, 80, 250), n('d', 'Ancho del cuerpo', 80, 30, 180), n('cuello', 'Ancho del cuello', 30, 14, 120), n('hombro', 'Dónde empieza el cuello', 50, 25, 80, 1, '%'), PARED],
    gen(p) { const R = p.d / 2, cu = Math.min(R, p.cuello / 2), h0 = p.hombro / 100; return recipiente(p.h, t => { const k = suave((t - h0) / 0.2), base = R * (0.9 + 0.1 * Math.sin(Math.PI * Math.min(1, t / h0) * 0.9 + 0.15)); return base * (1 - k) + cu * k + R * 0.07 * suave((t - 0.94) / 0.06) - R * 0.1 * (1 - suave(t / 0.05)); }, p.pared, 2.4); },
    nota: p => notaVasija(p, 'El hombro sube a más de 45°: sin soportes.') },
  // ---------- VASOS Y CUENCOS ----------
  vasoFacetado: { cat: 'vasos', tambien: ['organizar', 'adultos'], e: '💎', t: 'Vaso facetado', d: 'Caras de triángulos, como tallado: lapicero, vela o plantita', uso: 'jarron', usoDe: usoVasija, color: '#ff6fae',
    campos: [n('h', 'Alto', 100, 40, 220), n('d', 'Ancho arriba', 85, 30, 180), n('abajo', 'Ancho abajo', 75, 40, 130, 1, '%'), n('lados', 'Lados', 7, 4, 12, 1, ''), n('pisos', 'Pisos', 3, 2, 8, 1, ''), PARED],
    gen(p) { const R = p.d / 2, L = Math.max(4, Math.round(p.lados)), ps = Math.max(2, Math.round(p.pisos)); return vasijaPol(p, t => R * (p.abajo / 100 + (1 - p.abajo / 100) * t), t => 90 + Math.round(t * ps) * 180 / L, ps); },
    nota: p => notaVasija(p, 'Cada piso gira media cara: de ahí salen los triángulos.') },
  vasoTorcido: { cat: 'vasos', tambien: ['organizar'], e: '🌀', t: 'Vaso torcido', d: 'Lapicero o portabrochas que gira al subir', uso: 'jarron', usoDe: usoVasija, color: '#ff8a00',
    campos: [n('h', 'Alto', 105, 40, 220), n('d', 'Ancho', 80, 30, 180), n('lados', 'Lados', 6, 3, 12, 1, ''), n('giro', 'Giro total', 60, -360, 360, 5, '°'), n('arriba', 'Tamaño arriba', 108, 70, 140, 1, '%'), PARED],
    gen(p) { const R = p.d / 2; return vasijaPol(p, t => R * (1 + (p.arriba / 100 - 1) * t), t => 90 + p.giro * t, Math.max(8, Math.min(48, Math.round(Math.abs(p.giro) / 5) + 6))); },
    nota: p => notaVasija(p) },
  cuencoOndas: { cat: 'vasos', tambien: ['hogar', 'adultos'], e: '🥣', t: 'Cuenco de ondas', d: 'Frutero, vaciabolsillos o centro de mesa', uso: 'deco', color: '#00b4a6', acabado: 'seda',
    campos: [n('d', 'Ancho', 160, 60, 240), n('h', 'Alto', 60, 20, 140), n('ondas', 'Ondas', 12, 0, 30, 1, ''), n('fuerza', 'Fuerza de la onda', 4, 0, 12, 0.5), n('giro', 'Giro de las ondas', 30, -180, 180, 5, '°'), n('pared', 'Pared', 2.4, 2, 5, 0.2)],
    gen(p) { const R = p.d / 2, Rb = R * 0.42, m = recipiente(p.h, t => Rb + (R - Rb) * Math.sqrt(Math.max(0, 1 - (1 - Math.min(1, t * 0.97 + 0.03)) ** 2)), Math.max(2, p.pared), 2.4); return p.ondas >= 2 && p.fuerza > 0 ? N.deformar(m, [{ t: 'ondas', n: Math.round(p.ondas), amp: p.fuerza, giro: p.giro }]) : m; },
    nota: p => 'Pared de ' + n2(Math.max(2, p.pared)) + ' mm y fondo de 2,4. Sale del pie abriéndose poco a poco: sin soportes. No es para comida caliente ni para el lavavajillas (el PLA se deforma a 55 °C).' },
  // ---------- DECORACIÓN ----------
  estrellaPared: { cat: 'deco', tambien: ['navidad', 'cuadros', 'bebes'], e: '⭐', t: 'Estrella en relieve', d: 'Con aristas vivas; para la pared, el árbol o un móvil de cuna', uso: 'deco', color: '#f7d117', acabado: 'seda',
    campos: [n('d', 'Tamaño (de punta a punta)', 120, 30, 240), n('puntas', 'Puntas', 5, 4, 12, 1, ''), n('hondo', 'Entrantes (más bajo = más afilada)', 42, 25, 75, 1, '%'), n('alto', 'Relieve', 16, 4, 40), c('colgar', 'Ojal por detrás para colgarla de un clavo', true)],
    gen(p) { return estrellaPieza(p); },
    nota: p => 'Plana por detrás y en punta por delante: cada capa es más pequeña que la de abajo, así que se imprime sin soportes. ' + (p.colgar ? 'Por detrás lleva un ojal: entra la cabeza del clavo por el redondel y baja. ' : '') + 'Dos iguales pegadas espalda con espalda hacen una estrella entera para colgar.' },
  diamanteDeco: { cat: 'deco', tambien: ['regalos', 'cuqui'], e: '💎', t: 'Diamante', d: 'Tallado en facetas; con su aro para tenerlo de pie', uso: 'deco', color: '#7ad7f0', acabado: 'seda',
    campos: [n('d', 'Ancho', 60, 15, 160), n('caras', 'Facetas', 8, 5, 16, 1, ''), n('punta', 'Largo de la punta', 110, 100, 200, 5, '%'), c('aro', 'Con aro para ponerlo de pie', true)],
    gen(p) { return diamantePieza(p); },
    nota: p => 'Sale BOCA ABAJO (la cara plana de arriba, en la cama) y sube en punta: sin soportes, porque ninguna cara vuela más de 45°. ' + (p.aro ? 'El aro va al lado: la punta se apoya dentro y el diamante queda derecho. ' : '') + 'En seda o en transparente brilla mucho. Macizo pesa: con un 10 % de relleno va bien.' },
  arcoIris: { cat: 'deco', tambien: ['ninos', 'bebes', 'cuqui'], e: '🌈', t: 'Arcoíris de arcos', d: 'Arcos sueltos que encajan uno dentro de otro (decoración o juguete de apilar)', uso: 'deco', color: '#ff6fae',
    campos: [n('arcos', 'Arcos', 5, 2, 8, 1, ''), n('grueso', 'Grueso de cada arco', 12, 6, 25), n('hueco', 'Hueco del más pequeño', 30, 20, 100), n('fondo', 'Fondo (lo que se sostienen de pie)', 30, 10, 60)],
    gen(p) { return N.union(arcoIrisPiezas(p).L); },
    nota: p => { const K = N.enAmbito(() => { const q = arcoIrisPiezas(p); return { alto: q.alto, ancho: q.ancho }; }); return Math.round(p.arcos) + ' arcos sueltos con 0,4 mm entre ellos: salen ya colocados uno dentro de otro, tumbados (' + n2(K.ancho) + ' × ' + n2(K.alto) + ' mm en la cama). De pie miden ' + n2(K.alto) + ' de alto. Para que cada uno sea de un color sin cambiar de filamento a mano, imprímelos de uno en uno (en Bambu Studio, botón derecho → «Dividir en objetos» y borra los que no toquen). Sin soportes.'; } },
  espiralViento: { cat: 'deco', tambien: ['adultos', 'bebes'], e: '🌀', t: 'Espiral de viento', d: 'Sale plana; al colgarla del centro se abre en espiral y gira con el aire', uso: 'deco', color: '#00a4e4', acabado: 'seda',
    campos: [n('d', 'Diámetro', 180, 60, 250), n('ancho', 'Ancho de la cinta', 9, 4, 20), n('corte', 'Separación entre vueltas', 1.2, 0.8, 4, 0.1), n('centro', 'Centro macizo', 26, 20, 60), n('grosor', 'Grosor', 1.6, 1, 3, 0.2)],
    gen(p) { return espiralPieza(p).m; },
    nota: p => { const K = N.enAmbito(() => ({ v: espiralPieza(p).vueltas })); return 'Una cinta en espiral de ' + n2(K.v) + ' vueltas, plana (' + n2(Math.max(1, p.grosor)) + ' mm): se imprime en minutos. Cuélgala con un hilo por el agujero del centro y se estira sola en hélice; en el agujero de la punta puedes colgar una cuenta para que pese. En PETG aguanta fuera de casa; en PLA seda brilla más. No la cuelgues donde un bebé pueda alcanzarla.'; } },
};
// para el Estudio «por piezas» (v30.6): las partes sueltas de los diseños que tienen más de una
export const PARTES_MAS = {
  bisagraFuerte: p => { const H = bisagraFuertePiezas(p); return [{ nombre: 'Hoja A', m: H.A }, { nombre: 'Hoja B', m: H.B, bisagra: { o: [0, 0, H.Rk], dir: [1, 0, 0], ang: 180 } }]; },
  cajaCajon: p => { const K = cajonPiezas(p), Mo = cajonMontado(K, 0); return [{ nombre: 'Funda', m: Mo.funda }, { nombre: 'Cajón', m: Mo.cajon, desliza: { dir: [0, -1, 0], d: K.Y * 0.7 } }]; },
  cajaLados: p => { const K = cajaLadosPiezas(p); return [{ nombre: 'Caja', m: K.base }, { nombre: 'Tapa', m: K.tapa.rotate([180, 0, 0]).translate([0, 0, K.h + K.tg]), desliza: { dir: [0, 0, 1], d: K.lab + 12 } }]; },
};
