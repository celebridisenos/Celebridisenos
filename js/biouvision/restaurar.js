// ================= v15.4 · BIOUVISION · 🕰️ RESTAURAR FOTOS ANTIGUAS =================
// Elige una foto (o hazla con el móvil a una foto en papel) → ajustes → ✨ Restaurar → antes / después.
// Lo hace el PC: endereza, recupera el contraste, quita polvo y arañazos (y lo que marques con el pincel), amplía con IA
// hasta 4K, recupera las caras y, si quieres, le da color. En el móvil se encarga al PC del taller y vuelve sola.
// ↶ Deshacer / ↷ Rehacer (Ctrl+Z / Ctrl+Y): las marcas del pincel y, ya restaurada, las versiones que hayas probado.
import { h, mount, toast } from '../ui.js';
import { desktop } from '../desktop.js';
import { restaurarFoto, verDanos } from '../biou/motor.js';
import { teclasDeshacer } from '../biou/pro.js';
import { comparador } from './comparar.js';
import { guardarObra, miniatura } from './obras.js';

const OPC0 = { tamano: '4k', reparar: 2, caras: 80, motorCaras: 'nitida', color: 'original', enderezar: true, formato: 'jpg' };
const leerOp = () => { try { return Object.assign({}, OPC0, JSON.parse(localStorage.getItem('bv.rest.op') || '{}')); } catch (e) { return Object.assign({}, OPC0); } };
const guardaOp = op => { try { localStorage.setItem('bv.rest.op', JSON.stringify(op)); } catch (e) { } };
// v16.1 · 🪄 Borrador mágico: la misma pantalla en modo «borrar» (solo quita lo que pintas; nada más se toca)
const PASOS_BORRAR = [[0, '📂', 'Abrir la foto'], [6, '🪄', 'Borrar y rellenar el hueco'], [95, '💾', 'Guardar']];
const PASOS = [[0, '📐', 'Enderezar y preparar'], [8, '🩹', 'Reparar polvo y arañazos'], [12, '🔍', 'Ampliar con IA'], [75, '🙂', 'Recuperar las caras'], [88, '🎨', 'Color y tono'], [95, '💾', 'Guardar']];
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const tamTxt = (w, hh) => w + ' × ' + hh + ' px' + (Math.max(w, hh) >= 3800 ? ' · 4K' : '');
const tactil = () => matchMedia('(pointer: coarse)').matches;
const cargarImg = url => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('No se pudo abrir esa imagen.')); im.src = url; });

const ESTADOS = {}; // lo que hay en pantalla en cada modo (se conserva al ir a otra sección y volver)

export function pantallaRestaurar(el, C, opc) {
  const BORRAR = !!(opc && opc.modo === 'borrar'), modo = BORRAR ? 'borrar' : 'restaurar', pasos = BORRAR ? PASOS_BORRAR : PASOS;
  const S = ESTADOS[modo] || (ESTADOS[modo] = { fase: 'elegir', foto: null, op: leerOp(), trazos: [], deshechos: [], danos: null, verDanos: false, pincel: BORRAR ? '+' : null, radio: BORRAR ? 0.03 : 0.02, versiones: [], v: -1, ctl: null, prog: { pct: 0, paso: '', seg: 0 } });
  const escena = h('div.bv-escena'), panel = h('div.bv-panel.bv-vidrio');
  const elegir = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, 'aria-label': BORRAR ? 'Elegir foto' : 'Elegir foto antigua', onchange: () => { const f = elegir.files[0]; elegir.value = ''; if (f) abrir(f); } });
  const camara = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' }, 'aria-label': 'Hacer una foto', onchange: () => { const f = camara.files[0]; camara.value = ''; if (f) abrir(f, true); } });
  mount(el, h('div.bv-top', h('div.grow', h('h1.bv-h2', BORRAR ? '🪄 Borrador mágico' : '🕰️ Restaurar una foto antigua'), h('p.bv-sub', { style: { margin: 0 } }, BORRAR ? 'Pinta encima de lo que sobra (una mancha, un hilo, un soporte, un objeto) y desaparece. Lo demás no se toca.' : 'Polvo, arañazos, manchas, caras borrosas… La deja como nueva y hasta en 4K.'))),
    h('div.bv-trabajo', escena, panel), elegir, camara);
  const visible = () => el.offsetParent !== null;
  const quitaTeclas = teclasDeshacer(() => visible() && deshacer(), () => visible() && rehacer());
  const vigilar = setInterval(() => { if (!el.isConnected) { quitaTeclas(); clearInterval(vigilar); } }, 2000);

  async function abrir(file, delMovil) {
    if (!/^image\//.test(file.type || 'image/')) return toast('Eso no es una foto.', 'bad');
    try {
      const url = URL.createObjectURL(file), im = await cargarImg(url);
      if (S.foto && !S.versiones.some(x => x.url === S.foto.url)) URL.revokeObjectURL(S.foto.url);
      S.foto = { blob: file, url, w: im.naturalWidth, h: im.naturalHeight, nombre: String(file.name || 'foto').replace(/\.[^.]+$/, '') || 'foto', im };
      S.trazos = []; S.deshechos = []; S.danos = null; S.verDanos = false; S.pincel = BORRAR ? '+' : null; S.versiones = []; S.v = -1; S.fase = 'ajustes';
      if (delMovil) S.op.enderezar = true;
      pinta();
    } catch (e) { toast(e.message, 'bad'); }
  }

  // ---------- pintar ----------
  function pinta() {
    escena.classList.remove('ajedrez');
    if (S.fase === 'elegir' || !S.foto) return pintaElegir();
    if (S.fase === 'ajustes') return pintaAjustes();
    if (S.fase === 'trabajando') return pintaTrabajando();
    if (S.fase === 'listo') return pintaListo();
  }
  function pintaElegir() {
    const zona = h('button.bv-soltar', { type: 'button', 'aria-label': 'Elegir la foto antigua', onclick: () => elegir.click(),
      ondragover: e => { e.preventDefault(); zona.classList.add('sobre'); }, ondragleave: () => zona.classList.remove('sobre'),
      ondrop: e => { e.preventDefault(); zona.classList.remove('sobre'); const f = [...(e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (f) abrir(f); } },
      h('div.ic', BORRAR ? '🪄' : '🕰️'), h('h3', BORRAR ? 'Arrastra aquí tu foto' : 'Arrastra aquí tu foto antigua'), h('p', BORRAR ? 'o pulsa para elegirla. Después pinta encima de lo que quieras quitar.' : 'o pulsa para elegirla. Sirve una foto escaneada o una foto hecha con el móvil a la foto en papel.'));
    mount(escena, zona);
    mount(panel,
      h('div.bv-op', h('h4', '📂 Empieza aquí'), h('div.bv-fila', { style: { flexDirection: 'column', alignItems: 'stretch' } },
        h('button.bv-btn.prim.gran', { type: 'button', onclick: () => elegir.click() }, '📂 Elegir la foto'),
        tactil() ? h('button.bv-btn.gran', { type: 'button', onclick: () => camara.click() }, BORRAR ? '📷 Hacer una foto' : '📷 Hacer una foto a la foto') : null)),
      BORRAR ? h('div.bv-op', h('h4', '🪄 Para qué sirve'), h('ul.bv-pasos', [['🧵', 'Hilos y restos de soporte de la pieza'], ['🫧', 'Motas, pelusas y manchas de la mesa'], ['✋', 'Una mano, un cable, un reflejo'], ['🏷️', 'Una etiqueta o un texto que no quieres']].map(([ic, t]) => h('li.ya', h('i', ic), t))))
        : h('div.bv-op', h('h4', '✨ Qué hace'), h('ul.bv-pasos', PASOS.map(([, ic, t]) => h('li.ya', h('i', ic), t)))),
      h('p.bv-ayuda', BORRAR ? 'La foto original nunca se toca: siempre se crea una nueva. Puedes borrar varias cosas, una detrás de otra.' : 'Funciona con fotos de cualquier época, también de 1890. La foto original nunca se toca: siempre se crea una nueva.'),
      estadoMotores());
  }

  // ---------- ajustes + pincel ----------
  let lienzo = null;
  function pintaAjustes() {
    const f = S.foto, cv = h('canvas', { width: f.w, height: f.h, 'aria-label': 'Tu foto' });
    cv.getContext('2d').drawImage(f.im, 0, 0);
    const marcas = h('canvas.bv-marcas'), dedo = h('div.bv-dedo', { 'aria-label': BORRAR ? 'Pinta encima de lo que quieres borrar' : 'Pinta encima para marcar daños' });
    lienzo = { cv, marcas, dedo, wrap: h('div.bv-lienzo', cv, marcas, dedo) };
    dedo.style.display = S.pincel ? '' : 'none';
    const herr = BORRAR ? h('div.bv-herr',
      h('span.bv-chip', '🖌️ Pinta lo que sobra'),
      h('label', 'Tamaño', h('input.bv-rango', { type: 'range', min: 6, max: 120, value: Math.round(S.radio * 1000), style: { width: '130px' }, 'aria-label': 'Tamaño del pincel', oninput: e => { S.radio = Number(e.target.value) / 1000; } })),
      h('button.bv-btn.peq', { type: 'button', onclick: deshacer, disabled: !S.trazos.length, title: 'Deshacer (Ctrl+Z)', 'aria-label': 'Deshacer' }, '↶'),
      h('button.bv-btn.peq', { type: 'button', onclick: rehacer, disabled: !S.deshechos.length, title: 'Rehacer (Ctrl+Y)', 'aria-label': 'Rehacer' }, '↷'))
      : h('div.bv-herr',
      desktop.on ? h('button.bv-btn.peq' + (S.verDanos ? '.on' : ''), { type: 'button', onclick: alternarDanos, title: 'Ver en rojo el polvo y los arañazos que va a reparar' }, '🔍 Ver daños') : null,
      h('button.bv-btn.peq' + (S.pincel === '+' ? '.on' : ''), { type: 'button', onclick: () => modoPincel('+'), title: 'Pinta encima de una mancha o rotura para que la repare' }, '🖌️ Marcar daño'),
      h('button.bv-btn.peq' + (S.pincel === '-' ? '.on' : ''), { type: 'button', onclick: () => modoPincel('-'), title: 'Pinta encima de algo que NO es un daño para que no lo toque' }, '🛡️ No tocar'),
      S.pincel ? h('label', 'Tamaño', h('input.bv-rango', { type: 'range', min: 4, max: 80, value: Math.round(S.radio * 1000), style: { width: '110px' }, 'aria-label': 'Tamaño del pincel', oninput: e => { S.radio = Number(e.target.value) / 1000; } })) : null,
      h('button.bv-btn.peq', { type: 'button', onclick: deshacer, disabled: !S.trazos.length, title: 'Deshacer (Ctrl+Z)', 'aria-label': 'Deshacer' }, '↶'),
      h('button.bv-btn.peq', { type: 'button', onclick: rehacer, disabled: !S.deshechos.length, title: 'Rehacer (Ctrl+Y)', 'aria-label': 'Rehacer' }, '↷'));
    mount(escena, lienzo.wrap, herr);
    requestAnimationFrame(pintaMarcas);
    pincelar(dedo);
    const seg = (k, ops) => h('div.bv-seg', { role: 'radiogroup' }, ops.map(([v, t]) => h('button' + (S.op[k] === v ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': S.op[k] === v ? 'true' : 'false', onclick: () => { S.op[k] = v; guardaOp(S.op); pintaAjustesPanel(); } }, t)));
    function pintaAjustesPanel() {
      if (BORRAR) return mount(panel,
        h('div.bv-op', h('h4', '🪄 Cómo se usa'), h('ul.bv-pasos', h('li' + (S.trazos.length ? '.ya' : '.ahora'), h('i', '1'), 'Pinta encima de lo que quieres quitar (cúbrelo entero, con un poco de margen)'), h('li' + (S.trazos.length ? '.ahora' : ''), h('i', '2'), 'Pulsa «Borrar lo pintado»'), h('li', h('i', '3'), 'Si queda algo, sigue borrando'))),
        h('button.bv-btn.prim.gran.bv-restaurar', { type: 'button', disabled: !S.trazos.length, onclick: restaurar }, '🪄 Borrar lo pintado'),
        h('label.bv-interr', h('span', '🖼️ Guardar en PNG (sin pérdida)'), h('input', { type: 'checkbox', checked: S.op.formato === 'png', onchange: e => { S.op.formato = e.target.checked ? 'png' : 'jpg'; guardaOp(S.op); } })),
        h('div.bv-fila', h('button.bv-btn.peq', { type: 'button', onclick: () => elegir.click() }, '📂 Otra foto'), S.versiones.length ? h('button.bv-btn.peq', { type: 'button', onclick: () => { S.fase = 'listo'; pinta(); } }, '↩ Ver el resultado') : null),
        estadoMotores());
      const final = tamFinal();
      mount(panel,
        h('div.bv-op', h('h4', '🔍 Tamaño final'), seg('tamano', [['original', 'Igual'], ['x2', '×2'], ['4k', '4K ⭐']]), h('p', 'Ahora: ' + tamTxt(f.w, f.h) + ' → quedará en ' + tamTxt(final.w, final.h) + '.')),
        h('div.bv-op', h('h4', '🩹 Reparar daños'), seg('reparar', [[0, 'No'], [1, 'Suave'], [2, 'Normal'], [3, 'Fuerte']]), h('p', 'Polvo, puntos y arañazos finos. Lo grande (roturas, manchas) márcalo con 🖌️.')),
        h('div.bv-op', h('h4', '🙂 Caras', h('b', { style: { marginLeft: 'auto', color: '#67e8f9' } }, S.op.caras ? S.op.caras + ' %' : 'No tocar')),
          h('input.bv-rango', { type: 'range', min: 0, max: 100, step: 5, value: S.op.caras, 'aria-label': 'Fuerza de la mejora de caras', oninput: e => { S.op.caras = Number(e.target.value); guardaOp(S.op); e.target.previousSibling.lastChild.textContent = S.op.caras ? S.op.caras + ' %' : 'No tocar'; } }),
          h('p', 'Más alto = cara más nítida. Más bajo = más parecida a la original.'),
          S.op.caras ? seg('motorCaras', [['nitida', 'Nítida ⭐'], ['natural', 'Natural']]) : null,
          S.op.caras ? h('p', S.op.motorCaras === 'natural' ? 'Natural (RestoreFormer++): toca menos la cara. Para fotos poco dañadas.' : 'Nítida (GFPGAN): la que mejor rehace una cara muy borrosa o dañada.') : null),
        h('div.bv-op', h('h4', '🎨 Color'), seg('color', [['original', 'Su tono'], ['bn', 'B y N'], ['ia', '🎨 Color IA']]), h('p', S.op.color === 'ia' ? 'La IA le pone color a una foto en blanco y negro.' : S.op.color === 'bn' ? 'Blanco y negro puro (quita el amarillo o el sepia).' : 'Respeta su tono (sepia o blanco y negro).')),
        h('label.bv-interr', h('span', '📐 Enderezar (si la hiciste con el móvil)'), h('input', { type: 'checkbox', checked: S.op.enderezar, onchange: e => { S.op.enderezar = e.target.checked; guardaOp(S.op); } })),
        h('label.bv-interr', h('span', '🖼️ Guardar en PNG (sin pérdida)'), h('input', { type: 'checkbox', checked: S.op.formato === 'png', onchange: e => { S.op.formato = e.target.checked ? 'png' : 'jpg'; guardaOp(S.op); } })),
        h('button.bv-btn.prim.gran.bv-restaurar', { type: 'button', onclick: restaurar }, '✨ Restaurar ahora'),
        h('div.bv-fila', h('button.bv-btn.peq', { type: 'button', onclick: () => elegir.click() }, '📂 Otra foto'), S.versiones.length ? h('button.bv-btn.peq', { type: 'button', onclick: () => { S.fase = 'listo'; pinta(); } }, '↩ Ver la restaurada') : null),
        estadoMotores());
    }
    pintaAjustesPanel();
  }
  function tamFinal() {
    const f = S.foto, lado = Math.max(f.w, f.h), obj = S.op.tamano === '4k' ? Math.max(lado, 3840) : S.op.tamano === 'x2' ? lado * 2 : lado, k = obj / lado;
    return { w: Math.round(f.w * k), h: Math.round(f.h * k) };
  }
  function modoPincel(m) { if (BORRAR) return; S.pincel = S.pincel === m ? null : m; pinta(); if (S.pincel) toast(m === '+' ? '🖌️ Pinta encima de las roturas o manchas grandes.' : '🛡️ Pinta encima de lo que NO hay que tocar.', '', 3500); }
  async function alternarDanos() {
    S.verDanos = !S.verDanos;
    if (S.verDanos && !S.danos) {
      toast('🔍 Buscando polvo y arañazos…', '', 2500);
      try {
        const r = await verDanos(S.foto.blob, S.op.reparar || 2, false);
        if (!r) { S.verDanos = false; toast('Para ver los daños hace falta el motor de fotos de este PC.', 'warn'); }
        else { S.danos = await cargarImg(r.mascara); toast(r.zona > 0 ? '🔴 En rojo: lo que va a reparar (' + (r.zona * 100).toFixed(1) + ' % de la foto). Usa 🛡️ para lo que no sea un daño.' : 'No veo polvo ni arañazos finos. Si hay roturas, márcalas con 🖌️.', 'ok', 6000); }
      } catch (e) { S.verDanos = false; toast(e.message, 'bad'); }
    }
    pinta();
  }
  function pintaMarcas() {
    if (!lienzo || !lienzo.cv.isConnected) return;
    const r = lienzo.cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    const m = lienzo.marcas; m.width = W; m.height = H; m.style.width = r.width + 'px'; m.style.height = r.height + 'px';
    lienzo.dedo.style.width = r.width + 'px'; lienzo.dedo.style.height = r.height + 'px';
    const g = m.getContext('2d'); g.clearRect(0, 0, W, H);
    if (S.verDanos && S.danos) {
      const t = document.createElement('canvas'); t.width = W; t.height = H; const gt = t.getContext('2d');
      gt.drawImage(S.danos, 0, 0, W, H); gt.globalCompositeOperation = 'source-in'; gt.fillStyle = 'rgba(255,40,80,0.85)'; gt.fillRect(0, 0, W, H);
      // la luz de la máscara es blanca sobre negro: se usa como alfa
      const d = gt.getImageData(0, 0, W, H), o = document.createElement('canvas'); o.width = W; o.height = H; const go = o.getContext('2d');
      go.drawImage(S.danos, 0, 0, W, H); const mm = go.getImageData(0, 0, W, H).data;
      for (let i = 0; i < d.data.length; i += 4) { d.data[i] = 255; d.data[i + 1] = 40; d.data[i + 2] = 80; d.data[i + 3] = mm[i] > 127 ? 220 : 0; }
      g.putImageData(d, 0, 0);
    }
    trazar(g, W, H, S.trazos, true);
  }
  function trazar(g, W, H, trazos, colores, solo) {
    const lado = Math.min(W, H);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const t of trazos) {
      if (solo && t.m !== solo) continue;
      g.strokeStyle = colores ? (t.m === '+' ? 'rgba(255,60,100,0.6)' : 'rgba(80,220,255,0.55)') : '#fff';
      g.fillStyle = g.strokeStyle; g.lineWidth = Math.max(1, t.r * lado * 2);
      g.beginPath();
      t.p.forEach(([x, y], i) => i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H));
      if (t.p.length === 1) { g.arc(t.p[0][0] * W, t.p[0][1] * H, g.lineWidth / 2, 0, Math.PI * 2); g.fill(); } else g.stroke();
    }
  }
  function pincelar(capa) {
    let t = null;
    const pt = e => { const r = capa.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))]; };
    capa.addEventListener('pointerdown', e => { if (!S.pincel) return; e.preventDefault(); capa.setPointerCapture(e.pointerId); t = { m: S.pincel, r: S.radio, p: [pt(e)] }; S.trazos.push(t); S.deshechos = []; pintaMarcas(); });
    capa.addEventListener('pointermove', e => { if (!t) return; t.p.push(pt(e)); pintaMarcas(); });
    const fin = () => { if (t) { t = null; pinta(); } };
    capa.addEventListener('pointerup', fin); capa.addEventListener('pointercancel', fin);
  }
  function deshacer() {
    if (S.fase === 'ajustes' && S.trazos.length) { S.deshechos.push(S.trazos.pop()); pinta(); }
    else if (S.fase === 'listo' && S.v > 0) { S.v--; pinta(); }
  }
  function rehacer() {
    if (S.fase === 'ajustes' && S.deshechos.length) { S.trazos.push(S.deshechos.pop()); pinta(); }
    else if (S.fase === 'listo' && S.v < S.versiones.length - 1) { S.v++; pinta(); }
  }
  // las marcas del pincel, a tamaño de la foto: blanco = marcado
  async function mascaraDe(modo) {
    if (!S.trazos.some(t => t.m === modo)) return null;
    const f = S.foto, c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, f.w, f.h);
    trazar(g, f.w, f.h, S.trazos, false, modo);
    return new Promise(res => c.toBlob(b => res(b), 'image/png'));
  }

  // ---------- restaurar ----------
  async function restaurar() {
    if (S.ctl) return;
    if (BORRAR && !S.trazos.length) return toast('🖌️ Pinta primero encima de lo que quieres borrar.', 'warn');
    S.ctl = new AbortController(); S.fase = 'trabajando'; S.prog = { pct: 0, paso: '⏳ Preparando…', seg: 0 }; S.t0 = Date.now(); pinta();
    const reloj = setInterval(() => { if (S.fase === 'trabajando') { S.prog.seg = Math.round((Date.now() - S.t0) / 1000); pintaProgreso(); } }, 1000);
    try {
      const op = BORRAR ? { modo: 'borrar', formato: S.op.formato } : { tamano: S.op.tamano, reparar: S.op.reparar, caras: S.op.caras / 100, motor_caras: S.op.motorCaras, color: S.op.color, enderezar: S.op.enderezar, formato: S.op.formato };
      const r = await restaurarFoto(S.foto.blob, { mascara: await mascaraDe('+'), proteger: await mascaraDe('-'), opciones: op, signal: S.ctl.signal,
        onStatus: (paso, pct) => { S.prog.paso = paso; S.prog.pct = Math.max(S.prog.pct, Math.round(pct || 0)); pintaProgreso(); } });
      const url = URL.createObjectURL(r.blob), antesUrl = r.antes ? URL.createObjectURL(r.antes) : S.foto.url, mini = await miniatura(r.blob, 160);
      S.versiones = S.versiones.slice(0, S.v + 1);
      S.versiones.push({ blob: r.blob, url, antesUrl, res: r.res || {}, op: Object.assign({}, S.op), mini: mini.url });
      S.v = S.versiones.length - 1; S.fase = 'listo';
      guardarObra({ tipo: 'restaurada', nombre: S.foto.nombre + (BORRAR ? ' retocada' : ' restaurada'), blob: r.blob, antes: r.antes || S.foto.blob, info: r.res }).then(() => C.alGuardar && C.alGuardar()).catch(() => { });
      toast(BORRAR ? '🪄 ¡Borrado! Arrastra la línea para comparar.' : '✨ ¡Foto restaurada! Arrastra la línea para comparar.', 'ok', 5000);
      C.avisar && C.avisar(BORRAR ? '🪄 Tu foto está lista' : '🕰️ Tu foto restaurada está lista');
    } catch (e) {
      S.fase = 'ajustes';
      if (e.name !== 'AbortError') toast(e.message, 'bad', 9000); else toast('Cancelado.');
    } finally { clearInterval(reloj); S.ctl = null; pinta(); }
  }
  let anillo = null;
  function pintaTrabajando() {
    const R = 66, L = 2 * Math.PI * R;
    const v = h('circle.v', { cx: 75, cy: 75, r: R, 'stroke-dasharray': L, 'stroke-dashoffset': L });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 150 150');
    svg.innerHTML = '<defs><linearGradient id="bvAnillo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset=".5" stop-color="#22d3ee"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs><circle class="f" cx="75" cy="75" r="' + R + '"/><circle class="v" cx="75" cy="75" r="' + R + '" stroke-dasharray="' + L + '" stroke-dashoffset="' + L + '"/>';
    void v;
    anillo = { svg, L, num: h('b', '0 %'), paso: h('div.bv-paso', S.prog.paso), tiempo: h('div.bv-tiempo', ''), pasos: h('ul.bv-pasos') };
    const img = h('img', { src: S.foto.url, alt: 'Tu foto', style: { maxWidth: '100%', maxHeight: 'min(70vh, 720px)', display: 'block', filter: 'saturate(.85)' } });
    mount(escena, h('div', { style: { position: 'relative', lineHeight: 0 } }, img, h('div.bv-escaneo')),
      h('div.bv-progreso', { role: 'status', 'aria-live': 'polite' }, h('div.bv-anillo', svg, anillo.num), anillo.paso, anillo.tiempo,
        h('button.bv-btn.peq', { type: 'button', onclick: () => S.ctl && S.ctl.abort() }, 'Cancelar')));
    mount(panel, h('div.bv-op', h('h4', desktop.on ? '🖥️ Lo está haciendo este PC' : '🖥️ Lo está haciendo el PC del taller'), anillo.pasos),
      h('p.bv-ayuda', 'Puedes seguir usando Biouvision o el programa mientras tanto. ' + (desktop.on ? '' : 'Si cierras la app, el PC termina igual y te avisa.')));
    pintaProgreso();
  }
  function pintaProgreso() {
    if (!anillo || !anillo.svg.isConnected) return;
    const p = S.prog.pct, c = anillo.svg.querySelector('circle.v');
    c.setAttribute('stroke-dashoffset', String(anillo.L * (1 - p / 100)));
    anillo.num.textContent = p + ' %'; anillo.paso.textContent = S.prog.paso || '';
    const resta = p > 8 && S.prog.seg > 10 ? Math.max(0, Math.round(S.prog.seg * (100 - p) / p)) : null;
    anillo.tiempo.textContent = '⏱️ ' + mmss(S.prog.seg) + (resta != null ? ' · quedan unos ' + (resta < 60 ? resta + ' s' : Math.ceil(resta / 60) + ' min') : '');
    mount(anillo.pasos, pasos.map(([d, ic, t], i) => { const sig = pasos[i + 1] ? pasos[i + 1][0] : 101; const cls = p >= sig ? '.ya' : p >= d ? '.ahora' : ''; return h('li' + cls, h('i', p >= sig ? '✓' : ic), t); }));
  }

  // ---------- resultado ----------
  let comp = null;
  function pintaListo() {
    const v = S.versiones[S.v]; if (!v) { S.fase = 'ajustes'; return pinta(); }
    comp = comparador(v.antesUrl, v.url, { etiquetas: ['Antes', BORRAR ? 'Borrado' : 'Restaurada'] });
    const bLupa = h('button.bv-btn.peq', { type: 'button', onclick: () => bLupa.classList.toggle('on', comp.lupa()), title: 'Pasa el ratón por encima para ver el detalle a tamaño real' }, '🔍 Lupa');
    mount(escena, comp.el, h('div.bv-herr', bLupa,
      h('button.bv-btn.peq', { type: 'button', onclick: deshacer, disabled: S.v <= 0, title: 'Versión anterior (Ctrl+Z)', 'aria-label': 'Versión anterior' }, '↶'),
      h('button.bv-btn.peq', { type: 'button', onclick: rehacer, disabled: S.v >= S.versiones.length - 1, title: 'Versión siguiente (Ctrl+Y)', 'aria-label': 'Versión siguiente' }, '↷')));
    const r = v.res || {}, hecho = r.hecho || [], nombre = S.foto.nombre + (BORRAR ? '_retocada' : '_restaurada') + (S.versiones.length > 1 ? '_v' + (S.v + 1) : '') + '.' + (r.formato === 'png' ? 'png' : 'jpg');
    const archivo = () => new File([v.blob], nombre, { type: v.blob.type || 'image/jpeg' });
    mount(panel,
      h('div.bv-op', h('h4', { style: { fontSize: '24px' } }, BORRAR ? '🪄 ¡Borrado!' : '✨ ¡Restaurada!'),
        h('div.bv-logros', r.w ? h('span.gran', tamTxt(r.w, r.h)) : null,
          hecho.includes('borrado_ia') ? h('span', '🪄 Rellenado con IA (LaMa)') : hecho.includes('borrado') ? h('span', '🪄 Rellenado (modo sencillo)') : null,
          hecho.includes('reparada') ? h('span', hecho.includes('reparada_ia') ? '🩹 Daños reparados con IA' : '🩹 Daños reparados') : null,
          hecho.some(x => /^ampliada/.test(x)) ? h('span', '🔍 Ampliada con IA') : null,
          r.caras ? h('span', '🙂 ' + r.caras + (r.caras === 1 ? ' cara recuperada' : ' caras recuperadas')) : null,
          hecho.some(x => /^color_/.test(x)) ? h('span', '🎨 Con color') : null,
          hecho.includes('enderezada') ? h('span', '📐 Enderezada') : null,
          hecho.includes('contraste') ? h('span', '🌗 Contraste') : null)),
      (r.avisos || []).length ? h('div.bv-aviso', (r.avisos || []).join(' '), desktop.on ? h('div', { style: { marginTop: '8px' } }, h('button.bv-btn.peq', { type: 'button', onclick: () => C.irA('motores') }, '⬇️ Ver los motores')) : null) : null,
      S.versiones.length > 1 ? h('div.bv-op', h('h4', '🗂️ Tus versiones'), h('div.bv-versiones', S.versiones.map((x, i) => h('button.bv-version' + (i === S.v ? '.on' : ''), { type: 'button', 'aria-label': 'Versión ' + (i + 1), onclick: () => { S.v = i; pinta(); } }, h('img', { src: x.mini, alt: '' }), h('span', 'v' + (i + 1)))))) : null,
      h('div.bv-acciones',
        BORRAR ? h('button.bv-btn.prim.ancho', { type: 'button', onclick: seguir }, '🪄 Seguir borrando en esta foto') : null,
        h('button.bv-btn' + (BORRAR ? '' : '.prim') + '.ancho', { type: 'button', onclick: () => C.descargar(archivo()) }, '⬇️ Descargar' + (r.w && Math.max(r.w, r.h) >= 3800 ? ' en 4K' : '')),
        h('button.bv-btn', { type: 'button', onclick: () => C.guardarNube(archivo()) }, '☁️ A la biblioteca'),
        C.puedeInstagram() ? h('button.bv-btn', { type: 'button', onclick: () => C.aInstagram(archivo()) }, '📸 Instagram') : null,
        h('button.bv-btn', { type: 'button', onclick: () => C.aEstudio(archivo()) }, '🎨 Retocar'),
        h('button.bv-btn', { type: 'button', onclick: () => { S.fase = 'ajustes'; pinta(); } }, BORRAR ? '↩ Volver a pintar' : '🔁 Otros ajustes'),
        h('button.bv-btn.ancho', { type: 'button', onclick: () => { S.fase = 'elegir'; pinta(); elegir.click(); } }, '🆕 Otra foto')),
      h('p.bv-ayuda', 'Ya está guardada en «Mis fotos» de este aparato. ', h('span.bv-kbd', 'Ctrl+Z'), ' / ', h('span.bv-kbd', 'Ctrl+Y'), ' para cambiar de versión.'));
  }

  // v16.1 · el resultado pasa a ser la foto de trabajo: se puede borrar otra cosa encima (las versiones se conservan)
  async function seguir() {
    const v = S.versiones[S.v]; if (!v) return;
    try {
      const im = await cargarImg(v.url);
      S.foto = { blob: v.blob, url: v.url, w: im.naturalWidth, h: im.naturalHeight, nombre: S.foto.nombre, im };
      S.trazos = []; S.deshechos = []; S.pincel = '+'; S.fase = 'ajustes'; pinta();
    } catch (e) { toast(e.message, 'bad'); }
  }

  // ---------- motores (qué hay en este PC) ----------
  function estadoMotores() {
    const box = h('div.bv-motores', h('span', '…'));
    (BORRAR ? C.estadoGrupo('borrar') : C.estadoRestaurar()).then(e => {
      if (!box.isConnected) return;
      if (!e) return mount(box, h('span', '⏳ Mirando el motor…'));
      if (e.pc === 'movil') return mount(box, h('span', e.texto));
      mount(box, e.lineas.map(([ok, t]) => h('div', ok ? '✅ ' : '⬜ ', h('b', t[0]), ' ', t[1] || '')),
        e.falta ? h('button.bv-btn.peq', { type: 'button', style: { marginTop: '6px' }, onclick: () => C.irA('motores') }, '⬇️ Descargar lo que falta') : null);
    }).catch(() => { });
    return box;
  }
  addEventListener('resize', () => { if (S.fase === 'ajustes' && el.isConnected) pintaMarcas(); });
  pinta();
  return { abrir };
}
