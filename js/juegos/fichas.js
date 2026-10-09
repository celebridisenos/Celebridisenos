// ================= v13.6 · FICHAS ⏱ : el monedero de los juegos =================
// Las fichas SOLO se ganan con tiempo activo en la app (lo mide el servidor). Aquí solo se MUESTRAN: saldo,
// lo ganado hoy, lo que falta para la siguiente, el historial y la clasificación del equipo. Ningún botón da fichas.
import { h, btn, fdt } from '../ui.js';
import { pon, leerFichas, onFichas, llamar, cargando, errorCaja, reloj } from './kit.js';

export const meta = { id: 'fichas', titulo: 'Fichas ⏱', emoji: '⏱', desc: 'Tu monedero de fichas.' };

export function render(el) {
  const R = reloj(); let vivo = true;
  const cuerpo = h('div', cargando('Leyendo tus fichas…')); el.append(cuerpo);
  async function pinta() {
    let e, rk = [];
    try { e = await llamar('fichas.estado', { historial: true }, { silencio: true }); rk = await llamar('fichas.ranking', {}, { silencio: true }).catch(() => []); }
    catch (x) { if (vivo) pon(cuerpo, errorCaja(x, pinta)); return; }
    if (!vivo) return;
    leerFichas(true);
    const faltaMin = Math.max(0, Math.ceil(e.minutos * (1 - (e.progreso || 0))));
    const big = h('div.fch-big', h('div', h('b', String(e.saldo)), h('span', 'fichas')));
    big.style.setProperty('--p', Math.round((e.progreso || 0) * 100));
    pon(cuerpo, 
      h('div.jg-card', h('div.fch-hero', big, h('div.col', { style: { gap: '6px' } },
        h('b', e.topeAlcanzado ? '✅ Hoy ya has ganado el máximo (' + e.maxDia + ')' : '⏳ Siguiente ficha en ~' + faltaMin + ' min de uso activo'),
        h('span.small.muted', 'Hoy: ' + e.hoy + ' de ' + e.maxDia + ' · 1 ficha cada ' + e.minutos + ' min activos'),
        h('span.small.muted', 'Solo cuenta el tiempo que estás USANDO la app (tocando, escribiendo, moviendo el ratón). Tenerla abierta sin usarla no suma, y pulsar botones más rápido tampoco.')))),
      h('div.jg-card', { style: { marginTop: '12px' } }, h('h3', '¿Para qué sirven?'),
        h('ul.small', h('li', h('b', '🔨 Subasta de encargos'), ': la entrada de las partidas online (el bote es para quien gana).'),
          h('li', h('b', '🌸 Vida'), ': ropa, muebles, casas y mascotas exclusivas (premium).'),
          h('li', 'No valen dinero ni se pueden cambiar por nada real. Lo que se gasta queda apuntado aquí abajo.'))),
      h('div.jg-card', { style: { marginTop: '12px' } }, h('h3', 'Movimientos'),
        e.historial && e.historial.length ? e.historial.map(m => h('div.fch-mov', h('div', h('div', m.motivo || m.tipo), h('div.tiny.muted', fdt(m.fecha))), h('div', { style: { textAlign: 'right' } }, h('div.' + (m.cantidad >= 0 ? 'mas' : 'menos'), (m.cantidad > 0 ? '+' : '') + m.cantidad), h('div.tiny.muted', 'saldo ' + m.saldo))))
          : h('p.muted.small', 'Todavía no hay movimientos. Usa la app un rato y aparecerá tu primera ficha.')),
      rk.length ? h('div.jg-card', { style: { marginTop: '12px' } }, h('h3', '🏆 Equipo'),
        h('table.jg-tabla', h('tr', h('th', ''), h('th', 'Persona'), h('th', 'Fichas'), h('th', 'Hoy')), rk.map((r, i) => h('tr', h('td', i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1)), h('td', r.nombre), h('td', String(r.saldo)), h('td', '+' + r.hoy))))) : null);
  }
  pinta();
  R.i(() => { if (document.visibilityState === 'visible') pinta(); }, 60000);
  const off = onFichas(() => { });
  return { destroy() { vivo = false; R.fin(); off(); } };
}
