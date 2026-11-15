// ================= 14-11-2026 · LOS 5 PASOS de un pedido: Confirmado → Imprimiendo → En mesa → Empaquetado → Enviado =================
// Biou: «la barra de progreso tiene que ser más mejor: confirmado, imprimiendo, en mesa, empaquetado y enviado, y ya está».
// No cambia ningún estado guardado: solo TRADUCE la fase real del pedido (CL.phaseOf) a uno de estos 5 pasos. Las placas
// siguen dentro de «Imprimiendo» y «En mesa» (el número «2/3» sale bajo el paso en el que están).
import { h } from './ui.js';
import { S } from './store.js';
import * as PL from './placas.js';

const CL = window.CL;
export const PASOS5 = [
  { k: 'confirmado', t: 'Confirmado', e: '📌' },
  { k: 'imprimiendo', t: 'Imprimiendo', e: '🖨️' },
  { k: 'mesa', t: 'En mesa', e: '🧽' },
  { k: 'empaquetado', t: 'Empaquetado', e: '📦' },
  { k: 'enviado', t: 'Enviado', e: '🚚' },
];
// fase real → paso que toca AHORA (0..4); 5 = todo hecho; -1 = aún no confirmado (llega, falta aceptarlo) o cancelado
const ACTUAL = { reserva: -1, confirmado: 0, impresion: 1, postpro: 2, empaquetar: 3, listo: 4, enviado: 5, entregado: 5, cancelado: -1 };
export function paso5(o) {
  const f = CL.phaseOf(S.cfg.pedidos, o.estado);
  return f in ACTUAL ? ACTUAL[f] : -1;
}
// La barra: cinco puntos con su nombre; los hechos con ✓, el actual resaltado. opts.mini = solo puntos (para tarjetas pequeñas)
export function barra5(o, opts = {}) {
  const c = paso5(o), L = PL.lista(o), R = L.length ? CL.placasResumen(L) : null;
  const el = h('div.p5' + (opts.mini ? '.mini' : ''), { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 5, 'aria-valuenow': Math.max(0, c), 'aria-label': 'Pasos del pedido', 'data-paso': String(c) },
    PASOS5.map((p, i) => {
      const hecho = i < c, actual = i === c;
      const sub = R && (i === 1 || i === 2) && actual ?R.hechas + '/' + R.n : null;
      return h('span.p5-p' + (hecho ? '.hecho' : actual ? '.actual' : '.falta'), { 'data-k': p.k, title: p.t + (hecho ? ' · hecho' : actual ? ' · ahora' : '') },
        h('i.p5-d', hecho ? '✓' : opts.mini ? '' : p.e), opts.mini ? null : h('b.p5-t', p.t), sub && !opts.mini ? h('small.p5-s', sub) : null);
    }));
  return el;
}
