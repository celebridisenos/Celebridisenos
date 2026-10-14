// ================= 14-10-2026 (tarde) · 🛒 VENDER EN CULTS: la ficha de cada caja del taller (y lo que se exporta) =================
// Ella: «también quiero que cada cosa tenga su descripción y precio a vender en Cults, que tenga unas notas al lado… y todo lo que pide
// básico, que me lo ponga así y puedo rellenar directamente, o que le dé a exportar y me dé el vídeo, un par de fotos y la descripción,
// título y precio y manual».
// Lo que pide Cults al subir un diseño (su página de subida y la guía de impresion3d.net; los nombres exactos pueden cambiar): NOMBRE,
// DESCRIPCIÓN, PARÁMETROS DE IMPRESIÓN, CATEGORÍA, ETIQUETAS, ARCHIVOS (con varias piezas, mejor un ZIP; solo los STL se ven en su visor
// 3D), FOTOS, y en la segunda pantalla de pago / gratis, PRECIO y público / privado. Cults paga al creador el 80 % del precio neto.
// Todo sale de LA caja que hay en el taller (sus piezas, sus medidas, su mecanismo y lo que se ha comprobado): no se inventa nada.
// El PRECIO es ORIENTATIVO (ESTIMADO): no hay datos públicos fiables de lo que se vende en Cults por tipo de caja; va por lo que trae.
// Textos cortos, con palabras clave y pocos emojis («que no suene a IA»), en español y en inglés (lo que más se busca en Cults).
import * as CJ from './cajas.js';
import * as CE from './cajas_enigma.js';
import { CATEGORIAS, euros, fichaTexto, NOTAS, notaPrecio, tituloCults, notaTitulo } from './cults.js'; // (lo común con el catálogo)
export { CATEGORIAS, euros, fichaTexto };

const n0 = x => String(Math.round(x));
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
// por plantilla: título (es / en), la frase de arriba (es / en), etiquetas, categoría de Cults y precio orientativo (€)
const FICHAS = {
  laberinto: { es: 'Caja laberinto secreta para regalar dinero', en: 'Secret Maze Gift Box – Money Puzzle', f: ['Para abrirla hay que encontrar el camino escondido: girar y subir la tapa a ciegas.', 'To open it you have to find the hidden path: twist and lift the lid blind.'], tags: ['caja laberinto', 'maze box', 'puzzle box', 'gift box', 'money box', 'regalo dinero', 'caja secreta', 'secret box', 'rompecabezas', 'cylinder maze'], cat: 'game', precio: 3.99 },
  laberintoNinos: { es: 'Caja laberinto fácil para niños', en: 'Easy Maze Box for Kids – Puzzle Gift', f: ['Un laberinto escondido fácil (unos 12 movimientos): perfecto para una sorpresa infantil.', 'An easy hidden maze (about 12 moves): perfect for a kids surprise.'], tags: ['caja laberinto', 'maze box', 'kids puzzle', 'juguete', 'puzzle box', 'sorpresa', 'gift box', 'party favor'], cat: 'game', precio: 2.99 },
  laberintoReto: { es: 'Caja laberinto reto: más de 100 movimientos', en: 'Hard Maze Puzzle Box – 100+ Moves Challenge', f: ['Para los que se lo creen: un laberinto escondido de más de 100 movimientos.', 'For puzzle lovers: a hidden maze with more than 100 moves.'], tags: ['maze box', 'caja laberinto', 'hard puzzle', 'puzzle box', 'brain teaser', 'reto', 'secret box', 'gift box'], cat: 'game', precio: 4.49 },
  laberintoHucha: { es: 'Hucha laberinto: solo se abre resolviendo el camino', en: 'Maze Money Box – Coin Bank Puzzle', f: ['Las monedas entran por la ranura y solo salen si encuentras el camino escondido.', 'Coins go in through the slot and only come out if you find the hidden path.'], tags: ['money box', 'hucha', 'coin bank', 'maze box', 'caja laberinto', 'puzzle box', 'piggy bank', 'regalo dinero', 'savings'], cat: 'game', precio: 3.99 },
  criptex: { es: 'Criptex con palabra secreta (muescas falsas)', en: 'Cryptex with Secret Word – False Gates', f: ['Solo con la palabra buena sale la cámara. Con muescas falsas: no se adivina al tacto.', 'Only the right word releases the vault. False gates: it cannot be felt open.'], tags: ['criptex', 'cryptex', 'caja secreta', 'secret box', 'regalo', 'gift', 'da vinci', 'puzzle', 'escape room', 'combination lock'], cat: 'game', precio: 4.99 },
  criptexFecha: { es: 'Criptex de fecha con anillos de números', en: 'Date Cryptex – Number Combination Vault', f: ['Se abre con una fecha especial: aniversarios, cumpleaños, pedidas.', 'Opens with a special date: anniversaries, birthdays, proposals.'], tags: ['criptex', 'cryptex', 'combination', 'fecha', 'aniversario', 'gift', 'secret box', 'escape room'], cat: 'game', precio: 3.99 },
  japonesa: { es: 'Caja japonesa secreta de 4 pasos', en: 'Japanese Puzzle Box – 4 Hidden Moves', f: ['Parece cerrada por todas partes: dos paneles, una tabla y la tapa se mueven en un orden escondido.', 'Looks sealed on every side: two panels, a plank and the lid move in a hidden order.'], tags: ['caja japonesa', 'japanese puzzle box', 'himitsu bako', 'puzzle box', 'caja secreta', 'secret box', 'rompecabezas', 'trick box'], cat: 'game', precio: 4.99 },
  japonesaMini: { es: 'Caja japonesa mini de 4 pasos', en: 'Mini Japanese Puzzle Box – 4 Moves', f: ['La caja de 4 pasos en pequeño: para un anillo o unos pendientes.', 'The 4-move box in a small size: for a ring or earrings.'], tags: ['japanese puzzle box', 'caja japonesa', 'ring box', 'caja anillo', 'puzzle box', 'secret box', 'gift'], cat: 'game', precio: 3.99 },
  conLlave: { es: 'Caja con llave impresa y cerradura que funciona', en: 'Lock Box with Printed Key – Working Lock', f: ['Bombín y 2 llaves impresas: un cuarto de vuelta y no se abre.', 'Printed cylinder and 2 keys: a quarter turn and it stays shut.'], tags: ['caja con llave', 'lock box', 'printed key', 'llave', 'cerradura', 'key lock', 'caja secreta', 'secret box'], cat: 'gadget', precio: 3.99 },
  cofreLlave: { es: 'Cofre del tesoro con llave', en: 'Treasure Chest with Working Key', f: ['Cofre con bandas, asas, patas y cerradura con 2 llaves impresas.', 'Chest with straps, handles, feet and a lock with 2 printed keys.'], tags: ['cofre', 'treasure chest', 'pirate chest', 'cofre pirata', 'lock box', 'printed key', 'gift box'], cat: 'gadget', precio: 3.99 },
  maderaLlave: { es: 'Caja de madera con llave y nombre', en: 'Wooden Look Keepsake Box with Key', f: ['Aspecto de tablas, cerradura con 2 llaves y un nombre en la tapa.', 'Wood plank look, lock with 2 keys and a name on the lid.'], tags: ['caja recuerdos', 'keepsake box', 'caja con llave', 'lock box', 'wood look', 'personalizada'], cat: 'home', precio: 3.99 },
  rombosLlave: { es: 'Joyero acolchado con llave', en: 'Quilted Jewelry Box with Key', f: ['Rombos tipo capitoné, 3 compartimentos y su llave.', 'Quilted diamond pattern, 3 compartments and its key.'], tags: ['joyero', 'jewelry box', 'caja con llave', 'lock box', 'capitone', 'regalo'], cat: 'jewelry', precio: 3.99 },
  miniLlave: { es: 'Mini caja con llave para regalo', en: 'Mini Gift Box with Key', f: ['Pequeña (90 × 72 mm) con cerradura y 2 llaves: para unos pendientes o un anillo.', 'Small (90 × 72 mm) with a lock and 2 keys: for earrings or a ring.'], tags: ['caja regalo', 'gift box', 'mini caja', 'lock box', 'printed key', 'ring box'], cat: 'gadget', precio: 3.49 },
  libroSecreto: { es: 'Libro secreto con llave y doble fondo', en: 'Secret Book Box with Key and False Bottom', f: ['Parece un libro en la estantería: la cerradura va en el canto y lleva doble fondo.', 'Looks like a book on the shelf: the lock is on the edge, with a false bottom.'], tags: ['libro secreto', 'book safe', 'secret book', 'caja secreta', 'hidden box', 'false bottom', 'lock box'], cat: 'gadget', precio: 3.99 },
  ladoSecreto: { es: 'Caja discreta con la cerradura escondida', en: 'Discreet Box with Hidden Lock', f: ['Lisa por delante: la cerradura va en un lado y lleva doble fondo.', 'Plain front: the lock hides on the side, with a false bottom.'], tags: ['caja secreta', 'hidden lock', 'stash box', 'secret box', 'false bottom', 'lock box'], cat: 'gadget', precio: 3.99 },
  fuerteSecreta: { es: 'Caja fuerte de combinación con doble fondo', en: 'Combination Safe Box with False Bottom', f: ['Combinación de 4 cifras (10.000 posibles), paredes gruesas y doble fondo.', '4-digit combination (10,000 options), thick walls and a false bottom.'], tags: ['caja fuerte', 'safe box', 'combination lock', 'combinación', 'secret box', 'false bottom'], cat: 'gadget', precio: 3.99 },
  tablasSecreta: { es: 'Caja de tablas que solo abre boca abajo', en: 'Gravity Lock Box – Opens Upside Down', f: ['Sin cerradura a la vista: la tapa solo corre con la caja boca abajo.', 'No visible lock: the lid only slides when the box is upside down.'], tags: ['caja secreta', 'secret box', 'gravity lock', 'trick box', 'puzzle box', 'wood look'], cat: 'game', precio: 3.49 },
  secreta: { es: 'Caja secreta con cierre por gravedad y doble fondo', en: 'Secret Box – Gravity Lock and False Bottom', f: ['Tapa corredera que solo sale boca abajo y un doble fondo para lo importante.', 'Sliding lid that only opens upside down, plus a false bottom.'], tags: ['caja secreta', 'secret box', 'gravity lock', 'false bottom', 'stash box', 'trick box'], cat: 'gadget', precio: 3.49 },
  combinacion: { es: 'Caja con combinación de ruedas (diseño propio)', en: 'Combination Lock Box – Number Wheels', f: ['Tres ruedas de números y bisagra de tornillo: con una cifra mal no se abre.', 'Three number wheels and a screw hinge: one wrong digit and it stays shut.'], tags: ['combination lock', 'caja combinación', 'safe box', 'caja fuerte', 'lock box', 'secret box'], cat: 'gadget', precio: 3.99 },
  joyero: { es: 'Joyero con bisagra y separadores', en: 'Jewelry Box with Hinge and Dividers', f: ['Bisagra de filamento, cierre de clic y tres compartimentos.', 'Filament hinge, snap latch and three compartments.'], tags: ['joyero', 'jewelry box', 'caja', 'box', 'hinge box', 'organizer'], cat: 'jewelry', precio: 2.49 },
  herramientas: { es: 'Caja de herramientas con asas y candado', en: 'Tool Box with Handles and Padlock Eye', f: ['Bisagras de eje impreso, dos cierres, asas y orejetas para candado.', 'Printed-pin hinges, two latches, handles and padlock eye.'], tags: ['caja herramientas', 'tool box', 'storage box', 'organizer', 'padlock'], cat: 'tools', precio: 2.99 },
  herramientas2: { es: 'Caja de herramientas PRO con bandeja', en: 'Pro Tool Box with Lift-out Tray', f: ['Bandeja que se saca, dos cierres, candado, asas y patas.', 'Lift-out tray, two latches, padlock eye, handles and feet.'], tags: ['tool box', 'caja herramientas', 'tray', 'organizer', 'workshop', 'taller'], cat: 'tools', precio: 2.99 },
  maletin: { es: 'Maletín resistente con bisagra de tornillo', en: 'Sturdy Carry Case with Screw Hinge', f: ['La bisagra más fuerte (tornillo M3), dos cierres, candado y asas.', 'Strongest hinge (M3 screw), two latches, padlock eye and handles.'], tags: ['maletín', 'carry case', 'storage case', 'case', 'organizer'], cat: 'tools', precio: 2.99 },
  segura: { es: 'Caja de seguridad con candado', en: 'Security Box with Padlock Eye', f: ['Paredes gruesas, bisagra de tornillo, dos cierres y candado en medio.', 'Thick walls, screw hinge, two latches and a padlock eye.'], tags: ['caja seguridad', 'security box', 'lock box', 'padlock', 'storage'], cat: 'gadget', precio: 2.99 },
  armarito: { es: 'Armarito con puerta y pomo', en: 'Mini Cabinet with Snap Door', f: ['Tapa a presión y puerta de clic con su pomo.', 'Press-fit lid and a snap-in door with knob.'], tags: ['armario', 'cabinet', 'storage', 'organizer', 'desk'], cat: 'home', precio: 2.49 },
  tornillos: { es: 'Caja de tornillos con 6 compartimentos', en: 'Screw Organizer Box – 6 Compartments', f: ['Tapa a presión y seis compartimentos.', 'Press-fit lid and six compartments.'], tags: ['organizador', 'screw organizer', 'storage box', 'tornillos', 'workshop'], cat: 'tools', precio: 2.49 },
  tornillos2: { es: 'Organizador de tornillos PRO (fondo en cuenco)', en: 'Pro Screw Organizer – Scoop Bottom Bins', f: ['Rejilla de 4 × 3 con fondo en cuenco: lo pequeño se coge con un dedo.', '4 × 3 grid with scoop bottoms: small parts slide out with one finger.'], tags: ['screw organizer', 'organizador', 'scoop bins', 'workshop', 'storage'], cat: 'tools', precio: 2.49 },
  pilas: { es: 'Caja para pilas AA y AAA', en: 'AA & AAA Battery Storage Box', f: ['Cada pila de pie en su hueco y tapa a presión.', 'Each battery stands in its own slot, press-fit lid.'], tags: ['battery box', 'caja pilas', 'battery holder', 'AA', 'AAA', 'organizer'], cat: 'home', precio: 2.49 },
  seisEnUno: { es: 'Caja 6 en 1 con cubetas sueltas', en: '6-in-1 Box with Removable Bins', f: ['Seis cubetas que se sacan o se cambian de sitio.', 'Six bins you can rearrange or take out.'], tags: ['organizer', 'caja organizadora', 'removable bins', 'storage', 'craft box'], cat: 'home', precio: 2.99 },
  multifuncion: { es: 'Caja multifunción con cajón y bandeja', en: 'Multi Storage Box with Drawer and Tray', f: ['Cajón abajo, bandeja arriba, dos cierres, asas y nombre.', 'Drawer below, tray on top, two latches, handles and a name.'], tags: ['storage box', 'drawer box', 'organizer', 'caja cajón', 'multiuso'], cat: 'home', precio: 2.99 },
  costura: { es: 'Caja de costura con bandeja', en: 'Sewing Box with Lift-out Tray', f: ['Bandeja que se saca con 4 huecos para hilos y agujas.', 'Lift-out tray with 4 spaces for threads and needles.'], tags: ['sewing box', 'caja costura', 'craft box', 'organizer', 'hilos'], cat: 'home', precio: 2.49 },
  te: { es: 'Caja de té con imán y 6 huecos', en: 'Tea Box with Magnet Lid – 6 Slots', f: ['Seis huecos para sobres de té y un imán que la cierra sola.', 'Six slots for tea bags and a magnet that closes it.'], tags: ['tea box', 'caja té', 'tea organizer', 'kitchen', 'cocina'], cat: 'home', precio: 2.49 },
  juegos: { es: 'Caja para dados y fichas con tapa corredera', en: 'Dice & Token Box with Sliding Lid', f: ['Rejilla con fondo en cuenco y tapa corredera.', 'Scoop-bottom grid and sliding lid.'], tags: ['dice box', 'caja dados', 'board game', 'token box', 'tabletop'], cat: 'game', precio: 2.49 },
  cables: { es: 'Caja para esconder la regleta y los cables', en: 'Cable Management Box – Hide Power Strip', f: ['Esconde la regleta: agujeros para los cables y ventilación.', 'Hides the power strip: cable holes and ventilation.'], tags: ['cable box', 'cable management', 'caja cables', 'regleta', 'desk', 'organizer'], cat: 'home', precio: 2.49 }
};
// lo que lleva (para la lista de la descripción) · [es, en]
function rasgos(C) {
  const R = [], hay = t => C.els.filter(e => e.tipo === t), Md = CE.es(C) ? CE.medidas(C) : { L: C.L, W: C.W, H: C.H + C.tapaG };
  if (C.forma === 'laberinto') { const Q = CE.labDatos(C), mv = CE.labMovimientos(Q.Lb).length; R.push(['🌀 Laberinto escondido de ' + mv + ' movimientos (nº ' + C.semilla + ', cada número es distinto)', '🌀 Hidden maze, ' + mv + ' moves (#' + C.semilla + ', every number is different)'], ['🎁 Hueco de Ø' + n0(2 * Q.Rc) + ' × ' + n0(Q.zTop - CE.LAB.FONDO) + ' mm', '🎁 Inner space Ø' + n0(2 * Q.Rc) + ' × ' + n0(Q.zTop - CE.LAB.FONDO) + ' mm']); if (C.hucha === 'si') R.push(['🐷 Ranura de hucha: caben las monedas de 2 €', '🐷 Coin slot: fits 2 € coins']); }
  if (C.forma === 'criptex') { const Q = CE.crxMedidas(C); R.push(['🔤 ' + Q.n + ' anillos con muescas falsas · ' + Math.pow(Q.F, Q.n).toLocaleString('es-ES') + ' combinaciones', '🔤 ' + Q.n + ' rings with false gates · ' + Math.pow(Q.F, Q.n).toLocaleString('en-GB') + ' combinations'], ['✏️ Escribe TU palabra de ' + Q.n + ' ' + (C.alfabeto === 'numeros' ? 'cifras: incluye un anillo de cada cifra (10)' : 'letras: incluye un anillo de cada letra (27, con la Ñ)'), '✏️ Set YOUR own ' + Q.n + '-' + (C.alfabeto === 'numeros' ? 'digit code: one ring for every digit included (10)' : 'letter word: one ring for every letter included (27)')], ['🎁 Hueco de Ø' + n0(2 * Q.r0) + ' × ' + n0(Q.aK - CE.CRX.EA) + ' mm', '🎁 Inner space Ø' + n0(2 * Q.r0) + ' × ' + n0(Q.aK - CE.CRX.EA) + ' mm']); }
  if (C.forma === 'secuencia') { const Q = CE.secMedidas(C); R.push(['🧩 4 movimientos escondidos en orden (las juntas no se ven)', '🧩 4 hidden moves in order (seams are invisible)'], ['🎁 Hueco de ' + n0(Q.xRi - Q.xLi) + ' × ' + n0(2 * Q.yI) + ' × ' + n0(Q.zT - CE.SEC.HB) + ' mm', '🎁 Inner space ' + n0(Q.xRi - Q.xLi) + ' × ' + n0(2 * Q.yI) + ' × ' + n0(Q.zT - CE.SEC.HB) + ' mm']); }
  hay('llave').forEach(e => R.push(['🔑 Cerradura con ' + (e.p.llaves || 2) + ' llaves impresas', '🔑 Lock with ' + (e.p.llaves || 2) + ' printed keys']));
  hay('combinacion').forEach(e => { const n = String(e.p.codigo || '').length; R.push(['🔢 Combinación de ' + n + ' cifras (' + Math.pow(10, n).toLocaleString('es-ES') + ' posibles)', '🔢 ' + n + '-digit combination']); });
  if (hay('gravedad').length) R.push(['🤫 Cierre secreto: solo se abre boca abajo', '🤫 Secret lock: only opens upside down']);
  if (hay('fondo').length) R.push(['🫥 Doble fondo', '🫥 False bottom']);
  if (hay('cajon').length) R.push(['🗃️ Cajón', '🗃️ Drawer']);
  if (hay('bandeja').length) R.push(['🧺 Bandeja que se saca', '🧺 Lift-out tray']);
  if (hay('cubetas').length) R.push(['🧊 Cubetas sueltas', '🧊 Removable bins']);
  if (hay('rejilla').length) R.push(['▦ Compartimentos con fondo en cuenco', '▦ Scoop-bottom compartments']);
  if (hay('pilas').length) R.push(['🔋 Hueco para cada pila', '🔋 A slot for every battery']);
  if (hay('iman').length) R.push(['🧲 Cierre con imanes (se compran aparte)', '🧲 Magnet closure (magnets not included)']);
  if (!CE.es(C)) R.push(['📏 ' + n0(Md.L) + ' × ' + n0(Md.W) + ' × ' + n0(Md.H) + ' mm', '📏 ' + n0(Md.L) + ' × ' + n0(Md.W) + ' × ' + n0(Md.H) + ' mm']);
  return R;
}
// el precio orientativo de una caja sin plantilla (o cambiada): por lo que trae
function precioDe(C) {
  if (CE.es(C)) return { laberinto: 3.99, criptex: 4.99, secuencia: 4.99 }[C.forma] || 3.99;
  const t = new Set(C.els.map(e => e.tipo));
  if (['llave', 'combinacion', 'gravedad'].some(x => t.has(x))) return 3.99;
  if (['cajon', 'bandeja', 'cubetas', 'fondo', 'puerta', 'candado'].some(x => t.has(x))) return 2.99;
  return 2.49;
}
// la ficha «base» (sin montar nada: para el panel) · si ella ha puesto su precio (C.precioCults), manda el suyo
function base(C) {
  const k = C.plantilla, F0 = FICHAS[k], P = k && CJ.PLANTILLAS[k], igual = F0 && P && (P.C.forma || '') === (C.forma || ''), titulo = CJ.tituloDe(C);
  const F = Object.assign({}, igual ? F0 : { es: titulo + ' imprimible', en: 'Printable ' + titulo.replace(/^Caja/, 'Box'), f: [P ? P.d : 'Diseñada en CelebriR8: cada pieza comprobada antes de imprimir.', 'Designed with CelebriR8: every part checked before printing.'], tags: ['caja', 'box', 'storage box', 'organizer', 'gift box'], cat: 'home', precio: precioDe(C) });
  F.sugerido = F.precio; if (Number(C.precioCults) > 0) F.precio = Math.round(Number(C.precioCults) * 100) / 100;
  return F;
}
export const rapida = C => { const F = base(C); return { titulo: F.es, precio: F.precio, sugerido: F.sugerido }; };
// res = la comprobación ya hecha en la pantalla (si no, se monta aquí)
export function ficha(C, res) {
  const F = base(C);
  const piezas = CJ.piezasDe(C), R = rasgos(C), nP = piezas.length, M = CJ.CE.es(C) ? CJ.CE.manual(C) : null;
  const comp = (() => { try { const r = res && res.lista ? res : CJ.comprueba(C); return r.lista.filter(x => x.ok === false).length ? null : r; } catch (e) { return null; } })();
  const lineasEs = R.map(x => '✔ ' + x[0]).concat(['✔ ' + nP + ' piezas · se imprime SIN soportes', comp ? '✔ Montada y comprobada en el ordenador antes de publicarla' : null, '✔ Incluye manual de montaje' + (M && M.solucion ? ' y la solución' : '')]).filter(Boolean);
  const lineasEn = R.map(x => '✔ ' + x[1]).concat(['✔ ' + nP + ' parts · prints with NO supports', comp ? '✔ Assembled and checked in CAD before release' : null, '✔ Assembly guide included' + (M && M.solucion ? ' (plus the solution)' : '')]).filter(Boolean);
  const imp = 'PLA (o PETG) · capa 0,2 mm · 3 paredes · relleno 15 % · SIN soportes · boquilla 0,4' + (C.forma === 'criptex' ? ' (las letras salen mejor a 0,16 mm)' : '');
  const impEn = 'PLA (or PETG) · 0.2 mm layers · 3 walls · 15% infill · NO supports · 0.4 nozzle' + (C.forma === 'criptex' ? ' (letters look sharper at 0.16 mm)' : '');
  const posturas = piezas.map(p => '· ' + p.nombre + ': ' + (p.como || ''));
  const descEs = F.f[0] + '\n\n' + lineasEs.join('\n') + '\n\nImpresión: ' + imp + '\nPiezas:\n' + posturas.join('\n') + '\n\nDiseño original de CelebriDiseños.';
  const descEn = F.f[1] + '\n\n' + lineasEn.join('\n') + '\n\nPrint: ' + impEn + '\n\nOriginal design by CelebriDiseños.';
  const cat = CATEGORIAS[F.cat] || CATEGORIAS.home;
  return {
    titulo: { es: F.es, en: F.en }, descripcion: { es: descEs, en: descEn }, etiquetas: F.tags, categoria: cat, precio: F.precio, sugerido: F.sugerido, impresion: imp, comprobada: !!comp, piezas: nP, nombreArchivo: nombreArchivo(C),
    campos: [
      { k: 'titulo', t: 'Nombre (título)', v: tituloCults(F.en, F.es), nota: notaTitulo(F.en, F.es) },
      { k: 'descripcion', t: 'Descripción', v: descEn + '\n\n———\n\n' + descEs, nota: NOTAS.descripcion },
      { k: 'impresion', t: 'Parámetros de impresión 3D', v: impEn + '\n' + imp, nota: 'Lo que le sirve al que lo imprime. «Sin soportes» vende: todas las piezas de esta caja se imprimen sin soportes.' },
      { k: 'categoria', t: 'Categoría', v: cat[1] + ' (' + cat[0] + ')', nota: NOTAS.categoria },
      { k: 'etiquetas', t: 'Etiquetas (palabras clave)', v: F.tags.join(', '), nota: NOTAS.etiquetas },
      { k: 'precio', t: 'Precio', v: euros(F.precio), nota: notaPrecio(F.precio, F.sugerido) },
      { k: 'archivos', t: 'Archivos', v: nombreArchivo(C) + '_STL.zip (una pieza por archivo) y ' + nombreArchivo(C) + '.3mf (todas, con colores)', nota: NOTAS.archivos },
      { k: 'fotos', t: 'Fotos', v: '01_portada (cerrada) · 02_abierta · 03_piezas', nota: NOTAS.fotos },
      { k: 'licencia', t: 'Pago / gratis y licencia', v: 'De pago · Pública', nota: NOTAS.licencia }]
  };
}
export const nombreArchivo = C => CJ.tituloDe(C).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') + (C.forma === 'laberinto' ? '_n' + C.semilla : C.forma === 'criptex' ? '_' + CE.crxPalabra(C) : '');
// la hoja de la SOLUCIÓN (aparte del manual: para el vendedor o para doblarla)
export function hojaSolucion(S, titulo, tienda) {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Solución · ' + esc(titulo) + '</title><style>@page{size:A4;margin:14mm}body{font:12.5pt/1.5 "Segoe UI",system-ui,sans-serif;color:#1b1814;margin:0}@media screen{body{max-width:190mm;margin:10mm auto;padding:0 6mm}}h1{font:800 22pt/1.2 Georgia,serif;margin:8px 0}.aviso{border:2px dashed #c8102e;border-radius:10px;padding:8px 12px;color:#7a0a1a;font-weight:700}.txt{font-size:13pt;margin:12px 0}svg{width:100%;height:auto;border:1px solid #e3dccf;border-radius:10px}.pie{margin-top:12px;color:#6a6052;font-size:9.5pt}</style></head><body>'
    + '<p class="aviso">✂ SOLUCIÓN — dóblala y no la mires (o guárdala tú).</p><h1>' + esc(S.t) + '</h1><p class="txt">' + esc(S.txt) + '</p>' + (S.svg ? S.svg : '') + '<p class="pie">' + esc(tienda || 'CelebriDiseños') + ' · ' + esc(titulo) + '</p></body></html>';
}
