// ================= v30.7.1 · ⭐ DISEÑOS PRO: por piezas, que ENCAJAN =================
// La dueña (12-10-2026): «no hay productos de calidad, son todos productos mediocres… haz diseños nuevos, pero buenos diseños,
// funcionales: lava-pinceles por piezas… diseños que encajan».
// Cada uno de estos es un PRODUCTO de varias piezas que casan entre sí con las holguras de sus Bambu (0,05 a presión · 0,10 encaja ·
// 0,15 gira o desliza; para piezas grandes que entran y salen a mano, 0,25–0,30), y TODOS traen su «🧪 prueba de encaje»: un trozo
// pequeño (unos gramos) que se imprime antes que la pieza entera («no me hagas nada que luego no encaje»). También se pueden ver
// MONTADOS (solo para mirar) y sacar pieza a pieza (cada una de su color). Todo diseñado aquí (© CelebriDiseños), sin soportes.
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, M, seg, circ, rr, poli, cil, cono, caja, n2, R2, porY, enFila } = A;
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const tubo = (de, di, h, z = 0) => cil(de, h, z).subtract(cil(di, h + 0.4, z - 0.2));
const enRueda = (k, R, fn, a0 = 0) => N.union([...Array(k)].map((_, i) => { const a = a0 + i * 360 / k; return fn(i).rotate([0, 0, a]).translate([R * Math.cos(a * R2), R * Math.sin(a * R2), 0]); }));
const lim = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
const DESLIZA = 0.15, MANO = 0.28; // por lado: «gira / desliza» de sus Bambu · pieza grande que entra y sale con la mano
// varias piezas en la cama, en fila (y si no caben en 250 mm, en dos filas)
const enCama = (L, hueco = 8) => { const an = L.reduce((a, m) => a + N.caja(m).dims[0] + hueco, -hueco); if (an <= 250 || L.length < 3) return enFila(L, hueco); const mitad = Math.ceil(L.length / 2), f1 = enFila(L.slice(0, mitad), hueco), f2 = enFila(L.slice(mitad), hueco), b1 = N.caja(f1), b2 = N.caja(f2); return f1.translate([-b1.min[0], -b1.max[1] - hueco / 2, 0]).add(f2.translate([-b2.min[0], -b2.min[1] + hueco / 2, 0])); };

// ======================= 🖌️ LAVA-PINCELES PRO (4 piezas) =======================
// VASO con un escalón por dentro · REJILLA que se apoya en el escalón (se frota el pincel contra sus lomos; los posos caen debajo y
// el agua de arriba queda limpia) con un pomo para sacarla sin mojarse · TAPA-SOPORTE que encaja en el borde y sujeta los pinceles
// COLGADOS en sus ranuras en V (las cerdas en el agua, sin tocar el fondo: no se doblan) · BANDEJA con secadero (los pinceles,
// tumbados sobre dos peines, con la punta en el aire).
function lavaK(p) { const D = lim(p.d, 80, 140), H = lim(p.h, 70, 130), w = 2.8, di = D - 2 * w, posos = lim(p.posos, 12, 30), zs = 3 + posos; return { D, H, w, di, posos, zs, k: Math.round(lim(p.ranuras, 4, 10)), esc: 3 }; }
function lavaVaso(K, alto) { const { D, w, di, zs, esc } = K, H = alto || K.H;
  let v = tubo(D, di, H).add(cil(D, 3));
  v = v.add(cil(di + 0.2, esc, zs - esc).subtract(cono(di + 0.3, di - 2 * esc, esc + 0.02, zs - esc - 0.01)));       // el escalón: crece a 45° (sin soportes)
  return v.subtract(cil(D + 1, 1, -0.5).subtract(cono(D - 2.4, D + 1, 1.2, -0.6)).translate([0, 0, 0])); }             // canto de abajo matado (no hace pie de elefante feo)
function lavaRejilla(K, conPomo = true) { const { di, H, zs } = K, dr = di - 2 * MANO, g = 2.6;
  let r = cil(dr, g); const R = [], L = [];
  for (let y = -dr / 2 + 6.5, i = 0; y <= dr / 2 - 6.5; y += 6.2, i++) { const half = Math.sqrt(Math.max(0, (dr / 2 - 3.5) ** 2 - y * y)); if (half > 6) { R.push(cubo(-half, half, y - 1.5, y + 1.5, -1, g + 1)); } }
  r = r.subtract(N.union(R));
  for (let y = -dr / 2 + 6.5 + 3.1; y <= dr / 2 - 9.6; y += 12.4) { const half = Math.sqrt(Math.max(0, (dr / 2 - 3.5) ** 2 - y * y)); if (half > 8) L.push(porY(poli([[-half, g - 0.01], [half, g - 0.01], [half - 1.6, g + 1.6], [-half + 1.6, g + 1.6]]), 1.7).rotate([0, 0, 0]).translate([0, y, 0])); } // lomos para frotar (uno sí, uno no)
  r = r.add(N.union(L)).add(cil(22, g));                                                                               // el centro, macizo: de ahí sale el pomo
  if (conPomo) { const hp = Math.max(22, H - zs - 16); r = r.add(cil(11, hp, g - 0.01)).add(cono(11, 20, 4.5, g + hp - 0.02)).add(cil(20, 4, g + hp + 4.46)); } // pomo: columna + seta (a 45°)
  return r; }
function lavaTapa(K) { const { D, di, k } = K, hol = MANO - 0.05, ala = Math.max(11, Math.min(15, di * 0.13)), g = 3, falda = 9;
  let t = cil(D + 2 * (hol + 2.6), g).subtract(cil(di - 2 * ala, g + 1, -0.5)).add(tubo(D + 2 * (hol + 2.6), D + 2 * hol, falda, g - 0.01)); // (se imprime así: la cara de arriba, en la cama)
  const ri = di / 2 - ala, anchos = [12, 9, 7, 10.5, 8, 6];                                                             // ranuras en V: cada pincel se acuña en su grueso
  t = t.subtract(enRueda(k, 0, i => { const a = anchos[i % anchos.length]; return poli([[ri - 1, -a / 2], [ri + ala - 3.2, -1.3], [ri + ala - 3.2, 1.3], [ri - 1, a / 2]]).extrude(g + 1).translate([0, 0, -0.5]); }));
  return t; }
function lavaBandeja(K) { const { D, k } = K, X = D + 78, Y = D + 18, cx = -X / 2 + D / 2 + 9, x1 = cx + D / 2 + 14, x2 = X / 2 - 8, hp = 18;
  let b = caja(X, Y, 8, 14).subtract(caja(X - 4.8, Y - 4.8, 8, 12).translate([0, 0, 2.4]));
  b = b.add(tubo(D + 2 * (MANO + 0.2) + 4.8, D + 2 * (MANO + 0.2), 3.2, 2.39).translate([cx, 0, 0]));                   // el aro donde se asienta el vaso (no baila)
  const peine = x => { const nd = Math.max(4, Math.min(8, k)), paso = (Y - 30) / nd; let m = cubo(x - 1.8, x + 1.8, -Y / 2 + 6, Y / 2 - 6, 2.39, hp); for (let i = 0; i < nd; i++) { const y = -Y / 2 + 15 + paso * (i + 0.5); m = m.subtract(poli([[y - 5, hp + 1], [y + 5, hp + 1], [y, hp - 7]]).extrude(6).rotate([90, 0, 90]).translate([x - 3, 0, 0])); } return m; };
  return b.add(peine(x1)).add(peine(x2)); }
function lavaPincelesPro(p) { const K = lavaK(p), q = p.que || 'juego';
  if (q === 'vaso') return lavaVaso(K); if (q === 'rejilla') return lavaRejilla(K); if (q === 'tapa') return lavaTapa(K); if (q === 'bandeja') return lavaBandeja(K);
  if (q === 'prueba') { // SOLO lo que casa, sin gastar: un ARO del vaso (con su escalón, sin fondo), el aro de la rejilla y el aro de la tapa
    const aro = tubo(K.D, K.di, 15).add(cil(K.di + 0.2, K.esc, 3).subtract(cono(K.di + 0.3, K.di - 2 * K.esc, K.esc + 0.02, 2.99)));
    const dr = K.di - 2 * MANO, rej = tubo(dr, dr - 16, 2.6), hol = MANO - 0.05, tap = tubo(K.D + 2 * (hol + 2.6), K.di - 8, 3).add(tubo(K.D + 2 * (hol + 2.6), K.D + 2 * hol, 9, 2.99));
    return enCama([aro, rej, tap]); }
  if (q === 'montado') { const t = lavaTapa(K).rotate([180, 0, 0]).translate([0, 0, K.H + 3]); return lavaBandeja(K).add(lavaVaso(K).add(lavaRejilla(K).translate([0, 0, K.zs])).add(t).translate([-(K.D + 78) / 2 + K.D / 2 + 9, 0, 2.4])); }
  return enCama([lavaVaso(K), lavaRejilla(K), lavaTapa(K)]); }

// ======================= 🫙 BOTE CON TAPA DE ROSCA =======================
// Rosca de verdad (en V a 45°, de paso gordo: 3 mm), impresa, sin soportes. La tapa lleva estrías para agarrarla y un labio que
// asienta sobre el hombro del bote. Para botones, tornillos, especias, abalorios, purpurina… (no es estanco al agua sin junta).
// ROSCA EN V a 45°: una sección «de huevo» (el radio sube y baja en diente de sierra con el ángulo) que gira mientras sube. Cada
// flanco queda a 45°: se imprime sin soportes y no se clava. prof = paso/2 − 0,3 (las crestas, matadas). hol = holgura por lado (hembra).
function roscaV(d, paso, h, hol = 0) { const prof = paso / 2 - 0.3, rmax = d / 2 + hol, rmin = rmax - prof, P = [], nn = 120;
  for (let i = 0; i < nn; i++) { const t = i / nn, tri = t < 0.5 ? t * 2 : 2 - t * 2, r = rmin + Math.max(0, Math.min(prof, tri * (prof + 0.3) - 0.15)), a = t * 2 * Math.PI; P.push([r * Math.cos(a), r * Math.sin(a)]); }
  return poli(P).extrude(h, Math.ceil(h / paso * 60), -360 * h / paso); }
function boteK(p) { const D = lim(p.d, 36, 120), H = lim(p.h, 30, 160), paso = 3, hn = 11, dn = D - 6.4, hol = lim(p.holgura, 0.1, 0.5), prof = paso / 2 - 0.3; return { D, H, paso, hn, dn, hol, prof, bore: dn - 2 * prof - 4.4 }; }
function boteCuerpo(K, alto) { const { D, paso, hn, dn, bore } = K, H = alto || K.H, hc = H - hn;
  let m = cil(D, hc).add(cono(D, dn - 2 * K.prof, 2.4, hc - 0.01)).add(cil(dn - 2 * K.prof, hn + 2.0, hc)).add(roscaV(dn, paso, hn).translate([0, 0, hc + 2.0]));
  m = m.subtract(cil(bore, H + 5, 2.4));
  return m.subtract(cil(D + 1, 1, -0.5).subtract(cono(D - 2, D + 1, 1, -0.5))); }
function boteTapa(K) { const { D, paso, hn, dn, hol } = K, ht = hn + 2.2 + 2.4, k = Math.max(16, Math.round(D * 0.55));
  let t = cil(D, ht).subtract(roscaV(dn, paso, hn + 3, hol).translate([0, 0, 2.4]));                             // (se imprime boca arriba: el techo de la tapa, en la cama)
  t = t.subtract(cil(dn + 2 * hol + 0.4, 2.6, ht - 2.4));                                                               // entrada lisa: la rosca coge sola
  t = t.subtract(enRueda(k, D / 2 + 0.9, () => cil(3.2, ht + 2, -1)));                                                  // estrías
  return t.subtract(cil(D + 1, 1, -0.5).subtract(cono(D - 2, D + 1, 1, -0.5))); }
function boteRosca(p) { const K = boteK(p), q = p.que || 'juego';
  if (q === 'cuerpo') return boteCuerpo(K); if (q === 'tapa') return boteTapa(K);
  if (q === 'prueba') return enCama([boteCuerpo(K, K.hn + 8), boteTapa(K)]);                                            // el cuello solo (19 mm de alto) + la tapa
  if (q === 'montado') return boteCuerpo(K).add(boteTapa(K).rotate([180, 0, 0]).translate([0, 0, K.H + 2.4 + 2.2 - 0.2 + 2.0 - 2.2]));
  return enCama([boteCuerpo(K), boteTapa(K)]); }

// ======================= 🧩 ESCRITORIO MODULAR (módulos que se enganchan) =======================
// Cada módulo lleva COLAS DE MILANO: macho a la derecha y detrás, hembra a la izquierda y delante. Se enganchan bajando uno junto a
// otro (la cola va de pie: sale sin soportes) y ya no se separan al mover la mesa. Paso de 80 mm: un cubilete, una bandeja de dos
// huecos, un taco de notas (76 × 76), un atril para el móvil y una torre de 3 cajoncitos… se combinan como se quiera.
const PASO = 80, COLA = { cuello: 9, cabeza: 14, fondo: 4.2, alto: 22 };
const colaCS = (extra = 0) => poli([[-COLA.cuello / 2 - extra, -0.02], [COLA.cuello / 2 + extra, -0.02], [COLA.cabeza / 2 + extra, COLA.fondo + extra], [-COLA.cabeza / 2 - extra, COLA.fondo + extra]]);
// macho: sale de la cara (hacia +Y en su dibujo) · hembra: hueco hacia dentro, con su holgura y un chaflán de entrada abajo
const colaMacho = (alto = COLA.alto) => colaCS(0).extrude(alto);
const colaHembra = (hol, alto = COLA.alto) => colaCS(hol).extrude(alto + 0.6).translate([0, 0, -0.2]).add(M().hull([colaCS(hol).extrude(0.02).translate([0, 0, alto + 0.38]), poli([[-0.3, -0.02], [0.3, -0.02], [0.3, COLA.fondo + hol], [-0.3, COLA.fondo + hol]]).extrude(0.02).translate([0, 0, alto + 0.4 + COLA.cabeza / 2 + hol])]));
function modCuerpo(cx, cy, H, hol, sinColas) { const X = cx * PASO, Y = cy * PASO; let m = caja(X, Y, H, 6);
  if (sinColas) return m;
  for (let i = 0; i < cy; i++) { const y = -Y / 2 + PASO * (i + 0.5); m = m.add(colaMacho().rotate([0, 0, -90]).translate([X / 2, y, 0])).subtract(colaHembra(hol).rotate([0, 0, -90]).translate([-X / 2, y, 0])); } // derecha: macho · izquierda: hembra
  for (let i = 0; i < cx; i++) { const x = -X / 2 + PASO * (i + 0.5); m = m.add(colaMacho().translate([x, Y / 2, 0])).subtract(colaHembra(hol).translate([x, -Y / 2, 0])); }                                 // detrás: macho · delante: hembra
  return m; }
// lo que se vacía de cada módulo deja SIEMPRE 6 mm de pared donde hay cola hembra (4,2 de hueco + 1,8 de carne)
function modulo(tipo, hol) { const w = 2.4, pw = 6.4;
  if (tipo === 'bandeja') { const X = 2 * PASO, Y = PASO, H = 26; let m = modCuerpo(2, 1, H, hol); const hueco = (x0, x1) => rr(x1 - x0, Y - pw - w, 5).extrude(H).translate([(x0 + x1) / 2, (pw - w) / 2, 2.4]); return m.subtract(hueco(-X / 2 + pw, -2)).subtract(hueco(2, X / 2 - w)); }
  if (tipo === 'notas') { const H = 30; let m = modCuerpo(1, 1, H, hol); m = m.subtract(caja(77, 77 - 6, H, 2).translate([(pw - w) / 2 - 0.9, (pw - w) / 2 + 2, 2.4]).intersect(cubo(-PASO / 2 + pw, PASO / 2 - 1.5, -PASO / 2 + pw, PASO / 2 - 1.5, 2.4, H + 1))); return m.subtract(cubo(-12, 12, -PASO / 2 - 1, -PASO / 2 + pw + 1, 24, H + 1)); } // muesca delante para coger la nota (por encima de la cola)
  if (tipo === 'movil') { const H = 40; let m = modCuerpo(1, 1, H, hol);
    m = m.subtract(cubo(-PASO / 2 + pw, PASO / 2 - w, -PASO / 2 + pw, -15, 2.4, H + 1)).subtract(cubo(-PASO / 2 + pw, PASO / 2 - w, 13, PASO / 2 - w, 2.4, H + 1));   // bandejita delante (clips, gomas) y cajetín detrás (cargador)
    m = m.subtract(cubo(-PASO / 2 + pw + 3, PASO / 2 - w - 3, -6.5, 6.5, 0, 60).rotate([-15, 0, 0]).translate([0, -2, 12]));                                       // la ranura inclinada (13 mm: móvil con funda)
    return m.subtract(cubo(-6, 6, -4, PASO / 2 + 1, 26, H + 1)); }                                                                                              // paso del cable hacia atrás
  if (tipo === 'alto') { const H = 105; return modCuerpo(1, 1, H, hol).subtract(rr(PASO - pw - w, PASO - pw - w, 5).extrude(H).translate([(pw - w) / 2, (pw - w) / 2, 2.4])); }           // cubilete alto (reglas, tijeras)
  const H = 82; return modCuerpo(1, 1, H, hol).subtract(rr(PASO - pw - w, PASO - pw - w, 5).extrude(H).translate([(pw - w) / 2, (pw - w) / 2, 2.4]));                                       // cubilete
}
function pruebaCola(hol) { const b = (macho) => { let m = caja(30, 22, COLA.alto + 2, 3); return macho ? m.add(colaMacho().translate([0, 11, 0])) : m.subtract(colaHembra(hol).translate([0, -11, 0])); }; return enFila([b(true), b(false)], 8); }
function escritorioModular(p) { const hol = lim(p.holgura, 0.08, 0.4), q = p.que || 'cubilete';
  if (q === 'prueba') return pruebaCola(hol);
  if (q === 'montado') return modulo('bandeja', hol).translate([PASO / 2, 0, 0]).add(modulo('cubilete', hol).translate([0, PASO, 0])).add(modulo('movil', hol).translate([PASO, PASO, 0])).add(modulo('notas', hol).translate([-PASO, 0, 0])).add(modulo('alto', hol).translate([-PASO, PASO, 0]));
  return modulo(q, hol); }

// ======================= 🪴 MACETA CON AUTORRIEGO (2 piezas) =======================
// El MACETERO de dentro acaba en embudo y en una pata hueca con ranuras que se mete en el agua: la tierra de la pata hace de mecha
// y la planta bebe sola 1–2 semanas. El DEPÓSITO de fuera lleva una boca para echar el agua (y ver por dónde va) sin sacar nada.
// Todo sube a 45° como mucho: sale sin soportes. El macetero cuelga del borde por su ala (holgura de mano: entra y sale).
function macetaK(p) { const D = lim(p.d, 80, 180), w = 2.4, agua = lim(p.agua, 20, 60), Db = D * 0.86, rp = Math.max(14, D * 0.15), hpared = lim(p.alto, 15, 90), pata = agua - 4, aire = 4;
  // el depósito es un cono (más estrecho abajo): el macetero lleva su MISMA caída, con la holgura de mano todo alrededor. La altura
  // sale de las piezas: fondo + aire + pata + embudo (a 45°) + pared; como el embudo depende de la altura, se afina en tres vueltas
  let H = 2.4 + aire + pata + (D / 2 - w - rp) + hpared, rw = 0, hc = 0;
  for (let i = 0; i < 4; i++) { rw = D / 2 - w - (D / 2 - Db / 2) * hpared / H - MANO; hc = rw - rp; H = 2.4 + aire + pata + hc + hpared; }
  return { D, Db, w, agua, rp, hpared, pata, aire, H, rw, hc, rt: D / 2 - w - MANO, z0: 2.4 + aire }; }
function macetaDeposito(K) { const { D, Db, w, H } = K;
  let m = cono(Db, D, H).subtract(cono(Db - 2 * w, D - 2 * w, H - 2.4 + 0.02, 2.4));
  m = m.subtract(cubo(-9, 9, D / 2 - w - 3, D / 2 + 2, H - 11, H + 1));                                                 // la boca: por aquí se echa el agua
  return m.subtract(cil(Db + 1, 1, -0.5).subtract(cono(Db - 2, Db + 1, 1, -0.5))); }
function macetaInterior(K) { const { w, rp, rw, rt, hc, hpared, pata } = K, e = 1.8, zt = pata + hc + hpared, ala = w + 1.6 + MANO, cyl = (h, r1, r2, z) => M().cylinder(h, r1, r2, seg(2 * Math.max(r1, r2))).translate([0, 0, z]);
  // (de abajo arriba) pata recta · embudo a 45° · pared con la caída del depósito · ala que apoya en el borde (también a 45°)
  const fuera = cyl(pata, rp, rp, 0).add(cyl(hc, rp, rw, pata - 0.01)).add(cyl(hpared, rw, rt, pata + hc - 0.02)).add(cyl(ala, rt, rt + ala, zt - MANO - 0.02));
  const dentro = cyl(pata + 3, rp - e, rp - e, -0.5).add(cyl(hc, rp - e, rw - e, pata + e * 0.41)).add(cyl(hpared + ala + 2, rw - e, rt - e + (rt - rw) * (ala + 2) / hpared, pata + hc + e * 0.41 - 0.02));
  let m = fuera.subtract(dentro);
  return m.subtract(enRueda(6, 0, () => cubo(rp - e - 1, rp + 1, -1.6, 1.6, 3, pata - 3))); }                           // ranuras de la pata: por aquí entra el agua
function macetaAutorriego(p) { const K = macetaK(p), q = p.que || 'juego';
  if (q === 'deposito') return macetaDeposito(K); if (q === 'interior') return macetaInterior(K);
  if (q === 'prueba') { const top = 14, corte = cubo(-200, 200, -200, 200, 0, 400), zi = K.pata + K.hc + K.hpared - top; return enCama([macetaDeposito(K).intersect(corte.translate([0, 0, K.H - top])).translate([0, 0, -(K.H - top)]), macetaInterior(K).intersect(corte.translate([0, 0, zi])).translate([0, 0, -zi])]); } // los dos BORDES (14 mm): se ve si el macetero entra y apoya
  if (q === 'montado') return macetaDeposito(K).add(macetaInterior(K).translate([0, 0, K.z0]));
  return enCama([macetaDeposito(K), macetaInterior(K)]); }

// (para las pruebas: las piezas sueltas, para comprobar con el ordenador que casan sin tocarse)
export const _PRO = { MANO, DESLIZA, lavaK, lavaVaso, lavaRejilla, lavaTapa, lavaBandeja, roscaV, boteK, boteCuerpo, boteTapa, modulo, colaMacho, colaHembra, COLA, PASO, macetaK, macetaDeposito, macetaInterior };

// ======================= LA LISTA =======================
const QUE = (L) => s('que', 'Qué imprimo', L[0][0], L);
const D = (cat, tambien, e, t, d, uso, color, campos, gen, nota, mas) => Object.assign({ cat, tambien: tambien.concat(['pro']), e, t, d, uso, color, campos, gen, nota, sinSoportes: 'Está diseñado para salir sin soportes: nada sube a más de 45°.' }, mas || {});
export const DISENOS_PRO = {
  lavaPincelesPro: D('hogar', ['oficina', 'ninos', 'organizar', 'regalos'], '🖌️', 'Lava-pinceles PRO por piezas', 'Vaso, rejilla con pomo, tapa que cuelga los pinceles y bandeja-secadero: 4 piezas que encajan', 'funcional', '#00a4e4',
    [QUE([['juego', 'Vaso + rejilla + tapa (una placa)'], ['bandeja', 'La bandeja con secadero (otra placa)'], ['prueba', '🧪 Prueba de encaje (25 min, ~20 g): tres aros'], ['vaso', 'Solo el vaso'], ['rejilla', 'Solo la rejilla'], ['tapa', 'Solo la tapa-soporte'], ['montado', '👀 Verlo montado (solo para mirar)']]),
      n('d', 'Ancho del vaso', 110, 80, 140), n('h', 'Alto del vaso', 95, 70, 130), n('ranuras', 'Ranuras para colgar pinceles', 6, 4, 10, 1, ''), n('posos', 'Hueco para los posos (debajo de la rejilla)', 18, 12, 30)], lavaPincelesPro,
    p => { const K = lavaK(p); return 'CUATRO piezas. ① VASO de ' + n2(K.D) + ' × ' + n2(K.H) + ' mm con un escalón por dentro (llénalo hasta dos dedos del borde: unos ' + Math.round(Math.PI * (K.di / 2) ** 2 * (K.H - 18 - 3) / 1000 / 10) * 10 + ' ml). ② REJILLA: se apoya en el escalón, a ' + n2(K.posos) + ' mm del fondo; frotas el pincel contra sus lomos, la pintura cae DEBAJO y el agua de arriba sigue limpia. Se saca por el pomo, sin mojarte. ③ TAPA-SOPORTE: entra en el borde del vaso y tiene ' + K.k + ' ranuras en V de varios anchos: metes el mango y el pincel queda COLGADO con las cerdas en el agua, sin tocar el fondo (así no se doblan). ④ BANDEJA: el vaso asienta en su aro y al lado hay dos peines para dejar los pinceles tumbados a secar, con la punta en el aire. Holguras: rejilla y tapa llevan ' + n2(MANO) + ' y ' + n2(MANO - 0.05) + ' mm por lado (entran y salen con la mano). 🧪 Imprime primero la PRUEBA (tres aros: el del vaso con su escalón, el de la rejilla y el de la tapa; unos 20 g): la rejilla tiene que caer sola y apoyar en el escalón, y la tapa entrar en el borde sin apretar ni bailar. Si ahí casa, casa entero. ⚠️ Para que no rezume: PETG, 4 paredes y 5 capas de fondo; llénalo una hora sobre un papel antes de fiarte.'; },
    { busca: 'lava limpia pinceles brochas agua acuarela pintura lavador por piezas pro', nuevo: true, manual: p => { const K = lavaK(p); return { vistas: [['montado', 'Así queda montado'], ['juego', 'Vaso, rejilla con pomo y tapa-soporte']],
      piezas: [['Vaso', 1, n2(K.D) + ' × ' + n2(K.H) + ' mm, con un escalón por dentro'], ['Rejilla con pomo', 1, 'se apoya en el escalón'], ['Tapa-soporte', 1, K.k + ' ranuras en V para colgar los pinceles'], ['Bandeja con secadero', 1, 'el vaso asienta en su aro']],
      pasos: ['Pon el VASO dentro del aro de la BANDEJA.', 'Deja caer la REJILLA dentro del vaso, con el pomo hacia arriba: baja sola hasta apoyarse en el escalón.', 'Llena el vaso de agua hasta dos dedos del borde.', 'Coloca la TAPA-SOPORTE sobre el borde del vaso (la falda por fuera): entra sin apretar.', 'Para lavar un pincel, frótalo suave contra los lomos de la rejilla: la pintura cae debajo y el agua de arriba sigue limpia.', 'Para dejarlo en remojo, mete el mango en una de las ranuras en V de la tapa hasta que se quede sujeto: las cerdas quedan en el agua, sin tocar el fondo.', 'Para secar, deja los pinceles tumbados sobre los dos peines de la bandeja, con la punta en el aire.'],
      consejos: ['Cada ranura tiene un ancho: usa la que sujete tu pincel sin forzarlo.', 'Para vaciarlo, saca la rejilla por el pomo y vuelca el agua: los posos salen con ella.'], cuidados: ['Lávalo con agua templada y jabón. No lo metas en el lavavajillas ni uses agua muy caliente (el plástico se deforma a 55–60 °C).', 'No es para disolventes fuertes (acetona, aguarrás puro): sí para agua, acuarela, acrílico y témpera.'] }; } }),
  boteRosca: D('hogar', ['organizar', 'cocina', 'regalos', 'herramientas'], '🫙', 'Bote con tapa de rosca', 'Rosca impresa de verdad, con estrías para agarrarla', 'funcional', '#f4f4f0',
    [QUE([['juego', 'Bote + tapa'], ['prueba', '🧪 Prueba de la rosca (20 min): el cuello + la tapa'], ['cuerpo', 'Solo el bote'], ['tapa', 'Solo la tapa'], ['montado', '👀 Verlo cerrado (solo para mirar)']]),
      n('d', 'Diámetro', 70, 36, 120), n('h', 'Alto total', 80, 30, 160), n('holgura', 'Holgura de la rosca (por lado)', 0.25, 0.1, 0.5, 0.05)], boteRosca,
    p => { const K = boteK(p); return 'Bote de ' + n2(K.D) + ' mm con boca de ' + n2(K.bore) + ' mm y ROSCA en V de paso 3 (3 vueltas y media, flancos a 45°: sale limpia sin soportes): se cierra con una vuelta larga y no se pasa de rosca. La tapa tiene estrías y asienta sobre el hombro del bote. Holgura de la rosca: ' + n2(K.hol) + ' mm por lado (con 0,25 gira suave; si tu impresora deja las piezas gordas, sube a 0,30). 🧪 La PRUEBA es el cuello solo con su tapa: si rosca bien ahí, imprime el bote entero. Sin soportes las dos piezas (la tapa se imprime boca arriba). Para cosas secas: botones, tornillos, abalorios, especias… No es estanco al agua.'; },
    { busca: 'bote tarro frasco rosca tapa roscada especias tornillos abalorios', nuevo: true, manual: p => { const K = boteK(p); return { piezas: [['Bote', 1, n2(K.D) + ' mm de ancho, boca de ' + n2(K.bore) + ' mm'], ['Tapa de rosca', 1, 'con estrías']],
      pasos: ['Apoya la tapa sobre la boca del bote, bien plana.', 'Gírala hacia la IZQUIERDA un poco, hasta notar un «clac» pequeño: ahí empieza la rosca.', 'Ahora gira hacia la DERECHA sin apretar: con una vuelta larga queda cerrado. No hace falta forzar.'],
      consejos: ['Si la primera vez va algo dura, ábrela y ciérrala tres o cuatro veces: la rosca se asienta.'], cuidados: ['Para cosas secas (botones, tornillos, abalorios, especias). No es estanco al agua.', 'Lávalo a mano con agua templada; nada de lavavajillas.'] }; } }),
  escritorioModular: D('oficina', ['organizar', 'hogar', 'regalos'], '🧩', 'Escritorio modular (se enganchan)', 'Módulos con colas de milano: cubilete, bandeja, notas, móvil… se unen como quieras', 'funcional', '#1b1b1d',
    [QUE([['cubilete', 'Cubilete (80 × 80 × 82)'], ['alto', 'Cubilete alto para reglas y tijeras (105)'], ['bandeja', 'Bandeja de dos huecos (160 × 80)'], ['notas', 'Taco de notas adhesivas (76 × 76)'], ['movil', 'Atril para el móvil'], ['prueba', '🧪 Prueba de la cola de milano (15 min): dos taquitos'], ['montado', '👀 Ver un escritorio montado (solo para mirar)']]),
      n('holgura', 'Holgura de la cola (por lado)', 0.15, 0.08, 0.4, 0.01)], escritorioModular,
    p => 'Cada módulo lleva COLAS DE MILANO de 22 mm de alto: macho a la derecha y detrás, hembra a la izquierda y delante (paso de 80 mm, así que todos casan con todos, también la bandeja doble). Se enganchan BAJANDO uno junto al otro y ya no se separan al mover la mesa; para soltarlos, se sube uno. Holgura: ' + n2(lim(p.holgura, 0.08, 0.4)) + ' mm por lado (tu «desliza» es 0,15). 🧪 Imprime primero los dos taquitos de PRUEBA: tienen que entrar con los dedos y no bailar; si aprieta, sube a 0,20. Cada módulo es una placa, sin soportes (la cola va de pie). Queda muy bien con cada módulo de un color.',
    { busca: 'escritorio modular organizador mesa cubilete lapicero bandeja notas movil cola de milano encaja engancha', nuevo: true, manual: () => ({ vistas: [['montado', 'Un escritorio de cinco módulos'], ['cubilete', 'Un módulo: macho a la derecha y detrás, hembra a la izquierda y delante']],
      piezas: [['Módulos', 'los que hayas elegido', 'cubilete, cubilete alto, bandeja doble, taco de notas, atril de móvil']],
      pasos: ['Decide el dibujo de tu escritorio sobre la mesa: todos los módulos casan con todos (también la bandeja doble).', 'Deja en la mesa el primer módulo.', 'Coge el siguiente, súbelo un poco y bájalo JUNTO al primero, haciendo que la cola (el saliente) entre por arriba en la ranura del otro.', 'Empuja hacia abajo hasta que los dos toquen la mesa: ya no se separan al mover el conjunto.', 'Repite con los demás. Para cambiar el dibujo, sube un módulo y sácalo.'],
      consejos: ['Si uno entra muy justo la primera vez, mételo y sácalo un par de veces.', 'Queda muy bien con cada módulo de un color.'], cuidados: ['Se limpia con un paño húmedo.'] }) }),
  macetaAutorriego: D('hogar', ['flores', 'regalos', 'jardin'], '🪴', 'Maceta con autorriego', 'Macetero con mecha y depósito de agua: la planta bebe sola', 'funcional', '#f4f4f0',
    [QUE([['juego', 'Depósito + macetero'], ['prueba', '🧪 Prueba de encaje (15 min): los dos bordes'], ['deposito', 'Solo el depósito (fuera)'], ['interior', 'Solo el macetero (dentro)'], ['montado', '👀 Verla montada (solo para mirar)']]),
      n('d', 'Diámetro de arriba', 120, 80, 180), n('alto', 'Alto de la parte recta del macetero', 30, 15, 90), n('agua', 'Alto del depósito de agua', 34, 20, 60)], macetaAutorriego,
    p => { const K = macetaK(p); return 'DOS piezas. El MACETERO acaba en un embudo y una pata hueca con ranuras que queda dentro del agua: llenas TODO de tierra (también la pata) y la tierra de la pata hace de mecha. El DEPÓSITO (' + n2(K.D) + ' mm de boca, ' + n2(K.H) + ' de alto) guarda unos ' + Math.round((Math.PI * (K.Db / 2 - K.w + 2) ** 2 - Math.PI * K.rp ** 2) * K.agua / 1000 / 10) * 10 + ' ml: una planta pequeña bebe sola de 1 a 2 semanas. El agua se echa por la BOCA del borde, sin sacar nada, y por ahí se ve por dónde va. El macetero cuelga del borde por su ala y lleva ' + n2(MANO) + ' mm de holgura por lado (entra y sale con la mano). 🧪 La PRUEBA son los dos bordes (14 mm): si el macetero entra y apoya, imprime el juego. Sin soportes: todo sube a 45° como mucho. En PETG aguanta el agua y el sol; en PLA, solo dentro de casa.'; },
    { busca: 'maceta macetero autorriego riego planta deposito agua suculenta', nuevo: true, manual: p => { const K = macetaK(p); return { piezas: [['Depósito (la pieza de fuera)', 1, n2(K.D) + ' mm de boca, con una muesca para echar el agua'], ['Macetero (la pieza de dentro)', 1, 'acaba en embudo y en una pata con ranuras']],
      pasos: ['Llena el MACETERO de tierra empezando por la PATA: apriétala un poco con el dedo para que quede bien llena (esa tierra es la mecha que sube el agua).', 'Planta tu planta y termina de llenar.', 'Mete el macetero en el DEPÓSITO: cuelga del borde por su ala.', 'Riega la primera vez POR ARRIBA, para que la tierra se asiente y la mecha se moje.', 'Después, echa el agua por la MUESCA del borde hasta que la veas llegar a un dedo del macetero. La planta beberá sola una o dos semanas.'],
      consejos: ['Mira por la muesca: cuando no se vea agua, toca rellenar.', 'Para plantas que quieren poca agua (cactus, suculentas), llena el depósito solo hasta la mitad y déjalo secar entre riegos.'], cuidados: ['Cada dos o tres meses saca el macetero y enjuaga el depósito.', 'Impresa en PLA es para dentro de casa; en PETG aguanta el sol y el exterior.'] }; } }),
};
