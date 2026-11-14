// ================= 14-11-2026 · 🖨️ «LAMINANDO EN TU BAMBU… 45 %» (con el porcentaje de verdad) =================
// Biou: «el cotizador… cuando pongo lo que quiero no abre bien; al menos que ponga “laminando en Bambu” con porcentaje real para saber
// que está listo para abrir». Preparar una pieza son varios laminados con su Bambu (cómo la dejó el diseñador, las posturas, las
// técnicas de soporte y el archivo final). El programa del PC los cuenta (desktop/host/progreso.go) y aquí se pregunta cada 0,7 s.
// Una tarjeta fija abajo a la derecha (no un aviso que se va): título, barra, el % y qué está haciendo; al acabar, «✅ Listo».
// El porcentaje nunca baja (si aparece un laminado más, se queda quieto un momento).
import { h } from './ui.js';
import { desktop } from './desktop.js';

export const nuevoProg = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const tiempo = s => s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s';

// La tarjeta. titulo: «🖨️ Laminando en tu Bambu…». Devuelve { pon(foto), fin(texto, tipo, detalle), quita() }
export function tarjetaProgreso(titulo) {
  const barra = h('i.pb-relleno'), pct = h('b.pb-pct', '0 %'), fase = h('span.pb-fase', 'empezando…'), cuenta = h('small.pb-cuenta', ''), tit = h('b.pb-tit', titulo);
  const el = h('div.pb', { role: 'status', 'aria-live': 'polite' }, h('div.pb-cab', tit, pct), h('div.pb-barra', barra), h('div.pb-pie', fase, cuenta));
  document.body.appendChild(el); document.body.classList.add('con-pb'); // (los avisos suben: si no, la tarjeta los tapa)
  let max = 0, quitado = false, t0 = Date.now();
  const pinta = (p, txt) => { max = Math.max(max, p); barra.style.width = max + '%'; pct.textContent = max + ' %'; if (txt != null) fase.textContent = txt; };
  pinta(1);
  const yo = {
    pct: () => max,
    pon(f) {
      if (!f || !f.ok || quitado) return;
      pinta(Math.min(99, Number(f.pct) || 0), f.fase || 'laminando');
      cuenta.textContent = (f.total > 0 ? 'laminado ' + Math.min(f.total, f.hechos + 1) + ' de ' + f.total + ' · ' : '') + tiempo(Number(f.segundos) || Math.round((Date.now() - t0) / 1000));
    },
    fin(texto, tipo, detalle) {
      if (quitado) return;
      if (tipo !== 'bad') pinta(100);
      el.classList.add(tipo === 'bad' ? 'mal' : 'bien'); tit.textContent = texto; fase.textContent = detalle || ''; cuenta.textContent = tiempo(Math.round((Date.now() - t0) / 1000));
      const cerrar = h('button.pb-x', { type: 'button', 'aria-label': 'Cerrar', onclick: () => yo.quita() }, '×'); el.querySelector('.pb-cab').appendChild(cerrar);
      setTimeout(() => yo.quita(), tipo === 'bad' ? 20000 : 12000);
    },
    quita() { if (quitado) return; quitado = true; el.remove(); if (!document.querySelector('.pb')) document.body.classList.remove('con-pb'); },
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
