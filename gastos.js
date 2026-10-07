// ================= 💶 Gastos extra (hoja "Gastos" del Excel) =================
// Caja, relleno, cinta, etiqueta, pintura… Lo que se suma al coste de cada producto.
// En la calculadora de cada producto se eligen como "Gasto extra 1" y "Gasto extra 2".
import { h, mount, btn, modal, toast, eur, empty, field, inp, area, confirmDlg } from '../ui.js';
import { S, can, api, upsertLocal, removeLocal, emit } from '../store.js';
import { handleError, requestAccess } from '../app.js';

const CL = window.CL;
const usos = g => (S.t.calculadora || []).filter(c => c.gasto1 === g.nombre || c.gasto2 === g.nombre).map(c => c.nombre);

export function render(el) {
  if (!can('productos.costes')) { mount(el, h('div.card', h('h3', '🔒 Gastos'), h('p.muted', 'Necesitas el permiso "Ver costes y márgenes".'))); return {}; }
  const st = { q: '' };
  const q = inp({ placeholder: 'Buscar gasto…', 'aria-label': 'Buscar gasto' });
  q.addEventListener('input', () => { st.q = q.value; draw(); });
  const list = h('div');
  el.append(
    h('div.page-head', h('div', h('h1', '💶 Gastos'), h('div.muted.small', 'Lo que se suma al coste de cada producto: caja, relleno, cinta, etiqueta, pintura… Es la hoja "Gastos" del Excel.')),
      can('productos.editar') ? btn('Nuevo gasto', () => gastoForm(), { cls: 'primary', icon: 'plus' }) : null),
    h('div.row', { style: { marginBottom: '12px' } }, q), list);
  function draw() {
    const all = (S.t.gastos || []).filter(g => !st.q || CL.matches([g.nombre, g.categoria, g.notas].join(' '), st.q));
    if (!(S.t.gastos || []).length) {
      mount(list, empty('euro', 'Todavía no hay gastos', 'Añade lo que gastáis en cada envío o producto (caja, relleno, cinta…). Luego se eligen en el precio de cada producto.', can('productos.editar') ? btn('Añadir el primero', () => gastoForm(), { cls: 'primary', icon: 'plus' }) : null));
      return;
    }
    const cats = {};
    all.forEach(g => { const c = g.categoria || 'Sin categoría'; (cats[c] = cats[c] || []).push(g); });
    const total = all.reduce((a, g) => a + (Number(g.coste) || 0), 0);
    mount(list,
      Object.keys(cats).sort((a, b) => a.localeCompare(b, 'es')).map(c => h('div.card', { style: { marginBottom: '12px' } },
        h('h3', { style: { marginBottom: '8px' } }, c),
        h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'Gasto'), h('th', { style: { textAlign: 'right' } }, 'Coste'), h('th.hide-m', 'Lo usan'), h('th.hide-m', 'Notas'))),
          h('tbody', cats[c].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es')).map(g => {
            const u = usos(g);
            return h('tr', { onclick: () => can('productos.editar') ? gastoForm(g) : null, style: { cursor: can('productos.editar') ? 'pointer' : 'default' } },
              h('td.bold', g.nombre), h('td', { style: { textAlign: 'right' } }, eur(Number(g.coste) || 0)),
              h('td.hide-m.small.muted', u.length ? u.length + ' producto' + (u.length > 1 ? 's' : '') : '—'), h('td.hide-m.small.muted', g.notas || ''));
          })))))),
      all.length ? h('p.small.muted', all.length + ' gasto(s) · suma de todos: ' + eur(total) + '. Para usarlos: Productos → producto → Costes y precio → "Gasto extra 1/2".') : h('p.muted', 'Nada coincide con la búsqueda.'));
  }
  draw();
  return { update: draw };
}

export function gastoForm(g) {
  if (!can('productos.editar')) return requestAccess('productos.editar', 'productos');
  const isNew = !g; g = g || {};
  const cats = [...new Set((S.t.gastos || []).map(x => x.categoria).filter(Boolean).concat(['Envío y embalaje', 'Materiales', 'Acabados']))];
  const f = {
    nombre: inp({ value: g.nombre || '', placeholder: 'Ej.: Caja mediana' }),
    categoria: inp({ value: g.categoria || '', list: 'dl-gcat', placeholder: 'Ej.: Envío y embalaje' }),
    coste: inp({ type: 'number', min: 0, step: 0.01, value: g.coste !== undefined && g.coste !== '' ? g.coste : '', placeholder: '0,45' }),
    notas: area({ value: g.notas || '', placeholder: 'Proveedor, medidas, cuántas vienen en el paquete…' })
  };
  const msg = h('p.bad-t');
  const u = isNew ? [] : usos(g);
  const body = h('div', h('datalist', { id: 'dl-gcat' }, cats.map(c => h('option', { value: c }))),
    h('div.form', field('Nombre *', f.nombre, null, 'full'), field('Categoría', f.categoria), field('Coste por unidad (€) *', f.coste, 'Con IVA, lo que os cuesta una unidad.'), field('Notas', f.notas, null, 'full')),
    u.length ? h('p.small.muted', { style: { marginTop: '8px' } }, 'Lo usan: ' + u.slice(0, 8).join(', ') + (u.length > 8 ? '…' : '') + '. Si cambias el coste, su precio se recalcula.') : null, msg);
  const m = modal(isNew ? 'Nuevo gasto' : 'Editar gasto', body, close => h('div.row', { style: { width: '100%' } },
    !isNew ? btn('Borrar', del, { cls: 'ghost bad', icon: 'trash' }) : null, h('span.grow'),
    btn('Cancelar', close), btn(isNew ? 'Añadir' : 'Guardar', save, { cls: 'primary', icon: 'check' })));
  async function save(ev) {
    msg.textContent = '';
    const datos = { nombre: f.nombre.value.trim(), categoria: f.categoria.value.trim(), coste: f.coste.value === '' ? '' : Number(String(f.coste.value).replace(',', '.')), notas: f.notas.value.trim() };
    if (!datos.nombre) { msg.textContent = 'Escribe el nombre del gasto.'; f.nombre.focus(); return; }
    if (datos.coste === '' || !(datos.coste >= 0)) { msg.textContent = 'Pon el coste (un número, p. ej. 0,45).'; f.coste.focus(); return; }
    const b = ev && ev.target && ev.target.closest('button'); if (b) b.disabled = true;
    try {
      const row = await api('gastos.guardar', { datos, original: isNew ? '' : g.nombre });
      if (!isNew && g.nombre !== row.nombre) {
        removeLocal('gastos', g.nombre, 'nombre');
        (S.t.calculadora || []).forEach(c => { if (c.gasto1 === g.nombre) c.gasto1 = row.nombre; if (c.gasto2 === g.nombre) c.gasto2 = row.nombre; });
      }
      upsertLocal('gastos', row, 'nombre'); emit();
      toast(isNew ? 'Gasto añadido' : 'Gasto guardado', 'ok'); m.close();
    } catch (e) { msg.textContent = friendly(e); if (b) b.disabled = false; }
  }
  async function del() {
    if (!await confirmDlg('Borrar gasto', '¿Borrar "' + g.nombre + '"? Irá a la papelera (se puede restaurar).', 'Borrar', true)) return;
    try { await api('gastos.borrar', { nombre: g.nombre }); }
    catch (e) {
      if (!(e.extra && e.extra.usos)) { msg.textContent = friendly(e); return; }
      if (!await confirmDlg('Se usa en productos', e.message, 'Borrar igualmente', true)) return;
      try { await api('gastos.borrar', { nombre: g.nombre, forzar: true }); } catch (e2) { msg.textContent = friendly(e2); return; }
    }
    removeLocal('gastos', g.nombre, 'nombre'); emit(); toast('Gasto en la papelera', 'ok'); m.close();
  }
}
function friendly(e) {
  if (/Acción desconocida: gastos/.test(e.message || '')) return 'El servidor de Google aún no está actualizado: hay que pegar el nuevo Servidor.gs (ver LEEME de la versión 10.7).';
  return e.message || String(e);
}
