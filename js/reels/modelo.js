// ================= v15.3 · REELS: el proyecto, los estilos y el guion =================
// Un Reel es una lista de escenas (logo, gancho, producto, precio, texto, cta) con un estilo (Minimal, Premium u Oferta)
// y un formato (9:16, 4:5 o 1:1). La vista previa del programa (previa.js) y el vídeo final de Remotion en el PC
// (desktop/host/reels) usan los MISMOS datos y los mismos colores (copia de desktop/host/reels/src/estilos.js).
import { S } from '../store.js';

export const ESTILOS = {
  minimal: { nombre: 'Minimal', d: 'Limpio y claro, colores suaves', fondo: '#f6f3ee', fondo2: '#ebe5dc', texto: '#1f2328', suave: '#6b6560', acento: '#c2410c',
    fuente: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif', fuenteTitulo: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif', peso: 600, pesoTitulo: 700, mayus: false, transicion: 'fade', tTrans: 0.45 },
  premium: { nombre: 'Premium', d: 'Oscuro y dorado, elegante', fondo: '#0c0b0f', fondo2: '#1b1720', texto: '#f7f2e8', suave: '#c9bfae', acento: '#d4af37',
    fuente: '"Segoe UI", "Helvetica Neue", Arial, sans-serif', fuenteTitulo: '"Playfair Display", "Didot", Georgia, "Times New Roman", serif', peso: 400, pesoTitulo: 600, mayus: false, transicion: 'wipe', tTrans: 0.6 },
  oferta: { nombre: 'Oferta', d: 'Rojo y amarillo, con mucha energía', fondo: '#e11d48', fondo2: '#9f1239', texto: '#ffffff', suave: '#ffe4e6', acento: '#facc15',
    fuente: '"Arial Black", "Segoe UI Black", Impact, "Helvetica Neue", Arial, sans-serif', fuenteTitulo: '"Arial Black", "Segoe UI Black", Impact, "Helvetica Neue", Arial, sans-serif', peso: 900, pesoTitulo: 900, mayus: true, transicion: 'slide', tTrans: 0.35 }
};
export const FORMATOS = { '9:16': { ancho: 1080, alto: 1920, t: 'Vertical (Reels, TikTok, Historias)' }, '4:5': { ancho: 1080, alto: 1350, t: 'Publicación (4:5)' }, '1:1': { ancho: 1080, alto: 1080, t: 'Cuadrado (1:1)' } };
export const TIPOS = {
  logo: { t: 'Logo', i: '✨', dur: 1.6 }, gancho: { t: 'Gancho', i: '🪝', dur: 2.2 }, producto: { t: 'Producto', i: '🛍️', dur: 3 },
  precio: { t: 'Precio', i: '🏷️', dur: 2.4 }, texto: { t: 'Texto', i: '💬', dur: 2.2 }, cta: { t: 'Llamada a la acción', i: '👉', dur: 2.6 }
};
export const MOVS = [['zoom', 'Acercar'], ['alejar', 'Alejar'], ['panor', 'Desplazar'], ['quieto', 'Quieto']];
export const estiloDe = p => ESTILOS[p.estilo] || ESTILOS.minimal;
const uid = () => 'e' + Math.random().toString(36).slice(2, 9);
export const nuevaEscena = (tipo, o = {}) => Object.assign({ id: uid(), tipo, dur: TIPOS[tipo].dur }, o);

// Duración total en segundos (las transiciones se solapan, igual que en Remotion)
export function duracion(p) {
  const e = estiloDe(p), es = p.escenas || [], fps = 30, tr = Math.round(e.tTrans * fps);
  if (!es.length) return 0;
  return (es.reduce((a, s) => a + Math.max(Math.round((Number(s.dur) || 2) * fps), tr * 2 + 6), 0) - tr * (es.length - 1)) / fps;
}
// Cuándo empieza cada escena (segundos) en el vídeo final
export function tiempos(p) {
  const e = estiloDe(p), fps = 30, tr = Math.round(e.tTrans * fps); let t = 0;
  return (p.escenas || []).map(s => { const d = Math.max(Math.round((Number(s.dur) || 2) * fps), tr * 2 + 6) / fps, r = { ini: t, fin: t + d }; t += d - tr / fps; return r; });
}

export const eur = n => (Math.round(Number(n) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
const marcaNombre = () => (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'CelebriDiseños';
export const usuarioRed = () => { const ig = ((S.cfg && S.cfg.redes && S.cfg.redes.accesos) || []).find(a => /instagram/i.test(a.red)); const m = ig && /instagram\.com\/([A-Za-z0-9_.]+)/.exec(ig.web || ''); return m ? '@' + m[1] : ''; };

// ---------- Guion de plantilla (sin IA): siempre funciona ----------
const GANCHOS = {
  minimal: ['¿Buscas algo *especial*?', 'Hecho con *cariño*', 'Pequeños detalles, *gran* regalo', 'Mira qué *bonito*'],
  premium: ['Diseñado para *destacar*', 'El detalle que *marca* la diferencia', 'Calidad que se *nota*', 'Una pieza *única*'],
  oferta: ['¡*Oferta* que vuela!', '¡Solo por *tiempo limitado*!', '¡No te lo pierdas!', '¡Precio *especial*!']
};
const CTAS = { minimal: 'Pídelo por mensaje', premium: 'Descúbrelo', oferta: '¡Pídelo ya!' };
export function guionPlantilla(prod, estilo, n = 0) {
  const g = GANCHOS[estilo] || GANCHOS.minimal;
  const desc = String((prod && (prod.descripcion || prod.material)) || '').split(/[.\n]/)[0].trim().slice(0, 60);
  return {
    gancho: g[n % g.length],
    titulo: (prod && prod.nombre) || 'Nuestro producto',
    texto: desc || (estilo === 'premium' ? 'Acabado artesanal' : estilo === 'oferta' ? '¡Últimas unidades!' : 'Hecho a mano, a tu gusto'),
    precioTexto: estilo === 'oferta' ? '¡Ahora solo!' : '',
    cta: CTAS[estilo] || CTAS.minimal,
    caption: ((prod && prod.nombre) || 'Nuevo') + (desc ? ' · ' + desc : '') + '. ' + (estilo === 'oferta' ? '¡Corre, que vuela! ' : '') + 'Escríbenos para pedirlo 💌',
    hashtags: '#hechoamano #regalo #' + String(marcaNombre()).toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '') + (prod && prod.categoria ? ' #' + String(prod.categoria).toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '') : '')
  };
}

// ---------- Guion con la IA local (Ollama en el PC; desde el móvil lo redacta el PC) ----------
export async function guionIA(prod, estilo, { onStatus, signal } = {}) {
  const { write } = await import('../ai/engine.js');
  const datos = prod ? ['Producto: ' + prod.nombre, prod.categoria ? 'Categoría: ' + prod.categoria : '', prod.material ? 'Material: ' + prod.material : '', prod.color ? 'Color: ' + prod.color : '',
    prod.tamano ? 'Tamaño: ' + prod.tamano : '', prod.descripcion ? 'Descripción: ' + String(prod.descripcion).slice(0, 400) : '', Number(prod.precio) ? 'Precio: ' + eur(prod.precio) : ''].filter(Boolean).join('\n') : 'Un producto de la tienda';
  const tono = { minimal: 'cercano, tranquilo y claro', premium: 'elegante, exclusivo y sobrio', oferta: 'enérgico, urgente y con exclamaciones' }[estilo] || 'cercano';
  const prompt = 'Escribe el guion de un Reel de Instagram de 10-15 segundos para vender este producto. Tono: ' + tono + '.\n' + datos +
    '\n\nDevuelve SOLO un JSON con estas claves (textos MUY cortos, en español de España):\n{"gancho": "frase de 3-7 palabras que enganche", "titulo": "nombre corto del producto (máx. 4 palabras)", "texto": "una ventaja en 3-7 palabras", "cta": "llamada a la acción de 2-4 palabras", "caption": "texto para la publicación (2-3 frases, con 1-2 emojis)", "hashtags": "8 hashtags separados por espacios"}\n' +
    'Puedes marcar UNA palabra importante del gancho entre asteriscos, así: *palabra*. No inventes precios ni características.';
  onStatus && onStatus('✨ La IA está escribiendo el guion…');
  const r = await write(prompt, { signal, onStatus });
  const m = /\{[\s\S]*\}/.exec(String(r || ''));
  if (!m) throw new Error('La IA no devolvió el guion. Prueba otra vez o usa la plantilla.');
  let j; try { j = JSON.parse(m[0]); } catch (e) { throw new Error('La IA devolvió un guion raro. Prueba otra vez.'); }
  const corta = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const base = guionPlantilla(prod, estilo);
  return { gancho: corta(j.gancho, 70) || base.gancho, titulo: corta(j.titulo, 40) || base.titulo, texto: corta(j.texto, 70) || base.texto, precioTexto: base.precioTexto,
    cta: corta(j.cta, 30) || base.cta, caption: corta(j.caption, 600) || base.caption, hashtags: corta(j.hashtags, 300) || base.hashtags, ia: true };
}

// ---------- Un Reel completo a partir de un producto ----------
// fotos: [{ id (archivo) } | { local: clave }]
export function proyectoDeProducto(prod, { estilo = 'minimal', formato = '9:16', fotos = [], guion } = {}) {
  const g = guion || guionPlantilla(prod, estilo);
  const precio = prod && Number(prod.precio) ? eur(prod.precio) : '';
  const es = [nuevaEscena('logo'), nuevaEscena('gancho', { texto: g.gancho, foto: fotos[0] || null })];
  if (fotos.length) fotos.slice(0, 3).forEach((f, i) => es.push(nuevaEscena('producto', i === 0 ? { foto: f, titulo: g.titulo, texto: g.texto, mov: 'zoom' } : { foto: f, titulo: '', texto: '', mov: i % 2 ? 'alejar' : 'panor', dur: 2.2 })));
  else es.push(nuevaEscena('texto', { texto: '*' + g.titulo + '*' }));
  if (precio) es.push(nuevaEscena('precio', { precio, antes: '', texto: g.precioTexto, foto: fotos[0] || null }));
  es.push(nuevaEscena('cta', { texto: g.cta, sub: usuarioRed() }));
  return { id: 'reel_' + Date.now().toString(36), nombre: (prod && prod.nombre) || 'Reel', productoId: prod ? prod.id : '', estilo, formato, musica: null, marcaAgua: true,
    escenas: es, caption: g.caption, hashtags: g.hashtags, creado: new Date().toISOString() };
}
export function proyectoVacio() {
  const g = guionPlantilla(null, 'minimal');
  return { id: 'reel_' + Date.now().toString(36), nombre: 'Reel', productoId: '', estilo: 'minimal', formato: '9:16', musica: null, marcaAgua: true,
    escenas: [nuevaEscena('logo'), nuevaEscena('gancho', { texto: g.gancho }), nuevaEscena('cta', { texto: g.cta, sub: usuarioRed() })], caption: '', hashtags: g.hashtags, creado: new Date().toISOString() };
}
// Las props que recibe Remotion (fotos ya con su nombre de archivo en la carpeta del trabajo)
export function propsRemotion(p, nombreFoto, logo) {
  const f = FORMATOS[p.formato] || FORMATOS['9:16'];
  return { formato: { ancho: f.ancho, alto: f.alto, fps: 30 }, estilo: p.estilo, marcaAgua: p.marcaAgua !== false, marca: { nombre: marcaNombre(), logo: logo || '' },
    musica: p.musica ? { volumen: p.musica.volumen == null ? 0.7 : p.musica.volumen } : null,
    escenas: p.escenas.map(s => ({ tipo: s.tipo, dur: Number(s.dur) || TIPOS[s.tipo].dur, texto: s.texto || '', titulo: s.titulo || '', sub: s.sub || '', precio: s.precio || '', antes: s.antes || '', mov: s.mov || 'zoom', ajuste: s.ajuste || 'cubrir', foto: s.foto ? nombreFoto(s.foto) : '' })) };
}
