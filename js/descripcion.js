// ================= v13.10 · ✨ DESCRIPCIÓN RÁPIDA =================
// Una sola pregunta: «¿Qué vas a vender?» (+ la foto, si quieres). Sale una descripción CORTA de una biblioteca de frases,
// distinta cada vez y en cuatro tonos (pícaro, elegante, divertido, profesional). v16: habla del artículo, no de «impreso en 3D». Con la foto se detecta el color y el acabado. Si la IA del PC está disponible
// (con el modelo que ve imágenes), «✨ Con IA» mira la foto y la redacta; si no, se usa la biblioteca. Nunca textos largos.
import { h, mount, btn, modal, toast, inp, copyText, sel } from './ui.js';
import { S, can, mutate, byId, upsertLocal, emit } from './store.js';

const CL = window.CL;
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// ---------- Biblioteca (v16): qué despierta cada tipo de pieza ----------
// Ya no se repite «impreso en 3D» (el cliente lo sabe): se habla del ARTÍCULO y de las ganas de tenerlo.
// Cuatro tonos que se van alternando: 😏 pícaro · ✨ elegante · 😄 divertido · ✅ profesional. Siempre cortas y con emojis.
// sitio = dónde va · b = lo que consigue (frase) · v = para + infinitivo · ex = emojis de ese tipo
const TIPOS = [
  { k: /maceta|macetero|planta|suculent|cactus/, sitio: 'estantería', b: ['tus plantas van a presumir de casa nueva', 'ese rincón soso deja de serlo', 'verde, bonito y sin complicarte'], v: ['darle vida a ese rincón', 'que tus suculentas estrenen casa'], ex: ['🌿', '🪴', '🌱'] },
  { k: /llavero/, sitio: 'juego de llaves', b: ['tus llaves por fin tienen estilo', 'pequeño detalle, gran acierto', 'imposible perderlas de vista'], v: ['que no vuelvas a confundir tus llaves', 'regalar sin fallar'], ex: ['🔑', '🎁', '💫'] },
  { k: /l[aá]mpara|luz|led/, sitio: 'mesilla', b: ['la luz justa para bajar revoluciones', 'tu rincón favorito, ahora con ambiente', 'enciéndela y cambia la habitación'], v: ['crear ese ambiente que estabas buscando', 'que apagar la luz grande sea un placer'], ex: ['💡', '✨', '🌙'] },
  { k: /figura|mu[nñ]eco|personaje|estatua|busto|anime/, sitio: 'estantería', b: ['la pieza que le faltaba a tu colección', 'detalle a detalle, pura personalidad', 'se lleva todas las miradas'], v: ['presidir tu estantería', 'completar la colección'], ex: ['🎨', '⭐', '🔥'] },
  { k: /soporte|base|stand|porta/, sitio: 'escritorio', b: ['todo en su sitio, por fin', 'orden a la vista y manos libres', 'adiós a buscarlo por toda la mesa'], v: ['poner orden sin esfuerzo', 'tenerlo siempre a mano'], ex: ['📱', '✅', '🖥️'] },
  { k: /organizador|caja|cajita|bandeja|joyero/, sitio: 'escritorio', b: ['cada cosa en su sitio y a la vista', 'el caos tiene los días contados', 'guardar nunca quedó tan bonito'], v: ['domar el desorden', 'guardar tus pequeños tesoros'], ex: ['📦', '💍', '🗂️'] },
  { k: /pendiente|collar|pulsera|anillo|joya/, sitio: 'look', b: ['ligeros, cómodos y con mucho que decir', 'el toque que remata cualquier look', 'te los vas a poner más de lo que crees'], v: ['rematar tu look', 'regalar y acertar'], ex: ['💖', '✨', '💎'] },
  { k: /im[aá]n|nevera/, sitio: 'nevera', b: ['tu nevera merecía esta alegría', 'pequeño, simpático y pegadizo', 'la lista de la compra con mejor compañía'], v: ['alegrarte cada visita a la nevera', 'sujetar notas con gracia'], ex: ['🧲', '😊', '🍀'] },
  { k: /vela|portavela/, sitio: 'salón', b: ['enciende y desconecta', 'decora incluso apagada', 'ambiente de domingo cualquier día'], v: ['montarte tu momento de calma', 'vestir el salón sin esfuerzo'], ex: ['🕯️', '🤍', '🌙'] },
  { k: /jarr[oó]n|florero/, sitio: 'salón', b: ['tus flores, con el marco que merecen', 'queda bien hasta vacío', 'moderno y fácil de combinar'], v: ['lucir tus flores', 'dar ese toque al salón'], ex: ['💐', '🌸', '🏺'] },
  { k: /cartel|letrero|nombre|personaliz|inicial/, sitio: 'pared', b: ['con tu nombre, tu frase o lo que tú digas', 'único, porque lo eliges tú', 'no hay dos iguales'], v: ['decirlo a tu manera', 'regalar algo que nadie más tiene'], ex: ['✏️', '🎁', '💬'] },
  { k: /gat|perr|mascot/, sitio: 'casa', b: ['para quien adora a su peludo', 'ternura garantizada', 'un guiño a tu compañero de sofá'], v: ['presumir de peludo', 'regalar a quien vive por su mascota'], ex: ['🐾', '😻', '🐶'] },
  { k: /coraz|amor|pareja|valent/, sitio: 'mesilla', b: ['dice «te quiero» sin decir nada', 'un detalle que se guarda', 'para alguien que te importa de verdad'], v: ['sacar una sonrisa', 'acertar sin complicarte'], ex: ['💘', '❤️', '🥰'] },
  { k: /.*/, sitio: 'casa', b: ['un detalle con el que aciertas seguro', 'bonito, práctico y con carácter', 'de esas cosas que se usan a diario'], v: ['darte un capricho con sentido', 'regalar sin fallar'], ex: ['✨', '🎁', '💫'] }
];
// {P} Producto · {p} producto · {C} « en rosa» · {B} lo que consigue · {V} para + infinitivo · {S} sitio · {a} a/o · {E} esta/este · {L} la/lo · {M} medidas
const TONOS = [
  { k: 'picaro', ini: ['😏 Avisamos: est{E} {p}{C} engancha. {B+}.', 'Dicen que la felicidad no se compra… est{E} {p}{C} no opina lo mismo 😉', '{P}{C}: {L} ves, {L} quieres. Así de fácil 😏', 'Tu {S} lleva tiempo pidiendo algo así 👀 {P}{C}.', 'No es amor a primera vista… bueno, sí 😌 {P}{C}.'],
    fin: ['Luego no digas que no te avisamos 🔥', 'Y sí, te van a preguntar de dónde {L} has sacado 😌', 'Capricho más que justificado ✅', 'Quien {L} prueba, repite 😉'] },
  { k: 'elegante', ini: ['{P}{C}. Líneas limpias y ese detalle que lo cambia todo ✨', 'Hay piezas que no necesitan presentación. {P}{C} es una de ellas 🤍', '{P}{C}: {B}, con el acabado cuidado que merece tu {S}.', 'Discret{a}, bien hech{a} y con presencia: {p}{C} ✨'],
    fin: ['Menos es más, y esto es justo lo necesario 🤍', 'Un detalle que se nota sin hacer ruido ✨', 'Para quien cuida los detalles.', 'Elegancia de la que se usa a diario 🖤'] },
  { k: 'divertido', ini: ['¡Alerta de flechazo! 💘 {P}{C} llega para {V}.', '{P}{C}: con más personalidad que tu grupo de WhatsApp 😂', 'Si tu {S} hablara, pediría est{E} {p}{C} a gritos 🙌', '¡Ojo! {P}{C} a la vista: {B} 😄'],
    fin: ['¡Se va a casa contigo! 🎉', 'Sonrisa garantizada 😄', 'Aviso: puede provocar envidia sana 😎', 'Ideal para regalar… o para quedártel{a}, no juzgamos 🤭'] },
  { k: 'pro', ini: ['{P}{C}{M}. {B+}. Acabado limpio y revisad{a} un{a} a un{a} ✅', '{P}{C}{M}: {B}. Liger{a}, resistente y list{a} para usar 📦', '{P}{C}. {B+}, con material duradero y un acabado cuidado 👌'],
    fin: ['Envío bien protegido y con seguimiento 🚚', 'Disponible en más colores: pregúntanos 🎨', 'Hecho por encargo, con atención a cada detalle.', 'Te respondemos rápido a cualquier duda 💬'] }
];
// ---------- La foto: color y acabado (se mira aquí mismo, sin enviarla a ningún sitio) ----------
const COLORES = [['blanco', [240, 240, 240]], ['negro', [25, 25, 25]], ['gris', [130, 130, 130]], ['rojo', [200, 40, 40]], ['naranja', [235, 130, 40]], ['amarillo', [235, 210, 60]], ['verde', [60, 160, 80]], ['azul', [50, 100, 200]],
  ['celeste', [130, 190, 235]], ['morado', [130, 70, 170]], ['rosa', [240, 150, 190]], ['marrón', [130, 85, 50]], ['beige', [215, 195, 160]], ['dorado', [200, 165, 70]]];
export async function analizarFoto(file) {
  try {
    const bm = await createImageBitmap(file), c = document.createElement('canvas'), n = 64; c.width = n; c.height = n;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bm, 0, 0, n, n); const d = g.getImageData(0, 0, n, n).data;
    // el borde suele ser el fondo: se descuenta
    const fondo = [0, 0, 0]; let nf = 0;
    for (let i = 0; i < n; i++) for (const [x, y] of [[i, 0], [i, n - 1], [0, i], [n - 1, i]]) { const p = (y * n + x) * 4; fondo[0] += d[p]; fondo[1] += d[p + 1]; fondo[2] += d[p + 2]; nf++; }
    fondo.forEach((v, i) => { fondo[i] = v / nf; });
    const votos = {};
    for (let y = 8; y < n - 8; y++) for (let x = 8; x < n - 8; x++) {
      const p = (y * n + x) * 4, px = [d[p], d[p + 1], d[p + 2]];
      if (Math.hypot(px[0] - fondo[0], px[1] - fondo[1], px[2] - fondo[2]) < 40) continue;
      let best = null, bd = 1e9; COLORES.forEach(([nm, c0]) => { const dd = Math.hypot(px[0] - c0[0], px[1] - c0[1], px[2] - c0[2]); if (dd < bd) { bd = dd; best = nm; } });
      votos[best] = (votos[best] || 0) + 1;
    }
    const orden = Object.entries(votos).sort((a, b) => b[1] - a[1]), tot = orden.reduce((a, x) => a + x[1], 0);
    return { color: orden[0] ? orden[0][0] : '', colores: orden.filter(x => x[1] / (tot || 1) > 0.18).map(x => x[0]).slice(0, 2) };
  } catch (e) { return { color: '', colores: [] }; }
}
const femenino = t => /a$|ión$|dad$|ez$/i.test(String(t).trim().split(/\s+/)[0] || '') && !/^(llavero|soporte|im[aá]n|organizador|jarr[oó]n|cartel|letrero|joyero|portavela|florero|busto|personaje|mu[nñ]eco)/i.test(String(t).trim());
// Genera n descripciones distintas y cortas, cada una en un tono (pícaro · elegante · divertido · profesional).
// info: { color, colores (de la foto), medidas (texto «Ancho 12 cm · …»), personalizable }
export function generar(texto, info = {}, n = 3, semilla) {
  const t = String(texto || '').trim(); if (!t) return [];
  const tn = CL.norm(t), tipo = TIPOS.find(x => x.k.test(tn)), fem = femenino(t);
  const col = (info.colores || []).length > 1 ? ' en ' + info.colores.join(' y ') : info.color && !tn.includes(CL.norm(info.color)) ? ' en ' + String(info.color).toLowerCase() : '';
  const P = t.charAt(0).toUpperCase() + t.slice(1), p = t.charAt(0).toLowerCase() + t.slice(1);
  const med = info.medidas ? ' (' + String(info.medidas).replace(/ · /g, ', ').toLowerCase() + ')' : '';
  const r = rnd(semilla || Date.now()), out = [], vistos = new Set(), may = x => x.charAt(0).toUpperCase() + x.slice(1);
  const desde = Math.floor(r() * TONOS.length);
  for (let i = 0; i < 60 && out.length < n; i++) {
    const tono = TONOS[(desde + i) % TONOS.length], b = pick(tipo.b, r), v = pick(tipo.v, r);
    const pon = x => x.replace(/\{P\}/g, P).replace(/\{p\}/g, p).replace(/\{C\}/g, col).replace(/\{M\}/g, med).replace(/\{B\+\}/g, may(b)).replace(/\{B\}/g, b).replace(/\{V\}/g, v).replace(/\{S\}/g, tipo.sitio)
      .replace(/\{a\}/g, fem ? 'a' : 'o').replace(/\{E\}/g, fem ? 'a' : 'e').replace(/\{L\}/g, fem ? 'la' : 'lo');
    let txt = pon(pick(tono.ini, r)) + ' ' + pon(pick(tono.fin, r));
    if (!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(txt.slice(-4))) txt += ' ' + pick(tipo.ex, r);
    if (info.personalizable && tono.k !== 'pro' && txt.length < 190 && !/tu nombre/.test(txt)) txt += ' · ✏️ con tu nombre o tu texto';
    txt = txt.replace(/\s+/g, ' ').trim();
    const clave = tono.k + '|' + txt.slice(0, 40);
    if (txt.length > 250 || vistos.has(clave)) continue;
    vistos.add(clave); out.push(txt);
  }
  return out;
}
// IA del PC (si está): mira la foto y la redacta en 2 frases
async function conIA(texto, file, extra) {
  const E = await import('./ai/engine.js');
  let prompt = 'Escribe UNA descripción de venta en español de España para: ' + texto + '. Máximo 3 frases cortas, con 2 o 3 emojis, sin listas y sin hashtags. '
    + 'Tono con chispa: mezcla picardía, elegancia y humor, pero que suene a persona real y profesional. Habla del artículo (qué es, cómo queda, para quién) y despierta las ganas de tenerlo. '
    + 'NO digas que está impreso en 3D ni hables de impresión, filamento o capas: el cliente ya lo sabe. No uses frases hechas como «increíble» o «no te lo pierdas».'
    + (extra ? ' Datos reales que puedes usar: ' + extra + '.' : '');
  if (file) {
    try {
      const D = await import('./desktop.js'), st = D.desktop.on ? await D.desktop.iaEstado().catch(() => null) : null;
      const vis = st && (st.modelos || []).find(m => /qwen2\.5vl|llava|gemma3|minicpm-v|llama3\.2-vision/i.test(m.nombre));
      if (vis) {
        const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(file); });
        let out = ''; await D.desktop.iaChat({ model: vis.nombre, stream: true, options: { temperature: 0.7 }, messages: [{ role: 'user', content: prompt + ' Mira la foto y describe lo que se ve de verdad: su forma, su color y qué transmite.', images: [b64] }] }, ch => { const c = ch.message && ch.message.content; if (c) out += c; });
        if (out.trim()) return out.trim();
      }
    } catch (e) { }
  }
  return (await E.write(prompt)).trim();
}
// ---------- Ventana ----------
// opts: { texto, foto (File), producto (para «Guardar en el producto») }
export function rapida(opts = {}) {
  let foto = opts.foto || null, info = {}, semilla = Date.now();
  // v16: si se abre desde un producto, ya sabe su color, sus medidas y si es personalizable, y usa SU foto
  const prod0 = opts.producto || null;
  const deProd = pr => pr ? { color: pr.color ? String(pr.color).toLowerCase() : '', medidas: Number(pr.dimX) > 0 ? ['Ancho', 'Largo', 'Alto'].map((n, i) => n + ' ' + String(Math.round(Number(pr[['dimX', 'dimY', 'dimZ'][i]])) / 10).replace('.', ',') + ' cm').join(' · ') : '', personalizable: /personaliz|nombre|inicial/i.test([pr.nombre, pr.descripcion, pr.subcategoria].join(' ')) } : {};
  const fotoDe = async pr => { try { const a = pr && pr.fotoId ? byId('archivos', pr.fotoId) : null; if (!a || !a.miniatura) return null; const b = await (await fetch(a.miniatura)).blob(); return new File([b], a.nombre || 'foto.jpg', { type: b.type || 'image/jpeg' }); } catch (e) { return null; } };
  const q = inp({ value: opts.texto || '', placeholder: 'Ej.: maceta luna blanca · llavero de gato · lámpara de luna', 'aria-label': '¿Qué vas a vender?', maxlength: 80 });
  const fotoIn = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: async () => { const f = fotoIn.files[0]; fotoIn.value = ''; if (f) { foto = f; await verFoto(); otra(); } } });
  const mini = h('div.dq-foto'), lista = h('div.dq-lista'), estado = h('div.tiny.muted');
  const prods = (S.t.productos || []).slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  const destino = !opts.onUsar && can('productos.editar') && prods.length ? sel([{ v: '', t: '— Elegir producto —' }].concat(prods.map(p => ({ v: p.id, t: p.nombre }))), opts.producto ? opts.producto.id : '', { 'aria-label': 'Producto' }) : null;
  const prodSel = () => (destino && destino.value ? byId('productos', destino.value) : null) || prod0;
  async function verFoto() {
    if (!foto) { foto = await fotoDe(prodSel()); }
    if (!foto) { info = deProd(prodSel()); return mount(mini, btn('📷 Añadir foto (opcional)', () => fotoIn.click(), { cls: 'sm ghost' }), info.medidas ? h('span.tiny.muted', '📐 ' + info.medidas) : null); }
    const u = URL.createObjectURL(foto); info = Object.assign({}, deProd(prodSel()), await analizarFoto(foto)); if (!info.colores.length && deProd(prodSel()).color) info.color = deProd(prodSel()).color;
    mount(mini, h('img', { src: u, alt: '' }), h('div.tiny', (info.colores.length ? '🎨 Veo: ' + info.colores.join(' y ') : 'Foto lista') + (info.medidas ? ' · 📐 ' + info.medidas : '')), btn('Cambiar', () => fotoIn.click(), { cls: 'sm ghost' }));
  }
  const tarjeta = txt => h('div.dq-op', h('p', txt), h('div.row.wrap', { style: { gap: '6px' } }, btn('Copiar', () => { copyText(txt); toast('Copiada', 'ok'); }, { cls: 'sm', icon: 'copy' }),
    opts.onUsar ? btn('Usar esta', () => { opts.onUsar(txt); toast('Puesta en la descripción', 'ok'); }, { cls: 'sm primary' }) : null,
    destino ? btn('Guardar en el producto', async () => {
      if (!destino.value) return toast('Elige el producto', 'warn');
      const p = byId('productos', destino.value);
      try { const r = await mutate('productos.guardar', { id: p.id, datos: { descripcion: txt } }, { label: 'Descripción de ' + p.nombre, tables: ['productos'], optimistic: t => { const x = t.productos.find(y => y.id === p.id); if (x) x.descripcion = txt; } }); if (r && r.id) upsertLocal('productos', r); emit(); toast('✅ Descripción guardada en «' + p.nombre + '»', 'ok'); opts.onSave && opts.onSave(txt); }
      catch (e) { toast(e.message, 'bad'); }
    }, { cls: 'sm primary' }) : null));
  function otra() { if (!q.value.trim()) return mount(lista, h('p.small.muted', 'Escribe qué vas a vender.')); semilla += 7919; mount(lista, generar(q.value, info, 3, semilla).map(tarjeta)); }
  q.addEventListener('keydown', e => { if (e.key === 'Enter') otra(); });
  const body = h('div.col.dq', { style: { gap: '10px' } },
    h('label.dq-q', h('b', '¿Qué vas a vender?'), q), h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, mini, fotoIn),
    h('div.row.wrap', { style: { gap: '6px' } }, btn('✨ Crear descripción', otra, { cls: 'primary' }), btn('🔁 Otras', otra, { cls: 'ghost' }),
      btn('🤖 Con IA', async ev => { const b = ev.currentTarget; if (!q.value.trim()) return toast('Escribe qué vas a vender', 'warn'); b.disabled = true; estado.textContent = 'La IA está mirando' + (foto ? ' la foto' : '') + '…';
        try { const t = await conIA(q.value.trim(), foto, [info.colores && info.colores.length ? 'color ' + info.colores.join(' y ') : info.color ? 'color ' + info.color : '', info.medidas || '', info.personalizable ? 'se puede personalizar' : ''].filter(Boolean).join('; ')); mount(lista, tarjeta(t.replace(/^["«]|["»]$/g, '')), generar(q.value, info, 2, semilla + 1).map(tarjeta)); estado.textContent = ''; }
        catch (e) { estado.textContent = '🤖 ' + e.message + ' Mientras, tienes las de la biblioteca.'; otra(); } b.disabled = false; }, { cls: 'ghost', title: 'Usa la IA del PC (y la foto, si tiene el modelo que ve imágenes)' })),
    destino ? h('label.row', { style: { gap: '6px', alignItems: 'center' } }, h('span.small', 'Guardar en:'), destino) : null, estado, lista);
  verFoto().then(() => { if (q.value.trim()) otra(); });
  return modal('✨ Descripción rápida', body, close => [btn('Cerrar', close)], { size: 'narrow' });
}
