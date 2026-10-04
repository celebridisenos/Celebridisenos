// ================= v13.6 · Piezas comunes de los juegos (mismo aspecto en todos) =================
// · fichasChip(): saldo de FICHAS ⏱ (la moneda común). Lo lee del servidor; la app nunca lo calcula ni lo cambia.
// · llamar(): llamada al servidor con mensaje claro si falla (sin códigos técnicos).
// · cargando()/vacio()/aviso(): estados de carga, pantallas vacías y errores con el mismo diseño.
// · cancelable: cada juego registra sus temporizadores y se limpian al salir.
import { h, btn, toast, mount } from '../ui.js';
import { api } from '../store.js';

export const EST = { saldo: null, hoy: 0, maxDia: 0, minutos: 5, progreso: 0, t: 0 };
const subs = new Set();
export function onFichas(fn) { subs.add(fn); return () => subs.delete(fn); }
export async function leerFichas(force) {
  if (!force && EST.saldo !== null && Date.now() - EST.t < 30000) return EST;
  try { Object.assign(EST, await api('fichas.estado', {}, { quiet: true, timeout: 20000 }), { t: Date.now() }); subs.forEach(f => { try { f(EST); } catch (e) { } }); } catch (e) { }
  return EST;
}
export function setSaldo(n) { if (typeof n === 'number') { EST.saldo = n; EST.t = Date.now(); subs.forEach(f => { try { f(EST); } catch (e) { } }); } }
// Chip «⏱ 12» con anillo de progreso hasta la siguiente ficha. Se actualiza cada minuto mientras se ve.
export function fichasChip(opts = {}) {
  const ring = h('span.fch-ring'), n = h('b', '…');
  const el = h('a.fch-chip', { href: '#/descanso/fichas', title: 'Tus fichas ⏱ (se ganan usando la app)' }, ring, h('span.fch-ic', '⏱'), n, opts.texto ? h('span.tiny', ' fichas') : null);
  const pinta = e => { n.textContent = e.saldo === null ? '…' : String(e.saldo); ring.style.setProperty('--p', Math.round((e.progreso || 0) * 100)); el.classList.toggle('tope', !!e.topeAlcanzado); };
  const off = onFichas(pinta); pinta(EST); leerFichas();
  const t = setInterval(() => { if (!document.body.contains(el)) { clearInterval(t); off(); return; } if (document.visibilityState === 'visible') leerFichas(true); }, 60000);
  return el;
}

export async function llamar(a, d, opts = {}) {
  try { return await api(a, d, Object.assign({ quiet: true, timeout: 30000 }, opts)); }
  catch (e) {
    const m = e.code === 'NET' ? 'Sin conexión con el servidor. Comprueba Internet y vuelve a intentarlo.' : e.code === 'PERM' ? 'No tienes permiso para jugar (hace falta el permiso del chat del equipo).' : e.message || 'No se ha podido completar.';
    if (!opts.silencio) toast(m, e.code === 'FICHAS' ? 'warn' : 'bad', 6000);
    const err = new Error(m); err.code = e.code; err.extra = e.extra; throw err;
  }
}
export const cargando = txt => h('div.jg-load', h('span.jg-spin'), h('span', txt || 'Cargando…'));
export const vacio = (ic, tit, txt, accion) => h('div.jg-empty', h('div.jg-empty-ic', ic), h('h3', tit), txt ? h('p.muted', txt) : null, accion || null);
export const aviso = (txt, tipo) => h('div.jg-aviso.' + (tipo || 'info'), txt);
export function errorCaja(e, reintentar) { return h('div.jg-empty', h('div.jg-empty-ic', '⚠️'), h('h3', 'No se ha podido cargar'), h('p.muted', (e && e.message) || String(e)), reintentar ? btn('Reintentar', reintentar, { cls: 'primary' }) : null); }
export function cabecera(titulo, sub, derecha) { return h('div.jg-head', h('div.grow', h('h2', titulo), sub ? h('div.muted.small', sub) : null), derecha || null); }
// Temporizadores que se limpian solos al salir del juego
export function reloj() {
  const ts = new Set();
  return { t: (fn, ms) => { const x = setTimeout(() => { ts.delete(x); fn(); }, ms); ts.add(x); return x; }, i: (fn, ms) => { const x = setInterval(fn, ms); ts.add(x); return x; }, fin: () => { ts.forEach(x => { clearTimeout(x); clearInterval(x); }); ts.clear(); } };
}
// Lluvia de confeti ligera (respeta «reducir movimiento»)
export function fiesta(el) {
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) { }
  const box = h('div.jg-fiesta'); el.appendChild(box);
  const cols = ['#e0457b', '#7c3aed', '#f59e0b', '#10b981', '#3b82f6'];
  for (let i = 0; i < 26; i++) { const p = h('i'); p.style.setProperty('--x', Math.round(Math.random() * 100) + '%'); p.style.setProperty('--d', (0.6 + Math.random() * 0.9).toFixed(2) + 's'); p.style.setProperty('--c', cols[i % cols.length]); box.appendChild(p); }
  setTimeout(() => box.remove(), 1800);
}
export const esc = s => String(s == null ? '' : s);
// Sustituye el contenido de un elemento ignorando null/false (replaceChildren pintaría «null»)
export const pon = (el, ...kids) => mount(el, ...kids);
