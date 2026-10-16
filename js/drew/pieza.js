// ================= 👗 CelebriDREW · LA PIEZA DE PATRÓN y la PRENDA (modelo de datos + operaciones) =================
// Una PIEZA es un objeto geométrico independiente, en mm:
//   puntos   { id: { x, y, n } }                         · los puntos con nombre (HPS, sisa, bajo…)
//   contorno [{ id, a, b, c1?, c2? }]                     · tramos seguidos y CERRADOS, a izquierdas; c1/c2 = tiradores de la curva
//                                                          RELATIVOS a su punto (c1 a «a», c2 a «b»): al mover un punto, su curva le sigue
//   bordes   [{ id, n, tramos: [ids], tipo }]             · trozos con nombre del contorno: 'costura' · 'bajo' · 'remate' (canto vuelto o con bies)
//                                                          · 'doblez' · 'abierto' · 'aplicado' (bolsillo que se pespuntea encima)
//                                                          (cubren el contorno entero, en orden; las patas de las pinzas no van en ninguno)
//   pinzas   [{ id, tramos: [pata1, pata2], vertice }]   · la pinza abierta en el contorno (sus dos patas miden lo mismo)
//   internas [{ id, tipo, pts, n }]                       · 'hilo' (línea de hilo) · 'bolsillo' · 'linea' · 'boton' · 'centro'
//   piquetes [{ id, borde, d, n }]                        · a «d» mm del principio del borde; n = 1 o 2 marcas
//   margen   { def, borde: { id: mm } }                   · margen de costura por borde (el doblez lleva 0)
//   corte    { n, espejo, doblez }                        · cuántas se cortan, si una es en espejo, y el borde que va al doblez de la tela
//   meta     { origen, estado, confianza, notas }         · de dónde sale: 'observado' (foto) · 'inferido' (modelo) · 'confirmar'
// La PRENDA junta las piezas y sus COSTURAS: { a: { pieza, borde, inv }, b: {…}, ratio, tol, tipo } (ratio = lo que mide b / lo que mide a:
// 1 si son iguales; 0,8 en un cuello de punto que se estira al coser). Todo en JSON: se guarda, se versiona y se compara.
import * as G from './geom.js';

let cont = 0;
export const nid = (p = 'x') => p + Date.now().toString(36) + (cont++).toString(36);

// ---------- construir (lo usan las plantillas) ----------
// Cada pieza se escribe con coordenadas ABSOLUTAS (y tiradores absolutos) y aquí se guarda como debe.
export function constructor(nombre, extra = {}) {
  const pz = Object.assign({ id: nid('pz'), nombre, puntos: {}, contorno: [], bordes: [], pinzas: [], internas: [], piquetes: [], margen: { def: 10, borde: {} }, corte: { n: 1, espejo: false, doblez: null }, material: null, talla: null, meta: { origen: 'plantilla', estado: 'inferido', confianza: 1, notas: [] } }, extra);
  const B = {
    pz,
    p(id, x, y, n) { pz.puntos[id] = { x, y, n: n || id }; return id; },
    // un tramo de «a» a «b»; c1 y c2 ABSOLUTOS (si se dan, es curva)
    t(id, a, b, c1, c2) { const A = pz.puntos[a], Bp = pz.puntos[b], tr = { id, a, b }; if (c1 && c2) { tr.c1 = [c1[0] - A.x, c1[1] - A.y]; tr.c2 = [c2[0] - Bp.x, c2[1] - Bp.y]; } pz.contorno.push(tr); return id; },
    borde(id, n, tramos, tipo = 'costura', margen) { pz.bordes.push({ id, n, tramos, tipo }); if (margen != null) pz.margen.borde[id] = margen; return id; },
    pinza(id, pata1, pata2, vertice) { pz.pinzas.push({ id, tramos: [pata1, pata2], vertice }); },
    interna(tipo, pts, n) { pz.internas.push({ id: nid('in'), tipo, pts, n: n || '' }); },
    piquete(borde, d, n = 1) { pz.piquetes.push({ id: nid('pq'), borde, d, n }); },
    hilo(a, b) { pz.internas.push({ id: 'hilo', tipo: 'hilo', pts: [a, b], n: 'Línea de hilo' }); },
  };
  return B;
}

// ---------- leer la geometría ----------
export const P = (pz, id) => { const q = pz.puntos[id]; return [q.x, q.y]; };
export function tramoGeo(pz, tr) { const a = P(pz, tr.a), b = P(pz, tr.b); return tr.c1 ? { a, b, c1: G.suma(a, tr.c1), c2: G.suma(b, tr.c2) } : { a, b }; }
export const tramoPorId = (pz, id) => pz.contorno.find(t => t.id === id);
export const bordePorId = (pz, id) => pz.bordes.find(b => b.id === id);
export function tramosDe(pz, bid, inv = false) { const B = bordePorId(pz, bid); if (!B) return null; const L = B.tramos.map(id => tramoGeo(pz, tramoPorId(pz, id))); return inv ? L.reverse().map(G.tramoInverso) : L; }
export const bordeLargo = (pz, bid) => { const L = tramosDe(pz, bid); return L ? G.cadenaLargo(L) : NaN; };
export const bordePolilinea = (pz, bid, inv = false, tol) => G.cadenaAplana(tramosDe(pz, bid, inv) || [], tol);
// la línea de COSTURA (el contorno), aplanada; cerrada (sin repetir el primer punto)
export function contorno(pz, tol) { const L = G.cadenaAplana(pz.contorno.map(t => tramoGeo(pz, t)), tol); L.pop(); return L; }
export const area = pz => G.area(contorno(pz));
export const caja = pz => G.caja(contorno(pz));
export const pinzaDe = (pz, tid) => pz.pinzas.find(z => z.tramos.includes(tid));
export const margenDe = (pz, bid) => { const B = bordePorId(pz, bid); if (B && B.tipo === 'doblez') return 0; const v = pz.margen.borde[bid]; return v != null ? v : pz.margen.def; };
export const bordeDeTramo = (pz, tid) => pz.bordes.find(b => b.tramos.includes(tid));
// un piquete en el plano: dónde y hacia dónde mira (hacia fuera)
export function piqueteEn(pz, q) { const L = tramosDe(pz, q.borde); if (!L) return null; const { p, tg } = G.cadenaEnLargo(L, q.d); return { p, fuera: [tg[1], -tg[0]], tg }; }
// la pieza ENTERA (si se corta al doblez: la mitad y su espejo) como polígono, para el 3D y para comparar con la foto
export function entera(pz, tol) {
  if (!pz.corte.doblez) return contorno(pz, tol);
  const B = bordePorId(pz, pz.corte.doblez), n = pz.contorno.length, idx = B.tramos.map(id => pz.contorno.findIndex(t => t.id === id));
  const ult = idx[idx.length - 1], resto = []; for (let k = 1; k < n - idx.length + 1; k++) resto.push(pz.contorno[(ult + k) % n]);
  const L = G.cadenaAplana(resto.map(t => tramoGeo(pz, t)), tol), a = L[L.length - 1], b = L[0]; // de la punta final del doblez (b) a la inicial (a)
  const d = G.norma(G.sub(b, a)), refl = p => { const v = G.sub(p, a), k = G.punto(v, d); return G.suma(a, G.sub(G.esc(d, 2 * k), v)); };
  return L.concat(L.slice(1, -1).reverse().map(refl));
}

// ---------- EDITAR (todas devuelven la pieza cambiada; quien llama valida y guarda en el historial) ----------
export function muevePunto(pz, id, dx, dy) { const q = pz.puntos[id]; if (!q) throw new Error('No existe el punto ' + id); q.x += dx; q.y += dy; return pz; }
export function ponPunto(pz, id, x, y) { const q = pz.puntos[id]; if (!q) throw new Error('No existe el punto ' + id); q.x = x; q.y = y; return pz; }
// mover un tirador (k = 'c1' o 'c2') a una posición absoluta
export function ponTirador(pz, tid, k, x, y) { const t = tramoPorId(pz, tid); if (!t || !t.c1) throw new Error('Ese tramo es recto: no tiene tiradores.'); const ancla = k === 'c1' ? P(pz, t.a) : P(pz, t.b); t[k] = [x - ancla[0], y - ancla[1]]; return pz; }
// recta ↔ curva
export function aCurva(pz, tid) { const t = tramoPorId(pz, tid); if (t.c1) return pz; const a = P(pz, t.a), b = P(pz, t.b), d = G.sub(b, a); t.c1 = G.esc(d, 1 / 3); t.c2 = G.esc(d, -1 / 3); return pz; }
export function aRecta(pz, tid) { const t = tramoPorId(pz, tid); delete t.c1; delete t.c2; return pz; }
// AÑADIR un punto: parte el tramo a «s» mm de su principio (la curva sigue igual)
export function partirTramo(pz, tid, s, nombre, pidDado, t2Dado) { // (los ids se pueden dar: así la edición se repite igual al volver a trazar)
  const i = pz.contorno.findIndex(t => t.id === tid); if (i < 0) throw new Error('No existe el tramo'); const t = pz.contorno[i], g = tramoGeo(pz, t), L = G.tramoLargo(g);
  if (!(s > 0.5 && s < L - 0.5)) throw new Error('El punto tiene que caer dentro del tramo (a más de 0,5 mm de sus puntas).');
  const [m1, m2] = G.tramoParte(g, s), pid = pidDado || nid('p'), t2 = t2Dado || nid('t'); pz.puntos[pid] = { x: m1.b[0], y: m1.b[1], n: nombre || 'punto' };
  const A = { id: t.id, a: t.a, b: pid }, B = { id: t2, a: pid, b: t.b };
  if (m1.c1) { A.c1 = G.sub(m1.c1, m1.a); A.c2 = G.sub(m1.c2, m1.b); B.c1 = G.sub(m2.c1, m2.a); B.c2 = G.sub(m2.c2, m2.b); }
  pz.contorno.splice(i, 1, A, B);
  pz.bordes.forEach(b => { const k = b.tramos.indexOf(t.id); if (k >= 0) b.tramos.splice(k + 1, 0, t2); });
  // los piquetes siguen en su sitio (se miden por el borde, que no cambia)
  return pid;
}
// QUITAR un punto: une sus dos tramos en uno (curva si alguno lo era)
export function quitarPunto(pz, pid) {
  const n = pz.contorno.length, i = pz.contorno.findIndex(t => t.b === pid); if (i < 0) throw new Error('No existe ese punto en el contorno'); if (n <= 3) throw new Error('Una pieza necesita al menos 3 puntos.');
  const A = pz.contorno[i], B = pz.contorno[(i + 1) % n]; if (pinzaDe(pz, A.id) || pinzaDe(pz, B.id)) throw new Error('Es un punto de una pinza: quita antes la pinza.');
  const bA = bordeDeTramo(pz, A.id), bB = bordeDeTramo(pz, B.id); if (bA !== bB) throw new Error('Es la esquina entre dos bordes (' + (bA ? bA.n : '?') + ' y ' + (bB ? bB.n : '?') + '): no se puede quitar.');
  const nuevo = { id: A.id, a: A.a, b: B.b }; if (A.c1 || B.c1) { const ga = tramoGeo(pz, A), gb = tramoGeo(pz, B); nuevo.c1 = G.sub(ga.c1 || G.lerp(ga.a, ga.b, 1 / 3), ga.a); nuevo.c2 = G.sub(gb.c2 || G.lerp(gb.a, gb.b, 2 / 3), gb.b); }
  pz.contorno.splice(i, 1, nuevo); pz.contorno.splice(pz.contorno.indexOf(B), 1); bB.tramos = bB.tramos.filter(x => x !== B.id); delete pz.puntos[pid]; return pz;
}
// alargar / acortar un borde recto moviendo su punto final a lo largo de él
export function largoBordeRecto(pz, bid, mm) { const B = bordePorId(pz, bid); if (!B || B.tramos.length !== 1) throw new Error('Solo en bordes de un tramo.'); const t = tramoPorId(pz, B.tramos[0]); if (t.c1) throw new Error('Solo en bordes rectos.'); const a = P(pz, t.a), b = P(pz, t.b), d = G.norma(G.sub(b, a)); return ponPunto(pz, t.b, a[0] + d[0] * mm, a[1] + d[1] * mm); }
export const mueveTodo = (pz, dx, dy) => { Object.values(pz.puntos).forEach(q => { q.x += dx; q.y += dy; }); pz.internas.forEach(i => { i.pts = i.pts.map(p => [p[0] + dx, p[1] + dy]); }); return pz; };
// la pieza en espejo (para la otra mitad de una prenda): contorno al revés para seguir a izquierdas
export function espejo(pz, nombre) {
  const c = JSON.parse(JSON.stringify(pz)); c.id = nid('pz'); c.nombre = nombre || pz.nombre + ' (espejo)';
  Object.values(c.puntos).forEach(q => { q.x = -q.x; }); c.internas.forEach(i => { i.pts = i.pts.map(p => [-p[0], p[1]]); });
  c.contorno = c.contorno.slice().reverse().map(t => { const r = { id: t.id, a: t.b, b: t.a }; if (t.c1) { r.c1 = [-t.c2[0], t.c2[1]]; r.c2 = [-t.c1[0], t.c1[1]]; } return r; });
  c.bordes.forEach(b => { b.tramos = b.tramos.slice().reverse(); });
  // los piquetes se miden ahora desde la otra punta
  const L0 = Object.fromEntries(pz.bordes.map(b => [b.id, bordeLargo(pz, b.id)])); c.piquetes.forEach(q => { q.d = L0[q.borde] - q.d; });
  return c;
}
export const copia = x => JSON.parse(JSON.stringify(x));
// resumen de una pieza (para el panel de propiedades)
export function datos(pz) {
  const C = contorno(pz), A = G.area(C), b = G.caja(C);
  return { area: A, perimetro: G.perimetro(C), ancho: b.w, alto: b.h, bordes: pz.bordes.map(B => ({ id: B.id, n: B.n, tipo: B.tipo, largo: bordeLargo(pz, B.id), margen: margenDe(pz, B.id) })), puntos: Object.keys(pz.puntos).length };
}
