// ================= v13.4 · Descanso 🎮 : «Capas» 🎁 — el juego sorpresa (un Tetris completo con tema de impresión 3D) =================
// Las piezas son «capas» de filamento que se apilan sobre la cama de impresión; al completar una línea la capa se funde.
// Solo para pasar el rato: NO toca pedidos, stock ni puntos reales. El récord se guarda solo en este aparato (localStorage).
//   · PC: ← → mover · ↓ bajar · ↑ / X girar · Z girar al revés · Espacio caída dura · C / Shift guardar · P pausa
//   · Móvil: botones grandes en pantalla y gestos en el tablero (deslizar, tocar, deslizar rápido abajo)
// La lógica (tablero, piezas, rotación, puntuación…) vive en tetris_logic.js y se prueba en Node.
import { h, btn, toast } from '../ui.js';
import * as T from './tetris_logic.js';

export const meta = { id: 'tetris', titulo: 'Capas', emoji: '🎁', desc: 'La sorpresa: apila piezas como capas de una impresión 3D.' };

const LS = 'cd.descanso.capas';
const leeRecord = () => { try { return Number(localStorage.getItem(LS)) || 0; } catch (e) { return 0; } };
const guardaRecord = n => { try { localStorage.setItem(LS, String(n)); } catch (e) { } };

// Colores de «bobina» por pieza (bien distintos entre sí)
const COLOR = { I: '#22d3ee', O: '#facc15', T: '#a855f7', S: '#4ade80', Z: '#f43f5e', J: '#3b82f6', L: '#fb923c' };
const GRIS = '#94a3b8'; // por si el tablero trae una celda de otro tipo (solo en pruebas)
const colDe = v => COLOR[v] || GRIS;
const LOCK_MS = 500, MAX_RESETS = 15, ANIM_MS = 340;

// ---------- utilidades de dibujo ----------
const rgb = c => c[0] === '#' ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).slice(0, 3).map(Number); // acepta '#rrggbb' o 'rgb(r,g,b)'
function mezcla(a, b, t) { const x = rgb(a), y = rgb(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')'; }
function rr(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// Un bloque = un trozo de capa de filamento: degradado, bisel y dos «líneas de capa»
function bloque(g, px, py, c, col, a = 1) {
  const i = Math.max(0.6, c * 0.045), s = c - i * 2, r = c * 0.16;
  g.save(); g.globalAlpha = a;
  const gr = g.createLinearGradient(px, py, px + c, py + c);
  gr.addColorStop(0, mezcla(col, '#ffffff', 0.32)); gr.addColorStop(0.55, col); gr.addColorStop(1, mezcla(col, '#000000', 0.34));
  g.fillStyle = gr; rr(g, px + i, py + i, s, s, r); g.fill();
  g.save(); rr(g, px + i, py + i, s, s, r); g.clip();
  const b = Math.max(1, c * 0.12);
  g.fillStyle = 'rgba(255,255,255,.34)'; g.fillRect(px + i, py + i, s, b); g.fillRect(px + i, py + i, b, s);
  g.fillStyle = 'rgba(0,0,0,.26)'; g.fillRect(px + i, py + c - i - b, s, b); g.fillRect(px + c - i - b, py + i, b, s);
  g.fillStyle = 'rgba(0,0,0,.13)'; const lh = Math.max(1, c * 0.05); g.fillRect(px + i, py + c * 0.36, s, lh); g.fillRect(px + i, py + c * 0.62, s, lh);
  g.restore(); g.restore();
}
function fantasma(g, px, py, c, col) {
  const i = Math.max(1, c * 0.07); g.save(); g.globalAlpha = 1;
  g.fillStyle = mezcla(col, '#000000', 0.55); g.globalAlpha = 0.28; rr(g, px + i, py + i, c - i * 2, c - i * 2, c * 0.14); g.fill();
  g.globalAlpha = 0.75; g.strokeStyle = col; g.lineWidth = Math.max(1, c * 0.06); rr(g, px + i + 0.5, py + i + 0.5, c - i * 2 - 1, c - i * 2 - 1, c * 0.14); g.stroke(); g.restore();
}
// Pieza pequeña centrada en un hueco (para «Guardada» y «Siguientes»)
function miniPieza(g, t, cx, cy, c, a = 1) {
  const cs = T.celdas(t, 0); const xs = cs.map(v => v[0]), ys = cs.map(v => v[1]);
  const w = Math.max(...xs) - Math.min(...xs) + 1, hh = Math.max(...ys) - Math.min(...ys) + 1;
  const ox = cx - (w * c) / 2 - Math.min(...xs) * c, oy = cy - (hh * c) / 2 - Math.min(...ys) * c;
  for (const [x, y] of cs) bloque(g, ox + x * c, oy + y * c, c, COLOR[t], a);
}

export function render(el, ctx) {
  const rnd = Math.random;
  let s = T.nuevaPartida({ rng: rnd });
  let fase = 'listo', mejor = leeRecord(), nuevoRecord = false;
  let acc = 0, lockT = 0, resets = 0, last = 0, raf = 0, anim = null, chispas = [], banner = null;
  let sonido = false, audio = null, sufijoCola = '';
  const timers = new Set(), reps = new Map();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

  // ---------- DOM ----------
  const cv = h('canvas.cap-canvas', { 'aria-label': 'Tablero de Capas', role: 'img' });
  const ov = h('div.cap-ov'), ban = h('div.cap-banner', { 'aria-live': 'polite' });
  const wrap = h('div.cap-wrap', cv, ban, ov);
  const cvHold = h('canvas.cap-mini'), cvNext = h('canvas.cap-mini.cap-next');
  const sPts = h('b.cap-pts', '0'), sRec = h('b.cap-rec', String(mejor)), sLin = h('b.cap-lin', '0'), sNiv = h('b.cap-niv', '1');
  const boton = (act, txt, label, cls) => h('button.cap-b' + (cls ? '.' + cls : ''), { type: 'button', 'data-act': act, 'aria-label': label, title: label, tabindex: '-1' }, txt);
  const bPausa = boton('pausa', '⏸', 'Pausa (P)', 'mini'), bSon = boton('sonido', '🔇', 'Sonido apagado', 'mini');
  const hold = h('div.cap-box.cap-hold', { title: 'Guardar la pieza (C)', 'data-act': 'guardar' }, h('span.cap-lb', 'Guardada'), cvHold);
  const root = h('div.cap',
    h('div.cap-main', wrap,
      h('div.cap-side', hold, h('div.cap-box', h('span.cap-lb', 'Siguientes'), cvNext),
        h('div.cap-stats',
          h('div.cap-stat', h('span', 'Puntos'), sPts), h('div.cap-stat', h('span', 'Récord'), sRec),
          h('div.cap-stat', h('span', 'Capas'), sLin), h('div.cap-stat', h('span', 'Nivel'), sNiv)),
        h('div.cap-mbtns', bPausa, bSon))),
    h('div.cap-pad',
      boton('izq', '◀', 'Mover a la izquierda'), boton('rotar', '↻', 'Girar', 'big'), boton('der', '▶', 'Mover a la derecha'),
      boton('guardar', 'Guardar', 'Guardar pieza', 'txt'), boton('bajar', '▼', 'Bajar'), boton('caer', '⤓', 'Caída dura')),
    h('p.muted.tiny.cap-help.cap-help-pc', '← → mover · ↓ bajar · ↑ o X girar · Z girar al revés · Espacio caída dura · C guardar · P pausa'),
    h('p.muted.tiny.cap-help.cap-help-touch', 'Tablero: desliza = mover · toca = girar · desliza rápido ↓ = soltar · desliza ↑ = guardar'));
  el.append(root);
  const g = cv.getContext('2d'), gH = cvHold.getContext('2d'), gN = cvNext.getContext('2d');
  let cssW = 0, cssH = 0, cell = 0, dpr = 1;

  // ---------- tamaño del canvas (nítido en pantallas de alta densidad) ----------
  function ajusta() {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    dpr = Math.min(3, window.devicePixelRatio || 1); cssW = r.width; cssH = r.height; cell = cssW / T.COLS;
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    for (const [c, w, hh] of [[cvHold, 76, 52], [cvNext, 76, 150]]) { c.width = w * dpr; c.height = hh * dpr; }
    sufijoCola = ''; pintaMinis(); sufijoCola = s.cola.slice(0, 3).join('') + '|' + (s.hold || '-') + (s.holdUsado ? 'x' : ''); // las piezas pequeñas se redibujan con el nuevo tamaño
  }
  let ro = null; try { ro = new ResizeObserver(() => ajusta()); ro.observe(cv); } catch (e) { }
  addEventListener('resize', ajusta);

  // ---------- sonido (apagado por defecto; solo se crea tras un gesto del usuario) ----------
  function tono(f, d, tipo = 'square', vol = 0.05, f2) {
    if (!sonido || !audio) return;
    try {
      const o = audio.createOscillator(), v = audio.createGain(), t = audio.currentTime;
      o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(v); v.connect(audio.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { }
  }
  const sfx = {
    mueve: () => tono(300, 0.04, 'square', 0.025), gira: () => tono(480, 0.06, 'triangle', 0.05, 620), guarda: () => tono(380, 0.1, 'sine', 0.06, 520),
    bloquea: () => tono(140, 0.09, 'square', 0.06, 90), cae: () => tono(220, 0.14, 'sawtooth', 0.05, 70),
    linea: n => [0, 1, 2, 3].slice(0, Math.min(4, n) + 1).forEach((_, i) => later(() => tono(440 * Math.pow(1.26, i), 0.14, 'triangle', 0.07), i * 70)),
    nivel: () => [523, 659, 784, 1047].forEach((f, i) => later(() => tono(f, 0.14, 'square', 0.05), i * 90)),
    fin: () => [392, 330, 262, 196].forEach((f, i) => later(() => tono(f, 0.28, 'sawtooth', 0.06), i * 190))
  };
  function alternaSonido() {
    sonido = !sonido;
    if (sonido && !audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; sonido = false; } }
    if (sonido && audio && audio.state === 'suspended') { try { audio.resume(); } catch (e) { } }
    bSon.textContent = sonido ? '🔊' : '🔇'; bSon.title = bSon.ariaLabel = sonido ? 'Sonido encendido' : 'Sonido apagado'; bSon.setAttribute('aria-label', bSon.title);
    if (sonido) sfx.gira();
  }

  // ---------- estado de la partida ----------
  const resetLock = () => { lockT = 0; resets = 0; };
  function actualizaRecord() { if (s.puntos > mejor) { mejor = s.puntos; nuevoRecord = true; guardaRecord(mejor); } }
  function refresca() {
    actualizaRecord();
    sPts.textContent = String(s.puntos); sRec.textContent = String(mejor); sLin.textContent = String(s.lineas); sNiv.textContent = String(s.nivel);
    const suf = s.cola.slice(0, 3).join('') + '|' + (s.hold || '-') + (s.holdUsado ? 'x' : '');
    if (suf !== sufijoCola) { sufijoCola = suf; pintaMinis(); }
    hold.classList.toggle('usada', !!s.holdUsado);
    bPausa.textContent = fase === 'pausa' ? '▶' : '⏸'; bPausa.title = fase === 'pausa' ? 'Reanudar (P)' : 'Pausa (P)'; bPausa.setAttribute('aria-label', bPausa.title);
  }
  function pintaMinis() {
    const c = Math.min(15, (cvHold.width / dpr) / 5);
    gH.setTransform(dpr, 0, 0, dpr, 0, 0); gH.clearRect(0, 0, cvHold.width, cvHold.height);
    if (s.hold) miniPieza(gH, s.hold, 38, 26, c, s.holdUsado ? 0.35 : 1);
    gN.setTransform(dpr, 0, 0, dpr, 0, 0); gN.clearRect(0, 0, cvNext.width, cvNext.height);
    s.cola.slice(0, 3).forEach((t, i) => miniPieza(gN, t, 38, 25 + i * 50, c));
  }
  function anuncia(txt, cls) {
    ban.textContent = txt; ban.className = 'cap-banner' + (cls ? ' ' + cls : ''); void ban.offsetWidth; ban.classList.add('on');
    clearTimeout(banner); timers.delete(banner); banner = later(() => ban.classList.remove('on'), 1100);
  }
  const TXT = ['', 'Capa fundida', '¡Doble capa!', '¡Triple capa!', '¡CAMA COMPLETA!'];
  // Se llama tras cada pieza bloqueada. res = resultado de bloquear()/termina() (con o sin borrado pendiente)
  function despuesDeBloquear(res) {
    if (!res) return;
    resetLock(); acc = 0;
    if (res.pendiente) { // animar la fusión de las líneas y terminar luego
      anim = { filas: res.filas.slice(), t0: performance.now() };
      const n = res.lineas, combo = s.combo + 1; sfx.linea(n);
      anuncia(TXT[Math.min(4, n)] + (combo > 0 ? ' · combo ×' + combo : ''), n >= 4 ? 'epico' : '');
      chispas = []; for (const y of res.filas) for (let k = 0; k < 16; k++) { const x = Math.random() * T.COLS; chispas.push({ x, y: y + 0.5, vx: (Math.random() - 0.5) * 7, vy: -2 - Math.random() * 6, v: 0.5 + Math.random() * 0.6, col: Math.random() < 0.5 ? '#ffd37a' : '#ffffff' }); }
      refresca(); return;
    }
    if (res.lineas) { sfx.linea(res.lineas); anuncia(res.nivelSube ? '¡Nivel ' + s.nivel + '!' : TXT[Math.min(4, res.lineas)]); if (res.nivelSube) sfx.nivel(); } else sfx.bloquea();
    if (res.fin || s.fin) return terminaPartida();
    refresca();
  }
  function terminaAnim() {
    const r = T.termina(s); anim = null; resetLock(); acc = 0;
    if (r.nivelSube) later(() => { sfx.nivel(); anuncia('¡Nivel ' + s.nivel + '!'); }, 500);
    if (r.fin || s.fin) return terminaPartida();
    refresca();
  }
  function terminaPartida() {
    fase = 'fin'; anim = null; sfx.fin(); actualizaRecord(); refresca(); muestraOv();
    if (nuevoRecord && s.puntos > 0) toast('🏆 ¡Nuevo récord en Capas: ' + s.puntos + '!', 'ok');
  }
  function nueva() { s = T.nuevaPartida({ rng: rnd }); anim = null; chispas = []; nuevoRecord = false; acc = 0; resetLock(); sufijoCola = ''; fase = 'jugando'; ban.classList.remove('on'); refresca(); muestraOv(); }
  function pausa(forzar) {
    if (fase === 'jugando') { fase = 'pausa'; soltarTodo(); } else if (fase === 'pausa' && forzar !== true) { fase = 'jugando'; last = performance.now(); } else return;
    refresca(); muestraOv();
  }

  // ---------- acciones del jugador ----------
  function accion(a) {
    if (a === 'pausa') return pausa();
    if (a === 'sonido') return alternaSonido();
    if (fase === 'listo' || fase === 'fin') return nueva();
    if (fase !== 'jugando' || anim || s.fin || !s.pieza) return;
    const suelo = T.enSuelo(s); let ok = false;
    switch (a) {
      case 'izq': ok = T.mover(s, -1); if (ok) sfx.mueve(); break;
      case 'der': ok = T.mover(s, 1); if (ok) sfx.mueve(); break;
      case 'rotar': ok = T.rotar(s, 1); if (ok) sfx.gira(); break;
      case 'rotarI': ok = T.rotar(s, -1); if (ok) sfx.gira(); break;
      case 'bajar': ok = T.bajar(s, true); if (ok) { acc = 0; resetLock(); } break;
      case 'caer': { sfx.cae(); const r = T.caidaDura(s, { diferir: true }); if (r) { despuesDeBloquear(r); wrap.classList.remove('golpe'); void wrap.offsetWidth; wrap.classList.add('golpe'); } return; }
      case 'guardar': ok = T.guardar(s); if (ok) { sfx.guarda(); resetLock(); acc = 0; if (s.fin) terminaPartida(); } break;
    }
    if (ok && suelo && (a === 'izq' || a === 'der' || a === 'rotar' || a === 'rotarI') && resets < MAX_RESETS) { lockT = 0; resets++; }
    if (ok) refresca();
  }
  // Repetición al mantener pulsado (teclas y botones táctiles)
  function paraRep(src) { const r = reps.get(src); if (!r) return; clearTimeout(r.t1); clearInterval(r.t2); reps.delete(src); }
  function arranca(src, a) {
    paraRep(src);
    if (a === 'izq' || a === 'der') for (const [k, r] of reps) if (r.a === 'izq' || r.a === 'der') paraRep(k);
    accion(a);
    if (a !== 'izq' && a !== 'der' && a !== 'bajar') return;
    const r = { a }; reps.set(src, r); r.t1 = setTimeout(() => { r.t2 = setInterval(() => accion(a), a === 'bajar' ? 45 : 48); }, a === 'bajar' ? 140 : 160);
  }
  function soltarTodo() { for (const k of [...reps.keys()]) paraRep(k); }

  // teclado: solo con la vista activa y sin escribir en un campo; se quita en destroy()
  const vistaActiva = () => root.isConnected && /^#\/descanso\/tetris/.test(location.hash);
  const escribiendo = t => !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
  const TECLA = { ArrowLeft: 'izq', ArrowRight: 'der', ArrowDown: 'bajar', ArrowUp: 'rotar', x: 'rotar', X: 'rotar', z: 'rotarI', Z: 'rotarI', ' ': 'caer', c: 'guardar', C: 'guardar', Shift: 'guardar' };
  const tomadas = new Set();
  const onKey = e => {
    if (e.ctrlKey || e.metaKey || e.altKey || !vistaActiva() || escribiendo(e.target)) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (fase === 'jugando' || fase === 'pausa') { e.preventDefault(); if (!e.repeat) pausa(); } return; }
    if (e.key === 'Enter' || e.key === ' ') {
      if ((fase === 'listo' || fase === 'fin') && !/^(BUTTON|A)$/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); if (!e.repeat) nueva(); return; }
      if (fase === 'pausa' && e.key === 'Enter' && !/^(BUTTON|A)$/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); pausa(); return; }
    }
    const a = TECLA[e.key]; if (!a || fase !== 'jugando') return;
    e.preventDefault(); tomadas.add(e.key); if (e.repeat) return; arranca('k:' + e.key, a);
  };
  const onKeyUp = e => { paraRep('k:' + e.key); if (tomadas.delete(e.key)) e.preventDefault(); };
  addEventListener('keydown', onKey); addEventListener('keyup', onKeyUp); addEventListener('blur', soltarTodo);
  const onVis = () => { if (document.hidden && fase === 'jugando') pausa(); };
  document.addEventListener('visibilitychange', onVis);

  // botones táctiles: actúan al tocar (sin esperar al «click») y repiten si se mantienen
  root.querySelectorAll('[data-act]').forEach(b => {
    const a = b.dataset.act;
    b.addEventListener('pointerdown', e => { if (e.button) return; e.preventDefault(); arranca('p:' + e.pointerId, a); b.classList.add('on'); });
    const fin = e => { paraRep('p:' + e.pointerId); b.classList.remove('on'); };
    b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin); b.addEventListener('pointerleave', fin);
    b.addEventListener('contextmenu', e => e.preventDefault());
    b.addEventListener('click', e => { if (e.detail === 0) accion(a); }); // activación con teclado de accesibilidad (sin puntero)
  });

  // gestos en el tablero: deslizar mueve, tocar gira, deslizar rápido abajo = caída dura, deslizar arriba = guardar
  let gs = null;
  cv.addEventListener('pointerdown', e => {
    if (fase !== 'jugando') return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
    gs = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), rx: e.clientX, ry: e.clientY, mov: false, lat: false };
  });
  cv.addEventListener('pointermove', e => {
    if (!gs || e.pointerId !== gs.id) return; const st = cell || 24;
    if (Math.abs(e.clientX - gs.x0) > 9 || Math.abs(e.clientY - gs.y0) > 9) gs.mov = true;
    while (e.clientX - gs.rx >= st) { gs.rx += st; gs.lat = true; accion('der'); }
    while (gs.rx - e.clientX >= st) { gs.rx -= st; gs.lat = true; accion('izq'); }
    while (e.clientY - gs.ry >= st * 0.9) { gs.ry += st * 0.9; accion('bajar'); }
    if (e.clientY < gs.ry) gs.ry = e.clientY; // al subir, el siguiente escalón se cuenta desde ahí
  });
  const fin = e => {
    if (!gs || e.pointerId !== gs.id) return; const q = gs; gs = null; if (e.type === 'pointercancel') return;
    const dx = e.clientX - q.x0, dy = e.clientY - q.y0, dt = Math.max(1, performance.now() - q.t0), st = cell || 24;
    if (!q.mov && dt < 450) return accion('rotar');
    if (dy > st * 3 && dt < 320 && Math.abs(dx) < dy * 0.55 && !q.lat) return accion('caer');
    if (dy < -st * 3 && dt < 450 && Math.abs(dx) < -dy * 0.55) return accion('guardar');
  };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  cv.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- pantallas superpuestas (empezar / pausa / fin) ----------
  function muestraOv() {
    ov.replaceChildren(); ov.className = 'cap-ov';
    if (fase === 'jugando') return;
    ov.classList.add('on', 'f-' + fase);
    if (fase === 'listo') ov.append(h('div.cap-ov-t', '🎁 Capas'), h('p', 'Apila las capas de filamento sobre la cama de impresión. Cada línea completa se funde.'), btn('Empezar', () => nueva(), { cls: 'primary', title: 'Empezar a jugar' }), ...(mejor ? [h('p.cap-ov-s', 'Tu récord: ' + mejor)] : []));
    else if (fase === 'pausa') ov.append(h('div.cap-ov-t', '⏸ En pausa'), btn('Reanudar', () => pausa(), { cls: 'primary' }), btn('Nueva partida', () => nueva()));
    else ov.append(h('div.cap-ov-t', 'Fin de la impresión'), h('p.cap-ov-n', String(s.puntos)), h('p.cap-ov-s', s.lineas + ' capas · nivel ' + s.nivel), nuevoRecord && s.puntos > 0 ? h('p.cap-ov-r', '🏆 ¡Nuevo récord!') : h('p.cap-ov-s', 'Récord: ' + mejor), btn('Otra partida', () => nueva(), { cls: 'primary' }));
  }

  // ---------- dibujo ----------
  function fondo() {
    const gr = g.createLinearGradient(0, 0, 0, cssH); gr.addColorStop(0, '#171b26'); gr.addColorStop(1, '#0c0f16'); g.fillStyle = gr; g.fillRect(0, 0, cssW, cssH);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; g.beginPath();
    for (let x = 1; x < T.COLS; x++) { g.moveTo(Math.round(x * cell) + 0.5, 0); g.lineTo(Math.round(x * cell) + 0.5, cssH); }
    for (let y = 1; y < T.FILAS; y++) { g.moveTo(0, Math.round(y * cell) + 0.5); g.lineTo(cssW, Math.round(y * cell) + 0.5); }
    g.stroke();
    // cama de impresión: una barra caliente en la base
    const bd = g.createLinearGradient(0, cssH - cell * 0.28, 0, cssH); bd.addColorStop(0, 'rgba(34,211,238,0)'); bd.addColorStop(1, 'rgba(34,211,238,.38)'); g.fillStyle = bd; g.fillRect(0, cssH - cell * 0.28, cssW, cell * 0.28);
    g.fillStyle = 'rgba(180,230,255,.55)'; g.fillRect(0, cssH - Math.max(2, cell * 0.07), cssW, Math.max(2, cell * 0.07));
  }
  function pinta(now) {
    if (!cell) { ajusta(); if (!cell) return; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cssW, cssH); fondo();
    const p = anim ? Math.min(1, (now - anim.t0) / ANIM_MS) : 0, quita = anim ? new Set(anim.filas) : null;
    for (let y = 0; y < T.FILAS; y++) for (let x = 0; x < T.COLS; x++) {
      const v = s.tablero[y][x]; if (!v || (quita && quita.has(y))) continue; bloque(g, x * cell, y * cell, cell, colDe(v));
    }
    if (anim) { // la capa se funde: se pone al rojo blanco, se aplasta y se evapora
      for (const y of anim.filas) {
        const q = p < 0.4 ? 0 : (p - 0.4) / 0.6, calor = Math.min(1, p / 0.35), sc = 1 - q;
        g.save(); g.translate(0, (y + 0.5) * cell); g.scale(1, Math.max(0.02, sc)); g.translate(0, -(y + 0.5) * cell); g.globalAlpha = 1 - q * 0.5;
        g.shadowColor = '#ffb347'; g.shadowBlur = cell * 0.9 * (1 - q);
        for (let x = 0; x < T.COLS; x++) bloque(g, x * cell, y * cell, cell, mezcla(colDe(s.tablero[y][x]), '#fff1b8', calor * 0.92));
        g.restore();
        if (p < 0.55) { const bx = (p / 0.55) * (cssW + cell * 4) - cell * 2, sw = g.createLinearGradient(bx - cell * 2, 0, bx + cell * 2, 0); sw.addColorStop(0, 'rgba(255,255,255,0)'); sw.addColorStop(0.5, 'rgba(255,255,255,.75)'); sw.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sw; g.fillRect(0, y * cell, cssW, cell); }
      }
      const dt = Math.min(0.05, (now - (anim.ult || anim.t0)) / 1000); anim.ult = now;
      for (const c of chispas) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 14 * dt; c.v -= dt; if (c.v > 0) { g.globalAlpha = Math.min(1, c.v * 2); g.fillStyle = c.col; g.fillRect(c.x * cell, c.y * cell, Math.max(2, cell * 0.12), Math.max(2, cell * 0.12)); } }
      g.globalAlpha = 1;
    }
    const pz = s.pieza;
    if (pz && !anim && fase !== 'listo') {
      const gy = T.fantasmaY(s);
      if (gy > pz.y) for (const [dx, dy] of T.celdas(pz.t, pz.r)) fantasma(g, (pz.x + dx) * cell, (gy + dy) * cell, cell, COLOR[pz.t]);
      // boquilla del extrusor sobre la pieza que cae
      const xs = T.celdas(pz.t, pz.r).map(v => pz.x + v[0]), nx = (Math.min(...xs) + Math.max(...xs) + 1) / 2 * cell;
      g.fillStyle = 'rgba(200,210,230,.5)'; g.beginPath(); g.moveTo(nx - cell * 0.28, 0); g.lineTo(nx + cell * 0.28, 0); g.lineTo(nx, cell * 0.3); g.closePath(); g.fill();
      for (const [dx, dy] of T.celdas(pz.t, pz.r)) { const yy = pz.y + dy; if (yy >= 0) bloque(g, (pz.x + dx) * cell, yy * cell, cell, COLOR[pz.t]); }
    }
    if (fase === 'pausa' || fase === 'listo') { g.fillStyle = 'rgba(8,10,16,.55)'; g.fillRect(0, 0, cssW, cssH); }
  }
  function bucle(now) {
    raf = requestAnimationFrame(bucle); const dt = Math.min(100, now - (last || now)); last = now;
    if (fase === 'jugando') {
      if (anim) { if (now - anim.t0 >= ANIM_MS) terminaAnim(); }
      else if (s.pieza && !s.fin) {
        acc += dt; const iv = T.velocidad(s.nivel);
        while (acc >= iv && s.pieza && !anim) { acc -= iv; if (!T.enSuelo(s)) { T.bajar(s, false); lockT = 0; resets = 0; } else { acc = 0; break; } }
        if (s.pieza && T.enSuelo(s)) { lockT += dt; if (lockT >= LOCK_MS) { const r = T.bloquear(s, { diferir: true }); despuesDeBloquear(r); } } else lockT = 0;
      }
    }
    pinta(now);
  }
  ajusta(); refresca(); muestraOv(); raf = requestAnimationFrame(bucle);

  // ---------- gancho para las pruebas ----------
  const cadena = () => s.tablero.map(f => f.map(v => v || '.').join(''));
  window.__tetris = {
    estado: () => ({
      fase, anim: !!anim, tablero: cadena(), pieza: s.pieza ? { ...s.pieza } : null, fantasmaY: s.pieza ? T.fantasmaY(s) : null, hold: s.hold, holdUsado: s.holdUsado, cola: s.cola.slice(),
      puntos: s.puntos, lineas: s.lineas, nivel: s.nivel, combo: s.combo, fin: s.fin, mejor, nuevoRecord, sonido, lockT, canvas: { w: cv.width, h: cv.height }
    }),
    // parcial: { tablero: ['X.X…', …] (filas de abajo si son menos de 20; ' ' o '.' = vacío), pieza:{t,r,x,y}, hold, cola, puntos, lineas, nivel, combo }
    set(p = {}) {
      if (p.tablero) {
        const f = p.tablero.map(r => (Array.isArray(r) ? r : String(r).split('')).map(v => (v === '.' || v === ' ' || v === 0 || !v) ? 0 : (typeof v === 'string' ? v : 'X')));
        const t = T.tableroVacio(); f.forEach((r, i) => { const y = T.FILAS - f.length + i; for (let x = 0; x < T.COLS; x++) t[y][x] = r[x] || 0; }); s.tablero = t;
      }
      if (p.pieza) { s.pieza = Object.assign({ r: 0, x: 3, y: 0 }, s.pieza || {}, p.pieza); s.fin = false; acc = 0; resetLock(); }
      for (const k of ['hold', 'holdUsado', 'puntos', 'lineas', 'combo']) if (k in p) s[k] = p[k];
      if (p.cola) s.cola = p.cola.slice();
      if (p.lineas != null) s.nivel = T.nivelDe(s.lineas, s.nivelInicial);
      if (p.nivel != null) { s.nivel = p.nivel; s.nivelInicial = 1; s.lineas = (p.nivel - 1) * T.LINEAS_POR_NIVEL; }
      if (p.mejor != null) { mejor = p.mejor; }
      sufijoCola = ''; refresca(); pinta(performance.now());
    },
    // un «tic» de gravedad inmediato: baja una fila o, si está en el suelo, bloquea (sin esperar a la animación)
    paso() { if (fase !== 'jugando') return null; if (anim) terminaAnim(); const r = T.paso(s, { diferir: false }); if (r) despuesDeBloquear(r); else refresca(); return r; },
    nueva, pausa: () => pausa(), accion
  };

  return {
    destroy() {
      cancelAnimationFrame(raf); if (ro) ro.disconnect(); soltarTodo();
      removeEventListener('keydown', onKey); removeEventListener('keyup', onKeyUp); removeEventListener('blur', soltarTodo); removeEventListener('resize', ajusta);
      document.removeEventListener('visibilitychange', onVis);
      timers.forEach(t => clearTimeout(t)); timers.clear();
      if (audio) { try { audio.close(); } catch (e) { } audio = null; }
      actualizaRecord(); delete window.__tetris;
    }
  };
}
