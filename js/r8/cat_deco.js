// ================= v30.3 · 🍷 DECORACIÓN PREMIUM (lo de las fotos de la dueña, hecho nuestro) =================
// «figuras de decoración… un gato cazando una mariposa en forma de cuadro o que sobresale… en vez de Nike una frase o palabra»
// (11-10-2026, con fotos de referencia). Todo diseñado aquí: siluetas de pared y de pie, figuras abstractas, cisnes, cesta con lazo,
// maceta balón con TU frase, Navidad (copos y estrella), lámpara luna, posavasos de vinilo y organizador de maquillaje.
import * as N from './nucleo.js';
import * as S from './sdf.js';
import { circulo, rectR } from './motor.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const circ = d => N.cs([N.ccw(circulo(d / 2, 0, 0, seg(d)))], 'Positive');
const rr = (w, h, r = 0) => N.cs([N.ccw(rectR(w, h, r))], 'Positive');
const cil = (d, h, z = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([0, 0, z]);
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const FUENTES_OPS = [['gorda', 'Gorda'], ['redonda', 'Redonda'], ['cursiva', 'Cursiva'], ['clasica', 'Clásica'], ['estrecha', 'Estrecha']];
const { esfera, elipsoide, capsula, toro, union, unionS, resta, restaS, mueve, gira, espejoX, suelo, tubo, bezier } = S;
const { circulo2, elipse2, trazo2, linea2, bezier2, triangulo2, caja2, mueve2, unionS: uS } = S;
// semilla repetible (el mismo número da siempre el mismo dibujo)
const azar = sem => { let x = (Math.abs(Math.round(sem)) || 1) * 2654435761 % 4294967296; return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; };

// ======================= 🧘 FIGURAS ABSTRACTAS («no veo, no oigo, no hablo», el pensador) =======================
function pensador(u, pose) {
  const cabeza = elipsoide([0, 0, 88 * u], [10.5 * u, 9.5 * u, 12.5 * u]), cuello = capsula([0, 0, 72 * u], [0, 0, 80 * u], 3.6 * u);
  const torso = elipsoide([0, 0, 58 * u], [18 * u, 12.5 * u, 16 * u]), cadera = elipsoide([0, 1 * u, 37 * u], [13 * u, 10 * u, 9 * u]);
  const rodI = [-26 * u, -8 * u, 26 * u], rodD = [26 * u, -8 * u, 26 * u], pieI = [14 * u, -24 * u, 7 * u], pieD = [-14 * u, -22 * u, 10 * u];
  const piernas = union(capsula([-6 * u, 0, 33 * u], rodI, 8 * u, 6.5 * u), capsula([6 * u, 0, 33 * u], rodD, 8 * u, 6.5 * u), capsula(rodI, pieI, 6.2 * u, 4.6 * u), capsula(rodD, pieD, 6.2 * u, 4.6 * u), elipsoide(pieI, [7.5 * u, 4.6 * u, 4.6 * u]), elipsoide(pieD, [7.5 * u, 4.6 * u, 4.6 * u]));
  const P = { // [codo, mano] de cada lado (I = izquierda de la figura, x < 0)
    ojos: [[[-22, -12, 42], [-5, -10.5, 90]], [[22, -12, 42], [5, -10.5, 90]]],
    boca: [[[-21, -14, 42], [-3, -11, 80]], [[21, -14, 42], [3, -11.5, 81]]],
    oidos: [[[-26, -6, 48], [-11.5, 0, 88]], [[26, -6, 48], [11.5, 0, 88]]],
    pensador: [[[-24, -6, 40], [-22, -15, 30]], [[18, -12, 38], [3, -11, 76]]]
  }[pose] || [];
  const brazos = P.map(([cd, mn], i) => { const h = [(i ? 15 : -15) * u, 0, 66 * u], C = cd.map(v => v * u), Mn = mn.map(v => v * u); return union(tubo([h, C, Mn], [6.6 * u, 5.8 * u, 5 * u], 0), elipsoide(Mn, [5.6 * u, 4 * u, 7 * u])); });
  return suelo(mueve(unionS(3 * u, cabeza, cuello, torso, cadera, piernas, ...brazos), [0, 0, -4 * u]), 0);
}
// ======================= 🦢 PAREJA DE CISNES (los cuellos forman un corazón) =======================
function cisne(u) { // mira hacia +X; el otro es su espejo
  const cuerpo = elipsoide([-28 * u, 0, 15 * u], [24 * u, 13 * u, 11 * u]);
  const cuello = tubo(bezier([-8 * u, 0, 18 * u], [-30 * u, 0, 42 * u], [-30 * u, 0, 78 * u], [-12 * u, 0, 72 * u], 14), Array.from({ length: 15 }, (_, i) => (5.2 - i * 0.16) * u), 1.5 * u);
  const cabeza = elipsoide([-9 * u, 0, 68 * u], [6 * u, 4.6 * u, 5 * u]), pico = capsula([-6 * u, 0, 66 * u], [-1.2 * u, 0, 61 * u], 2.8 * u, 0.9 * u);
  const cola = capsula([-48 * u, 0, 15 * u], [-57 * u, 0, 27 * u], 6 * u, 1.5 * u);
  const alas = S.espejoX ? p => Math.max(...[1, -1].map(sg => gira(elipsoide([0, 0, 0], [19 * u, 3.5 * u, 9 * u]), 0, -22, sg * 12)([p[0] + 34 * u, p[1] - sg * 9 * u, p[2] - 25 * u]))) : null;
  return unionS(3 * u, cuerpo, cuello, cabeza, pico, cola, alas);
}
// ======================= ⚽ MACETA BALÓN CON TU FRASE (en vez de una marca) =======================
function macetaBalon(p) {
  const R = p.d / 2, w = Math.max(1.6, p.pared), zc = R * 0.88; // centro de la bola sobre la cama (corta un poco abajo: base plana)
  let m = M().sphere(R, seg(2 * R) * 2).subtract(M().sphere(R - w, seg(2 * R) * 2)).translate([0, 0, zc]);
  m = m.trimByPlane([0, 0, 1], 0).trimByPlane([0, 0, -1], -(zc + R * p.boca / 100));
  const rFondo = Math.sqrt(Math.max(1, R * R - zc * zc)); m = m.add(cil(2 * rFondo + 2 * w, w + 0.4).intersect(M().sphere(R - 0.01, seg(2 * R) * 2).translate([0, 0, zc])));
  if (p.drenaje) m = m.subtract(cil(8, 10, -2));
  // costuras (surcos de 2 mm)
  const surco = (Rr, ax, off = 0) => { let t = CS().ofPolygons([N.ccw(circulo(1.1, 0, 0, 16).map(([x, y]) => [x + Rr, y]))]).revolve(seg(2 * R) * 2); if (ax === 'x') t = t.rotate([0, 90, 0]); if (ax === 'y') t = t.rotate([90, 0, 0]); return t.translate([ax === 'x' ? off : 0, 0, zc + (ax === 'z' ? off : 0)]); };
  const L = [];
  if (p.bola === 'baloncesto') { L.push(surco(R, 'z'), surco(R, 'x'), surco(R, 'y')); const a = 48 * Math.PI / 180; L.push(surco(R * Math.cos(a), 'x', R * Math.sin(a)), surco(R * Math.cos(a), 'x', -R * Math.sin(a))); }
  if (p.bola === 'tenis') { const P = []; for (let i = 0; i <= 96; i++) { const t = i / 96 * 2 * Math.PI, v = [0.76 * Math.cos(t) + 0.24 * Math.cos(3 * t), 0.76 * Math.sin(t) - 0.24 * Math.sin(3 * t), 0.66 * Math.sin(2 * t)], l = Math.hypot(...v); P.push(v.map(x => x / l * R)); } for (let i = 0; i < 96; i++) L.push(M().hull([M().sphere(1.1, 12).translate(P[i]), M().sphere(1.1, 12).translate(P[i + 1])]).translate([0, 0, zc])); }
  if (p.bola === 'beisbol') { const P = []; for (let i = 0; i <= 96; i++) { const t = i / 96 * 2 * Math.PI, v = [0.76 * Math.cos(t) + 0.24 * Math.cos(3 * t), 0.76 * Math.sin(t) - 0.24 * Math.sin(3 * t), 0.66 * Math.sin(2 * t)], l = Math.hypot(...v); P.push(v.map(x => x / l * R)); } for (let i = 0; i < 96; i += 2) { const q = P[i], d = P[i + 1].map((v, k) => v - q[k]); L.push(M().sphere(1.4, 10).scale([1.6, 1.6, 0.6]).translate(q).translate([0, 0, zc])); void d; } }
  if (L.length) m = p.bola === 'beisbol' ? m.add(N.union(L).intersect(M().sphere(R + 0.8, 64).translate([0, 0, zc]))) : m.subtract(N.union(L));
  // la frase: en relieve que sigue la bola (o grabada)
  const frase = String(p.frase || '').trim();
  if (frase) {
    let t = N.centraCS(N.texto2(frase, p.fuente, Math.max(4, R * p.letra / 100))); const b = N.cajaCS(t), maxAncho = R * 1.25; if (b.w > maxAncho) t = t.scale([maxAncho / b.w, maxAncho / b.w]);
    const tz = zc + R * p.alturaTexto / 100, T3 = t.extrude(R * 1.3).rotate([90, 0, 0]).translate([0, 0, tz]);
    m = p.grabado ? m.subtract(T3.intersect(M().sphere(R + 1, seg(2 * R) * 2).subtract(M().sphere(R - Math.min(1, w - 0.8), seg(2 * R) * 2)).translate([0, 0, zc])))
      : m.add(T3.intersect(M().sphere(R + p.relieve, seg(2 * R) * 2).subtract(M().sphere(R - 0.4, seg(2 * R) * 2)).translate([0, 0, zc])));
  }
  return m;
}
// ======================= ❄️ NAVIDAD: copos y estrella =======================
function copo(p) {
  const s = p.d / 100, R = azar(p.semilla), F = [], ramas = [];
  const brazo = []; brazo.push(trazo2([0, 0], [0, 46 * s], 3.2 * s, 2.2 * s));
  for (let k = 1; k <= 3; k++) { const y = (10 + k * 10 + R() * 4) * s, l = (16 - k * 3.5 + R() * 5) * s, a = (40 + R() * 20) * Math.PI / 180; ramas.push([y, l, a]); }
  ramas.forEach(([y, l, a]) => { brazo.push(trazo2([0, y], [l * Math.sin(a), y + l * Math.cos(a)], 2 * s, 1.4 * s), trazo2([0, y], [-l * Math.sin(a), y + l * Math.cos(a)], 2 * s, 1.4 * s)); });
  if (R() < 0.6) brazo.push(circulo2([0, 30 * s], 3.4 * s));
  const B = union(...brazo);
  for (let i = 0; i < 6; i++) F.push(S.gira2(B, i * 60));
  F.push(circulo2([0, 0], 9 * s)); let f = union(...F); f = resta(f, S.gira2(triangulo2([0, -5 * s], [4.3 * s, 2.5 * s], [-4.3 * s, 2.5 * s]), 0));
  if (p.colgar) f = union(resta(union(f, circulo2([0, 49 * s], 4.2 * s)), circulo2([0, 49.5 * s], 2.2 * s)));
  return S.silueta(f, -52 * s, -52 * s, 52 * s, 55 * s, Math.max(0.25, p.d / 320)).extrude(p.grosor);
}
function estrellaArbol(p) {
  const R1 = p.d / 2, P = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R1 * 0.45 : R1; P.push([r * Math.cos(a), r * Math.sin(a)]); }
  const st = N.cs([N.ccw(P)], 'Positive'), mitad = st.extrude(p.grosor / 2, 1, 0, [0, 0]);
  let m = mitad.add(mitad.mirror([0, 0, 1])).rotate([90, 0, 0]).translate([0, 0, p.manguito + R1 * 0.45 + 1]);
  const funda = M().cylinder(p.manguito + 4, p.tronco / 2 + 2, p.tronco / 2 + 4, 48).subtract(M().cylinder(p.manguito + 6, p.tronco / 2 + 0.3, p.tronco / 2 + 0.8, 48).translate([0, 0, -1]));
  return m.add(funda);
}
// ======================= 🌕 LÁMPARA LUNA · 🎵 POSAVASOS DE VINILO · 💄 ORGANIZADOR DE MAQUILLAJE =======================
function lamparaLuna(p) {
  const R = p.d / 2, w = p.pared, Rn = azar(p.semilla);
  let m = M().sphere(R, seg(2 * R) * 2).subtract(M().sphere(R - w, seg(2 * R) * 2));
  const crat = []; for (let i = 0; i < p.crateres; i++) { const z = Rn() * 2 - 1, a = Rn() * 2 * Math.PI, rxy = Math.sqrt(1 - z * z), dir = [rxy * Math.cos(a), rxy * Math.sin(a), z], rc = R * (0.05 + Rn() * 0.13); if (z < -0.6) continue; const hondo = Math.min(rc * 0.35, w * 0.55); crat.push(M().sphere(rc, 24).translate(dir.map(v => v * (R + rc - hondo)))); }
  if (crat.length) m = m.subtract(N.union(crat));
  const zc = R * 0.82; m = m.translate([0, 0, zc]).trimByPlane([0, 0, 1], 0);
  const rB = Math.sqrt(R * R - zc * zc), base = cil(2 * rB + 6, 4).subtract(cil(p.luz + 0.6, 10, -1));
  return m.add(base).subtract(cil(p.luz + 0.6, zc - R * 0.5, -0.5));
}
function posavasos(p) {
  const D = p.d, L = []; const uno = () => { let m = cil(D, p.grosor); for (let r = D * 0.3; r < D / 2 - 2; r += 1.4) m = m.subtract(N.cs([N.ccw(circulo(r + 0.35, 0, 0, seg(2 * r))), circulo(r, 0, 0, seg(2 * r))], 'EvenOdd').extrude(0.6).translate([0, 0, p.grosor - 0.6])); m = m.subtract(cil(D * 0.34, 0.4, p.grosor - 0.3)); const t = String(p.texto || '').trim(); if (t) { let T = N.centraCS(N.texto2(t, 'redonda', D * 0.07)); const b = N.cajaCS(T); if (b.w > D * 0.3) T = T.scale([D * 0.3 / b.w, D * 0.3 / b.w]); m = m.add(T.extrude(0.9).translate([0, D * 0.06, p.grosor - 0.4])); } return m.subtract(cil(4, 3, p.grosor - 2)); };
  for (let i = 0; i < Math.round(p.n); i++) L.push(uno().translate([(i % 3) * (D + 6), Math.floor(i / 3) * (D + 6), 0]));
  if (p.caja) { const hb = Math.round(p.n) * (p.grosor + 0.3) + 4, w = D + 3, caja = rr(hb + 4, w * 0.62, 3).extrude(w * 0.55).subtract(rr(hb, w * 0.62 + 2, 1).extrude(w).translate([0, 0, 3])); L.push(caja.add(cil(w * 0.3, 2).translate([0, 0, 0])).translate([-(D + 6) - hb / 2, 0, 0])); }
  return N.union(L);
}
function maquillaje(p) {
  const W = p.ancho, D = p.fondo, H = p.alto, w = 2;
  let m = rr(W, D, 6).extrude(H);
  // tres escalones: delante pintalabios, en medio paletas, detrás brochas
  m = m.subtract(rr(W - 2 * w, D * 0.36, 3).extrude(H).translate([0, -D / 2 + w + D * 0.18, H * 0.38])).subtract(rr(W - 2 * w, D * 0.3, 3).extrude(H).translate([0, -D / 2 + w + D * 0.36 + D * 0.15, H * 0.7]));
  const nC = Math.max(2, Math.floor((W - 2 * w) / 24)); for (let i = 0; i < nC; i++) m = m.subtract(cil(p.labial + 0.6, H, H * 0.38 - 30).translate([-(nC - 1) * 12 + i * 24, -D / 2 + w + D * 0.18, 0]));
  const nP = Math.max(1, Math.floor((W - 2 * w) / 34)); for (let i = 0; i < nP; i++) m = m.subtract(rr(30, D * 0.26, 2).extrude(H).translate([-(nP - 1) * 17 + i * 34, -D / 2 + w + D * 0.51, H * 0.7 - 24]));
  const nB = Math.max(1, Math.floor((W - 2 * w) / 28)); for (let i = 0; i < nB; i++) m = m.subtract(cil(24, H, 6).translate([-(nB - 1) * 14 + i * 28, D / 2 - w - 13, 0]));
  return m;
}

export const DISENOS_DECO = {
  pensadores: { cat: 'adultos', e: '🧘', t: 'Figuras abstractas (no veo · no oigo · no hablo)', d: 'Estilo nórdico, lisas: una, o las tres juntas, o el pensador', uso: 'deco', color: '#efe8dc', soportes: true, nuevo: true,
    campos: [s('pose', 'Cuál', 'tres', [['tres', 'Las tres (no veo, no hablo, no oigo)'], ['ojos', 'No veo (manos en los ojos)'], ['boca', 'No hablo (manos en la boca)'], ['oidos', 'No oigo (manos en las orejas)'], ['pensador', 'El pensador']]), n('h', 'Alto', 140, 60, 250, 1)],
    gen(p) { const u = p.h / 100, una = k => S.malla(pensador(u, k), { min: [-36 * u, -34 * u, -0.5], max: [36 * u, 20 * u, 102 * u] }, Math.max(0.6, p.h / 160)); if (p.pose !== 'tres') return una(p.pose); return N.union(['ojos', 'boca', 'oidos'].map((k, i) => una(k).translate([(i - 1) * 76 * u, 0, 0]))); },
    nota: p => 'Figuras de ' + Math.round(p.h) + ' mm, lisas. En PLA mate blanco o arena quedan como las de piedra. Llevan soportes de árbol bajo las rodillas y los brazos (el asistente los pone). Diseño propio de CelebriDiseños.' },
  parejaCisnes: { cat: 'adultos', tambien: ['regalos'], e: '🦢', t: 'Pareja de cisnes (corazón)', d: 'Los cuellos forman un corazón: bodas, aniversarios, San Valentín', uso: 'deco', color: '#ffffff', soportes: true, nuevo: true,
    campos: [n('h', 'Alto', 120, 60, 240, 1), c('peana', 'Con peana redonda', true)],
    gen(p) { const u = p.h / 80, c1 = cisne(u), f = union(c1, q => c1([-q[0], q[1], q[2]])); let m = S.malla(suelo(mueve(f, [0, 0, -4 * u]), 0), { min: [-62 * u, -24 * u, -0.5], max: [62 * u, 24 * u, 82 * u] }, Math.max(0.6, p.h / 170)); if (p.peana) { const b = N.caja(m); m = m.translate([0, 0, 3.4]).add(M().cylinder(4, (b.max[0] - b.min[0]) / 2 + 6, (b.max[0] - b.min[0]) / 2 + 4, 96)); } return m; },
    nota: () => 'Dos cisnes que se miran: sus cuellos dibujan un corazón. En PLA seda blanco o perla. Lleva soportes de árbol bajo los cuellos. Diseño propio.' },
  macetaBalon: { cat: 'jovenes', tambien: ['macetas', 'adultos'], e: '🏀', t: 'Maceta balón con tu frase', d: 'Baloncesto, tenis, béisbol o lisa, con la palabra o frase que quieras (sin marcas)', uso: 'deco', color: '#e8762b', nuevo: true,
    campos: [s('bola', 'Balón', 'baloncesto', [['baloncesto', 'Baloncesto'], ['tenis', 'Tenis'], ['beisbol', 'Béisbol'], ['lisa', 'Lisa']]), tx('frase', 'Tu frase o palabra', 'DREAM BIG', 'Lo que quieras: un nombre, «Home», «Never give up»… (nada de marcas)'), s('fuente', 'Letra', 'gorda', FUENTES_OPS), n('d', 'Diámetro', 120, 60, 240, 1), n('pared', 'Pared', 2.4, 1.6, 5, 0.2), n('boca', 'Dónde se corta arriba (% del radio)', 45, 0, 80, 1, '%'), n('letra', 'Tamaño de la frase', 26, 10, 50, 1, '%'), n('alturaTexto', 'Altura de la frase', 0, -40, 40, 1, '%'), n('relieve', 'Relieve', 1.2, 0.4, 3, 0.1), c('grabado', 'Frase grabada (hundida) en vez de en relieve', false), c('drenaje', 'Agujero de drenaje', true)],
    gen: p => macetaBalon(p), dosColores: p => null,
    nota: p => 'Maceta de Ø' + p.d + ' mm con la frase «' + String(p.frase || '') + '». Para la frase de otro color: 🌈 Colores por capas no sirve aquí (va de lado); píntala o usa el AMS. Las marcas (Nike…) no se pueden vender: pon TU frase. Diseño propio.' },
  copoNieve: { cat: 'navidad', tambien: ['ninos'], e: '❄️', t: 'Copo de nieve', d: 'Cada número, un copo distinto · para el árbol o la ventana', uso: 'deco', color: '#dff3ff', nuevo: true,
    campos: [n('d', 'Tamaño', 80, 30, 200, 1), n('semilla', 'Copo nº (cambia y sale otro)', 12, 1, 999, 1, ''), n('grosor', 'Grosor', 2.4, 1.2, 5, 0.2), c('colgar', 'Con agujero para colgar', true)],
    gen: p => copo(p), nota: () => 'Plano, sin soportes. En PLA seda blanco, plata o con purpurina. Imprime varios números: todos distintos.' },
  estrellaArbol: { cat: 'navidad', e: '⭐', t: 'Estrella para la punta del árbol', d: 'Estrella con volumen y funda que entra en la punta', uso: 'deco', color: '#ffcc33', soportes: true, nuevo: true,
    campos: [n('d', 'Tamaño de la estrella', 130, 60, 220, 1), n('grosor', 'Grueso', 24, 10, 50, 1), n('tronco', 'Grosor de la punta del árbol', 18, 8, 40, 0.5), n('manguito', 'Largo de la funda', 50, 20, 100, 1)],
    gen: p => estrellaArbol(p), nota: () => 'En PLA seda oro. La funda se mete en la punta del árbol (mide su grosor). Lleva soportes de árbol bajo las puntas.' },
  lamparaLuna: { cat: 'jovenes', tambien: ['lamparas', 'ninos'], e: '🌕', t: 'Lámpara luna', d: 'Con cráteres: se ilumina por dentro con una luz LED redonda', uso: 'deco', color: '#f2efe6', nuevo: true,
    campos: [n('d', 'Diámetro', 120, 60, 220, 1), n('pared', 'Pared (fina = deja pasar luz)', 1.2, 0.8, 3, 0.1), n('crateres', 'Cráteres', 45, 0, 120, 1, ''), n('semilla', 'Luna nº', 3, 1, 999, 1, ''), n('luz', 'Hueco para la luz (diámetro)', 40, 20, 80, 1)],
    gen: p => lamparaLuna(p), nota: () => 'Imprímela en PLA blanco con 1 pared y sin relleno: con una luz LED de pilas dentro brilla y se ven los cráteres. Base con hueco para la luz.' },
  posavasosVinilo: { cat: 'jovenes', tambien: ['hogar', 'regalos'], e: '🎵', t: 'Posavasos de vinilo (+ caja)', d: 'Como discos, con tu texto en la etiqueta', uso: 'deco', color: '#1b1b1f', nuevo: true,
    campos: [n('n', 'Cuántos', 4, 1, 9, 1, ''), n('d', 'Diámetro', 100, 70, 130, 1), n('grosor', 'Grosor', 3.2, 2, 5, 0.2), tx('texto', 'Texto de la etiqueta', 'CelebriDiseños'), c('caja', 'Con la caja para guardarlos', true)],
    gen: p => posavasos(p), dosColores: p => ({ z: p.grosor, color: '#e63946' }), nota: p => 'Discos de ' + p.d + ' mm con surcos y tu texto en la etiqueta. 🌈 Dos colores: el disco negro y las letras en rojo (cambio de color a ' + n2(p.grosor) + ' mm).' },
  organizadorMaquillaje: { cat: 'adultos', tambien: ['jovenes', 'organizar'], e: '💄', t: 'Organizador de maquillaje en gradas', d: 'Pintalabios delante, paletas en medio y brochas detrás', uso: 'funcional', color: '#f7d6e0', nuevo: true,
    campos: [n('ancho', 'Ancho', 200, 120, 256, 1), n('fondo', 'Fondo', 140, 90, 200, 1), n('alto', 'Alto', 90, 60, 150, 1), n('labial', 'Diámetro de los pintalabios', 22, 14, 30, 0.5)],
    gen: p => maquillaje(p), nota: () => 'Tres gradas: agujeros para pintalabios delante, ranuras para paletas en medio y vasos para brochas detrás. PLA o PETG, sin soportes.' }
};
