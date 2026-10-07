// ================= v11 · HOY: centro de producción y modo taller en una sola pantalla =================
// Tres columnas, sin menús: QUÉ IMPRIMIR · QUÉ PREPARAR · QUÉ ENVIAR. Arriba, las impresoras
// (qué imprimen, cuánto falta), el filamento reservado por la cola y las incidencias.
// "Modo taller" la pone a pantalla completa con botones grandes (para la tablet o el PC del taller).
import { h, mount, icon, btn, toast, pill, empty, fdate } from '../ui.js';
import { bambuFor } from '../bambu.js';
import { bambuLine } from './centro_impresion.js';
import { S, can, byId, timing, stateColor, mutate, upsertLocal, emit } from '../store.js';
import { go, handleError } from '../app.js';
import { problemasEtiquetas, textoProblema, reintentar } from '../autoimpresion.js';
import * as E from '../envio.js';
import { botonVoz } from '../voz.js';

const CL = window.CL;
const n = v => Number(v) || 0;
const ph = o => CL.phaseOf(S.cfg.pedidos, o.estado);
const sk = { op: 'cd.operario' };
const isOp = () => { try { return localStorage.getItem(sk.op) === '1'; } catch (e) { return false; } };
function setOp(v) { try { localStorage.setItem(sk.op, v ? '1' : '0'); } catch (e) { } document.body.classList.toggle('operario', !!v); }

// Piezas libres en la estantería para un pedido (mismo criterio que el servidor)
function free(o) {
  const k = CL.norm(o.producto); let fab = 0, out = 0, held = 0;
  (S.t.fabricacion || []).forEach(r => { if (CL.norm(r.producto) === k) fab += n(r.unidades); });
  S.t.pedidos.forEach(x => { if (x.id === o.id || CL.norm(x.producto) !== k) return; const p = ph(x), q = n(x.cantidad) || 1; if (p === 'enviado' || p === 'entregado') out += q; else if (p === 'postpro' || p === 'listo') held += q; });
  return fab - out - held;
}

// v16 · Revisión automática (datos que faltan, estimaciones e incoherencias). Se pide como mucho cada 2 minutos.
let revCache = null, revT = 0;
export async function revision(forzar) {
  if (!forzar && revCache && Date.now() - revT < 120000) return revCache;
  const { api } = await import('../store.js');
  try { revCache = await api('asistente.revision', {}, { quiet: true }); revT = Date.now(); } catch (e) { revCache = revCache || { lista: [], falta: 0, estimado: 0, incoherencia: 0 }; }
  return revCache;
}
export const REV_ICO = { incoherencia: '❗', falta: '❓', estimado: '≈' };
function pintaRevision(box) {
  return; // v16.2: fuera de «Hoy» (liaba). Lo que falte por completar está, plegado, en Inventario → «Revisión».
  // eslint-disable-next-line no-unreachable
  revision().then(r => {
    const n = r.falta + r.incoherencia; if (!n || !box.isConnected) return;
    const urg = r.lista.filter(x => x.nivel !== 'estimado');
    mount(box, h('details.more.hoy-rev-d', h('summary', '🧠 ' + n + (n === 1 ? ' cosa por completar' : ' cosas por completar') + ' (lo he revisado yo: no hace falta que busques)'),
      h('div.in', urg.slice(0, 8).map(x => h('div.rev-i.' + x.nivel, { onclick: () => go(x.enlace.indexOf('pedido:') === 0 ? 'pedidos/' + x.enlace.slice(7) : (x.enlace || 'inventario')) }, h('span', REV_ICO[x.nivel]), h('span.grow.small', x.texto))),
        r.estimado ? h('p.tiny.muted', 'Además hay ' + r.estimado + ' datos estimados (metros de cinta, bobinas abiertas…). Están en Inventario.') : null)));
  });
}
// v16 · Avisos de stock: materiales (bajo / crítico / agotado) y filamento por material + color
export function avisosStock() {
  const lleno = v => v !== '' && v !== null && v !== undefined && isFinite(Number(v)), out = [];
  const avisoCajas = n(((S.cfg || {}).embalaje || {}).avisoCajas);
  (S.t.materiales || []).forEach(m => {
    if (CL.norm(m.activo) === 'no' || !lleno(m.stock)) return;
    const st = n(m.stock), min = lleno(m.stockMin) ? n(m.stockMin) : (m.tipo === 'caja' ? avisoCajas : null), cri = lleno(m.stockCritico) ? n(m.stockCritico) : (min === null ? null : Math.floor(min / 2));
    const nivel = st <= 0 ? 'agotado' : (cri !== null && st <= cri ? 'critico' : (min !== null && st <= min ? 'bajo' : ''));
    if (nivel && (min !== null || st <= 0 && lleno(m.stockMin))) out.push({ tipo: 'material', id: m.id, nombre: m.nombre, nivel, queda: Math.round(st * 100) / 100, unidad: m.unidad || 'ud' });
  });
  const aviso = n(((S.cfg || {}).taller || {}).avisoColorGramos) || 300, g = {};
  (S.t.bobinas || []).forEach(b => { const k = (b.material || 'PLA') + ' ' + (b.color || ''); g[k] = (g[k] || 0) + Math.max(0, n(b.restante)); });
  Object.keys(g).forEach(k => { const q = g[k]; if (q <= aviso) out.push({ tipo: 'filamento', id: k, nombre: k, nivel: q <= 0 ? 'agotado' : (q <= aviso / 2 ? 'critico' : 'bajo'), queda: Math.round(q), unidad: 'g' }); });
  const ord = { agotado: 0, critico: 1, bajo: 2 };
  return out.sort((a, b) => ord[a.nivel] - ord[b.nivel]);
}

export function render(el) {
  setOp(isOp());
  const head = h('div.page-head');
  const top = h('div.hoy-top');
  const cols = h('div.hoy-cols');
  el.append(head, top, cols);
  let T = null;
  const draw = () => drawSiCambia(true);
  const draw0 = async () => {
    T = T || await import('./taller.js');
    const P = await import('./pedidos.js');
    const ordersT = S.t.pedidos.map(o => ({ o, t: timing(o) })).filter(x => x.t.abierto);
    const byLimit = (a, b) => String(a.t.limite || '9').localeCompare(String(b.t.limite || '9'));
    const jobs = S.t.trabajos || [];
    const inJob = o => jobs.some(j => j.estado !== 'Cancelado' && j.estado !== 'Fallido' && ((j.lote || []).includes(o.id) || j.pedidoId === o.id));
    const toPrint = ordersT.filter(x => ph(x.o) === 'confirmado' && !inJob(x.o)).sort(byLimit);
    const printing = ordersT.filter(x => ph(x.o) === 'impresion');
    const toPrep = ordersT.filter(x => ph(x.o) === 'postpro' || ph(x.o) === 'empaquetar').sort(byLimit); // v11.4: + «Empaquetar»
    // v16: el flujo entero de un vistazo (llega → preparar → imprimir → mesa → empaquetar → enviar → completado → cobrado)
    const enMesa = toPrep.filter(x => ph(x.o) === 'postpro'), aEmpaquetar = toPrep.filter(x => ph(x.o) === 'empaquetar');
    const vivos = S.t.pedidos.filter(o => ph(o) !== 'cancelado'), cobrado = o => /^s/i.test(String(o.cobrado || ''));
    const nuevos = ordersT.filter(x => ph(x.o) === 'reserva').sort(byLimit);
    const enviados = vivos.filter(o => ph(o) === 'enviado'), completados = vivos.filter(o => ph(o) === 'entregado');
    const porCobrar = enviados.concat(completados).filter(o => !cobrado(o)).sort((a, b) => String(a.fechaEnvio || a.fecha).localeCompare(String(b.fechaEnvio || b.fecha)));
    const mesHoy = String(S.hoy || new Date().toISOString()).substring(0, 7), cobradosMes = vivos.filter(o => cobrado(o) && String(o.cobradoEn || '').substring(0, 7) === mesHoy);
    const totalCobrado = cobradosMes.reduce((a, o) => a + CL.orderTotal(o), 0);
    const toShip = ordersT.filter(x => ph(x.o) === 'listo').sort(byLimit);
    const issues = ordersT.filter(x => x.o.incidencia);
    const encAtascados = can('pedidos.ver') ? E.encargosPendientes().filter(x => x.min > 10) : []; // v14.1: encargos al PC del taller que no salen
    const labelProbs = problemasEtiquetas(); // v12.1: «Etiqueta no impresa — motivo» (nunca se finge que se imprimió)
    const edit = can('pedidos.editar'), tall = can('taller.editar');

    mount(head, h('div.grow', h('h1', isOp() ? '🛠️ Taller · hoy' : 'Hoy'), h('p.small.muted', { style: { margin: '2px 0 0' } }, new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + toPrint.length + ' por imprimir · ' + toPrep.length + ' por preparar · ' + toShip.length + ' por enviar')),
      botonVoz(), btn('Biouvision', () => go('estudio'), { cls: 'ghost', icon: 'camera', title: 'Editor de fotos: retocar, filtros y fondo' }),
      btn(isOp() ? 'Salir del modo taller' : 'Modo taller', () => { setOp(!isOp()); draw(); }, { icon: isOp() ? 'x' : 'play', cls: isOp() ? '' : 'primary' }));

    // ---- Impresoras, filamento reservado e incidencias ----
    const prs = T.printers();
    const prCards = prs.map(p => {
      const cur = T.nowOf(p.id), q = T.queueOf(p.id), maint = p.estado === 'Mantenimiento';
      let body;
      if (cur) {
        const finP = T.liveFin(p.id) || cur.finPrevisto, lv = T.liveFin(p.id) ? bambuFor(p.id) : null; // v11.2: la hora real de la Bambu manda
        const t0 = new Date(cur.inicio).getTime(), t1 = new Date(finP).getTime(), pc = lv ? Math.max(0, Math.min(1, (Number(lv.pct) || 0) / 100)) : Math.max(0, Math.min(1, (Date.now() - t0) / Math.max(1, t1 - t0)));
        const late = t1 < Date.now();
        body = [h('div.small.bold.ellipsis', cur.titulo), h('div.bar' + (late ? '.bad' : ''), h('i', { style: { width: Math.round(pc * 100) + '%' } })),
          h('div.tiny' + (late ? '.bad-t' : '.muted'), late ? '⏰ Debería haber terminado' : 'Quedan ' + T.hrs((t1 - Date.now()) / 3600000) + ' · ' + T.whenTxt(finP)),
          tall ? h('div.row', btn('Terminada', () => T.finishDialog(cur, 'Terminado'), { cls: 'sm primary', icon: 'check' }), btn('Falló', () => T.finishDialog(cur, 'Fallido'), { cls: 'sm danger' })) : null];
      } else if (T.liveFin(p.id)) body = [h('div.small.muted', 'Imprime algo que no está en la cola del programa' + (q.length ? ' · siguiente: ' : '.'), q.length ? h('b', q[0].titulo) : null)];
      else if (q.length && !maint) body = [h('div.small', 'Libre · siguiente: ', h('b', q[0].titulo)), tall ? btn('Empezar', () => T.startDialog(q[0]), { cls: 'sm primary', icon: 'play' }) : null];
      else body = [h('div.small.muted', maint ? '🔧 En mantenimiento' : '💤 Libre y sin cola')];
      const live = bambuFor(p.id); // v11.2: lo que la Bambu Lab dice AHORA (por la red local)
      return h('div.hoy-pr' + (cur ? '.busy' : ''), h('div.row', h('b.grow', p.nombre), q.length ? pill(q.length + ' en cola') : null),
        live ? h('div', { style: { background: 'var(--surface-2)', borderRadius: '8px', padding: '6px 8px', margin: '4px 0' } }, h('div.tiny.muted', '📡 En la impresora'), bambuLine(live)) : null, ...body);
    });
    // Filamento reservado: lo que necesita la cola por color frente a lo que queda en las bobinas
    const need = {};
    jobs.filter(j => j.estado === 'En cola' || j.estado === 'Imprimiendo').forEach(j => { const k = (j.material || 'PLA') + ' ' + (j.color || 'sin color'); need[k] = (need[k] || 0) + n(j.gramos); });
    const have = {}; (S.t.bobinas || []).filter(b => b.estado !== 'Agotada').forEach(b => { const k = (b.material || 'PLA') + ' ' + (b.color || 'sin color'); have[k] = (have[k] || 0) + n(b.restante); });
    const fil = Object.keys(need).filter(k => need[k] > 0).map(k => { const short = need[k] > (have[k] || 0); return h('span.fil' + (short ? '.bad' : ''), { title: 'Reservado por la cola / disponible' }, h('i', { style: { background: (S.t.bobinas || []).find(b => (b.material || 'PLA') + ' ' + b.color === k && b.colorHex)?.colorHex || '#ccc' } }), k + ': ' + Math.round(need[k]) + ' / ' + Math.round(have[k] || 0) + ' g'); });
    // v12.5: pedidos de la web «por WhatsApp» sin confirmar que están a punto de caducar (o ya caducaron)
    const reservas = can('pedidos.ver') ? CL.reservasPorCaducar(S.t.pedidos, S.cfg.pedidos, Date.now()) : [];
    const reservasBox = reservas.length ? h('div.card.flat.hoy-reservas', { role: 'status', style: { borderLeft: '4px solid var(--warn, #e9a400)' } },
      h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, h('b', '⏳ ' + reservas.length + ' pedido' + (reservas.length > 1 ? 's' : '') + ' de la web sin confirmar'), h('span.tiny.muted', 'La tienda los libera a las 48 horas.')),
      reservas.slice(0, 6).map(r => h('div.row.wrap', { style: { gap: '8px', alignItems: 'center', marginTop: '4px' } },
        h('span.grow.small', { style: { cursor: 'pointer' }, onclick: () => go('pedidos/' + r.primero.id) }, h('b', 'nº ' + r.primero.numero), ' · ' + (r.primero.cliente || '') + ' · ' + CL.s(r.metodo) + ' · ',
          r.vencida ? h('span.bad-t', 'ya caducó') : h('span', 'caduca en ' + Math.max(1, Math.round(r.horas)) + ' h')),
        can('pedidos.editar') ? btn('Recordar por WhatsApp', () => import('../envio.js').then(E => E.messageDialog(r.primero, 'wa_recordatorio')), { cls: 'sm primary', icon: 'msg' }) : null))) : null;
    const encBox = encAtascados.length ? h('div.card.flat.hoy-encargos', { role: 'alert', style: { borderLeft: '4px solid var(--warn, #e9a400)' } },
      h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, h('b', '🖨️ ' + encAtascados.length + ' etiqueta' + (encAtascados.length > 1 ? 's' : '') + ' esperando al PC del taller'), h('span.small', '¿Está encendido el programa del PC?')),
      encAtascados.slice(0, 6).map(x => h('div.small', { style: { cursor: 'pointer' }, onclick: () => go('pedidos/' + x.o.id) }, h('b', 'nº ' + x.o.numero), ' · ' + (x.o.cliente || '') + ' — ' + (E.PRINT_TIPOS[x.r.tipo] || { t: x.r.tipoTxt }).t + ' · hace ' + Math.round(x.min) + ' min' + (x.r.usuario ? ' (la mandó ' + x.r.usuario + ')' : '')))) : null;
    const paso = (ic, t, cnt, k, cls, sub) => h('button.hf' + (cnt ? '' : '.cero') + (cls ? '.' + cls : ''), { type: 'button', title: 'Ver en Pedidos', onclick: () => go(k) }, h('span.ic', ic), h('b', String(cnt)), h('span.t', t), sub ? h('span.s', sub) : null);
    const flujo = h('div.hoy-flujo', { role: 'navigation', 'aria-label': 'Flujo de los pedidos' },
      paso('📥', 'Por preparar', nuevos.length, 'pedidos/?f=reservas'), paso('🖨️', 'Por imprimir', toPrint.length, 'pedidos/?f=fabricar'), paso('⏳', 'Imprimiendo', printing.length, 'pedidos/?f=fabricando'),
      paso('🧽', 'En la mesa', enMesa.length, 'pedidos/?f=postpro'), paso('📦', 'Por empaquetar', aEmpaquetar.length, 'pedidos/?f=empaquetar'), paso('🚚', 'Por enviar', toShip.length, 'pedidos/?f=enviar'),
      paso('✈️', 'Enviados', enviados.length, 'pedidos/?f=enviados'), paso('✅', 'Completados', completados.length, 'pedidos/?f=completados'),
      paso('💶', 'Por cobrar', porCobrar.length, 'pedidos/?f=porcobrar', porCobrar.length ? 'aviso' : ''),
      can('productos.costes') ? paso('💰', 'Cobrado este mes', cobradosMes.length, 'ingresos', 'ok', CL.eur2(totalCobrado)) : null);
    const avisos = avisosStock();
    const stockBox = avisos.length ? h('div.card.flat.hoy-stock', { role: 'status' },
      h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, h('b', avisos.some(a => a.nivel !== 'bajo') ? '🔴 Material en nivel crítico' : '⚠️ Stock bajo'), h('span.grow'), btn('Ver inventario', () => go('inventario'), { cls: 'sm' })),
      // v16.2: cada aviso es un botón: se toca y se repone (qué · cuántos · cuánto costó)
      h('div.row.wrap.hoy-stock-l', avisos.slice(0, 8).map(a => h('button.chip.' + (a.nivel === 'bajo' ? 'warn' : 'bad'), { type: 'button', title: 'Reponer ' + a.nombre, onclick: () => import('./inventario.js').then(m => m.compraRapida(a.tipo === 'material' ? { nombre: a.nombre } : { filamento: a.filamento || a.nombre })) },
        (a.nivel === 'agotado' ? '⛔ ' : a.nivel === 'critico' ? '🔴 ' : '⚠️ ') + a.nombre + ': ' + (a.nivel === 'agotado' ? 'agotado' : a.queda + ' ' + a.unidad), h('b', ' ➕ Reponer'))))) : null;
    const revBox = h('div.hoy-rev'); pintaRevision(revBox);
    mount(top, flujo, stockBox, revBox, reservasBox, encBox, labelProbs.length ? h('div.card.flat.hoy-labelprobs', { role: 'alert', style: { borderLeft: '4px solid var(--bad, #d33)' } },
        h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, h('b', '🏷️ ' + labelProbs.length + ' etiqueta' + (labelProbs.length > 1 ? 's' : '') + ' sin imprimir'), edit ? btn('Reintentar', () => reintentar().then(draw), { cls: 'sm', icon: 'printer' }) : null),
        labelProbs.slice(0, 6).map(p => h('div.small', { style: { cursor: 'pointer' }, onclick: () => go('pedidos/' + p.o.id) }, h('b', 'nº ' + p.o.numero), ' · ' + (p.o.cliente || '') + ' — ' + textoProblema(p)))) : null,
      T.rateBlock ? T.rateBlock(tall) : null, prs.length ? h('div.hoy-prs', prCards) : null, // v11.4: avisos de la Bambu y «¿Cómo salió?»
      fil.length || issues.length ? h('div.row.wrap', { style: { gap: '8px' } },
        fil.length ? [h('span.small.bold', '🧵 Filamento reservado:'), fil] : null,
        issues.length ? h('button.chip.bad', { onclick: () => go('pedidos/?f=incidencias') }, '⚠️ ' + issues.length + ' incidencia' + (issues.length > 1 ? 's' : '')) : null) : null);

    // ---- Columna 1: imprimir (con lotes) ----
    const groups = {}, pool = {}; // pool: piezas libres por producto, repartidas por urgencia
    toPrint.forEach(x => { const k = CL.norm(x.o.producto) + '|' + CL.norm(x.o.color); (groups[k] = groups[k] || []).push(x); });
    const lots = Object.values(groups).filter(g => g.length > 1);
    const card = (x, actions, extra) => h('div.hoy-card' + (x.t.nivel === 'late' ? '.late' : x.t.nivel === 'today' ? '.today' : ''), { onclick: e => { if (!e.target.closest('button')) go('pedidos/' + x.o.id); } },
      h('div.row', h('b', 'nº ' + x.o.numero), h('span.grow.ellipsis.small', x.o.cliente), x.o.prioridad === 'Urgente' ? pill('⚡', 'bad') : null),
      h('div.hoy-prod', (n(x.o.cantidad) > 1 ? x.o.cantidad + ' × ' : '') + x.o.producto + (x.o.color ? ' · ' + x.o.color : '')),
      x.o.personalizacion ? h('div.tiny.muted.ellipsis', '✏️ ' + x.o.personalizacion) : null,
      x.o.incidencia ? h('div.tiny.bad-t', '⚠️ ' + x.o.incidencia) : null,
      h('div.row.wrap', { style: { marginTop: '4px' } }, h('span.due.' + (x.t.nivel === 'none' ? 'x' : x.t.nivel), x.t.texto), extra || null),
      actions.filter(Boolean).length ? h('div.hoy-act', actions) : null);
    const printCol = [
      lots.length ? h('div.hoy-lot-box', lots.map(g => {
        const q = g.reduce((a, x) => a + (n(x.o.cantidad) || 1), 0);
        return h('div.hoy-lot', h('div', h('b', '🧩 Conviene imprimir juntos'), h('div.small', q + ' × ' + g[0].o.producto + (g[0].o.color ? ' · ' + g[0].o.color : '') + ' (' + g.length + ' pedidos: nº ' + g.map(x => x.o.numero).join(', ') + ')')),
          tall ? btn('Imprimir juntos', () => T.jobForm({ lote: g.map(x => x.o.id) }), { cls: 'sm primary', icon: 'cube' }) : null);
      })) : null,
      toPrint.length ? toPrint.map(x => { const k = CL.norm(x.o.producto), q = n(x.o.cantidad) || 1; if (!(k in pool)) pool[k] = free(x.o); const fr = pool[k] >= q; if (fr) pool[k] -= q; return card(x, [
        fr && edit ? btn('📦 Coger de la estantería', async () => { try { const r = await mutate('pedidos.desdeStock', { id: x.o.id }, { onlineOnly: true }); if (r && r.id) { upsertLocal('pedidos', r); emit(); } toast('nº ' + x.o.numero + ' → ' + r.estado, 'ok'); } catch (e) { handleError(e); } }, { cls: 'ok-btn' }) : null,
        tall ? btn('Mandar a imprimir', () => T.jobForm(null, x.o), { cls: fr ? '' : 'primary', icon: 'cube' }) : null]); }) : h('p.small.muted.hoy-empty', '✅ Nada pendiente de imprimir.'),
      printing.length ? h('div.tiny.muted', { style: { marginTop: '8px' } }, '🖨️ Imprimiéndose ahora: ' + printing.map(x => 'nº ' + x.o.numero).join(', ')) : null];
    const emq = CL.stateOfPhase(S.cfg.pedidos, 'empaquetar');
    const prepOf = lista => lista.length ? lista.map(x => card(x, [
      edit && ph(x.o) === 'postpro' && emq ? btn('Empaquetar', () => P.changeState(x.o, emq), { icon: 'box' }) : null,
      ph(x.o) === 'empaquetar' ? btn('📦 Embalaje', () => import('./embalaje.js').then(E => E.packPanel(x.o.id)), { cls: 'sm' }) : null,
      edit ? btn(ph(x.o) === 'empaquetar' ? 'Paquete hecho' : 'Listo para envío', () => P.changeState(x.o, CL.stateOfPhase(S.cfg.pedidos, 'listo')), { cls: 'primary', icon: 'check' }) : null],
      ph(x.o) === 'empaquetar' ? h('span.tiny.muted', '📦 ' + x.o.estado) : null)) : h('p.small.muted.hoy-empty', '✅ Nada aquí.');
    const entregadoK = CL.stateOfPhase(S.cfg.pedidos, 'entregado');
    const cobro = o => ({ o, t: timing(o) });
    const cobrarCol = porCobrar.length ? porCobrar.slice(0, 30).map(o => card(cobro(o), [
      edit && ph(o) === 'enviado' && entregadoK ? btn('Completado', () => P.changeState(o, entregadoK), { icon: 'check' }) : null,
      edit ? btn('💶 Cobrado', () => import('./ingresos.js').then(m => m.cobrarPedido(o)), { cls: 'primary' }) : null],
      h('span.tiny.muted', CL.eur2(CL.orderTotal(o)) + ' · ' + o.estado))) : h('p.small.muted.hoy-empty', '✅ Todo cobrado.');
    const shipCol = [toShip.length > 1 ? btn('Imprimir todas las etiquetas (' + toShip.length + ')', () => import('../envio.js').then(E => E.etiquetasEnvio(toShip.map(x => x.o))), { cls: 'sm', icon: 'printer' }) : null,
      toShip.length ? toShip.map(x => card(x, [btn('🏷️ Etiqueta', () => import('../envio.js').then(E => E.etiquetaEnvio(x.o))), edit ? btn('Enviado', () => P.shipDialog(x.o), { cls: 'primary', icon: 'truck' }) : null], x.o.envio ? h('span.tiny.muted', x.o.envio) : null)) : h('p.small.muted.hoy-empty', '✅ Nada por enviar.')];
    const col = (ic, t, cnt, kids, k) => h('section.hoy-col', h('div.hoy-col-h', h('span.ic', ic), h('h2.grow', t), h('span.cnt', String(cnt)), btn('', () => go('pedidos/?f=' + k), { cls: 'ghost icon sm', icon: 'external', title: 'Ver en Pedidos' })), h('div.hoy-list', kids));
    // v16: lo que llega y hay que aceptar (solo aparece si hay alguno)
    const confK = CL.stateOfPhase(S.cfg.pedidos, 'confirmado');
    const llegan = nuevos.length ? col('📥', 'Llegan · aceptar', nuevos.length, nuevos.map(x => card(x, [edit && confK ? btn('Aceptar pedido', () => P.changeState(x.o, confK), { cls: 'primary', icon: 'check' }) : null], h('span.tiny.muted', x.o.canal || ''))), 'reservas') : null;
    mount(cols, llegan, col('🖨️', 'Imprimir', toPrint.length, printCol, 'fabricar'), col('🧽', 'En la mesa · revisar y acabado', enMesa.length, prepOf(enMesa), 'postpro'), col('📦', 'Empaquetar', aEmpaquetar.length, prepOf(aEmpaquetar), 'empaquetar'),
      col('🚚', 'Enviar', toShip.length, shipCol, 'enviar'), col('💶', 'Cobrar', porCobrar.length, cobrarCol, 'porcobrar'));
    if (!S.t.pedidos.length) mount(cols, h('div.card', empty('truck', 'Aún no hay pedidos', 'Cuando entren aparecerán aquí, ordenados por urgencia.')));
  };
  const firma = () => JSON.stringify([S.t.pedidos.map(o => [o.id, o.estado, o.version, o.cobrado, o.incidencia]), (S.t.trabajos || []).map(j => [j.id, j.estado, j.version]), (S.t.bobinas || []).map(b => [b.id, b.restante]), (S.t.materiales || []).map(m => [m.id, m.stock, m.stockMin, m.stockCritico]), isOp()]);
  let ultima = '';
  const drawSiCambia = async forzar => { const f = firma(); if (!forzar && f === ultima) return; ultima = f; const sc = document.scrollingElement, y = sc ? sc.scrollTop : 0; await draw0(); if (sc && y) sc.scrollTop = y; };
  drawSiCambia(true);
  const tick = setInterval(() => { if (document.body.dataset.view === 'hoy') drawSiCambia(true); }, 60000);
  return { update: () => drawSiCambia(false), destroy: () => { clearInterval(tick); document.body.classList.remove('operario'); } };
}
