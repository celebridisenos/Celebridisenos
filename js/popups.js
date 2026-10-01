// ================= v11 · Avisos flotantes =================
// Ventanas pequeñas y semitransparentes (no bloquean nada) para: mensajes del chat, pedidos nuevos,
// impresiones terminadas, incidencias, urgentes… Qué evento sale lo decide el motor de reglas
// (Configuración → Automatizaciones, columna "Ventana"). Cada persona elige en su perfil si los quiere,
// dónde, cuánto duran, la transparencia y el sonido (se guarda en este dispositivo).
import { h, icon, avatar } from './ui.js';
import { S, on, user } from './store.js';
import { CHAT, onChat } from './chat.js';

const CL = window.CL;
const DEF = { on: true, pos: 'br', ms: 6000, opacity: 0.92, sound: true };
export function popupPrefs() { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem('cd.popup') || '{}')); } catch (e) { return Object.assign({}, DEF); } }
export function savePopupPrefs(p) { try { localStorage.setItem('cd.popup', JSON.stringify(p)); } catch (e) { } box = null; }
const rule = ev => ((S.cfg && S.cfg.automatizaciones) || {})[ev] || { popup: false };
const evOf = n => n.tipo === 'taller' ? (/^jobdone_/.test(n.clave || '') ? 'impresion_terminada' : 'filamento_bajo') : n.tipo;

let box = null;
function container(p) {
  if (box && document.body.contains(box)) return box;
  document.querySelectorAll('.popups').forEach(x => x.remove());
  box = h('div.popups.' + p.pos, { role: 'status', 'aria-live': 'polite' });
  document.body.appendChild(box);
  return box;
}
function beep() { try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 740; g.gain.value = 0.035; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.1); } catch (e) { } }

export function popup({ titulo, texto, enlace, avatarDe, ic, kind }, force) {
  const p = popupPrefs();
  if (!p.on && !force) return;
  if (document.body.classList.contains('printing')) return;
  const b = container(p);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
  const el = h('div.popup' + (kind ? '.' + kind : ''), { style: { '--op': String(p.opacity) }, onclick: e => { if (e.target.closest('.x')) return close(); if (enlace) location.hash = '#/' + enlace; close(); } },
    avatarDe ? avatar(avatarDe, 's') : h('span.pic', ic || icon('bell', 's')),
    h('div.grow', h('div.pt', titulo), texto ? h('div.px', texto) : null),
    h('button.x', { 'aria-label': 'Cerrar' }, '✕'));
  b.appendChild(el);
  while (b.children.length > 4) b.firstChild.remove();
  if (p.sound && !force) beep();
  let t = setTimeout(close, p.ms);
  el.addEventListener('mouseenter', () => clearTimeout(t));
  el.addEventListener('mouseleave', () => { t = setTimeout(close, 2500); });
}

// ---------- Vigilante: qué es nuevo desde la última vez ----------
let seenN = null, seenO = null, seenC = null;
export function startPopups() {
  const scan = () => {
    if (!S.me || !S.cfg) return;
    const ns = S.t.notificaciones || [], os = S.t.pedidos || [];
    if (seenN === null) { seenN = new Set(ns.map(n => n.id)); seenO = new Set(os.map(o => o.id)); return; }
    ns.forEach(n => {
      if (seenN.has(n.id)) return; seenN.add(n.id);
      if (n.leida || !rule(evOf(n)).popup) return;
      if (evOf(n) === 'mencion' && document.body.dataset.view === 'chat') return;
      popup({ titulo: n.titulo, texto: n.texto, enlace: String(n.enlace || '').replace(/^pedido:/, 'pedidos/').replace(/^taller:/, 'taller/'), kind: n.tipo === 'urgente' || n.tipo === 'incidencia' ? 'bad' : n.tipo === 'stock' || n.tipo === 'taller' ? 'warn' : '' });
    });
    os.forEach(o => {
      if (seenO.has(o.id)) return; seenO.add(o.id);
      if (!o.creadoPor || o.creadoPor === S.me.nombre || !rule('pedido_nuevo').popup) return;
      popup({ titulo: '🛒 Pedido nuevo nº ' + o.numero, texto: o.cliente + ' · ' + (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + o.producto + ' · por ' + o.creadoPor, enlace: 'pedidos/' + o.id });
    });
  };
  on(scan);
  onChat(() => {
    if (!S.me) return;
    const msgs = CHAT.msgs || [];
    if (seenC === null) { if (CHAT.ready) seenC = new Set(msgs.map(m => m.id)); return; }
    msgs.forEach(m => {
      if (seenC.has(m.id)) return; seenC.add(m.id);
      if (m.autorId === S.me.id || m.pendiente || CHAT.open && document.body.dataset.view === 'chat') return;
      const mention = new RegExp('@' + (S.me.nombre || '').split(' ')[0], 'i').test(m.texto);
      if (!rule(mention ? 'mencion' : 'mensaje_chat').popup) return;
      popup({ titulo: (mention ? '📣 ' : '💬 ') + m.autor, texto: String(m.texto).slice(0, 140), enlace: 'chat/' + m.id, avatarDe: user(m.autorId) || { nombre: m.autor } });
    });
  });
}
