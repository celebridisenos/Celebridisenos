// ================= 💬 CHATS CON CLIENTES · el menú MUY claro (01-11-2026, Biou) =================
// Él: «el menú de chats con Facebook, Opla, Vinted, Wallapop… no las veo, quiero que estén en un menú muy muy claro… el chat con el
// cliente, que pueda adjuntar los productos, catálogo actualizado en el momento siempre; si hay un cambio, al darle enviar se manda la
// última actualización en todas las plataformas».
// · Botón fijo «💬 Chats» arriba, en TODAS las pantallas → una ventanita con una baldosa GRANDE por plataforma (su color y su nombre).
// · «📤 Catálogo al día»: el enlace de su web (cambia solo al publicar un producto) + el PDF de ahora, para pegarlo en cada chat.
// La verdad: Vinted, Wallapop, Milanuncios y Opla no dejan que un programa mande mensajes solo (no tienen API pública; hacerlo a
// escondidas puede cerrarle la cuenta). Facebook solo con una cuenta de empresa aprobada. Por eso: un clic abre el chat y el mensaje
// ya está copiado; él lo pega y envía.
import { h, mount, btn, toast, area, modal, copyText } from './ui.js';
import { S } from './store.js';
import { desktop } from './desktop.js';

export const CHATS = [
  { k: 'facebook', t: 'Facebook', c: '#1877f2', l: 'f', url: 'https://www.facebook.com/messages' },
  { k: 'vinted', t: 'Vinted', c: '#09b1ba', l: 'V', url: 'https://www.vinted.es/inbox' },
  { k: 'wallapop', t: 'Wallapop', c: '#13c1ac', l: 'W', url: 'https://es.wallapop.com/app/chat' },
  { k: 'milanuncios', t: 'Milanuncios', c: '#ff6c00', l: 'M', url: 'https://www.milanuncios.com/mis-mensajes/' },
  { k: 'opla', t: 'Opla', c: '#7c3aed', l: 'O', url: 'https://www.opla.co/' },
  { k: 'whatsapp', t: 'WhatsApp', c: '#25d366', l: '✆', url: 'https://web.whatsapp.com/' }
];
// abre el chat de una plataforma: en el PC, en el navegador propio de chats (views/chatsnav.js); en el móvil, su app o su web
export function abreChat(k) {
  const c = CHATS.find(x => x.k === k);
  toast('Abriendo ' + (c ? c.t : 'tus chats') + '… la primera vez entra con tu cuenta.', 'ok', 4000);
  if (desktop.on && k === 'whatsapp') return desktop.openUrl(c.url); // (WhatsApp Web: en su navegador de siempre, donde ya tiene la sesión)
  if (desktop.on) return desktop.redes(k).catch(e => { if (c) desktop.openUrl(c.url); else toast(e.message || String(e), 'bad'); });
  if (c) window.open(c.url, '_blank', 'noopener');
  else CHATS.forEach(x => window.open(x.url, '_blank', 'noopener'));
}
// las baldosas (también las usa «Responder ventas»)
export function baldosas(onAbrir) {
  return h('div.ch-baldosas', CHATS.map(c => h('button.ch-b', { type: 'button', 'data-k': c.k, style: '--c:' + c.c, onclick: () => { abreChat(c.k); onAbrir && onAbrir(c); } },
    h('span.ch-logo', c.l), h('b', c.t), h('small', 'Abrir chat'))));
}
export const urlTienda = () => String(((S.cfg && S.cfg.tienda) || {}).url || '').replace(/\/+$/, '');
export function mensajeCatalogo() {
  const u = urlTienda();
  return '¡Hola! 😊 Aquí tienes mi catálogo actualizado, con los precios de hoy' + (u ? ':\n' + u : '.') + '\nSi te gusta algo, dímelo y te lo preparo. 🙌';
}
// 📤 el catálogo del momento, para pegarlo en todas
export function catalogoAlDia() {
  const ta = area({ rows: 4, value: mensajeCatalogo(), 'aria-label': 'Mensaje con tu catálogo' });
  const u = urlTienda();
  const m = modal('📤 Catálogo al día · para todos tus chats', h('div.col.ch-cat', { style: { gap: '12px' } },
    h('div.ch-pasos', h('div', h('b', '1'), h('span', 'Copia el mensaje (lleva el enlace de tu web: siempre está al día)')), h('div', h('b', '2'), h('span', 'Pulsa una plataforma: se abre su chat')), h('div', h('b', '3'), h('span', 'Pega (Ctrl + V) y envía'))),
    ta, !u ? h('p.small.warn-t', '⚠️ Tu tienda web no está conectada: el mensaje va sin enlace. Conéctala en Tienda web → Conexión.') : null,
    h('div.row.wrap', { style: { gap: '8px' } },
      btn('📋 Copiar mensaje', () => { copyText(ta.value); toast('📋 Copiado: ahora pégalo en el chat', 'ok', 4000); }, { cls: 'primary' }),
      btn('📄 PDF del catálogo (de ahora)', () => import('./catalogo_exporta.js').then(x => x.abrir()), { title: 'El catálogo en PDF con tus piezas de hoy: adjúntalo en el chat' })),
    h('div.lbl', 'Abrir el chat (el mensaje se copia solo):'),
    baldosas(() => copyText(ta.value)),
    h('p.tiny.muted', 'La verdad: Vinted, Wallapop, Milanuncios y Opla no dejan que ningún programa mande mensajes solo. Así es lo más rápido sin arriesgar tus cuentas: un clic, pegar y enviar.')),
    c => [btn('Cerrar', c)], { size: 'wide' });
  return m;
}
// la ventanita del botón «💬 Chats»
let abierto = null;
export function abre(ancla) {
  if (abierto) { abierto(); return; }
  const cierra = () => { caja.remove(); document.removeEventListener('pointerdown', fuera, true); document.removeEventListener('keydown', tecla, true); abierto = null; };
  const fuera = e => { if (!caja.contains(e.target) && !(ancla && ancla.contains(e.target))) cierra(); };
  const tecla = e => { if (e.key === 'Escape') cierra(); };
  const ir = r => { cierra(); location.hash = '#/' + r; };
  const caja = h('div.ch-pop', { role: 'dialog', 'aria-label': 'Chats con clientes' },
    h('div.ch-pop-h', h('b', '💬 Chats con clientes'), h('button.btn.ghost.icon.sm', { type: 'button', 'aria-label': 'Cerrar', onclick: cierra }, '✕')),
    baldosas(() => cierra()),
    h('button.ch-todos', { type: 'button', onclick: () => { abreChat(''); cierra(); } }, '💬 Abrir TODOS a la vez'),
    h('div.ch-acc',
      h('button.ch-a', { type: 'button', onclick: () => ir('responder') }, h('span', '🧾'), h('b', 'Enseñar un producto'), h('small', 'Foto, precio y enlace para pegar')),
      h('button.ch-a', { type: 'button', onclick: () => { cierra(); catalogoAlDia(); } }, h('span', '📤'), h('b', 'Catálogo al día'), h('small', 'El de hoy, para todos tus chats'))),
    desktop.on ? null : h('p.tiny.muted', '📱 En el móvil se abre la app o la web de cada una.'));
  document.body.append(caja);
  const b = ancla && ancla.getBoundingClientRect ? ancla.getBoundingClientRect() : { bottom: 62, right: window.innerWidth - 16 };
  caja.style.top = Math.round(b.bottom + 8) + 'px'; caja.style.right = Math.max(10, Math.round(window.innerWidth - b.right)) + 'px';
  setTimeout(() => { document.addEventListener('pointerdown', fuera, true); document.addEventListener('keydown', tecla, true); }, 0);
  abierto = cierra;
  return caja;
}
