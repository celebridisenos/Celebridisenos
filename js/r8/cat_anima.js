// ================= 18-10-2026 · 🎬 ANIMAR CUALQUIER DISEÑO DEL CATÁLOGO =================
// La dueña: «no puedo hacer animación desde catálogo, eso lo quiero para ver cada cosa» · «los engranajes también, de una forma u otra
// que se engranen y se vea el movimiento de acuerdo» · «a la bici le faltan piezas».
// No hace falta enseñarle a cada uno de los 361 diseños cómo se mueve: se miran sus PIEZAS SUELTAS y se deduce qué hace cada una:
//  · cada pieza redonda tiene su EJE (de pie, como un engranaje en la mesa, o tumbado, como la rueda de la bici) y, si tiene dientes,
//    se le CUENTAN (en el corte de la propia pieza: los picos de su contorno);
//  · dos con dientes que se tocan a la distancia justa (módulo × (z1 + z2) / 2) ENGRANAN: al revés y con la relación EXACTA de dientes,
//    así los dientes no se pisan nunca por muchas vueltas que den (también en las cajas reductoras de dos pisos: cada pareja se mira
//    a la altura en la que se tocan);
//  · lo que comparte centro (rodamientos, anillos antiestrés, planetarios): el de fuera quieto, el de dentro gira y lo de entre medias
//    (satélites, bolas) da vueltas alrededor girando sobre sí mismo, con las cuentas de un planetario de verdad;
//  · lo que va enganchado a un eje que gira (las bielas con sus pedales en el pedalier de la bici) gira con él;
//  · las cadenas de trozos (animales articulados, serpientes): se ondulan como si nadaran, cada trozo sobre su unión;
//  · las bisagras: se abren y se cierran; cualquiera de varias piezas: se desmonta y se vuelve a montar.
// Si el diseño tiene una vista «Montado» (los kits, los engranajes en su placa), la animación se hace con él (lo elige la pantalla).
// Lo que no se puede deducir así no se inventa: solo gira y se desmonta.
import * as T from '../../vendor/three/three_r8.js';

const W0 = 0.25; // vueltas por segundo de lo que mueve todo (el sol, el aro de dentro, el engranaje grande, la rueda)
const suave = (x, a, b) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const girarEje = (o, dir, ang) => new T.Matrix4().makeTranslation(o[0], o[1], o[2]).multiply(new T.Matrix4().makeRotationAxis(new T.Vector3(...dir).normalize(), ang)).multiply(new T.Matrix4().makeTranslation(-o[0], -o[1], -o[2]));

// Lo que no se deduce solo, dicho a mano: «bisagra» = la pieza pequeña se abre sobre su canto · «gira1» = una sola pieza que gira
// (aunque no sea redonda del todo: un spinner) · «quieta» = no se pone a dar vueltas aunque sea redonda (un jarrón, un plato)
export const PISTAS = { bisagraImpresa: 'bisagra', bisagraFuerte: 'bisagra', miniPuerta: 'bisagra', spinner: 'gira1', peonza: 'gira1', tarjetaPeonza: 'gira1', postesCarroceria: 'quieta', inserto: 'quieta' }; // (20-10: los postes y el inserto no giran de verdad)
// las secciones en las que una sola pieza redonda SÍ gira sola (un engranaje, una peonza); en las demás (jarrones, vasos…) no
// 20-10-2026 · «LAS PIEZAS SE MUEVEN SOLAS» (plan maestro). Auditoría de los 372 diseños: giraba TODO lo redondo (las 24 fichas de las damas,
// las 33 del solitario, la maceta con su plato, la calabaza…) y se «ondulaba como un pez» lo que no es articulado (un rodamiento, el arcoíris
// apilable, el riel de pared). Ahora: girar, solo lo que gira de verdad (dientes, ruedas, rodamientos, peonzas…) en diseños que son
// mecanismos o juguetes con ruedas; ondularse, solo los articulados (flexi). Lo demás: «no hay piezas que se muevan solas».
const MECANICOS = new Set(['mecanica', 'rc', 'juguetes', 'impresora3d']);
const RE_GIRA = /rueda|llanta|neum|engran|pi[ñn][oó]n|corona|rodamiento|polea|spool|carrete|yoyo|yo-yo|peonza|spinner|fidget|giratori|bayoneta|rosca|tornillo|planetari|reductora|diferencial|ginebra|leva|biela|taladro|bobina|r[oó]tula|espir[oó]grafo/i;
const RE_ARTICULADO = /flexi|articulad|serpiente/i;
const GIRAN_SOLAS = new Set(['mecanica', 'juegos', 'juguetes', 'ninos', 'kits', 'rc', 'componentes', 'frikis', 'ciencia', 'oficina', 'compatibles', 'impresora3d']);
// la opción de un diseño que lo enseña MONTADO (para animarlo): «ver: montada», «que: montado», «que: pareja» (dos engranados)…
export function opcionMontado(D) {
  for (const c of D.campos || []) { const o = (c.ops || []).find(x => /^(montad[ao]|pareja|montaje)$/.test(String(x[0]))); if (o) return { k: c.k, v: o[0] }; }
  return null;
}

// Los engranajes en su placa, montados, se tocan con la arandela de su eje: al juntarlos salen soldados en una sola pieza. Para animarlos
// se le piden al propio diseño, por separado y en su sitio. → [Manifold] o null
// (los mecanismos que saben su MOVIMIENTO EXACTO —rueda de Ginebra, biela, leva— dan [{ m, mov: { f }, que }]: no se deduce, se usa el suyo)
export async function montadas(k, p) { return (await montadasFn(k))(p); }
// 20-10-2026 · EL MENSAJE DE MEMORIA QUE TAPABA LA ANIMACIÓN: montar el kit (bici, moto, coche RC…) se hacía FUERA del ámbito de limpieza
// (había que esperar a cargar su archivo) y todos los pasos intermedios se quedaban en el motor: medido, 4 kits animados 6 veces
// → de 17 MB a 744 MB, hasta el «memory access out of bounds». Ahora se carga primero el archivo y se devuelve una función SIN esperas,
// para montarlo DENTRO de N.enAmbito (se borra todo lo intermedio).
export async function montadasFn(k) {
  if (['corazonEngranajes', 'mesaEngranajes', 'llaveroEngranajes'].includes(k)) { const G = await import('./cat_engranajes.js'); return p => { const R = G[k](p); return [R.placa].concat(R.piezas.map(q => q.m)); }; }
  if (k === 'cajaEngranajes') { const C = await import('./cat_50.js'); return p => { const R = C.demoEngranajes(p); return [R.placa, R.P1, R.C1, R.S1]; }; }
  if (KITS_EXACTOS[k]) { const f = await KITS_EXACTOS[k](); return p => f(p); }
  const X = await import('./cat_1810.js'); return p => X.montadas1810(k, p) || null;
}
// 20-10-2026 · los KITS que traen su movimiento exacto y, para el 🔧 montaje paso a paso y el manual, el NOMBRE de cada pieza y su PASO
// (el orden de montaje de verdad: primero el casco, luego la cubierta…; tarea 9 del plan maestro)
const KITS_EXACTOS = { aerobarcoRC: () => import('./cat_agua.js').then(A => A.montadasAero), camionRC: () => import('./cat_camion3.js').then(A => A.montadasCamion),
  avionetaRC: () => import('./cat_aire.js').then(A => A.montadasAvion), lanzabolas: () => import('./cat_lanzabolas.js').then(A => A.montadasLanzabolas), // 21-10: la avioneta tenía su animación hecha y sin enganchar
  lanzabolasCompeticion: () => import('./cat_lanzabolas.js').then(A => A.montadasDe('competicion')), lanzabolasTactica: () => import('./cat_lanzabolas.js').then(A => A.montadasDe('tactica')),
  lanzabolasFutura: () => import('./cat_lanzabolas.js').then(A => A.montadasDe('futura')) }; // 21-10 (tarde): los otros 3 modelos del lanzabolas
// 18-10-2026 · lo que trae su movimiento exacto: cada pieza con su matriz en cada momento (la misma con la que se comprueba que no se pisan)
function exactas(N, L) {
  const P = L.map((x, i) => { const b = N.caja(x.m); return { id: 'an' + i, nombre: x.nombre, paso: x.paso, color: x.color, // (21-10: cada pieza puede traer su color: la réplica negra con la punta naranja)
    vista: N.aVista(x.m), b: { min: b.min, max: b.max, dims: b.dims }, c: [0, 1, 2].map(k => (b.min[k] + b.max[k]) / 2), vol: x.m.volume() }; });
  const mov = {}; L.forEach((x, i) => { mov['an' + i] = x.mov ? { tipo: 'exacto', f: x.mov.f } : { tipo: 'quieta' }; });
  return fin(P, mov, null, L.filter(x => x.que).map(x => x.que));
}
// ---------- los EJES: una pieza se mira «de canto» girándola para que su eje quede de pie (z) ----------
// a lo largo de z: tal cual · de y: rotate([90,0,0]) lleva y → z (y el plano: x' = x, y' = −z) · de x: rotate([0,−90,0]) lleva x → z (x' = −z, y' = y)
const EJES = {
  z: { dir: [0, 0, 1], gira: t => t, aMundo: (u, v, a) => [u, v, a], ax: 2, pl: [0, 1] },
  y: { dir: [0, 1, 0], gira: t => t.rotate([90, 0, 0]), aMundo: (u, v, a) => [u, a, -v], ax: 1, pl: [0, 2] },
  x: { dir: [1, 0, 0], gira: t => t.rotate([0, -90, 0]), aMundo: (u, v, a) => [a, v, -u], ax: 0, pl: [1, 2] }
};
// el contorno de fuera de un corte → su centro (por áreas: exacto en un engranaje, tenga los dientes que tenga), su radio y sus DIENTES
function perfil(cs) {
  let polys; try { polys = cs.toPolygons(); } catch (e) { return null; } if (!polys || !polys.length) return null;
  const area = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  let mejor = null, am = 0; polys.forEach(P => { const A = Math.abs(area(P)); if (A > am) { am = A; mejor = P; } }); if (!mejor || mejor.length < 8) return null;
  let cx = 0, cy = 0, A2 = 0; for (let i = 0; i < mejor.length; i++) { const a = mejor[i], b = mejor[(i + 1) % mejor.length], c = a[0] * b[1] - b[0] * a[1]; A2 += c; cx += (a[0] + b[0]) * c; cy += (a[1] + b[1]) * c; } cx /= 3 * A2; cy /= 3 * A2;
  const NB = 1440, R = new Float64Array(NB).fill(-1);
  for (let i = 0; i < mejor.length; i++) { const a = mejor[i], b = mejor[(i + 1) % mejor.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.05));
    for (let k = 0; k < n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t - cx, y = a[1] + (b[1] - a[1]) * t - cy, r = Math.hypot(x, y), j = Math.floor(((Math.atan2(y, x) / (2 * Math.PI)) + 1) % 1 * NB) % NB; if (r > R[j]) R[j] = r; } }
  for (let j = 0; j < NB; j++) if (R[j] < 0) { let k = 1; while (R[(j + k) % NB] < 0 && k < NB) k++; R[j] = R[(j + k) % NB]; }
  let rmax = 0, rmin = 1e9; for (let j = 0; j < NB; j++) { if (R[j] > rmax) rmax = R[j]; if (R[j] < rmin) rmin = R[j]; }
  let z = 0; const sub = []; if (rmax - rmin > 0.35) { const thr = (rmax + rmin) / 2; for (let j = 0; j < NB; j++) { const a = R[j] > thr, b = R[(j + 1) % NB] > thr; if (!a && b) { z++; sub.push(j); } } }
  if (z >= 6) { const d = sub.map((x, i) => ((sub[(i + 1) % z] - x + NB) % NB)), med = NB / z; if (d.some(x => Math.abs(x - med) > 0.35 * med)) z = 0; } else z = 0; // (dientes de verdad: picos regulares)
  return { c: [cx, cy], r: rmax, z, m: z ? 2 * rmax / (z + 2) : 0, area: am };
}
// ¿redonda? (planta casi igual de ancha que de larga y las cuatro esquinas de su caja VACÍAS: un engranaje o un aro sí; una caja no)
function redonda(N, tz, b) {
  const dx = b.dims[0], dy = b.dims[1], M = Math.max(dx, dy); if (M < 4 || Math.abs(dx - dy) > 0.12 * M) return false;
  try { const s = tz.slice((b.min[2] + b.max[2]) / 2); if (s.isEmpty()) return false; const e = 0.14 * M, X = N.CSX();
    for (const [x, y] of [[b.min[0], b.min[1]], [b.max[0] - e, b.min[1]], [b.min[0], b.max[1] - e], [b.max[0] - e, b.max[1] - e]]) if (s.intersect(X.square([e, e]).translate([x, y])).area() > 0.04 * e * e) return false;
    return true; } catch (e) { return false; }
}

// el diseño (un Manifold) → sus piezas sueltas y lo que hace cada una. Todo en datos (la geometría ya pasada a «vista»).
export function analiza(N, m, o = {}) { // o.pista (de PISTAS) · o.cat (la sección del diseño)
  const L = Array.isArray(m) ? m : m.decompose(), max = o.max || 48;
  if (L.length && L[0] && L[0].m && typeof L[0].volume !== 'function') return exactas(N, L);
  if (L.length > max) return { n: L.length, demasiadas: true, piezas: [], mov: {}, cadena: null, notas: [] };
  const P = L.map((t, i) => { const b = N.caja(t); return { id: 'an' + i, t, vista: N.aVista(t), b: { min: b.min, max: b.max, dims: b.dims }, c: [0, 1, 2].map(k => (b.min[k] + b.max[k]) / 2), vol: t.volume() }; });
  const tot = Math.max(...[0, 1, 2].map(k => Math.max(...P.map(p => p.b.max[k])) - Math.min(...P.map(p => p.b.min[k]))));
  // el eje de cada pieza: primero, ¿tiene DIENTES a alguna altura? (un piñón con su manivela no es redondo entero, pero su engranaje
  // sí; su centro sale del engranaje, exacto); si no, ¿es redonda de canto a canto (una rueda, un aro)?
  P.forEach(p => { const d = p.b.dims, orden = ['z', 'y', 'x'].sort((a, b) => d[EJES[a].ax] - d[EJES[b].ax]);
    const pon = (e, tz, bz, cu, z) => { const E = EJES[e]; p.eje = e; p.tz = tz; p.bz = bz; p.uv = cu; p.ar = [bz.min[2], bz.max[2]]; p.z = z; p.r = Math.max(bz.dims[0], bz.dims[1]) / 2; const w = E.aMundo(cu[0], cu[1], 0); w[E.ax] = (p.b.min[E.ax] + p.b.max[E.ax]) / 2; p.centro = w; };
    for (const e of orden) { const E = EJES[e], tz = E.gira(p.t), bz = N.caja(tz); if (Math.min(bz.dims[0], bz.dims[1]) < 4) continue;
      for (const f of [0.5, 0.25, 0.75, 0.12, 0.88]) { const pf = perfil(tz.slice(bz.min[2] + f * bz.dims[2])); if (pf && pf.z) { pon(e, tz, bz, pf.c, pf.z); p.r = pf.r; return; } } }
    for (const e of orden) { const E = EJES[e], u = d[E.pl[0]], v = d[E.pl[1]]; if (Math.abs(u - v) > 0.12 * Math.max(u, v) || Math.max(u, v) < 4) continue;
      const tz = E.gira(p.t), bz = N.caja(tz); if (!redonda(N, tz, bz)) continue; const pf = perfil(tz.slice((bz.min[2] + bz.max[2]) / 2));
      pon(e, tz, bz, pf ? pf.c : [(bz.min[0] + bz.max[0]) / 2, (bz.min[1] + bz.max[1]) / 2], 0); return; } });
  const mov = {}, usada = new Set(), notas = [], grande = P.slice().sort((a, b) => b.vol - a.vol)[0];
  const gira = (p, w) => { mov[p.id] = { tipo: 'gira', o: p.centro, dir: EJES[p.eje].dir, w }; usada.add(p.id); };
  const mismoEje = (a, b) => a.eje && a.eje === b.eje, solapan = (a, b, g = 0) => a.ar[0] - g < b.ar[1] && b.ar[0] - g < a.ar[1], d2 = (a, b) => Math.hypot(a.uv[0] - b.uv[0], a.uv[1] - b.uv[1]);
  // pistas a mano
  const nombre = (o.k || '') + ' ' + (o.t || ''), mecanico = MECANICOS.has(o.cat) || RE_GIRA.test(nombre);
  if (o.pista === 'gira1' && P.length === 1) { const p = P[0]; p.eje = p.eje || 'z'; p.centro = p.centro || p.c; gira(p, W0 * 1.4); return fin(P, mov, null, ['gira sobre sí misma']); }
  if (o.pista === 'bisagra' && P.length >= 2) {
    const fija = grande, mueve = P.filter(p => p !== fija).sort((a, b) => b.vol - a.vol)[0], a = fija.b, b = mueve.b, zc = (b.min[2] + b.max[2]) / 2;
    const dentro = b.min[0] >= a.min[0] - 0.5 && b.max[0] <= a.max[0] + 0.5 && b.min[1] >= a.min[1] - 0.5 && b.max[1] <= a.max[1] + 0.5; let eje;
    if (dentro) eje = b.dims[1] >= b.dims[0] ? { o: [b.min[0], mueve.c[1], zc], dir: [0, -1, 0], ang: 100 } : { o: [mueve.c[0], b.min[1], zc], dir: [1, 0, 0], ang: 100 }; // (una puerta en su marco: sobre su canto largo)
    else if (Math.abs(mueve.c[1] - fija.c[1]) >= Math.abs(mueve.c[0] - fija.c[0])) { const y = mueve.c[1] > fija.c[1] ? (a.max[1] + b.min[1]) / 2 : (a.min[1] + b.max[1]) / 2; eje = { o: [mueve.c[0], y, zc], dir: [mueve.c[1] > fija.c[1] ? -1 : 1, 0, 0], ang: 165 }; }
    else { const x = mueve.c[0] > fija.c[0] ? (a.max[0] + b.min[0]) / 2 : (a.min[0] + b.max[0]) / 2; eje = { o: [x, mueve.c[1], zc], dir: [0, mueve.c[0] > fija.c[0] ? 1 : -1, 0], ang: 165 }; }
    mov[fija.id] = { tipo: 'quieta' }; mov[mueve.id] = Object.assign({ tipo: 'bisagra' }, eje); return fin(P, mov, null, ['se abre y se cierra sobre su bisagra']);
  }
  const R = P.filter(p => p.eje).sort((a, b) => b.r - a.r);
  // 1) lo que comparte centro y está a la misma altura: el de fuera quieto, el de dentro gira, lo de entre medias da vueltas alrededor
  for (const a of R) {
    if (!mecanico) break; // (dos cuencos uno dentro de otro no son un rodamiento)
    if (usada.has(a.id)) continue; const tol = Math.max(1.0, 0.04 * a.r);
    const dentro = R.filter(p => p !== a && !usada.has(p.id) && mismoEje(p, a) && p.r < a.r * 0.97 && d2(p, a) < tol && solapan(p, a));
    if (!dentro.length) continue;
    mov[a.id] = { tipo: 'quieta' }; usada.add(a.id); dentro.sort((x, y) => y.r - x.r).forEach((p, i) => gira(p, (i % 2 ? -1 : 1) * W0));
    const sol = dentro[dentro.length - 1], E = EJES[a.eje];
    const sat = P.filter(p => !usada.has(p.id) && p !== a && solapanE(p, a, E) && radioEn(p, a, E) > sol.r * 0.6 && radioEn(p, a, E) + tamEn(p, E) < a.r * 1.04 && tamEn(p, E) < (a.r - sol.r) * 0.75);
    if (sat.length) {
      const d = sat.reduce((s, p) => s + radioEn(p, a, E), 0) / sat.length, rp = sat.reduce((s, p) => s + tamEn(p, E), 0) / sat.length, zs = sol.z, zp = sat[0].eje ? sat[0].z : 0;
      const ws = mov[sol.id].w, wc = zs && zp ? ws * zs / (zs + zs + 2 * zp) : ws * sol.r / (sol.r + d + rp), wp = zs && zp ? wc - (ws - wc) * zs / zp : wc - (ws - wc) * sol.r / rp; // (corona = sol + 2 × planeta)
      sat.forEach(p => { usada.add(p.id); const cp = p.centro || p.c; mov[p.id] = { tipo: 'orbita', o: a.centro, dir: E.dir, wc, cp, wp }; });
      notas.push(sat.length + (sat.length === 1 ? ' pieza da' : ' piezas dan') + ' vueltas alrededor (como los satélites de un planetario o las bolas de un rodamiento)' + (zs && zp ? ': sol de ' + zs + ' dientes y satélites de ' + zp : ''));
    }
    notas.push('el aro de fuera se queda quieto y lo de dentro gira');
  }
  // 2) cadenas (animales articulados): 5 trozos o más que se tocan unos con otros (va antes que lo redondo: un dragón no son engranajes)
  let cadena = null;
  const alto = Math.max(...P.map(p => p.b.max[2])) - Math.min(...P.map(p => p.b.min[2])), planta = Math.max(Math.max(...P.map(p => p.b.max[0])) - Math.min(...P.map(p => p.b.min[0])), Math.max(...P.map(p => p.b.max[1])) - Math.min(...P.map(p => p.b.min[1])));
  if (!Object.keys(mov).length && P.length >= 5 && !R.some(p => p.z || p.eje !== 'z') && alto < 0.35 * planta && (RE_ARTICULADO.test(nombre) || o.pista === 'cadena')) { cadena = cadenaDe(P, grande); if (cadena) notas.push('se ondula como si nadara: cada trozo gira un poco sobre su unión'); }
  // 3) ENGRANAJES: dos con dientes, mismo eje, a la altura en que se tocan, a la distancia justa → engranan con la relación exacta
  const S = cadena ? [] : R.filter(p => !usada.has(p.id)), pares = [];
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) { const a = S[i], b = S[j]; if (!mismoEje(a, b) || !solapan(a, b)) continue;
    const lo = Math.max(a.ar[0], b.ar[0]), hi = Math.min(a.ar[1], b.ar[1]);
    for (const f of [0.5, 0.3, 0.7, 0.15, 0.85]) { const h = lo + f * (hi - lo), pa = perfil(a.tz.slice(h)), pb = perfil(b.tz.slice(h)); if (!pa || !pb || !pa.z || !pb.z) continue;
      const mm = (pa.m + pb.m) / 2, dd = Math.hypot(pa.c[0] - pb.c[0], pa.c[1] - pb.c[1]); if (Math.abs(pa.m - pb.m) > 0.12 * mm || Math.abs(dd - mm * (pa.z + pb.z) / 2) > 0.08 * mm * (pa.z + pb.z) / 2) continue;
      pares.push({ a, b, za: pa.z, zb: pb.z }); break; } }
  if (pares.length) { const raiz = pares.map(x => x.a).concat(pares.map(x => x.b)).sort((x, y) => y.r - x.r)[0], cola = [raiz]; gira(raiz, W0 * 0.6);
    while (cola.length) { const a = cola.shift(); pares.forEach(q => { const [x, y, zx, zy] = q.a === a ? [q.a, q.b, q.za, q.zb] : q.b === a ? [q.b, q.a, q.zb, q.za] : []; if (!x || mov[y.id]) return; gira(y, -mov[x.id].w * zx / zy); cola.push(y); }); }
    { const tren = Object.values(mov).filter(x => x.tipo === 'gira'), wm = Math.max(...tren.map(x => Math.abs(x.w))); tren.forEach(x => { x.w *= W0 * 1.2 / wm; }); } // (el más rápido, a 0,3 vueltas por segundo: en una reductora, la salida va despacio de verdad)
    notas.push(pares.length === 1 ? 'los dos engranajes engranan: ' + pares[0].za + ' y ' + pares[0].zb + ' dientes' + (pares[0].za === pares[0].zb ? ' (giran a la par, cada uno al revés que el otro)' : ' (el pequeño gira ' + (Math.max(pares[0].za, pares[0].zb) / Math.min(pares[0].za, pares[0].zb)).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' veces más deprisa)') : pares.length + ' parejas de engranajes engranan, cada una con su relación exacta de dientes'); }
  // 4) lo redondo que queda suelto: gira sobre su eje (una rueda, un engranaje sin pareja); un plato junto a una figura, no
  const rueda = p => p.z || (p.eje && (p.b.dims[EJES[p.eje].ax] < 0.8 * 2 * p.r || p.r < 8)); // (con dientes, un disco o un eje fino —el del pedalier—: no un poste gordo ni un cuenco alto)
  const sueltas = S.filter(p => !usada.has(p.id) && mecanico && rueda(p)), soloAdorno = // (fuera de los mecanismos, un borde ondulado —maceta facetada, pétalos— parece «dientes»: solo giran los engranajes que engranan, paso 3)
    (sueltas.length === 1 && P.length > 1 && grande === sueltas[0] && !sueltas[0].z) || (sueltas.length === 1 && P.length > 1 && grande !== sueltas[0] && !sueltas[0].z && sueltas[0].eje === 'z') || (P.length === 1 && !(GIRAN_SOLAS.has(o.cat) && (RE_GIRA.test(nombre) || (P[0].z && mecanico)))) || o.pista === 'quieta';
  if (sueltas.length && !soloAdorno) { sueltas.forEach(p => gira(p, W0 * 0.8 * (p.z ? 1 : Math.min(2, 40 / Math.max(5, p.r))))); if (!pares.length) notas.push(P.length === 1 ? 'gira sobre sí misma' : 'lo redondo gira sobre su eje'); }
  // 5) lo que va enganchado a un eje que gira (bielas y pedales en el pedalier): gira con él
  const girando = P.filter(p => mov[p.id] && mov[p.id].tipo === 'gira');
  P.forEach(q => { if (mov[q.id] || q === grande || Math.max(...q.b.dims) > 0.6 * tot) return;
    const con = girando.filter(p => p.r < 8 && dentroDe(q, p) && !girando.some(o2 => o2 !== p && o2.r > p.r && dentroDe(q, o2))); if (con.length !== 1) return;
    if (R.some(o2 => o2 !== con[0] && enPlano(q, o2, EJES[con[0].eje]))) return; // (si abarca el centro de otra pieza redonda —la cadena llega a la rueda—, no es una biela: no se mueve)
    const p = con[0]; if (!p.lleva) { p.lleva = 1; mov[p.id].w = Math.sign(mov[p.id].w || 1) * W0 * 0.45; } mov[q.id] = Object.assign({}, mov[p.id]); /* (unos pedales van más despacio que las ruedas, como en una bici de verdad) */ if (!notas.includes('lo enganchado a un eje gira con él')) notas.push('lo enganchado a un eje gira con él'); });
  P.forEach(p => { delete p.t; delete p.tz; delete p.bz; });
  return fin(P, mov, cadena, notas);
}
function fin(P, mov, cadena, notas) { P.forEach(p => { delete p.t; delete p.tz; delete p.bz; }); return { n: P.length, piezas: P, mov, cadena, notas, hayMovimiento: Object.values(mov).some(x => x.tipo !== 'quieta') || !!cadena }; }
// (para los satélites, medido en el plano del eje del grupo)
function planoDe(p, E) { const c = p.centro || p.c; return [c[E.pl[0]], c[E.pl[1]]]; }
function radioEn(p, a, E) { const q = planoDe(p, E), c = planoDe(a, E); return Math.hypot(q[0] - c[0], q[1] - c[1]); }
function tamEn(p, E) { return Math.max(p.b.dims[E.pl[0]], p.b.dims[E.pl[1]]) / 2; }
function solapanE(p, a, E) { const k = E.ax; return p.b.min[k] < a.b.max[k] && a.b.min[k] < p.b.max[k]; }
// ¿el centro del eje de p cae dentro de la pieza q (en el plano del eje) y q está a su lado (a lo largo del eje)?
function dentroDe(q, p) { const E = EJES[p.eje], c = p.centro, [i, j] = E.pl, k = E.ax; return c[i] > q.b.min[i] && c[i] < q.b.max[i] && c[j] > q.b.min[j] && c[j] < q.b.max[j] && q.b.min[k] < p.b.max[k] + 1 && p.b.min[k] - 1 < q.b.max[k]; }

function enPlano(q, p, E) { const c = p.centro || p.c, [i, j] = E.pl; return c[i] > q.b.min[i] && c[i] < q.b.max[i] && c[j] > q.b.min[j] && c[j] < q.b.max[j]; }
// los trozos, desde el más grande (el cuerpo), unidos al que tocan → { raiz, padre, orden, piv (dónde se une cada uno), prof } o null
function cadenaDe(P, raiz) {
  const cerca = (a, b) => { const g = 1.6; return a.b.min[0] - g < b.b.max[0] && b.b.min[0] - g < a.b.max[0] && a.b.min[1] - g < b.b.max[1] && b.b.min[1] - g < a.b.max[1]; };
  const padre = new Map([[raiz.id, null]]), orden = [raiz], cola = [raiz];
  while (cola.length) { const a = cola.shift(); P.forEach(b => { if (padre.has(b.id) || !cerca(a, b)) return; padre.set(b.id, a.id); orden.push(b); cola.push(b); }); }
  if (orden.length !== P.length) return null;
  const piv = {}, prof = { [raiz.id]: 0 }, byId = Object.fromEntries(P.map(p => [p.id, p]));
  orden.slice(1).forEach(b => { const a = byId[padre.get(b.id)]; prof[b.id] = prof[a.id] + 1;
    const x0 = Math.max(a.b.min[0], b.b.min[0]), x1 = Math.min(a.b.max[0], b.b.max[0]), y0 = Math.max(a.b.min[1], b.b.min[1]), y1 = Math.min(a.b.max[1], b.b.max[1]);
    piv[b.id] = [(x0 + x1) / 2, (y0 + y1) / 2, 0]; });
  return { raiz: raiz.id, padre: Object.fromEntries(padre), orden: orden.map(p => p.id), piv, prof };
}

// → fn(t) = { id: Matrix4 } para escena.animar · modo: 'mover' | 'desmontar' · vel = 0,5 · 1 · 2
export function animacion(A, modo, vel = 1) {
  const todo = [0, 1, 2].map(k => [Math.min(...A.piezas.map(p => p.b.min[k])), Math.max(...A.piezas.map(p => p.b.max[k]))]);
  const centro = todo.map(([a, b]) => (a + b) / 2), tam = Math.max(...todo.map(([a, b]) => b - a));
  if (modo === 'desmontar') return t => { const x = (t * vel / 5) % 1, k = suave(x, 0.08, 0.42) * (1 - suave(x, 0.6, 0.94)), D = {};
    A.piezas.forEach(p => { const d = [p.c[0] - centro[0], p.c[1] - centro[1], p.c[2] - centro[2]], L = Math.hypot(...d), e = 0.38 * tam * k;
      const v = L < 0.5 ? [0, 0, e * 0.9] : [d[0] / L * e, d[1] / L * e, d[2] / L * e + e * 0.15];
      D[p.id] = new T.Matrix4().makeTranslation(...v); });
    return D; };
  return t => { const s = t * vel, D = {}, PI2 = 2 * Math.PI;
    Object.entries(A.mov).forEach(([id, m]) => {
      if (m.tipo === 'exacto') D[id] = new T.Matrix4().fromArray(m.f(s));
      else if (m.tipo === 'gira') D[id] = girarEje(m.o, m.dir, PI2 * m.w * s);
      else if (m.tipo === 'orbita') D[id] = girarEje(m.o, m.dir, PI2 * m.wc * s).multiply(girarEje(m.cp, m.dir, PI2 * (m.wp - m.wc) * s));
      else if (m.tipo === 'bisagra') { const x = (s / 4) % 1, k = suave(x, 0.08, 0.45) * (1 - suave(x, 0.6, 0.95)); D[id] = girarEje(m.o, m.dir, m.ang * Math.PI / 180 * k); } });
    if (A.cadena) { const C = A.cadena, M = { [C.raiz]: new T.Matrix4() };
      C.orden.forEach(id => { if (id === C.raiz) return; const ang = 0.16 * Math.sin(PI2 * 0.55 * s - C.prof[id] * 0.9); M[id] = M[C.padre[id]].clone().multiply(girarEje(C.piv[id], [0, 0, 1], ang)); D[id] = M[id]; }); }
    return D; };
}

// las cajas del catálogo «por piezas» (K.partesDe): se abren por su bisagra y su cajón sale
export function animacionAbrir(partes, vel = 1) {
  return t => { const x = (t * vel / 4) % 1, k = suave(x, 0.1, 0.45) * (1 - suave(x, 0.62, 0.95)), D = {};
    partes.forEach(p => { if (p.bisagra) D[p.id] = girarEje(p.bisagra.o, p.bisagra.dir, (p.bisagra.ang || 100) * Math.PI / 180 * k);
      else if (p.desliza) { const d = (p.desliza.d || 30) * k; D[p.id] = new T.Matrix4().makeTranslation(p.desliza.dir[0] * d, p.desliza.dir[1] * d, p.desliza.dir[2] * d); } });
    return D; };
}

// ================= 20-10-2026 · 🔧 MONTAJE PASO A PASO (plan maestro: «animación completa del ensamblaje: piezas en el orden correcto,
// cada una moviéndose hasta su sitio, dónde encaja, fluida, que se pueda pausar, reanudar y repasar; útil para montarlo de verdad») =================
// Orden: la BASE es la pieza más grande; después, siempre la que más cerca queda de lo ya montado (la que se apoya en ello), y a igualdad
// la más grande. Cada pieza ENTRA por el lado por el que cabe sin chocar con lo ya montado (se barre su caja hacia fuera en las 6
// direcciones y se queda la que menos choca; un eje largo y fino entra a lo largo de sí mismo). En su sitio se ve su FANTASMA mientras llega.
const DIRS = [[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, -1]];
const cruce = (a, b) => { let v = 1; for (let k = 0; k < 3; k++) { const d = Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]); if (d <= 0) return 0; v *= d; } return v; };
const encoge = (b, f) => ({ min: b.min.map((x, k) => x + (b.max[k] - b.min[k]) * f), max: b.max.map((x, k) => x - (b.max[k] - b.min[k]) * f) });
const hueco = (a, b) => Math.hypot(...[0, 1, 2].map(k => Math.max(0, a.min[k] - b.max[k], b.min[k] - a.max[k])));
// lo que parece cada pieza (cuando el diseño no trae su nombre): por su forma, sin inventar
const queEs = p => { const d = p.b.dims, mx = Math.max(...d), resto = d.filter((_, k) => k !== d.indexOf(mx));
  if (p.z) return 'Engranaje de ' + p.z + ' dientes';
  if (mx > 2.5 * Math.max(...resto)) return Math.max(...resto) < 8 ? 'Eje' : 'Barra';
  if (p.eje && p.r && Math.min(...d) < 0.45 * mx) return 'Rueda';
  return 'Pieza'; };
export function ordenMontaje(A) {
  const P = A.piezas.slice(); if (!P.length) return [];
  const todo = [0, 1, 2].map(k => [Math.min(...P.map(p => p.b.min[k])), Math.max(...P.map(p => p.b.max[k]))]), tam = Math.max(...todo.map(([a, b]) => b - a));
  // la BASE: la que toca a más piezas (el cuadro de la bici, no su peana); a igualdad, la más grande
  // (20-10: si el kit trae el PASO de cada pieza —su orden de montaje de verdad—, manda ese orden; si no, se deduce)
  const conPaso = P.every(p => typeof p.paso === 'number'), porPaso = (a, b) => a.paso - b.paso || b.vol - a.vol;
  const toca = p => P.filter(q => q !== p && hueco(p.b, q.b) < 1).length, base = conPaso ? P.slice().sort(porPaso)[0] : P.slice().sort((a, b) => toca(b) - toca(a) || b.vol - a.vol)[0];
  const puestas = [base], orden = [{ id: base.id, nombre: base.nombre || (queEs(base) === 'Pieza' ? 'Pieza principal' : queEs(base)), dir: [0, 0, 1], base: true }];
  const quedan = new Set(P.filter(p => p !== base)), siguen = conPaso ? P.filter(p => p !== base).sort(porPaso) : null;
  while (quedan.size) {
    let mejor = null, dm = Infinity;
    if (siguen) mejor = siguen.shift();
    else for (const p of quedan) { const d = Math.min(...puestas.map(q => hueco(p.b, q.b))); if (d < dm - 0.5 || (Math.abs(d - dm) <= 0.5 && p.vol > mejor.vol)) { dm = d; mejor = p; } }
    quedan.delete(mejor);
    const dims = mejor.b.dims, larga = dims.indexOf(Math.max(...dims)), fino = dims[larga] > 2.5 * Math.max(...dims.filter((_, k) => k !== larga));
    const cand = (fino ? [[0, 1, 2].map(k => k === larga ? 1 : 0), [0, 1, 2].map(k => k === larga ? -1 : 0)] : []).concat(DIRS);
    let dir = cand[0], peor = Infinity;
    cand.forEach((d, i) => { // la caja de la pieza barrida hacia fuera (sin contar su sitio final)
      const L = tam * 0.8, b = encoge(mejor.b, 0.04), bar = { min: b.min.map((x, k) => d[k] > 0 ? b.max[k] : d[k] < 0 ? x - L : x), max: b.max.map((x, k) => d[k] > 0 ? x + L : d[k] < 0 ? b.min[k] : x) };
      const choca = puestas.reduce((s, q) => s + cruce(bar, encoge(q.b, 0.04)), 0) * (1 + i * 0.02); // (a igualdad, el orden de preferencia: arriba primero)
      if (choca < peor - 1e-6) { peor = choca; dir = d; } });
    orden.push({ id: mejor.id, nombre: mejor.nombre || queEs(mejor), dir }); puestas.push(mejor);
  }
  const cuenta = {}, van = {}; orden.forEach(o => { cuenta[o.nombre] = (cuenta[o.nombre] || 0) + 1; }); // (dos ruedas → «Rueda 1», «Rueda 2»)
  orden.forEach(o => { if (cuenta[o.nombre] > 1) { van[o.nombre] = (van[o.nombre] || 0) + 1; o.nombre += ' ' + van[o.nombre]; } });
  return orden;
}
// → { pasos, dur, pasoEn(t), fn(t) } · fn da también la matriz de los fantasmas ('g' + id). Bucle: todos los pasos y 3 s montado entero.
export function animacionMontaje(A, orden, vel = 1) {
  const todo = [0, 1, 2].map(k => [Math.min(...A.piezas.map(p => p.b.min[k])), Math.max(...A.piezas.map(p => p.b.max[k]))]), tam = Math.max(...todo.map(([a, b]) => b - a));
  const S = 2.2 / vel, FIN = 3 / vel, dur = orden.length * S + FIN, cero = new T.Matrix4().makeScale(1e-6, 1e-6, 1e-6);
  const idx = Object.fromEntries(orden.map((o, i) => [o.id, i])), pasoEn = t => Math.min(orden.length - 1, Math.floor(((t % dur) + dur) % dur / S));
  const fn = t => { const x = ((t % dur) + dur) % dur, D = {}, actual = x / S;
    orden.forEach((o, i) => { const g = 'g' + o.id;
      if (actual < i) { D[o.id] = cero; D[g] = cero; return; } // aún no le toca: ni ella ni su fantasma
      if (actual >= i + 1) { D[o.id] = new T.Matrix4(); D[g] = cero; return; } // ya está en su sitio
      const f = actual - i, k = suave(f, 0.12, 0.82), lejos = (1 - k) * (0.55 * tam + 10); // entra desde fuera y se para en su sitio
      D[o.id] = new T.Matrix4().makeTranslation(o.dir[0] * lejos, o.dir[1] * lejos, o.dir[2] * lejos); D[g] = f < 0.86 ? new T.Matrix4() : cero; });
    return D; };
  return { pasos: orden.length, dur, S, pasoEn, fn, idx };
}
