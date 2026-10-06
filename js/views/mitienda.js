// ================= v13.10 · 🛍️ MI TIENDA =================
// Acceso directo a la tienda web para DIFUNDIRLA sin pasar por la Estantería: abrir, copiar el enlace, compartir
// (WhatsApp, Instagram… con el menú del móvil), ver el QR en grande para que lo escaneen y sacarlo por la impresora
// de etiquetas (10 × 10 cm, para el mostrador, la mesa o la feria).
import { h, mount, btn, toast, copyText } from '../ui.js';
import { S, can } from '../store.js';
import { go } from '../app.js';
import { qrSvg } from '../qr.js';
import { desktop } from '../desktop.js';

export const tiendaUrl = () => String((S.cfg && S.cfg.tienda && S.cfg.tienda.url) || '').trim().replace(/\/+$/, '');
export const tiendaNombre = () => (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'CelebriDiseños';
export const mensajeTienda = url => '🛍️ Mira la tienda de ' + tiendaNombre() + ': ' + url;

export function render(el) {
  const url = tiendaUrl();
  el.append(h('div.page-head', h('h1', '🛍️ Mi tienda'), h('span.muted.tiny', 'Tu tienda web, a mano para enseñarla y compartirla')));
  const wrap = h('div.mt'); el.append(wrap);
  if (!url) {
    mount(wrap, h('div.card.mt-vacia', h('div.mt-ico', '🛍️'), h('h2', 'Todavía no está puesta la dirección de tu tienda'),
      h('p.muted', can('tienda.gestionar') ? 'Ponla una vez en Tienda web → Conexión (por ejemplo https://celebridisenos.pages.dev) y aparecerá aquí.' : 'Pide a quien administra el programa que la ponga en Tienda web → Conexión.'),
      can('tienda.gestionar') ? btn('Ir a Tienda web', () => go('tienda'), { cls: 'primary', icon: 'store' }) : null));
    return {};
  }
  const msg = mensajeTienda(url);
  const abrir = () => desktop.on ? desktop.openUrl(url).catch(() => window.open(url, '_blank', 'noopener')) : window.open(url, '_blank', 'noopener');
  const compartir = async () => {
    if (navigator.share) { try { await navigator.share({ title: tiendaNombre(), text: '🛍️ Mira la tienda de ' + tiendaNombre(), url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    copyText(msg);
  };
  const whatsapp = () => { const w = 'https://wa.me/?text=' + encodeURIComponent(msg); desktop.on ? desktop.openUrl(w).catch(() => window.open(w, '_blank', 'noopener')) : window.open(w, '_blank', 'noopener'); };
  const imprimir = async () => {
    try { const L = await import('../labels.js'); await L.labelDialog('mesa', { qr: url, titulo: tiendaNombre(), ref: { entidad: 'tienda', id: 'qr' } }); }
    catch (e) { toast(e.message || String(e), 'bad'); }
  };
  const qr = h('div.mt-qr', { html: qrSvg(url, 7), title: 'Escanéalo con la cámara del móvil' });
  mount(wrap,
    h('div.card.mt-card',
      h('div.mt-izq', qr, h('div.tiny.muted.center', 'Que lo escaneen con la cámara del móvil')),
      h('div.mt-der',
        h('div.mt-nombre', tiendaNombre()),
        h('a.mt-url', { href: url, target: '_blank', rel: 'noopener' }, url.replace(/^https?:\/\//, '')),
        h('div.mt-btns',
          btn('Abrir mi tienda', abrir, { cls: 'primary', icon: 'external' }),
          btn('Copiar enlace', () => copyText(url), { icon: 'copy' }),
          btn('Compartir', compartir, { icon: 'send' }),
          btn('WhatsApp', whatsapp, { cls: 'mt-wa' }),
          btn('Imprimir el QR', imprimir, { icon: 'printer' })),
        h('div.mt-msg', h('div.tiny.muted', 'Mensaje listo para pegar:'), h('div.mt-txt', msg), btn('Copiar mensaje', () => copyText(msg), { cls: 'sm ghost', icon: 'copy' })))),
    h('div.row.wrap.mt-mas', btn('🏬 Ver la Estantería', () => go('estanteria'), { cls: 'ghost sm' }), can('tienda.gestionar') ? btn('⚙️ Ajustes de la tienda web', () => go('tienda'), { cls: 'ghost sm' }) : null));
  return {};
}
