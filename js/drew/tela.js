// ================= 👗 CelebriDREW · LA TELA EN 3D: colocar, coser y dejar caer =================
// Como en CLO3D: cada pieza del patrón se hace malla (malla2d.js), se COLOCA alrededor del cuerpo (tronco, brazos, piernas, cuello…
// como sus «puntos de colocación»), las COSTURAS tiran de las dos orillas punto con punto hasta cerrarlas, y la GRAVEDAD la deja caer
// sobre el maniquí, que no se puede atravesar. Simulación por posiciones (XPBD en pasos pequeños, estable con cualquier tela):
//   · estirar  (cada lado de la malla quiere medir lo que mide en el patrón; el punto cede más que el tejido plano)
//   · doblar   (entre los dos vértices opuestos de cada lado interior: la caída y las arrugas)
//   · coser    (las orillas de una costura se juntan; al principio poco a poco, como al ir cosiendo)
//   · pegar    (lo «aplicado», como el bolsillo canguro, va pespunteado ENCIMA de su pieza)
//   · el cuerpo y el suelo no se atraviesan; la tela tampoco se atraviesa a sí misma (separación mínima entre piezas)
// Lo que se mide de verdad: cuánto se estira cada punto (MAPA DE AJUSTE), cuánto queda abierta cada costura y si algo atraviesa el cuerpo.
import * as G from './geom.js';
import * as Z from './pieza.js';
import { contornoMalla, mallaDe } from './malla2d.js';
import { muestra } from './avatar.js';

// ---------- las TELAS (lo que cambia la caída) ----------
// estira = cuánto cede al estirar (0 = nada, 1 = punto muy elástico) · dobla = rigidez al doblar · gm2 = gramos por m² · roce = con la piel
export const TELAS = {
  // tope = lo MÁXIMO que da al estirar (fracción): una tela plana apenas cede; el punto, bastante; la lycra, mucho
  punto: { t: 'Punto (camiseta, algodón)', tope: 0.3, estira: 0.35, dobla: 0.06, gm2: 170, roce: 0.45, color: '#e9e6df' },
  felpa: { tope: 0.18, t: 'Felpa (sudadera)', estira: 0.25, dobla: 0.14, gm2: 300, roce: 0.5, color: '#9aa3ad' },
  rib: { tope: 0.6, t: 'Canalé / rib (puños, cuellos)', estira: 0.6, dobla: 0.08, gm2: 230, roce: 0.5, color: '#d9d4cc' },
  algodon: { tope: 0.05, t: 'Algodón plano (camisa)', estira: 0.04, dobla: 0.12, gm2: 120, roce: 0.4, color: '#f2efe8' },
  denim: { tope: 0.04, t: 'Vaquero (denim)', estira: 0.03, dobla: 0.45, gm2: 380, roce: 0.55, color: '#3f5a7d' },
  gabardina: { tope: 0.05, t: 'Gabardina / sarga', estira: 0.03, dobla: 0.3, gm2: 260, roce: 0.5, color: '#b59b74' },
  seda: { tope: 0.04, t: 'Seda / satén', estira: 0.02, dobla: 0.015, gm2: 80, roce: 0.15, color: '#d8c3d6' },
  lino: { tope: 0.04, t: 'Lino', estira: 0.02, dobla: 0.18, gm2: 180, roce: 0.45, color: '#d7cdb8' },
  elastica: { tope: 1.0, t: 'Lycra / muy elástica', estira: 0.85, dobla: 0.03, gm2: 200, roce: 0.6, color: '#2d2d33' },
  // 16-10 (ella: «seda, poliéster, algodón, polipiel, cuero, satén, organza…»). Valores TÍPICOS de cada tejido (aproximados: cada rollo varía)
  saten: { tope: 0.03, t: 'Satén', estira: 0.02, dobla: 0.03, gm2: 110, roce: 0.12, color: '#c9a0b6' },
  poliester: { tope: 0.06, t: 'Poliéster', estira: 0.05, dobla: 0.08, gm2: 120, roce: 0.3, color: '#9aa3ad' },
  organza: { tope: 0.02, t: 'Organza (transparente)', estira: 0.01, dobla: 0.07, gm2: 40, roce: 0.2, color: '#f2d0c4' },
  lana: { tope: 0.35, t: 'Punto grueso de lana', estira: 0.4, dobla: 0.25, gm2: 500, roce: 0.6, color: '#d96c4f' },
  polipiel: { tope: 0.08, t: 'Polipiel', estira: 0.06, dobla: 0.6, gm2: 450, roce: 0.6, color: '#1f1f24' },
  cuero: { tope: 0.03, t: 'Cuero', estira: 0.02, dobla: 0.9, gm2: 900, roce: 0.6, color: '#7a2b3a' },
  ante: { tope: 0.04, t: 'Ante', estira: 0.03, dobla: 0.6, gm2: 700, roce: 0.7, color: '#b59b74' },
};
export const telaPorDefecto = prenda => (prenda.tejido === 'punto' ? (prenda.bloque && prenda.bloque.k === 'sudadera' ? 'felpa' : 'punto') : prenda.bloque && prenda.bloque.k === 'pantalon' ? 'denim' : 'gabardina');

// ---------- dónde se COLOCA cada pieza (por plantilla y nombre) ----------
// zona: tronco | brazo | pierna | anillo | cabeza | aplicado · cara: delante | detras · ancla: qué altura del cuerpo coge el punto más alto
function colocacion(k, pz, prenda) {
  const n = pz.nombre, M = (prenda.bloque && prenda.bloque.medidas) || {};
  if (k === 'camiseta' || k === 'sudadera') {
    // (17-10) el delantero EN DOS PIEZAS (cremallera) también va delante y colgado del hombro (antes caía «por defecto» a la altura del pecho y la
    //  sudadera con cremallera se caía); el CUELLO ALTO es un anillo en el cuello como la tira; los anillos cortados en dos, cada mitad a su lado
    const partida = !pz.corte.doblez && !!pz.corte.espejo && (pz.corte.n || 1) === 2;
    if (n === 'Delantero' || /^Delantero \(/.test(n)) return { zona: 'tronco', cara: 'delante', ancla: 'hombro' };
    if (n === 'Espalda') return { zona: 'tronco', cara: 'detras', ancla: 'hombro' };
    if (n === 'Manga') return { zona: 'brazo' };
    if (n === 'Tira del cuello' || n === 'Cuello alto') return { zona: 'anillo', en: 'cuello', baja: [n === 'Cuello alto' ? Math.min(M.bajadaDel || 80, 45) : (M.bajadaDel || 80), M.bajadaEsp || 20], mitad: partida };
    if (n === 'Capucha') return { zona: 'cabeza' };
    if (n === 'Puño') return { zona: 'anillo', en: 'muneca' };
    if (n === 'Cintura') return { zona: 'anillo', en: 'bajo', largo: M.largo, mitad: partida };
    // (17-10) el canguro, a la ALTURA que marca el patrón en el delantero (antes, siempre pegado al borde de abajo: sin cintura elástica quedaba
    //  sobre el bajo suelto y la prenda temblaba sin parar de colocarse)
    if (n === 'Bolsillo canguro') { const del = (prenda.piezas || []).find(p => /^Delantero/.test(p.nombre)), it = del && del.internas.find(i => i.tipo === 'bolsillo'), y0 = it ? Math.min(...it.pts.map(q => q[1])) : 0;
      return { zona: 'aplicado', sobre: 'Delantero', dy: it ? Math.max(0, y0 - Math.min(...Object.values(del.puntos).map(q => q.y))) : 0 }; }
  }
  if (k === 'falda') {
    if (n === 'Delantero') return { zona: 'tronco', cara: 'delante', ancla: 'cintura' };
    if (n === 'Espalda') return { zona: 'tronco', cara: 'detras', ancla: 'cintura' };
    if (n === 'Cinturilla') return { zona: 'anillo', en: 'cintura' };
  }
  if (k === 'vestido') {
    if (n === 'Cuerpo delantero') return { zona: 'tronco', cara: 'delante', ancla: 'hombro' };
    if (n === 'Cuerpo espalda') return { zona: 'tronco', cara: 'detras', ancla: 'hombro' };
    if (n === 'Falda delantera') return { zona: 'tronco', cara: 'delante', ancla: 'cintura' };
    if (n === 'Falda espalda') return { zona: 'tronco', cara: 'detras', ancla: 'cintura' };
    if (n === 'Manga') return { zona: 'brazo' };
  }
  if (k === 'pantalon') {
    if (n === 'Delantero') return { zona: 'pierna', cara: 'delante' };
    if (n === 'Espalda') return { zona: 'pierna', cara: 'detras' };
    if (/^Cinturilla/.test(n)) return { zona: 'anillo', en: 'cintura', mitad: true };
  }
  return { zona: 'tronco', cara: 'delante', ancla: 'pecho' };
}

// ---------- montar el MODELO: piezas → mallas → copias (izquierda/derecha) → puntos 3D, lados, costuras ----------
// o = { h (mm, lado de la malla; 20 como CLO), tela: clave de TELAS o { piezaNombre: clave } }
export function monta(prenda, C, R, o = {}) {
  const h = o.h || 20, k = (prenda.bloque && prenda.bloque.k) || '', avisos = [];
  // 1) contornos por pieza y cuántos puntos lleva cada borde (los dos lados de una costura, los mismos)
  const CM = new Map(); prenda.piezas.forEach(pz => CM.set(pz.id, contornoMalla(pz)));
  // (un borde puede venir en TROZOS: la cintura entre pinza y pinza; se reparte como una sola orilla, cada trozo según lo que mide)
  const nB = new Map(), clave = (pid, bid) => pid + '/' + bid, raiz = new Map(), find = x => { while (raiz.get(x) !== x) x = raiz.get(x); return x; };
  const totB = new Map(); // largo total de cada borde (sus trozos de la mitad original)
  CM.forEach((m, pid) => m.C.forEach(c => { const q = c.pinza ? clave(pid, 'p:' + c.pinza) : clave(pid, c.borde || c.key); raiz.set(q, q); c.grupo = q; if (!c.key.endsWith('|m')) totB.set(q, (totB.get(q) || 0) + G.polilineaLargo(c.pts)); }));
  (prenda.costuras || []).forEach(s => { const a = clave(s.a.pieza, s.a.borde), b = clave(s.b.pieza, s.b.borde); if (raiz.has(a) && raiz.has(b)) raiz.set(find(a), find(b)); });
  totB.forEach((L, q) => { const g = find(q), cs = []; CM.forEach(m => m.C.forEach(c => { if (c.grupo === q && c.pinza && !c.key.endsWith('|m')) cs.push(c); })); const Lr = cs.length ? Math.max(...cs.map(c => G.polilineaLargo(c.pts))) : L; nB.set(g, Math.max(nB.get(g) || 1, Math.max(1, Math.round(Lr / (0.8 * h))))); });
  CM.forEach(m => { const porB = new Map(); m.C.forEach(c => { if (c.key.endsWith('|m')) return; if (c.pinza) { c.n = nB.get(find(c.grupo)); c.sub = 0; return; } (porB.get(c.grupo) || porB.set(c.grupo, []).get(c.grupo)).push(c); }); // (las dos patas de una pinza, cada una con TODOS los puntos)
    porB.forEach((L, q) => { const N = nB.get(find(q)), T = L.reduce((x, c) => x + G.polilineaLargo(c.pts), 0), ex = L.map(c => N * G.polilineaLargo(c.pts) / T);
      const n = ex.map(x => Math.max(1, Math.floor(x))); let falta = N - n.reduce((x, y) => x + y, 0); const ord = ex.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
      for (let k = 0; falta > 0 && k < ord.length * 4; k++) { n[ord[k % ord.length][1]]++; falta--; } L.forEach((c, i) => { c.n = n[i]; c.sub = i; }); });
    m.C.forEach(c => { if (!c.key.endsWith('|m')) return; const o = m.C.find(x => !x.key.endsWith('|m') && x.key === c.key.slice(0, -2) && Math.abs(G.polilineaLargo(x.pts) - G.polilineaLargo(c.pts)) < 0.01 && x.n != null && !x.usado); if (o) { o.usado = true; c.n = o.n; c.sub = o.sub; } });
    m.C.forEach(c => { delete c.usado; if (c.n == null) { c.n = Math.max(1, Math.round(G.polilineaLargo(c.pts) / (0.8 * h))); c.sub = 0; } }); });
  // 2) mallas
  const piezas = [];
  prenda.piezas.forEach(pz => { const m = CM.get(pz.id), caja = G.caja(m.C.flatMap(c => c.pts)), hl = Math.max(6, Math.min(h, Math.min(caja.w, caja.h) / 2.2));
    const M = mallaDe(m.C, hl); if (M.faltan) avisos.push(pz.nombre + ': ' + M.faltan + ' tramo(s) del contorno sin lado en la malla.');
    piezas.push({ pz, m, M, col: colocacion(k, pz, prenda) }); });
  // 3) copias y su colocación
  const P = []; // paneles
  const copias = it => { const pz = it.pz; if (pz.corte.doblez) return [{ copia: 'e' }]; if ((pz.corte.n || 1) >= 2) return [{ copia: 'o' }, { copia: 'm' }]; return [{ copia: 'o', sola: true }]; };
  piezas.forEach(it => copias(it).forEach(cp => P.push(Object.assign({ it, pz: it.pz }, cp))));
  // las posiciones 3D de cada panel
  const ctx = { C, prenda, h, piezas, anchoTronco: Math.max(200, ...piezas.filter(it => it.col.zona === 'tronco').map(it => { const c = G.caja(it.M.P.slice(0, it.M.nb)); return it.pz.corte.doblez ? c.w / 2 : c.w; })) };
  P.forEach(p => colocaPanel(p, ctx));
  // 4) todo junto: vértices, triángulos, lados, flexión
  let N = 0; P.forEach(p => { p.off = N; p.n = p.it.M.P.length; N += p.n; });
  const pos = new Float32Array(3 * N), uv = new Float32Array(2 * N), panelDe = new Uint16Array(N), w = new Float32Array(N), tri = [];
  P.forEach((p, ip) => { const M = p.it.M; for (let i = 0; i < p.n; i++) { const g = p.off + i; pos.set(p.x3[i], 3 * g); uv[2 * g] = p.espejoUV ? -M.P[i][0] : M.P[i][0]; uv[2 * g + 1] = M.P[i][1]; panelDe[g] = ip; }
    p.tri = M.T.map(([a, b, c]) => (p.giraTri ? [p.off + a, p.off + c, p.off + b] : [p.off + a, p.off + b, p.off + c])); p.tri.forEach(t => tri.push(...t)); });
  // masas (gramos → por punto: tela × área de sus triángulos / 3)
  const telaDe = p => { const t = typeof o.tela === 'string' ? o.tela : (o.tela && o.tela[p.pz.nombre]) || (prenda.tejido === 'punto' && /Puño|Cintura|Tira del cuello/.test(p.pz.nombre) ? 'rib' : telaPorDefecto(prenda)); return TELAS[t] ? t : 'punto'; };
  P.forEach(p => { p.tela = telaDe(p); });
  const masa = new Float32Array(N);
  P.forEach(p => { const T = TELAS[p.tela]; p.tri.forEach(([a, b, c]) => { const A = Math.abs(G.cruz(G.sub(uvp(uv, b), uvp(uv, a)), G.sub(uvp(uv, c), uvp(uv, a)))) / 2 / 1e6 * T.gm2 / 1000; [a, b, c].forEach(q => { masa[q] += A / 3; }); }); });
  for (let i = 0; i < N; i++) w[i] = masa[i] > 0 ? 1 / masa[i] : 0;
  // lados (estirar) y flexión (los dos opuestos de cada lado interior)
  const ladoMap = new Map(), E = [], F = [];
  P.forEach((p, ip) => p.tri.forEach(([a, b, c]) => [[a, b, c], [b, c, a], [c, a, b]].forEach(([i, j, op]) => { const kk = i < j ? i * N + j : j * N + i; const x = ladoMap.get(kk); if (x == null) { ladoMap.set(kk, E.length); E.push({ i, j, op, panel: ip }); } else if (E[x].op2 == null) E[x].op2 = op; })));
  const ar = new Uint32Array(2 * E.length), arL = new Float32Array(E.length), arK = new Float32Array(E.length), arT = new Float32Array(E.length);
  // ENTRETELA (16-10): la cinturilla de una prenda de tela plana va entretelada: casi no da de sí y es firme. Sin esto se estiraba como la
  // tela, la falda resbalaba 7 cm por la cadera, tiraba de la cremallera y se giraba
  const entretela = ip => prenda.tejido !== 'punto' && /^Cinturilla/.test(P[ip].pz.nombre);
  E.forEach((e, q) => { ar[2 * q] = e.i; ar[2 * q + 1] = e.j; arL[q] = G.dist(uvp(uv, e.i), uvp(uv, e.j)); const T = TELAS[P[e.panel].tela], en = entretela(e.panel); arK[q] = Math.min(0.85, 1 - (en ? 0.01 : T.estira) * 0.9); /* (16-10: con la malla fina, 0,97 hacía vibrar los bajos para siempre; lo que no se estira lo asegura el TOPE) */ arT[q] = arL[q] * (1 + (en ? 0.006 : T.tope != null ? T.tope : 0.2)); if (e.op2 != null) F.push([e.op, e.op2, e.panel]); });
  const fl = new Uint32Array(2 * F.length), flL = new Float32Array(F.length), flK = new Float32Array(F.length);
  // (18-10) el CANTO DE LA CARA de la capucha va vuelto (la jareta del cordón, 3 cm): dos capas de tela, mucho más firme al doblar. Sin esto
  //  el canto se arrugaba en picos alrededor de la cara. (De una tela doble, la rigidez al doblar es varias veces la de una sola.)
  const firme = new Uint8Array(N);
  P.forEach(p => { if (p.pz.nombre !== 'Capucha' || !p.pz.bordes.some(b => b.id === 'cara')) return; const L = Z.bordePolilinea(p.pz, 'cara'), m = Z.margenDe(p.pz, 'cara') || 30;
    for (let i = 0; i < p.n; i++) { const r = G.distAPolilinea(p.it.M.P[i], L); if ((r && r.d != null ? r.d : r) < m) firme[p.off + i] = 1; } });
  F.forEach(([a, b, ip], q) => { fl[2 * q] = a; fl[2 * q + 1] = b; flL[q] = G.dist(uvp(uv, a), uvp(uv, b)); const dob = TELAS[P[ip].tela].dobla; flK[q] = entretela(ip) ? Math.max(0.6, dob) : firme[a] && firme[b] ? Math.max(0.5, 4 * dob) : dob; });
  // UNIONES DE LARGO ALCANCE (16-10): el tope de estirar se cumplía de vecino a vecino, pero en una tira larga los estirones pequeños se
  // SUMABAN (una cinturilla de 71 cm acababa en 79 y la falda resbalaba por la cadera). Cada punto se ata también a otros a ~5 lados de
  // malla en su pieza: entre ellos, como mucho el largo del PATRÓN + lo que da de sí la tela (en 3D, siempre más corto o igual). Lycra, no.
  const lr = [], lrT = [];
  P.forEach((p, ip) => { const T = TELAS[p.tela], tp = entretela(ip) ? 0.006 : (T.tope != null ? T.tope : 0.2); if (tp > 0.5) return;
    const cel = 2 * h, mapa = new Map(), key = (a, b) => a * 100003 + b;
    for (let i = p.off; i < p.off + p.n; i++) { const kk = key(Math.floor(uv[2 * i] / cel), Math.floor(uv[2 * i + 1] / cel)); (mapa.get(kk) || mapa.set(kk, []).get(kk)).push(i); }
    const cerca = (u, v) => { const cu = Math.floor(u / cel), cv = Math.floor(v / cel); let b = -1, bd = cel * cel; for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) { const L = mapa.get(key(cu + a, cv + c)); if (L) for (const j of L) { const d = (uv[2 * j] - u) ** 2 + (uv[2 * j + 1] - v) ** 2; if (d < bd) { bd = d; b = j; } } } return b; };
    const DL = 5 * h;
    for (let i = p.off; i < p.off + p.n; i++) for (const [du, dv] of [[DL, 0], [0, DL], [DL * 0.7, DL * 0.7], [DL * 0.7, -DL * 0.7]]) { const j = cerca(uv[2 * i] + du, uv[2 * i + 1] + dv); if (j < 0 || j === i) continue;
      const L = Math.hypot(uv[2 * j] - uv[2 * i], uv[2 * j + 1] - uv[2 * i + 1]); if (L < 3 * h) continue; lr.push(i, j); lrT.push(L * (1 + tp)); } });
  // 5) COSTURAS: orilla con orilla, del mismo lado del cuerpo (las «espejo», la izquierda con la derecha)
  const orillas = []; // { pieza, borde, lado, idx (en el sentido ORIGINAL del borde), sub (trozo) }
  P.forEach(p => p.it.m.C.forEach(c => { const ids = c.idx.map(i => p.off + i), dir = c.key.endsWith('|m') ? ids.slice().reverse() : ids;
    const lado = p.copia === 'e' ? (c.key.endsWith('|m') ? p.ladoM : p.ladoO) : p.lado; orillas.push({ panel: p, pieza: p.pz.id, borde: c.borde, pinza: c.pinza, pata: c.pata, lado, idx: dir, sub: c.sub || 0 }); }));
  // la orilla ENTERA de un borde en un lado: sus trozos en orden; donde se juntan dos trozos (la boca de una pinza) van dos puntos juntos
  const orilla = (pid, bid, lado) => { const L = orillas.filter(x => x.pieza === pid && x.borde === bid && !x.pinza && (lado == null || x.lado === lado)).sort((a, b) => a.sub - b.sub); if (!L.length) return null;
    const sl = []; L.forEach((x, k) => x.idx.forEach((v, j) => { if (k > 0 && j === 0) sl[sl.length - 1].push(v); else sl.push([v]); })); return { lado: L[0].lado, panel: L[0].panel, slots: sl }; };
  const pares = [], cos3 = [];
  (prenda.costuras || []).forEach(s => {
    const lados = [...new Set(orillas.filter(x => x.pieza === s.a.pieza && x.borde === s.a.borde).map(x => x.lado))], lista = [];
    if (s.tipo === 'espejo') { const I = orilla(s.a.pieza, s.a.borde, 'I'), D = orilla(s.a.pieza, s.a.borde, 'D'); if (I && D) lista.push([I, D]); }
    else lados.forEach(l => { const a = orilla(s.a.pieza, s.a.borde, l), b = orilla(s.b.pieza, s.b.borde, l); if (a && b) lista.push([a, b]); });
    if (!lista.length) avisos.push('Costura «' + s.n + '»: no encuentro sus dos orillas en 3D.');
    lista.forEach(([a, b]) => { const ia = a.slots.slice(), ib = b.slots.slice(); if (s.a.inv) ia.reverse(); if (s.b.inv) ib.reverse();
      if (ia.length !== ib.length) { avisos.push('Costura «' + s.n + '»: ' + ia.length + ' y ' + ib.length + ' puntos (no casan).'); return; }
      const c0 = pares.length / 2; ia.forEach((X, q) => X.forEach(x => ib[q].forEach(y => { if (x !== y) pares.push(x, y); }))); cos3.push({ id: s.id, n: s.n, lado: a.lado, desde: c0, hasta: pares.length / 2 }); }); });
  // las pinzas se cierran (pata con pata, desde la boca hasta la punta)
  P.forEach(p => { const Ls = orillas.filter(x => x.panel === p && x.pinza); const g = {}; Ls.forEach(x => { (g[x.pinza] = g[x.pinza] || []).push(x); });
    Object.values(g).forEach(L => { for (let q = 0; q + 1 < L.length; q += 2) { const a = L[q].pata === 0 ? L[q] : L[q + 1], b = L[q].pata === 0 ? L[q + 1] : L[q]; const ia = a.idx, ib = b.idx.slice().reverse(); if (ia.length !== ib.length) continue; const c0 = pares.length / 2; ia.forEach((x, j) => { if (x !== ib[j]) pares.push(x, ib[j]); }); cos3.push({ id: 'pinza', n: 'Pinza de ' + p.pz.nombre, lado: p.lado, desde: c0, hasta: pares.length / 2 }); } }); });
  // 6) lo APLICADO (bolsillo): sus orillas pespunteadas se pegan al triángulo de su pieza que está debajo, en el mismo sitio del patrón
  const pegados = [];
  P.filter(p => p.col.zona === 'aplicado').forEach(p => { const base = P.find(q => (q.pz.nombre === p.col.sobre || q.pz.nombre.startsWith(p.col.sobre + ' (')) && (q.copia === 'e' || q.lado === p.lado)); if (!base) { avisos.push(p.pz.nombre + ': no encuentro «' + p.col.sobre + '» para pegarlo.'); return; }
    orillas.filter(x => x.panel === p && x.borde && (Z.bordePorId(p.pz, x.borde) || {}).tipo === 'aplicado').forEach(x => x.idx.forEach(g => { const q = [uv[2 * g] + p.desplaza[0], uv[2 * g + 1] + p.desplaza[1]], hit = enTriangulo(base, uv, q); if (hit) pegados.push(g, hit[0], hit[1], hit[2], hit[3], hit[4], hit[5]); })); });
  // ABROCHADO: en las piezas en dos mitades con «solapa» (cinturilla con botón), lo que sobresale del centro (u < 0) va pegado encima
  // de la otra mitad, en el mismo sitio del patrón (como con el botón cerrado)
  P.filter(p => p.copia === 'o' && p.pz.bordes.some(b => b.id === 'solapa')).forEach(p => { const m = P.find(q => q.pz === p.pz && q.copia === 'm'); if (!m) return;
    for (let i = 0; i < p.n; i++) { const g = p.off + i; if (uv[2 * g] > -0.5) continue; const hit = enTriangulo(m, uv, [uv[2 * g], uv[2 * g + 1]]); if (hit) pegados.push(g, hit[0], hit[1], hit[2], hit[3], hit[4], hit[5]); }
    for (let i = 0; i < m.n; i++) { const g = m.off + i; if (uv[2 * g] < 0.5) continue; const hit = enTriangulo(p, uv, [uv[2 * g], uv[2 * g + 1]]); if (hit) pegados.push(g, hit[0], hit[1], hit[2], hit[3], hit[4], hit[5]); } }); // (y la de debajo, por dentro)
  // (18-10) la CAPUCHA choca también con el PELO (Rp: el cuerpo con el pelo); el resto de la prenda, solo con el cuerpo: la coleta o la melena
  //  caen por ENCIMA del cuello de una camiseta, como de verdad, pero dentro de una capucha puesta
  const conPelo = o.Rp ? new Uint8Array(N) : null; if (conPelo) P.forEach(p => { if (p.col && p.col.zona === 'cabeza') conPelo.fill(1, p.off, p.off + p.n); });
  return { Rp: o.Rp || null, conPelo, P, N, pos, prev: new Float32Array(pos), vel: new Float32Array(3 * N), uv, w, panelDe, tri: new Uint32Array(tri), ar, arL, arK, arT, fl, flL, flK, lr: new Uint32Array(lr), lrT: new Float32Array(lrT), pares: new Uint32Array(pares), cos3, pegados: new Float64Array(pegados), avisos, h, C, R, k };
}
const uvp = (uv, i) => [uv[2 * i], uv[2 * i + 1]];
function enTriangulo(p, uv, q) { for (const [a, b, c] of p.tri) { const A = uvp(uv, a), B = uvp(uv, b), Cc = uvp(uv, c), d = G.cruz(G.sub(B, A), G.sub(Cc, A)); if (Math.abs(d) < 1e-9) continue;
  const l1 = G.cruz(G.sub(B, q), G.sub(Cc, q)) / d, l2 = G.cruz(G.sub(Cc, q), G.sub(A, q)) / d, l3 = 1 - l1 - l2; if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) return [a, b, c, l1, l2, l3]; } return null; }

// ---------- COLOCAR un panel (posición 3D de cada punto de su malla) ----------
// Regla (la de un patronista mirando la prenda POR FUERA): lo dibujado hacia la derecha del patrón queda a la derecha de quien mira
// esa pieza desde fuera. Así: delanteros con +u hacia +X, espaldas con +u hacia −X, la manga ORIGINAL en el brazo DERECHO (su copa
// delantera, +u, mira hacia delante), la capucha original a la IZQUIERDA (la cara a +u = 0 delante)… La copia ESPEJO es la original
// reflejada en X (va al otro lado). Cada panel se envuelve en un cilindro alrededor de su parte del cuerpo, separado unos 4 cm.
function colocaPanel(p, ctx) {
  const { C } = ctx, M = p.it.M, col = p.it.col, N = C.niveles, H = C.H, uv0 = M.P, caja = G.caja(uv0.slice(0, M.nb)), off = 40;
  p.col = col; p.desplaza = [0, 0];
  const radioTronco = y => { const q = C.secc(Math.max(N.entrepierna + 10, Math.min(N.hombro - 10, y))); return Math.max(q.a, q.b + Math.abs(q.c)) + off; };
  // envolver el tronco por su ELIPSE (a la altura y; por debajo de la cadera, la de la cadera): u = largo de arco desde el centro
  const anchoMax = ctx.anchoTronco || 300;
  const elipse = y => { const q = C.secc(Math.max(N.cadera, Math.min(N.hombro - 10, y))), hp = Math.PI * Math.sqrt((q.a * q.a + q.b * q.b) / 2), o2 = Math.max(26, (1.12 * anchoMax - hp) / Math.PI);
    const A = q.a + o2, B = q.b + o2, S = [0]; for (let k = 1; k <= 32; k++) { const f0 = (k - 1) * Math.PI / 32, f1 = k * Math.PI / 32; S.push(S[k - 1] + Math.hypot(A * (Math.sin(f1) - Math.sin(f0)), B * (Math.cos(f1) - Math.cos(f0)))); }
    return { A, B, c: C.secc(y).c, S }; };
  const envuelve = (E, u) => { const au = Math.abs(u), S = E.S; let ph; if (au >= S[32]) ph = Math.PI + (au - S[32]) / E.B; else { let k = 1; while (S[k] < au) k++; ph = (k - 1 + (au - S[k - 1]) / (S[k] - S[k - 1])) * Math.PI / 32; } return [Math.sign(u) * E.A * Math.sin(ph), E.B * Math.cos(ph)]; };
  const yHombroCuello = N.hombro + 0.035 * H + 12;
  let f, lado; // f: (u, v) del patrón original → [x, y, z] de la copia ORIGINAL · lado: 'I' (+X) | 'D' (−X) (en una entera: el de su mitad +u)
  if (col.zona === 'tronco' || col.zona === 'aplicado') {
    let ref = col, dv = 0;
    if (col.zona === 'aplicado') { const base = ctx.piezas.find(q => q.pz.nombre === col.sobre || q.pz.nombre.startsWith(col.sobre + ' (')); ref = base ? base.col : { cara: 'delante', ancla: 'hombro' }; const bc = base ? G.caja(base.M.P.slice(0, base.M.nb)) : caja; dv = bc.y0 + (col.dy || 0) - caja.y0; p.desplaza = [0, dv]; p.vTop = bc.y1; }
    const yTop = ref.ancla === 'cintura' ? N.cintura + 15 : ref.ancla === 'hombro' ? yHombroCuello : N.pecho, vTop = col.zona === 'aplicado' ? p.vTop : caja.y1, sg = ref.cara === 'detras' ? -1 : 1, extra = col.zona === 'aplicado' ? 6 : 0;
    f = (u, v) => { const y = yTop - (vTop - (v + dv)), E = elipse(y); if (extra) { E.A += extra; E.B += extra; } const [x, z] = envuelve(E, u); return [sg * x, y, E.c + sg * z]; };
    p.fuera = ([x, y, z]) => [x, 0, z - C.secc(y).c];
    lado = sg > 0 ? 'I' : 'D'; // la copia original (+u) de un delantero cae a +X; la de una espalda, a −X
  } else if (col.zona === 'brazo') {
    const B = C.brazos.find(b => b.sg === -1), E = ejeBrazo(B), Rs = Math.max(caja.w / (2 * Math.PI) + 14, C.rB * 1.15 + 18), vTop = caja.y1, t0 = -0.35 * Rs;
    f = (u, v) => { const F = E.en(t0 + (vTop - v)), a = u / Rs, c = Math.cos(a), s = Math.sin(a); return [0, 1, 2].map(k => F.c[k] + Rs * (c * F.o[k] + s * F.fr[k])); };
    p.fuera = E.fuera;
    lado = 'D'; p.Rs = Rs; p.t0 = t0; p.vTop = vTop;
  } else if (col.zona === 'pierna') {
    const sgC = col.cara === 'detras' ? -1 : 1, pierna = C.piernas.find(L => L.sg === (sgC > 0 ? -1 : 1));
    const Lt = p.pz.bordes.some(b => b.id === 'tiro') ? Z.bordePolilinea(p.pz, 'tiro') : null;
    const vCint = caja.y1, uCF = Lt ? Lt.reduce((m, q) => (q[1] > m[1] ? q : m), Lt[0])[0] : caja.x1, uMid = (caja.x0 + caja.x1) / 2, yW = N.cintura + 10, yCr = N.entrepierna, Rl = Math.max(C.rM + 30, caja.w / Math.PI);
    const mezcla = y => { const w = Math.max(0, Math.min(1, (yCr + 60 - y) / 140)); return w * w * (3 - 2 * w); };
    f = (u, v) => { const y = yW - (vCint - v), sm = mezcla(y), [legX, legZ] = ejePierna(pierna, y), q = C.secc(y), Rt = radioTronco(y);
      const R = Rt + (Rl - Rt) * sm, xc = legX * sm, zc = q.c * (1 - sm) + legZ * sm, a = (u - (uCF + (uMid - uCF) * sm)) / R; return [xc + sgC * R * Math.sin(a), y, zc + sgC * R * Math.cos(a)]; };
    p.fuera = ([x, y, z]) => { const sm = mezcla(y), [legX, legZ] = ejePierna(pierna, y); return [x - legX * sm, 0, z - C.secc(y).c * (1 - sm) - legZ * sm]; };
    lado = pierna.sg > 0 ? 'I' : 'D';
  } else if (col.zona === 'anillo' && col.en === 'muneca') {
    const B = C.brazos.find(b => b.sg === -1), E = ejeBrazo(B), man = ctx.piezas.find(q => q.pz.nombre === 'Manga'), mc = man ? G.caja(man.M.P.slice(0, man.M.nb)) : { w: 380, h: 500 }, Rs = Math.max(mc.w / (2 * Math.PI) + 14, C.rB * 1.15 + 18), t1 = -0.35 * Rs + mc.h;
    const R = Math.max(caja.w / (2 * Math.PI), C.rW + 12);
    f = (u, v) => { const a = (u - (caja.x0 + caja.x1) / 2) / caja.w * 2 * Math.PI, F = E.en(t1 + (v - caja.y0) + 6), c = Math.cos(a), s = Math.sin(a); return [0, 1, 2].map(k => F.c[k] + R * (c * F.o[k] + s * F.fr[k])); };
    p.fuera = E.fuera;
    lado = 'D';
  } else if (col.zona === 'anillo') {
    // cuello (el delantero más bajo, como el escote) · cintura (sube desde la costura) · bajo (cuelga desde la costura)
    const yc = col.en === 'cuello' ? yHombroCuello - 6 : col.en === 'cintura' ? N.cintura + 15 : yHombroCuello - (col.largo || 650) - 6;
    const q = C.secc(Math.max(N.entrepierna + 10, Math.min(N.hombro - 10, yc))), cz = col.en === 'cuello' ? -12 * C.s : q.c, Lw = col.mitad ? 2 * caja.w : caja.w, R0 = Lw / (2 * Math.PI);
    const R = Math.max(R0, col.en === 'cuello' ? C.rN + 8 : radioTronco(yc) - 28), bd = col.baja || [0, 0], sube = col.en === 'bajo' ? -1 : 1;
    f = (u, v) => { const a = u / R, baj = col.en === 'cuello' ? (bd[0] * (1 + Math.cos(a)) / 2 + bd[1] * (1 - Math.cos(a)) / 2) * 0.85 : 0; return [R * Math.sin(a), yc - baj + sube * (v - caja.y0), cz + R * Math.cos(a)]; };
    p.fuera = ([x, y, z]) => [x, 0, z - cz];
    lado = 'I'; // la mitad +u (o la copia original de una cinturilla en dos mitades) va a +X
  } else if (col.zona === 'cabeza') {
    const cab = C.cabeza, R = Math.max(cab.r[0], cab.r[2]) + 45, y0 = yHombroCuello - 10;
    f = (u, v) => { const a = 0.45 + u / R; return [R * Math.sin(a), y0 + v, cab.c[2] + R * Math.cos(a)]; };
    p.fuera = ([x, y, z]) => [x, y - cab.c[1], z - cab.c[2]];
    lado = 'I';
  } else { f = (u, v) => [u, v + N.pecho, 300]; p.fuera = () => [0, 0, 1]; lado = 'I'; }
  // la copia y su lado
  const esp = p.copia === 'm', otro = l => (l === 'I' ? 'D' : 'I');
  p.x3 = uv0.map(([u, v]) => { const r = f(u, v); return esp ? [-r[0], r[1], r[2]] : r; });
  if (p.copia === 'e') { p.ladoO = lado; p.ladoM = otro(lado); } else p.lado = esp ? otro(lado) : lado;
  if (esp) { const f0 = p.fuera; p.fuera = ([x, y, z]) => { const r = f0([-x, y, z]); return [-r[0], r[1], r[2]]; }; }
  p.espejoUV = esp;
  // ¿mira hacia FUERA la cara buena? (si no, se dan la vuelta los triángulos para pintarla bien)
  let s = 0; M.T.forEach(([a, b, c]) => { const A = p.x3[a], B = p.x3[b], Cc = p.x3[c], n = G3.cruz(G3.resta(B, A), G3.resta(Cc, A)), m = [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3, (A[2] + B[2] + Cc[2]) / 3], fu = p.fuera(m); s += n[0] * fu[0] + n[1] * fu[1] + n[2] * fu[2]; });
  p.giraTri = s < 0; p.miraFuera = s;
}
// los ejes de un brazo: «o» = hacia fuera y arriba (perpendicular al brazo), «fr» = hacia delante (+Z)
function ejesBrazo(d) { const up = [0, 1, 0], k = d[1], o = G3.norma([up[0] - k * d[0], up[1] - k * d[1], up[2] - k * d[2]]); let fr = G3.norma(G3.cruz(d, o)); if (fr[2] < 0) fr = fr.map(x => -x); return { o, fr }; }
// (18-10) el EJE del brazo por donde va la manga: hombro → CODO → muñeca. El maniquí tiene el codo doblado (el antebrazo va hacia delante) y
// la manga se ponía como un tubo RECTO del hombro a la mano: el codo quedaba a 12 cm de ese eje, el brazo atravesaba el tubo y, al soltarla,
// la tela salía por arriba: la manga encima del brazo como una cinta y la piel al aire por debajo (con las costuras cerradas). Ahora la
// manga sigue el brazo: recta antes del hombro y pasada la muñeca, con el codo redondeado, y sus ejes giran lo justo (el tubo no se retuerce).
// en(t) → { c: punto del eje a t mm del hombro (medido por el eje), o, fr } · fuera(p) → de dónde a dónde mira p desde el eje
export function ejeBrazo(B) {
  const J = B.J, W = B.W, E0 = B.E, resta = G3.resta, suma = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], lar = a => Math.hypot(a[0], a[1], a[2]);
  const recto = !E0 || lar(resta(E0, J)) < 30 || lar(resta(W, E0)) < 30, d1 = recto ? B.d : G3.norma(resta(E0, J)), d2 = recto ? B.d : G3.norma(resta(W, E0));
  const L1 = recto ? 0 : lar(resta(E0, J)), L2 = recto ? lar(resta(W, J)) : lar(resta(W, E0)), b = recto ? 0 : Math.min(0.4 * L1, 0.4 * L2, 90), PA = 700;
  const P = [], paso = 4;
  for (let s = -PA; s < L1 - b; s += paso) P.push(suma(J, d1, s)); // (del hombro hacia el codo, y antes del hombro)
  if (!recto) { const A = suma(E0, d1, -b), Cc = suma(E0, d2, b); for (let k = 0; k <= 24; k++) { const t = k / 24, m = 1 - t; P.push([0, 1, 2].map(q => m * m * A[q] + 2 * m * t * E0[q] + t * t * Cc[q])); } }
  const B0 = recto ? J : suma(E0, d2, b), L3 = recto ? L2 : L2 - b; for (let s = paso; s < L3 + PA; s += paso) P.push(suma(B0, d2, s));
  const S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + lar(resta(P[i], P[i - 1])));
  const s0 = PA; // (el hombro está a 700 mm del principio)
  const T = P.map((_, i) => G3.norma(resta(P[Math.min(P.length - 1, i + 1)], P[Math.max(0, i - 1)])));
  const O = [], FR = []; let { o, fr } = ejesBrazo(T[0]);
  for (let i = 0; i < P.length; i++) { const t = T[i]; o = G3.norma(suma(o, t, -(o[0] * t[0] + o[1] * t[1] + o[2] * t[2]))); let f2 = suma(fr, t, -(fr[0] * t[0] + fr[1] * t[1] + fr[2] * t[2])); f2 = suma(f2, o, -(f2[0] * o[0] + f2[1] * o[1] + f2[2] * o[2])); fr = G3.norma(f2); O.push(o); FR.push(fr); }
  const en = t => { const s = s0 + t; let i = 0, j = S.length - 1; if (s <= S[0]) j = 1; else if (s >= S[j]) i = j - 1; else { while (j - i > 1) { const m = (i + j) >> 1; if (S[m] <= s) i = m; else j = m; } }
    i = Math.min(i, S.length - 2); j = i + 1; const w = (s - S[i]) / ((S[j] - S[i]) || 1), mez = (a, c) => [a[0] + (c[0] - a[0]) * w, a[1] + (c[1] - a[1]) * w, a[2] + (c[2] - a[2]) * w];
    return { c: mez(P[i], P[j]), o: G3.norma(mez(O[i], O[j])), fr: G3.norma(mez(FR[i], FR[j])) }; };
  const fuera = q => { let m = Infinity, k = 0; for (let i = 0; i < P.length; i += 3) { const dd = (q[0] - P[i][0]) ** 2 + (q[1] - P[i][1]) ** 2 + (q[2] - P[i][2]) ** 2; if (dd < m) { m = dd; k = i; } } const v = resta(q, P[k]), t = T[k], kk = v[0] * t[0] + v[1] * t[1] + v[2] * t[2]; return suma(v, t, -kk); };
  return { en, fuera, puntos: P };
}
// el eje de una pierna a la altura y (cadera → rodilla → tobillo): [x, z]
function ejePierna(L, y) { const P = [L.Hj, L.Ki, L.An]; if (y >= P[0][1]) return [P[0][0], P[0][2]]; for (let i = 0; i < 2; i++) { const a = P[i], b = P[i + 1]; if (y >= b[1]) { const t = (a[1] - y) / (a[1] - b[1]); return [a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t]; } } return [P[2][0], P[2][2]]; }
const G3 = { resta: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cruz: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norma: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };

// ---------- el SIMULADOR ----------
export function simulador(S, o = {}) {
  const N = S.N, pos = S.pos, prev = S.prev, vel = S.vel, w = S.w, R = S.R, Rp = S.Rp || S.R, conPelo = S.conPelo, RG = i => (conPelo && conPelo[i] ? Rp : R), g = -9810, tmp = [0, 0, 0, 0], grosor = o.grosor || 2.5, contacto = new Uint8Array(N);
  const roce = new Float32Array(N); S.P.forEach(p => { for (let i = 0; i < p.n; i++) roce[p.off + i] = TELAS[p.tela].roce; });
  let t = 0, cosido = 0, arrastre = null, viento = 0, tCaer = null, cuadro = 0;
  const ITER = o.iter || 3, VMAX = 4000, OMEGA = o.omega || 1.7, SEPA = o.sepa || 4; // (3 pasadas con sobre-relajación 1,7: medido, el pantalón se queda donde el cuerpo mide lo que su cintura) // mm/s: tope (una tela de verdad no sale disparada)
  const enCostura = new Uint8Array(N); for (let q = 0; q < S.pares.length; q++) enCostura[S.pares[q]] = 1;
  // lo PEGADO encima de otra pieza (bolsillo, solapa abrochada) no se separa de lo que tiene debajo: si no, se empujan y vibra
  const pegado = new Uint8Array(N); for (let q = 0; q < S.pegados.length; q += 7) for (let k = 0; k < 4; k++) pegado[S.pegados[q + k]] = 1;
  // los NUDOS de costura (16-10): donde se juntan 3 o más puntos cosidos (centro espalda + cinturilla, manga + puño, tiro + bragueta…), coser
  // de dos en dos convergía muy despacio y quedaba un agujerito; ahí todos van al MISMO sitio, como un remate
  const nudos = (() => { const pa = new Int32Array(N).map((_, i) => i), f = i => { while (pa[i] !== i) { pa[i] = pa[pa[i]]; i = pa[i]; } return i; };
    for (let q = 0; q < S.pares.length; q += 2) { const a = f(S.pares[q]), b = f(S.pares[q + 1]); if (a !== b) pa[a] = b; }
    const g = new Map(); for (let i = 0; i < N; i++) if (enCostura[i]) { const r = f(i); (g.get(r) || g.set(r, []).get(r)).push(i); }
    return [...g.values()].filter(L => L.length >= 3); })();
  function remata() { for (const L of nudos) { let x = 0, y = 0, z = 0, ws = 0; for (const i of L) { const wi = w[i]; x += pos[3 * i] * wi; y += pos[3 * i + 1] * wi; z += pos[3 * i + 2] * wi; ws += wi; } if (!ws) continue;
    x /= ws; y /= ws; z /= ws; for (const i of L) if (w[i]) { pos[3 * i] = x; pos[3 * i + 1] = y; pos[3 * i + 2] = z; } } }
  const maxAbierta = () => { let m = 0; const A = S.pares; for (let q = 0, n = A.length / 2; q < n; q++) { const i = A[2 * q], j = A[2 * q + 1], d = (pos[3 * i] - pos[3 * j]) ** 2 + (pos[3 * i + 1] - pos[3 * j + 1]) ** 2 + (pos[3 * i + 2] - pos[3 * j + 2]) ** 2; if (d > m) m = d; } return Math.sqrt(m); };
  // la tela no se atraviesa: rejilla espacial (celdas de 8 mm) y separación mínima entre puntos de piezas distintas o lejanos en el patrón
  const CEL = 8, TAB = 1 << 15, cab = new Int32Array(TAB), sig = new Int32Array(N), SEP = 4, uv = S.uv, panel = S.panelDe;
  const hsh = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) & (TAB - 1);
  function separa() {
    cab.fill(-1); for (let i = 0; i < N; i++) { const h = hsh(Math.floor(pos[3 * i] / CEL), Math.floor(pos[3 * i + 1] / CEL), Math.floor(pos[3 * i + 2] / CEL)); sig[i] = cab[h]; cab[h] = i; }
    for (let i = 0; i < N; i++) { if (!w[i]) continue; const fx = pos[3 * i] / CEL, fy = pos[3 * i + 1] / CEL, fz = pos[3 * i + 2] / CEL, cx = Math.floor(fx), cy = Math.floor(fy), cz = Math.floor(fz);
      const sx = fx - cx < 0.5 ? -1 : 1, sy = fy - cy < 0.5 ? -1 : 1, sz = fz - cz < 0.5 ? -1 : 1; /* (8 celdas: la suya y las del lado más cercano en cada eje) */
      for (let ax = 0; ax < 2; ax++) for (let ay = 0; ay < 2; ay++) for (let az = 0; az < 2; az++) { const dx = ax * sx, dy = ay * sy, dz = az * sz; for (let j = cab[hsh(cx + dx, cy + dy, cz + dz)]; j >= 0; j = sig[j]) { if (j === i) continue;
        if ((enCostura[i] && enCostura[j]) || pegado[i] || pegado[j]) continue;
        if (panel[i] === panel[j]) { const du = uv[2 * i] - uv[2 * j], dv = uv[2 * i + 1] - uv[2 * j + 1]; if (du * du + dv * dv < 9 * S.h * S.h) continue; }
        const ex = pos[3 * j] - pos[3 * i], ey = pos[3 * j + 1] - pos[3 * i + 1], ez = pos[3 * j + 2] - pos[3 * i + 2], d2 = ex * ex + ey * ey + ez * ez; if (d2 >= SEP * SEP || d2 < 1e-12) continue;
        const d = Math.sqrt(d2), c = (SEP - d) / d * 0.5, wi = w[i], wj = w[j], ws = wi + wj; if (!ws) continue;
        pos[3 * i] -= ex * c * wi / ws * 2; pos[3 * i + 1] -= ey * c * wi / ws * 2; pos[3 * i + 2] -= ez * c * wi / ws * 2; pos[3 * j] += ex * c * wj / ws * 2; pos[3 * j + 1] += ey * c * wj / ws * 2; pos[3 * j + 2] += ez * c * wj / ws * 2; } } }
  }
  function distancia(ar, L, K, kMul) { for (let q = 0, n = L.length; q < n; q++) { const i = ar[2 * q], j = ar[2 * q + 1], wi = w[i], wj = w[j], ws = wi + wj; if (!ws) continue;
    const ex = pos[3 * j] - pos[3 * i], ey = pos[3 * j + 1] - pos[3 * i + 1], ez = pos[3 * j + 2] - pos[3 * i + 2], d = Math.sqrt(ex * ex + ey * ey + ez * ez); if (d < 1e-9) continue;
    const C = d - L[q], s = K[q] * kMul * C / (d * ws);
    pos[3 * i] += ex * s * wi; pos[3 * i + 1] += ey * s * wi; pos[3 * i + 2] += ez * s * wi; pos[3 * j] -= ex * s * wj; pos[3 * j + 1] -= ey * s * wj; pos[3 * j + 2] -= ez * s * wj; } }
  // el TOPE: ningún lado se estira más de lo que da su tela (dos pasadas)
  function tope(om = OMEGA) { const ar = S.ar, T = S.arT; for (let q = 0, n = T.length; q < n; q++) { const i = ar[2 * q], j = ar[2 * q + 1], wi = w[i], wj = w[j], ws = wi + wj; if (!ws) continue;
    const ex = pos[3 * j] - pos[3 * i], ey = pos[3 * j + 1] - pos[3 * i + 1], ez = pos[3 * j + 2] - pos[3 * i + 2], d2 = ex * ex + ey * ey + ez * ez; if (d2 <= T[q] * T[q]) continue;
    const d = Math.sqrt(d2), ex2 = d - T[q], s2 = (om > 1 && ex2 > 0.015 * T[q] ? om : 1) * ex2 / (d * ws); /* (el empujón extra solo si se pasa de verdad: en el límite justo hacía vibrar el bajo contra las piernas) */ pos[3 * i] += ex * s2 * wi; pos[3 * i + 1] += ey * s2 * wi; pos[3 * i + 2] += ez * s2 * wi; pos[3 * j] -= ex * s2 * wj; pos[3 * j + 1] -= ey * s2 * wj; pos[3 * j + 2] -= ez * s2 * wj; }
    const LR = S.lr, LT = S.lrT; if (LR) for (let q = 0, n = LT.length; q < n; q++) { const i = LR[2 * q], j = LR[2 * q + 1], wi = w[i], wj = w[j], ws = wi + wj; if (!ws) continue; /* (las de largo alcance) */
      const ex = pos[3 * j] - pos[3 * i], ey = pos[3 * j + 1] - pos[3 * i + 1], ez = pos[3 * j + 2] - pos[3 * i + 2], d2 = ex * ex + ey * ey + ez * ez; if (d2 <= LT[q] * LT[q]) continue;
      const d = Math.sqrt(d2), s2 = (d - LT[q]) / (d * ws); pos[3 * i] += ex * s2 * wi; pos[3 * i + 1] += ey * s2 * wi; pos[3 * i + 2] += ez * s2 * wi; pos[3 * j] -= ex * s2 * wj; pos[3 * j + 1] -= ey * s2 * wj; pos[3 * j + 2] -= ez * s2 * wj; } }
  function cose(maxPaso) { const A = S.pares; for (let q = 0, n = A.length / 2; q < n; q++) { const i = A[2 * q], j = A[2 * q + 1], wi = w[i], wj = w[j], ws = wi + wj; if (!ws) continue;
    let ex = pos[3 * j] - pos[3 * i], ey = pos[3 * j + 1] - pos[3 * i + 1], ez = pos[3 * j + 2] - pos[3 * i + 2]; const d = Math.sqrt(ex * ex + ey * ey + ez * ez); if (d < 1e-9) continue;
    const m = Math.min(d, maxPaso) / d; ex *= m; ey *= m; ez *= m; pos[3 * i] += ex * wi / ws; pos[3 * i + 1] += ey * wi / ws; pos[3 * i + 2] += ez * wi / ws; pos[3 * j] -= ex * wj / ws; pos[3 * j + 1] -= ey * wj / ws; pos[3 * j + 2] -= ez * wj / ws; } }
  function pega() { const A = S.pegados; for (let q = 0; q < A.length; q += 7) { const i = A[q], a = A[q + 1], b = A[q + 2], c = A[q + 3], la = A[q + 4], lb = A[q + 5], lc = A[q + 6];
    for (let k = 0; k < 3; k++) { const x = pos[3 * a + k] * la + pos[3 * b + k] * lb + pos[3 * c + k] * lc, e = x - pos[3 * i + k]; pos[3 * i + k] += e * 0.7; } } }
  let agarra = false, tToque = -9; const apr = new Float32Array(N), v2Ant = new Float32Array(N); // (cuánto ha empujado el cuerpo a cada punto en este subpaso: lo que «aprieta», para el rozamiento)
  // (16-10, velocidad: la 1.ª pasada de cada subpaso mira TODOS los puntos y apunta los que están a menos de 12 mm del cuerpo; las pasadas
  // repetidas solo miran esos: entre pasada y pasada un punto no se mueve tanto como para llegar desde más lejos)
  const cerca = new Int32Array(N); let nCerca = 0;
  function cuerpo(soloCerca) { const n = soloCerca ? nCerca : N; if (!soloCerca) nCerca = 0;
    for (let q = 0; q < n; q++) { const i = soloCerca ? cerca[q] : q; if (!soloCerca) contacto[i] = 0; if (!w[i]) continue; const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
    if (y < 1) { pos[3 * i + 1] = 1; contacto[i] = 1; }
    muestra(RG(i), x, y, z, tmp); if (!soloCerca && (tmp[0] < grosor + 12 || enCostura[i] || pegado[i])) cerca[nCerca++] = i; /* (los de costura y los pegados, siempre: al cerrarse saltan) */
    if (tmp[0] < grosor) { const e = grosor - tmp[0]; pos[3 * i] += tmp[1] * e; pos[3 * i + 1] += tmp[2] * e; pos[3 * i + 2] += tmp[3] * e; contacto[i] = 1; apr[i] += e; } } }
  function paso(dt = 1 / 60, sub = 10) {
    const hs = dt / sub;
    // como en CLO: primero se COSE (sin gravedad, las piezas van hacia sus costuras) y, cuando están cerradas, cae
    if (tCaer == null && (cuadro++ % 4 === 0) && (maxAbierta() < 8 || t > 1.6)) tCaer = t;
    // (el rozamiento agarra cuando las costuras ya están cerradas —o pasados 2,5 s—: si no, una manga que termina de cerrarse cayendo se quedaba a medias)
    if (tCaer != null && !agarra && cuadro % 4 === 1 && (maxAbierta() < 8 || t - tCaer > 2.5)) agarra = true;
    const reposo = tCaer != null && t - tCaer > 2.5 && !arrastre && !viento && t - tToque > 1.5;
    for (let i = 0; i < N; i++) v2Ant[i] = vel[3 * i] ** 2 + vel[3 * i + 1] ** 2 + vel[3 * i + 2] ** 2;
    for (let s = 0; s < sub; s++) { apr.fill(0);
      const gz = tCaer == null ? 0 : Math.min(1, (t - tCaer) / 0.35 + 0.05);
      for (let i = 0; i < N; i++) { if (!w[i]) continue; const k = 3 * i; vel[k + 1] += g * gz * hs; if (viento) { vel[k + 2] += viento * hs * (0.6 + 0.4 * Math.sin(t * 3 + pos[k + 1] * 0.01)); }
        // mientras se cose, la tela va «frenada» (casi sin inercia: solo la mueven las costuras); luego, el aire y el roce
        // REPOSO (16-10): ya caída y sin nadie tirando, lo que queda son temblores numéricos (una tela quieta no tiembla): se frenan del todo
        const quieto = reposo && v2Ant[i] < 160000, amort = tCaer == null ? 0.82 : t - tCaer < 0.4 ? 0.97 : quieto ? 0.8 : 1 - (contacto[i] ? 0.02 : 0.004); vel[k] *= amort; vel[k + 1] *= amort; vel[k + 2] *= amort;
        const v2 = vel[k] * vel[k] + vel[k + 1] * vel[k + 1] + vel[k + 2] * vel[k + 2]; if (v2 > VMAX * VMAX) { const r = VMAX / Math.sqrt(v2); vel[k] *= r; vel[k + 1] *= r; vel[k + 2] *= r; }
        prev[k] = pos[k]; prev[k + 1] = pos[k + 1]; prev[k + 2] = pos[k + 2]; pos[k] += vel[k] * hs; pos[k + 1] += vel[k + 1] * hs; pos[k + 2] += vel[k + 2] * hs; }
      cose(tCaer == null ? 2 + t * 10 : 1e9);
      distancia(S.ar, S.arL, S.arK, 1); distancia(S.fl, S.flL, S.flK, 1); if (tCaer != null) cose(1e9); // (las costuras, otra vez: que no se abran)
      if (S.pegados.length) pega();
      if (arrastre) { const i = arrastre.i, k = 3 * i; for (let c = 0; c < 3; c++) pos[k + c] += (arrastre.p[c] - pos[k + c]) * 0.5; }
      if (s % SEPA === 0) separa();
      cuerpo(); if (tCaer != null) for (let it = 0; it < ITER; it++) { tope(it < ITER - 1 ? OMEGA : 1); cose(1e9); remata(); cuerpo(true); } // (el hilo y la tela no dan más de sí: varias pasadas con el cuerpo)
      // ROZAMIENTO de verdad (Coulomb, 16-10): lo que aprieta contra el cuerpo se queda AGARRADO (si lo que resbala en este subpaso es menos
      // que roce × lo que aprieta) y si no, resbala frenado. Antes solo se frenaba un poco: lo ajustado (cinturillas) caía como por un tobogán
      if (agarra) for (let i = 0; i < N; i++) { if (!apr[i]) continue; const k = 3 * i; muestra(RG(i), pos[k], pos[k + 1], pos[k + 2], tmp);
        const dx = pos[k] - prev[k], dy = pos[k + 1] - prev[k + 1], dz = pos[k + 2] - prev[k + 2], dn = dx * tmp[1] + dy * tmp[2] + dz * tmp[3], tx = dx - tmp[1] * dn, ty = dy - tmp[2] * dn, tz = dz - tmp[3] * dn, tl = Math.hypot(tx, ty, tz), mu = roce[i];
        if (tl > 1e-9) { const c = tl <= mu * apr[i] ? 1 : mu * 0.8 * apr[i] / tl; pos[k] -= tx * c; pos[k + 1] -= ty * c; pos[k + 2] -= tz * c; } }
      for (let i = 0; i < N; i++) { const k = 3 * i; vel[k] = (pos[k] - prev[k]) / hs; vel[k + 1] = (pos[k + 1] - prev[k + 1]) / hs; vel[k + 2] = (pos[k + 2] - prev[k + 2]) / hs;
        if (contacto[i]) { // roce con la piel: frena lo que resbala
          muestra(RG(i), pos[k], pos[k + 1], pos[k + 2], tmp); const vn = vel[k] * tmp[1] + vel[k + 1] * tmp[2] + vel[k + 2] * tmp[3], f = 1 - roce[i] * 0.35;
          vel[k] = (vel[k] - tmp[1] * vn) * f + tmp[1] * Math.max(0, vn); vel[k + 1] = (vel[k + 1] - tmp[2] * vn) * f + tmp[2] * Math.max(0, vn); vel[k + 2] = (vel[k + 2] - tmp[3] * vn) * f + tmp[3] * Math.max(0, vn); } }
      t += hs;
    }
  }
  // ya puesta (heredada de la anterior): sin fase de coser, cae suave
  function yaPuesta() { tCaer = t; vel.fill(0); }
  return { paso, yaPuesta, get t() { return t; }, get cosida() { return tCaer != null; },
    // ¿se ha quedado quieta? (lo más que se ha movido un punto en el último paso, en mm)
    mueve() { let m = 0; for (let i = 0; i < 3 * N; i += 3) { const d = (pos[i] - prev[i]) ** 2 + (pos[i + 1] - prev[i + 1]) ** 2 + (pos[i + 2] - prev[i + 2]) ** 2; if (d > m) m = d; } return Math.sqrt(m); }, set arrastre(a) { arrastre = a; tToque = t; }, set viento(v) { viento = v; tToque = t; }, contacto,
    // cuánto queda ABIERTA cada costura (mm) y cuánto se estira la tela (por punto)
    abiertas() { return S.cos3.map(c => { let m = 0; for (let q = c.desde; q < c.hasta; q++) { const i = S.pares[2 * q], j = S.pares[2 * q + 1]; m = Math.max(m, Math.hypot(pos[3 * i] - pos[3 * j], pos[3 * i + 1] - pos[3 * j + 1], pos[3 * i + 2] - pos[3 * j + 2])); } return { n: c.n, lado: c.lado, max: m }; }); },
    estira(out) { out = out || new Float32Array(N); const cnt = new Float32Array(N); out.fill(0); for (let q = 0, n = S.arL.length; q < n; q++) { const i = S.ar[2 * q], j = S.ar[2 * q + 1], d = Math.hypot(pos[3 * j] - pos[3 * i], pos[3 * j + 1] - pos[3 * i + 1], pos[3 * j + 2] - pos[3 * i + 2]), e = d / S.arL[q] - 1; out[i] += e; out[j] += e; cnt[i]++; cnt[j]++; } for (let i = 0; i < N; i++) out[i] = cnt[i] ? out[i] / cnt[i] : 0; return out; },
    dentro() { let m = Infinity, n = 0; for (let i = 0; i < N; i++) { muestra(RG(i), pos[3 * i], pos[3 * i + 1], pos[3 * i + 2], tmp); if (tmp[0] < m) m = tmp[0]; if (tmp[0] < -2) n++; } return { min: m, n }; },
    sano() { for (let i = 0; i < 3 * N; i++) if (!isFinite(pos[i])) return false; return true; },
  };
}

// ---------- EN DIRECTO: la prenda nueva sale YA PUESTA desde la anterior ----------
// Cada punto nuevo busca, en la pieza de antes (mismo nombre y copia), el triángulo del patrón donde cae y copia su posición 3D
// (si la pieza ha crecido y cae fuera, el punto más cercano). Devuelve qué parte se ha heredado (0–1).
export function hereda(Sn, Sv) {
  let tot = 0, ok = 0;
  Sn.P.forEach(pn => { const pv = Sv.P.find(q => q.pz.nombre === pn.pz.nombre && q.copia === pn.copia); tot += pn.n; if (!pv) return;
    // rejilla de los triángulos viejos (en el patrón) para buscar rápido
    const cel = 40, mapa = new Map(), uvv = i => [Sv.uv[2 * i], Sv.uv[2 * i + 1]];
    pv.tri.forEach((t, q) => { const P = t.map(uvv), x0 = Math.floor(Math.min(P[0][0], P[1][0], P[2][0]) / cel), x1 = Math.floor(Math.max(P[0][0], P[1][0], P[2][0]) / cel), y0 = Math.floor(Math.min(P[0][1], P[1][1], P[2][1]) / cel), y1 = Math.floor(Math.max(P[0][1], P[1][1], P[2][1]) / cel);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x + ',' + y; (mapa.get(k) || mapa.set(k, []).get(k)).push(q); } });
    for (let i = 0; i < pn.n; i++) { const g = pn.off + i, u = [Sn.uv[2 * g], Sn.uv[2 * g + 1]], L = mapa.get(Math.floor(u[0] / cel) + ',' + Math.floor(u[1] / cel)) || []; let hecho = false;
      for (const q of L) { const [a, b, c] = pv.tri[q], A = uvv(a), B = uvv(b), Cc = uvv(c), d = G.cruz(G.sub(B, A), G.sub(Cc, A)); if (Math.abs(d) < 1e-9) continue;
        const l1 = G.cruz(G.sub(B, u), G.sub(Cc, u)) / d, l2 = G.cruz(G.sub(Cc, u), G.sub(A, u)) / d, l3 = 1 - l1 - l2; if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        for (let k = 0; k < 3; k++) Sn.pos[3 * g + k] = Sv.pos[3 * a + k] * l1 + Sv.pos[3 * b + k] * l2 + Sv.pos[3 * c + k] * l3; hecho = true; ok++; break; }
      if (!hecho) { let m = Infinity, j = -1; for (let k = 0; k < pv.n; k++) { const v = pv.off + k, dd = (Sv.uv[2 * v] - u[0]) ** 2 + (Sv.uv[2 * v + 1] - u[1]) ** 2; if (dd < m) { m = dd; j = v; } } if (j >= 0) for (let k = 0; k < 3; k++) Sn.pos[3 * g + k] = Sv.pos[3 * j + k]; if (m < 900) ok++; } }
  });
  Sn.prev.set(Sn.pos); return tot ? ok / tot : 0;
}
// la forma de la malla para quien la pinta (sin funciones: se puede mandar de un hilo a otro)
export function topologia(S) {
  return { N: S.N, uv: S.uv, pares: S.pares, avisos: S.avisos, cos3: S.cos3.map(c => ({ n: c.n, lado: c.lado })),
    P: S.P.map(p => ({ nombre: p.pz.nombre, copia: p.copia, lado: p.lado || p.ladoO, tela: p.tela, off: p.off, n: p.n, tri: Uint32Array.from(p.tri.flat()) })) };
}
