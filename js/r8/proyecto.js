// ================= v20 · 🧊 CelebriR8 · EL PROYECTO (lo que hay en el Estudio) =================
// Un proyecto es una lista de CUERPOS, como el «navegador» de Fusion. Cada cuerpo es una forma (caja, cilindro, texto…),
// un BOCETO extruido, una pieza del catálogo, un STL importado o un GRUPO de cuerpos. Cada uno puede ser SÓLIDO o HUECO
// (como en Tinkercad: el hueco se resta de lo que toca), tener su color y su acabado, y estar movido, girado o escalado.
// Todo es JSON sencillo, así deshacer/rehacer y guardar es copiar el JSON. Las mallas grandes (STL importados) van aparte.
import * as N from './nucleo.js';
import * as T from '../../vendor/three/three_r8.js';

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
const cache = new Map(); // clave → { m (guardada), vista }
const MAXC = 80;
function guardaCache(k, m) { if (cache.size >= MAXC) { const [k0, v0] = cache.entries().next().value; cache.delete(k0); N.sueltaCache(v0.m); } const e = { m: N.guarda(m), vista: null }; N.protegidas.add(e.m); cache.set(k, e); return e; }
const claveDe = c => c.tipo === 'grupo' ? null : JSON.stringify([c.tipo, c.p, c.mods || null]);
// La pieza de un cuerpo en SU sitio de origen (sin mover ni girar)
function localDe(c, P) {
  if (c.tipo === 'grupo') return grupoLocal(c, P);
  const k = claveDe(c), e = cache.get(k); if (e) { cache.delete(k); cache.set(k, e); return e.m; }
  let m;
  if (c.tipo === 'boceto') m = N.boceto(c.p);
  else if (c.tipo === 'malla') { const s = MALLAS.get(c.p.malla); if (!s) N.mal('Falta la pieza «' + (c.nombre || '') + '» (vuelve a importarla).'); m = N.deSopa(s); }
  else if (c.tipo === 'cat') { const g = GEN[c.p.k]; if (!g) N.mal('No encuentro el diseño «' + c.p.k + '».'); m = g(c.p); }
  else m = N.forma3d(c.tipo, c.p);
  if (c.p && c.p.vaciar > 0) m = N.vaciar(m, c.p.vaciar, c.p.vaciarAbierta !== false);
  if (c.mods && c.mods.length) m = N.deformar(m, c.mods);
  return guardaCache(k, m).m;
}
export const colocado = (c, P) => N.coloca(localDe(c, P), c.t);
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
// Lo que se ve: las partes con su color, los huecos de cristal y los «proxies» (cada cuerpo, para tocarlo)
export function evaluar(P) {
  const t0 = performance.now(), avisos = [];
  try {
    const vis = P.cuerpos.filter(c => !c.oculto), r = evalLista(vis, P, false, avisos);
    const partes = r.partes.map(x => ({ id: x.id, color: x.color || '#7c6cff', acabado: x.acabado || 'mate', vista: N.aVista(x.m) }));
    const huecos = vis.filter(c => c.hueco).map(c => { try { return { id: c.id, vista: N.aVista(colocado(c, P)) }; } catch (e) { return null; } }).filter(Boolean);
    const proxies = vis.map(c => { try { const m = localDe(c, P); return { id: c.id, vista: vistaLocal(c, m), t: c.t }; } catch (e) { return null; } }).filter(Boolean);
    let info = null;
    if (r.partes.length) { const tot = N.union(r.partes.map(x => x.m)); info = N.info(tot); info.piezas = tot.decompose().length; }
    return { partes, huecos, proxies, info, avisos, ms: Math.round(performance.now() - t0) };
  } finally { N.limpia(); }
}
function vistaLocal(c, m) { const k = claveDe(c); if (k) { const e = cache.get(k); if (e) return e.vista || (e.vista = N.aVista(m)); } return N.aVista(m); }
// Para exportar: las partes (Manifold) con su color. ¡Llamar a N.limpia() después!
export function partesFinales(P, porColor = false) {
  const r = evalLista(P.cuerpos.filter(c => !c.oculto), P);
  let L = r.partes.map(x => ({ m: x.m, color: x.color || '#7c6cff', nombre: (busca(P, x.sub || x.id) || {}).nombre || 'parte' }));
  if (porColor) { // un objeto por color; lo que se pisa se queda con el color del cuerpo que va DESPUÉS en la lista
    const cols = [...new Set(L.map(x => x.color))], out = [];
    cols.forEach(col => { const mios = L.filter(x => x.color === col), idx = L.indexOf(mios[mios.length - 1]); let m = N.union(mios.map(x => x.m)); const encima = L.filter((x, i) => x.color !== col && i > L.indexOf(mios[0])); if (encima.length) m = m.subtract(N.union(encima.map(x => x.m))); if (!m.isEmpty()) out.push({ m, color: col, nombre: mios.map(x => x.nombre).slice(0, 2).join('+') }); void idx; });
    L = out;
  }
  return L;
}
export function cajaDe(P, ids) { try { const L = []; recorre(P.cuerpos, c => { if (ids.includes(c.id)) L.push(colocado(c, P)); }); if (!L.length) return null; return N.caja(N.union(L)); } finally { N.limpia(); } }

// ---------- cambiar ----------
export function añadir(P, c, dentro) { c.id = c.id || nuevoId(); c.t = c.t || T0(); c.color = c.color || '#7c6cff'; c.acabado = c.acabado || 'mate'; (dentro ? dentro.hijos : P.cuerpos).push(c); return c; }
export function borrar(P, ids) { const quita = L => L.filter(c => !ids.includes(c.id)).map(c => (c.hijos ? Object.assign(c, { hijos: quita(c.hijos) }) : c)); P.cuerpos = quita(P.cuerpos); }
const copia = c => { const n = JSON.parse(JSON.stringify(c)); recorre([n], x => { x.id = nuevoId(); }); return n; };
export function duplicar(P, ids, dx = 10) { const nuevos = []; ids.forEach(id => { const c = busca(P, id); if (!c) return; const n = copia(c); n.nombre = (c.nombre || nombreTipo(c)) + ' (copia)'; n.t.pos[0] += dx; listaDe(P, id).push(n); nuevos.push(n.id); }); return nuevos; }
export function espejo(P, ids, eje) { const k = { x: 0, y: 1, z: 2 }[eje]; ids.forEach(id => { const c = busca(P, id); if (c) c.t.esc[k] *= -1; }); }
// matriz: copias en fila (dx, dy, dz) o en círculo (alrededor del centro de la cama, «angulo» en total)
export function matriz(P, id, o) {
  const c = busca(P, id); if (!c) return null; const n = Math.max(2, Math.min(60, Math.round(o.n || 3))), copias = [c];
  for (let i = 1; i < n; i++) {
    const x = copia(c);
    if (o.tipo === 'circular') { const a = (o.angulo || 360) * (o.angulo >= 360 ? i / n : i / (n - 1)), r = a * Math.PI / 180, [px, py] = [c.t.pos[0] - (o.cx || 0), c.t.pos[1] - (o.cy || 0)];
      x.t.pos[0] = (o.cx || 0) + px * Math.cos(r) - py * Math.sin(r); x.t.pos[1] = (o.cy || 0) + px * Math.sin(r) + py * Math.cos(r); x.t.rot[2] = (c.t.rot[2] || 0) + a; }
    else { x.t.pos[0] += (o.dx || 0) * i; x.t.pos[1] += (o.dy || 0) * i; x.t.pos[2] += (o.dz || 0) * i; }
    copias.push(x);
  }
  const L = listaDe(P, id), i0 = L.indexOf(c); L.splice(i0, 1);
  const g = { id: nuevoId(), nombre: 'Matriz de ' + (c.nombre || nombreTipo(c)), tipo: 'grupo', hijos: copias, modo: 'unir', colores: 'cada', t: T0(), color: c.color, acabado: c.acabado, hueco: !!c.hueco };
  if (c.hueco) copias.forEach(x => { x.hueco = false; });
  L.splice(i0, 0, g); return g;
}
// agrupar: los cuerpos pasan a ser hijos de un grupo nuevo (con su punto de giro en el centro de su base)
export function agrupar(P, ids, modo = 'unir') {
  const sel = []; recorre(P.cuerpos, c => { if (ids.includes(c.id)) sel.push(c); });
  if (sel.length < (modo === 'cruce' ? 2 : 1)) return null;
  const L = listaDe(P, sel[0].id), i0 = Math.min(...sel.map(c => listaDe(P, c.id) === L ? L.indexOf(c) : 1e9).filter(x => x < 1e9));
  const b = cajaDe(P, sel.map(c => c.id)) || { min: [0, 0, 0], max: [0, 0, 0] }, piv = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, b.min[2]];
  borrar(P, sel.map(c => c.id));
  sel.forEach(c => { c.t.pos = c.t.pos.map((v, k) => v - piv[k]); });
  const sol = sel.find(c => !c.hueco) || sel[0];
  const g = { id: nuevoId(), nombre: modo === 'cruce' ? 'Intersección' : sel.some(c => c.hueco) ? 'Resta' : 'Unión', tipo: 'grupo', modo, hijos: sel, colores: 'uno', t: { pos: piv, rot: [0, 0, 0], esc: [1, 1, 1] }, color: sol.color, acabado: sol.acabado };
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
export function guardar(P, foto) { return tx('readwrite', s => s.put({ id: P.id, nombre: P.nombre, fecha: Date.now(), json: JSON.stringify(P), mallas: mallasDe(P), foto: foto || '' })); }
export function lista() { return tx('readonly', s => s.getAll()).then(L => (L || []).map(x => ({ id: x.id, nombre: x.nombre, fecha: x.fecha, foto: x.foto })).sort((a, b) => b.fecha - a.fecha)); }
export function abrir(id) { return tx('readonly', s => s.get(id)).then(x => { if (!x) throw new Error('No encuentro ese proyecto.'); Object.entries(x.mallas || {}).forEach(([k, v]) => MALLAS.set(k, v instanceof Float32Array ? v : new Float32Array(v))); return JSON.parse(x.json); }); }
export function quitar(id) { return tx('readwrite', s => s.delete(id)); }
// archivo .r8 (para llevártelo a otro PC): JSON con las mallas en base64
export function aArchivo(P) {
  const b64 = f => { const u = new Uint8Array(f.buffer, f.byteOffset, f.byteLength); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
  const m = mallasDe(P); return JSON.stringify({ celebrir8: 20, proyecto: P, mallas: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, b64(v)])) });
}
export function deArchivo(txt) {
  const o = JSON.parse(txt); if (!o || !o.proyecto) throw new Error('Ese archivo no es un proyecto de CelebriR8.');
  Object.entries(o.mallas || {}).forEach(([k, v]) => { const s = atob(v), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); MALLAS.set(k, new Float32Array(u.buffer)); });
  return o.proyecto;
}
