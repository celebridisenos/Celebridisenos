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
  ai: body => call('ai', { method: 'POST', body: JSON.stringify(body) }),
  aiStatus: () => call('ai'),
  pickFolder: () => call('pick', { method: 'POST' })
};
