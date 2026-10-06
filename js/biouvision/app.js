// ================= v15.4 · BIOUVISION · la app propia de fotos =================
// Biouvision es independiente (su página, su icono, su ventana y su acceso directo «Biouvision») pero comparte TODO con
// CelebriDiseños: la sesión (no hay que entrar dos veces), los datos, el servidor y el motor de fotos del PC.
// Secciones: Inicio · Restaurar · Quitar fondo · Estudio · Mis fotos · Motores (en el PC).
// Lo pesado (la IA) lo hace SIEMPRE el PC: el móvil se lo encarga y la foto vuelve sola.
// OJO: aquí no se importa app.js (arranca CelebriDiseños entero al cargarse).
import { h, mount, toast } from '../ui.js';
import { S, loadLocal, pull, startAutoSync, onAuthLostHandler, api, can, kv } from '../store.js';
import { desktop } from '../desktop.js';
import { renderLogin, renderConnect } from '../views/setup.js';
import { downloadBlob } from '../pdfview.js';
import { estadoMotor } from '../biou/motor.js';
import { comparador } from './comparar.js';
import { listarObras } from './obras.js';

const raiz = document.getElementById('bv');
const SECCIONES = [
  ['inicio', '🏠', 'Inicio'],
  ['restaurar', '🕰️', 'Restaurar'],
  ['fondo', '✂️', 'Quitar fondo'],
  ['estudio', '🎨', 'Estudio'],
  ['fotos', '🖼️', 'Mis fotos'],
  ['motores', '⚙️', 'Motores', () => desktop.on]
];
const visibles = () => SECCIONES.filter(s => !s[3] || s[3]());
const seccionDe = () => { const k = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]; return visibles().some(s => s[0] === k) ? k : 'inicio'; };

// ---------- lo que comparten las secciones ----------
let vistas = {}, creando = {}, cajas = {}, chipPC = null, obrasCambiadas = true, armado = false;
const C = {
  irA(sec) { if (seccionDe() === sec && location.hash) return mostrar(); location.hash = '#' + sec; },
  async descargar(file) {
    downloadBlob(file, file.name);
    toast(desktop.on ? '⬇️ Guardada en la carpeta «Descargas».' : '⬇️ Descargada.', 'ok', 5000);
  },
  async guardarNube(file) {
    if (!can('archivos.subir')) return toast('Tu usuario no puede subir archivos. Pídeselo a quien lleve el negocio.', 'warn', 7000);
    toast('☁️ Guardando en la biblioteca…', '', 3000);
    try {
      const F = await import('../files.js');
      await F.uploadFile(file, { entidad: 'biblioteca', visibilidad: 'equipo', original: true });
      toast('☁️ Guardada en la biblioteca del negocio (Centro de IA → Biblioteca).', 'ok', 6000);
    } catch (e) { toast(e.message, 'bad', 8000); }
  },
  puedeInstagram: () => can('redes.ver'),
  // la foto pasa a Instagram Studio de CelebriDiseños (la misma sesión; se guarda en este aparato y se abre allí)
  async aInstagram(file) {
    await kv.set('ig.pendiente', { medios: [{ file }], t: Date.now() });
    if (desktop.on) {
      try { await desktop.ventana('', '#/instagram/biouvision'); toast('📸 Abriendo Instagram Studio en CelebriDiseños…', 'ok', 5000); return; } catch (e) { }
    }
    location.href = 'index.html#/instagram/biouvision';
  },
  async aEstudio(file) {
    C.irA('estudio');
    const v = await crear('estudio');
    if (v && v.abrir) v.abrir(file);
  },
  alGuardar() { obrasCambiadas = true; if (vistas.fotos && vistas.fotos.refrescar) vistas.fotos.refrescar(); },
  avisar(texto) {
    if (!document.hidden) return;
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Biouvision', { body: texto, icon: 'icons/biouvision-192.png' }); } catch (e) { }
    const t0 = document.title; document.title = '✨ ' + texto; addEventListener('focus', () => { document.title = t0; }, { once: true });
  },
  // qué hay en el PC para un grupo de motores: { lineas: [[ok, [nombre, detalle]]], falta } o, en el móvil, { pc: 'movil', texto }
  async estadoGrupo(grupo) {
    if (!desktop.on) {
      const w = await api('pc.servidor', {}, { quiet: true }).catch(() => null);
      return { pc: 'movil', texto: w ? '🖥️ Lo hará el PC del taller (' + w.dispositivo + ', encendido ✅). Tu foto viaja por el servidor del negocio.' : '🖥️ Lo hará el PC del taller. Ahora no está encendido con el programa abierto: el encargo esperará a que lo enciendas.' };
    }
    const st = await estadoMotor();
    if (!st || !st.listo) return { lineas: [[false, ['Motor de fotos', 'falta el Python de EDITOR_VIDEO (míralo en «Centro de IA»)']]], falta: false };
    const m = id => (st.modelos || []).find(x => x.id === id) || {};
    const L = grupo === 'restaurar'
      ? [[m('esrgan-x4').presente || m('esrgan-x2').presente, ['🔍 Ampliar con IA', 'hasta 4K']], [m('gfpgan').presente, ['🙂 Caras nítidas', '']], [m('deoldify').presente || m('ddcolor').presente, ['🎨 Color IA', '(opcional)']]]
      : [[(st.modelos || []).some(x => x.grupo === 'fondo' && x.presente), ['✂️ Recorte con IA', (st.modelos || []).filter(x => x.grupo === 'fondo' && x.presente).map(x => x.nombre.split(' (')[0]).slice(0, 2).join(', ')]]];
    return { lineas: L, falta: L.some(x => !x[0]) };
  },
  estadoRestaurar: () => C.estadoGrupo('restaurar'),
  estado(grupo) { // la cajita «qué motores hay» de cada pantalla
    const box = h('div.bv-motores', h('span', '⏳ Mirando el motor…'));
    C.estadoGrupo(grupo).then(e => {
      if (!box.isConnected) return;
      if (e.pc === 'movil') return mount(box, h('span', e.texto));
      mount(box, e.lineas.map(([ok, t]) => h('div', ok ? '✅ ' : '⬜ ', h('b', t[0]), ' ', t[1] || '')),
        e.falta ? h('button.bv-btn.peq', { type: 'button', style: { marginTop: '6px' }, onclick: () => C.irA('motores') }, '⬇️ Descargar lo que falta') : null);
    }).catch(() => box.remove());
    return box;
  }
};

window.__biouIrAInstagram = f => C.aInstagram(f); // el «📸 Enviar a Instagram» del Estudio, desde aquí

// ---------- secciones (se crean la primera vez y se conservan al cambiar) ----------
function crear(sec) {
  if (!creando[sec]) creando[sec] = crearYa(sec).catch(e => { delete creando[sec]; throw e; });
  return creando[sec];
}
async function crearYa(sec) {
  const el = cajas[sec];
  if (sec === 'inicio') vistas[sec] = pantallaInicio(el);
  else if (sec === 'restaurar') vistas[sec] = (await import('./restaurar.js')).pantallaRestaurar(el, C);
  else if (sec === 'fondo') vistas[sec] = (await import('./fondo.js')).pantallaFondo(el, C);
  else if (sec === 'fotos') vistas[sec] = (await import('./fotos.js')).pantallaFotos(el, C);
  else if (sec === 'motores') vistas[sec] = (await import('./motores.js')).pantallaMotores(el, C);
  else if (sec === 'estudio') {
    const est = h('div.bv-estudio');
    mount(el, h('div.bv-top', h('div.grow', h('h1.bv-h2', '🎨 Estudio'), h('p.bv-sub', { style: { margin: 0 } }, 'Mejora la luz y el color, retoca caras, filtros y cambia el fondo. Se guarda a tamaño original.'))), est);
    vistas[sec] = (await import('../views/estudio.js')).render(est) || {};
  }
  return vistas[sec];
}
async function mostrar() {
  const sec = seccionDe();
  document.querySelectorAll('.bv-rail .bv-nav').forEach(b => { const on = b.dataset.sec === sec; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  Object.entries(cajas).forEach(([k, el]) => { el.hidden = k !== sec; });
  document.body.dataset.sec = sec;
  try {
    const v = await crear(sec);
    if (sec === 'fotos' && obrasCambiadas && v.refrescar) { obrasCambiadas = false; v.refrescar(); }
    if (sec === 'inicio' && v.refrescar) v.refrescar();
    if (sec === 'motores' && v.refrescar) v.refrescar();
  } catch (e) { console.error(e); mount(cajas[sec], h('div.bv-aviso', 'No se pudo abrir esta sección: ' + e.message)); }
  window.scrollTo(0, 0);
}

// ---------- INICIO ----------
function pantallaInicio(el) {
  const demo = comparador('icons/biou-demo-antes.jpg', 'icons/biou-demo-despues.jpg', { etiquetas: ['Antes', 'Biouvision'], demo: true, inicio: 0.5 });
  const recientes = h('div');
  const tarjeta = (sec, ic, t, d, extra) => h('button.bv-tarjeta' + (extra && extra.estrella ? '.estrella' : ''), { type: 'button', onclick: () => C.irA(sec) },
    extra && extra.nuevo ? h('span.nuevo', extra.nuevo) : null, h('div.ic', ic), h('h3', t), h('p', d), h('span.ir', 'Empezar →'));
  mount(el,
    h('section.bv-hero',
      h('div', h('div.bv-marca', 'BIOUVISION · DE CELEBRIDISEÑOS'),
        h('h1.bv-h1', 'Tus fotos antiguas, ', h('em', 'como nuevas.')),
        h('p.bv-sub', 'Polvo, arañazos, manchas y caras borrosas fuera. La deja en 4K y, si quieres, le pone color. También de 1890.'),
        h('div.bv-fila', h('button.bv-btn.prim', { type: 'button', style: { minHeight: '62px', fontSize: '20px' }, onclick: () => C.irA('restaurar') }, '🕰️ Restaurar una foto'),
          h('button.bv-btn', { type: 'button', style: { minHeight: '62px', fontSize: '20px' }, onclick: () => C.irA('fondo') }, '✂️ Quitar un fondo')),
        h('p.bv-ayuda', { style: { marginTop: '16px' } }, desktop.on ? '🔒 Todo se hace en este PC. Tus fotos no salen a ningún servicio de fuera.' : '🔒 Lo hace el PC de tu taller. Tus fotos no salen a ningún servicio de fuera.')),
      h('div.bv-demo', demo.el)),
    h('div.bv-tarjetas',
      tarjeta('restaurar', '🕰️', 'Restaurar fotos antiguas', 'Repara, recupera las caras y la amplía hasta 4K. Con color si quieres.', { estrella: true, nuevo: 'NUEVO' }),
      tarjeta('fondo', '✂️', 'Quitar el fondo', 'Recorte con IA hasta el pelo. Ponle un fondo blanco, de color o de estudio.', { nuevo: 'ULTRA' }),
      tarjeta('estudio', '🎨', 'Estudio', 'Luz, color, filtros y retoque de cara. Para tus fotos de producto.'),
      tarjeta('fotos', '🖼️', 'Mis fotos', 'Todo lo que has hecho, para descargarlo o compartirlo.')),
    recientes);
  async function refrescar() {
    const l = (await listarObras().catch(() => [])).slice(0, 6);
    if (!l.length) return recientes.replaceChildren();
    mount(recientes, h('div.bv-seccion-t', h('h2', '✨ Lo último que has hecho'), h('button.bv-btn.peq', { type: 'button', onclick: () => C.irA('fotos') }, 'Ver todas →')),
      h('div.bv-galeria', l.map(o => h('button.bv-obra', { type: 'button', 'aria-label': 'Abrir ' + o.nombre, onclick: async () => { C.irA('fotos'); const v = await crear('fotos'); v.abrir(o.id); } },
        h('img', { src: o.mini, alt: '', loading: 'lazy' }), h('div', h('b', o.nombre), h('small', o.w + ' × ' + o.h + ' px'))))));
  }
  return { refrescar };
}

// ---------- armazón ----------
function armar() {
  const navs = visibles().map(([k, ic, t]) => h('button.bv-nav', { type: 'button', 'data-sec': k, onclick: () => C.irA(k) }, h('b', { 'aria-hidden': 'true' }, ic), h('span', t)));
  chipPC = h('span.bv-chip', h('i'), '…');
  const volver = () => desktop.on ? desktop.ventana('', '').catch(() => { location.href = 'index.html'; }) : (location.href = 'index.html');
  const main = h('main.bv-main', { id: 'bv-main' },
    h('div.bv-arriba', h('span.bv-marca.bv-solo-movil', 'BIOUVISION'), h('div.grow'), chipPC,
      S.me ? h('span.bv-chip.bv-usuario', '👤 ' + (S.me.nombre || '')) : null,
      h('button.bv-btn.peq.bv-solo-movil', { type: 'button', onclick: volver, title: 'Ir a CelebriDiseños' }, '← Programa')));
  cajas = {}; vistas = {}; creando = {};
  for (const [k] of visibles()) { cajas[k] = h('section.bv-seccion', { 'data-sec': k, hidden: true }); main.appendChild(cajas[k]); }
  mount(raiz, h('div.bv-app',
    h('nav.bv-rail', { 'aria-label': 'Secciones de Biouvision' },
      h('button.bv-logo', { type: 'button', onclick: () => C.irA('inicio'), 'aria-label': 'Biouvision, inicio' }, h('img', { src: 'icons/biouvision.svg', alt: '' }), h('span.bv-marca', 'BIOUVISION')),
      navs, h('div.bv-sep'),
      h('button.bv-volver', { type: 'button', onclick: volver, title: 'Abrir CelebriDiseños' }, '← CelebriDiseños')),
    main));
  mostrar();
  pintaChip();
  if (!armado) { armado = true; addEventListener('hashchange', mostrar); setInterval(pintaChip, 60000); }
}
async function pintaChip() {
  if (!chipPC) return;
  let cls = 'esp', txt = '…';
  try {
    if (desktop.on) { const st = await estadoMotor(); const ok = st && st.listo && (st.modelos || []).some(m => m.presente); cls = ok ? 'ok' : 'esp'; txt = ok ? 'Este PC · IA lista' : 'Este PC · IA sin preparar'; }
    else { const w = await api('pc.servidor', {}, { quiet: true }).catch(() => null); cls = w ? 'ok' : 'mal'; txt = w ? 'PC del taller encendido' : 'PC del taller apagado'; }
  } catch (e) { }
  chipPC.replaceChildren(h('i.' + cls), txt);
  chipPC.title = desktop.on ? 'La IA trabaja en este ordenador' : 'Lo pesado lo hace el PC del taller';
}

// ---------- arranque (la misma sesión que CelebriDiseños) ----------
function acceso() {
  const caja = h('div');
  mount(raiz, h('div.bv-acceso', h('div.bv-acceso-cab', h('img', { src: 'icons/biouvision.svg', alt: '', width: 84, height: 84 }), h('h1.bv-h2', 'Biouvision'), h('p.bv-sub', 'Entra con tu usuario de CelebriDiseños. Es la misma cuenta.')), caja));
  return caja;
}
async function start() {
  window.__bvStarted = true;
  await loadLocal();
  if (desktop.on && !start._ok) { start._ok = true; desktop.ready(); }
  onAuthLostHandler(msg => { toast(msg || 'Vuelve a entrar', 'warn'); start(); });
  if (!S.server) return renderConnect(acceso(), start);
  if (!S.token || !S.me) {
    let st = null;
    try { st = await api('sys.estado', {}, { token: '' }); } catch (e) { st = null; }
    if (st && !st.instalado) return mount(raiz, h('div.bv-acceso', h('div.bv-acceso-cab', h('h1.bv-h2', 'Primero, CelebriDiseños'), h('p.bv-sub', 'Biouvision usa la cuenta del negocio. Instala y abre CelebriDiseños primero.'), h('a.bv-btn.prim', { href: 'index.html' }, 'Abrir CelebriDiseños'))));
    return renderLogin(acceso(), start, st);
  }
  armar();
  startAutoSync();
  pull().then(() => {
    // en el PC, Biouvision también hace los encargos de los móviles (si CelebriDiseños está cerrado; nunca los dos a la vez)
    if (desktop.on) import('../reels/render.js').then(() => import('../trabajospc.js')).then(m => m.startTrabajadorPC()).catch(() => { });
  }).catch(() => { });
}
start().catch(e => { console.error(e); mount(raiz, h('div.bv-cargando', h('h2', 'No se pudo abrir Biouvision'), h('p', e.message || String(e)), h('button.bv-btn.prim', { type: 'button', onclick: () => location.reload() }, 'Recargar'))); });
