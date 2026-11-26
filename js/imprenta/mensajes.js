// ================= 25-11-2026 · IMPRENTA · biblioteca de MENSAJES para los paquetes (pura, sin pantalla) =================
// Frases para tarjetas, pegatinas y notas que van dentro de la caja. Escritas con voz de taller: cercanas, secas, sin
// prometer nada que no podamos cumplir (ni descuentos, ni premios, ni regalos). Se alternan sin repetirse con `elegir`.
//
// Formato interno: una línea por mensaje  ->  texto | tono | versión corta (opcional)
// El estado de rotación es un objeto simple y serializable: { v:1, usados:{id:veces}, porCliente:{clave:[ids]}, ciclo:{cat:[ids]} }
// Del cliente solo se guarda un hash corto (claveCliente), nunca el nombre.

export const CATEGORIAS = [
  { id: 'agradecimiento', t: 'Agradecimiento', d: 'Dar las gracias por el pedido, sin fórmulas de catálogo.', max: 170 },
  { id: 'cierre', t: 'Cierre de paquete', d: 'Pegatina redonda que sella la caja: 2 a 5 palabras.', max: 32 },
  { id: 'cuidados', t: 'Cuidados de la pieza', d: 'Cómo limpiar y guardar la pieza para que dure.', max: 210 },
  { id: 'volver', t: 'Que vuelvan', d: 'Invitar a pedir otra vez, sin ofertas.', max: 170 },
  { id: 'sorpresa', t: 'Sorpresa', d: 'Notas para el fondo de la caja o debajo del papel.', max: 150 },
  { id: 'humor', t: 'Humor', d: 'Un guiño al abrir la caja.', max: 150 },
  { id: 'resena', t: 'Pedir opinión', d: 'Pedir una reseña sin premio ni presión.', max: 190 },
  { id: 'navidad', t: 'Navidad', d: 'Para los pedidos de fiestas.', max: 170 },
  { id: 'coleccionable', t: 'Dorso de coleccionable', d: 'Texto de dorso para las cartas de una serie.', max: 140 },
  { id: 'local', t: 'Para comercios', d: 'Presentar la marca a tiendas y cafeterías: sobrio y profesional.', max: 260 }
];

const PREF = { agradecimiento: 'agr', cierre: 'cie', cuidados: 'cui', volver: 'vol', sorpresa: 'sor', humor: 'hum', resena: 'res', navidad: 'nav', coleccionable: 'col', local: 'loc' };

const FUENTE = {
agradecimiento: `
Gracias por pedirnos esta pieza. Ha pasado por nuestras manos antes de llegar a las tuyas. | cercano | Gracias por tu pedido
Alguien de aquí la ha mirado dos veces antes de cerrar la caja. Ahora es tuya. | humor
Gracias. Sin gente como tú, este taller sería una sala con muchas ideas y pocas cajas. | humor
Esta pieza se hizo para ti, aunque todavía no lo sabía. Gracias por elegirla. | cercano
Hemos preparado tu pedido con calma y con café. Gracias por esperarlo. | cercano
Que alguien compre algo que hemos hecho nosotros nunca nos deja indiferentes. Gracias. | cercano
Gracias por comprar a un taller pequeño. Se nota en la caja, y esperamos que en la pieza. | sobrio
Gracias por tu pedido. Lo hemos revisado una última vez, por si acaso. | sobrio | Gracias, revisado
Cada pedido que sale de aquí nos hace un poco de ilusión. Este también. Gracias. | cercano
Gracias por darle un sitio a algo hecho en nuestro taller. | elegante
Detrás de esta pieza hay una persona con una lista de pendientes. Gracias por tacharle uno. | humor
Gracias por tu paciencia. Lo que se hace por encargo tarda lo que tarda, y has esperado bien. | cercano
Si algo no es como esperabas, escríbenos. Si lo es, también. Gracias por llevártela. | cercano
Nos alegra que esta pieza se vaya contigo y no se quede en un estante nuestro. Gracias. | cercano
Gracias por el pedido. Hoy en el taller hemos dicho «ha salido uno» y casi aplaudimos. | humor
Gracias por la compra. Está hecha en nuestro taller y preparada a mano, tal como te contamos. | sobrio
Una pieza por encargo es una pequeña apuesta. Gracias por apostar con nosotros. | cercano
Llevábamos días mirando esta pieza. Ahora te toca a ti. Gracias. | humor
Gracias por no comprar lo primero que sale en el buscador. | humor
Un pedido más y una razón más para seguir encendiendo las luces del taller. Gracias. | cercano
Gracias de parte de quien la diseñó, de quien la preparó y de quien le puso la cinta. Casi somos la misma persona. | humor
Gracias por el pedido. Cualquier duda con la pieza, estamos a un mensaje. | sobrio
Gracias por elegir una pieza con intención detrás. | elegante
Con este pedido hemos celebrado en silencio, porque aquí no cabe una fiesta. Gracias. | humor
Gracias por pedirnos algo que no se encuentra en cualquier estantería. | cercano
La hemos hecho pensando en cómo quedaría en tu casa. Gracias por dejarnos intentarlo. | cercano
Gracias. Esta palabra no sale en la factura, pero queríamos ponerla en la caja. | humor
Nos gusta saber que lo que hacemos aquí acaba en un rincón que tú has elegido. | elegante
Gracias por tu pedido. Si te ha gustado, cuéntaselo a alguien. Si no, cuéntanoslo a nosotros. | cercano
Gracias por llegar hasta aquí: encontrarnos, elegir, esperar y abrir la caja. Lo has hecho todo bien. | humor
`,
cierre: `
Hecho en el taller | sobrio
Preparado a mano | sobrio
Cerrado con cuidado | cercano
Pieza por encargo | sobrio
Ya es tuyo | cercano
Abre sin prisa | cercano
Revisado dos veces | humor
Hecho para ti | cercano
Sale del taller | sobrio
Lo mejor, dentro | cercano
Ahora sí, ábrelo | humor
Un momento, aún no | humor
Quien lo abre, sonríe | humor
Mira qué ha llegado | cercano
Casi tan bonito por dentro | humor
Tuyo desde ahora | cercano
Aquí empieza todo | elegante
Con cinta y paciencia | humor
Trátalo bien | humor
Una pieza, un sitio | elegante
Elegido por ti | cercano
Gracias, de verdad | cercano
Revisión doble | sobrio
Mejor con calma | cercano
Pedido en regla | sobrio
Hecho con tiempo | elegante
Para quedarse | elegante
Cerrado por el taller | sobrio
Ábrelo ya | humor
Sin prisa, con ganas | cercano
Detalle por detalle | elegante
Ya puedes presumir | humor
Un pedido tuyo | sobrio
Cinta incluida | humor
Lo hicimos nosotros | cercano
Hecho aquí | sobrio
Toca desenvolver | humor
Cuidado, engancha | humor
Pensado para ti | cercano
Lo pedido, aquí | humor
Firmado: el taller | elegante
Al fin, tu pedido | cercano
Cinta bien pegada | sobrio
Esto va por ti | cercano
Buen viaje, pieza | humor
Hasta la próxima | cercano
Gracias por esperar | cercano
`,
cuidados: `
Límpiala con un paño húmedo y un poco de jabón suave. Con eso tiene bastante. | cercano | Paño húmedo y jabón suave
Lavavajillas, no. Agua muy caliente, tampoco. Es un objeto con carácter, no un plato. | humor | Nada de lavavajillas
Si la dejas al sol fuerte detrás de un cristal, se puede deformar. Dale sombra, que se lo merece. | cercano | Evita el sol fuerte tras el cristal
Dentro del coche en verano, ni lo pienses. El calor y esta pieza no se llevan. | humor | No la dejes en el coche
No es apta para alimentos salvo que su ficha diga lo contrario. Mejor que la comida vaya en un plato. | sobrio | Solo alimentos si la ficha lo dice
Los disolventes y la pieza no son amigos. Si hay que limpiar algo difícil, ve con calma y con jabón. | sobrio
Si es una maceta, ponle plato. El agua tiene que ir a alguna parte y que no sea tu mueble. | humor | Maceta, con plato
Para quitar el polvo basta un paño seco o un pincel suave. Nada de estropajos duros. | cercano
Aléjala de radiadores, estufas y chimeneas. Aguanta mucho, pero no tanto. | cercano
Un golpe fuerte contra el suelo no le sienta bien. Trátala como a una taza que te gusta. | humor
No uses limpiacristales ni productos con alcohol fuerte. El jabón neutro basta. | sobrio
Si se te mancha, no frotes con rabia. Un paño, jabón suave y un poco de paciencia. | cercano
Guárdala en un sitio fresco y seco. No le pedimos más. | sobrio
Si la mueves de sitio, agárrala por la base. Los salientes son para mirar, no para tirar de ellos. | cercano
Si la pieza lleva un detalle fino, tócalo con cariño. Cuanto más delgado, menos le gusta que le tiren. | humor
Si hay que transportarla, envuélvela en un paño y que no vaya suelta. Viajar sola nunca ha sido buena idea. | humor
Al limpiarla, sécala después con un paño suave. El agua no hace daño, pero tampoco la necesita encima. | sobrio
Una pieza decorativa se lleva mejor con una estantería estable y sin vibraciones. | elegante
Si tiene un acabado mate, el jabón suave basta. Los abrillantadores le dan un brillo que no es suyo. | elegante
La luz directa de verano castiga a casi todo. A esta pieza también. Muévela un poco si hace falta. | cercano
Mantenla lejos de velas y llamas. Que sea decoración, no un ensayo. | humor
No la pongas en el lavadero ni en la ducha con agua muy caliente. Mejor en sitio tranquilo. | sobrio
Si la regalas, dile al afortunado que lea esto. Si no, léelo tú. | humor
Con un pincel de cerdas suaves llegas a los rincones que el paño no alcanza. | cercano
Si notas que una parte se afloja, escríbenos. Casi siempre se arregla con una foto. | cercano
Evita ponerla donde se acumule calor: encima de un equipo encendido o junto a un horno. | sobrio
Si ves alguna línea fina en la superficie, es normal en una pieza hecha a mano. Con jabón y paño se ve mejor. | cercano
Que esté limpia y seca antes de guardarla. Así dura y tú te olvidas de ella. | cercano
Si la sacas al exterior, que sea a la sombra. El sol de mediodía no perdona. | cercano
Trátala con la misma delicadeza con la que abrirías una caja que no es tuya. | elegante
`,
volver: `
Si te ha gustado esta pieza, hay más en la tienda. Y las que no están, se pueden pedir. | cercano
¿Echas algo en falta en tu estantería? Cuéntanoslo y lo pensamos juntos. | cercano
Si algún día quieres otra, ya sabes dónde encontrarnos. Aquí seguimos. | sobrio
Esta no será la última. Lo decimos en voz baja, para que no se lo crea el taller. | humor
Si te sobra un hueco en casa, igual tenemos la pieza. Pregúntanos. | humor
Hacemos piezas por encargo. Si se te ocurre alguna, escríbenos y vemos si se puede. | cercano
La próxima vez que quieras algo distinto, cuéntanoslo. Se nos dan bien los encargos raros. | humor
Guarda esta tarjeta en algún sitio donde la encuentres. Dentro de un mes la agradecerás. | humor
Nos encontrarás por WhatsApp y en la tienda web. Escribe cuando quieras. | sobrio
Si regalas una de nuestras piezas y te piden el enlace, ya sabes de dónde viene. | cercano
Hay quien pide una pieza y vuelve a por la segunda. No decimos nada, pero lo anotamos. | humor
Esta pieza se ha ido de casa. La que viene detrás ya está pensando en ti. | humor
Cada pieza que sale del taller deja un hueco que tenemos que llenar. Ayuda con un encargo. | humor
Si quieres algo a tu medida, escríbenos. Una idea basta para empezar. | cercano
Dinos qué te falta. Nosotros ponemos las manos y el taller. | cercano
Vuelve cuando quieras. No hay prisa y siempre hay café. | cercano
Esta es tu primera pieza de aquí. La segunda queda mejor con compañía. | humor
Si tienes una idea y no sabes si se puede hacer, escríbenos. Probablemente sí. | cercano
Entre pedidos nos gusta probar cosas nuevas. Si te interesa verlas antes que nadie, pregúntanos. | cercano
Nos gustaría saber qué te falta en casa. Cuéntanoslo cuando quieras. | sobrio
Tienes nuestro contacto en el paquete. Úsalo para lo que sea: dudas, ideas o encargos. | sobrio
Tu próximo capricho puede empezar con un mensaje de dos líneas. | humor
Si esta pieza acaba pidiendo otra a su lado, es normal. Le pasa a casi todo el mundo. | humor
Hacemos piezas sueltas y pequeñas series. Si quieres un juego completo, dínoslo. | sobrio
Cuando vuelvas, cuéntanos cómo ha ido con esta. Nos ayuda a mejorar la siguiente. | cercano
Para la próxima, trae una idea y un rincón disponible. Lo demás lo ponemos nosotros. | humor
Si conoces a alguien al que le iría bien una pieza así, pásale nuestro nombre. | cercano
Seguimos en el taller, con la luz encendida y alguna idea a medias. Escríbenos. | cercano
No sabemos de adivinar, pero algo nos dice que esta caja no es la última que abrirás. | humor
Un encargo es más fácil de lo que parece: nos escribes, te contestamos, y empezamos. | sobrio
`,
sorpresa: `
Si has llegado hasta el fondo de la caja, ya has demostrado paciencia. | humor
Debajo de este papel no hay nada más. Pero te hemos imaginado levantándolo. | humor
Este mensaje estaba aquí desde antes de que llegara la pieza. | elegante
Si lees esto, has abierto la caja del todo. Gente concienzuda, nos gusta. | humor
Esta nota la escribimos con la caja ya cerrada. Es un poco raro, pero así somos. | humor
¿Buscabas algo más debajo del papel? Pues sí: esta frase. Ya está. | humor
Ahora guarda este papel o tíralo, pero antes léelo despacio una vez más. | humor
Hay una pieza dentro de esta caja. Y fuera, alguien que se ha esforzado en que llegue entera. | cercano
Uno de nosotros ha cerrado esta caja. Con cinta y algo de orgullo. | cercano
Cada caja tiene un detalle que nadie pidió: el de ponerla bien. | elegante
A veces la mejor sorpresa es que todo llegue bien. Aquí está. | cercano
Si has llegado hasta aquí sin romper el papel, eres de los nuestros. | humor
Tu pieza viene con el cuidado que le pone quien la hace. Es lo único que no se ve. | cercano
Esta nota va a quedar mejor guardada en un libro. Sin explicaciones. | elegante
Alguien ha pensado en ti mientras cortaba la cinta. Dos segundos, pero ha pasado. | cercano
Dentro de esta caja has encontrado algo más de lo que pediste: un mensaje. | cercano
Hoy es un buen día para colocar la pieza donde la vea alguien que no te lo espera. | cercano
Si lo has abierto con prisa, mira bien el papel: no se ha ido nada. | humor
Aquí no hay un truco, solo una caja bien cerrada. Y nos gusta eso. | sobrio
Tu pieza ha viajado dentro de una caja y lo ha hecho con elegancia. | elegante
Una nota para recordarte que lo que acabas de abrir lo ha hecho gente de carne y hueso. | cercano
Esta caja no se cerró un viernes por la tarde con prisas. Aunque suena bien. | humor
Esto no es una carta, es solo un papel con ganas de ser leído. | humor
No hay pistas ni mapas. Solo una pieza y una nota. A veces basta con eso. | sobrio
Si has abierto el paquete sin tijeras, enhorabuena: tienes buena mano. | humor
Gira la tarjeta. Si no hay nada detrás, es que la hemos hecho a conciencia. | humor
Esto es solo un papel dentro de una caja. Y sin embargo, aquí estás leyéndolo. | humor
Tu pieza ya está fuera de la caja. Este papel se queda encargado de decirte hola. | cercano
Ahora que estás aquí, respira. Ya lo más difícil, esperar, está hecho. | cercano
Hay detalles que no salen en la foto del pedido. Este papel es uno. | elegante
Si hay un buen rincón en casa para esta pieza, ya lo sabes. Si no, hay uno más. | cercano
`,
humor: `
Cuidado: abrir este paquete puede provocar ganas de pedir otro | humor
Tu paquete ha llegado. Ahora toca presumir | humor
No sabemos guardar secretos, pero sí preparar paquetes bonitos | humor
Este paquete tiene una misión: sacarte una sonrisa | humor
Si has sonreído al abrirlo, misión cumplida | humor
Aviso: esta pieza no ocupa mucho, pero se hace notar. | humor
Sí, hemos tardado un poco. Lo bien hecho se toma su tiempo, y nosotros también. | humor
En este taller no hay prisa, pero sí hay cinta. Mucha cinta. | humor
Si el paquete te ha parecido pequeño, es que lo bueno viene concentrado. | humor
Hemos quitado las etiquetas del taller de la caja. La sonrisa no hemos podido quitarla. | humor
Antes de cerrar la caja hubo dudas sobre la cinta. La cinta ganó. | humor
El tiempo que has esperado tu pedido lo hemos usado en ponerlo guapo. | humor
Este paquete ha viajado más que muchos de nosotros. Y llega entero. | humor
Hemos comprobado la pieza tres veces. La cuarta es para ti. | humor
Si la pieza se te cae, no la mires con esa cara: recógela despacio y revísala. | humor
En el taller hay una norma: nadie cierra una caja sin mirarla bien. La norma la ponemos nosotros. | humor
Aviso para curiosos: dentro hay una pieza, no una galleta. | humor
Nadie ha discutido el color de esta caja, y mira que se intentó. | humor
Hemos puesto la cinta tan recta que se nota que alguien ha sufrido. | humor
Dentro de esta caja hay una pieza con muy buena pinta. Fuera, un taller con muy buena memoria. | humor
La pieza y el taller te desean buena tarde. El taller además te pide que tengas cuidado con las tijeras. | humor
Si has llegado a este papel, enhorabuena: has abierto bien la caja. Sin trucos. | humor
Estas cajas se cierran con una regla casera: si tiembla, se vuelve a cerrar. | humor
Aquí las ideas nunca duermen. Nosotros sí, de vez en cuando. | humor
Esta pieza ha pasado más controles de calidad que un aeropuerto. Y con menos colas. | humor
Si la pieza se mueve sola es que el estante cojea. Revísalo. | humor
Hemos medido dos veces y cortado una. Con la pieza ha pasado lo mismo. | humor
Esta caja ha sido abierta por última vez en el taller. A partir de aquí, tuya. | humor
Pedir una pieza hecha a mano es como pedir una pizza: vas a querer más. | humor
Nadie nos ha pagado por escribir esto. Lo hacemos por pura vanidad. | humor
`,
resena: `
Si tienes un minuto, cuéntanos cómo ha ido. Una opinión sincera nos sirve más que una bonita. | cercano
Nos ayudas mucho si dejas tu opinión donde compraste. Dos líneas bastan. | cercano
Dinos qué te ha parecido, para bien o para mal. Aquí lo leemos todo. | sobrio
Una opinión tuya tarda un minuto en escribirse y nos dura semanas. | cercano
Si algo no ha ido como esperabas, escríbenos antes de opinar en público. Casi siempre tiene arreglo. | sobrio
Tu opinión nos dice qué mejorar. La de los demás, a quién nos va a conocer. | elegante
Una reseña honesta es lo mejor que nos puedes dejar. Y también lo más útil. | cercano
Cuéntanos qué te ha parecido. Si lo cuentas con fotos, mejor: las miramos con lupa. | humor
No hace falta que escribas mucho. Con «me ha gustado» ya sabemos algo. | humor
Una opinión tuya ayuda a quien duda antes de comprar. Y a nosotros, a no dudar. | cercano
Si la pieza ha llegado bien y es como esperabas, dilo donde puedas. Se agradece más de lo que parece. | cercano
Si tienes una foto de la pieza en su sitio, nos encantaría verla. Sin compromiso. | cercano
Nos gustaría saber qué opinas. Sin adornos y sin prisas. | sobrio
Lo que escribas sobre esta pieza lo leeremos nosotros y el siguiente cliente. Escribe con tranquilidad. | cercano
Cuéntanos cómo te ha llegado la caja. A veces mejoramos cosas que no sabíamos que fallaban. | cercano
Si quieres, enséñale la pieza a alguien y cuéntale qué te parece. Y luego cuéntanoslo a nosotros. | humor
Una opinión sincera vale más que cinco bonitas. Escribe la que sea tuya. | cercano
Valoramos las críticas tanto como los aplausos. Con las críticas aprendemos más. | sobrio
Dos minutos de tu tiempo nos ayudan a que un taller pequeño se haga ver. | cercano
Si te ha gustado, dilo. Si no, dilo también. Nos viene bien oír las dos. | humor
Nos sirve saber qué te gustó y qué cambiarías. Con dos frases tenemos para pensar. | cercano
No te pedimos cinco estrellas. Te pedimos las que de verdad pondrías. | humor
Tu reseña no nos cambia el día, pero sí la semana. Y la semana la pasamos aquí. | humor
Una opinión puede ser corta y útil. Como esta tarjeta. | humor
Queremos hacer cada pedido mejor que el anterior. Para eso necesitamos saber cómo fue este. | cercano
Escríbenos cuando quieras: no tiene que ser hoy ni tiene que ser largo. | cercano
Si la pieza te ha gustado tanto como para enseñarla, ya vamos bien. Cuéntanoslo. | cercano
Leemos cada reseña con un café y sin prisas. Ya sabes quién eres. | humor
Una buena reseña se nota. Una sincera, también. Con la tuya nos conformamos. | elegante
Las reseñas son la única forma que tenemos de saber lo que pasa al otro lado de la caja. | sobrio
Dinos lo que quieras, siempre que sea verdad. Para lo demás, ya tenemos marketing. | humor
`,
navidad: `
Felices fiestas desde el taller. Aquí también se hace una pausa para comer turrón. | cercano
Feliz Navidad. Si esta caja es para regalar, dile a quien la reciba que no la sacuda. | humor
Que estas fiestas te traigan lo que no cabe en una caja. La caja, de momento, la hemos preparado nosotros. | cercano
Esta caja ha pasado por el taller en plena época de luces y cinta. Tiene su mérito. | humor
Felices fiestas. Si no tienes dónde poner la pieza, mueve el árbol. | humor
Que la pieza te acompañe en estas fiestas y todo el año siguiente. | cercano
Para estas fechas hemos puesto un poco más de cuidado en las cajas. Y un poco menos de café. | humor
Brindamos por ti con lo que tengamos a mano. Felices fiestas. | cercano
Si lo has pedido para regalar, el papel de regalo lo pones tú. Nosotros ya hemos hecho lo difícil. | humor
Este año el taller ha trabajado hasta tarde. Feliz Navidad a quien lo ha hecho posible: tú. | cercano
Que el próximo año te llegue tan bien envuelto como este paquete. | elegante
Que haya mesa grande, buena compañía y un hueco para esta pieza. Feliz Navidad. | cercano
Gracias por pedirnos algo en estas fechas. Sabemos lo ocupadas que son. | sobrio
Aquí también hay turrón, un poco de prisa y mucha cinta. Felices fiestas. | humor
Que el brindis no se te vaya a la pieza. Felices fiestas. | humor
Deseamos que estas fiestas sean tranquilas y que lo único que se rompa sean las rutinas. | cercano
Sabemos que estas fechas son un lío. Esta caja intenta no serlo. | humor
Si es un regalo, que quien lo reciba sepa que está hecho con cuidado. Feliz Navidad. | cercano
Felices fiestas. Esta pieza no hace ruido, no pide pilas y no se pasa de moda. | humor
Que las fiestas te dejen tiempo para mirar con calma lo que tienes alrededor. | elegante
No hay nada más navideño que abrir una caja y que dentro haya lo que esperabas. | cercano
Felices fiestas desde el taller, donde las luces no son de adorno: son para ver lo que cortamos. | humor
Las fiestas pasan y las ideas siguen en marcha. Feliz Navidad. | cercano
Que la Navidad te encuentre con buena compañía y sitio en la estantería. | humor
Si esta pieza es para ti, felicidades por el pedido. Si es para otro, felicidades por el detalle. | cercano
Os deseamos a todos los de esa casa unas fiestas tranquilas. A la pieza también. | humor
Que se te junten pocas prisas y muchas sobremesas. Felices fiestas. | humor
Este año hemos cerrado muchas cajas. La tuya es una de las que salió con más ganas. | cercano
Entre el frío y las luces, hemos preparado esta pieza con guantes y paciencia. | cercano
Feliz Navidad. Nos vemos en el próximo pedido, con o sin nieve. | humor
Que el año que viene sea una buena pieza: bien hecha, bien colocada y sin que se caiga. | humor
`,
coleccionable: `
Esta carta es una de una serie. Las demás andan por ahí, esperando su turno. | humor
Coleccionar es una forma educada de insistir. Sigue. | humor
Cada carta lleva un número y un nombre. Con eso basta para empezar a reunirlas. | sobrio
Una carta sola ya es bonita. Con las demás, se vuelve una buena razón para tener una vitrina. | cercano
Esta serie nació en el taller, entre herramientas y una taza fría. Se nota. | cercano
Colócala en una estantería, en un libro o en un cajón. Las cartas nunca se quejan. | humor
La serie sigue. Pregúntanos cuáles te faltan. | sobrio
Cada dibujo es distinto. No hay dos iguales, aunque se parezcan. | elegante
Guárdala bien. No por el valor, sino porque cuesta menos que buscarla luego. | humor
Esta carta salió del cajón de las ideas buenas. Cuídala. | cercano
El número que ves arriba es el de su sitio en la serie. Con él sabrás qué te falta. | sobrio
Una serie bien hecha se reconoce por tener un orden. Esta lo tiene. | elegante
Si ya tienes otras, ya sabes cómo va. Si es la primera, bienvenido a un pequeño vicio. | humor
Hecha en el taller como todo lo demás. Con más ganas, eso sí. | humor
Sacar una carta del paquete es la parte fácil. Completar la serie es la parte divertida. | cercano
Una carta, una herramienta, una historia corta. Las historias largas las dejamos a los libros. | humor
Para coleccionistas pacientes: hay más cartas de las que caben en un cajón. | cercano
Cada carta tiene su dibujo y su frase. No son un eslogan, son una forma de pensar. | elegante
Si te ha tocado una repetida, cámbiala con alguien. Eso también es coleccionar. | cercano
Esta carta no vale nada. Y nos parece justo. | humor
Cada carta guarda un trozo del taller. Un trozo pequeño, pero nuestro. | cercano
Hay quien las ordena por número y quien las ordena por color. Los dos tienen razón. | humor
Dale la vuelta a la carta. Ya lo has hecho. Vamos bien. | humor
Cuando tengas más de una, ponlas en fila y mira cómo se parecen sin ser iguales. | cercano
Una serie es una conversación larga con el mismo tema. Esta carta es una frase de ella. | elegante
Esta carta ha sido dibujada, revisada y cortada por personas. No lo decimos para presumir. Bueno, un poco. | humor
Las series tienen un final. Lo bueno es que el camino es largo y con paradas. | cercano
Las cartas de esta serie no se enseñan, se dejan caer sobre la mesa como quien no quiere. | humor
Por el dorso se reconoce una buena carta. Por el frente, una buena serie. | sobrio
Si has leído hasta aquí, eres de los de verdad. Estas cartas son para ti. | humor
`,
local: `
Somos CelebriDiseños, un taller que hace piezas decorativas por encargo. Si tu local necesita algo propio, hablamos. | sobrio
Hacemos piezas para tiendas, cafeterías y espacios que quieren algo distinto. Todas por encargo, todas con su ficha. | sobrio
Podemos personalizar una pieza con el nombre o el estilo de tu local. Escríbenos y te contamos cómo. | sobrio
Piezas pensadas para escaparates, mostradores y mesas. Cuéntanos tu espacio y buscamos el formato. | sobrio
Trabajamos por encargo y en tiradas pequeñas. Esto permite ajustar medidas, colores y acabados a tu local. | sobrio
Para locales con identidad propia: soportes de carta, expositores pequeños y detalles de mesa hechos a medida. | sobrio
Si buscas un detalle para tus clientes o para decorar, podemos estudiarlo juntos. Primero lo hablamos, luego se fabrica. | cercano
Presentamos nuestras piezas con una ficha clara: medidas, materiales y cuidados. Sin letra pequeña. | sobrio
Nos puedes contactar por WhatsApp o desde la tienda web. Antes de empezar, hablamos de plazo y de lo que necesitas. | sobrio
Cada pieza se prepara en nuestro taller. Si necesitas varias iguales, lo planificamos para que coincidan. | sobrio
Una pieza a medida para tu local no tiene por qué ser un gran proyecto. A veces empieza con una foto del rincón. | cercano
Si tu negocio tiene un color o un símbolo, podemos llevarlo a una pieza. Hablamos de lo que sea viable. | sobrio
Trabajamos con diseño propio. Si traes una idea, la afinamos; si no, te proponemos. | sobrio
Para decoración, cartelería o pequeños detalles de mostrador. Todo hecho por encargo, con revisión antes de salir. | sobrio
Podemos enviarte una propuesta con imagen antes de fabricar nada, para que veas qué vas a recibir. | sobrio
Cada encargo se trata por separado, sea para una tienda, una cafetería o un particular. | sobrio
Hablamos claro de plazos y de medidas antes de empezar. Así evitamos sorpresas a ambos lados. | sobrio
Si colaboras con otros negocios, también podemos preparar piezas pensadas para regalar a vuestros clientes. | sobrio
Piezas decorativas hechas en nuestro taller. Disponibles en distintos tamaños y acabados, sujetos a cada encargo. | sobrio
Una carta de presentación breve: somos un taller pequeño, hacemos pocas cosas y las hacemos con atención. | elegante
Si necesitas una muestra para valorar el acabado, pregúntanos. Lo hablamos caso por caso. | sobrio
Si tu local ya sabe lo que quiere, mejor. Si todavía lo está descubriendo, también: se puede empezar por una conversación. | cercano
Podemos adaptarnos a tus medidas: estanterías, mostradores, ventanas. Dinos las que tienes y pensamos desde ahí. | sobrio
Creamos piezas pensadas para estar a la vista: bien acabadas, estables y fáciles de limpiar. | sobrio
Nuestra forma de trabajar es sencilla: nos cuentas, proponemos, aprobamos y fabricamos. En ese orden. | sobrio
Si te interesa vernos trabajar, pregúntanos por nuestro proceso. Nos gusta explicarlo. | cercano
Para locales que buscan piezas que no se vean en todas partes. Cada encargo parte de cero. | elegante
Puedes encontrar nuestras piezas y escribirnos desde la tienda web. Los datos de contacto van en esta tarjeta. | sobrio
Estamos abiertos a colaborar con negocios locales: exposición de piezas, encargos recurrentes o proyectos puntuales. | sobrio
Si esta pieza te ha parecido útil para tu local, cuéntanoslo. Seguro que se nos ocurre algo parecido a tu medida. | cercano
`
};

function parse() {
  const out = [];
  for (const cat of Object.keys(FUENTE)) {
    let n = 0;
    for (const linea of FUENTE[cat].split('\n')) {
      const l = linea.trim();
      if (!l) continue;
      const p = l.split(' | ').map(s => s.trim());
      n++;
      const m = { id: PREF[cat] + '-' + String(n).padStart(3, '0'), cat, texto: p[0], tono: p[1] || 'cercano' };
      if (p[2]) m.corto = p[2];
      out.push(m);
    }
  }
  return out;
}
export const MENSAJES = parse();
export const TONOS = ['humor', 'cercano', 'elegante', 'sobrio'];

export const porCategoria = cat => MENSAJES.filter(m => m.cat === cat);
export function buscar(texto) {
  const q = norm(texto);
  if (!q) return MENSAJES.slice();
  return MENSAJES.filter(m => norm(m.texto + ' ' + (m.corto || '')).includes(q));
}
function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }

// ---------------- Rotación ----------------
export const estadoVacio = () => ({ v: 1, usados: {}, porCliente: {}, ciclo: {} });

// Hash corto (10 caracteres base 36) de un nombre normalizado. Nunca se guarda el texto original.
export function claveCliente(texto) {
  const s = String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');
  let h1 = 0x811c9dc5, h2 = 5381;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = (Math.imul(h2, 33) + c) >>> 0;
  }
  return (h1.toString(36) + h2.toString(36)).padEnd(10, '0').slice(0, 10);
}

function copiaEstado(e) {
  const b = e && typeof e === 'object' ? e : {};
  const c = { v: 1, usados: Object.assign({}, b.usados), porCliente: {}, ciclo: {} };
  for (const k of Object.keys(b.porCliente || {})) c.porCliente[k] = b.porCliente[k].slice();
  for (const k of Object.keys(b.ciclo || {})) c.ciclo[k] = b.ciclo[k].slice();
  return c;
}
function semillaNum(s) {
  if (typeof s === 'number' && isFinite(s)) return s >>> 0;
  if (s === undefined || s === null || s === '') return (Math.random() * 4294967296) >>> 0;
  let h = 0x811c9dc5; const t = String(s);
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
  return h;
}
function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function marcarUsado(estado, id, cliente) {
  const e = copiaEstado(estado), m = MENSAJES.find(x => x.id === id);
  if (!m) return e;
  e.usados[id] = (e.usados[id] || 0) + 1;
  const ci = e.ciclo[m.cat] = e.ciclo[m.cat] || [];
  if (!ci.includes(id)) ci.push(id);
  if (cliente) { const l = e.porCliente[cliente] = e.porCliente[cliente] || []; if (!l.includes(id)) l.push(id); }
  return e;
}
export function deshacer(estado, id, cliente) {
  const e = copiaEstado(estado), m = MENSAJES.find(x => x.id === id);
  if (!m) return e;
  if (e.usados[id]) { e.usados[id]--; if (e.usados[id] <= 0) delete e.usados[id]; }
  if (e.ciclo[m.cat]) e.ciclo[m.cat] = e.ciclo[m.cat].filter(x => x !== id);
  if (cliente && e.porCliente[cliente]) e.porCliente[cliente] = e.porCliente[cliente].filter(x => x !== id);
  return e;
}

// Elige un mensaje de la categoría. No repite dentro de un ciclo, y a un cliente no le repite ninguno (en ninguna categoría)
// mientras queden otros. Devuelve { mensaje, estado } con el estado NUEVO (el de entrada no se toca).
// opciones: { cliente (clave de claveCliente), semilla, tono, corto, excluir: [ids] }
export function elegir(cat, estado, o = {}) {
  const pool = porCategoria(cat);
  if (!pool.length) return { mensaje: null, estado: copiaEstado(estado) };
  let e = copiaEstado(estado);
  const rnd = mulberry32(semillaNum(o.semilla));
  const excl = new Set(o.excluir || []);
  const visto = new Set((o.cliente && e.porCliente[o.cliente]) || []);
  let valido = pool.filter(m => !excl.has(m.id) && (!o.tono || m.tono === o.tono));
  if (!valido.length) valido = pool.filter(m => !excl.has(m.id));
  if (!valido.length) valido = pool;
  const ids = new Set(valido.map(m => m.id));
  const ci = () => new Set(e.ciclo[cat] || []);
  let cand = valido.filter(m => !ci().has(m.id) && !visto.has(m.id));
  if (!cand.length) {
    // ¿quedan sin ver por este cliente? Entonces se abre ciclo nuevo para esos; si no, se elige entre los no usados del ciclo.
    const sinVer = valido.filter(m => !visto.has(m.id));
    if (sinVer.length) { e.ciclo[cat] = (e.ciclo[cat] || []).filter(x => !ids.has(x) || visto.has(x)); cand = sinVer.filter(m => !new Set(e.ciclo[cat]).has(m.id)); if (!cand.length) { e.ciclo[cat] = []; cand = sinVer; } }
    else {
      cand = valido.filter(m => !ci().has(m.id));
      if (!cand.length) { e.ciclo[cat] = (e.ciclo[cat] || []).filter(x => !ids.has(x)); cand = valido; }
    }
  }
  const m = cand[Math.floor(rnd() * cand.length)];
  e = marcarUsado(e, m.id, o.cliente);
  // Ciclo completo de toda la categoría: se vacía para empezar otro
  if ((e.ciclo[cat] || []).length >= pool.length) e.ciclo[cat] = [];
  return { mensaje: Object.assign({}, m, { mostrar: o.corto && m.corto ? m.corto : m.texto }), estado: e };
}
