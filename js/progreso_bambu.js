// ================= 14-11-2026 · 🖨️ «LAMINANDO EN TU BAMBU… 45 %» (con el porcentaje de verdad) =================
// Biou: «el cotizador… cuando pongo lo que quiero no abre bien; al menos que ponga “laminando en Bambu” con porcentaje real para saber
// que está listo para abrir». Preparar una pieza son varios laminados con su Bambu (cómo la dejó el diseñador, las posturas, las
// técnicas de soporte y el archivo final). El programa del PC los cuenta (desktop/host/progreso.go) y aquí se pregunta cada 0,7 s.
// Una tarjeta fija abajo a la derecha (no un aviso que se va): título, barra, el % y qué está haciendo; al acabar, «✅ Listo».
// El porcentaje nunca baja (si aparece un laminado más, se queda quieto un momento).
//
// 14-11-2026 (tarde) · 🎞️ LA CINTA. Biou: «cuando pone laminando en tu Bambu está súper bien, pero estaría mejor si abajo va saliendo lo
// que va a ser, para saber qué ajustes tendrá y qué acabado, como textos deslizantes informativos». Debajo de la barra, una frase cada
// 3,6 s que entra deslizándose desde la derecha (acabado, capa y paredes, velocidad, temperatura, impresora, colores, soporte…). Al
// acabar cambia a «Cómo ha quedado» (postura, gramos de soporte…). Con el ratón encima se queda quieta; un toque pasa a la siguiente.
// Solo transform/opacity (va por la tarjeta gráfica); con «reducir movimiento» de Windows, sin deslizar.
import { h } from './ui.js';
import { desktop } from './desktop.js';

export const nuevoProg = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const tiempo = s => s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s';
export const CINTA_MS = 3600; // lo que se queda cada frase

// La cinta: frases que van pasando. Devuelve { el, pon(titulo, lineas), para() }
function cintaNueva() {
  const tit = h('small.pb-cinta-tit', ''), via = h('div.pb-cinta-via'), puntos = h('div.pb-cinta-pts', { 'aria-hidden': 'true' });
  const el = h('div.pb-cinta', { title: 'Toca para ver la siguiente' }, h('div.pb-cinta-cab', tit, puntos), via);
  let L = [], i = -1, tm = null, quieta = false, viva = true;
  const pinta = () => {
    if (!L.length) return;
    i = (i + 1) % L.length;
    via.querySelectorAll('.pb-ct.sale').forEach(x => x.remove()); // (si se toca muy deprisa, la que ya se iba desaparece: nunca hay tres)
    const vieja = via.querySelector('.pb-ct:not(.sale)');
    if (vieja) { vieja.classList.add('sale'); setTimeout(() => vieja.remove(), 650); }
    const nueva = h('span.pb-ct', L[i]); via.appendChild(nueva);
    via.style.height = Math.ceil(nueva.getBoundingClientRect().height) + 'px'; // (la frase larga, en el móvil, ocupa 3 renglones: la caja crece, no se corta)
    [...puntos.children].forEach((p, k) => p.classList.toggle('on', k === i));
  };
  const sigue = () => { clearTimeout(tm); if (viva && L.length > 1) tm = setTimeout(() => { if (!quieta) pinta(); sigue(); }, CINTA_MS); };
  el.addEventListener('mouseenter', () => { quieta = true; });
  el.addEventListener('mouseleave', () => { quieta = false; });
  el.addEventListener('click', () => { pinta(); sigue(); });
  return {
    el,
    lineas: () => L.slice(),
    pon(titulo, lineas) {
      L = (lineas || []).filter(Boolean);
      el.hidden = !L.length; tit.textContent = titulo || '';
      puntos.replaceChildren(...L.map(() => h('i'))); puntos.hidden = L.length < 2;
      i = -1; via.replaceChildren(); pinta(); sigue();
    },
    para() { viva = false; clearTimeout(tm); },
  };
}

// La tarjeta. titulo: «🖨️ Laminando en tu Bambu…». opts.cinta = frases de «Así va a salir» (opcional).
// Devuelve { pon(foto), fin(texto, tipo, detalle, cintaFin), quita(), cinta }
export function tarjetaProgreso(titulo, opts = {}) {
  const barra = h('i.pb-relleno'), pct = h('b.pb-pct', '0 %'), fase = h('span.pb-fase', 'empezando…'), cuenta = h('small.pb-cuenta', ''), tit = h('b.pb-tit', titulo);
  const cinta = cintaNueva();
  const el = h('div.pb', { role: 'status', 'aria-live': 'polite' }, h('div.pb-cab', tit, pct), h('div.pb-barra', barra), h('div.pb-pie', fase, cuenta), cinta.el);
  let max = 0, quitado = false, t0 = Date.now();
  document.body.appendChild(el); document.body.classList.add('con-pb'); // (los avisos suben: si no, la tarjeta los tapa)
  // (los avisos se ponen justo encima de la tarjeta, mida lo que mida con la cinta)
  const alto = () => { if (!quitado) document.body.style.setProperty('--pb-alto', Math.ceil(el.getBoundingClientRect().height) + 'px'); };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(alto) : null; if (ro) ro.observe(el);
  const pinta = (p, txt) => { max = Math.max(max, p); barra.style.width = max + '%'; pct.textContent = max + ' %'; if (txt != null) fase.textContent = txt; };
  pinta(1);
  cinta.pon('Así va a salir', opts.cinta || []); alto();
  const yo = {
    pct: () => max,
    cinta,
    pon(f) {
      if (!f || !f.ok || quitado) return;
      pinta(Math.min(99, Number(f.pct) || 0), f.fase || 'laminando');
      cuenta.textContent = (f.total > 0 ? 'laminado ' + Math.min(f.total, f.hechos + 1) + ' de ' + f.total + ' · ' : '') + tiempo(Number(f.segundos) || Math.round((Date.now() - t0) / 1000));
    },
    // cintaFin = frases de «Cómo ha quedado» (si no hay, se va la cinta). Con frases, se queda más rato para poder leerlas.
    fin(texto, tipo, detalle, cintaFin) {
      if (quitado) return;
      if (tipo !== 'bad') pinta(100);
      el.classList.add(tipo === 'bad' ? 'mal' : 'bien'); tit.textContent = texto; fase.textContent = detalle || ''; cuenta.textContent = tiempo(Math.round((Date.now() - t0) / 1000));
      const fl = (cintaFin || []).filter(Boolean);
      cinta.pon(fl.length ? 'Cómo ha quedado' : '', fl);
      const cerrar = h('button.pb-x', { type: 'button', 'aria-label': 'Cerrar', onclick: () => yo.quita() }, '×'); el.querySelector('.pb-cab').appendChild(cerrar);
      setTimeout(() => yo.quita(), tipo === 'bad' ? 20000 : Math.max(12000, Math.min(40000, fl.length * CINTA_MS + 2000)));
    },
    quita() {
      if (quitado) return; quitado = true; cinta.para(); if (ro) ro.disconnect(); el.remove();
      if (!document.querySelector('.pb')) { document.body.classList.remove('con-pb'); document.body.style.removeProperty('--pb-alto'); }
    },
  };
  window.__progresoBambu = yo;
  return yo;
}

// Pregunta al programa del PC cada 0,7 s cómo va el trabajo «id» y se lo pasa a cb(foto). Devuelve con qué pararlo.
export function sigueProgreso(id, cb) {
  let vivo = true, tm = null;
  const vuelta = async () => {
    if (!vivo) return;
    try { const f = await desktop.progreso(id); if (vivo && f) cb(f); } catch (e) { /* (un fallo suelto no para nada) */ }
    if (vivo) tm = setTimeout(vuelta, 700);
  };
  tm = setTimeout(vuelta, 300);
  return () => { vivo = false; clearTimeout(tm); };
}
