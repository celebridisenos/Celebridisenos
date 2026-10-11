// ================= v30.4 · 🧰 ÚTILES: herramientas y accesorios que FUNCIONAN =================
// La dueña (11-10-2026): «más objetos en el catálogo, más herramientas, más accesorios… resultados excelentes, si no no lo quiero:
// objetos funcionales». Todo diseñado aquí (sus archivos de MakerWorld —caja con tapa, calibre— solo fueron inspiración: ni una
// malla copiada). Reglas de esta casa: sin soportes (nada pasa de 45°), lo que encaja lleva SUS holguras (0,05 a presión · 0,10
// encaja · 0,15 gira, por lado) y lo que se mueve se COMPRUEBA montado en el ordenador antes de enseñarlo (la nota lo dice).
import * as N from './nucleo.js';
import { circulo, rectR, ENCAJES } from './motor.js';
import * as CPR from './calibracion.js'; // la calibración de SU impresora (la probeta): el pie de rey dice si va ya corregido

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const circ = d => N.cs([N.ccw(circulo(d / 2, 0, 0, seg(d)))], 'Positive');
const rr = (w, h, r = 0) => N.cs([N.ccw(rectR(w, h, r))], 'Positive');
const poli = P => N.cs([N.ccw(P)], 'Positive');
const cil = (d, h, z = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([0, 0, z]);
const cono = (d1, d2, h, z = 0) => M().cylinder(h, d1 / 2, d2 / 2, seg(Math.max(d1, d2))).translate([0, 0, z]);
const caja = (x, y, z, r = 0) => rr(x, y, r).extrude(z);
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const R2 = Math.PI / 180;
const suave = t => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;
// 2D (u, v) → pieza en el plano YZ (u → Y, v → Z) extruida a lo largo de X, centrada en X
const aLoLargoX = (cs, L) => cs.extrude(L).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([-L / 2, 0, 0]);
// 2D (x, z) de pie: x → X, y del dibujo → Z, extruida en Y (centrada en Y)
const porY = (cs, L) => cs.extrude(L).rotate([90, 0, 0]).translate([0, L / 2, 0]);
// de revolución: P = [[radio, z], …] de abajo arriba (se cierra por el eje)
const torno = (P, d) => CS().ofPolygons([N.ccw([[0, P[0][1]]].concat(P).concat([[0, P[P.length - 1][1]]]))]).revolve(seg(d) * 2);
// hexágono con «e» mm entre caras
const hex = e => poli(N.poligono2(6, e / Math.cos(30 * R2), 0));
const texto3d = (t, fuente, alto, grosor) => N.centraCS(N.texto2(t, fuente, alto)).extrude(grosor);
// varias piezas una al lado de otra en la cama (cada una apoyada y centrada en Y), con «hueco» mm entre ellas
const enFila = (L, hueco = 6) => { let x = 0; return N.union(L.map(m => { const b = N.caja(m), q = m.translate([x - b.min[0], -(b.min[1] + b.max[1]) / 2, -b.min[2]]); x += b.dims[0] + hueco; return q; })); };
// varias piezas en filas (para juegos de muchas piezas): «ancho» mm de fila como mucho
function enRejilla(L, ancho = 200, hueco = 5) {
  const filas = []; let fila = [], w = 0;
  L.forEach(m => { const b = N.caja(m); if (fila.length && w + b.dims[0] > ancho) { filas.push(fila); fila = []; w = 0; } fila.push(m); w += b.dims[0] + hueco; });
  if (fila.length) filas.push(fila);
  let y = 0; const out = [];
  filas.forEach(f => { let x = 0, alto = 0; f.forEach(m => { const b = N.caja(m); out.push(m.translate([x - b.min[0], y - b.min[1], -b.min[2]])); x += b.dims[0] + hueco; alto = Math.max(alto, b.dims[1]); }); y += alto + hueco; });
  return N.union(out);
}

// ======================= 🪛 MANGO PARA PUNTAS DE 1/4" (con almacén y tapa de rosca) =======================
// Se imprime de pie, con la boca de la punta en la cama: el hexágono, el hueco del imán y el almacén quedan sin soportes.
// El almacén (Ø20,4) guarda 5 puntas de 25 mm; la tapa es un tapón con rosca (la misma rosca redonda de los botes).
const PUNTA = 6.35; // 1/4 de pulgada entre caras
function mangoPiezas(p) {
  const L = Math.max(80, p.largo), Rm = Math.max(13.5, p.d / 2), Rg = Rm * 0.9, Rw = Rm * 0.74, hol = ENCAJES[p.encaje] ?? ENCAJES.justo;
  const dT = 2 * Rm - 7, rosH = 9, prof = p.almacen ? 28.5 + rosH : 0, zB = L - prof; // rosca macho de la tapa: deja 3,2 mm de pared
  const radio = z => z < 1 ? 7.4 + 0.8 * z : z < 16 ? 8.2 + 0.6 * (z - 1) / 15 : z < 22 ? 8.8 + (Rg - 8.8) * (z - 16) / 6 : z < 25 ? Rg : z < 35 ? Rg + (Rw - Rg) * suave((z - 25) / 10) : z < L - 30 ? Rw + (Rm - Rw) * suave((z - 35) / (L - 65)) : z < L - 1.2 ? Rm : Rm - (z - (L - 1.2));
  const P = []; for (let i = 0; i <= 160; i++) { const z = L * i / 160; P.push([radio(z), z]); }
  let m = torno(P, 2 * Rm);
  // estrías de agarre: 6 canales con el final de arriba en punta (45°: sin voladizo)
  const dF = 9, rF = Rm + 1.6, z0 = 40, z1 = L - (p.almacen ? 14 : 8) - dF / 2, can = cil(dF, z1 - z0, z0).add(cono(dF, 0, dF / 2, z1)).add(M().sphere(dF / 2, 32).translate([0, 0, z0]));
  const F = []; for (let i = 0; i < 6; i++) F.push(can.translate([rF, 0, 0]).rotate([0, 0, i * 60])); m = m.subtract(N.union(F));
  // la boca: hexágono de 1/4" (12,5 mm de hondo, con entrada achaflanada) y, al fondo, el imán
  m = m.subtract(hex(PUNTA + 2 * hol).extrude(12.5).translate([0, 0, -0.01])).subtract(cono(PUNTA / Math.cos(30 * R2) + 1.6, PUNTA / Math.cos(30 * R2) - 0.4, 1, -0.01));
  if (p.iman) m = m.subtract(cil(p.imanD + 0.1, p.imanH + 0.3, 12.4));
  let tapa = null;
  if (p.almacen) {
    m = m.subtract(cil(dT - 3.6, prof + 0.01, zB)).subtract(N.rosca(dT, 3, rosH + 0.6, true).translate([0, 0, L - rosH])).subtract(cono(dT - 1.6, dT + 1.2, 1.4, L - 1.39));
    // tapa: cabeza con las mismas estrías + rosca macho
    let cab = torno([[Rm - 1.2, 0], [Rm, 1.2], [Rm, 5], [Rm - 1, 6]], 2 * Rm); const G = []; for (let i = 0; i < 6; i++) G.push(cil(dF, 8, -1).translate([rF, 0, 0]).rotate([0, 0, i * 60])); cab = cab.subtract(N.union(G));
    const hR = rosH - 1; tapa = cab.add(N.rosca(dT, 3, hR).intersect(torno([[dT / 2 + 1, 0], [dT / 2 + 1, hR - 1.6], [dT / 2 - 1.3, hR]], dT + 2)).translate([0, 0, 5.99])); // la punta de la rosca en chaflán: entra sola
  }
  return { mango: m, tapa, L, Rm, dT, zB, prof };
}

// ======================= 🧲 REGLETA DE PUNTAS (en gradas) =======================
function regletaPuntas(p) {
  const nx = Math.round(p.n), f = Math.round(p.filas), paso = 11.5, fondo = 12.5, W = nx * paso + 5, h0 = 14, sube = 7, hol = ENCAJES.gira;
  const P = [[0, 0]]; for (let j = 0; j < f; j++) { P.push([j * fondo, h0 + j * sube]); P.push([(j + 1) * fondo, h0 + j * sube]); } P.push([f * fondo, 0]);
  // escalera vista de lado (Y hacia el fondo), con las esquinas de pie redondeadas
  let m = poli(P.map(q => [q[0] - f * fondo / 2, q[1]])).extrude(W).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([-W / 2, 0, 0]);
  m = m.intersect(caja(W, f * fondo, h0 + f * sube + 1, 3));
  const hueco = hex(PUNTA + 2 * hol).extrude(10).add(cono(PUNTA / Math.cos(30 * R2) + 1.4, PUNTA / Math.cos(30 * R2), 0.8, 9.21));
  const H = []; for (let j = 0; j < f; j++) for (let i = 0; i < nx; i++) H.push(hueco.translate([-W / 2 + 2.5 + paso * (i + 0.5), -f * fondo / 2 + fondo * (j + 0.5), h0 + j * sube - 10 + 0.01]));
  m = m.subtract(N.union(H));
  if (p.imanes) { const dx = Math.min(W / 2 - 9, W * 0.3); [-1, 1].forEach(k => { m = m.subtract(cil(p.imanD + 0.1, p.imanH + 0.2, -0.01).translate([k * dx, f * fondo / 2 - 6.5, 0])); }); }
  return m;
}

// ======================= 📐 GALGAS DE RADIOS =======================
// Cada hoja mide un radio: la esquina REDONDA de arriba se apoya en un rincón (radio de dentro) y la MUESCA de abajo abraza una
// esquina (radio de fuera). Número grabado y agujero para juntarlas con un tornillo M4 o una anilla.
function hojaGalga(R, g) {
  const w = Math.max(18, R + 9), L = Math.max(46, 2 * R + 30), P = [];
  // contorno en sentido contrario a las agujas: abajo-izq → muesca abajo-dcha → arriba-dcha → esquina redonda arriba-izq
  P.push([0, 0]); P.push([w - R, 0]);
  for (let i = 1; i < 24; i++) { const a = Math.PI - i / 24 * Math.PI / 2; P.push([w + R * Math.cos(a), R * Math.sin(a)]); } // muesca (círculo con centro en la esquina [w, 0])
  P.push([w, R]); P.push([w, L]);
  P.push([R, L]); for (let i = 1; i <= 24; i++) { const a = Math.PI / 2 + i / 24 * Math.PI / 2; P.push([R + R * Math.cos(a), L - R + R * Math.sin(a)]); }
  let m = poli(P).extrude(g);
  const alto = Math.min(7, Math.max(4.6, w * 0.3)), txt = N.centraCS(N.texto2('R' + n2(R), 'gorda', alto)), bt = N.cajaCS(txt), k = Math.min(1, (w - 4) / bt.w);
  m = m.subtract(txt.scale([k, k]).translate([w / 2, R >= 8 ? L - R - 6 : L - 9]).extrude(1).translate([0, 0, g - 0.6]));
  return m.subtract(cil(4.3, g + 2, -1).translate([Math.max(4.5, (w - R) / 2), 5, 0]));
}
function listaGalgas(p) { const a = Math.max(0.5, Math.min(p.desde, p.hasta)), b = Math.max(p.desde, p.hasta), paso = Math.max(0.5, p.paso), L = []; for (let r = a; r <= b + 1e-6 && L.length < 30; r += paso) L.push(Math.round(r * 100) / 100); return L; }

// ======================= 🧰 CAJA CON TAPA DE BISAGRA (se imprime de una vez, ya montada) =======================
// Sale ABIERTA y plana: la base y, al lado, la tapa boca abajo, unidas por la bisagra. Para que las dos apoyen en la cama aunque la
// tapa sea más baja que la base, el eje va a MEDIA altura ((base + tapa) / 2): los nudos de la base suben desde la cama pegados a
// su pared y los de la tapa son postes que suben desde la cama. El giro es de CONOS a 45° (macho en la base, hembra en la tapa):
// nada cuelga, no hay eje que se pueda quedar pegado, y la holgura es la de «imprimir de una vez» (0,40 de serie; hay prueba).
// Cierre: una lengüeta LARGA que cuelga del techo de la tapa (no de su borde: así flexa 0,45 mm en ~14 mm y no se parte) con un
// diente a 45° que salta un nervio de la base. Los tabiques SUBEN dentro de la tapa (los tornillos no se cambian de casilla al
// llevarla) y se recortan con el arco que barre la tapa al cerrar.
// Marco «cerrado»: base en x ∈ [−X/2, X/2], y ∈ [0, Y] (bisagra en y = 0, cierre en y = Y), z ∈ [0, Hb]; tapa encima.
// v30.6 · LA DUEÑA LA IMPRIMIÓ (30.4) Y SE PARTÍA: «las bisagras no cierran ni abren… se parte todo, es muy fino». Lo que estaba mal:
// nudos de Ø7,2 con conos de Ø5,2 × 2,2 a 0,28 mm (salían pegados), 0,4 mm entre nudos también en la primera capa (se sueldan por
// el «pie de elefante»), paredes de 1,8, techo de 1,4 y lengüeta de 1,5. Ahora: nudos de Ø10 con conos de Ø7,6 × 3,2, medio
// milímetro entre nudos (1,1 en la primera capa), paredes de 2,4 como mínimo… y lengüeta de 2 mm, más larga y que salta menos.
const BIS = { R: 5, hueco: 0.6, gapX: 0.5, techo: 2, suelo: 2, tab: 1.6, diente: 0.6, solape: 0.35, lenG: 2, pie: 0.3, pieZ: 0.6 };
function cajaBisagraPiezas(p) {
  const X = Math.max(36, p.x), Y = Math.max(28, p.y), Hb = Math.max(12, p.z), Hl = Math.max(6, Math.min(p.tapa, Hb)), w = Math.max(2, p.pared), rE = Math.min(5, X / 5, Y / 5);
  const R = BIS.R, g = R + BIS.hueco, h = (Hb + Hl) / 2, cR = Math.max(0.35, Math.min(0.8, p.holgura)), cx = Math.max(1, Math.round(p.cx)), cy = Math.max(1, Math.round(p.cy));
  const huella = (d = 0) => rr(X - 2 * d, Y - 2 * d, Math.max(0.6, rE - d)).translate([0, Y / 2]);
  const ejeX = m => m.rotate([0, 90, 0]); // un cilindro de pie → tumbado a lo largo de +X
  // ---- BASE ----
  const sube = Math.max(0, Hl - BIS.techo - 0.6), rho = Math.hypot(Y - w + g, Hb - h) - 0.7;
  let base = huella().extrude(Hb);
  if (sube > 0.5 && (cx > 1 || cy > 1)) base = base.add(huella(w + 0.35).extrude(sube + 0.01).translate([0, 0, Hb - 0.01]).intersect(ejeX(M().cylinder(X + 10, rho, rho, 240)).translate([-(X + 10) / 2, -g, h])));
  const cw = (X - 2 * w - (cx - 1) * BIS.tab) / cx, ch = (Y - 2 * w - (cy - 1) * BIS.tab) / cy, rmp = p.rampa ? Math.min(ch * 0.45, Hb * 0.5, 12) : 0, C = [];
  for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) {
    const alto = Hb + sube + 1 - BIS.suelo, cel = rmp > 0.5 ? M().hull([rr(cw, ch, 2).extrude(alto - rmp).translate([0, 0, rmp]), rr(cw, ch - rmp, 1).extrude(0.02).translate([0, -rmp / 2, 0])]) : rr(cw, ch, 2).extrude(alto);
    C.push(cel.translate([-X / 2 + w + cw / 2 + i * (cw + BIS.tab), w + ch / 2 + j * (ch + BIS.tab), BIS.suelo]));
  }
  base = base.subtract(N.union(C));
  // nervio del cierre (triángulo a 45°: se imprime en una pared de pie sin soporte)
  const ws = Math.max(24, Math.min(70, X * 0.4)), d = BIS.diente, zr = Math.max(2.4, Math.min(Hb - 3.5, Hl + d - 0.3)); // el nervio va A LA ALTURA de la tapa o más abajo (v30.6): el eje está a media altura, y un diente más alto que eso se CLAVA en la pared al bajar; así llega por fuera y la lengüeta sale larga (se dobla poco)
  base = base.add(aLoLargoX(poli([[Y - 0.2, zr - d - 0.2], [Y + d, zr], [Y - 0.2, zr + d + 0.2]]), ws + 3));
  // ---- BISAGRA: tramos alternos base / tapa ----
  const Lh = X - 2 * Math.max(7, rE + 2.5), nseg = Lh >= 84 ? 5 : 3, ls = (Lh - (nseg - 1) * BIS.gapX) / nseg, rc = R - 1.2, lc = 3.2;
  const perfilBase = N.csUnion([circ(2 * R).translate([-g, h]), poli([[-g - R, 0], [0.3, 0], [0.3, h], [-g - R, h]])]);
  const perfilTapa = N.csUnion([circ(2 * R).translate([-g, h]), poli([[-g - R, h], [-0.35, h], [-0.35, Hb + 0.35], [0.3, Hb + 0.35], [0.3, Hb + Hl], [-g - R, Hb + Hl]])]);
  const macho = ejeX(M().cylinder(lc, rc, rc - lc, 48)), hembraL = lc + 0.35 - BIS.gapX, hembraR = rc - BIS.gapX + cR, hembra = ejeX(M().cylinder(hembraL + 0.02, hembraR + 0.02, hembraR - hembraL, 48)).translate([-0.02, 0, 0]);
  const nudosB = [], nudosT = [], huecosT = [];
  for (let i = 0; i < nseg; i++) {
    const a = -Lh / 2 + i * (ls + BIS.gapX), b = a + ls, enX = cs2 => cs2.extrude(ls).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([a, 0, 0]);
    if (i % 2 === 0) { nudosB.push(enX(perfilBase)); if (i < nseg - 1) nudosB.push(macho.translate([b, -g, h])); if (i > 0) nudosB.push(macho.mirror([1, 0, 0]).translate([a, -g, h])); }
    else { nudosT.push(enX(perfilTapa)); huecosT.push(hembra.translate([a, -g, h])); huecosT.push(hembra.mirror([1, 0, 0]).translate([b, -g, h])); }
  }
  const pieB = [], pieT = [], topT = Hb + Hl; // lo que se les quita junto a la cama (la base apoya en z = 0; la tapa, abierta, en su techo)
  for (let i = 0; i < nseg; i++) { const a = -Lh / 2 + i * (ls + BIS.gapX), b = a + ls, L2 = i % 2 === 0 ? pieB : pieT, z0 = i % 2 === 0 ? -0.01 : topT - BIS.pieZ, y1 = i % 2 === 0 ? -0.05 : -0.36;
    if (i > 0) L2.push(caja(BIS.pie + 0.01, g + R + 1 + y1, BIS.pieZ + 0.01).translate([a - 0.01 + (BIS.pie + 0.01) / 2, (-g - R - 1 + y1) / 2, z0 + (BIS.pieZ + 0.01) / 2]));
    if (i < nseg - 1) L2.push(caja(BIS.pie + 0.01, g + R + 1 + y1, BIS.pieZ + 0.01).translate([b + 0.01 - (BIS.pie + 0.01) / 2, (-g - R - 1 + y1) / 2, z0 + (BIS.pieZ + 0.01) / 2])); }
  base = base.add(N.union(nudosB)).subtract(N.union(pieB));
  // ---- TAPA (en su sitio, cerrada) ----
  let tapa = huella().extrude(Hl).subtract(huella(w).extrude(Hl - BIS.techo + 0.01).translate([0, 0, -0.01])).translate([0, 0, Hb]);
  tapa = tapa.add(N.union(nudosT).subtract(N.union(huecosT)).subtract(N.union(pieT)));
  // lengüeta: cuelga del techo (unida solo en los 3 mm de arriba), separada 0,95 de la pared de la tapa
  const top = Hb + Hl, zk = zr - d + 0.05, zFin = zk - d - 0.2, tG = (top - 3) - zk >= 16 ? BIS.lenG : 1.5, yi = Y + d + 0.25, yo = yi + tG; // (una lengüeta corta se hace más fina: se estira menos)
  const leng = poli([[Y - 0.2, top], [Y - 0.2, top - 3], [yi, top - 3 - (yi - Y)], [yi, zk + d], [yi - d, zk], [yi, zk - d], [yi, zFin], [yo + 1.6, zFin - 1.6 - tG], [yo + 1.6 + tG * 0.9, zFin - 1.6], [yo, zFin + tG * 0.5], [yo, top - 1.2], [yo - 1.2, top]]);
  tapa = tapa.add(aLoLargoX(leng, ws));
  if (p.txt && String(p.txt).trim()) { let T = N.centraCS(N.texto2(String(p.txt).trim(), p.fuente || 'gorda', Math.min(14, Y * 0.2))); const bt = N.cajaCS(T), k = Math.min(1, (X - 16) / bt.w); T = T.scale([k, k]).rotate(180).translate([0, Y / 2]); tapa = tapa.subtract(T.extrude(1).translate([0, 0, top - 0.6])); }
  if (p.estilo === 'cofre') { // tablas grabadas en la tapa y en el frente (0,6 de hondo: no debilitan)
    const nT = Math.max(2, Math.round(Y / 22)), ran = []; for (let i = 1; i < nT; i++) ran.push(caja(X + 2, 1.2, 0.7).translate([0, Y * i / nT, top - 0.6]));
    tapa = tapa.subtract(N.union(ran)); const nB = Math.max(1, Math.round(Hb / 14)), rb = []; for (let i = 1; i <= nB; i++) { const z = Hb * i / (nB + 1); if (Math.abs(z - zr) > 3) rb.push(caja(X - 2 * rE - 2, 1.4, 1.2).translate([0, Y - 0.3, z - 0.6]), caja(1.4, Y - 2 * rE - 2, 1.2).translate([-X / 2 + 0.3, Y / 2, z - 0.6]), caja(1.4, Y - 2 * rE - 2, 1.2).translate([X / 2 - 0.3, Y / 2, z - 0.6])); }
    if (rb.length) base = base.subtract(N.union(rb)); }
  const gira = (m, ang) => m.translate([0, g, -h]).rotate([ang, 0, 0]).translate([0, -g, h]);
  const largoLeng = (top - 3) - zk; // lo que mide la lengüeta desde donde se une al techo hasta el diente
  return { base, tapa, gira, X, Y, Hb, Hl, g, h, nseg, ls, ws, cw, ch, sube, cR, w, largoLeng, tG, estira: 1.5 * tG * BIS.solape / (largoLeng * largoLeng) };
}
const PRUEBA_BIS = p => Object.assign({}, p, { x: 44, y: 34, cx: 1, cy: 1, txt: '' });
// ¿se abre y se cierra sin rozar? Se gira la tapa de 0 a 180° y se mira cuánto se mete en la base en cada paso.
const _giros = new Map();
export function giroCajaBisagra(p) {
  const k = JSON.stringify(['v306c', p.x, p.y, p.z, p.tapa, p.pared, p.cx, p.cy, p.holgura, p.rampa, p.que, p.estilo || '']); if (_giros.has(k)) return _giros.get(k);
  const r = N.enAmbito(() => { const K = cajaBisagraPiezas(p.que === 'prueba' ? PRUEBA_BIS(p) : p); let cerrada = 0, clic = 0, libre = 0, clicHasta = 0;
    for (const a of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 1, 1.5, 2, 3, 4, 6, 8, 12, 20, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]) { const v = K.gira(K.tapa, a).intersect(K.base).volume(); if (a === 0) cerrada = v; else if (a <= 6) { if (v > 0.005) { clic = Math.max(clic, v); clicHasta = a; } } else libre = Math.max(libre, v); }
    // v30.6 · en la postura de imprimir (abierta 180°), la tapa corrida 0,25 mm hacia cualquier lado NO toca la base: no saldrán soldadas
    const c = 0.25, q = c * 0.7071, T180 = K.gira(K.tapa, 180); let pegada = 0;
    for (const v of [[c, 0, 0], [-c, 0, 0], [0, c, 0], [0, -c, 0], [0, 0, c], [0, 0, -c], [0, q, q], [0, -q, q], [0, q, -q], [0, -q, -q], [q, q, 0], [-q, q, 0], [q, 0, q], [-q, 0, q], [q, 0, -q], [-q, 0, -q]]) pegada = Math.max(pegada, T180.translate(v).intersect(K.base).volume());
    return { cerrada, clic, clicHasta, libre, pegada, sep: c, w: K.w, estira: K.estira, largoLeng: K.largoLeng, tG: K.tG }; });
  if (_giros.size > 40) _giros.clear(); _giros.set(k, r); return r;
}

// ======================= 📏 PIE DE REY (calibre) =======================
// Dos piezas planas, sin soportes: la REGLA (con la boca fija) y la CORREDERA, que abraza la regla en cola de milano (los cantos
// de la regla van inclinados 35° y los raíles de la corredera se echan encima: no se puede levantar, solo correr). Rayas de
// milímetro en RELIEVE (0,4 mm) y nonio de décimas en el raíl de abajo, pegado a la escala. Bocas de fuera (abajo) y de dentro
// (arriba): las de dentro se cruzan una por detrás de la otra para que, cerradas, sus caras de fuera midan 0.
// Marco de la regla: X = a lo largo (la cara de la boca fija en x = 0), Y = a lo ancho (las bocas de fuera hacia −Y), Z = grosor.
const CAL = { tb: 3.2, tp: 1.6, cz: 0.2, Wb: 18, ang: 35, rail: 7, Ls: 56, J: 14, d0: 8, nib: 12, a: 4, raya: 0.5, alza: 0.4, muelle: 0.25 };
function calibrePiezas(p, o = {}) {
  const rango = Math.max(50, Math.round(p.rango / 10) * 10), Jl = Math.max(20, p.boca), cl = Math.max(0.05, Math.min(0.4, p.ajuste)), { tb, tp, cz, Wb, rail, Ls, J, d0, a } = CAL;
  const ins = tb * Math.tan(CAL.ang * R2), Lb = rango + Ls + 14, H = tp + cz + tb, yTop = Wb + rail, yN = yTop + 3.2, Nh = CAL.nib, cero = Math.max(-1, Math.min(1, Number(p.cero) || 0));
  const alo = (cs2, x0, x1) => cs2.extrude(x1 - x0).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([x0, 0, 0]); // dibujo (y, z) → a lo largo de X
  const cuna = (cs2, y0, y1) => cs2.extrude(y1 - y0).rotate([90, 0, 0]).translate([0, y1, 0]); // dibujo (x, z) → a lo largo de Y
  const raya = (x, y0, y1) => rr(CAL.raya, Math.abs(y1 - y0)).translate([x, (y0 + y1) / 2]);
  const num = (t, alto, x, y) => N.centraCS(N.texto2(String(t), 'estrecha', alto)).translate([x, y]);
  // ---- REGLA ----
  let regla = alo(poli([[0, 0], [Wb, 0], [Wb - ins, tb], [ins, tb]]), 0, Lb);
  // la punta, afilada 0,8 mm por lado en los últimos 9 mm (la corredera entra sola y los muelles suben sin engancharse) y con agujero para colgarlo
  regla = regla.subtract(N.csUnion([poli([[Lb - 9, -0.01], [Lb + 0.1, -0.01], [Lb + 0.1, 0.9]]), poli([[Lb - 9, Wb + 0.01], [Lb + 0.1, Wb - 0.9], [Lb + 0.1, Wb + 0.01]]), circ(5).translate([Lb - 6.5, Wb / 2])]).extrude(tb + 2).translate([0, 0, -1]));
  // cabeza (maciza), boca fija hacia abajo y, hacia arriba, el brazo que lleva la boca de dentro por encima de la corredera
  const cabeza = N.csUnion([rr(J, Wb).translate([-J / 2, Wb / 2]), poli([[0, 1], [0, -Jl], [-2.5, -Jl], [-J, -Math.min(12, Jl * 0.4)], [-J, 1]]),
    poli([[-J, Wb - 1], [-J, yN], [0, yN], [0, yN + Nh], [a - 1.6, yN + Nh], [a, yN + Nh - 2.4], [a, yTop + 0.6], [-J + 6, yTop + 0.6], [-J + 6, Wb - 1]])]);
  regla = regla.add(cabeza.extrude(tb));
  // filo de las bocas de fuera: la cara que mide se queda en 1,2 mm de grueso (toca en una línea, como las de metal)
  const filo = 1.2, zF = Math.min(-6, -Jl * 0.3);
  regla = regla.subtract(cuna(poli([[0.01, filo], [0.01, tb + 0.1], [-(tb - filo) - 0.1, tb + 0.1]]), -Jl - 1, zF));
  const M1 = []; for (let k = 0; k <= rango; k++) { const x = d0 + k, largo = k % 10 === 0 ? 5 : k % 5 === 0 ? 3.8 : 2.6; M1.push(raya(x, ins + 0.05, ins + 0.05 + largo)); if (k % 10 === 0) M1.push(num(k, 3.2, x, ins + 5 + 0.9 + 1.6)); }
  regla = regla.add(N.csUnion(M1).intersect(rr(Lb + 2 * J, Wb - 2 * ins - 0.3).translate([Lb / 2 - J, Wb / 2])).extrude(CAL.alza + 0.01).translate([0, 0, tb - 0.01]));
  if (p.txt && String(p.txt).trim()) { let T = N.centraCS(N.texto2(String(p.txt).trim(), 'gorda', 4.2)); const bt = N.cajaCS(T), k = Math.min(1, (J - 2.5) / bt.h, (Wb - 3) / bt.w); regla = regla.subtract(T.scale([k, k]).rotate(90).translate([-J / 2, Wb / 2]).extrude(1).translate([0, 0, tb - 0.5])); }
  // ---- CORREDERA (su suelo en z = 0; montada va 1,8 mm por debajo de la regla) ----
  const pie = cl + ins * cz / tb, yA = Wb + pie; // el canto del raíl va PARALELO al de la regla (la misma inclinación), separado «cl»
  let corr = rr(Ls, yTop + rail).translate([Ls / 2, (yTop - rail) / 2]).extrude(tp);
  corr = corr.add(alo(poli([[-rail, tp - 0.01], [-pie, tp - 0.01], [ins - cl, H], [-rail, H]]), 0, Ls)).add(alo(poli([[yA, tp - 0.01], [yTop, tp - 0.01], [yTop, H], [Wb - ins + cl, H]]), 0, Ls));
  // MUELLES ANTI-HOLGURA: dos lengüetas cortadas en el raíl de arriba (doblan «de canto», a favor de las capas) con un taco en la punta
  // que aprieta la regla contra el raíl de abajo, que es el que manda. Así la corredera no cabecea: es lo que da la precisión.
  const tL = 1.5, lL = 17, pre = CAL.muelle;
  [[22, 5], [Ls - 22, Ls - 5]].forEach(([xr, xf]) => {
    const x0 = Math.min(xr, xf), x1 = Math.max(xr, xf), dir = xf < xr ? -1 : 1, xe = dir < 0 ? x0 - 0.7 : x1; // xe: la ranura del extremo libre
    const corte = N.csUnion([rr(lL + 0.7, 0.7).translate([(x0 + x1) / 2 + dir * 0.35, yA + tL + 0.35]), rr(0.7, tL + ins + 2.2).translate([xe + 0.35, yA + tL + 0.7 - (tL + ins + 2.2) / 2])]);
    corr = corr.subtract(corte.extrude(H + 2).translate([0, 0, -1])).subtract(rr(lL + 0.7, 0.8).translate([(x0 + x1) / 2 + dir * 0.35, yA - 0.39]).extrude(tp + 0.03).translate([0, 0, -0.01]));
    if (!o.sinMuelle) { const e = cl + pre, sec = (ee, x) => alo(poli([[yA - ee, tp + 0.02], [yA + 0.3, tp + 0.02], [Wb - ins + cl + 0.3, H], [Wb - ins + cl - ee, H]]), x, x + 0.02), xa = dir < 0 ? x0 : x1 - 5;
      corr = corr.add(M().hull([sec(0.02, xa), sec(e, xa + 1.6), sec(e, xa + 3.4), sec(0.02, xa + 4.98)])); }
  });
  // boca móvil (todo el grosor), agarre para el pulgar y boca de dentro (solo el grosor del suelo: pasa POR DETRÁS de la fija)
  const pul = Ls - 12, agarre = poli([[pul - 9, -rail + 0.5], [pul - 6.5, -rail - 4.2], [pul + 6.5, -rail - 4.2], [pul + 9, -rail + 0.5]]).subtract(N.csUnion([-4.5, 0, 4.5].map(u => circ(2.6).translate([pul + u, -rail - 4.9]))));
  corr = corr.add(N.csUnion([poli([[0, -rail + 0.5], [0, -Jl], [2.5, -Jl], [J, -Math.min(12, Jl * 0.4)], [J, -rail + 0.5]]), agarre]).extrude(H));
  corr = corr.subtract(cuna(poli([[-0.01, tp + cz + filo], [-0.01, H + 0.1], [H - tp - cz - filo + 0.1, H + 0.1]]), -Jl - 1, zF));
  corr = corr.add(poli([[-a, yTop - 0.5], [9, yTop - 0.5], [9, yTop + 2.6], [0, yTop + 2.6], [0, yN + Nh], [-a + 1.6, yN + Nh], [-a, yN + Nh - 2.4]]).extrude(tp));
  // nonio LARGO: 10 partes en 19 mm (rayas cada 1,9): se lee la décima igual, pero las rayas están el doble de separadas (se imprimen
  // limpias y se ven sin lupa). «cero» lo corre lo que haga falta si, cerrado, no marcara 0.
  const M2 = []; for (let i = 0; i <= 10; i++) { const x = d0 - cero + i * 1.9, largo = i % 5 === 0 ? 3.4 : 2.4; M2.push(raya(x, ins - cl - 0.05 - largo, ins - cl - 0.05)); if (i % 2 === 0) M2.push(num(i, 2.3, x, ins - cl - 3.4 - 0.6 - 1.15)); }
  corr = corr.add(N.csUnion(M2).extrude(CAL.alza + 0.01).translate([0, 0, H - 0.01]));
  const montada = (s0, c2 = corr) => c2.translate([s0, 0, -tp - cz]);
  return { regla, corr, montada, rango, Jl, Lb, H, ins, yTop, yN, Nh, cl };
}
const _cal = new Map();
export function compruebaCalibre(p) {
  const k = JSON.stringify([p.rango, p.boca, p.ajuste, p.cero]); if (_cal.has(k)) return _cal.get(k);
  const r = N.enAmbito(() => { const K = calibrePiezas(p), K0 = calibrePiezas(p, { sinMuelle: true }); let roce = 0; [0, K.rango / 2, K.rango].forEach(s0 => { roce = Math.max(roce, K0.montada(s0, K0.corr).intersect(K0.regla).volume()); });
    const sube = K0.montada(20, K0.corr).translate([0, 0, 0.6]).intersect(K0.regla).volume(), cruza = K0.montada(-0.3, K0.corr).intersect(K0.regla).volume(), muelle = K.montada(20).intersect(K.regla).volume(), punta = K.montada(K.Lb - 6).intersect(K.regla).volume();
    return { roce, sube, cruza, muelle, punta }; });
  if (_cal.size > 30) _cal.clear(); _cal.set(k, r); return r;
}

// ======================= 🏠 ACCESORIOS DE CASA QUE FUNCIONAN =======================
// un dibujo 2D extruido con los cantos de arriba y de abajo MATADOS (bisel en escalones de 0,3 mm: al imprimir se ve liso)
function conBisel(cs2, alto, bisel = 1.2) {
  const pasos = Math.max(1, Math.round(bisel / 0.3)), dz = bisel / pasos, L = [cs2.extrude(alto - 2 * bisel + 0.02).translate([0, 0, bisel - 0.01])];
  for (let i = 0; i < pasos; i++) { const d = -(bisel - (i + 0.5) * dz), capa = cs2.offset(d, 'Round').extrude(dz + 0.01); L.push(capa.translate([0, 0, i * dz])); L.push(capa.translate([0, 0, alto - (i + 1) * dz - 0.01])); }
  return N.union(L);
}
// 🪥 EXPRIME-TUBOS: el tubo (pasta de dientes, crema, pintura) pasa por la ranura y, al empujar la pieza, sale todo.
function exprimeTubos(p) {
  const W = p.ancho, g = p.ranura, H = 11, ran = poli(N.ranura2(W + 3 + g, g));
  let m = conBisel(rr(W + 26, 18, 9), H, 1.2).subtract(ran.extrude(H + 2).translate([0, 0, -1]));
  // la entrada de la ranura, abocinada (el tubo entra solo y no se corta)
  m = m.subtract(M().hull([ran.extrude(0.02).translate([0, 0, H - 2]), ran.offset(2, 'Round').extrude(0.02).translate([0, 0, H])])).subtract(M().hull([ran.offset(0.8, 'Round').extrude(0.02).translate([0, 0, -0.01]), ran.extrude(0.02).translate([0, 0, 0.8])]));
  const E = []; [-1, 1].forEach(k => { for (let i = 0; i < 3; i++) E.push(caja(1.1, 9 - i * 2.2, 2).translate([k * (W / 2 + 5 + i * 2.3), 0, H - 0.7])); });
  return m.subtract(N.union(E));
}
// 🛍️ ASA PARA BOLSAS: las asas de las bolsas entran por la ranura de abajo y cuelgan a los lados; la mano agarra arriba.
function asaBolsas(p) {
  const L = p.largo, Hh = 62, top = 18, bot = 9.5, gap = 13, yin0 = -Hh / 2 + bot, yin1 = Hh / 2 - top;
  let d2 = rr(L, Hh, 19).subtract(rr(L - 24, yin1 - yin0, Math.min(13, (yin1 - yin0) / 2 - 0.5)).translate([0, (yin0 + yin1) / 2])).subtract(rr(gap, bot + 6, 0).translate([0, -Hh / 2 + bot / 2 - 1]));
  const nD = Math.max(3, Math.min(4, Math.floor((L - 40) / 20))), sep = (L - 44) / nD; for (let i = 0; i < nD; i++) d2 = d2.subtract(circ(sep * 1.12).translate([(i - (nD - 1) / 2) * sep, yin1 - sep * 0.56 + 2.4]));
  [-1, 1].forEach(k => { d2 = d2.add(circ(9).translate([k * (gap / 2 + 4.5), yin0 + 1.4])).add(circ(bot).translate([k * (gap / 2 + bot / 2), -Hh / 2 + bot / 2])); });
  let m = conBisel(d2, p.grueso, 1.5);
  if (p.txt && String(p.txt).trim()) { let T = N.centraCS(N.texto2(String(p.txt).trim(), p.fuente || 'gorda', 7.5)); const bt = N.cajaCS(T), k = Math.min(1, (L - 46) / bt.w); m = m.subtract(T.scale([k, k]).translate([0, Hh / 2 - 6.8]).extrude(1).translate([0, 0, p.grueso - 0.6])); }
  return m;
}
// 🥄 CUCHARA MEDIDORA: el vaso tiene JUSTO los mililitros que pone (cilindro con el rincón del fondo matado a 45°, alto = 1,2 × radio)
export function medidaCuchara(ml) {
  const V = ml * 1000; let a = 1, b = 90; for (let i = 0; i < 60; i++) { const r = (a + b) / 2, h = 1.2 * r, ch = Math.min(3, r / 3), v = Math.PI * (r * r * h - (r * r * ch - (r ** 3 - (r - ch) ** 3) / 3)); if (v < V) a = r; else b = r; }
  const r = (a + b) / 2; return { r, h: 1.2 * r, ch: Math.min(3, r / 3) };
}
function cuchara(ml, p) {
  const K = medidaCuchara(ml), w = 1.6, nL = 120, kp = 1 / Math.sqrt(nL / (2 * Math.PI) * Math.sin(2 * Math.PI / nL)), r = K.r * kp; // el polígono tiene el MISMO área que el círculo
  const dentro = CS().ofPolygons([N.ccw([[0, 0], [r - K.ch * kp, 0], [r, K.ch], [r, K.h + 1], [0, K.h + 1]])]).revolve(nL).translate([0, 0, w]);
  const lm = Math.max(46, Math.min(80, 40 + K.r * 1.6)), am = Math.max(11, Math.min(17, K.r * 0.9)), x1 = K.r + w + lm;
  const mango = N.csUnion([poli([[K.r * 0.5, -am / 2 - 1.5], [x1 - am / 2, -am / 2], [x1 - am / 2, am / 2], [K.r * 0.5, am / 2 + 1.5]]), circ(am).translate([x1 - am / 2, 0])]).subtract(circ(4.6).translate([x1 - am / 2, 0]));
  let m = M().cylinder(K.h + w, r + w, r + w, nL).add(mango.extrude(3.2)).subtract(dentro);
  const t = n2(ml) + ' ml'; let T = N.centraCS(N.texto2(t, 'gorda', Math.min(7, am * 0.5))); const bt = N.cajaCS(T), hueco = lm - am - 5, k = Math.min(1, hueco / bt.w);
  return m.subtract(T.scale([k, k]).translate([K.r + w + 2.5 + hueco / 2, 0]).extrude(1).translate([0, 0, 3.2 - 0.6]));
}
const JUEGO_CUCHARAS = [5, 15, 30, 60, 125];
// 🫗 EMBUDO: se imprime boca abajo (la boca ancha en la cama): todo sube hacia dentro, sin soportes. Con nervios en el caño (deja
// salir el aire de la botella y no hace «glup») y pestaña para colgarlo.
function embudo(p) {
  const D = p.boca, d = Math.min(p.cano, D - 20), Lc = p.largo, w = Math.max(1.2, p.pared), aro = 4, hc = (D - d) / 2 * Math.tan(52 * R2), dp = Math.max(6, d - 2.4);
  const fuera = torno([[D / 2, 0], [D / 2, aro], [d / 2, aro + hc], [dp / 2, aro + hc + Lc]], D), dentro = torno([[D / 2 - w, -1], [D / 2 - w, aro - 0.2], [d / 2 - w, aro + hc - 0.2], [dp / 2 - w, aro + hc + Lc + 1]], D);
  let m = fuera;
  const Nv = []; for (let i = 0; i < 3; i++) Nv.push(M().hull([caja(1.3, 0.02, Lc * 0.8).translate([0, d / 2 + 0.9, 0]), caja(1.3, 0.02, Lc * 0.8).translate([0, dp / 2 - 0.6, 0])]).translate([0, 0, aro + hc + Lc * 0.08]).rotate([0, 0, i * 120 + 60]));
  m = m.add(N.union(Nv).intersect(torno([[D, 0], [D, aro + hc + Lc * 0.9], [dp / 2 + 0.2, aro + hc + Lc * 0.9]], D)));
  m = m.add(N.csUnion([rr(14, 16, 0).translate([D / 2 + 3, 0]), circ(16).translate([D / 2 + 10, 0])]).subtract(circ(6).translate([D / 2 + 10.5, 0])).extrude(3));
  return m.subtract(dentro);
}
// 🧼 JABONERA: bandeja que recoge el agua + rejilla que se saca (el jabón se seca y dura más)
function jaboneraPiezas(p) {
  const L = p.largo, W = p.ancho, H = p.alto, w = 2.2, re = Math.min(18, W / 4), zL = H - 6.5, hol = 0.35;
  let ban = rr(L, W, re).extrude(H).subtract(rr(L - 2 * w, W - 2 * w, re - w).extrude(H).translate([0, 0, 2]));
  // apoyos de la rejilla: costillas de pie pegadas a la pared (suben desde el fondo: sin voladizo)
  const C = [], nx = Math.max(2, Math.round(L / 45)); for (let i = 0; i < nx; i++) { const x = (i - (nx - 1) / 2) * (L - 2 * re - 6) / Math.max(1, nx - 1); [-1, 1].forEach(k => C.push(caja(4, 3.4, zL - 1).translate([x, k * (W / 2 - w - 1.5), 1]))); }
  [-1, 1].forEach(k => C.push(caja(3.4, 4, zL - 1).translate([k * (L / 2 - w - 1.5), 0, 1])));
  ban = ban.add(N.union(C));
  // rejilla: placa con ranuras y lomos (el jabón apoya solo en los lomos)
  const Lr = L - 2 * w - 2 * hol, Wr = W - 2 * w - 2 * hol, nr = Math.max(4, Math.round(Lr / 13)), paso = (Lr - 12) / nr, R = [], Lm = [];
  for (let i = 0; i < nr; i++) { const x = -Lr / 2 + 6 + paso * (i + 0.5); R.push(poli(N.ranura2(Wr - 16, Math.min(5.5, paso * 0.45))).rotate(90).translate([x, 0])); }
  for (let i = 0; i <= nr; i++) { const x = -Lr / 2 + 6 + paso * i; Lm.push(M().hull([caja(2.4, Wr - 22, 0.02), caja(0.8, Wr - 26, 0.02).translate([0, 0, 1.6])]).translate([x, 0, 2.99])); }
  const rej = rr(Lr, Wr, re - w - hol).subtract(N.csUnion(R)).extrude(3).add(N.union(Lm).intersect(rr(Lr - 4, Wr - 4, Math.max(1, re - w - 2)).extrude(8)));
  return { ban, rej, zL };
}
// 🥡 CIERRE DE BOLSAS CON TAPÓN: la bolsa sube por dentro de la boquilla, se dobla hacia fuera por encima de la rosca y el tapón
// se enrosca ENCIMA del plástico: queda cerrada y sirve para echar (arroz, pienso, azúcar…).
function cierraBolsasPiezas(p) {
  const d = p.paso, dT = d + 6.4, hR = 12, ala = dT + 13, hol = Math.max(0.15, Math.min(0.8, p.holgura));
  let boq = cil(ala, 2.4).add(N.rosca(dT, 3, hR).intersect(torno([[dT / 2 + 1, 0], [dT / 2 + 1, hR - 1.5], [dT / 2 - 1.2, hR]], dT + 2)).translate([0, 0, 2.39])).subtract(cil(d, hR + 6, -1)).subtract(cono(d + 2.4, d, 1.2, -0.01));
  const G = []; for (let i = 0; i < 12; i++) G.push(cil(5, 6, -1).translate([ala / 2 + 1.2, 0, 0]).rotate([0, 0, i * 30])); boq = boq.subtract(N.union(G));
  const De = dT + 7.5; let tap = torno([[De / 2 - 1.2, 0], [De / 2, 1.2], [De / 2, hR + 2.4]], De).subtract(N.rosca(dT, 3, hR + 0.5, true, hol).translate([0, 0, 2.4])).subtract(cono(dT + 0.6, dT + 3, 1.3, hR + 2.4 - 1.29));
  const F = []; for (let i = 0; i < 16; i++) F.push(cil(3.4, hR + 4, 3.2).add(cono(3.4, 0, 1.7, 1.5)).translate([De / 2 + 0.9, 0, 0]).rotate([0, 0, i * 22.5])); tap = tap.subtract(N.union(F));
  return { boq, tap, dT, De };
}
// 🤏 PINZAS: de una pieza, tumbadas; los brazos doblan «de canto» (a favor de las capas: no se parten)
function pinzas(p) {
  const L = p.largo, G = p.abre, A = 7, cola = 15, tB = 2.6, tP = p.punta === 'fina' ? 0.9 : 1.7, D = [];
  [-1, 1].forEach(k => { D.push(poli([[cola - 3, k * 0.25], [L, k * G / 2], [L, k * (G / 2 + tP)], [L * 0.55, k * (G / 2 * 0.52 + 2.5)], [cola - 3, k * (tB + 0.25)]])); });
  let d2 = N.csUnion(D.concat([rr(cola, 2 * tB + 3.4, 3.2).translate([cola / 2, 0])])).subtract(circ(1.7).translate([cola - 2.2, 0]));
  const Es = []; [-1, 1].forEach(k => { for (let i = 0; i < 7; i++) { const x = L * 0.4 + i * 3.2, y = k * (tB + 0.25 + (x - cola + 3) / (L * 0.55 - cola + 3) * (G / 2 * 0.52 + 2.5 - tB - 0.25)); Es.push(circ(1.8).translate([x, y + k * 0.45])); } });
  let m = d2.subtract(N.csUnion(Es)).extrude(A);
  // las puntas, más bajas (3 mm): ven mejor lo que cogen
  return m.subtract(poli([[L - 20, A + 0.01], [L + 1, A + 0.01], [L + 1, 3]]).extrude(G + 2 * tP + 8).rotate([90, 0, 0]).translate([0, (G + 2 * tP + 8) / 2, 0]));
}

export const DISENOS_UTILES = {
  mangoPuntas: { cat: 'taller', e: '🪛', t: 'Mango para puntas de 1/4" (con almacén)', d: 'Destornillador de puntas: dentro guarda 5 y la tapa va a rosca', uso: 'funcional', color: '#ff6a13',
    campos: [s('que', 'Qué imprimo', 'todo', [['todo', 'Mango y tapa'], ['mango', 'Solo el mango'], ['tapa', 'Solo la tapa']]), n('largo', 'Largo', 105, 80, 140, 1), n('d', 'Grosor (diámetro)', 31, 27, 40, 0.5), c('almacen', 'Con almacén de puntas y tapa de rosca', true),
      s('encaje', 'Cómo entra la punta', 'justo', [['presion', 'Dura (0,05)'], ['justo', 'Encaja (0,10)'], ['gira', 'Suelta (0,15)']]), c('iman', 'Hueco para un imán al fondo (sujeta la punta)', false), n('imanD', 'Imán: diámetro', 6, 3, 6, 0.1), n('imanH', 'Imán: alto', 3, 1, 6, 0.5)],
    gen(p) { const K = mangoPiezas(p); if (p.que === 'tapa') { if (!K.tapa) N.mal('Marca «Con almacén» para tener tapa.'); return K.tapa; } return p.que === 'mango' || !K.tapa ? K.mango : enFila([K.mango, K.tapa], 8); },
    nota: p => { const K = { dT: 2 * Math.max(13.5, p.d / 2) - 7 }; return 'Para puntas de 1/4" (6,35 mm entre caras, las de siempre): el hueco mide ' + n2(PUNTA + 2 * (ENCAJES[p.encaje] ?? ENCAJES.justo)) + ' mm y tiene 12,5 de hondo. ' + (p.almacen ? 'Dentro caben 5 puntas de 25 mm y la tapa se enrosca (rosca redonda de Ø' + n2(K.dT) + ', paso 3, con TU holgura «gira»). ' : '') + (p.iman ? 'El imán de Ø' + n2(p.imanD) + ' × ' + n2(p.imanH) + ' se mete por la boca y se empuja hasta el fondo con una punta (entra a presión). ' : '') + 'Se imprime DE PIE como sale (la boca en la cama), sin soportes; la tapa, con la cabeza en la cama. Con 4 paredes y 25 % de relleno aguanta apretar a mano; no es para hacer palanca.'; } },
  soportePuntas: { cat: 'taller', tambien: ['organizar'], e: '🧲', t: 'Regleta de puntas en gradas', d: 'Cada punta en su hueco, la fila de atrás más alta', uso: 'funcional', color: '#1b1b1d',
    campos: [n('n', 'Puntas por fila', 8, 3, 18, 1, ''), n('filas', 'Filas', 2, 1, 4, 1, ''), c('imanes', 'Dos huecos para imanes debajo (para pegarla a la caja de herramientas)', false), n('imanD', 'Imán: diámetro', 8, 4, 12, 0.5), n('imanH', 'Imán: alto', 3, 1, 5, 0.5)],
    gen(p) { return regletaPuntas(p); },
    nota: p => Math.round(p.n) * Math.round(p.filas) + ' huecos de 1/4" con tu holgura «gira» (' + n2(PUNTA + 2 * ENCAJES.gira) + ' mm entre caras, 10 de hondo): la punta entra y sale con dos dedos y no baila. ' + (p.imanes ? 'Los imanes se meten por debajo, a presión. ' : '') + 'Sin soportes, tal cual sale.' },
  galgaRadios: { cat: 'taller', tambien: ['mecanica'], e: '📐', t: 'Galgas de radios', d: 'Para saber qué radio tiene una esquina (de dentro y de fuera)', uso: 'funcional', color: '#f7d117',
    campos: [n('desde', 'Desde el radio', 1, 0.5, 30, 0.5), n('hasta', 'Hasta el radio', 10, 1, 40, 0.5), n('paso', 'De cuánto en cuánto', 1, 0.5, 5, 0.5), n('grosor', 'Grosor de las hojas', 2, 1.2, 3, 0.2)],
    gen(p) { const L = listaGalgas(p); if (!L.length) N.mal('Con esos radios no sale ninguna hoja.'); return enRejilla(L.map(r => hojaGalga(r, p.grosor)), 190, 4); },
    nota: p => { const L = listaGalgas(p); return L.length + ' hojas: R' + L.map(n2).join(', R') + '. La esquina redonda de arriba mide rincones (radio de dentro) y la muesca de abajo abraza esquinas (radio de fuera): la hoja que apoya sin dejar pasar luz es tu radio. Agujero de Ø4,3 para unirlas con un tornillo M4 o una anilla. Se imprimen tumbadas; para que el borde salga fino, capa de 0,12–0,16.'; } },
  pinzas: { cat: 'taller', tambien: ['hogar'], e: '🤏', t: 'Pinzas de precisión', d: 'De una pieza: para tornillitos, pegatinas, abalorios o quitar hilos de las impresiones', uso: 'funcional', color: '#1b1b1d',
    campos: [n('largo', 'Largo', 120, 80, 180, 5), n('abre', 'Abertura en la punta', 10, 6, 20, 1), s('punta', 'Punta', 'fina', [['fina', 'Fina (0,9 mm)'], ['plana', 'Plana (1,7 mm)']])],
    gen(p) { return pinzas(p); },
    nota: p => 'Se imprimen TUMBADAS como salen: así los brazos doblan a favor de las capas y no se parten. Punta ' + (p.punta === 'fina' ? 'fina de 0,9 mm' : 'plana de 1,7 mm') + ' y rebajada a 3 mm de alto para ver lo que coges; estrías para los dedos. El agujerito de la unión reparte el esfuerzo (ahí es donde se romperían). En PETG tienen mejor muelle; en PLA valen, sin forzarlas. Sin soportes.' },
  exprimeTubos: { cat: 'hogar', e: '🪥', t: 'Exprime-tubos', d: 'Saca hasta lo último de la pasta de dientes, cremas o pinturas', uso: 'funcional', color: '#41c3bd',
    campos: [n('ancho', 'Ancho del tubo aplastado (mídelo)', 55, 20, 110, 1), n('ranura', 'Ranura (grosor del tubo aplastado)', 1.8, 1, 4, 0.1)],
    gen(p) { return exprimeTubos(p); },
    nota: p => 'Mete el final del tubo por la ranura (' + n2(p.ancho + 3 + p.ranura) + ' × ' + n2(p.ranura) + ' mm) y empuja hacia la boca: lo de dentro va delante y la pieza se queda puesta. La entrada va abocinada para que el tubo entre solo y no se corte. Tubos de plástico: ranura 1,8; de aluminio (pinturas, pomadas): 1,2. Sin soportes.' },
  asaBolsas: { cat: 'hogar', e: '🛍️', t: 'Asa para llevar bolsas', d: 'Las asas de las bolsas no se clavan en los dedos', uso: 'funcional', color: '#ff6a13',
    campos: [n('largo', 'Largo', 120, 100, 160, 5), n('grueso', 'Grosor', 14, 10, 20, 1), tx('txt', 'Nombre o frase', '')],
    gen(p) { return asaBolsas(p); },
    nota: p => 'Las asas de las bolsas entran por la ranura de abajo y se reparten a los dos lados (los dos topes no las dejan salirse). Agarre con ondas para los dedos y todos los cantos matados. Imprímela TUMBADA como sale, con 4 paredes y 30 % de relleno: así tira a favor de las capas y aguanta la compra. Sin soportes.' },
  cucharaMedidora: { cat: 'hogar', e: '🥄', t: 'Cuchara medidora exacta', d: 'El vaso tiene justo los mililitros que pone grabado', uso: 'funcional', color: '#f4f4f0',
    campos: [s('que', 'Qué imprimo', 'una', [['una', 'Una cuchara'], ['juego', 'El juego de 5 (5 · 15 · 30 · 60 · 125 ml)']]), n('ml', 'Mililitros', 15, 1, 250, 0.5, 'ml')],
    gen(p) { return p.que === 'juego' ? enRejilla(JUEGO_CUCHARAS.map(v => cuchara(v, p)), 230, 5) : cuchara(Math.max(1, p.ml), p); },
    nota: p => { const K = medidaCuchara(Math.max(1, p.ml)); return (p.que === 'juego' ? 'Cinco cucharas: 5 ml (cucharadita), 15 ml (cucharada), 30, 60 y 125 ml (media taza). ' : 'Vaso de Ø' + n2(2 * K.r) + ' × ' + n2(K.h) + ' mm por dentro: ' + n2(p.ml) + ' ml exactos al ras. ') + 'La medida va grabada en el mango, que lleva agujero para colgarla. Para café, pienso, detergente, abono o resina va perfecta en PLA; para COMIDA imprímela en PETG, con capa fina, y lávala a mano (el plástico impreso tiene poros). Sin soportes.'; } },
  embudo: { cat: 'hogar', tambien: ['taller'], e: '🫗', t: 'Embudo con respiradero', d: 'No hace «glup»: los nervios del caño dejan salir el aire', uso: 'funcional', color: '#00a4e4',
    campos: [n('boca', 'Boca (diámetro)', 90, 40, 180, 5), n('cano', 'Caño (diámetro por fuera)', 16, 6, 40, 0.5), n('largo', 'Largo del caño', 38, 15, 90, 1), n('pared', 'Pared', 1.4, 1.2, 2.4, 0.2)],
    gen(p) { return embudo(p); },
    nota: p => 'Se imprime BOCA ABAJO como sale (la boca ancha en la cama): todo sube hacia dentro y no necesita soportes. El caño mide Ø' + n2(Math.min(p.cano, p.boca - 20)) + ' arriba y Ø' + n2(Math.max(6, Math.min(p.cano, p.boca - 20) - 2.4)) + ' en la punta, con 3 nervios por fuera: al meterlo en una botella queda un hueco por donde sale el aire. Con pestaña para colgarlo. Con pared de 1,4 usa 3 paredes para que no gotee por las capas.' },
  jabonera: { cat: 'hogar', e: '🧼', t: 'Jabonera con rejilla', d: 'El agua cae a la bandeja y el jabón se seca: dura el doble', uso: 'encaje', color: '#c08ee8',
    campos: [s('que', 'Qué imprimo', 'todo', [['todo', 'Bandeja y rejilla'], ['bandeja', 'Solo la bandeja'], ['rejilla', 'Solo la rejilla']]), n('largo', 'Largo', 125, 90, 180, 5), n('ancho', 'Ancho', 88, 65, 130, 1), n('alto', 'Alto', 24, 18, 40, 1)],
    gen(p) { const K = jaboneraPiezas(p); return p.que === 'bandeja' ? K.ban : p.que === 'rejilla' ? K.rej : enFila([K.ban, K.rej], 8); },
    nota: p => 'Dos piezas: la bandeja recoge el agua y la rejilla apoya en unas costillas, 6,5 mm por debajo del borde (holgura 0,35 por lado: entra y sale sin atascarse). El jabón apoya solo en los lomos. Para vaciarla, saca la rejilla y vuelca. En PETG aguanta mejor el agua caliente. Sin soportes.' },
  cierraBolsas: { cat: 'hogar', e: '🥡', t: 'Cierre de bolsas con tapón de rosca', d: 'Cierra la bolsa de arroz, pienso o azúcar y sirve para echar', uso: 'encaje', color: '#00ae42',
    campos: [s('que', 'Qué imprimo', 'todo', [['todo', 'Boquilla y tapón'], ['boquilla', 'Solo la boquilla'], ['tapon', 'Solo el tapón']]), n('paso', 'Paso libre (por dónde sale)', 26, 14, 50, 1), n('holgura', 'Holgura de la rosca (deja sitio al plástico de la bolsa)', 0.4, 0.15, 0.8, 0.05)],
    gen(p) { const K = cierraBolsasPiezas(p); return p.que === 'boquilla' ? K.boq : p.que === 'tapon' ? K.tap : enFila([K.boq, K.tap], 8); },
    nota: p => 'Pasa la boca de la bolsa por DENTRO de la boquilla, de abajo arriba, dóblala hacia fuera por encima de la rosca y enrosca el tapón encima: el plástico queda pillado en la rosca y la bolsa, cerrada. La rosca (Ø' + n2(p.paso + 6.4) + ', paso 3) lleva ' + n2(p.holgura) + ' mm de holgura para que quepa el plástico: con bolsas gordas (pienso) súbela a 0,5; con bolsas finas, 0,3. Es pequeño y gasta poco: imprime uno y pruébalo con tu bolsa antes de hacer más. El tapón se imprime boca arriba, como sale. Sin soportes.' },
  pieDeRey: { cat: 'taller', tambien: ['mecanica'], e: '📏', t: 'Pie de rey PRO (calibre con nonio y muelles)', d: 'Sin holgura (dos muelles), nonio largo de décimas, bocas de filo para fuera y para dentro; sale corregido con la calibración de tu Bambu', uso: 'mecanica', color: '#f4f4f0',
    campos: [s('que', 'Qué imprimo', 'todo', [['todo', 'Regla y corredera'], ['regla', 'Solo la regla'], ['corredera', 'Solo la corredera'], ['montado', '👀 Verlo montado (solo para mirar)']]), n('rango', 'Mide hasta', 150, 60, 190, 10), n('boca', 'Largo de las bocas', 40, 25, 60, 1),
      n('ajuste', 'Holgura de la corredera (por lado)', 0.15, 0.05, 0.4, 0.05), n('cero', 'Ajuste del cero (lo que marca CERRADO)', 0, -1, 1, 0.05), tx('txt', 'Tu nombre o tus iniciales (en la cabeza)', '')],
    gen(p) { const K = calibrePiezas(p); if (p.que === 'regla') return K.regla; if (p.que === 'corredera') return K.corr; if (p.que === 'montado') return K.regla.add(K.montada(Math.min(32, K.rango / 3)));
      return K.regla.add(K.corr.translate([CAL.J + 22, -(K.yN + K.Nh) - 4, 0])); },
    nota: p => { let C = null; try { C = compruebaCalibre(p); } catch (e) { return '⚠️ ' + e.message; } const rango = Math.max(50, Math.round(p.rango / 10) * 10), largo = rango + CAL.Ls + 14 + CAL.J;
      if (p.que === 'montado') return '👀 Esto es solo para VERLO montado. Para imprimirlo elige «Regla y corredera»: salen las dos planas, sin soportes.';
      let A = null; try { A = CPR.activa(); } catch (e) { }
      const cal = A ? '🎯 CALIBRADO CON TU IMPRESORA: al mandarlo a Bambu desde aquí va ya corregido con tu probeta («' + A.clave + '»: ' + CPR.texto(A) + '). No toques nada. '
        : '🎯 PARA QUE SALGA CALIBRADO: aún no has hecho la probeta de tu impresora (CelebriR8 → Catálogo → «Probeta de precisión»: 33 minutos, una vez). En cuanto guardes sus medidas, este pie de rey (y todo lo demás) sale corregido solo al mandarlo a Bambu. Sin ella también funciona, pero el cero puede irse 0,1–0,2 mm. ';
      return cal + (C.roce < 0.01 && C.sube > 0.01 && C.cruza > 0.01 && C.muelle > 0.001 ? 'COMPROBADO (en el ordenador): la corredera corre de 0 a ' + rango + ' mm sin rozar, no se puede levantar (cola de milano), cerrada hace tope justo en el 0 y los dos muelles aprietan ' + n2(CAL.muelle) + ' mm: no cabecea' : '⚠️ Con esta holgura algo no va (roce ' + n2(C.roce) + ' mm³): déjala en 0,15') + '. La corredera entra por la punta de la regla (va afilada para eso). CÓMO SE LEE: los milímetros, en la regla, justo a la izquierda del 0 del nonio; la décima, el número del nonio cuya raya coincide con una de la regla (nonio largo: rayas cada 1,9 mm, se ven sin lupa). COMPRUÉBALO: cerrado tiene que marcar 0 y una moneda de 1 € tiene que dar 23,2–23,3 (mide 23,25). Si cerrado marcara otra cosa, escríbela en «Ajuste del cero» y vuelve a imprimir SOLO la corredera. Las bocas de arriba miden por DENTRO. Pasa un rotulador permanente por las rayas (están en relieve) o cambia de color a los ' + n2(CAL.tb) + ' mm (regla) y a los ' + n2(CAL.tp + CAL.cz + CAL.tb) + ' mm (corredera). Mide ' + n2(largo) + ' mm de largo' + (largo > 178 ? ' (cabe en la P1P; para la A1 mini pon «Mide hasta» 90)' : ' (cabe también en la A1 mini)') + '. Imprímelo con el perfil «0.16mm CelebriR8 PRECISION», en PETG o PLA. Es de plástico: fíate a ±0,1–0,2 mm; para ajustes muy finos, el de metal.'; } },
  cajaBisagra: { cat: 'taller', tambien: ['organizar'], e: '🧰', t: 'Caja de tornillería con tapa de bisagra', d: 'Se imprime de una vez y sale montada: bisagra, cierre de clic y casillas que llegan a la tapa', uso: 'encaje', color: '#f7d117',
    campos: [s('que', 'Qué imprimo', 'caja', [['caja', 'La caja entera (sale abierta y montada)'], ['prueba', '🧪 Prueba pequeña (bisagra + cierre)'], ['cerrada', '👀 Verla cerrada (solo para mirar)'], ['media', '👀 Verla a medio abrir (solo para mirar)']]), n('x', 'Ancho', 120, 50, 240), n('y', 'Fondo', 80, 30, 115), n('z', 'Alto de la base', 28, 14, 80), n('tapa', 'Alto de la tapa', 12, 8, 40),
      n('cx', 'Casillas a lo ancho', 3, 1, 8, 1, ''), n('cy', 'Casillas a lo largo', 2, 1, 5, 1, ''), c('rampa', 'Fondo en rampa hacia delante (los tornillos salen con el dedo)', true), n('pared', 'Paredes', 2.4, 2, 4, 0.2),
      n('holgura', 'Holgura de la bisagra (para imprimir de una vez)', 0.5, 0.35, 0.8, 0.05), tx('txt', 'Texto en la tapa', '')],
    gen(p) { const K = cajaBisagraPiezas(p.que === 'prueba' ? PRUEBA_BIS(p) : p); if (p.que === 'cerrada') return K.base.add(K.tapa.translate([0, 0, 0.03])); // (3 centésimas arriba: si se fundieran, el hueco de dentro quedaría cerrado y se contaría macizo)
      return K.base.add(K.gira(K.tapa, p.que === 'media' ? 62 : 180)); },
    nota: p => { let G = null; try { G = giroCajaBisagra(p); } catch (e) { return '⚠️ ' + e.message; }
      const fondo = 2 * (p.que === 'prueba' ? 34 : p.y) + 2 * (BIS.R + BIS.hueco) + 6, bien = G.cerrada < 0.01 && G.libre < 0.01;
      if (p.que === 'cerrada' || p.que === 'media') return '👀 Esto es solo para VERLA (así queda ' + (p.que === 'cerrada' ? 'cerrada' : 'a medio abrir') + '). Para imprimirla elige «La caja entera»: sale abierta y plana, sin soportes.';
      const suelta = G.pegada < 0.005;
      return (bien && suelta ? 'COMPROBADA EN EL ORDENADOR: de abierta del todo a cerrada la tapa gira sin rozar, y tal como se imprime ninguna parte de la tapa queda a menos de ' + n2(G.sep) + ' mm de la base (no deben salir soldadas)' : !bien ? '⚠️ Con estas medidas algo roza al girar (' + n2(Math.max(G.cerrada, G.libre)) + ' mm³): cambia el alto de la tapa o la holgura' : '⚠️ Con esta holgura la tapa queda a menos de ' + n2(G.sep) + ' mm de la base al imprimir: súbela, o saldrán pegadas') + (G.clic > 0.005 ? '. Al cerrar, el diente salta el nervio (' + n2(BIS.solape) + ' mm de «clic»)' : '') + '. REFORZADA (la primera versión se partía): paredes de ' + n2(G.w) + ' mm, techo y suelo de 2, nudos de Ø10 con conos de Ø7,6 y lengüeta de ' + n2(G.tG) + ' × ' + n2(G.largoLeng) + ' mm que al saltar se estira un ' + n2(G.estira * 100) + ' %' + (G.estira > 0.005 ? ' (⚠️ es mucho para PLA, que entre capas aguanta poco más: imprímela en PETG o sube el alto de la tapa)' : ' (poco: el PLA aguanta cerca del 1 % entre capas)') + '. Sale ABIERTA y montada: ocupa ' + n2(fondo) + ' mm de fondo en la cama' + (fondo > 178 ? ' (cabe en la P1P; para la A1 mini, baja el «Fondo»)' : ' (cabe también en la A1 mini)') + '. Bisagra de conos a 45° con ' + n2(p.holgura) + ' mm de holgura: nada cuelga y no lleva eje. Al sacarla, ábrela y ciérrala despacio la primera vez. LO QUE NO SE PUEDE COMPROBAR SIN IMPRIMIR es si tu filamento la deja suelta: ' + (p.que === 'prueba' ? 'para eso es esta PRUEBA (pocos gramos, misma bisagra y mismo cierre). Si gira y hace clic, imprime la grande con esa holgura; si sale dura, sube la holgura 0,05. ' : 'imprime antes la 🧪 prueba. ') + 'Las casillas suben dentro de la tapa: cerrada, los tornillos no se pasan de una a otra. Sin soportes. En PETG el cierre dura más que en PLA.'; } },
};

// (v30.5) las ayudas de este archivo, para los demás módulos de útiles (chasis RC, kits de juguete…)
// v30.6 · MÁS ESTILOS DE CAJA con la MISMA bisagra y el mismo cierre (los comprobados): cambian las medidas de partida, las casillas y el adorno
const estiloCaja = (o) => { const B = DISENOS_UTILES.cajaBisagra; return Object.assign({}, B, { cat: o.cat, tambien: o.tambien, e: o.e, t: o.t, d: o.d, color: o.color, acabado: o.acabado,
  campos: B.campos.map(f => (o.def && f.k in o.def ? Object.assign({}, f, { v: o.def[f.k] }) : f)), gen: p => B.gen(Object.assign({}, p, { estilo: o.estilo })), nota: p => B.nota(Object.assign({}, p, { estilo: o.estilo })) }); };
Object.assign(DISENOS_UTILES, {
  cofreBisagra: estiloCaja({ estilo: 'cofre', cat: 'organizar', tambien: ['ninos', 'regalos', 'frikis'], e: '🪙', t: 'Cofre con bisagra y cierre', d: 'De tablas, para tesoros, dados o recuerdos: sale montado, con la bisagra reforzada', color: '#9d6d3f', def: { x: 110, y: 75, z: 40, tapa: 30, cx: 1, cy: 1, rampa: false } }),
  joyeroBisagra: estiloCaja({ estilo: 'joyero', cat: 'cuqui', tambien: ['regalos', 'organizar'], e: '💍', t: 'Joyero con bisagra', d: 'Bajo y con casillas para anillos y pendientes; el nombre grabado en la tapa', color: '#f4a8c8', acabado: 'seda', def: { x: 120, y: 85, z: 22, tapa: 14, cx: 3, cy: 2, rampa: false, txt: 'Joyas' } }),
  estucheBisagra: estiloCaja({ estilo: 'estuche', cat: 'organizar', tambien: ['ninos', 'taller'], e: '✏️', t: 'Estuche con bisagra', d: 'Largo y bajo: lápices, pinceles, brocas o destornilladores de precisión', color: '#1565d8', def: { x: 210, y: 70, z: 20, tapa: 14, cx: 1, cy: 1, rampa: false } }),
  botiquinBisagra: estiloCaja({ estilo: 'botiquin', cat: 'hogar', tambien: ['organizar'], e: '🩹', t: 'Botiquín con bisagra', d: 'Alto y con casillas: tiritas, pastillas, hilos…', color: '#f4f4f0', def: { x: 150, y: 100, z: 45, tapa: 20, cx: 3, cy: 2, rampa: false, txt: 'Botiquín' } }),
});
// las PARTES sueltas (para pasarlas al Estudio por piezas y poder abrirla): la base y la tapa CERRADA, con su eje de giro
const partesCaja = estilo => p => { const K = cajaBisagraPiezas(Object.assign({}, p.que === 'prueba' ? PRUEBA_BIS(p) : p, { estilo })); return [{ nombre: 'Base', m: K.base }, { nombre: 'Tapa', m: K.tapa, bisagra: { o: [0, -K.g, K.h], dir: [1, 0, 0], ang: 180 } }]; };
export const PARTES_UTILES = { cajaBisagra: partesCaja(''), cofreBisagra: partesCaja('cofre'), joyeroBisagra: partesCaja('joyero'), estucheBisagra: partesCaja('estuche'), botiquinBisagra: partesCaja('botiquin') };
export const AYUDAS = { n, s, c, tx, M, CS, seg, circ, rr, poli, cil, cono, caja, n2, R2, suave, aLoLargoX, porY, torno, hex, texto3d, enFila, enRejilla, conBisel };
