// ================= Chat del equipo: servicio en segundo plano =================
// Consulta mensajes nuevos cada pocos segundos (con el chat abierto, en cuanto termina la consulta anterior)
// y mantiene el contador de no leídos para el icono 💬.
import { S, api, can, kv, emit, syncRevs } from './store.js';
import { uid, confirmDlg, toast } from './ui.js';

export const CHAT = { msgs: [], conectados: [], lastSeen: '', open: false, error: '', ready: false, pending: [] };
const listeners = new Set();
export function onChat(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const notify = () => listeners.forEach(f => { try { f(CHAT); } catch (e) { console.error(e); } });

let timer = null, running = false, started = false;
// v10: ¿la persona está usando la app de verdad? (ratón, teclado, toques o desplazamiento en los últimos 2 min)
let lastUse = Date.now();
['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(ev => addEventListener(ev, () => { lastUse = Date.now(); }, { passive: true, capture: true }));
const usando = () => document.visibilityState === 'visible' && Date.now() - lastUse < 120000;
// v10: además del chat, esta consulta ligera ("pulso") trae la revisión de cada tabla:
// notificaciones, noticias, pedidos… llegan en segundos sin recargar nada.
export async function startChat() {
  if (started || !S.me) return;
  started = true;
  if (can('chat.usar')) {
    CHAT.msgs = (await kv.get('chat.msgs')) || [];
    CHAT.lastSeen = (await kv.get('chat.visto.' + S.me.id)) || '';
  }
  unread();
  tick();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
}
function schedule() {
  clearTimeout(timer);
  const ms = !S.online ? 30000 : CHAT.open && document.visibilityState === 'visible' ? 600 : document.visibilityState === 'visible' ? 5000 : 60000;
  timer = setTimeout(tick, ms);
}
export async function tick() {
  if (running || !S.token) return schedule();
  running = true;
  try {
    // v10.6.2: solo cuentan los mensajes confirmados por el servidor (la hora de un mensaje aún
    // enviándose es la del PC y, si el reloj va adelantado, se saltaban mensajes de otras personas)
    const last = CHAT.msgs.reduce((a, m) => !m.pendiente && !m.error && m.creado > a ? m.creado : a, '');
    const r = await api('rt.poll', { desde: last, activo: document.visibilityState === 'visible', usando: usando() }, { quiet: true });
    syncRevs(r.revs || {});
    r.mensajes = r.mensajes || [];
    // mensajes borrados por una administradora: desaparecen al momento
    r.mensajes.filter(m => m.borrado).forEach(m => { CHAT.msgs = CHAT.msgs.filter(x => x.id !== m.id); });
    r.mensajes = r.mensajes.filter(m => !m.borrado);
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
  const n = CHAT.msgs.filter(m => m.autorId !== (S.me && S.me.id) && m.creado > CHAT.lastSeen).length;
  if (n !== S.chatUnread) { S.chatUnread = n; emit(); } // solo se redibuja si cambia el contador
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
      Object.assign(tmp, m, { pendiente: false }); kv.set('chat.msgs', CHAT.msgs); markRead(); notify();
      tick(); // v10.6.2: se consulta enseguida para ver las respuestas sin esperar al siguiente pulso
      return;
    } catch (e) { if (e.code !== 'NET' && e.code !== 'BUSY') { tmp.error = e.message; tmp.pendiente = false; notify(); return; } await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
  }
  tmp.error = 'No se pudo enviar (sin conexión). Pulsa para reintentar.'; tmp.pendiente = false; notify();
}
export async function delMsg(m) {
  if (!await confirmDlg('Borrar mensaje', 'Irá a la papelera: una administradora puede restaurarlo.', 'Borrar', true)) return;
  try { await api('chat.borrar', { id: m.id }); CHAT.msgs = CHAT.msgs.filter(x => x.id !== m.id); kv.set('chat.msgs', CHAT.msgs); notify(); }
  catch (e) { toast(e.message, 'bad'); }
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
