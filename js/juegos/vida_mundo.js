// ================= v13.9 · VIDA · EL BARRIO 🗺️ =================
// Un mundo pequeño para pasear con tu personaje en tercera persona (vista desde arriba con perspectiva):
// casas, mercado con comida de verdad, cafetería, parque, tienda, escuela, gimnasio, centro de salud, Club Estrella VIP
// y la plaza con el cofre del día. Monedas por la calle (8 al día), minimapa, día y noche según la hora real,
// y los VECINOS: el resto del equipo que esté jugando a la vez aparece en el barrio y os podéis saludar.
// Todo lo que cambia la partida lo decide el servidor (vida.accion); aquí solo se dibuja y se camina.
import { h, btn, toast } from '../ui.js';
import { llamar } from './kit.js';
import { avatar } from './vida_avatar.js';

const T = 48, MW = 40, MH = 30; // casillas de 48 px · mapa de 40 × 30
const ROADS = [[0, 13, 40, 2], [18, 0, 2, 30], [0, 24, 18, 2], [26, 15, 2, 15]]; // x, y, ancho, alto (casillas)
const PLAZA = [15, 10, 8, 8];
// Edificios: x, y, w, h en casillas; puerta en el centro de la fachada de abajo
const EDIF = [
  { id: 'casa', x: 3, y: 3, w: 6, h: 5, pared: '#f3d9c0', techo: '#c2410c', i: '🏠' },
  { id: 'vip', x: 10, y: 2, w: 6, h: 6, pared: '#1f1235', techo: '#7c3aed', i: '🌟', neon: true },
  { id: 'mercado', x: 22, y: 3, w: 7, h: 5, pared: '#fef3c7', techo: '#15803d', i: '🛒' },
  { id: 'cafe', x: 31, y: 3, w: 6, h: 5, pared: '#fde2e4', techo: '#be185d', i: '☕' },
  { id: 'salud', x: 2, y: 17, w: 6, h: 5, pared: '#e0f2fe', techo: '#0284c7', i: '🩺' },
  { id: 'tienda', x: 9, y: 17, w: 6, h: 5, pared: '#fce7f3', techo: '#db2777', i: '👗' },
  { id: 'escuela', x: 21, y: 17, w: 4, h: 6, pared: '#ede9fe', techo: '#6d28d9', i: '🏫' },
  { id: 'gimnasio', x: 30, y: 17, w: 6, h: 5, pared: '#e5e7eb', techo: '#374151', i: '💪' }
];
const PARQUE = [29, 24, 11, 6], ESTANQUE = [33, 26, 4, 2];
const COFRE = { x: 19 * T, y: 13.2 * T };

function rng(seed) { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const madrid = () => { const p = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()); const g = k => Number((p.find(x => x.type === k) || {}).value || 0); return g('hour') + g('minute') / 60; };
const dentro = (px, py, r) => px >= r[0] * T && px < (r[0] + r[2]) * T && py >= r[1] * T && py < (r[1] + r[3]) * T;
const puerta = b => ({ x: (b.x + b.w / 2) * T, y: (b.y + b.h) * T + 6 });

export function mundo(ctx) {
  const V = window.VIDA, L = id => V.LUGARES.find(l => l.id === id) || { t: id, i: '📍' };
  const cv = h('canvas.vm-cv', { 'aria-label': 'El barrio: muévete con las flechas o tocando el mapa' });
  const mini = h('canvas.vm-mini', { width: 160, height: 120, 'aria-hidden': 'true' });
  const hud = h('div.vm-hud'), entrar = h('div.vm-entrar'), escena = h('div.vm-escena', { style: { display: 'none' } });
  const pad = h('div.vm-pad', [['u', '▲'], ['l', '◀'], ['d', '▼'], ['r', '▶']].map(([k, t]) => h('button.vm-k.' + k, { type: 'button', 'aria-label': { u: 'Arriba', d: 'Abajo', l: 'Izquierda', r: 'Derecha' }[k],
    onpointerdown: e => { e.preventDefault(); keys[k] = true; meta = null; }, onpointerup: () => { keys[k] = false; }, onpointerleave: () => { keys[k] = false; }, onpointercancel: () => { keys[k] = false; } }, t)));
  const saludos = h('div.vm-saludos', [['👋', '¡Hola!'], ['😄', '¿Qué tal?'], ['🎉', '¡Fiesta!'], ['❤️', '¡Te quiero, vecino!']].map(([e, t]) => h('button.chip', { type: 'button', onclick: () => saludar(e + ' ' + t) }, e)));
  const el = h('div.vm', { tabindex: 0 }, cv, mini, hud, entrar, h('div.vm-ctrl', pad, saludos), escena);
  const g = cv.getContext('2d'), gm = mini.getContext('2d');
  const yo = { x: 19 * T, y: 15.5 * T, dir: 'r', anda: false, fase: 0, bubble: null };
  const keys = {}; let meta = null, vivo = true, raf = 0, otros = [], ultEnvio = 0, enviando = false, cerca = null, monedas = [], cogiendo = new Set(), bichos = [];
  const sprites = new Map();
  // ---------- dibujo del personaje: el mismo SVG del juego, pasado a imagen ----------
  function sprite(look, key) {
    if (sprites.has(key)) return sprites.get(key);
    const img = new Image(); sprites.set(key, img);
    try { const svg = avatar(look, { ahora: ctx.ahora() }); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '200'); svg.setAttribute('height', '260'); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg)); } catch (e) { }
    return img;
  }
  const lookKey = s => JSON.stringify([s.sexo, s.aspecto, s.ropa, Math.floor(V.edad(s, ctx.ahora())), Math.round((V.NEC.reduce((a, n) => a + ((s.necesidades || {})[n] || 0), 0) / 5) / 25)]);
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
    for (let i = 0; i < V.MONEDAS_DIA; i++) { let x, y, n = 0; do { x = (1 + r() * (MW - 2)) * T; y = (1 + r() * (MH - 2)) * T; n++; } while (!libre(x, y) && n < 50); if (!ya.includes(i)) monedas.push({ i, x, y }); }
  }
  // pájaros y mariposas para dar vida
  for (let i = 0; i < 6; i++) bichos.push({ x: Math.random() * MW * T, y: Math.random() * MH * T, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.4, c: ['🦋', '🐦', '🐝'][i % 3] });
  const arboles = []; { const r = rng('arboles'); for (let i = 0; i < 70; i++) { const x = (r() * MW) * T, y = (r() * MH) * T; if (libre(x, y) && !ROADS.some(rd => dentro(x, y, [rd[0] - 0.5, rd[1] - 0.5, rd[2] + 1, rd[3] + 1])) && !dentro(x, y, PLAZA)) arboles.push({ x, y, s: 0.8 + r() * 0.5 }); } }
  const farolas = []; ROADS.forEach(rd => { for (let k = 0; k < Math.max(rd[2], rd[3]); k += 5) farolas.push(rd[2] > rd[3] ? { x: (rd[0] + k) * T, y: rd[1] * T - 6 } : { x: rd[0] * T - 6, y: (rd[1] + k) * T }); });

  // ---------- bucle ----------
  let ult = performance.now();
  function paso(t) {
    if (!vivo) return;
    const dt = Math.min(50, t - ult); ult = t;
    mover(dt); pintar(t); raf = requestAnimationFrame(paso);
  }
  function mover(dt) {
    let dx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), dy = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
    if (!dx && !dy && meta) { const ex = meta.x - yo.x, ey = meta.y - yo.y, d = Math.hypot(ex, ey); if (d < 6) { meta = null; } else { dx = ex / d; dy = ey / d; } }
    const len = Math.hypot(dx, dy); yo.anda = len > 0;
    if (yo.anda) {
      const s = ctx.estado(), rap = (s.coche ? 0.26 : 0.2) * dt;
      dx /= len; dy /= len; if (dx) yo.dir = dx < 0 ? 'l' : 'r';
      const nx = yo.x + dx * rap, ny = yo.y + dy * rap;
      if (libre(nx, yo.y)) yo.x = nx; else if (meta) meta = null;
      if (libre(yo.x, ny)) yo.y = ny; else if (meta) meta = null;
      yo.fase += dt / 90;
    }
    // ¿cerca de una puerta o del cofre?
    let c = null;
    for (const b of EDIF) { const p = puerta(b); if (Math.hypot(p.x - yo.x, p.y - yo.y) < 1.3 * T) c = b.id; }
    if (dentro(yo.x, yo.y, PARQUE)) c = 'parque';
    if (Math.hypot(COFRE.x - yo.x, COFRE.y - yo.y) < 1.2 * T) c = 'plaza';
    if (c !== cerca) { cerca = c; pintaEntrar(); }
    // monedas
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
      otros.forEach(o => { if (o.saludo && o.saludo.t > Date.now() - 6000 && !(ant.get(o.id) || {}).visto) { o.visto = true; } });
    } catch (e) { }
    enviando = false; pintaHud();
  }
  function saludar(txt) { yo.bubble = { txt, t: performance.now() }; red(txt); }
  // ---------- pintar ----------
  function pintar(t) {
    const W = cv.clientWidth || 600, H = cv.clientHeight || 420, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = Math.max(0, Math.min(MW * T - W, yo.x - W / 2)), cy = Math.max(0, Math.min(MH * T - H, yo.y - H / 2));
    g.save(); g.translate(-Math.round(cx), -Math.round(cy));
    // suelo
    g.fillStyle = '#9bd88a'; g.fillRect(0, 0, MW * T, MH * T);
    g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < MW; i++) for (let j = 0; j < MH; j++) if ((i + j) % 2) g.fillRect(i * T, j * T, T, T);
    // parque y estanque
    g.fillStyle = '#7cc96b'; g.fillRect(PARQUE[0] * T, PARQUE[1] * T, PARQUE[2] * T, PARQUE[3] * T);
    g.fillStyle = '#60a5fa'; g.beginPath(); g.ellipse((ESTANQUE[0] + 2) * T, (ESTANQUE[1] + 1) * T, 2 * T, T, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse((ESTANQUE[0] + 1.6) * T + Math.sin(t / 900) * 8, (ESTANQUE[1] + 0.8) * T, 18, 4, 0, 0, Math.PI * 2); g.fill();
    // calles
    ROADS.forEach(r => { g.fillStyle = '#6b7280'; g.fillRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T); g.strokeStyle = '#fde68a'; g.lineWidth = 3; g.setLineDash([18, 16]); g.beginPath(); if (r[2] > r[3]) { g.moveTo(r[0] * T, (r[1] + 1) * T); g.lineTo((r[0] + r[2]) * T, (r[1] + 1) * T); } else { g.moveTo((r[0] + 1) * T, r[1] * T); g.lineTo((r[0] + 1) * T, (r[1] + r[3]) * T); } g.stroke(); g.setLineDash([]); });
    // plaza con baldosas y fuente
    g.fillStyle = '#e7d8c3'; g.fillRect(PLAZA[0] * T, PLAZA[1] * T, PLAZA[2] * T, PLAZA[3] * T);
    g.strokeStyle = 'rgba(120,90,60,.18)'; g.lineWidth = 1; for (let i = 0; i <= PLAZA[2] * 2; i++) { g.beginPath(); g.moveTo((PLAZA[0] + i / 2) * T, PLAZA[1] * T); g.lineTo((PLAZA[0] + i / 2) * T, (PLAZA[1] + PLAZA[3]) * T); g.stroke(); }
    g.fillStyle = '#94a3b8'; g.beginPath(); g.arc(19 * T, 11.5 * T, 0.9 * T, 0, Math.PI * 2); g.fill(); g.fillStyle = '#93c5fd'; g.beginPath(); g.arc(19 * T, 11.5 * T, 0.7 * T, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(19 * T + Math.cos(t / 300 + k) * 10, 11.5 * T - 14 - Math.abs(Math.sin(t / 250 + k)) * 14, 3, 0, Math.PI * 2); g.fill(); }
    // lo que tiene altura se pinta de arriba abajo (lo de delante tapa lo de detrás)
    const cosas = [];
    EDIF.forEach(b => cosas.push({ y: (b.y + b.h) * T, f: () => edificio(b, t) }));
    arboles.forEach(a => cosas.push({ y: a.y, f: () => arbol(a) }));
    farolas.forEach(f => cosas.push({ y: f.y, f: () => farola(f) }));
    cosas.push({ y: COFRE.y, f: () => cofre(t) });
    monedas.forEach(m => cosas.push({ y: m.y, f: () => { g.font = '22px serif'; g.textAlign = 'center'; g.fillText('🪙', m.x, m.y - 4 - Math.abs(Math.sin(t / 300 + m.i)) * 6); } }));
    otros.forEach(o => { o.dx += (o.x - o.dx) * 0.08; o.dy += (o.y - o.dy) * 0.08; cosas.push({ y: o.dy, f: () => persona(o.look, o.dx, o.dy, o.dir, o.anda, t, o.n + ' · ' + o.u, o.saludo && Date.now() - o.saludo.t < 6000 ? o.saludo.txt : '', 'v' + o.id) }); });
    const s = ctx.estado();
    cosas.push({ y: yo.y, f: () => { if (s.mascota) { const mt = V.buscar(V.CAT.mascotas, s.mascota.tipo); g.font = '24px serif'; g.textAlign = 'center'; g.fillText(mt ? mt.i : '🐾', yo.x + (yo.dir === 'l' ? 30 : -30), yo.y - 2 + Math.sin(yo.fase * 2) * 2); } persona(s, yo.x, yo.y, yo.dir, yo.anda, t, s.nombre, yo.bubble && performance.now() - yo.bubble.t < 5000 ? yo.bubble.txt : '', 'yo', true); } });
    cosas.sort((a, b) => a.y - b.y).forEach(c => c.f());
    bichos.forEach(b => { g.font = '16px serif'; g.fillText(b.c, b.x, b.y + Math.sin(t / 200 + b.x) * 3); });
    // destino al tocar
    if (meta) { g.strokeStyle = 'rgba(236,72,153,.8)'; g.lineWidth = 2; g.beginPath(); g.ellipse(meta.x, meta.y, 12 + Math.sin(t / 150) * 3, 6, 0, 0, Math.PI * 2); g.stroke(); }
    flotantes.forEach(f => { const a = (performance.now() - f.t) / 1200; if (a < 1) { g.globalAlpha = 1 - a; g.fillStyle = '#b45309'; g.font = 'bold 18px system-ui'; g.textAlign = 'center'; g.fillText(f.txt, f.x, f.y - 30 - a * 30); g.globalAlpha = 1; } });
    // día y noche (hora real de Madrid)
    const hr = madrid(), noche = hr >= 21 || hr < 7 ? 0.42 : hr >= 19 ? (hr - 19) / 2 * 0.42 : hr < 8 ? (8 - hr) * 0.42 : 0;
    if (noche > 0) {
      g.fillStyle = 'rgba(15,23,60,' + noche + ')'; g.fillRect(0, 0, MW * T, MH * T);
      g.globalCompositeOperation = 'lighter';
      farolas.concat([{ x: yo.x, y: yo.y - 30 }]).forEach(f => { const gr = g.createRadialGradient(f.x, f.y + 10, 2, f.x, f.y + 10, 80); gr.addColorStop(0, 'rgba(255,214,120,' + noche * 0.8 + ')'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.fillRect(f.x - 80, f.y - 70, 160, 160); });
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
    minimapa();
  }
  function caja3d(x, y, w, hgt, alto, pared, techo) {
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 8, y + hgt - 6, w, 10);
    g.fillStyle = pared; g.fillRect(x, y + hgt - alto, w, alto);
    g.fillStyle = techo; g.fillRect(x - 4, y - 6, w + 8, hgt - alto + 8);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 4, y - 6, w + 8, 6);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x - 4, y + hgt - alto, w + 8, 4);
  }
  function edificio(b, t) {
    const x = b.x * T, y = b.y * T, w = b.w * T, hh = b.h * T, alto = Math.min(hh * 0.55, 96);
    caja3d(x, y, w, hh, alto, b.pared, b.techo);
    // ventanas
    const noche = madrid() >= 20 || madrid() < 7;
    for (let i = 0; i < Math.floor(b.w / 1.5); i++) { g.fillStyle = noche ? '#fde68a' : '#bfdbfe'; g.fillRect(x + 14 + i * T * 1.5, y + hh - alto + 14, 22, 18); }
    // puerta
    const p = puerta(b); g.fillStyle = '#7c4a2a'; g.fillRect(p.x - 13, y + hh - 34, 26, 34); g.fillStyle = '#fbbf24'; g.fillRect(p.x + 6, y + hh - 18, 3, 3);
    // letrero
    g.font = 'bold 13px system-ui'; g.textAlign = 'center'; const txt = L(b.id).i + ' ' + L(b.id).t;
    const tw = g.measureText(txt).width + 14; g.fillStyle = b.neon ? '#000' : 'rgba(255,255,255,.92)'; g.fillRect(p.x - tw / 2, y - 28, tw, 20);
    if (b.neon) { g.shadowColor = ['#f0abfc', '#67e8f9', '#fde047'][Math.floor(t / 600) % 3]; g.shadowBlur = 14; }
    g.fillStyle = b.neon ? '#fdf4ff' : '#1f2937'; g.fillText(txt, p.x, y - 13); g.shadowBlur = 0;
    if (b.neon) { g.strokeStyle = ['#f0abfc', '#67e8f9', '#fde047'][Math.floor(t / 600) % 3]; g.lineWidth = 3; g.strokeRect(x - 2, y + hh - alto - 2, w + 4, alto + 4); g.fillStyle = '#dc2626'; g.fillRect(p.x - 16, y + hh, 32, 40); }
  }
  function arbol(a) { const s = a.s; g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(a.x, a.y, 16 * s, 6 * s, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7c4a2a'; g.fillRect(a.x - 3 * s, a.y - 18 * s, 6 * s, 18 * s); g.fillStyle = '#16a34a'; g.beginPath(); g.arc(a.x, a.y - 30 * s, 18 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = '#22c55e'; g.beginPath(); g.arc(a.x - 6 * s, a.y - 35 * s, 10 * s, 0, Math.PI * 2); g.fill(); }
  function farola(f) { g.fillStyle = '#334155'; g.fillRect(f.x - 2, f.y - 40, 4, 40); g.fillStyle = '#fde68a'; g.beginPath(); g.arc(f.x, f.y - 42, 5, 0, Math.PI * 2); g.fill(); }
  function cofre(t) {
    const s = ctx.estado(), hoy = new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10), abierto = s.cofre && s.cofre.dia === hoy;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(COFRE.x, COFRE.y, 22, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#92400e'; g.fillRect(COFRE.x - 18, COFRE.y - 24, 36, 22); g.fillStyle = abierto ? '#78350f' : '#b45309'; g.fillRect(COFRE.x - 20, COFRE.y - 34 - (abierto ? 6 : 0), 40, 12);
    g.fillStyle = '#fbbf24'; g.fillRect(COFRE.x - 3, COFRE.y - 22, 6, 8);
    if (!abierto) { g.globalAlpha = 0.5 + Math.sin(t / 300) * 0.4; g.font = '16px serif'; g.textAlign = 'center'; g.fillText('✨', COFRE.x + 22, COFRE.y - 34); g.globalAlpha = 1; }
  }
  function persona(look, x, y, dir, anda, t, nombre, bocadillo, key, soy) {
    if (!look) return;
    const img = sprite(look, key + lookKey(look)), bob = anda ? Math.abs(Math.sin(t / 110)) * 3 : 0, w = 46, hh = 60;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y, 15, 5, 0, 0, Math.PI * 2); g.fill();
    if (img.complete && img.naturalWidth) { g.save(); g.translate(x, y - bob); if (dir === 'l') g.scale(-1, 1); if (anda) g.rotate(Math.sin(t / 110) * 0.05); g.drawImage(img, -w / 2, -hh, w, hh); g.restore(); }
    else { g.fillStyle = '#f472b6'; g.beginPath(); g.arc(x, y - 30, 14, 0, Math.PI * 2); g.fill(); }
    g.font = (soy ? 'bold ' : '') + '11px system-ui'; g.textAlign = 'center';
    const tw = g.measureText(nombre).width + 10; g.fillStyle = soy ? 'rgba(236,72,153,.9)' : 'rgba(59,130,246,.9)'; g.fillRect(x - tw / 2, y - hh - 20, tw, 15); g.fillStyle = '#fff'; g.fillText(nombre, x, y - hh - 9);
    if (bocadillo) { g.font = '13px system-ui'; const bw = g.measureText(bocadillo).width + 16; g.fillStyle = '#fff'; g.strokeStyle = '#cbd5e1'; g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(x - bw / 2, y - hh - 48, bw, 24, 10) : g.rect(x - bw / 2, y - hh - 48, bw, 24); g.fill(); g.stroke(); g.fillStyle = '#111827'; g.fillText(bocadillo, x, y - hh - 31); }
  }
  function minimapa() {
    const sx = mini.width / (MW * T), sy = mini.height / (MH * T);
    gm.fillStyle = '#9bd88a'; gm.fillRect(0, 0, mini.width, mini.height);
    gm.fillStyle = '#7cc96b'; gm.fillRect(PARQUE[0] * T * sx, PARQUE[1] * T * sy, PARQUE[2] * T * sx, PARQUE[3] * T * sy);
    gm.fillStyle = '#6b7280'; ROADS.forEach(r => gm.fillRect(r[0] * T * sx, r[1] * T * sy, r[2] * T * sx, r[3] * T * sy));
    EDIF.forEach(b => { gm.fillStyle = b.techo; gm.fillRect(b.x * T * sx, b.y * T * sy, b.w * T * sx, b.h * T * sy); });
    gm.fillStyle = '#facc15'; monedas.forEach(m => gm.fillRect(m.x * sx - 1.5, m.y * sy - 1.5, 3, 3));
    gm.fillStyle = '#b45309'; gm.fillRect(COFRE.x * sx - 2.5, COFRE.y * sy - 2.5, 5, 5);
    gm.fillStyle = '#3b82f6'; otros.forEach(o => { gm.beginPath(); gm.arc(o.dx * sx, o.dy * sy, 3, 0, Math.PI * 2); gm.fill(); });
    gm.fillStyle = '#ec4899'; gm.beginPath(); gm.arc(yo.x * sx, yo.y * sy, 4, 0, Math.PI * 2); gm.fill(); gm.strokeStyle = '#fff'; gm.stroke();
  }
  // ---------- HUD, entrar en los sitios y escenas ----------
  function pintaHud() {
    const s = ctx.estado(), n = otros.length;
    hud.replaceChildren(h('span.vm-chip', '💰 ' + s.dinero), h('span.vm-chip', '🪙 ' + monedas.length + ' por coger hoy'), h('span.vm-chip' + (n ? '.on' : ''), '👥 ' + (n ? n + (n === 1 ? ' vecino conectado' : ' vecinos conectados') : 'Sin vecinos ahora')));
  }
  function pintaEntrar() {
    entrar.replaceChildren(cerca ? btn(cerca === 'plaza' ? '🎁 Abrir el cofre del día' : 'Entrar: ' + L(cerca).i + ' ' + L(cerca).t, () => abrir(cerca), { cls: 'primary vm-btn-entrar' }) : '');
  }
  function cerrarEscena() { escena.style.display = 'none'; escena.replaceChildren(); el.focus(); }
  function sala(id, cuerpo, fondo) {
    escena.replaceChildren(h('div.vm-sala', { style: { background: fondo } }, h('div.row', h('h3.grow', L(id).i + ' ' + L(id).t), btn('✕ Salir', cerrarEscena, { cls: 'sm' })), cuerpo));
    escena.style.display = '';
  }
  const efTxt = ef => Object.entries(ef).map(([k, v]) => (v > 0 ? '+' : '') + v + ' ' + (V.NEC_TXT[k] || k).toLowerCase()).join(' · ');
  const menu = lugar => h('div.vm-menu', V.COMIDA.filter(c => c.en.includes(lugar)).map(c => h('button.vm-plato', { type: 'button', onclick: async () => { const r = await ctx.hacer('comida', c.id); if (r) comer(c); } },
    h('span.vm-plato-i', c.i), h('b', c.t), h('span.tiny', efTxt(c.ef)), h('span.vm-precio', ctx.edad() < 18 ? 'Paga tu familia' : '💰 ' + c.precio))));
  function comer(c) { const big = h('div.vm-nam', c.i); escena.querySelector('.vm-sala').appendChild(big); setTimeout(() => big.remove(), 1300); }
  const accion = (txt, tipo, id) => btn(txt, () => ctx.hacer(tipo, id), { cls: 'vm-acc' });
  async function abrir(id) {
    const s = ctx.estado();
    if (id === 'tienda') return ctx.irTab('tienda');
    if (id === 'escuela') return ctx.irTab('trabajo');
    if (id === 'plaza') {
      const r = await ctx.hacer('cofre', '');
      if (r) { const p = r.premio || 0; sala('plaza', h('div.vm-cofre-abierto', h('div.vm-cofre-i', '🎁'), h('h2', '+' + p + ' monedas'), h('p', '¡Racha de ' + ((r.vida && r.vida.cofre) || {}).racha + ' días! Vuelve mañana: cada día seguido el premio es mayor.'), h('div.vm-lluvia', Array.from({ length: 16 }, (_, i) => h('span', { style: { left: (i * 6.2) + '%', animationDelay: (i % 5) * 0.12 + 's' } }, '🪙')))), 'linear-gradient(160deg,#fef3c7,#fde68a)'); }
      return;
    }
    if (id === 'casa') return sala('casa', h('div.vm-acciones', accion('😴 Dormir', 'dormir'), accion('🚿 Ducharse', 'ducha'), accion('🎮 Jugar a la consola', 'ocio'), btn('🛋️ Decorar mi casa', () => ctx.irTab('casa'), { cls: 'vm-acc' })), 'linear-gradient(160deg,#fff7ed,#fed7aa)');
    if (id === 'mercado') return sala('mercado', h('div', h('p.small', 'Comida de verdad: cada plato sube algo distinto. ¡Pruébalos todos!'), menu('mercado')), 'linear-gradient(160deg,#f0fdf4,#bbf7d0)');
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
  // ---------- teclado y ratón ----------
  const KM = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  const kd = e => { if (escena.style.display !== 'none') { if (e.key === 'Escape') cerrarEscena(); return; } if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return; const k = KM[e.code]; if (k) { keys[k] = true; meta = null; e.preventDefault(); } if ((e.key === 'Enter' || e.code === 'KeyE') && cerca) { e.preventDefault(); abrir(cerca); } };
  const ku = e => { const k = KM[e.code]; if (k) keys[k] = false; };
  el.addEventListener('keydown', kd); el.addEventListener('keyup', ku);
  cv.addEventListener('pointerdown', e => {
    el.focus(); const r = cv.getBoundingClientRect(), W = cv.clientWidth, H = cv.clientHeight;
    const cx = Math.max(0, Math.min(MW * T - W, yo.x - W / 2)), cy = Math.max(0, Math.min(MH * T - H, yo.y - H / 2));
    const wx = e.clientX - r.left + cx, wy = e.clientY - r.top + cy;
    const b = EDIF.find(b => wx >= b.x * T && wx <= (b.x + b.w) * T && wy >= b.y * T - 30 && wy <= (b.y + b.h) * T);
    if (b) { const p = puerta(b); if (cerca === b.id) return abrir(b.id); meta = { x: p.x, y: p.y + 4 }; return; }
    if (Math.hypot(wx - COFRE.x, wy - COFRE.y) < 30) { if (cerca === 'plaza') return abrir('plaza'); meta = { x: COFRE.x, y: COFRE.y + 26 }; return; }
    meta = { x: wx, y: wy };
  });
  prepararMonedas(); pintaHud(); pintaEntrar();
  raf = requestAnimationFrame(paso);
  red();
  return {
    el,
    actualizar() { pintaHud(); const s = ctx.estado(); const hoy = new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10); const ya = s.recogidas && s.recogidas.dia === hoy ? s.recogidas.ids : []; monedas = monedas.filter(m => !ya.includes(m.i)); },
    destroy() { vivo = false; cancelAnimationFrame(raf); },
    _test: { yo, irA: (x, y) => { yo.x = x; yo.y = y; }, abrir, cerca: () => cerca, monedas: () => monedas, otros: () => otros, EDIF, COFRE, puerta }
  };
}
