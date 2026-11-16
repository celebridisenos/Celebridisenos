// ================= 🧹 PRODUCTOS QUE NO SE VENDEN (15-11-2026) =================
// Biou: «SE BORRAN LOS PRODUCTOS QUE NO SE VENDEN, QUE ES MUCHOS».
// Cuenta las ventas con la tabla `pedidos` (sin los cancelados): primero por `productoId`; si el pedido no lo trae, por el nombre.
// Enseña los vendidos plegados y los que NUNCA se han vendido en una lista, todos marcados. Él quita la marca a los que guarda y
// pulsa UN botón: cada producto va a la papelera con la orden de siempre (`productos.borrar`, la misma que el botón «Borrar» de la
// ficha), uno a uno y con barra. La carpeta del ordenador no se toca. Si uno falla, sigue con los demás y lo cuenta al final.
// No cambia nada del servidor.
import { h, mount, btn, toast, empty, confirmDlg } from '../ui.js';
import { S, can, mutate, byId, removeLocal, emit } from '../store.js';
import { go } from '../app.js';
import { filesOf } from '../files.js';

const CL = window.CL;
export const DIAS_NUEVO = 30;

const cancelado = o => CL.norm(o.estado) === 'cancelado' || (S.cfg && S.cfg.pedidos && CL.phaseOf(S.cfg.pedidos, o.estado) === 'cancelado');
const fechaDe = p => String(p.fecha || p.creado || '').slice(0, 10);
export const esNuevo = p => { const f = fechaDe(p), a = Date.parse(f), b = Date.parse(S.hoy); return !!f && isFinite(a) && isFinite(b) && (b - a) / 864e5 < DIAS_NUEVO; };
export const enLaWeb = p => CL.norm(p.estado) === 'publicado';

// → { vendidos: [{ p, n }], nunca: [p] }  (la cuenta es la de pedidos que NO están cancelados)
export function conteo() {
  const prods = S.t.productos || [], cuenta = {}, porNombre = {};
  prods.forEach(p => { const k = CL.norm(p.nombre); if (k) (porNombre[k] = porNombre[k] || []).push(p.id); });
  (S.t.pedidos || []).forEach(o => {
    if (cancelado(o)) return;
    const q = 1; // (se cuentan PEDIDOS, no unidades)
    if (o.productoId && prods.some(p => p.id === o.productoId)) { cuenta[o.productoId] = (cuenta[o.productoId] || 0) + q; return; }
    (porNombre[CL.norm(o.producto)] || []).forEach(id => { cuenta[id] = (cuenta[id] || 0) + q; }); // sin productoId: por el nombre (si hay dos con el mismo nombre, los dos cuentan: así no se borra uno por error)
  });
  const vendidos = prods.filter(p => cuenta[p.id]).map(p => ({ p, n: cuenta[p.id] })).sort((a, b) => b.n - a.n || String(a.p.nombre).localeCompare(String(b.p.nombre), 'es'));
  const nunca = prods.filter(p => !cuenta[p.id]).sort((a, b) => fechaDe(a).localeCompare(fechaDe(b)) || String(a.nombre).localeCompare(String(b.nombre), 'es'));
  return { vendidos, nunca };
}
export const cuantosNunca = () => conteo().nunca.length;

const miniatura = p => { const f = p.fotoId ? byId('archivos', p.fotoId) : filesOf('productos', p.id).find(a => a.miniatura); return f && f.miniatura ? h('img.nv-foto', { src: f.miniatura, alt: '', loading: 'lazy' }) : h('span.nv-foto.nv-sin', '📦'); };
const fechaTxt = p => { const f = fechaDe(p).split('-'); return f.length === 3 ? f[2] + '-' + f[1] + '-' + f[0] : ''; };

export function render(el) {
  const st = { sel: new Set(), iniciado: false, soloViejos: false, quitados: new Set(), ocupado: false, informe: null };
  const resumen = h('div.nv-res'), lista = h('div.nv-lista'), pie = h('div.nv-pie'), informe = h('div.nv-informe');
  const puede = can('productos.borrar');
  const chkNuevos = h('input', { type: 'checkbox', id: 'nv-nuevos', 'aria-label': 'No marcar los nuevos (menos de 30 días)', onchange: e => { st.soloViejos = e.target.checked; ajustaNuevos(); pinta(); } });
  el.append(h('div.page-head', h('div', h('h1', '🧹 Productos que no se venden'), h('div.muted.small', 'Los que nunca han tenido un pedido. Quita la marca a los que quieres guardar.'))), resumen, informe,
    h('label.nv-toggle', chkNuevos, h('span', 'No marcar los nuevos (menos de 30 días)')), lista, pie);

  function ajustaNuevos() { conteo().nunca.filter(esNuevo).forEach(p => { if (st.soloViejos) st.sel.delete(p.id); else st.sel.add(p.id); }); }
  function pinta() {
    const C = conteo(), ids = new Set(C.nunca.map(p => p.id));
    if (!st.iniciado) { st.iniciado = true; C.nunca.forEach(p => st.sel.add(p.id)); } // al entrar: TODOS marcados
    st.sel.forEach(id => { if (!ids.has(id)) st.sel.delete(id); });
    const nSel = st.sel.size;
    mount(resumen, h('div.nv-num', h('b', String(S.t.productos.length)), h('span', 'productos')), h('div.nv-num.ok', h('b', String(C.vendidos.length)), h('span', 'se han vendido')), h('div.nv-num' + (C.nunca.length ? '.aviso' : ''), h('b', String(C.nunca.length)), h('span', 'nunca vendidos')));
    const vend = C.vendidos.length ? h('details.nv-vend', h('summary', '✅ Los que sí se venden (' + C.vendidos.length + ') · se quedan'), h('div.nv-vl', C.vendidos.map(x => h('div.nv-v', h('span.grow.ellipsis', x.p.nombre), h('b', x.n + (x.n === 1 ? ' pedido' : ' pedidos')))))) : null;
    const filas = C.nunca.map(p => h('label.nv-f' + (st.sel.has(p.id) ? '.on' : ''), { 'data-id': p.id },
      h('input', { type: 'checkbox', checked: st.sel.has(p.id), 'aria-label': 'Mandar «' + p.nombre + '» a la papelera', disabled: !puede || st.ocupado, onchange: e => { if (e.target.checked) st.sel.add(p.id); else st.sel.delete(p.id); pinta(); } }),
      miniatura(p), h('span.nv-n', h('b', p.nombre), h('span.tiny.muted', [p.sku || p.id, fechaTxt(p)].filter(Boolean).join(' · '))),
      h('span.nv-ins', esNuevo(p) ? h('span.nv-ins-n', 'nuevo') : null, enLaWeb(p) ? h('span.nv-ins-w', '🌐 en tu tienda web') : null)));
    mount(lista, vend, C.nunca.length ? h('div.nv-filas', filas) : empty('box', '¡Todo lo que tienes se ha vendido alguna vez!', 'No hay nada que quitar.'));
    const webSel = C.nunca.filter(p => st.sel.has(p.id) && enLaWeb(p)).length;
    mount(pie, C.nunca.length ? [
      webSel ? h('p.nv-aviso', '🌐 ' + webSel + (webSel === 1 ? ' está' : ' están') + ' en tu tienda web. Si lo mandas a la papelera, ya no lo podrás vender desde el programa.') : null,
      h('button.nv-gordo', { type: 'button', disabled: !nSel || !puede || st.ocupado, onclick: mandar }, nSel ? 'Mandar ' + nSel + ' a la papelera' : 'No hay ninguno marcado'),
      !puede ? h('p.tiny.muted', 'Tu usuario no puede borrar productos.') : h('p.tiny.muted', 'Se pueden recuperar: Configuración → Papelera. La carpeta del ordenador no se toca.')] : null);
  }
  async function mandar() {
    const L = conteo().nunca.filter(p => st.sel.has(p.id)); if (!L.length || st.ocupado) return;
    if (!await confirmDlg('Mandar ' + L.length + ' a la papelera', 'Vas a mandar ' + L.length + (L.length === 1 ? ' producto' : ' productos') + ' a la papelera. Se pueden recuperar: Configuración → Papelera. La carpeta del ordenador no se toca. ¿Seguro?', 'Mandar ' + L.length + ' a la papelera', true)) return;
    st.ocupado = true; pinta();
    const barra = h('span', { style: { width: '0%' } }), txt = h('div.small', 'Preparando…');
    mount(informe, h('div.card.nv-prog', h('b', '🗑️ Mandando a la papelera…'), h('div.progress', barra), txt));
    const fallos = []; let hechos = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i]; txt.textContent = (i + 1) + ' de ' + L.length + ' · ' + p.nombre;
      try { await mutate('productos.borrar', { id: p.id }, { onlineOnly: true }); removeLocal('productos', p.id); st.sel.delete(p.id); hechos++; }
      catch (e) { fallos.push({ p, msg: (e && e.message) || String(e) }); }
      barra.style.width = Math.round((i + 1) / L.length * 100) + '%';
    }
    emit(); st.ocupado = false;
    mount(informe, h('div.card.nv-fin' + (fallos.length ? '.mal' : ''),
      h('b', hechos ? '✓ ' + hechos + (hechos === 1 ? ' producto está en la papelera' : ' productos están en la papelera') : 'No se ha mandado ninguno'),
      h('div.small.muted', 'Los puedes recuperar: Configuración → Papelera.'),
      fallos.length ? h('div.nv-fallos', h('b', '⚠️ No se pudo con ' + fallos.length + ':'), fallos.map(f => h('div.small', '• ' + f.p.nombre + ': ' + f.msg))) : null,
      h('div.row.wrap', btn('Abrir la Papelera', () => go('config/papelera'), { cls: 'sm', icon: 'trash' }), btn('Ver mis productos', () => go('productos'), { cls: 'sm ghost' }))));
    toast(hechos + ' en la papelera' + (fallos.length ? ' · ' + fallos.length + ' con problema' : ''), fallos.length ? 'warn' : 'ok', 5000);
    pinta();
  }
  pinta();
  return { update: () => { if (!st.ocupado) pinta(); } };
}
