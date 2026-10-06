// ================= v15.3 · 🧠 CENTRO DE IA =================
// Todo lo «inteligente» del programa en un sitio, con un SEMÁFORO 🟢🟡🔴 y un botón «🔧 Solucionar» en cada pieza:
//   🚦 Estado: IA de texto, IA de fotos (fondo y caras), motor de vídeo (Remotion), PC del taller, Instagram y servidor.
//   🖼️ Biblioteca: todas las fotos y vídeos (productos, Reels, Instagram…) para usarlos en un clic.
//   💡 Ideas para la IA: genera instrucciones («prompts») para fotos, vídeos y textos de un producto.
//   ⬇️ Descargas: lo que se puede añadir, con su tamaño. NADA se descarga sin pulsar y confirmar.
// Lo pesado se hace SOLO en el PC: en el móvil se ve el estado y se encarga al PC del taller.
import { h, mount, btn, toast, sel, inp, area, copyText, confirmDlg, bytes, ago, sw } from '../ui.js';
import { S, can, api, byId, APP_VERSION } from '../store.js';
import { go } from '../app.js';
import { desktop } from '../desktop.js';

const LUZ = { ok: ['🟢', 'Todo bien'], warn: ['🟡', 'Funciona, con un aviso'], bad: ['🔴', 'No funciona'], off: ['⚪', 'No hace falta aquí'] };
const esVideo = a => a.tipo === 'video' || /^video\//.test(a.mime || '');

export function render(el, params) {
  let tab = (params && params[0]) || (() => { try { return localStorage.getItem('cd.centroia.tab') || 'estado'; } catch (e) { return 'estado'; } })();
  const tabs = h('div.seg.ci-tabs'), cuerpo = h('div.ci-cuerpo');
  el.append(h('div.page-head', h('div.grow', h('h1', '🧠 Centro de IA'), h('p.small.muted', { style: { margin: '2px 0 0' } }, 'Mira si todo funciona y arréglalo con un botón.'))), tabs, cuerpo);
  const TABS = [['estado', '🚦 Estado'], ['biblioteca', '🖼️ Biblioteca'], ['prompts', '💡 Ideas para la IA'], ['descargas', '⬇️ Descargas']];
  function ponTab(k) { tab = k; try { localStorage.setItem('cd.centroia.tab', k); } catch (e) { } mount(tabs, TABS.map(([v, t]) => h('button' + (tab === v ? '.on' : ''), { type: 'button', 'data-tab': v, onclick: () => ponTab(v) }, t))); pinta(); }
  function pinta() { if (tab === 'biblioteca') return biblioteca(); if (tab === 'prompts') return prompts(); if (tab === 'descargas') return descargas(); return semaforo(); }

  // =================== 🚦 SEMÁFORO ===================
  async function semaforo() {
    const lista = h('div.ci-lista'), resumen = h('div.ci-resumen');
    mount(cuerpo, resumen, lista, h('div.row', { style: { marginTop: '10px' } }, btn('↻ Volver a comprobar', () => semaforo(), { cls: 'sm' })));
    const filas = {};
    const fila = (k, ic, nombre) => { filas[k] = h('div.ci-fila', { 'data-k': k }, h('span.ci-luz', '⏳'), h('div.grow', h('div.ci-nombre', ic + ' ' + nombre), h('div.ci-det', 'Comprobando…'))); lista.append(filas[k]); };
    const res = {};
    const pon = (k, luz, det, arreglo) => {
      res[k] = luz; const f = filas[k]; f.dataset.luz = luz;
      mount(f, h('span.ci-luz', { title: LUZ[luz][1] }, LUZ[luz][0]), h('div.grow', h('div.ci-nombre', f.dataset.titulo), h('div.ci-det', det)), arreglo ? btn('🔧 Solucionar', arreglo, { cls: 'sm ci-arreglar' + (luz === 'bad' ? ' primary' : '') }) : null);
    };
    [['servidor', '☁️', 'Servidor del negocio'], ['texto', '✍️', 'IA de texto (escribir y responder)'], ['fotos', '📸', 'IA de fotos (quitar fondo y caras)'], ['video', '🎬', 'Motor de vídeo (Reels)'], ['taller', '🖥️', 'PC del taller (hace el trabajo de los móviles)'], ['instagram', '📷', 'Instagram']].forEach(([k, i, n]) => { fila(k, i, n); filas[k].dataset.titulo = i + ' ' + n; });
    const todo = [];
    // servidor
    todo.push((async () => {
      try { const t0 = Date.now(), p = await api('sys.ping', {}, { quiet: true, timeout: 15000 }); const v = p.version;
        if (v && v !== APP_VERSION) pon('servidor', 'warn', 'Responde, pero tiene la versión ' + v + ' y la app la ' + APP_VERSION + '.', () => ayuda('Actualizar el servidor', ['Abre script.google.com → proyecto CelebriDiseños.', 'Pega el Servidor.gs nuevo y guarda (Ctrl + S).', 'Implementar → Gestionar implementaciones → ✏️ → Nueva versión → Implementar.']));
        else pon('servidor', 'ok', 'Responde en ' + (Date.now() - t0) + ' ms · versión ' + v + '.');
      } catch (e) { pon('servidor', 'bad', 'No responde: ' + e.message, () => ayuda('Sin conexión con el servidor', ['Mira que haya Internet.', 'Si sigue, abre «Estado del sistema» para ver más detalles.'], () => go('estado'))); }
    })());
    // IA de texto
    todo.push((async () => {
      if (desktop.on) {
        const { localStatus, invalidateStatus } = await import('../ai/models.js'); invalidateStatus();
        const s = await localStatus(true);
        if (s.disponible) return pon('texto', 'ok', 'Funciona en este PC con el modelo ' + s.modelo + '.');
        let w = null; try { w = await api('ia.servidor', {}, { quiet: true }); } catch (e) { }
        return pon('texto', w ? 'warn' : 'bad', (s.motivo || 'La IA de este PC no está lista.') + (w ? ' Mientras, la hace ' + (w.dispositivo || 'otro PC') + '.' : ''), () => go('ia'));
      }
      let w = null; try { w = await api('ia.servidor', {}, { quiet: true }); } catch (e) { }
      pon('texto', w ? 'ok' : 'warn', w ? 'La hace el PC ' + (w.dispositivo || 'del taller') + ' (encendido ✅).' : 'El PC con la IA no está encendido con el programa abierto. Cuando lo esté, funciona sola.');
    })());
    // fotos y vídeo (solo se miran en el PC)
    let w = null;
    todo.push((async () => { try { w = await api('pc.servidor', {}, { quiet: true }); } catch (e) { } })());
    await Promise.all(todo.splice(0));
    if (desktop.on) {
      todo.push((async () => {
        let e = null; try { e = await desktop.motorEstado(true); } catch (x) { }
        if (!e) return pon('fotos', 'bad', 'El programa del PC no responde. Ciérralo y ábrelo otra vez.');
        const hay = (e.modelos || []).filter(m => m.presente);
        if (!e.listo) return pon('fotos', 'bad', e.error || 'No encuentro el Python de EDITOR_VIDEO (lo instala su INSTALAR.bat).', () => ayuda('Preparar la IA de fotos', ['Abre la carpeta EDITOR_VIDEO.', 'Haz doble clic en INSTALAR.bat y espera a que acabe.', 'Vuelve aquí y pulsa «↻ Volver a comprobar».']));
        if (!hay.length) return pon('fotos', 'warn', 'Listo, pero falta descargar un modelo para quitar fondos.', () => ponTab('descargas'));
        pon('fotos', 'ok', 'Listo · ' + hay.map(m => m.nombre).join(', ') + (e.caras ? ' · caras con IA ✅' : ''));
      })());
      todo.push((async () => {
        let e = null; try { e = await desktop.reelsEstado(); } catch (x) { }
        if (!e) return pon('video', 'bad', 'El programa del PC no responde.');
        if (e.listo) return pon('video', 'ok', 'Remotion ' + e.remotion + ' (el de EDITOR_VIDEO) y Node ' + (e.nodeVersion || '') + '.');
        if (!e.node || !e.remotion) return pon('video', 'bad', !e.node ? 'Falta Node.js.' : 'No encuentro EDITOR_VIDEO con Remotion.', () => ayuda('Preparar el motor de vídeo', ['Abre la carpeta EDITOR_VIDEO.', 'Haz doble clic en INSTALAR.bat (instala Node y Remotion).', 'Vuelve aquí y pulsa «↻ Volver a comprobar».']));
        pon('video', 'warn', 'Falta preparar UNA vez su navegador (unos 100 MB).', () => ponTab('descargas'));
      })());
      const activo = (() => { try { return localStorage.getItem('cd.pcServidor') !== '0'; } catch (e) { return true; } })();
      if (!can('ia.servidor')) pon('taller', 'off', 'Tu usuario no hace de PC del taller' + (w ? '. Ahora lo hace ' + w.dispositivo + '.' : '.'));
      else pon('taller', activo ? (w ? 'ok' : 'warn') : 'warn', activo ? (w ? 'Este PC (u otro: ' + w.dispositivo + ') atiende los encargos de los móviles.' : 'Activado: en unos segundos empezará a atender a los móviles.') : 'Este PC NO atiende los encargos de los móviles.',
        activo ? null : () => { try { localStorage.setItem('cd.pcServidor', '1'); } catch (e) { } import('../trabajospc.js').then(m => m.startTrabajadorPC && m.startTrabajadorPC()).catch(() => { }); toast('🖥️ Este PC ya atiende a los móviles', 'ok'); setTimeout(semaforo, 1500); });
      if (can('ia.servidor')) filas.taller.append(h('label.check.ci-sw', sw(activo, v => { try { localStorage.setItem('cd.pcServidor', v ? '1' : '0'); } catch (e) { } if (v) import('../trabajospc.js').then(m => m.startTrabajadorPC && m.startTrabajadorPC()).catch(() => { }); toast(v ? 'Este PC atiende a los móviles' : 'Este PC deja de atender a los móviles', 'ok'); }), 'Atender'));
    } else {
      const t = w ? 'Lo hace el PC del taller (' + w.dispositivo + ', encendido ✅). El móvil no hace nada pesado.' : 'Lo hace el PC del taller. Ahora no está encendido con el programa abierto: tus encargos esperan.';
      pon('fotos', w ? 'ok' : 'warn', t); pon('video', w ? 'ok' : 'warn', t);
      pon('taller', w ? 'ok' : 'warn', w ? w.dispositivo + ' está encendido y atiende los encargos.' : 'Ningún PC atiende ahora. Enciende el PC del taller y abre el programa.');
    }
    todo.push((async () => {
      if (!can('redes.ver')) return pon('instagram', 'off', 'Sin permiso para ver las redes.');
      let e = null; try { e = await api('ig.estado', {}, { quiet: true }); } catch (x) { return pon('instagram', 'warn', 'Actualiza el servidor para usar Instagram Studio.'); }
      if (!e.cuentas.length) return pon('instagram', 'warn', 'No hay ninguna cuenta conectada (puedes preparar y publicar a mano).', () => go('instagram'));
      const mal = e.cuentas.filter(c => !c.ok);
      if (mal.length) return pon('instagram', 'bad', mal.map(c => '@' + c.usuario + ': ' + (c.error || 'hay que volver a conectarla')).join(' · '), () => go('instagram'));
      pon('instagram', 'ok', e.cuentas.map(c => '@' + c.usuario).join(', ') + ' conectada' + (e.cuentas.length > 1 ? 's' : '') + '. El permiso se renueva solo.');
    })());
    await Promise.all(todo);
    const n = { ok: 0, warn: 0, bad: 0 }; Object.values(res).forEach(v => { if (n[v] !== undefined) n[v]++; });
    mount(resumen, h('div.ci-resumen-in.' + (n.bad ? 'bad' : n.warn ? 'warn' : 'ok'), h('span', n.bad ? '🔴' : n.warn ? '🟡' : '🟢'),
      h('b', n.bad ? n.bad + (n.bad > 1 ? ' cosas no funcionan' : ' cosa no funciona') + '. Pulsa «🔧 Solucionar».' : n.warn ? 'Todo funciona, con ' + n.warn + (n.warn > 1 ? ' avisos' : ' aviso') + '.' : '¡Todo funciona!')));
  }
  function ayuda(titulo, pasos, accion) {
    import('../ui.js').then(({ modal }) => modal('🔧 ' + titulo, h('ol.ci-pasos', pasos.map(p => h('li', p))), close => [btn('Cerrar', close), accion ? btn('Ir', () => { close(); accion(); }, { cls: 'primary' }) : null], { size: 'narrow' }));
  }

  // =================== 🖼️ BIBLIOTECA MULTIMEDIA ===================
  let filtro = 'todo', q = '', cuantos = 60;
  function biblioteca() {
    const buscar = inp({ type: 'search', value: q, placeholder: 'Buscar por nombre o producto…', 'aria-label': 'Buscar', oninput: () => { q = buscar.value; cuantos = 60; pintaRejilla(); } });
    const FIL = [['todo', 'Todo'], ['foto', '📸 Fotos'], ['video', '🎬 Vídeos'], ['reel', '🎞️ Reels'], ['productos', '📦 De productos'], ['redes', '📷 De redes']];
    const chips = h('div.row.wrap', { style: { gap: '6px' } }, FIL.map(([k, t]) => h('button.chip' + (filtro === k ? '.on' : ''), { type: 'button', 'data-f': k, onclick: () => { filtro = k; cuantos = 60; biblioteca(); } }, t)));
    const rej = h('div.ci-rejilla'), mas = h('div');
    mount(cuerpo, h('div.col', { style: { gap: '10px' } }, buscar, chips, rej, mas));
    function pintaRejilla() {
      const n = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const l = (S.t.archivos || []).filter(a => a.tipo === 'foto' || esVideo(a) || /^image\//.test(a.mime || ''))
        .filter(a => filtro === 'todo' || (filtro === 'foto' && !esVideo(a)) || (filtro === 'video' && esVideo(a)) || (filtro === 'reel' && /_reel\.mp4$|reel/i.test(a.nombre)) || a.entidad === filtro)
        .filter(a => !q || n(a.nombre + ' ' + ((a.entidad === 'productos' && (byId('productos', a.entidadId) || {}).nombre) || '')).includes(n(q)))
        .sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
      if (!l.length) { mount(rej, h('p.muted', 'No hay nada con este filtro.')); return mount(mas); }
      mount(rej, l.slice(0, cuantos).map(a => h('button.ci-medio', { type: 'button', 'data-id': a.id, title: a.nombre, onclick: () => acciones(a) },
        a.miniatura ? h('img', { src: a.miniatura, alt: a.nombre, loading: 'lazy' }) : h('span.ci-medio-i', esVideo(a) ? '🎬' : '🖼️'), esVideo(a) ? h('span.ci-medio-v', '▶') : null,
        h('span.ci-medio-n', a.entidad === 'productos' ? (byId('productos', a.entidadId) || {}).nombre || a.nombre : a.nombre))));
      mount(mas, l.length > cuantos ? btn('Ver más (' + (l.length - cuantos) + ')', () => { cuantos += 60; pintaRejilla(); }, { cls: 'sm' }) : h('p.tiny.muted', l.length + ' en total'));
    }
    pintaRejilla();
  }
  function acciones(a) {
    import('../ui.js').then(({ modal }) => {
      const m = modal(a.nombre, h('div.col', { style: { gap: '8px' } },
        a.miniatura ? h('img.ci-grande', { src: a.miniatura, alt: '' }) : null,
        h('p.tiny.muted', [a.entidad === 'productos' ? '📦 ' + ((byId('productos', a.entidadId) || {}).nombre || '') : a.entidad, a.creado ? ago(a.creado) : '', a.tamano ? bytes(a.tamano) : ''].filter(Boolean).join(' · ')),
        btn('👁️ Ver', () => import('../files.js').then(F => F.openFile(a)), { cls: 'sm' }),
        can('redes.ver') ? btn('📸 Publicar en Instagram', () => { m.close(); window.__cdIgPendiente = { medios: [{ id: a.id, tipo: esVideo(a) ? 'video' : 'foto', nombre: a.nombre }], productoId: a.entidad === 'productos' ? a.entidadId : '' }; go('instagram'); }, { cls: 'sm primary' }) : null,
        a.entidad === 'productos' ? btn('🎬 Hacer un Reel de este producto', () => { m.close(); go('reels/producto/' + a.entidadId); }, { cls: 'sm' }) : null,
        btn('⬇️ Descargar', async () => { try { const F = await import('../files.js'); F.download(await F.fetchFile(a), a.nombre); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm ghost' })), close => [btn('Cerrar', close)], { size: 'narrow' });
    });
  }

  // =================== 💡 GENERADOR DE PROMPTS ===================
  const PTIPOS = {
    foto: { t: '📸 Foto de producto', es: p => `Fotografía profesional de producto de ${p}, ESTILO, iluminación suave de estudio, fondo limpio, enfoque nítido, sombras naturales, alta resolución, composición centrada, formato FORMATO.`, en: p => `Professional product photography of ${p}, STYLE, soft studio lighting, clean background, sharp focus, natural shadows, high resolution, centered composition, FORMAT aspect ratio.` },
    escena: { t: '🏡 Producto en una escena', es: p => `${p} colocado en un ambiente real ESTILO, luz natural de ventana, profundidad de campo, sensación acogedora y auténtica, formato FORMATO, sin texto.`, en: p => `${p} placed in a real-life setting, STYLE, natural window light, shallow depth of field, cozy authentic feeling, FORMAT aspect ratio, no text.` },
    video: { t: '🎬 Vídeo / Reel', es: p => `Vídeo vertical de 8 segundos de ${p}: plano inicial cercano con giro lento de cámara, luz ESTILO, transición suave a plano general, final con el producto centrado. Movimiento fluido, aspecto cinematográfico, formato FORMATO.`, en: p => `8-second vertical video of ${p}: opening close-up with slow camera orbit, STYLE lighting, smooth transition to wide shot, ending with the product centered. Fluid motion, cinematic look, FORMAT aspect ratio.` },
    texto: { t: '✍️ Texto de anuncio', es: p => `Escribe 3 textos cortos para anunciar ${p} en Instagram con tono ESTILO: una frase gancho, 2 beneficios reales y una llamada a la acción. Español de España, con 2-3 emojis.`, en: p => `Write 3 short Instagram ad copies for ${p} with a STYLE tone: a hook, 2 real benefits and a call to action.` }
  };
  const ESTILOS_P = { minimal: ['minimalista, colores neutros', 'minimalist, neutral colors'], lujo: ['elegante y de lujo, tonos dorados y negros', 'luxury and elegant, gold and black tones'], navidad: ['navideño, luces cálidas y detalles de Navidad', 'Christmas mood, warm lights and festive details'], verano: ['veraniego, luz brillante y colores alegres', 'summery, bright light and cheerful colors'], natural: ['natural, madera y plantas', 'natural, wood and plants'], divertido: ['divertido y colorido', 'fun and colorful'] };
  let pr = { tipo: 'foto', estilo: 'minimal', formato: '4:5', productoId: '', extra: '' };
  function prompts() {
    const prods = (S.t.productos || []).filter(x => x.activo !== false).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
    const sP = sel([{ v: '', t: '— Elige un producto —' }].concat(prods.map(p => ({ v: p.id, t: p.nombre }))), pr.productoId, { 'aria-label': 'Producto', onchange: () => { pr.productoId = sP.value; prompts(); } });
    const sF = sel(['4:5', '1:1', '9:16', '16:9'], pr.formato, { 'aria-label': 'Formato', onchange: () => { pr.formato = sF.value; prompts(); } });
    const extra = inp({ value: pr.extra, placeholder: 'Algo más (opcional): «con flores», «sobre mármol»…', 'aria-label': 'Detalle extra', onchange: () => { pr.extra = extra.value; prompts(); } });
    const prod = pr.productoId ? byId('productos', pr.productoId) : null;
    const desc = prod ? [prod.nombre, prod.color, prod.material, prod.tamano].filter(Boolean).join(', ') : 'tu producto';
    const T = PTIPOS[pr.tipo], E = ESTILOS_P[pr.estilo];
    const rel = (s, i) => s.replace('ESTILO', E[0]).replace('STYLE', E[1]).replace('FORMATO', pr.formato).replace('FORMAT', pr.formato) + (pr.extra ? (i ? ' Extra: ' : ' Detalle: ') + pr.extra + '.' : '');
    const es = rel(T.es(desc), 0), en = rel(T.en(desc), 1);
    const caja = (titulo, txt, cls) => h('div.ci-prompt', h('div.row', { style: { alignItems: 'center', gap: '6px' } }, h('b.grow', titulo), btn('📋 Copiar', () => copyText(txt), { cls: 'sm' + (cls ? ' ' + cls : '') })), h('p', txt));
    const salidaIA = h('div');
    mount(cuerpo, h('div.col', { style: { gap: '12px', maxWidth: '760px' } },
      h('p.small.muted', 'Elige y se escribe solo. Cópialo y pégalo en tu programa de IA de imágenes o vídeo.'),
      h('div.row.wrap', { style: { gap: '6px' } }, Object.entries(PTIPOS).map(([k, t]) => h('button.chip' + (pr.tipo === k ? '.on' : ''), { type: 'button', 'data-pt': k, onclick: () => { pr.tipo = k; prompts(); } }, t.t))),
      h('div.row.wrap', { style: { gap: '6px' } }, Object.keys(ESTILOS_P).map(k => h('button.chip.sm' + (pr.estilo === k ? '.on' : ''), { type: 'button', onclick: () => { pr.estilo = k; prompts(); } }, k[0].toUpperCase() + k.slice(1)))),
      h('div.row.wrap', { style: { gap: '8px' } }, h('div.grow', sP), h('div', { style: { width: '110px' } }, sF)), extra,
      caja('🇪🇸 En español', es, 'ci-copiar-es'), caja('🇬🇧 En inglés (funciona mejor en muchas IA de imágenes)', en),
      btn('✨ Mejorarlo con la IA', async ev => {
        const b = ev.currentTarget, t0 = b.textContent; b.disabled = true;
        try { const { write } = await import('../ai/engine.js'); const r = await write('Mejora este prompt para una IA generativa: hazlo más detallado y visual, sin inventar datos del producto. Devuelve SOLO el prompt mejorado, en inglés.\n\n' + en, { onStatus: t => { b.textContent = t; } }); mount(salidaIA, caja('✨ Mejorado por la IA', r.trim())); }
        catch (e) { toast(e.message, 'warn', 8000); } finally { b.disabled = false; b.textContent = t0; }
      }, { cls: 'sm' }), salidaIA));
  }

  // =================== ⬇️ DESCARGAS OPCIONALES (con permiso) ===================
  async function descargas() {
    if (!desktop.on) return mount(cuerpo, h('div.card', h('p', '⬇️ Las descargas de IA se hacen en el PC del taller (el móvil no descarga nada pesado).'), h('p.small.muted', 'Abre el Centro de IA en el PC.')));
    mount(cuerpo, h('div.skeleton', { style: { height: '120px' } }));
    let mo = null, re = null; try { [mo, re] = await Promise.all([desktop.motorEstado(), desktop.reelsEstado()]); } catch (e) { }
    if (tab !== 'descargas') return;
    const fila = (ic, nombre, det, extra, accion) => h('div.ci-fila', h('span.ci-luz', ic), h('div.grow', h('div.ci-nombre', nombre), h('div.ci-det', det)), extra, accion);
    const items = [];
    ((mo && mo.modelos) || []).forEach(m => {
      const d = m.descarga;
      const det = m.para + ' · ' + bytes(m.bytes) + ' · licencia ' + m.licencia;
      if (d && d.estado === 'descargando') { items.push(fila('⬇️', m.nombre, det + ' · descargando ' + Math.round((d.hecho || 0) / Math.max(1, d.total || m.bytes) * 100) + ' %', null, null)); setTimeout(() => { if (tab === 'descargas' && cuerpo.isConnected) descargas(); }, 2000); return; }
      items.push(fila(m.presente ? '✅' : '⚪', m.nombre, det + (d && d.estado === 'error' ? ' · ⚠️ ' + d.error : ''), null,
        m.presente ? btn('🗑️ Quitar', async () => { if (!await confirmDlg('Quitar ' + m.nombre, 'Se borra del PC (' + bytes(m.bytes) + '). Lo puedes volver a descargar cuando quieras.', 'Quitar', true)) return; try { await desktop.motorBorrar(m.id); descargas(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm ghost' })
          : btn('⬇️ Descargar', async () => { if (!await confirmDlg('Descargar ' + m.nombre, 'Se descargan ' + bytes(m.bytes) + ' de GitHub (licencia ' + m.licencia + ', uso comercial permitido) y se guardan en este PC. ¿Seguimos?', '⬇️ Descargar')) return; try { await desktop.motorDescargar(m.id); descargas(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm primary' })));
    });
    if (re) {
      const nd = re.navegadorDescarga || {};
      items.push(fila(re.navegador ? '✅' : nd.estado === 'descargando' ? '⬇️' : '⚪', 'Navegador del motor de vídeo (Remotion)', 'Hace falta UNA vez para crear Reels · unos 100 MB' + (nd.error ? ' · ⚠️ ' + nd.error : ''), null,
        re.navegador || !re.remotion ? null : nd.estado === 'descargando' ? h('span.tiny', 'Descargando…') : btn('⬇️ Descargar', async () => { if (!await confirmDlg('Preparar el motor de vídeo', 'Remotion descarga su navegador (unos 100 MB). ¿Seguimos?', '⬇️ Descargar')) return; try { await desktop.reelsNavegador(); setTimeout(descargas, 1500); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm primary' })));
      if (nd.estado === 'descargando') setTimeout(() => { if (tab === 'descargas' && cuerpo.isConnected) descargas(); }, 3000);
    }
    mount(cuerpo, h('p.small.muted', '🔒 Nada se descarga solo: tú decides. Todo es de uso comercial libre y se guarda en este PC.'), h('div.ci-lista', items.length ? items : h('p.muted', 'No hay descargas disponibles.')));
  }

  ponTab(TABS.some(t => t[0] === tab) ? tab : 'estado');
  return { params: ps => { if (ps && ps[0] && TABS.some(t => t[0] === ps[0])) ponTab(ps[0]); } };
}
