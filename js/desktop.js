// ================= Puente con el programa de escritorio (Windows) =================
// Cuando la app se abre desde CelebriDiseños.exe, el programa inyecta window.__HOST__
// y ofrece funciones locales: carpetas, archivos STL, claves cifradas con Windows
// (DPAPI), copias locales, actualizaciones e IA local. En el móvil no existe.
const H = window.__HOST__ || null;
async function call(path, opts = {}) {
  const r = await fetch('/local/' + path, Object.assign({}, opts, { headers: Object.assign({ 'X-Host-Key': H.key }, opts.headers || {}) }));
  if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch (e) { } throw new Error(m || ('Error local ' + r.status)); }
  const ct = r.headers.get('content-type') || '';
  return ct.includes('json') ? r.json() : r;
}
const q = o => new URLSearchParams(o).toString();
export const desktop = {
  on: !!H,
  name: H ? H.name : '',
  version: H ? H.version : '',
  portable: !!(H && H.portable), // programa abierto desde un USB
  info: () => H ? call('info') : null,
  bambuPerfiles: () => H ? call('bambu-perfiles') : Promise.resolve(null),
  bambuAbrir: (blob, nombre, abrir = true) => call('bambu-abrir?' + q({ nombre, abrir: abrir ? '1' : '0' }), { method: 'POST', body: blob }), // v20: guardar el 3MF en Documentos y abrirlo en Bambu Studio // v20: sus perfiles de Bambu Studio (solo lectura)
  getConfig: async k => { if (!H) return null; try { return (await call('config?' + q({ k }))).v || null; } catch (e) { return null; } },
  setConfig: async (k, v) => { if (H) await call('config?' + q({ k }), { method: 'POST', body: JSON.stringify({ v }) }); },
  secretGet: async k => { if (!H) return null; try { return (await call('secret?' + q({ k }))).v || null; } catch (e) { return null; } },
  secretSet: async (k, v) => { if (H) await call('secret?' + q({ k }), { method: 'POST', body: JSON.stringify({ v }) }); },
  open: p => call('open', { method: 'POST', body: JSON.stringify({ path: p }) }),
  openUrl: (url, app) => H ? call('open', { method: 'POST', body: JSON.stringify({ url, app: app || '' }) }) : Promise.resolve(window.open(url, '_blank', 'noopener')),
  list: p => call('list?' + q({ path: p })),
  file: async p => { const r = await call('file?' + q({ path: p })); return r.arrayBuffer(); },
  fileUrl: p => '/local/file?' + q({ path: p, key: H ? H.key : '' }),
  save: (p, data, replace) => call('save?' + q({ path: p, replace: replace ? '1' : '' }), { method: 'POST', body: data }),
  mkdir: p => call('mkdir', { method: 'POST', body: JSON.stringify({ path: p }) }),
  backup: json => call('backup', { method: 'POST', body: JSON.stringify(json) }),
  backups: () => call('backups'),
  update: () => call('update'),
  // v10.6: la app ya funciona con esta versión (confirma la actualización) y vuelta atrás
  ready: () => H ? call('ping').catch(() => { }) : Promise.resolve(),
  anterior: () => call('update/anterior'),
  volverAnterior: () => call('update/anterior', { method: 'POST' }),
  avisoVisto: () => call('update/anterior', { method: 'DELETE' }).catch(() => { }),
  applyUpdate: () => call('update', { method: 'POST' }),
  pickFolder: () => call('pick', { method: 'POST' }),
  // v11: impresoras de Windows y etiquetas al tamaño exacto (sin diálogo del navegador)
  printers: usb => call('printers' + (usb ? '?usb=1' : '')),
  // v11.2: búsqueda por todos los métodos (Windows, USB, red, Bambu) y Bambu Lab en vivo por la red local
  discover: () => call('discover'),
  bambu: () => call('bambu'),
  bambuAccion: body => call('bambu', { method: 'POST', body: JSON.stringify(body) }),
  print: job => call('print', { method: 'POST', body: JSON.stringify(job) }),
  // v13.2: impresión directa por Bluetooth/puerto COM (bytes ya preparados) y lista de puertos que ve Windows
  puertos: () => call('puertos'),
  rawPrint: (port, bytes) => { let b = ''; for (let i = 0; i < bytes.length; i += 0x8000) b += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return call('raw', { method: 'POST', body: JSON.stringify({ port, data: btoa(b) }) }); },
  // v11.8: lo que puede hacer una impresora según su controlador y abrir sus preferencias de Windows
  printerCaps: name => call('printers/capacidades?' + q({ name })),
  printerPrefs: name => call('printers/capacidades', { method: 'POST', body: JSON.stringify({ printer: name }) }),
  // v11.7: cámaras de las Bambu Lab P1/A1 (vídeo de la propia impresora por la red local; el código nunca llega aquí)
  camaras: () => call('camara'),
  // v13.1 · vídeo DIRECTO: la dirección que el <img> abre una vez; el programa del PC manda cada imagen en cuanto llega de la impresora
  camaraStream: serial => '/local/camara/stream?' + q({ serial, key: H.key, t: Date.now() }),
  camaraFoto: async serial => {
    const r = await fetch('/local/camara?' + q({ serial }), { headers: { 'X-Host-Key': H.key }, cache: 'no-store' });
    if (r.status === 200) return { blob: await r.blob(), edadMs: Number(r.headers.get('X-Edad-Ms')) || 0, estado: r.headers.get('X-Estado') || 'en_directo' };
    let j = {}; try { j = await r.json(); } catch (e) { }
    return { estado: j.estado || 'error', problema: j.problema || j.error || '' };
  },
  // v17.2 · «Mira cómo nació tu pieza»: fotos de la cámara de la impresora guardadas en ESTE ordenador
  nacer: () => call('nacer'),
  nacerAccion: body => call('nacer', { method: 'POST', body: JSON.stringify(body) }),
  nacerFoto: async (id, n) => { const r = await fetch('/local/nacer?' + q({ id, n }), { headers: { 'X-Host-Key': H.key } }); if (!r.ok) throw new Error('Esa foto ya no está.'); return r.blob(); },
  // v11.1 · CelebryNova (operador autónomo) dentro del programa
  novaEstado: () => call('nova/estado'),
  novaArrancar: () => call('nova/arrancar', { method: 'POST' }),
  novaInstalar: () => call('nova/instalar', { method: 'POST' }),
  novaUrl: () => call('nova/url'),
  novaApi: (path, body) => call('nova/api/' + path, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
  // ---- IA local (Ollama en este PC) ----
  hardware: () => call('ia/hardware'),
  iaEstado: () => call('ia/estado'),
  iaArrancar: () => call('ia/arrancar', { method: 'POST' }),
  iaInstalar: () => call('ia/instalar', { method: 'POST' }),
  iaDescargar: modelo => call('ia/descargar', { method: 'POST', body: JSON.stringify({ modelo }) }),
  iaProgreso: () => call('ia/progreso'),
  iaBorrar: modelo => call('ia/borrar', { method: 'POST', body: JSON.stringify({ modelo }) }),
  iaEmbed: body => call('ia/embed', { method: 'POST', body: JSON.stringify(body) }),
  // Chat en streaming: onChunk recibe cada trozo NDJSON de Ollama
  iaChat: async (body, onChunk, signal) => {
    const r = await fetch('/local/ia/chat', { method: 'POST', body: JSON.stringify(body), signal, headers: { 'X-Host-Key': H.key } });
    if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch (e) { } throw new Error(m || ('IA local: error ' + r.status)); }
    const rd = r.body.getReader(), dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line) { try { onChunk(JSON.parse(line)); } catch (e) { } } }
    }
    if (buf.trim()) { try { onChunk(JSON.parse(buf)); } catch (e) { } }
  },
  // v15.2 · motor de fotos del PC (Python de EDITOR_VIDEO): fondo con IA y caras con ojos, nariz y boca
  motorEstado: forzar => call('motor/estado' + (forzar ? '?forzar=1' : '')),
  nube3dEstado: () => call('nube3d/estado'), // v20: Tripo AI y Meshy AI (solo dice si hay clave, nunca cuál)
  nube3dClave: (proveedor, clave) => call('nube3d/clave', { method: 'POST', body: JSON.stringify({ proveedor, clave }) }),
  nube3dFigura: (blob, o = {}) => call('nube3d/figura?' + q({ proveedor: o.proveedor, alto: o.alto || 100 }), { method: 'POST', body: blob }),
  nube3dAvance: () => call('nube3d/avance'),
  motor3dEstado: () => call('motor3d/estado'),
  motor3dInstalar: o => call('motor3d-instalar/empezar', { method: 'POST', body: JSON.stringify(o || {}) }), // v20: instalar el motor 3D desde un botón
  motor3dInstalarEstado: () => call('motor3d-instalar/estado'),
  motor3dInstalarCancelar: () => call('motor3d-instalar/cancelar', { method: 'POST' }),
  motor3dElegirCarpeta: () => call('motor3d-instalar/elegir-carpeta', { method: 'POST' }),
  r8Sistema: () => call('r8/sistema'), // v20: Bambu Studio y Blender instalados, y la carpeta de CelebriR8
  r8Guardar: (blob, carpeta, nombre) => call('r8/guardar?' + q({ carpeta, nombre }), { method: 'POST', body: blob }), // v20: Documentos\CelebriDiseños_R8\<carpeta>
  r8Carpeta: (carpeta = '') => call('r8/carpeta?' + q({ carpeta }), { method: 'POST' }),
  r8Archivos: () => call('r8/archivos'),
  r8Abrir: (ruta, con) => call('r8/abrir?' + q({ ruta, con: con || '' }), { method: 'POST' }),
  mallaBlender: (stl, ops) => call('motor3d/blender?' + q({ ops: JSON.stringify(ops || {}) }), { method: 'POST', body: stl }), // v20: taller de Blender
  mallaInspeccionar: (stl, pared) => call('motor3d/inspeccionar?' + q({ pared: pared || 0.8 }), { method: 'POST', body: stl }), // v20: comprobar cualquier malla
  mallaReparar: (stl, o = {}) => call('motor3d/reparar?' + q({ pared: o.pared || 0.8, engrosar: o.engrosar || 0, rehacer: o.rehacer ? '1' : '0', migas: o.migas === false ? '0' : '1', cerrar: o.cerrar === false ? '0' : '1' }), { method: 'POST', body: stl }), // v20: CelebriR8 · figura 3D completa
  motor3dAvance: () => call('motor3d/avance'),
  mallaComparar: (actual, original) => { const f = new FormData(); f.append('actual', actual, 'actual.stl'); f.append('original', original, 'original.stl'); return call('motor3d/comparar', { method: 'POST', body: f }); }, // v20.1: Blender mide cuánto se ha alejado del original
  hfLogin: () => call('nube3d/hf-login', { method: 'POST' }),
  // v20.1 · Hugging Face en un paso: la clave se pega en el programa, se comprueba y se guarda en el PC (nunca vuelve)
  hfClave: clave => call('nube3d/hf-clave', { method: 'POST', body: JSON.stringify({ clave }) }),
  hfQuien: () => call('nube3d/hf-quien'),
  hfSalir: () => call('nube3d/hf-salir', { method: 'POST' }),
  sf3dBajar: probar => call('nube3d/sf3d-bajar' + (probar ? '?probar=1' : ''), { method: 'POST' }),
  sf3dEstado: () => call('nube3d/sf3d-estado'),
  sf3dCancelar: () => call('nube3d/sf3d-cancelar', { method: 'POST' }),
  motor3dFigura: (blob, o = {}) => call('motor3d/figura?' + q({ motor: o.motor || 'triposr', alto: o.alto || 100, resolucion: o.resolucion || 256, detalle: o.detalle || 'normal', recortar: o.recortar === false ? '0' : '1', cpu: o.cpu ? '1' : '0', metricas: o.metricas ? '1' : '0' }), { method: 'POST', body: blob }),
  motorProfundidad: (blob, uso) => call('motor/profundidad' + (uso ? '?' + q({ uso }) : ''), { method: 'POST', body: blob }), // v20: CelebriR8 · Foto → 3D
  motorFondo: (blob, modelo, calidad) => call('motor/fondo' + (modelo || calidad ? '?' + q({ modelo: modelo || '', calidad: calidad || '' }) : ''), { method: 'POST', body: blob }),
  motorCaras: blob => call('motor/caras', { method: 'POST', body: blob }),
  motorDescargar: id => call('motor/descargar', { method: 'POST', body: JSON.stringify({ ID: id }) }),
  motorBorrar: id => call('motor/borrar', { method: 'POST', body: JSON.stringify({ ID: id }) }),
  // v15.4 · Biouvision: restaurar fotos antiguas hasta 4K (en segundo plano, con avance) y paquetes de motores
  motorDescargarGrupo: grupo => call('motor/descargar', { method: 'POST', body: JSON.stringify({ Grupo: grupo }) }),
  motorRestaurar: fd => call('motor/restaurar', { method: 'POST', body: fd }),
  motorRestaurarEstado: id => call('motor/restaurar/estado?' + q({ id })),
  motorRestaurarFoto: async (id, cual) => (await call('motor/restaurar/foto?' + q({ id, cual: cual || '' }))).blob(),
  motorRestaurarCancelar: id => call('motor/restaurar/cancelar', { method: 'POST', body: JSON.stringify({ ID: id }) }),
  motorDanos: fd => call('motor/danos', { method: 'POST', body: fd }),
  // v16.1 · ⚡ Turbo: tarjeta gráfica para los motores de fotos (activar | medir | apagar | encender; sin acción = cómo está)
  motorTurbo: accion => call('motor/turbo', accion ? { method: 'POST', body: JSON.stringify({ Accion: accion }) } : undefined),
  // v15.4: abrir otra ventana del programa: Biouvision (app propia) o el programa en una pantalla (p. ej. '#/instagram')
  ventana: (que, ruta) => call('ventana', { method: 'POST', body: JSON.stringify({ Que: que || '', Ruta: ruta || '' }) }),
  // v15.3 · Reels con Remotion (el de EDITOR_VIDEO): estado, encargar el vídeo, seguirlo y recogerlo
  reelsEstado: () => call('reels/estado'),
  reelsRender: fd => call('reels/render', { method: 'POST', body: fd }),
  reelsTrabajo: id => call('reels/estado?' + q({ id })),
  reelsVideo: async id => (await call('reels/video?' + q({ id }))).blob(),
  reelsCancelar: id => call('reels/cancelar', { method: 'POST', body: JSON.stringify({ ID: id }) }),
  reelsNavegador: () => call('reels/navegador', { method: 'POST' }),
  reelsMusica: extra => call('reels/musica' + (extra ? '?' + q({ extra }) : '')),
  // ---- Apps instaladas (TikTok, Instagram…) ----
  // Internet para Celebrity (limitado y registrado)
  webBuscar: q => call('web/buscar?' + q({ q })),
  webLeer: url => call('web/leer?' + q({ url })),
  appsDetectar: (redes = []) => call('apps/detectar?' + redes.map(r => 'red=' + encodeURIComponent(r)).join('&')),
  appsElegir: () => call('apps/elegir', { method: 'POST' }),
  appsBuscar: nombre => call('apps/buscar?' + q({ nombre })),
  appsComprobar: destino => call('apps/comprobar', { method: 'POST', body: JSON.stringify({ destino }) }),
  appsAbrir: destino => call('apps/abrir', { method: 'POST', body: JSON.stringify({ destino }) })
};
