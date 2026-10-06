// ================= v15.4 · BIOUVISION · 🖼️ MIS FOTOS =================
// Las fotos restauradas y recortadas de este aparato (las 40 últimas). Al abrir una: antes / después, descargar,
// a la biblioteca del negocio, a Instagram, retocar en el Estudio o borrarla (solo de aquí; la original nunca se toca).
import { h, mount, toast, confirmDlg } from '../ui.js';
import { comparador } from './comparar.js';
import { listarObras, obra, borrarObra } from './obras.js';

const TIPO = { restaurada: ['🕰️', 'Restaurada'], recorte: ['✂️', 'Sin fondo'], estudio: ['🎨', 'Retocada'] };
const FILTROS = [['', 'Todas'], ['restaurada', '🕰️ Restauradas'], ['recorte', '✂️ Sin fondo']];
const fecha = iso => { try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

export function pantallaFotos(el, C) {
  let filtro = '', visor = null;
  const lista = h('div');
  mount(el, h('div.bv-top', h('div.grow', h('h1.bv-h2', '🖼️ Mis fotos'), h('p.bv-sub', { style: { margin: 0 } }, 'Todo lo que has hecho en Biouvision en este aparato. Pulsa una para verla, descargarla o compartirla.'))), lista);

  async function refrescar() {
    const todas = await listarObras(), ver = todas.filter(o => !filtro || o.tipo === filtro);
    if (!todas.length) return mount(lista, h('div.bv-vacio.bv-vidrio', h('div.ic', '🖼️'), h('h3', 'Aún no hay fotos'), h('p', 'Restaura una foto antigua o quita un fondo y aparecerá aquí sola.'),
      h('div.bv-fila', { style: { justifyContent: 'center', marginTop: '16px' } }, h('button.bv-btn.prim', { type: 'button', onclick: () => C.irA('restaurar') }, '🕰️ Restaurar una foto'), h('button.bv-btn', { type: 'button', onclick: () => C.irA('fondo') }, '✂️ Quitar un fondo'))));
    mount(lista, h('div.bv-fila', { style: { marginBottom: '16px' } }, FILTROS.map(([k, t]) => h('button.bv-btn.peq' + (filtro === k ? '.on' : ''), { type: 'button', 'aria-pressed': filtro === k ? 'true' : 'false', onclick: () => { filtro = k; refrescar(); } }, t))),
      ver.length ? h('div.bv-galeria', ver.map(o => h('button.bv-obra', { type: 'button', 'aria-label': 'Abrir ' + o.nombre, onclick: () => abrir(o.id) },
        h('img', { src: o.mini, alt: '', loading: 'lazy' }),
        h('div', h('b', (TIPO[o.tipo] || ['📷'])[0] + ' ' + o.nombre), h('small', o.w + ' × ' + o.h + ' px' + (Math.max(o.w, o.h) >= 3800 ? ' · 4K' : '') + ' · ' + fecha(o.fecha))))))
        : h('p.bv-ayuda', 'No hay fotos de este tipo.'));
  }

  async function abrir(id) {
    const o = await obra(id);
    if (!o) { toast('Esa foto ya no está.', 'warn'); return refrescar(); }
    cerrar();
    const urls = [URL.createObjectURL(o.blob)], antes = o.antes ? URL.createObjectURL(o.antes) : null; if (antes) urls.push(antes);
    const ext = /png/.test(o.blob.type) ? 'png' : 'jpg', archivo = () => new File([o.blob], o.nombre.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '_') + '.' + ext, { type: o.blob.type || 'image/jpeg' });
    let comp = null;
    const vista = antes ? (comp = comparador(antes, urls[0], { etiquetas: ['Antes', (TIPO[o.tipo] || ['', 'Después'])[1]] })).el : h('img.bv-visor-img', { src: urls[0], alt: o.nombre });
    if (comp && o.tipo === 'recorte') comp.el.classList.add('ajedrez');
    const bLupa = comp ? h('button.bv-btn.peq', { type: 'button', onclick: () => bLupa.classList.toggle('on', comp.lupa()) }, '🔍 Lupa') : null;
    const onKey = e => { if (e.key === 'Escape') cerrar(); };
    visor = h('div.bv-visor', { role: 'dialog', 'aria-modal': 'true', 'aria-label': o.nombre },
      h('div.bv-visor-cab', h('div.grow', h('b', (TIPO[o.tipo] || ['📷'])[0] + ' ' + o.nombre), h('small', o.w + ' × ' + o.h + ' px · ' + fecha(o.fecha))),
        bLupa, h('button.bv-btn.peq', { type: 'button', onclick: () => cerrar(), 'aria-label': 'Cerrar' }, '✕ Cerrar')),
      h('div.bv-visor-foto', vista),
      h('div.bv-visor-acc',
        h('button.bv-btn.prim', { type: 'button', onclick: () => C.descargar(archivo()) }, '⬇️ Descargar'),
        h('button.bv-btn', { type: 'button', onclick: () => C.guardarNube(archivo()) }, '☁️ A la biblioteca'),
        C.puedeInstagram() ? h('button.bv-btn', { type: 'button', onclick: () => { cerrar(); C.aInstagram(archivo()); } }, '📸 Instagram') : null,
        h('button.bv-btn', { type: 'button', onclick: () => { cerrar(); C.aEstudio(archivo()); } }, '🎨 Retocar'),
        h('button.bv-btn.peligro', { type: 'button', onclick: async () => { if (!(await confirmDlg('¿Borrar esta foto?', 'Se borra solo de «Mis fotos» de este aparato. Si la descargaste o la guardaste en la biblioteca, allí sigue.', 'Borrar', true))) return; await borrarObra(o.id); cerrar(); refrescar(); C.alGuardar(); toast('Borrada.', 'ok'); } }, '🗑️ Borrar')));
    visor._fin = () => { removeEventListener('keydown', onKey); if (comp) comp.parar(); setTimeout(() => urls.forEach(u => URL.revokeObjectURL(u)), 2000); };
    addEventListener('keydown', onKey);
    document.body.appendChild(visor);
    visor.querySelector('.bv-visor-cab button:last-child').focus();
  }
  function cerrar() { if (visor) { visor._fin(); visor.remove(); visor = null; } }

  refrescar();
  return { refrescar, abrir };
}
