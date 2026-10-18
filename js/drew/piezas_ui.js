// ================= 👗 CelebriDREW · 🧩 MONTA TU SUDADERA: piezas que se ARRASTRAN a la prenda (17-10-2026) =================
// Ella: «las sudaderas tienen complementos: poder crear diseños desde 0: arrastro cremallera, arrastro otro puño, arrastro capucha… para
// dejarlo como a mí me gusta». Cada pieza es una tarjeta con su dibujito (la sudadera con esa parte resaltada) que se arrastra al 3D o al
// patrón —o se toca, que con el dedo del iPad es lo cómodo— y cambia la opción de la plantilla (bloques/sudadera.js): se vuelve a trazar
// el patrón y a coser en el 3D, con Ctrl+Z. Y lo que se ve sin estar en el patrón (la CREMALLERA) se pinta en el 3D como un estampado.
export const GRUPOS = [
  ['cuelloTipo', 'Cuello', [['capucha', 'Capucha'], ['redondo', 'Redondo'], ['alto', 'Cuello alto']]],
  ['cierre', 'Delante', [['cerrada', 'Cerrada'], ['cremallera', 'Cremallera'], ['media', 'Media cremallera']]],
  ['puno', 'Puños', [['elastico', 'Elástico'], ['ancho', 'Ancho'], ['pulgar', 'Con pulgar'], ['sin', 'Sin puño']]],
  ['bajo', 'Bajo', [['elastico', 'Cintura elástica'], ['recto', 'Recto'], ['cordon', 'Con cordón']]],
  ['bolsillo', 'Bolsillo', [['canguro', 'Canguro'], ['no', 'Sin bolsillo']]],
];
export const TIPO_ARRASTRE = 'text/x-drew-pieza';
// 17-10-2026 · el NOMBRE de la sudadera según sus piezas («Sudadera de cuello alto con cremallera»): se pone solo mientras ella no lo cambie
export function nombreSudadera(op = {}) {
  const c = op.cuelloTipo === 'alto' ? ' de cuello alto' : op.cuelloTipo === 'redondo' ? '' : ' con capucha', z = op.cierre === 'cremallera' ? 'cremallera' : op.cierre === 'media' ? 'media cremallera' : '';
  return 'Sudadera' + c + (z ? (c.startsWith(' con') ? ' y ' : ' con ') + z : '');
}
// el dibujito: la sudadera en gris y la parte elegida en el color de la marca (SVG en texto, 64 × 64)
export function icono(k, v) {
  const base = '<path class="b" d="M22 14 L13 18 L5 40 L11 42 L18 27 L18 56 L46 56 L46 27 L53 42 L59 40 L51 18 L42 14 Z"/>', A = s => '<g class="a">' + s + '</g>';
  let p = '';
  if (k === 'cuelloTipo') p = v === 'capucha' ? A('<path d="M22 15 C20 4 44 4 42 15 C38 19 26 19 22 15 Z"/>') : v === 'redondo' ? A('<path d="M24 14 C26 20 38 20 40 14" fill="none" stroke-width="3.2"/>') : A('<rect x="25" y="7" width="14" height="9" rx="2"/>');
  if (k === 'cierre') p = v === 'cerrada' ? A('<path d="M32 18 L32 54" fill="none" stroke-dasharray="1 4" stroke-width="1.6"/>') : v === 'cremallera' ? A('<path d="M32 17 L32 56" fill="none" stroke-width="2.6"/><rect x="29.5" y="21" width="5" height="6" rx="1"/>') : A('<path d="M32 17 L32 33" fill="none" stroke-width="2.6"/><rect x="29.5" y="30" width="5" height="6" rx="1"/>');
  if (k === 'puno') p = v === 'sin' ? A('<path d="M5 40 L11 42 M53 42 L59 40" fill="none" stroke-width="1.4" stroke-dasharray="2 2"/>') : A('<path d="M4.2 38 L11.6 40.6 L10.3 44.5 L3 42 Z M52.4 40.6 L59.8 38 L61 42 L53.7 44.5 Z"' + (v === 'ancho' ? ' transform="translate(0 0)" stroke-width="2"' : '') + '/>' + (v === 'ancho' ? '<path d="M3 42 L10.3 44.5 L9 48.5 L1.8 46 Z M53.7 44.5 L61 42 L62.2 46 L55 48.5 Z"/>' : '') + (v === 'pulgar' ? '<circle cx="7" cy="46.5" r="2"/><circle cx="57" cy="46.5" r="2"/>' : ''));
  if (k === 'bajo') p = v === 'elastico' ? A('<rect x="18" y="50" width="28" height="6" rx="1"/>') : v === 'recto' ? A('<path d="M18 53 L46 53" fill="none" stroke-width="1.4" stroke-dasharray="2 2"/>') : A('<path d="M18 51 L46 51" fill="none" stroke-width="1.6"/><path d="M28 52 C27 57 26 59 25 62 M36 52 C37 57 38 59 39 62" fill="none" stroke-width="1.6"/>');
  if (k === 'bolsillo') p = v === 'canguro' ? A('<path d="M22 38 L42 38 L45 50 L19 50 Z" fill-opacity="0.85"/>') : A('<path d="M22 38 L42 38 L45 50 L19 50 Z" fill="none" stroke-width="1.2" stroke-dasharray="2 2"/>');
  return '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">' + base + p + '</svg>';
}
// lo que se PINTA en el 3D sin estar en el patrón: la cremallera (entera o media) como una tira con dientes, en el centro del delantero
let texCremallera = null;
export function textura() {
  if (texCremallera || typeof document === 'undefined') return texCremallera; const c = document.createElement('canvas'), w = 32, h = 1024; c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#2b2b30'; g.fillRect(4, 0, w - 8, h); g.fillStyle = '#d4d4da'; for (let y = 0; y < h; y += 10) { g.fillRect(y % 20 ? 9 : 16, y, 7, 6); } g.fillStyle = '#9a9aa2'; g.fillRect(15, 0, 2, h);
  texCremallera = c.toDataURL('image/png'); return texCremallera;
}
// P = el proyecto (opciones y prenda) → [{ pieza, url, x, y, w, h, auto: true }] (y = centro desde el bajo de la pieza)
export function adornos(P) {
  if (!P || P.k !== 'sudadera' || !P.prenda) return []; const ci = P.opciones && P.opciones.cierre; if (ci !== 'cremallera' && ci !== 'media') return [];
  const pz = P.prenda.piezas.find(p => /^Delantero/.test(p.nombre)), cc = pz && pz.puntos && pz.puntos.cc; if (!cc) return []; const url = textura(); if (!url) return [];
  const h = ci === 'media' ? 200 : cc.y; return [{ id: 'auto-cremallera', pieza: 'Delantero', url, x: 0, y: cc.y - h / 2, w: 13, h, auto: true, nombre: 'Cremallera' }];
}
