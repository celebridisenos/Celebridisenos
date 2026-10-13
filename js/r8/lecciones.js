// ================= 13-10-2026 · 📚 CelebriR8 · LECCIONES: cómo se hace cada cosa, paso a paso, en la pantalla de verdad =================
// La dueña: «cuando me pases todo entero, que se entienda cómo se hace cada cosa, para aprender mi propio programa R8».
// El botón «❓ Aprender» abre este menú: la visita general de siempre y una lección por cada cosa del Precision Lab. Cada lección usa
// el mismo motor que la visita (r8/visita.js): resalta la parte REAL de la pantalla, se avanza con «Siguiente →» o con las flechas,
// y en algunos pasos el programa lo hace por ti (elige el tipo, pone un ejemplo) para que veas el resultado sin gastar nada.
import { h } from '../ui.js';
import { recorrido, empezar } from './visita.js';

const P = () => window.__r8pr;
const elige = k => () => P() && P().elige(k);
const ejemplo = k => () => { if (P()) { P().elige(k); P().ejemplo(); } };
// (los pasos: t = título, ir = pestaña, sel = lo que se resalta, txt = la explicación, antes/despues = lo que hace el programa)
export const LECCIONES = [
  { k: 'copia', e: '🔁', t: 'Copiar un engranaje idéntico', d: 'Cuenta, mide 3 cosas y el programa deduce el resto', pasos: [
    { t: '1 · Precisión → «Copiar uno que ya tengo»', ir: 'precision', sel: '.r8pr-tipo[data-tipo="copia"]', antes: elige('copia'), txt: 'Es el primer botón del Precision Lab. Sirve para hacer un repuesto de un engranaje que ya tienes (aunque esté gastado) y que salga IDÉNTICO.' },
    { t: '2 · El asistente con fotos', ir: 'precision', sel: '.r8pr-acc', txt: 'Pulsa «📸 Asistente». Te pide una foto de FRENTE (mirando los dientes) y, si tiene buje o varios pisos, otra de LADO. En el PC vale cualquier fondo (la IA de tu torre separa la pieza); en el móvil, mejor sobre un folio.' },
    { t: '3 · Mide lo que te marca', ir: 'precision', sel: '.r8pr-acc', txt: 'Sobre tu foto salen flechas y círculos numerados. ① Ø exterior: de punta a punta con el calibre. ② «Sobre k dientes»: abrazas los dientes marcados en verde con las bocas planas en sus costados. ③ el agujero (mejor mide el EJE). Con ① ya funciona; con ② sale idéntico.' },
    { t: '4 · Lo que deduce', ir: 'precision', sel: '.r8pr-der', antes: ejemplo('copia'), txt: 'Aquí ves lo que ha deducido (por ejemplo «módulo 1,5 · 20°») y la CONFIANZA. Compara lo medido con lo teórico: si la punta está gastada, te lo dice y copia el diente por su flanco, que es lo que engrana.' },
    { t: '5 · La rodaja de prueba', ir: 'precision', sel: '.r8pr-kit', txt: 'Antes de la pieza entera, saca la RODAJA (3 mm, pocos gramos). Pruébala en el eje y contra el engranaje de al lado. Te dice cuánto tiene que medir sobre k dientes.' },
    { t: '6 · Calibrar tus engranajes', ir: 'precision', sel: '.r8pr-campo [data-k="Wp"]', txt: 'Mide la rodaja impresa igual que el original y escríbela aquí. El programa calcula cuánto engorda TU impresora el diente. Pulsa «💾 Guardar mi calibración» (arriba): desde ese momento, todos tus engranajes salen corregidos.' },
    { t: '7 · Piezas difíciles', ir: 'precision', sel: '.r8pr-acc', txt: '¿Tiene levas, nervios o varios pisos? Pulsa «🧩 Subir su STL o escaneo»: se queda todo su cuerpo y le cambio SOLO los dientes por los exactos.' },
    { t: '8 · A imprimir', ir: 'precision', sel: '.r8pr-imprimir', txt: '«🩺 Revisar e imprimir» la manda al Print Doctor (orientación, soportes y el archivo para Bambu). Imprime en PLA o PETG.' }] },
  { k: 'pieza', e: '🧩', t: 'Copiar cualquier pieza (sierras, peines, soportes…)', d: 'Contorno, agujeros y dientes en línea, desde una foto', pasos: [
    { t: '1 · Abre el asistente', ir: 'precision', sel: '.r8pr-tipo[data-tipo="pieza"]', antes: elige('pieza'), txt: 'En «Copiar cualquier pieza» (o en «Copiar uno que ya tengo», da igual: si la foto no es un engranaje, cambia solo) pulsa «📸 Asistente».' },
    { t: '2 · La foto de frente', ir: 'precision', sel: '.r8pr-acc', txt: 'Haz la foto con el móvil paralelo a la pieza. El programa saca el contorno, los agujeros y, si tiene dientes que se repiten (sierra de calar, peine, cremallera), los cuenta.' },
    { t: '3 · Las medidas marcadas', ir: 'precision', sel: '.r8pr-acc', txt: '① El largo total (lo más largo de la pieza): da la escala de todo. ② De la punta 1 a la punta 11 (las dos puntas grandes verdes): hace que los dientes salgan EXACTOS. ③ Los agujeros (círculos rosas).' },
    { t: '4 · Los dientes, todos iguales', ir: 'precision', sel: '.r8pr-medidas', txt: 'Con «Rehacer los dientes todos iguales» marcado, el programa calcula el diente medio de todos y los rehace idénticos: aunque el original o la foto tengan dientes gastados o torcidos.' },
    { t: '5 · La plantilla de prueba', ir: 'precision', sel: '.r8pr-kit', txt: 'Saca la plantilla (0,8 mm, casi nada de plástico) y ponla ENCIMA del original: tiene que taparlo justo. Si sobra o falta, corrige el largo total y listo.' }] },
  { k: 'planetaria', e: '🪐', t: 'Reductora planetaria', d: 'Elegir dientes, etapas y motor; comprobar que monta', pasos: [
    { t: '1 · Precisión → «Reductora planetaria»', ir: 'precision', sel: '.r8pr-tipo[data-tipo="planetaria"]', antes: elige('planetaria'), txt: 'Sale ya una que funciona (sol 12, planetas 18, 3 planetas: relación 5 : 1).' },
    { t: '2 · Los dientes y las etapas', ir: 'precision', sel: '.r8pr-medidas', txt: 'La corona sale sola (sol + 2 × planeta). Con 2 etapas la relación se multiplica (5 × 5 = 25 : 1). Si eliges unos dientes que no se pueden montar, te dice cuántos poner.' },
    { t: '3 · El motor y la salida', ir: 'precision', sel: '.r8pr-campo [data-k="motor"]', txt: 'NEMA 17 ya tiene sus medidas; «el mío» te pide las de tu motor. La salida es un agujero para tu eje (hexágono, D o redondo).' },
    { t: '4 · El montaje virtual', ir: 'precision', sel: '.r8pr-der', txt: 'Comprueba (midiendo, no a ojo) que nada choca y que los dientes engranan de verdad. Con «Ver → En corte» o «Despiezada» ves cómo va por dentro.' },
    { t: '5 · Prueba e impresión', ir: 'precision', sel: '.r8pr-kit', txt: 'Imprime antes la prueba (sol, un planeta y un cuarto de corona). Luego «Revisar e imprimir»: cada pieza sale ya colocada en la cama. Los pasadores, mejor de acero.' }] },
  { k: 'diferencialListo', e: '🏁', t: 'Diferencial RC listo para montar', d: 'Solo pones el eje y el pasador', pasos: [
    { t: '1 · Elige la escala', ir: 'precision', sel: '.r8pr-tipo[data-tipo="diferencialListo"]', antes: elige('diferencialListo'), txt: '1/10, 1/16 o 1/24. Las medidas de partida están comprobadas con el montaje virtual; si tu coche lleva otras (salida, pasador, dientes), cámbialas.' },
    { t: '2 · Sin rodamientos ni tornillos', ir: 'precision', sel: '.r8pr-der', txt: 'Lleva casquillos impresos (con tu holgura «gira»), la tapa a presión y la caja unida con pasadores impresos. En la lista de la compra solo quedan el EJE del piñón y el PASADOR de la cruceta.' },
    { t: '3 · La prueba', ir: 'precision', sel: '.r8pr-kit', txt: 'Una placa con los tres agujeros que giran (casquillo, eje y pasador) y la pareja corona–piñón: comprueba que gira suave antes de imprimir todo. Mejor en PETG.' }] },
  { k: 'diferencialPiezas', e: '🧩', t: 'Diferencial RC por piezas (como un despiece)', d: 'Rodamientos distintos, junta y ejes de salida', pasos: [
    { t: '1 · Precisión → «Diferencial RC por piezas»', ir: 'precision', sel: '.r8pr-tipo[data-tipo="diferencialPiezas"]', antes: elige('diferencialPiezas'), txt: 'Sale despiezado, como en el despiece de una tienda: carcasa con la corona, tapa, junta, planetarios, satélites, cruceta, piñón, ejes de salida y la caja en dos mitades.' },
    { t: '2 · Tus rodamientos', ir: 'precision', sel: '.r8pr-medidas', txt: 'Elige el rodamiento de cada lado (junto a la corona y en la tapa) y el del piñón, mirando el despiece de tu coche. Si uno no cabe con tu salida, te lo dice y te propone otro.' },
    { t: '3 · Junta y ejes de salida', ir: 'precision', sel: '.r8pr-medidas', txt: 'La junta (en TPU) cierra el diferencial para ponerle aceite. Los ejes de salida se imprimen aparte (mejor PETG) y entran a presión en los planetarios; por fuera llevan su plano y el agujero del pasador del vaso.' },
    { t: '4 · Montaje virtual y compra', ir: 'precision', sel: '.r8pr-der', txt: 'Comprueba que nada choca y que engrana. Abajo tienes la lista de lo que hay que comprar (rodamientos, tornillos y pasador) con sus medidas.' }] },
  { k: 'trinquete', e: '🔒', t: 'Trinquete', d: 'Gira en un sentido y bloquea el otro', pasos: [
    { t: '1 · Precisión → «Trinquete»', ir: 'precision', sel: '.r8pr-tipo[data-tipo="trinquete"]', antes: elige('trinquete'), txt: 'Rueda de dientes de sierra, uñeta con su muelle impreso de una pieza y placa base con los pivotes a su distancia.' },
    { t: '2 · Lo importante', ir: 'precision', sel: '.r8pr-der', txt: 'La uñeta se coloca sola para engancharse al empujar, y el programa comprueba que no roza la rueda y cuánto diente agarra. Si eliges dientes demasiado empinados, te avisa.' },
    { t: '3 · Prueba', ir: 'precision', sel: '.r8pr-kit', txt: 'La prueba es el trinquete entero con 3 mm: tiene que hacer «clic-clic» en un sentido y quedarse clavado en el otro.' }] },
  { k: 'acople', e: '🔗', t: 'Acoplamientos de ejes', d: 'Unir dos ejes, aunque sean de medidas distintas', pasos: [
    { t: '1 · Elige el tipo', ir: 'precision', sel: '.r8pr-campo [data-k="tipo"]', antes: elige('acople'), txt: 'Garras con estrella (amortigua: la estrella en TPU), flexible en espiral (una sola pieza, mejor en PETG), Oldham (ejes paralelos desplazados) o manguito rígido.' },
    { t: '2 · Tus dos ejes', ir: 'precision', sel: '.r8pr-medidas', txt: 'Cada lado con su medida y su forma (redondo, en D, hexagonal o cuadrado). Los prisioneros M3 aprietan el eje.' },
    { t: '3 · La prueba', ir: 'precision', sel: '.r8pr-kit', txt: 'Una placa con los dos agujeros: mete tus ejes y comprueba que entran justos antes de imprimir el acople.' }] },
  { k: 'cerrajeria', e: '🔑', t: 'Cerrajería', d: 'Escudos, cerraderos, pomos, levas y adaptadores', pasos: [
    { t: '1 · Elige la pieza', ir: 'precision', sel: '.r8pr-campo [data-k="cual"]', antes: elige('cerrajeria'), txt: 'Escudo (con el perfil europeo de bombín ya dibujado), cerradero, pomo con cuadradillo, leva de buzón o mueble, o adaptador de cuadradillo.' },
    { t: '2 · Tus medidas', ir: 'precision', sel: '.r8pr-medidas', txt: 'Mide con el calibre y escríbelas. Si un tornillo cae en el hueco o una pared queda demasiado fina, te avisa.' },
    { t: '3 · La lámina de prueba', ir: 'precision', sel: '.r8pr-kit', txt: 'Los primeros 2 mm de la pieza, con los mismos huecos: pruébala en el bombín o el cuadradillo antes de imprimirla entera.' }] },
  { k: 'cortador', e: '🍪', t: 'Cortador de galletas o fondant', d: 'De una foto o un dibujo, al tamaño que quieras', pasos: [
    { t: '1 · La forma', ir: 'precision', sel: '.r8pr-acc', antes: elige('cortador'), txt: 'Pulsa «📷 Foto o dibujo de la forma». Vale una foto de algo con forma o un dibujo con rotulador gordo sobre papel blanco.' },
    { t: '2 · El tamaño y el uso', ir: 'precision', sel: '.r8pr-medidas', txt: 'Pon lo que tiene que medir de largo. «Galletas» hace la pared de 1 mm; «fondant y arcilla», más fina. Si es un dibujo de línea, marca «solo el contorno de fuera».' },
    { t: '3 · A imprimir', ir: 'precision', sel: '.r8pr-imprimir', txt: 'Sale con el REBORDE abajo (en la cama) y el filo fino arriba: corta limpio. Para comida, filamento apto (PETG, por ejemplo) y bien lavado.' }] },
  { k: 'corte', e: '🔪', t: 'Portacuchillas, fundas y guías', d: 'Con las medidas de tu hoja', pasos: [
    { t: '1 · Elige la pieza', ir: 'precision', sel: '.r8pr-campo [data-k="cual"]', antes: elige('corte'), txt: 'Funda para tapar el filo (con un «clic» que la sujeta), mango portacuchillas con prisionero M3, o guía de corte con tope a escuadra.' },
    { t: '2 · Mide tu hoja', ir: 'precision', sel: '.r8pr-medidas', txt: 'Largo, ancho y grueso, con el calibre. La prueba (los primeros 15 mm) te dice si entra justa antes de imprimir la pieza entera.' }] }
];

// el menú de «❓ Aprender»
export function abrir(o = {}) {
  const ya = document.querySelector('.lec50'); if (ya) ya.remove();
  const cierra = () => raiz.remove();
  const lanza = L => { cierra(); recorrido(L.pasos, { ir: o.ir, titulo: L.e + ' ' + L.t, textoFin: 'Terminar' }); };
  const raiz = h('div.lec50', { role: 'dialog', 'aria-label': 'Aprender CelebriR8', onclick: e => { if (e.target === raiz) cierra(); } },
    h('div.lec50-caja', h('div.lec50-cab', h('div', h('small', 'APRENDER CELEBRIR8'), h('b', '¿Qué quieres aprender a hacer?')), h('button.lec50-x', { type: 'button', 'aria-label': 'Cerrar', onclick: cierra }, '✕')),
      h('button.lec50-it.lec50-general', { type: 'button', onclick: () => { cierra(); empezar({ ir: o.ir }); } }, h('span', '🧭'), h('b', 'La visita general'), h('small', 'Para qué sirve cada pestaña de CelebriR8')),
      h('div.lec50-lista', LECCIONES.map(L => h('button.lec50-it', { type: 'button', 'data-lec': L.k, onclick: () => lanza(L) }, h('span', L.e), h('b', L.t), h('small', L.d + ' · ' + L.pasos.length + ' pasos'))))));
  document.body.appendChild(raiz);
  window.__lec50 = { lanza: k => lanza(LECCIONES.find(L => L.k === k)) };
  return raiz;
}
