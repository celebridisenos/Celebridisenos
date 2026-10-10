// ================= v20 · 🧊 CelebriR8 · EL PROYECTO (lo que hay en el Estudio) =================
// Un proyecto es una lista de CUERPOS, como el «navegador» de Fusion. Cada cuerpo es una forma (caja, cilindro, texto…),
// un BOCETO extruido, una pieza del catálogo, un STL importado o un GRUPO de cuerpos. Cada uno puede ser SÓLIDO o HUECO
// (como en Tinkercad: el hueco se resta de lo que toca), tener su color y su acabado, y estar movido, girado o escalado.
// Todo es JSON sencillo, así deshacer/rehacer y guardar es copiar el JSON. Las mallas grandes (STL importados) van aparte.
import * as N from './nucleo.js';
import * as T from '../../vendor/three/three_r8.js';
import * as EM from './empalme.js';
import { IMAGENES } from './foto_medida.js'; // v20.4: las fotos para calcar van aparte (como las mallas) // v20.4: redondeos y chaflanes de bordes

let sec = 1;
export const nuevoId = () => 'c' + Date.now().toString(36).slice(-5) + (sec++).toString(36);
export const T0 = () => ({ pos: [0, 0, 0], rot: [0, 0, 0], esc: [1, 1, 1] });
export function nuevoProyecto(nombre = 'Mi diseño') { return { v: 20, id: 'p' + Date.now().toString(36), nombre, cuerpos: [], cama: 256 }; }
export const MALLAS = new Map(); // id → Float32Array (STL importados, partes cortadas, figuras de foto)
const GEN = {}; // generadores del catálogo: k → (p) => Manifold
export const registrar = (k, f) => { GEN[k] = f; };
export const generador = k => GEN[k];

// ---------- buscar ----------
export function recorre(L, f, padre = null) { (L || []).forEach(c => { f(c, padre); if (c.hijos) recorre(c.hijos, f, c); }); }
export function busca(P, id) { let r = null; recorre(P.cuerpos, c => { if (c.id === id) r = c; }); return r; }
export function padreDe(P, id) { let r = null; recorre(P.cuerpos, (c, pa) => { if (c.id === id) r = pa; }); return r; }
const listaDe = (P, id) => { const pa = padreDe(P, id); return pa ? pa.hijos : P.cuerpos; };
export const nombreTipo = c => c.tipo === 'grupo' ? 'Grupo' : c.tipo === 'boceto' ? 'Boceto' : c.tipo === 'malla' ? 'Pieza' : c.tipo === 'cat' ? 'Diseño' : (N.FORMAS3D[c.tipo] || {}).t || c.tipo;

// ---------- calcular ----------
// v20.2 · RÁPIDO (la dueña: «va lento»): antes, CADA pulsación volvía a unir y restar TODO (≈150 ms con 26 piezas).
// Ahora: cada cuerpo se calcula UNA vez (caché por su forma); moverlo o girarlo solo cambia su MATRIZ en la pantalla; un hueco
// solo se resta de lo que toca de verdad (cajas que se cruzan) y ese resultado también se guarda. Lo exacto de todo junto
// (volumen, piezas sueltas) se calcula aparte, cuando paras de tocar (infoExacta).
const cache = new Map(); // clave → { m (guardada), vista, caja, vol }
const MAXC = 220;
function guardaCache(k, m) { if (cache.size >= MAXC) { const [k0, v0] = cache.entries().next().value; cache.delete(k0); N.sueltaCache(v0.m); } const e = { m: N.guarda(m), vista: null, caja: null, vol: null }; N.protegidas.add(e.m); cache.set(k, e); return e; }
// v20.2: los grupos también van a la caché (antes se rehacían en cada pulsación: una matriz de 20 copias, 20 uniones)
// (v20.2.2: con el ajuste de rodamientos «⭐ el de tu plantilla», si apuntas otro número la pieza se rehace: va en la clave)
const ajVer = () => { try { return localStorage.getItem('cd.r8.ajustesRod') || ''; } catch (e) { return ''; } };
const claveDe = c => JSON.stringify(c.tipo === 'grupo' ? ['grupo', c.modo || 'unir', c.colores || 'uno', c.mods || null, c.hijos, ajVer(), c.empalmes || null] : [c.tipo, c.p, c.mods || null, c.tipo === 'cat' ? ajVer() : 0, c.empalmes || null]); // (v20.4: con sus redondeos)
function entradaDe(c, P) {
  const k = claveDe(c), e = cache.get(k); if (e) { cache.delete(k); cache.set(k, e); return e; }
  let m;
  if (c.tipo === 'grupo') m = grupoLocal(c, P);
  else if (c.tipo === 'boceto') { // v20.2: boceto sobre una cara: «alto» EXACTO desde la cara (hacia fuera o hacia dentro) y 0,02 mm de más por el otro lado para fundirse/cortar limpio
    if (c.p.enCara && (c.p.modo || 'extruir') === 'extruir') { const alto = Math.max(0.1, Number(c.p.alto) || 10); m = N.boceto(Object.assign({}, c.p, { alto: alto + 0.02 })).translate([0, 0, c.p.dir === 'dentro' ? -alto : -0.02]); }
    else m = N.boceto(c.p); }
  else if (c.tipo === 'malla') { const s = MALLAS.get(c.p.malla); if (!s) N.mal('Falta la pieza «' + (c.nombre || '') + '» (vuelve a importarla).'); m = N.deSopa(s); }
  else if (c.tipo === 'cat') { const g = GEN[c.p.k]; if (!g) N.mal('No encuentro el diseño «' + c.p.k + '».'); m = g(c.p); }
  else if (c.tipo === 'empuje') m = empujeDe(c.p);
  else m = N.forma3d(c.tipo, c.p);
  if (c.tipo !== 'grupo') {
    if (c.p && c.p.vaciar > 0) m = N.vaciar(m, c.p.vaciar, c.p.vaciarAbierta !== false);
    if (c.p && Math.abs(Number(c.p.desfase) || 0) >= 0.005) m = N.desfase(m, Number(c.p.desfase)); // v20.2: más gorda (+) o más fina (−), también 0,01 mm (holguras)
    if (c.mods && c.mods.length) m = N.deformar(m, c.mods);
  }
  // v20.4 · ◜ redondeos y chaflanes de bordes (lo último: los bordes se eligieron sobre la pieza tal cual se ve)
  if (c.empalmes && c.empalmes.length) { const r = EM.aplica(m, c.empalmes); m = r.m; if (r.avisos.length) EM.AVISOS.set(c.id, r.avisos); else EM.AVISOS.delete(c.id); } else EM.AVISOS.delete(c.id);
  return guardaCache(k, m);
}
// La pieza de un cuerpo en SU sitio de origen (sin mover ni girar)
const localDe = (c, P) => entradaDe(c, P).m;
export const localDeId = (P, id) => { const c = busca(P, id); return c ? localDe(c, P) : null; }; // v20.4 (para comprobar bordes antes de redondear)
export const colocado = (c, P) => N.coloca(localDe(c, P), c.t);
// v20.2 · EMPUJAR / TIRAR DE UNA CARA: el contorno de la cara (en su plano) se extruye hacia fuera (suma) o hacia dentro (hueco)
// p = { base: { o, u, v, n }, anillos: [[[x, y], …], …] (en el plano de la cara), d (mm: + fuera, − dentro) }
function empujeDe(p) {
  const d = Number(p.d) || 0; if (Math.abs(d) < 0.01) N.mal('Empuja o tira al menos 0,01 mm.');
  const s = N.cs((p.anillos || []).map(r => r.map(q => [q[0], q[1]])), 'EvenOdd'); if (s.isEmpty()) N.mal('Esa cara no tiene contorno.');
  const eps = 0.02, z0 = d > 0 ? -eps : d - eps, alto = d > 0 ? d + eps : Math.abs(d) + 2 * eps; // un pelo dentro de la pieza (y al cortar, un pelo fuera): se funde o corta limpio y sale EXACTO (v20.2: antes salía 0,02 de más)
  const { o, u, v, n } = p.base;
  return s.extrude(alto).translate([0, 0, z0]).transform([u[0], u[1], u[2], 0, v[0], v[1], v[2], 0, n[0], n[1], n[2], 0, o[0], o[1], o[2], 1]);
}
// vista previa de empujar una cara (sin guardarla en la caché)
export function vistaEmpuje(p) { try { return N.aVista(empujeDe(p)); } finally { N.limpia(); } }
// Un grupo: sus sólidos menos sus huecos (o lo que tienen en común, si es «cruce»)
function grupoLocal(g, P) { const r = evalLista(g.hijos.filter(c => !c.oculto), P, g.modo === 'cruce'); let m = N.union(r.partes.map(x => x.m)); if (g.mods && g.mods.length) m = N.deformar(m, g.mods); return m; }
function evalLista(L, P, cruce = false, avisos = []) {
  const sol = [], hue = [];
  L.forEach(c => {
    try {
      if (c.hueco) hue.push(colocado(c, P));
      else if (c.tipo === 'grupo' && c.colores === 'cada' && c.modo !== 'cruce' && !(c.mods && c.mods.length)) { const r = evalLista(c.hijos.filter(x => !x.oculto), P, false, avisos); r.partes.forEach(x => sol.push({ id: c.id, sub: x.id, color: x.color, acabado: x.acabado, m: N.coloca(x.m, c.t) })); }
      else sol.push({ id: c.id, color: c.color, acabado: c.acabado, m: colocado(c, P) });
    } catch (e) { avisos.push((c.nombre || nombreTipo(c)) + ': ' + (e.message || e)); }
  });
  let partes = sol;
  if (cruce && sol.length > 1) { let m = sol[0].m; sol.slice(1).forEach(x => { m = m.intersect(x.m); }); partes = [{ id: sol[0].id, color: sol[0].color, acabado: sol[0].acabado, m }]; }
  if (hue.length) { const H = N.union(hue); partes = partes.map(x => Object.assign({}, x, { m: x.m.subtract(H) })); }
  return { partes: partes.filter(x => !x.m.isEmpty()), huecos: hue, avisos };
}
// ---- cajas en el mundo (sin calcular nada: las 8 esquinas de la caja local con su matriz) ----
const cajaLocal = e => e.caja || (e.caja = N.caja(e.m));
const volLocal = e => (e.vol == null ? (e.vol = e.m.volume()) : e.vol);
function cajaMundo(b, M) {
  const el = M.elements, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i++) { const x = i & 1 ? b.max[0] : b.min[0], y = i & 2 ? b.max[1] : b.min[1], z = i & 4 ? b.max[2] : b.min[2];
    for (let k = 0; k < 3; k++) { const w = el[k] * x + el[4 + k] * y + el[8 + k] * z + el[12 + k]; if (w < mn[k]) mn[k] = w; if (w > mx[k]) mx[k] = w; } }
  return { min: mn, max: mx, dims: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
}
const cruzan = (a, b, h = 0.01) => a.min[0] <= b.max[0] + h && b.min[0] <= a.max[0] + h && a.min[1] <= b.max[1] + h && b.min[1] <= a.max[1] + h && a.min[2] <= b.max[2] + h && b.min[2] <= a.max[2] + h;
const tKey = t => (t ? t.pos.join(',') + '|' + t.rot.join(',') + '|' + t.esc.join(',') : '');
const detEsc = t => Math.abs((t.esc || [1, 1, 1]).reduce((a, x) => a * x, 1));
const csg = new Map(); const MAXCSG = 80; // resultados de restar huecos: clave → { vista, caja, vol, piezas }
function guardaCsg(k, x) { if (csg.size >= MAXCSG) csg.delete(csg.keys().next().value); csg.set(k, x); return x; }
// Lo que se ve: las partes con su color (con MATRIZ si no han hecho falta cuentas), los huecos de cristal y los «proxies»
export function evaluar(P) {
  const t0 = performance.now(), avisos = [], fallan = [];
  try {
    const vis = P.cuerpos.filter(c => !c.oculto);
    // 1) los huecos (de primer nivel): su caja en el mundo, sin calcular nada más
    const H = [];
    vis.filter(c => c.hueco).forEach(c => { try { const e = entradaDe(c, P), M = matriz4(c.t); H.push({ c, e, M, b: cajaMundo(cajaLocal(e), M), k: claveDe(c) + '@' + tKey(c.t) }); } catch (x) { avisos.push((c.nombre || nombreTipo(c)) + ': ' + (x.message || x)); fallan.push(c.id); } });
    // 2) los sólidos: cada uno (o cada hijo de una matriz «de colores») con su matriz; solo si un hueco lo toca, se resta
    const items = [];
    const pon = (c, id, sub, Mpadre, kPadre) => {
      const e = entradaDe(c, P), M = Mpadre ? Mpadre.clone().multiply(matriz4(c.t)) : matriz4(c.t);
      items.push({ id, sub, c, e, M, b: cajaMundo(cajaLocal(e), M), k: claveDe(c) + '@' + kPadre + tKey(c.t), vol: volLocal(e) * detEsc(c.t) * (Mpadre ? Mpadre.determinant() : 1) });
    };
    vis.filter(c => !c.hueco).forEach(c => {
      try {
        const cada = c.tipo === 'grupo' && c.colores === 'cada' && c.modo !== 'cruce' && !(c.mods && c.mods.length);
        if (cada && c.hijos.every(x => !x.hueco && x.tipo !== 'grupo')) { const G = matriz4(c.t); c.hijos.filter(x => !x.oculto).forEach(x => pon(x, c.id, x.id, G, tKey(c.t) + '/')); }
        else if (cada) { const r = evalLista(c.hijos.filter(x => !x.oculto), P, false, avisos); r.partes.forEach(x => { const m = N.coloca(x.m, c.t), vista = N.aVista(m); items.push({ id: c.id, sub: x.id, c: Object.assign({}, busca(P, x.id) || {}, { color: x.color, acabado: x.acabado }), vista, b: N.caja(m), vol: m.volume(), hecho: true, k: 'hecho:' + claveDe(c) + '@' + tKey(c.t) + '/' + x.id }); }); }
        else pon(c, c.id, null, null, '');
      } catch (x) { avisos.push((c.nombre || nombreTipo(c)) + ': ' + (x.message || x)); fallan.push(c.id); }
    });
    const partes = [];
    items.forEach(it => {
      const col = it.c.color || '#b4b8bf', ac = it.c.acabado || 'mate';
      if (it.hecho) { partes.push({ id: it.id, sub: it.sub, color: col, acabado: ac, vista: it.vista, caja: it.b, vol: it.vol, clave: it.k }); return; }
      const toca = H.filter(h => cruzan(it.b, h.b));
      if (!toca.length) { const e = it.e, M = it.M; partes.push({ id: it.id, sub: it.sub, color: col, acabado: ac, vista: vistaDe(it.e), matriz: it.M.elements.slice(), caja: it.b, vol: it.vol, clave: it.k, hazM: () => N.transforma(e.m, M) }); return; }
      const k = it.k + '−' + toca.map(h => h.k).join('&');
      let r = csg.get(k);
      if (!r) {
        const m = N.transforma(it.e.m, it.M).subtract(N.union(toca.map(h => N.transforma(h.e.m, h.M))));
        r = m.isEmpty() ? { vacia: true } : guardaCsg(k, { vista: N.aVista(m), caja: N.caja(m), vol: m.volume() });
      } else { csg.delete(k); csg.set(k, r); }
      if (!r.vacia) { const e = it.e, M = it.M, T2 = toca.map(h => ({ m: h.e.m, M: h.M })); partes.push({ id: it.id, sub: it.sub, color: col, acabado: ac, vista: r.vista, caja: r.caja, vol: r.vol, clave: k, hazM: () => N.transforma(e.m, M).subtract(N.union(T2.map(h => N.transforma(h.m, h.M)))) }); }
    });
    const huecos = H.map(h => ({ id: h.c.id, vista: vistaDe(h.e), matriz: h.M.elements.slice() }));
    const proxies = vis.map(c => { try { return { id: c.id, vista: vistaDe(entradaDe(c, P)), t: c.t }; } catch (e) { return null; } }).filter(Boolean);
    // 3) números rápidos (la caja de todo y el volumen sumado); lo exacto, con infoExacta() cuando no se toca nada
    let info = null;
    if (partes.length) {
      const mn = [0, 1, 2].map(k => Math.min(...partes.map(x => x.caja.min[k]))), mx = [0, 1, 2].map(k => Math.max(...partes.map(x => x.caja.max[k])));
      const solapan = partes.some((a, i) => partes.some((b, j) => j > i && cruzan(a.caja, b.caja, -0.01)));
      info = { dims: mx.map((v, k) => v - mn[k]), min: mn, max: mx, vol: partes.reduce((a, x) => a + (x.vol || 0), 0), area: 0, piezas: solapan ? null : partes.length, rapido: true };
      info.area = estimaArea(partes);
    }
    return { partes, huecos, proxies, info, avisos, fallan, ms: Math.round(performance.now() - t0) };
  } finally { N.limpia(); }
}
// área aproximada (para los gramos): la de cada malla de pantalla, escalada por su matriz
function estimaArea(partes) {
  let A = 0;
  partes.forEach(x => { const v = x.vista; if (!v.area) { let s = 0; const P = v.pos, I = v.idx; for (let i = 0; i < I.length; i += 3) { const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3, ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2]; s += Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx) / 2; } v.area = s; }
    let f = 1; if (x.matriz) { const e = x.matriz, sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]); f = (sx * sy + sy * sz + sx * sz) / 3; } A += v.area * f; });
  return A;
}
// Lo EXACTO de todo junto (volumen sin contar dos veces lo que se pisa, piezas sueltas): más lento, solo cuando no se toca nada
export function infoExacta(P) {
  try { const L = partesFinales(P); if (!L.length) return null; const tot = N.union(L.map(x => x.m)), i = N.info(tot); i.piezas = tot.decompose().length; return i; }
  finally { N.limpia(); }
}
const vistaDe = e => e.vista || (e.vista = N.aVista(e.m));
function vistaLocal(c, m) { const k = claveDe(c), e = cache.get(k); if (e) return vistaDe(e); return N.aVista(m); }
// Para exportar: las partes (Manifold) con su color. ¡Llamar a N.limpia() después!
export function partesFinales(P, porColor = false) {
  const r = evalLista(P.cuerpos.filter(c => !c.oculto), P);
  // v20.2 · «Unir»: lo creado con la operación UNIR (c.une = la pieza con la que se une) sale fundido con ella en UNA pieza
  const partes = r.partes.slice(), porId = new Map(); partes.forEach(x => { if (!x.sub) porId.set(x.id, x); });
  partes.forEach(x => { const c = !x.sub && busca(P, x.id); if (c && c.une && porId.get(c.une) && porId.get(c.une) !== x) { const t = porId.get(c.une); t.m = t.m.add(x.m); x.fundida = true; } });
  let L = partes.filter(x => !x.fundida).map(x => ({ m: x.m, color: x.color || '#b4b8bf', nombre: (busca(P, x.sub || x.id) || {}).nombre || 'parte' }));
  if (porColor) { // un objeto por color; lo que se pisa se queda con el color del cuerpo que va DESPUÉS en la lista
    const cols = [...new Set(L.map(x => x.color))], out = [];
    cols.forEach(col => { const mios = L.filter(x => x.color === col), idx = L.indexOf(mios[mios.length - 1]); let m = N.union(mios.map(x => x.m)); const encima = L.filter((x, i) => x.color !== col && i > L.indexOf(mios[0])); if (encima.length) m = m.subtract(N.union(encima.map(x => x.m))); if (!m.isEmpty()) out.push({ m, color: col, nombre: mios.map(x => x.nombre).slice(0, 2).join('+') }); void idx; });
    L = out;
  }
  return L;
}
export function cajaDe(P, ids) { try { const L = []; recorre(P.cuerpos, c => { if (ids.includes(c.id)) L.push(colocado(c, P)); }); if (!L.length) return null; return N.caja(N.union(L)); } finally { N.limpia(); } }

// ---------- cambiar ----------
export function añadir(P, c, dentro) { c.id = c.id || nuevoId(); c.t = c.t || T0(); c.color = c.color || '#b4b8bf'; c.acabado = c.acabado || 'mate'; if (c.n == null) c.n = nuevoPaso(P); (dentro ? dentro.hijos : P.cuerpos).push(c); return c; }
// ---------- v20.2 · LÍNEA DE TIEMPO (como la de Fusion, pero fácil) ----------
// Cada cuerpo lleva «n»: el PASO en que se creó (las copias de una matriz o de un duplicado comparten el suyo). P.marca = ver el
// diseño solo HASTA ese paso (⏪); lo que se crea entonces se mete justo ahí y lo de después se corre (como en Fusion).
export function asignaPasos(P) { let k = 0; const visita = L => L.forEach(c => { if (c.hijos) visita(c.hijos); if (c.n == null) c.n = ++k; else k = Math.max(k, c.n); }); visita(P.cuerpos || []); P.paso = Math.max(P.paso || 0, k); return P; }
export function nuevoPaso(P) {
  if (P.paso == null) asignaPasos(P);
  if (P.marca != null && P.marca < P.paso) { recorre(P.cuerpos, x => { if (x.n > P.marca) x.n++; }); P.paso++; return ++P.marca; }
  P.marca = null; return ++P.paso;
}
const nPaso = c => (c.n == null ? 0 : c.n);
// el proyecto «visto hasta el paso marca»: lo creado después no está; si un grupo es posterior, sus piezas salen sueltas en su sitio
export function hastaPaso(P, marca) {
  if (marca == null || marca >= (P.paso || 0)) return P;
  const filtra = L => L.filter(c => nPaso(c) <= marca).map(c => (c.hijos ? Object.assign({}, c, { hijos: filtra(c.hijos) }) : c));
  const out = [], visita = (L, G) => L.forEach(c => {
    if (nPaso(c) <= marca) { const x = c.hijos ? Object.assign({}, c, { hijos: filtra(c.hijos) }) : c; out.push(G ? Object.assign({}, x, { t: deMatriz(G.clone().multiply(matriz4(c.t))) }) : x); }
    else if (c.hijos) visita(c.hijos, G ? G.clone().multiply(matriz4(c.t)) : matriz4(c.t));
  });
  visita(P.cuerpos, null);
  return Object.assign({}, P, { cuerpos: out });
}
// los pasos, en orden: [{ n, ids, c (el principal: el de más arriba del árbol), nivel }]
export function pasos(P) {
  if (P.paso == null) asignaPasos(P);
  const M = new Map(); const visita = (L, nivel) => L.forEach(c => { const k = nPaso(c); let s = M.get(k); if (!s) M.set(k, s = { n: k, ids: [], c, nivel }); s.ids.push(c.id); if (nivel < s.nivel) { s.c = c; s.nivel = nivel; } if (c.hijos) visita(c.hijos, nivel + 1); });
  visita(P.cuerpos, 0);
  return [...M.values()].sort((a, b) => a.n - b.n);
}
// la matriz de un cuerpo EN EL MUNDO (con la de sus grupos) y su caja en el mundo
export function matrizMundo(P, id) { const camino = []; let x = busca(P, id); while (x) { camino.unshift(x); x = padreDe(P, x.id); } return camino.reduce((M, c) => M.multiply(matriz4(c.t)), new T.Matrix4()); }
// v20.4 · ⌖ LOS CENTROS de un cuerpo (en el mundo): el de su CAJA (geométrico) y el de MASA (si fuera maciza y de un solo material:
// el punto donde se equilibra). No son lo mismo si la pieza no es simétrica (un gancho, una L…).
export function centros(P, id) {
  try { const c = busca(P, id); if (!c) return null; const m = N.transforma(localDe(c, P), matrizMundo(P, id)), b = N.caja(m), v = N.aVista(m), X = v.pos, I = v.idx;
    let V = 0, cx = 0, cy = 0, cz = 0;
    for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, e = I[t + 1] * 3, f = I[t + 2] * 3, ax = X[a], ay = X[a + 1], az = X[a + 2], bx = X[e], by = X[e + 1], bz = X[e + 2], qx = X[f], qy = X[f + 1], qz = X[f + 2];
      const d = (ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx)) / 6; V += d; cx += d * (ax + bx + qx) / 4; cy += d * (ay + by + qy) / 4; cz += d * (az + bz + qz) / 4; }
    return { caja: [0, 1, 2].map(k => r3((b.min[k] + b.max[k]) / 2)), masa: V ? [cx / V, cy / V, cz / V].map(r3) : null, vol: V, dims: b.dims }; }
  finally { N.limpia(); }
}
export function cajaMundoId(P, id) { const c = busca(P, id); if (!c) return null; try { return cajaMundo(cajaLocal(entradaDe(c, P)), matrizMundo(P, id)); } catch (e) { return null; } finally { N.limpia(); } }
export function borrar(P, ids) { const quita = L => L.filter(c => !ids.includes(c.id)).map(c => (c.hijos ? Object.assign(c, { hijos: quita(c.hijos) }) : c)); P.cuerpos = quita(P.cuerpos); }
const copia = (c, paso) => { const n = JSON.parse(JSON.stringify(c)); recorre([n], x => { x.id = nuevoId(); if (paso != null) x.n = paso; }); return n; };
export function duplicar(P, ids, dx = 10) { const nuevos = [], paso = ids.length ? nuevoPaso(P) : null; ids.forEach(id => { const c = busca(P, id); if (!c) return; const n = copia(c, paso); n.nombre = (c.nombre || nombreTipo(c)) + ' (copia)'; n.t.pos[0] += dx; listaDe(P, id).push(n); nuevos.push(n.id); }); return nuevos; }
export function espejo(P, ids, eje) { const k = { x: 0, y: 1, z: 2 }[eje]; ids.forEach(id => { const c = busca(P, id); if (c) c.t.esc[k] *= -1; }); }
// matriz: copias en fila (dx, dy, dz), en REJILLA (n × n2) o en CÍRCULO alrededor de un eje (v20.2: cualquier eje: el de la
// cama, el de la propia pieza, X, Y o uno de construcción; «girar» = cada copia gira con el círculo, como en Fusion)
// Devuelve las transformaciones de cada copia (para la vista previa) con transformacionesMatriz() y crea el grupo con matriz().
export function transformacionesMatriz(c, o) {
  const n = Math.max(2, Math.min(200, Math.round(o.n || 3))), L = [];
  if (o.tipo === 'circular') {
    const eje = o.eje || { o: [o.cx || 0, o.cy || 0, 0], dir: [0, 0, 1] }, A = o.angulo || 360, M0 = matriz4(c.t);
    const ax = new T.Vector3(...eje.dir).normalize(), cen = new T.Vector3(...eje.o);
    for (let i = 1; i < n; i++) {
      const a = A * (A >= 360 ? i / n : i / (n - 1)), R = new T.Matrix4().makeRotationAxis(ax, a * Math.PI / 180);
      let M;
      if (o.girar === false) { const p = new T.Vector3(...c.t.pos).sub(cen).applyMatrix4(R).add(cen); M = M0.clone().setPosition(p); }
      else M = new T.Matrix4().makeTranslation(cen.x, cen.y, cen.z).multiply(R).multiply(new T.Matrix4().makeTranslation(-cen.x, -cen.y, -cen.z)).multiply(M0);
      L.push(deMatriz(M));
    }
  } else if (o.tipo === 'rejilla') {
    const n2 = Math.max(1, Math.min(60, Math.round(o.n2 || 2)));
    for (let j = 0; j < n2; j++) for (let i = 0; i < n; i++) { if (!i && !j) continue; const x = JSON.parse(JSON.stringify(c.t)); x.pos[0] += (o.dx || 0) * i; x.pos[1] += (o.dy2 || 0) * j; L.push(x); }
  } else for (let i = 1; i < n; i++) { const x = JSON.parse(JSON.stringify(c.t)); x.pos[0] += (o.dx || 0) * i; x.pos[1] += (o.dy || 0) * i; x.pos[2] += (o.dz || 0) * i; L.push(x); }
  return L;
}
export function matriz(P, id, o) {
  const c = busca(P, id); if (!c) return null; const copias = [c];
  transformacionesMatriz(c, o).forEach(tt => { const x = copia(c); x.t = tt; copias.push(x); });
  const L = listaDe(P, id), i0 = L.indexOf(c); L.splice(i0, 1);
  const g = { id: nuevoId(), nombre: 'Matriz de ' + (c.nombre || nombreTipo(c)), tipo: 'grupo', hijos: copias, modo: 'unir', colores: 'cada', t: T0(), color: c.color, acabado: c.acabado, hueco: !!c.hueco, n: nuevoPaso(P) };
  copias.slice(1).forEach(x => recorre([x], y => { y.n = g.n; }));
  if (c.hueco) copias.forEach(x => { x.hueco = false; });
  L.splice(i0, 0, g); return g;
}
// agrupar: los cuerpos pasan a ser hijos de un grupo nuevo (con su punto de giro en el centro de su base)
export function agrupar(P, ids, modo = 'unir', paso = null) {
  const sel = []; recorre(P.cuerpos, c => { if (ids.includes(c.id)) sel.push(c); });
  if (sel.length < (modo === 'cruce' ? 2 : 1)) return null;
  const L = listaDe(P, sel[0].id), i0 = Math.min(...sel.map(c => listaDe(P, c.id) === L ? L.indexOf(c) : 1e9).filter(x => x < 1e9));
  const b = cajaDe(P, sel.map(c => c.id)) || { min: [0, 0, 0], max: [0, 0, 0] }, piv = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, b.min[2]];
  borrar(P, sel.map(c => c.id));
  sel.forEach(c => { c.t.pos = c.t.pos.map((v, k) => v - piv[k]); });
  const sol = sel.find(c => !c.hueco) || sel[0];
  const g = { id: nuevoId(), nombre: modo === 'cruce' ? 'Intersección' : sel.some(c => c.hueco) ? 'Resta' : 'Unión', tipo: 'grupo', modo, hijos: sel, colores: 'uno', t: { pos: piv, rot: [0, 0, 0], esc: [1, 1, 1] }, color: sol.color, acabado: sol.acabado, n: paso != null ? paso : nuevoPaso(P) };
  const destino = listaDe(P, sel[0].id) === L ? L : P.cuerpos; destino.splice(Math.max(0, Math.min(i0, destino.length)), 0, g);
  return g;
}
// desagrupar: los hijos vuelven a la lista con su posición de verdad (se compone la del grupo con la suya)
export function desagrupar(P, id) {
  const g = busca(P, id); if (!g || g.tipo !== 'grupo') return [];
  const L = listaDe(P, id), i0 = L.indexOf(g), G = matriz4(g.t);
  const hijos = g.hijos.map(c => { const m = G.clone().multiply(matriz4(c.t)), p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(); m.decompose(p, q, s); const e = new T.Euler().setFromQuaternion(q, 'ZYX');
    c.t = { pos: p.toArray().map(r3), rot: [e.x, e.y, e.z].map(a => r3(a * 180 / Math.PI)), esc: s.toArray().map(r3) };
    if (g.colores === 'uno') { c.color = g.color; c.acabado = g.acabado; } if (g.hueco) c.hueco = true; return c; });
  L.splice(i0, 1, ...hijos); return hijos.map(c => c.id);
}
const r3 = x => Math.round(x * 1000) / 1000;
// v20.2 · de una matriz (three.js) a { pos, rot (grados, ZYX = Manifold.rotate), esc } (con el espejo en la escala si lo hay)
export function deMatriz(M) { const p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(); M.decompose(p, q, s); const e = new T.Euler().setFromQuaternion(q, 'ZYX'); return { pos: p.toArray().map(r3), rot: [e.x, e.y, e.z].map(a => r3(a * 180 / Math.PI)), esc: s.toArray().map(r3) }; }
// v20.2 · «PONER ESTA CARA EN LA CAMA» (como en Bambu Studio): gira el cuerpo para que esa cara mire hacia abajo y lo apoya
export function caraALaCama(P, id, n) {
  const c = busca(P, id); if (!c) return false; const t = n.slice(), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(...t).normalize(), new T.Vector3(0, 0, -1));
  const M = new T.Matrix4().makeRotationFromQuaternion(q).multiply(matriz4(c.t)); c.t = deMatriz(M); aLaCama(P, [id]); return true;
}
// v20.2 · SIMETRÍA respecto a un PLANO cualquiera (de construcción o de una cara): el cuerpo se refleja (escala negativa)
export function espejoPlano(P, ids, plano, copiar = false) {
  const n = new T.Vector3(...plano.n).normalize(), o = new T.Vector3(...plano.o), d = n.dot(o);
  const R = new T.Matrix4().set(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 2 * d * n.x, -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 2 * d * n.y, -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 2 * d * n.z, 0, 0, 0, 1);
  const out = [], paso = copiar && ids.length ? nuevoPaso(P) : null;
  ids.forEach(id => { const c = busca(P, id); if (!c) return; const x = copiar ? copia(c, paso) : c; x.t = deMatriz(R.clone().multiply(matriz4(c.t))); if (copiar) { x.nombre = (c.nombre || nombreTipo(c)) + ' (simétrica)'; listaDe(P, id).push(x); } out.push(x.id); });
  return out;
}
// v20.2 · CORTAR con un plano: cada cuerpo elegido se parte en dos (o se queda con un lado) → piezas nuevas (mallas)
// devuelve [{ nombre, sopa (Float32Array, centrada), pos }]  · lado: 'ambos' | 'arriba' (hacia donde mira el plano) | 'abajo'
export function cortarPlano(P, ids, plano, lado = 'ambos') {
  try {
    const n = new T.Vector3(...plano.n).normalize(), off = n.dot(new T.Vector3(...plano.o)), out = [];
    ids.forEach(id => {
      const c = busca(P, id); if (!c) return; const m = colocado(c, P), [a, b] = m.splitByPlane([n.x, n.y, n.z], off);
      [['arriba', a], ['abajo', b]].forEach(([k, x]) => { if ((lado === 'ambos' || lado === k) && !x.isEmpty()) out.push({ de: id, nombre: (c.nombre || nombreTipo(c)) + (lado === 'ambos' ? (k === 'arriba' ? ' · A' : ' · B') : ''), color: c.color, acabado: c.acabado, m: x }); });
    });
    if (!out.length) N.mal('Por ahí el plano no corta nada: muévelo hacia dentro de la pieza.');
    return out.map(x => { const bb = N.caja(x.m), cx = (bb.min[0] + bb.max[0]) / 2, cy = (bb.min[1] + bb.max[1]) / 2, s = N.aSopa(x.m.translate([-cx, -cy, -bb.min[2]])); return Object.assign(x, { m: null, sopa: s, pos: [cx, cy, bb.min[2]] }); });
  } finally { N.limpia(); }
}
// v20.2 · GEOMETRÍA DE CONSTRUCCIÓN: planos y ejes que no se imprimen (P.cons). Un plano: { o, n, u }; un eje: { o, dir }.
export const PLANOS_BASE = { xy: { t: 'Plano XY (la cama)', n: [0, 0, 1], u: [1, 0, 0] }, xz: { t: 'Plano XZ (de frente)', n: [0, -1, 0], u: [1, 0, 0] }, yz: { t: 'Plano YZ (de lado)', n: [1, 0, 0], u: [0, 1, 0] } };
export function construccionDe(P) { return (P.cons || []).map(c => Object.assign({}, c, geomCons(c))); }
// c = { id, tipo:'plano', base:'xy'|'xz'|'yz'|'cara', d (desfase mm), ang (°, gira alrededor de su eje «u»), o?, n?, u? (si base='cara') }
//     { id, tipo:'eje', base:'x'|'y'|'z'|'normal', o: [x,y,z], dir? }
export function geomCons(c) {
  if (c.tipo === 'eje') { const dir = c.base === 'x' ? [1, 0, 0] : c.base === 'y' ? [0, 1, 0] : c.base === 'z' ? [0, 0, 1] : (c.dir || [0, 0, 1]); return { o: (c.o || [0, 0, 0]).slice(), dir }; }
  const B = c.base === 'cara' ? { n: c.n, u: c.u, o: c.o } : Object.assign({ o: [0, 0, 0] }, PLANOS_BASE[c.base || 'xy']);
  let n = new T.Vector3(...B.n).normalize(), u = new T.Vector3(...B.u).normalize();
  if (c.ang) { const R = new T.Matrix4().makeRotationAxis(u, c.ang * Math.PI / 180); n = n.applyMatrix4(R).normalize(); }
  const o = new T.Vector3(...B.o).addScaledVector(n, Number(c.d) || 0);
  return { o: o.toArray().map(r3), n: n.toArray().map(r3), u: u.toArray().map(r3) };
}
export const matriz4 = t => new T.Matrix4().compose(new T.Vector3(...t.pos), new T.Quaternion().setFromEuler(new T.Euler(...t.rot.map(a => a * Math.PI / 180), 'ZYX')), new T.Vector3(...t.esc));
// poner en la cama: que lo más bajo quede en Z = 0
export function aLaCama(P, ids) { ids.forEach(id => { const c = busca(P, id); const b = cajaDe(P, [id]); if (c && b) c.t.pos[2] = r3(c.t.pos[2] - b.min[2]); }); }
// alinear varios cuerpos en un eje (min, centro o max) con el primero de la selección
export function alinear(P, ids, eje, como) {
  const k = { x: 0, y: 1, z: 2 }[eje], ref = cajaDe(P, ids); if (!ref) return;
  const meta = como === 'min' ? ref.min[k] : como === 'max' ? ref.max[k] : (ref.min[k] + ref.max[k]) / 2;
  ids.forEach(id => { const c = busca(P, id), b = cajaDe(P, [id]); if (!c || !b) return; const v = como === 'min' ? b.min[k] : como === 'max' ? b.max[k] : (b.min[k] + b.max[k]) / 2; c.t.pos[k] = r3(c.t.pos[k] + meta - v); });
}
// tamaño exacto: escala el cuerpo para que mida «mm» en ese eje (como en Tinkercad)
export function medirA(P, id, eje, mm, proporcional = false) {
  const c = busca(P, id), b = cajaDe(P, [id]); if (!c || !b) return; const k = { x: 0, y: 1, z: 2 }[eje], d = b.dims[k]; if (!(d > 1e-6) || !(mm > 0)) return;
  const f = mm / d; if (proporcional) c.t.esc = c.t.esc.map(v => r3(v * f)); else c.t.esc[k] = r3(c.t.esc[k] * f);
}

// ---------- deshacer / rehacer ----------
export function historial(P) {
  const atras = [], adelante = []; let actual = JSON.stringify(P);
  return {
    apunta(P2) { const s = JSON.stringify(P2); if (s === actual) return false; atras.push(actual); if (atras.length > 120) atras.shift(); adelante.length = 0; actual = s; return true; },
    deshacer() { if (!atras.length) return null; adelante.push(actual); actual = atras.pop(); return JSON.parse(actual); },
    rehacer() { if (!adelante.length) return null; atras.push(actual); actual = adelante.pop(); return JSON.parse(actual); },
    get puedeAtras() { return atras.length > 0; }, get puedeAdelante() { return adelante.length > 0; }
  };
}

// ---------- guardar en este aparato (IndexedDB) ----------
const BD = 'celebrir8', AL = 'proyectos';
function abreBD() { return new Promise((res, rej) => { const r = indexedDB.open(BD, 1); r.onupgradeneeded = () => { r.result.createObjectStore(AL, { keyPath: 'id' }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
const tx = (modo, f) => abreBD().then(db => new Promise((res, rej) => { const t = db.transaction(AL, modo), s = t.objectStore(AL), r = f(s); t.oncomplete = () => { db.close(); res(r && r.result); }; t.onerror = () => { db.close(); rej(t.error); }; }));
export function mallasDe(P) { const ids = new Set(); recorre(P.cuerpos, c => { if (c.tipo === 'malla' && c.p && c.p.malla) ids.add(c.p.malla); }); const o = {}; ids.forEach(id => { const m = MALLAS.get(id); if (m) o[id] = m; }); return o; }
// v20.4 · las fotos para calcar que usa el proyecto (en los bocetos: p.calco.img; y las de referencia en 3D)
export function imagenesDe(P) { const o = {}; JSON.stringify(P).replace(/"img":"(i[0-9a-z]+)"/g, (x, id) => { const I = IMAGENES.get(id); if (I) o[id] = I; return x; }); return o; }
const ponImagenes = o => Object.entries(o || {}).forEach(([k, v]) => { if (v && v.url) IMAGENES.set(k, v); });
export function guardar(P, foto) { return tx('readwrite', s => s.put({ id: P.id, nombre: P.nombre, fecha: Date.now(), json: JSON.stringify(P), mallas: mallasDe(P), imagenes: imagenesDe(P), foto: foto || '' })); }
export function lista() { return tx('readonly', s => s.getAll()).then(L => (L || []).map(x => ({ id: x.id, nombre: x.nombre, fecha: x.fecha, foto: x.foto })).sort((a, b) => b.fecha - a.fecha)); }
export function abrir(id) { return tx('readonly', s => s.get(id)).then(x => { if (!x) throw new Error('No encuentro ese proyecto.'); Object.entries(x.mallas || {}).forEach(([k, v]) => MALLAS.set(k, v instanceof Float32Array ? v : new Float32Array(v))); ponImagenes(x.imagenes); return JSON.parse(x.json); }); }
export function quitar(id) { return tx('readwrite', s => s.delete(id)); }
// archivo .r8 (para llevártelo a otro PC): JSON con las mallas en base64
export function aArchivo(P) {
  const b64 = f => { const u = new Uint8Array(f.buffer, f.byteOffset, f.byteLength); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
  const m = mallasDe(P); return JSON.stringify({ celebrir8: 20, proyecto: P, mallas: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, b64(v)])), imagenes: imagenesDe(P) });
}
export function deArchivo(txt) {
  const o = JSON.parse(txt); if (!o || !o.proyecto) throw new Error('Ese archivo no es un proyecto de CelebriR8.');
  Object.entries(o.mallas || {}).forEach(([k, v]) => { const s = atob(v), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); MALLAS.set(k, new Float32Array(u.buffer)); });
  ponImagenes(o.imagenes);
  return o.proyecto;
}
