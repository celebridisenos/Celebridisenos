// ================= 👗 CelebriDREW · DISEÑAR DESDE UNA IMAGEN (una prenda vista en internet, en una revista…) (16-10-2026) =================
// Ella: «si quiero hacer una que he visto en internet, tiene que leer esa imagen y hacer el patrón, ir cerrando los detalles con la IA si
// lleva varillas o puntos que se le puedan pasar, pero que sean lo mínimo».
// Una foto así NO trae medidas (no hay folio, la lleva otra persona): trae el DISEÑO. La IA de visión del PC lo lee (qué prenda es, dónde
// cae el bajo, la manga, el escote, el ajuste, la falda, el cierre, bolsillos, capucha, VARILLAS, tirantes, detalles) y el patrón se hace
// A LA MEDIDA DEL AVATAR: su cuerpo + la holgura del ajuste, y los largos en SUS niveles (rodilla, media pierna…). De la silueta recortada
// (SAM 2) sale cuánto se abre la falda. Lo que la IA no sabe seguro se PREGUNTA (como mucho 3 cosas); lo que la plantilla aún no sabe hacer se
// DICE (no se inventa). Todo sin pantalla: se prueba en Node (test/unit/drew_inspira.mjs).
import { CATEGORIAS } from './clasifica.js';
import { POR_CATEGORIA, BLOQUES } from '../bloques/index.js';

export const CAMPOS = [['categoria', 'Prenda'], ['largo', 'Largo (dónde cae el bajo)'], ['manga', 'Manga'], ['escote', 'Escote'], ['ajuste', 'Ajuste'], ['falda', 'Falda'], ['cierre', 'Cierre'],
  ['varillas', 'Varillas (corsé)'], ['tirantes', 'Tirantes finos'], ['capucha', 'Capucha'], ['bolsillos', 'Bolsillos'], ['cuello', 'Cuello'], ['puno', 'Puños'], ['bajo', 'Bajo (cómo acaba)'], ['tela', 'Tela']];
// (18-10) la FICHA de construcción: todos los campos por partes (no solo 3 preguntas), y en cada prenda solo los que le tocan
export const FICHA = [['La prenda', ['categoria', 'largo', 'ajuste']], ['Cuello y escote', ['escote', 'cuello', 'capucha']], ['Mangas y puños', ['manga', 'puno']], ['Bajo', ['bajo', 'falda']],
  ['Cierre y bolsillos', ['cierre', 'bolsillos']], ['Corsé y tirantes', ['varillas', 'tirantes']], ['Tela', ['tela']]];
export const TOCA = { // qué campos cuentan en cada plantilla (lo demás no cambia el patrón: no se pregunta)
  camiseta: ['categoria', 'largo', 'ajuste', 'escote', 'cuello', 'manga', 'puno', 'bajo', 'tirantes', 'tela'], sudadera: ['categoria', 'largo', 'ajuste', 'capucha', 'cuello', 'manga', 'puno', 'bajo', 'cierre', 'bolsillos', 'tela'],
  vestido: ['categoria', 'largo', 'ajuste', 'escote', 'manga', 'falda', 'bajo', 'cierre', 'varillas', 'tirantes', 'tela'], falda: ['categoria', 'largo', 'falda', 'bajo', 'tela'], pantalon: ['categoria', 'largo', 'ajuste', 'tela'] };
const SN = [['no', 'No'], ['si', 'Sí']];
export const VALORES = {
  categoria: [['camiseta', 'Camiseta / top'], ['sudadera', 'Sudadera'], ['jersey', 'Jersey'], ['chaleco', 'Chaleco'], ['vestido', 'Vestido'], ['pichi', 'Pichi'], ['falda', 'Falda'], ['pantalon', 'Pantalón'], ['camisa', 'Camisa / blusa'], ['chaqueta', 'Chaqueta'], ['abrigo', 'Abrigo'], ['polo', 'Polo'], ['vaquero', 'Vaquero'], ['corse', 'Corsé / bustier']],
  largo: [['bajo_pecho', 'Corto (bajo el pecho)'], ['cintura', 'Por la cintura'], ['cadera', 'Por la cadera'], ['bajo_cadera', 'Tapando la cadera'], ['medio_muslo', 'Medio muslo'], ['rodilla', 'Rodilla'], ['media_pierna', 'Media pierna (midi)'], ['tobillo', 'Tobillo'], ['suelo', 'Hasta el suelo']],
  manga: [['sin', 'Sin manga'], ['corta', 'Corta'], ['codo', 'Al codo'], ['tres_cuartos', 'Tres cuartos'], ['larga', 'Larga']],
  escote: [['redondo', 'Redondo'], ['pico', 'De pico'], ['barco', 'Barco'], ['cuadrado', 'Cuadrado'], ['palabra_de_honor', 'Palabra de honor'], ['halter', 'Halter'], ['cuello_alto', 'Cuello alto'], ['camisa', 'Cuello camisa'], ['capucha', 'Capucha']],
  ajuste: [['cenido', 'Ceñido'], ['normal', 'Normal'], ['holgado', 'Holgado'], ['oversize', 'Oversize']],
  falda: [['recta', 'Recta'], ['evase', 'Evasé'], ['capa', 'De capa'], ['plisada', 'Plisada'], ['sirena', 'Sirena'], ['globo', 'Globo']],
  cierre: [['ninguno', 'Sin cierre'], ['cremallera_espalda', 'Cremallera detrás'], ['cremallera_delante', 'Cremallera delante'], ['media_cremallera', 'Media cremallera'], ['botones', 'Botones'], ['cordones', 'Cordones']],
  cuello: [['ninguno', 'Sin cuello (solo el escote)'], ['alto', 'Cuello alto'], ['capucha', 'Capucha'], ['camisa', 'Cuello camisa'], ['polo', 'Cuello polo'], ['mao', 'Cuello mao']],
  puno: [['ninguno', 'Sin puño (dobladillo)'], ['punto', 'Puño de punto'], ['camisa', 'Puño de camisa']],
  bajo: [['dobladillo', 'Dobladillo'], ['punto', 'Cintura de punto'], ['volante', 'Volante'], ['cordon', 'Con cordón']],
  tela: [['liso', 'Lisa'], ['cuadros', 'Cuadros'], ['rayas', 'Rayas'], ['estampado', 'Estampada'], ['punto', 'Punto'], ['vaquero', 'Vaquero'], ['cuero', 'Cuero'], ['encaje', 'Encaje']],
  varillas: SN, tirantes: SN, capucha: SN, bolsillos: [['0', 'Ninguno'], ['1', '1'], ['2', '2'], ['3', '3 o más']],
};
export const nombreDe = (c, v) => ((VALORES[c] || []).find(x => x[0] === String(v)) || [])[1] || String(v);
export const PREGUNTA = 'You are an expert pattern maker. Look at the MAIN garment in the photo (the one you would make a sewing pattern of; if a garment is marked with a RED outline, that one). Answer ONLY a JSON object with these keys: ' +
  '"foto" (persona, maniqui, producto, prenda_plana, dibujo, patron), "sentada" (true if the person is sitting), "espejo" (true if it is a mirror selfie), "tapada" (true if arms, a bag or another garment hide part of the main garment), "cortada" (true if the image edge cuts the main garment), ' +
  '"categoria" (camiseta, top, polo, camisa, sudadera, jersey, chaleco, chaqueta, abrigo, vestido, pichi, falda, pantalon, vaquero, corse), ' +
  '"largo" (where the hem falls on the body: bajo_pecho, cintura, cadera, bajo_cadera, medio_muslo, rodilla, media_pierna, tobillo, suelo), ' +
  '"manga" (sin, corta, codo, tres_cuartos, larga), "escote" (redondo, pico, barco, cuadrado, palabra_de_honor, halter, cuello_alto, camisa, capucha), ' +
  '"cuello" (ninguno, camisa, polo, mao, alto, capucha), "ajuste" (cenido, normal, holgado, oversize), "falda" (recta, evase, capa, plisada, sirena, globo, no_aplica), ' +
  '"cierre" (ninguno, cremallera_espalda, cremallera_delante, media_cremallera, botones, cordones), "puno" (ninguno, dobladillo, punto, camisa), "bajo" (dobladillo, punto, volante, cordon), ' +
  '"bolsillos" (number you can see), "capucha" (true/false), "varillas" (true/false: corset bones), "tirantes" (true/false: thin straps instead of shoulders), ' +
  '"tela" (liso, cuadros, rayas, estampado, punto, vaquero, cuero, encaje), ' +
  '"otras_prendas" (array of short Spanish names of the OTHER garments you see, e.g. "camisa blanca debajo", "pantalón ancho"), ' +
  '"detalles" (array of short Spanish words for other details: volantes, lazo, fruncido, cinturon, abertura, encaje, botones, bordado, canesu, pinzas, logo…), ' +
  '"caja" ([x0, y0, x1, y1] box around the MAIN garment, in thousandths 0-1000 of the image width and height), "dudas" (array of the keys you are NOT sure about), ' +
  '"confianza" (0 to 1), "notas" (one short sentence in Spanish). Do not invent what you cannot see.';

const norm = v => String(v == null ? '' : v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_').trim();
const SIN = { // sinónimos que contestan los modelos (en inglés o con otras palabras)
  categoria: { tshirt: 'camiseta', t_shirt: 'camiseta', camisetas: 'camiseta', blusa: 'camisa', shirt: 'camisa', hoodie: 'sudadera', sweatshirt: 'sudadera', jacket: 'chaqueta', coat: 'abrigo', dress: 'vestido', skirt: 'falda', pants: 'pantalon', pantalones: 'pantalon', trousers: 'pantalon', jeans: 'vaquero', corset: 'corse', corse: 'corse', corset_top: 'corse', bustier: 'corse', crop_top: 'top', tank_top: 'top', blouse: 'camisa' },
  largo: { crop: 'bajo_pecho', cropped: 'bajo_pecho', waist: 'cintura', hip: 'cadera', hips: 'cadera', below_hip: 'bajo_cadera', mid_thigh: 'medio_muslo', muslo: 'medio_muslo', mini: 'medio_muslo', knee: 'rodilla', midi: 'media_pierna', calf: 'media_pierna', ankle: 'tobillo', maxi: 'tobillo', floor: 'suelo' },
  manga: { sleeveless: 'sin', ninguna: 'sin', tirantes: 'sin', short: 'corta', elbow: 'codo', three_quarter: 'tres_cuartos', '3/4': 'tres_cuartos', long: 'larga' },
  escote: { round: 'redondo', crew: 'redondo', v: 'pico', v_neck: 'pico', boat: 'barco', square: 'cuadrado', strapless: 'palabra_de_honor', sweetheart: 'palabra_de_honor', turtleneck: 'cuello_alto', alto: 'cuello_alto', collar: 'camisa', hood: 'capucha' },
  ajuste: { ceñido: 'cenido', ajustado: 'cenido', fitted: 'cenido', tight: 'cenido', regular: 'normal', loose: 'holgado', amplio: 'holgado' },
  falda: { straight: 'recta', pencil: 'recta', tubo: 'recta', a_line: 'evase', flared: 'evase', circle: 'capa', pleated: 'plisada', mermaid: 'sirena', balloon: 'globo' },
  cierre: { none: 'ninguno', zip_back: 'cremallera_espalda', cremallera: 'cremallera_espalda', zipper: 'cremallera_espalda', zip_front: 'cremallera_delante', half_zip: 'media_cremallera', quarter_zip: 'media_cremallera', buttons: 'botones', laces: 'cordones', lacing: 'cordones' },
  cuello: { none: 'ninguno', no: 'ninguno', sin: 'ninguno', redondo: 'ninguno', high: 'alto', turtleneck: 'alto', mock: 'alto', cuello_alto: 'alto', hood: 'capucha', shirt: 'camisa', collar: 'camisa', mandarin: 'mao' },
  puno: { none: 'ninguno', sin: 'ninguno', no: 'ninguno', hem: 'ninguno', dobladillo: 'ninguno', rib: 'punto', ribbed: 'punto', elastico: 'punto', cuff: 'camisa', volante: 'ninguno' },
  bajo: { hem: 'dobladillo', ninguno: 'dobladillo', none: 'dobladillo', rib: 'punto', ribbed: 'punto', elastico: 'punto', ruffle: 'volante', volantes: 'volante', drawstring: 'cordon', abierto: 'dobladillo' },
  tela: { plain: 'liso', lisa: 'liso', plaid: 'cuadros', tartan: 'cuadros', checked: 'cuadros', striped: 'rayas', stripes: 'rayas', print: 'estampado', printed: 'estampado', knit: 'punto', denim: 'vaquero', leather: 'cuero', lace: 'encaje' },
};
const elige = (c, v) => { const n = norm(v), L = VALORES[c] || []; if (L.some(x => x[0] === n)) return n; const s = (SIN[c] || {})[n]; if (s) return s; if (c === 'categoria' && (CATEGORIAS[n] || n === 'top' || n === 'corse')) return n; return null; };
const bool = v => v === true || /^(true|si|sí|yes|1)$/i.test(String(v == null ? '' : v).trim());
// la respuesta de la IA → LECTURA: { campo: { v, ia: true, duda } } + caja (fracciones 0–1), detalles, notas, confianza
export function lee(j, o = {}) {
  j = j || {}; const dudas = new Set((Array.isArray(j.dudas) ? j.dudas : []).map(norm)), L = { campos: {}, detalles: [], caja: null, notas: String(j.notas || '').slice(0, 240), confianza: Math.max(0, Math.min(1, +j.confianza || 0)), modelo: o.modelo || null };
  const pon = (c, v) => { L.campos[c] = { v, ia: true, duda: v == null || dudas.has(c) || L.confianza < 0.35 }; };
  ['categoria', 'largo', 'manga', 'escote', 'ajuste', 'falda', 'cierre', 'cuello', 'puno', 'bajo', 'tela'].forEach(c => pon(c, elige(c, j[c])));
  // (18-10) la FOTO: qué es, postura, espejo, lo que tapa o corta, las otras prendas que se ven (para avisar y para elegir otra)
  const lista = v => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? v.split(/\s*[,;]\s*/) : []).map(x => String(x).trim()).filter(Boolean).slice(0, 6);
  const tf = typeof j.foto === 'string' ? norm(j.foto) : j.foto && typeof j.foto === 'object' ? (Object.entries(j.foto).find(([, v]) => v === true) || [])[0] || null : null;
  L.foto = { tipo: tf, sentada: bool(j.sentada), espejo: bool(j.espejo), tapada: bool(j.tapada), cortada: bool(j.cortada), otras: lista(j.otras_prendas) };
  pon('varillas', bool(j.varillas) ? 'si' : 'no'); pon('tirantes', bool(j.tirantes) ? 'si' : 'no'); pon('capucha', bool(j.capucha) ? 'si' : 'no');
  const nb = Number.isFinite(+j.bolsillos) ? Math.max(0, Math.min(3, Math.round(+j.bolsillos))) : null; pon('bolsillos', nb == null ? null : String(nb));
  L.detalles = (Array.isArray(j.detalles) ? j.detalles : typeof j.detalles === 'string' ? j.detalles.split(/\s*[,;]\s*/) : []).map(x => String(x).trim().toLowerCase().replace(/^laço$/, 'lazo').replace(/^laços$/, 'lazos')).filter(Boolean).slice(0, 12);
  if (Array.isArray(j.caja) && j.caja.length === 4 && j.caja.every(v => Number.isFinite(+v))) { let c = j.caja.map(Number); const esc = Math.max(...c) <= 1.001 ? 1 : 1000; c = c.map(v => Math.max(0, Math.min(1, v / esc))); if (c[2] - c[0] > 0.05 && c[3] - c[1] > 0.05) L.caja = c; }
  return L;
}
// lo que la persona cambia: pasa a ser suyo (sin duda)
export function cambia(L, c, v) { L.campos[c] = { v, ia: false, duda: false }; return L; }
const val = (L, c, d) => (L.campos[c] && L.campos[c].v != null ? L.campos[c].v : d);

// LECTURA → DISEÑO: plantilla, opciones, ajuste, largos (por niveles del cuerpo), qué hace y qué NO hace el patrón, y lo que hay que preguntar
export function diseno(L, sil) {
  let cat = val(L, 'categoria', null); const capucha = val(L, 'capucha', 'no') === 'si', varillas = val(L, 'varillas', 'no') === 'si', tirantes = val(L, 'tirantes', 'no') === 'si', largo = val(L, 'largo', null);
  const hace = [], noHace = [], notas = [];
  if (cat === 'top') cat = 'camiseta';
  // (18-10) PICHI = vestido sin mangas (normalmente de escote cuadrado) · JERSEY = sudadera sin capucha · CHALECO = camiseta sin mangas
  if (cat === 'pichi') { cat = 'vestido'; if (!L.campos.manga || !L.campos.manga.toco) L.campos.manga = Object.assign({}, L.campos.manga, { v: 'sin' }); }
  if (cat === 'corse') { if (['medio_muslo', 'rodilla', 'media_pierna', 'tobillo', 'suelo'].includes(largo)) cat = 'vestido'; else { cat = 'camiseta'; noHace.push('Corsé suelto con varillas: de momento las varillas solo van en el VESTIDO (el cuerpo sale como un top sin mangas).'); } }
  if (capucha && ['camiseta', 'camisa', 'polo'].includes(cat)) cat = 'sudadera';
  if (!cat) cat = 'camiseta';
  const [k, nota] = POR_CATEGORIA[cat] || ['camiseta', 'No hay plantilla para «' + cat + '»: se propone la de camiseta.']; if (nota) noHace.push(nota);
  const manga = val(L, 'manga', null), escote = val(L, 'escote', null), falda = val(L, 'falda', null), cierre = val(L, 'cierre', null), ajusteIA = val(L, 'ajuste', 'normal'), nb = +val(L, 'bolsillos', 0) || 0;
  const ajuste = { cenido: 'ajustada', normal: 'normal', holgado: 'holgada', oversize: 'oversize' }[ajusteIA] || 'normal', opciones = {};
  const mangaTipo = manga === 'sin' || tirantes ? 'sin' : manga === 'corta' || manga == null ? 'corta' : 'larga';
  const cuello = val(L, 'cuello', null), puno = val(L, 'puno', null), bajoT = val(L, 'bajo', null), tela = val(L, 'tela', null);
  if (k === 'camiseta') { opciones.mangaTipo = cat === 'chaleco' ? 'sin' : mangaTipo; opciones.escote = escote === 'pico' || cat === 'chaleco' ? 'pico' : escote === 'cuadrado' ? 'cuadrado' : escote === 'cuello_alto' || cuello === 'alto' ? 'alto' : 'redondo';
    opciones.rib = escote === 'camisa' || cat === 'polo' || cat === 'camisa' ? 'no' : 'si'; opciones.puno = puno === 'punto' ? 'punto' : 'dobladillo'; opciones.bajo = bajoT === 'punto' ? 'punto' : 'dobladillo'; }
  if (k === 'sudadera') { opciones.cierre = cierre === 'cremallera_delante' || cat === 'chaqueta' || cat === 'abrigo' ? 'cremallera' : cierre === 'media_cremallera' ? 'media' : 'cerrada'; opciones.bolsillo = nb === 0 && L.campos.bolsillos && L.campos.bolsillos.v != null ? 'no' : 'canguro';
    // (18-10) sin capucha (jersey, sudadera de cuello redondo como la suya «Archivio»): cuello redondo con tira de punto, o cuello alto
    opciones.cuelloTipo = capucha || cuello === 'capucha' || escote === 'capucha' ? 'capucha' : cuello === 'alto' || escote === 'cuello_alto' ? 'alto' : L.campos.capucha && L.campos.capucha.v === 'no' && (L.campos.capucha.ia || L.campos.capucha.toco) ? 'redondo' : 'capucha';
    opciones.puno = puno === 'ninguno' ? 'sin' : 'elastico'; opciones.bajo = bajoT === 'dobladillo' ? 'recto' : bajoT === 'cordon' ? 'cordon' : 'elastico'; }
  if (k === 'falda') { opciones.forma = !falda || falda === 'recta' ? 'recta' : 'evase'; opciones.bajo = bajoT === 'volante' ? 'volante' : 'dobladillo'; }
  if (k === 'vestido') { opciones.mangaTipo = mangaTipo; opciones.falda = !falda || falda === 'recta' ? 'recta' : 'evase'; opciones.varillas = varillas ? 'si' : 'no';
    opciones.escote = escote === 'pico' ? 'pico' : escote === 'cuadrado' ? 'cuadrado' : 'redondo'; opciones.bajo = bajoT === 'volante' ? 'volante' : 'dobladillo'; }
  if (k === 'pantalon') opciones.pierna = ajusteIA === 'cenido' ? 'pitillo' : ajusteIA === 'holgado' || ajusteIA === 'oversize' || falda === 'evase' ? 'ancha' : 'recta';
  // lo que hace y lo que NO (todavía) la plantilla
  if (manga && mangaTipo === 'larga' && manga !== 'larga') hace.push('Manga ' + nombreDe('manga', manga).toLowerCase() + ': la manga larga cortada a ese largo.');
  if (escote === 'cuadrado' && (k === 'camiseta' || k === 'vestido')) hace.push('Escote cuadrado (delante), rematado con vista o bies.');
  if (k === 'camiseta' && opciones.escote === 'alto') hace.push('Cuello alto de punto (6 cm).');
  if (opciones.bajo === 'volante') hace.push('Volante fruncido en el bajo (1,35 veces el bajo).');
  if ((k === 'camiseta' && opciones.puno === 'punto') || (k === 'sudadera' && opciones.puno === 'elastico')) hace.push('Puños de punto.');
  if ((k === 'camiseta' && opciones.bajo === 'punto') || (k === 'sudadera' && opciones.bajo === 'elastico')) hace.push('Cintura de punto en el bajo.');
  if (k === 'sudadera' && opciones.cuelloTipo === 'redondo') hace.push('Sin capucha: cuello redondo con tira de punto.');
  if (tela && ['cuadros', 'rayas', 'estampado'].includes(tela)) hace.push('Tela ' + nombreDe('tela', tela).toLowerCase() + ': en el 3D se pone la de la foto (si se ha recortado la prenda).');
  if (cuello && ['camisa', 'polo', 'mao'].includes(cuello) && k !== 'sudadera') noHace.push('Cuello ' + nombreDe('cuello', cuello).toLowerCase().replace(/^cuello /, '') + ': falta su plantilla (cuello con pie y tapeta); se deja el escote y se dice.');
  if (puno === 'camisa') noHace.push('Puño de camisa (con botón): falta su plantilla; se deja con dobladillo.');
  if (escote && ['palabra_de_honor', 'halter'].includes(escote)) noHace.push('Escote ' + nombreDe('escote', escote).toLowerCase() + ': el patrón lo traza redondo; dale la forma en el 2D (mueve sus puntos).');
  if (escote === 'barco' || escote === 'cuello_alto') hace.push('Escote ' + nombreDe('escote', escote).toLowerCase() + ': más ' + (escote === 'barco' ? 'ancho y poco hondo' : 'alto') + '.');
  if (escote === 'camisa' && k !== 'camiseta') noHace.push('Cuello camisa: falta la plantilla de camisa (cuello, pie y tapeta).');
  if (falda && ['capa', 'plisada', 'sirena', 'globo'].includes(falda) && (k === 'falda' || k === 'vestido')) noHace.push('Falda ' + nombreDe('falda', falda).toLowerCase() + ': sale evasé' + (falda === 'capa' ? ' con mucho vuelo' : '') + '; ' + (falda === 'plisada' ? 'los pliegues' : falda === 'sirena' ? 'el corte de sirena' : falda === 'globo' ? 'el globo' : 'la capa entera') + ' aún no.');
  if (cierre === 'media_cremallera' && k !== 'sudadera') noHace.push('Media cremallera: de momento, solo en la sudadera.');
  if (cierre === 'botones' || cierre === 'cordones') noHace.push((cierre === 'botones' ? 'Botones' : 'Cordones') + ': añádelos a mano (márcalos en el 2D).');
  if (cierre === 'cremallera_espalda' && k === 'vestido') hace.push('Cremallera invisible en el centro de la espalda.');
  if (varillas && k === 'vestido') hace.push('VARILLAS: canales en el cuerpo (pinzas, costados y a los lados de la cremallera), con su largo y en el manual.');
  else if (varillas && !noHace.some(t => /varillas/i.test(t))) noHace.push('Varillas: de momento solo en el VESTIDO.');
  if (tirantes) hace.push('Tirantes finos: hombros estrechos (3,5 cm a cada lado del cuello).');
  if (nb > 0 && k !== 'sudadera') noHace.push('Bolsillos (' + nb + '): añádelos a mano.');
  const conocidos = /pinza|cinturilla|cremallera|volante|logo|bordado|punto/;
  L.detalles.forEach(d => { if (!conocidos.test(d) && !noHace.some(t => t.toLowerCase().includes(d))) noHace.push(d.charAt(0).toUpperCase() + d.slice(1) + ': no lo hace el patrón (añádelo a mano).'); });
  let vuelo = null; if ((k === 'falda' || k === 'vestido') && opciones[k === 'falda' ? 'forma' : 'falda'] === 'evase') vuelo = sil && sil.perfil ? { perfil: sil.perfil, rel: sil.vueloRel } : sil && sil.vueloRel != null ? { rel: sil.vueloRel } : { fijo: falda === 'capa' ? 220 : 60 };
  // lo que hay que preguntar (como mucho 3): lo que la IA no sabe seguro y cambia el patrón
  const importa = { categoria: 1, largo: 1, manga: k !== 'falda' && k !== 'pantalon', ajuste: 1, falda: k === 'falda' || k === 'vestido', escote: k !== 'falda' && k !== 'pantalon', varillas: k === 'vestido', tirantes: k === 'vestido' || k === 'camiseta', cierre: 0, capucha: 0, bolsillos: 0 };
  // (16-10, probado con la IA del PC: acierta la prenda, las mangas y la capucha, pero FALLA a menudo el LARGO y la FORMA de la falda aunque
  //  diga que está segura → esos dos se confirman siempre con un toque si los ha puesto la IA; lo demás, solo si duda. Como mucho 3.)
  const debil = c => (c === 'largo' || c === 'falda') && L.campos[c] && L.campos[c].ia;
  const preguntas = ['categoria', 'largo', 'falda', 'manga', 'ajuste', 'escote', 'varillas', 'tirantes'].filter(c => importa[c] && L.campos[c] && (L.campos[c].duda || debil(c))).slice(0, 3);
  return { k, cat, opciones, ajuste, largo, manga, escote, falda, varillas: varillas && k === 'vestido', tirantes, vuelo, hace, noHace, preguntas, nombre: (BLOQUES[k] || {}).t + ' de la imagen' };
}

// el DISEÑO en SU cuerpo → las medidas (mm) que manda la imagen: largo, manga, boca, vuelo, hombros y escote. M = las que salen del cuerpo
// (tallas.medidasPrenda con el ajuste); med = el avatar (cm); N = sus niveles (mm desde el suelo). Siempre dentro de lo que admite la plantilla.
export function medidas(D, med, N, M) {
  if (!N || !med) return {}; const out = {}, lim = Object.fromEntries((BLOQUES[D.k] || { medidas: [] }).medidas.map(m => [m.k, m])), pon = (k, v) => { const l = lim[k]; if (!l || !isFinite(v)) return; out[k] = Math.round(Math.max(l.min, Math.min(l.max, v))); };
  const bajo = { bajo_pecho: N.bajoPecho - 20, cintura: N.cintura, cadera: N.cadera, bajo_cadera: N.entrepierna - 10, medio_muslo: (N.entrepierna + N.rodilla) / 2, rodilla: N.rodilla + 20, media_pierna: (N.rodilla + N.tobillo) / 2, tobillo: N.tobillo + 25, suelo: 20 }[D.largo];
  if (bajo != null) { if (D.k === 'camiseta' || D.k === 'sudadera') { let L = N.c7 - bajo; const sisa = (M && M.sisa) || 220, minimo = D.k === 'sudadera' ? sisa + ((M && M.alturaCintura) || 70) + 160 : sisa + 130;
      // (una sudadera o camiseta muy corta, «crop»: la plantilla no baja de ahí; se deja en su mínimo y se DICE)
      if (L < minimo) { L = minimo; if (D.noHace && !D.noHace.some(t => /Muy corta/.test(t))) D.noHace.push('Muy corta («crop»): esta plantilla no baja de ' + Math.round(minimo / 10) + ' cm de largo; se deja ahí (acórtala en el 2D si la quieres más corta).'); }
      pon('largo', L); } else if (N.cintura - bajo > 150) pon('largo', N.cintura - bajo); }
  const brazo = (med.brazo || 60) * 10, bic = M && M.biceps;
  if (D.k !== 'falda' && D.k !== 'pantalon' && D.manga) { if (D.manga === 'codo') { pon('manga', 0.55 * brazo); if (bic) pon('boca', 0.86 * bic); } else if (D.manga === 'tres_cuartos') { pon('manga', 0.78 * brazo); if (bic) pon('boca', 0.72 * bic); } }
  if (D.vuelo && (D.k === 'falda' || D.k === 'vestido')) { const cad = (M && M.cadera) || (med.cadera || 96) * 10; let rel = D.vuelo.rel;
    // con la silueta entera: la cadera se mira donde cae SU cadera entre la cintura y el bajo (en un evasé, la falda ya se abre ahí)
    if (D.vuelo.perfil && bajo != null && N.cintura - bajo > 100) { const Pf = D.vuelo.perfil, fH = Math.max(0.05, Math.min(0.6, (N.cintura - N.cadera) / (N.cintura - bajo))), x = fH * (Pf.length - 1), i = Math.floor(x), t = x - i;
      const anchoCadera = Pf[i] * (1 - t) + Pf[Math.min(Pf.length - 1, i + 1)] * t, anchoBajo = Pf[Pf.length - 1]; if (anchoCadera > 0) rel = Math.max(1, Math.min(2.5, anchoBajo / anchoCadera)); }
    pon('vuelo', D.vuelo.fijo != null ? D.vuelo.fijo : Math.max(0, (rel - 1) * cad / 4)); }
  if (D.tirantes && M && M.cuello) pon('hombros', M.cuello + 70);
  if (D.escote === 'barco' && M && M.cuello) { pon('cuello', M.cuello + 60); pon('bajadaDel', 30); }
  if (D.escote === 'cuello_alto') pon('bajadaDel', 30);
  return out;
}
// la SILUETA recortada (máscara de SAM) de una falda o un vestido → cuánto se abre el bajo respecto a la cadera (vueloRel) · null si no se sabe
export function silueta(Mk) {
  if (!Mk) return null; const { w, h, m } = Mk, filas = []; let y0 = -1, y1 = -1;
  // (16-10: el recorte puede traer trozos sueltos —brazos, manos, el bolso—: en cada altura se mide solo el tramo CENTRAL de la prenda,
  //  el que pasa por su eje, saltando huecos pequeños; lo que está separado por un hueco grande no cuenta)
  const xs = []; for (let y = Math.round(h * 0.25); y < Math.round(h * 0.75); y++) for (let x = 0; x < w; x++) if (m[y * w + x]) xs.push(x);
  if (!xs.length) for (let i = 0; i < m.length; i++) if (m[i]) xs.push(i % w);
  if (!xs.length) return null; xs.sort((p, q) => p - q); const eje = xs[xs.length >> 1], salto = Math.max(2, Math.round(0.02 * w)), busca = Math.max(3, Math.round(0.06 * w));
  for (let y = 0; y < h; y++) { const f = y * w; let c = -1; for (let d = 0; d <= busca && c < 0; d++) { if (eje - d >= 0 && m[f + eje - d]) c = eje - d; else if (eje + d < w && m[f + eje + d]) c = eje + d; }
    if (c < 0) { filas.push(0); continue; }
    let a = c, b = c, hueco = 0; for (let x = c - 1; x >= 0; x--) { if (m[f + x]) { a = x; hueco = 0; } else if (++hueco > salto) break; }
    hueco = 0; for (let x = c + 1; x < w; x++) { if (m[f + x]) { b = x; hueco = 0; } else if (++hueco > salto) break; }
    filas.push(b - a + 1); if (y0 < 0) y0 = y; y1 = y; }
  if (y0 < 0 || y1 - y0 < 20) return null; const alto = y1 - y0, fila = f => filas[Math.round(y0 + f * alto)];
  let cin = { w: Infinity, f: 0.3 }; for (let f = 0.15; f <= 0.5; f += 0.01) { const v = fila(f); if (v > 0 && v < cin.w) cin = { w: v, f }; }
  let cad = { w: 0 }; for (let f = cin.f; f <= Math.min(0.95, cin.f + 0.25); f += 0.01) { const v = fila(f); if (v > cad.w) cad = { w: v, f }; }
  const bajo = [0.97, 0.98, 0.99].map(fila).sort((a, b) => a - b)[1];
  if (!(cad.w > 0 && bajo > 0)) return null;
  // el ANCHO de la prenda de la cintura al bajo (40 tramos): con él, medidas() mira la cadera donde cae la del avatar
  const perfil = []; for (let i = 0; i <= 40; i++) { const f = cin.f + (0.985 - cin.f) * i / 40; perfil.push(fila(Math.min(0.99, f))); } perfil[40] = bajo;
  return { vueloRel: Math.max(1, Math.min(2.5, bajo / cad.w)), cintura: cin.w, cadera: cad.w, bajo, alto, perfil };
}
