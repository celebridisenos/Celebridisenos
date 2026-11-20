// ================= 17-11-2026 · 🤖 SHAMPÚ, el robot de escritorio de Biou =================
// Biou: «en CelebriDiseños déjale hueco a Shampú, buena interfaz para verlo en la calle, todo completo… muchas funciones PRO».
// · En casa (el programa del PC que ve a Shampú): en directo por la red de casa (desktop.shampu → desktop/host/shampu.go).
// · En la calle (el móvil, la tablet o un PC fuera de casa): a través del PC de casa y el servidor de Google (shampu.ver / shampu.orden;
//   el puente es shampu_puente.js). Se actualiza cada pocos segundos mientras la pantalla está abierta y para al salir.
// Solo administradoras (es la cámara de su casa). Las órdenes son una lista cerrada: nunca «olvidar el wifi».
import { h, mount, toast, modal, btn, copyText, confirmDlg } from '../ui.js';
import { S, api } from '../store.js';
import { desktop } from '../desktop.js';
import * as C from '../shampu_comun.js';

const Sh = desktop.shampu;
const TABS = [['cuidador', '🛡️', 'Cuidador'], ['fotos', '🖼️', 'Fotos'], ['timelapse', '⏱️', 'Time-lapse'], ['impresoras', '🖨️', 'Impresoras'], ['mando', '🕹️', 'Mando'], ['pantalla', '🖥️', 'Pantalla'], ['tele', '📺', 'Tele'], ['salud', '🩺', 'Salud'], ['llave', '🔑', 'Llave']];
const lsGet = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };

export function render(el) {
  ponerCss();
  if (!(S.perms && S.perms.all)) {
    mount(el, h('div.card.sh-solo', h('h2', '🤖 Shampú'), h('p', 'Shampú es solo para administradoras: es la cámara de tu casa.')));
    return;
  }
  vista(el);
}

function vista(el) {
  const st = { modo: null, estado: null, impresoras: null, fotos: null, foto: null, recibido: null, ahoraSrv: null, tomado: 0, puente: null, ok: null, error: '',
    servidorViejo: false, tab: lsGet('cd.shampu.tab', 'cuidador'), msg: '', voz: '', msgColor: 'a', pantallaSrc: null, pantallaNombre: '', pantallaEspera: false, filtro: 'todas', fotosCalle: {}, pedidas: new Set(), ordenes: new Map(), ultimaFotoCasa: 0, url: '',
    cam: null, tl: null, tlCada: Number(lsGet('cd.shampu.tlcada', 5)) || 5, tlDura: Number(lsGet('cd.shampu.tldura', 60)), tlVideo: Number(lsGet('cd.shampu.tlvideo', 30)), haciendo: null };
  const vivo = () => root.isConnected && /^#\/shampu/.test(location.hash || '#/shampu');
  const visible = () => vivo() && !document.hidden;

  // ---------- esqueleto (se crea una vez; luego solo se cambian sus partes) ----------
  const pill = h('span.sh-pill'), vig = h('span.sh-vig', { hidden: true }, '● VIGILANDO'), recTL = h('span.sh-rec', { hidden: true }), edad = h('span.sh-edad'), sub = h('div.sh-sub', 'Buscando a Shampú…');
  const abrirApp = h('button.sh-b.sh-b-claro', { type: 'button', hidden: true, onclick: () => abrirSuApp() }, '↗ Abrir su app');
  const aviso = h('div.sh-aviso', { hidden: true });
  const camImg = h('img.sh-cam-img', { alt: 'Lo que ve Shampú' }), camMsg = h('div.sh-cam-msg', '📷 Conectando con la cámara…'), live = h('span.sh-live');
  const camBox = h('div.sh-cam', camImg, camMsg, live);
  const rapidas = h('div.sh-rapidas'), tabs = h('nav.sh-tabs'), panel = h('section.sh-panel');
  const root = h('div.sh',
    h('header.sh-hero',
      h('div.sh-ava', '🤖'),
      h('div.sh-tit', h('h1', 'Shampú'), sub),
      h('div.sh-chips', pill, vig, recTL, edad),
      h('div.sh-hero-acc', abrirApp)),
    aviso,
    h('div.sh-grid',
      h('section.sh-card.sh-cam-card', camBox,
        h('div.sh-cam-bar',
          ...C.MOVER.map(m => boton(m.e, () => mandar({ o: m.o }), { title: 'Mirar: ' + m.t, cls: 'sh-b-redondo' })),
          h('span.sh-sep'),
          boton('📸 Foto', () => mandar({ o: 3 }), { title: 'Shampú hace una foto y la guarda', cls: 'sh-b-amarillo' }),
          boton('⤢', () => pantallaCompleta(), { title: 'Pantalla completa', cls: 'sh-b-redondo' }),
          boton('⤓', () => guardarFotoActual(), { title: 'Guardar lo que se ve ahora', cls: 'sh-b-redondo' }))),
      h('section.sh-lado', rapidas)),
    tabs, panel,
    h('p.sh-pie', '🔒 Solo lo ves tú. Desde la calle va a través del ordenador de casa y de tu Google: nada se guarda en hojas ni en Drive, y las fotos se borran solas en minutos.'));
  mount(el, root);
  TABS.forEach(([k, e, t]) => tabs.appendChild(h('button.sh-tab', { type: 'button', dataset: { tab: k }, onclick: () => { st.tab = k; lsSet('cd.shampu.tab', k); pintarTabs(); pintarPanel(true); } }, h('span', e), ' ', t)));

  function boton(texto, fn, o = {}) {
    const b = h('button.sh-b' + (o.cls ? '.' + o.cls.split(' ').join('.') : ''), { type: 'button', title: o.title || null, style: o.style || null, dataset: o.dataset || null }, texto);
    b.addEventListener('click', async ev => { if (b.classList.contains('sh-ocupado')) return; b.classList.add('sh-ocupado'); try { await fn(ev); } finally { setTimeout(() => b.classList.remove('sh-ocupado'), 350); } });
    return b;
  }

  // ---------- órdenes ----------
  async function mandar(o) {
    const nombre = C.nombreOrden(o);
    try {
      if (st.modo === 'casa') {
        await Sh.orden(o);
        toast('✓ Shampú: ' + nombre, 'ok', 1800);
        setTimeout(leerCasa, 700);
      } else {
        const r = await api('shampu.orden', o, { quiet: true, timeout: 20000 });
        st.ordenes.set(r.id, { o, t: Date.now() });
        toast('📡 Enviado a casa: ' + nombre + '…', 'ok', 2200);
        setTimeout(leerCalle, 900);
      }
    } catch (e) { toast(e.message || String(e), 'bad'); }
  }
  function abrirSuApp() {
    const u = st.url || 'http://192.168.1.155';
    if (desktop.on) desktop.openUrl(u).catch(e => toast(e.message, 'bad')); else window.open(u, '_blank', 'noopener');
  }

  // ---------- cámara ----------
  function ponerGiro() {
    const g = C.gradosDe(st.estado && st.estado.giro), r = g === 90 || g === 270;
    camBox.classList.toggle('sh-vertical', r);
    camImg.style.transform = 'translate(-50%,-50%) rotate(' + g + 'deg)';
  }
  // (17-11 tarde · «la cámara va muy lenta») En casa, VÍDEO SEGUIDO: el <img> abre /local/shampu/video una vez y el programa del PC le pide
  //   fotos a Shampú una detrás de otra (hasta 8 por segundo, antes 2) y las manda en cuanto llegan. Si el vídeo falla 3 veces seguidas,
  //   fotos sueltas como antes. Al esconder la ventana o salir de Shampú se cierra (así no se le pide nada sin nadie mirando).
  let video = false, videoDesde = 0, fallosVideo = 0;
  const conVideo = () => !!(Sh && Sh.videoUrl) && fallosVideo < 3;
  function abrirCamCasa() {
    if (!vivo() || st.modo !== 'casa' || document.hidden) return;
    if (!conVideo()) { siguienteFotoCasa(); return; }
    if (!video) { video = true; videoDesde = Date.now(); camImg.src = Sh.videoUrl(); }
  }
  function cerrarCamCasa() { if (video) { video = false; camImg.removeAttribute('src'); } }
  camImg.onload = () => { camMsg.hidden = true; if (st.modo !== 'casa') return; if (video) { fallosVideo = 0; return; } st.ultimaFotoCasa = Date.now(); setTimeout(siguienteFotoCasa, 150); };
  camImg.onerror = () => {
    if (st.modo !== 'casa') return;
    const avisa = () => { camMsg.hidden = false; camMsg.textContent = '📷 La cámara no contesta ahora mismo. Reintentando…'; };
    if (video) { video = false; fallosVideo++; avisa(); setTimeout(abrirCamCasa, 2000); return; }
    if (!camImg.getAttribute('src')) return; // (el vídeo cerrado a propósito)
    avisa(); setTimeout(siguienteFotoCasa, 2000);
  };
  function siguienteFotoCasa() { if (!vivo() || video) return; if (document.hidden) { setTimeout(siguienteFotoCasa, 1000); return; } camImg.src = Sh.fotoUrl(); }
  document.addEventListener('visibilitychange', function vis() { if (!root.isConnected) { document.removeEventListener('visibilitychange', vis); cerrarCamCasa(); return; } if (document.hidden) cerrarCamCasa(); else abrirCamCasa(); });
  window.addEventListener('hashchange', function hc() { if (!vivo()) { cerrarCamCasa(); window.removeEventListener('hashchange', hc); } });
  function pantallaCompleta() { const f = camBox.requestFullscreen || camBox.webkitRequestFullscreen; if (f) f.call(camBox); else toast('Este aparato no deja poner la pantalla completa.', 'warn'); }
  function guardarFotoActual() {
    if (!camImg.naturalWidth) { toast('Todavía no hay imagen de la cámara.', 'warn'); return; }
    descargarImagen(camImg, C.gradosDe(st.estado && st.estado.giro), 'shampu_' + new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '') + '.jpg');
  }

  // ---------- leer: en casa (directo) ----------
  async function leerCasa() {
    if (!vivo()) return;
    const e = await Sh.estado().catch(err => ({ ok: false, error: err.message }));
    st.ok = !!e.ok; st.error = e.ok ? '' : e.error; if (e.ok) { st.estado = e.estado; st.url = e.url; st.tomado = Date.now(); st.cam = e.cam || null; }
    if (video && st.cam && st.cam.mirando === 0 && Date.now() - videoDesde > 8000) { video = false; abrirCamCasa(); } // (la conexión se cortó sin avisar)
    pintarTodo();
  }
  async function leerImpCasa() { const x = await Sh.imp().catch(() => null); if (x && x.ok) { st.impresoras = x.impresoras; if (st.tab === 'impresoras') pintarPanel(); } }
  async function leerListaCasa() { const x = await Sh.lista().catch(() => null); if (x && x.ok) { const antes = (st.fotos || []).join(); st.fotos = x.fotos; if (antes !== st.fotos.join() && (st.tab === 'fotos' || st.tab === 'cuidador')) pintarPanel(); } }

  // ---------- leer: desde la calle (a través de casa) ----------
  async function leerCalle() {
    if (!vivo()) return;
    try {
      const pedidas = [...st.pedidas].filter(n => !st.fotosCalle[n]).slice(0, 6);
      const r = await api('shampu.ver', { fotos: pedidas, ordenes: [...st.ordenes.keys()] }, { quiet: true, timeout: 25000 });
      st.servidorViejo = false; st.puente = r.puente; st.ahoraSrv = r.ahora;
      Object.assign(st.fotosCalle, r.fotos || {});
      if (st.pantallaNombre && st.fotosCalle[st.pantallaNombre] && st.pantallaEspera) { st.pantallaSrc = st.fotosCalle[st.pantallaNombre]; st.pantallaEspera = false; if (st.tab === 'pantalla') pintarPanel(true); }
      if (Object.keys(r.fotos || {}).length && st.tab === 'fotos') pintarPanel(true);
      for (const [id, x] of st.ordenes) {
        const res = (r.ordenes || {})[id];
        if (res) { st.ordenes.delete(id); if (x.callado && res.ok) continue; res.ok ? toast('✓ Shampú lo ha hecho: ' + C.nombreOrden(x.o), 'ok', 2200) : toast('Shampú no pudo (' + C.nombreOrden(x.o) + '): ' + res.error, 'bad'); }
        else if (Date.now() - x.t > 60000) { st.ordenes.delete(id); toast('El ordenador de casa no ha contestado a «' + C.nombreOrden(x.o) + '». ¿Sigue encendido?', 'warn'); }
      }
      const s = r.snap;
      if (s) {
        st.recibido = s.recibido; st.ok = !!s.ok; st.error = s.ok ? '' : s.error;
        if (s.ok) {
          st.estado = s.estado || st.estado;
          if (s.impresoras) { const a = JSON.stringify(st.impresoras); st.impresoras = s.impresoras; if (a !== JSON.stringify(s.impresoras) && st.tab === 'impresoras') pintarPanel(); }
          if (s.fotos) { const a = (st.fotos || []).join(); st.fotos = s.fotos; if (a !== s.fotos.join() && (st.tab === 'fotos' || st.tab === 'cuidador')) pintarPanel(); }
          if (s.foto && s.foto !== st.foto) { st.foto = s.foto; camImg.src = s.foto; }
        }
      }
      st.tomado = Date.now();
    } catch (e) {
      if (/Acción desconocida/.test(e.message || '')) st.servidorViejo = true;
      else st.error = e.message || String(e);
    }
    pintarTodo();
  }

  // ---------- pintar ----------
  function pintarTodo() { pintarCabecera(); pintarAviso(); pintarRapidas(); ponerGiro(); if (['cuidador', 'salud', 'impresoras', 'mando'].includes(st.tab)) pintarPanel(); }
  function edadSnap() { if (!st.recibido || !st.ahoraSrv) return null; return new Date(st.ahoraSrv) - new Date(st.recibido) + (Date.now() - st.tomado); }
  function pintarCabecera() {
    const p = C.estadoEnPalabras(st.ok === false ? null : st.estado);
    pill.className = 'sh-pill sh-' + (st.ok === false ? 'bad' : p.nivel);
    pill.textContent = st.ok === false ? '⚠ No contesta' : p.e + ' ' + p.t;
    vig.hidden = !(st.estado && st.estado.vigila && st.ok !== false);
    const g = st.tl && st.tl.grabando; recTL.hidden = !g; if (g) recTL.textContent = '⏺ TIME-LAPSE · ' + g.fotos + (g.fotos === 1 ? ' foto' : ' fotos');
    if (st.modo === 'casa') {
      const c = st.cam || {}, fps = video && c.fps ? Math.round(c.fps) : 0;
      sub.textContent = '🏠 En casa · en directo por la wifi'; edad.textContent = ''; live.className = 'sh-live sh-live-on';
      live.textContent = '● EN DIRECTO' + (fps ? ' · ' + fps + ' img/s' + (c.ancho ? ' · ' + c.ancho + '×' + c.alto : '') : '');
    }
    else if (st.modo === 'calle') {
      const ms = edadSnap();
      sub.textContent = '📡 Desde la calle' + (st.puente ? ' · a través de ' + st.puente.dispositivo : '');
      edad.textContent = ms === null ? '' : C.haceCuanto(ms);
      live.className = 'sh-live' + (ms !== null && ms < 15000 ? ' sh-live-on' : '');
      live.textContent = st.foto ? (ms !== null && ms < 15000 ? '● CASI EN DIRECTO' : '⏸ ' + C.haceCuanto(ms)) : '';
      if (!st.foto) { camMsg.hidden = false; camMsg.textContent = st.servidorViejo ? '📡 Falta el servidor nuevo para ver la cámara desde la calle.' : !st.puente ? '📡 Esperando al ordenador de casa…' : '📷 Pidiendo la cámara a casa… (tarda unos segundos)'; }
    }
    abrirApp.hidden = st.modo !== 'casa';
  }
  function pintarAviso() {
    let t = null, nivel = 'warn';
    if (st.modo === 'calle' && st.servidorViejo) t = [h('b', 'Para ver a Shampú desde la calle falta un paso tuyo: pegar el servidor 18.9.0 en tu Google.'), h('br'), 'Es como las otras veces: abre tu Apps Script, pega el Servidor.gs nuevo y pulsa Implementar. Mientras, en casa ya funciona desde el programa del ordenador.'];
    else if (st.modo === 'calle' && !st.puente) t = [h('b', 'Ningún ordenador de casa tiene CelebriDiseños abierto.'), h('br'), 'Ábrelo en la torre (o en el portátil, si está en casa) y en unos segundos verás a Shampú aquí.' + (st.recibido ? ' Lo de abajo es de la última vez.' : '')];
    else if (st.ok === false) { nivel = 'bad'; t = [h('b', 'Shampú no contesta.'), h('br'), '¿Está encendido y en la wifi de casa? ' + (st.modo === 'casa' ? 'Lo sigo intentando solo.' : 'El ordenador de casa lo sigue intentando.')]; }
    aviso.hidden = !t; aviso.className = 'sh-aviso sh-aviso-' + nivel; if (t) mount(aviso, ...t);
  }
  let firmaRap = '';
  function pintarRapidas() {
    const e = st.estado || {}, vigilando = !!e.vigila;
    const firma = JSON.stringify([st.ok, vigilando, e.aviso, e.estado, C.rayasWifi(e.wifi), C.voltios(e.mv5).t, !!e.cerebro]);
    if (firma === firmaRap) return; firmaRap = firma;
    mount(rapidas,
      h('div.sh-rap-tit', 'Lo más rápido'),
      h('div.sh-rap-rej',
        vigilando ? boton(h('span', h('b', '⏹'), 'Parar de vigilar'), () => mandar({ o: 2 }), { cls: 'sh-rap sh-rap-vig-on' })
          : boton(h('span', h('b', '🛡️'), 'Vigilar la casa'), () => mandar({ o: 1 }), { cls: 'sh-rap sh-rap-vig' }),
        boton(h('span', h('b', '📸'), 'Hacer foto'), () => mandar({ o: 3 }), { cls: 'sh-rap' }),
        /dorm/i.test(e.estado || '') ? boton(h('span', h('b', '☀️'), 'Despertar'), () => mandar({ o: 17 }), { cls: 'sh-rap' })
          : boton(h('span', h('b', '😴'), 'A dormir'), () => mandar({ o: 16 }), { cls: 'sh-rap' }),
        boton(h('span', h('b', '🩺'), 'Chequeo'), () => mandar({ o: 7 }), { cls: 'sh-rap' })),
      h('div.sh-mini',
        dato('Estado', C.estadoEnPalabras(st.ok === false ? null : st.estado).t),
        dato('Wifi', rayas(e.wifi)),
        dato('Corriente', C.voltios(e.mv5).t),
        dato('Cerebro', e.cerebro ? '🧠 conectado' : 'sin conectar')));
  }
  const dato = (k, v) => h('div.sh-dato', h('span', k), h('b', v));
  function rayas(dbm) { const n = C.rayasWifi(dbm); return h('span.sh-rayas', { title: dbm !== undefined ? dbm + ' dBm' : '' }, ...[1, 2, 3, 4].map(i => h('i' + (i <= n ? '.on' : ''), { style: { height: (4 + i * 3) + 'px' } }))); }
  function pintarTabs() { [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.tab === st.tab)); }

  let firmaPanel = '';
  function pintarPanel(forzar) {
    const e = st.estado || {}, fotos = (st.fotos || []).join(), giro = e.giro, calle = [Object.keys(st.fotosCalle).length, st.pedidas.size];
    const que = { cuidador: [e.vigila, e.fotosVig, e.aviso, giro, fotos, calle], fotos: [fotos, st.filtro, giro, calle], impresoras: [st.impresoras], salud: [e, st.ok, st.url, st.puente && st.puente.dispositivo, (window.__shampuPuente || {}).estado, (window.__shampuPuente || {}).mirando], mando: [e.lamp, e.vol, e.brillo, e.camTam, st.cam && st.cam.ancho], tele: [],
      timelapse: [st.tl && (st.tl.grabando ? [st.tl.grabando.id, st.tl.grabando.fotos, st.tl.grabando.fallos] : 0), st.tl && (st.tl.lista || []).map(x => [x.id, x.fotos, x.estado, x.video, x.videoKB]), st.tlCada, st.tlDura, st.tlVideo, st.haciendo && st.haciendo.id], pantalla: [st.pantallaSrc, st.pantallaEspera, st.msgColor] }[st.tab];
    const firma = st.tab + '|' + st.modo + '|' + st.ok + '|' + JSON.stringify(que);
    if (!forzar && firma === firmaPanel) return; firmaPanel = firma;
    const f = { cuidador: panelCuidador, fotos: panelFotos, impresoras: panelImpresoras, mando: panelMando, pantalla: panelPantalla, tele: panelTele, salud: panelSalud, llave: panelLlave, timelapse: panelTimelapse }[st.tab] || panelCuidador;
    mount(panel, f());
  }

  function panelCuidador() {
    const e = st.estado || {}, fotos = C.ordenarFotos(st.fotos).filter(x => x.tipo === 'vigilancia'), hoy = fotos.filter(x => C.diaDe(x.fecha) === 'Hoy').length;
    return h('div.sh-card',
      h('div.sh-cui-est' + (e.vigila ? '.on' : ''),
        h('div.sh-cui-ico', e.vigila ? '🔴' : '🛡️'),
        h('div', h('div.sh-cui-t', e.vigila ? 'Vigilando la casa' : 'El cuidador está apagado'),
          h('div.sh-cui-s', e.vigila ? (e.fotosVig || 0) + ' fotos de movimiento en esta vigilancia' : 'Patrulla solo (cuerpo y cabeza cada 25 s), hace foto si algo se mueve y una de ronda cada 5 min.'))),
      h('div.sh-rej2',
        boton('🔴 Empezar a vigilar', () => mandar({ o: 1 }), { cls: 'sh-b-grande sh-b-rojo' + (e.vigila ? ' sh-b-elegido' : '') }),
        boton('⏹ Parar', () => mandar({ o: 2 }), { cls: 'sh-b-grande' + (!e.vigila ? ' sh-b-elegido' : '') })),
      h('p.sh-nota', '🔌 Para patrullar, los motores necesitan el cargador puesto. ' + (hoy ? 'Hoy lleva ' + hoy + (hoy === 1 ? ' foto' : ' fotos') + ' de movimiento.' : '')),
      fotos.length ? h('div', h('div.sh-sec', 'Las últimas de vigilancia'), rejillaFotos(fotos.slice(0, 6)),
        boton('Ver todas las fotos →', () => { st.tab = 'fotos'; st.filtro = 'vigilancia'; lsSet('cd.shampu.tab', 'fotos'); pintarTabs(); pintarPanel(true); }, { cls: 'sh-b-claro' })) : null);
  }

  function panelFotos() {
    const todas = C.ordenarFotos(st.fotos), cuenta = t => todas.filter(x => t === 'todas' || x.tipo === t).length;
    const chips = h('div.sh-chips2', ...[['todas', 'Todas'], ['vigilancia', '🔴 Vigilancia'], ['ronda', '🔁 Rondas'], ['foto', '📸 Fotos']].map(([k, t]) =>
      h('button.sh-chip' + (st.filtro === k ? '.on' : ''), { type: 'button', onclick: () => { st.filtro = k; pintarPanel(true); } }, t, h('small', ' ' + cuenta(k)))));
    const l = todas.filter(x => st.filtro === 'todas' || x.tipo === st.filtro);
    if (!st.fotos) return h('div.sh-card', chips, h('p.sh-vacio', 'Cargando las fotos de Shampú…'));
    if (!l.length) return h('div.sh-card', chips, h('p.sh-vacio', 'No hay fotos de este tipo.'));
    const grupos = []; l.forEach(x => { const d = C.diaDe(x.fecha); let g = grupos.find(y => y.d === d); if (!g) grupos.push(g = { d, l: [] }); g.l.push(x); });
    return h('div.sh-card', chips,
      st.modo === 'calle' ? h('p.sh-nota', '📡 Desde la calle, toca «Ver» y la foto llega de casa en unos segundos.') : null,
      ...grupos.map(g => h('div', h('div.sh-sec', g.d, h('small', ' · ' + g.l.length + (g.l.length === 1 ? ' foto' : ' fotos'))), rejillaFotos(g.l))));
  }
  function rejillaFotos(l) {
    const g = C.gradosDe(st.estado && st.estado.giro);
    return h('div.sh-fotos', ...l.map(x => {
      const src = st.modo === 'casa' ? Sh.fUrl(x.n) : st.fotosCalle[x.n];
      const marca = h('span.sh-f-marca.sh-f-' + x.tipo, x.tipo === 'vigilancia' ? '🔴' : x.tipo === 'ronda' ? '🔁' : '📸', ' ', C.horaDe(x.fecha));
      if (src) return h('button.sh-f', { type: 'button', title: x.n, dataset: { n: x.n }, onclick: () => verFoto(x, src) }, h('img', { src, alt: '', loading: 'lazy', style: { transform: 'rotate(' + g + 'deg) scale(' + (g % 180 ? 1.34 : 1) + ')' } }), marca);
      const pedida = st.pedidas.has(x.n);
      return h('button.sh-f.sh-f-sin', { type: 'button', dataset: { n: x.n }, onclick: () => pedirFoto(x.n) }, h('span.sh-f-ver', pedida ? '⏳ Llegando…' : '👁 Ver'), marca);
    }));
  }
  async function pedirFoto(n) {
    if (st.pedidas.has(n)) return;
    if ([...st.pedidas].filter(x => !st.fotosCalle[x]).length >= 4) { toast('Espera a que lleguen las que ya has pedido.', 'warn'); return; }
    st.pedidas.add(n); pintarPanel(true);
    try { const r = await api('shampu.orden', { foto: n }, { quiet: true, timeout: 20000 }); st.ordenes.set(r.id, { o: { foto: n }, t: Date.now(), callado: true }); }
    catch (e) { st.pedidas.delete(n); pintarPanel(true); toast(e.message, 'bad'); }
  }
  function verFoto(x, src) {
    const g = C.gradosDe(st.estado && st.estado.giro), img = h('img.sh-grande', { src, alt: '', style: { transform: 'rotate(' + g + 'deg)' } });
    modal((x.tipo === 'vigilancia' ? '🔴 Vigilancia' : x.tipo === 'ronda' ? '🔁 Ronda' : '📸 Foto') + ' · ' + C.diaDe(x.fecha) + ' ' + C.horaDe(x.fecha),
      h('div.sh-grande-box' + (g % 180 ? '.sh-vertical' : ''), img),
      close => [btn('Cerrar', close), btn('⤓ Guardar', () => descargarImagen(img, g, x.n), { cls: 'primary' })]);
  }

  function panelImpresoras() {
    const l = st.impresoras;
    if (!l) return h('div.sh-card', h('p.sh-vacio', 'Preguntando a Shampú por las impresoras…'));
    if (!l.length) return h('div.sh-card', h('p.sh-vacio', 'Aún no hay datos: el cerebro de Shampú (en el portátil) tiene que estar abierto con los códigos de las impresoras.'));
    return h('div.sh-imps', ...l.map(m => {
      const [t, nivel] = C.IMP_ESTADO[m.e] || ['Sin datos', 'muted'], va = m.e === 'RUNNING' || m.e === 'PAUSE';
      return h('div.sh-card.sh-imp',
        h('div.sh-imp-cab', h('b', '🖨️ ' + (m.n || 'Impresora')), h('span.sh-pill.sh-' + nivel, t)),
        va ? h('div.sh-barra', h('i', { style: { width: Math.max(0, Math.min(100, m.p || 0)) + '%' } })) : null,
        va ? h('div.sh-imp-num', h('b', (m.p || 0) + ' %'), m.r ? ' · faltan ' + C.minutosEnPalabras(m.r) : '') : null,
        m.z ? h('div.sh-imp-z', m.z) : null);
    }), h('p.sh-nota', 'Lo da el cerebro de Shampú, en el portátil. Sin códigos, números de serie ni direcciones.'));
  }

  function panelMando() {
    const e = st.estado || {};
    const voz = h('input.sh-inp', { type: 'text', maxlength: 110, placeholder: '¡Hola! La cena está lista…', value: st.voz, oninput: ev => { st.voz = ev.target.value; } });
    return h('div.sh-card',
      bloqueCalidad(),
      h('div.sh-sec', 'Mover la cabeza'),
      h('div.sh-rej3', ...C.MOVER.map(m => boton(m.e + ' ' + m.t, () => mandar({ o: m.o })))),
      h('div.sh-sec', 'Girar el cuerpo'),
      h('div.sh-rej2', ...C.CUERPO.map(m => boton(m.e + ' ' + m.t, () => mandar({ o: m.o })))),
      h('div.sh-sec', 'Trucos'),
      h('div.sh-rej3', ...C.TRUCOS.map(m => boton(m.e + ' ' + m.t, () => mandar({ o: m.o }), { cls: 'sh-b-amarillo' }))),
      h('div.sh-rej2', boton('😴 A dormir', () => mandar({ o: 16 })), boton('☀️ Despertar', () => mandar({ o: 17 }))),
      h('div.sh-sec', 'Lámpara (el aro del pecho)'),
      h('div.sh-lamp', ...C.LAMPARA.map(l => boton(h('span', h('i', { style: { background: l.c } }), l.t), () => mandar({ lamp: l.lamp }), { cls: 'sh-b-lamp' + (e.lamp === l.lamp ? ' sh-b-elegido' : ''), title: 'Lámpara ' + l.t }))),
      h('div.sh-sec', 'Volumen'),
      h('div.sh-rej4', ...C.VOLUMEN.map(v => boton(v.t, () => mandar({ vol: v.vol }), { cls: e.vol === v.vol ? 'sh-b-elegido' : '' }))),
      h('div.sh-sec', 'Brillo de su pantalla'),
      h('div.sh-rej4', ...C.BRILLO.map(b => boton(b.t, () => mandar({ brillo: b.brillo }), { cls: e.brillo === b.brillo ? 'sh-b-elegido' : '' }))),
      h('div.sh-sec', 'Que lo diga en voz alta'),
      h('p.sh-nota', 'Escribe lo que quieras y Shampú lo dice con su voz (lo lee su cerebro, en el portátil). Hasta 110 letras.'),
      h('div.sh-di', voz, boton('🗣️ Que lo diga', async () => { const t = (st.voz || '').trim(); if (!t) { toast('Escribe lo que quieres que diga.', 'warn'); return; } await mandar({ di: t }); }, { cls: 'sh-b-amarillo' })),
      h('div.sh-sec', 'Sus frases'),
      h('div.sh-frases', ...C.FRASES.map(f => boton('💬 ' + f.t, () => mandar({ o: f.o }), { cls: 'sh-b-frase' }))));
  }
  // 🎥 Resolución y calidad: la pone el firmware de Shampú. Si ya lo entiende (su /estado trae camTam), se elige aquí; si no, se dice cómo va.
  function bloqueCalidad() {
    if (st.modo !== 'casa') return null;
    const e = st.estado || {}, c = st.cam || {};
    const ahora = (c.ancho ? c.ancho + '×' + c.alto : '640×480') + (c.fps ? ', unas ' + Math.round(c.fps) + ' imágenes por segundo' : '');
    if (!e.camTam) return h('div.sh-calidad', h('div.sh-sec', '📷 Calidad de la cámara'),
      h('p.sh-nota', 'Ahora: ' + ahora + '. Para verla en HD o Full HD, Shampú necesita una actualización de su programa (ya está pedida). Cuando la tenga, la eliges aquí.'));
    return h('div.sh-calidad', h('div.sh-sec', '📷 Calidad de la cámara'),
      h('p.sh-nota', 'Ahora: ' + ahora + '. Con más resolución se ve más detalle, pero llegan menos imágenes por segundo.'),
      h('div.sh-rej4', ...C.CALIDADES.map(q => boton(h('span', h('b', q.t), h('small', q.d)), () => mandar({ cam: q.cam, cal: q.cal }), { cls: 'sh-b-cal' + (e.camTam === q.cam ? ' sh-b-elegido' : '') }))));
  }

  // ---------- ⏱️ TIME-LAPSE (17-11 tarde): lo graba el programa del PC de casa (sigue aunque se cierre esta pantalla); aquí se elige,
  //   se ve cómo va y se hace el MP4 para redes (video_mp4.js: H.264, lado largo 1440) que se guarda junto a sus fotos.
  async function leerTL() { if (st.modo !== 'casa' || !Sh || !Sh.tl) return; const x = await Sh.tl().catch(() => null); if (x && x.ok) { st.tl = x; pintarCabecera(); if (st.tab === 'timelapse') pintarPanel(); } }
  function tickTL() { panel.querySelectorAll('[data-desde]').forEach(el => { el.textContent = C.duracionEnPalabras((Date.now() - new Date(el.dataset.desde)) / 1000); }); panel.querySelectorAll('[data-hasta]').forEach(el => { el.textContent = 'Faltan ' + C.duracionEnPalabras((new Date(el.dataset.hasta) - Date.now()) / 1000); }); }
  function panelTimelapse() {
    if (st.modo !== 'casa') return h('div.sh-card', h('div.sh-sec', '⏱️ Time-lapse'), h('p.sh-vacio', 'El time-lapse lo graba el ordenador de casa (la torre o el portátil) con CelebriDiseños abierto. Ábrelo allí: 🤖 Shampú › ⏱️ Time-lapse.'));
    if (!st.tl) { leerTL(); return h('div.sh-card', h('p.sh-vacio', 'Mirando tus time-lapses…')); }
    return h('div.sh-tl', st.tl.grabando ? tarjetaGrabando(st.tl.grabando) : tarjetaEmpezar(), listaTL());
  }
  function chipsTL(lista, clave, ls, actual) {
    return h('div.sh-chips2', ...lista.map(x => h('button.sh-chip' + (actual === x[clave] ? '.on' : ''), { type: 'button', onclick: () => { st[ls] = x[clave]; lsSet('cd.shampu.' + ls.toLowerCase(), String(x[clave])); pintarPanel(true); } }, x.t, x.d ? h('small', ' · ' + x.d) : null)));
  }
  function tarjetaEmpezar() {
    const n = C.fotosPrevistas(st.tlCada, st.tlDura), porHora = Math.round(3600 / st.tlCada);
    const resumen = n ? 'Saldrán unas ' + n.toLocaleString('es-ES') + ' fotos: con todas, un vídeo de ' + C.duracionEnPalabras(n / 30) + ' a 30 imágenes por segundo.'
      : 'Graba hasta que lo pares (como mucho 24 horas). Cada hora son ' + porHora.toLocaleString('es-ES') + ' fotos: ' + C.duracionEnPalabras(porHora / 30) + ' de vídeo.';
    return h('div.sh-card.sh-tl-nuevo',
      h('div.sh-tl-cab', h('div.sh-tl-ico', '⏱️'), h('div', h('h3', 'Grabar un time-lapse'), h('p', 'Shampú hace una foto cada poco y al final sale un vídeo acelerado en MP4, listo para Instagram o TikTok.'))),
      h('div.sh-sec', 'Una foto cada'), chipsTL(C.TL_CADA, 's', 'tlCada', st.tlCada),
      h('div.sh-sec', 'Durante'), chipsTL(C.TL_DURA, 'm', 'tlDura', st.tlDura),
      h('p.sh-tl-res', '🎬 ' + resumen),
      boton('⏺ Empezar el time-lapse', empezarTL, { cls: 'sh-b-rojo sh-b-grande sh-b-ancho' }),
      h('p.sh-nota', '💡 Para grabar una impresión, gira a Shampú hacia la impresora (con las flechas de la cámara) y empieza. Puedes cerrar esta pantalla: sigue grabando mientras CelebriDiseños esté abierto en este ordenador.'));
  }
  function tarjetaGrabando(g) {
    const grados = C.gradosDe(g.giro), vert = grados % 180 !== 0, hasta = g.minutos ? new Date(new Date(g.desde).getTime() + g.minutos * 60000).toISOString() : '';
    const img = g.fotos ? h('img.sh-tl-ult', { src: Sh.tlFotoUrl(g.id, 'ultima') + '&f=' + g.fotos, alt: 'La última foto', style: { transform: 'translate(-50%,-50%) rotate(' + grados + 'deg)' } }) : h('div.sh-tl-ult-vacia', '📷 La primera foto llega enseguida…');
    const lleva = (Date.now() - new Date(g.desde)) / 1000;
    return h('div.sh-card.sh-tl-rec',
      h('div.sh-tl-cab', h('span.sh-tl-punto'), h('div', h('h3', 'Grabando el time-lapse'), h('p', 'Una foto cada ' + C.segEnPalabras(g.cada) + (g.minutos ? ' durante ' + C.duracionEnPalabras(g.minutos * 60) : ', hasta que lo pares') + '.'))),
      h('div.sh-tl-cuerpo',
        h('div.sh-tl-ultbox' + (vert ? '.sh-vertical' : ''), img),
        h('div.sh-tl-datos',
          tarjeta('Fotos', g.fotos.toLocaleString('es-ES'), null, g.fallos ? g.fallos + ' veces Shampú no contestó' : ''),
          h('div.sh-tar', h('span', 'Lleva'), h('b', { dataset: { desde: g.desde } }, C.duracionEnPalabras(lleva)), hasta ? h('small', { dataset: { hasta } }, 'Faltan ' + C.duracionEnPalabras((new Date(hasta) - Date.now()) / 1000)) : null),
          tarjeta('Vídeo', C.duracionEnPalabras(g.fotos / 30), null, 'con todas, a 30 imágenes por segundo'))),
      g.minutos ? h('div.sh-tl-barra', h('i', { style: { width: Math.min(100, lleva / (g.minutos * 60) * 100).toFixed(1) + '%' } })) : null,
      boton('⏹ Parar y guardar', pararTL, { cls: 'sh-b-grande sh-b-ancho' }));
  }
  function listaTL() {
    const g = st.tl.grabando, l = (st.tl.lista || []).filter(x => !g || x.id !== g.id);
    return h('div.sh-card',
      h('div.sh-sec', 'Tus time-lapses', h('small', ' · se guardan en Vídeos › Shampú time-lapse')),
      l.length ? h('div.sh-tl-lista', ...l.map(itemTL)) : h('p.sh-vacio', 'Todavía no has grabado ninguno.'),
      boton('📂 Abrir la carpeta', () => Sh.tlAccion({ accion: 'abrir' }).catch(e => toast(e.message, 'bad')), { cls: 'sh-b-claro' }));
  }
  function itemTL(x) {
    const grados = C.gradosDe(x.giro), haciendo = st.haciendo && st.haciendo.id === x.id;
    const estado = { terminado: 'terminado', parado: 'parado por ti', cortado: 'se cerró el programa a medias' }[x.estado] || x.estado;
    const mini = x.fotos ? h('img', { src: Sh.tlFotoUrl(x.id, Math.max(1, Math.round(x.fotos / 2))), loading: 'lazy', alt: '', style: { transform: 'rotate(' + grados + 'deg)' } }) : h('span', '📷');
    const sel = h('select.sh-sel', { title: 'Cuánto dura el vídeo', onchange: ev => { st.tlVideo = Number(ev.target.value); lsSet('cd.shampu.tlvideo', String(st.tlVideo)); } },
      ...C.TL_VIDEO.map(v => h('option', { value: String(v.s), selected: st.tlVideo === v.s }, v.t)));
    return h('div.sh-tl-item',
      h('div.sh-tl-mini', mini),
      h('div.sh-tl-info',
        h('b', C.fechaTL(x.id)),
        h('small', x.fotos.toLocaleString('es-ES') + (x.fotos === 1 ? ' foto' : ' fotos') + ' · una cada ' + C.segEnPalabras(x.cada) + ' · ' + estado),
        x.motivo ? h('small.sh-tl-motivo', x.motivo) : null,
        x.video && !haciendo ? h('video.sh-tl-video', { src: Sh.tlVideoUrl(x.id) + '&v=' + x.videoKB, controls: true, preload: 'metadata', playsInline: true }) : null,
        haciendo ? h('div.sh-tl-prog', h('i', { style: { width: (st.haciendo.pct || 0) + '%' } }), h('span', 'Haciendo el vídeo… ' + (st.haciendo.pct || 0) + ' %')) : null,
        h('div.sh-tl-acc',
          x.fotos >= 2 && !haciendo ? sel : null,
          x.fotos >= 2 && !haciendo ? boton(x.video ? '🔁 Rehacer el vídeo' : '🎬 Hacer el vídeo', () => hacerVideo(x), { cls: 'sh-b-amarillo' }) : null,
          x.fotos < 2 ? h('small', 'Hacen falta 2 fotos o más para el vídeo.') : null,
          x.video && !haciendo ? h('a.sh-b.sh-b-claro', { href: Sh.tlVideoUrl(x.id), download: x.video }, '⬇️ Descargar') : null,
          boton('📂', () => Sh.tlAccion({ accion: 'abrir', id: x.id }).catch(e => toast(e.message, 'bad')), { title: 'Abrir su carpeta', cls: 'sh-b-redondo' }),
          !haciendo ? boton('🗑️', () => borrarTL(x), { title: 'Borrar este time-lapse', cls: 'sh-b-redondo' }) : null)));
  }
  async function empezarTL() {
    try {
      const r = await Sh.tlAccion({ accion: 'empezar', cada: st.tlCada, minutos: st.tlDura, giro: (st.estado && st.estado.giro) || 0 });
      st.tl = Object.assign({}, st.tl, { grabando: r.grabando }); toast('⏺ Time-lapse en marcha', 'ok', 2500); pintarCabecera(); pintarPanel(true); setTimeout(leerTL, 1500);
    } catch (e) { toast(e.message || String(e), 'bad'); }
  }
  async function pararTL() {
    try { const r = await Sh.tlAccion({ accion: 'parar' }); st.tl = Object.assign({}, st.tl, { grabando: null, lista: r.lista }); toast('⏹ Time-lapse guardado. Ya puedes hacer su vídeo.', 'ok', 3500); pintarCabecera(); pintarPanel(true); }
    catch (e) { toast(e.message || String(e), 'bad'); }
  }
  async function borrarTL(x) {
    if (!(await confirmDlg('¿Borrar este time-lapse?', 'Se borran sus ' + x.fotos + ' fotos' + (x.video ? ' y su vídeo' : '') + ' de la carpeta Vídeos › Shampú time-lapse. No se puede deshacer.', 'Borrarlo', true))) return;
    try { const r = await Sh.tlAccion({ accion: 'borrar', id: x.id }); st.tl = Object.assign({}, st.tl, { lista: r.lista }); toast('🗑️ Borrado', 'ok', 1800); pintarPanel(true); }
    catch (e) { toast(e.message || String(e), 'bad'); }
  }
  function pintarProgreso() { const el = panel.querySelector('.sh-tl-prog'); if (el && st.haciendo) { el.firstChild.style.width = st.haciendo.pct + '%'; el.lastChild.textContent = 'Haciendo el vídeo… ' + st.haciendo.pct + ' %'; } }
  // El MP4: cada fotograma se pinta derecho (con el giro de la cámara) en un lienzo de lado largo 1440 y se codifica en H.264.
  async function hacerVideo(x) {
    if (st.haciendo) { toast('Espera a que termine el vídeo que se está haciendo.', 'warn'); return; }
    const plan = C.planVideo(x.fotos, st.tlVideo); if (!plan) return;
    let V; try { V = await import('../video_mp4.js'); } catch (e) { toast('No se ha podido cargar lo que hace los vídeos. Cierra y abre CelebriDiseños.', 'bad'); return; }
    st.haciendo = { id: x.id, pct: 0 }; pintarPanel(true);
    const cargar = async n => { const r = await fetch(Sh.tlFotoUrl(x.id, n)); if (!r.ok) throw new Error('Falta la foto ' + n + ' del time-lapse.'); return createImageBitmap(await r.blob()); };
    const indice = f => Math.min(x.fotos, 1 + Math.floor(f * plan.paso));
    try {
      const prim = await cargar(1), grados = C.gradosDe(x.giro), rot = grados % 180 !== 0;
      const sw = rot ? prim.height : prim.width, sh = rot ? prim.width : prim.height, k = 1440 / Math.max(sw, sh);
      if (prim.close) prim.close();
      const lienzo = document.createElement('canvas'); lienzo.width = Math.round(sw * k / 2) * 2; lienzo.height = Math.round(sh * k / 2) * 2;
      const cx = lienzo.getContext('2d'); cx.imageSmoothingQuality = 'high';
      const cola = new Map(), pide = f => { if (f < plan.m && !cola.has(f)) { const pr = cargar(indice(f)); pr.catch(() => { }); cola.set(f, pr); } };
      let ultimo = -1;
      const blob = await V.mp4DeLienzo(lienzo, plan.m, plan.fps, async f => {
        for (let i = 0; i <= 6; i++) pide(f + i); // (las siguientes ya van llegando mientras se pinta esta)
        const bm = await cola.get(f); cola.delete(f);
        const w = rot ? lienzo.height : lienzo.width, hh = rot ? lienzo.width : lienzo.height;
        cx.save(); cx.fillStyle = '#000'; cx.fillRect(0, 0, lienzo.width, lienzo.height); cx.translate(lienzo.width / 2, lienzo.height / 2); cx.rotate(grados * Math.PI / 180);
        cx.drawImage(bm, -w / 2, -hh / 2, w, hh); cx.restore(); if (bm.close) bm.close();
        const pct = Math.floor((f + 1) / plan.m * 100); if (pct !== ultimo) { ultimo = pct; st.haciendo.pct = pct; pintarProgreso(); }
        if (f % 20 === 0) await new Promise(r => setTimeout(r, 0));
      }, 10e6);
      if (!blob) throw new Error('Este ordenador no sabe hacer vídeos MP4 (a su navegador le falta el codificador H.264). Prueba en la torre.');
      await Sh.tlGuardarVideo(x.id, blob);
      toast('🎬 Vídeo hecho (' + C.duracionEnPalabras(plan.dur) + '). Está en Vídeos › Shampú time-lapse.', 'ok', 5000);
    } catch (e) { toast(e.message || String(e), 'bad'); }
    finally { st.haciendo = null; await leerTL(); pintarPanel(true); }
  }

  function panelPantalla() {
    const txt = h('input.sh-inp', { type: 'text', maxlength: 90, placeholder: 'Escribe un mensaje para su pantalla…', value: st.msg, oninput: ev => { st.msg = ev.target.value; } });
    const ver = st.pantallaSrc ? h('img.sh-pantalla-img', { src: st.pantallaSrc, alt: 'Lo que enseña su pantalla', onerror: () => { st.pantallaSrc = null; toast('Shampú no ha dado su pantalla. Prueba otra vez.', 'warn'); pintarPanel(true); } })
      : h('div.sh-pantalla-vacia', st.pantallaEspera ? '⏳ Llegando de casa… (unos segundos)' : '🖥️ Elige qué quieres ver');
    return h('div.sh-card',
      h('div.sh-sec', 'Mensaje en su pantalla'),
      h('p.sh-nota', 'Sale en grande en su pantalla 10 minutos o hasta que alguien lo toque. Sin tildes: su pantalla no las tiene (se quitan solas).'),
      txt,
      h('div.sh-chips2', ...C.MENSAJES_RAPIDOS.map(m => h('button.sh-chip', { type: 'button', onclick: () => { st.msg = m; pintarPanel(true); } }, m))),
      h('div.sh-colores', ...C.COLORES_AVISO.map(c => h('button.sh-color' + (st.msgColor === c.c ? '.on' : ''), { type: 'button', title: c.t, style: { background: c.col }, onclick: () => { st.msgColor = c.c; pintarPanel(true); } }, c.t))),
      boton('📣 Enviar a su pantalla', async () => { const t = (st.msg || '').trim(); if (!t) { toast('Escribe el mensaje.', 'warn'); return; } await mandar({ alerta: t, c: st.msgColor }); }, { cls: 'sh-b-amarillo sh-b-grande sh-b-ancho' }),
      h('div.sh-sec', 'Ver su pantalla'),
      h('p.sh-nota', 'Al elegir una, Shampú la pone y te enseña cómo se ve. «Como está ahora» no le cambia nada.'),
      h('div.sh-rej4', ...C.PANTALLAS.map(x => boton(x.e + ' ' + x.t, () => verPantalla(x.m)))),
      h('div.sh-rej3', ...C.RELOJES.map(x => boton('🕒 ' + x.t, () => verPantalla(2, x.e), { title: 'Reloj de ' + x.t.toLowerCase() }))),
      h('div.sh-pantalla', ver));
  }
  async function verPantalla(m, e) {
    if (st.modo === 'casa') { st.pantallaSrc = Sh.pantallaUrl(m, e); st.pantallaEspera = false; pintarPanel(true); return; }
    try {
      const r = await api('shampu.orden', { pantalla: m, e }, { quiet: true, timeout: 20000 }), n = 'pantalla_' + r.id + '.jpg';
      st.ordenes.set(r.id, { o: { pantalla: m }, t: Date.now(), callado: true });
      st.pedidas.add(n); st.pantallaNombre = n; st.pantallaSrc = null; st.pantallaEspera = true; pintarPanel(true); setTimeout(leerCalle, 900);
    } catch (er) { toast(er.message || String(er), 'bad'); }
  }
  function panelTele() {
    return h('div.sh-card',
      h('div.sh-mando', ...C.TELE.map(t => boton(t.e, () => mandar({ pc: t.pc }), { title: t.t, cls: 'sh-b-tecla' + (t.cls ? ' sh-b-' + t.cls : '') }))),
      h('div.sh-rej3', ...C.APPS_TELE.map(a => boton(a.t, () => mandar({ pc: a.pc }), { style: { background: a.c, color: a.pc === 'spotify' ? '#111' : '#fff' }, cls: 'sh-b-app' }))),
      h('p.sh-nota', '📺 La tele la maneja el cerebro de Shampú en el portátil: tiene que estar abierto.'));
  }
  function panelSalud() {
    const e = st.estado || {}, v = C.voltios(e.mv5), P = window.__shampuPuente;
    return h('div.sh-card',
      h('div.sh-salud',
        tarjeta('Estado', C.estadoEnPalabras(st.ok === false ? null : st.estado).e + ' ' + C.estadoEnPalabras(st.ok === false ? null : st.estado).t),
        tarjeta('Wifi', h('span', rayas(e.wifi), ' ', e.wifi !== undefined ? e.wifi + ' dBm' : '—'), C.rayasWifi(e.wifi) >= 3 ? 'ok' : C.rayasWifi(e.wifi) >= 2 ? 'warn' : 'bad'),
        tarjeta('Corriente', v.t, v.nivel, v.v === null ? 'El robot no la está midiendo ahora' : 'Bien entre 4,75 y 5,3 V'),
        tarjeta('Motores', e.servos || '—', e.servos === 'activos' ? 'ok' : 'muted'),
        tarjeta('Fotos guardadas', e.fotos !== undefined ? String(e.fotos) : '—', null, e.libreKB !== undefined ? (e.libreKB / 1024).toFixed(1).replace('.', ',') + ' MB libres' : ''),
        tarjeta('Cerebro (portátil)', e.cerebro ? '🧠 conectado' : 'sin conectar', e.cerebro ? 'ok' : 'warn'),
        tarjeta('Hora del robot', e.hora || '—', null, e.alarma ? '⏰ Alarma a las ' + e.alarma : 'Sin alarma'),
        tarjeta('Encendido', C.encendidoEnPalabras(e.encendidoS), null, 'Desde que arrancó por última vez'),
        tarjeta('En su pantalla', C.nombrePantalla(e.modo), null, e.brillo !== undefined ? 'Brillo ' + (['mínimo', 'bajo', 'medio', 'máximo'][e.brillo] || e.brillo) : ''),
        e.tempoS ? tarjeta('Temporizador', C.minutosEnPalabras(Math.ceil(e.tempoS / 60)), 'warn', 'Lo que le queda') : null,
        tarjeta('Memoria libre', e.heapKB !== undefined ? e.heapKB + ' KB' : '—', e.heapKB === undefined ? null : e.heapKB > 60 ? 'ok' : e.heapKB > 30 ? 'warn' : 'bad'),
        st.modo === 'casa' ? tarjeta('Su dirección', st.url.replace('http://', '') || '—') : tarjeta('A través de', st.puente ? st.puente.dispositivo : 'ningún PC de casa', st.puente ? 'ok' : 'warn')),
      st.modo === 'casa' && P ? h('p.sh-nota', '📡 Para verlo desde la calle, este ordenador hace de puente: ' + (P.estado === 'puente' ? (P.mirando ? 'alguien lo está mirando ahora.' : 'listo.') : P.estado) + (P.error ? ' (' + P.error + ')' : '')) : null,
      st.modo === 'casa' ? boton('↗ Abrir la app de Shampú', () => abrirSuApp(), { cls: 'sh-b-claro' }) : null);
  }
  // 17-11 · 🔑 la llave con la que el cerebro de Shampú (en el portátil) LEE CelebriDiseños (shampu.llave / shampu.leer en el servidor)
  function panelLlave() {
    const caja = h('div.sh-card.sh-llave');
    const fecha = iso => { try { return new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso || ''; } };
    const pedir = async (accion, extra) => {
      try { const r = await api('shampu.llave', Object.assign({ accion }, extra)); st.llave = { info: r.info, nueva: r.llave || '' }; }
      catch (e) {
        if (accion === 'mover') { toast('⏳ Para esto falta pegar el servidor 18.11.1 en Google (Apps Script). Los pasos, en el LEEME de la 60.19.0.', 'warn'); return; }
        st.llave = /Acción desconocida/.test(e.message || '') ? { viejo: true } : { error: e.message || String(e) };
      }
      if (caja.isConnected) pintar();
    };
    const crear = async (cambiar) => {
      if (cambiar && !(await confirmDlg('¿Cambiar la llave de Shampú?', 'La llave de ahora deja de valer en el momento. Tendrás que pegar la nueva en su cerebro, en el portátil.', 'Cambiarla'))) return;
      await pedir('crear');
    };
    const quitar = async () => {
      if (!(await confirmDlg('¿Quitar la llave de Shampú?', 'Shampú dejará de leer CelebriDiseños al momento. Puedes crear otra cuando quieras.', 'Quitarla', true))) return;
      await pedir('quitar'); toast('Llave quitada: Shampú ya no lee CelebriDiseños.');
    };
    function pintar() {
      const L = st.llave || {}, i = L.info || {};
      const cosas = [h('h3.sh-llave-tit', '🧠 Que Shampú lea CelebriDiseños'),
        h('p.sh-nota', 'Con esta llave, el cerebro de Shampú (en el portátil) puede LEER todo CelebriDiseños: pedidos, clientes, productos y costes, stock, impresoras y cola, filamento, compras, presupuestos, facturas, tienda web, tareas, redes, noticias y biblioteca. Solo cambia una cosa, y solo si lo enciendes abajo: el estado de un pedido.'),
        h('p.sh-nota', '🔒 Los teléfonos, emails, direcciones y NIF de los clientes le llegan tapados (•••). Nada de contraseñas ni de seguridad.')];
      if (!st.llave) cosas.push(h('p.sh-vacio', 'Mirando…'));
      else if (L.viejo) cosas.push(h('p.sh-llave-aviso', '⏳ Falta pegar el servidor 18.10.0 en Google (Apps Script). Los pasos están en el LEEME de la 60.17.0.'));
      else if (L.error) cosas.push(h('p.sh-llave-aviso', '⚠️ ' + L.error), boton('Reintentar', () => pedir('ver'), { cls: 'sh-b-claro' }));
      else if (L.nueva) cosas.push(h('div.sh-llave-nueva',
        h('b', '🔑 Esta es la llave. Solo se ve AHORA:'),
        h('code.sh-llave-code', L.nueva),
        h('div.sh-llave-bot', boton('📋 Copiar la llave', () => copyText(L.nueva), { cls: 'sh-b-amarillo' }), S.server ? boton('📋 Copiar la dirección del servidor', () => copyText(S.server), { cls: 'sh-b-claro' }) : null),
        h('p.sh-nota', 'Pega las dos cosas en el cerebro de Shampú, en el portátil (o pásaselas a quien lo programa allí). Cuando salgas de aquí, la llave ya no se vuelve a ver: si la pierdes, crea otra.'),
        boton('✅ Ya la he pegado', () => { L.nueva = ''; pintar(); }, { cls: 'sh-b-claro' })));
      else if (i.hay) cosas.push(h('div.sh-salud',
        tarjeta('Llave', '✅ puesta', 'ok', 'Termina en ···' + (i.termina || '')),
        tarjeta('Creada', fecha(i.creada), null, i.por ? 'por ' + i.por : ''),
        tarjeta('Última lectura', i.ultimoUso ? C.haceCuanto(Date.now() - new Date(i.ultimoUso).getTime()) : 'todavía no ha leído', i.ultimoUso ? 'ok' : 'warn', i.ultimoUso ? fecha(i.ultimoUso) : 'Pega la llave en su cerebro')),
        h('div.sh-llave-bot', boton('🔄 Cambiar la llave', () => crear(true), { cls: 'sh-b-claro' }), boton('🗑️ Quitar la llave', quitar, { cls: 'sh-b-rojo' })),
        // 18-11 · el interruptor: con él encendido, Shampú pasa pedidos HACIA DELANTE al leer el sello de la caja (shampu.fase)
        h('div.sh-mueve' + (i.mueve ? '.on' : ''),
          h('div', h('b', i.mueve ? '🟢 Shampú puede mover pedidos' : '⚪ Shampú NO mueve pedidos'),
            h('small', 'Lee el sello de la caja y la pasa a Imprimiendo, En mesa o Listo. Solo hacia delante: nunca a Enviado, ni hacia atrás, ni toca clientes ni precios.')),
          boton(i.mueve ? 'Apagar' : 'Encender', () => pedir('mover', { si: !i.mueve }).then(() => toast(i.mueve ? 'Shampú ya no mueve pedidos.' : '🟢 Shampú ya puede mover pedidos.')), { cls: i.mueve ? 'sh-b-claro' : 'sh-b-amarillo' })));
      else cosas.push(h('p.sh-nota', i.quitada ? 'La llave se quitó el ' + fecha(i.quitada) + '. Ahora Shampú no lee nada.' : 'Shampú todavía no tiene llave.'),
        boton('🔑 Crear la llave de Shampú', () => crear(false), { cls: 'sh-b-amarillo sh-b-grande' }));
      mount(caja, ...cosas);
    }
    pintar();
    if (!st.llave || !st.llave.nueva) pedir('ver'); // al abrir, al día (la última lectura); la llave recién creada no se pierde
    return caja;
  }
  const tarjeta = (k, v, nivel, nota) => h('div.sh-tar' + (nivel ? '.sh-tar-' + nivel : ''), h('span', k), h('b', v), nota ? h('small', nota) : null);

  // ---------- arranque ----------
  pintarTabs(); pintarRapidas(); pintarPanel(true);
  (async () => {
    if (Sh) {
      const e = await Sh.estado().catch(err => ({ ok: false, error: err.message }));
      if (e.ok) {
        st.modo = 'casa'; st.ok = true; st.estado = e.estado; st.url = e.url; st.tomado = Date.now();
        pintarTodo(); abrirCamCasa(); leerImpCasa(); leerListaCasa(); leerTL();
        const t1 = setInterval(() => { if (!vivo()) { cerrarCamCasa(); return clearInterval(t1); } if (!document.hidden) leerCasa(); }, 3000);
        let vueltaTL = 0; // el time-lapse: cada 2,5 s con su pestaña abierta (o grabando), si no cada 15 s
        const t5 = setInterval(() => { if (!vivo()) return clearInterval(t5); tickTL(); if (!document.hidden && (st.tab === 'timelapse' || (st.tl && st.tl.grabando) || vueltaTL++ % 6 === 0)) leerTL(); }, 2500);
        const t2 = setInterval(() => { if (!vivo()) return clearInterval(t2); if (!document.hidden) leerImpCasa(); }, 10000);
        const t3 = setInterval(() => { if (!vivo()) return clearInterval(t3); if (!document.hidden) leerListaCasa(); }, 20000);
        return;
      }
    }
    st.modo = 'calle'; pintarTodo();
    const otra = async () => { if (!vivo()) return; if (!document.hidden) await leerCalle(); setTimeout(otra, st.servidorViejo ? 30000 : 3000); };
    otra();
    const t4 = setInterval(() => { if (!vivo()) return clearInterval(t4); pintarCabecera(); }, 1000); // «hace X s» al día
  })();
}

// Guarda una imagen girada como la ve Biou
function descargarImagen(img, grados, nombre) {
  const r = grados % 180 !== 0, c = document.createElement('canvas'), w = img.naturalWidth, hh = img.naturalHeight;
  c.width = r ? hh : w; c.height = r ? w : hh;
  const x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate(grados * Math.PI / 180); x.drawImage(img, -w / 2, -hh / 2);
  c.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }, 'image/jpeg', 0.92);
}

function ponerCss() {
  if (document.getElementById('sh-css')) return;
  document.head.appendChild(h('style#sh-css', CSS));
}
const CSS = `
.sh [hidden]{display:none!important}
.sh{--sh-noche:#0a102c;--sh-azul:#1b2766;--sh-am:#ffcd00;max-width:1180px;margin:0 auto;padding-bottom:28px}
.sh-hero{display:grid;grid-template-columns:auto 1fr auto;grid-template-areas:"ava tit acc" "ava chips acc";align-items:center;gap:6px 16px;padding:18px 20px;border-radius:22px;
  background:radial-gradient(900px 260px at 90% -40%,rgba(255,205,0,.22),transparent 60%),linear-gradient(135deg,var(--sh-noche),var(--sh-azul));color:#fff;box-shadow:0 12px 32px rgba(10,16,44,.28);margin-bottom:14px}
.sh-ava{grid-area:ava;width:62px;height:62px;border-radius:18px;display:grid;place-items:center;font-size:36px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 2px rgba(255,205,0,.55)}
.sh-tit{grid-area:tit}.sh-tit h1{margin:0;font-size:26px;letter-spacing:.2px;color:var(--sh-am)}.sh-sub{font-size:13px;opacity:.82;margin-top:2px}
.sh-chips{grid-area:chips;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.sh-hero-acc{grid-area:acc}
.sh-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:700;background:rgba(255,255,255,.12);color:inherit}
.sh-pill.sh-ok{background:rgba(44,204,102,.18);color:#5ee08f}.sh-pill.sh-bad{background:rgba(238,51,51,.2);color:#ff7b7b}.sh-pill.sh-warn{background:rgba(255,180,0,.2);color:#ffc94d}
.sh-pill.sh-info{background:rgba(70,150,255,.18);color:#78b4ff}.sh-pill.sh-muted{background:rgba(150,160,190,.18);color:#aab3d0}
.sh-panel .sh-pill.sh-ok{color:var(--ok)}.sh-panel .sh-pill.sh-bad{color:var(--bad)}.sh-panel .sh-pill.sh-warn{color:var(--warn)}.sh-panel .sh-pill.sh-info{color:var(--info)}.sh-panel .sh-pill.sh-muted{color:var(--muted)}
.sh-vig{padding:5px 12px;border-radius:999px;background:#e33;color:#fff;font-size:12px;font-weight:800;letter-spacing:.6px;animation:shLatir 1.4s ease-in-out infinite}
.sh-edad{font-size:12px;opacity:.75}
@keyframes shLatir{50%{opacity:.55}}
.sh-aviso{padding:12px 16px;border-radius:14px;margin-bottom:14px;line-height:1.5;border:1px solid}
.sh-aviso-warn{background:var(--warn-soft);border-color:color-mix(in srgb,var(--warn) 45%,transparent)}.sh-aviso-bad{background:var(--bad-soft);border-color:color-mix(in srgb,var(--bad) 45%,transparent)}
.sh-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:14px;margin-bottom:14px}
.sh-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:var(--shadow)}
.sh-cam-card{padding:10px;background:#05081a;border-color:#1a2250}
.sh-cam{position:relative;width:100%;aspect-ratio:4/3;overflow:hidden;border-radius:12px;background:#000}
.sh-cam.sh-vertical{aspect-ratio:3/4;max-height:72vh;margin:0 auto}
.sh-cam-img{position:absolute;top:50%;left:50%;width:100%;transform:translate(-50%,-50%);transition:transform .25s}
.sh-cam.sh-vertical .sh-cam-img{width:133.34%}
.sh-cam:fullscreen{aspect-ratio:auto;border-radius:0}.sh-cam:fullscreen .sh-cam-img{width:auto;height:100%}.sh-cam.sh-vertical:fullscreen .sh-cam-img{height:auto;width:100vh}
.sh-cam-msg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;color:#aab3d0;font-size:14px}
.sh-live{position:absolute;top:10px;left:10px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.55);color:#cfd5f5;font-size:11px;font-weight:800;letter-spacing:.6px}
.sh-live:empty{display:none}.sh-live.sh-live-on{color:#ff6b6b}
.sh-cam-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;padding:10px 4px 2px}
.sh-sep{flex:1}
.sh-b{font:inherit;font-size:15px;font-weight:700;padding:11px 14px;border:0;border-radius:12px;background:var(--surface-2);color:var(--text);cursor:pointer;transition:transform .08s,filter .15s,box-shadow .15s;box-shadow:inset 0 0 0 1px var(--line)}
.sh-b:hover{filter:brightness(1.05)}.sh-b:active{transform:scale(.96)}.sh-b.sh-ocupado{opacity:.6;pointer-events:none}
.sh-cam-bar .sh-b{background:#141c48;color:#fff;box-shadow:none}
.sh-b-redondo{min-width:46px;border-radius:999px!important}
.sh-b-amarillo,.sh-cam-bar .sh-b-amarillo{background:var(--sh-am);color:#111}
.sh-b-rojo{background:#e33;color:#fff}.sh-b-claro{background:transparent;box-shadow:inset 0 0 0 1px currentColor;color:inherit}
.sh-hero .sh-b-claro{color:#fff}
.sh-b-grande{font-size:17px;padding:16px}.sh-b-elegido{box-shadow:0 0 0 3px var(--sh-am)}
.sh-lado{display:flex;flex-direction:column;gap:14px}
.sh-rapidas{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:var(--shadow)}
.sh-rap-tit,.sh-sec{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin:2px 0 10px}
.sh-sec{margin-top:16px}.sh-sec small{text-transform:none;letter-spacing:0;font-weight:600}
.sh-rap-rej{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sh-rap{display:block;text-align:left;padding:14px;min-height:84px;border-radius:16px;background:var(--surface-2)}
.sh-rap b{display:block;font-size:26px;margin-bottom:6px}
.sh-rap-vig{background:linear-gradient(135deg,#1b2766,#2c3f9a);color:#fff}.sh-rap-vig-on{background:linear-gradient(135deg,#c81e1e,#ee4444);color:#fff}
.sh-mini{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.sh-dato{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;border-radius:12px;background:var(--surface-2);font-size:13px}.sh-dato span{color:var(--muted)}
.sh-rayas{display:inline-flex;align-items:flex-end;gap:2px;height:16px}.sh-rayas i{width:4px;border-radius:2px;background:color-mix(in srgb,var(--muted) 40%,transparent)}.sh-rayas i.on{background:var(--ok)}
.sh-tabs{display:flex;gap:6px;overflow-x:auto;padding:4px;margin-bottom:12px;background:var(--surface);border:1px solid var(--line);border-radius:16px;position:sticky;top:calc(var(--topbar,56px) + 6px);z-index:3;scrollbar-width:none}
.sh-tabs::-webkit-scrollbar{display:none}
.sh-tab{flex:1 0 auto;font:inherit;font-size:14px;font-weight:700;padding:10px 14px;border:0;border-radius:12px;background:transparent;color:var(--muted);cursor:pointer;white-space:nowrap}
.sh-tab.on{background:linear-gradient(135deg,var(--sh-noche),var(--sh-azul));color:var(--sh-am)}
.sh-cui-est{display:flex;gap:14px;align-items:center;padding:14px;border-radius:14px;background:var(--surface-2);margin-bottom:12px}
.sh-cui-est.on{background:linear-gradient(135deg,rgba(238,51,51,.16),rgba(238,51,51,.05));box-shadow:inset 0 0 0 1px rgba(238,51,51,.35)}
.sh-cui-ico{font-size:34px}.sh-cui-t{font-size:18px;font-weight:800}.sh-cui-s{color:var(--muted);font-size:13px;margin-top:3px;line-height:1.45}
.sh-rej2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.sh-rej3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sh-rej4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.sh-nota{color:var(--muted);font-size:13px;line-height:1.5;margin:10px 0 4px}.sh-vacio{color:var(--muted);text-align:center;padding:26px 10px}
.sh-chips2{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px}
.sh-rec{padding:5px 12px;border-radius:999px;background:#e33;color:#fff;font-size:12px;font-weight:800;letter-spacing:.6px;animation:shLatir 1.4s ease-in-out infinite}
.sh-calidad{margin-bottom:6px}.sh-b-cal span{display:grid;gap:2px}.sh-b-cal small{font-size:11px;opacity:.75;font-weight:600}
.sh-tl{display:grid;gap:14px}
.sh-tl-cab{display:flex;gap:12px;align-items:center;margin-bottom:8px}.sh-tl-cab h3{margin:0;font-size:18px}.sh-tl-cab p{margin:2px 0 0;font-size:13px;color:var(--muted)}
.sh-tl-ico{flex:none;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:26px;background:linear-gradient(135deg,var(--sh-noche),var(--sh-azul))}
.sh-tl-punto{flex:none;width:16px;height:16px;border-radius:50%;background:#e33;box-shadow:0 0 0 6px rgba(238,51,51,.18);animation:shLatir 1.4s ease-in-out infinite;margin:0 6px}
.sh-tl-res{margin:12px 0;padding:10px 12px;border-radius:12px;background:var(--surface-2);font-size:14px;line-height:1.45}
.sh-tl-cuerpo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:center;margin:10px 0}
.sh-tl-ultbox{position:relative;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:#05081a}.sh-tl-ultbox.sh-vertical{aspect-ratio:3/4;max-height:360px;margin:0 auto;width:100%}
.sh-tl-ult{position:absolute;top:50%;left:50%;width:100%}.sh-tl-ultbox.sh-vertical .sh-tl-ult{width:133.34%}
.sh-tl-ult-vacia{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:14px;color:#aab3d0;font-size:13px}
.sh-tl-datos{display:grid;gap:8px}
.sh-tl-barra{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin:4px 0 12px}.sh-tl-barra i{display:block;height:100%;background:linear-gradient(90deg,#e33,#ff8c00)}
.sh-tl-lista{display:grid;gap:10px;margin-bottom:12px}
.sh-tl-item{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;padding:10px;border:1px solid var(--line);border-radius:14px}
.sh-tl-mini{position:relative;width:96px;height:96px;border-radius:12px;overflow:hidden;background:#05081a;display:grid;place-items:center;font-size:26px}.sh-tl-mini img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sh-tl-info{display:grid;gap:4px;min-width:0;align-content:start}.sh-tl-info small{color:var(--muted)}.sh-tl-info .sh-tl-motivo{color:var(--warn)}
.sh-tl-video{width:100%;max-height:440px;border-radius:12px;background:#000;margin-top:4px}
.sh-tl-acc{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:4px}.sh-tl-acc a.sh-b{text-decoration:none}
.sh-tl-prog{position:relative;height:32px;border-radius:10px;background:var(--line);overflow:hidden;margin-top:4px}.sh-tl-prog i{position:absolute;top:0;bottom:0;left:0;background:linear-gradient(90deg,var(--sh-azul),var(--sh-am));transition:width .2s}.sh-tl-prog span{position:relative;display:block;text-align:center;line-height:32px;font-size:13px;font-weight:800}
.sh-sel{padding:9px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;font-size:14px}
@media (max-width:700px){.sh-tl-cuerpo{grid-template-columns:1fr}.sh-tl-item{grid-template-columns:72px minmax(0,1fr)}.sh-tl-mini{width:72px;height:72px}}
.sh-chip{font:inherit;font-size:13px;font-weight:700;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface-2);color:var(--text);cursor:pointer}.sh-chip.on{background:var(--sh-noche);color:var(--sh-am);border-color:var(--sh-noche)}
.sh-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
.sh-f{position:relative;aspect-ratio:1;border:0;padding:0;border-radius:12px;overflow:hidden;background:#0b1030;cursor:pointer}
.sh-f img{width:100%;height:100%;object-fit:cover;display:block}
.sh-f-sin{display:grid;place-items:center;background:linear-gradient(135deg,#0b1030,#1b2766)}.sh-f-ver{color:#fff;font-weight:800;font-size:14px}
.sh-f-marca{position:absolute;left:6px;bottom:6px;padding:2px 7px;border-radius:999px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:700}
.sh-grande-box{display:grid;place-items:center;overflow:hidden;max-height:70vh}.sh-grande{max-width:100%;max-height:70vh;border-radius:10px}
.sh-grande-box.sh-vertical .sh-grande{max-width:70vh;max-height:none}
.sh-imps{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.sh-imp-cab{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:16px}
.sh-barra{height:12px;border-radius:6px;background:var(--surface-3);overflow:hidden;margin:12px 0 6px}.sh-barra i{display:block;height:100%;background:linear-gradient(90deg,#2c6,#6e6);border-radius:6px;transition:width .6s}
.sh-imp-num{font-size:14px}.sh-imp-z{color:var(--muted);font-size:12px;margin-top:6px;word-break:break-word}
.sh-lamp{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.sh-b-lamp span{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px}.sh-b-lamp i{width:30px;height:30px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(0,0,0,.15),0 0 14px rgba(255,255,255,.08)}
.sh-frases{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}.sh-b-frase{text-align:left;font-weight:600;font-size:14px}
.sh-mando{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:420px;margin:0 auto 14px}
.sh-b-tecla{font-size:20px;padding:16px 8px;background:#141c48;color:#fff;box-shadow:none}.sh-b-rojo.sh-b-tecla{background:#e33}.sh-b-ok.sh-b-tecla{background:#2c6;color:#fff}
.sh-b-app{box-shadow:none}
.sh-salud{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:6px}
.sh-tar{display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:14px;background:var(--surface-2);border-left:4px solid var(--line-2)}
.sh-tar span{font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px}.sh-tar b{font-size:17px}.sh-tar small{color:var(--muted);font-size:12px}
.sh-llave-tit{margin:2px 0 4px;font-size:18px}.sh-llave-nueva{margin-top:12px;padding:14px;border-radius:14px;border:2px dashed var(--sh-am);background:var(--surface-2);display:grid;gap:10px}
.sh-llave-code{display:block;font:600 15px/1.5 ui-monospace,Consolas,monospace;word-break:break-all;user-select:all;padding:10px;border-radius:10px;background:var(--surface);border:1px solid var(--line)}
.sh-mueve{margin-top:14px;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;background:var(--surface-2);border:2px solid var(--line)}.sh-mueve.on{border-color:#22c55e}.sh-mueve small{display:block;margin-top:4px;color:var(--muted)}
.sh-llave-bot{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.sh-llave-aviso{padding:10px 12px;border-radius:12px;background:var(--surface-2);border-left:4px solid var(--warn)}
.sh-tar-ok{border-left-color:var(--ok)}.sh-tar-warn{border-left-color:var(--warn)}.sh-tar-bad{border-left-color:var(--bad)}.sh-tar-muted{border-left-color:var(--line-2)}
.sh-pie{color:var(--muted);font-size:12px;text-align:center;margin-top:18px}
.sh-inp{width:100%;font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface-2);color:var(--text);margin:4px 0 10px}
.sh-di{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start}.sh-di .sh-inp{margin:0}.sh-di .sh-b{min-height:48px}
.sh-colores{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 12px}.sh-color{font:inherit;font-size:13px;font-weight:700;color:#fff;border:0;border-radius:999px;padding:8px 14px;cursor:pointer;opacity:.75}
.sh-color.on{opacity:1;box-shadow:0 0 0 3px var(--surface),0 0 0 5px var(--sh-am)}.sh-b-ancho{width:100%}
.sh-pantalla{margin-top:14px;display:grid;place-items:center;background:#05081a;border-radius:14px;padding:10px;min-height:120px}
.sh-pantalla-img{width:100%;max-width:480px;aspect-ratio:3/2;object-fit:contain;border-radius:8px}.sh-pantalla-vacia{color:#aab3d0;font-size:14px;padding:30px 10px;text-align:center}
.sh-solo{max-width:560px;margin:30px auto}
@media (max-width:900px){.sh-grid{grid-template-columns:1fr}.sh-hero{grid-template-columns:auto 1fr;grid-template-areas:"ava tit" "chips chips" "acc acc";padding:14px 16px;border-radius:18px}
  .sh-hero-acc .sh-b{width:100%}.sh-ava{width:52px;height:52px;font-size:30px}.sh-tit h1{font-size:22px}.sh-rej4{grid-template-columns:repeat(2,1fr)}.sh-lamp{grid-template-columns:repeat(4,1fr)}}
@media (max-width:420px){.sh-rej3{grid-template-columns:repeat(2,1fr)}.sh-fotos{grid-template-columns:repeat(3,1fr)}.sh-cam-bar{flex-wrap:nowrap;gap:6px}.sh-cam-bar .sh-b{padding:10px}.sh-b-redondo{min-width:40px}}
`;
