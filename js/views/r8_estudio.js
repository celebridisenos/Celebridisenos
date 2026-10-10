// ================= v20 · 🧊 CelebriR8 ESTUDIO: un Fusion a tu estilo =================
// La dueña (9-10-2026): «estoy acostumbrada a Fusion, haz como una versión de ella pero a mi estilo: boceto, medir,
// extruir, añadir componentes (círculos, estrellas, geometrías), partir una pieza con conectores como Bambu pero mejorado,
// poner color para ver cómo quedaría… que cuando entre diga “Dios, qué has hecho”».
//  · Arriba, la cinta de herramientas (como Fusion): CREAR · MODIFICAR · COMBINAR · INSPECCIONAR · ARCHIVO.
//  · Izquierda, el NAVEGADOR: todos los cuerpos, con su ojo, su color y si es sólido o hueco.
//  · Centro, la pieza en 3D sobre la cama de la impresora (P1P 256 mm o A1 mini 180 mm).
//  · Derecha, las MEDIDAS de lo que tocas: se escriben con números exactos (o se arrastran las flechas).
// Todo se calcula en este aparato (PC, móvil o iPad). Nada sale de aquí.
import { h, mount, btn, toast, modal, confirmDlg, promptDlg } from '../ui.js';
import * as N from '../r8/nucleo.js';
import * as PR from '../r8/proyecto.js';
import { crearEscena, COLORES, ACABADOS } from '../r8/escena3d.js';
import { editarBoceto } from '../r8/boceto.js';
import { parse3D } from '../stl.js';
import { estimarGramos } from '../datos3d.js';
import { ENCAJES, FUENTES, zip } from '../r8/motor.js';

// ---------- las medidas de cada forma básica ----------
const nf = (k, t, min, max, paso = 0.5, u = 'mm') => ({ k, t, min, max, paso, u });
const sf = (k, t, ops) => ({ k, t, ops });
const FU = Object.entries(FUENTES).map(([k, f]) => [k, f[0]]);
export const ESPEC = {
  caja: [nf('x', 'Ancho (X)', 0.2, 1000), nf('y', 'Fondo (Y)', 0.2, 1000), nf('z', 'Alto (Z)', 0.2, 1000), nf('radio', 'Esquinas de pie redondas', 0, 200), nf('redondeo', 'Redondear todos los bordes', 0, 100)],
  cilindro: [nf('d', 'Diámetro', 0.2, 1000), nf('h', 'Alto', 0.1, 1000), nf('lados', 'Lados (0 = redondo)', 0, 64, 1, '')],
  esfera: [nf('d', 'Diámetro', 0.2, 1000)], semiesfera: [nf('d', 'Diámetro', 0.2, 1000)],
  cono: [nf('d', 'Diámetro abajo', 0.2, 1000), nf('d2', 'Diámetro arriba', 0, 1000), nf('h', 'Alto', 0.1, 1000)],
  piramide: [nf('base', 'Base', 0.5, 1000), nf('h', 'Alto', 0.1, 1000), nf('lados', 'Lados', 3, 12, 1, '')],
  tubo: [nf('d', 'Diámetro de fuera', 0.4, 1000), nf('interior', 'Diámetro de dentro', 0, 1000), nf('h', 'Alto', 0.1, 1000)],
  toro: [nf('d', 'Diámetro total', 1, 1000), nf('grueso', 'Grosor', 0.4, 500)],
  prisma: [nf('lados', 'Lados', 3, 64, 1, ''), nf('d', 'Diámetro', 0.4, 1000), nf('h', 'Alto', 0.1, 1000)],
  estrella: [nf('puntas', 'Puntas', 3, 40, 1, ''), nf('d', 'Diámetro', 1, 1000), nf('interior', 'Hueco de las puntas', 5, 95, 1, '%'), nf('h', 'Alto', 0.1, 1000)],
  corazon: [nf('ancho', 'Ancho', 2, 1000), nf('h', 'Alto', 0.1, 1000)],
  cuna: [nf('x', 'Ancho', 0.2, 1000), nf('y', 'Fondo', 0.2, 1000), nf('z', 'Alto', 0.2, 1000)],
  texto: [{ k: 'txt', t: 'Texto', txt: 1 }, sf('fuente', 'Letra', FU), nf('alto', 'Altura de las letras', 1, 300), nf('h', 'Grosor (relieve)', 0.1, 100, 0.2)],
  rosca: [nf('d', 'Diámetro', 4, 300), nf('paso', 'Paso (lo que sube cada vuelta)', 0.8, 20, 0.1), nf('h', 'Alto', 1, 300), { k: 'hembra', t: 'Hembra (para restar: lleva tu holgura «gira»)', chk: 1 }],
  muelle: [nf('d', 'Diámetro', 3, 300), nf('grueso', 'Grosor del hilo', 0.8, 30, 0.2), nf('vueltas', 'Vueltas', 0.25, 30, 0.25, ''), nf('paso', 'Separación entre vueltas', 1, 100)]
};
const IMPRESORAS = { 256: 'Bambu P1P (256 × 256 mm)', 180: 'Bambu A1 mini (180 × 180 mm)' };
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
const r3 = x => Math.round(x * 1000) / 1000;
const ESTUDIO = { P: null, sel: [], deco: null }; // lo que estabas haciendo se conserva al cambiar de pantalla

export async function montarEstudio(el, ext = {}) {
  const lienzo = h('canvas.r8e-cv', { 'aria-label': 'Vista 3D del estudio: arrastra para girar, rueda para acercar' });
  const cargando = h('div.r8e-carga', h('div.r8e-anillo'), h('b', 'Encendiendo el motor 3D…'));
  const chips = h('div.r8e-chips'), etiquetas = h('div.r8e-etq'), vacio = h('div.r8e-vacio');
  const cubo = h('div.r8e-cubo', [['iso', '⌂', 'Vista de inicio'], ['frente', 'Frente', 'De frente'], ['arriba', 'Arriba', 'Desde arriba'], ['derecha', 'Lado', 'De lado'], ['', '⤢', 'Encuadrar todo']].map(([k, t, ti]) => h('button', { type: 'button', title: ti, 'data-vista': k || 'todo', onclick: () => escena && escena.encuadrar(k || null) }, t)));
  const vista = h('div.r8e-vista', lienzo, chips, etiquetas, cubo, vacio, cargando);
  const nav = h('div.r8e-nav'), prop = h('div.r8e-prop'), estado = h('div.r8e-estado'), cinta = h('div.r8e-cinta');
  const fi = h('input', { type: 'file', accept: '.stl,.3mf,.obj', multiple: true, style: { display: 'none' }, onchange: e => { [...(e.target.files || [])].forEach(importar); e.target.value = ''; } });
  const fiR8 = h('input', { type: 'file', accept: '.r8,.json', style: { display: 'none' }, onchange: e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) f.text().then(t => { try { ponProyecto(PR.deArchivo(t)); toast('📂 Proyecto abierto', 'ok'); } catch (x) { toast(x.message, 'bad'); } }); } });
  const raiz = h('div.r8e', { tabindex: '-1' }, cinta, h('div.r8e-main', nav, vista, prop), estado, fi, fiR8);
  el.appendChild(raiz);

  let P = ESTUDIO.P || PR.nuevoProyecto(), sel = ESTUDIO.sel || [], herr = null, H = PR.historial(P), R = null, escena = null, tic = 0, vivo = true, medida = [], partirO = null, guardTic = 0;
  ESTUDIO.P = P;

  // ---------- la cinta (como Fusion) ----------
  const grupo = (t, ...b) => h('div.r8e-gr', h('div.r8e-grb', b), h('small', t));
  const rb = (ic, t, f, o = {}) => h('button.r8e-b' + (t ? '' : '.mini'), { type: 'button', title: o.title || t, 'aria-label': o.title || t, 'data-b': o.k || t, onclick: e => f(e) }, h('span', ic), t ? h('small', t) : null);
  function pintaCinta() {
    mount(cinta,
      grupo('CREAR', rb('✏️', 'Boceto', () => nuevoBoceto(), { k: 'boceto', title: 'Dibujar un boceto y extruirlo, girarlo o inflarlo (B)' }), rb('🧊', 'Formas', e => menuFormas(e.currentTarget), { k: 'formas', title: 'Caja, cilindro, esfera, estrella, corazón, rosca… (F)' }), rb('🔩', 'Componentes', e => menuComponentes(e.currentTarget), { k: 'componentes', title: 'Agujero de tornillo, tuerca, imán, rosca de bote, bisagra…' }), rb('🛍️', 'Catálogo', () => ext.irA && ext.irA('catalogo'), { k: 'catalogo' }), rb('📂', 'Importar', () => fi.click(), { k: 'importar', title: 'Abrir un STL, 3MF u OBJ (o suéltalo encima)' }), rb('✨', 'IA', () => ponHerr('ia'), { k: 'ia', title: 'Diseñador IA: descríbelo y lo construye' })),
      grupo('MODIFICAR', rb('✥', 'Mover', () => ponHerr('mover'), { k: 'mover', title: 'Mover (M)' }), rb('⟳', 'Girar', () => ponHerr('girar'), { k: 'girar', title: 'Girar (R)' }), rb('⤢', 'Escalar', () => ponHerr('escalar'), { k: 'escalar', title: 'Escalar (S)' }), rb('🌈', 'Deformar', () => ponHerr('deformar'), { k: 'deformar', title: 'Doblar, retorcer, estrechar, inclinar, ondas' }), rb('⬓', 'Vaciar', () => vaciarSel(), { k: 'vaciar', title: 'Dejarla hueca con paredes' }), rb('⇋', 'Espejo', e => menuEspejo(e.currentTarget), { k: 'espejo' }), rb('▦', 'Matriz', () => ponHerr('matriz'), { k: 'matriz', title: 'Copias en fila o en círculo' }), rb('⧉', 'Duplicar', () => duplicar(), { k: 'duplicar', title: 'Duplicar (Ctrl+D)' })),
      grupo('COMBINAR', rb('◐', 'Hueco', () => alternaHueco(), { k: 'hueco', title: 'Sólido ↔ hueco (H): un hueco se resta de lo que toca' }), rb('∪', 'Unir', () => combinar('unir'), { k: 'unir' }), rb('−', 'Restar', () => combinar('restar'), { k: 'restar', title: 'El primero que elegiste menos los demás' }), rb('∩', 'Cruce', () => combinar('cruce'), { k: 'cruce', title: 'Solo lo que tienen en común' }), rb('⊡', 'Separar', () => desagrupar(), { k: 'desagrupar', title: 'Deshacer el grupo' })),
      grupo('INSPECCIONAR', rb('📏', 'Medir', () => ponHerr('medir'), { k: 'medir', title: 'Medir entre dos puntos' }), rb('✂️', 'Partir', () => ponHerr('partir'), { k: 'partir', title: 'Partir con conectores (pasadores, espiga, imanes, cola de milano)' }), rb('🖨️', 'Imprimir', () => ponHerr('imprimir'), { k: 'imprimir', title: 'Preparar para tu Bambu y descargar (STL / 3MF con los ajustes)' }), rb('🎞️', 'Capas', () => { capas = !capas; escena && escena.capas(capas); recalcula(true); }, { k: 'capas', title: 'Ver las capas de impresión' })),
      grupo('ARCHIVO', rb('↶', '', () => deshacer(), { k: 'deshacer', title: 'Deshacer (Ctrl+Z)' }), rb('↷', '', () => rehacer(), { k: 'rehacer', title: 'Rehacer (Ctrl+Y)' }), rb('💾', 'Proyectos', () => proyectos(), { k: 'proyectos' }), rb('⚡', 'Precio', () => precio(), { k: 'precio' })));
    cinta.querySelectorAll('[data-b]').forEach(b => b.classList.toggle('on', b.dataset.b === herr || (b.dataset.b === 'capas' && capas)));
  }
  let capas = false;

  // ---------- motor y vista ----------
  try { await N.cargar(); } catch (e) { mount(cargando, h('b', '⚠️ No se ha podido encender el motor 3D: ' + (e.message || e))); return { destroy() { } }; }
  if (!vivo) return { destroy() { } };
  try { escena = crearEscena(lienzo, { cama: P.cama || 256, dia: document.documentElement.getAttribute('data-modo') === 'dia' }); } catch (e) { mount(cargando, h('b', '⚠️ Este aparato no deja ver en 3D (WebGL): ' + (e.message || e))); return { destroy() { } }; }
  cargando.remove();
  escena.alDibujar = pintaEtiquetas;
  const catalogo = await import('../r8/catalogo.js').catch(e => { console.error(e); return null; });

  // ---------- calcular y pintar ----------
  function recalcula(ya) { clearTimeout(tic); tic = setTimeout(hazCalculo, ya ? 0 : 50); }
  function hazCalculo() {
    if (!vivo) return;
    R = PR.evaluar(P);
    escena.ponPartes(R.partes, R.huecos); escena.ponProxies(R.proxies.map(x => ({ id: x.id, vista: x.vista, matriz: PR.matriz4(x.t) })));
    marcaSel(); pintaEstado(); pintaFlechas();
    mount(vacio, !P.cuerpos.length ? h('div.r8e-bienv', h('b', 'Empieza a diseñar'), h('div.r8e-bienv-b', btn('✏️ Dibujar un boceto', () => nuevoBoceto(), { cls: 'primary' }), btn('🧊 Poner una forma', e => menuFormas(e.currentTarget)), btn('✨ Pedírselo a la IA', () => ponHerr('ia')), btn('🛍️ Abrir del catálogo', () => ext.irA && ext.irA('catalogo'))), h('small', 'O suelta aquí un STL. Arrastra para girar la vista, rueda para acercar, botón derecho para moverla.')) : null);
    window.__r8e = Object.assign(window.__r8e || {}, { n: P.cuerpos.length, info: R.info, ms: R.ms, avisos: R.avisos, sel: sel.slice(), herr, partes: R.partes.length, huecos: R.huecos.length });
  }
  function marcaSel() { const L = sel.map(id => { const x = R && R.proxies.find(p => p.id === id); return x ? { id, vista: x.vista, t: x.t } : null; }).filter(Boolean); escena.marcar(L); }
  function pintaEstado() {
    const I = R && R.info, cama = P.cama || 256;
    if (!I) { mount(estado, h('span', '🧊 ' + (P.nombre || 'Mi diseño')), h('span.muted', 'Vacío'), h('span.grow'), h('span.muted', IMPRESORAS[cama] || '')); mount(chips); return; }
    const gramos = estimarGramos(I.vol, I.area) || 0, grande = I.dims[0] > cama || I.dims[1] > cama || I.dims[2] > cama;
    mount(chips, h('span', '↔ ' + n1(I.dims[0])), h('span', '↕ ' + n1(I.dims[1])), h('span', '⬆ ' + n1(I.dims[2]) + ' mm'));
    mount(estado, h('span.r8e-nom', { title: 'Cambiar el nombre', onclick: async () => { const n = await promptDlg('Nombre del diseño', 'Nombre', P.nombre); if (n) { P.nombre = n.trim().slice(0, 60) || P.nombre; commit(); } } }, '🧊 ' + (P.nombre || 'Mi diseño') + ' ✎'),
      h('span', n1(I.dims[0]) + ' × ' + n1(I.dims[1]) + ' × ' + n1(I.dims[2]) + ' mm'), h('span', n1(I.vol / 1000) + ' cm³'), h('span', '≈ ' + Math.max(1, Math.round(gramos)) + ' g ', h('small', 'ESTIMADO')), I.piezas > 1 ? h('span', '🧩 ' + I.piezas + ' piezas sueltas') : null,
      grande ? h('span.r8e-mal', '⚠️ No cabe en la cama') : null, R.avisos.length ? h('span.r8e-mal', { title: R.avisos.join('\n') }, '⚠️ ' + R.avisos[0]) : null, h('span.grow'), h('span.muted', R.ms + ' ms'),
      h('select.r8e-cama', { 'aria-label': 'Impresora', onchange: e => { P.cama = Number(e.target.value); escena.cama(P.cama); commit(); } }, Object.entries(IMPRESORAS).map(([k, t]) => h('option', { value: k, selected: Number(k) === cama }, t))));
  }
  // las medidas encima de la vista (regla de medir)
  function pintaEtiquetas() {
    if (herr !== 'medir' || medida.length < 2) { if (etiquetas.childNodes.length) mount(etiquetas); return; }
    const [a, b] = medida, m = [(a.p[0] + b.p[0]) / 2, (a.p[1] + b.p[1]) / 2, (a.p[2] + b.p[2]) / 2], s = escena.aPantalla(m), d = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]);
    mount(etiquetas, s.delante ? h('div.r8e-etq-m', { style: { left: s.x + 'px', top: s.y + 'px' } }, n1(d) + ' mm') : null);
  }

  // ---------- selección y flechas ----------
  const top = id => P.cuerpos.some(c => c.id === id);
  function elige(ids, sumar) { sel = sumar ? [...new Set(sel.filter(x => !ids.includes(x)).concat(ids.filter(x => !sel.includes(x))))] : ids; ESTUDIO.sel = sel; marcaSel(); pintaFlechas(); pintaNav(); pintaProp(); window.__r8e && (window.__r8e.sel = sel.slice()); }
  let origen = null;
  function pintaFlechas() {
    const c = sel.length ? PR.busca(P, sel[0]) : null;
    if (!c || !top(c.id) || !['mover', 'girar', 'escalar'].includes(herr) || (sel.length > 1 && herr !== 'mover')) { escena.flechas(null); return; }
    escena.flechas(herr, c.t, t => { if (!origen) origen = sel.map(id => JSON.parse(JSON.stringify((PR.busca(P, id) || {}).t || null))); const d = t.pos.map((v, k) => v - origen[0].pos[k]); c.t = t; escena.moverProxy(c.id, t);
      sel.slice(1).forEach((id, i) => { const o = PR.busca(P, id); if (o && origen[i + 1]) { o.t.pos = origen[i + 1].pos.map((v, k) => r3(v + d[k])); escena.moverProxy(id, o.t); } }); pintaPropLigero(); if (!R || R.ms < 70) recalcula(); },
    t => { c.t = t; origen = null; commit(); });
  }
  // tocar la vista: elegir (o medir)
  let abajo = null;
  lienzo.addEventListener('pointerdown', e => { abajo = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  lienzo.addEventListener('pointerup', e => {
    if (!abajo || escena.arrastrando || Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) > 5 || e.button !== 0) { abajo = null; return; } abajo = null;
    if (herr === 'medir') { const q = escena.puntoEn(e); if (!q) return; medida = medida.length >= 2 ? [q] : medida.concat([q]); escena.medida(medida[0].p, medida[1] && medida[1].p); pintaProp(); escena.pide(); return; }
    const id = escena.cuerpoEn(e); if (id) elige([id], e.shiftKey || e.ctrlKey || e.metaKey); else if (!e.shiftKey) elige([]);
  });
  lienzo.addEventListener('dblclick', e => { const id = escena.cuerpoEn(e), c = id && PR.busca(P, id); if (c && c.tipo === 'boceto') editaBoceto(c); });

  // ---------- cambios ----------
  function commit() { if (H.apunta(P)) { clearTimeout(guardTic); guardTic = setTimeout(autoguarda, 1500); } ESTUDIO.P = P; recalcula(); pintaNav(); pintaProp(); }
  function autoguarda() { if (!P.cuerpos.length) return; let foto = ''; try { foto = escena.foto('image/jpeg', 0.6); } catch (e) { } PR.guardar(P, foto).catch(() => { }); }
  function ponProyecto(P2) { P = P2; ESTUDIO.P = P; H = PR.historial(P); sel = []; ESTUDIO.sel = sel; escena.cama(P.cama || 256); recalcula(true); pintaNav(); pintaProp(); setTimeout(() => escena.encuadrar('iso'), 80); }
  function deshacer() { const x = H.deshacer(); if (x) { P = x; ESTUDIO.P = P; sel = sel.filter(id => PR.busca(P, id)); recalcula(true); pintaNav(); pintaProp(); } }
  function rehacer() { const x = H.rehacer(); if (x) { P = x; ESTUDIO.P = P; sel = sel.filter(id => PR.busca(P, id)); recalcula(true); pintaNav(); pintaProp(); } }
  function añade(c, o = {}) {
    PR.añadir(P, c);
    // lo nuevo aparece al lado de lo que ya hay (no encima), apoyado en la cama
    if (!o.quieto && P.cuerpos.length > 1) { try { const b = PR.cajaDe(P, P.cuerpos.filter(x => x !== c).map(x => x.id)), bc = PR.cajaDe(P, [c.id]); if (b && bc) c.t.pos[0] = r3(c.t.pos[0] + b.max[0] - bc.min[0] + 8); } catch (e) { } }
    try { PR.aLaCama(P, [c.id]); } catch (e) { }
    commit(); elige([c.id]); if (!herr) ponHerr('mover'); else pintaFlechas(); setTimeout(() => escena.encuadrar(), 60);
    return c;
  }
  function añadeForma(tipo) { const F = N.FORMAS3D[tipo]; añade({ tipo, nombre: F.t, p: Object.assign({}, F.p), color: colorSiguiente() }); }
  const colorSiguiente = () => { const usados = new Set(); PR.recorre(P.cuerpos, c => usados.add(c.color)); const L = ['#7c6cff', '#f55a9b', '#00a4e4', '#00ae42', '#ff6a13', '#f7d117', '#41c3bd', '#c8102e']; return L.find(c => !usados.has(c)) || L[P.cuerpos.length % L.length]; };
  async function nuevoBoceto() { const p = await editarBoceto(vista, { formas: [] }); if (p) añade({ tipo: 'boceto', nombre: p.modo === 'inflar' ? 'Dibujo inflado' : p.modo === 'revolucion' ? 'Pieza girada' : 'Boceto extruido', p, color: colorSiguiente() }); }
  async function editaBoceto(c) { escena.flechas(null); const p = await editarBoceto(vista, c.p); if (p) { c.p = p; commit(); } pintaFlechas(); }
  function borrar() { if (!sel.length) return; PR.borrar(P, sel); sel = []; commit(); elige([]); }
  function duplicar() { if (!sel.length) return toast('Elige antes algo para duplicar.', 'warn'); const n = PR.duplicar(P, sel, 0); n.forEach(id => { const c = PR.busca(P, id), b = PR.cajaDe(P, [id]); if (c && b) c.t.pos[0] = r3(c.t.pos[0] + b.dims[0] + 5); }); commit(); elige(n); }
  function alternaHueco() { if (!sel.length) return toast('Elige antes una pieza: el hueco se resta de lo que toca.', 'warn'); const L = sel.map(id => PR.busca(P, id)).filter(Boolean), v = !L[0].hueco; L.forEach(c => { c.hueco = v; }); commit(); toast(v ? '◐ Ahora es un HUECO: se resta de lo que toca (se ve de cristal rojo)' : '● Ahora es SÓLIDO', 'ok', 3000); }
  function combinar(modo) {
    if (sel.length < 2) return toast('Elige dos o más piezas (con Mayúsculas o Ctrl al tocarlas).', 'warn');
    if (modo === 'restar') { sel.slice(1).forEach(id => { const c = PR.busca(P, id); if (c) c.hueco = true; }); const c0 = PR.busca(P, sel[0]); if (c0) c0.hueco = false; }
    const g = PR.agrupar(P, sel, modo === 'cruce' ? 'cruce' : 'unir'); if (!g) return; commit(); elige([g.id]); toast(modo === 'restar' ? '− Restado. Sigue siendo editable: ábrelo en el navegador.' : modo === 'cruce' ? '∩ Solo queda lo que tenían en común' : '∪ Unidas en una sola pieza', 'ok');
  }
  function desagrupar() { const c = sel.length === 1 && PR.busca(P, sel[0]); if (!c || c.tipo !== 'grupo') return toast('Elige un grupo (unión, resta o matriz) para separarlo.', 'warn'); const ids = PR.desagrupar(P, c.id); commit(); elige(ids); }
  function vaciarSel() { const c = sel.length === 1 && PR.busca(P, sel[0]); if (!c || c.tipo === 'grupo') return toast('Elige una pieza (no un grupo) para vaciarla.', 'warn'); c.p = Object.assign({}, c.p, { vaciar: c.p.vaciar > 0 ? 0 : 2, vaciarAbierta: true }); commit(); toast(c.p.vaciar ? '⬓ Vaciada con paredes de 2 mm y abierta por arriba (cámbialo a la derecha)' : 'Vuelve a ser maciza', 'ok'); }
  async function importar(f) {
    try {
      if (!/\.(stl|3mf|obj)$/i.test(f.name)) throw new Error('Elige un archivo STL, 3MF u OBJ.');
      const p = await parse3D(await f.arrayBuffer(), f.name); if (!p || p.length < 9) throw new Error('Ese archivo no tiene ninguna pieza.');
      let s = p instanceof Float32Array ? p : new Float32Array(p);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity; for (let i = 0; i < s.length; i += 3) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); z0 = Math.min(z0, s[i + 2]); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; s = s.map((v, i) => (i % 3 === 0 ? v - cx : i % 3 === 1 ? v - cy : v - z0));
      const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); PR.MALLAS.set(id, s);
      añade({ tipo: 'malla', nombre: f.name.replace(/\.[^.]+$/, '').slice(0, 40), p: { malla: id, archivo: f.name }, color: colorSiguiente() });
      if (R && R.avisos.some(a => /malla abierta|sólido/.test(a))) toast('⚠️ Esa pieza tiene la malla rota: se ve, pero no se puede unir ni restar. Pruébala en Plantillas → Editar un STL.', 'warn', 9000);
    } catch (e) { toast(e.message || String(e), 'bad', 7000); }
  }
  // un diseño del catálogo o un componente → cuerpo editable
  function añadeDiseno(k, p, o = {}) { const D = catalogo && catalogo.DISENOS[k]; if (!D) return toast('No encuentro ese diseño.', 'bad'); const v = Object.assign(catalogo.valores(k), p || {}, { k }); return añade({ tipo: 'cat', nombre: D.t, p: v, color: o.color || D.color || colorSiguiente(), acabado: o.acabado || D.acabado || 'mate', hueco: !!(o.hueco ?? D.hueco) }); }
  function menuFormas(ancla) { menu(ancla, Object.entries(N.FORMAS3D).map(([k, f]) => [f.e, f.t, () => añadeForma(k)]), 'r8e-menu-formas'); }
  function menuComponentes(ancla) { if (!catalogo) return; menu(ancla, Object.entries(catalogo.DISENOS).filter(([, d]) => d.cat === 'componentes').map(([k, d]) => [d.e, d.t, () => añadeDiseno(k)]), 'r8e-menu-comp'); }
  function menuEspejo(ancla) { if (!sel.length) return toast('Elige antes una pieza.', 'warn'); menu(ancla, [['↔', 'Espejo en X', () => { PR.espejo(P, sel, 'x'); commit(); }], ['↕', 'Espejo en Y', () => { PR.espejo(P, sel, 'y'); commit(); }], ['⬍', 'Espejo en Z', () => { PR.espejo(P, sel, 'z'); PR.aLaCama(P, sel); commit(); }]]); }
  function menu(ancla, items, cls = '') {
    document.querySelectorAll('.r8e-menu').forEach(m => m.remove());
    const r = ancla.getBoundingClientRect(), m = h('div.r8e-menu' + (cls ? '.' + cls : ''), { style: { left: Math.max(8, Math.min(window.innerWidth - 340, r.left)) + 'px', top: (r.bottom + 6) + 'px' } }, items.map(([ic, t, f]) => h('button', { type: 'button', onclick: () => { m.remove(); f(); } }, h('span', ic), h('b', t))));
    document.body.appendChild(m); setTimeout(() => document.addEventListener('pointerdown', function fuera(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', fuera); } }), 0);
  }

  // ---------- navegador (lista de cuerpos) ----------
  const icono = c => c.tipo === 'grupo' ? (c.modo === 'cruce' ? '∩' : c.hijos.some(x => x.hueco) ? '−' : '∪') : c.tipo === 'boceto' ? '✏️' : c.tipo === 'malla' ? '📦' : c.tipo === 'cat' ? ((catalogo && catalogo.DISENOS[c.p.k]) || {}).e || '🛍️' : (N.FORMAS3D[c.tipo] || {}).e || '🧊';
  function pintaNav() {
    const fila = (c, nivel) => h('div.r8e-fila' + (sel.includes(c.id) ? '.on' : '') + (c.oculto ? '.oculto' : ''), { 'data-id': c.id, style: { paddingLeft: (8 + nivel * 14) + 'px' }, onclick: e => elige([c.id], e.shiftKey || e.ctrlKey || e.metaKey), ondblclick: async () => { const n = await promptDlg('Nombre', 'Nombre de la pieza', c.nombre || ''); if (n !== null) { c.nombre = n.trim().slice(0, 40); commit(); } } },
      h('button.r8e-ojo', { type: 'button', title: c.oculto ? 'Mostrar' : 'Ocultar', onclick: e => { e.stopPropagation(); c.oculto = !c.oculto; commit(); } }, c.oculto ? '◌' : '👁'),
      h('span.r8e-ic', icono(c)), h('span.r8e-n', c.nombre || PR.nombreTipo(c)), c.hueco ? h('span.r8e-hueco', 'hueco') : h('span.r8e-dot', { style: { background: c.color } }));
    const filas = []; const rec = (L, n) => L.forEach(c => { filas.push(fila(c, n)); if (c.hijos) rec(c.hijos, n + 1); }); rec(P.cuerpos, 0);
    mount(nav, h('div.r8e-nav-t', h('b', 'NAVEGADOR'), h('small', P.cuerpos.length + ' cuerpo' + (P.cuerpos.length === 1 ? '' : 's'))), filas.length ? filas : h('p.r8e-nada', 'Aún no hay nada. Crea una forma o un boceto.'));
  }

  // ---------- panel de la derecha ----------
  const campoNum = (o, k, t, min, max, paso, u, alCambiar, extra) => {
    const r = h('input', { type: 'range', min, max: Math.min(max, Math.max(min + paso, (Number(o[k]) || 0) * 3, max > 300 ? 300 : max)), step: paso, value: o[k] ?? 0, 'aria-label': t }), n = h('input.inp', { type: 'number', min, max, step: paso, value: o[k] ?? 0, 'data-k': k, 'aria-label': t });
    const pon = (x, de, fin) => { let y = Number(String(x).replace(',', '.')); if (!isFinite(y)) return; y = Math.max(min, Math.min(max, y)); o[k] = y; if (de !== r) r.value = y; if (de !== n) n.value = y; alCambiar(fin); };
    r.oninput = () => pon(r.value, r, false); r.onchange = () => pon(r.value, r, true); n.oninput = () => pon(n.value, n, false); n.onchange = () => { n.value = o[k]; alCambiar(true); };
    return h('label.r8e-c.r8e-num', h('span', t, extra || null), r, h('span.r8e-n', n, u ? h('i', u) : null));
  };
  const vivoCambio = fin => { if (fin) commit(); else { recalcula(); } };
  const campos = (spec, o) => spec.map(c => {
    if (c.chk) return h('label.check.r8e-c', h('input', { type: 'checkbox', checked: !!o[c.k], 'data-k': c.k, onchange: e => { o[c.k] = e.target.checked; commit(); } }), c.t);
    if (c.txt) return h('label.r8e-c.col', h('span', c.t), h('input.inp', { type: 'text', value: o[c.k] || '', maxlength: c.max || 60, 'data-k': c.k, oninput: e => { o[c.k] = e.target.value; recalcula(); }, onchange: () => commit() }), c.ayuda ? h('small.muted', c.ayuda) : null);
    if (c.ops) return h('label.r8e-c.col', h('span', c.t), h('select.inp', { 'data-k': c.k, onchange: e => { o[c.k] = e.target.value; commit(); } }, c.ops.map(([k, t]) => h('option', { value: k, selected: String(o[c.k]) === String(k) }, t))));
    return campoNum(o, c.k, c.t, c.min, c.max, c.paso || 0.5, c.u ?? 'mm', vivoCambio);
  });
  const seccion = (t, ...k) => h('details.r8e-sec', { open: true }, h('summary', t), h('div.r8e-sec-b', k));
  let ligero = null;
  function pintaPropLigero() { if (ligero) ligero(); }
  function pintaProp() {
    ligero = null;
    if (herr === 'medir') return panelMedir(); if (herr === 'partir') return panelPartir(); if (herr === 'matriz') return panelMatriz(); if (herr === 'imprimir') return panelImprimir(); if (herr === 'ia') return panelIA(); if (herr === 'deformar' && sel.length === 1) return panelDeformar();
    if (!sel.length) return mount(prop, h('div.r8e-prop-t', h('b', 'PROPIEDADES')), h('div.r8e-ayuda', h('p', '👆 Toca una pieza para ver sus medidas y cambiarlas con números exactos.'), h('p', '⌨️ Atajos: ', h('b', 'M'), ' mover · ', h('b', 'R'), ' girar · ', h('b', 'S'), ' escalar · ', h('b', 'H'), ' hueco · ', h('b', 'B'), ' boceto · ', h('b', 'Supr'), ' borrar · ', h('b', 'Ctrl+Z'), ' deshacer · ', h('b', 'Ctrl+D'), ' duplicar'), h('p', '🖱️ Arrastra para girar la vista · rueda para acercar · botón derecho para moverla. En el iPad: un dedo gira, dos dedos acercan y mueven.')),
      h('div.r8e-tarjeta', h('b', '🎨 Color de todo'), h('div.r8e-paleta', COLORES.map(([c, t]) => h('button', { type: 'button', title: t, style: { background: c }, onclick: () => { PR.recorre(P.cuerpos, x => { if (!x.hueco) x.color = c; }); commit(); } })))));
    if (sel.length > 1) return mount(prop, h('div.r8e-prop-t', h('b', sel.length + ' PIEZAS ELEGIDAS')),
      seccion('Combinar', h('div.r8e-btns', btn('∪ Unir', () => combinar('unir')), btn('− Restar', () => combinar('restar')), btn('∩ Cruce', () => combinar('cruce')), btn('🗑️ Borrar', borrar, { cls: 'ghost' }))),
      seccion('Alinear', ['x', 'y', 'z'].map(e => h('div.r8e-alin', h('b', e.toUpperCase()), [['min', e === 'z' ? 'Abajo' : 'Inicio'], ['centro', 'Centro'], ['max', e === 'z' ? 'Arriba' : 'Final']].map(([k, t]) => btn(t, () => { PR.alinear(P, sel, e, k); commit(); }, { cls: 'sm' }))))),
      seccion('Color', h('div.r8e-paleta', COLORES.map(([c, t]) => h('button', { type: 'button', title: t, style: { background: c }, onclick: () => { sel.forEach(id => { const x = PR.busca(P, id); if (x) x.color = c; }); commit(); } })))));
    const c = PR.busca(P, sel[0]); if (!c) return mount(prop);
    const b = PR.cajaDe(P, [c.id]) || { dims: [0, 0, 0] }, dims = { x: r3(b.dims[0]), y: r3(b.dims[1]), z: r3(b.dims[2]) };
    const pos = { x: c.t.pos[0], y: c.t.pos[1], z: c.t.pos[2] }, rot = { x: c.t.rot[0], y: c.t.rot[1], z: c.t.rot[2] };
    let prop2 = true;
    const forma = [];
    if (ESPEC[c.tipo]) forma.push(...campos(ESPEC[c.tipo], c.p));
    if (c.tipo === 'boceto') forma.push(btn('✏️ Editar el boceto', () => editaBoceto(c), { cls: 'primary r8e-editbo' }), ...(c.p.modo === 'inflar' ? campos([nf('alto', 'Lo gordo que sale', 1, 200), nf('base', 'Borde plano', 0, 10, 0.2)], c.p) : c.p.modo === 'revolucion' ? campos([nf('angulo', 'Cuánto gira', 1, 360, 5, '°')], c.p) : campos([nf('alto', 'Altura', 0.1, 1000), nf('desmoldeo', 'Tamaño arriba', 0, 300, 1, '%'), nf('giro', 'Retorcer', -1080, 1080, 5, '°'), nf('redondeo', 'Redondear esquinas', 0, 50)], c.p)));
    if (c.tipo === 'cat' && catalogo) { const D = catalogo.DISENOS[c.p.k]; if (D) { forma.push(...campos(catalogo.especDe(c.p.k), c.p)); if (D.nota) forma.push(h('p.r8e-nota', typeof D.nota === 'function' ? D.nota(c.p) : D.nota)); } }
    if (c.tipo === 'malla') forma.push(h('p.r8e-nota', '📦 ' + (c.p.archivo || 'Pieza importada') + '. Puedes moverla, escalarla, restarle o sumarle formas, partirla con conectores y deformarla.'));
    if (c.tipo === 'grupo') forma.push(...campos([sf('modo', 'Cómo se combinan', [['unir', 'Unir (y restar los huecos)'], ['cruce', 'Solo lo que tienen en común']]), sf('colores', 'Colores', [['uno', 'Todo de un color'], ['cada', 'Cada pieza con el suyo']])], c), btn('⊡ Separar el grupo', desagrupar, { cls: 'sm' }));
    const tam = h('div.r8e-tam', ['x', 'y', 'z'].map(e => campoNum(dims, e, { x: 'Ancho', y: 'Fondo', z: 'Alto' }[e], 0.05, 2000, 0.5, 'mm', fin => { if (fin) { PR.medirA(P, c.id, e, dims[e], prop2); commit(); } })));
    mount(prop, h('div.r8e-prop-t', h('span.r8e-ic', icono(c)), h('input.inp.r8e-nombre', { value: c.nombre || PR.nombreTipo(c), maxlength: 40, 'aria-label': 'Nombre', onchange: e => { c.nombre = e.target.value.slice(0, 40); commit(); } })),
      h('div.r8e-seg', h('button' + (!c.hueco ? '.on' : ''), { type: 'button', onclick: () => { c.hueco = false; commit(); } }, '● Sólido'), h('button' + (c.hueco ? '.on.ag' : ''), { type: 'button', 'data-hueco': '1', onclick: () => { c.hueco = true; commit(); } }, '◐ Hueco')),
      !c.hueco ? seccion('🎨 Color y acabado', h('div.r8e-paleta', COLORES.map(([k, t]) => h('button' + (c.color === k ? '.on' : ''), { type: 'button', title: t, 'data-color': k, style: { background: k }, onclick: () => { c.color = k; commit(); } })), h('label.r8e-propio', { title: 'Otro color' }, h('input', { type: 'color', value: c.color || '#7c6cff', onchange: e => { c.color = e.target.value; commit(); } }), '＋')),
        h('select.inp', { 'aria-label': 'Acabado', onchange: e => { c.acabado = e.target.value; commit(); } }, Object.entries(ACABADOS).map(([k, a]) => h('option', { value: k, selected: c.acabado === k }, a.t))), h('small.muted', 'El color en pantalla es APROXIMADO al de la bobina.')) : null,
      forma.length ? seccion('📐 Forma', forma) : null,
      seccion('📏 Tamaño', tam, h('label.check.small', h('input', { type: 'checkbox', checked: prop2, onchange: e => { prop2 = e.target.checked; } }), 'Mantener la proporción')),
      seccion('✥ Posición', h('div.r8e-tres', ['x', 'y', 'z'].map(e => campoNum(pos, e, e.toUpperCase(), -1000, 1000, 0.5, 'mm', fin => { c.t.pos = [pos.x, pos.y, pos.z].map(r3); escena.moverProxy(c.id, c.t); if (fin) commit(); else recalcula(); }))),
        h('div.r8e-btns', btn('⤓ A la cama', () => { PR.aLaCama(P, [c.id]); commit(); }, { cls: 'sm' }), btn('⌖ Al centro', () => { const bb = PR.cajaDe(P, [c.id]); if (bb) { c.t.pos[0] = r3(c.t.pos[0] - (bb.min[0] + bb.max[0]) / 2); c.t.pos[1] = r3(c.t.pos[1] - (bb.min[1] + bb.max[1]) / 2); commit(); } }, { cls: 'sm' }))),
      seccion('⟳ Giro', h('div.r8e-tres', ['x', 'y', 'z'].map(e => campoNum(rot, e, e.toUpperCase(), -360, 360, 1, '°', fin => { c.t.rot = [rot.x, rot.y, rot.z].map(r3); escena.moverProxy(c.id, c.t); if (fin) { PR.aLaCama(P, [c.id]); commit(); } else recalcula(); }))),
        h('div.r8e-btns', [['X', 0], ['Y', 1], ['Z', 2]].map(([t, k]) => btn('+90° ' + t, () => { c.t.rot[k] = (c.t.rot[k] + 90) % 360; PR.aLaCama(P, [c.id]); commit(); }, { cls: 'sm' })))),
      c.tipo !== 'grupo' ? seccion('⬓ Vaciar', campoNum(c.p, 'vaciar', 'Pared (0 = maciza)', 0, 20, 0.2, 'mm', vivoCambio), h('label.check.small', h('input', { type: 'checkbox', checked: c.p.vaciarAbierta !== false, onchange: e => { c.p.vaciarAbierta = e.target.checked; commit(); } }), 'Abierta por arriba')) : null,
      seccion('🌈 Deformar', (c.mods || []).length ? h('p.small', (c.mods || []).map(m => N.DEFORMACIONES[m.t].t).join(' · ')) : h('p.small.muted', 'Doblar, retorcer, estrechar, inclinar u ondas.'), btn('Abrir', () => ponHerr('deformar'), { cls: 'sm' })),
      h('div.r8e-btns.r8e-pie', btn('⧉ Duplicar', duplicar, { cls: 'sm' }), btn('🗑️ Borrar', borrar, { cls: 'sm danger' })));
    ligero = () => { const a = prop.querySelectorAll('.r8e-tres')[0]; if (!a) return; const t = c.t; a.querySelectorAll('input.inp').forEach((i, k) => { i.value = t.pos[k]; }); const g = prop.querySelectorAll('.r8e-tres')[1]; if (g) g.querySelectorAll('input.inp').forEach((i, k) => { i.value = t.rot[k]; }); };
  }

  // ---------- herramientas con panel propio ----------
  function ponHerr(k) {
    herr = herr === k && !['mover', 'girar', 'escalar'].includes(k) ? null : k;
    if (herr !== 'medir') { medida = []; escena.medida(null); }
    if (herr !== 'partir') { partirO = null; escena.planoCorte(null); }
    pintaCinta(); pintaFlechas(); pintaProp(); if (window.__r8e) window.__r8e.herr = herr;
  }
  function panelMedir() {
    const [a, b] = medida, out = [h('div.r8e-prop-t', h('b', '📏 MEDIR')), h('p.small', 'Toca un punto de la pieza y luego otro. Si tocas cerca de una esquina, se pega a ella.')];
    if (a && b) { const d = [0, 1, 2].map(k => b.p[k] - a.p[k]); out.push(h('div.r8e-medida', h('div', h('span', 'Distancia'), h('b', n1(Math.hypot(...d)) + ' mm')), h('div', h('span', 'En X'), h('b', n1(Math.abs(d[0])))), h('div', h('span', 'En Y'), h('b', n1(Math.abs(d[1])))), h('div', h('span', 'En Z'), h('b', n1(Math.abs(d[2])))))); }
    else if (a) out.push(h('p.r8e-nota', 'Primer punto: ' + a.p.map(n1).join(' · ') + '. Ahora toca el segundo.'));
    if (R && R.info) out.push(h('div.r8e-medida', h('div', h('span', 'Toda la pieza'), h('b', R.info.dims.map(n1).join(' × ') + ' mm'))));
    out.push(btn('Terminar', () => ponHerr(null), { cls: 'sm' }));
    mount(prop, out);
  }
  function panelMatriz() {
    const c = sel.length === 1 && PR.busca(P, sel[0]);
    if (!c) return mount(prop, h('div.r8e-prop-t', h('b', '▦ MATRIZ')), h('p.small', 'Elige UNA pieza y te hago copias en fila o en círculo (por ejemplo, agujeros alrededor de un plato).'));
    const o = ESTUDIO.matriz = ESTUDIO.matriz || { tipo: 'lineal', n: 4, dx: 20, dy: 0, dz: 0, angulo: 360, cx: 0, cy: 0 }, caja2 = h('div');
    const pinta = () => mount(caja2, o.tipo === 'lineal' ? [campoNum(o, 'n', 'Cuántas (en total)', 2, 60, 1, '', () => { }), campoNum(o, 'dx', 'Separación en X', -500, 500, 0.5, 'mm', () => { }), campoNum(o, 'dy', 'Separación en Y', -500, 500, 0.5, 'mm', () => { }), campoNum(o, 'dz', 'Separación en Z', -500, 500, 0.5, 'mm', () => { })]
      : [campoNum(o, 'n', 'Cuántas (en total)', 2, 60, 1, '', () => { }), campoNum(o, 'angulo', 'Ángulo total', 10, 360, 5, '°', () => { }), campoNum(o, 'cx', 'Centro X', -500, 500, 0.5, 'mm', () => { }), campoNum(o, 'cy', 'Centro Y', -500, 500, 0.5, 'mm', () => { })]);
    pinta();
    mount(prop, h('div.r8e-prop-t', h('b', '▦ MATRIZ · ' + (c.nombre || PR.nombreTipo(c)))), h('div.r8e-seg', h('button' + (o.tipo === 'lineal' ? '.on' : ''), { type: 'button', onclick: () => { o.tipo = 'lineal'; panelMatriz(); } }, '⋯ En fila'), h('button' + (o.tipo === 'circular' ? '.on' : ''), { type: 'button', onclick: () => { o.tipo = 'circular'; panelMatriz(); } }, '◌ En círculo')), caja2,
      h('div.r8e-btns', btn('✓ Hacer las copias', () => { const g = PR.matriz(P, c.id, o); if (g) { commit(); elige([g.id]); herr = null; pintaCinta(); pintaProp(); toast('▦ ' + o.n + ' copias. Siguen siendo editables (ábrelas en el navegador).', 'ok'); } }, { cls: 'primary' }), btn('Cancelar', () => ponHerr(null), { cls: 'ghost' })));
  }
  function panelDeformar() {
    const c = PR.busca(P, sel[0]); if (!c) return ponHerr(null); c.mods = c.mods || [];
    const lista = c.mods.map((m, i) => { const D = N.DEFORMACIONES[m.t]; return h('div.r8e-mod', h('div.r8e-mod-t', h('b', D.t), btn('✕', () => { c.mods.splice(i, 1); commit(); }, { cls: 'sm ghost', title: 'Quitar' })), campos(D.c.map(x => x[3] && Array.isArray(x[3]) ? sf(x[0], x[1], x[3]) : nf(x[0], x[1], x[3], x[4], x[5], x[6])), m)); });
    mount(prop, h('div.r8e-prop-t', h('b', '🌈 DEFORMAR · ' + (c.nombre || PR.nombreTipo(c)))), h('p.small.muted', 'Se aplican en orden, de arriba abajo. Para un jarrón: un cilindro + «Ondas alrededor» + «Retorcer». Para doblar una pieza larga: «Doblar».'),
      lista, h('div.r8e-addmod', Object.entries(N.DEFORMACIONES).map(([k, d]) => btn(d.t, () => { c.mods.push(Object.assign({ t: k }, Object.fromEntries(d.c.map(x => [x[0], x[2]])))); commit(); }, { cls: 'sm' }))),
      h('div.r8e-btns', btn('✓ Listo', () => ponHerr(null), { cls: 'primary' })));
  }
  // ✂️ PARTIR con conectores (vista previa del plano y de los conectores en directo)
  function panelPartir() {
    const objetivo = sel.length === 1 ? PR.busca(P, sel[0]) : null;
    const o = partirO = partirO || Object.assign({ eje: 'z', pos: null, inclina: 0, tipo: 'pasadores', n: 0, d: 5, largo: 10, imanD: 6, imanH: 3, encaje: 'justo' }, ESTUDIO.partir || {});
    const info = h('div.r8e-medida'), aviso = h('div');
    let total = null;
    const prepara = () => {
      try {
        const L = objetivo ? [PR.colocado(objetivo, P)] : PR.partesFinales(P).map(x => x.m); if (!L.length) throw new Error('No hay nada que partir.');
        total = N.union(L); const b = N.caja(total), k = { x: 0, y: 1, z: 2 }[o.eje]; // (sin guardar: puede ser la misma pieza de la caché)
        if (o.pos === null || o.pos > b.dims[k]) o.pos = Math.round(b.dims[k] / 2 * 2) / 2;
        const r = N.partir(total, o), cs = r.plano, Rt = [[cs.R[0][0], cs.R[1][0], cs.R[2][0]], [cs.R[0][1], cs.R[1][1], cs.R[2][1]], [cs.R[0][2], cs.R[1][2], cs.R[2][2]]], aW = v => [0, 1, 2].map(i => Rt[i][0] * v[0] + Rt[i][1] * v[1] + Rt[i][2] * v[2]);
        const centro = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]; centro[k] = b.min[k] + o.pos;
        escena.planoCorte({ normal: r.normal, punto: centro, tam: Math.max(...b.dims) * 1.4, sitios: r.sitios.map(q => aW([q[0], q[1], cs.zc])), d: o.tipo === 'imanes' ? o.imanD : o.d });
        mount(info, h('div', h('span', 'Corte'), h('b', n1(r.seccion / 100) + ' cm²')), h('div', h('span', 'Conectores'), h('b', o.tipo === 'ninguno' ? '—' : String(r.sitios.length))), h('div', h('span', 'Piezas'), h('b', String(r.imprimir.length))));
        mount(aviso, r.avisos.map(a => h('p.r8e-mal', '⚠️ ' + a)));
        window.__r8e && (window.__r8e.partir = { sitios: r.sitios.length, piezas: r.imprimir.map(x => x.t), seccion: Math.round(r.seccion) });
        return r;
      } catch (e) { mount(aviso, h('p.r8e-mal', '⚠️ ' + (e.message || e))); escena.planoCorte(null); return null; }
      finally { N.limpia(); total = null; }
    };
    const cambia = () => { ESTUDIO.partir = Object.assign({}, o, { pos: null }); prepara(); };
    const b0 = (() => { try { const L = objetivo ? [objetivo.id] : P.cuerpos.map(c => c.id); return PR.cajaDe(P, L); } catch (e) { return null; } })();
    const maxPos = b0 ? b0.dims[{ x: 0, y: 1, z: 2 }[o.eje]] : 200;
    if (o.pos === null || o.pos > maxPos) o.pos = Math.round(maxPos / 2 * 2) / 2; // a la mitad, ya escrito en su casilla
    mount(prop, h('div.r8e-prop-t', h('b', '✂️ PARTIR' + (objetivo ? ' · ' + (objetivo.nombre || PR.nombreTipo(objetivo)) : ' · TODO EL DISEÑO'))),
      h('p.small.muted', objetivo ? 'Parto la pieza elegida.' : 'Parto todo el diseño (o elige antes una pieza).'),
      h('div.r8e-seg', [['z', '⬌ Tumbado'], ['x', '⬍ De pie (X)'], ['y', '⬍ De pie (Y)']].map(([k, t]) => h('button' + (o.eje === k ? '.on' : ''), { type: 'button', 'data-eje': k, onclick: () => { o.eje = k; o.pos = null; panelPartir(); } }, t))),
      campoNum(o, 'pos', 'Dónde corto (desde el principio)', 0.5, Math.max(1, maxPos - 0.5), 0.5, 'mm', cambia),
      campoNum(o, 'inclina', 'Inclinar el corte', -60, 60, 1, '°', cambia),
      h('label.r8e-c.col', h('span', 'Conectores'), h('select.inp', { 'data-k': 'tipo', onchange: e => { o.tipo = e.target.value; panelPartir(); } }, Object.entries(N.CONECTORES).map(([k, t]) => h('option', { value: k, selected: o.tipo === k }, t)))),
      o.tipo !== 'ninguno' ? [campoNum(o, 'n', 'Cuántos (0 = los pongo yo)', 0, 8, 1, '', cambia),
        o.tipo === 'imanes' ? [campoNum(o, 'imanD', 'Diámetro del imán', 2, 30, 0.5, 'mm', cambia), campoNum(o, 'imanH', 'Grosor del imán', 1, 15, 0.5, 'mm', cambia)] : [campoNum(o, 'd', o.tipo === 'cola' ? 'Tamaño de la cola' : 'Diámetro del conector', 2, 20, 0.5, 'mm', cambia), campoNum(o, 'largo', 'Largo del conector', 4, 60, 1, 'mm', cambia)],
        o.tipo !== 'imanes' ? h('label.r8e-c.col', h('span', 'Encaje (tus holguras)'), h('select.inp', { onchange: e => { o.encaje = e.target.value; cambia(); } }, [['justo', 'Justo (' + ENCAJES.justo.toFixed(2).replace('.', ',') + ' mm por lado)'], ['presion', 'A presión (' + ENCAJES.presion.toFixed(2).replace('.', ',') + ')'], ['gira', 'Holgado (' + ENCAJES.gira.toFixed(2).replace('.', ',') + ')']].map(([k, t]) => h('option', { value: k, selected: o.encaje === k }, t)))) : null] : null,
      info, aviso,
      h('div.r8e-btns', btn('⬇ Descargar las partes (3MF)', () => descargaPartes('3mf'), { cls: 'primary r8e-partir-3mf' }), btn('🧩 STL por separado (.zip)', () => descargaPartes('zip'), { cls: 'r8e-partir-zip' }), btn('✂️ Partir en el diseño', () => aplicaPartir(), { cls: 'r8e-partir-ok' }), btn('Cancelar', () => ponHerr(null), { cls: 'ghost' })),
      h('p.tiny.muted', 'Al descargar, cada parte va tumbada con el corte hacia la cama (lista para imprimir sin soportes en esa cara). Los pasadores van tumbados aparte.'));
    prepara();
    function descargaPartes(como) {
      try {
        const L = objetivo ? [PR.colocado(objetivo, P)] : PR.partesFinales(P).map(x => x.m); const r = N.partir(N.union(L), o);
        // las partes, una al lado de la otra en la cama
        let x = 0; const col = (objetivo && objetivo.color) || '#7c6cff', partes = r.imprimir.map(p => { const b = N.caja(p.m), m = p.m.translate([x - b.min[0], 0, 0]); x += b.dims[0] + 6; return { m, nombre: p.t, color: p.t.startsWith('pasador') ? '#f7d117' : col }; });
        const base = nombreArchivo(); if (como === '3mf') baja(N.tresMF(partes.map(p => ({ m: N.aLaCama(p.m).translate([0, 0, 0]), nombre: p.nombre, color: p.color })), base), base + '_partido.3mf');
        else baja(zipStl(partes.map(p => ({ nombre: base + '_' + p.nombre + '.stl', m: N.aLaCama(p.m) }))), base + '_partido.zip');
        toast('✂️ ' + partes.length + ' partes descargadas', 'ok');
      } catch (e) { toast(e.message || String(e), 'bad', 7000); } finally { N.limpia(); }
    }
    function aplicaPartir() {
      try {
        const L = objetivo ? [PR.colocado(objetivo, P)] : PR.partesFinales(P).map(x => x.m); const r = N.partir(N.union(L), o), col = (objetivo && objetivo.color) || '#7c6cff';
        const nuevos = r.montadas.map(p => { const s = N.aSopa(p.m), id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); PR.MALLAS.set(id, s); return { tipo: 'malla', nombre: 'Parte ' + (p.t === 'arriba' ? 'A' : 'B'), p: { malla: id, archivo: 'corte' }, color: col }; });
        if (objetivo) PR.borrar(P, [objetivo.id]); else P.cuerpos = [];
        nuevos.forEach(c => PR.añadir(P, c)); sel = nuevos.map(c => c.id); herr = null; commit(); pintaCinta(); escena.planoCorte(null); toast('✂️ Partida en ' + nuevos.length + ' (con sus conectores). Los pasadores sueltos salen al descargar.', 'ok', 6000);
      } catch (e) { toast(e.message || String(e), 'bad', 7000); } finally { N.limpia(); }
    }
  }
  // ✨ DISEÑADOR IA
  async function panelIA() {
    const m = await import('../r8/ia_disenador.js').catch(e => { console.error(e); return null; });
    if (!m || herr !== 'ia') return; m.panel(prop, { P, alConstruir: (cuerpos, nombre) => { construyeAnimado(cuerpos, nombre); }, catalogo });
  }
  // la IA (o una receta) pone sus cuerpos de uno en uno, para verlo crecer
  async function construyeAnimado(cuerpos, nombre) {
    if (nombre && !P.cuerpos.length) P.nombre = nombre;
    for (const c of cuerpos) { PR.añadir(P, c); recalcula(true); await new Promise(r => setTimeout(r, 260)); escena.encuadrar(); }
    commit(); elige(cuerpos.filter(c => P.cuerpos.includes(c)).map(c => c.id).slice(-1));
  }
  // 🖨️ ajustes recomendados + descargar
  async function panelImprimir() {
    const m = await import('../r8/consejos3d.js').catch(e => { console.error(e); return null; }); if (!m || herr !== 'imprimir') return;
    if (!P.cuerpos.length) return mount(prop, h('div.r8e-prop-t', h('b', '🖨️ IMPRIMIR')), h('p.small', 'Primero diseña algo 🙂'));
    await m.panel(prop, { P, PR, N, nombre: nombreArchivo(), cama: P.cama || 256, alGirar: rot => { const g = PR.agrupar(P, P.cuerpos.map(c => c.id), 'unir'); if (g) { g.colores = 'cada'; g.nombre = 'Todo (tumbado para imprimir)'; g.t.rot = rot; PR.aLaCama(P, [g.id]); commit(); elige([g.id]); panelImprimir(); } }, baja, zipStl, catalogo });
    if (herr === 'imprimir') prop.appendChild(h('div.r8e-btns.r8e-adoctor', btn('🩺 Revisar a fondo en el Print Doctor', async () => { try { const L = PR.partesFinales(P), E = await import('../r8/estado.js'); E.ponEnMesa({ nombre: P.nombre || 'Mi diseño', origen: 'estudio', stl: new Uint8Array(N.stl(N.union(L.map(x => x.m)), nombreArchivo())) }); N.limpia(); ext.irA && ext.irA('doctor'); } catch (e) { N.limpia(); toast(e.message || String(e), 'bad'); } }, { cls: 'sm', title: 'Paredes finas, orientación con voladizos en rojo, soportes, informe… (v20)' })));
  }
  const nombreArchivo = () => String(P.nombre || 'diseno').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'diseno';
  function baja(blob, nombre) { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); if (window.__r8e) window.__r8e.bajado = { nombre, bytes: blob.size }; }
  const zipStl = L => zip(L.map(x => ({ nombre: x.nombre, datos: new Uint8Array(N.stl(x.m, x.nombre)) })));
  async function precio() {
    if (!P.cuerpos.length) return toast('Primero diseña algo.', 'warn');
    try { const L = PR.partesFinales(P), m = N.union(L.map(x => x.m)), f = new File([N.stl(m, nombreArchivo())], nombreArchivo() + '.stl', { type: 'model/stl' }); const cz = await import('./cotizador.js'); cz.cotizarArchivo(f); ext.go && ext.go('cotizador'); }
    catch (e) { toast(e.message || String(e), 'bad'); } finally { N.limpia(); }
  }
  async function proyectos() {
    const L = await PR.lista().catch(() => []), cuerpo = h('div.r8e-proys');
    const pinta = L2 => mount(cuerpo, h('div.r8e-proys-acc', btn('＋ Diseño nuevo', async () => { if (P.cuerpos.length && !(await confirmDlg('Diseño nuevo', 'El que tienes abierto queda guardado en «Proyectos».', 'Empezar uno nuevo'))) return; autoguarda(); ponProyecto(PR.nuevoProyecto()); m.close(); }, { cls: 'primary' }), btn('💾 Guardar ahora', async () => { autoguarda(); toast('💾 Guardado en este aparato', 'ok'); m.close(); }), btn('📤 Llevármelo (.r8)', () => { baja(new Blob([PR.aArchivo(P)], { type: 'application/json' }), nombreArchivo() + '.r8'); }), btn('📥 Abrir un .r8', () => fiR8.click())),
      L2.length ? h('div.r8e-proys-l', L2.map(x => h('div.r8e-proy', x.foto ? h('img', { src: x.foto, alt: '' }) : h('div.r8e-proy-sin', '🧊'), h('b', x.nombre), h('small', new Date(x.fecha).toLocaleString('es-ES')),
        h('div.row', btn('Abrir', async () => { try { ponProyecto(await PR.abrir(x.id)); m.close(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm primary' }), btn('🗑️', async () => { if (await confirmDlg('Borrar diseño', '¿Borro «' + x.nombre + '» de este aparato?', 'Borrar', true)) { await PR.quitar(x.id); pinta(L2.filter(y => y.id !== x.id)); } }, { cls: 'sm ghost', title: 'Borrar' }))))) : h('p.muted', 'Todavía no hay diseños guardados. Se guardan solos mientras trabajas.'));
    pinta(L); const m = modal('💾 Tus diseños (en este aparato)', cuerpo, null, { size: 'wide' });
  }

  // ---------- teclado, soltar archivos ----------
  raiz.addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || document.querySelector('.r8b')) return;
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? rehacer() : deshacer(); return; }
    if (ctrl && k === 'y') { e.preventDefault(); rehacer(); return; }
    if (ctrl && k === 'd') { e.preventDefault(); duplicar(); return; }
    if (ctrl && k === 's') { e.preventDefault(); autoguarda(); toast('💾 Guardado', 'ok'); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); borrar(); return; }
    if (e.key === 'Escape') { if (herr) ponHerr(null); else elige([]); return; }
    if (e.shiftKey) escena.fino(true);
    const t = { m: 'mover', r: 'girar', s: 'escalar' }[k]; if (t) { ponHerr(t); return; }
    if (k === 'h') return alternaHueco(); if (k === 'b') return nuevoBoceto(); if (k === 'f') return menuFormas(cinta.querySelector('[data-b="formas"]'));
  });
  raiz.addEventListener('keyup', e => { if (e.key === 'Shift') escena.fino(false); });
  vista.addEventListener('dragover', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); vista.classList.add('encima'); } });
  vista.addEventListener('dragleave', () => vista.classList.remove('encima'));
  vista.addEventListener('drop', e => { vista.classList.remove('encima'); const L = [...((e.dataTransfer && e.dataTransfer.files) || [])].filter(f => /\.(stl|3mf|obj)$/i.test(f.name)); if (L.length) { e.preventDefault(); e.stopPropagation(); L.forEach(importar); } });

  pintaCinta(); pintaNav(); pintaProp(); recalcula(true); setTimeout(() => escena && escena.encuadrar('iso'), 120);
  // una pieza que llega de otra pestaña (Foto → 3D, una parte cortada…) como malla editable
  function añadeMalla(sopa, nombre) { const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); PR.MALLAS.set(id, sopa); return añade({ tipo: 'malla', nombre: String(nombre || 'Pieza').slice(0, 40), p: { malla: id, archivo: nombre || 'pieza' }, color: colorSiguiente() }); }
  window.__r8eApi = { añadeMalla, añadeForma, añadeDiseno, importar, ponHerr, elige, commit, get P() { return P; }, set P(x) { ponProyecto(x); }, escena, PR, N, construyeAnimado };
  return {
    añadeDiseno, añadeMalla, construyeAnimado, ponProyecto, get P() { return P; },
    destroy() { vivo = false; clearTimeout(tic); clearTimeout(guardTic); if (P.cuerpos.length) autoguarda(); document.querySelectorAll('.r8e-menu').forEach(m => m.remove()); try { escena && escena.destruir(); } catch (e) { } delete window.__r8eApi; }
  };
}
