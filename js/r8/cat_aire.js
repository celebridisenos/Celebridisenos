// ================= 20-10-2026 (noche) · ✈️ AVIONETA RC ENTRENADORA (ala alta): FUSELAJE IMPRESO + alas y cola de CARTÓN PLUMA =================
// Ella (20-10, plan maestro, tarea 14): «más chasis rc completos premium funcional, listos para poner componentes; también barcos y AVIONETAS».
// Una avioneta impresa ENTERA pesa demasiado para volar con calma; las que vuelan de verdad (y perdonan los golpes) son de espuma. Así que:
//  · se IMPRIME lo que lleva la fuerza y la precisión: el FUSELAJE (una bañera abierta por arriba —se imprime sin un solo techo— con el
//    CORTAFUEGOS del motor sin escobillas 22xx, el sitio de la batería con las ranuras de su correa, el del variador, dos TRAVESAÑOS para los
//    dos servos, la SILLA del ala con sus dos pinchos para las gomas y el ENCASTRE del larguero), la TAPA de la batería, el LARGUERO de cola
//    (dos tramos y su unión), el SOPORTE DE LA COLA, las dos ESCUADRAS de la deriva, los CUERNOS de los timones y las GUÍAS de las varillas;
//  · se CORTAN de cartón pluma (una plancha de 50 × 70 cm, el programa dice cómo): las dos medias ALAS (con 6° de diedro: con dirección y
//    profundidad, sin alerones, gira sola y se endereza sola: la mejor para aprender), el ESTABILIZADOR y la DERIVA con sus timones;
//  · DÓNDE VA LA BATERÍA para que esté EQUILIBRADA lo calcula el programa (el peso de cada pieza impresa, del cartón y de cada componente →
//    el centro de gravedad al 27 % de la cuerda), y las ranuras de su correa se ponen ahí. La cola vertical y la horizontal se dimensionan con
//    los volúmenes de cola de los entrenadores (Vh ≥ 0,45 · Vv ≥ 0,04): no es «a ojo».
// Marco: x hacia el morro (x = 0, el borde de ataque del ala), y a la izquierda, z arriba (el fondo del fuselaje en z = 0).
// Holguras de sus Bambu (por lado): 0,05 a presión · 0,10 encaja · 0,2 gira.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';
import * as B from './cat_bici.js';
import { COMPONENTES as CRC } from './cat_rc.js';
import { COMP_AERO } from './cat_agua.js';
import { TOR } from './cat_camion.js';
import { colocaCamas } from './cat_camion3.js';

const { n, s, M, CS, circ, rr, poli, cil, caja, n2 } = A;
const { PRES, JUSTO } = B, U = B.UTIL;
const { R2, M4 } = U;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const enX = (cs, x0, x1) => N.transforma(cs.extrude(x1 - x0), M4([0, 1, 0], [0, 0, 1], [1, 0, 0], [x0, 0, 0])); // un perfil en (y, z), estirado de x0 a x1
const capaX = (cs, x) => enX(cs, x, x + 0.01);
const enY = (cs, y0, y1) => N.transforma(cs.extrude(y1 - y0), M4([1, 0, 0], [0, 0, 1], [0, 1, 0], [0, y0, 0])); // un perfil en (x, z), estirado de y0 a y1
const bloque = (x0, x1, y0, y1, z0, z1, r = 0) => caja(x1 - x0, y1 - y0, z1 - z0, r).translate([(x0 + x1) / 2, (y0 + y1) / 2, z0]);
const cilX = (d, x0, x1, y, z) => cil(d, x1 - x0).rotate([0, 90, 0]).translate([x0, y, z]);
const cilY = (d, y0, y1, x, z) => cil(d, y1 - y0).rotate([-90, 0, 0]).translate([x, y0, z]);
const cilZ = (d, z0, z1, x, y) => cil(d, z1 - z0, z0).translate([x, y, 0]);
const PETG = 1.27; // g/cm³

// ---------- los COMPONENTES (lo que se compra) ----------
export const COMP_AVION = {
  motor: { t: 'Motor sin escobillas 2204–2212 de 1400–2200 KV (cruz de 16 × 19 mm, tornillos M3; Ø28 × 25)', D: 28, L: 25, g: 30, cruz: COMP_AERO.sin.cruz },
  esc: { t: 'Variador (ESC) sin escobillas de 12–20 A con BEC de 5 V', L: 45, W: 22, H: 12, g: 15 },
  helice: { t: 'Hélice de avión de 2 palas (y su adaptador o «prop saver» con junta tórica: en un aterrizaje salta y no se rompe)', g: 6 },
  servo: { t: 'Dos micro servos SG90 o MG90S (9 g)', g: 9 }, bateria: { t: CRC.bateria.t, g: 62 }, receptor: { t: 'Receptor de 2,4 GHz de 3 canales o más (como mucho 40 × 22 × 13)', L: 40, W: 22, H: 13, g: 8 },
  espuma: { t: 'Cartón pluma (foam board) de 5 mm: una plancha de 50 × 70 cm (o Depron de 6 mm, que pesa menos)' },
  varilla: { t: 'Dos varillas de acero de 1 mm (cuerda de piano) de 50 cm, o dos radios de bicicleta rectos', gmm: 0.0062 },
  otros: { t: 'Gomas elásticas (6), dos pinchos de bambú de 3 mm (las gomas del ala), cinta de embalar (las bisagras de los timones) y cola caliente o UHU Por' }
};

// ---------- las MEDIDAS (todo sale de la envergadura y la cuerda) ----------
export function medidasAvion(p, escDelante = false, fLt = 2.2) {
  const b = clamp(Math.round(+p.envergadura || 900), 800, 1000), c = clamp(Math.round(+p.cuerda || 180), 150, 185), // (límites medidos: así se equilibra SIN plomo —con más cuerda o más ala, la cola pesa demasiado—)
    e = clamp(+p.espuma || 5, 3, 6), gPlancha = clamp(+p.plancha || 100, 40, 300);
  const pulg = [5, 6].includes(+p.helice) ? +p.helice : 6, diedro = 6;
  // el FUSELAJE: bañera de W × H; de xLleno a xR se estrecha hasta el encastre del larguero; el cortafuegos de xF − eF a xF
  const H = 50, W = 52, pared = 1.2, suelo = 1.6, xF = 119, eF = 3, xR = -118, xLleno = -88, zM = 26; // zM: el eje del motor (20-10 noche: todo 12 mm más adelante que en el primer dibujo: con el morro corto salía de COLA)
  const zB = 12, LB = 14, eB = 0.85, prof = 30, LBh = LB + 2 * JUSTO, Ls = LBh + 3.2; // el LARGUERO (cuadrado de 14, pared de 0,85: dos líneas de la boquilla) y su encastre (30 de hondo; manguito de pared 1,6)
  const yI = W / 2 - pared, riel = 4.2, zRiel = H - 4; // la cara de dentro de los costados · los RIELES: la silla del ala y de la tapa (de zRiel a H, con chaflán a 45° por debajo)
  const xGd = 14, xGt = -80, zG = H - 4.5; // los dos pinchos de las gomas (el de delante también sujeta la tapa)
  const xTapa0 = 2, xTapa1 = xF - eF - 1; // la TAPA de la batería (delante del ala)
  // dentro: los dos servos de pie, uno al lado del otro (sus orejas en dos travesaños); el variador delante de ellos; la batería, delante
  const Sv = CRC.servo, xS = -63, yS = 8, zS0 = suelo + 1, zOr = zS0 + Sv.zOreja, xEje = xS - (Sv.L / 2 - Sv.ejeX), zBrazo = zS0 + Sv.H + Sv.altoEje + 0.8, rBrazo = 10;
  // (dos maneras, las elige el EQUILIBRIO: el variador detrás de la batería —ella, lo más adelante— o delante, contra el cortafuegos —ella, más atrás—)
  const bat = CRC.bateria, xEd = xF - eF - 1 - COMP_AVION.esc.L, xE0 = escDelante ? xEd : xS + 16.4 + 3, xE1 = xE0 + COMP_AVION.esc.L;
  const xBmin = escDelante ? xS + 16.4 + 2 + bat.L / 2 : xE1 + 2 + bat.L / 2, xBmax = escDelante ? xEd - 2 - bat.L / 2 : xF - eF - 1 - bat.L / 2;
  // la COLA horizontal: brazo de 2,2 cuerdas (del 1/4 del ala al 1/4 del estabilizador), cuerda 0,6 c, envergadura 0,4 b, timón 35 %
  const lt = Math.round(fLt * c), cs = Math.round(0.6 * c), bh = Math.round(0.4 * b / 10) * 10, ce = Math.round(0.35 * cs);
  const xsLE = Math.round(-c / 4 - lt + cs / 4), xsTE = xsLE - cs, xBis = xsTE + ce; // estabilizador: borde de ataque, de salida y la bisagra del timón de profundidad
  const xc0 = xsLE + 15, xc1 = xBis + 3, zDeck = zB + Ls / 2, eDeck = 1.2, zs0 = zDeck + eDeck, profC = 20; // el SOPORTE DE LA COLA: de su boca a 3 mm de la bisagra; su plataforma; el estabilizador encima
  const xBo0 = xLleno, xBo1 = xc0 - profC, LBo = xBo0 - xBo1, LA = Math.ceil(LBo / 2); // el LARGUERO: de su punta de delante (al fondo del encastre) a la de detrás · el tramo de delante
  // la DERIVA (encima del estabilizador): su base solo en la parte FIJA del estabilizador; el timón de dirección, recortado abajo para que no toque el de profundidad
  const zf0 = zs0 + e, rc = Math.round(0.3 * cs), corte = 18, cv1 = Math.round(0.55 * cs);
  const xCG = -0.28 * c; // el centro de gravedad que se busca (ala plana: 25–30 % de la cuerda)
  const S = b * c / 1e4, Sh = bh * cs / 1e4; // dm²
  let hv = 0, Sv2 = 0, Vv = 0;
  for (let h = Math.round(0.5 * c / 5) * 5; h <= 1.3 * c; h += 5) { const P = derivaPol({ xsLE, xsTE, xBis, zf0: 0, corte, cv1 }, h), a = Math.abs(area(P)) / 1e4, xc = centroX(P), v = a * (xCG - xc) / 100 / (S * b / 100); hv = h; Sv2 = a; Vv = v; if (v >= 0.04) break; }
  const Vh = Sh * (xCG - (xsLE - cs / 4)) / 100 / (S * c / 100);
  return { fLt, b, c, e, gPlancha, pulg, diedro, H, W, pared, suelo, xF, eF, xR, xLleno, zM, zB, LB, eB, prof, LBh, Ls, yI, riel, zRiel, xGd, xGt, zG, xTapa0, xTapa1, Sv, xS, yS, zS0, zOr, xEje, zBrazo, rBrazo,
    escDelante, xE0, xE1, bat, xBmin, xBmax, lt, cs, bh, ce, xsLE, xsTE, xBis, xc0, xc1, zDeck, eDeck, zs0, profC, xBo0, xBo1, LBo, LA, zf0, rc, corte, cv1, hv, xCG, S, Sh, Sver: Sv2, Vh, Vv }; }
function area(P) { let a = 0; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; a += x1 * y2 - x2 * y1; } return a / 2; }
function centroX(P) { let a = 0, cx = 0; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length], k = x1 * y2 - x2 * y1; a += k; cx += (x1 + x2) * k; } return cx / (3 * a); }
// la DERIVA en (x, z): base en la parte fija del estabilizador; por encima del recorte, hasta el borde de salida; arriba, cuerda cv1; borde de ataque en flecha
function derivaPol(Q, hv) { const { xsLE, xsTE, xBis, zf0, corte, cv1 } = Q; return [[xsLE, zf0], [xsTE + cv1, zf0 + hv], [xsTE, zf0 + hv], [xsTE, zf0 + corte], [xBis, zf0 + corte], [xBis, zf0]]; }

// ---------- 1) el FUSELAJE ----------
// (21-10, 9d1c9ad6: las esquinas de ABAJO, en CHAFLÁN a 45° y no redondeadas: el redondeo junto a la cama dejaba ~1.600 mm² al aire en las primeras capas)
const chaflanAbajo = (w, h, c) => poli([[-w / 2 + c, 0], [w / 2 - c, 0], [w / 2, c], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, c]]);
const S0 = Q => rr(Q.W, Q.H, 8).translate([0, Q.H / 2]).add(chaflanAbajo(Q.W, Q.H, 4)), S2 = Q => { const h = Q.zB + (Q.Ls + 2) / 2; return rr(Q.Ls + 2, h, 3).translate([0, h / 2]).add(chaflanAbajo(Q.Ls + 2, h, 1.5)); }; // el cuerpo · el final de atrás (alrededor del encastre; el fondo, plano en la cama)
// el hueco del larguero: cuadrado, con un techo a dos aguas encima (se imprime sin puente; el larguero apoya en lo cuadrado)
const huecoLarguero = Q => rr(Q.LBh, Q.LBh, 0.6).add(poli([[-Q.LBh / 2, Q.LBh / 2 - 0.01], [Q.LBh / 2, Q.LBh / 2 - 0.01], [0, Q.LBh / 2 + Q.LBh / 2 * 0.8]])).translate([0, Q.zB]);
const porDentro = (Q, cs, suelo) => cs.offset(-Q.pared, 'Round').intersect(rr(400, 400).translate([0, suelo + 200]));
const haciaArriba = cs => CS().hull([cs, cs.translate([0, 60])]); // abierto por arriba
function rielPerfil(Q, sg) { const { yI, riel, zRiel, H } = Q, P = [[yI + 0.01, zRiel - riel * 1.3], [yI + 0.01, H], [yI - riel, H], [yI - riel, zRiel]]; return poli(sg > 0 ? P : P.map(([y, z]) => [-y, z]).reverse()); } // (el chaflán de debajo, a 52°: sin soportes)
export function fuselaje(Q, xBat = null) { const { H, W, xF, eF, xR, xLleno, zB, LBh, Ls, prof, suelo, yI, riel, zRiel, zM, xS, yS, zOr, xE0 } = Q;
  let m = enX(S0(Q), xLleno, xF).add(M().hull([capaX(S2(Q), xR), capaX(S0(Q), xLleno)])); // por fuera
  // por dentro, abierto por arriba: el cuerpo hasta el cortafuegos; detrás, el embudo hasta el encastre (también abierto: lo tapa el ala)
  m = m.subtract(enX(haciaArriba(porDentro(Q, S0(Q), suelo)), xLleno - 0.01, xF - eF)).subtract(M().hull([capaX(haciaArriba(porDentro(Q, S0(Q), suelo)), xLleno), capaX(haciaArriba(porDentro(Q, S2(Q), 3)), xR + 2)]));
  // el ENCASTRE del larguero: un manguito de 20 × 20 con su hueco cuadrado de 30 de hondo y el tornillo que lo cruza (M3 × 40 con autoblocante por fuera)
  // (21-10, 9d1c9ad6: el manguito, MACIZO hasta el suelo: flotaba a 0,3 mm del suelo del embudo y su fondo quedaba al aire)
  m = m.add(enX(rr(Ls, Ls, 2).translate([0, zB]), xR, xLleno + 2)).add(bloque(xR, xLleno + 2, -Ls / 2, Ls / 2, 1.5, zB)).subtract(enX(huecoLarguero(Q), xR - 1, xR + prof)).subtract(cilY(TOR.m3.paso, -40, 40, xR + 10, zB));
  // los RIELES (la silla del ala y de la tapa), con su chaflán a 45° por debajo (se imprimen sin soportes)
  [1, -1].forEach(sg => { m = m.add(enX(rielPerfil(Q, sg), xLleno, xF - eF + 0.01)); });
  // los dos pinchos de las gomas (de bambú, de 3 mm; o tornillos M3): atraviesan los costados y los rieles
  [Q.xGd, Q.xGt].forEach(x => { m = m.subtract(cilY(TOR.m3.paso, -W, W, x, Q.zG)); });
  // los dos TRAVESAÑOS de los servos (sus orejas apoyan encima; los agujeros de sus tornillos de 2 mm)
  [1, -1].forEach(sx => { const x = xS + sx * 13.9; m = m.add(bloque(x - 2.5, x + 2.5, -yI - 0.01, yI + 0.01, suelo - 0.01, zOr)); [1, -1].forEach(sy => { m = m.subtract(cilZ(1.6, zOr - 9, zOr + 1, x, sy * yS)); }); });
  // el CORTAFUEGOS: el motor sin escobillas con su cruz de 16 × 19 (tornillos M3 por dentro), su agujero del centro y el paso de sus 3 cables
  const [a16, b19] = Q.motorCruz || COMP_AVION.motor.cruz; m = m.subtract(cilX(10, xF - eF - 1, xF + 1, 0, zM)).subtract(bloque(xF - eF - 1, xF + 1, -6, 6, zM - 19, zM - 13, 1.5));
  [[a16 / 2, 45], [b19 / 2, 135], [a16 / 2, 225], [b19 / 2, 315]].forEach(([r, g]) => { m = m.subtract(cilX(TOR.m3.paso, xF - eF - 1, xF + 1, r * Math.cos(g * R2), zM + r * Math.sin(g * R2))); });
  // las RANURAS de la correa de la batería (velcro de 20 mm), donde la pone el cálculo del equilibrio
  if (xBat != null) [-1, 1].forEach(sx => { m = m.subtract(bloque(xBat + sx * 24 - 1.6, xBat + sx * 24 + 1.6, -12, 12, -1, suelo + 1)); });
  // las MARCAS del centro de gravedad: un botón a cada lado (ahí se sujeta con dos dedos para comprobar el equilibrio)
  [1, -1].forEach(sg => { m = m.add(M().sphere(2.6, 24).scale([1, 0.55, 1]).translate([Q.xCG, sg * (W / 2 - 0.3), 36])); });
  return m; }
// la TAPA de la batería: una placa sobre los rieles, con dos orejas por dentro que atraviesa el pincho de delante (se imprime boca abajo)
export function tapa(Q) { const { W, H, xTapa0, xTapa1, yI, riel, xGd, zG } = Q, yo = yI - riel - 0.2;
  let m = bloque(xTapa0, xTapa1, -W / 2, W / 2, H, H + 1.6, 6);
  [1, -1].forEach(sg => { m = m.add(bloque(xGd - 7, xGd + 7, sg > 0 ? yo - 1.8 : -yo, sg > 0 ? yo : -yo + 1.8, H - 8.5, H + 0.01, 0.5)); });
  m = m.subtract(cilY(TOR.m3.paso, -W, W, xGd, zG)).subtract(cilZ(16, H - 1, H + 3, xTapa0 - 2, 0)); // el pincho · la muesca del borde para levantarla con el dedo
  return m; }

// ---------- 2) el LARGUERO de cola (dos tramos y su unión) y el SOPORTE DE LA COLA ----------
// cada tramo, a lo largo de x desde su punta de delante (x = 0) hacia atrás; agujero del tornillo a 20 (delante) o a 10 (detrás) de su punta
export function tramoLarguero(Q, cual) { const { LB, eB, LA, LBo } = Q, L = cual === 'A' ? LA : LBo - LA;
  let m = enX(rr(LB, LB, 1), -L, 0).subtract(enX(rr(LB - 2 * eB, LB - 2 * eB, 0.3), -L - 1, 1));
  if (cual === 'A') m = m.subtract(cilY(TOR.m3.paso, -LB, LB, -20, 0)); else m = m.subtract(cilY(TOR.m3.paso, -LB, LB, -L + Q.profC / 2, 0));
  return m; } // (marco: el eje del larguero en y = 0, z = 0)
export const union = Q => { const a = Q.LB - 2 * Q.eB - 2 * JUSTO; return enX(rr(a, a, 0.4).subtract(rr(a - 2.4, a - 2.4, 0.3)), -15, 15); }; // la UNIÓN: un tubo que entra 15 en cada tramo (pegado; hueco: en la cola, cada gramo cuenta)
// (20-10 noche: el primero pesaba 19 g —en la cola, donde más estorba—; este, unos 6: manguito de pared 1,6 y plataforma de 24 con su nervio)
export function soporteCola(Q) { const { xc0, xc1, zB, Ls, LBh, profC, zDeck, eDeck } = Q;
  let m = enX(rr(Ls, Ls, 1.5).translate([0, zB]), xc0 - profC - 2, xc0).add(bloque(xc1, xc0, -12, 12, zDeck - 0.01, zDeck + eDeck, 3)).add(bloque(xc1, xc0 - profC - 1, -0.8, 0.8, zDeck - 4, zDeck + 0.01));
  return m.subtract(enX(rr(LBh, LBh, 0.6).add(poli([[-LBh / 2, -LBh / 2 + 0.01], [LBh / 2, -LBh / 2 + 0.01], [0, -LBh / 2 - LBh / 2 * 0.8]])).translate([0, zB]), xc0 - profC - 3, xc0 + 1)).subtract(cilY(TOR.m3.paso, -20, 20, xc0 - profC / 2, zB)); } // (se imprime boca abajo: el «techo» a dos aguas va por debajo)
// las ESCUADRAS de la deriva (2: una a cada lado; se pegan al estabilizador y a la deriva)
export const escuadra = Q => bloque(0, 30, 0, 7, 0, 1.2).add(bloque(0, 30, 0, 1.2, 0, 12)); // (marco: la cara que toca la deriva en y = 0)
// el CUERNO de un timón: su base se pega en el timón; los 3 agujeros de la varilla (Z en la punta)
export const cuerno = () => bloque(-7, 7, -4.5, 4.5, 0, 1.2).add(bloque(-7, 7, -0.8, 0.8, 0, 14, 0)).subtract(N.union([6, 9, 12].map(z => cilY(1.3, -2, 2, 2, z))));
// la GUÍA de las varillas: abraza el larguero (abierta por abajo: entra a presión) con dos ojales encima
export function guiaCS(Q) { const { LB } = Q, i = LB + 0.3, o = i + 2.4; // (en (y, z): el larguero en el centro; abierta por abajo)
  let cs = rr(o, o, 1.5).subtract(rr(i, i, 0.3)).subtract(rr(LB - 4, 4, 0).translate([0, -o / 2 + 1]));
  [1, -1].forEach(sg => { cs = cs.add(circ(4).translate([sg * 4.5, o / 2 + 1.6])).add(rr(3, 2.2).translate([sg * 4.5, o / 2 + 0.3])); });
  [1, -1].forEach(sg => { cs = cs.subtract(circ(1.8).translate([sg * 4.5, o / 2 + 1.6])); });
  return cs; }
export const guia = Q => guiaCS(Q).extrude(6); // (para imprimir: de canto, el perfil en la cama)
export const zOjal = Q => Q.zB + (Q.LB + 0.3 + 2.4) / 2 + 1.6; // la altura de los ojales

// ---------- 3) el CARTÓN PLUMA: las alas, el estabilizador y la deriva (y cómo se cortan de la plancha) ----------
export const ranura = (e, ang) => Math.round((e / 2 * Math.tan(ang * R2) + 0.2) * 10) / 10;
export function espumas(Q) { const { b, c, e, bh, xsLE, xsTE, xBis, zs0, zf0, rc, corte, hv, H, diedro } = Q, L = [];
  const media = bloque(-c, 0, 0, b / 2, 0, e);
  [1, -1].forEach(sg => { const m = (sg > 0 ? media : media.mirror([0, 1, 0])).rotate([sg * diedro, 0, 0]).translate([0, 0, H]).intersect(bloque(-c - 10, 10, sg > 0 ? 0 : -b, sg > 0 ? b : 0, H - 20, H + 200)); L.push({ k: sg > 0 ? 'alaI' : 'alaD', m, area: b / 2 * c }); }); // (la raíz, en bisel: las dos mitades se juntan sin pisarse)
  const gP = ranura(e, 20), gD = ranura(e, 25); // (las ranuras de las bisagras)
  L.push({ k: 'estab', m: bloque(xBis, xsLE, -bh / 2, bh / 2, zs0, zs0 + e), area: bh * (xsLE - xBis) }); L.push({ k: 'profundidad', m: bloque(xsTE, xBis - gP, -bh / 2, bh / 2, zs0, zs0 + e), area: bh * (xBis - gP - xsTE) });
  const P = derivaPol(Q, hv), fija = poli(P).subtract(rr(rc + gD, hv - corte + 2).translate([xsTE + (rc + gD) / 2, zf0 + corte + (hv - corte) / 2 + 1]));
  L.push({ k: 'deriva', m: enY(fija, -e / 2, e / 2), area: fija.area() }); L.push({ k: 'direccion', m: bloque(xsTE, xsTE + rc, -e / 2, e / 2, zf0 + corte, zf0 + hv), area: rc * (hv - corte) });
  return L; }
// el plano de CORTE: cada pieza tumbada en planchas de 700 × 500 (filas), con 5 mm entre piezas
export function planoCorte(Q) { const { b, c, bh, cs, e } = Q, P = derivaPol(Q, Q.hv), bp = P.reduce((a, [x, z]) => ({ x0: Math.min(a.x0, x), x1: Math.max(a.x1, x), z0: Math.min(a.z0, z), z1: Math.max(a.z1, z) }), { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
  const piezas = [['Ala izquierda', b / 2, c, null], ['Ala derecha', b / 2, c, null], ['Estabilizador y su timón', bh, cs, null], ['Deriva y su timón', bp.x1 - bp.x0, bp.z1 - bp.z0, P.map(([x, z]) => [x - bp.x0, z - bp.z0])]];
  const Wp = 700, Hp = 500, sep = 5, hojas = []; let hoja = null;
  for (const [t, w, h, pol] of piezas.sort((a, b2) => b2[2] - a[2])) { const [ww, hh] = w <= Wp - 2 * sep ? [w, h] : [h, w];
    let puesto = false; for (const H2 of hojas) for (const F of H2.filas) if (hh <= F.h + 1e-6 && F.x + ww <= Wp - sep) { H2.p.push({ t, x: F.x, y: F.y, w: ww, h: hh, pol }); F.x += ww + sep; puesto = true; break; }
    if (puesto) continue; hoja = hojas.find(H2 => H2.y + hh <= Hp - sep); if (!hoja) { hoja = { filas: [], y: sep, p: [] }; hojas.push(hoja); }
    hoja.filas.push({ y: hoja.y, h: hh, x: sep + ww + sep }); hoja.p.push({ t, x: sep, y: hoja.y, w: ww, h: hh, pol }); hoja.y += hh + sep; }
  return { hojas: hojas.map(H2 => H2.p), Wp, Hp, e }; }
export function vistaCorte(Q) { const C = planoCorte(Q), L = [];
  C.hojas.forEach((p, i) => { const ox = i * (C.Wp + 40); L.push(bloque(ox, ox + C.Wp, 0, C.Hp, 0, 0.6).subtract(bloque(ox + 2, ox + C.Wp - 2, 2, C.Hp - 2, -1, 2)));
    p.forEach(q => { const cs = q.pol ? poli(q.pol) : rr(q.w, q.h).translate([q.w / 2, q.h / 2]); L.push(cs.extrude(C.e).translate([ox + q.x, q.y, 0.6])); }); });
  return N.union(L); }

// ---------- 4) los COMPONENTES de mentira (para verlo montado y para el peso) ----------
function servoFalso(Q, sy) { const S2v = Q.Sv; return caja(S2v.L, S2v.A, S2v.H).add(caja(S2v.orejas, S2v.A, S2v.eOreja).translate([0, 0, S2v.zOreja])).add(cil(S2v.estria, S2v.altoEje, S2v.H).translate([-(S2v.L / 2 - S2v.ejeX), 0, 0])).translate([Q.xS, sy * Q.yS, Q.zS0]); }
const brazoServo = (Q, sy) => U.capsula([0, 0], [0, sy * Q.rBrazo], 7, 4.5).extrude(1.5).subtract(cil(1.3, 4, -1).translate([0, sy * Q.rBrazo, 0])).translate([Q.xEje, sy * Q.yS, Q.zBrazo - 0.75]);
const motorFalso = Q => cilX(COMP_AVION.motor.D, Q.xF + 0.05, Q.xF + COMP_AVION.motor.L, 0, Q.zM).add(cilX(5, Q.xF + COMP_AVION.motor.L - 0.01, Q.xF + COMP_AVION.motor.L + 16, 0, Q.zM));
const xHel = Q => Q.xF + COMP_AVION.motor.L + 8;
const heliceFalsa = Q => { const R = Q.pulg * 25.4 / 2; return bloque(-3, 3, -R, R, -6, 6, 2.5).rotate([20, 0, 0]).add(cilX(14, -4, 4, 0, 0)).subtract(cilX(5.2, -6, 6, 0, 0)).translate([xHel(Q), 0, Q.zM]); };
// las VARILLAS: del brazo de cada servo, por las guías del larguero, al cuerno de su timón (tramos rectos de Ø1)
const tramo = (P0, P1, d = 1) => { const v = [P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]], L = Math.hypot(...v), u = v.map(x => x / L), ay = Math.atan2(-u[2], Math.hypot(u[0], u[1])) / R2, az = Math.atan2(u[1], u[0]) / R2;
  return cil(d, L).rotate([0, 90, 0]).rotate([0, ay, az]).translate(P0); };
// las 3 GUÍAS: la primera nada más salir del fuselaje (las varillas no tocan su embudo), la última 50 mm por delante del estabilizador (desde ahí la
// varilla sube y pasa por ENCIMA de él) y otra en medio
export const xGuias = Q => { const a = Q.xR - 12, b2 = Q.xsLE + 50; return [a, Math.round((a + b2) / 2), b2]; };
export function puntosVarilla(Q, cual) { const sy = cual === 'direccion' ? 1 : -1; // del brazo del servo, por el ojal de cada guía, al agujero de arriba de su cuerno
  const P = [[Q.xEje, sy * (Q.yS + Q.rBrazo), Q.zBrazo + 1.5]].concat(xGuias(Q).map(x => [x, sy * 4.5, zOjal(Q)]));
  // (se dibuja hasta el canto del cuerno, a la altura de su agujero de fuera: la Z que lo atraviesa no se dibuja)
  if (cual === 'direccion') P.push([Q.xsTE + Q.rc - 1.4, Q.e / 2 + 12, Q.zf0 + Q.corte + 9]); else P.push([Q.xBis - 1.4, -14, Q.zs0 + Q.e + 12]);
  return P; }
const varilla = (Q, cual) => { const P = puntosVarilla(Q, cual); return N.union(P.slice(1).map((q, i) => tramo(P[i], q))); };
const largoVarilla = (Q, cual) => { const P = puntosVarilla(Q, cual); let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]); return L + 30; }; // (+ las dos Z)

// ---------- 5) TODO EN SU SITIO: el avión montado ----------
// grupos: 'fijo' · 'prof' (gira con el timón de profundidad) · 'dir' (con el de dirección) · 'svI'/'svD' (el brazo de cada servo) · 'vI'/'vD' (las varillas) · 'hel' · 'comp' (no se imprime) · 'espuma'
export function enSitio(Q, giro = {}) { const L = [], pon = (k, m, g = 'fijo', o = {}) => L.push(Object.assign({ k, m, g }, o)), C = COMP_AVION;
  pon('fuselaje', fuselaje(Q, Q.xBat)); pon('tapa', tapa(Q));
  pon('largueroA', tramoLarguero(Q, 'A').translate([Q.xBo0, 0, Q.zB])); pon('largueroB', tramoLarguero(Q, 'B').translate([Q.xBo0 - Q.LA, 0, Q.zB])); pon('union', union(Q).translate([Q.xBo0 - Q.LA, 0, Q.zB]));
  pon('soporteCola', soporteCola(Q)); xGuias(Q).forEach((x, i) => pon('guia' + i, enX(guiaCS(Q).translate([0, Q.zB]), x - 3, x + 3)));
  espumas(Q).forEach(x => pon(x.k, x.m, x.k === 'profundidad' ? 'prof' : x.k === 'direccion' ? 'dir' : 'espuma', { area: x.area }));
  const xe = (Q.xsLE + Q.xBis) / 2; [1, -1].forEach(sg => pon('escuadra' + (sg > 0 ? 'I' : 'D'), (sg > 0 ? escuadra(Q) : escuadra(Q).mirror([0, 1, 0])).translate([xe - 15, sg * Q.e / 2, Q.zf0])));
  pon('cuernoP', cuerno().translate([Q.xBis - 9, -14, Q.zs0 + Q.e]), 'prof'); pon('cuernoD', cuerno().rotate([-90, 0, 0]).translate([Q.xsTE + Q.rc - 9, Q.e / 2, Q.zf0 + Q.corte + 9]), 'dir'); // (los dos, enteros en su timón: sus agujeros a 7 de la bisagra)
  // los componentes
  [1, -1].forEach(sy => { pon(sy > 0 ? 'servoI' : 'servoD', servoFalso(Q, sy), 'comp', { peso: C.servo.g }); pon(sy > 0 ? 'brazoI' : 'brazoD', brazoServo(Q, sy), sy > 0 ? 'svI' : 'svD', { peso: 0.5 }); });
  pon('varillaD', varilla(Q, 'direccion'), 'vI', { peso: largoVarilla(Q, 'direccion') * C.varilla.gmm }); pon('varillaP', varilla(Q, 'profundidad'), 'vD', { peso: largoVarilla(Q, 'profundidad') * C.varilla.gmm });
  pon('motor', motorFalso(Q), 'comp', { peso: C.motor.g }); pon('helice', heliceFalsa(Q), 'hel', { peso: C.helice.g });
  pon('esc', bloque(Q.xE0, Q.xE1, -11, 11, Q.suelo + 0.05, Q.suelo + C.esc.H, 2), 'comp', { peso: C.esc.g });
  pon('receptor', bloque(Q.xE0 + 2, Q.xE0 + 2 + C.receptor.L, -C.receptor.W / 2, C.receptor.W / 2, Q.suelo + C.esc.H + 0.1, Q.suelo + C.esc.H + 0.1 + C.receptor.H, 2), 'comp', { peso: C.receptor.g }); // (tumbado encima del variador, con cinta de doble cara)
  if (Q.xBat != null) pon('bateria', bloque(Q.xBat - Q.bat.L / 2, Q.xBat + Q.bat.L / 2, -Q.bat.W / 2, Q.bat.W / 2, Q.suelo + 0.05, Q.suelo + 0.05 + Q.bat.H, 3), 'comp', { peso: C.bateria.g });
  // lo pequeño que también pesa: gomas, pinchos, cinta y cola (repartidos donde van)
  pon('gomas', bloque(-Q.c / 2 - 1, -Q.c / 2 + 1, -1, 1, Q.H + 6, Q.H + 7), 'nada', { peso: 4 }); pon('colaAla', bloque(-Q.c / 2 - 1, -Q.c / 2 + 1, -1, 1, Q.H + 8, Q.H + 9), 'nada', { peso: 5 }); pon('colaCola', bloque(Q.xsLE - 21, Q.xsLE - 19, -1, 1, Q.zs0 + 20, Q.zs0 + 21), 'nada', { peso: 3 });
  // las deflexiones (para «girado» y para comprobar que nada se toca)
  if (giro.prof || giro.dir) return L.map(x => { const o = Object.assign({}, x);
    if (x.g === 'prof' && giro.prof) o.m = x.m.translate([-Q.xBis, 0, -(Q.zs0 + Q.e / 2)]).rotate([0, -giro.prof, 0]).translate([Q.xBis, 0, Q.zs0 + Q.e / 2]);
    if (x.g === 'dir' && giro.dir) o.m = x.m.translate([-ejeDir(Q), 0, 0]).rotate([0, 0, giro.dir]).translate([ejeDir(Q), 0, 0]);
    return o; }).filter(x => x.g !== 'vI' && x.g !== 'vD'); // (las varillas, giradas, se dibujan en la animación)
  return L; }

export const ejeDir = Q => Q.xsTE + Q.rc + ranura(Q.e, 25); // la bisagra del timón de dirección (la cara de atrás de la deriva fija)
// ---------- 6) los PESOS y el EQUILIBRIO: dónde va la batería; y los números del vuelo ----------
export function pesoDe(Q, x) { if (x.peso != null) return x.peso; if (x.area != null) return x.area / 100 * Q.gPlancha / 3500; return x.m.volume() / 1000 * PETG; } // (cartón: área en cm² × gramos de la plancha / 3500 cm²)
export function equilibrio(Q) { const L = enSitio(Object.assign({}, Q, { xBat: null })), gB = COMP_AVION.bateria.g; let mt = 0, mx = 0;
  for (const x of L) { const g = pesoDe(Q, x), bx = N.caja(x.m); mt += g; mx += g * (bx.min[0] + bx.max[0]) / 2; }
  const xB0 = (Q.xCG * (mt + gB) - mx) / gB, xBat = clamp(Math.round(xB0), Math.ceil(Q.xBmin), Math.floor(Q.xBmax)), total = mt + gB, cg = (mx + gB * xBat) / total;
  const lastre = xB0 > Q.xBmax ? Math.ceil(((Q.xCG - cg) * total) / (Q.xF - 5 - Q.xCG)) : 0; // si ni con la batería lo más adelante: los gramos de plomo (o plastilina) en el morro
  const S = Q.S / 100, Wn = total / 1000 * 9.81, Vs = Math.sqrt(2 * Wn / (1.225 * S * 0.7)); // (ala plana: CL máximo ~0,7)
  return { xBat, xB0, total, cg, lastre, carga: total / Q.S, Vs, impreso: L.filter(x => x.peso == null && x.area == null).reduce((a, x) => a + pesoDe(Q, x), 0), espuma: L.filter(x => x.area != null).reduce((a, x) => a + pesoDe(Q, x), 0) }; }
const QS = new Map(); // (pesarlo todo cuesta: una vez por medidas; solo números)
export function medidasConBateria(p) { const Q0 = medidasAvion(p), k = [Q0.b, Q0.c, Q0.e, Q0.gPlancha, Q0.pulg].join(','); if (QS.has(k)) { const g = QS.get(k); return Object.assign(medidasAvion(p, g.escDelante, g.fLt), g); }
  const pesa = Q => { const haz = () => equilibrio(Q); let r = N.enAparteDatos(haz); if (r === undefined) r = N.enAmbito(haz); return r; };
  // de MORRO (los pequeños): primero el variador delante (la batería puede ir más atrás); si aún sobra morro, el brazo de cola más largo (hasta 2,6 cuerdas)
  let Q = Q0, r = pesa(Q);
  for (const [esc, f] of [[true, 2.2], [true, 2.3], [true, 2.4], [true, 2.5], [true, 2.6]]) { if (r.xB0 >= Q.xBmin) break; const Q2 = medidasAvion(p, esc, f), r2 = pesa(Q2); if (Math.abs(r2.cg - Q2.xCG) < Math.abs(r.cg - Q.xCG) || r2.xB0 >= Q2.xBmin) { Q = Q2; r = r2; } }
  const g = { xBat: r.xBat, F: r, escDelante: Q.escDelante, fLt: Q.fLt }; QS.set(k, g); return Object.assign(medidasAvion(p, Q.escDelante, Q.fLt), g); }

// ---------- 7) las PIEZAS PARA IMPRIMIR (cada una como se imprime) ----------
export function piezasAvion(Q) { const P = [], add = (t, m, k = 1, como = '', g = '') => { const b = N.caja(m), mm = m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]); for (let i = 0; i < k; i++) P.push({ t, m: mm, como, g }); };
  add('Fuselaje', fuselaje(Q, Q.xBat), 1, 'como va (abierto por arriba)', 'fuselaje'); add('Tapa de la batería', tapa(Q).rotate([180, 0, 0]), 1, 'boca abajo', 'fuselaje');
  add('Larguero, tramo de delante', tramoLarguero(Q, 'A'), 1, 'tumbado', 'cola'); add('Larguero, tramo de detrás', tramoLarguero(Q, 'B'), 1, 'tumbado', 'cola'); add('Unión del larguero', union(Q), 1, 'tumbada', 'cola');
  add('Soporte de la cola', soporteCola(Q).rotate([180, 0, 0]), 1, 'boca abajo (la plataforma en la cama)', 'cola'); add('Escuadra de la deriva', escuadra(Q), 2, 'como va', 'cola');
  add('Cuerno de timón', cuerno(), 2, 'como va', 'cola'); add('Guía de las varillas', guia(Q), 3, 'de canto', 'cola');
  return P; }
export const camasDe = P => colocaCamas(P.map(x => N.caja(x.m).dims)).map(c => c.map(x => x.i));
function camaN(P, k) { const Cs = colocaCamas(P.map(x => N.caja(x.m).dims)); if (!Cs[k]) N.mal('Esta avioneta va en ' + Cs.length + ' camas: elige «Cama 1»…«Cama ' + Cs.length + '».');
  return N.aLaCama(N.union(Cs[k].map(({ i, x, y, gira }) => { const m = gira ? P[i].m.rotate([0, 0, 90]) : P[i].m, b = N.caja(m); return m.translate([x - b.min[0], y - b.min[1], -b.min[2]]); }))); }

// 🧪 la PRUEBA DE ENCAJE (pocos gramos): el encastre con un trozo de larguero; el cortafuegos con TU motor; los travesaños con TU servo; la
// escuadra con TU cartón pluma (que la deriva entre justa)
export function pruebaAvion(p) { const Q = medidasAvion(p), L = [];
  L.push(enX(rr(Q.Ls, Q.Ls, 2), 0, 12).subtract(enX(rr(Q.LBh, Q.LBh, 0.6), -1, 13)).rotate([0, -90, 0])); // el manguito del encastre (de pie)
  L.push(tramoLarguero(Object.assign({}, Q, { LA: 30 }), 'A').translate([30, 0, Q.LB / 2])); // un trozo de larguero de 30
  let f = bloque(-1.5, 1.5, -19, 19, 0, 38, 3); const [a16, b19] = COMP_AVION.motor.cruz; f = f.subtract(cilX(10, -2, 2, 0, 19)); [[a16 / 2, 45], [b19 / 2, 135], [a16 / 2, 225], [b19 / 2, 315]].forEach(([r, g]) => { f = f.subtract(cilX(TOR.m3.paso, -2, 2, r * Math.cos(g * R2), 19 + r * Math.sin(g * R2))); });
  L.push(f.rotate([0, 90, 0])); // el cortafuegos (tumbado)
  let t = bloque(-16.4, 16.4, -8, 8, 0, 1.6); [1, -1].forEach(sx => { const x = sx * 13.9; t = t.add(bloque(x - 2.5, x + 2.5, -8, 8, 0, Q.zOr - Q.zS0 + 1)).subtract(cilZ(1.6, 3, 30, x, 0)); }); L.push(t); // los travesaños del servo
  L.push(escuadra(Q).intersect(bloque(-1, 16, -1, 20, -1, 20)).add(escuadra(Q).intersect(bloque(-1, 16, -1, 20, -1, 20)).mirror([0, 1, 0]).translate([0, -Q.e - 0.3, 0])).add(bloque(0, 15, -Q.e - 0.3 - 9.5, 9.5, 0, 1.2))); // las dos escuadras (con el hueco de TU cartón)
  return L; }

// ---------- 8) el catálogo: generar, nombres y pasos, animación, manual ----------
const GRUPOS = { fuselaje: 'fuselaje', cola: 'cola' };
export function genAvion(p) { const que = p.que || 'cama1';
  if (que === 'prueba') return U.enCama(pruebaAvion(p));
  const Q = medidasConBateria(p);
  if (que === 'montado') return N.union(enSitio(Q).filter(x => x.g !== 'nada').map(x => x.m));
  if (que === 'girado') return N.union(enSitio(Q, { prof: 20, dir: 25 }).filter(x => x.g !== 'nada').map(x => x.m));
  if (que === 'despiece') return N.union(despieceAvion(Q, enSitio(Q).filter(x => x.g !== 'nada')).map(x => x.m));
  if (que === 'corte') return vistaCorte(Q);
  const P = piezasAvion(Q); let I = P.map((x, i) => i);
  if (GRUPOS[que]) I = I.filter(i => P[i].g === GRUPOS[que]);
  else if (/^cama\d+$/.test(que)) return camaN(P, +que.slice(4) - 1);
  if (!I.length) N.mal('No hay piezas en «' + que + '».');
  return U.enCama(I.map(i => P[i].m)); }
export function despieceAvion(Q, L) { return L.map(x => { const dz = x.k === 'fuselaje' ? 0 : /^ala/.test(x.k) ? 70 : x.k === 'tapa' ? 40 : x.g === 'comp' ? 0 : /^(larguero|union|guia)/.test(x.k) ? -35 : /^(estab|profundidad|deriva|direccion|escuadra|cuerno|soporteCola)/.test(x.k) ? 45 : 25;
  const dy = /^(servoI|brazoI)/.test(x.k) ? 0 : 0; return { k: x.k, g: x.g, m: x.m.translate([0, dy, dz]) }; }); }
export const NOMBRES = { fuselaje: ['Fuselaje', 1], motor: ['Motor', 2], esc: ['Variador (ESC)', 3], servoI: ['Servo de la dirección', 4], servoD: ['Servo de la profundidad', 4], brazoI: ['Brazo del servo de la dirección', 5], brazoD: ['Brazo del servo de la profundidad', 5],
  largueroA: ['Larguero, tramo de delante', 6], union: ['Unión del larguero', 6], largueroB: ['Larguero, tramo de detrás', 6], soporteCola: ['Soporte de la cola', 7], guia0: ['Guía de las varillas', 8], guia1: ['Guía de las varillas', 8], guia2: ['Guía de las varillas', 8],
  estab: ['Estabilizador', 9], profundidad: ['Timón de profundidad', 9], escuadraI: ['Escuadra de la deriva (izquierda)', 10], escuadraD: ['Escuadra de la deriva (derecha)', 10], deriva: ['Deriva', 10], direccion: ['Timón de dirección', 10],
  cuernoP: ['Cuerno del timón de profundidad', 11], cuernoD: ['Cuerno del timón de dirección', 11], varillaP: ['Varilla de la profundidad', 12], varillaD: ['Varilla de la dirección', 12], receptor: ['Receptor', 13], bateria: ['Batería', 14], tapa: ['Tapa de la batería', 15],
  alaI: ['Ala izquierda', 16], alaD: ['Ala derecha', 16], helice: ['Hélice', 17] };
// el movimiento EXACTO para la animación: la hélice gira; los servos van a un lado y al otro y cada timón les sigue (profundidad ±20°, dirección ±25°)
export function montadasAvion(p) { const Q = medidasConBateria(p), base = enSitio(Q).filter(x => x.g !== 'nada'), w = 0.4;
  const rotEje = (eje, c, a) => { const [x, y, z] = eje, co = Math.cos(a), si = Math.sin(a), t = 1 - co, R = [[t * x * x + co, t * x * y - si * z, t * x * z + si * y], [t * x * y + si * z, t * y * y + co, t * y * z - si * x], [t * x * z - si * y, t * y * z + si * x, t * z * z + co]];
    const o = [0, 1, 2].map(i => c[i] - (R[i][0] * c[0] + R[i][1] * c[1] + R[i][2] * c[2])); return [R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, o[0], o[1], o[2], 1]; };
  const s1 = t => Math.sin(2 * Math.PI * w * t), s2 = t => Math.sin(2 * Math.PI * w * t + Math.PI / 2);
  return base.map(x => { const [nombre, paso] = NOMBRES[x.k] || [x.k, 18], o = { m: x.m, nombre, paso };
    if (x.g === 'hel') o.mov = { f: t => rotEje([1, 0, 0], [0, 0, Q.zM], 2 * Math.PI * 3 * t) };
    if (x.g === 'prof') o.mov = { f: t => rotEje([0, 1, 0], [Q.xBis, 0, Q.zs0 + Q.e / 2], -20 * R2 * s1(t)) };
    if (x.g === 'dir') o.mov = { f: t => rotEje([0, 0, 1], [ejeDir(Q), 0, 0], 25 * R2 * s2(t)) };
    if (x.g === 'svD') o.mov = { f: t => rotEje([0, 0, 1], [Q.xEje, -Q.yS, 0], 35 * R2 * s1(t)) };
    if (x.g === 'svI') o.mov = { f: t => rotEje([0, 0, 1], [Q.xEje, Q.yS, 0], -35 * R2 * s2(t)) };
    if (x.g === 'vD') o.mov = { f: t => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -Q.rBrazo * Math.sin(35 * R2 * s1(t)), 0, 0, 1] };
    if (x.g === 'vI') o.mov = { f: t => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, Q.rBrazo * Math.sin(-35 * R2 * s2(t)), 0, 0, 1] };
    if (x.k === 'helice') o.que = 'la hélice gira; cada servo mueve su varilla y su timón (profundidad ±20°, dirección ±25°)';
    return o; }); }
// 📄 el MANUAL
export function tornilleria(Q) { return [[4, 'Tornillo M3 × 6 (los trae el motor)', 'el motor en el cortafuegos, por dentro, en su cruz de 16 × 19'], [1, 'Tornillo M3 × 40 + tuerca autoblocante', 'el larguero en su encastre del fuselaje (la tuerca, por fuera)'],
  [1, 'Tornillo M3 × 25 + tuerca autoblocante', 'el larguero en el soporte de la cola'], [4, 'Tornillo de 2 mm rosca-chapa (los traen los servos)', 'las orejas de cada servo en sus dos travesaños'],
  [2, 'Pincho de bambú de 3 mm × 80 mm (o tornillo M3 × 70)', 'los dos pasadores de las gomas: el de delante también sujeta la tapa de la batería'], [6, 'Goma elástica', 'el ala: de pincho a pincho, cruzadas por encima'],
  [2, 'Varilla de acero de 1 mm × ' + Math.ceil(Math.max(largoVarilla(Q, 'direccion'), largoVarilla(Q, 'profundidad')) / 10) * 10 + ' mm (o radio de bici)', 'una para cada timón: Z en las dos puntas (brazo del servo y cuerno)'],
  [1, 'Correa de velcro de 20 mm', 'la batería, por sus dos ranuras del suelo']]; }
export function manualAvion(p) { const Q = medidasConBateria(p), F = Q.F, C = COMP_AVION, cuenta = new Map(), P = piezasAvion(Q), PC = planoCorte(Q);
  P.forEach(x => { const c2 = cuenta.get(x.t) || { k: 0, como: x.como }; c2.k++; cuenta.set(x.t, c2); });
  const compra = [C.motor.t, C.esc.t, 'hélice de avión de ' + Q.pulg + '×4 (' + C.helice.t.replace(/^Hélice de avión de 2 palas /, '') + ')', C.servo.t, C.bateria.t, C.receptor.t + ' y su emisora (con mezclas no hace falta: dirección y profundidad)', C.espuma.t, C.varilla.t, C.otros.t];
  return { vistas: [['montado', 'Así queda montada (los componentes en gris)'], ['despiece', 'Dónde va cada pieza'], ['corte', 'Cómo se cortan las piezas de cartón pluma']],
    piezas: [...cuenta].map(([t, c2]) => [t, c2.k, c2.como]), tornilleria: tornilleria(Q),
    herramientas: 'Cúter y regla metálica, cola caliente (o UHU Por), cinta de embalar, lija fina, alicates (las Z de las varillas) y un destornillador de estrella pequeño. Lo que se compra: ' + compra.join(' · ') + '.',
    edad: 'A partir de 14 años; con un adulto al cargar la batería y en los primeros vuelos (lleva hélice).',
    pasos: ['Imprime antes la 🧪 PRUEBA DE ENCAJE: el trozo de larguero entra justo en su manguito, TU motor casa con los agujeros del cortafuegos, TU servo apoya sus orejas en los travesaños y TU cartón pluma entra justo entre las dos escuadras.',
      'Atornilla el MOTOR al CORTAFUEGOS con sus 4 tornillos M3 × 6 desde dentro, pasando sus 3 cables por la ranura de debajo.',
      'Pega con cinta de doble cara el VARIADOR en el suelo, ' + (Q.escDelante ? 'contra el cortafuegos' : 'delante de los travesaños de los servos') + ' (así lo pide el equilibrio), y conecta sus 3 cables al motor.',
      'Atornilla los dos SERVOS de pie en sus TRAVESAÑOS (2 tornillos cada uno), con el eje hacia atrás: el de la izquierda mueve la dirección y el de la derecha la profundidad. Céntralos con la emisora y pon sus BRAZOS hacia fuera.',
      'Pega la UNIÓN en el tramo de delante del LARGUERO (la mitad dentro) y el tramo de detrás encima (cola de contacto o cianocrilato): un larguero recto de ' + Math.round(Q.LBo) + ' mm.',
      'Mete el larguero en su ENCASTRE del fuselaje hasta el fondo y pon el tornillo M3 × 40 con su autoblocante; el SOPORTE DE LA COLA en la otra punta, con la plataforma arriba, y su M3 × 25.',
      'Pon las 3 GUÍAS a presión en el larguero, con sus ojales arriba.',
      'Corta las piezas de CARTÓN PLUMA como dice el plano de corte (' + PC.hojas.length + (PC.hojas.length === 1 ? ' plancha' : ' planchas') + ' de 50 × 70). En el estabilizador y en la deriva, corta el TIMÓN y vuelve a unirlo con una tira de cinta de embalar por cada cara (la bisagra): que caiga suelto.',
      'Pega el ESTABILIZADOR en la plataforma del soporte de la cola, centrado y recto (mira desde atrás que esté paralelo al ala).',
      'Pega las dos ESCUADRAS en el estabilizador, una a cada lado de la línea del centro, y mete la DERIVA entre ellas (cola caliente): a 90° del estabilizador.',
      'Pega los CUERNOS: el de profundidad encima de su timón, a la derecha de la deriva; el de dirección en la cara izquierda de su timón. Sus agujeros, encima de la bisagra.',
      'Dobla una Z en una punta de cada VARILLA, mételas en el brazo de su servo, pásalas por los ojales de las guías y dobla la otra Z en el cuerno con el servo y el timón centrados.',
      'Pega el RECEPTOR tumbado encima del variador (cinta de doble cara) y conecta el variador (canal 3) y los dos servos (dirección en el 4 —o el 1— y profundidad en el 2).',
      'La BATERÍA con su centro a ' + Q.xBat + ' mm por delante del borde de ataque (en sus ranuras, con la correa de velcro); cierra la TAPA y pasa el pincho de delante por sus orejas.',
      'Las dos medias ALAS: lija un poco el canto de la raíz, pon una plana en la mesa y la punta de la otra a ' + Math.round(Q.b / 2 * Math.sin(2 * Q.diedro * R2)) + ' mm de altura (eso son 2 × ' + Q.diedro + '° de diedro) y pégalas con cola caliente; refuerza la unión con cinta por las dos caras. Redondea con lija el borde de ataque.',
      'Pon el ala en su silla (el borde de ataque, en la marca del morro) y sujétala con 6 gomas cruzadas de pincho a pincho.',
      'Pon la HÉLICE (que empuje hacia atrás; si el avión se va hacia atrás, cambia dos cables del motor) y COMPRUEBA EL EQUILIBRIO: sujeta el avión con un dedo en cada BOTÓN del costado: tiene que quedarse recto o un poco de morro. Si cae de cola, adelanta la batería.'],
    consejos: ['Calculado con las medidas de las piezas y los componentes: unos ' + Math.round(F.total) + ' g en total (' + Math.round(F.impreso) + ' impresos y ' + Math.round(F.espuma) + ' de cartón con tu plancha de ' + Q.gPlancha + ' g), ' + n2(Math.round(F.carga * 10) / 10) + ' g/dm² de carga alar: vuela despacio (entra en pérdida a unos ' + Math.round(F.Vs * 3.6) + ' km/h).',
      'El equilibrio: la batería a ' + Q.xBat + ' mm por delante del borde de ataque deja el centro de gravedad a ' + Math.round(-F.cg) + ' mm por detrás (el ' + Math.round(-F.cg / Q.c * 100) + ' % de la cuerda)' + (F.lastre ? '; aun así hacen falta ' + F.lastre + ' g de plastilina o plomo en el morro' : '') + '.',
      'Cola calculada como en los entrenadores: horizontal Vh = ' + n2(Math.round(Q.Vh * 100) / 100) + ' (vale de 0,45 a 0,6) y vertical Vv = ' + n2(Math.round(Q.Vv * 1000) / 1000) + ' (con solo dirección, de 0,04 a 0,05).',
      'Recorridos: profundidad ±12 mm en el borde de salida (unos ±20°) y dirección ±20 mm (±25°); si la emisora lo permite, 30 % de exponencial. El primer vuelo, con poco viento: lánzala recta y un poco hacia arriba, a medio gas.',
      'En el 🎬 Catálogo de CelebriR8 → 🔧 Montaje paso a paso, se ve este mismo orden, pieza a pieza.'],
    cuidados: ['Después de cada golpe mira el larguero y sus dos tornillos.', 'Si una pieza de cartón se dobla o se rompe, se corta otra (el plano de corte lo dice): es la gracia del cartón pluma.', 'La batería LiPo, siempre con su cargador y vigilada; si se hincha, no la uses. Nunca pongas la hélice con el avión en la mano y la batería conectada sin que la emisora esté encendida y con el gas a cero.'] }; }
export function notaAvion(p) { let Q; try { Q = medidasConBateria(p); } catch (e) { return '⚠️ ' + e.message; } const F = Q.F, C = COMP_AVION, PC = planoCorte(Q); let nC = 0; try { nC = N.enAmbito(() => camasDe(piezasAvion(Q)).length); } catch (e) { }
  if (p.que === 'corte') return '✂️ EL PLANO DE CORTE: ' + PC.hojas.length + (PC.hojas.length === 1 ? ' plancha' : ' planchas') + ' de cartón pluma de 50 × 70 cm. Las dos medias alas (' + Q.b / 2 + ' × ' + Q.c + ' mm), el estabilizador con su timón (' + Q.bh + ' × ' + Q.cs + '; el timón, los ' + Q.ce + ' mm de atrás) y la deriva con el suyo. Corta con cúter y regla metálica, de una pasada suave y otra firme.';
  if (p.que === 'prueba') return '🧪 PRUEBA DE ENCAJE (unos 15 g): el MANGUITO con un trozo de LARGUERO (entra justo, sin holgura), el CORTAFUEGOS con TU motor (los 4 tornillos M3 de su cruz), los TRAVESAÑOS con TU servo (las orejas apoyan, los tornillos agarran) y las dos ESCUADRAS con TU cartón pluma (entra justo). Si algo no casa, dime cuánto y se ajusta.';
  if (p.que === 'despiece') return '📐 EL DIBUJO DE MONTAJE: el fuselaje con los componentes; encima, el ala; detrás, el larguero, el soporte de la cola y la cola. Gíralo con el ratón.';
  return 'PARA QUÉ: una AVIONETA RC ENTRENADORA de ala alta de ' + Q.b + ' mm de envergadura: con 6° de diedro, dirección y profundidad (sin alerones) gira y se endereza sola, la mejor para aprender. El FUSELAJE es impreso (fuerte donde hace falta: el motor, el larguero, los servos) y las ALAS y la COLA son de cartón pluma: vuela despacio y si se rompe se corta otra. '
    + 'LO QUE COMPRAS: ' + C.motor.t + '; ' + C.esc.t + '; hélice de avión de ' + Q.pulg + '×4; ' + C.servo.t + '; ' + C.bateria.t + '; ' + C.receptor.t + '; ' + C.espuma.t + '; ' + C.varilla.t + '; ' + C.otros.t + '. '
    + 'DÓNDE VA CADA COSA: el MOTOR en el cortafuegos; el VARIADOR en el suelo, ' + (Q.escDelante ? 'contra el cortafuegos' : 'delante de los servos') + ', con el RECEPTOR tumbado encima; los dos SERVOS de pie en sus travesaños (el izquierdo, dirección; el derecho, profundidad); la BATERÍA con su centro a ' + Q.xBat + ' mm por delante del borde de ataque (ahí están las ranuras de su correa: lo pone el cálculo del equilibrio). '
    + 'CALCULADO: unos ' + Math.round(F.total) + ' g, ' + n2(Math.round(F.carga * 10) / 10) + ' g/dm² de carga alar (entrenador: de 15 a 30), entra en pérdida a unos ' + Math.round(F.Vs * 3.6) + ' km/h; el centro de gravedad al ' + Math.round(-F.cg / Q.c * 100) + ' % de la cuerda' + (F.lastre ? ' (con ' + F.lastre + ' g de plastilina en el morro)' : '') + '; cola horizontal Vh = ' + n2(Math.round(Q.Vh * 100) / 100) + ' y vertical Vv = ' + n2(Math.round(Q.Vv * 1000) / 1000) + '. '
    + 'SE IMPRIME en ' + nC + (nC === 1 ? ' cama' : ' camas') + ' de la P1P (todo SIN soportes) y se cortan ' + PC.hojas.length + (PC.hojas.length === 1 ? ' plancha' : ' planchas') + ' de cartón pluma (mira «✂️ Plano de corte»). En PETG o PLA, con 4 paredes. '
    + 'Lo que no se puede probar sin volar: lo rápido que va con TU motor y TU hélice (con un 2212 de 1400–2200 KV en 2S, unos 300–450 g de empuje según el fabricante: de sobra para sus ' + Math.round(F.total) + ' g).'; }
const QUE = [['cama1', 'Cama 1'], ['cama2', 'Cama 2'], ['cama3', 'Cama 3'], ['cama4', 'Cama 4'], ['fuselaje', 'Solo el fuselaje y su tapa'], ['cola', 'Solo el larguero y la cola'], ['corte', '✂️ Plano de corte del cartón pluma'],
  ['prueba', '🧪 Prueba de encaje (larguero, motor, servo, cartón)'], ['montado', '👀 Montada (con los componentes en gris)'], ['girado', '👀 Montada con los timones girados'], ['despiece', '📐 Despiece: el dibujo de montaje']];
export const DISENOS_AIRE = {
  avionetaRC: { cat: 'rc', tambien: ['juguetes', 'pro'], nuevo: true, busca: 'avioneta avión rc aeromodelo entrenador ala alta cartón pluma foam board depron diedro motor sin escobillas brushless 2212 servo sg90 radiocontrol volar trainer plane',
    e: '✈️', t: 'Avioneta RC entrenadora (fuselaje impreso + alas de cartón pluma)', d: 'Fuselaje impreso con cortafuegos para motor sin escobillas, sitio para servos, variador y batería; larguero y soporte de cola impresos; alas y cola de cartón pluma con su plano de corte. El programa calcula el equilibrio (dónde va la batería) y la cola', uso: 'funcional', color: '#e63946',
    campos: [n('envergadura', 'Envergadura', 900, 800, 1000, 10), n('cuerda', 'Cuerda del ala', 180, 150, 185, 5), n('espuma', 'Grosor de tu cartón pluma', 5, 3, 6, 0.5), n('plancha', 'Lo que pesa tu plancha de 50 × 70 (g)', 100, 40, 300, 5),
      s('helice', 'Hélice (de avión)', '6', [['5', '5×4 pulgadas'], ['6', '6×4 pulgadas']]), s('que', 'Qué imprimo', 'cama1', QUE)],
    pesado: true, gen: p => genAvion(p), manual: p => manualAvion(p), nota: p => notaAvion(p) }
};
