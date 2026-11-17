// ================= 📸 MIS FOTOS DE PRODUCTOS (14-11-2026) =================
// Biou (06-11): «todas las fotos de celebri productos en una carpeta, con un botón… así ChatGPT puede subir productos… y que siempre
// quede automatizado». La carpeta CELEBRIDISENOS\FOTOS_DE_MIS_PRODUCTOS (la rehace sola el motor de CelebriMesa cada 20 minutos) tiene un
// `indice.json`. Esta pantalla SOLO LEE esa carpeta (nunca escribe en ella): enseña una tarjeta por producto con su foto, deja ver todas
// las de cada uno, abrir su carpeta y usar una en la ficha del producto del programa. Solo en el PC (en el móvil no hay carpeta).
import { h, mount, btn, toast, modal, empty } from '../ui.js';
import { S, can, byId } from '../store.js';
import { desktop } from '../desktop.js';
import { go } from '../app.js';
import { uploadFile } from '../files.js';

const CL = window.CL;
export const CARPETA = 'FOTOS_DE_MIS_PRODUCTOS';
// de más a menos «de verdad»: la portada de cada tarjeta es la primera que haya en este orden
const ORDEN = ['real', 'ia', 'foto', 'celebrimesa', 'render', 'explica', 'captura'];
const TIPO = { real: ['📷', 'Foto real'], ia: ['🤖', 'Hecha con IA'], render: ['🧊', 'Dibujo 3D'], explica: ['📐', 'Explica'], captura: ['🖼️', 'Captura'], celebrimesa: ['🎨', 'CelebriMesa'], foto: ['📷', 'Foto'] };
const SECCION = { '1_MIS_DISENOS': 'Mis diseños', '2_CATALOGO_DEL_PROGRAMA': 'Catálogo', '3_NUEVOS_SIN_PUBLICAR': 'Nuevos' };
const sinBarra = r => String(r || '').replace(/\//g, '\\');
export const portada = p => (p.fotos || []).slice().sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo))[0] || null;
export const soloDibujo = p => !(p.fotos || []).some(f => ['real', 'ia', 'foto', 'celebrimesa'].includes(f.tipo));

export function render(el) {
  const st = { raiz: '', ind: null, filtro: 'todos', q: '', error: '' };
  const rejilla = h('div.fm-grid'), resumen = h('div.fm-res'), chips = h('div.fm-chips');
  const buscar = h('input.inp.fm-q', { type: 'search', placeholder: 'Buscar un producto…', 'aria-label': 'Buscar un producto', oninput: e => { st.q = e.target.value; pinta(); } });
  el.append(h('div.page-head', h('div', h('h1', '📸 Mis fotos de productos'), h('div.muted.small', 'Todas las fotos de tus productos, ordenadas. Toca una para verlas y usarlas.'))), resumen, h('div.fm-barra', buscar, chips), rejilla);
  const url = rel => desktop.fileUrl(st.raiz + '\\' + sinBarra(rel));

  async function carga() {
    if (!desktop.on) { st.error = 'sin-pc'; return pinta(); }
    try {
      const root = await desktop.getConfig('productRoot');
      if (!root) { st.error = 'sin-raiz'; return pinta(); }
      st.raiz = root.replace(/[\\/]+$/, '') + '\\' + CARPETA;
      // (no desktop.file: un .json vuelve como JSON ya leído; con fetch a la dirección local se lee como texto)
      const r = await fetch(desktop.fileUrl(st.raiz + '\\indice.json'), { cache: 'no-store' }); if (!r.ok) throw new Error('no está el índice');
      st.ind = JSON.parse(await r.text());
    } catch (e) { st.error = 'sin-indice'; st.msg = e.message || String(e); }
    pinta();
  }
  function lista() {
    const q = CL.norm(st.q);
    return ((st.ind && st.ind.productos) || []).filter(p => (st.filtro === 'todos' || (st.filtro === 'dibujo' ? soloDibujo(p) : p.seccion === st.filtro)) && (!q || CL.norm(p.nombre).includes(q)));
  }
  function pinta() {
    if (st.error) {
      const m = { 'sin-pc': ['💻', 'Esto solo se ve en el programa del PC', 'Las fotos están en una carpeta de la torre. En el móvil no se pueden abrir.'], 'sin-raiz': ['📁', 'Falta decir dónde está tu carpeta de CelebriDiseños', 'Ve a Configuración → «Carpeta de productos» y elígela.'],
        'sin-indice': ['🔍', 'No encuentro la carpeta de fotos', 'Busco «' + CARPETA + '» dentro de tu carpeta de productos. La rehace sola CelebriMesa (o el motor actualizar_fotos.py). ' + (st.msg || '')] }[st.error];
      mount(resumen, null); mount(chips, null); return mount(rejilla, empty('image', m[1], m[2]));
    }
    if (!st.ind) { mount(rejilla, h('p.muted', 'Abriendo tus fotos…')); return; }
    const R = st.ind.resumen || {}, P = st.ind.productos || [], nDib = P.filter(soloDibujo).length;
    mount(resumen, h('div.fm-num', h('b', String(P.length)), h('span', 'productos')), h('div.fm-num', h('b', String(R.fotos || P.reduce((a, p) => a + (p.n_fotos || 0), 0))), h('span', 'fotos')), h('div.fm-num' + (nDib ? '.aviso' : ''), h('b', String(nDib)), h('span', 'solo con dibujo 3D')),
      R.actualizado ? h('div.fm-act', 'Puesta al día: ' + R.actualizado) : null, btn('Abrir la carpeta', () => desktop.open(st.raiz).catch(e => toast(e.message, 'bad')), { cls: 'sm', icon: 'folder' }));
    const F = [['todos', 'Todos'], ['1_MIS_DISENOS', 'Mis diseños'], ['2_CATALOGO_DEL_PROGRAMA', 'Catálogo'], ['3_NUEVOS_SIN_PUBLICAR', 'Nuevos'], ['dibujo', 'Solo dibujo 3D']];
    mount(chips, F.map(([k, t]) => h('button.fm-chip' + (st.filtro === k ? '.on' : ''), { type: 'button', 'data-f': k, onclick: () => { st.filtro = k; pinta(); } }, t)));
    const L = lista();
    mount(rejilla, L.length ? L.map((p, i) => tarjeta(p, i)) : empty('image', 'Nada con ese nombre', 'Prueba con otra palabra o quita el filtro.'));
  }
  function tarjeta(p, i) {
    const f = portada(p), t = f ? (TIPO[f.tipo] || TIPO.foto) : null;
    return h('button.fm-t', { type: 'button', 'data-nombre': p.nombre, style: { '--i': Math.min(i, 24) }, title: p.n_fotos + ' fotos', onclick: () => ver(p) },
      f ? h('img', { src: url(f.mini || f.ruta), alt: 'Foto de ' + p.nombre, loading: 'lazy' }) : h('span.fm-sin', '🖼️'),
      h('b.fm-n', p.nombre), h('span.fm-pie', t ? h('span.fm-tipo.' + f.tipo, t[0] + ' ' + t[1]) : null, h('span.fm-cuenta', String(p.n_fotos || (p.fotos || []).length) + ' fotos')));
  }
  // el producto del programa que se llama igual (para «usar en la ficha»)
  const delPrograma = p => { const k = CL.norm(p.nombre); return (S.t.productos || []).filter(x => CL.norm(x.nombre) === k); };
  function ver(p) {
    const coincide = delPrograma(p); let elegido = coincide.length === 1 ? coincide[0].id : '';
    const sel = h('select.inp.fm-sel', { 'aria-label': 'Producto del programa', onchange: e => { elegido = e.target.value; refresca(); } }, h('option', { value: '' }, coincide.length ? 'Elige cuál…' : 'Elige el producto del programa…'),
      (coincide.length ? coincide : (S.t.productos || []).slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))).map(x => h('option', { value: x.id, selected: x.id === elegido }, x.nombre)));
    const usar = [];
    const grande = h('div.fm-fotos', (p.fotos || []).map(f => {
      const t = TIPO[f.tipo] || TIPO.foto;
      const b = btn('Usar en la ficha', async ev => {
        if (!elegido) return toast('Elige primero el producto del programa.', 'warn');
        const x = ev.currentTarget; x.disabled = true;
        try {
          const buf = await (await fetch(desktop.fileUrl(st.raiz + '\\' + sinBarra(f.estandar || f.ruta)))).arrayBuffer(), nom = String(f.archivo || 'foto.jpg');
          await uploadFile(new File([buf], nom, { type: /\.png$/i.test(nom) ? 'image/png' : 'image/jpeg' }), { entidad: 'productos', entidadId: elegido });
          toast('📎 Foto guardada en la ficha de «' + (byId('productos', elegido) || {}).nombre + '»', 'ok', 5000);
        } catch (e) { toast('No se pudo guardar: ' + (e.message || e), 'bad', 8000); }
        x.disabled = false;
      }, { cls: 'sm primary fm-usar', title: 'Guarda esta foto en el producto del programa' });
      usar.push(b);
      return h('figure.fm-f', { 'data-tipo': f.tipo }, h('img', { src: url(f.mini || f.ruta), alt: f.archivo, loading: 'lazy', onclick: () => window.open(desktop.fileUrl(st.raiz + '\\' + sinBarra(f.estandar || f.ruta)), '_blank', 'noopener') }),
        h('figcaption', h('span.fm-tipo.' + f.tipo, t[0] + ' ' + t[1]), can('archivos.subir') ? b : null));
    }));
    const refresca = () => usar.forEach(b => { b.title = elegido ? 'Guarda esta foto en «' + ((byId('productos', elegido) || {}).nombre || '') + '»' : 'Elige antes el producto'; });
    modal('📸 ' + p.nombre, h('div.fm-dlg', h('div.fm-sec', SECCION[p.seccion] || '', coincide.length > 1 ? ' · hay ' + coincide.length + ' productos con este nombre' : ''),
      can('archivos.subir') ? h('div.row.fm-elige', h('span.small', 'Ficha del programa:'), sel) : null, grande),
    close => [btn('Abrir su carpeta', () => desktop.open(st.raiz + '\\' + sinBarra(p.carpeta)).catch(e => toast(e.message, 'bad')), { icon: 'folder' }), coincide.length === 1 ? btn('Ir a su ficha', () => { close(); go('productos/' + coincide[0].id); }, { cls: 'ghost' }) : null, btn('Cerrar', close, { cls: 'primary' })], { size: 'wide' });
    refresca();
  }
  carga();
  return {};
}
