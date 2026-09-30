// ================= 💬 Chat del equipo =================
import { h, mount, btn, avatar, toast } from '../ui.js';
import { S, can, user } from '../store.js';
import { CHAT, onChat, send, setOpen, retry, loadOlder, delMsg } from '../chat.js';

const hm = iso => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const dayLabel = iso => { const d = new Date(iso), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1); return d.toDateString() === t.toDateString() ? 'Hoy' : d.toDateString() === y.toDateString() ? 'Ayer' : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); };

export function render(el, params) {
  const canDel = can('chat.borrar');
  const who = h('div.chat-who');
  const log = h('div.chat-log.team', { role: 'log', 'aria-live': 'polite' });
  const ta = h('textarea', { rows: 1, placeholder: 'Escribe un mensaje… (usa @Nombre para avisar a alguien)', 'aria-label': 'Mensaje' });
  const sendB = btn('', go2, { cls: 'primary icon', icon: 'send', title: 'Enviar' });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go2(); } });
  const more = btn('Ver mensajes anteriores', async () => { more.disabled = true; try { const n = await loadOlder(); if (!n) more.remove(); } catch (e) { toast(e.message, 'bad'); } more.disabled = false; }, { cls: 'ghost sm' });
  el.append(h('div.page-head', h('div', h('h1', '💬 Chat del equipo'), h('div.muted.small', 'Mensajes en vivo entre todo el equipo.')), who), h('div.chat.team', more, log, h('div.chat-in', ta, sendB)));
  async function go2() { const t = ta.value; if (!t.trim()) return; ta.value = ''; ta.style.height = 'auto'; await send(t); }
  // v10: la conversación NO se redibuja entera: solo se añaden o cambian los mensajes afectados,
  // y al cargar mensajes antiguos se mantiene la posición de lectura.
  const nodes = new Map();
  let lastLastId = '', focusMsg = '';
  function draw() {
    const on = CHAT.conectados || [];
    mount(who, h('div.row.wrap', h('span.tiny.muted', 'Conectados ahora:'), on.length ? on.map(c => h('span.online', avatar(user(c.id) || { nombre: c.nombre }, 's'), c.nombre)) : h('span.tiny.muted', 'nadie más')), CHAT.error ? h('span.tiny.bad-t', ' · ' + CHAT.error) : null);
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    const oldH = log.scrollHeight, oldTop = log.scrollTop;
    const want = [];
    let lastDay = '';
    if (!CHAT.msgs.length) want.push(['empty', 'e', () => h('div.empty', h('h3', 'Todavía no hay mensajes'), h('p', 'Escribe el primero: todo el equipo lo verá al momento.'))]);
    CHAT.msgs.forEach((m, i) => {
      const d = dayLabel(m.creado);
      if (d !== lastDay) { want.push(['d_' + d, d, () => h('div.day-sep', h('span', d))]); lastDay = d; }
      const mine = m.autorId === S.me.id;
      const prev = CHAT.msgs[i - 1];
      const grouped = prev && prev.autorId === m.autorId && dayLabel(prev.creado) === d && (new Date(m.creado) - new Date(prev.creado)) < 300000;
      const st = m.pendiente ? 'p' : m.error ? 'e' + m.error : 'ok';
      want.push(['m_' + m.id, [grouped, st, m.texto, m.creado].join('|'), () => {
        const u = user(m.autorId) || { nombre: m.autor };
        return h('div.cmsg' + (mine ? '.me' : '') + (grouped ? '.grp' : ''), { dataset: { m: m.id } },
          !mine && !grouped ? avatar(u, 's') : h('span.av-sp'),
          h('div.cb', !mine && !grouped ? h('div.tiny.bold', m.autor) : null, h('div.ct', highlight(m.texto)),
            h('div.tiny.muted.time', m.pendiente ? '🕓 Enviando…' : m.error ? h('a', { href: 'javascript:void 0', onclick: () => retry(m) }, '⚠️ ' + m.error) : hm(m.creado) + (mine ? ' ✓' : ''))),
          canDel && !m.pendiente && !m.error ? h('button.cdel', { title: 'Borrar mensaje (va a la papelera)', onclick: () => delMsg(m) }, '🗑') : null);
      }]);
    });
    const keep = new Set(want.map(w => w[0]));
    for (const [k, v] of nodes) if (!keep.has(k)) { v.el.remove(); nodes.delete(k); }
    const firstBefore = log.firstElementChild;
    want.forEach(([k, sig, mk], i) => {
      let n = nodes.get(k);
      if (!n || n.sig !== sig) { const el2 = mk(); if (n) n.el.replaceWith(el2); n = { sig, el: el2 }; nodes.set(k, n); }
      if (log.children[i] !== n.el) log.insertBefore(n.el, log.children[i] || null);
    });
    const lastId = CHAT.msgs.length ? CHAT.msgs[CHAT.msgs.length - 1].id : '';
    const lastMine = CHAT.msgs.length && CHAT.msgs[CHAT.msgs.length - 1].autorId === S.me.id;
    if (focusMsg && nodes.get('m_' + focusMsg)) {
      const el2 = nodes.get('m_' + focusMsg).el; el2.scrollIntoView({ block: 'center' }); el2.classList.add('hl'); setTimeout(() => el2.classList.remove('hl'), 3500); focusMsg = '';
    } else if (lastId !== lastLastId && (atBottom || lastMine || !lastLastId)) log.scrollTop = log.scrollHeight; // mensaje nuevo
    else if (firstBefore && log.firstElementChild !== firstBefore && !atBottom) log.scrollTop = oldTop + (log.scrollHeight - oldH); // cargados antiguos: no se mueve
    lastLastId = lastId;
  }
  function highlight(t) {
    const out = h('span');
    String(t).split(/(@[\wÀ-ÿ.]+)/).forEach(p => out.appendChild(/^@/.test(p) ? h('b.mention', p) : document.createTextNode(p)));
    return out;
  }
  if (!can('chat.usar')) { mount(el, h('p', 'No tienes acceso al chat.')); return {}; }
  focusMsg = (params || []).find(x => x && !x.startsWith('?')) || '';
  const off = onChat(draw);
  setOpen(true);
  draw();
  setTimeout(() => ta.focus(), 50);
  if ('Notification' in window && Notification.permission === 'default') setTimeout(() => { try { Notification.requestPermission(); } catch (e) { } }, 3000);
  return { destroy: () => { off(); setOpen(false); }, update: () => { }, params: p => { focusMsg = (p || []).find(x => x && !x.startsWith('?')) || ''; draw(); } };
}
