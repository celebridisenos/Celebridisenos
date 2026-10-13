// ================= 13-10-2026 · 🎁 DISEÑOS NUEVOS: juegos y canicas · casa y organizadores · PRO y mecánica =================
// La dueña: «necesito más diseños para mi programa, más elementos» → «juegos, canicas y kits niños · casa y organizadores · PRO por
// piezas y mecánica». Diseños PROPIOS (nada copiado), con sus holguras (0,05 a presión · 0,10 encaja · 0,15 gira; lo que se imprime YA
// MONTADO lleva 0,4) y pensados para imprimirse SIN soportes. Lo que encaja con otra pieza se calcula (no se deja a ojo).
import * as N from './nucleo.js';
import * as G from './engranajes.js';
import { circulo, rectR, ENCAJES } from './motor.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const circ = (d, x = 0, y = 0) => N.cs([N.ccw(circulo(d / 2, x, y, seg(d)))], 'Positive');
const rr = (w, h, r = 0, x = 0, y = 0) => N.cs([N.ccw(rectR(w, h, r, x, y))], 'Positive');
const cil = (d, h, z = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([0, 0, z]);
const caja = (x, y, z, cx = 0, cy = 0, cz = 0) => M().cube([x, y, z], true).translate([cx, cy, cz + z / 2]);
const RAD = Math.PI / 180, J = ENCAJES.justo, GI = ENCAJES.gira, PR = ENCAJES.presion, EN_SITIO = 0.4; // (lo impreso ya montado: 0,4)
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const enFila = (L, sep = 6, ancho = 230) => { let x = 0, y = 0, alto = 0; return L.map(m => { const b = N.caja(m); if (x > 0 && x + b.dims[0] > ancho) { x = 0; y += alto + sep; alto = 0; } const o = m.translate([x - b.min[0], y - b.min[1], -b.min[2]]); x += b.dims[0] + sep; alto = Math.max(alto, b.dims[1]); return o; }); };
const vol = (a, b) => { try { const v = a.intersect(b).volume(); return v > 0 ? v : 0; } catch (e) { return 0; } };
const texto = (t, alto, h) => N.centraCS(N.texto2(String(t), 'gorda', alto)).extrude(h);

// ======================= 🎢 TORRE DE CANICAS EN ZIGZAG (pisos iguales que se apilan) =======================
// Cada piso es una rampa con su agujero al final; el de debajo va GIRADO media vuelta, así su rampa empieza justo debajo del agujero
// (calculado: el agujero cae en el primer tramo de la rampa de abajo). Encajan con 4 tetones; le pones los pisos que quieras.
export function zigzagMedidas(p) {
  const b = p.bola, pared = 2.4, cw = b + 2.5, L = p.largo, W = cw + 2 * pared, xs = -L / 2 + pared, xe = L / 2 - pared;
  const drop = (xe - xs) * Math.tan(p.pend * RAD), fondo = 2, prof = b * 0.62, Hp = fondo + drop + prof, dh = b + 3, xh = xe - dh / 2 - 0.6;
  return { b, pared, cw, L, W, xs, xe, drop, fondo, prof, Hp, dh, xh, teton: 5, tz: 3 };
}
function pisoZigzag(Z) {
  const { L, W, cw, xs, xe, drop, fondo, Hp, dh, xh } = Z, zf = x => fondo + drop * (xe - x) / (xe - xs);
  let m = caja(L, W, Hp);
  const hueco = N.cs([N.ccw([[xs, zf(xs)], [xe, zf(xe)], [xe, Hp + 1], [xs, Hp + 1]])], 'Positive').extrude(cw).rotate([90, 0, 0]).translate([0, cw / 2, 0]);
  m = m.subtract(hueco).subtract(cil(dh, Hp + 2, -1).translate([xh, 0, 0]));
  const esq = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b2]) => [a * (L / 2 - 5.5), b2 * (W / 2 - 0.01) * 0]);
  // los tetones van en las esquinas, en las paredes de los extremos (fuera de la rampa)
  const T = [[L / 2 - 1.2 - 2.5, W / 2 - 3], [L / 2 - 1.2 - 2.5, -W / 2 + 3], [-L / 2 + 1.2 + 2.5, W / 2 - 3], [-L / 2 + 1.2 + 2.5, -W / 2 + 3]]; void esq;
  return { m, T };
}
function torreZigzag(p) {
  const Z = zigzagMedidas(p), { L, W, Hp } = Z, P = pisoZigzag(Z), dT = 3.2;
  // tetones arriba y agujeros abajo (en las paredes de los extremos, que son macizas)
  const extremo = x => caja(Z.pared + 0.01, W, Hp, x, 0, 0); void extremo;
  let piso = P.m;
  // las paredes de los extremos se engordan hacia fuera para que quepan los tetones (6 mm de pared de punta)
  piso = piso.add(caja(6, W, Hp, L / 2 + 3 - 0.01, 0, 0)).add(caja(6, W, Hp, -L / 2 - 3 + 0.01, 0, 0));
  const Tx = [L / 2 + 3, -L / 2 - 3], Ty = [W / 2 - 4, -W / 2 + 4], T = Tx.flatMap(x => Ty.map(y => [x, y]));
  T.forEach(([x, y]) => { piso = piso.add(cil(dT, Z.tz, Hp - 0.01).translate([x, y, 0])).subtract(cil(dT + 2 * J, Z.tz + 0.4, -0.01).translate([x, y, 0])); });
  const pisos = Array.from({ length: Math.round(p.pisos) }, (_, i) => piso);
  // la base: una bandeja que recoge las canicas, con los tetones para el primer piso
  const Lb = L + 12, Wb = W + 40; let base = caja(Lb, Wb, 14).subtract(caja(Lb - 6, Wb - 6, 14, 0, 0, 2.4)).add(caja(12, W, 14, L / 2 + 3, 0, 0).subtract(caja(12, W, 14, L / 2 + 3, 0, 0)));
  T.forEach(([x, y]) => { base = base.add(cil(8, 14, 0).translate([x, y, 0])).add(cil(dT, Z.tz, 14 - 0.01).translate([x, y, 0])); });
  // el embudo de arriba (encaja en el piso más alto, sobre el principio de su rampa)
  let tapa = caja(L + 12, W, 3).add(cil(Math.min(3 * Z.b, W + 26), 12, 3).translate([Z.xs + Z.cw / 2 + 2, 0, 0]));
  tapa = tapa.subtract(M().cylinder(12.02, (Z.b + 3) / 2, Math.min(3 * Z.b, W + 26) / 2 - 1.6, 64).translate([Z.xs + Z.cw / 2 + 2, 0, 2.99])).subtract(cil(Z.b + 3, 4, -0.5).translate([Z.xs + Z.cw / 2 + 2, 0, 0]));
  T.forEach(([x, y]) => { tapa = tapa.subtract(cil(dT + 2 * J, Z.tz + 0.4, -0.01).translate([x, y, 0])); });
  if (p.ver === 'montada') { // de abajo arriba, cada piso girado media vuelta respecto al de abajo; el de arriba (el último) va como sale
    const L2 = [base]; let z = 14; const n0 = pisos.length; pisos.forEach((m, i) => { const g = (n0 - 1 - i) % 2 ? m.rotate([0, 0, 180]) : m; L2.push(g.translate([0, 0, z])); z += Hp; }); L2.push(tapa.translate([0, 0, z])); return N.union(L2); }
  return N.union(enFila([base, ...pisos, tapa], 8, 250));
}

// ======================= 🔴 CUATRO EN LÍNEA (7 × 6, con barra para soltar las fichas) =======================
function cuatroEnLinea(p) {
  const d = p.d, t = p.t, w = 3, e = 2.4, hueco = t + 1.2, px = d + 1 + w, filas = 6, cols = 7, fila = d + 0.6, yb = 7, H = yb + filas * fila + 6, W = cols * px + w;
  const xc = i => -W / 2 + w + px * i + (px - w) / 2, yc = j => yb + fila * j + fila / 2;
  // panel delantero (con los divisores encima: se imprime tumbado) y trasero (con los agujeros de los tetones)
  let ventanas = []; for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) ventanas.push(circ(d - 5, xc(i), yc(j)));
  const panel2 = rr(W, H, 4, 0, H / 2).subtract(N.csUnion(ventanas)), panel = panel2.extrude(e);
  let delantero = panel; const tet = [];
  for (let k = 0; k <= cols; k++) { const x = -W / 2 + w / 2 + px * k, exterior = k === 0 || k === cols, y0 = exterior ? 0 : yb, Ld = H - y0;
    let dv = caja(w, Ld, hueco, x, y0 + Ld / 2, e - 0.01); if (exterior) dv = dv.subtract(caja(w + 2, 5.4, hueco + 2, x, 1 + 2.7, e - 1)); delantero = delantero.add(dv);
    [y0 + 8, H - 8].forEach(y => tet.push([x, y])); }
  tet.forEach(([x, y]) => { delantero = delantero.add(cil(2.6, 2, e + hueco - 0.01).translate([x, y, 0])); });
  let trasero = panel; tet.forEach(([x, y]) => { trasero = trasero.subtract(cil(2.6 + 2 * PR, 2.4, -0.2).translate([x, y, 0])); });
  // la barra: entra por los dos laterales, debajo de la primera fila; al sacarla, caen las fichas
  const barra = caja(W + 30, 4.4, hueco - 0.5, 0, 0, 0).add(cil(12, hueco - 0.5).translate([W / 2 + 15, 0, 0]));
  // las patas: abrazan el marco por los lados (ranura = el grueso del marco + holgura) y lo levantan 22 mm
  const grueso = 2 * e + hueco, pata = caja(16, 70, 30).subtract(caja(16.2, grueso + 2 * J, 30, 0, 0, 22));
  const fichas = Array.from({ length: p.que === 'todo' ? 42 : 21 }, () => M().cylinder(t, d / 2 - 0.6, d / 2, seg(d)).add(M().cylinder(0.6, d / 2, d / 2 - 0.6, seg(d)).translate([0, 0, t - 0.01])).subtract(cil(d - 8, 0.8, t - 0.6)));
  if (p.que === 'fichas') return N.union(enFila(fichas.slice(0, 21), 3, 7 * (d + 3)));
  const marco = enFila([delantero, trasero, barra, pata, pata.mirror([1, 0, 0])], 8, 250);
  return p.que === 'marco' ? N.union(marco) : N.union(marco.concat(enFila(fichas, 3, 7 * (d + 3)).map(m => m.translate([0, -8 * (d + 3) - 10, 0]))));
}

// ======================= ⚫ DAMAS (tablero 8 × 8 de dos colores + 24 fichas que se apilan para la dama) =======================
function damas(p) {
  const sq = p.casilla, b = 6, L = 8 * sq + 2 * b, e = 3, rel = 0.8;
  let tab = rr(L, L, 4).extrude(e); const osc = [];
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) osc.push(rr(sq - 0.01, sq - 0.01, 0, -L / 2 + b + sq * (i + 0.5), -L / 2 + b + sq * (j + 0.5)));
  tab = tab.add(N.csUnion(osc).extrude(rel).translate([0, 0, e - 0.01])).add(rr(L, L, 4).subtract(rr(L - 2 * b + 2, L - 2 * b + 2, 1)).extrude(rel).translate([0, 0, e - 0.01]));
  const df = sq - 2.5, ficha = () => cil(df, 5).add(cil(df * 0.55, 0.9, 4.99)).subtract(cil(df * 0.55 + 0.4, 1, -0.01)); // un botón arriba y su hueco abajo: dos fichas apiladas = dama
  const fichas = Array.from({ length: 24 }, ficha);
  if (p.que === 'fichas') return N.union(enFila(fichas, 3, 6 * (df + 3)));
  if (p.que === 'tablero') return tab;
  return N.union([tab].concat(enFila(fichas, 3, 6 * (df + 3)).map(m => m.translate([L / 2 + 8, -L / 2, 0]))));
}

// ======================= 🐍 SERPIENTE ARTICULADA (se imprime de una vez, ya montada) =======================
// Cada unión: un pasador VERTICAL (del segmento de delante) con un tope abajo y otro arriba, abrazado por una «C» del segmento de detrás.
// Todo en las mismas capas (sin piezas en el aire); los topes vuelan 1 mm como mucho. Holgura de lo impreso ya montado: 0,4.
function serpiente(p) {
  const nS = Math.round(p.segmentos), h = p.alto, g = EN_SITIO, L0 = p.largo / nS;
  const ancho = i => p.ancho * (1 - 0.55 * Math.pow(i / (nS - 1), 1.3)), largo = i => L0 * (1.08 - 0.25 * i / (nS - 1));
  let x = 0; const X = [0]; for (let i = 0; i < nS; i++) { x -= largo(i); X.push(x); } // X[i] = delante del segmento i; X[i+1] = su unión de atrás
  const partes = [];
  for (let i = 0; i < nS; i++) {
    const wi = ancho(i), xa = X[i], xb = X[i + 1]; // de xa (delante) a xb (detrás)
    const rp = Math.max(1.4, Math.min(2.4, wi * 0.13)), rC = rp + g + Math.max(1.8, wi * 0.12); // pasador y «C» de la unión de detrás (x = xb)
    const wPrev = i ? ancho(i - 1) : wi, rpP = Math.max(1.4, Math.min(2.4, Math.min(wPrev, wi) * 0.13)), rCP = rpP + g + Math.max(1.8, Math.min(wPrev, wi) * 0.12); void wPrev;
    // el cuerpo: de detrás de la «C» de delante a delante del pasador de detrás (con 0,4 de aire alrededor de lo que gira)
    const x0 = i ? xa - rCP - g + 0.4 : xa, x1 = i < nS - 1 ? xb + rC + g + 0.6 : xb;
    let cuerpo2 = rr(Math.max(1, x0 - x1), wi, wi * 0.42, (x0 + x1) / 2, 0);
    if (i === 0) cuerpo2 = cuerpo2.add(rr(xa - x1 + wi * 0.25, wi * 1.22, wi * 0.6, (xa + wi * 0.25 + x1) / 2, 0)); // la cabeza: más ancha y redonda, sin pasar de su sitio (antes se metía en la «C» del segundo)
    let cuerpo = cuerpo2.extrude(h);
    // el lomo: un chaflán arriba (más bonito y sin aristas)
    cuerpo = cuerpo.subtract(N.cs([N.ccw([[-500, h], [500, h], [500, h + 5], [-500, h + 5]])], 'Positive').extrude(1));
    if (i === 0) { const ojo = cil(2.2, 1.4, h - 1.2); cuerpo = cuerpo.subtract(ojo.translate([xa - wi * 0.55, wi * 0.28, 0])).subtract(ojo.translate([xa - wi * 0.55, -wi * 0.28, 0])); }
    if (i < nS - 1) { // atrás: el PASADOR con sus topes y el cuello que lo une al cuerpo
      const cuello = caja(rC + g + 1.2, Math.max(2.4, rp * 1.4), h, xb + (rC + g + 1.2) / 2, 0, 0);
      const pas = cil(2 * rp, h + 1.4).add(cil(2 * (rp + 1), 1)).add(cil(2 * (rp + 1), 1, h + 0.4)).translate([xb, 0, 0]);
      cuerpo = cuerpo.add(cuello.subtract(cil(2 * (rp + g + 0.01), h + 2, -1).translate([xb, 0, 0]))).add(pas);
    }
    if (i > 0) { // delante: la «C» que abraza el pasador del de delante (abierta 110° hacia delante: por ahí pasa su cuello)
      const ri = rpP + g, ro = rCP, ab = 55 * RAD, pts = [];
      for (let k = 0; k <= 40; k++) { const a = ab + (2 * Math.PI - 2 * ab) * k / 40; pts.push([xa + ro * Math.cos(a), ro * Math.sin(a)]); }
      for (let k = 40; k >= 0; k--) { const a = ab + (2 * Math.PI - 2 * ab) * k / 40; pts.push([xa + ri * Math.cos(a), ri * Math.sin(a)]); }
      const C = N.cs([N.ccw(pts)], 'Positive').extrude(h - 1.4 - 0.01 + 0.01).translate([0, 0, 1 + g]);
      cuerpo = cuerpo.add(C).add(caja(ro * 0.9, Math.max(3, ro * 1.2), h - 1.4, xa - ro - 0.2, 0, 1 + g)); // (y la une al cuerpo por detrás)
    }
    partes.push(cuerpo);
  }
  return N.union(partes);
}

// ======================= 🔢 DESLIZANTE DEL 15 (marco + 15 fichas con su número) =======================
function deslizante(p) {
  const sq = p.casilla, gap = 0.5, inner = 4 * sq + 5 * gap, pared = 5, e = 3, alto = 8, H = 7;
  const marco = rr(inner + 2 * pared, inner + 2 * pared, 5).extrude(alto).subtract(rr(inner, inner, 1).extrude(alto).translate([0, 0, 2.4]));
  const fichas = []; for (let k = 1; k <= 15; k++) fichas.push(rr(sq, sq, 2).extrude(H - 0.8).add(rr(sq - 1.6, sq - 1.6, 1.4).extrude(0.8).translate([0, 0, H - 0.81])).subtract(texto(k, sq * 0.5, 1.2).translate([0, 0, H - 1])));
  const enMarco = fichas.map((f, k) => { const i = k % 4, j = Math.floor(k / 4); return f.translate([-inner / 2 + gap + sq / 2 + i * (sq + gap), inner / 2 - gap - sq / 2 - j * (sq + gap), 2.4]); });
  return p.ver === 'montado' ? N.union([marco, ...enMarco]) : N.union(enFila([marco, ...fichas], 4, inner + 2 * pared + 90));
}

// ======================= 💄 ORGANIZADOR DE COSMÉTICOS GIRATORIO (base + bandeja que gira sobre un raíl) =======================
function cosmeticos(p) {
  const D = p.d, R = D / 2, Rr = R * 0.72, eje = 10;
  // la base: disco + un raíl redondo (media caña de 1,6) donde apoya la bandeja + el eje del centro
  let base = cil(D, 3).add(M().cylinder(1.6, 1.6, 1.6, 0).translate([0, 0, 0])); void base;
  const rail = CS().circle(1.6, 24).translate([Rr, 0]).revolve(seg(D) * 2).translate([0, 0, 3]);
  base = cil(D, 3).add(rail.trimByPlane([0, 0, 1], 3)).add(cil(eje, 3 + 2 + p.alto * 0.4, 0));
  // la bandeja: el surco por debajo (encaja en el raíl con 0,3 de aire), el casquillo del eje (gira) y los huecos
  const fondo = 3, Hb = p.alto;
  let band = cil(D - 6, fondo).subtract(CS().circle(1.6 + 0.3, 24).translate([Rr, 0]).revolve(seg(D) * 2).translate([0, 0, 0.01]).trimByPlane([0, 0, 1], -0.5)).subtract(cil(eje + 2 * GI + 0.2, fondo + 2, -1));
  band = band.add(N.forma3d('tubo', { d: D - 6, interior: D - 6 - 4, h: Hb * 0.45 }).translate([0, 0, fondo - 0.01])); // el borde de fuera
  band = band.add(N.forma3d('tubo', { d: R * 0.62, interior: R * 0.62 - 4, h: Hb }).translate([0, 0, fondo - 0.01])); // el vaso del centro (brochas)
  band = band.add(N.forma3d('tubo', { d: eje + 2 * GI + 0.2 + 4, interior: eje + 2 * GI + 0.2, h: 3 + 2 + p.alto * 0.4 - fondo + 1 }).translate([0, 0, fondo - 0.01]).subtract(cil(1, 1)));
  // 8 tabiques del vaso al borde (compartimentos) y 8 huecos para pintalabios en el anillo de en medio
  const nT = 8; for (let k = 0; k < nT; k++) { const a = k * 360 / nT; band = band.add(caja((D - 6) / 2 - R * 0.31 - 1, 2.4, Hb * 0.45, 0, 0, fondo - 0.01).translate([R * 0.31 + ((D - 6) / 2 - R * 0.31) / 2 - 0.5, 0, 0]).rotate([0, 0, a])); }
  return p.ver === 'montado' ? N.union([base, band.translate([0, 0, 3 + 0.3])]) : N.union(enFila([base, band], 10, 2 * D + 20));
}

// ======================= 🔌 ESTACIÓN DE CARGA (móviles + tablet, con paso de cables) =======================
function estacionCarga(p) {
  const nM = Math.round(p.moviles), gM = p.grueso + 2, gT = p.tablet > 0 ? p.tablet + 2 : 0, sep = 10, inc = 12 * RAD, H = 40, prof = 85;
  const L = nM * (gM + sep) + (gT ? gT + sep : 0) + 14;
  let m = rr(L, prof, 8).extrude(H);
  let x = -L / 2 + 7 + sep / 2; const ranuras = [];
  for (let i = 0; i < nM + (gT ? 1 : 0); i++) { const g = i < nM ? gM : gT; ranuras.push([x + g / 2, g]); x += g + sep; }
  ranuras.forEach(([xc, g]) => { // la ranura (inclinada 12° hacia atrás), el agujero del cable y su canal por debajo hasta la pared de atrás
    m = m.subtract(caja(g, prof - 18, H + 30, 0, 0, 0).rotate([-12, 0, 0]).translate([xc, 4, 8]));
    m = m.subtract(cil(12, 30, -1).translate([xc, 0, 0])).subtract(caja(12, prof / 2 + 2, 8, xc, prof / 4 + 1, -0.01));
  });
  return m;
}

// ======================= 🧱 RIEL DE PARED + MÓDULOS QUE SE CUELGAN (corte a 45°, el de los talleres) =======================
// De perfil (Y hacia fuera de la pared, Z hacia arriba). El RIEL va atornillado a la pared (y = 0) y su cara de arriba BAJA a 45° hacia
// la pared: entre esa rampa y la pared queda un hueco en «V». Cada MÓDULO lleva arriba, por detrás, una UÑA que baja a 45° dentro de ese
// hueco y se apoya en la rampa: cuanto más peso, más se aprieta contra la pared. Holgura 0,3. Todo se imprime DE PIE, tal como cuelga:
// la cara de abajo de la uña es de 45° (sin soportes) y lo que sale hacia delante sale con su cuña de 45° o desde la cama.
const RIEL = { e: 9, alto: 32, g: 0.3 };
function riel(p) {
  const { e, alto } = RIEL, L = p.largo;
  const perfil = N.cs([N.ccw([[0, 0], [e, 0], [e, alto], [0, alto - e]])], 'Positive'); // (delante alto, contra la pared bajo: la «V»)
  let m = perfil.extrude(L).rotate([90, 0, 90]).translate([-L / 2, 0, 0]);
  const nT = Math.max(2, Math.round(L / 80)); for (let i = 0; i < nT; i++) { const xx = -L / 2 + 15 + (L - 30) * i / (nT - 1), zt = (alto - e) / 2;
    m = m.subtract(cil(4.4, 20, -5).rotate([-90, 0, 0]).translate([xx, -1, zt])).subtract(M().cylinder(2.6, 2.2, 4.6, 32).rotate([-90, 0, 0]).translate([xx, e - 2.6 + 0.01, zt])); }
  return m;
}
// la uña: de la espalda del módulo (y = 0) hacia atrás hasta casi la pared, con la cara de abajo a 45° (paralela a la rampa del riel)
function perfilModulo(Hm, em) {
  const { e, g } = RIEL, zt = Hm - (e + 5); // zt: la punta de la uña (abajo, junto a la pared)
  return N.cs([N.ccw([[0, 0], [em, 0], [em, Hm], [-(e - g), Hm], [-(e - g), zt], [-g, zt + (e - 2 * g)], [0, zt + (e - 2 * g)]])], 'Positive');
}
function modulo(p) {
  const W = p.ancho, Hm = 64, em = 4;
  let m = perfilModulo(Hm, em).extrude(W).rotate([90, 0, 90]).translate([-W / 2, 0, 0]);
  const cuna = (pr, z0) => N.cs([N.ccw([[em - 0.01, z0 - pr], [em + pr, z0], [em - 0.01, z0]])], 'Positive'); // cuña de 45° bajo lo que sale
  if (p.modulo === 'gancho') { // brazo que sube a 45° y una punta vertical (se imprime sin soportes)
    const brazo = N.cs([N.ccw([[em - 0.01, 6], [em + 26, 32], [em + 26, 44], [em + 20, 44], [em + 20, 34.5], [em - 0.01, 14.5]])], 'Positive');
    m = m.add(brazo.extrude(Math.min(16, W)).rotate([90, 0, 90]).translate([-Math.min(16, W) / 2, 0, 0]));
  } else if (p.modulo === 'caja') { const pr = 42; m = m.add(rr(W, pr, 3, 0, em + pr / 2 - 0.01).extrude(Hm * 0.55).subtract(rr(W - 4.8, pr - 4.8, 2, 0, em + pr / 2).extrude(Hm).translate([0, 0, 2.4]))); }
  else if (p.modulo === 'soporte') { // la placa con agujeros va ABAJO (en la cama): las herramientas cuelgan por debajo del módulo
    const pr = 34; let s2 = rr(W, pr, 4, 0, em + pr / 2 - 0.01); const nA = Math.max(2, Math.floor(W / 17)); for (let i = 0; i < nA; i++) s2 = s2.subtract(circ(10, -W / 2 + W * (i + 0.5) / nA, em + pr / 2 + 2));
    m = m.add(s2.extrude(5)).add(cuna(16, 5 + 16).extrude(4).rotate([90, 0, 90]).translate([-W / 2, 0, 0])).add(cuna(16, 5 + 16).extrude(4).rotate([90, 0, 90]).translate([W / 2 - 4, 0, 0]));
  } else { // estante: una cuña MACIZA a 45° de lado a lado (fuerte y sin soportes) y su balda encima
    const pr = Math.min(60, Hm * 0.8), zE = Hm * 0.85; m = m.add(cuna(pr, zE).extrude(W).rotate([90, 0, 90]).translate([-W / 2, 0, 0])).add(caja(W, pr, 4, 0, em + pr / 2 - 0.01, zE - 0.01));
    m = m.add(caja(W, 3, 6, 0, em + pr - 1.5, zE + 4 - 0.02)); // un borde delante para que no se caiga nada
  }
  return m;
}
export function rielColgado(p) { // el riel con un módulo de cada, colgados (para verlo y para la prueba de que encaja)
  // (colgado: la cara de abajo de la uña, a 45°, apoyada EN la rampa del riel; cuenta: en el riel, la uña va de y = 2g a y = e y la rampa
  // sube de alto − e + 2g a alto en ese tramo → dz = alto − e + 2g − zt; + 0,05 para verlo apoyado y no metido)
  const { e, alto, g } = RIEL, Hm = 64, zt = Hm - (e + 5), dz = alto - e + 2 * g - zt + 0.05, Wm = Math.min(p.ancho, p.largo / 4 - 4);
  const r = riel(p), mods = ['gancho', 'caja', 'soporte', 'estante'].map((q, i) => modulo(Object.assign({}, p, { modulo: q, ancho: Wm })).translate([-p.largo / 2 + (p.largo / 4) * (i + 0.5), e + g, dz]));
  return { r, mods };
}
function rielPared(p) {
  if (p.que === 'riel') return riel(p);
  if (p.que !== 'todo') return modulo(Object.assign({}, p, { modulo: p.que }));
  const C = rielColgado(p); return N.union([C.r, ...C.mods]);
}

// ======================= ⚙️ CAJA DE ENGRANAJES DE DEMOSTRACIÓN (con manivela: 1 vuelta → 1/9 de vuelta) =======================
export function demoEngranajes(p) {
  const m = p.m, zp = 12, zg = 36, b = 6, ejeD = 6, a = m * (zp + zg) / 2, gx = 0.5, base = 4;
  const gp = (z, e = {}) => Object.assign({ por: 'modulo', m, z, alfa: 20, juego: 0.15, b, eje: ejeD, holgura: GI }, e);
  const X = [0, a, 2 * a]; // los tres ejes en fila
  const z1 = base + gx, z2 = z1 + b + gx; // los dos niveles de engranajes
  // la manivela: un buje encima del eje (dentro del fondo de los dientes del piñón), un brazo 1 mm por ENCIMA del engranaje grande de al
  // lado (antes se rozaban 0,01 mm) y el puño
  const rB = Math.min(5, zp * m / 2 - 1.25 * m - 0.5), brazoL = zp * m / 2 + 6;
  const pinon = G.engranaje(gp(zp)).m.add(cil(2 * rB, 1.6, b - 0.01)).add(caja(brazoL, 7, 2.4, brazoL / 2 - 1, 0, b + 1.2)).add(cil(8, 20, b + 1.2).translate([brazoL - 2, 0, 0]));
  const comp = G.engranaje(gp(zg)).m.add(G.engranaje(gp(zp)).m.translate([0, 0, b + gx - 0.01])).add(cil(ejeD + 6, gx + 0.02, b - 0.01)).subtract(cil(ejeD + 2 * GI, 3 * b, -1));
  const salida = G.engranaje(gp(zg)).m.add(caja(2 * (zg * m / 2) * 0.8, 6, 2, 0, 0, b - 0.01).translate([zg * m / 2 * 0.4, 0, 0])); // con su aguja
  // casar: el compuesto se gira hasta engranar con el piñón; la salida, con el pequeño del compuesto (medido, como en la planetaria)
  // (48 giros y, alrededor del mejor, cada vez más fino: el diente tiene que quedar en el centro del hueco)
  const fase = (movil, fijo, paso) => { let mejor = 0, v0 = Infinity; for (let j = 0; j < 48; j++) { const g = j / 48 * paso, v = vol(movil(g), fijo); if (v < v0) { v0 = v; mejor = g; } } for (let d = paso / 96; d > paso / 3000; d /= 2) for (const g of [mejor - d, mejor + d]) { const v = vol(movil(g), fijo); if (v < v0) { v0 = v; mejor = g; } } return mejor; };
  const P1 = pinon.translate([X[0], 0, z1]);
  const gC = fase(g => comp.rotate([0, 0, g]).translate([X[1], 0, z1]), P1, 360 / zg), C1 = comp.rotate([0, 0, gC]).translate([X[1], 0, z1]);
  const gS = fase(g => salida.rotate([0, 0, g]).translate([X[2], 0, z2]), C1, 360 / zg), S1 = salida.rotate([0, 0, gS]).translate([X[2], 0, z2]);
  // la placa con los tres ejes (impresos) y sus arandelas
  const Lp = 2 * a + zg * m + 16, Wp = zg * m + 12; let placa = rr(Lp, Wp, 6, a, 0).extrude(base);
  // (el piñón y la salida llevan encima la manivela y la aguja, que hacen de tapa: su eje acaba 0,3 mm por debajo)
  [[X[0], z1 + b - 0.3], [X[1], z2 + b + 1.2], [X[2], z2 + b - 0.3]].forEach(([x, top]) => { placa = placa.add(cil(ejeD, top - base + 0.01, base - 0.01).translate([x, 0, 0])).add(cil(ejeD + 4, gx, base - 0.01).translate([x, 0, 0])); });
  placa = placa.add(cil(ejeD + 4, z2 - base + 0.01 - 0.0, base - 0.01).translate([X[2], 0, 0]).subtract(cil(1, 1, -50))); // la salida va un piso más arriba: su torre
  const choques = [['Piñón con el compuesto', P1, C1], ['Compuesto con la salida', C1, S1], ['Piñón con la salida', P1, S1], ['Engranajes con la placa', N.union([P1, C1, S1]), placa]].map(([t, A, B]) => ({ t, vol: vol(A, B) }));
  return { placa, P1, C1, S1, choques, relacion: (zg / zp) * (zg / zp), a };
}
function cajaEngranajes(p) {
  const R = demoEngranajes(p);
  if (p.ver === 'montada') return N.union([R.placa, R.P1, R.C1, R.S1]);
  return N.union(enFila([R.placa, R.P1, R.C1, R.S1], 8, 250));
}

export const DISENOS_50 = {
  torreZigzag: { cat: 'canicas', tambien: ['ninos', 'juegos', 'pro'], e: '🎢', t: 'Torre de canicas en zigzag (pisos que se apilan)', d: 'Pon los pisos que quieras: la canica baja de rampa en rampa', uso: 'deco', color: '#00b4d8', nuevo: true,
    campos: [n('bola', 'Canica (diámetro)', 16, 10, 22, 0.5), n('pisos', 'Pisos', 4, 2, 10, 1, ''), n('largo', 'Largo de cada piso', 140, 90, 200, 1), n('pend', 'Inclinación de la rampa', 5, 3, 9, 0.5, '°'), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir (piezas sueltas)'], ['montada', 'Montada']])],
    gen: p => torreZigzag(p), nota: p => { const Z = zigzagMedidas(p); return 'Cada piso: una rampa de ' + n2(Z.L) + ' mm que baja ' + n2(Z.drop) + ' mm (' + n2(p.pend) + '°) y acaba en un agujero de ' + n2(Z.dh) + ' mm. Al montar, gira cada piso MEDIA VUELTA respecto al de abajo: el agujero cae justo al principio de su rampa (calculado). Encajan con 4 tetones; la base recoge las canicas y el embudo va arriba. Sin soportes.'; } },
  cuatroEnLinea: { cat: 'juegos', tambien: ['ninos', 'pro'], e: '🔴', t: 'Cuatro en línea (con barra para soltar)', d: 'El juego de mete fichas y haz 4 en raya: 7 × 6, con patas', uso: 'deco', color: '#e63946', nuevo: true,
    campos: [n('d', 'Diámetro de la ficha', 20, 16, 24, 0.5), n('t', 'Grosor de la ficha', 5, 4, 7, 0.5), s('que', 'Qué sacar', 'marco', [['marco', 'El marco (paneles, barra y patas)'], ['fichas', '21 fichas (imprime 2 veces, en dos colores)'], ['todo', 'Todo']])],
    gen: p => cuatroEnLinea(p), nota: p => 'Panel delantero con sus separadores (tumbado) + panel trasero (encaja a presión en 16 tetones) + la barra (entra por los lados: al sacarla caen las fichas) + 2 patas. Fichas de ' + n2(p.d) + ' × ' + n2(p.t) + ' mm: 21 de cada color. Sin soportes.' },
  damas: { cat: 'juegos', tambien: ['ninos', 'adultos'], e: '⚫', t: 'Damas (tablero de dos colores + 24 fichas)', d: 'Las casillas oscuras salen en relieve: cambio de color a mitad', uso: 'deco', color: '#1b1b1f', nuevo: true,
    campos: [n('casilla', 'Casilla', 20, 15, 28, 0.5), s('que', 'Qué sacar', 'todo', [['todo', 'Tablero y fichas'], ['tablero', 'Solo el tablero'], ['fichas', '24 fichas (12 + 12)']])],
    gen: p => damas(p), dosColores: () => ({ z: 3, color: '#1b1b1f' }),
    nota: p => 'Tablero de ' + n2(8 * p.casilla + 12) + ' mm. 🌈 Las casillas oscuras y el borde suben 0,8 mm: pon la pausa de color a 3 mm. Cada ficha lleva un botón arriba y su hueco abajo: dos apiladas encajan (la dama).' },
  serpiente: { cat: 'ninos', tambien: ['juegos', 'cuqui'], e: '🐍', t: 'Serpiente articulada (sale ya montada)', d: 'Se imprime de una vez y se mueve: la típica figura «flexi»', uso: 'deco', color: '#2a9d8f', nuevo: true,
    campos: [n('largo', 'Largo', 200, 120, 240, 1), n('ancho', 'Ancho de la cabeza', 22, 14, 30, 0.5), n('alto', 'Alto', 9, 7, 14, 0.5), n('segmentos', 'Segmentos', 12, 6, 20, 1, '')],
    gen: p => serpiente(p), nota: () => 'Uniones con pasador vertical (tope abajo y arriba) dentro de una «C»: se imprime YA MONTADA, sin soportes, con 0,4 mm de aire. Al sacarla de la cama, dóblala segmento a segmento para soltar las uniones. Capa de 0,2; mejor PLA seda.' },
  deslizante15: { cat: 'juegos', tambien: ['ninos', 'adultos'], e: '🔢', t: 'Rompecabezas deslizante del 15', d: 'Ordena del 1 al 15 deslizando las fichas', uso: 'deco', color: '#ffb703', nuevo: true,
    campos: [n('casilla', 'Tamaño de cada ficha', 18, 14, 26, 0.5), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montado', 'Montado']])],
    gen: p => deslizante(p), nota: () => 'Marco con 0,5 mm de juego entre fichas (deslizan sin caerse) y 15 fichas con su número grabado (rellénalo de pintura). Sin soportes.' },
  cosmeticosGiratorio: { cat: 'organizar', tambien: ['cuqui', 'hogar', 'pro'], e: '💄', t: 'Organizador de maquillaje giratorio', d: 'Gira sobre un raíl: brochas en el centro y 8 compartimentos', uso: 'deco', color: '#f4acb7', nuevo: true,
    campos: [n('d', 'Diámetro', 170, 120, 240, 1), n('alto', 'Alto del vaso de brochas', 90, 50, 140, 1), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir (base y bandeja)'], ['montado', 'Montado']])],
    gen: p => cosmeticos(p), nota: p => 'La bandeja apoya en un raíl redondo de la base (0,3 mm de aire) y gira en el eje del centro con tu holgura «gira». Ø ' + n2(p.d) + ' mm: ' + (p.d > 180 ? 'solo cabe en la P1P.' : 'cabe en la A1 mini.') + ' Sin soportes.' },
  estacionCarga: { cat: 'oficina', tambien: ['organizar', 'hogar'], e: '🔌', t: 'Estación de carga (móviles + tablet)', d: 'Cada ranura con su paso de cable por debajo', uso: 'deco', color: '#2b2d42', nuevo: true,
    campos: [n('moviles', 'Móviles', 3, 1, 5, 1, ''), n('grueso', 'Grueso del móvil (con funda)', 11, 7, 16, 0.5), n('tablet', 'Grueso de la tablet (0 = sin)', 10, 0, 16, 0.5)],
    gen: p => estacionCarga(p), nota: () => 'Ranuras inclinadas 12° hacia atrás y un agujero de 12 mm en cada una para el cargador: los cables salen por detrás, por debajo. Sin soportes.' },
  rielPared: { cat: 'organizar', tambien: ['taller', 'hogar', 'pro'], e: '🧱', t: 'Riel de pared con módulos que se cuelgan', d: 'Atornillas el riel y cuelgas ganchos, cajas, soportes y estantes', uso: 'pieza', color: '#6c757d', nuevo: true,
    campos: [s('que', 'Qué sacar', 'todo', [['todo', 'Ver el riel con un módulo de cada'], ['riel', 'El riel'], ['gancho', 'Módulo gancho'], ['caja', 'Módulo caja'], ['soporte', 'Módulo soporte (destornilladores, pinceles…)'], ['estante', 'Módulo estante']]), n('largo', 'Largo del riel', 200, 100, 250, 1), n('ancho', 'Ancho del módulo', 60, 30, 120, 1)],
    gen: p => rielPared(p), nota: () => 'Corte a 45° (el de los talleres): la uña del módulo baja dentro del hueco entre el riel y la pared y apoya en su rampa; cuanto más peso, más se aprieta. Holgura 0,3. Tornillos de 4 mm avellanados (3 en un riel de 200). Todo se imprime DE PIE, como cuelga: sin soportes.' },
  cajaEngranajes: { cat: 'mecanica', tambien: ['ciencia', 'pro', 'ninos'], e: '⚙️', t: 'Caja de engranajes de demostración (manivela)', d: 'Da vueltas a la manivela: la aguja va 9 veces más despacio', uso: 'pieza', color: '#3a86ff', nuevo: true,
    campos: [n('m', 'Módulo (tamaño del diente)', 1.5, 1, 2.5, 0.25), s('ver', 'Ver', 'montada', [['montada', 'Montada'], ['imprimir', 'Para imprimir']])],
    gen: p => cajaEngranajes(p), nota: p => { const a = p.m * 24; return 'Dientes de evolvente EXACTOS (12 → 36 → 12 → 36: relación 9 : 1). Ejes a ' + n2(a) + ' mm, impresos en la placa; los engranajes giran con tu holgura «gira» (0,15) y 0,15 de juego entre dientes. Montaje comprobado: no se tocan y engranan. Sin soportes.'; } }
};
