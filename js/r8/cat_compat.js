// ================= 17-10-2026 · 🔧 REPUESTOS Y COMPATIBLES (profesionales, con medidas de verdad) =================
// Ella: «haz producto de verdad… más cosas profesionales, más repuestos de cosas compatibles; busca, infórmate, tómate tu tiempo, no
// falles». Lo que más se vende en Cults y MakerWorld de lo «que sirve»: sistemas abiertos que la gente ya tiene en casa.
// Medidas sacadas de sus fuentes (17-10-2026) — diseño PROPIO, nada copiado:
//  · GRIDFINITY (estándar abierto de Zack Freedman, licencia MIT): rejilla de 42 mm, unidades de 7 mm de alto, la caja mide
//    42·n − 0,5; el pie, desde abajo: 0,8 a 45° + 1,8 recto + 2,15 a 45° (35,6 → 41,5 mm, esquina de 3,75); imanes Ø6,5 × 2,4 a 8 mm
//    del borde de cada casilla; labio de apilar ≈ 4,4 mm (0,7 a 45° + 1,8 + 1,9 a 45°). (gridfinity-rebuilt-openscad, standard.scad)
//  · IKEA SKÅDIS: ranuras de 5 × 15 mm cada 40 mm (filas desplazadas 20 y 20), tablero de 5 mm. Gancho de 4,3 mm de grueso con uña
//    de 4,5 mm (los paramétricos de la comunidad que encajan sin baile). Entra por arriba de la ranura, se empuja y cae: la uña
//    queda detrás del tablero.
//  · GOPRO (lado del soporte, 3 dedos): dedos de 3,0 mm, huecos de 3,15, tornillo M5 (agujero 5,2). Rosca de trípode 1/4"-20 con
//    su tuerca (11,1 mm entre caras, 5,6 de grueso) metida por un lado.
//  · ASPIRADORA: lo más común, tubos de 35 mm por fuera y accesorios de 32 mm por dentro, pero cada marca varía: se mide y se escribe.
//  · BALDAS: tetón de Ø5 mm (el de casi todos los muebles de tablero; también 6 y 6,35).
// Todo se imprime sin soportes (se dice la postura) y lo que tiene que encajar lleva su KIT DE PRUEBA pequeño (memoria: «no me hagas
// nada que luego no encaje»).
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(128, Math.round(d * 1.6 + 24)));
const rr = (w, h, r = 0) => { const S = CS().square([Math.max(0.02, w - 2 * r), Math.max(0.02, h - 2 * r)], true); return r > 0.05 ? S.offset(r, 'Round', 2, seg(2 * r)) : S; };
const prisma = (w, d, r, z0, z1, x = 0, y = 0) => rr(w, d, Math.max(0, Math.min(r, w / 2 - 0.01, d / 2 - 0.01))).extrude(z1 - z0).translate([x, y, z0]);
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cil = (d, z0, z1, x = 0, y = 0, d2) => M().cylinder(z1 - z0, d / 2, (d2 == null ? d : d2) / 2, seg(Math.max(d, d2 || 0))).translate([x, y, z0]);
const cilX = (d, x0, x1, y = 0, z = 0) => M().cylinder(x1 - x0, d / 2, d / 2, seg(d)).rotate([0, 90, 0]).translate([x0, y, z]);
// un perfil en el plano (y, z) estirado a lo largo de X (de x0 a x1)
const perfilX = (pts, x0, x1) => N.cs([N.ccw(pts)], 'Positive').extrude(x1 - x0).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1]);
// escalones redondeados: L = [[z, ancho, fondo, radio], …] → unión de los troncos entre cada dos
const escalones = L => N.union(L.slice(1).map((b, i) => { const a = L[i]; return M().hull([prisma(a[1], a[2], a[3], a[0], a[0] + 0.001), prisma(b[1], b[2], b[3], b[0] - 0.001, b[0])]); }));
const enFila = (L, sep = 6, ancho = 230) => { let x = 0, y = 0, alto = 0; return N.union(L.map(m => { const b = N.caja(m); if (x > 0 && x + b.dims[0] > ancho) { x = 0; y += alto + sep; alto = 0; } const o = m.translate([x - b.min[0], y - b.min[1], -b.min[2]]); x += b.dims[0] + sep; alto = Math.max(alto, b.dims[1]); return o; })); };
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');

// ======================= 🧱 GRIDFINITY PRO =======================
export const GF = { paso: 42, ud: 7, hol: 0.5, r: 3.75, pie: 4.75, pared: 1.2, suelo: 6.0, iman: [6.5, 2.4], desdeBorde: 8, labio: 4.3 }; // (labio de 4,3: arriba deja un borde de 0,1 y la caja de encima asienta en su chaflán)
export function gfMedidas(p) { const ux = Math.round(p.ux), uy = Math.round(p.uy), W = GF.paso * ux - GF.hol, D = GF.paso * uy - GF.hol, H = GF.ud * Math.round(p.uz); return { ux, uy, W, D, H }; }
// el pie de UNA casilla (centrado), con imanes / tornillos
function gfPie(p) {
  let f = escalones([[0, 35.6, 35.6, 0.8], [0.8, 37.2, 37.2, 1.6], [2.6, 37.2, 37.2, 1.6], [GF.pie, 41.5, 41.5, GF.r]]);
  const o = 21 - GF.desdeBorde;
  if (p.imanes) [[-o, -o], [o, -o], [o, o], [-o, o]].forEach(([a, b]) => { f = f.subtract(cil(GF.iman[0], -0.01, GF.iman[1], a, b)); });
  if (p.tornillos) [[-o, -o], [o, -o], [o, o], [-o, o]].forEach(([a, b]) => { f = f.subtract(cil(3.0, p.imanes ? GF.iman[1] + 0.2 : -0.01, 6, a, b)); });
  return f;
}
export function gridfinityPro(p, soloCuerpo) {
  const { ux, uy, W, D, H } = gfMedidas(p), pr = GF.pared, sf = GF.suelo, labio = p.labio !== false;
  const pie = gfPie(p), L = [];
  for (let i = 0; i < ux; i++) for (let j = 0; j < uy; j++) L.push(pie.translate([-GF.paso * ux / 2 + 21 + GF.paso * i, -GF.paso * uy / 2 + 21 + GF.paso * j, 0]));
  let m = N.union(L).add(prisma(W, D, GF.r, GF.pie - 0.01, H + (labio ? GF.labio : 0)));
  // el hueco: paredes de 1,2; arriba, el LABIO (el hueco que recibe los pies de la caja de encima) con su chaflán de 45° por debajo
  const Wi = W - 2 * pr, Di = D - 2 * pr, ri = GF.r - pr;
  let hueco = prisma(Wi, Di, ri, sf, labio ? H - 1.7 : H + 1);
  // (el labio es el negativo del pie, de abajo arriba: 0,7 a 45° + 1,8 recto + 1,9 a 45°, con 0,25 de aire: lo mismo que la base)
  if (labio) hueco = hueco.add(escalones([[H - 1.7, Wi, Di, ri], [H, W - 5.2, D - 5.2, GF.r - 2.6], [H + 0.7, W - 3.8, D - 3.8, GF.r - 1.9], [H + 2.5, W - 3.8, D - 3.8, GF.r - 1.9], [H + GF.labio + 0.01, W - 0.18, D - 0.18, GF.r - 0.09]]));
  // separadores (no llegan al labio: la caja de encima entra hasta H)
  const tope = labio ? H - 1.7 : H, sep = [];
  for (let k = 1; k <= Math.round(p.divx || 0); k++) sep.push(cubo(-Wi / 2 + Wi * k / (Math.round(p.divx) + 1) - 0.6, -Wi / 2 + Wi * k / (Math.round(p.divx) + 1) + 0.6, -Di / 2, Di / 2, sf - 0.01, tope));
  for (let k = 1; k <= Math.round(p.divy || 0); k++) sep.push(cubo(-Wi / 2, Wi / 2, -Di / 2 + Di * k / (Math.round(p.divy) + 1) - 0.6, -Di / 2 + Di * k / (Math.round(p.divy) + 1) + 0.6, sf - 0.01, tope));
  if (sep.length) hueco = hueco.subtract(N.union(sep));
  m = m.subtract(hueco);
  if (soloCuerpo) return m;
  // la CUCHARA: el canto de delante, por dentro, redondeado (lo pequeño se saca con un dedo) — en cada fila de compartimentos
  const nfy = Math.round(p.divy || 0) + 1, R = Math.min(9, Di / nfy / 3, (tope - sf) * 0.8);
  if (p.cuchara && R > 2) for (let j = 0; j < nfy; j++) { const y0 = -Di / 2 + Di * j / nfy + (j ? 0.6 : 0);
    m = m.add(cubo(-Wi / 2, Wi / 2, y0 - 0.01, y0 + R, sf - 0.01, sf + R).subtract(cilX(2 * R, -Wi / 2 - 1, Wi / 2 + 1, y0 + R, sf + R))); }
  // la ETIQUETA: repisa a 45° pegada a la pared de detrás (sin soportes), justo por debajo del labio
  if (p.etiqueta) { const an = Math.min(12, Di / nfy * 0.6); m = m.add(M().hull([cubo(-Wi / 2, Wi / 2, Di / 2 - an, Di / 2 + 0.01, tope - 1.2, tope), cubo(-Wi / 2, Wi / 2, Di / 2 - 0.5, Di / 2 + 0.01, tope - 1.2 - an, tope)])); }
  return m;
}
// porta-puntas de destornillador (hexágono 1/4" = 6,35 entre caras + 0,3 de aire) dentro de una caja Gridfinity
export function gridfinityPuntas(p) {
  const P = Object.assign({}, p, { labio: true, divx: 0, divy: 0, cuchara: false, etiqueta: false });
  let m = gridfinityPro(P, true); const { W, D, H } = gfMedidas(P), Wi = W - 2 * GF.pared, Di = D - 2 * GF.pared, top = H - 1.7;
  let bloque = prisma(Wi + 0.02, Di + 0.02, GF.r - GF.pared, GF.suelo - 0.01, top);
  const hx = (6.35 + 0.3) / Math.cos(Math.PI / 6), paso = Math.max(8.5, Number(p.paso) || 9.5), hondo = Math.min(top - GF.suelo - 1.2, 14), H2 = [];
  const nx = Math.floor((Wi - 4) / paso), ny = Math.floor((Di - 4) / (paso * 0.866));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx - (j % 2 ? 1 : 0); i++) {
    const x = -((nx - 1) * paso) / 2 + i * paso + (j % 2 ? paso / 2 : 0), y = -((ny - 1) * paso * 0.866) / 2 + j * paso * 0.866;
    H2.push(N.cs([N.poligono2(6, hx, 0)], 'Positive').extrude(hondo + 1).translate([x, y, top - hondo]));
  }
  if (H2.length) bloque = bloque.subtract(N.union(H2));
  return { m: m.add(bloque), n: H2.length, hondo };
}
export function gridfinityBasePro(p) {
  const ux = Math.round(p.ux), uy = Math.round(p.uy), w = GF.paso * ux, d = GF.paso * uy, Hb = 4.65;
  let m = prisma(w, d, 4, 0, Hb);
  // el perfil de la base, de ABAJO arriba: 0,7 a 45° + 1,8 recto + 2,15 a 45° (36,3 → 37,7 → 42): el negativo del pie con 0,25 de aire
  // (17-10-2026: la «Base Gridfinity» antigua del catálogo lo tenía al revés —el chaflán grande abajo— y las cajas no asentaban)
  const hueco = escalones([[-0.01, 36.3 - 0.01, 36.3 - 0.01, 1.15], [0.7, 37.7, 37.7, 1.85], [2.5, 37.7, 37.7, 1.85], [Hb + 0.01, 42.01, 42.01, 4]]), L = [];
  for (let i = 0; i < ux; i++) for (let j = 0; j < uy; j++) L.push(hueco.translate([-w / 2 + 21 + GF.paso * i, -d / 2 + 21 + GF.paso * j, 0]));
  m = m.subtract(N.union(L));
  return m;
}

// ======================= 🪝 IKEA SKÅDIS =======================
export const SK = { ancho: 4.3, tablero: 5, aire: 0.4, una: 4.5, uñaG: 2.5, cuello: 5.5, ranura: [5, 15], paso: 40 };
// el gancho que entra en la ranura, en el plano (y, z): y = hacia el tablero (0 = cara de delante), z = arriba (0 = fondo de la ranura)
export const skCuelloPts = () => { const yB = SK.tablero + SK.aire, y1 = yB + SK.uñaG;
  return [[-0.01, 0], [yB, 0], [yB, -SK.una + 0.8], [yB + 0.8, -SK.una], [y1, -SK.una], [y1, SK.cuello], [-0.01, SK.cuello]]; }; // (la uña con su chaflán: entra mejor)
// 🪝 gancho de una pieza (se imprime DE LADO: el grosor es lo que va de pie)
export function skadisGancho(p) {
  const g = Math.max(SK.ancho, Number(p.grueso) || 6), Lb = p.brazo, Ht = p.punta, Hp = 32, e = 5;
  // la placa de delante (de z = −Hp+5 a z = cuello+3), el brazo hacia fuera abajo y la punta hacia arriba (redondeada)
  const placa = [[-e, SK.cuello + 3], [-e, -Hp + 5], [-0.01, -Hp + 5], [-0.01, SK.cuello + 3]];
  const zb = -Hp + 5, brazo = [[-e - 0.01, zb + e], [-e - Lb, zb + e], [-e - Lb, zb], [-e - 0.01, zb]];
  const punta = [[-e - Lb, zb], [-e - Lb + e, zb], [-e - Lb + e, zb + e + Ht], [-e - Lb, zb + e + Ht]];
  let m = N.union([perfilX(placa, 0, g), perfilX(brazo, 0, g), perfilX(punta, 0, g), perfilX(skCuelloPts(), 0, SK.ancho)]);
  if (p.doble) m = m.add(perfilX([[-e - Lb * 0.55, zb], [-e - Lb * 0.55 + e, zb], [-e - Lb * 0.55 + e, zb + e + Ht * 0.6], [-e - Lb * 0.55, zb + e + Ht * 0.6]], 0, g));
  // el canto del brazo, por dentro, redondeado (aguanta más): un refuerzo a 45° entre placa y brazo
  m = m.add(perfilX([[-e + 0.01, zb + e], [-e - 8, zb + e], [-e + 0.01, zb + e + 8]], 0, g));
  return m;
}
// el CLIP suelto (para baldas y portaherramientas): cuello + uña detrás; delante, una espiga de 4,3 × 10 × 6 que entra a presión
export const SKCLIP = { esp: [SK.ancho, 10, 4.5] }; // (la espiga entra 4,7 en una espalda de 6 mm)
export function skadisClip() { const [a, h, l] = SKCLIP.esp; return perfilX(skCuelloPts(), 0, a).add(perfilX([[0.01, SK.cuello], [0.01, SK.cuello - h], [-l, SK.cuello - h], [-l, SK.cuello]], 0, a)); }
// el agujero de la espiga en la pieza (con su holgura «a presión»)
const huecoClip = (x, z) => { const [a, h, l] = SKCLIP.esp, g = ENCAJES.presion; return cubo(x - g, x + a + g, -l - 0.2, 0.01, z - h - g, z + g); };
// 🧺 balda con borde (se imprime con la espalda en la cama: la balda sube de pie; el borde, a 45°)
export function skadisBalda(p) {
  const nC = Math.max(2, Math.round(p.ancho / SK.paso)), W = nC * SK.paso - 2, Hb = 34, e = 6, F = p.fondo, eb = 3;
  // espalda (y de −e a 0), z de −Hb a +SK.cuello+4; balda (z de −Hb a −Hb+eb), y de −e−F a −e; borde delante a 45°
  let m = cubo(-W / 2, W / 2, -e, 0, -Hb, SK.cuello + 4).add(cubo(-W / 2, W / 2, -e - F, -e + 0.01, -Hb, -Hb + eb)).add(perfilX([[-e - F, -Hb + eb - 0.01], [-e - F + 6, -Hb + eb - 0.01], [-e - F, -Hb + eb + 6]], -W / 2, W / 2));
  const k = Math.min(nC, 3), pasoC = Math.max(1, Math.floor((nC - 1) / (k - 1))), xs = Array.from({ length: k }, (_, i) => (i - (k - 1) / 2) * SK.paso * pasoC); // (siempre a múltiplos de 40: las ranuras de una fila)
  xs.forEach(x => { m = m.subtract(huecoClip(x - SK.ancho / 2, SK.cuello)); });
  if (p.agujeros) { const L = []; for (let x = -W / 2 + 10; x < W / 2 - 5; x += 14) L.push(cil(8, -Hb - 1, -Hb + eb + 1, x, -e - F / 2)); m = m.subtract(N.union(L)); } // (para que caiga el agua o el polvo)
  return { m, clips: xs.length };
}
// 🔧 portaherramientas: una regleta con agujeros (destornilladores, alicates por las asas, rotuladores)
export function skadisPorta(p) {
  const nC = Math.max(2, Math.round(p.ancho / SK.paso)), W = nC * SK.paso - 2, Hb = 30, e = 6, F = p.agujero + 10, eb = 6, d = p.agujero;
  let m = cubo(-W / 2, W / 2, -e, 0, -Hb, SK.cuello + 4).add(cubo(-W / 2, W / 2, -e - F, -e + 0.01, -Hb, -Hb + eb)).add(perfilX([[-e + 0.01, -Hb + eb - 0.01], [-e - F * 0.6, -Hb + eb - 0.01], [-e + 0.01, -Hb + eb + F * 0.6]], -W / 2 + 0.01, -W / 2 + 4)).add(perfilX([[-e + 0.01, -Hb + eb - 0.01], [-e - F * 0.6, -Hb + eb - 0.01], [-e + 0.01, -Hb + eb + F * 0.6]], W / 2 - 4, W / 2 - 0.01));
  const nA = Math.max(1, Math.floor((W - 6) / (d + 5))), sepA = (W - 6) / nA, A = [];
  for (let i = 0; i < nA; i++) A.push(cil(d, -Hb - 1, -Hb + eb + 1, -W / 2 + 3 + sepA * (i + 0.5), -e - F / 2 - 1));
  m = m.subtract(N.union(A));
  const xs = [-SK.paso / 2, SK.paso / 2].map(x => x * Math.floor(nC / 2)); xs.forEach(x => { m = m.subtract(huecoClip(x - SK.ancho / 2, SK.cuello)); });
  return { m, clips: 2, agujeros: nA };
}

// ======================= 📷 GOPRO =======================
export const GP = { dedo: 3.0, hueco: 3.15, m5: 5.2, alto: 9.5, rFin: 7.5, tuerca: 11.1, tuercaG: 5.6, rosca: 6.6 };
// los dedos (n = 2 o 3): salen de una cara (z = zCara) hacia arriba (dir = 1) o hacia abajo (dir = −1). El agujero del M5 queda a
// 9,5 mm de la cara: los dedos de la otra pieza (radio 7,5) giran sin tocarla. Grosor de los dedos a lo largo de X, ancho de 15 en Y.
export function goproDedos(nDedos, zCara, dir = 1) {
  const tot = nDedos * GP.dedo + (nDedos - 1) * GP.hueco, zH = zCara + dir * GP.alto, L = [];
  for (let i = 0; i < nDedos; i++) { const x0 = -tot / 2 + i * (GP.dedo + GP.hueco);
    L.push(M().hull([cubo(x0, x0 + GP.dedo, -GP.rFin, GP.rFin, dir > 0 ? zCara - 0.01 : zCara - 1, dir > 0 ? zCara + 1 : zCara + 0.01), cilX(2 * GP.rFin, x0, x0 + GP.dedo, 0, zH)])); }
  return N.union(L).subtract(cilX(GP.m5, -tot, tot, 0, zH));
}
// adaptador a trípode: base con la tuerca de 1/4" metida por un lado y 3 dedos encima (se imprime así, de pie)
export function goproTripode() {
  const B = 26, hB = 12, zT = 2.2, ef = GP.tuerca + 0.3;
  let m = prisma(B, B, 4, 0, hB).add(goproDedos(3, hB, 1));
  m = m.subtract(cil(GP.rosca, -1, zT + GP.tuercaG + 0.6)); // el paso del tornillo del trípode
  const hx = N.cs([N.poligono2(6, ef / Math.cos(Math.PI / 6), 90)], 'Positive'); // la tuerca: dos caras paralelas a la ranura (entra de lado)
  m = m.subtract(hx.extrude(GP.tuercaG + 0.3).translate([0, 0, zT])).subtract(cubo(-ef / 2, ef / 2, 0, B, zT, zT + GP.tuercaG + 0.3));
  return m;
}
// brazo de extensión: 3 dedos en un extremo y 2 en el otro; se imprime TUMBADO (los dedos de canto, de pie: sin soportes)
export function goproBrazo(p) { const L = Math.max(20, p.largo); return cubo(-7.5, 7.5, -GP.rFin, GP.rFin, 0, L).add(goproDedos(3, 0, -1)).add(goproDedos(2, L, 1)); }

// ======================= 🧹 ADAPTADOR DE ASPIRADORA =======================
// un lado ENTRA en el accesorio (tu medida de su agujero, por dentro) y el otro ABRAZA el tubo (su medida por fuera). Cónicos 1°: encajan apretando.
export function aspiradora(p) {
  const a = p.accesorio, t = p.tubo, L = 32, g = 2.4, k = 2 * L * Math.tan(Math.PI / 180);
  const dM1 = a + 0.2, dM0 = dM1 - k; // el lado que ENTRA en el accesorio: punta (abajo, más fina) y raíz (aprieta al meterlo)
  const dH1 = t + 0.5, dH0 = dH1 - k; // el lado que ABRAZA el tubo: boca (arriba) y fondo (más estrecho: aprieta)
  const bore = Math.max(6, Math.min(dM0 - 2 * g, dH0 - 3)), crece = Math.max(0, (dH0 - bore) / 2), z2 = L + Math.max(12, crece + 4), zt = z2 + L;
  const fuera = N.union([cil(dM0, 0, L, 0, 0, dM1), M().hull([cil(dM1, L - 0.01, L), cil(dH1 + 2 * g, z2, z2 + 0.01)]), cil(dH1 + 2 * g, z2, zt)]);
  const dentro = N.union([cil(bore, -1, z2 + 1.5 - crece), M().hull([cil(bore, z2 + 1.5 - crece - 0.01, z2 + 1.5 - crece), cil(dH0, z2 + 1.5, z2 + 1.51)]), cil(dH0, z2 + 1.5, zt + 1, 0, 0, dH1 + k / L)]); // (el escalón de dentro a 45°)
  return fuera.subtract(dentro);
}

// ======================= 📚 SOPORTE DE BALDA (tetón) y 🚪 GANCHO DE PUERTA =======================
export function soporteBalda(p) { // escuadra: placa contra el lateral del mueble con su tetón y, ARRIBA, la pestaña donde apoya la balda
  const d = p.teton - 0.1, a = 16, e = 3.5, g = 10, zP = (a - e) / 2 + 0.5;
  let m = perfilX([[0, 0], [e, 0], [e, a - e], [a, a - e], [a, a], [0, a]], -g / 2, g / 2); // (y = hacia dentro del mueble, z = arriba)
  m = m.add(perfilX([[e - 0.01, a - e + 0.01], [e - 0.01, a - e - 6], [e + 6, a - e + 0.01]], -g / 2, g / 2)); // el nervio de debajo de la pestaña
  const xT = -g / 2 + d / 2 - 0.4; // (el tetón pegado a la cara que va en la cama, con un plano de 0,4: se imprime de lado sin soportes)
  const teton = M().cylinder(8, d / 2, d / 2, seg(d)).rotate([90, 0, 0]).translate([xT, 0.01, zP]).intersect(cubo(-g / 2, g / 2, -9, 1, -1, a + 1));
  return m.add(teton);
}
export function ganchoPuerta(p) { // perfil en (y, z): la puerta es y ∈ [0, T], su canto de arriba en z = 0; el gancho cuelga por delante (y < 0)
  const T = p.puerta + 0.8, e = 3.2, w = p.ancho, Ld = 22, Lb = p.caida, Ht = p.punta;
  const pts = [[-e, e], [T + e, e], [T + e, -Ld], [T, -Ld], [T, 0], [0, 0], [0, -Lb - e], [-e - Ht, -Lb - e], [-e - Ht, -Lb + Ht * 0.6], [-Ht, -Lb + Ht * 0.6], [-Ht, -Lb], [-e, -Lb]];
  return perfilX(pts, -w / 2, w / 2);
}
// de lado para imprimir (lo estirado a lo largo de X, de pie)
const deLado = m => N.aLaCama(m.rotate([0, -90, 0]));

// ======================= el catálogo =======================
const POSTURA = { lado: 'Se imprime DE LADO (como sale en la cama): el gancho queda en el plano de la cama, fuerte y sin soportes.' };
export const DISENOS_COMPAT = {
  gridfinityPro: { cat: 'compatibles', tambien: ['organizar', 'oficina'], e: '🧱', t: 'Gridfinity PRO (con labio para apilar)', d: 'Estándar Gridfinity de verdad: pie oficial, labio para apilar, cuchara, etiqueta, separadores e imanes', uso: 'funcional', color: '#2a9d8f', nuevo: true,
    campos: [n('ux', 'Casillas a lo ancho', 2, 1, 6, 1, ''), n('uy', 'Casillas a lo largo', 1, 1, 5, 1, ''), n('uz', 'Alto (unidades de 7 mm)', 6, 2, 14, 1, ''), n('divx', 'Separadores a lo ancho', 1, 0, 6, 1, ''), n('divy', 'Separadores a lo largo', 0, 0, 4, 1, ''), c('labio', 'Labio para apilar', true), c('cuchara', 'Cuchara (canto redondeado delante)', true), c('etiqueta', 'Repisa para etiqueta', true), c('imanes', 'Huecos para imanes 6 × 2 mm', false), c('tornillos', 'Agujeros para tornillo M3', false)],
    gen: p => gridfinityPro(p), nota: p => { const Q = gfMedidas(p); return 'Mide ' + n1(Q.W) + ' × ' + n1(Q.D) + ' × ' + n1(Q.H + (p.labio !== false ? GF.labio : 0)) + ' mm. Medidas del estándar abierto Gridfinity (licencia MIT: se puede vender lo que diseñes): rejilla de 42, la caja 0,5 más pequeña, pie de 0,8 + 1,8 + 2,15 mm, imanes Ø6 × 2 a 8 mm del borde. Se imprime tal cual, sin soportes (la repisa de la etiqueta y el labio van a 45°). Imprime una de 1 × 1 y pruébala en tu base antes de hacer muchas.'; } },
  gridfinityPuntas: { cat: 'compatibles', tambien: ['organizar', 'oficina'], e: '🪛', t: 'Gridfinity porta-puntas de destornillador', d: 'Puntas de 1/4" (hexágono de 6,35 mm) de pie, en tresbolillo, dentro de una caja Gridfinity', uso: 'funcional', color: '#e76f51', nuevo: true,
    campos: [n('ux', 'Casillas a lo ancho', 1, 1, 4, 1, ''), n('uy', 'Casillas a lo largo', 1, 1, 3, 1, ''), n('uz', 'Alto (unidades de 7 mm)', 3, 3, 6, 1, ''), n('paso', 'Separación entre puntas', 9.5, 8.5, 14, 0.5), c('imanes', 'Huecos para imanes 6 × 2 mm', false)],
    gen: p => gridfinityPuntas(p).m, nota: p => { const R = gridfinityPuntas(p); N.limpia(); return 'Caben ' + R.n + ' puntas de 1/4" (las normales de atornillador), metidas ' + n1(R.hondo) + ' mm. Agujero hexagonal de 6,65 mm entre caras (6,35 + 0,3 de aire): entran con la mano y no se caen. Sin soportes.'; } },
  gridfinityBasePro: { cat: 'compatibles', tambien: ['organizar'], e: '▦', t: 'Base Gridfinity (para el cajón)', d: 'La rejilla donde encajan las cajas: perfil oficial', uso: 'funcional', color: '#1b1b1d', nuevo: true,
    campos: [n('ux', 'Casillas a lo ancho', 4, 1, 6, 1, ''), n('uy', 'Casillas a lo largo', 3, 1, 6, 1, '')],
    gen: p => gridfinityBasePro(p), nota: p => 'Mide ' + 42 * p.ux + ' × ' + 42 * p.uy + ' mm (en la A1 mini caben 4 × 4 como mucho; en la P1P, 6 × 6). Perfil oficial de 4,65 mm. Se imprime tal cual.' },
  skadisGancho: { cat: 'compatibles', tambien: ['organizar', 'oficina', 'hogar'], e: '🪝', t: 'Gancho para tablero IKEA SKÅDIS', d: 'Entra por arriba de la ranura, se empuja y cae: la uña queda detrás y no se sale', uso: 'funcional', color: '#264653', nuevo: true,
    campos: [n('brazo', 'Largo del brazo', 40, 15, 100, 1), n('punta', 'Alto de la punta', 12, 4, 40, 1), n('grueso', 'Grueso del gancho', 6, 4.3, 10, 0.1), c('doble', 'Con una segunda punta (para cables o auriculares)', false)],
    gen: p => deLado(skadisGancho(p)), nota: () => 'Para tableros SKÅDIS (ranuras de 5 × 15 mm, tablero de 5 mm). El trozo que entra en la ranura mide 4,3 mm de grueso y su uña 4,5 mm: se mete inclinándolo un poco por la parte de ARRIBA de la ranura, se empuja hasta el fondo y se deja caer. ' + POSTURA.lado },
  skadisBalda: { cat: 'compatibles', tambien: ['organizar', 'hogar', 'oficina'], e: '🧺', t: 'Balda para tablero IKEA SKÅDIS', d: 'Con borde delante y sus clips (salen aparte y entran a presión)', uso: 'funcional', color: '#264653', nuevo: true,
    campos: [n('ancho', 'Ancho', 120, 80, 240, 40), n('fondo', 'Fondo', 60, 30, 120, 1), c('agujeros', 'Con agujeros en el fondo', false), s('que', 'Qué sacar', 'todo', [['todo', 'La balda y sus clips'], ['balda', 'Solo la balda'], ['clip', 'Un clip suelto']])],
    gen: p => { if (p.que === 'clip') return deLado(skadisClip()); const R = skadisBalda(p); if (p.que === 'balda') return N.aLaCama(R.m.rotate([-90, 0, 0])); return enFila([R.m.rotate([-90, 0, 0])].concat(Array.from({ length: R.clips }, () => skadisClip().rotate([0, -90, 0])))); },
    nota: p => { const R = skadisBalda(p); N.limpia(); return 'Lleva ' + R.clips + ' clips (salen aparte): su espiga entra a presión en los huecos de la espalda (una gota de pegamento si la quieres fija). La balda se imprime con la ESPALDA en la cama; los clips, de lado. Clips cada 40 mm, como las ranuras de una misma fila.'; } },
  skadisPorta: { cat: 'compatibles', tambien: ['organizar', 'oficina'], e: '🔧', t: 'Portaherramientas para SKÅDIS', d: 'Regleta con agujeros para destornilladores, rotuladores o tijeras, y sus clips', uso: 'funcional', color: '#264653', nuevo: true,
    campos: [n('ancho', 'Ancho', 160, 80, 240, 40), n('agujero', 'Agujero', 14, 6, 30, 0.5), s('que', 'Qué sacar', 'todo', [['todo', 'La regleta y sus clips'], ['porta', 'Solo la regleta'], ['clip', 'Un clip suelto']])],
    gen: p => { if (p.que === 'clip') return deLado(skadisClip()); const R = skadisPorta(p); if (p.que === 'porta') return N.aLaCama(R.m.rotate([-90, 0, 0])); return enFila([R.m.rotate([-90, 0, 0]), skadisClip().rotate([0, -90, 0]), skadisClip().rotate([0, -90, 0])]); },
    nota: p => { const R = skadisPorta(p); N.limpia(); return R.agujeros + ' agujeros de ' + n1(p.agujero) + ' mm. 2 clips (aparte) a presión en la espalda. Se imprime con la espalda en la cama.'; } },
  goproTripode: { cat: 'compatibles', tambien: ['gaming', 'jovenes'], e: '📷', t: 'Adaptador GoPro a trípode (1/4")', d: '3 dedos GoPro arriba y la rosca de trípode abajo, con su tuerca metida por un lado', uso: 'funcional', color: '#1b1b1d', nuevo: true,
    campos: [],
    gen: () => goproTripode(), nota: () => 'Dedos de 3,0 mm con huecos de 3,15 y agujero para el tornillo M5 de GoPro (5,2 mm). Abajo, una tuerca de 1/4"-20 (la de los trípodes: 11,1 mm entre caras) entra por la ranura del lado. Se imprime de pie (dedos hacia arriba), sin soportes. Prueba primero que tu cámara entra en los dedos.' },
  goproBrazo: { cat: 'compatibles', tambien: ['gaming', 'jovenes'], e: '📷', t: 'Brazo de extensión GoPro', d: '3 dedos en un extremo y 2 en el otro: para alargar o girar la cámara', uso: 'funcional', color: '#1b1b1d', nuevo: true,
    campos: [n('largo', 'Largo', 50, 25, 120, 1)],
    gen: p => N.aLaCama(goproBrazo(p).rotate([90, 0, 0])), nota: () => 'Medidas GoPro (dedos de 3,0 mm, huecos de 3,15, tornillo M5). Se imprime TUMBADO, con los dedos de canto (sin soportes).' },
  aspiradora: { cat: 'compatibles', tambien: ['hogar'], e: '🧹', t: 'Adaptador de aspiradora (a tu medida)', d: 'Pon un accesorio de otra marca en tu aspiradora: mides el tubo y el agujero del accesorio y listo', uso: 'funcional', color: '#8e9196', nuevo: true,
    campos: [n('tubo', 'Tubo de tu aspiradora (por FUERA)', 35, 25, 45, 0.1), n('accesorio', 'Agujero del accesorio (por DENTRO)', 32, 25, 45, 0.1)],
    gen: p => aspiradora(p), nota: p => 'Un lado abraza el tubo de ' + n1(p.tubo) + ' mm y el otro entra en el accesorio de ' + n1(p.accesorio) + ' mm. Los dos son un poco cónicos (1°): entran apretando y no se sueltan. MIDE con calibre: aunque lo más común es 35 por fuera y 32 por dentro, cada marca varía. Se imprime de pie, sin soportes.' },
  soporteBalda: { cat: 'compatibles', tambien: ['hogar'], e: '📚', t: 'Soporte de balda (tetón)', d: 'El que se pierde siempre: escuadra con su tetón para los agujeros del mueble', uso: 'funcional', color: '#d9d9d9', nuevo: true,
    campos: [s('teton', 'Agujero del mueble', 5, [[5, '5 mm (el más común)'], [6, '6 mm'], [6.35, '6,35 mm (1/4")']]), s('que', 'Cuántos', 4, [[4, '4 (una balda)'], [8, '8'], [1, '1']])],
    gen: p => { const L = Array.from({ length: Number(p.que) || 4 }, () => deLado(soporteBalda({ teton: Number(p.teton) }))); return enFila(L, 4, 120); },
    nota: p => 'Tetón de ' + n1(Number(p.teton) - 0.1) + ' mm para agujeros de ' + n1(Number(p.teton)) + ' mm, 8 mm de largo. ' + POSTURA.lado + ' Aguanta una balda de libros normal con 4; para mucho peso, PETG.' },
  ganchoPuerta: { cat: 'compatibles', tambien: ['hogar', 'organizar', 'pack60'], /* (18-10: sustituye al del pack de 60 y sigue en su sección) */ e: '🚪', t: 'Gancho para colgar en la puerta', d: 'Sin taladrar: abraza la puerta por arriba (toallas, abrigos, bolsos)', uso: 'funcional', color: '#f4f1ea', nuevo: true,
    campos: [n('puerta', 'Grueso de la puerta', 40, 30, 50, 0.5), n('ancho', 'Ancho del gancho', 25, 15, 40, 1), n('caida', 'Cuánto baja', 70, 30, 150, 1), n('punta', 'Fondo del gancho', 22, 12, 40, 1)],
    gen: p => deLado(ganchoPuerta(p)), nota: p => 'Para puertas de ' + n1(p.puerta) + ' mm (las de interior suelen ser de 35 a 40: mide la tuya). La parte de arriba mide 3,2 mm: la puerta cierra igual. Se imprime de lado.' }
};
