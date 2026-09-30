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
  info: () => H ? call('info') : null,
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
  applyUpdate: () => call('update', { method: 'POST' }),
  pickFolder: () => call('pick', { method: 'POST' }),
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
  // ---- Apps instaladas (TikTok, Instagram…) ----
  appsDetectar: () => call('apps/detectar'),
  appsElegir: () => call('apps/elegir', { method: 'POST' }),
  appsBuscar: nombre => call('apps/buscar?' + q({ nombre })),
  appsComprobar: destino => call('apps/comprobar', { method: 'POST', body: JSON.stringify({ destino }) }),
  appsAbrir: destino => call('apps/abrir', { method: 'POST', body: JSON.stringify({ destino }) })
};
