// ================= Datos: servidor, caché local, cola sin conexión =================
// Una sola fuente de verdad (el servidor de Google). La app guarda una copia local
// para abrir al instante y funcionar sin conexión; los cambios hechos sin conexión
// se guardan en una cola y se envían en orden al volver la conexión.
import { uid } from './ui.js';
import { desktop } from './desktop.js';

const CL = window.CL;
export const APP_VERSION = '13.6.0';
const TABLES = ['pedidos', 'clientes', 'productos', 'calculadora', 'gastos', 'stock', 'fabricacion', 'tareas', 'noticias', 'comentarios', 'reacciones', 'redes', 'archivos', 'usuarios', 'notificaciones', 'solicitudes', 'biblioteca', 'memoria', 'logros', 'impresoras', 'trabajos', 'bobinas', 'compras', 'presupuestos', 'facturas', 'materiales', 'preciosHist', 'embalajes', 'recetas', 'anuncios', 'anunciosHist', 'fallos', 'movMateriales', 'impresiones'];

export const S = {
  server: '', token: '', device: '', me: null, perms: { all: false, list: [], temp: [] }, cfg: null,
  t: Object.fromEntries(TABLES.map(k => [k, []])), meta: {}, hoy: CL.today(),
  ws: (() => { try { return localStorage.getItem('cd.ws') || 'principal'; } catch (e) { return 'principal'; } })(),
  online: navigator.onLine, busy: 0, syncing: false, lastSync: null, syncError: '', queue: [], ready: false, errors: {}, iaServidor: null, chatUnread: 0
};
const listeners = new Set();
export function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
let emitQueued = false;
// v9.7: el indicador "Consultando…" se actualiza aparte, sin redibujar la pantalla entera
let statusCb = null;
export function onStatus(fn) { statusCb = fn; }
function status() { if (statusCb) { try { statusCb(S); } catch (e) { console.error(e); } } }
export function emit() { if (emitQueued) return; emitQueued = true; requestAnimationFrame(() => { emitQueued = false; listeners.forEach(f => { try { f(S); } catch (e) { console.error(e); } }); }); }

// ---------- IndexedDB ----------
let dbp;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('celebri9', 1);
    r.onupgradeneeded = () => { ['kv', 'tables', 'queue'].forEach(n => { if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n); }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function idb(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const tx = d.transaction(store, mode); const st = tx.objectStore(store); const r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); });
}
export const kv = {
  get: k => idb('kv', 'readonly', s => s.get(k)).catch(() => undefined),
  set: (k, v) => idb('kv', 'readwrite', s => s.put(v, k)).catch(() => { }),
  del: k => idb('kv', 'readwrite', s => s.delete(k)).catch(() => { })
};

// v10.5: cada espacio de trabajo guarda su copia local aparte
const tk = (k, ws) => ((ws || S.ws) === 'principal' ? k : (ws || S.ws) + '~' + k);
async function loadTables(ws) {
  for (const k of TABLES) { const x = await idb('tables', 'readonly', s => s.get(tk(k, ws))).catch(() => null); S.t[k] = x ? x.rows || [] : []; if (x) S.meta[k] = { rev: x.rev, hash: x.hash }; else delete S.meta[k]; }
}
// Cambiar de espacio: la pantalla cambia al instante con su copia local y luego se sincroniza
export async function switchWs(ws) {
  if (!ws || ws === S.ws) return;
  if (pulling) { try { await pulling; } catch (e) { } }
  S.ws = ws; try { localStorage.setItem('cd.ws', ws); } catch (e) { }
  document.documentElement.dataset.ws = ws;
  await loadTables(ws);
  emit();
  await pull(true);
}
export const wsInfo = () => (S.cfg && S.cfg.espacio) || { actual: S.ws, nombre: S.ws === 'principal' ? 'Negocio principal' : S.ws, lista: [] };

// ---------- Llamadas al servidor ----------
export class ApiError extends Error { constructor(code, msg, extra) { super(msg); this.code = code; this.extra = extra; } }
export async function api(a, d, opts = {}) {
  if (!S.server) throw new ApiError('SETUP', 'Falta la dirección del servidor.');
  if (!opts.quiet) { S.busy++; status(); }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || 60000);
  try {
    let r;
    try {
      r = await fetch(S.server, { method: 'POST', body: JSON.stringify({ a, d: d || {}, t: opts.token === undefined ? S.token : opts.token, op: opts.op, dev: S.device, v: APP_VERSION, ws: opts.ws || S.ws }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', signal: ctrl.signal });
    } catch (e) {
      setOnline(false);
      throw new ApiError('NET', ctrl.signal.aborted ? 'El servidor tarda demasiado en responder.' : 'Sin conexión con el servidor.');
    }
    if (!r.ok) { throw new ApiError('NET', 'El servidor no responde (' + r.status + ').'); }
    let j;
    try { j = await r.json(); } catch (e) { throw new ApiError('NET', 'Respuesta no válida del servidor. ¿Es correcta la dirección?'); }
    setOnline(true);
    if (!j.ok) {
      if (j.err.code === 'AUTH' && a !== 'auth.login' && a !== 'auth.desbloquear') onAuthLost(j.err.msg);
      throw new ApiError(j.err.code, j.err.msg, j.err.extra);
    }
    return j.data;
  } finally { clearTimeout(timer); if (!opts.quiet) { S.busy--; status(); } }
}
// ---------- v10: conexión con reconexión automática ----------
// Si se pierde la conexión: se intenta de nuevo a los 1, 2, 4, 8, 16 y 30 s (y luego cada 30 s),
// sin cerrar sesión ni perder lo que hay en pantalla. Al volver: se envía lo pendiente y se sincroniza.
let reconT = null, reconDelay = 1000;
function setOnline(v) {
  if (S.online === v) return;
  S.online = v;
  if (v) {
    clearTimeout(reconT); reconDelay = 1000; S.reconnecting = false;
    S.restored = Date.now(); setTimeout(() => status(), 3200);
    emit(); flushSoon(); pull(); import('./chat.js').then(m => m.tick()).catch(() => { });
  } else { emit(); scheduleReconnect(); }
}
function scheduleReconnect() {
  clearTimeout(reconT);
  if (S.online) return;
  S.reconnecting = navigator.onLine !== false;
  status();
  reconT = setTimeout(async () => {
    try { await api('sys.ping', {}, { quiet: true, timeout: 8000 }); } catch (e) { }
    if (!S.online) { reconDelay = Math.min(reconDelay * 2, 30000); scheduleReconnect(); }
  }, reconDelay);
}
export function reconnectNow() { reconDelay = 1000; clearTimeout(reconT); if (!S.online) { reconT = setTimeout(scheduleReconnect, 0); api('sys.ping', {}, { quiet: true, timeout: 8000 }).catch(() => { }); } }
window.addEventListener('online', () => reconnectNow());
window.addEventListener('offline', () => { if (S.online) setOnline(false); else status(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !S.online) reconnectNow(); });

let authLostCb = null;
export function onAuthLostHandler(fn) { authLostCb = fn; }
function onAuthLost(msg) { S.token = ''; saveToken(''); if (authLostCb) authLostCb(msg); }

// ---------- Sesión ----------
export async function loadLocal() {
  S.server = (await desktop.getConfig('server')) || localStorage.getItem('cd.server') || '';
  S.device = localStorage.getItem('cd.device') || (desktop.on ? 'PC ' + (desktop.name || '') : deviceName());
  localStorage.setItem('cd.device', S.device);
  S.token = (await desktop.secretGet('token')) || localStorage.getItem('cd.token') || '';
  const me = await kv.get('me');
  if (me && S.token) { S.me = me.me; S.perms = me.perms; S.cfg = me.cfg; }
  // Hay sesión guardada pero no la ficha local (caché borrada): se recupera sin pedir contraseña
  if (S.token && !S.me && S.server) await pull(true);
  document.documentElement.dataset.ws = S.ws;
  await loadTables(S.ws);
  S.queue = (await kv.get('queue')) || [];
  S.lastSync = (await kv.get('lastSync')) || null;
}
function deviceName() { const u = navigator.userAgent; return /iPhone|iPad/.test(u) ? 'iPhone/iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'Navegador'; }
export async function setServer(url) {
  S.server = url.trim();
  localStorage.setItem('cd.server', S.server);
  await desktop.setConfig('server', S.server);
}
async function saveToken(tok) {
  if (desktop.on) { await desktop.secretSet('token', tok); localStorage.removeItem('cd.token'); }
  else if (tok) localStorage.setItem('cd.token', tok); else localStorage.removeItem('cd.token');
}
// ---------- Contraseñas: se protegen EN el dispositivo (PBKDF2 150.000 vueltas) ----------
// Al servidor solo viaja la huella: el login es instantáneo y la contraseña nunca sale de aquí.
export async function passHash(pass) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pass)), 'PBKDF2', false, ['deriveBits']);
  const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode('CelebriDisenos|pw|v1'), iterations: 150000 }, k, 256);
  return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
}
// v12.2: huella FUERTE (600.000 vueltas, recomendación actual de OWASP). Se envía junto a la anterior:
// el servidor actualiza la cuenta al formato fuerte la primera vez que entras con la app nueva.
export async function passHash3(pass) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pass)), 'PBKDF2', false, ['deriveBits']);
  const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode('CelebriDisenos|pw|v3'), iterations: 600000 }, k, 256);
  return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
}
export async function passHashes(pass) { const [ph, ph3] = await Promise.all([passHash(pass), passHash3(pass)]); return { ph, ph3 }; }
export function checkNewPassword(p, p2) {
  p = String(p || '');
  if (p.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/^(\d)\1+$/.test(p) || /^(123456|password|contraseña|celebri)/i.test(p)) return 'Esa contraseña es demasiado fácil de adivinar.';
  if (p2 !== undefined && p !== p2) return 'Las contraseñas no coinciden.';
  return '';
}
export async function login(usuario, password) {
  const { ph, ph3 } = await passHashes(password);
  let r;
  try { r = await api('auth.login', { usuario, ph, ph3, dispositivo: S.device }, { token: '' }); }
  catch (e) {
    // Usuario de la versión anterior: se envía una única vez para convertirla al formato rápido
    if (e.code !== 'UPGRADE') throw e;
    r = await api('auth.login', { usuario, ph, ph3, password, dispositivo: S.device }, { token: '' });
  }
  await afterLogin(r, password);
  return r;
}
// ---------- Invitaciones: crear la cuenta con el código y entrar directamente ----------
export async function joinWithInvite(codigo, usuario, nombre, password) {
  const r = await api('invitaciones.canjear', { codigo, usuario, nombre, ...(await passHashes(password)), dispositivo: S.device }, { token: '' });
  await afterLogin(r, password);
  return r;
}
// Del mensaje de invitación (o del enlace) saca la dirección del servidor y el código
export function parseInvite(text) {
  const t = String(text || '');
  let server = '', codigo = '';
  const m = /https:\/\/script\.google(?:usercontent)?\.com\/[^\s"'<>&?#]+?\/exec/.exec(t) || /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/exec\b/.exec(t);
  if (m) server = m[0];
  else { const e = /[?&]s=(https%3A%2F%2Fscript\.google[^&\s]+)/i.exec(t); if (e) { try { server = decodeURIComponent(e[1]); } catch (x) { } } }
  const c = /\bCD[-\s]?([A-HJKMNP-Z2-9]{4})[-\s]?([A-HJKMNP-Z2-9]{4})\b/i.exec(t);
  if (c) codigo = ('CD-' + c[1] + '-' + c[2]).toUpperCase();
  return { server, codigo };
}
export async function afterLogin(res, password) {
  S.token = res.token; S.me = res.user; S.perms = res.perms;
  await saveToken(res.token);
  localStorage.setItem('cd.lastUser', res.user.usuario);
  if (password) await setLocalUnlock(password);
  await pull(true);
}
export async function logout(local) {
  if (!local) { try { await api('auth.logout', {}); } catch (e) { } }
  S.token = ''; S.me = null; await saveToken(''); await kv.del('me'); await kv.del('unlock');
  emit();
}
// Desbloqueo sin conexión: guardamos una huella PBKDF2 de la contraseña (nunca la contraseña)
async function pbkdf(pass, salt) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 150000 }, k, 256);
  return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
}
async function setLocalUnlock(pass) { const salt = uid('s'); await kv.set('unlock', { salt, h: await pbkdf(pass, salt), u: S.me && S.me.id }); }
export async function unlock(pass) {
  try { await api('auth.desbloquear', await passHashes(pass)); await setLocalUnlock(pass); return true; }
  catch (e) {
    if (e.code !== 'NET') throw e;
    const u = await kv.get('unlock');
    if (u && u.u === (S.me && S.me.id) && await pbkdf(pass, u.salt) === u.h) return true;
    throw new ApiError('AUTH', 'Contraseña incorrecta.');
  }
}

// ---------- Sincronización ----------
let pulling = null;
export function pull(full) {
  if (!S.token || !S.server) return Promise.resolve();
  if (pulling) return pulling;
  pulling = (async () => {
    S.syncing = true; status();
    let changed = !S.ready;
    try {
      if (S.queue.length) await flush();
      if (S.queue.length) return; // aún hay cambios sin enviar: no pisamos la copia local
      const known = {};
      if (!full) TABLES.forEach(k => { if (S.meta[k]) known[k] = S.meta[k]; });
      let ws0 = S.ws;
      let r;
      try { r = await api('sync.pull', { tablas: known, completo: !!full }); }
      catch (e) {
        // v10.5: sin acceso a este espacio (p. ej. se lo han quitado): se pasa a uno permitido
        if (e.code === 'PERM' && e.extra && e.extra.espacio) {
          const l = await api('espacios.lista', {}, { ws: 'principal' });
          const next = (l.espacios || [])[0];
          if (!next || next.id === S.ws) throw e;
          S.ws = ws0 = next.id; try { localStorage.setItem('cd.ws', next.id); } catch (x) { } document.documentElement.dataset.ws = next.id;
          await loadTables(next.id); changed = true;
          r = await api('sync.pull', { tablas: {}, completo: true });
        } else throw e;
      }
      if (S.ws !== ws0) return; // se cambió de espacio mientras llegaba la respuesta
      const sig = x => JSON.stringify(x);
      if (sig(r.yo) !== sig(S.me) || sig(r.permisos) !== sig(S.perms) || sig(r.config) !== sig(S.cfg) || r.hoy !== S.hoy || sig(r.iaServidor || null) !== sig(S.iaServidor || null)) changed = true;
      S.me = r.yo; S.perms = r.permisos; S.cfg = r.config; S.hoy = r.hoy; S.iaServidor = r.iaServidor || null;
      try { const lg = (r.config && r.config.empresa && r.config.empresa.logo) || ''; if (lg !== (localStorage.getItem('cd.logo') || '')) { if (lg) localStorage.setItem('cd.logo', lg); else localStorage.removeItem('cd.logo'); } } catch (e) { }
      if (Object.keys(S.errors || {}).length) changed = true;
      S.errors = {};
      for (const k of Object.keys(r.tablas)) {
        const x = r.tablas[k];
        if (x.error) { S.errors[k] = x.error; changed = true; continue; }
        if (!x.igual) { changed = true; S.t[k] = x.filas; idb('tables', 'readwrite', s => s.put({ rows: x.filas, rev: x.rev, hash: x.hash }, tk(k, ws0))).catch(() => { }); }
        S.meta[k] = { rev: x.rev, hash: x.hash };
      }
      // tablas que ya no puedo ver (permiso retirado): se vacían
      TABLES.forEach(k => { if (!(k in r.tablas)) { if (S.t[k].length) changed = true; S.t[k] = []; delete S.meta[k]; idb('tables', 'readwrite', s => s.delete(tk(k, ws0))).catch(() => { }); } });
      S.lastSync = new Date().toISOString(); S.syncError = '';
      kv.set('me', { me: S.me, perms: S.perms, cfg: S.cfg });
      kv.set('lastSync', S.lastSync);
    } catch (e) {
      const se = e.code === 'NET' ? '' : e.message;
      if (se !== S.syncError) changed = true;
      S.syncError = se;
      if (e.code !== 'NET' && e.code !== 'AUTH') console.warn('sync', e);
    } finally {
      S.syncing = false; S.ready = true; pulling = null;
      // Solo se redibuja la pantalla si ha llegado algo nuevo
      if (changed) emit(); else status();
    }
  })();
  return pulling;
}
let pullTimer = null;
export function startAutoSync() {
  clearInterval(pullTimer);
  pullTimer = setInterval(() => { if (document.visibilityState === 'visible' || Date.now() % 5 === 0) pull(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); });
  const midnight = setInterval(() => { const d = CL.today(); if (d !== S.hoy) { S.hoy = d; emit(); } }, 60000);
}
const pullSoon = (() => { let t; return (ms) => { clearTimeout(t); t = setTimeout(() => pull(), ms || 1500); }; })();
// v10: el "pulso" trae la revisión de cada tabla; si alguna cambió, se sincroniza enseguida
export function syncRevs(revs) {
  if (!S.ready || pulling || S.queue.length) return;
  const changed = Object.keys(revs).some(k => TABLES.includes(k) && S.meta[k] && revs[k] && revs[k] !== S.meta[k].rev);
  if (changed) pullSoon(200);
}

// ---------- Cambios (con cola sin conexión) ----------
// optimistic(t) modifica S.t localmente para que la pantalla responda al instante.
export async function mutate(a, d, opts = {}) {
  const op = uid('op');
  const snapshot = opts.optimistic ? JSON.stringify(Object.fromEntries((opts.tables || Object.keys(S.t)).map(k => [k, S.t[k]]))) : null;
  if (opts.optimistic) { try { opts.optimistic(S.t); emit(); } catch (e) { console.error(e); } }
  if (S.queue.length || !S.online) {
    if (opts.onlineOnly) { restore(snapshot); throw new ApiError('NET', 'Esta acción necesita conexión a Internet.'); }
    await enqueue({ op, a, d, label: opts.label || a, t: Date.now(), ws: S.ws });
    flushSoon();
    return { queued: true };
  }
  try {
    const res = await api(a, d, { op });
    pullSoon();
    return res;
  } catch (e) {
    if (e.code === 'NET' && !opts.onlineOnly) { await enqueue({ op, a, d, label: opts.label || a, t: Date.now(), ws: S.ws }); return { queued: true }; }
    restore(snapshot);
    pullSoon();
    throw e;
  }
}
function restore(snapshot) {
  if (!snapshot) return;
  const o = JSON.parse(snapshot);
  Object.keys(o).forEach(k => { S.t[k] = o[k]; });
  emit();
}
async function enqueue(x) { S.queue.push(x); await kv.set('queue', S.queue); emit(); }
let flushing = null, flushT = null;
function flushSoon() { clearTimeout(flushT); flushT = setTimeout(() => flush().then(() => pull()), 800); }
let failListeners = [];
export function onQueueFailure(fn) { failListeners.push(fn); }
export async function flush() {
  if (flushing || !S.queue.length || !S.token) return flushing;
  flushing = (async () => {
    while (S.queue.length) {
      // v10.5: cada cambio se envía al espacio en el que se hizo
      const w0 = S.queue[0].ws || 'principal';
      const batch = []; for (const x of S.queue) { if ((x.ws || 'principal') !== w0 || batch.length >= 10) break; batch.push(x); }
      let res;
      try { res = await api('sync.lote', { ops: batch.map(x => ({ a: x.a, d: x.d, op: x.op })) }, { timeout: 120000, ws: w0 }); }
      catch (e) { if (e.code === 'NET' || e.code === 'BUSY' || e.code === 'SERVER') break; throw e; }
      let stop = false;
      res.forEach((r, i) => {
        const x = batch[i];
        if (r.ok) { S.queue = S.queue.filter(q => q.op !== x.op); return; }
        if (['BUSY', 'SERVER'].includes(r.err.code)) { stop = true; return; }
        S.queue = S.queue.filter(q => q.op !== x.op); // error definitivo: se informa y se descarta
        failListeners.forEach(f => f(x, r.err));
      });
      await kv.set('queue', S.queue);
      emit();
      if (stop) break;
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
export async function dropQueue() { S.queue = []; await kv.set('queue', []); await pull(true); }

// ---------- Ayudantes de datos ----------
export function can(p) { return !!(S.perms && (S.perms.all || (S.perms.list || []).includes(p))); }
export const byId = (t, id) => S.t[t].find(x => x.id === id);
export function upsertLocal(t, row, key = 'id') { const i = S.t[t].findIndex(x => x[key] === row[key]); if (i >= 0) S.t[t][i] = Object.assign({}, S.t[t][i], row); else S.t[t].push(row); }
export function removeLocal(t, id, key = 'id') { S.t[t] = S.t[t].filter(x => x[key] !== id); }
export function user(nameOrId) { return S.t.usuarios.find(u => u.id === nameOrId || u.nombre === nameOrId) || null; }
export function timing(o) { return CL.orderTiming(o, S.cfg.pedidos, S.hoy); }
export function stateColor(k) { const s = (S.cfg && S.cfg.pedidos.estados || []).find(x => x.k === k); return s ? s.c : '#64748b'; }
export function clientStats() {
  const key = S.t.clientes.length + ':' + S.t.pedidos.length + ':' + (S.meta.pedidos && S.meta.pedidos.hash) + (S.meta.clientes && S.meta.clientes.hash) + S.hoy + JSON.stringify(S.cfg && S.cfg.clientes);
  if (clientStats._k !== key) { clientStats._k = key; clientStats._v = CL.allClientStats(S.t.clientes, S.t.pedidos, S.cfg, S.hoy); }
  return clientStats._v;
}
export function dash() { return CL.dashboard(S.t, S.cfg, S.me && S.me.nombre, S.hoy); }
export const unreadCount = () => S.t.notificaciones.filter(n => !n.leida).length;
