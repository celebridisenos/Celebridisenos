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

// ---------- v13.7 · Sonido de pedido web nuevo (dos notas suaves, sin archivos). Se apaga desde «Pedidos web». ----------
export const sonidoActivo = () => { try { return localStorage.getItem('cd.pw.sonido') !== '0'; } catch (e) { return true; } };
export function sonidoPedidoWeb(forzar) {
  if (!forzar && !sonidoActivo()) return;
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const ctx = new A(), t0 = ctx.currentTime;
    [[880, 0], [1320, 0.16]].forEach(([f, d]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.18, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.35); o.connect(g).connect(ctx.destination); o.start(t0 + d); o.stop(t0 + d + 0.4); });
    setTimeout(() => ctx.close().catch(() => { }), 900);
    window.__cdSonidos = (window.__cdSonidos || 0) + 1; // (para las pruebas)
  } catch (e) { }
}

// ---------- Vigilante: qué es nuevo desde la última vez ----------
let seenN = null, seenO = null, seenC = null;
// v17.1 · sonido de INCIDENCIA: tres tonos que bajan (no se confunde con el aviso normal ni con el de pedido web)
export function sonidoIncidencia() { try { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const a = new A(); [880, 660, 440].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, a.currentTime + i * 0.22); g.gain.exponentialRampToValueAtTime(0.09, a.currentTime + i * 0.22 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + i * 0.22 + 0.2); o.connect(g); g.connect(a.destination); o.start(a.currentTime + i * 0.22); o.stop(a.currentTime + i * 0.22 + 0.21); }); setTimeout(() => a.close().catch(() => { }), 1200); } catch (e) { } }
let vistasInc = null;
export function startPopups() {
  const scan = () => {
    if (!S.me || !S.cfg) return;
    const ns = S.t.notificaciones || [], os = S.t.pedidos || [];
    if (vistasInc === null) vistasInc = new Map(os.map(o => [o.id, String(o.incidencia || '')]));
    else os.forEach(o => { const ahora = String(o.incidencia || ''), antes = vistasInc.get(o.id); vistasInc.set(o.id, ahora); if (ahora && ahora !== antes && !o.eliminado) { window.__ultimaIncidencia = { id: o.id, t: Date.now() }; sonidoIncidencia(); popup({ titulo: '⚠️ INCIDENCIA · pedido nº ' + o.numero, texto: (o.cliente ? o.cliente + ' · ' : '') + ahora, enlace: 'pedidos/' + o.id, kind: 'bad' }, true); } });
    if (seenN === null) { seenN = new Set(ns.map(n => n.id)); seenO = new Set(os.map(o => o.id)); return; }
    ns.forEach(n => {
      if (seenN.has(n.id)) return; seenN.add(n.id);
      if (n.leida || !rule(evOf(n)).popup) return;
      if (evOf(n) === 'mencion' && document.body.dataset.view === 'chat') return;
      popup({ titulo: n.titulo, texto: n.texto, enlace: String(n.enlace || '').replace(/^pedido:/, 'pedidos/').replace(/^pedidoweb:/, 'pedidosweb/').replace(/^taller:/, 'taller/'), kind: n.tipo === 'urgente' || n.tipo === 'incidencia' ? 'bad' : n.tipo === 'stock' || n.tipo === 'taller' ? 'warn' : n.tipo === 'pedido_web' ? 'web' : '' });
      if (n.tipo === 'pedido_web') { // v13.7: un pedido de la web suena (se puede apagar en «Pedidos web») y, si la app está detrás, aviso del sistema
        sonidoPedidoWeb();
        if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
          try { const x = new Notification(n.titulo || '🛍️ Nuevo pedido web', { body: String(n.texto || '').slice(0, 180), tag: 'pw-' + n.id }); x.onclick = () => { try { window.focus(); location.hash = '#/' + String(n.enlace || '').replace(/^pedidoweb:/, 'pedidosweb/'); } catch (e) { } x.close(); }; } catch (e) { }
        }
      }
    });
    os.forEach(o => {
      if (seenO.has(o.id)) return; seenO.add(o.id);
      if (!o.creadoPor || o.creadoPor === S.me.nombre || !rule('pedido_nuevo').popup) return;
      if (o.refWeb) return; // v13.7: un pedido de la web ya tiene su propio aviso «NUEVO PEDIDO WEB» (no se repite por cada línea)
      popup({ titulo: '🛒 Pedido nuevo nº ' + o.numero, texto: o.cliente + ' · ' + (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + o.producto + ' · por ' + o.creadoPor, enlace: 'pedidos/' + o.id });
    });
  };
  on(scan); scan(); // v13.7: la referencia se toma YA (antes se tomaba en el primer cambio y ese primer aviso nuevo no salía)
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
