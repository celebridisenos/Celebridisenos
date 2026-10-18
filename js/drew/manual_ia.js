// ================= 👗 CelebriDREW · 🤖 MANUAL FÁCIL (con la IA del PC, o sin ella) · 17-10-2026, noche =================
// Ella: «si puede, añadir una IA que pueda generar un manual fácil de instrucciones, sería ideal».
// Los pasos de montaje (drew/montaje.js) son exactos pero de patronista («derecho con derecho», «piquetes», «remalladora a 1 cm»).
// Aquí se reescriben PASO A PASO para alguien que empieza: la IA local (Ollama, la de su torre) recibe los pasos numerados y devuelve el
// mismo número de pasos, en el mismo orden, en frases cortas; SIN inventar medidas (se comprueba: toda cifra con cm que diga tiene que
// estar en el paso original). Si la IA no está, se cuelga o devuelve algo raro, sale el MANUAL SENCILLO por reglas (sin IA).
// En los dos casos ella lo LEE y lo cambia en un cuadro antes de usarlo; se guarda con la «firma» de los pasos: si la prenda cambia
// (otra costura, otro paso), el manual guardado deja de valer y se avisa.
//   firma(pasos) · sencillo(paso) · peticion(pasos, prenda) · lee(texto, pasos) → { pasos: [...], avisos } · escribe(pasos, { chat, modelo, prenda, onTexto, signal })
export const firma = P => P.map(p => (p.ids || []).join('+') + ':' + (p.titulo || '')).join('|');

// ---------- sin IA: las mismas instrucciones con palabras de andar por casa ----------
const CAMBIOS = [
  [/derecho con derecho/g, 'con las caras bonitas de la tela mirándose (derecho con derecho)'],
  [/haciendo coincidir los piquetes/g, 'con las muescas del borde (piquetes) una frente a otra'],
  [/Costura remalladora a ([\d,]+) cm\./g, 'Cóselo con la remalladora (overlock) a $1 cm del borde.'],
  [/Costura remalladora \(márgenes ([^)]*)\)\./g, 'Cóselo con la remalladora (overlock), a $1 del borde.'],
  [/Costura recta a ([\d,]+) cm\./g, 'Cóselo con puntada recta a $1 cm del borde.'],
  [/ ?Une y remata de una vez y da de sí: la de las prendas de punto\./g, ''],
  [/ ?Guía la cuchilla por el borde del margen\./g, ''],
  [/Pespunte recto al margen; luego sobrehila los márgenes juntos \(zigzag o remalladora\) y plánchalos hacia un lado\./g, 'Después repasa los bordes con zigzag para que no se deshilachen y plancha la costura hacia un lado.'],
  [/acabando en nada; anuda los hilos sin rematar hacia atrás/g, 'terminando justo en el borde del doblez; al final anuda los hilos (no des puntadas hacia atrás)'],
  [/es más corta: estírala un poco al coser para que llegue entera/g, 'es un poco más corta a propósito: estírala suavemente mientras coses para que llegue justo de punta a punta'],
  [/aguja doble o recubridora/g, 'aguja doble (o la recubridora si tienes)'],
  [/sobrehila/g, 'repasa con zigzag'], [/Sobrehila/g, 'Repasa con zigzag'],
  [/pespunta/g, 'cose por encima, cerca del borde'],
];
export function sencillo(p) { let t = String(p.texto || ''); CAMBIOS.forEach(([a, b]) => { t = t.replace(a, b); }); t = t.replace(/\s{2,}/g, ' ').trim();
  return t; } // (sin el título: el título va aparte, en su sitio)

// ---------- con IA ----------
export function peticion(P, prenda = {}) {
  const lista = P.map((p, i) => (i + 1) + '. ' + (p.titulo ? p.titulo + ': ' : '') + String(p.texto || '').replace(/\s+/g, ' ')).join('\n');
  return [
    { role: 'system', content: 'Eres profesora de costura para principiantes. Escribes en español de España, cercano, con frases cortas y en imperativo (tú). ' +
      'Te doy los pasos para coser una prenda. Reescribe CADA paso para alguien que nunca ha cosido: qué piezas coge, cómo las pone, qué cose y un truco si hace falta. ' +
      'Explica las palabras raras entre paréntesis la primera vez (derecho = la cara bonita de la tela; piquetes = las muescas del borde; remalladora = overlock). ' +
      'REGLAS: el MISMO número de pasos y en el MISMO orden; cada paso de 2 a 4 frases; NO inventes medidas ni piezas: usa solo las cifras y nombres que vienen; no numeres el texto. ' +
      'Responde SOLO con JSON así: {"pasos":["texto del paso 1","texto del paso 2",...]}\n/no_think' },
    { role: 'user', content: 'Prenda: ' + (prenda.nombre || prenda.t || 'prenda') + (prenda.tela ? ' (tela: ' + prenda.tela + ')' : '') + '. Son ' + P.length + ' pasos:\n' + lista }];
}
const limpia = t => { t = String(t || ''); if (t.includes('</think>')) t = t.split('</think>').pop(); return t.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim(); };
const cifras = s => (String(s).match(/\d+(?:[.,]\d+)?\s*cm/g) || []).map(x => x.replace(/\s/g, '').replace('.', ','));
// lo que devuelve la IA → los pasos (o error si no vale)
export function lee(texto, P) {
  const t = limpia(texto), a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('La IA no ha devuelto el manual en el formato pedido.');
  let j; try { j = JSON.parse(t.slice(a, b + 1)); } catch (e) { throw new Error('La IA ha devuelto un texto que no se puede leer.'); }
  const L = Array.isArray(j) ? j : j.pasos; if (!Array.isArray(L)) throw new Error('La IA no ha devuelto la lista de pasos.');
  const avisos = [], out = P.map((p, i) => { const s = typeof L[i] === 'string' ? L[i].replace(/^\s*\d+[.)-]\s*/, '').trim() : (L[i] && (L[i].texto || L[i].text)) || '';
    if (s.length < 15) { avisos.push('Paso ' + (i + 1) + ': la IA no lo escribió; va el sencillo.'); return sencillo(p); }
    // ninguna medida que no esté en el paso de verdad (la IA a veces se las inventa)
    const ok = new Set(cifras(p.texto)), raras = cifras(s).filter(c => !ok.has(c)); if (raras.length) { avisos.push('Paso ' + (i + 1) + ': la IA puso una medida que no es (' + raras.join(', ') + '); va el sencillo.'); return sencillo(p); }
    return s.slice(0, 700); });
  if (L.length !== P.length) avisos.unshift('La IA devolvió ' + L.length + ' pasos de ' + P.length + ': los que faltan van en sencillo.');
  return { pasos: out, avisos };
}
// pide el manual a la IA local (chat = desktop.iaChat) y devuelve { pasos, avisos, modelo }
export async function escribe(P, { chat, modelo, prenda, onTexto, signal } = {}) {
  if (!chat || !modelo) throw new Error('No hay IA en este ordenador.');
  let texto = ''; await chat({ model: modelo, stream: true, think: false, keep_alive: '10m', format: 'json', options: { temperature: 0.3, num_ctx: 8192, num_predict: 3000 }, messages: peticion(P, prenda) },
    ch => { const c = ch && ch.message && ch.message.content; if (c) { texto += c; onTexto && onTexto(limpia(texto)); } }, signal);
  return Object.assign(lee(texto, P), { modelo });
}
