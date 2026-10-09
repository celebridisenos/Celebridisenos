// ================= v18 · 🧊 CelebriR8 · «PÍDEMELO CON PALABRAS» =================
// «Tiene que ser un similar a Fusion pero de IA» (la dueña, 9-10-2026). Escribes lo que necesitas como se lo dirías a una
// persona —«una caja de 12 × 8 × 5 cm con tapa», «engranaje de 24 dientes con eje de 6», «llavero corazón que ponga Lucía»,
// «tapón para un tubo de 32»— y el programa elige la plantilla y rellena las medidas.
// Quién lo entiende: ESTE archivo, con reglas (palabras clave y números con su unidad). No es una inteligencia artificial
// de fuera ni manda nada a ningún sitio: funciona sin internet y siempre igual. Lo que no dices se queda con el valor de
// siempre de la plantilla, y SIEMPRE se enseña «He entendido: …» para que veas qué ha puesto antes de fiarte.
// entiende(frase) → { k, v, dicho }  o  { error }

const llano = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
import { MOVILES } from './moviles.js';
const N = s => parseFloat(String(s).replace(',', '.'));
const NUM = '(\\d+(?:[.,]\\d+)?)';
// «<palabra> (de|:)? <número> (mm|cm)?»  o  «<número> (mm|cm)? de <palabra>»  → mm
function medida(t, palabras) {
  const P = '(?:' + palabras + ')';
  let m = new RegExp('\\b' + P + '\\w*\\s*(?:de|del|:|=|a)?\\s*(?:unos\\s*)?' + NUM + '\\s*(cm|mm)?', 'i').exec(t) || new RegExp(NUM + '\\s*(cm|mm)?\\s*(?:de\\s+)?' + P, 'i').exec(t);
  return m ? N(m[1]) * (m[2] === 'cm' ? 10 : 1) : null;
}
const EMOJIS = { moto: '🏍', bici: '🚲', casco: '⛑', corazon: '❤', estrella: '★', luna: '🌙', gato: '🐱', perro: '🐶', flor: '🌸', mariposa: '🦋', arbol: '🌲', casa: '🏠', nube: '☁', rayo: '⚡', hueso: '🦴', pez: '🐟', oso: '🐻', dinosaurio: '🦖', unicornio: '🦄', corona: '👑', copo: '❄', calabaza: '🎃', fantasma: '👻', regalo: '🎁', coche: '🚗', balon: '⚽', huella: '🐾', sol: '☀', trebol: '🍀', seta: '🍄', conejo: '🐰', cohete: '🚀', ancla: '⚓', nota: '♪' };
const FORMAS = [['corazon', 'corazon'], ['hueso', 'hueso'], ['estrella', 'estrella'], ['hexagon', 'hexagono'], ['nube', 'nube'], ['escudo', 'escudo'], ['oval|redond|circul', 'ovalo'], ['placa|rectang|cuadrad', 'placa']];
const TIPOS = [
  ['holgura', /holgura|tolerancia|prueba de encaje/], ['funda', /\bfunda|carcasa|\bcase\b|bumper/], ['matricula', /matricula/], ['pata', /pata de cabra|caballete/], ['posavasos', /posavasos/], ['ficha', /\bficha|moneda|carro de la compra|carrito|del carro|para el carro/], ['colgante', /colgante|retrovisor|ambientador/], ['cortador', /cortador|cortapasta|corta pasta|galleta|fondant|plastilina/], ['molde', /\bmolde/], ['engranaje', /engranaje|pinon|rueda dentada|dientes/], ['tapon', /tapon|capuchon|contera|tapa (?:para|de) (?:un |una |el |la )?(?:tubo|pata|silla|botella)/],
  ['pomo', /\bpomo|perilla|tirador|mando para|rueda de ajuste/], ['gancho', /gancho|colgador|percha/], ['clip', /abrazadera|\bclip\b|sujeta ?(?:tubo|cable)|pinza para (?:tubo|cable)/], ['pletina', /pletina|placa con (?:\w+ )?agujero|soporte plano|chapa con/],
  ['arandela', /arandela|separador|casquillo|anillo|\bdisco\b|distanciador/], ['nombre', /llavero|nombre|placa|cartel|chapa|que ponga|que diga/], ['caja', /\bcaj|bandeja|organizador|recipiente|cubilete/], ['figura', /figura|silueta|topper|emoji|dibujo/]
];
const NOMBRES = { holgura: 'Prueba de holgura', matricula: 'Llavero matrícula', pata: 'Base para la pata de cabra', posavasos: 'Posavasos de coche', ficha: 'Ficha del carro', colgante: 'Colgante', funda: 'Funda de móvil', caja: 'Caja', nombre: 'Nombre', engranaje: 'Engranaje', molde: 'Molde', cortador: 'Cortador', figura: 'Figura', arandela: 'Arandela', tapon: 'Tapón', pomo: 'Pomo', pletina: 'Placa con agujeros', gancho: 'Gancho', clip: 'Abrazadera' };

export function entiende(frase) {
  const orig = String(frase || '').trim(), t = llano(orig);
  if (t.length < 3) return { error: 'Escribe qué pieza necesitas. Por ejemplo: «una caja de 12 × 8 × 5 cm con tapa».' };
  const tipo = TIPOS.find(x => x[1].test(t));
  if (!tipo) return { error: 'No he sabido qué pieza es. Prueba a nombrarla: caja, llavero, engranaje, molde, cortador, tapón, pomo, gancho, arandela…' };
  const k = tipo[0], v = {}, dicho = [], mm = x => (Math.round(x * 100) / 100).toLocaleString('es-ES') + ' mm';
  // «12 x 8 x 5 cm»: sin unidad y con números pequeños, lo normal al hablar son centímetros (y se dice)
  const d3 = new RegExp(NUM + '\\s*(?:x|×|por)\\s*' + NUM + '(?:\\s*(?:x|×|por)\\s*' + NUM + ')?\\s*(cm|mm)?').exec(t);
  let dims = null, enCm = false;
  if (d3) { dims = [d3[1], d3[2], d3[3]].filter(x => x !== undefined).map(N); enCm = d3[4] === 'cm' || (!d3[4] && (k === 'caja' || k === 'pletina') && Math.max(...dims) <= 30); if (enCm) dims = dims.map(x => x * 10); }
  const tm = d3 ? t.replace(d3[0], ' ') : t; // el texto sin el «12 x 8 x 5» (para no confundir sus números con otra medida)
  if (/a presion|apretad|fij[oa]\b|que no se mueva/.test(t)) v.encaje = 'presion'; else if (/que gire|gire bien|holgad|suelt[oa]/.test(t)) v.encaje = 'gira';
  // el texto: entre comillas; o detrás de «que ponga / que diga»; o de «con el nombre (de)»; o «para Ana» (un nombre propio)
  const texto = () => { const m = /["«“']([^"»”']{1,40})["»”']/.exec(orig) || /(?:que ponga|que diga|ponga|diga)\s+([^,.;]{1,30})/i.exec(orig) || /(?:con el nombre(?: de)?|nombre(?: de)?|con el texto|texto)\s+([^,.;]{1,30})/i.exec(orig) || /\bpara\s+([A-ZÁÉÍÓÚÑ][^\s,.;]{1,20})/.exec(orig);
    return m ? m[1].trim().replace(/\s+(?:en|con|de|y)\s+(?:forma|relieve|agujero|anilla|letras?|\d).*$/i, '').trim() : ''; };
  const figura = () => { const e = /(\p{Extended_Pictographic}|[★♥♪☀☁⚓])/u.exec(orig); if (e) return e[1]; const w = Object.keys(EMOJIS).find(x => new RegExp('\\b' + x).test(t)); if (w) return EMOJIS[w]; const l = /(?:letra|numero|inicial)\s+([a-z0-9])\b/.exec(t); if (l) return l[1].toUpperCase(); return texto(); };
  const ancho = () => { const m = /de\s+(\d+(?:[.,]\d+)?)\s*(cm|mm)/.exec(t); return medida(t, 'ancho|anchura|tamano') || (m ? N(m[1]) * (m[2] === 'cm' ? 10 : 1) : null); };
  const pon = (campo, valor, frase2) => { if (valor !== null && valor !== undefined && valor !== '' && !(typeof valor === 'number' && !isFinite(valor))) { v[campo] = valor; if (frase2) dicho.push(frase2); } };

  if (k === 'funda') {
    // el modelo: el nombre más largo que aparezca en la frase («iphone 15 pro max» antes que «iphone 15»); «galaxy» y «samsung» son opcionales
    const nm = s => llano(s).replace(/samsung|galaxy|apple/g, ' ').replace(/\+/g, ' plus ').replace(/\s+/g, ' ').trim(), fr = ' ' + nm(t) + ' ', mod = MOVILES.map(m => m[1]).sort((a, b) => b.length - a.length).find(n => fr.includes(' ' + nm(n) + ' '));
    if (mod) pon('modelo', mod, mod); else dicho.push('no he reconocido el modelo: elígelo en la lista o pon sus medidas');
    if (/\btpu\b|flexible|bland|goma|silicona/.test(t)) pon('material', 'tpu', 'en TPU (flexible)'); else if (/\bpla\b|rigid|dur[ao]\b/.test(t)) pon('material', 'pla', 'en PLA (rígida)');
    if (/panal|hexagon/.test(t)) pon('diseno', 'panal', 'diseño de panal'); else if (/puntos|lunares|topos/.test(t)) pon('diseno', 'puntos', 'diseño de puntos'); else if (/rayas|lineas/.test(t)) pon('diseno', 'rayas', 'diseño de rayas');
    else { const tx = texto(); const fg = /(\p{Extended_Pictographic}|[★♥♪☀☁⚓])/u.exec(orig) || (Object.keys(EMOJIS).find(x => new RegExp('\\b' + x).test(t)) ? [0, EMOJIS[Object.keys(EMOJIS).find(x => new RegExp('\\b' + x).test(t))]] : null);
      if (tx && !/^(?:iphone|samsung|galaxy|xiaomi|redmi|poco|un|una|el|la|mi)\b/i.test(tx)) { pon('diseno', 'nombre', 'con «' + tx + '» grabado'); v.texto = tx; } else if (fg) { pon('diseno', 'figura', 'con «' + fg[1] + '» grabado'); v.texto = fg[1]; } }
    if (/prueba/.test(t)) pon('prueba', true, 'solo la prueba rápida');
  } else if (k === 'matricula') {
    const m = /\b(\d{4})\s?([bcdfghjklmnprstvwxyz]{3})\b/i.exec(orig), tx = m ? m[1] + ' ' + m[2].toUpperCase() : texto(); if (tx) pon('texto', tx, '«' + tx + '»');
    if (/\bmoto/.test(t)) pon('tipo', 'moto', 'de moto'); else if (/coche/.test(t)) pon('tipo', 'coche', 'de coche');
  } else if (k === 'pata') {
    const tx = texto(), f = [['hexagon', 'hexagono', 'hexágono'], ['escudo', 'escudo', 'escudo'], ['corazon', 'corazon', 'corazón'], ['redond|circul', 'redonda', 'redonda']].find(x => new RegExp(x[0]).test(t)); if (f) pon('forma', f[1], 'forma de ' + f[2]);
    if (tx) { pon('motivo', 'nombre', 'con «' + tx + '» grabado'); v.texto = tx; } const a = medida(t, 'ancho|diametro'); if (a) pon('ancho', a, 'de ' + mm(a));
  } else if (k === 'posavasos') {
    const d = medida(t, 'diametro|hueco') || (/de\s+(\d+(?:[.,]\d+)?)\s*(cm|mm)/.exec(t) ? N(/de\s+(\d+(?:[.,]\d+)?)\s*(cm|mm)/.exec(t)[1]) * (/de\s+(\d+(?:[.,]\d+)?)\s*(cm|mm)/.exec(t)[2] === 'cm' ? 10 : 1) : null); if (d) pon('diametro', d, 'para un hueco de ' + mm(d));
    const tx = texto(); if (tx) { pon('motivo', 'nombre', 'con «' + tx + '» grabado'); v.texto = tx; }
  } else if (k === 'ficha') {
    if (/2 ?(?:€|euros?)/.test(t)) pon('moneda', '2', 'como la moneda de 2 €'); else pon('moneda', '1', 'como la moneda de 1 €'); const tx = texto(); if (tx) pon('texto', tx, 'con «' + tx + '»');
  } else if (k === 'colgante') {
    const tx = texto(), e = /(\p{Extended_Pictographic}|[★♥♪☀☁⚓])/u.exec(orig), w = Object.keys(EMOJIS).find(x => new RegExp('\\b' + x).test(t)); if (e || w) pon('figura', e ? e[1] : EMOJIS[w], 'con «' + (e ? e[1] : EMOJIS[w]) + '»'); if (tx) pon('texto', tx, 'y el nombre «' + tx + '»');
  } else if (k === 'caja') {
    if (dims) { pon('x', dims[0]); pon('y', dims[1]); if (dims[2]) pon('z', dims[2]); dicho.push(dims.map(x => (Math.round(x * 10) / 10).toLocaleString('es-ES')).join(' × ') + ' mm' + (enCm && !d3[4] ? ' (lo he tomado como centímetros)' : '')); }
    else { pon('x', medida(t, 'ancho|anchura'), ''); pon('y', medida(t, 'largo|fondo|profund'), ''); pon('z', medida(t, 'alto|altura'), ''); if (v.x || v.y || v.z) dicho.push([v.x && 'ancho ' + mm(v.x), v.y && 'largo ' + mm(v.y), v.z && 'alto ' + mm(v.z)].filter(Boolean).join(', ')); }
    if (/sin tapa|abierta/.test(t)) pon('tapa', false, 'sin tapa'); else if (/tapa/.test(t)) pon('tapa', true, 'con tapa');
    pon('pared', medida(t, 'pared|grosor|espesor'), ''); if (v.pared) dicho.push('pared de ' + mm(v.pared));
  } else if (k === 'engranaje') {
    const d = /(\d+)\s*dientes/.exec(t); if (d) pon('dientes', N(d[1]), d[1] + ' dientes');
    const mo = medida(t, 'modulo'); if (mo) pon('modulo', mo, 'módulo ' + String(mo).replace('.', ','));
    const e = medida(t, 'eje|agujero'); if (e !== null) pon('eje', e, 'eje de ' + mm(e));
    const g = medida(t, 'grosor|grueso|espesor|alto|altura|ancho'); if (g) pon('grosor', g, 'grosor ' + mm(g));
  } else if (k === 'arandela') {
    const metrica = /\bm(\d+(?:[.,]\d+)?)\b/.exec(t);
    if (dims) { pon('exterior', dims[0]); pon('interior', dims[1]); if (dims[2]) pon('grosor', dims[2]); dicho.push(dims.map(x => String(x).replace('.', ',')).join(' × ') + ' mm (fuera × agujero × grosor)'); }
    else { const ex = medida(t, 'exterior|fuera|diametro'), inn = metrica ? N(metrica[1]) : medida(t, 'interior|agujero|dentro|tornillo|eje'), g = medida(t, 'grosor|grueso|espesor|alto|altura|largo'); if (ex) pon('exterior', ex, 'diámetro ' + mm(ex)); if (inn !== null) pon('interior', inn, 'agujero de ' + mm(inn) + (metrica ? ' (M' + metrica[1] + ')' : '')); if (g) pon('grosor', g, 'grosor ' + mm(g)); if (metrica && !ex) v.exterior = Math.max(N(metrica[1]) * 2.2, N(metrica[1]) + 6); }
  } else if (k === 'nombre') {
    const tx = texto(); if (tx) pon('texto', tx, '«' + tx + '»');
    const f = FORMAS.find(x => new RegExp(x[0]).test(t)); if (f) pon('estilo', f[1], 'forma de ' + f[1].replace('ovalo', 'óvalo').replace('corazon', 'corazón').replace('hexagono', 'hexágono'));
    if (/grabad|hundid|bajo ?relieve/.test(t)) { pon('relieve', 'grabado', 'letras grabadas'); if (!v.estilo || v.estilo === 'silueta') v.estilo = 'placa'; }
    if (/sin (?:agujero|anilla|argolla)|placa|cartel/.test(t) && !/llavero/.test(t)) pon('anilla', false, 'sin agujero para la anilla'); else if (/llavero|anilla|argolla/.test(t)) pon('anilla', true, '');
    const al = medida(t, 'letras?|alto|altura'); if (al) pon('alto', al, 'letras de ' + mm(al));
  } else if (k === 'molde' || k === 'cortador' || k === 'figura') {
    const fg = figura(); if (fg) pon('texto', fg, 'de «' + fg + '»'); const a = ancho(); if (a) pon('ancho', a, 'de ' + mm(a) + ' de ancho');
    if (k === 'molde') { const h = medida(t, 'hondo|profund|fondo'); if (h) pon('hondo', h, mm(h) + ' de hondo'); }
    if (k !== 'molde') { const h = medida(t, 'alto|altura|grosor|grueso'); if (h) pon(k === 'cortador' ? 'alto' : 'grosor', h, mm(h) + (k === 'cortador' ? ' de alto' : ' de grosor')); }
  } else if (k === 'tapon') {
    const d = medida(t, 'diametro|tubo|pata|de') ; if (d) pon('diametro', d, 'para ' + mm(d));
    if (/por dentro|que entre|interior|dentro del/.test(t)) pon('tipo', 'dentro', 'que entra en el tubo'); else if (/por fuera|capuchon|que cubra|contera|pata/.test(t)) pon('tipo', 'fuera', 'que lo cubre por fuera');
    const h = medida(t, 'alto|altura|largo'); if (h) pon('alto', h, mm(h) + ' de alto');
  } else if (k === 'pomo') {
    const d = medida(t, 'diametro|pomo|perilla'); if (d) pon('diametro', d, 'de ' + mm(d)); const e = medida(t, 'eje|agujero'); if (e) pon('eje', e, 'eje de ' + mm(e));
    if (/en d\b|plano|media luna/.test(t)) pon('plano', true, 'eje en «D»');
  } else if (k === 'gancho') {
    if (/\ben s\b|forma de s\b|tipo s\b|\bs\b/.test(t)) pon('tipo', 's', 'en «S»'); else if (/puerta|armario|cajon/.test(t)) pon('tipo', 'puerta', 'de puerta');
    const a = medida(t, 'puerta|barra|tubo|hueco'); if (a) pon('hueco', a, 'para ' + mm(a)); const w = medida(t, 'ancho|anchura'); if (w) pon('ancho', w, mm(w) + ' de ancho');
  } else if (k === 'clip') {
    const d = medida(t, 'tubo|cable|diametro|de'); if (d) pon('tubo', d, 'para un tubo de ' + mm(d));
  } else if (k === 'pletina') {
    if (dims) { pon('x', dims[0]); pon('y', dims[1]); if (dims[2]) pon('grosor', dims[2]); dicho.push(dims.join(' × ') + ' mm'); }
    const n = /(\d+)\s*agujeros/.exec(t); if (n) pon('agujeros', N(n[1]), n[1] + ' agujeros'); if (/esquinas/.test(t)) pon('patron', 'esquinas', 'en las esquinas');
    const metrica = /\bm(\d+(?:[.,]\d+)?)\b/.exec(t), ag = new RegExp('(?:agujeros?|tornillos?) de ' + NUM + '\\s*(cm|mm)?').exec(tm), a = metrica ? N(metrica[1]) : ag ? N(ag[1]) * (ag[2] === 'cm' ? 10 : 1) : null; if (a) pon('agujero', a, 'agujeros de ' + mm(a));
  }
  if (v.encaje) dicho.push(v.encaje === 'presion' ? 'encaje a presión' : 'encaje que gira');
  return { k, v, dicho: NOMBRES[k] + (dicho.filter(Boolean).length ? ': ' + dicho.filter(Boolean).join(', ') : ' (con las medidas de siempre: cámbialas a la derecha)') };
}
export const EJEMPLOS = ['Una caja de 12 x 8 x 5 cm con tapa', 'Llavero corazón que ponga Lucía', 'Funda para iPhone 15 en TPU con panal', 'Engranaje de 24 dientes con eje de 6', 'Tapón para un tubo de 32 mm', 'Cortador de galletas de estrella de 7 cm', 'Arandela para M5 de 3 mm de grosor'];
