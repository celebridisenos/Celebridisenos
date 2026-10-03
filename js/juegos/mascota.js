// ================= Descanso 🎮 · «Bobi, tu mascota» =================
// Una mascota al estilo Pou/Tamagotchi que vive en una bobina de filamento. Solo para pasar el rato:
//   · NO toca pedidos, stock, clientes ni puntos reales: nada de api/servidor. Todo se guarda en ESTE aparato (localStorage, siempre con try/catch)
//   · el tiempo pasa de verdad aunque la app esté cerrada (se calcula al volver, con topes: Bobi nunca muere)
//   · la simulación está en mascota_logic.js (funciones puras, probadas en Node); aquí solo hay dibujo, controles y minijuegos
import { h, btn, toast } from '../ui.js';
import * as L from './mascota_logic.js';

export const meta = { id: 'mascota', titulo: 'Bobi, tu mascota', emoji: '🐣', desc: 'Críala desde el huevo: come, juega, duerme y crece. Tiene ánimo propio.' };

const W = 400, HH = 360, GROUND = 288, CX = 200, TAU = Math.PI * 2;
const DIM = { bebe: { R: 44, kx: 1, ky: 0.92 }, nino: { R: 54, kx: 1, ky: 0.95 }, joven: { R: 62, kx: 0.98, ky: 1 }, adulto: { R: 68, kx: 0.94, ky: 1.07 } };
const rr = (a, b) => a + Math.random() * (b - a);
const clamp = L.clamp;

// ---------- almacenamiento (siempre con try/catch) ----------
const leeLS = () => { try { const r = localStorage.getItem(L.KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
const escribeLS = e => { try { localStorage.setItem(L.KEY, JSON.stringify(e)); } catch (err) { /* sin espacio o bloqueado: se juega igual */ } };

// ---------- pequeños dibujos ----------
function elip(c, x, y, rx, ry, fill, stroke, lw, rot) {
  c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 2; c.strokeStyle = stroke; c.stroke(); }
}
function rrect(c, x, y, w, hh, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function corazon(c, x, y, s, fill, alpha) {
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = alpha == null ? 1 : alpha; c.beginPath(); c.moveTo(0, 0.55);
  c.bezierCurveTo(-1.3, -0.2, -0.7, -1.05, 0, -0.4); c.bezierCurveTo(0.7, -1.05, 1.3, -0.2, 0, 0.55); c.closePath(); c.fillStyle = fill; c.fill(); c.restore();
}
function chispa(c, x, y, r, fill, alpha, rot) {
  c.save(); c.translate(x, y); c.rotate(rot || 0); c.globalAlpha = alpha == null ? 1 : alpha; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rad = i % 2 ? r * 0.35 : r; c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  c.closePath(); c.fillStyle = fill; c.fill(); c.restore();
}
function rnd32(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- comidas, juguetes y bobina dibujados a mano ----------
function dibujaComida(c, id, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round';
  if (id === 'manzana') { elip(c, 0, 0, 15, 14, '#ef4444', '#991b1b', 2); elip(c, -5, -5, 4, 3, 'rgba(255,255,255,.55)'); c.strokeStyle = '#78350f'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -12); c.lineTo(2, -20); c.stroke(); elip(c, 8, -17, 7, 3.5, '#22c55e', '#15803d', 1.5, -0.5); }
  else if (id === 'verdura') { c.fillStyle = '#86efac'; rrect(c, -5, 2, 10, 14, 4); c.fill(); for (const [px, py, pr] of [[-9, -4, 9], [9, -4, 9], [0, -10, 10], [0, 0, 9]]) elip(c, px, py, pr, pr, '#16a34a', '#14532d', 1.5); elip(c, -3, -12, 3, 2, 'rgba(255,255,255,.4)'); }
  else if (id === 'sopa') { elip(c, 0, 0, 17, 5, '#f59e0b', '#92400e', 1.5); c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-14, 18, 0, 18); c.quadraticCurveTo(14, 18, 17, 0); c.closePath(); c.fillStyle = '#e5e7eb'; c.fill(); c.strokeStyle = '#6b7280'; c.lineWidth = 2; c.stroke(); elip(c, 0, 0, 14, 3.4, '#fb923c'); c.strokeStyle = 'rgba(100,100,100,.5)'; c.lineWidth = 2; for (const k of [-6, 4]) { c.beginPath(); c.moveTo(k, -4); c.quadraticCurveTo(k + 4, -10, k, -15); c.stroke(); } }
  else if (id === 'helado') { c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0); c.lineTo(0, 22); c.closePath(); c.fillStyle = '#fbbf24'; c.fill(); c.strokeStyle = '#b45309'; c.lineWidth = 1.5; c.stroke(); elip(c, 0, -3, 11, 9, '#f9a8d4', '#be185d', 1.5); elip(c, 0, -13, 8, 7, '#fef3c7', '#d97706', 1.5); elip(c, 2, -21, 2.4, 2.4, '#ef4444'); }
  else if (id === 'pizza') { c.beginPath(); c.moveTo(-15, -12); c.quadraticCurveTo(0, -20, 15, -12); c.lineTo(0, 20); c.closePath(); c.fillStyle = '#fbbf24'; c.fill(); c.strokeStyle = '#b45309'; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(-15, -12); c.quadraticCurveTo(0, -20, 15, -12); c.strokeStyle = '#d97706'; c.lineWidth = 5; c.stroke(); elip(c, -3, -5, 3.4, 3.4, '#dc2626'); elip(c, 5, -3, 3, 3, '#dc2626'); elip(c, 0, 7, 3, 3, '#dc2626'); }
  else if (id === 'pastel') { c.fillStyle = '#f9a8d4'; rrect(c, -15, -3, 30, 17, 3); c.fill(); c.strokeStyle = '#be185d'; c.lineWidth = 1.8; c.stroke(); c.fillStyle = '#fef3c7'; rrect(c, -15, -8, 30, 8, 4); c.fill(); c.strokeStyle = '#d97706'; c.stroke(); elip(c, 0, -12, 4, 4, '#ef4444', '#991b1b', 1.4); c.strokeStyle = '#be185d'; c.beginPath(); c.moveTo(-15, 5); c.lineTo(15, 5); c.stroke(); }
  else if (id === 'pastilla') { c.rotate(-0.6); c.fillStyle = '#ef4444'; rrect(c, -14, -7, 14, 14, 7); c.fill(); c.fillStyle = '#f8fafc'; rrect(c, 0, -7, 14, 14, 7); c.fill(); c.strokeStyle = '#475569'; c.lineWidth = 1.8; rrect(c, -14, -7, 28, 14, 7); c.stroke(); }
  c.restore();
}
function dibujaJuguete(c, id, x, y, s, t) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round';
  if (id === 'pelota') { elip(c, 0, -16, 16, 16, '#f8fafc', '#334155', 2); c.save(); c.beginPath(); c.arc(0, -16, 15, 0, TAU); c.clip(); c.fillStyle = '#ef4444'; c.fillRect(-20, -26, 40, 8); c.fillStyle = '#3b82f6'; c.fillRect(-20, -12, 40, 8); c.restore(); elip(c, -5, -22, 4, 3, 'rgba(255,255,255,.6)'); }
  else if (id === 'osito') { elip(c, 0, -10, 13, 12, '#b45309', '#78350f', 2); elip(c, -9, -23, 5, 5, '#b45309', '#78350f', 2); elip(c, 9, -23, 5, 5, '#b45309', '#78350f', 2); elip(c, 0, -26, 10, 9, '#c2762b', '#78350f', 2); elip(c, 0, -23, 4.5, 3.4, '#fde68a'); elip(c, -3.4, -28, 1.5, 1.5, '#1f2937'); elip(c, 3.4, -28, 1.5, 1.5, '#1f2937'); elip(c, 0, -24, 1.4, 1, '#1f2937'); elip(c, 0, -8, 6, 6, '#fde68a'); }
  else if (id === 'cubo') { c.beginPath(); c.moveTo(0, -34); c.lineTo(16, -26); c.lineTo(0, -18); c.lineTo(-16, -26); c.closePath(); c.fillStyle = '#7dd3fc'; c.fill(); c.strokeStyle = '#0369a1'; c.lineWidth = 1.8; c.stroke(); c.beginPath(); c.moveTo(-16, -26); c.lineTo(0, -18); c.lineTo(0, 0); c.lineTo(-16, -8); c.closePath(); c.fillStyle = '#38bdf8'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(16, -26); c.lineTo(0, -18); c.lineTo(0, 0); c.lineTo(16, -8); c.closePath(); c.fillStyle = '#0ea5e9'; c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; for (const k of [-6, -12]) { c.beginPath(); c.moveTo(-16, k - 8 + 0); c.lineTo(0, k + 0); c.stroke(); } }
  else if (id === 'robot') { c.fillStyle = '#94a3b8'; rrect(c, -12, -22, 24, 22, 4); c.fill(); c.strokeStyle = '#334155'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#cbd5e1'; rrect(c, -10, -38, 20, 15, 4); c.fill(); c.stroke(); elip(c, -4, -31, 2.6, 2.6, '#22d3ee'); elip(c, 4, -31, 2.6, 2.6, '#22d3ee'); c.beginPath(); c.moveTo(0, -38); c.lineTo(0, -44); c.stroke(); elip(c, 0, -45, 2, 2, '#ef4444'); c.fillStyle = '#ef4444'; c.fillRect(-5, -14, 10, 4); }
  c.restore();
}
function dibujaNido(c, cx, y, col) {
  // bobina de filamento vista desde arriba: brida inferior, filamento enrollado, brida superior translúcida y agujero central
  elip(c, cx, y + 44, 106, 22, '#94a3b8', '#64748b', 2);
  const g = c.createLinearGradient(cx - 100, 0, cx + 100, 0); g.addColorStop(0, col.sombra); g.addColorStop(0.35, col.base); g.addColorStop(0.7, col.base); g.addColorStop(1, col.sombra);
  c.fillStyle = g; c.fillRect(cx - 100, y + 6, 200, 38);
  c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 1.6; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(cx, y + 9 + i * 7.4, 100, 21, 0, 0.02 * Math.PI, 0.98 * Math.PI); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(cx - 60, y + 6, 18, 38);
  elip(c, cx, y + 6, 108, 24, '#d6dbe3', '#94a3b8', 2);
  elip(c, cx, y + 5, 86, 18, col.base, col.sombra, 1.5);
  for (let i = 1; i < 4; i++) elip(c, cx, y + 5, 86 - i * 17, 18 - i * 3.6, null, 'rgba(0,0,0,.14)', 1.4);
  elip(c, cx, y + 5, 26, 6, '#1f2937'); elip(c, cx - 70, y + 2, 14, 3, 'rgba(255,255,255,.28)', null, 0, -0.1);
}

// ---------- fondos de la habitación ----------
function dibujaFondo(c, fondo) {
  const R = rnd32(fondo.length * 977 + fondo.charCodeAt(0));
  if (fondo === 'jardin') {
    let g = c.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#9fd8ff'); g.addColorStop(1, '#e6f6ff'); c.fillStyle = g; c.fillRect(0, 0, W, HH);
    elip(c, 70, 62, 30, 30, '#fde047', '#facc15', 3); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.strokeStyle = '#fde047'; c.lineWidth = 3; c.beginPath(); c.moveTo(70 + Math.cos(a) * 38, 62 + Math.sin(a) * 38); c.lineTo(70 + Math.cos(a) * 50, 62 + Math.sin(a) * 50); c.stroke(); }
    for (const [x, y, s] of [[230, 56, 1], [330, 96, 0.8]]) { c.fillStyle = '#fff'; for (const [dx, dy, r] of [[0, 0, 20], [22, 6, 17], [-22, 7, 15], [8, -10, 15]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); } }
    c.fillStyle = '#86d57a'; c.beginPath(); c.moveTo(0, 230); c.quadraticCurveTo(100, 190, 220, 232); c.quadraticCurveTo(320, 262, W, 215); c.lineTo(W, HH); c.lineTo(0, HH); c.fill();
    g = c.createLinearGradient(0, 245, 0, HH); g.addColorStop(0, '#6cc965'); g.addColorStop(1, '#3f9f4a'); c.fillStyle = g; c.fillRect(0, 252, W, HH);
    c.fillStyle = '#92400e'; rrect(c, 335, 112, 22, 140, 4); c.fill(); elip(c, 346, 100, 52, 46, '#22a24a', '#15803d', 2); elip(c, 322, 128, 32, 28, '#2bb455'); elip(c, 372, 124, 30, 26, '#2bb455');
    for (let i = 0; i < 26; i++) { const x = R() * W, y = 262 + R() * 90, k = ['#f472b6', '#fde047', '#fff', '#fb923c'][Math.floor(R() * 4)]; c.strokeStyle = '#2f8f3f'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 9); c.stroke(); for (let j = 0; j < 5; j++) elip(c, x + Math.cos(j * TAU / 5) * 3.6, y + Math.sin(j * TAU / 5) * 3.6, 2.8, 2.8, k); elip(c, x, y, 2, 2, '#f59e0b'); }
  } else if (fondo === 'espacio') {
    const g = c.createLinearGradient(0, 0, 0, HH); g.addColorStop(0, '#080b24'); g.addColorStop(0.7, '#241a5a'); g.addColorStop(1, '#3b2677'); c.fillStyle = g; c.fillRect(0, 0, W, HH);
    for (let i = 0; i < 90; i++) { const x = R() * W, y = R() * 250, r = R() * 1.6 + 0.4; c.globalAlpha = 0.4 + R() * 0.6; elip(c, x, y, r, r, '#fff'); } c.globalAlpha = 1;
    elip(c, 310, 76, 38, 38, '#fb923c', '#c2410c', 2); c.save(); c.beginPath(); c.arc(310, 76, 37, 0, TAU); c.clip(); c.fillStyle = 'rgba(194,65,12,.45)'; c.fillRect(260, 66, 100, 8); c.fillRect(260, 84, 100, 5); c.restore();
    c.strokeStyle = '#fde68a'; c.lineWidth = 4; c.beginPath(); c.ellipse(310, 76, 62, 13, -0.35, 0, TAU); c.stroke();
    elip(c, 70, 70, 16, 16, '#cbd5e1', '#64748b', 2); elip(c, 65, 66, 4, 4, '#94a3b8'); elip(c, 77, 77, 3, 3, '#94a3b8');
    c.fillStyle = '#2b3566'; c.fillRect(0, 252, W, HH); c.strokeStyle = 'rgba(160,180,255,.25)'; c.lineWidth = 1; for (let i = 0; i < 14; i++) { c.beginPath(); c.moveTo(CX + (i - 7) * 14, 252); c.lineTo(CX + (i - 7) * 60, HH); c.stroke(); } for (let j = 0; j < 5; j++) { c.beginPath(); c.moveTo(0, 262 + j * j * 5 + j * 6); c.lineTo(W, 262 + j * j * 5 + j * 6); c.stroke(); }
  } else if (fondo === 'playa') {
    let g = c.createLinearGradient(0, 0, 0, 170); g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, '#e0f7ff'); c.fillStyle = g; c.fillRect(0, 0, W, HH);
    elip(c, 320, 52, 26, 26, '#fde047', '#facc15', 3);
    g = c.createLinearGradient(0, 150, 0, 240); g.addColorStop(0, '#22b8cf'); g.addColorStop(1, '#0e90b0'); c.fillStyle = g; c.fillRect(0, 150, W, 100);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2.5; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const x = (i * 78 + j * 31) % W, y = 164 + j * 20; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 6, x + 20, y); c.quadraticCurveTo(x + 30, y + 6, x + 40, y); c.stroke(); }
    c.fillStyle = '#f6e3b0'; c.beginPath(); c.moveTo(0, 238); c.quadraticCurveTo(200, 222, W, 240); c.lineTo(W, HH); c.lineTo(0, HH); c.fill(); g = c.createLinearGradient(0, 240, 0, HH); g.addColorStop(0, '#f6e3b0'); g.addColorStop(1, '#e8c987'); c.fillStyle = g; c.fillRect(0, 244, W, HH);
    c.strokeStyle = '#92400e'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(352, 270); c.quadraticCurveTo(346, 190, 362, 126); c.stroke(); c.lineCap = 'butt';
    for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) { c.strokeStyle = '#16a34a'; c.lineWidth = 7; c.beginPath(); c.moveTo(362, 126); c.quadraticCurveTo(362 + Math.cos(a) * 28, 118 + Math.sin(a) * 18, 362 + Math.cos(a) * 52, 132 + Math.sin(a) * 34 + 14); c.stroke(); }
    for (let i = 0; i < 20; i++) elip(c, R() * W, 262 + R() * 90, 2, 1.4, 'rgba(180,140,80,.6)'); elip(c, 52, 320, 11, 8, '#fda4af', '#be185d', 1.6); elip(c, 90, 340, 8, 6, '#fff', '#a8a29e', 1.4);
  } else if (fondo === 'cuarto') {
    c.fillStyle = '#ffd9e8'; c.fillRect(0, 0, W, 256); c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) c.fillRect(i * 36 + 6, 0, 16, 256);
    c.fillStyle = '#f9b6d2'; c.fillRect(0, 232, W, 24);
    c.fillStyle = '#bde0fe'; rrect(c, 28, 38, 112, 108, 8); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 7; c.stroke(); c.beginPath(); c.moveTo(84, 38); c.lineTo(84, 146); c.moveTo(28, 92); c.lineTo(140, 92); c.stroke();
    elip(c, 112, 66, 10, 10, '#fde047'); c.fillStyle = '#fff'; c.beginPath(); c.arc(50, 120, 14, 0, TAU); c.arc(68, 124, 11, 0, TAU); c.fill();
    c.fillStyle = '#f472b6'; c.beginPath(); c.moveTo(14, 30); c.quadraticCurveTo(34, 90, 12, 156); c.lineTo(32, 156); c.quadraticCurveTo(46, 90, 30, 30); c.fill(); c.beginPath(); c.moveTo(154, 30); c.quadraticCurveTo(134, 90, 156, 156); c.lineTo(136, 156); c.quadraticCurveTo(122, 90, 138, 30); c.fill();
    for (const [x, y, k] of [[210, 52, '#c4b5fd'], [276, 86, '#fde68a'], [340, 50, '#a7f3d0']]) { c.fillStyle = '#fff'; rrect(c, x, y, 50, 40, 4); c.fill(); c.strokeStyle = '#e9a8c3'; c.lineWidth = 3; c.stroke(); c.fillStyle = k; rrect(c, x + 6, y + 6, 38, 28, 3); c.fill(); }
    corazon(c, 372, 138, 14, '#fb7185'); corazon(c, 230, 130, 10, '#f472b6');
    const g = c.createLinearGradient(0, 256, 0, HH); g.addColorStop(0, '#e8b894'); g.addColorStop(1, '#d1976c'); c.fillStyle = g; c.fillRect(0, 256, W, HH); c.strokeStyle = 'rgba(120,70,30,.2)'; c.lineWidth = 1.5; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(0, 262 + i * 14); c.lineTo(W, 262 + i * 14); c.stroke(); }
    elip(c, CX, 322, 170, 30, '#f9a8d4', '#ec4899', 3); elip(c, CX, 322, 128, 21, null, 'rgba(255,255,255,.6)', 3);
  } else { // taller
    let g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#efeaf8'); g.addColorStop(1, '#dcd5ee'); c.fillStyle = g; c.fillRect(0, 0, W, 256);
    c.fillStyle = '#d3cbe8'; rrect(c, 18, 30, 196, 118, 8); c.fill(); c.fillStyle = '#b9afd6'; for (let y = 42; y < 146; y += 14) for (let x = 30; x < 210; x += 14) c.fillRect(x, y, 2.4, 2.4);
    c.strokeStyle = '#64748b'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(44, 50); c.lineTo(44, 112); c.stroke(); c.lineWidth = 3; c.strokeStyle = '#ef4444'; c.beginPath(); c.moveTo(44, 112); c.lineTo(44, 126); c.stroke();
    c.strokeStyle = '#475569'; c.lineWidth = 6; c.beginPath(); c.moveTo(80, 52); c.lineTo(80, 100); c.stroke(); elip(c, 80, 48, 11, 7, '#94a3b8', '#475569', 2); c.lineWidth = 3; c.strokeStyle = '#f59e0b'; c.beginPath(); c.moveTo(80, 100); c.lineTo(80, 128); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = '#78350f'; rrect(c, 112, 54, 5, 62, 2); c.fill(); c.fillStyle = '#94a3b8'; rrect(c, 100, 44, 30, 16, 3); c.fill(); c.strokeStyle = '#475569'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#64748b'; c.lineWidth = 5; c.beginPath(); c.arc(166, 74, 18, 0.2, 5.6); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(150, 90); c.lineTo(138, 120); c.stroke();
    c.fillStyle = '#a78b6c'; rrect(c, 14, 188, 176, 9, 3); c.fill(); c.fillStyle = '#7c6347'; c.fillRect(26, 197, 6, 14); c.fillRect(172, 197, 6, 14);
    for (const [x, k] of [[44, '#ef4444'], [84, '#3b82f6'], [124, '#22c55e'], [164, '#f59e0b']]) { elip(c, x, 170, 17, 17, k, 'rgba(0,0,0,.35)', 2); elip(c, x, 170, 6, 6, '#e5e7eb', 'rgba(0,0,0,.3)', 1.5); elip(c, x - 7, 163, 3, 2, 'rgba(255,255,255,.5)'); }
    g = c.createLinearGradient(0, 252, 0, HH); g.addColorStop(0, '#d9b88c'); g.addColorStop(1, '#b58b5c'); c.fillStyle = g; c.fillRect(0, 252, W, HH);
    c.strokeStyle = 'rgba(90,55,25,.22)'; c.lineWidth = 1.5; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(0, 262 + i * 15); c.lineTo(W, 262 + i * 15); c.stroke(); } for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(i * 47 + (i % 2) * 20, 252 + (i % 2) * 15); c.lineTo(i * 47 + (i % 2) * 20, 252 + (i % 2) * 15 + 15); c.stroke(); }
    c.fillStyle = '#9b7a56'; c.fillRect(0, 248, W, 6);
    // mesa y base de la impresora
    c.fillStyle = '#7c6347'; rrect(c, 286, 254, 114, 9, 3); c.fill(); c.fillRect(292, 262, 7, 40); c.fillRect(386, 262, 7, 40);
    c.fillStyle = '#334155'; rrect(c, 296, 226, 100, 30, 5); c.fill(); c.fillStyle = '#1e293b'; rrect(c, 302, 238, 44, 12, 3); c.fill();
    c.fillStyle = '#475569'; c.fillRect(304, 98, 8, 134); c.fillRect(380, 98, 8, 134); c.fillStyle = '#334155'; rrect(c, 300, 92, 92, 12, 4); c.fill();
    c.fillStyle = '#64748b'; rrect(c, 312, 222, 66, 8, 2); c.fill();
    elip(c, 346, 68, 22, 22, '#f59e0b', '#b45309', 2); elip(c, 346, 68, 7, 7, '#e5e7eb', '#78350f', 1.5); elip(c, 338, 60, 5, 3, 'rgba(255,255,255,.45)');
  }
}

// ---------- el módulo ----------
export function render(el, ctx) {
  const now0 = Date.now(), tCarga = now0;   // los eventos aleatorios no saltan hasta 2,5 min después de abrir
  // ===== estado =====
  let E, anteriorRoto = false;
  { const raw = leeLS(); E = raw ? L.sanear(raw, now0) : L.nuevo(now0); anteriorRoto = raw != null && raw.v !== L.VERSION; }
  let modo = 'sala';                 // sala | bano | gotas | memoria | evo
  let panel = null;                  // null | 'comer' | 'jugar' | 'tienda' | 'cartilla' | 'ajustes' | 'ayuda' | 'revision'
  const timers = new Set(), gTimers = new Set(), limpiezas = [];
  let muerto = false, raf = 0, ultimoFrame = 0, tickId = 0, ticks = 0;
  const S = {
    t: 0, blinkT: 2.2, blink: 0, look: { x: 0, y: 0 }, objetivo: null, sq: 0, sqv: 0, salto: 0, vsalto: 0, proxSalto: 2, mastica: 0, comida: null, parts: [], ultAnimo: null, ultDecir: 0,
    tz: 0, evo: null, evoPend: null, bano: null, G: null, M: null, juguete: null, hipoT: 0, zzzT: 0, moscaT: 0, bubbleTimer: 0, tPast: 0, pregunta: false, tapsTapa: 0, shake: 0
  };
  const noche = () => L.esNoche(Date.now());

  // ===== sonido (opcional, apagado por defecto; nunca suena sin un gesto previo del usuario) =====
  const au = { ctx: null };
  const gesto = () => { if (!E.sonido) return; try { if (!au.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) au.ctx = new C(); } if (au.ctx && au.ctx.state === 'suspended') au.ctx.resume().catch(() => { }); } catch (e) { } };
  function bip(f, d, tipo, v, retraso) {
    if (!E.sonido || !au.ctx || au.ctx.state !== 'running') return;
    try {
      const o = au.ctx.createOscillator(), g = au.ctx.createGain(), t0 = au.ctx.currentTime + (retraso || 0);
      o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t0); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v || 0.05, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g); g.connect(au.ctx.destination); o.start(t0); o.stop(t0 + d + 0.03);
    } catch (e) { }
  }
  const SFX = {
    toque: () => bip(700, 0.07), mimo: () => bip(520, 0.05, 'sine', 0.025), comer: () => { bip(330, 0.07); bip(440, 0.07, 'sine', 0.05, 0.09); }, ok: () => { bip(880, 0.07); bip(1320, 0.1, 'sine', 0.05, 0.08); },
    error: () => bip(180, 0.16, 'square', 0.025), logro: () => [523, 659, 784, 1047].forEach((f, i) => bip(f, 0.12, 'triangle', 0.05, i * 0.09)), evo: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => bip(f, 0.16, 'triangle', 0.05, i * 0.11)),
    agua: () => bip(1100 + Math.random() * 500, 0.04, 'sine', 0.02), gota: () => bip(1000, 0.05, 'sine', 0.04), mala: () => bip(150, 0.14, 'sawtooth', 0.03), dormir: () => { bip(440, 0.12); bip(330, 0.16, 'sine', 0.05, 0.14); }
  };
  const sfx = n => { try { SFX[n] && SFX[n](); } catch (e) { } };
  const MEM_F = [262, 330, 392, 523];

  // ===== DOM =====
  const canvas = h('canvas.mas-canvas', { width: 800, height: 720, tabindex: 0, role: 'img', 'aria-label': 'Bobi' });
  const c2 = canvas.getContext('2d');
  const hudCoins = h('div.mas-coins'), btnSnd = h('button.mas-snd', { type: 'button', onclick: () => alternaSonido() }, '🔇');
  const burbuja = h('div.mas-bubble', { role: 'status', 'aria-live': 'polite' });
  const ov = h('div.mas-ov');
  const stage = h('div.mas-stage', canvas, h('div.mas-hud', hudCoins, btnSnd), burbuja, ov);
  const sEmoji = h('span.mas-st-e', { 'aria-hidden': 'true' }), sTxt = h('b.mas-st-t'), sSub = h('span.mas-st-s');
  const status = h('div.mas-status', { role: 'status' }, sEmoji, h('div.mas-st-c', sTxt, sSub));
  const eggBox = h('div.mas-egg');
  const bars = {}, barsBox = h('div.mas-bars', { role: 'group', 'aria-label': 'Necesidades de ' + E.nombre });
  for (const k of L.NEC) {
    const inf = L.NEC_INFO[k], fill = h('i'), num = h('b.mas-bn', '100');
    const bar = h('div.mas-bar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '100', 'aria-label': inf.aria + ' 100 de 100', 'data-k': k }, h('span.mas-bi', { 'aria-hidden': 'true' }, inf.emoji), h('span.mas-bl', inf.nombre), h('div.mas-track', fill), num);
    bars[k] = { bar, fill, num }; barsBox.append(bar);
  }
  const ACC = [
    ['comer', '🍽️', 'Comer', 'Dar de comer'], ['jugar', '🎮', 'Jugar', 'Jugar con Bobi'], ['banar', '🛁', 'Bañar', 'Bañar a Bobi'], ['luz', '💡', 'Luz', 'Apagar o encender la luz'], ['curar', '💊', 'Curar', 'Dar medicina'],
    ['revision', '🩺', 'Revisión', 'Revisión médica'], ['tienda', '🛍️', 'Tienda', 'Tienda de ropa y juguetes'], ['cartilla', '📒', 'Cartilla', 'Cartilla de Bobi'], ['ajustes', '⚙️', 'Ajustes', 'Nombre, color y sonido'], ['ayuda', '❓', 'Ayuda', 'Cómo se juega']
  ];
  const accBtn = {};
  const actions = h('div.mas-actions', { role: 'group', 'aria-label': 'Acciones' }, ACC.map(([id, em, tx, ar]) => { const b = h('button.mas-act', { type: 'button', 'data-acc': id, 'aria-label': ar, title: ar, onclick: () => clicAccion(id) }, h('span.mas-ai', { 'aria-hidden': 'true' }, em), h('span.mas-al', tx)); accBtn[id] = b; return b; }));
  const ctl = h('div.mas-ctl');
  const root = h('div.mas', h('div.mas-col1', stage, status), ctl);
  el.append(root);

  // ===== utilidades de interfaz =====
  function decir(texto, ms) {
    if (!texto) return; burbuja.textContent = texto; burbuja.classList.add('on'); S.ultDecir = Date.now(); clearTimeout(S.bubbleTimer);
    S.bubbleTimer = setTimeout(() => burbuja.classList.remove('on'), ms || 4200);
  }
  const decirAnimo = () => { const a = L.animo(E); decir(a.burbujas[Math.floor(Math.random() * a.burbujas.length)], 4500); };
  function timeoutJ(fn, ms) { const id = setTimeout(() => { gTimers.delete(id); if (!muerto) fn(); }, ms); gTimers.add(id); return id; }
  function timeout(fn, ms) { const id = setTimeout(() => { timers.delete(id); if (!muerto) fn(); }, ms); timers.add(id); return id; }
  const guarda = () => escribeLS(E);
  function logros() {
    const r = L.comprobarLogros(E, Date.now());
    if (r.nuevos.length) { E = r.e; r.nuevos.forEach((id, i) => { const l = L.LOGROS.find(x => x.id === id); timeout(() => { toast('⭐ Logro: ' + l.nombre + ' · ' + l.desc, 'ok'); }, i * 400); }); sfx('logro'); }
  }
  // aplica el resultado de una acción de la lógica
  function aplica(res, o) {
    o = o || {};
    if (!res.ok) { if (res.msg) decir(res.msg); if (res.msg) { sfx('error'); S.shake = 0.4; } return res; }
    E = res.e; if (res.msg && !o.silencio) decir(res.msg);
    logros(); guarda(); pinta(); return res;
  }
  function resuelve(accion, extra) { const r = L.resolverEvento(E, accion, extra); if (r.resuelto) { E = r.e; decir(r.msg, 5000); sfx('ok'); for (let i = 0; i < 5; i++) part('chispa', CX + rr(-40, 40), 170 + rr(-20, 20)); guarda(); pinta(); } }

  // ===== partículas =====
  function part(tipo, x, y, extra) {
    if (S.parts.length > 160) return;
    const p = Object.assign({ tipo, x, y, vx: rr(-25, 25), vy: rr(-60, -30), vida: 1.4, max: 1.4, s: 1, r: rr(0, TAU), col: '#f43f5e' }, extra || {});
    if (tipo === 'corazon') { p.vy = rr(-70, -40); p.col = ['#f43f5e', '#fb7185', '#ec4899'][Math.floor(Math.random() * 3)]; p.s = rr(7, 11); }
    else if (tipo === 'zzz') { p.vx = 14; p.vy = -22; p.vida = p.max = 2.6; p.s = rr(12, 16); }
    else if (tipo === 'chispa') { p.vy = rr(-90, -30); p.vx = rr(-60, 60); p.vida = p.max = 1.0; p.s = rr(4, 8); p.col = ['#fde047', '#fbbf24', '#fff'][Math.floor(Math.random() * 3)]; }
    else if (tipo === 'burbuja') { p.vy = rr(-45, -20); p.vx = rr(-10, 10); p.vida = p.max = rr(1.2, 2.2); p.s = rr(5, 13); }
    else if (tipo === 'miga') { p.vy = rr(-70, -20); p.vx = rr(-50, 50); p.vida = p.max = 0.8; p.s = rr(2, 4); p.col = extra && extra.col || '#d97706'; p.g = 260; }
    else if (tipo === 'gota') { p.vx = rr(-10, 10); p.vy = 20; p.vida = p.max = 1.0; p.s = 4; p.g = 160; p.col = '#7dd3fc'; }
    else if (tipo === 'texto') { p.vx = 0; p.vy = -34; p.vida = p.max = 1.2; p.s = 15; }
    else if (tipo === 'moneda') { p.vy = rr(-130, -80); p.vx = rr(-50, 50); p.vida = p.max = 1.0; p.s = 7; p.g = 340; }
    if (extra && extra.vida) p.max = extra.vida;
    S.parts.push(p);
  }
  function updParts(dt) {
    for (const p of S.parts) { p.vida -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; if (p.tipo === 'corazon' || p.tipo === 'burbuja') p.x += Math.sin((p.max - p.vida) * 4 + p.r) * 12 * dt; }
    S.parts = S.parts.filter(p => p.vida > 0);
  }
  function drawParts(c) {
    for (const p of S.parts) {
      const a = clamp(p.vida / p.max * 1.6, 0, 1);
      if (p.tipo === 'corazon') corazon(c, p.x, p.y, p.s * (0.8 + 0.2 * Math.min(1, (p.max - p.vida) * 5)), p.col, a);
      else if (p.tipo === 'zzz') { c.save(); c.globalAlpha = a; c.fillStyle = '#e0e7ff'; c.strokeStyle = '#4338ca'; c.lineWidth = 3; c.font = '800 ' + (p.s + (p.max - p.vida) * 4) + 'px system-ui, sans-serif'; c.strokeText('z', p.x, p.y); c.fillText('z', p.x, p.y); c.restore(); }
      else if (p.tipo === 'chispa') chispa(c, p.x, p.y, p.s, p.col, a, p.r + (p.max - p.vida) * 3);
      else if (p.tipo === 'burbuja') { c.save(); c.globalAlpha = a * 0.9; elip(c, p.x, p.y, p.s, p.s, 'rgba(255,255,255,.55)', 'rgba(125,190,255,.9)', 1.5); elip(c, p.x - p.s * 0.35, p.y - p.s * 0.35, p.s * 0.22, p.s * 0.22, '#fff'); c.restore(); }
      else if (p.tipo === 'miga') { c.save(); c.globalAlpha = a; elip(c, p.x, p.y, p.s, p.s, p.col); c.restore(); }
      else if (p.tipo === 'gota') { c.save(); c.globalAlpha = a; elip(c, p.x, p.y, 3, 4.5, p.col, '#0369a1', 1); c.restore(); }
      else if (p.tipo === 'moneda') { c.save(); c.globalAlpha = a; elip(c, p.x, p.y, p.s, p.s, '#fbbf24', '#b45309', 1.8); c.fillStyle = '#b45309'; c.font = '800 9px system-ui'; c.textAlign = 'center'; c.fillText('€', p.x, p.y + 3.4); c.restore(); }
      else if (p.tipo === 'texto') { c.save(); c.globalAlpha = a; c.font = '800 ' + p.s + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.55)'; c.fillStyle = p.col; c.strokeText(p.txt, p.x, p.y); c.fillText(p.txt, p.x, p.y); c.restore(); }
    }
  }

  // ===== geometría de Bobi (para dibujar y para pulsar encima) =====
  function geo() {
    if (E.etapa === 'huevo') return { cx: CX, cy: GROUND - 56 - S.salto, rx: 44, ry: 58, R: 44 };
    const d = DIM[E.etapa] || DIM.nino, R = d.R; return { cx: CX, cy: GROUND - R * d.ky - S.salto, rx: R * d.kx, ry: R * d.ky, R };
  }

  // ===== dibujo de Bobi =====
  const MANCHAS = [[-0.45, -0.35], [0.5, -0.2], [-0.25, 0.45], [0.38, 0.5], [-0.62, 0.12], [0.12, -0.62], [0.65, 0.22], [-0.05, 0.08]];
  function dibujaHuevo(c, o, col) {
    const prog = L.huevoProg(E), rx = 44, ry = 58;
    c.save(); c.translate(o.x, o.y - o.salto); c.rotate(o.rot || 0); c.scale(1 + o.sq * 0.7, 1 - o.sq * 0.7);
    const forma = () => { c.beginPath(); c.moveTo(0, -ry); c.bezierCurveTo(rx * 1.08, -ry, rx * 1.12, ry * 0.9, 0, ry); c.bezierCurveTo(-rx * 1.12, ry * 0.9, -rx * 1.08, -ry, 0, -ry); c.closePath(); };
    c.translate(0, -ry);
    const g = c.createRadialGradient(-rx * 0.4, -ry * 0.4, 4, 0, 0, ry * 1.1); g.addColorStop(0, col.luz); g.addColorStop(0.55, col.base); g.addColorStop(1, col.sombra);
    forma(); c.fillStyle = g; c.fill(); c.save(); forma(); c.clip();
    c.strokeStyle = 'rgba(0,0,0,.11)'; c.lineWidth = 1.6; for (let i = 1; i < 11; i++) { const y = -ry + i * (2 * ry / 11); c.beginPath(); c.moveTo(-rx * 1.2, y); c.quadraticCurveTo(0, y + 7, rx * 1.2, y); c.stroke(); }
    for (const [x, y, r] of [[-18, -22, 5], [14, -4, 4], [-8, 24, 6], [20, 28, 4], [-26, 6, 3.5], [6, -34, 3.5]]) elip(c, x, y, r, r * 0.8, 'rgba(255,255,255,.28)');
    c.restore(); forma(); c.lineWidth = 3.2; c.strokeStyle = col.sombra; c.stroke();
    elip(c, -rx * 0.42, -ry * 0.45, rx * 0.2, ry * 0.12, 'rgba(255,255,255,.55)', null, 0, -0.7);
    // grietas según el calor acumulado
    c.strokeStyle = '#1e1b2e'; c.lineWidth = 2.6; c.lineJoin = 'round'; c.lineCap = 'round';
    const grieta = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); };
    if (prog > 0.2) grieta([[-6, -ry * 0.62], [2, -ry * 0.5], [-4, -ry * 0.4], [6, -ry * 0.3]]);
    if (prog > 0.45) grieta([[6, -ry * 0.3], [18, -ry * 0.22], [24, -ry * 0.1]]);
    if (prog > 0.65) grieta([[-4, -ry * 0.4], [-18, -ry * 0.3], [-22, -ry * 0.12], [-30, -ry * 0.05]]);
    if (prog > 0.85) grieta([[-30, -ry * 0.05], [-14, ry * 0.08], [0, 0], [14, ry * 0.1], [24, -ry * 0.1]]);
    if (prog > 0.5) { const b = o.blink; c.save(); c.translate(0, ry * 0.12); for (const sx of [-1, 1]) { elip(c, sx * 13, 0, 5.2, 5.4 * (1 - b * 0.9), '#fff', '#1f2937', 1.4); elip(c, sx * 13 + o.look.x * 1.5, o.look.y * 1.2, 2.4, 2.4 * (1 - b * 0.9), '#1f2937'); } c.restore(); }
    c.restore();
  }

  function dibujaBobi(c, o) {
    const col = L.COLORES[o.color] || L.COLORES.violeta;
    if (o.etapa === 'huevo') return dibujaHuevo(c, o, col);
    const DM = DIM[o.etapa] || DIM.nino, R = DM.R, rx = R * DM.kx, ry = R * DM.ky, et = L.ETAPA_IDS.indexOf(o.etapa);
    const mood = o.mood, dorm = mood === 'durmiendo';
    const resp = Math.sin(o.t * (dorm ? 1.4 : 2.4)) * (dorm ? 0.03 : 0.02);
    const sx = 1 + o.sq - resp * 0.5, sy = 1 - o.sq + resp;
    c.save(); c.translate(o.x, o.y - o.salto); c.rotate(o.rot || 0); c.scale((o.esc || 1) * sx, (o.esc || 1) * sy); c.translate(0, -ry);
    const P = o.puesto || {};
    c.lineJoin = 'round'; c.lineCap = 'round';
    // capa (detrás)
    if (P.ropa === 'capa') { const w = Math.sin(o.t * 3) * 5; c.beginPath(); c.moveTo(-rx * 0.62, -ry * 0.28); c.lineTo(rx * 0.62, -ry * 0.28); c.quadraticCurveTo(rx * 1.12 + w, ry * 0.5, rx * 1.0 + w, ry * 1.04); c.lineTo(-rx * 1.0 - w, ry * 1.04); c.quadraticCurveTo(-rx * 1.12 - w, ry * 0.5, -rx * 0.62, -ry * 0.28); c.closePath(); c.fillStyle = '#dc2626'; c.fill(); c.strokeStyle = '#7f1d1d'; c.lineWidth = 2.5; c.stroke(); }
    // pies y orejas (detrás del cuerpo)
    if (et >= 2) for (const s of [-1, 1]) elip(c, s * rx * 0.4, ry * 0.97, R * 0.2, R * 0.12, col.sombra, '#00000033', 1.5);
    if (et >= 3) for (const s of [-1, 1]) { elip(c, s * rx * 0.7, -ry * 0.66, R * 0.17, R * 0.23, col.base, col.sombra, 2.5, s * 0.5); elip(c, s * rx * 0.7, -ry * 0.64, R * 0.08, R * 0.13, col.luz, null, 0, s * 0.5); }
    // brazos (detrás: asoman por los lados)
    if (et >= 3) { const ex = ['emocionado', 'feliz'].includes(mood), w = ex ? Math.sin(o.t * 9) * 0.4 : o.hipo ? Math.sin(o.t * 12) * 0.1 : Math.sin(o.t * 1.6) * 0.06; for (const s of [-1, 1]) { c.save(); c.translate(s * rx * 0.98, ry * 0.2); c.rotate(s * (0.75 + (ex ? 0.8 : 0)) + s * w); elip(c, 0, R * 0.16, R * 0.15, R * 0.3, col.base, col.sombra, 2.5); elip(c, 0, R * 0.38, R * 0.12, R * 0.1, col.luz, null, 0); c.restore(); } }
    // cuerpo
    const cuerpo = () => { c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); };
    const g = c.createRadialGradient(-rx * 0.38, -ry * 0.45, R * 0.1, 0, 0, R * 1.18); g.addColorStop(0, col.luz); g.addColorStop(0.5, col.base); g.addColorStop(1, col.sombra);
    cuerpo(); c.fillStyle = g; c.fill();
    c.save(); cuerpo(); c.clip();
    c.strokeStyle = 'rgba(0,0,0,.09)'; c.lineWidth = 1.5; const nL = 5 + et * 2; for (let i = 1; i < nL; i++) { const y = -ry + i * (2 * ry / nL); c.beginPath(); c.moveTo(-rx * 1.1, y); c.quadraticCurveTo(0, y + R * 0.1, rx * 1.1, y); c.stroke(); }
    elip(c, 0, ry * 0.5, rx * 0.62, ry * 0.46, 'rgba(255,255,255,.2)');
    if (et >= 3) { for (let i = 0; i < 3; i++) { const bw = R * (0.34 - i * 0.07); c.fillStyle = 'rgba(255,255,255,' + (0.5 - i * 0.08) + ')'; rrect(c, -bw / 2, ry * 0.66 + i * R * 0.085, bw, R * 0.065, R * 0.03); c.fill(); } }
    // ropa que se ajusta al cuerpo
    if (P.ropa === 'camiseta') { c.fillStyle = '#f0f9ff'; c.fillRect(-rx, ry * 0.34, rx * 2, ry); c.fillStyle = '#38bdf8'; for (let i = 0; i < 5; i++) c.fillRect(-rx, ry * 0.44 + i * ry * 0.2, rx * 2, ry * 0.09); c.strokeStyle = '#0369a1'; c.lineWidth = 2; c.beginPath(); c.moveTo(-rx, ry * 0.34); c.quadraticCurveTo(0, ry * 0.5, rx, ry * 0.34); c.stroke(); }
    if (P.ropa === 'peto') { c.fillStyle = '#2563eb'; c.fillRect(-rx, ry * 0.42, rx * 2, ry); c.fillRect(-rx * 0.34, ry * 0.12, R * 0.1, ry * 0.4); c.fillRect(rx * 0.34 - R * 0.1, ry * 0.12, R * 0.1, ry * 0.4); c.fillStyle = '#1d4ed8'; c.fillRect(-rx * 0.3, ry * 0.55, rx * 0.6, ry * 0.32); c.strokeStyle = '#93c5fd'; c.lineWidth = 1.5; c.strokeRect(-rx * 0.3, ry * 0.55, rx * 0.6, ry * 0.32); elip(c, -rx * 0.29, ry * 0.2, 3, 3, '#fde047', '#a16207', 1); elip(c, rx * 0.29, ry * 0.2, 3, 3, '#fde047', '#a16207', 1); }
    // suciedad
    const nm = o.manchas != null ? o.manchas : (o.higiene < 60 ? Math.min(7, Math.ceil((100 - o.higiene) / 12)) : 0);
    for (let i = 0; i < nm; i++) { const [ux, uy] = MANCHAS[i % MANCHAS.length], a = o.manchaHp ? o.manchaHp[i] : 1; if (a <= 0) continue; c.globalAlpha = clamp(a, 0, 1) * 0.85; elip(c, ux * rx, uy * ry, R * 0.12 + (i % 3) * 2, R * 0.09 + (i % 2) * 2, '#6b4423'); elip(c, ux * rx + 3, uy * ry - 2, R * 0.05, R * 0.04, '#8b5a2b'); c.globalAlpha = 1; }
    // tinte verdoso de enfermo/empachado
    const EXP = EXPR[mood] || EXPR.normal;
    if (EXP.verde) { c.fillStyle = 'rgba(163,230,53,' + EXP.verde * 0.75 + ')'; c.fillRect(-rx, -ry, rx * 2, ry * 2); }
    c.restore();
    cuerpo(); c.lineWidth = 3.4; c.strokeStyle = col.sombra; c.stroke();
    elip(c, -rx * 0.5, -ry * 0.5, rx * 0.13, ry * 0.2, 'rgba(255,255,255,.5)', null, 0, 0.6);
    // copete de filamento
    const sw = Math.sin(o.t * 2.1) * 3;
    c.beginPath(); c.moveTo(0, -ry + 3); c.bezierCurveTo(-R * 0.2 + sw, -ry - R * 0.3, R * 0.3 + sw, -ry - R * 0.45, R * 0.12 + sw, -ry - R * 0.6); c.bezierCurveTo(R * 0.0 + sw, -ry - R * 0.7, -R * 0.12 + sw, -ry - R * 0.5, R * 0.05 + sw, -ry - R * 0.45);
    c.lineWidth = R * 0.14 + 3; c.strokeStyle = col.sombra; c.stroke(); c.lineWidth = R * 0.14; c.strokeStyle = col.base; c.stroke();
    if (et >= 4) { c.beginPath(); c.moveTo(-R * 0.18, -ry + 6); c.bezierCurveTo(-R * 0.45 + sw, -ry - R * 0.12, -R * 0.5 + sw, -ry - R * 0.4, -R * 0.3 + sw, -ry - R * 0.42); c.lineWidth = R * 0.1 + 3; c.strokeStyle = col.sombra; c.stroke(); c.lineWidth = R * 0.1; c.strokeStyle = col.base; c.stroke(); }
    // cara
    cara(c, o, EXP, R, rx, ry, col);
    // ropa del cuello
    if (P.cuello === 'pajarita') { const y = ry * 0.74; c.fillStyle = '#dc2626'; c.strokeStyle = '#7f1d1d'; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, y); c.lineTo(s * R * 0.3, y - R * 0.13); c.lineTo(s * R * 0.3, y + R * 0.13); c.closePath(); c.fill(); c.stroke(); } elip(c, 0, y, R * 0.07, R * 0.08, '#b91c1c', '#7f1d1d', 1.5); }
    if (P.cuello === 'corbata') { const y = ry * 0.66; c.fillStyle = '#2563eb'; c.strokeStyle = '#1e3a8a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * 0.08, y); c.lineTo(R * 0.08, y); c.lineTo(R * 0.14, y + R * 0.2); c.lineTo(0, ry * 1.0); c.lineTo(-R * 0.14, y + R * 0.2); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#60a5fa'; c.beginPath(); c.moveTo(-R * 0.1, y + R * 0.1); c.lineTo(R * 0.1, y + R * 0.05); c.lineTo(R * 0.12, y + R * 0.11); c.lineTo(-R * 0.08, y + R * 0.16); c.fill(); elip(c, 0, y, R * 0.1, R * 0.07, '#1d4ed8', '#1e3a8a', 1.5); }
    if (P.cuello === 'bufanda') { c.beginPath(); c.moveTo(-rx * 0.84, ry * 0.46); c.quadraticCurveTo(0, ry * 1.08, rx * 0.84, ry * 0.46); c.lineWidth = R * 0.2; c.strokeStyle = '#7f1d1d'; c.stroke(); c.lineWidth = R * 0.14; c.strokeStyle = '#ef4444'; c.stroke(); c.setLineDash([R * 0.1, R * 0.1]); c.lineWidth = R * 0.14; c.strokeStyle = '#fef2f2'; c.stroke(); c.setLineDash([]); c.fillStyle = '#ef4444'; c.strokeStyle = '#7f1d1d'; c.lineWidth = 2; rrect(c, rx * 0.4, ry * 0.7, R * 0.2, R * 0.38, 4); c.fill(); c.stroke(); c.fillStyle = '#fef2f2'; c.fillRect(rx * 0.4 + 1, ry * 0.7 + R * 0.12, R * 0.2 - 2, R * 0.06); }
    // gafas
    const ey = -ry * 0.12, ex = rx * 0.33;
    if (P.gafas) { const rg = R * 0.19 * 1.4; c.lineWidth = 3; c.strokeStyle = '#1f2937';
      if (P.gafas === 'gafas') { for (const s of [-1, 1]) { elip(c, s * ex, ey, rg, rg, 'rgba(186,230,253,.28)', '#1f2937', 3); } c.beginPath(); c.moveTo(-ex + rg, ey); c.lineTo(ex - rg, ey); c.stroke(); c.beginPath(); c.moveTo(-ex - rg, ey); c.lineTo(-rx * 0.97, ey - 3); c.moveTo(ex + rg, ey); c.lineTo(rx * 0.97, ey - 3); c.stroke(); }
      if (P.gafas === 'sol') { for (const s of [-1, 1]) { rrect(c, s * ex - rg * 1.05, ey - rg * 0.85, rg * 2.1, rg * 1.7, rg * 0.6); c.fillStyle = '#111827'; c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(s * ex - rg * 0.6, ey - rg * 0.3); c.lineTo(s * ex - rg * 0.2, ey - rg * 0.6); c.stroke(); c.strokeStyle = '#1f2937'; c.lineWidth = 3; } c.beginPath(); c.moveTo(-ex + rg, ey - rg * 0.2); c.lineTo(ex - rg, ey - rg * 0.2); c.stroke(); c.beginPath(); c.moveTo(-ex - rg, ey); c.lineTo(-rx * 0.97, ey - 3); c.moveTo(ex + rg, ey); c.lineTo(rx * 0.97, ey - 3); c.stroke(); }
      if (P.gafas === 'corazon') { for (const s of [-1, 1]) { corazon(c, s * ex, ey + rg * 0.1, rg * 1.35, '#f43f5e'); c.save(); c.translate(s * ex, ey + rg * 0.1); c.scale(rg * 1.35, rg * 1.35); c.beginPath(); c.moveTo(0, 0.55); c.bezierCurveTo(-1.3, -0.2, -0.7, -1.05, 0, -0.4); c.bezierCurveTo(0.7, -1.05, 1.3, -0.2, 0, 0.55); c.restore(); c.strokeStyle = '#9f1239'; c.lineWidth = 2.5; c.stroke(); elip(c, s * ex - rg * 0.4, ey - rg * 0.4, rg * 0.2, rg * 0.12, 'rgba(255,255,255,.7)'); } c.strokeStyle = '#9f1239'; c.lineWidth = 3; c.beginPath(); c.moveTo(-ex + rg * 0.5, ey - rg * 0.2); c.lineTo(ex - rg * 0.5, ey - rg * 0.2); c.stroke(); } }
    // sombreros
    const Y0 = -ry * 0.9;
    if (P.sombrero) { c.save(); c.translate(0, Y0); c.rotate(-0.06); c.lineWidth = 3; c.strokeStyle = '#1f2937';
      if (P.sombrero === 'gorra') { c.beginPath(); c.ellipse(0, 6, rx * 0.72, ry * 0.46, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#ef4444'; c.fill(); c.strokeStyle = '#7f1d1d'; c.stroke(); c.beginPath(); c.moveTo(rx * 0.05, 5); c.quadraticCurveTo(rx * 0.7, -2, rx * 1.02, 8); c.quadraticCurveTo(rx * 0.7, 14, rx * 0.05, 11); c.closePath(); c.fillStyle = '#b91c1c'; c.fill(); c.stroke(); elip(c, 0, -ry * 0.44, 4, 4, '#7f1d1d'); }
      if (P.sombrero === 'fiesta') { c.beginPath(); c.moveTo(-rx * 0.38, 8); c.lineTo(rx * 0.38, 8); c.lineTo(0, -ry * 0.82); c.closePath(); const gg = c.createLinearGradient(-rx * 0.4, 0, rx * 0.4, 0); gg.addColorStop(0, '#f472b6'); gg.addColorStop(1, '#ec4899'); c.fillStyle = gg; c.fill(); c.strokeStyle = '#9d174d'; c.stroke(); c.save(); c.clip(); c.fillStyle = '#fde047'; for (let i = 0; i < 3; i++) { c.save(); c.translate(0, -ry * 0.12 - i * ry * 0.26); c.rotate(-0.3); c.fillRect(-rx, 0, rx * 2, ry * 0.1); c.restore(); } c.restore(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; elip(c, Math.cos(a) * 5, -ry * 0.83 + Math.sin(a) * 5, 3.2, 3.2, '#fff'); } elip(c, 0, -ry * 0.83, 5, 5, '#fff', '#9d174d', 1.5); }
      if (P.sombrero === 'casco') { c.beginPath(); c.ellipse(0, 8, rx * 0.74, ry * 0.52, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#facc15'; c.fill(); c.strokeStyle = '#a16207'; c.stroke(); c.fillStyle = '#fde68a'; rrect(c, -rx * 0.1, -ry * 0.46, rx * 0.2, ry * 0.46, 3); c.fill(); c.strokeStyle = '#a16207'; c.lineWidth = 2; c.stroke(); c.lineWidth = 3; rrect(c, -rx * 0.86, 4, rx * 1.72, ry * 0.13, 5); c.fillStyle = '#eab308'; c.fill(); c.strokeStyle = '#a16207'; c.stroke(); }
      if (P.sombrero === 'copa') { elip(c, 0, 8, rx * 0.82, ry * 0.12, '#111827', '#000', 2); c.fillStyle = '#1f2937'; rrect(c, -rx * 0.46, -ry * 0.72, rx * 0.92, ry * 0.78, 4); c.fill(); c.strokeStyle = '#000'; c.stroke(); elip(c, 0, -ry * 0.72, rx * 0.46, ry * 0.08, '#374151', '#000', 2); c.fillStyle = '#a855f7'; c.fillRect(-rx * 0.46 + 1.5, -ry * 0.14, rx * 0.92 - 3, ry * 0.14); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-rx * 0.34, -ry * 0.68, rx * 0.1, ry * 0.5); }
      if (P.sombrero === 'corona') { c.beginPath(); c.moveTo(-rx * 0.5, 8); c.lineTo(-rx * 0.56, -ry * 0.4); c.lineTo(-rx * 0.28, -ry * 0.16); c.lineTo(0, -ry * 0.5); c.lineTo(rx * 0.28, -ry * 0.16); c.lineTo(rx * 0.56, -ry * 0.4); c.lineTo(rx * 0.5, 8); c.closePath(); const gg = c.createLinearGradient(0, -ry * 0.5, 0, 8); gg.addColorStop(0, '#fde047'); gg.addColorStop(1, '#f59e0b'); c.fillStyle = gg; c.fill(); c.strokeStyle = '#92400e'; c.stroke(); elip(c, 0, -ry * 0.05, 4.5, 4.5, '#ef4444', '#7f1d1d', 1.4); elip(c, -rx * 0.28, -ry * 0.02, 3.4, 3.4, '#3b82f6', '#1e3a8a', 1.2); elip(c, rx * 0.28, -ry * 0.02, 3.4, 3.4, '#22c55e', '#14532d', 1.2); for (const [x, y] of [[-rx * 0.56, -ry * 0.4], [0, -ry * 0.5], [rx * 0.56, -ry * 0.4]]) elip(c, x, y, 3.4, 3.4, '#fff7ed', '#92400e', 1.4); }
      c.restore(); }
    // efectos del ánimo
    if (EXP.fiebre) { c.save(); c.translate(-rx * 0.46, -ry * 0.66); c.rotate(-0.6); c.fillStyle = '#fcd9a8'; c.strokeStyle = '#b9854a'; c.lineWidth = 2; rrect(c, -R * 0.2, -R * 0.07, R * 0.4, R * 0.14, R * 0.06); c.fill(); c.stroke(); c.fillStyle = '#e8b676'; c.fillRect(-R * 0.06, -R * 0.07, R * 0.12, R * 0.14); c.restore(); }
    if (EXP.espiral) { for (let i = 0; i < 3; i++) { const a = o.t * 3 + i * 2.1; chispa(c, Math.cos(a) * rx * 0.7, -ry - R * 0.2 + Math.sin(a) * 9, 5, '#fde047', 0.95, a); } }
    if (EXP.moscas) { for (let i = 0; i < 3; i++) { const a = o.t * (2.2 + i * 0.4) + i * 2.1, mx = Math.cos(a) * rx * 0.95, my = -ry * 0.95 + Math.sin(a * 1.7) * 14 - i * 6; elip(c, mx, my, 2.8, 2.2, '#111827'); const al = Math.sin(o.t * 40 + i) * 2; elip(c, mx - 2, my - 3 - al, 3, 1.6, 'rgba(255,255,255,.8)', '#64748b', 0.6, -0.5); elip(c, mx + 2, my - 3 - al, 3, 1.6, 'rgba(255,255,255,.8)', '#64748b', 0.6, 0.5); }
      c.strokeStyle = 'rgba(101,163,13,.7)'; c.lineWidth = 2.4; for (const s of [-1, 1]) { c.beginPath(); const bx = s * rx * 0.95, by = -ry * 0.3 + Math.sin(o.t * 3 + s) * 3; c.moveTo(bx, by + 18); c.bezierCurveTo(bx + 8, by + 8, bx - 8, by - 2, bx, by - 14); c.stroke(); } }
    c.restore();
  }

  const EXPR = {
    normal: { ojos: 'abiertos', boca: 'sonrisa', rubor: 0.35 }, contento: { ojos: 'abiertos', boca: 'sonrisa', cejas: 'alegres', rubor: 0.55 }, feliz: { ojos: 'feliz', boca: 'abierta', rubor: 0.8 },
    emocionado: { ojos: 'brillo', boca: 'abierta', rubor: 0.9 }, aburrido: { ojos: 'medio', mira: 'lado', boca: 'plana', rubor: 0.12 }, hambriento: { ojos: 'abiertos', boca: 'hambre', cejas: 'tristes', rubor: 0.15, ruidos: true },
    cansado: { ojos: 'medio', boca: 'bostezo', ojeras: true, rubor: 0.1 }, sucio: { ojos: 'abiertos', boca: 'ondulada', cejas: 'tristes', rubor: 0.1, moscas: true },
    enfermo: { ojos: 'medio', boca: 'ondulada', cejas: 'tristes', verde: 0.3, rubor: 0, fiebre: true, sudor: true }, triste: { ojos: 'triste', boca: 'triste', cejas: 'tristes', rubor: 0.12, lagrima: true },
    enfadado: { ojos: 'enfado', boca: 'enfado', cejas: 'enfado', rubor: 0.75, rojo: true }, mareado: { ojos: 'espiral', boca: 'ondulada', rubor: 0.2, espiral: true }, empachado: { ojos: 'apretados', boca: 'ondulada', verde: 0.34, rubor: 0, sudor: true },
    durmiendo: { ojos: 'cerrados', boca: 'dormido', rubor: 0.4 }
  };
  function cara(c, o, EXP, R, rx, ry, col) {
    const ey = -ry * 0.12, ex = rx * 0.33, er = R * (o.etapa === 'bebe' ? 0.2 : o.etapa === 'nino' ? 0.185 : 0.17), tinta = '#2b2140';
    const look = EXP.mira === 'lado' ? { x: Math.sin(o.t * 0.7) * 1, y: 0.1 } : o.look, bl = o.blink;
    // mejillas
    const rub = EXP.rubor || 0; if (rub > 0) for (const s of [-1, 1]) elip(c, s * rx * 0.6, ry * 0.2, R * 0.14, R * 0.085, EXP.rojo ? 'rgba(239,68,68,' + rub + ')' : 'rgba(255,92,150,' + rub * 0.7 + ')');
    // cejas
    c.lineWidth = Math.max(2.6, R * 0.05); c.strokeStyle = tinta;
    if (EXP.cejas === 'tristes') for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * (ex + er * 1.15), ey - er * 1.45 + er * 0.35); c.lineTo(s * (ex - er * 0.95), ey - er * 2.05); c.stroke(); }
    if (EXP.cejas === 'enfado') for (const s of [-1, 1]) { c.lineWidth = Math.max(3.4, R * 0.062); c.beginPath(); c.moveTo(s * (ex + er * 1.25), ey - er * 1.9); c.lineTo(s * (ex - er * 1.0), ey - er * 1.0); c.stroke(); }
    if (EXP.cejas === 'alegres') for (const s of [-1, 1]) { c.beginPath(); c.arc(s * ex, ey - er * 0.9, er * 1.3, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
    // ojos
    for (const s of [-1, 1]) {
      const x = s * ex, k = EXP.ojos; c.lineWidth = Math.max(3, R * 0.06); c.strokeStyle = tinta;
      if (k === 'feliz') { c.beginPath(); c.arc(x, ey + er * 0.35, er * 0.95, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); }
      else if (k === 'cerrados') { c.beginPath(); c.arc(x, ey - er * 0.35, er * 0.95, Math.PI * 0.12, Math.PI * 0.88); c.stroke(); }
      else if (k === 'apretados') { c.beginPath(); c.moveTo(x - s * er * 0.8, ey - er * 0.7); c.lineTo(x + s * er * 0.6, ey); c.lineTo(x - s * er * 0.8, ey + er * 0.7); c.stroke(); }
      else if (k === 'espiral') { c.lineWidth = 2.4; c.beginPath(); for (let i = 0; i <= 44; i++) { const a = i * 0.42 + o.t * 6 * s, rad = er * 0.95 * i / 44; const px = x + Math.cos(a) * rad, py = ey + Math.sin(a) * rad; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); }
      else {
        const abierto = Math.max(0.08, 1 - bl); const medio = k === 'medio' ? 0.55 : 1, h2 = er * abierto;
        c.save(); c.beginPath(); c.ellipse(x, ey, er, h2, 0, 0, TAU); c.clip();
        c.fillStyle = '#fff'; c.fillRect(x - er, ey - er, er * 2, er * 2);
        const px = x + look.x * er * 0.32, py = ey + (k === 'triste' ? er * 0.3 : k === 'medio' ? er * 0.22 : 0) + look.y * er * 0.25, pr = er * (k === 'enfado' ? 0.5 : k === 'triste' || k === 'brillo' ? 0.72 : 0.58);
        elip(c, px, py, pr, pr, k === 'enfado' ? '#7f1d1d' : tinta);
        elip(c, px - pr * 0.3, py - pr * 0.32, pr * 0.32, pr * 0.32, '#fff'); if (k === 'brillo' || k === 'triste') elip(c, px + pr * 0.35, py + pr * 0.3, pr * 0.16, pr * 0.16, '#fff');
        if (k === 'medio') { c.fillStyle = col.base; c.fillRect(x - er - 1, ey - er - 1, er * 2 + 2, er * 1.18); c.strokeStyle = tinta; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x - er, ey + er * 0.17); c.lineTo(x + er, ey + er * 0.17); c.stroke(); }
        if (k === 'enfado') { c.fillStyle = col.base; c.beginPath(); c.moveTo(x - s * er * 1.4, ey - er * 1.2); c.lineTo(x + s * er * 1.4, ey - er * 1.2); c.lineTo(x - s * er * 1.4, ey - er * 0.05); c.closePath(); c.fill(); }
        c.restore(); elip(c, x, ey, er, h2, null, tinta, Math.max(2, R * 0.034));
        if (k === 'brillo') chispa(c, x + er * 0.9, ey - er * 0.9, er * 0.55, '#fde047', 0.5 + 0.5 * Math.sin(o.t * 8 + s), o.t);
      }
      if (EXP.ojeras) { c.strokeStyle = 'rgba(88,28,135,.45)'; c.lineWidth = 2.6; c.beginPath(); c.arc(x, ey + er * 0.5, er * 1.05, Math.PI * 0.18, Math.PI * 0.82); c.stroke(); }
    }
    if (EXP.lagrima) { const f = (o.t * 0.9) % 1, s = 1; elip(c, ex + er * 0.7, ey + er * 1.1 + f * R * 0.35, er * 0.32, er * 0.5, 'rgba(125,211,252,' + (1 - f * 0.7) + ')', '#0284c7', 1.2); }
    // boca
    const my = ry * 0.26, w = R * 0.23; c.lineWidth = Math.max(3, R * 0.058); c.strokeStyle = tinta; c.fillStyle = '#7f1d1d';
    const masticando = o.mastica > 0, ap = masticando ? (0.4 + 0.6 * Math.abs(Math.sin(o.t * 12))) : 0;
    let b = masticando ? 'abierta' : EXP.boca;
    if (b === 'sonrisa') { c.beginPath(); c.moveTo(-w * 0.9, my - w * 0.1); c.quadraticCurveTo(0, my + w * 0.95, w * 0.9, my - w * 0.1); c.stroke(); }
    else if (b === 'abierta') { const k = masticando ? ap : 1; c.beginPath(); c.moveTo(-w, my - w * 0.15); c.quadraticCurveTo(0, my - w * 0.15 + w * 0.2, w, my - w * 0.15); c.quadraticCurveTo(w * 0.85, my + w * 1.15 * k, 0, my + w * 1.2 * k); c.quadraticCurveTo(-w * 0.85, my + w * 1.15 * k, -w, my - w * 0.15); c.closePath(); c.fill(); c.stroke(); if (k > 0.5) { c.save(); c.clip(); elip(c, 0, my + w * 1.15 * k, w * 0.6, w * 0.38 * k, '#fb7185'); c.restore(); } }
    else if (b === 'plana') { c.beginPath(); c.moveTo(-w * 0.65, my + w * 0.25); c.lineTo(w * 0.65, my + w * 0.25); c.stroke(); }
    else if (b === 'triste') { c.beginPath(); c.moveTo(-w * 0.8, my + w * 0.55); c.quadraticCurveTo(0, my - w * 0.5, w * 0.8, my + w * 0.55); c.stroke(); }
    else if (b === 'enfado') { c.beginPath(); c.moveTo(-w * 0.8, my + w * 0.5); c.lineTo(-w * 0.3, my + w * 0.1); c.lineTo(w * 0.3, my + w * 0.5); c.lineTo(w * 0.8, my + w * 0.1); c.stroke(); }
    else if (b === 'ondulada') { c.beginPath(); for (let i = 0; i <= 12; i++) { const x = -w + i * (2 * w / 12), y = my + w * 0.25 + Math.sin(i * 1.3 + o.t * 3) * w * 0.17; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    else if (b === 'hambre') { const k = 0.75 + 0.25 * Math.sin(o.t * 4); elip(c, 0, my + w * 0.3, w * 0.5, w * 0.62 * k, '#7f1d1d', tinta, 3); elip(c, 0, my + w * 0.55, w * 0.3, w * 0.25 * k, '#fb7185'); const f = (o.t * 0.8) % 1; elip(c, w * 0.55, my + w * 0.5 + f * w * 1.2, w * 0.14, w * 0.22, 'rgba(125,211,252,' + (1 - f) + ')'); }
    else if (b === 'bostezo') { const k = Math.max(0.15, Math.sin(o.t * 1.3) * 0.5 + 0.55); elip(c, 0, my + w * 0.3, w * 0.55 * k + w * 0.15, w * 0.8 * k + w * 0.1, '#7f1d1d', tinta, 3); }
    else if (b === 'dormido') { const k = 0.85 + 0.15 * Math.sin(o.t * 1.4); elip(c, 0, my + w * 0.3, w * 0.2 * k, w * 0.26 * k, '#7f1d1d', tinta, 2.5); const bs = (Math.sin(o.t * 1.4) + 1) * 0.5; elip(c, w * 1.0, my - w * 0.5 + 4, w * (0.25 + bs * 0.55), w * (0.25 + bs * 0.55), 'rgba(186,230,253,.55)', 'rgba(14,165,233,.8)', 1.6); }
    // ruido de tripas
    if (EXP.ruidos && Math.sin(o.t * 5) > 0.2) { c.strokeStyle = 'rgba(30,20,60,.5)'; c.lineWidth = 2.2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * rx * 0.86, ry * 0.52); c.lineTo(s * rx * 1.06, ry * 0.46); c.moveTo(s * rx * 0.86, ry * 0.64); c.lineTo(s * rx * 1.08, ry * 0.66); c.stroke(); } }
    if (EXP.sudor) { const f = (o.t * 0.8) % 1; elip(c, rx * 0.72, -ry * 0.5 + f * R * 0.5, R * 0.06, R * 0.09, 'rgba(147,197,253,' + (1 - f * 0.6) + ')', '#2563eb', 1.2); }
  }

  // ===== escena =====
  const fondoCache = { c: null, clave: '', S: 0 };
  function fondo(c, Sx) {
    const clave = E.fondo + '|' + canvas.width;
    if (fondoCache.clave !== clave) {
      const oc = document.createElement('canvas'); oc.width = canvas.width; oc.height = canvas.height; const x = oc.getContext('2d'); x.setTransform(Sx, 0, 0, Sx, 0, 0); dibujaFondo(x, E.fondo); fondoCache.c = oc; fondoCache.clave = clave;
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(fondoCache.c, 0, 0); c.setTransform(Sx, 0, 0, Sx, 0, 0);
  }
  function relojPared(c) {
    if (E.fondo !== 'taller') return; const d = new Date(), x = 244, y = 66;
    elip(c, x, y, 22, 22, '#fff', '#475569', 3); c.strokeStyle = '#94a3b8'; c.lineWidth = 1.6; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(x + Math.cos(a) * 17, y + Math.sin(a) * 17); c.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); c.stroke(); }
    const mh = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * TAU - Math.PI / 2, mm = d.getMinutes() / 60 * TAU - Math.PI / 2;
    c.lineCap = 'round'; c.strokeStyle = '#1f2937'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(mh) * 11, y + Math.sin(mh) * 11); c.stroke(); c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(mm) * 16, y + Math.sin(mm) * 16); c.stroke(); c.lineCap = 'butt'; elip(c, x, y, 2, 2, '#ef4444');
  }
  function impresoraViva(c, t) {
    if (E.fondo !== 'taller') return; const col = L.COLORES[E.color];
    const gx = 346 + Math.sin(t * 0.9) * 22, prog = (t * 0.05) % 1;
    c.fillStyle = '#64748b'; c.fillRect(304, 142, 84, 6);
    // pieza que se va imprimiendo capa a capa
    const hh = 6 + prog * 54; c.fillStyle = col.base; rrect(c, 330, 222 - hh, 32, hh, 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; for (let y = 222 - 3; y > 222 - hh; y -= 3.4) { c.beginPath(); c.moveTo(331, y); c.lineTo(361, y); c.stroke(); }
    const ny = 222 - hh - 10;
    c.fillStyle = '#1e293b'; rrect(c, gx - 11, 148, 22, 18, 3); c.fill(); c.fillStyle = '#f59e0b'; c.beginPath(); c.moveTo(gx - 4, 166); c.lineTo(gx + 4, 166); c.lineTo(gx, 174); c.closePath(); c.fill();
    c.strokeStyle = col.base; c.lineWidth = 1.6; c.beginPath(); c.moveTo(346, 80); c.quadraticCurveTo(346, 120, gx, 150); c.stroke();
    const led = Math.sin(t * 3) > 0 ? '#22c55e' : '#14532d'; elip(c, 382, 244, 3.4, 3.4, led); void ny;
  }
  function juguetePos(t) { const j = S.juguete; return j ? { y: -Math.abs(Math.sin(j.t * 6)) * 26 * Math.max(0, 1 - j.t / j.dur) } : { y: 0 }; }

  function dibuja(Sx) {
    const c = c2; c.setTransform(Sx, 0, 0, Sx, 0, 0); c.clearRect(0, 0, W, HH);
    if (modo === 'gotas') return dibujaGotas(c, Sx);
    fondo(c, Sx); relojPared(c); impresoraViva(c, S.t);
    const col = L.COLORES[E.color] || L.COLORES.violeta, dorm = E.etapa !== 'huevo' && !E.luz, mood = L.animoId(E);
    // juguete en el suelo
    if (E.puesto.juguete && E.etapa !== 'huevo') { const jp = juguetePos(S.t); dibujaJuguete(c, E.puesto.juguete, 78, 322 + jp.y, 1.25, S.t); }
    if (dorm) { c.fillStyle = 'rgba(8,10,45,.55)'; c.fillRect(0, 0, W, HH); elip(c, 336, 56, 22, 22, '#fef9c3', '#fde047', 2); elip(c, 346, 50, 18, 18, 'rgba(8,10,45,.9)'); for (const [x, y] of [[300, 40], [250, 80], [372, 100], [60, 60], [120, 40]]) chispa(c, x, y, 4 + Math.sin(S.t * 2 + x) * 1.5, '#fef9c3', 0.9, 0); }
    else if (noche()) { c.fillStyle = 'rgba(25,30,90,.13)'; c.fillRect(0, 0, W, HH); }
    elip(c, CX, GROUND + 4, geo().rx * 0.95, 9, 'rgba(0,0,0,.2)');
    dibujaNido(c, CX, GROUND + 4, col);
    // Bobi
    const bano = modo === 'bano' && S.bano;
    const pose = poseDe(mood);
    const o = { x: CX + pose.dx + (S.shake > 0 ? Math.sin(S.t * 60) * 4 * S.shake : 0), y: GROUND + 2, salto: S.salto, sq: S.sq + pose.sq, rot: pose.rot + (S.shake > 0 ? Math.sin(S.t * 50) * 0.05 * S.shake : 0), t: S.t, etapa: E.etapa, color: E.color, mood, blink: dorm ? 0 : S.blink, look: S.look, puesto: E.puesto, higiene: E.n.higiene, mastica: S.mastica, hipo: !!(E.evento && E.evento.tipo === 'hipo') };
    if (E.etapa === 'huevo') { const pg = L.huevoProg(E); o.rot = Math.sin(S.t * (3 + pg * 7)) * 0.02 * (0.3 + pg * 2.2) + (S.rotImp || 0) * Math.sin(S.t * 28) * 0.12; }
    if (bano) { o.manchas = S.bano.m.length; o.manchaHp = S.bano.m.map(m => m.hp / m.max); }
    if (modo === 'evo' && S.evo) { const p = S.evo.p, antes = p < 0.42; o.etapa = antes ? S.evo.de : S.evo.a; o.sq = antes ? Math.sin(p * 40) * 0.05 : Math.max(-0.2, (1 - Math.min(1, (p - 0.42) * 4)) * 0.28 * Math.sin((p - 0.42) * 22)); o.mood = 'feliz'; o.esc = antes ? 1 : 1; }
    dibujaBobi(c, o);
    if (bano) dibujaBano(c, o);
    // comida volando hacia la boca
    if (S.comida) { const k = clamp(S.comida.t / S.comida.dur, 0, 1), g = geo(); dibujaComida(c, S.comida.id, CX + (1 - k) * 60 * Math.sin(k * 3), 40 + (g.cy + g.ry * 0.25 - 40) * k * k, 1.35 * (1 - k * 0.35)); }
    drawParts(c);
    if (dorm) { c.fillStyle = 'rgba(8,10,45,.12)'; c.fillRect(0, 0, W, HH); }
    if (modo === 'evo' && S.evo) evoFx(c);
  }
  function poseDe(m) {
    switch (m) {
      case 'triste': return { sq: 0.05, rot: -0.03, dx: 0 }; case 'cansado': return { sq: 0.04 + Math.sin(S.t * 1.2) * 0.012, rot: Math.sin(S.t * 0.8) * 0.045, dx: 0 };
      case 'mareado': return { sq: 0, rot: Math.sin(S.t * 3) * 0.14, dx: Math.sin(S.t * 3) * 5 }; case 'enfermo': return { sq: 0.06, rot: Math.sin(S.t * 1.5) * 0.03, dx: 0 };
      case 'aburrido': return { sq: 0.02, rot: 0, dx: 0 }; case 'durmiendo': return { sq: 0.04, rot: 0.02, dx: 0 }; case 'enfadado': return { sq: -0.02, rot: 0, dx: 0 };
      default: return { sq: 0, rot: 0, dx: 0 };
    }
  }
  function evoFx(c) {
    const p = S.evo.p; let a = 0;
    if (p < 0.42) a = Math.pow(p / 0.42, 2.2) * 0.95; else if (p < 0.55) a = 0.95 * (1 - (p - 0.42) / 0.13);
    if (a > 0) { c.save(); c.globalAlpha = a; c.fillStyle = '#fff'; c.fillRect(0, 0, W, HH); c.restore(); }
    c.save(); c.translate(CX, GROUND - 70); c.globalAlpha = clamp(Math.sin(clamp(p, 0, 1) * Math.PI) * 0.9, 0, 0.9); for (let i = 0; i < 14; i++) { const ang = i * TAU / 14 + p * 4; c.fillStyle = i % 2 ? '#fde047' : '#fff'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang - 0.07) * 260, Math.sin(ang - 0.07) * 260); c.lineTo(Math.cos(ang + 0.07) * 260, Math.sin(ang + 0.07) * 260); c.closePath(); c.globalAlpha = clamp(Math.sin(clamp(p, 0, 1) * Math.PI) * 0.35, 0, 0.35); c.fill(); } c.restore();
  }

  // ===== baño =====
  function empiezaBano() {
    const t = L.banar(E, 0); if (!t.ok) { aplica(t); return false; }
    const n = clamp(Math.ceil((100 - E.n.higiene) / 13), 3, 8), g = geo(), m = [];
    for (let i = 0; i < n; i++) m.push({ ux: MANCHAS[i][0], uy: MANCHAS[i][1], hp: 70, max: 70 });
    S.bano = { m, esp: null, limpio: 0, g }; modo = 'bano'; panel = null; ov.replaceChildren(
      h('div.mas-hud-juego.top.bano', h('div.mas-bt', h('b', '🫧 ¡Frota a ' + E.nombre + '!'), h('div.mas-prog', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-label': 'Limpieza' }, h('i'))),
        h('div.mas-hud-btns', btn('Terminar', () => terminaBano(), { cls: 'primary', title: 'Terminar el baño' }), btn('Cancelar', () => { salirModo(); }, { title: 'Salir sin bañar' }))));
    pinta(); decir('¡Hora del baño!', 2500); return true;
  }
  function dibujaBano(c, o) {
    const g = geo();
    // espuma sobre la parte baja y esponja
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3; elip(c, g.cx + Math.cos(a) * g.rx * 0.9, g.cy + g.ry * 0.9 + Math.sin(a * 2) * 4, 13 + (i % 3) * 4, 11 + (i % 2) * 4, 'rgba(255,255,255,.92)', 'rgba(147,197,253,.8)', 1.4); }
    if (S.bano.esp) { const { x, y } = S.bano.esp; c.save(); c.translate(x, y); c.rotate(-0.4); c.fillStyle = '#fde047'; rrect(c, -20, -13, 40, 26, 8); c.fill(); c.strokeStyle = '#a16207'; c.lineWidth = 2.2; c.stroke(); for (const [px, py] of [[-9, -3], [3, 4], [10, -6], [-3, 7]]) elip(c, px, py, 2, 2, '#ca8a04'); c.restore(); }
    void o;
  }
  function frotar(x, y, dist) {
    const b = S.bano; if (!b) return; b.esp = { x, y };
    const g = geo(); let quitado = false;
    b.m.forEach(m => { if (m.hp <= 0) return; const mx = g.cx + m.ux * g.rx, my = g.cy + m.uy * g.ry; if (Math.hypot(x - mx, y - my) < 30) { m.hp -= dist * 0.9; quitado = true; if (m.hp <= 0) { for (let i = 0; i < 6; i++) part('burbuja', mx, my); sfx('ok'); } } });
    if (Math.hypot(x - g.cx, y - g.cy) < g.rx * 1.1 && dist > 2) { if (Math.random() < 0.5) part('burbuja', x + rr(-8, 8), y + rr(-8, 8)); sfx('agua'); }
    void quitado;
    const hecho = 1 - b.m.reduce((s, m) => s + Math.max(0, m.hp), 0) / b.m.reduce((s, m) => s + m.max, 0);
    const bar = ov.querySelector('.mas-prog'); if (bar) { bar.firstChild.style.width = Math.round(hecho * 100) + '%'; bar.setAttribute('aria-valuenow', String(Math.round(hecho * 100))); }
    if (b.m.every(m => m.hp <= 0)) terminaBano();
  }
  function terminaBano() {
    const b = S.bano; if (!b) return; const frac = 1 - b.m.reduce((s, m) => s + Math.max(0, m.hp), 0) / b.m.reduce((s, m) => s + m.max, 0);
    S.bano = null; salirModo(); const r = L.banar(E, frac); aplica(r);
    if (r.ok) { for (let i = 0; i < 10; i++) part('burbuja', CX + rr(-60, 60), GROUND - rr(20, 120)); for (let i = 0; i < 5; i++) part('chispa', CX + rr(-50, 50), GROUND - rr(40, 120)); }
  }
  function salirModo() { modo = 'sala'; S.bano = null; if (S.G) S.G = null; if (S.M) S.M = null; ov.replaceChildren(); gTimers.forEach(clearTimeout); gTimers.clear(); pinta(); revisaEvoPendiente(); }

  // ===== minijuego 1: gotas de filamento =====
  function empiezaGotas() {
    const t = L.jugar(E, 'gotas', 0); if (!t.ok) { aplica(t); return; }
    panel = null; modo = 'gotas'; S.G = { g: L.gotasNueva(), objX: CX, tecla: 0, cobrado: false, ult: 0 };
    const sp = h('b.mas-g-pts', '0'), tm = h('b.mas-g-t', String(L.GOTAS.DUR));
    S.G.ui = { sp, tm };
    ov.replaceChildren(h('div.mas-hud-juego.top', h('span.mas-chip', '💧 ', sp), h('span.mas-chip', '⏱ ', tm, ' s'), btn('Terminar', () => finGotas(), { title: 'Terminar la partida' })), h('div.mas-hint', 'Mueve el ratón o el dedo (o ← →) para atrapar las gotas. ¡Las grises queman!'));
    pinta(); timeoutJ(() => { const hi = ov.querySelector('.mas-hint'); if (hi) hi.remove(); }, 4000);
  }
  function finGotas() {
    const G = S.G; if (!G || G.cobrado) return; G.cobrado = true; const pts = G.g.pts;
    const r = L.jugar(E, 'gotas', pts); aplica(r, { silencio: true }); if (r.ok) resuelve('jugar');
    for (let i = 0; i < 8 && r.ok && r.premio.monedas > 0; i++) part('moneda', CX + rr(-30, 30), 200);
    sfx(r.ok && pts >= 10 ? 'logro' : 'ok');
    ov.replaceChildren(h('div.mas-res', h('h3', pts >= 15 ? '¡Qué manos!' : pts >= 6 ? '¡Bien hecho!' : 'Ánimo, ¡otra vez!'), h('p', '💧 ', h('b', String(pts)), ' gotas atrapadas'), r.ok ? h('p', '🪙 +' + r.premio.monedas + ' monedas · 🎈 +' + r.premio.diversion + ' diversión') : h('p.muted', r.msg),
      h('p.muted.tiny', 'Tu récord: ' + E.stats.recordGotas), h('div.mas-hud-btns', btn('Otra vez', () => { salirModo(); empiezaGotas(); }, { cls: 'primary' }), btn('Volver con ' + E.nombre, () => salirModo()))));
  }
  const HUES = [200, 160, 280, 340, 40];
  function dibujaGotas(c, Sx) {
    const G = S.G; if (!G) return; const g = G.g;
    const bg = c.createLinearGradient(0, 0, 0, HH); bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#4c1d95'); c.fillStyle = bg; c.fillRect(0, 0, W, HH);
    for (let i = 0; i < 30; i++) { const x = (i * 97) % W, y = (i * 53 + S.t * 8) % 300; elip(c, x, y, 1.2, 1.2, 'rgba(255,255,255,.35)'); }
    c.fillStyle = '#312e81'; c.fillRect(0, 332, W, 28); c.fillStyle = '#4338ca'; c.fillRect(0, 332, W, 4);
    for (const d of g.gotas) {
      if (d.tipo === 'mala') { c.beginPath(); c.moveTo(d.x, d.y - d.r * 1.4); c.quadraticCurveTo(d.x + d.r * 1.1, d.y, d.x, d.y + d.r); c.quadraticCurveTo(d.x - d.r * 1.1, d.y, d.x, d.y - d.r * 1.4); c.fillStyle = '#374151'; c.fill(); c.strokeStyle = '#111827'; c.lineWidth = 2; c.stroke(); c.strokeStyle = '#f87171'; c.lineWidth = 2; c.beginPath(); c.moveTo(d.x - 3, d.y - 2); c.lineTo(d.x + 3, d.y + 4); c.moveTo(d.x + 3, d.y - 2); c.lineTo(d.x - 3, d.y + 4); c.stroke(); }
      else { const hue = d.tipo === 'oro' ? 45 : HUES[d.h % HUES.length]; c.beginPath(); c.moveTo(d.x, d.y - d.r * 1.5); c.quadraticCurveTo(d.x + d.r * 1.15, d.y + d.r * 0.2, d.x, d.y + d.r); c.quadraticCurveTo(d.x - d.r * 1.15, d.y + d.r * 0.2, d.x, d.y - d.r * 1.5); c.fillStyle = 'hsl(' + hue + ' 90% ' + (d.tipo === 'oro' ? 55 : 58) + '%)'; c.fill(); c.strokeStyle = 'hsl(' + hue + ' 80% 30%)'; c.lineWidth = 2; c.stroke(); elip(c, d.x - d.r * 0.3, d.y - d.r * 0.1, d.r * 0.22, d.r * 0.34, 'rgba(255,255,255,.65)'); if (d.tipo === 'oro') chispa(c, d.x + d.r, d.y - d.r, 5, '#fff', 0.6 + 0.4 * Math.sin(S.t * 10), S.t * 2); }
    }
    // cesta: bobina con Bobi asomando
    const bx = g.x, by = L.GOTAS.CESTA_Y, col = L.COLORES[E.color];
    const o = { x: bx, y: by + 16, salto: 0, sq: 0, rot: 0, t: S.t, etapa: E.etapa === 'huevo' ? 'bebe' : E.etapa, color: E.color, mood: g.ev && g.ev.includes('mala') ? 'mareado' : 'feliz', blink: S.blink, look: { x: clamp((G.objX - bx) / 60, -1, 1), y: -0.6 }, puesto: E.puesto, higiene: 100, esc: 0.62 };
    dibujaBobi(c, o);
    const gr = c.createLinearGradient(bx - 40, 0, bx + 40, 0); gr.addColorStop(0, col.sombra); gr.addColorStop(0.5, col.base); gr.addColorStop(1, col.sombra);
    c.fillStyle = gr; rrect(c, bx - 36, by + 6, 72, 30, 6); c.fill(); c.strokeStyle = col.sombra; c.lineWidth = 2.5; c.stroke(); elip(c, bx, by + 36, 44, 7, '#94a3b8', '#64748b', 2); elip(c, bx, by + 5, 44, 8, '#cbd5e1', '#64748b', 2); elip(c, bx, by + 5, 28, 4.5, '#1f2937');
    c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(bx - 34, by + 14 + i * 8); c.lineTo(bx + 34, by + 14 + i * 8); c.stroke(); }
    drawParts(c);
    if (g.racha >= 3) { c.save(); c.font = '800 18px system-ui'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.5)'; c.fillStyle = '#fde047'; c.strokeText('Racha x' + g.racha, CX, 76); c.fillText('Racha x' + g.racha, CX, 76); c.restore(); }
    void Sx;
  }
  function pasoGotas(dt) {
    const G = S.G; if (!G || G.g.fin) { if (G && G.g.fin && !G.cobrado) finGotas(); return; }
    if (G.tecla) G.objX = clamp(G.objX + G.tecla * 300 * dt, 0, W);
    L.gotasPaso(G.g, dt, G.objX);
    for (const ev of G.g.ev) {
      if (ev === 'ok') { sfx('gota'); part('chispa', G.g.x, L.GOTAS.CESTA_Y, { vida: 0.6 }); } else if (ev === 'oro') { sfx('ok'); for (let i = 0; i < 6; i++) part('chispa', G.g.x, L.GOTAS.CESTA_Y); part('texto', G.g.x, L.GOTAS.CESTA_Y - 20, { txt: '+3', col: '#fde047' }); }
      else if (ev === 'mala') { sfx('mala'); S.shake = 0.3; part('texto', G.g.x, L.GOTAS.CESTA_Y - 20, { txt: '-2', col: '#fca5a5' }); }
    }
    G.ui.sp.textContent = String(G.g.pts); const tl = Math.max(0, Math.ceil(L.GOTAS.DUR - G.g.t)); if (G.ui.tm.textContent !== String(tl)) G.ui.tm.textContent = String(tl);
    if (G.g.fin) finGotas();
  }

  // ===== minijuego 2: memoria de colores =====
  const MEM_C = [['rojo', '#ef4444', 'Rojo'], ['verde', '#22c55e', 'Verde'], ['azul', '#3b82f6', 'Azul'], ['amarillo', '#facc15', 'Amarillo']];
  function empiezaMemoria() {
    const t = L.jugar(E, 'memoria', 0); if (!t.ok) { aplica(t); return; }
    panel = null; modo = 'memoria'; const M = S.M = { m: L.memoriaNueva(), cobrado: false, botones: [] };
    const info = h('b.mas-mem-info', 'Mira…'), pts = h('span.mas-chip', '🧠 Ronda ', h('b', '1'));
    const grid = h('div.mas-mem-grid', { role: 'group', 'aria-label': 'Botones de colores' }, MEM_C.map((cc, i) => { const b = h('button.mas-mem-b', { type: 'button', 'data-c': String(i), 'aria-label': cc[2], style: { background: cc[1] }, onclick: () => pulsaMem(i) }, h('span', String(i + 1))); M.botones.push(b); return b; }));
    M.ui = { info, pts, grid };
    ov.replaceChildren(h('div.mas-mem', h('div.mas-hud-juego.inline', pts, btn('Terminar', () => finMemoria(), { title: 'Terminar la partida' })), info, grid));
    pinta(); timeoutJ(muestraSecuencia, 700);
  }
  function enciende(i, ms) { const M = S.M; if (!M) return; const b = M.botones[i]; b.classList.add('on'); sfx_mem(i); timeoutJ(() => b.classList.remove('on'), ms); }
  function sfx_mem(i) { bip(MEM_F[i], 0.25, 'triangle', 0.06); }
  function muestraSecuencia() {
    const M = S.M; if (!M || M.m.estado === 'fin') return; M.m.estado = 'mostrar'; M.ui.info.textContent = 'Mira…'; M.ui.grid.classList.add('lock');
    const v = Math.max(280, 560 - M.m.ronda * 28); let t = 200;
    M.m.sec.forEach((c, i) => { timeoutJ(() => enciende(c, v * 0.7), t); t += v; });
    timeoutJ(() => { if (!S.M || M.m.estado === 'fin') return; M.m.estado = 'turno'; M.ui.info.textContent = '¡Tu turno!'; M.ui.grid.classList.remove('lock'); }, t + 100);
  }
  function pulsaMem(i) {
    const M = S.M; if (!M || M.cobrado) return; const r = L.memoriaPulsa(M.m, i); if (r.r === 'ignorado') return;
    M.m = r.m; enciende(i, 220);
    if (r.r === 'fallo') { M.ui.info.textContent = '¡Ups!'; sfx('error'); timeoutJ(() => finMemoria(), 500); }
    else if (r.r === 'ronda') { M.ui.pts.lastChild.textContent = String(M.m.ronda); M.ui.info.textContent = '¡Bien!'; part('chispa', CX, 150); sfx('ok'); timeoutJ(muestraSecuencia, 900); }
  }
  function finMemoria() {
    const M = S.M; if (!M || M.cobrado) return; M.cobrado = true; M.m.estado = 'fin'; const pts = M.m.puntos;
    const r = L.jugar(E, 'memoria', pts); aplica(r, { silencio: true }); if (r.ok) resuelve('jugar'); sfx(r.ok && pts >= 4 ? 'logro' : 'ok');
    ov.replaceChildren(h('div.mas-res', h('h3', pts >= 6 ? '¡Memoria de elefante!' : pts >= 3 ? '¡Bien hecho!' : 'Ánimo, ¡otra vez!'), h('p', '🧠 ', h('b', String(pts)), pts === 1 ? ' ronda completada' : ' rondas completadas'), r.ok ? h('p', '🪙 +' + r.premio.monedas + ' monedas · 🎈 +' + r.premio.diversion + ' diversión') : h('p.muted', r.msg),
      h('p.muted.tiny', 'Tu récord: ' + E.stats.recordMemoria), h('div.mas-hud-btns', btn('Otra vez', () => { salirModo(); empiezaMemoria(); }, { cls: 'primary' }), btn('Volver con ' + E.nombre, () => salirModo()))));
  }

  // ===== evolución =====
  function lanzaEvo(de, a) {
    if (modo === 'gotas' || modo === 'memoria' || modo === 'bano') { S.evoPend = { de, a }; return; }
    modo = 'evo'; panel = null; S.evo = { de, a, p: 0, t: 0 };
    const nueva = L.etapaInfo(a), venia = L.etapaInfo(de);
    const tit = de === 'huevo' ? '¡' + E.nombre + ' ha nacido!' : '¡' + E.nombre + ' ha crecido!';
    ov.replaceChildren(h('div.mas-evo', { role: 'dialog', 'aria-label': tit }, h('h3', tit), h('p', venia.emoji + ' ' + venia.nombre + '  →  ' + nueva.emoji + ' ', h('b', nueva.nombre)), h('p.muted', de === 'huevo' ? 'Su personalidad: ' + L.PERS[E.pers].emoji + ' ' + L.PERS[E.pers].nombre + '. ' + L.PERS[E.pers].desc : 'Cada etapa le hace más grande y más listo.'), btn('¡Genial!', () => { S.evo = null; salirModo(); sfx('ok'); }, { cls: 'primary', autofocus: true })));
    sfx('evo'); for (let i = 0; i < 24; i++) timeout(() => part('chispa', CX + rr(-90, 90), GROUND - rr(20, 170)), 1100 + i * 60);
    pinta();
  }
  function revisaEvoPendiente() { if (S.evoPend && modo === 'sala') { const p = S.evoPend; S.evoPend = null; lanzaEvo(p.de, p.a); } }

  // ===== tiempo =====
  function avanzaMs(ms, o) {
    o = o || {}; const antes = E, ahora = Date.now();
    let n = L.avanzar(E, ms); n.ultimaVez = ahora; E = n;
    if (antes.etapa !== E.etapa && L.ETAPA_IDS.indexOf(E.etapa) > L.ETAPA_IDS.indexOf(antes.etapa)) lanzaEvo(antes.etapa, E.etapa);
    const cad = L.caducarEvento(E); if (cad.caducado) { E = cad.e; if (cad.msg) decir(cad.msg); }
    if (!o.sinGuardar) { logros(); }
  }
  function tic() {
    if (muerto) return; const ahora = Date.now(); let ms = ahora - E.ultimaVez;
    if (ms < 0) { E.ultimaVez = ahora; ms = 0; }
    const antesDorm = !E.luz;
    if (ms > 0) avanzaMs(ms);
    ticks++; const a = L.animo(E);
    if (a.id !== S.ultAnimo) { S.ultAnimo = a.id; if (a.tono === 'mal' && ahora - S.ultDecir > 2000) decirAnimo(); }
    else if (a.tono === 'mal' && ahora - S.ultDecir > 45000 && !burbuja.classList.contains('on')) decirAnimo();
    if (antesDorm && E.luz) decir('¡Buenos días! ☀️', 3500);
    // eventos suaves (solo con la pestaña a la vista y sin otra cosa en marcha)
    if (modo === 'sala' && !panel && !E.evento && E.etapa !== 'huevo' && E.luz && ahora - Math.max(E.ultEvento, tCarga) > 150000 && !window.__mascotaSinEventos && Math.random() < 1 / 100) { const ev = L.eventoAleatorio(E); if (ev) { E = L.ponerEvento(E, ev); decir(ev.texto, 6000); sfx('toque'); S.shake = 0.2; } }
    if (ticks % 5 === 0 || ms > 60000) guarda();
    pinta();
  }

  // ===== interfaz: pintado =====
  function pinta() {
    const huevo = E.etapa === 'huevo', a = L.animo(E), et = L.etapaInfo(E.etapa);
    hudCoins.replaceChildren(h('span', { 'aria-hidden': 'true' }, '🪙'), h('b', String(E.monedas)), h('span.sr', ' monedas')); hudCoins.setAttribute('aria-label', E.monedas + ' monedas del juego');
    btnSnd.textContent = E.sonido ? '🔊' : '🔇'; btnSnd.setAttribute('aria-label', E.sonido ? 'Silenciar sonidos' : 'Activar sonidos'); btnSnd.setAttribute('aria-pressed', String(E.sonido)); btnSnd.title = E.sonido ? 'Silenciar' : 'Activar sonido';
    sEmoji.textContent = a.emoji; sTxt.textContent = a.texto;
    sSub.textContent = huevo ? 'Calentando… ' + Math.round(L.huevoProg(E) * 100) + ' %' : et.emoji + ' ' + et.nombre + ' · ' + L.edadTexto(E.edadMs) + ' · ' + L.PERS[E.pers].emoji + ' ' + L.PERS[E.pers].nombre;
    status.className = 'mas-status ' + a.tono;
    canvas.setAttribute('aria-label', huevo ? 'Huevo de ' + E.nombre + ', calentándose. Tócalo para darle calor.' : E.nombre + ', ' + et.nombre.toLowerCase() + '. ' + a.texto + '. Pulsa Intro para acariciarlo.');
    for (const k of L.NEC) { const v = Math.round(E.n[k]), b = bars[k]; b.fill.style.width = v + '%'; b.num.textContent = String(v); b.bar.setAttribute('aria-valuenow', String(v)); b.bar.setAttribute('aria-label', L.NEC_INFO[k].aria + ' ' + v + ' de 100' + (v < 25 ? ', muy bajo' : v < 50 ? ', bajo' : '')); b.bar.className = 'mas-bar ' + (v < 25 ? 'bad' : v < 50 ? 'warn' : 'ok') + (v < 25 ? ' pulse' : ''); }
    barsBox.setAttribute('aria-label', 'Necesidades de ' + E.nombre);
    for (const id in accBtn) accBtn[id].disabled = huevo && !['ajustes', 'ayuda', 'cartilla'].includes(id);
    accBtn.luz.firstChild.textContent = E.luz ? '💡' : '🌙'; accBtn.luz.setAttribute('aria-pressed', String(!E.luz)); accBtn.luz.lastChild.textContent = E.luz ? 'Apagar' : 'Encender';
    const lock = modo !== 'sala'; ctl.classList.toggle('mas-lock', lock); status.classList.toggle('hide', huevo);
    root.dataset.modo = modo; root.dataset.etapa = E.etapa; root.dataset.animo = a.id;
    if (!panel) pintaPrincipal(); else if (panel === 'cartilla' || panel === 'tienda' || panel === 'comer' || panel === 'jugar') { /* se repintan al abrir/usar */ }
  }
  let ultVista = '';
  function pintaPrincipal() {
    const huevo = E.etapa === 'huevo', clave = huevo ? 'huevo' : 'normal';
    if (ultVista !== clave || !ctl.contains(actions)) {
      ultVista = clave; ctl.replaceChildren();
      if (huevo) ctl.append(eggBox, actions); else ctl.append(barsBox, actions);
      if (huevo) pintaHuevo();
    }
    if (huevo) pintaHuevoProg();
  }
  let eggProg = null;
  function pintaHuevo() {
    eggProg = h('i'); const bar = h('div.mas-prog.big', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-label': 'Calor del huevo' }, eggProg);
    eggBox.replaceChildren(h('h3', '🥚 Un huevo en una bobina…'), h('p.muted', 'Tócalo para darle calor: cada toque adelanta el nacimiento. Se abrirá solo en un par de minutos.'), bar, h('div.mas-pick', h('b', 'Color de su bobina'), colorPicker()));
  }
  function pintaHuevoProg() { if (!eggProg) return; const p = Math.round(L.huevoProg(E) * 100); eggProg.style.width = p + '%'; eggProg.parentNode.setAttribute('aria-valuenow', String(p)); }
  function colorPicker() {
    return h('div.mas-colors', { role: 'radiogroup', 'aria-label': 'Color' }, L.COLOR_IDS.map(id => { const k = L.COLORES[id]; return h('button.mas-color' + (E.color === id ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(E.color === id), 'aria-label': k.nombre, title: k.nombre, style: { background: 'radial-gradient(circle at 30% 30%, ' + k.luz + ', ' + k.base + ' 60%, ' + k.sombra + ')' }, onclick: ev => { E.color = id; guarda(); fondoCache.clave = ''; ev.currentTarget.parentNode.querySelectorAll('.mas-color').forEach(b => { const on = b.title === k.nombre; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); sfx('toque'); } }); }));
  }

  // ===== paneles =====
  function abrePanel(id) {
    if (modo !== 'sala') return; panel = id; ultVista = '';
    const cuerpo = ({ comer: panelComer, jugar: panelJugar, tienda: panelTienda, cartilla: panelCartilla, ajustes: panelAjustes, ayuda: panelAyuda, revision: panelRevision })[id]();
    const tit = { comer: '🍽️ ¿Qué le damos de comer?', jugar: '🎮 ¿A qué jugamos?', tienda: '🛍️ Tienda de Bobi', cartilla: '📒 Cartilla de ' + E.nombre, ajustes: '⚙️ Ajustes', ayuda: '❓ Cómo se juega', revision: '🩺 Informe del veterinario' }[id];
    ctl.replaceChildren(h('div.mas-panel', { role: 'region', 'aria-label': tit }, h('div.mas-ph', h('b', tit), h('button.mas-x', { type: 'button', 'aria-label': 'Cerrar', title: 'Cerrar', onclick: () => cierraPanel() }, '✕')), cuerpo));
    const f = ctl.querySelector('.mas-x'); if (f && id !== 'ajustes') f.focus({ preventScroll: true });
  }
  function cierraPanel() { panel = null; ultVista = ''; pinta(); }
  function clicAccion(id) {
    gesto();
    if (modo !== 'sala') return;
    if (panel === id) { cierraPanel(); return; }
    if (id === 'comer' || id === 'jugar' || id === 'tienda' || id === 'cartilla' || id === 'ajustes' || id === 'ayuda') return abrePanel(id);
    if (id === 'banar') return void empiezaBano();
    if (id === 'luz') return void alternaLuz();
    if (id === 'curar') return void hacerCurar();
    if (id === 'revision') { const r = hacerRevision(); if (r.ok) abrePanel('revision'); return; }
  }
  function panelComer() {
    const P = L.PERS[E.pers];
    return h('div.mas-p-b', h('div.mas-foods', L.COMIDA_IDS.map(id => { const f = L.COMIDAS[id], fav = P.fav === id; return h('button.mas-food' + (fav ? '.fav' : ''), { type: 'button', 'data-comida': id, 'aria-label': f.nombre + (f.precio ? ', ' + f.precio + ' monedas' : ', gratis') + (fav ? ', su favorita' : ''), onclick: () => { hacerComer(id); } },
      h('span.mas-fe', { 'aria-hidden': 'true' }, f.emoji), h('b', f.nombre), h('span.muted.tiny', f.nota), h('span.mas-price', f.precio ? '🪙 ' + f.precio : 'Gratis'), fav ? h('span.mas-fav', '⭐ favorita') : null); })),
    h('p.muted.tiny', 'Cuidado con pasarte: si come de más se empacha y baja la salud. Su favorita le encanta.'));
  }
  function hacerComer(id) {
    gesto(); const r = L.alimentar(E, id);
    if (!r.ok) { aplica(r); return r; }
    aplica(r); S.comida = { id, t: 0, dur: 0.75 }; sfx('comer'); resuelve('comer', id);
    if (r.fav) for (let i = 0; i < 6; i++) timeout(() => part('corazon', CX + rr(-50, 50), 160 + rr(-30, 30)), i * 90);
    if (r.empachado) for (let i = 0; i < 3; i++) part('gota', CX + 40, 150);
    cierraPanel(); return r;
  }
  function hacerCurar() { gesto(); const r = L.curar(E); if (!r.ok) { aplica(r); return r; } aplica(r); S.comida = { id: 'pastilla', t: 0, dur: 0.6 }; sfx('ok'); resuelve('curar'); for (let i = 0; i < 6; i++) timeout(() => part('chispa', CX + rr(-40, 40), 170 + rr(-30, 30)), i * 80); return r; }
  function hacerRevision() { gesto(); const r = L.revision(E); if (!r.ok) { aplica(r); return r; } aplica(r, { silencio: true }); S.dx = r.diagnostico; sfx('ok'); for (let i = 0; i < 4; i++) part('corazon', CX + rr(-30, 30), 170); return r; }
  function panelRevision() { const dx = S.dx || L.diagnostico(E); return h('div.mas-p-b', h('ul.mas-dx', dx.map(t => h('li', t))), h('div.mas-bars.mini', L.NEC.map(k => h('div.mas-chip', L.NEC_INFO[k].emoji + ' ', L.NEC_INFO[k].nombre + ' ', h('b', String(Math.round(E.n[k])))))), btn('Cerrar', () => cierraPanel(), { cls: 'primary' })); }
  function alternaLuz() {
    gesto(); const res = E.luz ? L.luz(E, false) : L.luz(E, true);
    if (!res.ok) { aplica(res); return res; }
    aplica(res); sfx('dormir'); if (!res.e.luz) for (let i = 0; i < 3; i++) timeout(() => part('zzz', CX + 30, 150), i * 400); return res;
  }
  function panelJugar() {
    return h('div.mas-p-b', h('div.mas-games',
      h('button.mas-game', { type: 'button', 'data-juego': 'gotas', onclick: () => { gesto(); empiezaGotas(); } }, h('span.mas-fe', '💧'), h('b', 'Atrapa las gotas'), h('span.muted.tiny', 'Mueve la bobina y recoge filamento. 30 s.'), h('span.mas-price', 'Récord ' + E.stats.recordGotas)),
      h('button.mas-game', { type: 'button', 'data-juego': 'memoria', onclick: () => { gesto(); empiezaMemoria(); } }, h('span.mas-fe', '🎨'), h('b', 'Memoria de colores'), h('span.muted.tiny', 'Repite la secuencia de 4 colores.'), h('span.mas-price', 'Récord ' + E.stats.recordMemoria)),
      h('button.mas-game', { type: 'button', 'data-juego': 'juguete', onclick: () => { gesto(); jugarJuguete(); } }, h('span.mas-fe', E.puesto.juguete ? L.ITEMS[E.puesto.juguete].emoji : '🧸'), h('b', 'Su juguete'), h('span.muted.tiny', E.puesto.juguete ? 'Jugar con ' + L.ITEMS[E.puesto.juguete].nombre.toLowerCase() : 'Compra uno en la tienda'), h('span.mas-price', 'Gratis'))),
      h('p.muted.tiny', 'Jugar cansa un poco, da diversión y monedas virtuales para la tienda.'));
  }
  function jugarJuguete() { const r = L.usarJuguete(E); if (!r.ok) { aplica(r); return r; } aplica(r); S.juguete = { t: 0, dur: 2.2 }; sfx('ok'); for (let i = 0; i < 4; i++) timeout(() => part('chispa', CX + rr(-50, 50), 200 + rr(-30, 20)), i * 200); cierraPanel(); return r; }
  let tiendaTab = 'ropa';
  function panelTienda() {
    const caja = h('div.mas-p-b'), TABS = [['ropa', '👕 Ropa'], ['fondo', '🖼️ Fondos'], ['juguete', '🧸 Juguetes']];
    const pinta2 = () => {
      caja.replaceChildren(h('div.mas-tabs', { role: 'tablist' }, TABS.map(([id, t]) => h('button.mas-tab' + (tiendaTab === id ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(tiendaTab === id), onclick: () => { tiendaTab = id; pinta2(); } }, t)), h('span.mas-coins.inline', '🪙 ', h('b', String(E.monedas)))),
        h('div.mas-shop', L.TIENDA.filter(i => tiendaTab === 'ropa' ? ['sombrero', 'gafas', 'cuello', 'ropa'].includes(i.tipo) : i.tipo === tiendaTab).map(it => {
          const tuyo = E.inv.includes(it.id), puesto = it.tipo === 'fondo' ? E.fondo === it.id : E.puesto[it.tipo] === it.id;
          return h('button.mas-item' + (puesto ? '.on' : tuyo ? '.own' : ''), { type: 'button', 'data-item': it.id, 'aria-pressed': tuyo ? String(puesto) : null, 'aria-label': it.nombre + ', ' + (puesto ? 'puesto, pulsa para quitar' : tuyo ? 'tuyo, pulsa para ponerlo' : it.precio + ' monedas, pulsa para comprar'), onclick: () => usaItem(it, pinta2) },
            h('span.mas-fe', { 'aria-hidden': 'true' }, it.emoji), h('b', it.nombre), h('span.mas-price', puesto ? '✓ Puesto' : tuyo ? 'Tuyo · Poner' : '🪙 ' + it.precio));
        })),
        h('p.muted.tiny', 'Las monedas son del juego (no son dinero real): se ganan jugando. Un artículo por hueco; pulsa uno puesto para quitarlo.'));
    };
    pinta2(); return caja;
  }
  function usaItem(it, repinta) {
    gesto(); const tuyo = E.inv.includes(it.id);
    let r;
    if (!tuyo) { r = L.comprar(E, it.id); if (r.ok) { sfx('ok'); for (let i = 0; i < 8; i++) part('chispa', CX + rr(-50, 50), 150 + rr(-40, 40)); } }
    else if ((it.tipo === 'fondo' ? E.fondo === it.id : E.puesto[it.tipo] === it.id)) { r = it.tipo === 'fondo' ? L.equipar(E, 'taller') : L.quitar(E, it.tipo); }
    else r = L.equipar(E, it.id);
    aplica(r); repinta();
  }
  function panelCartilla() {
    const st = E.stats, P = L.PERS[E.pers], sig = L.siguienteEtapa(E.etapa), huevo = E.etapa === 'huevo';
    const fila = (k, v) => h('div.mas-row', h('span.muted', k), h('b', String(v)));
    let crec = null;
    if (!huevo && sig) { const d0 = L.etapaInfo(E.etapa).desde, p = clamp((E.crecMs - d0) / (sig.desde - d0) * 100, 0, 100); crec = h('div.mas-grow', h('span.muted.tiny', 'Hacia ' + sig.emoji + ' ' + sig.nombre + ' · ritmo ' + (L.tasaCrecimiento(E) > 0.85 ? 'normal' : L.tasaCrecimiento(E) > 0.55 ? 'algo lento' : 'lento: ¡cuídalo más!')), h('div.mas-prog', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(p)), 'aria-label': 'Progreso hacia la siguiente etapa' }, h('i', { style: { width: Math.round(p) + '%' } }))); }
    return h('div.mas-p-b',
      h('div.mas-card', fila('Nombre', E.nombre), fila('Personalidad', P.emoji + ' ' + P.nombre), h('span.muted.tiny', P.desc), fila('Etapa', L.etapaInfo(E.etapa).emoji + ' ' + L.etapaInfo(E.etapa).nombre), crec, fila('Edad', huevo ? 'Aún en el huevo' : L.edadTexto(E.edadMs) + ' (' + Math.floor(E.edadMs / 86400000) + ' días de vida)'), fila('Nació', E.eclosion ? new Date(E.eclosion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'), fila('Comida favorita', L.COMIDAS[P.fav].emoji + ' ' + L.COMIDAS[P.fav].nombre)),
      h('div.mas-card', h('b', 'Estadísticas'), fila('Veces alimentado', st.alimentado), fila('Juegos jugados', st.jugado), fila('Baños', st.banado), fila('Medicinas', st.curado), fila('Caricias', st.caricias), fila('Récord gotas', st.recordGotas), fila('Récord memoria', st.recordMemoria), fila('Monedas ganadas', st.ganadas), fila('Compras', st.comprados)),
      h('div.mas-card', h('b', 'Logros ⭐ ' + Object.keys(E.logros).length + '/' + L.LOGROS.length), h('div.mas-logros', L.LOGROS.map(l => { const ok = !!E.logros[l.id]; return h('div.mas-logro' + (ok ? '.ok' : ''), { title: l.desc, 'aria-label': l.nombre + (ok ? ' (conseguido)' : ' (pendiente): ' + l.desc) }, h('span', ok ? l.emoji : '🔒'), h('b', l.nombre), h('span.muted.tiny', l.desc)); }))));
  }
  function panelAjustes() {
    const inp = h('input.inp', { type: 'text', maxlength: '14', value: E.nombre, 'aria-label': 'Nombre de la mascota', autocomplete: 'off' });
    const guardaN = () => { E.nombre = L.limpiaNombre(inp.value); inp.value = E.nombre; guarda(); pinta(); toast('Ahora se llama ' + E.nombre, 'ok'); };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); guardaN(); } });
    const zona = h('div.mas-reset'); const pintaReset = conf => zona.replaceChildren(...(conf ? [h('p', '¿Seguro? Se perderá a ' + E.nombre + ' (y todo lo que ha crecido) para siempre.'), btn('Sí, empezar con otro huevo', () => reinicia(), { cls: 'danger solid' }), btn('No, cancelar', () => pintaReset(false))] : [btn('Empezar con otro huevo', () => pintaReset(true), { cls: 'danger' })]));
    pintaReset(false);
    return h('div.mas-p-b', h('label.mas-field', h('span', 'Nombre'), h('div.mas-name', inp, btn('Guardar', guardaN, { cls: 'primary' }))), h('div.mas-pick', h('b', 'Color de la bobina'), colorPicker()),
      h('div.mas-row', h('span', 'Sonidos suaves'), btn(E.sonido ? '🔊 Activados' : '🔇 Silenciado', ev => { alternaSonido(); ev.currentTarget.querySelector('span').textContent = E.sonido ? '🔊 Activados' : '🔇 Silenciado'; }, { title: 'Activar o silenciar los sonidos' })),
      h('p.muted.tiny', 'Los sonidos empiezan apagados y solo suenan tras tocar algo.'), zona);
  }
  function panelAyuda() {
    return h('div.mas-p-b.mas-help',
      h('p', h('b', E.nombre), ' es una mascota virtual que vive en una bobina de filamento. Solo es para pasar el rato: ', h('b', 'no toca nada del negocio'), ' (ni pedidos, ni stock, ni puntos). Se guarda solo en este aparato.'),
      h('ul', h('li', '🥚 Empieza como huevo: tócalo para darle calor. Luego crece en 4 etapas: bebé, niño, joven y adulto. Crece con el tiempo real y más rápido si está bien cuidado.'),
        h('li', '📊 Seis barras: comida, energía, diversión, higiene, salud y cariño. Bajan con el tiempo, ', h('b', 'también con la app cerrada'), '. Cada personalidad se cansa, se ensucia o se aburre a su ritmo.'),
        h('li', '🍽️ Comer: cada comida tiene sus efectos y su favorita. Si come de más se empacha. 🎮 Jugar: dos minijuegos y su juguete; dan diversión y monedas. 🛁 Bañar: frótalo con el dedo. 💊 Curar y 🩺 revisión cuando esté malito.'),
        h('li', '💡 Luz: de noche, con la luz apagada, duerme y recupera energía mucho más rápido. Si no duerme se pone de mal humor.'),
        h('li', '👆 Toca para acariciarlo; arrastra el dedo para hacerle mimos. Si le das muchos toques seguidos se marea y se enfada.'),
        h('li', '🛍️ Con las monedas del juego compras gorros, gafas, ropa, fondos y juguetes.'),
        h('li', '💚 ', h('b', 'Bobi no muere nunca:'), ' si pasas mucho tiempo sin cuidarlo se queda triste, débil o malito, pero se recupera con comida, medicina y mimos.')),
      h('p.muted.tiny', 'Atajos: Intro con el dibujo enfocado = caricia; Esc cierra paneles y juegos; ← → mueven la bobina en el juego de las gotas.'));
  }
  function reinicia() {
    const sonido = E.sonido; E = L.nuevo(Date.now()); E.sonido = sonido; S.dx = null; S.parts = []; S.comida = null; S.evo = null; S.ultAnimo = null; fondoCache.clave = '';
    guarda(); panel = null; ultVista = ''; modo = 'sala'; ov.replaceChildren(); decir('¡Un huevo nuevo! Dale calor 🥚', 5000); pinta();
  }

  // ===== sonido: botón =====
  function alternaSonido() {
    E.sonido = !E.sonido; if (E.sonido) { gesto(); } guarda(); pinta(); if (E.sonido) { sfx('ok'); } toast(E.sonido ? 'Sonidos activados' : 'Sonidos silenciados', 'ok', 1800);
  }

  // ===== interacción con el dibujo =====
  const toLogico = ev => { const r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * HH / r.height }; };
  const sobreBobi = p => { const g = geo(); return ((p.x - g.cx) / (g.rx * 1.12)) ** 2 + ((p.y - g.cy) / (g.ry * 1.12)) ** 2 <= 1; };
  let drag = null;
  function acaricia(p) {
    const r = L.tocar(E, Date.now()); E = r.e;
    const g = geo();
    if (r.reaccion === 'huevo') { S.sq = 0.12; S.sqv = 0; sfx('toque'); S.rotImp = 1; part('chispa', p.x, p.y, { vida: 0.5 }); const prog = L.huevoProg(E); if (prog >= 1) tic(); if (prog > 0.6 && Math.random() < 0.4) decir('*toc toc*', 1500); }
    else if (r.reaccion === 'corazones') { S.sq = 0.16; S.sqv = 0; for (let i = 0; i < 3; i++) part('corazon', g.cx + rr(-30, 30), g.cy - g.ry * 0.6 + rr(-10, 10)); sfx('toque'); if (L.animoId(E) !== 'durmiendo') S.look = { x: 0, y: -0.3 }; resuelve('caricia'); logros(); }
    else if (r.reaccion === 'mareo') { S.sq = 0.1; sfx('error'); if (E.mareo >= 50) decir('¡Uuuf, me mareo!', 2500); }
    else if (r.reaccion === 'enfado') { S.shake = 0.5; sfx('mala'); decir('¡Ya vale, que me enfado!', 2500); }
    else if (r.reaccion === 'dormido') { S.sq = 0.03; decir('Zzz… (déjame dormir)', 2000); }
    guarda(); pinta();
  }
  function onDown(ev) {
    gesto(); if (modo === 'evo') return; ev.preventDefault(); try { canvas.setPointerCapture(ev.pointerId); } catch (e) { }
    const p = toLogico(ev);
    if (modo === 'bano') { drag = { p, ult: p, bano: true }; frotar(p.x, p.y, 4); return; }
    if (modo === 'gotas' && S.G) { S.G.objX = p.x; drag = { p, ult: p, juego: true }; return; }
    if (modo !== 'sala') return;
    drag = { p, ult: p, dist: 0, acc: 0, sobre: sobreBobi(p), t0: performance.now() };
    // juguete en el suelo
    if (!drag.sobre && E.puesto.juguete && Math.hypot(p.x - 78, p.y - 305) < 34) { drag.juguete = true; }
  }
  function onMove(ev) {
    const p = toLogico(ev); S.objetivo = p;
    if (modo === 'gotas' && S.G) { S.G.objX = p.x; return; }
    if (modo === 'bano' && S.bano) { if (drag) { const d = Math.hypot(p.x - drag.ult.x, p.y - drag.ult.y); frotar(p.x, p.y, d); drag.ult = p; } else S.bano.esp = p; return; }
    if (!drag || modo !== 'sala') return;
    const d = Math.hypot(p.x - drag.ult.x, p.y - drag.ult.y); drag.dist += d; drag.ult = p;
    if (drag.sobre && drag.dist > 12 && E.etapa !== 'huevo') {
      drag.acc += d; S.look = { x: clamp((p.x - CX) / 80, -1, 1), y: clamp((p.y - geo().cy) / 80, -1, 1) };
      if (drag.acc >= 40) { const n = Math.floor(drag.acc / 40); drag.acc -= n * 40; const r = L.mimar(E, n); if (r.ok) { E = r.e; S.sq = 0.06; if (Math.random() < 0.6) part('corazon', p.x, p.y - 10); sfx('mimo'); resuelve('caricia'); pinta(); } else if (!E.luz) { drag.acc = 0; } }
    }
  }
  function onUp(ev) {
    if (!drag) return; const d = drag; drag = null; try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { }
    if (d.bano || d.juego) return; if (modo !== 'sala') return;
    if (d.dist < 12) {
      if (d.sobre) acaricia(d.p);
      else if (d.juguete) { const r = L.usarJuguete(E); if (r.ok) { aplica(r); S.juguete = { t: 0, dur: 2.2 }; sfx('ok'); } else aplica(r); }
    } else if (d.sobre) { guarda(); }
  }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => { S.objetivo = null; });
  canvas.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && modo === 'sala') { ev.preventDefault(); gesto(); acaricia({ x: CX, y: geo().cy }); } });
  root.addEventListener('keydown', gesto, true);
  const onKey = ev => {
    const t = ev.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === 'Escape') { if (modo === 'gotas') finGotas(); else if (modo === 'memoria') finMemoria(); else if (modo === 'bano') salirModo(); else if (panel) cierraPanel(); return; }
    if (modo === 'gotas' && S.G) { if (ev.key === 'ArrowLeft' || ev.key === 'a') { S.G.tecla = -1; ev.preventDefault(); } else if (ev.key === 'ArrowRight' || ev.key === 'd') { S.G.tecla = 1; ev.preventDefault(); } }
  };
  const onKeyUp = ev => { if (S.G && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' || ev.key === 'a' || ev.key === 'd')) S.G.tecla = 0; };
  addEventListener('keydown', onKey); addEventListener('keyup', onKeyUp);
  limpiezas.push(() => { removeEventListener('keydown', onKey); removeEventListener('keyup', onKeyUp); });

  // ===== bucle de animación =====
  let S_ = 2;
  function ajusta() {
    const w = stage.clientWidth || 400, dpr = Math.min(2.5, window.devicePixelRatio || 1), cw = Math.max(200, Math.round(w * dpr));
    if (canvas.width !== cw) { canvas.width = cw; canvas.height = Math.round(cw * HH / W); } S_ = canvas.width / W;
  }
  function actualiza(dt) {
    if (S.congelado) { S.t = 1; S.sq = 0; S.sqv = 0; S.salto = 0; S.vsalto = 0; S.blink = 0; S.blinkPh = 0; S.look.x = 0; S.look.y = 0; S.shake = 0; S.mastica = 0; S.comida = null; S.juguete = null; S.parts.length = 0; return; } // (solo pruebas) dibujo quieto para comparar píxeles
    S.t += dt;
    // parpadeo
    S.blinkT -= dt; if (S.blinkT <= 0) { S.blinkPh = 0.17; S.blinkT = 2 + Math.random() * 3.2; if (Math.random() < 0.2) S.blinkT = 0.3; }
    if (S.blinkPh > 0) { S.blinkPh -= dt; S.blink = Math.sin(clamp(S.blinkPh / 0.17, 0, 1) * Math.PI); } else S.blink = 0;
    // mirada hacia el puntero
    const g = geo(); let tx = 0, ty = 0; if (S.objetivo && modo === 'sala') { tx = clamp((S.objetivo.x - g.cx) / 90, -1, 1); ty = clamp((S.objetivo.y - g.cy) / 90, -1, 1); } else { tx = Math.sin(S.t * 0.6) * 0.35; ty = Math.sin(S.t * 0.43) * 0.1; }
    S.look.x += (tx - S.look.x) * Math.min(1, dt * 8); S.look.y += (ty - S.look.y) * Math.min(1, dt * 8);
    // muelle de aplastamiento y salto
    S.sqv += (-130 * S.sq - 11 * S.sqv) * dt; S.sq += S.sqv * dt;
    if (S.salto > 0 || S.vsalto > 0) { S.vsalto -= 1150 * dt; S.salto += S.vsalto * dt; if (S.salto <= 0) { S.salto = 0; if (S.vsalto < -100) S.sqv -= 2.2; S.vsalto = 0; } }
    S.shake = Math.max(0, S.shake - dt);
    const mood = L.animoId(E);
    if (E.etapa !== 'huevo' && E.luz && modo === 'sala') {
      S.proxSalto -= dt; if (S.proxSalto <= 0) { if (mood === 'emocionado') { S.vsalto = 320; S.proxSalto = 1.2 + Math.random() * 1.6; } else if (mood === 'feliz') { S.vsalto = 230; S.proxSalto = 3.5 + Math.random() * 4; } else S.proxSalto = 2 + Math.random() * 3; }
      if (E.evento && E.evento.tipo === 'hipo') { S.hipoT -= dt; if (S.hipoT <= 0) { S.hipoT = 1.4; S.vsalto = 120; S.sq = 0.1; part('texto', g.cx + 40, g.cy - g.ry, { txt: '¡hip!', col: '#fde047' }); } }
      if (mood === 'sucio' || mood === 'enfermo') { S.moscaT -= dt; if (S.moscaT <= 0) { S.moscaT = 2; } }
    }
    if (E.etapa === 'huevo') { S.proxSalto -= dt; const prog = L.huevoProg(E); if (S.proxSalto <= 0) { S.sqv += 1.2 + prog * 2; S.proxSalto = Math.max(0.8, 3.5 - prog * 3) + Math.random() * 2; } S.rotImp = (S.rotImp || 0) * Math.pow(0.02, dt); }
    if (!E.luz && E.etapa !== 'huevo') { S.zzzT -= dt; if (S.zzzT <= 0) { S.zzzT = 1.8; part('zzz', g.cx + g.rx * 0.5, g.cy - g.ry * 0.7); } }
    if (S.comida) { S.comida.t += dt; if (S.comida.t >= S.comida.dur) { for (let i = 0; i < 8; i++) part('miga', g.cx + rr(-14, 14), g.cy + g.ry * 0.3, { col: ['#d97706', '#ef4444', '#16a34a', '#f9a8d4'][Math.floor(Math.random() * 4)] }); S.mastica = 0.9; S.comida = null; } }
    if (S.mastica > 0) S.mastica -= dt;
    if (S.juguete) { S.juguete.t += dt; if (Math.sin(S.juguete.t * 6) > 0.97 && S.juguete.t < S.juguete.dur) { S.vsalto = Math.max(S.vsalto, 160); } if (S.juguete.t >= S.juguete.dur) S.juguete = null; }
    if (modo === 'evo' && S.evo) { S.evo.t += dt; S.evo.p = clamp(S.evo.t / 3.2, 0, 1); }
    if (modo === 'gotas') pasoGotas(dt);
    // emociones sueltas
    if (mood === 'emocionado' && Math.random() < dt * 2) part('chispa', g.cx + rr(-g.rx, g.rx), g.cy - g.ry * rr(0.4, 1.2));
    updParts(dt);
  }
  function frame(ts) {
    raf = 0; if (muerto) return;
    if (document.hidden) return;
    S.frames = (S.frames || 0) + 1;
    const dt = Math.min(0.05, ultimoFrame ? (ts - ultimoFrame) / 1000 : 0.016); ultimoFrame = ts;
    try { ajusta(); actualiza(dt); dibuja(S_); } catch (e) { console.error(e); }
    raf = requestAnimationFrame(frame);
  }
  const arranca = () => { if (!raf && !muerto && !document.hidden) { ultimoFrame = 0; raf = requestAnimationFrame(frame); } if (!tickId && !muerto) tickId = setInterval(tic, 1000); };
  const paraTodo = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } if (tickId) { clearInterval(tickId); tickId = 0; } };
  const onVis = () => { if (document.hidden) paraTodo(); else { tic(); arranca(); } };
  document.addEventListener('visibilitychange', onVis); limpiezas.push(() => document.removeEventListener('visibilitychange', onVis));
  let ro = null; try { ro = new ResizeObserver(() => { if (!muerto) { ajusta(); fondoCache.clave = ''; } }); ro.observe(stage); } catch (e) { const f = () => { ajusta(); fondoCache.clave = ''; }; addEventListener('resize', f); limpiezas.push(() => removeEventListener('resize', f)); }

  // ===== arranque: ponerse al día con el tiempo real que ha pasado =====
  { const antes = E, ms = Date.now() - E.ultimaVez;
    if (ms > 1000) { let n = L.avanzar(E, ms); n.ultimaVez = Date.now(); E = n; }
    else E.ultimaVez = Math.max(E.ultimaVez, Math.min(Date.now(), E.ultimaVez));
    const bonus = L.bonusRegreso(E, ms); if (bonus.ok) { E = bonus.e; }
    logros(); guarda(); ajusta(); pinta(); S.ultAnimo = L.animo(E).id;
    if (anteriorRoto) decir('No pude leer a tu mascota anterior: aquí tienes un huevo nuevo.', 6000);
    else if (antes.etapa === 'huevo' && E.etapa !== 'huevo') timeout(() => lanzaEvo('huevo', E.etapa), 300);
    else if (antes.etapa !== E.etapa) timeout(() => lanzaEvo(antes.etapa, E.etapa), 300);
    else if (ms > 20 * 60000 && E.etapa !== 'huevo') { const a = L.animo(E); decir(bonus.ok ? bonus.msg : (a.tono === 'mal' ? a.burbujas[0] : '¡Has vuelto! Te echaba de menos 💗'), 6000); }
    else if (E.etapa === 'huevo') decir('Toca el huevo para darle calor', 4000);
    else decir(L.animo(E).burbujas[0], 3500); }
  arranca();

  // ===== gancho para pruebas =====
  const fusiona = (d, s) => { for (const k of Object.keys(s)) { if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue; if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) fusiona(d[k], s[k]); else d[k] = s[k]; } return d; };
  window.__mascota = {
    estado: () => JSON.parse(JSON.stringify(E)),
    set(parcial) {
      const copia = fusiona(JSON.parse(JSON.stringify(E)), JSON.parse(JSON.stringify(parcial || {})));
      if (parcial && parcial.etapa && parcial.etapa !== 'huevo' && parcial.crecMs == null) { const inf = L.etapaInfo(parcial.etapa); copia.crecMs = Math.max(0, inf.desde) + 1000; }
      if (parcial && parcial.etapa && parcial.etapa !== 'huevo' && copia.eclosion == null) copia.eclosion = Date.now();
      E = L.sanear(copia, Date.now()); fondoCache.clave = ''; ultVista = ''; guarda(); pinta(); return window.__mascota.estado();
    },
    avanzar(ms) { avanzaMs(ms); guarda(); pinta(); return window.__mascota.estado(); },
    animo: () => L.animo(E), modo: () => modo, panel: () => panel,
    accion(nombre, arg) {
      switch (nombre) {
        case 'comer': return hacerComer(arg || 'manzana');
        case 'curar': return hacerCurar();
        case 'banar': { const r = L.banar(E, arg == null ? 1 : arg); aplica(r); if (r.ok) for (let i = 0; i < 8; i++) part('burbuja', CX + rr(-60, 60), GROUND - rr(20, 120)); return r; }
        case 'luz': { const res = arg == null ? (E.luz ? L.luz(E, false) : L.luz(E, true)) : L.luz(E, !!arg); aplica(res); return res; }
        case 'tocar': acaricia({ x: CX, y: geo().cy }); return { ok: true };
        case 'mimar': { const r = L.mimar(E, arg == null ? 3 : arg); aplica(r, { silencio: true }); return r; }
        case 'revision': return hacerRevision();
        case 'jugar': { const a = arg || {}; const r = L.jugar(E, a.juego || 'gotas', a.puntos == null ? 10 : a.puntos); aplica(r); if (r.ok) resuelve('jugar'); return r; }
        case 'juguete': return jugarJuguete();
        case 'comprar': { const r = L.comprar(E, arg); aplica(r); return r; }
        case 'equipar': { const r = L.equipar(E, arg); aplica(r); return r; }
        case 'quitar': { const r = L.quitar(E, arg); aplica(r); return r; }
        case 'reiniciar': reinicia(); return { ok: true };
        case 'abrir': abrePanel(arg); return { ok: true };
        case 'bano': return { ok: empiezaBano() };
        case 'gotas': empiezaGotas(); return { ok: modo === 'gotas' };
        case 'memoria': empiezaMemoria(); return { ok: modo === 'memoria' };
        case 'evento': { const ev = L.eventoAleatorio(E, () => (arg == null ? 0.5 : arg)); if (!ev) return { ok: false }; E = L.ponerEvento(E, ev); decir(ev.texto, 6000); pinta(); return { ok: true, ev }; }
        default: return { ok: false, msg: 'acción desconocida: ' + nombre };
      }
    },
    juegoEstado() {
      if (S.G) return { tipo: 'gotas', pts: S.G.g.pts, t: S.G.g.t, x: S.G.g.x, gotas: S.G.g.gotas.map(d => ({ x: d.x, y: d.y, tipo: d.tipo })), fin: S.G.g.fin, cobrado: S.G.cobrado };
      if (S.M) return { tipo: 'memoria', estado: S.M.m.estado, sec: S.M.m.sec.slice(), idx: S.M.m.idx, ronda: S.M.m.ronda, puntos: S.M.m.puntos };
      if (S.bano) return { tipo: 'bano', manchas: S.bano.m.map(m => ({ x: geo().cx + m.ux * geo().rx, y: geo().cy + m.uy * geo().ry, hp: m.hp })) };
      return null;
    },
    congela: b => { S.congelado = !!b; return S.congelado; }, frames: () => S.frames || 0, geo: () => geo(), canvas: () => canvas, evo: () => S.evo ? { de: S.evo.de, a: S.evo.a, p: S.evo.p } : null
  };

  return {
    destroy() {
      muerto = true; paraTodo(); timers.forEach(clearTimeout); timers.clear(); gTimers.forEach(clearTimeout); gTimers.clear(); clearTimeout(S.bubbleTimer);
      limpiezas.forEach(f => { try { f(); } catch (e) { } }); if (ro) { try { ro.disconnect(); } catch (e) { } }
      try { guarda(); } catch (e) { }
      try { if (au.ctx) au.ctx.close(); } catch (e) { } au.ctx = null;
      delete window.__mascota;
    }
  };
}
