// ================= 26-10-2026 · 📦 MI ALMACÉN =================
// Ella: «el apartado Imprimir y fabricar no se entiende nada de nada, no quiero liarme: quiero poner lo que he comprado y lo que tengo
// en stock… tantas cosas sobran, ponlo de una forma que pueda trabajar fácil o entienda fácil, pocos pasos, muy muy fácil».
// UNA pantalla: dos botones grandes (🛒 He comprado · ✏️ Cuento lo que tengo) y UNA lista de lo que tienes, con un color si se acaba.
// Son los MISMOS datos de siempre (materiales, bobinas y el stock de productos: un solo inventario) y se guardan con las mismas órdenes
// del servidor (materiales.compra · materiales.stock · materiales.guardar · bobinas.guardar · stock.mover). En la lista no hay dinero:
// lo que pagaste se pide solo al apuntar una compra. Lo de antes (historial, precios, estadísticas) sigue en «Opciones avanzadas».
import { h, mount, btn, modal, toast, inp, empty, pill, confirmDlg } from '../ui.js';
import { S, can, api, upsertLocal, emit, pull } from '../store.js';
import { requestAccess, go, handleError } from '../app.js';
import { levels, move } from './stock.js';

const CL = window.CL;
const n = v => Number(String(v === undefined || v === null ? '' : v).replace(',', '.')) || 0;
const lleno = v => v !== '' && v !== null && v !== undefined && isFinite(Number(String(v).replace(',', '.')));
const UN = { ud: ['unidad', 'unidades'], g: ['g', 'g'], kg: ['kg', 'kg'], m: ['m', 'm'], cm: ['cm', 'cm'], mm: ['mm', 'mm'], ml: ['ml', 'ml'], l: ['l', 'l'] };
const unidad = (u, q) => { const x = UN[u] || [u || 'unidad', u || 'unidades']; return q === 1 ? x[0] : x[1]; };
const numero = v => (Math.round(n(v) * 100) / 100).toLocaleString('es-ES');
const cant = (v, u) => numero(v) + ' ' + unidad(u || 'ud', n(v));
const kg = g => g >= 1000 ? (Math.round(g / 100) / 10).toLocaleString('es-ES') + ' kg' : Math.round(g).toLocaleString('es-ES') + ' g';

// ---------- qué es cada cosa (para agrupar sin que ella tenga que pensarlo) ----------
const CLASES = [
  { k: 'filamento', e: '🧵', t: 'Filamento', pl: 'bobinas' },
  { k: 'caja', e: '📦', t: 'Cajas', pl: 'cajas' },
  { k: 'sobre', e: '✉️', t: 'Sobres', pl: 'sobres' },
  { k: 'bolsa', e: '🛍️', t: 'Bolsas', pl: 'bolsas' },
  { k: 'otro', e: '🧴', t: 'Otra cosa', pl: 'unidades', d: 'cinta, papel, laca, alcohol, tornillos…' }
];
const activos = () => (S.t.materiales || []).filter(m => CL.norm(m.activo) !== 'no' && String(m.nombre || '').trim() && m.tipo !== 'filamento');
export function claseDe(m) {
  if (['caja', 'sobre', 'bolsa'].includes(m.tipo)) return m.tipo;
  if ((m.unidad || 'ud') === 'ud' && ['embalaje', 'material', 'otro', ''].includes(m.tipo || '')) {
    const nm = CL.norm(m.nombre);
    if (/^caja/.test(nm)) return 'caja'; if (/^sobre/.test(nm)) return 'sobre'; if (/^bolsa/.test(nm)) return 'bolsa';
  }
  return 'otro';
}
const ICONO = m => ({ caja: '📦', sobre: '✉️', bolsa: '🛍️' })[claseDe(m)] || (m.tipo === 'componente' ? '🔩' : (m.unidad === 'ml' || m.unidad === 'l' ? '🧴' : (m.unidad === 'm' ? '🎀' : '▫️')));
// ¿se acaba? (los mismos avisos que el inventario: el mínimo de cada material o el general de cajas)
export function nivel(m) {
  if (!lleno(m.stock)) return 'sin';
  const st = n(m.stock), avisoCajas = n(((S.cfg || {}).embalaje || {}).avisoCajas);
  // sin aviso puesto, uno AUTOMÁTICO: 2 unidades, o lo que trae un rollo o bote (cuando ya solo queda uno)
  const auto = (m.unidad || 'ud') === 'ud' ? 2 : (n(m.cantidad) > 0 ? n(m.cantidad) : null);
  const min = lleno(m.stockMin) ? n(m.stockMin) : (m.tipo === 'caja' && avisoCajas > 0 ? avisoCajas : auto);
  return st <= 0 ? 'agotado' : (min !== null && st <= min ? 'bajo' : 'ok');
}
// filamento: una fila por material + color, con todas sus bobinas
export function colores() {
  const g = {}, aviso = n(((S.cfg || {}).taller || {}).avisoColorGramos) || 300;
  (S.t.bobinas || []).forEach(b => {
    const mat = b.material || 'PLA', k = mat + '|' + CL.norm(b.color || '');
    const x = g[k] || (g[k] = { clave: k, material: mat, color: b.color || '', hex: b.colorHex || '#cccccc', gramos: 0, bobinas: [] });
    x.bobinas.push(b); x.gramos += Math.max(0, n(b.restante));
  });
  return Object.values(g).map(x => Object.assign(x, { abiertas: x.bobinas.filter(b => n(b.restante) > 0), nivel: x.gramos <= 0 ? 'agotado' : (x.gramos <= aviso ? 'bajo' : 'ok') }))
    .sort((a, b) => a.material.localeCompare(b.material, 'es') || a.color.localeCompare(b.color, 'es'));
}
const ESTADO = { agotado: ['No queda', 'bad'], bajo: ['Se acaba', 'warn'], sin: ['Sin contar', ''] };
const estadoPill = nv => ESTADO[nv] ? pill(ESTADO[nv][0], ESTADO[nv][1]) : null;

// ---------- LA PANTALLA ----------
let busca = '';
export function render(el) {
  const mover = can('stock.mover');
  const cuerpo = h('div.alm-lista'), q = inp({ type: 'search', placeholder: '🔎 Buscar en lo que tengo…', value: busca, 'aria-label': 'Buscar en el almacén' });
  q.addEventListener('input', () => { busca = q.value; draw(); });
  const aviso = h('div.alm-aviso');
  el.append(
    h('div.page-head', h('div', h('h1', '📦 Mi almacén'), h('div.muted.small', 'Todo va solo: lo que gastas al imprimir y al empaquetar se descuenta, y la lista de la compra se hace sola. Tú solo apuntas lo que compras.'))),
    h('div.alm-botones',
      h('button.alm-gran.compra', { type: 'button', onclick: () => mover ? heComprado() : requestAccess('stock.mover', 'almacen') }, h('span.e', '🛒'), h('b', 'He comprado'), h('span', 'Apunta lo que te ha llegado: qué, cuántos y cuánto pagaste')),
      h('button.alm-gran.cuento', { type: 'button', onclick: () => mover ? cuento() : requestAccess('stock.mover', 'almacen') }, h('span.e', '✏️'), h('b', 'Cuento lo que tengo'), h('span', 'Pon lo que hay de verdad en tu estantería'))),
    aviso, h('div.alm-busca', q), cuerpo, avanzadas());
  function draw() {
    const qq = CL.norm(busca), pasa = t => !qq || CL.norm(t).includes(qq);
    const mats = activos(), envio = mats.filter(m => claseDe(m) !== 'otro'), otros = mats.filter(m => claseDe(m) === 'otro'), cols = colores();
    const prods = levels().list.filter(x => x.producto && x.controlado);
    // 🛒 LO QUE TE TOCA COMPRAR: se hace SOLO con lo que se acaba (ella no apunta nada aquí); un toque y se apunta la compra
    const toca = mats.filter(m => ['agotado', 'bajo'].includes(nivel(m))).map(m => ({ ic: ICONO(m), t: m.nombre, q: nivel(m) === 'agotado' ? 'no queda' : 'quedan ' + cant(m.stock, m.unidad || 'ud'), nv: nivel(m), go: () => heComprado({ material: m }) }))
      .concat(cols.filter(c => c.nivel !== 'ok').map(c => ({ ic: h('i.alm-dot', { style: { background: c.hex } }), t: c.material + ' ' + c.color, q: c.nivel === 'agotado' ? 'no queda' : 'quedan ' + kg(c.gramos), nv: c.nivel, go: () => heComprado({ color: c }) })))
      .sort((a, b) => (a.nv === 'agotado' ? 0 : 1) - (b.nv === 'agotado' ? 0 : 1) || a.t.localeCompare(b.t, 'es'));
    mount(aviso, toca.length ? h('section.alm-toca', h('h3', '🛒 Lo que te toca comprar ', h('small', '(se hace sola con lo que se acaba)')),
      h('div.alm-toca-l', toca.map(x => h('div.alm-toca-i.' + x.nv, h('span.alm-ic', x.ic), h('div.alm-nom', h('b', x.t), h('span', x.q)), mover ? btn('Ya lo compré', x.go, { cls: 'sm primary' }) : null))))
      : (mats.length || cols.length ? h('div.alm-bien', '✅ No te falta nada: no hay que comprar') : null));
    const fila = (ic, nombre, sub, cuanto, nv, acciones) => h('div.alm-fila' + (nv === 'agotado' || nv === 'bajo' ? '.' + nv : ''),
      h('span.alm-ic', ic), h('div.alm-nom', h('b', nombre), sub ? h('span', sub) : null), h('div.alm-cuanto', h('b', cuanto), estadoPill(nv)), mover ? h('div.alm-acc', acciones) : null);
    const bloque = (titulo, filas, vacio) => filas.length || vacio ? h('section.alm-bloque', h('h3', titulo), filas.length ? filas : h('p.small.muted', vacio)) : null;
    const fMat = m => fila(ICONO(m), m.nombre, (m.unidad || 'ud') !== 'ud' && n(m.cantidad) > 0 ? 'Cada rollo o bote trae ' + cant(m.cantidad, m.unidad) : '', lleno(m.stock) ? cant(m.stock, m.unidad || 'ud') : '—', nivel(m),
      [btn('＋ Compré', () => heComprado({ material: m }), { cls: 'sm primary' }), btn('Tengo…', () => tengo(m), { cls: 'sm' })]);
    const fCol = c => fila(h('i.alm-dot', { style: { background: c.hex } }), c.material + ' ' + c.color, c.abiertas.length === 1 ? '1 bobina' : c.abiertas.length + ' bobinas', kg(c.gramos), c.nivel,
      [btn('＋ Compré', () => heComprado({ color: c }), { cls: 'sm primary' }), btn('Tengo…', () => cuento({ soloColor: c.clave }), { cls: 'sm' })]);
    const fProd = x => fila('🎁', x.producto, x.reservado ? x.reservado + ' apartadas para pedidos' : '', x.fisico + (x.fisico === 1 ? ' pieza' : ' piezas'), x.fisico <= 0 ? 'agotado' : (x.bajo ? 'bajo' : 'ok'),
      [btn('−', () => move(x.producto, -1), { cls: 'sm', disabled: x.fisico <= 0, title: 'Quitar una' }), btn('＋', () => move(x.producto, 1), { cls: 'sm', title: 'Añadir una' })]);
    const B = [
      bloque('🧵 Filamento', cols.filter(c => pasa(c.material + ' ' + c.color)).map(fCol), qq ? '' : 'No hay bobinas apuntadas. Pulsa «He comprado» → Filamento.'),
      bloque('📦 Cajas, sobres y bolsas', envio.filter(m => pasa(m.nombre)).map(fMat), qq ? '' : 'Nada apuntado todavía.'),
      bloque('🧴 Otras cosas', otros.filter(m => pasa(m.nombre)).map(fMat), ''),
      bloque('🎁 Productos ya hechos', prods.filter(x => pasa(x.producto)).map(fProd), qq ? '' : 'Lo que imprimas para tener en la estantería saldrá aquí.')
    ].filter(Boolean);
    mount(cuerpo, B.length ? B : h('div.card', empty('search', 'No encuentro «' + busca + '»', 'Prueba con otra palabra, o apúntalo con «He comprado».')));
  }
  draw();
  return { update: draw, guardaLoEscrito: true }; // repintar solo rehace la lista (el buscador se queda como está): al momento
}

function avanzadas() {
  const L = [['inventario/compras', '🧾 Historial de compras', 'productos.ver'], ['costes', '💶 Precios y costes', 'productos.costes'], ['inventario/estadisticas', '📊 Estadísticas', 'productos.costes'],
    ['stock', '🎁 Productos en stock (detalle)', 'productos.ver'], ['taller/filamento', '🧵 Bobinas en detalle', 'taller.ver'], ['inventario', '📦 Inventario completo (como antes)', 'productos.ver']].filter(x => can(x[2]));
  return h('details.more.alm-avanzadas', h('summary', '⚙️ Opciones avanzadas'), h('div.in', h('p.tiny.muted', 'Lo de antes sigue aquí, por si un día lo necesitas. Para el día a día no hace falta.'),
    h('div.row.wrap', L.map(x => btn(x[1], () => go(x[0]), { cls: 'sm' })))));
}

// ---------- ✏️ TENGO… (una sola cosa) ----------
function tengo(m) {
  const u = m.unidad || 'ud', f = inp({ type: 'number', min: 0, step: 'any', inputmode: 'decimal', value: lleno(m.stock) ? n(m.stock) : '', class: 'inp alm-num' }), msg = h('p.bad-t');
  const md = modal('✏️ ' + m.nombre, h('div', h('p.alm-preg', '¿Cuántos ' + unidad(u, 2) + ' tienes ahora?'), h('div.alm-paso', stepper(f, u === 'ud' ? 1 : 1)), h('p.small.muted', lleno(m.stock) ? 'Ahora pone ' + cant(m.stock, u) + '.' : 'Todavía no estaba contado.'), msg),
    close => [btn('Cancelar', close), btn('✔ Guardar', async ev => {
      if (f.value === '') { msg.textContent = 'Escribe cuántos hay.'; return; }
      const bt = ev.target.closest('button'); bt.disabled = true;
      try { const r = await guardaCuenta(m, n(f.value)); if (r) { upsertLocal('materiales', r.material); emit(); } toast('Apuntado: ' + cant(f.value, u), 'ok'); md.close(); }
      catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
    }, { cls: 'primary' })], { size: 'narrow' });
}
async function guardaCuenta(m, valor) {
  let r;
  if (lleno(m.stock)) { if (n(m.stock) === valor) return null; r = await api('materiales.stock', { id: m.id, nuevo: valor, motivo: 'Recuento' }); }
  else r = await api('materiales.guardar', { id: m.id, datos: { stock: valor }, motivo: 'Stock inicial' });
  if (CL.norm(m.estadoStock) === 'estimado') r = await api('materiales.guardar', { id: m.id, datos: { estadoStock: 'confirmado' } });
  return r;
}
// un número grande con − y +
function stepper(f, paso) {
  const suma = d => { f.value = String(Math.max(0, Math.round((n(f.value) + d) * 100) / 100)); f.dispatchEvent(new Event('input')); };
  return h('div.alm-stepper', btn('−', () => suma(-paso), { cls: 'alm-st' }), f, btn('＋', () => suma(paso), { cls: 'alm-st' }));
}

// ---------- 🛒 HE COMPRADO: 3 pasos (qué · cuántos · cuánto pagaste) ----------
export function heComprado(pre = {}) {
  if (!can('stock.mover')) return requestAccess('stock.mover', 'almacen');
  const st = { paso: 1, clase: null, mat: null, nuevo: '', nuevaUd: 'ud', fMat: 'PLA', fColor: '', fHex: '', peso: 1000, cuantos: '', trae: '', total: '' };
  if (pre.material) { st.clase = claseDe(pre.material); st.mat = pre.material; st.paso = 2; }
  if (pre.color) { st.clase = 'filamento'; st.fMat = pre.color.material; st.fColor = pre.color.color; st.fHex = pre.color.hex; st.paso = 2; }
  const body = h('div.alm-asist'), md = modal('🛒 He comprado', body, null, { size: 'wide' });
  const avanzar = () => { st.paso++; pinta(); }, atras = () => { st.paso--; pinta(); };
  const listo1 = () => st.clase === 'filamento' ? !!String(st.fColor).trim() : (st.mat || String(st.nuevo).trim());
  const nombreCosa = () => st.clase === 'filamento' ? st.fMat + ' ' + st.fColor : (st.mat ? st.mat.nombre : String(st.nuevo).trim());
  const ud = () => st.clase === 'filamento' ? 'ud' : (st.mat ? st.mat.unidad || 'ud' : st.nuevaUd);
  const porPaquete = () => ud() !== 'ud'; // rollos o botes que traen metros / ml / g
  function pinta() {
    const migas = h('div.alm-migas', ['1 · Qué', '2 · Cuántos', '3 · Cuánto pagaste'].map((t, i) => h('span' + (st.paso === i + 1 ? '.on' : st.paso > i + 1 ? '.hecho' : ''), t)));
    let paso;
    if (st.paso === 1) paso = paso1(); else if (st.paso === 2) paso = paso2(); else paso = paso3();
    mount(body, migas, paso);
  }
  // 1 · QUÉ
  function paso1() {
    const sig = btn('Siguiente →', avanzar, { cls: 'primary alm-sig', disabled: !listo1() });
    const refresca = () => { sig.disabled = !listo1(); };
    const tiles = h('div.alm-tiles', CLASES.map(c => h('button.alm-tile' + (st.clase === c.k ? '.on' : ''), { type: 'button', onclick: () => { st.clase = c.k; st.mat = null; st.nuevo = ''; pinta(); } }, h('span.e', c.e), h('b', c.t), c.d ? h('small', c.d) : null)));
    let detalle = null;
    if (st.clase === 'filamento') {
      const mats = ['PLA', 'PETG', 'TPU', 'ABS', 'ASA'], cols = colores().filter(c => c.material === st.fMat);
      const otro = inp({ placeholder: 'Escribe el color (Blanco, Negro mate…)', value: cols.some(c => CL.norm(c.color) === CL.norm(st.fColor)) ? '' : st.fColor });
      otro.addEventListener('input', () => { st.fColor = otro.value; st.fHex = ''; mount(colWrap, coloresBtns()); refresca(); });
      const coloresBtns = () => cols.map(c => h('button.alm-chip' + (CL.norm(st.fColor) === CL.norm(c.color) ? '.on' : ''), { type: 'button', onclick: () => { st.fColor = c.color; st.fHex = c.hex; otro.value = ''; mount(colWrap, coloresBtns()); refresca(); } }, h('i.alm-dot', { style: { background: c.hex } }), c.color || '(sin color)'));
      const colWrap = h('div.alm-chips', coloresBtns());
      detalle = h('div.alm-det', h('p.alm-preg', '¿De qué material?'), h('div.alm-chips', mats.map(x => h('button.alm-chip' + (st.fMat === x ? '.on' : ''), { type: 'button', onclick: () => { st.fMat = x; st.fColor = ''; pinta(); } }, x))),
        h('p.alm-preg', '¿De qué color?'), colWrap, otro);
    } else if (st.clase) {
      const lista = activos().filter(m => claseDe(m) === st.clase).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
      const nuevo = inp({ placeholder: st.clase === 'otro' ? 'Escribe qué es (Cinta de embalar, Laca…)' : 'Escribe su medida (Caja 30 × 20 × 10…)', value: st.nuevo });
      nuevo.addEventListener('input', () => { st.nuevo = nuevo.value; st.mat = null; [...lis.children].forEach(x => x.classList && x.classList.remove('on')); refresca(); });
      const lis = h('div.alm-items', lista.map(m => h('button.alm-item' + (st.mat === m ? '.on' : ''), { type: 'button', onclick: () => { st.mat = m; st.nuevo = ''; nuevo.value = ''; avanzar(); } },
        h('span', ICONO(m)), h('b', m.nombre), h('small', lleno(m.stock) ? 'tienes ' + cant(m.stock, m.unidad || 'ud') : 'sin contar'))));
      const uds = st.clase === 'otro' ? h('div', h('p.small', '¿Cómo se cuenta?'), h('div.alm-chips', [['ud', 'Por unidades'], ['m', 'Por metros (rollos)'], ['ml', 'Por mililitros (botes)'], ['g', 'Por gramos']].map(([k, t]) =>
        h('button.alm-chip' + (st.nuevaUd === k ? '.on' : ''), { type: 'button', onclick: () => { st.nuevaUd = k; [...uds.querySelectorAll('.alm-chip')].forEach(x => x.classList.toggle('on', x.textContent === t)); } }, t)))) : null;
      detalle = h('div.alm-det', lista.length ? [h('p.alm-preg', '¿Cuál?'), lis] : null, h('p.alm-preg', lista.length ? '…o es algo nuevo:' : '¿Qué es?'), nuevo, uds);
    }
    return h('div', h('p.alm-preg.grande', '¿Qué has comprado?'), tiles, detalle, h('div.alm-nav', btn('Cancelar', () => md.close()), sig));
  }
  // 2 · CUÁNTOS
  function paso2() {
    const f = inp({ type: 'number', min: 0, step: 'any', inputmode: 'decimal', value: st.cuantos, class: 'inp alm-num', placeholder: '0' });
    const sig = btn('Siguiente →', () => { st.cuantos = f.value; avanzar(); }, { cls: 'primary alm-sig', disabled: !(n(st.cuantos) > 0) });
    f.addEventListener('input', () => { st.cuantos = f.value; sig.disabled = !(n(f.value) > 0); res(); });
    const C = CLASES.find(c => c.k === st.clase) || CLASES[4];
    const pl = st.clase === 'filamento' ? 'bobinas' : porPaquete() ? 'rollos, botes o paquetes' : (st.clase === 'otro' ? 'unidades' : C.pl);
    let extra = null;
    const resumen = h('p.alm-res');
    const res = () => {
      const c = n(st.cuantos); if (!(c > 0)) return mount(resumen, '');
      if (st.clase === 'filamento') return mount(resumen, 'Entran ', h('b', kg(c * n(st.peso))), ' de ' + nombreCosa() + '.');
      const m = st.mat, antes = m && lleno(m.stock) ? n(m.stock) : 0, entra = porPaquete() ? c * (n(st.trae) || 0) : c;
      if (porPaquete() && !(n(st.trae) > 0)) return mount(resumen, h('span.warn-t', 'Dime cuánto trae cada uno (lo pone la etiqueta).'));
      mount(resumen, m ? ['Tenías ', h('b', cant(antes, ud())), ' → tendrás ', h('b', cant(antes + entra, ud()))] : ['Entran ', h('b', cant(entra, ud())), '.']);
    };
    if (st.clase === 'filamento') {
      const p = inp({ type: 'number', min: 1, step: 50, value: st.peso, class: 'inp alm-peq' }); p.addEventListener('input', () => { st.peso = n(p.value) || 1000; res(); });
      extra = h('p.small.muted', 'Cada bobina pesa ', p, ' g (casi siempre 1.000).');
    } else if (porPaquete()) {
      if (st.trae === '' && st.mat && n(st.mat.cantidad) > 0) st.trae = st.mat.cantidad;
      const t = inp({ type: 'number', min: 0, step: 'any', value: st.trae, class: 'inp alm-peq', placeholder: '100' }); t.addEventListener('input', () => { st.trae = t.value; res(); });
      extra = h('p.small', 'Cada uno trae ', t, ' ' + unidad(ud(), 2) + '.');
    }
    setTimeout(() => f.focus(), 30); setTimeout(res, 0);
    return h('div', h('p.alm-preg.grande', '¿Cuántas ' + pl + ' has comprado?'), h('p.small.muted', nombreCosa()), h('div.alm-paso', stepper(f, 1)), extra, resumen,
      h('div.alm-nav', btn('← Atrás', atras), sig));
  }
  // 3 · CUÁNTO PAGASTE
  function paso3() {
    const f = inp({ type: 'number', min: 0, step: 0.01, inputmode: 'decimal', value: st.total, class: 'inp alm-num', placeholder: '0,00' }), msg = h('p.bad-t');
    const cada = h('p.alm-res');
    const calc = () => { st.total = f.value; const c = n(st.cuantos); mount(cada, f.value !== '' && c > 0 ? ['Sale a ', h('b', (Math.round(n(f.value) / c * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'), ' cada ' + (st.clase === 'filamento' ? 'bobina' : 'uno') + '.'] : ''); };
    f.addEventListener('input', calc); setTimeout(() => { f.focus(); calc(); }, 30);
    const guardar = async (ev, sinPrecio) => {
      if (!sinPrecio && f.value === '') { msg.textContent = 'Escribe lo que pagaste en total (o pulsa «No sé el precio»).'; return; }
      const bt = ev.target.closest('button'); bt.disabled = true; msg.textContent = '';
      try { const txt = await guarda(sinPrecio); toast(txt, 'ok', 6000); md.close(); }
      catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
    };
    return h('div', h('p.alm-preg.grande', '¿Cuánto pagaste en total?'), h('p.small.muted', n(st.cuantos) + ' × ' + nombreCosa() + ' · lo que pone el ticket o el pedido (con IVA)'),
      h('div.alm-paso.euros', f, h('span.alm-eur', '€')), cada, msg,
      h('div.alm-nav', btn('← Atrás', atras), btn('No sé el precio', ev => guardar(ev, true), { cls: 'ghost', title: 'Se apunta lo que entra, sin precio' }), btn('✔ Guardar compra', ev => guardar(ev, false), { cls: 'primary alm-sig' })));
  }
  async function guarda(sinPrecio) {
    const c = n(st.cuantos);
    if (st.clase === 'filamento') {
      const datos = { material: st.fMat, color: String(st.fColor).trim(), peso: n(st.peso) || 1000, restante: n(st.peso) || 1000 };
      if (st.fHex) datos.colorHex = st.fHex;
      if (!sinPrecio) datos.precio = Math.round(n(st.total) / c * 100) / 100;
      const r = await api('bobinas.guardar', { unidades: Math.round(c), datos });
      (r || []).forEach(x => upsertLocal('bobinas', x)); emit();
      return '🧵 ' + Math.round(c) + (Math.round(c) === 1 ? ' bobina' : ' bobinas') + ' de ' + st.fMat + ' ' + datos.color + ' apuntadas';
    }
    let m = st.mat;
    const u = ud(), entra = porPaquete() ? c * (n(st.trae) || 0) : c;
    if (porPaquete() && !(n(st.trae) > 0)) throw new Error('Dime cuánto trae cada uno (vuelve atrás).');
    if (sinPrecio) { // sin precio: el material (si es nuevo, se crea) y lo que entra, como entrada de stock
      if (!m) { const r0 = await api('materiales.guardar', { datos: { nombre: String(st.nuevo).trim(), tipo: st.clase === 'otro' ? 'material' : st.clase, unidad: u, cantidad: porPaquete() ? n(st.trae) : 1, stock: 0 } }); m = r0.material; upsertLocal('materiales', m); }
      const r = await api('materiales.stock', { id: m.id, cambio: entra, motivo: 'Compra (sin precio)' });
      upsertLocal('materiales', r.material); emit();
      return '🛒 ' + r.material.nombre + ': ahora tienes ' + cant(r.material.stock, u);
    }
    const d = { unidades: c, total: n(st.total) };
    if (m) d.id = m.id; else { d.nombre = String(st.nuevo).trim(); d.unidad = u; d.tipo = st.clase === 'otro' ? 'material' : st.clase; }
    if (porPaquete()) d.contenido = n(st.trae);
    let r;
    try { r = await api('materiales.compra', d); }
    catch (e) { // un importe 10 veces más caro de lo normal o la misma compra dos veces → se pregunta (igual que en el inventario)
      if (e.code !== 'CONFIRMAR' && e.code !== 'DUPLICADO') throw e;
      const si = await confirmDlg(e.code === 'CONFIRMAR' ? '¿Seguro que es ese importe?' : '¿Otra compra igual?', e.message, e.code === 'CONFIRMAR' ? 'Sí, pagué eso' : 'Sí, compré otra igual');
      if (!si) throw new Error(e.code === 'CONFIRMAR' ? 'Revisa lo que pagaste.' : 'No se ha apuntado otra vez.');
      if (e.code === 'CONFIRMAR') d.confirmado = true; else d.repetir = true;
      try { r = await api('materiales.compra', d); }
      catch (e2) { if (e2.code !== 'CONFIRMAR' && e2.code !== 'DUPLICADO') throw e2; d.confirmado = true; d.repetir = true; r = await api('materiales.compra', d); }
    }
    upsertLocal('materiales', r.material); emit();
    return '🛒 ' + r.material.nombre + ': tenías ' + cant(r.antes, r.unidad) + ' → ahora ' + cant(r.despues, r.unidad);
  }
  pinta();
}

// ---------- ✏️ CUENTO LO QUE TENGO (todo de una vez, o solo un color de filamento) ----------
export function cuento(opt = {}) {
  if (!can('stock.mover')) return requestAccess('stock.mover', 'almacen');
  const campos = [], msg = h('p.bad-t');
  const caja = (valor, paso) => { const f = inp({ type: 'number', min: 0, step: 'any', inputmode: 'decimal', value: valor, class: 'inp alm-cnt' }); return { f, el: stepper(f, paso) }; };
  const fila = (ic, nombre, sub, c, u) => h('div.alm-cfila', h('span.alm-ic', ic), h('div.alm-nom', h('b', nombre), sub ? h('span', sub) : null), c.el, h('span.alm-u', u));
  const secciones = [];
  const cols = colores().filter(c => !opt.soloColor || c.clave === opt.soloColor);
  if (cols.length) secciones.push(h('section.alm-bloque', h('h3', '🧵 Filamento · gramos que quedan en cada bobina'), cols.map(c => {
    const bobs = c.bobinas.filter(b => n(b.restante) > 0 || opt.soloColor);
    return h('div', h('div.alm-csub', h('i.alm-dot', { style: { background: c.hex } }), h('b', c.material + ' ' + c.color)), bobs.map((b, i) => {
      const x = caja(Math.round(n(b.restante)), 50); campos.push({ tipo: 'bobina', b, f: x.f, antes: Math.round(n(b.restante)) });
      return fila('🧵', 'Bobina ' + (i + 1), (b.marca ? b.marca + ' · ' : '') + 'de ' + Math.round(n(b.peso) || 1000) + ' g · pon 0 si se acabó', x, 'g');
    }));
  })));
  if (!opt.soloColor) {
    const mats = activos(), envio = mats.filter(m => claseDe(m) !== 'otro'), otros = mats.filter(m => claseDe(m) === 'otro');
    const fm = m => { const x = caja(lleno(m.stock) ? n(m.stock) : '', 1); campos.push({ tipo: 'material', m, f: x.f, antes: lleno(m.stock) ? n(m.stock) : null }); return fila(ICONO(m), m.nombre, '', x, unidad(m.unidad || 'ud', 2)); };
    if (envio.length) secciones.unshift(h('section.alm-bloque', h('h3', '📦 Cajas, sobres y bolsas'), envio.map(fm)));
    if (otros.length) secciones.push(h('section.alm-bloque', h('h3', '🧴 Otras cosas'), otros.map(fm)));
    const prods = levels().list.filter(x => x.producto && x.controlado);
    if (prods.length) secciones.push(h('section.alm-bloque', h('h3', '🎁 Productos ya hechos (piezas en la estantería)'), prods.map(p => { const x = caja(p.fisico, 1); campos.push({ tipo: 'producto', p, f: x.f, antes: p.fisico }); return fila('🎁', p.producto, '', x, 'piezas'); })));
  }
  const md = modal(opt.soloColor ? '✏️ ' + (cols[0] ? cols[0].material + ' ' + cols[0].color : 'Filamento') : '✏️ Cuento lo que tengo',
    h('div.alm-cuento', h('p.small.muted', 'Cambia solo lo que no cuadre con lo que ves. Lo que no toques se queda igual.'), secciones.length ? secciones : empty('box', 'No hay nada que contar todavía', 'Apunta primero lo que tienes con «He comprado».'), msg),
    close => [btn('Cancelar', close), btn('✔ Guardar lo que he cambiado', async ev => {
      const cambios = campos.filter(x => x.f.value !== '' && (x.antes === null || Math.abs(n(x.f.value) - x.antes) > 1e-9));
      if (!cambios.length) { toast('No has cambiado nada', 'info'); md.close(); return; }
      const bt = ev.target.closest('button'); bt.disabled = true; let hechos = 0;
      try {
        for (const x of cambios) {
          const v = n(x.f.value);
          if (x.tipo === 'material') { const r = await guardaCuenta(x.m, v); if (r) upsertLocal('materiales', r.material); }
          else if (x.tipo === 'bobina') { const r = await api('bobinas.guardar', { id: x.b.id, datos: { restante: Math.max(0, v), estimado: false } }); (r || []).forEach(y => upsertLocal('bobinas', y)); }
          else if (x.tipo === 'producto') { const ok = await move(x.p.producto, Math.round(v) - x.antes, 'Recuento'); if (!ok) throw new Error('No se ha podido apuntar ' + x.p.producto + '.'); }
          hechos++; bt.textContent = 'Guardando… ' + hechos + ' de ' + cambios.length;
        }
        emit(); toast('✔ Apuntado: ' + hechos + (hechos === 1 ? ' cambio' : ' cambios'), 'ok'); md.close(); pull().catch(() => { });
      } catch (e) { emit(); msg.textContent = (hechos ? 'Se guardaron ' + hechos + '. ' : '') + (e.message || String(e)); bt.disabled = false; bt.textContent = '✔ Guardar lo que he cambiado'; }
    }, { cls: 'primary' })], { size: 'wide' });
  void md;
}
void handleError;
