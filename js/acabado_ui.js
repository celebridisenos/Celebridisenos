// 🎚️ ABRIR EN BAMBU CON EL ACABADO PUESTO (01-11-2026; rehecho el 10-11-2026, pedido por Biou)
// Él (10-11): «que cada producto, cuando se vaya a abrir en Bambu, me pregunte cómo quieres el acabado: premium top, impresión rápida,
// de prueba, normal, de máxima calidad; que ya esté automáticamente, que configure el perfil listo para imprimir, seleccionar la
// impresora; ahora tenemos la A1 también». Dos preguntas, una debajo de otra, y un botón grande:
//   1 · ¿Qué acabado?  (Prueba · Rápida · Normal · Máxima calidad · Premium top)
//   2 · ¿En qué impresora?  (A1 mini · P1P · A1 NUEVA — las tres SIN AMS; la que no cabe, tachada)
//   → «Abrir en Bambu listo para imprimir»: la torre saca un proyecto de SU Bambu con capa, paredes, relleno, impresora y placa ya
//     puestas (desktop/host/acabado.go) y lo abre. Desde el cotizador llegan también el TAMAÑO y la FUERZA presupuestados.
import { h, mount, modal, toast } from './ui.js';
import { desktop } from './desktop.js';
import { noSePuedeAqui } from './pieza_taller.js'; // 02-11-2026: si este aparato no puede, se encarga a la torre
import { ACABADOS, IMPRESORAS, cabeEn, acabadoPorK, impPorK, recordar, recordado } from './cotizar.js';

const coma = v => String(v).replace('.', ',');
export const ajustesTxt = (a, extra = {}) => 'capa ' + coma(a.capa) + ' · ' + (extra.paredes || a.paredes) + ' paredes · ' + (extra.relleno || a.relleno) + ' %' + (a.planchado ? ' · planchado' : '');

// dibujito de impresora (cama + pórtico), en el color de cada una
export function dibujoImpresora(k) {
  const I = impPorK(k), c = I.color, ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 64 52'); s.setAttribute('class', 'ab-imp-svg'); s.setAttribute('aria-hidden', 'true');
  const caja = k === 'p1p'; // la P1P es una caja; las A1, de pórtico abierto
  s.innerHTML = caja
    ? '<rect x="8" y="4" width="48" height="44" rx="5" fill="' + c + '" opacity=".18" stroke="' + c + '" stroke-width="3"/><rect x="16" y="34" width="32" height="5" rx="2" fill="' + c + '"/><rect x="26" y="14" width="12" height="9" rx="2" fill="' + c + '"/><line x1="12" y1="14" x2="52" y2="14" stroke="' + c + '" stroke-width="3"/>'
    : '<rect x="' + (k === 'a1m' ? 14 : 6) + '" y="40" width="' + (k === 'a1m' ? 36 : 52) + '" height="6" rx="2" fill="' + c + '"/><rect x="' + (k === 'a1m' ? 46 : 52) + '" y="6" width="5" height="40" rx="2" fill="' + c + '"/><line x1="' + (k === 'a1m' ? 12 : 4) + '" y1="16" x2="' + (k === 'a1m' ? 50 : 56) + '" y2="16" stroke="' + c + '" stroke-width="3"/><rect x="24" y="12" width="12" height="11" rx="2" fill="' + c + '"/>';
  return s;
}

// ruta = archivo (STL/3MF/OBJ/STEP) que está en el PC. nombre = para los avisos.
// opts.remoto(imp, receta, extra) = hacerlo en la TORRE (portátil, tablet, móvil) · opts.siNoAqui(imp, receta, extra) = si aquí falla, en la torre
// opts.medidas {x,y,z} mm (al 100 %) para tachar la impresora en la que no cabe · opts.escala (%) · opts.paredes · opts.relleno (del cotizador)
// opts.acabado / opts.imp = lo ya elegido · opts.talCual() = «abrirlo sin tocar nada» · opts.titulo
export function elegirAcabado(ruta, nombre, opts = {}) {
  const remoto = typeof opts.remoto === 'function';
  if (!remoto && !desktop.on) return toast('El acabado se prepara en el programa del PC.', 'warn', 6000);
  if (!remoto && !ruta) return toast('Para el acabado necesito el archivo guardado en el PC (ábrelo desde un producto con su STL).', 'warn', 7000);
  const esc = Number(opts.escala) > 0 ? Number(opts.escala) : 100;
  const med = opts.medidas && Number(opts.medidas.x) > 0 ? { x: opts.medidas.x * esc / 100, y: opts.medidas.y * esc / 100, z: opts.medidas.z * esc / 100 } : null;
  const caben = IMPRESORAS.filter(I => !med || cabeEn(I, med));
  let rec = acabadoPorK(opts.acabado || recordado('acabado') || 'normal').k;
  let imp = opts.imp && caben.some(I => I.k === opts.imp) ? opts.imp : (caben.find(I => I.k === recordado('imp')) || caben[0] || IMPRESORAS[0]).k;
  const extra = { v: 2 }; if (esc !== 100) extra.escala = esc; if (opts.paredes) extra.paredes = opts.paredes; if (opts.relleno) extra.relleno = opts.relleno;
  const body = h('div.ab');
  const md = modal(opts.titulo || '🖨️ Abrir en Bambu', body, null, { size: 'wide' });
  const tiles = h('div.ab-acab'), imps = h('div.ab-imps'), resumen = h('div.ab-resumen');
  function pinta() {
    mount(tiles, ACABADOS.map(a => h('button.ab-tile' + (rec === a.k ? '.on' : ''), { type: 'button', 'data-k': a.k, style: '--c:' + a.color, onclick: () => { rec = a.k; pinta(); } },
      h('span.ab-e', a.e), h('b.ab-nom', a.nombre), h('span.ab-para', a.para), h('span.ab-aj', ajustesTxt(a, extra)), h('span.ab-t', a.tiempo))));
    mount(imps, IMPRESORAS.map(I => {
      const no = med && !cabeEn(I, med);
      return h('button.ab-imp' + (imp === I.k ? '.on' : '') + (no ? '.no' : ''), { type: 'button', 'data-k': I.k, style: '--c:' + I.color, disabled: no, title: no ? 'No cabe: la pieza mide más que su cama' : '', onclick: () => { imp = I.k; pinta(); } },
        dibujoImpresora(I.k), h('b', I.nombre, I.nueva ? h('em.ab-nueva', 'NUEVA') : null), h('span.ab-cama', no ? '⛔ No cabe' : 'cama ' + coma(I.x / 10) + ' cm'));
    }));
    const a = acabadoPorK(rec), I = impPorK(imp);
    mount(resumen, h('span', a.e + ' ' + a.nombre + ' · ' + I.nombre + (esc !== 100 ? ' · tamaño ' + esc + ' %' : '') + (opts.paredes || opts.relleno ? ' · reforzada' : '')), h('span.tiny.muted', ajustesTxt(a, extra) + ' · placa texturizada · sin AMS: los colores, con pausa'));
  }
  async function abrir() {
    md.close();
    recordar('acabado', rec); recordar('imp', imp);
    const a = acabadoPorK(rec), I = impPorK(imp);
    if (remoto) return opts.remoto(imp, rec, extra);
    toast('Preparando «' + a.nombre + '» para la ' + I.nombre + ' y abriendo Bambu Studio…', 'ok', 5000);
    try {
      const r = await desktop.acabado(ruta, imp, rec, extra);
      window.__acabadoAbierto = r || null;
      toast('🖨️ Abierto en Bambu: ' + a.nombre + ' en la ' + I.nombre + ', listo para laminar. Sin AMS: los cambios de color, con pausa.', 'ok', 8000);
    } catch (e) {
      if (typeof opts.siNoAqui === 'function' && noSePuedeAqui(e)) { toast('En este aparato no se puede (' + (e.message || e) + '): se lo encargo a la torre.', 'warn', 6000); return opts.siNoAqui(imp, rec, extra); }
      toast('No se pudo preparar el acabado: ' + (e.message || e), 'bad', 8000);
    }
  }
  pinta();
  mount(body,
    nombre ? h('p.ab-pieza', '📦 ' + nombre + (esc !== 100 ? ' · al ' + esc + ' %' : '')) : null,
    remoto ? h('p.small.ab-remoto', '🖥️ Lo prepara la torre y se abre allí, en su Bambu Studio.') : null,
    h('h3.ab-paso', h('i', '1'), '¿Qué acabado?'), tiles,
    h('h3.ab-paso', h('i', '2'), '¿En qué impresora?'), imps,
    resumen,
    h('div.ab-pie', h('button.btn.primary.ab-abrir', { type: 'button', onclick: abrir }, '🖨️ Abrir en Bambu listo para imprimir'),
      typeof opts.talCual === 'function' ? h('button.btn.ghost.sm.ab-talcual', { type: 'button', onclick: () => { md.close(); opts.talCual(); } }, 'Abrirlo tal cual, sin tocar nada') : null),
    h('p.tiny.muted.ab-nota', 'Usa el perfil de serie de esa impresora con estos ajustes (probado con tu Bambu Studio: 0 avisos). No cambia nada de tu Bambu Studio.'));
  return md;
}
