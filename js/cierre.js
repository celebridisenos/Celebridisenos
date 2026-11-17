// ================= 14-11-2026 · 🌙 CERRAR EL DÍA =================
// Biou: «el cierre del día sería interesante poner cosas con clicks que has hecho, con opción de dejar constancia que quiero
// hacer mañana o que me queda por hacer».
// Dónde se guarda: en la tabla `tareas` (la que ya existe, se sincroniza con el servidor y con CelebriMesa la lee). Cada cosa
// que apunta es UNA tarea con categoria «Cierre del día», fecha límite = mañana y en las notas «mañana» o «queda».
// Así no hace falta tocar el servidor de Google ni crear una tabla nueva. Al día siguiente salen arriba en «Hoy» (tarjeta
// «Para hoy») hasta que las tache, y también están en Tareas y en CelebriMesa.
import { h, modal, btn, toast } from './ui.js';
import { S, can, mutate, upsertLocal, emit } from './store.js';
import { handleError } from './app.js';
import { miniPedido } from './fotopedido.js';
import { barra5 } from './pasos.js';
import * as PL from './placas.js';

const CL = window.CL;
export const CATEGORIA = 'Cierre del día';
const reduce = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const kCierre = () => 'cd.cierre.' + S.hoy;
export const diaCerrado = () => { try { return !!localStorage.getItem(kCierre()); } catch (e) { return false; } };
export const puedeApuntar = () => can('tareas.crear');
const manana = () => CL.addDays(S.hoy, 1);

// ---------- Lo que el programa ya sabe que hiciste hoy ----------
export function hechoHoy() {
  const hoy = S.hoy, out = [], hecho = v => CL.day(v) === hoy;
  S.t.pedidos.forEach(o => {
    const f = CL.phaseOf(S.cfg.pedidos, o.estado); if (f === 'cancelado') return;
    const ev = [];
    if (CL.day(o.fechaEnvio) === hoy) ev.push('🚚 enviado');
    if (CL.day(o.cobradoEn) === hoy) ev.push('💶 cobrado');
    if (!ev.length && !hecho(o.actualizado)) return;
    out.push({ id: 'p' + o.id, o, ico: '📦', txt: 'nº ' + o.numero + ' · ' + (o.producto || ''), tags: ev });
  });
  (S.t.trabajos || []).forEach(j => { if (j.estado === 'Terminado' && hecho(j.fin || j.actualizado)) out.push({ id: 'j' + j.id, ico: '🖨️', txt: 'Terminada: ' + (j.titulo || 'una impresión'), tags: [] }); });
  (S.t.tareas || []).forEach(t => { if (t.estado === 'Completada' && hecho(t.completado)) out.push({ id: 't' + t.id, ico: '✅', txt: t.titulo, tags: [] }); });
  return out;
}

// ---------- Lo que dejó apuntado (ayer o antes) y sigue pendiente ----------
export function pendientesDeCierre() {
  return (S.t.tareas || []).filter(t => t.categoria === CATEGORIA && t.estado !== 'Completada' && t.estado !== 'Cancelada' && t.fechaLimite && String(t.fechaLimite).slice(0, 10) <= S.hoy)
    .sort((a, b) => String(a.fechaLimite).localeCompare(String(b.fechaLimite)));
}
async function tachar(t) {
  const now = new Date().toISOString();
  try {
    const r = await mutate('tareas.estado', { id: t.id, estado: 'Completada', orig: { estado: t.estado } }, { label: 'Tarea "' + t.titulo + '" → Completada', tables: ['tareas'],
      optimistic: T => { const x = T.tareas.find(y => y.id === t.id); if (x) { x.estado = 'Completada'; x.completado = now; x.completadoPor = (S.me && S.me.nombre) || ''; } } });
    if (r && r.id) { upsertLocal('tareas', r); emit(); }
  } catch (e) { handleError(e, 'tareas'); }
}
// La tarjeta de arriba de «Hoy»: «Para hoy» (lo que quería hacer) y «Te quedó» (lo que no le dio tiempo). Cada una se tacha con un toque.
export function tarjetaPendientes() {
  const L = pendientesDeCierre(); if (!L.length) return null;
  const fila = t => h('button.hp-it' + (t.notas === 'queda' ? '.queda' : '.manana'), { type: 'button', 'data-id': t.id, title: 'Toca para tacharla', onclick: ev => { const b = ev.currentTarget; b.classList.add('hecha'); setTimeout(() => tachar(t), reduce() ? 0 : 380); } },
    h('i.hp-ck', '✓'), h('span.hp-t', t.titulo), h('small', t.notas === 'queda' ? '↩️ te quedó' : '📅 querías'));
  return h('div.hoy-pend', { role: 'region', 'aria-label': 'Lo que dejaste apuntado' }, h('div.hp-h', h('b', '🌙 Lo que dejaste apuntado'), h('span.hp-n', String(L.length))), h('div.hp-l', L.map(fila)));
}

// ---------- La ventana ----------
export function cerrarDia(redraw) {
  const hechos = hechoHoy(), off = new Set(), listas = { manana: [], queda: [] };
  const hoy = S.hoy, puede = puedeApuntar();
  // sugerencias de «me queda»: lo que sigue abierto en el taller
  const sug = [];
  S.t.pedidos.forEach(o => { const f = CL.phaseOf(S.cfg.pedidos, o.estado); const q = { confirmado: 'Imprimir', impresion: 'Terminar de imprimir', postpro: 'Acabar en la mesa', empaquetar: 'Empaquetar', listo: 'Enviar' }[f]; if (q && sug.length < 6) sug.push({ t: q + ' nº ' + o.numero + ' · ' + (o.producto || ''), o }); });
  const ring = PL.anillo(hechos.length ? 100 : 0, 64, String(hechos.length));
  const lista = h('div.ci-hechos', hechos.length ? hechos.slice(0, 14).map((x, i) => h('button.ci-it', { type: 'button', 'data-id': x.id, style: { '--i': i }, title: 'Toca para tacharlo si no lo hiciste hoy', onclick: ev => { const b = ev.currentTarget, on = off.has(x.id); if (on) off.delete(x.id); else off.add(x.id); b.classList.toggle('off', !on); cuenta(); } },
    x.o ? miniPedido(x.o, 34) : h('span.ci-ico', x.ico), h('span.ci-txt', x.txt), x.o ? barra5(x.o, { mini: true }) : null, x.tags.map(t => h('em.ci-tag', t)))) : [h('p.small.muted', 'Hoy no hay movimientos apuntados en el programa. Si hiciste algo fuera de él, apúntalo abajo.')]);
  const nCuenta = h('b.ci-n', String(hechos.length));
  const cuenta = () => { nCuenta.textContent = String(hechos.length - off.size); };
  const caja = (k, titulo, ph, ico) => {
    const ul = h('div.ci-ents'), inp = h('input.inp.ci-in', { type: 'text', maxlength: 200, placeholder: ph, 'data-lista': k, 'aria-label': titulo });
    const pinta = () => { ul.replaceChildren(...listas[k].map((t, i) => h('div.ci-ent', h('span', t), h('button.ci-x', { type: 'button', 'aria-label': 'Quitar', onclick: () => { listas[k].splice(i, 1); pinta(); } }, '×')))); };
    const mete = txt => { txt = String(txt || '').trim(); if (!txt || listas[k].includes(txt) || listas.manana.includes(txt) || listas.queda.includes(txt)) return; listas[k].push(txt); pinta(); };
    const add = () => { mete(inp.value); inp.value = ''; inp.focus(); };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); add(); } });
    const sugs = k === 'queda' && sug.length ? h('div.ci-sug', sug.map(s => h('button.ci-chip', { type: 'button', onclick: ev => { mete(s.t); ev.currentTarget.classList.add('usada'); } }, '+ ' + s.t))) : null;
    return { el: h('section.ci-caja.' + k, h('h3', h('span', ico), ' ' + titulo), h('div.row.ci-fila', inp, h('button.ci-add', { type: 'button', onclick: add, 'aria-label': 'Añadir' }, '+')), sugs, ul), mete, take: () => { if (inp.value.trim()) mete(inp.value); inp.value = ''; return listas[k].slice(); } };
  };
  const cM = caja('manana', 'Mañana quiero…', 'Escribe y pulsa Intro', '🌅'), cQ = caja('queda', 'Me queda por hacer…', 'Lo que no te dio tiempo', '↩️');
  const m = modal('🌙 Cerrar el día', h('div.ci', { 'data-ci': '1' },
    h('div.ci-top', ring, h('div', h('div.ci-q', 'Hoy has hecho ', nCuenta, ' cosas'), h('div.tiny.muted', 'Toca las que NO hiciste para tacharlas.'))),
    lista, puede ? [cM.el, cQ.el] : h('p.small.muted', 'Tu usuario no puede apuntar tareas.')),
  close => [btn('Cancelar', close, { cls: 'ghost' }), btn('🌙 Cerrar el día', async ev => {
    const b = ev.currentTarget; b.disabled = true;
    const M = puede ? cM.take() : [], Q = puede ? cQ.take() : [];
    try {
      const crea = async (titulo, nota) => {
        const id = 'k' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4), datos = { titulo, notas: nota, categoria: CATEGORIA, estado: 'Pendiente', prioridad: 'Normal', fechaLimite: manana() };
        const r = await mutate('tareas.guardar', { id, datos }, { label: 'Cierre del día: ' + titulo, tables: ['tareas'], optimistic: T => T.tareas.push(Object.assign({ id, creado: new Date().toISOString(), creadoPor: (S.me && S.me.nombre) || '', origen: 'manual', version: 0 }, datos)) });
        if (r && r.id) upsertLocal('tareas', r);
      };
      for (const t of M) await crea(t, 'mañana');
      for (const t of Q) await crea(t, 'queda');
      emit();
      try { localStorage.setItem(kCierre(), JSON.stringify({ hechos: hechos.length - off.size, tachados: [...off], manana: M.length, queda: Q.length })); } catch (e) { }
      toast('🌙 Día cerrado' + (M.length + Q.length ? ' · mañana te lo enseño arriba en «Hoy»' : ''), 'ok', 5000); close(); redraw && redraw();
    } catch (e) { b.disabled = false; handleError(e, 'tareas'); }
  }, { cls: 'primary', title: 'Guarda lo de mañana y lo que queda' })], { size: 'narrow', noFocus: true });
  m.el.classList.add('cierre-dlg');
  return m;
}
