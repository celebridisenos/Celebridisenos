// ================= v12.9 · 🎁 Regalo con QR =================
// Para un pedido: escribes la dedicatoria, eliges si quien lo recibe ve la pieza en 3D, y se crea un enlace secreto + QR para la caja.
// La tienda guarda solo lo que escribes aquí. Nada del comprador (ni nombre, ni dirección, ni importe, ni nº de pedido) viaja a la web.
import { h, mount, btn, modal, toast, field, inp, area, sel, copyText, fdt } from './ui.js';
import { S, api, upsertLocal } from './store.js';

const CUIDADOS = 'Límpiala con un paño húmedo y evita dejarla al sol o cerca de fuentes de calor intenso.';
const mem = { get: k => { try { return localStorage.getItem('cd.regalo.' + k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem('cd.regalo.' + k, v); } catch (e) { } } };

// Productos que se pueden regalar: los publicados en la tienda web
export const publicados = () => (S.t.productos || []).filter(p => p.web && p.web.publicado);

export function giftDialog(o) {
  const reg = o.regalo && typeof o.regalo === 'object' && o.regalo.token ? o.regalo : null;
  const lista = publicados();
  const prod0 = (reg && reg.productoId) || (lista.some(p => p.id === o.productoId) ? o.productoId : '');
  const selP = sel([{ v: '', t: '— Elige el producto publicado —' }].concat(lista.map(p => ({ v: p.id, t: p.nombre }))), prod0);
  const para = inp({ maxlength: 40, placeholder: 'Ej.: Abuela Rosa', value: reg ? reg.para : '' });
  const de = inp({ maxlength: 40, placeholder: 'Ej.: Pablo', value: reg ? reg.de : mem.get('de') });
  const ded = area({ maxlength: 400, rows: 4, placeholder: 'Lo que quiera decir quien regala. Ej.: «Para la mejor abuela del mundo. Te quiero.»' }); ded.value = reg ? reg.dedicatoria : '';
  const cui = area({ maxlength: 300, rows: 2 }); cui.value = reg ? reg.cuidados : (mem.get('cuidados') || CUIDADOS);
  const col = inp({ maxlength: 30, placeholder: 'Rosa, Blanco…', value: reg ? reg.color : (o.color || '') });
  const c3 = h('input', { type: 'checkbox', checked: reg ? reg.ver3d !== false : true }), act = h('input', { type: 'checkbox', checked: reg ? reg.activo !== false : true });
  const aviso = h('p.small.muted'), estado = h('p.small'), vista = h('div.col');
  const prod = () => lista.find(p => p.id === selP.value);
  const refrescaAviso = () => { const p = prod(); aviso.textContent = !p ? '' : p.web && p.web.modelo && p.web.modelo.id ? '✅ Este producto tiene vista 3D publicada: quien reciba el regalo podrá girarlo.' : 'ℹ️ Este producto no tiene vista 3D publicada: quien lo reciba verá la foto. (Se publica en el producto → Tienda web → «Vista 3D en la web».)'; };
  selP.onchange = refrescaAviso; refrescaAviso();
  let actual = reg;
  async function pintaVista() {
    if (!actual) { mount(vista); return; }
    const L = await import('./labels.js');
    const cv = L.draw('regalo', L.dataFor('regalo', { url: actual.url, color: '#e0457b', numero: o.numero, id: o.id }), 200);
    cv.className = 'lbl-canvas'; cv.style.width = '85mm'; cv.style.maxWidth = '100%'; cv.style.height = 'auto';
    mount(vista, h('b', 'Tarjeta con el QR (85 × 55 mm)'), cv,
      h('div.row.wrap', btn('Imprimir tarjeta', () => L.labelDialog('regalo', [L.dataFor('regalo', { url: actual.url, color: '#e0457b', numero: o.numero, id: o.id })]), { cls: 'primary', icon: 'printer' }),
        btn('Copiar enlace', () => copyText(actual.url), { icon: 'copy' }),
        btn('Abrir la página', () => window.open(actual.url, '_blank', 'noopener'), { icon: 'eye' })),
      h('p.tiny.muted', 'El enlace es secreto: solo lo tiene quien tenga el QR. Si lo desactivas, el QR deja de abrir el regalo.'));
    try { const r = await api('tienda.regaloEstado', { pedidoId: o.id }, { quiet: true }); estado.textContent = r && r.regalo ? (r.vistas ? '👀 Se ha abierto ' + r.vistas + (r.vistas === 1 ? ' vez' : ' veces') + (r.ultimaVista ? ' · última ' + fdt(r.ultimaVista) : '') + '.' : 'Aún no se ha abierto.') + (r.activo ? '' : ' (Enlace desactivado)') : ''; } catch (e) { estado.textContent = ''; }
  }
  const body = h('div.col', { style: { gap: '12px' } },
    h('p.small.muted', 'Crea una página «Tu regalo» para quien lo reciba: dedicatoria, la pieza en 3D y un botón para pedir uno igual. Va en un QR dentro de la caja. Solo se envía lo que escribas aquí (nada del comprador).'),
    h('div.form', field('Producto del regalo', selP, lista.length ? '' : 'Ningún producto está publicado en la tienda todavía.', 'full'), field('Para', para), field('De parte de', de), field('Dedicatoria', ded, '', 'full'), field('Cómo cuidarla', cui, 'Revísalo: depende del material. Se recordará para el próximo regalo.', 'full'), field('Color de la pieza', col, 'Solo colores conocidos (Rosa, Blanco, Azul…): la pieza se verá de ese color.')),
    h('label.check.small', c3, 'Quien recibe el regalo ve la pieza en 3D (si no, verá la foto)'),
    h('label.check.small', act, 'Enlace activo (apágalo para que el QR deje de abrir el regalo)'),
    aviso, estado, vista);
  pintaVista();
  return modal(reg ? '🎁 Regalo con QR · pedido nº ' + o.numero : '🎁 Crear regalo con QR · pedido nº ' + o.numero, body, close => [btn('Cerrar', close), btn(actual ? 'Guardar cambios' : 'Crear enlace y QR', async ev => {
    const b = ev.target.closest('button'); b.disabled = true;
    try {
      if (!selP.value) throw new Error('Elige el producto del regalo (tiene que estar publicado en la tienda).');
      const r = await api('tienda.regaloGuardar', { pedidoId: o.id, productoId: selP.value, para: para.value, de: de.value, dedicatoria: ded.value, cuidados: cui.value, color: col.value, ver3d: c3.checked, activo: act.checked });
      actual = r.regalo; o.regalo = r.regalo; try { upsertLocal('pedidos', Object.assign({}, o, { regalo: r.regalo })); } catch (e) { }
      mem.set('de', de.value); mem.set('cuidados', cui.value);
      toast('🎁 Regalo guardado', 'ok'); (r.avisos || []).forEach(a => toast(a, 'warn', 10000));
      b.textContent = 'Guardar cambios'; await pintaVista();
    } catch (e) { toast(e.message, 'bad', 9000); }
    b.disabled = false;
  }, { cls: 'primary', icon: 'gift' })], { size: 'wide' });
}
