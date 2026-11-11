// ================= 11-11-2026 · 🏷️ VARIANTES A LA VENTA (el mismo producto, a otro tamaño, fuerza o acabado, a otro precio y en otro sitio) =================
// Biou: «si he cotizado una pieza y lo pongo a la venta tiene que estar registrado, es decir mismo producto pero diferente precio, dónde
// lo vendo, etc. tú sabes cómo hacerlo fluido!!». Se guardan desde el cotizador («🏷️ Guardar y poner a la venta») y se ven en la ficha.
// Los datos y cómo se guardan: ../variantes.js. Las cuentas: ../cotizar.js.
import { h, mount, modal, toast, eur, fdate, btn, inp, confirmDlg } from '../ui.js';
import { S, can } from '../store.js';
import { textoMedidas } from '../medidas3d.js';
import { horasTxt } from '../datos3d.js';
import { acabadoPorK, impPorK, SITIOS, sitioPorK, resumenVariante, claveVariante, nuevaVariante } from '../cotizar.js';
import { variantesDe, guardarVariante, borrarVariante, puedeGuardar } from '../variantes.js';

const medTxt = m => Array.isArray(m) && m[0] > 0 ? textoMedidas({ dimX: m[0], dimY: m[1], dimZ: m[2] }) : '';
const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export const nombreDe = v => v.n || resumenVariante(v);
export const igualQue = (p, E) => variantesDe(p.id).find(v => claveVariante(v) === claveVariante(E)) || null;

// las etiquetas de colores de una variante (tamaño, fuerza, acabado)
export function chipsDe(v) {
  const a = acabadoPorK(v.ac), esc = Number(v.esc) || 100, fz = Number(v.fz) || 0;
  return h('span.vr-chips',
    esc !== 100 ? h('span.vr-ch.tam', '📏 ' + (esc > 100 ? '+' : '−') + Math.abs(esc - 100) + ' %') : null,
    fz > 0 ? h('span.vr-ch.fz', '💪 +' + fz + ' %') : null,
    h('span.vr-ch.ac', { style: '--c:' + a.color }, a.e + ' ' + a.nombre));
}

// ---------- la ventana de guardar (desde el cotizador) ----------
// d = { E, r, g, hh, de, precio, minimo, coste, movil } · existente = la variante igual que ya estaba (se edita esa)
export function ventanaGuardar(p, d, existente, alGuardar) {
  const auto = resumenVariante(d.E) + (d.r && d.r.medidas ? ' · ' + String(Math.round(d.r.medidas.z) / 10).replace('.', ',') + ' cm de alto' : '');
  const nombre = inp({ value: existente ? existente.n : auto, maxlength: 60, 'aria-label': 'Nombre de la variante', placeholder: auto });
  const precio = inp({ type: 'number', min: 0, step: 0.1, inputmode: 'decimal', value: existente ? existente.pr : d.precio, 'aria-label': 'Precio de venta' });
  const nota = inp({ value: existente ? existente.nota : '', maxlength: 140, 'aria-label': 'Nota', placeholder: 'Ej.: para Laura · en el anuncio «Jarrón grande»' });
  const sitios = new Set(existente ? existente.d || [] : []);
  const chips = h('div.vr-sitios');
  const pintaSitios = () => mount(chips, SITIOS.map(s => h('button.vr-sitio' + (sitios.has(s.k) ? '.on' : ''), { type: 'button', 'data-k': s.k, onclick: () => { sitios.has(s.k) ? sitios.delete(s.k) : sitios.add(s.k); pintaSitios(); } }, s.e + ' ' + s.t)));
  pintaSitios();
  const a = acabadoPorK(d.E.acabado), I = impPorK(d.E.imp);
  const caja = h('div.vr-guardar',
    h('div.vr-res', chipsDe({ esc: d.E.escala, fz: d.E.fuerza, ac: d.E.acabado }),
      h('div.vr-res-d', d.r && d.r.medidas ? h('span', '📐 ' + textoMedidas({ dimX: d.r.medidas.x, dimY: d.r.medidas.y, dimZ: d.r.medidas.z })) : null,
        d.g > 0 ? h('span', '⚖️ ' + String(d.g).replace('.', ',') + ' g') : null, d.hh > 0 ? h('span', '⏱️ ' + horasTxt(Math.round(d.hh * 3600))) : null,
        h('span', '🖨️ ' + I.nombre + ' · ' + a.e + ' ' + a.nombre), h('span.vr-de', d.de === 'MEDIDO' ? '✅ medido con tu Bambu' : '≈ estimado'))),
    h('label.vr-l', 'Nombre', nombre),
    h('label.vr-l', 'Precio de venta (€)', precio, d.minimo ? h('small', 'No bajes de ' + eur(d.minimo) + (d.coste ? ' · te cuesta ' + eur(d.coste) + (d.movil ? ' (con móvil)' : ' (sin móvil)') : '')) : null),
    h('div.vr-l', h('span', '¿Dónde lo vendes? (puedes marcar varios)'), chips),
    h('label.vr-l', 'Nota (si quieres)', nota),
    !puedeGuardar() ? h('p.small.warn-t', '🔒 Para guardar variantes hace falta el permiso «Cambiar la configuración».') : null);
  const m = modal(existente ? '🏷️ Cambiar la variante' : '🏷️ Guardar y poner a la venta', caja, close => [
    btn('Cancelar', close),
    btn(existente ? 'Guardar los cambios' : 'Guardar la variante', async () => {
      const pr = Number(String(precio.value).replace(',', '.'));
      if (!(pr > 0)) { toast('Pon el precio al que lo vendes', 'warn'); precio.focus(); return; }
      const v = nuevaVariante({ id: existente && existente.id, pid: p.id, fecha: existente ? existente.f : hoy(), nombre: nombre.value || auto, escala: d.E.escala, fuerza: d.E.fuerza,
        paredes: d.r && d.r.ajustes.paredes, relleno: d.r && d.r.ajustes.relleno, acabado: d.E.acabado, imp: d.E.imp, medidas: d.r && d.r.medidas, gramos: d.g, horas: d.hh, de: d.de,
        precio: pr, minimo: d.minimo, coste: d.coste, movil: d.movil, sitios: [...sitios], nota: nota.value, por: S.me && S.me.nombre });
      try { await guardarVariante(v); toast('🏷️ Guardada: «' + nombreDe(v) + '» a ' + eur(v.pr), 'ok'); close(); alGuardar && alGuardar(v); }
      catch (e) { toast(e.message || String(e), 'bad'); }
    }, { cls: 'primary vr-ok', disabled: !puedeGuardar() })], { size: 'vrm' });
  return m;
}

// ---------- la tarjeta de la ficha ----------
export function tarjetaVariantes(p) {
  const L = variantesDe(p.id);
  if (!L.length) return can('productos.costes') ? h('div.card.vr-tarjeta.vacia', h('b', '🏷️ Variantes a la venta'), h('span.tiny.muted', ' · ninguna todavía: cotízalo (más grande, más fuerte, otro acabado) y pulsa «🏷️ Guardar y poner a la venta».')) : null;
  const cotizar = v => import('./cotizar_ui.js').then(m => m.abrirCotizador(p, { variante: v }));
  const pedido = v => import('./pedidos.js').then(P => P.orderForm({ producto: p.nombre, productoId: p.id, cantidad: 1, precio: v.pr, personalizacion: 'Variante: ' + nombreDe(v) + (medTxt(v.med) ? ' (' + medTxt(v.med) + ')' : '') + (v.ac !== 'normal' ? ' · acabado ' + acabadoPorK(v.ac).nombre : '') + (v.w ? ' · ' + v.w + ' paredes y ' + v.i + ' % de relleno' : '') }, true));
  const borrar = async v => { if (!await confirmDlg('Borrar la variante', '«' + nombreDe(v) + '» a ' + eur(v.pr) + '. Los pedidos ya hechos no se tocan.', 'Borrar', true)) return; try { await borrarVariante(v.id); toast('Variante borrada', 'ok'); } catch (e) { toast(e.message || String(e), 'bad'); } };
  const editar = v => ventanaGuardar(p, { E: { escala: v.esc, fuerza: v.fz, acabado: v.ac, imp: v.imp }, r: v.med ? { medidas: { x: v.med[0], y: v.med[1], z: v.med[2] }, ajustes: { paredes: v.w, relleno: v.i } } : { ajustes: { paredes: v.w, relleno: v.i } }, g: v.g, hh: v.h, de: v.de === 'M' ? 'MEDIDO' : 'ESTIMADO', precio: v.pr, minimo: v.min, coste: v.co, movil: !!v.mv }, v);
  return h('div.card.vr-tarjeta', h('div.vr-cab', h('b', '🏷️ Variantes a la venta (' + L.length + ')'), h('span.tiny.muted', 'el mismo producto, a otro tamaño, fuerza o acabado')),
    h('div.vr-lista', L.map(v => h('div.vr-fila', { 'data-id': v.id },
      h('div.vr-izq', h('b.vr-n', nombreDe(v)), chipsDe(v),
        h('div.vr-d', medTxt(v.med) ? h('span', '📐 ' + medTxt(v.med)) : null, v.g > 0 ? h('span', '⚖️ ' + String(v.g).replace('.', ',') + ' g') : null, v.h > 0 ? h('span', '⏱️ ' + horasTxt(Math.round(v.h * 3600))) : null, v.imp ? h('span', '🖨️ ' + impPorK(v.imp).nombre) : null),
        h('div.vr-s', (v.d || []).length ? (v.d || []).map(k => { const s = sitioPorK(k); return h('span.vr-sit', s.e + ' ' + s.t); }) : h('span.tiny.muted', 'sin sitio puesto'), v.nota ? h('span.tiny.muted', ' · ' + v.nota) : null)),
      h('div.vr-der', h('b.vr-pr', eur(v.pr)), can('productos.costes') && v.co > 0 ? h('small', 'te cuesta ' + eur(v.co) + (v.mv ? '' : ' (sin móvil)')) : null, h('small.tiny.muted', v.f ? fdate(v.f) : ''),
        h('div.vr-bot', btn('💶', () => cotizar(v), { cls: 'sm vr-cotizar', title: 'Abrir el cotizador así (para volver a calcular o abrirlo en Bambu)' }),
          can('pedidos.crear') ? btn('🧾', () => pedido(v), { cls: 'sm vr-pedido', title: 'Hacer un pedido de esta variante, con su precio' }) : null,
          puedeGuardar() ? btn('✏️', () => editar(v), { cls: 'sm vr-editar', title: 'Cambiar el precio, dónde lo vendes o la nota' }) : null,
          puedeGuardar() ? btn('🗑️', () => borrar(v), { cls: 'sm ghost vr-borrar', title: 'Borrar esta variante' }) : null))))));
}
