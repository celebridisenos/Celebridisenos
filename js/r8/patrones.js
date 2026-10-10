// ================= v20 · 🧊 CelebriR8 · CALADOS CON ESTILO =================
// «Mete cosas para hacer orificios con estilo» (la dueña, 9-10-2026). Patrones de agujeros que quedan bonitos y se
// imprimen bien: panal, voronoi (como las alas de una libélula), círculos, rombos, estrellas, corazones, triángulos,
// ondas, escamas y rayas. Sirven en plano (placas, posavasos, fundas, cajas) y alrededor de un cilindro (lámparas,
// jarrones, portavelas, maceteros). «puente» es lo que queda de material entre agujero y agujero.
import * as N from './nucleo.js';

export const PATRONES = { panal: '⬢ Panal', voronoi: '🕸️ Voronoi (libélula)', circulos: '● Círculos', rombos: '◆ Rombos', estrellas: '★ Estrellas', corazones: '♥ Corazones', triangulos: '▲ Triángulos', ondas: '〰 Ondas', escamas: '🐟 Escamas', rayas: '▤ Rayas', cuadros: '▦ Cuadros' };

// generador de números «al azar» que siempre da lo mismo con la misma semilla (el diseño no cambia al recalcular)
export function azar(semilla = 1) { let s = (semilla * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const recorta = (pol, a, b) => { // Sutherland–Hodgman: lo que queda de «pol» en el lado de los puntos más cerca de a que de b
  const nx = b[0] - a[0], ny = b[1] - a[1], c = (nx * (a[0] + b[0]) + ny * (a[1] + b[1])) / 2, dentro = q => nx * q[0] + ny * q[1] <= c, o = [];
  for (let i = 0; i < pol.length; i++) { const p = pol[i], q = pol[(i + 1) % pol.length], ip = dentro(p), iq = dentro(q);
    if (ip) o.push(p); if (ip !== iq) { const dp = nx * p[0] + ny * p[1] - c, dq = nx * q[0] + ny * q[1] - c, t = dp / (dp - dq); o.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } }
  return o;
};
// Celdas de Voronoi dentro de un rectángulo w × h (centrado)
export function voronoi(w, h, celda, semilla = 7) {
  const r = azar(semilla), sem = [], nx = Math.max(1, Math.round(w / celda)), ny = Math.max(1, Math.round(h / celda));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) sem.push([-w / 2 + (i + 0.15 + r() * 0.7) * w / nx, -h / 2 + (j + 0.15 + r() * 0.7) * h / ny]);
  const caja = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  return sem.map((s, i) => { let pol = caja; sem.map((q, k) => [k, (q[0] - s[0]) ** 2 + (q[1] - s[1]) ** 2]).filter(x => x[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 14).forEach(([k]) => { if (pol.length) pol = recorta(pol, s, sem[k]); }); return pol; }).filter(p => p.length > 2);
}
const forma = (tipo, s) => { // un agujero de tamaño «s», centrado
  if (tipo === 'panal') return N.poligono2(6, s, 30); // con punta arriba: sus lados miran a los vecinos
  if (tipo === 'circulos') return N.poligono2(32, s);
  if (tipo === 'escamas') return N.poligono2(32, s * 0.85);
  if (tipo === 'rombos') return [[0, -s / 2], [s / 2, 0], [0, s / 2], [-s / 2, 0]];
  if (tipo === 'cuadros') return [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [-s / 2, s / 2]];
  if (tipo === 'estrellas') return N.estrella2(5, s / 2, s / 2 * 0.45);
  if (tipo === 'corazones') return N.corazon2(s);
  return N.poligono2(32, s);
};
// Los AGUJEROS (CrossSection) de un patrón dentro de un rectángulo w × h. Si «zona» (CrossSection) se da, solo dentro de ella.
export function agujeros2D(tipo, w, h, celda = 10, puente = 2, semilla = 7) {
  celda = Math.max(2, celda); puente = Math.max(0.6, Math.min(puente, celda * 0.7)); const L = [], s = celda - puente;
  if (tipo === 'voronoi') voronoi(w + celda, h + celda, celda, semilla).forEach(p => { L.push(N.cs([N.ccw(p)], 'Positive').offset(-puente / 2, 'Round', 2, 12)); });
  else if (tipo === 'triangulos') { const a = celda, hh = a * Math.sqrt(3) / 2; for (let j = -Math.ceil(h / hh / 2) - 1; j <= Math.ceil(h / hh / 2) + 1; j++) for (let i = -Math.ceil(w / a) - 1; i <= Math.ceil(w / a) + 1; i++) { const x = i * a / 2, y = j * hh, arriba = (i + j) % 2 === 0;
    const t = arriba ? [[x - a / 2, y - hh / 2], [x + a / 2, y - hh / 2], [x, y + hh / 2]] : [[x - a / 2, y + hh / 2], [x, y - hh / 2], [x + a / 2, y + hh / 2]]; L.push(N.cs([N.ccw(t)], 'Positive').offset(-puente / 2, 'Miter')); } }
  else if (tipo === 'ondas' || tipo === 'rayas') { const n = Math.ceil(h / celda) + 2; for (let j = -n; j <= n; j++) { const y = j * celda, arr = [], abj = []; for (let x = -w / 2 - celda; x <= w / 2 + celda; x += 1) { const dy = tipo === 'ondas' ? Math.sin(x / celda * Math.PI) * celda * 0.35 : 0; arr.push([x, y + dy + s / 2]); abj.push([x, y + dy - s / 2]); } L.push(N.cs([N.ccw(arr.concat(abj.reverse()))], 'Positive')); } }
  else { // rejillas: panal (filas desplazadas), círculos, rombos, estrellas, corazones, cuadros, escamas
    const hex = tipo === 'panal', dx = celda, dy = hex ? celda * 0.866 : tipo === 'escamas' ? celda * 0.8 : celda;
    const ny = Math.ceil(h / dy / 2) + 2, nxx = Math.ceil(w / dx / 2) + 2;
    for (let j = -ny; j <= ny; j++) for (let i = -nxx; i <= nxx; i++) { const x = i * dx + (j % 2 ? dx / 2 : 0), y = j * dy; const f = forma(tipo, hex ? s / 0.866 : s); L.push(N.cs([N.ccw(f.map(q => [q[0] + x, q[1] + y]))], 'Positive')); }
  }
  return N.csUnion(L);
}
// Placa (o cualquier forma plana «borde») con su patrón: la forma menos los agujeros, dejando un marco de «margen»
export function caladoPlano(contorno, tipo, celda, puente, margen = 3, semilla) {
  const b = N.cajaCS(contorno), dentro = contorno.offset(-margen, 'Round', 2, 24);
  if (dentro.isEmpty()) return contorno;
  let ag = agujeros2D(tipo, b.w, b.h, celda, puente, semilla).translate([(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2]).intersect(dentro);
  return contorno.subtract(ag);
}
// Agujeros alrededor de un cilindro de radio R, entre z0 y z1 (prismas que atraviesan la pared, mirando hacia fuera)
export function agujerosCilindro(R, z0, z1, tipo, celda = 10, puente = 2, fondo = 6, semilla = 7) {
  celda = Math.max(3, celda); const M = [], perim = 2 * Math.PI * R, cols = Math.max(3, Math.round(perim / celda)), paso = perim / cols, alto = z1 - z0;
  if (alto < celda * 0.6) return null;
  // se dibuja el patrón «desenrollado» (perímetro × alto) y cada agujero se envuelve alrededor del cilindro
  const plano = agujeros2D(tipo, perim, alto, paso, puente, semilla).intersect(N.cs([[[-perim / 2, -alto / 2], [perim / 2, -alto / 2], [perim / 2, alto / 2], [-perim / 2, alto / 2]]].map(N.ccw), 'Positive'));
  plano.decompose().forEach(pieza => {
    const b = N.cajaCS(pieza); if (b.w < 0.8 || b.h < 0.8) return;
    const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[1] + b.max[1]) / 2, ang = cx / R * 180 / Math.PI;
    // el agujero se ensancha hacia fuera en proporción al radio: el puente queda igual por dentro y por fuera
    const f = Math.min(fondo, R * 0.6), Ri = R - f, Ro = R + f, p0 = pieza.translate([-cx, -cz]).scale([Ri / R, 1]);
    const prisma = p0.extrude(2 * f, 0, 0, [Ro / Ri, 1]).translate([0, 0, -f]); // z = de dentro (-f) a fuera (+f)
    M.push(prisma.rotate([90, 0, 90]).translate([R, 0, 0]).rotate([0, 0, ang]).translate([0, 0, z0 + alto / 2 + cz])); // (perímetro, alto, fondo) → (Y, Z, X)
  });
  return M.length ? N.union(M) : null;
}
