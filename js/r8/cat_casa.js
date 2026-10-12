// ================= v30.3 · 🏠 CASA DE MUÑECAS · 🐜 HORMIGUERO · 🗄️ CAJONERA · 🪴 MACETAS CON PLATO =================
// La dueña (11-10-2026): «más miniaturas para hacer repuesto de casas de muñecas… gente que quiere hacer colonia de hormigas…
// mejores organizadores de doble cajón… macetas para plantar». Medidas REALES de cada mueble pasadas a la escala (1:12 casa de
// muñecas de coleccionista, 1:6 Barbie, 1:24); hormiguero con medidas de hormiguero de verdad (cámaras de 3 a 8 mm, tubo de 6 o
// 10 mm, cristal de metacrilato de 2 mm con tornillos M3, tubo de agua de 16 mm); cajones con 0,4 mm de holgura por lado.
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
const caja = (x, y, z, r = 0) => rr(x, y, r).extrude(z); // centrada en X e Y, de z = 0 a z
const azar = sem => { let x = (Math.abs(Math.round(sem)) || 1) * 2654435761 % 4294967296; return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; };
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');

// ======================= 🏠 CASA DE MUÑECAS (medidas reales en cm → escala) =======================
const ESCALAS = [['12', '1:12 (casa de muñecas clásica)'], ['6', '1:6 (Barbie y muñecas de moda)'], ['24', '1:24 (casita pequeña)']];
// cada mueble en CENTÍMETROS de verdad; k = mm por cm a esa escala (10 / escala). Se imprimen tal cual salen (sin soportes).
const MUEBLES = {
  silla: ['Silla de comedor', k => { const P = 3.2 * k; let m = caja(44 * k, 44 * k, 4 * k, 1 * k).translate([0, 0, 42 * k]); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { m = m.add(caja(P, P, 44 * k).translate([a * (22 * k - P / 2), b * (22 * k - P / 2), 0])); }); m = m.add(caja(44 * k, 3 * k, 46 * k, 1 * k).translate([0, 22 * k - 1.5 * k, 44 * k])); for (let i = -1; i <= 1; i++) m = m.subtract(caja(8 * k, 6 * k, 26 * k).translate([i * 12 * k, 22 * k - 1.5 * k, 54 * k])); return m; }],
  mesa: ['Mesa de comedor (se imprime boca abajo)', k => { let m = caja(120 * k, 80 * k, 4 * k, 3 * k); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { m = m.add(M().cylinder(72 * k, 3 * k, 2.2 * k, 32).translate([a * 52 * k, b * 32 * k, 3.9 * k])); }); return m.add(caja(108 * k, 2.5 * k, 9 * k).translate([0, 34 * k, 3.9 * k])).add(caja(108 * k, 2.5 * k, 9 * k).translate([0, -34 * k, 3.9 * k])); }],
  cama: ['Cama de matrimonio', k => { let m = caja(150 * k, 200 * k, 30 * k, 2 * k); m = m.add(caja(146 * k, 194 * k, 22 * k, 6 * k).translate([0, -1 * k, 29 * k])); m = m.add(caja(150 * k, 6 * k, 105 * k, 2 * k).translate([0, 97 * k, 0])); [-1, 1].forEach(a => { m = m.add(caja(62 * k, 32 * k, 12 * k, 5 * k).translate([a * 35 * k, 72 * k, 50 * k])); }); return m.add(caja(150 * k, 70 * k, 5 * k, 2 * k).translate([0, -64 * k, 50 * k])); }],
  camita: ['Cama individual', k => { let m = caja(90 * k, 200 * k, 30 * k, 2 * k).add(caja(86 * k, 194 * k, 20 * k, 6 * k).translate([0, -1 * k, 29 * k])).add(caja(90 * k, 6 * k, 95 * k, 2 * k).translate([0, 97 * k, 0])); return m.add(caja(60 * k, 32 * k, 12 * k, 5 * k).translate([0, 72 * k, 48 * k])); }],
  sofa: ['Sofá de tres plazas', k => { let m = caja(200 * k, 90 * k, 42 * k, 4 * k); m = m.add(caja(200 * k, 22 * k, 85 * k, 6 * k).translate([0, 34 * k, 0])); [-1, 1].forEach(a => { m = m.add(caja(20 * k, 90 * k, 62 * k, 6 * k).translate([a * 90 * k, 0, 0])); }); for (let i = -1; i <= 1; i++) m = m.add(caja(52 * k, 62 * k, 12 * k, 5 * k).translate([i * 54 * k, -10 * k, 41 * k])); return m; }],
  armario: ['Armario de dos puertas', k => { let m = caja(100 * k, 55 * k, 190 * k, 1 * k); m = m.subtract(caja(1 * k, 4 * k, 180 * k).translate([0, -27.5 * k, 5 * k])); [-1, 1].forEach(a => { m = m.subtract(caja(42 * k, 2 * k, 170 * k, 2 * k).translate([a * 24 * k, -28 * k, 10 * k])); m = m.add(M().sphere(2.2 * k, 16).translate([a * 6 * k, -27.5 * k, 100 * k])); }); return m.add(caja(104 * k, 58 * k, 4 * k, 1 * k).translate([0, 0, 190 * k - 0.1])); }],
  cocina: ['Mueble de cocina (fuegos y fregadero)', k => { let m = caja(120 * k, 60 * k, 88 * k, 1 * k).add(caja(124 * k, 62 * k, 4 * k, 1 * k).translate([0, 0, 88 * k - 0.1])); m = m.subtract(caja(40 * k, 36 * k, 18 * k, 4 * k).translate([30 * k, 2 * k, 76 * k])); [[-38, 10], [-18, 10], [-38, -12], [-18, -12]].forEach(([x, y]) => { m = m.add(N.cs([N.ccw(circulo(7 * k, 0, 0, 32)), circulo(5 * k, 0, 0, 32)], 'EvenOdd').extrude(1.2 * k).translate([x * k, y * k, 92 * k - 0.1])); }); [-30, 0, 30].forEach(x => { m = m.subtract(caja(26 * k, 2 * k, 66 * k, 2 * k).translate([x * k, -30.5 * k, 8 * k])); m = m.add(caja(10 * k, 2 * k, 2 * k, 1 * k).translate([x * k, -30.5 * k, 66 * k])); }); return m; }],
  nevera: ['Nevera (frigorífico)', k => { let m = caja(60 * k, 65 * k, 180 * k, 5 * k); m = m.subtract(caja(58 * k, 2 * k, 1 * k).translate([0, -32.5 * k, 120 * k])); [[150, 25], [60, 50]].forEach(([z, l]) => { m = m.add(caja(3 * k, 4 * k, l * k, 1.5 * k).translate([22 * k, -33.5 * k, (z - l / 2) * k])); }); return m; }],
  banera: ['Bañera con patas', k => { const ext = caja(170 * k, 75 * k, 50 * k, 18 * k).translate([0, 0, 8 * k]), dentro = caja(156 * k, 61 * k, 50 * k, 14 * k).translate([0, 0, 18 * k]); let m = ext.subtract(dentro); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { m = m.add(M().cylinder(9 * k, 4 * k, 2.5 * k, 24).translate([a * 70 * k, b * 26 * k, 0])); }); return m.add(caja(150 * k, 50 * k, 1 * k).translate([0, 0, 7.5 * k])); }],
  inodoro: ['Inodoro', k => { let m = M().cylinder(40 * k, 14 * k, 18 * k, 48).scale([1, 1.35, 1]); m = m.add(caja(40 * k, 18 * k, 40 * k, 3 * k).translate([0, 26 * k, 38 * k])); m = m.subtract(M().cylinder(12 * k, 12 * k, 14 * k, 48).scale([1, 1.35, 1]).translate([0, 0, 30 * k])); return m.add(N.cs([N.ccw(circulo(18 * k, 0, 0, 48)), circulo(12.5 * k, 0, 0, 48)], 'EvenOdd').extrude(2 * k).scale([1, 1.35, 1]).translate([0, 0, 40 * k - 0.1])); }],
  lampara: ['Lámpara de pie', k => { let m = M().cylinder(3 * k, 15 * k, 15 * k, 48).add(cil(2.5 * k, 160 * k, 3 * k)); const pant = M().cylinder(28 * k, 24 * k, 14 * k, 48).subtract(M().cylinder(26 * k, 22.5 * k, 13 * k, 48).translate([0, 0, -1])); return m.add(pant.translate([0, 0, 135 * k])); }], /* la pantalla, cerrada arriba y cogida al palo */
  estanteria: ['Estantería', k => { let m = caja(80 * k, 30 * k, 180 * k, 0.5 * k).subtract(caja(76 * k, 30 * k, 176 * k).translate([0, -2 * k, 2 * k])); [45, 90, 135].forEach(z => { m = m.add(caja(78 * k, 28 * k, 2 * k).translate([0, -1 * k, z * k])); }); /* abierta por DELANTE */ return m; }],
  escalera: ['Escalera recta (10 peldaños)', k => { const L = []; for (let i = 0; i < 10; i++) L.push(caja(80 * k, (25 + 0.5) * k, (i + 1) * 18 * k).translate([0, i * 25 * k, 0])); return N.union(L); }]
};
function casaMunecas(p) { const k = 10 / Number(p.escala), F = MUEBLES[p.mueble] || MUEBLES.silla; return F[1](k); }

// ======================= 🐜 HORMIGUERO (nido con metacrilato) y zona de forrajeo =======================
function hormiguero(p) {
  const W = p.ancho, H = p.alto, cam = p.camara, acr = p.metacrilato + 0.2, base = 3, T = base + cam + acr, mg = 8, Rn = azar(p.semilla);
  let m = rr(W, H, 4).extrude(T);
  // el hueco del metacrilato (el cristal queda a ras) y los agujeros de los tornillos M3 (rosca en el plástico: 2,6 mm)
  m = m.subtract(rr(W - 2 * mg + 4, H - 2 * mg + 4, 2).extrude(acr + 1).translate([0, 0, T - acr]));
  const tornillos = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]].slice(0, Math.round(p.tornillos)).map(([a, b]) => [a * (W / 2 - mg + 5.5), b * (H / 2 - mg + 5.5)]);
  // cámaras al azar (que no se pisen) + túneles que las unen (árbol mínimo) + la entrada desde el tubo
  const C = [], area = [W - 2 * mg - 10, H - 2 * mg - 10];
  for (let i = 0; i < 200 && C.length < Math.round(p.camaras); i++) { const r = (7 + Rn() * 9) * p.tamCamara / 100, x = (Rn() - 0.5) * (area[0] - 2 * r), y = (Rn() - 0.5) * (area[1] - 2 * r) - (p.agua ? 10 : 0) * 0.5; if (C.every(q => Math.hypot(q.x - x, q.y - y) > q.r + r + p.tunel + 2) && Math.abs(y) + r < area[1] / 2 - (p.agua ? 10 : 0)) C.push({ x, y, r, rx: r * (1 + Rn() * 0.5), ang: Rn() * 180 }); }
  const sala = q => { const P2 = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 2 * Math.PI, rr2 = 1 + 0.12 * Math.sin(3 * a + q.ang); P2.push([q.x + q.rx * rr2 * Math.cos(a) * Math.cos(q.ang * Math.PI / 180) - q.r * rr2 * Math.sin(a) * Math.sin(q.ang * Math.PI / 180), q.y + q.rx * rr2 * Math.cos(a) * Math.sin(q.ang * Math.PI / 180) + q.r * rr2 * Math.sin(a) * Math.cos(q.ang * Math.PI / 180)]); } return N.cs([N.ccw(P2)], 'Positive'); };
  const tunel = (a, b) => CS().hull([circ(p.tunel).translate([a.x, a.y]), circ(p.tunel).translate([b.x, b.y])]);
  const usado = [0], T2 = [], entrada = { x: -W / 2 + mg - 2, y: C.length ? C[0].y : 0 };
  while (usado.length < C.length) { let mejor = null, md = Infinity; usado.forEach(i => C.forEach((q, j) => { if (usado.includes(j)) return; const d = Math.hypot(C[i].x - q.x, C[i].y - q.y); if (d < md) { md = d; mejor = [i, j]; } })); T2.push(tunel(C[mejor[0]], C[mejor[1]])); usado.push(mejor[1]); }
  const salida = C.reduce((a, b) => (b.x > a.x ? b : a), C[0] || { x: 0, y: 0 });
  let hueco = CS().union(C.map(sala).concat(T2, [tunel(entrada, C[0] || entrada), tunel(salida, { x: W / 2 - mg + 2, y: salida.y })]));
  // depósito de agua: canal para un tubo de ensayo de 16 mm abajo, unido por una ranura fina (la humedad pasa, las hormigas no)
  if (p.agua) { hueco = hueco.add(rr(W - 2 * mg - 6, 2, 1).translate([0, -H / 2 + mg + 13])); }
  m = m.subtract(hueco.extrude(cam + 0.01).translate([0, 0, base]));
  if (p.agua) m = m.subtract(M().cylinder(W - 2 * mg, 8.3, 8.3, 48).rotate([0, 90, 0]).translate([-(W - 2 * mg) / 2, -H / 2 + mg + 5, base + 8.3 - 2]).add(M().cylinder(mg + 2, 8.3, 8.3, 48).rotate([0, 90, 0]).translate([-W / 2 - 1, -H / 2 + mg + 5, base + 8.3 - 2])));
  // los dos puertos para el tubo (entrada desde la zona de forrajeo y salida)
  const dt = p.tubo + 0.3; [[-1, entrada.y], [1, salida.y]].forEach(([lado, y]) => { m = m.subtract(M().cylinder(mg + 4, dt / 2, dt / 2, 32).rotate([0, 90, 0]).translate([lado < 0 ? -W / 2 - 1 : W / 2 - mg - 3, y, base + Math.min(cam, dt) / 2])); });
  tornillos.forEach(([x, y]) => { m = m.subtract(cil(2.6, T + 2, -1).translate([x, y, 0])); });
  if (p.forrajeo) { // la zona de forrajeo: caja con borde que se inclina hacia dentro (antifugas) y tapa con rejilla fina
    const A = p.ancho, B = p.alto * 0.8, h2 = 40; let fz = rr(A, B, 6).extrude(h2).subtract(rr(A - 4, B - 4, 4).extrude(h2).translate([0, 0, 2.4]));
    fz = fz.add(M().hull([rr(A - 3.8, B - 3.8, 4).extrude(0.01).translate([0, 0, h2 - 6]), rr(A - 10, B - 10, 4).extrude(0.01).translate([0, 0, h2 - 0.01])]).subtract(rr(A - 10, B - 10, 4).extrude(10).translate([0, 0, h2 - 7])).subtract(M().hull([rr(A - 4, B - 4, 4).extrude(0.01).translate([0, 0, h2 - 6.01]), rr(A - 10.01, B - 10.01, 4).extrude(0.01).translate([0, 0, h2 - 0.02])])));
    fz = fz.subtract(M().cylinder(10, dt / 2, dt / 2, 32).rotate([0, 90, 0]).translate([-A / 2 - 3, 0, 2.4 + dt / 2 + 2]));
    let tapa = rr(A, B, 6).extrude(2); for (let x = -A / 2 + 14; x < A / 2 - 14; x += 2.2) tapa = tapa.subtract(caja(0.9, B * 0.5, 4).translate([x, 0, -1]));
    m = m.add(fz.translate([0, H / 2 + B / 2 + 8, 0])).add(tapa.translate([A + 8, H / 2 + B / 2 + 8, 0]));
  }
  return m;
}
// ======================= 🗄️ CAJONERA DE DOS CAJONES (apilable) =======================
function cajonera(p) {
  const W = p.ancho, D = p.fondo, Hc = p.altoCajon, nC = Math.round(p.cajones), pared = 2.4, hol = 0.4, sep = 2.4;
  const Ht = nC * Hc + (nC + 1) * sep, out = [];
  let mueble = caja(W, D, Ht, 2);
  for (let i = 0; i < nC; i++) mueble = mueble.subtract(caja(W - 2 * pared, D, Hc).translate([0, -pared, sep + i * (Hc + sep)]));
  if (p.apilable) { [-1, 1].forEach(a => { mueble = mueble.add(cil(6, 3, Ht - 0.01).translate([a * (W / 2 - 10), D * 0.2, 0])).subtract(cil(6.6, 3.4, -0.01).translate([a * (W / 2 - 10), D * 0.2, 0])); }); }
  // se imprime TUMBADO sobre la espalda (las aberturas hacia arriba): así las baldas no son puentes de 15 cm en el aire
  mueble = mueble.rotate([-90, 0, 0]); { const b = N.caja(mueble); mueble = mueble.translate([0, -(b.min[1] + b.max[1]) / 2, -b.min[2]]); }
  out.push(mueble);
  // el cajón: 0,4 mm de holgura por lado, tope trasero, tirador de media luna
  const wc = W - 2 * pared - 2 * hol, dc = D - pared - 1, hc = Hc - hol - 0.4;
  let cajon = caja(wc, dc, hc, 1.5).subtract(caja(wc - 2 * 1.6, dc - 2 * 1.6, hc, 1).translate([0, 0, 1.6]));
  cajon = cajon.add(caja(wc + 2 * pared - 0.6, 2.4, hc + 0.8, 1.5).translate([0, -dc / 2 - 1.2, 0])); // el frente tapa la abertura
  cajon = cajon.subtract(M().cylinder(5, Math.min(18, wc * 0.18), Math.min(18, wc * 0.18), 48).scale([1, 0.55, 1]).translate([0, -dc / 2 - 2.4, hc - 6])); // agarradero
  for (let i = 0; i < nC; i++) out.push(cajon.translate([0, 0, 0]).translate([(i + 1) * (W + 8), 0, 0]));
  return N.union(out);
}
// ======================= 🪴 MACETA CON AGUJEROS Y PLATO =======================
function macetaPlato(p) {
  const R = p.d / 2, H = p.alto, w = p.pared, rb = R * 0.78, piso = 2.4;
  let perfil = [[0, 0], [rb, 0], [R, H], [R - w, H], [rb - w * 0.9, piso], [0, piso]];
  let m = CS().ofPolygons([N.ccw(perfil)]).revolve(seg(p.d) * 2);
  if (p.estilo === 'costillas') { const n0 = Math.round(p.d / 6); const L = []; for (let i = 0; i < n0; i++) { const a = i * 2 * Math.PI / n0; L.push(M().hull([M().sphere(1.4, 12).translate([(rb + 0.6) * Math.cos(a), (rb + 0.6) * Math.sin(a), 6]), M().sphere(1.4, 12).translate([(R + 0.6) * Math.cos(a), (R + 0.6) * Math.sin(a), H - 6])])); } m = m.subtract(N.union(L)); }
  if (p.estilo === 'facetada') { const k = 8, pol = r => N.cs([N.poligono2(k, 2 * r / Math.cos(Math.PI / k), 0)], 'Positive'); m = M().hull([pol(rb).extrude(0.01), pol(R).extrude(0.01).translate([0, 0, H - 0.01])]).subtract(M().hull([pol(rb - w).extrude(0.01).translate([0, 0, piso]), pol(R - w).extrude(0.01).translate([0, 0, H + 0.5])])); }
  if (p.estilo === 'ondas') { m = N.deformar ? N.deformar(m, [{ t: 'ondas', n: 12, amp: 2, giro: 60 }]) : m; }
  // agujeros de drenaje y patitas (el agua sale y no se queda encharcada)
  const ag = []; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ag.push(cil(6, piso + 2, -1).translate([rb * 0.45 * Math.cos(a), rb * 0.45 * Math.sin(a), 0])); } ag.push(cil(7, piso + 2, -1));
  m = m.subtract(N.union(ag));
  // canales por debajo (el agua sale de los agujeros hacia fuera aunque la maceta esté en el plato): sin patitas, así el fondo se
  // imprime apoyado en la cama (con patitas quedaba todo el fondo en el aire: lo vio la auditoría)
  const can = []; for (let i = 0; i < 4; i++) can.push(caja(4, rb * 2 + 4, 1.4, 0.8).translate([0, 0, -0.01]).rotate([0, 0, 45 + i * 90])); m = m.subtract(N.union(can));
  if (p.plato) { const Rp = rb + 12, plato = CS().ofPolygons([N.ccw([[0, 0], [Rp, 0], [Rp + 3, 14], [Rp + 1, 14], [Rp - 2, 2], [0, 2]])]).revolve(seg(2 * Rp) * 2); m = m.add(plato.translate([R + Rp + 10, 0, 0])); }
  return m;
}

export const DISENOS_CASA = {
  casaMunecas: { cat: 'miniaturas', tambien: ['ninos'], e: '🏠', t: 'Muebles de casa de muñecas (13 muebles, 3 escalas)', d: 'Silla, mesa, camas, sofá, armario, cocina, nevera, bañera, inodoro, lámpara, estantería y escalera · 1:12, 1:6 (Barbie) o 1:24', uso: 'deco', color: '#c9a27e', nuevo: true,
    campos: [s('mueble', 'Mueble', 'sofa', Object.entries(MUEBLES).map(([k, v]) => [k, v[0]])), s('escala', 'Escala', '12', ESCALAS)],
    gen: p => casaMunecas(p), nota: p => 'Medidas reales pasadas a escala ' + '1:' + p.escala + ' (un sofá de 2 m sale de ' + n2(200 / Number(p.escala) * 10 / 10) + ' cm). Para repuestos: mide la casa y elige la escala. Sin soportes (la mesa sale boca abajo). En PLA madera o pintado.' },
  hormiguero: { cat: 'mascotas', tambien: ['ciencia', 'ninos'], busca: 'colonia hormigas formicario ant', e: '🐜', t: 'Hormiguero (nido + zona de forrajeo)', d: 'Cámaras y túneles al azar, cristal de metacrilato con tornillos M3, tubos de 6 o 10 mm y depósito de agua', uso: 'funcional', color: '#d9c7a7', nuevo: true,
    campos: [n('ancho', 'Ancho del nido', 150, 90, 240, 1), n('alto', 'Alto del nido', 100, 70, 200, 1), n('camara', 'Alto de las cámaras (según la hormiga)', 4, 2, 10, 0.5), n('tunel', 'Ancho de los túneles', 5, 3, 12, 0.5), n('camaras', 'Cámaras', 6, 3, 12, 1, ''), n('tamCamara', 'Tamaño de las cámaras', 100, 60, 160, 5, '%'), n('semilla', 'Nido nº (cambia y sale otro)', 5, 1, 9999, 1, ''), n('tubo', 'Tubo (diámetro de fuera)', 10, 4, 16, 0.5), n('metacrilato', 'Grosor del metacrilato', 2, 1, 4, 0.5), n('tornillos', 'Tornillos M3', 6, 4, 6, 2, ''), c('agua', 'Depósito para tubo de ensayo de 16 mm', true), c('forrajeo', 'Con zona de forrajeo (caja antifugas y tapa con rejilla)', true)],
    gen: p => hormiguero(p), nota: p => 'Nido de ' + p.ancho + ' × ' + p.alto + ' mm con cámaras de ' + p.camara + ' mm de alto (3–4 mm para hormigas pequeñas como Lasius; 6–8 para Messor o Camponotus). Corta un metacrilato de ' + n2(p.ancho - 12) + ' × ' + n2(p.alto - 12) + ' mm y ' + p.metacrilato + ' mm, y atorníllalo con M3. Imprime en PETG (aguanta la humedad), sin soportes; el borde de la zona de forrajeo se inclina hacia dentro para que no se escapen.' },
  cajoneraDoble: { cat: 'organizar', tambien: ['jovenes', 'adultos'], e: '🗄️', t: 'Cajonera de dos cajones (apilable)', d: 'Mueble y cajones que corren suaves (0,4 mm por lado), con tope y agarradero', uso: 'funcional', color: '#f2efe6', nuevo: true,
    campos: [n('ancho', 'Ancho', 150, 80, 240, 1), n('fondo', 'Fondo', 120, 60, 200, 1), n('altoCajon', 'Alto de cada cajón', 40, 20, 90, 1), n('cajones', 'Cajones', 2, 1, 4, 1, ''), c('apilable', 'Apilable (con pivotes y huecos para ponerla encima de otra)', true)],
    gen: p => cajonera(p), nota: p => 'El mueble (sale TUMBADO, con las aberturas hacia arriba: así no hay puentes) y ' + Math.round(p.cajones) + ' cajones aparte. Holgura de 0,4 mm por lado: corren suaves sin bailar. Sin soportes. PLA o PETG.' },
  macetaPlato: { cat: 'macetas', e: '🪴', t: 'Maceta para plantar (con drenaje y plato)', d: 'Agujeros de drenaje, patitas y plato aparte · lisa, con costillas o facetada', uso: 'funcional', color: '#c96f4a', nuevo: true,
    campos: [s('estilo', 'Estilo', 'costillas', [['lisa', 'Lisa'], ['costillas', 'Con costillas'], ['facetada', 'Facetada (8 caras)']]), n('d', 'Diámetro de arriba', 120, 60, 220, 1), n('alto', 'Alto', 110, 50, 220, 1), n('pared', 'Pared', 2.4, 1.6, 4, 0.2), c('plato', 'Con plato', true)],
    gen: p => macetaPlato(p), nota: () => 'De verdad para plantar: 5 agujeros de drenaje y canales por debajo para que el agua salga al plato (aparte). Sin soportes. En PETG (el PLA al sol y con agua se ablanda), 3 paredes.' }
};
