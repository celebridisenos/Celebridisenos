// ================= v10 · Catálogo visual (foto grande, nombre y precio) =================
// Pensado para enseñar los productos: nada de tablas ni datos internos. Quien puede editar
// ve además el botón para abrir la ficha completa.
import { h, mount, icon, eur, empty, inp, debounce, btn } from '../ui.js';
import { S, can, byId } from '../store.js';
import { go } from '../app.js';
import { filesOf, previewUrl, lightbox } from '../files.js';
import { pState } from './productos.js';

const CL = window.CL;
const HIDDEN = ['Archivado', 'Retirado', 'Vendido'];
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); e.target._load && e.target._load(); } }), { rootMargin: '300px' }) : null;

export function render(el) {
  const st = { q: '', todos: false };
  const search = inp({ type: 'search', placeholder: 'Buscar en el catálogo…' });
  search.addEventListener('input', debounce(() => { st.q = search.value; draw(); }, 120));
  const chk = h('input', { type: 'checkbox', onchange: e => { st.todos = e.target.checked; draw(); } });
  const grid = h('div');
  el.append(h('div.page-head', h('h1', 'Catálogo'), can('productos.editar') ? btn('Nuevo producto', () => go('productos/nuevo'), { cls: 'primary', icon: 'plus' }) : null),
    h('div.row.wrap', { style: { marginBottom: '14px' } }, h('div.inp-icon.grow', icon('search', 's'), search), h('label.row.small', chk, 'Ver también vendidos y archivados')), grid);
  function draw() {
    const rows = S.t.productos.filter(p => (st.todos || !HIDDEN.includes(pState(p.estado))) && (!st.q || CL.matches([p.nombre, p.sku, p.categoria, p.color, p.material].join(' '), st.q)))
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    if (!rows.length) return mount(grid, h('div.card', empty('store', 'No hay productos para mostrar', 'Los productos archivados, retirados o vendidos no salen salvo que marques la casilla.')));
    mount(grid, h('div.catalogo', rows.map(card)));
  }
  function card(p) {
    const fotos = filesOf('productos', p.id).filter(a => a.tipo === 'foto');
    const main = (p.fotoId && byId('archivos', p.fotoId)) || fotos[0];
    const img = h('img', { alt: p.nombre, src: main && main.miniatura || '', class: main ? 'blur' : '', decoding: 'async' });
    const fig = h('figure.cat-foto', { onclick: () => fotos.length ? lightbox(main ? [main].concat(fotos.filter(a => a !== main)) : fotos, 0) : (can('productos.editar') && go('productos/' + p.id)) },
      main ? img : h('div.cat-vacia', icon('cube')), fotos.length > 1 ? h('span.mf-n', fotos.length + ' fotos') : null);
    if (main) { fig._load = () => previewUrl(main).then(u => { if (u) { const t = new Image(); t.onload = () => { img.src = u; img.classList.remove('blur'); }; t.src = u; } }).catch(() => { }); if (io) io.observe(fig); else fig._load(); }
    return h('div.cat-item', fig, h('div.cat-info', h('div.cat-nombre', p.nombre), h('div.row', h('b.cat-precio', p.precio ? eur(p.precio) : '—'), h('span.grow'),
      can('productos.editar') ? h('button.btn.ghost.sm', { onclick: () => go('productos/' + p.id), title: 'Abrir la ficha' }, 'Editar') : null)));
  }
  draw();
  return { update: draw };
}
