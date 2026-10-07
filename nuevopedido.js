// ================= v12.8 · ¡Pedido nuevo! =================
// Cuando entra un pedido de verdad (de la tienda web o creado por otra persona del equipo) sale un cartel grande con confeti
// y, si quieres, un sonido corto. Solo en este dispositivo y solo se activa lo que tú decidas:
//   · cartel + confeti: activado de fábrica (silencioso)   · sonido: apagado de fábrica
// NUNCA se celebra lo que ya estaba al abrir el programa, ni un pedido tuyo hecho a mano, ni uno cancelado, ni uno de hace rato.
// En la pantalla TV no se muestran nombres ni importes (la ve quien pase por el taller).
import { h } from './ui.js';
import { S, can, on } from './store.js';
import { confeti } from './premium.js';

const CL = window.CL;
const KEY = 'cd.celeb';
const VENTANA_MS = 15 * 60 * 1000; // un pedido de hace más de 15 min no se celebra (p. ej. al volver la conexión)
export function prefs() { try { return Object.assign({ on: true, sonido: false }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { on: true, sonido: false }; } }
export function guardarPrefs(p) { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(prefs(), p))); } catch (e) { } }

// Función pura: de los pedidos y de los ya vistos, ¿cuáles hay que celebrar? (se prueba sola)
export function pedidosParaCelebrar(vistos, pedidos, ctx) {
  const out = [];
  pedidos.forEach(o => {
    if (vistos.has(o.id)) return; vistos.add(o.id);
    if (!ctx.armado) return; // lo que ya existía al arrancar no se celebra
    if (CL.stateOf(ctx.estados, o.estado).cancelled) return;
    const t = Date.parse(o.creado || ''); if (!t || ctx.ahora - t > VENTANA_MS || t - ctx.ahora > 5 * 60 * 1000) return;
    const web = !!o.refWeb || /web|tienda/i.test(String(o.canal || ''));
    if (!web && (!o.creadoPor || o.creadoPor === ctx.yo)) return; // lo que tú misma has apuntado a mano no se celebra
    out.push(o);
  });
  return out;
}

export function sonar() { // tres notas suaves (WebAudio, sin archivos)
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)(), t0 = a.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + i * 0.13); g.gain.exponentialRampToValueAtTime(0.06, t0 + i * 0.13 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.13 + 0.45); o.connect(g); g.connect(a.destination); o.start(t0 + i * 0.13); o.stop(t0 + i * 0.13 + 0.5); });
    setTimeout(() => { try { a.close(); } catch (e) { } }, 1500);
  } catch (e) { }
}

let cartel = null, cierra = 0;
export function mostrar(lista) {
  const p = prefs(); if (!p.on || !lista.length) return false;
  if (document.hidden || document.body.classList.contains('printing')) return false;
  const tv = document.body.classList.contains('tv-on');
  const uno = lista.length === 1 ? lista[0] : null;
  const cant = o => (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + (o.producto || 'producto');
  const quien = o => { const n = String(o.cliente || '').trim().split(/\s+/)[0]; return n ? ' · ' + n : ''; };
  // v16.2: una venta de la tienda web se anuncia como lo que es; y si era la última unidad, se dice
  const esWeb = o => !!o.refWeb || /web|tienda/i.test(String(o.canal || ''));
  const agot = o => { const p = (S.t.productos || []).find(x => x.id === o.productoId); const w = p && p.web; return !!(w && w.publicado && w.stockModo === 'contado' && !(Number(w.stock) > 0)); };
  const t = uno ? (esWeb(uno) ? '🎉 ¡PRODUCTO VENDIDO!' : '🛒 ¡Pedido nuevo!') : (lista.every(esWeb) ? '🎉 ¡' + lista.length + ' VENTAS en la web!' : '🛒 ¡' + lista.length + ' pedidos nuevos!');
  const s = uno ? 'nº ' + uno.numero + ' · ' + cant(uno) + (tv ? '' : quien(uno)) + (esWeb(uno) && agot(uno) ? ' · 🔴 AGOTADO: era la última' : '') : lista.slice(0, 3).map(o => 'nº ' + o.numero).join(' · ') + (lista.length > 3 ? ' …' : '');
  if (cartel) cartel.remove(); clearTimeout(cierra);
  cartel = h('div.pn-cartel', { role: 'status', 'aria-live': 'polite', onclick: () => { cartel && cartel.remove(); cartel = null; if (uno && !tv) location.hash = '#/pedidos/' + uno.id; } }, h('div.pn-t', t), h('div.pn-s', s));
  document.body.appendChild(cartel);
  cierra = setTimeout(() => { if (cartel) { cartel.classList.add('out'); const c = cartel; setTimeout(() => c.remove(), 400); cartel = null; } }, tv ? 9000 : 6500);
  confeti({ n: tv ? 220 : 140, ms: 2800 });
  if (p.sonido) sonar();
  return true;
}

let iniciado = false, armado = false, vistos = new Set(), pend = 0;
export function startNuevoPedido() {
  if (iniciado) return; iniciado = true;
  const scan = () => {
    if (!S.me || !S.cfg || !can('pedidos.ver')) return;
    const lista = pedidosParaCelebrar(vistos, S.t.pedidos || [], { armado, ahora: Date.now(), yo: S.me.nombre, estados: S.cfg.pedidos });
    if (!armado) { armado = true; return; } // el primer escaneo solo anota lo que ya había
    if (lista.length) mostrar(lista);
  };
  scan();
  on(() => { clearTimeout(pend); pend = setTimeout(scan, 300); });
}
export const _t = { vistos: () => vistos, armado: () => armado, reset() { vistos = new Set(); armado = false; } };
