// ================= v13.4 · Tres en raya: contra la máquina u ONLINE con alguien del equipo =================
// · Máquina: fácil (al azar), normal (gana si puede, bloquea, si no al azar) e IMPOSIBLE (minimax: como mucho empatas).
// · Equipo: la partida vive en el servidor (caché, sin tocar ninguna hoja del negocio); el servidor comprueba turnos y casillas.
//   Solo para quien puede usar el chat. Cada jugada tarda lo que tarde Google Apps Script (1-3 s): es por turnos, no hace falta más.
import { h, btn, toast } from '../ui.js';
import { api, can } from '../store.js';

export const meta = { id: 'tresenraya', titulo: 'Tres en raya', emoji: '❌', desc: 'Contra la máquina o ONLINE con alguien del equipo.' };

// ---------- Lógica pura ----------
export const LINEAS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export function ganador(tab) {
  for (const l of LINEAS) { const a = tab[l[0]]; if (a !== '_' && a === tab[l[1]] && a === tab[l[2]]) return { g: a, linea: l }; }
  return tab.includes('_') ? null : { g: 'E', linea: [] };
}
const libres = tab => [...tab].map((c, i) => c === '_' ? i : -1).filter(i => i >= 0);
const poner = (tab, i, j) => tab.slice(0, i) + j + tab.slice(i + 1);
const otro = j => j === 'X' ? 'O' : 'X';
// minimax con profundidad (gana lo antes posible, pierde lo más tarde posible). 9 casillas: instantáneo
function minimax(tab, turno, yo, prof) {
  const w = ganador(tab); if (w) return w.g === 'E' ? 0 : (w.g === yo ? 10 - prof : prof - 10);
  let best = turno === yo ? -99 : 99;
  for (const i of libres(tab)) { const v = minimax(poner(tab, i, turno), otro(turno), yo, prof + 1); best = turno === yo ? Math.max(best, v) : Math.min(best, v); }
  return best;
}
// nivel: 0 fácil · 1 normal · 2 imposible. rnd inyectable para probar
export function jugadaMaquina(tab, yo, nivel, rnd = Math.random) {
  const l = libres(tab); if (!l.length) return -1;
  const pick = a => a[Math.floor(rnd() * a.length) % a.length];
  if (nivel === 0) return pick(l);
  if (nivel === 1) {
    for (const i of l) { const w = ganador(poner(tab, i, yo)); if (w && w.g === yo) return i; }
    for (const i of l) { const w = ganador(poner(tab, i, otro(yo))); if (w && w.g === otro(yo)) return i; }
    return rnd() < 0.8 && tab[4] === '_' ? 4 : pick(l);
  }
  let mejor = -99, cand = [];
  for (const i of l) { const v = minimax(poner(tab, i, yo), otro(yo), yo, 1); if (v > mejor) { mejor = v; cand = [i]; } else if (v === mejor) cand.push(i); }
  return pick(cand);
}

const LS = 'cd.descanso.tresenraya';
const leeR = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } };
const guardaR = r => { try { localStorage.setItem(LS, JSON.stringify(r)); } catch (e) { } };
const MARCA = { X: '✖', O: '⭕' };

export function render(el, ctx) {
  let modo = 'menu', nivel = 1, tab = '_________', yo = 'X', turno = 'X', fin = null, bloqueado = false, timer = 0, vivo = true;
  let online = null, lobby = null, rev = -1, errOn = '', cargando = false, rec = leeR();
  const root = h('div.ttt'); el.append(root);
  const stop = () => { clearTimeout(timer); timer = 0; };
  const pon = (...a) => root.replaceChildren(...a.flat().filter(Boolean));   // (replaceChildren escribiría «null» con un hijo nulo)

  // ---------- Pintado ----------
  function tablero(onClick, linea, activo) {
    return h('div.ttt-board', { role: 'grid', 'aria-label': 'Tablero de tres en raya' }, [...tab].map((c, i) => h('button.ttt-c' + (c !== '_' ? '.' + c : '') + (linea && linea.includes(i) ? '.win' : ''), {
      type: 'button', 'data-i': String(i), disabled: !activo || c !== '_', 'aria-label': 'Casilla ' + (i + 1) + (c === '_' ? ' libre' : ' ' + (c === 'X' ? 'cruz' : 'círculo')), onclick: () => onClick(i)
    }, c === '_' ? '' : MARCA[c])));
  }
  function pinta() {
    if (!vivo) return;
    if (modo === 'menu') return menu();
    if (modo === 'cpu') return pintaCpu();
    pintaOnline();
  }
  function menu() {
    pon(
      h('div.ttt-menu',
        h('div.card.ttt-opt', h('h3', '🤖 Contra la máquina'), h('div.ttt-niv', ['Fácil', 'Normal', 'Imposible'].map((n, i) => h('button.chip' + (i === nivel ? '.on' : ''), { type: 'button', 'data-nivel': String(i), onclick: () => { nivel = i; menu(); } }, n))),
          h('p.muted.tiny', nivel === 2 ? 'Imposible: la máquina no falla. Lo mejor que puedes hacer es empatar.' : nivel === 1 ? 'Normal: gana si puede y bloquea tus líneas.' : 'Fácil: juega al azar.'),
          h('div.row', btn('Jugar yo primero (✖)', () => empiezaCpu('X'), { cls: 'primary' }), btn('Que empiece la máquina', () => empiezaCpu('O')))),
        h('div.card.ttt-opt', h('h3', '👥 Online con el equipo'),
          can('chat.usar') ? [h('p.muted.tiny', 'Reta a alguien que tenga la app abierta. Se juega por turnos; cada jugada tarda 1-3 segundos en llegar.'), btn('Entrar a la sala', () => entraSala(), { cls: 'primary', icon: 'users' })]
            : h('p.muted.tiny', 'Tu rol no puede usar el chat del equipo, así que no puedes jugar online. Contra la máquina sí.')),
        h('div.card.ttt-opt', h('h3', '🏅 Tus partidas contra la máquina'), h('p', 'Ganadas ', h('b', String(rec.g || 0)), ' · Empates ', h('b', String(rec.e || 0)), ' · Perdidas ', h('b', String(rec.p || 0))))));
  }

  // ---------- Contra la máquina ----------
  function empiezaCpu(quien) { modo = 'cpu'; yo = quien; tab = '_________'; turno = 'X'; fin = null; bloqueado = false; pinta(); if (turno !== yo) maquina(); }
  function maquina() {
    bloqueado = true; pinta();
    timer = setTimeout(() => {
      if (!vivo || modo !== 'cpu' || fin) return;
      const i = jugadaMaquina(tab, otro(yo), nivel); if (i >= 0) mueve(i, otro(yo));
      bloqueado = false; pinta();
    }, 380);
  }
  function mueve(i, j) {
    tab = poner(tab, i, j); const w = ganador(tab);
    if (w) { fin = w; if (modo === 'cpu') { const k = w.g === 'E' ? 'e' : w.g === yo ? 'g' : 'p'; rec[k] = (rec[k] || 0) + 1; guardaR(rec); } }
    else turno = otro(j);
  }
  function clicCpu(i) { if (fin || bloqueado || turno !== yo || tab[i] !== '_') return; mueve(i, yo); pinta(); if (!fin) maquina(); }
  function pintaCpu() {
    const txt = fin ? (fin.g === 'E' ? '🤝 Empate' : fin.g === yo ? '🏆 ¡Has ganado!' : '🤖 Ha ganado la máquina') : turno === yo ? 'Tu turno (' + MARCA[yo] + ')' : 'Pensando…';
    pon(h('div.ttt-status' + (fin ? '.fin' : ''), txt), tablero(clicCpu, fin && fin.linea, !fin && !bloqueado && turno === yo),
      h('div.row', btn('Otra partida', () => empiezaCpu(yo === 'X' ? 'O' : 'X'), { cls: 'primary' }), btn('Cambiar de modo', () => { stop(); modo = 'menu'; pinta(); })));
  }

  // ---------- Online ----------
  async function llama(a, d) { try { return await api(a, d, { quiet: true, timeout: 20000 }); } catch (e) { errOn = e.message || String(e); return null; } }
  async function entraSala() { modo = 'sala'; online = null; lobby = null; errOn = ''; rev = -1; pinta(); await sondea(); }
  async function sondea() {
    stop(); if (!vivo || (modo !== 'sala' && modo !== 'online')) return;
    if (document.hidden) { timer = setTimeout(sondea, 2500); return; }
    if (online && online.id && online.estado !== 'espera' || (online && online.estado === 'espera')) {
      const r = await llama('juego.estado', { id: online.id, rev }); if (!vivo) return;
      if (r) { errOn = ''; if (r.nohay) { online = null; modo = 'sala'; } else if (!r.igual) { online = r; rev = r.rev; if (modo === 'sala') modo = 'online'; } }
    } else {
      const r = await llama('juego.lobby', {}); if (!vivo) return;
      if (r) { errOn = ''; lobby = r; if (r.mia) { online = r.mia; rev = r.mia.rev; modo = 'online'; } }
    }
    pinta();
    const ritmo = online && online.estado === 'juega' && online.turno !== online.yo ? 1400 : online && online.estado === 'espera' ? 2000 : 3000;
    if (!(online && online.estado === 'fin')) timer = setTimeout(sondea, ritmo);
  }
  const act = async (a, d) => { if (cargando) return; cargando = true; pinta(); const r = await llama(a, d); cargando = false; if (!vivo) return; if (r && r.id) { online = r; rev = r.rev; modo = 'online'; } if (a === 'juego.salir' && r) { online = null; rev = -1; modo = 'sala'; } pinta(); sondea(); return r; };
  function pintaOnline() {
    if (modo === 'sala') {
      const abiertas = (lobby && lobby.abiertas) || [], rank = (lobby && lobby.ranking) || [];
      pon(
        errOn ? h('div.ttt-err', '⚠️ ' + errOn) : null,
        h('div.card', h('h3', '👥 Sala del equipo'), lobby ? null : h('p.muted', 'Buscando partidas…'),
          abiertas.length ? h('div.ttt-lista', abiertas.map(p => h('div.ttt-fila', h('span', h('b', p.por), ' quiere jugar'), btn('Unirme', () => act('juego.unirse', { id: p.id }), { cls: 'primary sm', disabled: cargando })))) : lobby ? h('p.muted.tiny', 'Nadie está esperando ahora mismo.') : null,
          btn('Crear una partida y esperar', () => act('juego.crear', { tipo: 'tresraya' }), { icon: 'plus', cls: abiertas.length ? '' : 'primary', disabled: cargando })),
        rank.length ? h('div.card', h('h3', '🏅 Clasificación del equipo'), h('table.ttt-rank', h('tr', h('th', 'Jugador'), h('th', 'G'), h('th', 'E'), h('th', 'P')), rank.map(r => h('tr', h('td', r.n), h('td', String(r.g)), h('td', String(r.e)), h('td', String(r.p)))))) : null,
        btn('Volver', () => { stop(); modo = 'menu'; pinta(); }));
      return;
    }
    const g = online || {}; yo = g.yo || 'X'; tab = g.tab || '_________';
    const rival = g.estado === 'espera' ? null : (g.x && g.x.n && yo === 'O' ? g.x.n : g.o && g.o.n);
    const mi = g.estado === 'juega' && g.turno === yo;
    const txt = g.estado === 'espera' ? '⏳ Esperando a que alguien se una…' : g.estado === 'fin' ? (g.ganador === 'E' ? '🤝 Empate' : g.ganador === yo ? '🏆 ¡Has ganado!' + (g.motivo === 'abandono' ? ' (tu rival se fue)' : '') : '😅 Ha ganado ' + (rival || 'tu rival') + (g.motivo === 'abandono' ? ' (te fuiste o tardaste demasiado)' : '')) : mi ? 'Tu turno (' + MARCA[yo] + ')' : 'Turno de ' + (rival || 'tu rival') + '…';
    pon(errOn ? h('div.ttt-err', '⚠️ ' + errOn) : null,
      h('div.muted.tiny', 'Tú: ' + MARCA[yo] + (rival ? ' · Rival: ' + rival : '')), h('div.ttt-status' + (g.estado === 'fin' ? '.fin' : ''), txt),
      tablero(i => { if (mi && !cargando && tab[i] === '_') act('juego.mover', { id: g.id, celda: i }); }, g.linea, mi && !cargando),
      h('div.row', g.estado === 'fin' ? btn('Volver a la sala', () => act('juego.salir', {}), { cls: 'primary' }) : btn(g.estado === 'espera' ? 'Cancelar' : 'Rendirme y salir', () => act('juego.salir', {}), { cls: 'ghost' })));
  }

  pinta();
  window.__ttt = { tab: () => tab, modo: () => modo, fin: () => fin, online: () => online };
  return {
    destroy() {
      vivo = false; stop(); delete window.__ttt;
      // si te vas con una partida en curso o esperando, el servidor la cierra (quien se va, pierde; la partida en espera se retira)
      if (online && online.estado !== 'fin') { try { api('juego.salir', {}, { quiet: true, timeout: 8000 }).catch(() => { }); } catch (e) { } }
    }
  };
}
