// ================= Productos: catálogo, nuevo producto con Foto/Vídeo/STL y asistente de precio =================
import { h, mount, icon, btn, modal, drawer, toast, eur, fdate, ago, pill, empty, field, inp, sel, area, debounce, confirmDlg, bytes, na } from '../ui.js';
import { S, can, mutate, api, byId, upsertLocal, removeLocal, emit, timing, stateColor } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { dropZone, gallery, filesOf, filesSection, openFile, RULES, extOf } from '../files.js';
import { desktop } from '../desktop.js';
import { parse3D, viewer, unzip } from '../stl.js';
import { medir3D, esArchivo3D, escalar, textoMedidas } from '../medidas3d.js'; // v16: medidas reales X × Y × Z
import { accionTxt, resumenDetalle } from './pedidos.js';
import { generate, asText, docxBlob, docName, PLATAFORMAS } from '../docventa.js';
import { download, uploadFile } from '../files.js';
import { copyText } from '../ui.js';

const CL = window.CL;
// v11: un diseño bajo demanda se vende muchas veces: IDEA → PUBLICADO → ARCHIVADO (los antiguos se convierten solos)
export const STATES = ['Idea', 'Publicado', 'Archivado'];
const NEXT = { 'Idea': ['Publicado'], 'Publicado': ['Archivado'], 'Archivado': ['Publicado'] };
const ST_CLS = { 'Idea': 'info', 'Publicado': 'brand', 'Archivado': '' };
const LEGACY = { BORRADOR: 'Idea', EN_PROCESO: 'Idea', LISTO: 'Idea', IDEA: 'Idea', PUBLICADO: 'Publicado', RESERVADO: 'Publicado', VENDIDO: 'Publicado', RETIRADO: 'Archivado', ARCHIVADO: 'Archivado' };
export const pState = s => LEGACY[String(s || '').toUpperCase().replace(/ /g, '_')] || s || 'Idea';
const PLATFORMS = [{ k: 'wallapop', t: 'Wallapop / venta directa' }, { k: 'vinted', t: 'Vinted' }, { k: 'etsy', t: 'Etsy' }];
const pretty = s => String(s || '').replace(/^\d+_/, '').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase()).replace(/\bBano\b/g, 'Baño').replace(/\bNinos\b/g, 'Niños').replace(/\bJardin\b/g, 'Jardín').replace(/\bDecoracion\b/g, 'Decoración');

export function render(el, params) {
  const st = { q: '', cat: '', est: '', limit: 60 };
  const search = inp({ type: 'search', placeholder: 'Buscar por nombre, ID, color, material…' });
  search.addEventListener('input', debounce(() => { st.q = search.value; drawList(); }, 120));
  const fCat = h('select.inp'), fEst = sel([{ v: '', t: 'Todos los estados' }].concat(STATES), '');
  [fCat, fEst].forEach(x => x.addEventListener('change', () => { st.cat = fCat.value; st.est = fEst.value; drawList(); }));
  const listBox = h('div');
  el.append(h('div.page-head', h('h1', 'Productos'), can('productos.editar') ? btn('Nuevo producto', () => productWizard(), { cls: 'primary', icon: 'plus' }) : null),
    h('div.row.wrap', { style: { marginBottom: '14px' } }, h('div.inp-icon.grow', icon('search', 's'), search), h('div', { style: { width: '200px' } }, fCat), h('div', { style: { width: '180px' } }, fEst)), listBox);
  function fill() { const k = fCat.value; const cats = [...new Set(S.t.productos.map(p => p.categoria).filter(Boolean))].sort(); mount(fCat, h('option', { value: '' }, 'Todas las categorías'), cats.map(c => h('option', { value: c }, pretty(c)))); fCat.value = k; }
  function drawList() {
    const rows = S.t.productos.filter(p => (!st.q || CL.matches([p.id, p.sku, p.tallas, p.nombre, p.categoria, p.subcategoria, p.color, p.material, p.descripcion].join(' '), st.q)) && (!st.cat || p.categoria === st.cat) && (!st.est || pState(p.estado) === st.est))
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || String(b.id).localeCompare(String(a.id)));
    if (!S.t.productos.length) return mount(listBox, h('div.card', empty('cube', 'El catálogo está vacío', 'Crea vuestro primer producto con sus fotos, vídeo y STL.', can('productos.editar') ? btn('Nuevo producto', () => productWizard(), { cls: 'primary', icon: 'plus' }) : null)));
    if (!rows.length) return mount(listBox, h('div.card', empty('search', 'No hay productos con estos filtros')));
    mount(listBox, h('div.gallery', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px' } }, rows.slice(0, st.limit).map(p => {
      const foto = p.fotoId ? byId('archivos', p.fotoId) : filesOf('productos', p.id).find(a => a.miniatura);
      return h('div.card.click', { style: { padding: 0, overflow: 'hidden' }, onclick: () => go('productos/' + p.id) },
        h('div', { style: { aspectRatio: '4/3', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--muted)' } }, foto && foto.miniatura ? h('img', { src: foto.miniatura, alt: '', loading: 'lazy', style: { width: '100%', height: '100%', objectFit: 'cover' } }) : icon('cube', 'l')),
        h('div', { style: { padding: '10px 12px' } }, h('div.bold.ellipsis', p.nombre), h('div.tiny.muted.ellipsis', (p.sku || p.id) + ' · ' + pretty(p.subcategoria || p.categoria)),
          h('div.row', { style: { marginTop: '6px' } }, pill(pState(p.estado), ST_CLS[pState(p.estado)]), h('b.right', p.precio ? eur(p.precio) : ''))));
    })), rows.length > st.limit ? h('div.pager', btn('Mostrar más', () => { st.limit += 120; drawList(); })) : null);
  }
  let openId = null, dr = null;
  function applyParams(p) {
    const id = (p || []).find(x => x && !x.startsWith('?')) || '';
    fill(); drawList();
    if (id === 'nuevo') { history.replaceState(null, '', '#/productos'); productWizard(); }
    else if (id && (id !== openId || !document.querySelector('.drawer'))) { openId = id; dr = productDrawer(id, () => { openId = null; dr = null; history.replaceState(null, '', '#/productos'); }); }
  }
  applyParams(params);
  return { params: applyParams, update: () => { fill(); drawList(); if (dr) dr.update(); }, destroy: () => dr && dr.close() };
}

// ---------- Ficha de producto ----------
function productDrawer(id, onClose) {
  let tab = 'resumen', ctl;
  const res = { update: () => { }, close: () => ctl && ctl.close() };
  ctl = drawer((d, close) => {
    const closeAll = () => { close(); onClose(); };
    const draw = () => {
      const p = byId('productos', id);
      if (!p) return mount(d, h('div.drawer-h', h('h2.grow', 'Producto'), btn('', closeAll, { cls: 'ghost icon', icon: 'x' })), h('div.drawer-b', empty('alert', 'Este producto ya no existe')));
      const orders = S.t.pedidos.filter(o => o.productoId === p.id || CL.norm(o.producto) === CL.norm(p.nombre));
      const tabs = [['resumen', 'Resumen'], ['pedidos', 'Rendimiento'], can('productos.costes') ? ['precio', 'Precio y costes'] : null, ['archivos', 'Fotos, vídeos y STL (' + filesOf('productos', p.id).length + ')'], ['venta', '📄 Textos de venta'], can('tienda.gestionar') || (p.web && p.web.publicado) ? ['web', '🛍️ Tienda web'] : null, ['historial', 'Historial']].filter(Boolean);
      const body = h('div');
      mount(d, h('div.drawer-h', h('div.grow', h('h2.ellipsis', p.nombre), h('div.row', { style: { marginTop: '4px' } }, h('span.tiny.muted', 'SKU ' + (p.sku || p.id)), pill(pState(p.estado), ST_CLS[pState(p.estado)]))), btn('', closeAll, { cls: 'ghost icon', icon: 'x' })),
        h('div.drawer-b.col', { style: { gap: '14px' } }, h('div.tabs', tabs.map(x => h('button' + (tab === x[0] ? '.on' : ''), { onclick: () => { tab = x[0]; draw(); } }, x[1]))), body,
          h('div.row.wrap', { style: { borderTop: '1px solid var(--line)', paddingTop: '14px' } },
            can('productos.editar') ? h('div.row.wrap', (NEXT[pState(p.estado)] || ['Publicado']).map(s => btn('→ ' + s, () => changeState(p, s), { cls: 'sm' })), h('select.inp.sm', { style: { width: 'auto' }, onchange: e => { if (e.target.value) changeState(p, e.target.value); } }, h('option', { value: '' }, 'Estado…'), STATES.filter(s => s !== pState(p.estado)).map(s => h('option', { value: s }, s)))) : null, h('span.grow'),
            can('pedidos.crear') ? btn('Nuevo pedido', () => import('./pedidos.js').then(m => m.orderForm({ producto: p.nombre, productoId: p.id, precio: p.precio })), { icon: 'plus', cls: 'sm' }) : null,
            btn('Etiqueta', () => productLabel(p), { icon: 'printer', cls: 'sm' }),
            btn('Anuncio con IA', () => { closeAll(); go('anuncios/' + p.id + '/' + ((S.cfg.anuncios && S.cfg.anuncios.plataforma) || 'etsy')); }, { icon: 'sparkles', cls: 'sm' }),
            // v15.3 · en un clic: el Reel del producto o su publicación de Instagram (fotos + texto con IA)
            btn('🎬 Hacer un Reel', () => { closeAll(); go('reels/producto/' + p.id); }, { cls: 'sm prod-reel' }),
            can('redes.ver') ? btn('📸 A Instagram', () => { closeAll(); go('instagram/producto/' + p.id); }, { cls: 'sm prod-ig' }) : null,
            desktop.on && can('config.ver') ? btn('Publicar con CelebryNova', () => import('./celebrynova.js').then(m => m.publishWithNova(p, modal, go)), { icon: 'send', cls: 'sm' }) : null,
            can('productos.editar') ? btn('Editar', () => productWizard(p), { icon: 'edit', cls: 'sm' }) : null,
            can('productos.borrar') ? btn('Borrar', () => delProduct(p, closeAll), { cls: 'danger sm', icon: 'trash' }) : null)));
      PTABS[tab](body, p, orders);
    };
    res.update = () => { if (tab !== 'web') draw(); }; draw(); // v12: la ficha web tiene un formulario: no se rehace al sincronizar
  });
  return res;
}
const PTABS = {
  resumen(el, p) {
    const foto = p.fotoId ? byId('archivos', p.fotoId) : null;
    mount(el, foto && foto.miniatura ? h('img', { src: foto.miniatura, alt: '', style: { width: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '12px', background: 'var(--surface-2)', cursor: 'pointer' }, onclick: () => openFile(foto) }) : null,
      h('div.facts', { style: { marginTop: '12px' } }, fact('Precio', p.precio ? eur(p.precio) : na('')), fact('Categoría', pretty(p.categoria) || na('')), fact('Subcategoría', pretty(p.subcategoria) || na('')), fact('Tipo', p.tipo || na('')),
        fact('SKU', p.sku || p.id), fact('Tallas', na(p.tallas)), fact('Color', na(p.color)), fact('Material', na(p.material)), fact('Tamaño', na(p.tamano)), fact('Medidas reales' + (p.dimEstado === 'supuesto' ? ' (STL: en mm)' : p.dimEstado === 'revisar' ? ' ⚠️ revisar' : ''), textoMedidas(p) || na('')), fact('Peso del producto (la pieza)', p.pesoG ? p.pesoG + ' g' : na('')), fact('Plataforma', na(p.plataforma)), fact('Fecha', p.fecha ? fdate(p.fecha) : na(''))),
      p.descripcion ? h('div', { style: { marginTop: '12px' } }, h('div.lbl', 'Descripción'), h('p', { style: { whiteSpace: 'pre-wrap' } }, p.descripcion)) : null,
      h('dl.kv', { style: { marginTop: '12px' } }, h('dt', 'Origen'), h('dd', [p.fuente, p.enlace].filter(Boolean).join(' · ') || h('span.na', 'No disponible')), h('dt', 'Licencia'), h('dd', na(p.licencia)), h('dt', 'Carpeta'), h('dd', p.ruta ? h('span.row', h('span.ellipsis', p.ruta), desktop.on ? btn('Abrir', () => desktop.open(p.ruta).catch(e => toast(e.message, 'bad')), { cls: 'sm', icon: 'folder' }) : null) : h('span.na', 'Sin carpeta')), h('dt', 'Creado por'), h('dd', na(p.creadoPor))),
      stockCard(p));
  },
  precio(el, p) {
    // v11.3: primero el coste REAL por receta (con su desglose); debajo, la calculadora del Excel de siempre
    const box = h('div.col', { style: { gap: '14px' } }, h('p.muted.small', 'Cargando…'));
    mount(el, box);
    import('./costes.js').then(C => mount(box, bambuCard(p), C.productCostCard(p), h('details', h('summary.small', 'Calculadora del Excel (hoja Productos)'), priceAssistant(p))));
  },
  // v10: textos listos para Vinted, Wallapop, Etsy, Instagram y TikTok + documento Word
  venta(el, p) {
    // v13.10: primero lo sencillo — 3 descripciones CORTAS; los textos largos por plataforma quedan plegados
    const corto = h('div.col.dq-lista', { style: { gap: '8px' } });
    let semilla = Date.now();
    const cortas = () => import('../descripcion.js').then(D => { semilla += 7919; mount(corto, D.generar(p.nombre, { color: p.color ? CL.norm(p.color) : '' }, 3, semilla).map(txt => h('div.dq-op', h('p', txt), h('div.row.wrap', { style: { gap: '6px' } },
      btn('Copiar', () => { copyText(txt); toast('Copiada', 'ok'); }, { cls: 'sm', icon: 'copy' }),
      can('productos.editar') ? btn('Usar como descripción', async () => { try { await mutate('productos.guardar', { id: p.id, datos: { descripcion: txt } }, { label: 'Descripción', tables: ['productos'], optimistic: tt => { const x = tt.productos.find(y => y.id === p.id); if (x) x.descripcion = txt; } }); emit(); toast('✅ Descripción guardada', 'ok'); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm primary' }) : null)))); });
    const box = h('div.col', { style: { gap: '12px' } });
    mount(el, h('div.card.flat', h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, h('b.grow', '✨ Descripción corta'), btn('🔁 Otras', cortas, { cls: 'sm ghost' }),
      btn('Con foto o IA…', () => import('../descripcion.js').then(D => D.rapida({ texto: p.nombre, producto: p })), { cls: 'sm ghost' })), corto),
      h('details.more', { style: { marginTop: '10px' } }, h('summary', 'Textos largos por plataforma (Vinted, Wallapop, Etsy, Instagram, TikTok)'), h('div.in', box)));
    cortas();
    const make = async () => {
      mount(box, h('p.muted', 'Preparando textos…'));
      const d = await generate(p);
      const block = (t, x, extra) => h('div.card.flat.venta', h('div.row', h('b.grow', t), x.precio ? h('span.small', eur(x.precio)) : null,
          btn('Copiar', () => copyText([x.titulo ? x.titulo : '', x.descripcion || x.texto].filter(Boolean).join('\n\n')), { cls: 'sm', icon: 'copy' })),
        x.titulo ? h('div.small', h('span.tiny.muted', 'Título · '), h('b', x.titulo)) : null,
        (extra || []).filter(e => e[1]).map(e => h('div.tiny', h('span.muted', e[0] + ': '), e[1])),
        h('pre.venta-txt', x.descripcion || x.texto));
      mount(box, h('p.small.muted', 'Textos escritos con la biblioteca de frases y SOLO con los datos del producto. Revisa y ajusta si hace falta. Cada vez que pulses "Otra versión" cambian las frases.'),
        h('div.row.wrap', btn('Otra versión', make, { icon: 'refresh', cls: 'sm' }), btn('Copiar todo', () => copyText(asText(p, d)), { icon: 'copy', cls: 'sm' }),
          btn('Descargar Word', () => download(docxBlob(p, d), docName(p)), { icon: 'download', cls: 'sm' }),
          can('archivos.subir') ? btn('Guardar en el producto', async ev => { const b = ev.target.closest('button'); b.disabled = true; try { await saveDoc(p, d); toast('Documento guardado en las fichas del producto', 'ok'); } catch (e) { toast(e.message, 'bad'); } b.disabled = false; }, { icon: 'upload', cls: 'sm' }) : null),
        block('Vinted', d.vinted), block('Wallapop', d.wallapop), block('Etsy', d.etsy, [['Materiales', d.etsy.materiales], ['Variaciones', d.etsy.variaciones], ['SKU', p.sku || p.id]]),
        block('Instagram', d.instagram), block('TikTok', d.tiktok));
    };
    make();
  },
  archivos(el, p) {
    const local = h('div');
    mount(el, filesSection('productos', p.id, { tipos: ['foto', 'video', 'stl'] }).el, local);
    if (desktop.on && p.ruta) {
      desktop.list(p.ruta).then(async r => {
        let files = (r.entries || []).filter(e => e.type === 'file');
        for (const d of (r.entries || []).filter(e => e.type === 'dir')) { try { const sub = await desktop.list(d.path); files = files.concat((sub.entries || []).filter(e => e.type === 'file').map(e => Object.assign(e, { name: d.name + ' / ' + e.name }))); } catch (e) { } }
        const registered = new Set(filesOf('productos', p.id).map(a => a.rutaLocal));
        if (!files.length) return mount(local, h('p.small.muted', { style: { marginTop: '12px' } }, 'La carpeta del producto está vacía.'), btn('Abrir carpeta', () => desktop.open(p.ruta), { icon: 'folder', cls: 'sm' }));
        mount(local, h('h4', { style: { margin: '14px 0 8px' } }, 'En la carpeta del ordenador'), h('div.list.boxed', files.map(f => {
          const k = Object.keys(RULES).find(t => RULES[t].ext.includes(extOf(f.name)));
          return h('div.item', { style: { cursor: 'default' } }, icon(k ? RULES[k].i : 'file', 's'), h('span.grow.ellipsis', f.name), h('span.tiny.muted', bytes(f.size || 0)),
            k === 'stl' && ['stl', '3mf', 'obj'].includes(extOf(f.name)) ? btn('Ver 3D', () => view3DLocal(f.path, f.name), { cls: 'sm', icon: 'cube' }) : null,
            registered.has(f.path) ? h('span.tiny.ok-t', '✓ enlazado') : null);
        })), btn('Abrir carpeta', () => desktop.open(p.ruta), { icon: 'folder', cls: 'sm' }));
      }).catch(e => mount(local, h('p.small.warn-t', 'No se puede abrir la carpeta del producto: ' + e.message)));
    }
  },
  // v11: rendimiento del diseño (biblioteca de diseños): ventas, beneficio, horas de impresión, clientes
  pedidos(el, p, orders) {
    const valid = orders.filter(o => !CL.stateOf(S.cfg.pedidos, o.estado).cancelled);
    const uds = valid.reduce((s, o) => s + (Number(o.cantidad) || 1), 0);
    const pr = can('productos.costes') ? valid.map(o => CL.orderProfit(o, S.t, S.cfg)) : [];
    const ben = pr.filter(x => x.beneficio !== null).reduce((s, x) => s + x.beneficio, 0), withCost = pr.filter(x => x.beneficio !== null);
    const ventas = valid.reduce((s, o) => s + CL.orderTotal(o), 0);
    const calc = S.t.calculadora.find(c => CL.norm(c.nombre) === CL.norm(p.nombre));
    const horas = (Number(calc && calc.horas) || Number(p.horas) || 0) * uds;
    const last = valid.map(o => o.fecha).sort().pop();
    const clientes = new Set(valid.map(o => CL.norm(o.cliente))).size;
    const files = filesOf('productos', p.id);
    mount(el, h('div.facts', fact('Vendidas', uds + ' ud.'), fact('Pedidos', String(valid.length)), can('informes.ver') ? fact('Ventas', eur(ventas)) : null,
      can('productos.costes') ? fact('Beneficio generado', withCost.length ? h('b', { class: ben < 0 ? 'bad-t' : 'ok-t' }, eur(ben)) : na('sin costes')) : null,
      can('productos.costes') && withCost.length && ventas ? fact('Margen medio', Math.round(ben / ventas * 100) + ' %') : null,
      fact('Horas de impresora', horas ? Math.round(horas * 10) / 10 + ' h' : na('')), fact('Clientes distintos', String(clientes)), fact('Última venta', last ? fdate(last) : na('Nunca')),
      fact('Archivos', files.filter(a => a.tipo === 'stl').length + ' STL · ' + files.filter(a => a.tipo === 'foto').length + ' fotos')),
      can('productos.costes') ? driftCard(p, orders) : null,
      orders.length ? h('div.list.boxed', { style: { marginTop: '12px' } }, orders.slice().reverse().map(o => h('div.item', { onclick: () => go('pedidos/' + o.id) }, h('b', 'nº ' + o.numero), h('span.grow.ellipsis', o.cliente), pill(o.estado, '', stateColor(o.estado)), h('span.small', eur(CL.orderTotal(o)))))) : h('p.muted', 'Sin pedidos todavía.'));
  },
  // v12: lo que se publica en la tienda web (precio, oferta con control de margen, fotos, variantes)
  web(el, p) { mount(el, h('p.muted', 'Cargando…')); import('./tienda.js').then(m => m.productoWeb(el, p)).catch(e => mount(el, h('p.bad-t', e.message))); },
  historial(el, p) {
    mount(el, h('p.muted', 'Cargando…'));
    api('auditoria.lista', { entidad: 'productos', entidadId: p.id }).then(r => mount(el, r.filas.length ? h('div.timeline', r.filas.map(a => h('div.tl', h('span.b'), h('div', h('div.small', h('b', a.usuario), ' ', accionTxt(a.accion)), h('div.tiny.muted', new Date(a.fecha).toLocaleString('es-ES')), a.detalle ? h('div.tiny.muted', resumenDetalle(a.detalle)) : null)))) : h('p.muted.small', 'Sin historial.'))).catch(e => mount(el, h('p.bad-t', e.message)));
  }
};
function fact(l, v) { return h('div.fact', h('div.l', l), h('div.v', v)); }
// v11.8 · Rentabilidad real: primeros pedidos frente a los más recientes (detector de productos que pierden dinero)
function driftCard(p, orders) {
  const r = CL.productDrift(Object.assign({}, S.t, { pedidos: orders }), S.cfg).find(x => x.id === p.id || CL.norm(x.nombre) === CL.norm(p.nombre));
  if (!r) return null;
  const cls = r.estado === 'pierde' ? 'bad' : r.estado === 'empeora' ? 'warn' : r.estado === 'estable' ? 'ok' : '';
  const signo = v => (v > 0 ? '−' : '+') + eur(Math.abs(v));
  return h('div.card.drift' + (cls ? '.drift-' + cls : ''), { style: { marginTop: '12px' } },
    h('div.row', h('b.grow', '💰 Rentabilidad real'), r.estimado ? pill('estimado', 'warn') : null),
    h('p', { style: { margin: '6px 0' } }, r.texto),
    r.inicial ? h('div.facts', fact('Al principio', eur(r.inicial.beneficio) + '/ud · ' + fdate(r.inicial.desde) + '–' + fdate(r.inicial.hasta)),
      fact('Ahora', h('span', h('b', { class: r.reciente.beneficio < 0 ? 'bad-t' : '' }, eur(r.reciente.beneficio) + '/ud'), ' · ' + fdate(r.reciente.desde) + '–' + fdate(r.reciente.hasta))),
      fact('Desde', r.desde ? h('a', { href: '#/pedidos/' + r.desde.id }, 'pedido nº ' + r.desde.numero + ' (' + fdate(r.desde.fecha) + ')') : na('sin bajada sostenida'))) : null,
    r.factores.length ? h('div.list.boxed.drift-f', { style: { marginTop: '8px' } }, r.factores.map(f => h('div.item', h('span.grow', f.t), h('span.small.muted', eur(f.antes) + ' → ' + eur(f.ahora)), h('b.small', { class: f.efecto > 0 ? 'bad-t' : 'ok-t' }, signo(f.efecto) + '/ud')))) : null,
    r.factores.length ? h('p.tiny.muted', 'Cada fila: cuánto resta (−) o suma (+) al beneficio por unidad frente a los primeros pedidos.') : null,
    r.cambiosPrecio.length ? h('p.small', '📈 Cambios de precio registrados en sus materiales: ' + r.cambiosPrecio.map(c => c.material + ' ' + eur(c.antes) + ' → ' + eur(c.precio) + ' (' + fdate(c.fecha) + (c.motivo ? ', ' + c.motivo : '') + ')').join(' · ')) : null,
    r.pendientes.length ? h('p.small.warn-t', '🟠 Dato pendiente: ' + r.pendientes.length + ' pedido(s) sin coste (' + r.pendientes.slice(0, 6).join(', ') + (r.pendientes.length > 6 ? '…' : '') + ') no se cuentan.') : null);
}
// v11: etiqueta de producto / QR / ubicación al tamaño exacto
export function productLabel(p) {
  const x = stockLevel(p.nombre);
  import('../labels.js').then(L => L.labelDialog('producto', [p], {
    plantillas: ['producto', 'qr', 'almacen'],
    dataFor: t => t === 'producto' ? L.dataFor('producto', { p }) : t === 'almacen' ? L.dataFor('almacen', { p, nombre: p.nombre, ubicacion: (x && x.ubicacion) || '' }) : L.dataFor('qr', { tipo: 'producto', id: p.id, titulo: p.nombre })
  }));
}
// v11: stock del producto (la cuenta completa está en la pestaña Stock)
function stockLevel(name) { return CL.stockLevels({ productos: S.t.productos, stock: S.t.stock, fabricacion: S.t.fabricacion || [], pedidos: S.t.pedidos }, S.cfg.pedidos).of(name); }
function stockCard(p) {
  const x = stockLevel(p.nombre);
  const go2 = () => go('stock/' + encodeURIComponent(p.nombre));
  if (!x || !x.controlado) return h('div.card.flat.row', { style: { marginTop: '12px' } }, h('span.grow.small.muted', '📦 Sin control de stock (bajo demanda).' + (x && x.reservado ? ' ' + x.reservado + ' apartada(s) para pedidos.' : '')), can('stock.mover') ? btn('Tengo unidades', go2, { cls: 'sm' }) : null);
  const mv = d => btn(d > 0 ? '+1' : '−1', () => import('./stock.js').then(m => m.move(p.nombre, d)), { cls: 'sm', disabled: d < 0 && x.fisico <= 0 });
  return h('div.card.flat', { style: { marginTop: '12px' } }, h('div.row.wrap', h('b.grow', '📦 Stock' + (x.ubicacion ? ' · ' + x.ubicacion : '')), x.bajo ? pill(x.disponible < 0 ? 'Faltan ' + (-x.disponible) : 'Reponer', x.disponible < 0 ? 'bad' : 'warn') : pill('OK', 'ok')),
    h('div.st-big.sm', h('div', h('b', String(x.fisico)), h('span', 'Estantería')), h('div', h('b', String(x.reservado)), h('span', 'Apartadas')), h('div', h('b', String(x.disponible)), h('span', 'Disponibles'))),
    h('div.row.wrap', can('stock.mover') ? [mv(-1), mv(1)] : null, h('span.grow'), btn('Ver stock e historial', go2, { cls: 'sm ghost' })));
}
async function view3DLocal(path, name) {
  const c = h('canvas.stl-view');
  const info = h('p.small.muted', 'Cargando…');
  const sim = h('div.row.wrap', { style: { gap: '6px' } });
  const m = modal(name, h('div.col', c, info, h('p.tiny.muted', 'Arrastra para girar · rueda o pellizco para acercar'), sim), close => [btn('Cerrar', close, { cls: 'primary' })], { size: 'wide' });
  try { const pos = await parse3D(await desktop.file(path), name), v = viewer(c, pos); info.textContent = v.dims.map(x => x.toFixed(1)).join(' × ') + ' mm · ' + v.triangles.toLocaleString('es-ES') + ' triángulos';
    mount(sim, btn('▶️ Ver cómo se imprime', () => import('../simulacion.js').then(SM => SM.simularImpresion(pos, { nombre: name })), { cls: 'primary sm' })); }
  catch (e) { info.textContent = 'No se pudo mostrar: ' + e.message; }
}

// ---------- Asistente de precio (usa lo que ya hay: costes, Configuración, ventas) ----------
function pricingParams() { return Object.assign({ gramosBobina: 1000 }, S.cfg.precios || {}); }
function gastosMap() { const g = {}; S.t.gastos.forEach(x => { g[CL.norm(x.nombre)] = Number(x.coste) || 0; }); return g; }
export function priceAssistant(p, costsIn, onPick) {
  const calc = p ? S.t.calculadora.find(c => c.nombre === p.nombre) : null;
  // v11.4: los gramos de filamento NO son el peso de la pieza: Bambu Studio si lo hay; si no, el peso solo como ESTIMACIÓN (y se dice)
  const gEst = !(calc && calc.gramos) ? (p && Number(p.bambuGramos) > 0 ? { v: p.bambuGramos, t: 'Gramos de Bambu Studio' } : p && p.pesoG ? { v: p.pesoG, t: 'ESTIMADO con el peso de la pieza (no incluye soportes ni purga)' } : null) : null;
  const c = Object.assign({ gramos: (calc && calc.gramos) || (gEst && gEst.v) || '', horas: (calc && calc.horas) || (p && p.horas) || '', horasMO: (calc && calc.horasMO) || '', precioBobina: (calc && calc.precioBobina) || '', pintado: (calc && calc.pintado) || 'No', costePintado: (calc && calc.costePintado) || '', gasto1: (calc && calc.gasto1) || '', gasto2: (calc && calc.gasto2) || '' }, costsIn || {});
  const f = {
    gramos: inp({ type: 'number', min: 0, step: 1, value: c.gramos, placeholder: 'g' }), horas: inp({ type: 'number', min: 0, step: 0.25, value: c.horas, placeholder: 'h' }),
    horasMO: inp({ type: 'number', min: 0, step: 0.25, value: c.horasMO, placeholder: 'h' }), precioBobina: inp({ type: 'number', min: 0, step: 0.5, value: c.precioBobina, placeholder: 'Por defecto: ' + (S.cfg.precios ? S.cfg.precios.costeKg : 20) + ' €/kg' }),
    pintado: sel(['No', 'Sí'], /^s/i.test(c.pintado) ? 'Sí' : 'No'), costePintado: inp({ type: 'number', min: 0, step: 0.1, value: c.costePintado }),
    gasto1: sel([''].concat(S.t.gastos.map(g => g.nombre)), c.gasto1), gasto2: sel([''].concat(S.t.gastos.map(g => g.nombre)), c.gasto2)
  };
  const out = h('div');
  const orders = p ? S.t.pedidos.filter(o => (o.productoId === p.id || CL.norm(o.producto) === CL.norm(p.nombre)) && !CL.stateOf(S.cfg.pedidos, o.estado).cancelled && Number(o.precio) > 0) : [];
  const calcNow = () => {
    const v = {}; Object.keys(f).forEach(k => { v[k] = f[k].value; });
    const r = CL.prices(v, pricingParams(), gastosMap());
    const faltan = []; if (!Number(v.gramos)) faltan.push('los gramos de filamento'); if (!Number(v.horas)) faltan.push('las horas de impresión');
    const hist = orders.length ? { n: orders.length, media: orders.reduce((s, o) => s + Number(o.precio), 0) / orders.length, min: Math.min(...orders.map(o => Number(o.precio))), max: Math.max(...orders.map(o => Number(o.precio))) } : null;
    mount(out,
      faltan.length ? h('p.small.warn-t', '⚠️ Falta ' + faltan.join(' y ') + ' para un cálculo exacto. El resto ya lo sé por la Configuración.') : null,
      h('div.table-wrap', { style: { marginTop: '8px' } }, h('table.t', h('thead', h('tr', h('th', 'Dónde lo vendes'), h('th', 'Precio recomendado'), h('th', 'No bajes de'), h('th.hide-m', 'Ganas (aprox.)'), onPick ? h('th', '') : null)),
        h('tbody', PLATFORMS.map(pl => h('tr', { style: { cursor: 'default' } }, h('td.bold', pl.t), h('td', h('b', eur(r.recomendado[pl.k]))), h('td', eur(r.minimo[pl.k])), h('td.hide-m', eur(r.beneficio[pl.k])), onPick ? h('td', btn('Usar', () => onPick(r.recomendado[pl.k], pl.t, v), { cls: 'sm' })) : null))
          .concat([h('tr', { style: { cursor: 'default' } }, h('td.bold', 'Segunda mano'), h('td', h('b', eur(r.segundaMano))), h('td', '—'), h('td.hide-m', '—'), onPick ? h('td', btn('Usar', () => onPick(r.segundaMano, 'Segunda mano', v), { cls: 'sm' })) : null)])))),
      h('p.small', { style: { marginTop: '10px' } }, `En palabras: fabricarlo os cuesta ${eur(r.desglose.costeTotal)} con IVA (filamento ${eur(r.desglose.filamento)}, luz ${eur(r.desglose.luz)}, mano de obra ${eur(r.desglose.manoObra)}${r.desglose.pintado ? ', pintado ' + eur(r.desglose.pintado) : ''}${r.desglose.gastosExtra ? ', extras ' + eur(r.desglose.gastosExtra) : ''}). Para ganar el ${Math.round((S.cfg.precios.margen || 0.3) * 100)}% en Wallapop, véndelo a ${eur(r.recomendado.wallapop)}. En Etsy sube a ${eur(r.recomendado.etsy)} porque cobra comisiones (${((S.cfg.precios.etsyVenta + S.cfg.precios.etsyPago + S.cfg.precios.etsyReg) * 100).toFixed(1)}% + ${eur(S.cfg.precios.etsyFijo)} + anuncio).`),
      hist ? h('p.small', '📊 Se ha vendido ' + hist.n + (hist.n === 1 ? ' vez' : ' veces') + ' a una media de ' + eur(hist.media) + (hist.n > 1 ? ' (entre ' + eur(hist.min) + ' y ' + eur(hist.max) + ')' : '') + '.') : null,
      h('p.tiny.muted', 'Mismas fórmulas que la hoja Productos del Excel · parámetros de ' + (S.cfg.precios.desdeSheet ? 'la hoja Configuración' : 'la configuración de la app') + '. Los precios se redondean hacia arriba a 10 céntimos.'));
    return { r, v };
  };
  Object.values(f).forEach(x => x.addEventListener('input', calcNow));
  const wrap = h('div.col',
    h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' } }, field('Filamento (gramos)', f.gramos, gEst ? gEst.t : null), field('Horas de impresión', f.horas), field('Horas de mano de obra', f.horasMO, 'Solo para el precio orientativo: en los pedidos se cobra lo que indiques al cerrar el paquete'), field('Precio bobina 1 kg (€)', f.precioBobina), field('¿Pintado?', f.pintado), field('Coste del pintado (€)', f.costePintado), field('Gasto extra 1', f.gasto1), field('Gasto extra 2', f.gasto2)),
    out,
    p && can('productos.editar') && !onPick ? h('div.row', btn('Guardar costes', async () => { const { v } = calcNow(); await saveProduct(p, {}, v); }, { cls: 'sm' }), btn('Usar precio de Wallapop', async () => { const { r, v } = calcNow(); await saveProduct(p, { precio: r.recomendado.wallapop }, v); }, { cls: 'primary sm' })) : null);
  wrap.getCosts = () => { const v = {}; Object.keys(f).forEach(k => { v[k] = f[k].value; }); return v; };
  calcNow();
  return wrap;
}

// v10: al pasar a LISTO, Celebrity genera el documento de venta y lo guarda en el producto
async function changeState(p, estado) {
  await saveProduct(p, { estado });
  if (estado === 'Publicado' && can('archivos.subir') && !filesOf('productos', p.id).some(a => /^Venta - /.test(a.nombre || ''))) {
    try { const d = await generate(p); await saveDoc(p, d); toast('✨ Celeby Nova ha preparado el documento de venta (Textos de venta y Archivos)', 'ok', 6000); api('ia.registrar', { tipo: 'documento', resumen: 'Documento de venta de ' + p.nombre + ' (' + (p.sku || p.id) + ')', herramientas: ['documento'], acciones: [] }).catch(() => { }); }
    catch (e) { toast('No se pudo generar el documento: ' + e.message, 'warn'); }
  }
}
async function saveDoc(p, d) {
  const f = new File([docxBlob(p, d)], docName(p), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  if (desktop.on && p.ruta) { try { await desktop.save(p.ruta + (p.ruta.includes('\\') ? '\\' : '/') + f.name, f, true); } catch (e) { } }
  await uploadFile(f, { entidad: 'productos', entidadId: p.id });
}
async function saveProduct(p, datos, costes) {
  const orig = {}; Object.keys(datos).forEach(k => { orig[k] = p[k] ?? ''; });
  try {
    const r = await mutate('productos.guardar', { id: p.id, datos, orig, costes }, { onlineOnly: true, label: 'Producto ' + p.nombre });
    if (r && r.id) { upsertLocal('productos', r); emit(); }
    toast('Producto guardado', 'ok');
  } catch (e) { handleError(e, 'productos'); }
}
async function delProduct(p, done) {
  if (!await confirmDlg('Borrar producto', 'Se moverá a la papelera (se puede restaurar). La carpeta del ordenador no se toca. ¿Seguro?', 'Borrar', true)) return;
  try { await mutate('productos.borrar', { id: p.id }, { onlineOnly: true }); removeLocal('productos', p.id); emit(); toast('Producto en la papelera', 'ok'); done(); } catch (e) { handleError(e, 'productos'); }
}

// ---------- Nuevo producto / editar (asistente en 3 pasos) ----------
async function productFolder(p) {
  const root = await desktop.getConfig('productRoot');
  if (!root) return '';
  const sep = root.includes('/') && !root.includes('\\') ? '/' : '\\';
  const clean = s => String(s || '').replace(/[\\/:*?"<>|]+/g, '').trim();
  const findOrMake = async (base, name) => {
    if (!name) return base;
    try {
      const r = await desktop.list(base);
      const hit = (r.entries || []).find(e => e.type === 'dir' && CL.norm(e.name.replace(/^\d+_/, '').replace(/_/g, ' ')) === CL.norm(name));
      if (hit) return base + sep + hit.name;
    } catch (e) { }
    return base + sep + clean(name).toUpperCase();
  };
  let dir = await findOrMake(root, p.categoria);
  dir = await findOrMake(dir, p.subcategoria);
  dir = dir + sep + clean(p.id + ' - ' + p.nombre);
  await desktop.mkdir(dir);
  return dir;
}
export function productWizard(p) {
  if (!can('productos.editar')) return requestAccess('productos.editar', 'productos');
  const isNew = !p;
  p = p || {};
  let step = 0;
  let cats = [...new Set(S.t.productos.map(x => x.categoria).filter(Boolean).concat(['HOGAR', 'ESCRITORIO Y SETUP', 'NAVIDAD', 'HALLOWEEN', 'CELEBRACIONES', 'JUGUETES Y JUEGOS', 'LLAVEROS Y PERSONALIZADOS', 'COCINA Y MESA']))];
  let subs = [...new Set(S.t.productos.map(x => x.subcategoria).filter(Boolean))];
  let folderTree = null;
  // v10.6.3: Categoría y Subcategoría se ELIGEN de una lista con las carpetas que ya existen
  // (y "➕ Otra (escribir)" para poner una nueva). Sin carpeta de productos, lista con lo ya usado.
  const OTRA = '__otra__';
  const combo = (input) => {
    const s2 = h('select.inp', { 'aria-label': 'Elegir de la lista' });
    const wrap = h('div.col', { style: { gap: '6px' } }, s2, input);
    let opts = [];
    const sync = () => {
      const cur = CL.norm(input.value);
      const hit = opts.find(o => CL.norm(o) === cur);
      if (!opts.length) { s2.style.display = 'none'; input.style.display = ''; return; }
      s2.style.display = '';
      if (hit) { s2.value = hit; input.value = hit; input.style.display = 'none'; }
      else if (input.value.trim()) { s2.value = OTRA; input.style.display = ''; }
      else { s2.value = ''; input.style.display = 'none'; }
    };
    s2.addEventListener('change', () => {
      if (s2.value === OTRA) { input.value = ''; input.style.display = ''; input.focus(); }
      else { input.value = s2.value; input.style.display = 'none'; }
      input.dispatchEvent(new Event('change'));
    });
    return {
      el: wrap,
      set(list) {
        const seen = new Set();
        opts = list.filter(Boolean).filter(o => { const k = CL.norm(o); if (seen.has(k)) return false; seen.add(k); return true; });
        mount(s2, h('option', { value: '' }, '— Elige —'), opts.map(o => h('option', { value: o }, pretty(o))), h('option', { value: OTRA }, '➕ Otra (escribir)'));
        sync();
      }
    };
  };
  const isProductDir = n => /^[A-Z]{2,5}-\d+/i.test(n);
  const loadSubs = async () => {
    const cur = CL.norm(f.categoria.value);
    const fromProducts = S.t.productos.filter(x => CL.norm(x.categoria) === cur).map(x => x.subcategoria).filter(Boolean);
    let list = [];
    const hit = folderTree && folderTree.find(e => CL.norm(e.name.replace(/^\d+_/, '').replace(/_/g, ' ')) === cur);
    if (hit) { try { const r = await desktop.list(hit.path); list = (r.entries || []).filter(e => e.type === 'dir' && !isProductDir(e.name)).map(e => pretty(e.name)); } catch (e) { } }
    else { const sh = sharedTree().find(x => CL.norm(x.c) === cur); if (sh) list = sh.s.slice(); } // móvil: la lista que publicó el PC
    cSub.set(list.concat(fromProducts.map(pretty)));
  };
  // v10.6.4: el PC con la carpeta de productos publica la lista de carpetas (categoría → subcategorías)
  // en la configuración del servidor, para que los móviles y los PC sin carpeta vean las mismas listas.
  const sharedTree = () => (S.cfg && S.cfg.sku && Array.isArray(S.cfg.sku.carpetas)) ? S.cfg.sku.carpetas : [];
  const publishTree = async () => {
    if (!folderTree || !can('config.editar') || (S.ws && S.ws !== 'principal')) return;
    const tree = [];
    for (const e of folderTree) {
      try { const r = await desktop.list(e.path); tree.push({ c: e.name.replace(/^\d+_/, '').replace(/_/g, ' '), s: (r.entries || []).filter(x => x.type === 'dir' && !isProductDir(x.name)).map(x => pretty(x.name)) }); } catch (err) { }
    }
    if (!tree.length || JSON.stringify(tree) === JSON.stringify(sharedTree())) return;
    try { S.cfg = await api('config.guardar', { clave: 'sku', valor: Object.assign({}, (S.cfg && S.cfg.sku) || {}, { carpetas: tree }) }, { quiet: true }); } catch (err) { }
  };
  if (desktop.on) desktop.getConfig('productRoot').then(root => root && desktop.list(root)).then(r => {
    if (!r) return;
    folderTree = (r.entries || []).filter(e => e.type === 'dir' && /^\d+_/.test(e.name) && !/^(00|99)_/.test(e.name));
    const folderCats = folderTree.map(e => e.name.replace(/^\d+_/, '').replace(/_/g, ' '));
    cats = [...new Set(folderCats.concat(cats))];
    cCat.set(folderCats.concat(S.t.productos.map(x => x.categoria)));
    loadSubs();
    publishTree();
  }).catch(() => { });
  const f = {
    nombre: inp({ value: p.nombre || '', placeholder: 'Ej.: Maceta geométrica' }),
    tipo: sel(['3D', 'Reventa', 'Otro'], p.tipo || '3D'),
    categoria: inp({ value: p.categoria || '', list: 'dl-pcat', placeholder: 'Ej.: HOGAR' }),
    subcategoria: inp({ value: p.subcategoria || '', list: 'dl-psub', placeholder: 'Ej.: Baño' }),
    color: inp({ value: p.color || '' }), tamano: inp({ value: p.tamano || '', placeholder: 'Ej.: 12 × 8 × 5 cm' }),
    pesoG: inp({ type: 'number', min: 0, step: 1, value: p.pesoG ?? '', placeholder: 'g' }), // v11.4: peso de la PIEZA (sin caja ni embalaje) tallas: inp({ value: p.tallas || '', placeholder: 'Ej.: S, M, L, XL (si tiene)' }),
    material: sel(['', 'PLA', 'PETG', 'TPU', 'ABS', 'Resina', 'Madera', 'Otro'], p.material || 'PLA'),
    plataforma: sel(['', 'Wallapop', 'Vinted', 'Etsy', 'Instagram', 'Tienda física', 'Otro'], p.plataforma || ''),
    fuente: sel(['', 'Diseño propio', 'Descargado (gratis)', 'Comprado', 'Encargo del cliente'], p.fuente || ''),
    enlace: inp({ value: p.enlace || '', placeholder: 'https://… (Printables, Thingiverse, MakerWorld…)' }),
    licencia: inp({ value: p.licencia || '', placeholder: 'Ej.: CC BY-NC · uso comercial permitido' }),
    descripcion: area({ value: p.descripcion || '', placeholder: 'Texto para el anuncio: medidas, colores disponibles, detalles…' }),
    estado: sel(STATES, pState(p.estado)), precio: inp({ type: 'number', min: 0, step: 0.1, value: p.precio || '' })
  };
  // v11: stock desde el primer momento (bajo demanda lo normal es 0)
  const lv = p.nombre ? stockLevel(p.nombre) : null;
  const sk = { unidades: inp({ type: 'number', min: 0, step: 1, inputmode: 'numeric', value: lv && lv.controlado ? Math.max(0, lv.fisico) : 0 }), minimo: inp({ type: 'number', min: 0, step: 1, inputmode: 'numeric', value: lv && lv.minimo ? lv.minimo : '', placeholder: 'Sin aviso' }), ubicacion: inp({ value: (lv && lv.ubicacion) || '', placeholder: 'Ej.: Estantería 2 · caja A3' }) };
  const skBox = h('div.stock-ask', h('div.lbl', '📦 Stock'), h('div.form', field('Unidades que tienes ahora', sk.unidades, 'Bajo demanda: deja 0. Se suman solas al terminar impresiones.'), field('Stock mínimo', sk.minimo, 'Aviso (app + Telegram) al bajar de aquí.'), field('Ubicación física', sk.ubicacion)));
  const cCat = combo(f.categoria), cSub = combo(f.subcategoria);
  { const sh = sharedTree().map(x => x.c); if (sh.length) cats = [...new Set(sh.concat(cats))]; cCat.set(sh.length ? sh.concat(S.t.productos.map(x => x.categoria)) : cats); } loadSubs();
  f.categoria.addEventListener('change', () => { f.subcategoria.value = ''; loadSubs(); });
  // ---- v16: medidas reales de la pieza (se calculan al subir el STL / 3MF; siempre se pueden corregir a mano) ----
  const dimF = k => inp({ type: 'number', min: 0, step: 0.1, value: p[k] ?? '', placeholder: 'mm', inputmode: 'decimal', style: { maxWidth: '110px' } });
  Object.assign(f, { dimX: dimF('dimX'), dimY: dimF('dimY'), dimZ: dimF('dimZ'), dimEstado: inp({ type: 'hidden', value: p.dimEstado || '' }), dimArchivo: inp({ type: 'hidden', value: p.dimArchivo || '' }) });
  const medInfo = h('div.med-info'), medSug = h('div.med-sug');
  const medBox = h('div.med-box.full', h('div.lbl', '📐 Medidas reales de la pieza (mm)'), h('div.row.wrap.med-xyz', h('span', 'X'), f.dimX, h('span', '× Y'), f.dimY, h('span', '× Z'), f.dimZ), medInfo, medSug, f.dimEstado, f.dimArchivo);
  const ESTADOS_MED = { medido: ['✓ Medido en el archivo', 'ok'], supuesto: ['Leído en mm (el STL no guarda la unidad)', ''], revisar: ['⚠️ Revisar la escala', 'warn'], manual: ['✏️ Puesto a mano', ''] };
  let medUlt = null;
  function pintarMed() {
    const e = ESTADOS_MED[f.dimEstado.value];
    mount(medInfo, f.dimX.value === '' ? h('span.tiny.muted', 'Sube el STL o el 3MF y se calculan solas (caja envolvente real, no a ojo). También puedes escribirlas.') : [e ? pill(e[0], e[1]) : null, f.dimArchivo.value ? h('span.tiny.muted', ' ' + f.dimArchivo.value) : null],
      medUlt && medUlt.aviso ? h('div.tiny.' + (medUlt.estado === 'revisar' ? 'warn-t' : 'muted'), medUlt.aviso) : null,
      medUlt && medUlt.sugerencias ? h('div.row.wrap', { style: { gap: '6px', marginTop: '4px' } }, medUlt.sugerencias.map(s => btn(s.t, () => ponerMed(escalar(medUlt, s.f), f.dimArchivo.value), { cls: 'sm' }))) : null);
    const d = { x: Number(f.dimX.value), y: Number(f.dimY.value), z: Number(f.dimZ.value) };
    mount(medSug);
    if (d.x > 0 && d.y > 0 && d.z > 0) api('embalajes.sugerir', { dim: d }).then(r => { const s = r && r.sugerencia; if (!s || Number(f.dimX.value) !== d.x) return; mount(medSug, h('span.tiny', s.cabe ? ['📦 Embalaje que le va: ', h('b', s.nombre), ' (' + s.envase + ')', s.aviso ? h('span.warn-t', ' · ' + s.aviso) : null] : h('span.warn-t', '📦 ' + s.motivo))); }).catch(() => { });
  }
  function ponerMed(m, archivo) { medUlt = m; f.dimX.value = m.x; f.dimY.value = m.y; f.dimZ.value = m.z; f.dimEstado.value = m.estado; f.dimArchivo.value = archivo || ''; pintarMed(); }
  [f.dimX, f.dimY, f.dimZ].forEach(x => x.addEventListener('change', () => { f.dimEstado.value = f.dimX.value === '' && f.dimY.value === '' && f.dimZ.value === '' ? '' : 'manual'; if (!f.dimEstado.value) f.dimArchivo.value = ''; medUlt = null; pintarMed(); }));
  // al subir (o sustituir) el archivo 3D se vuelven a calcular
  async function medirArchivo(it) {
    if (!it || !it.file || !esArchivo3D(it.file.name)) return;
    try { const m = await medir3D(await it.file.arrayBuffer(), it.file.name); ponerMed(m, it.file.name); toast('📐 ' + [m.x, m.y, m.z].join(' × ') + ' mm' + (m.estado === 'revisar' ? ' · revisa la escala' : ''), m.estado === 'revisar' ? 'warn' : 'ok'); }
    catch (e) { mount(medInfo, h('span.tiny.warn-t', 'No he podido medir «' + it.file.name + '»: ' + e.message + ' Puedes escribir las medidas a mano.')); }
  }
  pintarMed();
  const zones = { foto: dropZone('foto', { title: 'FOTO', existing: () => p.id ? filesOf('productos', p.id) : [] }), video: dropZone('video', { title: 'VÍDEO', existing: () => p.id ? filesOf('productos', p.id) : [] }), stl: dropZone('stl', { title: 'STL / 3MF', existing: () => p.id ? filesOf('productos', p.id) : [], onReady: medirArchivo }) };
  let pa = null;
  const msg = h('p.bad-t');
  const body = h('div');
  const foot = h('div.row', { style: { width: '100%' } });
  const titles = ['1 · Datos del producto', '2 · Foto, vídeo y STL', '3 · Costes y precio'];
  const m = modal(isNew ? 'Nuevo producto' : 'Editar ' + p.nombre, body, foot, { size: 'wide', sticky: true });
  const draw = () => {
    msg.textContent = '';
    const bar = h('div.wiz-steps', titles.map((t, i) => h('div.st' + (i === step ? '.on' : i < step ? '.done' : ''))));
    if (step === 0) mount(body, bar, h('h3', titles[0]), h('datalist', { id: 'dl-pcat' }, cats.map(c => h('option', { value: c }))), h('datalist', { id: 'dl-psub' }, subs.map(c => h('option', { value: c }))),
      h('div.form', { style: { marginTop: '12px' } }, field('Nombre *', f.nombre, null, 'full'), field('Tipo', f.tipo), field('Estado', f.estado), field('Categoría', cCat.el, 'Se usa también para la carpeta y el ID (p. ej. HOG-0001).'), field('Subcategoría', cSub.el),
        field('Color', f.color), field('Material', f.material), field('Tamaño', f.tamano, 'Texto libre para el anuncio (las medidas reales van abajo)'), field('Peso del producto (g)', f.pesoG, 'Solo la pieza: sin caja ni embalaje'), field('Tallas', f.tallas), field('Dónde se vende', f.plataforma), field('Descripción', f.descripcion, null, 'full'), h('div.full', btn('✨ Crear descripción corta', () => import('../descripcion.js').then(D => D.rapida({ texto: f.nombre.value, onUsar: txt => { f.descripcion.value = txt; } })), { cls: 'sm ghost' }))),
      can('stock.mover') || can('productos.editar') ? skBox : null,
      h('details.more', { style: { marginTop: '12px' } }, h('summary', 'Origen y licencia del diseño'), h('div.in.form', field('Origen', f.fuente), field('Licencia', f.licencia), field('Enlace', f.enlace, null, 'full'))), msg);
    if (step === 1) mount(body, bar, h('h3', titles[1]), h('p.small.muted', 'Cada tipo de archivo tiene su zona. Puedes arrastrarlos, elegirlos o, en el móvil, hacer la foto o grabar el vídeo directamente.' + (desktop.on ? ' Se guardarán también en la carpeta del producto de este ordenador.' : '')),
      h('div.drops', { style: { marginTop: '12px' } }, zones.foto.el, zones.video.el, zones.stl.el), medBox, missingHint(), msg);
    if (step === 2) {
      if (!pa) pa = priceAssistant(p.id ? p : null, null, (v) => { f.precio.value = v; toast('Precio puesto: ' + eur(v), 'ok'); });
      mount(body, bar, h('h3', titles[2]), h('p.small.muted', 'Rellena lo que sepas: el resto (IVA, margen, luz, mano de obra, comisiones) sale de la Configuración.'),
        can('productos.costes') ? pa : h('p.muted', '🔒 No tienes permiso para ver costes.'), h('div.form', { style: { marginTop: '12px' } }, field('Precio de venta (€)', f.precio, 'Pulsa "Usar" en la tabla o escríbelo.')), msg);
    }
    mount(foot, step > 0 ? btn('Atrás', () => { step--; draw(); }) : btn('Cancelar', async () => { if (anyFiles() && !await confirmDlg('Descartar', '¿Descartar el producto y los archivos preparados?', 'Descartar', true)) return; m.close(); }), h('span.grow'),
      step < 2 ? btn(isNew ? 'Crear ya' : 'Guardar ya', ev => { if (!f.nombre.value.trim()) { msg.textContent = 'Escribe el nombre del producto.'; return; } saveAll(ev); }, { cls: 'ghost', title: 'Guardar ahora; los archivos y costes se pueden añadir después' }) : null,
      step < 2 ? btn('Siguiente', next, { cls: 'primary' }) : btn(isNew ? 'Crear producto' : 'Guardar', saveAll, { cls: 'primary', icon: 'check' }));
  };
  const anyFiles = () => Object.values(zones).some(z => z.items.length);
  // v11: recordatorios sin ventanas que bloqueen (antes eran dos preguntas seguidas)
  const missingHint = () => {
    const has = t => zones[t].items.some(i => !i.err) || (p.id && filesOf('productos', p.id).some(a => a.tipo === t));
    const miss = [f.tipo.value === '3D' && !has('stl') ? 'el STL/3MF (os ahorrará buscarlo después)' : null, !has('foto') ? 'una foto (ayuda a venderlo)' : null].filter(Boolean);
    return miss.length ? h('p.small.muted', { style: { marginTop: '10px' } }, '💡 Falta ' + miss.join(' y ') + '. Puedes seguir y añadirlo cuando quieras.') : null;
  };
  async function next() {
    if (step === 0) {
      if (!f.nombre.value.trim()) return msg.textContent = 'Escribe el nombre del producto.';
      const dup = S.t.productos.find(x => x.id !== p.id && CL.norm(x.nombre) === CL.norm(f.nombre.value));
      if (dup) return msg.textContent = 'Ya existe un producto llamado "' + dup.nombre + '" (' + dup.id + ').';
    }
    if (step === 1) {
      if (Object.values(zones).some(z => z.busy())) return msg.textContent = 'Espera a que terminen de prepararse las vistas previas…';
    }
    step++; draw();
  }
  async function saveAll(ev) {
    const b = ev.target.closest('button'); b.disabled = true; b.textContent = 'Guardando…';
    const datos = {}; Object.keys(f).forEach(k => { datos[k] = typeof f[k].value === 'string' ? f[k].value.trim() : f[k].value; });
    if (datos.precio === '') delete datos.precio; else datos.precio = Number(datos.precio);
    if (datos.pesoG !== '') datos.pesoG = Number(datos.pesoG);
    ['dimX', 'dimY', 'dimZ'].forEach(k => { if (datos[k] !== '') datos[k] = Number(datos[k]); }); // v16
    const costes = pa && can('productos.costes') ? pa.getCosts() : null;
    // v11: unidades, mínimo y ubicación (solo si se han tocado o el producto es nuevo con datos)
    let stock = null;
    { const u = sk.unidades.value === '' ? '' : Math.round(Number(sk.unidades.value)), mi = sk.minimo.value === '' ? '' : Math.round(Number(sk.minimo.value)), ub = sk.ubicacion.value.trim();
      const was = { u: lv && lv.controlado ? Math.max(0, lv.fisico) : 0, mi: lv && lv.minimo ? lv.minimo : '', ub: (lv && lv.ubicacion) || '' };
      if (String(u) !== String(was.u) || String(mi) !== String(was.mi) || ub !== was.ub) stock = { unidades: String(u) !== String(was.u) && can('stock.mover') ? u : undefined, minimo: mi, ubicacion: ub }; }
    try {
      let prod;
      if (isNew) prod = await mutate('productos.guardar', { datos, costes, stock }, { onlineOnly: true, label: 'Nuevo producto' });
      else { const orig = {}; Object.keys(datos).forEach(k => { orig[k] = p[k] ?? ''; }); prod = await mutate('productos.guardar', { id: p.id, datos, orig, costes, stock }, { onlineOnly: true }); }
      if (prod && prod._stock) { import('../store.js').then(m => m.pull()); delete prod._stock; }
      upsertLocal('productos', prod); emit();
      // Carpeta en el ordenador + archivos
      let dir = prod.ruta;
      if (desktop.on && !dir) {
        try { dir = await productFolder(prod); if (dir) { const r2 = await api('productos.guardar', { id: prod.id, datos: { ruta: dir }, orig: { ruta: '' } }); upsertLocal('productos', r2); } } catch (e) { toast('No se pudo crear la carpeta del producto: ' + e.message, 'warn'); }
      }
      const sub = { foto: 'FOTOS', video: 'VIDEOS', stl: 'STL' };
      for (const k of Object.keys(zones)) {
        const z = zones[k];
        if (desktop.on && dir) {
          z.items.forEach(it => { it._path = dir + (dir.includes('/') ? '/' : '\\') + sub[k] + (dir.includes('/') ? '/' : '\\') + it.file.name; });
        }
      }
      b.textContent = 'Subiendo archivos…';
      const errors = [];
      for (const k of Object.keys(zones)) {
        const z = zones[k];
        // en el PC: se guardan en la carpeta y (fotos/vídeos, y STL pequeños) también en Drive para verlos en el móvil
        z._opts = null;
        await uploadZone(z, prod.id, k, dir).catch(e => errors.push(e.message));
        if (z.hasErrors()) errors.push(RULES[k].t + ': algún archivo no se pudo subir');
      }
      if (errors.length) { toast('Producto guardado, pero: ' + errors.join(' · '), 'warn', 9000); step = 1; draw(); b.disabled = false; return; }
      m.close();
      toast(isNew ? 'Producto ' + prod.id + ' creado 🎉' : 'Producto guardado', 'ok');
      go('productos/' + prod.id);
      if (isNew && can('redes.preparar')) setTimeout(() => toast('💡 Idea: prepara un reel de ' + prod.nombre + ' desde Redes sociales.', '', 6000), 1500);
    } catch (e) { msg.textContent = e.message; handleError(e, 'productos'); b.disabled = false; b.textContent = isNew ? 'Crear producto' : 'Guardar'; }
  }
  async function uploadZone(z, id, k, dir) {
    for (const it of z.items) {
      if (it.err || it.state === 'subido') continue;
      if (desktop.on && dir && it._path) {
        it.state = 'subiendo'; it.progress = 0;
        await desktop.save(it._path, it.file);
        const alsoDrive = k !== 'stl' || it.file.size < 25 * 1048576;
        let rec;
        if (alsoDrive) rec = await import('../files.js').then(m2 => m2.uploadFile(it.file, { entidad: 'productos', entidadId: id, huella: it.huella, miniatura: it.thumb, rutaLocal: it._path }));
        else rec = await api('archivos.enlazarLocal', { nombre: it.file.name, rutaLocal: it._path, tamano: it.file.size, huella: it.huella, entidad: 'productos', entidadId: id, miniatura: it.thumb, mime: it.file.type });
        upsertLocal('archivos', rec);
        it.state = 'subido';
      }
    }
    return z.uploadAll('productos', id);
  }
  draw();
}

// ================= v11.4 · Datos de Bambu Studio (archivo .3mf laminado) =================
// El coste de filamento que da Bambu Studio MANDA: «Coste de filamento: X € · Fuente: Bambu Studio».
// Si no lo hay: «Coste estimado de filamento» (cálculo propio). Bambu da el filamento GASTADO (con soportes
// y purga): NO es el peso de la pieza, por eso no se usa como peso del producto.
function bambuCard(p) {
  const d = p.bambuDatos && typeof p.bambuDatos === 'object' ? p.bambuDatos : null, ver = can('productos.costes'), edit = can('productos.editar');
  const has = Number(p.bambuGramos) > 0;
  const file = h('input', { type: 'file', accept: '.3mf', style: { display: 'none' } });
  file.onchange = () => file.files[0] && readBambu(p, file.files[0]).finally(() => { file.value = ''; });
  return h('div.card.flat', h('div.row.wrap', h('b.grow', '🧵 Datos de Bambu Studio'), edit ? btn(has ? 'Actualizar con otro .3mf' : 'Leer un .3mf laminado', () => file.click(), { cls: 'sm', icon: 'upload' }) : null, file),
    has ? h('div', { style: { marginTop: '6px' } },
      ver ? h('div', Number(p.bambuCoste) > 0 ? h('span', 'Coste de filamento: ', h('b', eur(p.bambuCoste)), ' por pieza · ', h('b', 'Fuente: Bambu Studio')) : h('span.warn-t', 'Bambu Studio no tenía precio para ese filamento: se usa el «Coste estimado de filamento» (cálculo propio).')) : null,
      h('div.small.muted', 'Filamento: ' + String(p.bambuGramos).replace('.', ',') + ' g por pieza · impresora: ' + String(p.bambuHoras).replace('.', ',') + ' h por pieza' + (d ? ' · ' + d.archivo + ' (placa ' + d.placa + ', ' + d.piezas + ' pieza' + (d.piezas > 1 ? 's' : '') + ') · ' + fdate(String(d.fecha).slice(0, 10)) : '')),
      h('p.tiny.muted', 'Son los gramos que GASTA la impresión (con soportes y purga), no el peso de la pieza.'),
      edit ? btn('Quitar estos datos', async () => { if (!await confirmDlg('Quitar datos de Bambu', 'Volverá a usarse el cálculo propio del filamento.', 'Quitar')) return; try { const r = await api('productos.bambu', { id: p.id, borrar: true }); if (r.producto) { upsertLocal('productos', r.producto); emit(); } } catch (e) { handleError(e); } }, { cls: 'sm ghost' }) : null)
      : h('p.small.muted', 'Sin datos de Bambu Studio: el coste de filamento es ESTIMADO (cálculo propio). Lee el .3mf que guarda Bambu Studio al laminar («Exportar archivo de placa laminada») para usar sus gramos, tiempo y coste.'));
}
async function readBambu(p, f) {
  try {
    const z = await unzip(await f.arrayBuffer(), n => /Metadata\/(slice_info|project_settings)\.config$/i.test(n));
    const dec = x => x ? new TextDecoder().decode(x) : '';
    const key = k => Object.keys(z).find(n => n.toLowerCase().endsWith(k));
    const xml = dec(z[key('slice_info.config')]), proj = dec(z[key('project_settings.config')]);
    if (!xml) return toast('Este .3mf no está laminado: en Bambu Studio pulsa «Laminar» y guarda o exporta la placa laminada.', 'warn', 7000);
    const b = CL.bambuSlice(xml, proj || null);
    if (!b.placas.length || !(b.placas[0].gramos > 0)) return toast('El archivo no trae los gramos de filamento.', 'warn');
    const pl = sel(b.placas.map(x => ({ v: String(x.placa), t: 'Placa ' + x.placa + ' · ' + String(x.gramos).replace('.', ',') + ' g · ' + (Math.round(x.segundos / 360) / 10).toString().replace('.', ',') + ' h' + (x.coste !== null ? ' · ' + eur(x.coste) : '') })), String(b.placas[0].placa));
    const piezas = inp({ type: 'number', min: 1, step: 1, value: 1, style: { width: '90px' } }), out = h('div');
    const upd = () => { const x = b.placas.find(q => String(q.placa) === pl.value) || b.placas[0], n = Math.max(1, Number(piezas.value) || 1);
      mount(out, h('div.card.flat', h('div', 'Por pieza: ', h('b', String(Math.round(x.gramos / n * 10) / 10).replace('.', ',') + ' g'), ' · ', (Math.round(x.segundos / n / 36) / 100).toString().replace('.', ',') + ' h'),
        x.coste !== null ? h('div', 'Coste de filamento: ', h('b', eur(Math.round(x.coste / n * 100) / 100)), ' por pieza · Fuente: Bambu Studio') : h('div.warn-t.small', 'Bambu Studio no tiene precio para este filamento (pon el precio del filamento en Bambu Studio y vuelve a laminar): se usará el coste ESTIMADO propio.'),
        h('div.tiny.muted', x.filamentos.map(fl => (fl.tipo || 'Filamento') + ' ' + (fl.color || '') + ' ' + String(fl.gramos).replace('.', ',') + ' g').join(' · ')))); };
    pl.onchange = upd; piezas.oninput = upd; upd();
    modal('Datos de Bambu Studio · ' + f.name, h('div.col', b.placas.length > 1 ? field('Placa', pl) : null, field('¿Cuántas piezas salen en esa placa?', piezas, 'Se divide para tener el dato de UNA pieza'), out),
      close => [btn('Cancelar', close), btn('Guardar en el producto', async () => {
        const x = b.placas.find(q => String(q.placa) === pl.value) || b.placas[0];
        try { const r = await api('productos.bambu', { id: p.id, gramos: x.gramos, segundos: x.segundos, coste: x.coste, piezas: Math.max(1, Number(piezas.value) || 1), archivo: f.name, placa: x.placa, precios: b.precios || [], filamentos: x.filamentos });
          if (r.producto) { upsertLocal('productos', r.producto); emit(); } toast('Datos de Bambu Studio guardados', 'ok'); close(); } catch (e) { handleError(e); }
      }, { cls: 'primary' })], { size: 'narrow' });
  } catch (e) { toast('No se pudo leer el .3mf: ' + e.message, 'bad'); }
}
