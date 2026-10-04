// ================= v13.4 · Descanso 🎮 : sala de juegos del taller =================
// Solo para pasar el rato: ningún juego toca pedidos, stock, clientes ni puntos reales.
// #/descanso → menú de juegos · #/descanso/<juego> → el juego. Cada juego vive en js/juegos/<id>.js (ver juegos/index.js).
import { h, btn, toast } from '../ui.js';
import { S, api } from '../store.js';
import { go } from '../app.js';
import { JUEGOS } from '../juegos/index.js';
import { fichasChip } from '../juegos/kit.js';
export { N, vacio, deslizaFila, mover, huecos, sinMovimientos, maximo, nueva, partida, NOMBRES } from '../juegos/fusiona.js';

export function render(el, params) {
  const root = h('div.dsc-hub'); el.append(root);
  let actual = null, token = 0;
  const cierra = () => { if (actual && actual.destroy) { try { actual.destroy(); } catch (e) { console.error(e); } } actual = null; };
  async function abre(id) {
    cierra(); const mi = ++token; root.replaceChildren();
    const j = JUEGOS.find(x => x.id === id);
    if (!j) {
      root.append(h('div.page-head', h('h1', '🎮 Descanso'), h('span.grow'), fichasChip({ texto: true })),
        h('p.muted.small.dsc-sub', 'Para pasar el rato · no afecta a tus datos · las fichas ⏱ se ganan usando la app'),
        h('div.dsc-grid', JUEGOS.filter(g => !g.oculto).map(g => h('a.dsc-card', { href: '#/descanso/' + g.id, 'data-juego': g.id },
          h('div.dsc-ic', g.emoji), h('div.dsc-ct', h('b', g.titulo), h('span.muted.tiny', g.desc)), g.tag ? h('span.pill.dsc-tag', g.tag) : null))));
      return;
    }
    const caja = h('div.dsc-game', { 'data-juego': j.id });
    root.append(h('div.page-head.dsc-ghead', h('h1', j.emoji + ' ' + j.titulo), h('span.grow'), j.id !== 'fichas' ? fichasChip() : null, btn('Todos los juegos', () => go('descanso'), { cls: 'ghost', title: 'Volver al menú de juegos' })), caja);
    try {
      const m = await j.cargar(); if (mi !== token) return;
      actual = m.render(caja, { api, me: S.me, h, btn, toast, volver: () => go('descanso') }) || {};
    } catch (e) { console.error(e); caja.append(h('div.card', h('h3', 'No se pudo abrir el juego'), h('p.muted', String(e.message || e)))); }
  }
  abre((params && params[0]) || '');
  return { params(p) { abre((p && p[0]) || ''); }, destroy() { token++; cierra(); } };
}
