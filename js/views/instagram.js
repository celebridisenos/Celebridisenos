// ================= v15.3 · 📸 INSTAGRAM STUDIO VIP =================
// Todo Instagram en un sitio, con la API OFICIAL de Meta (sin contraseñas):
//   ✍️ Crear: post, carrusel, Reel o historia con VISTA PREVIA de móvil real, texto con IA, hashtags, ↶ Deshacer / ↷ Rehacer,
//            «🚀 Publicar ahora» o «🤖 Publicar sola» en su fecha y hora. Las fotos se preparan solas (JPG y medida de Instagram).
//   📅 Calendario: arrastra una publicación a otro día. ▦ Mi feed: cómo quedará tu perfil. 📊 Estadísticas: lo que funciona.
// Sin cuenta conectada también sirve: prepara todo y «📲 Publicar a mano» (copia el texto, baja las fotos y abre Instagram).
import { h, mount, btn, toast, sel, inp, area, copyText, modal, sw, fdate, ago, uid, num, DIAS, monthName, confirmDlg, avatar } from '../ui.js';
import { S, can, api, mutate, byId, upsertLocal, emit, kv } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { desktop } from '../desktop.js';
import { historial, teclasDeshacer } from '../biou/pro.js';
import * as IDEAS from '../ig_ideas.js'; // v16: biblioteca de ideas, formatos, hashtags y keywords

const CL = window.CL;
const TIPOS = { post: { i: '🖼️', t: 'Post' }, carrusel: { i: '🎠', t: 'Carrusel' }, reel: { i: '🎬', t: 'Reel' }, historia: { i: '⭕', t: 'Historia' } };
const RATIOS = { '4:5': 0.8, '1:1': 1, '1.91:1': 1.91 };
const TONOS = { cercano: 'cercano y alegre', divertido: 'divertido y con gracia', elegante: 'elegante y premium', oferta: 'de oferta, con urgencia y llamada a comprar' };
const EMOJIS = ['✨', '🔥', '💜', '🎁', '😍', '🛍️', '📦', '👉', '⭐', '🙌', '🎉', '🖤'];
const MAX_TEXTO = 2200, MAX_TAGS = 30;
const igRows = () => (S.t.redes || []).filter(r => r.red === 'Instagram');
const fotosProducto = id => (S.t.archivos || []).filter(a => a.entidad === 'productos' && a.entidadId === id && (a.tipo === 'foto' || /^image\//.test(a.mime || '')));
const esVideo = a => a && (a.tipo === 'video' || /^video\//.test(a.mime || ''));
const nTags = t => (String(t || '').match(/#[\p{L}\p{N}_]+/gu) || []).length;
const ESTADO = r => r.ig && r.ig.estado === 'publicado' || r.estado === 'Publicado' ? ['✅', 'Publicado', 'ok'] : r.ig && r.ig.estado === 'procesando' ? ['⏳', 'Subiendo', 'info'] : r.ig && r.ig.estado === 'error' ? ['⚠️', 'Error', 'bad'] : r.ig && r.ig.auto ? ['🤖', 'Programado', 'info'] : ['📝', 'Borrador', ''];

let cuentas = null, cuentaSel = (() => { try { return localStorage.getItem('cd.ig.cuenta') || ''; } catch (e) { return ''; } })();
const locales = new Map(); // archivos de este aparato (aún sin subir): clave → File
const urls = new Map(); // clave → objectURL para la vista previa

export function render(el, params) {
  let tab = (() => { try { return localStorage.getItem('cd.ig.tab') || 'crear'; } catch (e) { return 'crear'; } })();
  const cab = h('div.ig-cab'), tabs = h('div.seg.ig-tabs'), cuerpo = h('div.ig-cuerpo');
  el.append(cab, tabs, cuerpo);
  let estado = null, perfil = null, stats = null, resumen = null, st = null, tApunte = 0, publicando = false, quitaTeclas = () => { }, sondeo = 0, deshacerCal = [];
  const bDes = btn('↶ Deshacer', () => deshacer(), { cls: 'sm', title: 'Deshacer (Ctrl+Z)' }), bReh = btn('↷ Rehacer', () => rehacer(), { cls: 'sm', title: 'Rehacer (Ctrl+Y)' });
  bDes.setAttribute('aria-label', 'Deshacer'); bReh.setAttribute('aria-label', 'Rehacer'); bDes.disabled = bReh.disabled = true;
  const hist = historial(e => { bDes.disabled = !e.atras; bReh.disabled = !e.adelante; });
  const cuenta = () => (estado && estado.cuentas || []).find(c => c.id === cuentaSel) || (estado && estado.cuentas || [])[0] || null;

  // ---------- cabecera: la cuenta ----------
  function pintaCab() {
    const c = cuenta();
    mount(cab, h('div.ig-banner',
      h('div.ig-avatar', c && c.foto ? h('img', { src: c.foto, alt: '', referrerpolicy: 'no-referrer' }) : h('span', '📸')),
      h('div.grow',
        h('h1', 'Instagram Studio'),
        c ? h('div.ig-cuenta', h('b', '@' + c.usuario), ' · ' + num(c.seguidores) + ' seguidores · ' + num(c.publicaciones) + ' publicaciones', c.error ? h('div.ig-aviso', '⚠️ ' + c.error) : null)
          : h('div.ig-cuenta', estado ? 'Sin cuenta conectada: puedes preparar todo y publicarlo a mano.' : 'Cargando…')),
      h('div.ig-cab-acc',
        estado && estado.cuentas.length > 1 ? sel(estado.cuentas.map(x => ({ v: x.id, t: '@' + x.usuario })), c ? c.id : '', { 'aria-label': 'Cuenta de Instagram', onchange: e => { cuentaSel = e.target.value; try { localStorage.setItem('cd.ig.cuenta', cuentaSel); } catch (x) { } perfil = stats = resumen = coms = null; pintaCab(); pintaTab(); } }) : null,
        estado && estado.puedeConectar ? btn(c ? '⚙️ Cuentas' : '➕ Conectar Instagram', () => conectar(), { cls: c ? 'sm ghost ig-conectar' : 'primary ig-conectar' }) : null)));
  }
  async function cargarEstado() {
    try { estado = await api('ig.estado', {}, { quiet: true }); }
    catch (e) { estado = { configurado: false, cuentas: [], puedeConectar: can('redes.admin'), sinServidor: /desconocida|Acción|NOT_FOUND/i.test(e.message + e.code) }; }
    cuentas = estado.cuentas; pintaCab();
  }

  // ---------- conectar (asistente de 3 pasos) ----------
  function conectar() {
    const appId = inp({ value: estado.appId || '', placeholder: 'Ej.: 1234567890123456', inputmode: 'numeric', 'aria-label': 'App ID de Instagram' });
    const secret = inp({ value: '', type: 'password', placeholder: estado.configurado ? '(ya guardada: déjala vacía)' : '32 letras y números', 'aria-label': 'Clave secreta de la app de Instagram', autocomplete: 'off' });
    const redirect = estado.redirect || '';
    const lista = h('div.ig-cuentas', (estado.cuentas || []).map(c => h('div.ig-cuenta-fila', h('div.ig-avatar.sm', c.foto ? h('img', { src: c.foto, alt: '', referrerpolicy: 'no-referrer' }) : h('span', '📸')),
      h('div.grow', h('b', '@' + c.usuario), h('div.tiny.muted', c.ok ? '✅ Conectada' + (c.caduca ? ' · se renueva sola' : '') : '⚠️ ' + (c.error || 'Hay que volver a conectarla'))),
      btn('Quitar', async () => { if (!await confirmDlg('Quitar @' + c.usuario, 'El programa dejará de poder publicar en esta cuenta. Tus publicaciones en Instagram NO se borran.', 'Quitar', true)) return; try { estado = await api('ig.desconectar', { id: c.id }); m.close(); pintaCab(); toast('Cuenta quitada', 'ok'); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm ghost' }))));
    const abrirOAuth = async () => {
      try {
        if (appId.value.trim() !== (estado.appId || '') || secret.value.trim()) estado = await api('ig.configurar', { appId: appId.value.trim(), secret: secret.value.trim() });
        const r = await api('ig.urlConectar', {});
        if (desktop.on) await desktop.openUrl(r.url); else window.open(r.url, '_blank', 'noopener');
        mount(paso4, h('div.ig-espera', h('p', '🌐 Se ha abierto Instagram. Entra con tu cuenta y pulsa «Permitir».'), h('p.small.muted', 'Cuando veas «✅ … conectada», vuelve aquí.'),
          btn('✅ Ya he aceptado', async () => { await cargarEstado(); if (estado.cuentas.length) { m.close(); toast('📸 Instagram conectado', 'ok'); perfil = null; pintaTab(); } else toast('Aún no aparece. Espera unos segundos y vuelve a pulsar.', 'warn'); }, { cls: 'primary' })));
      } catch (e) { toast(e.message, 'bad', 9000); }
    };
    const paso4 = h('div');
    const m = modal('Conectar Instagram', h('div.col.ig-asistente', { style: { gap: '14px' } },
      estado.cuentas.length ? h('div', h('div.lbl', 'Cuentas conectadas'), lista) : null,
      h('p.ig-seguro', '🔒 Nunca se pide ni se guarda tu contraseña de Instagram. Se usa el botón oficial de Instagram y el permiso se guarda en tu servidor.'),
      h('div.ig-paso', h('b', '1 · Tu cuenta de Instagram tiene que ser «Profesional»'), h('p.small', 'En Instagram: Configuración → Tipo de cuenta → Cambiar a cuenta profesional (Empresa o Creador). Es gratis.')),
      h('div.ig-paso', h('b', '2 · Crea la app en Meta (una sola vez)'), h('p.small', 'Entra en developers.facebook.com → Mis apps → Crear app → tipo «Empresa». Añade el producto «Instagram» y elige «Configuración de la API con inicio de sesión de Instagram».'),
        btn('🌐 Abrir Meta para desarrolladores', () => desktop.on ? desktop.openUrl('https://developers.facebook.com/apps/') : window.open('https://developers.facebook.com/apps/', '_blank', 'noopener'), { cls: 'sm ghost' })),
      h('div.ig-paso', h('b', '3 · Pega esta dirección en «URI de redirección de OAuth»'), h('div.ig-copia', h('code', redirect || '(actualiza el servidor)'), btn('📋 Copiar', () => copyText(redirect), { cls: 'sm' }))),
      h('div.ig-paso', h('b', '4 · Copia aquí el App ID y la clave secreta de Instagram'), h('p.small', 'Están en Meta → tu app → Instagram → Configuración de la API.'), h('label.rl-campo', h('span', 'App ID de Instagram'), appId), h('label.rl-campo', h('span', 'Clave secreta de la app de Instagram'), secret)),
      paso4), close => [btn('Cerrar', close), btn(estado.cuentas.length ? '➕ Conectar otra cuenta' : '📸 Conectar con Instagram', abrirOAuth, { cls: 'primary ig-oauth' })], { size: 'wide' });
  }

  // ---------- pestañas ----------
  const TABS = [['crear', '✍️ Crear'], ['ideas', '💡 Ideas y formatos'], ['calendario', '📅 Calendario'], ['comentarios', '💬 Comentarios'], ['feed', '▦ Mi feed'], ['estadisticas', '📊 Estadísticas']];
  let sinContestar = 0;
  const pintaTabs = () => mount(tabs, TABS.map(([v, t]) => h('button' + (tab === v ? '.on' : ''), { type: 'button', 'data-tab': v, onclick: () => ponTab(v) }, t, v === 'comentarios' && sinContestar ? h('span.ig-badge', String(sinContestar)) : null)));
  function ponTab(k) { if (!TABS.some(x => x[0] === k)) k = 'crear'; tab = k; try { localStorage.setItem('cd.ig.tab', k); } catch (e) { } pintaTabs(); pintaTab(); }
  function pintaTab() {
    quitaTeclas(); quitaTeclas = () => { };
    if (tab === 'crear') return pintaCrear();
    if (tab === 'ideas') return pintaIdeas();
    if (tab === 'calendario') return pintaCalendario();
    if (tab === 'feed') return pintaFeed();
    if (tab === 'comentarios') return pintaComentarios();
    return pintaStats();
  }

  // =================== 💡 IDEAS Y FORMATOS (v16) ===================
  // Eliges producto y nivel (Simple · Medio · Pro) y cada formato sale montado: qué fotografiar, el texto y los hashtags.
  const idea = { prod: '', nivel: 'simple', cat: '', ver: 'ideas' };
  try { Object.assign(idea, JSON.parse(localStorage.getItem('cd.ig.ideas') || '{}')); } catch (e) { }
  function pintaIdeas() {
    const guarda = () => { try { localStorage.setItem('cd.ig.ideas', JSON.stringify(idea)); } catch (e) { } };
    const prods = (S.t.productos || []).filter(p => !p.eliminado).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    if (idea.prod && !byId('productos', idea.prod)) idea.prod = '';
    const p = idea.prod ? byId('productos', idea.prod) : null;
    const TIPO = { post: '🖼️ Post', carrusel: '🎠 Carrusel', reel: '🎬 Reel', historia: '⭕ Historia' };
    const prodSel = sel([{ v: '', t: '— Sin producto (texto general) —' }].concat(prods.map(x => ({ v: x.id, t: x.nombre }))), idea.prod, { 'aria-label': 'Producto', onchange: e => { idea.prod = e.target.value; guarda(); pintaIdeas(); } });
    const usar = g => { const fotos = p ? fotosProducto(p.id).slice(0, 10).map(a => ({ id: a.id, tipo: 'foto', nombre: a.nombre })) : []; tab = 'crear'; abrir(nuevo({ tipo: g.tipo === 'carrusel' && fotos.length < 2 ? 'carrusel' : g.tipo, medios: g.tipo === 'reel' ? [] : (g.tipo === 'carrusel' ? fotos : fotos.slice(0, 1)), texto: g.texto, hashtags: g.hashtags.join(' '), productoId: p ? p.id : '' })); ponTab('crear'); toast('Texto y hashtags puestos. Añade tus fotos y cámbialo a tu gusto.', 'ok', 6000); };
    const tarjeta = f => { const g = IDEAS.generar(f.k, p, idea.nivel, S.cfg);
      return h('div.card.ig-idea', h('div.row', h('b.grow', g.titulo), h('span.pill', TIPO[g.tipo] || g.tipo)), h('div.tiny.muted', g.para),
        h('div.ig-idea-b', h('div.lbl', g.tipo === 'reel' ? 'Qué grabar' : g.tipo === 'carrusel' ? 'Qué va en cada imagen' : 'Qué fotografiar'), h('ol', g.pasos.map(x => h('li', x.replace(/^\d+ · |^Plano \d+ /, '')))),
          g.foto.length ? h('div.tiny.muted', '📷 ' + g.foto.join(' ')) : null),
        h('div.ig-idea-t', g.texto), h('div.ig-idea-h', g.hashtags.join(' ')),
        h('div.row.wrap', { style: { gap: '6px' } }, btn('Usar en Crear', () => usar(g), { cls: 'sm primary' }), btn('Copiar texto', () => copyText(g.texto + '\n\n' + g.hashtags.join(' ')), { cls: 'sm' }))); };
    const cab = h('div.card.ig-ideas-cab',
      h('div.row.wrap', { style: { gap: '10px', alignItems: 'flex-end' } }, h('label.rl-campo.grow', h('span', 'Producto'), prodSel),
        h('div', h('div.lbl', 'Nivel'), h('div.seg', IDEAS.NIVELES.map(n => h('button' + (idea.nivel === n[0] ? '.on' : ''), { type: 'button', title: n[2], onclick: () => { idea.nivel = n[0]; guarda(); pintaIdeas(); } }, n[1]))))),
      h('p.tiny.muted', (IDEAS.NIVELES.find(n => n[0] === idea.nivel) || [])[2] + '. Los textos son un punto de partida escrito para sonar natural: cámbialos con tus palabras.'),
      h('div.seg.ig-ver', [['ideas', '💡 Ideas'], ['palabras', '#️⃣ Hashtags y palabras clave'], ['biblioteca', '📚 Composiciones y estructuras']].map(x => h('button' + (idea.ver === x[0] ? '.on' : ''), { type: 'button', onclick: () => { idea.ver = x[0]; guarda(); pintaIdeas(); } }, x[1]))));
    let contenido;
    if (idea.ver === 'palabras') {
      const tags = IDEAS.hashtags(p, S.cfg, 10), kw = IDEAS.keywords(p, S.cfg), lista = (t, xs) => h('div.card', h('h3', t), h('div.row.wrap', { style: { gap: '6px' } }, xs.map(x => h('button.chip', { type: 'button', title: 'Copiar', onclick: () => copyText(x) }, x))));
      contenido = h('div.col', { style: { gap: '12px' } },
        !p ? h('p.small.warn-t', 'Elige un producto arriba: los hashtags y las palabras salen de su nombre, su categoría y su color. Sin producto solo puedo darte los generales.') : null,
        h('div.card', h('h3', '#️⃣ Hashtags (' + tags.length + ')'), h('p.tiny.muted', 'Pocos y del producto: los primeros son los más concretos. Instagram deja 30, pero con 5–10 bien elegidos basta.'), h('div.ig-idea-h', tags.join(' ')), btn('Copiar todos', () => copyText(tags.join(' ')), { cls: 'sm' })),
        lista('🔎 Palabras clave para el texto', kw.claves), lista('🧭 Lo que la gente busca', kw.busquedas),
        h('div.card', h('h3', '💡 Para que te encuentren'), h('ul.small', kw.ideas.map(x => h('li', x)))));
    } else if (idea.ver === 'biblioteca') {
      const bloque = (t, sub, xs) => h('div.card', h('h3', t), h('p.tiny.muted', sub), h('div.ig-bib', xs.map(x => h('div.ig-bib-i', h('b', x[0]), h('span.small', x[1])))));
      contenido = h('div.col', { style: { gap: '12px' } }, bloque('📷 Composiciones de foto', 'Doce maneras de colocar la pieza. Alterna dos o tres para que el perfil no se vea repetido.', IDEAS.COMPOSICIONES), bloque('🎠 Estructuras de carrusel', 'El orden de las imágenes. La primera decide si alguien desliza o pasa de largo.', IDEAS.ESTRUCTURAS));
    } else {
      const lista = IDEAS.formatos(idea.cat);
      contenido = h('div',
        h('div.row.wrap.ig-cats', h('button.chip' + (!idea.cat ? '.on' : ''), { type: 'button', onclick: () => { idea.cat = ''; guarda(); pintaIdeas(); } }, 'Todos (' + IDEAS.formatos().length + ')'), IDEAS.CATEGORIAS.map(c => h('button.chip' + (idea.cat === c[0] ? '.on' : ''), { type: 'button', onclick: () => { idea.cat = c[0]; guarda(); pintaIdeas(); } }, c[1]))),
        h('div.ig-ideas', lista.map(tarjeta)));
    }
    const sc = document.scrollingElement, y = sc ? sc.scrollTop : 0;
    mount(cuerpo, h('div.ig-ideas-wrap', cab, contenido));
    if (sc && y) sc.scrollTop = y;
  }

  // =================== ✍️ CREAR ===================
  const nuevo = (o = {}) => Object.assign({ id: '', tipo: 'post', medios: [], ratio: '4:5', texto: '', hashtags: '', productoId: '', fecha: S.hoy, hora: '19:00', auto: false, tono: 'cercano' }, o);
  function deFila(r) {
    const medios = (r.archivos || []).map(id => byId('archivos', id)).filter(Boolean).map(a => ({ id: a.id, tipo: esVideo(a) ? 'video' : 'foto', nombre: a.nombre }));
    return nuevo({ id: r.id, tipo: r.formato || (medios.length > 1 ? 'carrusel' : medios[0] && medios[0].tipo === 'video' ? 'reel' : 'post'), medios, texto: r.texto || '', hashtags: r.hashtags || '', productoId: r.productoId || '', fecha: r.fecha || S.hoy, hora: r.hora || '19:00', auto: !!(r.ig && r.ig.auto) });
  }
  function abrir(x) { st = x; hist.vaciar(st); pintaCrear(); }
  const apuntar = () => { clearTimeout(tApunte); if (st) hist.apuntar(st); };
  function cambio(panel) { clearTimeout(tApunte); tApunte = setTimeout(apuntar, 450); pintaPrevia(); if (panel) pintaPanel(); }
  function deshacer() { if (!st) return; apuntar(); const x = hist.atras(); if (x) { st = x; pintaCrear(); } }
  function rehacer() { if (!st) return; apuntar(); const x = hist.adelante(); if (x) { st = x; pintaCrear(); } }
  const clave = m => m.id || m.local;
  async function urlDe(m) {
    const k = clave(m); if (urls.has(k)) return urls.get(k);
    let b = null;
    if (m.local) b = locales.get(m.local);
    else { const a = byId('archivos', m.id); if (!a) return ''; if (!esVideo(a) && a.miniatura && !urls.has(k + '_full')) urls.set(k, a.miniatura); const F = await import('../files.js'); try { b = await F.fetchFile(a); } catch (e) { return urls.get(k) || ''; } }
    if (!b) return ''; const u = URL.createObjectURL(b); urls.set(k, u); return u;
  }
  const previa = h('div.ig-previa'), panel = h('div.ig-panel'), barra = h('div.ig-herr', bDes, bReh);
  function pintaCrear() {
    if (!st) st = nuevo();
    mount(cuerpo, barra, h('div.ig-crear', h('div.ig-izq', previa), panel));
    pintaPrevia(); pintaPanel();
    quitaTeclas = teclasDeshacer(deshacer, rehacer);
  }
  // --- la vista previa: como se ve en el móvil ---
  let pPrevia = 0;
  async function pintaPrevia() {
    const n = ++pPrevia, c = cuenta(), usuario = c ? c.usuario : ((S.cfg.empresa && S.cfg.empresa.nombre) || 'tu_tienda').toLowerCase().replace(/[^a-z0-9_.]+/g, '');
    const vertical = st.tipo === 'reel' || st.tipo === 'historia', ratio = vertical ? 9 / 16 : RATIOS[st.ratio] || 0.8;
    const medios = st.medios.slice(0, st.tipo === 'carrusel' ? 10 : 1);
    const srcs = await Promise.all(medios.map(urlDe)); if (n !== pPrevia) return;
    let idx = Math.min(Number(previa.dataset.i) || 0, Math.max(0, medios.length - 1));
    const media = h('div.ig-media', { style: { aspectRatio: String(ratio) } });
    const pon = () => {
      const m = medios[idx], s = srcs[idx];
      mount(media, !m ? h('div.ig-vacio', h('span', TIPOS[st.tipo].i), h('p', 'Añade ' + (st.tipo === 'reel' ? 'un vídeo' : st.tipo === 'carrusel' ? 'varias fotos' : 'una foto'))) :
        m.tipo === 'video' ? h('video', { src: s, muted: true, autoplay: true, loop: true, playsInline: true, 'aria-label': 'Vídeo' }) : h('img', { src: s, alt: '' }),
        medios.length > 1 ? h('div.ig-puntos', medios.map((x, i) => h('i' + (i === idx ? '.on' : '')))) : null,
        medios.length > 1 && idx > 0 ? h('button.ig-flecha.izq', { type: 'button', 'aria-label': 'Anterior', onclick: () => { idx--; previa.dataset.i = idx; pon(); } }, '‹') : null,
        medios.length > 1 && idx < medios.length - 1 ? h('button.ig-flecha.der', { type: 'button', 'aria-label': 'Siguiente', onclick: () => { idx++; previa.dataset.i = idx; pon(); } }, '›') : null,
        medios.length > 1 ? h('span.ig-cuenta-n', (idx + 1) + '/' + medios.length) : null);
    };
    pon();
    const fotoPerfil = c && c.foto ? h('img', { src: c.foto, alt: '', referrerpolicy: 'no-referrer' }) : h('span', '📸');
    const texto = st.texto + (st.hashtags ? '\n\n' + st.hashtags : '');
    const caption = h('div.ig-caption', h('b', usuario + ' '), ...String(texto).split(/(#[\p{L}\p{N}_]+|@[\w.]+)/u).map(t => /^[#@]/.test(t) ? h('span.ig-tag', t) : t));
    if (st.tipo === 'historia') return mount(previa, h('div.ig-movil.historia', media, h('div.ig-hist-barra', h('i')), h('div.ig-hist-cab', h('div.ig-avatar.xs', fotoPerfil), h('b', usuario), h('span', 'ahora'))));
    if (st.tipo === 'reel') return mount(previa, h('div.ig-movil.reel', media, h('div.ig-reel-txt', h('div.row', h('div.ig-avatar.xs', fotoPerfil), h('b', usuario), h('span.ig-seguir', 'Seguir')), caption),
      h('div.ig-reel-acc', ['❤️', '💬', '📤', '⋯'].map(x => h('span', x)))));
    mount(previa, h('div.ig-movil',
      h('div.ig-post-cab', h('div.ig-avatar.xs', fotoPerfil), h('b', usuario), h('span.grow'), h('span', '⋯')), media,
      h('div.ig-post-acc', h('span', '🤍'), h('span', '💬'), h('span', '📤'), h('span.grow'), h('span', '🔖')),
      caption, h('div.ig-fecha', st.auto ? '🤖 Se publica el ' + fdate(st.fecha) + ' a las ' + st.hora : 'Vista previa')));
  }
  // --- el panel ---
  function pintaPanel() {
    const c = cuenta(), prods = (S.t.productos || []).filter(x => x.activo !== false).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
    const tiras = h('div.ig-tira', st.medios.map((m, i) => {
      const a = m.id ? byId('archivos', m.id) : null;
      const im = h('div.ig-mini' + (m.tipo === 'video' ? '.video' : ''), { 'data-i': i }, a && a.miniatura ? h('img', { src: a.miniatura, alt: '' }) : m.tipo === 'video' ? h('span', '🎬') : h('img', { alt: '' }));
      if (!(a && a.miniatura) && m.tipo !== 'video') urlDe(m).then(u => { const x = im.querySelector('img'); if (x) x.src = u; });
      return h('div.ig-mini-w', im, h('div.ig-mini-acc',
        i > 0 ? h('button', { type: 'button', title: 'Antes', onclick: () => { apuntar(); [st.medios[i - 1], st.medios[i]] = [st.medios[i], st.medios[i - 1]]; cambio(true); } }, '←') : null,
        h('button', { type: 'button', title: 'Quitar', 'aria-label': 'Quitar', onclick: () => { apuntar(); st.medios.splice(i, 1); cambio(true); } }, '✕')));
    }));
    const max = st.tipo === 'carrusel' ? 10 : 1;
    const anadir = (lista) => { apuntar(); lista.forEach(m => { if (st.medios.length >= max) st.medios.shift(); if (!st.medios.some(x => clave(x) === clave(m))) st.medios.push(m); }); if (st.medios.length > 1 && st.tipo === 'post') st.tipo = 'carrusel'; if (st.medios.some(m => m.tipo === 'video') && st.tipo === 'post') st.tipo = 'reel'; cambio(true); };
    const fin = h('input', { type: 'file', accept: 'image/*,video/mp4,video/quicktime', multiple: true, style: { display: 'none' }, 'aria-label': 'Fotos o vídeos del aparato', onchange: () => {
      anadir([...fin.files].map(f => { const k = 'l' + uid(); locales.set(k, f); return { local: k, tipo: /^video\//.test(f.type) ? 'video' : 'foto', nombre: f.name }; })); fin.value = '';
    } });
    const texto = area({ value: st.texto, rows: 6, maxlength: MAX_TEXTO, 'aria-label': 'Texto de la publicación', placeholder: 'Escribe el texto… o pulsa «✨ Escribir con IA»', oninput: () => { st.texto = texto.value; cnt.textContent = (st.texto.length + st.hashtags.length) + ' / ' + MAX_TEXTO; cambio(); } });
    const cnt = h('span.tiny.muted', (st.texto.length + st.hashtags.length) + ' / ' + MAX_TEXTO);
    const tags = inp({ value: st.hashtags, 'aria-label': 'Hashtags', placeholder: '#hechoamano #regalo …', oninput: () => { st.hashtags = tags.value; tc.textContent = nTags(st.hashtags) + ' / ' + MAX_TAGS + ' hashtags'; tc.classList.toggle('bad-t', nTags(st.hashtags) > MAX_TAGS); cambio(); } });
    const tc = h('span.tiny.muted', nTags(st.hashtags) + ' / ' + MAX_TAGS + ' hashtags');
    const prodSel = sel([{ v: '', t: '— Ninguno —' }].concat(prods.map(p => ({ v: p.id, t: p.nombre }))), st.productoId, { 'aria-label': 'Producto', onchange: () => { apuntar(); st.productoId = prodSel.value; cambio(true); } });
    const fecha = inp({ type: 'date', value: st.fecha, 'aria-label': 'Fecha', onchange: () => { apuntar(); st.fecha = fecha.value; cambio(); } });
    const hora = inp({ type: 'time', value: st.hora, 'aria-label': 'Hora', onchange: () => { apuntar(); st.hora = hora.value; cambio(); } });
    const conCuenta = !!(c && c.ok), puedePub = can('redes.publicar');
    const mejor = mejorHora();
    mount(panel,
      h('div.es-sec', h('div.lbl', '1 · ¿Qué quieres publicar?'), h('div.ig-tipos', Object.entries(TIPOS).map(([k, t]) => h('button.ig-tipo' + (st.tipo === k ? '.on' : ''), { type: 'button', 'data-tipo': k, onclick: () => { if (st.tipo === k) return; apuntar(); st.tipo = k; if (k !== 'carrusel') st.medios = st.medios.slice(0, 1); cambio(true); } }, h('span', t.i), t.t)))),
      h('div.es-sec', h('div.lbl', '2 · Fotos y vídeos' + (max > 1 ? ' (hasta 10)' : '')), tiras,
        h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } },
          btn('📦 De un producto', () => elegirDeProducto(anadir), { cls: 'sm' }), btn('🖼️ De Archivos', () => elegirDeArchivos(anadir), { cls: 'sm' }), btn('📱 De este aparato', () => fin.click(), { cls: 'sm' }), fin),
        st.tipo === 'post' || st.tipo === 'carrusel' ? h('div.row.wrap', { style: { gap: '6px', marginTop: '8px' } }, h('span.tiny.muted', 'Medida:'), Object.keys(RATIOS).map(k => h('button.chip.sm' + (st.ratio === k ? '.on' : ''), { type: 'button', 'data-ratio': k, onclick: () => { apuntar(); st.ratio = k; cambio(true); } }, k === '4:5' ? '4:5 vertical' : k === '1:1' ? '1:1 cuadrada' : '1.91:1 apaisada'))) : null,
        st.tipo === 'reel' ? h('p.tiny.muted', '🎬 ¿No tienes vídeo? ', h('a', { href: '#/reels' + (st.productoId ? '/producto/' + st.productoId : '') }, 'Hazlo en Reels'), ' y vuelve.') : null),
      h('div.es-sec', h('div.lbl', '3 · Texto'),
        h('div.row.wrap', { style: { gap: '4px', marginBottom: '6px' } }, Object.keys(TONOS).map(k => h('button.chip.sm' + (st.tono === k ? '.on' : ''), { type: 'button', onclick: () => { st.tono = k; pintaPanel(); } }, k[0].toUpperCase() + k.slice(1)))),
        texto, h('div.row', { style: { gap: '6px', alignItems: 'center', marginTop: '4px' } }, btn('✨ Escribir con IA', ev => escribirIA(ev.currentTarget), { cls: 'sm primary ig-ia' }), h('span.grow'), cnt),
        h('div.ig-emojis', EMOJIS.map(e => h('button', { type: 'button', onclick: () => { apuntar(); const p = texto.selectionStart ?? st.texto.length; st.texto = st.texto.slice(0, p) + e + st.texto.slice(p); cambio(true); } }, e))),
        h('label.rl-campo', h('span', 'Hashtags'), tags), h('div.row', { style: { gap: '6px', alignItems: 'center' } }, btn('#️⃣ Sugerir hashtags', () => sugerirTags(), { cls: 'sm' }), h('span.grow'), tc),
        h('label.rl-campo', h('span', 'Producto (la IA lo usa para escribir)'), prodSel)),
      h('div.es-sec', h('div.lbl', '4 · ¿Cuándo?'), h('div.row', { style: { gap: '6px' } }, h('label.rl-campo', h('span', 'Día'), fecha), h('label.rl-campo', h('span', 'Hora'), hora)),
        mejor ? h('p.tiny.ig-mejor', '⭐ Tu mejor momento: ' + mejor.texto, btn('Usar', () => { apuntar(); st.fecha = mejor.fecha; st.hora = mejor.hora; cambio(true); }, { cls: 'sm ghost' })) : null,
        conCuenta && puedePub ? h('label.check.ig-auto', sw(st.auto, v => { apuntar(); st.auto = v; cambio(true); }), '🤖 Publicar sola en ese día y hora') : null),
      h('div.es-sec.ig-final',
        h('div.ig-estado-pub'),
        conCuenta && puedePub ? btn(st.auto ? '📅 Programar en Instagram' : '🚀 Publicar ahora en Instagram', ev => publicar(ev.currentTarget, st.auto ? 'programar' : 'ahora'), { cls: 'primary ig-publicar' })
          : btn('📲 Publicar a mano', ev => aMano(ev.currentTarget), { cls: 'primary ig-publicar' }),
        h('div.row.wrap', { style: { gap: '6px' } }, can('redes.preparar') ? btn('💾 Guardar borrador', ev => guardar(ev.currentTarget), { cls: 'sm ig-guardar' }) : null, btn('📋 Copiar texto', () => copyText(st.texto + (st.hashtags ? '\n\n' + st.hashtags : '')), { cls: 'sm ghost' }), btn('Nueva', () => { abrir(nuevo()); }, { cls: 'sm ghost' })),
        !conCuenta ? h('p.tiny.muted', estado && estado.puedeConectar ? 'Conecta tu cuenta (arriba) para publicar y programar desde aquí.' : 'Para publicar desde aquí, alguien con permiso tiene que conectar la cuenta de Instagram.') : !puedePub ? h('p.tiny.muted', '🔒 Publicar lo hace una persona con permiso de publicar. Guarda el borrador.') : null));
    if (st.id) { const r = byId('redes', st.id); if (r && r.ig) pintaEstadoPub(r); }
  }
  function pintaEstadoPub(r) {
    const box = panel.querySelector('.ig-estado-pub'); if (!box) return;
    const ig = r.ig || {};
    if (ig.estado === 'publicado') mount(box, h('div.ig-ok', '✅ Publicado en Instagram', ig.enlace || r.enlace ? h('div', btn('Ver en Instagram ↗', () => { const u = ig.enlace || r.enlace; desktop.on ? desktop.openUrl(u) : window.open(u, '_blank', 'noopener'); }, { cls: 'sm' })) : null));
    else if (ig.estado === 'procesando') mount(box, h('div.ig-proc', h('div.rl-prog', h('i', { style: { width: '60%' } })), '⏳ Instagram está preparando ' + (ig.formato === 'reel' ? 'el vídeo' : 'las fotos') + '…'));
    else if (ig.estado === 'error') mount(box, h('div.ig-err', '⚠️ ' + (ig.error || 'No se pudo publicar.')));
    else if (ig.auto) mount(box, h('div.ig-proc', '🤖 Programada: se publica sola el ' + fdate(r.fecha) + ' a las ' + r.hora + '.'));
    else mount(box);
  }
  // --- elegir fotos ---
  function elegirDeProducto(anadir) {
    const prods = (S.t.productos || []).filter(p => fotosProducto(p.id).length).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
    if (!prods.length) return toast('Ningún producto tiene fotos todavía.', 'warn');
    let pid = st.productoId && fotosProducto(st.productoId).length ? st.productoId : prods[0].id; const elegidas = new Set();
    const rej = h('div.rl-fotos'), s = sel(prods.map(p => ({ v: p.id, t: p.nombre + ' · ' + fotosProducto(p.id).length })), pid, { 'aria-label': 'Producto', onchange: () => { pid = s.value; elegidas.clear(); pinta(); } });
    const pinta = () => mount(rej, fotosProducto(pid).map(a => h('button.rl-fotoel' + (elegidas.has(a.id) ? '.on' : ''), { type: 'button', 'data-foto': a.id, onclick: ev => { elegidas.has(a.id) ? elegidas.delete(a.id) : elegidas.add(a.id); ev.currentTarget.classList.toggle('on'); } }, a.miniatura ? h('img', { src: a.miniatura, alt: a.nombre }) : h('span', a.nombre))));
    pinta();
    modal('Fotos de un producto', h('div.col', { style: { gap: '10px' } }, s, h('p.tiny.muted', 'Toca las fotos que quieras (en orden).'), rej), close => [btn('Cancelar', close), btn('Añadir', () => {
      const l = fotosProducto(pid).filter(a => elegidas.has(a.id)).map(a => ({ id: a.id, tipo: 'foto', nombre: a.nombre }));
      if (!l.length) return toast('Toca al menos una foto.', 'warn');
      if (!st.productoId) st.productoId = pid; close(); anadir(l);
    }, { cls: 'primary' })], { size: 'wide' });
  }
  function elegirDeArchivos(anadir) {
    const todos = (S.t.archivos || []).filter(a => a.tipo === 'foto' || esVideo(a) || /^image\//.test(a.mime || '')).sort((a, b) => String(b.creado).localeCompare(String(a.creado))).slice(0, 120);
    if (!todos.length) return toast('Aún no hay fotos ni vídeos en Archivos.', 'warn');
    const elegidas = [];
    modal('Fotos y vídeos de Archivos', h('div.col', { style: { gap: '10px' } }, h('p.tiny.muted', 'Toca lo que quieras (en orden).'),
      h('div.rl-fotos', todos.map(a => h('button.rl-fotoel', { type: 'button', 'data-foto': a.id, title: a.nombre, onclick: ev => { const i = elegidas.indexOf(a); i >= 0 ? elegidas.splice(i, 1) : elegidas.push(a); ev.currentTarget.classList.toggle('on'); } },
        a.miniatura ? h('img', { src: a.miniatura, alt: a.nombre }) : h('span', (esVideo(a) ? '🎬 ' : '') + a.nombre))))), close => [btn('Cancelar', close), btn('Añadir', () => {
      if (!elegidas.length) return toast('Toca al menos una.', 'warn'); close(); anadir(elegidas.map(a => ({ id: a.id, tipo: esVideo(a) ? 'video' : 'foto', nombre: a.nombre })));
    }, { cls: 'primary' })], { size: 'wide' });
  }
  // --- IA ---
  async function escribirIA(b) {
    const prod = st.productoId ? byId('productos', st.productoId) : null, t0 = b.textContent; b.disabled = true;
    const datos = prod ? '\nDatos reales del producto (no inventes otros): ' + JSON.stringify({ nombre: prod.nombre, categoria: prod.categoria, color: prod.color, material: prod.material, tamano: prod.tamano, descripcion: prod.descripcion, precio: prod.precio }) : '';
    const tipo = { post: 'una publicación', carrusel: 'un carrusel de fotos', reel: 'un Reel', historia: 'una historia' }[st.tipo];
    try {
      const { write } = await import('../ai/engine.js');
      apuntar();
      const r = (await write('Escribe el texto en español de España para ' + tipo + ' de Instagram de CelebriDiseños (tienda de productos personalizados e impresión 3D). Tono ' + TONOS[st.tono] + '. Empieza con una frase gancho, 3-5 líneas cortas, 2-4 emojis, y termina con una llamada a la acción. Después, en una línea aparte, 12-18 hashtags en español relevantes. Devuelve SOLO el texto.' + datos,
        { onToken: t => { st.texto = t; const x = panel.querySelector('textarea[aria-label="Texto de la publicación"]'); if (x) x.value = t; }, onStatus: t => { b.textContent = t; } })).trim();
      const m = r.match(/((?:^|\n)\s*(?:#[\p{L}\p{N}_]+[\s,]*){3,})\s*$/u);
      st.texto = (m ? r.slice(0, m.index) : r).trim().slice(0, MAX_TEXTO);
      if (m) st.hashtags = m[1].replace(/[,\s]+/g, ' ').trim().split(' ').slice(0, MAX_TAGS).join(' ');
      apuntar(); cambio(true); toast('✨ Texto escrito. Si no te gusta, ↶ Deshacer.', 'ok');
    } catch (e) { toast(e.message, 'warn', 8000); } finally { b.disabled = false; b.textContent = t0; }
  }
  function sugerirTags() {
    // v16: pocos y del producto real (los mismos de «Ideas y formatos»), no una lista larga de relleno
    const prod = st.productoId ? byId('productos', st.productoId) : null;
    const ya = new Set((st.hashtags.match(/#[\p{L}\p{N}_]+/gu) || []).map(t => t.toLowerCase()));
    const nuevas = IDEAS.hashtags(prod, S.cfg, 10).filter(t => !ya.has(t.toLowerCase())).slice(0, Math.max(0, 10 - ya.size));
    if (!nuevas.length) { toast(ya.size >= 10 ? 'Ya tienes ' + ya.size + ' hashtags: con 5–10 bien elegidos es suficiente.' : 'No tengo más hashtags relevantes para este producto.', '', 5000); return; }
    apuntar(); st.hashtags = (st.hashtags + ' ' + nuevas.join(' ')).trim(); cambio(true);
  }
  // Mejor momento: el día y la hora en que tus publicaciones tienen más ❤️ y 💬
  function mejorHora() {
    const ms = perfil && perfil.media; if (!ms || ms.length < 4) return null;
    const pD = {}, pH = {};
    ms.forEach(m => { const d = new Date(m.fecha); if (isNaN(d)) return; const v = (m.likes || 0) + 3 * (m.comentarios || 0); const wd = (d.getDay() + 6) % 7, hh = d.getHours(); (pD[wd] = pD[wd] || []).push(v); (pH[hh] = pH[hh] || []).push(v); });
    const top = o => Object.entries(o).map(([k, l]) => [Number(k), l.reduce((a, b) => a + b, 0) / l.length]).sort((a, b) => b[1] - a[1])[0];
    const d = top(pD), hh = top(pH); if (!d || !hh) return null;
    const hoy = CL.parse(S.hoy), dif = (d[0] - ((hoy.getDay() + 6) % 7) + 7) % 7 || 7, f = CL.addDays(S.hoy, dif), hora = String(hh[0]).padStart(2, '0') + ':00';
    return { fecha: f, hora, texto: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'][d[0]] + ' a las ' + hora };
  }
  // --- preparar fotos para Instagram (JPG, su medida; historias 9:16 con fondo difuminado) ---
  async function aJpeg(blob, tipo, ratio) {
    const bmp = await createImageBitmap(blob), W = 1080, r = tipo === 'historia' ? 9 / 16 : RATIOS[ratio] || 0.8, H = Math.round(W / r);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    if (tipo === 'historia') {
      const s0 = Math.max(W / bmp.width, H / bmp.height); g.filter = 'blur(28px) brightness(.8)'; g.drawImage(bmp, (W - bmp.width * s0) / 2, (H - bmp.height * s0) / 2, bmp.width * s0, bmp.height * s0); g.filter = 'none';
      const s1 = Math.min(W / bmp.width, H / bmp.height); g.drawImage(bmp, (W - bmp.width * s1) / 2, (H - bmp.height * s1) / 2, bmp.width * s1, bmp.height * s1);
    } else { const s = Math.max(W / bmp.width, H / bmp.height); g.drawImage(bmp, (W - bmp.width * s) / 2, (H - bmp.height * s) / 2, bmp.width * s, bmp.height * s); }
    return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('No se pudo preparar la foto.')), 'image/jpeg', 0.92));
  }
  async function blobDe(m) { if (m.local) return locales.get(m.local); const a = byId('archivos', m.id); if (!a) throw new Error('No encuentro una de las fotos.'); const F = await import('../files.js'); return F.fetchFile(a); }
  // Sube lo que falta y deja la publicación guardada. paraPublicar: las fotos se convierten a la medida de Instagram.
  async function guardarFila(paraPublicar, msg) {
    if (!can('redes.preparar')) { requestAccess('redes.preparar', 'redes'); throw new DOMException('sin permiso', 'AbortError'); }
    if (!st.medios.length && paraPublicar) throw new Error('Añade al menos una foto o un vídeo.');
    if (st.tipo === 'reel' && paraPublicar && !st.medios.some(m => m.tipo === 'video')) throw new Error('Un Reel necesita un vídeo. Hazlo en «Reels 🎬» o elige uno.');
    if (st.tipo === 'carrusel' && paraPublicar && st.medios.length < 2) throw new Error('Un carrusel necesita al menos 2 fotos.');
    if (nTags(st.hashtags) > MAX_TAGS) throw new Error('Instagram admite como mucho ' + MAX_TAGS + ' hashtags.');
    const id = st.id || uid('r'), F = await import('../files.js'), ids = [];
    for (let i = 0; i < st.medios.length; i++) {
      const m = st.medios[i];
      msg && msg('📤 Preparando ' + (i + 1) + ' de ' + st.medios.length + '…');
      if (m.tipo === 'foto' && paraPublicar) {
        const k = st.tipo + '|' + st.ratio;
        if (m.prep && m.prep.k === k && byId('archivos', m.prep.id)) { ids.push(m.prep.id); continue; }
        const j = await aJpeg(await blobDe(m), st.tipo, st.ratio);
        const a = await F.uploadFile(new File([j], 'instagram_' + String(m.nombre || 'foto').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) + '.jpg', { type: 'image/jpeg' }), { entidad: 'redes', entidadId: id, original: true });
        if (a && a.id && !byId('archivos', a.id)) upsertLocal('archivos', a);
        m.prep = { k, id: a.id }; ids.push(a.id);
      } else if (m.local) {
        const f = locales.get(m.local); const a = await F.uploadFile(f, { entidad: 'redes', entidadId: id, original: true });
        if (a && a.id && !byId('archivos', a.id)) upsertLocal('archivos', a);
        locales.delete(m.local); urls.delete(m.local); m.local = undefined; m.id = a.id; ids.push(a.id);
      } else ids.push(m.id);
    }
    const prod = st.productoId ? byId('productos', st.productoId) : null;
    const titulo = (String(st.texto).split('\n').find(x => x.trim()) || (prod && prod.nombre) || TIPOS[st.tipo].t).replace(/[#*]/g, '').trim().slice(0, 70);
    const datos = { titulo, texto: st.texto, hashtags: st.hashtags, red: 'Instagram', fecha: st.fecha, hora: st.hora, productoId: st.productoId, formato: st.tipo, archivos: ids };
    const cur = st.id ? byId('redes', st.id) : null;
    if (!cur) { datos.estado = 'Preparando'; datos.responsable = S.me.nombre; }
    const r = await api('redes.guardar', { id, datos });
    upsertLocal('redes', r); emit();
    st.id = r.id; hist.rebase && hist.rebase(st);
    return r;
  }
  async function guardar(b) {
    b.disabled = true; try { await guardarFila(false); toast('💾 Borrador guardado', 'ok'); } catch (e) { if (e.name !== 'AbortError') handleError(e, 'redes'); } finally { b.disabled = false; }
  }
  async function publicar(b, modo) {
    if (publicando) return; publicando = true; b.disabled = true;
    const box = panel.querySelector('.ig-estado-pub'), msg = t => box && mount(box, h('div.ig-proc', h('div.rl-prog', h('i', { style: { width: '40%' } })), t));
    try {
      if (modo === 'ahora' && !await confirmDlg('Publicar en Instagram', 'Se publica YA en @' + cuenta().usuario + '. ¿Seguro?', '🚀 Publicar')) return;
      let r = await guardarFila(true, msg);
      if (modo === 'programar') {
        r = await api('ig.programar', { id: r.id, auto: true, cuenta: cuenta().id }); upsertLocal('redes', r); emit(); pintaEstadoPub(r);
        toast('🤖 Programada: se publica sola el ' + fdate(r.fecha) + ' a las ' + r.hora, 'ok', 7000); return;
      }
      msg('🚀 Enviando a Instagram…');
      r = await api('ig.publicar', { id: r.id, cuenta: cuenta().id }, { timeout: 90000 }); upsertLocal('redes', r); emit(); pintaEstadoPub(r);
      for (let i = 0; i < 150 && r.ig && r.ig.estado === 'procesando'; i++) { await new Promise(x => setTimeout(x, 4000)); if (!panel.isConnected) return; r = await api('ig.comprobar', { id: r.id }, { quiet: true }); upsertLocal('redes', r); emit(); pintaEstadoPub(r); }
      if (r.ig && r.ig.estado === 'publicado') { toast('🎉 ¡Publicado en Instagram!', 'ok', 8000); perfil = null; }
      else if (r.ig && r.ig.estado === 'error') toast(r.ig.error, 'bad', 12000);
    } catch (e) { if (e.name !== 'AbortError') { handleError(e, 'redes'); const r = st.id && byId('redes', st.id); if (r) pintaEstadoPub(r); } }
    finally { publicando = false; b.disabled = false; }
  }
  async function aMano(b) {
    b.disabled = true;
    try {
      if (!st.medios.length) throw new Error('Añade al menos una foto o un vídeo.');
      const F = await import('../files.js');
      copyText(st.texto + (st.hashtags ? '\n\n' + st.hashtags : ''));
      for (let i = 0; i < st.medios.length; i++) { const m = st.medios[i], bl = await blobDe(m); const j = m.tipo === 'foto' ? await aJpeg(bl, st.tipo, st.ratio) : bl; F.download(j, 'instagram_' + (i + 1) + (m.tipo === 'foto' ? '.jpg' : '.mp4')); }
      if (can('redes.preparar')) await guardarFila(false).catch(() => { });
      toast('📋 Texto copiado y fotos descargadas. Ahora en Instagram: ➕ → elige las fotos → pega el texto.', 'ok', 12000);
      const u = 'https://www.instagram.com/'; desktop.on ? desktop.openUrl(u) : window.open(u, '_blank', 'noopener');
    } catch (e) { toast(e.message, 'bad'); } finally { b.disabled = false; }
  }

  // =================== 📅 CALENDARIO (arrastrar a otro día) ===================
  let calMes = (() => { const d = CL.parse(S.hoy); return { y: d.getFullYear(), m: d.getMonth() }; })();
  let arrastrando = false, firmaCal = '';
  const firmaDeCal = () => calMes.y + '-' + calMes.m + '|' + deshacerCal.length + '|' + JSON.stringify(igRows().map(r => [r.id, r.fecha, r.hora, r.titulo, r.estado, r.ig && r.ig.estado, r.ig && r.ig.auto, (r.archivos || [])[0]]));
  function pintaCalendario() {
    firmaCal = firmaDeCal();
    const first = CL.dateStr(new Date(calMes.y, calMes.m, 1, 12)), start = CL.weekStart(first), last = new Date(calMes.y, calMes.m + 1, 0, 12), days = CL.days(start, CL.addDays(CL.weekStart(CL.dateStr(last)), 6)) + 1;
    const bDesCal = btn('↶ Deshacer', async () => { const x = deshacerCal.pop(); if (!x) return; await mover(x.id, x.de, true); }, { cls: 'sm', title: 'Deshacer el último cambio de día' }); bDesCal.disabled = !deshacerCal.length; bDesCal.setAttribute('aria-label', 'Deshacer');
    const celdas = [];
    for (let i = 0; i < days; i++) {
      const d = CL.addDays(start, i), out = Number(d.slice(5, 7)) - 1 !== calMes.m;
      const lista = igRows().filter(r => r.fecha === d).sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
      celdas.push(h('div.ig-dia' + (out ? '.out' : '') + (d === S.hoy ? '.hoy' : ''), { 'data-dia': d,
        ondragover: e => { e.preventDefault(); e.currentTarget.classList.add('sobre'); }, ondragleave: e => e.currentTarget.classList.remove('sobre'),
        ondrop: e => { e.preventDefault(); arrastrando = false; e.currentTarget.classList.remove('sobre'); const id = e.dataTransfer.getData('text/plain'); if (id) mover(id, d); },
        ondblclick: () => { tab = 'crear'; abrir(nuevo({ fecha: d })); ponTab('crear'); } },
        h('span.num', String(Number(d.slice(8)))),
        lista.map(r => { const a = (r.archivos || []).map(x => byId('archivos', x)).find(Boolean), [ic, , cls] = ESTADO(r);
          return h('div.ig-ev' + (cls ? '.' + cls : ''), { draggable: !(r.ig && r.ig.estado === 'publicado') && can('redes.preparar') ? 'true' : 'false', 'data-id': r.id, title: (r.hora || '') + ' ' + (r.titulo || ''), ondragstart: e => { arrastrando = true; e.dataTransfer.setData('text/plain', r.id); e.dataTransfer.effectAllowed = 'move'; }, ondragend: () => { arrastrando = false; }, onclick: () => { tab = 'crear'; abrir(deFila(r)); ponTab('crear'); } },
            a && a.miniatura ? h('img', { src: a.miniatura, alt: '' }) : h('span.ig-ev-i', (TIPOS[r.formato] || TIPOS.post).i), h('span.ig-ev-t', ic + ' ' + (r.hora || '') + ' ' + (r.titulo || ''))); })));
    }
    mount(cuerpo, h('div.row.wrap.ig-cal-cab', btn('‹', () => { calMes.m--; if (calMes.m < 0) { calMes.m = 11; calMes.y--; } pintaCalendario(); }, { cls: 'icon', title: 'Mes anterior' }),
      h('h2', monthName(calMes.m).replace(/^./, c => c.toUpperCase()) + ' ' + calMes.y), btn('›', () => { calMes.m++; if (calMes.m > 11) { calMes.m = 0; calMes.y++; } pintaCalendario(); }, { cls: 'icon', title: 'Mes siguiente' }), h('span.grow'), bDesCal,
      btn('➕ Nueva', () => { tab = 'crear'; abrir(nuevo()); ponTab('crear'); }, { cls: 'sm primary' })),
      h('p.tiny.muted', 'Arrastra una publicación a otro día para cambiarla. Toca una para abrirla.'),
      h('div.ig-cal', DIAS.map(d => h('div.dh', d)), celdas),
      h('div.row.wrap.tiny.muted', { style: { gap: '12px', marginTop: '8px' } }, ['📝 Borrador', '🤖 Programado', '⏳ Subiendo', '✅ Publicado', '⚠️ Error'].map(t => h('span', t))));
  }
  async function mover(id, dia, esDeshacer) {
    const r = byId('redes', id); if (!r || r.fecha === dia) return;
    if (!can('redes.preparar')) return requestAccess('redes.preparar', 'redes');
    const de = r.fecha;
    try {
      const x = await mutate('redes.guardar', { id, datos: { fecha: dia }, orig: { fecha: r.fecha } }, { label: 'Cambiar de día', tables: ['redes'], optimistic: T => { const y = T.redes.find(z => z.id === id); if (y) y.fecha = dia; } });
      if (x && x.id) upsertLocal('redes', x);
      if (!esDeshacer) deshacerCal.push({ id, de }); emit(); pintaCalendario();
      toast((esDeshacer ? '↶ Vuelve al ' : '📅 Movida al ') + fdate(dia), 'ok', 2500);
    } catch (e) { handleError(e, 'redes'); }
  }

  // =================== ▦ MI FEED (cómo quedará el perfil) ===================
  async function cargarPerfil(recargar) {
    const c = cuenta(); if (!c || !c.ok) return null;
    try { perfil = await api('ig.perfil', { cuenta: c.id, recargar: !!recargar }, { quiet: true, timeout: 40000 }); } catch (e) { perfil = { error: e.message, media: [] }; }
    return perfil;
  }
  let firmaFeed = '';
  async function pintaFeed() {
    firmaFeed = firmaDeCal();
    const c = cuenta();
    const pendientes = igRows().filter(r => !(r.ig && r.ig.estado === 'publicado') && r.estado !== 'Publicado' && (r.archivos || []).length).sort((a, b) => String(b.fecha + b.hora).localeCompare(String(a.fecha + a.hora)));
    const box = h('div.ig-grid');
    mount(cuerpo, h('div.row.wrap', { style: { gap: '8px', alignItems: 'center', marginBottom: '8px' } }, h('p.small.muted.grow', '▦ Así se verá tu perfil: arriba lo que tienes preparado (con su fecha), debajo lo que ya está en Instagram.'), c && c.ok ? btn('↻', () => { perfil = null; pintaFeed(); }, { cls: 'sm ghost', title: 'Actualizar' }) : null), box);
    const celda = (src, extra, onclick, video) => h('button.ig-celda', { type: 'button', onclick }, src ? h('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('span', '🖼️'), video ? h('span.ig-celda-v', '🎬') : null, extra);
    const plan = pendientes.map(r => { const a = (r.archivos || []).map(x => byId('archivos', x)).find(Boolean), [ic] = ESTADO(r); return celda(a && a.miniatura, h('span.ig-celda-plan', ic + ' ' + fdate(r.fecha)), () => { tab = 'crear'; abrir(deFila(r)); ponTab('crear'); }, a && esVideo(a)); });
    mount(box, plan);
    if (!c || !c.ok) { if (!plan.length) mount(box, h('p.muted', 'Aún no hay nada preparado. Ve a «✍️ Crear».')); return; }
    if (!perfil) { box.append(h('div.skeleton.ig-celda'), h('div.skeleton.ig-celda'), h('div.skeleton.ig-celda')); await cargarPerfil(); if (tab !== 'feed') return; mount(box, plan); }
    if (perfil.error) return box.append(h('p.bad-t', perfil.error));
    perfil.media.forEach(m => box.append(celda(m.mini, h('span.ig-celda-n', '❤️ ' + num(m.likes) + '  💬 ' + num(m.comentarios)), () => desktop.on ? desktop.openUrl(m.enlace) : window.open(m.enlace, '_blank', 'noopener'), m.tipo === 'VIDEO')));
  }

  // =================== 💬 COMENTARIOS (contestar sin salir del programa) ===================
  let coms = null, comFiltro = 'pendientes';
  const RAPIDAS = ['¡Muchas gracias! 💜', '¡Nos alegra mucho que te guste! 😍', 'Te hemos escrito por mensaje privado 📩', '¡Está disponible! Escríbenos por privado para pedirlo 🛍️', 'Lo hacemos personalizado: dinos qué te gustaría ✨'];
  async function cargarComentarios(recargar) {
    const c = cuenta(); if (!c || !c.ok) return null;
    try { coms = await api('ig.comentarios', { cuenta: c.id, recargar: !!recargar }, { quiet: true, timeout: 60000 }); } catch (e) { coms = { error: e.message, posts: [], pendientes: 0 }; }
    sinContestar = coms.pendientes || 0; pintaTabs(); return coms;
  }
  async function pintaComentarios(recargar) {
    const c = cuenta();
    if (!c || !c.ok) return mount(cuerpo, h('div.card', h('p', '💬 Los comentarios salen cuando la cuenta de Instagram está conectada.'), estado && estado.puedeConectar ? btn('➕ Conectar Instagram', () => conectar(), { cls: 'primary' }) : null));
    if (!coms || recargar) { mount(cuerpo, h('div.skeleton', { style: { height: '160px' } })); await cargarComentarios(recargar); if (tab !== 'comentarios') return; }
    if (coms.error) return mount(cuerpo, h('p.bad-t', coms.error), btn('Reintentar', () => pintaComentarios(true), { cls: 'sm' }));
    const puede = can('redes.publicar');
    const cab = h('div.row.wrap.ig-com-cab', h('b.grow', coms.pendientes ? '💬 ' + coms.pendientes + (coms.pendientes > 1 ? ' comentarios esperan respuesta' : ' comentario espera respuesta') : '✅ Todo contestado'),
      ['pendientes', 'todos'].map(k => h('button.chip' + (comFiltro === k ? '.on' : ''), { type: 'button', 'data-f': k, onclick: () => { comFiltro = k; pintaComentarios(); } }, k === 'pendientes' ? 'Sin contestar' : 'Todos')),
      btn('↻', () => pintaComentarios(true), { cls: 'sm ghost', title: 'Ver si hay nuevos' }));
    const posts = coms.posts.map(p => ({ p, l: p.comentarios.filter(x => comFiltro === 'todos' || (!x.contestado && !x.oculto)) })).filter(x => x.l.length);
    mount(cuerpo, cab, !puede ? h('p.tiny.muted', '🔒 Contestar lo hace una persona con permiso de publicar.') : null,
      posts.length ? posts.map(({ p, l }) => h('div.card.ig-com-post',
        h('div.ig-com-media', p.media.mini ? h('img', { src: p.media.mini, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' }) : h('span', '🖼️'),
          h('div.grow', h('div.small', String(p.media.texto || '').split('\n')[0].slice(0, 90) || 'Publicación'), h('div.tiny.muted', p.media.fecha ? ago(p.media.fecha) : '')),
          p.media.enlace ? h('a.small', { href: p.media.enlace, target: '_blank', rel: 'noopener' }, '↗') : null),
        l.map(x => comentario(p, x, puede))))
        : h('div.card', h('p', comFiltro === 'pendientes' ? '🎉 No hay comentarios sin contestar.' : 'Aún no hay comentarios en tus últimas publicaciones.')));
  }
  function comentario(p, x, puede) {
    const caja = h('div.ig-com-resp');
    const el = h('div.ig-com' + (x.oculto ? '.oculto' : '') + (x.contestado ? '.hecho' : ''), { 'data-id': x.id },
      h('div.ig-com-av', (x.usuario || '?')[0].toUpperCase()),
      h('div.grow',
        h('div.ig-com-t', h('b', '@' + x.usuario), ' ', x.texto),
        h('div.tiny.muted', [x.fecha ? ago(x.fecha) : '', x.likes ? '❤️ ' + x.likes : '', x.contestado ? '✅ Contestado' : '', x.oculto ? '🙈 Oculto' : ''].filter(Boolean).join(' · ')),
        x.respuestas.length ? h('div.ig-com-reps', x.respuestas.map(r => h('div.ig-com-rep' + (r.mio ? '.mio' : ''), h('b', '@' + r.usuario), ' ', r.texto))) : null,
        puede ? h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } },
          !x.oculto ? btn('↩️ Contestar', () => abreResp(), { cls: 'sm ig-com-contestar' }) : null,
          btn(x.oculto ? '👁️ Mostrar' : '🙈 Ocultar', async ev => {
            const b = ev.currentTarget; b.disabled = true;
            try { await api('ig.ocultar', { cuenta: cuenta().id, id: x.id, ocultar: !x.oculto }); x.oculto = !x.oculto; coms.pendientes = contar(); sinContestar = coms.pendientes; pintaTabs(); pintaComentarios(); toast(x.oculto ? '🙈 Comentario oculto (no se borra)' : '👁️ Comentario visible otra vez', 'ok'); }
            catch (e) { toast(e.message, 'bad'); b.disabled = false; }
          }, { cls: 'sm ghost' })) : null,
        caja));
    function abreResp() {
      if (caja.firstChild) return mount(caja);
      const t = area({ rows: 3, maxlength: 2200, 'aria-label': 'Respuesta', placeholder: 'Escribe la respuesta…', value: '@' + x.usuario + ' ' });
      const enviar = btn('📤 Enviar', async ev => {
        const b = ev.currentTarget, v = t.value.trim(); if (!v || v === '@' + x.usuario) return toast('Escribe la respuesta.', 'warn');
        b.disabled = true;
        try { const r = await api('ig.responder', { cuenta: cuenta().id, id: x.id, texto: v }); x.respuestas.push(r); x.contestado = true; coms.pendientes = contar(); sinContestar = coms.pendientes; pintaTabs(); toast('💬 Contestado en Instagram', 'ok'); pintaComentarios(); }
        catch (e) { toast(e.message, 'bad', 8000); b.disabled = false; }
      }, { cls: 'sm primary ig-com-enviar' });
      const ia = btn('✨ Con IA', async ev => {
        const b = ev.currentTarget, t0 = b.textContent; b.disabled = true;
        try { const { write } = await import('../ai/engine.js');
          const r = await write('Eres CelebriDiseños (tienda de productos personalizados e impresión 3D). Contesta en español de España, en 1 o 2 frases cortas, cercano y amable, con 1 emoji, a este comentario de Instagram de @' + x.usuario + ': «' + x.texto + '». La publicación decía: «' + String(p.media.texto || '').slice(0, 300) + '». No inventes precios ni plazos: si preguntan eso, invita a escribir por privado. Devuelve SOLO la respuesta.', { onStatus: s => { b.textContent = s; } });
          t.value = '@' + x.usuario + ' ' + r.trim().replace(/^@\S+\s*/, ''); t.focus();
        } catch (e) { toast(e.message, 'warn', 8000); } finally { b.disabled = false; b.textContent = t0; }
      }, { cls: 'sm' });
      mount(caja, h('div.col', { style: { gap: '6px', marginTop: '8px' } }, t,
        h('div.row.wrap', { style: { gap: '4px' } }, RAPIDAS.map(q => h('button.chip.sm', { type: 'button', onclick: () => { t.value = '@' + x.usuario + ' ' + q; t.focus(); } }, q))),
        h('div.row', { style: { gap: '6px' } }, ia, h('span.grow'), btn('Cancelar', () => mount(caja), { cls: 'sm ghost' }), enviar)));
      t.focus();
    }
    return el;
  }
  const contar = () => coms.posts.reduce((n, p) => n + p.comentarios.filter(x => !x.contestado && !x.oculto).length, 0);

  // =================== 📊 ESTADÍSTICAS ===================
  async function pintaStats() {
    const c = cuenta();
    if (!c || !c.ok) return mount(cuerpo, h('div.card', h('p', '📊 Las estadísticas salen cuando la cuenta de Instagram está conectada.'), estado && estado.puedeConectar ? btn('➕ Conectar Instagram', () => conectar(), { cls: 'primary' }) : null));
    mount(cuerpo, h('div.skeleton', { style: { height: '120px' } }));
    if (!perfil) await cargarPerfil();
    if (perfil.error) return mount(cuerpo, h('p.bad-t', perfil.error));
    const ids = perfil.media.slice(0, 12).map(m => m.id), tipos = {}; perfil.media.forEach(m => { tipos[m.id] = m.producto === 'STORY' ? 'STORY' : m.tipo; });
    try { [stats, resumen] = await Promise.all([api('ig.estadisticas', { cuenta: c.id, ids, tipos }, { quiet: true, timeout: 60000 }).then(r => r.stats), api('ig.resumen', { cuenta: c.id }, { quiet: true, timeout: 40000 }).catch(() => null)]); } catch (e) { stats = {}; }
    if (tab !== 'estadisticas') return;
    const v = (resumen && resumen.valores) || {}, ms = perfil.media.slice(0, 12);
    const punt = m => (m.likes || 0) + 3 * (m.comentarios || 0) + 2 * ((stats[m.id] || {}).saved || 0) + 2 * ((stats[m.id] || {}).shares || 0);
    const maxP = Math.max(1, ...ms.map(punt)), mejor = ms.slice().sort((a, b) => punt(b) - punt(a))[0], mh = mejorHora();
    const tarjeta = (ic, n, t) => h('div.ig-num', h('span', ic), h('b', n == null ? '—' : num(n)), h('small', t));
    mount(cuerpo,
      h('div.ig-nums', tarjeta('👥', c.seguidores, 'seguidores'), tarjeta('👀', v.reach, 'personas alcanzadas (28 días)'), tarjeta('💬', v.total_interactions, 'interacciones (28 días)'), tarjeta('🙋', v.accounts_engaged, 'cuentas que interactúan')),
      mh ? h('div.card.ig-consejo', '⭐ Publica los ', h('b', mh.texto), ': es cuando más ❤️ y 💬 recibes.') : null,
      mejor ? h('div.card.ig-consejo', '🏆 Tu mejor publicación: «' + String(mejor.texto || '').split('\n')[0].slice(0, 80) + '» con ' + num(mejor.likes) + ' ❤️ y ' + num(mejor.comentarios) + ' 💬.') : null,
      h('div.lbl', { style: { margin: '14px 0 6px' } }, 'Tus últimas publicaciones'),
      h('div.ig-barras', ms.map(m => { const s = stats[m.id] || {};
        return h('div.ig-barra-fila', h('img', { src: m.mini, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' }),
          h('div.grow', h('div.ig-barra', h('i', { style: { width: Math.round(punt(m) / maxP * 100) + '%' } })), h('div.tiny', '❤️ ' + num(m.likes) + ' · 💬 ' + num(m.comentarios) + (s.reach != null ? ' · 👀 ' + num(s.reach) : '') + (s.saved ? ' · 🔖 ' + num(s.saved) : '') + (s.shares ? ' · 📤 ' + num(s.shares) : '') + ' · ' + ago(m.fecha))),
          h('a.small', { href: m.enlace, target: '_blank', rel: 'noopener' }, '↗')); })));
  }

  // ---------- arranque ----------
  async function aplicar(ps) {
    ps = (ps || []).filter(Boolean);
    let pend = window.__cdIgPendiente; window.__cdIgPendiente = null;
    if (!pend && ps[0] === 'biouvision') { // v15.4: desde Biouvision (su propia ventana o página): la foto espera en este aparato
      pend = await kv.get('ig.pendiente'); kv.del('ig.pendiente');
      if (pend && Date.now() - (pend.t || 0) > 3600000) pend = null;
      history.replaceState(null, '', '#/instagram');
      if (!pend) toast('No encuentro la foto que mandaste desde Biouvision. Vuelve a pulsar «📸 Instagram» allí.', 'warn', 7000);
    }
    if (pend) { // desde Biouvision, Reels o un producto
      const medios = (pend.medios || []).map(m => { if (m.file) { const k = 'l' + uid(); locales.set(k, m.file); return { local: k, tipo: /^video\//.test(m.file.type) ? 'video' : 'foto', nombre: m.file.name }; } return m; });
      tab = 'crear'; abrir(nuevo({ medios, tipo: pend.tipo || (medios.some(m => m.tipo === 'video') ? 'reel' : medios.length > 1 ? 'carrusel' : 'post'), texto: pend.texto || '', hashtags: pend.hashtags || '', productoId: pend.productoId || '' })); ponTab('crear'); return;
    }
    if (ps[0] === 'producto' && ps[1] && byId('productos', ps[1])) {
      const fotos = fotosProducto(ps[1]).slice(0, 10).map(a => ({ id: a.id, tipo: 'foto', nombre: a.nombre }));
      tab = 'crear'; abrir(nuevo({ medios: fotos, tipo: fotos.length > 1 ? 'carrusel' : 'post', productoId: ps[1] })); ponTab('crear');
      history.replaceState(null, '', '#/instagram');
      const b = panel.querySelector('.ig-ia'); if (b && can('ia.usar')) escribirIA(b); return;
    }
    if (ps[0] && byId('redes', ps[0])) { tab = 'crear'; abrir(deFila(byId('redes', ps[0]))); ponTab('crear'); return; }
    ponTab(tab);
  }
  pintaCab();
  cargarEstado().then(() => { if (tab !== 'crear') pintaTab(); else if (st) { pintaCab(); pintaPanel(); pintaPrevia(); } else pintaCab(); if (cuenta() && cuenta().ok && !perfil) cargarPerfil().then(() => { if (tab === 'crear' && st) pintaPanel(); }); if (cuenta() && cuenta().ok && !coms && tab !== 'comentarios') cargarComentarios(); });
  aplicar(params);
  // si hay alguna «subiendo» de antes, se mira cómo va
  sondeo = setInterval(() => { const r = igRows().find(x => x.ig && x.ig.estado === 'procesando'); if (r && document.visibilityState === 'visible') api('ig.comprobar', { id: r.id }, { quiet: true }).then(x => { upsertLocal('redes', x); emit(); if (st && st.id === x.id) pintaEstadoPub(x); }).catch(() => { }); }, 20000);
  window.__cdIg = { get st() { return st; }, deshacer, rehacer, get estado() { return estado; }, aJpeg };
  return {
    params: aplicar,
    update: () => { if (tab === 'calendario') { if (!arrastrando && firmaDeCal() !== firmaCal) pintaCalendario(); } else if (tab === 'feed') { const f = firmaDeCal(); if (f !== firmaFeed) { firmaFeed = f; pintaFeed(); } } else if (tab === 'crear' && st && st.id) { const r = byId('redes', st.id); if (r) pintaEstadoPub(r); } },
    destroy: () => { quitaTeclas(); clearTimeout(tApunte); clearInterval(sondeo); }
  };
}
