// ================= v30.3 · 🧸 JUEGOS, 🔮 CANICAS, 🔬 CIENCIA y 👾 ROL =================
// La dueña (11-10-2026): «para que jueguen… juegos de laberinto con canicas, juegos de canicas, juegos de ciencias, un poco de todo».
// Geometría limpia (piezas nítidas), medidas que encajan (sus holguras: 0,4 entre piezas que se separan) y sin soportes.
import * as N from './nucleo.js';
import { circulo, rectR } from './motor.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const circ = d => N.cs([N.ccw(circulo(d / 2, 0, 0, seg(d)))], 'Positive');
const rr = (w, h, r = 0) => N.cs([N.ccw(rectR(w, h, r))], 'Positive');
const cil = (d, h, z = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([0, 0, z]);
const poli = P => N.cs([N.ccw(P)], 'Positive');
const azar = sem => { let x = (Math.abs(Math.round(sem)) || 1) * 2654435761 % 4294967296; return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; };
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
// colocar varias piezas en fila (o rejilla) sin que se toquen
const enFila = (L, sep = 5, porFila = 4) => { let x = 0, y = 0, fila = 0, alto = 0; const out = []; L.forEach((m, i) => { const b = N.caja(m); if (i && i % porFila === 0) { y += alto + sep; x = 0; alto = 0; } out.push(m.translate([x - b.min[0], y - b.min[1], -b.min[2]])); x += b.max[0] - b.min[0] + sep; alto = Math.max(alto, b.max[1] - b.min[1]); }); return N.union(out); };

// ======================= 🌈 ARCOÍRIS APILABLE (Montessori) =======================
function arcoiris(p) {
  const L = [], g = 0.6; let r = p.hueco / 2;
  for (let i = 0; i < Math.round(p.n); i++) { const r2 = r + p.grueso; const a = circ(2 * r2).subtract(circ(2 * r)).intersect(rr(4 * r2, 2 * r2).translate([0, r2])); L.push(a.extrude(p.fondo)); r = r2 + g; }
  return N.union(L); // tumbados, uno dentro de otro (cada uno sale suelto: se imprimen juntos, en un color o uno a uno)
}
// ======================= 🧩 TANGRAM =======================
function tangram(p) {
  const L = p.lado, h = p.grosor, gap = 0.4, k = L / 4;
  const P = [[[0, 0], [4, 0], [2, 2]], [[0, 0], [2, 2], [0, 4]], [[4, 0], [4, 2], [3, 1]], [[3, 1], [4, 2], [4, 4], [3, 3]], [[2, 2], [3, 1], [3, 3]], [[0, 4], [2, 2], [3, 3], [1, 4]], [[1, 4], [3, 3], [4, 4]]];
  const piezas = P.map(q => poli(q.map(([x, y]) => [x * k, y * k])).offset(-gap / 2, 'Miter', 2).extrude(h));
  let m = N.union(piezas);
  if (p.caja) { const pared = 2.4, cajaB = rr(L + 2 * pared + 1, L + 2 * pared + 1, 3).extrude(h + 2).subtract(rr(L + 1, L + 1, 0.5).extrude(h + 3).translate([0, 0, 2])); m = m.add(cajaB.translate([L * 1.75 + 10, L / 2, 0])); }
  return m;
}
// ======================= 🧊 CUBO SOMA (7 piezas → un cubo 3×3×3) =======================
const SOMA = [[[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]], [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [2, 1, 0]], [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 0, 1]], [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 0, 1]]];
function soma(p) {
  const a = p.cubo, g = 0.2; // cada cubito un pelín más pequeño: el cubo cierra sin forzar
  const pieza = cs => { const L = cs.map(([x, y, z]) => M().cube([a - 2 * g, a - 2 * g, a - 2 * g]).translate([x * a + g, y * a + g, z * a + g])); let m = N.union(L.concat(cs.flatMap((A, i) => cs.slice(i + 1).filter(B => Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]) === 1).map(B => M().cube([a * (1 + Math.abs(A[0] - B[0])) - 2 * g, a * (1 + Math.abs(A[1] - B[1])) - 2 * g, a * (1 + Math.abs(A[2] - B[2])) - 2 * g]).translate([Math.min(A[0], B[0]) * a + g, Math.min(A[1], B[1]) * a + g, Math.min(A[2], B[2]) * a + g]))))); return m; };
  return enFila(SOMA.map(pieza), 6, 4);
}
// ======================= ❌⭕ TRES EN RAYA =======================
function tresEnRaya(p) {
  const L = p.lado, c3 = L / 3, h = 4, pieza = c3 * 0.62;
  let tab = rr(L + 8, L + 8, 6).extrude(h);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) tab = tab.subtract(cil(pieza + 1.2, 2, h - 1.6).translate([(i - 1) * c3, (j - 1) * c3, 0]));
  [-1, 1].forEach(k => { tab = tab.add(rr(1.6, L - 4, 0.8).extrude(1.2).translate([k * c3 / 2, 0, h])).add(rr(L - 4, 1.6, 0.8).extrude(1.2).translate([0, k * c3 / 2, h])); });
  const X = rr(pieza, pieza * 0.24, pieza * 0.1).extrude(5).rotate([0, 0, 45]).add(rr(pieza, pieza * 0.24, pieza * 0.1).extrude(5).rotate([0, 0, -45])), O = circ(pieza).subtract(circ(pieza * 0.52)).extrude(5);
  const fichas = []; for (let i = 0; i < 5; i++) { fichas.push(X.translate([L / 2 + 14 + pieza / 2, -L / 2 + pieza / 2 + i * (pieza + 4), 0])); fichas.push(O.translate([L / 2 + 18 + pieza * 1.5, -L / 2 + pieza / 2 + i * (pieza + 4), 0])); }
  return tab.add(N.union(fichas));
}
// ======================= 🌀 PEONZA (se imprime boca abajo, sin soportes) =======================
function peonza(p) {
  const R = p.d / 2, e = p.eje / 2, Lh = p.mango, alto = R; // perfil girado: mango arriba, cuerpo y punta
  const P = [[0, 0], [e, 0], [e, Lh], [R, Lh + (R - e)], [R, Lh + (R - e) + 5], [1.2, Lh + (R - e) + 5 + R * 0.9], [0, Lh + (R - e) + 5 + R * 0.9 + 0.8]];
  void alto; return CS().ofPolygons([N.ccw(P)]).revolve(seg(p.d) * 2);
}
// ======================= 🔮 LABERINTO CIRCULAR PARA CANICA =======================
function laberintoCirc(p) {
  const b = p.bola, pasillo = b + 2, muro = 1.8, H = b + 1.5, anillos = Math.round(p.anillos), Rn = azar(p.semilla);
  const R0 = pasillo * 0.9, rIn = k => R0 + k * (pasillo + muro); // radio interior del anillo k
  const celdas = k => Math.max(6, Math.round(2 * Math.PI * (rIn(k) + pasillo / 2) / (pasillo * 1.6)));
  // laberinto perfecto: búsqueda en profundidad sobre la rejilla polar
  const C = []; for (let k = 0; k < anillos; k++) C.push(celdas(k));
  const id = (k, i) => k + ':' + ((i % C[k]) + C[k]) % C[k], visto = new Set(), abierto = new Set();
  const vecinos = (k, i) => { const v = [[k, i - 1], [k, i + 1]]; if (k + 1 < anillos) { const f = C[k + 1] / C[k]; for (let j = Math.floor(i * f); j < Math.floor((i + 1) * f); j++) v.push([k + 1, j]); } if (k > 0) { const f = C[k - 1] / C[k]; v.push([k - 1, Math.floor(i * f)]); } return v.map(([a, j]) => [a, ((j % C[a]) + C[a]) % C[a]]); };
  const pila = [[0, 0]]; visto.add(id(0, 0));
  while (pila.length) { const [k, i] = pila[pila.length - 1], V = vecinos(k, i).filter(([a, j]) => !visto.has(id(a, j))); if (!V.length) { pila.pop(); continue; } const [a, j] = V[Math.floor(Rn() * V.length)]; abierto.add([id(k, i), id(a, j)].sort().join('|')); visto.add(id(a, j)); pila.push([a, j]); }
  const abre = (A, B) => abierto.has([A, B].sort().join('|'));
  const sector = (r1, r2, a1, a2) => { const pts = [], nA = Math.max(4, Math.ceil(Math.abs(a2 - a1) * r2 / 2)); for (let t = 0; t <= nA; t++) { const a = a1 + (a2 - a1) * t / nA; pts.push([r2 * Math.cos(a), r2 * Math.sin(a)]); } for (let t = nA; t >= 0; t--) { const a = a1 + (a2 - a1) * t / nA; pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]); } return poli(pts); };
  const W = []; const Rext = rIn(anillos) - muro;
  W.push(circ(2 * (Rext + 4)).subtract(circ(2 * Rext))); // borde
  for (let k = 0; k < anillos; k++) { const n0 = C[k], rr0 = rIn(k) - muro, da = 2 * Math.PI / n0;
    for (let i = 0; i < n0; i++) {
      // muro radial entre la celda i y la i+1 del anillo k
      if (!abre(id(k, i), id(k, i + 1))) { const a = (i + 1) * da; W.push(rr(pasillo + 2 * muro, muro, 0.4).translate([rr0 + muro + pasillo / 2, 0]).rotate((a * 180 / Math.PI))); }
      // muro de dentro (hacia el anillo k−1): circular, con hueco si se abre
      if (k > 0) { const f = C[k - 1] / n0, jIn = Math.floor(i * f); if (!abre(id(k, i), id(k - 1, jIn))) W.push(sector(rr0, rr0 + muro, i * da - 0.01, (i + 1) * da + 0.01)); }
    }
  }
  // salida: el muro de fuera del último anillo tiene una puerta (la meta)
  let muros = CS().union(W).subtract(sector(Rext - 1, Rext + 5, -0.5 * (pasillo / Rext), 0.5 * (pasillo / Rext)));
  let m = circ(2 * (Rext + 4)).extrude(2).add(muros.extrude(H).translate([0, 0, 2]));
  m = m.add(circ(R0 * 2).subtract(circ(R0 * 2 - 3)).extrude(1).translate([0, 0, 2])); // la salida: el centro (marcado)
  // tapa: anillo con ventanas para ver la canica (en PETG transparente queda mejor)
  if (p.tapa) { let tapa = circ(2 * (Rext + 4)).extrude(1.6); for (let k = 0; k < 5; k++) { const ang = k * 72; tapa = tapa.subtract(sector(R0 + 2, Rext - 3, (ang + 6) * Math.PI / 180, (ang + 66) * Math.PI / 180).extrude(4).translate([0, 0, -1])); } tapa = tapa.add(circ(2 * (Rext + 4)).subtract(circ(2 * (Rext + 0.3))).extrude(4).translate([0, 0, 1.6 - 0.01])); m = m.add(tapa.translate([2 * (Rext + 4) + 10, 0, 0])); }
  return m;
}
// ======================= 🌀 TORRE DE CANICAS EN ESPIRAL =======================
function torreCanicas(p) {
  const b = p.bola, R = p.d / 2, H = p.alto, vueltas = p.vueltas, rc = b / 2 + 0.8, rEje = R - rc * 0.55; // la canica rueda por un surco en espiral
  let m = cil(2 * R, H);
  const pasos = Math.round(vueltas * 48), L = [];
  const pt = t => { const a = t * vueltas * 2 * Math.PI, z = H - 14 - t * (H - 26); return [rEje * Math.cos(a), rEje * Math.sin(a), z]; };
  const bola = q => M().sphere(rc, 20).translate(q).add(M().cylinder(rc * 0.7, rc * 0.72, 0.01, 4).rotate([0, 0, 45]).translate([q[0], q[1], q[2] + rc * 0.7])); // gota: punta arriba (sin soportes)
  for (let i = 0; i < pasos; i++) L.push(M().hull([bola(pt(i / pasos)), bola(pt((i + 1) / pasos))]));
  m = m.subtract(N.union(L));
  // embudo arriba y bandeja abajo
  m = m.subtract(M().cylinder(14, b * 0.7, R * 0.9, 64).translate([0, 0, H - 14 + 0.01]).intersect(M().cube([2 * R, 2 * R, 20]).translate([-R, -R, H - 14]))).subtract(M().hull([bola(pt(0)), M().sphere(rc, 20).translate([0, 0, H - 6])]));
  const bandeja = cil(2 * R + 4 * b, 4).add(cil(2 * R + 4 * b, 8).subtract(cil(2 * R + 4 * b - 4, 9, 1)).translate([0, 0, 0]));
  return m.translate([0, 0, 3]).add(bandeja);
}
// ======================= 🔮 SENKU (solitario de canicas) =======================
function senku(p) {
  const b = p.bola, paso = b + 4, L = 7 * paso + 10, H = 10;
  let t = circ(L + 2 * b + 14).extrude(H);
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { if (Math.abs(i) > 1 && Math.abs(j) > 1) continue; t = t.subtract(M().sphere(b / 2 + 0.4, 32).translate([i * paso, j * paso, H + b * 0.15])); }
  // el surco de alrededor (para las canicas que se comen)
  const rS = L / 2 + b / 2 + 2; t = t.subtract(CS().ofPolygons([N.ccw(circulo(b / 2 + 0.6, 0, 0, 24).map(([x, y]) => [x + rS, y]))]).revolve(160).translate([0, 0, H + b * 0.1]));
  return t;
}
// ======================= 🧬 ADN · ⚗️ MOLÉCULAS · ☀️ RELOJ DE SOL =======================
function adn(p) {
  const H = p.alto, R = p.d / 2, vueltas = p.vueltas, n = Math.round(vueltas * 10), L = [], rT = Math.max(2.4, R * 0.14);
  const P = (t, fase) => { const a = t * vueltas * 2 * Math.PI + fase; return [R * Math.cos(a), R * Math.sin(a), 6 + t * (H - 12)]; };
  for (let i = 0; i < 80 * vueltas; i++) { const t0 = i / (80 * vueltas), t1 = (i + 1) / (80 * vueltas); [0, Math.PI * 0.8].forEach(f => L.push(M().hull([M().sphere(rT, 16).translate(P(t0, f)), M().sphere(rT, 16).translate(P(t1, f))]))); }
  for (let i = 0; i <= n; i++) { const t = i / n, A = P(t, 0), B = P(t, Math.PI * 0.8); L.push(M().hull([M().sphere(rT * 0.55, 12).translate(A), M().sphere(rT * 0.55, 12).translate(B)])); }
  const base = cil(2 * R + 16, 5).add(cil(2 * R + 8, 3, 5));
  return N.union(L).translate([0, 0, 2]).add(base);
}
const ATOMOS = { C: ['Carbono (4 enlaces, tetraedro)', 4], O: ['Oxígeno (2 enlaces, 104,5°)', 2], H: ['Hidrógeno (1 enlace)', 1], N: ['Nitrógeno (3 enlaces, 107°)', 3] };
function dirsDe(k) { if (k === 4) return [[0, 0, 1], [0.9428, 0, -0.3333], [-0.4714, 0.8165, -0.3333], [-0.4714, -0.8165, -0.3333]]; if (k === 3) { const a = 107 * Math.PI / 180, z = -Math.cos(Math.PI - 1.9), r = Math.sqrt(1 - z * z); void a; return [0, 1, 2].map(i => [r * Math.cos(i * 2 * Math.PI / 3), r * Math.sin(i * 2 * Math.PI / 3), z]); } if (k === 2) { const h = 104.5 / 2 * Math.PI / 180; return [[Math.sin(h), 0, Math.cos(h)], [-Math.sin(h), 0, Math.cos(h)]]; } return [[0, 0, 1]]; }
function moleculas(p) {
  const D = p.d, palo = p.palo, L = [];
  const atomo = k => { let a = M().sphere(D / 2, 48); dirsDe(ATOMOS[k][1]).forEach(d => { const q = M().cylinder(D * 0.4 + 1, (palo + 0.35) / 2, (palo + 0.35) / 2, 24).translate([0, 0, D / 2 - D * 0.4]); const ax = Math.atan2(d[1], d[0]) * 180 / Math.PI, ay = Math.acos(Math.max(-1, Math.min(1, d[2]))) * 180 / Math.PI; a = a.subtract(q.rotate([0, ay, ax])); }); return a; };
  const cant = { C: p.c, O: p.o, H: p.h, N: p.n };
  Object.keys(ATOMOS).forEach(k => { for (let i = 0; i < Math.round(cant[k]); i++) { const a = atomo(k), b = N.caja(a); L.push(a.trimByPlane([0, 0, 1], b.min[2] + 1.2)); } }); // base plana (1,2 mm) para que no ruede en la cama
  for (let i = 0; i < Math.round(p.palos); i++) L.push(cil(palo, p.largo).add(M().cylinder(0.6, palo / 2, palo / 2 - 0.5, 24).translate([0, 0, p.largo])));
  return enFila(L, 4, 8);
}
function relojSol(p) {
  const lat = p.lat * Math.PI / 180, R = p.d / 2, h = 5, L = [];
  let disco = circ(2 * R).extrude(h);
  for (let hh = -6; hh <= 6; hh++) { const ang = Math.atan(Math.sin(lat) * Math.tan(hh * 15 * Math.PI / 180)), a = Math.PI / 2 - ang; // 12 h hacia el norte (+Y)
    const lin = rr(R * 0.5, 1.2, 0.6).translate([R * 0.25 + R * 0.25, 0]).rotate(a * 180 / Math.PI); L.push(lin);
    const hora = ((hh + 12 + 11) % 12) + 1; const T = N.centraCS(N.texto2(String(hh + 12 > 12 ? hh : hh + 12), 'gorda', R * 0.09)); void hora; L.push(T.translate([R * 0.86 * Math.cos(a), R * 0.86 * Math.sin(a)])); }
  disco = disco.subtract(CS().union(L).extrude(1.2).translate([0, 0, h - 1.2]));
  // gnomon: triángulo con el ángulo de TU latitud
  const Lg = R * 0.62, g = poli([[0, 0], [Lg, 0], [Lg, Lg * Math.tan(lat)]]).extrude(3).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, -1.5, 0, h - 0.5, 1]); // el borde inclinado (el «estilo») sube desde el centro hacia el NORTE con el ángulo de tu latitud
  return disco.add(g);
}
// ======================= 🎲 DADOS DE ROL (D4–D20) y bandeja =======================
const PHI = (1 + Math.sqrt(5)) / 2;
const VERT = {
  4: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  6: [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]],
  8: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  12: [...[[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]], ...[[0, 1 / PHI, PHI], [0, -1 / PHI, PHI], [0, 1 / PHI, -PHI], [0, -1 / PHI, -PHI], [1 / PHI, PHI, 0], [-1 / PHI, PHI, 0], [1 / PHI, -PHI, 0], [-1 / PHI, -PHI, 0], [PHI, 0, 1 / PHI], [-PHI, 0, 1 / PHI], [PHI, 0, -1 / PHI], [-PHI, 0, -1 / PHI]]],
  20: [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]]
};
export function dado(caras, tam, prof, conNumeros = true) {
  // tamaño de cara a cara (como los dados de verdad): se mide el radio inscrito del poliedro unidad
  const V = VERT[caras], m1 = M().hull(V), me1 = m1.getMesh(); let rin = Infinity; for (let t = 0; t < me1.triVerts.length; t += 3) { const q = [0, 1, 2].map(j => [0, 1, 2].map(c2 => me1.vertProperties[me1.triVerts[t + j] * me1.numProp + c2])), u = q[1].map((v, i) => v - q[0][i]), w = q[2].map((v, i) => v - q[0][i]), nn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...nn); if (l > 1e-9) rin = Math.min(rin, Math.abs((nn[0] * q[0][0] + nn[1] * q[0][1] + nn[2] * q[0][2]) / l)); }
  const esc = tam / 2 / rin;
  let m = M().hull(V.map(v => v.map(x => x * esc)));
  // las caras: normales distintas de la malla (agrupadas)
  const me = m.getMesh(), P = me.vertProperties, T = me.triVerts, np = me.numProp, caras2 = [];
  for (let t = 0; t < T.length; t += 3) { const a = [0, 1, 2].map(j => [P[T[t] * np + j], P[T[t + 1] * np + j], P[T[t + 2] * np + j]]); const A = [P[T[t] * np], P[T[t] * np + 1], P[T[t] * np + 2]], B = [P[T[t + 1] * np], P[T[t + 1] * np + 1], P[T[t + 1] * np + 2]], C = [P[T[t + 2] * np], P[T[t + 2] * np + 1], P[T[t + 2] * np + 2]]; void a;
    const u = B.map((v, i) => v - A[i]), w = C.map((v, i) => v - A[i]), nn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...nn); if (l < 1e-9) continue; const nu = nn.map(x => x / l);
    let f = caras2.find(q => q.n[0] * nu[0] + q.n[1] * nu[1] + q.n[2] * nu[2] > 0.999); if (!f) { f = { n: nu, pts: [] }; caras2.push(f); } f.pts.push(A, B, C); }
  if (conNumeros) {
    const numeros = caras2.map((f, i) => i + 1), L = [];
    caras2.forEach((f, i) => { const cen = [0, 1, 2].map(j => f.pts.reduce((s2, q) => s2 + q[j], 0) / f.pts.length), nn = f.n, up0 = Math.abs(nn[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0], d = up0[0] * nn[0] + up0[1] * nn[1] + up0[2] * nn[2], up = up0.map((x, j) => x - d * nn[j]), lu = Math.hypot(...up), v = up.map(x => x / lu), uu = [v[1] * nn[2] - v[2] * nn[1], v[2] * nn[0] - v[0] * nn[2], v[0] * nn[1] - v[1] * nn[0]];
      const txt = String(numeros[i]) + (numeros[i] === 6 || numeros[i] === 9 ? '.' : ''), altoT = tam * (caras === 20 ? 0.16 : caras === 12 ? 0.2 : caras === 4 ? 0.2 : 0.3);
      let T2 = N.centraCS(N.texto2(txt, 'gorda', altoT)); if (caras === 4) T2 = T2.translate([0, -altoT * 0.4]);
      const M4 = [uu[0], uu[1], uu[2], 0, v[0], v[1], v[2], 0, nn[0], nn[1], nn[2], 0, cen[0] - nn[0] * prof, cen[1] - nn[1] * prof, cen[2] - nn[2] * prof, 1];
      L.push(T2.extrude(prof + 1).transform(M4)); }); // (matriz 4×4 por columnas, como espera Manifold)
    m = m.subtract(N.union(L));
  }
  // apoyado en una cara (la de abajo), sin soportes
  const fa = caras2.reduce((a, b2) => (b2.n[2] < a.n[2] ? b2 : a)); const ax = [-fa.n[1], fa.n[0], 0], ang = Math.acos(Math.max(-1, Math.min(1, -fa.n[2]))) * 180 / Math.PI;
  if (Math.hypot(...ax) > 1e-6 && ang > 0.01) { const q = ax.map(x => x / Math.hypot(...ax)); m = rotaEje(m, q, ang); }
  return m;
}
function rotaEje(m, q, ang) { const a = ang * Math.PI / 180, c0 = Math.cos(a), s0 = Math.sin(a), [x, y, z] = q, t = 1 - c0; const R = [t * x * x + c0, t * x * y - s0 * z, t * x * z + s0 * y, t * x * y + s0 * z, t * y * y + c0, t * y * z - s0 * x, t * x * z - s0 * y, t * y * z + s0 * x, t * z * z + c0]; return m.transform([R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, 0, 0, 0, 1]); }
function dadosRol(p) {
  const L = []; const lista = p.cuales === 'juego' ? [4, 6, 8, 12, 20] : [Number(p.cuales)];
  lista.forEach(k => L.push(dado(k, p.tam * (k === 4 ? 0.6 : k === 20 ? 1.08 : 1), p.prof))); /* el D4 se mide distinto: así sale de unos 22 mm de alto */
  return enFila(L, 6, 5);
}
function bandejaDados(p) {
  const R = p.d / 2, H = p.alto; const hexa = r => N.cs([N.ccw([0, 1, 2, 3, 4, 5].map(i => [r * Math.cos(i * Math.PI / 3), r * Math.sin(i * Math.PI / 3)]))], 'Positive');
  return hexa(R).extrude(H).subtract(hexa(R - p.pared).offset(-3, 'Round').offset(3, 'Round').extrude(H).translate([0, 0, 2.4]));
}

export const DISENOS_JUEGOS = {
  arcoirisApilable: { cat: 'ninos', e: '🌈', t: 'Arcoíris apilable (Montessori)', d: 'Arcos que encajan uno en otro: para apilar, contar y jugar', uso: 'deco', color: '#ff8c42', nuevo: true,
    campos: [n('n', 'Arcos', 6, 3, 9, 1, ''), n('hueco', 'Hueco del centro', 30, 15, 80, 1), n('grueso', 'Grueso de cada arco', 12, 6, 25, 0.5), n('fondo', 'Fondo', 30, 15, 60, 1)],
    gen: p => arcoiris(p), nota: p => 'Salen ' + Math.round(p.n) + ' arcos tumbados, uno dentro de otro (0,6 mm entre ellos): sin soportes. Para el arcoíris de colores, imprime cada arco de su color (elige solo ese en Bambu) o pinta. PLA, esquinas redondeadas por fuera.' },
  tangram: { cat: 'ninos', tambien: ['juegos'], e: '🧩', t: 'Tangram (7 piezas + caja)', d: 'El puzle chino: forma animales y figuras', uso: 'deco', color: '#3a86ff', nuevo: true,
    campos: [n('lado', 'Lado del cuadrado', 100, 60, 160, 1), n('grosor', 'Grosor', 6, 3, 12, 0.5), c('caja', 'Con su caja', true)],
    gen: p => tangram(p), nota: () => 'Las 7 piezas clásicas con 0,4 mm entre ellas (encajan en la caja sin forzar). Sin soportes.' },
  cuboSoma: { cat: 'ninos', tambien: ['juegos', 'ciencia'], e: '🧊', t: 'Cubo Soma (7 piezas → un cubo)', d: 'Rompecabezas 3D: 240 maneras de hacer el cubo', uso: 'deco', color: '#2a9d8f', nuevo: true,
    campos: [n('cubo', 'Tamaño de cada cubito', 20, 12, 30, 1)],
    gen: p => soma(p), nota: p => 'Las 7 piezas del cubo Soma (27 cubitos de ' + p.cubo + ' mm; cada uno 0,4 mm más pequeño para que cierre sin forzar). Sin soportes.' },
  tresEnRaya: { cat: 'ninos', tambien: ['juegos'], e: '⭕', t: 'Tres en raya (tablero + fichas)', d: 'Tablero con huecos y 5 X y 5 O', uso: 'deco', color: '#ffb703', nuevo: true,
    campos: [n('lado', 'Lado del tablero', 120, 80, 200, 1)], gen: p => tresEnRaya(p), dosColores: () => ({ z: 4, color: '#1b1b1f' }),
    nota: () => 'Tablero y fichas en una placa. 🌈 Las líneas del tablero (a 4 mm) pueden ir de otro color. Las X y las O, cada una de su color si las imprimes aparte.' },
  peonza: { cat: 'ninos', tambien: ['juegos'], e: '🌀', t: 'Peonza', d: 'Gira de verdad: se imprime boca abajo, sin soportes', uso: 'pieza', color: '#e63946', nuevo: true,
    campos: [n('d', 'Diámetro', 50, 30, 80, 1), n('eje', 'Grosor del mango', 9, 6, 14, 0.5), n('mango', 'Largo del mango', 16, 10, 30, 1)],
    gen: p => peonza(p), nota: () => 'Se imprime BOCA ABAJO (el mango en la cama): el cuerpo sube a 45° y no necesita soportes. Relleno 100 % o 6 paredes: con peso gira más tiempo.' },
  laberintoCircular: { cat: 'canicas', tambien: ['ninos', 'juegos'], e: '🔮', t: 'Laberinto circular de canica', d: 'Llega al centro inclinándolo · cada número, un laberinto distinto', uso: 'deco', color: '#9b5de5', nuevo: true,
    campos: [n('bola', 'Canica (diámetro)', 12, 6, 18, 0.5), n('anillos', 'Anillos (dificultad)', 5, 3, 9, 1, ''), n('semilla', 'Laberinto nº', 21, 1, 9999, 1, ''), c('tapa', 'Con tapa con ventanas (mejor en PETG transparente)', true)],
    gen: p => laberintoCirc(p), nota: p => 'Laberinto perfecto (un solo camino) de ' + Math.round(p.anillos) + ' anillos para una canica de ' + p.bola + ' mm: entra por la puerta de fuera y llega al centro. La tapa (aparte) encaja por fuera. Cambia el número y sale otro laberinto.' },
  torreCanicas: { cat: 'canicas', tambien: ['ninos'], e: '🌀', t: 'Torre de canicas en espiral', d: 'Echa la canica arriba y baja dando vueltas hasta la bandeja', uso: 'deco', color: '#00b4d8', nuevo: true,
    campos: [n('bola', 'Canica (diámetro)', 16, 10, 22, 0.5), n('d', 'Diámetro de la torre', 70, 50, 120, 1), n('alto', 'Alto', 180, 100, 250, 1), n('vueltas', 'Vueltas de la espiral', 4, 2, 8, 0.5, '')],
    gen: p => torreCanicas(p), nota: () => 'El surco tiene forma de gota (punta arriba): se imprime de pie, sin soportes. Canicas de cristal de 16 mm.' },
  senku: { cat: 'canicas', tambien: ['juegos', 'adultos'], e: '🔮', t: 'Senku (solitario de canicas)', d: 'El clásico: salta canicas hasta dejar solo una', uso: 'deco', color: '#8d6e63', nuevo: true,
    campos: [n('bola', 'Canica (diámetro)', 16, 10, 20, 0.5)], gen: p => senku(p), nota: () => 'Tablero en cruz de 33 huecos y surco alrededor para las canicas que «te comes». Sin soportes. En PLA madera queda precioso.' },
  adnModelo: { cat: 'ciencia', tambien: ['ninos', 'jovenes'], e: '🧬', t: 'Doble hélice de ADN', d: 'Modelo con sus pares de bases, sobre peana', uso: 'deco', color: '#3a86ff', nuevo: true,
    campos: [n('alto', 'Alto', 160, 80, 250, 1), n('d', 'Diámetro', 40, 24, 70, 1), n('vueltas', 'Vueltas', 2, 1, 4, 0.5, '')], gen: p => adnModelo(p),
    nota: () => 'Las dos cadenas giran como el ADN de verdad (con el surco mayor y el menor) y los peldaños son los pares de bases. Se imprime de pie: los peldaños son puentes cortos (sin soportes).' },
  moleculas: { cat: 'ciencia', tambien: ['ninos', 'jovenes'], e: '⚗️', t: 'Kit de moléculas para montar', d: 'Átomos con los ángulos de verdad (C, O, H, N) y enlaces', uso: 'deco', color: '#2b2d42', nuevo: true,
    campos: [n('c', 'Carbonos', 2, 0, 8, 1, ''), n('o', 'Oxígenos', 2, 0, 8, 1, ''), n('h', 'Hidrógenos', 6, 0, 16, 1, ''), n('n', 'Nitrógenos', 1, 0, 6, 1, ''), n('palos', 'Enlaces', 12, 0, 30, 1, ''), n('d', 'Tamaño de los átomos', 20, 12, 30, 1), n('palo', 'Grosor del enlace', 4, 3, 6, 0.1), n('largo', 'Largo del enlace', 22, 12, 40, 1)],
    gen: p => moleculas(p), nota: () => 'Carbono con 4 agujeros en tetraedro (109,5°), oxígeno con 2 (104,5°, como el agua), nitrógeno con 3 y el hidrógeno con 1. Monta agua (H₂O), metano (CH₄), amoniaco (NH₃), etanol… Colores de la ciencia: C negro, O rojo, H blanco, N azul.' },
  relojSol: { cat: 'ciencia', tambien: ['hogar', 'adultos'], e: '☀️', t: 'Reloj de sol (para tu latitud)', d: 'Las líneas de las horas calculadas para donde vives', uso: 'deco', color: '#d4a017', nuevo: true,
    campos: [n('lat', 'Latitud de tu ciudad', 40.4, 0, 70, 0.1, '°'), n('d', 'Diámetro', 180, 100, 250, 1)], gen: p => relojSol(p),
    nota: p => 'Calculado para ' + n2(p.lat) + '° (Madrid 40,4 · Barcelona 41,4 · Sevilla 37,4). Ponlo plano y con el gnomon apuntando al NORTE. Marca la hora solar (en invierno suma 1 h; en verano, 2).' },
  dadosRol: { cat: 'frikis', tambien: ['juegos', 'jovenes'], e: '🎲', t: 'Dados de rol (D4, D6, D8, D12, D20)', d: 'Con números grabados · el juego entero o uno', uso: 'deco', color: '#7b2cbf', nuevo: true,
    campos: [s('cuales', 'Cuáles', 'juego', [['juego', 'El juego (D4, D6, D8, D12, D20)'], ['4', 'D4'], ['6', 'D6'], ['8', 'D8'], ['12', 'D12'], ['20', 'D20']]), n('tam', 'Tamaño', 22, 14, 40, 1), n('prof', 'Hondo de los números', 0.8, 0.4, 1.6, 0.1)],
    gen: p => dadosRol(p), nota: () => 'Cada dado apoyado en una cara (sin soportes). Los números van grabados: rellénalos con pintura acrílica y limpia la cara (queda de tienda). El 6 y el 9 llevan punto.' },
  bandejaDados: { cat: 'frikis', tambien: ['juegos'], e: '⬡', t: 'Bandeja de dados hexagonal', d: 'Para tirar los dados sin que se escapen', uso: 'deco', color: '#1b1b1f', nuevo: true,
    campos: [n('d', 'Ancho', 180, 100, 250, 1), n('alto', 'Alto', 30, 15, 50, 1), n('pared', 'Pared', 4, 2, 8, 0.5)], gen: p => bandejaDados(p), nota: () => 'Pon fieltro en el fondo para que suene menos. Sin soportes.' }
};
function adnModelo(p) { return adn(p); }
