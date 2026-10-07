// ================= v16 · 💡 Instagram Studio: ideas, formatos, estructuras, hashtags y keywords =================
// Una biblioteca de formatos que funciona sin conexión y sin IA: eliges producto y nivel y sale la publicación montada
// (qué enseñar en cada foto o plano, el texto y los hashtags). Tres niveles:
//   SIMPLE → rápido de hacer hoy mismo · MEDIO → más trabajado · PRO → con estrategia (gancho, guardados, comentarios).
// Los textos están escritos para sonar a persona, no a anuncio: frases cortas, sin «increíble», sin «¡no te lo pierdas!».
const sinTildes = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const cap = s => { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
const min = s => { s = String(s || '').trim(); return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; };

export const NIVELES = [['simple', 'Simple', 'Rápido: lo haces hoy con el móvil'], ['medio', 'Medio', 'Más trabajado: varias fotos o planos'], ['pro', 'Pro', 'Con estrategia: gancho, guardados y comentarios']];
export const CATEGORIAS = [['producto', '📦 Producto'], ['antes', '↔️ Antes / después'], ['educativo', '🎓 Educativo'], ['venta', '🛒 Venta'], ['proceso', '🛠️ Proceso'], ['fabricacion', '🖨️ Fabricación'], ['viral', '🚀 Viral'], ['tendencia', '📈 Tendencia']];

// Datos del producto en palabras que se pueden meter en una frase
function ficha(p, cfg) {
  p = p || {};
  const nombre = String(p.nombre || 'esta pieza').trim(), precio = Number(p.precio) > 0 ? String(Number(p.precio).toFixed(2)).replace('.', ',').replace(',00', '') + ' €' : '';
  const color = String(p.color || '').trim(), material = String(p.material || '').trim();
  const medida = Number(p.dimX) > 0 ? [p.dimX, p.dimY, p.dimZ].map(v => Math.round(Number(v) / 10 * 10) / 10).sort((a, b) => b - a).map(v => String(v).replace('.', ',')).join(' × ') + ' cm' : String(p.tamano || '').trim();
  const horas = Number(p.horas || p.bambuHoras) > 0 ? Math.round(Number(p.horas || p.bambuHoras) * 10) / 10 : 0;
  return { nombre, n: min(nombre), precio, color: color.toLowerCase(), material, medida, horas, tienda: String((cfg && cfg.empresa && cfg.empresa.nombre) || '').trim(), personalizable: /personaliz|nombre|letra|inicial/i.test([p.nombre, p.descripcion, p.categoria, p.subcategoria].join(' ')), cat: sinTildes([p.categoria, p.subcategoria].join(' ')) };
}

// ---------- Formatos ----------
// tipo: post · carrusel · reel · historia.  pasos: qué va en cada foto / plano.  foto: cómo componerla.
// texto: { simple, medio, pro } → funciones (f) => string. Sin exclamaciones de anuncio.
const F = [
  { k: 'producto_limpio', cat: 'producto', t: 'El producto, limpio', tipo: 'post', para: 'Enseñar la pieza tal cual es',
    pasos: ['Una sola foto: la pieza centrada, fondo liso y luz de ventana.'], foto: ['Fondo de un solo color (cartulina o pared).', 'Deja aire alrededor: que la pieza ocupe 2/3 de la foto.', 'Sin flash: luz de lado.'],
    texto: { simple: f => cap(f.n) + (f.color ? ' en ' + f.color : '') + '.' + (f.precio ? ' ' + f.precio + '.' : ''),
      medio: f => cap(f.n) + (f.color ? ' en ' + f.color : '') + '. ' + (f.medida ? 'Mide ' + f.medida + '. ' : '') + 'La hago por encargo, así que puedes pedirla en otro color.' + (f.precio ? '\n\n' + f.precio + ' · escríbeme y te cuento.' : ''),
      pro: f => 'La hice pensando en un sitio concreto: ' + lugar(f) + '.\n\n' + cap(f.n) + (f.color ? ', en ' + f.color : '') + (f.medida ? ' · ' + f.medida : '') + '. Se imprime capa a capa' + (f.horas ? ' durante ' + horasTxt(f.horas) : '') + ' y después la repaso a mano.\n\n¿En qué color la pondrías tú? Te leo.' + (f.precio ? '\n\n' + f.precio + ' · pedidos por mensaje.' : '') } },
  { k: 'producto_en_uso', cat: 'producto', t: 'En su sitio', tipo: 'post', para: 'Que se vea para qué sirve',
    pasos: ['La pieza ya colocada donde va (mesa, estantería, llaves, planta…).'], foto: ['Que se vea algo más del entorno: da escala y contexto.', 'Una mano o un objeto conocido al lado ayuda a ver el tamaño.'],
    texto: { simple: f => 'Así queda ' + f.n + ' ya puesta en ' + lugar(f) + '.',
      medio: f => 'Así queda ' + f.n + ' en ' + lugar(f) + '. ' + (f.medida ? 'Mide ' + f.medida + ', para que te hagas una idea. ' : '') + 'Si la quieres en otro color, dímelo.',
      pro: f => 'Una cosa es verla suelta y otra verla donde va.\n\nEsta es ' + f.n + ' en ' + lugar(f) + (f.medida ? ' (' + f.medida + ')' : '') + '. Me la pidieron para regalar y acabó quedándose una en casa.\n\nGuárdala si estás buscando un detalle para alguien.' } },
  { k: 'producto_detalle', cat: 'producto', t: 'Tres detalles', tipo: 'carrusel', para: 'Enseñar la calidad de cerca',
    pasos: ['1 · La pieza entera.', '2 · Detalle muy de cerca (las capas, un borde, una letra).', '3 · La parte de atrás o de abajo: lo que no se suele enseñar.', '4 · En la mano, para ver el tamaño.'], foto: ['Acerca el móvil y toca la pantalla para enfocar.', 'Mismo fondo en todas: el carrusel se ve más cuidado.'],
    texto: { simple: f => cap(f.n) + ', de lejos y de cerca. Desliza.', medio: f => 'Desliza para verla de cerca. La última foto es en la mano, para que veas el tamaño real' + (f.medida ? ' (' + f.medida + ')' : '') + '.',
      pro: f => 'Lo que no se ve en una sola foto →\n\n1. Entera.\n2. De cerca: las capas se notan y me gusta que se noten.\n3. Por detrás.\n4. En la mano.\n\n' + cap(f.n) + (f.precio ? ' · ' + f.precio : '') + '. ¿Qué foto te ha convencido más?' } },
  { k: 'colores', cat: 'producto', t: 'Elige color', tipo: 'carrusel', para: 'Que comenten cuál prefieren',
    pasos: ['1 · Todas las versiones juntas.', '2, 3, 4… · Una foto por color.', 'Última · «¿Cuál te quedas?»'], foto: ['Colócalas en fila o en abanico, a la misma distancia.', 'Ordena los colores de claro a oscuro.'],
    texto: { simple: f => cap(f.n) + ' en varios colores. ¿Cuál te quedas?', medio: f => 'La misma pieza, colores distintos. Dime un número y te digo si lo tengo ya hecho o lo imprimo para ti.',
      pro: f => 'Pregunta seria: ¿1, 2, 3 o 4?\n\nEs ' + f.n + ' y la hago en el color que quieras. Las de la foto son las que más me piden, pero tengo más filamento esperando.\n\nComenta tu número. El más votado lo dejo hecho esta semana.' } },
  { k: 'antes_despues', cat: 'antes', t: 'Recién salida / terminada', tipo: 'carrusel', para: 'Enseñar el trabajo que no se ve',
    pasos: ['1 · La pieza recién salida de la impresora, con soportes.', '2 · La misma pieza ya limpia y repasada.'], foto: ['Misma posición y misma luz en las dos fotos: el cambio se nota más.', 'No recortes los soportes: son la gracia del «antes».'],
    texto: { simple: f => 'Antes y después de quitar soportes.', medio: f => 'Así sale de la impresora y así queda cuando termino con ella. Entre una foto y otra hay un buen rato de quitar soportes y repasar.',
      pro: f => 'La impresora hace la mitad del trabajo.\n\nLa foto 1 es ' + f.n + ' recién salida. La 2, después de quitar soportes, repasar bordes y revisarla en la mesa.\n\nSi alguna vez te has preguntado por qué algo hecho así no cuesta lo mismo que algo de fábrica, es por la foto 2.' } },
  { k: 'idea_resultado', cat: 'antes', t: 'Del dibujo a la pieza', tipo: 'carrusel', para: 'Contar de dónde sale la idea',
    pasos: ['1 · El boceto, la captura del diseño o la foto que te mandó el cliente.', '2 · El modelo en el ordenador.', '3 · La pieza terminada.'], foto: ['Una captura de pantalla del diseño vale como foto.', 'Termina siempre con la pieza real.'],
    texto: { simple: f => 'De la idea a la pieza.', medio: f => 'Empezó siendo esto (foto 1) y terminó siendo ' + f.n + '. Desliza para ver el camino.',
      pro: f => 'Me mandaron una idea y poco más.\n\n1. Lo que me pidieron.\n2. Cómo lo dibujé.\n3. Cómo quedó.\n\nSi tienes algo en la cabeza y no sabes si se puede hacer, mándamelo aunque sea en una servilleta.' } },
  { k: 'como_cuidar', cat: 'educativo', t: 'Cómo cuidarla', tipo: 'carrusel', para: 'Dar algo útil para guardar',
    pasos: ['1 · Título: «Cómo cuidar una pieza impresa en 3D».', '2 · No la dejes al sol dentro del coche.', '3 · Se limpia con un paño húmedo.', '4 · Si se ensucia mucho: agua tibia y jabón, sin lavavajillas.'], foto: ['Texto grande y corto en cada imagen: se lee en el móvil.', 'Una idea por imagen.'],
    texto: { simple: f => 'Tres cosas para que te dure años. Guárdalo.', medio: f => 'Me lo preguntáis mucho, así que aquí va: cómo cuidar una pieza de ' + (f.material || 'PLA') + '. Es fácil. Lo único importante: lejos del calor fuerte.',
      pro: f => 'Guarda esto si tienes (o vas a tener) algo impreso en 3D.\n\n· Nada de coche al sol ni lavavajillas: el calor lo deforma.\n· Paño húmedo y listo.\n· Si se cae, normalmente aguanta. Si no, escríbeme.\n\n¿Alguna duda más? Pregunta abajo y la añado.' } },
  { k: 'material', cat: 'educativo', t: '¿De qué está hecho?', tipo: 'post', para: 'Quitar dudas antes de comprar',
    pasos: ['Foto de la bobina de filamento junto a la pieza hecha con ella.'], foto: ['Bobina detrás, pieza delante.', 'Que se vea el mismo color en las dos.'],
    texto: { simple: f => 'De aquí (la bobina) sale esto (la pieza).', medio: f => 'Esto es ' + (f.material || 'PLA') + ': un plástico de origen vegetal que se funde y se va poniendo capa a capa. De esa bobina sale ' + f.n + '.',
      pro: f => '«¿Y esto de qué es?»\n\n' + (f.material || 'PLA') + '. Viene en bobinas como la de la foto, se funde a unos 200 grados y la impresora lo va colocando en capas finísimas' + (f.horas ? '. ' + cap(f.n) + ' son ' + horasTxt(f.horas) + ' de impresión' : '') + '.\n\nNo es un material para meter en el horno, pero para el uso de casa aguanta sin problema.' } },
  { k: 'mito', cat: 'educativo', t: 'Lo que la gente cree', tipo: 'carrusel', para: 'Enseñar y generar conversación',
    pasos: ['1 · «Lo que la gente cree de la impresión 3D».', '2 · «Le das a un botón y sale sola» → foto de una pieza fallida.', '3 · «Es todo plástico barato» → detalle de un acabado bueno.', '4 · «Tarda un minuto» → captura de las horas de impresión.'], foto: ['Las piezas que han salido mal funcionan muy bien aquí.'],
    texto: { simple: f => 'Lo que se cree y lo que es.', medio: f => 'Tres cosas que oigo mucho sobre imprimir en 3D y que no son del todo así. La segunda foto es de esta misma semana.',
      pro: f => 'Me lo dicen cada semana: «eso le das a un botón y ya».\n\nDesliza y te enseño el botón.\n\n(Spoiler: la pieza de la foto 2 fue a la basura después de varias horas.)\n\n¿Qué pensabas tú antes de ver esto?' } },
  { k: 'disponible', cat: 'venta', t: 'Hay unidades listas', tipo: 'post', para: 'Vender lo que ya tienes hecho',
    pasos: ['Foto de las unidades que tienes hechas, juntas.'], foto: ['Cuenta las unidades reales y dilo: no pongas «últimas» si no lo son.'],
    texto: { simple: f => 'Tengo ' + f.n + ' lista para enviar.' + (f.precio ? ' ' + f.precio + '.' : ''), medio: f => 'Estas ya están hechas, así que salen esta semana. ' + cap(f.n) + (f.color ? ' en ' + f.color : '') + (f.precio ? ', ' + f.precio : '') + '. Escríbeme y te la aparto.',
      pro: f => 'Normalmente trabajo por encargo y hay que esperar.\n\nEstas no: ya están hechas, revisadas y empaquetadas. ' + cap(f.n) + (f.precio ? ' · ' + f.precio : '') + '.\n\nLa primera persona que escriba se queda la que quiera. Cuando se acaben, vuelvo al encargo.' } },
  { k: 'regalo', cat: 'venta', t: 'Para regalar a…', tipo: 'post', para: 'Dar una razón concreta para comprar',
    pasos: ['La pieza envuelta o al lado de su paquete.'], foto: ['Papel kraft, cuerda o tu tarjeta de gracias al lado: se ve el regalo.'],
    texto: { simple: f => 'Un detalle para ' + quien(f) + '.', medio: f => 'Si no sabes qué regalarle a ' + quien(f) + ': ' + f.n + '. ' + (f.personalizable ? 'Va con el nombre que me digas. ' : '') + 'Te la mando ya envuelta.',
      pro: f => 'Regalos que no acaban en un cajón.\n\n' + cap(f.n) + ' es de esas cosas que se usan a diario' + (f.personalizable ? ', y lleva el nombre de la persona' : '') + '. La envío envuelta, con una tarjeta, para que solo tengas que entregarla.\n\n¿Para quién sería? Dímelo y te digo qué color le pega.' + (f.precio ? '\n\n' + f.precio + '.' : '') } },
  { k: 'como_pedir', cat: 'venta', t: 'Cómo se pide', tipo: 'carrusel', para: 'Quitar el miedo a escribir',
    pasos: ['1 · «Cómo pedir en 3 pasos».', '2 · Me escribes y me dices qué quieres y en qué color.', '3 · Te digo precio y cuándo estará.', '4 · Lo imprimo, lo reviso y te lo envío con seguimiento.'], foto: ['Captura de un chat (sin datos del cliente) o tres fotos sencillas con el número grande.'],
    texto: { simple: f => 'Pedir es así de fácil. Desliza.', medio: f => 'Para quien nunca ha pedido algo hecho a medida: son tres pasos y no hay que pagar nada hasta que te confirme precio y plazo.',
      pro: f => 'Sé que da reparo escribir «hola, quería una cosa…».\n\nPor eso lo dejo aquí explicado: me cuentas la idea, te digo precio y plazo sin compromiso, y si te encaja lo fabrico y te lo mando con seguimiento.\n\nGuárdalo para cuando lo necesites.' } },
  { k: 'proceso_reel', cat: 'proceso', t: 'De cero a terminada', tipo: 'reel', para: 'El formato que más se ve',
    pasos: ['Plano 1 (2 s) · La placa vacía.', 'Plano 2 (3 s) · Primeras capas.', 'Plano 3 (3 s) · A mitad.', 'Plano 4 (2 s) · La saco de la placa.', 'Plano 5 (3 s) · Terminada, en la mano.'], foto: ['Móvil en vertical y quieto (apóyalo): nada de mover la cámara.', 'Los planos cortos funcionan mejor que uno largo.', 'El último plano, con buena luz.'],
    texto: { simple: f => cap(f.n) + ', de la placa vacía a la mano.', medio: f => (f.horas ? cap(horasTxt(f.horas)) + ' de impresión' : 'Varias horas de impresión') + ' en unos segundos. Es ' + f.n + '.',
      pro: f => 'Lo que ves en 13 segundos ' + (f.horas ? 'son ' + horasTxt(f.horas) : 'son varias horas') + ' en el taller.\n\n' + cap(f.n) + ', desde la primera capa. El momento de despegarla de la placa nunca cansa.\n\nSi quieres ver alguna pieza concreta así, pídemela.' } },
  { k: 'mesa', cat: 'proceso', t: 'Lo que hay hoy en la mesa', tipo: 'historia', para: 'Cercanía: que vean el día a día',
    pasos: ['Una foto de la mesa de trabajo con las piezas pendientes de repasar.', 'Pegatina de pregunta: «¿Cuál es la tuya?»'], foto: ['No ordenes demasiado: se nota cuando es de verdad.'],
    texto: { simple: f => 'Hoy toca repasar todo esto.', medio: f => 'La mesa de hoy. Todas estas salen esta semana.', pro: f => 'Así está la mesa ahora mismo. Si has pedido estos días, la tuya puede estar aquí. Mañana enseño cómo quedan empaquetadas.' } },
  { k: 'empaquetado', cat: 'proceso', t: 'Empaquetando un pedido', tipo: 'reel', para: 'Dar confianza: cómo llega',
    pasos: ['Plano 1 · La pieza terminada.', 'Plano 2 · La envuelvo en burbuja.', 'Plano 3 · Papel kraft y tarjeta de gracias.', 'Plano 4 · Caja cerrada y etiqueta (sin datos del cliente).'], foto: ['Cámara desde arriba, manos trabajando.', 'Tapa la dirección de la etiqueta con el dedo o gira la caja.'],
    texto: { simple: f => 'Así sale un pedido de aquí.', medio: f => 'Cada pedido va envuelto, con su tarjeta y con seguimiento. Este es ' + f.n + ' camino de su casa.',
      pro: f => 'Me preguntan si llega bien.\n\nAsí lo empaqueto: burbuja, papel, tarjeta y caja. Si aun así llegara mal, te la vuelvo a hacer.\n\nEste lleva ' + f.n + ' dentro.' } },
  { k: 'impresora', cat: 'fabricacion', t: 'La impresora trabajando', tipo: 'reel', para: 'Hipnótico: se ve hasta el final',
    pasos: ['Un solo plano fijo de 8–10 s de la impresora poniendo capas, muy de cerca.'], foto: ['Lo más cerca que enfoque el móvil.', 'Sin música alta: el sonido de la máquina gusta.'],
    texto: { simple: f => 'Capa a capa.', medio: f => 'Esto es ' + f.n + ' naciendo. ' + (f.horas ? 'Le quedan unas ' + horasTxt(f.horas) + '.' : 'Le quedan unas horas.'),
      pro: f => 'Podría mirarlo todo el día.\n\nCada pasada es una capa de dos décimas de milímetro. ' + cap(f.n) + ' lleva cientos.\n\n¿Adivinas qué es antes de que termine?' } },
  { k: 'fallo', cat: 'fabricacion', t: 'Esta salió mal', tipo: 'post', para: 'Honestidad: lo que más confianza da',
    pasos: ['Foto de una pieza fallida (espagueti, capa movida, soporte roto).'], foto: ['Tal cual, sin arreglar.'],
    texto: { simple: f => 'No siempre sale a la primera.', medio: f => 'Esto iba a ser ' + f.n + '. A mitad se movió y ha acabado así. Se repite y listo: la que te llega a ti es la buena.',
      pro: f => 'Esto no lo suele enseñar nadie.\n\nIba a ser ' + f.n + '. Algo falló a mitad y horas de trabajo al cubo.\n\nPor eso reviso cada pieza en la mesa antes de empaquetarla: si no la pondría en mi casa, no sale.' } },
  { k: 'filamentos', cat: 'fabricacion', t: 'Los colores del taller', tipo: 'post', para: 'Enseñar opciones sin enseñar producto',
    pasos: ['Todas las bobinas juntas, ordenadas por color.'], foto: ['En fila o apiladas, con las etiquetas hacia atrás.'],
    texto: { simple: f => 'Los colores que tengo ahora mismo.', medio: f => 'Esto es lo que hay en el taller hoy. Cualquier pieza la puedes pedir en cualquiera de estos colores.',
      pro: f => 'Antes de preguntarme «¿lo tienes en…?»: esto es lo que hay ahora mismo.\n\nSi tu color no está, dímelo. A veces pido una bobina solo por un encargo.\n\n¿Cuál echas en falta?' } },
  { k: 'adivina', cat: 'viral', t: '¿Qué es esto?', tipo: 'reel', para: 'Que comenten para adivinar',
    pasos: ['Plano 1 (3 s) · Detalle muy cerca: no se sabe qué es.', 'Plano 2 (2 s) · Un poco más lejos.', 'Plano 3 (3 s) · La pieza entera.'], foto: ['Empieza tan cerca que no se reconozca.', 'Texto en pantalla: «¿Qué es?»'],
    texto: { simple: f => '¿Qué crees que es?', medio: f => 'Te doy tres segundos para adivinarlo. La respuesta, al final.', pro: f => 'Nadie lo acierta a la primera.\n\nEscribe qué crees que es ANTES de ver el final.\n\n(Es ' + f.n + ', pero no se lo digas a los demás.)' } },
  { k: 'pov', cat: 'viral', t: 'Un día de pedidos', tipo: 'reel', para: 'Formato «un día conmigo»',
    pasos: ['Plano 1 · Enciendo las impresoras.', 'Plano 2 · Reviso los pedidos del día.', 'Plano 3 · Quito soportes en la mesa.', 'Plano 4 · Empaqueto.', 'Plano 5 · Paquetes listos para llevar.'], foto: ['Planos de 2 segundos, cámara a la altura de las manos.', 'Texto corto en cada plano: la hora.'],
    texto: { simple: f => 'Un día cualquiera en el taller.', medio: f => 'De encender las máquinas a llevar los paquetes. Así es un día de pedidos.',
      pro: f => 'Lo que hay detrás de un «te lo envío mañana».\n\n09:00 máquinas. 11:00 soportes. 16:00 paquetes. 18:00 transporte.\n\nSi tienes un negocio pequeño, ¿a qué hora empieza el tuyo?' } },
  { k: 'satisfactorio', cat: 'viral', t: 'Quitar soportes', tipo: 'reel', para: 'Vídeo «satisfactorio»',
    pasos: ['Un plano muy cerca de las manos quitando un soporte que sale entero.'], foto: ['Buena luz y sonido real: el «crac» es la mitad del vídeo.'],
    texto: { simple: f => 'Cuando sale entero.', medio: f => 'El mejor momento del día: cuando el soporte sale de una pieza.', pro: f => 'No hay nada que hacer aquí salvo mirar.\n\n(Es ' + f.n + '. Sí, salió a la primera. No, no siempre pasa.)' } },
  { k: 'temporada', cat: 'tendencia', t: 'Lo que toca ahora', tipo: 'post', para: 'Aprovechar la fecha',
    pasos: ['La pieza con algo de la temporada alrededor.'], foto: ['Un par de elementos de la época bastan: que no tapen la pieza.'],
    texto: { simple: f => cap(f.n) + ' para ' + temporada().t + '.', medio: f => 'Se acerca ' + temporada().t + ' y ya estoy con los pedidos. ' + cap(f.n) + ' es de lo que más me piden estas semanas.',
      pro: f => cap(temporada().t) + ' está a la vuelta de la esquina.\n\nSi quieres ' + f.n + ' a tiempo, este es el momento: trabajo por encargo y las últimas semanas siempre se llenan.\n\nDime para cuándo lo necesitas y te digo si llego.' } },
  { k: 'esto_o_esto', cat: 'tendencia', t: 'Esto o esto', tipo: 'historia', para: 'Encuesta rápida en historias',
    pasos: ['Dos versiones lado a lado.', 'Pegatina de encuesta con las dos opciones.'], foto: ['Mitad y mitad, a la misma altura.'],
    texto: { simple: f => '¿Izquierda o derecha?', medio: f => 'Voy a hacer más de una de las dos. Vota y decide.', pro: f => 'Necesito que decidáis. La que gane la dejo disponible mañana.' } },
  { k: 'pregunta', cat: 'tendencia', t: 'Preguntas y respuestas', tipo: 'historia', para: 'Sacar ideas de contenido de tus seguidores',
    pasos: ['Foto del taller con la pegatina «Pregúntame».', 'Responde cada pregunta en una historia.'], foto: ['Tu cara o tus manos: se responde más a personas que a productos.'],
    texto: { simple: f => 'Pregúntame lo que quieras del taller.', medio: f => 'Hoy respondo dudas: precios, plazos, colores, lo que sea.', pro: f => 'Una hora respondiendo todo. Lo que más se repita lo convierto en una publicación para que quede guardado.' } }
];
function lugar(f) { return /llaver/.test(sinTildes(f.nombre)) ? 'las llaves de casa' : /macet|plant/.test(sinTildes(f.nombre)) ? 'la estantería del salón' : /escritorio|setup|soporte|organiz/.test(sinTildes(f.nombre) + ' ' + f.cat) ? 'el escritorio' : /cocina|mesa|posavas/.test(sinTildes(f.nombre) + ' ' + f.cat) ? 'la mesa de la cocina' : /lampar|luz/.test(sinTildes(f.nombre)) ? 'la mesilla' : 'casa'; }
function quien(f) { return /mascot|perr|gat/.test(sinTildes(f.nombre) + ' ' + f.cat) ? 'alguien que adora a su mascota' : /moto|coche/.test(f.cat) ? 'quien vive para su moto o su coche' : /escritorio|setup|gamer/.test(f.cat) ? 'quien pasa el día delante del ordenador' : /llaver/.test(sinTildes(f.nombre)) ? 'alguien que estrena casa' : 'alguien que ya tiene de todo'; }
function horasTxt(hh) { return hh >= 1 ? String(hh).replace('.', ',') + (hh === 1 ? ' hora' : ' horas') : Math.round(hh * 60) + ' minutos'; }
// La fecha comercial que viene (según el día real)
export function temporada(hoy) {
  const d = hoy ? new Date(hoy) : new Date(), m = d.getMonth() + 1, dia = d.getDate(), md = m * 100 + dia;
  const L = [[106, 'Reyes', 'reyes'], [214, 'San Valentín', 'sanvalentin'], [319, 'el Día del Padre', 'diadelpadre'], [505, 'el Día de la Madre', 'diadelamadre'], [630, 'el verano', 'verano'], [915, 'la vuelta al cole', 'vueltaalcole'], [1031, 'Halloween', 'halloween'], [1225, 'Navidad', 'navidad']];
  const s = L.find(x => md <= x[0]) || L[0];
  return { t: s[1], tag: s[2] };
}

// ---------- Hashtags y palabras clave: pocos y del producto real ----------
const VACIAS = new Set(['para', 'con', 'del', 'los', 'las', 'una', 'unos', 'por', 'sin', 'the', 'and', 'pack', 'set', 'tipo', 'modelo', 'nuevo', 'nueva', 'mini', 'gran', 'grande', 'pequeno', 'pequena']);
const TEMAS = [[/llaver/, ['llaveros', 'llaveropersonalizado'], ['llavero personalizado', 'llavero con nombre']], [/macet|plant/, ['macetas', 'decoracionconplantas'], ['maceta original', 'maceta decorativa pequeña']],
  [/gat/, ['gatos', 'amantesdelosgatos'], ['regalo para amantes de los gatos']], [/perr/, ['perros', 'amantesdelosperros'], ['regalo para dueños de perro']], [/lampar|luz/, ['lamparas', 'iluminacion'], ['lámpara de diseño', 'lámpara de mesilla original']],
  [/escritorio|setup|organiz|soporte/, ['setup', 'escritorio'], ['organizador de escritorio', 'accesorios para setup']], [/figur|miniatur|anime/, ['figuras', 'coleccionismo'], ['figura decorativa', 'figura para coleccionar']],
  [/navid/, ['navidad', 'decoracionnavideña'], ['adornos de navidad originales']], [/hallow/, ['halloween'], ['decoración de halloween']], [/coraz|amor|valent/, ['regaloparaparejas'], ['regalo romántico original']],
  [/cocina|posavas|mesa/, ['cocina', 'menaje'], ['accesorios de cocina originales']], [/moto|coche/, ['motor'], ['accesorios para coche', 'regalo para moteros']], [/juguet|juego/, ['juguetes'], ['juguete original para niños']]];
export function hashtags(p, cfg, max = 10) {
  const f = ficha(p, cfg), base = sinTildes([f.nombre, p && p.categoria, p && p.subcategoria].join(' ')), out = [];
  const pon = t => { t = sinTildes(t).replace(/[^a-z0-9ñ]/g, ''); if (t.length > 2 && !out.includes('#' + t)) out.push('#' + t); };
  const palabras = sinTildes(f.nombre).split(/[^a-z0-9ñ]+/).filter(w => w.length > 3 && !VACIAS.has(w));
  if (palabras.length > 1) pon(palabras.slice(0, 3).join('')); // el producto exacto
  palabras.slice(0, 1).forEach(pon); // el tipo de pieza (la segunda palabra suelta casi nunca se busca)
  TEMAS.forEach(t => { if (t[0].test(base)) t[1].forEach(pon); });
  ['impresion3d', 'hechoamano', f.personalizable ? 'regalospersonalizados' : 'regalosoriginales'].forEach(pon);
  if (f.color) pon('decoracion' + f.color.split(/\s+/)[0]);
  ['decoracion', 'ideasregalo', 'pequeñonegocio'].forEach(pon);
  if (f.tienda) pon(f.tienda);
  return out.slice(0, max);
}
export function keywords(p, cfg) {
  const f = ficha(p, cfg), base = sinTildes([f.nombre, p && p.categoria, p && p.subcategoria].join(' ')), n = f.n;
  const claves = [n, n + ' impresa en 3D', f.color ? n + ' ' + f.color : '', f.personalizable ? n + ' personalizada' : n + ' original', n + ' para regalar'].filter(Boolean);
  const busquedas = [];
  TEMAS.forEach(t => { if (t[0].test(base)) t[2].forEach(x => busquedas.push(x)); });
  busquedas.push('regalo original hecho a mano', 'decoración impresa en 3D');
  const ideas = ['Pon «' + n + '» en la primera línea del texto: Instagram busca por lo que escribes, no solo por hashtags.', 'Escribe el texto alternativo de la foto (Opciones avanzadas → Accesibilidad): «' + cap(n) + (f.color ? ' de color ' + f.color : '') + ' sobre fondo liso».', 'Usa el mismo nombre del producto en el anuncio de Vinted o Wallapop y aquí: quien te busca lo encuentra en los dos sitios.'];
  if (f.tienda) ideas.push('Añade tu ciudad en el texto o como ubicación si vendes en mano.');
  return { claves: [...new Set(claves)].slice(0, 6), busquedas: [...new Set(busquedas)].slice(0, 6), ideas };
}

// ---------- Generar ----------
export const formatos = cat => F.filter(x => !cat || x.cat === cat).map(x => ({ k: x.k, cat: x.cat, t: x.t, tipo: x.tipo, para: x.para }));
export function generar(k, producto, nivel, cfg) {
  const x = F.find(z => z.k === k); if (!x) return null;
  const f = ficha(producto, cfg), n = ['simple', 'medio', 'pro'].includes(nivel) ? nivel : 'simple';
  const tags = hashtags(producto, cfg, n === 'simple' ? 5 : n === 'medio' ? 8 : 10);
  if (x.k === 'temporada') tags.splice(Math.min(2, tags.length), 0, '#' + temporada().tag);
  const pasos = n === 'simple' ? x.pasos.slice(0, Math.min(x.pasos.length, x.tipo === 'carrusel' ? 3 : 2)) : x.pasos;
  return { k: x.k, cat: x.cat, titulo: x.t, tipo: x.tipo, para: x.para, nivel: n, pasos, foto: n === 'simple' ? x.foto.slice(0, 1) : x.foto, texto: x.texto[n](f).trim(), hashtags: [...new Set(tags)].slice(0, 10), keywords: keywords(producto, cfg) };
}
// Biblioteca de composiciones y estructuras (para elegir cómo hacer la foto o montar el carrusel)
export const COMPOSICIONES = [
  ['Fondo liso', 'La pieza sola sobre una cartulina de un color. Lo más limpio para el feed.'], ['Vista desde arriba', 'Cámara encima, pieza y dos o tres objetos alrededor (bobina, herramienta, planta).'],
  ['En la mano', 'La sujetas tú: da tamaño real y cercanía.'], ['Muy de cerca', 'Solo un detalle: las capas, una letra, un borde.'], ['En su sitio', 'Ya colocada donde se usa, con el entorno visible.'],
  ['Mitad y mitad', 'Dos fotos en una: antes / después, color A / color B.'], ['En fila', 'Varias unidades alineadas: transmite que hay stock y opciones.'], ['Cuadrícula 2 × 2', 'Cuatro variantes en una sola imagen.'],
  ['Con escala', 'Una moneda, un boli o una mano al lado para ver el tamaño.'], ['Manos trabajando', 'Quitando soportes, lijando, empaquetando: el taller de verdad.'], ['Dentro de la impresora', 'La pieza a medio hacer, con la máquina alrededor.'], ['El paquete', 'La caja, el papel y la tarjeta: lo que recibe el cliente.']];
export const ESTRUCTURAS = [
  ['Gancho → prueba → cierre', '1 una frase que pare el dedo · 2–4 lo que lo demuestra · última: qué hacer (guardar, escribir).'], ['Problema → solución', '1 el problema («no sé qué regalar») · 2 tu pieza · 3 cómo queda · 4 cómo pedirla.'],
  ['Paso a paso', 'Un paso por imagen, numerado. Funciona para proceso y para «cómo pedir».'], ['Lista', '«3 cosas que…», una por imagen. Es lo que más se guarda.'], ['Antes → después', 'Solo dos imágenes, misma posición. Simple y muy efectivo.'],
  ['De lejos a cerca', 'Entera → media distancia → detalle. Para enseñar calidad.'], ['Variantes', 'Portada con todas → una por color → pregunta final.'], ['Pregunta → respuesta', 'La duda de un cliente en la portada y la respuesta en las siguientes.']];
