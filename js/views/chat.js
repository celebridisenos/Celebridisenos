// ================= 💬 Chat del equipo =================
import { h, mount, btn, avatar, toast } from '../ui.js';
import { S, can, user } from '../store.js';
import { CHAT, onChat, send, setOpen, retry, loadOlder } from '../chat.js';

const hm = iso => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const dayLabel = iso => { const d = new Date(iso), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1); return d.toDateString() === t.toDateString() ? 'Hoy' : d.toDateString() === y.toDateString() ? 'Ayer' : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); };

export function render(el) {
  const who = h('div.chat-who');
  const log = h('div.chat-log.team', { role: 'log', 'aria-live': 'polite' });
  const ta = h('textarea', { rows: 1, placeholder: 'Escribe un mensaje… (usa @Nombre para avisar a alguien)', 'aria-label': 'Mensaje' });
  const sendB = btn('', go2, { cls: 'primary icon', icon: 'send', title: 'Enviar' });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go2(); } });
  const more = btn('Ver mensajes anteriores', async () => { more.disabled = true; try { const n = await loadOlder(); if (!n) more.remove(); } catch (e) { toast(e.message, 'bad'); } more.disabled = false; }, { cls: 'ghost sm' });
  el.append(h('div.page-head', h('div', h('h1', '💬 Chat del equipo'), h('div.muted.small', 'Mensajes en vivo entre todo el equipo.')), who), h('div.chat.team', more, log, h('div.chat-in', ta, sendB)));
  async function go2() { const t = ta.value; if (!t.trim()) return; ta.value = ''; ta.style.height = 'auto'; await send(t); }
  let lastCount = -1;
  function draw() {
    const on = CHAT.conectados || [];
    mount(who, h('div.row.wrap', h('span.tiny.muted', 'Conectados ahora:'), on.length ? on.map(c => h('span.online', avatar(user(c.id) || { nombre: c.nombre }, 's'), c.nombre)) : h('span.tiny.muted', 'nadie más')), CHAT.error ? h('span.tiny.bad-t', ' · ' + CHAT.error) : null);
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    const kids = [];
    let lastDay = '';
    if (!CHAT.msgs.length) kids.push(h('div.empty', h('h3', 'Todavía no hay mensajes'), h('p', 'Escribe el primero: todo el equipo lo verá al momento.')));
    CHAT.msgs.forEach((m, i) => {
      const d = dayLabel(m.creado);
      if (d !== lastDay) { kids.push(h('div.day-sep', h('span', d))); lastDay = d; }
      const mine = m.autorId === S.me.id;
      const prev = CHAT.msgs[i - 1];
      const grouped = prev && prev.autorId === m.autorId && dayLabel(prev.creado) === d && (new Date(m.creado) - new Date(prev.creado)) < 300000;
      const u = user(m.autorId) || { nombre: m.autor };
      kids.push(h('div.cmsg' + (mine ? '.me' : '') + (grouped ? '.grp' : ''),
        !mine && !grouped ? avatar(u, 's') : h('span.av-sp'),
        h('div.cb', !mine && !grouped ? h('div.tiny.bold', m.autor) : null, h('div.ct', highlight(m.texto)),
          h('div.tiny.muted.time', m.pendiente ? 'Enviando…' : m.error ? h('a', { href: 'javascript:void 0', onclick: () => retry(m) }, '⚠️ ' + m.error) : hm(m.creado)))));
    });
    mount(log, kids);
    if (atBottom || CHAT.msgs.length !== lastCount) log.scrollTop = log.scrollHeight;
    lastCount = CHAT.msgs.length;
  }
  function highlight(t) {
    const out = h('span');
    String(t).split(/(@[\wÀ-ÿ.]+)/).forEach(p => out.appendChild(/^@/.test(p) ? h('b.mention', p) : document.createTextNode(p)));
    return out;
  }
  if (!can('chat.usar')) { mount(el, h('p', 'No tienes acceso al chat.')); return {}; }
  const off = onChat(draw);
  setOpen(true);
  draw();
  setTimeout(() => ta.focus(), 50);
  if ('Notification' in window && Notification.permission === 'default') setTimeout(() => { try { Notification.requestPermission(); } catch (e) { } }, 3000);
  return { destroy: () => { off(); setOpen(false); }, update: () => { } };
}
