// ================= 11-11-2026 · ✍️ LA MARCA DE LA VERSIÓN FINAL =================
// Biou: «quiero que el nuevo inicio se note: esta es la versión final final. CELEBRIDISEÑOS By Noorko abajo en letra ligada».
// Luego: «me gusta en la portada pero no en el programa: para iniciar sí, pero para estar no» → SOLO al entrar y en la presentación;
// dentro (el Puente de mando) no sale.
// marcaFinal() = CELEBRIDISEÑOS en grande y «By Noorko» debajo, en letra ligada (estilos en css/marca.css).
// estrenoFinal() = la presentación de una vez al abrir la versión final.
import { h, btn } from './ui.js';

export const NOMBRE = 'CELEBRIDISEÑOS', FIRMA = 'By Noorko';
const VISTO = 'cd.estrenoFinal';

export function marcaFinal(cls = '', extra = '') {
  return h('div.marca-final' + (cls ? '.' + cls : ''), { role: 'img', 'aria-label': 'CelebriDiseños, by Noorko' },
    h('b', NOMBRE), h('i', FIRMA), extra ? h('small', extra) : null);
}

const lee = k => { try { return localStorage.getItem(k); } catch (e) { return '1'; } };
const guarda = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };

// sale una sola vez (y nunca en las pruebas automáticas)
export function debeEstrenarFinal() { return !navigator.webdriver && !lee(VISTO); }

export function estrenoFinal(opts = {}) {
  if (document.querySelector('.ef')) return null;
  const ir = opts.ir || (r => { location.hash = '#/' + r; });
  let cerrado = false;
  const cerrar = ruta => {
    if (cerrado) return; cerrado = true; guarda(VISTO, '1');
    raiz.classList.add('fuera'); setTimeout(() => raiz.remove(), 560);
    document.removeEventListener('keydown', tecla); if (ruta) ir(ruta);
  };
  const tecla = e => { if (e.key === 'Escape' || e.key === 'Enter') cerrar(e.key === 'Enter' ? 'puente' : ''); };
  const nombre = h('div.ef-nombre', [...NOMBRE].map((c, i) => h('span', { style: { animationDelay: (0.25 + i * 0.07).toFixed(2) + 's' } }, c)));
  const raiz = h('div.ef', { role: 'dialog', 'aria-label': 'CelebriDiseños by Noorko · versión final' },
    h('button.ef-saltar', { type: 'button', onclick: () => cerrar('') }, 'Saltar'),
    h('div.ef-caja',
      h('div.ef-sello', 'Versión final'),
      nombre,
      h('div.ef-by', FIRMA),
      h('div.ef-linea'),
      h('p.ef-txt', 'Todo lo tuyo sigue en su sitio. Esta es la buena.'),
      h('div.ef-acc', btn('Empezar', () => cerrar('puente'), { cls: 'primary' }))));
  document.body.appendChild(raiz);
  document.addEventListener('keydown', tecla);
  setTimeout(() => nombre.classList.add('brilla'), 1300);
  // NO se cierra sola: solo cuenta como vista cuando ÉL pulsa (si el programa se reabre sin él delante, le sigue esperando; lección del 11-10)
  return { cerrar };
}
