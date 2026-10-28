// ================= v16 · 📦 Inventario y compras =================
// UNA sola lista de materiales (la misma de «Materiales y costes» y de Embalaje) y las mismas bobinas del taller.
// Aquí se ve de un vistazo qué queda, qué se acaba y cuánto vale; y una compra se apunta con 3 datos.
// VALOR PREDETERMINADO → AUTOMÁTICO → EDITABLE.  Lo que no es exacto lleva la marca ESTIMADO.
import { h, mount, btn, modal, toast, eur, empty, field, inp, sel, pill, fdt, confirmDlg } from '../ui.js';
import { S, can, api, upsertLocal, emit, pull } from '../store.js';
import { handleError, requestAccess, go } from '../app.js';
import { avisosStock, revision, REV_ICO } from './hoy.js';

const CL = window.CL;
const n = v => Number(String(v === undefined || v === null ? '' : v).replace(',', '.')) || 0;
const lleno = v => v !== '' && v !== null && v !== undefined && isFinite(Number(v));
const UN = { ud: 'ud', g: 'g', kg: 'kg', m: 'm', cm: 'cm', mm: 'mm', ml: 'ml', l: 'l', m2: 'm²', cm2: 'cm²' };
const cant = (v, u) => (Math.round(n(v) * 100) / 100).toLocaleString('es-ES') + ' ' + (UN[u] || u || 'ud');
const fino = v => v === null || v === undefined ? '—' : (v < 0.1 ? v.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 4 }) + ' €' : eur(v));
const NIVEL = { agotado: ['⛔ Agotado', 'bad'], critico: ['🔴 Crítico', 'bad'], bajo: ['⚠️ Bajo', 'warn'] };
const ICONO = { caja: '📦', sobre: '✉️', bolsa: '🛍️', embalaje: '🎁', filamento: '🧵', material: '🧴', componente: '🔩', otro: '▫️' };
let pestana = 'resumen'; // se recuerda al volver (no se pierde la pestaña)

function nivelDe(m) { const nv = CL.nivelStock(m, S.cfg).nivel; return nv === 'sin' ? '' : nv; } // 26-10-2026: la regla única
const estimado = m => CL.norm(m.estadoStock) === 'estimado' || CL.norm(m.estadoCantidad) === 'estimado';
const activos = () => (S.t.materiales || []).filter(m => CL.norm(m.activo) !== 'no' && String(m.nombre || '').trim()); // (22-10: una fila sin nombre no es un material)

function grupos() {
  const g = {}, kg = n(((S.cfg || {}).precios || {}).costeKg), aviso = n(((S.cfg || {}).taller || {}).avisoColorGramos) || 300;
  (S.t.bobinas || []).forEach(b => {
    const mat = b.material || 'PLA', k = mat + '|' + (b.color || '');
    const x = g[k] || (g[k] = { clave: k, material: mat, color: b.color || '', colorHex: b.colorHex || '#ccc', gramos: 0, bobinas: [], estimado: false, valor: 0 });
    const r = Math.max(0, n(b.restante));
    x.bobinas.push(b); x.gramos += r; if (b.estimado === true || /^(s|true)/i.test(String(b.estimado || ''))) x.estimado = true;
    x.valor += lleno(b.precio) && n(b.peso) > 0 ? r * n(b.precio) / n(b.peso) : r * kg / 1000;
  });
  return Object.values(g).map(x => { x.nivel = x.gramos <= 0 ? 'agotado' : (x.gramos <= aviso / 2 ? 'critico' : (x.gramos <= aviso ? 'bajo' : 'ok')); return x; })
    .sort((a, b) => a.material.localeCompare(b.material, 'es') || a.color.localeCompare(b.color, 'es'));
}

export function render(el, params) {
  if (params && params[0]) pestana = params[0];
  const costes = can('productos.costes'), mover = can('stock.mover');
  const cuerpo = h('div'), tabs = h('div.tabs');
  el.append(
    h('a.alm-antigua', { href: '#/almacen' }, '📦 Para el día a día usa ', h('b', 'Mi almacén'), ' (comprar, contar, pendientes, entradas y salidas). Esta es la pantalla de antes, con el detalle de cada cosa. →'),
    h('div.page-head', h('div', h('h1', '📦 Inventario y compras'), h('div.muted.small', 'Lo que tienes, lo que se acaba y lo que vale. Se descuenta solo al imprimir y al empaquetar.')),
      h('div.row', mover ? btn('Compré…', () => compraRapida(), { cls: 'primary', icon: 'plus', title: 'Apunta una compra en segundos' }) : null)),
    tabs, cuerpo);
  const TABS = [['resumen', 'Resumen'], ['materiales', 'Embalaje y materiales'], ['filamento', 'Filamento'], ['compras', 'Compras y consumos'], costes ? ['estadisticas', 'Estadísticas'] : null].filter(Boolean);
  const cache = {};
  function draw() {
    if (!TABS.some(t => t[0] === pestana)) pestana = 'resumen';
    mount(tabs, TABS.map(t => h('button' + (pestana === t[0] ? '.on' : ''), { type: 'button', onclick: () => { pestana = t[0]; draw(); } }, t[1])));
    ({ resumen, materiales, filamento, compras, estadisticas })[pestana]();
  }
  const badge = m => { const nv = nivelDe(m); return NIVEL[nv] ? pill(NIVEL[nv][0], NIVEL[nv][1]) : null; };
  const est = () => h('span.est', { title: 'Dato ESTIMADO: no es exacto. Cámbialo cuando lo sepas.' }, 'ESTIMADO');

  function resumen() {
    const av = avisosStock(), mats = activos().filter(m => lleno(m.stock)), gr = grupos();
    let vM = 0, vF = 0, sinPrecio = 0;
    mats.forEach(m => { const c = CL.matCost(m).coste; if (c === null) sinPrecio++; else vM += n(m.stock) * c; });
    gr.forEach(g => { vF += g.valor; });
    const falta = !(S.cfg && S.cfg.v16 && S.cfg.v16.inventario) && !mats.length;
    const revCard = h('div.card.inv-rev', { style: { display: 'none' } }), pendCard = h('div.card.inv-pend', { style: { display: 'none' } });
    mount(cuerpo,
      falta && can('costes.editar') ? h('div.card', h('h3', 'Carga tu inventario'), h('p.small.muted', 'Cajas, sobres, bolsas, cinta, papel burbuja, kraft, laca, alcohol, aceite y tus bobinas, tal como los indicaste el 7-10-2026.'), btn('Cargar inventario inicial', cargarInicial, { cls: 'primary' })) : null,
      h('div.kpis.g4',
        h('div.kpi.static' + (av.some(a => a.nivel !== 'bajo') ? '.bad' : av.length ? '.warn' : '.ok'), h('span.n', String(av.length)), h('span.l', av.length === 1 ? 'Aviso de stock' : 'Avisos de stock')),
        h('div.kpi.static', h('span.n', String(mats.length)), h('span.l', 'Materiales con stock')),
        h('div.kpi.static', h('span.n', (Math.round(gr.reduce((a, g) => a + g.gramos, 0) / 100) / 10).toLocaleString('es-ES') + ' kg'), h('span.l', 'Filamento disponible')),
        costes ? h('div.kpi.static', h('span.n', eur(vM + vF)), h('span.l', 'Valor del stock'), h('span.tiny.muted', 'Materiales ' + eur(vM) + ' · filamento ' + eur(vF) + (sinPrecio ? ' · ' + sinPrecio + ' sin precio' : ''))) : null),
      h('div.card',
        h('h3', av.length ? 'Se está acabando' : '✅ Todo en orden'),
        av.length ? h('div.inv-avisos', av.map(a => h('div.inv-aviso.' + a.nivel,
          h('b', (NIVEL[a.nivel] || ['', ''])[0].toUpperCase()), h('span.grow', a.nombre + ': ', h('b', a.nivel === 'agotado' ? 'no queda' : a.queda.toLocaleString('es-ES') + ' ' + (UN[a.unidad] || a.unidad) + (a.queda === 1 ? ' restante' : ' restantes'))),
          mover ? btn('Compré…', () => a.tipo === 'filamento' ? compraRapida({ filamento: a.id }) : compraRapida({ id: a.id }), { cls: 'sm' }) : null)))
          : h('p.small.muted', 'Ningún material está por debajo de su aviso. Los límites se cambian en cada material.')),
      pendCard, revCard,
      h('p.tiny.muted', 'El stock baja solo: el filamento al imprimir (con la cola o al pasar el pedido a «En mesa»), la caja/sobre/bolsa, la cinta y los papeles al cerrar el paquete, y el alcohol con cada lavado.'));
    pintarPendientes(pendCard);
    // (las compras con importe raro ya salen arriba, en Pendientes: aquí no se repiten)
    revision(true).then(r => { r = Object.assign({}, r, { lista: r.lista.filter(x => x.enlace !== 'inventario/compras') }); if (!revCard.isConnected || !r.lista.length) return; const T = { incoherencia: 'No cuadra', falta: 'Falta', estimado: 'Estimado' };
      mount(revCard, h('details.more', h('summary', '🧠 Revisión (opcional): ' + r.lista.length + (r.lista.length === 1 ? ' dato' : ' datos') + ' que podrías afinar cuando quieras'), h('div.in', h('p.tiny.muted', 'Nada de esto impide trabajar. Son datos que faltan o que son una estimación.'),
        r.lista.map(x => h('div.rev-i.' + x.nivel, { onclick: () => go(x.enlace.indexOf('pedido:') === 0 ? 'pedidos/' + x.enlace.slice(7) : (x.enlace || 'inventario')) }, h('span', REV_ICO[x.nivel]), h('b.rev-t', T[x.nivel]), h('span.grow.small', x.texto)))))); revCard.style.display = ''; });
  }

  // 22-10-2026 · PENDIENTES con su ORIGEN y su PRUEBA. Los demostrables se cierran con un botón (con nota e historial);
  // los que necesitan un dato tuyo dicen cuál y dónde se escribe. Nada se marca como hecho «porque sí».
  async function pintarPendientes(card) {
    let r; try { r = await api('inventario.pendientes', {}, { quiet: true }); } catch (e) {
      if (servidorViejo(e) && card.isConnected) { mount(card, h('h3', '🧹 Pendientes del inventario'), h('p.small.muted', SERVIDOR_VIEJO)); card.style.display = ''; }
      return;
    }
    if (!card.isConnected || (!r.resueltos.length && !r.abiertos.length)) return;
    const puede = can('costes.editar'), elegidos = new Set(r.resueltos.map(x => x.clave));
    const cerrar = async ev => {
      const bt = ev.target.closest('button'); bt.disabled = true;
      try {
        const x = await api('inventario.cerrarPendientes', { claves: [...elegidos] }); await pull();
        const packs = x.cerrados.reduce((a, c) => a + (c.creados || []).length, 0);
        toast('Cerrados: ' + x.cerrados.length + (packs ? ' · packs creados: ' + packs : ''), 'ok', 6000); tras();
      } catch (e) { handleError(e); bt.disabled = false; }
    };
    const item = (x, res) => h('div.pend-i' + (res ? '.ok' : ''),
      res && puede ? h('input', { type: 'checkbox', checked: true, onchange: e => { e.target.checked ? elegidos.add(x.clave) : elegidos.delete(x.clave); } }) : h('span', res ? '✅' : '❓'),
      h('div.grow', h('b.small', x.titulo), h('div.tiny.muted', x.origen), res ? h('div.tiny', '✔ ' + x.prueba + ' → ' + x.accion) : h('div.tiny.warn-t', 'Falta: ' + x.falta)),
      x.compra && mover ? btn('✏️ Corregir', () => abrirCompra(x.compra), { cls: 'sm' }) : null);
    const abiertos = h('details.more', h('summary', r.abiertos.length + (r.abiertos.length === 1 ? ' necesita un dato tuyo' : ' necesitan un dato tuyo') + ' (no se cierran solos)'), h('div.in', r.abiertos.map(x => item(x, false))));
    if (!r.resueltos.length) abiertos.open = true;
    mount(card, h('h3', '🧹 Pendientes del inventario'),
      r.resueltos.length ? h('div', h('p.small', h('b', r.resueltos.length + (r.resueltos.length === 1 ? ' ya está resuelto' : ' ya están resueltos')), ' según tus propios datos (en cada uno se ve la prueba):'),
        r.resueltos.map(x => item(x, true)), puede ? h('div.row', { style: { marginTop: '6px' } }, btn('Cerrar los marcados', cerrar, { cls: 'primary sm', icon: 'check' }), h('span.tiny.muted', 'Nada se borra: queda una nota y el historial.')) : null) : null,
      r.abiertos.length ? abiertos : null);
    card.style.display = '';
  }
  async function abrirCompra(id) {
    try { if (!cache.mov) cache.mov = await api('materiales.movimientos', { limite: 300 }); } catch (e) { return handleError(e); }
    const x = cache.mov.movimientos.find(m => m.id === id); if (x) corregirCompra(x, tras); else toast('No encuentro esa compra', 'warn');
  }

  function materiales() {
    const all = activos(), con = all.filter(m => lleno(m.stock)), sin = all.filter(m => !lleno(m.stock) && ['caja', 'sobre', 'bolsa', 'embalaje', 'material'].includes(m.tipo));
    const cats = {};
    con.forEach(m => { const c = m.categoria || 'Otros'; (cats[c] = cats[c] || []).push(m); });
    const fila = m => {
      const mc = CL.matCost(m), u = m.unidad || 'ud', porRollo = u !== 'ud' && n(m.cantidad) > 0;
      return h('div.inv-fila' + (nivelDe(m) !== 'ok' && nivelDe(m) ? '.' + nivelDe(m) : ''),
        h('span.ic', ICONO[m.tipo] || '▫️'),
        h('div.grow',
          h('div.bold', m.nombre, ' ', badge(m), estimado(m) ? est() : null),
          h('div.tiny.muted',
            costes ? (mc.coste === null ? h('span.warn-t', 'Precio pendiente: ' + mc.falta.join(', ')) : fino(mc.coste) + ' / ' + (UN[u] || u) + (porRollo ? ' · ' + eur(m.precio) + ' cada ' + cant(m.cantidad, u) : '')) : '',
            lleno(m.stockMin) ? ' · avisa con ' + cant(m.stockMin, u) : '')),
        h('div.inv-st', h('b', cant(m.stock, u)), porRollo && n(m.stock) > 0 ? h('span.tiny.muted', '≈ ' + (Math.round(n(m.stock) / n(m.cantidad) * 10) / 10).toLocaleString('es-ES') + (n(m.stock) / n(m.cantidad) === 1 ? ' rollo/bote' : ' rollos/botes')) : null),
        mover ? h('div.row.inv-act',
          btn('Compré', () => compraRapida({ id: m.id }), { cls: 'sm primary' }),
          btn('Tengo…', () => recuento(m), { cls: 'sm', title: 'Contar: pon lo que hay de verdad' }),
          u !== 'ud' ? btn('Usé…', () => usar(m), { cls: 'sm', title: 'Apuntar un consumo a mano' }) : null,
          can('costes.editar') ? btn('', () => ajustes(m), { cls: 'sm ghost icon', icon: 'settings', title: 'Avisos, metros reales y precio' }) : null) : null);
    };
    mount(cuerpo,
      !con.length ? empty('box', 'Todavía no hay stock apuntado', 'Pulsa «Compré…» y apunta lo que tienes: qué, cuántos y cuánto pagaste.', can('costes.editar') ? btn('Cargar inventario inicial', cargarInicial, { cls: 'primary' }) : null) : null,
      Object.keys(cats).sort((a, b) => (a === 'Embalaje' ? -1 : b === 'Embalaje' ? 1 : a.localeCompare(b, 'es'))).map(c => h('div.card.inv-card', h('h3', c), cats[c].sort((a, b) => String(a.tipo + a.nombre).localeCompare(String(b.tipo + b.nombre), 'es')).map(fila))),
      sin.length ? h('details.more', h('summary', sin.length + ' materiales sin cantidad apuntada'), h('div.in', sin.map(m => h('div.inv-fila', h('span.ic', ICONO[m.tipo] || '▫️'), h('div.grow', h('div.bold', m.nombre), h('div.tiny.muted', 'No se sabe cuánto hay (no se inventa).')),
        mover ? btn('Tengo…', () => recuento(m), { cls: 'sm' }) : null)))) : null,
      lavadoCard());
  }
  function lavadoCard() {
    const l = Object.assign({ cada: 4, ml: 10, mlEstimado: true, cuenta: 0, lavados: 0 }, ((S.cfg || {}).taller || {}).lavado || {});
    const editar = () => {
      const fc = inp({ type: 'number', min: 1, max: 100, step: 1, value: l.cada }), fm = inp({ type: 'number', min: 0, step: 1, value: l.ml }), msg = h('p.bad-t');
      const m = modal('🧼 Lavado de la placa', h('div', h('div.form', field('Un lavado cada… impresiones', fc), field('Alcohol por lavado (ml)', fm, l.mlEstimado !== false ? 'Ahora es una ESTIMACIÓN. Al guardar tu dato deja de serlo.' : null)), msg),
        close => [btn('Cancelar', close), btn('Guardar', async ev => { ev.target.closest('button').disabled = true; try { await api('taller.lavado', { cada: n(fc.value), ml: n(fm.value) }); await pull(); toast('Guardado', 'ok'); m.close(); draw(); } catch (e) { msg.textContent = e.message || String(e); ev.target.closest('button').disabled = false; } }, { cls: 'primary' })]);
    };
    return h('div.card.inv-card', h('h3', '🧼 Lavado de la placa'),
      h('div.inv-fila', h('span.ic', '🫧'), h('div.grow', h('div.bold', '1 lavado cada ' + l.cada + ' impresiones · ' + l.ml + ' ml de alcohol ', l.mlEstimado !== false ? est() : null),
        h('div.tiny.muted', 'Llevas ' + (l.cuenta || 0) + ' de ' + l.cada + ' impresiones desde el último lavado · ' + (l.lavados || 0) + ' lavados apuntados. Se descuenta solo.')),
        can('taller.editar') ? h('div.row.inv-act', btn('He lavado ahora', async () => { try { await api('taller.lavado', { lavarAhora: true }); await pull(); toast('Lavado apuntado', 'ok'); draw(); } catch (e) { handleError(e); } }, { cls: 'sm' }), btn('Cambiar', editar, { cls: 'sm' })) : null));
  }

  function filamento() {
    const gr = grupos();
    mount(cuerpo,
      h('p.small.muted', 'Lo que importa: material, color y gramos disponibles. Cada impresión terminada descuenta sus gramos de la bobina que usó.'),
      !gr.length ? empty('cube', 'No hay bobinas apuntadas', 'Pulsa «Compré…» → Filamento, o carga el inventario inicial.', mover ? btn('Compré filamento', () => compraRapida({ filamento: 'PLA|' }), { cls: 'primary' }) : null) : null,
      h('div.inv-fil', gr.map(g => h('div.inv-color' + (g.nivel !== 'ok' ? '.' + g.nivel : ''),
        h('div.row', h('i.dot', { style: { background: g.colorHex } }), h('b.grow', g.material + ' ' + g.color), NIVEL[g.nivel] ? pill(NIVEL[g.nivel][0], NIVEL[g.nivel][1]) : null),
        h('div.inv-g', Math.round(g.gramos).toLocaleString('es-ES') + ' g', g.estimado ? est() : null),
        h('div.tiny.muted', g.bobinas.filter(b => n(b.restante) > 0).length + ' bobina(s)' + (costes ? ' · ' + eur(g.valor) : '')),
        h('div.inv-bobs', g.bobinas.filter(b => n(b.restante) > 0).sort((a, b) => n(a.restante) - n(b.restante)).map(b => {
          const e = b.estimado === true || /^(s|true)/i.test(String(b.estimado || ''));
          return h('button.inv-bob', { type: 'button', title: (b.marca ? b.marca + ' · ' : '') + (e ? 'Peso estimado: pulsa para poner el real' : 'Pulsa para corregir el peso'), onclick: () => pesar(b) },
            h('span.bar', h('i', { style: { width: Math.max(4, Math.min(100, Math.round(n(b.restante) / Math.max(1, n(b.peso)) * 100))) + '%', background: g.colorHex } })), h('span', Math.round(n(b.restante)) + ' g' + (e ? ' ≈' : '')));
        })),
        mover ? btn('Compré', () => compraRapida({ filamento: g.clave }), { cls: 'sm' }) : null))),
      can('taller.ver') ? h('p.tiny.muted', 'Más detalle de cada bobina (marca, ubicación) en ', h('a', { href: '#/taller/filamento' }, 'Impresión → Filamento'), '.') : null,
      can('costes.editar') ? h('div.row', { style: { marginTop: '8px' } }, btn('Volver a cargar el inventario del 7-10-2026', cargarInicial, { cls: 'sm ghost', title: 'Pone al día los materiales y añade los colores de filamento que falten. Te pregunta antes de sustituir tus bobinas.' })) : null);
  }
  function pesar(b) {
    if (!can('taller.editar')) return requestAccess('taller.editar', 'taller');
    const f = inp({ type: 'number', min: 0, step: 1, value: Math.round(n(b.restante)) }), msg = h('p.bad-t');
    const m = modal('⚖️ ' + (b.material || 'PLA') + ' ' + (b.color || ''), h('div', h('div.form', field('Gramos que quedan de verdad', f, 'Bobina de ' + n(b.peso) + ' g. Al guardar deja de estar marcada como estimada.')), msg),
      close => [btn('Cancelar', close), btn('Guardar', async ev => {
        const bt = ev.target.closest('button'); bt.disabled = true;
        try { const r = await api('bobinas.guardar', { id: b.id, datos: { restante: n(f.value), estimado: false } }); (r || []).forEach(x => upsertLocal('bobinas', x)); emit(); toast('Peso guardado', 'ok'); m.close(); draw(); }
        catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
      }, { cls: 'primary' })]);
  }

  async function compras() {
    if (!cache.mov) { mount(cuerpo, h('p.muted', 'Cargando…')); try { cache.mov = await api('materiales.movimientos', { limite: 300 }); } catch (e) { handleError(e); cache.mov = { movimientos: [] }; } if (pestana !== 'compras') return; }
    const mv = cache.mov.movimientos, T = { compra: ['🛒 Compra', 'ok'], consumo: ['Consumo', ''], recuento: ['Recuento', ''], inicial: ['Inventario inicial', ''] };
    const corrige = costes && mover; // 22-10-2026: una compra mal apuntada se corrige aquí (no se crea otra)
    mount(cuerpo, !mv.length ? empty('box', 'Sin movimientos todavía', 'Cada compra, cada caja usada y cada lavado quedarán aquí.') :
      h('div.card', h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'Cuándo'), h('th', 'Material'), h('th', 'Qué pasó'), h('th', { style: { textAlign: 'right' } }, 'Cambio'), h('th.hide-m', { style: { textAlign: 'right' } }, 'Queda'), costes ? h('th', { style: { textAlign: 'right' } }, 'Importe') : null, corrige ? h('th') : null)),
        h('tbody', mv.map(x => h('tr', h('td.small.muted', fdt(x.fecha)), h('td.bold', x.material), h('td.small', (T[x.tipo] ? pill(T[x.tipo][0], T[x.tipo][1]) : null), / · corregida /.test(x.motivo || '') ? [' ', pill('✏️ corregida', '')] : null, ' ', x.motivo || '', x.pedido ? ' · nº ' + x.pedido : ''),
          h('td', { style: { textAlign: 'right' } }, h('b' + (n(x.cambio) < 0 ? '.bad-t' : '.ok-t'), (n(x.cambio) > 0 ? '+' : '') + (Math.round(n(x.cambio) * 100) / 100).toLocaleString('es-ES'))), h('td.hide-m', { style: { textAlign: 'right' } }, (Math.round(n(x.despues) * 100) / 100).toLocaleString('es-ES')),
          costes ? h('td', { style: { textAlign: 'right' } }, lleno(x.importe) ? fino(n(x.importe)) : '—') : null,
          corrige ? h('td', x.tipo === 'compra' ? btn('', () => corregirCompra(x, tras), { cls: 'sm ghost icon', icon: 'edit', title: 'Corregir esta compra (importe, cuántos, fecha…)' }) : null) : null)))))),
      corrige && mv.some(x => x.tipo === 'compra') ? h('p.tiny.muted', '✏️ = corregir una compra mal apuntada: se arregla ella misma (no se crea otra) y con ella el stock, el coste por unidad, los packs, los costes de productos y las estadísticas.') : null);
  }

  async function estadisticas() {
    if (!cache.est) { mount(cuerpo, h('p.muted', 'Calculando…')); try { cache.est = await api('estadisticas.materiales', {}); } catch (e) { handleError(e); return; } if (pestana !== 'estadisticas') return; }
    const s = cache.est, dato = (t, v, sub) => h('div.kpi.static', h('span.n', v), h('span.l', t), sub ? h('span.tiny.muted', sub) : null);
    const lista = (t, rows, f, vacio) => h('div.card', h('h3', t), rows.length ? rows.map(f) : h('p.small.muted', vacio));
    mount(cuerpo,
      h('p.small.muted', 'Datos reales de este mes. Lo que todavía no tiene datos sale vacío: no se rellena con nada inventado.'),
      h('div.kpis.g4',
        dato('Material más usado', s.materialMasUsado ? s.materialMasUsado.nombre : '—', s.materialMasUsado ? s.materialMasUsado.veces + ' veces' : 'sin consumos aún'),
        dato('Color más usado', s.colorMasUsado ? s.colorMasUsado.nombre : '—', s.colorMasUsado ? s.colorMasUsado.gramos + ' g' : 'sin impresiones aún'),
        dato('Embalaje más usado', s.embalajeMasUsado ? s.embalajeMasUsado.nombre : '—', s.embalajeMasUsado ? s.embalajeMasUsado.veces + ' pedidos' : ''),
        dato('Valor del stock', eur(s.valorStock.total))),
      h('div.kpis.g4',
        dato('Coste medio de embalaje', s.costeMedioEmbalaje === null ? '—' : eur(s.costeMedioEmbalaje)),
        dato('Coste medio por pedido', s.costeMedioPedido === null ? '—' : eur(s.costeMedioPedido), s.pedidosConCoste + ' de ' + s.pedidos + ' pedidos con coste'),
        dato('Beneficio medio', s.beneficioMedio === null ? '—' : eur(s.beneficioMedio)),
        dato('Gastado en compras', eur(s.gastoCompras), 'Consumido: ' + eur(s.consumoImporte) + ' · filamento ' + s.gramosFilamento + ' g')),
      h('div.ing-grid',
        lista('🏆 Productos más rentables', s.rentables, p => h('div.ing-fila', h('span', p.producto, h('span.tiny.muted', ' · ' + p.unidades + ' ud')), h('b', eur(p.beneficio))), 'Aún no hay pedidos con coste este mes.'),
        lista('🧵 Productos que más filamento gastan', s.mayorConsumo, p => h('div.ing-fila', h('span', p.producto, h('span.tiny.muted', ' · ' + p.unidades + ' ud')), h('b', p.gramos + ' g')), 'Falta apuntar los gramos de cada producto.')),
      h('div.ing-grid',
        lista('Consumo del mes', s.usados, u => h('div.ing-fila', h('span', u.nombre, h('span.tiny.muted', ' · ' + u.veces + ' veces')), h('b', cant(u.cantidad, u.unidad))), 'Sin consumos este mes.'),
        lista('Filamento por color', s.colores, c => h('div.ing-fila', h('span', c.nombre), h('b', c.gramos + ' g')), 'Sin impresiones cerradas este mes.')));
  }

  async function cargarInicial() {
    // v16: avisa de lo que hace. Vuelve a poner las cantidades del 7-10-2026: lo gastado o comprado después se pierde (queda en el historial).
    if (activos().some(m => lleno(m.stock)) && !(await confirmDlg('Volver al inventario del 7-10-2026', 'Las cajas, sobres, bolsas, cinta, burbuja, kraft, laca y alcohol vuelven a las cantidades y precios que indicaste ese día. Lo que hayas gastado o comprado después deja de contar (queda apuntado en el historial como recuento). ¿Seguir?', 'Sí, volver a ese inventario', true))) return;
    const hay = (S.t.bobinas || []).length;
    let reemplazar = false;
    if (hay) reemplazar = await confirmDlg('¿Y el filamento?', 'Ya tienes ' + hay + ' bobinas apuntadas. «Sustituir» las cambia por las del inventario del 7-10-2026 (PLA blanco 5.300 g, 7 colores más y TPU rojo). «Cancelar» conserva las tuyas y solo añade los colores que falten.', 'Sustituir');
    try { const r = await api('inventario.cargarInicial', { reemplazarFilamento: !!reemplazar }); await pull(true); toast('Inventario cargado: ' + r.cambios.length + ' cambios', 'ok'); draw(); } catch (e) { handleError(e); }
  }
  function tras() { cache.mov = null; cache.est = null; draw(); }
  function recuento(m) {
    const u = m.unidad || 'ud', f = inp({ type: 'number', min: 0, step: 'any', value: lleno(m.stock) ? m.stock : '' }), msg = h('p.bad-t');
    const md = modal('Tengo… · ' + m.nombre, h('div', h('div.form', field('Cuánto hay de verdad (' + (UN[u] || u) + ')', f, lleno(m.stock) ? 'Ahora pone ' + cant(m.stock, u) + '.' : 'Todavía no hay nada apuntado.')), msg),
      close => [btn('Cancelar', close), btn('Guardar', async ev => {
        if (f.value === '') { msg.textContent = 'Escribe una cantidad.'; return; }
        const bt = ev.target.closest('button'); bt.disabled = true;
        try {
          let r;
          if (lleno(m.stock)) r = await api('materiales.stock', { id: m.id, nuevo: n(f.value), motivo: 'Recuento' });
          else r = await api('materiales.guardar', { id: m.id, datos: { stock: n(f.value) }, motivo: 'Stock inicial' });
          if (CL.norm(m.estadoStock) === 'estimado') r = await api('materiales.guardar', { id: m.id, datos: { estadoStock: 'confirmado' } });
          upsertLocal('materiales', r.material); emit(); toast('Stock actualizado', 'ok'); md.close(); tras();
        } catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
      }, { cls: 'primary' })]);
  }
  function usar(m) {
    const u = m.unidad || 'ud', f = inp({ type: 'number', min: 0, step: 'any', placeholder: 'Ej.: 20' }), mo = inp({ placeholder: 'Opcional: para qué' }), msg = h('p.bad-t'), pre = h('p.small.muted');
    const mc = CL.matCost(m);
    f.addEventListener('input', () => { pre.textContent = n(f.value) > 0 ? 'Quedarán ' + cant(Math.max(0, n(m.stock) - n(f.value)), u) + (costes && mc.coste !== null ? ' · coste de este uso: ' + fino(n(f.value) * mc.coste) : '') : ''; });
    const md = modal('Usé… · ' + m.nombre, h('div', h('div.form', field('Cuánto has usado (' + (UN[u] || u) + ')', f), field('Para qué', mo)), pre, msg),
      close => [btn('Cancelar', close), btn('Apuntar', async ev => {
        const bt = ev.target.closest('button'); bt.disabled = true;
        try { const r = await api('materiales.usar', { id: m.id, cantidad: n(f.value), motivo: mo.value.trim() }); upsertLocal('materiales', r.material); emit(); toast('Apuntado', 'ok'); md.close(); tras(); }
        catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
      }, { cls: 'primary' })]);
  }
  function ajustes(m) {
    const u = m.unidad || 'ud', esEst = CL.norm(m.estadoCantidad) === 'estimado';
    const f = { min: inp({ type: 'number', min: 0, step: 'any', value: lleno(m.stockMin) ? m.stockMin : '' }), cri: inp({ type: 'number', min: 0, step: 'any', value: lleno(m.stockCritico) ? m.stockCritico : '' }),
      trae: inp({ type: 'number', min: 0, step: 'any', value: lleno(m.cantidad) ? m.cantidad : '' }), precio: inp({ type: 'number', min: 0, step: 0.01, value: lleno(m.precio) ? m.precio : '' }) };
    const msg = h('p.bad-t');
    const md = modal('⚙️ ' + m.nombre, h('div', h('div.form',
      field('⚠️ Avisar (stock bajo) si quedan', f.min, 'En ' + (UN[u] || u) + '.'), field('🔴 Crítico si quedan', f.cri, 'Vacío = la mitad del aviso.'),
      u !== 'ud' ? field('Lo que trae cada rollo / bote (' + (UN[u] || u) + ')', f.trae, esEst ? 'Ahora es una ESTIMACIÓN. Si escribes el dato real, deja de serlo y el coste por ' + (UN[u] || u) + ' se recalcula.' : null) : null,
      field(u !== 'ud' ? 'Precio de cada rollo / bote (€)' : 'Precio por unidad (€)', f.precio, !lleno(m.precio) ? 'Precio PENDIENTE: no se inventa.' : null)), msg),
      close => [btn('Más opciones', () => { md.close(); import('./costes.js').then(c => c.matForm(m)); }, { cls: 'ghost' }), h('span.grow'), btn('Cancelar', close), btn('Guardar', async ev => {
        const bt = ev.target.closest('button'); bt.disabled = true;
        const datos = { stockMin: f.min.value === '' ? '' : n(f.min.value), stockCritico: f.cri.value === '' ? '' : n(f.cri.value) };
        if (f.precio.value !== '' && n(f.precio.value) !== n(m.precio)) { datos.precio = n(f.precio.value); datos.estadoPrecio = 'confirmado'; }
        if (u !== 'ud' && f.trae.value !== '' && n(f.trae.value) !== n(m.cantidad)) {
          datos.cantidad = n(f.trae.value); datos.estadoCantidad = 'confirmado';
          // el stock estaba en metros estimados: se convierte a los metros reales (mismos rollos)
          if (CL.norm(m.estadoStock) === 'estimado' && n(m.cantidad) > 0 && lleno(m.stock)) { datos.stock = Math.round(n(m.stock) / n(m.cantidad) * n(f.trae.value) * 1000) / 1000; datos.estadoStock = 'confirmado'; }
        }
        try { const r = await api('materiales.guardar', { id: m.id, datos, motivo: 'Ajuste desde Inventario' }); upsertLocal('materiales', r.material); emit(); toast('Guardado', 'ok'); md.close(); tras(); }
        catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
      }, { cls: 'primary' })]);
  }
  render.refrescar = tras;
  draw();
  // v16 · estabilidad: solo se repinta si cambia el inventario (y nunca mientras hay una ventana abierta encima)
  const firma = () => JSON.stringify([(S.t.materiales || []).map(m => [m.id, m.stock, m.version]), (S.t.bobinas || []).map(b => [b.id, b.restante, b.estimado]), ((S.cfg || {}).taller || {}).lavado]);
  let ult = firma();
  return { update() { const f = firma(); if (f === ult || document.querySelector('.overlay')) return; ult = f; const sc = document.scrollingElement, y = sc ? sc.scrollTop : 0; cache.mov = null; draw(); if (sc && y) sc.scrollTop = y; } };
}

// ---------- COMPRA RÁPIDA: qué · cuántos · cuánto pagué ----------
// opt: { id } (material ya elegido) · { filamento: 'PLA|Blanco' }
export function compraRapida(opt = {}) {
  if (!can('stock.mover')) return requestAccess('stock.mover', 'stock');
  const costes = can('productos.costes');
  const mats = activos().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  let modo = opt.filamento !== undefined ? 'filamento' : 'material';
  const fil = String(opt.filamento || 'PLA|').split('|');
  const f = {
    que: inp({ list: 'dl-compra', placeholder: 'Ej.: Caja 30 × 20 cm, cinta, alcohol…', value: opt.id ? (mats.find(m => m.id === opt.id) || {}).nombre || '' : '', autocomplete: 'off' }),
    uds: inp({ type: 'number', min: 0, step: 'any', placeholder: '2', inputmode: 'decimal' }),
    total: inp({ type: 'number', min: 0, step: 0.01, placeholder: '4,80', inputmode: 'decimal' }),
    trae: inp({ type: 'number', min: 0, step: 'any', inputmode: 'decimal' }),
    unidad: sel([{ v: 'ud', t: 'unidades' }, { v: 'm', t: 'metros' }, { v: 'g', t: 'gramos' }, { v: 'ml', t: 'mililitros' }], 'ud'),
    fmat: sel([...new Set(['PLA', 'PETG', 'TPU', 'ABS', 'ASA', fil[0] || 'PLA'])], fil[0] || 'PLA'),
    fcolor: inp({ list: 'dl-compra-col', placeholder: 'Ej.: Blanco', value: fil[1] || '' }),
    fpeso: inp({ type: 'number', min: 1, step: 50, value: 1000 })
  };
  const pre = h('div.compra-pre'), msg = h('p.bad-t'), cuerpo = h('div'), modos = h('div.seg');
  const elegido = () => mats.find(m => CL.norm(m.nombre) === CL.norm(f.que.value)) || null;
  let tocadoTrae = false;
  f.trae.addEventListener('input', () => { tocadoTrae = true; calc(); });
  function calc() {
    msg.textContent = '';
    const uds = n(f.uds.value), total = n(f.total.value), hayTotal = f.total.value !== '';
    if (modo === 'filamento') {
      const peso = n(f.fpeso.value) || 1000;
      mount(pre, uds > 0 && hayTotal ? [h('div', '→ ', h('b', eur(total / uds)), ' por bobina · ', h('b', fino(total / (uds * peso))), ' por gramo'), h('div', '→ entran ', h('b', (uds * peso).toLocaleString('es-ES') + ' g'), ' de ' + f.fmat.value + ' ' + (f.fcolor.value || '…'))] : h('span.muted', 'Escribe cuántas bobinas y cuánto pagaste.'));
      return;
    }
    const m = elegido(), u = m ? (m.unidad || 'ud') : f.unidad.value;
    const conMedida = u !== 'ud';
    campoTrae.style.display = conMedida ? '' : 'none'; campoUnidad.style.display = m ? 'none' : '';
    if (m && conMedida && !tocadoTrae) f.trae.value = lleno(m.cantidad) ? m.cantidad : '';
    const esEst = m && conMedida && !tocadoTrae && CL.norm(m.estadoCantidad) === 'estimado';
    etiTrae.textContent = 'Cada uno trae (' + (UN[u] || u) + ')' + (esEst ? ' · ESTIMADO' : '');
    if (!(uds > 0) || !hayTotal) { mount(pre, h('span.muted', m ? 'Tienes ' + (lleno(m.stock) ? cant(m.stock, u) : 'sin apuntar') + '.' : 'Si no existe, se crea solo con estos datos.')); return; }
    const trae = conMedida ? (n(f.trae.value) || 0) : 1;
    if (conMedida && !(trae > 0)) { mount(pre, h('span.warn-t', 'Falta lo que trae cada uno (' + (UN[u] || u) + '). Si no lo sabes, pon una estimación: quedará marcada como ESTIMADA.')); return; }
    const entra = uds * trae, antes = m && lleno(m.stock) ? Math.max(0, n(m.stock)) : 0, cAntes = m ? CL.matCost(m).coste : null;
    const nuevo = total / entra, medio = antes > 0 && cAntes !== null ? (antes * cAntes + total) / (antes + entra) : nuevo;
    mount(pre,
      h('div', '→ ', h('b', eur(total / uds)), conMedida ? ' cada uno · ' : ' por unidad', conMedida ? [h('b', fino(nuevo)), ' por ' + (UN[u] || u), esEst ? h('span.est', 'ESTIMADO') : null] : null),
      h('div', '→ stock: ', h('b', cant(antes, u)), ' → ', h('b', cant(antes + entra, u))),
      costes && antes > 0 && cAntes !== null && Math.abs(medio - nuevo) > 0.00005 ? h('div', '→ coste medio: ', h('b', fino(medio)), ' por ' + (UN[u] || u), h('span.tiny.muted', ' (antes ' + fino(cAntes) + ')')) : null,
      !m ? h('div.tiny.muted', 'Material nuevo: se crea con este nombre.') : null);
  }
  const etiTrae = h('span'), campoTrae = h('div.field', h('label', etiTrae), f.trae), campoUnidad = field('Se mide en', f.unidad);
  [f.que, f.uds, f.total, f.unidad, f.fmat, f.fcolor, f.fpeso].forEach(x => x.addEventListener('input', () => { if (x === f.que) tocadoTrae = false; calc(); }));
  f.unidad.addEventListener('change', calc);
  function pintar() {
    mount(modos, [['material', '📦 Embalaje y materiales'], ['filamento', '🧵 Filamento']].map(x => h('button' + (modo === x[0] ? '.on' : ''), { type: 'button', onclick: () => { modo = x[0]; pintar(); } }, x[1])));
    mount(cuerpo, modo === 'filamento'
      ? h('div.form', field('Material', f.fmat), field('Color *', f.fcolor), field('Cuántas bobinas *', f.uds), field('Pagué en total (€) *', f.total), field('Gramos por bobina', f.fpeso, 'Normalmente 1.000 g.'))
      : h('div.form', field('¿Qué compraste? *', f.que, null, 'full'), field('Cuántos *', f.uds), field('Pagué en total (€) *', f.total), campoTrae, campoUnidad));
    calc();
  }
  const body = h('div',
    h('datalist', { id: 'dl-compra' }, mats.map(m => h('option', { value: m.nombre }))),
    h('datalist', { id: 'dl-compra-col' }, [...new Set((S.t.bobinas || []).map(b => b.color).filter(Boolean))].map(c => h('option', { value: c }))),
    modos, cuerpo, pre, msg);
  const md = modal('🛒 Compré…', body, close => [btn('Cancelar', close), btn('Apuntar compra', guardar, { cls: 'primary', icon: 'check' })]);
  pintar();
  async function guardar(ev) {
    const uds = n(f.uds.value), bt = ev.target.closest('button');
    if (!(uds > 0)) { msg.textContent = 'Indica cuántos has comprado.'; f.uds.focus(); return; }
    if (f.total.value === '') { msg.textContent = 'Indica cuánto has pagado en total.'; f.total.focus(); return; }
    bt.disabled = true;
    try {
      if (modo === 'filamento') {
        if (!f.fcolor.value.trim()) { msg.textContent = 'Indica el color.'; bt.disabled = false; f.fcolor.focus(); return; }
        const peso = n(f.fpeso.value) || 1000;
        const r = await api('bobinas.guardar', { unidades: Math.round(uds), datos: { material: f.fmat.value, color: f.fcolor.value.trim(), peso, restante: peso, precio: Math.round(n(f.total.value) / uds * 100) / 100 } });
        (r || []).forEach(x => upsertLocal('bobinas', x)); emit();
        toast('🧵 ' + Math.round(uds) + ' bobina(s) de ' + f.fmat.value + ' ' + f.fcolor.value.trim() + ' añadidas', 'ok');
      } else {
        const m = elegido(), u = m ? (m.unidad || 'ud') : f.unidad.value;
        if (!m && !f.que.value.trim()) { msg.textContent = 'Indica qué material has comprado.'; bt.disabled = false; f.que.focus(); return; }
        const d = { unidades: uds, total: n(f.total.value) };
        if (m) d.id = m.id; else { d.nombre = f.que.value.trim(); d.unidad = u; d.tipo = u === 'ud' ? 'embalaje' : 'material'; }
        // «lo que trae» solo se manda si lo has escrito tú (si no, sigue valiendo la estimación que había)
        if (u !== 'ud' && (tocadoTrae || !m) && f.trae.value !== '') d.contenido = n(f.trae.value);
        let r;
        try { r = await api('materiales.compra', d); }
        catch (e) {
          // 22-10-2026: un importe 10 veces más caro de lo normal (120 € en vez de 1,20 €) o la misma compra dos veces → se pregunta
          if (e.code !== 'CONFIRMAR' && e.code !== 'DUPLICADO') throw e;
          const si = await confirmDlg(e.code === 'CONFIRMAR' ? '¿Seguro que es ese importe?' : '¿Otra compra igual?', e.message, e.code === 'CONFIRMAR' ? 'Sí, pagué eso' : 'Sí, compré otra igual');
          if (!si) { bt.disabled = false; (e.code === 'CONFIRMAR' ? f.total : f.uds).focus(); return; }
          if (e.code === 'CONFIRMAR') d.confirmado = true; else d.repetir = true;
          try { r = await api('materiales.compra', d); }
          catch (e2) { if (e2.code !== 'CONFIRMAR' && e2.code !== 'DUPLICADO') throw e2; const si2 = await confirmDlg('¿Seguro?', e2.message, 'Sí'); if (!si2) { bt.disabled = false; return; } d.confirmado = true; d.repetir = true; r = await api('materiales.compra', d); }
        }
        upsertLocal('materiales', r.material); emit();
        toast('🛒 ' + r.material.nombre + ': ' + cant(r.antes, r.unidad) + ' → ' + cant(r.despues, r.unidad) + (costes && r.costeMedio !== null ? ' · ' + fino(r.costeMedio) + '/' + (UN[r.unidad] || r.unidad) : ''), 'ok', 6000);
      }
      md.close(); if (render.refrescar) try { render.refrescar(); } catch (e) { }
    } catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
  }
}

// ---------- CORREGIR UNA COMPRA YA APUNTADA (22-10-2026) ----------
// Se corrige la compra misma (nada de compras duplicadas): cuántos, lo pagado, lo que trae cada uno, la fecha, el material y
// el proveedor. El servidor arregla con ella el stock, el coste por unidad, los packs, los costes de productos y las estadísticas.
export function corregirCompra(x, despues) {
  if (!can('stock.mover')) return requestAccess('stock.mover', 'stock');
  const mats = activos().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  const m0 = (S.t.materiales || []).find(m => m.id === x.materialId) || { id: x.materialId, nombre: x.material, unidad: 'ud' };
  const mm = String(x.motivo || '').match(/^Compra:\s*([\d.,]+)\s*×/);
  const uds0 = mm ? n(mm[1]) : 1, trae0 = uds0 > 0 ? Math.round(n(x.cambio) / uds0 * 10000) / 10000 : n(x.cambio), tot0 = n(x.importe);
  const dia = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('sv-SE'); };
  const hoy = new Date().toLocaleDateString('sv-SE');
  const f = {
    que: inp({ list: 'dl-corrige', value: m0.nombre, autocomplete: 'off' }),
    uds: inp({ type: 'number', min: 0, step: 'any', value: uds0, inputmode: 'decimal' }),
    total: inp({ type: 'number', min: 0, step: 0.01, value: tot0, inputmode: 'decimal' }),
    trae: inp({ type: 'number', min: 0, step: 'any', value: trae0, inputmode: 'decimal' }),
    fecha: inp({ type: 'date', value: dia(x.fecha), max: hoy }),
    prov: inp({ value: m0.proveedor || '', placeholder: 'Tienda o web (opcional)' })
  };
  const pre = h('div.compra-pre'), msg = h('p.bad-t'), campoTrae = h('div.field', h('label', 'Cada uno trae (' + (UN[m0.unidad] || m0.unidad || 'ud') + ')'), f.trae);
  const elegido = () => mats.find(m => CL.norm(m.nombre) === CL.norm(f.que.value)) || null;
  const conTrae = () => (elegido() || m0).unidad !== 'ud' || trae0 !== 1;
  function calc() {
    msg.textContent = '';
    const m = elegido() || m0, u = m.unidad || 'ud', uds = n(f.uds.value), tot = n(f.total.value), tr = conTrae() ? n(f.trae.value) : 1;
    campoTrae.style.display = conTrae() ? '' : 'none';
    if (!(uds > 0) || f.total.value === '') { mount(pre, h('span.warn-t', 'Escribe cuántos y cuánto pagaste.')); return; }
    const entra = uds * tr, cu = entra > 0 ? tot / entra : null, cu0 = n(x.cambio) > 0 ? tot0 / n(x.cambio) : null;
    const mismo = !elegido() || elegido().id === m0.id, st = lleno(m0.stock) ? n(m0.stock) : 0;
    mount(pre,
      h('div', 'Antes: ', h('b', cant(uds0, 'ud') + ' por ' + eur(tot0)), cu0 !== null ? ' (' + fino(cu0) + ' por ' + (UN[m0.unidad] || m0.unidad || 'ud') + ')' : ''),
      h('div', 'Ahora: ', h('b', cant(uds, 'ud') + ' por ' + eur(tot)), cu !== null ? ' (' + fino(cu) + ' por ' + (UN[u] || u) + ')' : ''),
      mismo ? (Math.abs(entra - n(x.cambio)) > 1e-9 ? h('div', '→ stock de ' + m0.nombre + ': ', h('b', cant(st, m0.unidad) + ' → ' + cant(st - n(x.cambio) + entra, m0.unidad))) : h('div.tiny.muted', 'El stock no cambia.'))
        : h('div', '→ pasa de «' + m0.nombre + '» (' + cant(st, m0.unidad) + ' → ' + cant(st - n(x.cambio), m0.unidad) + ') a «' + elegido().nombre + '»'),
      Math.abs(tot - tot0) > 0.004 ? h('div', '→ gasto de ese mes: ', h('b', (tot - tot0 > 0 ? '+' : '−') + eur(Math.abs(tot - tot0)))) : null);
  }
  Object.values(f).forEach(i => i.addEventListener('input', calc));
  const body = h('div',
    h('div.banner-soft', { style: { marginBottom: '10px' } }, '✏️ Estás corrigiendo una compra ya apuntada (' + fdt(x.fecha) + '). No se crea otra: se cambia esta y todo lo que depende de ella.'),
    h('datalist', { id: 'dl-corrige' }, mats.map(m => h('option', { value: m.nombre }))),
    h('div.form', field('Qué compraste', f.que, null, 'full'), field('Cuántos *', f.uds), field('Pagué en total (€) *', f.total), campoTrae, field('Fecha de la compra', f.fecha), field('Proveedor', f.prov)),
    pre, msg);
  const md = modal('✏️ Corregir compra', body, close => [btn('Cancelar', close), btn('Guardar cambios', guardar, { cls: 'primary', icon: 'check' })]);
  calc();
  async function guardar(ev) {
    const bt = ev.target.closest('button'), m = elegido() || (CL.norm(f.que.value) === CL.norm(m0.nombre) ? m0 : null);
    if (!m) { msg.textContent = 'Elige un material de la lista (para uno nuevo, apúntalo con «Compré…»).'; f.que.focus(); return; }
    if (!(n(f.uds.value) > 0)) { msg.textContent = 'Indica cuántos compraste (más de 0).'; f.uds.focus(); return; }
    if (f.total.value === '' || n(f.total.value) < 0) { msg.textContent = 'Indica cuánto pagaste en total.'; f.total.focus(); return; }
    if (conTrae() && !(n(f.trae.value) > 0)) { msg.textContent = 'Lo que trae cada uno debe ser mayor que 0.'; f.trae.focus(); return; }
    if (f.fecha.value && f.fecha.value > hoy) { msg.textContent = 'La fecha no puede ser de un día que aún no ha llegado.'; f.fecha.focus(); return; }
    const d = { id: x.id, unidades: n(f.uds.value), total: Math.round(n(f.total.value) * 100) / 100, visto: { importe: x.importe, cambio: x.cambio } };
    if (conTrae() && n(f.trae.value) !== trae0) d.contenido = n(f.trae.value);
    if (m.id !== m0.id) { d.materialId = m.id; if (conTrae()) d.contenido = n(f.trae.value); }
    if (f.fecha.value && f.fecha.value !== dia(x.fecha)) d.fecha = f.fecha.value;
    if (f.prov.value.trim() !== String(m0.proveedor || '').trim()) d.proveedor = f.prov.value.trim();
    bt.disabled = true;
    try {
      const r = await api('materiales.compraEditar', d);
      (r.materiales || []).forEach(mt => upsertLocal('materiales', mt)); emit();
      try { await pull(); } catch (e) { }
      toast('✏️ Compra corregida: ' + eur(r.antes.total) + ' → ' + eur(r.despues.total) + (r.avisos.length ? ' · ' + r.avisos[0] : ''), 'ok', 8000);
      md.close(); if (despues) despues();
    } catch (e) { msg.textContent = servidorViejo(e) ? SERVIDOR_VIEJO + ' No se ha cambiado nada.' : e.message || String(e); bt.disabled = false; }
  }
}
// el servidor de Google instalado aún no tiene lo del 22-10 (corregir compras y pendientes): se dice claro, sin error raro
const SERVIDOR_VIEJO = 'Tu servidor de Google aún es el antiguo: para esto hay que pegar el Servidor.gs nuevo (carpeta de la versión → LEEME).';
const servidorViejo = e => /Acción desconocida: (materiales\.compraEditar|inventario\.)/.test((e && e.message) || '');
