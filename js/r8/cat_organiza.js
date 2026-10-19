// ================= 19-10-2026 · 🧰 CAJA ORGANIZADORA DE ALOJAMIENTOS (cilindros a la medida de cada cosa) =================
// Ella (18-10): «caja de organizar: taladro, secador 4 en 1, como cilindros donde alojar».
// Una bandeja con un ALOJAMIENTO para cada cosa: tubos (cilindros) a la medida de cada mango o cabezal, huecos rectangulares (el taladro de
// pie sobre su batería, la batería de repuesto) y una regleta de puntas hexagonales. Cada tubo con su muesca delante (se coge con dos
// dedos) y el del mango del secador con la salida del cable por abajo y un enrollador detrás.
//  · 💇 SECADOR 4 EN 1 (cepillo secador de cabezales): el mango y sus 4 cabezales.
//  · 🔩 TALADRO: el taladro de pie sobre su batería, la batería de repuesto, brocas, puntas largas y 12 puntas hexagonales (de 1/4").
//  · ✏️ A MEDIDA: tú escribes lo que va (Ø × alto, o largo × ancho × alto para un hueco rectangular).
// Las medidas de partida son las HABITUALES (ESTIMADAS): mide tus cosas (el Ø por lo más ancho) y la «🧪 prueba» saca un aro de cada tubo.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, tx, M, CS, circ, rr, poli, cil, caja, n2, conBisel } = A;
const BASE = 3, FALDA = 22, LADO = 240, FILA = 165; // el fondo · el alto de la falda · lo más ancho que cabe (la P1P) · lo ancho de cada fila (más recogida)
export const KITS_ORG = {
  secador: { t: '💇 Secador 4 en 1 (el mango y 4 cabezales)', lista: 'T50x120 Mango (con el cable), T36x80 Cabezal 1, T44x85 Cabezal 2, T52x90 Cabezal 3, T60x95 Cabezal 4', cable: true },
  taladro: { t: '🔩 Taladro (de pie sobre su batería) y sus brocas', lista: 'R84x80x30 Taladro (de pie), R82x58x26 Batería de repuesto, T30x80 Brocas, T30x80 Puntas largas, H12 Puntas hexagonales', cable: false },
  medida: { t: '✏️ A medida (lo escribes tú abajo)', lista: '', cable: false }
};
// «T50x120 Mango» = tubo de Ø50 y 120 de hondo · «R84x80x30 Taladro» = hueco de 84 × 80 y 30 de hondo · «H12» = regleta de 12 puntas hexagonales
export function leeLista(txt) { const L = [];
  String(txt || '').split(/[,;\n]+/).map(t => t.trim()).filter(Boolean).forEach((t, i) => { let m;
    if ((m = t.match(/^[TtØø]?\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(.*)$/)) && !/^[Rr]/.test(t)) L.push({ tipo: 'T', d: +m[1].replace(',', '.'), h: +m[2].replace(',', '.'), nom: m[3].trim() || 'Tubo ' + (i + 1) });
    else if ((m = t.match(/^[Rr]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(.*)$/))) L.push({ tipo: 'R', w: +m[1].replace(',', '.'), l: +m[2].replace(',', '.'), h: +m[3].replace(',', '.'), nom: m[4].trim() || 'Hueco ' + (i + 1) });
    else if ((m = t.match(/^[Hh]\s*(\d+)\s*(.*)$/))) L.push({ tipo: 'H', k: Math.max(2, Math.min(24, +m[1])), h: 12, nom: m[2].trim() || 'Puntas' });
    else N.mal('No entiendo «' + t + '»: escribe T50x120 (tubo de Ø50 y 120 de hondo), R80x60x30 (hueco de 80 × 60 y 30 de hondo) o H12 (12 puntas).'); });
  return L.slice(0, 10); }
// lo que ocupa cada alojamiento por fuera (con su holgura y su pared)
const huella = (it, hg, pa) => it.tipo === 'T' ? [it.d + 2 * hg + 2 * pa, it.d + 2 * hg + 2 * pa] : it.tipo === 'R' ? [it.w + 2 * hg + 2 * pa, it.l + 2 * hg + 2 * pa] : [it.k * 9 + 4, 14];
// el REPARTO: de más alto a más bajo, en filas de atrás hacia delante (lo alto detrás: se ve y se coge todo)
export function reparto(p) { const K = KITS_ORG[p.kit] || KITS_ORG.secador, L = leeLista(p.kit === 'medida' ? p.lista : (p.lista && p.kit === 'medida' ? p.lista : K.lista)), hg = Math.max(0.3, +p.holgura || 1), pa = Math.max(1.6, +p.pared || 2), sep = 3;
  if (!L.length) N.mal('Escribe qué va en la caja (por ejemplo: T50x120 Mango, T36x80 Cabezal).');
  const it = L.map((x, i) => ({ ...x, i, f: huella(x, hg, pa) })).sort((a, b) => b.h - a.h || b.f[0] - a.f[0]), filas = []; let fila = [], x = 0;
  for (const q of it) { if (q.f[0] > LADO) N.mal('«' + q.nom + '» es demasiado grande para la cama (' + Math.round(q.f[0]) + ' mm).'); if (x > 0 && x + q.f[0] > FILA) { filas.push(fila); fila = []; x = 0; } fila.push(q); x += q.f[0] + sep; }
  if (fila.length) filas.push(fila);
  let y = 0; const pos = []; filas.forEach(F => { const fondo = Math.max(...F.map(q => q.f[1])), ancho = F.reduce((a, q) => a + q.f[0], 0) + sep * (F.length - 1); let x0 = -ancho / 2; F.forEach(q => { pos.push({ ...q, c: [x0 + q.f[0] / 2, -(y + fondo / 2)] }); x0 += q.f[0] + sep; }); y += fondo + sep; });
  const fondo = y - sep; pos.forEach(q => { q.c[1] += fondo / 2; }); // centrado
  const W = Math.max(...pos.map(q => Math.abs(q.c[0]) + q.f[0] / 2)) * 2 + 6, D = fondo + 6;
  if (D > LADO + 10) N.mal('Tanto no cabe en una cama de la P1P (' + Math.round(W) + ' × ' + Math.round(D) + ' mm): quita algo o haz dos cajas.');
  return { K, L: pos, hg, pa, W, D, cable: p.kit === 'secador' ? K.cable : !!p.cable }; }

// ---------- la CAJA ----------
export function cajaOrganizadora(p) { const R = reparto(p), { hg, pa, W, D } = R, rb = 8;
  // el fondo y la falda de alrededor (la bandeja), con 4 huecos para tacos de goma de 8 mm
  let m = conBisel(rr(W, D, rb), BASE, 0.8).add(conBisel(rr(W, D, rb).subtract(rr(W - 2 * pa, D - 2 * pa, rb - pa)), FALDA, 0.8));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { m = m.subtract(cil(8.4, 1.01, -0.01).translate([a * (W / 2 - 10), b * (D / 2 - 10), 0])); });
  // cada ALOJAMIENTO
  const huecos = [], muescas = [];
  R.L.forEach(q => { const [x, y] = q.c, H = BASE + q.h;
    if (q.tipo === 'T') { const ri = q.d / 2 + hg, ro = ri + pa; m = m.add(conBisel(circ(2 * ro), H, 0.6).translate([x, y, 0])); huecos.push(cil(2 * ri, q.h + 1, BASE).translate([x, y, 0]));
      if (p.muesca !== false) muescas.push(M().hull([cil(Math.max(10, q.d * 0.36), 1, 0).translate([0, 0, BASE + q.h * 0.45]), cil(Math.max(10, q.d * 0.36) + 6, 1, 0).translate([0, 0, H + 0.5])]).scale([1, 1, 1]).translate([x, y - ri, 0]).intersect(caja(q.d * 0.6 + 8, 2 * pa + 2, H + 2).translate([x, y - ri, 0]))); } // la muesca: delante, hasta media altura
    else if (q.tipo === 'R') { const w = q.w + 2 * hg, l = q.l + 2 * hg; m = m.add(conBisel(rr(w + 2 * pa, l + 2 * pa, 4 + pa), H, 0.6).translate([x, y, 0])); huecos.push(caja(w, l, q.h + 1, 4).translate([x, y, BASE]));
      if (p.muesca !== false) muescas.push(caja(Math.min(40, w * 0.4), 2 * pa + 2, q.h * 0.6 + 1, 4).translate([x, y - l / 2 - pa / 2, BASE + q.h * 0.4])); }
    else { const L = q.k * 9 + 4; m = m.add(conBisel(rr(L, 14, 3), BASE + q.h, 0.6).translate([x, y, 0])); for (let i = 0; i < q.k; i++) huecos.push(A.hex(6.35 + 0.4).extrude(q.h + 1).translate([x - L / 2 + 6.5 + i * 9, y, BASE])); } });
  m = m.subtract(N.union(huecos)).subtract(N.union(muescas));
  // el MANGO del secador: salida del cable por abajo, hacia atrás (arco apuntado: sin soportes), y el ENROLLADOR detrás de la falda
  if (R.cable) { const q = R.L.find(t => t.tipo === 'T') ; if (q) { const ri = q.d / 2 + hg, w = 14, h = 16, yb = D / 2;
    const arco = M().hull([caja(w, 4, 0.1).translate([0, 0, 0]), caja(w, 4, 0.1).translate([0, 0, h - w / 2]), caja(0.6, 4, 0.1).translate([0, 0, h])]);
    m = m.subtract(arco.scale([1, (yb - q.c[1]) / 4 + 1, 1]).translate([q.c[0], (q.c[1] + yb) / 2 + 1, BASE]));
    m = m.subtract(caja(w, yb - q.c[1] - ri + 2, 2.4).translate([q.c[0], (q.c[1] + ri + yb) / 2, BASE - 1.2])); // un canal en el fondo para el cable
    [-1, 1].forEach(sg => { m = m.add(M().hull([caja(10, 6, 0.1).translate([q.c[0] + sg * 24, yb + 2.99, FALDA - 18]), caja(10, 6, 0.1).translate([q.c[0] + sg * 24, yb + 2.99, FALDA - 0.1]), caja(10, 12, 0.1).translate([q.c[0] + sg * 24, yb + 6, FALDA - 0.1])])); }); } } // los dos cuernos del enrollador
  // el NOMBRE delante, grabado en la falda
  const t = String(p.txt || '').trim(); if (t) { try { const T = N.centraCS(N.texto2(t, 'gorda', 9)), b = N.cajaCS(T), k = Math.min(1, (W - 40) / b.w, 12 / b.h); m = m.subtract(T.scale([k, k]).extrude(1.01).rotate([90, 0, 0]).translate([0, -D / 2 + 0.6, FALDA / 2 + 1])); } catch (e) { } }
  // para la pared: dos ojales de cabeza de tornillo en la falda de atrás
  if (p.colgar) [-1, 1].forEach(sg => { m = m.subtract(M().hull([cil(8.5, 4, 0).rotate([-90, 0, 0]), cil(4.3, 4, 0).rotate([-90, 0, 0]).translate([0, 0, 7])]).translate([sg * W / 4, D / 2 - pa - 1, FALDA - 12])); });
  return m; }
// 🧪 la PRUEBA: un aro de 10 mm de cada tubo (y una esquina de cada hueco), para ver con TUS cosas que entran bien
export function pruebaOrganizadora(p) { const R = reparto(p), L = []; R.L.forEach(q => {
  if (q.tipo === 'T') { const ri = q.d / 2 + R.hg; L.push(cil(2 * (ri + R.pa), 10).subtract(cil(2 * ri, 12, -1))); }
  else if (q.tipo === 'R') { const w = q.w + 2 * R.hg, l = q.l + 2 * R.hg; L.push(caja(w + 2 * R.pa, l + 2 * R.pa, 6, 4 + R.pa).subtract(caja(w, l, 8, 4).translate([0, 0, -1])).intersect(caja(w / 2 + R.pa + 1, l / 2 + R.pa + 1, 8).translate([-(w + 2 * R.pa) / 4, -(l + 2 * R.pa) / 4, -1]))); }
  else L.push(conBisel(rr(22, 14, 3), 10, 0.6).subtract(A.hex(6.35 + 0.4).extrude(12).translate([-5, 0, 1])).subtract(A.hex(6.35 + 0.4).extrude(12).translate([5, 0, 1]))); });
  return L; }
function enFila(L, sep = 5) { let x = 0, y = 0, fila = 0; return N.union(L.map(m => { const b = N.caja(m); if (x > 0 && x + b.dims[0] > 240) { x = 0; y += fila + sep; fila = 0; } const o = m.translate([x - b.min[0], y - b.min[1], -b.min[2]]); x += b.dims[0] + sep; fila = Math.max(fila, b.dims[1]); return o; })); }

export const DISENOS_ORGANIZA = {
  organizadorCilindros: { cat: 'organizar', tambien: ['hogar', 'taller', 'belleza'], nuevo: true, busca: 'organizador caja alojamientos cilindros tubos secador 4 en 1 cepillo cabezales taladro atornillador batería brocas puntas soporte', e: '🧰', t: 'Caja organizadora con alojamientos (secador 4 en 1, taladro o a medida)', d: 'Un tubo o un hueco a la medida de cada cosa: el mango del secador y sus 4 cabezales, o el taladro de pie con su batería, brocas y puntas', uso: 'pieza', color: '#3a6ea5',
    campos: [s('kit', 'Para', 'secador', Object.entries(KITS_ORG).map(([k, K]) => [k, K.t])), tx('lista', 'Lo que va (solo «a medida»)', 'T50x120 Mango, T40x80 Cabezal', 'T50x120 = tubo de Ø50 y 120 de hondo · R80x60x30 = hueco de 80 × 60 y 30 de hondo · H12 = 12 puntas hexagonales'),
      n('holgura', 'Holgura (por lado)', 1, 0.3, 3, 0.1), n('pared', 'Pared', 2, 1.6, 4, 0.2), c('muesca', 'Muesca delante en cada tubo (para cogerlo)', true), c('cable', 'Salida del cable y enrollador (a medida)', false), c('colgar', 'Para colgarla en la pared (2 ojales)', false),
      tx('txt', 'Nombre (delante)', ''), s('que', 'Qué imprimo', 'caja', [['caja', 'La caja entera'], ['prueba', '🧪 Prueba: un aro de cada tubo (pocos gramos)']])],
    gen: p => p.que === 'prueba' ? enFila(pruebaOrganizadora(p)) : cajaOrganizadora(p),
    nota: p => { let R = null; try { R = reparto(p); } catch (e) { return '⚠️ ' + e.message; } const lst = R.L.map(q => q.tipo === 'T' ? q.nom + ' Ø' + n2(q.d) + ' × ' + n2(q.h) : q.tipo === 'R' ? q.nom + ' ' + n2(q.w) + ' × ' + n2(q.l) + ' × ' + n2(q.h) : q.k + ' puntas hexagonales de 1/4"').join(' · ');
      if (p.que === 'prueba') return '🧪 PRUEBA: un aro de 10 mm de cada tubo (y una esquina de cada hueco). Mete cada cosa en su aro: tiene que entrar y salir SUELTA (con ' + n2(R.hg) + ' mm por lado). Si va justa, sube la holgura; si baila mucho, bájala. Así no gastas la caja entera para nada.';
      return 'PARA QUÉ: ' + R.K.t.replace(/^\S+\s/, '').toLowerCase() + ' en su sitio, cada cosa en su ALOJAMIENTO: ' + lst + '. Caja de ' + Math.round(R.W) + ' × ' + Math.round(R.D) + ' mm (cabe en la P1P), lo alto detrás. '
        + (R.cable ? 'El tubo del MANGO lleva la salida del cable por abajo hacia atrás y un ENROLLADOR detrás (dos cuernos para dar vueltas al cable). ' : '') + 'Cada tubo, con una muesca delante para cogerlo con dos dedos. '
        + 'MÍDELO ANTES: las medidas de partida son las HABITUALES; mide el Ø por lo más ancho de cada mango o cabezal y su alto, cámbialas en «a medida» si hace falta, y saca la «🧪 Prueba». '
        + 'IMPRESIÓN: de pie, sin soportes, 3 paredes y 15 % de relleno. ' + (p.kit === 'secador' ? '⚠️ Si guardas los cabezales CALIENTES, imprímela en PETG (o mejor ASA/ABS): el PLA se ablanda a unos 55 °C. ' : '') + 'Debajo, 4 huecos para tacos de goma de 8 mm (no resbala).'; } }
};
