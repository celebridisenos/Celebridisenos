// ================= v20 · 🪄 CelebriR8 · FOTO → 3D =================
// «Si puedes añadir un motor de IA de generación de foto a STL, inclúyelo dentro del programa» (la dueña, 9-10-2026).
// Tres caminos, todos en este aparato (la foto no sale a ningún sitio):
//  · 🪄 RELIEVE CON IA: la IA de profundidad (Depth Anything V2, en el PC) saca qué está cerca y qué lejos, y eso se
//    convierte en relieve: una placa con la foto en 3D, o la FIGURA recortada (tu perro, una cara, un coche de juguete).
//    Es un relieve (como una medalla), no una figura redonda de 360°: eso se dice claro en la pantalla.
//  · 💡 LITOFANÍA: la foto aparece al ponerle luz detrás (plana, curva, lámpara cilíndrica o corazón). Sin IA.
//  · 🎈 INFLADA: la silueta de la foto, inflada como un globo (llaveros y figuritas blanditas).
import { h, mount, btn, toast, confirmDlg } from '../ui.js';
import * as N from '../r8/nucleo.js';
import { crearEscena, COLORES } from '../r8/escena3d.js';
import * as HF from '../r8/hfclave.js'; // v20.1

const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const F = { modo: 'figura3d', img: null, nombre: '', prof: null, mascara: null, v: { relieve: { forma: 'placa', ancho: 100, alto: 6, base: 2, marco: 3, suave: 1, invertir: false }, lito: { forma: 'plana', ancho: 100, min: 0.8, max: 3, marco: 3, radio: 4 }, inflada: { ancho: 70, alto: 10, base: 1.2, doble: false }, figura3d: { motor: 'auto', alto: 100, resolucion: '256', detalle: 'normal', peana: true, recortar: true } }, res: {} };

export async function montarFoto(el, ext = {}) {
  await N.cargar();
  const d = await import('../desktop.js').catch(() => null), pc = !!(d && d.desktop && d.desktop.on);
  const lienzo = h('canvas.r8f-cv', { 'aria-label': 'La pieza en 3D' }), info = h('div.r8c-info'), aviso = h('div.r8f-aviso'), campos = h('div.r8f-campos'), foto = h('div.r8f-foto');
  const fi = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) cargaFoto(f); } });
  const modos = h('div.r8f-modos');
  const raiz = h('div.r8f', fi, h('div.r8f-izq', h('div.r8f-intro', h('b', '🪄 De una foto a una pieza'), h('small', 'Elige qué quieres hacer, sube una foto y mueve las medidas.')), modos, foto, campos, aviso,
    h('div.r8e-btns', btn('🖨️ Preparar para la Bambu', () => imprimir(), { cls: 'primary r8f-imprimir' }), btn('🧰 Al Estudio', () => alEstudio(), { cls: 'r8f-estudio' }))), h('div.r8f-vista', lienzo, info));
  el.appendChild(raiz);
  let escena = null, MESA = null; try { escena = crearEscena(lienzo, { cama: 256, dia: document.documentElement.getAttribute('data-modo') === 'dia' }); escena.encuadrar('iso'); MESA = mesa(escena, lienzo, { cama: 256 }); } catch (e) { mount(info, '⚠️ ' + e.message); }
  let tic = 0, ultima = null, vivo = true;
  const MOD = [['figura3d', '🧸 Figura 3D completa (IA top)', 'Por todos los lados, para imprimirla de pie'], ['relieve', '🪄 Relieve con IA', 'La foto en 3D (o la figura recortada)'], ['lito', '💡 Litofanía', 'Aparece al ponerle luz detrás'], ['inflada', '🎈 Figura inflada', 'La silueta, blandita como un globo']];
  function pintaModos() { mount(modos, MOD.map(([k, t, dd]) => h('button.r8f-modo' + (F.modo === k ? '.on' : ''), { type: 'button', 'data-modo': k, onclick: () => { F.modo = k; pintaModos(); pintaCampos(); genera(true); } }, h('b', t), h('small', dd)))); }
  function pintaFoto() { mount(foto, F.img ? h('div.r8f-mini', h('img', { src: F.img.src, alt: '' }), h('div', h('b', F.nombre || 'Tu foto'), h('small', F.img.naturalWidth + ' × ' + F.img.naturalHeight + ' px'), btn('Cambiar la foto', () => fi.click(), { cls: 'sm' }))) : h('button.r8b-op.r8f-subir', { type: 'button', onclick: () => fi.click() }, h('b', '📷 Sube una foto'), h('small', 'Una mascota, una cara, un dibujo, un paisaje…'))); }
  const n = (o, k, t, min, max, paso, u) => { const r = h('input', { type: 'range', min, max, step: paso, value: o[k] }), i = h('input.inp', { type: 'number', min, max, step: paso, value: o[k], 'data-k': k }); const pon = (x, de) => { let y = Number(String(x).replace(',', '.')); if (!isFinite(y)) return; y = Math.max(min, Math.min(max, y)); o[k] = y; if (de !== r) r.value = y; if (de !== i) i.value = y; genera(); }; r.oninput = () => pon(r.value, r); i.oninput = () => pon(i.value, i); return h('label.r8e-c.r8e-num', h('span', t), r, h('span.r8e-n', i, h('i', u))); };
  const s = (o, k, t, ops) => h('label.r8e-c.col', h('span', t), h('select.inp', { 'data-k': k, onchange: e => { o[k] = e.target.value; pintaCampos(); genera(true); } }, ops.map(([a, b]) => h('option', { value: a, selected: o[k] === a }, b))));
  const c = (o, k, t) => h('label.check.r8e-c', h('input', { type: 'checkbox', checked: !!o[k], onchange: e => { o[k] = e.target.checked; genera(); } }), t);
  function pintaCampos() {
    const o = F.v[F.modo];
    if (F.modo === 'relieve') mount(campos, s(o, 'forma', 'Qué hago', [['placa', '🖼️ Placa con la foto en relieve'], ['figura', '✂️ La figura recortada (sin fondo)']]), n(o, 'ancho', 'Ancho', 20, 250, 1, 'mm'), n(o, 'alto', 'Cuánto relieve', 0.5, 30, 0.5, 'mm'), n(o, 'base', 'Base', 0.6, 10, 0.2, 'mm'), o.forma === 'placa' ? n(o, 'marco', 'Marco', 0, 15, 0.5, 'mm') : null, n(o, 'suave', 'Suavizar', 0, 4, 1, ''), c(o, 'invertir', 'Al revés (hundido, como un molde)'),
      h('small.muted', pc ? 'La IA de profundidad (Depth Anything V2) funciona en tu PC, sin internet. Es un RELIEVE (como una medalla), no una figura redonda por todos lados.' : '⚠️ La IA de fotos está en el programa del PC. Desde aquí puedes hacer la litofanía y la figura inflada.'));
    if (F.modo === 'figura3d') {
      const L = listaMotores(), ok = L.filter(m => m.listo);
      mount(campos, h('div.f3-motores', h('b', 'Motor de IA'), L.map(m => h('button.f3-motor' + (o.motor === m.id ? '.on' : '') + (m.listo ? '' : '.no'), { type: 'button', 'data-motor': m.id, onclick: () => { o.motor = m.id; pintaCampos(); } },
          h('span', m.e), h('div', h('b', m.nombre), h('small', m.donde + ' · ' + m.coste)), h('i', m.listo ? '✓' : m.falta)))),
        avisoTarjeta(o.motor),
        n(o, 'alto', 'Alto de la figura', 20, 250, 1, 'mm'), o.motor === 'triposg' ? s(o, 'detalle', 'Detalle', [['rapido', 'Rápido (malla de 256)'], ['normal', 'Normal (malla de 512, recomendado)'], ['fino', 'Fino (más preguntas a la IA, tarda más)']]) : esLocal(o.motor) ? s(o, 'resolucion', 'Detalle', [['256', 'Normal (más rápido)'], ['320', 'Alto (pelo, dedos)'], ['384', 'Máximo (tarda más)']]) : null, c(o, 'peana', 'Con peana redonda (para que se tenga de pie)'), esLocal(o.motor) ? c(o, 'recortar', 'Quitar el fondo de la foto antes') : null,
        h('div.r8e-btns', btn('✨ Generar modelo 3D', () => generaFigura(), { cls: 'primary r8f-generar', disabled: !ok.length }), ok.filter(m => m.local).length > 1 ? btn('🧪 Compararlos todos (Smart Lab)', () => ext.irA && ext.irA('lab'), { cls: 'r8f-todos', title: 'El Smart Lab prueba los motores uno a uno y compara forma, superficie, espalda y si está lista para imprimir (no solo la silueta). Se lleva esta misma foto.' }) : null),
        h('small.muted', esLocal(o.motor) ? 'Se hace en TU PC con la tarjeta gráfica: la foto no sale de aquí.' : '☁️ Con este motor la foto se ENVÍA a sus servidores y gasta créditos de tu cuenta.'),
        h('small.muted', 'Mejor una foto del personaje entero, de frente y con fondo liso. Lo muy fino (pelo en punta, dedos) puede salir suavizado: se retoca en el Estudio.'),
        Object.keys(F.res || {}).length > 1 ? h('div.f3-comparar', h('b', '🔀 Comparar'), Object.entries(F.res).map(([k, r]) => btn((MOTORES[k] || {}).nombre || k, () => { F.fig3d = r.sopa; F.fig3dInfo = r.info; F.verMotor = k; F.stl = r.stl; F.insp = r.insp || null; F.revisada = false; F.lista = false; genera(true); pintaCampos(); if (!F.insp) comprueba(); }, { cls: 'sm' + (F.verMotor === k ? ' primary' : '') }))) : null,
        limites(o.motor), panelPro(), claves());
      return;
    }
    if (F.modo === 'lito') mount(campos, s(o, 'forma', 'Forma', [['plana', '▭ Plana (de pie)'], ['curva', '◠ Curva (de pie)'], ['cilindro', '🏮 Lámpara (cilindro)'], ['corazon', '♥ Corazón']]), n(o, 'ancho', o.forma === 'cilindro' ? 'Perímetro (lo que da la vuelta)' : 'Ancho', 40, 250, 1, 'mm'), n(o, 'min', 'Lo más fino (zonas claras)', 0.4, 2, 0.1, 'mm'), n(o, 'max', 'Lo más grueso (zonas oscuras)', 1.5, 6, 0.1, 'mm'), o.forma !== 'cilindro' ? n(o, 'marco', 'Marco', 0, 10, 0.5, 'mm') : null,
      h('small.muted', 'Imprímela en BLANCO, de pie, con relleno 100 % y capa de 0,12 mm. La foto se ve al ponerle una luz detrás (una vela LED en la lámpara).'));
    if (F.modo === 'inflada') mount(campos, n(o, 'ancho', 'Ancho', 15, 220, 1, 'mm'), n(o, 'alto', 'Lo gordo que sale', 2, 50, 0.5, 'mm'), n(o, 'base', 'Borde plano', 0, 6, 0.2, 'mm'), c(o, 'doble', 'Inflada por los dos lados'), h('small.muted', pc ? 'La silueta se saca quitando el fondo con la IA del PC.' : 'Mejor un dibujo negro sobre blanco o un PNG sin fondo.'));
  }
  async function cargaFoto(f) {
    const im = new Image(), u = URL.createObjectURL(f); im.onload = () => { F.img = im; F.nombre = f.name.replace(/\.[^.]+$/, ''); F.blob = f; import('../r8/estado.js').then(E => E.compartirFoto(f)).catch(() => { }); F.prof = null; F.mascara = null; F.fig3d = null; F.res = {}; pintaFoto(); genera(true); }; im.onerror = () => toast('No se pudo abrir esa imagen.', 'bad'); im.src = u;
  }
  // ---------- de la foto a una rejilla de alturas ----------
  const rejilla = (img, nxMax) => { const k = Math.min(1, nxMax / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)), W = Math.max(8, Math.round((img.naturalWidth || img.width) * k)), H = Math.max(8, Math.round((img.naturalHeight || img.height) * k)), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H); return { W, H, d: g.getImageData(0, 0, W, H).data }; };
  const imgDe = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const suaviza = (G, W, H, veces) => { for (let v = 0; v < veces; v++) { const o = new Float32Array(G.length); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let s2 = 0, nn = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < W && y < H) { s2 += G[y * W + x]; nn++; } } o[j * W + i] = s2 / nn; } G = o; } return G; };
  async function necesitaIA() {
    if (!pc) throw new Error('La IA de fotos está en el programa del PC del taller.');
    if (!F.prof) { mount(aviso, h('p.r8e-nota', '🪄 La IA está mirando la foto…')); const r = await d.desktop.motorProfundidad(F.blob); if (!r || !r.ok) { if (r && r.falta) mount(aviso, h('div.r8e-nota', '🧠 Falta el modelo de profundidad (99 MB, una sola vez). ', btn('Descargarlo', async () => { try { await d.desktop.motorDescargar ? d.desktop.motorDescargar('depth-v2s') : null; toast('Descargando… mira el progreso en Centro de IA → Motor de fotos', 'ok', 8000); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm primary' }))); throw new Error((r && r.error) || 'La IA no respondió.'); } F.prof = await imgDe(r.profundidad); }
    if ((F.modo === 'inflada' || F.v.relieve.forma === 'figura') && !F.mascara) { mount(aviso, h('p.r8e-nota', '✂️ Quitando el fondo…')); const r = await d.desktop.motorFondo(F.blob); if (!r || !r.ok) throw new Error((r && r.error) || 'No se pudo quitar el fondo.'); F.mascara = await imgDe(r.mascara); }
    mount(aviso);
  }
  function genera(ya) { clearTimeout(tic); tic = setTimeout(() => hazlo().catch(e => { mount(aviso, h('p.r8e-mal', '⚠️ ' + (e.message || e))); window.__r8f = { error: e.message }; }), ya ? 0 : 220); }
  // ---------- los cuatro motores de figura 3D ----------
  const MOTORES = { triposg: { e: '💎', nombre: 'TripoSG', donde: 'en tu PC', coste: 'gratis (MIT)', local: 1 }, sf3d: { e: '🏆', nombre: 'Stable Fast 3D', donde: 'en tu PC', coste: 'gratis (licencia Community)', local: 1 }, trellis2: { e: '🆓', nombre: 'TRELLIS.2', donde: 'nube GRATIS de Hugging Face', coste: '0 € · 1–2 al día' }, tripo: { e: '☁️', nombre: 'Tripo AI', donde: 'en la nube', coste: 'solo créditos de regalo' }, meshy: { e: '💳', nombre: 'Meshy AI', donde: 'en la nube', coste: 'DE PAGO (plan Pro), para más adelante' }, triposr: { e: '⚡', nombre: 'TripoSR', donde: 'en tu PC', coste: 'gratis (MIT)', local: 1 } };
  const esLocal = k => !!(MOTORES[k] || {}).local;
  let estLocal = {}, estNube = {}, tarj = null;
  // la tarjeta gráfica la comparten Bambu Studio, el navegador… medido en la torre: con todo abierto quedaban 2,2 GB de 6
  function avisoTarjeta(motor) {
    if (!tarj || !tarj.total_mb || !['triposg', 'sf3d'].includes(motor)) return null;
    const libre = tarj.libre_mb / 1024, total = tarj.total_mb / 1024;
    if (libre >= 3.4) return h('small.muted.f3-tarjeta', '🟢 Tarjeta ' + tarj.nombre.replace('NVIDIA GeForce ', '') + ': ' + n2(libre) + ' GB libres de ' + n2(total) + '.');
    return h('p.f3-ojo.f3-tarjeta', '⚠️ La tarjeta gráfica solo tiene ' + n2(libre) + ' GB libres de ' + n2(total) + ' (otros programas la están usando). ' + (motor === 'triposg' ? 'Funcionará igual (en modo 8 bits), pero cierra Bambu Studio y el navegador si puedes: irá más holgado.' : 'Cierra Bambu Studio y el navegador antes de empezar.'));
  }
  const refresca = () => Promise.all([pc && d.desktop.motor3dEstado ? d.desktop.motor3dEstado().then(r => { estLocal = Object.fromEntries((r.motores || []).map(m => [m.id, m.listo])); tarj = r.tarjeta || null; }).catch(() => { }) : null, pc && d.desktop.nube3dEstado ? d.desktop.nube3dEstado().then(r => { estNube = r || {}; }).catch(() => { }) : null]).then(() => { const o = F.v.figura3d; if (o.motor === 'auto' || !MOTORES[o.motor]) o.motor = (listaMotores().find(m => m.listo) || { id: 'triposr' }).id; if (F.modo === 'figura3d') pintaCampos(); });
  function listaMotores() { return ['triposg', 'trellis2', 'triposr', 'sf3d', 'tripo', 'meshy'].map(id => { const M = MOTORES[id], listo = M.local ? !!estLocal[id] : !!(estNube[id] && estNube[id].clave); const tr = estNube.trellis2 || {}; return Object.assign({ id, listo, falta: !pc ? 'solo en el PC' : M.local ? 'sin instalar' : id === 'trellis2' ? (tr.conector === false ? 'falta el conector' : 'falta entrar en Hugging Face') : 'falta tu clave' }, M); }); }
  refresca();
  // 🔑 las claves de Tripo y Meshy: se escriben aquí, el programa del PC las guarda CIFRADAS y nunca las vuelve a enseñar
  let clavesAbiertas = false; // v20.1: sigue abierto al repintar (al entrar o salir de Hugging Face)
  function claves() {
    if (!pc) return null;
    const fila = (k, url, ayuda) => { const i = h('input.inp', { type: 'password', autocomplete: 'off', placeholder: (estNube[k] && estNube[k].clave) ? '•••••• guardada (escribe otra para cambiarla)' : 'Pega aquí tu clave de ' + MOTORES[k].nombre, 'aria-label': 'Clave de ' + MOTORES[k].nombre });
      return h('div.f3-clave', h('b', MOTORES[k].nombre, (estNube[k] && estNube[k].clave) ? h('span.f3-ok', ' ✓ guardada') : null), h('small', ayuda, ' ', h('a', { href: url, target: '_blank', rel: 'noopener' }, 'Conseguir la clave')),
        h('div.row', i, btn('Guardar', async () => { if (!i.value.trim()) return; try { await d.desktop.nube3dClave(k, i.value.trim()); i.value = ''; toast('🔐 Clave de ' + MOTORES[k].nombre + ' guardada y cifrada en este PC', 'ok'); await refresca(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm primary' }),
          (estNube[k] && estNube[k].clave) ? btn('Quitar', async () => { await d.desktop.nube3dClave(k, ''); toast('Clave quitada', 'ok'); await refresca(); }, { cls: 'sm ghost' }) : null)); };
    const tr = estNube.trellis2 || {};
    return h('details.f3-claves', { open: clavesAbiertas, ontoggle: e => { clavesAbiertas = e.target.open; } }, h('summary', '🔑 Entrar en la nube gratis (Hugging Face) y claves'),
      h('div.f3-clave', h('b', '🆓 Hugging Face (para TRELLIS.2 y Stable Fast 3D)', tr.sesion ? h('span.f3-ok', ' ✓ sesión iniciada') : null),
        HF.cajaHF({ alCambiar: () => refresca() }), // v20.1: pega la clave y ya está
        h('details.more', h('summary.small', 'Otra forma: la ventana oficial de Hugging Face'),
          h('div.row', btn(tr.sesion ? 'Volver a entrar' : '🔓 Abrir la ventana oficial', async () => { try { await d.desktop.hfLogin(); toast('Se ha abierto la ventana de Hugging Face. Cuando termines, pulsa «Comprobar».', 'ok', 8000); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm ghost' }),
            btn('Comprobar', async () => { await refresca(); toast((estNube.trellis2 || {}).sesion ? '✓ Sesión de Hugging Face lista' : 'Todavía no veo la sesión de Hugging Face', (estNube.trellis2 || {}).sesion ? 'ok' : 'warn'); }, { cls: 'sm ghost' })))),
      h('p.small.muted', 'Hugging Face: gratis y sin tarjeta. Las claves de Tripo y Meshy se guardan CIFRADAS con tu usuario de Windows: no salen nunca en pantalla ni van al chat.'),
      fila('tripo', 'https://platform.tripo3d.ai/api-keys', 'Opcional. Cuenta gratis en Tripo → «API Keys». Gasta créditos (≈ 20 por figura): primero los de regalo; comprar más es cosa tuya, cuando quieras.'),
      fila('meshy', 'https://www.meshy.ai/settings/api', '💳 DE PAGO, para más adelante: la API de Meshy pide el plan Pro (≈ 20 $/mes). Cuando lo tengas, pega aquí su clave y funcionará.'));
  }
  // ---------- límites claros de cada motor ----------
  const LIM = {
    triposg: ['💻 En tu PC: 4–6 minutos en la torre (GTX 1660, medido); en el portátil (RTX 3060) irá más rápido', '🆓 Gratis (MIT: puedes vender lo que salga)', '🌐 Sin internet: la foto no sale de tu PC', '🏆 La forma más limpia de las que caben en tu tarjeta (persona: 94 % de parecido; TripoSR, 87 %)', '⚠️ Una sola foto: la espalda la imagina'],
    sf3d: ['💻 En tu PC (tarjeta gráfica, unos 6 GB)', '🆓 Gratis (licencia Community: hasta 1 M$ de facturación al año)', '🌐 Sin internet', '⚠️ Una sola foto: la espalda la imagina'],
    trellis2: ['☁️ En la nube GRATUITA de Hugging Face (necesita internet)', '🆓 0 €: 5 min de tarjeta al día con tu cuenta gratis (≈ 1–2 figuras). Sin tarjeta de pago', '📤 La foto sale de tu PC, pero ya SIN fondo (el fondo se quita aquí)', '🏆 TRELLIS.2 (Microsoft, MIT: puedes vender lo que salga), el modelo abierto más fuerte', '⚠️ Depende de que Microsoft mantenga su demo; si se acaba el tiempo de hoy, mañana más'],
    tripo: ['☁️ En sus servidores (necesita internet)', '🎁 Créditos (≈ 20 por figura): primero los de REGALO; comprar más, cuando tú quieras', '📜 Licencia de uso: compruébala en su web (su página no se deja leer automáticamente)', '📤 La foto sale de tu PC', '⚠️ Una sola foto: la espalda la imagina'],
    meshy: ['💳 DE PAGO, para más adelante: su API va en el plan Pro (≈ 20 $/mes, compruébalo en su web)', '📜 Licencia: con plan de pago los modelos son TUYOS (puedes venderlos); en el gratis, CC BY 4.0 (vender citando a Meshy)', '☁️ En sus servidores · 📤 la foto sale de tu PC', '⚠️ Una sola foto: la espalda la imagina'],
    triposr: ['💻 En tu PC (tarjeta gráfica, 2,5 GB)', '🆓 Gratis (MIT)', '🌐 Sin internet', '⚠️ Formas suaves: lo fino (pelo, dedos) sale redondeado']
  };
  const limites = k => LIM[k] ? h('div.f3-lim', LIM[k].map(t => h('small', t))) : null;
  // ---------- 🔍 COMPROBAR · 🛠️ REPARAR · ✅ LISTA ----------
  const OKS = { estanca: 'Cerrada (sin agujeros)', migas: 'Sin piezas sueltas', normales: 'Caras bien orientadas', finas: 'Sin paredes finas (≥ 0,8 mm)' };
  function panelPro() {
    if (!F.fig3d) return null;
    const I = F.insp, fila = (ok, t, d) => h('div.f3-chk' + (ok === null ? '.esp' : ok ? '.ok' : '.mal'), h('span', ok === null ? '⏳' : ok ? '✅' : '⚠️'), h('b', t), d ? h('small', d) : null);
    const lista = !!(I && I.problemas && !I.problemas.length && F.revisada);
    return h('div.f3-pro', h('b', '🔍 Comprobación de la figura'),
      I === 'cargando' ? h('p.small.muted', 'Comprobando agujeros, piezas sueltas y paredes finas…') : !I ? h('p.small.muted', pc ? 'Sin comprobar todavía.' : 'La comprobación a fondo se hace en el programa del PC.') : I.error ? h('p.r8e-mal', '⚠️ ' + I.error) : [
        fila(I.estanca && !I.bordes_abiertos, OKS.estanca, I.bordes_abiertos ? I.bordes_abiertos + ' bordes abiertos' : ''),
        fila(!I.migas, OKS.migas, I.piezas > 1 ? I.piezas + ' piezas (' + I.migas + ' son migas)' : ''),
        fila(I.normales_ok && !I.bordes_raros, OKS.normales, I.bordes_raros ? I.bordes_raros + ' aristas raras' : ''),
        fila(!(I.paredes_finas_pct > 0.5), OKS.finas, I.paredes_finas_pct > 0 ? n2(I.paredes_finas_pct) + ' % fina · en rojo en la vista' : '')],
      I && I.problemas ? h('div.f3-rep', h('b', '🛠️ Reparar'), h('label.check.small', h('input', { type: 'checkbox', checked: F.repMigas !== false, onchange: e => { F.repMigas = e.target.checked; } }), 'Quitar piezas sueltas'), h('label.check.small', h('input', { type: 'checkbox', checked: F.repCerrar !== false, onchange: e => { F.repCerrar = e.target.checked; } }), 'Cerrar agujeros'),
        h('label.r8e-c.col', h('span', 'Engrosar las paredes finas'), h('select.inp', { onchange: e => { F.repEngrosar = Number(e.target.value); } }, [[0, 'No'], [0.4, '0,4 mm'], [0.8, '0,8 mm'], [1.2, '1,2 mm']].map(([v, t]) => h('option', { value: v, selected: (F.repEngrosar || (I.problemas.includes('paredes_finas') ? 0.4 : 0)) === v }, t)))),
        h('label.check.small', h('input', { type: 'checkbox', checked: !!F.repRehacer, onchange: e => { F.repRehacer = e.target.checked; } }), 'Rehacerla como sólido (si está muy rota)'),
        btn('🛠️ Reparar y volver a comprobar', () => repara(), { cls: 'sm primary f3-reparar', disabled: !pc })) : null,
      I && I.ok && pc ? h('div.f3-rep', h('b', '🎨 Taller de Blender'), h('small.muted', 'Limpia, cierra y remalla la figura y luego la «pega» a la superficie original para no perder caras, dedos ni aristas. Mide cuánto ha cambiado.'),
        h('label.r8e-c.col', h('span', 'Remallado'), h('select.inp', { onchange: e => { F.blRemallar = Number(e.target.value); } }, [[0, 'No remallar (solo limpiar y cerrar)'], [0.25, 'Fino (0,25 mm)'], [0.35, 'Normal (0,35 mm)'], [0.5, 'Rápido (0,5 mm)']].map(([v, t]) => h('option', { value: v, selected: (F.blRemallar ?? 0.35) === v }, t)))),
        btn('🎨 Pasar por Blender', () => taller(), { cls: 'sm f3-blender' })) : null,
      F.blender ? h('div.f3-blres' + (F.blender.desviacion && F.blender.desviacion.p95_mm <= 0.15 ? '.ok' : '.ojo'), h('b', '🎨 Blender ' + F.blender.version_blender + ' · ' + F.blender.segundos + ' s'), h('small', (F.blender.pasos || []).join(' · ')),
        F.blender.desviacion ? h('small', 'La superficie se ha movido: media ' + n2(F.blender.desviacion.media_mm) + ' mm · el 95 % menos de ' + n2(F.blender.desviacion.p95_mm) + ' mm · lo que más, ' + n2(F.blender.desviacion.max_mm) + ' mm. ' + (F.blender.desviacion.p95_mm <= 0.15 ? '✅ Detalle conservado.' : '⚠️ Ha cambiado bastante: compara con el original.')) : null,
        F.blender.grosor ? h('small', 'Grosor medido con rayos: ' + n2(F.blender.grosor.pct_fino) + ' % de la superficie por debajo de ' + n2(F.blender.grosor.minimo_mm) + ' mm.') : null) : null,
      F.original && F.stl !== F.original ? btn('↩ Volver al original de la IA', async () => { const { parse3D } = await import('../stl.js'); F.stl = F.original; F.fig3d = await parse3D(F.original.buffer.slice(F.original.byteOffset, F.original.byteOffset + F.original.byteLength), 'o.stl'); F.hecho = null; F.blender = null; F.revisada = false; genera(true); comprueba(); }, { cls: 'sm ghost f3-original' }) : null,
      F.hecho ? h('p.small.f3-hecho', '🛠️ ' + F.hecho.join(' · ')) : null,
      h('label.check.small.f3-revisada', h('input', { type: 'checkbox', checked: !!F.revisada, onchange: e => { F.revisada = e.target.checked; pintaCampos(); } }), '👀 He girado la figura y he revisado la parte de atrás (la IA la imagina: solo ve la foto de delante)'),
      h('div.f3-estado' + (lista ? '.ok' : ''), lista ? '✅ LISTA PARA IMPRIMIR: comprobada y revisada' : '⏳ SIN DAR POR BUENA: ' + [!I || I === 'cargando' ? 'falta la comprobación' : null, I && I.problemas && I.problemas.length ? 'hay cosas por reparar' : null, !F.revisada ? 'falta revisar la parte de atrás' : null].filter(Boolean).join(' · ')),
      h('div.r8e-btns', ['frente', 'derecha', 'detras', 'arriba'].map(v => btn({ frente: 'Frente', derecha: 'Lado', detras: 'Detrás', arriba: 'Arriba' }[v], () => escena && escena.encuadrar(v), { cls: 'sm ghost' }))),
      h('div.r8e-btns.f3-siguiente', btn('🛠️ Al Blender Workshop', () => aLaMesa('taller'), { cls: 'sm f3-ataller', title: 'Reparación completa, con antes y después y deshacer' }), btn('🩺 Al Print Doctor', () => aLaMesa('doctor'), { cls: 'sm f3-adoctor', title: 'Orientación, soportes, perfil y 3MF para Bambu' })));
  }
  async function comprueba() {
    if (!pc || !F.stl || !d.desktop.mallaInspeccionar) { F.insp = null; return; }
    F.insp = 'cargando'; pintaCampos();
    try { const r = await d.desktop.mallaInspeccionar(new Blob([F.stl]), 0.8); F.insp = r; if (F.res && F.verMotor && F.res[F.verMotor]) F.res[F.verMotor].insp = r; }
    catch (e) { F.insp = { error: e.message || String(e) }; }
    if (escena) escena.marcadores(F.insp && F.insp.zonas_finas ? F.insp.zonas_finas.map(z => ({ p: z.p, r: Math.min(4, 1.2 + Math.sqrt(z.n) * 0.15) })) : null);
    window.__r8fpro = { insp: F.insp }; pintaCampos();
  }
  async function repara() {
    if (!F.stl) return; const btn0 = campos.querySelector('.f3-reparar'); if (btn0) { btn0.disabled = true; btn0.textContent = '🛠️ Reparando…'; }
    try {
      const r = await d.desktop.mallaReparar(new Blob([F.stl]), { engrosar: F.repEngrosar ?? (F.insp && F.insp.problemas && F.insp.problemas.includes('paredes_finas') ? 0.4 : 0), rehacer: !!F.repRehacer, migas: F.repMigas !== false, cerrar: F.repCerrar !== false });
      if (!r || !r.ok || !r.stl) throw new Error((r && r.error) || 'No se pudo reparar.');
      const bin = atob(r.stl), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const { parse3D } = await import('../stl.js'); F.fig3d = await parse3D(u8.buffer, 'reparada.stl'); F.stl = u8; F.hecho = r.hecho || []; F.insp = r; F.revisada = false;
      if (F.res && F.verMotor && F.res[F.verMotor]) Object.assign(F.res[F.verMotor], { sopa: F.fig3d, stl: u8, insp: r });
      if (escena) escena.marcadores(r.zonas_finas ? r.zonas_finas.map(z => ({ p: z.p, r: 1.6 })) : null);
      genera(true); toast('🛠️ Reparada y comprobada otra vez', 'ok'); window.__r8fpro = { insp: r, hecho: F.hecho };
    } catch (e) { toast(e.message || String(e), 'bad', 8000); }
    pintaCampos();
  }
  async function taller() {
    const b0 = campos.querySelector('.f3-blender'); if (b0) { b0.disabled = true; b0.textContent = '🎨 Blender trabajando…'; }
    try {
      const r = await d.desktop.mallaBlender(new Blob([F.stl]), { limpiar: true, cerrar: true, remallar: F.blRemallar ?? 0.35, conservar: true, aligerar: 150000, grosor: true, pared_min: 0.8, desviacion: true });
      if (!r || !r.ok || !r.stl) throw new Error((r && r.error) || 'Blender no ha podido.');
      const bin = atob(r.stl), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const { parse3D } = await import('../stl.js'); F.fig3d = await parse3D(u8.buffer, 'blender.stl'); F.stl = u8; F.blender = r; F.revisada = false; delete r.stl;
      if (escena) escena.marcadores(r.grosor && r.grosor.zonas ? r.grosor.zonas.map(z => ({ p: z.p, r: 1.4 })) : null);
      genera(true); window.__r8fpro = Object.assign(window.__r8fpro || {}, { blender: r }); await comprueba();
    } catch (e) { toast(e.message || String(e), 'bad', 8000); pintaCampos(); }
  }
  // (v20: el «probar todos» que elegía solo por la silueta lo hace ahora el 🧪 Smart Lab, comparando mucho más)
  async function aLaMesa(destino) { if (!F.stl) return; const E = await import('../r8/estado.js'); E.ponEnMesa({ nombre: (F.nombre || 'figura') + (F.verMotor ? ' · ' + ((MOTORES[F.verMotor] || {}).nombre || F.verMotor) : ''), origen: 'foto', motor: (MOTORES[F.verMotor] || {}).nombre || '', stl: F.stl, original: F.original || F.stl }); ext.irA && ext.irA(destino); }
  async function generaFigura(forzado, enTanda) {
    if (!F.img || !F.blob) return toast('Primero sube una foto.', 'warn'); if (!pc) return toast('La figura 3D se genera en el programa del PC.', 'warn');
    const o = F.v.figura3d, motor = forzado || o.motor, M = MOTORES[motor], estado = listaMotores().find(x => x.id === motor);
    if (!estado || !estado.listo) return toast((M ? M.nombre : motor) + ': ' + (estado ? estado.falta : 'no disponible'), 'warn');
    if (!M.local) { const { confirmDlg } = await import('../ui.js'); const txt = motor === 'trellis2' ? 'La foto, ya SIN fondo, se enviará a Hugging Face para hacer la figura con TRELLIS.2. Es GRATIS (0 €): gasta tu tiempo de tarjeta del día (5 min ≈ 1–2 figuras). ¿Seguimos?' : 'La foto se enviará a los servidores de ' + M.nombre + ' y se gastarán créditos de REGALO de tu cuenta (' + M.coste + '). ¿Seguimos?'; if (!(await confirmDlg('☁️ Enviar la foto a ' + M.nombre, txt, 'Sí, enviarla'))) return; }
    const t0 = Date.now(); let pregunta = null;
    const reloj = setInterval(() => { const sm = aviso.querySelector('.ia-pensando small'); if (!sm) return; let t = 'Lleva ' + Math.round((Date.now() - t0) / 1000) + ' s'; if (!pregunta) { pregunta = (M.local ? d.desktop.motor3dAvance() : d.desktop.nube3dAvance()).then(r => { if (r && r.txt) sm.dataset.txt = r.txt; }).catch(() => { }).finally(() => { pregunta = null; }); } if (sm.dataset.txt) t = sm.dataset.txt + ' · ' + t; else if (M.local) t += ' · la primera vez tarda más (carga el modelo)'; sm.textContent = t; }, 1000);
    mount(aviso, h('div.ia-pensando', h('span.r8e-anillo'), h('b', M.e + ' Creando la figura con ' + M.nombre + '…'), h('small', 'Empezando…')));
    try {
      const r = M.local ? await d.desktop.motor3dFigura(F.blob, { motor, alto: o.alto, resolucion: Number(o.resolucion), detalle: o.detalle, recortar: o.recortar }) : await d.desktop.nube3dFigura(F.blob, { proveedor: motor, alto: o.alto });
      if (!r || !r.ok) throw new Error((r && r.error) || 'El motor no ha podido.');
      const bin = atob(r.stl), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const { parse3D } = await import('../stl.js'); const sopa = await parse3D(u8.buffer, 'figura.stl');
      F.res = F.res || {}; F.res[motor] = { sopa, info: r, stl: u8 }; F.fig3d = sopa; F.fig3dInfo = r; F.verMotor = motor; F.stl = u8; F.original = u8; F.revisada = false; F.lista = false; F.insp = null; F.hecho = null; F.blender = null;
      mount(aviso, h('div.ia-hecho', h('b', '✨ ' + M.nombre + ': figura lista en ' + r.total_s + ' s'), h('small', (r.dispositivo === 'cuda' ? 'Tarjeta gráfica (' + r.vram_gb + ' GB) · ' : r.nube ? 'Nube · ' : '') + Number(r.caras).toLocaleString('es-ES') + ' caras · ' + (r.estanca ? 'cerrada ✓' : 'con agujeros: se cierran al unirla a la peana') + (r.migas_quitadas ? ' · ' + r.migas_quitadas + ' migas sueltas quitadas' : ''))));
      window.__r8f3d = r; genera(true); pintaCampos(); comprueba();
    } catch (e) {
      // si falla, la foto se queda: se puede probar con otro motor sin empezar de cero
      const otros = listaMotores().filter(x => x.listo && x.id !== motor);
      mount(aviso, h('div.f3-error', h('p.r8e-mal', '⚠️ ' + M.nombre + ': ' + (e.message || e)), otros.length ? h('div.r8e-btns', h('small', 'Probar con:'), otros.map(x => btn(x.e + ' ' + x.nombre, () => { F.v.figura3d.motor = x.id; pintaCampos(); generaFigura(x.id); }, { cls: 'sm' }))) : null));
      window.__r8f3d = { error: e.message, motor };
    } finally { clearInterval(reloj); }
  }
  async function hazlo() {
    if (!F.img) { mount(info, h('span', 'Sube una foto para empezar')); return; }
    const o = F.v[F.modo], t0 = performance.now(); let m;
    try {
      if (F.modo === 'figura3d') { if (!F.fig3d) { mount(info, h('span', 'Pulsa «Generar la figura»')); return; } m = figura3d(o); }
      else if (F.modo === 'lito') m = litofania(o);
      else if (F.modo === 'relieve') { await necesitaIA(); m = relieveIA(o); }
      else { let sil; if (pc && F.blob) { await necesitaIA(); sil = F.mascara; } m = inflada(o, sil); }
      ultima = N.guarda(m); const I = N.info(m);
      if (escena) { escena.ponPartes([{ id: 'foto', vista: N.aVista(m), color: F.modo === 'lito' ? '#f4f4f2' : '#c08ee8', acabado: F.modo === 'lito' ? 'transl' : 'mate' }]); if (ya2) { escena.encuadrar('iso'); ya2 = false; } }
      mount(info, h('span', I.dims.map(x => (Math.round(x * 10) / 10).toLocaleString('es-ES')).join(' × ') + ' mm'), h('span', Math.round(I.vol / 1000) + ' cm³'), h('span', Math.round(performance.now() - t0) + ' ms'));
      window.__r8f = { modo: F.modo, dims: I.dims.map(x => Math.round(x * 10) / 10), tri: I.tri, ok: true };
    } finally { N.limpia(); }
  }
  let ya2 = true;
  // 🧸 la figura que ha hecho la IA, a la medida y con su peana
  function figura3d(o) {
    let m; try { m = N.deSopa(F.fig3d); } catch (e) { throw new Error('La figura ha salido con la malla abierta: prueba con «Detalle: Alto» u otra foto. (' + e.message + ')'); }
    const b = N.caja(m), k = o.alto / Math.max(1, b.dims[2]); m = N.aLaCama(m.scale([k, k, k]));
    if (o.peana) { const b2 = N.caja(m), d = Math.max(b2.dims[0], b2.dims[1]) * 0.85 + 6; m = m.translate([0, 0, 3]).add(N.forma3d('cilindro', { d, h: 3.4 })); }
    return m;
  }
  // 💡 litofanía: oscuro = grueso (tapa la luz), claro = fino
  function litofania(o) {
    const paso = Math.max(0.25, o.ancho / 360), R = rejilla(F.img, Math.round(o.ancho / paso)), G = new Float32Array(R.W * R.H);
    for (let j = 0; j < R.H; j++) for (let i = 0; i < R.W; i++) { const k = ((R.H - 1 - j) * R.W + i) * 4, l = (R.d[k] * 0.299 + R.d[k + 1] * 0.587 + R.d[k + 2] * 0.114) / 255; G[j * R.W + i] = (1 - l) * (o.max - o.min); }
    const ancho = o.ancho, largo = ancho * R.H / R.W; let m = N.campo(G, R.W, R.H, ancho, largo, o.min);
    if (o.forma === 'corazon') { const co = N.cs([N.corazon2(Math.min(ancho, largo * 1.1))], 'Positive'); m = m.intersect(co.extrude(o.max + 2)); if (o.marco > 0) m = m.add(co.subtract(co.offset(-o.marco, 'Round')).extrude(o.max + 1)); }
    else if (o.marco > 0 && o.forma !== 'cilindro') m = m.add(N.cs([[[-ancho / 2, -largo / 2], [ancho / 2, -largo / 2], [ancho / 2, largo / 2], [-ancho / 2, largo / 2]]], 'Positive').subtract(N.cs([[[-ancho / 2 + o.marco, -largo / 2 + o.marco], [ancho / 2 - o.marco, -largo / 2 + o.marco], [ancho / 2 - o.marco, largo / 2 - o.marco], [-ancho / 2 + o.marco, largo / 2 - o.marco]]], 'Positive')).extrude(o.max + 1));
    if (o.forma === 'curva') m = N.deformar(m, [{ t: 'doblar', ang: 110, eje: 'x' }]);
    if (o.forma === 'cilindro') m = N.deformar(m, [{ t: 'doblar', ang: 359.5, eje: 'x' }]);
    return N.aLaCama(m.rotate([90, 0, 0])); // de pie: así se imprime y así se ve
  }
  // 🪄 relieve con la profundidad de la IA
  function relieveIA(o) {
    const paso = Math.max(0.3, o.ancho / 300), R = rejilla(F.prof, Math.round(o.ancho / paso)), W = R.W, H = R.H; let G = new Float32Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const v = R.d[((H - 1 - j) * W + i) * 4] / 255; G[j * W + i] = (o.invertir ? 1 - v : v) * o.alto; }
    G = suaviza(G, W, H, Math.round(o.suave)); const ancho = o.ancho, largo = ancho * H / W;
    if (o.forma === 'figura') { const M2 = rejilla(F.mascara, Math.max(W, H)), A = new Float32Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = Math.round(i * (M2.W - 1) / (W - 1)), y = Math.round((H - 1 - j) * (M2.H - 1) / (H - 1)); A[j * W + i] = M2.d[(y * M2.W + x) * 4] / 255; } return N.campoMascara(G, A, W, H, ancho, largo, o.base); }
    let m = N.campo(G, W, H, ancho, largo, o.base);
    if (o.marco > 0) m = m.add(N.cs([[[-ancho / 2, -largo / 2], [ancho / 2, -largo / 2], [ancho / 2, largo / 2], [-ancho / 2, largo / 2]]], 'Positive').subtract(N.cs([[[-ancho / 2 + o.marco, -largo / 2 + o.marco], [ancho / 2 - o.marco, -largo / 2 + o.marco], [ancho / 2 - o.marco, largo / 2 - o.marco], [-ancho / 2 + o.marco, largo / 2 - o.marco]]], 'Positive')).extrude(o.base + o.alto + 0.6));
    return m;
  }
  // 🎈 inflada: la silueta (con la máscara de la IA, o lo oscuro de la imagen)
  function inflada(o, mascara) {
    const fuente = mascara || F.img, R = rejilla(fuente, 600), cv = document.createElement('canvas'); cv.width = R.W; cv.height = R.H; const g = cv.getContext('2d'), I = g.createImageData(R.W, R.H);
    for (let k = 0; k < R.W * R.H; k++) { const r = R.d[k * 4], gg = R.d[k * 4 + 1], b = R.d[k * 4 + 2], a = R.d[k * 4 + 3], dentro = mascara ? r > 127 : (a < 200 ? a > 127 : (r * 0.299 + gg * 0.587 + b * 0.114) < 140); I.data[k * 4 + 3] = dentro ? 255 : 0; }
    g.putImageData(I, 0, 0);
    return N.inflar(siluetaCS(cv, o.ancho), { alto: o.alto, base: o.base, doble: o.doble });
  }
  function siluetaCS(cv, ancho) { const pol = traza(cv); if (!pol.length) throw new Error('No encuentro la silueta en esa foto.'); const s2 = N.dePols(pol), b = N.cajaCS(s2); return N.centraCS(s2).scale([ancho / b.w, ancho / b.w]); }
  async function imprimir() {
    if (!ultima) return toast('Primero sube una foto.', 'warn');
    if (F.modo === 'figura3d' && !(F.insp && F.insp.problemas && !F.insp.problemas.length && F.revisada)) { if (!(await confirmDlg('La figura no está dada por buena', 'Todavía ' + (!F.revisada ? 'no has revisado la parte de atrás' : 'tiene cosas por reparar') + '. ¿La preparas igualmente para imprimir?', 'Sí, prepararla'))) return; }
    import('../r8/consejos3d.js').then(A => import('../ui.js').then(({ modal }) => { const cuerpo = h('div.r8c-aj'); modal('🖨️ ' + (F.nombre || 'Foto') + ' · preparar para tu Bambu', cuerpo, null, { size: 'wide' });
      A.asistente(cuerpo, { clave: 'foto_' + F.modo, partes: () => (MESA ? MESA.expande : x => x)([{ m: ultima, color: F.modo === 'lito' ? '#f4f4f2' : '#c08ee8', nombre: F.nombre || 'foto' }]), N, uso: 'deco', texto: F.modo !== 'inflada', nombre: (F.modo === 'lito' ? 'litofania_' : F.modo === 'relieve' ? 'relieve_' : 'figura_') + (F.nombre || 'foto').replace(/[^\w-]+/g, '_').slice(0, 30), baja: (blob, nom) => { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nom }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); }, cama: 256, desktopAbrir: pc }); }));
  }
  function alEstudio() { if (!ultima) return toast('Primero sube una foto.', 'warn'); const s2 = N.aSopa(ultima); if (ext.alEstudioMalla) ext.alEstudioMalla(s2, (F.modo === 'lito' ? 'Litofanía ' : F.modo === 'relieve' ? 'Relieve ' : 'Figura ') + (F.nombre || '')); }
  pintaModos(); pintaFoto(); pintaCampos(); genera(true);
  return { destroy() { vivo = false; clearTimeout(tic); if (MESA) MESA.destruir(); if (escena) escena.destruir(); if (ultima) N.suelta(ultima); } };
}
// el contorno de una imagen en blanco y negro (lo opaco) → polígonos en mm (1 px = 1 unidad; luego se escala)
import { trazar } from '../r8/motor.js';
import { mesa } from '../r8/mesa.js'; // v30: tocar, mover, duplicar y copiar en la cama
function traza(cv) { const g = cv.getContext('2d', { willReadFrequently: true }); return trazar(g.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, 1); }
