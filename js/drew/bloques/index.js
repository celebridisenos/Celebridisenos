// ================= 👗 CelebriDREW · las PLANTILLAS (registro ampliable) =================
// Para añadir una prenda: un archivo con { k, e, t, categoria, tejido, medidas, opciones, genera(medidas, opciones) → { piezas, costuras,
// avisos } } y una línea aquí. La foto, las tallas, la validación, el editor y la exportación la usan sin tocar nada más.
import { CAMISETA } from './camiseta.js';
import { SUDADERA } from './sudadera.js';
import { FALDA } from './falda.js';
import { PANTALON } from './pantalon.js';
import { VESTIDO } from './vestido.js';

export const BLOQUES = { camiseta: CAMISETA, sudadera: SUDADERA, falda: FALDA, pantalon: PANTALON, vestido: VESTIDO };
// qué plantilla sirve para cada categoría que reconoce la foto (las que aún no tienen la suya, a la más parecida, AVISANDO)
export const POR_CATEGORIA = { camiseta: ['camiseta'], polo: ['camiseta', 'Polo: de momento se traza como camiseta (falta la tapeta y el cuello de polo).'], sudadera: ['sudadera'], 'sudadera sin capucha': ['camiseta', 'Sudadera sin capucha: se traza como camiseta de manga larga (añade puños y cintura a mano).'],
  camisa: ['camiseta', 'Camisa: todavía no hay plantilla de camisa (canesú, cuello, puños, tapeta): se propone la base de camiseta y hay que confirmarlo.'], chaqueta: ['sudadera', 'Chaqueta: se propone la base de sudadera con cremallera; falta la plantilla de chaqueta.'], abrigo: ['sudadera', 'Abrigo: falta la plantilla; se propone la base de sudadera con cremallera.'],
  vestido: ['vestido'], falda: ['falda'], pantalon: ['pantalon'], vaquero: ['pantalon', 'Vaquero: se traza como pantalón base (sin canesú ni bolsillos de vaquero todavía).'], deporte: ['camiseta'] };
export const medidasPorDefecto = k => Object.fromEntries(BLOQUES[k].medidas.map(m => [m.k, m.v]));
export const opcionesPorDefecto = k => Object.fromEntries((BLOQUES[k].opciones || []).map(o => [o.k, o.v]));
// generar una prenda desde una plantilla: { categoria, bloque: { k, medidas, opciones }, piezas, costuras }
export function genera(k, medidas, opciones) {
  const D = BLOQUES[k]; if (!D) throw new Error('No hay plantilla «' + k + '».');
  const M = Object.assign(medidasPorDefecto(k), medidas || {}), O = Object.assign(opcionesPorDefecto(k), opciones || {}), R = D.genera(M, O);
  R.piezas.forEach(p => { p.meta.origen = 'plantilla:' + k; });
  return { categoria: D.categoria, tejido: D.tejido, bloque: { k, medidas: M, opciones: O }, piezas: R.piezas, costuras: R.costuras, avisos: R.avisos || [] };
}
