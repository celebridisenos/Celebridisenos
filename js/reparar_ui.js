// 🛠️ REPARAR POR FRAGILIDAD (01-11-2026, pedido por Biou): «hay muchos que se rompen; que analice qué partes son débiles y
// devuelva el STL más resistente». Pregunta si es decoración (se engorda la forma) o si tiene encajes (NO se toca la medida: se
// refuerza imprimiendo Fuerte). Usa repara.py (Blender+openvdb) por detrás; si falla, el programa sigue igual.
import { h, mount, modal, toast } from './ui.js';
import { desktop } from './desktop.js';
import { elegirAcabado } from './acabado_ui.js';
import { noSePuedeAqui } from './pieza_taller.js'; // 02-11-2026

// opts.remoto(modo) y opts.acabadoRemoto(imp, receta): hacerlo en la TORRE (02-11-2026: desde el portátil o la tablet no se podía)
export function repararFragilidad(ruta, nombre, opts = {}) {
  const remoto = typeof opts.remoto === 'function';
  if (!remoto && !desktop.on) return toast('Reparar por fragilidad se hace en el programa del PC.', 'warn', 6000);
  if (!remoto && !ruta) return toast('Necesito el STL guardado en el PC.', 'warn', 6000);
  const body = h('div');
  const md = modal('🛠️ Reparar por fragilidad', body, null, { size: 'wide' });

  async function decor() {
    md.close();
    if (remoto) return opts.remoto('decor');
    toast('Mirando la pieza y reforzando lo débil… puede tardar un par de minutos. No cierres el programa.', 'ok', 9000);
    try {
      const r = await desktop.repara(ruta, 'decor');
      const inf = (r && r.informe) || {};
      const pm = inf.pared_min_mm, nd = inf.vertices_debiles;
      toast('🛠️ Reforzado' + (pm ? ' (la pared más fina era ' + pm + ' mm' + (nd ? ', reforzados ' + nd + ' puntos' : '') + ')' : '') + '. Guardado en Documentos › CelebriDiseños_R8 como «…_reforzado.stl».', 'ok', 10000);
      if (r && r.archivo) setTimeout(() => { if (window.confirm) { } }, 0); // (no usamos confirm; el aviso de arriba dice dónde está)
    } catch (e) {
      if (opts.siNoAqui && noSePuedeAqui(e)) { toast('En este aparato no se puede (' + (e.message || e) + '): se lo encargo a la torre.', 'warn', 6000); return opts.siNoAqui('decor'); }
      toast('No se pudo reforzar: ' + (e.message || e), 'bad', 9000);
    }
  }
  function encaje() {
    md.close();
    toast('Con encaje NO te cambio la medida (si no, no encajaría). Lo abro con el acabado «Fuerte» para que salga más resistente.', 'ok', 8000);
    elegirAcabado(ruta, nombre, opts.acabadoRemoto ? (remoto ? { remoto: opts.acabadoRemoto } : { siNoAqui: opts.acabadoRemoto }) : {});
  }

  mount(body,
    nombre ? h('p.small.muted', 'Pieza: ' + nombre) : null,
    h('p', { style: { marginBottom: '10px' } }, '¿La pieza tiene agujeros, engranajes o encajes que tienen que entrar justos?'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '10px' } },
      h('button.alm2-tile', { type: 'button', style: { textAlign: 'left', padding: '14px' }, onclick: decor },
        h('b', { style: { display: 'block', marginBottom: '4px' } }, '🗿 Es decoración / figura'),
        h('span.small.muted', 'Le engordo lo fino para que no se rompa. Puede cambiar un poco la forma.')),
      h('button.alm2-tile', { type: 'button', style: { textAlign: 'left', padding: '14px' }, onclick: encaje },
        h('b', { style: { display: 'block', marginBottom: '4px' } }, '⚙️ Tiene encajes / agujeros'),
        h('span.small.muted', 'NO le cambio la medida (si no, no encaja): la refuerzo imprimiéndola «Fuerte».'))),
    h('p.tiny.muted', { style: { marginTop: '10px' } }, 'La verdad: reprocesar la forma mueve las medidas un poquito; por eso en las piezas de encaje no se toca.'));
}
