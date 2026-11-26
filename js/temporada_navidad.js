// ================= 25-11-2026 · 🎄 TEMPORADA «NAVIDAD» de CelebriDiseños (cara «Familia») =================
// Solo se importa si temporada = navidad (familia.js → aplicaTemporada). Apagada, ni se pide.
// Biou: «quiero nieve en CelebriDiseños eh jaja… ¡¡estamos en Navidad!!» · «me ha faltado renos… gorros de Navidad, ambiente navideño».
// Aquí va lo que se mueve; lo quieto (guirnalda, gorrito, renos, pinos) está en css/temporada_navidad.css.
//  · la NIEVE: pocos copos finos que caen DETRÁS del contenido (canvas fijo con z-index −1) y, donde luce de verdad, dentro de la portada
//    oscura y del menú verde (también detrás de las letras), a 30 imágenes por segundo;
//    se para si la pestaña no se ve, no sale con «reducir movimiento» y tiene su interruptor («Nieve: sí / no», Configuración)
//  · la BIENVENIDA: 1 vez al día al entrar (logo con gorrito, renos y pinos, nieve fina); se va sola, al tocar o con una tecla
//  · el DESTELLO del logo al pasar el ratón: como mucho 1 vez por sesión
const de = document.documentElement;
const reduce = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const lee = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const guarda = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
const leeS = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const guardaS = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } };
const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// ---------- la nieve ----------
// densidad: copos por cada 16 000 px² (tope 90); el color sale del CSS (color del canvas), así cambia con Hueso / Grafito
export function nieve(cv, densidad = 1) {
  const c = cv.getContext('2d'); if (!c) return () => { };
  let W = 0, H = 0, dpr = 1, P = [], vivo = true, raf = 0, ult = 0, color = '', filo = '', nFr = 0, copo = null;
  const nuevo = arriba => { const z = Math.random(); return { x: Math.random() * W, y: arriba ? -8 * dpr : Math.random() * H, r: (1.1 + z * z * 2.6) * dpr, v: (.2 + z * .5) * dpr, d: Math.random() * 6.283, a: .4 + z * .6 }; }; // los grandes, más cerca: más rápidos y más claros
  // el copo: un redondel suave (se dibuja una vez y se copia). Color = centro; «border-color» del canvas = el filo, para que se vea también sobre papel claro
  const pinta = () => { const cs = getComputedStyle(cv), n = cs.color + cs.borderTopColor; if (n === filo) return; filo = n; color = cs.color;
    copo = document.createElement('canvas'); copo.width = copo.height = 32; const g = copo.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, color); gr.addColorStop(.45, color); gr.addColorStop(.72, cs.borderTopColor); gr.addColorStop(1, 'rgba(255, 255, 255, 0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); };
  const tam = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1); W = cv.width = Math.max(1, Math.round(cv.clientWidth * dpr)); H = cv.height = Math.max(1, Math.round(cv.clientHeight * dpr));
    const n = Math.round(Math.min(90, cv.clientWidth * cv.clientHeight / 16000) * densidad);
    while (P.length < n) P.push(nuevo(false)); P.length = n; pinta();
  };
  const paso = t => {
    if (!vivo) return; raf = requestAnimationFrame(paso);
    if (ult && t - ult < 32) return; // 30 imágenes por segundo bastan para copos lentos (la mitad de trabajo)
    const k = ult ? Math.min(3, (t - ult) / 16.7) : 1; ult = t;
    if (++nFr % 90 === 0) pinta(); // por si cambia el tema
    if (!cv.isConnected) return; // (la portada se rehace entera: el canvas espera a que lo vuelvan a poner)
    c.clearRect(0, 0, W, H);
    for (const p of P) {
      p.y += p.v * k; p.d += .012 * k; p.x += Math.sin(p.d) * .25 * dpr * k;
      if (p.y > H + 6) Object.assign(p, nuevo(true));
      c.globalAlpha = p.a; c.drawImage(copo, p.x - p.r * 1.6, p.y - p.r * 1.6, p.r * 3.2, p.r * 3.2);
    }
    c.globalAlpha = 1;
  };
  const vis = () => { cancelAnimationFrame(raf); ult = 0; if (vivo && !document.hidden) raf = requestAnimationFrame(paso); };
  tam(); window.addEventListener('resize', tam); document.addEventListener('visibilitychange', vis); vis();
  return () => { vivo = false; cancelAnimationFrame(raf); window.removeEventListener('resize', tam); document.removeEventListener('visibilitychange', vis); };
}

// ---------- dibujos de la bienvenida (siluetas finas de oro: nada de caritas) ----------
const RENO = '<path d="M24 51L34 55C44 51 66 53 86 50C96 47 104 38 109 25C111 20 115 18 119 19L124 22C130 26 137 30 141 34C143 36 142 39 139 39L131 38C127 37 123 35 120 32C117 41 114 51 110 60C108 64 105 68 101 71L96 72C84 75 58 75 46 72C38 70 34 65 33 60Z"/>' +
  '<path d="M98 66L105 66L102 90L101 117L98 117L98 92ZM89 68L95 68L93 90L92 117L89 117L89 92ZM34 58L47 61L46 76L49 94L47 117L44 117L44 96L41 80L35 70ZM50 68L57 70L54 92L54 117L51 117L51 94Z"/>' +
  '<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M113 20C108 8 104 0 104 -10M110 13C105 11 100 10 97 5M107 6C103 3 101 -1 101 -5M105 -2C109 -4 111 -7 110 -11"/><path d="M118 19C119 9 122 2 127 -5M120 12C124 10 128 10 131 7M123 5C126 2 130 1 132 -2"/></g>';
const PINO = (x, k) => '<path transform="translate(' + x + ' 104) scale(' + k + ')" d="M0 -76L13 -50H7L18 -28H8L22 0H-22L-8 -28H-18L-7 -50H-13Z"/>';
const ESTRELLA = (x, y, k) => '<path transform="translate(' + x + ' ' + y + ') scale(' + k + ')" d="M12 1.5c.5 4.6 2.4 7.6 6.2 9.3.6.3.6.6 0 .9-3.8 1.7-5.7 4.7-6.2 9.3-.5-4.6-2.4-7.6-6.2-9.3-.6-.3-.6-.6 0-.9C9.6 9.1 11.5 6.1 12 1.5z"/>';
const PAISAJE = '<svg viewBox="0 0 600 112" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
  '<g fill="#0B3024" opacity=".95">' + PINO(54, .8) + PINO(92, 1.05) + PINO(128, .7) + PINO(476, .75) + PINO(512, 1.1) + PINO(552, .85) + '</g>' +
  '<path d="M0 104H600" fill="none" stroke="#E6C964" stroke-opacity=".5" stroke-width="1.4"/>' +
  '<g fill="#E6C964" color="#E6C964" opacity=".88"><g transform="translate(196 31) scale(.62)">' + RENO + '</g><g transform="translate(408 51) scale(-.45 .45)">' + RENO + '</g></g>' +
  '<g fill="#E6C964">' + ESTRELLA(300, 14, .55) + ESTRELLA(236, 16, .32) + ESTRELLA(372, 26, .3) + '</g></svg>';

// ---------- la bienvenida (1 vez al día, ya dentro del programa) ----------
let vigia = null, bien = null;
function bienvenida() {
  const pedida = /[?&]bienvenida\b/.test(location.search);
  if (!pedida && (navigator.webdriver || lee('cd.navidad.bienvenida') === hoy())) return true; // (en las pruebas automáticas, no: taparía las pantallas)
  if (!document.querySelector('.shell') || !de.classList.contains('fam')) return false; // aún en la entrada: se espera
  guarda('cd.navidad.bienvenida', hoy());
  const d = document.createElement('div');
  d.className = 'nav-bienvenida'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Felices fiestas');
  d.innerHTML = '<canvas aria-hidden="true"></canvas><div class="nav-bien-paisaje" aria-hidden="true">' + PAISAJE + '</div>' +
    '<div class="nav-bien-caja"><span class="fam-emb"><img src="icons/logo-c.png" alt="" width="170" height="170"></span>' +
    '<p>CelebriDiseños</p><div class="nav-bien-linea"></div><h1>Felices fiestas en el taller</h1><p class="nav-bien-sub">Toca para empezar</p></div>';
  document.body.appendChild(d);
  const para = reduce() ? () => { } : nieve(d.querySelector('canvas'), 1.7);
  const cierra = () => { if (d.classList.contains('fuera')) return; d.classList.add('fuera'); document.removeEventListener('keydown', cierra); setTimeout(() => { para(); d.remove(); if (bien === d) bien = null; }, reduce() ? 0 : 540); };
  d.addEventListener('click', cierra); document.addEventListener('keydown', cierra);
  setTimeout(cierra, 4200); bien = d;
  return true;
}
function esperaBienvenida() {
  if (bienvenida()) return;
  vigia = new MutationObserver(() => { if (bienvenida()) { vigia.disconnect(); vigia = null; } });
  vigia.observe(document.body, { childList: true, subtree: true });
}

// ---------- el destello del logo (1 por sesión) ----------
let onOver = null;
const destello = e => {
  const m = e.target && e.target.closest && e.target.closest('.fam-marca, .tb-marca'); if (!m || leeS('cd.navidad.destello')) return;
  guardaS('cd.navidad.destello', '1'); m.classList.add('nav-destello'); setTimeout(() => m.classList.remove('nav-destello'), 1300);
};

// ---------- encender / apagar (familia.js) ----------
// dónde nieva: la pantalla entera (detrás de todo), la portada y el menú de la izquierda
const LUGARES = [['.nav-nieve', () => document.body, 1], ['.nav-nieve-h', () => document.querySelector('.fam-hero'), 2.2], ['.nav-nieve-l', () => (innerWidth >= 900 ? document.querySelector('.rail50') : null), 1.5]];
let copos = null, reloj = 0;
function coloca() { // la portada y el menú se rehacen solos: si su canvas se cae, se vuelve a poner (1 vez por segundo, barato)
  if (!copos || document.hidden) return;
  LUGARES.forEach(([cls, donde, den]) => {
    const h = donde(); let x = copos.get(cls);
    if (!h) { if (x) { x.para(); x.cv.remove(); copos.delete(cls); } return; }
    if (x && x.cv.parentNode === h) return;
    if (x) { x.para(); x.cv.remove(); }
    const cv = document.createElement('canvas'); cv.className = 'nav-copos ' + cls.slice(1); cv.setAttribute('aria-hidden', 'true'); h.prepend(cv); copos.set(cls, { cv, para: nieve(cv, den) });
  });
}
function quitaCopos() { clearInterval(reloj); reloj = 0; if (copos) copos.forEach(x => { x.para(); x.cv.remove(); }); copos = null; }
export function enciende(o = {}) {
  const quiere = o.nieve !== false && !reduce();
  if (quiere && !copos) { copos = new Map(); coloca(); reloj = setInterval(coloca, 1000); }
  if (!quiere) quitaCopos();
  if (!onOver && !reduce()) { onOver = destello; document.addEventListener('mouseover', onOver, { passive: true }); }
  if (!vigia && !bien) esperaBienvenida();
}
export function apaga() {
  quitaCopos();
  if (onOver) { document.removeEventListener('mouseover', onOver); onOver = null; }
  if (vigia) { vigia.disconnect(); vigia = null; }
  if (bien) { bien.remove(); bien = null; }
}
