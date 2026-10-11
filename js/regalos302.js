// ================= v30.2 · 🎁 LOS 4 REGALOS (la sorpresa de la mañana) =================
// La dueña (11-10-2026, al irse a dormir): «quiero que me regales 4 funciones premium, cuando despierte la sorpresa, ¡cúrratelo!».
// La primera vez que abre la 30.2 sale una caja de regalo que se abre (lazo, tapa que salta, confeti) y aparecen las 4 tarjetas;
// cada una lleva a su sitio con una pista de qué tocar. Una sola vez (se vuelve a ver con Ctrl K → «regalos»). No sale en las
// pruebas automáticas (navigator.webdriver) salvo que se pida (o.forzar).
import { h, btn, toast } from './ui.js';

// v30.2.3 · la dueña: «ni un mensaje de bienvenida… tampoco vi esas funcionalidades que me has regalado»: la ventana se gastó al
// abrir yo el programa tras instalarlo (se marcaba como vista AL ABRIRSE). Ahora: clave nueva y se marca SOLO cuando ella la cierra.
const VISTO = 'cd.regalos302.v2';
const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
export const debeRegalar = () => !leer(VISTO) && !navigator.webdriver;

export const REGALOS = [
  { k: 'texto', e: '🔤', t: 'Texto en cualquier cara', d: 'En el Estudio: toca una cara (arriba, de lado, donde sea) y escribe. En relieve o grabado, bien derecho y del tamaño que digas. De otro color, sale como pieza aparte para cambiar de color.', pista: 'Estudio → toca una cara de tu pieza → «🔤 Texto en esta cara» (o clic derecho → «Texto aquí…»)', ir: 'estudio' },
  { k: 'llenar', e: '🧩', t: 'Llenar la cama', d: 'En Fundas, Catálogo, Precisión, Foto → 3D y CelebriCLON: un toque y pone todas las que caben en tu P1P o en tu A1 mini, con los gramos y el tiempo.', pista: 'Abajo a la izquierda de la vista 3D: botón 🧩 → elige la impresora', ir: 'catalogo' },
  { k: 'qr', e: '📱', t: 'Llavero, imán o placa con QR', d: 'Tu tienda, tu Instagram o el WiFi del bar: escribe la web y sale el QR en relieve, listo para escanear con el móvil. Para regalar con cada pedido.', pista: 'Catálogo → Regalos y llaveros → «Llavero o placa con QR»', ir: 'qr' },
  { k: 'colores', e: '🌈', t: 'Colores por capas, sin AMS', d: 'Dos, tres o más colores con tu bobina de siempre: eliges a qué altura cambia y TU Bambu Studio pone la pausa él solo. La impresora se para en esa capa y cambias la bobina.', pista: 'Al preparar cualquier pieza para tu Bambu: «🌈 Colores por capas» → «✋ Cambio a mano» → «🖨️ Abrir en Bambu Studio con la pausa puesta»', ir: 'qr' }
];

export function regalos(o = {}) {
  if (document.querySelector('.rg302')) return;
  const ir = o.ir || (() => { }), irR8 = o.irR8 || (k => { guardar('cd.r8.pest', k); if (window.__r8ir && document.querySelector('.r8v')) window.__r8ir(k); else ir('celebrir8'); });
  const lleva = R => {
    cerrar();
    if (R.ir === 'qr') { guardar('cd.r8.cat.abrir', 'placaQR'); if (window.__r8catAbre && document.querySelector('.r8v')) { irR8('catalogo'); setTimeout(() => window.__r8catAbre && window.__r8catAbre('placaQR'), 250); } else irR8('catalogo'); }
    else irR8(R.ir);
    setTimeout(() => toast(R.e + ' ' + R.pista, 'info', 9000), 900);
  };
  const confeti = h('div.rg302-confeti', Array.from({ length: 70 }, (_, i) => h('i', { style: { left: (Math.random() * 100).toFixed(1) + '%', background: ['#ffd23f', '#ff7a1a', '#ff4d6d', '#9b5de5', '#3a86ff', '#2a9d8f'][i % 6], animationDelay: (0.6 + Math.random() * 0.9).toFixed(2) + 's', animationDuration: (2.2 + Math.random() * 1.8).toFixed(2) + 's', transform: 'rotate(' + Math.round(Math.random() * 360) + 'deg)' } })));
  const caja = h('div.rg302-caja', { 'aria-hidden': 'true' }, h('div.rg302-tapa', h('span.rg302-lazo')), h('div.rg302-cuerpo'), h('div.rg302-brillo'));
  const tarjetas = h('div.rg302-tars', REGALOS.map((R, i) => h('button.rg302-tar', { type: 'button', 'data-regalo': R.k, style: { animationDelay: (1.25 + i * 0.18) + 's' }, onclick: () => lleva(R) },
    h('span.rg302-e', R.e), h('b', R.t), h('small', R.d), h('span.rg302-ir', 'Probarlo →'))));
  const capa = h('div.rg302', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Tus 4 regalos de la 30.2' },
    confeti,
    h('div.rg302-panel',
      caja,
      h('div.rg302-tit', h('small', '✨ Inauguración de CelebriDiseños 30.2 · hecha mientras dormías'), h('h2', '🎁 ¡Bienvenida! Tus 4 regalos premium'), h('p', 'Hechos esta noche y probados uno a uno. Toca cualquiera y te llevo a estrenarlo. (Vuelven a estar en el Inicio de CelebriR8: «🎁 Tus 4 regalos».)')),
      tarjetas,
      h('div.rg302-pie', h('small', 'Y además: la barra de herramientas del Estudio ya cabe entera (en el PC y en la tablet), la tablet en vertical ya enseña bien la vista 3D, y más arreglos de la revisión de todas las pantallas.'), btn('¡Gracias! A trabajar', cerrar, { cls: 'primary rg302-ok' }))));
  function cerrar() { guardar(VISTO, '1'); capa.classList.add('fuera'); document.removeEventListener('keydown', tecla); setTimeout(() => capa.remove(), 380); o.alCerrar && o.alCerrar(); }
  const tecla = e => { if (e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', tecla);
  document.body.appendChild(capa);
  window.__rg302 = { abierto: true, n: REGALOS.length };
  return { cerrar };
}
