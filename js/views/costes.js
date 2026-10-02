// ================= v11.3 · Materiales y costes =================
// Apuntas cada material UNA vez (lo que pagaste y lo que trae) y el programa hace las cuentas:
// coste por g / m / m² / unidad, embalajes, recetas de producto y coste real de cada pieza.
// PENDIENTE = falta un dato (no se inventa) · ESTIMADO/ORIENTATIVO = no es tu precio real todavía.
import { h, mount, btn, modal, toast, eur, empty, field, inp, area, sel, pill, confirmDlg, fdt } from '../ui.js';
import { S, can, api, upsertLocal, emit, byId, pull } from '../store.js';
import { handleError, requestAccess, go } from '../app.js';

const CL = window.CL;
const pp = () => (S.cfg && S.cfg.precios) || {};
const data = () => ({ materiales: S.t.materiales || [], embalajes: S.t.embalajes || [], recetas: S.t.recetas || [] });
const CONF_CLS = { confirmado: 'ok', importado: '', calculado: '', estimado: 'warn', orientativo: 'warn', revisar: 'bad', pendiente: 'bad' };
const CONF_HELP = { confirmado: 'Dato tuyo, real', importado: 'Venía de otro sitio (revísalo una vez)', calculado: 'Lo ha calculado el programa', estimado: 'Aproximado: confírmalo cuando puedas', orientativo: 'Precio de referencia, NO es el tuyo', revisar: 'Hay algo raro: revísalo', pendiente: 'Falta el dato: no se puede calcular' };
export const confPill = e => h('span', { title: CONF_HELP[e] || '' }, pill(CL.CONF_TXT[e] || e || '—', CONF_CLS[e]));
const TIPOS = [['material', 'Material'], ['filamento', 'Filamento'], ['componente', 'Componente'], ['caja', 'Caja'], ['embalaje', 'Embalaje'], ['otro', 'Otro']];
const TIPO_TXT = Object.fromEntries(TIPOS);
const UNIT_OPTS = [['ud', 'unidades'], ['g', 'gramos (g)'], ['kg', 'kilos (kg)'], ['m', 'metros (m)'], ['cm', 'centímetros (cm)'], ['mm', 'milímetros (mm)'], ['m2', 'metros cuadrados (m²)'], ['cm2', 'cm²'], ['ml', 'mililitros (ml)'], ['l', 'litros (l)']];
const CONF_OPTS = CL.CONF.map(k => ({ v: k, t: CL.CONF_TXT[k] + ' · ' + CONF_HELP[k] }));
const e4 = x => x === null || x === undefined ? '—' : (Math.round(x * 10000) / 10000).toLocaleString('es-ES', { maximumFractionDigits: 4 }) + ' €';
const editor = () => can('costes.editar');
const activos = () => (S.t.materiales || []).filter(m => CL.norm(m.activo) !== 'no');
const after = async r => { try { await pull(); } catch (e) { } emit(); return r; };
const call = async (a, d, okMsg) => { try { const r = await api(a, d, { timeout: 120000 }); if (okMsg) toast(okMsg, 'ok'); await after(r); return r; } catch (e) { handleError(e); throw e; } };

// v11.3: estas funciones necesitan el servidor de Google 11.3 o posterior
export function needServer(el, v) {
  const cur = String((S.cfg && S.cfg.version) || '0').split('.').map(Number), want = v.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((cur[i] || 0) > want[i]) return false; if ((cur[i] || 0) < want[i]) break; if (i === 2) return false; }
  mount(el, h('div.card', h('h3', '⏳ Falta actualizar el servidor de Google'), h('p', 'Esta parte necesita el servidor ' + v + ' y el vuestro es el ' + ((S.cfg && S.cfg.version) || '?') + '.'),
    h('p.small.muted', 'Pega el archivo Servidor.gs nuevo en Apps Script y pulsa Implementar → Gestionar implementaciones → Editar → Versión nueva (lo explica paso a paso el LEEME de la versión). No se pierde nada.')));
  return true;
}

export function render(el, params) {
  if (needServer(el, '11.3.0')) return {};
  if (!can('productos.costes')) { mount(el, h('div.card', h('h3', '🔒 Materiales y costes'), h('p.muted', 'Necesitas el permiso «Ver costes y márgenes».'))); return {}; }
  let tab = params[0] || 'materiales';
  const body = h('div');
  const tabs = h('div.tabs');
  el.append(h('div.page-head', h('div', h('h1', '🧮 Materiales y costes'), h('div.muted.small', 'Apunta cada material una vez. El programa calcula el coste de cada embalaje y de cada producto, y por qué cuesta lo que cuesta.'))), tabs, body);
  const T = { materiales: 'Materiales', embalajes: 'Embalajes', productos: 'Coste de productos', historial: 'Historial de precios', gastos: 'Gastos extra' };
  const draw = () => {
    mount(tabs, Object.keys(T).map(k => h('button' + (tab === k ? '.on' : ''), { onclick: () => { tab = k; history.replaceState(null, '', '#/costes/' + k); draw(); } }, T[k])));
    if (tab === 'gastos') { mount(body); import('./gastos.js').then(G => { if (tab === 'gastos') G.render(body); }); return; } // v11.5: los gastos extra, dentro de Costes
    ({ materiales: drawMats, embalajes: drawEmbs, productos: drawProds, historial: drawHist })[tab](body);
  };
  draw();
  return { update: draw };
}

// ---------- Materiales ----------
function drawMats(el) {
  const all = S.t.materiales || [];
  const q = inp({ placeholder: 'Buscar material…', 'aria-label': 'Buscar material' });
  const list = h('div');
  const actions = editor() ? h('div.row.wrap', btn('NUEVO MATERIAL', () => matForm({ tipo: 'material' }), { cls: 'primary', icon: 'plus' }), btn('NUEVO COMPONENTE', () => matForm({ tipo: 'componente', unidad: 'ud' }), { icon: 'plus' }),
    btn('NUEVA CAJA', () => matForm({ tipo: 'caja', unidad: 'ud', cantidad: 1 }), { icon: 'plus' }), btn('NUEVO EMBALAJE', () => matForm({ tipo: 'embalaje' }), { icon: 'plus' }),
    btn('NUEVO FILAMENTO', () => matForm({ tipo: 'filamento', unidad: 'g' }), { icon: 'plus' })) : null;
  const pend = all.filter(m => CL.norm(m.activo) !== 'no' && CL.matCost(m).estado === 'pendiente');
  const seed = editor() && (!all.length || !all.some(m => m.estadoPrecio === 'orientativo')) ? h('div.card.flat', { style: { marginBottom: '12px' } },
    h('b', all.length ? 'Biblioteca orientativa' : 'Empieza en un clic'),
    h('p.small.muted', all.length ? 'Añade la lista de componentes y embalajes habituales con precios bajos de referencia, marcados como ORIENTATIVO (no son tus precios).' : 'Carga TUS precios actuales (caja 0,99 €, papel kraft 3,70 €/5 m, burbuja 3,80 €/5 m, etiquetas 19 €/500, cinta 1,50 €, bobina 10 €). Lo que no sabemos (alto de la caja, largo de la cinta, peso de la bobina) queda PENDIENTE para que lo apuntes. Si quieres, añade también la lista ORIENTATIVA de componentes.'),
    h('div.row.wrap', !all.length ? btn('Cargar mis precios', () => call('materiales.semilla', { mios: true }, 'Biblioteca cargada'), { cls: 'primary' }) : null,
      btn(all.length ? 'Añadir la lista orientativa' : 'Mis precios + lista orientativa', () => call('materiales.semilla', { mios: true, orientativos: true }, 'Biblioteca cargada'), { cls: all.length ? 'ghost' : '' }))) : null;
  const drawList = () => {
    const rows = all.filter(m => !q.value || CL.matches([m.nombre, m.categoria, m.marca, m.proveedor, m.referencia, TIPO_TXT[m.tipo]].join(' '), q.value));
    if (!all.length) return mount(list, empty('box', 'Todavía no hay materiales', 'Carga tus precios con el botón de arriba o crea el primero.', null));
    const groups = {};
    rows.forEach(m => { const g = TIPO_TXT[m.tipo] || 'Otro'; (groups[g] = groups[g] || []).push(m); });
    mount(list, Object.keys(groups).map(g => h('div.card', { style: { marginBottom: '12px' } }, h('h3', { style: { marginBottom: '8px' } }, g + ' (' + groups[g].length + ')'),
      h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'Nombre'), h('th', 'Lo que pagaste'), h('th', 'Coste por unidad'), h('th.hide-m', 'Precio'), h('th.hide-m', 'Cantidad'), h('th.hide-m', 'Proveedor'))),
        h('tbody', groups[g].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es')).map(m => {
          const c = CL.matCost(m), off = CL.norm(m.activo) === 'no';
          return h('tr', { onclick: () => matForm(m), style: { cursor: 'pointer', opacity: off ? 0.5 : 1 } },
            h('td', h('b', m.nombre), off ? h('span.tiny.muted', ' (desactivado)') : null, m.categoria ? h('div.tiny.muted', m.categoria) : null),
            h('td.small', (m.precio !== '' ? eur(m.precio) : '—') + ' · ' + (m.cantidad !== '' ? CL.n(m.cantidad).toLocaleString('es-ES') + ' ' + c.unidadTxt : '¿cuánto trae?') + (m.ancho && m.tipo !== 'caja' ? ' · ' + m.ancho + ' cm de ancho' : '') + (m.tipo === 'caja' && (m.largo || m.ancho) ? ' · ' + [m.largo, m.ancho, m.alto || '¿alto?'].join(' × ') + ' cm' : '')),
            h('td', c.coste === null ? h('span.bad-t.small', 'PENDIENTE: falta ' + c.falta.join(' y ')) : h('div', h('b', e4(c.coste) + '/' + c.unidadTxt), c.costeM2 ? h('div.tiny.muted', e4(c.costeM2) + '/m² · ' + e4(c.costeCm) + '/cm') : c.costeG && c.unidad !== 'g' ? h('div.tiny.muted', e4(c.costeG) + '/g') : null)),
            h('td.hide-m', confPill(m.estadoPrecio || 'pendiente')), h('td.hide-m', confPill(m.estadoCantidad || 'pendiente')), h('td.hide-m.small.muted', [m.proveedor, m.referencia].filter(Boolean).join(' · ')));
        })))))),
      h('p.tiny.muted', 'Los precios son lo que pagas (IVA incluido). Los mismos datos están en la hoja «Materiales» de vuestro Sheet; si cambias un precio allí, se apunta en el historial y se recalcula todo.'));
  };
  q.addEventListener('input', drawList);
  mount(el, seed, actions, pend.length ? h('p.small.warn-t', { style: { margin: '10px 0' } }, '⚠️ ' + pend.length + ' material(es) con datos PENDIENTES: ' + pend.slice(0, 6).map(m => m.nombre + ' (' + CL.matCost(m).falta.join(', ') + ')').join(' · ')) : null,
    h('div.row', { style: { margin: '12px 0' } }, q), list);
  drawList();
}

export function matForm(m) {
  const isNew = !m.id;
  if (!editor()) { if (isNew) return requestAccess('costes.editar', 'costes'); }
  const ro = !editor();
  const f = {
    tipo: sel(TIPOS.map(([v, t]) => ({ v, t })), m.tipo || 'material'), nombre: inp({ value: m.nombre || '', placeholder: 'Ej.: Papel kraft marrón (rollo)' }),
    categoria: inp({ value: m.categoria || '', placeholder: 'Ej.: Embalaje' }), marca: inp({ value: m.marca || '' }), proveedor: inp({ value: m.proveedor || '' }), referencia: inp({ value: m.referencia || '' }),
    unidad: sel(UNIT_OPTS.map(([v, t]) => ({ v, t })), m.unidad || 'ud'),
    precio: inp({ type: 'number', min: 0, step: 0.01, value: m.precio ?? '', placeholder: 'Ej.: 3,70' }), cantidad: inp({ type: 'number', min: 0, step: 'any', value: m.cantidad ?? '', placeholder: 'Déjalo vacío si no lo sabes' }),
    ancho: inp({ type: 'number', min: 0, step: 'any', value: m.ancho ?? '' }), largo: inp({ type: 'number', min: 0, step: 'any', value: m.largo ?? '' }), alto: inp({ type: 'number', min: 0, step: 'any', value: m.alto ?? '' }),
    estadoPrecio: sel(CONF_OPTS, m.estadoPrecio || (m.precio === '' || m.precio === undefined ? 'pendiente' : 'confirmado')), estadoCantidad: sel(CONF_OPTS, m.estadoCantidad || (m.cantidad === '' || m.cantidad === undefined ? 'pendiente' : 'confirmado')),
    fuente: inp({ value: m.fuente || '', placeholder: 'Tienda, factura, web…' }), fechaCompra: inp({ type: 'date', value: m.fechaCompra || '' }), notas: area({ value: m.notas || '' }),
    // v11.4: peso de lo que trae (para el peso del embalaje) y stock (cajas)
    pesoG: inp({ type: 'number', min: 0, step: 'any', value: m.pesoG ?? '', placeholder: 'g' }),
    stock: inp({ type: 'number', min: 0, step: 1, value: m.stock ?? '', placeholder: m.tipo === 'caja' ? 'Ej.: 13' : 'Si no lo cuentas, vacío' }),
    stockMin: inp({ type: 'number', min: 0, step: 1, value: m.stockMin ?? '', placeholder: 'Ej.: 3' })
  };
  if (ro) Object.values(f).forEach(x => { x.disabled = true; });
  const cantLabel = h('span'), preview = h('div.card.flat', { style: { margin: '10px 0' } }), msg = h('p.bad-t');
  const upd = () => {
    const tipo = f.tipo.value;
    cantLabel.textContent = tipo === 'filamento' ? 'PESO DE LA BOBINA (en la unidad elegida)' : tipo === 'caja' ? 'Cajas que vienen por ese precio' : 'Cantidad que trae (en la unidad elegida)';
    const x = { tipo, unidad: f.unidad.value, precio: f.precio.value === '' ? '' : Number(f.precio.value), cantidad: f.cantidad.value === '' ? '' : Number(f.cantidad.value), ancho: f.ancho.value === '' ? '' : Number(f.ancho.value), estadoPrecio: f.estadoPrecio.value, estadoCantidad: f.estadoCantidad.value };
    const c = CL.matCost(x);
    mount(preview, c.coste === null ? h('div.small.warn-t', '⏳ PENDIENTE: falta ' + c.falta.join(' y ') + '. Se puede guardar igual; el coste se calculará cuando lo apuntes.')
      : h('div', h('div', 'Coste: ', h('b', e4(c.coste) + ' por ' + c.unidadTxt), ' ', confPill(c.estado)),
        c.costeM2 ? h('div.small.muted', '= ' + e4(c.costeM) + ' por metro · ' + e4(c.costeCm) + ' por cm · ' + e4(c.costeM2) + ' por m² (con ' + x.ancho + ' cm de ancho)') : c.costeM ? h('div.small.muted', '= ' + e4(c.costeM) + ' por metro · ' + e4(c.costeCm) + ' por cm') : null,
        c.costeG && x.unidad !== 'g' ? h('div.small.muted', '= ' + e4(c.costeG) + ' por gramo') : null,
        h('div.tiny.muted', 'Cuenta: ' + eur(x.precio) + ' ÷ ' + x.cantidad + ' ' + c.unidadTxt)));
  };
  Object.values(f).forEach(x => x.addEventListener('input', upd)); Object.values(f).forEach(x => x.addEventListener('change', upd));
  const usedIn = isNew ? [] : (S.t.recetas || []).filter(r => r.materialId === m.id).map(r => r.producto).concat((S.t.embalajes || []).filter(e => (e.lineas || []).some(l => l.materialId === m.id)).map(e => 'embalaje ' + e.nombre));
  const hist = isNew ? [] : (S.t.preciosHist || []).filter(x => x.materialId === m.id).slice(-6).reverse();
  const bodyEl = h('div',
    h('div.form', field('Tipo', f.tipo), field('Nombre *', f.nombre, null, 'full'), field('Categoría', f.categoria), field('Marca', f.marca), field('Proveedor', f.proveedor), field('Referencia', f.referencia),
      field('Unidad en que lo cuentas', f.unidad, 'g para filamento · m para rollos · ud para piezas'), field('Precio de compra (€)', f.precio, 'Lo que pagaste, IVA incluido'), h('div.field', h('label', cantLabel), f.cantidad, h('span.hint', 'Si no lo sabes, déjalo vacío: queda PENDIENTE (nunca se inventa).')),
      field('Ancho (cm)', f.ancho, 'Rollos: para calcular €/m²'), field('Largo (cm)', f.largo), field('Alto (cm)', f.alto, 'Cajas: si no lo sabes, déjalo vacío'),
      field('Peso de lo que trae (g)', f.pesoG, 'Báscula: una caja vacía, la bobina de burbuja… Sirve para el peso del embalaje'),
      field('Unidades en stock', f.stock, 'Cajas: se descuentan solas al cerrar cada paquete'), field('Avisar si quedan', f.stockMin, 'Aviso de stock bajo'),
      field('¿Cómo de seguro es el precio?', f.estadoPrecio), field('¿Cómo de segura es la cantidad?', f.estadoCantidad), field('Origen del precio', f.fuente), field('Fecha de compra', f.fechaCompra), field('Notas', f.notas, null, 'full')),
    preview, msg,
    usedIn.length ? h('p.small.muted', 'Lo usan: ' + usedIn.slice(0, 8).join(', ') + (usedIn.length > 8 ? '…' : '') + '. Si cambias el precio se recalculan; los pedidos ya hechos guardan su coste.') : null,
    hist.length ? h('details', h('summary.small', 'Historial de precios (' + hist.length + ')'), h('div.list', hist.map(x => h('div.item', { style: { cursor: 'default' } }, h('span.tiny.muted', fdt(x.fecha)), h('span.grow.small', eur(x.precio) + ' / ' + x.cantidad + ' ' + x.unidad + ' → ' + e4(x.costeUnidad === '' ? null : x.costeUnidad)), h('span.tiny.muted', x.usuario + (x.motivo ? ' · ' + x.motivo : '')))))) : null);
  upd();
  modal(isNew ? 'Nuevo ' + (TIPO_TXT[m.tipo] || 'material').toLowerCase() : m.nombre, bodyEl, close => [
    !isNew && !ro ? btn(CL.norm(m.activo) === 'no' ? 'Activar' : 'Desactivar', async () => { await call('materiales.guardar', { id: m.id, datos: { activo: CL.norm(m.activo) === 'no' ? 'Sí' : 'No' } }, 'Guardado'); close(); }, { cls: 'ghost' }) : null,
    h('span.grow'), btn(ro ? 'Cerrar' : 'Cancelar', close),
    !ro ? btn('Guardar', async () => {
      msg.textContent = '';
      if (!f.nombre.value.trim()) { msg.textContent = 'Escribe el nombre.'; return; }
      const datos = {}; Object.keys(f).forEach(k => { datos[k] = f[k].value; });
      const orig = {}; if (!isNew) Object.keys(datos).forEach(k => { orig[k] = m[k] ?? ''; });
      let motivo = '';
      if (!isNew && (String(datos.precio) !== String(m.precio ?? '') || String(datos.cantidad) !== String(m.cantidad ?? ''))) motivo = 'Cambio desde la app';
      try { await call('materiales.guardar', isNew ? { datos } : { id: m.id, datos, orig, motivo }, isNew ? 'Material creado' : 'Guardado: costes recalculados'); close(); } catch (e) { msg.textContent = e.message; }
    }, { cls: 'primary' }) : null], { size: 'wide' });
}

// ---------- Editor de líneas (embalaje o receta) ----------
// lineas: [{materialId, cantidad, unidad, grupo, notas}] · allowEmb: puede llevar embalajes · onChange(lineas)
function linesEditor(lineas, allowEmb, onChange) {
  const box = h('div'), resumen = h('div');
  const opts = () => {
    const o = [{ v: '', t: '— Elige qué lleva —' }];
    o.push({ v: '@luz', t: '⚡ Electricidad de la impresora (horas)' }, { v: '@mo', t: '🖐️ Mano de obra (horas)' }, { v: '@otro', t: '➕ Otro coste fijo (€)' });
    if (allowEmb) (S.t.embalajes || []).forEach(e => o.push({ v: 'emb:' + e.id, t: '📦 Embalaje: ' + e.nombre }));
    activos().sort((a, b) => (a.tipo + a.nombre).localeCompare(b.tipo + b.nombre, 'es')).forEach(m => o.push({ v: m.id, t: (TIPO_TXT[m.tipo] || 'Material') + ': ' + m.nombre + ' (' + (CL.UNITS[CL.unitKey(m.unidad) || 'ud'] || {}).t + ')' }));
    return o;
  };
  const unitsFor = id => {
    if (id === '@luz' || id === '@mo') return [{ v: 'h', t: 'horas' }];
    if (id === '@otro') return [{ v: 'eur', t: '€' }];
    if (/^emb:/.test(id)) return [{ v: 'ud', t: 'unidades' }];
    const m = byId('materiales', id); if (!m) return [{ v: '', t: '—' }];
    const fam = (CL.UNITS[CL.unitKey(m.unidad) || 'ud'] || {}).fam;
    const list = Object.keys(CL.UNITS).filter(k => CL.UNITS[k].fam === fam || (fam === 'long' && CL.UNITS[k].fam === 'area' && CL.n(m.ancho) > 0));
    return list.map(k => ({ v: k, t: CL.UNITS[k].t }));
  };
  const draw = () => {
    const c = CL.linesCost(lineas, data(), pp());
    mount(box, lineas.map((l, i) => {
      const s = sel(opts(), l.materialId || '', { 'aria-label': 'Qué lleva' });
      const q = inp({ type: 'number', min: 0, step: 'any', value: l.cantidad ?? '', 'aria-label': 'Cantidad' });
      const u = sel(unitsFor(l.materialId), l.unidad || (unitsFor(l.materialId)[0] || {}).v || '');
      const nota = l.materialId === '@otro' ? inp({ value: l.notas || '', placeholder: '¿Qué es? (p. ej. pegamento)', 'aria-label': 'Qué es' }) : null;
      const r = c.lineas[i] || {};
      s.onchange = () => { l.materialId = s.value; l.unidad = (unitsFor(s.value)[0] || {}).v || ''; draw(); onChange(lineas); };
      q.oninput = () => { l.cantidad = q.value === '' ? '' : Number(q.value); drawSum(); onChange(lineas); };
      u.onchange = () => { l.unidad = u.value; drawSum(); onChange(lineas); };
      if (nota) nota.oninput = () => { l.notas = nota.value; onChange(lineas); };
      // v11.4: consumo ESTIMADO (metros de cinta, hojas de kraft…): se calcula pero se marca como estimado
      const est = h('input', { type: 'checkbox', checked: !!l.estimado, title: 'Consumo estimado' });
      est.onchange = () => { l.estimado = est.checked; drawSum(); onChange(lineas); };
      return h('div.cost-line' + (nota ? '.otro' : ''), s, q, h('div.row', { style: { gap: '4px' } }, u, h('label.check.tiny', { title: 'Marca si la cantidad es una estimación' }, est, '≈')), nota,
        h('span.small', { 'data-l': i }, r.coste === null || r.coste === undefined ? h('span.warn-t', r.aviso || '—') : h('span', h('b', eur(r.coste)), ' ', h('span.tiny.muted', r.detalle || ''))),
        btn('', () => { lineas.splice(i, 1); draw(); onChange(lineas); }, { cls: 'ghost icon sm', icon: 'x', title: 'Quitar' }));
    }), btn('Añadir línea', () => { lineas.push({ materialId: '', cantidad: 1, unidad: '' }); draw(); }, { cls: 'sm ghost', icon: 'plus' }));
    drawSum();
  };
  const drawSum = () => {
    const c = CL.linesCost(lineas.filter(l => l.materialId && CL.n(l.cantidad) > 0), data(), pp());
    mount(resumen, costBreakdown(c));
  };
  draw();
  return h('div', box, h('div', { style: { marginTop: '10px' } }, resumen));
}

// Desglose «¿por qué cuesta esto?»
export function costBreakdown(c, extra) {
  if (!c || c.vacio) return h('p.small.muted', 'Todavía no lleva nada.');
  const g = Object.keys(c.grupos);
  return h('div.card.flat', h('div.row.wrap', h('b.grow', c.total === null ? 'Coste: al menos ' + eur(c.conocido) + ' (falta algún dato)' : 'Coste total: ' + eur(c.total)), confPill(c.estado)),
    h('div.facts', { style: { marginTop: '8px' } }, g.map(k => h('div.fact', h('div.l', k), h('div.v', eur(c.grupos[k]))))),
    h('details', h('summary.small', 'Ver cada línea'), h('div.list', c.lineas.map(l => h('div.item', { style: { cursor: 'default' } }, h('span.grow.small', h('b', l.nombre), ' ', h('span.tiny.muted', l.detalle || '')),
      l.coste === null ? h('span.small.warn-t', l.aviso || 'PENDIENTE') : h('span.small', eur(l.coste)), confPill(l.coste === null ? 'pendiente' : l.estado))))),
    c.pendientes.length ? h('p.small.warn-t', '⏳ Falta: ' + c.pendientes.map(p => p.nombre + ' — ' + p.falta).join(' · ')) : null,
    c.estado === 'orientativo' || c.estado === 'estimado' ? h('p.tiny.muted', 'Incluye precios ' + CL.CONF_TXT[c.estado] + 'S: cámbialos por los tuyos en Materiales para que el coste sea exacto.') : null, extra || null);
}

// ---------- Embalajes ----------
function drawEmbs(el) {
  const embs = S.t.embalajes || [];
  mount(el, h('p.small.muted', 'Un embalaje es lo que gastas al enviar: caja + papel + burbuja + cinta + etiqueta… Se suma solo con los precios de Materiales y se elige en la receta de cada producto.'),
    editor() ? h('div.row', { style: { margin: '10px 0' } }, btn('NUEVO EMBALAJE (plantilla)', () => embForm({ lineas: [] }), { cls: 'primary', icon: 'plus' })) : null,
    embs.length ? h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' } }, embs.map(e => {
      const c = CL.linesCost(e.lineas || [], data(), pp());
      return h('div.card', { onclick: () => embForm(e), style: { cursor: 'pointer' } }, h('div.row', h('b.grow', (/^s/i.test(String(e.predeterminado || '')) ? '⭐ ' : '') + e.nombre), confPill(c.vacio ? 'pendiente' : c.estado)),
        /^s/i.test(String(e.predeterminado || '')) ? h('div.tiny.muted', 'ESTÁNDAR: se usa en cada pedido') : null,
        h('div', { style: { fontSize: '22px', fontWeight: 700, margin: '6px 0' } }, c.total === null ? h('span.warn-t', 'PENDIENTE') : eur(c.total)),
        h('div.small', c.lineas.map(l => h('div', '• ' + l.nombre + ': ' + (l.coste === null ? 'PENDIENTE' : eur(l.coste)) + (l.estimado ? ' (consumo estimado)' : '')))),
        h('div.tiny.muted', 'Peso: ' + (CL.n(e.pesoMedido) > 0 ? e.pesoMedido + ' g (pesado)' : c.peso === null ? 'PENDIENTE' : c.peso + ' g (calculado)')),
        e.notas ? h('div.tiny.muted', e.notas) : null);
    })) : empty('box', 'Sin embalajes', 'Crea el primero: por ejemplo «Caja 30×20 estándar» con la caja, 80 cm de papel kraft, 50 cm de burbuja, 20 cm de cinta y 1 etiqueta.', null));
}
function embForm(e) {
  const isNew = !e.id;
  if (!editor()) return isNew ? requestAccess('costes.editar', 'costes') : null;
  const lineas = JSON.parse(JSON.stringify(e.lineas || []));
  if (isNew && !lineas.length) lineas.push({ materialId: '', cantidad: 1, unidad: '' });
  const nombre = inp({ value: e.nombre || '', placeholder: 'Ej.: Caja 30×20 estándar' }), notas = area({ value: e.notas || '' }), msg = h('p.bad-t');
  const std = h('input', { type: 'checkbox', checked: /^s/i.test(String(e.predeterminado || '')) }), peso = inp({ type: 'number', min: 0, step: 1, value: e.pesoMedido ?? '', placeholder: 'g' });
  modal(isNew ? 'Nuevo embalaje' : e.nombre, h('div', h('div.form', field('Nombre *', nombre, null, 'full'), field('Notas', notas, null, 'full'), field('Peso pesado en báscula (g)', peso, 'Opcional: el embalaje vacío (caja + papel + burbuja + cinta)')),
      h('label.check', std, '⭐ Embalaje estándar: se usa en cada pedido (solo puede haber uno)'), h('h4', { style: { margin: '10px 0 4px' } }, 'Qué lleva'), linesEditor(lineas, false, () => { }), msg),
    close => [!isNew ? btn('Borrar', async () => { if (!await confirmDlg('Borrar embalaje', '¿Borrar «' + e.nombre + '»? (va a la papelera)', 'Borrar', true)) return; try { await call('embalajes.borrar', { id: e.id }, 'Borrado'); close(); } catch (x) { msg.textContent = x.message; } }, { cls: 'ghost danger' }) : null,
      h('span.grow'), btn('Cancelar', close), btn('Guardar', async () => {
        const ls = lineas.filter(l => l.materialId && CL.n(l.cantidad) > 0);
        const datos = { nombre: nombre.value, notas: notas.value, lineas: ls, predeterminado: std.checked ? 'Sí' : 'No', pesoMedido: peso.value === '' ? '' : Number(peso.value) };
        try { await call('embalajes.guardar', isNew ? { datos } : { id: e.id, datos }, 'Embalaje guardado'); close(); } catch (x) { msg.textContent = x.message; }
      }, { cls: 'primary' })], { size: 'wide' });
}

// ---------- Coste de productos ----------
function drawProds(el) {
  const prods = (S.t.productos || []).slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  const withBom = prods.filter(p => CL.bomOf(p.id, data()).length);
  mount(el, h('p.small.muted', 'Coste real de cada producto según su receta. Pulsa uno para ver por qué cuesta eso o para cambiar lo que lleva.'),
    h('div.table-wrap', { style: { marginTop: '10px' } }, h('table.t', h('thead', h('tr', h('th', 'Producto'), h('th', 'Coste real'), h('th.hide-m', 'Estado'), h('th.hide-m', 'Equilibrio'), h('th', 'Precio venta'), h('th', 'Margen'))),
      h('tbody', prods.map(p => {
        const c = CL.productCost(p.id, data(), pp()), pr = c.total === null ? null : CL.costPricing(c.total, pp(), p.precio, p.plataforma);
        return h('tr', { onclick: () => recipeEditor(p), style: { cursor: 'pointer' } }, h('td.bold', p.nombre),
          h('td', !c.tieneReceta ? h('span.muted.small', 'sin receta') : c.total === null ? h('span.warn-t.small', 'PENDIENTE (≥ ' + eur(c.conocido) + ')') : h('b', eur(c.total))),
          h('td.hide-m', c.tieneReceta ? confPill(c.estado) : null), h('td.hide-m', pr ? eur(pr.equilibrio) : '—'), h('td', p.precio ? eur(p.precio) : '—'),
          h('td', pr && pr.margen !== null ? h('span', { class: pr.margen < 0 ? 'bad-t' : 'ok-t' }, eur(pr.margen) + ' · ' + Math.round(pr.margenPct * 100) + ' %') : '—'));
      })))),
    h('p.tiny.muted', withBom.length + ' de ' + prods.length + ' productos con receta. Los demás siguen usando la calculadora del Excel (hoja Productos).'));
}

// Ficha de coste de un producto (para la pestaña «Precio y costes» del producto)
export function productCostCard(p) {
  const c = CL.productCost(p.id, data(), pp());
  if (!c.tieneReceta) return h('div.card.flat', h('b', '🧮 Receta de materiales'), h('p.small.muted', 'Este producto aún no tiene receta. Con ella el programa calcula el coste real: filamento, horas, componentes, embalaje y otros, con su desglose.'),
    editor() ? btn('Crear la receta', () => recipeEditor(p), { cls: 'primary sm', icon: 'plus' }) : null);
  const pr = c.total === null ? null : CL.costPricing(c.total, pp(), p.precio, p.plataforma);
  return h('div.col', { style: { gap: '10px' } }, h('div.row', h('h4.grow', '🧮 ¿Por qué cuesta lo que cuesta?'), btn(editor() ? 'Cambiar la receta' : 'Ver la receta', () => recipeEditor(p), { cls: 'sm' })),
    costBreakdown(c), pricingCard(pr, p));
}
export function pricingCard(pr, p) {
  if (!pr) return h('p.small.muted', 'El precio de equilibrio y el margen se calculan cuando el coste esté completo.');
  const pct = x => (Math.round(x * 1000) / 10).toLocaleString('es-ES') + ' %';
  return h('div.card.flat', h('div.facts',
    h('div.fact', h('div.l', 'Coste real'), h('div.v', eur(pr.coste))),
    h('div.fact', h('div.l', 'Punto de equilibrio (' + pr.canal + ')'), h('div.v', eur(pr.equilibrio)), h('div.tiny.muted', pr.comisionPct || pr.comisionFija ? 'cubre coste + comisión (' + pct(pr.comisionPct) + (pr.comisionFija ? ' + ' + eur(pr.comisionFija) : '') + ')' : 'no ganas ni pierdes')),
    h('div.fact', h('div.l', 'Precio con margen objetivo'), h('div.v', pr.objetivo !== null ? eur(pr.objetivo) : '—'), h('div.tiny.muted', pr.margenObjetivo !== null ? 'margen ' + pct(pr.margenObjetivo) + ' (Configuración → Precios)' : 'sin margen objetivo configurado')),
    h('div.fact', h('div.l', 'Precio de venta'), h('div.v', pr.venta !== null ? eur(pr.venta) : h('span.muted', 'sin precio'))),
    h('div.fact', h('div.l', 'Margen real'), h('div.v', pr.margen !== null ? h('b', { class: pr.margen < 0 ? 'bad-t' : 'ok-t' }, eur(pr.margen) + ' · ' + pct(pr.margenPct)) : '—'), pr.comision ? h('div.tiny.muted', 'tras ' + eur(pr.comision) + ' de comisión') : null)),
    pr.venta !== null && pr.venta < pr.equilibrio ? h('p.small.bad-t', '⚠️ El precio de venta está por debajo del punto de equilibrio: pierdes dinero en cada venta.') : null,
    p && editor() && can('productos.editar') && pr.objetivo ? h('div.row', btn('Usar el precio con margen objetivo (' + eur(pr.objetivo) + ')', async () => {
      if (!await confirmDlg('Cambiar el precio', 'El precio de «' + p.nombre + '» pasará de ' + eur(p.precio) + ' a ' + eur(pr.objetivo) + '.', 'Cambiar')) return;
      await call('productos.guardar', { id: p.id, datos: { precio: pr.objetivo }, orig: { precio: p.precio ?? '' } }, 'Precio actualizado');
    }, { cls: 'sm ghost' })) : null);
}

export function recipeEditor(p) {
  const cur = CL.bomOf(p.id, data()).map(r => ({ materialId: r.materialId, cantidad: r.cantidad, unidad: r.unidad, grupo: r.grupo, notas: r.notas }));
  const lineas = cur.length ? cur : [{ materialId: '', cantidad: '', unidad: '' }];
  const msg = h('p.bad-t'), ro = !editor();
  modal('Receta: ' + p.nombre, h('div', h('p.small.muted', 'Todo lo que lleva UNA unidad: gramos de filamento, horas de impresora, componentes, embalaje… El coste se calcula con los precios de Materiales.'),
    ro ? costBreakdown(CL.productCost(p.id, data(), pp())) : linesEditor(lineas, true, () => { }), msg),
    close => [h('span.grow'), btn(ro ? 'Cerrar' : 'Cancelar', close), !ro ? btn('Guardar receta', async () => {
      const ls = lineas.filter(l => l.materialId && CL.n(l.cantidad) > 0);
      try { await call('recetas.guardar', { productoId: p.id, lineas: ls }, 'Receta guardada: coste recalculado'); close(); } catch (e) { msg.textContent = e.message; }
    }, { cls: 'primary' }) : null], { size: 'wide' });
}

// ---------- Historial ----------
function drawHist(el) {
  const rows = (S.t.preciosHist || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 300);
  mount(el, h('p.small.muted', 'Cada cambio de precio o de cantidad queda aquí. Los pedidos ya hechos guardan el coste de SU fecha: cambiar un precio no los reescribe.'),
    rows.length ? h('div.table-wrap', { style: { marginTop: '10px' } }, h('table.t', h('thead', h('tr', h('th', 'Fecha'), h('th', 'Material'), h('th', 'Precio'), h('th.hide-m', 'Cantidad'), h('th', 'Coste/ud.'), h('th.hide-m', 'Estado'), h('th.hide-m', 'Quién y por qué'))),
      h('tbody', rows.map(x => h('tr', { style: { cursor: 'default' } }, h('td.small', fdt(x.fecha)), h('td.bold', x.material), h('td', eur(x.precio)), h('td.hide-m', (x.cantidad === '' ? '—' : x.cantidad) + ' ' + (x.unidad || '')),
        h('td', x.costeUnidad === '' ? h('span.warn-t.small', 'PENDIENTE') : e4(x.costeUnidad)), h('td.hide-m', confPill(x.estado)), h('td.hide-m.small.muted', [x.usuario, x.motivo, x.fuente].filter(Boolean).join(' · '))))))) : empty('history', 'Sin cambios todavía', 'Aquí verás cada cambio de precio.', null));
}

// Coste congelado de un pedido (para la ficha del pedido)
export function orderCostCard(o) {
  if (!can('productos.costes')) return null;
  const s = o.costeSnap && typeof o.costeSnap === 'object' ? o.costeSnap : null;
  if (!s) {
    const has = o.productoId && CL.bomOf(o.productoId, data()).length;
    return has ? h('div.card.flat', h('b', '🧮 Coste de fabricación'), h('p.small.muted', 'Este pedido es anterior a la receta: su coste no está congelado. Puedes congelarlo con los precios de hoy.'),
      editor() ? btn('Congelar coste con los precios de hoy', () => call('pedidos.costeFijar', { id: o.id }, 'Coste congelado').catch(() => { }), { cls: 'sm' }) : null) : null;
  }
  return h('div.card.flat', h('div.row', h('b.grow', '🧮 Coste de fabricación (congelado el ' + s.fecha + ')'), confPill(s.estado)),
    h('div', s.unidad === null || s.unidad === undefined ? h('span.warn-t', 'Incompleto: al menos ' + eur(s.conocido) + ' por unidad') : h('span', h('b', eur(s.unidad)), ' por unidad · ' + eur(CL.n(s.unidad) * (CL.n(o.cantidad) || 1)) + ' en total')),
    h('details', h('summary.small', 'Ver de dónde sale'), h('div.list', (s.lineas || []).map(l => h('div.item', { style: { cursor: 'default' } }, h('span.grow.small', l.n, ' ', h('span.tiny.muted', l.q + ' ' + ((CL.UNITS[l.u] || {}).t || l.u || '') + (l.cu !== null ? ' × ' + e4(l.cu) : ''))), h('span.small', l.c === null ? 'PENDIENTE' : eur(l.c)))))),
    h('p.tiny.muted', 'Precios del día del pedido. Si después cambian, este pedido mantiene su coste.'));
}
