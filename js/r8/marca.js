// ================= v30.4 · ✍️ «CelebriDiseños» GRABADO en las piezas premium (con su casilla para quitarlo) =================
// La dueña (11-10-2026): «en los premium pon celebridiseños, organizadores sobre todo, pero que tenga la opción de quitarlo».
// Se graba en una cara PLANA de la pieza: delante (−Y), detrás (+Y), a un lado (±X), arriba o DEBAJO (la cara de la cama: sale
// limpia y queda «de tienda», como la firma de una cerámica). El texto se lee bien desde fuera de esa cara (nunca en espejo).
import * as N from './nucleo.js';

export const MARCA = 'CelebriDiseños';
// o = { cara: '-Y' | '+Y' | '-X' | '+X' | 'arriba' | 'abajo', pos: [fracción horizontal, fracción vertical] de esa cara,
//       alto (mm de la letra; si no, a la medida de la cara), ancho (fracción máxima de la cara), hondo (0,6), fuente, texto }
export function graba(m, o = {}) {
  if (!o || o.no) return m;
  // varias piezas en la cama (bote y tapa…): la marca va en la más grande
  const P = m.decompose(); if (P.length > 1 && !o.todo) { const v = P.map(q => q.volume()), i = v.indexOf(Math.max(...v)); return N.union(P.map((q, j) => j === i ? graba(q, Object.assign({}, o, { todo: 1 })) : q)); }
  const b = N.caja(m), cara = o.cara || '-Y', hondo = o.hondo || 0.6, txt = o.texto || MARCA, pos = o.pos || [0.5, 0.5];
  const lado = { '-Y': [b.dims[0], b.dims[2]], '+Y': [b.dims[0], b.dims[2]], '-X': [b.dims[1], b.dims[2]], '+X': [b.dims[1], b.dims[2]], arriba: [b.dims[0], b.dims[1]], abajo: [b.dims[0], b.dims[1]] }[cara];
  let T = N.centraCS(N.texto2(txt, o.fuente || 'clasica', o.alto || Math.max(4.5, Math.min(10, lado[0] * 0.07))));
  const bt = N.cajaCS(T), wmax = lado[0] * (o.ancho || 0.62); if (bt.w > wmax) T = T.scale([wmax / bt.w, wmax / bt.w]);
  if (N.cajaCS(T).h < 3.2) return m; // tan pequeño no se leería: mejor no grabar
  const u = lado[0] * (pos[0] - 0.5), v = pos[1];
  let L;
  if (cara === 'arriba') L = T.extrude(hondo + 1).translate([(b.min[0] + b.max[0]) / 2 + u, b.min[1] + b.dims[1] * v, b.max[2] - hondo]);
  else if (cara === 'abajo') L = T.scale([-1, 1]).extrude(hondo + 1).translate([(b.min[0] + b.max[0]) / 2 - u, b.min[1] + b.dims[1] * v, b.min[2] - 1]);
  else { // losa del texto para la cara −Y (cara en y = 0, hacia dentro +Y) y luego se gira a la cara pedida
    const S0 = T.extrude(hondo + 1).rotate([90, 0, 0]).translate([0, hondo, 0]), z = b.min[2] + b.dims[2] * v;
    if (cara === '-Y') L = S0.translate([(b.min[0] + b.max[0]) / 2 + u, b.min[1], z]);
    else if (cara === '+Y') L = S0.rotate([0, 0, 180]).translate([(b.min[0] + b.max[0]) / 2 - u, b.max[1], z]);
    else if (cara === '+X') L = S0.rotate([0, 0, 90]).translate([b.max[0], (b.min[1] + b.max[1]) / 2 + u, z]);
    else L = S0.rotate([0, 0, -90]).translate([b.min[0], (b.min[1] + b.max[1]) / 2 - u, z]);
  }
  return m.subtract(L);
}
// la casilla del catálogo (marcada de serie)
export const campoMarca = () => ({ k: 'marca', t: '✍️ Con «CelebriDiseños» grabado', v: true, chk: 1 });
