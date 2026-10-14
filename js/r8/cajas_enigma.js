// ================= 14-10-2026 · 🧩 CAJAS ENIGMA (Taller de cajas): laberinto escondido, criptex y caja japonesa de pasos =================
// Ella (14-10-2026, tarde): «ve añadiendo y creando más cajas exóticas, cajas secretas, cajas ocultas de combinación que tienes que hacer
// varios movimientos ocultos y se abre, cosas de estas; investiga y haz diseños para vender, todo funcional; las llaves tienen que funcionar».
// Lo que más se vende impreso de este tipo (Printables, MakerWorld, Etsy): la caja LABERINTO (el camino va escondido por dentro y hay que
// encontrarlo girando y subiendo a ciegas), el CRIPTEX (anillos de letras con una palabra secreta y muescas falsas para que no se adivine
// al tacto) y la caja JAPONESA de pasos (himitsu-bako: paneles que se deslizan en un orden oculto). Diseño PROPIO las tres.
// Como el resto del taller, cada una se MONTA en el ordenador antes de dártela: se «barre» la pieza que se mueve por todo el camino bueno
// (no puede tocar nada) y se comprueba que por los caminos malos se para. Se imprimen sin soportes: lo que cuelga va a 45°.
// Una caja enigma es una caja del taller con C.forma ('laberinto' · 'criptex' · 'secuencia'); cajas.js le pasa aquí construir,
// comprobar, piezas, revisión y manual. Las medidas en mm; la caja apoyada en z = 0.
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';

const M = () => N.MF();
const segs = d => Math.max(24, Math.min(160, Math.round(d * 3 + 16)));
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cilZ = (r, z0, z1, x = 0, y = 0, sg) => M().cylinder(z1 - z0, r, r, sg || segs(2 * r)).translate([x, y, z0]);
const conoZ = (r0, r1, z0, z1, sg) => M().cylinder(z1 - z0, r0, r1, sg || segs(2 * Math.max(r0, r1))).translate([0, 0, z0]);
const GRAD = 180 / Math.PI;
// un perfil (r, z) girado alrededor del eje Z de a0 a a1 (radianes; a0 < a1) en «div» trozos (OJO: el motor reparte los trozos en el arco,
// no en la vuelta entera) · sin div: un trozo cada 2,5°
// (con menos de 3 trozos el motor hace el arco de golpe: siempre 3 o más)
const sector = (pts, a0, a1, div) => N.cs([N.ccw(pts)], 'Positive').revolve(Math.max(3, div || Math.ceil((a1 - a0) * GRAD / 2.5)), Math.max(0.05, (a1 - a0) * GRAD)).rotate([0, 0, a0 * GRAD]);
const giraZ = (m, a) => (a ? m.rotate([0, 0, a * GRAD]) : m);
// el casco convexo de unos puntos 2D (para «barrer» un perfil)
function casco(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
  p.forEach(q => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
  p.slice().reverse().forEach(q => { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); });
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
// el azar de cada caja sale de su número: la misma caja, el mismo laberinto (para reimprimir una pieza o repetir un pedido)
function azar(sem) { let a = (Number(sem) >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const texto = (t, alto, h) => { if (typeof document === 'undefined' || !String(t || '').trim()) return null; try { return N.centraCS(N.texto2(String(t), 'gorda', alto)).extrude(h); } catch (e) { return null; } };
const IMPRESORAS = { p1p: { t: 'Bambu P1P (256 mm)', cama: 256, alto: 250 }, a1mini: { t: 'Bambu A1 mini (180 mm)', cama: 180, alto: 180 } };

// ======================= las FORMAS (lo que sale en la pantalla) =======================
// campos = [clave, texto, mín, máx, paso] · 'txt' = texto · { ops } = desplegable
export const FORMAS = {
  laberinto: { e: '🌀', t: 'Caja laberinto', d: 'El camino va escondido por dentro: hay que girar y subir la tapa a ciegas hasta dar con la salida. Cada caja, su laberinto.',
    campos: [['D', 'Diámetro', 50, 150, 1], ['H', 'Alto', 50, 200, 1], ['semilla', 'Nº de laberinto (cada número, un camino distinto)', 1, 99999, 1], ['nivel', 'Dificultad', { ops: [['facil', 'Fácil (para niños)'], ['media', 'Media'], ['dificil', 'Difícil']] }], ['hucha', 'Hucha', { ops: [['no', 'No'], ['si', 'Sí: ranura para monedas arriba']] }], ['texto', 'Nombre en la tapa', 'txt']] },
  criptex: { e: '🔐', t: 'Criptex', d: 'Anillos con letras: solo con la palabra secreta sale la cámara. Muescas falsas para que no se adivine al tacto.',
    campos: [['palabra', 'Palabra secreta (3 a 7)', 'txt'], ['alfabeto', 'Anillos de', { ops: [['letras', 'Letras (A–Z y Ñ)'], ['numeros', 'Números (0–9)']] }]] },
  secuencia: { e: '🧩', t: 'Caja japonesa de pasos', d: 'Parece cerrada por todas partes: se abre con 4 movimientos escondidos, en orden.',
    campos: [['L', 'Largo', 90, 250, 1], ['W', 'Ancho', 60, 250, 1], ['H', 'Alto', 45, 200, 1]] },
};
export const es = C => !!(C && C.forma && FORMAS[C.forma]);
// pa / pz = lo que mide cada casilla (a lo ancho / a lo alto) · mov = cuántos movimientos buscar (difícil: los más que haya)
export const NIVELES = { facil: { t: 'fácil', pa: 10, pz: 8.6, mov: 12 }, media: { t: 'media', pa: 8.4, pz: 7.6, mov: 24 }, dificil: { t: 'difícil', pa: 7.4, pz: 7.0, mov: 999 } };

// ======================= 🌀 LA CAJA LABERINTO =======================
// Dos piezas: el CUERPO (un vaso con el laberinto grabado por fuera y una base ancha) y la TAPA (un tubo cerrado por arriba con dos
// pivotes por dentro, enfrentados). Los pivotes corren por las ranuras del laberinto: para quitar la tapa hay que llevarlos desde el
// fondo hasta la salida de arriba girando y subiendo (y bajando) por el único camino que hay. Por fuera no se ve nada.
// Ranuras de 4,6 mm y 2,2 de hondo con el techo a 45° (de pie se imprime sin soportes); los pivotes, con su cara de arriba también a 45°
// (la tapa se imprime boca abajo y el pivote cuelga a 45° de la pared). Aire: 0,35 entre tubo y cuerpo, 0,5 alrededor del pivote.
export const LAB = { TS: 2.4, TL: 3, G: 0.35, D: 2.2, W: 4.6, HB: 8, FONDO: 2.4, BAJO: 3, CAP: 2.5, PIV: 3.6, AIRE: 0.5, HUL: 30, HUW: 2.8 }; // HUL × HUW = la ranura de la hucha (la moneda de 2 €: 25,75 × 2,2)
export function labMedidas(C) {
  const K = LAB, niv = NIVELES[C.nivel] || NIVELES.media, Ro = C.D / 2, Rs = Ro - K.TS, Ri = Rs - K.G, Rc = Ri - K.D - 1.8;
  const zf0 = K.HB + K.BAJO, zTop = C.H - K.TL - 0.8, nr = Math.floor((zTop - K.CAP - K.W - zf0) / niv.pz) + 1;
  // la REJILLA: cada columna se parte en k trozos iguales (delta) y TODO (cilindro, ranuras, salida) cae en sus rayas: así las ranuras
  // cortan el cilindro limpias (sin miles de triángulos). Un canal mide 2 trozos: al fondo, al menos 4,6 mm; entre canales, al menos 2,2.
  let na = Math.max(3, Math.floor(Math.PI * Ri / niv.pa)), k = 2;
  for (; na > 3; na--) { const b = Math.PI / na; k = Math.floor(2 * b * (Ri - K.D) / K.W); if (k >= 2 && b * (1 - 2 / k) * Ri >= 2.2) break; }
  k = Math.max(2, k); const beta = Math.PI / na, delta = beta / k, alfa = 2 * delta, rt = Ri - K.D + 0.45, alfaP = K.PIV / rt;
  return { niv, Ro, Rs, Ri, Rc, zf0, zTop, nr, na, k, beta, delta, sg: 4 * na * k, /* (media rejilla: el cilindro tiene sus vértices cada delta/2) */ alfa, rt, alfaP, pz: niv.pz, Hs: C.H - K.HB, zp0: zf0 + K.AIRE - K.HB };
}
// el laberinto: un árbol (de cada casilla a cualquier otra hay UN camino) sobre un cilindro de na columnas (dan la vuelta) y nr filas.
// La ENTRADA es arriba (columna 0); la META (cerrada) es una casilla de la fila de abajo. De 24 laberintos posibles con ese número, y de
// todas sus metas, se elige la que pide los movimientos más cercanos a «mov» (fácil 12, media 24; difícil: los más que haya).
export function labGenera(na, nr, semilla, mov = 999) {
  const id = (i, j) => j * na + i, cand = [];
  for (let k = 0; k < 24; k++) {
    const rnd = azar((Number(semilla) || 1) * 7919 + k * 104729 + na * 31 + nr), abre = new Set(), visto = new Uint8Array(na * nr), pila = [id(0, nr - 1)]; visto[pila[0]] = 1;
    while (pila.length) {
      const c = pila[pila.length - 1], i = c % na, j = (c - i) / na, V = [[(i + 1) % na, j], [(i + na - 1) % na, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => b >= 0 && b < nr && !visto[id(a, b)]);
      if (!V.length) { pila.pop(); continue; }
      const [a, b] = V[Math.floor(rnd() * V.length)], n = id(a, b); visto[n] = 1; abre.add(Math.min(c, n) + '-' + Math.max(c, n)); pila.push(n);
    }
    // las distancias desde la entrada (por el árbol) y la meta: la casilla de abajo más lejana
    const dist = new Int32Array(na * nr).fill(-1), padre = new Int32Array(na * nr).fill(-1), cola = [id(0, nr - 1)]; dist[cola[0]] = 0;
    for (let q = 0; q < cola.length; q++) { const c = cola[q], i = c % na, j = (c - i) / na;
      [[(i + 1) % na, j], [(i + na - 1) % na, j], [i, j + 1], [i, j - 1]].forEach(([a, b]) => { if (b < 0 || b >= nr) return; const n = id(a, b); if (dist[n] < 0 && abre.has(Math.min(c, n) + '-' + Math.max(c, n))) { dist[n] = dist[c] + 1; padre[n] = c; cola.push(n); } }); }
    for (let i = 0; i < na; i++) { const camino = []; for (let c = id(i, 0); c >= 0; c = padre[c]) camino.push(c);
      let m = 1, d0 = null; for (let q = 1; q < camino.length; q++) { const a = camino[q - 1], b = camino[q], d = Math.abs(a - b) === na ? 'v' + Math.sign(b - a) : 'h' + (((b % na) - (a % na) + na) % na === 1 ? 1 : -1); if (d0 && d !== d0) m++; d0 = d; }
      cand.push({ abre, camino, movs: m }); }
  }
  // (empate: el de más casillas; y nunca uno con menos de 6 movimientos si hay otro)
  cand.sort((a, b) => Math.abs(a.movs - mov) - Math.abs(b.movs - mov) || b.camino.length - a.camino.length);
  const L = cand.find(c => c.movs >= Math.min(6, mov)) || cand[0];
  const celdas = L.camino.map(c => ({ i: c % na, j: Math.floor(c / na) }));
  return { na, nr, abre: L.abre, camino: celdas, meta: celdas[0], abierto: (a, b) => L.abre.has(Math.min(a, b) + '-' + Math.max(a, b)), id };
}
// los MOVIMIENTOS del camino bueno (desde cerrada): [{ que: 'sube'|'baja'|'der'|'izq', n }] (der = girar la tapa a la derecha)
export function labMovimientos(Lb) {
  const out = [], C = Lb.camino;
  for (let k = 1; k < C.length; k++) { const a = C[k - 1], b = C[k], q = b.j > a.j ? 'sube' : b.j < a.j ? 'baja' : ((b.i - a.i + Lb.na) % Lb.na === 1 ? 'izq' : 'der');
    if (out.length && out[out.length - 1].que === q) out[out.length - 1].n++; else out.push({ que: q, n: 1 }); }
  if (out.length && out[out.length - 1].que === 'sube') out[out.length - 1].fin = true; else out.push({ que: 'sube', n: 1, fin: true });
  return out;
}
export function labDatos(C) { const Q = labMedidas(C); return Object.assign(Q, { Lb: labGenera(Q.na, Q.nr, C.semilla, Q.niv.mov) }); }
// la postura de la tapa a lo largo del camino: [{ fi, tz }] (fi = lo girada; tz = lo subida desde cerrada) + la salida
export function labPosturas(C, Q) {
  Q = Q || labDatos(C); const Lb = Q.Lb, P = []; let fi = Lb.meta.i * Q.beta;
  Lb.camino.forEach((c, k) => { if (k) { const a = Lb.camino[k - 1]; if (c.j === a.j) fi += ((c.i - a.i + Lb.na) % Lb.na === 1 ? 1 : -1) * Q.beta; } P.push({ fi, tz: (c.j) * Q.pz }); });
  const fin = P[P.length - 1], fuera = Q.zTop - Q.zf0 + 1.5; P.push({ fi: fin.fi, tz: fuera }, { fi: fin.fi, tz: fuera + 14, fuera: true });
  return P;
}
// el perfil (r, z) del pivote, con z desde el borde de la tapa
function labPerfilPivote(Q, dz = 0) { const K = LAB, top = r => Q.zp0 + (K.W - 2 * K.AIRE) - (Q.Ri - r) + dz, R2 = Q.Rs + 0.8; return [[Q.rt, Q.zp0 + dz], [R2, Q.zp0 + dz], [R2, top(R2)], [Q.rt, top(Q.rt)]]; }
const labPivotes = (Q, pts, a0, a1) => N.union([0, Math.PI].map(s => sector(pts, a0 + s - Q.alfaP / 2, a1 + s + Q.alfaP / 2, Math.max(2, Math.ceil((a1 - a0 + Q.alfaP) / Q.delta) + 1))));
export function labConstruye(C) {
  const K = LAB, Q = labDatos(C), Lb = Q.Lb, avisos = [], sueltas = [], mec = [];
  if (Q.nr < 3) N.mal('La caja es muy baja para un laberinto: súbela (con ' + n1(C.H) + ' mm solo caben ' + Q.nr + ' filas; hacen falta 3).');
  if (Q.Rc < 10) N.mal('La caja es muy estrecha: hazla de al menos ' + Math.ceil(C.D + 2 * (10 - Q.Rc)) + ' mm de diámetro.');
  // ---- el cuerpo: base ancha + cilindro del laberinto + el hueco de dentro ----
  const sg = Q.sg, sgF = sg * Math.max(1, Math.round(160 / sg));
  let cuerpo = cilZ(Q.Ro, 0, K.HB, 0, 0, sgF).add(cilZ(Q.Ri, K.HB - 0.01, Q.zTop, 0, 0, sg)).subtract(cilZ(Q.Rc, K.FONDO, Q.zTop + 1, 0, 0, sg));
  // las ranuras: un hueco por casilla y un pasillo por cada paso abierto (horizontal = trapecio con techo a 45°, vertical = rectángulo)
  const nodo = zf => [[Q.Ri - K.D, zf], [Q.Ri + 1, zf], [Q.Ri + 1, zf + K.W + 1], [Q.Ri - K.D, zf + K.W - K.D]];
  const zf = j => Q.zf0 + j * Q.pz, th = i => i * Q.beta, R = [];
  for (let j = 0; j < Q.nr; j++) for (let i = 0; i < Q.na; i++) {
    R.push(sector(nodo(zf(j)), th(i) - Q.delta, th(i) + Q.delta, 4));
    const c = Lb.id(i, j), dch = Lb.id((i + 1) % Q.na, j), arr = j + 1 < Q.nr ? Lb.id(i, j + 1) : -1;
    if (Lb.abierto(c, dch)) R.push(sector(nodo(zf(j)), th(i), th(i) + Q.beta, 2 * Q.k));
    if (arr >= 0 && Lb.abierto(c, arr)) R.push(sector([[Q.Ri - K.D, zf(j) + 0.01], [Q.Ri + 1, zf(j) + 0.01], [Q.Ri + 1, zf(j + 1) + 1], [Q.Ri - K.D, zf(j + 1) + 1]], th(i) - Q.delta, th(i) + Q.delta, 4));
  }
  R.push(sector([[Q.Ri - K.D, zf(Q.nr - 1) + 0.01], [Q.Ri + 1, zf(Q.nr - 1) + 0.01], [Q.Ri + 1, Q.zTop + 1], [Q.Ri - K.D, Q.zTop + 1]], -Q.delta, Q.delta, 4)); // la salida
  const media = N.union(R); cuerpo = cuerpo.subtract(N.union([media, giraZ(media, Math.PI)]));
  // un chaflán de 45° en la boca de arriba (por dentro y por fuera) y estrías para agarrarla en la base
  cuerpo = cuerpo.subtract(conoZ(Q.Rc - 0.01, Q.Rc + 1.2, Q.zTop - 1.2, Q.zTop + 0.01, sg));
  const ne = Math.round(Math.PI * C.D / 5), estrias = (r, z0, z1) => N.union(Array.from({ length: ne }, (_, k) => cilZ(0.9, z0, z1, r + 0.35, 0, 8).rotate([0, 0, (k + 0.5) * 360 / ne])));
  cuerpo = cuerpo.subtract(estrias(Q.Ro, 1.2, K.HB - 1.2));
  // ---- la tapa: tubo cerrado arriba (z desde su borde) con los dos pivotes; cerrada, su borde está en la base (z = HB) ----
  let tapa = cilZ(Q.Ro, 0, Q.Hs, 0, 0, sgF).subtract(cilZ(Q.Rs, -1, Q.Hs - K.TL, 0, 0, sg)).add(labPivotes(Q, labPerfilPivote(Q), 0, 0));
  tapa = tapa.subtract(estrias(Q.Ro, 3, Q.Hs - 4));
  // 🐷 la HUCHA: una ranura en la tapa (las monedas caen al hueco del cuerpo; solo se sacan abriendo el laberinto). El nombre, debajo
  const HU = C.hucha === 'si', alto = Math.min(14, C.D * 0.16);
  if (HU) tapa = tapa.subtract(cubo(-K.HUL / 2, K.HUL / 2, -K.HUW / 2, K.HUW / 2, Q.Hs - K.TL - 1, Q.Hs + 1));
  const T = texto(C.texto, alto, 0.7); if (T) tapa = tapa.subtract(T.translate([0, HU ? -(K.HUW / 2 + 2.5 + alto / 2) : 0, Q.Hs - 0.6]));
  // cerrada: los pivotes en la META
  const P = labPosturas(C, Q), fi0 = P[0].fi;
  tapa = giraZ(tapa, fi0).translate([0, 0, K.HB]);
  mec.push({ tipo: 'laberinto', Q, P });
  return { cuerpo, tapa, sueltas, puertas: [], eje: null, avisos, mec, enigma: { forma: 'laberinto', P, fi0, movs: labMovimientos(Lb), filas: Q.nr, columnas: Q.na, casillas: Q.na * Q.nr, pasos: Lb.camino.length } };
}
// lo que barre un pivote (los dos) yendo de la postura a a la b (una de las dos cosas cambia: o gira o sube)
function labBarre(Q, a, b) {
  if (Math.abs(a.fi - b.fi) < 1e-9) { const P0 = labPerfilPivote(Q, Math.min(a.tz, b.tz)), P1 = labPerfilPivote(Q, Math.max(a.tz, b.tz)); return labPivotes(Q, casco(P0.concat(P1)), a.fi, a.fi); }
  return labPivotes(Q, labPerfilPivote(Q, a.tz), Math.min(a.fi, b.fi), Math.max(a.fi, b.fi));
}
export function labComprueba(C, G) {
  const out = [], ok = (t, d) => out.push({ ok: true, t, d }), mal = (t, d) => out.push({ ok: false, t, d });
  const M0 = G.mec.find(m => m.tipo === 'laberinto'), Q = M0.Q, P = M0.P, K = LAB, cu = G.cuerpo, toque = (a, b) => { const x = a.intersect(b); return x.isEmpty() ? 0 : x.volume(); };
  const v0 = toque(G.tapa, cu);
  if (v0 < 0.05) ok('Cerrada, la tapa no roza el cuerpo', 'Los pivotes quedan en la meta con ' + n1(K.AIRE) + ' mm de aire alrededor.'); else mal('Cerrada, la tapa se pisa con el cuerpo', v0.toFixed(2) + ' mm³.');
  // el camino bueno: barrido entero de una vez (sube/baja = el perfil estirado; girar = el perfil girado)
  const bar = []; for (let k = 1; k < P.length; k++) bar.push(labBarre(Q, P[k - 1], P[k]));
  const vb = toque(N.union(bar).translate([0, 0, K.HB]), cu);
  const mv = G.enigma.movs, nMov = mv.length;
  if (vb < 0.05) ok('Por el camino bueno, la tapa sale entera sin tocar nada', 'Montada en el ordenador: los dos pivotes barridos por todo el camino (' + nMov + ' movimientos, ' + (P.length - 2) + ' casillas) no tocan el laberinto.'); else mal('Por el camino bueno, un pivote roza', vb.toFixed(2) + ' mm³.');
  // los atajos: tirar recto hacia arriba y girar del todo desde cerrada → se paran
  const a0 = P[0], top = { fi: a0.fi, tz: P[P.length - 1].tz };
  const tira = toque(labBarre(Q, a0, top).translate([0, 0, K.HB]), cu);
  let lo = 0, hi = top.tz; if (tira > 0.05) for (let it = 0; it < 7; it++) { const m = (lo + hi) / 2; if (toque(labBarre(Q, a0, { fi: a0.fi, tz: m }).translate([0, 0, K.HB]), cu) > 0.05) hi = m; else lo = m; }
  if (tira > 0.05) ok('Tirando recto hacia arriba no se abre', (lo < 0.5 ? 'No sube nada' : 'Se para a los ' + n1(lo) + ' mm') + ': hay que encontrar el camino.'); else mal('Tirando recto hacia arriba se abre', 'El laberinto no sirve: cambia el número.');
  const gira = toque(labBarre(Q, a0, { fi: a0.fi + 2 * Math.PI, tz: a0.tz }).translate([0, 0, K.HB]), cu);
  if (gira > 0.05) ok('Girando sin subir no se abre', 'La tapa gira un poco y se para.'); else mal('Desde cerrada la tapa gira entera', '');
  ok('Laberinto nº ' + C.semilla + ' · ' + Q.nr + ' filas × ' + 2 * Q.na + ' columnas · dificultad ' + Q.niv.t, nMov + ' movimientos escondidos para abrirla (el camino está en el manual, para ti). Cada número da un laberinto distinto: anótalo si quieres repetirla.');
  if (C.hucha === 'si') { const cabe = 2 * Q.Rc > K.HUL + 2; if (cabe) ok('🐷 Hucha: las monedas caen dentro', 'Ranura de ' + n1(K.HUL) + ' × ' + n1(K.HUW) + ' mm (cabe la de 2 €) sobre un hueco de Ø' + n1(2 * Q.Rc) + ' mm. Solo se sacan abriendo el laberinto.'); else mal('🐷 La ranura de la hucha no cae en el hueco', 'Haz la caja más ancha.'); }
  ok('Se imprime sin soportes', 'Los techos de las ranuras y los pivotes van a 45°. Cuerpo de pie; la tapa, boca abajo.');
  return out;
}
export function labPiezas(C, G) {
  return [{ nombre: 'Cuerpo (con el laberinto)', m: N.aLaCama(G.cuerpo), color: C.color, como: 'de pie, la base en la cama' },
    { nombre: 'Tapa (con los pivotes)', m: N.aLaCama(G.tapa.rotate([180, 0, 0])), color: C.colorTapa, como: 'boca abajo (la cara de arriba en la cama)' }];
}
// la postura a lo largo del camino (u de 0 = cerrada a 1 = fuera): matriz de la tapa (relativa a cerrada)
function labPose(G, u) {
  const P = G.enigma.P, L = [0]; for (let k = 1; k < P.length; k++) L.push(L[k - 1] + Math.abs(P[k].fi - P[k - 1].fi) * 30 + Math.abs(P[k].tz - P[k - 1].tz));
  const s = Math.max(0, Math.min(1, u)) * L[L.length - 1]; let k = 1; while (k < P.length - 1 && L[k] < s) k++;
  const t = L[k] > L[k - 1] ? (s - L[k - 1]) / (L[k] - L[k - 1]) : 1, fi = P[k - 1].fi + (P[k].fi - P[k - 1].fi) * t, tz = P[k - 1].tz + (P[k].tz - P[k - 1].tz) * t, a = fi - G.enigma.fi0, c = Math.cos(a), s2 = Math.sin(a);
  return [c, s2, 0, 0, -s2, c, 0, 0, 0, 0, 1, 0, 0, 0, tz, 1];
}
// el mapa del laberinto (desenrollado, media vuelta: la otra media es igual) con el camino bueno: SVG para el manual
export function labMapa(C) {
  const Q = labDatos(C), Lb = Q.Lb, c = 26, m = 18, W = Q.na * c + 2 * m, H = Q.nr * c + 2 * m + 18, x = i => m + (i + 0.5) * c, y = j => m + 18 + (Q.nr - 1 - j + 0.5) * c, L = [];
  L.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#fbf8f2"/>`);
  for (let j = 0; j < Q.nr; j++) for (let i = 0; i < Q.na; i++) { const a = Lb.id(i, j), d = Lb.id((i + 1) % Q.na, j);
    if (Lb.abierto(a, d)) L.push(i + 1 < Q.na ? `<line x1="${x(i)}" y1="${y(j)}" x2="${x(i + 1)}" y2="${y(j)}"/>` : `<line x1="${x(i)}" y1="${y(j)}" x2="${x(i) + c / 2 + m}" y2="${y(j)}"/><line x1="${x(0) - c / 2 - m}" y1="${y(j)}" x2="${x(0)}" y2="${y(j)}"/>`);
    if (j + 1 < Q.nr && Lb.abierto(a, Lb.id(i, j + 1))) L.push(`<line x1="${x(i)}" y1="${y(j)}" x2="${x(i)}" y2="${y(j + 1)}"/>`); }
  L.push(`<line x1="${x(0)}" y1="${y(Q.nr - 1)}" x2="${x(0)}" y2="${m}"/>`);
  const cam = Lb.camino.map(q => x(q.i) + ',' + y(q.j)); let pts = [cam[0]];
  for (let k = 1; k < Lb.camino.length; k++) { const a = Lb.camino[k - 1], b = Lb.camino[k]; if (Math.abs(a.i - b.i) > 1) { pts.push((b.i > a.i ? x(0) - c / 2 - m : x(Q.na - 1) + c / 2 + m) + ',' + y(a.j)); L.push(`<polyline points="${pts.join(' ')}" class="s"/>`); pts = [(b.i > a.i ? x(Q.na - 1) + c / 2 + m : x(0) - c / 2 - m) + ',' + y(b.j)]; } pts.push(cam[k]); }
  pts.push(x(0) + ',' + m); L.push(`<polyline points="${pts.join(' ')}" class="s"/>`);
  L.push(`<circle cx="${x(Lb.meta.i)}" cy="${y(0)}" r="7" fill="#c8102e"/><text x="${x(Lb.meta.i)}" y="${y(0) + 22}" text-anchor="middle">cerrada</text><text x="${x(0)}" y="${m - 4}" text-anchor="middle">salida ↑</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 10}" font-family="Segoe UI,sans-serif" font-size="11" fill="#5c5346"><style>line{stroke:#c9bfae;stroke-width:9;stroke-linecap:round}.s{fill:none;stroke:#c8102e;stroke-width:3.5;stroke-linejoin:round;stroke-linecap:round}</style>${L.join('')}</svg>`;
}
const MOV_T = { sube: 'sube', baja: 'baja', der: 'gira a la derecha', izq: 'gira a la izquierda' };
export const labSolucion = movs => movs.map((m, k) => (m.fin ? 'sube hasta sacarla' : MOV_T[m.que] + (m.que === 'sube' || m.que === 'baja' ? (m.n > 1 ? ' ' + m.n + ' pisos' : ' un piso') : (m.n > 1 ? ' ' + m.n + ' pasos' : ' un paso')))).join(' → ');

// ======================= 🔐 EL CRIPTEX (palabra secreta) =======================
// Un CUERPO (tubo cerrado por un extremo, con una ranura a lo largo, por detrás), los ANILLOS de letras (uno por letra) que giran sobre
// el tubo, un COLLAR a presión que los sujeta, y la CÁMARA (el tubo de dentro, con su pomo) que lleva una PESTAÑA por anillo asomando
// por la ranura. Cerrada, cada pestaña está metida en el canal de su anillo: los anillos giran pero la cámara no sale. Cada anillo tiene
// un PASO (una muesca de lado a lado) debajo de su letra buena: solo con la palabra puesta en la línea, todos los pasos quedan en fila
// sobre la ranura y la cámara sale entera. Además, MUESCAS FALSAS: al tirar con una letra mal, la pestaña se mete 0,9 mm en una muesca
// falsa y el anillo «parece» bueno (así no se adivina al tacto). Cada pestaña tiene la cara que frena PLANA (no se puede forzar) y la
// otra a 45° (se imprime sin soportes). Medidas: la cara de cada letra de 6,4 mm (letras) o 12 (números).
export const ALFABETOS = { letras: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', numeros: '0123456789' };
export const CRX = { CARA: { letras: 6.4, numeros: 12 }, WR: 9, HUECO: 0.3, TW: 4, CA: 0.6, CB: 0.5, WA: 2.2, FALSA: 0.9, EA: 10, WC: 6, G: 0.35 };
// (las tildes se quitan: CANCIÓN → CANCION; la Ñ se queda, que tiene su anillo)
export const crxPalabra = C => { const A = ALFABETOS[C.alfabeto] || ALFABETOS.letras, s = String(C.palabra || '').toUpperCase().replace(/Ñ/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(//g, 'Ñ').split('').filter(ch => A.includes(ch)).join(''); return s.slice(0, 7); };
export function crxMedidas(C) {
  const K = CRX, A = ALFABETOS[C.alfabeto] || ALFABETOS.letras, F = A.length, s = K.CARA[C.alfabeto] || K.CARA.letras, ap = s / (2 * Math.tan(Math.PI / F));
  const r3 = ap - 2.6, rr = r3 - 2.2, r2 = rr - K.G, rbi = r2 - 2, r1 = rbi - K.G, r0 = r1 - 2, RA = ap + 1.5, pal = crxPalabra(C), n = Math.max(1, pal.length);
  const Lt0 = 1.8 + (r3 - 0.4 - r1), sep = Math.max(0.3, Lt0 + 1.2 - (K.WR - K.WA - K.CA)), aR = i => K.EA + sep + i * (K.WR + K.HUECO), /* (sep: la pestaña del primero no puede llegar al fondo) */ aC = aR(n - 1) + K.WR + K.HUECO, fin = aC + K.WC, aK = fin + 0.6, eK = Math.max(12, r0 + 3);
  const aF = i => aR(i) + K.WR - K.WA - K.CA; // la cara plana de la pestaña i (la que frena, hacia la boca)
  return { A, F, s, ap, r0, r1, rbi, r2, rr, r3, RA, pal, n, Lt0, aR, aC, fin, aK, eK, aF, D: 2 * Math.PI / F, largo: aK + eK, sale: aK + eK - K.EA };
}
const extTan = (pts, w) => N.cs([N.ccw(pts)], 'Positive').extrude(w).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, w / 2, 0, 1]); // perfil (x = radio, z = a lo largo) y ancho w en y (sin espejo)
// chaflanes a 45° en los bordes de fuera de una pieza redonda de radio R (abajo en z0, arriba en z1)
const chaflanes = (m, R, z0, z1, ch, abajo = true, arriba = true) => { const L = [], rB = z => R - ch + (z - z0), rT = z => R - (z - (z1 - ch));
  if (abajo) L.push(cilZ(R + 3, z0 - 0.02, z0 + ch, 0, 0, 96).subtract(conoZ(rB(z0 - 0.03), rB(z0 + ch + 0.01), z0 - 0.03, z0 + ch + 0.01, 160)));
  if (arriba) L.push(cilZ(R + 3, z1 - ch, z1 + 0.02, 0, 0, 96).subtract(conoZ(rT(z1 - ch - 0.01), rT(z1 + 0.03), z1 - ch - 0.01, z1 + 0.03, 160)));
  return L.length ? m.subtract(N.union(L)) : m; };
const tabla = (pts, w) => extTan(pts.map(([r, a]) => [r, a]), w);
// la pestaña i, en su sitio de cerrada (en el eje local: Z = a lo largo; la ranura, en +X) y movida «d» hacia la boca
function crxPestana(Q, i, d = 0) { const K = CRX, af = Q.aF(i) + d, rt = Q.r3 - 0.4, L = r => Q.Lt0 - (r - Q.r1);
  return tabla([[Q.r1 - 0.5, af], [rt, af], [rt, af - L(rt)], [Q.r1 - 0.5, af - L(Q.r1 - 0.5)]], K.TW); }
const crxBarrePestana = (Q, i, d0, d1) => M().hull([crxPestana(Q, i, d0), crxPestana(Q, i, d1)]);
// un anillo (en su sitio, con la letra «ver» en la línea de lectura, delante = −X) · sin = sin pasos ni muescas (para ver que gira libre)
function crxAnillo(Q, i, ver, conLetras = true, liso = false, num = true) {
  const K = CRX, a0 = Q.aR(i), a1 = a0 + K.WR, aa = a1 - K.WA, Wg = (Q.Lt0 - (Q.rr - Q.r1)) + K.CA + K.CB, ab = r => aa - Wg + (r - Q.rr);
  const rv = Q.ap / Math.cos(Math.PI / Q.F), giro0 = 180 - 180 / Q.F;
  let an = N.cs([N.poligono2(Q.F, 2 * rv, giro0)], 'Positive').extrude(K.WR).translate([0, 0, a0]);
  an = chaflanes(an, rv, a0, a1, 0.8);
  an = an.subtract(cilZ(Q.rr, a0 - 1, a1 + 1, 0, 0, 160)).subtract(sector([[Q.rr - 0.5, aa], [Q.r3, aa], [Q.r3, ab(Q.r3)], [Q.rr - 0.5, ab(Q.rr - 0.5)]], 0, 2 * Math.PI, 160));
  // la letra k está en la cara a 180° + k·D; el paso (de la letra buena) queda detrás (a 0°) cuando la buena está en la línea
  const code = Q.A.indexOf(Q.pal[i]), fiL = k => Math.PI + k * Q.D;
  if (!liso) {
    const cortes = [], paso = fi => tabla([[Q.rr - 0.5, a0 - 1], [Q.r3 + 0.01, a0 - 1], [Q.r3 + 0.01, a1 + 1], [Q.rr - 0.5, a1 + 1]], K.TW + 0.8).rotate([0, 0, fi * GRAD]);
    cortes.push(paso(fiL(code) - Math.PI));
    // muescas falsas: una de cada tres letras con 27 (si no, la pared se queda en nada) y todas con 10
    for (let k = 0; k < Q.F; k++) { if (k === code || (Q.F > 12 && (k - code + Q.F) % 3)) continue;
      cortes.push(tabla([[Q.rr - 0.5, aa - 0.01], [Q.r3 - 0.2, aa - 0.01], [Q.r3 - 0.2, aa + K.FALSA], [Q.rr - 0.5, aa + K.FALSA]], K.TW + 0.8).rotate([0, 0, (fiL(k) - Math.PI) * GRAD])); }
    an = an.subtract(N.union(cortes));
    // las letras (grabadas 0,6 en cada cara, de pie según se lee) y el número del anillo en su cara de la boca (para montarlos en orden)
    if (conLetras) { const L = []; for (let k = 0; k < Q.F; k++) { const T = texto(Q.A[k], Math.min(5.6, Q.s * 0.74), 1.2); if (!T) break; const f = fiL(k), c = Math.cos(f), s2 = Math.sin(f);
        L.push(T.translate([0, 0, -0.6]).transform([0, 0, 1, 0, s2, -c, 0, 0, c, s2, 0, 0, Q.ap * c, Q.ap * s2, (a0 + a1) / 2, 1])); }
      const nT = num ? texto(num === true ? String(i + 1) : String(num), 3.2, 0.8) : null; // (en la cara de la boca: su número, o la letra que abre) if (nT) L.push(nT.translate([-(Q.rr + Q.r3) / 2 - 1.5, 0, a1 - 0.4]).rotate([0, 0, code * Q.D * GRAD])); // (enfrente del paso: el paso no lo corta)
      if (L.length) an = an.subtract(N.union(L)); }
  }
  // gira para enseñar la letra «ver» en la línea de lectura
  const giro = -(Q.A.indexOf(ver) >= 0 ? Q.A.indexOf(ver) : code) * Q.D;
  return giraZ(an, giro);
}
function crxCuerpo(Q) {
  const K = CRX, ch = 1.2;
  let c = chaflanes(cilZ(Q.RA, 0, K.EA, 0, 0, 160), Q.RA, 0, K.EA, ch);
  c = c.add(cilZ(Q.r2, K.EA - 0.01, Q.fin, 0, 0, 160)).subtract(cilZ(Q.rbi, K.EA, Q.fin + 1, 0, 0, 160));
  const bajo = Q.aF(0) - Q.Lt0 - 1; // la ranura (detrás, +X), de la primera pestaña a la boca
  c = c.subtract(tabla([[Q.rbi - 0.5, bajo], [Q.r2 + 0.5, bajo], [Q.r2 + 0.5, Q.fin + 1], [Q.rbi - 0.5, Q.fin + 1]], K.TW + 0.8));
  c = c.subtract(tabla([[Q.r2 - 0.8, Q.aC - 0.2], [Q.r2 + 0.5, Q.aC - 0.2], [Q.r2 + 0.5, Q.fin + 1], [Q.r2 - 0.8, Q.fin + 1]], 3).rotate([0, 0, 90])); // la muesca de la llave del collar (a un lado)
  c = c.subtract(tabla([[Q.RA - 2.2, K.EA - 3], [Q.RA + 1, K.EA - 3], [Q.RA + 1, K.EA + 1], [Q.RA - 2.2, K.EA + 1]], 2.4).rotate([0, 0, 180])); // la marca de la línea de lectura (delante)
  return c;
}
function crxCollar(Q) {
  const K = CRX, a0 = Q.aC, a1 = Q.fin, R = Q.ap - 0.6;
  let c = cilZ(R, a0, a1, 0, 0, 160).subtract(cilZ(Q.r2 + ENCAJES.presion, a0 - 1, a1 + 1, 0, 0, 160));
  c = chaflanes(c, R, a0, a1, 1, false, true);
  c = c.subtract(tabla([[Q.r2 - 0.5, a0 - 1], [Q.r3 + 0.01, a0 - 1], [Q.r3 + 0.01, a1 + 1], [Q.r2 - 0.5, a1 + 1]], K.TW + 0.8)); // el paso de las pestañas
  c = c.add(tabla([[Q.r2 - 0.6, a0], [Q.r2 + 0.06, a0], [Q.r2 + 0.06, a1], [Q.r2 - 0.6, a1]], 2.4).rotate([0, 0, 90])); // la llave (entra en la muesca del cuerpo: el collar no gira)
  c = c.subtract(tabla([[R - 1.6, a0 - 1], [R + 1, a0 - 1], [R + 1, a1 + 1], [R - 1.6, a1 + 1]], 2).rotate([0, 0, 180])); // la marca de lectura
  return c;
}
function crxCamara(Q) {
  const K = CRX, a0 = K.EA + 0.15, aK = Q.aK, aTop = aK + Q.eK;
  let c = cilZ(Q.r1, a0, aK + 0.01, 0, 0, 160).add(conoZ(Q.r1, Q.RA, aK, aK + (Q.RA - Q.r1), 160)).add(cilZ(Q.RA, aK + (Q.RA - Q.r1) - 0.01, aTop, 0, 0, 160));
  const apice = aTop - 3, cono0 = apice - Q.r0; // el hueco: tubo y techo en cono (45°: sin puente)
  c = c.subtract(cilZ(Q.r0, a0 - 1, cono0 + 0.01, 0, 0, 160)).subtract(conoZ(Q.r0, 0.01, cono0, apice, 160));
  c = chaflanes(c, Q.RA, aK, aTop, 1.2, false, true);
  const n = Math.round(2 * Math.PI * Q.RA / 4.5), es = []; for (let k = 0; k < n; k++) es.push(cilZ(0.8, aK + (Q.RA - Q.r1) + 1, aTop - 1.5, Q.RA + 0.3, 0, 12).rotate([0, 0, k * 360 / n]));
  c = c.subtract(N.union(es));
  for (let i = 0; i < Q.n; i++) c = c.add(crxPestana(Q, i));
  return c;
}
// de local (Z = a lo largo) al mundo: tumbado a lo largo de X, centrado, apoyado en sus pomos
const crxMundo = Q => [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, -Q.largo / 2, 0, Q.RA, 1];
// el revuelto de cada anillo (para la animación y la foto «cerrada»)
const crxRevuelto = (Q, i) => ((i * 7 + 3) % Q.F) || 5;
export function crxConstruye(C) {
  const Q = crxMedidas(C), avisos = [], mec = [];
  if (Q.pal.length < 3) N.mal('La palabra tiene que tener de 3 a 7 ' + (C.alfabeto === 'numeros' ? 'cifras' : 'letras (A–Z y Ñ, sin tildes)') + '.');
  const W = crxMundo(Q), mu = m => m.transform(W);
  const cuerpoL = crxCuerpo(Q), camL = crxCamara(Q), collL = crxCollar(Q), anL = Q.pal.split('').map((ch, i) => crxAnillo(Q, i, ch));
  const sueltas = anL.map((m, i) => ({ id: 'anillo' + i, nombre: 'Anillo ' + (i + 1) + ' (letra ' + Q.pal[i] + ')', m: mu(m), imprimir: N.aLaCama(m.rotate([180, 0, 0])), con: null, nota: 'tumbado, con su número hacia abajo', tapaColor: true }));
  sueltas.push({ id: 'collar', nombre: 'Collar', m: mu(collL), imprimir: N.aLaCama(collL), con: null, nota: 'tumbado · a presión al final, con su llave en la muesca del cuerpo' });
  mec.push({ tipo: 'criptex', Q });
  return { cuerpo: mu(cuerpoL), tapa: mu(camL), sueltas, puertas: [], eje: null, avisos, mec, local: { cuerpo: cuerpoL, camara: camL },
    enigma: { forma: 'criptex', Q: { n: Q.n, F: Q.F, D: Q.D, largo: Q.largo, RA: Q.RA, sale: Q.sale, pal: Q.pal }, combinaciones: Math.pow(Q.F, Q.n) } };
}
export function crxComprueba(C, G) {
  const out = [], ok = (t, d) => out.push({ ok: true, t, d }), mal = (t, d) => out.push({ ok: false, t, d }), ojo = (t, d) => out.push({ ok: null, t, d });
  const Q = crxMedidas(C), K = CRX, toque = (a, b) => { const x = a.intersect(b); return x.isEmpty() ? 0 : x.volume(); };
  const cu = crxCuerpo(Q), co = crxCollar(Q), cam = crxCamara(Q), an = k => Q.pal.split('').map((ch, i) => crxAnillo(Q, i, i === k ? Q.A[(Q.A.indexOf(ch) + 1) % Q.F] : ch, false));
  const buenos = an(-1), fijo = N.union([cu, co].concat(buenos));
  const v0 = toque(cam, fijo) + buenos.reduce((s, a) => s + toque(a, cu) + toque(a, co), 0);
  if (v0 < 0.05) ok('Cerrado, nada se roza', 'La cámara, los ' + Q.n + ' anillos, el collar y el cuerpo, cada uno en su sitio con aire.'); else mal('Cerrado, algo se pisa', v0.toFixed(2) + ' mm³.');
  // con la palabra puesta: las pestañas barridas hasta fuera
  const vb = toque(N.union(Q.pal.split('').map((_, i) => crxBarrePestana(Q, i, 0, Q.sale + 2))), fijo);
  if (vb < 0.05) ok('Con «' + Q.pal + '» en la línea, la cámara sale entera', 'Montado en el ordenador: las ' + Q.n + ' pestañas pasan por los pasos de todos los anillos y del collar sin tocar nada (' + n1(Q.sale) + ' mm).'); else mal('Con la palabra buena, una pestaña roza al sacar la cámara', vb.toFixed(2) + ' mm³.');
  // una letra mal en cualquier anillo → se para (y cuánto deja moverse: la muesca falsa)
  let malas = 0, hasta = 0;
  for (let k = 0; k < Q.n; k++) { const f2 = N.union([cu, co].concat(an(k))); if (toque(N.union(Q.pal.split('').map((_, i) => crxBarrePestana(Q, i, 0, Q.sale + 2))), f2) > 0.05) { malas++; let lo = 0, hi = Q.sale + 2; for (let it = 0; it < 8; it++) { const m = (lo + hi) / 2; if (toque(crxBarrePestana(Q, k, 0, m), f2) > 0.05) hi = m; else lo = m; } hasta = Math.max(hasta, lo); } }
  if (malas === Q.n) ok('Con UNA letra mal (en cualquier anillo), la cámara no sale', 'Comprobado anillo por anillo con la letra de al lado: la pestaña frena con su cara plana a los ' + n1(hasta) + ' mm. Hay ' + Q.F + '^' + Q.n + ' = ' + Math.pow(Q.F, Q.n).toLocaleString('es-ES') + ' combinaciones.'); else mal('Con una letra mal, la cámara sale en ' + (Q.n - malas) + ' anillo(s)', '');
  // los anillos giran libres: el anillo SIN pasos ni muescas (igual en todas las vueltas) no toca ni la pestaña ni el cuerpo
  const vl = Q.pal.split('').reduce((s, ch, i) => { const L = crxAnillo(Q, i, ch, false, true); return s + toque(L, cam) + toque(L, cu); }, 0);
  if (vl < 0.05) ok('Cerrado, cada anillo da la vuelta entera sin rozar', 'Con ' + n1(K.CA) + ' mm de aire delante de la pestaña y ' + n1(K.G) + ' sobre el cuerpo.'); else mal('Un anillo roza al girar', vl.toFixed(2) + ' mm³.');
  ok('Muescas falsas: con una letra mal, al tirar, la pestaña se mete ' + n1(K.FALSA) + ' mm', Q.F > 12 ? 'En una de cada tres letras: el anillo «engancha» como si fuera la buena (así no se adivina al tacto).' : 'En todas las cifras: todas «enganchan» igual (así no se adivina al tacto).');
  if (Q.F > 12 && /[ÑQWXK]/.test(Q.pal)) ojo('La palabra lleva letras poco usadas', 'Está bien (funciona igual); solo es para que lo sepas al venderla.');
  ok('Se imprime sin soportes', 'Cuerpo y cámara de pie; los anillos y el collar tumbados. Las pestañas, el techo de los canales y el pomo, a 45°.');
  return out;
}
// 🛒 para vender el criptex en Cults: UN ANILLO DE CADA LETRA (o cifra), todos iguales menos el paso: así el que lo compra monta la palabra
// que quiera (con tantas letras como este: el cuerpo y la cámara llevan una pestaña por letra). En la cara de la boca, en vez del
// número, la LETRA QUE ABRE (por fuera todos tienen todas las letras: así se distinguen, y esa cara va hacia la boca).
// (DE UNO EN UNO y en su «ámbito»: con todos a la vez, las 10 o 27 letras grabadas de cada anillo dejaban el motor sin memoria)
export const crxLetras = C => crxMedidas(C).A.split('');
export function crxAnilloLetra(C, L) {
  const Q = crxMedidas(C), Q2 = Object.assign({}, Q, { pal: L.repeat(Q.n) });
  return N.enAmbito(() => N.aLaCama(crxAnillo(Q2, 0, L, true, false, L).rotate([180, 0, 0])));
}
export function crxPiezas(C, G) {
  const L = [{ nombre: 'Cuerpo', m: N.aLaCama(G.local.cuerpo), color: C.color, como: 'de pie, la tapa del fondo en la cama' }, { nombre: 'Cámara (con su pomo)', m: N.aLaCama(G.local.camara), color: C.colorTapa, como: 'de pie, la boca abierta en la cama' }];
  G.sueltas.forEach(s => L.push({ nombre: s.nombre, m: s.imprimir, color: s.tapaColor ? (C.colorDet || C.colorTapa) : C.color, como: s.nota }));
  return L;
}
function crxPose(C, G, u) {
  const Q = G.enigma.Q, D = {}, e = (t, a, b) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  for (let i = 0; i < Q.n; i++) { const a = crxRevuelto(Q, i) * Q.D * (1 - e(u, 0.04 + i * 0.05, 0.22 + i * 0.05)), c = Math.cos(a), s = Math.sin(a), zc = Q.RA; // gira alrededor de X (el eje del criptex, a la altura RA)
    D['anillo' + i] = [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, zc * s, zc - zc * c, 1]; }
  D.tapa = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, e(u, 0.6, 1) * (Q.sale + 12), 0, 0, 1];
  return D;
}

// ======================= 🧩 LA CAJA JAPONESA DE PASOS (himitsu-bako) =======================
// Parece una caja de tablas cerrada por todas partes. Se abre con 4 movimientos escondidos, cada uno libera el siguiente:
//  1) el PANEL IZQUIERDO sube (3–4 mm): su diente sale de la muesca de la TABLA del fondo;
//  2) la TABLA del fondo (va en una cola de milano por debajo) corre hacia la izquierda 5,5 mm: deja sin apoyo el panel derecho;
//  3) el PANEL DERECHO baja solo (4,6 mm): su borde de arriba queda por debajo de la tapa;
//  4) la TAPA corre hacia la derecha y sale.
// Para cerrar, al revés. Topes: la tapa no deja sacar el panel izquierdo (un diente de la tapa entra en una muesca del panel), un tetón de
// la tabla frena en el diente del panel izquierdo (la tabla corre justo 5,5 mm), la pestaña de la tapa no deja subir el panel derecho.
// Las juntas de lo que se mueve caen en las rayas de las «tablas»: no se ve dónde está el truco. Aire: 0,3 en lo que corre.
export const SEC = { PR: 5, LIP: 2.5, TP: 4.5, E: 1.6, C: 0.3, HB: 12, HF: 7, W0: 12, W1: 18, NL: 3, TG: 5, LT: 1.8, WT: 8, DD: 1.5, BH: 2.2, PASO: 12 };
export function secMedidas(C) {
  const K = SEC, L = C.L, W = C.W, H = C.H, xRo = L / 2 - K.LIP, xRi = xRo - K.TP, xLo = -L / 2 + K.LIP, xLi = xLo + K.TP, yI = W / 2 - K.PR, yP = yI + K.E - K.C;
  const sF = K.TP + 1, sL = K.NL + 0.9, dR = K.TG - K.LT + 0.8, zL = K.HF + K.C; // zL = el borde de abajo del panel izquierdo (cerrado)
  return { L, W, H, xRo, xRi, xLo, xLi, yI, yP, sF, sL, dR, zL, zT: H - K.TG };
}
// la cola de milano de la tabla (perfil y-z): ancha arriba, estrecha abajo (no se cae); el canal, igual con aire
// (canal: flancos a 45° que en z = 0 miden W0; la tabla, lo mismo apartado c en perpendicular, y 0,4 por encima de la mesa)
const secCola = (K, c) => { if (!c) { const a = K.W0 / 2 - 0.5, b = (K.W1 - K.W0) / 2; return [[-a, -0.5], [a, -0.5], [K.W1 / 2, b], [K.W1 / 2, K.HF + K.C], [-K.W1 / 2, K.HF + K.C], [-K.W1 / 2, b]]; }
  const a = K.W0 / 2 + 0.4 - c * Math.SQRT2, zb = (K.W1 - K.W0) / 2 - c + c * Math.SQRT2; return [[-a, 0.4], [a, 0.4], [K.W1 / 2 - c, zb], [K.W1 / 2 - c, K.HF], [-(K.W1 / 2 - c), K.HF], [-(K.W1 / 2 - c), zb]]; };
const perfX = (pts, x0, x1) => N.cs([N.ccw(pts)], 'Positive').extrude(x1 - x0).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1]); // perfil (y, z) a lo largo de X
export function secConstruye(C) {
  const K = SEC, Q = secMedidas(C), { L, W, H } = Q, c = K.C;
  if (L < 90 || W < 60 || H < 45) N.mal('Muy pequeña para el mecanismo: al menos 90 × 60 × 45 mm.');
  // ---- el CUERPO: base gruesa + las paredes de delante y de detrás (los extremos los cierran los paneles) ----
  let cu = cubo(-L / 2, L / 2, -W / 2, W / 2, 0, K.HB).add(cubo(-L / 2, L / 2, -W / 2, -Q.yI, 0, H)).add(cubo(-L / 2, L / 2, Q.yI, W / 2, 0, H));
  const menos = [];
  menos.push(cubo(Q.xLi, Q.xRi, -Q.yI, Q.yI, K.HB, H + 1)); // el hueco
  [[Q.xRi, Q.xRo], [Q.xLo, Q.xLi]].forEach(([a, b]) => menos.push(cubo(a - c, b + c, -Q.yI - K.E, Q.yI + K.E, -1, H + 1))); // las ranuras de los paneles (hasta abajo; los paneles apoyan en lo que se deja)
  // lo que queda debajo de cada panel: a la derecha, el suelo del bolsillo donde cae (HF − dR); a la izquierda, donde apoya (zL)
  const sueloR = cubo(Q.xRi - c - 0.01, Q.xRo + c + 0.01, -Q.yI - K.E - 0.01, Q.yI + K.E + 0.01, 0, K.HF - Q.dR), sueloL = cubo(Q.xLo - c - 0.01, Q.xLi + c + 0.01, -Q.yI - K.E - 0.01, Q.yI + K.E + 0.01, 0, Q.zL);
  // la ranura de la tapa (cola de milano a 45° en las dos paredes), abierta a la derecha
  const colaT = s => perfX([[s * (Q.yI - 0.01), Q.zT - c], [s * (Q.yI + K.DD + c * (1 + Math.SQRT2)), Q.zT - c], [s * (Q.yI + c), Q.zT + K.DD + c * (Math.SQRT2 - 1)], [s * (Q.yI + c), H + 1], [s * (Q.yI - 0.01), H + 1]], Q.xLi - 0.5, L / 2 + 1);
  menos.push(colaT(1), colaT(-1));
  // el canal de la tabla (por debajo, de punta a punta) y, encima, el de su tetón
  menos.push(perfX(secCola(K, 0), -L / 2 - 1, L / 2 + 1));
  menos.push(cubo(Q.xLi - 0.2, Q.xLi + 0.4 + Q.sF + 3 + 0.6, -K.WT / 2 - 0.5, K.WT / 2 + 0.5, K.HF, K.HF + K.BH + c));
  cu = cu.subtract(N.union(menos)).add(sueloR.subtract(perfX(secCola(K, 0), -L / 2 - 1, L / 2 + 1))).add(sueloL.subtract(perfX(secCola(K, 0), -L / 2 - 1, L / 2 + 1)));
  // ---- la TAPA: cola de milano a los lados; pestaña de 1,8 sobre el panel derecho; diente a la izquierda (sujeta el panel izquierdo) ----
  let tapa = perfX([[-(Q.yI + K.DD), Q.zT], [Q.yI + K.DD, Q.zT], [Q.yI, Q.zT + K.DD], [Q.yI, H], [-Q.yI, H], [-Q.yI, Q.zT + K.DD]], Q.xLi + c, Q.xRi - c);
  tapa = tapa.add(cubo(Q.xLi + c, Q.xRo, -Q.yI, Q.yI, H - K.LT, H)); // la pestaña (encima del panel derecho)
  // el diente de la izquierda: abajo plano (es el que frena al panel) y arriba a 45° (la tapa se imprime boca abajo: así no cuelga)
  const dz0 = Q.zT + 0.3, dy = Q.yI - 8, xd = Q.xLi + c;
  tapa = tapa.add(tabla([[xd + 0.01, dz0], [xd - 2, dz0], [xd - 2, dz0 + 0.8], [xd + 0.01, dz0 + 2.81]], 2 * dy));
  // ---- los PANELES (de pie en sus ranuras) ----
  const pD = cubo(Q.xRi, Q.xRo, -Q.yP, Q.yP, K.HF + 0.05, H - K.LT - 0.05); // el derecho, cerrado: apoya en la tabla
  let pI = cubo(Q.xLo, Q.xLi, -Q.yP, Q.yP, Q.zL + 0.05, H - 0.05);
  pI = pI.add(cubo(Q.xLo, Q.xLi, -K.WT / 2, K.WT / 2, Q.zL - K.NL, Q.zL + 0.06)); // su diente (entra en la muesca de la tabla)
  pI = pI.subtract(cubo(Q.xLi - 2 - c, Q.xLi + 1, -dy - c, dy + c, dz0 - Q.sL, dz0 + 2.8 + c)); // la muesca donde entra el diente de la tapa (deja subir sL)
  // ---- la TABLA del fondo: cola de milano, muesca para el diente del panel izquierdo y tetón de tope ----
  let tb = perfX(secCola(K, c), -L / 2, Q.xRo);
  tb = tb.subtract(cubo(Q.xLo - 0.4, Q.xLi + 0.4, -K.WT / 2 - 0.4, K.WT / 2 + 0.4, Q.zL - K.NL - 0.4, K.HF + 1));
  const xb = Q.xLi + 0.4 + Q.sF; tb = tb.add(cubo(xb, xb + 3, -K.WT / 2, K.WT / 2, K.HF - 0.01, K.HF + K.BH));
  // ---- el acabado de tablas (rayas de 0,6): las juntas de lo que se mueve caen en ellas ----
  const ray = [], P = K.PASO;
  for (let z = K.HB; z < H - 4; z += P) [-1, 1].forEach(s => ray.push(s > 0 ? cubo(-L / 2 - 1, L / 2 + 1, W / 2 - 0.5, W / 2 + 1, z - 0.3, z + 0.3) : cubo(-L / 2 - 1, L / 2 + 1, -W / 2 - 1, -W / 2 + 0.5, z - 0.3, z + 0.3)));
  for (let y = K.W0 / 2; y < W / 2 - 3; y += P) [-1, 1].forEach(s => ray.push(cubo(-L / 2 - 1, L / 2 + 1, s * y - 0.3, s * y + 0.3, -1, 0.5)));
  cu = cu.subtract(N.union(ray));
  const rayT = []; for (let y = 0; y < Q.yI - 3; y += P) [-1, 1].forEach(s => { if (y || s > 0) rayT.push(cubo(-L / 2, L / 2, s * y - 0.3, s * y + 0.3, H - 0.5, H + 1)); }); tapa = tapa.subtract(N.union(rayT));
  const rayP = (x0, x1) => { const R2 = []; for (let z = K.HB; z < H - 4; z += P) R2.push(cubo(x0, x1, -Q.yP - 1, Q.yP + 1, z - 0.3, z + 0.3)); return N.union(R2); };
  const pDf = pD.subtract(rayP(Q.xRo - 0.5, Q.xRo + 1)), pIf = pI.subtract(rayP(Q.xLo - 1, Q.xLo + 0.5));
  const sueltas = [
    { id: 'panelI', nombre: 'Panel izquierdo', m: pIf, imprimir: N.aLaCama(pIf.rotate([0, -90, 0])), con: null, nota: 'tumbado, la cara de fuera en la cama', tapaColor: true },
    { id: 'panelD', nombre: 'Panel derecho', m: pDf, imprimir: N.aLaCama(pDf.rotate([0, 90, 0])), con: null, nota: 'tumbado, la cara de fuera en la cama', tapaColor: true },
    { id: 'tabla', nombre: 'Tabla del fondo', m: tb, imprimir: N.aLaCama(tb), con: null, nota: 'tumbada, como va (lo ancho arriba)' }];
  return { cuerpo: cu, tapa, sueltas, puertas: [], eje: null, avisos: [], mec: [{ tipo: 'secuencia', Q }], local: { tapa },
    enigma: { forma: 'secuencia', Q: { sF: Q.sF, sL: Q.sL, dR: Q.dR, L: Q.L }, pasos: 4 } };
}
// los 4 pasos: [ id de la pieza, dirección, recorrido ]
const SEC_PASOS = Q => [['panelI', [0, 0, 1], Q.sL - 0.15], ['tabla', [-1, 0, 0], Q.sF], ['panelD', [0, 0, -1], Q.dR - 0.1], ['tapa', [1, 0, 0], Q.L + 4]];
export function secComprueba(C, G) {
  const out = [], ok = (t, d) => out.push({ ok: true, t, d }), mal = (t, d) => out.push({ ok: false, t, d });
  const Q = secMedidas(C), toque = (a, b) => { const x = a.intersect(b); return x.isEmpty() ? 0 : x.volume(); };
  const pz = { tapa: G.tapa }; G.sueltas.forEach(s => { pz[s.id] = s.m; });
  const pos = { panelI: 0, tabla: 0, panelD: 0, tapa: 0 }, PS = SEC_PASOS(Q), en = (id, d) => { const P = PS.find(p => p[0] === id); return d ? pz[id].translate(P[1].map(v => v * d)) : pz[id]; };
  const resto = id => N.union([G.cuerpo].concat(Object.keys(pz).filter(k => k !== id).map(k => en(k, pos[k]))));
  // cerrada: nada se pisa
  let v0 = 0; const ks = Object.keys(pz); ks.forEach((a, i) => { v0 += toque(pz[a], G.cuerpo); ks.slice(i + 1).forEach(b => { v0 += toque(pz[a], pz[b]); }); });
  if (v0 < 0.05) ok('Cerrada, ninguna pieza roza', 'La tapa, los dos paneles y la tabla del fondo, cada uno en su ranura con ' + n1(SEC.C) + ' mm de aire.'); else mal('Cerrada, algo se pisa', v0.toFixed(2) + ' mm³.');
  // ¿se puede mover «id» un poco ahora? (de 0,25 en 0,25 hasta «hasta»)
  const mueve = (id, hasta, paso = 0.25) => { const R = resto(id); for (let d = paso; d <= hasta + 1e-9; d += d < 8 ? paso : 2) { if (toque(en(id, pos[id] + d), R) > 0.05) return d - paso; } return hasta; };
  const T = { panelI: '1) Subir el panel izquierdo', tabla: '2) Correr la tabla del fondo a la izquierda', panelD: '3) Bajar el panel derecho', tapa: '4) Sacar la tapa por la derecha' };
  // fuera de orden: cada paso, antes de hacer los anteriores, NO se puede
  const fuera = PS.slice(1).map(([id]) => { const m = mueve(id, 2); return m < 0.6 ? null : T[id] + ' (se mueve ' + n1(m) + ' mm)'; }).filter(Boolean);
  if (!fuera.length) ok('Fuera de orden no se abre', 'Sin el paso anterior, la tabla, el panel derecho y la tapa no se mueven (ni medio milímetro).'); else mal('Hay un paso que se puede saltar', fuera.join(' · '));
  // en orden: cada paso se hace entero, y lo que no se debe pasar, no se pasa
  PS.forEach(([id, , d]) => { const m = mueve(id, d); if (m >= d - 0.01) { ok(T[id] + ': ' + (id === 'tapa' ? 'sale entera' : n1(d) + ' mm'), 'Montada en el ordenador, de 0,25 en 0,25 mm: no toca nada.'); pos[id] = d; } else { mal(T[id] + ': se para a ' + n1(m) + ' mm', 'Algo choca.'); pos[id] = m; } });
  pos.panelI = 0; pos.tabla = 0; pos.panelD = 0; pos.tapa = 0;
  const tope = mueve('panelI', Q.sL + 3); if (tope < Q.sL + 1) ok('El panel izquierdo no se puede sacar', 'Sube ' + n1(tope) + ' mm y la tapa lo frena.'); else mal('El panel izquierdo se sale por arriba', '');
  pos.panelI = Q.sL - 0.15; const tt = mueve('tabla', Q.sF + 4); if (tt < Q.sF + 1) ok('La tabla corre solo lo justo', n1(tt) + ' mm y su tetón frena en el diente del panel.'); else mal('La tabla se puede sacar del todo', '');
  ok('4 movimientos escondidos', 'Las juntas caen en las rayas de las tablas: por fuera no se ve qué se mueve.');
  ok('Se imprime sin soportes', 'Caja de pie, tapa boca abajo, paneles tumbados y la tabla como va. Las colas de milano a 45°; el canal de la tabla, un puente de ' + SEC.W1 + ' mm.');
  return out;
}
export function secPiezas(C, G) {
  const L = [{ nombre: 'Caja', m: N.aLaCama(G.cuerpo), color: C.color, como: 'de pie, como se usa' }, { nombre: 'Tapa', m: N.aLaCama(G.tapa.rotate([180, 0, 0])), color: C.colorTapa, como: 'boca abajo' }];
  G.sueltas.forEach(s => L.push({ nombre: s.nombre, m: s.imprimir, color: s.tapaColor ? C.colorTapa : C.color, como: s.nota }));
  return L;
}
function secPose(C, G, u) {
  const Q = G.enigma.Q, D = {}, e = (t, a, b) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); }, tr = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  const sI = (Q.sL - 0.15) * e(u, 0.02, 0.16) - (Q.sL - 0.15 - (SEC.NL - SEC.C)) * e(u, 0.42, 0.5); // sube, y al correr la tabla apoya en ella
  D.panelI = tr(0, 0, sI); D.tabla = tr(-Q.sF * e(u, 0.2, 0.4), 0, 0); D.panelD = tr(0, 0, -(Q.dR - 0.1) * e(u, 0.46, 0.56)); D.tapa = tr((Q.L * 0.75) * e(u, 0.62, 1), 0, 0);
  return D;
}

// ======================= LO COMÚN: lo que cajas.js y la pantalla llaman =======================
export function construye(C) {
  if (C.forma === 'laberinto') return labConstruye(C);
  if (C.forma === 'criptex') return crxConstruye(C);
  if (C.forma === 'secuencia') return secConstruye(C);
  N.mal('No conozco esta caja enigma.');
}
export function comprueba(C) {
  const out = { lista: [], apertura: -1, puertas: [], cierre: null };
  try { const G = construye(C); G.avisos.forEach(a => out.lista.push({ ok: false, t: 'Ojo', d: a }));
    if (C.forma === 'laberinto') out.lista.push(...labComprueba(C, G));
    if (C.forma === 'criptex') out.lista.push(...crxComprueba(C, G));
    if (C.forma === 'secuencia') out.lista.push(...secComprueba(C, G));
    out.piezas = piezasDe(C, G).map(p => p.nombre); out.enigma = Object.assign({}, G.enigma, { P: undefined });
  } catch (e) { out.lista.push({ ok: false, t: 'No se ha podido montar', d: e.message || String(e) }); }
  finally { N.limpia(); }
  return out;
}
export function piezasDe(C, G) { G = G || construye(C); if (C.forma === 'laberinto') return labPiezas(C, G); if (C.forma === 'criptex') return crxPiezas(C, G); if (C.forma === 'secuencia') return secPiezas(C, G); return []; }
export function pose(C, G, u) { if (C.forma === 'criptex') return crxPose(C, G, u); if (C.forma === 'secuencia') return secPose(C, G, u); const D = {}; if (C.forma === 'laberinto') D.tapa = labPose(G, u); return D; }
// lo que se puede animar: { k, t, ids (las piezas que mueve) }
export function movibles(C) {
  if (C.forma === 'laberinto') return [{ k: 'tapa', t: '🌀 La tapa sigue el camino escondido', ids: ['tapa'] }, { k: 'ver', t: '👻 Ver el camino (tapa transparente)', apagado: true, ids: [] }];
  if (C.forma === 'criptex') { const n = crxPalabra(C).length; return [{ k: 'anillos', t: '🔤 Los anillos buscan la palabra', ids: Array.from({ length: n }, (_, i) => 'anillo' + i) }, { k: 'tapa', t: '🔐 La cámara sale', ids: ['tapa'] }]; }
  if (C.forma === 'secuencia') return [{ k: 'paneles', t: '🧩 Los paneles y la tabla (pasos 1 a 3)', ids: ['panelI', 'tabla', 'panelD'] }, { k: 'tapa', t: '↔️ La tapa sale (paso 4)', ids: ['tapa'] }];
  return [];
}
export function medidas(C) {
  if (C.forma === 'laberinto') return { L: C.D, W: C.D, H: C.H };
  if (C.forma === 'criptex') { const Q = crxMedidas(C); return { L: Q.largo, W: 2 * Q.RA, H: 2 * Q.RA, alto: Q.largo }; } // (de pie, la pieza más alta es la cámara)
  return { L: C.L, W: C.W, H: C.H };
}
export const altoTotal = C => medidas(C).H;
export function revisa(C) {
  const I = IMPRESORAS[C.impresora] || IMPRESORAS.p1p, out = [], Md = medidas(C);
  if (Md.L > I.cama - 6 || Md.W > I.cama - 6) out.push({ t: 'No cabe en la cama de tu ' + I.t + ' (' + n1(Md.L) + ' × ' + n1(Md.W) + ' mm).', arreglo: 'medidas' });
  if ((Md.alto || Md.H) > I.alto - 2) out.push({ t: 'Mide ' + n1(Md.alto || Md.H) + ' mm de alto: más de lo que imprime tu ' + I.t + '.', arreglo: 'medidas' });
  if (C.forma === 'laberinto') { const Q = labMedidas(C); if (Q.nr < 3) out.push({ t: 'Muy baja para un laberinto: con ' + n1(C.H) + ' mm caben ' + Q.nr + ' filas (hacen falta 3).', arreglo: 'medidas' }); if (Q.Rc < 10) out.push({ t: 'Muy estrecha: el hueco de dentro se queda en ' + n1(2 * Q.Rc) + ' mm.', arreglo: 'medidas' }); }
  if (C.forma === 'criptex') { const p = crxPalabra(C), A = C.alfabeto === 'numeros'; if (p.length < 3) out.push({ t: 'La palabra tiene que tener de 3 a 7 ' + (A ? 'cifras' : 'letras') + ' (ahora: «' + p + '»).', arreglo: 'palabra' }); }
  if (C.forma === 'secuencia' && (C.L < 90 || C.W < 60 || C.H < 45)) out.push({ t: 'Muy pequeña para el mecanismo: al menos 90 × 60 × 45 mm.', arreglo: 'medidas' });
  return out;
}
export function arreglaTodo(C0) {
  const C = JSON.parse(JSON.stringify(C0)), I = IMPRESORAS[C.impresora] || IMPRESORAS.p1p, hechos = [];
  if (C.forma === 'laberinto') {
    if (C.D > I.cama - 6) { C.D = I.cama - 6; hechos.push('Diámetro ajustado a tu ' + I.t + ': ' + C.D + ' mm.'); }
    if (C.H > I.alto - 2) { C.H = I.alto - 2; hechos.push('Alto ajustado a ' + C.H + ' mm.'); }
    let Q = labMedidas(C); while (Q.Rc < 10 && C.D < I.cama - 6) { C.D++; Q = labMedidas(C); } if (Q.Rc >= 10 && C.D !== C0.D) hechos.push('Diámetro subido a ' + C.D + ' mm (el hueco de dentro tiene que tener al menos 20).');
    while (Q.nr < 3 && C.H < I.alto - 2) { C.H++; Q = labMedidas(C); } if (C.H !== C0.H && Q.nr >= 3) hechos.push('Alto subido a ' + C.H + ' mm (hacen falta 3 filas de laberinto).');
  }
  if (C.forma === 'criptex') { const p = crxPalabra(C); if (p !== String(C.palabra || '')) { C.palabra = p.length >= 3 ? p : (C.alfabeto === 'numeros' ? '1234' : 'AMOR'); hechos.push('Palabra: «' + C.palabra + '» (solo ' + (C.alfabeto === 'numeros' ? 'cifras' : 'letras A–Z y Ñ, sin tildes') + ', de 3 a 7).'); }
    while (crxMedidas(C).largo > I.alto - 2 && C.palabra.length > 3) { C.palabra = C.palabra.slice(0, -1); hechos.push('Palabra acortada a «' + C.palabra + '» (si no, la cámara no cabe de pie en tu ' + I.t + ').'); } }
  if (C.forma === 'secuencia') { [['L', 90, I.cama - 6], ['W', 60, I.cama - 6], ['H', 45, I.alto - 2]].forEach(([k, mi, ma]) => { const v = Math.max(mi, Math.min(ma, C[k])); if (v !== C[k]) { C[k] = v; hechos.push({ L: 'Largo', W: 'Ancho', H: 'Alto' }[k] + ' a ' + v + ' mm.'); } }); }
  return { C, hechos };
}
export function resumen(C) {
  if (C.forma === 'laberinto') { const Q = labMedidas(C); return 'Ø' + n1(C.D) + ' × ' + n1(C.H) + ' mm · laberinto nº ' + C.semilla + ' (' + Q.niv.t + ')' + (C.hucha === 'si' ? ' · 🐷 hucha' : '') + ' · hueco Ø' + n1(2 * Q.Rc) + ' × ' + n1(Q.zTop - LAB.FONDO) + ' mm'; }
  if (C.forma === 'criptex') { const Q = crxMedidas(C); return n1(Q.largo) + ' × Ø' + n1(2 * Q.RA) + ' mm · ' + Q.n + ' anillos · hueco Ø' + n1(2 * Q.r0) + ' × ' + n1(Q.aK - CRX.EA) + ' mm'; }
  if (C.forma === 'secuencia') { const Q = secMedidas(C); return n1(C.L) + ' × ' + n1(C.W) + ' × ' + n1(C.H) + ' mm · 4 pasos escondidos · hueco ' + n1(Q.xRi - Q.xLi) + ' × ' + n1(2 * Q.yI) + ' × ' + n1(Q.zT - SEC.HB) + ' mm'; }
  return FORMAS[C.forma] ? FORMAS[C.forma].t : '';
}
const SEC_SOLUCION = ['1) sube el panel de la IZQUIERDA unos 4 mm (empujándolo con el pulgar) y sujétalo', '2) corre la tabla del FONDO hacia la izquierda (asoma 5 mm)', '3) baja el panel de la DERECHA (cae solo con un toque)', '4) desliza la tapa hacia la derecha'];
// el secreto (para la columna de la derecha): lo que hay que hacer para abrirla
export function secreto(C) {
  if (C.forma === 'laberinto') { const Q = labDatos(C), mv = labMovimientos(Q.Lb); return { t: 'Laberinto nº ' + C.semilla + ': ' + mv.length + ' movimientos', d: 'Desde cerrada: ' + labSolucion(mv) + '.' }; }
  if (C.forma === 'criptex') { const Q = crxMedidas(C); return { t: 'Palabra: ' + Q.pal, d: 'Pon «' + Q.pal + '» en la línea de las marcas y tira del pomo. ' + Q.F + '^' + Q.n + ' = ' + Math.pow(Q.F, Q.n).toLocaleString('es-ES') + ' combinaciones.' }; }
  if (C.forma === 'secuencia') return { t: '4 pasos', d: SEC_SOLUCION.join(' → ') + '.' };
  return null;
}
// 📄 el manual · M = { piezas, pasos, consejos, cuidados, herramientas, edad, solucion?: { t, txt, svg? } } (la solución va en hoja APARTE)
export function manual(C) {
  const cuidados = ['Lejos del calor (coche al sol, radiador, lavavajillas): el plástico se ablanda a partir de unos 55 °C.', 'Límpiala con un paño húmedo, sin disolventes.', 'No la fuerces: si algo no pasa, vuelve un paso atrás.'];
  if (C.forma === 'laberinto') {
    const Q = labDatos(C), mv = labMovimientos(Q.Lb);
    return { piezas: [['Cuerpo con el laberinto', 1, 'el vaso'], ['Tapa', 1, 'con dos pivotes por dentro']], herramientas: 'Ninguna.', edad: C.nivel === 'facil' ? 'Para todas las edades.' : 'Para mayores de 8 años.',
      pasos: ['Para MONTARLA (si la imprimes tú): mete la tapa por arriba girándola hasta que los pivotes entren en la ranura de la salida, y haz el camino al revés hasta abajo del todo. Así queda CERRADA.', 'Para ABRIRLA, sujeta la base con una mano y la tapa con la otra. Gira la tapa y súbela o bájala SIN FORZAR: los pivotes de dentro van por un camino escondido.', 'Cuando algo no deje pasar, prueba otra dirección: hay ' + mv.length + ' movimientos hasta la salida.', 'Al llegar arriba del todo, la tapa sale entera.'].concat(C.hucha === 'si' ? ['🐷 Es una HUCHA: echa las monedas por la ranura de arriba (caben hasta las de 2 €). Para sacarlas, hay que abrir el laberinto.'] : []),
      consejos: ['Para regalar dinero, una tarjeta o una joya: quien lo recibe tiene que «ganárselo».', 'Girar «a la derecha» = como las agujas del reloj, mirándola desde arriba.'], cuidados,
      solucion: { t: 'Solución · laberinto nº ' + C.semilla + ' (para ti: no la regales)', txt: 'Desde cerrada: ' + labSolucion(mv) + '. (Derecha = como las agujas del reloj, mirándola desde arriba.)', svg: labMapa(C) } };
  }
  if (C.forma === 'criptex') {
    const Q = crxMedidas(C), num = C.alfabeto === 'numeros';
    return { piezas: [['Cuerpo', 1, 'el tubo con el tope del fondo'], ['Anillos de ' + (num ? 'números' : 'letras'), Q.n, 'numerados del 1 al ' + Q.n + ' en una cara'], ['Collar', 1, 'el aro que los sujeta'], ['Cámara', 1, 'con su pomo: aquí va el secreto']], herramientas: 'Una gota de pegamento para el collar (si queda flojo).', edad: 'Para mayores de 8 años (piezas pequeñas).',
      pasos: ['Mete los anillos en el cuerpo por la boca, en orden (el 1 primero, hasta el fondo), con su NÚMERO mirando hacia la boca.', 'Encaja el collar a presión al final, con su llavecita en la muesca del cuerpo (que coincidan las marcas de la línea de lectura).', 'Gira los anillos hasta leer la PALABRA SECRETA en la línea de las marcas (la tienes en la hoja de la solución).', 'Mete la cámara con sus pestañas por la ranura de detrás del cuerpo, hasta el fondo.', 'Desordena los anillos: ya está cerrado. Para ABRIR: pon la palabra secreta en la línea y tira del pomo.'],
      consejos: ['Ideal para regalar dinero enrollado, un anillo o una nota: el hueco mide Ø' + n1(2 * Q.r0) + ' × ' + n1(Q.aK - CRX.EA) + ' mm.', 'Gira los anillos con el criptex TUMBADO: así corren mejor.', 'Con los anillos de todas las ' + (num ? 'cifras' : 'letras') + ' (los que llevan grabada en una cara la ' + (num ? 'cifra' : 'letra') + ' que abre): coge los de tu palabra y móntalos en su orden, la primera al fondo y esa cara hacia la boca.', 'Apunta la palabra en un sitio seguro.'], cuidados,
      solucion: { t: 'Palabra del criptex (para ti)', txt: 'La palabra es «' + Q.pal + '». ' + Q.F + '^' + Q.n + ' = ' + Math.pow(Q.F, Q.n).toLocaleString('es-ES') + ' combinaciones.' } };
  }
  if (C.forma === 'secuencia') {
    return { piezas: [['Caja', 1, 'con la base gruesa'], ['Tapa', 1, 'corredera'], ['Panel izquierdo', 1, 'con un diente abajo'], ['Panel derecho', 1, 'liso'], ['Tabla del fondo', 1, 'en cola de milano']], herramientas: 'Ninguna: se monta con las manos.', edad: 'Para mayores de 10 años: es un rompecabezas.',
      pasos: ['Mete la tabla del fondo por debajo de la caja, por la izquierda, hasta que quede a ras (el tetón hacia arriba y hacia la derecha).', 'Baja el panel izquierdo por sus ranuras hasta que su diente entre en la muesca de la tabla.', 'Baja el panel derecho por sus ranuras: apoya en la tabla.', 'Mete la tapa por la derecha, deslizándola hasta el fondo: su diente entra en el panel izquierdo. Ya está cerrada.', 'Para abrirla hay que descubrir 4 movimientos escondidos, en orden. Si te rindes, mira la solución (va aparte).'],
      consejos: ['Es una caja rompecabezas: el que la recibe tiene que descubrir el truco.', 'Ningún paso necesita fuerza: si algo no se mueve, todavía no le toca.'], cuidados,
      solucion: { t: 'Solución de la caja japonesa (dóblala y no la mires)', txt: SEC_SOLUCION.join('. ') + '. Para cerrar: al revés (tapa dentro; sube el panel derecho; corre la tabla a la derecha; baja el izquierdo).' } };
  }
  return { piezas: [], pasos: [], consejos: [], cuidados, herramientas: '', edad: '' };
}
