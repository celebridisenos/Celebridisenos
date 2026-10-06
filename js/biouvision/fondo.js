// ================= v15.4 · BIOUVISION · ✂️ QUITAR EL FONDO =================
// Elige una foto → ✂️ Quitar el fondo → elige el fondo nuevo (transparente, blanco, color, desenfocado o de estudio)
// → se descarga a su tamaño ORIGINAL. Lo hace la IA del PC (BiRefNet). En el móvil se encarga al PC del taller.
// Motor: Automático (con una cara usa «Personas»), Máxima ⭐ (Massive), Personas o Rápido. 💎 Ultra: pelo y bordes finos.
// ↶ Deshacer / ↷ Rehacer (Ctrl+Z / Ctrl+Y): los cambios de fondo.
import { h, mount, toast } from '../ui.js';
import { desktop } from '../desktop.js';
import { recortarConIA } from '../biou/motor.js';
import { componer } from '../fondo.js';
import { BANCO, miniatura as miniBanco } from '../biou/banco.js';
import { teclasDeshacer } from '../biou/pro.js';
import { comparador } from './comparar.js';
import { guardarObra } from './obras.js';

const MOTORES = [['auto', 'Auto'], ['birefnet-massive', 'Máxima ⭐'], ['birefnet-portrait', 'Personas'], ['birefnet-lite', 'Rápido']];
const AYUDA_MOTOR = { auto: 'Elige solo el mejor que tengas. Si hay una persona, usa el de personas.', 'birefnet-massive': 'El mejor recorte que existe. Tarda más.', 'birefnet-portrait': 'Para personas: pelo suelto y ropa.', 'birefnet-lite': 'Rápido y bueno para productos.' };
const TIPOS = [['transparente', '🔲 Sin fondo'], ['blanco', '⬜ Blanco'], ['color', '🎨 Color'], ['desenfocado', '🌫️ Difuminado'], ['banco', '🖼️ Estudio']];
const OP0 = { modelo: 'auto', ultra: true };
const leerOp = () => { try { return Object.assign({}, OP0, JSON.parse(localStorage.getItem('bv.fondo.op') || '{}')); } catch (e) { return Object.assign({}, OP0); } };
const guardaOp = op => { try { localStorage.setItem('bv.fondo.op', JSON.stringify(op)); } catch (e) { } };
const aBlob = (cv, tipo, q) => new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('No se pudo preparar la foto.')), tipo, q));
async function cargar(file) {
  if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { } }
  return await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('No se pudo abrir esa imagen.')); im.src = u; });
}
function lienzo(src, lado) {
  const W = src.width || src.naturalWidth, H = src.height || src.naturalHeight, k = Math.min(1, lado / Math.max(W, H)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

let F = null; // lo que hay en pantalla (se conserva al cambiar de sección)

export function pantallaFondo(el, C) {
  if (!F) F = { foto: null, m: null, op: leerOp(), fondo: { tipo: 'transparente', color: '#ffffff', banco: 'estudio_blanco', sombra: false }, atras: [], adelante: [], ctl: null, msg: '', resUrl: '', guardadas: new Set() };
  const escena = h('div.bv-escena'), panel = h('div.bv-panel.bv-vidrio');
  const elegir = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, 'aria-label': 'Elegir foto', onchange: () => { const f = elegir.files[0]; elegir.value = ''; if (f) abrir(f); } });
  mount(el, h('div.bv-top', h('div.grow', h('h1.bv-h2', '✂️ Quitar el fondo'), h('p.bv-sub', { style: { margin: 0 } }, 'Personas, productos, mascotas… Recorta hasta el pelo y lo pone sobre el fondo que quieras.'))),
    h('div.bv-trabajo', escena, panel), elegir);
  const visible = () => el.isConnected && el.getClientRects().length > 0;
  const quitaTeclas = teclasDeshacer(() => visible() && deshacer(), () => visible() && rehacer());
  const vigilar = setInterval(() => { if (!el.isConnected) { quitaTeclas(); clearInterval(vigilar); } }, 2000);

  async function abrir(file) {
    if (!/^image\//.test(file.type || 'image/')) return toast('Eso no es una foto.', 'bad');
    if (F.ctl) F.ctl.abort();
    try {
      const bm = await cargar(file), prev = lienzo(bm, 1400);
      if (F.foto) URL.revokeObjectURL(F.foto.url);
      if (F.resUrl) URL.revokeObjectURL(F.resUrl);
      F.foto = { file, bm, prev, url: URL.createObjectURL(await aBlob(prev, 'image/jpeg', 0.9)), w: bm.width || bm.naturalWidth, h: bm.height || bm.naturalHeight, nombre: String(file.name || 'foto').replace(/\.[^.]+$/, '') || 'foto' };
      F.m = null; F.resUrl = ''; F.atras = []; F.adelante = []; F.guardadas = new Set();
      pinta();
      quitar(); // sin más pasos: en cuanto eliges la foto, se quita el fondo
    } catch (e) { toast(e.message, 'bad'); }
  }
  function pinta() {
    if (!F.foto) return pintaElegir();
    if (F.ctl) return pintaTrabajando();
    if (!F.m) return pintaFoto();
    pintaListo();
  }
  function pintaElegir() {
    const zona = h('button.bv-soltar', { type: 'button', 'aria-label': 'Elegir la foto', onclick: () => elegir.click(),
      ondragover: e => { e.preventDefault(); zona.classList.add('sobre'); }, ondragleave: () => zona.classList.remove('sobre'),
      ondrop: e => { e.preventDefault(); zona.classList.remove('sobre'); const f = [...(e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (f) abrir(f); } },
      h('div.ic', '✂️'), h('h3', 'Arrastra aquí tu foto'), h('p', 'o pulsa para elegirla. En cuanto la eliges, la IA quita el fondo sola.'));
    mount(escena, zona);
    mount(panel, opcionesMotor(), h('button.bv-btn.prim.gran', { type: 'button', onclick: () => elegir.click() }, '📂 Elegir la foto'), C.estado('fondo'));
  }
  function opcionesMotor() {
    const seg = h('div.bv-seg', { role: 'radiogroup', 'aria-label': 'Motor de recorte' }, MOTORES.map(([v, t]) => h('button' + (F.op.modelo === v ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': F.op.modelo === v ? 'true' : 'false', onclick: () => { F.op.modelo = v; guardaOp(F.op); pinta(); } }, t)));
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
      h('div.bv-op', h('h4', '🧠 Motor de IA'), seg, h('p', AYUDA_MOTOR[F.op.modelo] || '')),
      h('label.bv-interr', h('span', '💎 Ultra (pelo y bordes finos)'), h('input', { type: 'checkbox', checked: F.op.ultra, onchange: e => { F.op.ultra = e.target.checked; guardaOp(F.op); } })));
  }
  function pintaFoto() {
    mount(escena, h('img', { src: F.foto.url, alt: 'Tu foto', style: { maxWidth: '100%', maxHeight: 'min(70vh, 720px)', display: 'block' } }));
    mount(panel, opcionesMotor(), h('button.bv-btn.prim.gran', { type: 'button', onclick: quitar }, '✂️ Quitar el fondo'),
      h('button.bv-btn.peq', { type: 'button', onclick: () => elegir.click() }, '📂 Otra foto'), C.estado('fondo'));
  }
  function pintaTrabajando() {
    mount(escena, h('div', { style: { position: 'relative', lineHeight: 0 } }, h('img', { src: F.foto.url, alt: 'Tu foto', style: { maxWidth: '100%', maxHeight: 'min(70vh, 720px)', display: 'block' } }), h('div.bv-escaneo')),
      h('div.bv-progreso', { role: 'status', 'aria-live': 'polite' }, h('div', { style: { fontSize: '54px' } }, '✂️'), h('div.bv-paso.bv-fondo-msg', F.msg || 'Quitando el fondo…'),
        h('button.bv-btn.peq', { type: 'button', onclick: () => F.ctl && F.ctl.abort() }, 'Cancelar')));
    mount(panel, h('div.bv-op', h('h4', desktop.on ? '🖥️ Lo está haciendo este PC' : '🖥️ Lo está haciendo el PC del taller'),
      h('p', F.op.ultra ? '💎 Modo Ultra: mira el borde con lupa (pelo, dedos, encaje).' : 'Recorte normal.')),
    h('p.bv-ayuda', 'Puedes seguir usando Biouvision mientras tanto.'));
  }
  async function quitar() {
    if (F.ctl || !F.foto) return;
    const ctl = F.ctl = new AbortController(); F.msg = 'Preparando la foto…'; pinta();
    try {
      const m = await recortarConIA(lienzo(F.foto.bm, 4096), { signal: ctl.signal, modelo: F.op.modelo === 'auto' ? '' : F.op.modelo, calidad: F.op.ultra ? 'ultra' : '',
        onStatus: t => { F.msg = t; const e = escena.querySelector('.bv-fondo-msg'); if (e) e.textContent = t; } });
      if (ctl.signal.aborted) return;
      if (!m) throw new Error('La IA no encontró nada que recortar en esta foto.');
      F.m = m;
      if (F.fondo.tipo === 'original') F.fondo.tipo = 'transparente';
      toast('✂️ ¡Fondo quitado!' + (m.modelo ? ' (' + m.modelo + ')' : '') + ' Arrastra la línea para comparar.', 'ok', 5000);
    } catch (e) { if (e.name !== 'AbortError' && !ctl.signal.aborted) toast(e.message, 'bad', 9000); else toast('Cancelado.'); }
    finally { if (F.ctl === ctl) F.ctl = null; pinta(); }
  }

  // ---------- resultado ----------
  let comp = null, pend = 0;
  function apuntar() { F.atras.push(JSON.stringify(F.fondo)); if (F.atras.length > 60) F.atras.shift(); F.adelante = []; }
  function cambia(k, v) { if (F.fondo[k] === v) return; apuntar(); F.fondo[k] = v; pintaListo(); }
  function deshacer() { if (!F.m || !F.atras.length) return; F.adelante.push(JSON.stringify(F.fondo)); F.fondo = JSON.parse(F.atras.pop()); pintaListo(); }
  function rehacer() { if (!F.m || !F.adelante.length) return; F.atras.push(JSON.stringify(F.fondo)); F.fondo = JSON.parse(F.adelante.pop()); pintaListo(); }
  async function vistaPrevia() {
    const n = ++pend, out = componer(F.foto.prev, F.m, F.fondo), b = await aBlob(out, F.fondo.tipo === 'transparente' ? 'image/png' : 'image/jpeg', 0.92);
    if (n !== pend) return;
    const viejo = F.resUrl; F.resUrl = URL.createObjectURL(b);
    if (comp && comp.el.isConnected) comp.cambiar(null, F.resUrl);
    if (viejo) setTimeout(() => URL.revokeObjectURL(viejo), 1500);
  }
  function pintaListo() {
    if (!comp || !comp.el.isConnected) { comp = comparador(F.foto.url, F.resUrl || F.foto.url, { etiquetas: ['Antes', 'Después'], inicio: 0.35 }); comp.el.classList.add('ajedrez'); }
    vistaPrevia();
    const bLupa = h('button.bv-btn.peq', { type: 'button', onclick: () => bLupa.classList.toggle('on', comp.lupa()), title: 'Pasa por encima para ver el borde de cerca' }, '🔍 Lupa');
    mount(escena, comp.el, h('div.bv-herr', bLupa,
      h('button.bv-btn.peq', { type: 'button', onclick: deshacer, disabled: !F.atras.length, title: 'Deshacer (Ctrl+Z)', 'aria-label': 'Deshacer' }, '↶'),
      h('button.bv-btn.peq', { type: 'button', onclick: rehacer, disabled: !F.adelante.length, title: 'Rehacer (Ctrl+Y)', 'aria-label': 'Rehacer' }, '↷')));
    const fd = F.fondo;
    const tipos = h('div.bv-fila', TIPOS.map(([k, t]) => h('button.bv-btn.peq' + (fd.tipo === k ? '.on' : ''), { type: 'button', 'aria-pressed': fd.tipo === k ? 'true' : 'false', onclick: () => cambia('tipo', k) }, t)));
    const extra = fd.tipo === 'color' ? h('label.bv-fila', { style: { marginTop: '10px', fontSize: '16px', fontWeight: 650 } }, h('span', 'Elige el color:'), h('input.bv-color', { type: 'color', value: fd.color, 'aria-label': 'Color del fondo', onchange: e => cambia('color', e.target.value) }))
      : fd.tipo === 'banco' ? h('div.bv-banco', BANCO.map(([k, t]) => { const c = miniBanco(k, 84, 64); c.setAttribute('aria-hidden', 'true'); return h('button.bv-banco-b' + (fd.banco === k ? '.on' : ''), { type: 'button', title: t, 'aria-label': t, onclick: () => cambia('banco', k) }, c); }))
        : null;
    const nombre = ext => F.foto.nombre + '_sin_fondo.' + ext;
    mount(panel,
      h('div.bv-op', h('h4', '🎨 Fondo nuevo'), tipos, extra),
      fd.tipo !== 'transparente' && fd.tipo !== 'desenfocado' ? h('label.bv-interr', h('span', '🌑 Sombra suave debajo'), h('input', { type: 'checkbox', checked: !!fd.sombra, onchange: e => cambia('sombra', e.target.checked) })) : null,
      h('div.bv-acciones',
        h('button.bv-btn.prim.ancho', { type: 'button', onclick: ev => exportar(ev, f => C.descargar(f)) }, fd.tipo === 'transparente' ? '⬇️ Descargar PNG' : '⬇️ Descargar'),
        h('button.bv-btn', { type: 'button', onclick: ev => exportar(ev, f => C.guardarNube(f)) }, '☁️ A la biblioteca'),
        C.puedeInstagram() ? h('button.bv-btn', { type: 'button', onclick: ev => exportar(ev, f => C.aInstagram(f), 'jpg') }, '📸 Instagram') : null,
        h('button.bv-btn', { type: 'button', onclick: ev => exportar(ev, f => C.aEstudio(f)) }, '🎨 Retocar'),
        h('button.bv-btn', { type: 'button', onclick: () => { F.m = null; pinta(); } }, '🔁 Otro motor'),
        h('button.bv-btn.ancho', { type: 'button', onclick: () => elegir.click() }, '🆕 Otra foto')),
      h('p.bv-ayuda', 'Se guarda a tamaño original: ' + F.foto.w + ' × ' + F.foto.h + ' px. ', h('span.bv-kbd', 'Ctrl+Z'), ' / ', h('span.bv-kbd', 'Ctrl+Y'), ' deshacen el fondo.'));
    async function exportar(ev, fn, forzar) {
      const b = ev.target.closest('button'), t0 = b.textContent; b.disabled = true; b.textContent = 'Preparando…';
      try {
        const png = !forzar && fd.tipo === 'transparente', full = lienzo(F.foto.bm, 8192), out = componer(full, F.m, F.fondo);
        const blob = await aBlob(out, png ? 'image/png' : 'image/jpeg', 0.95), file = new File([blob], nombre(png ? 'png' : 'jpg'), { type: blob.type });
        const clave = JSON.stringify(F.fondo) + png;
        if (!F.guardadas.has(clave)) { F.guardadas.add(clave); guardarObra({ tipo: 'recorte', nombre: F.foto.nombre + ' sin fondo', blob, antes: F.foto.file, info: { modelo: F.m.modelo || '' } }).then(() => C.alGuardar()).catch(() => { }); }
        await fn(file);
      } catch (e) { toast(e.message, 'bad'); } finally { b.disabled = false; b.textContent = t0; }
    }
  }
  pinta();
  return { abrir };
}
