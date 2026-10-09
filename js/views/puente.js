// ================= v18 · 🛰️ PUENTE DE MANDO: el taller entero de un vistazo, en directo =================
// La pantalla de entrada de la «Sala de mando». Todo sale de TUS datos reales (pedidos, impresoras, cobros); nada se inventa:
//  · el reloj y una frase con lo que hay hoy · el FLUJO: cuántos pedidos hay en cada parada del taller (con luces que corren)
//  · las impresoras en directo (en el programa del PC) · lo que te necesita, por orden de urgencia · el mes (ventas, meta,
//    y la curva de los últimos 30 días) · el planeta de clientes · los últimos pedidos.
// El «Inicio» de antes sigue existiendo (enlace abajo): aquí no se ha quitado ninguna función.
import { h, mount, btn, eur, ago } from '../ui.js';
import { S, can, timing } from '../store.js';
import { go } from '../app.js';
import { BAMBU } from '../bambu.js';
import { numeros, plan, planeta } from './inteligencia.js';
import { parte, dialogoParte, salaControl } from '../premium171.js';

const CL = window.CL;
const LS = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
const dinero = () => can('informes.ver') || can('productos.costes');
const vivos = () => (S.t.pedidos || []).filter(o => !o.eliminado);

// ---------- los números del puente (se prueban sin pantalla) ----------
export const PARADAS = [
  { k: 'confirmado', t: 'Por imprimir', e: '🧾', r: 'hoy' }, { k: 'impresion', t: 'Imprimiendo', e: '🖨️', r: 'taller' }, { k: 'postpro', t: 'En mesa', e: '🧰', r: 'hoy' },
  { k: 'empaquetar', t: 'Empaquetar', e: '📦', r: 'embalaje' }, { k: 'listo', t: 'Listo para enviar', e: '🚚', r: 'pedidos/?f=enviar' }
];
export function flujo() {
  const ab = vivos().filter(o => (timing(o) || {}).abierto), n = {};
  ab.forEach(o => { let f = CL.phaseOf(S.cfg.pedidos, o.estado); if (f === 'reserva') f = 'confirmado'; n[f] = (n[f] || 0) + 1; });
  return PARADAS.map(p => Object.assign({ n: n[p.k] || 0 }, p));
}
// Ventas de cada uno de los últimos «dias» días (los cancelados no cuentan). Devuelve [{ f, v, n }]
export function curva(hoy = S.hoy, dias = 30) {
  const est = k => ((S.cfg.pedidos.estados || []).find(s => s.k === k) || {}), m = {};
  vivos().forEach(o => { if (est(o.estado).cancelled) return; const f = String(o.fecha || o.creado || '').slice(0, 10); if (!m[f]) m[f] = { v: 0, n: 0 }; m[f].v += Number(CL.orderTotal(o)) || 0; m[f].n++; });
  const out = [], b = new Date(hoy + 'T12:00:00').getTime();
  for (let i = dias - 1; i >= 0; i--) { const f = new Date(b - i * 86400000).toISOString().slice(0, 10); out.push({ f, v: Math.round(((m[f] || {}).v || 0) * 100) / 100, n: (m[f] || {}).n || 0 }); }
  return out;
}

// v18 · PREVISIÓN: «a este ritmo cierras el mes en…». Regla de tres con lo vendido hasta hoy; solo desde el día 3 y con ventas
// (antes sería adivinar). Es una ESTIMACIÓN y así se dice en pantalla.
export function prevision(hoy = S.hoy, ventasMes = 0) {
  const [a, m, d] = String(hoy).split('-').map(Number), dias = new Date(a, m, 0).getDate();
  if (!(ventasMes > 0) || !(d >= 3) || d >= dias) return null;
  return { cierre: Math.round(ventasMes / d * dias), dia: d, dias, quedan: dias - d };
}

// ---------- piezas de la pantalla ----------
function reloj() {
  const hh = h('b'), ss = h('i'), f = h('small');
  const pon = () => { const d = new Date(), p = x => String(x).padStart(2, '0'); hh.textContent = p(d.getHours()) + ':' + p(d.getMinutes()); ss.textContent = p(d.getSeconds()); const t = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); f.textContent = t.charAt(0).toUpperCase() + t.slice(1); };
  pon();
  return { el: h('div.pm-reloj', h('div', hh, ss), f), pon };
}
function pintaCurva(cv, C) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 320, H = cv.clientHeight || 90; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const max = Math.max(1, ...C.map(x => x.v)), cs = getComputedStyle(cv), a1 = cs.getPropertyValue('--a1').trim() || cs.getPropertyValue('--brand').trim() || '#8f82ff', a2 = cs.getPropertyValue('--a2').trim() || '#22d3ee';
  const X = i => 4 + i * (W - 8) / (C.length - 1), Y = v => H - 8 - v / max * (H - 22);
  const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, a1); gr.addColorStop(1, a2);
  g.beginPath(); C.forEach((x, i) => { const px = X(i), py = Y(x.v); if (!i) g.moveTo(px, py); else { const qx = X(i - 1), qy = Y(C[i - 1].v), mx = (qx + px) / 2; g.bezierCurveTo(mx, qy, mx, py, px, py); } });
  g.lineWidth = 2.5; g.strokeStyle = gr; g.lineJoin = 'round'; g.stroke();
  g.lineTo(X(C.length - 1), H); g.lineTo(X(0), H); g.closePath(); const ar = g.createLinearGradient(0, 0, 0, H); ar.addColorStop(0, a1); ar.addColorStop(1, 'transparent'); g.globalAlpha = 0.22; g.fillStyle = ar; g.fill(); g.globalAlpha = 1;
  const u = C[C.length - 1]; g.fillStyle = a2; g.beginPath(); g.arc(X(C.length - 1), Y(u.v), 4, 0, 7); g.fill(); g.globalAlpha = 0.3; g.beginPath(); g.arc(X(C.length - 1), Y(u.v), 9, 0, 7); g.fill(); g.globalAlpha = 1;
}
const ESTADO_IMP = { imprimiendo: ['Imprimiendo', 'ok'], preparando: ['Preparando', 'info'], pausada: ['En pausa', 'warn'], finalizada: ['Terminada: recoge la pieza', 'ok'], error: ['Con un problema', 'bad'], sin_filamento: ['Sin filamento', 'bad'], libre: ['Libre', ''], desconectada: ['Sin conexión', ''] };
function impresoras() {
  const L = (BAMBU.list || []).slice();
  if (!L.length) {
    const enMarcha = (S.t.trabajos || []).filter(j => j.estado === 'Imprimiendo'), cola = (S.t.trabajos || []).filter(j => j.estado === 'En cola').length;
    return h('section.card.pm-imp', h('div.pm-h', h('h3', '🖨️ Impresoras'), h('a', { href: '#/taller' }, 'Impresión →')),
      enMarcha.length ? enMarcha.slice(0, 4).map(j => h('div.pm-imp1', h('div.pm-anillo.sin', '🖨️'), h('div.grow', h('b.ellipsis', j.nombre || j.producto || 'Trabajo'), h('div.tiny.muted', 'Imprimiendo' + (j.impresora ? ' · ' + j.impresora : ''))))) :
        h('p.muted.small', cola ? cola + ' en cola, ninguna imprimiendo ahora.' : 'Ninguna imprimiendo ahora.'),
      h('p.tiny.muted', 'En el programa del PC, con las Bambu vinculadas, aquí se ven en directo: capa, tiempo y temperatura.'));
  }
  return h('section.card.pm-imp', h('div.pm-h', h('h3', '🖨️ Impresoras en directo'), h('a', { href: '#/taller' }, 'Impresión →')),
    L.map(b => {
      const [txt, cls] = ESTADO_IMP[b.conectada ? b.estado : 'desconectada'] || [b.estadoTexto || b.estado || '', ''], act = b.conectada && ['imprimiendo', 'preparando', 'pausada'].includes(b.estado), pct = Math.max(0, Math.min(100, Number(b.pct) || 0));
      const R = 26, P = 2 * Math.PI * R;
      const anillo = h('div.pm-anillo' + (act ? '.on' : '') + (cls ? '.' + cls : ''));
      anillo.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="' + R + '" class="f"/><circle cx="32" cy="32" r="' + R + '" class="p" stroke-dasharray="' + P.toFixed(1) + '" stroke-dashoffset="' + (P * (1 - (act ? pct : 0) / 100)).toFixed(1) + '"/></svg><b>' + (act ? pct + '<i>%</i>' : (b.estado === 'finalizada' && b.conectada ? '✓' : '·')) + '</b>';
      const min = Number(b.restanteMin) || 0, queda = min ? (min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min') : '';
      return h('div.pm-imp1', anillo, h('div.grow', h('b.ellipsis', b.nombre || b.modelo || 'Impresora'), h('div.small' + (cls ? '.' + cls + '-t' : '.muted'), txt + (act && b.trabajo ? ' · ' + b.trabajo : '')),
        act ? h('div.tiny.muted', [b.capas ? 'capa ' + b.capa + ' de ' + b.capas : '', queda ? 'quedan ' + queda : '', b.boquilla ? Math.round(b.boquilla) + ' °C' : ''].filter(Boolean).join(' · ')) : null));
    }));
}
function teNecesita(P) {
  return h('section.card.pm-urge', h('div.pm-h', h('h3', '🎯 Lo primero de hoy'), h('a', { href: '#/hoy' }, 'Hoy en el taller →')),
    P.tareas.map(([e, t, d, cls], i) => h('div.pm-t.' + cls, h('span.pm-n', String(i + 1)), h('span.pm-e', e), h('div.grow', h('b', t), h('div.tiny.muted', d)))),
    h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } }, btn('🔊 Parte del día', () => dialogoParte(), { cls: 'sm' }), btn('🖥️ Sala de control', () => salaControl(), { cls: 'sm' })));
}
function elMes(N) {
  if (!dinero()) return null;
  const meta = Number(LS('cd.meta17')) || 0, tk = N.ticket || Number(LS('cd.ticket17')) || 0, P = meta ? plan(meta, tk || 1, N) : null, cv = h('canvas.pm-curva', { 'aria-label': 'Ventas de los últimos 30 días' }), C = curva();
  try { const ro = new ResizeObserver(() => { if (cv.isConnected) pintaCurva(cv, C); else if (cv._visto) ro.disconnect(); cv._visto = cv._visto || cv.isConnected; }); ro.observe(cv); } catch (e) { setTimeout(() => { if (cv.isConnected) pintaCurva(cv, C); }, 30); }
  const total30 = C.reduce((a, x) => a + x.v, 0), PV = prevision(S.hoy, N.mes.ventas);
  return h('section.card.pm-mes', h('div.pm-h', h('h3', '💶 Este mes'), h('a', { href: '#/inteligencia' }, 'Inteligencia →')),
    h('div.pm-cifra', h('b', eur(N.mes.ventas)), h('span', N.mes.pedidos + (N.mes.pedidos === 1 ? ' pedido' : ' pedidos'))),
    P ? h('div.pm-meta', h('div.pm-barra', h('i', { style: 'width:' + Math.round(P.pct * 100) + '%' })), h('div.tiny.muted', Math.round(P.pct * 100) + ' % de tu meta de ' + eur(meta) + (P.falta > 0 ? ' · faltan ' + eur(P.falta) : ' · ¡conseguida!'))) :
      h('div.tiny.muted', 'Sin meta puesta. ', h('a', { href: '#/inteligencia' }, 'Ponte una en Inteligencia')),
    cv, h('div.tiny.muted', total30 ? 'Últimos 30 días: ' + eur(total30) : 'Aún no hay ventas en los últimos 30 días.'),
    PV ? h('div.pm-prev', h('span', '🔮'), h('div', h('b', 'A este ritmo cierras el mes en ≈ ' + eur(PV.cierre)), h('div.tiny.muted', 'ESTIMADO · día ' + PV.dia + ' de ' + PV.dias + (meta ? (PV.cierre >= meta ? ' · llegas a tu meta' : ' · te quedarías a ' + eur(meta - PV.cierre) + ' de tu meta') : '')))) : null);
}
function ultimos() {
  const L = vivos().slice().sort((a, b) => String(b.creado || b.fecha || '').localeCompare(String(a.creado || a.fecha || ''))).slice(0, 6);
  return h('section.card.pm-ult', h('div.pm-h', h('h3', '📥 Últimos pedidos'), h('a', { href: '#/pedidos' }, 'Todos →')),
    L.length ? L.map(o => { const st = CL.stateOf(S.cfg.pedidos, o.estado), c = /^#[0-9a-f]{3,8}$/i.test(st.c || '') ? st.c : '#64748b';
      return h('button.pm-ped', { type: 'button', onclick: () => go('pedidos/' + encodeURIComponent(o.id)) }, h('i', { style: 'background:' + c }), h('span.pm-num', o.numero ? 'nº ' + o.numero : ''), h('span.grow.ellipsis', h('b', o.cliente || 'Sin nombre'), ' · ', o.producto || ''), h('span.pm-est', { style: 'color:' + c }, o.estado || ''), h('span.tiny.muted.nowrap', o.creado ? ago(o.creado) : '')); }) :
      h('p.muted.small', 'Todavía no hay pedidos.'));
}

export function render(el) {
  const root = h('div.pm'); el.appendChild(root);
  let R = null, tic = 0, vista = '';
  const firma = () => JSON.stringify([S.hoy, vivos().map(o => [o.id, o.estado, o.fechaLimite, o.plazoDias, o.total, o.precio, o.incidencia ? 1 : 0]), (BAMBU.list || []).map(b => [b.serial, b.conectada, b.estado, b.pct, b.capa, b.restanteMin]), (S.t.trabajos || []).filter(j => j.estado === 'Imprimiendo' || j.estado === 'En cola').length, (S.t.clientes || []).filter(c => c.pais).length]);
  const draw = () => {
    vista = firma();
    const P = parte(), N = numeros(), F = flujo(), total = F.reduce((a, p) => a + p.n, 0);
    R = reloj();
    const frase = P.c.abiertos ? [h('b', String(P.c.abiertos)), P.c.abiertos === 1 ? ' pedido en marcha' : ' pedidos en marcha', P.c.tarde ? [' · ', h('span.bad-t', P.c.tarde + ' con retraso')] : null, P.c.hoy ? [' · ', h('span.warn-t', P.c.hoy + (P.c.hoy === 1 ? ' vence hoy' : ' vencen hoy'))] : null, P.c.incidencias ? [' · ', h('span.bad-t', P.c.incidencias + (P.c.incidencias === 1 ? ' incidencia' : ' incidencias'))] : null] : 'No hay pedidos en marcha ahora mismo.';
    const pl = can('pedidos.ver') ? planeta(N, draw) : null;
    mount(root,
      h('section.pm-hero',
        h('div.pm-hola', h('div.pm-kicker', h('i'), 'PUENTE DE MANDO'), h('h1', P.saludo), h('p.pm-frase', frase),
          h('div.row.wrap', { style: { gap: '10px' } }, can('pedidos.crear') ? btn('Nuevo pedido', () => go('pedidos/nuevo'), { cls: 'primary', icon: 'plus' }) : null, btn('🏭 Taller vivo', () => go('tallervivo')), dinero() ? btn('🎬 Tráiler del mes', () => go('trailer')) : null)),
        R.el),
      can('pedidos.ver') ? h('section.pm-flujo' + (total ? '' : '.vacio'), { 'aria-label': 'Pedidos en cada parada del taller' }, F.map((p, i) => [i ? h('span.pm-via', { 'aria-hidden': 'true' }, h('i'), h('i'), h('i')) : null,
        h('button.pm-parada' + (p.n ? '.on' : ''), { type: 'button', 'data-fase': p.k, onclick: () => go(p.r) }, h('span.pm-ico', p.e), h('b', String(p.n)), h('small', p.t))])) : null,
      h('div.pm-grid', can('taller.ver') ? impresoras() : null, can('pedidos.ver') ? teNecesita(P) : null, elMes(N)),
      h('div.pm-grid.dos', pl ? h('div.pm-planeta', pl) : null, can('pedidos.ver') ? ultimos() : null),
      h('p.pm-pie', h('a', { href: '#/inicio' }, 'Ver el Inicio de antes'), ' · ', h('a', { href: '#/config/perfil' }, 'Cambiar de interfaz')));
  };
  draw();
  tic = setInterval(() => { if (R && R.el.isConnected) R.pon(); }, 1000);
  return { update: () => { if (firma() !== vista) draw(); }, destroy: () => clearInterval(tic) };
}
