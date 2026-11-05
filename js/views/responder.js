// ================= 💬 RESPONDER VENTAS (01-11-2026, pedido por Biou) =================
// Centro para contestar rápido a los compradores: abres tus mensajes (Facebook, Wallapop, Vinted, Milanuncios, Opla)
// en una ventana propia y, al lado, tienes tus PRODUCTOS para enseñarlos de un toque (copiar la foto y pegarla en el chat),
// copiar un texto con el PRECIO al momento, y el CATÁLOGO del momento. Misma cara que el resto del programa.
import { h, mount, btn, toast, inp, empty, copyText } from '../ui.js';
import { S, can } from '../store.js';
import { go } from '../app.js';
import { desktop } from '../desktop.js';
import { filesOf, previewUrl } from '../files.js';
import { precioDe, medidas, colores } from '../catalogo_pdf.js';
import { baldosas, catalogoAlDia, urlTienda } from '../chats_menu.js'; // 01-11-2026 (noche): el menú de chats muy claro

const CL = window.CL;
export const eurTxt = v => (Math.round(Number(v) * 100) / 100).toLocaleString('es-ES') + ' €';
export const HIDDEN = ['retirado', 'archivado', 'borrador'];

export function fotoDe(p) { const f = filesOf('productos', p.id).filter(a => a.tipo === 'foto'); return f[0] || null; }
// el enlace del producto en su web (si está publicado): así el comprador ve las fotos y el precio de HOY
function enlaceDe(p) { const w = p.web || {}, u = urlTienda(); return w.publicado && w.url && u ? u + w.url : ''; }
export function textoVenta(p) {
  const pr = precioDe(p), m = medidas(p), c0 = colores(p), l = enlaceDe(p);
  const c = Array.isArray(c0) ? (c0.length ? String(c0) : '') : c0; // (04-11: colores() da una LISTA; vacía salía «🎨 » solo)
  return '✨ ' + (p.nombre || 'Pieza') + (pr > 0 ? ' — ' + eurTxt(pr) : '') +
    (m ? '\n📏 ' + m : '') + (c ? '\n🎨 ' + c : '') + (l ? '\n🔗 ' + l : '') +
    '\n\n¿Te interesa? Te lo preparo y te lo envío. 🙌';
}
function textoVarios(L) {
  return '¡Hola! 😊 Te paso lo que te puede gustar, con el precio de hoy:\n\n' + L.map(p => { const pr = precioDe(p), l = enlaceDe(p); return '• ' + (p.nombre || 'Pieza') + (pr > 0 ? ' — ' + eurTxt(pr) : '') + (l ? '\n  ' + l : ''); }).join('\n') + '\n\nDime cuál quieres y te lo preparo. 🙌';
}
// la foto de la tarjeta: primero la miniatura y luego la vista previa (01-11 noche: antes salía «[object Promise]» y no se veía ninguna)
export function fotoImg(a, p) { const i = h('img', { src: a.miniatura || '', alt: p.nombre || '', style: { width: '100%', height: '100%', objectFit: 'cover' } }); previewUrl(a).then(u => { if (u) i.src = u; }).catch(() => { }); return i; }
// deja la foto del producto en el portapapeles (también la usa el navegador de chats)
export async function fotoAlPortapapeles(foto) {
  if (!navigator.clipboard || !window.ClipboardItem) throw new Error('sin portapapeles de imágenes');
  const url = await previewUrl(foto); // (01-11 noche: previewUrl devuelve una promesa: antes la foto nunca se copiaba)
  const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('no cargó')); i.src = url; });
  const cv = document.createElement('canvas'); cv.width = img.naturalWidth || 800; cv.height = img.naturalHeight || 800;
  cv.getContext('2d').drawImage(img, 0, 0);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
}
async function copiarFoto(p) {
  const foto = fotoDe(p);
  if (!foto) return toast('Este producto no tiene foto todavía.', 'warn');
  try {
    await fotoAlPortapapeles(foto);
    toast('📋 Foto copiada: pégala (Ctrl+V) en el chat del comprador.', 'ok', 4000);
  } catch (e) {
    toast('Tu navegador no deja copiar la foto. Ábrela en el producto y guárdala para adjuntarla.', 'warn', 6000);
  }
}

export function render(el, params) {
  const st = { q: '' };
  el.append(h('div.page-head', h('h1', '💬 Chats con clientes'),
    can('productos.ver') ? btn('Ver catálogo', () => go('catalogo'), { cls: 'sm ghost', icon: 'store' }) : null));

  // 1) los chats: una baldosa GRANDE por plataforma (Biou: «un menú muy muy claro»)
  el.append(h('div.card', { style: { marginBottom: '14px' } },
    h('div.row.wrap', { style: { alignItems: 'center', gap: '10px', marginBottom: '10px' } }, h('b.grow', '1 · Abre el chat'), btn('📤 Catálogo al día (para todos)', () => catalogoAlDia(), { cls: 'sm primary', title: 'El enlace de tu web (siempre al día) y el PDF de hoy, para pegarlo en cada chat' })),
    baldosas(),
    h('p.tiny.muted', { style: { marginTop: '8px' } }, desktop.on ? 'Se abre tu navegador de chats: cada uno en su pestaña, con tu sesión guardada y tus productos al lado.' : '📱 En el móvil se abre la app o la web de cada una.')));
  // 3) productos para enseñar
  const buscador = inp({ type: 'search', placeholder: '🔎 Busca el producto: nombre, color, categoría…', value: st.q, class: 'inp' });
  const grid = h('div.resp-grid', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '12px' } });
  const elegidos = new Set(), barra = h('div');
  el.append(h('h3', { style: { margin: '6px 0 2px' } }, '2 · Adjunta tus productos'), h('p.small.muted', { style: { margin: '0 0 8px' } }, 'Copia la foto o el texto con el precio de hoy (y el enlace de tu web) y pégalo en el chat. Marca ☑ varios para mandarlos juntos.'), buscador, grid, barra);

  function pinta() {
    const q = CL.norm ? CL.norm(st.q) : String(st.q).toLowerCase();
    const L = (S.t.productos || [])
      .filter(p => !HIDDEN.includes(String(p.estado || '').toLowerCase()))
      .filter(p => !q || (CL.matches ? CL.matches([p.nombre, p.sku, p.categoria, p.color, p.material].join(' '), st.q) : String(p.nombre || '').toLowerCase().includes(q)))
      .slice(0, 120);
    if (!L.length) return mount(grid, empty('box', 'Sin productos', st.q ? 'Nada con «' + st.q + '».' : 'Cuando tengas productos aparecen aquí.'));
    mount(grid, L.map(p => {
      const foto = fotoDe(p), pr = precioDe(p);
      return h('div.card.resp-card', { style: { padding: '10px' } },
        h('div.resp-foto', { style: { width: '100%', height: '150px', borderRadius: '10px', overflow: 'hidden', background: 'var(--line)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          foto ? fotoImg(foto, p) : h('span.small.muted', 'Sin foto')),
        h('b', { style: { display: 'block' } }, p.nombre || 'Pieza'),
        h('p.small.muted', { style: { margin: '2px 0 8px' } }, pr > 0 ? eurTxt(pr) : 'Sin precio puesto'),
        h('div.row.wrap', { style: { gap: '6px' } },
          btn('📋 Foto', () => copiarFoto(p), { cls: 'sm' }),
          btn('💬 Texto + precio', () => { copyText(textoVenta(p)); toast('📋 Copiado: pégalo en el chat', 'ok', 3500); }, { cls: 'sm ghost' }),
          enlaceDe(p) ? btn('🔗', () => { copyText(enlaceDe(p)); toast('🔗 Enlace copiado (su ficha en tu web)', 'ok', 3500); }, { cls: 'sm ghost', title: 'Copiar el enlace de este producto en tu web' }) : null,
          h('label.resp-marca', { title: 'Marcar para mandar varios juntos' }, h('input', { type: 'checkbox', checked: elegidos.has(p.id), onchange: e => { if (e.target.checked) elegidos.add(p.id); else elegidos.delete(p.id); e.target.closest('.resp-card').classList.toggle('resp-sel', e.target.checked); pintaBarra(); } }), ' Varios')));
    }));
    pintaBarra();
  }
  function pintaBarra() {
    const L = (S.t.productos || []).filter(p => elegidos.has(p.id));
    mount(barra, L.length ? h('div.resp-barra', h('b.grow', '☑ ' + L.length + (L.length === 1 ? ' producto marcado' : ' productos marcados')),
      btn('💬 Copiar los ' + L.length + ' (precios y enlaces)', () => { copyText(textoVarios(L)); toast('📋 Copiado: pégalo en el chat', 'ok', 4000); }, { cls: 'sm' }),
      btn('Quitar marcas', () => { elegidos.clear(); pinta(); }, { cls: 'sm ghost' })) : null);
  }
  buscador.addEventListener('input', () => { st.q = buscador.value; pinta(); });
  pinta();
  return { update: pinta };
}
