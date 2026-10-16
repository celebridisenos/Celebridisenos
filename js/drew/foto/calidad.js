// ================= 👗 CelebriDREW · ¿la FOTO sirve? (calidad, antes de analizar) =================
// Mide, sin inventar: el tamaño (lado corto), la NITIDEZ (varianza del laplaciano en gris a 512 px: una foto movida da poco), la luz
// (media, zonas quemadas y negras) y el contraste. Devuelve una puntuación 0–1, los avisos en claro y si alcanza para reconstruir.
// Los umbrales están aquí escritos (UMBRALES) y salen de probar con fotos buenas y malas; son orientativos.
import { reduce, gris } from './imagen.js';

export const UMBRALES = { ladoMin: 500, ladoBueno: 1000, nitidezMin: 40, nitidezBuena: 150, quemadoMax: 0.08, negroMax: 0.15, contrasteMin: 25 };
export function calidad(img) {
  const U = UMBRALES, lado = Math.min(img.w, img.h), { img: r } = reduce(img, 512), g = gris(r), w = r.w, h = r.h, avisos = [];
  let s = 0, s2 = 0, n = 0; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, L = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]; s += L; s2 += L * L; n++; }
  const nitidez = n ? s2 / n - (s / n) ** 2 : 0;
  let m = 0, q = 0, ne = 0; for (const v of g) { m += v; if (v > 250) q++; if (v < 6) ne++; } m /= g.length; let sd = 0; for (const v of g) sd += (v - m) ** 2; sd = Math.sqrt(sd / g.length);
  const quemado = q / g.length, negro = ne / g.length;
  if (lado < U.ladoMin) avisos.push('Foto pequeña (' + lado + ' px de lado corto): los detalles (costuras, bolsillos) no se verán bien. Mejor más de ' + U.ladoBueno + ' px.');
  if (nitidez < U.nitidezMin) avisos.push('Foto borrosa o movida: los bordes no se ven nítidos.');
  if (quemado > U.quemadoMax) avisos.push('Hay mucha zona quemada (blanco puro): una prenda blanca sobre fondo blanco se recorta mal.');
  if (negro > U.negroMax) avisos.push('Hay mucha zona negra: falta luz.');
  if (sd < U.contrasteMin) avisos.push('Poco contraste entre la prenda y el fondo.');
  const p = Math.max(0, Math.min(1, 0.35 * Math.min(1, lado / U.ladoBueno) + 0.35 * Math.min(1, nitidez / U.nitidezBuena) + 0.15 * (quemado < U.quemadoMax ? 1 : 0.3) + 0.15 * Math.min(1, sd / 50)));
  return { lado, ancho: img.w, alto: img.h, nitidez: Math.round(nitidez), brillo: Math.round(m), contraste: Math.round(sd), quemado, negro, puntuacion: p, avisos, suficiente: lado >= U.ladoMin * 0.7 && nitidez >= U.nitidezMin * 0.6 };
}
