// ================= 14-10-2026 · ⚙️ ENGRANAJES PARA VENDER (que funcionan de verdad) =================
// La dueña (14-10-2026): «más engranajes de verdad que pueda vender en Cults3D, pero que compren, que sirva; también cosas que se te
// ocurran, ten iniciativa y vete creando cosas para vender».
// Diseños PROPIOS, con dientes de EVOLVENTE exactos (engranajes.js) y COMPROBADOS en el ordenador antes de dártelos: cada pareja se
// casa girándola hasta que el diente cae en el centro del hueco, se mide que NO se pisan y se GIRA un trozo para ver que no se traba.
//   · 🌀 Rodamiento planetario en espiga: sale de la impresora YA MONTADO y gira (el fidget de engranajes más vendido).
//   · 💞 Corazón de engranajes con vuestros nombres (regalo): dos engranajes que giran a la vez, cada uno con un nombre.
//   · ⚙️ Engranajes de mesa (juguete de escritorio): tres engranajes helicoidales con manivela, sobre su peana.
//   · 🔑 Llavero de engranajes: dos engranajes pequeños que giran, con tu nombre.
//   · 🌸 Espirógrafo: aro con dientes por dentro y por fuera + ruedas con agujeros para el boli (dibujos de espirales).
// Holguras de la casa: lo que sale montado de la impresora lleva 0,4 mm de aire; lo que se encaja después, «gira» (0,15 por lado).
import * as N from './nucleo.js';
import * as G from './engranajes.js';
import { circulo, rectR, ENCAJES } from './motor.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const M = () => N.MF();
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const circ = (d, x = 0, y = 0) => N.cs([N.ccw(circulo(d / 2, x, y, seg(d)))], 'Positive');
const rr = (w, h, r = 0, x = 0, y = 0) => N.cs([N.ccw(rectR(w, h, r, x, y))], 'Positive');
const cil = (d, h, z = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([0, 0, z]);
const GI = ENCAJES.gira, EN_SITIO = 0.4;
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const vol = (a, b) => { try { const v = a.intersect(b).volume(); return v > 0 ? v : 0; } catch (e) { return 0; } };
const enFila = (L, sep = 6, ancho = 170) => { let x = 0, y = 0, alto = 0; return L.map(m => { const b = N.caja(m); if (x > 0 && x + b.dims[0] > ancho) { x = 0; y += alto + sep; alto = 0; } const o = m.translate([x - b.min[0], y - b.min[1], -b.min[2]]); x += b.dims[0] + sep; alto = Math.max(alto, b.dims[1]); return o; }); };
// (las letras se dibujan con el lienzo del navegador: fuera de él —las pruebas con node— no hay letras y la pieza sale sin ellas)
const texto = (t, alto, h) => { if (typeof document === 'undefined') return null; return N.centraCS(N.texto2(String(t || ' '), 'gorda', alto)).extrude(h); };
// CASAR dos engranajes: el móvil se gira dentro de un paso; de los giros en los que NO se pisan se busca el tramo entero (sus dos bordes,
// afinados) y se queda en su MITAD: el diente en el centro del hueco, con el mismo aire a los dos lados. (Quedarse con el primer giro
// sin choque lo dejaba pegado a un flanco: lo impreso «montado» salía soldado.) Si no hay giro sin choque, el de menos choque.
// (medida = vol para piezas 3D; area para CORTES planos, cien veces más rápido: lo que se usa al generar; en 3D se comprueba en las pruebas)
const area = (a, b) => { try { const v = a.intersect(b).area(); return v > 0 ? v : 0; } catch (e) { return 0; } };
export function fase(movil, fijo, paso, medida = vol) {
  const vol = medida; // (dentro de esta función, «vol» es la medida elegida)
  const n0 = 48, ang = j => j / n0 * paso, V = []; for (let j = 0; j < n0; j++) V.push(vol(movil(ang(j)), fijo));
  const libre = v => v < 1e-4, cero = V.map(libre);
  if (!cero.some(Boolean)) { let mejor = 0, v0 = Infinity; V.forEach((v, j) => { if (v < v0) { v0 = v; mejor = ang(j); } }); for (let d = paso / 96; d > paso / 3000; d /= 2) for (const g of [mejor - d, mejor + d]) { const v = vol(movil(g), fijo); if (v < v0) { v0 = v; mejor = g; } } return mejor; }
  if (cero.every(Boolean)) return 0;
  let tr = null; for (let s0 = 0; s0 < n0; s0++) { if (!cero[s0] || cero[(s0 - 1 + n0) % n0]) continue; let L = 0; while (L < n0 && cero[(s0 + L) % n0]) L++; if (!tr || L > tr.L) tr = { s: s0, L }; }
  const borde = (bien, malo) => { for (let k = 0; k < 9; k++) { const mid = (bien + malo) / 2; if (libre(vol(movil(mid), fijo))) bien = mid; else malo = mid; } return bien; };
  return (borde(ang(tr.s), ang(tr.s - 1)) + borde(ang(tr.s + tr.L - 1), ang(tr.s + tr.L))) / 2;
}
// recorta la punta de los dientes (más aire entre la punta y el fondo del otro: lo impreso «engorda» un poco)
const puntaFuera = (m, ra, z0, h) => m.intersect(cil(2 * ra, h + 2, z0 - 1));

// ======================= 🌀 RODAMIENTO PLANETARIO EN ESPIGA (sale montado) =======================
// Sol + planetas + corona con dientes en ESPIGA (doble hélice, en «V»): la «V» no deja que las piezas se salgan hacia arriba ni hacia
// abajo, así que se imprime de una vez y sale montado. Condiciones de montaje (calculadas): corona = sol + 2 × planeta, y (sol + corona)
// divisible entre el número de planetas (si no, los planetas no caben a la vez). Cada planeta se CASA con el sol y con la corona.
export function agujeroSol(p, K) { if (p.centro !== 'hex' && p.centro !== 'redondo') return 0; const rfS = K.mt * K.zs / 2 - 1.25 * K.m, max = Math.floor((2 * rfS - 3) * (p.centro === 'hex' ? Math.cos(Math.PI / 6) : 1) * 2) / 2; return max < 2 ? 0 : Math.min(p.ag, max); }
export function planetarioNumeros(p) { // si con ese diente no caben, prueba sola con dientes más pequeños (hasta módulo 1) y lo dice
  for (let m = p.m; m >= 0.999; m = Math.round((m - 0.25) * 100) / 100) { const K = planetarioCon(p, m); if (K) return Object.assign(K, { mCambiado: m !== p.m }); }
  N.mal('Con ' + Math.round(p.np) + ' planetas no cabe en Ø ' + n2(p.D) + ' mm: pon menos planetas o más diámetro.');
}
function planetarioCon(p, m) {
  const D = p.D, np = Math.round(p.np), beta = 25, mt = m / Math.cos(beta * Math.PI / 180), aro = Math.max(2.4, 2.2 * m);
  const zrMax = Math.floor(2 * (D / 2 - aro - 1.25 * m) / mt); let mejor = null;
  for (let zr = zrMax; zr >= zrMax - 8; zr--) for (let zp = Math.max(7, Math.round(zr * 0.22)); zp <= Math.round(zr * 0.36); zp++) { // (planetas de menos de 7 dientes salen socavados)
    const zs = zr - 2 * zp; if (zs < 10 || (zs + zr) % np) continue;
    const a = mt * (zs + zp) / 2, rap = mt * zp / 2 + m, sep = 2 * a * Math.sin(Math.PI / np) - 2 * rap; if (sep < 1.6) continue;
    const pena = (zrMax - zr) * 3 + Math.abs(zs / zr - 0.42) * 20 + (zp % 2 ? 0 : 0.5);
    if (!mejor || pena < mejor.pena) mejor = { zr, zp, zs, a, sep, pena };
  }
  if (!mejor) return null;
  return Object.assign(mejor, { m, mt, beta, aro, np, D: 2 * (mt * mejor.zr / 2 + 1.25 * m + aro) });
}
export function planetario(p) {
  const K = planetarioNumeros(p), h = p.h, jg = 0.3, base = { por: 'modulo', m: K.m, alfa: 20, beta: K.beta, tipo: 'espiga', b: h, juego: jg };
  const ra = z => K.mt * z / 2 + K.m - 0.15; // la punta, 0,15 más corta que la normal (más aire de punta a fondo)
  // el SOL (mano derecha) con su agujero (hexágono para una llave Allen o un lápiz, o redondo); los PLANETAS (izquierda); la CORONA (izquierda)
  let sol = puntaFuera(G.engranaje(Object.assign({ z: K.zs, mano: 'der' }, base)).m, ra(K.zs), 0, h);
  // el agujero del centro: si no cabe en el sol (con 1,5 mm de pared hasta el fondo de sus dientes), se hace el más grande que cabe y se dice
  const ag = agujeroSol(p, K), hueco = !ag ? null : p.centro === 'hex' ? N.cs([N.poligono2(6, ag / Math.cos(Math.PI / 6), 0)], 'Positive').extrude(h + 2).translate([0, 0, -1]) : cil(ag, h + 2, -1);
  if (hueco) sol = sol.subtract(hueco);
  const planeta0 = puntaFuera(G.engranaje(Object.assign({ z: K.zp, mano: 'izq' }, base)).m, ra(K.zp), 0, h);
  let corona = G.corona(Object.assign({ z: K.zr, mano: 'izq', aro: K.aro }, base)).m;
  const rTipC = K.mt * K.zr / 2 - K.m + 0.15; corona = corona.subtract(cil(2 * rTipC, h + 2, -1)); // la punta de la corona, también 0,15 más corta
  if (p.borde === 'moleteado') { const R = K.D / 2, nB = Math.round(Math.PI * K.D / 4), b = []; for (let i = 0; i < nB; i++) { const a = i / nB * 2 * Math.PI; b.push(cil(2.4, h, 0).translate([R * Math.cos(a), R * Math.sin(a), 0])); } corona = corona.add(N.union(b)); }
  // los planetas, cada uno CASADO con el sol (y la corona lo comprueba): girados hasta que no se pisan
  // se casa sobre el CORTE a media altura (en espiga, todos los cortes a la misma altura engranan igual): el primer planeta con el sol;
  // los demás salen de la cuenta (el planeta en el ángulo θ va girado g0 + θ·(1 + sol/planeta), como si el conjunto girase entero y el sol
  // volviese a su sitio); y la corona, con el primero. Que casan TODOS (y que giran) lo comprueba test/unit/engranajes_venta.mjs en 3D.
  const zc = h / 2, solS = sol.slice(zc), plS = planeta0.slice(zc), corS = corona.slice(zc);
  const g0 = fase(gg => plS.rotate(gg).translate([K.a, 0]), solS, 360 / K.zp, area);
  const planetas = []; for (let i = 0; i < K.np; i++) { const th = i / K.np * 360, c = [K.a * Math.cos(th * Math.PI / 180), K.a * Math.sin(th * Math.PI / 180)], g = g0 + th * (1 + K.zs / K.zp);
    planetas.push({ m: planeta0.rotate([0, 0, g]).translate([c[0], c[1], 0]), c, g }); }
  const gC = fase(gg => corS.rotate(gg), plS.rotate(g0).translate([K.a, 0]), 360 / K.zr, area); corona = corona.rotate([0, 0, gC]);
  return { K, sol, corona, planetas, planeta0 };
}
// GIRAR de verdad (montaje virtual): con la corona quieta, el sol gira «a» grados, el portaplanetas a · zs / (zs + zr) y cada planeta
// sobre sí mismo lo que manda la cuenta. Se mira que no se pisa nada en varios puntos de un diente.
export function planetarioGira(R, pasos = 4) {
  const { K } = R, out = []; for (let i = 1; i <= pasos; i++) {
    const a = i / pasos * 360 / K.zs, ac = a * K.zs / (K.zs + K.zr), aRel = -ac * K.zr / K.zp; // (el planeta gira aRel respecto al portaplanetas; el portaplanetas, ac)
    const sol = R.sol.rotate([0, 0, a]), P = R.planetas.map(q => q.m.translate([-q.c[0], -q.c[1], 0]).rotate([0, 0, aRel]).translate([q.c[0], q.c[1], 0]).rotate([0, 0, ac]));
    const vS = P.reduce((t, q) => t + vol(q, sol), 0), vC = P.reduce((t, q) => t + vol(q, R.corona), 0); out.push({ a: Math.round(a * 100) / 100, sol: vS, corona: vC });
  }
  return out;
}
function rodamientoPlanetario(p) { const R = planetario(p); return N.union([R.corona, R.sol].concat(R.planetas.map(q => q.m))); }

// ======================= 💞 PLACAS CON ENGRANAJES QUE GIRAN (corazón con nombres · de mesa · llavero) =======================
// Engranajes que se ENCAJAN en ejes impresos en la placa (clic): cada eje lleva una ranura y un reborde que sujeta el engranaje sin
// soltarse; debajo, una arandela de 0,6 mm para que no roce. Holgura «gira» (0,15 por lado) en el agujero y 0,3 de juego entre dientes.
// ejes: [{ x, y, z (dientes) }] · o = { m, b (grueso), tipo, beta, ejeD, base (grueso de la placa), forma (contorno de la placa: CrossSection) }
function placaConEngranajes(L, o) {
  const m = o.m, b = o.b, ejeD = o.ejeD, g = o.base, ar = 0.6, z0 = g + ar, hueco = ejeD + 2 * GI;
  const gp = (z, mano) => ({ por: 'modulo', m, z, alfa: 20, beta: o.beta || 0, mano, tipo: o.tipo || 'recto', b, juego: 0.3, eje: hueco, holgura: 0 });
  // los engranajes, cada uno girado hasta casar con el anterior (helicoidales: mano contraria al vecino)
  const piezas = []; let prev = null;
  L.forEach((e, i) => { const mano = i % 2 ? 'izq' : 'der', K = G.numeros(gp(e.z, mano)); let gm = puntaFuera(G.engranaje(gp(e.z, mano)).m, K.ra - 0.15, 0, b);
    if (e.extra) gm = e.extra(gm, K);
    const pon = gg => gm.rotate([0, 0, gg]).translate([e.x, e.y, z0]), gS = gm.slice(b / 2); // (se casa sobre el corte a media altura: rápido)
    const gg = prev ? fase(q => gS.rotate(q).translate([e.x, e.y]), prev, 360 / e.z, area) : 0, fin = pon(gg); piezas.push({ m: fin, suelto: gm.rotate([0, 0, gg]), K, e, gg }); prev = gS.rotate(gg).translate([e.x, e.y]); });
  // la placa con sus ejes de clic
  let placa = o.forma.extrude(g);
  L.forEach(e => {
    const alto = ar + b + 0.25 + 1.2; // arandela + engranaje + aire + reborde
    let eje = cil(10, ar + 0.01, g - 0.01).add(cil(ejeD, alto, g - 0.01)); // arandela y eje
    eje = eje.add(M().cylinder(1.2, ejeD / 2 + 0.45, ejeD / 2 - 0.2, seg(ejeD)).translate([0, 0, g + ar + b + 0.25])); // el reborde (en cono: entra empujando y no sale)
    const z1r = g + ar + 1.0, z2r = g + alto + 0.5, anR = Math.min(1.4, ejeD * 0.25); eje = eje.subtract(M().cube([anR, ejeD + 2, z2r - z1r], true).translate([0, 0, (z1r + z2r) / 2])); // la ranura: el eje se cierra al pasar el engranaje
    placa = placa.add(eje.translate([e.x, e.y, 0]));
  });
  const choques = []; for (let i = 0; i < piezas.length; i++) { choques.push({ t: 'engranaje ' + (i + 1) + ' con la placa', vol: vol(piezas[i].m, placa) }); for (let j = i + 1; j < piezas.length; j++) choques.push({ t: 'engranajes ' + (i + 1) + ' y ' + (j + 1), vol: vol(piezas[i].m, piezas[j].m) }); }
  return { placa, piezas, choques };
}
// girar la placa montada: el primero gira «a» grados y cada uno lo que le toca (al revés que su vecino, por la relación de dientes)
export function placaGira(R, pasos = 3) {
  const out = []; for (let i = 1; i <= pasos; i++) { const a0 = i / pasos * 360 / R.piezas[0].e.z; let a = a0; const L = R.piezas.map((q, k) => { if (k) a = -a * R.piezas[k - 1].e.z / q.e.z; return q.m.translate([-q.e.x, -q.e.y, 0]).rotate([0, 0, a]).translate([q.e.x, q.e.y, 0]); });
    let v = 0; for (let k = 1; k < L.length; k++) v += vol(L[k], L[k - 1]); out.push(Math.round(v * 1000) / 1000); }
  return out;
}
// el corazón: dos círculos (los lóbulos, con un engranaje en cada uno) y la punta abajo
export function corazonEngranajes(p) {
  const m = p.m, z = Math.max(16, Math.round((p.W - 2 * m - 10) / 2 / m)), c = z * m / 2, R = c + m + 5, tip = [0, -2.05 * R];
  const lob = x => circ(2 * R, x, 0), punta = N.cs([N.ccw(circulo(0.6, tip[0], tip[1], 16))], 'Positive');
  const izq = N.CSX().hull([lob(-c), punta]), der = N.CSX().hull([lob(c), punta]), contorno = izq.add(der);
  // el nombre, en relieve, DEBAJO del agujero del eje (por donde pasa el eje no puede ir): del alto que quepa en esa franja del círculo
  const nombre = (t, alto) => (gm, K) => { t = String(t || '').trim(); if (!t) return gm; const rf = K.rf - 1.2, y = -rf * 0.5, hMax = Math.min(alto, rf * 0.34), cuerda = 2 * Math.sqrt(Math.max(1, rf * rf - (Math.abs(y) + hMax / 2) ** 2)) * 0.92, hT = Math.min(hMax, cuerda / (0.66 * t.length));
    const T = texto(t, hT, 0.8); return T ? gm.add(T.translate([0, y, p.b - 0.01])) : gm; };
  const R0 = placaConEngranajes([{ x: -c, y: 0, z, extra: nombre(p.n1, 9) }, { x: c, y: 0, z, extra: nombre(p.n2, 9) }], { m, b: p.b, ejeD: 6, base: 2.4, tipo: 'recto', forma: contorno });
  return Object.assign(R0, { z, c, R });
}
export function mesaEngranajes(p) {
  const m = p.m, mt = p.tipo === 'helicoidal' ? m / Math.cos(20 * Math.PI / 180) : m; // (helicoidales: el diámetro va con el módulo «aparente»)
  const zs = [p.z1, p.z2, p.z1], b = p.b, base = 3, x1 = mt * (zs[0] + zs[1]) / 2, x2 = x1 + mt * (zs[1] + zs[2]) / 2, xs = [0, x1, x2].map(x => x - x2 / 2);
  const ancho = x2 + mt * zs[0] + 18, alto = mt * Math.max(...zs) + 18;
  const manivela = (gm, K) => gm.add(cil(7, 14, b - 0.01).translate([K.r * 0.62, 0, 0])).add(M().sphere(4.2, 24).translate([K.r * 0.62, 0, b + 14]));
  const R0 = placaConEngranajes([{ x: xs[0], y: 0, z: zs[0], extra: manivela }, { x: xs[1], y: 0, z: zs[1] }, { x: xs[2], y: 0, z: zs[2] }], { m, b, ejeD: 6, base, tipo: p.tipo, beta: p.tipo === 'helicoidal' ? 20 : 0, forma: rr(ancho, alto, 10) });
  return R0;
}
export function llaveroEngranajes(p) {
  const m = 1, z = 14, a = m * z, ancho = 2 * a + 22, alto = m * z + 10;
  let forma = rr(ancho, alto, alto / 2); forma = forma.add(circ(12, -ancho / 2 - 2, 0)).subtract(circ(5, -ancho / 2 - 2, 0));
  const R0 = placaConEngranajes([{ x: -a / 2 + 3, y: 0, z }, { x: a / 2 + 3, y: 0, z }], { m, b: 4, ejeD: 4, base: 2, tipo: 'recto', forma });
  const T = String(p.nombre || '').trim() ? texto(p.nombre, 5, 0.6) : null; if (T) R0.placa = R0.placa.subtract(T.rotate([180, 0, 0]).translate([3, 0, 0.59])); // el nombre, grabado DEBAJO (se lee al darle la vuelta)
  return R0;
}
function placaVer(R, ver) {
  if (ver === 'montada') return N.union([R.placa].concat(R.piezas.map(q => q.m)));
  return N.union(enFila([R.placa].concat(R.piezas.map(q => q.suelto)), 6, 175));
}

// ======================= 🌸 ESPIRÓGRAFO =======================
// Un aro con dientes por DENTRO (para hacer las flores rodando la rueda por dentro) y por FUERA (para las de fuera), y ruedas con
// agujeritos para la punta del boli en espiral (cada agujero, un dibujo distinto). Módulo 1 de evolvente: ruedan sin saltar.
export const RUEDAS_ESPIRO = [24, 30, 36, 40, 45, 52, 60, 72];
export function espirografo(p) {
  const m = 1, h = p.h, zIn = p.zIn, zOut = zIn + 24, base = { por: 'modulo', m, alfa: 20, juego: 0.2, b: h, tipo: 'recto' };
  const ext = G.engranaje(Object.assign({ z: zOut }, base)).m, rIn = zIn * m / 2 + 1.25 * m, Kext = G.numeros(Object.assign({ z: zOut }, base));
  const aroIn = G.corona(Object.assign({ z: zIn, aro: Kext.rf - rIn + 0.6 }, base)).m;
  let aro = ext.subtract(cil(2 * (rIn + 0.3), h + 2, -1)).add(aroIn);
  [0, 120, 240].forEach(a => { const r = (rIn + Kext.rf) / 2; aro = aro.subtract(cil(3, h + 2, -1).translate([r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180), 0])); }); // para sujetarlo con chinchetas o masilla
  const lista = RUEDAS_ESPIRO.filter(z => z <= zIn - 12).slice(0, p.juego === 'pequeno' ? 4 : 8);
  const ruedas = lista.map(z => { let r = G.engranaje(Object.assign({ z }, base)).m; const rf = z * m / 2 - 1.25 * m;
    // agujeros para el boli: en espiral, desde cerca del centro hasta cerca del borde (cada uno a otra distancia → otro dibujo)
    const hs = []; for (let k = 0, rr0 = 3.5; rr0 < rf - 2.6; k++, rr0 += 2.6) { const a = k * 47 * Math.PI / 180; hs.push(cil(p.boli, h + 2, -1).translate([rr0 * Math.cos(a), rr0 * Math.sin(a), 0])); }
    r = r.subtract(N.union(hs)); const T = texto(String(z), Math.min(6, rf * 0.35), 0.6); if (T) r = r.subtract(T.rotate([0, 0, 90]).translate([-rf * 0.55, 0, h - 0.59]));
    return { z, m: r }; });
  return { aro, ruedas, zIn, zOut };
}
// comprobación: cada rueda, puesta por DENTRO del aro tocando sus dientes, y casada: no se pisan
export function espiroCasa(E) {
  const base = { por: 'modulo', m: 1, alfa: 20 }; return E.ruedas.map(r => { const a = (E.zIn - r.z) * 1 / 2, mov = g => r.m.rotate([0, 0, g]).translate([a, 0, 0]); const g = fase(mov, E.aro, 360 / r.z); void base; return { z: r.z, vol: vol(mov(g), E.aro) }; });
}
function espiroVer(p) { const E = espirografo(p); if (p.que === 'aro') return E.aro; if (p.que === 'ruedas') return N.union(enFila(E.ruedas.map(r => r.m), 4, 170)); return N.union(enFila([E.aro].concat(E.ruedas.map(r => r.m)), 5, 240)); }

// ======================= 🤖 JUEGO DE ENGRANAJES PARA MOTORES (Arduino, robótica, maquetas) =======================
// Lo que más se busca: engranajes que entran DIRECTOS en el eje de los motores de siempre. Medidas HABITUALES de cada eje (ESTIMADAS:
// cada fábrica cambia un poco; mídelo con el calibre y, si hace falta, cambia «holgura del eje»). Buje con prisionero M3 y su tuerca
// atrapada (opcional). Módulo y dientes a elegir; los de un mismo módulo engranan entre sí (distancia entre ejes = m · (z1 + z2) / 2).
export const EJES_MOTOR = {
  tt: { t: 'Motor amarillo TT (Arduino): eje con dos planos', d: 5.4, planos: 2, entre: 3.7 },
  n20: { t: 'N20 (micro reductor): eje de 3 en D', d: 3, planos: 1, entre: 2.5 },
  nema17: { t: 'NEMA 17 (paso a paso): eje de 5 en D', d: 5, planos: 1, entre: 4.5 },
  byj: { t: '28BYJ-48 (paso a paso pequeño): eje de 5 con dos planos', d: 5, planos: 2, entre: 3 },
  r3: { t: 'Eje redondo de 3 mm', d: 3, planos: 0 }, r4: { t: 'Eje redondo de 4 mm', d: 4, planos: 0 }, r5: { t: 'Eje redondo de 5 mm', d: 5, planos: 0 }, r6: { t: 'Eje redondo de 6 mm', d: 6, planos: 0 }, r8: { t: 'Eje redondo de 8 mm (varilla lisa)', d: 8, planos: 0 },
};
export function agujeroMotor(E, hg) {
  let c = circ(E.d + 2 * hg); const L = E.d + 6;
  if (E.planos === 2) c = c.intersect(rr(E.entre + 2 * hg, L)); // dos planos: entre caras
  else if (E.planos === 1) { const xf = E.entre - E.d / 2 + hg; c = c.intersect(rr(L, L, 0, xf - L / 2, 0)); } // un plano, a «entre» del lado contrario
  return c;
}
export const dientesDe = t => String(t || '').split(/[^0-9]+/).map(Number).filter(z => z >= 8 && z <= 120).slice(0, 8);
export function engranajeMotor(p, z) {
  const E = EJES_MOTOR[p.motor] || EJES_MOTOR.tt, m = Number(p.m), b = p.b, K = G.numeros({ por: 'modulo', m, z, alfa: 20 });
  let g = G.engranaje({ por: 'modulo', m, z, alfa: 20, b, juego: 0.15, tipo: 'recto' }).m;
  // el agujero tiene que caber dentro del fondo de los dientes (con 1,2 mm de pared) y el buje NO puede pasar del fondo de los dientes
  // (si no, roza los dientes del engranaje de al lado): si no cabe, se dice cuántos dientes hacen falta como mínimo
  const anchoAg = E.d + 2 * p.holg; if (anchoAg + 2.4 > 2 * K.rf) N.mal('Con ' + z + ' dientes de módulo ' + n2(m) + ' no cabe el eje de ' + n2(E.d) + ' mm: pon al menos ' + Math.ceil((anchoAg + 2.4) / m + 2.5) + ' dientes o un módulo más grande.');
  const hubD = Math.min(2 * K.rf - 0.6, E.d + 11), hubH = p.buje && hubD >= anchoAg + 2.4 ? Math.max(5, p.prisionero ? 8 : 5) : 0;
  if (hubH) g = g.add(cil(hubD, hubH, b - 0.01));
  g = g.subtract(agujeroMotor(E, p.holg).extrude(b + hubH + 2).translate([0, 0, -1]));
  if (hubH && p.prisionero) { const zc = b + hubH / 2 + 0.6; g = g.subtract(cil(3.3, hubD, 0).rotate([0, 90, 0]).translate([0, 0, zc])) // el tornillo M3, de lado
    .subtract(M().cube([2.7, 5.8, hubH], true).translate([E.d / 2 + 2.6, 0, zc + hubH / 2 - 0.01])); } // la tuerca M3, metida desde arriba
  return { m: g, K, E, hubD, hubH };
}
// los dientes mínimos para que quepa el eje (con 1,2 mm de pared hasta el fondo de los dientes)
export const zMinMotor = p => { const E = EJES_MOTOR[p.motor] || EJES_MOTOR.tt, m = Number(p.m); return Math.max(8, Math.ceil((E.d + 2 * p.holg + 2.4) / m + 2.5 + 1e-9)); };
function juegoMotor(p) {
  const L = dientesDe(p.dientes).map(z => Math.max(z, zMinMotor(p))); if (!L.length) N.mal('Escribe los dientes que quieres, separados por comas (de 8 a 120): por ejemplo «10, 20, 30».');
  const G2 = L.map(z => engranajeMotor(p, z));
  if (p.que === 'pareja' && L.length >= 2) { const a = Number(p.m) * (L[0] + L[1]) / 2, A = G2[0].m, B0 = G2[1].m, sA = A.slice(p.b / 2), sB = B0.slice(p.b / 2);
    const g = fase(q => sB.rotate(q).translate([a, 0]), sA, 360 / L[1], area); return N.union([A, B0.rotate([0, 0, g]).translate([a, 0, 0])]); }
  return N.union(enFila(G2.map(x => x.m), 5, 170));
}

// ======================= el catálogo =======================
export const DISENOS_ENGR = {
  rodamientoPlanetario: { cat: 'juegos', tambien: ['mecanica', 'adultos', 'jovenes'], e: '🌀', t: 'Rodamiento planetario de engranajes (sale montado)', d: 'El fidget de engranajes: gira el centro y giran los planetas. Se imprime de una vez', uso: 'deco', color: '#7c6cff', nuevo: true,
    campos: [n('D', 'Diámetro', 60, 40, 110, 1), n('h', 'Alto', 14, 8, 30, 1), n('np', 'Planetas', 5, 3, 7, 1, ''), n('m', 'Tamaño del diente (módulo)', 1.5, 1, 2.5, 0.25), s('centro', 'Agujero del centro', 'hex', [['hex', 'Hexágono (gíralo con una llave Allen o un lápiz)'], ['redondo', 'Redondo'], ['no', 'Sin agujero']]), n('ag', 'Medida del agujero', 8, 3, 30, 0.5), s('borde', 'Borde', 'moleteado', [['moleteado', 'Moleteado (se agarra mejor)'], ['liso', 'Liso']])],
    gen: p => rodamientoPlanetario(p),
    nota: p => { try { const K = planetarioNumeros(p); return (K.mCambiado ? '⚙️ Para que quepan, he puesto dientes de módulo ' + n2(K.m) + '. ' : '') + 'Sol de ' + K.zs + ' dientes, ' + K.np + ' planetas de ' + K.zp + ' y corona de ' + K.zr + ' (en espiga, 25°): ' + K.zr + ' = ' + K.zs + ' + 2 × ' + K.zp + ' y (' + K.zs + ' + ' + K.zr + ') entre ' + K.np + ' da exacto, así caben todos. Ø real ' + n2(K.D) + ' mm. ' + (p.centro !== 'no' && agujeroSol(p, K) < p.ag ? '⚠️ El agujero del centro no cabía de ' + n2(p.ag) + ': lo he dejado en ' + n2(agujeroSol(p, K)) + ' mm. ' : '') + 'Sale MONTADO: 0,3 mm de juego en cada diente y las puntas 0,15 más cortas. Al sacarlo, gira el centro con fuerza hasta que se suelte (crujido normal). Capa 0,2, sin soportes, PLA.'; } catch (e) { return e.message; } } },
  corazonEngranajes: { cat: 'regalos', tambien: ['adultos', 'cuqui', 'juegos'], e: '💞', t: 'Corazón de engranajes con vuestros nombres', d: 'Gira uno y gira el otro: cada engranaje lleva un nombre', uso: 'deco', color: '#e5383b', nuevo: true,
    campos: [tx('n1', 'Nombre 1', 'Ana'), tx('n2', 'Nombre 2', 'Luis'), n('W', 'Ancho', 120, 90, 170, 1), n('m', 'Tamaño del diente (módulo)', 2, 1.5, 3, 0.25), n('b', 'Grueso de los engranajes', 6, 4, 10, 0.5), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir (placa + 2 engranajes)'], ['montada', 'Montado']])],
    gen: p => placaVer(corazonEngranajes(p), p.ver), dosColores: p => ({ z: p.b, color: '#ffffff' }),
    nota: p => 'Los engranajes ENCAJAN en sus ejes con un clic (el reborde no los deja salir) y giran con 0,15 mm de holgura. Comprobado montado: no se tocan y engranan. 🌈 Los nombres suben 0,8 mm: pon la pausa de color a ' + n2(p.b) + ' mm al imprimir los engranajes (tumbados). Sin soportes.' },
  mesaEngranajes: { cat: 'oficina', tambien: ['juegos', 'adultos', 'mecanica'], e: '⚙️', t: 'Engranajes de mesa con manivela', d: 'Juguete de escritorio: da vueltas a la manivela y giran los tres', uso: 'deco', color: '#ffb020', nuevo: true,
    campos: [n('z1', 'Dientes de los grandes', 30, 20, 44, 1, ''), n('z2', 'Dientes del pequeño', 15, 10, 24, 1, ''), n('m', 'Tamaño del diente (módulo)', 2, 1.5, 3, 0.25), n('b', 'Grueso', 8, 5, 14, 0.5), s('tipo', 'Dientes', 'helicoidal', [['helicoidal', 'Helicoidales (inclinados, más finos)'], ['recto', 'Rectos']]), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montado']])],
    gen: p => placaVer(mesaEngranajes(p), p.ver),
    nota: p => 'Relación ' + p.z1 + ' → ' + p.z2 + ' → ' + p.z1 + ': el pequeño gira ' + n2(p.z1 / p.z2) + ' veces más deprisa. ' + (p.tipo === 'helicoidal' ? 'Helicoidales a 20°, de mano contraria entre vecinos (como los de fábrica): al meterlos en el eje, gíralos un poco mientras bajan. ' : '') + 'Encajan en sus ejes con un clic y giran con 0,15 mm de holgura. Comprobado montado y girando. Sin soportes.' },
  llaveroEngranajes: { cat: 'regalos', tambien: ['juegos', 'jovenes'], e: '🔑', t: 'Llavero de engranajes que giran', d: 'Dos engranajes pequeños para darle vueltas, con tu nombre grabado detrás', uso: 'deco', color: '#2ec4b6', nuevo: true,
    campos: [tx('nombre', 'Nombre (detrás)', 'Lucía'), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montado']])],
    gen: p => placaVer(llaveroEngranajes(p), p.ver),
    nota: () => 'Dos engranajes de 14 dientes (módulo 1) que encajan con un clic en sus ejes de 4 mm. El nombre va grabado debajo de la placa. Sin soportes; mejor capa de 0,12–0,16.' },
  juegoEngranajesMotor: { cat: 'mecanica', tambien: ['ciencia', 'rc'], e: '🤖', t: 'Engranajes para motores (Arduino, robótica)', d: 'Entran directos en el eje del motor TT, N20, NEMA 17, 28BYJ-48 o en ejes redondos', uso: 'pieza', color: '#3a86ff', nuevo: true,
    campos: [s('motor', 'Motor / eje', 'tt', Object.entries(EJES_MOTOR).map(([k, e]) => [k, e.t])), s('m', 'Tamaño del diente (módulo)', '1', [['0.5', '0,5 (muy fino)'], ['0.8', '0,8'], ['1', '1 (el más usado)'], ['1.5', '1,5'], ['2', '2 (fuerte)']]), tx('dientes', 'Dientes (separados por comas)', '12, 20, 30, 40', 'De 8 a 120 cada uno; hasta 8 engranajes'),
      n('b', 'Grueso', 6, 3, 16, 0.5), { k: 'buje', t: 'Con buje (más agarre en el eje)', v: true, chk: 1 }, { k: 'prisionero', t: 'Con prisionero M3 y su tuerca', v: false, chk: 1 }, n('holg', 'Holgura del eje (por lado)', 0.1, 0, 0.3, 0.05), s('que', 'Ver', 'juego', [['juego', 'El juego para imprimir'], ['pareja', 'Los dos primeros, engranados']])],
    gen: p => juegoMotor(p),
    nota: p => { const zm = zMinMotor(p), L0 = dientesDe(p.dientes), L = L0.map(z => Math.max(z, zm)), m = Number(p.m), E = EJES_MOTOR[p.motor] || EJES_MOTOR.tt; return (L0.some(z => z < zm) ? '⚙️ Con menos de ' + zm + ' dientes no cabe ese eje: los he puesto de ' + zm + '. ' : '') + 'Para ' + E.t + ' (medidas HABITUALES: mídelo; si entra flojo o duro, cambia la holgura). ' + (L.length >= 2 ? 'Distancia entre ejes de ' + L[0] + ' y ' + L[1] + ' dientes: ' + n2(m * (L[0] + L[1]) / 2) + ' mm. ' : '') + 'Dientes de evolvente módulo ' + n2(m) + ' (20°), 0,15 de juego en cada uno: todos los de este módulo engranan entre sí.' + (m < 0.8 ? ' ⚠️ Módulo ' + n2(m) + ': imprime con boquilla 0,2 o capa de 0,08–0,12.' : '') + (p.prisionero ? ' Mete la tuerca M3 por arriba y aprieta el prisionero contra el plano del eje.' : '') + ' Sin soportes.'; } },
  espirografo: { cat: 'ninos', tambien: ['juegos', 'regalos', 'ciencia'], e: '🌸', t: 'Espirógrafo (dibujos de espirales)', d: 'Aro con dientes por dentro y por fuera + ruedas con agujeros para el boli', uso: 'deco', color: '#ff70a6', nuevo: true,
    campos: [n('zIn', 'Dientes del aro por dentro (tamaño)', 96, 72, 120, 1, ''), n('h', 'Grueso', 3, 2.4, 5, 0.2), n('boli', 'Agujero del boli', 2.6, 1.6, 4, 0.1), s('juego', 'Ruedas', 'completo', [['completo', '8 ruedas'], ['pequeno', '4 ruedas']]), s('que', 'Qué sacar', 'todo', [['todo', 'Todo'], ['aro', 'Solo el aro'], ['ruedas', 'Solo las ruedas']])],
    gen: p => espiroVer(p),
    nota: p => 'Aro de ' + p.zIn + ' dientes por dentro y ' + (p.zIn + 24) + ' por fuera; ruedas de ' + RUEDAS_ESPIRO.filter(z => z <= p.zIn - 12).slice(0, p.juego === 'pequeno' ? 4 : 8).join(', ') + ' dientes (cada una con su número). Comprobado: cada rueda casa por dentro del aro sin pisarse. Sujeta el aro con 3 chinchetas o masilla y pon la punta del boli en un agujerito; cada agujero da un dibujo distinto. Sin soportes.' },
};
