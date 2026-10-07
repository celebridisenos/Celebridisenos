// ================= v15.0 · EDITOR VISUAL DE ETIQUETAS =================
// «✏️ Editar diseño»: la etiqueta a la resolución REAL de la impresora y, encima, cada pieza se coge con el ratón o
// el dedo: mover, cambiar de tamaño (esquinas), girar (asa de arriba). A la derecha, sus datos exactos en mm, letra,
// tamaño, alineación… Deshacer / Rehacer (Ctrl+Z / Ctrl+Y), «Imprimir prueba», «Guardar plantilla» y
// «Usar como predeterminada» (todas las etiquetas nuevas de ese tipo salen con este diseño).
import { h, mount, btn, modal, toast, field, sel, inp, area, confirmDlg } from '../ui.js';
import { S, api, can, emit } from '../store.js';
import { desktop } from '../desktop.js';
import * as PL from '../plantillas.js';
import { code128, modulos128 } from '../code128.js';

const r1 = v => Math.round(v * 10) / 10;
const snap = (v, paso) => Math.round(v / paso) * paso;
const copia = o => JSON.parse(JSON.stringify(o));
const NOMBRE_PIEZA = { texto: 'Texto', logo: 'Logo', qr: 'QR', barras: 'Código de barras', caja: 'Caja' };
const ICONO = { texto: '🔤', logo: '🖼️', qr: '▦', barras: '║', caja: '▭' };
const etiquetaDe = e => e.t === 'texto' ? (String(e.texto || '').split('\n')[0].slice(0, 28) || 'Texto vacío') : e.t === 'caja' && (e.h <= 1 || e.w <= 1) ? 'Línea' : NOMBRE_PIEZA[e.t];
const BKEY = tpl => 'cd.ee.borrador.' + tpl;
let fuentesRecursos = null; // [{ id:'x:Nombre', t, fa }]
async function cargarFuentesRecursos() {
  if (fuentesRecursos || !desktop.on) return fuentesRecursos || [];
  fuentesRecursos = [];
  try {
    const F = await import('../biou/filtros.js'), raiz = await F.carpetaRecursos();
    if (!raiz) return fuentesRecursos;
    const l = await desktop.list(raiz + (raiz.includes('\\') ? '\\' : '/') + 'FUENTES');
    fuentesRecursos = (l.entries || []).filter(x => x.type === 'file' && /\.(ttf|otf)$/i.test(x.name)).slice(0, 400)
      .map(x => { const n = x.name.replace(/\.(ttf|otf)$/i, '').replace(/["<>\\]/g, '').slice(0, 60); return { id: 'x:' + n, t: n, fa: x.path }; });
  } catch (e) { }
  return fuentesRecursos;
}

// tpl: tipo de etiqueta · opts.datos: datos reales (el pedido que se está mirando) · devuelve true si se guardó algo
export async function abrirEditor(tpl, opts = {}) {
  if (!PL.EDITABLES.includes(tpl)) { toast('Esta etiqueta no se diseña aquí.', 'warn'); return false; }
  const L = await import('../labels.js');
  const T0 = await L.targetFor(tpl), dpi = T0.dpi, tam = T0.size;
  const puedeGuardar = can('config.editar');
  const datosReales = opts.datos || null;
  let datos = datosReales || PL.EJEMPLO[tpl];
  // diseño de partida: el que se pida, el predeterminado, o el de siempre hecho piezas
  const base = (opts.plantillaId && PL.porId(opts.plantillaId)) || PL.activa(tpl) || PL.lista(tpl)[0] || null;
  let P = base ? copia(base) : PL.nueva(tpl, tam, 'Mi diseño');
  let selId = null, hist = [], fut = [], dirty = false, guardo = false, zoom = 'ajustar', escala = 0, claveEscala = '', ultGrupo = '', ultT = 0;
  await PL.preparar(P);

  // ---------- historial (deshacer / rehacer) ----------
  const borrador = () => { try { if (dirty) localStorage.setItem(BKEY(tpl), JSON.stringify(P)); else localStorage.removeItem(BKEY(tpl)); } catch (e) { } };
  function editar(fn, grupo) {
    const antes = JSON.stringify(P), selAntes = selId; fn(); const despues = JSON.stringify(P);
    if (selId !== selAntes) lado(); else refrescaNums();
    if (antes === despues) return;
    const ahora = Date.now();
    if (!(grupo && grupo === ultGrupo && ahora - ultT < 1500)) { hist.push(antes); if (hist.length > 100) hist.shift(); fut = []; }
    ultGrupo = grupo || ''; ultT = ahora; dirty = true; borrador();
    pintar(); botonesHist();
  }
  function deshacer() { if (!hist.length) return; fut.push(JSON.stringify(P)); P = JSON.parse(hist.pop()); ultGrupo = ''; dirty = true; borrador(); if (selId && !pieza(selId)) selId = null; pintar(); lado(); botonesHist(); }
  function rehacer() { if (!fut.length) return; hist.push(JSON.stringify(P)); P = JSON.parse(fut.pop()); ultGrupo = ''; dirty = true; borrador(); if (selId && !pieza(selId)) selId = null; pintar(); lado(); botonesHist(); }
  const pieza = id => (P.els || []).find(e => e.id === id);

  // ---------- interfaz ----------
  const bUndo = btn('Deshacer', deshacer, { cls: 'sm ghost', title: 'Deshacer (Ctrl+Z)' }), bRedo = btn('Rehacer', rehacer, { cls: 'sm ghost', title: 'Rehacer (Ctrl+Y)' });
  bUndo.prepend('↶ '); bRedo.prepend('↷ ');
  bUndo.setAttribute('aria-label', 'Deshacer'); bRedo.setAttribute('aria-label', 'Rehacer');
  const botonesHist = () => { bUndo.disabled = !hist.length; bRedo.disabled = !fut.length; };
  const selDiseno = sel([], '');
  const rellenaDisenos = () => {
    const def = PL.idPredeterminada(tpl);
    mount(selDiseno, ...PL.lista(tpl).map(p => h('option', { value: p.id }, (p.id === def ? '★ ' : '') + p.nombre)), h('option', { value: '__nuevo' }, '➕ Nuevo diseño (desde el de siempre)'));
    selDiseno.value = P.id || '__nuevo';
  };
  selDiseno.setAttribute('aria-label', 'Diseño');
  selDiseno.onchange = async () => {
    if (dirty && !(await confirmDlg('Cambiar de diseño', 'Hay cambios sin guardar en «' + P.nombre + '». ¿Los dejas sin guardar?', 'Dejar sin guardar', true))) { selDiseno.value = P.id || '__nuevo'; return; }
    P = selDiseno.value === '__nuevo' ? PL.nueva(tpl, tam, 'Diseño ' + (PL.lista(tpl).length + 1)) : copia(PL.porId(selDiseno.value));
    hist = []; fut = []; dirty = false; selId = null; borrador(); await PL.preparar(P); pintar(); lado(); botonesHist();
  };
  const selZoom = sel([{ v: 'ajustar', t: 'Ajustar a la pantalla' }, { v: 'real', t: 'Tamaño real' }, { v: '2', t: 'Grande (×2)' }], zoom, { 'aria-label': 'Zoom' });
  selZoom.onchange = () => { zoom = selZoom.value; pintar(); };
  const selDatos = datosReales ? sel([{ v: 'real', t: 'Con los datos de este pedido' }, { v: 'ejemplo', t: 'Con datos de ejemplo' }], 'real', { 'aria-label': 'Datos' }) : null;
  if (selDatos) selDatos.onchange = () => { datos = selDatos.value === 'real' ? datosReales : PL.EJEMPLO[tpl]; pintar(); lado(); };
  const add = (tipo, txt) => btn(txt, async () => { editar(() => { const e = PL.pieza(tipo, P); P.els.push(e); selId = e.id; }); if (tipo === 'logo') { await PL.preparar(P); pintar(); lado(); } }, { cls: 'sm' });
  const paper = h('div.ee-paper'), ov = h('div.ee-ov'), safe = h('div.ee-safe'), guia = h('div.ee-guia');
  const stage = h('div.ee-stage', paper), side = h('div.ee-side'), info = h('div.ee-info'), avisos = h('div.ee-avisos');
  paper.append(safe, ov, guia);
  const body = h('div.ee',
    h('div.ee-top', field('Diseño', selDiseno), h('div.row', bUndo, bRedo), field('Ver', selZoom), selDatos ? field('Vista previa', selDatos) : null),
    h('div.ee-add', h('span.tiny.muted', 'Añadir:'), add('texto', '+ Texto'), add('logo', '+ Logo'), add('qr', '+ QR'), add('barras', '+ Código de barras'), add('linea', '+ Línea'), add('caja', '+ Caja')),
    h('div.ee-main', stage, side), avisos, info);

  const m = modal('✏️ Diseño de la etiqueta · ' + L.TEMPLATES[tpl].t, body, close => [
    btn('Cerrar', close),
    btn('Imprimir prueba', () => prueba(), { icon: 'printer', title: 'Saca una etiqueta con este diseño (aunque no esté guardado)' }),
    btn('Exportar', () => exportar(), { icon: 'download', title: 'Guardar el diseño como imagen (PNG) o como PDF a tamaño real' }), // v16
    puedeGuardar ? btn('Duplicar', () => duplicarDiseno(), { icon: 'copy', title: 'Crear otro diseño a partir de este' }) : null,
    puedeGuardar ? btn('Guardar plantilla', () => guardar(false), { icon: 'check' }) : null,
    puedeGuardar ? btn('⭐ Usar como predeterminada', () => guardar(true), { cls: 'primary', title: 'Guarda el diseño y todas las etiquetas nuevas de este tipo salen así' }) : null
  ], { size: 'full', sticky: true, onclose: () => { document.removeEventListener('keydown', teclas); window.removeEventListener('resize', pintar); if (dirty) toast('El diseño no se ha guardado. Al volver a abrir el editor puedes recuperarlo.', 'warn', 7000, { t: 'Recuperar ahora', on: () => abrirEditor(tpl, Object.assign({}, opts, { recuperar: true })) }); fin(); } });
  m.el.classList.add('ee-modal');
  let fin; const cerrado = new Promise(res => { fin = () => res(guardo); });

  // ---------- dibujo ----------
  let rafPend = false;
  function pintar() { if (rafPend) return; rafPend = true; requestAnimationFrame(() => { rafPend = false; pintarYa(); }); }
  function pintarYa() {
    // la escala solo cambia al abrir, al cambiar el zoom, el tamaño de la etiqueta o la ventana (no al aparecer un aviso)
    const clave = zoom + '|' + P.w + '|' + P.h + '|' + window.innerWidth + '|' + window.innerHeight;
    if (clave !== claveEscala || !(escala > 0)) {
      const disp = Math.max(160, stage.clientWidth - 24), alto = Math.max(200, stage.clientHeight - 24);
      escala = zoom === 'real' ? 96 / 25.4 : zoom === '2' ? 2 * 96 / 25.4 : Math.max(1, Math.min(disp / P.w, alto / P.h, 12));
      claveEscala = clave;
    }
    const cv = PL.dibujar(P, datos, dpi, { w: P.w, h: P.h }, { editor: true });
    cv.className = 'ee-cv';
    paper.style.width = (P.w * escala) + 'px'; paper.style.height = (P.h * escala) + 'px';
    const viejo = paper.querySelector('.ee-cv'); if (viejo) viejo.replaceWith(cv); else paper.prepend(cv);
    const mg = Number(P.margen) || 0;
    Object.assign(safe.style, { left: mg * escala + 'px', top: mg * escala + 'px', width: (P.w - 2 * mg) * escala + 'px', height: (P.h - 2 * mg) * escala + 'px', display: mg ? '' : 'none' });
    const fueraIds = new Set(PL.fuera(P).map(e => e.id));
    mount(ov, ...(P.els || []).filter(e => !e.oculto).map(e => {
      const b = h('div.ee-box' + (e.id === selId ? '.sel' : '') + (fueraIds.has(e.id) ? '.fuera' : ''), { dataset: { id: e.id }, title: etiquetaDe(e) + ' · arrastra para mover', style: { left: e.x * escala + 'px', top: e.y * escala + 'px', width: e.w * escala + 'px', height: e.h * escala + 'px', transform: e.r ? 'rotate(' + e.r + 'deg)' : '' } });
      if (e.id === selId) ['nw', 'ne', 'sw', 'se'].forEach(k => b.append(h('div.ee-h.' + k, { dataset: { h: k }, title: 'Cambiar el tamaño' }))), b.append(h('div.ee-rot', { dataset: { h: 'rot' }, title: 'Girar (Mayús: de 15 en 15°)' }));
      return b;
    }));
    // avisos y datos de impresión
    const f = PL.fuera(P), difTam = Math.abs(tam.w - P.w) > 0.5 || Math.abs(tam.h - P.h) > 0.5;
    mount(avisos,
      f.length ? h('div.ee-aviso', '⚠️ ' + (f.length === 1 ? '1 pieza se sale' : f.length + ' piezas se salen') + ' del área imprimible (margen de ' + mg + ' mm). ', btn('Ajustar al área imprimible', () => editar(() => PL.ajustarArea(P)), { cls: 'sm' })) : null,
      difTam ? h('div.ee-aviso', '📏 En este aparato esta etiqueta se imprime a ' + tam.w + ' × ' + tam.h + ' mm y el diseño mide ' + P.w + ' × ' + P.h + ' mm: se ajustará en proporción. ', btn('Pasar el diseño a ' + tam.w + ' × ' + tam.h + ' mm', () => editar(() => escalarA(tam.w, tam.h)), { cls: 'sm' })) : null);
    info.textContent = 'Vista previa REAL: ' + P.w + ' × ' + P.h + ' mm · ' + dpi + ' ppp · ' + (T0.pr ? 'impresora ' + T0.pr.name : 'PDF de tamaño exacto') + (zoom === 'real' ? ' · Tamaño real en pantalla (puede variar un poco según la pantalla; la impresión es exacta)' : '') + (PL.idPredeterminada(tpl) && PL.idPredeterminada(tpl) === P.id ? ' · ★ Es la predeterminada' : '');
  }
  function escalarA(w, hh) {
    const sx = w / P.w, sy = hh / P.h;
    P.els.forEach(e => { e.x = r1(e.x * sx); e.y = r1(e.y * sy); e.w = r1(e.w * sx); e.h = r1(e.h * sy); if (e.t === 'qr') { const s = Math.min(e.w, e.h); e.w = e.h = s; } if (e.t === 'texto') e.pt = r1(e.pt * Math.min(sx, sy)); });
    P.w = w; P.h = hh;
  }

  // ---------- coger, mover, cambiar de tamaño y girar ----------
  ov.addEventListener('pointerdown', ev => {
    const box = ev.target.closest('.ee-box');
    if (!box) { if (selId) { selId = null; pintar(); lado(); } return; }
    const e = pieza(box.dataset.id); if (!e) return;
    if (selId !== e.id) { selId = e.id; lado(); pintar(); }
    ev.preventDefault();
    const modo = (ev.target.dataset && ev.target.dataset.h) || 'mover', e0 = copia(e), x0 = ev.clientX, y0 = ev.clientY, antes = JSON.stringify(P), k0 = escala;
    const pr = paper.getBoundingClientRect();
    try { ov.setPointerCapture(ev.pointerId); } catch (x) { }
    const mover = mv => {
      const dx = (mv.clientX - x0) / k0, dy = (mv.clientY - y0) / k0;
      guia.style.display = 'none';
      if (modo === 'mover') {
        e.x = r1(snap(e0.x + dx, 0.5)); e.y = r1(snap(e0.y + dy, 0.5));
        if (Math.abs(e.x + e.w / 2 - P.w / 2) < 1.2) { e.x = r1(P.w / 2 - e.w / 2); guia.style.display = ''; guia.style.left = (P.w / 2) * escala + 'px'; }
      } else if (modo === 'rot') {
        const cx = pr.left + (e0.x + e0.w / 2) * k0, cy = pr.top + (e0.y + e0.h / 2) * k0;
        let a = Math.atan2(mv.clientY - cy, mv.clientX - cx) * 180 / Math.PI + 90;
        a = mv.shiftKey ? snap(a, 15) : Math.round(a);
        const n90 = snap(a, 90); if (Math.abs(a - n90) < 4) a = n90;
        a = ((a + 540) % 360) - 180; e.r = a === -180 ? 180 : a;
      } else {
        const sx = modo.includes('e') ? 1 : -1, sy = modo.includes('s') ? 1 : -1, rad = (e0.r || 0) * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
        const lx = dx * c + dy * s, ly = -dx * s + dy * c;
        let w = Math.max(1, e0.w + sx * lx), hh = Math.max(0.2, e0.h + sy * ly);
        if (e.t === 'qr' || (e.t === 'logo' && e.prop !== false) || mv.shiftKey) { const ra = e0.w / e0.h; if (Math.abs(w / e0.w - 1) > Math.abs(hh / e0.h - 1)) hh = w / ra; else w = hh * ra; }
        w = r1(w); hh = r1(hh);
        const ox = sx * (w - e0.w) / 2, oy = sy * (hh - e0.h) / 2, gx = ox * c - oy * s, gy = ox * s + oy * c;
        const cx = e0.x + e0.w / 2 + gx, cy = e0.y + e0.h / 2 + gy;
        e.w = w; e.h = hh; e.x = r1(cx - w / 2); e.y = r1(cy - hh / 2);
      }
      pintar(); refrescaNums();
    };
    const soltar = () => {
      ov.removeEventListener('pointermove', mover); ov.removeEventListener('pointerup', soltar); ov.removeEventListener('pointercancel', soltar);
      guia.style.display = 'none';
      if (JSON.stringify(P) !== antes) { hist.push(antes); if (hist.length > 100) hist.shift(); fut = []; ultGrupo = ''; dirty = true; borrador(); botonesHist(); lado(); }
    };
    ov.addEventListener('pointermove', mover); ov.addEventListener('pointerup', soltar); ov.addEventListener('pointercancel', soltar);
  });
  function teclas(ev) {
    if (!document.body.contains(m.el)) return;
    const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target && ev.target.tagName) || '');
    const ctrl = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
    if (ctrl && k === 'z' && !ev.shiftKey && !enCampo) { ev.preventDefault(); deshacer(); return; }
    if (ctrl && (k === 'y' || (k === 'z' && ev.shiftKey)) && !enCampo) { ev.preventDefault(); rehacer(); return; }
    if (enCampo || !selId) return;
    const e = pieza(selId); if (!e) return;
    const paso = ev.shiftKey ? 5 : 0.5, mov = { arrowleft: [-paso, 0], arrowright: [paso, 0], arrowup: [0, -paso], arrowdown: [0, paso] }[k];
    if (mov) { ev.preventDefault(); editar(() => { e.x = r1(e.x + mov[0]); e.y = r1(e.y + mov[1]); }, 'teclas'); refrescaNums(); return; }
    if (k === 'delete' || k === 'backspace') { ev.preventDefault(); borrarSel(); return; }
    if (ctrl && k === 'd') { ev.preventDefault(); duplicarSel(); }
  }
  document.addEventListener('keydown', teclas);
  window.addEventListener('resize', pintar);
  const borrarSel = () => { const id = selId; editar(() => { P.els = P.els.filter(e => e.id !== id); selId = null; }); lado(); };
  const duplicarSel = () => { const e = pieza(selId); if (!e) return; editar(() => { const c = copia(e); c.id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); c.x = r1(c.x + 3); c.y = r1(c.y + 3); P.els.push(c); selId = c.id; }); lado(); };

  // ---------- panel derecho ----------
  let nums = {};
  function refrescaNums() { const e = pieza(selId); if (!e) return; for (const k in nums) if (document.activeElement !== nums[k]) nums[k].value = e[k] || 0; }
  const num = (e, k, txt, attrs, grupo) => { const i = inp(Object.assign({ type: 'number', step: 0.5, value: e[k] || 0, 'aria-label': txt }, attrs || {})); i.oninput = () => { const v = Number(i.value); if (isFinite(v)) editar(() => { e[k] = v; if (e.t === 'qr' && (k === 'w' || k === 'h')) e.w = e.h = v; }, grupo || ('n' + k + e.id)); }; nums[k] = i; return field(txt, i); };
  const varsSel = (alInsertar) => {
    const s = sel([{ v: '', t: '➕ Insertar un dato…' }].concat((PL.VARS[tpl] || []).concat(PL.VARS_COMUNES).map(([k, t]) => ({ v: k, t }))), '', { 'aria-label': 'Insertar un dato' });
    s.onchange = () => { if (s.value) alInsertar('{' + s.value + '}'); s.value = ''; };
    return s;
  };
  async function lado() {
    nums = {};
    const e = pieza(selId);
    if (!e) return ladoDiseno();
    const comunes = h('div.ee-grid', num(e, 'x', 'X (mm)'), num(e, 'y', 'Y (mm)'), num(e, 'w', 'Ancho (mm)', { min: 0.2 }), num(e, 'h', 'Alto (mm)', { min: 0.2 }), num(e, 'r', 'Giro (°)', { step: 1 }));
    const giros = h('div.row.wrap', btn('⟲ 90°', () => editar(() => { e.r = ((Math.round(e.r || 0) - 90 + 540) % 360) - 180; }), { cls: 'sm ghost' }), btn('⟳ 90°', () => editar(() => { e.r = ((Math.round(e.r || 0) + 90 + 540) % 360) - 180; }), { cls: 'sm ghost' }), btn('Recto', () => editar(() => { e.r = 0; }), { cls: 'sm ghost' }),
      btn('Centrar', () => editar(() => { e.x = r1((P.w - e.w) / 2); }), { cls: 'sm ghost', title: 'Centrar a lo ancho' }));
    const orden = h('div.row.wrap', btn('Delante', () => editar(() => { P.els = P.els.filter(x => x !== e).concat([e]); }), { cls: 'sm ghost', title: 'Traer delante' }), btn('Detrás', () => editar(() => { P.els = [e].concat(P.els.filter(x => x !== e)); }), { cls: 'sm ghost', title: 'Enviar detrás' }),
      btn('Duplicar', duplicarSel, { cls: 'sm ghost' }), btn('Borrar', borrarSel, { cls: 'sm danger', icon: 'trash' }));
    let propio = null;
    if (e.t === 'texto') propio = await ladoTexto(e);
    else if (e.t === 'logo') propio = ladoLogo(e);
    else if (e.t === 'qr') propio = h('div.col', h('p.small', 'El QR lleva el enlace del pedido o del producto: se rellena solo y no se cambia.'), e.w < 15 ? h('p.small.warn-t', '⚠️ Con menos de 15 mm algunos móviles no lo leen bien.') : h('p.small.ok-t', '✅ Buen tamaño para leerlo con el móvil.'));
    else if (e.t === 'barras') propio = ladoBarras(e);
    else if (e.t === 'caja') propio = ladoCaja(e);
    mount(side, h('div.row', btn('← Todas las piezas', () => { selId = null; pintar(); lado(); }, { cls: 'sm ghost' })), h('h3', ICONO[e.t] + ' ' + etiquetaDe(e)), propio, h('h4', 'Posición y tamaño'), comunes, giros, h('h4', 'Orden'), orden);
  }
  function ladoDiseno() {
    const nom = inp({ value: P.nombre, maxlength: 50, 'aria-label': 'Nombre del diseño' }); nom.oninput = () => editar(() => { P.nombre = nom.value; }, 'nombre');
    const w = inp({ type: 'number', min: 15, max: 300, value: P.w, 'aria-label': 'Ancho de la etiqueta' }), hh = inp({ type: 'number', min: 15, max: 420, value: P.h, 'aria-label': 'Alto de la etiqueta' });
    const tamOk = () => { const W = Number(w.value), H = Number(hh.value); if (W >= 15 && H >= 15) editar(() => escalarA(W, H)); };
    w.onchange = tamOk; hh.onchange = tamOk;
    const mg = inp({ type: 'number', min: 0, max: 15, step: 0.5, value: P.margen, 'aria-label': 'Margen' }); mg.oninput = () => editar(() => { P.margen = Number(mg.value) || 0; }, 'margen');
    const def = PL.idPredeterminada(tpl);
    mount(side, h('h3', 'Diseño'), field('Nombre', nom), h('div.ee-grid', field('Ancho (mm)', w), field('Alto (mm)', hh), field('Margen (mm)', mg, 'Lo que la impresora no llega a pintar')),
      btn('Ajustar todo al área imprimible', () => editar(() => PL.ajustarArea(P)), { cls: 'sm' }),
      h('h4', '✨ Estilos'), h('p.tiny.muted', 'Viste el diseño de siempre con un estilo y luego retócalo. Se puede deshacer.'),
      h('div.row.wrap.ee-estilos', PL.ESTILOS.map(x => btn(x[1], () => { const viejos = PL.ESTILOS.map(e => e[1]); editar(() => { const N = PL.conEstilo(tpl, { w: P.w, h: P.h }, x[0]); P.els = N.els; if (!P.id || /^Mi diseño/.test(P.nombre) || viejos.includes(P.nombre)) P.nombre = N.nombre; selId = null; }); lado(); }, { cls: 'sm' }))),
      h('h4', 'Piezas (' + P.els.length + ')'), h('p.tiny.muted', 'Toca una pieza en la etiqueta o en esta lista. Flechas: mover · Supr: borrar · Ctrl+D: duplicar.'),
      h('div.list.boxed.ee-capas', P.els.slice().reverse().map(e => h('div.item', { onclick: () => { selId = e.id; pintar(); lado(); } }, h('span', ICONO[e.t]), h('span.grow.small', etiquetaDe(e)),
        btn(e.oculto ? '🙈' : '👁', ev => { ev.stopPropagation(); editar(() => { e.oculto = !e.oculto; }); lado(); }, { cls: 'sm ghost icon', title: e.oculto ? 'Mostrar' : 'Ocultar' })))),
      puedeGuardar && P.id && def === P.id ? h('div.col', h('p.small.ok-t', '★ Es el diseño predeterminado: las etiquetas de este tipo salen así.'), btn('Volver al diseño de siempre', async () => { try { S.cfg = (await api('plantillas.predeterminada', { tpl, id: '' })).config; emit(); guardo = true; toast('Las etiquetas vuelven a salir con el diseño de siempre.', 'ok'); rellenaDisenos(); pintar(); lado(); } catch (x) { toast(x.message, 'bad'); } }, { cls: 'sm ghost' })) : null,
      puedeGuardar && P.id ? btn('Borrar este diseño', async () => {
        if (!(await confirmDlg('Borrar diseño', '¿Borrar «' + P.nombre + '»? Si era el predeterminado, las etiquetas vuelven a salir con el diseño de siempre.', 'Borrar', true))) return;
        try { S.cfg = (await api('plantillas.borrar', { id: P.id })).config; emit(); guardo = true; P = PL.nueva(tpl, tam, 'Mi diseño'); hist = []; fut = []; dirty = false; borrador(); rellenaDisenos(); pintar(); lado(); botonesHist(); toast('Diseño borrado', 'ok'); } catch (x) { toast(x.message, 'bad'); }
      }, { cls: 'sm danger', icon: 'trash' }) : null,
      !puedeGuardar ? h('p.small.muted', 'Puedes probar el diseño e imprimir una prueba. Solo quien puede cambiar la configuración lo guarda.') : null);
  }
  async function ladoTexto(e) {
    const ta = area({ rows: 3, value: e.texto || '', 'aria-label': 'Texto' });
    ta.oninput = () => editar(() => { e.texto = ta.value; }, 'texto' + e.id);
    const ins = varsSel(tok => { const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a; ta.value = ta.value.slice(0, a) + tok + ta.value.slice(b); editar(() => { e.texto = ta.value; }); ta.focus(); ta.selectionStart = ta.selectionEnd = a + tok.length; });
    const extra = await cargarFuentesRecursos();
    const fu = sel(PL.FUENTES.map(f => ({ v: f.id, t: f.t })).concat(extra.length ? extra.map(f => ({ v: f.id, t: '📁 ' + f.t })) : []), e.f || 'segoe', { 'aria-label': 'Letra' });
    if (e.f && e.f.indexOf('x:') === 0 && !extra.some(f => f.id === e.f)) fu.append(h('option', { value: e.f, selected: true }, '📁 ' + e.f.slice(2)));
    fu.onchange = async () => { const x = extra.find(f => f.id === fu.value); editar(() => { e.f = fu.value; if (x) e.fa = x.fa; else delete e.fa; }); await PL.preparar(P); pintar(); };
    const pt = inp({ type: 'number', min: 3, max: 120, step: 0.5, value: e.pt, 'aria-label': 'Tamaño de letra' }); pt.oninput = () => { const v = Number(pt.value); if (v >= 3) editar(() => { e.pt = v; }, 'pt' + e.id); };
    const gr = sel([{ v: 400, t: 'Normal' }, { v: 600, t: 'Seminegrita' }, { v: 700, t: 'Negrita' }, { v: 800, t: 'Extra negrita' }], e.b || 400, { 'aria-label': 'Grosor' }); gr.onchange = () => editar(() => { e.b = Number(gr.value); });
    const grupoBtn = (vals, k) => h('div.ee-seg', vals.map(([v, t, tit]) => btn(t, () => { editar(() => { e[k] = v; }); lado(); }, { cls: 'sm' + (e[k] === v ? ' primary' : ' ghost'), title: tit })));
    const color = sel([{ v: '#000000', t: 'Negro' }, { v: '#ffffff', t: 'Blanco (sobre negro)' }, { v: 'otro', t: 'Otro color (impresora de tinta)' }], ['#000000', '#ffffff'].includes(e.col) ? e.col : 'otro', { 'aria-label': 'Color' });
    const picker = h('input', { type: 'color', value: e.col || '#000000', 'aria-label': 'Elegir color', style: { display: color.value === 'otro' ? '' : 'none' } });
    color.onchange = () => { if (color.value !== 'otro') editar(() => { e.col = color.value; }); picker.style.display = color.value === 'otro' ? '' : 'none'; };
    picker.oninput = () => editar(() => { e.col = picker.value; }, 'col' + e.id);
    const aj = h('input', { type: 'checkbox', checked: e.aj !== false }); aj.onchange = () => editar(() => { e.aj = aj.checked; });
    const may = h('input', { type: 'checkbox', checked: !!e.may }); may.onchange = () => editar(() => { e.may = may.checked; });
    const lin = inp({ type: 'number', min: 0, max: 20, value: e.lin || 0, 'aria-label': 'Máximo de líneas' }); lin.oninput = () => editar(() => { e.lin = Math.max(0, Math.round(Number(lin.value) || 0)); }, 'lin' + e.id);
    return h('div.col',
      field('Texto', ta, 'Los datos entre llaves {…} se rellenan solos con los del pedido.'), ins,
      field('Letra', fu, extra.length ? '📁 = de tu carpeta RECURSOS\\FUENTES (en este PC)' : null),
      h('div.ee-grid', field('Tamaño (pt)', pt), field('Grosor', gr), field('Máx. líneas', lin, '0 = sin límite')),
      field('Alineación', grupoBtn([['l', '⯇ Izq.', 'A la izquierda'], ['c', '≡ Centro', 'Centrado'], ['r', 'Der. ⯈', 'A la derecha']], 'al')),
      field('Vertical', grupoBtn([['t', 'Arriba'], ['m', 'Centro'], ['b', 'Abajo']], 'va')),
      field('Color', h('div.row', color, picker)),
      h('label.check.small', aj, 'Hacer la letra más pequeña si no cabe en la caja'),
      h('label.check.small', may, 'TODO EN MAYÚSCULAS'));
  }
  function ladoLogo(e) {
    const subidos = (S.t.archivos || []).filter(a => a.tipo === 'foto' && (a.rutaLocal === 'LOGOS' || a.id === e.src));
    const src = sel([{ v: 'empresa', t: 'Logo de la empresa (Configuración)' }].concat(subidos.map(a => ({ v: a.id, t: '🖼️ ' + a.nombre }))), e.src || 'empresa', { 'aria-label': 'Imagen del logo' });
    src.onchange = async () => { editar(() => { e.src = src.value; }); await PL.preparar(P); pintar(); lado(); };
    const fi = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', style: { display: 'none' } });
    fi.onchange = async () => {
      const f = fi.files && fi.files[0]; if (!f) return;
      toast('Subiendo el logo en alta calidad…');
      try { const F = await import('../files.js'); const a = await F.uploadFile(f, { entidad: '', entidadId: '', rutaLocal: 'LOGOS', original: true }); PL.olvidarImagen(a.id); editar(() => { e.src = a.id; }); await PL.preparar(P); pintar(); lado(); toast('Logo listo. Guarda el diseño para que lo use todo el equipo.', 'ok'); }
      catch (x) { toast(x.message, 'bad', 8000); }
    };
    const im = PL.imagen(e.src || 'empresa'), ppp = PL.ppLogo(e, im), necesita = Math.ceil(e.w / 25.4 * 300);
    const calidad = !im ? h('p.small.warn-t', '⚠️ No se ha podido cargar la imagen.') : ppp >= 250 ? h('p.small.ok-t', '✅ Nítido: ' + ppp + ' ppp a este tamaño.')
      : ppp >= 150 ? h('p.small', '🟡 Aceptable: ' + ppp + ' ppp. Para que salga perfecto, sube el logo de al menos ' + necesita + ' píxeles de ancho.')
      : h('p.small.warn-t', '⚠️ Saldrá borroso (' + ppp + ' ppp). Sube el logo de al menos ' + necesita + ' píxeles de ancho.');
    const prop = h('input', { type: 'checkbox', checked: e.prop !== false }); prop.onchange = () => editar(() => { e.prop = prop.checked; });
    const tr = h('input', { type: 'checkbox', checked: e.tramar !== false }); tr.onchange = () => editar(() => { e.tramar = tr.checked; });
    const al = h('div.ee-seg', [['l', 'Izq.'], ['c', 'Centro'], ['r', 'Der.']].map(([v, t]) => btn(t, () => { editar(() => { e.al = v; }); lado(); }, { cls: 'sm' + ((e.al || 'c') === v ? ' primary' : ' ghost') })));
    return h('div.col', field('Imagen', src), btn('Subir logo en alta calidad (PNG con fondo transparente)', () => fi.click(), { cls: 'sm', icon: 'upload' }), fi, calidad,
      h('label.check.small', prop, 'Mantener la proporción (no se deforma)'), field('Dentro de su caja', al),
      h('label.check.small', tr, 'En impresoras térmicas, tramar el logo (los grises salen como puntitos)'));
  }
  function ladoBarras(e) {
    const v = inp({ value: e.valor || '', 'aria-label': 'Qué lleva el código de barras' }); v.oninput = () => editar(() => { e.valor = v.value; }, 'val' + e.id);
    const ins = varsSel(tok => { v.value = tok; editar(() => { e.valor = tok; }); lado(); });
    const txt = h('input', { type: 'checkbox', checked: e.txt !== false }); txt.onchange = () => editar(() => { e.txt = txt.checked; });
    const valor = PL.rellenar(e.valor || '', datos).split('\n')[0], an = code128(valor), mods = an.length ? modulos128(an) : 0, px = mods ? Math.floor(e.w / 25.4 * dpi / mods) : 0;
    return h('div.col', field('Lleva', v, 'Normalmente el código CEB o el nº de pedido.'), ins, h('label.check.small', txt, 'Escribir el número debajo'),
      !valor ? h('p.small.warn-t', 'Con estos datos queda vacío.') : px < 1 ? h('p.small.bad-t', '🔴 No cabe: hazlo más ancho.') : px < 2 ? h('p.small.warn-t', '⚠️ Muy estrecho: puede costar leerlo. Hazlo más ancho.') : h('p.small.ok-t', '✅ Se lee bien (' + px + ' puntos por barra).'));
  }
  function ladoCaja(e) {
    const rel = sel([{ v: '#000000', t: 'Negro' }, { v: '#ffffff', t: 'Blanco' }, { v: 'none', t: 'Sin relleno' }], ['#000000', '#ffffff', 'none'].includes(e.relleno) ? e.relleno : '#000000', { 'aria-label': 'Relleno' });
    rel.onchange = () => editar(() => { e.relleno = rel.value; });
    return h('div.col', field('Relleno', rel), h('div.ee-grid', num(e, 'borde', 'Borde (mm)', { min: 0, max: 10, step: 0.1 }), num(e, 'radio', 'Esquinas (mm)', { min: 0, max: 50, step: 0.5 })));
  }

  // ---------- v16: duplicar y exportar ----------
  function duplicarDiseno() { editar(() => { P.id = ''; P.nombre = (P.nombre.replace(/ \(copia\)$/, '') + ' (copia)').slice(0, 50); }); rellenaDisenos(); lado(); toast('Copia lista: cámbiale lo que quieras y pulsa «Guardar plantilla».', 'ok', 6000); }
  async function exportar() {
    await PL.preparar(P);
    const nombre = (P.nombre || 'diseno').replace(/[^\wáéíóúñü -]/gi, '').trim().replace(/\s+/g, '_') || 'diseno';
    const cv = () => PL.dibujar(P, datos, 300, { w: P.w, h: P.h });
    modal('Exportar «' + P.nombre + '»', h('p.small', 'Tamaño real: ' + P.w + ' × ' + P.h + ' mm. La imagen sale a 300 puntos por pulgada, lista para imprenta o para enviarla.'), close => [
      btn('Cancelar', close, { cls: 'ghost' }),
      btn('Imagen PNG', () => { cv().toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombre + '.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); toast('Imagen guardada: ' + nombre + '.png', 'ok'); }, 'image/png'); close(); }, { icon: 'download' }),
      btn('PDF a tamaño real', async () => { close(); try { const c = cv(), pages = [{ canvas: c, wmm: P.w, hmm: P.h }], PV = await import('../pdfview.js'); await PV.showPdf({ blob: L.pdfFromCanvases(pages), pages, title: P.nombre + ' · ' + P.w + ' × ' + P.h + ' mm', fileName: nombre }); } catch (x) { toast('No se pudo crear el PDF: ' + x.message, 'bad'); } }, { cls: 'primary', icon: 'file' })], { size: 'narrow' });
  }
  // ---------- imprimir prueba y guardar ----------
  async function prueba() {
    try { await PL.preparar(P); await L.sendLabel(tpl, (d2, s) => [PL.dibujar(P, datos, d2, s)], { title: 'Prueba de diseño · ' + P.nombre, fileName: 'prueba_' + tpl }); }
    catch (x) { toast('No se pudo imprimir: ' + x.message, 'bad', 8000); }
  }
  async function guardar(pred) {
    if (!puedeGuardar) return;
    const f = PL.fuera(P);
    if (f.length && !(await confirmDlg('Piezas fuera del área imprimible', (f.length === 1 ? 'Una pieza se sale' : f.length + ' piezas se salen') + ' del área que la impresora puede pintar y pueden salir cortadas. ¿Guardar igualmente?', 'Guardar igualmente'))) return;
    try {
      const r = await api('plantillas.guardar', { plantilla: P, predeterminada: !!pred });
      S.cfg = r.config; emit();
      P = copia(r.plantilla); dirty = false; guardo = true; borrador();
      rellenaDisenos(); pintar(); lado();
      toast(pred ? '⭐ Guardado. Desde ahora las etiquetas «' + L.TEMPLATES[tpl].t + '» salen con este diseño.' : '💾 Diseño guardado.', 'ok', 6000);
    } catch (x) { toast(x.message, 'bad', 8000); }
  }

  // borrador sin guardar de la otra vez
  try {
    const b = JSON.parse(localStorage.getItem(BKEY(tpl)) || 'null');
    if (b && b.tpl === tpl && Array.isArray(b.els)) {
      if (opts.recuperar) { hist.push(JSON.stringify(P)); P = b; dirty = true; await PL.preparar(P); }
      else toast('Hay un diseño sin guardar de la otra vez.', 'warn', 9000, { t: 'Recuperarlo', on: async () => { hist.push(JSON.stringify(P)); P = b; dirty = true; await PL.preparar(P); rellenaDisenos(); pintar(); lado(); botonesHist(); } });
    }
  } catch (e) { }
  rellenaDisenos(); botonesHist(); lado();
  requestAnimationFrame(pintarYa);
  return cerrado;
}
