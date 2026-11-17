// ================= Motivación, niveles, insignias, ranking y recompensas =================
// Solo juego: sin dinero real. Los puntos salen de la actividad real (no se pueden inflar).
import { h, mount, btn, avatar, modal, toast, eur, pill } from './ui.js';
import { S, api, can, upsertLocal, emit, user } from './store.js';

const CL = window.CL;
let frases = null;
export async function loadFrases() {
  if (!frases) { try { frases = await (await fetch('data/frases.json')).json(); } catch (e) { frases = [{ t: 'Paso a paso también se llega lejos.' }]; } }
  return frases;
}
// Frase del día (distinta para cada persona y cada día) y otra al pulsar
export function fraseDelDia(offset = 0) {
  const list = frases || [];
  if (!list.length) return '';
  const seed = (S.hoy + (S.me ? S.me.id : '')).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return list[(seed + offset) % list.length].t;
}
export const LEVEL_NAMES = [[1, 'Primeros pasos'], [3, 'En marcha'], [5, 'Imparable'], [8, 'Referente del taller'], [10, 'Leyenda'], [15, 'Maestría'], [20, 'Élite']];
export const levelName = n => LEVEL_NAMES.filter(x => n >= x[0]).pop()[1];

let G = null, Gk = '';
export function game() {
  const k = [S.t.pedidos.length, S.t.tareas.length, S.t.redes.length, S.t.noticias.length, S.t.comentarios.length, S.hoy, S.meta.pedidos && S.meta.pedidos.hash, S.meta.tareas && S.meta.tareas.hash].join('|');
  if (k !== Gk) { Gk = k; G = CL.gamify(S.t, S.cfg, S.hoy); }
  return G;
}

// ---------- Tarjeta "Tu nivel" con insignias y ranking ----------
export function gameCard() {
  const g = game(), me = g.usuarios[S.me.id];
  if (!me) return null;
  const tabs = [['xp', 'Puntos'], ['ventas', 'Ventas'], ['pedidos', 'Pedidos'], ['tareas', 'Tareas'], ['actividad', 'Actividad']].filter(t => t[0] !== 'ventas' || can('informes.ver'));
  let tab = 'xp';
  const rk = h('div');
  const drawRank = () => mount(rk, h('div.seg.sm', tabs.map(t => h('button' + (tab === t[0] ? '.on' : ''), { onclick: () => { tab = t[0]; drawRank(); } }, t[1]))),
    h('div.rank', g.ranking[tab].slice(0, 6).map((r, i) => h('div.rank-row' + (r.id === S.me.id ? '.me' : ''), h('span.pos', ['🥇', '🥈', '🥉'][i] || String(i + 1)), avatar(user(r.id) || { nombre: r.nombre }, 's'), h('span.grow', r.nombre), h('b', tab === 'ventas' ? eur(r.valor) : tab === 'actividad' ? r.valor + ' días' : String(r.valor))))),
    h('p.tiny.muted', 'Ranking de este mes.'));
  drawRank();
  const cfg = S.cfg.gamificacion || {};
  const team = g.lista.reduce((a, x) => ({ p: a.p + x.pedidosMes, v: a.v + x.ventasMes }), { p: 0, v: 0 });
  const goal = (l, cur, obj, f) => obj ? h('div.goal', h('div.row.small', h('span.grow', l), h('b', f(cur) + ' / ' + f(obj))), h('div.progress', h('span', { style: { width: Math.min(100, cur / obj * 100) + '%' } }))) : null;
  return h('section.card.game', h('div.card-h', h('h3', '🎮 Tu nivel'), h('span.tiny.muted', me.xp + ' XP')),
    h('div.row', h('div.lvl', h('span', String(me.nivel))), h('div.grow', h('div.bold', levelName(me.nivel)), h('div.progress', h('span', { style: { width: Math.round(me.progreso * 100) + '%' } })), h('div.tiny.muted', (me.xpSiguiente - me.xp) + ' XP para el nivel ' + (me.nivel + 1) + (me.racha > 1 ? ' · 🔥 racha de ' + me.racha + ' días' : '')))),
    h('div.badges', g.insignias.map(b => h('span.badge' + (me.insignias.includes(b.k) ? '.on' : ''), { title: b.t + ' — ' + b.d }, b.i, h('small', b.t)))),
    goal('Objetivo del equipo: pedidos', team.p, cfg.objetivoMensualPedidos, String),
    can('informes.ver') ? goal('Objetivo del equipo: ventas', team.v, cfg.objetivoMensualVentas, eur) : null,
    rk);
}

// ---------- ¿Ha subido de nivel o ganado insignias? ----------
let checking = false;
export async function checkLevelUp() {
  if (checking || !S.me || !S.cfg || (S.cfg.gamificacion && S.cfg.gamificacion.activa === false)) return;
  const g = game(), me = g.usuarios[S.me.id];
  if (!me || !S.ready) return;
  const mine = (S.t.logros || []).filter(l => l.userId === S.me.id);
  const maxLvl = Math.max(1, ...mine.filter(l => l.tipo === 'nivel').map(l => Number(l.nivel) || 0));
  const have = new Set(mine.map(l => l.clave));
  checking = true;
  try {
    for (const b of me.insignias) if (!have.has('insignia_' + b)) { const r = await api('logros.registrar', { tipo: 'insignia', clave: 'insignia_' + b }); upsertLocal('logros', r); const bd = g.insignias.find(x => x.k === b); toast('Nueva insignia: ' + bd.i + ' ' + bd.t, 'ok', 6000); }
    if (me.nivel > maxLvl && me.nivel > 1) {
      const r = await api('logros.registrar', { tipo: 'nivel', clave: 'nivel_' + me.nivel, nivel: me.nivel });
      upsertLocal('logros', r); emit();
      celebrate(me.nivel, r.recompensa);
    }
  } catch (e) { console.warn('logros', e); }
  checking = false;
}

// ---------- Celebración con confeti y ruleta (recompensa virtual) ----------
export function celebrate(level, reward) {
  const list = ((S.cfg.gamificacion && S.cfg.gamificacion.recompensas) || []).filter(Boolean);
  const confetti = h('div.confetti', Array.from({ length: 60 }, (_, i) => h('i', { style: { left: Math.random() * 100 + '%', animationDelay: (Math.random() * 1.2) + 's', background: ['#a855f7', '#ec4899', '#f59e0b', '#22c55e', '#0ea5e9'][i % 5] } })));
  const n = Math.max(list.length, 1), idx = Math.max(0, list.indexOf(reward));
  const seg = 360 / n;
  const colors = ['#f3e8ff', '#fce7f3', '#e0f2fe', '#dcfce7', '#fef3c7', '#ede9fe', '#ffe4e6', '#cffafe'];
  const wheel = h('div.wheel', { style: { background: 'conic-gradient(' + list.map((_, i) => colors[i % colors.length] + ' ' + (i * seg) + 'deg ' + ((i + 1) * seg) + 'deg').join(',') + ')' } },
    list.map((t, i) => { const a = (i * seg + seg / 2) * Math.PI / 180; return h('span.wl', { style: { left: (50 + 34 * Math.sin(a)) + '%', top: (50 - 34 * Math.cos(a)) + '%' } }, t.split(' ')[0]); }));
  const res = h('p.reward');
  const m = modal('¡Nivel ' + level + '!', h('div.celebrate', confetti, h('div.big-lvl', '🏆 ' + level), h('h3', levelName(level)), h('p.muted', '¡Enhorabuena, ' + S.me.nombre.split(' ')[0] + '! Gira la ruleta para ver tu recompensa.'),
    list.length ? h('div.wheel-box', h('div.pointer', '▼'), wheel) : null, res), close => [btn('¡Gracias!', close, { cls: 'primary' })], { size: 'narrow' });
  const spin = () => {
    const turns = 5 * 360 + (360 - (idx * seg + seg / 2));
    wheel.style.transform = 'rotate(' + turns + 'deg)';
    setTimeout(() => { res.textContent = reward ? '🎁 ' + reward : '🎉 ¡Sigue así!'; res.classList.add('on'); }, 4200);
  };
  if (list.length) setTimeout(spin, 400); else res.textContent = '🎉 ¡Sigue así!';
  return m;
}
