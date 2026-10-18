// ================= 👗 CelebriDREW · RECONSTRUCCIÓN INVERSA: de lo medido en la foto a una construcción de prenda =================
// Con los rasgos (en px), la escala y la categoría, elige la PLANTILLA y sus OPCIONES y rellena sus MEDIDAS. Cada cosa lleva su estado:
//   A · observado  → medido directamente en la foto (con su confianza)
//   B · inferido   → no se ve (la espalda en una foto de frente, el alto del puño…): lo pone la construcción típica de esa prenda
//   C · confirmar  → medido, pero poco fiable o fuera de lo normal: hay que mirarlo antes de dar el patrón por bueno
// No se inventa una costura que no se ve: la construcción (qué piezas y qué se cose con qué) es la PROBABLE para esa prenda, y se dice.
import { BLOQUES, POR_CATEGORIA, medidasPorDefecto } from '../bloques/index.js';
import { aMm } from './escala.js';

// qué medida de la plantilla sale de qué medida de la foto (y si es plana: × 2 para el contorno)
export const MAPA = {
  camiseta: { pecho: 'pecho', largo: 'largo', bajo: 'bajo', cuello: 'cuello', bajadaDel: 'bajadaDel', sisa: 'sisa', hombros: 'hombros', caida: 'caida', manga: 'manga', boca: 'boca', biceps: 'biceps' },
  sudadera: { pecho: 'pecho', largo: 'largo', cuello: 'cuello', bajadaDel: 'bajadaDel', sisa: 'sisa', hombros: 'hombros', caida: 'caida', manga: 'manga', boca: 'boca', biceps: 'biceps', altoCapucha: 'altoCapucha', alturaCintura: 'alturaCintura', alturaPuno: 'alturaPuno' }, // (17-10: la capucha que asoma; puños y cintura de la foto de producto)
  pantalon: { cintura: 'cintura', cadera: 'cadera', tiro: 'tiro', altoCadera: 'altoCadera', largo: 'largo', rodilla: 'rodilla', bajo: 'bajo' },
  falda: { cintura: 'cintura', cadera: 'cadera', altoCadera: 'altoCadera', largo: 'largo' },
  // (16-10) el vestido: el cuerpo como una prenda de arriba y la falda como una falda (largo = de la cintura al bajo)
  vestido: { pecho: 'pecho', cintura: 'cintura', cadera: 'cadera', altoCadera: 'altoCadera', largo: 'largo', cuello: 'cuello', bajadaDel: 'bajadaDel', sisa: 'sisa', hombros: 'hombros', caida: 'caida', manga: 'manga', boca: 'boca', biceps: 'biceps' },
};
export function infiere(rasgos, E, categoria, pistas = {}) {
  const [k, nota] = POR_CATEGORIA[categoria] || [categoria], D = BLOQUES[k]; if (!D) throw new Error('No hay plantilla para «' + categoria + '».');
  const def = medidasPorDefecto(k), medidas = {}, avisos = nota ? [nota] : [], comp = [], lim = Object.fromEntries(D.medidas.map(m => [m.k, m]));
  Object.entries(def).forEach(([m, v]) => { medidas[m] = { v, origen: 'plantilla', estado: 'inferido', conf: 0, como: 'valor típico de la plantilla (no se ve en la foto)' }; });
  Object.entries(MAPA[k] || {}).forEach(([m, r]) => { const x = rasgos.medidas[r]; if (!x) return; let v = aMm(x.vec, E) * (x.plano ? 2 : 1);
    let estado = x.conf >= 0.55 ? 'observado' : 'confirmar', como = x.como + (x.plano ? ' · × 2 porque la prenda está plana' : '');
    const L = lim[m]; if (L && (v < L.min || v > L.max)) { como += ' · salía ' + (v / 10).toFixed(1) + ' cm, fuera de lo posible: se ajusta al límite'; v = Math.max(L.min, Math.min(L.max, v)); estado = 'confirmar'; }
    medidas[m] = { v: Math.round(v * 10) / 10, origen: 'ia', estado, conf: x.conf, como }; });
  // la falda (y la del vestido): el vuelo sale del bajo
  if ((k === 'falda' || k === 'vestido') && rasgos.medidas.bajoPlano && rasgos.medidas.cadera) { const v = Math.max(0, (aMm(rasgos.medidas.bajoPlano.vec, E) - aMm(rasgos.medidas.cadera.vec, E)) / 2); medidas.vuelo = { v: Math.round(v), origen: 'ia', estado: v > 10 ? 'observado' : 'inferido', conf: 0.6, como: 'lo que el bajo es más ancho que la cadera, por costado' }; }
  // las OPCIONES de la construcción
  const opciones = {}, x = rasgos.extra || {};
  if (k === 'camiseta') { opciones.mangaTipo = x.manga === 'sin' ? 'sin' : x.manga === 'larga' ? 'larga' : 'corta'; opciones.escote = x.escote === 'pico' ? 'pico' : 'redondo'; opciones.rib = pistas.cuello === 'camisa' || pistas.cuello === 'polo' ? 'no' : 'si'; }
  if (k === 'sudadera') { opciones.cierre = pistas.cierre === 'cremallera' ? 'cremallera' : 'cerrada'; opciones.bolsillo = pistas.bolsillos === 0 ? 'no' : 'canguro'; }
  if (k === 'falda') opciones.forma = medidas.vuelo && medidas.vuelo.v > 20 ? 'evase' : 'recta';
  if (k === 'vestido') { opciones.mangaTipo = x.manga === 'larga' ? 'larga' : x.manga === 'corta' ? 'corta' : 'sin'; opciones.falda = medidas.vuelo && medidas.vuelo.v > 20 ? 'evase' : 'recta';
    // el TALLE de la espalda no se ve de frente: en la plantilla, del cuello en el hombro a la cintura hay «talle + 1,5 cm» (por detrás)
    const t = rasgos.medidas.talle; if (t) { const L = lim.espalda, v0 = aMm(t.vec, E) - 15, v = Math.max(L.min, Math.min(L.max, v0)); medidas.espalda = { v: Math.round(v), origen: 'ia', estado: 'confirmar', conf: 0.5, como: 'del cuello en el hombro a la cintura (' + (aMm(t.vec, E) / 10).toFixed(1) + ' cm) menos 1,5 cm: el talle de la espalda no se ve de frente' + (v !== v0 ? ' · salía fuera de lo posible: se ajusta al límite' : '') }; } }
  // lo que se ha visto, lo supuesto y lo que hay que confirmar (por piezas)
  const vista = pistas.vista || 'frontal';
  if (k === 'camiseta' || k === 'sudadera') {
    comp.push({ n: 'Delantero', estado: 'observado', conf: rasgos.sim || 0.5, nota: 'Contorno, cuello, hombros, sisa y bajo medidos en la foto.' });
    comp.push({ n: 'Espalda', estado: vista === 'trasera' ? 'observado' : 'inferido', conf: 0.5, nota: vista === 'trasera' ? 'Medida en la foto de espalda.' : 'No se ve en una foto de frente: se supone igual que el delantero con el escote de 2 cm (lo típico).' });
    if (opciones.mangaTipo !== 'sin') comp.push({ n: 'Manga', estado: rasgos.medidas.manga ? 'observado' : 'confirmar', conf: rasgos.medidas.manga ? rasgos.medidas.manga.conf : 0.2, nota: 'Largo, boca y ancho medidos; la COPA no se ve: se calcula para que mida lo mismo que la sisa.' });
    comp.push({ n: 'Costuras', estado: 'inferido', conf: 0.7, nota: 'Construcción típica: hombros, costados, sisas y costura bajo la manga. Las costuras no se ven en la foto.' });
    if (k === 'sudadera') comp.push({ n: 'Capucha, puños y cintura', estado: 'inferido', conf: 0.4, nota: 'Tamaños típicos: la capucha extendida casi nunca se ve en la foto.' });
  } else if (k === 'vestido') {
    comp.push({ n: 'Cuerpo delantero', estado: 'observado', conf: rasgos.sim || 0.5, nota: 'Pecho, cuello, hombros, sisa y cintura medidos en la foto. La PINZA DE PECHO no se ve: la pone la plantilla (copa media).' });
    comp.push({ n: 'Cuerpo de la espalda', estado: 'inferido', conf: 0.45, nota: 'No se ve de frente: el talle se calcula desde el delantero y lleva cremallera en el centro (lo típico).' });
    comp.push({ n: 'Falda', estado: 'observado', conf: 0.6, nota: 'Cintura, cadera, largo y vuelo medidos; las pinzas de la falda, por la construcción típica.' });
    if (opciones.mangaTipo !== 'sin') comp.push({ n: 'Manga', estado: rasgos.medidas.manga ? 'observado' : 'confirmar', conf: rasgos.medidas.manga ? rasgos.medidas.manga.conf : 0.2, nota: 'Largo, boca y ancho medidos; la copa se calcula para que case con la sisa.' });
    comp.push({ n: 'Costuras', estado: 'inferido', conf: 0.6, nota: 'Hombros, costados, cintura (cuerpo con falda), cremallera en la espalda. No se ven en la foto.' });
  } else comp.push({ n: k === 'falda' ? 'Delantero y espalda' : 'Delantero', estado: 'observado', conf: rasgos.sim || 0.5, nota: 'Medidas generales de la foto; la espalda y las pinzas, por la construcción típica.' }, { n: 'Pinzas y costuras', estado: 'inferido', conf: 0.5, nota: 'Calculadas por lo que la cintura es más estrecha que la cadera.' });
  const faltan = Object.entries(medidas).filter(([, v]) => v.estado === 'confirmar').map(([m]) => lim[m] ? lim[m].t : m);
  if (faltan.length) avisos.push('Revisa antes de dar el patrón por bueno: ' + faltan.join(', ') + '.');
  return { k, opciones, medidas, componentes: comp, avisos };
}
