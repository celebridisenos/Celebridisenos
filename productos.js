// ================= Productos: catálogo, nuevo producto con Foto/Vídeo/STL y asistente de precio =================
import { h, mount, icon, btn, modal, drawer, toast, eur, fdate, ago, pill, empty, field, inp, sel, area, debounce, confirmDlg, bytes, na } from '../ui.js';
import { S, can, mutate, api, byId, upsertLocal, removeLocal, emit, timing, stateColor } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { dropZone, gallery, filesOf, filesSection, openFile, RULES, extOf } from '../files.js';
import { desktop } from '../desktop.js';
import { parse3D, viewer } from '../stl.js';
import { accionTxt, resumenDetalle } from './pedidos.js';
import { generate, asText, docxBlob, docName, PLATAFORMAS } from '../docventa.js';
import { download, uploadFile } from '../files.js';
import { copyText } from '../ui.js';

const CL = window.CL;
// v10: BORRADOR → LISTO → PUBLICADO → VENDIDO → ARCHIVADO (se conservan los de antes)
export const STATES = ['Borrador', 'En proceso', 'Listo', 'Publicado', 'Reservado', 'Vendido', 'Archivado', 'Retirado'];
const NEXT = { 'Borrador': ['Listo'], 'En proceso': ['Listo'], 'Listo': ['Publicado'], 'Publicado': ['Vendido', 'Reservado'], 'Reservado': ['Vendido', 'Publicado'], 'Vendido': ['Archivado'], 'Archivado': ['Borrador'], 'Retirado': ['Borrador'] };
const ST_CLS = { 'Borrador': '', 'En proceso': 'info', 'Listo': 'info', 'Publicado': 'brand', 'Reservado': 'warn', 'Vendido': 'ok', 'Archivado': '', 'Retirado': '' };
const LEGACY = { EN_PROCESO: 'En proceso', PUBLICADO: 'Publicado', RESERVADO: 'Reservado', VENDIDO: 'Vendido', RETIRADO: 'Retirado', BORRADOR: 'Borrador', LISTO: 'Listo', ARCHIVADO: 'Archivado' };
export const pState = s => LEGACY[String(s || '').toUpperCase()] || s || 'En proceso';
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
      const tabs = [['resumen', 'Resumen'], can('productos.costes') ? ['precio', 'Precio y costes'] : null, ['archivos', 'Fotos, vídeos y STL (' + filesOf('productos', p.id).length + ')'], ['venta', '📄 Textos de venta'], ['pedidos', 'Pedidos (' + orders.length + ')'], ['historial', 'Historial']].filter(Boolean);
      const body = h('div');
      mount(d, h('div.drawer-h', h('div.grow', h('h2.ellipsis', p.nombre), h('div.row', { style: { marginTop: '4px' } }, h('span.tiny.muted', 'SKU ' + (p.sku || p.id)), pill(pState(p.estado), ST_CLS[pState(p.estado)]))), btn('', closeAll, { cls: 'ghost icon', icon: 'x' })),
        h('div.drawer-b.col', { style: { gap: '14px' } }, h('div.tabs', tabs.map(x => h('button' + (tab === x[0] ? '.on' : ''), { onclick: () => { tab = x[0]; draw(); } }, x[1]))), body,
          h('div.row.wrap', { style: { borderTop: '1px solid var(--line)', paddingTop: '14px' } },
            can('productos.editar') ? h('div.row.wrap', (NEXT[pState(p.estado)] || ['Listo']).map(s => btn('→ ' + s, () => changeState(p, s), { cls: 'sm' })), h('select.inp.sm', { style: { width: 'auto' }, onchange: e => { if (e.target.value) changeState(p, e.target.value); } }, h('option', { value: '' }, 'Estado…'), STATES.filter(s => s !== pState(p.estado)).map(s => h('option', { value: s }, s)))) : null, h('span.grow'),
            can('pedidos.crear') ? btn('Nuevo pedido', () => import('./pedidos.js').then(m => m.orderForm({ producto: p.nombre, productoId: p.id, precio: p.precio })), { icon: 'plus', cls: 'sm' }) : null,
            can('productos.editar') ? btn('Editar', () => productWizard(p), { icon: 'edit', cls: 'sm' }) : null,
            can('productos.borrar') ? btn('Borrar', () => delProduct(p, closeAll), { cls: 'danger sm', icon: 'trash' }) : null)));
      PTABS[tab](body, p, orders);
    };
    res.update = draw; draw();
  });
  return res;
}
const PTABS = {
  resumen(el, p) {
    const foto = p.fotoId ? byId('archivos', p.fotoId) : null;
    mount(el, foto && foto.miniatura ? h('img', { src: foto.miniatura, alt: '', style: { width: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '12px', background: 'var(--surface-2)', cursor: 'pointer' }, onclick: () => openFile(foto) }) : null,
      h('div.facts', { style: { marginTop: '12px' } }, fact('Precio', p.precio ? eur(p.precio) : na('')), fact('Categoría', pretty(p.categoria) || na('')), fact('Subcategoría', pretty(p.subcategoria) || na('')), fact('Tipo', p.tipo || na('')),
        fact('SKU', p.sku || p.id), fact('Tallas', na(p.tallas)), fact('Color', na(p.color)), fact('Material', na(p.material)), fact('Tamaño', na(p.tamano)), fact('Peso', p.pesoG ? p.pesoG + ' g' : na('')), fact('Plataforma', na(p.plataforma)), fact('Fecha', p.fecha ? fdate(p.fecha) : na(''))),
      p.descripcion ? h('div', { style: { marginTop: '12px' } }, h('div.lbl', 'Descripción'), h('p', { style: { whiteSpace: 'pre-wrap' } }, p.descripcion)) : null,
      h('dl.kv', { style: { marginTop: '12px' } }, h('dt', 'Origen'), h('dd', [p.fuente, p.enlace].filter(Boolean).join(' · ') || h('span.na', 'No disponible')), h('dt', 'Licencia'), h('dd', na(p.licencia)), h('dt', 'Carpeta'), h('dd', p.ruta ? h('span.row', h('span.ellipsis', p.ruta), desktop.on ? btn('Abrir', () => desktop.open(p.ruta).catch(e => toast(e.message, 'bad')), { cls: 'sm', icon: 'folder' }) : null) : h('span.na', 'Sin carpeta')), h('dt', 'Creado por'), h('dd', na(p.creadoPor))),
      stockInfo(p));
  },
  precio(el, p) { mount(el, priceAssistant(p)); },
  // v10: textos listos para Vinted, Wallapop, Etsy, Instagram y TikTok + documento Word
  venta(el, p) {
    const box = h('div.col', { style: { gap: '12px' } });
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
    mount(el, box); make();
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
  pedidos(el, p, orders) {
    const valid = orders.filter(o => !CL.stateOf(S.cfg.pedidos, o.estado).cancelled);
    mount(el, h('div.facts', fact('Pedidos', String(valid.length)), fact('Unidades', String(valid.reduce((s, o) => s + (Number(o.cantidad) || 1), 0))), can('informes.ver') ? fact('Ventas', eur(valid.reduce((s, o) => s + CL.orderTotal(o), 0))) : null),
      orders.length ? h('div.list.boxed', { style: { marginTop: '12px' } }, orders.slice().reverse().map(o => h('div.item', { onclick: () => go('pedidos/' + o.id) }, h('b', 'nº ' + o.numero), h('span.grow.ellipsis', o.cliente), pill(o.estado, '', stateColor(o.estado)), h('span.small', eur(CL.orderTotal(o)))))) : h('p.muted', 'Sin pedidos todavía.'));
  },
  historial(el, p) {
    mount(el, h('p.muted', 'Cargando…'));
    api('auditoria.lista', { entidad: 'productos', entidadId: p.id }).then(r => mount(el, r.filas.length ? h('div.timeline', r.filas.map(a => h('div.tl', h('span.b'), h('div', h('div.small', h('b', a.usuario), ' ', accionTxt(a.accion)), h('div.tiny.muted', new Date(a.fecha).toLocaleString('es-ES')), a.detalle ? h('div.tiny.muted', resumenDetalle(a.detalle)) : null)))) : h('p.muted.small', 'Sin historial.'))).catch(e => mount(el, h('p.bad-t', e.message)));
  }
};
function fact(l, v) { return h('div.fact', h('div.l', l), h('div.v', v)); }
function stockInfo(p) {
  const s = S.t.stock.find(x => CL.norm(x.producto) === CL.norm(p.nombre));
  if (!s) return null;
  return h('div.card.flat', { style: { marginTop: '12px' } }, h('div.row', h('b', 'Stock (hoja Stock del Sheet)'), s.alerta ? pill(s.alerta, /rep/i.test(s.alerta) ? 'warn' : 'ok') : null), h('p.small', (s.unidades === '' ? 'Sin datos' : s.unidades + ' unidades') + (s.ubicacion ? ' · ' + s.ubicacion : '') + (s.minimo !== '' ? ' · mínimo ' + s.minimo : '')));
}
async function view3DLocal(path, name) {
  const c = h('canvas.stl-view');
  const info = h('p.small.muted', 'Cargando…');
  const m = modal(name, h('div.col', c, info, h('p.tiny.muted', 'Arrastra para girar · rueda o pellizco para acercar')), close => [btn('Cerrar', close, { cls: 'primary' })], { size: 'wide' });
  try { const v = viewer(c, await parse3D(await desktop.file(path), name)); info.textContent = v.dims.map(x => x.toFixed(1)).join(' × ') + ' mm · ' + v.triangles.toLocaleString('es-ES') + ' triángulos'; }
  catch (e) { info.textContent = 'No se pudo mostrar: ' + e.message; }
}

// ---------- Asistente de precio (usa lo que ya hay: costes, Configuración, ventas) ----------
function pricingParams() { return Object.assign({ gramosBobina: 1000 }, S.cfg.precios || {}); }
function gastosMap() { const g = {}; S.t.gastos.forEach(x => { g[CL.norm(x.nombre)] = Number(x.coste) || 0; }); return g; }
export function priceAssistant(p, costsIn, onPick) {
  const calc = p ? S.t.calculadora.find(c => c.nombre === p.nombre) : null;
  const c = Object.assign({ gramos: (calc && calc.gramos) || (p && p.pesoG) || '', horas: (calc && calc.horas) || (p && p.horas) || '', horasMO: (calc && calc.horasMO) || '', precioBobina: (calc && calc.precioBobina) || '', pintado: (calc && calc.pintado) || 'No', costePintado: (calc && calc.costePintado) || '', gasto1: (calc && calc.gasto1) || '', gasto2: (calc && calc.gasto2) || '' }, costsIn || {});
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
    h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' } }, field('Filamento (gramos)', f.gramos), field('Horas de impresión', f.horas), field('Horas de mano de obra', f.horasMO), field('Precio bobina 1 kg (€)', f.precioBobina), field('¿Pintado?', f.pintado), field('Coste del pintado (€)', f.costePintado), field('Gasto extra 1', f.gasto1), field('Gasto extra 2', f.gasto2)),
    out,
    p && can('productos.editar') && !onPick ? h('div.row', btn('Guardar costes', async () => { const { v } = calcNow(); await saveProduct(p, {}, v); }, { cls: 'sm' }), btn('Usar precio de Wallapop', async () => { const { r, v } = calcNow(); await saveProduct(p, { precio: r.recomendado.wallapop }, v); }, { cls: 'primary sm' })) : null);
  wrap.getCosts = () => { const v = {}; Object.keys(f).forEach(k => { v[k] = f[k].value; }); return v; };
  calcNow();
  return wrap;
}

// v10: al pasar a LISTO, Celebrity genera el documento de venta y lo guarda en el producto
async function changeState(p, estado) {
  await saveProduct(p, { estado });
  if (estado === 'Listo' && can('archivos.subir')) {
    try { const d = await generate(p); await saveDoc(p, d); toast('✨ Celebrity ha preparado el documento de venta (Textos de venta y Archivos)', 'ok', 6000); api('ia.registrar', { tipo: 'documento', resumen: 'Documento de venta de ' + p.nombre + ' (' + (p.sku || p.id) + ')', herramientas: ['documento'], acciones: [] }).catch(() => { }); }
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
    color: inp({ value: p.color || '' }), tamano: inp({ value: p.tamano || '', placeholder: 'Ej.: 12 × 8 cm' }), tallas: inp({ value: p.tallas || '', placeholder: 'Ej.: S, M, L, XL (si tiene)' }),
    material: sel(['', 'PLA', 'PETG', 'TPU', 'ABS', 'Resina', 'Madera', 'Otro'], p.material || 'PLA'),
    plataforma: sel(['', 'Wallapop', 'Vinted', 'Etsy', 'Instagram', 'Tienda física', 'Otro'], p.plataforma || ''),
    fuente: sel(['', 'Diseño propio', 'Descargado (gratis)', 'Comprado', 'Encargo del cliente'], p.fuente || ''),
    enlace: inp({ value: p.enlace || '', placeholder: 'https://… (Printables, Thingiverse, MakerWorld…)' }),
    licencia: inp({ value: p.licencia || '', placeholder: 'Ej.: CC BY-NC · uso comercial permitido' }),
    descripcion: area({ value: p.descripcion || '', placeholder: 'Texto para el anuncio: medidas, colores disponibles, detalles…' }),
    estado: sel(STATES, pState(p.estado)), precio: inp({ type: 'number', min: 0, step: 0.1, value: p.precio || '' })
  };
  const cCat = combo(f.categoria), cSub = combo(f.subcategoria);
  { const sh = sharedTree().map(x => x.c); if (sh.length) cats = [...new Set(sh.concat(cats))]; cCat.set(sh.length ? sh.concat(S.t.productos.map(x => x.categoria)) : cats); } loadSubs();
  f.categoria.addEventListener('change', () => { f.subcategoria.value = ''; loadSubs(); });
  const zones = { foto: dropZone('foto', { title: 'FOTO', existing: () => p.id ? filesOf('productos', p.id) : [] }), video: dropZone('video', { title: 'VÍDEO', existing: () => p.id ? filesOf('productos', p.id) : [] }), stl: dropZone('stl', { title: 'STL / 3MF', existing: () => p.id ? filesOf('productos', p.id) : [] }) };
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
        field('Color', f.color), field('Material', f.material), field('Tamaño', f.tamano), field('Tallas', f.tallas), field('Dónde se vende', f.plataforma), field('Descripción', f.descripcion, null, 'full')),
      h('details.more', { style: { marginTop: '12px' } }, h('summary', 'Origen y licencia del diseño'), h('div.in.form', field('Origen', f.fuente), field('Licencia', f.licencia), field('Enlace', f.enlace, null, 'full'))), msg);
    if (step === 1) mount(body, bar, h('h3', titles[1]), h('p.small.muted', 'Cada tipo de archivo tiene su zona. Puedes arrastrarlos, elegirlos o, en el móvil, hacer la foto o grabar el vídeo directamente.' + (desktop.on ? ' Se guardarán también en la carpeta del producto de este ordenador.' : '')),
      h('div.drops', { style: { marginTop: '12px' } }, zones.foto.el, zones.video.el, zones.stl.el), msg);
    if (step === 2) {
      if (!pa) pa = priceAssistant(p.id ? p : null, null, (v) => { f.precio.value = v; toast('Precio puesto: ' + eur(v), 'ok'); });
      mount(body, bar, h('h3', titles[2]), h('p.small.muted', 'Rellena lo que sepas: el resto (IVA, margen, luz, mano de obra, comisiones) sale de la Configuración.'),
        can('productos.costes') ? pa : h('p.muted', '🔒 No tienes permiso para ver costes.'), h('div.form', { style: { marginTop: '12px' } }, field('Precio de venta (€)', f.precio, 'Pulsa "Usar" en la tabla o escríbelo.')), msg);
    }
    mount(foot, step > 0 ? btn('Atrás', () => { step--; draw(); }) : btn('Cancelar', async () => { if (anyFiles() && !await confirmDlg('Descartar', '¿Descartar el producto y los archivos preparados?', 'Descartar', true)) return; m.close(); }), h('span.grow'),
      step < 2 ? btn('Siguiente', next, { cls: 'primary' }) : btn(isNew ? 'Crear producto' : 'Guardar', saveAll, { cls: 'primary', icon: 'check' }));
  };
  const anyFiles = () => Object.values(zones).some(z => z.items.length);
  async function next() {
    if (step === 0) {
      if (!f.nombre.value.trim()) return msg.textContent = 'Escribe el nombre del producto.';
      const dup = S.t.productos.find(x => x.id !== p.id && CL.norm(x.nombre) === CL.norm(f.nombre.value));
      if (dup) return msg.textContent = 'Ya existe un producto llamado "' + dup.nombre + '" (' + dup.id + ').';
    }
    if (step === 1) {
      if (Object.values(zones).some(z => z.busy())) return msg.textContent = 'Espera a que terminen de prepararse las vistas previas…';
      const hasStl = zones.stl.items.some(i => !i.err) || (p.id && filesOf('productos', p.id).some(a => a.tipo === 'stl'));
      if (f.tipo.value === '3D' && !hasStl && !await confirmDlgSimple('¿Sin archivo STL?', 'Es un producto 3D y no has adjuntado el STL o 3MF. Guardarlo con el producto os ahorrará buscarlo después. ¿Seguir sin él?')) return;
      if (!zones.foto.items.some(i => !i.err) && !(p.id && filesOf('productos', p.id).some(a => a.tipo === 'foto')) && !await confirmDlgSimple('¿Sin foto?', 'Una foto ayuda mucho a reconocer el producto (y a venderlo). ¿Seguir sin foto?')) return;
    }
    step++; draw();
  }
  function confirmDlgSimple(t, x) { return confirmDlg(t, x, 'Seguir sin él'); }
  async function saveAll(ev) {
    const b = ev.target.closest('button'); b.disabled = true; b.textContent = 'Guardando…';
    const datos = {}; Object.keys(f).forEach(k => { datos[k] = typeof f[k].value === 'string' ? f[k].value.trim() : f[k].value; });
    if (datos.precio === '') delete datos.precio; else datos.precio = Number(datos.precio);
    const costes = pa && can('productos.costes') ? pa.getCosts() : null;
    try {
      let prod;
      if (isNew) prod = await mutate('productos.guardar', { datos, costes }, { onlineOnly: true, label: 'Nuevo producto' });
      else { const orig = {}; Object.keys(datos).forEach(k => { orig[k] = p[k] ?? ''; }); prod = await mutate('productos.guardar', { id: p.id, datos, orig, costes }, { onlineOnly: true }); }
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
