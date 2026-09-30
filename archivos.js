// ================= Archivos: todo en un sitio, vinculado a su ficha =================
import { h, mount, icon, btn, modal, toast, empty, field, inp, sel, debounce, bytes, ago } from '../ui.js';
import { S, can, byId } from '../store.js';
import { go } from '../app.js';
import { dropZone, openFile, RULES } from '../files.js';

const CL = window.CL;
const ENT = { productos: 'Producto', pedidos: 'Pedido', clientes: 'Cliente', noticias: 'Noticia', redes: 'Redes', usuarios: 'Usuario' };
function linkOf(a) {
  if (!a.entidad || !a.entidadId) return null;
  const x = byId(a.entidad, a.entidadId);
  const name = !x ? '(ya no existe)' : a.entidad === 'pedidos' ? 'nº ' + x.numero + ' · ' + x.cliente : x.nombre || x.titulo || x.id;
  const path = { productos: 'productos/', pedidos: 'pedidos/', clientes: 'clientes/', noticias: 'noticias/', redes: 'redes/' }[a.entidad];
  return { t: (ENT[a.entidad] || a.entidad) + ': ' + name, path: path && x ? path + a.entidadId : null };
}

export function render(el, params) {
  const st = { q: '', tipo: '', ent: '', limit: 120 };
  const search = inp({ type: 'search', placeholder: 'Buscar por nombre de archivo…' });
  search.addEventListener('input', debounce(() => { st.q = search.value; draw(); }, 120));
  const fTipo = sel([{ v: '', t: 'Todos los tipos' }].concat(Object.keys(RULES).map(k => ({ v: k, t: RULES[k].t }))), '');
  const fEnt = sel([{ v: '', t: 'Vinculados a cualquier cosa' }].concat(Object.keys(ENT).map(k => ({ v: k, t: ENT[k] }))).concat([{ v: '_none', t: 'Sin vincular' }]), '');
  [fTipo, fEnt].forEach(x => x.addEventListener('change', () => { st.tipo = fTipo.value; st.ent = fEnt.value; draw(); }));
  const sum = h('div.grid.kpis', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', marginBottom: '14px' } });
  const box = h('div');
  el.append(h('div.page-head', h('h1', 'Archivos'), can('archivos.subir') ? btn('Subir archivos', upload, { cls: 'primary', icon: 'upload' }) : null),
    sum, h('div.row.wrap', { style: { marginBottom: '14px' } }, h('div.inp-icon.grow', icon('search', 's'), search), h('div', { style: { width: '190px' } }, fTipo), h('div', { style: { width: '230px' } }, fEnt)), box);
  function draw() {
    const all = S.t.archivos.filter(a => a.entidad !== 'usuarios'); // v10: las fotos de perfil no son archivos del equipo
    mount(sum, Object.keys(RULES).map(k => { const l = all.filter(a => a.tipo === k); return h('button.kpi' + (st.tipo === k ? '.on' : ''), { onclick: () => { st.tipo = st.tipo === k ? '' : k; fTipo.value = st.tipo; draw(); } }, h('span.n', String(l.length)), h('span.l', RULES[k].t + ' · ' + bytes(l.reduce((s, a) => s + (Number(a.tamano) || 0), 0)))); }));
    const rows = all.filter(a => (!st.tipo || a.tipo === st.tipo) && (!st.ent || (st.ent === '_none' ? !a.entidadId : a.entidad === st.ent)) && (!st.q || CL.matches(a.nombre + ' ' + (linkOf(a) || {}).t, st.q)))
      .sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
    if (!all.length) return mount(box, h('div.card', empty('folder', 'Todavía no hay archivos', 'Las fotos, vídeos y STL que adjuntéis a productos, pedidos, clientes o noticias aparecerán aquí.')));
    if (!rows.length) return mount(box, h('div.card', empty('search', 'Nada con estos filtros')));
    mount(box, h('div.gallery', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' } }, rows.slice(0, st.limit).map(a => {
      const l = linkOf(a);
      return h('div', h('div.g', { onclick: () => openFile(a), title: a.nombre }, a.miniatura ? h('img', { src: a.miniatura, alt: '', loading: 'lazy' }) : h('div', { style: { display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)' } }, icon(RULES[a.tipo] ? RULES[a.tipo].i : 'file', 'l')), h('span.ty', RULES[a.tipo] ? RULES[a.tipo].s : a.tipo)),
        h('div.small.bold.ellipsis', { style: { marginTop: '6px' }, title: a.nombre }, a.nombre),
        h('div.tiny.muted.ellipsis', bytes(Number(a.tamano) || 0) + ' · ' + ago(a.creado) + (a.driveId ? '' : ' · solo en el PC')),
        l ? (l.path ? h('a.tiny.ellipsis', { href: '#/' + l.path, style: { display: 'block' } }, l.t) : h('div.tiny.muted.ellipsis', l.t)) : h('div.tiny.muted', 'Sin vincular'));
    })), rows.length > st.limit ? h('div.pager', btn('Mostrar más', () => { st.limit += 240; draw(); })) : null);
  }
  function upload() {
    const ent = sel([{ v: '', t: 'Sin vincular (lo vinculo después)' }, { v: 'pedidos', t: 'Un pedido' }, { v: 'productos', t: 'Un producto' }, { v: 'clientes', t: 'Un cliente' }], '');
    const target = h('select.inp');
    const fillT = () => {
      const list = ent.value === 'pedidos' ? S.t.pedidos.slice().reverse().map(o => ({ v: o.id, t: 'nº ' + o.numero + ' · ' + o.cliente })) : ent.value === 'productos' ? S.t.productos.map(p => ({ v: p.id, t: p.nombre })) : ent.value === 'clientes' ? S.t.clientes.map(c => ({ v: c.id, t: c.nombre })) : [];
      mount(target, list.map(x => h('option', { value: x.v }, x.t)));
      target.disabled = !list.length;
    };
    ent.addEventListener('change', fillT); fillT();
    const zones = ['foto', 'video', 'stl', 'doc'].map(t => dropZone(t));
    modal('Subir archivos', h('div.col', h('div.form', field('Vincular a', ent), field('¿Cuál?', target)), h('div.drops', { style: { gridTemplateColumns: 'repeat(2, minmax(0,1fr))' } }, zones.map(z => z.el))), close => [btn('Cerrar', close), btn('Subir', async ev => {
      const b = ev.target.closest('button'); b.disabled = true; b.textContent = 'Subiendo…';
      try { for (const z of zones) await z.uploadAll(ent.value, ent.value ? target.value : ''); if (zones.some(z => z.hasErrors())) toast('Algunos archivos no se pudieron subir', 'warn'); else { toast('Archivos subidos', 'ok'); close(); } }
      finally { b.disabled = false; b.textContent = 'Subir'; }
    }, { cls: 'primary', icon: 'upload' })], { size: 'wide' });
  }
  function applyParams(p) {
    const id = (p || []).find(x => x && !x.startsWith('?')) || '';
    draw();
    if (id === 'subir') { history.replaceState(null, '', '#/archivos'); if (can('archivos.subir')) upload(); }
    else if (id) { history.replaceState(null, '', '#/archivos'); const a = byId('archivos', id); if (a) openFile(a); }
  }
  applyParams(params);
  return { params: applyParams, update: draw };
}
