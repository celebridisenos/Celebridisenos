// ================= v40.2 · ✨ DESCRIPCIONES QUE VENDEN, sin salir de la ventana del producto =================
// Ella (13-10-2026): «las descripciones no me gustan: está bien que coloques título, colores y dimensiones, pero no pones
// descripción del producto, no estás viendo qué vendo… quiero un botón rápido y que la IA genere una descripción ahí mismo, en vez de
// trasladar todo al apartado de anuncio con IA; quiero seguir en la ventana de crear producto mientras veo diferentes descripciones…
// con emojis, con un tono de vendedora a puerta fría, sin vergüenza pero sabiendo familiarizar con el comprador; alegre y amigable,
// profesional y atrevido; que inciten a comprar, que les cree la necesidad… y los colores, con emojis de color en redondo».
//  · LA IA MIRA EL PRODUCTO: si el PC tiene el modelo que ve imágenes, se le enseña la foto; si aún no hay foto, una imagen del propio
//    3D (el STL / 3MF que se acaba de subir). Así describe lo que ES, no solo los datos que tú ya has escrito.
//  · Salen TRES a la vez, distintas (una que va al grano, una que cuenta una escena, una para regalar), aquí mismo; «Usar esta» la pone
//    en la casilla y «🔁 Otras tres» pide más. Tú sigues en la ventana.
//  · Los datos (colores con su círculo, medidas, material) van SIEMPRE al final, puestos por el programa: la IA no los inventa.
//  · Sin IA (móvil, o el PC sin Ollama): tres de la casa con el mismo tono, hechas con lo que se sabe del producto.
import { h, mount, btn, toast } from './ui.js';
import { circuloDe, coloresConCirculo, descripcionConColores as lineaColores } from './colores.js';

const CL = window.CL;
export { circuloDe, coloresConCirculo, lineaColores };
const partir = t => String(Array.isArray(t) ? t.join(',') : t || '').split(/\s*[,/;]\s*/).map(x => x.trim()).filter(Boolean);
// los datos del final (los pone el programa, no la IA)
export function pieDeDatos(d) { const L = []; if (partir(d.colores).length) L.push('🎨 Colores: ' + coloresConCirculo(d.colores)); if (d.medidas) L.push('📐 Medidas: ' + d.medidas); if (d.material) L.push('🧵 Material: ' + d.material + (/pla|petg/i.test(d.material) ? ' (ligero y resistente)' : '')); if (d.personalizable) L.push('✏️ Se puede personalizar: pídemelo'); return L.join('\n'); }

// ---------- el encargo a la IA (en DOS pasos: una mira, otra escribe) ----------
// Probado en su PC (13-10-2026) con la foto de un producto suyo: el modelo que VE imágenes (pequeño) escribe flojo y sin emojis, pero
// dice bien lo que ve en un segundo. Así que él solo MIRA («qué es, qué forma tiene, de qué color, para qué sirve») y un modelo que
// escribe mejor en español redacta con ese dato y con un ejemplo del tono. Unos 35–40 s las tres.
export const PREGUNTA_VER = n => 'Mira la imagen de este producto que se llama «' + n + '». En español, en DOS frases cortas y sin adornos, di: qué es y qué forma tiene, de qué color es, y para qué sirve o dónde se pone. Solo lo que se ve.';
const EJEMPLO = 'Ejemplo del tono (es de OTRO producto: no lo copies):\n¿Tu mesa es un caos y lo sabes? 😅 Este organizador pone cada cosa en su sitio sin que tengas que pensar. Bolis, llaves y cargador, todo a mano y bonito de ver ✨ Es de esas cosas que usas el primer día y ya no entiendes cómo vivías sin ella. Escríbeme y te lo preparo esta semana 💛';
export function encargo(d, visto) {
  return 'Eres la dueña de una tienda pequeña de artículos de diseño hechos por encargo. Vendes como una vendedora a puerta fría: sin vergüenza, simpática, cercana, alegre, profesional y atrevida. Tuteas SIEMPRE (nunca de usted) y haces ver a quien compra que esto es justo lo que le hace falta.\n\n'
    + 'Producto: ' + d.nombre + (d.categoria ? '\nTipo: ' + [d.categoria, d.subcategoria].filter(Boolean).join(' › ') : '') + (visto ? '\nLo que se ve en la imagen: ' + visto : '') + (d.notas ? '\nLo que dice la dueña (es lo más importante): ' + d.notas : '') + (d.personalizable ? '\nSe puede personalizar con un nombre o un texto.' : '') + '\n\n' + EJEMPLO + '\n\n'
    + 'Escribe TRES descripciones de venta DISTINTAS de este producto, en español de España:\n1) directa y atrevida; 2) una escenita de la vida real donde hace falta; 3) como el regalo perfecto.\n'
    + 'Cada una: 3 o 4 frases cortas (no más), con 3 a 5 emojis repartidos por el texto, empieza con un gancho que toque una necesidad, di qué es y qué tiene de especial, y termina invitando a pedirlo.\n'
    + 'Prohibido: decir «impreso en 3D» o hablar de impresoras, inventar medidas, precios, colores o materiales (eso va aparte), hashtags, títulos, listas, y las palabras «increíble» e «innovador».\n'
    + 'Sepáralas con una línea que solo tenga ### y no escribas nada más.';
}
// lo que contesta la IA → tres textos limpios
export function trocea(txt) {
  return String(txt || '').replace(/<think>[\s\S]*?<\/think>/g, '').split(/\n\s*#{3,}\s*(?:\n|$)|\n\s*-{3,}\s*\n/).map(x => x.trim().replace(/^#+\s*/, '').replace(/^\s*(?:\*\*)?(?:descripci[oó]n|opci[oó]n|versi[oó]n)?\s*\d*\s*[:.)\-]*(?:\*\*)?\s*/i, '').replace(/^[^\n.!?¿¡]{3,40}\n+/, '').replace(/^["«“]|["»”]$/g, '').replace(/\*\*/g, '').replace(/#\w+/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim())
    .filter(x => x.length > 40).slice(0, 3);
}
// la imagen que se le enseña: la foto (reducida) o, si no hay, el 3D visto de tres cuartos
async function aBase64(blob, lado = 768) { const bm = await createImageBitmap(blob), k = Math.min(1, lado / Math.max(bm.width, bm.height)), c = document.createElement('canvas'); c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bm, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.86).split(',')[1]; }
export async function imagenDel3D(file) {
  const { parse3D, viewer } = await import('./stl.js'); const pos = await parse3D(await file.arrayBuffer(), file.name), c = document.createElement('canvas'); c.width = 640; c.height = 640; c.style.cssText = 'position:fixed;left:-9999px;top:0;width:640px;height:640px'; document.body.appendChild(c);
  try { const v = viewer(c, pos, { snapshot: true }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const f = document.createElement('canvas'); f.width = 640; f.height = 640; const g = f.getContext('2d'); g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 640, 640); g.drawImage(c, 0, 0); const b = f.toDataURL('image/jpeg', 0.86).split(',')[1]; try { v.destroy && v.destroy(); } catch (e) { } return b; } finally { c.remove(); }
}
// d = { nombre, categoria, subcategoria, notas, colores, medidas, material, personalizable, foto (File|Blob), archivo3d (File) } → { textos: [3], con: 'vista' | 'texto' | 'casa', pie }
export async function tresDescripciones(d, o = {}) {
  const pie = pieDeDatos(d), junta = t => t + (pie ? '\n\n' + pie : '');
  try {
    const D = await import('./desktop.js'), E = await import('./ai/engine.js'); let visto = '', deQue = '', escritor = '';
    if (D.desktop.on) { const st = await D.desktop.iaEstado().catch(() => null), M = ((st && st.modelos) || []).map(m => m.nombre), vis = M.find(m => /qwen2\.5vl|llava|gemma3|minicpm-v|llama3\.2-vision/i.test(m));
      escritor = [/^qwen2\.5:(7|14)b/i, /^qwen3:(8|14)b/i, /^(gemma[23]|llama3|mistral|phi4)/i].map(rx => M.find(m => rx.test(m) && !/embed|vl/i.test(m))).find(Boolean) || '';
      const pide = async (model, content, images, options) => { let out = ''; await D.desktop.iaChat({ model, stream: true, think: false, keep_alive: '2m', options, messages: [{ role: 'user', content, images }] }, ch => { const c = ch.message && ch.message.content; if (c) out += c; }); return out.replace(/<think>[\s\S]*?<\/think>/g, '').trim(); };
      if (vis && (d.foto || d.archivo3d)) { try { let img = null; if (d.foto) { img = await aBase64(d.foto); deQue = 'la foto'; } else { img = await imagenDel3D(d.archivo3d); deQue = 'el 3D'; }
          o.estado && o.estado('👀 La IA está mirando ' + deQue + '…'); visto = (await pide(vis, PREGUNTA_VER(d.nombre), [img], { temperature: 0.2, num_predict: 130, num_ctx: 4096 })).replace(/\s+/g, ' ').slice(0, 400); } catch (e) { visto = ''; } }
      if (escritor) { o.estado && o.estado('✍️ La IA está escribiendo tres descripciones…'); const T = trocea(await pide(escritor, encargo(d, visto), undefined, { temperature: 0.9, num_predict: 560, num_ctx: 4096 })); if (T.length >= 2) return { textos: T.map(junta), con: visto ? 'vista' : 'texto', deQue, visto, pie }; } }
    o.estado && o.estado('✍️ La IA está escribiendo…'); const T = trocea(await E.write(encargo(d, visto))); if (T.length >= 2) return { textos: T.map(junta), con: visto ? 'vista' : 'texto', deQue, visto, pie };
  } catch (e) { o.aviso && o.aviso(e.message || String(e)); }
  return { textos: deLaCasa(d, o.semilla).map(junta), con: 'casa', pie };
}

// ---------- sin IA: tres de la casa, con el mismo tono ----------
const NECESIDAD = [
  [/maceta|macetero|planta|suculent|cactus|florero|jarr/, ['¿Esa planta tuya sigue en la maceta fea del vivero? 🪴', 'Tu salón está pidiendo a gritos un poco de verde con estilo 🌿'], 'le da a tu rincón ese toque que hace que la gente pregunte «¿y esto de dónde es?»', 'quien tiene plantas… o quiere empezar con buen pie'],
  [/organizador|caja|cajita|bandeja|joyero|porta|soporte|stand|cubilete/, ['Seamos sinceras: esa mesa es un caos y lo sabes 😅', '¿Cuántas veces has perdido hoy las llaves, el cargador o la paciencia? 🙃'], 'pone cada cosa en su sitio y deja la mesa como de revista', 'esa persona que siempre lo pierde todo (todas conocemos a una)'],
  [/l[aá]mpara|luz|led|vela|portavela/, ['Llegas a casa reventada y enciendes… ¿la luz del techo? No, mujer, no 😌', 'Hay luces que alumbran y luces que te cambian la tarde ✨'], 'crea ese ambiente de «hoy no salgo» que te mereces', 'quien acaba de estrenar casa o necesita un rincón de calma'],
  [/llavero|im[aá]n|pin|colgante/, ['Las llaves de todo el mundo son iguales. Las tuyas no tienen por qué 🔑', 'Un detalle pequeño que ves veinte veces al día: mejor que te guste 😉'], 'es de esos caprichos baratos que alegran cada vez que lo miras', 'amigas invisibles, cumpleaños y «te he traído una cosita»'],
  [/figura|mu[nñ]eco|personaje|estatua|busto|decora|cuadro|escultura/, ['Esa estantería tuya está muy sosa, y lo sabes 👀', 'Hay piezas que hacen que una casa parezca TU casa 🏡'], 'se lleva todas las miradas y da conversación a las visitas', 'quien cuida los detalles de su casa'],
  [/gat|perr|mascot|comedero|dispensador/, ['Tu peludo te mira con cara de «¿y lo mío para cuándo?» 🐾', 'Si le compras de todo a tu mascota y no te arrepientes: bienvenida al club 😻'], 'le hace la vida más fácil a tu bicho… y a ti', 'cualquiera que viva por y para su mascota'],
  [/juguete|juego|ni[nñ]|kit|peonza|puzzle|dinosaurio|coche|avi[oó]n/, ['¿Otra tarde de pantallas? Tengo algo mejor 😏', 'Los peques se aburren en cinco minutos… con esto no 🙌'], 'los tiene entretenidos montando y jugando, que es como mejor aprenden', 'cumples, bolsitas de fiesta y «pórtate bien y te doy una sorpresa»'],
  [/.*/, ['Hay cosas que no sabías que necesitabas hasta que las ves 👀', 'Te cuento un secreto: esto se me agota siempre 🤫'], 'es bonito, es práctico y lo vas a usar más de lo que crees', 'regalar y acertar sin romperte la cabeza']
];
const CIERRES = ['Pídemelo hoy y te lo preparo con mimo 💛', 'Escríbeme y lo dejamos hecho en un minuto 📲', 'Hazte con el tuyo antes de que se me acaben las manos ✨', 'Dime «lo quiero» y me pongo con ello 🚀'];
export function deLaCasa(d, semilla = Date.now()) {
  let s = (semilla >>> 0) || 7; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }, pick = a => a[Math.floor(r() * a.length) % a.length];
  const n = String(d.nombre || 'este artículo').trim(), tn = CL.norm(n + ' ' + (d.categoria || '') + ' ' + (d.subcategoria || '')), N = NECESIDAD.find(x => x[0].test(tn)), P = n.charAt(0).toUpperCase() + n.slice(1), nota = d.notas ? ' ' + String(d.notas).trim().replace(/\.?$/, '.') : '';
  return [
    pick(N[1]) + ' ' + P + ': ' + N[2] + '.' + nota + ' ' + pick(CIERRES),
    'Imagínate: llegas a casa, lo ves ahí y sonríes 😊 Eso es ' + n.charAt(0).toLowerCase() + n.slice(1) + ': ' + N[2] + '.' + nota + ' Hecho por encargo, uno a uno, para que el tuyo salga perfecto 💪 ' + pick(CIERRES),
    '🎁 ¿Buscas un regalo y no quieres quedar como siempre? ' + P + ' es para ' + N[3] + '. Se nota que está pensado, y eso no se compra en cualquier sitio 😉' + nota + ' ' + pick(CIERRES)
  ];
}

// ---------- el panel (dentro de la ventana del producto: no abre nada encima) ----------
// o = { datos() → d, alUsar(texto), abierto }
export function panelDescripciones(o) {
  const caja = h('div.dia'), lista = h('div.dia-lista'), estado = h('div.dia-estado'); let ocupado = false, semilla = Date.now(), turno = 0;
  const tarjeta = (t, i) => h('div.dia-op', { 'data-i': String(i) }, h('p', t), h('div.row.wrap', { style: { gap: '6px' } }, btn('✅ Usar esta', () => { o.alUsar(t); toast('Puesta en la descripción', 'ok'); caja.querySelectorAll('.dia-op').forEach(x => x.classList.remove('on')); caja.querySelector('.dia-op[data-i="' + i + '"]').classList.add('on'); }, { cls: 'sm primary dia-usar' }),
    btn('Copiar', () => { navigator.clipboard.writeText(t).then(() => toast('Copiada', 'ok'), () => toast('No se pudo copiar', 'bad')); }, { cls: 'sm ghost' })));
  async function pide() {
    if (ocupado) return; const d = o.datos(); if (!String(d.nombre || '').trim()) return toast('Escribe primero el nombre del producto.', 'warn');
    ocupado = true; const yo = ++turno; semilla += 7919; bPide.disabled = true; mount(estado, h('span.dia-giro'), h('span', 'Preparando…')); const t0 = Date.now(), reloj = setInterval(() => { const sp = estado.querySelector('small'); if (sp) sp.textContent = ' · ' + Math.round((Date.now() - t0) / 1000) + ' s'; }, 1000);
    try { const R = await tresDescripciones(d, { semilla, estado: t => mount(estado, h('span.dia-giro'), h('span', t), h('small', '')), aviso: t => { window.__diaAviso = t; } }); if (yo !== turno) return;
      mount(lista, R.textos.map(tarjeta)); mount(estado, h('span.tiny.muted', R.con === 'vista' ? '🤖 Escritas por la IA de tu PC después de mirar ' + R.deQue + ' («' + R.visto.slice(0, 120) + (R.visto.length > 120 ? '…' : '') + '»). Si ha visto mal, díselo en la casilla de arriba y pide otras. Los colores y las medidas los pone el programa.' : R.con === 'texto' ? '🤖 Escritas por la IA con el nombre y el tipo de producto (sin verlo: sube una foto o el 3D y lo mira).' : '📚 De la casa (la IA del PC no está disponible ahora): con el mismo tono, pero sin ver el producto.'));
      mount(bPide, '🔁 Otras tres'); window.__dia = { con: R.con, n: R.textos.length, textos: R.textos };
    } catch (e) { mount(estado, h('span.bad-t', e.message || String(e))); } finally { clearInterval(reloj); ocupado = false; bPide.disabled = false; }
  }
  const bPide = btn('✨ Escríbeme tres descripciones que vendan', pide, { cls: 'dia-pide' });
  mount(caja, h('div.dia-cab', bPide, h('span.tiny.muted', 'Con emojis y tono de vendedora cercana. No sales de esta ventana.')), estado, lista);
  if (o.abierto) setTimeout(pide, 50);
  return caja;
}
