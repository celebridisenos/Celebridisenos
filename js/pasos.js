// ================= 18-11-2026 · LOS 4 ESTADOS de un pedido: Confirmado → Imprimiendo → En mesa → Listo =================
// Biou (18-11): «mejor que haya 4 estados, es que es mucho lío… confirmado, imprimiendo, en mesa y listo». Antes (14-11) eran 5 pasos.
// No cambia ningún estado guardado: solo TRADUCE la fase real del pedido (CL.phaseOf) a uno de estos 4. «Empaquetar» cuenta como
// «En mesa» (el paquete se hace en la mesa) y «Enviado» / «Entregado» son el final (los 4 hechos). Las placas siguen dentro de
// «Imprimiendo» y «En mesa» (el número «2/3» sale bajo el paso en el que están). Los nombres viejos (PASOS5, barra5, paso5) se
// conservan para no romper a quien los usa.
import { h } from './ui.js';
import { S } from './store.js';
import * as PL from './placas.js';

const CL = window.CL;
// f = la fase de dentro a la que lleva el botón; c = su color (el mismo en los botones, la barra y la etiqueta del estado)
export const ESTADOS4 = [
  { k: 'confirmado', f: 'confirmado', t: 'Confirmado', e: '✅', c: '#3b82f6' },
  { k: 'imprimiendo', f: 'impresion', t: 'Imprimiendo', e: '🖨️', c: '#f97316' },
  { k: 'mesa', f: 'postpro', t: 'En mesa', e: '🛠️', c: '#eab308' },
  { k: 'listo', f: 'listo', t: 'Listo', e: '🏷️', c: '#22c55e' },
];
export const PASOS5 = ESTADOS4; // (nombre de antes)
// fase real → paso que toca AHORA (0..3); 4 = todo hecho (enviado o entregado); -1 = aún no confirmado o cancelado
const ACTUAL = { reserva: -1, confirmado: 0, impresion: 1, postpro: 2, empaquetar: 2, listo: 3, enviado: 4, entregado: 4, cancelado: -1 };
const FUERA = { reserva: ['Por confirmar', '📥', '#94a3b8'], enviado: ['Enviado', '🚚', '#0ea5e9'], entregado: ['Entregado', '🏁', '#0f766e'], cancelado: ['Cancelado', '✖️', '#64748b'] };
export const fase = o => CL.phaseOf(S.cfg.pedidos, o.estado);
export function paso4(o) { const f = fase(o); return f in ACTUAL ? ACTUAL[f] : -1; }
export const paso5 = paso4;
// Lo que se enseña del estado: { t: nombre, e: emoji, c: color }. Un estado raro de la configuración sale con su nombre de siempre.
export function estado4(o) {
  const f = fase(o);
  if (FUERA[f]) return { t: FUERA[f][0], e: FUERA[f][1], c: FUERA[f][2], f };
  const i = ACTUAL[f];
  if (i >= 0 && i <= 3) return { t: ESTADOS4[i].t, e: ESTADOS4[i].e, c: ESTADOS4[i].c, f };
  return { t: String(o.estado || '—'), e: '•', c: '#64748b', f };
}
// El siguiente de los 4 (para el botón «Pasar a: …»); null si ya está en Listo o fuera de los 4
export function siguiente4(o) { const i = paso4(o); return i >= 0 && i < 3 ? ESTADOS4[i + 1] : (fase(o) === 'reserva' ? ESTADOS4[0] : null); }
// La barra: cuatro puntos con su nombre; los hechos con ✓, el actual resaltado. opts.mini = solo puntos (para tarjetas pequeñas)
export function barra4(o, opts = {}) {
  const c = paso4(o), L = PL.lista(o), R = L.length ? CL.placasResumen(L) : null;
  const el = h('div.p5.p4' + (opts.mini ? '.mini' : ''), { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 4, 'aria-valuenow': Math.max(0, c), 'aria-label': 'Estado del pedido', 'data-paso': String(c) },
    ESTADOS4.map((p, i) => {
      const hecho = i < c, actual = i === c;
      const sub = R && (i === 1 || i === 2) && actual ? R.hechas + '/' + R.n : null;
      return h('span.p5-p' + (hecho ? '.hecho' : actual ? '.actual' : '.falta'), { 'data-k': p.k, title: p.t + (hecho ? ' · hecho' : actual ? ' · ahora' : '') },
        h('i.p5-d', actual ? { style: { background: p.c, borderColor: p.c } } : null, hecho ? '✓' : opts.mini ? '' : p.e), opts.mini ? null : h('b.p5-t', p.t), sub && !opts.mini ? h('small.p5-s', sub) : null);
    }));
  return el;
}
export const barra5 = barra4;
