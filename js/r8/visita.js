// ================= v20 · ❓ CelebriR8 · VISITA GUIADA =================
// Sale SOLA la primera vez que se abre CelebriR8 y luego nunca más, salvo que se pida (botón «❓ Aprender» o «Aprender a
// utilizar CelebriR8» en Inicio). 8 pantallas: avanzar, retroceder, saltar y salir (también con ← → y Esc), indicador de
// progreso y la parte REAL de la pantalla resaltada. Si lo que se va a señalar no está en pantalla, la explicación sale en
// el centro y no habla de ningún botón que no exista. Se recuerda en «cd.r8.visita» (vista / otra vez).
import { h, mount } from '../ui.js';

const guarda = v => { try { localStorage.setItem('cd.r8.visita', v); } catch (e) { } };
let capa = null, teclas = null, abierta = null;

// dibujos sencillos (SVG en línea, sin cargar nada) para explicar sin llenar de texto
const svg = (w, hh, cuerpo) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${hh}`); s.setAttribute('class', 'r8vis-dib'); s.setAttribute('role', 'img'); s.innerHTML = cuerpo; return s; };
const DIB = {
  flujo: () => svg(440, 92, `<g font-family="Bahnschrift,Segoe UI,sans-serif" font-size="12" text-anchor="middle" fill="currentColor">
    ${[['📷', 'Foto', 'o medidas'], ['🧊', 'Modelo 3D', 'IA o CAD'], ['🛠️', 'Reparar', 'Blender'], ['🩺', 'Revisar', 'Print Doctor'], ['🖨️', 'Bambu', '3MF']].map(([e, t, s], i) => `<g transform="translate(${44 + i * 88},0)"><circle cx="0" cy="30" r="24" fill="none" stroke="currentColor" stroke-opacity=".35"/><text y="37" font-size="20">${e}</text><text y="70" font-weight="700">${t}</text><text y="85" opacity=".6" font-size="10.5">${s}</text></g>${i < 4 ? `<path d="M${74 + i * 88} 30h28" stroke="currentColor" stroke-opacity=".45" stroke-width="2" marker-end="url(#fl)"/>` : ''}`).join('')}
    <defs><marker id="fl" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="currentColor" fill-opacity=".55"/></marker></defs></g>`),
  dos: () => svg(440, 110, `<g font-family="Bahnschrift,Segoe UI,sans-serif" font-size="12" fill="currentColor">
    <rect x="6" y="6" width="206" height="98" rx="12" fill="none" stroke="#f472b6" stroke-opacity=".7"/><text x="20" y="28" font-weight="700" font-size="13">🧸 Figura (foto)</text>
    <text x="20" y="50" opacity=".8">Importa que se PAREZCA</text><text x="20" y="68" opacity=".8">La IA imagina la forma</text><text x="20" y="86" opacity=".8">Error de 3–4 mm: no pasa nada</text>
    <rect x="228" y="6" width="206" height="98" rx="12" fill="none" stroke="#29d3ff" stroke-opacity=".8"/><text x="242" y="28" font-weight="700" font-size="13">⚙️ Repuesto (medidas)</text>
    <text x="242" y="50" opacity=".8">Importa que ENCAJE</text><text x="242" y="68" opacity=".8">Se dibuja con tus medidas</text><text x="242" y="86" opacity=".8">Error de 0,1 mm: ya no encaja</text></g>`),
  reparar: () => svg(440, 96, `<g font-family="Bahnschrift,Segoe UI,sans-serif" font-size="12" fill="currentColor" text-anchor="middle">
    <g transform="translate(80,0)"><path d="M-40 70 L0 18 L40 70 Z" fill="none" stroke="#ff6b81" stroke-width="2" stroke-dasharray="4 4"/><circle cx="14" cy="50" r="5" fill="#ff6b81"/><text y="90">Antes: agujero</text></g>
    <path d="M150 46h60" stroke="currentColor" stroke-opacity=".5" stroke-width="2"/><text x="180" y="38" font-size="11" opacity=".7">Blender</text>
    <g transform="translate(290,0)"><path d="M-40 70 L0 18 L40 70 Z" fill="none" stroke="#3ddc97" stroke-width="2"/><text y="90">Después: cerrada</text></g>
    <g transform="translate(395,0)"><text y="40" font-size="20">↩</text><text y="62" font-size="11" opacity=".75">original</text><text y="76" font-size="11" opacity=".75">guardado</text></g></g>`),
  imprimir: () => svg(440, 96, `<g font-family="Bahnschrift,Segoe UI,sans-serif" font-size="12" fill="currentColor">
    <rect x="8" y="70" width="150" height="8" rx="2" fill="currentColor" fill-opacity=".25"/><path d="M40 70 L60 22 L110 22 L130 70 Z" fill="none" stroke="#3ddc97" stroke-width="2"/><text x="20" y="94" font-size="11">Bien apoyada: sin soportes</text>
    <rect x="250" y="70" width="150" height="8" rx="2" fill="currentColor" fill-opacity=".25"/><path d="M300 70 L300 50 L380 50 L380 30 L300 30" fill="none" stroke="#ffb84d" stroke-width="2"/><path d="M330 50 L330 70 M355 50 L355 70" stroke="#ffb84d" stroke-dasharray="3 3"/><text x="262" y="94" font-size="11">Voladizo: necesita soporte</text></g>`)
};

const PASOS = [
  { t: 'Bienvenida a CelebriR8', dib: 'flujo', txt: 'CelebriR8 convierte fotos, bocetos y medidas en piezas listas para tu Bambu. Puedes crear figuras desde una foto, diseñar repuestos con medidas exactas, reparar modelos y revisarlos antes de imprimir. Todo gratis y en tu PC.' },
  { t: 'Tu espacio de trabajo', ir: 'inicio', sel: '.r8v-tabs', txt: 'Arriba están las partes del programa, ordenadas por lo que quieres hacer: CREAR (Estudio, Catálogo, Foto → 3D, Smart Lab, Precisión, Fundas, Plantillas), MEJORAR (Reparar) e IMPRIMIR. Abajo, la barra de estado dice qué se está haciendo y qué hay en tu PC. El botón ⤢ pone CelebriR8 a pantalla completa.' },
  { t: 'Crear modelos 3D desde una foto', ir: 'lab', sel: '.r8l-izq', txt: 'Sube una foto (mejor de frente y con fondo liso). El fondo se quita una sola vez. Pulsa «PROBAR MOTORES Y ELEGIR EL MEJOR»: los motores instalados se prueban de uno en uno, sin llenar la tarjeta gráfica, y te dice cuál ha salido mejor y por qué. Si prefieres un motor concreto, usa la pestaña Foto → 3D.' },
  { t: 'Mejorar y reparar', ir: 'taller', sel: '.r8t-pasos', dib: 'reparar', txt: 'En Reparar se comprueba el modelo: agujeros, piezas sueltas, caras al revés y paredes finas. Las reparaciones se hacen con Blender en segundo plano (no tienes que abrirlo). Ves el antes y el después, lo que ha cambiado en milímetros, y puedes deshacer o volver al original cuando quieras.' },
  { t: 'Figuras y repuestos no son lo mismo', ir: 'inicio', sel: '.r8i-dos', dib: 'dos', txt: 'Una figura desde una foto tiene que PARECERSE: la IA imagina la forma y la parte de atrás. Un repuesto tiene que ENCAJAR: se hace en Precisión con tus medidas de calibre. La IA de fotos no sirve para engranajes ni agujeros: en las pruebas se equivocaba 3–4 mm.' },
  { t: 'Preparar para imprimir', ir: 'doctor', sel: '.r8d-izq', dib: 'imprimir', txt: 'El Print Doctor revisa el modelo antes de imprimir: que se pueda exportar, piezas separadas, paredes finas, medidas finales y si cabe en tu impresora. Propone la mejor orientación, te dice si hacen falta soportes y prepara el 3MF con tus perfiles de Bambu Studio. Al final, un informe con todo lo comprobado.' },
  { t: 'Guardar y recuperar', ir: 'inicio', sel: '.r8i-lado', txt: 'Lo que generas, reparas o diseñas queda en «Recientes» aunque cierres el programa. Los archivos que guardas van a Documentos › CelebriDiseños_R8, en carpetas por tarea. Los diseños del Estudio se guardan con ARCHIVO → Guardar. El original de cada modelo nunca se pierde.' },
  { t: 'Tu primer proyecto', fin: true, txt: 'Te propongo una prueba de 5 minutos con el flujo completo: diseñar un casquillo con medidas en Precisión, revisarlo en el Print Doctor y sacar el archivo para Bambu Studio. No gasta filamento hasta que tú lo imprimas.' }
];

function espera(sel, ms = 2500) { return new Promise(res => { const t0 = Date.now(); (function mira() { const e = sel && document.querySelector(sel); if (e && e.getBoundingClientRect().width) return res(e); if (!sel || Date.now() - t0 > ms) return res(null); setTimeout(mira, 120); })(); }); }

export function cerrar() { if (capa) { capa.remove(); capa = null; } if (teclas) { document.removeEventListener('keydown', teclas, true); teclas = null; } window.removeEventListener('resize', reubica); abierta = null; window.__r8visita = null; }
let reubica = () => { };

// motor común de la visita y del primer proyecto
function recorrido(pasos, o) {
  cerrar();
  let i = Math.max(0, Math.min(pasos.length - 1, o.desde || 0)), otra = false;
  const hueco = h('div.r8vis-hueco'), tarjeta = h('div.r8vis-tar', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'r8vis-t' });
  capa = h('div.r8vis', { onclick: e => { if (e.target === capa) { } } }, hueco, tarjeta); document.body.appendChild(capa);
  const termina = como => { if (o.clave) guarda(otra ? '' : 'vista'); cerrar(); o.alSalir && o.alSalir(como); };
  async function pinta() {
    const P = pasos[i]; abierta = { i, t: P.t };
    if (P.ir && o.ir && window.__r8pest !== P.ir) { await o.ir(P.ir); } // si ya está en esa pestaña, no se vuelve a montar (se perdería lo hecho)
    if (P.antes) { try { await P.antes(); } catch (e) { } }
    const obj = await espera(P.sel);
    if (!capa) return;
    capa.classList.toggle('sin', !obj);
    const coloca = () => {
      if (!obj || !document.body.contains(obj)) { hueco.style.cssText = 'display:none'; tarjeta.style.cssText = ''; tarjeta.classList.add('centro'); return; }
      const r = obj.getBoundingClientRect(), m = 6; tarjeta.classList.remove('centro');
      hueco.style.cssText = `display:block;left:${r.left - m}px;top:${r.top - m}px;width:${r.width + 2 * m}px;height:${r.height + 2 * m}px`;
      const tw = Math.min(420, innerWidth - 32), th = tarjeta.offsetHeight || 300;
      let x, y;
      if (r.right + 16 + tw < innerWidth) { x = r.right + 16; y = Math.max(16, Math.min(innerHeight - th - 16, r.top)); }
      else if (r.left - 16 - tw > 0) { x = r.left - 16 - tw; y = Math.max(16, Math.min(innerHeight - th - 16, r.top)); }
      else if (r.bottom + 16 + th < innerHeight) { y = r.bottom + 16; x = Math.max(16, Math.min(innerWidth - tw - 16, r.left)); }
      else { y = Math.max(16, r.top - th - 16); x = Math.max(16, Math.min(innerWidth - tw - 16, r.left)); }
      tarjeta.style.cssText = `left:${x}px;top:${y}px;width:${tw}px`;
    };
    reubica = coloca;
    const ult = i === pasos.length - 1;
    mount(tarjeta,
      h('div.r8vis-cab', h('span.r8vis-n', (o.titulo || 'Visita guiada') + ' · ' + (i + 1) + ' de ' + pasos.length), h('button.r8vis-x', { type: 'button', 'aria-label': 'Salir de la visita', title: 'Salir (Esc)', onclick: () => termina('salir') }, '✕')),
      h('div.r8vis-prog', { 'aria-hidden': 'true' }, pasos.map((_, k) => h('span' + (k < i ? '.hecho' : k === i ? '.on' : ''), { onclick: () => { i = k; pinta(); } }))),
      h('h3#r8vis-t', P.t), P.dib && DIB[P.dib] ? DIB[P.dib]() : null, h('p', P.txt),
      P.fin && o.alFinal ? o.alFinal(termina) : null,
      h('div.r8vis-pie',
        o.clave ? h('label.r8vis-otra', h('input', { type: 'checkbox', checked: otra, onchange: e => { otra = e.target.checked; } }), 'Volver a enseñarla la próxima vez') : h('span'),
        h('div.r8vis-bts', i > 0 ? h('button.btn.sm.ghost.r8vis-atras', { type: 'button', onclick: () => { i--; pinta(); } }, '← Atrás') : null,
          !ult ? h('button.btn.sm.ghost.r8vis-saltar', { type: 'button', onclick: () => termina('saltar') }, 'Saltar') : null,
          h('button.btn.sm.primary.r8vis-sig', { type: 'button', onclick: async () => { if (P.despues) { try { await P.despues(); } catch (e) { } } if (ult) termina('fin'); else { i++; pinta(); } } }, ult ? (o.textoFin || 'Terminar') : 'Siguiente →'))));
    coloca(); requestAnimationFrame(coloca);
    const sig = tarjeta.querySelector('.r8vis-sig'); if (sig) sig.focus({ preventScroll: true });
    window.__r8visita = { paso: i + 1, de: pasos.length, titulo: P.t, resaltado: !!obj, sel: P.sel || null };
  }
  teclas = e => { if (!capa) return; if (e.key === 'Escape') { e.preventDefault(); termina('salir'); } else if (e.key === 'ArrowRight' && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) { e.preventDefault(); tarjeta.querySelector('.r8vis-sig').click(); } else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); i--; pinta(); } };
  document.addEventListener('keydown', teclas, true); window.addEventListener('resize', () => reubica());
  pinta();
}

export function empezar(o = {}) {
  recorrido(PASOS, { ir: o.ir, desde: o.desde, clave: true, titulo: 'Visita guiada', textoFin: 'Ahora no, gracias',
    alFinal: termina => h('div.r8p-btns.r8vis-empieza', h('button.btn.primary', { type: 'button', onclick: () => { termina('primer'); primerProyecto({ ir: o.ir }); } }, '🧭 Empezar mi primer proyecto')),
    alSalir: o.alSalir });
}

// 🧭 EL PRIMER PROYECTO: un casquillo de medidas conocidas → Print Doctor → archivo para Bambu. Cada paso lo hace el
// programa si pulsas «Siguiente» (o lo haces tú en la pantalla). No imprime nada.
export function primerProyecto(o = {}) {
  const P = () => window.__r8pr, D = () => window.__r8doc;
  recorrido([
    { t: '1 · Abre el Precision Lab', ir: 'precision', sel: '.r8pr-tipos', txt: 'Aquí se diseñan los repuestos con medidas. Vamos a hacer un CASQUILLO (un tubo corto, como los que separan dos piezas en un eje).', despues: () => P() && P().elige('casquillo') },
    { t: '2 · Las medidas', ir: 'precision', sel: '.r8pr-medidas', antes: () => P() && P().elige('casquillo'), txt: 'Cada medida dice de dónde sale: ✍️ la escribes tú, 🧮 se calcula o ❓ falta. Lo que falta sale en rojo y no se inventa. Pondré unas medidas de ejemplo: 22 mm por fuera, 8 por dentro y 10 de largo.', despues: () => P() && P().ejemplo() },
    { t: '3 · Compruébalo en 3D', ir: 'precision', sel: '.r8pr-vista', txt: 'La pieza se dibuja con sus cotas. Gírala con el ratón. Si una medida no casa (un agujero más grande que la pieza, una pared demasiado fina para tu boquilla), sale un aviso.' },
    { t: '4 · Al Print Doctor', ir: 'precision', sel: '.r8pr-imprimir', txt: 'Este botón la manda a revisar antes de imprimir, sin descargar nada.', despues: () => P() && P().aImprimir() },
    { t: '5 · La revisión', ir: 'doctor', sel: '.r8d-chequeos', txt: 'El Print Doctor comprueba que se puede exportar, que es una sola pieza, sus paredes, sus medidas y si cabe en tu impresora. Lo que es aproximado lo dice.' },
    { t: '6 · Orientación y soportes', ir: 'doctor', sel: '.r8d-orient', txt: 'Te propone cómo ponerla en la cama (con sus ventajas e inconvenientes) y si necesita soportes. El casquillo, de pie, no los necesita.' },
    { t: '7 · El archivo para Bambu', ir: 'doctor', sel: '.r8d-exportar', txt: 'Desde aquí sacas el STL o el 3MF con tus ajustes de Bambu Studio dentro, o lo abres directamente en Bambu Studio. Se guarda en Documentos › CelebriDiseños_R8. ¡Ya conoces el flujo completo!' }
  ], { ir: o.ir, titulo: 'Mi primer proyecto', textoFin: 'Terminar' });
}
export const estado = () => abierta;
