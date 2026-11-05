// ================= 02-11-2026 · CelebriMesa: el otro programa del mismo sistema =================
// Aquí se vende y se fabrica; allí se organiza y se crea. Las tareas de trabajo y las noticias están en los dos. Va en la torre, en su propio puerto.
import { h, mount, btn, toast } from '../ui.js';
import { desktop } from '../desktop.js';

const DIR = 'http://127.0.0.1:8870/';

// El vídeo del producto (voz + montaje) lo hace CelebriMesa. Aquí solo se abre su ficha: allí está el botón «Crear vídeo».
// No se manda nada entre programas: CelebriMesa lee el producto por su cuenta.
export function abrirVideoEnMesa(id) {
  return fetch(DIR + 'salud', { mode: 'no-cors' })
    .then(() => desktop.openUrl(DIR + '#/producto/' + encodeURIComponent('cd-' + id)))
    .catch(() => toast('CelebriMesa no está encendida en este ordenador. Va en la torre.', 'bad'));
}
export function render(el) {
  const estado = h('p.small.muted', 'Mirando si está abierta…');
  mount(el, h('div.card', h('h2', 'CelebriMesa'),
    h('p', 'Aquí vendes y fabricas. En CelebriMesa organizas y creas: tareas, páginas, anuncios, contenido y tus inventos. Las tareas de trabajo y las noticias están en los dos.'), estado,
    btn('Abrir CelebriMesa', () => desktop.openUrl(DIR).catch(e => toast(e.message, 'bad')), { cls: 'primary' })));
  fetch(DIR + 'salud', { mode: 'no-cors' }).then(() => { estado.textContent = 'Encendida en este ordenador.'; }).catch(() => { estado.textContent = 'No está encendida en este ordenador: ábrela con su icono.'; });
}
