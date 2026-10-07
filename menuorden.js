// ================= v13.10 · MENÚ LATERAL A GUSTO DEL ADMINISTRADOR =================
// El orden y los apartados ocultos se guardan en el servidor (config «menu») y valen para todo el equipo.
// · Sin cambios: el menú de siempre (con sus separadores).
// · Con orden propio: primero los apartados en el orden elegido y después, en su sitio de siempre, los que aún no estén
//   en la lista (por ejemplo, los que traigan versiones nuevas). Ocultar NO quita permisos: se entra por su dirección.
import { h, mount, btn, modal, toast, icon } from './ui.js';
import { S, api, emit, can } from './store.js';

const NO_OCULTAR = ['inicio', 'config'];
export const menuCfg = () => { const m = (S.cfg && S.cfg.menu) || {}; return { orden: Array.isArray(m.orden) ? m.orden : [], ocultos: Array.isArray(m.ocultos) ? m.ocultos : [] }; };
export const menuPersonal = () => { const m = menuCfg(); return !!(m.orden.length || m.ocultos.length); };

// Devuelve la lista para pintar (con separadores solo si el orden es el de siempre)
export function menuNav(NAV) {
  const m = menuCfg(), oc = new Set(m.ocultos.filter(k => !NO_OCULTAR.includes(k)));
  if (!m.orden.length) return NAV.filter(n => n.sep || !oc.has(n.k)).filter((n, i, a) => !(n.sep && (i === a.length - 1 || (a[i + 1] && a[i + 1].sep))));
  return ordenados(NAV, m.orden).filter(n => !oc.has(n.k));
}
function ordenados(NAV, orden) {
  const items = NAV.filter(n => !n.sep), pos = new Map(orden.map((k, i) => [k, i]));
  const dentro = items.filter(n => pos.has(n.k)).sort((a, b) => pos.get(a.k) - pos.get(b.k));
  const fuera = items.filter(n => !pos.has(n.k));
  // los que no estaban en la lista entran justo detrás del apartado que tenían delante en el menú de siempre
  const out = dentro.slice();
  fuera.forEach(n => { const i = items.indexOf(n); let j = -1; for (let x = i - 1; x >= 0 && j < 0; x--) j = out.indexOf(items[x]); out.splice(j + 1, 0, n); });
  return out;
}

export function editarMenu(NAV, visible, alGuardar) {
  if (!can('config.editar')) { toast('Solo quien administra puede ordenar el menú.', 'warn'); return; }
  const m = menuCfg();
  let lista = (m.orden.length ? ordenados(NAV, m.orden) : NAV.filter(n => !n.sep)).filter(n => visible(n) || m.ocultos.includes(n.k));
  const ocultos = new Set(m.ocultos);
  const box = h('div.mo-lista');
  let arrastre = -1;
  const mover = (i, d) => { const j = i + d; if (j < 0 || j >= lista.length) return; const x = lista[i]; lista[i] = lista[j]; lista[j] = x; pintar(); const b = box.children[j] && box.children[j].querySelector(d < 0 ? '.mo-up' : '.mo-down'); if (b && !b.disabled) b.focus(); };
  const pintar = () => mount(box, lista.map((n, i) => {
    const oculto = ocultos.has(n.k), fijo = NO_OCULTAR.includes(n.k);
    const fila = h('div.mo-fila' + (oculto ? '.oculto' : ''), { draggable: 'true', dataset: { k: n.k },
      ondragstart: e => { arrastre = i; fila.classList.add('arr'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', n.k); } catch (x) { } },
      ondragend: () => fila.classList.remove('arr'),
      ondragover: e => { e.preventDefault(); fila.classList.add('sobre'); },
      ondragleave: () => fila.classList.remove('sobre'),
      ondrop: e => { e.preventDefault(); fila.classList.remove('sobre'); if (arrastre < 0 || arrastre === i) return; const [x] = lista.splice(arrastre, 1); lista.splice(i, 0, x); arrastre = -1; pintar(); } },
      h('span.mo-asa', { title: 'Arrastra para mover', 'aria-hidden': 'true' }, '⠿'), icon(n.i || 'dot', 's'), h('span.mo-t', n.t), oculto ? h('span.mo-tag', 'oculto') : null,
      h('button.btn.ghost.icon.sm.mo-up', { type: 'button', title: 'Subir', 'aria-label': 'Subir ' + n.t, disabled: i === 0, onclick: () => mover(i, -1) }, '▲'),
      h('button.btn.ghost.icon.sm.mo-down', { type: 'button', title: 'Bajar', 'aria-label': 'Bajar ' + n.t, disabled: i === lista.length - 1, onclick: () => mover(i, 1) }, '▼'),
      fijo ? h('span.mo-fijo', { title: 'Este apartado siempre se ve' }, '🔒') :
        h('button.btn.ghost.sm.mo-ver', { type: 'button', title: oculto ? 'Volver a mostrarlo' : 'Ocultarlo del menú', onclick: () => { if (oculto) ocultos.delete(n.k); else ocultos.add(n.k); pintar(); } }, oculto ? '🙈 Mostrar' : '👁 Ocultar'));
    return fila;
  }));
  pintar();
  const guardar = async (restablecer) => {
    try {
      S.cfg = await api('menu.guardar', restablecer ? { restablecer: true } : { orden: lista.map(n => n.k), ocultos: [...ocultos] });
      emit(); try { alGuardar && alGuardar(); } catch (x) { } toast(restablecer ? 'Menú como venía de serie' : 'Menú guardado para todo el equipo', 'ok'); dlg.close();
    } catch (e) { toast(e.message || 'No se pudo guardar', 'bad'); }
  };
  const dlg = modal('↕️ Ordenar el menú',
    h('div', h('p.small.muted', 'Arrastra los apartados, o usa ▲ ▼, para ponerlos a tu gusto. Con «Ocultar» desaparecen del menú de todo el equipo, pero no se borra nada y siguen funcionando.'), box),
    [btn('Volver al de siempre', () => guardar(true), { cls: 'ghost' }), h('div.grow'), btn('Cancelar', () => dlg.close()), btn('Guardar para todos', () => guardar(false), { cls: 'primary' })], { cls: 'mo-dlg' });
  return dlg;
}
