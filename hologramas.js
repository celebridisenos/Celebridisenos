// ================= v16 · HOLOGRAMAS: figuras 3D que aparecen unos segundos y se van =================
// Se mantiene el fondo de siempre. De vez en cuando (cada 1–2 minutos) asoma una figura en «alambre» holográfico:
// pieza 3D, casa, coche, maceta, engranaje, bobina, figura tipo anime, boquilla imprimiendo, corazón, lámpara.
// Hecho para NO gastar: es un único dibujo SVG animado por CSS (solo opacidad y giro, lo hace la tarjeta gráfica),
// no hay bucle de dibujo, no sale mientras escribes ni con una ventana abierta, ni con la pestaña oculta, ni en
// modo taller / TV, ni si el aparato pide «menos movimiento». Tocarla la hace girar y cambia de figura.
const SVGNS = 'http://www.w3.org/2000/svg';
// Dibujos en un cuadro de 100 × 100 (trazos sueltos separados por «M»)
export const FIGURAS = [
  ['Pieza 3D', 'M50 12 L84 30 L84 68 L50 88 L16 68 L16 30 Z M16 30 L50 48 L84 30 M50 48 L50 88 M33 21 L67 39 M67 21 L33 39'],
  ['Casa', 'M14 50 L50 18 L86 50 M22 44 L22 86 L78 86 L78 44 M42 86 L42 62 L58 62 L58 86 M28 54 L38 54 L38 64 L28 64 Z M62 54 L72 54 L72 64 L62 64 Z M64 30 L64 20 L72 20 L72 37'],
  ['Coche', 'M8 62 L14 62 M30 62 L66 62 M82 62 L92 62 L92 50 L78 46 L66 32 L34 32 L22 46 L8 50 Z M34 32 L30 46 L78 46 M50 32 L50 46 M22 62 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M74 62 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0'],
  ['Maceta', 'M30 46 L70 46 L64 88 L36 88 Z M26 38 L74 38 L74 46 L26 46 Z M33 60 L67 60 M35 74 L65 74 M50 38 C50 26 42 18 32 16 C34 28 40 34 50 38 M50 38 C52 24 60 14 72 12 C70 26 62 34 50 38 M50 38 L50 22'],
  ['Engranaje', 'M50 30 a20 20 0 1 0 0.1 0 Z M50 42 a8 8 0 1 0 0.1 0 Z M46 14 L54 14 L55 24 L45 24 Z M46 86 L54 86 L55 76 L45 76 Z M14 46 L14 54 L24 55 L24 45 Z M86 46 L86 54 L76 55 L76 45 Z M22 27 L27 22 L35 29 L29 35 Z M78 27 L73 22 L65 29 L71 35 Z M22 73 L27 78 L35 71 L29 65 Z M78 73 L73 78 L65 71 L71 65 Z'],
  ['Bobina', 'M30 14 a8 36 0 1 0 0.1 0 Z M70 14 a8 36 0 1 0 0.1 0 Z M30 14 L70 14 M30 86 L70 86 M34 26 L66 26 M35 38 L65 38 M36 50 L64 50 M35 62 L65 62 M34 74 L66 74 M70 46 a3 4 0 1 0 0.1 0 Z M78 60 C88 62 90 74 82 82 C76 88 80 94 88 94'],
  ['Figura', 'M30 26 L26 8 L42 18 M70 26 L74 8 L58 18 M50 16 C28 16 24 34 28 46 C32 56 68 56 72 46 C76 34 72 16 50 16 Z M40 34 a3 4 0 1 0 0.1 0 Z M60 34 a3 4 0 1 0 0.1 0 Z M46 44 Q50 48 54 44 M40 56 L36 78 L64 78 L60 56 M36 62 L24 70 M64 62 L76 70 M42 78 L42 90 L34 90 M58 78 L58 90 L66 90 M26 96 L74 96'],
  ['Imprimiendo', 'M34 8 L66 8 L66 30 L58 30 L54 42 L46 42 L42 30 L34 30 Z M40 16 L60 16 M48 42 L50 50 L52 42 M22 58 L78 58 M20 66 L80 66 M18 74 L82 74 M16 82 L84 82 M10 90 L90 90 M10 90 L16 82 M90 90 L84 82'],
  ['Corazón', 'M50 86 L16 48 L22 26 L38 20 L50 32 L62 20 L78 26 L84 48 Z M22 26 L50 50 L78 26 M16 48 L50 50 L84 48 M50 32 L50 86 M38 20 L50 50 L62 20'],
  ['Lámpara', 'M36 12 L64 12 L78 46 L22 46 Z M50 46 L50 78 M34 88 L66 88 L60 78 L40 78 Z M30 30 L70 30 M44 12 L38 46 M56 12 L62 46 M28 56 L22 62 M72 56 L78 62 M50 54 L50 60']
];
const K = 'cd.holo';
export const holoOn = () => { try { return localStorage.getItem(K) !== '0'; } catch (e) { return true; } };
export function setHolo(v) { try { localStorage.setItem(K, v ? '1' : '0'); } catch (e) { } if (!v) quitar(); else programar(4000); return !!v; }
const calma = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

let caja = null, timer = 0, fuera = 0, ultima = -1, iniciado = false;
function quitar() { clearTimeout(fuera); if (caja) { caja.remove(); caja = null; } }
function ocupado() {
  const b = document.body, a = document.activeElement;
  return document.hidden || !document.documentElement.classList.contains('ui14') || !document.querySelector('.shell') || !!document.querySelector('.overlay, .drawer-o') ||
    b.classList.contains('operario') || b.classList.contains('tv-on') || ['estudio', 'descanso', 'estanteria', 'camaras', 'tv'].includes(b.dataset.view || '') ||
    (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
}
function dibujar(i) {
  const svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<defs><linearGradient id="holo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#a78bfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>' +
    '<path class="holo-l" d="' + FIGURAS[i][1] + '"/>';
  return svg;
}
export function mostrar(i, ms) {
  if (typeof i !== 'number') { do { i = Math.floor(Math.random() * FIGURAS.length); } while (i === ultima && FIGURAS.length > 1); }
  ultima = i; quitar();
  caja = document.createElement('div'); caja.className = 'holo'; caja.title = FIGURAS[i][0] + ' · toca para cambiar';
  const fig = document.createElement('div'); fig.className = 'holo-f'; fig.appendChild(dibujar(i));
  const base = document.createElement('div'); base.className = 'holo-b';
  caja.append(fig, base);
  caja.addEventListener('click', () => { if (!caja) return; const sig = (ultima + 1) % FIGURAS.length; ultima = sig; fig.classList.remove('giro'); void fig.offsetWidth; fig.classList.add('giro'); setTimeout(() => { if (caja) { fig.replaceChildren(dibujar(sig)); caja.title = FIGURAS[sig][0] + ' · toca para cambiar'; } }, 260); clearTimeout(fuera); fuera = setTimeout(salir, 6000); });
  document.body.appendChild(caja);
  fuera = setTimeout(salir, ms || 8500);
  return FIGURAS[i][0];
}
function salir() { if (!caja) return; const c = caja; c.classList.add('fuera'); setTimeout(() => { if (caja === c) quitar(); else c.remove(); }, 700); }
function programar(ms) {
  clearTimeout(timer);
  if (!holoOn() || calma()) return;
  timer = setTimeout(() => { if (ocupado()) return programar(15000); mostrar(); programar(60000 + Math.random() * 60000); }, ms);
}
export function iniciar() {
  if (iniciado) return; iniciado = true;
  document.addEventListener('visibilitychange', () => { if (document.hidden) quitar(); });
  programar(14000);
}
