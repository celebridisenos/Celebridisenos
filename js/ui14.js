// ================= v14.0 · «INAUGURACIÓN»: la interfaz nueva y su estreno =================
// · La interfaz nueva es solo aspecto (css/ui14.css bajo html.ui14): no cambia botones ni datos. Se puede volver a la
//   CLÁSICA en Configuración → Mi perfil → Interfaz (o en el menú de tu cuenta). Se guarda en este aparato.
// · La primera vez que se abre la 14.0 sale la INAUGURACIÓN: ves la app como era (antes), cortas la cinta con las tijeras,
//   fuegos artificiales, y la interfaz nueva se abre en un círculo (después). Luego puedes mantener pulsado para comparar.
import { h, btn } from './ui.js';

const CLAVE = 'cd.ui', VISTA = 'cd.inaug14';
const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
export const uiNueva = () => leer(CLAVE) !== 'clasica' && leer(CLAVE) !== 'v18'; // v18: la «Sala de mando» es otra interfaz (ui18.js)
export function aplicarUI(v, guarda = true) {
  const nueva = v === undefined ? uiNueva() : !!v;
  document.documentElement.classList.toggle('ui14', nueva);
  if (guarda && v !== undefined) guardar(CLAVE, nueva ? 'nueva' : 'clasica');
  return nueva;
}
export const reducido = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// ---------- efectos: brillo que sigue al ratón en las tarjetas, chispas al pulsar y emojis bien pintados en los títulos ----------
const EMO = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/u;
function envolverEmojis(raiz) {
  raiz.querySelectorAll('.page-head h1, .kpi .n').forEach(el => {
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodos = [];
    while (tw.nextNode()) { const n = tw.currentNode; if (EMO.test(n.nodeValue) && !(n.parentElement && n.parentElement.classList.contains('u14-emo'))) nodos.push(n); }
    nodos.forEach(n => {
      const partes = n.nodeValue.split(EMO), f = document.createDocumentFragment();
      partes.forEach((p, i) => { if (!p) return; if (i % 2) { const s = document.createElement('span'); s.className = 'u14-emo'; s.textContent = p; f.appendChild(s); } else f.appendChild(document.createTextNode(p)); });
      n.replaceWith(f);
    });
  });
}
let efectos = false;
export function instalarEfectos() {
  if (efectos) return; efectos = true;
  let pend = 0, ult = null;
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !document.documentElement.classList.contains('ui14')) return;
    ult = e; if (pend) return;
    pend = requestAnimationFrame(() => { pend = 0; const c = ult.target && ult.target.closest && ult.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (ult.clientX - r.left) + 'px'); c.style.setProperty('--my', (ult.clientY - r.top) + 'px'); });
  }, { passive: true });
  document.addEventListener('pointerdown', e => {
    if (!document.documentElement.classList.contains('ui14') || reducido()) return;
    const b = e.target && e.target.closest && e.target.closest('.btn.primary, .chip, .tabbar a, .fab'); if (!b) return;
    const cols = ['#a855f7', '#ec4899', '#f59e0b', '#06b6d4', '#22c55e'];
    for (let i = 0; i < 7; i++) { const s = document.createElement('i'); s.className = 'u14-chispa'; const a = Math.PI * 2 * i / 7 + Math.random() * 0.5, d = 24 + Math.random() * 22;
      s.style.cssText = `left:${e.clientX - 4}px;top:${e.clientY - 4}px;--c:${cols[i % cols.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`; document.body.appendChild(s); setTimeout(() => s.remove(), 650); }
  }, { passive: true });
  let t = 0; const mo = new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; if (document.documentElement.classList.contains('ui14')) envolverEmojis(document); }, 60); });
  mo.observe(document.body, { childList: true, subtree: true });
  envolverEmojis(document);
}
// cambia de pantalla con una entrada suave del contenido
export function entrada(content) {
  if (!content || !/ui1[48]/.test(document.documentElement.className)) return;
  content.classList.remove('entrando'); void content.offsetWidth; content.classList.add('entrando');
  clearTimeout(content.__u14); content.__u14 = setTimeout(() => content.classList.remove('entrando'), 900);
}

// ---------- sonido de fiesta (corto y suave, sin archivos) ----------
function tada() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const ac = new A(), t0 = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + i * 0.09); g.gain.linearRampToValueAtTime(0.12, t0 + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.09 + 0.9); o.connect(g).connect(ac.destination); o.start(t0 + i * 0.09); o.stop(t0 + i * 0.09 + 1); });
    setTimeout(() => ac.close(), 2000);
  } catch (e) { }
}
// ---------- fuegos artificiales + confeti en un lienzo ----------
function fuegos(cv, ms) {
  const g = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), parts = [], fin = performance.now() + ms;
  const tam = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }; tam();
  const cols = ['#fde68a', '#f9a8d4', '#a78bfa', '#67e8f9', '#86efac', '#fca5a5', '#ffffff'];
  const explosion = (x, y) => { const c = cols[Math.floor(Math.random() * cols.length)], n = 70; for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n, v = 2 + Math.random() * 4.5; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, c, r: 2 + Math.random() * 1.6, tipo: 'f' }); } };
  for (let i = 0; i < 160; i++) parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 1.5, vy: 1.5 + Math.random() * 2.5, vida: 1, c: cols[i % cols.length], r: 4 + Math.random() * 4, rot: Math.random() * 6, tipo: 'c' });
  let prox = 0;
  const paso = t => {
    if (!cv.isConnected) return;
    g.clearRect(0, 0, innerWidth, innerHeight);
    if (t < fin && t > prox) { prox = t + 320 + Math.random() * 380; explosion(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.12 + Math.random() * 0.35)); }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.tipo === 'f') { p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.05; p.vida -= 0.012; g.globalAlpha = Math.max(0, p.vida); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); g.globalAlpha = Math.max(0, p.vida) * 0.3; g.beginPath(); g.arc(p.x, p.y, p.r * 3, 0, 7); g.fill(); }
      else { p.vy += 0.02; p.rot += 0.08; g.globalAlpha = 1; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); if (p.y > innerHeight + 20) p.vida = 0; }
      p.x += p.vx; p.y += p.vy; if (p.vida <= 0) parts.splice(i, 1);
    }
    g.globalAlpha = 1;
    if (parts.length || t < fin) requestAnimationFrame(paso); else cv.remove();
  };
  addEventListener('resize', tam);
  requestAnimationFrame(paso);
}

// ---------- la inauguración ----------
const NOVEDADES = [
  ['📸', 'Biouvision: retoque de cara y filtros', 'estudio'],
  ['🏷️', 'Etiqueta de envío: la tuya, leída sola', 'embalaje'], ['💬', 'Respuestas rápidas para clientes', 'rapidas'], ['📰', 'Noticias de actualidad', 'noticias'],
  ['🛍️', 'Mi tienda con su QR', 'mitienda'], ['💡', 'Consejos para vender', 'inicio']
];
export const debeInaugurar = () => !leer(VISTA) && !navigator.webdriver && leer(CLAVE) !== 'v18';
export function inauguracion(opts = {}) {
  if (document.querySelector('.inau')) return;
  const ir = opts.ir || (r => { location.hash = '#/' + r; });
  const eraNueva = uiNueva();
  aplicarUI(false, false); // ANTES: la app como era
  const tij = h('div.inau-tijeras', '✂️'), cv = h('canvas.inau-fuegos');
  const izq = h('div.mitad.izq'), der = h('div.mitad.der');
  const cinta = h('div.inau-cinta', { title: 'Corta la cinta', onclick: e => cortar(e) }, izq, der, h('div.inau-lazo', '🎀'));
  const etiqueta = h('div.inau-etiqueta', 'ANTES');
  let estado = 'antes';
  const comparar = h('button.btn.inau-comparar', { type: 'button' }, '👀 Mantén pulsado para ver el ANTES');
  const verAntes = v => { aplicarUI(!v, false); etiqueta.textContent = v ? 'ANTES' : 'AHORA'; etiqueta.className = 'inau-etiqueta' + (v ? '' : ' ahora'); etiqueta.style.display = ''; };
  comparar.addEventListener('pointerdown', e => { e.preventDefault(); try { comparar.setPointerCapture(e.pointerId); } catch (x) { } verAntes(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => comparar.addEventListener(ev, () => { if (estado === 'despues') verAntes(false); }));
  comparar.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); verAntes(true); } });
  comparar.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') verAntes(false); });
  const cerrar = (ruta) => { guardar(VISTA, '1'); aplicarUI(true); raiz.remove(); etiqueta.remove(); if (ruta) ir(ruta); if (opts.alCerrar) opts.alCerrar(); };
  const final = h('div.inau-final', h('div.card',
    h('h2', '🎉 ¡Ya está aquí la 14.0!'), h('p.small.muted', 'Todo sigue en su sitio, ahora con otra cara. Mira lo nuevo:'),
    h('div.inau-novedades', NOVEDADES.map(([e, t, r]) => h('button', { type: 'button', onclick: () => cerrar(r) }, h('span', e), t))),
    h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, btn('🚀 Empezar', () => cerrar(), { cls: 'primary' }), comparar,
      h('span.tiny.muted', { style: { flexBasis: '100%' } }, '¿Prefieres la de antes? Configuración → Mi perfil → Interfaz → Clásica.'))));
  const raiz = h('div.inau', { role: 'dialog', 'aria-label': 'Inauguración de la versión 14.0' },
    h('div.inau-velo'), h('div.inau-focos', h('i'), h('i'), h('i')),
    h('div.inau-caja', h('div.inau-antes', '⏪ Así era tu app hasta hoy'), h('div.inau-sello', 'Gran inauguración'),
      h('h1', 'CelebriDiseños 14.0'), h('p', 'Hoy se estrena la interfaz nueva. Corta la cinta para abrirla.'),
      h('button.inau-cortar', { type: 'button', onclick: e => cortar(e) }, '✂️ Cortar la cinta'),
      h('div', h('button', { type: 'button', style: { marginTop: '14px', background: 'none', border: 0, color: 'rgba(255,255,255,.7)', cursor: 'pointer', textDecoration: 'underline' }, onclick: () => cerrar() }, 'Saltar'))),
    cinta, tij, final);
  document.body.append(raiz, etiqueta); etiqueta.style.display = 'none';
  function cortar(e) {
    if (estado !== 'antes') return; estado = 'cortando';
    raiz.classList.add('cortando');
    setTimeout(() => {
      const de = document.documentElement, x = e && e.clientX ? e.clientX : innerWidth / 2, y = e && e.clientY ? e.clientY : innerHeight * 0.58;
      de.style.setProperty('--rx', x + 'px'); de.style.setProperty('--ry', y + 'px');
      const cambiar = () => { aplicarUI(true); raiz.classList.add('cortada'); };
      if (document.startViewTransition && !reducido()) { de.classList.add('u14-revelar'); const vt = document.startViewTransition(cambiar); vt.finished.finally(() => de.classList.remove('u14-revelar')); }
      else cambiar();
      estado = 'despues'; guardar(VISTA, '1'); guardar(CLAVE, 'nueva');
      if (!reducido()) { raiz.appendChild(cv); fuegos(cv, 5200); }
      tada();
      if (opts.alCortar) opts.alCortar();
    }, reducido() ? 0 : 850);
  }
  window.__cdInaug = { cortar: () => cortar(), cerrar, estado: () => estado, raiz, eraNueva };
  return raiz;
}
