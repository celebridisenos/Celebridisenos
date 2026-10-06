// ================= v15.3 · 🎬 REELS AUTOMÁTICOS =================
// Eliges un producto → sale un Reel hecho (logo, gancho, fotos con movimiento, precio y llamada a la acción) con el estilo
// Minimal, Premium u Oferta. Guion con la IA local (o de plantilla), vista previa al momento, ↶ Deshacer / ↷ Rehacer,
// música de RECURSOS y «🎬 Crear el vídeo»: lo hace Remotion en el PC (desde el móvil se encarga al PC del taller).
import { h, mount, btn, toast, sel, inp, area, copyText, modal } from '../ui.js';
import { S, can, byId, kv } from '../store.js';
import { desktop } from '../desktop.js';
import { downloadBlob } from '../pdfview.js';
import { ESTILOS, FORMATOS, TIPOS, MOVS, nuevaEscena, duracion, proyectoDeProducto, proyectoVacio, guionPlantilla, guionIA } from '../reels/modelo.js';
import { reproductor } from '../reels/previa.js';
import { crearVideo, estadoReels, claveFoto } from '../reels/render.js';
import { historial, teclasDeshacer } from '../biou/pro.js';

const fmtT = s => (Math.round(s * 10) / 10).toLocaleString('es-ES') + ' s';
const fotosDe = prodId => (S.t.archivos || []).filter(a => a.entidad === 'productos' && a.entidadId === prodId && (a.tipo === 'foto' || /^image\//.test(a.mime || '')));

export function render(el, params) {
  let p = null, imgs = new Map(), locales = new Map(), logo = null, tApunte = 0, creando = null, resultado = null, nGuion = 0;
  const cv = h('canvas.rl-cv', { 'aria-label': 'Vista previa del Reel' });
  const bPlay = btn('▶ Ver', () => { if (rep.play) rep.pausar(); else rep.reproducir(); pintaPlay(); }, { cls: 'sm primary rl-play' });
  const barra = h('input.rl-barra', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Momento del Reel', oninput: () => { rep.pausar(); pintaPlay(); rep.ir(Number(barra.value) / 1000 * duracion(p)); } });
  const reloj = h('span.tiny.muted.rl-reloj', '0 s');
  const panel = h('div.rl-panel'), resBox = h('div.rl-res');
  const bDes = btn('↶ Deshacer', () => deshacer(), { cls: 'sm', title: 'Deshacer (Ctrl+Z)' }), bReh = btn('↷ Rehacer', () => rehacer(), { cls: 'sm', title: 'Rehacer (Ctrl+Y)' });
  bDes.setAttribute('aria-label', 'Deshacer'); bReh.setAttribute('aria-label', 'Rehacer'); bDes.disabled = bReh.disabled = true;
  const hist = historial(e => { bDes.disabled = !e.atras; bReh.disabled = !e.adelante; });
  const rep = reproductor(cv, () => ({ p: p && Object.assign({}, p, { __marca: (S.cfg.empresa && S.cfg.empresa.nombre) || 'CelebriDiseños' }), imgs, logo }));
  rep.alCambiar((t, D) => { barra.value = D ? Math.round(t / D * 1000) : 0; reloj.textContent = fmtT(t) + ' / ' + fmtT(D); });
  const pintaPlay = () => { bPlay.textContent = rep.play ? '⏸ Pausa' : '▶ Ver'; };

  el.append(h('div.page-head', h('div.grow', h('h1', '🎬 Reels'), h('p.small.muted', { style: { margin: '2px 0 0' } }, 'Elige un producto y sale un Reel hecho. Cambia lo que quieras y pulsa «Crear el vídeo».')),
    btn('Nuevo Reel', () => nuevo(), { cls: 'ghost', icon: 'plus' })),
    h('div.rl-herr', bDes, bReh),
    h('div.rl', h('div.rl-izq', h('div.rl-marco', cv), h('div.row', { style: { gap: '8px', alignItems: 'center', marginTop: '8px' } }, bPlay, barra, reloj), resBox), panel));

  // ---------- historial ----------
  const apuntar = () => { clearTimeout(tApunte); if (p) hist.apuntar(p); };
  function cambio(estructura) { // algo cambió: vista previa al momento, guardar el borrador y un paso de «Deshacer»
    if (estructura) pintaPanel();
    if (!rep.play) rep.pinta();
    clearTimeout(tApunte); tApunte = setTimeout(() => { apuntar(); guardarBorrador(); }, 450);
  }
  function restaurar(x) { if (!x) return; p = x; cargarImagenes().then(() => rep.pinta()); pintaPanel(); rep.pinta(); guardarBorrador(); }
  function deshacer() { if (!p) return; apuntar(); restaurar(hist.atras()); }
  function rehacer() { if (!p) return; apuntar(); restaurar(hist.adelante()); }
  const quitaTeclas = teclasDeshacer(deshacer, rehacer);

  // ---------- fotos ----------
  async function blobDe(f) {
    if (!f) return null;
    if (f.local) return locales.get(f.local) || null;
    const F = await import('../files.js'), a = byId('archivos', f.id);
    if (!a) throw new Error('No encuentro una de las fotos.');
    return F.fetchFile(a);
  }
  async function cargarImagenes() {
    const pend = (p ? p.escenas : []).map(s => s.foto).filter(f => f && !imgs.has(claveFoto(f)));
    await Promise.all(pend.map(async f => {
      const k = claveFoto(f); imgs.set(k, null);
      try { const b = await blobDe(f); if (!b) return; const im = new Image(); im.src = URL.createObjectURL(b); await im.decode(); imgs.set(k, im); } catch (e) { imgs.delete(k); }
    }));
    if (logo === null) { logo = false; try { const { logoBlob } = await import('../reels/render.js'); const b = await logoBlob(); if (b) { const im = new Image(); im.src = URL.createObjectURL(b); await im.decode(); logo = im; } } catch (e) { } }
  }
  function elegirFoto(alElegir) { // de las fotos del producto o de este aparato
    const fin = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, 'aria-label': 'Foto del aparato', onchange: () => { const f = fin.files[0]; if (!f) return; const k = 'l' + Date.now().toString(36); locales.set(k, f); alElegir({ local: k }); } });
    const fotos = p.productoId ? fotosDe(p.productoId) : [];
    if (!fotos.length) { document.body.append(fin); fin.click(); setTimeout(() => fin.remove(), 60000); return; }
    let m = null;
    const elige = f => { if (m) m.close(); alElegir(f); };
    fin.onchange = () => { const f = fin.files[0]; if (!f) return; const k = 'l' + Date.now().toString(36); locales.set(k, f); elige({ local: k }); };
    m = modal('Elegir foto', h('div.col', { style: { gap: '10px' } },
      h('div.rl-fotos', fotos.map(a => h('button.rl-fotoel', { type: 'button', 'data-foto': a.id, title: a.nombre, onclick: () => elige({ id: a.id }) }, a.miniatura ? h('img', { src: a.miniatura, alt: a.nombre || 'Foto' }) : h('span', a.nombre)))),
      btn('📱 Una foto de este aparato…', () => fin.click(), { cls: 'sm ghost' }), fin), close => [btn('Cerrar', close)], { size: 'narrow' });
  }

  // ---------- proyecto ----------
  async function abrir(x, sinHist) {
    p = x; resultado = null; mount(resBox); await cargarImagenes(); if (!sinHist) hist.vaciar(p);
    pintaPanel(); rep.ir(0); guardarBorrador();
  }
  function nuevo() { rep.pausar(); pintaPlay(); abrir(proyectoVacio()); }
  async function deProducto(id, estilo, guion) {
    const prod = byId('productos', id); if (!prod) return;
    const fotos = fotosDe(id); const prin = prod.fotoId && fotos.find(a => a.id === prod.fotoId);
    const orden = prin ? [prin].concat(fotos.filter(a => a !== prin)) : fotos;
    const np = proyectoDeProducto(prod, { estilo: estilo || (p && p.estilo) || 'minimal', formato: (p && p.formato) || '9:16', fotos: orden.slice(0, 3).map(a => ({ id: a.id })), guion });
    if (p && p.musica) np.musica = p.musica;
    if (p) { apuntar(); p = np; await cargarImagenes(); pintaPanel(); rep.ir(0); cambio(); } else await abrir(np);
  }
  async function guardarBorrador() { if (!p) return; try { const l = ((await kv.get('reels.borradores')) || []).filter(x => x.id !== p.id); l.unshift(JSON.parse(JSON.stringify(p, (k, v) => k === 'local' ? undefined : v))); await kv.set('reels.borradores', l.slice(0, 20)); } catch (e) { } }

  // ---------- guion ----------
  async function guion(conIA, b) {
    const prod = p.productoId ? byId('productos', p.productoId) : null;
    let g;
    if (conIA) {
      const t0 = b.textContent; b.disabled = true;
      try { g = await guionIA(prod, p.estilo, { onStatus: t => { b.textContent = t; } }); toast('✨ Guion escrito por la IA. Si no te gusta, ↶ Deshacer.', 'ok'); }
      catch (e) { toast(e.message + ' Uso una plantilla.', 'warn', 7000); g = guionPlantilla(prod, p.estilo, ++nGuion); }
      finally { b.disabled = false; b.textContent = t0; }
    } else g = guionPlantilla(prod, p.estilo, ++nGuion);
    apuntar();
    p.escenas.forEach(s => {
      if (s.tipo === 'gancho') s.texto = g.gancho;
      else if (s.tipo === 'producto' && s.titulo) { s.titulo = g.titulo; s.texto = g.texto; }
      else if (s.tipo === 'precio' && g.precioTexto !== undefined) s.texto = g.precioTexto;
      else if (s.tipo === 'cta') s.texto = g.cta;
    });
    p.caption = g.caption; p.hashtags = g.hashtags;
    cambio(true);
  }

  // ---------- el vídeo ----------
  async function crear(b) {
    if (creando) return;
    creando = new AbortController(); const estado = h('div.rl-estado', h('div.rl-prog', h('i', { style: { width: '0%' } })), h('span.rl-msg', 'Empezando…'));
    mount(resBox, estado, btn('Cancelar', () => creando && creando.abort(), { cls: 'sm ghost' }));
    b.disabled = true;
    try {
      const r = await crearVideo(p, blobDe, { signal: creando.signal, onStatus: (t, pc) => { estado.querySelector('.rl-msg').textContent = t; if (pc != null) estado.querySelector('.rl-prog i').style.width = Math.max(2, Math.min(100, pc)) + '%'; } });
      resultado = r; mostrarResultado();
      toast('🎬 ¡Reel listo!' + (r.salida ? ' Guardado en ' + r.salida : ''), 'ok', 8000);
    } catch (e) { mount(resBox); if (e.name !== 'AbortError') toast(e.message, 'bad', 10000); }
    finally { creando = null; b.disabled = false; }
  }
  function mostrarResultado() {
    if (!resultado) return mount(resBox);
    const url = URL.createObjectURL(resultado.blob), nom = String(p.nombre || 'reel').replace(/[^\p{L}\p{N} _-]+/gu, '').trim() + '_reel.mp4';
    const file = () => new File([resultado.blob], nom, { type: 'video/mp4' });
    mount(resBox, h('div.rl-hecho', h('div.lbl', '✅ Tu Reel'), h('video.rl-video', { src: url, controls: true, playsInline: true, loop: true, 'aria-label': 'Reel terminado' }),
      resultado.salida ? h('p.tiny.muted', '💾 Guardado en ' + resultado.salida) : null,
      resultado.musica ? h('p.tiny.muted', '🎵 ' + resultado.musica) : null,
      h('div.row.wrap', { style: { gap: '6px' } },
        btn('⬇️ Descargar', () => downloadBlob(file(), nom), { cls: 'sm primary' }),
        btn('📤 Compartir', async () => { const f = file(); try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: p.nombre, text: (p.caption || '') + '\n\n' + (p.hashtags || '') }); else { downloadBlob(f, nom); toast('Este aparato no deja compartir: se ha descargado.', 'ok'); } } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'bad'); } }, { cls: 'sm' }),
        p.productoId && can('productos.editar') && can('archivos.subir') ? btn('🧩 Guardar en el producto', async ev => {
          const bb = ev.currentTarget; bb.disabled = true;
          try { const F = await import('../files.js'); if (resultado.archivo) { const { api } = await import('../store.js'); await api('archivos.vincular', { id: resultado.archivo.id, entidad: 'productos', entidadId: p.productoId }); } else await F.uploadFile(file(), { entidad: 'productos', entidadId: p.productoId, original: true }); toast('🧩 Reel guardado en «' + (byId('productos', p.productoId) || {}).nombre + '»', 'ok'); }
          catch (e) { toast(e.message, 'bad'); bb.disabled = false; }
        }, { cls: 'sm' }) : null,
        desktop.on && resultado.salida && !resultado.archivo ? btn('📂 Abrir la carpeta', () => desktop.open(resultado.salida.replace(/[\\/][^\\/]+$/, '')).catch(e => toast(e.message, 'bad')), { cls: 'sm ghost' }) : null,
        can('redes.ver') ? btn('📸 Publicar en Instagram', () => { window.__cdIgPendiente = { tipo: 'reel', medios: resultado.archivo ? [{ id: resultado.archivo.id, tipo: 'video', nombre: nom }] : [{ file: file() }], texto: p.caption || '', hashtags: p.hashtags || '', productoId: p.productoId || '' }; location.hash = '#/instagram'; }, { cls: 'sm rl-ig' }) : null,
        btn('📋 Copiar el texto', () => copyText((p.caption || '') + '\n\n' + (p.hashtags || '')), { cls: 'sm ghost' }))));
  }

  // ---------- panel ----------
  function campo(s, k, t, o = {}) {
    const x = (o.area ? area : inp)({ value: s[k] || '', placeholder: o.ph || '', 'aria-label': t + ' (' + TIPOS[s.tipo].t + ')', rows: o.area ? 2 : undefined, oninput: () => { s[k] = x.value; cambio(); } });
    return h('label.rl-campo', h('span', t), x);
  }
  function tarjetaEscena(s, i) {
    const n = p.escenas.length, mueve = d => { const j = i + d; if (j < 0 || j >= n) return; apuntar(); const a = p.escenas; [a[i], a[j]] = [a[j], a[i]]; cambio(true); };
    const dur = h('input', { type: 'range', min: 10, max: 60, value: Math.round((Number(s.dur) || 2) * 10), 'aria-label': 'Duración de la escena ' + (i + 1), oninput: () => { s.dur = Number(dur.value) / 10; dv.textContent = fmtT(s.dur); cambio(); } }), dv = h('b.es-val', fmtT(s.dur));
    const im = s.foto ? imgs.get(claveFoto(s.foto)) : null;
    const fotoBtn = ['producto', 'gancho', 'precio', 'texto'].includes(s.tipo) ? h('div.rl-foto', im ? h('img', { src: im.src, alt: '' }) : h('span.tiny.muted', s.tipo === 'producto' ? 'Sin foto' : ''),
      btn(s.foto ? 'Cambiar foto' : '+ Foto', () => elegirFoto(f => { apuntar(); s.foto = f; cargarImagenes().then(() => cambio(true)); }), { cls: 'sm ghost' }),
      s.foto && s.tipo !== 'producto' ? btn('Quitar', () => { apuntar(); s.foto = null; cambio(true); }, { cls: 'sm ghost' }) : null) : null;
    return h('div.rl-esc', { 'data-escena': s.tipo, 'data-i': i },
      h('div.rl-esc-cab', h('b', TIPOS[s.tipo].i + ' ' + (i + 1) + '. ' + TIPOS[s.tipo].t), h('span.grow'),
        btn('↑', () => mueve(-1), { cls: 'sm ghost', title: 'Subir' }), btn('↓', () => mueve(1), { cls: 'sm ghost', title: 'Bajar' }),
        btn('🗑', () => { if (n <= 1) return; apuntar(); p.escenas.splice(i, 1); cambio(true); }, { cls: 'sm ghost', title: 'Quitar escena' })),
      s.tipo === 'logo' ? h('p.tiny.muted', 'Tu logo y el nombre de la tienda (Configuración → Empresa).') : null,
      s.tipo === 'gancho' || s.tipo === 'texto' ? campo(s, 'texto', 'Texto', { area: true, ph: 'Pon *una palabra* entre asteriscos para resaltarla' }) : null,
      s.tipo === 'producto' ? [campo(s, 'titulo', 'Título'), campo(s, 'texto', 'Debajo')] : null,
      s.tipo === 'precio' ? [h('div.row', { style: { gap: '6px' } }, campo(s, 'precio', 'Precio'), campo(s, 'antes', 'Antes (tachado)')), campo(s, 'texto', 'Encima')] : null,
      s.tipo === 'cta' ? [campo(s, 'texto', 'Botón'), campo(s, 'sub', 'Debajo', { ph: '@tu_usuario o tu web' })] : null,
      fotoBtn,
      s.tipo === 'producto' ? h('div.row.wrap', { style: { gap: '4px', marginTop: '4px' } }, MOVS.map(([k, t]) => h('button.chip.sm' + ((s.mov || 'zoom') === k ? '.on' : ''), { type: 'button', onclick: () => { apuntar(); s.mov = k; cambio(true); } }, t))) : null,
      h('label.es-bar', h('span', 'Dura'), dur, dv));
  }
  async function seccionMotor(box) {
    if (!desktop.on) { const { api } = await import('../store.js'); const w = await api('pc.servidor', {}, { quiet: true }).catch(() => null); if (box.isConnected) mount(box, h('p.tiny.muted', w ? '🖥️ El vídeo lo hace el PC del taller (' + w.dispositivo + ', encendido ✅).' : '🖥️ El vídeo lo hace el PC del taller. Ahora no está encendido con el programa abierto: tu encargo esperará.')); return; }
    const e = await estadoReels(); if (!box.isConnected) return;
    if (e && e.listo) return mount(box, h('p.tiny.muted', '🎬 Remotion ' + e.remotion + ' listo en este PC (el de EDITOR_VIDEO).'));
    if (e && e.navegadorDescarga && e.navegadorDescarga.estado === 'descargando') { mount(box, h('p.tiny', '⬇️ Preparando el motor de vídeo…')); return setTimeout(() => seccionMotor(box), 2500); }
    if (e && e.remotion && e.node && !e.navegador) return mount(box, h('p.tiny', '🎬 Falta preparar UNA vez el motor de vídeo de Remotion (descarga su navegador, unos 100 MB).' + (e.navegadorDescarga && e.navegadorDescarga.error ? ' Último intento: ' + e.navegadorDescarga.error : '')),
      h('div.row', { style: { gap: '6px' } }, btn('⬇️ Prepararlo ahora', async () => { try { await desktop.reelsNavegador(); seccionMotor(box); } catch (x) { toast(x.message, 'bad'); } }, { cls: 'sm primary' }), btn('Después', () => mount(box, h('p.tiny.muted', 'Vale. Mientras, el vídeo lo hará el PC del taller si está encendido.')), { cls: 'sm ghost' })));
    mount(box, h('p.tiny', '⚠️ Este PC no puede hacer vídeos todavía: ' + (!e ? 'no responde.' : !e.node ? 'falta Node.js.' : 'no encuentro EDITOR_VIDEO con Remotion.') + ' Abre «Centro de IA» para ver cómo arreglarlo. Mientras, se encarga al PC del taller.'));
  }
  async function seccionMusica(box) {
    const m = p.musica, op = [{ v: '', t: '🔇 Sin música' }, { v: 'auto', t: '🎵 Automática (la elige el PC según el estilo)' }];
    let lista = [];
    if (desktop.on) { try { lista = await desktop.reelsMusica(); } catch (e) { } }
    lista.slice(0, 300).forEach(x => op.push({ v: x.path, t: (x.grupo ? x.grupo + ' › ' : '') + x.nombre }));
    if (m && m.path && !lista.some(x => x.path === m.path)) op.push({ v: m.path, t: m.nombre || m.path });
    const s = sel(op, m ? (m.auto ? 'auto' : m.path) : '', { 'aria-label': 'Música', onchange: () => { apuntar(); const v = s.value; p.musica = !v ? null : v === 'auto' ? { auto: true, volumen: vol() } : { path: v, nombre: (lista.find(x => x.path === v) || {}).nombre || v, volumen: vol() }; cambio(); pintaVol(); } });
    const r = h('input', { type: 'range', min: 10, max: 100, value: Math.round(((m && m.volumen) || 0.7) * 100), 'aria-label': 'Volumen de la música', oninput: () => { if (p.musica) { p.musica.volumen = Number(r.value) / 100; cambio(); } } });
    const vol = () => Number(r.value) / 100, volBox = h('label.es-bar', h('span', 'Volumen'), r);
    const pintaVol = () => { volBox.style.display = p.musica ? '' : 'none'; };
    mount(box, s, volBox, !desktop.on ? h('p.tiny.muted', 'La música está en el PC (RECURSOS). Elige «Automática» y la pone el PC.') : lista.length ? null : h('p.tiny.muted', 'No encuentro música en EDITOR_VIDEO\\RECURSOS\\MUSICA.'));
    pintaVol();
  }
  function pintaPanel() {
    if (!p) return mount(panel, h('p.small.muted', 'Cargando…'));
    const prods = (S.t.productos || []).filter(x => x.activo !== false).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
    const prodSel = sel([{ v: '', t: '— Elige un producto —' }].concat(prods.map(x => ({ v: x.id, t: x.nombre + (fotosDe(x.id).length ? ' · 📸 ' + fotosDe(x.id).length : '') }))), p.productoId || '', { 'aria-label': 'Producto del Reel' });
    const motor = h('div.rl-motor'), musica = h('div.rl-musica');
    const bCrear = btn('🎬 Crear el vídeo', ev => crear(ev.currentTarget), { cls: 'primary rl-crear' });
    const nombre = inp({ value: p.nombre || '', 'aria-label': 'Nombre del Reel', oninput: () => { p.nombre = nombre.value; cambio(); } });
    const cap = area({ value: p.caption || '', rows: 3, 'aria-label': 'Texto para publicar', oninput: () => { p.caption = cap.value; cambio(); } });
    const hash = inp({ value: p.hashtags || '', 'aria-label': 'Hashtags', oninput: () => { p.hashtags = hash.value; cambio(); } });
    const nuevoTipo = sel([{ v: '', t: '+ Añadir escena…' }].concat(Object.keys(TIPOS).map(k => ({ v: k, t: TIPOS[k].i + ' ' + TIPOS[k].t }))), '', { 'aria-label': 'Añadir escena', onchange: () => { const k = nuevoTipo.value; if (!k) return; apuntar(); const g = guionPlantilla(p.productoId ? byId('productos', p.productoId) : null, p.estilo); const o = k === 'gancho' ? { texto: g.gancho } : k === 'texto' ? { texto: 'Escribe aquí' } : k === 'cta' ? { texto: g.cta } : k === 'producto' ? { titulo: '', texto: '' } : k === 'precio' ? { precio: '', texto: '' } : {}; const i = p.escenas.findIndex(s => s.tipo === 'cta'); p.escenas.splice(i < 0 ? p.escenas.length : i, 0, nuevaEscena(k, o)); cambio(true); } });
    mount(panel,
      h('div.es-sec', h('div.lbl', '1 · Producto'), prodSel,
        h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } },
          btn('✨ Hacer el Reel de este producto', () => { if (!prodSel.value) return toast('Elige un producto.', 'warn'); deProducto(prodSel.value); }, { cls: 'sm primary rl-deprod' }))),
      h('div.es-sec', h('div.lbl', '2 · Estilo'), h('div.rl-estilos', Object.entries(ESTILOS).map(([k, e]) => h('button.rl-estilo' + (p.estilo === k ? '.on' : ''), { type: 'button', 'data-estilo': k, style: { background: e.fondo, color: e.texto }, onclick: () => { if (p.estilo === k) return; apuntar(); p.estilo = k; cambio(true); } },
        h('b', { style: { fontFamily: e.fuenteTitulo, color: e.acento } }, e.nombre), h('span', e.d)))),
        h('div.row.wrap', { style: { gap: '6px', marginTop: '8px' } }, Object.entries(FORMATOS).map(([k, f]) => h('button.chip.sm' + (p.formato === k ? '.on' : ''), { type: 'button', 'data-formato': k, title: f.t, onclick: () => { apuntar(); p.formato = k; cambio(true); } }, k)))),
      h('div.es-sec', h('div.lbl', '3 · Guion'), h('div.row.wrap', { style: { gap: '6px' } },
        btn('✨ Guion con IA', ev => guion(true, ev.currentTarget), { cls: 'sm rl-ia' }), btn('🔁 Otro de plantilla', ev => guion(false, ev.currentTarget), { cls: 'sm ghost' }))),
      h('div.es-sec', h('div.lbl', '4 · Escenas · ' + fmtT(duracion(p))), h('div.rl-escenas', p.escenas.map(tarjetaEscena)), nuevoTipo),
      h('div.es-sec', h('div.lbl', '5 · Música'), musica),
      h('div.es-sec', h('div.lbl', '6 · Texto para publicar'), cap, hash, h('div.row', { style: { gap: '6px', marginTop: '6px' } }, btn('📋 Copiar', () => copyText((p.caption || '') + '\n\n' + (p.hashtags || '')), { cls: 'sm ghost' }))),
      h('div.es-sec.rl-final', h('label.rl-campo', h('span', 'Nombre del archivo'), nombre), bCrear, motor));
    seccionMotor(motor); seccionMusica(musica);
  }

  // ---------- arranque: el borrador de antes, un producto (#/reels/producto/ID) o uno nuevo ----------
  (async () => {
    if (params && params[0] === 'producto' && params[1] && byId('productos', params[1])) { p = null; await deProducto(params[1], params[2]); return; }
    let b = null; try { b = ((await kv.get('reels.borradores')) || [])[0]; } catch (e) { }
    await abrir(b && b.escenas ? b : proyectoVacio());
  })();
  window.__cdReels = { get p() { return p; }, rep, deshacer, rehacer, deProducto };
  return {
    params: ps => { if (ps && ps[0] === 'producto' && ps[1]) deProducto(ps[1], ps[2]); },
    destroy: () => { rep.destruir(); quitaTeclas(); clearTimeout(tApunte); if (creando) creando.abort(); guardarBorrador(); }
  };
}
