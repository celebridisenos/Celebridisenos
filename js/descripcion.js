// ================= v13.10 · ✨ DESCRIPCIÓN RÁPIDA =================
// Una sola pregunta: «¿Qué vas a vender?» (+ la foto, si quieres). Sale una descripción CORTA (2 frases como mucho) de una
// biblioteca de frases, distinta cada vez. Con la foto se detecta el color y el acabado. Si la IA del PC está disponible
// (con el modelo que ve imágenes), «✨ Con IA» mira la foto y la redacta; si no, se usa la biblioteca. Nunca textos largos.
import { h, mount, btn, modal, toast, inp, copyText, sel } from './ui.js';
import { S, can, mutate, byId, upsertLocal, emit } from './store.js';

const CL = window.CL;
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// ---------- Biblioteca: qué es y para qué sirve (por palabras) ----------
const TIPOS = [
  { k: /maceta|macetero|planta|suculent|cactus/, uso: ['para tus suculentas y plantas pequeñas', 'da vida a cualquier rincón', 'ideal para la mesa, la estantería o la ventana'], ex: ['🌿', '🪴'] },
  { k: /llavero/, uso: ['para llevar siempre contigo', 'un detalle perfecto para regalar', 'ligero y resistente para el día a día'], ex: ['🔑', '🎁'] },
  { k: /l[aá]mpara|luz|led/, uso: ['crea un ambiente cálido', 'perfecta para la mesilla o el escritorio', 'con una luz suave y acogedora'], ex: ['💡', '✨'] },
  { k: /figura|mu[nñ]eco|personaje|estatua|busto/, uso: ['para tu colección', 'un detalle original para tu estantería', 'con mucho detalle y personalidad'], ex: ['🎨', '⭐'] },
  { k: /soporte|base|stand|porta/, uso: ['mantiene todo en su sitio', 'práctico y estable', 'para tener tu mesa siempre ordenada'], ex: ['📱', '✅'] },
  { k: /organizador|caja|cajita|bandeja|joyero/, uso: ['para tener todo ordenado', 'perfecto para guardar tus pequeños tesoros', 'práctico y bonito a la vez'], ex: ['📦', '💍'] },
  { k: /pendiente|collar|pulsera|anillo|joya/, uso: ['ligeros y cómodos de llevar', 'para darle un toque único a tu look', 'un regalo que enamora'], ex: ['💖', '✨'] },
  { k: /im[aá]n|nevera/, uso: ['para alegrar tu nevera', 'un detalle divertido para casa', 'pequeño, simpático y resistente'], ex: ['🧲', '😊'] },
  { k: /vela|portavela/, uso: ['para crear un ambiente acogedor', 'decora incluso apagada', 'perfecto para el salón o el baño'], ex: ['🕯️', '🤍'] },
  { k: /jarr[oó]n|florero/, uso: ['para tus flores secas o naturales', 'decora con estilo', 'moderno y fácil de combinar'], ex: ['💐', '🌸'] },
  { k: /cartel|letrero|nombre|personaliz/, uso: ['hecho a tu medida', 'con el nombre o el texto que quieras', 'un regalo único y personal'], ex: ['✏️', '🎁'] },
  { k: /.*/, uso: ['un detalle original para casa', 'perfecto para regalar', 'práctico, bonito y duradero'], ex: ['✨', '🎁'] }
];
const INICIO = ['{P}{C}, diseñad{a} e impres{a} en 3D en nuestro taller.', '{P}{C} hech{a} a mano con impresión 3D.', 'Nuestr{a} {p}{C}, impres{a} en 3D con mimo.', '{P}{C} con un diseño original, impres{a} en 3D.', '¡{P}{C}, impres{a} en 3D, liger{a} y resistente!'];
const FINAL = ['{U}.', '{U}: te va a encantar.', '{U}, de verdad.'];
const EXTRA = ['Cada pieza es única.', 'Hecho en España.', 'Te lo enviamos bien protegido.', 'Disponible en más colores.', ''];
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
// Genera n descripciones distintas (cortas)
export function generar(texto, info = {}, n = 3, semilla) {
  const t = String(texto || '').trim(); if (!t) return [];
  const tn = CL.norm(t), tipo = TIPOS.find(x => x.k.test(tn)), fem = femenino(t), a = fem ? 'a' : 'o';
  const col = (info.colores || []).length > 1 ? ' en ' + info.colores.join(' y ') : info.color && !tn.includes(CL.norm(info.color)) ? ' en ' + info.color : '';
  const P = t.charAt(0).toUpperCase() + t.slice(1), p = t.charAt(0).toLowerCase() + t.slice(1);
  const r = rnd(semilla || Date.now()), out = new Set();
  for (let i = 0; i < 40 && out.size < n; i++) {
    const u = pick(tipo.uso, r), f1 = pick(INICIO, r).replace(/\{P\}/g, P).replace(/\{p\}/g, p).replace(/\{C\}/g, col).replace(/\{a\}/g, a);
    const f2 = pick(FINAL, r).replace(/\{U\}/g, u.charAt(0).toUpperCase() + u.slice(1)).replace(/\{u\}/g, u).replace(/\{a\}/g, a), x = pick(EXTRA, r);
    // como mucho 2 frases: la tercera (extra) solo si las dos primeras son muy cortas
    out.add([f1, f2, (f1 + f2).length < 70 ? x : ''].filter(Boolean).join(' ') + ' ' + pick(tipo.ex, r));
  }
  return [...out];
}
// IA del PC (si está): mira la foto y la redacta en 2 frases
async function conIA(texto, file) {
  const E = await import('./ai/engine.js');
  let prompt = 'Escribe UNA descripción de venta muy corta (máximo 2 frases, sin listas, sin hashtags, en español de España, cercana) para: ' + texto + '. Es una pieza impresa en 3D por un pequeño taller.';
  if (file) {
    try {
      const D = await import('./desktop.js'), st = D.desktop.on ? await D.desktop.iaEstado().catch(() => null) : null;
      const vis = st && (st.modelos || []).find(m => /qwen2\.5vl|llava|gemma3|minicpm-v|llama3\.2-vision/i.test(m.nombre));
      if (vis) {
        const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(file); });
        let out = ''; await D.desktop.iaChat({ model: vis.nombre, stream: true, options: { temperature: 0.7 }, messages: [{ role: 'user', content: prompt + ' Mira la foto: di su color y forma reales.', images: [b64] }] }, ch => { const c = ch.message && ch.message.content; if (c) out += c; });
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
  const q = inp({ value: opts.texto || '', placeholder: 'Ej.: maceta luna blanca · llavero de gato · lámpara de luna', 'aria-label': '¿Qué vas a vender?', maxlength: 80 });
  const fotoIn = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: async () => { const f = fotoIn.files[0]; fotoIn.value = ''; if (f) { foto = f; await verFoto(); otra(); } } });
  const mini = h('div.dq-foto'), lista = h('div.dq-lista'), estado = h('div.tiny.muted');
  const prods = (S.t.productos || []).slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  const destino = !opts.onUsar && can('productos.editar') && prods.length ? sel([{ v: '', t: '— Elegir producto —' }].concat(prods.map(p => ({ v: p.id, t: p.nombre }))), opts.producto ? opts.producto.id : '', { 'aria-label': 'Producto' }) : null;
  async function verFoto() {
    if (!foto) return mount(mini, btn('📷 Añadir foto (opcional)', () => fotoIn.click(), { cls: 'sm ghost' }));
    const u = URL.createObjectURL(foto); info = await analizarFoto(foto);
    mount(mini, h('img', { src: u, alt: '' }), h('div.tiny', info.colores.length ? '🎨 Veo: ' + info.colores.join(' y ') : 'Foto lista'), btn('Cambiar', () => fotoIn.click(), { cls: 'sm ghost' }));
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
        try { const t = await conIA(q.value.trim(), foto); mount(lista, tarjeta(t.replace(/^["«]|["»]$/g, '')), generar(q.value, info, 2, semilla + 1).map(tarjeta)); estado.textContent = ''; }
        catch (e) { estado.textContent = '🤖 ' + e.message + ' Mientras, tienes las de la biblioteca.'; otra(); } b.disabled = false; }, { cls: 'ghost', title: 'Usa la IA del PC (y la foto, si tiene el modelo que ve imágenes)' })),
    destino ? h('label.row', { style: { gap: '6px', alignItems: 'center' } }, h('span.small', 'Guardar en:'), destino) : null, estado, lista);
  verFoto().then(() => { if (q.value.trim()) otra(); });
  return modal('✨ Descripción rápida', body, close => [btn('Cerrar', close)], { size: 'narrow' });
}
