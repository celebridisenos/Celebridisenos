// ================= v12.1 · Etiquetas AUTOMÁTICAS al llegar a «Empaquetar» =================
// Problema que corrige: antes la impresión solo salía si alguien pulsaba un botón o escaneaba el QR en
// ESA ventana (y con la opción desactivada por defecto). Si el pedido llegaba a «Empaquetar» desde Pedidos,
// Hoy, el móvil o Telegram, no se imprimía nada y nadie se enteraba.
//
// Ahora, en el programa del PC (el único que llega a las impresoras):
//  · cada pedido que está en «Empaquetar» y tiene impresiones pendientes se imprime solo;
//  · el registro del servidor impide los dobles (Enviando / Impreso) aunque haya dos ventanas;
//  · solo UNA ventana del PC lo hace (líder), como en Bambu;
//  · si falla NO se finge nada: queda «Etiqueta no impresa — motivo», con reintentos espaciados;
//  · nunca abre PDFs ni preguntas sin que nadie esté delante: sin impresora real, se avisa y ya;
//  · «Omitir por ahora» y el interruptor de Embalaje (Tarjeta y mensajes) lo detienen.
import { S, can, byId, on } from './store.js';
import { desktop } from './desktop.js';
import * as E from './envio.js';

const CL = window.CL;
const LKEY = 'cd.autoimp.lider';
const ME = Math.random().toString(36).slice(2);
const RETRY_MS = [0, 30000, 120000, 300000]; // 1.º intento ya, luego 30 s, 2 min, 5 min; después se queda avisado
const MAX_INTENTOS = RETRY_MS.length;

// Estado en memoria de esta ventana: pedidoId → { n, next, motivo, tipo }
export const AUTO = { fallos: new Map(), activo: false, ultimo: 0 };

const cfgE = () => (S.cfg && S.cfg.envio) || {};
export const autoOn = () => cfgE().autoImprimir !== false;
const faseDe = o => CL.phaseOf((S.cfg || {}).pedidos, o.estado);

function leader() {
  try {
    const l = JSON.parse(localStorage.getItem(LKEY) || 'null');
    if (!l || l.id === ME || Date.now() - l.ts > 45000) { localStorage.setItem(LKEY, JSON.stringify({ id: ME, ts: Date.now() })); return true; }
  } catch (e) { return true; }
  return false;
}

// v14.1: lo que alguien ENCARGÓ al PC del taller desde el móvil o el portátil (filas «Pendiente»), en cualquier fase
export function encargos(o) {
  return Object.keys(E.PRINT_TIPOS).filter(t => E.encargadaPC(o, t));
}
const enEmpaquetar = o => faseDe(o) === 'empaquetar' && !E.labelSkipped(o);
// ¿Qué falta imprimir en este pedido y puede hacerse solo? (sin la tarjeta en modo «hoja», que se marca a mano)
export function porImprimir(o) {
  const enc = encargos(o);
  const auto = enEmpaquetar(o) ? E.pendingOf(o).filter(t => !(t === 'gracias' && E.cardMode() === 'hoja')) : [];
  return Object.keys(E.PRINT_TIPOS).filter(t => enc.includes(t) || auto.includes(t)); // en orden: oficial → propia → paquete → tarjeta
}

// Pedidos que deben imprimirse ahora mismo
export function candidatos() {
  return (S.t.pedidos || []).filter(o => !o.eliminado && !o.archivado && porImprimir(o).length);
}

// Se puede imprimir tipo → plantilla con impresora real y conectada. Si no, devuelve el MOTIVO (texto) en vez de intentarlo.
async function motivoImposible(tipo) {
  if (!desktop.on) return 'Este dispositivo no es el programa del PC: no puede mandar a la impresora.';
  const L = await import('./labels.js');
  const tpl = E.PRINT_TIPOS[tipo].tpl;
  let t;
  try { t = await L.targetFor(tpl); } catch (e) { return 'No se pudo preparar la impresora: ' + e.message; }
  if (!t || !t.pr) {
    const off = L.realPrinters(t && t.list).filter(p => p.offline); // pickPrinter ignora las apagadas: decirlo claro
    if (off.length) return 'La impresora «' + off[0].name + '» está desconectada o apagada.';
    return 'No hay impresora elegida para «' + E.PRINT_TIPOS[tipo].t + '» (Configuración → Impresión).';
  }
  if (t.pr.offline) return 'La impresora «' + t.pr.name + '» está desconectada o apagada.';
  return '';
}

async function notificar(o, motivo) {
  try { const m = await import('./popups.js'); m.popup({ titulo: '🏷️ Etiqueta no impresa · nº ' + o.numero, texto: motivo, kind: 'bad', enlace: 'pedidos/' + o.id }, true); } catch (e) { }
}

let busy = false;
export async function autoTick() {
  if (busy || !desktop.on || !S.ready || !S.me || !autoOn() || !can('pedidos.editar') || !leader()) return;
  busy = true; AUTO.activo = true; AUTO.ultimo = Date.now();
  try {
    for (const o0 of candidatos()) {
      const o = byId('pedidos', o0.id) || o0;
      const f = AUTO.fallos.get(o.id) || { n: 0, next: 0 };
      if (f.n >= MAX_INTENTOS || Date.now() < f.next) continue;
      let fallo = '';
      const enc = encargos(o);
      for (const tipo of porImprimir(o)) {
        let motivo = await motivoImposible(tipo);
        if (motivo && enc.includes(tipo) && !enEmpaquetar(o)) continue; // un encargo que este PC no puede sacar se deja para el PC del taller, sin avisar
        if (!motivo) {
          try {
            const r = await E.printOne(byId('pedidos', o.id) || o, tipo, { auto: true });
            if (r && r.estado === 'Error') motivo = r.error || 'La impresora no lo aceptó.';
          } catch (e) { motivo = e.message || 'Error desconocido'; }
        }
        if (motivo) { fallo = (E.PRINT_TIPOS[tipo].t || tipo) + ': ' + motivo; break; } // no se sigue con el resto: el orden importa (oficial → paquete → tarjeta)
      }
      if (fallo) {
        const n = f.n + 1;
        AUTO.fallos.set(o.id, { n, next: Date.now() + (RETRY_MS[n] || RETRY_MS[RETRY_MS.length - 1]), motivo: fallo });
        if (n === 1 || n === MAX_INTENTOS) await notificar(o, fallo + (n >= MAX_INTENTOS ? ' · No se reintenta más: revísalo en el pedido.' : ''));
      } else AUTO.fallos.delete(o.id);
    }
  } catch (e) { console.warn('autoimpresión', e); } finally { busy = false; }
}

// Lista de problemas que se ven en «Hoy»: cualquier pedido listo para empaquetar/enviar con una etiqueta que NO está impresa.
// Se calcula del registro del servidor (no de la memoria de una ventana), así lo ve cualquiera, en cualquier dispositivo.
export function problemasEtiquetas() {
  const out = [];
  for (const o of (S.t.pedidos || [])) {
    if (o.eliminado || o.archivado) continue;
    const f = faseDe(o);
    if (f !== 'empaquetar' && f !== 'listo') continue;
    if (E.labelSkipped(o)) continue;
    const mem = AUTO.fallos.get(o.id);
    for (const tipo of E.wanted(o)) {
      const st = E.statusOf(o, tipo);
      if (st.estado === 'Error') out.push({ o, tipo, motivo: (st.fallo && st.fallo.error) || (mem && mem.motivo) || 'La impresión falló.' });
      else if (st.estado === 'Enviando' && st.last && Date.now() - new Date(st.last.actualizado || st.last.fecha).getTime() > 3 * 60 * 1000) out.push({ o, tipo, motivo: 'La impresión se cortó sin confirmar.' });
    }
    if (!out.some(x => x.o.id === o.id) && mem) out.push({ o, tipo: '', motivo: mem.motivo });
    // un envío sin etiqueta oficial adjunta: nada que imprimir (nunca se inventa), pero hay que decirlo
    if (!E.hasLabel(o) && o.envio && !/recog/i.test(String(o.envio)) && !out.some(x => x.o.id === o.id) && !(E.wanted(o).includes('propia'))) out.push({ o, tipo: 'oficial', motivo: 'Falta adjuntar la etiqueta de envío (no hay nada que imprimir).' });
  }
  return out;
}
export const textoProblema = p => 'Etiqueta no impresa — ' + p.motivo;

let timer = null, unsub = null, deb = null;
export function startAutoPrint() {
  if (!desktop.on || timer) return;
  timer = setInterval(autoTick, 20000);
  unsub = on(() => { clearTimeout(deb); deb = setTimeout(autoTick, 1500); }); // en cuanto cambia un pedido
  setTimeout(autoTick, 6000);
}
export function stopAutoPrint() { clearInterval(timer); timer = null; if (unsub) unsub(); unsub = null; }
// Reintento manual (botón «Reintentar» de Hoy): olvida los fallos y vuelve a intentarlo ya
export function reintentar(id) { if (id) AUTO.fallos.delete(id); else AUTO.fallos.clear(); return autoTick(); }
