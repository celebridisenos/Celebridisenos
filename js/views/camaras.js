// ================= v11.7 · 📷 Cámaras: todas las Bambu Lab en grande =================
import { h, mount, btn, empty } from '../ui.js';
import { can } from '../store.js';
import { go } from '../app.js';
import { desktop } from '../desktop.js';
import { BAMBU } from '../bambu.js';
import { camTile, openCam } from '../camaras.js';

export function render(el) {
  const grid = h('div');
  el.append(h('div.page-head', h('div', h('h1', '📷 Cámaras'), h('div.muted.small', 'La cámara que ya lleva cada impresora, en directo por la red del taller. Pulsa una imagen para ampliarla.'))), grid);
  let sig = '';
  const draw = () => {
    if (!desktop.on) {
      mount(grid, empty('camera', 'Las cámaras se ven en el programa del PC', 'Están en la red local del taller: ábrelas desde CelebriDiseños en el ordenador.'));
      return;
    }
    const list = BAMBU.list;
    const s = list.map(b => b.serial).join(',');
    if (s === sig && grid.firstChild) return; // no rehacer las imágenes en cada actualización
    sig = s;
    if (!list.length) {
      mount(grid, empty('camera', 'No hay ninguna Bambu Lab vinculada en este ordenador', 'Vincula la P1P y la A1 mini en Impresión → Impresoras y Bambu Lab. Después aparecen aquí.',
        can('taller.ver') ? btn('Ir a Impresión', () => go('taller'), { cls: 'primary' }) : null));
      return;
    }
    mount(grid, h('div.cam-grid.big', list.map(b => { const t = camTile(b); t.querySelector('.cam-view').onclick = () => openCam(b.serial); return t; })),
      h('div.card.flat', { style: { marginTop: '14px' } }, h('b.small', 'Si una cámara no se ve'),
        h('ul.small.muted', h('li', 'Comprueba que la impresora está encendida y en la misma red que este ordenador.'),
          h('li', 'En la pantalla de la impresora, activa la vista en directo por red local («LAN Only Liveview» o «Liveview»; según la versión está en los ajustes de red o en los generales).'),
          h('li', 'Usa el mismo código de acceso que para ver su estado: si el estado funciona, el código está bien.'),
          h('li', 'Solo se conecta mientras miras la imagen: no carga la impresora el resto del tiempo.'))));
  };
  draw();
  return { update: draw };
}
