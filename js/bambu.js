// ================= v11.2 · Bambu Lab en vivo + pedidos que se actualizan solos =================
// El programa del PC lee cada Bambu Lab por la red local (sin la nube). Aquí, cada 15 s:
//  · se guarda el estado para el Taller y Hoy;
//  · si una impresora EMPIEZA a imprimir y en su cola del Taller hay un trabajo esperando → pasa a
//    «Imprimiendo» (y su pedido a «En impresión»);
//  · si TERMINA → el trabajo se da por terminado (gramos y stock previstos) y el pedido avanza;
//  · si hay ERROR, PAUSA por error o FALTA DE FILAMENTO → aviso flotante y del sistema.
// Solo una ventana del PC hace los cambios (las demás solo miran), para no repetir nada.
import { S, can, api, upsertLocal, emit, byId } from './store.js';
import { desktop } from './desktop.js';

export const BAMBU = { list: [], at: 0 };
export const bambuFor = impresoraId => BAMBU.list.find(b => b.impresoraId && b.impresoraId === impresoraId) || null;

const ME = Math.random().toString(36).slice(2);
const LKEY = 'cd.bambu.lider', PKEY = 'cd.bambu.prev';
function leader() {
  try {
    const l = JSON.parse(localStorage.getItem(LKEY) || 'null');
    if (!l || l.id === ME || Date.now() - l.ts > 45000) { localStorage.setItem(LKEY, JSON.stringify({ id: ME, ts: Date.now() })); return true; }
  } catch (e) { return true; }
  return false;
}
const prevGet = () => { try { return JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch (e) { return {}; } };
const prevSet = v => { try { localStorage.setItem(PKEY, JSON.stringify(v)); } catch (e) { } };
const BUSY = { imprimiendo: 1, preparando: 1 };
const BAD = { error: 1, sin_filamento: 1 };

async function notify(titulo, texto, kind, enlace) {
  try { const m = await import('./popups.js'); m.popup({ titulo, texto, kind, enlace }, true); } catch (e) { }
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(titulo, { body: texto }); } catch (e) { }
}

const jobsOf = id => (S.t.trabajos || []).filter(j => j.impresoraId === id);
const queueOf = id => jobsOf(id).filter(j => j.estado === 'En cola').sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || String(a.creado).localeCompare(String(b.creado)));
const nowOf = id => jobsOf(id).find(j => j.estado === 'Imprimiendo');

function applyJob(r) {
  if (!r) return;
  if (r.trabajo) upsertLocal('trabajos', r.trabajo);
  if (r.pedido) upsertLocal('pedidos', r.pedido);
  (r.pedidos || []).forEach(p => upsertLocal('pedidos', p));
  if (r.bobina) upsertLocal('bobinas', r.bobina);
}

// Decide qué hacer con un cambio de estado (función pura: se prueba sola)
export function decide(prev, cur, hasRunning, hasQueued) {
  if (!prev) return ''; // primera lectura: no se sabe qué pasó antes, no se toca nada
  const p = prev, c = cur.estado;
  if (BUSY[c] && !BUSY[p] && p !== 'pausada' && !hasRunning && hasQueued) return 'empezar';
  if (c === 'finalizada' && (BUSY[p] || p === 'pausada') && hasRunning) return 'terminar';
  if (BAD[c] && !BAD[p]) return 'avisar_error';
  if (c === 'pausada' && p !== 'pausada' && cur.errorTexto) return 'avisar_error';
  return '';
}

let busy = false;
async function tick() {
  if (busy || !S.me || !desktop.on) return;
  busy = true;
  try { await tick1(); } finally { busy = false; }
}
export const bambuTick = tick; // para las pruebas y para «Volver a leer»
async function tick1() {
  let r;
  try { r = await desktop.bambu(); } catch (e) { return; }
  const list = r.impresoras || [];
  const sig = JSON.stringify(list.map(b => [b.serial, b.estado, b.pct, b.restanteMin, b.trabajo, b.conectada, b.impresoraId]));
  const changed = sig !== BAMBU.sig;
  BAMBU.list = list; BAMBU.at = Date.now(); BAMBU.sig = sig;
  if (changed) emit();
  if (!can('taller.editar') || !leader()) return;
  // Relación automática con las impresoras del Taller por el modelo («P1P», «A1 mini»…)
  for (const b of list) {
    if (b.impresoraId) continue;
    const key = String(b.modelo || '').replace(/^Bambu Lab\s*/i, '').toLowerCase();
    if (!key) continue;
    const hit = (S.t.impresoras || []).filter(p => (String(p.nombre) + ' ' + String(p.modelo || '')).toLowerCase().includes(key));
    if (hit.length === 1) { try { await desktop.bambuAccion({ accion: 'asignar', serial: b.serial, impresoraId: hit[0].id }); b.impresoraId = hit[0].id; } catch (e) { } }
  }
  const prev = prevGet(), next = {};
  for (const b of list) {
    if (!b.conectada) { next[b.serial] = prev[b.serial]; continue; }
    next[b.serial] = b.estado;
    const pr = b.impresoraId ? byId('impresoras', b.impresoraId) : null;
    const name = pr ? pr.nombre : (b.nombre || b.modelo);
    const running = pr ? nowOf(pr.id) : null, queued = pr ? queueOf(pr.id)[0] : null;
    const what = decide(prev[b.serial], b, !!running, !!queued);
    try {
      if (what === 'empezar' && pr) {
        const res = await api('trabajos.estado', { id: queued.id, estado: 'Imprimiendo', bobinaId: queued.bobinaId || '', marcarPedido: true });
        applyJob(res); emit();
        notify('▶️ ' + name + ' ha empezado', '«' + queued.titulo + '»' + (b.trabajo && b.trabajo !== queued.titulo ? ' (' + b.trabajo + ')' : '') + ' · termina sobre las ' + new Date(b.fin || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), '', 'taller');
      } else if (what === 'terminar' && pr) {
        const res = await api('trabajos.estado', { id: running.id, estado: 'Terminado', gramos: Number(running.gramos) || 0, bobinaId: running.bobinaId || '', marcarPedido: true, stock: running.productoId || running.pedidoId ? Math.max(0, Number(running.cantidad) || 1) : undefined });
        applyJob(res); emit();
        notify('✅ ' + name + ': impresión terminada', '«' + running.titulo + '»' + (res && res.pedido ? ' · pedido nº ' + res.pedido.numero + ' → ' + res.pedido.estado : ''), '', res && res.pedido ? 'pedidos/' + res.pedido.id : 'taller');
      } else if (what === 'avisar_error') {
        notify((b.estado === 'sin_filamento' ? '🧵 ' : '⚠️ ') + name + ': ' + (b.estadoTexto || 'error'), (b.errorTexto || '') + (b.trabajo ? ' · «' + b.trabajo + '»' : '') + (running ? ' · ¿Cómo ha salido? Respóndelo en el Taller.' : ''), 'bad', 'taller');
        // v11.4 (idea 5): el aviso queda en la impresión para preguntar «¿Cómo salió?» con el % y el motivo ya puestos
        if (running) { const res = await api('trabajos.alerta', { id: running.id, texto: (b.estadoTexto || 'Error') + (b.errorTexto ? ': ' + b.errorTexto : ''), progreso: Number(b.pct) || 0, estado: b.estado, impresora: name }); applyJob(res); emit(); }
      }
    } catch (e) { console.warn('Bambu', e); }
  }
  prevSet(next);
}

let timer = null;
export function startBambuSync() {
  if (!desktop.on || timer) return;
  timer = setInterval(tick, 15000);
  setTimeout(tick, 4000);
}
