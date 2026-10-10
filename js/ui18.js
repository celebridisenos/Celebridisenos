// ================= v18 · «SALA DE MANDO»: la interfaz nueva, sus dos modos y el ESTRENO =================
// · Solo aspecto (css/ui18.css bajo html.ui18). Tres interfaces: 'v18' (la nueva), 'nueva' (la 14.0) y 'clasica'. Se guarda en
//   este aparato (clave cd.ui), igual que antes. La V18 tiene dos modos: NOCHE y DÍA (clave cd.modo18).
// · En la V18 el tema del perfil (claro, rosa, oscuro…) no se toca ni se pierde: mientras está puesta manda el modo, y al
//   volver a la interfaz de antes vuelve el tema que tenías.
// · La primera vez que se abre la 18 sale el ESTRENO: se apaga la sala, miles de puntos de luz forman un «18», estalla y
//   detrás aparece el programa nuevo. Se puede saltar. No sale en las pruebas automáticas.
import { h, btn } from './ui.js';
import { aplicarUI, reducido } from './ui14.js';

const CLAVE = 'cd.ui', MODO = 'cd.modo18', VISTO = 'cd.estreno18';
const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
const de = document.documentElement;

export const interfaz = () => { const v = leer(CLAVE); return v === 'v18' || v === 'v30' || v === 'clasica' ? v : 'nueva'; }; // v30: «Atelier 30» (la 18 por dentro, cara nueva)
export const es18 = () => interfaz() === 'v18' || interfaz() === 'v30';
export const es30 = () => interfaz() === 'v30';
export const modo = () => (leer(MODO) === 'dia' ? 'dia' : 'noche');
// El tema que de verdad se pinta: en la V18 manda el modo; fuera de ella, el del perfil
export function tema18(real) {
  const on = es18();
  de.classList.toggle('ui18', on); de.classList.toggle('ui30', es30());
  if (on) { de.classList.remove('ui14'); de.dataset.modo = modo(); return modo() === 'noche' ? 'oscuro' : 'claro'; }
  de.removeAttribute('data-modo');
  return real;
}
const avisa = () => { try { window.dispatchEvent(new Event('cd:interfaz')); } catch (e) { } };
export function ponInterfaz(k, m) {
  guardar(CLAVE, k === 'v18' || k === 'v30' ? k : k === 'clasica' ? 'clasica' : 'nueva');
  if (m) guardar(MODO, m === 'dia' ? 'dia' : 'noche');
  aplicarUI(undefined, false); tema18(); avisa(); // app.js vuelve a aplicar el tema (y la paleta) al oír el aviso
  return interfaz();
}
export function cambiaModo() { const m = modo() === 'noche' ? 'dia' : 'noche'; guardar(MODO, m); tema18(); avisa(); return m; }
export const botonModo = () => h('button.u18-modo', { type: 'button', title: 'Cambiar entre Noche y Día', 'aria-label': 'Cambiar entre Noche y Día', onclick: e => { const m = cambiaModo(); e.currentTarget.textContent = m === 'noche' ? '🌙' : '☀️'; } }, modo() === 'noche' ? '🌙' : '☀️');

// ---------- el sonido del estreno (hecho aquí, sin archivos) ----------
function sonido() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    const ac = new A(), t0 = ac.currentTime + 0.05, m = ac.createGain(); m.gain.value = 0.5; m.connect(ac.destination);
    // la subida: un soplo que se abre durante 2,6 s
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(55, t0); o.frequency.exponentialRampToValueAtTime(220, t0 + 2.6);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(180, t0); f.frequency.exponentialRampToValueAtTime(5200, t0 + 2.6);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 2.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.75);
    o.connect(f); f.connect(g); g.connect(m); o.start(t0); o.stop(t0 + 2.8);
    const golpe = t => {
      const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'sine'; b.frequency.setValueAtTime(110, t); b.frequency.exponentialRampToValueAtTime(34, t + 0.7);
      bg.gain.setValueAtTime(0.9, t); bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); b.connect(bg); bg.connect(m); b.start(t); b.stop(t + 1.2);
      [261.63, 392, 523.25, 659.25, 783.99].forEach((fr, i) => { const c = ac.createOscillator(), cg = ac.createGain(); c.type = i % 2 ? 'triangle' : 'sine'; c.frequency.value = fr; cg.gain.setValueAtTime(0.0001, t); cg.gain.exponentialRampToValueAtTime(0.11, t + 0.03 + i * 0.02); cg.gain.exponentialRampToValueAtTime(0.0001, t + 3.2); c.connect(cg); cg.connect(m); c.start(t); c.stop(t + 3.3); });
    };
    return { golpe: () => golpe(ac.currentTime + 0.02), cerrar: () => setTimeout(() => { try { ac.close(); } catch (e) { } }, 4200) };
  } catch (e) { return null; }
}

// ---------- los puntos de luz que forman el «18» ----------
function puntos18(W, H) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = W; c.height = H;
  const alto = Math.min(H * 0.62, W * 0.42);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 ' + alto + 'px Bahnschrift, "Segoe UI", Arial, sans-serif';
  g.fillText('18', W / 2, H * 0.47);
  const px = g.getImageData(0, 0, W, H).data, paso = Math.max(4, Math.round(Math.sqrt(W * H / 5200))), out = [];
  for (let y = 0; y < H; y += paso) for (let x = 0; x < W; x += paso) if (px[(y * W + x) * 4 + 3] > 128) out.push([x, y]);
  return { out, paso };
}
const MEZ = (a, b, t) => a + (b - a) * t;
function colorEn(t) { // violeta → rosa → cian, de izquierda a derecha
  const A = [143, 130, 255], B = [244, 114, 182], C = [34, 211, 238];
  const [p, q, u] = t < 0.5 ? [A, B, t * 2] : [B, C, (t - 0.5) * 2];
  return 'rgb(' + Math.round(MEZ(p[0], q[0], u)) + ',' + Math.round(MEZ(p[1], q[1], u)) + ',' + Math.round(MEZ(p[2], q[2], u)) + ')';
}

export const debeEstrenar = () => !leer(VISTO) && !navigator.webdriver;
// opts: { ir(ruta), alCerrar(), rapido (para las pruebas: sin esperas) }
export function estreno(opts = {}) {
  if (document.querySelector('.est18')) return null;
  const ir = opts.ir || (r => { location.hash = '#/' + r; });
  const rapido = !!opts.rapido || reducido();
  const cv = h('canvas.est18-cv'), g = cv.getContext('2d');
  const titulo = h('div.est18-titulo', h('small', 'CelebriDiseños presenta'), h('b', 'La definitiva'));
  let estado = 'espera', raf = 0, snd = null;
  const cerrar = ruta => {
    if (estado === 'cerrado') return; estado = 'cerrado';
    cancelAnimationFrame(raf); guardar(VISTO, '1'); guardar('cd.inaug14', '1');
    if (!es18()) ponInterfaz('v30', 'noche'); // v30: la cara nueva ya es «Atelier 30»
    raiz.remove(); if (snd) snd.cerrar();
    ir(ruta || 'puente'); if (opts.alCerrar) opts.alCerrar();
  };
  const NOV = [
    ['🛰️', 'Puente de mando', 'Tu taller de un vistazo, en directo', 'puente'], ['🏭', 'Taller vivo', 'Tus pedidos moviéndose por el taller', 'tallervivo'],
    ['🎬', 'Tráiler del mes', 'Tus números convertidos en vídeo', 'trailer'], ['🌗', 'Noche y Día', 'Dos caras nuevas: cámbialas arriba', 'puente'],
    ['⚡', 'Más rápido', 'Guardar ya no hace esperar', 'puente']
  ];
  const final = h('div.est18-final', h('div.est18-tarjeta',
    h('div.est18-sello', 'VERSIÓN 18'), h('h2', 'Bienvenida a tu programa nuevo'),
    h('p', 'Todo lo tuyo sigue en su sitio: pedidos, clientes, productos. Lo que cambia es todo lo demás.'),
    h('div.est18-nov', NOV.map(([e, t, d, r]) => h('button', { type: 'button', onclick: () => cerrar(r) }, h('span', e), h('b', t), h('small', d)))),
    h('div.row.wrap', { style: { gap: '10px', justifyContent: 'center' } }, btn('🚀 Entrar al Puente de mando', () => cerrar('puente'), { cls: 'primary' })),
    h('p.tiny', '¿Prefieres la de antes? Configuración → Mi perfil → Interfaz.')));
  const inicio = h('div.est18-inicio',
    h('div.est18-sello', 'ESTRENO'), h('h1', 'CelebriDiseños ', h('span', '18')), h('p', 'Apaga las luces. Empieza otra cosa.'),
    h('button.est18-play', { type: 'button', onclick: () => empezar() }, '▶  Encender'),
    h('button.est18-saltar', { type: 'button', onclick: () => cerrar() }, 'Saltar'));
  const raiz = h('div.est18', { role: 'dialog', 'aria-label': 'Estreno de la versión 18' }, cv, titulo, inicio, final);
  document.body.appendChild(raiz);

  let W = 0, H = 0, parts = [], t0 = 0, paso = 5;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const tam = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  function empezar() {
    if (estado !== 'espera') return; estado = 'formando';
    tam(); raiz.classList.add('en-marcha');
    const p = puntos18(W, H); paso = p.paso;
    parts = p.out.map(([x, y]) => { const a = Math.random() * Math.PI * 2, d = Math.max(W, H) * (0.55 + Math.random() * 0.5); return { x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d, tx: x, ty: y, vx: 0, vy: 0, r: Math.random(), c: colorEn(x / W) }; });
    snd = sonido(); t0 = performance.now();
    if (rapido) { parts.forEach(q => { q.x = q.tx; q.y = q.ty; }); t0 -= FORMA + QUIETO; }
    raf = requestAnimationFrame(cuadro);
  }
  const FORMA = 2700, QUIETO = 500, ESTALLA = 1300; // milisegundos de cada parte
  function cuadro(now) {
    if (estado === 'cerrado' || !cv.isConnected) return;
    const t = now - t0;
    g.clearRect(0, 0, W, H);
    if (estado === 'formando' && t >= FORMA + QUIETO) {
      estado = 'estallando';
      if (snd) snd.golpe();
      ponInterfaz('v30', 'noche'); guardar(VISTO, '1'); guardar('cd.inaug14', '1'); ir('puente'); // el programa nuevo ya está detrás
      raiz.classList.add('estalla');
      parts.forEach(q => { const dx = q.x - W / 2, dy = q.y - H * 0.47, d = Math.hypot(dx, dy) || 1, v = 9 + Math.random() * 22; q.vx = dx / d * v + (Math.random() - 0.5) * 6; q.vy = dy / d * v + (Math.random() - 0.5) * 6; });
      if (opts.alEstallar) opts.alEstallar();
    }
    const te = t - FORMA - QUIETO;
    if (estado === 'estallando' && te > ESTALLA) { estado = 'final'; raiz.classList.add('fin'); g.clearRect(0, 0, W, H); return; }
    const k = Math.min(1, t / FORMA), fuerza = 0.012 + k * k * 0.11;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < parts.length; i++) {
      const q = parts[i];
      if (estado === 'formando') { q.vx = (q.vx + (q.tx - q.x) * fuerza) * 0.82; q.vy = (q.vy + (q.ty - q.y) * fuerza) * 0.82; if (t > FORMA) { q.vx += Math.sin(now / 90 + q.r * 40) * 0.05; } }
      else { q.vx *= 0.985; q.vy = q.vy * 0.985 + 0.12; }
      q.x += q.vx; q.y += q.vy;
      const a = estado === 'formando' ? Math.min(1, t / 500) * (0.55 + 0.45 * Math.sin(now / 160 + q.r * 30)) : Math.max(0, 1 - te / ESTALLA);
      g.globalAlpha = a; g.fillStyle = q.c; const s = paso * (estado === 'formando' ? 0.62 : 0.62 + q.r * 0.9);
      g.fillRect(q.x - s / 2, q.y - s / 2, s, s);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(cuadro);
  }
  addEventListener('resize', () => { if (estado === 'espera') tam(); });
  tam();
  window.__estreno18 = { empezar, cerrar, estado: () => estado, raiz };
  return raiz;
}
