// ================= v13.3 · Descanso 🎮 : «Fusiona bobinas» (un 2048 con filamento) =================
// Para los ratos de descanso en el taller. Juego de verdad, SIN relación con los datos del negocio:
//   · no toca pedidos, stock ni puntos reales; la mejor puntuación se guarda solo en este aparato
//   · flechas / WASD en el PC, deslizar el dedo en el móvil, botones grandes para la tablet
//   · dos bobinas iguales que chocan se funden en una de color más «caro»; llega a la bobina de oro (2048)
import { h, btn } from '../ui.js';

export const meta = { id: 'fusiona', titulo: 'Fusiona bobinas', emoji: '🧵', desc: 'Un 2048 con filamento. Junta bobinas iguales hasta la de oro.' };

// ---------- Lógica pura (se prueba sin pantalla) ----------
export const N = 4;
export const vacio = () => Array.from({ length: N }, () => Array(N).fill(0));
const copia = g => g.map(r => r.slice());

// Desliza una fila hacia la izquierda: junta iguales una sola vez por jugada. Devuelve { fila, puntos, fusiones }
export function deslizaFila(fila) {
  const v = fila.filter(Boolean), out = []; let puntos = 0, fusiones = 0;
  for (let i = 0; i < v.length; i++) {
    if (v[i] === v[i + 1]) { out.push(v[i] * 2); puntos += v[i] * 2; fusiones++; i++; } else out.push(v[i]);
  }
  while (out.length < N) out.push(0);
  return { fila: out, puntos, fusiones };
}

// dir: 'izq' | 'der' | 'arr' | 'aba'. Devuelve { g, puntos, movido, fusiones }
export function mover(g, dir) {
  const cols = dir === 'arr' || dir === 'aba', rev = dir === 'der' || dir === 'aba';
  let puntos = 0, fusiones = 0, movido = false; const out = vacio();
  for (let i = 0; i < N; i++) {
    let linea = []; for (let j = 0; j < N; j++) linea.push(cols ? g[j][i] : g[i][j]);
    if (rev) linea.reverse();
    const r = deslizaFila(linea); puntos += r.puntos; fusiones += r.fusiones;
    const f = r.fila.slice(); if (rev) f.reverse();
    for (let j = 0; j < N; j++) { if (cols) out[j][i] = f[j]; else out[i][j] = f[j]; }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (out[y][x] !== g[y][x]) movido = true;
  return { g: out, puntos, movido, fusiones };
}

export function huecos(g) { const l = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g[y][x]) l.push([y, x]); return l; }
export function sinMovimientos(g) { return huecos(g).length === 0 && ['izq', 'der', 'arr', 'aba'].every(d => !mover(g, d).movido); }
export const maximo = g => Math.max(0, ...g.flat());
// Pone una bobina nueva (90 % de 2, 10 % de 4) en un hueco libre; rnd inyectable para probar
export function nueva(g, rnd = Math.random) {
  const hs = huecos(g); if (!hs.length) return { g, pos: null };
  const [y, x] = hs[Math.floor(rnd() * hs.length) % hs.length], o = copia(g); o[y][x] = rnd() < 0.9 ? 2 : 4; return { g: o, pos: [y, x] };
}
export function partida(rnd) { let g = vacio(); g = nueva(g, rnd).g; g = nueva(g, rnd).g; return g; }

// Nombres de las bobinas (solo adorno)
export const NOMBRES = { 2: 'PLA blanco', 4: 'PLA gris', 8: 'PETG azul', 16: 'PETG verde', 32: 'PLA amarillo', 64: 'PLA naranja', 128: 'PLA rojo', 256: 'Seda rosa', 512: 'Seda violeta', 1024: 'Carbono', 2048: '¡Bobina de oro!', 4096: '¡Más allá!' };

const LS = 'cd.descanso.mejor';
const leeMejor = () => { try { return Number(localStorage.getItem(LS)) || 0; } catch (e) { return 0; } };
const guardaMejor = n => { try { localStorage.setItem(LS, String(n)); } catch (e) { } };

export function render(el, ctx) {
  let g = partida(), puntos = 0, mejor = leeMejor(), prev = null, ganado = false, fin = false, ultimo = null;
  const tablero = h('div.dsc-board', { tabindex: 0, role: 'application', 'aria-label': 'Tablero. Usa las flechas del teclado o desliza' });
  const sPts = h('b', '0'), sMejor = h('b', String(mejor)), msg = h('div.dsc-msg');
  const tag = h('div.dsc-name.muted.tiny');
  const root = h('div.dsc',
    h('div.dsc-top',
      h('div.dsc-score', h('span', 'Puntos'), sPts), h('div.dsc-score', h('span', 'Mejor'), sMejor),
      btn('Nueva partida', () => reiniciar(), { icon: 'plus', cls: 'primary', title: 'Empezar de nuevo' }),
      btn('Deshacer', () => deshacer(), { title: 'Deshacer la última jugada' })),
    tag,
    h('div.dsc-wrap', tablero, msg),
    h('div.dsc-pad',
      h('span'), btn('▲', () => jugar('arr'), { title: 'Arriba' }), h('span'),
      btn('◀', () => jugar('izq'), { title: 'Izquierda' }), btn('▼', () => jugar('aba'), { title: 'Abajo' }), btn('▶', () => jugar('der'), { title: 'Derecha' })),
    h('p.muted.tiny', 'Flechas o WASD en el PC · desliza el dedo en el móvil · junta bobinas iguales hasta la de oro.'));
  el.append(root);

  const clase = v => 'dsc-t t' + Math.min(v, 4096);
  function pinta() {
    tablero.replaceChildren();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = g[y][x], c = h('div.' + (v ? clase(v).split(' ').join('.') : 'dsc-t.t0'), { 'data-v': String(v) }, v ? String(v) : '');
      if (ultimo && ultimo[0] === y && ultimo[1] === x) c.classList.add('nuevo');
      tablero.append(c);
    }
    sPts.textContent = String(puntos); sMejor.textContent = String(mejor);
    const m = maximo(g); tag.textContent = m ? 'Tu bobina más valiosa: ' + (NOMBRES[m] || m) + ' (' + m + ')' : '';
    msg.className = 'dsc-msg' + (fin ? ' on bad' : ''); msg.replaceChildren();
    if (fin) msg.append(h('b', 'No quedan movimientos'), h('span', 'Hiciste ' + puntos + ' puntos'), btn('Otra partida', () => reiniciar(), { cls: 'primary' }));
  }
  function jugar(dir) {
    if (fin) return;
    const r = mover(g, dir); if (!r.movido) return;
    prev = { g: copia(g), puntos, ganado }; g = r.g; puntos += r.puntos;
    const n = nueva(g); g = n.g; ultimo = n.pos;
    if (puntos > mejor) { mejor = puntos; guardaMejor(mejor); }
    if (!ganado && maximo(g) >= 2048) { ganado = true; }
    fin = sinMovimientos(g);
    pinta();
    if (ganado && maximo(g) >= 2048 && !fin && !root.querySelector('.dsc-win')) tablero.after(h('div.dsc-win', '🏆 ¡Bobina de oro! Puedes seguir jugando.'));
  }
  function deshacer() { if (!prev) return; g = prev.g; puntos = prev.puntos; ganado = prev.ganado; prev = null; fin = false; ultimo = null; pinta(); }
  function reiniciar() { g = partida(); puntos = 0; prev = null; fin = false; ganado = false; ultimo = null; root.querySelectorAll('.dsc-win').forEach(x => x.remove()); pinta(); tablero.focus(); }

  // teclado (solo si no se está escribiendo en otra cosa)
  const KEYS = { ArrowLeft: 'izq', ArrowRight: 'der', ArrowUp: 'arr', ArrowDown: 'aba', a: 'izq', d: 'der', w: 'arr', s: 'aba', A: 'izq', D: 'der', W: 'arr', S: 'aba' };
  const onKey = e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const d = KEYS[e.key]; if (!d) return; e.preventDefault(); jugar(d);
  };
  addEventListener('keydown', onKey);
  // deslizar con el dedo / ratón
  let t0 = null;
  tablero.addEventListener('pointerdown', e => { t0 = { x: e.clientX, y: e.clientY }; });
  tablero.addEventListener('pointerup', e => {
    if (!t0) return; const dx = e.clientX - t0.x, dy = e.clientY - t0.y; t0 = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    jugar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : (dy > 0 ? 'aba' : 'arr'));
  });
  tablero.addEventListener('pointercancel', () => { t0 = null; });
  pinta();
  window.__descanso = { grid: () => copia(g), puntos: () => puntos, set: (nuevo, p) => { g = nuevo; puntos = p || 0; fin = sinMovimientos(g); prev = null; ultimo = null; pinta(); } };
  return { destroy() { removeEventListener('keydown', onKey); delete window.__descanso; } };
}
