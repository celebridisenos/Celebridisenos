// ================= 🩺 FALLOS DEL INVENTARIO (15-11-2026) =================
// Biou (15-11): quiere que el programa le diga los fallos del inventario y arreglarlos juntos (cada uno con «Arreglar» o «Dejar así»).
// Los fallos se CALCULAN EN VIVO con sus datos (nada va escrito a mano). Una tarjeta por fallo: número grande, una línea y los nombres.
// Cada tarjeta tiene «Arreglar» (o sus botones especiales) y «Dejar así». Arreglar usa SOLO órdenes que ya existen:
//   1 stock en negativo      → stock.recuento (pone la estantería a 0, con nota)
//   2 materiales vacíos      → inventario.cerrarPendientes {claves:['vacias']} (la acción «retirar» del 22-10); si no, materiales.guardar activo:No
//   3 componentes de inventos→ materiales.guardar activo:No + nota «personal: inventos»
//   4 stock de lo que no está → stock.recuento a 0 (no hay orden para borrar la fila de la hoja Stock)
//   5 embalajes «estimado»   → embalajes.guardar (quita la marca «consumo estimado» de cada línea) · «Cambiar precio» abre su edición
//   6 bobinas a precios distintos → bobinas.guardar {precio}
//   7 materiales en negativo (18-11-2026: cajas, sobres, filamento…) → materiales.stock {nuevo}: ÉL escribe cuántos tiene (nunca se pone 0 a ciegas)
// «Dejar así» se recuerda en ESTE aparato (localStorage «cd.fallos.dejados»: fallo + los nombres afectados). Si aparece algo nuevo en ese
// fallo, vuelve a salir. No toca el servidor de Google (Servidor.gs).
import { h, mount, btn, toast, modal, empty, eur } from '../ui.js';
import { S, can, api, pull } from '../store.js';
import { requestAccess, go } from '../app.js';
import { levels } from './stock.js';
import { embForm } from './costes.js';

const CL = window.CL;
const n = v => Number(String(v === undefined || v === null ? '' : v).replace(',', '.')) || 0;
const lleno = v => v !== '' && v !== null && v !== undefined && isFinite(Number(String(v).replace(',', '.')));
const nom = m => String(m.nombre || '').trim();
const KEY = 'cd.fallos.dejados';
const leeDejados = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
const guardaDejados = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } };
const llave = ids => ids.slice().map(String).sort().join('|');
const lista = (L, max = 6) => L.slice(0, max).join(', ') + (L.length > max ? ' y ' + (L.length - max) + ' más' : '');
const e0 = v => (Math.round(n(v) * 100) / 100).toLocaleString('es-ES') + ' €';
const ud = (v, u) => { const x = Math.round(n(v) * 100) / 100; return (x < 0 ? '−' + Math.abs(x).toLocaleString('es-ES') : x.toLocaleString('es-ES')) + ' ' + (String(u || '').trim() || 'ud'); };

// ---------- 🔎 DETECTAR (todo sale de sus datos) ----------
export function detecta() {
  const F = [], mats = S.t.materiales || [], activo = m => CL.norm(m.activo) !== 'no';
  let niv; try { niv = levels(); } catch (e) { niv = { by: {}, list: [] }; }
  const catalogo = new Set((S.t.productos || []).map(p => CL.norm(p.nombre)));
  // 1 · stock en negativo
  const neg = (S.t.stock || []).map(r => { const L = niv.by[CL.norm(r.producto)], u = lleno(r.unidades) ? n(r.unidades) : null, fis = L ? L.fisico : 0; return { r, fis, val: Math.min(u === null ? 0 : u, fis) }; })
    .filter(x => x.val < 0 || x.fis < 0);
  if (neg.length) F.push({ clave: 'negativos', e: '➖', n: neg.length, titulo: 'Stock en negativo', linea: 'Hay menos de cero piezas. No puede ser: se pone a 0.', nombres: neg.map(x => x.r.producto + ' (' + x.val + ')'), ids: neg.map(x => x.r.producto), datos: neg });
  // 2 · materiales vacíos (solo el código)
  const vac = mats.filter(m => !nom(m) && activo(m));
  if (vac.length) F.push({ clave: 'vacios', e: '🗑️', n: vac.length, titulo: 'Materiales vacíos', linea: 'Filas sin nombre, precio ni nada. Se retiran (no se borra nada).', nombres: vac.map(m => m.id), ids: vac.map(m => m.id), datos: vac });
  // 3 · componentes de electrónica y mecánica con precio de referencia (¿son de sus inventos?)
  const comp = mats.filter(m => activo(m) && nom(m) && ['electronica', 'mecanica'].includes(CL.norm(m.categoria)) && /^orientativo/i.test(String(m.fuente || '').trim()) && n(m.cantidad) === 1);
  if (comp.length) F.push({ clave: 'inventos', e: '🔌', n: comp.length, titulo: '¿Son piezas de tus inventos?', linea: 'Componentes de electrónica y mecánica con precio de referencia, de cantidad 1. Las piezas de tus inventos no van en Mi almacén.', nombres: comp.map(nom), ids: comp.map(m => m.id), datos: comp });
  // 4 · stock de productos que no están en el catálogo
  const fuera = (S.t.stock || []).filter(r => String(r.producto || '').trim() && !catalogo.has(CL.norm(r.producto))).map(r => { const L = niv.by[CL.norm(r.producto)]; return { r, fis: L ? L.fisico : 0, u: lleno(r.unidades) ? n(r.unidades) : 0 }; }).filter(x => x.fis !== 0 || x.u !== 0);
  if (fuera.length) F.push({ clave: 'fuera', e: '👻', n: fuera.length, titulo: 'Stock de productos que no están en el catálogo', linea: 'Hay piezas apuntadas de algo que ya no existe. Se ponen a 0.', nombres: fuera.map(x => x.r.producto), ids: fuera.map(x => x.r.producto), datos: fuera });
  // 5 · embalajes todavía «estimado»
  const dat = { materiales: mats, embalajes: S.t.embalajes || [], recetas: S.t.recetas || [], productos: S.t.productos || [], calculadora: S.t.calculadora || [], gastos: S.t.gastos || [] }, pr = (S.cfg && S.cfg.precios) || {};
  const emb = (S.t.embalajes || []).filter(e => { try { return CL.linesCost(e.lineas || [], dat, pr).estado === 'estimado'; } catch (x) { return false; } });
  if (emb.length) F.push({ clave: 'embalajes', e: '🎁', n: emb.length, titulo: 'Embalajes todavía «estimado»', conMarca: emb.some(marcado),
    linea: emb.some(marcado) ? 'Su coste se calculó a ojo. Si ya lo has comprobado, se confirma.' : 'Sus líneas ya están confirmadas, pero el precio de algún material sigue estimado: usa «Cambiar precio» (o ponlo en Materiales y costes).', nombres: emb.map(e => e.nombre), ids: emb.map(e => e.id), datos: emb });
  // 6 · bobinas del mismo material a precios distintos
  const porMat = {};
  (S.t.bobinas || []).filter(b => n(b.precio) > 0).forEach(b => { (porMat[CL.norm(b.material || 'pla')] = porMat[CL.norm(b.material || 'pla')] || []).push(b); });
  Object.keys(porMat).forEach(k => {
    const B = porMat[k], g = {}; B.forEach(b => { (g[n(b.precio)] = g[n(b.precio)] || []).push(b); });
    const precios = Object.keys(g).map(Number).sort((a, b) => a - b);
    if (precios.length < 2) return;
    const mat = String(B[0].material || 'PLA').trim();
    F.push({ clave: 'bobinas:' + k, e: '🧵', n: B.length, titulo: 'Bobinas de ' + mat + ' a precios distintos', linea: precios.map(p => g[p].length + ' a ' + e0(p)).join(' · ') + '. ¿Cuánto te costó una bobina?',
      nombres: precios.map(p => { const c = {}; g[p].forEach(b => { const k = String(b.color || '').trim() || '(sin color)'; c[k] = (c[k] || 0) + 1; }); return g[p].length + ' × ' + e0(p) + ': ' + lista(Object.entries(c).map(([k, q]) => k + (q > 1 ? ' ×' + q : '')), 4); }),
      ids: B.map(b => b.id), datos: { mat, g, precios } });
  });
  // 7 · materiales en negativo (18-11-2026). Las cajas, sobres y demás se descuentan al empaquetar: si salen menos de cero es que
  //     se gastaron más de las apuntadas (o nunca se contaron). Solo se arregla CONTANDO: él escribe cuántas tiene.
  const mneg = mats.filter(m => activo(m) && nom(m) && lleno(m.stock) && n(m.stock) < 0).sort((a, b) => n(a.stock) - n(b.stock));
  if (mneg.length) F.push({ clave: 'matneg', e: '📦', n: mneg.length, titulo: mneg.length === 1 ? 'Material en negativo' : 'Materiales en negativo',
    linea: 'Has gastado más de los que tenías apuntados. Cuéntalos y escribe cuántos tienes ahora.',
    nombres: mneg.map(m => nom(m) + ' (' + ud(m.stock, m.unidad) + ')'), ids: mneg.map(m => m.id + '@' + n(m.stock)), datos: mneg });
  return F;
}
export const abiertos = () => { const D = leeDejados(); return detecta().filter(f => D[f.clave] !== llave(f.ids)); };
export const cuantosAbiertos = () => abiertos().length;

const marcado = e => (e.lineas || []).some(l => l.estimado === true || /^(s|true)/i.test(String(l.estimado || '')));
// ---------- 🖥️ LA PANTALLA ----------
export function render(el) {
  const st = { hechos: [], ocupado: new Set(), verDejados: false };
  const cuerpo = h('div.fl-lista'), cab = h('div.fl-res');
  el.append(h('div.page-head', h('div', h('h1', '🩺 Fallos del inventario'), h('div.muted.small', 'Los saca el programa de tus datos. Arréglalos o déjalos así.'))), cab, cuerpo);

  const ok = async (f, texto) => { await pull(); st.hechos = st.hechos.filter(x => x.clave !== f.clave).concat([{ clave: f.clave, e: f.e, titulo: f.titulo, texto }]); toast('✓ ' + texto, 'ok', 5000); };
  const dejar = f => { const D = leeDejados(); D[f.clave] = llave(f.ids); guardaDejados(D); pinta(); };
  const corre = async (f, fn) => { if (st.ocupado.has(f.clave)) return; st.ocupado.add(f.clave); pinta(); try { await fn(); } catch (e) { toast('No se pudo: ' + ((e && e.message) || e), 'bad', 8000); } st.ocupado.delete(f.clave); pinta(); };
  const pide = (perm, f) => { if (can(perm)) return true; requestAccess(perm, 'fallos'); return false; };

  const ARREGLA = {
    async negativos(f) {
      if (!pide('stock.mover', f)) return;
      let hechas = 0, quedan = [];
      for (const x of f.datos) {
        if (x.fis < 0) { await api('stock.recuento', { producto: x.r.producto, fisico: 0, notas: 'Estaba en negativo: puesto a 0 (Fallos del inventario, ' + S.hoy + ')' }); hechas++; } else quedan.push(x.r.producto);
      }
      await ok(f, hechas + (hechas === 1 ? ' stock puesto' : ' stocks puestos') + ' a 0' + (quedan.length ? ' · quedan ' + quedan.length + ' que se arreglan en Stock' : ''));
    },
    async vacios(f) {
      if (!pide('costes.editar', f)) return;
      let r = null; try { r = await api('inventario.cerrarPendientes', { claves: ['vacias'] }); } catch (e) { r = null; }
      await pull();
      const siguen = (S.t.materiales || []).filter(m => !nom(m) && CL.norm(m.activo) !== 'no' && f.ids.includes(m.id));
      for (const m of siguen) await api('materiales.guardar', { id: m.id, datos: { activo: 'No', notas: 'Fila vacía (solo tenía el código): retirada el ' + S.hoy + ' desde Fallos del inventario.' } });
      await ok(f, f.ids.length + (f.ids.length === 1 ? ' material vacío retirado' : ' materiales vacíos retirados'));
    },
    async inventos(f) {
      if (!pide('costes.editar', f)) return;
      for (const m of f.datos) await api('materiales.guardar', { id: m.id, datos: { activo: 'No', notas: ('personal: inventos' + (m.notas ? ' · ' + m.notas : '')).slice(0, 480) } });
      await ok(f, f.datos.length + ' piezas fuera de Mi almacén (nota «personal: inventos»)');
    },
    async fuera(f) {
      if (!pide('stock.mover', f)) return;
      let hechas = 0;
      for (const x of f.datos) if (x.fis !== 0) { await api('stock.recuento', { producto: x.r.producto, fisico: 0, notas: 'No está en el catálogo: puesto a 0 (Fallos del inventario, ' + S.hoy + ')' }); hechas++; }
      await ok(f, hechas + ' puestos a 0' + (hechas < f.datos.length ? ' · el resto se mira en Stock' : ''));
    },
    async embalajes(f) {
      if (!pide('costes.editar', f)) return;
      for (const e of f.datos.filter(marcado)) await api('embalajes.guardar', { id: e.id, datos: { lineas: (e.lineas || []).map(l => Object.assign({}, l, { estimado: false })) } });
      const q = f.datos.filter(marcado).length; await ok(f, q + (q === 1 ? ' embalaje confirmado' : ' embalajes confirmados'));
    },
    async bobinas(f, precio) {
      if (!pide('taller.editar', f)) return;
      const p = Math.round(n(precio) * 100) / 100; if (!(p > 0)) return toast('Escribe cuánto costó una bobina.', 'warn');
      let q = 0; const B = (S.t.bobinas || []).filter(b => f.ids.includes(b.id) && n(b.precio) !== p);
      for (const b of B) { await api('bobinas.guardar', { id: b.id, datos: { precio: p }, motivo: 'Precio unificado (Fallos del inventario)' }); q++; }
      await ok(f, q + (q === 1 ? ' bobina a ' : ' bobinas a ') + e0(p));
    },
    async matneg(f, m, valor) {
      if (!pide('stock.mover', f)) return;
      if (String(valor).trim() === '' || !(n(valor) >= 0)) return toast('Escribe cuántos tienes ahora (0 si no queda ninguno).', 'warn');
      const v = Math.round(n(valor) * 100) / 100;
      await api('materiales.stock', { id: m.id, nuevo: v, motivo: 'Recuento: estaba en ' + ud(m.stock, m.unidad) + ' (Fallos del inventario, ' + S.hoy + ')' });
      await pull();
      const quedan = (S.t.materiales || []).filter(x => CL.norm(x.activo) !== 'no' && nom(x) && lleno(x.stock) && n(x.stock) < 0).length;
      await ok(f, nom(m) + ': ' + ud(v, m.unidad) + (quedan ? ' · quedan ' + quedan + ' por contar' : ''));
    }
  };

  function cambiarPrecio(f) {
    const abre = e => { try { embForm(e); } catch (x) { go('costes'); } };
    if (f.datos.length === 1) return abre(f.datos[0]);
    modal('¿Cuál quieres cambiar?', h('div.fl-eleg', f.datos.map(e => btn(e.nombre, () => abre(e), { cls: 'sm' }))), close => [btn('Cerrar', close)]);
  }

  function tarjeta(f) {
    const busy = st.ocupado.has(f.clave), D = [];
    const dejarB = txt => btn(txt || 'Dejar así', () => dejar(f), { cls: 'ghost fl-dejar', disabled: busy });
    const arreglar = (t, fn) => btn(busy ? 'Un momento…' : t, () => corre(f, fn || (() => ARREGLA[f.clave.split(':')[0]](f))), { cls: 'primary fl-arreglar', disabled: busy });
    let botones;
    if (f.clave === 'inventos') botones = [arreglar('Sí, sácalas de mi almacén'), dejarB('No, son del taller')];
    else if (f.clave === 'embalajes') botones = [f.conMarca ? arreglar('Confirmar') : null, btn('Cambiar precio', () => cambiarPrecio(f), { cls: 'fl-cambiar', disabled: busy }), dejarB()];
    else if (f.clave.startsWith('bobinas:')) {
      const campo = h('input.inp.fl-precio', { type: 'number', min: '0', step: '0.01', inputmode: 'decimal', placeholder: '€', 'aria-label': 'Lo que costó una bobina (€)' });
      const rapidos = f.datos.precios.map(p => { const x = btn(e0(p), () => corre(f, () => ARREGLA.bobinas(f, p)), { cls: 'fl-rapido', disabled: busy }); x.dataset.precio = String(p); return x; });
      const pocas = f.datos.precios.slice().sort((a, b) => f.datos.g[a].length - f.datos.g[b].length)[0];
      botones = [h('div.fl-pregunta', h('b', '¿Cuánto te costó una bobina?'), h('div.fl-rap', rapidos, campo, btn('Poner', () => corre(f, () => ARREGLA.bobinas(f, campo.value)), { cls: 'primary fl-arreglar', disabled: busy }))), dejarB('Esas sí valían ' + e0(pocas))];
    } else if (f.clave === 'matneg') {
      botones = [h('div.fl-pregunta', h('b', '¿Cuántos tienes ahora?'), f.datos.map(m => {
        const campo = h('input.inp.fl-cuenta', { type: 'number', min: '0', step: '1', inputmode: 'numeric', placeholder: String(m.unidad || 'ud'), 'aria-label': 'Cuántos ' + nom(m) + ' tienes ahora' });
        return h('div.fl-rap.fl-mat', { 'data-material': m.id }, h('span.fl-matnom', nom(m)), campo, btn('Poner', () => corre(f, () => ARREGLA.matneg(f, m, campo.value)), { cls: 'primary fl-arreglar', disabled: busy }));
      })), dejarB()];
    } else botones = [arreglar('Arreglar'), dejarB()];
    return h('div.fl-t', { 'data-fallo': f.clave },
      h('div.fl-num', h('b', String(f.n)), h('span', f.e)), h('div.fl-cuerpo', h('b.fl-tit', f.titulo), h('div.fl-lin', f.linea), h('div.fl-nombres', lista(f.nombres, 8))), h('div.fl-botones', botones));
  }
  const hecha = x => h('div.fl-t.hecho', { 'data-hecho': x.clave }, h('div.fl-num', h('b', '✓'), h('span', x.e)), h('div.fl-cuerpo', h('b.fl-tit', 'Arreglado'), h('div.fl-lin', x.titulo), h('div.fl-nombres', x.texto)), h('div.fl-botones'));

  function pinta() {
    const todos = detecta(), D = leeDejados(), abierto = todos.filter(f => D[f.clave] !== llave(f.ids)), dejados = todos.filter(f => D[f.clave] === llave(f.ids));
    const hechos = st.hechos.filter(x => !abierto.some(f => f.clave === x.clave));
    mount(cab, h('div.fl-n', h('b', String(abierto.length)), h('span', abierto.length === 1 ? 'fallo por mirar' : 'fallos por mirar')), hechos.length ? h('div.fl-n.ok', h('b', String(hechos.length)), h('span', 'arreglados')) : null);
    mount(cuerpo,
      abierto.length ? abierto.map(tarjeta) : (hechos.length ? null : empty('shield', '¡Tu inventario está limpio!', 'No veo ningún fallo en tus datos.')),
      hechos.map(hecha),
      dejados.length ? h('div.fl-dej', h('button.fl-ver', { type: 'button', onclick: () => { st.verDejados = !st.verDejados; pinta(); } }, (st.verDejados ? '▾ ' : '▸ ') + dejados.length + (dejados.length === 1 ? ' dejado así' : ' dejados así')),
        st.verDejados ? dejados.map(f => h('div.fl-t.dejado', { 'data-dejado': f.clave }, h('div.fl-num', h('b', String(f.n)), h('span', f.e)), h('div.fl-cuerpo', h('b.fl-tit', f.titulo), h('div.fl-nombres', lista(f.nombres, 6))),
          h('div.fl-botones', btn('Volver a mirarlo', () => { const X = leeDejados(); delete X[f.clave]; guardaDejados(X); pinta(); }, { cls: 'sm ghost' })))) : null) : null);
  }
  pinta();
  return { update: () => { if (!st.ocupado.size) pinta(); } };
}
