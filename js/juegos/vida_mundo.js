// ================= v13.9 · VIDA · EL BARRIO 🗺️ → v13.12 · EL BARRIO EN PIXEL =================
// Un mundo pequeño para pasear con tu personaje (vista desde arriba, estilo Pokémon / Animal Crossing): todo en pixel art
// (ver vida_pixel.js): cada edificio con lo que es, el huerto junto a tu casa, el mercadillo de fichas en la plaza, árboles,
// flores, estanque con reflejos, día y noche según la hora real y los VECINOS (el equipo que juega a la vez).
// Mando nuevo: cruceta grande + botón A (entrar / usar) en el móvil; flechas o W A S D y Intro / E en el PC; o tocar el mapa.
// Arreglado que el personaje se quedara «pillado» andando: las teclas y los botones se sueltan solos al levantar el dedo
// aunque sea fuera del botón, al cambiar de ventana o si la pantalla se redibuja.
// Todo lo que cambia la partida lo decide el servidor (vida.accion); aquí solo se dibuja y se camina.
import { h, btn, toast } from '../ui.js';
import { llamar } from './kit.js';
import { avatar } from './vida_avatar.js';
import * as PXL from './vida_pixel.js';

const T = 48, MW = 40, MH = 30, PX = PXL.PX; // casillas de 48 px (16 píxeles × 3) · mapa de 40 × 30
const ROADS = [[0, 13, 40, 2], [18, 0, 2, 30], [0, 24, 18, 2], [26, 15, 2, 15]]; // x, y, ancho, alto (casillas)
const PLAZA = [15, 10, 8, 8];
const HUERTO = [3, 9, 6, 3]; // v13.12: el huerto, delante de tu casa
// Edificios: x, y, w, h en casillas; puerta en el centro de la fachada de abajo
const EDIF = [
  { id: 'casa', x: 3, y: 3, w: 6, h: 5, techo: '#ea580c' },
  { id: 'vip', x: 10, y: 2, w: 6, h: 6, techo: '#7c3aed', neon: true },
  { id: 'mercado', x: 22, y: 3, w: 7, h: 5, techo: '#15803d' },
  { id: 'cafe', x: 31, y: 3, w: 6, h: 5, techo: '#be185d' },
  { id: 'salud', x: 2, y: 17, w: 6, h: 5, techo: '#0284c7' },
  { id: 'tienda', x: 9, y: 17, w: 6, h: 5, techo: '#db2777' },
  { id: 'escuela', x: 21, y: 17, w: 4, h: 6, techo: '#6d28d9' },
  { id: 'gimnasio', x: 30, y: 17, w: 6, h: 5, techo: '#374151' }
];
const PARQUE = [29, 24, 11, 6], ESTANQUE = [33, 26, 4, 2];
const COFRE = { x: 19 * T, y: 13.2 * T };
const PUESTO = { x: 21.6 * T, y: 17.4 * T }; // mercadillo de fichas (en la plaza)

function rng(seed) { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const madrid = () => { const p = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()); const g = k => Number((p.find(x => x.type === k) || {}).value || 0); return g('hour') + g('minute') / 60; };
const dentro = (px, py, r) => px >= r[0] * T && px < (r[0] + r[2]) * T && py >= r[1] * T && py < (r[1] + r[3]) * T;
const puerta = b => ({ x: (b.x + b.w / 2) * T, y: (b.y + b.h) * T + 6 });

export function mundo(ctx) {
  const V = window.VIDA, L = id => V.LUGARES.find(l => l.id === id) || { t: id, i: '📍' };
  const cv = h('canvas.vm-cv', { 'aria-label': 'El barrio: muévete con las flechas, con la cruceta o tocando el mapa' });
  const mini = h('canvas.vm-mini', { width: 160, height: 120, 'aria-hidden': 'true' });
  const hud = h('div.vm-hud'), entrar = h('div.vm-entrar'), escena = h('div.vm-escena', { style: { display: 'none' } });
  const keys = {}; let meta = null;
  // ---------- mando: cruceta grande + botón A. Se suelta siempre (aunque el dedo salga del botón) ----------
  const soltar = () => { for (const k in keys) keys[k] = false; };
  const tecla = k => { const b = h('button.vm-k.' + k, { type: 'button', 'aria-label': { u: 'Arriba', d: 'Abajo', l: 'Izquierda', r: 'Derecha' }[k] }, { u: '▲', d: '▼', l: '◀', r: '▶' }[k]);
    b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { } soltar(); keys[k] = true; meta = null; b.classList.add('on'); });
    const fin = () => { keys[k] = false; b.classList.remove('on'); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, fin));
    b.addEventListener('contextmenu', e => e.preventDefault());
    return b; };
  const pad = h('div.vm-pad', tecla('u'), tecla('l'), h('span.vm-k0'), tecla('r'), tecla('d'));
  const botonA = h('button.vm-a', { type: 'button', 'aria-label': 'Entrar o usar', onclick: () => { if (cerca) abrir(cerca); else toast('Acércate a una puerta, al huerto o al cofre', 'info', 2000); } }, 'A');
  const saludos = h('div.vm-saludos', [['👋', '¡Hola!'], ['😄', '¿Qué tal?'], ['🎉', '¡Fiesta!'], ['❤️', '¡Te quiero, vecino!']].map(([e, t]) => h('button.chip', { type: 'button', onclick: () => saludar(e + ' ' + t) }, e)));
  const el = h('div.vm', { tabindex: 0 }, cv, mini, hud, entrar, h('div.vm-ctrl', pad, h('div.vm-der', saludos, botonA)), escena);
  const g = cv.getContext('2d'), gm = mini.getContext('2d');
  const yo = { x: 19 * T, y: 15.5 * T, dir: 'd', anda: false, fase: 0, bubble: null };
  let vivo = true, raf = 0, otros = [], ultEnvio = 0, enviando = false, cerca = null, monedas = [], cogiendo = new Set(), bichos = [];
  const base = PXL.mapaBase(MW, MH, { parque: PARQUE, calles: ROADS, plaza: PLAZA, huerto: HUERTO });
  // ---------- choques: edificios (menos su puerta), estanque y bordes ----------
  function libre(px, py) {
    if (px < 10 || py < 10 || px > MW * T - 10 || py > MH * T - 4) return false;
    for (const b of EDIF) if (px > b.x * T + 4 && px < (b.x + b.w) * T - 4 && py > b.y * T + 10 && py < (b.y + b.h) * T + 2) return false;
    if (dentro(px, py, ESTANQUE)) return false;
    if (Math.hypot(px - 19 * T, py - 11.5 * T) < 0.9 * T) return false; // fuente
    return true;
  }
  // monedas del día (las mismas para ti todo el día; el servidor solo deja coger 8)
  function prepararMonedas() {
    const s = ctx.estado(), hoy = new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10), r = rng(hoy + (ctx.me || '')), ya = s.recogidas && s.recogidas.dia === hoy ? s.recogidas.ids : [];
    monedas = [];
    for (let i = 0; i < V.MONEDAS_DIA; i++) { let x, y, n = 0; do { x = (1 + r() * (MW - 2)) * T; y = (1 + r() * (MH - 2)) * T; n++; } while ((!libre(x, y) || dentro(x, y, HUERTO)) && n < 50); if (!ya.includes(i)) monedas.push({ i, x, y }); }
  }
  for (let i = 0; i < 7; i++) bichos.push({ x: Math.random() * MW * T, y: Math.random() * MH * T, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.4, c: ['🦋', '🐦', '🐝', '🦋'][i % 4] });
  const fuera = (x, y) => ROADS.some(rd => dentro(x, y, [rd[0] - 0.5, rd[1] - 0.5, rd[2] + 1, rd[3] + 1])) || dentro(x, y, PLAZA) || dentro(x, y, [HUERTO[0] - 1, HUERTO[1] - 1, HUERTO[2] + 2, HUERTO[3] + 2]);
  const arboles = []; { const r = rng('arboles'); for (let i = 0; i < 70; i++) { const x = (r() * MW) * T, y = (r() * MH) * T; if (libre(x, y) && !fuera(x, y)) arboles.push({ x, y, v: Math.floor(r() * 3) }); } }
  const arbustos = []; { const r = rng('arbustos'); for (let i = 0; i < 40; i++) { const x = (r() * MW) * T, y = (r() * MH) * T; if (libre(x, y) && !fuera(x, y)) arbustos.push({ x, y }); } }
  const farolas = []; ROADS.forEach(rd => { for (let k = 0; k < Math.max(rd[2], rd[3]); k += 5) farolas.push(rd[2] > rd[3] ? { x: (rd[0] + k) * T, y: rd[1] * T - 6 } : { x: rd[0] * T - 6, y: (rd[1] + k) * T }); });
  const bancos = [{ x: 16 * T, y: 17.6 * T }, { x: 30.5 * T, y: 25.2 * T }, { x: 37 * T, y: 29 * T }];

  // ---------- bucle ----------
  let ult = performance.now();
  function paso(t) {
    if (!vivo) return;
    const dt = Math.min(50, t - ult); ult = t;
    if (el.isConnected) { mover(dt); pintar(t); } else soltar();
    raf = requestAnimationFrame(paso);
  }
  function mover(dt) {
    let dx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), dy = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
    if (!dx && !dy && meta) { const ex = meta.x - yo.x, ey = meta.y - yo.y, d = Math.hypot(ex, ey); if (d < 6) { meta = null; } else { dx = ex / d; dy = ey / d; } }
    const len = Math.hypot(dx, dy); yo.anda = len > 0;
    if (yo.anda) {
      const s = ctx.estado(), rap = (s.coche ? 0.26 : 0.2) * dt;
      dx /= len; dy /= len; yo.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'l' : 'r') : (dy < 0 ? 'u' : 'd');
      const nx = yo.x + dx * rap, ny = yo.y + dy * rap;
      if (libre(nx, yo.y)) yo.x = nx; else if (meta) meta = null;
      if (libre(yo.x, ny)) yo.y = ny; else if (meta) meta = null;
      yo.fase += dt / 90;
    }
    // ¿cerca de una puerta, del huerto, del cofre o del mercadillo?
    let c = null;
    for (const b of EDIF) { const p = puerta(b); if (Math.hypot(p.x - yo.x, p.y - yo.y) < 1.3 * T) c = b.id; }
    if (dentro(yo.x, yo.y, PARQUE)) c = 'parque';
    if (dentro(yo.x, yo.y, [HUERTO[0] - 0.4, HUERTO[1] - 0.4, HUERTO[2] + 0.8, HUERTO[3] + 0.8])) c = 'huerto';
    if (Math.hypot(COFRE.x - yo.x, COFRE.y - yo.y) < 1.2 * T) c = 'plaza';
    if (Math.hypot(PUESTO.x - yo.x, PUESTO.y + 0.5 * T - yo.y) < 1.3 * T) c = 'mercadillo';
    if (c !== cerca) { cerca = c; pintaEntrar(); }
    for (const m of monedas) if (!cogiendo.has(m.i) && Math.hypot(m.x - yo.x, m.y - yo.y) < 26) coger(m);
    bichos.forEach(b => { b.x += b.vx * dt * 0.06; b.y += b.vy * dt * 0.06; if (Math.random() < 0.01) { b.vx = (Math.random() - 0.5) * 0.6; b.vy = (Math.random() - 0.5) * 0.4; } if (b.x < 0 || b.x > MW * T) b.vx *= -1; if (b.y < 0 || b.y > MH * T) b.vy *= -1; });
    if (performance.now() - ultEnvio > 3000 && !enviando) red();
  }
  async function coger(m) {
    cogiendo.add(m.i);
    const r = await ctx.hacer('recoger', String(m.i), true);
    if (r) { monedas = monedas.filter(x => x.i !== m.i); destello(m.x, m.y, '+3 🪙'); }
  }
  const flotantes = [];
  function destello(x, y, txt) { flotantes.push({ x, y, txt, t: performance.now() }); }
  // ---------- vecinos en línea ----------
  async function red(saludo) {
    enviando = true; ultEnvio = performance.now();
    try {
      const r = await llamar('vida.mundo', { x: yo.x, y: yo.y, dir: yo.dir, anda: yo.anda, saludo: saludo || '' }, { silencio: true });
      const ant = new Map(otros.map(o => [o.id, o]));
      otros = (r.otros || []).map(o => { const p = ant.get(o.id); return Object.assign(o, { dx: p ? p.dx : o.x, dy: p ? p.dy : o.y }); });
    } catch (e) { }
    enviando = false; pintaHud();
  }
  function saludar(txt) { yo.bubble = { txt, t: performance.now() }; red(txt); }
  // ---------- pintar (pixel: sin difuminar) ----------
  const huertoVisual = () => { const s = ctx.estado(), hu = s.huerto || { n: 6, p: [] }; return hu; };
  function pintar(t) {
    const W = cv.clientWidth || 600, H = cv.clientHeight || 420, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = false;
    const cx = Math.max(0, Math.min(MW * T - W, yo.x - W / 2)), cy = Math.max(0, Math.min(MH * T - H, yo.y - H / 2));
    g.save(); g.translate(-Math.round(cx), -Math.round(cy));
    // suelo (solo la parte que se ve)
    const sx = Math.max(0, Math.floor(cx / PX)), sy = Math.max(0, Math.floor(cy / PX)), sw = Math.min(base.width - sx, Math.ceil(W / PX) + 2), sh = Math.min(base.height - sy, Math.ceil(H / PX) + 2);
    g.drawImage(base, sx, sy, sw, sh, sx * PX, sy * PX, sw * PX, sh * PX);
    PXL.agua(g, ESTANQUE[0] * T, ESTANQUE[1] * T, ESTANQUE[2] * T, ESTANQUE[3] * T, t);
    // fuente de la plaza
    g.fillStyle = '#94a3b8'; g.beginPath(); g.arc(19 * T, 11.5 * T, 0.9 * T, 0, Math.PI * 2); g.fill(); g.fillStyle = '#cbd5e1'; g.beginPath(); g.arc(19 * T, 11.5 * T, 0.78 * T, 0, Math.PI * 2); g.fill();
    PXL.agua(g, 19 * T - 0.66 * T, 11.5 * T - 0.66 * T, 1.32 * T, 1.32 * T, t);
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(Math.round((19 * T + Math.cos(t / 300 + k) * 10) / PX) * PX, Math.round((11.5 * T - 14 - Math.abs(Math.sin(t / 250 + k)) * 16) / PX) * PX, PX * 2, PX * 2); }
    // plantas del huerto (lo que tienes sembrado)
    const hu = huertoVisual(), ahora = ctx.ahora();
    for (let i = 0; i < (hu.n || 6); i++) {
      const col = i % 6, fila = Math.floor(i / 6), x = (HUERTO[0] + 0.5 + col) * T, y = (HUERTO[1] + 0.9 + fila * 1.25) * T, pl = (hu.p || [])[i];
      g.fillStyle = '#6b3f1d'; g.fillRect(x - 15, y - 6, 30, 12); g.fillStyle = '#5a3416'; g.fillRect(x - 15, y + 3, 30, 3);
      if (pl) { const se = V.buscar(V.SEMILLAS, pl.s), f = V.crece(pl, ahora).f; g.font = (f >= 1 ? 26 : f > 0.5 ? 20 : 15) + 'px serif'; g.textAlign = 'center'; g.fillText(f >= 1 ? se.i : f > 0.45 ? '🌿' : '🌱', x, y + 2 + (f >= 1 ? Math.sin(t / 300 + i) * 2 : 0)); if (f >= 1) { g.fillStyle = 'rgba(250,204,21,.9)'; g.fillRect(x + 10, y - 22, 6, 6); } if ((pl.agua || []).length) { g.fillStyle = 'rgba(96,165,250,.8)'; g.fillRect(x - 15, y + 6, 30, 2); } }
    }
    // lo que tiene altura se pinta de arriba abajo
    const cosas = [];
    EDIF.forEach(b => cosas.push({ y: (b.y + b.h) * T, f: () => edificio(b, t) }));
    arboles.forEach(a => cosas.push({ y: a.y, f: () => { const sp = PXL.arbol(a.v); g.drawImage(sp, a.x - sp.width * PX / 2, a.y - sp.height * PX + 6, sp.width * PX, sp.height * PX); } }));
    arbustos.forEach(a => cosas.push({ y: a.y, f: () => { const sp = PXL.arbusto(); g.drawImage(sp, a.x - sp.width * PX / 2, a.y - sp.height * PX, sp.width * PX, sp.height * PX); } }));
    farolas.forEach(f => cosas.push({ y: f.y, f: () => { const sp = PXL.farola(); g.drawImage(sp, f.x - sp.width * PX / 2, f.y - sp.height * PX, sp.width * PX, sp.height * PX); } }));
    bancos.forEach(b => cosas.push({ y: b.y, f: () => { const sp = PXL.banco(); g.drawImage(sp, b.x - sp.width * PX / 2, b.y - sp.height * PX, sp.width * PX, sp.height * PX); } }));
    cosas.push({ y: PUESTO.y, f: () => { const sp = PXL.puesto(); g.drawImage(sp, PUESTO.x - sp.width * PX / 2, PUESTO.y - sp.height * PX, sp.width * PX, sp.height * PX); cartel('🛍️ Mercadillo', PUESTO.x, PUESTO.y - sp.height * PX - 6, false, t); } });
    cosas.push({ y: COFRE.y, f: () => cofre(t) });
    monedas.forEach(m => cosas.push({ y: m.y, f: () => { const sp = PXL.moneda(Math.floor(t / 140 + m.i)); g.drawImage(sp, m.x - 12, m.y - 30 - Math.abs(Math.sin(t / 300 + m.i)) * 6, 24, 24); } }));
    otros.forEach(o => { o.dx += (o.x - o.dx) * 0.08; o.dy += (o.y - o.dy) * 0.08; cosas.push({ y: o.dy, f: () => persona(o.look, o.dx, o.dy, o.dir, o.anda, t, o.n + ' · ' + o.u, o.saludo && Date.now() - o.saludo.t < 6000 ? o.saludo.txt : '', false) }); });
    const s = ctx.estado();
    cosas.push({ y: yo.y, f: () => { if (s.mascota) { const mt = V.buscar(V.CAT.mascotas, s.mascota.tipo); g.font = '26px serif'; g.textAlign = 'center'; g.fillText(mt ? mt.i : '🐾', yo.x + (yo.dir === 'l' ? 34 : -34), yo.y - 2 + Math.sin(yo.fase * 2) * 2); } persona(s, yo.x, yo.y, yo.dir, yo.anda, t, s.nombre, yo.bubble && performance.now() - yo.bubble.t < 5000 ? yo.bubble.txt : '', true); } });
    cosas.sort((a, b) => a.y - b.y).forEach(c => c.f());
    // carteles de los sitios (siempre encima, para que se lean)
    EDIF.forEach(b => { const p = puerta(b); cartel(L(b.id).i + ' ' + L(b.id).t, p.x, b.y * T - 36, b.neon, t); });
    cartel('🌱 Tu huerto', (HUERTO[0] + HUERTO[2] / 2) * T, HUERTO[1] * T - 26, false, t);
    bichos.forEach(b => { g.font = '16px serif'; g.textAlign = 'center'; g.fillText(b.c, b.x, b.y + Math.sin(t / 200 + b.x) * 3); });
    if (meta) { g.strokeStyle = 'rgba(236,72,153,.85)'; g.lineWidth = PX; g.strokeRect(Math.round(meta.x / PX) * PX - 9, Math.round(meta.y / PX) * PX - 6, 18, 12); }
    flotantes.forEach(f => { const a = (performance.now() - f.t) / 1200; if (a < 1) { g.globalAlpha = 1 - a; g.fillStyle = '#b45309'; g.font = 'bold 18px system-ui'; g.textAlign = 'center'; g.fillText(f.txt, f.x, f.y - 30 - a * 30); g.globalAlpha = 1; } });
    // día y noche (hora real de Madrid)
    const hr = madrid(), noche = hr >= 21 || hr < 7 ? 0.45 : hr >= 19 ? (hr - 19) / 2 * 0.45 : hr < 8 ? (8 - hr) * 0.45 : 0;
    if (noche > 0) {
      g.fillStyle = 'rgba(20,24,72,' + noche + ')'; g.fillRect(cx - 4, cy - 4, W + 8, H + 8);
      g.globalCompositeOperation = 'lighter';
      farolas.concat([{ x: yo.x, y: yo.y - 30 }]).forEach(f => { if (f.x < cx - 100 || f.x > cx + W + 100 || f.y < cy - 100 || f.y > cy + H + 100) return; const gr = g.createRadialGradient(f.x, f.y - 70, 2, f.x, f.y - 40, 90); gr.addColorStop(0, 'rgba(255,214,120,' + noche * 0.85 + ')'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.fillRect(f.x - 90, f.y - 130, 180, 180); });
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
    minimapa();
  }
  function cartel(txt, x, y, neon, t) {
    g.font = 'bold 13px system-ui'; g.textAlign = 'center';
    const tw = g.measureText(txt).width + 16, bx = Math.round((x - tw / 2) / PX) * PX, by = Math.round((y - 12) / PX) * PX;
    g.fillStyle = neon ? '#0f0720' : '#7c4a2a'; g.fillRect(bx - PX, by - PX, tw + PX * 2, 22 + PX * 2);
    g.fillStyle = neon ? '#1e0b47' : '#fef3c7'; g.fillRect(bx, by, tw, 22);
    if (neon) { g.shadowColor = ['#f0abfc', '#67e8f9', '#fde047'][Math.floor(t / 600) % 3]; g.shadowBlur = 12; }
    g.fillStyle = neon ? '#fdf4ff' : '#422006'; g.fillText(txt, x, by + 16); g.shadowBlur = 0;
  }
  function edificio(b, t) {
    const sp = PXL.edificio(b), x = b.x * T - 4 * PX, y = b.y * T - 18 * PX;
    g.drawImage(sp, x, y, sp.width * PX, sp.height * PX);
    if (b.id === 'casa') { for (let k = 0; k < 3; k++) { const a = ((t / 1400 + k / 3) % 1); g.fillStyle = 'rgba(241,245,249,' + (0.75 - a * 0.7) + ')'; const r = (2 + a * 4) * PX; g.fillRect(Math.round((x + (b.w * 16 + 4 - 15) * PX + Math.sin(a * 6 + k) * 6) / PX) * PX, Math.round((y + 4 * PX - a * 60) / PX) * PX, r, r); } }
    if (b.neon) { const c = ['#f0abfc', '#67e8f9', '#fde047'][Math.floor(t / 600) % 3]; g.strokeStyle = c; g.lineWidth = PX; g.strokeRect(b.x * T - PX, b.y * T + b.h * T * 0.42, b.w * T + 2 * PX, b.h * T * 0.58); }
    const noche = madrid() >= 20 || madrid() < 7; if (noche) { g.fillStyle = 'rgba(253,224,71,.18)'; g.fillRect(b.x * T, (b.y + b.h * 0.5) * T, b.w * T, b.h * 0.5 * T); }
  }
  function cofre(t) {
    const s = ctx.estado(), hoy = new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10), abierto = s.cofre && s.cofre.dia === hoy, sp = PXL.cofre(abierto);
    g.drawImage(sp, COFRE.x - sp.width * PX / 2, COFRE.y - sp.height * PX, sp.width * PX, sp.height * PX);
    if (!abierto) { g.globalAlpha = 0.5 + Math.sin(t / 300) * 0.4; g.fillStyle = '#fef08a'; for (let k = 0; k < 3; k++) g.fillRect(COFRE.x + 16 + k * 6, COFRE.y - 50 - k * 5, PX * 2, PX * 2); g.globalAlpha = 1; }
  }
  const lookCache = new Map();
  function lookPara(look) {
    const k = JSON.stringify([look.aspecto, look.ropa, look.nacido]); if (lookCache.has(k)) return lookCache.get(k);
    const l = PXL.lookDe(look, V, look.nacido ? V.edad(look, ctx.ahora()) : 20); lookCache.set(k, l); return l;
  }
  function persona(look, x, y, dir, anda, t, nombre, bocadillo, soy) {
    if (!look) return;
    const d = dir === 'u' || dir === 'd' || dir === 'l' || dir === 'r' ? dir : 'd', fr = anda ? [1, 0, 2, 0][Math.floor(t / 140) % 4] : 0;
    const sp = PXL.personaje(lookPara(look), d, fr), w = sp.width * PX, hh = sp.height * PX;
    g.drawImage(sp, Math.round(x - w / 2), Math.round(y - hh + 6), w, hh);
    g.font = (soy ? 'bold ' : '') + '11px system-ui'; g.textAlign = 'center';
    const tw = g.measureText(nombre).width + 10; g.fillStyle = soy ? 'rgba(236,72,153,.92)' : 'rgba(59,130,246,.92)'; g.fillRect(x - tw / 2, y - hh - 12, tw, 15); g.fillStyle = '#fff'; g.fillText(nombre, x, y - hh - 1);
    if (bocadillo) { g.font = '13px system-ui'; const bw = g.measureText(bocadillo).width + 16; g.fillStyle = '#fff'; g.fillRect(x - bw / 2, y - hh - 40, bw, 24); g.fillStyle = '#334155'; g.fillRect(x - bw / 2, y - hh - 17, bw, PX); g.fillRect(x - 3, y - hh - 16, 6, 4); g.fillStyle = '#111827'; g.fillText(bocadillo, x, y - hh - 23); }
  }
  function minimapa() {
    const sx = mini.width / (MW * T), sy = mini.height / (MH * T);
    gm.imageSmoothingEnabled = false; gm.drawImage(base, 0, 0, mini.width, mini.height);
    EDIF.forEach(b => { gm.fillStyle = b.techo; gm.fillRect(b.x * T * sx, b.y * T * sy, b.w * T * sx, b.h * T * sy); });
    gm.fillStyle = '#facc15'; monedas.forEach(m => gm.fillRect(m.x * sx - 1.5, m.y * sy - 1.5, 3, 3));
    gm.fillStyle = '#b45309'; gm.fillRect(COFRE.x * sx - 2.5, COFRE.y * sy - 2.5, 5, 5);
    gm.fillStyle = '#7c3aed'; gm.fillRect(PUESTO.x * sx - 2.5, PUESTO.y * sy - 2.5, 5, 5);
    gm.fillStyle = '#3b82f6'; otros.forEach(o => { gm.beginPath(); gm.arc(o.dx * sx, o.dy * sy, 3, 0, Math.PI * 2); gm.fill(); });
    gm.fillStyle = '#ec4899'; gm.beginPath(); gm.arc(yo.x * sx, yo.y * sy, 4, 0, Math.PI * 2); gm.fill(); gm.strokeStyle = '#fff'; gm.stroke();
  }
  // ---------- HUD, entrar en los sitios y escenas ----------
  function pintaHud() {
    const s = ctx.estado(), n = otros.length, ms = s.misiones && s.misiones.lista ? s.misiones.lista : [], hechas = ms.filter(m => m.prog >= m.meta).length;
    hud.replaceChildren(...[h('span.vm-chip', '💰 ' + s.dinero), h('span.vm-chip', '🪙 ' + monedas.length + ' por coger hoy'),
      ms.length ? h('button.vm-chip.vm-mis', { type: 'button', onclick: () => ctx.irTab('hoy') }, '📜 Misiones ' + hechas + '/' + ms.length) : null,
      h('span.vm-chip' + (n ? '.on' : ''), '👥 ' + (n ? n + (n === 1 ? ' vecino conectado' : ' vecinos conectados') : 'Sin vecinos ahora'))].filter(Boolean));
  }
  function pintaEntrar() {
    const txt = cerca === 'plaza' ? '🎁 Abrir el cofre del día' : cerca === 'huerto' ? 'Entrar: 🌱 Tu huerto' : cerca ? 'Entrar: ' + L(cerca).i + ' ' + L(cerca).t : '';
    entrar.replaceChildren(cerca ? btn(txt, () => abrir(cerca), { cls: 'primary vm-btn-entrar' }) : '');
    botonA.classList.toggle('listo', !!cerca);
  }
  function cerrarEscena() { escena.style.display = 'none'; escena.replaceChildren(); el.focus(); soltar(); }
  function sala(id, cuerpo, fondo) {
    soltar();
    escena.replaceChildren(h('div.vm-sala', { style: { background: fondo } }, h('div.row', h('h3.grow', L(id).i + ' ' + L(id).t), btn('✕ Salir', cerrarEscena, { cls: 'sm' })), cuerpo));
    escena.style.display = '';
  }
  const efTxt = ef => Object.entries(ef).map(([k, v]) => (v > 0 ? '+' : '') + v + ' ' + (V.NEC_TXT[k] || k).toLowerCase()).join(' · ');
  const menu = lugar => h('div.vm-menu', V.COMIDA.filter(c => c.en.includes(lugar)).map(c => h('button.vm-plato', { type: 'button', onclick: async () => { const r = await ctx.hacer('comida', c.id); if (r) comer(c); } },
    h('span.vm-plato-i', c.i), h('b', c.t), h('span.tiny', efTxt(c.ef)), h('span.vm-precio', ctx.edad() < 18 ? 'Paga tu familia' : '💰 ' + c.precio))));
  function comer(c) { const big = h('div.vm-nam', c.i); const sl = escena.querySelector('.vm-sala'); if (sl) sl.appendChild(big); setTimeout(() => big.remove(), 1300); }
  const accion = (txt, tipo, id) => btn(txt, () => ctx.hacer(tipo, id), { cls: 'vm-acc' });
  // v13.12 · vender la cosecha en el mercado (precios del día)
  function venta() {
    const s = ctx.estado(), cos = s.cosecha || {}, ahora = ctx.ahora(), hay = V.SEMILLAS.filter(x => cos[x.id] > 0);
    return h('div.vm-venta', h('h4', '💰 Vender tu cosecha · precios de hoy'),
      hay.length ? h('div.vm-menu', hay.map(x => h('div.vm-plato', h('span.vm-plato-i', x.i), h('b', x.t + ' × ' + cos[x.id]), h('span.vm-precio', '💰 ' + V.precioHoy(x.id, ahora) + ' c/u'),
        h('div.row', { style: { gap: '4px' } }, btn('Vender 1', () => ctx.hacer('vender', x.id + ':1', null).then(() => refrescarSala('mercado')), { cls: 'sm' }), cos[x.id] > 1 ? btn('Todo', () => ctx.hacer('vender', x.id + ':' + cos[x.id]).then(() => refrescarSala('mercado')), { cls: 'sm ghost' }) : null))))
        : h('p.small.muted', 'Aún no tienes cosecha. Siembra en tu huerto (delante de tu casa) y vuelve a venderla aquí.'),
      h('h4', '🌱 Semillas'), h('div.vm-menu', V.SEMILLAS.map(x => h('button.vm-plato', { type: 'button', 'data-semilla': x.id, onclick: () => ctx.hacer('semilla', x.id + ':1').then(() => refrescarSala('mercado')) },
        h('span.vm-plato-i', x.i), h('b', x.t), h('span.tiny', 'Crece en ' + x.horas + ' h · se vende a ~' + x.venta), h('span.vm-precio', '💰 ' + x.precio + ' · tienes ' + ((s.semillas || {})[x.id] || 0))))));
  }
  function refrescarSala(id) { if (escena.style.display !== 'none') abrir(id); }
  // v13.12 · el huerto: parcelas, sembrar, regar y cosechar
  function huertoSala() {
    const s = ctx.estado(), hu = s.huerto || { n: 6, p: [] }, ahora = ctx.ahora(), sem = Object.entries(s.semillas || {}).filter(([, n]) => n > 0);
    let elegida = sem.length ? sem[0][0] : '';
    const selSem = h('div.row.wrap.vm-semillas', { style: { gap: '6px' } }, sem.length ? sem.map(([id, n]) => { const x = V.buscar(V.SEMILLAS, id); return h('button.chip' + (id === elegida ? '.on' : ''), { type: 'button', 'data-sem': id, onclick: e => { elegida = id; selSem.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === e.currentTarget)); } }, x.i + ' ' + x.t + ' × ' + n); }) : h('span.small.muted', 'No tienes semillas: cómpralas en el 🛒 Mercado.'));
    const dur = ms => ms >= 3600000 ? Math.floor(ms / 3600000) + ' h ' + Math.round((ms % 3600000) / 60000) + ' min' : Math.max(1, Math.round(ms / 60000)) + ' min';
    const parcelas = h('div.vm-parcelas', Array.from({ length: hu.n }, (_, i) => {
      const pl = (hu.p || [])[i], se = pl && V.buscar(V.SEMILLAS, pl.s), c = pl && V.crece(pl, ahora);
      return h('div.vm-parcela' + (pl ? (c.f >= 1 ? '.lista' : '.crece') : '.vacia'), { 'data-parcela': i },
        h('div.vm-parcela-i', pl ? (c.f >= 1 ? se.i : c.f > 0.45 ? '🌿' : '🌱') : '🟫'),
        h('div.tiny', pl ? (c.f >= 1 ? '¡' + se.t + ' lista!' : se.t + ' · ' + dur(c.queda)) : 'Libre'),
        pl ? h('div.vm-barrita', h('i', { style: { width: Math.round(c.f * 100) + '%' } })) : null,
        pl ? (c.f >= 1 ? btn('🧺 Cosechar', () => ctx.hacer('cosechar', String(i)).then(r => { if (r) refrescarSala('huerto'); }), { cls: 'sm primary' })
          : btn('💧 Regar' + ((pl.agua || []).length ? ' (' + pl.agua.length + '/2)' : ''), () => ctx.hacer('regar', String(i)).then(() => refrescarSala('huerto')), { cls: 'sm', disabled: (pl.agua || []).length >= 2 }))
          : btn('🌱 Sembrar', () => { if (!elegida) return toast('Primero compra semillas en el Mercado', 'warn'); ctx.hacer('sembrar', i + ':' + elegida).then(() => refrescarSala('huerto')); }, { cls: 'sm', disabled: !elegida }));
    }));
    const cos = Object.entries(s.cosecha || {}).filter(([, n]) => n > 0);
    return h('div', h('p.small', 'Siembra, riega (crece más rápido y con dos riegos cosechas el doble) y cosecha. Luego vende en el 🛒 Mercado o cómetelo.'),
      h('div.lbl', 'Semilla para sembrar'), selSem, parcelas,
      hu.n < V.PARCELAS_MAX ? btn('➕ Comprar otra parcela (' + (250 * (hu.n - 5)) + ' monedas)', () => ctx.hacer('parcela', '').then(() => refrescarSala('huerto')), { cls: 'sm ghost' }) : null,
      cos.length ? h('div', h('div.lbl', { style: { marginTop: '10px' } }, '🧺 Tu cosecha'), h('div.row.wrap', { style: { gap: '6px' } }, cos.map(([id, n]) => { const x = V.buscar(V.SEMILLAS, id); return btn(x.i + ' ' + x.t + ' × ' + n + ' · comer', () => ctx.hacer('comer_cosecha', id).then(() => refrescarSala('huerto')), { cls: 'sm ghost' }); }))) : null);
  }
  // v13.12 · mercadillo de fichas (en la plaza)
  function mercadilloSala() {
    const s = ctx.estado(), of = V.mercadillo(ctx.ahora());
    return h('div', h('p.small', 'Cosas exclusivas que van DE VERDAD a tu vida (casa o armario). Se pagan con ⏱ fichas, que se ganan usando la app. Cada día hay ofertas nuevas.'),
      h('div.vm-menu', of.map(x => { const tiene = (s.inventario || []).includes(x.id); return h('div.vm-plato' + (x.oferta ? '.oferta' : ''), h('span.vm-plato-i', x.parte ? h('span.vd-color.big', { style: { background: x.color } }) : x.i), h('b', x.t),
        x.oferta ? h('span.tiny', '🔥 Oferta del día: antes ' + x.fichas) : h('span.tiny', x.parte ? 'Ropa' : 'Para tu casa'),
        tiene ? h('span.pill', '✓ Ya es tuyo') : btn('⏱ ' + x.precio + ' fichas', () => ctx.hacer('mercadillo', x.id).then(r => { if (r) refrescarSala('mercadillo'); }), { cls: 'sm primary' })); })));
  }
  async function abrir(id) {
    const s = ctx.estado();
    if (id === 'tienda') return ctx.irTab('tienda');
    if (id === 'escuela') return ctx.irTab('trabajo');
    if (id === 'plaza') {
      const r = await ctx.hacer('cofre', '');
      if (r) { const p = r.premio || 0; sala('plaza', h('div.vm-cofre-abierto', h('div.vm-cofre-i', '🎁'), h('h2', '+' + p + ' monedas'), h('p', '¡Racha de ' + ((r.vida && r.vida.cofre) || {}).racha + ' días! Vuelve mañana: cada día seguido el premio es mayor.'), h('div.vm-lluvia', Array.from({ length: 16 }, (_, i) => h('span', { style: { left: (i * 6.2) + '%', animationDelay: (i % 5) * 0.12 + 's' } }, '🪙')))), 'linear-gradient(160deg,#fef3c7,#fde68a)'); }
      return;
    }
    if (id === 'huerto') return sala('huerto', huertoSala(), 'linear-gradient(160deg,#ecfccb,#bef264)');
    if (id === 'mercadillo') return sala('mercadillo', mercadilloSala(), 'linear-gradient(160deg,#f5f3ff,#ddd6fe)');
    if (id === 'casa') return sala('casa', h('div', h('div.vm-acciones', accion('😴 Dormir', 'dormir'), accion('🚿 Ducharse', 'ducha'), accion('🎮 Jugar a la consola', 'ocio'), btn('🛋️ Decorar mi casa', () => { cerrarEscena(); ctx.irTab('casa'); }, { cls: 'vm-acc primary' }))), 'linear-gradient(160deg,#fff7ed,#fed7aa)');
    if (id === 'mercado') return sala('mercado', h('div', h('p.small', 'Comida de verdad: cada plato sube algo distinto. ¡Pruébalos todos!'), menu('mercado'), venta()), 'linear-gradient(160deg,#f0fdf4,#bbf7d0)');
    if (id === 'cafe') return sala('cafe', h('div', menu('cafe'), h('div.vm-acciones', accion('🧋 Quedar con amigos', 'amigos'))), 'linear-gradient(160deg,#fdf2f8,#fbcfe8)');
    if (id === 'parque') return sala('parque', h('div', h('div.vm-acciones', accion('🌳 Pasear', 'parque'), s.mascota ? accion('🎾 Jugar con tu mascota', 'mascota_jugar') : null), menu('parque')), 'linear-gradient(160deg,#ecfccb,#86efac)');
    if (id === 'gimnasio') return sala('gimnasio', h('div.vm-acciones', accion('🏋️ Entrenar (+8 salud)', 'gym')), 'linear-gradient(160deg,#f1f5f9,#cbd5e1)');
    if (id === 'salud') return sala('salud', h('div', h('p.small', 'Salud: ' + s.salud + '/100'), h('div.vm-acciones', accion('🩺 Pasar consulta', 'medico'))), 'linear-gradient(160deg,#f0f9ff,#bae6fd)');
    if (id === 'vip') return sala('vip', h('div.vm-vip-puerta', h('p', '🎤 Alfombra roja, luces, música y famosos. Una noche que tu personaje no olvidará.'), h('p.small', 'Entrada: ⏱ ' + V.VIP_FICHAS + ' fichas · a partir de 18 años · una vez cada 6 h.'),
      btn('🌟 Entrar al Club Estrella', async () => { const r = await ctx.hacer('vip', ''); if (r) vip(); }, { cls: 'primary', disabled: ctx.edad() < 18 })), 'radial-gradient(circle at 50% 20%,#4c1d95,#0f0720)');
  }
  function vip() {
    const s = ctx.estado(), av = avatar(s, { ahora: ctx.ahora(), cls: 'vm-vip-av' });
    escena.replaceChildren(h('div.vm-vip', h('div.vm-focos', h('i'), h('i'), h('i')), h('div.vm-alfombra'), av, h('h2.vm-vip-t', '🌟 NOCHE VIP 🌟'), h('p', s.nombre + ' entra en el Club Estrella. ¡Flashes, aplausos y una foto con los famosos!'),
      h('div.vm-flashes', Array.from({ length: 10 }, (_, i) => h('span', { style: { left: (5 + i * 9) + '%', animationDelay: (i * 0.23) + 's' } }, '📸'))),
      h('div.vm-confeti', Array.from({ length: 30 }, (_, i) => h('span', { style: { left: (i * 3.3) + '%', animationDelay: (i % 7) * 0.2 + 's', background: ['#f0abfc', '#67e8f9', '#fde047', '#f87171'][i % 4] } }))),
      btn('Volver al barrio', cerrarEscena, { cls: 'primary' })));
    escena.style.display = '';
  }
  // ---------- teclado y ratón (las teclas se sueltan aunque se pierda el foco) ----------
  const KM = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  const kd = e => { if (!el.isConnected) return; if (escena.style.display !== 'none') { if (e.key === 'Escape') cerrarEscena(); return; } if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return; if (!el.contains(document.activeElement) && document.activeElement !== document.body) return; const k = KM[e.code]; if (k) { keys[k] = true; meta = null; e.preventDefault(); } if ((e.key === 'Enter' || e.code === 'KeyE') && cerca) { e.preventDefault(); abrir(cerca); } };
  const ku = e => { const k = KM[e.code]; if (k) keys[k] = false; };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', soltar);
  const vis = () => { if (document.hidden) soltar(); }; document.addEventListener('visibilitychange', vis);
  cv.addEventListener('pointerdown', e => {
    el.focus({ preventScroll: true }); const r = cv.getBoundingClientRect(), W = cv.clientWidth, H = cv.clientHeight;
    const cx = Math.max(0, Math.min(MW * T - W, yo.x - W / 2)), cy = Math.max(0, Math.min(MH * T - H, yo.y - H / 2));
    const wx = e.clientX - r.left + cx, wy = e.clientY - r.top + cy;
    const b = EDIF.find(b => wx >= b.x * T && wx <= (b.x + b.w) * T && wy >= b.y * T - 30 && wy <= (b.y + b.h) * T);
    if (b) { const p = puerta(b); if (cerca === b.id) return abrir(b.id); meta = { x: p.x, y: p.y + 4 }; return; }
    if (Math.hypot(wx - COFRE.x, wy - COFRE.y) < 30) { if (cerca === 'plaza') return abrir('plaza'); meta = { x: COFRE.x, y: COFRE.y + 26 }; return; }
    if (Math.hypot(wx - PUESTO.x, wy - (PUESTO.y - 40)) < 60) { if (cerca === 'mercadillo') return abrir('mercadillo'); meta = { x: PUESTO.x, y: PUESTO.y + 0.5 * T }; return; }
    if (dentro(wx, wy, HUERTO)) { if (cerca === 'huerto') return abrir('huerto'); }
    meta = { x: wx, y: wy };
  });
  prepararMonedas(); pintaHud(); pintaEntrar();
  raf = requestAnimationFrame(paso);
  red();
  return {
    el,
    actualizar() { pintaHud(); const s = ctx.estado(); const hoy = new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10); const ya = s.recogidas && s.recogidas.dia === hoy ? s.recogidas.ids : []; monedas = monedas.filter(m => !ya.includes(m.i)); },
    destroy() { vivo = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', soltar); document.removeEventListener('visibilitychange', vis); },
    _test: { yo, keys, irA: (x, y) => { yo.x = x; yo.y = y; }, abrir, cerca: () => cerca, monedas: () => monedas, otros: () => otros, EDIF, COFRE, PUESTO, HUERTO: HUERTO.map(v => v * T), puerta }
  };
}
