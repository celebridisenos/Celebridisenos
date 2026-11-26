// ================= 25-11-2026 · ICONOS DE LÍNEA DE LA CARA «FAMILIA» =================
// Contrato común (FAMILIA_VISUAL.md): adulto, mate, sin dibujitos. Los trazos que faltaban en ui.js y la tabla «emoji → icono de línea».
// En la cara Familia (html.fam) los emojis de los textos del programa se pintan como iconos de línea, siempre el mismo para lo mismo.
// No toca los textos guardados ni lo que se copia o se manda a un cliente: solo lo que se pinta con h() (nunca en <textarea>, <pre>, <option>).
// En las caras de antes no hace nada: salen los emojis de siempre.
export const TRAZOS = {
  ok: 'M12 22a10 10 0 100-20 10 10 0 000 20zM8 12.2l2.8 2.8L16.2 9.4',
  tool: 'M14.7 6.3a4 4 0 00-5.4 5L3 17.6V21h3.4l6.3-6.3a4 4 0 005-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  flag: 'M5 22V3M5 4h13l-2.5 4.5L18 13H5',
  palette: 'M12 22a10 10 0 110-20c5.5 0 10 3.6 10 8 0 3-2.4 5-5 5h-2a2 2 0 00-1.4 3.4c.7.8.2 3.6-1.6 3.6zM7 12h.01M9 7.5h.01M14.5 7h.01M18 10.5h.01',
  list: 'M9 4h6v3H9zM8 5H5v16h14V5h-3M8.5 12h7M8.5 16h5',
  spool: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16a4 4 0 100-8 4 4 0 000 8zM12 2v6M12 16v6',
  unlock: 'M5 11h14v10H5zM8 11V7a4 4 0 017.6-1.7',
  ruler: 'M3 15L15 3l6 6L9 21zM7 11l2 2M10 8l2 2M13 5l2 2',
  cart: 'M2 3h3l2.6 12h10.6L21 7H6M9 21a1.3 1.3 0 100-2.6A1.3 1.3 0 009 21zM17 21a1.3 1.3 0 100-2.6 1.3 1.3 0 000 2.6z',
  bag: 'M5 8h14l1 13H4zM9 8V6a3 3 0 016 0v2',
  puzzle: 'M4 8h4a2 2 0 114 0h4v4a2 2 0 110 4v4H4z',
  ban: 'M12 22a10 10 0 100-20 10 10 0 000 20zM5 5l14 14',
  image: 'M3 4h18v16H3zM3 16l5-5 5 5 3-3 5 5M15.5 9.5h.01',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  bulb: 'M9 18h6M10 21.5h4M12 2a7 7 0 00-4 12.7V18h8v-3.3A7 7 0 0012 2z',
  robot: 'M5 9h14v10H5zM12 9V5M12 5a1.2 1.2 0 100-2.4A1.2 1.2 0 0012 5zM9 13.5h.01M15 13.5h.01M9.5 16.5h5M2.5 12v4M21.5 12v4',
  scissors: 'M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12',
  broom: 'M14 3l7 7M17.5 6.5L11 13M11 13l-2-2-6 8 2.5 2.5 8-6zM6 17l2 2',
  target: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  pulse: 'M2 12h4l3-8 5 16 3-8h5',
  moon: 'M21 13A9 9 0 1111 3a7 7 0 0010 10z',
  screen: 'M2 4h20v13H2zM8 21h8M12 17v4',
  flask: 'M9 2h6M10 2v7L4 20a1.4 1.4 0 001.3 2h13.4a1.4 1.4 0 001.3-2L14 9V2M7 15h10',
  mail: 'M2 5h20v14H2zM2 6l10 7L22 6',
  trophy: 'M7 4h10v5a5 5 0 01-10 0zM7 5H3c0 4 2 5 4 5M17 5h4c0 4-2 5-4 5M12 14v4M8 21h8M9.5 18h5',
  save: 'M4 3h13l4 4v14H4zM8 3v5h8V3M8 21v-7h9v7',
  globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2c3 3 4 6.5 4 10s-1 7-4 10c-3-3-4-6.5-4-10s1-7 4-10z',
  factory: 'M3 21V9l6 4V9l6 4V4h6v17zM8 17h.01M12 17h.01M16 17h.01',
  calc: 'M5 2h14v20H5zM8 6h8v3H8zM8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01',
  help: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.2 9a2.9 2.9 0 015.6 1c0 2-2.8 2.4-2.8 4.2M12 17.5h.01',
  signal: 'M4 20a16 16 0 0116-16M8 20A12 12 0 0120 8M12 20a8 8 0 018-8M18 19.5h.01',
  sound: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 010 7M19 6a9 9 0 010 12',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9.5l5 5M22 9.5l-5 5',
  compass: 'M12 22a10 10 0 100-20 10 10 0 000 20zM15.5 8.5l-2 5-5 2 2-5z',
  cabinet: 'M4 2h16v20H4zM4 9h16M4 15.5h16M10 5.5h4M10 12.2h4M10 18.7h4',
  grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  pen: 'M12 19l7-7 2 2-7 7-3 1zM19 12l-7.5-9.5L3 3l.5 8.5L12 19M3 3l7.5 7.5M11 12.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  stop: 'M6 6h12v12H6z',
  pause: 'M8 5v14M16 5v14',
  inbox: 'M3 13l3-9h12l3 9v7H3zM3 13h5l1.5 3h5L16 13h5',
  book: 'M4 4h6a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6z',
  scale: 'M12 3v18M8 21h8M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z',
  paint: 'M3 4h14v6H3zM17 7h4v5h-9v3M10.5 15h3v7h-3z',
  collapse: 'M11 17l-5-5 5-5M18 17l-5-5 5-5',
  expand: 'M13 17l5-5-5-5M6 17l5-5-5-5',
  paquete: 'M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9M7.5 5.25l9 4.5v3.5',
  snow: 'M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17M12 5.5l2-2M12 5.5l-2-2M12 18.5l2 2M12 18.5l-2 2'
};
// trazo → sus emojis ('nada' = se quita). Lo que no esté aquí se queda como está.
const TABLA = {
  alert: '⚠🚨', ok: '✅☑', box: '📦', sparkles: '✨🪄🎉🧠🌟', printer: '🖨', phone: '📱📲', camera: '📸📷', video: '🎬🎥', msg: '💬🗨', palette: '🎨',
  edit: '✏📝✍', tag: '🏷🔖🎟', download: '⬇', clock: '⏳⏱⏰🕒⌛🕓', gift: '🎁', list: '📋', tool: '🛠🔧🧰🔩', spool: '🧵', euro: '💶💰💳💵🪙', star: '⭐',
  lock: '🔒🔐', unlock: '🔓', ruler: '📏📐', cart: '🛒', bag: '🛍', puzzle: '🧩', cube: '🧊', ban: '⛔🚫🛑', plus: '➕', truck: '🚚', image: '🖼', bolt: '⚡', check: '✔',
  bulb: '💡', robot: '🤖', file: '📄🧾📃', scissors: '✂', refresh: '🔄🔁', trash: '🗑', broom: '🧹🧽', settings: '⚙', folder: '📂📁🗂', upload: '📤⬆', inbox: '📥',
  target: '🎯', pulse: '🩺', moon: '🌌🌙💤😴', sun: '☀🤍', x: '❌✖', screen: '🖥💻', search: '🔎🔍', flask: '🧪', mail: '✉📬💌📧', eye: '👁👀🙈', trophy: '🏆', key: '🔑', save: '💾',
  globe: '🌐🌍🌎', factory: '🏭', send: '🚀✈', calc: '🧮', shield: '🛡', bell: '🔔', link: '🔗📎', calendar: '📅🗓📆', help: '❓', signal: '📡🛰', chart: '📈📊', users: '👥',
  user: '👤', home: '🏠🏡', sound: '🔊📣📢', mute: '🔇🔕', pin: '📌📍', qr: '🔳', flag: '🏁', compass: '🧭', news: '📰', store: '🏬🏪', cabinet: '🗄🧺', trend: '🔮', logout: '🚪',
  book: '📚📖', scale: '⚖', paint: '🖌', archive: '🗃', stop: '⏹', pause: '⏸', mic: '🎤🎙', snow: '❄', nada: '👋🙌🤩'
};
const PUNTOS = { '🔴': '#C0392B', '🟢': '#1E9E6A', '🟡': '#D9A400', '🟠': '#E0922F', '🔵': '#4A6FA5', '🟣': '#7B61C9', '⚪': '#B9BDC3', '⚫': '#2B3036', '🟤': '#7A5230' };
const MAPA = new Map();
for (const k in TABLA) for (const e of TABLA[k]) MAPA.set(e, k);
const RE = new RegExp('([' + [...MAPA.keys(), ...Object.keys(PUNTOS)].join('') + '])\\uFE0F?', 'u');
const HAY = /[⌀-⯿\uD83C-\uD83E]/;
const NO = /^(OPTION|TITLE|STYLE|SCRIPT|TEXTAREA|PRE|CODE|OPTGROUP)$/;
const SVG = 'http://www.w3.org/2000/svg', de = document.documentElement;
export const esFam = () => de.classList.contains('fam');
// svg con sus medidas y su trazo puestos a mano: también se ve bien fuera de la página (al imprimir)
export function trazo(d, cls) {
  const s = document.createElementNS(SVG, 'svg');
  const A = { viewBox: '0 0 24 24', class: cls, 'aria-hidden': 'true', width: '1em', height: '1em', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  for (const k in A) s.setAttribute(k, A[k]);
  const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', d); s.appendChild(p); return s;
}
function punto(c) { const i = document.createElement('i'); i.className = 'ie-p'; i.style.cssText = 'display:inline-block;width:.62em;height:.62em;border-radius:50%;background:' + c; i.setAttribute('aria-hidden', 'true'); return i; }
// el texto que va a pintarse dentro de «el» → trozos (textos e iconos), o null si no hay nada que cambiar. P = los trazos de ui.js
export function iconiza(el, s, P) {
  if (!HAY.test(s) || !esFam() || NO.test(el.tagName) || !RE.test(s)) return null;
  const out = []; let resto = s, m;
  while ((m = RE.exec(resto))) {
    let antes = resto.slice(0, m.index); resto = resto.slice(m.index + m[0].length);
    const c = PUNTOS[m[1]], k = MAPA.get(m[1]);
    if (k === 'nada') { if (!resto) antes = antes.trimEnd(); else resto = resto.replace(/^ /, ''); }
    if (antes) out.push(document.createTextNode(antes));
    if (k === 'nada') continue;
    const n = c ? punto(c) : trazo(P[k] || TRAZOS[k] || '', 'ie ie-' + k);
    if (resto.startsWith(' ')) { n.classList.add('ie-s'); resto = resto.slice(1); }
    out.push(n);
  }
  if (resto) out.push(document.createTextNode(resto));
  return out;
}
