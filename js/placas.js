// ================= v60.13 · PLACAS: un pedido con varias placas, cada una con su estado =================
// Biou (14-11-2026): «puedo tener impreso una parte y que esa parte esté en mesa y la otra aún imprimiendo».
// Todo lo de las placas en pantalla vive aquí (ficha del pedido, la lista, «Hoy» y la pregunta «¿cómo salió?»). La lógica
// (qué estado tiene el pedido según sus placas) es la de shared/logic.js, la misma que usa el servidor.
import { h, mount, btn, modal, toast, menu, fdate, confirmDlg, promptDlg } from './ui.js';
import { S, can, mutate, upsertLocal, emit, byId } from './store.js';
import { handleError } from './app.js';

const CL = window.CL;
const SVGNS = 'http://www.w3.org/2000/svg';
// 23-11-2026 · Biou: «las placas no se leen bien». Las de antes con nombre raro del 3MF («Körper13», «Placa 1») se enseñan con el producto:
// «Trío Decorativo 1/2 — Negro» (CL.placaNombreVisto). Lo que él escribió a mano se respeta.
export const lista = o => { const L = CL.placasLista(o && o.placas); return L.map((p, i) => { const n = CL.placaNombreVisto(p, i, L, o); return n === p.nombre ? p : Object.assign({}, p, { nombre: n }); }); };
const fase = o => CL.phaseOf(S.cfg.pedidos, o.estado);
export const SERVIDOR_VIEJO = 'Tu servidor de Google aún es el antiguo: para las placas hay que pegar el Servidor.gs nuevo (carpeta de la versión → LEEME).';
const viejo = e => /Acción desconocida: pedidos\.(placa|placas|salida)/.test((e && e.message) || '');
const falla = (e, o) => { if (viejo(e)) toast(SERVIDOR_VIEJO, 'warn', 9000); else handleError(e, 'pedidos'); };
// ¿Se pregunta «¿cómo salió?» antes de pasar a «En mesa»? Sí; se puede apagar en la configuración del taller (taller.preguntarSalida = false).
let servidorSinSalida = false; // (con el servidor 18.6.1 la pregunta no se puede guardar: se dice una vez y no se vuelve a pedir)
export const salidaActiva = () => !servidorSinSalida && !(S.cfg && S.cfg.taller && S.cfg.taller.preguntarSalida === false);

// El color de un avance (0 → rojo, 100 → verde)
export const colorAvance = pct => 'hsl(' + Math.round(Math.max(0, Math.min(100, pct)) * 1.2) + ', 72%, 44%)';
const ACCION = { imprimiendo: '▶ Imprimir', impresa: '✅ Ya impresa', en_mesa: '🛠️ A la mesa', acabada: '🏁 Acabada' };

// ---------- Anillo de avance (SVG: se dibuja girando hasta su sitio) ----------
const visto = new Map(); // el último avance que se dibujó de cada pedido: al repintar, el anillo y la barra siguen desde ahí (no empiezan de cero cada vez)
export function anillo(pct, tam = 46, centro, clave) {
  const r = tam / 2 - 5, c = 2 * Math.PI * r, svg = document.createElementNS(SVGNS, 'svg'), desde = clave && visto.has('a' + clave) ? visto.get('a' + clave) : 0;
  if (clave) visto.set('a' + clave, pct);
  svg.setAttribute('viewBox', '0 0 ' + tam + ' ' + tam); svg.setAttribute('width', tam); svg.setAttribute('height', tam); svg.setAttribute('class', 'pl-anillo'); svg.setAttribute('aria-hidden', 'true');
  const mk = (cls, extra) => { const e = document.createElementNS(SVGNS, 'circle'); e.setAttribute('cx', tam / 2); e.setAttribute('cy', tam / 2); e.setAttribute('r', r); e.setAttribute('class', cls); Object.keys(extra || {}).forEach(k => e.setAttribute(k, extra[k])); return e; };
  svg.appendChild(mk('pl-an-fondo'));
  const arco = mk('pl-an-arco', { 'stroke-dasharray': c.toFixed(1), 'stroke-dashoffset': (c * (1 - Math.max(0, Math.min(100, desde)) / 100)).toFixed(1), stroke: colorAvance(pct) });
  svg.appendChild(arco);
  requestAnimationFrame(() => requestAnimationFrame(() => arco.setAttribute('stroke-dashoffset', (c * (1 - Math.max(0, Math.min(100, pct)) / 100)).toFixed(1)))); // (la transición CSS lo anima)
  const w = h('span.pl-an-w', { style: { width: tam + 'px', height: tam + 'px' } }, svg, h('span.pl-an-t', centro === undefined ? Math.round(pct) + '' : centro));
  return w;
}

// ---------- Resumen pequeño para listas y tarjetas: puntitos de colores + «2/3» ----------
export function mini(o, opts = {}) {
  const L = lista(o); if (!L.length) return null;
  const R = CL.placasResumen(L);
  return h('span.pl-mini' + (opts.grande ? '.grande' : ''), { title: R.texto, 'data-pl': R.n + ':' + R.hechas },
    h('span.pl-dots', L.map(p => h('i.' + p.estado, { style: { background: CL.placaInfo(p.estado).c }, title: p.nombre + ' · ' + CL.placaInfo(p.estado).t }))),
    h('span.pl-n', R.hechas + '/' + R.n),
    opts.anillo ? anillo(R.pct, 38, R.pct + '', o.id + ':hoy') : null);
}

// ---------- «La última vez de este diseño no salió bien» (el programa aprende de lo que Biou le cuenta) ----------
function previas(o) {
  const l = CL.salidasDeProducto(S.t.pedidos, o.productoId, o.producto, o.id);
  if (!l.length) return null;
  const cuenta = {}; l.slice(0, 6).forEach(x => (x.causas.length ? x.causas : ['otro']).forEach(c => { cuenta[c] = (cuenta[c] || 0) + 1; }));
  return { l, cuenta };
}
export function avisoPrevias(o) {
  if (!['reserva', 'confirmado', 'impresion'].includes(fase(o))) return null;
  const P = previas(o); if (!P) return null;
  const ult = P.l[0];
  return h('div.pl-prev', { role: 'status' }, h('span.pl-prev-t', '⚠️ La última vez no salió bien'),
    h('span.pl-prev-c', Object.keys(P.cuenta).map(k => { const c = CL.SALIDA_CAUSAS.find(z => z.k === k); return h('span.pl-chip.mal', { title: c.t }, c.e + ' ' + c.t + (P.cuenta[k] > 1 ? ' ×' + P.cuenta[k] : '')); })),
    h('span.tiny.muted', 'nº ' + ult.pedido + (ult.fecha ? ' · ' + fdate(String(ult.fecha).slice(0, 10)) : '') + (ult.nota ? ' · ' + ult.nota : '')));
}

// ---------- La pregunta: «¿cómo salió?» ----------
// Devuelve { accion: 'seguir' | 'repetir' | 'saltar', salida } o null (cerró la ventana: no se cambia nada).
export function salidaDialog({ o, placa, titulo }) {
  return new Promise(res => {
    let hecho = false, v = '', causas = [];
    const fin = r => { if (!hecho) { hecho = true; res(r); } };
    const P = previas(o);
    const caras = h('div.sd-caras', CL.SALIDA_V.map(x => h('button.sd-cara.' + x.k, { type: 'button', 'data-v': x.k, onclick: () => elige(x.k) }, h('span.sd-e', x.e), h('b', x.t))));
    const chips = h('div.sd-causas', CL.SALIDA_CAUSAS.map(c => h('button.sd-chip', { type: 'button', 'data-c': c.k, onclick: ev => { const b = ev.currentTarget, i = causas.indexOf(c.k); if (i >= 0) causas.splice(i, 1); else causas.push(c.k); b.classList.toggle('on', i < 0); } }, h('span', c.e), c.t)));
    const nota = h('input.inp.sd-nota', { type: 'text', maxlength: 200, placeholder: '¿Algo más? (si quieres)', 'aria-label': 'Nota' });
    const mas = h('div.sd-mas', { hidden: true }, h('p.small.muted', '¿Qué falló? Toca lo que pasó:'), chips, nota);
    const guardar = () => ({ v, causas: v === 'bien' ? [] : causas.slice(), nota: nota.value.trim() });
    const ya = salida => { fin(salida); m.close(); }; // (primero la respuesta: al cerrar, onclose respondería «cerró»)
    const elige = k => {
      v = k;
      caras.querySelectorAll('.sd-cara').forEach(b => b.classList.toggle('on', b.dataset.v === k));
      if (k === 'bien') { setTimeout(() => ya({ accion: 'seguir', salida: { v: 'bien', causas: [], nota: '' } }), 260); return; } // bien = un solo toque
      mas.hidden = false; seguir.disabled = false; rep.hidden = k !== 'mal';
    };
    const seguir = btn('Guardar y seguir', () => ya({ accion: 'seguir', salida: guardar() }), { cls: 'primary', title: 'Apunta cómo salió y sigue' }); seguir.disabled = true; seguir.dataset.act = 'guardar';
    const rep = btn('🔁 Hay que repetirla', () => ya({ accion: 'repetir', salida: guardar() }), { cls: 'danger', title: 'No pasa a la mesa: queda por imprimir otra vez' }); rep.hidden = true; rep.dataset.act = 'repetir';
    const saltar = btn('Saltar', () => ya({ accion: 'saltar', salida: null }), { cls: 'ghost', title: 'Seguir sin apuntar nada' }); saltar.dataset.act = 'saltar';
    const m = modal(titulo || '¿Cómo salió la impresión?', h('div.sd', { 'data-sd': '1' },
      h('p.sd-q', h('b', (placa ? placa.nombre + ' · ' : '') + (o.producto || 'el pedido')), h('span.muted', ' · nº ' + o.numero)),
      P ? h('div.sd-prev', h('span', '⚠️ Otras veces:'), Object.keys(P.cuenta).map(k => { const c = CL.SALIDA_CAUSAS.find(z => z.k === k); return h('span.pl-chip.mal', c.e + ' ' + c.t + (P.cuenta[k] > 1 ? ' ×' + P.cuenta[k] : '')); })) : null,
      caras, mas),
    close => [saltar, rep, seguir], { size: 'narrow', onclose: () => fin(null), noFocus: true });
    m.el.classList.add('salida-dlg');
  });
}

// ---------- Mover una placa (con la pregunta antes de «En mesa») ----------
// Devuelve true si se cambió. extra.salida = ya se sabe cómo salió (no se pregunta). extra.pregunta = false: no preguntar.
export async function ponerPlaca(o, placaId, estado, extra = {}) {
  o = byId('pedidos', o.id) || o;
  const antes = lista(o), p = antes.find(x => x.id === placaId); if (!p) return false;
  let salida = extra.salida, hacia = estado;
  if (estado === 'en_mesa' && CL.placaRank(p.estado) < 3 && extra.pregunta !== false && salidaActiva() && !salida) {
    const r = await salidaDialog({ o, placa: p });
    if (!r) return false; // cerró la ventana: no se cambia nada
    if (r.accion === 'repetir') hacia = 'por_imprimir';
    if (r.salida) salida = r.salida;
  }
  const quien = (S.me && S.me.nombre) || '', ahora = new Date().toISOString();
  const d = { id: o.id, placaId, estado: hacia }; if (salida) d.salida = salida;
  const opt = t => {
    const x = t.pedidos.find(q => q.id === o.id); if (!x) return;
    const nuevas = CL.placasNormaliza(antes.map(q => q.id === placaId ? Object.assign({}, q, { estado: hacia }, salida ? { salida } : {}) : q), antes, ahora, quien).lista;
    const ne = CL.placasEstadoPedido(S.cfg.pedidos, x.estado, antes, nuevas);
    x.placas = nuevas; if (ne) x.estado = ne;
  };
  try {
    const r = await mutate('pedidos.placa', d, { label: 'Placa «' + p.nombre + '» del pedido nº ' + o.numero, tables: ['pedidos'], optimistic: opt });
    if (r && r.id) { upsertLocal('pedidos', r); emit(); }
    // 16-11-2026 · todas acabadas → el pedido pasa solo a «Empaquetar». Su servidor 18.8.0 ya lo hace; con el 18.7.0 (que lo deja en
    // «En mesa» a propósito) se pide aquí, como si se pulsara «📦 pasar a Empaquetar» (mismo camino: changeState).
    if (r && r.id && !r.queued) await empaquetarSiTodas(byId('pedidos', o.id) || r);
    if (hacia === 'por_imprimir' && estado === 'en_mesa') toast('🔁 «' + p.nombre + '» queda por imprimir otra vez', 'warn');
    else if (r && r.queued) toast('Guardado en este dispositivo. Se enviará al volver la conexión.', 'warn');
    else if (r && r.id && r.estado !== o.estado) toast('Pedido nº ' + o.numero + ' → ' + r.estado, 'ok');
    return true;
  } catch (e) { falla(e, o); return false; }
}

// 16-11-2026 · ¿Todas las placas acabadas y el pedido aún imprimiendo o en mesa? → «Empaquetar». Devuelve true si lo ha pasado.
export async function empaquetarSiTodas(o) {
  const L = lista(o); if (!L.length || !L.every(q => q.estado === 'acabada')) return false;
  const f = CL.phaseOf(S.cfg.pedidos, o.estado); if (f !== 'postpro' && f !== 'impresion') return false;
  const destino = CL.stateOfPhase(S.cfg.pedidos, 'empaquetar'); if (!destino || destino === o.estado) return false;
  try {
    const P = await import('./views/pedidos.js');
    const ok = await P.changeState(o, destino);
    if (ok) toast('📦 Todas las placas acabadas: pedido nº ' + o.numero + ' → ' + destino, 'ok', 6000);
    return !!ok;
  } catch (e) { return false; }
}

// ---------- «Este diseño tiene N placas» ----------
export function crearDialog(o, redraw) {
  const prod = byId('productos', o.productoId), sabe = prod && Number(prod.numPlacas) >= 2 ? Number(prod.numPlacas) : 0, cant = Math.max(1, Math.round(Number(o.cantidad)) || 1);
  let n = sabe || 2;
  const conocidos = CL.placasNombresLista(prod && prod.placasNombres), escritos = [];
  const num = h('b.cp-n', String(n)), tot = h('div.small.muted.cp-tot'), nom = h('div.cp-nombres');
  // «que NO se llamen Placa 1: gato y bandeja, figura y pájaro»: una casilla por placa, con lo que se sabe del diseño ya puesto
  const pintaNombres = () => {
    mount(nom, h('div.small.muted', '¿Qué lleva cada placa? (si quieres)'), Array.from({ length: n }, (_, i) => {
      const c = h('input.inp.cp-nom', { type: 'text', maxlength: 40, placeholder: CL.placaNombreCompleto ? CL.placaNombreCompleto((o.producto || 'Placa') + ' ' + (i + 1) + '/' + n, { color: o.color, material: prod && prod.material }) : 'Placa ' + (i + 1), value: escritos[i] !== undefined ? escritos[i] : (conocidos[i] || ''), 'aria-label': 'Nombre de la placa ' + (i + 1), 'data-i': i });
      c.addEventListener('input', () => { escritos[i] = c.value; });
      return c;
    }));
  };
  const pinta = () => { num.textContent = String(n); tot.textContent = cant > 1 ? n + ' placas × ' + cant + ' unidades = ' + Math.min(CL.PLACA_MAX, n * cant) + ' en total' : ''; pintaNombres(); };
  const mas = (k) => () => { n = Math.max(1, Math.min(CL.PLACA_MAX, n + k)); pinta(); };
  const rec = h('input', { type: 'checkbox', checked: !!prod, disabled: !prod, id: 'cp-rec' });
  pinta();
  const m = modal('🧩 ¿Cuántas placas tiene?', h('div.cp', { 'data-cp': '1' },
    h('p.sd-q', h('b', o.producto), sabe ? h('span.muted', ' · ya sé que lleva ' + sabe) : null),
    h('div.cp-paso', h('button.cp-b', { type: 'button', 'aria-label': 'Menos', onclick: mas(-1) }, '−'), num, h('button.cp-b', { type: 'button', 'aria-label': 'Más', onclick: mas(1) }, '+')), tot, nom,
    h('label.cp-rec', rec, ' Acordarme para este diseño (sus próximos pedidos ya salen con sus placas)')),
  close => [btn('Cancelar', close), btn('Crear placas', async ev => {
    const b = ev.currentTarget; b.disabled = true;
    try {
      const nombres = Array.from({ length: n }, (_, i) => (nom.querySelectorAll('.cp-nom')[i] || { value: '' }).value.trim());
      const r = await mutate('pedidos.placas', { id: o.id, porUnidad: n, nombres, recordar: !!rec.checked }, { label: 'Placas del pedido nº ' + o.numero, tables: ['pedidos'], onlineOnly: true });
      if (r && r.id) { upsertLocal('pedidos', r); emit(); }
      if (prod && rec.checked) { import('./store.js').then(s => s.pull()); }
      toast('🧩 ' + n + (cant > 1 ? ' × ' + cant : '') + ' placas creadas', 'ok'); close(); redraw && redraw();
    } catch (e) { b.disabled = false; falla(e, o); }
  }, { cls: 'primary' })], { size: 'narrow', noFocus: true });
  return m;
}

// ---------- El bloque de la ficha del pedido ----------
export function bloque(o, redraw, opts = {}) {
  const L = lista(o), ed = can('pedidos.editar'), f = fase(o), tocable = ['reserva', 'confirmado', 'impresion', 'postpro'].includes(f);
  const prev = avisoPrevias(o);
  if (!L.length) {
    if (!ed || !tocable) return prev;
    const prod = byId('productos', o.productoId), sabe = prod && Number(prod.numPlacas) >= 2 ? Number(prod.numPlacas) : 0;
    return h('div.pl-vacio', prev, btn(sabe ? '🧩 Este diseño lleva ' + sabe + ' placas · crearlas' : '🧩 Este diseño va en varias placas', () => crearDialog(o, redraw), { cls: 'sm pl-crear', title: 'Cada placa tendrá su propio estado: una en mesa y otra imprimiendo' }));
  }
  const R = CL.placasResumen(L);
  const desde = visto.has('b' + o.id) ? visto.get('b' + o.id) : 0; visto.set('b' + o.id, Math.max(R.pct, R.n ? 3 : 0));
  const barra = h('div.pl-barra', { role: 'progressbar', 'aria-valuenow': R.pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: desde + '%', background: colorAvance(R.pct) } }));
  requestAnimationFrame(() => requestAnimationFrame(() => { const i = barra.firstChild; if (i) i.style.width = Math.max(R.pct, R.n ? 3 : 0) + '%'; }));
  const fila = p => {
    const inf = CL.placaInfo(p.estado), sig = CL.placaSiguiente(p.estado), sa = CL.salidaLimpia(p.salida), caraSa = sa ? CL.SALIDA_V.find(x => x.k === sa.v) : null;
    const salta = CL.PLACA_ESTADOS.filter(x => x.k !== p.estado).map(x => ({ t: x.e + ' ' + x.t, on: () => ponerPlaca(o, p.id, x.k).then(() => redraw && redraw()) }));
    return h('div.pl-fila.' + p.estado, { 'data-placa': p.id, 'data-estado': p.estado },
      h('span.pl-ico' + (p.estado === 'imprimiendo' ? '.late' : ''), { style: { background: inf.c } }, inf.e),
      h('div.pl-info', h('b', p.nombre), h('span.pl-est', { style: { color: inf.c } }, inf.t),
        caraSa ? h('span.pl-sal.' + sa.v, { title: CL.salidaTexto(sa) }, caraSa.e + (sa.causas.length ? ' ' + sa.causas.map(k => CL.SALIDA_CAUSAS.find(z => z.k === k).e).join('') : '')) : null),
      ed && sig ? btn(ACCION[sig], () => ponerPlaca(o, p.id, sig).then(() => redraw && redraw()), { cls: 'pl-go' + (sig === 'en_mesa' ? ' primary' : '') }) : null,
      ed ? menu('', [].concat(salta, [
        { t: '✏️ Cambiar el nombre', on: async () => { const v = await promptDlg('Nombre de la placa', 'Nombre', p.nombre, { ok: 'Guardar' }); if (v === null || !v.trim()) return; try { const r = await mutate('pedidos.placa', { id: o.id, placaId: p.id, nombre: v.trim() }, { label: 'Nombre de placa', tables: ['pedidos'] }); if (r && r.id) { upsertLocal('pedidos', r); emit(); } redraw && redraw(); } catch (e) { falla(e, o); } } },
        { t: '🗑️ Quitar esta placa', danger: true, on: async () => { if (!await confirmDlg('Quitar placa', '«' + p.nombre + '» dejará de contar en este pedido.', 'Quitar', true)) return; try { const r = await mutate('pedidos.placa', { id: o.id, placaId: p.id, quitar: true }, { label: 'Quitar placa', tables: ['pedidos'], onlineOnly: true }); if (r && r.id) { upsertLocal('pedidos', r); emit(); } redraw && redraw(); } catch (e) { falla(e, o); } } }]),
        { cls: 'ghost icon pl-mas', title: 'Más: cambiar de estado, nombre, quitar' }) : null);
  };
  const empaqueta = ed && R.todasAcabadas && f === 'postpro' && opts.alEmpaquetar ? btn('📦 Todas acabadas · pasar a Empaquetar', () => opts.alEmpaquetar(), { cls: 'primary pl-emp' }) : null;
  return h('div.pl-card', { 'data-placas': R.n },
    prev,
    h('div.pl-cab', anillo(R.pct, 48, undefined, o.id), h('div.pl-cabt', h('b', '🧩 ' + R.n + (R.n === 1 ? ' placa' : ' placas')), h('span.pl-txt', R.texto))),
    barra,
    h('div.pl-filas', L.map(fila)),
    h('div.row.wrap.pl-pie', empaqueta,
      ed && tocable && L.length < CL.PLACA_MAX ? btn('+ Otra placa', async () => { try { const r = await mutate('pedidos.placa', { id: o.id, nueva: true }, { label: 'Placa nueva', tables: ['pedidos'], onlineOnly: true }); if (r && r.id) { upsertLocal('pedidos', r); emit(); } redraw && redraw(); } catch (e) { falla(e, o); } }, { cls: 'sm ghost' }) : null));
}

// ---------- Pedido SIN placas que pasa a «En mesa»: la misma pregunta ----------
// Devuelve true para seguir con el cambio, false para dejarlo como está.
export async function preguntaPedido(o) {
  if (!salidaActiva() || lista(o).length) return true;
  const r = await salidaDialog({ o, placa: null });
  if (!r) return false;
  if (r.salida) {
    try { const x = await mutate('pedidos.salida', Object.assign({ id: o.id }, r.salida), { label: 'Cómo salió · nº ' + o.numero, tables: ['pedidos'], optimistic: t => { const q = t.pedidos.find(p => p.id === o.id); if (q) q.salida = Object.assign({ fecha: new Date().toISOString(), por: (S.me && S.me.nombre) || '' }, r.salida); } }); if (x && x.id) { upsertLocal('pedidos', x); emit(); } }
    catch (e) { falla(e, o); if (viejo(e)) { servidorSinSalida = true; return true; } }
  }
  if (r.accion === 'repetir') { toast('🔁 Apuntado: hay que repetirla. El pedido no pasa a la mesa.', 'warn', 6000); return false; }
  return true;
}
