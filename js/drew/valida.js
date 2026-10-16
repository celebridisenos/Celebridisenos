// ================= 👗 CelebriDREW · VALIDACIÓN AUTOMÁTICA (independiente de la IA) =================
// Mira la geometría de verdad, no lo que «dice» la IA. Cada problema es BLOQUEANTE (no se puede dar por bueno) o AVISO.
// Tolerancias (documentadas y cambiables en TOLERANCIAS): una costura casa si sus dos bordes miden lo mismo ± 2 mm (o lo que diga la
// costura); las patas de una pinza, ± 0,5 mm; los piquetes de una costura, ± 3 mm a lo largo.
// El ESTADO del patrón (no se confunden):
//   borrador      · hay piezas pero alguna geometría está mal (abierta, cruzada, sin área)
//   inicial       · cada pieza está bien por sí sola, pero faltan costuras o no casan
//   ensamblable   · todas las costuras existen y casan en largo
//   validado      · además: márgenes y línea de corte bien, piquetes que casan, línea de hilo en todas → «validado geométricamente»
//   revisado      · SOLO lo marca una persona (un patronista) a mano: la validación geométrica NO sustituye una prueba de verdad
import * as G from './geom.js';
import * as Z from './pieza.js';
import { lineaCorte } from './margen.js';

export const TOLERANCIAS = { costura: 2, pinza: 0.5, piquete: 3, areaMin: 400, cierre: 1e-6, bajoMin: 15 };
export const ESTADOS = { borrador: { n: 0, t: 'Borrador visual', d: 'Hay piezas, pero alguna geometría está mal.' }, inicial: { n: 1, t: 'Patrón geométrico inicial', d: 'Cada pieza está bien, pero las costuras no están completas o no casan.' },
  ensamblable: { n: 2, t: 'Patrón ensamblable', d: 'Todas las costuras existen y casan en largo.' }, validado: { n: 3, t: 'Patrón validado geométricamente', d: 'Además: márgenes, línea de corte, piquetes y línea de hilo, bien. Falta la prueba física.' },
  revisado: { n: 4, t: 'Patrón revisado por un patronista', d: 'Lo ha revisado una persona (marcado a mano).' } };

export function validaPieza(pz, T = TOLERANCIAS) {
  const E = [], A = [], mal = (t, d) => E.push({ pieza: pz.id, n: pz.nombre, t, d }), ojo = (t, d) => A.push({ pieza: pz.id, n: pz.nombre, t, d });
  // números de verdad
  const malos = Object.entries(pz.puntos).filter(([, q]) => !isFinite(q.x) || !isFinite(q.y)); if (malos.length) { mal('Puntos sin medida', malos.map(x => x[0]).join(', ')); return { E, A }; }
  // cerrado: cada tramo empieza donde acaba el anterior
  const n = pz.contorno.length; if (n < 3) { mal('Contorno incompleto', 'Una pieza necesita al menos 3 tramos.'); return { E, A }; }
  for (let i = 0; i < n; i++) { const t = pz.contorno[i], u = pz.contorno[(i + 1) % n]; if (t.b !== u.a) mal('Contorno abierto', 'El tramo ' + t.id + ' no acaba donde empieza ' + u.id + '.'); }
  if (E.length) return { E, A };
  const C = Z.contorno(pz), ar = G.area(C);
  if (ar < 0) mal('Contorno al revés', 'La pieza va en el sentido de las agujas del reloj (tiene que ir al revés).');
  if (Math.abs(ar) < T.areaMin) mal('Pieza casi sin superficie', G.cm(Math.abs(ar) / 100, 0) + ' cm².');
  const X = G.autocruces(C); if (X.length) mal('El contorno se cruza consigo mismo', X.length + ' cruce(s); el primero en (' + G.cm(X[0].p[0]) + ', ' + G.cm(X[0].p[1]) + ') cm.');
  // bordes: cubren el contorno, sin repetir (las pinzas aparte)
  const usados = new Map(); pz.bordes.forEach(b => b.tramos.forEach(id => usados.set(id, (usados.get(id) || 0) + 1)));
  const sueltos = pz.contorno.filter(t => !usados.has(t.id) && !Z.pinzaDe(pz, t.id)).map(t => t.id), dobles = [...usados].filter(([, k]) => k > 1).map(([id]) => id);
  if (sueltos.length) ojo('Tramos sin borde', 'No pertenecen a ningún borde: ' + sueltos.join(', ') + ' (no se podrán coser).');
  if (dobles.length) mal('Tramos en dos bordes', dobles.join(', '));
  // (un borde puede saltar por encima de una pinza: la cintura de una falda son los trozos de cintura sin las patas de la pinza)
  const sig = id => { const i = pz.contorno.findIndex(t => t.id === id); let k = (i + 1) % n; while (Z.pinzaDe(pz, pz.contorno[k].id) && k !== i) k = (k + 1) % n; return pz.contorno[k].id; };
  pz.bordes.forEach(b => { for (let k = 1; k < b.tramos.length; k++) { if (!Z.tramoPorId(pz, b.tramos[k]) || sig(b.tramos[k - 1]) !== b.tramos[k]) { mal('Borde partido', 'El borde «' + b.n + '» no es seguido.'); break; } } });
  // pinzas: patas iguales
  pz.pinzas.forEach(z => { const [a, b] = z.tramos.map(id => G.tramoLargo(Z.tramoGeo(pz, Z.tramoPorId(pz, id)))); if (Math.abs(a - b) > T.pinza) mal('Pinza con patas distintas', G.cm(a, 2) + ' y ' + G.cm(b, 2) + ' cm (deben medir lo mismo).'); });
  // piquetes dentro de su borde
  pz.piquetes.forEach(q => { const L = Z.bordeLargo(pz, q.borde); if (!(q.d >= 0 && q.d <= L)) mal('Piquete fuera de su borde', 'En «' + ((Z.bordePorId(pz, q.borde) || {}).n || q.borde) + '» a ' + G.cm(q.d) + ' cm (el borde mide ' + G.cm(L) + ').'); });
  // doblez: tiene que ser recto
  if (pz.corte.doblez) { const L = Z.bordePolilinea(pz, pz.corte.doblez); const d = L.length ? Math.max(...L.map(p => G.distAPolilinea(p, [L[0], L[L.length - 1]]).d)) : 0; if (!L.length) mal('Doblez sin borde', pz.corte.doblez); else if (d > 0.2) mal('El doblez no es recto', 'Se aparta ' + G.cm(d, 2) + ' cm: una pieza al doblez necesita ese borde recto.'); }
  // márgenes y línea de corte
  pz.bordes.forEach(b => { const m = Z.margenDe(pz, b.id); if (!(m >= 0)) mal('Margen no válido', b.n); else if (b.tipo === 'bajo' && m < T.bajoMin) ojo('Bajo con poco margen', b.n + ': ' + G.cm(m) + ' cm (lo normal, 2–3 cm).'); });
  let corteOk = true; try { const K = lineaCorte(pz); if (G.autocruces(K).length) { corteOk = false; mal('La línea de corte se cruza', 'Revisa los márgenes de las curvas cerradas.'); } else if (Math.abs(G.area(K)) < Math.abs(ar)) { corteOk = false; mal('La línea de corte queda por dentro', ''); } } catch (e) { corteOk = false; mal('No sale la línea de corte', e.message); }
  if (!pz.internas.some(i => i.tipo === 'hilo')) ojo('Sin línea de hilo', 'Pon la dirección del hilo de la tela.');
  return { E, A, corteOk };
}

// las costuras de la prenda: existen, casan en largo y en piquetes
export function validaCosturas(prenda, T = TOLERANCIAS) {
  const E = [], A = [], R = [], pz = id => prenda.piezas.find(p => p.id === id);
  (prenda.costuras || []).forEach(c => {
    const pa = pz(c.a.pieza), pb = pz(c.b.pieza), ba = pa && Z.bordePorId(pa, c.a.borde), bb = pb && Z.bordePorId(pb, c.b.borde);
    if (!ba || !bb) { E.push({ costura: c.id, t: 'Costura rota', d: (c.n || c.id) + ': falta una pieza o un borde.' }); return; }
    const La = Z.bordeLargo(pa, c.a.borde), Lb = Z.bordeLargo(pb, c.b.borde), ratio = c.ratio || 1, dif = Lb - La * ratio, tol = c.tol != null ? c.tol : T.costura;
    const r = { id: c.id, n: c.n, La, Lb, ratio, dif, ok: Math.abs(dif) <= tol };
    if (!r.ok) (Math.abs(dif) > 3 * tol ? E : A).push({ costura: c.id, t: 'Costura que no casa', d: (c.n || c.id) + ': ' + pa.nombre + ' (' + G.cm(La) + ' cm' + (ratio !== 1 ? ' × ' + ratio : '') + ') y ' + pb.nombre + ' (' + G.cm(Lb) + ' cm): sobran ' + G.cm(Math.abs(dif)) + ' cm en ' + (dif > 0 ? pb.nombre : pa.nombre) + '.' });
    // piquetes: los de un lado, a la misma distancia (contando por donde empieza cada uno y la proporción) que los del otro
    const qa = pa.piquetes.filter(q => q.borde === c.a.borde).map(q => (c.a.inv ? La - q.d : q.d) * ratio).sort((x, y) => x - y), qb = pb.piquetes.filter(q => q.borde === c.b.borde).map(q => c.b.inv ? Lb - q.d : q.d).sort((x, y) => x - y);
    if (qa.length !== qb.length) A.push({ costura: c.id, t: 'Piquetes distintos', d: (c.n || c.id) + ': ' + qa.length + ' en ' + pa.nombre + ' y ' + qb.length + ' en ' + pb.nombre + '.' });
    else { const m = qa.reduce((s, x, i) => Math.max(s, Math.abs(x - qb[i])), 0); r.piquetes = m; if (m > T.piquete) A.push({ costura: c.id, t: 'Piquetes que no coinciden', d: (c.n || c.id) + ': se separan ' + G.cm(m) + ' cm.' }); }
    R.push(r);
  });
  // bordes de costura sin coser
  prenda.piezas.forEach(p => p.bordes.filter(b => b.tipo === 'costura').forEach(b => { if (!(prenda.costuras || []).some(c => (c.a.pieza === p.id && c.a.borde === b.id) || (c.b.pieza === p.id && c.b.borde === b.id))) A.push({ pieza: p.id, t: 'Borde sin coser', d: p.nombre + ' · ' + b.n + ': es de costura pero no está unido a nada.' }); }));
  return { E, A, R };
}

export function valida(prenda, T = TOLERANCIAS) {
  const piezas = prenda.piezas.map(p => ({ id: p.id, n: p.nombre, ...validaPieza(p, T) })), cos = validaCosturas(prenda, T);
  const E = piezas.flatMap(x => x.E).concat(cos.E), A = piezas.flatMap(x => x.A).concat(cos.A);
  const geomOk = prenda.piezas.length && piezas.every(x => !x.E.length || x.E.every(e => /corte|Margen/.test(e.t))), sinCorteMal = piezas.every(x => !x.E.length);
  const costurasOk = (prenda.costuras || []).length > 0 && cos.R.every(r => r.ok) && !cos.E.length && !A.some(a => a.t === 'Borde sin coser');
  let estado = 'borrador';
  if (geomOk) estado = 'inicial';
  if (geomOk && costurasOk) estado = 'ensamblable';
  if (estado === 'ensamblable' && sinCorteMal && !A.some(a => /Piquetes|Sin línea de hilo/.test(a.t))) estado = 'validado';
  if (estado === 'validado' && prenda.revisado && prenda.revisado.por) estado = 'revisado';
  return { estado, E, A, piezas, costuras: cos.R, ok: !E.length };
}
