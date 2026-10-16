// ================= 👗 CelebriDREW · lo común de las PLANTILLAS PARAMÉTRICAS =================
// Una plantilla es un trazado DETERMINISTA: de unas MEDIDAS DE LA PRENDA (acabada, en mm) y unas OPCIONES salen las piezas, sus
// bordes con nombre y las COSTURAS (qué borde se cose con cuál, en qué sentido y en qué proporción). Si una medida es imposible
// (una manga más ancha que su sisa…) se dice con un error claro en lugar de dibujar algo que no se puede coser.
import * as G from '../geom.js';
import * as Z from '../pieza.js';

export const mal = t => { const e = new Error(t); e.drew = 1; throw e; };
// bisección: el x de [a, b] con f(x) = objetivo (f creciente o decreciente)
export function resuelve(f, objetivo, a, b, it = 60) {
  let fa = f(a) - objetivo, fb = f(b) - objetivo; if (fa * fb > 0) return null;
  for (let i = 0; i < it; i++) { const m = (a + b) / 2, fm = f(m) - objetivo; if (Math.abs(fm) < 1e-4) return m; if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; } }
  return (a + b) / 2;
}
// una costura: { id, n, a: { pieza, borde, inv }, b: { … }, ratio, tol, tipo }
export const costura = (id, n, pa, ba, pb, bb, o = {}) => ({ id, n, a: { pieza: pa.id, borde: ba, inv: !!o.invA }, b: { pieza: pb.id, borde: bb, inv: !!o.inv }, ratio: o.ratio || 1, tol: o.tol, tipo: o.tipo || 'costura' });
// la misma pieza cosida con su espejo (el centro de la espalda, el tiro…): «consigo misma»
export const costuraEspejo = (id, n, p, b) => ({ id, n, a: { pieza: p.id, borde: b, inv: false }, b: { pieza: p.id, borde: b, inv: false }, ratio: 1, tipo: 'espejo' });
// el largo de un borde mientras se construye
export const largo = (pz, bid) => Z.bordeLargo(pz, bid);
// los datos de cada medida que pide una plantilla: [clave, texto, valor por defecto (mm), mín, máx, ayuda]
export const med = (k, t, v, min, max, ayuda) => ({ k, t, v, min, max, ayuda: ayuda || '' });
export const opc = (k, t, v, ops) => ({ k, t, v, ops });
// comprobar medidas dentro de sus límites (con el porqué)
export function compruebaMedidas(D, M) { D.medidas.forEach(m => { const v = M[m.k]; if (!(isFinite(v))) mal('Falta la medida «' + m.t + '».'); if (v < m.min || v > m.max) mal('«' + m.t + '» = ' + G.cm(v) + ' cm: fuera de lo posible (' + G.cm(m.min) + '–' + G.cm(m.max) + ' cm).'); }); }
// la dirección perpendicular a u hacia abajo (para que dos curvas se encuentren en ángulo recto)
export const perpAbajo = u => { const n = [u[1], -u[0]]; return n[1] > 0 ? [-n[0], -n[1]] : n; };
