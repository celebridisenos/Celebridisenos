// ================= v13.10 · 📒 RESPUESTAS RÁPIDAS (manual del equipo) =================
// Respuestas ya escritas para lo que más preguntan los clientes por WhatsApp, Instagram, Vinted, Wallapop, Etsy o correo.
// Huecos que se rellenan solos: {cliente} {tienda} {producto} {pedido} {plazo} {seguimiento} {transportista} {web}
// {instagram} {precio} {firma}. Lo que no se sepa se queda marcado [así] para escribirlo antes de enviar.
export const NORMAS = [
  'Contesta siempre en menos de 24 horas (si puedes, en la primera hora). Un «¡Hola! Lo miro y te digo en un rato» ya cuenta.',
  'Tutea con cariño y respeto. Llama al cliente por su nombre. Sin faltas: relee antes de enviar.',
  'Frases cortas. Una idea por mensaje. Termina con una pregunta o un siguiente paso claro.',
  'Emojis: 1 o 2 por mensaje en WhatsApp e Instagram; ninguno en correos formales.',
  'Nunca prometas fechas que no dependen de ti (transportista). Di «suele tardar» y da el número de seguimiento.',
  'Nunca digas el precio mínimo ni el coste. Si regatean: agradece, ofrece algo (envío, pack) o mantén el precio con amabilidad.',
  'Si hay un problema: primero disculpa, luego solución concreta y plazo. Nunca discutas ni culpes al cliente.',
  'Pide siempre FOTO cuando algo llega mal. Sin foto no se puede reclamar al transportista ni a la plataforma.',
  'Lo que se habla por WhatsApp se queda por escrito: no envíes datos de otros clientes ni datos bancarios por chat.',
  'Despídete siempre dando las gracias y firmando con tu nombre y {tienda}.'
];
export const CATEGORIAS = [
  ['saludo', '👋 Saludos y bienvenida'], ['antes', '🛍️ Antes de comprar'], ['precio', '💸 Precio y regateo'], ['pago', '💳 Pagos'],
  ['personal', '✏️ Personalizados y encargos'], ['fabricacion', '🖨️ Fabricación y plazos'], ['envio', '🚚 Envíos y seguimiento'],
  ['recibido', '📦 Pedido recibido y valoraciones'], ['incidencia', '⚠️ Incidencias'], ['devolucion', '↩️ Cambios y devoluciones'],
  ['redes', '📸 Instagram y redes'], ['empresa', '🤝 Empresas, tiendas y colaboraciones'], ['despedida', '🌙 Fuera de horario y despedidas']
];
// [categoría, título, texto]
export const RESPUESTAS = [
  // ---------- Saludos ----------
  ['saludo', 'Primer mensaje (bienvenida)', '¡Hola {cliente}! 😊 Gracias por escribir a {tienda}. Soy {firma}, cuéntame qué necesitas y te ayudo encantada.'],
  ['saludo', 'Te contesto enseguida', '¡Hola {cliente}! Ahora mismo lo estoy mirando y en un ratito te digo. ¡Gracias por la paciencia! 🙏'],
  ['saludo', 'Cliente que repite', '¡Hola de nuevo, {cliente}! 💜 Qué alegría tenerte otra vez por aquí. ¿Qué te apetece esta vez?'],
  ['saludo', 'Mensaje solo con «Hola» o «¿Sigue disponible?»', '¡Hola {cliente}! Sí, sigue disponible 😊 Si te interesa te cuento medidas, colores y cuándo te lo puedo enviar.'],
  ['saludo', 'Pregunta por audio que no puedes escuchar', '¡Hola {cliente}! Ahora mismo no puedo escuchar audios. ¿Me lo escribes en un mensaje y te contesto enseguida? 🙏'],
  // ---------- Antes de comprar ----------
  ['antes', 'Medidas del producto', 'El {producto} mide [medidas] y pesa unos [peso] g. Si quieres te mando una foto al lado de algo para que veas el tamaño real 📏'],
  ['antes', 'Material (impresión 3D)', 'Está hecho con impresión 3D en [material], un material resistente y ligero. Cada pieza se revisa y se acaba a mano en nuestro taller ✨'],
  ['antes', 'Colores disponibles', 'Lo tenemos en [colores]. Si buscas otro color dímelo: muchas veces lo podemos hacer por encargo 🎨'],
  ['antes', '¿Hay stock?', 'Ahora mismo [hay X unidades / se fabrica bajo pedido]. Si lo pides hoy, sale en unos {plazo} días.'],
  ['antes', '¿Es apto para exterior / agua?', 'Aguanta bien en interior. Para exterior o agua te recomiendo [recomendación], porque el sol directo y la humedad continuada lo pueden estropear con el tiempo.'],
  ['antes', 'Cuidados y limpieza', 'Para limpiarlo basta con un paño suave y un poco de agua. Evita el lavavajillas, el agua muy caliente y dejarlo al sol detrás de un cristal ☀️'],
  ['antes', 'Más fotos o vídeo', '¡Claro! Te mando ahora más fotos y un vídeo cortito para que lo veas bien por todos los lados 📸'],
  ['antes', '¿Dónde estáis? ¿Se puede recoger?', 'Somos un taller pequeño en [ciudad]. Normalmente enviamos por mensajería, pero si estás cerca podemos quedar para la entrega en mano. ¿Te viene bien?'],
  ['antes', 'Regalo: ¿lo envolvéis?', '¡Sí! Lo preparamos para regalo sin precio dentro 🎁 Si quieres, añadimos una tarjeta con tu dedicatoria. ¿Qué te gustaría que pusiera?'],
  ['antes', 'Tienda web', 'Puedes ver todo el catálogo y comprar directamente en nuestra tienda: {web} 🛍️ Si tienes cualquier duda, por aquí te ayudo.'],
  // ---------- Precio y regateo ----------
  ['precio', 'Precio (respuesta clara)', 'El {producto} cuesta {precio}. Incluye [embalaje con protección / tarjeta]. El envío [va aparte / está incluido].'],
  ['precio', 'Regateo amable (mantener precio)', 'Gracias por el interés, {cliente} 😊 El precio ya está muy ajustado porque cada pieza se fabrica y se acaba a mano. Lo que sí puedo hacer es [enviártelo bien protegido sin coste extra / añadirte un detalle].'],
  ['precio', 'Descuento por varios', 'Si te llevas [2 o más], te hago un [X] % de descuento en el total y los envío juntos en un solo paquete 📦'],
  ['precio', 'Oferta demasiado baja', 'Te agradezco la oferta, pero por ese precio no me salen ni los materiales 🙈 Si quieres, te propongo [precio alternativo] y te lo envío hoy mismo.'],
  ['precio', 'Por qué cuesta eso', 'Cada pieza lleva [horas] horas de impresión, material de calidad y el acabado a mano (quitar soportes, lijar, revisar). Por eso dura mucho y queda tan bien 💪'],
  ['precio', 'Bajada de precio (cliente favorito)', '¡Hola {cliente}! Te aviso porque marcaste como favorito el {producto}: hoy te lo dejo en {precio}. ¿Te lo reservo? ✨'],
  // ---------- Pagos ----------
  ['pago', 'Formas de pago', 'Puedes pagar por la plataforma (Vinted, Wallapop, Etsy), en nuestra web {web} o por Bizum. Para encargos personalizados pedimos el [50] % al confirmar.'],
  ['pago', 'Datos para Bizum', 'Puedes hacer el Bizum al [número] a nombre de [nombre]. En el concepto pon «Pedido {pedido}». Cuando lo vea te confirmo y lo ponemos en marcha 🙌'],
  ['pago', 'Pago recibido', '¡Pago recibido, {cliente}! ✅ Tu pedido nº {pedido} ya está confirmado. Te aviso en cuanto salga del taller.'],
  ['pago', 'Recordatorio de pago', '¡Hola {cliente}! Te recuerdo que tenemos reservado tu {producto}. Si sigues interesada/o, cuando hagas el pago lo preparamos. Lo mantengo reservado hasta [fecha] 😊'],
  ['pago', 'Factura', '¡Claro! Pásame nombre o razón social, NIF y dirección fiscal y te envío la factura por correo 📄'],
  // ---------- Personalizados ----------
  ['personal', 'Encargo personalizado (primeras preguntas)', '¡Me encanta la idea! Para darte precio necesito: 1) qué quieres exactamente (si tienes foto, mejor), 2) tamaño aproximado, 3) color y 4) para cuándo lo necesitas.'],
  ['personal', 'Presupuesto enviado', 'Te he preparado el presupuesto: {precio}, listo en unos {plazo} días. Si te parece bien, me confirmas y empezamos 🙌'],
  ['personal', 'Aprobación del diseño', 'Te mando el diseño antes de imprimir para que lo revises. ¿Está todo bien (nombre, letras, colores)? Cuando me digas «OK» lo ponemos a imprimir ✏️'],
  ['personal', 'Nombre o texto para personalizar', 'Perfecto. ¿Me escribes exactamente el nombre o texto, con mayúsculas y tildes como lo quieras? Así no hay errores 😊'],
  ['personal', 'No se puede hacer', 'Te soy sincera: eso no lo podemos hacer bien con impresión 3D [motivo]. Lo que sí te puedo ofrecer es [alternativa]. ¿Qué te parece?'],
  ['personal', 'Derechos de marcas y personajes', 'No podemos fabricar logotipos ni personajes de marcas registradas (tienen derechos de autor), pero podemos diseñarte algo original con ese estilo ✨'],
  // ---------- Fabricación y plazos ----------
  ['fabricacion', 'Plazo normal', 'Lo fabricamos bajo pedido: suele estar listo en {plazo} días y después el envío tarda [1-3] días laborables.'],
  ['fabricacion', 'Ya está en la impresora', '¡Hola {cliente}! Tu {producto} ya está en la impresora 🖨️ Te aviso cuando lo empaquetemos.'],
  ['fabricacion', 'Pedido empaquetado', '¡Hola {cliente}! Tu {producto} ya está empaquetado con mucho mimo 📦 Sale en el próximo envío.'],
  ['fabricacion', 'Lo necesito urgente', 'Lo intento meter hoy en la impresora. Si lo pides antes de las [hora], te lo puedo enviar el [día]. No te lo puedo garantizar al 100 %, pero haré todo lo posible 💪'],
  ['fabricacion', 'Aviso de retraso', '¡Hola {cliente}! Te escribo para avisarte de que tu {producto} va a tardar [X] días más de lo previsto por [motivo]. Siento muchísimo las molestias. Te mantengo informada/o 🙏'],
  // ---------- Envíos ----------
  ['envio', 'Formas de envío', 'Enviamos por [Correos / InPost / Vinted Go / SEUR]. A punto de recogida o a domicilio. El envío cuesta [precio] y tarda [1-3] días laborables.'],
  ['envio', 'Pedido enviado (con seguimiento)', '¡Hola {cliente}! 😊 Tu pedido ya está en camino 🚚\nTransportista: {transportista}\nNº de seguimiento: {seguimiento}\n¡Gracias por confiar en {tienda}!'],
  ['envio', '¿Dónde está mi pedido?', '¡Hola {cliente}! Tu pedido salió el [fecha] con {transportista}. Puedes seguirlo con el número {seguimiento}. Suele llegar en [1-3] días laborables.'],
  ['envio', 'El seguimiento no se mueve', 'A veces el transportista tarda en actualizar el seguimiento 24-48 h. Si mañana sigue igual, lo reclamo yo directamente y te digo algo. ¡Tranquila/o! 🙏'],
  ['envio', 'Paquete en punto de recogida', '¡Tu paquete ya está en el punto de recogida! 📍 Tienes [X] días para recogerlo. Lleva el código o el DNI.'],
  ['envio', 'Envío a otra dirección', 'Sin problema. Pásame la dirección completa (calle, número, piso, código postal, ciudad) y un teléfono de contacto, y lo cambio antes de que salga.'],
  ['envio', 'Envío fuera de España', 'Sí enviamos a [países]. El envío cuesta [precio] y tarda unos [días] días. Puede haber aduanas fuera de la UE (las paga quien recibe).'],
  ['envio', 'Envíos juntos (un solo paquete)', 'Como has pedido varias cosas, te las envío todas juntas en un solo paquete para que solo pagues un envío 📦'],
  // ---------- Recibido y valoraciones ----------
  ['recibido', '¿Te ha llegado bien?', '¡Hola {cliente}! Según el seguimiento ya tienes tu pedido 😊 ¿Ha llegado todo bien? Si hay cualquier cosa, dímelo y lo solucionamos.'],
  ['recibido', 'Pedir valoración', '¡Muchas gracias por tu compra, {cliente}! 💜 Si te ha gustado, nos ayudaría muchísimo una valoración. Somos un taller pequeño y cada opinión cuenta.'],
  ['recibido', 'Gracias por la valoración', '¡Muchísimas gracias por tu valoración, {cliente}! Nos has alegrado el día 🥰 Aquí nos tienes para lo que necesites.'],
  ['recibido', 'Pedir foto para redes', 'Si un día subes una foto con tu {producto}, etiquétanos en Instagram ({instagram}) y la compartimos 📸'],
  ['recibido', 'Valoración negativa (respuesta pública)', 'Hola {cliente}, sentimos mucho que tu experiencia no haya sido buena. Te hemos escrito por privado para solucionarlo cuanto antes. Gracias por avisarnos.'],
  // ---------- Incidencias ----------
  ['incidencia', 'Ha llegado roto', '¡Vaya, {cliente}, lo siento muchísimo! 😔 ¿Me mandas una foto del producto y otra de la caja por fuera? Con eso te mando uno nuevo [o te devuelvo el dinero], tú eliges.'],
  ['incidencia', 'Ha llegado otro producto / color', 'Lo siento mucho, ha sido un error nuestro 🙏 ¿Me mandas una foto de lo que te ha llegado? Te envío el correcto sin coste y te digo cómo devolver el otro.'],
  ['incidencia', 'Falta algo en el paquete', 'Lo siento, {cliente}. Revisamos el vídeo de cuando empaquetamos tu pedido y te digo algo hoy mismo. Mientras, ¿me mandas una foto de lo que te ha llegado?'],
  ['incidencia', 'No le ha llegado', 'Lo siento mucho, {cliente}. Ahora mismo abro una reclamación con {transportista} (seguimiento {seguimiento}) y te mantengo informada/o. Si en [X] días no aparece, te envío otro.'],
  ['incidencia', 'Defecto de fabricación', 'Gracias por avisarme y perdona 🙏 ¿Me mandas una foto de cerca? Si es de fabricación, te hago uno nuevo sin coste y te lo envío lo antes posible.'],
  ['incidencia', 'Cliente enfadado', 'Entiendo perfectamente tu enfado, {cliente}, y siento mucho lo que ha pasado. Quiero solucionarlo ya: te propongo [solución]. ¿Te parece bien?'],
  ['incidencia', 'Solucionado (cierre)', 'Ya está solucionado ✅ Te hemos enviado [lo que sea] con el seguimiento {seguimiento}. Gracias por tu paciencia, {cliente}, y perdona de nuevo las molestias.'],
  // ---------- Devoluciones ----------
  ['devolucion', 'Política de devolución', 'Tienes 14 días desde que lo recibes para devolverlo sin dar explicaciones (excepto productos personalizados). Debe volver sin usar y en su embalaje. Te devolvemos el dinero al recibirlo.'],
  ['devolucion', 'Personalizado: no se devuelve', 'Al ser un producto personalizado no tiene devolución por desistimiento (lo dice la ley). Pero si tiene cualquier defecto, por supuesto que lo solucionamos 💪'],
  ['devolucion', 'Cómo devolverlo', 'Envíalo a: [dirección]. Pon dentro una nota con tu nombre y el nº de pedido {pedido}. Cuando llegue te devolvemos el dinero en [X] días.'],
  ['devolucion', 'Cambio de color o tamaño', '¡Claro! Me lo devuelves y te enviamos el nuevo [color/tamaño]. El envío de vuelta [corre de tu cuenta / lo pagamos nosotros].'],
  ['devolucion', 'Reembolso hecho', 'Te hemos hecho el reembolso de {precio} ✅ Según el banco puede tardar [2-5] días en aparecer. ¡Gracias, {cliente}!'],
  // ---------- Redes ----------
  ['redes', 'Comentario «precio?» en Instagram', '¡Hola! Te hemos escrito por privado con toda la info 💌'],
  ['redes', 'DM desde una publicación', '¡Hola {cliente}! Gracias por escribirnos 😊 El {producto} cuesta {precio}. Lo puedes pedir aquí o en nuestra tienda {web}. ¿Te ayudo con algo más?'],
  ['redes', 'Gracias por compartir', '¡Gracias por compartirnos! 🥹 Nos hace muchísima ilusión ver nuestras piezas en tu casa.'],
  ['redes', 'Sorteo', '¡Hola! Para participar: 1) sigue a {instagram}, 2) dale a me gusta y 3) menciona a una amiga. ¡Mucha suerte! 🍀'],
  ['redes', 'Colaboración con influencer', '¡Hola! Nos encanta tu contenido. Somos {tienda}, un taller de impresión 3D. ¿Te apetecería probar alguna de nuestras piezas a cambio de una publicación o historia?'],
  // ---------- Empresas ----------
  ['empresa', 'Pedido para empresa / evento', '¡Gracias por contar con nosotros! Para un pedido de [cantidad] unidades necesitamos: diseño o logo (si es vuestro), medidas, colores y fecha de entrega. Os paso presupuesto en 24-48 h.'],
  ['empresa', 'Tienda que quiere revender', '¡Qué ilusión! Tenemos precios para tiendas a partir de [X] unidades. ¿Me dices qué productos os interesan y en qué cantidad?'],
  ['empresa', 'Precio por volumen', 'Para [cantidad] unidades el precio queda en [precio] €/ud (+ IVA). El plazo sería de [días] días. ¿Lo confirmamos?'],
  // ---------- Fuera de horario ----------
  ['despedida', 'Fuera de horario', '¡Hola {cliente}! Ahora estamos fuera del horario del taller. Mañana a primera hora te contesto con todo 🌙'],
  ['despedida', 'Vacaciones', '¡Hola! Estamos de vacaciones hasta el [fecha]. Puedes hacer tu pedido igualmente y lo fabricamos en cuanto volvamos 🏖️'],
  ['despedida', 'Despedida', '¡Gracias a ti, {cliente}! Cualquier cosa, aquí estamos. ¡Que tengas un día precioso! 💜\n{firma} · {tienda}'],
  ['despedida', 'No compra (sin presión)', '¡Sin problema, {cliente}! Si más adelante te apetece, aquí estaremos. ¡Gracias por escribirnos! 😊']
];
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
// Rellena los huecos y adapta al canal (WhatsApp / Instagram / correo)
export function preparar(texto, datos = {}, canal = 'whatsapp') {
  let t = String(texto).replace(/\{(\w+)\}/g, (m, k) => (datos[k] !== undefined && datos[k] !== '' && datos[k] !== null) ? String(datos[k]) : '[' + k + ']');
  if (canal === 'correo') {
    t = t.replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim();
    const nombre = datos.cliente || '';
    t = t.replace(/^¡?Hola[^!.\n]*[!.]?\s*/i, '');
    t = 'Hola' + (nombre ? ' ' + nombre : '') + ':\n\n' + t.charAt(0).toUpperCase() + t.slice(1) + '\n\nUn saludo,\n' + (datos.firma || '') + (datos.tienda ? '\n' + datos.tienda : '') + (datos.web ? '\n' + datos.web : '');
  } else if (canal === 'instagram') {
    t = t.replace(/\n{2,}/g, '\n');
  }
  return t;
}
