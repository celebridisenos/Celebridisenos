// ================= v12.3 · Regalos premium: meta del mes, récords, confeti y celebraciones =================
// Todo se calcula SOLO con tus pedidos reales (nada inventado). La meta es la que ya existe en
// Configuración → Juego («objetivo mensual de ventas»); si no hay meta, se compara con el mes anterior.
import { h, toast, eur } from './ui.js';
import { S, can, on } from './store.js';

const CL = window.CL;
const n = v => Number(v) || 0;
const r2 = v => Math.round(v * 100) / 100;
const pad = v => String(v).padStart(2, '0');

const vivos = () => S.t.pedidos.filter(o => o.fecha && !CL.stateOf(S.cfg.pedidos, o.estado).cancelled);
const tot = o => CL.orderTotal(o);

// ---------- Cifras del mes + proyección + récords ----------
export function resumenMes(hoy) {
  hoy = hoy || S.hoy || CL.today();
  const ym = hoy.slice(0, 7), dd = n(hoy.slice(8, 10)), y = n(hoy.slice(0, 4)), m = n(hoy.slice(5, 7));
  const diasMes = new Date(y, m, 0).getDate();
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1, pym = py + '-' + pad(pm);
  const L = vivos();
  let vendido = 0, pedidos = 0, prevHasta = 0, prevPedidos = 0, prevTotal = 0, hoyTotal = 0, hoyPedidos = 0;
  const porDia = {}, porMes = {};
  L.forEach(o => {
    const t = tot(o), f = o.fecha.slice(0, 10), mm = f.slice(0, 7);
    porDia[f] = porDia[f] || { fecha: f, total: 0, pedidos: 0 }; porDia[f].total += t; porDia[f].pedidos++;
    porMes[mm] = porMes[mm] || { mes: mm, total: 0, pedidos: 0 }; porMes[mm].total += t; porMes[mm].pedidos++;
    if (mm === ym) { vendido += t; pedidos++; if (f === hoy) { hoyTotal += t; hoyPedidos++; } }
    if (mm === pym) { prevTotal += t; if (n(f.slice(8, 10)) <= dd) { prevHasta += t; prevPedidos++; } }
  });
  const g = (S.cfg && S.cfg.gamificacion) || {};
  const meta = n(g.objetivoMensualVentas);
  const mejorDia = Object.values(porDia).filter(d => d.fecha !== hoy).sort((a, b) => b.total - a.total)[0] || null;
  const mejorMes = Object.values(porMes).filter(x => x.mes !== ym).sort((a, b) => b.total - a.total)[0] || null;
  // racha: días seguidos (hasta hoy, o hasta ayer si hoy aún no hay pedidos) con al menos un pedido
  let racha = 0; const d = new Date(y, m - 1, dd);
  const key = x => x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
  if (!porDia[key(d)]) d.setDate(d.getDate() - 1);
  while (porDia[key(d)] && racha < 3650) { racha++; d.setDate(d.getDate() - 1); }
  const diasConVentas = Object.keys(porDia).length;
  return {
    hoy, ym, dd, diasMes, vendido: r2(vendido), pedidos, meta, pct: meta > 0 ? vendido / meta : 0,
    proyeccion: dd >= 7 && vendido > 0 ? r2(vendido / dd * diasMes) : null,
    anterior: { total: r2(prevTotal), hastaHoy: r2(prevHasta), pedidosHastaHoy: prevPedidos, ym: pym },
    hoyTotal: r2(hoyTotal), hoyPedidos, mejorDia, mejorMes, racha, diasConVentas, pedidosTotales: L.length,
    mejorDiaHoy: porDia[hoy] || null, mesActualEsRecord: !!mejorMes && vendido > mejorMes.total
  };
}

// ---------- Confeti (sin librerías; respeta «reducir movimiento») ----------
let confetiOn = false;
export function confeti(opts) {
  opts = opts || {};
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false; } catch (e) { }
  if (confetiOn || document.hidden) return false;
  confetiOn = true;
  const cv = document.createElement('canvas');
  cv.className = 'confeti'; cv.setAttribute('aria-hidden', 'true');
  const W = cv.width = innerWidth, H = cv.height = innerHeight;
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const cols = opts.colores || ['#7c3aed', '#c4478f', '#f59e0b', '#22c55e', '#38bdf8', '#f43f5e'];
  const N = opts.n || 150;
  const ps = Array.from({ length: N }, (_, i) => ({
    x: W * (0.2 + 0.6 * Math.random()), y: H * 0.35 + Math.random() * 40, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 13 - 4,
    s: 5 + Math.random() * 6, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length], f: Math.random() < 0.5
  }));
  const t0 = performance.now(), dur = opts.ms || 2800;
  (function frame(t) {
    const k = (t - t0) / dur;
    ctx.clearRect(0, 0, W, H);
    ps.forEach(p => {
      p.vy += 0.28; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4);
      ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
      if (p.f) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.4, 0, 6.28); ctx.fill(); }
      ctx.restore();
    });
    if (k < 1) requestAnimationFrame(frame); else { cv.remove(); confetiOn = false; }
  })(t0);
  return true;
}

// ---------- Celebraciones: una sola vez cada una, y en silencio la primera vez que se activa ----------
const HITOS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const ckey = () => 'cd.cel.' + (S.me ? S.me.id : '0');
const rd = () => { try { return JSON.parse(localStorage.getItem(ckey()) || 'null'); } catch (e) { return null; } };
const wr = v => { try { localStorage.setItem(ckey(), JSON.stringify(v)); } catch (e) { } };
export function celebrar(opt) {
  if (!S.me || !can('pedidos.ver') || !S.t.pedidos.length) return null;
  opt = opt || {};
  const R = resumenMes();
  const dinero = can('informes.ver');
  const hito = HITOS.filter(x => R.pedidosTotales >= x).pop() || 0;
  const mejorPrev = R.mejorDia ? R.mejorDia.total : 0;
  const recordDia = dinero && R.diasConVentas >= 6 && mejorPrev > 0 && R.hoyTotal > mejorPrev;
  const metaOk = dinero && R.meta > 0 && R.vendido >= R.meta;
  let st = rd();
  if (!st) { // primera vez en este equipo: se anota el punto de partida sin fiestas retroactivas
    wr({ meta: metaOk ? R.ym : '', dia: recordDia ? R.hoy : '', hito }); return null;
  }
  const out = [];
  if (metaOk && st.meta !== R.ym) { st.meta = R.ym; out.push({ k: 'meta', t: '🎯 ¡Meta del mes conseguida!', s: eur(R.vendido) + ' de ' + eur(R.meta) + '. Enhorabuena, equipo.' }); }
  if (recordDia && st.dia !== R.hoy) { st.dia = R.hoy; out.push({ k: 'dia', t: '🏆 ¡Nuevo récord de un día!', s: eur(R.hoyTotal) + ' hoy (el mejor hasta ahora era ' + eur(mejorPrev) + ').' }); }
  if (hito > n(st.hito)) { st.hito = hito; out.push({ k: 'hito', t: '🎉 ¡' + hito.toLocaleString('es-ES') + ' pedidos en total!', s: 'De verdad. Mira de dónde venís.' }); }
  if (!out.length) return null;
  wr(st);
  if (opt.silencioso) return out;
  const c = out[0];
  toast(c.t + ' ' + c.s, 'ok', 9000);
  confeti({ n: c.k === 'meta' ? 220 : 150, ms: c.k === 'meta' ? 3600 : 2800 });
  return out;
}
let timer = null;
export function startCelebraciones() {
  if (startCelebraciones.on) return; startCelebraciones.on = true;
  on(() => { clearTimeout(timer); timer = setTimeout(() => { try { celebrar(); } catch (e) { console.error(e); } }, 1500); });
}

// ---------- Tarjeta del Inicio: anillo de meta + proyección + récords ----------
export function anillo(pct, size, texto, sub) {
  const deg = Math.round(Math.max(0, Math.min(1, pct)) * 360);
  const ring = h('div.anillo', { style: { width: size + 'px', height: size + 'px' }, role: 'img', 'aria-label': texto + ' ' + (sub || '') });
  ring.style.setProperty('--deg', deg + 'deg');
  ring.appendChild(h('div.anillo-in', h('b', texto), sub ? h('small', sub) : null));
  return ring;
}
export function metaCard(go, abrirTarjeta) {
  if (!can('informes.ver')) return null;
  const R = resumenMes();
  if (!R.pedidosTotales) return null;
  const mes = new Date(R.hoy + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long' });
  const sin = !(R.meta > 0);
  const vs = R.anterior.hastaHoy > 0 ? Math.round((R.vendido / R.anterior.hastaHoy - 1) * 100) : null;
  const pct = sin ? (R.anterior.total > 0 ? R.vendido / R.anterior.total : 0) : R.pct;
  const falta = !sin ? Math.max(0, R.meta - R.vendido) : 0;
  const ritmo = !sin && R.proyeccion !== null ? (R.proyeccion >= R.meta ? '✅ A este ritmo la superarás (' + eur(R.proyeccion) + ')' : '⏳ A este ritmo cerrarás en ' + eur(R.proyeccion)) : (R.proyeccion !== null ? 'A este ritmo cerrarás en ' + eur(R.proyeccion) : '');
  const rec = [];
  if (R.mejorDia) rec.push(['🏆', 'Mejor día', eur(R.mejorDia.total), new Date(R.mejorDia.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })]);
  if (R.mejorMes) rec.push(['📅', 'Mejor mes', eur(R.mejorMes.total), new Date(R.mejorMes.mes + '-15T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })]);
  if (R.racha >= 2) rec.push(['🔥', 'Racha', R.racha + ' días', 'seguidos con pedidos']);
  return h('section.card.meta-card',
    h('div.row', h('h3.grow', '🎯 ' + mes.charAt(0).toUpperCase() + mes.slice(1) + (sin ? '' : ' · meta')), R.mesActualEsRecord ? h('span.pill.ok', '🏆 mejor mes') : null),
    h('div.meta-body',
      anillo(pct, 128, Math.round(pct * 100) + ' %', sin ? 'del mes pasado' : 'de la meta'),
      h('div.meta-txt',
        h('div.meta-big', eur(R.vendido)), h('div.small.muted', R.pedidos + ' pedido' + (R.pedidos === 1 ? '' : 's') + ' este mes' + (vs !== null ? ' · ' + (vs >= 0 ? '▲ ' : '▼ ') + Math.abs(vs) + ' % frente al mismo punto del mes pasado' : '')),
        !sin ? h('div.small', (falta > 0 ? 'Faltan ' + eur(falta) + ' para la meta de ' + eur(R.meta) : '🎉 Meta de ' + eur(R.meta) + ' superada')) : h('div.small.muted', 'Sin meta mensual: ', h('a', { href: '#/config/juego' }, 'ponla aquí'), ' y te avisaré con confeti al lograrla.'),
        ritmo ? h('div.small.muted', ritmo) : null)),
    rec.length ? h('div.rec-row', rec.map(x => h('div.rec', h('span.ic', x[0]), h('div', h('b', x[2]), h('div.tiny.muted', x[1] + ' · ' + x[3]))))) : null,
    h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } },
      h('button.btn.sm', { onclick: () => abrirTarjeta() }, '📸 Tarjeta para redes'),
      can('productos.ver') ? h('button.btn.sm', { onclick: () => go('estudio') }, '📸 Biouvision') : null, // v13.10: en lugar de la Pantalla TV
      h('button.btn.sm.ghost', { onclick: () => confeti(), title: 'Solo por diversión' }, '🎊')));
}
