// ================= v13.10 · 💡 CONSEJOS PARA VENDER MÁS =================
// Biblioteca de consejos cortos y prácticos por plataforma (Etsy, eBay, Opla, Vinted, Wallapop, Instagram, TikTok, tienda
// web…). Salen de uno en uno: «Consejo del día» en Inicio (cambia cada día) y en Anuncios, filtrados por plataforma.
import { h, mount, btn } from './ui.js';

export const PLATAFORMAS = [['general', '⭐ Para todas'], ['etsy', '🧡 Etsy'], ['ebay', '🛒 eBay'], ['opla', '🟣 Opla'], ['vinted', '🩵 Vinted'], ['wallapop', '💚 Wallapop'], ['instagram', '📸 Instagram'], ['tiktok', '🎵 TikTok'], ['web', '🛍️ Tu tienda web']];
// [plataforma, consejo]
export const CONSEJOS = [
  // ---------- Para todas ----------
  ['general', 'La primera foto lo es todo: producto centrado, fondo limpio y luz de ventana. Haz 10 y quédate con la mejor.'],
  ['general', 'Enseña el TAMAÑO: una foto con la pieza en la mano o al lado de una taza vende más que diez explicaciones.'],
  ['general', 'Pon el producto en su sitio: una maceta con su planta en una estantería vende más que la maceta sola.'],
  ['general', 'Usa siempre las mismas 3-4 fotos de estilo (mismo fondo, misma luz): tu perfil parecerá una tienda de verdad.'],
  ['general', 'Título = lo que la gente escribe en el buscador. Empieza por qué es («Maceta geométrica») y luego cómo es (color, tamaño, para qué).'],
  ['general', 'En la descripción, la primera frase tiene que contestar: ¿qué es y por qué lo quiero? El resto, medidas y cuidados.'],
  ['general', 'Pon medidas exactas en cm y el peso. Muchas devoluciones vienen de «me lo imaginaba más grande».'],
  ['general', 'Contesta en menos de una hora siempre que puedas: las plataformas premian a quien responde rápido.'],
  ['general', 'Precio redondo hacia abajo: 14,90 € se percibe mucho más barato que 15 €.'],
  ['general', 'Ten un producto «gancho» barato (llaveros, imanes): atrae visitas y muchos acaban comprando algo más.'],
  ['general', 'Ofrece packs: 2 o 3 piezas que combinan, con un pequeño descuento. Sube el importe de cada venta.'],
  ['general', 'Cada pedido lleva una tarjeta de gracias: es lo que más valoraciones de 5 estrellas consigue.'],
  ['general', 'Pide la valoración a los 2-3 días de que llegue, no antes: el cliente ya lo ha probado y está contento.'],
  ['general', 'Graba el empaquetado: si hay una reclamación, el vídeo te da la razón.'],
  ['general', 'Sube productos nuevos poco a poco (2-3 por semana) en vez de 20 de golpe: las plataformas premian la actividad.'],
  ['general', 'Los domingos por la tarde y entre semana de 20 a 23 h es cuando más gente mira tiendas online.'],
  ['general', 'Prepara colecciones por temporada (Navidad, San Valentín, Día de la Madre, vuelta al cole) con 4-6 semanas de antelación.'],
  ['general', 'Personalizar con un nombre multiplica el valor: un llavero de 4 € con nombre se vende a 8-10 €.'],
  ['general', 'Revisa cada mes qué productos NO se venden: cambia su primera foto o el título antes de bajar el precio.'],
  ['general', 'Mira los 5 más vendidos de tu categoría: copia lo que hacen bien (fotos, títulos), nunca el diseño.'],
  ['general', 'Un envío rápido vale más que un descuento: pon «sale en 24-48 h» si lo puedes cumplir.'],
  ['general', 'Las palabras «hecho a mano», «diseño propio» y «taller en España» generan confianza: úsalas si son verdad.'],
  ['general', 'Evita marcas y personajes con derechos (Disney, Pokémon…): te pueden cerrar la cuenta.'],
  ['general', 'Responde a TODAS las valoraciones, también a las malas: los futuros clientes leen cómo lo solucionas.'],
  ['general', 'Usa vídeo siempre que la plataforma lo permita: una pieza girando 5 segundos vende más que 5 fotos.'],
  ['general', 'Tus mejores clientes repiten: guarda su contacto y avísales cuando saques algo nuevo.'],
  ['general', 'Haz que el embalaje sea bonito: papel kraft, cinta y tarjeta. Es lo que la gente fotografía y comparte.'],
  ['general', 'Antes de publicar, léelo como si fueras el cliente: ¿sabes el tamaño, el color, cuándo llega y cuánto cuesta el envío?'],
  ['general', 'No compitas solo por precio: compite por diseño, rapidez y trato. Siempre habrá alguien más barato.'],
  ['general', 'Apunta las preguntas que te hacen los clientes: si se repiten, la respuesta tiene que estar en la descripción.'],
  // ---------- Etsy ----------
  ['etsy', 'Usa las 13 etiquetas (tags) de Etsy, todas, y con frases de 2-3 palabras («regalo para madre», no solo «regalo»).'],
  ['etsy', 'Títulos de Etsy: las primeras 40 letras son las que se ven. Pon ahí lo más importante.'],
  ['etsy', 'Rellena «Atributos» (color, material, ocasión, estilo): Etsy los usa para los filtros y te enseña más.'],
  ['etsy', 'Sube 10 fotos y 1 vídeo por anuncio: los anuncios completos salen más arriba en las búsquedas.'],
  ['etsy', 'Ofrece envío gratis a partir de 35 € (en EE. UU.) o inclúyelo en el precio: Etsy da prioridad a esos anuncios.'],
  ['etsy', 'Activa la personalización (campo para escribir el nombre): los anuncios personalizables convierten mucho mejor.'],
  ['etsy', 'Escribe la descripción en inglés también si vendes fuera: Etsy traduce, pero el inglés natural posiciona mejor.'],
  ['etsy', 'Renueva tus anuncios menos vistos de vez en cuando (0,20 $): suben de nuevo en las búsquedas.'],
  ['etsy', 'Crea «secciones» en tu tienda (Hogar, Regalos, Llaveros…): la tienda parece más profesional y se navega mejor.'],
  ['etsy', 'El «Plazo de preparación» real y corto (1-3 días) te sube en las búsquedas y evita reclamaciones.'],
  ['etsy', 'Pon una foto de portada y un logo en la tienda: las tiendas con marca transmiten más confianza.'],
  ['etsy', 'Rellena la sección «Sobre nosotros» con foto del taller: en Etsy la gente compra a personas, no a fábricas.'],
  ['etsy', 'Las ventas de los primeros días de un anuncio cuentan mucho: compártelo en redes justo al publicarlo.'],
  ['etsy', 'Usa Etsy Ads con poco presupuesto (1-2 €/día) solo en tus 3 mejores productos y mira cuál funciona.'],
  ['etsy', 'Marca «Hecho por el vendedor» y explica el proceso de impresión 3D y acabado: Etsy pide transparencia.'],
  ['etsy', 'Variaciones: un solo anuncio con colores y tamaños es mejor que 6 anuncios casi iguales.'],
  ['etsy', 'Responde a los mensajes en menos de 24 h: Etsy lo muestra en tu tienda y afecta a la visibilidad.'],
  ['etsy', 'Ofrece cupón a quien deja el carrito o marca como favorito («Ventas y descuentos → ofertas dirigidas»).'],
  // ---------- eBay ----------
  ['ebay', 'En eBay el título tiene 80 caracteres: úsalos todos con palabras que se buscan (material, tamaño, uso).'],
  ['ebay', 'Rellena TODOS los «detalles del artículo» (marca: «Hecho a mano», material, color…): eBay filtra por ellos.'],
  ['ebay', 'Elige «Cómpralo ya» con precio fijo y «Ofertas» activadas: el cliente siente que negocia y compra más.'],
  ['ebay', 'Envío gratis con el coste incluido en el precio: eBay ordena muchas búsquedas por «precio + envío».'],
  ['ebay', 'Pon la política de devoluciones de 30 días: eBay da más visibilidad a quien acepta devoluciones.'],
  ['ebay', 'Usa la categoría más concreta posible (no «Otros»): aparecerás en menos búsquedas pero mucho más claras.'],
  ['ebay', 'Fotos de 1600 px o más con fondo blanco: eBay activa el zoom y las muestra mejor.'],
  ['ebay', 'Envía en el plazo que pones y sube siempre el número de seguimiento: cuenta para ser «vendedor top».'],
  ['ebay', 'Anuncios con varias variantes (colores) en uno solo acumulan las ventas y suben más rápido.'],
  ['ebay', 'Revisa en «Vendidos» (búsqueda avanzada) a qué precio se venden de verdad cosas parecidas antes de poner el tuyo.'],
  ['ebay', 'Los artículos con «Promoted Listings» al 2-4 % salen arriba: úsalo solo en lo que tiene buen margen.'],
  ['ebay', 'Contesta las preguntas de los compradores en pocas horas: muchas compras se pierden por esperar.'],
  // ---------- Opla ----------
  ['opla', 'Opla es para hecho a mano: cuenta la historia de cada pieza (quién la diseña, cómo se hace). Eso vende allí.'],
  ['opla', 'Cuida mucho las fotos de ambiente: en Opla se compra «estilo de vida», no solo el objeto.'],
  ['opla', 'Completa tu perfil de artesana con foto tuya y del taller: genera confianza y te destacan más.'],
  ['opla', 'Sube colecciones completas (3-6 piezas que combinan): Opla las presenta mejor que piezas sueltas.'],
  ['opla', 'Usa palabras de búsqueda en español natural: «regalo original para mamá», «decoración nórdica»…'],
  ['opla', 'Pon plazos de envío claros y cortos: es lo primero que comparan los compradores.'],
  ['opla', 'Comparte tus productos de Opla en Instagram etiquetando a la plataforma: a veces los republican.'],
  ['opla', 'Participa en las campañas de temporada de Opla (Navidad, Día de la Madre): dan mucha visibilidad.'],
  ['opla', 'Ofrece envolver para regalo: en Opla muchísimas compras son regalos.'],
  ['opla', 'Mantén las existencias al día: un producto agotado mucho tiempo baja en los resultados.'],
  // ---------- Vinted ----------
  ['vinted', 'En Vinted sube con frecuencia («Destacar» o editar y guardar): lo nuevo sale primero.'],
  ['vinted', 'Contesta a los «me gusta» con una oferta privada: muchos compran con un 5-10 % de descuento.'],
  ['vinted', 'Usa los packs: activa «descuento por lote» para que se lleven varias cosas.'],
  ['vinted', 'Foto principal cuadrada y con fondo claro: en la cuadrícula de Vinted se nota muchísimo.'],
  ['vinted', 'Pon la categoría correcta (Hogar, Decoración…) y escribe medidas en la descripción.'],
  ['vinted', 'Envía en 1-2 días: las valoraciones de Vinted hablan sobre todo de la rapidez.'],
  ['vinted', 'Imprime la etiqueta de Vinted Go o InPost desde el programa: sale tal cual en la bobina de 100 × 150.'],
  // ---------- Wallapop ----------
  ['wallapop', 'En Wallapop «Reservar» y «Destacar» ayudan; pero lo que más vende es responder rápido.'],
  ['wallapop', 'Activa «Envío» en todos los productos: llegas a toda España, no solo a tu ciudad.'],
  ['wallapop', 'Pon palabras clave al final de la descripción: «decoración, regalo, maceta, impresión 3D».'],
  ['wallapop', 'Renueva (editar y guardar) los productos cada pocos días: vuelven a salir arriba.'],
  ['wallapop', 'Fotos verticales: en el móvil ocupan más pantalla y llaman más la atención.'],
  ['wallapop', 'Si te hacen una oferta baja, contraoferta con un precio intermedio: casi siempre aceptan.'],
  // ---------- Instagram ----------
  ['instagram', 'Publica Reels cortos (7-15 s): el proceso de impresión 3D hipnotiza y se comparte muchísimo.'],
  ['instagram', 'Usa siempre un mismo estilo de color en el perfil: la gente reconoce tus fotos sin leer el nombre.'],
  ['instagram', 'Pon el enlace de tu tienda en la biografía y en las historias con la pegatina de enlace.'],
  ['instagram', 'Historias diarias del taller (aunque sean 2): te mantienen en la cabeza de tus seguidores.'],
  ['instagram', 'Haz un sorteo al llegar a cada «número redondo» de seguidores: atrae público nuevo.'],
  ['instagram', 'Comparte las fotos que suben tus clientes (con permiso): es la mejor publicidad.'],
  ['instagram', 'Usa 5-10 hashtags concretos (#impresion3d #decoracionhogar #regalospersonalizados), no 30 genéricos.'],
  ['instagram', 'Responde a todos los comentarios en la primera hora: Instagram enseña más lo que tiene conversación.'],
  ['instagram', 'Antes y después: la pieza recién impresa con soportes y luego acabada. Gusta mucho.'],
  // ---------- TikTok ----------
  ['tiktok', 'Los 2 primeros segundos deciden: empieza por lo más llamativo (la pieza terminada o un «¿adivinas qué es?»).'],
  ['tiktok', 'Vídeos de proceso en cámara rápida con música de moda: es el contenido que más funciona en impresión 3D.'],
  ['tiktok', 'Publica a diario o casi: TikTok premia la constancia mucho más que la perfección.'],
  ['tiktok', 'Contesta comentarios con un vídeo («te enseño cómo queda en verde»): genera más vídeos y más alcance.'],
  ['tiktok', 'Empaqueta pedidos en vídeo (ASMR): es de lo más visto en tiendas pequeñas.'],
  ['tiktok', 'Pon texto en pantalla: mucha gente lo ve sin sonido.'],
  // ---------- Tienda web ----------
  ['web', 'Comparte tu tienda con el QR de «🛍️ Mi tienda»: pégalo en el mostrador, en la tarjeta y en ferias.'],
  ['web', 'En tu web no pagas comisión: ofrece allí un pequeño descuento o envío gratis frente a las plataformas.'],
  ['web', 'Manda el enlace de tu web en la tarjeta de gracias: el segundo pedido llega directo y sin comisión.'],
  ['web', 'Pon reseñas reales de clientes (con permiso) en tu web: es lo que más ayuda a decidir.'],
  ['web', 'Ten la web siempre al día: un producto agotado o un precio antiguo hace perder la venta.']
];
// Consejo del día (cambia cada día y no se repite en semanas)
export function delDia(fecha, plat) {
  const l = plat ? CONSEJOS.filter(c => c[0] === plat || c[0] === 'general') : CONSEJOS;
  const d = fecha ? new Date(fecha) : new Date(), n = Math.floor(d.getTime() / 86400000);
  return l[(n * 37) % l.length];
}
export const nombrePlat = k => (PLATAFORMAS.find(p => p[0] === k) || [k, k])[1];
// Tarjeta reutilizable (Inicio y Anuncios): un consejo, botón «Otro» y elegir plataforma
export function tarjetaConsejo(opts = {}) {
  let plat = opts.plat || '', i = -1;
  const box = h('div.card.cj-card'), lista = () => plat ? CONSEJOS.filter(c => c[0] === plat) : CONSEJOS;
  const pinta = () => {
    const l = lista(), c = i < 0 ? delDia(null, plat || null) : l[i % l.length];
    mount(box, h('div.row', { style: { gap: '10px', alignItems: 'flex-start' } }, h('div.cj-ico', '💡'),
      h('div.grow', h('div.tiny.muted', (i < 0 ? 'Consejo del día' : 'Consejo') + ' · ' + nombrePlat(c[0])), h('div.cj-txt', c[1]),
        h('div.row.wrap', { style: { gap: '6px', marginTop: '8px' } }, btn('Otro consejo', () => { i = i < 0 ? Math.floor(Math.random() * l.length) : i + 1 + Math.floor(Math.random() * 3); pinta(); }, { cls: 'sm ghost' }),
          opts.chips !== false ? PLATAFORMAS.filter(p => p[0] !== 'general').map(([k, t]) => h('button.chip.sm' + (plat === k ? '.on' : ''), { type: 'button', 'data-plat': k, onclick: () => { plat = plat === k ? '' : k; i = 0; pinta(); } }, t)) : null))));
  };
  pinta();
  return box;
}
