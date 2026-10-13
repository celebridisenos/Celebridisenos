// ================= 13-10-2026 · LA CARA «CelebriDiseños» (sin número) =================
// La dueña: «una nueva interfaz CelebriDiseños, sin 40, sorpresa, premium, que cuando la abra no la reconozca».
// Por dentro es la 18 (las mismas pantallas, botones y datos); lo que cambia es la forma de moverse y el aspecto (css/ui50.css):
//  · la BARRA LATERAL fija (lo de todos los días, con sus avisos) en lugar del menú escondido;
//  · el LANZADOR: todas las secciones en una pantalla, por grupos, con buscador (Ctrl+espacio o el botón «Todo»);
//  · el ESTRENO: miles de puntos de luz forman el anillo de la marca, escriben «CelebriDiseños» y la pantalla se abre. Sin números.
// Se vuelve a las caras de antes en Configuración → Mi perfil → Interfaz.
import { h, icon, btn } from './ui.js';
import { reducido } from './ui14.js';

const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };

// ---------- la barra lateral ----------
// [ruta, nombre corto, icono]. Solo salen las que el menú de esa persona deja ver (permisos y «Ordenar el menú»).
export const RAIL = [['puente', 'Inicio', 'home'], ['pedidos', 'Pedidos', 'truck'], ['productos', 'Productos', 'cube'], ['celebrir8', 'Diseñar', 'sparkles'],
  ['taller', 'Imprimir', 'printer'], ['embalaje', 'Empaquetar', 'box'], ['escanear', 'Escanear', 'qr'], ['clientes', 'Clientes', 'users'],
  ['tienda', 'Tienda', 'store'], ['inteligencia', 'Números', 'chart'], ['reels', 'Reels', 'play']];

export function pintaRail(el, o) {
  const items = RAIL.filter(([k]) => o.visibles.has(k));
  const firma = JSON.stringify([items.map(x => x[0]), o.counts]);
  if (el.dataset.firma === firma) return; el.dataset.firma = firma;
  el.replaceChildren(
    h('a.r50-marca', { href: '#/puente', title: 'CelebriDiseños' }, h('img', { src: o.logo || 'icons/icon-192.png', alt: '' })),
    h('nav.r50-lista', { 'aria-label': 'Lo de todos los días' }, items.map(([k, t, i]) => h('a.r50-it', { href: '#/' + k, dataset: { k }, title: t }, h('span.r50-ic', icon(i)), h('span.r50-t', t),
      o.counts[k] ? h('span.r50-n', o.counts[k] > 99 ? '99+' : String(o.counts[k])) : null))),
    h('div.r50-pie',
      h('button.r50-it.r50-todo', { type: 'button', title: 'Todas las secciones (Ctrl + espacio)', onclick: () => o.abrirTodo() }, h('span.r50-ic', icon('menu')), h('span.r50-t', 'Todo')),
      o.visibles.has('config') ? h('a.r50-it', { href: '#/config', dataset: { k: 'config' }, title: 'Configuración' }, h('span.r50-ic', icon('settings')), h('span.r50-t', 'Ajustes')) : null));
}
export function marcaRail(el, k) { if (el) el.querySelectorAll('[data-k]').forEach(a => a.classList.toggle('on', a.dataset.k === k)); }

// ---------- el lanzador: todas las secciones de un vistazo ----------
// grupos: [{ t: 'Pedidos', items: [{ k, t, i, n }] }] · ir(ruta)
const quitaEmoji = t => String(t).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();
const sinTildes = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// palabras con las que se busca cada sección además de su nombre (lo que ella diría: «etiquetas», «envío», «dinero»…)
const PALABRAS = { embalaje: 'etiquetas envio enviar paquete caja empaquetar correos seur inpost vinted go', escanear: 'etiquetas qr codigo barras paquete lector', taller: 'imprimir impresora bambu etiquetas papel cola laminar',
  celebrir8: 'disenar diseno 3d stl estudio modelo pieza engranaje lab foto', cotizador: 'precio stl gramos cuanto cuesta', costes: 'filamento material precio gramos', ingresos: 'dinero ganancias cobros euros',
  facturas: 'factura fiscal hacienda', presupuestos: 'presupuesto oferta', informes: 'numeros estadisticas graficas', inteligencia: 'metas numeros ventas paises planeta', clientes: 'compradores personas contactos',
  pedidosweb: 'tienda web encargos', bandeja: 'correos vinted wallapop mensajes', tienda: 'web publicar cloudflare suerte', mitienda: 'web enlace compartir qr', reels: 'video tiktok instagram',
  instagram: 'fotos redes publicar', redes: 'calendario publicaciones', estudio: 'fotos editar biouvision', anuncios: 'publicidad ia textos', rapidas: 'respuestas mensajes whatsapp clientes',
  chat: 'mensajes equipo', tareas: 'pendientes hacer', archivos: 'documentos stl carpetas', config: 'ajustes empresa perfil interfaz tema colores', stock: 'existencias inventario', inventario: 'compras stock filamento',
  puente: 'inicio portada resumen', hoy: 'urgente hoy taller', tallervivo: 'taller animado', trailer: 'video mes resumen' };
export function lanzador({ grupos, ir, buscarEnTodo }) {
  const ya = document.querySelector('.l50'); if (ya) { ya._cerrar(); return null; }
  const busca = h('input.l50-busca', { type: 'search', placeholder: '¿A dónde vamos? Escribe: pedidos, etiquetas, reels…', 'aria-label': 'Buscar una sección', autocomplete: 'off' });
  const cuerpo = h('div.l50-cuerpo');
  const cerrar = () => { raiz.classList.add('sale'); removeEventListener('keydown', tecla, true); setTimeout(() => raiz.remove(), reducido() ? 0 : 160); };
  const vete = k => { cerrar(); ir(k); };
  const pinta = () => {
    const q = sinTildes(busca.value.trim());
    const gs = grupos.map(g => ({ t: g.t, items: g.items.filter(x => !q || sinTildes(x.t + ' ' + g.t + ' ' + x.k + ' ' + (PALABRAS[x.k] || '')).includes(q)) })).filter(g => g.items.length);
    let n = 0;
    cuerpo.replaceChildren(...[...(gs.length ? gs.map(g => h('section.l50-grupo', h('h3', g.t || 'Más'), h('div.l50-rejilla', g.items.map(x => h('button.l50-tile', { type: 'button', dataset: { k: x.k }, style: '--i:' + Math.min(n++, 24), onclick: () => vete(x.k) },
      h('span.l50-ic', icon(x.i)), h('span.l50-nom', quitaEmoji(x.t)), x.n ? h('span.l50-n', String(x.n)) : null)))))
      : [h('p.l50-nada', 'No hay ninguna sección que se llame así.')]),
      q && buscarEnTodo ? h('button.l50-todo', { type: 'button', onclick: () => { const v = busca.value.trim(); cerrar(); buscarEnTodo(v); } }, icon('search', 's'), 'Buscar «' + busca.value.trim() + '» en pedidos, clientes, productos y acciones') : null].filter(Boolean)); /* (replaceChildren(null) escribiría «null») */
  };
  const tecla = e => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    else if (e.key === 'Enter' && document.activeElement === busca) { const p = cuerpo.querySelector('.l50-tile'); if (p) { e.preventDefault(); vete(p.dataset.k); } }
  };
  busca.addEventListener('input', pinta);
  const raiz = h('div.l50', { role: 'dialog', 'aria-label': 'Todas las secciones', onclick: e => { if (e.target === raiz) cerrar(); } },
    h('div.l50-caja', h('div.l50-cab', h('div.l50-titulo', h('small', 'CelebriDiseños'), h('b', 'Todas las secciones')), busca,
      h('button.l50-x', { type: 'button', title: 'Cerrar (Esc)', 'aria-label': 'Cerrar', onclick: () => cerrar() }, icon('x'))), cuerpo));
  raiz._cerrar = cerrar;
  pinta(); document.body.appendChild(raiz); addEventListener('keydown', tecla, true);
  busca.focus(); setTimeout(() => busca.focus(), 30);
  return raiz;
}

// ---------- el estreno ----------
const VISTO = 'cd.estreno50';
export const debeEstrenar50 = () => !leer(VISTO) && !navigator.webdriver;

function sonido() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    const ac = new A(), m = ac.createGain(); m.gain.value = 0.42; m.connect(ac.destination);
    const t0 = ac.currentTime + 0.05;
    // un colchón que respira mientras se forma el anillo (dos osciladores casi iguales que «laten»)
    [110, 110.6, 164.8].forEach((fr, i) => { const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = fr;
      f.type = 'lowpass'; f.frequency.setValueAtTime(220, t0); f.frequency.exponentialRampToValueAtTime(2400, t0 + 3.6); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 2.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.4);
      o.connect(f); f.connect(g); g.connect(m); o.start(t0); o.stop(t0 + 4.5); });
    const campana = (t, fr, v) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = fr; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); o.connect(g); g.connect(m); o.start(t); o.stop(t + 1.7); };
    return {
      letra(i) { campana(ac.currentTime + 0.01, [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5][i % 7], 0.035); },
      abre() { const t = ac.currentTime + 0.02; const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'sine'; b.frequency.setValueAtTime(92, t); b.frequency.exponentialRampToValueAtTime(38, t + 0.9);
        bg.gain.setValueAtTime(0.85, t); bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.3); b.connect(bg); bg.connect(m); b.start(t); b.stop(t + 1.4);
        [261.63, 329.63, 392, 493.88, 587.33, 783.99].forEach((fr, i) => campana(t + i * 0.05, fr, 0.08)); },
      cerrar() { setTimeout(() => { try { ac.close(); } catch (e) { } }, 3000); }
    };
  } catch (e) { return null; }
}

// los puntos de un dibujo hecho en un lienzo escondido (lo que no es transparente)
function muestra(W, H, dibuja, densidad) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = W; c.height = H; dibuja(g);
  const px = g.getImageData(0, 0, W, H).data, paso = Math.max(3, Math.round(Math.sqrt(W * H / densidad))), out = [];
  for (let y = 0; y < H; y += paso) for (let x = 0; x < W; x += paso) if (px[(y * W + x) * 4 + 3] > 128) out.push([x, y]);
  return { out, paso };
}
const FUENTE = '"Segoe UI Variable Display", "Segoe UI", Bahnschrift, system-ui, sans-serif';
// el anillo con la «C» de la marca
const anillo = (W, H) => muestra(W, H, g => { const r = Math.min(W, H) * 0.2, cx = W / 2, cy = H * 0.46; g.strokeStyle = '#fff'; g.lineWidth = r * 0.12; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + (r * 1.25) + 'px ' + FUENTE; g.fillText('C', cx, cy + r * 0.04); }, 12000);
// la palabra
const palabra = (W, H) => { let tam = 0; const r = muestra(W, H, g => { tam = Math.min(W * 0.115, H * 0.2); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + tam + 'px ' + FUENTE; g.fillText('CelebriDiseños', W / 2, H * 0.46); }, 30000); r.tam = tam; return r; };
// el color de cada punto: violeta → turquesa → rosa según su sitio
const AUR = [[167, 139, 250], [45, 212, 191], [244, 114, 182]];
function color(t) { const [p, q, u] = t < 0.5 ? [AUR[0], AUR[1], t * 2] : [AUR[1], AUR[2], (t - 0.5) * 2]; return 'rgb(' + p.map((v, i) => Math.round(v + (q[i] - v) * u)).join(',') + ')'; }

// opts: { ir(ruta), activar() (pone la cara nueva detrás), novedades: [[emoji, título, texto, ruta]], rapido }
export function estreno50(opts = {}) {
  if (document.querySelector('.e50')) return null;
  const ir = opts.ir || (r => { location.hash = '#/' + r; });
  const rapido = !!opts.rapido || reducido();
  const cv = h('canvas.e50-cv'), g = cv.getContext('2d');
  let estado = 'espera', raf = 0, snd = null;
  const cerrar = ruta => {
    if (estado === 'cerrado') return; estado = 'cerrado';
    cancelAnimationFrame(raf); guardar(VISTO, '1'); if (opts.activar) opts.activar();
    raiz.classList.add('fuera'); setTimeout(() => raiz.remove(), 450); if (snd) snd.cerrar();
    if (ruta) ir(ruta); if (opts.alCerrar) opts.alCerrar();
  };
  const NOV = opts.novedades || [];
  const final = h('div.e50-final', h('div.e50-tarjeta',
    h('small.e50-kick', 'Bienvenida a tu nuevo'), h('h2', h('span', 'CelebriDiseños')),
    h('p', 'Tus pedidos, clientes y productos siguen exactamente donde estaban. Ha cambiado todo lo demás.'),
    h('div.e50-nov', NOV.map(([e, t, d, r]) => h('button', { type: 'button', onclick: () => cerrar(r) }, h('span', e), h('b', t), h('small', d)))),
    h('div.e50-acc', btn('Empezar', () => cerrar('puente'), { cls: 'primary' })),
    h('p.e50-pie', '¿Echas de menos la de antes? Configuración → Mi perfil → Interfaz.')));
  const inicio = h('div.e50-inicio',
    h('button.e50-play', { type: 'button', onclick: () => empezar(), 'aria-label': 'Encender' }, h('span.e50-aro'), h('span.e50-pl', '▶')),
    h('p', 'Toca para encender'),
    h('button.e50-saltar', { type: 'button', onclick: () => cerrar('puente') }, 'Saltar'));
  const cortina = h('div.e50-cortina', h('i'), h('i'));
  const raiz = h('div.e50', { role: 'dialog', 'aria-label': 'Estreno de CelebriDiseños' }, cortina, cv, inicio, final);
  document.body.appendChild(raiz);

  let W = 0, H = 0, parts = [], t0 = 0, paso = 4, B = null, letras = 0, kA = 1;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const tam = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  // tiempos (ms): se forma el anillo · quieto · el anillo se deshace en la palabra · quieta · se abre
  const T1 = 2300, T2 = 500, T3 = 1700, T4 = 900;
  function empezar() {
    if (estado !== 'espera') return; estado = 'anillo';
    tam(); raiz.classList.add('en-marcha');
    const A = anillo(W, H); B = palabra(W, H); paso = Math.min(A.paso, B.paso);
    // tantos puntos como pida el más grande de los dos dibujos; cada uno tiene un sitio en el anillo y otro en la palabra
    const n = Math.max(A.out.length, B.out.length); kA = Math.max(0.3, A.out.length / n); /* (en el anillo caen varios puntos en el mismo sitio: se apagan un poco para que no se quemen en blanco) */
    const tomaA = i => A.out[i % A.out.length], tomaB = i => B.out[(i * 7919) % B.out.length];
    parts = Array.from({ length: n }, (_, i) => { const a = Math.random() * Math.PI * 2, d = Math.max(W, H) * (0.6 + Math.random() * 0.5), [ax, ay] = tomaA(i), [bx, by] = tomaB(i);
      return { x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d, ax, ay, bx, by, vx: 0, vy: 0, r: Math.random(), c: color(bx / W) }; });
    snd = sonido(); t0 = performance.now();
    if (rapido) t0 -= T1 + T2 + T3 + T4;
    raf = requestAnimationFrame(cuadro);
  }
  function cuadro(now) {
    if (estado === 'cerrado' || !cv.isConnected) return;
    const t = now - t0; g.clearRect(0, 0, W, H);
    if (estado === 'anillo' && t > T1 + T2) estado = 'palabra';
    if (estado === 'palabra') { // las letras «se encienden» de izquierda a derecha (una campanita por letra)
      const k = Math.min(1, (t - T1 - T2) / T3), l = Math.floor(k * 14); while (letras < l) { if (snd) snd.letra(letras); letras++; }
    }
    if (estado === 'palabra' && t > T1 + T2 + T3 + T4) {
      estado = 'abre'; if (snd) snd.abre(); if (opts.activar) opts.activar(); guardar(VISTO, '1');
      raiz.classList.add('abre'); ir('puente');
      parts.forEach(q => { const dx = q.x - W / 2, dy = q.y - H * 0.46, d = Math.hypot(dx, dy) || 1, v = 7 + Math.random() * 16; q.vx = dx / d * v; q.vy = dy / d * v * 0.6 - Math.random() * 4; });
    }
    const te = t - T1 - T2 - T3 - T4;
    if (estado === 'abre' && te > 1100) { estado = 'final'; raiz.classList.add('fin'); g.clearRect(0, 0, W, H); return; }
    g.globalCompositeOperation = 'lighter';
    const barrido = estado === 'palabra' ? Math.min(1, (t - T1 - T2) / T3) * W * 1.15 : 0;
    for (let i = 0; i < parts.length; i++) {
      const q = parts[i];
      let tx = q.ax, ty = q.ay, fuerza = 0.012 + Math.min(1, t / T1) ** 2 * 0.1;
      if (estado === 'palabra') { if (q.bx < barrido) { tx = q.bx; ty = q.by; fuerza = 0.09; } else fuerza = 0.05; }
      if (estado === 'abre') { q.vx *= 0.97; q.vy = q.vy * 0.97 + 0.18; }
      else { q.vx = (q.vx + (tx - q.x) * fuerza) * 0.8; q.vy = (q.vy + (ty - q.y) * fuerza) * 0.8; if (estado === 'anillo' && t > T1) { const a = Math.atan2(q.y - H * 0.46, q.x - W / 2); q.vx += -Math.sin(a) * 0.4; q.vy += Math.cos(a) * 0.4; } }
      q.x += q.vx; q.y += q.vy;
      const a = estado === 'abre' ? Math.max(0, 1 - te / 1100) : Math.min(1, t / 600) * (0.6 + 0.4 * Math.sin(now / 170 + q.r * 30));
      g.globalAlpha = estado === 'anillo' ? a * kA : a; g.fillStyle = q.c; const s = paso * (estado === 'abre' ? 0.7 + q.r : 0.78);
      g.fillRect(q.x - s / 2, q.y - s / 2, s, s);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(cuadro);
  }
  addEventListener('resize', () => { if (estado === 'espera') tam(); });
  tam();
  window.__estreno50 = { empezar, cerrar, estado: () => estado, raiz };
  return raiz;
}
