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
import * as CA from '../r8/caras.js'; // v20.2: elegir caras (empujar, boceto encima, plano, a la cama)
import * as EM from '../r8/empalme.js'; // v20.4: empalme (redondeo) y chaflán de bordes
import * as CH from '../r8/chivatos.js'; // v20.2: los chivatos (gira / encaja / choca / engrana / en el aire)
import * as T3 from '../../vendor/three/three_r8.js';

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
  // v20.4 · el CUBO DE VISTAS (gira con la cámara: una cara o una esquina) + inicio y encuadrar
  const cubo = h('div.r8e-cubo.r8e-vc', h('div.r8e-vc-b', [['iso', '⌂', 'Vista de inicio'], ['', '⤢', 'Encuadrar todo (ver la pieza entera)']].map(([k, t, ti]) => h('button', { type: 'button', title: ti, 'aria-label': ti, 'data-vista': k || 'todo', onclick: () => escena && escena.encuadrar(k || null, true) }, t))));
  const filtro = h('div.r8e-filtro');
  const vista = h('div.r8e-vista', lienzo, chips, etiquetas, cubo, filtro, vacio, cargando);
  const nav = h('div.r8e-nav'), prop = h('div.r8e-prop'), estado = h('div.r8e-estado'), cinta = h('div.r8e-cinta');
  const fi = h('input', { type: 'file', accept: '.stl,.3mf,.obj,.svg', multiple: true, style: { display: 'none' }, onchange: e => { [...(e.target.files || [])].forEach(importar); e.target.value = ''; } });
  const fiR8 = h('input', { type: 'file', accept: '.r8,.json', style: { display: 'none' }, onchange: e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) f.text().then(t => { try { ponProyecto(PR.deArchivo(t)); toast('📂 Proyecto abierto', 'ok'); } catch (x) { toast(x.message, 'bad'); } }); } });
  const raiz = h('div.r8e', { tabindex: '-1' }, cinta, h('div.r8e-main', nav, vista, prop), estado, fi, fiR8);
  el.appendChild(raiz);
  // v20.4 · PANELES QUE SE OCULTAN (la dueña: «haz que se puedan ocultar los paneles: tendrás más espacio»). Pestañitas en los bordes
  // de la vista, ⛶ para ocultar los dos y ︿ para la barra de herramientas. Atajos: [ (navegador) · ] (propiedades) · \ (los dos). Se recuerda.
  const PAN = (() => { try { return Object.assign({ nav: true, prop: true, cinta: true }, JSON.parse(localStorage.getItem('cd.r8.paneles') || '{}')); } catch (e) { return { nav: true, prop: true, cinta: true }; } })();
  const bNav = h('button.r8e-borde.izq', { type: 'button', 'data-panel': 'nav', onclick: () => panel('nav') }), bProp = h('button.r8e-borde.der', { type: 'button', 'data-panel': 'prop', onclick: () => panel('prop') });
  const bCinta = h('button.r8e-cinta-ver', { type: 'button', 'data-panel': 'cinta', title: 'Enseñar las herramientas', 'aria-label': 'Enseñar las herramientas', onclick: () => panel('cinta') }, '☰ Herramientas');
  vista.append(bNav, bProp, bCinta);
  // v20.4 · BARRA RÁPIDA para la tablet (lo más usado a mano del dedo); sale sola en pantallas táctiles y se quita en VER → 📱
  const tactil = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  if (PAN.tablet === undefined) PAN.tablet = tactil;
  const rapida = h('div.r8e-rapida', { role: 'toolbar', 'aria-label': 'Barra rápida' }, [['↶', 'Deshacer (o toque con dos dedos)', () => deshacer(), 'deshacer'], ['↷', 'Rehacer (o toque con tres dedos)', () => rehacer(), 'rehacer'], ['✥', 'Mover', () => ponHerr('mover'), 'mover'], ['⟳', 'Girar', () => ponHerr('girar'), 'girar'], ['⤢', 'Escalar', () => ponHerr('escalar'), 'escalar'],
    ['▱', 'Elegir caras', () => ponModoSel(modoSel === 'cara' ? 'pieza' : 'cara'), 'cara'], ['📏', 'Medir', () => ponHerr('medir'), 'medir'], ['⧉', 'Duplicar', () => duplicar(), 'duplicar'], ['🗑️', 'Borrar', () => borrar(), 'borrar'], ['⛶', 'Más espacio', () => panel('todo'), 'espacio']].map(([ic, t, f, k]) => h('button', { type: 'button', title: t, 'aria-label': t, 'data-r': k, onclick: f }, ic)));
  vista.append(rapida);
  function pintaPaneles() {
    raiz.classList.toggle('con-rapida', !!PAN.tablet);
    raiz.classList.toggle('sin-nav', !PAN.nav); raiz.classList.toggle('sin-prop', !PAN.prop); raiz.classList.toggle('sin-cinta', !PAN.cinta);
    bNav.textContent = PAN.nav ? '‹' : '›'; bNav.title = PAN.nav ? 'Ocultar el navegador ([)' : 'Enseñar el navegador ([)'; bNav.setAttribute('aria-label', bNav.title);
    bProp.textContent = PAN.prop ? '›' : '‹'; bProp.title = PAN.prop ? 'Ocultar las propiedades (])' : 'Enseñar las propiedades (])'; bProp.setAttribute('aria-label', bProp.title);
    try { localStorage.setItem('cd.r8.paneles', JSON.stringify(PAN)); } catch (e) { }
    const b = cinta.querySelector('[data-b="espacio"]'); if (b) b.classList.toggle('on', !PAN.nav && !PAN.prop);
  }
  function panel(k, v) { if (k === 'todo') { const ver = v ?? !(PAN.nav || PAN.prop); PAN.nav = PAN.prop = ver; } else PAN[k] = v ?? !PAN[k]; pintaPaneles(); }
  pintaPaneles();
  // v20.2 · la LÍNEA DE TIEMPO (debajo de todo) y los CHIVATOS (la campanita 🔔 abajo a la izquierda y el aviso de la pieza elegida arriba)
  const linea = h('div.r8e-linea', { role: 'toolbar', 'aria-label': 'Línea de tiempo: los pasos del diseño' }), chiv = h('div.r8e-chiv'), chivChip = h('div.r8e-chivchip', { 'aria-live': 'polite' });
  raiz.insertBefore(linea, estado); vista.append(chiv, chivChip);

  let P = ESTUDIO.P || PR.nuevoProyecto(), sel = ESTUDIO.sel || [], herr = null, H = PR.historial(P), R = null, escena = null, tic = 0, vivo = true, medida = [], partirO = null, guardTic = 0;
  // v20.2 · elegir PIEZAS o CARAS · la cara elegida · el elemento de construcción elegido · modo de vista · la info exacta, al parar
  let modoSel = 'pieza', caraSel = null, consSel = null, infoTic = 0;
  // v20.2 · la dueña: «tiene que haber unir, cortar, nuevo componente». Lo que se crea se UNE a la pieza elegida, la CORTA o va APARTE
  let opCrear = ESTUDIO.op || 'nuevo';
  ESTUDIO.P = P;
  let chivOn = true; try { chivOn = localStorage.getItem('cd.r8.chivatos') !== '0'; } catch (e) { }
  const CHIV = { lista: [], abierto: false, verInfo: false, tic: 0, firma: '', ms: 0 };

  // ---------- la cinta (como Fusion) ----------
  const grupo = (t, ...b) => h('div.r8e-gr', h('div.r8e-grb', b), h('small', t));
  const rb = (ic, t, f, o = {}) => h('button.r8e-b' + (t ? '' : '.mini'), { type: 'button', title: o.title || t, 'aria-label': o.title || t, 'data-b': o.k || t, onclick: e => f(e) }, h('span', ic), t ? h('small', t) : null);
  function pintaCinta() {
    mount(cinta,
      grupo('CREAR', rb('✏️', 'Boceto', () => nuevoBoceto(), { k: 'boceto', title: 'Dibujar un boceto y extruirlo, girarlo o inflarlo (B)' }), rb('🧊', 'Formas', e => menuFormas(e.currentTarget), { k: 'formas', title: 'Caja, cilindro, esfera, estrella, corazón, rosca… (F)' }), rb('🔩', 'Componentes', e => menuComponentes(e.currentTarget), { k: 'componentes', title: 'Agujero de tornillo, tuerca, imán, rosca de bote, bisagra…' }), rb('🛍️', 'Catálogo', () => ext.irA && ext.irA('catalogo'), { k: 'catalogo' }), rb('📂', 'Importar', () => fi.click(), { k: 'importar', title: 'Abrir un STL, 3MF, OBJ o un dibujo SVG (o suéltalo encima)' }), rb('✨', 'IA', () => ponHerr('ia'), { k: 'ia', title: 'Diseñador IA: descríbelo y lo construye' })),
      grupo('MODIFICAR', rb('✥', 'Mover', () => ponHerr('mover'), { k: 'mover', title: 'Mover (M)' }), rb('⟳', 'Girar', () => ponHerr('girar'), { k: 'girar', title: 'Girar (R)' }), rb('⤢', 'Escalar', () => ponHerr('escalar'), { k: 'escalar', title: 'Escalar (S)' }), rb('🌈', 'Deformar', () => ponHerr('deformar'), { k: 'deformar', title: 'Doblar, retorcer, estrechar, inclinar, ondas' }), rb('⬓', 'Vaciar', () => vaciarSel(), { k: 'vaciar', title: 'Dejarla hueca con paredes' }), rb('⇋', 'Espejo', e => menuEspejo(e.currentTarget), { k: 'espejo' }), rb('▦', 'Patrón', () => ponHerr('matriz'), { k: 'matriz', title: 'Patrón: copias en fila, en rejilla o en círculo alrededor de un eje' }), rb('✂', 'Cortar', () => ponHerr('cortar'), { k: 'cortar', title: 'Cortar con un plano (o con una cara): te quedas con un lado o con los dos' }), rb('⇔', 'Desfase', () => desfaseSel(), { k: 'desfase', title: 'Desfase: la pieza entera más gorda (+) o más fina (−)' }), rb('⧉', 'Duplicar', () => duplicar(), { k: 'duplicar', title: 'Duplicar (Ctrl+D)' })),
      grupo('CONSTRUIR', rb('▱', 'Cara', () => ponModoSel(modoSel === 'cara' ? 'pieza' : 'cara'), { k: 'modocara', title: 'Elegir CARAS (C): empujar, boceto encima, plano, a la cama' }), rb('📐', 'Plano', e => menuPlano(e.currentTarget), { k: 'plano', title: 'Plano de construcción: desfasado, en ángulo o en una cara' }), rb('／', 'Eje', e => menuEje(e.currentTarget), { k: 'eje', title: 'Eje de construcción (para patrones en círculo)' })),
      grupo('COMBINAR', rb('◐', 'Hueco', () => alternaHueco(), { k: 'hueco', title: 'Sólido ↔ hueco (H): un hueco se resta de lo que toca' }), rb('∪', 'Unir', () => combinar('unir'), { k: 'unir' }), rb('−', 'Restar', () => combinar('restar'), { k: 'restar', title: 'El primero que elegiste menos los demás' }), rb('∩', 'Cruce', () => combinar('cruce'), { k: 'cruce', title: 'Solo lo que tienen en común' }), rb('⊡', 'Separar', () => desagrupar(), { k: 'desagrupar', title: 'Deshacer el grupo' })),
      grupo('INSPECCIONAR', rb('📏', 'Medir', () => ponHerr('medir'), { k: 'medir', title: 'Medir entre dos puntos' }), rb('⌖', 'Centro', () => ponHerr('centro'), { k: 'centro', title: 'Marcar el centro: de la caja, de masa, de una cara o de un círculo' }), rb('✂️', 'Partir', () => ponHerr('partir'), { k: 'partir', title: 'Partir con conectores (pasadores, espiga, imanes, cola de milano)' }), rb('🖨️', 'Imprimir', () => ponHerr('imprimir'), { k: 'imprimir', title: 'Preparar para tu Bambu y descargar (STL / 3MF con los ajustes)' }), rb('🎞️', 'Capas', () => { capas = !capas; escena && escena.capas(capas); recalcula(true); }, { k: 'capas', title: 'Ver las capas de impresión' }), rb('🎬', 'Animar', () => ponHerr('animar'), { k: 'animar', title: 'Ver cómo se mueve: girar, ir y venir, engranajes, despiece… y grabar un vídeo' })),
      grupo('ARCHIVO', rb('↶', '', () => deshacer(), { k: 'deshacer', title: 'Deshacer (Ctrl+Z)' }), rb('↷', '', () => rehacer(), { k: 'rehacer', title: 'Rehacer (Ctrl+Y)' }), rb('💾', 'Proyectos', () => proyectos(), { k: 'proyectos' }), rb('⚡', 'Precio', () => precio(), { k: 'precio' }), rb('📸', 'Escaparate', () => sorpresa('escaparate'), { k: 'escaparate', title: 'Foto de estudio y vídeo 360° para anunciarla antes de imprimirla' }), rb('🎬', 'Fantasma', () => sorpresa('fantasma'), { k: 'fantasma', title: 'Impresión fantasma: mira cómo se imprimirá, capa a capa' })),
      grupo('VER', rb('📱', '', () => { PAN.tablet = !PAN.tablet; pintaPaneles(); pintaCinta(); toast(PAN.tablet ? '📱 Barra rápida a la izquierda. Toque con 2 dedos = deshacer · 3 dedos = rehacer · mantén pulsada una pieza = su menú.' : 'Barra rápida quitada', 'ok', 5000); }, { k: 'tablet', title: '📱 Tablet: barra rápida para el dedo y el lápiz (y sus atajos)' }), rb('⛶', '', () => panel('todo'), { k: 'espacio', title: 'Ocultar o enseñar los dos paneles (\\): más sitio para la pieza' }), rb('︿', 'Barra', () => panel('cinta', false), { k: 'ocultacinta', title: '︿ Ocultar esta barra de herramientas (vuelve con «☰ Herramientas»)' })));
    cinta.querySelectorAll('[data-b]').forEach(b => b.classList.toggle('on', b.dataset.b === herr || (b.dataset.b === 'capas' && capas) || (b.dataset.b === 'modocara' && modoSel === 'cara') || (b.dataset.b === 'espacio' && typeof PAN !== 'undefined' && !PAN.nav && !PAN.prop) || (b.dataset.b === 'tablet' && typeof PAN !== 'undefined' && PAN.tablet)));
    pintaFiltro();
  }
  let capas = false;

  // ---------- motor y vista ----------
  try { await N.cargar(); } catch (e) { mount(cargando, h('b', '⚠️ No se ha podido encender el motor 3D: ' + (e.message || e))); return { destroy() { } }; }
  if (!vivo) return { destroy() { } };
  try { escena = crearEscena(lienzo, { cama: P.cama || 256, dia: document.documentElement.getAttribute('data-modo') === 'dia' }); } catch (e) { mount(cargando, h('b', '⚠️ Este aparato no deja ver en 3D (WebGL): ' + (e.message || e))); return { destroy() { } }; }
  cargando.remove();
  escena.alDibujar = pintaEtiquetas;
  try { escena.cuboVistas(cubo); } catch (e) { console.warn('cubo de vistas', e); } // v20.4
  try { const op = Number(localStorage.getItem('cd.r8.opacidad')); if (op >= 0.1 && op <= 1) escena.ponOpacidad(op); } catch (e) { }
  const catalogo = await import('../r8/catalogo.js').catch(e => { console.error(e); return null; });

  // ---------- calcular y pintar ----------
  function recalcula(ya) { clearTimeout(tic); tic = setTimeout(hazCalculo, ya ? 0 : 50); }
  function hazCalculo() {
    if (!vivo) return;
    const Pv = vistaP(); R = PR.evaluar(Pv);
    escena.ponPartes(R.partes, R.huecos); escena.marcadores(null); escena.ponProxies(R.proxies.map(x => ({ id: x.id, vista: x.vista, matriz: PR.matriz4(x.t) })));
    pintaCons();
    // lo exacto (volumen sin solapes, piezas sueltas) cuando paras de tocar
    clearTimeout(infoTic); if (R.info && R.info.rapido) infoTic = setTimeout(() => { if (!vivo || !R) return; try { const I = PR.infoExacta(vistaP()); if (I) { R.info = I; pintaEstado(); window.__r8e && (window.__r8e.info = I); } } catch (e) { } }, 650);
    marcaSel(); pintaEstado(); pintaFlechas(); pintaLinea(); programaChivatos();
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
  function elige(ids, sumar) { if (herr === 'cons' && ids.length) { herr = null; consSel = null; pintaCons(); } if (herr === 'cara' && modoSel !== 'cara') { quitaCara(); } sel = sumar ? [...new Set(sel.filter(x => !ids.includes(x)).concat(ids.filter(x => !sel.includes(x))))] : ids; ESTUDIO.sel = sel; marcaSel(); pintaFlechas(); pintaNav(); pintaProp(); pintaChiv(); pintaLinea(); window.__r8e && (window.__r8e.sel = sel.slice()); }
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
  // v20.4 · TABLET PRO (la dueña: «funciones pro para la tablet, atajos»): toque con 2 dedos = deshacer · con 3 = rehacer (sin moverlos;
  // girar y pellizcar la vista sigue igual) · MANTENER PULSADO sobre una pieza = su menú (duplicar, hueco, espejo, a la cama, borrar…)
  const toques = new Map(); let multi = null, largo = null;
  lienzo.addEventListener('pointerdown', e => {
    abajo = { x: e.clientX, y: e.clientY, t: Date.now() };
    if (e.pointerType === 'touch') { toques.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (toques.size >= 2) { multi = { n: Math.max(toques.size, multi ? multi.n : 0), t0: multi ? multi.t0 : Date.now(), movio: multi ? multi.movio : false }; abajo = null; clearTimeout(largo); largo = null; } }
    if (e.pointerType !== 'mouse' && toques.size < 2) { clearTimeout(largo); const ev0 = { clientX: e.clientX, clientY: e.clientY }; largo = setTimeout(() => { largo = null; if (!abajo || escena.arrastrando) return; abajo = null; menuPieza(ev0); }, 550); }
  });
  lienzo.addEventListener('pointermove', e => {
    const t = toques.get(e.pointerId); if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 && multi) multi.movio = true;
    if (abajo && Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) > 8) { clearTimeout(largo); largo = null; }
  });
  const finToque = e => { if (!toques.has(e.pointerId)) return; toques.delete(e.pointerId); if (!toques.size && multi) { const m = multi; multi = null; if (!m.movio && Date.now() - m.t0 < 400) { if (m.n === 2) { deshacer(); toast('↶ Deshecho (toque con dos dedos)', '', 1400); } else if (m.n >= 3) { rehacer(); toast('↷ Rehecho (toque con tres dedos)', '', 1400); } } } };
  lienzo.addEventListener('pointercancel', e => { clearTimeout(largo); largo = null; finToque(e); });
  function menuPieza(ev0) {
    const id = escena.cuerpoEn(ev0); if (!id) return; elige([id]); const c = PR.busca(P, id); if (!c) return;
    const ancla = h('div', { style: { position: 'fixed', left: ev0.clientX + 'px', top: (ev0.clientY - 8) + 'px', width: '1px', height: '1px' } }); document.body.appendChild(ancla);
    menu(ancla, [['⧉', 'Duplicar', () => duplicar()], [c.hueco ? '●' : '◐', c.hueco ? 'Hacerla sólida' : 'Hacerla hueco', () => alternaHueco()], ['⇋', 'Espejo en X', () => { PR.espejo(P, [id], 'x'); commit(); }],
      ['⤓', 'A la cama', () => { PR.aLaCama(P, [id]); commit(); }], ['⌖', 'Al centro', () => { const bb = PR.cajaDe(P, [id]); if (bb) { c.t.pos[0] = r3(c.t.pos[0] - (bb.min[0] + bb.max[0]) / 2); c.t.pos[1] = r3(c.t.pos[1] - (bb.min[1] + bb.max[1]) / 2); commit(); } }],
      ['✥', 'Mover', () => ponHerr('mover')], ['📋', 'Propiedades', () => { if (typeof PAN !== 'undefined' && !PAN.prop) panel('prop', true); pintaProp(); }], ['🗑️', 'Borrar', () => borrar()]], 'r8e-menu-pieza');
    setTimeout(() => ancla.remove(), 0); if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) { }
  }
  lienzo.addEventListener('pointerup', e => {
    clearTimeout(largo); largo = null; finToque(e);
    if (!abajo || escena.arrastrando || Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) > 5 || e.button !== 0) { abajo = null; return; } abajo = null;
    if (herr === 'medir') { const q = escena.puntoEn(e); if (!q) return; medida = medida.length >= 2 ? [q] : medida.concat([q]); escena.medida(medida[0].p, medida[1] && medida[1].p); pintaProp(); escena.pide(); return; }
    if (herr === 'partir' && partirO && partirO.manual && partirO._plano && partirO._R) { // v20.2: conectores A MANO
      const q = escena.puntoPlano(e, partirO._plano); if (!q) return; const R0 = partirO._R, x = R0[0][0] * q[0] + R0[0][1] * q[1] + R0[0][2] * q[2], y = R0[1][0] * q[0] + R0[1][1] * q[1] + R0[1][2] * q[2];
      const cerca2 = partirO.sitios.findIndex(s => Math.hypot(s[0] - x, s[1] - y) < Math.max(3, (partirO.d || 5) * 0.8));
      if (cerca2 >= 0) partirO.sitios.splice(cerca2, 1); else partirO.sitios.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
      if (partirO._prepara) partirO._prepara(); panelPartir(); return;
    }
    if (modoSel === 'cara') { eligeCara(e); return; }
    const id = escena.cuerpoEn(e); if (id) elige([id], e.shiftKey || e.ctrlKey || e.metaKey);
    else { const k = escena.consEn(e); if (k) eligeCons(k); else if (!e.shiftKey) elige([]); }
  });
  lienzo.addEventListener('dblclick', e => { const id = escena.cuerpoEn(e), c = id && PR.busca(P, id); if (c && c.tipo === 'boceto') editaBoceto(c); });

  // ---------- cambios ----------
  function commit() { if (H.apunta(P)) { clearTimeout(guardTic); guardTic = setTimeout(autoguarda, 1500); } ESTUDIO.P = P; recalcula(); pintaNav(); pintaProp(); }
  function autoguarda() { if (!P.cuerpos.length) return; let foto = ''; try { foto = escena.foto('image/jpeg', 0.6); } catch (e) { } PR.guardar(P, foto).catch(() => { }); }
  function ponProyecto(P2) { P = P2; ESTUDIO.P = P; H = PR.historial(P); sel = []; ESTUDIO.sel = sel; escena.cama(P.cama || 256); recalcula(true); pintaNav(); pintaProp(); setTimeout(() => escena.encuadrar('iso'), 80); }
  function deshacer() { const x = H.deshacer(); if (x) { P = x; ESTUDIO.P = P; sel = sel.filter(id => PR.busca(P, id)); recalcula(true); pintaNav(); pintaProp(); } }
  function rehacer() { const x = H.rehacer(); if (x) { P = x; ESTUDIO.P = P; sel = sel.filter(id => PR.busca(P, id)); recalcula(true); pintaNav(); pintaProp(); } }
  function añade(c, o = {}) {
    const destino = !o.sinOp && opCrear !== 'nuevo' && sel.length === 1 ? PR.busca(P, sel[0]) : null; // la pieza elegida ANTES de crear
    PR.añadir(P, c);
    if (!o.sinOp && opCrear === 'cortar') c.hueco = true;
    if (destino && top(destino.id) && destino.id !== c.id) {
      // encima de ella (unir) o atravesándola (cortar), centrado en su X e Y
      try { const bd = PR.cajaDe(P, [destino.id]), bc = PR.cajaDe(P, [c.id]); if (bd && bc) { c.t.pos[0] = r3(c.t.pos[0] + (bd.min[0] + bd.max[0]) / 2 - (bc.min[0] + bc.max[0]) / 2); c.t.pos[1] = r3(c.t.pos[1] + (bd.min[1] + bd.max[1]) / 2 - (bc.min[1] + bc.max[1]) / 2); c.t.pos[2] = r3(c.t.pos[2] + (opCrear === 'unir' ? bd.max[2] - 0.01 : bd.min[2] - 0.5) - bc.min[2]); } } catch (e) { }
      if (opCrear === 'unir') { c.une = destino.id; c.color = destino.color; c.acabado = destino.acabado; c.nombre = (c.nombre || PR.nombreTipo(c)) + ' (unida)'; }
      else c.nombre = 'Corte: ' + (c.nombre || PR.nombreTipo(c));
      o = Object.assign({}, o, { quieto: true, sinCama: true });
      toast(opCrear === 'unir' ? '➕ Unida a «' + (destino.nombre || PR.nombreTipo(destino)) + '»: muévela con las flechas; al guardar sale como una sola pieza' : '➖ Corta a «' + (destino.nombre || PR.nombreTipo(destino)) + '»: muévela con las flechas para colocar el corte', 'ok', 4500);
    } else if (!o.sinOp && opCrear === 'unir' && P.cuerpos.length > 1) toast('Para UNIR, elige antes la pieza a la que se une. Ahora sale como pieza nueva.', 'warn', 4500);
    // lo nuevo aparece al lado de lo que ya hay (no encima), apoyado en la cama
    if (!o.quieto && P.cuerpos.length > 1) { try { const b = PR.cajaDe(P, P.cuerpos.filter(x => x !== c).map(x => x.id)), bc = PR.cajaDe(P, [c.id]); if (b && bc) c.t.pos[0] = r3(c.t.pos[0] + b.max[0] - bc.min[0] + 8); } catch (e) { } }
    if (!o.sinCama) { try { PR.aLaCama(P, [c.id]); } catch (e) { } }
    commit(); elige([c.id]); if (!herr) ponHerr('mover'); else pintaFlechas(); setTimeout(() => escena.encuadrar(), 60);
    return c;
  }
  function añadeForma(tipo) { const F = N.FORMAS3D[tipo]; añade({ tipo, nombre: F.t, p: Object.assign({}, F.p), color: colorSiguiente() }); }
  const GRIS = '#b4b8bf'; // v20.2: la dueña: «el sólido de color gris»
  const colorSiguiente = () => GRIS;
  async function nuevoBoceto() { const p = await editarBoceto(vista, { formas: [] }); if (p && p.crear) return creaDeFoto(p.crear); if (p) añade({ tipo: 'boceto', nombre: p.modo === 'inflar' ? 'Dibujo inflado' : p.modo === 'revolucion' ? 'Pieza girada' : 'Boceto extruido', p, color: colorSiguiente() }); }
  async function editaBoceto(c) { escena.flechas(null); const p = await editarBoceto(vista, c.p); if (p && p.crear) { pintaFlechas(); return creaDeFoto(p.crear); } if (p) { c.p = p; commit(); } pintaFlechas(); }
  // v20.4 · lo que se lee en una foto (un engranaje, un acoplamiento) → la pieza del catálogo con esas medidas, editable
  function creaDeFoto(o) { const c = añadeDiseno(o.k, o.p); if (c) { c.nombre = o.nombre || c.nombre; commit(); toast('📷 ' + (o.nombre || 'Pieza') + ' creada con las medidas de tu foto. Revisa a la derecha lo que se mide con el calibre.', 'ok', 7000); } return c; }
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
      if (/\.svg$/i.test(f.name)) { const txt = await f.text(); const p = await editarBoceto(vista, { formas: [], svgTexto: txt, svgNombre: f.name }); if (p && p.crear) return creaDeFoto(p.crear); if (p) añade({ tipo: 'boceto', nombre: f.name.replace(/\.svg$/i, '').slice(0, 40), p, color: colorSiguiente() }); return; } // v20.4: un SVG → boceto (con sus agujeros)
      if (!/\.(stl|3mf|obj)$/i.test(f.name)) throw new Error('Elige un archivo STL, 3MF, OBJ o SVG.');
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
  function añadeDiseno(k, p, o = {}) { const D = catalogo && catalogo.DISENOS[k]; if (!D) return toast('No encuentro ese diseño.', 'bad'); const v = Object.assign(catalogo.valores(k), p || {}, { k }); return añade({ tipo: 'cat', nombre: D.t, p: v, color: o.color || colorSiguiente(), acabado: o.acabado || 'mate', hueco: !!(o.hueco ?? D.hueco) }); }
  function menuFormas(ancla) { menu(ancla, Object.entries(N.FORMAS3D).map(([k, f]) => [f.e, f.t, () => añadeForma(k)]), 'r8e-menu-formas'); }
  function menuComponentes(ancla) { if (!catalogo) return; menu(ancla, Object.entries(catalogo.DISENOS).filter(([, d]) => d.cat === 'componentes').map(([k, d]) => [d.e, d.t, () => añadeDiseno(k)]), 'r8e-menu-comp'); }
  function menuEspejo(ancla) { if (!sel.length) return toast('Elige antes una pieza.', 'warn'); menu(ancla, [['↔', 'Espejo en X', () => { PR.espejo(P, sel, 'x'); commit(); }], ['↕', 'Espejo en Y', () => { PR.espejo(P, sel, 'y'); commit(); }], ['⬍', 'Espejo en Z', () => { PR.espejo(P, sel, 'z'); PR.aLaCama(P, sel); commit(); }]]); }
  function menu(ancla, items, cls = '') {
    document.querySelectorAll('.r8e-menu').forEach(m => m.remove());
    const r = ancla.getBoundingClientRect(), m = h('div.r8e-menu' + (cls ? '.' + cls : ''), { style: { left: Math.max(8, Math.min(window.innerWidth - 340, r.left)) + 'px', top: (r.bottom + 6) + 'px' } }, items.map(([ic, t, f]) => h('button', { type: 'button', onclick: () => { m.remove(); f(); } }, h('span', ic), h('b', t))));
    document.body.appendChild(m); setTimeout(() => document.addEventListener('pointerdown', function fuera(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', fuera); } }), 0);
  }

  // ================= v20.2 · CARAS, CONSTRUCCIÓN, CORTAR, DESFASE (lo que pidió la dueña: «mejor que Fusion») =================
  function pintaFiltro() {
    mount(filtro, h('div.r8e-filtro-g', h('small', 'Elegir'), [['pieza', '🧊 Pieza'], ['cara', '▱ Cara']].map(([k, t]) => h('button' + (modoSel === k ? '.on' : ''), { type: 'button', 'data-sel': k, title: k === 'cara' ? 'Toca una cara plana (C)' : 'Toca una pieza entera', onclick: () => ponModoSel(k) }, t))),
      h('div.r8e-filtro-g', h('small', 'Ver'), [['aristas', 'Aristas'], ['sombreado', 'Liso'], ['rayosx', 'Rayos X']].map(([k, t]) => h('button' + (escena && escena.vistaModo() === k ? '.on' : ''), { type: 'button', 'data-ver': k, onclick: () => { escena.vistaModo(k); recalcula(true); pintaFiltro(); } }, t))),
      h('div.r8e-filtro-g.r8e-op', { title: 'Qué hace lo que creas (formas, bocetos, componentes)' }, h('small', 'Al crear'), [['unir', '➕ Unir'], ['cortar', '➖ Cortar'], ['nuevo', '🧩 Nuevo componente']].map(([k, t]) => h('button' + (opCrear === k ? '.on' : ''), { type: 'button', 'data-op': k, title: { unir: 'Se une a la pieza elegida (una sola pieza)', cortar: 'Hace un agujero / corta la pieza que toca', nuevo: 'Pieza aparte (otro componente)' }[k], onclick: () => { opCrear = k; ESTUDIO.op = k; pintaFiltro(); } }, t))),
      h('label.r8e-filtro-g.r8e-opac', { title: 'Opacidad de las piezas: bájala para ver a través' }, h('small', 'Opacidad'), h('input', { type: 'range', min: 10, max: 100, step: 5, value: Math.round((escena ? escena.ponOpacidad() : 1) * 100), 'aria-label': 'Opacidad de las piezas', oninput: e => { const v = Number(e.target.value) / 100; escena.ponOpacidad(v); try { localStorage.setItem('cd.r8.opacidad', String(v)); } catch (x) { } recalcula(true); e.target.nextSibling.textContent = e.target.value + ' %'; } }), h('b', Math.round((escena ? escena.ponOpacidad() : 1) * 100) + ' %')));
  }
  function ponModoSel(k) { modoSel = k; if (k !== 'cara') quitaCara(); else if (['mover', 'girar', 'escalar'].includes(herr)) { herr = null; escena.flechas(null); } pintaCinta(); pintaProp(); toast(k === 'cara' ? '▱ Toca una CARA plana de la pieza' : '🧊 Toca una pieza entera', '', 1800); }
  function quitaCara() { caraSel = null; escena && escena.ponCara(null); escena && escena.fantasmas(null); if (herr === 'cara') herr = null; }
  function eligeCara(e) {
    const c = escena.caraEn(e); if (!c) { quitaCara(); pintaProp(); return; }
    try { const F = CA.caraPlana(c.vista, c.tri, c.matriz); let BD = null; try { BD = EM.bordesDeCara(c.vista, c.tri, c.matriz); } catch (x) { BD = null; } caraSel = { id: c.id, sub: c.sub || null, F, BD, emp: (caraSel && caraSel.emp) || { tipo: 'redondeo', r: 1, quita: {} }, d: (caraSel && caraSel.d) || 2 }; caraSel.emp.quita = {}; escena.ponCara({ tris: F.tris, bordes: F.bordes }); sel = [c.id]; ESTUDIO.sel = sel; marcaSel(); pintaNav(); herr = 'cara'; escena.flechas(null); pintaCinta(); pintaProp(); window.__r8e && (window.__r8e.cara = { id: c.id, area: F.area, n: F.n, curva: F.curva, anillos: F.anillos.length }); }
    catch (x) { toast(x.message || String(x), 'bad'); }
  }
  // vista previa de empujar/tirar (fantasma azul) y aplicarlo: la cara + su cuerpo pasan a ser UN cuerpo (un grupo)
  function previaEmpuje() { if (!caraSel) return; try { const m = PR.vistaEmpuje({ base: caraSel.F.base, anillos: caraSel.F.anillos, d: caraSel.d }); escena.fantasmas([{ vista: m, matriz: null }], caraSel.d < 0 ? '#ff4d6d' : '#3ddc84'); } catch (e) { escena.fantasmas(null); } }
  function aplicaEmpuje() {
    if (!caraSel || Math.abs(caraSel.d) < 0.01) return toast('Escribe cuánto empujar (+) o tirar hacia dentro (−).', 'warn');
    const src = PR.busca(P, caraSel.id); if (!src) return;
    const d = Math.round(caraSel.d * 100) / 100, nuevo = PR.añadir(P, { tipo: 'empuje', nombre: (d > 0 ? 'Saliente ' : 'Rebaje ') + n1(Math.abs(d)) + ' mm', p: { base: caraSel.F.base, anillos: caraSel.F.anillos, d }, color: src.color, acabado: src.acabado, hueco: d < 0 });
    const g = PR.agrupar(P, [src.id, nuevo.id], 'unir', nuevo.n); if (g) { g.nombre = (src.nombre || PR.nombreTipo(src)) + (d > 0 ? ' + saliente' : ' − rebaje'); g.color = src.color; g.acabado = src.acabado; }
    quitaCara(); commit(); elige(g ? [g.id] : [nuevo.id]); toast((d > 0 ? '⇧ Cara empujada ' : '⇩ Cara hundida ') + n1(Math.abs(d)) + ' mm (se puede cambiar en el navegador)', 'ok');
  }
  // boceto SOBRE una cara o un plano: lo dibujado se pega a esa cara (y suma o corta, hacia fuera o hacia dentro)
  let caraOrigen = null;
  async function bocetoEnPlano(B, anillos, de) {
    caraOrigen = de === 'cara' && caraSel ? caraSel.id : null;
    quitaCara(); escena.flechas(null);
    const p = await editarBoceto(vista, { formas: [], guias: anillos || [], enCara: de, op: 'unir', dir: 'fuera', base: B });
    if (!p) return pintaFlechas();
    const M = new T3.Matrix4().makeBasis(new T3.Vector3(...B.u), new T3.Vector3(...B.v), new T3.Vector3(...B.n)).setPosition(new T3.Vector3(...B.o));
    const srcId = caraOrigen; const src = srcId && PR.busca(P, srcId);
    const c = añade({ tipo: 'boceto', nombre: p.op === 'cortar' ? 'Corte en ' + (de === 'plano' ? 'el plano' : 'la cara') : 'Boceto en ' + (de === 'plano' ? 'el plano' : 'la cara'), p, color: p.op === 'unir' && src ? src.color : colorSiguiente(), acabado: p.op === 'unir' && src ? src.acabado : 'mate', hueco: p.op === 'cortar', une: p.op === 'unir' && src ? src.id : undefined }, { quieto: true, sinCama: true, sinOp: true });
    c.t = PR.deMatriz(M); commit(); escena.encuadrar();
  }
  // ---------- v20.4 · ◜ EMPALME (redondeo) y CHAFLÁN de los bordes de la cara elegida ----------
  const bordesElegidos = () => { const B = caraSel && caraSel.BD; if (!B) return []; return B.rectas.concat(B.circulos).filter((x, i) => !caraSel.emp.quita[i]); };
  function previaEmpalme() {
    const L = bordesElegidos(), o = caraSel && caraSel.emp; if (!L.length || !(o.r > 0)) return escena.fantasmas(null);
    try { const max = EM.maximo(L, o.tipo); if (o.r > max + 1e-9) return escena.fantasmas(null); const reg = N.union(L.map(x => EM.regionDe(x, o.tipo, o.r))); escena.fantasmas([{ vista: N.aVista(reg), matriz: null }], L.some(x => x.convexa) ? '#ff4d6d' : '#3ddc84'); }
    catch (e) { escena.fantasmas(null); } finally { N.limpia(); }
  }
  function aplicaEmpalme() {
    const L = bordesElegidos(), o = caraSel.emp; if (!L.length) return toast('Marca al menos un borde.', 'warn');
    const max = EM.maximo(L, o.tipo); if (!(o.r > 0.05)) return toast('Escribe el radio (en mm).', 'warn');
    if (o.r > max + 1e-9) return toast('⚠️ Radio imposible: en esos bordes cabe como mucho ' + n1(Math.max(0, max)) + ' mm (lo que miden las caras de al lado). Bájalo o quita algún borde.', 'bad', 9000);
    const id = caraSel.sub || caraSel.id, c = PR.busca(P, id); if (!c) return;
    const Mw = PR.matrizMundo(P, id), Mi = Mw.clone().invert().elements, aristas = L.map(x => EM.aLocal(x, Mi, Mw.elements));
    // los bordes tienen que estar EN la pieza (un hueco suelto que todavía no está agrupado con ella no cuenta)
    let malos = 0; try { const m = PR.localDeId(P, id); aristas.forEach(x => { if (!EM.sigueAhi(m, x)) malos++; }); } catch (e) { malos = 0; } finally { N.limpia(); }
    if (malos) return toast('⚠️ ' + (malos === aristas.length ? 'Esos bordes' : malos + ' de esos bordes') + ' son de un HUECO suelto, no de la pieza: elige la pieza y el hueco y pulsa «∪ Unir» (o «− Restar»); luego redondea.', 'bad', 10000);
    c.empalmes = (c.empalmes || []).concat([{ tipo: o.tipo, r: Math.round(o.r * 100) / 100, aristas }]);
    quitaCara(); modoSel = 'pieza'; commit(); elige([id]); pintaCinta();
    toast((o.tipo === 'chaflan' ? '◺ Chaflán de ' : '◜ Redondeo de ') + n1(o.r) + ' mm en ' + aristas.length + ' borde' + (aristas.length === 1 ? '' : 's') + '. Cámbialo o quítalo en las propiedades de la pieza.', 'ok', 6000);
  }
  function panelEmpalme() {
    const B = caraSel.BD, o = caraSel.emp, L = B ? B.rectas.concat(B.circulos) : [];
    if (!L.length) return seccion('◜ Redondear o biselar sus bordes', h('p.small.muted', B && B.otras ? 'Los bordes de esta cara son curvas libres: todavía no se pueden redondear (solo rectos y círculos).' : 'Esta cara no tiene bordes que se puedan redondear.'));
    const elegidos = bordesElegidos(), max = EM.maximo(elegidos, o.tipo), refresca = () => { panelCara(); };
    return seccion('◜ Redondear o biselar sus bordes',
      h('div.r8e-seg', [['redondeo', '◜ Redondeo'], ['chaflan', '◺ Chaflán']].map(([k, t]) => h('button' + (o.tipo === k ? '.on' : ''), { type: 'button', 'data-emp': k, onclick: () => { o.tipo = k; caraSel.verEmp = true; refresca(); } }, t))),
      h('p.small.muted', o.tipo === 'chaflan' ? 'Corte plano: se lleva esa distancia de cada cara.' : 'Curva tangente a las dos caras. En un rincón (borde hacia dentro) RELLENA y refuerza.'),
      campoNum(o, 'r', o.tipo === 'chaflan' ? 'Distancia' : 'Radio', 0.1, 50, 0.1, 'mm', fin => { caraSel.verEmp = true; if (fin) panelCara(); else previaEmpalme(); }),
      h('p.small.r8e-emp-max' + (o.r > max + 1e-9 ? '.r8e-mal' : '.muted'), isFinite(max) ? (o.r > max + 1e-9 ? '⚠️ Radio imposible: ' : '') + 'como mucho ' + n1(Math.max(0, max)) + ' mm en los bordes marcados' : ''),
      h('div.r8e-emp-l', L.map((x, i) => h('label.check.small', h('input', { type: 'checkbox', checked: !o.quita[i], 'data-borde': i, onchange: e => { o.quita[i] = !e.target.checked; caraSel.verEmp = true; refresca(); } }), EM.textoBorde(x)))),
      B.otras ? h('p.small.muted', '(' + B.otras + ' borde' + (B.otras === 1 ? '' : 's') + ' curvo' + (B.otras === 1 ? '' : 's') + ' libre' + (B.otras === 1 ? '' : 's') + ': no se tocan)') : null,
      h('div.r8e-btns', btn('✓ Aplicar', aplicaEmpalme, { cls: 'primary r8e-empalme' })));
  }
  function panelCara() {
    if (!caraSel) return mount(prop, h('div.r8e-prop-t', h('b', '▱ CARAS')), h('div.r8e-ayuda', h('p', '👆 Toca una cara PLANA de una pieza: se pone en azul.'), h('p', 'Luego puedes empujarla o hundirla (desfase de cara), dibujar encima, poner un plano o apoyarla en la cama.')), btn('Volver a elegir piezas', () => ponModoSel('pieza'), { cls: 'sm' }));
    const F = caraSel.F, src = PR.busca(P, caraSel.id), o = caraSel;
    const angulo = Math.round(Math.acos(Math.max(-1, Math.min(1, F.n[2]))) * 180 / Math.PI);
    mount(prop, h('div.r8e-prop-t', h('b', '▱ CARA · ' + ((src && (src.nombre || PR.nombreTipo(src))) || ''))),
      h('div.r8e-medida', h('div', h('span', 'Área'), h('b', n1(F.area) + ' mm²')), h('div', h('span', 'Mira hacia'), h('b', angulo === 0 ? 'arriba' : angulo === 180 ? 'abajo' : angulo === 90 ? 'un lado' : angulo + '° de arriba')), h('div', h('span', 'Contornos'), h('b', String(F.anillos.length) + (F.anillos.length > 1 ? ' (con agujeros)' : '')))),
      F.curva ? h('p.r8e-nota', '〰️ Es una cara CURVA (tocaste un trocito). Para empujar elige una cara plana; aquí puedes medir o poner un plano tangente.') : null,
      !F.curva ? seccion('⇕ Empujar / hundir (desfase de cara)', h('p.small.muted', '+ saca material hacia fuera · − hunde la cara hacia dentro (un rebaje). Se ve en verde (sumar) o rojo (quitar) antes de aceptar.'),
        campoNum(o, 'd', 'Distancia', -200, 200, 0.5, 'mm', fin => { previaEmpuje(); if (fin) previaEmpuje(); }),
        h('div.r8e-btns', [-5, -2, -1, 1, 2, 5].map(v => btn((v > 0 ? '+' : '') + v, () => { o.d = v; panelCara(); }, { cls: 'sm ghost' }))),
        h('div.r8e-btns', btn('✓ Aplicar', aplicaEmpuje, { cls: 'primary r8e-empujar' }))) : null,
      panelEmpalme(),
      seccion('Más cosas con esta cara',
        h('div.r8e-btns.col', btn('✏️ Dibujar un boceto encima', () => bocetoEnPlano(F.base, F.anillos, 'cara'), { cls: 'r8e-bocara' }),
          btn('🧲 Apoyar esta cara en la cama', () => { if (PR.caraALaCama(P, caraSel.id, F.n)) { const id = caraSel.id; quitaCara(); commit(); elige([id]); toast('🧲 Apoyada en la cama por esa cara (como «Colocar en la cara» de Bambu)', 'ok'); } }, { cls: 'r8e-acama' }),
          btn('📐 Poner un plano de construcción aquí', () => { const k = nuevaCons({ tipo: 'plano', base: 'cara', o: F.o, n: F.n, u: F.base.u, d: 0, nombre: 'Plano en la cara' }); quitaCara(); eligeCons(k); }, { cls: 'r8e-planocara' }),
          btn('⇋ Hacer su simétrica pegada a esta cara', () => { const ids = PR.espejoPlano(P, [caraSel.id], { o: F.o, n: F.n }, true); quitaCara(); commit(); elige(ids); toast('⇋ Copia simétrica pegada a esa cara', 'ok'); }),
          btn('✂ Cortar la pieza por este plano', () => { cortarO = { plano: { o: F.o, n: F.n }, nombre: 'la cara elegida', lado: 'ambos' }; quitaCara(); herr = null; ponHerr('cortar'); }),
          btn('📏 Medir desde aquí', () => { medida = [{ p: F.o }]; quitaCara(); ponHerr('medir'); escena.medida(medida[0].p); }),
          btn('⌖ Sus centros (la cara y sus círculos)', () => ponHerr('centro'), { cls: 'r8e-carcen' }))),
      h('div.r8e-btns', btn('Terminar', () => { quitaCara(); pintaProp(); }, { cls: 'sm ghost' })));
    if (caraSel.BD && bordesElegidos().length && caraSel.emp.r > 0 && caraSel.verEmp) previaEmpalme(); else previaEmpuje();
  }
  // ---- construcción: planos y ejes ----
  function nuevaCons(c) { P.cons = P.cons || []; c.id = PR.nuevoId(); c.nombre = c.nombre || (c.tipo === 'plano' ? 'Plano ' : 'Eje ') + (P.cons.length + 1); P.cons.push(c); commit(); return c.id; }
  function pintaCons() { const L = PR.construccionDe(P).filter(c => !c.oculto).map(c => Object.assign(c, { tam: Math.max(80, R && R.info ? Math.max(...R.info.dims) * 1.4 : 120) })); escena.construccion(L, consSel); }
  function eligeCons(k) { if (sel.length) selAntes = sel.slice(); consSel = k; sel = []; ESTUDIO.sel = sel; marcaSel(); herr = 'cons'; pintaCinta(); pintaNav(); pintaProp(); pintaCons(); }
  const centroSel = () => { const b = sel.length ? PR.cajaDe(P, sel) : (R && R.info ? { min: R.info.min, max: R.info.max } : null); return b ? [0, 1, 2].map(k => r3((b.min[k] + b.max[k]) / 2)) : [0, 0, 0]; };
  function menuPlano(ancla) {
    const desf = base => () => { const b = R && R.info, k = { xy: 2, xz: 1, yz: 0 }[base], d = b ? r3((b.min[k] + b.max[k]) / 2 * (base === 'xz' ? -1 : 1)) : 10; eligeCons(nuevaCons({ tipo: 'plano', base, d })); };
    menu(ancla, [['▭', 'Plano horizontal (XY) a media altura', desf('xy')], ['▯', 'Plano de frente (XZ) por el centro', desf('xz')], ['▯', 'Plano de lado (YZ) por el centro', desf('yz')],
      ['◿', 'Plano en ángulo (45° sobre la cama)', () => eligeCons(nuevaCons({ tipo: 'plano', base: 'xy', d: 0, ang: 45 }))],
      ['▱', 'Plano en una cara (elígela)', () => { ponModoSel('cara'); }]], 'r8e-menu-plano');
  }
  function menuEje(ancla) {
    menu(ancla, [['↑', 'Eje vertical (Z) por el centro de lo elegido', () => eligeCons(nuevaCons({ tipo: 'eje', base: 'z', o: centroSel() }))], ['→', 'Eje X por el centro de lo elegido', () => eligeCons(nuevaCons({ tipo: 'eje', base: 'x', o: centroSel() }))],
      ['↗', 'Eje Y por el centro de lo elegido', () => eligeCons(nuevaCons({ tipo: 'eje', base: 'y', o: centroSel() }))], ['⊙', 'Eje vertical por el centro de la cama', () => eligeCons(nuevaCons({ tipo: 'eje', base: 'z', o: [0, 0, 0] }))]], 'r8e-menu-eje');
  }
  function panelCons() {
    const c = (P.cons || []).find(x => x.id === consSel); if (!c) { herr = null; return pintaProp(); }
    const g = PR.geomCons(c), cambia = fin => { if (fin) commit(); else pintaCons(); };
    const tit = h('div.r8e-prop-t', h('b', (c.tipo === 'plano' ? '📐 ' : '／ ') + 'CONSTRUCCIÓN'), h('input.inp.r8e-nombre', { value: c.nombre || '', maxlength: 40, onchange: e => { c.nombre = e.target.value.slice(0, 40); commit(); } }));
    if (c.tipo === 'plano') return mount(prop, tit, h('p.small.muted', 'No se imprime: sirve para dibujar encima, cortar o hacer simetrías.'),
      c.base !== 'cara' ? h('div.r8e-seg', Object.entries(PR.PLANOS_BASE).map(([k, b]) => h('button' + (c.base === k ? '.on' : ''), { type: 'button', onclick: () => { c.base = k; commit(); panelCons(); } }, b.t.split(' (')[0]))) : h('p.small', '▱ Sale de una cara de la pieza.'),
      campoNum(c, 'd', 'Desfase (lo separo de su base)', -1000, 1000, 0.5, 'mm', cambia), campoNum(c, 'ang', 'Inclinar', -180, 180, 1, '°', cambia),
      h('div.r8e-btns.col', btn('✏️ Dibujar un boceto en este plano', () => bocetoEnPlano(CA.baseDe(g.n, g.o), [], 'plano'), { cls: 'r8e-boplano' }),
        btn('✂ Cortar con este plano', () => { cortarO = { plano: { o: g.o, n: g.n }, nombre: c.nombre, lado: 'ambos' }; herr = null; ponHerr('cortar'); }, { cls: 'r8e-cortarplano' }),
        btn('⇋ Simetría de lo elegido (una copia)', () => { if (!selAntes.length) return toast('Elige antes (en el navegador) las piezas que quieres reflejar.', 'warn'); const ids = PR.espejoPlano(P, selAntes, { o: g.o, n: g.n }, true); commit(); elige(ids); })),
      h('div.r8e-btns', btn('👁 ' + (c.oculto ? 'Mostrar' : 'Ocultar'), () => { c.oculto = !c.oculto; commit(); }, { cls: 'sm' }), btn('🗑️ Borrar', () => { P.cons = P.cons.filter(x => x !== c); consSel = null; herr = null; commit(); pintaProp(); }, { cls: 'sm danger' })));
    const pos = { x: g.o[0], y: g.o[1], z: g.o[2] };
    mount(prop, tit, h('p.small.muted', 'Un eje para hacer copias en círculo alrededor (Patrón → En círculo).'),
      h('div.r8e-seg', [['x', 'X'], ['y', 'Y'], ['z', 'Z (vertical)']].map(([k, t2]) => h('button' + (c.base === k ? '.on' : ''), { type: 'button', onclick: () => { c.base = k; commit(); panelCons(); } }, t2))),
      h('div.r8e-tres', ['x', 'y', 'z'].map((e, k) => campoNum(pos, e, 'Pasa por ' + e.toUpperCase(), -1000, 1000, 0.5, 'mm', fin => { c.o = [pos.x, pos.y, pos.z]; cambia(fin); }))),
      h('div.r8e-btns', btn('🗑️ Borrar', () => { P.cons = P.cons.filter(x => x !== c); consSel = null; herr = null; commit(); pintaProp(); }, { cls: 'sm danger' })));
  }
  let selAntes = [];
  // ---- CORTAR con un plano ----
  let cortarO = null;
  function panelCortar() {
    const planos = PR.construccionDe(P).filter(c => c.tipo === 'plano');
    const o = cortarO = cortarO || { plano: null, nombre: '', lado: 'ambos', z: null };
    const objetivo = sel.length ? sel.slice() : P.cuerpos.map(c => c.id);
    if (!o.plano && planos.length) { o.plano = { o: planos[0].o, n: planos[0].n }; o.nombre = planos[0].nombre; }
    if (!o.plano) { const b = R && R.info; o.z = o.z ?? (b ? r3((b.min[2] + b.max[2]) / 2) : 10); o.plano = { o: [0, 0, o.z], n: [0, 0, 1] }; o.nombre = 'plano horizontal'; }
    const b = R && R.info, tam = b ? Math.max(...b.dims) * 1.4 : 120;
    escena.planoCorte({ normal: o.plano.n, punto: o.plano.o, tam });
    mount(prop, h('div.r8e-prop-t', h('b', '✂ CORTAR' + (sel.length ? ' · ' + sel.length + ' pieza' + (sel.length > 1 ? 's' : '') : ' · TODO'))),
      h('p.small.muted', 'Corta con un plano. Para poner conectores (pasadores, imanes…) usa «Partir».'),
      h('label.r8e-c.col', h('span', 'Con qué plano'), h('select.inp.r8e-cortar-plano', { onchange: e => { const v = e.target.value; if (v === 'h') { o.plano = { o: [0, 0, o.z ?? 10], n: [0, 0, 1] }; o.nombre = 'plano horizontal'; } else { const c = planos.find(x => x.id === v); if (c) { o.plano = { o: c.o, n: c.n }; o.nombre = c.nombre; } } panelCortar(); } },
        h('option', { value: 'h', selected: o.nombre === 'plano horizontal' }, 'Horizontal, a una altura'), planos.map(c => h('option', { value: c.id, selected: o.nombre === c.nombre }, '📐 ' + c.nombre)), o.nombre === 'la cara elegida' ? h('option', { value: 'cara', selected: true }, '▱ La cara elegida') : null)),
      o.nombre === 'plano horizontal' ? campoNum(o, 'z', 'Altura del corte', -500, 1000, 0.5, 'mm', () => { o.plano = { o: [0, 0, o.z], n: [0, 0, 1] }; escena.planoCorte({ normal: [0, 0, 1], punto: o.plano.o, tam }); }) : null,
      h('div.r8e-seg', [['ambos', 'Me quedo con los dos'], ['arriba', 'Solo el lado del plano'], ['abajo', 'Solo el otro lado']].map(([k, t2]) => h('button' + (o.lado === k ? '.on' : ''), { type: 'button', 'data-lado': k, onclick: () => { o.lado = k; panelCortar(); } }, t2))),
      h('div.r8e-btns', btn('✂ Cortar', () => {
        try {
          const L = PR.cortarPlano(P, objetivo, o.plano, o.lado);
          PR.borrar(P, [...new Set(L.map(x => x.de))]);
          const ids = L.map(x => { const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); PR.MALLAS.set(id, x.sopa); const c = PR.añadir(P, { tipo: 'malla', nombre: x.nombre.slice(0, 40), p: { malla: id, archivo: 'corte' }, color: x.color, acabado: x.acabado }); c.t.pos = x.pos.map(r3); return c.id; });
          cortarO = null; herr = null; escena.planoCorte(null); commit(); elige(ids); pintaCinta(); toast('✂ Cortada: ' + ids.length + ' pieza' + (ids.length > 1 ? 's' : ''), 'ok');
        } catch (e) { toast(e.message || String(e), 'bad', 7000); }
      }, { cls: 'primary r8e-cortar-ok' }), btn('Cancelar', () => { cortarO = null; escena.planoCorte(null); ponHerr(null); }, { cls: 'ghost' })));
  }
  // ================= 🎬 ANIMAR (la dueña: «animación si quiero ver la simulación, pero que sea fácil, no como en Fusion») =================
  // Cada pieza: Quieta · ⟳ Gira · ↔ Va y viene · ⬆ Sube y baja (eje y velocidad) · ⚙️ «Engrana con» otra (gira al revés con la
  // relación de dientes). Y para enseñar: 💥 despiece (todo se separa y vuelve), 🔄 la cámara da vueltas y 🎥 vídeo.
  const dientesDe = c => c && c.p ? Number(c.p.z || c.p.zc || c.p.dientes || 0) || null : null;
  function animacion() {
    const A = ESTUDIO.anim = ESTUDIO.anim || { mov: {}, despiece: false, vel: 1, vuelta: false, play: false };
    const vis = P.cuerpos.filter(c => !c.oculto), cen = {}, todo = R && R.info ? [0, 1, 2].map(k => (R.info.min[k] + R.info.max[k]) / 2) : [0, 0, 0];
    vis.forEach(c => { const b = PR.cajaDe(P, [c.id]); cen[c.id] = b ? [0, 1, 2].map(k => (b.min[k] + b.max[k]) / 2) : [0, 0, 0]; });
    const EJ = { x: new T3.Vector3(1, 0, 0), y: new T3.Vector3(0, 1, 0), z: new T3.Vector3(0, 0, 1) };
    const giro = (id, ang, eje) => { const c0 = cen[id]; return new T3.Matrix4().makeTranslation(c0[0], c0[1], c0[2]).multiply(new T3.Matrix4().makeRotationAxis(EJ[eje || 'z'], ang)).multiply(new T3.Matrix4().makeTranslation(-c0[0], -c0[1], -c0[2])); };
    const angDe = (id, t, prof = 0) => { const m = A.mov[id]; if (!m || prof > 6) return 0; if (m.tipo === 'gira') return 2 * Math.PI * (Number(m.vel) || 30) / 60 * t * A.vel;
      if (m.tipo === 'engrana' && m.con && A.mov[m.con]) { const z1 = Number(m.z) || dientesDe(PR.busca(P, id)) || 1, z2 = Number(A.mov[m.con].z) || dientesDe(PR.busca(P, m.con)) || 1; return -angDe(m.con, t, prof + 1) * z2 / z1; } return 0; };
    return t => {
      const out = {};
      vis.forEach(c => {
        const m = A.mov[c.id] || {}; let M = new T3.Matrix4();
        if (m.tipo === 'gira' || m.tipo === 'engrana') M = giro(c.id, angDe(c.id, t), m.tipo === 'engrana' ? ((A.mov[m.con] || {}).eje || 'z') : m.eje);
        else if (m.tipo === 'va' || m.tipo === 'sube') { const d = (Number(m.dist) || 10) * Math.sin(2 * Math.PI * t * A.vel / (Number(m.per) || 2)), v = EJ[m.tipo === 'sube' ? 'z' : (m.eje || 'x')]; M = new T3.Matrix4().makeTranslation(v.x * d, v.y * d, v.z * d); }
        if (A.despiece) { const c0 = cen[c.id], dir = new T3.Vector3(c0[0] - todo[0], c0[1] - todo[1], c0[2] - todo[2]); if (dir.length() < 0.01) dir.set(0, 0, 1); dir.normalize(); const k = (0.5 - 0.5 * Math.cos(2 * Math.PI * t * A.vel / 4)) * Math.max(15, R && R.info ? Math.max(...R.info.dims) * 0.45 : 30); M = new T3.Matrix4().makeTranslation(dir.x * k, dir.y * k, dir.z * k).multiply(M); }
        out[c.id] = M;
      });
      window.__r8e && (window.__r8e.anim = { t, piezas: Object.keys(out).length });
      return out;
    };
  }
  function panelAnimar() {
    const A = ESTUDIO.anim = ESTUDIO.anim || { mov: {}, despiece: false, vel: 1, vuelta: false, play: false };
    const vis = P.cuerpos.filter(c => !c.oculto);
    const juega = on => { A.play = on; escena.flechas(null); if (on) escena.animar(animacion()); else escena.animar(null); escena.giraCamara(on && A.vuelta ? 1 : 0); panelAnimar(); };
    const rehaz = () => { if (A.play) escena.animar(animacion()); };
    const fila = c => {
      const m = A.mov[c.id] = A.mov[c.id] || { tipo: '', eje: 'z', vel: 30, dist: 10, per: 2, con: '', z: dientesDe(c) || '' };
      const otros = vis.filter(x => x.id !== c.id);
      return h('div.r8e-anim-f', { 'data-anim': c.id }, h('b', c.nombre || PR.nombreTipo(c)),
        h('select.inp', { 'aria-label': 'Movimiento', onchange: e => { m.tipo = e.target.value; rehaz(); panelAnimar(); } }, [['', 'Quieta'], ['gira', '⟳ Gira'], ['va', '↔ Va y viene'], ['sube', '⬆ Sube y baja'], ['engrana', '⚙️ Engrana con…']].map(([k, t]) => h('option', { value: k, selected: m.tipo === k }, t))),
        m.tipo === 'gira' || m.tipo === 'va' ? h('select.inp', { 'aria-label': 'Eje', onchange: e => { m.eje = e.target.value; rehaz(); } }, [['z', 'Eje Z (vertical)'], ['x', 'Eje X'], ['y', 'Eje Y']].map(([k, t]) => h('option', { value: k, selected: m.eje === k }, t))) : null,
        m.tipo === 'gira' ? campoNum(m, 'vel', 'Vueltas por minuto', -600, 600, 5, 'rpm', rehaz) : null,
        m.tipo === 'va' || m.tipo === 'sube' ? [campoNum(m, 'dist', 'Recorrido', 1, 300, 1, 'mm', rehaz), campoNum(m, 'per', 'Tarda (ida y vuelta)', 0.3, 20, 0.1, 's', rehaz)] : null,
        m.tipo === 'engrana' ? [h('select.inp', { 'aria-label': 'Engrana con', onchange: e => { m.con = e.target.value; rehaz(); } }, h('option', { value: '' }, '— elige la otra rueda —'), otros.map(x => h('option', { value: x.id, selected: m.con === x.id }, x.nombre || PR.nombreTipo(x)))),
          campoNum(m, 'z', 'Sus dientes', 4, 400, 1, '', rehaz), h('small.muted', 'La otra rueda tiene que girar (⟳). Esta gira al revés, con la relación de dientes.')] : null);
    };
    mount(prop, h('div.r8e-prop-t', h('b', '🎬 ANIMAR')), h('p.small.muted', 'Elige qué se mueve y dale al ▶. Nada de líneas de tiempo: lo ves al momento. No cambia tu diseño.'),
      h('div.r8e-btns', btn(A.play ? '⏸ Pausa' : '▶ Reproducir', () => juega(!A.play), { cls: 'primary r8e-anim-play' }), btn('🎥 Grabar vídeo (8 s)', async ev => {
        const b = ev.target.closest('button'); b.disabled = true; if (!A.play) juega(true); toast('🎥 Grabando 8 segundos…', '', 8500);
        try { const v = await escena.grabar(8); baja(v, nombreArchivo() + '_animacion.webm'); toast('🎥 Vídeo guardado (' + Math.round(v.size / 1024) + ' KB). Para Instagram: Reels admite este vídeo tal cual.', 'ok', 7000); } catch (e) { toast('No se pudo grabar: ' + (e.message || e), 'bad'); } b.disabled = false;
      }, { cls: 'r8e-anim-rec' })),
      h('div.r8e-btns', h('label.check.small', h('input', { type: 'checkbox', checked: A.despiece, 'data-k': 'despiece', onchange: e => { A.despiece = e.target.checked; if (A.despiece && !A.play) juega(true); else rehaz(); } }), '💥 Despiece (todo se separa y vuelve)'),
        h('label.check.small', h('input', { type: 'checkbox', checked: A.vuelta, onchange: e => { A.vuelta = e.target.checked; escena.giraCamara(A.play && A.vuelta ? 1 : 0); } }), '🔄 La cámara da vueltas')),
      campoNum(A, 'vel', 'Velocidad de todo', 0.1, 5, 0.1, '×', rehaz),
      seccion('Qué se mueve', vis.length ? vis.map(fila) : h('p.small.muted', 'Primero pon alguna pieza.')),
      seccion('🔍 ¿Choca algo al moverse?', h('p.small.muted', 'Recorro todo el movimiento (una vuelta entera o un viaje de ida y vuelta) y te digo si alguna pieza se mete en otra, y en qué momento.'),
        h('div.r8e-btns', btn('🔍 Comprobar el movimiento', () => compruebaMov(), { cls: 'r8e-anim-check' })), ESTUDIO.animCheck ? resultadoMov(ESTUDIO.animCheck) : null),
      h('div.r8e-btns', btn('Terminar', () => { juega(false); ponHerr(null); }, { cls: 'ghost' })));
  }
  // ---- DESFASE de una pieza entera ----
  function desfaseSel() {
    const c = sel.length === 1 && PR.busca(P, sel[0]); if (!c || c.tipo === 'grupo') return toast('Elige UNA pieza (no un grupo) y ponle el desfase en «⇔ Desfase» (a la derecha).', 'warn');
    c.p = c.p || {}; if (!c.p.desfase) { c.p.desfase = 1; commit(); toast('⇔ Desfase de +1 mm (cámbialo a la derecha: − la hace más fina)', 'ok'); }
    setTimeout(() => { const s = prop.querySelector('.r8e-desfase'); if (s) { s.open = true; s.scrollIntoView({ block: 'nearest' }); } }, 50);
  }

  // ================= v20.2 · ⏱ LÍNEA DE TIEMPO (la dueña: «que puedas volver atrás si quieres volver a editar el boceto, como en Fusion») =================
  // Abajo, cada PASO del diseño en orden (boceto, forma, empuje, matriz, unión…). Un toque lo elige; DOBLE toque lo edita (un boceto
  // se abre en el editor de bocetos). La marca naranja se arrastra hacia atrás para ver el diseño como estaba en ese paso (⏪); lo
  // que crees entonces se mete ahí. Un paso en ROJO es que falla; en naranja, que un chivato avisa de algo en él.
  function vistaP() { return P.marca != null ? PR.hastaPaso(P, P.marca) : P; }
  const iconoPaso = c => (c.tipo === 'empuje' ? (c.p && c.p.d < 0 ? '⇩' : '⇧') : icono(c));
  function pasoPrincipal(s) { const L = s.ids.map(id => PR.busca(P, id)).filter(Boolean); return L.find(c => c.tipo === 'empuje') || L.find(c => c.tipo === 'boceto') || s.c; }
  function eligePaso(s) { const c = pasoPrincipal(s); if (c) elige([c.id]); }
  function editaPaso(s) {
    const c = pasoPrincipal(s); if (!c) return;
    if (P.marca != null && s.n > P.marca) irPaso(s.n); // para editarlo, que se vea
    if (c.tipo === 'boceto') return editaBoceto(c);
    elige([c.id]); toast(c.tipo === 'empuje' ? '⇕ Cambia a la derecha cuánto sale o se hunde la cara' : '✏️ Cambia sus medidas a la derecha: lo de después se recalcula solo', '', 3500);
  }
  function irPaso(n) {
    const L = PR.pasos(P), ult = L.length ? L[L.length - 1].n : 0;
    P.marca = n == null || n >= ult ? null : Math.max(0, n); commit();
    if (P.marca != null) toast('⏪ Estás viendo el diseño en el paso ' + (L.findIndex(s => s.n === P.marca) + 1) + ' de ' + L.length + '. Lo que crees ahora se mete aquí. «▶ Al final» para volver.', '', 6000);
  }
  let arrastraMarca = false;
  function pintaLinea() {
    if (arrastraMarca) return; // (mientras arrastras la marca no se repinta: si no, se perdía lo que tenías cogido)
    const L = PR.pasos(P);
    linea.hidden = !L.length; if (!L.length) return mount(linea);
    const ult = L[L.length - 1].n, marca = P.marca != null ? P.marca : ult, pos = L.findIndex(s => s.n >= marca);
    const fallan = new Set((R && R.fallan) || []), malos = new Set(), avisa = new Set();
    CHIV.lista.forEach(x => { if (x.n === 'error') x.ids.forEach(id => malos.add(id)); else if (x.n === 'aviso') x.ids.forEach(id => avisa.add(id)); });
    const enPaso = (s, S2) => s.ids.some(id => S2.has(id));
    const chips = L.map((s, i) => { const c = s.c, nom = c.nombre || PR.nombreTipo(c);
      return h('button.r8e-paso' + (s.n > marca ? '.futuro' : '') + (s.ids.some(id => sel.includes(id)) ? '.on' : '') + (enPaso(s, fallan) ? '.mal' : enPaso(s, malos) ? '.choca' : enPaso(s, avisa) ? '.aviso' : ''),
        { type: 'button', 'data-paso': s.n, title: (i + 1) + '. ' + nom + ' · doble toque: ' + (pasoPrincipal(s).tipo === 'boceto' ? 'editar el boceto' : 'editar') + (enPaso(s, fallan) ? ' · ⚠️ ESTE PASO FALLA' : ''), onclick: () => eligePaso(s), ondblclick: () => editaPaso(s) },
        h('span', iconoPaso(pasoPrincipal(s))), h('small', nom.length > 16 ? nom.slice(0, 15) + '…' : nom)); });
    const marcaEl = h('span.r8e-marca', { title: 'Arrástrala hacia atrás para ver el diseño en ese paso (⏪)', role: 'slider', 'aria-label': 'Hasta qué paso se ve', 'aria-valuenow': String(pos + 1), 'aria-valuemin': '0', 'aria-valuemax': String(L.length), tabindex: '0',
      onkeydown: e => { if (e.key === 'ArrowLeft') { e.preventDefault(); irPaso(pos > 0 ? L[pos - 1].n : 0); } else if (e.key === 'ArrowRight') { e.preventDefault(); irPaso(pos + 1 < L.length ? L[pos + 1].n : null); } } });
    const lista = h('div.r8e-linea-l', chips.flatMap((ch, i) => (i === pos ? [ch, marcaEl] : [ch])), pos < 0 ? marcaEl : null);
    // arrastrar la marca: se ve en directo; al soltar, se apunta (deshacer la quita)
    marcaEl.addEventListener('pointerdown', e => { // (se sigue el ratón en toda la ventana y la marca no se mueve del sitio hasta soltar: si no, se perdía el ratón)
      e.preventDefault(); marcaEl.classList.add('arrastra'); arrastraMarca = true; let n0 = marca;
      const mueve = ev => { let k = -1; chips.forEach((ch, i) => { const r = ch.getBoundingClientRect(); if (ev.clientX > r.left + r.width / 2) k = i; }); const n = k < 0 ? 0 : L[k].n; if (n === n0) return; n0 = n;
        P.marca = n >= ult ? null : n; chips.forEach((ch, i) => { ch.classList.toggle('futuro', L[i].n > n); ch.classList.toggle('aqui', i === k); }); recalculaSinLinea(); };
      const suelta = () => { window.removeEventListener('pointermove', mueve); window.removeEventListener('pointerup', suelta); window.removeEventListener('pointercancel', suelta); marcaEl.classList.remove('arrastra'); arrastraMarca = false; irPaso(P.marca); };
      window.addEventListener('pointermove', mueve); window.addEventListener('pointerup', suelta); window.addEventListener('pointercancel', suelta);
    });
    mount(linea, h('span.r8e-linea-t', '⏱ PASOS'), btn('⏮', () => irPaso(0), { cls: 'sm ghost r8e-alprin', title: 'Ver desde el principio' }),
      P.marca != null ? h('div.r8e-linea-av', { title: 'Lo de después del paso ' + (pos + 1) + ' está apagado. Guardar e imprimir usan el diseño entero.' }, h('span', '⏪ ' + (pos + 1) + '/' + L.length), btn('▶ Al final', () => irPaso(null), { cls: 'sm primary r8e-alfinal' })) : null, lista);
    window.__r8e && (window.__r8e.linea = { pasos: L.length, marca: P.marca, en: pos + 1, futuros: L.filter(s => s.n > marca).length });
  }
  let sinLinea = 0;
  function recalculaSinLinea() { clearTimeout(sinLinea); sinLinea = setTimeout(() => { if (!vivo) return; R = PR.evaluar(vistaP()); escena.ponPartes(R.partes, R.huecos); escena.ponProxies(R.proxies.map(x => ({ id: x.id, vista: x.vista, matriz: PR.matriz4(x.t) }))); pintaEstado(); }, 30); }

  // ================= v20.2 · 🔔 CHIVATOS (la dueña: «chivatos de ayuda: si esto no gira, si ahora encaja… para saber») =================
  function programaChivatos() { clearTimeout(CHIV.tic); if (!chivOn) { CHIV.lista = []; pintaChiv(); return; } CHIV.tic = setTimeout(hazChivatos, 650); }
  function hazChivatos() {
    if (!vivo || !R) return null;
    let r; try { r = CH.analiza(vistaP(), R, PR, { catalogo, sel }); } catch (e) { console.error(e); r = { lista: [], ms: 0 }; }
    const firma = r.lista.filter(x => x.n === 'error').map(x => x.t).join('|'), nuevo = firma && firma !== CHIV.firma;
    CHIV.lista = r.lista; CHIV.ms = r.ms; CHIV.firma = firma;
    pintaChiv(nuevo); pintaLinea();
    window.__r8e && (window.__r8e.chivatos = r.lista.map(x => ({ k: x.k, n: x.n, t: x.t, ids: x.ids, d: x.d, arreglos: (x.arreglos || []).map(a => a.t) })), window.__r8e.chivMs = r.ms);
    return r.lista;
  }
  function pintaChiv(nuevo) {
    const L = CHIV.lista, cuenta = L.filter(x => x.n === 'error' || x.n === 'aviso').length, pe = CH.peor(L), vis = L.filter(x => x.n !== 'info' || CHIV.verInfo), info = L.filter(x => x.n === 'info').length;
    const fila = x => h('div.r8e-chiv-f.' + x.n, { 'data-chiv': x.k }, h('p', x.t), h('div.r8e-btns', btn('👁 Ver', () => verChiv(x), { cls: 'sm ghost' }), (x.arreglos || []).map(a => btn(a.t, () => arregla(a), { cls: 'sm r8e-chiv-arr', title: a.de || '' }))));
    mount(chiv, h('button.r8e-chiv-b.' + (chivOn ? pe : 'apagado') + (nuevo ? '.nuevo' : ''), { type: 'button', title: chivOn ? 'Chivatos: holguras (gira / justo / a presión), choques, engranajes y piezas en el aire' : 'Chivatos apagados', 'aria-expanded': String(CHIV.abierto), onclick: () => { CHIV.abierto = !CHIV.abierto; pintaChiv(); } },
      '🔔', chivOn ? (cuenta ? h('b', String(cuenta)) : pe === 'ok' ? h('b', '✓') : null) : h('b', 'off')),
      CHIV.abierto ? h('div.r8e-chiv-p', h('div.r8e-chiv-h', h('b', '🔔 CHIVATOS'), h('small.muted', 'tus holguras: 0,05 a presión · 0,10 justo · 0,15 gira'), h('label.check.small', h('input', { type: 'checkbox', checked: chivOn, onchange: e => { chivOn = e.target.checked; try { localStorage.setItem('cd.r8.chivatos', chivOn ? '1' : '0'); } catch (x) { } programaChivatos(); } }), 'Encendidos')),
        !chivOn ? h('p.small.muted', 'Apagados. Enciéndelos para que te avisen solos.') : vis.length ? vis.map(fila) : h('p.small.muted', L.length ? 'Nada importante.' : 'Todo bien: nada choca, nada está en el aire. Pon una pieza dentro de otra (o dos engranajes) y te digo si entra, si gira o si engranan.'),
        info ? h('label.check.small', h('input', { type: 'checkbox', checked: CHIV.verInfo, onchange: e => { CHIV.verInfo = e.target.checked; pintaChiv(); } }), 'Ver también lo informativo (' + info + ')') : null) : null);
    // el aviso de la pieza elegida («¿ahora encaja?»), arriba de la vista: cambia en cuanto paras de moverla
    const mio = chivOn && sel.length ? L.find(x => (x.fit || /^engr|^choca/.test(x.k)) && x.ids.some(id => sel.includes(id) || (PR.padreDe(P, id) && sel.includes(PR.padreDe(P, id).id)))) : null;
    mount(chivChip, mio && !CHIV.abierto ? h('div.r8e-chivchip-x.' + mio.n, { onclick: () => { CHIV.abierto = true; pintaChiv(); } }, mio.t) : null);
  }
  function verChiv(x) {
    const ids = x.ids.filter(id => PR.busca(P, id)), tops = ids.filter(top); if (ids.length) elige(tops.length ? tops : ids);
    escena.marcadores(null);
    if (x.choque) { const ps = R.partes.filter(p => x.ids.includes(p.sub || p.id) && p.hazM); if (ps.length === 2) { try { const I = ps[0].hazM().intersect(ps[1].hazM()); if (!I.isEmpty()) escena.fantasmas([{ vista: N.aVista(I), matriz: null }], '#ff3b5c'); } catch (e) { } finally { N.limpia(); } } }
    else if (x.donde) escena.marcadores([{ p: x.donde, r: 1.1 }], 0xff7a1a);
  }
  // los ARREGLOS: cambian el diseño (se puede deshacer) y los chivatos lo vuelven a mirar solos
  function arregla(a) {
    const H0 = a.hacer, c = PR.busca(P, H0.id); if (!c) return toast('No encuentro esa pieza.', 'warn');
    if (H0.tipo === 'param') c.p[H0.k] = H0.v;
    else if (H0.tipo === 'desfase') { c.p = c.p || {}; c.p.desfase = Math.round(((Number(c.p.desfase) || 0) + H0.suma) * 1000) / 1000; }
    else if (H0.tipo === 'cama') PR.aLaCama(P, [c.id]);
    else if (H0.tipo === 'mover') {
      const pa = PR.padreDe(P, c.id); let d = H0.delta;
      if (pa) { const G = PR.matrizMundo(P, pa.id), inv = new T3.Matrix3().setFromMatrix4(G).invert(), v = new T3.Vector3(...d).applyMatrix3(inv); d = [v.x, v.y, v.z]; }
      if (H0.pos && !pa) c.t.pos = H0.pos.map(r3); else c.t.pos = c.t.pos.map((v, k) => r3(v + d[k]));
      if (H0.rotZ != null && !pa) c.t.rot[2] = r3(((H0.rotZ % 360) + 360) % 360);
    }
    commit(); toast('🔧 ' + a.t + (a.de ? ' · ' + a.de : '') + '. Lo vuelvo a comprobar…', 'ok', 3500);
  }
  // 🔍 recorrer el movimiento de la animación buscando choques
  function compruebaMov() {
    const A = ESTUDIO.anim = ESTUDIO.anim || { mov: {}, despiece: false, vel: 1, vuelta: false, play: false };
    const movs = Object.entries(A.mov).filter(([id, m]) => m.tipo && PR.busca(P, id));
    if (!movs.length) return toast('Elige antes qué se mueve (⟳ Gira, ↔ Va y viene…).', 'warn');
    let per = 0, angMax = 0, zMin = 400; const rpm = id => { const m = A.mov[id]; if (!m) return 0; if (m.tipo === 'gira') return Math.abs(Number(m.vel) || 30); if (m.tipo === 'engrana' && m.con) { const z1 = Number(m.z) || dientesDe(PR.busca(P, id)) || 1, z2 = Number((A.mov[m.con] || {}).z) || dientesDe(PR.busca(P, m.con)) || 1; return rpm(m.con) * z2 / z1; } return 0; };
    movs.forEach(([id, m]) => { if (m.tipo === 'gira' || m.tipo === 'engrana') { const r = rpm(id); if (r > 0) per = Math.max(per, 60 / r); } else per = Math.max(per, Number(m.per) || 2); const z = Number(m.z) || dientesDe(PR.busca(P, id)); if (z) zMin = Math.min(zMin, z); });
    if (!per) per = 2;
    movs.forEach(([id, m]) => { if (m.tipo === 'gira' || m.tipo === 'engrana') angMax = Math.max(angMax, 360 * per * rpm(id) / 60); });
    per /= Number(A.vel) || 1;
    const pasos = Math.min(180, Math.max(72, zMin < 400 ? Math.ceil(angMax / (360 / zMin / 4)) : 72)); // con engranajes: 4 vistazos por diente
    const t0 = performance.now(); let r;
    try { r = CH.barrido(R.partes, animacion(), per, { pasos }); } catch (e) { return toast('No se pudo comprobar: ' + (e.message || e), 'bad'); }
    ESTUDIO.animCheck = Object.assign(r, { per, cuando: Date.now(), ms: Math.round(performance.now() - t0) });
    window.__r8e && (window.__r8e.animCheck = { ok: r.ok, pasos: r.pasos, comprobaciones: r.comprobaciones, primero: r.primero, ms: r.ms });
    panelAnimar();
  }
  function resultadoMov(r) {
    const nom = id => { const c = PR.busca(P, id); return '«' + ((c && (c.nombre || PR.nombreTipo(c))) || 'pieza') + '»'; };
    if (r.ok) return h('p.r8e-chiv-f.ok.r8e-anim-res', '✅ Se mueve sin chocar: ' + r.pasos + ' posiciones de todo el recorrido comprobadas (' + r.comprobaciones + ' cruces mirados, ' + (r.ms / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' s).');
    const x = r.primero;
    return h('div.r8e-chiv-f.error.r8e-anim-res', h('p', '⛔ ' + nom(x.a) + ' CHOCA con ' + nom(x.b) + ' a los ' + x.t.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' s del movimiento (se pisan ' + x.v.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' mm³). Así NO se mueve: dale holgura o cambia su sitio.'),
      h('div.r8e-btns', btn('👁 Ver ese momento', () => { const A = ESTUDIO.anim, f = animacion(); A.play = false; escena.giraCamara(0); escena.animar(() => f(x.t)); toast('⏸ Parado en el momento del choque', '', 2500); }, { cls: 'sm' })));
  }

  // ---------- navegador (lista de cuerpos) ----------
  const icono = c => c.tipo === 'grupo' ? (c.modo === 'cruce' ? '∩' : c.hijos.some(x => x.hueco) ? '−' : '∪') : c.tipo === 'boceto' ? '✏️' : c.tipo === 'malla' ? '📦' : c.tipo === 'cat' ? ((catalogo && catalogo.DISENOS[c.p.k]) || {}).e || '🛍️' : (N.FORMAS3D[c.tipo] || {}).e || '🧊';
  function pintaNav() {
    const fila = (c, nivel) => h('div.r8e-fila' + (sel.includes(c.id) ? '.on' : '') + (c.oculto ? '.oculto' : ''), { 'data-id': c.id, style: { paddingLeft: (8 + nivel * 14) + 'px' }, onclick: e => elige([c.id], e.shiftKey || e.ctrlKey || e.metaKey), ondblclick: async () => { const n = await promptDlg('Nombre', 'Nombre de la pieza', c.nombre || ''); if (n !== null) { c.nombre = n.trim().slice(0, 40); commit(); } } },
      h('button.r8e-ojo', { type: 'button', title: c.oculto ? 'Mostrar' : 'Ocultar', onclick: e => { e.stopPropagation(); c.oculto = !c.oculto; commit(); } }, c.oculto ? '◌' : '👁'),
      h('span.r8e-ic', icono(c)), h('span.r8e-n', c.nombre || PR.nombreTipo(c)), c.hueco ? h('span.r8e-hueco', 'hueco') : h('span.r8e-dot', { style: { background: c.color } }));
    const filas = []; const rec = (L, n) => L.forEach(c => { filas.push(fila(c, n)); if (c.hijos) rec(c.hijos, n + 1); }); rec(P.cuerpos, 0);
    const cons = (P.cons || []).map(c => h('div.r8e-fila.r8e-cons' + (consSel === c.id ? '.on' : '') + (c.oculto ? '.oculto' : ''), { 'data-cons': c.id, onclick: () => eligeCons(c.id) },
      h('button.r8e-ojo', { type: 'button', title: c.oculto ? 'Mostrar' : 'Ocultar', onclick: e => { e.stopPropagation(); c.oculto = !c.oculto; commit(); } }, c.oculto ? '◌' : '👁'), h('span.r8e-ic', c.tipo === 'plano' ? '📐' : '／'), h('span.r8e-n', c.nombre || 'Construcción')));
    mount(nav, h('div.r8e-nav-t', h('b', 'NAVEGADOR'), h('small', P.cuerpos.length + ' cuerpo' + (P.cuerpos.length === 1 ? '' : 's'))), filas.length ? filas : h('p.r8e-nada', 'Aún no hay nada. Crea una forma o un boceto.'),
      cons.length ? [h('div.r8e-nav-t.r8e-nav-cons', h('b', 'CONSTRUCCIÓN'), h('small', 'no se imprime')), cons] : null);
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
    if (herr !== 'matriz') escena && escena.fantasmas(null);
    if (herr === 'animar') return panelAnimar();
    if (herr === 'centro') return panelCentro(); // v20.4
    if (herr === 'cara' || (modoSel === 'cara' && !['medir', 'cortar', 'cons'].includes(herr))) return panelCara(); if (herr === 'cons') return panelCons(); if (herr === 'cortar') return panelCortar();
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
    if (c.tipo === 'empuje') forma.push(campoNum(c.p, 'd', 'Cuánto sale (+) o se hunde (−)', -200, 200, 0.5, 'mm', fin => { if (Math.abs(c.p.d) < 0.01) c.p.d = c.p.d < 0 ? -0.01 : 0.01; c.hueco = c.p.d < 0; c.nombre = (c.p.d > 0 ? 'Saliente ' : 'Rebaje ') + n1(Math.abs(c.p.d)) + ' mm'; vivoCambio(fin); }), h('p.small.muted', 'Es el empuje de una cara: cámbialo cuando quieras (como en la línea de tiempo de Fusion).'));
    if (c.tipo === 'malla') forma.push(h('p.r8e-nota', '📦 ' + (c.p.archivo || 'Pieza importada') + '. Puedes moverla, escalarla, restarle o sumarle formas, partirla con conectores y deformarla.'));
    if (c.tipo === 'grupo') forma.push(...campos([sf('modo', 'Cómo se combinan', [['unir', 'Unir (y restar los huecos)'], ['cruce', 'Solo lo que tienen en común']]), sf('colores', 'Colores', [['uno', 'Todo de un color'], ['cada', 'Cada pieza con el suyo']])], c), btn('⊡ Separar el grupo', desagrupar, { cls: 'sm' }));
    const tam = h('div.r8e-tam', ['x', 'y', 'z'].map(e => campoNum(dims, e, { x: 'Ancho', y: 'Fondo', z: 'Alto' }[e], 0.05, 2000, 0.5, 'mm', fin => { if (fin) { PR.medirA(P, c.id, e, dims[e], prop2); commit(); } })));
    mount(prop, h('div.r8e-prop-t', h('span.r8e-ic', icono(c)), h('input.inp.r8e-nombre', { value: c.nombre || PR.nombreTipo(c), maxlength: 40, 'aria-label': 'Nombre', onchange: e => { c.nombre = e.target.value.slice(0, 40); commit(); } })),
      h('div.r8e-seg', h('button' + (!c.hueco ? '.on' : ''), { type: 'button', onclick: () => { c.hueco = false; commit(); } }, '● Sólido'), h('button' + (c.hueco ? '.on.ag' : ''), { type: 'button', 'data-hueco': '1', onclick: () => { c.hueco = true; commit(); } }, '◐ Hueco')),
      !c.hueco ? seccion('🎨 Color y acabado', h('div.r8e-paleta', COLORES.map(([k, t]) => h('button' + (c.color === k ? '.on' : ''), { type: 'button', title: t, 'data-color': k, style: { background: k }, onclick: () => { c.color = k; commit(); } })), h('label.r8e-propio', { title: 'Otro color' }, h('input', { type: 'color', value: c.color || '#b4b8bf', onchange: e => { c.color = e.target.value; commit(); } }), '＋')),
        h('select.inp', { 'aria-label': 'Acabado', onchange: e => { c.acabado = e.target.value; commit(); } }, Object.entries(ACABADOS).map(([k, a]) => h('option', { value: k, selected: c.acabado === k }, a.t))), h('small.muted', 'El color en pantalla es APROXIMADO al de la bobina.')) : null,
      forma.length ? seccion('📐 Forma', forma) : null,
      seccion('📏 Tamaño', tam, h('label.check.small', h('input', { type: 'checkbox', checked: prop2, onchange: e => { prop2 = e.target.checked; } }), 'Mantener la proporción')),
      seccion('✥ Posición', h('div.r8e-tres', ['x', 'y', 'z'].map(e => campoNum(pos, e, e.toUpperCase(), -1000, 1000, 0.5, 'mm', fin => { c.t.pos = [pos.x, pos.y, pos.z].map(r3); escena.moverProxy(c.id, c.t); if (fin) commit(); else recalcula(); }))),
        h('div.r8e-btns', btn('⤓ A la cama', () => { PR.aLaCama(P, [c.id]); commit(); }, { cls: 'sm' }), btn('⌖ Al centro', () => { const bb = PR.cajaDe(P, [c.id]); if (bb) { c.t.pos[0] = r3(c.t.pos[0] - (bb.min[0] + bb.max[0]) / 2); c.t.pos[1] = r3(c.t.pos[1] - (bb.min[1] + bb.max[1]) / 2); commit(); } }, { cls: 'sm' }))),
      seccion('⟳ Giro', h('div.r8e-tres', ['x', 'y', 'z'].map(e => campoNum(rot, e, e.toUpperCase(), -360, 360, 1, '°', fin => { c.t.rot = [rot.x, rot.y, rot.z].map(r3); escena.moverProxy(c.id, c.t); if (fin) { PR.aLaCama(P, [c.id]); commit(); } else recalcula(); }))),
        h('div.r8e-btns', [['X', 0], ['Y', 1], ['Z', 2]].map(([t, k]) => btn('+90° ' + t, () => { c.t.rot[k] = (c.t.rot[k] + 90) % 360; PR.aLaCama(P, [c.id]); commit(); }, { cls: 'sm' })))),
      c.tipo !== 'grupo' ? h('details.r8e-sec.r8e-desfase', { open: !!(c.p && c.p.desfase) }, h('summary', '⇔ Desfase (más gorda / más fina)'), h('div.r8e-sec-b', campoNum(c.p, 'desfase', 'Desfase de toda la pieza', -10, 10, 0.1, 'mm', vivoCambio), h('small.muted', '+ crece por todas partes (como engrosar) · − adelgaza. En piezas muy detalladas tarda un poco.'))) : null,
      c.tipo !== 'grupo' ? seccion('⬓ Vaciar', campoNum(c.p, 'vaciar', 'Pared (0 = maciza)', 0, 20, 0.2, 'mm', vivoCambio), h('label.check.small', h('input', { type: 'checkbox', checked: c.p.vaciarAbierta !== false, onchange: e => { c.p.vaciarAbierta = e.target.checked; commit(); } }), 'Abierta por arriba')) : null,
      (c.empalmes || []).length || EM.AVISOS.get(c.id) ? seccion('◜ Redondeos y chaflanes', (c.empalmes || []).map((E, i) => h('div.r8e-emp', h('div.r8e-emp-t', h('b', (E.tipo === 'chaflan' ? '◺ Chaflán' : '◜ Redondeo') + ' · ' + E.aristas.length + ' borde' + (E.aristas.length === 1 ? '' : 's')), btn('✕', () => { c.empalmes.splice(i, 1); if (!c.empalmes.length) delete c.empalmes; commit(); }, { cls: 'sm ghost r8e-emp-quitar', title: 'Quitar' })), campoNum(E, 'r', E.tipo === 'chaflan' ? 'Distancia' : 'Radio', 0.1, 50, 0.1, 'mm', vivoCambio))),
        (EM.AVISOS.get(c.id) || []).map(t => h('p.r8e-nota.r8e-mal', '⚠️ ' + t)), h('small.muted', 'Para añadir más: modo ▱ Cara, toca una cara y elige sus bordes.')) : null,
      seccion('🌈 Deformar', (c.mods || []).length ? h('p.small', (c.mods || []).map(m => N.DEFORMACIONES[m.t].t).join(' · ')) : h('p.small.muted', 'Doblar, retorcer, estrechar, inclinar u ondas.'), btn('Abrir', () => ponHerr('deformar'), { cls: 'sm' })),
      c.n != null ? h('div.r8e-btns.r8e-pasoprop', h('small.muted', '⏱ Paso ' + (PR.pasos(P).findIndex(s => s.n === c.n) + 1) + ' de ' + PR.pasos(P).length), btn('⏪ Ver el diseño hasta este paso', () => irPaso(c.n), { cls: 'sm ghost r8e-verhasta' })) : null,
      h('div.r8e-btns.r8e-pie', btn('⧉ Duplicar', duplicar, { cls: 'sm' }), btn('🗑️ Borrar', borrar, { cls: 'sm danger' })));
    ligero = () => { const a = prop.querySelectorAll('.r8e-tres')[0]; if (!a) return; const t = c.t; a.querySelectorAll('input.inp').forEach((i, k) => { i.value = t.pos[k]; }); const g = prop.querySelectorAll('.r8e-tres')[1]; if (g) g.querySelectorAll('input.inp').forEach((i, k) => { i.value = t.rot[k]; }); };
  }

  // ---------- herramientas con panel propio ----------
  function ponHerr(k) {
    herr = herr === k && !['mover', 'girar', 'escalar'].includes(k) ? null : k;
    if (herr !== 'medir') { medida = []; escena.medida(null); }
    if (herr !== 'centro' && escena) escena.marcadores(null);
    if (herr !== 'partir' && herr !== 'cortar') { partirO = null; escena.planoCorte(null); }
    if (herr !== 'cortar') cortarO = null;
    if (herr !== 'animar' && escena && escena.animando()) { escena.animar(null); escena.giraCamara(0); }
    if (herr !== 'cons') { consSel = null; pintaCons(); }
    if (herr === 'cons') selAntes = sel.slice();
    if (herr !== 'matriz') escena.fantasmas(null);
    pintaCinta(); pintaFlechas(); pintaProp(); if (window.__r8e) window.__r8e.herr = herr;
  }
  // ---------- v20.4 · ⌖ MARCAR EL CENTRO (la dueña: «marcar el centro»): cada centro con su nombre, porque NO son lo mismo ----------
  function panelCentro() {
    const out = [h('div.r8e-prop-t', h('b', '⌖ CENTROS')), h('p.small.muted', 'Cada uno es una cosa distinta: el de la CAJA (la mitad de lo que mide), el de MASA (donde se equilibra si es maciza), el de una CARA o el de un CÍRCULO (un agujero, un cilindro). Toca uno para usarlo.')];
    const marcas = [], fila = (ic, t, p, col, extra, eje) => { marcas.push({ p, color: col, r: 1.4 }); return h('div.r8e-centro', h('div', h('b', ic + ' ' + t), h('small', p.map(n1).join(' · ') + ' mm')), extra ? h('small.muted', extra) : null,
      h('div.r8e-btns', btn('／ Eje aquí', () => { const k = nuevaCons({ tipo: 'eje', base: eje ? 'normal' : 'z', o: p, dir: eje || [0, 0, 1], nombre: 'Eje · ' + t }); eligeCons(k); toast('／ Eje puesto: úsalo para un patrón en círculo (▦ Patrón)', 'ok'); }, { cls: 'sm' }), btn('📏 Medir desde aquí', () => { medida = [{ p }]; ponHerr('medir'); escena.medida(p); }, { cls: 'sm ghost' }),
        sel.length === 1 ? btn('⤢ Llevar aquí al 0,0', () => { const c = PR.busca(P, sel[0]); if (!c) return; c.t.pos[0] = r3(c.t.pos[0] - p[0]); c.t.pos[1] = r3(c.t.pos[1] - p[1]); commit(); ponHerr('centro'); }, { cls: 'sm ghost', title: 'Mueve la pieza para que este centro quede en el centro de la cama' }) : null)); };
    if (caraSel && caraSel.F) { const F = caraSel.F; out.push(fila('▱', 'Centro de la cara', F.o, '#ff9f1a', 'El centro de su superficie (' + n1(F.area) + ' mm²).', F.n));
      ((caraSel.BD && caraSel.BD.circulos) || []).forEach(c => out.push(fila('◯', 'Centro del círculo Ø' + n1(2 * c.R), c.c, '#29d3ff', c.s1 > 0 ? 'Un agujero o un saliente redondo de esta cara.' : 'El borde redondo de esta cara.', c.n))); }
    if (sel.length === 1) { const C = PR.centros(P, sel[0]);
      if (C) { out.push(fila('⬛', 'Centro de la caja', C.caja, '#7c6cff', 'La mitad de lo que mide: ' + C.dims.map(n1).join(' × ') + ' mm.'));
        if (C.masa) { const d = Math.hypot(...C.masa.map((v, k) => v - C.caja[k])); out.push(fila('⚖️', 'Centro de masa', C.masa, '#3ddc84', d < 0.05 ? 'Coincide con el de la caja (pieza simétrica).' : 'Está a ' + n1(d) + ' mm del de la caja: la pieza pesa más de un lado. Si se imprime vacía o con poco relleno, cambia algo.')); } } }
    else if (!caraSel) out.push(h('p.r8e-nota', '👆 Elige una pieza (o, en modo ▱ Cara, una cara) para ver sus centros.'));
    escena.marcadores(marcas.length ? marcas : null); window.__r8e && (window.__r8e.centros = marcas.map(x => x.p));
    mount(prop, out);
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
    if (!c) { escena.fantasmas(null); return mount(prop, h('div.r8e-prop-t', h('b', '▦ PATRÓN')), h('p.small', 'Elige UNA pieza y te hago copias en fila, en rejilla o en círculo alrededor de un eje (por ejemplo, agujeros alrededor de un plato o los dientes de una rueda).')); }
    const o = ESTUDIO.matriz = ESTUDIO.matriz || { tipo: 'lineal', n: 4, n2: 3, dx: 20, dy: 0, dz: 0, dy2: 20, angulo: 360, eje: 'pieza', girar: true, cx: 0, cy: 0 };
    const ejes = PR.construccionDe(P).filter(x => x.tipo === 'eje'), b = PR.cajaDe(P, [c.id]), cen = b ? [0, 1, 2].map(k => (b.min[k] + b.max[k]) / 2) : [0, 0, 0];
    const ejeDe = () => { if (o.eje === 'cama') return { o: [0, 0, 0], dir: [0, 0, 1] }; if (o.eje === 'x') return { o: cen, dir: [1, 0, 0] }; if (o.eje === 'y') return { o: cen, dir: [0, 1, 0] }; const e = ejes.find(x => x.id === o.eje); if (e) return { o: e.o, dir: e.dir };
      // «la pieza»: el radio sale de dónde esté; con el eje en su borde (como un tornillo alrededor de un plato) se usa el radio
      return { o: [cen[0] - (o.radio || 0), cen[1], 0], dir: [0, 0, 1] }; };
    const previa = () => { try { const v = R && R.proxies.find(x => x.id === c.id); if (!v) return; const L = PR.transformacionesMatriz(c, Object.assign({}, o, { eje: o.tipo === 'circular' ? ejeDe() : undefined })); escena.fantasmas(L.map(tt => ({ vista: v.vista, matriz: PR.matriz4(tt).elements }))); window.__r8e && (window.__r8e.previa = L.length); } catch (e) { escena.fantasmas(null); } };
    const caja2 = h('div'), nada = () => previa();
    mount(caja2, o.tipo === 'lineal' ? [campoNum(o, 'n', 'Cuántas (en total)', 2, 200, 1, '', nada), campoNum(o, 'dx', 'Separación en X', -500, 500, 0.5, 'mm', nada), campoNum(o, 'dy', 'Separación en Y', -500, 500, 0.5, 'mm', nada), campoNum(o, 'dz', 'Separación en Z', -500, 500, 0.5, 'mm', nada)]
      : o.tipo === 'rejilla' ? [h('div.r8e-tres', campoNum(o, 'n', 'Columnas (X)', 1, 60, 1, '', nada), campoNum(o, 'n2', 'Filas (Y)', 1, 60, 1, '', nada)), campoNum(o, 'dx', 'Separación entre columnas', -500, 500, 0.5, 'mm', nada), campoNum(o, 'dy2', 'Separación entre filas', -500, 500, 0.5, 'mm', nada)]
        : [campoNum(o, 'n', 'Cuántas (en total)', 2, 200, 1, '', nada), campoNum(o, 'angulo', 'Ángulo total', 5, 360, 5, '°', nada),
          h('label.r8e-c.col', h('span', 'Alrededor de'), h('select.inp.r8e-matriz-eje', { onchange: e => { o.eje = e.target.value; panelMatriz(); } }, [['pieza', 'Un eje vertical a «radio» de la pieza'], ['cama', 'El centro de la cama'], ['x', 'El eje X por su centro'], ['y', 'El eje Y por su centro']].concat(ejes.map(x => [x.id, '／ ' + x.nombre])).map(([k, t2]) => h('option', { value: k, selected: o.eje === k }, t2)))),
          o.eje === 'pieza' ? campoNum(o, 'radio', 'Radio (distancia del eje a la pieza)', 0, 500, 0.5, 'mm', nada) : null,
          h('label.check.small', h('input', { type: 'checkbox', checked: o.girar !== false, onchange: e => { o.girar = e.target.checked; previa(); } }), 'Que cada copia gire con el círculo (como los dientes de una rueda)')]);
    mount(prop, h('div.r8e-prop-t', h('b', '▦ PATRÓN · ' + (c.nombre || PR.nombreTipo(c)))), h('div.r8e-seg', [['lineal', '⋯ En fila'], ['rejilla', '▦ Rejilla'], ['circular', '◌ En círculo']].map(([k, t2]) => h('button' + (o.tipo === k ? '.on' : ''), { type: 'button', 'data-tipo': k, onclick: () => { o.tipo = k; panelMatriz(); } }, t2))), caja2,
      h('p.tiny.muted', 'En azul ves dónde quedarán las copias antes de hacerlas.'),
      h('div.r8e-btns', btn('✓ Hacer las copias', () => { const g = PR.matriz(P, c.id, Object.assign({}, o, { eje: o.tipo === 'circular' ? ejeDe() : undefined })); if (g) { escena.fantasmas(null); commit(); elige([g.id]); herr = null; pintaCinta(); pintaProp(); toast('▦ ' + (o.tipo === 'rejilla' ? o.n * o.n2 : o.n) + ' copias. Siguen siendo editables (ábrelas en el navegador).', 'ok'); } }, { cls: 'primary r8e-matriz-ok' }), btn('Cancelar', () => { escena.fantasmas(null); ponHerr(null); }, { cls: 'ghost' })));
    previa();
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
    const o = partirO = partirO || Object.assign({ eje: 'z', pos: null, inclina: 0, tipo: 'pasadores', forma: 'redonda', estilo: 'recto', n: 0, d: 5, largo: 10, imanD: 6, imanH: 3, encaje: 'justo', manual: false, sitios: [], planoId: '' }, ESTUDIO.partir || {});
    const info = h('div.r8e-medida'), aviso = h('div');
    const planos = PR.construccionDe(P).filter(c => c.tipo === 'plano'), pl = o.planoId && planos.find(c => c.id === o.planoId);
    o.plano = pl ? { o: pl.o, n: pl.n } : null;
    let total = null;
    const prepara = () => {
      try {
        const L = objetivo ? [PR.colocado(objetivo, P)] : PR.partesFinales(P).map(x => x.m); if (!L.length) throw new Error('No hay nada que partir.');
        total = N.union(L); const b = N.caja(total), k = { x: 0, y: 1, z: 2 }[o.eje]; // (sin guardar: puede ser la misma pieza de la caché)
        if (!o.plano && (o.pos === null || o.pos > b.dims[k])) o.pos = Math.round(b.dims[k] / 2 * 2) / 2;
        const r = N.partir(total, Object.assign({}, o, { sitios: o.manual ? o.sitios : null })), cs = r.plano, Rt = [[cs.R[0][0], cs.R[1][0], cs.R[2][0]], [cs.R[0][1], cs.R[1][1], cs.R[2][1]], [cs.R[0][2], cs.R[1][2], cs.R[2][2]]], aW = v => [0, 1, 2].map(i => Rt[i][0] * v[0] + Rt[i][1] * v[1] + Rt[i][2] * v[2]);
        const centro = o.plano ? (() => { const c0 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2], n = o.plano.n, dd = (n[0] * (c0[0] - o.plano.o[0]) + n[1] * (c0[1] - o.plano.o[1]) + n[2] * (c0[2] - o.plano.o[2])); return c0.map((v, i) => v - n[i] * dd); })()
          : (() => { const c = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]; c[k] = b.min[k] + o.pos; return c; })();
        o._R = cs.R; o._plano = { normal: r.normal, punto: centro };
        escena.planoCorte({ normal: r.normal, punto: centro, tam: Math.max(...b.dims) * 1.4, sitios: r.sitios.map(q => aW([q[0], q[1], cs.zc])), d: o.tipo === 'imanes' ? o.imanD : o.d });
        mount(info, h('div', h('span', 'Corte'), h('b', n1(r.seccion / 100) + ' cm²')), h('div', h('span', 'Conectores'), h('b', o.tipo === 'ninguno' ? '—' : String(r.sitios.length))), h('div', h('span', 'Piezas'), h('b', String(r.imprimir.length))));
        mount(aviso, r.avisos.map(a => h('p.r8e-mal', '⚠️ ' + a)));
        window.__r8e && (window.__r8e.partir = { sitios: r.sitios.length, piezas: r.imprimir.map(x => x.t), seccion: Math.round(r.seccion) });
        return r;
      } catch (e) { mount(aviso, h('p.r8e-mal', '⚠️ ' + (e.message || e))); escena.planoCorte(null); return null; }
      finally { N.limpia(); total = null; }
    };
    partirO._prepara = prepara;
    const cambia = () => { ESTUDIO.partir = Object.assign({}, o, { pos: null, sitios: [], _R: null, _plano: null, _prepara: null, plano: null }); prepara(); };
    const b0 = (() => { try { const L = objetivo ? [objetivo.id] : P.cuerpos.map(c => c.id); return PR.cajaDe(P, L); } catch (e) { return null; } })();
    const maxPos = b0 ? b0.dims[{ x: 0, y: 1, z: 2 }[o.eje]] : 200;
    if (o.pos === null || o.pos > maxPos) o.pos = Math.round(maxPos / 2 * 2) / 2; // a la mitad, ya escrito en su casilla
    const T = N.CONECTOR_TIPOS.find(x => x.k === (o.tipo === 'cuadrada' ? 'espiga' : o.tipo)) || N.CONECTOR_TIPOS[1];
    const seg = (L, k, cls) => h('div.r8e-seg' + (cls ? '.' + cls : ''), Object.entries(L).map(([v, t2]) => h('button' + (o[k] === v ? '.on' : ''), { type: 'button', ['data-' + k]: v, onclick: () => { o[k] = v; if (k === 'forma' && o.tipo === 'cuadrada') o.tipo = 'espiga'; cambia(); panelPartir(); } }, t2)));
    mount(prop, h('div.r8e-prop-t', h('b', '✂️ PARTIR' + (objetivo ? ' · ' + (objetivo.nombre || PR.nombreTipo(objetivo)) : ' · TODO EL DISEÑO'))),
      h('p.small.muted', objetivo ? 'Parto la pieza elegida en dos y les pongo conectores para unirlas.' : 'Parto todo el diseño (o elige antes una pieza).'),
      h('b.r8e-sub', '1 · Dónde corto'),
      h('div.r8e-seg', [['z', '⬌ Tumbado'], ['x', '⬍ De pie (X)'], ['y', '⬍ De pie (Y)']].map(([k, t2]) => h('button' + (!o.planoId && o.eje === k ? '.on' : ''), { type: 'button', 'data-eje': k, onclick: () => { o.eje = k; o.pos = null; o.planoId = ''; o.sitios = []; panelPartir(); } }, t2))),
      planos.length ? h('label.r8e-c.col', h('span', 'O con un plano de construcción'), h('select.inp.r8e-partir-plano', { onchange: e => { o.planoId = e.target.value; o.sitios = []; panelPartir(); } }, h('option', { value: '' }, '—'), planos.map(c => h('option', { value: c.id, selected: o.planoId === c.id }, '📐 ' + c.nombre)))) : null,
      !o.planoId ? [campoNum(o, 'pos', 'Dónde corto (desde el principio)', 0.5, Math.max(1, maxPos - 0.5), 0.5, 'mm', () => { o.sitios = []; cambia(); }), campoNum(o, 'inclina', 'Inclinar el corte', -60, 60, 1, '°', () => { o.sitios = []; cambia(); })] : null,
      h('b.r8e-sub', '2 · Con qué los uno'),
      h('div.r8e-conect', N.CONECTOR_TIPOS.map(x => h('button.r8e-con' + (T.k === x.k ? '.on' : ''), { type: 'button', 'data-con': x.k, title: x.d, onclick: () => { o.tipo = x.k; if (x.k === 'clip') o.forma = 'redonda'; cambia(); panelPartir(); } }, h('span', x.e), h('b', x.t)))),
      h('p.small.muted.r8e-con-d', T.d),
      h('label.r8e-c.col.r8e-oculto', h('span', 'Conectores'), h('select.inp', { 'data-k': 'tipo', onchange: e => { o.tipo = e.target.value; panelPartir(); } }, Object.entries(N.CONECTORES).map(([k, t2]) => h('option', { value: k, selected: o.tipo === k }, t2)))),
      ['espiga', 'cuadrada', 'pasadores'].includes(o.tipo) ? seg(N.CONECTOR_FORMAS, 'forma') : null,
      ['espiga', 'cuadrada'].includes(o.tipo) ? seg(N.CONECTOR_ESTILOS, 'estilo') : null,
      o.tipo !== 'ninguno' ? [
        h('b.r8e-sub', '3 · Cuántos y dónde'),
        h('div.r8e-seg', h('button' + (!o.manual ? '.on' : ''), { type: 'button', onclick: () => { o.manual = false; cambia(); panelPartir(); } }, '🤖 Los pone el programa'), h('button.r8e-manual' + (o.manual ? '.on' : ''), { type: 'button', onclick: () => { o.manual = true; cambia(); panelPartir(); } }, '📍 Los pongo yo (tocando)')),
        o.manual ? h('p.r8e-nota', '📍 Toca el corte azul para poner un conector; tócalo otra vez para quitarlo. Llevas ' + o.sitios.length + '.', o.sitios.length ? btn('Quitar todos', () => { o.sitios = []; cambia(); panelPartir(); }, { cls: 'sm ghost' }) : null) : campoNum(o, 'n', 'Cuántos (0 = los que quepan)', 0, 8, 1, '', cambia),
        o.tipo === 'imanes' ? [campoNum(o, 'imanD', 'Diámetro del imán', 2, 30, 0.5, 'mm', cambia), campoNum(o, 'imanH', 'Grosor del imán', 1, 15, 0.5, 'mm', cambia)] : [campoNum(o, 'd', o.tipo === 'cola' ? 'Tamaño de la cola' : o.tipo === 'clip' ? 'Grosor del clip' : 'Tamaño del conector', 2, 20, 0.5, 'mm', cambia), campoNum(o, 'largo', 'Largo del conector', 4, 60, 1, 'mm', cambia)],
        o.tipo !== 'imanes' ? h('label.r8e-c.col', h('span', 'Encaje (tus holguras)'), h('select.inp', { onchange: e => { o.encaje = e.target.value; cambia(); } }, [['justo', 'Justo (' + ENCAJES.justo.toFixed(2).replace('.', ',') + ' mm por lado)'], ['presion', 'A presión (' + ENCAJES.presion.toFixed(2).replace('.', ',') + ')'], ['gira', 'Holgado (' + ENCAJES.gira.toFixed(2).replace('.', ',') + ')']].map(([k, t2]) => h('option', { value: k, selected: o.encaje === k }, t2)))) : null] : null,
      info, aviso,
      h('div.r8e-btns', btn('⬇ Descargar las partes (3MF)', () => descargaPartes('3mf'), { cls: 'primary r8e-partir-3mf' }), btn('🧩 STL por separado (.zip)', () => descargaPartes('zip'), { cls: 'r8e-partir-zip' }), btn('✂️ Partir en el diseño', () => aplicaPartir(), { cls: 'r8e-partir-ok' }), btn('Cancelar', () => ponHerr(null), { cls: 'ghost' })),
      h('p.tiny.muted', 'Al descargar, cada parte va tumbada con el corte hacia la cama (lista para imprimir sin soportes en esa cara). Los pasadores van tumbados aparte. Antes de la pieza entera, imprime una prueba pequeña del conector.'));
    prepara();
    function descargaPartes(como) {
      try {
        const L = objetivo ? [PR.colocado(objetivo, P)] : PR.partesFinales(P).map(x => x.m); const r = N.partir(N.union(L), Object.assign({}, o, { sitios: o.manual ? o.sitios : null }));
        // las partes, una al lado de la otra en la cama
        let x = 0; const col = (objetivo && objetivo.color) || '#b4b8bf', partes = r.imprimir.map(p => { const b = N.caja(p.m), m = p.m.translate([x - b.min[0], 0, 0]); x += b.dims[0] + 6; return { m, nombre: p.t, color: p.t.startsWith('pasador') ? '#f7d117' : col }; });
        const base = nombreArchivo(); if (como === '3mf') baja(N.tresMF(partes.map(p => ({ m: N.aLaCama(p.m).translate([0, 0, 0]), nombre: p.nombre, color: p.color })), base), base + '_partido.3mf');
        else baja(zipStl(partes.map(p => ({ nombre: base + '_' + p.nombre + '.stl', m: N.aLaCama(p.m) }))), base + '_partido.zip');
        toast('✂️ ' + partes.length + ' partes descargadas', 'ok');
      } catch (e) { toast(e.message || String(e), 'bad', 7000); } finally { N.limpia(); }
    }
    function aplicaPartir() {
      try {
        const L = objetivo ? [PR.colocado(objetivo, P)] : PR.partesFinales(P).map(x => x.m); const r = N.partir(N.union(L), Object.assign({}, o, { sitios: o.manual ? o.sitios : null })), col = (objetivo && objetivo.color) || '#b4b8bf';
        const nuevos = r.montadas.map(p => { const s = N.aSopa(p.m), id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); PR.MALLAS.set(id, s); return { tipo: 'malla', nombre: 'Parte ' + (p.t === 'arriba' ? 'A' : 'B'), p: { malla: id, archivo: 'corte' }, color: col }; });
        if (objetivo) PR.borrar(P, [objetivo.id]); else P.cuerpos = [];
        nuevos.forEach(c => PR.añadir(P, c)); sel = nuevos.map(c => c.id); herr = null; partirO = null; // v20.2: el siguiente corte empieza de cero (antes se quedaba la altura del anterior)
        commit(); pintaCinta(); escena.planoCorte(null); toast('✂️ Partida en ' + nuevos.length + ' (con sus conectores). Los pasadores sueltos salen al descargar.', 'ok', 6000);
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
  // v30 · 🎁 las dos sorpresas (Escaparate e Impresión fantasma) con lo que haya en el Estudio
  async function sorpresa(que) {
    if (!P.cuerpos.length) return toast('Primero diseña algo.', 'warn');
    const S = await import('../r8/sorpresas.js'); let partes; try { partes = PR.partesFinales(P).map(x => ({ vista: N.aVista(x.m), color: x.color || '#b4b8bf', acabado: x.acabado || 'mate' })); } catch (e) { return toast(e.message || String(e), 'bad'); } finally { N.limpia(); }
    S[que](partes, { nombre: P.nombre || 'Mi diseño' });
  }
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
  const teclas = e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || document.querySelector('.r8b')) return;
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? rehacer() : deshacer(); return; }
    if (ctrl && k === 'y') { e.preventDefault(); rehacer(); return; }
    if (ctrl && k === 'd') { e.preventDefault(); duplicar(); return; }
    if (ctrl && k === 's') { e.preventDefault(); autoguarda(); toast('💾 Guardado', 'ok'); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); borrar(); return; }
    if (e.key === 'Escape') { if (caraSel) { quitaCara(); pintaProp(); return; } if (herr) ponHerr(null); else if (modoSel === 'cara') ponModoSel('pieza'); else elige([]); return; }
    if (e.shiftKey) escena.fino(true);
    const t = { m: 'mover', r: 'girar', s: 'escalar' }[k]; if (t) { ponHerr(t); return; }
    if (k === 'c' && !ctrl) return ponModoSel(modoSel === 'cara' ? 'pieza' : 'cara'); // v20.2
    if (e.key === '[') return panel('nav'); if (e.key === ']') return panel('prop'); if (e.key === '\\') return panel('todo');
    if (k === 'h') return alternaHueco(); if (k === 'b') return nuevoBoceto(); if (k === 'f') return menuFormas(cinta.querySelector('[data-b="formas"]'));
  };
  raiz.addEventListener('keydown', teclas);
  // v20.4 · DESHACER FIABLE: tras pulsar un botón del panel (que se vuelve a pintar) el foco se queda en la página, fuera del Estudio, y
  // Ctrl+Z no llegaba. Si el foco está «en ninguna parte» y el Estudio se ve (sin ventanas encima), las teclas van al Estudio.
  const teclasFuera = e => { if (vivo && raiz.isConnected && raiz.offsetParent !== null && (e.target === document.body || e.target === document.documentElement) && !document.querySelector('.modal, .r8b')) teclas(e); };
  document.addEventListener('keydown', teclasFuera);
  raiz.addEventListener('keyup', e => { if (e.key === 'Shift') escena.fino(false); });
  vista.addEventListener('dragover', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); vista.classList.add('encima'); } });
  vista.addEventListener('dragleave', () => vista.classList.remove('encima'));
  vista.addEventListener('drop', e => { vista.classList.remove('encima'); const L = [...((e.dataTransfer && e.dataTransfer.files) || [])].filter(f => /\.(stl|3mf|obj|svg)$/i.test(f.name)); if (L.length) { e.preventDefault(); e.stopPropagation(); L.forEach(importar); } });

  pintaCinta(); pintaNav(); pintaProp(); recalcula(true); setTimeout(() => escena && escena.encuadrar('iso'), 120);
  // v20.2 · lo que llega de Productos («🧰 Abrir en el Estudio»)
  function recogePendiente() { import('../r8/estado.js').then(E => { const f = E.tomaParaEstudio && E.tomaParaEstudio(); if (f && vivo) { importar(f); toast('📂 «' + f.name + '» abierto en el Estudio para editarlo', 'ok'); } }).catch(() => { }); }
  recogePendiente();
  // una pieza que llega de otra pestaña (Foto → 3D, una parte cortada…) como malla editable
  function añadeMalla(sopa, nombre) { const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); PR.MALLAS.set(id, sopa); return añade({ tipo: 'malla', nombre: String(nombre || 'Pieza').slice(0, 40), p: { malla: id, archivo: nombre || 'pieza' }, color: colorSiguiente() }); }
  window.__r8eApi = { panel, PAN, añadeMalla, añadeForma, añadeDiseno, importar, ponHerr, elige, commit, get P() { return P; }, set P(x) { ponProyecto(x); }, escena, PR, N, construyeAnimado, ponModoSel, eligeCons, nuevaCons, get caraSel() { return caraSel; }, get R() { return R; }, irPaso, hazChivatos, arregla, compruebaMov, CHIV, editaPaso, eligePaso };
  return {
    añadeDiseno, añadeMalla, construyeAnimado, ponProyecto, importar, get P() { return P; },
    pausa() { try { if (escena && escena.animando()) { escena.animar(null); escena.giraCamara(0); if (ESTUDIO.anim) ESTUDIO.anim.play = false; if (herr === 'animar') pintaProp(); } } catch (e) { } }, // v20.2: al esconder la pestaña
    reanuda() { if (!vivo || !escena) return; window.__r8eApi = window.__r8eApi || null; escena.pide(); recalcula(true); recogePendiente(); }, // v20.2: al volver a la pestaña (sigue encendido)
    destroy() { document.removeEventListener('keydown', teclasFuera); vivo = false; clearTimeout(tic); clearTimeout(guardTic); clearTimeout(CHIV.tic); if (P.cuerpos.length) autoguarda(); document.querySelectorAll('.r8e-menu').forEach(m => m.remove()); try { escena && escena.destruir(); } catch (e) { } delete window.__r8eApi; }
  };
}
