// ================= 🖨️ Taller 3D: impresoras, cola de impresión, filamento y compras =================
import { h, mount, btn, modal, toast, eur, fdate, pill, empty, field, inp, sel, area, confirmDlg, promptDlg, icon } from '../ui.js';
import { S, can, api, upsertLocal, removeLocal, emit, byId, timing, stateColor } from '../store.js';
import { go, handleError, requestAccess } from '../app.js';
import { bambuFor } from '../bambu.js';
import { bambuLine } from './centro_impresion.js';

const CL = window.CL;
const MATERIALES = ['PLA', 'PLA Silk', 'PLA Mate', 'PETG', 'TPU', 'ABS', 'ASA', 'Otro'];
const COLORES = ['Blanco', 'Negro', 'Gris', 'Rojo', 'Azul', 'Celeste', 'Verde', 'Amarillo', 'Naranja', 'Rosa', 'Morado', 'Marrón', 'Beige', 'Dorado', 'Plata', 'Transparente'];
const OPEN = { 'En cola': 1, 'Imprimiendo': 1 };
const phase = o => CL.phaseOf(S.cfg.pedidos, o.estado);
const PRE_PRINT = { reserva: 1, confirmado: 1 }, PRE_FAB = { reserva: 1, confirmado: 1, impresion: 1 };
const n = v => Number(v) || 0;
export const hrs = x => { const t = Math.max(0, Math.round(n(x) * 60)); if (t < 60) return t + ' min'; const hh = Math.floor(t / 60), mm = t % 60; return hh + ' h' + (mm ? ' ' + mm + ' min' : ''); };
const g = x => Math.round(n(x)) + ' g';
const hhmm = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };
export const whenTxt = iso => { const d = new Date(iso); if (isNaN(d)) return ''; const today = new Date(); const same = d.toDateString() === today.toDateString(); const tm = new Date(Date.now() + 86400000).toDateString() === d.toDateString(); return (same ? 'hoy' : tm ? 'mañana' : d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })) + ' a las ' + hhmm(iso); };
const dot = (hex, lg) => h('span.dot' + (lg ? '.lg' : ''), { style: { background: hex || '#ccc' } });
export const printers = () => (S.t.impresoras || []).filter(p => p.activa !== false).sort((a, b) => n(a.orden) - n(b.orden));
const jobsOf = id => (S.t.trabajos || []).filter(j => j.impresoraId === id);
export const queueOf = id => jobsOf(id).filter(j => j.estado === 'En cola').sort((a, b) => n(a.orden) - n(b.orden) || String(a.creado).localeCompare(String(b.creado)));
export const nowOf = id => jobsOf(id).find(j => j.estado === 'Imprimiendo');
const spoolName = b => (b.material || 'PLA') + ' ' + (b.color || '') + (b.marca ? ' · ' + b.marca : '');
function colorHexOf(color) { const b = (S.t.bobinas || []).find(x => CL.norm(x.color) === CL.norm(color) && x.colorHex); return b ? b.colorHex : ''; }

// Cuándo queda libre cada impresora (lo que falta de la actual + la cola)
// v11.2: si la Bambu Lab está imprimiendo, su hora de fin real manda sobre la estimación
export const liveFin = id => { const b = bambuFor(id); return b && b.conectada && b.fin && ['imprimiendo', 'pausada', 'preparando'].includes(b.estado) ? b.fin : ''; };
export function freeAt(id) {
  const cur = nowOf(id);
  let t = Date.now();
  const fin = liveFin(id) || (cur ? cur.finPrevisto : ''); // también si imprime algo lanzado fuera del programa
  if (fin) t = Math.max(t, new Date(fin).getTime());
  queueOf(id).forEach(j => { t += n(j.horas) * 3600000; });
  return t;
}
function bestPrinter() {
  const list = printers().filter(p => p.estado !== 'Mantenimiento');
  return list.sort((a, b) => freeAt(a.id) - freeAt(b.id))[0] || printers()[0] || null;
}
// Bobina recomendada: mismo color y material, con gramos suficientes y la más gastada primero (se aprovecha)
export function bestSpool(color, material, grams) {
  const list = (S.t.bobinas || []).filter(b => b.estado !== 'Agotada' && (!color || CL.norm(b.color) === CL.norm(color)) && (!material || CL.norm(b.material) === CL.norm(material)));
  const ok = list.filter(b => n(b.restante) >= n(grams)).sort((a, b) => n(a.restante) - n(b.restante));
  return ok[0] || list.sort((a, b) => n(b.restante) - n(a.restante))[0] || null;
}
function spoolOptions(color, material, value) {
  const all = (S.t.bobinas || []).filter(b => b.estado !== 'Agotada' || b.id === value);
  const match = b => (!color || CL.norm(b.color) === CL.norm(color)) && (!material || CL.norm(b.material) === CL.norm(material));
  const sorted = all.sort((a, b) => (match(b) - match(a)) || spoolName(a).localeCompare(spoolName(b)) || n(a.restante) - n(b.restante));
  return [{ v: '', t: '— Sin indicar (no se descuenta filamento) —' }].concat(sorted.map(b => ({ v: b.id, t: (match(b) ? '' : '· ') + spoolName(b) + ' — quedan ' + g(b.restante) })));
}

async function call(a, d, okMsg) {
  try { const r = await api(a, d); if (okMsg) toast(okMsg, 'ok'); return r; }
  catch (e) { handleError(e, 'taller'); return null; }
}
export function applyJob(r) {
  if (!r) return;
  if (r.trabajo) upsertLocal('trabajos', r.trabajo);
  if (r.pedido) upsertLocal('pedidos', r.pedido);
  (r.pedidos || []).forEach(p => upsertLocal('pedidos', p));
  if (r.bobina) upsertLocal('bobinas', r.bobina);
  if (r.repetida && r.repetida.id) upsertLocal('trabajos', r.repetida);
  emit();
}

export function render(el, params) {
  if (!can('taller.ver')) { mount(el, h('div.card', h('h3', '🔒 Taller'), h('p.muted', 'Necesitas el permiso "Ver impresoras, cola de impresión y filamento".'))); return {}; }
  const st = { tab: (params && params[0]) || 'impresoras' };
  if (!['impresoras', 'filamento', 'compras', 'historial', 'papel'].includes(st.tab)) st.tab = 'impresoras';
  const edit = can('taller.editar');
  const tabs = h('div.tabs'), body = h('div');
  el.append(h('div.page-head', h('div', h('h1', '🖨️ Impresión'), h('div.muted.small', 'Impresoras 3D (qué imprime cada una y qué va después), filamento, y las impresoras de etiquetas y de papel.')),
    edit ? h('div.row.wrap', btn('Nueva impresión', () => jobForm(), { cls: 'primary', icon: 'plus' }), btn('Añadir bobina', () => spoolForm(), { icon: 'plus' })) : null), tabs, body);
  function drawTabs() {
    const pend = (S.t.compras || []).filter(c => c.estado === 'Pendiente').length;
    const T = [['impresoras', 'Impresoras 3D'], ['papel', 'Etiquetas e impresoras de papel'], ['filamento', 'Filamento'], ['compras', 'Lista de la compra' + (pend ? ' (' + pend + ')' : '')], ['historial', 'Historial']];
    mount(tabs, T.map(x => h('button' + (st.tab === x[0] ? '.on' : ''), { onclick: () => { st.tab = x[0]; history.replaceState(null, '', '#/taller/' + x[0]); draw(); } }, x[1])));
  }
  // v11.5: la impresión, en un solo sitio (3D + etiquetas/papel). «Hoy» sigue siendo el acceso rápido del día.
  function drawPaper() { mount(body, h('p.small.muted', 'Impresoras de etiquetas y de folios de este ordenador: estado, tamaños y calibración.')); import('./config.js').then(C => C.printCenter(body, () => { if (st.tab === 'papel') drawPaper(); })); }
  function draw() { drawTabs(); ({ impresoras: drawPrinters, papel: drawPaper, filamento: drawSpools, compras: drawShop, historial: drawHistory })[st.tab](); }

  // ---------- Impresoras ----------
  function drawPrinters() {
    const list = printers();
    if (!list.length) { mount(body, h('div.card', empty('cube', 'Todavía no hay impresoras', 'Añade vuestras impresoras para organizar la cola de impresión.', edit ? btn('Añadir impresora', () => printerForm(), { cls: 'primary', icon: 'plus' }) : null))); return; }
    const pendingOrders = S.t.pedidos.filter(o => phase(o) === 'confirmado' && !(S.t.trabajos || []).some(j => j.pedidoId === o.id && j.estado !== 'Cancelado'))
      .map(o => ({ o, t: timing(o) })).sort((a, b) => String(a.t.limite || '9').localeCompare(String(b.t.limite || '9')));
    mount(body,
      pendingOrders.length && edit ? h('div.card', { style: { marginBottom: '14px' } }, h('div.row', h('b', '📋 Pedidos por imprimir (' + pendingOrders.length + ')'), h('span.tiny.muted', 'Aún no están en ninguna cola')),
        h('div.list', { style: { marginTop: '8px' } }, pendingOrders.slice(0, 6).map(({ o, t }) => h('div.item', h('div.grow', h('div.small', h('b', 'nº ' + o.numero), ' · ' + (o.cantidad > 1 ? o.cantidad + ' × ' : '') + o.producto + (o.color ? ' · ' + o.color : '')), h('div.tiny.muted', o.cliente + (t.limite ? ' · límite ' + fdate(t.limite) : ''))),
          btn('Mandar a imprimir', () => jobForm(null, o), { cls: 'sm primary', icon: 'plus' }))))) : null,
      rateBlock(edit),
      h('div.printers', list.map(printerCard)),
      edit ? h('div.row', { style: { marginTop: '12px' } }, btn('Añadir impresora', () => printerForm(), { cls: 'ghost sm', icon: 'plus' })) : null);
  }
  function printerCard(p) {
    const cur = nowOf(p.id), q = queueOf(p.id), maint = p.estado === 'Mantenimiento';
    const lf = cur ? liveFin(p.id) : '', finP = lf || (cur && cur.finPrevisto);
    const late = cur && finP && new Date(finP) < new Date();
    const qh = q.reduce((a, j) => a + n(j.horas), 0);
    let now = null;
    if (cur) {
      const t0 = new Date(cur.inicio).getTime(), t1 = new Date(finP).getTime(), lv = lf ? bambuFor(p.id) : null;
      const pc = lv ? Math.max(0, Math.min(1, (Number(lv.pct) || 0) / 100)) : Math.max(0, Math.min(1, (Date.now() - t0) / Math.max(1, t1 - t0)));
      const left = (t1 - Date.now()) / 3600000;
      const b = cur.bobinaId ? byId('bobinas', cur.bobinaId) : null;
      now = h('div.now',
        h('div.row', h('b.grow', cur.titulo), cur.pedidoId ? h('a.small', { href: '#/pedidos/' + cur.pedidoId }, 'ver pedido') : null),
        h('div.bar' + (late ? '.bad' : ''), h('i', { style: { width: Math.round(pc * 100) + '%' } })),
        h('div.small', late ? h('b.bad-t', '⏰ Debería haber terminado ' + whenTxt(finP)) : 'Termina ' + whenTxt(finP) + ' (quedan ' + hrs(left) + ')' + (lf ? ' · según la impresora' : '')),
        h('div.tiny.muted', [cur.cantidad > 1 ? cur.cantidad + ' uds.' : '', cur.gramos ? g(cur.gramos) : '', b ? spoolName(b) : (cur.color ? cur.color : '')].filter(Boolean).join(' · ')),
        edit ? h('div.row.wrap', btn('Terminada', () => finishDialog(cur, 'Terminado'), { cls: 'primary sm', icon: 'check' }), btn('Falló', () => finishDialog(cur, 'Fallido'), { cls: 'sm danger', icon: 'alert' }),
          btn('Volver a la cola', async () => applyJob(await call('trabajos.estado', { id: cur.id, estado: 'En cola' }, 'Devuelta a la cola')), { cls: 'sm ghost' })) : null);
    }
    // v11.2: estado REAL de la Bambu Lab vinculada (por la red local)
    const live = bambuFor(p.id), ext = !cur && !!liveFin(p.id); // imprime algo que no está en la cola del programa
    const liveBox = live ? h('div.live', { style: { background: 'var(--surface-2)', borderRadius: '10px', padding: '8px 10px' } }, h('div.tiny.muted', '📡 En la impresora ahora' + (live.conectada ? '' : ' (sin conexión)')), bambuLine(live)) : null;
    return h('div.card.printer' + (cur ? '.busy' : '') + (late ? '.late' : ''),
      h('div.ph', h('div.pi', maint ? '🔧' : cur ? '🖨️' : '💤'), h('div.grow', h('div.bold', p.nombre), h('div.tiny.muted', p.modelo || '')),
        maint ? pill('Mantenimiento', 'warn') : cur ? pill(late ? 'Revisar' : 'Imprimiendo', late ? 'bad' : 'ok') : ext ? pill(live.estadoTexto || 'Imprimiendo', live.estado === 'pausada' ? 'warn' : 'brand') : pill('Libre'),
        edit ? btn('', () => printerForm(p), { cls: 'ghost icon sm', icon: 'edit', title: 'Editar impresora' }) : null),
      liveBox,
      now || h('div.small.muted', maint ? 'En mantenimiento: no se empiezan impresiones.' : ext ? 'Imprime algo que no está en esta cola (lanzado desde Bambu Studio o la propia impresora). Si es un trabajo de la cola, pulsa «Empezar» en él.' : 'Libre ahora.'),
      h('div.row', h('b.small.grow', 'Cola' + (q.length ? ' · ' + q.length + ' · ' + hrs(qh) : '')), q.length ? h('span.tiny.muted', 'Libre ' + whenTxt(new Date(freeAt(p.id)).toISOString())) : null),
      q.length ? h('div.queue', q.map((j, i) => queueItem(j, i, q, !cur && !maint))) : h('p.tiny.muted', 'Nada en cola.'),
      edit ? btn('Añadir a esta cola', () => jobForm({ impresoraId: p.id }), { cls: 'ghost sm', icon: 'plus' }) : null);
  }
  function queueItem(j, i, q, canStart) {
    const o = j.pedidoId ? byId('pedidos', j.pedidoId) : null;
    const t = o ? timing(o) : null;
    return h('div.qitem',
      h('span.qn', String(i + 1)),
      h('div.qm', h('div.small.bold.ellipsis', j.titulo), h('div.tiny.muted.ellipsis', [hrs(j.horas), j.gramos ? g(j.gramos) : '', j.color || '', j.fechaLimite ? 'límite ' + fdate(j.fechaLimite) : ''].filter(Boolean).join(' · ')),
        t && t.abierto && (t.nivel === 'late' || t.nivel === 'today') ? h('span.tiny.bad-t', '⚠️ ' + t.texto) : null),
      edit ? h('div.qa',
        i > 0 ? btn('▲', async () => { const r = await call('trabajos.mover', { id: j.id, dir: -1 }); if (r) { r.forEach(x => upsertLocal('trabajos', x)); emit(); } }, { cls: 'ghost icon sm', title: 'Subir en la cola' }) : null,
        canStart && i === 0 ? btn('Empezar', () => startDialog(j), { cls: 'sm primary', icon: 'play' }) : canStart ? btn('', () => startDialog(j), { cls: 'ghost icon sm', icon: 'play', title: 'Empezar esta' }) : null,
        btn('', () => jobForm(j), { cls: 'ghost icon sm', icon: 'edit', title: 'Editar' }),
        btn('', async () => { if (!await confirmDlg('Quitar de la cola', '¿Quitar "' + j.titulo + '"? Irá a la papelera.', 'Quitar', true)) return; if (await call('trabajos.borrar', { id: j.id }, 'Quitada de la cola')) { removeLocal('trabajos', j.id); emit(); } }, { cls: 'ghost icon sm', icon: 'trash', title: 'Quitar' })) : null);
  }

  // ---------- Filamento ----------
  function drawSpools() {
    const all = (S.t.bobinas || []).slice();
    if (!all.length) { mount(body, h('div.card', empty('cube', 'No hay bobinas', 'Añade las bobinas que tenéis: al terminar cada impresión se descuentan los gramos solos.', edit ? btn('Añadir bobina', () => spoolForm(), { cls: 'primary', icon: 'plus' }) : null))); return; }
    const cfgT = S.cfg.taller || {}, avisoC = n(cfgT.avisoColorGramos) || 300, aviso = n(cfgT.avisoGramos) || 150;
    const groups = {};
    all.forEach(b => { const k = (b.material || 'PLA') + '|' + (b.color || ''); (groups[k] = groups[k] || []).push(b); });
    const keys = Object.keys(groups).sort();
    const total = all.filter(b => b.estado !== 'Agotada').reduce((a, b) => a + n(b.restante), 0);
    const value = all.filter(b => b.estado !== 'Agotada').reduce((a, b) => a + n(b.restante) / Math.max(1, n(b.peso)) * n(b.precio), 0);
    mount(body,
      h('div.row.wrap.small.muted', { style: { margin: '0 0 10px' } }, h('span', 'En total: ' + (total / 1000).toFixed(2).replace('.', ',') + ' kg'), can('productos.costes') && value ? h('span', '· valor aprox. ' + eur(value)) : null, h('span', '· ' + all.filter(b => b.estado !== 'Agotada').length + ' bobinas')),
      h('div.spools', keys.map(k => {
        const list = groups[k], live = list.filter(b => b.estado !== 'Agotada'), sum = live.reduce((a, b) => a + n(b.restante), 0);
        const [mat, col] = k.split('|'), hex = (list.find(b => b.colorHex) || {}).colorHex;
        return h('div.spool-c' + (sum <= avisoC ? '.low' : ''), h('div.row', dot(hex, true), h('div.grow', h('b', col || '—'), h('div.tiny.muted', mat))),
          h('div', h('b', (sum / 1000).toFixed(2).replace('.', ',') + ' kg'), h('span.tiny.muted', ' · ' + live.length + (live.length === 1 ? ' bobina' : ' bobinas'))),
          sum <= avisoC ? h('div.tiny.bad-t', '⚠️ Queda poco') : null);
      })),
      h('div.card', { style: { marginTop: '14px', padding: '4px 0' } }, keys.map(k => groups[k].sort((a, b) => (a.estado === 'Agotada') - (b.estado === 'Agotada') || n(a.restante) - n(b.restante)).map(b => {
        const pc = Math.max(0, Math.min(1, n(b.restante) / Math.max(1, n(b.peso))));
        return h('div.spool-row', { style: b.estado === 'Agotada' ? { opacity: .5 } : {} }, dot(b.colorHex),
          h('div.grow', h('div.small.bold', spoolName(b)), h('div.tiny.muted', [b.estado, b.ubicacion, b.compra ? 'comprada ' + fdate(b.compra) : '', b.notas].filter(Boolean).join(' · '))),
          h('div.col', { style: { alignItems: 'flex-end', gap: '3px' } }, h('span.small', g(b.restante) + ' / ' + g(b.peso)), h('div.bar' + (n(b.restante) <= aviso ? '.bad' : pc < .35 ? '.warn' : ''), h('i', { style: { width: Math.round(pc * 100) + '%' } }))),
          edit ? btn('', () => weighDialog(b), { cls: 'ghost icon sm', icon: 'edit', title: 'Pesar / corregir lo que queda' }) : null,
          edit ? btn('', () => spoolForm(b), { cls: 'ghost icon sm', icon: 'settings', title: 'Editar bobina' }) : null);
      }))),
      edit ? h('p.tiny.muted', { style: { marginTop: '8px' } }, 'Consejo: pesa la bobina con una báscula de cocina y resta el peso del carrete vacío (unos 200-250 g) para corregir lo que queda.') : null);
  }

  // ---------- Lista de la compra ----------
  function drawShop() {
    const all = (S.t.compras || []).slice().sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
    const pend = all.filter(c => c.estado === 'Pendiente'), done = all.filter(c => c.estado === 'Comprado').slice(0, 15);
    const items = list => list.map(c => h('div.spool-row', dot(c.colorHex),
      h('div.grow', h('div.small.bold', c.unidades + ' × ' + c.material + ' ' + c.color + (c.marca ? ' · ' + c.marca : '')), h('div.tiny.muted', [g(c.peso) + ' c/u', c.precio ? eur(c.precio) + ' c/u' : '', c.tienda, c.notas, c.creadoPor === 'Sistema' ? '🤖 añadido solo' : ''].filter(Boolean).join(' · '))),
      c.estado === 'Pendiente' && edit ? btn('Comprado', () => boughtDialog(c), { cls: 'sm primary', icon: 'check' }) : c.comprado ? h('span.tiny.muted', fdate(c.comprado)) : null,
      c.estado === 'Pendiente' && edit ? btn('', async () => { if (await call('compras.borrar', { id: c.id }, 'Quitado de la lista')) { removeLocal('compras', c.id); emit(); } }, { cls: 'ghost icon sm', icon: 'trash' }) : null));
    mount(body, h('div.card', h('div.row', h('h3.grow', '🛒 Por comprar'), edit ? btn('Añadir', () => shopForm(), { cls: 'sm primary', icon: 'plus' }) : null),
      pend.length ? h('div', { style: { marginTop: '6px' } }, items(pend)) : h('p.small.muted', 'Nada pendiente. Cuando un color baje del mínimo se añadirá solo.'),
      pend.length ? h('div.row', { style: { marginTop: '10px' } }, btn('Copiar la lista', () => { navigator.clipboard.writeText(pend.map(c => '• ' + c.unidades + ' × ' + c.material + ' ' + c.color + (c.marca ? ' (' + c.marca + ')' : '') + ' ' + (n(c.peso) / 1000) + ' kg').join('\n')).then(() => toast('Lista copiada')); }, { cls: 'sm ghost', icon: 'copy' })) : null),
      done.length ? h('details.more', { style: { marginTop: '12px' } }, h('summary', 'Comprado recientemente'), h('div.in', items(done))) : null);
  }

  // ---------- Historial ----------
  function drawHistory() {
    const fin = (S.t.trabajos || []).filter(j => ['Terminado', 'Fallido', 'Cancelado'].includes(j.estado)).sort((a, b) => String(b.fin).localeCompare(String(a.fin)));
    const ms = S.hoy.slice(0, 7);
    const month = fin.filter(j => String(j.fin).slice(0, 7) === ms);
    const byP = printers().map(p => { const l = month.filter(j => j.impresoraId === p.id && j.estado === 'Terminado'); return { p, h: l.reduce((a, j) => a + n(j.horas), 0), n: l.length }; });
    const gm = month.reduce((a, j) => a + n(j.descontado), 0), fails = month.filter(j => j.estado === 'Fallido').length, okN = month.filter(j => j.estado === 'Terminado').length;
    mount(body, h('div.grid.g4.kpis', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: '14px' } },
      byP.map(x => h('div.kpi', h('span.n', hrs(x.h)), h('span.l', x.p.nombre + ' este mes (' + x.n + ')'))),
      h('div.kpi', h('span.n', (gm / 1000).toFixed(2).replace('.', ',') + ' kg'), h('span.l', 'Filamento gastado este mes')),
      h('div.kpi' + (fails ? '.warn' : ''), h('span.n', okN + fails ? Math.round(fails / (okN + fails) * 100) + ' %' : '—'), h('span.l', 'Impresiones fallidas'))),
      fin.length ? h('div.card', h('div.list', fin.slice(0, 60).map(j => { const p = byId('impresoras', j.impresoraId); return h('div.item', h('span', j.estado === 'Terminado' ? '✅' : j.estado === 'Fallido' ? '❌' : '⏹️'),
        h('div.grow', h('div.small.bold', j.titulo), h('div.tiny.muted', [p ? p.nombre : '', hrs(j.horas), j.descontado ? g(j.descontado) : '', j.fin ? new Date(j.fin).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''].filter(Boolean).join(' · '))),
        j.pedidoId ? h('a.small', { href: '#/pedidos/' + j.pedidoId }, 'pedido') : null); }))) : h('div.card', h('p.muted', 'Aún no hay impresiones terminadas.')));
  }

  draw();
  const timer = setInterval(() => { if (st.tab === 'impresoras' && document.visibilityState === 'visible') drawPrinters(); }, 60000);
  return { update: draw, params: p => { if (p && p[0] && p[0] !== st.tab) { st.tab = p[0]; draw(); } }, destroy: () => clearInterval(timer) };
}

// ================= Formularios =================
export function jobForm(j, pedido) {
  if (!can('taller.editar')) return requestAccess('taller.editar', 'taller');
  const isNew = !j || !j.id; j = Object.assign({}, j || {});
  if (!printers().length) return toast('Primero añade una impresora en Taller.', 'warn');
  const ord = pedido || (j.pedidoId ? byId('pedidos', j.pedidoId) : null) || ((j.lote || []).length ? byId('pedidos', j.lote[0]) : null);
  // v11: lote = varios pedidos del mismo producto en una sola impresión
  const lote = (j.lote || []).length > 1 ? j.lote.map(id => byId('pedidos', id)).filter(Boolean) : null;
  const loteQ = lote ? lote.reduce((a, o) => a + (n(o.cantidad) || 1), 0) : 0;
  const calcOf = o => { if (!o) return null; const p = o.productoId ? byId('productos', o.productoId) : null; const name = p ? p.nombre : o.producto; return (S.t.calculadora || []).find(c => CL.norm(c.nombre) === CL.norm(name)) || null; };
  // v11: producto de la impresión (para stock): sus horas y gramos salen de la calculadora
  const prodSel = sel([{ v: '', t: '— Sin producto (pruebas, piezas sueltas) —' }].concat(S.t.productos.filter(p => p.estado !== 'Archivado').slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(p => ({ v: p.id, t: p.nombre }))), j.productoId || (ord && ord.productoId) || '');
  const openOrders = S.t.pedidos.filter(o => timing(o).abierto).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const best = bestPrinter();
  const f = {
    impresoraId: sel(printers().map(p => ({ v: p.id, t: p.nombre + (p.estado === 'Mantenimiento' ? ' (mantenimiento)' : ' · libre ' + whenTxt(new Date(freeAt(p.id)).toISOString())) })), j.impresoraId || (best && best.id)),
    pedidoId: sel([{ v: '', t: '— Ninguno (stock, pruebas…) —' }].concat(openOrders.map(o => ({ v: o.id, t: 'nº ' + o.numero + ' · ' + (o.cantidad > 1 ? o.cantidad + '× ' : '') + o.producto + ' · ' + o.cliente }))), ord ? ord.id : (j.pedidoId || '')),
    titulo: inp({ value: j.titulo || '', placeholder: 'Ej.: Maceta luna (2 piezas)' }),
    cantidad: inp({ type: 'number', min: 1, step: 1, value: j.cantidad || (ord ? ord.cantidad : 1) }),
    horas: inp({ type: 'number', min: 0.1, step: 0.1, value: j.horas || '', placeholder: 'Ej.: 3,5' }),
    gramos: inp({ type: 'number', min: 0, step: 1, value: j.gramos ?? '', placeholder: 'Ej.: 120' }),
    material: sel(MATERIALES, j.material || 'PLA'),
    color: inp({ value: j.color || (ord && ord.color) || '', list: 'dl-colores', placeholder: 'Ej.: Blanco' }),
    bobinaId: h('select.inp'),
    fechaLimite: inp({ type: 'date', value: j.fechaLimite || '' }),
    notas: area({ value: j.notas || '', placeholder: 'Placa, relleno, soportes, orientación…', style: { minHeight: '56px' } })
  };
  const hint = h('div.tiny.muted');
  const drawSpoolSel = () => {
    const keep = f.bobinaId.value || j.bobinaId || '';
    mount(f.bobinaId, spoolOptions(f.color.value, f.material.value).map(o => h('option', { value: o.v }, o.t)));
    const sug = keep || (bestSpool(f.color.value, f.material.value, f.gramos.value) || {}).id || '';
    f.bobinaId.value = sug;
    const b = byId('bobinas', f.bobinaId.value);
    hint.textContent = b && n(f.gramos.value) > n(b.restante) ? '⚠️ En esta bobina quedan ' + g(b.restante) + ' y la impresión necesita ' + g(f.gramos.value) + ': prepara otra.' : '';
  };
  const fromOrder = (force) => {
    const o = byId('pedidos', f.pedidoId.value);
    if (!o) return;
    const c = calcOf(o), q = n(f.cantidad.value) || n(o.cantidad) || 1;
    if (force || !f.titulo.value) f.titulo.value = 'Pedido nº ' + o.numero + ' · ' + o.producto;
    if (c && n(c.horas) && (force || !f.horas.value)) f.horas.value = Math.round(n(c.horas) * q * 10) / 10;
    if (c && n(c.gramos) && (force || !f.gramos.value)) f.gramos.value = Math.round(n(c.gramos) * q);
    if (o.color && (force || !f.color.value)) f.color.value = o.color;
    if (force) { f.cantidad.value = o.cantidad || 1; f.fechaLimite.value = timing(o).limite || ''; }
    drawSpoolSel();
  };
  f.pedidoId.addEventListener('change', () => { fromOrder(true); const o = byId('pedidos', f.pedidoId.value); if (o && o.productoId) prodSel.value = o.productoId; prodBox.style.display = f.pedidoId.value ? 'none' : ''; });
  const fromProduct = () => {
    if (f.pedidoId.value) return;
    const p = byId('productos', prodSel.value); if (!p) return;
    const c = (S.t.calculadora || []).find(x => CL.norm(x.nombre) === CL.norm(p.nombre)), q = n(f.cantidad.value) || 1;
    f.titulo.value = p.nombre + (q > 1 ? ' × ' + q : '') + ' (para stock)';
    if (c && n(c.horas)) f.horas.value = Math.round(n(c.horas) * q * 10) / 10;
    if (c && n(c.gramos)) f.gramos.value = Math.round(n(c.gramos) * q);
    if (p.color && !f.color.value) f.color.value = p.color;
    drawSpoolSel();
  };
  prodSel.addEventListener('change', fromProduct);
  f.cantidad.addEventListener('change', fromProduct);
  const prodBox = h('div.full', field('Producto (entra al stock al terminar)', prodSel));
  prodBox.style.display = f.pedidoId.value ? 'none' : '';
  f.cantidad.addEventListener('change', () => { const o = byId('pedidos', f.pedidoId.value), c = calcOf(o); if (c) { const q = n(f.cantidad.value) || 1; if (n(c.horas)) f.horas.value = Math.round(n(c.horas) * q * 10) / 10; if (n(c.gramos)) f.gramos.value = Math.round(n(c.gramos) * q); drawSpoolSel(); } });
  [f.color, f.material].forEach(x => x.addEventListener('change', drawSpoolSel));
  f.gramos.addEventListener('input', drawSpoolSel);
  if (ord && isNew && lote) { fromOrder(true); f.cantidad.value = loteQ; f.titulo.value = 'Lote · ' + ord.producto + ' × ' + loteQ + ' (nº ' + lote.map(o => o.numero).join(', ') + ')'; const c = calcOf(ord); if (c && n(c.horas)) f.horas.value = Math.round(n(c.horas) * loteQ * 10) / 10; if (c && n(c.gramos)) f.gramos.value = Math.round(n(c.gramos) * loteQ); f.pedidoId.disabled = true; drawSpoolSel(); }
  else if (ord && isNew) fromOrder(true); else if (isNew && j.productoId && !j.horas) setTimeout(fromProduct); else drawSpoolSel();
  const calcInfo = h('div.tiny.muted');
  const o0 = byId('pedidos', f.pedidoId.value); if (o0 && !calcOf(o0) && isNew) calcInfo.textContent = 'Este producto no tiene horas ni gramos guardados en su calculadora de costes: escríbelos a mano.';
  const msg = h('p.bad-t');
  const colors = [...new Set((S.t.bobinas || []).map(b => b.color).filter(Boolean).concat(COLORES))];
  const m = modal(isNew ? 'Nueva impresión' : 'Editar impresión', h('div.col', h('datalist', { id: 'dl-colores' }, colors.map(c => h('option', { value: c }))),
    lote ? h('div.pi-tip.ok', '🧩 Lote de ' + lote.length + ' pedidos (' + loteQ + ' uds.) en una sola impresión: al empezar y al terminar avanzan todos.') : null,
    h('div.form', field('Impresora *', f.impresoraId), field('Pedido', f.pedidoId), prodBox, field('Qué se imprime *', f.titulo, null, 'full'), h('div.full', calcInfo),
      field('Cantidad', f.cantidad), field('Horas de impresión *', f.horas, 'Del laminador (Bambu Studio / Orca).'), field('Gramos', f.gramos, 'Se descuentan de la bobina al terminar.'), field('Material', f.material),
      field('Color', f.color), field('Bobina', f.bobinaId, null, 'full'), h('div.full', hint), field('Fecha límite', f.fechaLimite), field('Notas', f.notas, null, 'full')), msg),
    close => [btn('Cancelar', close), btn(isNew ? 'Añadir a la cola' : 'Guardar', async ev => {
      msg.textContent = '';
      const datos = { lote: lote ? lote.map(o => o.id) : undefined, impresoraId: f.impresoraId.value, pedidoId: f.pedidoId.value, productoId: f.pedidoId.value ? undefined : prodSel.value, titulo: f.titulo.value.trim(), cantidad: Number(f.cantidad.value) || 1, horas: Number(String(f.horas.value).replace(',', '.')),
        gramos: f.gramos.value === '' ? 0 : Number(f.gramos.value), material: f.material.value, color: f.color.value.trim(), bobinaId: f.bobinaId.value, fechaLimite: f.fechaLimite.value, notas: f.notas.value.trim() };
      if (!datos.titulo && !datos.pedidoId) return msg.textContent = 'Escribe qué se imprime.';
      if (!(datos.horas > 0)) return msg.textContent = 'Indica las horas de impresión (mira el laminador).';
      const b = ev.target.closest('button'); b.disabled = true;
      try {
        const r = await api('trabajos.guardar', isNew ? { datos } : { id: j.id, datos });
        upsertLocal('trabajos', r); emit(); close();
        toast(isNew ? 'Añadida a la cola de la ' + (byId('impresoras', r.impresoraId) || {}).nombre : 'Impresión guardada', 'ok');
      } catch (e) { msg.textContent = e.message; b.disabled = false; }
    }, { cls: 'primary', icon: 'check' })], { size: 'wide' });
  return m;
}

export function startDialog(j) {
  const p = byId('impresoras', j.impresoraId);
  const bob = h('select.inp');
  mount(bob, spoolOptions(j.color, j.material, j.bobinaId).map(o => h('option', { value: o.v }, o.t)));
  bob.value = j.bobinaId || (bestSpool(j.color, j.material, j.gramos) || {}).id || '';
  const o = j.pedidoId ? byId('pedidos', j.pedidoId) : null;
  const mark = h('input', { type: 'checkbox', checked: true });
  modal('Empezar en la ' + (p ? p.nombre : 'impresora'), h('div.col',
    h('p', h('b', j.titulo), h('br'), h('span.small.muted', 'Tarda ' + hrs(j.horas) + ' · terminará ' + whenTxt(new Date(Date.now() + n(j.horas) * 3600000).toISOString()))),
    field('Bobina que pones', bob, 'Al terminar se descontarán ' + g(j.gramos) + ' de esta bobina.'),
    o && PRE_PRINT[phase(o)] ? h('label.check.small', mark, 'Pasar el pedido nº ' + o.numero + ' a "' + (CL.stateOfPhase(S.cfg.pedidos, 'impresion') || 'En impresión') + '"') : null),
    close => [btn('Cancelar', close), btn('Empezar', async () => { close(); applyJob(await call('trabajos.estado', { id: j.id, estado: 'Imprimiendo', bobinaId: bob.value, marcarPedido: mark.checked }, '▶️ Imprimiendo en la ' + (p ? p.nombre : 'impresora'))); }, { cls: 'primary', icon: 'play' })], { size: 'narrow' });
}
export function finishDialog(j, estado) {
  const ok = estado === 'Terminado';
  const grams = inp({ type: 'number', min: 0, step: 1, value: j.gramos || 0 });
  const bob = h('select.inp');
  mount(bob, spoolOptions(j.color, j.material, j.bobinaId).map(o => h('option', { value: o.v }, o.t)));
  bob.value = j.bobinaId || '';
  const o = j.pedidoId ? byId('pedidos', j.pedidoId) : null;
  const others = o ? (S.t.trabajos || []).filter(x => x.pedidoId === o.id && x.id !== j.id && OPEN[x.estado]) : [];
  const mark = h('input', { type: 'checkbox', checked: true }), again = h('input', { type: 'checkbox', checked: true });
  // v11: lo impreso entra al stock (si era para un pedido, ese pedido ya lo tiene apartado)
  const prod = j.productoId ? byId('productos', j.productoId) : null, pname = prod ? prod.nombre : o ? o.producto : '';
  const units = inp({ type: 'number', min: 0, step: 1, value: n(j.cantidad) || 1, style: { width: '90px' } });
  const stockRow = ok && pname ? h('div.row.wrap.small', '📦 Entran al stock', units, h('span', 'ud. de ' + pname + (o ? ' (apartadas para el pedido nº ' + o.numero + ')' : ''))) : null;
  // v11.4: «¿Cómo salió?» y, si sale mal, la pérdida (pendiente de recuperar; nunca se suma sola a un pedido)
  const al = j.alerta || {};
  let val = ok ? '' : 'mal';
  const motivo = sel(CL.FALLO_MOTIVOS.map(x => ({ v: x, t: x })), /filamento/i.test(al.texto || '') ? 'Falta de filamento' : ok ? 'Pieza fea o con defectos' : CL.FALLO_MOTIVOS[0]);
  const prog = inp({ type: 'number', min: 0, max: 100, step: 1, value: al.progreso ?? '', placeholder: '%', style: { width: '90px' } });
  const reg = h('input', { type: 'checkbox', checked: true }), quitar = h('input', { type: 'checkbox', checked: true });
  const badBox = h('div');
  const drawBad = () => mount(badBox, val === 'mal' ? h('div.card.flat', h('div.form', field('Motivo', motivo), !ok ? field('Llegó al (%)', prog, al.progreso !== undefined && al.progreso !== '' ? 'Lo dijo la impresora' : 'Aproximado') : null),
    h('label.check.small', reg, 'Apuntar la pérdida (coste estimado, pendiente de recuperar)'), ok ? h('label.check.small', quitar, 'La pieza no vale: no la metas en el stock') : null) : null);
  const rateSeg = ok ? h('div', h('div.lbl', '¿Cómo salió?'), h('div.seg', [['muy_bien', 'Muy bien'], ['bien', 'Bien'], ['mal', 'Mal']].map(([v, t]) => h('button' + (val === v ? '.on' : ''), { type: 'button', onclick: e => { val = v; [...e.target.parentNode.children].forEach(b => b.classList.toggle('on', b === e.target)); drawBad(); } }, t)))) : null;
  drawBad();
  modal(ok ? '✅ Impresión terminada' : '❌ La impresión falló', h('div.col',
    h('p', h('b', j.titulo)),
    h('div.form', field(ok ? 'Gramos usados' : 'Gramos gastados en el intento', grams, ok ? 'Los del laminador; corrígelo si hiciste cambios.' : 'Aproximado: lo que llegó a imprimir.'), field('De qué bobina', bob)),
    rateSeg, badBox,
    stockRow,
    ok && o && !others.length && PRE_FAB[phase(o)] ? h('label.check.small', mark, 'Pasar el pedido nº ' + o.numero + ' a "' + (CL.stateOfPhase(S.cfg.pedidos, 'postpro') || 'Acabado') + '"') : null,
    ok && o && others.length ? h('p.tiny.muted', 'Al pedido nº ' + o.numero + ' aún le quedan ' + others.length + ' impresión(es).') : null,
    !ok ? h('label.check.small', again, 'Volver a ponerla la primera de la cola') : null),
    close => [btn('Cancelar', close), btn(ok ? 'Guardar' : 'Guardar fallo', async () => {
      close();
      const r = await call('trabajos.estado', { id: j.id, estado, gramos: grams.value === '' ? 0 : Number(grams.value), bobinaId: bob.value, marcarPedido: mark.checked, reencolar: !ok && again.checked, stock: stockRow ? Math.max(0, Math.round(n(units.value))) : undefined,
        valoracion: val || undefined, motivo: val === 'mal' ? motivo.value : undefined, progreso: !ok && prog.value !== '' ? Number(prog.value) : undefined, registrarPerdida: val === 'mal' ? reg.checked : undefined, quitarStock: ok && val === 'mal' ? quitar.checked : undefined }, ok ? 'Impresión terminada' + (bob.value && Number(grams.value) ? ' · descontados ' + g(grams.value) : '') : 'Fallo guardado');
      if (!r) return;
      applyJob(r);
      if (r.fallo) { toast('Pérdida apuntada (' + (can('productos.costes') ? eur(r.fallo.coste) + ', ' : '') + 'pendiente de recuperar)', 'warn'); import('../store.js').then(m => m.pull()); }
      if (r.pedido && phase(r.pedido) === 'postpro') toast('📦 Pedido nº ' + r.pedido.numero + ' → ' + r.pedido.estado, 'ok');
      if (r.stock && !r.pedido) toast('📦 ' + r.stock.producto + ': ' + r.stock.fisico + ' en la estantería', 'ok');
      if (r.stock) import('../store.js').then(m => m.pull());
    }, { cls: ok ? 'primary' : 'danger solid', icon: 'check' })], { size: 'narrow' });
}

// ---------- v11.4: avisos de la Bambu y «¿Cómo salió?» de lo terminado ----------
export function rateBlock(edit) {
  const since = Date.now() - 14 * 86400000;
  const toRate = (S.t.trabajos || []).filter(j => j.estado === 'Terminado' && !j.valoracion && j.fin && new Date(j.fin).getTime() > since).sort((a, b) => String(b.fin).localeCompare(String(a.fin))).slice(0, 8);
  const alerts = (S.t.trabajos || []).filter(j => j.alerta && j.alerta.texto && OPEN[j.estado]);
  if (!toRate.length && !alerts.length) return null;
  return h('div.card', { style: { marginBottom: '14px', borderColor: 'var(--warn)' } },
    alerts.map(j => h('div.item', { style: { cursor: 'default' } }, h('span', '⚠️'), h('div.grow', h('div.small.bold', (j.alerta.impresora || 'Impresora') + ': ' + j.alerta.texto + (j.alerta.progreso !== '' && j.alerta.progreso !== undefined ? ' al ' + j.alerta.progreso + ' %' : '')), h('div.tiny.muted', '«' + j.titulo + '» · ¿Cómo ha salido?')),
      edit ? btn('Ha fallado', () => finishDialog(j, 'Fallido'), { cls: 'sm danger' }) : null, edit ? btn('Sigue bien', async () => applyJob(await call('trabajos.alerta', { id: j.id, limpiar: true })), { cls: 'sm ghost' }) : null)),
    toRate.length ? h('div', { style: { marginTop: alerts.length ? '8px' : 0 } }, h('b.small', '¿Cómo salieron estas impresiones?'),
      toRate.map(j => h('div.item', { style: { cursor: 'default' } }, h('div.grow.small', j.titulo, h('span.tiny.muted', ' · ' + new Date(j.fin).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))),
        edit ? h('div.seg.sm', [['muy_bien', 'Muy bien'], ['bien', 'Bien'], ['mal', 'Mal']].map(([v, t]) => h('button', { onclick: () => v === 'mal' ? badDialog(j) : (async () => applyJob(await call('trabajos.valorar', { id: j.id, valoracion: v }, 'Valorada')))() }, t))) : null))) : null);
}
function badDialog(j) {
  const motivo = sel(CL.FALLO_MOTIVOS.map(x => ({ v: x, t: x })), 'Pieza fea o con defectos'), quitar = h('input', { type: 'checkbox', checked: true }), again = h('input', { type: 'checkbox', checked: false });
  modal('La impresión salió mal', h('div.col', h('p', h('b', j.titulo)), field('Motivo', motivo), h('label.check.small', quitar, 'La pieza no vale: sácala del stock'), h('label.check.small', again, 'Volver a ponerla en la cola'),
    h('p.tiny.muted', 'Se apunta la pérdida con su coste estimado. Queda PENDIENTE de recuperar: al preparar un pedido se te preguntará si quieres incluirla.')),
    close => [btn('Cancelar', close), btn('Guardar', async () => { close(); const r = await call('trabajos.valorar', { id: j.id, valoracion: 'mal', motivo: motivo.value, quitarStock: quitar.checked, reencolar: again.checked }, 'Pérdida apuntada'); applyJob(r); import('../store.js').then(m => m.pull()); }, { cls: 'danger solid' })], { size: 'narrow' });
}

export function printerForm(p) {
  if (!can('taller.editar')) return requestAccess('taller.editar', 'taller');
  const isNew = !p; p = p || {};
  const f = { nombre: inp({ value: p.nombre || '', placeholder: 'Ej.: P1P' }), modelo: inp({ value: p.modelo || '', placeholder: 'Ej.: Bambu Lab P1P' }), estado: sel(['Disponible', 'Mantenimiento'], p.estado || 'Disponible'), notas: area({ value: p.notas || '', placeholder: 'Boquilla, placa, último mantenimiento…' }) };
  const msg = h('p.bad-t');
  modal(isNew ? 'Nueva impresora' : 'Editar ' + p.nombre, h('div.col', h('div.form', field('Nombre *', f.nombre), field('Modelo', f.modelo), field('Estado', f.estado), field('Notas', f.notas, null, 'full')), msg),
    close => [!isNew ? btn('Borrar', async () => { if (!await confirmDlg('Borrar impresora', '¿Borrar la ' + p.nombre + '? Irá a la papelera.', 'Borrar', true)) return; if (await call('impresoras.borrar', { id: p.id }, 'Impresora borrada')) { removeLocal('impresoras', p.id); emit(); close(); } }, { cls: 'ghost danger', icon: 'trash' }) : null, h('span.grow'), btn('Cancelar', close),
      btn('Guardar', async () => { msg.textContent = ''; try { const r = await api('impresoras.guardar', { id: p.id, datos: { nombre: f.nombre.value, modelo: f.modelo.value, estado: f.estado.value, notas: f.notas.value } }); upsertLocal('impresoras', r); emit(); close(); toast('Impresora guardada', 'ok'); } catch (e) { msg.textContent = e.message; } }, { cls: 'primary' })], { size: 'narrow' });
}

export function spoolForm(b) {
  if (!can('taller.editar')) return requestAccess('taller.editar', 'taller');
  const isNew = !b; b = b || {};
  const colors = [...new Set((S.t.bobinas || []).map(x => x.color).filter(Boolean).concat(COLORES))];
  const f = { material: sel(MATERIALES, b.material || 'PLA'), marca: inp({ value: b.marca || '', placeholder: 'Ej.: Geeetech, Bambu, eSun' }), color: inp({ value: b.color || '', list: 'dl-colores2', placeholder: 'Ej.: Blanco' }),
    colorHex: inp({ type: 'color', value: b.colorHex || '#cccccc', style: { width: '60px', padding: '2px' } }), peso: inp({ type: 'number', min: 0, step: 50, value: b.peso || 1000 }), restante: inp({ type: 'number', min: 0, step: 1, value: b.restante ?? b.peso ?? 1000 }),
    precio: inp({ type: 'number', min: 0, step: 0.01, value: b.precio ?? ((S.cfg.precios || {}).costeKg || '') }), unidades: inp({ type: 'number', min: 1, max: 50, step: 1, value: 1 }), ubicacion: inp({ value: b.ubicacion || '', placeholder: 'Ej.: caja seca 1' }), notas: inp({ value: b.notas || '' }) };
  let hexTouched = !!b.colorHex;
  f.colorHex.addEventListener('input', () => { hexTouched = true; });
  f.color.addEventListener('change', () => { if (!hexTouched) { const hx = colorHexOf(f.color.value); if (hx) f.colorHex.value = hx; } });
  const msg = h('p.bad-t');
  modal(isNew ? 'Añadir bobinas' : 'Editar bobina', h('div.col', h('datalist', { id: 'dl-colores2' }, colors.map(c => h('option', { value: c }))),
    h('div.form', field('Material', f.material), field('Marca', f.marca), field('Color *', f.color), field('Color (muestra)', f.colorHex), field('Peso de filamento (g)', f.peso, 'Normalmente 1000 g.'), field('Queda (g)', f.restante),
      field('Precio por bobina (€)', f.precio), isNew ? field('¿Cuántas iguales?', f.unidades) : field('Ubicación', f.ubicacion), isNew ? field('Ubicación', f.ubicacion) : null, field('Notas', f.notas, null, 'full')), msg),
    close => [!isNew ? btn('Borrar', async () => { if (!await confirmDlg('Borrar bobina', '¿Borrar ' + spoolName(b) + '? Irá a la papelera.', 'Borrar', true)) return; if (await call('bobinas.borrar', { id: b.id }, 'Bobina borrada')) { removeLocal('bobinas', b.id); emit(); close(); } }, { cls: 'ghost danger', icon: 'trash' }) : null, h('span.grow'), btn('Cancelar', close),
      btn('Guardar', async () => {
        msg.textContent = '';
        const datos = { material: f.material.value, marca: f.marca.value, color: f.color.value, colorHex: f.colorHex.value === '#cccccc' && !hexTouched ? '' : f.colorHex.value, peso: Number(f.peso.value), restante: Number(f.restante.value), precio: f.precio.value === '' ? '' : Number(f.precio.value), ubicacion: f.ubicacion.value, notas: f.notas.value };
        if (!datos.color.trim()) return msg.textContent = 'Indica el color.';
        try { const r = await api('bobinas.guardar', isNew ? { datos, unidades: Number(f.unidades.value) || 1 } : { id: b.id, datos }); r.forEach(x => upsertLocal('bobinas', x)); emit(); close(); toast(isNew ? r.length + (r.length === 1 ? ' bobina añadida' : ' bobinas añadidas') : 'Bobina guardada', 'ok'); } catch (e) { msg.textContent = e.message; }
      }, { cls: 'primary' })], { size: 'wide' });
}
async function weighDialog(b) {
  const v = await promptDlg('¿Cuánto queda?', spoolName(b) + ' · gramos de filamento que quedan (sin el carrete)', String(Math.round(n(b.restante))), { type: 'number' });
  if (v === null || v === undefined || v === '') return;
  try { const r = await api('bobinas.guardar', { id: b.id, datos: { restante: Number(String(v).replace(',', '.')) } }); r.forEach(x => upsertLocal('bobinas', x)); emit(); toast('Actualizado', 'ok'); } catch (e) { handleError(e, 'taller'); }
}
function shopForm() {
  const colors = [...new Set((S.t.bobinas || []).map(x => x.color).filter(Boolean).concat(COLORES))];
  const f = { material: sel(MATERIALES, 'PLA'), color: inp({ list: 'dl-colores3', placeholder: 'Ej.: Verde' }), marca: inp({ placeholder: 'Opcional' }), unidades: inp({ type: 'number', min: 1, value: 1 }), peso: inp({ type: 'number', min: 0, step: 50, value: 1000 }), precio: inp({ type: 'number', min: 0, step: 0.01, placeholder: 'Opcional' }), tienda: inp({ placeholder: 'Ej.: Amazon, web de Bambu' }), notas: inp({}) };
  const msg = h('p.bad-t');
  modal('Añadir a la lista de la compra', h('div.col', h('datalist', { id: 'dl-colores3' }, colors.map(c => h('option', { value: c }))), h('div.form', field('Material', f.material), field('Color *', f.color), field('Marca', f.marca), field('Unidades', f.unidades), field('Gramos por bobina', f.peso), field('Precio por bobina (€)', f.precio), field('Tienda', f.tienda), field('Notas', f.notas)), msg),
    close => [btn('Cancelar', close), btn('Añadir', async () => {
      if (!f.color.value.trim()) return msg.textContent = 'Indica el color.';
      try { const r = await api('compras.guardar', { datos: { material: f.material.value, color: f.color.value, marca: f.marca.value, unidades: Number(f.unidades.value) || 1, peso: Number(f.peso.value) || 1000, precio: f.precio.value === '' ? '' : Number(f.precio.value), tienda: f.tienda.value, notas: f.notas.value } }); upsertLocal('compras', r); emit(); close(); toast('Añadido a la lista', 'ok'); } catch (e) { msg.textContent = e.message; }
    }, { cls: 'primary' })]);
}
async function boughtDialog(c) {
  const v = await promptDlg('Comprado', c.unidades + ' × ' + c.material + ' ' + c.color + ' · precio por bobina (€, opcional)', c.precio ? String(c.precio) : '', { type: 'number' });
  if (v === null || v === undefined) return;
  const r = await call('compras.comprado', { id: c.id, precio: v === '' ? '' : Number(String(v).replace(',', '.')) }, '🎉 ' + c.unidades + ' bobina(s) añadidas al inventario');
  if (r) { upsertLocal('compras', r.compra); r.bobinas.forEach(b => upsertLocal('bobinas', b)); emit(); }
}
