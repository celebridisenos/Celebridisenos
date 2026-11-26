// ================= 20-11-2026 · 🏭 ATAJO A CELEBRIFÁBRICA =================
// Biou (19-11): «que tenga un atajo para ir directamente a CelebriFábrica».
// CelebriFábrica es el programa de EMPAQUETAR del maletín (portátil / mini PC): `PROYECTOSCELEBRI\CYBERDECK\CelebriFabrica\` (un servidor en
// localhost:8880 + su página en Edge) y su versión de Google para el móvil. Lee los pedidos de CelebriDiseños con la llave de Shampú (solo leer).
// Este botón la ABRE en este aparato y, desde un pedido, con su SELLO («#sello=S1086&pedido=1086»: el mismo QR corto de la etiqueta del paquete).
// La dirección se guarda EN ESTE APARATO (en cada uno es distinta: en el maletín, localhost:8880; en el móvil, el enlace de su versión de Google).
// No se manda nada entre programas ni se toca ningún pedido: solo se abre.
import { h, btn, modal, toast, inp, field } from './ui.js';
import { desktop } from './desktop.js';

const KEY = 'cd.fabrica.dir';
export const DIR_FABRICA = 'http://localhost:8880/';
export function dirFabrica() { try { return localStorage.getItem(KEY) || DIR_FABRICA; } catch (e) { return DIR_FABRICA; } }
function guardaDir(v) { try { if (v && v !== DIR_FABRICA) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { } }
export function limpiaDir(v) {
  let d = String(v || '').trim().replace(/#.*$/, '');
  if (!d) return '';
  if (!/^https?:\/\//i.test(d)) d = (/^(localhost|127\.|192\.168\.|10\.)/i.test(d) ? 'http://' : 'https://') + d;
  try { const u = new URL(d); if (!/^https?:$/.test(u.protocol)) return ''; return u.href; } catch (e) { return ''; }
}
export function urlFabrica(o, dir) {
  const d = limpiaDir(dir || dirFabrica()) || DIR_FABRICA, s = o && window.CL ? window.CL.selloPedido(o) : '';
  return d + (s ? '#sello=' + s + '&pedido=' + encodeURIComponent(String(o.numero || '').replace(/\D/g, '')) : '');
}
// ¿contesta? (la del maletín es http: desde el móvil, que va por https, el navegador no deja mirarla → se pregunta la dirección)
function contesta(d) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), 2500);
  return fetch(d, { mode: 'no-cors', cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(() => true, () => false).finally(() => clearTimeout(t));
}
function abre(u) { return Promise.resolve().then(() => desktop.openUrl(u)).catch(e => toast('No se pudo abrir CelebriFábrica: ' + e.message, 'bad')); }
export async function abrirFabrica(o) {
  const d = limpiaDir(dirFabrica()) || DIR_FABRICA;
  if (/^https:/i.test(d) || await contesta(d)) return abre(urlFabrica(o, d)); // (la de Google no se puede mirar antes: se abre)
  ajustesFabrica(o, true);
}
// «¿Dónde está CelebriFábrica?»: sale sola si no contesta; la dirección se queda en ESTE aparato
export function ajustesFabrica(o, noContesta) {
  const campo = inp({ value: dirFabrica(), placeholder: DIR_FABRICA, 'aria-label': 'Dirección de CelebriFábrica', autocomplete: 'off', spellcheck: 'false' });
  const msg = h('p.small.bad-t');
  modal('🏭 CelebriFábrica', h('div.col.fab-aj', { style: { gap: '10px' } },
    noContesta ? h('p', h('b', 'No contesta en este aparato. '), 'CelebriFábrica va en el maletín (el portátil): ábrela allí, o enciéndela y vuelve a probar.') : null,
    h('p.small', 'Si en este aparato la abres con otra dirección (por ejemplo, el enlace de su versión de Google en el móvil), pégala aquí una vez y se queda guardada.'),
    field('Dirección de CelebriFábrica', campo, 'En el maletín: ' + DIR_FABRICA), msg),
    close => [btn('Cancelar', close),
      btn('Abrir igualmente', () => { const d = limpiaDir(campo.value); if (!d) return (msg.textContent = 'Esa dirección no vale.'); close(); abre(urlFabrica(o, d)); }, { cls: 'ghost' }),
      btn('Guardar y abrir', async () => { const d = limpiaDir(campo.value); if (!d) return (msg.textContent = 'Esa dirección no vale.'); guardaDir(d); close(); toast('🏭 Dirección guardada en este aparato', 'ok'); abre(urlFabrica(o, d)); }, { cls: 'primary' })],
    { size: 'narrow', sinBorrador: true });
}
// el botón (en «Nuevo pedido», «Editar pedido» y la ficha del pedido)
export function botonFabrica(o) {
  return btn('🏭 CelebriFábrica', () => abrirFabrica(o && o.numero ? o : null), { cls: 'ghost fab-btn', title: o && o.numero ? 'Abrir CelebriFábrica con el pedido nº ' + o.numero + ' (sello ' + window.CL.selloPedido(o) + ')' : 'Abrir CelebriFábrica (empaquetar)' });
}
