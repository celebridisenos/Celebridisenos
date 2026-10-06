// ================= v11.3 · Anuncios con IA (asistente que no se rinde) =================
// Elige producto → el asistente analiza, detecta lo que falta y los conflictos, corrige solo lo seguro,
// vuelve a validar y deja el anuncio LISTO, o te dice EXACTAMENTE qué falta, o por qué esa plataforma no lo admite.
// La IA local (si está en el PC) solo REDACTA mejor; el validador vuelve a quitar todo lo que no sea un dato.
import { h, mount, btn, toast, eur, empty, field, inp, area, sel, pill, confirmDlg, fdt, copyText, modal, debounce } from '../ui.js';
import { S, can, api, byId, emit, pull } from '../store.js';
import { handleError, go } from '../app.js';
import { desktop } from '../desktop.js';
import { needServer } from './costes.js';

const CL = window.CL, LST = window.LST;
const PLATS = [['etsy', 'Etsy'], ['wallapop', 'Wallapop'], ['vinted', 'Vinted'], ['general', 'General / tienda propia']];
const EST_CLS = { listo: 'ok', requiere_datos: 'warn', no_apto: 'bad' };
const NIVEL = { no_apto: ['⛔', 'No apto', 'bad'], falta: ['❓', 'Falta', 'warn'], conflicto: ['⚠️', 'Posible conflicto', 'warn'], pi: ['©️', 'Revisar propiedad intelectual', 'warn'], aviso: ['ℹ️', 'Aviso', ''] };
const ORIG = { usuario: ['TU DATO', 'ok'], producto: ['FICHA', ''], pendiente: ['PENDIENTE', 'bad'], sugerida: ['SUGERIDA', 'warn'] };
const acfg = () => (S.cfg && S.cfg.anuncios) || {};
const estOf = a => a && a.datos && a.datos.anuncio ? a.datos.anuncio.estado : '';

export function render(el, params) {
  if (needServer(el, '11.3.0')) return {};
  if (params[0]) return assistant(el, params[0], params[1] || acfg().plataforma || 'etsy');
  const list = S.t.anuncios || [];
  const prods = (S.t.productos || []).slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  const pick = sel([{ v: '', t: '— Elige un producto —' }].concat(prods.map(p => ({ v: p.id, t: p.nombre + ' · ' + (p.sku || p.id) }))), '');
  const plat = sel(PLATS.map(([v, t]) => ({ v, t })), acfg().plataforma || 'etsy');
  mount(el, h('div.page-head', h('div', h('h1', '🪄 Anuncios con IA'), h('div.muted.small', 'Prepara anuncios listos para Etsy, Wallapop o Vinted con los datos reales del producto. Nunca inventa: lo que falta te lo pregunta.'))),
    // v13.10: lo sencillo primero — una pregunta y sale una descripción corta
    h('div.card.dq-card', h('div.row.wrap', { style: { gap: '10px', alignItems: 'center' } }, h('div.grow', h('h3', { style: { margin: 0 } }, '✨ Descripción rápida'), h('p.small.muted', { style: { margin: '2px 0 0' } }, '¿Qué vas a vender? Escríbelo (y añade la foto si quieres) y sale una descripción corta al momento.')),
      btn('✨ Crear descripción', () => import('../descripcion.js').then(D => D.rapida()), { cls: 'primary' }))),
    (() => { const box = h('div', { style: { marginTop: '12px' } }); import('../consejos.js').then(C => box.append(C.tarjetaConsejo())); return box; })(), // v13.10: consejos por plataforma
    can('productos.editar') ? h('details.more', h('summary', 'Asistente completo por plataforma (avanzado)'), h('div.in', h('div.card', h('h3', 'CREAR ANUNCIO CON IA'), h('div.row.wrap', { style: { gap: '10px' } }, h('div.grow', { style: { minWidth: '260px' } }, pick), plat,
      btn('Empezar', () => { if (!pick.value) return toast('Elige un producto', 'warn'); go('anuncios/' + pick.value + '/' + plat.value); }, { cls: 'primary', icon: 'sparkles' }))))) : null,
    list.length ? h('div.table-wrap', { style: { marginTop: '14px' } }, h('table.t', h('thead', h('tr', h('th', 'Producto'), h('th', 'Plataforma'), h('th', 'Estado'), h('th.hide-m', 'Título'), h('th.hide-m', 'Versión'), h('th.hide-m', 'Publicado'))),
      h('tbody', list.slice().sort((a, b) => String(b.actualizado).localeCompare(String(a.actualizado))).map(a => h('tr', { onclick: () => go('anuncios/' + a.productoId + '/' + a.plataforma), style: { cursor: 'pointer' } },
        h('td.bold', a.producto), h('td', (PLATS.find(x => x[0] === a.plataforma) || [0, a.plataforma])[1]), h('td', pill(a.estado, EST_CLS[estOf(a)])), h('td.hide-m.small', a.titulo), h('td.hide-m', 'v' + a.version), h('td.hide-m.small', a.publicado ? fdt(a.publicado) : '—')))))) :
      h('div', { style: { marginTop: '14px' } }, empty('sparkles', 'Todavía no hay anuncios', 'Elige un producto arriba y pulsa Empezar.', null)));
  return {};
}

// ---------- Entrada del asistente: lo mismo que usa el servidor, con los datos de este dispositivo ----------
function clientInput(p, entrada, visual) {
  const data = { materiales: S.t.materiales || [], embalajes: S.t.embalajes || [], recetas: S.t.recetas || [] }, pp = S.cfg.precios || {};
  const c = CL.productCost(p.id, data, pp), pr = c.total === null ? null : CL.costPricing(c.total, pp, null, p.plataforma);
  const fotos = (S.t.archivos || []).filter(a => a.entidad === 'productos' && a.entidadId === p.id && (a.tipo === 'foto' || /^image\//.test(a.mime || '')));
  let caja = '', emb = '', gramos = 0;
  CL.bomOf(p.id, data).forEach(l => {
    const m = byId('materiales', l.materialId);
    if (m && m.tipo === 'filamento') gramos += CL.convertUnit(l.cantidad, l.unidad || m.unidad, { unidad: 'g' }) || 0;
    if (!/^emb:/.test(String(l.materialId))) return;
    const e = byId('embalajes', l.materialId.slice(4)); if (!e) return; emb = e.nombre;
    (e.lineas || []).forEach(x => { const b = byId('materiales', x.materialId); if (b && b.tipo === 'caja' && !caja) caja = [b.largo, b.ancho, b.alto].map(v => v === '' || v == null ? '¿?' : v).join(' × ') + ' cm'; });
  });
  let stock = null;
  try { const x = CL.stockLevels({ productos: S.t.productos, stock: S.t.stock, fabricacion: S.t.fabricacion || [], pedidos: S.t.pedidos }, S.cfg.pedidos).of(p.nombre); if (x && x.controlado) stock = x.disponible; } catch (e) { }
  return { input: { id: p.id, sku: p.sku || p.id, nombre: p.nombre, categoria: p.categoria, subcategoria: p.subcategoria, material: p.material, color: p.color, tamano: p.tamano, pesoG: p.pesoG, tallas: p.tallas, horas: p.horas,
    descripcion: p.descripcion, licencia: p.licencia, fuente: p.fuente, precio: p.precio, plataforma: p.plataforma, gramos: gramos ? Math.round(gramos) : '', imagenes: fotos.map(a => ({ id: a.id, nombre: a.nombre })),
    coste: c.tieneReceta ? { coste: c.total, estado: c.estado, equilibrio: pr ? pr.equilibrio : null, objetivo: pr ? pr.objetivo : null } : {}, caja, embalaje: emb, entrada, visual }, stock, fotos };
}

function assistant(el, productoId, plataforma) {
  const p = byId('productos', productoId);
  if (!p) { mount(el, empty('alert', 'Ese producto ya no existe', '', btn('Volver', () => go('anuncios')))); return {}; }
  const saved = (S.t.anuncios || []).find(a => a.productoId === p.id && a.plataforma === plataforma);
  const E = JSON.parse(JSON.stringify((saved && saved.datos && saved.datos.entrada) || {}));
  let visual = [], L = null, iaNota = '';
  const left = h('div.col', { style: { gap: '12px' } }), right = h('div.col', { style: { gap: '12px' } });
  const platSel = sel(PLATS.map(([v, t]) => ({ v, t })), plataforma);
  platSel.onchange = () => go('anuncios/' + p.id + '/' + platSel.value);
  mount(el, h('div.page-head', h('div', h('h1', '🪄 Anuncio: ' + p.nombre), h('div.muted.small', 'SKU ' + (p.sku || p.id) + (saved ? ' · versión ' + saved.version + ' guardada el ' + fdt(saved.actualizado) : ' · sin guardar todavía'))),
    h('div.row.wrap', platSel, btn('Volver', () => go('anuncios'), { cls: 'ghost' }))),
    h('div.ann-grid', left, right));

  const set = (k, v) => { if (v === '' || v === undefined || v === null) delete E[k]; else E[k] = v; rerun(); };
  const rerun = debounce(() => { analyze(); drawRight(); }, 150);
  const analyze = () => { const ci = clientInput(p, E, visual); L = LST.analyze(ci.input, { plataforma: platSel.value, cfg: acfg(), envioCfg: { preparacion: '' }, stock: ci.stock }); return L; };

  // ---- Columna izquierda: datos (solo lo que sabes; lo demás queda PENDIENTE) ----
  const inputF = (k, label, hint, attrs) => { const i = inp(Object.assign({ value: E[k] ?? '' }, attrs || {})); i.oninput = () => set(k, i.value.trim()); return field(label, i, hint); };
  const selectF = (k, label, opts, hint) => { const s = sel([{ v: '', t: '—' }].concat(opts), E[k] ?? ''); s.onchange = () => { set(k, s.value); drawLeft(); }; return field(label, s, hint); };
  const drawLeft = () => {
    const cats = LST.categories(acfg()), ci = clientInput(p, E, visual), L0 = L || analyze();
    const cat = cats.find(c => c.k === L0.categoriaK) || cats[cats.length - 1];
    const tipo = E.tipo || '';
    const usados = ['segunda_mano', 'vintage', 'reacondicionado', 'coleccionable', 'nuevo_reventa'].includes(tipo);
    const fichaVal = k => ({ material: p.material, color: p.color, medidas: p.tamano, peso: p.pesoG, tallas: p.tallas, horas: p.horas, gramos: ci.input.gramos }[k]);
    mount(left,
      h('div.card', h('h3', '1 · ¿Qué es?'), selectF('tipo', '¿Quién lo hizo?', LST.TIPOS.map(t => ({ v: t.k, t: t.t })), 'Decide en qué plataformas se puede vender. No se cambia para «colarlo».'),
        usados ? selectF('condicion', 'Estado del artículo', LST.CONDICIONES.map(c => ({ v: c, t: c }))) : null,
        tipo === 'disenado_socio' ? inputF('socioProduccion', 'Socio de producción', 'Quién lo fabrica y dónde (Etsy lo exige)') : null,
        tipo === 'fabricado' ? inputF('autorDiseno', 'Autor del diseño', 'Para la atribución que pida su licencia') : null,
        selectF('disenoIA', '¿El diseño se hizo con IA?', [{ v: 'si', t: 'Sí (se indicará en el anuncio)' }, { v: 'no', t: 'No' }])),
      h('div.card', h('h3', '2 · Categoría y datos'), selectF('categoriaAnuncio', 'Categoría', cats.map(c => ({ v: c.t, t: c.t })), 'Sugerida: ' + L0.categoria + (L0.categoriaOrigen === 'sugerida' ? ' (por el nombre: confírmala)' : '')),
        h('div.form', cat.campos.filter(k => !['medidas'].includes(k)).map(k => inputF(k, LST.CAMPOS[k] + ((cat.req || []).includes(k) ? ' *' : ''), fichaVal(k) ? 'En la ficha: ' + fichaVal(k) + ' (si lo escribes aquí, manda esto)' : 'Si no lo sabes, déjalo vacío: quedará PENDIENTE', { placeholder: fichaVal(k) ? String(fichaVal(k)) : '' }))),
        h('div.form', inputF('largo', 'Largo (cm)', null, { type: 'number', step: 'any' }), inputF('ancho', 'Ancho (cm)', null, { type: 'number', step: 'any' }), inputF('alto', 'Alto (cm)', p.tamano ? 'En la ficha: ' + p.tamano : 'Mídelo: no se inventa', { type: 'number', step: 'any' })),
        field('Características (una por línea)', (() => { const a = area({ value: E.caracteristicas || '', rows: 3 }); a.oninput = () => set('caracteristicas', a.value); return a; })())),
      h('div.card', h('h3', '3 · Precio y cantidad'), pricingBox(ci.input.coste, p, v => { set('precio', v); drawLeft(); }),
        h('div.form', inputF('precio', 'Precio de venta (€)', p.precio ? 'En la ficha: ' + eur(p.precio) : 'Del coste o escrito por ti; nunca inventado', { type: 'number', step: '0.01', placeholder: p.precio || '' }), inputF('cantidad', 'Cantidad disponible', ci.stock !== null ? 'Stock disponible: ' + ci.stock : 'Bajo pedido: cuántos aceptas a la vez', { type: 'number', min: 1, step: 1, placeholder: ci.stock ?? '' }))),
      h('div.card', h('h3', '4 · Envío'), h('div.form', inputF('preparacion', 'Días de preparación', 'Días laborables hasta enviarlo', { type: 'number', min: 0, step: 1 }), inputF('pesoPaquete', 'Peso del paquete (g)', p.pesoG ? 'Artículo: ' + p.pesoG + ' g (+ embalaje: pésalo)' : 'Pésalo'),
        inputF('medidasPaquete', 'Medidas del paquete', ci.input.caja ? 'Caja del embalaje «' + ci.input.embalaje + '»: ' + ci.input.caja : 'Elige un embalaje en la receta o escríbelas', { placeholder: ci.input.caja || 'Ej.: 30 × 20 × 12 cm' }), inputF('perfilEnvio', 'Perfil / transportista'))),
      h('div.card', h('h3', '5 · Derechos'), selectF('licenciaMarca', '¿Tienes licencia de las marcas o personajes que aparecen?', [{ v: 'si', t: 'Sí, tengo licencia/permiso por escrito' }, { v: 'no', t: 'No' }], 'Solo si el producto usa una marca, logo o personaje ajeno.'),
        p.licencia ? selectF('licenciaComercial', 'El diseño tiene licencia «' + p.licencia + '». ¿Tienes permiso comercial aparte?', [{ v: 'si', t: 'Sí, por escrito' }, { v: 'no', t: 'No' }]) : null,
        h('p.tiny.muted', 'Origen del diseño en la ficha: ' + ([p.fuente, p.licencia].filter(Boolean).join(' · ') || 'no consta'))));
  };
  // ---- Columna derecha: resultado ----
  const drawRight = () => {
    const r = L || analyze(), rl = r.reglas, fotosN = r.fotos;
    const tit = inp({ value: r.titulo }), cnt = h('span.tiny.muted', r.titulo.length + (rl.tituloMax ? ' / ' + rl.tituloMax : '') + ' caracteres');
    tit.onchange = () => set('titulo', tit.value);
    const dc = area({ value: r.descCorta, rows: 2 }); dc.onchange = () => set('descCorta', dc.value);
    const dl = area({ value: r.descripcion, rows: 12, style: { fontFamily: 'inherit' } }); dl.onchange = () => set('descripcion', dl.value);
    const tg = inp({ value: r.etiquetas.join(', ') }); tg.onchange = () => set('etiquetas', tg.value.split(',').map(x => x.trim()).filter(Boolean));
    const group = lv => r.problemas.filter(x => x.nivel === lv);
    mount(right,
      h('div.card.ann-state.' + EST_CLS[r.estado], h('div.row.wrap', h('b.grow', { style: { fontSize: '20px' } }, r.estadoTexto), pill(r.plataformaT)),
        h('div.small', r.iteraciones + ' vuelta(s) de comprobación · ' + r.correcciones.length + ' corrección(es) automática(s) · ' + r.checklist.filter(c => c.ok).length + '/' + r.checklist.length + ' puntos OK'),
        r.estado === 'requiere_datos' ? h('div.small', 'Falta tu confirmación en ' + r.preguntas.length + ' punto(s): abajo te digo exactamente cuáles.') : null,
        iaNota ? h('div.tiny', iaNota) : null),
      ['no_apto', 'falta', 'conflicto', 'pi', 'aviso'].map(lv => group(lv).length ? h('div.card', h('h4', NIVEL[lv][0] + ' ' + NIVEL[lv][1] + ' (' + group(lv).length + ')'),
        h('div.list', group(lv).map(x => h('div.item', { style: { cursor: 'default', alignItems: 'flex-start' } }, h('div.grow', h('div.small', x.texto), x.queHacer ? h('div.tiny.muted', '→ ' + x.queHacer) : null))))) : null),
      r.correcciones.length ? h('details.card', h('summary', '🛠️ Corregido solo (' + r.correcciones.length + ')'), h('ul.small', r.correcciones.map(c => h('li', c)))) : null,
      h('div.card.col', { style: { gap: '8px' } }, h('h4', 'Textos'), field('Título', tit), cnt, field('Resumen', dc), field('Descripción completa', dl), rl.etiquetasMax ? field('Etiquetas (' + r.etiquetas.length + '/' + rl.etiquetasMax + ', máx. ' + rl.etiquetaMaxLen + ' caracteres)', tg) : null,
        h('div.row.wrap', desktop.on ? btn('Mejorar la redacción con IA local', ev => improve(ev.target.closest('button')), { cls: 'sm', icon: 'sparkles' }) : h('span.tiny.muted', 'La redacción con IA se hace en el programa del PC.'),
          desktop.on && fotosN ? btn('Analizar fotos con IA', ev => vision(ev.target.closest('button')), { cls: 'sm ghost', icon: 'image' }) : null,
          Object.keys(E).some(k => ['titulo', 'descCorta', 'descripcion', 'etiquetas'].includes(k)) ? btn('Volver a los textos automáticos', () => { ['titulo', 'descCorta', 'descripcion', 'etiquetas'].forEach(k => delete E[k]); iaNota = ''; rerun(); }, { cls: 'sm ghost' }) : null)),
      h('div.card', h('h4', 'Atributos de «' + r.categoria + '»'), h('div.list', r.atributos.map(a => h('div.item', { style: { cursor: 'default' } }, h('span.grow.small', h('b', a.t + (a.obligatorio ? ' *' : '') + ': '), a.v || h('span.warn-t', 'PENDIENTE')), pill(...(ORIG[a.origen] || ORIG.producto))))),
        r.visual.length ? h('div', { style: { marginTop: '8px' } }, r.visual.map(v => h('div.small', pill('INFERENCIA VISUAL', 'warn'), ' ' + (LST.CAMPOS[v.campo] || v.campo) + ': ' + v.valor))) : null),
      Object.keys(r.campos || {}).length ? h('div.card', h('h4', 'Campos de ' + r.plataformaT), h('dl.kv', Object.entries(r.campos).flatMap(([k, v]) => [h('dt', ({ quienLoHizo: 'Quién lo hizo', queEs: 'Qué es', cuandoSeHizo: 'Cuándo se hizo', categoriaCreatividad: 'Tipo según sus normas', socioProduccion: 'Socio de producción', personalizacion: 'Personalización', materiales: 'Materiales' })[k] || k), h('dd', (Array.isArray(v) ? v.join(', ') : v) || h('span.warn-t', 'PENDIENTE'))])),
        h('p.tiny.muted', 'Reglas de ' + r.plataformaT + ': ' + (rl.fuente || '—') + (rl.revisado ? ' · revisadas el ' + rl.revisado : '') + '. Se cambian en Configuración → Anuncios si la plataforma las actualiza.')) : null,
      h('div.card', h('h4', 'Envío y precio'), h('dl.kv', h('dt', 'Peso'), h('dd', r.envio.pesoPaquete ? r.envio.pesoPaquete + ' g (paquete)' : r.envio.pesoArticulo ? r.envio.pesoArticulo + ' g (artículo; falta el del paquete)' : h('span.warn-t', 'PENDIENTE')),
        h('dt', 'Paquete'), h('dd', r.envio.medidasPaquete || h('span.warn-t', 'PENDIENTE')), h('dt', 'Preparación'), h('dd', r.envio.preparacion ? r.envio.preparacion + ' día(s)' : h('span.warn-t', 'PENDIENTE')),
        h('dt', 'Precio'), h('dd', r.precio.venta !== null ? eur(r.precio.venta) + ' (' + (r.precio.origen === 'usuario' ? 'escrito por ti' : 'de la ficha') + ')' : h('span.warn-t', 'PENDIENTE')),
        h('dt', 'Coste real'), h('dd', r.precio.coste !== null && r.precio.coste !== undefined ? eur(r.precio.coste) + (r.precio.costeEstado && r.precio.costeEstado !== 'confirmado' ? ' (' + r.precio.costeEstado.toUpperCase() + ')' : '') : 'sin receta de costes'),
        h('dt', 'SKU'), h('dd', r.sku || h('span.warn-t', 'PENDIENTE')), h('dt', 'Cantidad'), h('dd', r.cantidad !== '' ? String(r.cantidad) : h('span.warn-t', 'PENDIENTE')), h('dt', 'Fotos'), h('dd', fotosN + ' foto(s)'))),
      h('div.card', h('h4', '✅ Comprobación antes de publicar'), h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '4px' } }, r.checklist.map(c => h('div.small', (c.ok ? '✅ ' : '❌ ') + c.t)))),
      h('div.row.wrap', can('productos.editar') ? btn('Guardar versión', save, { cls: 'primary', icon: 'save' }) : null, btn('Copiar para pegar', () => copyText(LST.asText(r)), { icon: 'copy' }),
        saved && can('productos.editar') ? btn('Marcar como publicado', publish, { cls: r.estado === 'listo' ? 'ghost' : 'ghost', disabled: r.estado !== 'listo', title: r.estado !== 'listo' ? 'Solo cuando esté LISTO' : '' }) : null,
        saved ? btn('Versiones', versions, { cls: 'ghost', icon: 'history' }) : null));
  };
  async function save() {
    try {
      const res = await api('anuncios.guardar', { productoId: p.id, plataforma: platSel.value, entrada: E, visual, version: saved ? saved.version : undefined }, { timeout: 120000 });
      toast('Guardado (versión ' + res.anuncio.version + '): ' + res.resultado.estadoTexto, res.resultado.estado === 'listo' ? 'ok' : 'warn', 5000);
      await pull(); emit(); go('anuncios/' + p.id + '/' + platSel.value);
    } catch (e) { handleError(e); }
  }
  async function publish() {
    const url = inp({ placeholder: 'https://www.etsy.com/listing/…' });
    modal('Marcar como publicado', h('div', field('Enlace del anuncio (opcional)', url, 'Empieza por https://')), close => [btn('Cancelar', close), btn('Marcar', async () => { try { await api('anuncios.publicado', { id: saved.id, url: url.value.trim() }); toast('Marcado como publicado', 'ok'); close(); await pull(); emit(); } catch (e) { handleError(e); } }, { cls: 'primary' })], { size: 'narrow' });
  }
  function versions() {
    const hs = (S.t.anunciosHist || []).filter(x => x.anuncioId === saved.id).sort((a, b) => b.version - a.version);
    let mm = null;
    mm = modal('Versiones del anuncio', h('div.list', hs.map(x => h('div.item', { style: { cursor: 'default' } }, h('b', 'v' + x.version), h('div.grow', h('div.small', x.titulo), h('div.tiny.muted', fdt(x.fecha) + ' · ' + x.usuario + ' · ' + x.estado + ' · ' + (x.precio !== '' ? eur(x.precio) : 'sin precio') + (x.motivo ? ' · ' + x.motivo : ''))),
      x.version !== saved.version && can('productos.editar') ? btn('Volver a esta', async () => { if (!await confirmDlg('Volver a la versión ' + x.version, 'Se crea una versión nueva con su contenido y se vuelve a validar con las reglas de hoy.', 'Volver')) return; try { await api('anuncios.restaurar', { id: saved.id, version: x.version }); toast('Restaurada', 'ok'); mm && mm.close(); await pull(); emit(); go('anuncios/' + p.id + '/' + platSel.value); } catch (e) { handleError(e); } }, { cls: 'sm' }) : h('span.tiny.muted', x.version === saved.version ? 'actual' : '')))),
      close => [btn('Cerrar', close)], { size: 'wide' });
  }
  // ---- IA local: redacta mejor, pero solo con los datos (y el validador vuelve a pasar) ----
  async function aiModel() { const st = await desktop.iaEstado(); return st; }
  async function improve(b) {
    b.disabled = true; const old = b.textContent; b.textContent = 'Redactando…';
    try {
      const st = await aiModel();
      const model = (st.modelos || []).map(m => m.nombre).find(n => !/embed|vl|vision|llava/i.test(n));
      if (!model) throw new Error('No hay modelo de texto en la IA local (Configuración → IA local).');
      const r = L || analyze(), F = LST.facts(clientInput(p, E, visual).input).v;
      const sys = 'Eres redactor de anuncios en español. REGLAS: usa SOLO los DATOS. No añadas medidas, marcas, materiales, colores, garantías, certificaciones, envío gratis, superlativos ni nada que no esté en DATOS. Si falta un dato, no lo menciones. Describe el PRODUCTO (qué es, características, materiales, uso, detalles y acabado) de forma profesional y atractiva; no hables de quién lo ha hecho: nada de «he creado», «he fabricado», «he diseñado» ni «fabricado por nosotros». No escribas en mayúsculas. Título de máximo ' + (r.reglas.tituloMax || 120) + ' caracteres, natural y sin repetir palabras. Responde SOLO un JSON {"titulo":"…","descCorta":"…","descripcion":"…"}.';
      const user = 'DATOS: ' + JSON.stringify(F) + '\nTIPO: ' + (LST.TIPOS.find(t => t.k === E.tipo) || {}).t + '\nCATEGORÍA: ' + r.categoria + '\nBORRADOR ACTUAL:\nTítulo: ' + r.titulo + '\nResumen: ' + r.descCorta + '\nDescripción:\n' + r.descripcion;
      let out = '';
      await desktop.iaChat({ model, stream: true, think: false, format: 'json', options: { temperature: 0.4, num_ctx: 6144, num_predict: 900 }, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }, ch => { if (ch.message && ch.message.content) out += ch.message.content; });
      let j; try { j = JSON.parse(out.replace(/<think>[\s\S]*?<\/think>/g, '').trim()); } catch (e) { throw new Error('La IA no devolvió un formato válido. Prueba otra vez.'); }
      const base = LST.brandsIn(JSON.stringify(F), acfg()), rech = [];
      ['titulo', 'descCorta', 'descripcion'].forEach(k => {
        const v = String(j[k] || '').trim(); if (!v) return;
        const extra = LST.brandsIn(v, acfg()).filter(x => !base.includes(x));
        if (extra.length) { rech.push(k + ' (mencionaba ' + extra.join(', ') + ')'); return; }
        E[k] = v;
      });
      iaNota = '🪄 Redactado con ' + model + ' y revisado por el validador' + (rech.length ? ' · descartado: ' + rech.join('; ') : '') + '.';
      analyze(); drawRight();
    } catch (e) { toast(e.message, 'bad'); }
    b.disabled = false; b.textContent = old;
  }
  async function vision(b) {
    b.disabled = true;
    try {
      const st = await aiModel();
      const vis = (st.modelos || []).find(m => /qwen2\.5vl|llava|gemma3|minicpm-v|llama3\.2-vision/i.test(m.nombre));
      if (!vis) throw new Error('Para analizar fotos descarga el modelo «Leer imágenes» en Configuración → IA local.');
      const foto = clientInput(p, E, visual).fotos.find(a => a.miniatura);
      if (!foto) throw new Error('Las fotos de este producto no tienen miniatura.');
      let out = '';
      await desktop.iaChat({ model: vis.nombre, stream: true, format: 'json', options: { temperature: 0 }, messages: [{ role: 'user', content: 'Describe SOLO lo que se ve. JSON: {"color_principal":"","objeto":"","texto_visible":"","marcas_o_logos":""}. Vacío si no se ve claro.', images: [foto.miniatura.split(',')[1]] }] }, ch => { if (ch.message && ch.message.content) out += ch.message.content; });
      const j = JSON.parse(out.replace(/<think>[\s\S]*?<\/think>/g, '').trim());
      visual = [['color', j.color_principal], ['objeto', j.objeto], ['texto', j.texto_visible], ['marca', j.marcas_o_logos]].filter(x => x[1] && String(x[1]).trim()).map(x => ({ campo: x[0], valor: String(x[1]).trim().slice(0, 120) }));
      toast(visual.length ? visual.length + ' observación(es) de la foto: quedan como INFERENCIA VISUAL' : 'La foto no aporta nada claro', 'ok');
      analyze(); drawRight();
    } catch (e) { toast(e.message, 'bad'); }
    b.disabled = false;
  }
  analyze(); drawLeft(); drawRight();
  return {};
}
function pricingBox(cost, p, use) {
  if (!cost || cost.coste === undefined) return h('p.small.muted', 'Sin receta de costes: el precio lo decides tú (Materiales y costes te ayuda a saber el coste real).');
  return h('div.facts', { style: { marginBottom: '8px' } }, h('div.fact', h('div.l', 'Coste real'), h('div.v', cost.coste === null ? 'PENDIENTE' : eur(cost.coste))),
    h('div.fact', h('div.l', 'Equilibrio'), h('div.v', cost.equilibrio ? eur(cost.equilibrio) : '—')),
    h('div.fact', h('div.l', 'Con margen objetivo'), h('div.v', cost.objetivo ? eur(cost.objetivo) : '—'), cost.objetivo ? btn('Usar', () => use(cost.objetivo), { cls: 'sm ghost' }) : null));
}

// Botón desde la ficha del producto
export function openForProduct(p) { go('anuncios/' + p.id + '/' + (acfg().plataforma || 'etsy')); }
