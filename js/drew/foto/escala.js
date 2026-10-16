// ================= 👗 CelebriDREW · la ESCALA (de píxeles a milímetros) =================
// Una foto normal NO trae medidas: hace falta al menos UNA medida conocida de la prenda (o una regla dibujada sobre la foto con su largo).
// · Con una sola referencia: la misma escala en todo (se avisa: si la foto está en perspectiva, lo de lejos sale más pequeño).
// · Con una horizontal y otra vertical: escalas DISTINTAS en cada eje (corrige una foto algo estirada o inclinada); si se diferencian
//   más de un 4 % se avisa de que la foto está en perspectiva o deformada.
// Nada de esto se presenta como medida real confirmada: las medidas que salen son «estimadas por la foto» (origen 'ia').
export const REFERENCIAS = {
  arriba: [['pecho', 'Ancho de pecho (prenda plana, de axila a axila)'], ['largo', 'Largo total (del cuello en el hombro al bajo)'], ['hombros', 'Ancho de hombros'], ['manga', 'Largo de manga'], ['bajo', 'Ancho del bajo (plana)']],
  pantalon: [['cintura', 'Ancho de cintura (plano)'], ['largo', 'Largo exterior (de la cintura al bajo)'], ['cadera', 'Ancho de cadera (plano)'], ['tiro', 'Tiro (de la cintura a la entrepierna)']],
  falda: [['cintura', 'Ancho de cintura (plano)'], ['largo', 'Largo (de la cintura al bajo)'], ['cadera', 'Ancho de cadera (plano)']],
};
const eje = v => (Math.abs(v[0]) > 2.5 * Math.abs(v[1]) ? 'h' : Math.abs(v[1]) > 2.5 * Math.abs(v[0]) ? 'v' : 'd');
// refs: [{ k, mm } (una medida de los rasgos, en su valor PLANO tal como se mide en la foto) | { a: [x,y], b: [x,y], mm } (una regla)]
export function calcula(rasgos, refs) {
  const H = [], V = [], D = [], avisos = [];
  (refs || []).forEach(r => { if (!(r.mm > 0)) return; let v; if (r.a && r.b) v = [Math.abs(r.b[0] - r.a[0]), Math.abs(r.b[1] - r.a[1])]; else { const m = rasgos.medidas[r.k]; if (!m) { avisos.push('No he podido medir «' + r.k + '» en la foto: esa referencia no se usa.'); return; } v = m.vec; }
    const L = Math.hypot(v[0], v[1]); if (L < 5) return; const e = eje(v), x = { s: r.mm / L, v, r }; (e === 'h' ? H : e === 'v' ? V : D).push(x); });
  if (!H.length && !V.length && !D.length) return { ok: false, avisos: avisos.concat(['Falta una medida de verdad: sin ella no se puede pasar de la foto a centímetros.']) };
  const med = a => a.reduce((s, x) => s + x.s, 0) / a.length;
  let sx = H.length ? med(H) : null, sy = V.length ? med(V) : null; const sd = D.length ? med(D) : null;
  if (sx == null) sx = sy != null ? sy : sd; if (sy == null) sy = sx != null ? sx : sd;
  const dif = Math.abs(sx / sy - 1), iso = !(H.length && V.length);
  if (iso) avisos.push('Escala con una sola dirección de referencia: si la foto está algo en perspectiva, las medidas en la otra dirección pueden desviarse. Con una medida de ancho y otra de largo es más fiable.');
  else if (dif > 0.04) avisos.push('Las escalas a lo ancho y a lo largo se diferencian un ' + Math.round(dif * 100) + ' %: la foto está en perspectiva o estirada. Se usa cada una en su dirección; mejor una foto desde arriba.');
  return { ok: true, sx, sy, iso, dif, avisos, mmPx: (sx + sy) / 2, refs };
}
export const aMm = (vec, E) => Math.hypot(vec[0] * E.sx, vec[1] * E.sy);
