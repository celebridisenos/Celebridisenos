// ================= v13.10 · FOTO DE LO QUE PIDIÓ EL CLIENTE =================
// Cada pedido enseña la foto de su producto (miniatura, poco peso) para reconocerlo de un vistazo al organizar y al
// empaquetar. Orden: 1) una foto adjunta al propio pedido (lo que mandó el cliente o una foto del encargo),
// 2) la foto del producto del catálogo (por su id o por el nombre), 3) nada (sale la inicial). Pulsar → foto grande.
import { h } from './ui.js';
import { S, byId } from './store.js';
import { filesOf, lightbox } from './files.js';

const CL = window.CL;
// solo fotos (no vídeos) y nunca las de la PRUEBA DE EMPAQUETADO (esas son del paquete, no de lo que se pidió)
const esFoto = a => a && a.miniatura && (a.tipo ? a.tipo === 'foto' : /\.(jpe?g|png|webp|heic|gif)$/i.test(a.nombre || '')) && !/^PRUEBA_VENTA/i.test(a.nombre || '');
function productoDe(o) {
  if (o.productoId) { const p = byId('productos', o.productoId); if (p) return p; }
  const n = CL.norm(o.producto || ''); if (!n) return null;
  return (S.t.productos || []).find(p => CL.norm(p.nombre) === n) || null;
}
// Lista de archivos-foto (para el visor) del pedido, primero los suyos y después los del producto
export function fotosPedido(o) {
  if (!o) return [];
  const out = [], vistos = new Set(), add = a => { if (esFoto(a) && !vistos.has(a.id)) { vistos.add(a.id); out.push(a); } };
  try { filesOf('pedidos', o.id).forEach(add); } catch (e) { }
  const p = productoDe(o);
  if (p) {
    ((p.web && p.web.fotos) || []).concat(p.fotoId ? [p.fotoId] : []).forEach(id => add(byId('archivos', id)));
    try { filesOf('productos', p.id).forEach(add); } catch (e) { }
  }
  return out;
}
export const fotoPedido = o => { const f = fotosPedido(o)[0]; return f ? f.miniatura : ''; };
// Miniatura lista para poner en una fila o ficha. tam = px. Pulsar abre la foto grande (sin abrir la ficha).
export function miniPedido(o, tam = 40, cls = '') {
  const fotos = fotosPedido(o), letra = String(o && o.producto || '?').trim().charAt(0).toUpperCase() || '?';
  const st = { width: tam + 'px', height: tam + 'px' };
  if (!fotos.length) return h('span.fp-mini.sin' + (cls ? '.' + cls : ''), { style: st, title: 'Sin foto: añádela en el producto' }, letra);
  return h('img.fp-mini' + (cls ? '.' + cls : ''), { src: fotos[0].miniatura, alt: 'Foto de ' + (o.producto || 'el producto'), title: 'Ver la foto de lo que pidió', loading: 'lazy', style: st,
    onclick: e => { e.stopPropagation(); lightbox(fotos, 0); } });
}
