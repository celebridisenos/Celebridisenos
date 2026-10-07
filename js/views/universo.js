// ================= v12.7 · Universo CelebriDiseños =================
// Tus clientes como una galaxia 3D: cada estrella es un cliente REAL (nada inventado).
//   · cuanto más cerca del sol (tu negocio), más reciente su último pedido (anillos: 30 / 90 / 180 días)
//   · cuanto más grande, más ha gastado (el importe solo lo ve quien tiene permiso de informes)
//   · color = qué tipo de cliente es · parpadea si tiene un pedido en curso o una incidencia abierta
//   · un cometa viaja al sol por cada pedido que ha entrado en las últimas 24 h
import { h, mount, btn, empty, eur, ago } from '../ui.js';
import { S, can, clientStats, on } from '../store.js';
import { go } from '../app.js';
import { createGalaxy, webglOk } from '../galaxia.js';

const COL = { incidencia: '#ff5d6c', vip: '#ffd166', frecuente: '#4cc9f0', mayorista: '#ff9f43', recurrente: '#5eead4', inactivo: '#8b6fd1', nuevo: '#bcd7ff', sinpedidos: '#6b7a99' };
const TIPOS = [
  ['incidencia', 'Incidencia abierta', 'Parpadea en rojo'],
  ['vip', 'VIP', 'Dorado'],
  ['frecuente', 'Frecuente', 'Cian'],
  ['mayorista', 'Mayorista', 'Naranja'],
  ['recurrente', 'Recurrente (2+ pedidos)', 'Menta'],
  ['nuevo', 'Nuevo (1 pedido)', 'Azul claro'],
  ['inactivo', 'Hace tiempo que no compra', 'Violeta apagado'],
  ['sinpedidos', 'Todavía sin pedidos', 'Gris tenue, en el borde']
];
const FILTROS = [
  { k: 'todos', t: 'Todos', f: () => true },
  { k: 'vip', t: '👑 VIP', f: (s, c) => c === 'vip' },
  { k: 'frecuentes', t: '⭐ Frecuentes', f: s => s.frecuente },
  { k: 'nuevos', t: '✨ Nuevos', f: (s, c) => c === 'nuevo' },
  { k: 'inactivos', t: '💤 Inactivos', f: (s, c) => c === 'inactivo' },
  { k: 'activos', t: '📦 Con pedido en curso', f: s => s.activos > 0 }
];

// Una sola categoría por cliente, de mayor a menor importancia
export function categoria(s) {
  const has = k => s.etiquetas.some(e => e.k === k);
  if (s.incidenciasAbiertas > 0) return 'incidencia';
  if (has('altovalor')) return 'vip';
  if (s.frecuente) return 'frecuente';
  if (has('mayorista')) return 'mayorista';
  if (has('inactivo')) return 'inactivo';
  if (has('recurrente')) return 'recurrente';
  if (s.pedidos === 1) return 'nuevo';
  if (!s.pedidos) return 'sinpedidos';
  return 'nuevo';
}

export function datosGalaxia(clientes, pedidos, stats, estados, ahora) {
  const canc = {}; (estados || []).forEach(e => { if (e.cancelled) canc[e.k] = 1; });
  const byId = {}; clientes.forEach(c => { byId[c.id] = c; });
  const byName = {}; clientes.forEach(c => { byName[String(c.nombre || '').toLowerCase()] = c.id; });
  const stars = clientes.filter(c => stats[c.id]).map(c => {
    const s = stats[c.id], cat = categoria(s);
    return { id: c.id, dias: s.pedidos ? s.diasDesdeUltimo : null, gasto: s.gasto, color: COL[cat], pulse: s.activos > 0 || s.incidenciasAbiertas > 0, on: true, _cat: cat };
  });
  const comets = [];
  pedidos.forEach(o => {
    if (canc[o.estado]) return;
    const t = Date.parse(o.creado || ''); if (!t || ahora - t > 24 * 3600 * 1000 || ahora < t) return;
    const id = o.clienteId && byId[o.clienteId] ? o.clienteId : byName[String(o.cliente || '').toLowerCase()];
    if (id) comets.push({ starId: id });
  });
  return { stars, comets };
}

export function render(el) {
  const reducido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const verGasto = can('informes.ver');
  const wrap = h('div.uni');
  const head = h('div.page-head', h('h1', '✨ Universo'), h('span.muted.tiny', 'Tus clientes reales como estrellas'));
  el.append(head, wrap);
  if (!S.t.clientes.length) { wrap.append(h('div.card', empty('users', 'Aún no hay clientes', 'Cuando entren pedidos, cada cliente aparecerá aquí como una estrella.'))); return {}; }
  if (!webglOk()) { wrap.append(h('div.card', empty('shield', 'Este dispositivo no puede dibujar el Universo', 'Necesita aceleración gráfica (WebGL). Prueba con otro navegador o activa la aceleración por hardware. El resto del programa funciona igual.'))); return {}; }

  const canvas = h('canvas.uni-cv', { 'aria-label': 'Galaxia 3D con tus clientes. Arrastra para girar, rueda o pellizco para acercar.', role: 'img', tabindex: '0' });
  const tip = h('div.uni-tip.hide');
  const stage = h('div.uni-stage', canvas, tip);
  const chips = h('div.seg.uni-chips');
  const info = h('div.uni-info');
  const ley = h('details.uni-ley', h('summary', 'Cómo leer el Universo'),
    h('div.uni-ley-b',
      h('p', 'Cada estrella es un cliente real. ', h('b', 'Cuanto más cerca del centro'), ' (tu negocio), más reciente su último pedido: los anillos marcan 30, 90 y 180 días. ', h('b', 'Cuanto más grande'), ', más ha gastado.'),
      h('div.uni-tipos', TIPOS.map(([k, t, d]) => h('span.uni-tipo', h('i', { style: { background: COL[k], boxShadow: '0 0 8px ' + COL[k] } }), h('b', t), ' ', h('span.muted', d)))),
      h('p.muted.tiny', 'Un cometa viaja hacia el centro por cada pedido que ha entrado en las últimas 24 h. El polvo de colores y las estrellas lejanas son solo decoración: no son datos.')));
  const bGiro = btn('⏸ Pausar giro', () => { const a = !g.isAuto(); g.setAuto(a); setGiro(a); }, { cls: 'ghost' });
  const setGiro = a => { bGiro.querySelector('span').textContent = a ? '⏸ Pausar giro' : '▶ Girar'; };
  const bar = h('div.row.wrap.uni-bar', chips, h('div.grow'), bGiro,
    btn('⛶ Pantalla completa', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => { }); }, { cls: 'ghost' }));
  wrap.append(bar, stage, info, ley);

  let g;
  try { g = createGalaxy(canvas, { color: getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#7c3aed', reducedMotion: reducido }); }
  catch (e) { console.error(e); stage.remove(); bar.remove(); wrap.prepend(h('div.card', empty('shield', 'No se pudo iniciar el Universo', String(e.message || e)))); return {}; }
  if (reducido) { bGiro.disabled = true; bGiro.querySelector('span').textContent = 'Giro desactivado (movimiento reducido)'; }

  let filtro = 'todos', stats = {}, datos = { stars: [], comets: [] }, porId = {};
  function cargar() {
    stats = clientStats();
    datos = datosGalaxia(S.t.clientes, S.t.pedidos, stats, S.cfg.pedidos.estados, Date.now());
    porId = {}; S.t.clientes.forEach(c => { porId[c.id] = c; });
    aplicar();
  }
  function aplicar() {
    const fl = FILTROS.find(x => x.k === filtro);
    datos.stars.forEach(s => { s.on = fl.f(stats[s.id], s._cat); });
    g.setData(datos);
    const n = datos.stars.filter(s => s.on).length;
    mount(chips, FILTROS.map(x => h('button' + (filtro === x.k ? '.on' : ''), { onclick: () => { filtro = x.k; aplicar(); } }, x.t + ' ' + datos.stars.filter(s => x.f(stats[s.id], s._cat)).length)));
    mount(info, h('span.uni-n', h('b', n), n === 1 ? ' estrella visible' : ' estrellas visibles'), ' · ', h('span', h('b', datos.comets.length), datos.comets.length === 1 ? ' cometa (pedido de las últimas 24 h)' : ' cometas (pedidos de las últimas 24 h)'));
  }

  g.onHover(hv => {
    if (!hv) { tip.classList.add('hide'); return; }
    const c = porId[hv.star.id], s = stats[hv.star.id]; if (!c || !s) return;
    mount(tip, h('b', c.nombre),
      h('div.tiny', s.pedidos + (s.pedidos === 1 ? ' pedido' : ' pedidos') + (s.ultimo ? ' · último ' + ago(s.ultimo) : ' · sin pedidos')),
      s.etiquetas.length ? h('div.tiny', s.etiquetas.map(e => e.i + ' ' + e.t).join(' · ')) : null,
      verGasto && s.pedidos ? h('div.tiny.bold', eur(s.gasto)) : null,
      h('div.tiny.muted', 'Clic para abrir la ficha'));
    tip.classList.remove('hide');
    const w = stage.clientWidth, x = Math.min(Math.max(8, hv.x + 14), w - tip.offsetWidth - 8);
    tip.style.left = x + 'px'; tip.style.top = Math.max(8, hv.y - tip.offsetHeight - 12) + 'px';
  });
  g.onPick(s => go('clientes/' + s.id));
  cargar();
  const off = [];
  let firma = S.t.pedidos.length + ':' + S.t.clientes.length + ':' + (S.meta.pedidos && S.meta.pedidos.hash) + (S.meta.clientes && S.meta.clientes.hash);
  off.push(on(() => { const f = S.t.pedidos.length + ':' + S.t.clientes.length + ':' + (S.meta.pedidos && S.meta.pedidos.hash) + (S.meta.clientes && S.meta.clientes.hash); if (f !== firma) { firma = f; cargar(); } }));
  window.__universo = { stats: () => g.stats(), datos: () => datos, screenOf: id => g.screenOf(id) }; // solo lectura (pruebas)
  return { destroy() { off.forEach(f => f()); g.destroy(); delete window.__universo; } };
}
