// ================= 📦 MI ALMACÉN · 28-10-2026: DOS APARTADOS Y EL CARRITO =================
// Ella (28-10): «el inventario sigue sin entenderse… el apartado sobres que estén sobres, el apartado cajas que estén cajas, el apartado
// bolsas: grandes, medianas, S… hay muchos apartados y eso me lía mucho: que solo haya dos, QUÉ COMPRO y QUÉ HAY… un botón del carrito
// que me vaya preguntando qué has comprado (cartón, bolsa o sobre) y qué tamaño, o que me deje elegir uno con un clic y se contabilice
// solo… pocos pasos, pero por detrás muy automatizado: no me gusta ver tanta cosa».
//  · 🛒 «He comprado algo» (arriba, grande): ¿qué? (cajas, sobres, bolsas, filamento u otra cosa) → ¿cuál? (sus tallas, con un clic) →
//    ¿cuántos? (ya puesto como la última vez, con el precio de la última vez) → ✔ Apuntar. Se suma solo.
//  · 📦 QUÉ HAY: cajas, sobres y bolsas cada uno en su sitio y ordenados por talla (XXS → XL, pequeña → grande), el filamento por color y
//    las piezas hechas. Tocar una cosa = corregir cuántas hay o apuntar que has comprado.
//  · 🛒 QUÉ COMPRO: se hace SOLA con lo que se acaba; «Ya lo he comprado» la suma con un toque.
//  · Lo de antes (⚠️ por revisar, ↔️ entradas y salidas, 📊 este mes, avisos y opciones avanzadas) sigue, plegado en «Más detalles».
// Mismos datos y mismas órdenes del servidor de siempre (un solo inventario). La regla de «se acaba» es la de todo el programa (CL.nivelStock).
import { h, mount, btn, modal, toast, inp, empty, pill, confirmDlg, eur, fdate, copyText } from '../ui.js';
import { S, can, api, upsertLocal, emit, pull } from '../store.js';
import { requestAccess, go } from '../app.js';
import { levels } from './stock.js';

const CL = window.CL;
const n = v => Number(String(v === undefined || v === null ? '' : v).replace(',', '.')) || 0;
const lleno = v => v !== '' && v !== null && v !== undefined && isFinite(Number(String(v).replace(',', '.')));
const UN = { ud: ['unidad', 'unidades'], g: ['g', 'g'], kg: ['kg', 'kg'], m: ['m', 'm'], cm: ['cm', 'cm'], mm: ['mm', 'mm'], ml: ['ml', 'ml'], l: ['l', 'l'] };
const unidad = (u, q) => { const x = UN[u] || [u || 'unidad', u || 'unidades']; return q === 1 ? x[0] : x[1]; };
const numero = v => (Math.round(n(v) * 100) / 100).toLocaleString('es-ES');
const cant = (v, u) => numero(v) + ' ' + unidad(u || 'ud', Math.abs(n(v)));
const kg = g => Math.abs(g) >= 1000 ? (Math.round(g / 100) / 10).toLocaleString('es-ES') + ' kg' : Math.round(g).toLocaleString('es-ES') + ' g';
const signo = v => (v > 0 ? '+' : v < 0 ? '−' : '');
const SERVIDOR_VIEJO = 'Tu servidor de Google aún es el antiguo. Para ver esto (y para que el filamento se descuente siempre) pega el Servidor.gs nuevo: carpeta de la versión → LEEME, 5 pasos.';
const viejo = e => /Acción desconocida: almacen\./.test((e && e.message) || '');

// ---------- qué es cada cosa (para agrupar sin que ella tenga que pensarlo) ----------
const CLASES = [
  { k: 'caja', e: '📦', t: 'Cajas', d: 'de cartón', pl: 'cajas', una: 'caja', g: 'f' },
  { k: 'sobre', e: '✉️', t: 'Sobres', d: 'acolchados', pl: 'sobres', una: 'sobre', g: 'm' },
  { k: 'bolsa', e: '🛍️', t: 'Bolsas', d: 'de todas las tallas', pl: 'bolsas', una: 'bolsa', g: 'f' },
  { k: 'filamento', e: '🧵', t: 'Filamento', d: 'bobinas', pl: 'bobinas', una: 'bobina', g: 'f' },
  { k: 'otro', e: '🧴', t: 'Otra cosa', d: 'cinta, papel, etiquetas…', pl: 'unidades', una: 'unidad', g: 'f' },
  { k: 'negocio', e: '📱', t: 'Móvil o SIM', d: 'se recupera solo con los pedidos', pl: 'gastos', una: 'gasto', g: 'm' }
];
// ---------- 📱 GASTOS DEL NEGOCIO (ella, 28-10: «a veces compramos SIM o un móvil nuevo… que el programa lo entienda y lo recupere en cada pedido») ----------
const NEGOCIO = [{ k: 'sim', e: '📶', t: 'Una SIM', d: 'la de cada mes', imp: 10, meses: 1 }, { k: 'movil', e: '📱', t: 'Un móvil', d: 'de vez en cuando', imp: 100, meses: 3 }, { k: 'otro', e: '🧾', t: 'Otro gasto', d: 'del negocio', imp: '', meses: 1 }];
const gastosNeg = () => { const L = ((S.cfg || {}).finanzas || {}).gastosNegocio; return Array.isArray(L) ? L : []; };
async function guardaNegocio(L) {
  const fz = Object.assign({}, (S.cfg || {}).finanzas || {}, { gastosNegocio: L });
  const cfg = await api('config.guardar', { clave: 'finanzas', valor: fz }); if (cfg && cfg.finanzas) S.cfg = cfg; else S.cfg.finanzas = fz; emit();
}
const CLASE = k => CLASES.find(c => c.k === k) || CLASES[4];
const cuantas = (c, pl) => '¿Cuánt' + (CLASE(c).g === 'm' ? 'os ' : 'as ') + (pl || CLASE(c).pl);
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
// la regla única de todo el programa (CL.nivelStock): crítico cuenta como «se acaba»
export function nivel(m) { const nv = CL.nivelStock(m, S.cfg).nivel; return nv === 'critico' ? 'bajo' : nv; }
// el filamento apartado para los pedidos que todavía no están hechos (su producto con sus gramos y UN color): material|color → gramos
const HECHO = { postpro: 1, empaquetar: 1, listo: 1, enviado: 1, entregado: 1, cancelado: 1 };
export function apartados() {
  const out = {}, cp = (S.cfg || {}).pedidos;
  (S.t.pedidos || []).forEach(o => {
    if (HECHO[CL.phaseOf(cp, o.estado)] || (o.filamento && typeof o.filamento === 'object' && o.filamento.fecha)) return;
    const p = (S.t.productos || []).find(x => (o.productoId && x.id === o.productoId) || CL.norm(x.nombre) === CL.norm(o.producto)); if (!p) return;
    const calc = (S.t.calculadora || []).find(c => c.nombre === p.nombre), g = n(calc && calc.gramos) || n(p.bambuGramos); if (!(g > 0)) return;
    const col = String(o.color || p.color || '').trim(); if (!col || /[+·×,/]| y /i.test(col)) return;
    const k = (p.material || 'PLA') + '|' + CL.norm(col); out[k] = (out[k] || 0) + g * (n(o.cantidad) || 1);
  });
  return out;
}
// filamento: una fila por material + color, con todas sus bobinas (aviso: los gramos de «Avisar con» del taller, como en Inicio)
export function colores() {
  const g = {}, aviso = n(((S.cfg || {}).taller || {}).avisoColorGramos) || 300;
  (S.t.bobinas || []).forEach(b => {
    const mat = b.material || 'PLA', k = mat + '|' + CL.norm(b.color || '');
    const x = g[k] || (g[k] = { clave: k, material: mat, color: b.color || '', hex: b.colorHex || '#cccccc', gramos: 0, bobinas: [] });
    x.bobinas.push(b); x.gramos += Math.max(0, n(b.restante));
  });
  const ap = apartados();
  return Object.values(g).map(x => { const a = Math.round(ap[x.clave] || 0), libre = x.gramos - a; return Object.assign(x, { apartado: a, abiertas: x.bobinas.filter(b => n(b.restante) > 0), nivel: x.gramos <= 0 ? 'agotado' : (libre <= aviso ? 'bajo' : 'ok') }); })
    .filter(x => x.abiertas.length || x.bobinas.some(b => b.estado !== 'Agotada'))
    .sort((a, b) => a.material.localeCompare(b.material, 'es') || a.color.localeCompare(b.color, 'es'));
}
const ESTADO = { agotado: ['No queda', 'bad'], bajo: ['Se acaba', 'warn'], sin: ['Sin contar', ''] };
const estadoPill = nv => ESTADO[nv] ? pill(ESTADO[nv][0], ESTADO[nv][1]) : null;
const dias = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;

// ---------- 📏 TALLAS: cada sobre, caja y bolsa en su sitio, de la más pequeña a la más grande ----------
// Se saca del nombre que ya tiene («Sobre M 4/D», «Bolsa Pequeña Negra», «Caja XS 17 × 4 cm»): no hay que volver a escribir nada.
export const TALLAS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
const PALABRA = { S: 'Pequeña', M: 'Mediana', L: 'Grande' };
const cm = v => { const x = n(v); return x ? (Math.round(x * 10) / 10).toLocaleString('es-ES') : ''; };
export function talla(m) {
  const nom = String(m.nombre || '').replace(/\s+/g, ' ').trim(), nm = CL.norm(nom), clase = claseDe(m);
  let t = (nom.match(/(?:^|[\s(])(XXS|XS|XXL|XL|S|M|L)(?=[\s)/\d]|$)/) || [])[1] || '', dePalabra = false;
  if (!t) { if (/\b(pequen|chic)/.test(nm)) t = 'S'; else if (/\bmedian/.test(nm)) t = 'M'; else if (/\bgrande/.test(nm)) t = 'L'; else if (/\bmini\b/.test(nm)) t = 'XS'; dePalabra = !!t; }
  // lo que queda del nombre sin «Sobre», «Bolsa», «Caja» ni la talla: el color, la referencia o la medida
  let resto = nom.replace(/^(caja|sobre|bolsa)s?\b\s*/i, '').replace(/\b(acolchados?|de cart[oó]n)\b/ig, '');
  if (t) resto = dePalabra ? resto.replace(/\b(peque[nñ][oa]s?|chic[oa]s?|median[oa]s?|grandes?|mini)\b/i, '') : resto.replace(new RegExp('(^|\\s)' + t + '(?=[\\s)/\\d]|$)'), ' ');
  resto = resto.replace(/\s+/g, ' ').replace(/^[\s·,-]+|[\s·,-]+$/g, '').trim();
  // medidas guardadas (los sobres en mm, las bolsas en cm): siempre en cm
  const d = [m.ancho, m.largo, m.alto].map(n).filter(x => x > 0), enMm = d.some(x => x > 60);
  const med = d.length >= 2 && !/\d\s*[×x]\s*\d/.test(resto) ? d.slice(-2).map(x => cm(enMm ? x / 10 : x)).join(' × ') + ' cm' : '';
  const area = (resto.match(/(\d+[.,]?\d*)\s*[×x]\s*(\d+[.,]?\d*)/) || []).slice(1).map(n).reduce((a, b) => a * b, 1);
  const ord = t ? TALLAS.indexOf(t) : 10 + Math.min(80, (area > 1 ? area : d.slice(-2).reduce((a, b) => a * (enMm ? b / 10 : b), 1)) / 100);
  const etiqueta = t ? (clase === 'bolsa' && PALABRA[t] ? PALABRA[t] : t) : '';
  const titulo = ([etiqueta && etiqueta !== t ? etiqueta : '', resto].filter(Boolean).join(' · ') || (t ? 'Talla ' + t : nom)).replace(/^./, x => x.toUpperCase());
  return { t, ord, titulo, sub: med, letra: t || (resto.match(/^\d+[.,]?\d*\s*[×x]\s*\d+[.,]?\d*/) || [''])[0].replace(/\s+/g, '') || CLASE(clase).e };
}
// el color, si lo dice su nombre (masculino para los sobres; femenino para cajas y bolsas)
export const COLORES_ENV = [['blanc', 'Blanco', 'Blanca', '#f7f6f2'], ['marr', 'Marrón', 'Marrón', '#a0703f'], ['kraft', 'Kraft', 'Kraft', '#c9a06c'], ['negr', 'Negro', 'Negra', '#1f1f22'],
  ['transp', 'Transparente', 'Transparente', '#dff0ff'], ['rosa', 'Rosa', 'Rosa', '#f3a6c3'], ['dorad', 'Dorado', 'Dorada', '#d4af37'], ['platea', 'Plateado', 'Plateada', '#c4c4c8']];
export function colorEnv(m) { const nm = CL.norm(m.nombre); const c = COLORES_ENV.find(x => nm.includes(x[0])); return c ? { k: c[0], t: claseDe(m) === 'sobre' ? c[1] : c[2], hex: c[3] } : null; }
const puntoColor = m => { const c = colorEnv(m); return c ? h('i.alm2-colorin', { style: { background: c.hex }, title: c.t }) : null; };
// cambiar el color en el nombre: «Sobre M 4/D» + Blanco → «Sobre M Blanco 4/D»
function conColor(m, col) {
  let nom = String(m.nombre || '').replace(/\s+/g, ' ').trim();
  COLORES_ENV.forEach(x => { nom = nom.replace(new RegExp('\\s*\\b' + x[0] + '[a-zóáéíú]*', 'ig'), ''); });
  nom = nom.replace(/\s+/g, ' ').trim();
  if (!col) return nom;
  const r = /^((?:caja|sobre|bolsa)s?\s+(?:XXS|XS|XXL|XL|S|M|L|peque[nñ][oa]|median[oa]|grande|mini)\b)/i;
  return r.test(nom) ? nom.replace(r, '$1 ' + col) : nom + ' ' + col;
}
const porTalla = (a, b) => talla(a).ord - talla(b).ord || String(a.nombre).localeCompare(String(b.nombre), 'es');

// ---------- lo de la última compra (para que no haya que escribir nada) ----------
const porPaqueteM = m => (m.unidad || 'ud') !== 'ud'; // rollos o botes que traen metros / ml / g
function ultimaCompra(m) {
  const L = (S.t.movMateriales || []).filter(x => x.materialId === m.id && (x.tipo === 'compra' || /^compra/i.test(String(x.motivo || ''))) && n(x.cambio) > 0)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const x = L[L.length - 1]; if (!x) return null;
  const paq = porPaqueteM(m) && n(m.cantidad) > 0 ? Math.max(1, Math.round(n(x.cambio) / n(m.cantidad))) : Math.round(n(x.cambio));
  return { paquetes: paq, fecha: x.fecha, total: lleno(x.importe) && n(x.importe) > 0 ? n(x.importe) : null };
}
// lo que cuesta UNO (una caja, un sobre, un rollo): tu último precio confirmado; si no, el de la última compra
export function precioDeUno(m) {
  const hist = (S.t.preciosHist || []).filter(x => x.materialId === m.id && n(x.costeUnidad) > 0).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).pop();
  const porUd = hist ? n(hist.costeUnidad) : n(m.costeUnidad);
  if (porUd > 0) return Math.round(porUd * (porPaqueteM(m) ? (n(m.cantidad) || 1) : 1) * 100) / 100;
  const u = ultimaCompra(m); return u && u.total ? Math.round(u.total / u.paquetes * 100) / 100 : null;
}
function precioBobina(c) {
  const L = (c && c.bobinas ? c.bobinas : []).filter(b => n(b.precio) > 0).sort((a, b) => String(a.creado || a.fecha || '').localeCompare(String(b.creado || b.fecha || '')));
  return L.length ? n(L[L.length - 1].precio) : null;
}
// lo que hay que comprar (se hace sola): lo que no queda o se acaba, primero lo que no queda
function porComprar() {
  const mats = activos().filter(m => ['agotado', 'bajo'].includes(nivel(m))).map(m => ({ k: 'm:' + m.id, clase: claseDe(m), m, nv: nivel(m) }));
  const cols = colores().filter(c => c.nivel !== 'ok').map(c => ({ k: 'c:' + c.clave, clase: 'filamento', c, nv: c.nivel }));
  const orden = k => CLASES.findIndex(c => c.k === k);
  return mats.concat(cols).sort((a, b) => (a.nv === 'agotado' ? 0 : 1) - (b.nv === 'agotado' ? 0 : 1) || orden(a.clase) - orden(b.clase) || (a.m && b.m ? porTalla(a.m, b.m) : 0));
}
const cosa = (m, q) => { const c = claseDe(m); return c !== 'otro' && (m.unidad || 'ud') === 'ud' ? (q === 1 ? CLASE(c).una : CLASE(c).pl) : unidad(m.unidad || 'ud', q); };
const cantM = (m, v) => numero(v) + ' ' + cosa(m, Math.abs(n(v)));
const nombreCorto = m => { const c = claseDe(m); if (c === 'otro') return m.nombre; const x = talla(m); return CLASE(c).una.replace(/^./, s => s.toUpperCase()) + ' ' + (x.t ? (c === 'bolsa' && PALABRA[x.t] ? PALABRA[x.t].toLowerCase() : x.t) : '') + (x.titulo && !(x.t && x.titulo === (PALABRA[x.t] || '')) ? ' · ' + x.titulo.replace(/^(Pequeña|Mediana|Grande) · /, '') : ''); };
// ¿lo ha usado alguna vez? (lo que nunca se ha contado ni comprado —la lista de componentes de los kits— no estorba en «Qué hay»)
const usado = m => lleno(m.stock) || !!ultimaCompra(m);

// ---------- LA PANTALLA ----------
let pestana = 'hay', masTab = 'revisar', mesSel = '', filtroMov = 'todo';
const cache = { pend: null, pendT: 0, mes: {} };
export function olvida() { cache.pend = null; cache.mes = {}; } // tras cualquier cambio: se vuelven a pedir
export function render(el, params) {
  const p0 = params && params[0];
  if (p0 === 'hay' || p0 === 'compro') pestana = p0;
  else if (p0 === 'tengo') pestana = 'hay';
  else if (['mas', 'revisar', 'movimientos', 'mes', 'negocio'].includes(p0)) { pestana = 'mas'; masTab = p0 === 'mas' ? (['revisar', 'movimientos', 'mes', 'negocio'].includes(params[1]) ? params[1] : masTab) : p0; }
  const mover = can('stock.mover');
  const tabs = h('div.alm2-tabs', { role: 'tablist' }), cuerpo = h('div.alm2-cuerpo');
  const carrito = h('button.alm2-carrito', { type: 'button', onclick: () => mover ? heComprado({}, tras) : requestAccess('stock.mover', 'almacen') },
    h('span.e', '🛒'), h('span.t', h('b', 'He comprado algo'), h('span', 'Cajas, sobres, bolsas o filamento: eliges, tocas y se suma solo')), h('span.f', '→'));
  const sv = String((S.cfg && S.cfg.version) || '0').split('.').map(Number), viejoSrv = (sv[0] || 0) * 1e6 + (sv[1] || 0) * 1e3 + (sv[2] || 0) < 18003000;
  el.append(
    h('div.page-head', h('div', h('h1', '📦 Mi almacén'), h('div.muted.small', 'Lo que gastas al imprimir, al vender y al empaquetar se descuenta solo. Tú solo apuntas lo que compras.'))),
    viejoSrv ? h('div.alm2-srv', h('b', '🟡 Falta un paso para que el filamento se descuente SIEMPRE'), h('span', 'Tu servidor de Google es el ' + ((S.cfg && S.cfg.version) || 'antiguo') + '. Pega el Servidor.gs nuevo (carpeta de la versión → LEEME, 5 pasos): hasta entonces, las ventas en mano y lo que imprimes fuera de la cola no bajan de las bobinas.')) : null,
    carrito, tabs, cuerpo);
  function tras() { olvida(); draw(); }
  const ir = k => { pestana = k; history.replaceState(null, '', '#/almacen/' + k + (k === 'mas' ? '/' + masTab : '')); draw(); };
  function draw() {
    const nCompra = porComprar().length;
    if (pestana === 'mas') mount(tabs, h('button.alm2-volver', { type: 'button', onclick: () => ir('hay') }, '← Volver a Mi almacén'));
    else mount(tabs, [['hay', '📦 Qué hay', ''], ['compro', '🛒 Qué compro', nCompra ? String(nCompra) : '']].map(([k, t, b]) =>
      h('button.alm2-tab' + (pestana === k ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(pestana === k), 'data-tab': k, onclick: () => ir(k) }, t, b ? h('span.alm2-badge', b) : null)));
    carrito.hidden = pestana === 'mas';
    ({ hay: drawHay, compro: drawCompro, mas: drawMas })[pestana]();
  }

  // ===== 📦 QUÉ HAY =====
  function drawHay() {
    const mats = activos(), cols = colores(), prods = levels().list.filter(x => x.producto && x.controlado);
    const bloques = ['caja', 'sobre', 'bolsa'].map(k => {
      const L = mats.filter(m => claseDe(m) === k).sort(porTalla), C = CLASE(k), total = L.reduce((a, m) => a + Math.max(0, n(m.stock)), 0);
      return seccion(k, C.e + ' ' + C.t, L.length ? total + ' ' + (total === 1 ? C.una : C.pl) : '', L.map(m => tileMat(m)),
        h('button.alm2-tile.alm2-mas', { type: 'button', onclick: () => mover ? heComprado({ clase: k }, tras) : requestAccess('stock.mover', 'almacen') }, h('span.alm2-letra', '＋'), h('b', L.length ? 'Otra talla' : 'Añadir ' + C.pl)));
    });
    bloques.push(seccion('filamento', '🧵 Filamento', cols.length ? kg(cols.reduce((a, c) => a + c.gramos, 0)) + ' en ' + cols.reduce((a, c) => a + c.abiertas.length, 0) + ' bobinas' : '', cols.map(tileCol),
      h('button.alm2-tile.alm2-mas', { type: 'button', onclick: () => mover ? heComprado({ clase: 'filamento' }, tras) : requestAccess('stock.mover', 'almacen') }, h('span.alm2-letra', '＋'), h('b', cols.length ? 'Otro color' : 'Añadir filamento'))));
    if (prods.length) bloques.push(seccion('piezas', '🎁 Piezas ya hechas', prods.reduce((a, x) => a + Math.max(0, x.fisico), 0) + ' en la estantería', prods.map(tileProd)));
    const otros = mats.filter(m => claseDe(m) === 'otro' && usado(m)).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    if (otros.length) bloques.push(seccion('otro', '🧴 Otras cosas', '', otros.map(m => tileMat(m))));
    mount(cuerpo, h('div.alm2-hay', bloques), pie());
  }
  const seccion = (k, titulo, resumen, tiles, extra) => h('section.alm2-sec', { 'data-clase': k }, h('h2', titulo, resumen ? h('small', resumen) : null), h('div.alm2-tiles', tiles, extra || null));
  function tileMat(m) {
    const x = talla(m), nv = nivel(m), c = claseDe(m), u = m.unidad || 'ud';
    return h('button.alm2-tile.' + nv, { type: 'button', 'data-id': m.id, title: m.nombre, onclick: () => fichaMat(m) },
      c === 'otro' ? h('span.alm2-ic', ICONO(m)) : h('span.alm2-letra' + (x.letra.length > 3 ? '.larga' : ''), x.letra, puntoColor(m)),
      h('b.alm2-nom', c === 'otro' ? m.nombre : x.titulo), x.sub ? h('span.alm2-sub', x.sub) : null,
      h('span.alm2-n', lleno(m.stock) ? numero(m.stock) : '—'), h('span.alm2-u', lleno(m.stock) ? cosa(m, n(m.stock)) : 'sin contar'),
      nv === 'agotado' || nv === 'bajo' ? h('span.alm2-aviso', ESTADO[nv][0]) : null);
  }
  function tileCol(c) {
    return h('button.alm2-tile.' + c.nivel, { type: 'button', 'data-color': c.clave, onclick: () => fichaCol(c) },
      h('span.alm2-bola', { style: { background: c.hex } }), h('b.alm2-nom', c.color || '(sin color)'), h('span.alm2-sub', c.material + ' · ' + (c.abiertas.length === 1 ? '1 bobina' : c.abiertas.length + ' bobinas')),
      h('span.alm2-n', kg(c.gramos)), c.apartado > 0 ? h('span.alm2-u.alm2-apartado', kg(c.apartado) + ' apartados para pedidos') : null, c.nivel !== 'ok' ? h('span.alm2-aviso', ESTADO[c.nivel][0]) : null);
  }
  function tileProd(x) {
    const nv = x.fisico <= 0 ? 'agotado' : (x.bajo ? 'bajo' : 'ok');
    return h('button.alm2-tile.' + nv, { type: 'button', onclick: () => fichaProd(x) }, h('span.alm2-ic', '🎁'), h('b.alm2-nom', x.producto), x.reservado ? h('span.alm2-sub', x.reservado + ' apartadas para pedidos') : null,
      h('span.alm2-n', String(x.fisico)), h('span.alm2-u', x.fisico === 1 ? 'pieza' : 'piezas'));
  }
  // tocar una cosa: cuántas hay (− y +) o «he comprado»
  function fichaMat(m) {
    if (!mover) return requestAccess('stock.mover', 'almacen');
    const u = m.unidad || 'ud', f = inp({ type: 'number', min: 0, step: 'any', inputmode: 'decimal', value: lleno(m.stock) ? n(m.stock) : '', class: 'inp alm-num' }), msg = h('p.bad-t'), dif = h('p.alm-res');
    const calc = () => { if (!lleno(m.stock) || f.value === '') return mount(dif, ''); const d = n(f.value) - n(m.stock); mount(dif, d === 0 ? '' : h('span.warn-t', 'Ponía ' + cantM(m, m.stock) + ': ' + (d < 0 ? 'faltan ' : 'sobran ') + cantM(m, Math.abs(d)))); };
    f.addEventListener('input', calc);
    const x = talla(m), c = claseDe(m), col0 = colorEnv(m);
    let col = col0 ? col0.k : '';
    const opcCol = c === 'sobre' ? ['blanc', 'marr'] : c === 'bolsa' ? ['blanc', 'negr', 'marr', 'kraft', 'transp'] : c === 'caja' ? ['marr', 'blanc', 'kraft'] : [];
    const chipsCol = opcCol.length && can('costes.editar') ? h('div.alm-chips.alm2-cols', opcCol.map(k => { const d = COLORES_ENV.find(y => y[0] === k); return h('button.alm-chip' + (col === k ? '.on' : ''), { type: 'button', 'data-color': k, onclick: e => { col = col === k ? '' : k; [...e.currentTarget.parentNode.children].forEach(b => b.classList.toggle('on', b.dataset.color === col)); } },
      h('i.alm2-colorin.chip', { style: { background: d[3] } }), c === 'sobre' ? d[1] : d[2]); })) : null;
    const md = modal((c === 'otro' ? ICONO(m) : CLASE(c).e) + ' ' + m.nombre, h('div.alm2-ficha',
      c !== 'otro' && (x.sub || x.t) ? h('p.small.muted', [x.t ? 'Talla ' + x.t : '', x.sub].filter(Boolean).join(' · ')) : null,
      h('p.alm-preg', (c === 'otro' ? (u === 'ud' ? '¿Cuántos hay' : '¿Cuántos ' + unidad(u, 2) + ' hay') : cuantas(c) + ' hay') + ' ahora?'), h('div.alm-paso', stepper(f, u === 'ud' ? 1 : 0.5)), dif,
      chipsCol ? [h('p.alm-preg', '¿De qué color ' + (c === 'sobre' ? 'es?' : 'es?')), chipsCol] : null, msg,
      h('button.alm2-compre', { type: 'button', onclick: () => { md.close(); heComprado({ material: m }, tras); } }, '🛒 He comprado ', c === 'otro' ? 'más' : CLASE(c).pl, ' de ', c === 'otro' ? 'esto' : 'esta talla')),
      close => [btn('Cancelar', close), btn('✔ Guardar', async ev => {
        if (f.value === '') { msg.textContent = 'Escribe cuántas hay.'; return; }
        const bt = ev.target.closest('button'); bt.disabled = true;
        try {
          let mm = m;
          if (chipsCol && col !== (col0 ? col0.k : '')) { // el color va en el nombre (así se ve en todas partes: embalaje, pedidos, compras)
            const d = COLORES_ENV.find(y => y[0] === col), nuevo = conColor(m, d ? (c === 'sobre' ? d[1] : d[2]) : '');
            if (nuevo && nuevo !== m.nombre) { const r0 = await api('materiales.guardar', { id: m.id, datos: { nombre: nuevo } }); mm = r0.material; upsertLocal('materiales', mm); }
          }
          if (n(f.value) !== n(mm.stock) || !lleno(mm.stock)) { const r = await guardaCuenta(mm, n(f.value)); if (r) upsertLocal('materiales', r.material); }
          emit(); toast('✔ ' + mm.nombre + ': ' + cantM(mm, f.value), 'ok'); md.close(); tras();
        }
        catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
      }, { cls: 'primary alm2-guardar' })], { size: 'narrow' });
    calc();
  }
  function fichaCol(c) {
    if (!mover) return requestAccess('stock.mover', 'almacen');
    const md = modal('🧵 ' + c.material + ' ' + c.color, h('div.alm2-ficha',
      h('div.alm2-ficha-n', h('span.alm2-bola.g', { style: { background: c.hex } }), h('b', kg(c.gramos)), h('span', ' en ' + (c.abiertas.length === 1 ? '1 bobina' : c.abiertas.length + ' bobinas'))),
      c.apartado > 0 ? h('p.alm2-apartado-t', '📌 ', h('b', kg(c.apartado)), ' ya están apartados para los pedidos que faltan por hacer: quedan libres ', h('b', kg(Math.max(0, c.gramos - c.apartado))), '.') : null,
      h('p.small.muted', 'Se descuenta solo al hacer cada pedido (al pasar a «En mesa» o después), al imprimir desde la cola y con «He impreso». Si quieres que cuadre del todo, pesa las bobinas de vez en cuando.'),
      h('div.alm2-dos', h('button.alm2-compre', { type: 'button', onclick: () => { md.close(); heComprado({ color: c }, tras); } }, '🛒 He comprado bobinas'),
        h('button.alm2-compre.b', { type: 'button', onclick: () => { md.close(); cuento({ soloColor: c.clave }, tras); } }, '⚖️ Pesar las bobinas'))), close => [btn('Cerrar', close)], { size: 'narrow' });
  }
  function fichaProd(x) {
    if (!mover) return requestAccess('stock.mover', 'almacen');
    const md = modal('🎁 ' + x.producto, h('div.alm2-ficha', h('div.alm2-ficha-n', h('b', String(x.fisico)), h('span', x.fisico === 1 ? ' pieza en la estantería' : ' piezas en la estantería')),
      h('p.small.muted', 'Las que se venden con un pedido salen solas.'),
      h('div.alm2-dos', h('button.alm2-compre', { type: 'button', onclick: async () => { md.close(); await heImpreso(x.producto, tras); } }, '🖨️ He impreso una más'),
        h('button.alm2-compre.b', { type: 'button', disabled: x.fisico <= 0, onclick: async () => { md.close(); await quitarPieza(x, tras); } }, '− Quitar una'))), close => [btn('Cerrar', close)], { size: 'narrow' });
  }
  function pie() {
    const mas = h('button.alm2-pie-b', { type: 'button', onclick: () => ir('mas') }, '📊 Más detalles', h('span.alm2-pie-s', 'historial, este mes y lo que hay que revisar'));
    // un aviso pequeño si hay algo por revisar (pedidos sin descontar el filamento…); si el servidor es el antiguo, nada
    (async () => { try { const p = cache.pend && Date.now() - cache.pendT < 60000 ? cache.pend : await api('almacen.pendientes', {}, { quiet: true }); cache.pend = p; cache.pendT = Date.now();
      const k = cuantosPend(p); if (k && mas.isConnected) mas.append(h('span.alm2-badge.warn', k + ' por revisar')); } catch (e) { } })();
    return h('div.alm2-pie', mover ? h('button.alm2-pie-b', { type: 'button', onclick: () => cuento({}, tras) }, '✏️ Contar todo de una vez', h('span.alm2-pie-s', 'cada 2 semanas, para que cuadre')) : null, mas);
  }

  // ===== 🛒 QUÉ COMPRO =====
  function drawCompro() {
    const L = porComprar();
    if (!L.length) return mount(cuerpo, h('div.alm2-vacio', h('span.e', '✅'), h('b', 'No te falta nada'), h('span', 'Cuando algo se acabe, aparece aquí solo. Y al comprarlo, pulsa el carrito de arriba.')));
    const linea = x => x.m ? nombreCorto(x.m) + (x.nv === 'agotado' ? ' (no queda)' : ' (quedan ' + cantM(x.m, x.m.stock) + ')') : 'Filamento ' + x.c.material + ' ' + x.c.color + (x.nv === 'agotado' ? ' (no queda)' : ' (quedan ' + kg(x.c.gramos) + ')');
    mount(cuerpo, h('div.alm2-compro-cab', h('p', 'Esto se está acabando. Cuando lo compres, pulsa ', h('b', '«Ya lo he comprado»'), ' y se suma solo.'),
      btn('📋 Copiar la lista', () => copyText('🛒 Lo que tengo que comprar:\n' + L.map(x => '• ' + linea(x)).join('\n')), { cls: 'sm alm2-copiar' })),
      h('div.alm2-lista', L.map(x => {
        const m = x.m, c = x.c, u = m && ultimaCompra(m), pu = m ? precioDeUno(m) : precioBobina(c);
        const quedan = x.nv === 'agotado' ? 'No queda' : 'Quedan ' + (m ? cantM(m, m.stock) : kg(c.gramos) + (c.apartado ? ' (' + kg(c.apartado) + ' apartados para pedidos)' : ''));
        const ult = u ? 'La última vez: ' + u.paquetes + (u.total ? ' por ' + eur(u.total) : '') : pu ? 'Cada ' + (m ? (claseDe(m) === 'otro' ? 'uno' : CLASE(claseDe(m)).una) : 'bobina') + ' ≈ ' + eur(pu) : '';
        return h('div.alm2-comprar.' + x.nv, { 'data-k': x.k },
          m ? (claseDe(m) === 'otro' ? h('span.alm2-ic', ICONO(m)) : h('span.alm2-letra' + (talla(m).letra.length > 3 ? '.larga' : ''), talla(m).letra)) : h('span.alm2-bola', { style: { background: c.hex } }),
          h('div.alm2-comprar-t', h('b', m ? nombreCorto(m) : c.material + ' ' + c.color), h('span', quedan + (ult ? ' · ' + ult : ''))),
          mover ? btn('✔ Ya lo he comprado', () => heComprado(m ? { material: m } : { color: c }, tras), { cls: 'primary alm2-ya' }) : null);
      })));
  }

  // ===== 📊 MÁS DETALLES (lo de antes, plegado aquí para que no estorbe) =====
  function drawMas() {
    const sub = h('div.tabs.alm-tabs'), box = h('div');
    mount(sub, [['revisar', '⚠️ Por revisar'], ['movimientos', '↔️ Entradas y salidas'], ['mes', '📊 Este mes'], ['negocio', '📱 Móvil y SIM']].map(([k, t]) =>
      h('button' + (masTab === k ? '.on' : ''), { type: 'button', onclick: () => { masTab = k; history.replaceState(null, '', '#/almacen/mas/' + k); drawMas(); } }, t)));
    mount(cuerpo, sub, box);
    ({ revisar: drawRevisar, movimientos: drawMovimientos, mes: drawMes, negocio: drawNegocio })[masTab](box);
  }
  function drawNegocio(box) {
    const L = gastosNeg().slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))), hoy = new Date().toISOString().slice(0, 10), q = CL.cuotaNegocio(S.cfg, S.t, hoy);
    const fin = g => { const d = new Date(String(g.fecha).slice(0, 10) + 'T12:00:00'); d.setMonth(d.getMonth() + (Number(g.meses) || 1)); return d.toISOString().slice(0, 10); };
    mount(box, h('div.alm2-neg-cab', h('div', h('b', q.cuota ? '📱 Ahora cada pedido recupera ' + eur(q.cuota) : '📱 Ahora no hay nada que recuperar'),
      h('span', q.cuota ? 'Va sumado al coste de cada pedido (y al precio recomendado de tus productos), repartido entre los ≈ ' + q.pedidosMes + ' pedidos que haces al mes.' : 'Cuando compres una SIM o un móvil, apúntalo con el carrito → «Móvil o SIM» y se recupera solo con los pedidos.')),
      can('config.editar') ? btn('＋ Apuntar uno', () => gastoNegocio({}, () => { drawNegocio(box); }), { cls: 'primary' }) : null),
      L.length ? h('div.alm2-lista', L.map(g => { const vivo = hoy >= String(g.fecha).slice(0, 10) && hoy < fin(g), c = (q.lineas.find(x => x.id === g.id) || {}).cuota;
        return h('div.alm2-comprar' + (vivo ? '' : '.hecho'), h('span.alm2-ic', (NEGOCIO.find(x => x.k === g.que) || NEGOCIO[2]).e),
          h('div.alm2-comprar-t', h('b', g.nombre + ' · ' + eur(g.importe)), h('span', fdate(g.fecha) + ' · ' + (vivo ? 'se recupera hasta el ' + fdate(fin(g)) + (c ? ' · ' + eur(c) + ' por pedido' : '') : '✔ ya recuperado'))),
          can('config.editar') ? btn('Quitar', async () => { if (!await confirmDlg('Quitar este gasto', '¿Quitas «' + g.nombre + '» (' + eur(g.importe) + ')? Deja de sumarse a los pedidos.', 'Sí, quitar')) return; try { await guardaNegocio(gastosNeg().filter(x => x.id !== g.id)); toast('Quitado', 'ok'); drawNegocio(box); } catch (e) { toast(e.message || String(e), 'bad'); } }, { cls: 'sm ghost' }) : null);
      })) : null);
  }
  async function drawRevisar(box) {
    const pendBox = h('div', h('p.muted', 'Cargando…'));
    mount(box, pendBox, avisosCfg(), avanzadas());
    let p = cache.pend;
    if (!p || Date.now() - cache.pendT > 60000) {
      try { p = await api('almacen.pendientes', {}, { quiet: true }); cache.pend = p; cache.pendT = Date.now(); }
      catch (e) { if (pendBox.isConnected) mount(pendBox, viejo(e) ? h('div.alm-viejo', '🟡 ', SERVIDOR_VIEJO) : h('p.small.muted', e.message || String(e))); return; }
    }
    if (!pendBox.isConnected) return;
    mount(pendBox, pendientes(p, tras) || h('div.alm-bien', '✅ No hay nada por revisar: las cuentas cuadran.'), tocaContar(p.ultimoRecuento));
  }
  function tocaContar(ult) {
    const d = dias(ult), toca = d === null || d >= 14;
    if (!toca) return null;
    return h('div.alm-contar', h('span', '⏰ ', d === null ? 'Todavía no has contado nada con el programa.' : 'Hace ' + d + ' días que no cuentas.', ' Lo que se descuenta solo es aproximado (los gramos del laminado, el embalaje de cada pedido): cuenta cada 2 semanas y las cuentas cuadran.'),
      mover ? btn('✏️ Contar ahora', () => cuento({}, tras), { cls: 'sm primary' }) : null);
  }

  // ===== ↔️ ENTRADAS Y SALIDAS =====
  const mesActual = () => mesSel || new Date().toISOString().slice(0, 7);
  const mesTxt = m => { const t = new Date(m + '-15').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const otroMes = d => { const [y, mo] = mesActual().split('-').map(Number), t = new Date(Date.UTC(y, mo - 1 + d, 15)); mesSel = t.toISOString().slice(0, 7); draw(); };
  const navMes = () => h('div.alm-mesnav', btn('‹', () => otroMes(-1), { cls: 'sm', title: 'Mes anterior' }), h('b', mesTxt(mesActual())), btn('›', () => otroMes(1), { cls: 'sm', title: 'Mes siguiente', disabled: mesActual() >= new Date().toISOString().slice(0, 7) }));
  async function datosMes() {
    const m = mesActual();
    if (!cache.mes[m]) cache.mes[m] = await api('almacen.mes', { mes: m }, { quiet: true });
    return cache.mes[m];
  }
  const motivo = x => String(x.motivo || '').replace(/^(Compra|Recuento|Impresión|Pedido|He impreso|Uso|Fallo|Entrada|Salida)\s*(\([^)]*\))?:?\s*/i, '').replace(/^[·\s]+/, '').trim(); // sin repetir lo que ya dice la etiqueta
  const TIPO = { compra: ['🛒', 'Compra', 'in'], entrada: ['➕', 'Entrada', 'in'], hecho: ['🖨️', 'Hecho', 'in'], impresion: ['🖨️', 'Impresión', 'out'], pedido: ['📦', 'Pedido', 'out'], uso: ['✂️', 'Uso', 'out'], fallo: ['💥', 'Fallo', 'out'], salida: ['➖', 'Salida', 'out'], recuento: ['✏️', 'Recuento', 'cnt'], retirada: ['🗑️', 'Quitada', 'out'] };
  async function drawMovimientos(cont) {
    const box = h('div', h('p.muted', 'Cargando…'));
    mount(cont, navMes(), box);
    let d; try { d = await datosMes(); } catch (e) { mount(box, h('div.alm-viejo', viejo(e) ? SERVIDOR_VIEJO : (e.message || String(e)))); return; }
    if (!box.isConnected) return;
    const chips = [['todo', 'Todo'], ['in', '⬇️ Entradas'], ['out', '⬆️ Salidas'], ['cnt', '✏️ Recuentos']];
    const dir = x => x.tipo === 'recuento' ? 'cnt' : x.cambio < 0 ? 'out' : 'in'; // («he impreso»: el filamento sale y la pieza entra)
    const L = d.movimientos.filter(x => filtroMov === 'todo' || dir(x) === filtroMov);
    const fila = x => {
      const t = TIPO[x.tipo] || ['•', x.tipo, ''], cuanto = x.unidad === 'g' ? kg(x.cambio) : cant(x.cambio, x.unidad);
      return h('div.alm-mov' + (x.cambio < 0 ? '.sale' : '.entra'),
        h('span.alm-movf', fdate(x.fecha)), h('span.alm-ic', t[0]),
        h('div.alm-nom', h('b', x.que), h('span', t[1] + (motivo(x) ? ' · ' + motivo(x) : ''))),
        x.pedidoId ? h('a.small.alm-movp', { href: '#/pedidos/' + x.pedidoId }, 'Ver pedido' + (x.pedido ? ' nº ' + x.pedido : '')) : h('span'),
        h('b.alm-movc', signo(x.cambio) + cuanto.replace(/^[−-]/, '')),
        h('span.alm-movi', x.importe !== null && x.importe !== undefined ? eur(x.importe) : x.sinPrecio ? pill('sin precio', 'warn') : ''));
    };
    mount(box, h('div.alm-chips', chips.map(([k, t]) => h('button.alm-chip' + (filtroMov === k ? '.on' : ''), { type: 'button', onclick: () => { filtroMov = k; drawMovimientos(cont); } }, t))),
      L.length ? h('section.alm-bloque.alm-movs', L.map(fila)) : h('div.card', empty('box', 'Sin movimientos', 'Nada ' + (filtroMov === 'todo' ? '' : 'de esto ') + 'en ' + mesTxt(mesActual()) + '.')),
      d.total > d.movimientos.length ? h('p.tiny.muted', 'Se ven los ' + d.movimientos.length + ' más recientes de ' + d.total + '.') : null,
      !d.desdeRegistro ? h('p.tiny.muted', 'El filamento se apunta gramo a gramo desde el 26-10-2026; lo de antes sale en «Este mes» calculado con la cola y los pedidos.') : null);
  }

  // ===== 📊 ESTE MES =====
  async function drawMes(cont) {
    const box = h('div', h('p.muted', 'Cargando…'));
    mount(cont, navMes(), box);
    let d; try { d = await datosMes(); } catch (e) { mount(box, h('div.alm-viejo', viejo(e) ? SERVIDOR_VIEJO : (e.message || String(e)))); return; }
    if (!box.isConnected) return;
    const costes = d.compras !== null, kpi = (num, txt, sub, cls) => h('div.kpi.static' + (cls ? '.' + cls : ''), h('span.n', num), h('span.l', txt), sub ? h('span.tiny.muted', sub) : null);
    const max = Math.max(1, ...d.colores.map(c => c.gramos));
    mount(box,
      h('div.kpis.g4',
        costes ? kpi(eur(d.compras), 'Has comprado', 'materiales ' + eur(d.comprasMateriales) + ' · filamento ' + eur(d.comprasFilamento)) : null,
        kpi(kg(d.filamentoGramos), 'Filamento gastado', costes ? '≈ ' + eur(d.filamentoImporte) + ' de filamento' : ''),
        costes ? kpi(eur(d.consumoMateriales), 'Material gastado', 'cajas, sobres, cinta, papel…') : null,
        kpi(String(d.piezasHechas), 'Piezas hechas', d.piezasVendidas + ' enviadas o entregadas'),
        kpi(String(d.descuadre.veces), d.descuadre.veces === 1 ? 'Cosa que no cuadró al contar' : 'Cosas que no cuadraron al contar', costes && d.descuadre.veces ? (d.descuadre.importe < 0 ? 'faltaban ≈ ' + eur(-d.descuadre.importe) : 'sobraban ≈ ' + eur(d.descuadre.importe)) : '', d.descuadre.veces ? 'warn' : 'ok')),
      h('section.alm-bloque', h('h3', '🧵 Filamento por color ', d.colorMasUsado ? h('small', '· el más usado: ' + d.colorMasUsado.nombre) : null),
        d.colores.length ? d.colores.map(c => h('div.alm-barra', h('span.alm-bn', c.nombre), h('span.alm-bb', h('i', { style: { width: Math.max(2, Math.round(c.gramos / max * 100)) + '%', background: hexDe(c.nombre) } })), h('b', kg(c.gramos)), costes ? h('span.tiny.muted', eur(c.importe)) : null))
          : h('p.small.muted', 'Sin filamento gastado en ' + mesTxt(mesActual()) + '. (Se apunta solo al imprimir desde la cola, al vender un pedido o con «＋ He impreso».)')),
      d.descuadre.lista.length ? h('section.alm-bloque', h('h3', '✏️ Lo que no cuadró al contar'), h('p.tiny.muted', 'Lo que el programa creía que había y lo que contaste. Si se repite en lo mismo, revisa cuánto gasta (el embalaje de los pedidos o los gramos del producto).'),
        d.descuadre.lista.map(x => h('div.alm-fila', h('span.alm-ic', x.cambio < 0 ? '🔻' : '🔺'), h('div.alm-nom', h('b', x.que), x.veces > 1 ? h('span', 'en ' + x.veces + ' recuentos') : null), h('div.alm-cuanto', h('b', (x.cambio < 0 ? 'faltaban ' : 'sobraban ') + (x.unidad === 'g' ? kg(Math.abs(x.cambio)) : cant(Math.abs(x.cambio), x.unidad))))))) : null);
  }
  const hexDe = nombre => { const c = colores().find(x => CL.norm(x.material + ' ' + x.color) === CL.norm(nombre)); return c ? c.hex : 'var(--brand)'; };

  function avisosCfg() {
    if (!can('costes.editar') && !can('stock.mover')) return null;
    const sc = CL.simpleCfg(((S.cfg || {}).embalaje || {}).simple), u = inp({ type: 'number', min: 0, step: 1, value: sc.avisoUnidades, class: 'inp alm-peq' }), m = inp({ type: 'number', min: 0, step: 0.5, value: sc.avisoMetros, class: 'inp alm-peq' });
    const guarda = async () => { try { await api('envases.config', { avisoUnidades: u.value, avisoMetros: m.value }); await pull(); toast('Avisos guardados', 'ok'); } catch (e) { toast(e.message || String(e), 'bad'); } };
    [u, m].forEach(i => i.addEventListener('change', guarda));
    return h('details.more.alm-avanzadas', h('summary', '🔔 Cuándo avisar de que algo se acaba'), h('div.in',
      h('p.small', 'Avisar cuando queden ', u, ' unidades o ', m, ' metros.'),
      h('p.tiny.muted', 'Las cajas usan su propio aviso de Embalaje; lo de botes y rollos (ml, gramos), cuando queda menos de medio. Cada cosa puede tener el suyo (en Inventario completo → ⚙️). Es la misma regla en todo el programa.')));
  }
  draw();
  return { update: () => { if (pestana !== 'mas') draw(); }, guardaLoEscrito: true };
}
// cuántas cosas hay «por revisar» (para el aviso pequeño de abajo)
function cuantosPend(p) {
  if (!p) return 0;
  const prods = new Set((p.pedidos || []).map(o => (o.productoId || o.producto) + '|' + o.falta)).size, yaSale = new Set((p.pedidos || []).map(o => o.productoId));
  const estim = new Set((p.estimadas || []).map(b => b.nombre)).size;
  return prods + (p.productos || []).filter(x => !yaSale.has(x.id)).length + (p.compras || []).length + (p.sinContar || []).length + estim + (p.parecidos || []).length;
}

function avanzadas() {
  const L = [['inventario/compras', '🧾 Historial de compras (corregir una compra)', 'productos.ver'], ['costes', '💶 Precios y coste de cada producto', 'productos.costes'], ['inventario/estadisticas', '📊 Estadísticas', 'productos.costes'],
    ['stock', '🎁 Piezas en stock (detalle)', 'productos.ver'], ['taller/filamento', '🧵 Bobinas una a una (marca, ubicación)', 'taller.ver'], ['inventario', '📦 Inventario completo (avisos de cada cosa)', 'productos.ver']].filter(x => can(x[2]));
  return h('details.more.alm-avanzadas', h('summary', '⚙️ Opciones avanzadas'), h('div.in', h('p.tiny.muted', 'Para el día a día no hace falta. Están aquí por si quieres ver el detalle.'),
    h('div.row.wrap', L.map(x => btn(x[1], () => go(x[0]), { cls: 'sm' })))));
}

// ---------- ⚠️ PENDIENTES: cada cosa con SU arreglo ----------
const FALTA = { consumo: 'no sé cuántos gramos gasta', producto: 'el producto no está en el catálogo', color: 'no sé de qué color se imprimió', bobina: 'no hay bobina de ese color apuntada' };
function pendientes(p, tras) {
  const editar = can('pedidos.editar'), costes = can('costes.editar'), mover = can('stock.mover');
  const items = [];
  // 1 · filamento sin descontar, por producto (al arreglar el producto se descuentan TODOS sus pedidos)
  const porProd = {};
  p.pedidos.forEach(o => { const k = (o.productoId || o.producto) + '|' + o.falta; (porProd[k] = porProd[k] || { o, l: [] }).l.push(o); });
  Object.values(porProd).forEach(({ o, l }) => {
    const nums = l.map(x => 'nº ' + x.numero), uds = l.reduce((a, x) => a + x.cantidad, 0);
    const acc = o.falta === 'producto' ? btn('Abrir el pedido', () => go('pedidos/' + o.id), { cls: 'sm' })
      : o.falta === 'bobina' ? [btn('He comprado ' + (o.material || 'PLA') + ' ' + (o.color || ''), () => heComprado({ color: { material: o.material || 'PLA', color: o.color, hex: '' } }, tras), { cls: 'sm' }), editar && o.productoId ? btn('Descontar ahora', () => consumo(o, l, false, tras), { cls: 'sm primary' }) : null]
      : editar && o.productoId ? btn(o.falta === 'color' ? 'Elegir el color' : 'Poner los gramos', () => consumo(o, l, true, tras), { cls: 'sm primary' }) : null;
    items.push(h('div.alm-pend', h('span.alm-ic', '🧵'), h('div.alm-nom', h('b', o.producto + ' · ' + (l.length === 1 ? '1 pedido' : l.length + ' pedidos') + ' sin descontar el filamento'),
      h('span', FALTA[o.falta] + ' · ' + uds + (uds === 1 ? ' pieza' : ' piezas') + ' (' + nums.slice(0, 5).join(', ') + (nums.length > 5 ? '…' : '') + ')')), h('div.alm-acc', acc)));
  });
  // 2 · productos que vendes sin su consumo (aún sin pedidos esperando)
  const yaSale = new Set(p.pedidos.map(o => o.productoId));
  p.productos.filter(x => !yaSale.has(x.id)).forEach(x => items.push(h('div.alm-pend', h('span.alm-ic', '🎁'), h('div.alm-nom', h('b', x.nombre), h('span', (x.falta === 'gramos' ? 'no sé cuántos gramos gasta' : 'no sé de qué color es (o lleva varios)') + ' · lo has vendido ' + x.vendidos + (x.vendidos === 1 ? ' vez' : ' veces'))),
    editar ? h('div.alm-acc', btn(x.falta === 'gramos' ? 'Poner los gramos' : 'Elegir el color', () => consumo({ productoId: x.id, producto: x.nombre, falta: x.falta === 'gramos' ? 'consumo' : 'color', color: x.color, material: x.material }, [], true, tras), { cls: 'sm primary' })) : null)));
  // 3 · compras sin precio
  p.compras.forEach(c => items.push(h('div.alm-pend', h('span.alm-ic', '🧾'), h('div.alm-nom', h('b', c.filamento ? (c.material + ' ' + c.color + ' · ' + c.bobinas.length + (c.bobinas.length === 1 ? ' bobina' : ' bobinas')) : c.material), h('span', 'Compra del ' + fdate(c.fecha) + ' sin precio: el coste de lo que fabricas no puede salir bien')),
    (c.filamento ? can('taller.editar') : costes) ? h('div.alm-acc', btn('Poner el precio', () => precioCompra(c, tras), { cls: 'sm primary' })) : null)));
  // 4 · sin contar y bobinas con el peso estimado
  p.sinContar.forEach(m => { const mm = (S.t.materiales || []).find(x => x.id === m.id); if (!mm || (claseDe(mm) === 'otro' && !usado(mm))) return; items.push(h('div.alm-pend', h('span.alm-ic', '✏️'), h('div.alm-nom', h('b', m.nombre), h('span', 'No sé cuánto tienes')), mover && mm ? h('div.alm-acc', btn('Contar', () => tengo(mm, tras), { cls: 'sm primary' })) : null)); });
  const estim = {}; p.estimadas.forEach(b => { (estim[b.nombre] = estim[b.nombre] || []).push(b); });
  Object.entries(estim).forEach(([nm, l]) => items.push(h('div.alm-pend', h('span.alm-ic', '⚖️'), h('div.alm-nom', h('b', nm), h('span', (l.length === 1 ? '1 bobina abierta' : l.length + ' bobinas abiertas') + ' con el peso ESTIMADO: pésala y pon lo que queda')),
    mover ? h('div.alm-acc', btn('Pesar', () => { const c = colores().find(x => CL.norm(x.material + ' ' + x.color) === CL.norm(nm)); cuento(c ? { soloColor: c.clave } : {}, tras); }, { cls: 'sm primary' })) : null)));
  // 5 · nombres que parecen la MISMA cosa
  p.parecidos.forEach(l => items.push(h('div.alm-pend', h('span.alm-ic', '👯'), h('div.alm-nom', h('b', '¿Son la misma cosa?'), h('span', l.map(x => '«' + x.nombre + '»' + (x.stock !== null ? ' (' + cant(x.stock, x.unidad) + ')' : '')).join(' y '))),
    h('div.alm-acc', costes ? btn('Sí, juntar', () => juntar(l, tras), { cls: 'sm primary' }) : null, mover ? btn('No, son distintas', async () => { try { await api('almacen.sonDistintos', { ids: l.map(x => x.id) }); tras(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm' }) : null))));
  if (!items.length) return null;
  return h('section.alm-pendientes', h('h3', '⚠️ Pendientes ', h('small', '(lo que no deja que las cuentas cuadren: cada uno se arregla aquí con un toque)')), items);
}
// gramos (y color) de un producto: se guarda en el producto y se descuentan TODOS sus pedidos que esperaban
function consumo(o, l, preguntar, tras) {
  const g = inp({ type: 'number', min: 0, step: 1, inputmode: 'decimal', placeholder: 'Ej.: 50', class: 'inp alm-num' }), msg = h('p.bad-t');
  const cols = [...new Set((S.t.bobinas || []).filter(b => n(b.restante) > 0).map(b => b.color).filter(Boolean))];
  let color = CL.norm(o.color || '') && !/[+·×,/]| y /i.test(o.color) ? o.color : '';
  const chips = h('div.alm-chips'), pintaChips = () => mount(chips, cols.map(c => h('button.alm-chip' + (CL.norm(c) === CL.norm(color) ? '.on' : ''), { type: 'button', onclick: () => { color = c; pintaChips(); } }, c)));
  pintaChips();
  const pideG = preguntar && (o.falta === 'consumo' || o.falta === 'producto'), pideC = preguntar && (o.falta === 'color' || !color);
  const ir = async ev => {
    const bt = ev.target.closest('button'); bt.disabled = true; msg.textContent = '';
    try {
      const r = await api('almacen.consumoProducto', { id: o.productoId, gramos: pideG ? (g.value === '' ? '' : n(g.value)) : undefined, color: color || undefined });
      upsertLocal('productos', r.producto); await pull();
      const ok = r.pedidos.filter(x => x.g > 0 && !x.falta), gr = ok.reduce((a, x) => a + x.g, 0);
      toast('🧵 ' + o.producto + ': ' + r.gramos + ' g por pieza' + (ok.length ? ' · descontados ' + kg(gr) + ' de ' + ok.length + (ok.length === 1 ? ' pedido' : ' pedidos') : ''), 'ok', 7000);
      const mal = r.pedidos.filter(x => x.falta || x.error); if (mal.length) toast(mal.length + ' pedido(s) siguen sin descontar: ' + (FALTA[mal[0].falta] || mal[0].error || ''), 'warn', 8000);
      m.close(); tras();
    } catch (e) { msg.textContent = viejo(e) ? SERVIDOR_VIEJO : (e.message || String(e)); bt.disabled = false; }
  };
  const m = modal('🧵 ' + o.producto, h('div',
    pideG ? [h('p.alm-preg', '¿Cuántos gramos gasta UNA pieza?'), h('div.alm-paso', g, h('span.alm-eur', 'g')), h('p.tiny.muted', 'Lo pone Bambu Studio al laminar (abajo a la derecha: «Filamento … g»). Se guarda en el producto: no te lo vuelvo a preguntar.')] : null,
    pideC ? [h('p.alm-preg', '¿De qué color se imprime?'), chips] : null,
    !pideG && !pideC ? h('p', 'Se descuenta el filamento de ' + (l.length === 1 ? 'su pedido' : 'sus ' + l.length + ' pedidos') + ' de las bobinas de ' + (o.material || 'PLA') + ' ' + (o.color || '') + '.') : null,
    l.length ? h('p.small', 'Al guardar se descuenta el filamento de ' + (l.length === 1 ? 'su pedido (nº ' + l[0].numero + ').' : 'sus ' + l.length + ' pedidos.')) : null, msg),
    close => [btn('Cancelar', close), btn('✔ Guardar y descontar', ir, { cls: 'primary' })], { size: 'narrow' });
}
function precioCompra(c, tras) {
  const f = inp({ type: 'number', min: 0, step: 0.01, inputmode: 'decimal', placeholder: '0,00', class: 'inp alm-num' }), msg = h('p.bad-t');
  const m = modal('🧾 Precio de la compra', h('div', h('p.alm-preg', c.filamento ? '¿Cuánto costó CADA bobina de ' + c.material + ' ' + c.color + '?' : '¿Cuánto pagaste en total por ' + numero(c.cambio) + ' × ' + c.material + '?'),
    h('div.alm-paso.euros', f, h('span.alm-eur', '€')), h('p.tiny.muted', 'Con IVA, lo que pone el ticket o el pedido. Se recalcula el coste de lo que fabricas.'), msg),
    close => [btn('Cancelar', close), btn('✔ Guardar', async ev => {
      if (f.value === '') { msg.textContent = 'Escribe el precio.'; return; }
      const bt = ev.target.closest('button'); bt.disabled = true;
      try {
        if (c.filamento) { const r = await api('almacen.precioBobinas', { bobinas: c.bobinas, precio: n(f.value) }); (r.bobinas || []).forEach(b => upsertLocal('bobinas', b)); }
        else await api('materiales.compraEditar', { id: c.id, total: n(f.value) });
        await pull(); toast('Precio guardado', 'ok'); m.close(); tras();
      } catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
    }, { cls: 'primary' })], { size: 'narrow' });
}
function juntar(l, tras) {
  let queda = l.slice().sort((a, b) => (n(b.stock) - n(a.stock)))[0].id;
  const opts = h('div.alm-items'), pinta = () => mount(opts, l.map(x => h('button.alm-item' + (x.id === queda ? '.on' : ''), { type: 'button', onclick: () => { queda = x.id; pinta(); } }, h('span', x.id === queda ? '✔' : '○'), h('b', x.nombre), h('small', x.stock !== null ? 'tienes ' + cant(x.stock, x.unidad) : 'sin contar'))));
  pinta();
  const msg = h('p.bad-t'), m = modal('👯 Juntar en uno', h('div', h('p.alm-preg', '¿Con qué nombre se queda?'), opts, h('p.small.muted', 'Lo que tengas del otro se suma a este, y los embalajes y productos que lo usaban pasan a este. El otro se retira (no se borra: queda su historial).'), msg),
    close => [btn('Cancelar', close), btn('✔ Juntar', async ev => {
      const bt = ev.target.closest('button'); bt.disabled = true;
      try { for (const x of l) if (x.id !== queda) await api('almacen.unir', { queda, quita: x.id }); await pull(); toast('Juntados', 'ok'); m.close(); tras(); }
      catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
    }, { cls: 'primary' })], { size: 'narrow' });
}

// ---------- 🖨️ «He impreso» una pieza para la estantería (gasta su filamento) / quitar una ----------
async function heImpreso(producto, tras) {
  try {
    const r = await api('stock.mover', { producto, cantidad: 1, motivo: 'Impresión', gastar: true, referencia: 'Mi almacén' });
    await pull();
    const f = r && r.filamento;
    if (f === undefined) toast('🎁 +1 ' + producto + '. (Tu servidor es el antiguo: el filamento no se ha descontado; pega el Servidor.gs nuevo.)', 'warn', 8000);
    else if (f && f.falta) toast('🎁 +1 ' + producto + ' · el filamento NO se ha descontado: ' + (FALTA[f.falta] || f.falta) + '. Arréglalo en Pendientes.', 'warn', 8000);
    else toast('🎁 +1 ' + producto + (f && f.g ? ' · −' + kg(f.g) + ' de ' + f.material + ' ' + f.color : ''), 'ok', 6000);
    tras();
  } catch (e) { toast(e.message || String(e), 'bad'); }
}
async function quitarPieza(x, tras) {
  if (!await confirmDlg('Quitar una pieza', '¿Quitas 1 «' + x.producto + '» de la estantería (rota, regalo, muestra…)? Las que se venden con un pedido salen solas.', 'Sí, quitar una')) return;
  try { await api('stock.mover', { producto: x.producto, cantidad: -1, motivo: 'Salida', referencia: 'Mi almacén' }); await pull(); toast('−1 ' + x.producto, 'ok'); tras(); } catch (e) { toast(e.message || String(e), 'bad'); }
}

// ---------- ✏️ TENGO… (una sola cosa) ----------
function tengo(m, tras) {
  const u = m.unidad || 'ud', f = inp({ type: 'number', min: 0, step: 'any', inputmode: 'decimal', value: lleno(m.stock) ? n(m.stock) : '', class: 'inp alm-num' }), msg = h('p.bad-t'), dif = h('p.alm-res');
  const calc = () => { if (!lleno(m.stock) || f.value === '') return mount(dif, ''); const d = n(f.value) - n(m.stock); mount(dif, d === 0 ? h('span.ok-t', '✔ Cuadra') : h('span.warn-t', 'El programa decía ' + cant(m.stock, u) + ': ' + (d < 0 ? 'faltan ' : 'sobran ') + cant(Math.abs(d), u))); };
  f.addEventListener('input', calc);
  const md = modal('✏️ ' + m.nombre, h('div', h('p.alm-preg', '¿Cuántos ' + unidad(u, 2) + ' tienes ahora?'), h('div.alm-paso', stepper(f, 1)), dif, h('p.small.muted', lleno(m.stock) ? 'Ahora pone ' + cant(m.stock, u) + '.' : 'Todavía no estaba contado.'), msg),
    close => [btn('Cancelar', close), btn('✔ Guardar', async ev => {
      if (f.value === '') { msg.textContent = 'Escribe cuántos hay.'; return; }
      const bt = ev.target.closest('button'); bt.disabled = true;
      try { const r = await guardaCuenta(m, n(f.value)); if (r) { upsertLocal('materiales', r.material); emit(); } toast('Apuntado: ' + cant(f.value, u), 'ok'); md.close(); tras && tras(); }
      catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
    }, { cls: 'primary' })], { size: 'narrow' });
  calc();
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


// ---------- 🛒 HE COMPRADO: ¿qué? → ¿cuál? (un clic) → ¿cuántos? (ya puesto como la última vez) → ✔ Apuntar ----------
// pre: { clase } empieza en «¿cuál?»; { material } o { color } va directo a «¿cuántos?» (desde Qué compro o tocando una cosa).
export function heComprado(pre = {}, tras) {
  if (!can('stock.mover')) return requestAccess('stock.mover', 'almacen');
  const st = { paso: 1, clase: null, mat: null, col: null, nuevo: null, cuantos: '', total: '', tocado: false, trae: '', peso: 1000, busca: '' };
  if (pre.clase) { st.clase = pre.clase; st.paso = 2; }
  if (pre.material) { st.clase = claseDe(pre.material); st.mat = pre.material; st.paso = 3; }
  if (pre.color) { st.clase = 'filamento'; st.col = pre.color; st.paso = 3; }
  const body = h('div.alm2-carro'), md = modal('🛒 He comprado', body, null, { size: 'wide' });
  const ir = p => { st.paso = p; pinta(); };
  const C = () => CLASE(st.clase);
  const ud = () => st.clase === 'filamento' ? 'ud' : (st.mat ? st.mat.unidad || 'ud' : (st.nuevo && st.nuevo.unidad) || 'ud');
  const porPaquete = () => st.clase !== 'filamento' && ud() !== 'ud';
  const nombreCosa = () => st.clase === 'filamento' ? (st.col ? st.col.material + ' ' + st.col.color : '') : st.mat ? st.mat.nombre : st.nuevo ? st.nuevo.nombre : '';
  function pinta() {
    const pasos = ['Qué', 'Cuál', 'Cuántos'];
    mount(body, h('div.alm2-pasos', pasos.map((t, i) => h('span' + (st.paso === i + 1 ? '.on' : st.paso > i + 1 ? '.hecho' : ''), (st.paso > i + 1 ? '✓ ' : (i + 1) + ' · ') + t))),
      st.paso === 1 ? paso1() : st.paso === 2 ? paso2() : paso3());
  }
  // 1 · ¿QUÉ HAS COMPRADO?
  function paso1() {
    return h('div', h('p.alm2-preg', '¿Qué has comprado?'),
      h('div.alm2-que', CLASES.map(c => h('button.alm2-que-b', { type: 'button', 'data-clase': c.k, onclick: () => { if (c.k === 'negocio') { md.close(); return gastoNegocio({}, tras); } st.clase = c.k; st.mat = null; st.col = null; st.nuevo = null; ir(2); } }, h('span.e', c.e), h('b', c.t), h('small', c.d)))),
      h('div.alm-nav', btn('Cancelar', () => md.close())));
  }
  // 2 · ¿CUÁL? (sus tallas, de la más pequeña a la más grande: un clic y siguiente)
  function paso2() {
    const elige = x => { if (st.clase === 'filamento') st.col = x; else st.mat = x; st.nuevo = null; st.cuantos = ''; st.total = ''; st.tocado = false; st.trae = ''; ir(3); };
    let tiles = [], extra = null;
    if (st.clase === 'filamento') {
      tiles = colores().map(c => h('button.alm2-tile.' + c.nivel, { type: 'button', 'data-color': c.clave, onclick: () => elige(c) }, h('span.alm2-bola', { style: { background: c.hex } }), h('b.alm2-nom', c.color || '(sin color)'), h('span.alm2-sub', c.material), h('span.alm2-u', 'tienes ' + kg(c.gramos))));
      extra = nuevoColor();
    } else if (st.clase === 'otro') {
      const todos = activos().filter(m => claseDe(m) === 'otro').sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
      const q = CL.norm(st.busca), L = q ? todos.filter(m => CL.norm(m.nombre).includes(q)) : todos.filter(usado);
      const caja = h('div.alm2-tiles.alm2-tiles-p', L.slice(0, 40).map(m => tileElegir(m, elige)));
      const b = inp({ type: 'search', placeholder: '🔎 Busca: cinta, burbuja, servo, tornillo…', value: st.busca, class: 'inp alm2-busca' });
      b.addEventListener('input', () => { st.busca = b.value; const qq = CL.norm(b.value); mount(caja, (qq ? todos.filter(m => CL.norm(m.nombre).includes(qq)) : todos.filter(usado)).slice(0, 40).map(m => tileElegir(m, elige))); });
      return h('div', h('p.alm2-preg', '¿Cuál?'), b, caja, nuevaCosa(), h('div.alm-nav', btn('← Atrás', () => ir(1))));
    } else {
      tiles = activos().filter(m => claseDe(m) === st.clase).sort(porTalla).map(m => tileElegir(m, elige));
      extra = nuevaTalla();
    }
    return h('div', h('p.alm2-preg', st.clase === 'filamento' ? '¿De qué color?' : '¿Qué talla?'), tiles.length ? h('div.alm2-tiles.alm2-tiles-p', tiles) : h('p.small.muted', 'Todavía no tienes ' + C().pl + ' apuntadas: dime cuál es aquí abajo.'), extra,
      h('div.alm-nav', btn('← Atrás', () => ir(1))));
  }
  const tileElegir = (m, elige) => { const x = talla(m), c = claseDe(m); return h('button.alm2-tile.' + nivel(m), { type: 'button', 'data-id': m.id, onclick: () => elige(m) },
    c === 'otro' ? h('span.alm2-ic', ICONO(m)) : h('span.alm2-letra' + (x.letra.length > 3 ? '.larga' : ''), x.letra, puntoColor(m)), h('b.alm2-nom', c === 'otro' ? m.nombre : x.titulo), x.sub && c !== 'otro' ? h('span.alm2-sub', x.sub) : null,
    h('span.alm2-u', lleno(m.stock) ? 'tienes ' + cantM(m, m.stock) : 'sin contar')); };
  // una talla que todavía no tenía: la talla con un toque y, si quiere, el color o la medida
  function nuevaTalla() {
    const k = st.clase, opciones = k === 'bolsa' ? [['S', 'Pequeña'], ['M', 'Mediana'], ['L', 'Grande'], ['XL', 'Muy grande']] : TALLAS.map(t => [t, t]);
    let t = '', col = '';
    const opcCol = k === 'sobre' ? ['blanc', 'marr'] : k === 'bolsa' ? ['blanc', 'negr', 'marr', 'kraft', 'transp'] : ['marr', 'blanc', 'kraft'];
    const chipsCol = h('div.alm-chips', opcCol.map(c => { const d = COLORES_ENV.find(y => y[0] === c); return h('button.alm-chip', { type: 'button', 'data-color': c, onclick: e => { col = col === c ? '' : c; [...chipsCol.children].forEach(b => b.classList.toggle('on', b.dataset.color === col)); } }, h('i.alm2-colorin.chip', { style: { background: d[3] } }), k === 'sobre' ? d[1] : d[2]); }));
    const det = inp({ placeholder: k === 'caja' ? 'Medida (opcional): 25 × 15 cm' : k === 'sobre' ? 'Referencia o medida (opcional): 4/D, 20 × 27 cm…' : 'Algo más (opcional): Alta, con asas…', class: 'inp' });
    const sig = btn('Siguiente →', () => {
      const pal = k === 'bolsa' ? ({ S: 'Pequeña', M: 'Mediana', L: 'Grande', XL: 'XL' })[t] : t;
      const dc = COLORES_ENV.find(y => y[0] === col), colTxt = dc ? (k === 'sobre' ? dc[1] : dc[2]) : '';
      const nombre = (C().una.replace(/^./, s => s.toUpperCase()) + ' ' + pal + ' ' + colTxt + ' ' + det.value.trim()).replace(/\s+/g, ' ').trim();
      const ya = activos().find(m => CL.norm(m.nombre) === CL.norm(nombre));
      if (ya) { st.mat = ya; st.nuevo = null; } else { st.mat = null; st.nuevo = { nombre, unidad: 'ud', tipo: k }; }
      st.cuantos = ''; st.total = ''; st.tocado = false; ir(3);
    }, { cls: 'primary alm2-sig', disabled: true });
    const chips = h('div.alm-chips', opciones.map(([v, txt]) => h('button.alm-chip', { type: 'button', 'data-talla': v, onclick: e => { t = v; [...chips.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); sig.disabled = false; } }, txt)));
    return h('details.alm2-nueva', h('summary', '＋ Es otra talla (o color) que no tenía'), h('div.in', h('p.small', '¿Qué talla es?'), chips, h('p.small', '¿De qué color? (si da igual, no toques nada)'), chipsCol, det, h('div.row', sig)));
  }
  function nuevoColor() {
    const mats = ['PLA', 'PETG', 'TPU', 'ABS', 'ASA'];
    let mat = 'PLA';
    const col = inp({ placeholder: 'Color: Blanco, Negro mate, Rosa pastel…', class: 'inp' }), hex = inp({ type: 'color', value: '#cccccc', class: 'alm2-hex', 'aria-label': 'Color' });
    const sig = btn('Siguiente →', () => { st.col = { material: mat, color: col.value.trim(), hex: hex.value, bobinas: [], gramos: 0 }; st.cuantos = ''; st.total = ''; st.tocado = false; ir(3); }, { cls: 'primary alm2-sig', disabled: true });
    col.addEventListener('input', () => { sig.disabled = !col.value.trim(); });
    const chips = h('div.alm-chips', mats.map(x => h('button.alm-chip' + (x === mat ? '.on' : ''), { type: 'button', onclick: e => { mat = x; [...chips.children].forEach(y => y.classList.toggle('on', y === e.currentTarget)); } }, x)));
    return h('details.alm2-nueva', h('summary', '＋ Es otro color'), h('div.in', chips, h('div.row', col, hex), h('div.row', sig)));
  }
  function nuevaCosa() {
    let u = 'ud';
    const nom = inp({ placeholder: '¿Qué es? Cinta de embalar, Laca, Imanes…', class: 'inp' });
    const sig = btn('Siguiente →', () => {
      const ya = activos().find(m => CL.norm(m.nombre) === CL.norm(nom.value));
      if (ya) st.mat = ya; else { st.mat = null; st.nuevo = { nombre: nom.value.trim(), unidad: u, tipo: 'material' }; }
      st.cuantos = ''; st.total = ''; st.tocado = false; st.trae = ''; ir(3);
    }, { cls: 'primary alm2-sig', disabled: true });
    nom.addEventListener('input', () => { sig.disabled = !nom.value.trim(); });
    const chips = h('div.alm-chips', [['ud', 'Por unidades'], ['m', 'Por metros (rollos)'], ['ml', 'Por mililitros (botes)'], ['g', 'Por gramos']].map(([k, t]) =>
      h('button.alm-chip' + (k === u ? '.on' : ''), { type: 'button', onclick: e => { u = k; [...chips.children].forEach(y => y.classList.toggle('on', y === e.currentTarget)); } }, t)));
    return h('details.alm2-nueva', h('summary', '＋ Es algo nuevo'), h('div.in', nom, h('p.small', '¿Cómo se cuenta?'), chips, h('div.row', sig)));
  }
  // 3 · ¿CUÁNTOS? (y lo que pagaste, ya puesto como la última vez)
  function paso3() {
    const m = st.mat, ult = m ? ultimaCompra(m) : null;
    const pu = st.clase === 'filamento' ? precioBobina(st.col) : m ? precioDeUno(m) : null;
    if (st.cuantos === '') st.cuantos = String(ult ? ult.paquetes : 1);
    if (porPaquete() && st.trae === '' && m && n(m.cantidad) > 0) st.trae = m.cantidad;
    const calcTotal = () => { if (!st.tocado && pu) st.total = String(Math.round(pu * n(st.cuantos) * 100) / 100); };
    calcTotal();
    const f = inp({ type: 'number', min: 0, step: 'any', inputmode: 'decimal', value: st.cuantos, class: 'inp alm-num', 'aria-label': 'Cuántos' });
    const t = inp({ type: 'number', min: 0, step: 0.01, inputmode: 'decimal', value: st.total, class: 'inp alm2-eur', placeholder: '0,00', 'aria-label': 'Lo que pagaste' });
    const res = h('p.alm-res'), msg = h('p.bad-t'), ok = btn('✔ Apuntar', ev => guardar(ev), { cls: 'primary alm2-apuntar' });
    const pinta3 = () => {
      const c = n(st.cuantos); ok.disabled = !(c > 0);
      if (!(c > 0)) return mount(res, '');
      if (st.clase === 'filamento') return mount(res, 'Entran ', h('b', kg(c * (n(st.peso) || 1000))), ' de ' + nombreCosa() + '.');
      if (porPaquete() && !(n(st.trae) > 0)) return mount(res, h('span.warn-t', 'Dime cuánto trae cada uno (lo pone la etiqueta).'));
      const antes = m && lleno(m.stock) ? n(m.stock) : 0, entra = porPaquete() ? c * n(st.trae) : c;
      const cc = v => m ? cantM(m, v) : st.nuevo && st.nuevo.tipo !== 'material' && ud() === 'ud' ? numero(v) + ' ' + (v === 1 ? C().una : C().pl) : cant(v, ud());
      mount(res, m ? ['Tenías ', h('b', cc(antes)), ' → tendrás ', h('b', cc(antes + entra))] : ['Entran ', h('b', cc(entra)), '.']);
    };
    f.addEventListener('input', () => { st.cuantos = f.value; calcTotal(); if (!st.tocado) t.value = st.total; pinta3(); });
    t.addEventListener('input', () => { st.total = t.value; st.tocado = true; });
    let extra = null;
    if (st.clase === 'filamento') {
      const p = inp({ type: 'number', min: 1, step: 50, value: st.peso, class: 'inp alm-peq' }); p.addEventListener('input', () => { st.peso = n(p.value) || 1000; pinta3(); });
      extra = h('p.small.muted', 'Cada bobina pesa ', p, ' g (casi siempre 1.000).');
    } else if (porPaquete()) {
      const tr = inp({ type: 'number', min: 0, step: 'any', value: st.trae, class: 'inp alm-peq', placeholder: '100' }); tr.addEventListener('input', () => { st.trae = tr.value; pinta3(); });
      extra = h('p.small', 'Cada uno trae ', tr, ' ' + unidad(ud(), 2) + '.');
    }
    const cab = st.clase === 'filamento' ? h('div.alm2-elegido', h('span.alm2-bola', { style: { background: (st.col && st.col.hex) || '#ccc' } }), h('b', nombreCosa()))
      : h('div.alm2-elegido', m && claseDe(m) !== 'otro' ? h('span.alm2-letra', talla(m).letra) : h('span.alm2-ic', m ? ICONO(m) : C().e), h('b', nombreCosa()), st.nuevo ? pill('nuevo', 'ok') : null);
    const preg = porPaquete() ? '¿Cuántos rollos, botes o paquetes' : cuantas(st.clase);
    setTimeout(() => { const ya = document.activeElement; if (!ya || ya === document.body || !body.contains(ya) || ya.tagName === 'BUTTON') { f.focus(); f.select && f.select(); } pinta3(); }, 30); // (si ya estás escribiendo en otra casilla, no te quita el cursor)
    return h('div', cab, h('p.alm2-preg', preg + ' has comprado?'), h('div.alm-paso', stepper(f, 1)), extra, res,
      h('div.alm2-pago', h('span', 'Has pagado en total'), t, h('span.alm-eur', '€')),
      h('p.tiny.muted.alm2-pago-n', pu ? 'Puesto como la última vez (' + eur(pu) + ' cada ' + (st.clase === 'filamento' ? 'bobina' : porPaquete() ? 'uno' : C().una) + '). Si no es así, cámbialo.' : 'Si no lo sabes, déjalo vacío: queda apuntado y le pones el precio cuando lo sepas.'), msg,
      h('div.alm-nav', st.mat || st.col || st.nuevo ? btn('← Atrás', () => ir(2)) : h('span'), ok));
    async function guardar(ev) {
      const bt = ev.target.closest('button'); bt.disabled = true; msg.textContent = '';
      try { const txt = await guarda(st.total === '' || !(n(st.total) > 0)); toast(txt, 'ok', 6000); md.close(); olvida(); if (tras) tras(); }
      catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
    }
  }
  async function guarda(sinPrecio) {
    const c = n(st.cuantos);
    if (!(c > 0)) throw new Error('¿Cuántas has comprado?');
    if (st.clase === 'filamento') {
      const col = st.col || {}, datos = { material: col.material || 'PLA', color: String(col.color || '').trim(), peso: n(st.peso) || 1000, restante: n(st.peso) || 1000 };
      if (col.hex && col.hex !== '#cccccc') datos.colorHex = col.hex;
      if (!sinPrecio) datos.precio = Math.round(n(st.total) / c * 100) / 100;
      const r = await api('bobinas.guardar', { unidades: Math.round(c), datos });
      (r || []).forEach(x => upsertLocal('bobinas', x)); emit(); pull().catch(() => { });
      return '🧵 ' + Math.round(c) + (Math.round(c) === 1 ? ' bobina' : ' bobinas') + ' de ' + datos.material + ' ' + datos.color + ' apuntadas' + (sinPrecio ? ' (sin precio: se lo pones cuando lo sepas)' : '');
    }
    const m = st.mat, u = ud();
    if (porPaquete() && !(n(st.trae) > 0)) throw new Error('Dime cuánto trae cada uno.');
    const d = { unidades: c };
    if (sinPrecio) d.sinPrecio = true; else d.total = n(st.total);
    if (m) d.id = m.id; else { d.nombre = st.nuevo.nombre; d.unidad = u; d.tipo = st.nuevo.tipo; }
    if (porPaquete()) d.contenido = n(st.trae);
    let r;
    try { r = await api('materiales.compra', d); }
    catch (e) { // un importe 10 veces más caro de lo normal o la misma compra dos veces → se pregunta (igual que en el inventario)
      if (sinPrecio && /cuánto has pagado/i.test(e.message || '')) throw new Error('Escribe lo que pagaste (tu servidor de Google es el antiguo y todavía no deja apuntarlo sin precio).');
      if (e.code !== 'CONFIRMAR' && e.code !== 'DUPLICADO') throw e;
      const si = await confirmDlg(e.code === 'CONFIRMAR' ? '¿Seguro que es ese importe?' : '¿Otra compra igual?', e.message, e.code === 'CONFIRMAR' ? 'Sí, pagué eso' : 'Sí, compré otra igual');
      if (!si) throw new Error(e.code === 'CONFIRMAR' ? 'Revisa lo que pagaste.' : 'No se ha apuntado otra vez.');
      if (e.code === 'CONFIRMAR') d.confirmado = true; else d.repetir = true;
      try { r = await api('materiales.compra', d); }
      catch (e2) { if (e2.code !== 'CONFIRMAR' && e2.code !== 'DUPLICADO') throw e2; d.confirmado = true; d.repetir = true; r = await api('materiales.compra', d); }
    }
    upsertLocal('materiales', r.material); emit(); pull().catch(() => { });
    const rm = Object.assign({}, r.material, { unidad: r.unidad || r.material.unidad });
    return '🛒 ' + r.material.nombre + ': tenías ' + cantM(rm, r.antes) + ' → ahora ' + cantM(rm, r.despues) + (sinPrecio ? ' (sin precio: se lo pones cuando lo sepas)' : '');
  }
  pinta();
}

// ---------- 📱 ¿QUÉ GASTO DEL NEGOCIO? (una SIM, un móvil…) → cuánto costó → en cuántos meses se recupera → ✔ Apuntar ----------
export function gastoNegocio(pre = {}, tras) {
  if (!can('config.editar')) return toast('Para apuntar gastos del negocio hace falta el permiso de cambiar la configuración (pídeselo a quien administra).', 'warn', 7000);
  const st = { k: pre.k || '', imp: '', meses: 1, nombre: '' };
  const body = h('div.alm2-carro'), md = modal('📱 Móvil, SIM y gastos del negocio', body, null, { size: 'wide' });
  const anterior = k => gastosNeg().filter(g => g.que === k).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).pop();
  function pinta() {
    if (!st.k) return mount(body, h('div', h('p.alm2-preg', '¿Qué has comprado?'),
      h('div.alm2-que.tres', NEGOCIO.map(x => h('button.alm2-que-b', { type: 'button', 'data-neg': x.k, onclick: () => { const a = anterior(x.k); st.k = x.k; st.imp = String(a ? a.importe : x.imp); st.meses = a ? Number(a.meses) || x.meses : x.meses; st.nombre = x.k === 'otro' ? '' : x.t.replace(/^Una? /, '').replace(/^./, c => c.toUpperCase()); pinta(); } }, h('span.e', x.e), h('b', x.t), h('small', x.d)))),
      h('p.small.muted', 'No es material: es lo que necesitas para trabajar. Se reparte solo entre tus pedidos hasta recuperarlo, como si cada cliente pagara un poquito.'),
      h('div.alm-nav', btn('Cancelar', () => md.close()))));
    const X = NEGOCIO.find(x => x.k === st.k), imp = inp({ type: 'number', min: 0, step: 0.01, inputmode: 'decimal', value: st.imp, class: 'inp alm2-eur', placeholder: '0,00', 'aria-label': 'Lo que costó' });
    const nom = st.k === 'otro' ? inp({ value: st.nombre, placeholder: '¿Qué es? Tarifa del móvil, funda, cargador…', class: 'inp' }) : null;
    const res = h('p.alm-res'), msg = h('p.bad-t');
    const calc = () => { const i = Number(String(imp.value).replace(',', '.')) || 0, pm = CL.cuotaNegocio({ finanzas: { gastosNegocio: [{ importe: 1, fecha: new Date().toISOString().slice(0, 10), meses: 1 }] }, pedidos: S.cfg.pedidos }, S.t, '').pedidosMes || 10;
      mount(res, i > 0 ? ['Se recupera solo: ', h('b', '≈ ' + eur(i / st.meses / pm)), ' en cada pedido durante ', h('b', st.meses === 1 ? '1 mes' : st.meses + ' meses'), ' (haces ≈ ' + pm + ' pedidos al mes).'] : ''); };
    imp.addEventListener('input', calc); if (nom) nom.addEventListener('input', () => { st.nombre = nom.value; });
    const meses = h('div.alm-chips', [1, 2, 3, 6, 12].map(m => h('button.alm-chip' + (st.meses === m ? '.on' : ''), { type: 'button', 'data-meses': m, onclick: e => { st.meses = m; [...meses.children].forEach(b => b.classList.toggle('on', Number(b.dataset.meses) === m)); calc(); } }, m === 1 ? '1 mes' : m + ' meses')));
    mount(body, h('div', h('div.alm2-elegido', h('span.alm2-ic', X.e), h('b', X.t)), nom ? [h('p.alm2-preg', '¿Qué es?'), nom] : null,
      h('p.alm2-preg', '¿Cuánto ha costado?'), h('div.alm2-pago', imp, h('span.alm-eur', '€')),
      h('p.alm2-preg', '¿En cuánto tiempo lo recuperas?'), meses, h('p.tiny.muted', st.k === 'sim' ? 'La SIM de cada mes: en 1 mes. Apúntala cada vez que compres una.' : 'Cuanto menos tiempo, más se suma a cada pedido.'), res, msg,
      h('div.alm-nav', btn('← Atrás', () => { st.k = ''; pinta(); }), btn('✔ Apuntar', async ev => {
        const i = Number(String(imp.value).replace(',', '.')) || 0, nm = (nom ? nom.value : st.nombre).trim();
        if (!(i > 0)) { msg.textContent = 'Escribe cuánto ha costado.'; return; }
        if (!nm) { msg.textContent = 'Dime qué es.'; return; }
        const bt = ev.target.closest('button'); bt.disabled = true;
        try {
          const g = { id: 'gn_' + Date.now().toString(36), que: st.k, nombre: nm, importe: Math.round(i * 100) / 100, fecha: new Date().toISOString().slice(0, 10), meses: st.meses };
          await guardaNegocio(gastosNeg().concat([g]));
          const c = CL.cuotaNegocio(S.cfg, S.t, '').cuota;
          toast('📱 ' + nm + ' apuntado: ahora cada pedido recupera ' + eur(c) + ' (móvil, SIM…).', 'ok', 8000); md.close(); if (tras) tras();
        } catch (e) { msg.textContent = e.message || String(e); bt.disabled = false; }
      }, { cls: 'primary alm2-apuntar' }))));
    calc(); setTimeout(() => { const ya = document.activeElement; if (!ya || ya === document.body || !body.contains(ya) || ya.tagName === 'BUTTON') (nom || imp).focus(); }, 30);
  }
  pinta();
}

// ---------- ✏️ CUENTO LO QUE TENGO: todo de una vez (o solo un color), y te digo lo que no cuadra ----------
export function cuento(opt = {}, tras) {
  if (!can('stock.mover')) return requestAccess('stock.mover', 'almacen');
  const campos = [], msg = h('p.bad-t');
  const caja = (valor, paso, antes, u) => {
    const f = inp({ type: 'number', min: 0, step: 'any', inputmode: 'decimal', value: valor, class: 'inp alm-cnt' }), dif = h('span.alm-dif');
    const calc = () => { if (antes === null || f.value === '') { dif.textContent = ''; dif.className = 'alm-dif'; return; } const d = Math.round((n(f.value) - antes) * 100) / 100; dif.textContent = d === 0 ? '' : (d > 0 ? '+' : '−') + (u === 'g' ? kg(Math.abs(d)) : numero(Math.abs(d))); dif.className = 'alm-dif' + (d < 0 ? ' falta' : d > 0 ? ' sobra' : ''); };
    f.addEventListener('input', calc); return { f, el: h('div.alm-cnt-w', stepper(f, paso), dif) };
  };
  const fila = (ic, nombre, sub, c, u) => h('div.alm-cfila', h('span.alm-ic', ic), h('div.alm-nom', h('b', nombre), sub ? h('span', sub) : null), c.el, h('span.alm-u', u));
  const secciones = [];
  const cols = colores().filter(c => !opt.soloColor || c.clave === opt.soloColor);
  if (cols.length) secciones.push(h('section.alm-bloque', h('h3', '🧵 Filamento · gramos que quedan en cada bobina'), h('p.tiny.muted', 'Pesa la bobina y réstale lo que pesa vacía (un carrete de plástico ≈ 250 g, de cartón ≈ 140 g). Pon 0 si se acabó.'), cols.map(c => {
    const bobs = c.bobinas.filter(b => n(b.restante) > 0 || opt.soloColor);
    return h('div', h('div.alm-csub', h('i.alm-dot', { style: { background: c.hex } }), h('b', c.material + ' ' + c.color)), bobs.map((b, i) => {
      const x = caja(Math.round(n(b.restante)), 50, Math.round(n(b.restante)), 'g'); campos.push({ tipo: 'bobina', b, f: x.f, antes: Math.round(n(b.restante)), nombre: c.material + ' ' + c.color + ' (bobina ' + (i + 1) + ')', u: 'g' });
      return fila('🧵', 'Bobina ' + (i + 1), (b.marca ? b.marca + ' · ' : '') + 'de ' + Math.round(n(b.peso) || 1000) + ' g' + (b.estimado === true || /^(s|true)/i.test(String(b.estimado || '')) ? ' · peso ESTIMADO' : ''), x, 'g');
    }));
  })));
  if (!opt.soloColor) {
    const mats = activos().filter(m => claseDe(m) !== 'otro' || usado(m)), otros = mats.filter(m => claseDe(m) === 'otro');
    const fm = m => { const a = lleno(m.stock) ? n(m.stock) : null, x = caja(a === null ? '' : a, 1, a, m.unidad || 'ud'), tl = claseDe(m) !== 'otro' ? talla(m) : null; campos.push({ tipo: 'material', m, f: x.f, antes: a, nombre: m.nombre, u: m.unidad || 'ud' }); return fila(tl ? h('span.alm2-letra.mini', tl.letra) : ICONO(m), tl ? tl.titulo : m.nombre, [tl && tl.sub, a === null ? 'sin contar' : ''].filter(Boolean).join(' · '), x, unidad(m.unidad || 'ud', 2)); };
    ['bolsa', 'sobre', 'caja'].forEach(k => { const L = mats.filter(m => claseDe(m) === k).sort(porTalla); if (L.length) secciones.unshift(h('section.alm-bloque', h('h3', CLASE(k).e + ' ' + CLASE(k).t), L.map(fm))); });
    if (otros.length) secciones.push(h('section.alm-bloque', h('h3', '🧴 Otras cosas'), otros.map(fm)));
    const prods = levels().list.filter(x => x.producto && x.controlado);
    if (prods.length) secciones.push(h('section.alm-bloque', h('h3', '🎁 Piezas ya hechas (en la estantería)'), prods.map(p => { const x = caja(p.fisico, 1, p.fisico, 'ud'); campos.push({ tipo: 'producto', p, f: x.f, antes: p.fisico, nombre: p.producto, u: 'ud' }); return fila('🎁', p.producto, '', x, 'piezas'); })));
  }
  const guardar = async ev => {
    const cambios = campos.filter(x => x.f.value !== '' && (x.antes === null || Math.abs(n(x.f.value) - x.antes) > 1e-9));
    const bt = ev.target.closest('button');
    if (!cambios.length) { // también es un recuento: todo cuadra
      bt.disabled = true; try { await api('almacen.contado', {}); } catch (e) { } olvida();
      toast('✔ Todo cuadra. Apuntado que has contado hoy.', 'ok', 6000); md.close(); if (tras) tras(); return;
    }
    const desc = cambios.filter(x => x.antes !== null);
    if (desc.length && !await confirmDlg('No cuadran ' + desc.length + (desc.length === 1 ? ' cosa' : ' cosas'), desc.slice(0, 8).map(x => { const d = n(x.f.value) - x.antes; return x.nombre + ': decía ' + (x.u === 'g' ? kg(x.antes) : numero(x.antes)) + ', hay ' + (x.u === 'g' ? kg(n(x.f.value)) : numero(x.f.value)) + ' (' + (d < 0 ? 'faltan ' : 'sobran ') + (x.u === 'g' ? kg(Math.abs(d)) : numero(Math.abs(d))) + ')'; }).join(' · ') + (desc.length > 8 ? ' · y ' + (desc.length - 8) + ' más' : '') + '. Se apunta como recuento y sale en «Este mes».', 'Apuntar lo que he contado')) return;
    bt.disabled = true; let hechos = 0;
    try {
      for (const x of cambios) {
        const v = n(x.f.value);
        if (x.tipo === 'material') { const r = await guardaCuenta(x.m, v); if (r) upsertLocal('materiales', r.material); }
        else if (x.tipo === 'bobina') { const r = await api('bobinas.guardar', { id: x.b.id, datos: { restante: Math.max(0, v), estimado: false }, motivo: 'Recuento' }); (r || []).forEach(y => upsertLocal('bobinas', y)); }
        else if (x.tipo === 'producto') await api('stock.recuento', { producto: x.p.producto, fisico: Math.round(v) });
        hechos++; bt.textContent = 'Guardando… ' + hechos + ' de ' + cambios.length;
      }
      if (!opt.soloColor) { try { await api('almacen.contado', {}); } catch (e) { } }
      emit(); olvida(); await pull().catch(() => { }); toast('✔ Apuntado: ' + hechos + (hechos === 1 ? ' cambio' : ' cambios'), 'ok'); md.close(); if (tras) tras();
    } catch (e) { emit(); msg.textContent = (hechos ? 'Se guardaron ' + hechos + '. ' : '') + (e.message || String(e)); bt.disabled = false; bt.textContent = '✔ Guardar'; }
  };
  const md = modal(opt.soloColor ? '⚖️ ' + (cols[0] ? cols[0].material + ' ' + cols[0].color : 'Filamento') : '✏️ Cuento lo que tengo',
    h('div.alm-cuento', h('p.small.muted', 'Cambia solo lo que no cuadre con lo que ves; a la derecha te digo cuánto falta o sobra. Si todo cuadra, pulsa Guardar igual: queda apuntado que has contado.'), secciones.length ? secciones : empty('box', 'No hay nada que contar todavía', 'Apunta primero lo que tienes con «He comprado».'), msg),
    close => [btn('Cancelar', close), btn('✔ Guardar', guardar, { cls: 'primary' })], { size: 'wide' });
}
