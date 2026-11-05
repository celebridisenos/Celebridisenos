// 🎚️ SELECTOR DE ACABADO (01-11-2026, pedido por Biou): «como un Bambú pero en mi idioma, y que me lo abra ya configurado».
// Elige Rápido / Normal / Fino / Fuerte (e impresora) y abre la pieza en Bambu Studio con tu perfil puesto (sin tocar tus ajustes).
import { h, mount, modal, toast } from './ui.js';
import { desktop } from './desktop.js';
import { noSePuedeAqui } from './pieza_taller.js'; // 02-11-2026: si este aparato no puede, se encarga a la torre

const RECETAS = [
  ['rapido', '🏃 Rápido', 'Para probar. Se ven más las líneas.', 'capa 0,20 · 3 paredes · 15%'],
  ['normal', '⭐ Normal', 'El de cada día. Buen equilibrio.', 'capa 0,16 · 4 paredes · 40%'],
  ['fino', '💎 Fino', 'Muy liso y con detalle. Tarda más.', 'capa 0,12 · 5 paredes · 30%'],
  ['fuerte', '🛡️ Fuerte', 'Aguanta golpes. Piezas que sufren.', 'capa 0,20 · 5 paredes · 45%'],
];

// ruta = archivo (STL/3MF/OBJ/STEP) que está en el PC. nombre = para los avisos.
// opts.remoto(imp, receta) = hacerlo en la TORRE (portátil, tablet, móvil) · opts.siNoAqui(imp, receta) = si aquí falla, en la torre (02-11)
export function elegirAcabado(ruta, nombre, opts = {}) {
  const remoto = typeof opts.remoto === 'function';
  if (!remoto && !desktop.on) return toast('El acabado se prepara en el programa del PC.', 'warn', 6000);
  if (!remoto && !ruta) return toast('Para el acabado necesito el archivo guardado en el PC (ábrelo desde un producto con su STL).', 'warn', 7000);
  let imp = 'a1m';
  const body = h('div');
  const md = modal('🎚️ ¿Qué acabado quieres?', body, null, { size: 'wide' });
  const impSeg = h('div.row.wrap', { style: { gap: '8px', marginBottom: '12px' } },
    [['a1m', 'A1 mini'], ['p1p', 'P1P']].map(([k, t]) =>
      h('button.alm-chip' + (imp === k ? '.on' : ''), { type: 'button', 'data-k': k, onclick: () => { imp = k; [...impSeg.children].forEach(b => b.classList.toggle('on', b.dataset.k === k)); } }, t)));
  async function pick(rec) {
    md.close();
    if (remoto) return opts.remoto(imp, rec);
    toast('Preparando el acabado y abriendo Bambu Studio…', 'ok', 4000);
    try { await desktop.acabado(ruta, imp, rec); toast('🎚️ Abierto en Bambu con el acabado puesto. Sin AMS: los cambios de color se hacen con pausa.', 'ok', 7000); }
    catch (e) {
      if (typeof opts.siNoAqui === 'function' && noSePuedeAqui(e)) { toast('En este aparato no se puede (' + (e.message || e) + '): se lo encargo a la torre.', 'warn', 6000); return opts.siNoAqui(imp, rec); }
      toast('No se pudo preparar el acabado: ' + (e.message || e), 'bad', 8000);
    }
  }
  mount(body,
    h('p.small.muted', nombre ? 'Pieza: ' + nombre : ''),
    remoto ? h('p.small', '🖥️ Lo prepara la torre y se abre allí, en su Bambu Studio (desde aquí no se puede).') : null,
    h('p.small', 'Impresora:'), impSeg,
    h('div.alm2-tiles', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px' } },
      RECETAS.map(([k, t, d, n]) => h('button.alm2-tile', { type: 'button', style: { textAlign: 'left', padding: '12px' }, onclick: () => pick(k) },
        h('b.alm2-nom', { style: { display: 'block' } }, t),
        h('span.alm2-sub', { style: { display: 'block', margin: '4px 0' } }, d),
        h('span.alm2-u', n)))),
    h('p.tiny.muted', { style: { marginTop: '10px' } }, 'Usa el perfil de serie de esa impresora con los ajustes de la receta (comprobado con tu Bambu Studio). No toca tus ajustes de Bambu Studio.'));
}
