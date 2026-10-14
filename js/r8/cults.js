// ================= 14-10-2026 (tarde) · 🛒 VENDER EN CULTS: lo común (cajas del taller y diseños del catálogo) =================
// Ella: «también quiero que cada cosa tenga su descripción y precio a vender en Cults, que tenga unas notas al lado… y todo lo que pide
// básico, que me lo ponga así y puedo rellenar directamente, o que le dé a exportar y me dé el vídeo, un par de fotos y la descripción,
// título y precio y manual» · «si puedes añadir más cosas para vender en Cults y precio de venta».
// Lo que pide Cults al subir un diseño (su página de subida y la guía de impresion3d.net; los nombres exactos pueden cambiar): NOMBRE,
// DESCRIPCIÓN, PARÁMETROS DE IMPRESIÓN, CATEGORÍA, ETIQUETAS, ARCHIVOS (con varias piezas, mejor un ZIP; solo los STL se ven en su visor
// 3D), FOTOS, y en la segunda pantalla de pago / gratis, PRECIO y público / privado. Cults paga al creador el 80 % del precio neto.
// Los PRECIOS son ORIENTATIVOS: no hay datos públicos fiables de lo que se vende en Cults por tipo de pieza.

export const euros = x => Number(x).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
// las categorías de Cults que usamos: [es, en]
export const CATEGORIAS = { game: ['Juegos', 'Game'], gadget: ['Gadget', 'Gadget'], home: ['Casa', 'Home'], tools: ['Herramientas', 'Tools'], jewelry: ['Joyería', 'Jewelry'], art: ['Arte', 'Art'], fashion: ['Moda', 'Fashion'], various: ['Varios', 'Various'] };
export const NOTAS = {
  titulo: 'Es lo que sale en la búsqueda: primero lo que la gente busca (en inglés vende en todo el mundo; detrás, en español). Corto: menos de 80 letras.',
  descripcion: 'Arriba en inglés y debajo en español. La primera frase es la que engancha: déjala así de corta.',
  categoria: 'Elige en la lista de Cults la que más se parezca (los nombres pueden cambiar un poco).',
  etiquetas: 'Pégalas una a una: son las palabras con las que te encuentran. Mezcla inglés y español.',
  archivos: 'Con varias piezas, Cults recomienda un ZIP. Solo los STL se ven en su visor 3D. El manual (HTML: ábrelo y «Guardar como PDF») súbelo también dentro del ZIP.',
  fotos: 'La primera es la portada. Si la imprimes, añade una foto tuya de verdad: es lo que más vende. El vídeo, para Instagram, TikTok o Wallapop.',
  licencia: 'De pago: elige la licencia de uso privado de Cults (el que compra no puede vender lo impreso). Si quieres permitirlo, la comercial y un precio más alto. Mira los nombres exactos en el desplegable de Cults.',
  gratis: 'GRATIS: es una prueba o una herramienta para la impresora; sube gratis estas (licencia Creative Commons «Atribución»): traen gente a tu perfil y luego compran lo de pago.'
};
export const notaPrecio = (precio, sugerido) => (precio !== sugerido ? 'El tuyo (el que te propongo: ' + euros(sugerido) + '). ' : '') + 'ORIENTATIVO: no hay datos públicos fiables de lo que se vende en Cults por tipo de pieza; va por lo que trae. Cults te paga el 80 % del precio neto (sin IVA). Si se vende bien, súbelo poco a poco.';
// el texto de la ficha para el ZIP (todo junto, con sus notas)
export function fichaTexto(Fi) {
  return ['FICHA PARA CULTS · ' + Fi.titulo.es, '(Copia cada cosa en su sitio del formulario de Cults. Las notas son para ti.)', ''].concat(Fi.campos.flatMap(c => ['■ ' + c.t.toUpperCase(), c.v, '   ↳ Nota: ' + c.nota, ''])).join('\r\n');
}
// un nombre de archivo sin tildes ni símbolos
export const limpio = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');
// el título: «inglés | español» si cabe en 80 letras; si no, solo en inglés (el español va en la nota)
export const tituloCults = (en, es) => ((en + ' | ' + es).length <= 80 ? en + ' | ' + es : en);
export const notaTitulo = (en, es) => NOTAS.titulo + ((en + ' | ' + es).length <= 80 ? '' : ' Con el español no cabía: si Cults te deja, añade detrás « | ' + es + '».');
