// ================= 👗 CelebriDREW · DISEÑOS LISTOS (un clic y el avatar sale vestido) y el PRECIO de la prenda =================
// · DISEÑOS: cada uno es una plantilla + cómo es (opciones) + ajuste + tela y color (+ algún largo). Las medidas salen del cuerpo del
//   avatar (tallas.js), así que el diseño le queda a cualquier cuerpo. Para añadir uno: una línea aquí.
// · PRECIO (ESTIMADO, se dice): tela que gasta el patrón (piezas con márgenes y copias, en un ancho de tela, + 15 % de aprovechamiento)
//   × €/m de esa tela + mercería + horas de costura (cortar + cada paso del montaje) × €/h; el precio de venta = coste × margen.
//   Los precios por defecto son ORIENTATIVOS de tienda de tejidos (España, 2026); ella pone los suyos y se guardan en este aparato.
import { consumoTela } from './pdf_montaje.js';
import { pasos, varillas } from './montaje.js';
import { TELAS } from './tela.js';

export const DISENOS = [
  { id: 'camiseta_basica', e: '👕', t: 'Camiseta básica', d: 'Manga corta, cuello redondo con canalé', k: 'camiseta', opciones: { mangaTipo: 'corta', escote: 'redondo', rib: 'si' }, ajuste: 'normal', tela: 'punto', color: '#f2efe8' },
  { id: 'camiseta_oversize', e: '🖤', t: 'Camiseta oversize', d: 'Ancha y caída, de hombro bajo', k: 'camiseta', opciones: { mangaTipo: 'corta', escote: 'redondo', rib: 'si' }, ajuste: 'oversize', tela: 'punto', color: '#1f1f24' },
  { id: 'camiseta_pico', e: '🤍', t: 'Camiseta manga larga de pico', d: 'Ajustada, cuello de pico', k: 'camiseta', opciones: { mangaTipo: 'larga', escote: 'pico', rib: 'si' }, ajuste: 'ajustada', tela: 'punto', color: '#c9a0b6' },
  { id: 'sudadera_capucha', e: '🧥', t: 'Sudadera con capucha', d: 'Felpa, bolsillo canguro, puños', k: 'sudadera', opciones: { bolsillo: 'canguro', cierre: 'cerrada' }, ajuste: 'normal', tela: 'felpa', color: '#9aa3ad' },
  { id: 'falda_lapiz', e: '🖤', t: 'Falda lápiz', d: 'Recta, por la rodilla', k: 'falda', opciones: { forma: 'recta' }, ajuste: 'ajustada', tela: 'gabardina', color: '#1f1f24', medidas: { largo: 600 } },
  { id: 'falda_evase', e: '🌸', t: 'Falda evasé midi', d: 'Con vuelo, por debajo de la rodilla', k: 'falda', opciones: { forma: 'evase' }, ajuste: 'normal', tela: 'lino', color: '#d7cdb8', medidas: { largo: 700, vuelo: 90 } },
  { id: 'pantalon_recto', e: '👖', t: 'Pantalón vaquero recto', d: 'Vaquero de pierna recta', k: 'pantalon', opciones: { pierna: 'recta' }, ajuste: 'normal', tela: 'denim', color: 'natural' },
  { id: 'pantalon_ancho', e: '🤎', t: 'Pantalón ancho', d: 'Pierna ancha y fluida', k: 'pantalon', opciones: { pierna: 'ancha' }, ajuste: 'holgada', tela: 'lino', color: '#b59b74' },
  { id: 'vestido_tubo', e: '🍷', t: 'Vestido tubo', d: 'Entallado, sin mangas, por la rodilla', k: 'vestido', opciones: { mangaTipo: 'sin', falda: 'recta' }, ajuste: 'ajustada', tela: 'gabardina', color: '#7a2b3a', medidas: { largo: 560 } },
  { id: 'vestido_coctel', e: '💙', t: 'Vestido de cóctel', d: 'Manga corta y falda con vuelo', k: 'vestido', opciones: { mangaTipo: 'corta', falda: 'evase' }, ajuste: 'normal', tela: 'saten', color: '#1f2a44', medidas: { largo: 600, vuelo: 80 } },
  { id: 'vestido_largo', e: '🌙', t: 'Vestido largo de satén', d: 'Sin mangas, falda larga con vuelo', k: 'vestido', opciones: { mangaTipo: 'sin', falda: 'evase' }, ajuste: 'normal', tela: 'saten', color: '#c9a0b6', medidas: { largo: 1050, vuelo: 140 } },
];

// ---------- PRECIO ----------
export const PRECIO_TELA = { punto: 9, felpa: 13, rib: 11, algodon: 9, denim: 14, gabardina: 13, seda: 28, lino: 16, elastica: 13, saten: 14, poliester: 7, organza: 10, lana: 20, polipiel: 16, cuero: 60, ante: 40 }; // €/m (ancho 150 cm)
export const MERCERIA = { camiseta: 1.2, sudadera: 3.5, falda: 4, pantalon: 5.5, vestido: 4.5 }; // hilo, cremallera, botón, entretela, cordón…
export const POR_DEFECTO = { horaCostura: 12, margen: 2.2, minCorte: 20, minPaso: 9 };
export function precio(prenda, o = {}) {
  const k = (prenda.bloque && prenda.bloque.k) || '', cfg = Object.assign({}, POR_DEFECTO, o.cfg || {}), precios = Object.assign({}, PRECIO_TELA, o.precios || {});
  const telaK = o.tela || (prenda.tejido === 'punto' ? (k === 'sudadera' ? 'felpa' : 'punto') : k === 'pantalon' ? 'denim' : 'gabardina'), c = consumoTela(prenda, o.ancho || 1500);
  const tela = c.m * (precios[telaK] || 10), merceria = o.merceria != null ? o.merceria : (MERCERIA[k] || 2) + varillas(prenda).reduce((t, v) => t + v.n * 0.6, 0), /* (16-10: cada varilla con su cinta de canal ≈ 0,60 €, orientativo) */ L = pasos(prenda, o.tipos), minutos = cfg.minCorte + L.length * cfg.minPaso, mano = minutos / 60 * cfg.horaCostura;
  const coste = tela + merceria + mano, venta = coste * cfg.margen;
  return { telaK, telaT: (TELAS[telaK] || {}).t || telaK, metros: c.m, eurM: precios[telaK] || 10, tela, merceria, minutos, mano, coste, venta, pasos: L.length, cfg };
}
export const eur = x => (Math.round(x * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
