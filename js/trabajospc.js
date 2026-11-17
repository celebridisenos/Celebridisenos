// ================= v15.2 · ENCARGOS PESADOS PARA EL PC =================
// Regla de la versión VIP: lo pesado (IA de fotos, Reels con Remotion…) lo hace SIEMPRE el PC del taller.
//   · En el móvil o el portátil: encargarAlPC(tipo, entrada) deja el encargo y espera el resultado.
//   · En el PC con el programa abierto: startTrabajadorPC() coge los encargos que sabe hacer y los resuelve.
// Cada fase registra lo que el PC sabe hacer con registrarTrabajo(tipo, comprobar, hacer).
import { S, api, can, pull, byId } from './store.js';
import { desktop } from './desktop.js';

const tipos = {}; // tipo → { puede: async () => bool, hacer: async (job, progreso) => resultado }
export function registrarTrabajo(tipo, puede, hacer) { tipos[tipo] = { puede, hacer }; }

// Lo que un archivo necesita para que otro aparato lo descargue
export const refArchivo = a => a ? { id: a.id, driveId: a.driveId || '', mime: a.mime || '', tamano: a.tamano || 0, nombre: a.nombre || '' } : null;

// ---------- quien encarga (móvil, portátil o el propio PC si no tiene el motor) ----------
export async function encargarAlPC(tipo, entrada, { onStatus, signal, maxMs = 900000 } = {}) {
  const j = await api('pc.encargar', { tipo, entrada });
  const t0 = Date.now();
  onStatus && onStatus(j.servidor ? 'Enviado a ' + j.servidor.dispositivo + '…' : '⏳ Esperando a que el PC del taller esté encendido con el programa abierto…', 0);
  for (;;) {
    if (signal && signal.aborted) { api('pc.cancelar', { id: j.id }).catch(() => { }); throw new DOMException('cancelado', 'AbortError'); }
    await new Promise(r => setTimeout(r, Date.now() - t0 < 20000 ? 2000 : 4000));
    const st = await api('pc.estado', { id: j.id }, { quiet: true });
    if (st.estado === 'hecho') return Object.assign({}, st.resultado || {}, { __id: j.id });
    if (st.estado === 'error') throw new Error(st.error || 'El PC no pudo hacerlo.');
    if (st.estado === 'cancelado') throw new DOMException('cancelado', 'AbortError');
    onStatus && onStatus(st.estado === 'procesando' ? '🖥️ ' + (st.servidor ? st.servidor.dispositivo : 'El PC') + ' lo está haciendo…' + (st.progreso > 1 ? ' ' + st.progreso + ' %' : '')
      : st.servidor ? '⏳ En cola en ' + st.servidor.dispositivo + '…' : '⏳ Esperando al PC del taller (tiene que estar encendido con el programa abierto)…', st.progreso || 0);
    if (Date.now() - t0 > maxMs) { api('pc.cancelar', { id: j.id }).catch(() => { }); throw new Error('El PC tarda demasiado. ¿Está encendido con el programa abierto?'); }
  }
}

// ---------- el PC: atiende los encargos ----------
let on = false;
export function startTrabajadorPC() {
  if (on || !desktop.on) return;
  on = true;
  // v15.4: con el programa y Biouvision abiertos a la vez, atiende solo una ventana (si se cierra, sigue la otra)
  if (navigator.locks && navigator.locks.request) { navigator.locks.request('cd-trabajador-pc', () => new Promise(() => arrancar())).catch(() => arrancar()); return; }
  arrancar();
}
function arrancar() {
  let idle = 0;
  const loop = async () => {
    try {
      if (S.token && can('ia.servidor') && localStorage.getItem('cd.pcServidor') !== '0') {
        const puede = [];
        for (const [t, x] of Object.entries(tipos)) { try { if (await x.puede()) puede.push(t); } catch (e) { } }
        window.__pcDbg = { puede, vuelta: ((window.__pcDbg || {}).vuelta || 0) + 1 }; // para «Centro de IA» y las pruebas
        if (puede.length) {
          const job = await api('pc.siguiente', { dispositivo: S.device, puede }, { quiet: true });
          if (job) { idle = 0; await atender(job); setTimeout(loop, 500); return; }
        }
      }
    } catch (e) { console.warn('Trabajos del PC', e.message); window.__pcDbg = Object.assign(window.__pcDbg || {}, { error: e.message }); }
    idle = Math.min(idle + 1, 4);
    setTimeout(loop, 5000 + idle * 2500);
  };
  setTimeout(loop, 6000);
}
async function atender(job) {
  const x = tipos[job.tipo];
  let ultimo = 0;
  const progreso = p => { const v = Math.round(p); if (v - ultimo >= 5 || v >= 99) { ultimo = v; api('pc.progreso', { id: job.id, progreso: v }, { quiet: true }).catch(() => { }); } };
  try {
    if (!x) throw new Error('Este PC no sabe hacer «' + job.tipo + '».');
    const resultado = await x.hacer(job, progreso);
    await api('pc.terminar', { id: job.id, resultado });
  } catch (e) {
    await api('pc.terminar', { id: job.id, error: e.message || String(e) }).catch(() => { });
  }
}

// Un archivo del encargo, listo para usar en el PC
export async function archivoDelEncargo(ref) {
  if (!ref || !ref.id) throw new Error('Falta el archivo del encargo.');
  const F = await import('./files.js');
  let a = byId('archivos', ref.id);
  if (!a) { await pull().catch(() => { }); a = byId('archivos', ref.id) || ref; }
  return F.fetchFile(a);
}
