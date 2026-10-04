// ================= v13.6 · AHORCADO =================
// La palabra la elige y la guarda el SERVIDOR (la app solo ve los huecos): cada letra se manda y el servidor dice si está.
// Si se pulsan varias letras seguidas se envían juntas. 7 fallos = dibujo completo. Una pista por palabra (−40 puntos).
// Puntos, racha y récords los calcula el servidor. Teclado en pantalla (con Ñ) y teclado físico.
import { h, btn } from '../ui.js';
import { pon, llamar, cargando, errorCaja, reloj, fiesta, cabecera } from './kit.js';

export const meta = { id: 'ahorcado', titulo: 'Ahorcado', emoji: '🪢', desc: 'Adivina la palabra.' };
const LETRAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
const PARTES = ['cabeza', 'cuerpo', 'brazo1', 'brazo2', 'pierna1', 'pierna2', 'cara'];

function dibujo() {
  const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 200 220'); s.setAttribute('class', 'ah-dibujo'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Dibujo del ahorcado');
  const add = (tag, at, cls) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); if (cls) e.setAttribute('class', cls); s.appendChild(e); return e; };
  add('path', { d: 'M20 210 H120 M50 210 V15 H140 V38 M50 55 L85 15' }, 'base');
  add('circle', { cx: 140, cy: 58, r: 20, 'data-p': 'cabeza' }, 'p');
  add('path', { d: 'M140 78 V140', 'data-p': 'cuerpo' }, 'p');
  add('path', { d: 'M140 92 L114 120', 'data-p': 'brazo1' }, 'p');
  add('path', { d: 'M140 92 L166 120', 'data-p': 'brazo2' }, 'p');
  add('path', { d: 'M140 140 L118 182', 'data-p': 'pierna1' }, 'p');
  add('path', { d: 'M140 140 L162 182', 'data-p': 'pierna2' }, 'p');
  add('path', { d: 'M131 52 l5 5 m0 -5 l-5 5 M144 52 l5 5 m0 -5 l-5 5 M132 68 q8 -6 16 0', 'data-p': 'cara' }, 'p');
  return s;
}

export function render(el) {
  const R = reloj(); let vivo = true, cat = '', st = null, cola = [], enviando = false, statsBox = null;
  const raiz = h('div.ah'); el.append(raiz);
  const onKey = e => {
    if (!st || st.estado !== 'juega' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const L = (e.key || '').toUpperCase();
    if (LETRAS.includes(L)) { e.preventDefault(); pulsa(L); }
  };
  document.addEventListener('keydown', onKey);

  async function inicio() {
    pon(raiz, cargando());
    let c;
    try { c = await llamar('ahorcado.categorias', {}, { silencio: true }); } catch (e) { return vivo && pon(raiz, errorCaja(e, inicio)); }
    if (!vivo) return;
    const chips = h('div.ah-cats', [{ id: '', nombre: '🎲 Cualquiera' }].concat(c.categorias).map(x => h('button.chip' + (cat === x.id ? '.on' : ''), { type: 'button', 'data-cat': x.id, onclick: ev => { cat = x.id; chips.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b === ev.currentTarget)); } }, x.nombre)));
    pon(raiz, 
      cabecera('🪢 Ahorcado', 'Adivina la palabra antes de que se complete el dibujo (7 fallos).'),
      h('div.jg-stats', st0('Puntos', c.puntos), st0('Ganadas', c.ganadas + ' / ' + c.jugadas), st0('Racha', c.racha), st0('Mejor racha', c.mejorRacha)),
      h('div.jg-card', h('h3', 'Elige un tema'), chips, h('div.row', { style: { justifyContent: 'center', marginTop: '14px' } }, btn('Jugar', nueva, { cls: 'primary' }), btn('🏆 Clasificación', ranking, { cls: 'ghost' }))));
  }
  const st0 = (t, v) => h('div.jg-stat', h('b', String(v)), h('span', t));

  async function nueva() {
    pon(raiz, cargando('Eligiendo palabra…'));
    try { st = await llamar('ahorcado.empezar', { categoria: cat }); } catch (e) { return vivo && pon(raiz, errorCaja(e, nueva)); }
    if (vivo) pintaJuego();
  }
  let svg, palabra, teclado, vidas, info, acciones;
  function pintaJuego() {
    svg = dibujo(); palabra = h('div.ah-palabra', { 'aria-live': 'polite' }); vidas = h('div.ah-vidas'); info = h('div.ah-fin'); acciones = h('div.row', { style: { justifyContent: 'center', gap: '8px', flexWrap: 'wrap' } });
    teclado = h('div.ah-teclado', LETRAS.map(L => h('button.ah-tecla', { type: 'button', 'data-l': L, 'aria-label': 'Letra ' + L, onclick: () => pulsa(L) }, L)));
    pon(raiz, h('div.tv-meta', h('span.pill', '🏷️ ' + st.categoria), h('span', st.letras + ' letras'), h('span.grow')),
      h('div.ah-wrap', svg, h('div', palabra, vidas, info, acciones)), teclado);
    actualiza();
  }
  function actualiza() {
    const ok = new Set(), mal = new Set(st.fallos);
    st.probadas.forEach(L => { if (!mal.has(L)) ok.add(L); });
    const antes = palabra.__t || ''; palabra.__t = st.tapada;
    pon(palabra, ...st.tapada.split('').map((ch, i) => h('div.ah-l' + (ch !== '_' ? '.ok' : '') + (ch !== '_' && antes[i] !== ch ? '.nueva' : '') + (st.estado === 'perdida' ? '.perdida' : ''), ch === '_' ? '' : ch)));
    svg.querySelectorAll('.p').forEach(p => p.classList.toggle('on', PARTES.indexOf(p.dataset.p) < st.fallos.length));
    pon(vidas, ...Array.from({ length: st.vidas }, (_, i) => h('span', i < st.vidas - st.fallos.length ? '❤️' : '🤍')));
    teclado.querySelectorAll('.ah-tecla').forEach(b => { const L = b.dataset.l; b.classList.toggle('bien', ok.has(L)); b.classList.toggle('mal', mal.has(L)); b.classList.toggle('espera', cola.includes(L)); b.disabled = st.estado !== 'juega' || ok.has(L) || mal.has(L); });
    if (st.estado === 'juega') {
      pon(info, st.pista ? h('div.tiny.muted', st.pista) : '');
      pon(acciones, btn('💡 Pista', pista, { cls: 'sm ghost', title: 'Destapa una letra (−40 puntos si aciertas). Una por palabra.' }), btn('Rendirse', rendirse, { cls: 'sm ghost' }));
    } else {
      const gana = st.estado === 'ganada';
      pon(info, h('h3', gana ? '🎉 ¡Acertaste!' : '😵 ¡Ahorcado!'), h('p', gana ? '+' + st.puntos + ' puntos · racha ' + st.racha : 'La palabra era «' + st.tapada + '»'));
      pon(acciones, btn('Otra palabra', nueva, { cls: 'primary' }), btn('Cambiar tema', inicio, { cls: 'ghost' }));
      if (gana) fiesta(document.body);
    }
  }
  function pulsa(L) {
    if (!st || st.estado !== 'juega' || st.probadas.includes(L) || cola.includes(L)) return;
    cola.push(L); actualiza(); R.t(envia, 150);
  }
  async function envia() {
    if (enviando || !cola.length) return;
    enviando = true; const lote = cola.slice();
    try { st = await llamar('ahorcado.letra', { id: st.id, letras: lote }); cola = cola.filter(x => !lote.includes(x)); }
    catch (e) { cola = cola.filter(x => !lote.includes(x)); }
    enviando = false;
    if (!vivo) return;
    actualiza();
    if (cola.length) envia();
  }
  async function pista(ev) { const b = ev.target.closest('button'); b.disabled = true; try { st = await llamar('ahorcado.pista', { id: st.id }); actualiza(); } catch (e) { b.disabled = false; } }
  async function rendirse() { try { st = await llamar('ahorcado.rendirse', { id: st.id }); actualiza(); } catch (e) { } }
  async function ranking() {
    pon(raiz, cargando());
    let r = []; try { r = await llamar('juegos.ranking', { juego: 'ahorcado' }, { silencio: true }); } catch (e) { }
    if (!vivo) return;
    pon(raiz, cabecera('🏆 Clasificación del equipo', 'Puntos acumulados en el Ahorcado'),
      r.length ? h('table.jg-tabla', r.map((x, i) => h('tr' + (x.yo ? '.yo' : ''), h('td', String(i + 1)), h('td', x.nombre), h('td', x.puntos + ' pts'), h('td.muted', x.detalle)))) : h('p.muted', 'Aún nadie ha jugado.'),
      h('div.row', { style: { marginTop: '12px' } }, btn('Volver', inicio, { cls: 'ghost' })));
  }
  inicio();
  return { destroy() { vivo = false; R.fin(); document.removeEventListener('keydown', onKey); } };
}
