// ================= Chat del equipo: servicio en segundo plano =================
// Consulta mensajes nuevos cada pocos segundos (más a menudo con el chat abierto)
// y mantiene el contador de no leídos para el icono 💬.
import { S, api, can, kv, emit } from './store.js';
import { uid } from './ui.js';

export const CHAT = { msgs: [], conectados: [], lastSeen: '', open: false, error: '', ready: false, pending: [] };
const listeners = new Set();
export function onChat(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const notify = () => listeners.forEach(f => { try { f(CHAT); } catch (e) { console.error(e); } });

let timer = null, running = false, started = false;
export async function startChat() {
  if (started || !can('chat.usar')) return;
  started = true;
  CHAT.msgs = (await kv.get('chat.msgs')) || [];
  CHAT.lastSeen = (await kv.get('chat.visto.' + S.me.id)) || '';
  unread();
  tick();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
}
function schedule() {
  clearTimeout(timer);
  const ms = !S.online ? 30000 : CHAT.open && document.visibilityState === 'visible' ? 2500 : document.visibilityState === 'visible' ? 15000 : 60000;
  timer = setTimeout(tick, ms);
}
export async function tick() {
  if (running || !S.token || !can('chat.usar')) return schedule();
  running = true;
  try {
    const last = CHAT.msgs.length ? CHAT.msgs[CHAT.msgs.length - 1].creado : '';
    const r = await api('chat.poll', { desde: last, activo: document.visibilityState === 'visible' });
    if (r.mensajes.length) {
      const ids = new Set(CHAT.msgs.map(m => m.id));
      r.mensajes.forEach(m => { if (!ids.has(m.id)) CHAT.msgs.push(m); });
      CHAT.msgs.sort((a, b) => String(a.creado).localeCompare(String(b.creado)));
      CHAT.msgs = CHAT.msgs.slice(-300);
      kv.set('chat.msgs', CHAT.msgs);
      if (!CHAT.open || document.visibilityState !== 'visible') ping(r.mensajes.filter(m => m.autorId !== S.me.id));
    }
    CHAT.conectados = r.conectados || [];
    CHAT.error = ''; CHAT.ready = true;
    if (CHAT.open && document.visibilityState === 'visible') markRead();
  } catch (e) { CHAT.error = e.code === 'NET' ? 'Sin conexión' : e.message; }
  running = false;
  unread(); notify(); schedule();
}
function ping(list) {
  if (!list.length) return;
  try { if (localStorage.getItem('cd.chatSonido') !== '0') { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = 0.04; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.12); } } catch (e) { }
  if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
    const m = list[list.length - 1];
    try { new Notification('💬 ' + m.autor, { body: m.texto.slice(0, 120), tag: 'chat' }); } catch (e) { }
  }
}
function unread() {
  S.chatUnread = CHAT.msgs.filter(m => m.autorId !== (S.me && S.me.id) && m.creado > CHAT.lastSeen).length;
  emit();
}
export function markRead() {
  const last = CHAT.msgs.length ? CHAT.msgs[CHAT.msgs.length - 1].creado : '';
  if (last && last !== CHAT.lastSeen) { CHAT.lastSeen = last; kv.set('chat.visto.' + S.me.id, last); unread(); }
}
export function setOpen(v) { CHAT.open = v; if (v) { markRead(); tick(); } else schedule(); }
export async function send(texto) {
  texto = String(texto || '').trim();
  if (!texto) return;
  const tmp = { id: uid('ch').replace(/[^a-z0-9_]/gi, '').toLowerCase().slice(0, 19), autorId: S.me.id, autor: S.me.nombre, texto, creado: new Date().toISOString(), pendiente: true };
  if (!/^ch_[a-z0-9]{8,20}$/.test(tmp.id)) tmp.id = 'ch_' + Math.random().toString(36).slice(2, 14);
  CHAT.msgs.push(tmp); notify();
  for (let i = 0; i < 3; i++) {
    try {
      const m = await api('chat.enviar', { id: tmp.id, texto });
      Object.assign(tmp, m, { pendiente: false }); kv.set('chat.msgs', CHAT.msgs); markRead(); notify(); return;
    } catch (e) { if (e.code !== 'NET' && e.code !== 'BUSY') { tmp.error = e.message; tmp.pendiente = false; notify(); return; } await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
  }
  tmp.error = 'No se pudo enviar (sin conexión). Pulsa para reintentar.'; tmp.pendiente = false; notify();
}
export async function retry(m) { CHAT.msgs = CHAT.msgs.filter(x => x !== m); await send(m.texto); }
export async function loadOlder() {
  const first = CHAT.msgs[0];
  const r = await api('chat.historial', { antes: first ? first.creado : '' });
  const ids = new Set(CHAT.msgs.map(m => m.id));
  CHAT.msgs = r.filter(m => !ids.has(m.id)).concat(CHAT.msgs);
  notify();
  return r.length;
}
