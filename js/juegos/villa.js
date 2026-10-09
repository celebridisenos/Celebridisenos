// ================= v16.2 · 🏘️ VILLA CELEBRI — un mini-mundo de verdad =================
// Paseas por una villa viva: 8 vecinos con su horario, sus gustos y sus historias (se hacen amigos tuyos poco a poco),
// flores, conchas y setas que salen cada día, pesca, un huerto que crece en tiempo real, el taller 3D de Íker,
// encargos, mercado, álbum… y tus COMPAÑEROS: si están jugando a la vez los ves andar por la villa, os saludáis y
// os dejáis notas en el tablón de la plaza. La hora de la villa es la misma para todos (1 día = 10 minutos).
// No toca nada del negocio. La partida se guarda en este aparato y en el servidor (para seguirla en otro PC).
import { h, btn, toast, inp } from '../ui.js';
import { S as APP } from '../store.js';
import { pon, llamar, reloj, fiesta } from './kit.js';
import * as D from './villa_datos.js';

export const meta = { id: 'villa', titulo: 'Villa Celebri', emoji: '🏘️', desc: 'Un mini-mundo con vecinos, pesca, huerto y tus compañeros.' };
const { W, H } = D, FE = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif', DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), hsh = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 97;
const elige = (l, r) => { const tot = l.reduce((a, x) => a + x[1], 0); let v = r * tot; for (const x of l) { v -= x[1]; if (v <= 0) return x[0]; } return l[0][0]; };

export function render(el) {
  const R = reloj(); let vivo = true, modo = 'juego', raf = 0, offset = 0, sucio = false, tGuardado = 0;
  const yo = (APP.me && APP.me.id) || 'yo', CLAVE = 'cd.villa.' + yo, MAPA = D.mapa(), TS = 44, DPR = Math.min(2, window.devicePixelRatio || 1);
  const bloque = new Set(); D.EDIFICIOS.forEach(b => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) bloque.add((b.x + i) + ',' + (b.y + j)); }); D.OBJETOS.forEach(o => { if (!o.suelo) bloque.add(o.x + ',' + o.y); });
  const libre = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !D.SOLIDO[MAPA[y][x]] && !bloque.has(x + ',' + y);
  const nueva = () => ({ v: 1, cara: '', sombrero: '', sombreros: [], monedas: 30, inv: {}, am: {}, hab: {}, reg: {}, mis: {}, don: {}, cog: { d: -1, ids: [] }, huerto: Array(8).fill(null), imp: null, album: {}, cana: 0, x: 22.5, y: 12.5, t: 0, tesoro: -1, gato: -1, pasos: { recogido: 0, vendido: 0, plantado: 0, pescado: 0, regalado: 0, impreso: 0 } });
  let S = nueva();
  let desfase = 0; // solo para las pruebas (aLas): mueve la hora de la villa sin tocar el reloj compartido
  const ahora = () => Date.now() + offset + desfase, dia = () => Math.floor(ahora() / D.DIA_MS), hora = () => (ahora() % D.DIA_MS) / D.DIA_MS * 24;
  const esNoche = () => { const hh = hora(); return hh >= 21 || hh < 6; };
  const P = { x: 22.5, y: 12.5, ruta: [], anda: 0, meta: null }, teclas = new Set(), otros = new Map(), flota = [], G = { get S() { return S; }, dice: null };
  const gato = { x: 21.5, y: 12.5, ruta: [], t: 0, sigue: false };

  // ---------- la pantalla ----------
  const cv = h('canvas.vl-cv', { tabindex: 0, 'aria-label': 'Villa Celebri: toca para andar' }), X = cv.getContext('2d');
  const hud = h('div.vl-hud'), guia = h('div.vl-guia'), pista = h('button.vl-pista', { type: 'button', onclick: () => actuar() }), capa = h('div.vl-capa');
  const raiz = h('div.vl', h('div.vl-marco', cv, hud, guia, pista, capa)); el.append(raiz);

  // ---------- guardar ----------
  const cambia = () => { sucio = true; S.t = Date.now(); S.x = Math.round(P.x * 10) / 10; S.y = Math.round(P.y * 10) / 10; try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) { } pintaHud(); };
  async function subir(forzar) { if (!sucio && !forzar) return; sucio = false; tGuardado = Date.now(); try { await llamar('mundo.guardar', { partida: S }, { silencio: true }); } catch (e) { sucio = true; } }
  async function carga() {
    let loc = null, srv = null; try { loc = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { }
    try { srv = (await llamar('mundo.cargar', {}, { silencio: true, timeout: 12000 })).partida; } catch (e) { }
    const mejor = srv && (!loc || (srv.t || 0) > (loc.t || 0)) ? srv : loc;
    if (mejor && mejor.v === 1) S = Object.assign(nueva(), mejor, { pasos: Object.assign(nueva().pasos, mejor.pasos || {}) });
    if (!vivo) return;
    P.x = libre(Math.floor(S.x), Math.floor(S.y)) ? S.x : 22.5; P.y = libre(Math.floor(S.x), Math.floor(S.y)) ? S.y : 12.5;
    pintaHud(); if (!S.cara) bienvenida();
  }

  // ---------- cosas ----------
  const tiene = k => S.inv[k] || 0;
  const texto = (t, x, y, c) => flota.push({ t, x: x == null ? P.x : x, y: y == null ? P.y - 0.9 : y, t0: performance.now(), c: c || '#fff' });
  function dar(k, n = 1, sinTexto) { S.inv[k] = tiene(k) + n; if (k !== 'paquete') S.album[k] = 1; if (!sinTexto) texto('+' + n + ' ' + D.COSAS[k].e); cambia(); }
  function quitar(k, n = 1) { if (tiene(k) < n) return false; S.inv[k] -= n; if (!S.inv[k]) delete S.inv[k]; cambia(); return true; }
  function monedas(n) { S.monedas = Math.max(0, S.monedas + n); texto((n > 0 ? '+' : '') + n + ' 🪙', null, P.y - 1.3, n > 0 ? '#fde047' : '#fca5a5'); cambia(); }
  const corazones = k => Math.min(5, Math.floor((S.am[k] || 0) / 10));
  const albumTotal = () => Object.keys(D.COSAS).length - 1 + D.VECINOS.length + 1, albumHecho = () => Object.keys(S.album).length;

  // lo que brota hoy (igual para todo el equipo; cada uno recoge lo suyo)
  let brotesDia = -1, brotesL = [], llego = null;
  const alcanzable = (x, y) => { if (!llego) { llego = new Set(['22,12']); const q = [[22, 12]]; for (let i = 0; i < q.length; i++) for (const [dx, dy] of DIRS) { const nx = q[i][0] + dx, ny = q[i][1] + dy, k = nx + ',' + ny; if (libre(nx, ny) && !llego.has(k)) { llego.add(k); q.push([nx, ny]); } } } return llego.has(x + ',' + y); };
  function brotes() {
    const d = dia(); if (d === brotesDia) return brotesL;
    const r = D.azar(d * 7919 + 13), usados = new Set(); brotesL = []; brotesDia = d;
    D.BROTES.forEach(g => { const sitios = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (MAPA[y][x] === g.suelo && alcanzable(x, y) && (!g.arbol || DIRS.some(([i, j]) => /[tT]/.test(MAPA[y + j][x + i])))) sitios.push([x, y]);
      for (let n = 0; n < g.n && sitios.length; n++) { const [x, y] = sitios.splice(Math.floor(r() * sitios.length), 1)[0]; if (usados.has(x + ',' + y)) continue; usados.add(x + ',' + y); brotesL.push({ id: x + '_' + y, x, y, k: elige(g.de, r()) }); } });
    if (S.cog.d !== d) { S.cog = { d, ids: [] }; }
    return brotesL;
  }
  const quedan = () => brotes().filter(b => !S.cog.ids.includes(b.id));

  // ---------- caminos ----------
  function bfs(sx, sy, tx, ty) {
    sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
    if (!libre(tx, ty)) { let best = null, bd = 1e9; for (let r = 1; r <= 4 && !best; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (libre(tx + i, ty + j)) { const d = Math.hypot(tx + i - sx, ty + j - sy) + Math.hypot(i, j) * 4; if (d < bd) { bd = d; best = [tx + i, ty + j]; } } if (!best) return []; [tx, ty] = best; }
    const prev = new Int32Array(W * H).fill(-1), ini = sy * W + sx, fin = ty * W + tx, q = [ini]; prev[ini] = ini;
    for (let qi = 0; qi < q.length && prev[fin] < 0; qi++) { const c = q[qi], cx = c % W, cy = (c - cx) / W; for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy, n = ny * W + nx; if (libre(nx, ny) && prev[n] < 0) { prev[n] = c; q.push(n); } } }
    if (prev[fin] < 0) return []; const out = []; for (let c = fin; c !== ini; c = prev[c]) out.unshift([c % W + 0.5, Math.floor(c / W) + 0.5]); return out;
  }
  function sigue(o, vel, dt) { if (!o.ruta.length) return false; const [tx, ty] = o.ruta[0], dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy), p = vel * dt; if (d <= p) { o.x = tx; o.y = ty; o.ruta.shift(); } else { o.x += dx / d * p; o.y += dy / d * p; } return true; }

  // ---------- vecinos ----------
  const duerme = v => { const hh = hora(), [a, b] = v.duerme; return a < b ? hh >= a && hh < b : hh >= a || hh < b; };
  const destino = v => { const hh = hora(); let r = v.rutina[v.rutina.length - 1]; v.rutina.forEach(x => { if (hh >= x[0]) r = x; }); return r; };
  const NP = D.VECINOS.map(v => { const d = destino(v); return { v, x: d[1] + 0.5, y: d[2] + 0.5, ruta: [], dk: d[0], anda: 0, quieto: 0 }; });
  function mueveVecinos(dt) { NP.forEach(n => { n.oculto = duerme(n.v); if (n.oculto) return; const d = destino(n.v);
    if (d[0] !== n.dk) { n.dk = d[0]; n.ruta = bfs(n.x, n.y, d[1], d[2]); }
    if (modo === 'dlg' && G.con === n) return; n.anda = sigue(n, 2.1, dt) ? n.anda + dt : 0; }); }
  function mueveGato(dt) { if (gato.sigue && Math.hypot(P.x - gato.x, P.y - gato.y) > 1.6) { if (!gato.ruta.length || performance.now() - gato.t > 700) { gato.ruta = bfs(gato.x, gato.y, P.x, P.y); gato.t = performance.now(); } }
    else if (!gato.sigue && !gato.ruta.length && performance.now() - gato.t > 4000) { gato.t = performance.now() + Math.random() * 3000; gato.ruta = bfs(gato.x, gato.y, 16 + Math.random() * 12, 6 + Math.random() * 9).slice(0, 8); }
    sigue(gato, gato.sigue ? 3.6 : 1.6, dt); }

  // ---------- conversación (panel de abajo) ----------
  function dlg(cara, nombre, txt, ops) { modo = 'dlg'; P.ruta = []; teclas.clear();
    pon(capa, h('div.vl-dlg', { role: 'dialog', 'aria-label': nombre }, h('div.vl-dlg-c', cara), h('div.vl-dlg-t', h('b', nombre), h('p', txt), h('div.vl-ops', ops.filter(Boolean).map(([t, f, c]) => btn(t, f, { cls: 'sm' + (c ? ' ' + c : '') })))))); }
  function cierra() { modo = 'juego'; G.con = null; G.pesca = null; pon(capa); cv.focus({ preventScroll: true }); }
  function panel(titulo, cuerpo) { modo = 'panel'; P.ruta = []; teclas.clear(); pon(capa, h('div.vl-panel', { role: 'dialog', 'aria-label': titulo }, h('div.vl-panel-h', h('b', titulo), btn('✕', cierra, { cls: 'sm ghost vl-x', title: 'Cerrar' })), h('div.vl-panel-b', cuerpo))); }
  const fila = (ic, t, sub, accion) => h('div.vl-fila', h('span.vl-ic', ic), h('span.grow', h('b', t), sub ? h('small', sub) : null), accion || null);

  function sube(n, pts) { const k = n.v.k, antes = corazones(k); S.am[k] = Math.min(50, Math.max(0, (S.am[k] || 0) + pts)); const c = corazones(k); if (pts > 0) texto('❤️', n.x, n.y - 1, '#fb7185'); cambia(); return c > antes ? c : 0; }
  function premios(n) { // al llegar a 2 corazones, un regalo; a 5, su secreto y su cromo
    const k = n.v.k, c = corazones(k);
    if (c >= 2 && !S.don[k]) { S.don[k] = 1; dar(n.v.regalo); dlg(n.v.e, n.v.n, n.v.amiga + ' (' + D.COSAS[n.v.regalo].e + ' ' + D.COSAS[n.v.regalo].n + ')', [['🥰 ¡Gracias!', () => hablar(n, true)]]); return true; }
    if (c >= 5 && S.don[k] < 2) { S.don[k] = 2; S.album['amigo_' + k] = 1; cambia(); fiesta(raiz); dlg(n.v.e, n.v.n, '💛 ¡Ya sois amigos del alma! ' + n.v.secreto, [['💛 Guardado en el álbum', () => hablar(n, true)]]); return true; }
    return false;
  }
  function mision(n) { // un encargo por vecino; el que no acabas, te espera
    const k = n.v.k, d = dia(); let m = S.mis[k];
    if (!m || (m.hecha && m.d !== d)) { const r = D.azar(d * 31 + k.length * 977 + k.charCodeAt(0));
      if (r() < 0.3) { const a = D.VECINOS.filter(x => x.k !== k)[Math.floor(r() * (D.VECINOS.length - 1))]; m = { d, tipo: 'lleva', a: a.k, hecha: false, dado: false }; }
      else { const item = n.v.pide[Math.floor(r() * n.v.pide.length)]; m = { d, tipo: 'trae', item, n: 1 + Math.floor(r() * 3), hecha: false }; }
      S.mis[k] = m; cambia(); }
    return m;
  }
  function hablar(n, sinSaludo) {
    G.con = n; const v = n.v, k = v.k, d = dia(); let extra = '';
    if (S.hab[k] !== d) { S.hab[k] = d; sube(n, 2); extra = ' '; if (premios(n)) return; }
    const m = mision(n), hh = hora(), sal = sinSaludo ? '¿Algo más?' : (hh < 12 ? 'Buenos días. ' : hh < 20 ? 'Buenas tardes. ' : 'Buenas noches. ') + v.hola[(d + k.length) % v.hola.length];
    const paq = D.VECINOS.find(o => S.mis[o.k] && S.mis[o.k].tipo === 'lleva' && S.mis[o.k].a === k && S.mis[o.k].dado && !S.mis[o.k].hecha);
    dlg(v.e, v.n + ' · ' + '❤️'.repeat(corazones(k)) + '🤍'.repeat(5 - corazones(k)), sal + extra, [
      paq ? ['📦 Entregar el paquete de ' + paq.n, () => { quitar('paquete'); S.mis[paq.k].hecha = true; monedas(25); sube(n, 3); S.am[paq.k] = Math.min(50, (S.am[paq.k] || 0) + 4); cambia(); dlg(v.e, v.n, '¡Anda, de ' + paq.n + '! Muchas gracias por traerlo.', [['De nada', () => premios(n) || hablar(n, true)]]); }, 'primary'] : null,
      ['💬 Charlar', () => { G.ch = (G.ch || 0) + 1; dlg(v.e, v.n, v.charla[(G.ch + d) % v.charla.length], [['Sigue contando', () => hablar(n, true)], ['👋 Adiós', cierra]]); }],
      ['🎁 Regalar', () => regalar(n)],
      ['📜 Encargo' + (m.hecha ? ' ✓' : ''), () => encargo(n, m)],
      ['👋 Adiós', cierra]]);
  }
  function encargo(n, m) {
    const v = n.v, volver = [['Vale', () => hablar(n, true)]];
    if (m.hecha) return dlg(v.e, v.n, 'Hoy ya me has ayudado. ¡Mañana tendré otra cosa!', volver);
    if (m.tipo === 'lleva') { const a = D.VECINOS.find(x => x.k === m.a);
      if (!m.dado) return dlg(v.e, v.n, '¿Le llevas este paquete a ' + a.n + '? Te lo agradecerá.', [['📦 Yo lo llevo', () => { m.dado = true; dar('paquete'); hablar(n, true); }, 'primary'], ['Ahora no', () => hablar(n, true)]]);
      return dlg(v.e, v.n, 'El paquete es para ' + a.n + '. ¡Gracias por llevarlo!', volver); }
    const c = D.COSAS[m.item], paga = c.v * m.n * 2 + 10;
    if (tiene(m.item) >= m.n) return dlg(v.e, v.n, '¿Me has traído ' + m.n + ' × ' + c.e + ' ' + c.n + '? ¡Qué maravilla!', [['✅ Aquí tienes', () => { quitar(m.item, m.n); m.hecha = true; monedas(paga); sube(n, 6); dlg(v.e, v.n, '¡Mil gracias! Toma, por las molestias: ' + paga + ' 🪙', [['¡Gracias!', () => premios(n) || hablar(n, true)]]); }, 'primary'], ['Todavía no', () => hablar(n, true)]]);
    dlg(v.e, v.n, 'Necesito ' + m.n + ' × ' + c.e + ' ' + c.n + '. Tienes ' + tiene(m.item) + '. Te daré ' + paga + ' 🪙.', volver);
  }
  function regalar(n) {
    const v = n.v, k = v.k, l = Object.keys(S.inv).filter(x => D.COSAS[x] && x !== 'paquete');
    if (S.reg[k] === dia()) return dlg(v.e, v.n, 'Hoy ya me has hecho un regalo. ¡No me malacostumbres!', [['Vale', () => hablar(n, true)]]);
    if (!l.length) return dlg(v.e, v.n, 'No llevas nada en la mochila. Date un paseo: hay flores, conchas, setas…', [['Vale', () => hablar(n, true)]]);
    dlg(v.e, v.n, '¿Qué me das?', l.map(x => [D.COSAS[x].e + ' ' + D.COSAS[x].n + ' ×' + tiene(x), () => { quitar(x); S.reg[k] = dia(); S.pasos.regalado++;
      const g = v.gusta.includes(x), o = v.odia.includes(x); sube(n, g ? 6 : o ? -2 : 2);
      dlg(v.e, v.n, g ? '😍 ¡' + D.COSAS[x].n + '! ¡Con lo que me gusta! Gracias de verdad.' : o ? '😬 Ah… ' + D.COSAS[x].n.toLowerCase() + '. Bueno, la intención es lo que cuenta.' : '🙂 ¡Qué detalle! Gracias.', [['De nada', () => premios(n) || hablar(n, true)]]); }]).concat([['Nada, déjalo', () => hablar(n, true)]]));
  }

  // ---------- sitios ----------
  const comprar = (precio, f) => { if (S.monedas < precio) return toast('No te llegan las monedas. Véndele cosas a Lola ⛺.', 'warn'); monedas(-precio); f(); };
  const SITIOS = {
    tienda() { const sem = Object.keys(D.SEMILLAS), pinta = () => panel('🏪 La tienda de Paco · tienes ' + S.monedas + ' 🪙', h('div',
      h('div.vl-sec', 'Semillas (se plantan en el huerto)'), sem.map(k => fila('🌱', 'Semilla de ' + D.COSAS[k].n.toLowerCase() + (tiene('s_' + k) ? ' · llevas ' + tiene('s_' + k) : ''), 'Crece en ' + Math.round(D.SEMILLAS[k].ms / 60000) + ' min · se vende a ' + D.COSAS[k].v + ' 🪙', btn(D.SEMILLAS[k].p + ' 🪙', () => comprar(D.SEMILLAS[k].p, () => { S.inv['s_' + k] = tiene('s_' + k) + 1; cambia(); pinta(); }), { cls: 'sm' }))),
      h('div.vl-sec', 'Para regalar y para el taller'), Object.keys(D.TIENDA).map(k => fila(D.COSAS[k].e, D.COSAS[k].n, 'Llevas ' + tiene(k), btn(D.TIENDA[k] + ' 🪙', () => comprar(D.TIENDA[k], () => { dar(k); pinta(); }), { cls: 'sm' }))),
      h('div.vl-sec', 'Para ti'), S.cana ? fila('🎣', 'Caña buena', 'Ya la tienes: lo verde es más ancho') : fila('🎣', 'Caña buena', 'Pescar es el doble de fácil', btn(D.CANA_PRO + ' 🪙', () => comprar(D.CANA_PRO, () => { S.cana = 1; cambia(); pinta(); }), { cls: 'sm' })),
      Object.keys(D.SOMBREROS).map(k => { const s = D.SOMBREROS[k], mio = S.sombreros.includes(k); return fila(s.e, s.n, mio ? 'Es tuyo: póntelo en tu casa 🏡' : 'Para ir con estilo', mio ? null : btn(s.p + ' 🪙', () => comprar(s.p, () => { S.sombreros.push(k); S.sombrero = k; cambia(); pinta(); }), { cls: 'sm' })); }))); pinta(); },
    pan() { panel('🥐 Panadería de Carmen', h('div', fila('🥖', 'Pan recién hecho', 'A casi todos les gusta que les regalen pan. Llevas ' + tiene('pan'), btn('6 🪙', () => comprar(6, () => { dar('pan'); SITIOS.pan(); }), { cls: 'sm' })))); },
    puesto() { const l = Object.keys(S.inv).filter(k => D.COSAS[k] && D.COSAS[k].v > 0); panel('⛺ El puesto de Lola · ella te lo compra', l.length ? h('div', l.map(k => fila(D.COSAS[k].e, D.COSAS[k].n + ' ×' + tiene(k), D.COSAS[k].v + ' 🪙 cada una', h('span.row', { style: { gap: '4px' } }, btn('Vender 1', () => { quitar(k); monedas(D.COSAS[k].v); S.pasos.vendido++; SITIOS.puesto(); }, { cls: 'sm' }), tiene(k) > 1 ? btn('Todo', () => { const n = tiene(k); quitar(k, n); monedas(D.COSAS[k].v * n); S.pasos.vendido++; SITIOS.puesto(); }, { cls: 'sm ghost' }) : null)))) : h('p.muted', 'No llevas nada que vender. Recoge flores, conchas o setas, pesca o cultiva.')); },
    taller() { const i = S.imp, falta = i ? i.t - Date.now() : 0;
      if (i && falta <= 0) { S.imp = null; S.pasos.impreso++; dar(i.k); return dlg('👨‍🔧', 'Taller 3D', '¡Impresión terminada! Ha salido perfecto: ' + D.COSAS[i.k].e + ' ' + D.COSAS[i.k].n + '.', [['¡Qué bonito!', cierra, 'primary']]); }
      panel('🏭 Taller 3D de Íker', i ? h('div', h('p', '🖨️ Imprimiendo ' + D.COSAS[i.k].e + ' ' + D.COSAS[i.k].n + '… faltan ' + Math.ceil(falta / 1000) + ' s.'), h('p.muted', 'Date un paseo y vuelve a recogerlo.')) : h('div', h('p.muted', 'Llevas ' + tiene('filamento') + ' 🧵. Las bobinas se compran en la tienda de Paco.'),
        Object.keys(D.FIGURAS).map(k => { const f = D.FIGURAS[k], ok = tiene('filamento') >= f.bobinas && (!f.mas || tiene(f.mas)); return fila(D.COSAS[k].e, D.COSAS[k].n, f.bobinas + ' 🧵' + (f.mas ? ' + 1 ' + D.COSAS[f.mas].e : '') + ' · ' + Math.round(f.ms / 60000 * 10) / 10 + ' min · vale ' + D.COSAS[k].v + ' 🪙', btn('Imprimir', () => { if (!ok) return toast('Te falta material para esta figura.', 'warn'); quitar('filamento', f.bobinas); if (f.mas) quitar(f.mas); S.imp = { k, t: Date.now() + f.ms }; cambia(); SITIOS.taller(); }, { cls: 'sm' + (ok ? ' primary' : '') })); }))); },
    casa() { panel('🏡 Tu casa · el armario', h('div', h('div.vl-sec', 'Tu cara'), h('div.vl-caras', D.CARAS.map(c => h('button.vl-cara' + (S.cara === c ? '.on' : ''), { type: 'button', onclick: () => { S.cara = c; cambia(); SITIOS.casa(); } }, c))),
      h('div.vl-sec', 'Sombrero'), h('div.vl-caras', [['', '🚫']].concat(S.sombreros.map(k => [k, D.SOMBREROS[k].e])).map(([k, e]) => h('button.vl-cara' + (S.sombrero === k ? '.on' : ''), { type: 'button', onclick: () => { S.sombrero = k; cambia(); SITIOS.casa(); } }, e))), S.sombreros.length ? null : h('p.muted.tiny', 'Los sombreros se compran en la tienda de Paco.'))); },
    ayto() { album(); },
    cabana() { const peces = Object.keys(D.COSAS).filter(k => D.COSAS[k].t === 'pez' || k === 'diamante'); panel('🛖 Cabaña de Marina · lo que se pesca', h('div', peces.map(k => fila(S.album[k] ? D.COSAS[k].e : '❔', S.album[k] ? D.COSAS[k].n : '???', k === 'pulpo' ? 'Solo de noche' : k === 'diamante' ? 'Rarísimo' : 'De día y de noche')), h('p.muted.tiny', 'Ponte junto al agua (lago, mar o muelle) y pulsa Espacio.'))); },
    faro() { mapaVilla(); },
    tablon() { tablon(); },
    banco() { texto('😌 Qué bien se está aquí'); },
    tesoro() { if (S.tesoro === dia()) return texto('Hoy ya no brilla nada. Mañana, más.'); S.tesoro = dia(); const r = Math.random(); if (r < 0.12) { dar('diamante'); toast('💎 ¡Un diamante enterrado en la isla!', 'ok'); } else if (r < 0.4) dar('coral'); else monedas(15 + Math.floor(Math.random() * 30)); cambia(); }
  };
  function album() { const grupos = [['Flores', 'flor'], ['Playa', 'playa'], ['Bosque', 'bosque'], ['Peces', 'pez'], ['Huerto', 'cultivo'], ['De la tienda', 'compra'], ['Impreso en 3D', 'figura'], ['Tesoros', 'raro']];
    panel('📖 Álbum de la villa · ' + albumHecho() + ' de ' + albumTotal(), h('div', grupos.map(([t, g]) => h('div', h('div.vl-sec', t), h('div.vl-album', Object.keys(D.COSAS).filter(k => D.COSAS[k].t === g).map(k => h('span.vl-cromo' + (S.album[k] ? '.on' : ''), { title: S.album[k] ? D.COSAS[k].n : '???' }, S.album[k] ? D.COSAS[k].e : '❔'))))),
      h('div.vl-sec', 'Vecinos'), D.VECINOS.map(v => fila(v.e, v.n + ' · ' + v.of, '❤️'.repeat(corazones(v.k)) + '🤍'.repeat(5 - corazones(v.k)) + (S.don[v.k] === 2 ? ' · 💛 amigo del alma' : S.hab[v.k] == null ? ' · aún no os conocéis' : ''))),
      fila('🐈', 'Mochi, el gato', S.album.gato ? 'Ya te conoce' : 'Acarícialo cuando lo veas'))); }
  function mochila() { const l = Object.keys(S.inv); panel('🎒 Mochila · ' + S.monedas + ' 🪙', l.length ? h('div', l.map(k => k.startsWith('s_') ? fila('🌱', 'Semilla de ' + D.COSAS[k.slice(2)].n.toLowerCase() + ' ×' + tiene(k), 'Plántala en el huerto') : fila(D.COSAS[k].e, D.COSAS[k].n + ' ×' + tiene(k), k === 'paquete' ? 'Llévalo a su destinatario' : 'Lola te da ' + D.COSAS[k].v + ' 🪙'))) : h('p.muted', 'Vacía. Sal a pasear: la villa está llena de cosas.')); }
  function mapaVilla() { const c = h('canvas.vl-mapa', { width: W * 8, height: H * 8 }), g = c.getContext('2d'), COL = { '.': '#86c96f', ',': '#e6d3a3', P: '#d8d3cb', ':': '#f3e3ad', '~': '#4fb3e6', '=': '#b88a57', f: '#7a5236', t: '#2f7d47', T: '#3c9a52', R: '#9ca3af', '*': '#60a5fa' };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = COL[MAPA[y][x]]; g.fillRect(x * 8, y * 8, 8, 8); }
    g.font = '14px ' + FE; g.textAlign = 'center'; g.textBaseline = 'middle'; D.EDIFICIOS.forEach(b => g.fillText(b.casa || b.e, b.x * 8 + 8, b.y * 8 + 8)); NP.filter(n => !n.oculto).forEach(n => g.fillText(n.v.e, n.x * 8, n.y * 8)); otros.forEach(o => g.fillText('🟢', o.x * 8, o.y * 8)); g.fillText('📍', P.x * 8, P.y * 8 - 4);
    panel('🗼 Desde lo alto del faro se ve toda la villa', h('div', c, h('p.muted.tiny', '📍 tú · 🟢 tus compañeros · los vecinos, donde están ahora mismo. De noche duermen casi todos.'))); }
  async function tablon() { const caja = h('div', h('p.muted', 'Leyendo el tablón…')), campo = inp({ maxlength: 90, placeholder: 'Deja una nota para el equipo…', 'aria-label': 'Nota para el tablón' });
    const pinta = notas => pon(caja, notas.length ? notas.map(n => fila('📌', n.t, n.n + ' · ' + new Date(n.f).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))) : h('p.muted', 'Nadie ha dejado nada todavía. ¡Estrena el tablón!'));
    panel('📋 Tablón de la plaza', h('div', h('div.row', { style: { gap: '6px', marginBottom: '8px' } }, campo, btn('Colgar', async () => { if (!campo.value.trim()) return; try { pinta((await llamar('mundo.nota', { texto: campo.value })).notas); campo.value = ''; } catch (e) { } }, { cls: 'sm primary' })), caja));
    try { pinta((await llamar('mundo.tablon', {}, { silencio: true })).notas); } catch (e) { pon(caja, h('p.muted', 'Sin conexión: el tablón se lee cuando vuelva Internet.')); } }
  function huerto(i) { const b = S.huerto[i];
    if (b) { if (Date.now() < b.t) return texto('🌱 Le faltan ' + Math.ceil((b.t - Date.now()) / 1000) + ' s'); S.huerto[i] = null; dar(b.k, 2); return; }
    const l = Object.keys(D.SEMILLAS).filter(k => tiene('s_' + k)); if (!l.length) return texto('Necesitas semillas (tienda 🏪)');
    dlg('🌱', 'Bancal libre', '¿Qué plantas aquí?', l.map(k => [D.COSAS[k].e + ' ' + D.COSAS[k].n + ' (' + Math.round(D.SEMILLAS[k].ms / 60000) + ' min)', () => { quitar('s_' + k); S.huerto[i] = { k, t: Date.now() + D.SEMILLAS[k].ms }; S.pasos.plantado++; cambia(); cierra(); texto('🌱 Plantado'); }]).concat([['Nada', cierra]])); }
  function pescar() { const ancho = S.cana ? 0.3 : 0.17, z0 = 0.1 + Math.random() * (0.8 - ancho); let p = Math.random(), dir = 1, t0 = performance.now(); const vel = 0.75 + Math.random() * 0.55;
    const marca = h('i.vl-pm'), zona = h('span.vl-pz'); zona.style.left = z0 * 100 + '%'; zona.style.width = ancho * 100 + '%';
    const tirar = () => { if (G.pesca !== ctl) return; G.pesca = null; const d = Math.abs(p - (z0 + ancho / 2)) / (ancho / 2);
      if (d > 1) return dlg('🎣', 'Pesca', 'Se ha escapado… Espera a que la marca esté en lo verde.', [['🎣 Otra vez', pescar, 'primary'], ['Dejarlo', cierra]]);
      const cal = 1 - d, tabla = (esNoche() ? D.PESCA.noche : D.PESCA.dia).map(([k, w]) => [k, w * (D.COSAS[k].v > 20 ? 0.3 + cal * 2.2 : k === 'bota' ? 1.6 - cal * 1.5 : 1)]), k = elige(tabla, Math.random());
      S.pasos.pescado++; dar(k); dlg('🎣', cal > 0.75 ? '¡En todo el centro!' : '¡Ha picado!', 'Has pescado: ' + D.COSAS[k].e + ' ' + D.COSAS[k].n + (k === 'bota' ? '. En fin…' : k === 'diamante' ? '. ¡¡UN DIAMANTE!!' : '.'), [['🎣 Otra vez', pescar, 'primary'], ['Guardar la caña', cierra]]); if (k === 'diamante') fiesta(raiz); };
    const ctl = { tirar, get p() { return p; }, set p(v) { p = v; }, z0, ancho, paso() { const t = performance.now(), dt = (t - t0) / 1000; t0 = t; p += dir * vel * dt; if (p > 1) { p = 1; dir = -1; } if (p < 0) { p = 0; dir = 1; } marca.style.left = p * 100 + '%'; } };
    dlg('🎣', esNoche() ? 'Pesca de noche' : 'Pesca', 'Pulsa «¡Tirar!» (o Espacio) cuando la marca esté en lo verde. Cuanto más al centro, mejor pez.', [['🎣 ¡Tirar!', tirar, 'primary vl-tirar'], ['Dejarlo', cierra]]);
    capa.querySelector('.vl-dlg-t p').after(h('div.vl-pbar', zona, marca)); G.pesca = ctl; }
  function bienvenida() { dlg('🏘️', 'Te damos la bienvenida a Villa Celebri', 'Elige tu cara para empezar. Luego paséate: toca donde quieras ir (o usa las flechas) y toca a los vecinos para hablar con ellos.',
    D.CARAS.map(c => [c, () => { S.cara = c; cambia(); cierra(); toast('🏘️ ¡Ya vives en la villa! Sigue la pista de arriba para dar los primeros pasos.', 'ok', 6000); latido(); }])); capa.querySelector('.vl-ops').classList.add('vl-caras'); }

  // ---------- qué tengo al lado · actuar ----------
  function alLado() {
    let m = null, md = 1.25; NP.forEach(n => { if (n.oculto) return; const d = Math.hypot(n.x - P.x, n.y - P.y); if (d < md) { md = d; m = { t: 'Hablar con ' + n.v.n, f: () => hablar(n) }; } });
    if (m) return m;
    if (Math.hypot(gato.x - P.x, gato.y - P.y) < 1.2) return { t: tiene('sardina') && !gato.sigue ? 'Darle una sardina a Mochi' : 'Acariciar a Mochi', f: () => { if (tiene('sardina') && !gato.sigue) { quitar('sardina'); gato.sigue = true; texto('😻 ¡Te sigue!', gato.x, gato.y - 0.8); } else texto('💕 Prrr…', gato.x, gato.y - 0.8); if (S.gato !== dia()) { S.gato = dia(); S.album.gato = 1; cambia(); } } };
    for (const b of D.EDIFICIOS) if (P.x > b.x - 1 && P.x < b.x + 3 && P.y > b.y - 1 && P.y < b.y + 3.2) return { t: 'Entrar: ' + b.n, f: SITIOS[b.k] };
    for (const o of D.OBJETOS) if (Math.hypot(o.x + 0.5 - P.x, o.y + 0.5 - P.y) < 1.4) return { t: o.n, f: SITIOS[o.k] };
    const tx = Math.floor(P.x), ty = Math.floor(P.y);
    for (const [i, j] of [[0, 0]].concat(DIRS)) if ((MAPA[ty + j] || [])[tx + i] === 'f') { const n = (ty + j - 16) * 4 + (tx + i - 29), b = S.huerto[n]; return { t: b ? (Date.now() >= b.t ? 'Cosechar ' + D.COSAS[b.k].e : 'Creciendo…') : 'Plantar aquí', f: () => huerto(n) }; }
    for (const [i, j] of DIRS.concat([[1, 1], [-1, 1], [1, -1], [-1, -1]])) if ((MAPA[ty + j] || [])[tx + i] === '~') return { t: '🎣 Pescar', f: pescar };
    return null;
  }
  function actuar() { if (modo === 'dlg' && G.pesca) return G.pesca.tirar(); if (modo !== 'juego') return; const a = alLado(); if (a) a.f(); }
  function recoge() { quedan().forEach(b => { if (Math.hypot(b.x + 0.5 - P.x, b.y + 0.5 - P.y) < 0.75) { S.cog.ids.push(b.id); S.pasos.recogido++; dar(b.k); } }); }

  // ---------- mover ----------
  function mueve(dt) {
    if (modo !== 'juego') return;
    let dx = (teclas.has('ArrowRight') || teclas.has('d') ? 1 : 0) - (teclas.has('ArrowLeft') || teclas.has('a') ? 1 : 0), dy = (teclas.has('ArrowDown') || teclas.has('s') ? 1 : 0) - (teclas.has('ArrowUp') || teclas.has('w') ? 1 : 0);
    if (dx || dy) { P.ruta = []; P.meta = null; const m = Math.hypot(dx, dy), v = 4.4 * dt, r = 0.27, pasa = (x, y) => libre(Math.floor(x - r), Math.floor(y - r)) && libre(Math.floor(x + r), Math.floor(y - r)) && libre(Math.floor(x - r), Math.floor(y + r)) && libre(Math.floor(x + r), Math.floor(y + r));
      const nx = P.x + dx / m * v, ny = P.y + dy / m * v; if (pasa(nx, P.y)) P.x = nx; if (pasa(P.x, ny)) P.y = ny; P.anda += dt; }
    else if (sigue(P, 4.4, dt)) P.anda += dt; else { P.anda = 0; if (P.meta) { const f = P.meta; P.meta = null; f(); } }
    recoge();
  }
  function toca(ev) { if (modo !== 'juego') return; const b = cv.getBoundingClientRect(), wx = (ev.clientX - b.left + cam.x) / TS, wy = (ev.clientY - b.top + cam.y) / TS;
    const n = NP.find(n => !n.oculto && Math.hypot(n.x - wx, n.y - 0.3 - wy) < 0.8); P.meta = null;
    if (n) { if (Math.hypot(n.x - P.x, n.y - P.y) < 1.5) return hablar(n); P.ruta = bfs(P.x, P.y, n.x + (P.x < n.x ? -1 : 1), n.y); P.meta = () => { if (Math.hypot(n.x - P.x, n.y - P.y) < 2.2) hablar(n); }; return; }
    P.ruta = bfs(P.x, P.y, wx, wy); const tx = Math.floor(wx), ty = Math.floor(wy), c = (MAPA[ty] || [])[tx];
    if (c === '~' || c === 'f' || bloque.has(tx + ',' + ty)) P.meta = () => { const a = alLado(); if (a) a.f(); };
    if (!P.ruta.length && P.meta) { const f = P.meta; P.meta = null; f(); } }

  // ---------- compañeros (online) ----------
  let tLat = 0, enLinea = false;
  async function latido(salir) { tLat = Date.now(); if (!S.cara && !salir) return;
    try { const r = await llamar('mundo.latido', salir ? { salir: true } : { x: P.x, y: P.y, cara: S.cara + (S.sombrero ? '|' + D.SOMBREROS[S.sombrero].e : ''), dice: G.dice && G.dice.hasta > Date.now() ? G.dice.t : '' }, { silencio: true, timeout: 10000 });
      if (!vivo) return; enLinea = true; if (Math.abs(r.ahora - Date.now() - offset) > 4000) offset = r.ahora - Date.now();
      const vistos = new Set(); r.otros.forEach(o => { vistos.add(o.id); const a = otros.get(o.id); const [cara, gorro] = String(o.c || '🧑').split('|'); if (a) Object.assign(a, { tx: o.x, ty: o.y, n: o.n, cara, gorro, d: o.d }); else { otros.set(o.id, { x: o.x, y: o.y, tx: o.x, ty: o.y, n: o.n, cara, gorro, d: o.d }); toast('🟢 ' + o.n + ' ha entrado en la villa', 'ok', 3000); } });
      otros.forEach((v, k) => { if (!vistos.has(k)) otros.delete(k); }); pintaHud();
    } catch (e) { enLinea = false; } }
  function decir(t) { G.dice = { t, hasta: Date.now() + 6000 }; latido(); }

  // ---------- HUD ----------
  function pintaHud() { const hh = hora(), hm = String(Math.floor(hh)).padStart(2, '0') + ':' + String(Math.floor(hh % 1 * 6) * 10).padStart(2, '0');
    pon(hud, h('span.vl-chip', { title: 'Monedas' }, '🪙 ', h('b.vl-monedas', String(S.monedas))), h('span.vl-chip', { title: 'Hora de la villa (1 día = 10 minutos)' }, (esNoche() ? '🌙 ' : '☀️ ') + hm), h('span.vl-chip.vl-online', { title: enLinea ? 'Compañeros en la villa ahora' : 'Sin conexión: juegas solo' }, (enLinea ? '🟢 ' : '⚪ ') + (otros.size ? otros.size + ' aquí' : 'Solo tú')), h('span.grow'),
      btn('🎒', mochila, { cls: 'sm vl-b', title: 'Mochila' }), btn('📖', album, { cls: 'sm vl-b', title: 'Álbum' }), btn('🗺️', mapaVilla, { cls: 'sm vl-b', title: 'Mapa' }),
      btn('💬', () => dlg(S.cara || '🧑', 'Decir algo', 'Lo ven tus compañeros que estén ahora en la villa.', D.FRASES.map(f => [f, () => { decir(f); cierra(); }]).concat([['Nada', cierra]])), { cls: 'sm vl-b', title: 'Saludar a tus compañeros' }));
    const paso = D.GUIA.find(g => !g.ok(G)); guia.textContent = paso ? '👉 ' + paso.t : '🌟 Ya conoces la villa. Haz amigos, completa el álbum (' + albumHecho() + '/' + albumTotal() + ') y disfruta.'; }

  // ---------- dibujar ----------
  const SP = new Map(), cam = { x: 0, y: 0 };
  function sprite(e, px) { px = Math.round(px); const k = e + px; let c = SP.get(k); if (!c) { c = document.createElement('canvas'); const d = Math.ceil(px * 1.5); c.width = c.height = d * DPR; const g = c.getContext('2d'); g.scale(DPR, DPR); g.font = px + 'px ' + FE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, d / 2, d / 2 + px * 0.06); c._d = d; SP.set(k, c); } return c; }
  const em = (e, x, y, px) => { const c = sprite(e, px); X.drawImage(c, x - c._d / 2, y - c._d / 2, c._d, c._d); };
  const sombra = (x, y, r) => { X.fillStyle = 'rgba(0,0,0,.18)'; X.beginPath(); X.ellipse(x, y, r, r * 0.4, 0, 0, 7); X.fill(); };
  function etiqueta(t, x, y, fondo, color) { X.font = '600 11px system-ui, sans-serif'; const w = X.measureText(t).width + 10; X.fillStyle = fondo; X.beginPath(); X.roundRect(x - w / 2, y, w, 16, 8); X.fill(); X.fillStyle = color; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(t, x, y + 8.5); }
  function bocadillo(t, x, y) { X.font = '600 13px system-ui, ' + FE; const w = X.measureText(t).width + 16; X.fillStyle = '#fff'; X.strokeStyle = 'rgba(0,0,0,.25)'; X.beginPath(); X.roundRect(x - w / 2, y - 24, w, 24, 10); X.fill(); X.stroke(); X.fillStyle = '#1f2937'; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(t, x, y - 11.5); }
  function persona(cara, gorro, x, y, anda, nombre, extra) { const bote = anda ? Math.abs(Math.sin(anda * 11)) * 4 : Math.sin(performance.now() / 600 + x) * 1; sombra(x, y, 13); em(cara, x, y - 17 - bote, 34); if (gorro) em(gorro, x, y - 41 - bote, 20); if (nombre) etiqueta(nombre, x, y + 3, extra || 'rgba(17,24,39,.72)', '#fff'); }
  function pinta(t) {
    const cw = cv.clientWidth, ch = cv.clientHeight; if (cv.width !== Math.round(cw * DPR) || cv.height !== Math.round(ch * DPR)) { cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR); }
    X.setTransform(DPR, 0, 0, DPR, 0, 0); cam.x = cl(P.x * TS - cw / 2, 0, Math.max(0, W * TS - cw)); cam.y = cl(P.y * TS - ch / 2, 0, Math.max(0, H * TS - ch)); X.translate(-Math.round(cam.x), -Math.round(cam.y));
    const x0 = Math.max(0, Math.floor(cam.x / TS)), x1 = Math.min(W - 1, Math.ceil((cam.x + cw) / TS)), y0 = Math.max(0, Math.floor(cam.y / TS)), y1 = Math.min(H - 1, Math.ceil((cam.y + ch) / TS) + 1), ents = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = MAPA[y][x], px = x * TS, py = y * TS, k = hsh(x, y);
      if (c === '~') { X.fillStyle = k % 2 ? '#4fb3e6' : '#56b9ea'; X.fillRect(px, py, TS, TS); X.strokeStyle = 'rgba(255,255,255,.35)'; X.lineWidth = 2; const o = (t / 700 + k) % 6.28; X.beginPath(); X.moveTo(px + 8 + Math.sin(o) * 4, py + 14 + (k % 12)); X.lineTo(px + 22 + Math.sin(o) * 4, py + 14 + (k % 12)); X.stroke(); }
      else if (c === ',') { X.fillStyle = k % 3 ? '#e6d3a3' : '#e0cb97'; X.fillRect(px, py, TS, TS); }
      else if (c === 'P' || c === '*') { X.fillStyle = (x + y) % 2 ? '#dcd7cf' : '#d2ccc3'; X.fillRect(px, py, TS, TS); }
      else if (c === ':') { X.fillStyle = k % 3 ? '#f3e3ad' : '#efdca0'; X.fillRect(px, py, TS, TS); }
      else if (c === '=') { X.fillStyle = '#4fb3e6'; X.fillRect(px, py, TS, TS); X.fillStyle = '#b88a57'; X.fillRect(px + 3, py, TS - 6, TS); X.fillStyle = '#9a6f41'; for (let i = 0; i < 4; i++) X.fillRect(px + 3, py + i * 11, TS - 6, 2); }
      else if (c === 'f') { X.fillStyle = '#7a5236'; X.fillRect(px, py, TS, TS); X.fillStyle = '#69452c'; for (let i = 0; i < 3; i++) X.fillRect(px + 4, py + 8 + i * 13, TS - 8, 3); const b = S.huerto[(y - 16) * 4 + (x - 29)]; if (b) ents.push({ y: py + TS - 6, f: () => { const ok = Date.now() >= b.t; em(ok ? D.COSAS[b.k].e : '🌱', px + TS / 2, py + TS / 2 - (ok ? Math.abs(Math.sin(t / 300)) * 3 : 0), ok ? 30 : 22); } }); }
      else { X.fillStyle = ['#86c96f', '#7fc468', '#8bcd74'][k % 3]; X.fillRect(px, py, TS, TS); if (k % 11 === 0 && c === '.') { X.fillStyle = '#6fb559'; X.fillRect(px + 10 + k % 20, py + 12 + k % 18, 3, 6); X.fillRect(px + 15 + k % 20, py + 14 + k % 18, 3, 5); } }
      if (c === 'T' || c === 't') ents.push({ y: py + TS, f: () => { sombra(px + TS / 2, py + TS - 5, 16); em(c === 'T' ? '🌳' : '🌲', px + TS / 2, py + 8, 52); } });
      else if (c === 'R') ents.push({ y: py + TS, f: () => em('🪨', px + TS / 2, py + TS / 2, 34) });
      else if (c === '*') ents.push({ y: py + TS, f: () => em('⛲', px + TS / 2, py + 12, 58) }); }
    D.EDIFICIOS.forEach(b => ents.push({ y: (b.y + 2) * TS, f: () => { const x = (b.x + 1) * TS, y = (b.y + 2) * TS; sombra(x, y - 6, 40); em(b.casa || b.e, x, y - 46, 84); if (b.casa) em(b.e, x + 26, y - 78, 26); if (b.k === 'taller' && S.imp) em(Date.now() >= S.imp.t ? '✅' : '⏳', x, y - 96, 22); } }));
    D.OBJETOS.forEach(o => { if (o.k === 'tesoro' && S.tesoro === dia()) return; ents.push({ y: (o.y + 1) * TS, f: () => em(o.e, (o.x + 0.5) * TS, (o.y + 0.5) * TS - (o.k === 'tesoro' ? Math.sin(t / 250) * 3 : 4), o.k === 'tablon' ? 38 : 28) }); });
    quedan().forEach(b => ents.push({ y: (b.y + 1) * TS - 8, f: () => em(D.COSAS[b.k].e, (b.x + 0.5) * TS, (b.y + 0.5) * TS + Math.sin(t / 400 + b.x) * 2, 24) }));
    NP.forEach(n => { if (!n.oculto) ents.push({ y: n.y * TS + 12, f: () => persona(n.v.e, '', n.x * TS, n.y * TS + 12, n.anda, n.v.n + (corazones(n.v.k) ? ' ' + '♥'.repeat(corazones(n.v.k)) : '')) }); });
    ents.push({ y: gato.y * TS + 10, f: () => { sombra(gato.x * TS, gato.y * TS + 10, 9); em('🐈', gato.x * TS, gato.y * TS - 2, 24); } });
    otros.forEach(o => { o.x += (o.tx - o.x) * 0.06; o.y += (o.ty - o.y) * 0.06; ents.push({ y: o.y * TS + 12, f: () => { persona(o.cara, o.gorro, o.x * TS, o.y * TS + 12, Math.hypot(o.tx - o.x, o.ty - o.y) > 0.15 ? t / 1000 : 0, '🟢 ' + o.n, 'rgba(22,101,52,.85)'); if (o.d) bocadillo(o.d, o.x * TS, o.y * TS - 50); } }); });
    ents.push({ y: P.y * TS + 12, f: () => { persona(S.cara || '🧑', S.sombrero ? D.SOMBREROS[S.sombrero].e : '', P.x * TS, P.y * TS + 12, P.anda, '', ''); if (G.dice && G.dice.hasta > Date.now()) bocadillo(G.dice.t, P.x * TS, P.y * TS - 50); } });
    ents.sort((a, b) => a.y - b.y).forEach(e => e.f());
    if (P.ruta.length) { const [mx, my] = P.ruta[P.ruta.length - 1]; X.strokeStyle = 'rgba(255,255,255,.8)'; X.lineWidth = 2; X.beginPath(); X.arc(mx * TS, my * TS, 7 + Math.sin(t / 150) * 2, 0, 7); X.stroke(); }
    // noche: se oscurece, se encienden las casas y gira la luz del faro
    const hh = hora(), osc = hh >= 21 || hh < 5 ? 0.5 : hh >= 19 ? (hh - 19) / 2 * 0.5 : hh < 7 ? (7 - hh) / 2 * 0.5 : 0;
    if (osc > 0) { X.fillStyle = 'rgba(18,22,68,' + osc + ')'; X.fillRect(cam.x, cam.y, cw, ch); X.globalCompositeOperation = 'lighter';
      const luz = (x, y, r, a) => { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,214,120,' + a + ')'); g.addColorStop(1, 'rgba(255,214,120,0)'); X.fillStyle = g; X.fillRect(x - r, y - r, r * 2, r * 2); };
      D.EDIFICIOS.forEach(b => luz((b.x + 1) * TS, (b.y + 1.3) * TS, 95, osc * 0.8)); luz(P.x * TS, P.y * TS, 80, osc * 0.5);
      const f = D.EDIFICIOS.find(b => b.k === 'faro'), a = t / 1400; X.fillStyle = 'rgba(255,240,170,' + osc * 0.35 + ')'; X.beginPath(); X.moveTo((f.x + 1) * TS, (f.y + 0.4) * TS); X.arc((f.x + 1) * TS, (f.y + 0.4) * TS, 420, a, a + 0.28); X.fill(); X.globalCompositeOperation = 'source-over'; }
    else for (let i = 0; i < 4; i++) em('🦋', (10 + i * 9 + Math.sin(t / 1300 + i * 2) * 3) * TS, (8 + i * 3 + Math.cos(t / 1700 + i) * 2.5) * TS, 16);
    for (let i = flota.length - 1; i >= 0; i--) { const f = flota[i], u = (performance.now() - f.t0) / 1400; if (u >= 1) { flota.splice(i, 1); continue; } X.globalAlpha = 1 - u * u; X.font = '700 15px system-ui, ' + FE; X.textAlign = 'center'; X.lineWidth = 3; X.strokeStyle = 'rgba(0,0,0,.55)'; X.strokeText(f.t, f.x * TS, f.y * TS - u * 34); X.fillStyle = f.c; X.fillText(f.t, f.x * TS, f.y * TS - u * 34); X.globalAlpha = 1; }
  }

  // ---------- el bucle ----------
  let tAnt = performance.now(), tHud = 0;
  function bucle(t) { if (!vivo) return; raf = requestAnimationFrame(bucle); const dt = Math.min(0.05, (t - tAnt) / 1000); tAnt = t;
    mueve(dt); mueveVecinos(dt); mueveGato(dt); if (G.pesca) G.pesca.paso(); pinta(t);
    const a = modo === 'juego' ? alLado() : null; pista.hidden = !a; if (a && pista.textContent !== a.t) pista.textContent = a.t;
    if (t - tHud > 5000) { tHud = t; pintaHud(); }
    if (document.visibilityState === 'visible' && Date.now() - tLat > 5000) latido();
    if (sucio && Date.now() - tGuardado > 90000) subir(); }
  const tecla = ev => { if (/INPUT|TEXTAREA|SELECT/.test((ev.target && ev.target.tagName) || '')) return; const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === ' ' || k === 'e' || k === 'Enter') { if (ev.type === 'keydown' && !ev.repeat && (modo === 'juego' || G.pesca)) { ev.preventDefault(); actuar(); } return; }
    if (k === 'Escape' && modo !== 'juego' && S.cara) return cierra();
    if (!/^(Arrow(Up|Down|Left|Right)|[wasd])$/.test(k)) return; if (modo === 'juego') ev.preventDefault(); if (ev.type === 'keydown') teclas.add(k); else teclas.delete(k); };
  window.addEventListener('keydown', tecla); window.addEventListener('keyup', tecla); cv.addEventListener('pointerdown', toca);
  window.__villa = { G, P, NP, gato, otros, libre, bfs, brotes, quedan, actuar, alLado, hablar, dar, SITIOS, hora, mapa: MAPA, tp: (x, y) => { P.x = x; P.y = y; P.ruta = []; }, aLas: hh => { desfase += ((hh - hora() + 24) % 24) / 24 * D.DIA_MS; pintaHud(); }, modo: () => modo, cierra, latido, decir, subir };
  carga().then(() => { if (vivo) { raf = requestAnimationFrame(bucle); latido(); } });
  return { destroy() { vivo = false; cancelAnimationFrame(raf); R.fin(); window.removeEventListener('keydown', tecla); window.removeEventListener('keyup', tecla); if (S.cara) { cambia(); subir(true); latido(true); } delete window.__villa; } };
}
