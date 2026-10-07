// ================= Utilidades de interfaz =================
const SVGNS = 'http://www.w3.org/2000/svg';

// h('div.card#id', {onclick}, hijos...)
export function h(sel, attrs, ...kids) {
  if (attrs === null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) { kids.unshift(attrs); attrs = {}; }
  const m = sel.replace(/\.(?=\.|$)/g, '').match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i); // v11: tolera clases vacías ('div.x.' + '')
  const el = document.createElement(m[1] || 'div');
  (m[2].match(/[.#][\w-]+/g) || []).forEach(p => { if (p[0] === '.') el.classList.add(p.slice(1)); else el.id = p.slice(1); });
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach(c => el.classList.add(c));
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  add(el, kids);
  return el;
}
function add(el, kids) {
  kids.forEach(k => {
    if (k === null || k === undefined || k === false || k === '') return;
    if (Array.isArray(k)) add(el, k);
    else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  });
}
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function mount(el, ...kids) { clear(el); add(el, kids); return el; }
export const $ = (s, r = document) => r.querySelector(s);

// ---------- Iconos (trazos propios, 24x24) ----------
const P = {
  home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  box: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
  users: 'M16 20v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 11a4 4 0 100-8 4 4 0 000 8zM22 20v-1a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  user: 'M20 21v-1a5 5 0 00-5-5H9a5 5 0 00-5 5v1M12 11a4 4 0 100-8 4 4 0 000 8z',
  check: 'M20 6L9 17l-5-5',
  tasks: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9',
  cube: 'M12 2l9 5v10l-9 5-9-5V7l9-5zM12 12l9-5M12 12v10M12 12L3 7',
  news: 'M4 4h13v16H6a2 2 0 01-2-2V4zM17 8h3v10a2 2 0 01-2 2M8 8h5M8 12h5M8 16h3',
  calendar: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4',
  folder: 'M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6z',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6L6 18M6 6l12 12',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  camera: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z',
  video: 'M23 7l-7 5 7 5V7zM1 5h15v14H1z',
  file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  alert: 'M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z',
  msg: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 118 0v4',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15',
  wifioff: 'M1 1l22 22M16.7 11.1A11 11 0 0119 12.6M5 12.6a11 11 0 015.2-2.5M10.7 5.1A16 16 0 0122.6 9M1.4 9a16 16 0 014.3-2.8M8.5 16.1a6 6 0 017 0M12 20h.01',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M3 12h18M3 6h18M3 18h18',
  left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6', down: 'M6 9l6 6 6-6',
  filter: 'M22 3H2l8 9.5V19l4 2v-8.5z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  link: 'M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7',
  external: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
  copy: 'M9 9h13v13H9zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  mic: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4',
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  phone: 'M5 2h14v20H5zM11 18h2',
  euro: 'M18 7a7 7 0 100 10M4 10h10M4 14h10',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  play: 'M5 3l14 9-14 9z',
  pin: 'M12 17v5M9 3h6l-1 7 4 3v2H6v-2l4-3z',
  archive: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
  history: 'M3 3v5h5M3.05 13A9 9 0 106 5.3L3 8M12 7v5l4 2',
  bluetooth: 'M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z',
  store: 'M3 9l1-5h16l1 5M3 9h18v2a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0V9zM5 13v8h14v-8',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2',
  key: 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zM15.5 7.5l3 3L22 7l-3-3'
};
export function icon(name, cls) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', 'i' + (cls ? ' ' + cls : ''));
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', P[name] || P.file);
  s.appendChild(p);
  return s;
}

// ---------- Formatos ----------
const eurF = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const eur = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? '—' : eurF.format(Number(v));
export const num = v => new Intl.NumberFormat('es-ES').format(Number(v) || 0);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
export function fdate(ds, long) {
  if (!ds) return '';
  const m = String(ds).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(ds);
  return long ? `${+m[3]} de ${MESES_L[+m[2] - 1]} de ${m[1]}` : `${+m[3]} ${MESES[+m[2] - 1]} ${m[1]}`;
}
export function monthName(i) { return MESES_L[i]; }
export function fdt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function ago(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (iso.length === 10) {
    const days = Math.round(s / 86400);
    if (days <= 0) return days === 0 ? 'hoy' : 'dentro de ' + (-days) + ' días';
    if (days === 1) return 'ayer';
    if (days < 30) return 'hace ' + days + ' días';
    if (days < 365) return 'hace ' + Math.round(days / 30) + (Math.round(days / 30) === 1 ? ' mes' : ' meses');
    return 'hace ' + Math.round(days / 365) + (Math.round(days / 365) === 1 ? ' año' : ' años');
  }
  if (s < 60) return 'ahora mismo';
  if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
  if (s < 86400 * 7) return 'hace ' + Math.round(s / 86400) + ' días';
  return fdate(d.toISOString().slice(0, 10));
}
export const bytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB';
export const initials = s => String(s || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
export const na = (v, txt) => (v === '' || v === null || v === undefined) ? h('span.na', txt || 'No disponible') : String(v);

// ---------- Componentes ----------
export function btn(label, onclick, opts = {}) {
  const b = h('button.btn' + (opts.cls ? '.' + opts.cls.split(' ').join('.') : ''), { type: opts.type || 'button', title: opts.title, disabled: opts.disabled, autofocus: opts.autofocus, onclick }, opts.icon ? icon(opts.icon, opts.small ? 's' : '') : null, label ? h('span', label) : null);
  return b;
}
let avatarSrc = null; // v10: la app indica cómo encontrar la foto de perfil (miniatura guardada)
export function setAvatarSource(fn) { avatarSrc = fn; }
export function avatar(u, cls, fileUrl) {
  const name = u && (u.nombre || u) || '?';
  if (!fileUrl && avatarSrc && u && u.avatarId) fileUrl = avatarSrc(u.avatarId);
  const a = h('span.avatar' + (cls ? '.' + cls : ''), { style: { background: (u && u.color) || stringColor(name) }, title: name });
  if (fileUrl) a.appendChild(h('img', { src: fileUrl, alt: '' })); else a.textContent = initials(name);
  return a;
}
export function stringColor(s) {
  let x = 0; for (const ch of String(s)) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  const hues = [262, 330, 200, 160, 24, 290, 190, 350];
  return `hsl(${hues[x % hues.length]} 62% 52%)`;
}
export function pill(text, cls, color) {
  const p = h('span.pill' + (cls ? '.' + cls : ''));
  if (color) { p.appendChild(h('span.d', { style: { background: color } })); p.style.background = `color-mix(in srgb, ${color} 14%, transparent)`; p.style.color = `color-mix(in srgb, ${color} 80%, var(--text))`; }
  p.appendChild(document.createTextNode(text));
  return p;
}
export function dueBadge(t) { return h('span.due.' + (t.nivel === 'none' ? 'x' : t.nivel), t.texto); }
export function empty(ic, title, text, action) {
  return h('div.empty', icon(ic), h('h3', title), text ? h('p', text) : null, action || null);
}
export function field(label, input, hint, cls) {
  return h('div.field' + (cls ? '.' + cls : ''), label ? h('label', label) : null, input, hint ? h('span.hint', hint) : null);
}
export function inp(attrs) { return h('input.inp', Object.assign({ type: 'text' }, attrs || {})); }
export function sel(options, value, attrs) {
  const s = h('select.inp', attrs || {});
  options.forEach(o => { const v = typeof o === 'object' ? o.v : o; const t = typeof o === 'object' ? o.t : o; const op = h('option', { value: v }, t); if (String(v) === String(value ?? '')) op.selected = true; s.appendChild(op); });
  return s;
}
export function area(attrs) { return h('textarea.inp', attrs || {}); }
export function sw(checked, onchange) { const i = h('input', { type: 'checkbox', checked, onchange: e => onchange && onchange(e.target.checked) }); return h('label.switch', i, h('span')); }

// ---------- Modales ----------
let modalStack = [];
export function modal(title, body, footer, opts = {}) {
  const close = () => { o.remove(); modalStack = modalStack.filter(x => x !== o); document.removeEventListener('keydown', onKey); opts.onclose && opts.onclose(); };
  const onKey = e => { if (e.key === 'Escape' && modalStack[modalStack.length - 1] === o && !opts.sticky) close(); };
  const m = h('div.modal' + (opts.size ? '.' + opts.size : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div.modal-h', h('h2', title), btn('', close, { cls: 'ghost icon', icon: 'x', title: 'Cerrar' })),
    h('div.modal-b', body),
    footer ? h('div.modal-f', typeof footer === 'function' ? footer(close) : footer) : null);
  const o = h('div.overlay', { onclick: e => { if (e.target === o && !opts.sticky) close(); } }, m);
  document.body.appendChild(o);
  modalStack.push(o);
  document.addEventListener('keydown', onKey);
  setTimeout(() => { if (m.contains(document.activeElement)) return; const f = m.querySelector('[autofocus], .modal-b input:not([type=file]), .modal-b textarea, .modal-b select'); if (f && !opts.noFocus) f.focus(); }, 30);
  return { close, el: m, body: m.querySelector('.modal-b') };
}
export function drawer(build) {
  const close = () => { o.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape' && !document.querySelector('.overlay:not(.drawer-o)')) close(); };
  const d = h('div.drawer');
  const o = h('div.overlay.drawer-o', { onclick: e => { if (e.target === o) close(); } }, d);
  document.body.appendChild(o);
  document.addEventListener('keydown', onKey);
  build(d, close);
  return { close, el: d };
}
export function confirmDlg(title, text, okLabel, danger) {
  return new Promise(res => {
    let done = false;
    const fin = v => { if (!done) { done = true; res(v); } };
    modal(title, h('p', text), close => [btn('Cancelar', () => { fin(false); close(); }), btn(okLabel || 'Aceptar', () => { fin(true); close(); }, { cls: danger ? 'danger solid' : 'primary', autofocus: !danger })], { size: 'narrow', onclose: () => fin(false) });
  });
}
export function promptDlg(title, label, value, opts = {}) {
  return new Promise(res => {
    const i = opts.multiline ? area({ value: value || '', placeholder: opts.placeholder || '' }) : inp({ value: value || '', placeholder: opts.placeholder || '', type: opts.type || 'text' });
    let done = false;
    const m = modal(title, field(label, i, opts.hint), close => [btn('Cancelar', () => { done = true; res(null); close(); }), btn(opts.ok || 'Aceptar', () => { done = true; res(i.value); close(); }, { cls: 'primary' })], { size: 'narrow', onclose: () => { if (!done) { done = true; res(null); } } });
    i.addEventListener('keydown', e => { if (e.key === 'Enter' && !opts.multiline) { done = true; m.close(); res(i.value); } });
  });
}

// ---------- Avisos ----------
let toastBox;
export function toast(text, kind, ms, action) {
  if (!toastBox) { toastBox = h('div.toasts', { role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastBox); }
  const t = h('div.toast' + (kind ? '.' + kind : ''), h('span', text), action ? h('button.btn.sm.ghost', { onclick: () => { t.remove(); action.on(); } }, action.t) : null, h('button.x', { 'aria-label': 'Cerrar', onclick: () => t.remove() }, '✕'));
  toastBox.appendChild(t);
  setTimeout(() => t.remove(), ms || (kind === 'bad' ? 7000 : 3500));
}

export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function uid(prefix) { const a = new Uint8Array(8); crypto.getRandomValues(a); return (prefix ? prefix + '_' : '') + Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
// v11: menú desplegable pequeño ("Más ⋯") para acciones secundarias
export function menu(label, items, opts = {}) {
  const b = btn(label, ev => {
    ev.stopPropagation();
    document.querySelectorAll('.pop-menu').forEach(x => x.remove());
    const list = items.filter(Boolean);
    const m = h('div.pop-menu', { role: 'menu' }, list.map(it => h('button' + (it.danger ? '.danger' : ''), { role: 'menuitem', onclick: () => { m.remove(); it.on(); } }, it.icon ? icon(it.icon, 's') : null, it.t)));
    document.body.appendChild(m);
    const r = b.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.left)) + 'px';
    m.style.top = (r.bottom + mh + 8 > window.innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + 'px';
    setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
  }, Object.assign({ icon: 'menu' }, opts));
  return b;
}
export function copyText(t) { navigator.clipboard.writeText(t).then(() => toast('Copiado'), () => toast('No se pudo copiar', 'bad')); }
