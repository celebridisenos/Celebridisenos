// ================= 👗 CelebriDREW · RECORTAR LA PRENDA (segmentación) =================
// Dos caminos, y se dice SIEMPRE cuál se ha usado:
//   · IA (en la torre): el motor de quitar fondos del programa (BiRefNet y reservas, en el Python del PC). El mejor con fondos difíciles.
//   · Colores (aquí mismo, sin nada más): el color del FONDO se mide en el borde de la foto (mediana en Lab); lo que se aparta de él
//     más que el umbral de Otsu es prenda; se cierra, se queda la mancha más grande y se rellenan sus huecos. Sirve con fondo liso.
// La CONFIANZA sale de lo uniforme que es el fondo y de lo bien separada que queda la prenda; si es baja se aconseja la IA o otra foto.
import { reduce, lab, otsu, nuevaMascara, cierra, abre, mayor, rellena, caja } from './imagen.js';

export function segmentaColor(img0, o = {}) {
  const { img, k } = reduce(img0, o.lado || 900), { w, h, d } = img, L = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { const c = lab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); L[i * 3] = c[0]; L[i * 3 + 1] = c[1]; L[i * 3 + 2] = c[2]; }
  // el fondo: los píxeles del marco (un 4 % de cada lado)
  const mx = Math.max(2, Math.round(0.04 * w)), my = Math.max(2, Math.round(0.04 * h)), borde = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < mx || y < my || x >= w - mx || y >= h - my) borde.push(y * w + x);
  const med = c => { const v = borde.map(i => L[i * 3 + c]).sort((a, b) => a - b); return v[v.length >> 1]; }, F = [med(0), med(1), med(2)];
  const dist = new Float32Array(w * h); for (let i = 0; i < w * h; i++) dist[i] = Math.hypot(L[i * 3] - F[0], L[i * 3 + 1] - F[1], L[i * 3 + 2] - F[2]);
  const dB = borde.map(i => dist[i]).sort((a, b) => a - b), ruidoFondo = dB[Math.floor(dB.length * 0.9)]; // el 90 % del fondo se aparta menos que esto
  const t = Math.max(otsu(dist), ruidoFondo * 1.5 + 4);
  let M = nuevaMascara(w, h); for (let i = 0; i < w * h; i++) M.m[i] = dist[i] > t ? 1 : 0;
  M = abre(cierra(M, 2), 1); const G = mayor(M); M = rellena(G.mascara);
  const B = caja(M), dentro = [], fuera = []; for (let i = 0; i < w * h; i++) (M.m[i] ? dentro : fuera).push(dist[i]);
  const media = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length), sep = (media(dentro) - media(fuera)) / Math.max(4, ruidoFondo);
  const tocaBorde = B.x0 <= 1 || B.y0 <= 1 || B.x1 >= w - 2 || B.y1 >= h - 2, ocupa = B.area / (w * h);
  let conf = Math.max(0, Math.min(1, 0.25 + 0.15 * Math.min(4, sep) - (ruidoFondo > 12 ? 0.25 : 0) - (tocaBorde ? 0.2 : 0) - (ocupa < 0.08 || ocupa > 0.9 ? 0.25 : 0)));
  const avisos = []; if (ruidoFondo > 12) avisos.push('El fondo no es liso: el recorte por colores puede fallar (usa la IA del PC o una foto sobre fondo liso).'); if (tocaBorde) avisos.push('La prenda toca el borde de la foto: puede faltar un trozo.'); if (ocupa < 0.08) avisos.push('La prenda sale muy pequeña en la foto.');
  return { mascara: M, k, metodo: 'colores', confianza: conf, fondo: F, ruidoFondo, umbral: t, avisos };
}
// con la IA del PC (solo en el navegador del programa, con el motor de fotos): devuelve lo mismo o lanza un error claro
export async function segmentaIA(canvas, o = {}) {
  const motor = await import('../../biou/motor.js');
  if (!(await motor.motorAqui())) throw new Error('El motor de fotos del PC no está listo (Biouvision → motor). Se usa el recorte por colores.');
  const r = await motor.recortarConIA(canvas, { onStatus: o.onStatus });
  if (!r) throw new Error('La IA no ha encontrado nada que recortar.');
  const lado = o.lado || 900, kk = Math.min(1, lado / Math.max(r.w, r.h)), w = Math.max(1, Math.round(r.w * kk)), h = Math.max(1, Math.round(r.h * kk));
  let M = nuevaMascara(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) M.m[y * w + x] = r.a[Math.min(r.h - 1, Math.floor(y / kk)) * r.w + Math.min(r.w - 1, Math.floor(x / kk))] > 0.5 ? 1 : 0;
  const G = mayor(M); M = rellena(G.mascara);
  return { mascara: M, k: w / canvas.width, metodo: 'ia:' + (r.modelo || 'motor del PC'), confianza: 0.85, avisos: [] };
}
