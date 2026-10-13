// CelebriCLON · v40.2 · 🤖 LA IA MIRA LA PIEZA
// Ella (13-10-2026): «CelebriCLON tiene que ser más pulida… que sea inteligente, métele código AI».
// Los relieves salen de los TONOS de la foto (clon.js · relieveDeFoto): eso lo mide el ordenador, no se lo inventa nadie. Lo que los
// tonos NO dicen es si ese dibujo SALE de la pieza o va GRABADO, ni cuántas alturas tiene. Eso sí lo ve un ojo: aquí se le enseña la
// foto al modelo que ve imágenes del PC (el mismo que mira los productos para las descripciones) y con su respuesta se ponen solas
// las opciones del relieve. Es una PROPUESTA: se dice lo que ha visto y ella lo cambia si no acierta. Sin el modelo, todo sigue a mano.
export const PREGUNTA_CLON = 'Mira la foto de esta pieza, hecha desde arriba. Contesta SOLO con un JSON así, en español:\n'
  + '{"que": "qué pieza es, en pocas palabras", "dibujo": "sale" | "grabado" | "no", "alturas": 1 | 2 | 3, "texto": "las letras o números que se leen en la pieza, o vacío", "agujeros": número de agujeros que la atraviesan}\n'
  + '«dibujo» es «sale» si las letras o el dibujo sobresalen de la superficie, «grabado» si están hundidos, y «no» si la cara es lisa. «alturas» es cuántos escalones distintos tiene ese dibujo.';

// de lo que conteste el modelo (JSON, JSON con texto alrededor, o una frase) → { que, modo: 'sale' | 'hundido' | null, niveles: 2..4, texto, agujeros } · null si no se entiende
export function leeRespuesta(txt) {
  const t = String(txt || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim(); if (!t) return null; let o = null;
  const m = t.match(/\{[\s\S]*\}/); if (m) { try { o = JSON.parse(m[0]); } catch (e) { try { o = JSON.parse(m[0].replace(/'/g, '"').replace(/,\s*\}/g, '}')); } catch (e2) { o = null; } } }
  if (!o || typeof o !== 'object') { // una frase: se busca lo que diga
    const b = t.toLowerCase(); o = { que: t.split(/[.\n]/)[0].slice(0, 90), dibujo: /grabad|hundid|rehundid|bajorreliev|inciso/.test(b) ? 'grabado' : /sobresal|en relieve|relieve|resalt|saliente/.test(b) ? 'sale' : /lis[ao]|sin dibujo|sin relieve/.test(b) ? 'no' : '' }; if (!o.dibujo) return null; }
  const d = String(o.dibujo ?? o.relieve ?? '').toLowerCase(), modo = /grab|hund/.test(d) ? 'hundido' : /sale|sobres|reliev|fuera/.test(d) ? 'sale' : /^no|lis/.test(d) ? null : undefined; if (modo === undefined) return null;
  const al = Math.max(1, Math.min(3, Math.round(Number(o.alturas) || 1))), ag = Number(o.agujeros);
  return { que: String(o.que || '').replace(/\s+/g, ' ').trim().slice(0, 90), modo, niveles: al + 1, texto: String(o.texto || '').replace(/\s+/g, ' ').trim().slice(0, 40), agujeros: Number.isFinite(ag) && ag >= 0 ? Math.round(ag) : null };
}
export const fraseDe = r => !r ? '' : '🤖 La IA ve: ' + (r.que || 'una pieza') + (r.modo ? ' · el dibujo ' + (r.modo === 'sale' ? 'SALE (en relieve)' : 'va GRABADO (hundido)') + (r.niveles > 2 ? ', con ' + (r.niveles - 1) + ' alturas' : '') : ' · cara lisa, sin dibujo') + (r.texto ? ' · se lee «' + r.texto + '»' : '') + '.';

async function aJpeg(src, lado = 768) { const im = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No puedo abrir la foto')); i.src = src; }), k = Math.min(1, lado / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.88).split(',')[1]; }

// ¿hay en este PC un modelo que ve imágenes? → su nombre, o '' (y por qué)
export async function ojoDelPC() { const D = await import('../desktop.js'); if (!D.desktop.on) return { modelo: '', porque: 'La IA que mira la pieza va en el programa del PC (no en el móvil ni en el navegador).' }; const st = await D.desktop.iaEstado().catch(() => null), M = ((st && st.modelos) || []).map(m => m.nombre), vis = M.find(m => /qwen2\.5vl|llava|gemma3|minicpm-v|llama3\.2-vision/i.test(m)); return vis ? { modelo: vis } : { modelo: '', porque: 'Falta el modelo que VE imágenes. Se descarga gratis en Ajustes → IA del PC (el mismo que mira tus productos para las descripciones).' }; }
// src = la foto (URL o data:) → { que, modo, niveles, texto, agujeros } · lanza si no hay modelo o no se entiende la respuesta
export async function miraPieza(src, o = {}) {
  const ojo = await ojoDelPC(); if (!ojo.modelo) throw new Error(ojo.porque); const D = await import('../desktop.js'), img = await aJpeg(src); let out = '';
  o.estado && o.estado('👀 La IA está mirando la pieza…');
  await D.desktop.iaChat({ model: ojo.modelo, stream: true, think: false, keep_alive: '2m', format: 'json', options: { temperature: 0.1, num_predict: 160, num_ctx: 4096 }, messages: [{ role: 'user', content: PREGUNTA_CLON, images: [img] }] }, ch => { const c = ch.message && ch.message.content; if (c) out += c; }, o.signal);
  const r = leeRespuesta(out); if (!r) throw new Error('La IA ha mirado la pieza pero no ha sabido decir si el dibujo sale o va grabado. Elígelo tú en «Hacia».'); return r;
}
