// ================= v30.7 · 🎁 PACK DE 60 (regalo para la dueña) =================
// Ella (12-10-2026): «necesito más diseños: más cosas para velas (mira dimensiones estándares, lo que más compran, para que sea
// compatible), lámparas creativas compatibles con E27 y otros casquillos, soportes para ratón muy creativos (busca referencias
// premium), cosas de hogar útiles de verdad, decoración para oficinas, flores, colonia para hormigas, limpia-brochas al que puedas
// poner agua, cubos de basura funcionales, cosas 6 en 1, más juegos de mesa, cosas para empresas (ceniceros, porta tarjetas…). Un
// poco de todo: dame de regalo un pack de 60 cosas diseñadas por ti y vendibles como churros».
// Todo diseñado aquí (© CelebriDiseños; ni una malla copiada). MEDIDAS ESTÁNDAR miradas el 12-10-2026:
//  · vela de té Ø38 × 16 mm (hueco Ø40,5 × 14: sobresale para cogerla) · maxi Ø58 · vela de candelabro Ø22 (también 19–20) · velón 60/70/80
//  · pantallas: agujero de 42 mm para E27 (rosca 39–40, aro 55–57) y de 29 mm para E14 / B22. El PLA se ablanda a 55–60 °C:
//    SOLO bombilla LED, mejor PETG, y con respiraderos
//  · tarjeta de visita 85 × 55 (ISO 85,6 × 54) · posavasos 90–100 · notas adhesivas 76 × 76 · receptor USB 12 × 4,5
//  · hormigas: tubo de ensayo Ø16 (o 15), tubo de vinilo Ø10 (9,5–12,7), túneles de 4–5 mm
//  · ratón: 115–130 × 60–70 × 38–43 mm; los soportes premium son una base en ángulo con tope y canal para el cable.
// Reglas de la casa: sin soportes (nada pasa de 45°), nada fino donde se hace fuerza (2,4 mm o más) y la nota dice lo que NO se
// puede saber sin imprimir. Lo que toca fuego o calor lo dice claro.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, tx, M, CS, seg, circ, rr, poli, cil, cono, caja, n2, R2, suave, aLoLargoX, porY, torno, hex, enFila, enRejilla } = A;
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cilX = (d, x0, x1, y = 0, z = 0) => M().cylinder(x1 - x0, d / 2, d / 2, seg(d)).rotate([0, 90, 0]).translate([x0, y, z]);
const cilY = (d, y0, y1, x = 0, z = 0) => M().cylinder(y1 - y0, d / 2, d / 2, seg(d)).rotate([-90, 0, 0]).translate([x, y0, z]);
const tubo = (de, di, h, z = 0) => cil(de, h, z).subtract(cil(di, h + 0.4, z - 0.2));
const esfera = (d, x = 0, y = 0, z = 0) => M().sphere(d / 2, seg(d) * 2).translate([x, y, z]);
// agujero «en lágrima» a lo largo de Y: el techo sube a 45° y sale sin soportes
const lagrimaCS = d => { const r = d / 2, q = r * Math.SQRT1_2; return circ(d).add(poli([[-q, q], [q, q], [0, r * Math.SQRT2]])); };
const lagrimaY = (d, y0, y1, x = 0, z = 0) => lagrimaCS(d).extrude(y1 - y0).rotate([90, 0, 0]).translate([x, y1, z]);
// el agujero donde entra el tallo de una flor (Ø6,4), con el techo en cono
const hoyoTallo = prof => cil(6.4, prof + 0.01, -0.01).add(cono(6.4, 0.6, 2.9, prof - 0.01));
// estrella de cuatro puntas (destello): ningún borde queda plano, así que calada en una pared sale sin soportes
const destello = (rv, rh, ri) => { const q = ri * Math.SQRT1_2; return poli([[0, rv], [q, q], [rh, 0], [q, -q], [0, -rv], [-q, -q], [-rh, 0], [-q, q]]); };
const pol = (lados, r, ang = 90) => poli(N.poligono2(lados, 2 * r, ang));
// k copias en rueda: cada una girada «a» grados y llevada a un radio R
const enRueda = (k, R, fn, a0 = 0) => N.union([...Array(k)].map((_, i) => { const a = a0 + i * 360 / k; return fn(i).rotate([0, 0, a]).translate([R * Math.cos(a * R2), R * Math.sin(a * R2), 0]); }));
const enColumna = (L, hueco = 8) => { let y = 0; return N.union(L.map(m => { const b = N.caja(m), q = m.translate([-(b.min[0] + b.max[0]) / 2, y - b.max[1], -b.min[2]]); y -= b.dims[1] + hueco; return q; })); };
const enPlaca = (L, hueco = 8) => { const B = L.map(m => N.caja(m).dims), fx = B.reduce((a, d) => a + d[0] + hueco, -hueco), fy = Math.max(...B.map(d => d[1])), cx = Math.max(...B.map(d => d[0])), cy = B.reduce((a, d) => a + d[1] + hueco, -hueco); return Math.max(cx, cy) < Math.max(fx, fy) - 0.5 ? enColumna(L, hueco) : enFila(L, hueco); };
const sumaCS = L => L.slice(1).reduce((a, b) => a.add(b), L[0]);
// recipientes de revolución y prismas por pisos (como los jarrones del catálogo)
const perfilRev = (h, rad, pasos = 72) => { const P = [[0, 0]]; for (let i = 0; i <= pasos; i++) { const t = i / pasos; P.push([Math.max(0.3, rad(t)), t * h]); } P.push([0, h]); return CS().ofPolygons([N.ccw(P)]).revolve(seg(rad(0.5) * 2) * 2); };
const recipiente = (h, rad, pared, fondo = 2.4, pasos = 72) => { const fuera = perfilRev(h, rad, pasos); const P = [[0, fondo]]; for (let i = 0; i <= pasos; i++) { const z = fondo + (i / pasos) * (h - fondo + 1); P.push([Math.max(0.2, rad(Math.min(1, z / h)) - pared), z]); } P.push([0, h + 1]); return fuera.subtract(CS().ofPolygons([N.ccw(P)]).revolve(seg(rad(0.5) * 2) * 2)); };
const porPisos = (h, pisos, sec, z0 = 0, z1 = h) => { const L = []; for (let i = 0; i < pisos; i++) { const ta = i / pisos, tb = (i + 1) / pisos, za = z0 + (z1 - z0) * ta, zb = z0 + (z1 - z0) * tb; L.push(M().hull([sec(za / h).extrude(0.01).translate([0, 0, za]), sec(zb / h).extrude(0.01).translate([0, 0, zb - 0.01])])); } return N.union(L); };
function vasijaPol(lados, h, pared, r, giro, pisos, fondo = 2.4) { const L = Math.max(3, Math.round(lados)), k = 1 / Math.cos(Math.PI / L), fuera = porPisos(h, pisos, t => pol(L, r(t), giro(t)));
  const dentro = porPisos(h, pisos, t => pol(L, Math.max(0.5, r(t) - pared * k), giro(t)), fondo, h).add(pol(L, Math.max(0.5, r(1) - pared * k), giro(1)).extrude(2).translate([0, 0, h - 0.01])); return fuera.subtract(dentro); }
// texto: centrado y, si no cabe en «anchoMax», encogido
const textoCS = (t, alto, anchoMax) => { const q = N.centraCS(N.texto2(String(t).slice(0, 40), 'gorda', alto)), w = N.cajaCS(q).w, k = anchoMax && w > anchoMax ? anchoMax / w : 1; return { cs: k < 1 ? q.scale([k, k]) : q, w: w * k, k }; };
const hayTexto = t => String(t == null ? '' : t).trim().length > 0;
// un texto en relieve sobre una cara inclinada «ang» grados respecto al suelo que mira hacia −Y (delante): se lee de frente
const textoEnCara = (t, alto, anchoMax, relieve, ang, y, z) => textoCS(t, alto, anchoMax).cs.extrude(relieve + 0.2).translate([0, 0, -0.2]).rotate([ang, 0, 0]).translate([0, y, z]);
const corazonCS = ancho => { const P = []; for (let i = 0; i < 96; i++) { const t = i / 96 * 2 * Math.PI; P.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5]); } const k = ancho / 32; return poli(P.map(q => [q[0] * k, q[1] * k])); };
const hojaCS = (largo, ancho) => { const P = []; for (let i = 0; i <= 24; i++) { const t = i / 24; P.push([largo * t, ancho / 2 * Math.sin(Math.PI * t) ** 0.8]); } for (let i = 23; i >= 1; i--) { const t = i / 24; P.push([largo * t, -ancho / 2 * Math.sin(Math.PI * t) ** 0.8]); } return poli(P); };
// sector de anillo (para piezas en arco): radio medio r, ancho, de −a a +a radianes alrededor de +Y
const arcoCS = (r, ancho, a) => { const P = [], Q = [], N2 = 48; for (let i = 0; i <= N2; i++) { const t = Math.PI / 2 - a + 2 * a * i / N2; P.push([(r + ancho / 2) * Math.cos(t), (r + ancho / 2) * Math.sin(t)]); Q.push([(r - ancho / 2) * Math.cos(t), (r - ancho / 2) * Math.sin(t)]); } return poli(P.concat(Q.reverse())); };
// arco grueso entre dos ángulos (grados), radio interior r y grosor e
const arcoGrueso = (r, e, a0, a1) => { const P = [], Q = [], N2 = 44; for (let i = 0; i <= N2; i++) { const a = (a0 + (a1 - a0) * i / N2) * R2; P.push([(r + e) * Math.cos(a), (r + e) * Math.sin(a)]); Q.push([r * Math.cos(a), r * Math.sin(a)]); } return poli(P.concat(Q.reverse())); };

// ---------- VELAS: los huecos estándar ----------
const VELA = { te: { d: 40.5, h: 14, t: 'vela de té de Ø38' }, maxi: { d: 60.5, h: 20, t: 'vela de té maxi de Ø58' }, led: { d: 40.5, h: 12, t: 'vela LED de Ø38' } };
const velaDe = p => VELA[p.vela] || VELA.te;
const hueco = (p, zTecho) => { const v = velaDe(p); return cil(v.d, v.h + 0.2, zTecho - v.h); };
const SV = s('vela', 'Para qué vela', 'te', [['te', 'Vela de té normal (Ø38 mm)'], ['maxi', 'Vela de té maxi (Ø58 mm)'], ['led', 'Vela LED a pilas (Ø38 mm)']]);
const FUEGO = ' ⚠️ Con vela de verdad: va SIEMPRE en su vasito de aluminio, mejor impreso en PETG (el PLA se ablanda a 55 °C) y nunca la dejes sola. Con vela LED no hay nada que vigilar.';
const notaHueco = p => { const v = velaDe(p); return 'Hueco de Ø' + n2(v.d) + ' × ' + n2(v.h) + ' mm para una ' + v.t + ' (la medida estándar, con 2,5 mm de aire: entra y sale sin atascarse y asoma un poco para cogerla). '; };

// ---------- LÁMPARAS: el agujero del casquillo ----------
const CASQ = { e27: { d: 42, t: 'E27 (la rosca normal)' }, e14: { d: 29, t: 'E14 (la rosca fina)' } };
const SC = s('casq', 'Casquillo', 'e27', [['e27', 'E27 · rosca normal (agujero de 42 mm)'], ['e14', 'E14 · rosca fina (agujero de 29 mm)']]);
const LUZ = ' 💡 SOLO bombilla LED (hasta 9 W) y mejor en PETG: el PLA se ablanda a 55–60 °C. ';
const notaCasq = p => { const q = CASQ[p.casq] || CASQ.e27; return 'Agujero de ' + q.d + ' mm para portalámparas ' + q.t + ': la pantalla queda pillada entre el portalámparas y su aro roscado (la medida estándar; mide el tuyo antes de imprimir). '; };
// quita el agujero del casquillo de la placa de arriba (que se imprime en la cama) y, si cabe, 6 respiraderos
const quitaCasquillo = (m, p, rPlaca, respira = true) => { const d = (CASQ[p.casq] || CASQ.e27).d; let q = m.subtract(cil(d, 30, -10)); const rv = d / 2 + 11; if (respira && rPlaca - rv >= 6) q = q.subtract(enRueda(6, rv, () => cil(6, 30, -10))); return q; };

// ======================= 🕯️ VELAS =======================
function velaFacetada(p) { const v = velaDe(p), L = Math.max(4, Math.round(p.lados)), h = Math.max(v.h + 8, p.h), R = Math.max((v.d / 2 + 5) / Math.cos(Math.PI / L) / Math.min(1, p.abajo / 100), p.d / 2), ps = Math.max(2, Math.round(p.pisos));
  return porPisos(h, ps, t => pol(L, R * (p.abajo / 100 + (1 - p.abajo / 100) * t), 90 + Math.round(t * ps) * 180 / L)).subtract(hueco(p, h)); }
function candelero(p) { const H = Math.max(50, p.h), Rb = Math.max(26, p.base / 2), d = p.palo === '19' ? 20.2 : 23, rc = d / 2 + 3.4;
  const m = torno([[Rb - 3, 0], [Rb, 3], [Rb, 8], [Rb - 2.4, 8], [Rb - 2.4, 3.4], [13, 3.4], [8, 10], [8, H - 31], [rc + 1, H - 23], [rc + 1, H - 20], [rc, H - 17], [rc + 1.6, H]], 2 * Rb);
  return m.subtract(cono(d - 1.6, d, 24.2, H - 24)); }
function velaTrio(p) { const v = velaDe(p), L = Math.round(p.lados), ri = v.d / 2 + 5, R = L >= 13 ? ri : ri / Math.cos(Math.PI / L), paso = 2 * ri - 4;
  return N.union([p.h1, p.h2, p.h3].map((h0, i) => { const h = Math.max(v.h + 6, h0); return (L >= 13 ? circ(2 * R) : pol(L, R, L % 2 ? 90 : 90 + 180 / L)).extrude(h).subtract(hueco(p, h)).translate([(i - 1) * paso, 0, 0]); })); }
function velaPlato(p) { const rv = Math.max(20, Number(p.velon) / 2), R = rv + Math.max(10, p.borde);
  return torno([[R - 3, 0], [R, 3], [R, 9], [R - 2.4, 9], [R - 2.4, 3.2], [rv + 3.6, 3.2], [rv + 3.6, 7], [rv + 1.2, 7], [rv + 1.2, 3.2]], 2 * R); }
function velaFarol(p) { const a = Math.max(64, p.lado), H = Math.max(70, p.h), w = 3, v = velaDe(p);
  let m = caja(a, a, H, 6).subtract(caja(a - 2 * w, a - 2 * w, H, 4).translate([0, 0, 3]));
  const av = a - 26, zv0 = 14, zv1 = H - 14 - av / 2, corte = porY(poli([[-av / 2, zv0], [av / 2, zv0], [av / 2, zv1], [0, zv1 + av / 2], [-av / 2, zv1]]), a + 4);
  m = m.subtract(corte).subtract(corte.rotate([0, 0, 90])).add(tubo(v.d + 5, v.d, 5, 2.99));
  if (p.asa) { const x0 = a / 2 - 1.5, zt = H + a / 2 - 3; // asa en V invertida (a 45°: sin soportes) con su ojo arriba
    const barra = sx => M().hull([cubo(sx * x0 - 1.5, sx * x0 + 1.5, -3, 3, H - 6, H), cubo(-0.6, 0.6, -3, 3, zt - 6, zt)]);
    m = m.add(barra(1)).add(barra(-1)).add(cilY(16, -3, 3, 0, zt + 3)).subtract(lagrimaY(7, -4, 4, 0, zt + 4)); }
  return m; }
function velaCorazon(p) { const v = velaDe(p), an = Math.max(v.d + 62, p.ancho), h = Math.max(v.h + 6, p.h); return corazonCS(an).extrude(h).subtract(hueco(p, h).translate([0, -an * 0.04, 0])); }
function velaCentro(p) { const v = velaDe(p), k = Math.max(3, Math.min(6, Math.round(p.n))), ro = v.d / 2 + 5, R = Math.max(ro * 0.92 / Math.sin(Math.PI / k), ro + 12), h = Math.max(v.h + 6, p.h);
  let m = cil(2 * (R - ro * 0.2), h * 0.6).add(enRueda(k, R, () => cil(2 * ro, h))).subtract(enRueda(k, R, () => hueco(p, h)));
  if (p.centro) m = m.add(cil(2 * ro, h + 14)).subtract(hueco(p, h + 14)); return m; }
function velaBandeja(p) { const v = velaDe(p), k = Math.max(2, Math.min(4, Math.round(p.n))), paso = v.d + 10, L = Math.max(k * paso + 14, p.mechero ? 100 : 0), W = v.d + 18 + (p.mechero ? 22 : 0), h = v.h + 4, y0 = p.mechero ? 9 : 0;
  let m = caja(L, W, h, Math.min(18, W / 2 - 1)); for (let i = 0; i < k; i++) m = m.subtract(hueco(p, h).translate([(i - (k - 1) / 2) * paso, y0, 0]));
  if (p.mechero) m = m.subtract(caja(84, 15, 20, 3).translate([0, -W / 2 + 14.5, h - 13])); return m; }
function velaAdaptador(p) { const d = p.palo === '19' ? 19.4 : 21.6;
  if (p.modo === 'fina') { const di = Math.max(6, p.fina) + 0.4, h = 24; return cono(d - 1.2, d, h).add(cono(d, d + 6, 3, h)).subtract(cil(di, h + 6, 1.6)); }
  const v = velaDe(p), ro = v.d / 2 + 2.6, z1 = 22, z2 = z1 + (ro - d / 2);
  return cono(d - 1.2, d, z1).add(cono(d, 2 * ro, z2 - z1, z1)).add(cil(2 * ro, v.h + 2.4, z2)).subtract(hueco(p, z2 + v.h + 2.4)); }
function velaEstrellas(p) { const v = velaDe(p), R = Math.max(v.d / 2 + 12, p.d / 2), H = Math.max(50, p.h), w = 2, tam = Math.max(10, p.tam), rv = tam / 2, rh = tam * 0.3, ri = tam * 0.18;
  let m = tubo(2 * R, 2 * (R - w), H).add(cil(2 * R, 3)).add(tubo(v.d + 5, v.d, 6, 0));
  const est = destello(rv, rh, ri), filas = Math.max(1, Math.floor((H - 20) / (tam + 5))), porFila = Math.max(4, Math.floor(2 * Math.PI * R / (2 * rh + 6))), L = [];
  for (let f = 0; f < filas; f++) for (let i = 0; i < porFila; i++) L.push(est.extrude(w + 6).rotate([90, 0, 0]).translate([0, -(R - w - 3), 14 + rv + f * (tam + 5)]).rotate([0, 0, (i + (f % 2) * 0.5) * 360 / porFila]));
  return m.subtract(N.union(L)); }
function velaLoto(p) { const v = velaDe(p), rc = v.d / 2 + 3.4, k = Math.max(6, Math.min(12, Math.round(p.petalos))), hc = v.h + 2.4, an = 2 * Math.PI * rc / k;
  // cada pétalo: nace estrecho en el vaso, se ensancha a media altura y acaba en punta; por debajo nunca pasa de 45°
  const petalo = (rt, zt) => { const rm = rc + (rt - rc) * 0.55, zm = Math.max(zt * 0.6, rm - rc + 2.4);
    return M().hull([cubo(rc - 2.6, rc - 0.2, -an * 0.36, an * 0.36, 0, hc), cubo(rm - 1.2, rm, -an * 0.62, an * 0.62, zm - 1.4, zm), cubo(rt - 0.9, rt, -0.5, 0.5, zt - 1.2, zt)]); };
  const fila = (rt, zt, a0) => enRueda(k, 0, () => petalo(rt, zt), a0);
  return cil(2 * rc, hc).add(fila(rc + 26, 32, 0)).add(fila(rc + 16, 38, 180 / k)).add(fila(rc + 7, 44, 0)).subtract(hueco(p, hc)); }
// ======================= 💡 LÁMPARAS (se imprimen boca abajo: la placa del casquillo en la cama) =======================
function lampPliegues(p) { const H = Math.max(60, p.h), ra = Math.max(46, p.arriba / 2), rb = Math.min(Math.max(ra, p.abajo / 2), ra + H * 0.9), w = Math.max(0.8, p.pared);
  let m = recipiente(H, t => ra + (rb - ra) * Math.pow(t, 0.85), w, 3);
  if (p.pliegues >= 3 && p.fondo > 0) m = N.deformar(m, [{ t: 'ondas', n: Math.round(p.pliegues), amp: p.fondo, giro: p.giro }]);
  return quitaCasquillo(m, p, ra - Math.max(0, p.fondo)); }
function lampDiamante(p) { const H = Math.max(80, p.h), L = Math.max(4, Math.round(p.lados)), R = Math.max(60, p.d / 2), ra = Math.max(47, R - H * 0.5), ps = 4;
  const m = vasijaPol(L, H, Math.max(0.8, p.pared), t => (t < 0.55 ? ra + (R - ra) * (t / 0.55) : R - R * 0.26 * ((t - 0.55) / 0.45)), t => 90 + Math.round(t * ps) * 180 / L, ps, 3);
  return quitaCasquillo(m, p, ra * Math.cos(Math.PI / L)); }
function lampTulipa(p) { const H = Math.max(80, p.h), L = Math.max(3, Math.round(p.lados)), R = Math.max(60, p.d / 2), ra = Math.max(47, R - H * 0.6);
  const m = vasijaPol(L, H, Math.max(0.8, p.pared), t => ra + (R - ra) * Math.sin(Math.PI / 2 * Math.min(1, t * 1.12)), t => 90 + p.giro * t, Math.max(10, Math.min(48, Math.round(Math.abs(p.giro) / 5) + 10)), 3);
  return quitaCasquillo(m, p, ra * Math.cos(Math.PI / L)); }
function lampCelosia(p) { const H = Math.max(80, p.h), ra = Math.max(47, p.arriba / 2), rb = Math.min(Math.max(ra, p.abajo / 2), ra + H * 0.8), k = Math.max(6, Math.round(p.barras)), g = Math.max(2.4, p.grueso), esc = rb / ra, paso = 180 / k;
  // el giro se cuadra a múltiplos de 180/barras: así las dos tandas se cruzan justo al final y cada barra acaba unida a otra (sin aro en el aire)
  const tope = 180 * H / (Math.PI * rb) * 0.85, giro = Math.max(1, Math.min(Math.round(Math.abs(p.vuelta) / paso), Math.floor(tope / paso))) * paso;
  const anillo = sumaCS([...Array(k)].map((_, i) => rr(g, g, 0.5).translate([ra - g / 2 - 0.2, 0]).rotate(i * 360 / k))), div = Math.max(24, Math.round(H / 2));
  return quitaCasquillo(anillo.extrude(H, div, giro, [esc, esc]).add(anillo.extrude(H, div, -giro, [esc, esc])).add(cil(2 * ra, 3)), p, ra); }
function lampBase(p) { const L = Math.max(3, Math.round(p.lados)), H = Math.max(40, p.h), ra = Math.max(34, p.arriba / 2), rb = Math.min(Math.max(ra, p.abajo / 2), ra + H * 0.9), w = 3, k = 1 / Math.cos(Math.PI / L);
  let m = M().hull([pol(L, ra * k).extrude(0.01), pol(L, rb * k).extrude(0.01).translate([0, 0, H - 0.01])]).subtract(M().hull([pol(L, (ra - w) * k).extrude(0.01).translate([0, 0, 4]), pol(L, (rb - w) * k).extrude(0.01).translate([0, 0, H + 0.01])]));
  m = m.subtract(cubo(-4, 4, -(rb * k + 2), 0, H - 9, H + 1));   // paso del cable (queda abajo al darle la vuelta)
  return quitaCasquillo(m, p, ra, false); }
function lampAro(p) { const [dg, dp] = { e27e14: [42, 29], e27b22: [42, 29], grande: [Math.max(30, p.grande), Math.max(20, p.pequeno)] }[p.tipo] || [42, 29]; return cil(dg + 18, 2).add(cil(dg - 0.6, 2.6, 2)).subtract(cil(dp, 10, -1)); }
function lampNube(p) { const t = Math.max(80, p.tam), nube = () => sumaCS([circ(0.42 * t).translate([-0.25 * t, 0]), circ(0.56 * t).translate([0.02 * t, 0.1 * t]), circ(0.38 * t).translate([0.3 * t, -0.01 * t]), rr(0.82 * t, 0.24 * t, 0.11 * t).translate([0.02 * t, -0.12 * t])]);
  const cs0 = p.forma === 'luna' ? circ(t).subtract(circ(t * 0.86).translate([t * 0.27, t * 0.08])) : p.forma === 'corazon' ? corazonCS(t) : p.forma === 'estrella' ? poli(N.estrella2(5, t / 2, t / 3.9, 90)).offset(t * 0.03, 'Round') : nube();
  const fondo = Math.max(12, p.fondo), borde = cs0.offset(-10, 'Round').subtract(cs0.offset(-12.6, 'Round'));
  return cs0.extrude(3).add(borde.extrude(fondo).translate([0, 0, 2.99])); }

// ======================= 🖱️ SOPORTES DE RATÓN =======================
function ratonExpositor(p) { const Lm = Math.max(90, p.largo), W = Math.max(50, p.ancho), a = Math.max(15, Math.min(40, p.angulo)) * R2, e = 5, L = Lm * Math.cos(a) + 24, zf = 9, zb = zf + (L - 14 - e) * Math.tan(a);
  // perfil de lado (x: hacia atrás, y: arriba): suelo, tope delante, plano inclinado y pata trasera. Se imprime TUMBADO sobre este perfil
  const plano = poli([[14, zf], [L - e, zb], [L - e, zb + e / Math.cos(a)], [14, zf + e / Math.cos(a)]]);
  const cs2 = sumaCS([rr(L, e, 1.2).translate([L / 2, e / 2]), poli([[0, 0], [15, 0], [15, zf + e / Math.cos(a) + 11], [9, zf + e / Math.cos(a) + 11], [0, zf + 3]]), plano, rr(e, zb + e / Math.cos(a), 1.2).translate([L - e / 2, (zb + e / Math.cos(a)) / 2])]);
  const yt = zf + e / Math.cos(a) + 11;                                                                              // lo alto del tope
  return cs2.extrude(W).subtract(aLoLargoX(poli([[yt - 9, W / 2 - 4], [yt - 9, W / 2 + 4], [yt + 0.2, W / 2 + 13.2], [yt + 0.2, W / 2 - 13.2]]), 17).translate([7.5, 0, 0])); }   // paso del cable en el tope, en V (se imprime tumbado: así no tiene techo)
function ratonBungee(p) { const H = Math.max(60, p.alto), dc = Math.max(2.5, p.cable), Rb = 42;
  let m = cil(2 * Rb, 4).add(cono(2 * Rb, 2 * Rb - 12, 6, 4)).add(cono(11, 7, H, 9.5));
  const aro = circ(dc + 6).subtract(circ(dc + 0.3)).subtract(rr(dc * 0.72, dc + 8, 0).translate([0, (dc + 8) / 2]));
  m = m.add(porY(aro, 9).translate([0, 0, 9.5 + H + dc / 2 + 1.4]));
  if (p.peso) m = m.subtract(enRueda(3, 23, () => cil(26.4, 5.6, -0.01), 30)); return m; }
function ratonFunda(p) { const g = 3, X = Math.max(50, p.ancho) + 4 + 2 * g, Y = Math.max(30, p.fondo) + 2 * g, Hb = Math.max(50, p.alto), hf = 22;
  let m = caja(X, Y, Hb, 5).subtract(caja(X - 2 * g, Y - 2 * g, Hb, 3).translate([0, 0, g]));
  m = m.subtract(aLoLargoX(poli([[-Y / 2 - 1, hf], [Y / 2 - g, Hb + 1], [-Y / 2 - 1, Hb + 1]]), X + 2));          // de la espalda alta al frente bajo
  m = m.subtract(lagrimaY(4.6, Y / 2 - g - 1, Y / 2 + 1, -X / 4, Hb - 14)).subtract(lagrimaY(4.6, Y / 2 - g - 1, Y / 2 + 1, X / 4, Hb - 14)); // 2 tornillos
  return m.subtract(cubo(-4.5, 4.5, -Y / 2 - 1, -Y / 2 + g + 1, hf - 9, hf + 12)); }                                 // paso del cable de carga
function ratonDock(p) { const Lm = Math.max(90, p.largo), Wm = Math.max(50, p.ancho), X = Wm + 26, Y = Lm + 46;
  let m = caja(X, Y, 8, 14).subtract(rr(Wm + 3, Lm + 3, Math.min(Wm, Lm) / 2 - 2).extrude(3).translate([0, -14, 5.2])).add(caja(X - 20, 20, 24, 6).translate([0, Y / 2 - 14, 0]));
  m = m.subtract(cubo(-6.2, 6.2, Y / 2 - 14 - 2.4, Y / 2 - 14 + 2.4, 11, 25));                                      // receptor USB de pie (12,4 × 4,8)
  return m.subtract(cubo(X / 2 - 24, X / 2 - 19.5, Y / 2 - 26, Y / 2 + 1, 18, 25)); }                               // guía del cable de carga
function reposaMunecas(p) { const X = Math.max(60, p.largo), Y = Math.max(40, p.fondo), H = Math.max(10, p.alto);
  return M().hull([rr(X, Y, Y / 2 - 0.5).extrude(1), rr(X * 0.86, Y * 0.62, Y * 0.3).extrude(1).translate([0, Y * 0.06, H * 0.55]), rr(X * 0.6, Y * 0.3, Y * 0.14).extrude(0.6).translate([0, Y * 0.1, H - 0.6])]); }

// ======================= 🏠 HOGAR =======================
function portaEstropajo(p) { const X = Math.max(80, p.x), Y = Math.max(50, p.y), H = Math.max(30, p.z), w = 2.4;
  let cesta = caja(X, Y, H, 8).subtract(caja(X - 2 * w, Y - 2 * w, H, 6).translate([0, 0, w]));
  const R = []; for (let x = -X / 2 + 12; x <= X / 2 - 12; x += 9) R.push(rr(4, Y - 22, 2).extrude(w + 2).translate([x, 0, -1])); cesta = cesta.subtract(N.union(R));
  if (p.separador) cesta = cesta.add(cubo(X / 2 - w - X * 0.3 - 1.2, X / 2 - w - X * 0.3 + 1.2, -Y / 2 + 1, Y / 2 - 1, 0, H * 0.8));
  let bandeja = caja(X + 9, Y + 9, 10, 10).subtract(caja(X + 9 - 2 * w, Y + 9 - 2 * w, 10, 8).translate([0, 0, w]));
  for (const y of [-Y / 4, 0, Y / 4]) bandeja = bandeja.add(cubo(-X / 2 + 8, X / 2 - 8, y - 1.3, y + 1.3, w - 0.01, w + 4));
  return enPlaca([cesta, bandeja], 8); }
function ganchoPuerta(p) { const t = Math.max(15, p.puerta) + 0.6, e = Math.max(3.2, p.grueso), W = Math.max(15, p.ancho), Lf = Math.max(40, p.largo), r = Math.max(8, p.gancho);
  return sumaCS([rr(e, 40, 1.2).translate([-t - e / 2, -20 + e]), rr(t + 2 * e, e, 1.2).translate([-t / 2, e / 2]), rr(e, Lf, 1.2).translate([e / 2, -Lf / 2 + e]),
    arcoGrueso(r, e, 180, 360).translate([e + r, -Lf + e]), rr(e, 12, 1.2).translate([e + 2 * r + e / 2, -Lf + e + 6])]).extrude(W); }
function topePuerta(p) { const L = Math.max(60, p.largo), W = Math.max(25, p.ancho), H = Math.max(12, p.alto), sl = (H - 2) / (L - 6);
  let m = porY(poli([[0, 0], [L, 0], [L, H], [L - 6, H], [0, 2]]), W); const G = [];
  for (let x = 12; x < L - 10; x += 7) G.push(cubo(x, x + 1.8, -W / 2 - 1, W / 2 + 1, 2 + sl * x - 1, 2 + sl * x + 4));
  return m.subtract(N.union(G)); }
function portallaves(p) { const k = Math.max(2, Math.min(8, Math.round(p.ganchos))), X = Math.max(k * 30 + 20, p.ancho), Y = Math.max(40, p.alto), g = 4;
  let m = caja(X, Y, g, 10); if (p.casa) m = m.add(poli([[-X / 2 + 14, Y / 2 - 2], [X / 2 - 14, Y / 2 - 2], [0, Y / 2 + Math.min(42, X * 0.2)]]).offset(4, 'Round').extrude(g));
  for (let i = 0; i < k; i++) m = m.add(cil(8, 16.02, g - 0.01).add(cono(8, 14, 3, g + 16)).add(cil(14, 1.6, g + 18.99)).translate([(i - (k - 1) / 2) * (X - 34) / Math.max(1, k - 1), -Y / 2 + 13, 0]));
  for (const sx of [-1, 1]) m = m.subtract(cil(4.6, g + 2, -1).add(cono(4.6, 9.2, 2.3, g - 2.29)).translate([sx * (X / 2 - 13), Y / 2 - 12, 0]));
  if (hayTexto(p.texto)) m = m.add(textoCS(p.texto, Math.min(13, Y * 0.24), X - 70).cs.extrude(1.2).translate([0, Y * 0.14, g - 0.01]));
  return m; }
function escurreCubiertos(p) { const D = Math.max(70, p.d), H = Math.max(70, p.h), w = 2.4;
  let vaso = tubo(D, D - 2 * w, H).add(cil(D, w)); const Hs = [cil(5.5, w + 2, -1)];
  for (let r = 11; r <= D / 2 - 9; r += 11) { const kk = Math.floor(2 * Math.PI * r / 11); for (let i = 0; i < kk; i++) { const a = i * 2 * Math.PI / kk; Hs.push(cil(5.5, w + 2, -1).translate([r * Math.cos(a), r * Math.sin(a), 0])); } }
  const rombo = M().cube([D + 10, 7, 7], true).rotate([45, 0, 0]), kr = Math.max(3, Math.floor(Math.PI * D / 2 / 17)), Rm = [];
  for (let f = 0, z = 22; z < H - 16; z += 17, f++) for (let i = 0; i < kr; i++) Rm.push(rombo.rotate([0, 0, (i + (f % 2) * 0.5) * 180 / kr]).translate([0, 0, z]));
  vaso = vaso.subtract(N.union(Hs)).subtract(N.union(Rm));
  return enFila([vaso, tubo(D + 12, D + 12 - 2 * w, 10).add(cil(D + 12, w)).add(enRueda(3, D / 2 - 14, () => cil(8, 4, w - 0.01)))], 8); }
function ganchosS(p) { const e = Math.max(3.5, p.grueso), W = Math.max(6, p.ancho), r1 = Math.max(6, p.barra / 2 + 0.5), r2 = Math.max(5, p.pequeno / 2), S = Math.max(4, p.tramo), k = Math.max(1, Math.min(8, Math.round(p.n)));
  const punta = (r, a) => circ(e).translate([(r + e / 2) * Math.cos(a * R2), (r + e / 2) * Math.sin(a * R2)]);
  const una = sumaCS([arcoGrueso(r1, e, -5, 205), punta(r1, 205), rr(e, S + 2, 0).translate([r1 + e / 2, -S / 2]), arcoGrueso(r2, e, 175, 385).translate([r1 + e + r2, -S]), punta(r2, 385).translate([r1 + e + r2, -S])]).extrude(W);
  return enFila([...Array(k)].map(() => una), 5); }
function pinzaMantel(p) { const t = Math.max(10, p.mesa), e = 2.8, L = Math.max(30, p.largo), W = Math.max(12, p.ancho);
  return sumaCS([rr(e, t + 2 * e, 1).translate([e / 2, 0]), rr(L, e, 1).translate([L / 2, t / 2 + e / 2]), poli([[0, -t / 2 - e], [L, -t / 2 - e + 3], [L, -t / 2 + 3], [0, -t / 2]]), circ(e + 1.4).translate([L - 1.2, -t / 2 + 2.4])]).extrude(W); }
function cepillosDientes(p) { const D = Math.max(60, p.d), H = Math.max(80, p.h), w = 2.4, k = Math.max(2, Math.min(6, Math.round(p.n)));
  const vaso = tubo(D, D - 2 * w, H).add(cil(D, w)).subtract(enRueda(3, D / 2 - 11, () => cil(4, w + 2, -1)));
  let tapa = cil(D + 2, 3).add(tubo(D - 2 * w - 0.6, D - 2 * w - 5.4, 5, 2.99)).subtract(cil(Math.min(30, D - 2 * w - 34), 12, -1));
  tapa = tapa.subtract(enRueda(k, D / 2 - 9, () => cil(8.6, 12, -1).add(cubo(0, D, -4.3, 4.3, -1, 11))));
  return enFila([vaso, tapa], 8); }

// ======================= 🖥️ OFICINA =======================
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
// un bloque con texto grabado en 4 o 6 caras, leído desde fuera de cada una
function grabaCaras(m, dims, textos, alto, g = 0.8) { const [X, Y, Z] = dims, T = t => textoCS(t, alto, X - 4).cs.extrude(g + 0.2); const L = [];
  if (hayTexto(textos[0])) L.push(T(textos[0]).translate([0, 0, Z - g]));                                           // arriba
  if (hayTexto(textos[1])) L.push(T(textos[1]).rotate([90, 0, 0]).translate([0, -Y / 2 + g, Z / 2]));                // delante
  if (hayTexto(textos[2])) L.push(T(textos[2]).rotate([180, 0, 0]).translate([0, 0, g]));                           // abajo
  if (hayTexto(textos[3])) L.push(T(textos[3]).rotate([-90, 0, 0]).translate([0, Y / 2 - g, Z / 2])); // detrás
  if (hayTexto(textos[4])) L.push(T(textos[4]).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([X / 2 - g, 0, Z / 2]));  // derecha
  if (hayTexto(textos[5])) L.push(T(textos[5]).rotate([90, 0, 0]).rotate([0, 0, -90]).translate([-X / 2 + g, 0, Z / 2])); // izquierda
  return L.length ? m.subtract(N.union(L)) : m; }
function calendario(p) { const a = Math.max(24, p.cubo), Lb = 2 * a + 1.2, sb = a / 3, w = 3;
  const dado = L6 => grabaCaras(caja(a, a, a, 2.5), [a, a, a], L6, a * 0.6);
  const barra = i => grabaCaras(caja(Lb, sb, sb, 1), [Lb, sb, sb], MESES.slice(i * 4, i * 4 + 4), sb * 0.66, 0.6);
  let bandeja = caja(Lb + 0.6 + 2 * w, a + 0.6 + 2 * w, w + sb + 5, 3).subtract(caja(Lb + 0.6, a + 0.6, 40, 1).translate([0, 0, w]));
  bandeja = bandeja.subtract(cubo(-Lb / 2, Lb / 2, -a / 2 - w - 1.3, -a / 2 + 0.1, w + 1.5, 60));                   // el frente bajo: se lee el mes
  return enRejilla([bandeja, dado(['0', '1', '2', '3', '4', '5']), dado(['0', '1', '2', '6', '7', '8']), barra(0), barra(1), barra(2)], 170, 5); }
function placaNombre(p) { const alto = Math.max(8, p.letra), ang = 65, a = ang * R2, cargo = hayTexto(p.cargo), hc = alto * 1.9 + (cargo ? alto * 0.8 : 0), T1 = textoCS(hayTexto(p.nombre) ? p.nombre : 'Nombre', alto, 226), L = Math.max(80, T1.w + 24);
  const fx = hc * Math.cos(a), zt = hc * Math.sin(a), en = (s0, t) => t.rotate([ang, 0, 0]).translate([0, (hc / 2 + s0) * Math.cos(a), (hc / 2 + s0) * Math.sin(a)]);
  let m = aLoLargoX(poli([[0, 0], [fx, zt], [fx + 4, zt], [fx + 4 + zt * 0.45, 0]]), L);
  m = m.add(en(cargo ? alto * 0.32 : 0, T1.cs.extrude(1.4).translate([0, 0, -0.2])));
  if (cargo) m = m.add(en(-alto * 0.75, textoCS(p.cargo, alto * 0.48, L - 16).cs.extrude(1.2).translate([0, 0, -0.2])));
  return m; }
function seisEnUno() { const X = 176, Y = 150, hb = 12;
  let m = caja(X, Y, hb, 8).add(pol(6, 34.6, 0).extrude(95).translate([-52, 44, 0])).add(caja(98, 18, 34, 3).translate([34, 62, 0])).add(cubo(4, 84, -33, -25, hb - 0.01, 38));
  m = m.subtract(pol(6, 31.6, 0).extrude(100).translate([-52, 44, 3]))                                               // 1 · lapicero
    .subtract(cubo(-12, 80, 56, 68, 15, 40))                                                                         // 2 · tarjetas de visita (92 × 12)
    .subtract(rr(88, 20, 4).extrude(10).translate([34, 38, hb - 8]))                                                 // 3 · clips
    .subtract(caja(78.6, 78.6, 12, 2).translate([-44, -30, hb - 9]))                                                 // 4 · notas adhesivas de 76
    .subtract(cubo(4, 84, -46, -33, hb - 8, 30));                                                                    // 5 · móvil (surco de 13 con respaldo)
  for (const y of [-12, 6]) m = m.subtract(cil(6.4, 20, -1).translate([X / 2 - 6, y, 0])).subtract(cubo(X / 2 - 6, X / 2 + 1, y - 2, y + 2, -1, 20)); // 6 · dos pasacables
  return m; }
function portaNotas(p) { const a = Math.max(52, Number(p.nota)) + 2.6, w = 3, hh = Math.max(12, p.alto);
  let m = caja(a + 2 * w, a + 2 * w + 16, hh, 4).subtract(caja(a, a, hh, 1).translate([0, -8, w])).subtract(cubo(-13, 13, -a / 2 - 8 - w - 1, -a / 2 - 8 + 1, w + 3, hh + 1));
  return m.subtract(cilX(11, -a / 2 - w - 1, a / 2 + w + 1, a / 2 + w, hh + 1.5)); }
function cuelgaAuriculares(p) { const t = Math.max(12, p.mesa), e = 4.5, W = Math.max(20, p.ancho), L = 55, Hc = Math.max(30, p.cuelga), r = 18, yb = -t / 2 - e;
  return sumaCS([rr(L, e, 1.5).translate([L / 2, t / 2 + e / 2]), rr(e, t + 2 * e, 1.5).translate([-e / 2, 0]), poli([[-1, yb], [L * 0.8, yb + 1.5], [L * 0.8, yb + e + 1.5], [-1, yb + e]]),
    rr(e, Hc, 1.5).translate([-e / 2, yb - Hc / 2 + 1]), arcoGrueso(r, e, 180, 360).translate([r, yb - Hc + 1]), rr(e, 16, 1.5).translate([2 * r + e / 2, yb - Hc + 9])]).extrude(W); }
function sujetalibros(p) { const An = Math.max(80, p.ancho), H = Math.max(100, p.alto), B = Math.max(80, p.base), e = 4;
  let m = sumaCS([rr(B, e, 1).translate([B / 2, e / 2]), rr(e, H, 1).translate([e / 2, H / 2]), poli([[e - 0.1, e - 0.1], [e + 16, e - 0.1], [e - 0.1, e + 16]])]).extrude(An);
  if (p.panal) { const w = 11, b = w / 2, s0 = w * 0.2887, a2 = s0 + b, py = w + 3.2, pz = a2 + s0 + 3.4, L2 = [];   // celdas de panal estiradas: el techo sube a 45° (se imprime tumbado)
    const celda = poli([[a2, 0], [s0, b], [-s0, b], [-a2, 0], [-s0, -b], [s0, -b]]).extrude(e + 2).rotate([0, 90, 0]); let f = 0;
    for (let z = 12 + a2; z <= An - 12 - a2; z += pz, f++) for (let y = e + 28 + (f % 2) * py / 2; y <= H - 10 - b; y += py) L2.push(celda.translate([-1, y, z]));
    if (L2.length) m = m.subtract(N.union(L2)); }
  return m; }
function elevadorPortatil(p) { const L = Math.max(140, p.largo), h1 = Math.max(15, p.delante), h2 = Math.max(h1 + 10, p.detras), e = 5, hm = (h1 + h2) / 2;
  const placa = () => poli([[0, 0], [L, 0], [L, h2], [14, h1 + (h2 - h1) * 14 / L], [14, h1 + 10], [6, h1 + 10], [0, h1]]).extrude(e);
  const A1 = placa().subtract(cubo(L / 2 - (e + 0.3) / 2, L / 2 + (e + 0.3) / 2, hm / 2, h2 + 20, -1, e + 1)), B1 = placa().subtract(cubo(L / 2 - (e + 0.3) / 2, L / 2 + (e + 0.3) / 2, -1, hm / 2, -1, e + 1));
  return A1.add(B1.translate([0, h2 + 22, 0])); }

// ======================= 🌷 FLORES =======================
function talloFlor(largo, hojas) { let m = cilX(6, 0, largo, 0, 2.3).intersect(cubo(-1, largo + 1, -4, 4, 0, 6));        // aplastado por abajo: agarra a la cama
  for (let i = 0; i < hojas; i++) m = m.add(hojaCS(36, 14).extrude(1.8).rotate([0, 0, i % 2 ? -32 : 32]).translate([largo * (0.3 + 0.24 * i), 0, 0])); return m; }
const conTallo = (flor, p) => (p.tallo > 0 ? enPlaca([flor, talloFlor(Math.max(40, p.tallo), Math.round(p.hojas || 0))], 8) : flor);
function tulipan(p) { const R = Math.max(12, p.d / 2), H = R * 2.4;
  let copa = recipiente(H, t => 5.5 + (R - 5.5) * Math.sin(Math.PI / 2 * Math.min(1, t / 0.55)) * (1 - 0.18 * suave((t - 0.6) / 0.4)), 1.8, 12.5);
  const corte = porY(poli([[-R * 0.34, H + 1], [R * 0.34, H + 1], [0, H * 0.55]]), 2 * R + 6);
  return copa.subtract(N.union([0, 60, 120].map(a => corte.rotate([0, 0, a])))).subtract(hoyoTallo(8)); }
function margarita(p) { const R = Math.max(20, p.d / 2), k = Math.max(6, Math.round(p.petalos)), rc = R * 0.3, g = 2, pet = hojaCS(R - rc * 0.6, Math.min(2 * Math.PI * R * 0.55 / k * 1.7, R * 0.5));
  const cs2 = sumaCS([circ(2 * rc)].concat([...Array(k)].map((_, i) => pet.translate([rc * 0.6, 0]).rotate(i * 360 / k))));
  const hb = rc * 1.05 * 0.7; return cs2.extrude(g).add(M().sphere(rc * 1.05, 64).scale([1, 1, 0.7]).intersect(cubo(-R, R, -R, R, 0, R)).translate([0, 0, g - 0.01])).subtract(hoyoTallo(Math.max(1.6, Math.min(6, g + hb - 4.3)))); }
function girasol(p) { const R = Math.max(26, p.d / 2), k = Math.max(8, Math.round(p.petalos)), rc = R * 0.42, pet = (l, an) => hojaCS(l, an);
  const f1 = sumaCS([circ(2 * rc)].concat([...Array(k)].map((_, i) => pet(R - rc * 0.8, R * 0.3).translate([rc * 0.8, 0]).rotate(i * 360 / k))));
  const f2 = sumaCS([circ(2 * rc)].concat([...Array(k)].map((_, i) => pet((R - rc * 0.8) * 0.82, R * 0.26).translate([rc * 0.8, 0]).rotate((i + 0.5) * 360 / k))));
  let m = f1.add(f2).extrude(2).add(f2.extrude(1.6).translate([0, 0, 1.99])).add(cil(2 * rc, 5, 3)); const B = [];   // la fila de arriba descansa sobre un suelo entero
  for (let y = -rc; y <= rc; y += 3.6) for (let x = -rc; x <= rc; x += 3.6) { const xx = x + (Math.round(y / 3.6) % 2) * 1.8; if (Math.hypot(xx, y) < rc - 2.2) B.push(cono(3, 0.9, 1.5, 7.99).translate([xx, y, 0])); }
  return m.add(N.union(B)).subtract(hoyoTallo(3.8)); }
function rosa(p) { const R = Math.max(14, p.d / 2), hb = R * 0.85 - 5.5; let m = cono(11, 1.7 * R, hb);
  for (let i = 0; i < 4; i++) { const r = R * (1 - 0.2 * i), z0 = Math.max(0, r * 0.8 - 5.2), zt = hb + R * (0.35 + 0.22 * i), h = zt - z0;
    let cap = cono(1.6 * r, 2 * r, h, z0).subtract(cono(1.6 * r - 3.4, 2 * r - 3.4, h + 0.2, z0 + 0.0).translate([0, 0, 1.6]));
    const corte = aLoLargoX(poli([[-r * 0.22, zt + 1], [r * 0.22, zt + 1], [0, zt - (zt - hb) * 0.75]]), 10).translate([r - 1, 0, 0]);
    m = m.add(cap.subtract(enRueda(5, 0, () => corte, i * 36))); }
  return m.add(cono(R * 0.3, R * 0.12, R * 0.9, hb)).subtract(hoyoTallo(7)); }
function florMaceta(p) { const R = Math.max(18, p.d / 2), H = R * 1.5;                                               // macetita + flor de 5 pétalos de pie (una pieza)
  const hm = H * 0.62, k = Math.max(4, Math.min(8, Math.round(p.petalos || 5))), Rf = R * 0.92, hf = Rf;
  let m = perfilRev(hm, t => R * (0.7 + 0.3 * t)).add(cono(2 * R * 0.94, 2 * R + 3, 2.8, hm - 4.4)).add(cil(2 * R + 3, 1.6, hm - 1.61));                              // maceta maciza (el laminador la rellena) con su reborde
  const zt = hm + R * 0.9; m = m.add(cono(8, 6, zt - hm + 2, hm - 0.01));                                         // tallo
  for (const [s0, z] of [[1, hm + R * 0.2], [-1, hm + R * 0.4]]) m = m.add(M().hull([cubo(-1.2, 1.2, -2.2, 2.2, z, z + 3), cubo(s0 * R * 0.5 - 1, s0 * R * 0.5 + 1, -2.8, 2.8, z + R * 0.5, z + R * 0.5 + 2.4), cubo(s0 * R * 0.66 - 0.6, s0 * R * 0.66 + 0.6, -0.8, 0.8, z + R * 0.66, z + R * 0.66 + 1.6)]));   // dos hojas que suben a 45°
  // la flor mira al cielo y se abre a 45° desde el tallo: sin soportes
  const lob = sumaCS([circ(Rf * 0.9)].concat([...Array(k)].map((_, i) => circ(Rf * 0.86).translate([Rf * 0.57, 0]).rotate(i * 360 / k + 90))));
  const flor = lob.extrude(hf, 12, 12, [0.12, 0.12]).rotate([180, 0, 0]).translate([0, 0, zt + hf]);
  return m.add(flor).add(M().sphere(Rf * 0.34, 48).scale([1, 1, 0.6]).translate([0, 0, zt + hf - 0.4])); }

// ======================= 🐜 HORMIGAS =======================
function hormigaForrajeo(p) { const X = Math.max(60, p.x), Y = Math.max(50, p.y), H = Math.max(30, p.z), w = 2.4, dt = (p.tubo === '15' ? 15 : 16) + 0.4, zc = w + dt / 2 + 0.3, ix = X - 2 * w, iy = Y - 2 * w;
  let c1 = caja(X, Y, H, 6).subtract(caja(ix, iy, H, 4).translate([0, 0, w]));
  c1 = c1.add(caja(ix + 0.02, iy + 0.02, 4, 4).translate([0, 0, H - 4]).subtract(M().hull([rr(ix, iy, 4).extrude(0.01).translate([0, 0, H - 4.01]), rr(ix - 6, iy - 6, 3).extrude(0.01).translate([0, 0, H])])));   // labio hacia dentro (a 45°): frena las fugas
  c1 = c1.add(cilX(dt + 5, -X / 2 - 12, -X / 2 + 1, 0, zc).add(cubo(-X / 2 - 12, -X / 2 + 1, -(dt + 5) / 2, (dt + 5) / 2, 0, zc))).subtract(cilX(dt, -X / 2 - 13, -X / 2 + w + 1, 0, zc));                           // boca del tubo de ensayo
  let tapa = caja(X + 5, Y + 5, 8, 7).subtract(caja(X + 0.6, Y + 0.6, 8, 6).translate([0, 0, 2])).subtract(cil(30, 6, -1)).subtract(cil(34, 1.2, 0.81)).subtract(cil(10.3, 6, -1).translate([X / 2 - 14, Y / 2 - 14, 0]));
  return enPlaca([c1, tapa], 8); }
function hormigaNido(p) { const X = Math.max(80, p.x), Y = Math.max(60, p.y), H = 18, hc = Math.max(4, Math.min(10, p.camara)), tun = Math.max(3, Math.min(8, p.tunel)), zr = H - 2.2, zf = zr - hc;
  let m = caja(X, Y, H, 6).subtract(caja(X - 8, Y - 8, 3, 0.6).translate([0, 0, zr]));                                                                       // rebaje de esquinas rectas: el metacrilato se corta en rectángulo
  const nx = Math.max(2, Math.floor((X - 14) / 32)), ny = Math.max(1, Math.floor((Y - 14) / 25)), C = [], L = [];
  for (let j = 0; j < ny; j++) for (let ii = 0; ii < nx; ii++) { const i = j % 2 ? nx - 1 - ii : ii, cx = (i - (nx - 1) / 2) * ((X - 44) / Math.max(1, nx - 1)), cy = (j - (ny - 1) / 2) * ((Y - 36) / Math.max(1, ny - 1)); C.push([cx, cy, i, j]); L.push(rr(22 + ((i + j) % 2) * 4, 15 + ((i * 3 + j) % 3) * 2, 6).extrude(hc + 2).translate([cx, cy, zf])); }
  for (let q = 0; q + 1 < C.length; q++) L.push(M().hull([cil(tun, hc * 0.7 + 2, zf + hc * 0.3).translate([C[q][0], C[q][1], 0]), cil(tun, hc * 0.7 + 2, zf + hc * 0.3).translate([C[q + 1][0], C[q + 1][1], 0])]));
  // un puerto de tubo de 10 en cada lado corto: agujero CERRADO por arriba (2,4 mm de techo) y rampa hasta el suelo de la cámara
  const zp = zr - 2.4 - 5.15, a = C[0], b = C.find(q => q[2] === nx - 1 && q[3] === ny - 1);
  for (const [sx, q] of [[-1, a], [1, b]]) { const xe = sx * (X / 2 + 1), xi = sx * (X / 2 - 10), xr = xi - sx * 0.5, xc = q[0] + sx * 0.5;
    L.push(cilX(10.3, Math.min(xe, xi), Math.max(xe, xi), q[1], zp)); L.push(M().hull([cilX(10.3, Math.min(xi, xr), Math.max(xi, xr), q[1], zp), cilX(6, Math.min(q[0], xc), Math.max(q[0], xc), q[1], zf + 3)])); }
  return m.subtract(N.union(L)); }
function hormigaConectores(p) { const k = Math.max(1, Math.round(p.tapones)), L = [];
  for (let i = 0; i < k; i++) L.push(cil(14, 2.4).add(cono(10.3, 9.6, 9, 2.39)));                                                                             // tapón
  L.push(tubo(14.6, 7, 26).subtract(cil(10.35, 11, -0.01)).subtract(cono(10.35, 7, 1.7, 10.98)).subtract(cil(10.35, 11.1, 15)));                                                                  // unión de dos tubos de 10
  const dt = (p.tubo === '15' ? 15 : 16) + 0.5; L.push(cil(dt + 5, 17).add(cil(14.6, 12, 16.99)).subtract(cil(dt, 12, -0.01)).subtract(cono(dt, 7, (dt - 7) / 2, 11.98)).subtract(cil(7, 40, -1)).subtract(cil(10.35, 12.1, 17)));   // de tubo de ensayo a tubo de 10
  L.push(tubo(24, 20, 4).add(cil(24, 1.2)));                                                                                                                 // comedero
  return enFila(L, 5); }

// ======================= 🖌️ PINCELES =======================
function pincelLavador(p) { const D = Math.max(70, p.d), H = Math.max(50, p.h), w = 2.4, k = Math.max(3, Math.min(10, Math.round(p.apoyos))), di = D - 2 * w;
  let vaso = tubo(D, di, H).add(cil(D, 3));
  vaso = vaso.subtract(enRueda(k, D / 2 - w / 2, () => porY(poli([[-5, H + 1], [5, H + 1], [0, H - 7]]), 12).rotate([0, 0, 90])));                           // muescas en V para apoyar los pinceles
  let rej = cil(di - 1.4, 3); const R = []; for (let y = -di / 2 + 7; y <= di / 2 - 7; y += 6.5) { const half = Math.sqrt(Math.max(0, (di / 2 - 4) ** 2 - y * y)); if (half > 5) R.push(cubo(-half, half, y - 1.6, y + 1.6, -1, 5)); }
  rej = rej.subtract(N.union(R)).add(enRueda(3, di / 2 - 8, () => cil(7, Math.max(8, p.posos) + 3, 0), 30));                                                   // rejilla sobre 3 patas (patas arriba)
  return enPlaca([vaso, rej], 8); }
function pincelSoporte(p) { const k = Math.max(4, Math.min(12, Math.round(p.n))), paso = 16, X = k * paso + 14, Y = 46, H = 30;
  let m = caja(X, Y, H, 5).subtract(cubo(-X, X, -Y, -1, 14, H + 1));
  for (let i = 0; i < k; i++) { const x = (i - (k - 1) / 2) * paso; m = m.subtract(porY(poli([[x - 5, 14.2], [x + 5, 14.2], [x, 8]]), Y / 2).translate([0, -Y / 4 - 1, 0])).subtract(cil(7 + (i % 3) * 2.5, H, 4).translate([x, Y / 4 + 1, 0])); }
  return m; }

// ======================= 🗑️ PAPELERAS =======================
function papeleraMesa(p) { const D = Math.max(90, p.d), H = Math.max(100, p.h), w = Math.max(1.6, p.pared), L = Math.round(p.lados), kk = L >= 13 ? 1 : 1 / Math.cos(Math.PI / L), sec = r => (L >= 13 ? circ(2 * r) : pol(L, r * kk, L % 2 ? 90 : 90 + 180 / L));
  const rb = D / 2 - Math.max(13.5, D * 0.09);                                                                                                               // abajo, más estrecha
  const cubo1 = M().hull([sec(rb).extrude(0.01), sec(D / 2).extrude(0.01).translate([0, 0, H - 0.01])]).subtract(M().hull([sec(rb - w).extrude(0.01).translate([0, 0, 2.4]), sec(D / 2 - w).extrude(0.01).translate([0, 0, H + 0.01])]));
  const aro = sec(D / 2 + 2.4).subtract(sec(D / 2 - w - 6)).extrude(2.4).add(sec(D / 2 - w - 1.2).subtract(sec(D / 2 - w - 3.6)).extrude(10).translate([0, 0, 2.39]));
  return p.aro ? cubo1.add(aro) : cubo1; }                                                                                                                   // el aro se imprime ALREDEDOR del pie (suelto, a más de 4 mm): todo en una placa
function papeleraColgar(p) { const X = Math.max(80, p.x), Y = Math.max(50, p.y), H = Math.max(80, p.z), w = 2.4, t = Math.max(10, p.puerta) + 0.8, e = 3.6, an = 20, sep = Math.min(X - 60, 110) / 2, Lf = 40;
  let c1 = caja(X, Y, H, 8).subtract(caja(X - 2 * w, Y - 2 * w, H, 6).translate([0, 0, w]));
  for (const sx of (sep > 14 ? [-1, 1] : [0])) c1 = c1.subtract(cubo(sx * sep - (an + 1) / 2, sx * sep + (an + 1) / 2, Y / 2 - w - 1, Y / 2 + 1, H - 24, H - 24 + e + 1.6));   // ojales en la pared de atrás
  // gancho (se imprime tumbado): puente sobre la puerta, pata por delante, pie que entra por el ojal y uña que sube por dentro del cubo
  const gancho = () => sumaCS([rr(2 * e + t, e, 1).translate([(2 * e + t) / 2, e / 2]), rr(e, 26, 1).translate([e + t + e / 2, e - 13]), rr(e, Lf, 1).translate([e / 2, e - Lf / 2]),
    rr(w + 1.2 + 2 * e, e, 1).translate([-(w + 1.2) / 2, e - Lf + e / 2]), rr(e, 13, 1).translate([-(w + 1.2) - e / 2, e - Lf + 6.5])]).extrude(an);
  return enPlaca([c1, enFila(sep > 14 ? [gancho(), gancho()] : [gancho()], 6)], 8); }
// ======================= 🎲 JUEGOS DE MESA =======================
function tresEnRaya(p) { const c1 = Math.max(18, p.casilla), T = 3 * c1 + 10, g = 6; let tab = caja(T, T, g, 5);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) tab = tab.subtract(caja(c1 - 3, c1 - 3, 3, 3).translate([(i - 1) * c1, (j - 1) * c1, g - 2.6]));
  const o = () => tubo(c1 - 5, c1 - 12.5, 5), b = rr(c1 - 5, 4.6, 1.5).extrude(5), x = () => b.rotate([0, 0, 45]).add(b.rotate([0, 0, -45]));
  return enRejilla([tab].concat([...Array(5)].map(x), [...Array(5)].map(o)), T + 4, 4); }
function molino(p) { const T = Math.max(90, p.lado), g = 5, u = (T - 22) / 6, d = Math.min(11, u * 0.72); let tab = caja(T, T, g, 6); const pts = [], Ln = [];
  const ln = (x0, y0, x1, y1) => M().hull([cil(1.8, 2, g - 0.6).translate([x0, y0, 0]), cil(1.8, 2, g - 0.6).translate([x1, y1, 0])]);
  for (const k of [3, 2, 1]) { const q = k * u; for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) pts.push([x * q, y * q]); Ln.push(ln(-q, -q, q, -q), ln(q, -q, q, q), ln(q, q, -q, q), ln(-q, q, -q, -q)); }
  Ln.push(ln(0, u, 0, 3 * u), ln(0, -u, 0, -3 * u), ln(u, 0, 3 * u, 0), ln(-u, 0, -3 * u, 0));
  tab = tab.subtract(N.union(Ln)).subtract(N.union(pts.map(q => cil(d, 3, g - 1.5).translate([q[0], q[1], 0]))));
  return enRejilla([tab].concat([...Array(9)].map(() => cil(d - 1.5, 5)), [...Array(9)].map(() => hex(d - 2).extrude(5))), T + 4, 3); }
function solitario(p) { const paso = Math.max(12, p.paso), D = 7 * paso + 34, g = 9, dp = Math.min(7, paso - 6); let tab = cil(D, g).subtract(tubo(D - 6, D - 30, 5, g - 3.5)); const Hs = [];
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (Math.abs(i) <= 1 || Math.abs(j) <= 1) Hs.push(cil(dp + 0.5, 7, g - 6).translate([i * paso, j * paso, 0]));
  tab = tab.subtract(N.union(Hs)); if (!p.pivotes) return tab;
  const peg = () => cil(dp, 13).add(cono(dp, dp + 3.4, 1.7, 12.99)).add(cil(dp + 3.4, 2.2, 14.68));
  return enRejilla([tab].concat([...Array(32)].map(peg)), D + 4, 3); }
function mancala(p) { const d = Math.max(20, p.hoyo), paso = d + 4, X = 8 * paso + 10, Y = 2 * paso + 8, h = Math.max(6, d * 0.36), g = h + 3, Rs = (d * d / 4 + h * h) / (2 * h), zc = g + Rs - h;
  let m = caja(X, Y, g, Math.min(Y / 2 - 1, 18)); const L = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) L.push(M().sphere(Rs, 64).translate([(i - 2.5) * paso, (j - 0.5) * paso, zc]));
  for (const sx of [-1, 1]) L.push(M().hull([M().sphere(Rs, 64).translate([sx * 3.5 * paso, -paso / 2, zc]), M().sphere(Rs, 64).translate([sx * 3.5 * paso, paso / 2, zc])]));
  return m.subtract(N.union(L)); }
function tangram(p) { const S = Math.max(60, p.lado), g = Math.max(3, p.grosor), u = S / 4, hol = 0.4;
  const P = [[[0, 0], [4, 0], [2, 2]], [[0, 0], [2, 2], [0, 4]], [[4, 2], [4, 4], [2, 4]], [[4, 0], [4, 2], [3, 1]], [[2, 2], [3, 3], [1, 3]], [[3, 1], [4, 2], [3, 3], [2, 2]], [[0, 4], [1, 3], [3, 3], [2, 4]]];
  const piezas = N.union(P.map(q => poli(q.map(v => [v[0] * u, v[1] * u])).offset(-hol, 'Miter').extrude(g)));
  const marco = caja(S + 7, S + 7, g + 2, 4).subtract(caja(S + 0.9, S + 0.9, g + 2, 0.5).translate([0, 0, 2]));
  return p.caja ? enFila([piezas, marco], 8) : piezas; }
function portaCartas(p) { const L = Math.max(120, p.largo), Rr = L * 1.1, a = L / Rr / 2, W = 34, g = 16;
  return arcoCS(Rr, W, a).extrude(g).subtract(arcoCS(Rr - 6, 1.9, a - 0.03).extrude(g).translate([0, 0, 5])).subtract(arcoCS(Rr + 7, 1.9, a - 0.03).extrude(g).translate([0, 0, 5])).translate([0, -Rr, 0]); }

// ======================= 💼 EMPRESAS Y HOSTELERÍA =======================
function tarjetero(p) { const an = (p.tarjeta === 'us' ? 89 : 85.6) + 1.4, cap = Math.max(6, p.capacidad), e = 2.6, X = an + 2 * e, ang = 20, sn = Math.sin(ang * R2), cs2 = Math.cos(ang * R2), hb = 42, hf = 17, Yb = cap + 2 * e + hb * sn;
  const pared = (h, y) => M().cube([X, e, h], false).translate([-X / 2, 0, 0]).rotate([-ang, 0, 0]).translate([0, y, 0]);
  let m = cubo(-X / 2, X / 2, 0, Yb, 0, e).add(pared(hf, 0)).add(pared(hb, cap + e));
  const lado = aLoLargoX(poli([[0, 0], [Yb, 0], [cap + 2 * e + hb * sn, hb * cs2], [cap + e + hb * sn, hb * cs2], [hf * sn, hf * cs2]]), e);
  m = m.add(lado.translate([X / 2 - e / 2, 0, 0])).add(lado.translate([-X / 2 + e / 2, 0, 0]));
  if (hayTexto(p.texto)) m = m.add(textoEnCara(p.texto, Math.min(8.5, hf * 0.5), X - 10, 0.9, 90 - ang, hf / 2 * sn, hf / 2 * cs2));
  return m.intersect(cubo(-X, X, -60, Yb + 60, 0, 200)); }                                                             // lo que baja del suelo al inclinar las paredes, fuera: la base apoya entera
function cenicero(p) { const D = Math.max(80, p.d), H = Math.max(35, p.h), w = 3, r0 = D / 2 - w - 0.6, hc = r0 - 14;
  const vaso = tubo(D, D - 2 * w, H).add(cil(D, 3.2));
  let tapa = cono(2 * r0, 28 + 6.8, hc).subtract(cono(2 * r0 - 6.8, 28, hc + 0.02).translate([0, 0, -0.01])).add(tubo(D + 2, 2 * r0 - 6.8, 5));
  tapa = tapa.subtract(enRueda(3, D / 2 - 2, () => aLoLargoX(poli([[-4.6, -0.01], [4.6, -0.01], [0, 4.6]]), 16), 90));                                                                                // 3 apoyos (en la cara que queda arriba al darle la vuelta)
  return enFila([vaso, tapa], 8); }
function posavasos(p) { const D = Math.max(70, p.d), g = 4, k = Math.max(2, Math.min(8, Math.round(p.n)));
  let uno = cil(D, g).subtract(cil(D - 6, 1.4, g - 1.2)); if (hayTexto(p.texto)) uno = uno.add(textoCS(p.texto, D * 0.17, D - 22).cs.extrude(1.2).translate([0, 0, g - 1.21]));
  const sop = cil(D + 22, 3).add(enRueda(3, D / 2 + 4.8, () => cono(12, 8, 2, 2.99).add(cil(8, k * (g + 0.3) + 6, 4.98)), 90));
  return p.que === 'uno' ? uno : p.que === 'soporte' ? sop : enFila([uno, sop], 8); }
function portaCarta(p) { const X = Math.max(60, p.ancho), Y = 46, g = Math.max(1.5, p.grosor) + 0.5, a = Math.atan2(13, 22) / R2;
  let m = aLoLargoX(poli([[0, 0], [Y, 0], [Y, 12], [Y - 10, 18], [22, 18], [0, 5]]), X).subtract(cubo(-X / 2 - 1, X / 2 + 1, 0, g, 0, 30).rotate([-10, 0, 0]).translate([0, Y - 21, 5]));
  if (hayTexto(p.texto)) m = m.add(textoEnCara(p.texto, 9, X - 12, 0.9, a, 11, 11.5)); return m; }
function botePropinas(p) { const a = Math.max(60, p.lado), H = Math.max(70, p.h), w = 2.4;
  let bote = caja(a, a, H, 12).subtract(caja(a - 2 * w, a - 2 * w, H, 10).translate([0, 0, w]));
  if (hayTexto(p.texto)) bote = bote.add(textoCS(p.texto, Math.min(13, a * 0.17), a - 30).cs.extrude(1.2).rotate([90, 0, 0]).translate([0, -a / 2 + 0.2, H * 0.55]));
  const tapa = caja(a, a, 3, 12).add(rr(a - 2 * w - 0.5, a - 2 * w - 0.5, 10).subtract(rr(a - 2 * w - 5, a - 2 * w - 5, 8)).extrude(6).translate([0, 0, 2.99])).subtract(caja(34, 5, 20, 2).translate([0, 0, -1]));
  return enPlaca([bote, tapa], 8); }

// ======================= LA LISTA =======================
const P60 = ['pack60'];
const D = (cat, tambien, e, t, d, uso, color, campos, gen, nota, mas) => Object.assign({ cat, tambien: tambien.concat(P60), e, t, d, uso, color, campos, gen, nota }, mas || {});
export const DISENOS_PACK60 = {
  // ---------- 🕯️ VELAS (10) ----------
  velaFacetada: D('vasos', ['adultos', 'regalos'], '🕯️', 'Portavelas facetado', 'Bloque tallado en triángulos con el hueco justo de la vela de té', 'deco', '#f4f4f0',
    [SV, n('d', 'Ancho', 74, 50, 140), n('h', 'Alto', 42, 22, 120), n('lados', 'Lados', 6, 4, 10, 1, ''), n('pisos', 'Pisos', 2, 2, 5, 1, ''), n('abajo', 'Ancho abajo', 82, 70, 100, 1, '%')], velaFacetada,
    p => notaHueco(p) + 'Macizo y pesado: no vuelca. Sin soportes. En blanco mate o en mármol queda de tienda.' + FUEGO, { busca: 'vela velas portavelas posavelas tealight candle' }),
  velaCandelero: D('vasos', ['adultos', 'hogar'], '🕯️', 'Candelero para vela larga', 'Torneado, con platillo para la cera; para velas de candelabro de 22 mm', 'deco', '#c9a227',
    [s('palo', 'Vela', '22', [['22', 'De 22 mm (la normal de candelabro)'], ['19', 'De 19–20 mm (fina)']]), n('h', 'Alto', 110, 60, 220), n('base', 'Ancho de la base', 72, 52, 120)], candelero,
    p => 'La boca es cónica (de ' + (p.palo === '19' ? '20,2 a 18,6' : '23 a 21,4') + ' mm, 24 de hondo): la vela entra y se queda apretada aunque no mida justo. El platillo de abajo recoge la cera. Sale de pie, sin soportes (nada pasa de 45°).' + FUEGO, { acabado: 'seda', busca: 'candelabro vela larga taper candelero' }),
  velaTrio: D('vasos', ['adultos'], '🕯️', 'Trío de portavelas en escalera', 'Tres columnas de alturas distintas, unidas: centro de mesa', 'deco', '#1b1b1d',
    [SV, n('lados', 'Lados (13 = redondas)', 6, 4, 13, 1, ''), n('h1', 'Alto 1', 40, 22, 160), n('h2', 'Alto 2', 65, 22, 160), n('h3', 'Alto 3', 90, 22, 160)], velaTrio,
    p => notaHueco(p) + 'Las tres van unidas en una sola pieza. Sin soportes.' + FUEGO, { busca: 'velas centro mesa escalera' }),
  velaPlato: D('vasos', ['hogar'], '🕯️', 'Plato para velón', 'Con aro que centra la vela y canal para la cera', 'funcional', '#f4f4f0',
    [s('velon', 'Velón', '70', [['60', 'De 60 mm'], ['70', 'De 70 mm'], ['80', 'De 80 mm'], ['100', 'De 100 mm']]), n('borde', 'Borde alrededor', 16, 10, 40)], velaPlato,
    p => 'Para velones de ' + p.velon + ' mm (las medidas más vendidas son 60, 70 y 80): el aro del centro lo sujeta y la cera cae al canal de alrededor. Sin soportes. Para vela encendida, en PETG.' + FUEGO, { busca: 'velon pilar plato vela bandeja' }),
  velaFarol: D('vasos', ['adultos', 'navidad'], '🏮', 'Farol de ventanas ojivales', 'Cuatro ventanas en punta y asa para colgarlo', 'deco', '#1b1b1d',
    [SV, n('lado', 'Ancho', 84, 64, 160), n('h', 'Alto', 110, 70, 200), c('asa', 'Con asa para colgar', true)], velaFarol,
    p => notaHueco(p) + 'Las ventanas acaban en punta y el asa sube a 45°: sale entero y sin soportes. ' + 'PENSADO PARA VELA LED: con una vela de verdad el aire caliente sube al asa. Si usas vela de verdad, solo en PETG, sin colgarlo y sin dejarlo solo.', { busca: 'farol linterna vela led colgar' }),
  velaCorazon: D('vasos', ['regalos', 'cuqui', 'bebes'], '💗', 'Portavelas corazón', 'Un corazón macizo con el hueco de la vela', 'deco', '#e63946',
    [SV, n('ancho', 'Ancho', 104, 100, 180), n('h', 'Alto', 26, 20, 60)], velaCorazon,
    p => notaHueco(p) + 'Regalo de San Valentín, boda o Día de la Madre. Sin soportes.' + FUEGO, { busca: 'corazon vela san valentin boda regalo' }),
  velaCentro: D('vasos', ['adultos', 'navidad'], '🌼', 'Centro de mesa de velas (flor)', 'De 3 a 6 velas alrededor y, si quieres, una más alta en el centro', 'deco', '#f4f4f0',
    [SV, n('n', 'Velas alrededor', 5, 3, 6, 1, ''), n('h', 'Alto', 26, 20, 60), c('centro', 'Una más en el centro, más alta', true)], velaCentro,
    p => { const v = velaDe(p), k = Math.max(3, Math.min(6, Math.round(p.n))), ro = v.d / 2 + 5, R = Math.max(ro * 0.92 / Math.sin(Math.PI / k), ro + 12); return notaHueco(p) + 'Mide ' + n2(2 * (R + ro)) + ' mm de ancho. Una pieza, sin soportes.' + FUEGO; }, { busca: 'centro mesa velas corona adviento' }),
  velaBandeja: D('vasos', ['hogar', 'adultos'], '🕯️', 'Bandeja para velas con sitio para el mechero', 'De 2 a 4 velas en fila y una ranura para el mechero', 'funcional', '#b4b8bf',
    [SV, n('n', 'Velas', 3, 2, 4, 1, ''), c('mechero', 'Con ranura para el mechero (84 × 15 mm)', true)], velaBandeja,
    p => notaHueco(p) + (p.mechero ? 'La ranura es para un mechero normal de canto (hasta 82 × 14,5 mm). ' : '') + 'Plana y sin soportes.' + FUEGO, { busca: 'bandeja velas mechero cerillas' }),
  velaAdaptador: D('vasos', ['componentes'], '🔁', 'Adaptador de velas', 'Pon una vela de té en tu candelabro, o una vela fina en un candelero normal', 'encaje', '#f4f4f0',
    [s('modo', 'Qué quiero', 'te', [['te', 'Vela de té en un candelabro'], ['fina', 'Vela fina en un candelero de 22']]), SV, s('palo', 'El candelabro es de', '22', [['22', '22 mm (lo normal)'], ['19', '19–20 mm']]), n('fina', 'Mi vela fina mide', 12, 6, 18, 0.5)], velaAdaptador,
    p => (p.modo === 'fina' ? 'Un casquillo: por fuera entra en el candelero de ' + p.palo + ' mm y por dentro lleva tu vela de ' + n2(p.fina) + ' mm (con 0,4 de aire). El fondo recoge la cera.' : 'Una espiga cónica que entra en el candelabro de ' + p.palo + ' mm y arriba un vasito para la ' + velaDe(p).t + '. Sube a 45°: de pie y sin soportes (ponle borde de adherencia: apoya poco).') + FUEGO, { busca: 'adaptador vela candelabro reductor' }),
  velaEstrellas: D('vasos', ['navidad', 'bebes', 'adultos'], '✨', 'Portavelas de estrellas', 'Una pantalla calada de estrellas de cuatro puntas: la luz sale dibujada', 'deco', '#f4f4f0',
    [SV, n('d', 'Ancho', 86, 66, 160), n('h', 'Alto', 90, 50, 180), n('tam', 'Alto de las estrellas', 16, 10, 26)], velaEstrellas,
    p => notaHueco(p) + 'Pared de 2 mm con las estrellas atravesadas. Son de cuatro puntas a propósito: ninguno de sus bordes queda plano, así que salen limpias y sin soportes. PENSADO PARA VELA LED; con vela de verdad, solo en PETG y sin dejarlo solo.', { busca: 'estrellas calado pantalla vela led navidad' }),
  // ---------- 🌸 (la flor de loto va con las velas) ----------
  velaLoto: D('vasos', ['flores', 'regalos', 'adultos'], '🪷', 'Flor de loto portavelas', 'Tres filas de pétalos en punta alrededor de la vela', 'deco', '#ff8fb1',
    [SV, n('petalos', 'Pétalos por fila', 8, 6, 12, 1, '')], velaLoto,
    p => notaHueco(p) + 'Los pétalos suben a más de 45° desde la base: sale entera y sin soportes. En rosa o blanco seda parece de cerámica.' + FUEGO, { acabado: 'seda', busca: 'loto flor vela yoga zen' }),
  // ---------- 💡 LÁMPARAS (7) ----------
  lampPliegues: D('lamparas', ['adultos', 'hogar'], '💡', 'Pantalla de pliegues', 'Colgante plisada, como de papel', 'deco', '#f4f4f0',
    [SC, n('arriba', 'Ancho arriba', 110, 92, 200), n('abajo', 'Ancho abajo', 220, 100, 250), n('h', 'Alto', 150, 60, 240), n('pliegues', 'Pliegues', 28, 0, 60, 1, ''), n('fondo', 'Hondo del pliegue', 3.5, 0, 8, 0.5), n('giro', 'Giro de los pliegues', 0, -90, 90, 5, '°'), n('pared', 'Pared', 1.2, 0.8, 3, 0.2)], lampPliegues,
    p => notaCasq(p) + 'Se imprime BOCA ABAJO (la placa del casquillo en la cama) y sin soportes. Pared de ' + n2(Math.max(0.8, p.pared)) + ' mm: deja pasar la luz.' + LUZ + 'Lleva 6 respiraderos arriba.', { busca: 'lampara pantalla colgante techo e27 e14 plisada' }),
  lampDiamante: D('lamparas', ['adultos'], '💎', 'Pantalla diamante', 'Facetada en triángulos, más ancha en la cintura', 'deco', '#f4f4f0',
    [SC, n('d', 'Ancho', 200, 120, 250), n('h', 'Alto', 170, 80, 240), n('lados', 'Lados', 8, 4, 12, 1, ''), n('pared', 'Pared', 1.2, 0.8, 3, 0.2)], lampDiamante,
    p => notaCasq(p) + 'Boca abajo y sin soportes. Las caras planas hacen brillos distintos según les da la luz.' + LUZ, { busca: 'lampara pantalla geometrica facetada origami e27' }),
  lampTulipa: D('lamparas', ['adultos'], '🌷', 'Pantalla tulipa torcida', 'Un prisma que se abre y gira', 'deco', '#ffb703',
    [SC, n('d', 'Ancho', 190, 120, 250), n('h', 'Alto', 160, 80, 240), n('lados', 'Lados', 7, 3, 12, 1, ''), n('giro', 'Giro', 70, -200, 200, 5, '°'), n('pared', 'Pared', 1.2, 0.8, 3, 0.2)], lampTulipa,
    p => notaCasq(p) + 'Boca abajo y sin soportes.' + LUZ, { busca: 'lampara pantalla torcida espiral e27' }),
  lampCelosia: D('lamparas', ['adultos'], '🕸️', 'Pantalla de celosía', 'Barras que se cruzan en rombos: la luz dibuja sombras', 'deco', '#1b1b1d',
    [SC, n('arriba', 'Ancho arriba', 100, 94, 180), n('abajo', 'Ancho abajo', 190, 100, 250), n('h', 'Alto', 150, 80, 240), n('barras', 'Barras por sentido', 12, 6, 24, 1, ''), n('vuelta', 'Lo que giran', 60, 20, 120, 5, '°'), n('grueso', 'Grueso de las barras', 3, 2.4, 6, 0.2)], lampCelosia,
    p => notaCasq(p) + 'Dos tandas de barras, una gira a cada lado: se cruzan en rombos, se sujetan entre sí y acaban unidas de dos en dos en una corona de puntas, así que sale boca abajo y sin soportes (el giro se ajusta solo para que casen).' + LUZ + 'Al ser abierta, el calor sale solo.', { busca: 'lampara jaula celosia industrial rombos e27' }),
  lampBase: D('lamparas', ['adultos', 'oficina'], '🔆', 'Base para bombilla vista', 'Una peana geométrica: el portalámparas sale por arriba y la bombilla queda al aire', 'deco', '#1b1b1d',
    [SC, n('lados', 'Lados', 6, 3, 12, 1, ''), n('arriba', 'Ancho arriba', 76, 68, 140), n('abajo', 'Ancho abajo', 120, 70, 220), n('h', 'Alto', 70, 40, 160)], lampBase,
    p => notaCasq(p) + 'Se imprime boca abajo (la cara del casquillo en la cama) y sin soportes; abajo lleva el paso del cable. Para una bombilla LED de filamento a la vista, que es lo que se lleva.' + LUZ, { busca: 'lampara mesa bombilla vista edison base peana e27' }),
  lampAro: D('lamparas', ['componentes'], '⭕', 'Aro reductor de pantalla', 'Para poner una pantalla de E27 en un portalámparas E14 (o B22)', 'encaje', '#f4f4f0',
    [s('tipo', 'De / a', 'e27e14', [['e27e14', 'Pantalla de 42 mm → casquillo E14 (29 mm)'], ['e27b22', 'Pantalla de 42 mm → casquillo B22 (29 mm)'], ['grande', 'A mi medida…']]), n('grande', 'Agujero de la pantalla (a medida)', 42, 30, 80, 0.5), n('pequeno', 'Agujero para el casquillo (a medida)', 29, 20, 60, 0.5)], lampAro,
    () => 'Un disco con un escalón que centra: el escalón entra en el agujero grande de la pantalla y el agujero pequeño abraza el portalámparas. Se imprime plano en 10 minutos. En PETG.', { busca: 'reductor aro pantalla lampara e27 e14 adaptador' }),
  lampNube: D('lamparas', ['bebes', 'cuqui', 'ninos'], '☁️', 'Nube de pared con luz', 'Nube, luna, corazón o estrella: la tira LED va detrás y hace un halo', 'deco', '#f4f4f0',
    [s('forma', 'Forma', 'nube', [['nube', 'Nube'], ['luna', 'Luna'], ['corazon', 'Corazón'], ['estrella', 'Estrella']]), n('tam', 'Tamaño', 200, 100, 250), n('fondo', 'Lo que se separa de la pared', 22, 12, 40)], lampNube,
    p => 'La cara de delante (3 mm) y, por detrás, un marco metido 10 mm hacia dentro: ahí se pega la tira LED (de 5 V por USB) y la luz sale por los bordes contra la pared. Se cuelga apoyando el marco en dos clavos. Se imprime con la cara en la cama, sin soportes. Solo tiras LED: no calientan.', { busca: 'nube luna luz led pared bebe habitacion quitamiedos' }),
  // ---------- 🖱️ RATÓN (5) ----------
  ratonExpositor: D('gaming', ['oficina', 'jovenes'], '🖱️', 'Expositor de ratón', 'Como los soportes premium: plano inclinado, tope delante y paso para el cable', 'funcional', '#1b1b1d',
    [n('largo', 'Largo del ratón', 125, 90, 140), n('ancho', 'Ancho del soporte', 70, 50, 95), n('angulo', 'Inclinación', 30, 15, 40, 1, '°')], p => ratonExpositor(p),
    p => 'El ratón descansa inclinado ' + Math.round(p.angulo) + '° con el morro contra el tope; el tope tiene una muesca en V para el cable. Se imprime TUMBADO de lado (así las capas van a lo largo y no necesita soportes): al sacarlo, lo pones de pie. Mide tu ratón: los de juego andan por 120–128 mm de largo.', { busca: 'raton mouse soporte stand expositor gaming' }),
  ratonBungee: D('gaming', ['oficina'], '🪝', 'Bungee para el cable del ratón', 'Levanta el cable para que no roce ni tire', 'funcional', '#1b1b1d',
    [n('alto', 'Alto del mástil', 95, 60, 140), n('cable', 'Grueso del cable', 3.2, 2.5, 5, 0.1), c('peso', 'Huecos debajo para monedas (peso)', true)], ratonBungee,
    p => 'El cable entra a presión por arriba en el aro (Ø' + n2(Math.max(2.5, p.cable) + 0.3) + '). El mástil es fino a propósito: cede un poco al tirar. ' + (p.peso ? 'Debajo lleva 3 huecos de Ø26,4 × 5,6 mm: en cada uno caben 2 monedas de 50 céntimos (o de 2 €) para que pese; tápalos con cinta. El techo de esos huecos sale «en puente» (no se ve): sin soportes. ' : '') + 'En PETG flexa sin partirse; en PLA es más rígido. De pie y sin soportes.', { busca: 'bungee cable raton mouse gaming', sinSoportes: 'Lo único que queda en el aire es el techo de los huecos de las monedas, por debajo: son puentes cortos que no se ven.' }),
  ratonFunda: D('gaming', ['oficina', 'organizar'], '📥', 'Funda de pared para el ratón', 'Se atornilla (o se pega) al lateral de la mesa: el ratón descansa de pie', 'funcional', '#b4b8bf',
    [n('ancho', 'Ancho del ratón', 66, 50, 90), n('fondo', 'Alto del ratón (lo que abulta)', 42, 30, 60), n('alto', 'Alto de la espalda', 85, 50, 130)], ratonFunda,
    () => 'Una caja abierta por arriba, con la espalda alta y el frente bajo: el ratón entra de pie. Dos agujeros para tornillos de 4 mm en la espalda (o cinta de doble cara) y una muesca delante para dejarlo cargando. Se imprime de pie, sin soportes.', { busca: 'raton funda pared colgar mesa organizador' }),
  ratonDock: D('gaming', ['oficina'], '🔌', 'Base de descanso con hueco para el receptor USB', 'La huella del ratón, el receptor a mano y la guía del cable de carga', 'funcional', '#1b1b1d',
    [n('largo', 'Largo del ratón', 125, 90, 140), n('ancho', 'Ancho del ratón', 66, 50, 90)], ratonDock,
    () => 'El ratón se queda en su huella (2,8 mm de hondo). Detrás, una torre con una ranura de 12,4 × 4,8 mm donde se guarda de pie el receptor USB, y una guía de 4,5 mm para que el cable de carga no se caiga detrás de la mesa. Plana y sin soportes.', { busca: 'raton dock base receptor usb dongle carga' }),
  reposaMunecas: D('oficina', ['gaming', 'hogar'], '🫳', 'Reposamuñecas', 'Para el ratón: redondeado y sin cantos', 'flexible', '#1b1b1d',
    [n('largo', 'Largo', 120, 60, 200), n('fondo', 'Fondo', 72, 40, 110), n('alto', 'Alto', 18, 10, 30)], reposaMunecas,
    () => 'Una loma suave. Lo suyo es imprimirlo en TPU (blando) con un 15 % de relleno; en PLA o PETG queda duro, pero también descansa la muñeca. Sin soportes. Debajo, dos puntos de cinta antideslizante.', { busca: 'reposamunecas muneca raton ergonomico tpu' }),
  // ---------- 🏠 HOGAR (8) ----------
  portaEstropajo: D('hogar', ['organizar'], '🧽', 'Porta-estropajo con bandeja', 'El estropajo y el cepillo escurren y el agua se queda en la bandeja', 'funcional', '#00b4a6',
    [n('x', 'Ancho', 130, 80, 220), n('y', 'Fondo', 75, 50, 140), n('z', 'Alto', 55, 30, 110), c('separador', 'Con separador para el cepillo', true)], portaEstropajo,
    () => 'Dos piezas: la cesta (con ranuras en el suelo) y la bandeja, que tiene tres nervios para que la cesta quede levantada y el agua corra debajo. Sin soportes. En PETG aguanta el agua caliente del fregadero; el PLA se deforma.', { busca: 'estropajo esponja fregadero cocina escurre' }),
  ganchoPuerta: D('hogar', ['organizar'], '🚪', 'Gancho para la puerta', 'Se cuelga encima de la puerta, sin tornillos', 'funcional', '#1b1b1d',
    [n('puerta', 'Grueso de la puerta', 35, 15, 50, 0.5), n('largo', 'Largo de la pata', 110, 40, 200), n('gancho', 'Radio del gancho', 14, 8, 30), n('ancho', 'Ancho', 24, 15, 50), n('grueso', 'Grueso', 4.5, 3.2, 8, 0.1)], ganchoPuerta,
    p => 'Las puertas de casa miden 35 o 40 mm de grueso; las de armario, 16–19: mide la tuya y ponlo (lleva 0,6 de aire). Se imprime TUMBADO: las capas van a lo largo del gancho, que es como aguanta el peso (unos 3–5 kg en PETG de ' + n2(Math.max(3.2, p.grueso)) + ' mm; no es para colgar a nadie).', { busca: 'gancho puerta colgador percha toalla albornoz' }),
  topePuerta: D('hogar', ['oficina'], '🚧', 'Tope de puerta (cuña)', 'Con estrías para que no resbale', 'funcional', '#ff8a00',
    [n('largo', 'Largo', 120, 60, 200), n('ancho', 'Ancho', 40, 25, 80), n('alto', 'Alto atrás', 26, 12, 50)], topePuerta,
    () => 'Cuña con estrías arriba: la puerta se clava. En TPU agarra mucho más al suelo; en PETG o PLA, pégale debajo una tira de goma. Sin soportes y macizo (4 paredes).', { busca: 'tope puerta cuna sujeta' }),
  portallaves: D('hogar', ['organizar', 'regalos'], '🔑', 'Colgador de llaves', 'De pared, con ganchos de seta y, si quieres, tu texto', 'funcional', '#c9a227',
    [n('ganchos', 'Ganchos', 5, 2, 8, 1, ''), n('ancho', 'Ancho', 200, 80, 250), n('alto', 'Alto', 60, 40, 120), c('casa', 'Con tejadito (forma de casa)', true), tx('texto', 'Texto', 'LLAVES', 'Tu apellido, «HOME»… o vacío')], portallaves,
    () => 'Se imprime con la espalda en la cama: los ganchos son clavijas de Ø8 con cabeza de seta (cono a 45°: sin soportes y las llaves no se salen). Dos agujeros avellanados para tornillos de 4 mm. El texto sale en relieve de 1,2 mm.', { busca: 'llaves colgador entrada casa recibidor' }),
  escurreCubiertos: D('hogar', [], '🍴', 'Escurre-cubiertos con plato', 'El agua cae al plato y los cubiertos se airean', 'funcional', '#f4f4f0',
    [n('d', 'Ancho', 110, 70, 160), n('h', 'Alto', 130, 70, 200)], escurreCubiertos,
    () => 'Vaso con el suelo lleno de agujeros y rombos en la pared (se imprimen sin soportes) y un plato con tres apoyos que lo levanta. En PETG: el PLA no aguanta el agua caliente ni el lavavajillas.', { busca: 'cubiertos escurridor cocina' }),
  ganchosS: D('hogar', ['organizar', 'taller'], '➰', 'Ganchos en S', 'Para la barra del armario, la cocina o el taller', 'funcional', '#1b1b1d',
    [n('n', 'Cuántos', 4, 1, 8, 1, ''), n('barra', 'Barra de arriba (diámetro)', 28, 10, 50), n('pequeno', 'Gancho de abajo (diámetro)', 18, 10, 40), n('tramo', 'Tramo recto', 16, 4, 80), n('ancho', 'Ancho', 9, 6, 20), n('grueso', 'Grueso', 5, 3.5, 9, 0.5)], ganchosS,
    () => 'Planos: se imprimen tumbados y las capas siguen la S, que es como aguantan. Las barras de armario miden 25–30 mm; las de cocina, 16. Puntas redondeadas para no enganchar la ropa.', { busca: 'gancho s armario cocina barra colgar' }),
  pinzaMantel: D('hogar', [], '🧷', 'Pinza para el mantel', 'Que el viento no se lleve el mantel de la terraza', 'flexible', '#e63946',
    [n('mesa', 'Grueso de la mesa', 25, 10, 50), n('largo', 'Largo', 45, 30, 80), n('ancho', 'Ancho', 22, 12, 40)], pinzaMantel,
    p => 'Una C que aprieta unos 4 mm más de lo que mide la mesa (' + n2(Math.max(10, p.mesa)) + ' mm): el brazo de abajo es el muelle. En PETG, que flexa; en PLA se acaba partiendo. Tumbada, sin soportes. Imprime 4.', { busca: 'mantel pinza terraza mesa viento' }),
  cepillosDientes: D('hogar', ['ninos'], '🪥', 'Vaso para cepillos de dientes', 'Cada cepillo en su ranura y la pasta en el centro', 'funcional', '#00a4e4',
    [n('n', 'Cepillos', 4, 2, 6, 1, ''), n('d', 'Ancho', 78, 60, 120), n('h', 'Alto', 105, 80, 150)], cepillosDientes,
    () => 'Vaso con 3 desagües abajo y una tapa con ranuras de 8,6 mm (el cuello del cepillo) abiertas hacia fuera y un agujero central para el tubo de pasta. La tapa se imprime al revés (el labio hacia arriba) y luego se le da la vuelta. En PETG.', { busca: 'cepillo dientes bano vaso' }),
  // ---------- 🖥️ OFICINA (7) ----------
  calendario: D('oficina', ['regalos', 'adultos'], '📅', 'Calendario perpetuo de cubos', 'Dos dados de números y tres barras con los meses: vale para siempre', 'deco', '#f4f4f0',
    [n('cubo', 'Lado de los dados', 30, 24, 45)], calendario,
    p => 'Seis piezas: la bandeja, dos dados (0-1-2-3-4-5 y 0-1-2-6-7-8; el 6 hace de 9) y tres barras con los 12 meses. Las barras van tumbadas en la bandeja, con el mes de hoy delante, y los dados encima. Todo va GRABADO 0,8 mm: píntalo o pon una pausa de color. Dados de ' + n2(Math.max(24, p.cubo)) + ' mm.', { busca: 'calendario perpetuo cubos dados escritorio regalo', sinSoportes: 'Lo único en el aire son las letras y los números grabados (0,8 mm de hondo): eso sale limpio sin soportes.' }),
  placaNombre: D('oficina', ['empresas', 'regalos'], '🪪', 'Placa de mesa con nombre', 'Prisma inclinado con el nombre en relieve (y el cargo, si quieres)', 'deco', '#1b1b1d',
    [tx('nombre', 'Nombre', 'Adriana', 'Lo que va en grande'), tx('cargo', 'Cargo (opcional)', 'Diseño 3D', 'Debajo, en pequeño'), n('letra', 'Alto de la letra', 14, 8, 24)], placaNombre,
    () => 'El largo se ajusta solo al nombre. La cara de delante está inclinada 65°: se lee sentado. Letras en relieve de 1,2 mm: con una pausa de color al final salen de otro color (el programa te dice la capa). Sin soportes.', { busca: 'placa nombre mesa despacho oficina cargo', sinSoportes: 'Lo único en el aire es el canto de abajo de las letras (sobresalen 1,2 mm): sale limpio sin soportes.' }),
  seisEnUno: D('oficina', ['organizar', 'empresas'], '🧰', 'Organizador de mesa 6 en 1', 'Lapicero, tarjetas, clips, notas adhesivas, móvil y pasacables en una pieza', 'funcional', '#1b1b1d', [], seisEnUno,
    () => '1 · lapicero hexagonal de 95 mm · 2 · tarjetero para tarjetas de 85 × 55 · 3 · bandeja de clips · 4 · hueco para notas adhesivas de 76 × 76 · 5 · surco de 13 mm con respaldo para el móvil · 6 · dos pasacables en el borde. Mide 176 × 150 mm: cabe en la A1 mini. Una pieza, sin soportes; unas 7 horas.', { busca: 'organizador escritorio 6 en 1 multifuncion lapicero movil' }),
  portaNotas: D('oficina', ['organizar'], '🗒️', 'Porta-notas adhesivas', 'El taco de notas y el boli siempre en su sitio', 'funcional', '#ffb703',
    [s('nota', 'Notas de', '76', [['76', '76 × 76 mm (las normales)'], ['51', '51 × 51 mm'], ['100', '100 × 100 mm']]), n('alto', 'Alto', 20, 12, 40)], portaNotas,
    () => 'Hueco con 2,6 mm de aire, muesca delante para sacar la nota con el dedo y un surco detrás para el boli. Sin soportes.', { busca: 'notas adhesivas post-it taco boli' }),
  cuelgaAuriculares: D('oficina', ['gaming', 'jovenes'], '🎧', 'Cuelga-auriculares para la mesa', 'Se pinza al tablero, sin tornillos', 'funcional', '#1b1b1d',
    [n('mesa', 'Grueso del tablero', 25, 12, 45, 0.5), n('cuelga', 'Lo que baja', 60, 30, 120), n('ancho', 'Ancho', 30, 20, 50)], cuelgaAuriculares,
    () => 'Pinza en C para el canto de la mesa y un gancho ancho debajo para la diadema. Se imprime TUMBADO (las capas a lo largo: no se parte). El brazo de abajo sube 1,5 mm para apretar. En PETG.', { busca: 'auriculares cascos colgador mesa gaming' }),
  sujetalibros: D('oficina', ['hogar', 'adultos'], '📚', 'Sujetalibros', 'En L, con calado de panal', 'funcional', '#1b1b1d',
    [n('ancho', 'Ancho', 110, 80, 160), n('alto', 'Alto', 150, 100, 220), n('base', 'Lo que entra bajo los libros', 110, 80, 160), c('panal', 'Con calado de panal', true)], sujetalibros,
    () => 'La base se mete debajo de los libros y su peso lo sujeta. Se imprime TUMBADO de lado (la L en la cama): sin soportes y fuerte. 4 mm de grueso con refuerzo en la esquina. Para libros gordos imprime dos.', { busca: 'sujetalibros libros estanteria' }),
  elevadorPortatil: D('oficina', ['gaming'], '💻', 'Elevador de portátil en X', 'Dos placas que se cruzan: se desmonta y cabe en la mochila', 'encaje', '#1b1b1d',
    [n('largo', 'Largo', 230, 140, 250), n('delante', 'Alto delante', 25, 15, 60), n('detras', 'Alto detrás', 85, 30, 140)], elevadorPortatil,
    p => 'Dos placas de 5 mm con una ranura a media altura cada una (0,3 de aire): se cruzan en X y el portátil apoya en los cuatro extremos, con uñas delante para que no resbale. Se imprimen planas. ' + (p.largo > 176 ? 'Con ' + n2(p.largo) + ' mm de largo solo cabe en la P1P. ' : '') + 'En PETG o PLA con 4 paredes.', { busca: 'portatil elevador soporte laptop' }),
  // ---------- 🌷 FLORES (5) ----------
  tulipan: D('flores', ['regalos', 'cuqui', 'adultos'], '🌷', 'Tulipán', 'La flor hueca con sus seis pétalos y su tallo con hoja', 'deco', '#e63946',
    [n('d', 'Ancho de la flor', 40, 24, 70), n('tallo', 'Largo del tallo (0 = sin tallo)', 160, 0, 240), n('hojas', 'Hojas', 1, 0, 2, 1, '')], p => conTallo(tulipan(p), p),
    () => 'La flor se imprime de pie (sube a 45°, sin soportes) y el tallo tumbado, con la hoja plana. El tallo entra 8 mm a presión en la flor (Ø6 en un agujero de 6,4: una gota de pegamento). Flores que no se marchitan: un ramo de 5 en un jarrón del catálogo se vende solo.', { busca: 'tulipan flor ramo eterno dia de la madre' }),
  margarita: D('flores', ['regalos', 'cuqui', 'ninos'], '🌼', 'Margarita', 'Plana, con su botón en el centro y su tallo', 'deco', '#f4f4f0',
    [n('d', 'Ancho', 70, 40, 140), n('petalos', 'Pétalos', 12, 6, 24, 1, ''), n('tallo', 'Largo del tallo (0 = sin tallo)', 160, 0, 240), n('hojas', 'Hojas', 2, 0, 2, 1, '')], p => conTallo(margarita(p), p),
    () => 'Pétalos de 2 mm y el botón en media esfera. Con una pausa de color al acabar los pétalos, el botón sale amarillo (el programa te dice la capa). El tallo entra por debajo. Sin tallo, sirve de imán, broche o aplique.', { busca: 'margarita flor ramo iman' }),
  girasol: D('flores', ['regalos', 'adultos', 'cuqui'], '🌻', 'Girasol', 'Dos filas de pétalos y el centro con sus pipas', 'deco', '#ffb703',
    [n('d', 'Ancho', 90, 52, 160), n('petalos', 'Pétalos por fila', 14, 8, 24, 1, ''), n('tallo', 'Largo del tallo (0 = sin tallo)', 160, 0, 240), n('hojas', 'Hojas', 2, 0, 2, 1, '')], p => conTallo(girasol(p), p),
    () => 'Dos filas de pétalos a distinta altura y un centro con textura de pipas. Pausa de color al empezar el centro y sale marrón. Sin soportes.', { busca: 'girasol flor ramo' }),
  rosa: D('flores', ['regalos', 'adultos'], '🌹', 'Rosa', 'Cuatro coronas de pétalos, cada una girada sobre la anterior', 'deco', '#c1121f',
    [n('d', 'Ancho', 52, 28, 90), n('tallo', 'Largo del tallo (0 = sin tallo)', 160, 0, 240), n('hojas', 'Hojas', 2, 0, 2, 1, '')], p => conTallo(rosa(p), p),
    () => 'Cuatro coronas de pared fina (1,7 mm), cada una más alta y girada 36°, con cinco pétalos marcados. De pie y sin soportes. En rojo seda es la que más se regala (San Valentín, Sant Jordi, aniversarios).', { acabado: 'seda', busca: 'rosa flor san valentin sant jordi regalo ramo eterno' }),
  florMaceta: D('flores', ['cuqui', 'regalos', 'ninos'], '🪴', 'Florecita en su maceta', 'De una pieza: maceta, tallo y flor. Para la mesa de la oficina', 'deco', '#ff8fb1',
    [n('d', 'Ancho de la maceta', 44, 36, 80), n('petalos', 'Pétalos', 5, 4, 8, 1, '')], florMaceta,
    () => 'Una sola pieza, de pie: la maceta, el tallo con dos hojas y una flor que mira al cielo y se abre a 45° (sin soportes). Con dos pausas de color sale la maceta de un color, el tallo verde y la flor de otro (el programa te dice las capas). Detalle de mesa, de maestra o de «gracias».', { busca: 'flor maceta detalle regalo profesora oficina' }),
  // ---------- 🐜 HORMIGAS (3) ----------
  hormigaForrajeo: D('mascotas', ['ciencia', 'ninos'], '🐜', 'Zona de forrajeo para tubo de ensayo', 'Para una colonia de hormigas que empieza: se enchufa el tubo y ya tienen dónde comer', 'funcional', '#f4f4f0',
    [s('tubo', 'Tubo de ensayo', '16', [['16', 'De 16 mm (lo normal)'], ['15', 'De 15 mm']]), n('x', 'Largo', 90, 60, 180), n('y', 'Ancho', 65, 50, 140), n('z', 'Alto', 34, 30, 70)], hormigaForrajeo,
    p => 'Caja con una boca de Ø' + n2((p.tubo === '15' ? 15 : 16) + 0.4) + ' para el tubo de ensayo (entra 12 mm; si baila, una vuelta de cinta), un reborde hacia dentro arriba que frena las fugas (úntalo de antifuga: aceite de parafina o PTFE) y una tapa con ventana de 30 mm para pegar por dentro una malla metálica FINA y un agujero de Ø10,3 para comida o para otro tubo. ⚠️ Yo no puedo comprobar que tu especie no quepa por una rendija: mira el tamaño de tus hormigas antes de fiarte.', { busca: 'colonia hormigas hormiguero forrajeo outworld tubo ensayo ant', sinSoportes: 'Lo único en el aire es lo alto de la boca redonda del tubo (16 mm): un agujero así sale bien sin soportes, y dentro serían imposibles de quitar.' }),
  hormigaNido: D('mascotas', ['ciencia'], '🐜', 'Nido de hormigas modular', 'Cámaras y túneles en serpentina, con cristal y un puerto de tubo en cada lado', 'funcional', '#c9a227',
    [n('x', 'Largo', 130, 80, 220), n('y', 'Ancho', 85, 60, 180), n('camara', 'Hondo de las cámaras', 8, 4, 10, 0.5), n('tunel', 'Ancho de los túneles', 5, 3, 8, 0.5)], hormigaNido,
    p => 'Un bloque de 18 mm con cámaras de ' + n2(Math.max(4, Math.min(10, p.camara))) + ' mm de hondo unidas por túneles de ' + n2(Math.max(3, Math.min(8, p.tunel))) + ' mm (para hormigas pequeñas, 4–5; para reinas grandes, 6–8). Arriba lleva un rebaje de 2,2 mm para un metacrilato de 2 mm (se corta a ' + n2(Math.max(80, p.x) - 8.4) + ' × ' + n2(Math.max(60, p.y) - 8.4) + ' y se pega con una gota de silicona de acuario). En cada lado corto, un puerto de Ø10,3 para tubo de 10: así se encadenan nidos o se conecta la zona de forrajeo. El plástico NO da humedad: pon un algodón mojado en una cámara o conecta un tubo de agua.', { busca: 'colonia hormigas hormiguero nido formicario ant', sinSoportes: 'Lo único en el aire es lo alto de los dos agujeros redondos de los tubos (10 mm): salen bien sin soportes, y dentro serían imposibles de quitar.' }),
  hormigaConectores: D('mascotas', ['ciencia', 'componentes'], '🔗', 'Conectores para hormigueros', 'Tapones, unión de tubos, paso de tubo de ensayo a tubo de 10 y comedero', 'encaje', '#b4b8bf',
    [s('tubo', 'Tubo de ensayo', '16', [['16', 'De 16 mm'], ['15', 'De 15 mm']]), n('tapones', 'Tapones', 2, 1, 6, 1, '')], hormigaConectores,
    () => 'El juego: tapones cónicos para los puertos de 10 mm, un manguito que une dos tubos de 10, un adaptador de tubo de ensayo a tubo de 10 (con el paso en cono, sin escalones donde se queden atrapadas) y un comedero de Ø24. Todo de pie y sin soportes. Si un tubo queda flojo, una vuelta de cinta de teflón.', { busca: 'hormigas conectores tubo tapon comedero' }),
  // ---------- 🖌️ PINCELES (2) ----------
  pincelLavador: D('hogar', ['oficina', 'ninos', 'organizar'], '🖌️', 'Limpia-pinceles con agua', 'Vaso para el agua con rejilla para frotar el pincel y muescas para apoyarlos', 'funcional', '#00a4e4',
    [n('d', 'Ancho', 100, 70, 150), n('h', 'Alto', 80, 50, 130), n('apoyos', 'Muescas en el borde', 6, 3, 10, 1, ''), n('posos', 'Alto de la rejilla sobre el fondo', 14, 8, 30)], pincelLavador,
    () => 'Dos piezas: el vaso y una rejilla de barras sobre tres patas. Frotas el pincel contra las barras y la pintura se va al fondo, debajo de la rejilla: el agua de arriba se queda más limpia. En el borde, muescas en V para dejar los pinceles apoyados sin que se doblen las cerdas. ⚠️ Para que no rezume: 4 paredes, 5 capas de fondo y PETG. Antes de fiarte, llénalo y déjalo una hora sobre un papel.', { busca: 'limpia pinceles brochas lavar agua pintura acuarela' }),
  pincelSoporte: D('hogar', ['oficina', 'organizar'], '🖌️', 'Soporte de pinceles', 'Delante se apoyan tumbados; detrás, de pie', 'funcional', '#c9a227',
    [n('n', 'Pinceles', 8, 4, 12, 1, '')], pincelSoporte,
    () => 'Delante, muescas en V para dejarlos tumbados mientras pintas (la punta al aire, sin manchar). Detrás, agujeros de 7, 9,5 y 12 mm para guardarlos de pie. Macizo y sin soportes.', { busca: 'pinceles brochas soporte descanso pintura' }),
  // ---------- 🗑️ PAPELERAS (2) ----------
  papeleraMesa: D('hogar', ['oficina', 'organizar'], '🗑️', 'Papelera de mesa con aro sujeta-bolsa', 'El aro pilla la bolsa y no se ve', 'funcional', '#1b1b1d',
    [n('d', 'Ancho', 150, 90, 240), n('h', 'Alto', 180, 100, 245), n('lados', 'Lados (13 = redonda)', 13, 4, 13, 1, ''), n('pared', 'Pared', 1.8, 1.6, 3, 0.2), c('aro', 'Con aro para la bolsa', true)], papeleraMesa,
    p => 'Algo más estrecha abajo. El aro sale impreso ALREDEDOR del pie de la papelera (suelto: así cabe todo en una placa); luego se apoya en el borde, entra 10 mm y pilla la bolsa. Con ' + n2(p.d) + ' × ' + n2(p.h) + ' mm es para la mesa o el baño (bolsas pequeñas de 5–10 litros). Sin soportes; unas 5–6 horas. ' + (p.d > 176 || p.h > 180 ? 'Con esa medida solo cabe en la P1P.' : 'Cabe en la A1 mini.'), { busca: 'papelera cubo basura mesa bano bolsa' }),
  papeleraColgar: D('hogar', ['organizar'], '🗑️', 'Cubo para colgar en la puerta del armario', 'Para la cocina: se cuelga de la puerta con dos ganchos y se quita para vaciarlo', 'funcional', '#f4f4f0',
    [n('x', 'Ancho', 150, 80, 240), n('y', 'Fondo', 90, 50, 160), n('z', 'Alto', 160, 80, 240), n('puerta', 'Grueso de la puerta', 18, 10, 45, 0.5)], papeleraColgar,
    () => 'El cubo y dos ganchos sueltos (se imprimen tumbados, que es como aguantan). Cada gancho pasa por encima de la puerta (las de cocina miden 16–19 mm) y su pie entra por un ojal de la pared de atrás del cubo: se mete girado y se endereza, y el cubo queda colgado y bien sujeto. Para pieles y restos mientras cocinas: se descuelga y se vacía. Lo único en el aire son los dos ojales (puentes de 2 cm): sin soportes. ⚠️ La puerta necesita unos 4 mm de hueco por arriba para el gancho: míralo antes.', { busca: 'cubo basura colgar cocina puerta armario', sinSoportes: 'Lo único en el aire son los dos ojales de los ganchos: puentes de 2 cm que salen bien sin soportes.' }),
  // ---------- 🎲 JUEGOS (6) ----------
  tresEnRaya: D('juegos', ['ninos', 'regalos'], '❌', 'Tres en raya de viaje', 'El tablero con sus huecos y las 5 X y los 5 O', 'deco', '#00a4e4',
    [n('casilla', 'Tamaño de la casilla', 24, 18, 40)], tresEnRaya,
    () => 'Once piezas en la misma placa: el tablero (las fichas se quedan en sus huecos y no se mueven en el coche) y 5 + 5 fichas. Imprime las X y los O de dos colores, o todo junto con una pausa. Sin soportes.', { busca: 'tres en raya juego mesa viaje ninos' }),
  molino: D('juegos', ['adultos', 'regalos'], '⬜', 'Juego del molino', 'El tablero grabado y las 18 fichas', 'deco', '#c9a227',
    [n('lado', 'Tamaño del tablero', 120, 90, 180)], molino,
    () => 'Tablero con las líneas grabadas y un hoyito en cada uno de los 24 puntos, 9 fichas redondas y 9 hexagonales (así se distinguen aunque las imprimas del mismo color). Un clásico que casi nadie vende.', { busca: 'molino nueve hombres morris juego mesa' }),
  solitario: D('juegos', ['adultos', 'regalos'], '🔘', 'Solitario de pivotes', 'Tablero redondo de 33 agujeros con canal para las fichas comidas', 'deco', '#1b1b1d',
    [n('paso', 'Separación entre agujeros', 16, 12, 24), c('pivotes', 'Con los 32 pivotes', true)], solitario,
    p => 'El solitario inglés de toda la vida: 33 agujeros en cruz y un canal alrededor para ir dejando los pivotes comidos. Los pivotes llevan cabeza de seta (se cogen bien). ' + (p.pivotes ? 'Con los 32 pivotes en la misma placa necesita la P1P; sin ellos el tablero cabe en la A1 mini (y sirven canicas pequeñas).' : 'Solo el tablero: usa canicas de 8–10 mm.'), { busca: 'solitario pivotes juego mesa clasico' }),
  mancala: D('juegos', ['adultos', 'ninos'], '🥣', 'Mancala', 'El tablero de 12 hoyos y dos almacenes', 'deco', '#c9a227',
    [n('hoyo', 'Ancho de cada hoyo', 24, 20, 27)], mancala,
    p => 'Dos filas de seis hoyos redondos (casquetes de esfera: las fichas se recogen con un dedo) y un almacén en cada punta. Mide ' + n2(8 * (Math.max(20, p.hoyo) + 4) + 10) + ' mm de largo: solo en la P1P. Se juega con 48 semillas, garbanzos, canicas pequeñas o cuentas. Sin soportes.', { busca: 'mancala awale juego mesa africano' }),
  tangram: D('juegos', ['ninos', 'ciencia', 'regalos'], '🔺', 'Tangram', 'Las 7 piezas y su caja-marco', 'deco', '#e63946',
    [n('lado', 'Lado del cuadrado', 100, 60, 160), n('grosor', 'Grosor', 5, 3, 10, 0.5), c('caja', 'Con su marco para guardarlo', true)], tangram,
    () => 'Las siete piezas del tangram, con 0,8 mm entre ellas: salen sueltas y ya colocadas en cuadrado. El marco las guarda. Con cada pieza de un color queda precioso (imprímelas de una en una o con «Dividir en objetos»). Juego de mesa y de cole.', { busca: 'tangram puzzle juego ninos colegio' }),
  portaCartas: D('juegos', ['ninos', 'adultos'], '🃏', 'Soporte de cartas', 'Para manos pequeñas (o mayores): las cartas se sostienen solas', 'funcional', '#00b4a6',
    [n('largo', 'Largo', 220, 120, 250)], portaCartas,
    p => 'Una barra en arco con dos ranuras curvas de 1,9 mm: caben unas 12–15 cartas en abanico y no se ven desde enfrente. ' + (p.largo > 176 ? 'Con ' + n2(p.largo) + ' mm solo cabe en la P1P; con 170 cabe en la A1 mini. ' : '') + 'Plana y sin soportes. Muy pedido para niños y para residencias de mayores.', { busca: 'cartas soporte naipes ninos mayores juego' }),
  // ---------- 💼 EMPRESAS (5) ----------
  tarjetero: D('empresas', ['oficina', 'regalos'], '💳', 'Tarjetero de mostrador', 'Para tarjetas de visita, con el nombre del negocio delante', 'funcional', '#1b1b1d',
    [s('tarjeta', 'Tarjetas', 'eu', [['eu', 'Europeas (85 × 55 mm)'], ['us', 'Americanas (89 × 51 mm)']]), n('capacidad', 'Fondo (1 mm ≈ 3 tarjetas)', 14, 6, 40), tx('texto', 'Texto delante', 'CelebriDiseños', 'El nombre del negocio, o vacío')], tarjetero,
    p => 'Las tarjetas descansan inclinadas 20° y asoman para cogerlas. Caben unas ' + Math.round(Math.max(6, p.capacidad) * 3) + '. El texto va en relieve en el labio de delante: con una pausa de color sale de otro color. Sin soportes. Es de lo que más piden las tiendas: véndelo con el nombre del cliente.', { busca: 'tarjetero tarjetas visita mostrador negocio empresa', sinSoportes: 'Lo único en el aire es el canto de abajo de las letras (sobresalen 0,9 mm): sale limpio sin soportes.' }),
  cenicero: D('empresas', ['hogar', 'adultos'], '🚬', 'Cenicero antiviento', 'Con tapa de embudo: la ceniza cae dentro y el aire no la saca', 'funcional', '#1b1b1d',
    [n('d', 'Ancho', 100, 80, 150), n('h', 'Alto', 55, 35, 100)], cenicero,
    () => 'Vaso y tapa en embudo con tres apoyos; la tapa se imprime con el embudo hacia arriba y luego se le da la vuelta. ⚠️ MUY IMPORTANTE: el plástico NO es ignífugo. Solo en PETG o ASA (nunca PLA), con dos dedos de ARENA o agua dentro, y para apagar y tirar la colilla, no para dejar el cigarro encendido apoyado. No está probado con fuego: pruébalo tú antes de venderlo y díselo al cliente.', { busca: 'cenicero terraza bar antiviento' }),
  posavasos: D('empresas', ['hogar', 'regalos'], '🥤', 'Posavasos con tu marca y su soporte', 'Con borde para que no gotee y el nombre en relieve', 'funcional', '#1b1b1d',
    [s('que', 'Qué veo', 'juego', [['juego', 'Un posavasos y el soporte'], ['uno', 'Solo el posavasos'], ['soporte', 'Solo el soporte']]), n('d', 'Diámetro', 95, 70, 120), n('n', 'Cuántos guarda el soporte', 6, 2, 8, 1, ''), tx('texto', 'Texto', 'CAFÉ', 'El nombre del bar, una inicial… o vacío')], posavasos,
    p => 'Posavasos de ' + n2(Math.max(70, p.d)) + ' mm (lo normal es 90–100) con borde de 3 mm y el texto en relieve a ras del borde: el vaso apoya plano. El soporte tiene tres postes de 8 mm y guarda ' + Math.round(p.n) + '. Imprime el posavasos las veces que haga falta. En PETG aguanta el calor de una taza; el PLA se marca.', { busca: 'posavasos bar cafeteria marca logo' }),
  portaCarta: D('empresas', ['oficina'], '🪧', 'Peana para carta, precio o QR', 'Una ranura inclinada para el cartel y el número de mesa delante', 'funcional', '#1b1b1d',
    [n('ancho', 'Ancho', 100, 60, 220), n('grosor', 'Grueso del cartel', 2, 1.5, 6, 0.1), tx('texto', 'Texto delante', 'MESA 1', 'El número de mesa, «RESERVADO»… o vacío')], portaCarta,
    p => 'Ranura de ' + n2(Math.max(1.5, p.grosor) + 0.5) + ' mm inclinada 10° para un metacrilato, una cartulina plastificada o el QR de la carta. El texto va en relieve en la cara de delante. Sin soportes. Los bares las piden por docenas: cambia el número y a imprimir.', { busca: 'carta menu qr mesa restaurante bar precio cartel reservado' }),
  botePropinas: D('empresas', ['hogar', 'ninos'], '🪙', 'Bote de propinas (o hucha)', 'Con tapa de ranura y tu texto delante', 'funcional', '#c9a227',
    [n('lado', 'Ancho', 90, 60, 140), n('h', 'Alto', 120, 70, 200), tx('texto', 'Texto', 'PROPINAS', '«GRACIAS», «VACACIONES», un nombre…')], botePropinas,
    () => 'Bote cuadrado de esquinas redondas con el texto en relieve en la cara de delante y una tapa a presión con ranura de 34 × 5 mm (pasa la moneda de 2 € y un billete doblado). Sin soportes. Con otro texto es una hucha: «VIAJE», «BODA», «COCHE NUEVO».', { busca: 'propinas bote hucha bar ahorro', sinSoportes: 'Lo único en el aire es el canto de abajo de las letras (sobresalen 1 mm): sale limpio sin soportes.' }),
};
