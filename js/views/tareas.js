// ================= Tareas: completar ≠ eliminar, estados y contadores reales =================
import { h, mount, icon, btn, modal, toast, fdate, fdt, ago, pill, empty, field, inp, sel, area, debounce, confirmDlg, uid, avatar } from '../ui.js';
import { S, can, mutate, byId, upsertLocal, removeLocal, emit } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';

const CL = window.CL;
const OPEN = ['Pendiente', 'En progreso', 'Bloqueada'];
const ST_CLS = { 'Pendiente': '', 'En progreso': 'info', 'Completada': 'ok', 'Bloqueada': 'warn', 'Cancelada': '' };
const PRIO_CLS = { 'Urgente': 'bad', 'Alta': 'warn', 'Normal': '', 'Baja': '' };
const VIEWS = [
  { k: 'mias', t: 'Para mí', f: t => (t.responsable === S.me.nombre || !t.responsable) && (OPEN.includes(t.estado) || doneToday(t)) },
  { k: 'abiertas', t: 'Abiertas', f: t => OPEN.includes(t.estado) || doneToday(t) },
  { k: 'bloqueadas', t: 'Bloqueadas', f: t => t.estado === 'Bloqueada' },
  { k: 'completadas', t: 'Completadas', f: t => t.estado === 'Completada' },
  { k: 'canceladas', t: 'Canceladas', f: t => t.estado === 'Cancelada' },
  { k: 'todas', t: 'Todas', f: () => true }
];
function doneToday(t) { return t.estado === 'Completada' && window.CL.day(t.completado) === S.hoy; }

export function render(el, params) {
  const st = { v: 'mias', q: '', resp: '', cat: '' };
  const search = inp({ type: 'search', placeholder: 'Buscar tareas…' });
  search.addEventListener('input', debounce(() => { st.q = search.value; drawList(); }, 120));
  const fResp = h('select.inp'), fCat = h('select.inp');
  [fResp, fCat].forEach(x => x.addEventListener('change', () => { st.resp = fResp.value; st.cat = fCat.value; drawList(); }));
  const counters = h('div.grid.kpis', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', marginBottom: '14px' } });
  const seg = h('div.seg');
  const listBox = h('div');
  el.append(h('div.page-head', h('h1', 'Tareas'), can('tareas.crear') ? btn('Nueva tarea', () => taskForm(), { cls: 'primary', icon: 'plus' }) : null),
    counters, h('div.row.wrap', { style: { marginBottom: '12px' } }, seg, h('div.inp-icon.grow', { style: { minWidth: '200px' } }, icon('search', 's'), search), h('div', { style: { width: '190px' } }, fResp), h('div', { style: { width: '200px' } }, fCat)), listBox);

  function drawTop() {
    const T = S.t.tareas;
    const c = [
      ['Pendientes', T.filter(t => t.estado === 'Pendiente').length, 'abiertas'],
      ['En progreso', T.filter(t => t.estado === 'En progreso').length, 'abiertas', 'info'],
      ['Bloqueadas', T.filter(t => t.estado === 'Bloqueada').length, 'bloqueadas', 'warn'],
      ['Vencidas', T.filter(t => OPEN.includes(t.estado) && t.fechaLimite && t.fechaLimite < S.hoy).length, 'abiertas', 'bad'],
      ['Completadas hoy', T.filter(doneToday).length, 'completadas', 'ok']
    ];
    mount(counters, c.map(x => h('button.kpi' + (x[3] && x[1] ? '.' + x[3] : ''), { onclick: () => { st.v = x[2]; drawSeg(); drawList(); } }, h('span.n', String(x[1])), h('span.l', x[0]))));
    const keepR = fResp.value, keepC = fCat.value;
    mount(fResp, h('option', { value: '' }, 'Todas las personas'), S.t.usuarios.filter(u => u.activo).map(u => h('option', { value: u.nombre }, u.nombre)));
    const cats = [...new Set(S.t.tareas.map(t => t.categoria).filter(Boolean))];
    mount(fCat, h('option', { value: '' }, 'Todas las categorías'), cats.map(x => h('option', { value: x }, x)));
    fResp.value = keepR; fCat.value = keepC;
  }
  function drawSeg() {
    mount(seg, VIEWS.map(v => h('button' + (st.v === v.k ? '.on' : ''), { onclick: () => { st.v = v.k; drawSeg(); drawList(); } }, v.t + (v.k === 'mias' ? ' (' + S.t.tareas.filter(v.f).filter(t => OPEN.includes(t.estado)).length + ')' : ''))));
  }
  function drawList() {
    const vv = VIEWS.find(v => v.k === st.v);
    const rows = S.t.tareas.filter(t => vv.f(t) && (!st.q || CL.matches(t.titulo + ' ' + t.notas + ' ' + t.categoria, st.q)) && (!st.resp || t.responsable === st.resp) && (!st.cat || t.categoria === st.cat));
    if (!S.t.tareas.length) return mount(listBox, h('div.card', empty('tasks', 'No hay tareas', 'Crea la primera. Las tareas de pedidos que vencen pronto se crean solas.', can('tareas.crear') ? btn('Nueva tarea', () => taskForm(), { cls: 'primary', icon: 'plus' }) : null)));
    if (!rows.length) return mount(listBox, h('div.card', empty('check', st.v === 'mias' ? '¡Nada pendiente para ti!' : 'Ninguna tarea aquí', st.v === 'mias' ? 'Buen trabajo 🎉' : '')));
    const pr = { Urgente: 0, Alta: 1, Normal: 2, Baja: 3 };
    const sortOpen = (a, b) => (a.fechaLimite || '9999').localeCompare(b.fechaLimite || '9999') || (pr[a.prioridad] ?? 2) - (pr[b.prioridad] ?? 2) || String(a.creado).localeCompare(String(b.creado));
    const groups = [];
    const open = rows.filter(t => OPEN.includes(t.estado)).sort(sortOpen);
    const add = (title, list, cls) => { if (list.length) groups.push(h('div', { style: { marginBottom: '14px' } }, h('div.lbl' + (cls ? '.' + cls : ''), { style: { margin: '0 0 6px 4px' } }, title + ' · ' + list.length), h('div.list.boxed', list.map(taskRow)))); };
    add('Vencidas', open.filter(t => t.fechaLimite && t.fechaLimite < S.hoy), 'bad-t');
    add('Para hoy', open.filter(t => t.fechaLimite === S.hoy));
    add('Próximas', open.filter(t => t.fechaLimite && t.fechaLimite > S.hoy));
    add('Sin fecha', open.filter(t => !t.fechaLimite));
    const done = rows.filter(t => !OPEN.includes(t.estado)).sort((a, b) => String(b.completado || b.actualizado).localeCompare(String(a.completado || a.actualizado)));
    add(st.v === 'mias' || st.v === 'abiertas' ? 'Completadas hoy' : 'Cerradas', done.slice(0, 300));
    mount(listBox, groups);
  }
  let formOpen = false;
  function applyParams(p) {
    const q = {}; let id = '';
    (p || []).forEach(x => { if (x.startsWith('?')) new URLSearchParams(x.slice(1)).forEach((v, k) => { q[k] = v; }); else if (x) id = x; });
    if (q.f && VIEWS.some(v => v.k === q.f)) st.v = q.f;
    drawTop(); drawSeg(); drawList();
    if (id === 'nueva') { history.replaceState(null, '', '#/tareas'); taskForm(); }
    else if (id && !formOpen) { const t = byId('tareas', id); history.replaceState(null, '', '#/tareas'); if (t) taskForm(t); }
  }
  applyParams(params);
  return { params: applyParams, update: () => { drawTop(); drawSeg(); drawList(); } };
}

function taskRow(t) {
  const done = t.estado === 'Completada', cancel = t.estado === 'Cancelada';
  const late = OPEN.includes(t.estado) && t.fechaLimite && t.fechaLimite < S.hoy;
  const ped = t.pedidoId ? byId('pedidos', t.pedidoId) : null;
  const stSel = sel(S.cfg.estadosTarea || ['Pendiente', 'En progreso', 'Completada', 'Bloqueada', 'Cancelada'], t.estado, { 'aria-label': 'Estado', style: { width: 'auto', minHeight: '32px', padding: '4px 8px', fontSize: '13px' } });
  stSel.addEventListener('change', () => setState(t, stSel.value));
  return h('div.task' + (done ? '.done' : '') + (cancel ? '.cancel' : ''),
    h('button.tick', { onclick: () => setState(t, done ? 'Pendiente' : 'Completada'), title: done ? 'Volver a pendiente' : 'Marcar como completada', 'aria-label': done ? 'Volver a pendiente' : 'Completar', 'aria-pressed': done ? 'true' : 'false' }, icon('check', 's')),
    h('div.grow',
      h('div.ttl', { onclick: () => taskForm(t) }, t.titulo),
      h('div.meta',
        pill(t.estado, ST_CLS[t.estado]),
        t.prioridad && t.prioridad !== 'Normal' ? pill(t.prioridad, PRIO_CLS[t.prioridad]) : null,
        t.fechaLimite ? h('span' + (late ? '.bad-t.bold' : ''), '📅 ' + (t.fechaLimite === S.hoy ? 'Hoy' : fdate(t.fechaLimite)) + (late ? ' (vencida)' : '')) : null,
        t.responsable ? h('span.row', { style: { gap: '4px' } }, avatar(t.responsable, 's'), t.responsable) : h('span', 'Sin asignar'),
        t.categoria ? h('span', '# ' + t.categoria) : null,
        ped ? h('a', { href: '#/pedidos/' + ped.id, onclick: e => e.stopPropagation() }, '📦 Pedido nº ' + ped.numero) : null,
        t.origen === 'auto' ? h('span', { title: 'Creada automáticamente' }, '🤖 automática') : t.origen === 'ia' ? h('span', '✨ creada por la IA') : null,
        done ? h('span.ok-t', '✓ Completada ' + (t.completado ? fdt(t.completado) : '') + (t.completadoPor ? ' por ' + t.completadoPor : '')) : null),
      t.notas ? h('div.small.muted', { style: { marginTop: '4px', whiteSpace: 'pre-wrap' } }, t.notas.length > 180 ? t.notas.slice(0, 180) + '…' : t.notas) : null),
    h('div.row', { style: { gap: '4px', alignSelf: 'center' } }, h('div.hide-m', stSel),
      btn('', () => taskForm(t), { cls: 'ghost icon sm', icon: 'edit', title: 'Editar' }),
      btn('', () => delTask(t), { cls: 'ghost icon sm', icon: 'trash', title: 'Eliminar (no es lo mismo que completar)' })));
}

async function setState(t, estado) {
  if (t.estado === estado) return;
  const now = new Date().toISOString();
  try {
    const r = await mutate('tareas.estado', { id: t.id, estado, orig: { estado: t.estado } }, {
      label: 'Tarea "' + t.titulo + '" → ' + estado, tables: ['tareas'],
      optimistic: T => { const x = T.tareas.find(y => y.id === t.id); if (x) { x.estado = estado; x.completado = estado === 'Completada' ? now : ''; x.completadoPor = estado === 'Completada' ? S.me.nombre : ''; } }
    });
    if (r && r.id) { upsertLocal('tareas', r); emit(); }
    if (estado === 'Completada') toast('✓ Tarea completada', 'ok');
  } catch (e) { handleError(e, 'tareas'); }
}
async function delTask(t) {
  const own = t.creadoPor === S.me.nombre && t.origen !== 'auto';
  if (!own && !can('tareas.borrar')) return requestAccess('tareas.borrar', 'tareas', 'Eliminar tarea "' + t.titulo + '"');
  if (!await confirmDlg('Eliminar tarea', 'Eliminar NO es lo mismo que completar: la tarea desaparecerá de la lista (irá a la papelera). Para marcarla como hecha, pulsa el cuadrado.', 'Eliminar', true)) return;
  try { await mutate('tareas.borrar', { id: t.id }, { label: 'Eliminar tarea', tables: ['tareas'], optimistic: T => { T.tareas = T.tareas.filter(x => x.id !== t.id); } }); toast('Tarea eliminada (está en la papelera)', 'ok'); }
  catch (e) { handleError(e, 'tareas'); }
}

export function taskForm(t) {
  const isNew = !t || !t.id;
  t = t || {};
  if (isNew && !can('tareas.crear')) return requestAccess('tareas.crear', 'tareas');
  const cats = [...new Set(['Pedidos', 'Producción', 'Envíos', 'Redes', 'Compras', 'Administración'].concat(S.t.tareas.map(x => x.categoria).filter(Boolean)))];
  const f = {
    titulo: inp({ value: t.titulo || '', placeholder: '¿Qué hay que hacer?' }),
    estado: sel(S.cfg.estadosTarea, t.estado || 'Pendiente'),
    prioridad: sel(S.cfg.prioridades, t.prioridad || 'Normal'),
    responsable: sel([{ v: '', t: 'Sin asignar' }].concat(S.t.usuarios.filter(u => u.activo).map(u => ({ v: u.nombre, t: u.nombre }))), t.responsable ?? (isNew ? S.me.nombre : '')),
    fechaLimite: inp({ type: 'date', value: t.fechaLimite || '' }),
    categoria: inp({ value: t.categoria || '', list: 'dl-cats', placeholder: 'Opcional' }),
    notas: area({ value: t.notas || '', style: { minHeight: '80px' } }),
    pedidoId: sel([{ v: '', t: 'Ninguno' }].concat(S.t.pedidos.filter(o => o.id === t.pedidoId || CL.orderTiming(o, S.cfg.pedidos, S.hoy).abierto).slice(-200).reverse().map(o => ({ v: o.id, t: 'nº ' + o.numero + ' · ' + o.cliente + ' · ' + o.producto }))), t.pedidoId || '')
  };
  const quick = h('div.row.wrap', { style: { gap: '6px' } }, [['Hoy', 0], ['Mañana', 1], ['En 3 días', 3], ['En una semana', 7]].map(x => h('button.btn.sm', { type: 'button', onclick: () => { f.fechaLimite.value = CL.addDays(S.hoy, x[1]); } }, x[0])));
  const msg = h('p.bad-t');
  const info = !isNew ? h('p.tiny.muted', 'Creada por ' + (t.creadoPor || '—') + ' · ' + fdt(t.creado) + (t.completado ? ' · completada ' + fdt(t.completado) + ' por ' + t.completadoPor : '')) : null;
  modal(isNew ? 'Nueva tarea' : 'Tarea', h('div.col', h('datalist', { id: 'dl-cats' }, cats.map(c => h('option', { value: c }))),
    h('div.form', field('Tarea *', f.titulo, null, 'full'), field('Estado', f.estado), field('Prioridad', f.prioridad), field('Responsable', f.responsable), field('Fecha límite', f.fechaLimite), h('div.full', quick), field('Categoría', f.categoria), field('Pedido relacionado', f.pedidoId), field('Notas', f.notas, null, 'full')), info, msg),
    close => [!isNew ? btn('Eliminar', () => { close(); delTask(t); }, { cls: 'danger', icon: 'trash' }) : null, h('span.grow'), btn('Cancelar', close), btn(isNew ? 'Crear tarea' : 'Guardar', async () => {
      const datos = {}; Object.keys(f).forEach(k => { datos[k] = f[k].value.trim ? f[k].value.trim() : f[k].value; });
      if (!datos.titulo) return msg.textContent = 'Escribe qué hay que hacer.';
      if (t.clienteId && isNew) datos.clienteId = t.clienteId;
      try {
        if (isNew) {
          const id = uid('k');
          const r = await mutate('tareas.guardar', { id, datos }, { label: 'Nueva tarea', tables: ['tareas'], optimistic: T => T.tareas.push(Object.assign({ id, creado: new Date().toISOString(), creadoPor: S.me.nombre, origen: 'manual', version: 0 }, datos)) });
          if (r && r.id) { upsertLocal('tareas', r); emit(); }
          toast(r && r.queued ? 'Tarea guardada en el dispositivo' : 'Tarea creada', 'ok');
        } else {
          const ch = {}, orig = {}; Object.keys(datos).forEach(k => { if (String(datos[k]) !== String(t[k] ?? '')) { ch[k] = datos[k]; orig[k] = t[k] ?? ''; } });
          if (Object.keys(ch).length) {
            const r = await mutate('tareas.guardar', { id: t.id, datos: ch, orig }, { label: 'Tarea "' + t.titulo + '"', tables: ['tareas'], optimistic: T => { const x = T.tareas.find(y => y.id === t.id); if (x) Object.assign(x, ch); } });
            if (r && r.id) { upsertLocal('tareas', r); emit(); }
            toast('Tarea guardada', 'ok');
          }
        }
        close();
      } catch (e) { msg.textContent = e.message; handleError(e, 'tareas'); }
    }, { cls: 'primary' })]);
}
