// ================= v16.2 · 🏘️ VILLA CELEBRI — los datos del mini-mundo =================
// El mapa, los vecinos (con su vida: a qué hora están dónde, qué les gusta, qué cuentan), las cosas que se recogen,
// se pescan, se cultivan y se imprimen. Todo es del juego: no toca nada del negocio.
export const W = 44, H = 30;
export const DIA_MS = 600000; // un día de la villa = 10 minutos de verdad (y es el MISMO para todo el equipo)
export const azar = seed => { let a = (seed >>> 0) || 1; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };

export const EDIFICIOS = [
  { k: 'casa', n: 'Tu casa', e: '🏡', x: 7, y: 2 }, { k: 'ayto', n: 'Ayuntamiento', e: '🏛️', x: 13, y: 2 }, { k: 'tienda', n: 'La tienda de Paco', e: '🏪', x: 18, y: 2 },
  { k: 'pan', n: 'Panadería de Carmen', e: '🥐', casa: '🏠', x: 25, y: 2 }, { k: 'taller', n: 'Taller 3D de Íker', e: '🏭', x: 31, y: 2 },
  { k: 'puesto', n: 'El puesto de Lola', e: '⛺', x: 15, y: 9 }, { k: 'cabana', n: 'Cabaña de Marina', e: '🛖', x: 36, y: 21 }, { k: 'faro', n: 'El faro', e: '🗼', x: 40, y: 21 }
];
export const OBJETOS = [{ k: 'tablon', n: 'Tablón de la plaza', e: '📋', x: 25, y: 7 }, { k: 'tesoro', n: 'Algo brilla en la isla…', e: '✨', x: 11, y: 20, suelo: true }, { k: 'banco', n: 'Banco', e: '🪑', x: 24, y: 9, suelo: true }];

export function mapa() {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const R = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && g[j][i] !== undefined) g[j][i] = c; };
  const elip = (cx, cy, rx, ry, c) => { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1) g[j][i] = c; };
  R(0, 24, W, 2, ':'); R(0, 26, W, 4, '~');                                   // playa y mar
  elip(11, 20, 9, 4.2, ':'); elip(11, 20, 8, 3.4, '~'); elip(11, 20, 2.3, 1.2, '.'); // lago con su orilla y su isla
  R(5, 4, 34, 1, ','); R(5, 4, 1, 10, ','); R(38, 4, 1, 10, ','); R(3, 13, 38, 1, ','); R(22, 2, 1, 12, ','); // calles
  R(34, 13, 1, 12, ','); R(27, 13, 1, 11, ','); R(11, 13, 1, 3, ',');
  R(19, 7, 7, 5, 'P'); g[9][22] = '*';                                        // plaza y fuente
  R(11, 16, 1, 3, '='); R(34, 25, 1, 4, '=');                                 // puente a la isla y muelle
  R(29, 16, 4, 2, 'f');                                                       // huerto (8 bancales)
  R(0, 0, W, 1, 't'); R(0, 0, 1, 26, 't'); R(W - 1, 0, 1, 26, 't');           // el bosque que rodea la villa
  const ocupado = (x, y) => EDIFICIOS.some(b => x >= b.x - 1 && x <= b.x + 2 && y >= b.y - 1 && y <= b.y + 2) || OBJETOS.some(o => Math.abs(o.x - x) < 2 && Math.abs(o.y - y) < 2);
  const r = azar(2026);
  for (let n = 0; n < 2600; n++) { // árboles: más espesos en el bosque del este, sin tapar calles ni puertas
    const x = 1 + Math.floor(r() * (W - 2)), y = 1 + Math.floor(r() * 22), denso = (x > 35 && y > 14 && y < 20) || x < 3 || y < 2;
    if (g[y][x] !== '.' || ocupado(x, y) || r() > (denso ? 0.5 : 0.035)) continue;
    let libre = true; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const c = (g[y + j] || [])[x + i]; if (c === ',' || c === 'P' || c === 'f' || c === '=' || (!denso && (c === 'T' || c === 't'))) libre = false; }
    if (libre) g[y][x] = r() < 0.3 ? 't' : 'T';
  }
  [[4, 9], [9, 7], [33, 10], [16, 16], [24, 17], [2, 15]].forEach(([x, y]) => { if (g[y][x] === '.') g[y][x] = 'R'; });
  return g;
}
export const SOLIDO = { t: 1, T: 1, '~': 1, '*': 1, R: 1 };

// ---------- Cosas ----------
// v = lo que te da Lola por ello · t: flor | playa | bosque | pez | cultivo | compra | figura | raro
export const COSAS = {
  tulipan: { n: 'Tulipán', e: '🌷', v: 5, t: 'flor' }, margarita: { n: 'Margarita', e: '🌼', v: 4, t: 'flor' }, girasol: { n: 'Girasol', e: '🌻', v: 8, t: 'flor' }, rosa: { n: 'Rosa', e: '🌹', v: 14, t: 'flor' },
  concha: { n: 'Concha', e: '🐚', v: 6, t: 'playa' }, coral: { n: 'Coral', e: '🪸', v: 16, t: 'playa' }, cangrejo: { n: 'Cangrejo', e: '🦀', v: 11, t: 'playa' },
  seta: { n: 'Seta', e: '🍄', v: 7, t: 'bosque' }, bellota: { n: 'Bellota', e: '🌰', v: 5, t: 'bosque' },
  sardina: { n: 'Sardina', e: '🐟', v: 8, t: 'pez' }, tropical: { n: 'Pez de colores', e: '🐠', v: 16, t: 'pez' }, globo: { n: 'Pez globo', e: '🐡', v: 28, t: 'pez' }, pulpo: { n: 'Pulpo', e: '🐙', v: 45, t: 'pez' }, bota: { n: 'Bota vieja', e: '👢', v: 1, t: 'pez' },
  zanahoria: { n: 'Zanahoria', e: '🥕', v: 12, t: 'cultivo' }, trigo: { n: 'Trigo', e: '🌾', v: 9, t: 'cultivo' }, fresa: { n: 'Fresa', e: '🍓', v: 20, t: 'cultivo' }, calabaza: { n: 'Calabaza', e: '🎃', v: 55, t: 'cultivo' },
  pan: { n: 'Pan recién hecho', e: '🥖', v: 4, t: 'compra' }, cafe: { n: 'Café', e: '☕', v: 3, t: 'compra' }, filamento: { n: 'Bobina de filamento', e: '🧵', v: 6, t: 'compra' },
  corazon: { n: 'Corazón impreso', e: '💜', v: 30, t: 'figura' }, dino: { n: 'Dinosaurio impreso', e: '🦖', v: 62, t: 'figura' }, jarron: { n: 'Jarrón impreso', e: '🏺', v: 85, t: 'figura' }, cohete: { n: 'Cohete impreso', e: '🚀', v: 100, t: 'figura' },
  diamante: { n: 'Diamante', e: '💎', v: 150, t: 'raro' }, paquete: { n: 'Paquete para entregar', e: '📦', v: 0, t: 'encargo' }
};
export const SEMILLAS = { trigo: { p: 3, ms: 120000 }, zanahoria: { p: 4, ms: 180000 }, fresa: { p: 7, ms: 300000 }, calabaza: { p: 18, ms: 900000 } };
export const FIGURAS = { corazon: { bobinas: 1, ms: 60000 }, dino: { bobinas: 2, ms: 120000 }, jarron: { bobinas: 2, ms: 150000, mas: 'tulipan' }, cohete: { bobinas: 3, ms: 180000 } };
export const TIENDA = { pan: 10, cafe: 8, filamento: 14 };
export const SOMBREROS = { gorra: { n: 'Gorra', e: '🧢', p: 80 }, lazo: { n: 'Lazo', e: '🎀', p: 120 }, chistera: { n: 'Chistera', e: '🎩', p: 220 }, corona: { n: 'Corona', e: '👑', p: 600 } };
export const CANA_PRO = 150;
export const CARAS = ['🧑', '👩', '👨', '👧', '👦', '👩‍🦰', '👱‍♀️', '🧔', '👩‍🦱', '🧕', '👨‍🦲', '👵'];
// Lo que sale cada día (igual para todos): dónde y con qué peso
export const BROTES = [{ suelo: '.', n: 13, de: [['margarita', 5], ['tulipan', 4], ['girasol', 2], ['rosa', 1]] }, { suelo: '.', arbol: true, n: 6, de: [['seta', 3], ['bellota', 3]] }, { suelo: ':', n: 7, de: [['concha', 6], ['cangrejo', 2], ['coral', 1]] }];
export const PESCA = { dia: [['bota', 2], ['sardina', 8], ['tropical', 5], ['globo', 2], ['diamante', 0.15]], noche: [['sardina', 6], ['tropical', 3], ['globo', 3], ['pulpo', 3], ['diamante', 0.3]] };

// ---------- Vecinos ----------
// rutina: [hora, x, y] (a partir de esa hora va ahí) · duerme: [desde, hasta] · gusta / odia · pide: lo que encarga
export const VECINOS = [
  { k: 'pura', n: 'Abuela Pura', e: '👵', of: 'La memoria de la villa', rutina: [[8, 24, 8], [13, 9, 5], [17, 23, 10]], duerme: [21, 7], gusta: ['rosa', 'pan', 'tulipan', 'jarron'], odia: ['bota', 'cangrejo'], pide: ['margarita', 'tulipan', 'pan', 'fresa'],
    hola: ['Ay, qué alegría verte.', 'Siéntate un ratito conmigo.', '¿Ya has desayunado, cielo?'],
    charla: ['Cuando yo era joven, la fuente de la plaza echaba agua de siete colores. O eso me parecía a mí.', 'Dicen que en la isla del lago brilla algo cada mañana. Yo ya no cruzo el puente, pero tú sí puedes.', 'El pan de Carmen, recién hecho, arregla cualquier día torcido.', 'A Nico no le digas que te lo he dicho, pero se le ilumina la cara con los dinosaurios.', 'De noche, el único despierto es Anselmo, el del faro. Y los pulpos.', 'Las rosas salen pocas veces. Si ves una, cógela con cariño.'],
    amiga: 'Toma, lo guardaba para alguien que escuchara mis historias.', secreto: 'El secreto de la villa es fácil: quien regala, recibe. Fíjate en lo que le gusta a cada uno.', regalo: 'rosa' },
  { k: 'carmen', n: 'Carmen', e: '👩‍🍳', of: 'Panadera', rutina: [[6, 26, 4], [15, 20, 8], [19, 26, 4]], duerme: [22, 5], gusta: ['trigo', 'fresa', 'margarita', 'corazon'], odia: ['seta', 'bota'], pide: ['trigo', 'fresa', 'calabaza'],
    hola: ['¡Buenas! Huele a pan, ¿verdad?', '¡Hola, cielo! ¿Qué te pongo?', 'Llevo de pie desde las seis, pero aquí estoy.'],
    charla: ['Con trigo del huerto me sale un pan que no veas. Si plantas, acuérdate de mí.', 'Las fresas de aquí son pequeñas pero saben a verano.', 'Paco dice que su café es el mejor. No le quites la ilusión.', 'Por la tarde bajo a la plaza: el horno también descansa.', 'Una calabaza grande y te hago un bizcocho que resucita.'],
    amiga: 'Para ti, de la primera hornada.', secreto: 'Mi truco: la masa necesita tiempo. Como las calabazas… y como las amistades.', regalo: 'pan' },
  { k: 'paco', n: 'Paco', e: '🧔', of: 'Tendero', rutina: [[7, 19, 4], [14, 24, 11], [16, 19, 4]], duerme: [22, 6], gusta: ['sardina', 'tropical', 'cafe', 'globo'], odia: ['margarita', 'bellota'], pide: ['sardina', 'concha', 'seta'],
    hola: ['¡Pasa, pasa! Tengo de todo.', '¡Dichosos los ojos!', 'Hoy hay género fresco.'],
    charla: ['Semillas, pan, café, bobinas… y sombreros, que la elegancia no está reñida con el campo.', 'Con la caña buena se pesca el doble de fácil. Ahí lo dejo.', 'Un buen pescado a la plancha y soy feliz. Marina sabe dónde pican.', 'Lola te compra lo que encuentres. Yo solo vendo: cada uno a lo suyo.', 'La calabaza tarda, pero se paga muy bien.'],
    amiga: 'Invita la casa.', secreto: 'Te cuento un secreto de tendero: lo que imprime Íker vale mucho más que la bobina que gasta.', regalo: 'cafe' },
  { k: 'lola', n: 'Lola', e: '👩‍🌾', of: 'Hortelana y mercadera', rutina: [[7, 30, 18], [11, 17, 11], [18, 31, 18]], duerme: [21, 6], gusta: ['tulipan', 'girasol', 'zanahoria', 'calabaza'], odia: ['bota', 'filamento'], pide: ['zanahoria', 'girasol', 'bellota'],
    hola: ['¡Buenas! ¿Qué me traes hoy?', '¡Hola! El huerto está precioso.', 'Mira qué manos: tierra de la buena.'],
    charla: ['Te compro todo lo que encuentres: flores, conchas, peces, verduras… En mi puesto, a media mañana.', 'El huerto es de todos. Planta en un bancal libre y vuelve cuando haya crecido.', 'El trigo crece rápido; la calabaza, despacio. Planta de las dos y nunca te faltará.', 'Los girasoles me pierden. Si ves uno, ya sabes.', 'Por la mañana y al caer la tarde me encontrarás en el huerto.'],
    amiga: 'De mi cosecha, para ti.', secreto: 'Las flores vuelven a salir cada día en sitios distintos. Date un paseo nada más amanecer.', regalo: 'calabaza' },
  { k: 'iker', n: 'Íker', e: '👨‍🔧', of: 'Maker del taller 3D', rutina: [[9, 32, 4], [13, 21, 11], [15, 32, 4]], duerme: [0, 8], gusta: ['filamento', 'seta', 'cafe', 'cohete'], odia: ['rosa', 'trigo'], pide: ['filamento', 'seta', 'cafe'],
    hola: ['¡Ey! Estoy calibrando la cama.', '¿Has visto qué primera capa?', '¡Hola! Pasa al taller cuando quieras.'],
    charla: ['Tráeme bobinas y te dejo la impresora: corazones, dinosaurios, jarrones, cohetes…', 'Imprimir tarda un rato de verdad. Lo dejas en marcha, das un paseo y vuelves.', 'El jarrón lleva un tulipán dentro. Capricho mío.', 'Un cohete impreso es el mejor regalo… o la mejor venta.', 'Me acuesto tarde y me levanto tarde. Las impresoras no madrugan.'],
    amiga: 'Recién salido de la impresora.', secreto: 'El truco está en la primera capa. Si la primera sale bien, todo lo demás también.', regalo: 'corazon' },
  { k: 'nico', n: 'Nico', e: '🧒', of: 'El explorador', rutina: [[9, 8, 9], [12, 20, 10], [16, 22, 24]], duerme: [20, 8], gusta: ['dino', 'concha', 'cangrejo', 'cohete'], odia: ['zanahoria', 'cafe'], pide: ['concha', 'cangrejo', 'bellota'],
    hola: ['¡Holaaa! ¿Jugamos?', '¡Mira qué he encontrado!', '¿Has visto al gato?'],
    charla: ['En la playa hay cangrejos que corren de lado. ¡Son rapidísimos!', 'Yo de mayor quiero un dinosaurio. De verdad o impreso, me da igual.', 'El gato se llama Mochi. Si le das una sardina te sigue a todas partes.', 'Una vez vi algo brillar en la isla. Pero me da miedo el puente.', 'Las zanahorias son lo peor del mundo. No me traigas.'],
    amiga: '¡Toma! Es mi concha de la suerte.', secreto: '¡Chsss! Si pescas de noche salen PULPOS. Me lo ha dicho Marina.', regalo: 'coral' },
  { k: 'marina', n: 'Marina', e: '👩‍🦰', of: 'Pescadora', rutina: [[6, 33, 25], [14, 37, 24], [18, 11, 15]], duerme: [23, 5], gusta: ['pan', 'pulpo', 'cafe', 'globo'], odia: ['sardina', 'bota'], pide: ['tropical', 'pan', 'globo'],
    hola: ['¡Ahoy! Hoy pica.', 'Buen viento y buena mar.', '¡Hola! ¿Traes la caña?'],
    charla: ['Ponte junto al agua y lanza. Cuando la marca esté en lo verde, ¡tira!', 'En el centro de lo verde salen los peces buenos. En el borde, sardinas.', 'De noche el mar es otro: salen los pulpos.', 'No me regales sardinas, que las veo hasta en sueños.', 'Al atardecer me gusta pescar en el lago, junto al puente.'],
    amiga: 'Lo he sacado esta mañana. Para ti.', secreto: 'A veces, muy pocas, en el anzuelo viene un diamante. No se lo cuentes a Paco.', regalo: 'globo' },
  { k: 'anselmo', n: 'Don Anselmo', e: '👴', of: 'Farero', rutina: [[10, 39, 24], [16, 23, 11], [19, 39, 24]], duerme: [4, 9], gusta: ['seta', 'concha', 'cafe', 'coral'], odia: ['fresa', 'corazon'], pide: ['seta', 'cafe', 'coral'],
    hola: ['Buenas… ¿qué te trae por el faro?', 'La noche es larga, pero el faro no duerme.', 'Hum. Hola.'],
    charla: ['Llevo cuarenta años encendiendo esta luz. Ningún barco se ha perdido.', 'De noche la villa es mía. Y del gato.', 'Un café caliente a las tres de la madrugada vale más que el oro.', 'Las setas salen junto a los árboles. A mí me gustan a la plancha.', 'Desde arriba se ve todo: quién planta, quién pesca y quién no saluda.'],
    amiga: 'Lo encontré en las rocas hace años. Ahora es tuyo.', secreto: 'Desde el faro lo veo: la cosa esa que brilla en la isla vuelve cada mañana.', regalo: 'diamante' }
];
// Primeros pasos: para no perderse al empezar
export const GUIA = [
  { t: 'Habla con la Abuela Pura, en la plaza (tócala o acércate y pulsa Espacio)', ok: g => g.S.hab.pura },
  { t: 'Recoge 3 flores, conchas o setas paseando por la villa', ok: g => g.S.pasos.recogido >= 3 },
  { t: 'Véndele algo a Lola en su puesto ⛺ (junto a la plaza)', ok: g => g.S.pasos.vendido > 0 },
  { t: 'Compra semillas en la tienda 🏪 y plántalas en el huerto (tierra marrón)', ok: g => g.S.pasos.plantado > 0 },
  { t: 'Pesca algo: ponte junto al agua y pulsa Espacio', ok: g => g.S.pasos.pescado > 0 },
  { t: 'Hazle un regalo a un vecino (🎁 en la conversación)', ok: g => g.S.pasos.regalado > 0 },
  { t: 'Imprime una figura en el taller 🏭 de Íker', ok: g => g.S.pasos.impreso > 0 }
];
export const FRASES = ['👋 ¡Hola!', '❤️', '😂', '🎣 ¿Pescamos?', '☕ ¿Un café?', '👏 ¡Bien!'];
