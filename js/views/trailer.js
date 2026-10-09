// ================= v18 · 🎬 TRÁILER DEL MES: tus números convertidos en un vídeo de cine =================
// Eliges un mes y el programa monta un tráiler (vertical para reels/estados u horizontal) con música hecha aquí mismo:
// pedidos, facturación (y cómo va frente al mes anterior), el producto estrella, tus clientes y tu mejor día.
// TODO sale de tus pedidos reales (los cancelados no cuentan). Si de algo no hay datos, esa escena no sale. Si el mes no
// tiene pedidos, no hay tráiler y se dice. El vídeo se hace en este aparato: nada se sube a ningún sitio.
import { h, mount, btn, toast, eur } from '../ui.js';
import { S, can, byId } from '../store.js';
import { grabarConSonido } from '../nacer.js';
import { PAISES, paisDe } from './inteligencia.js';

const CL = window.CL;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dinero = () => can('informes.ver') || can('productos.costes');
const entre = (v, a, b) => Math.max(a, Math.min(b, v));
const sal = u => 1 - Math.pow(1 - entre(u, 0, 1), 3); // frena al llegar

// ---------- los datos del mes (función pura: se prueba sin pantalla) ----------
export function datosTrailer(ym, pedidos = S.t.pedidos, cfg = S.cfg) {
  const est = k => ((cfg.pedidos.estados || []).find(s => s.k === k) || {});
  const L = (pedidos || []).filter(o => !o.eliminado && !est(o.estado).cancelled).map(o => ({ o, f: String(o.fecha || o.creado || '').slice(0, 10), t: Number(CL.orderTotal(o)) || 0 }));
  const [a, m] = ym.split('-').map(Number), antes = m === 1 ? (a - 1) + '-12' : a + '-' + String(m - 1).padStart(2, '0');
  const del = k => L.filter(x => x.f.slice(0, 7) === k), M = del(ym), A = del(antes), suma = l => Math.round(l.reduce((s, x) => s + x.t, 0) * 100) / 100;
  const top = (l, clave, valor) => { const r = {}; l.forEach(x => { const k = clave(x); if (k) r[k] = (r[k] || 0) + valor(x); }); return Object.entries(r).sort((p, q) => q[1] - p[1]); };
  const prod = top(M, x => String(x.o.producto || '').trim(), x => Number(x.o.cantidad) || 1)[0] || null;
  const cli = top(M, x => x.o.clienteId || CL.norm(x.o.cliente), () => 1);
  const dias = top(M, x => x.f, () => 1)[0] || null;
  const paises = top(M, x => { const c = x.o.clienteId ? byId('clientes', x.o.clienteId) : null; return paisDe((c && c.pais) || x.o.pais); }, () => 1).map(p => (PAISES[p[0]] || [p[0]])[0]);
  const ventas = suma(M), vAntes = suma(A);
  return { ym, titulo: MESES[m - 1].toUpperCase() + ' ' + a, mes: MESES[m - 1], pedidos: M.length, ventas, antes: { pedidos: A.length, ventas: vAntes },
    cambio: A.length && vAntes > 0 ? Math.round((ventas - vAntes) / vAntes * 100) : null, estrella: prod ? { nombre: prod[0], uds: prod[1] } : null,
    clientes: cli.length, repiten: cli.filter(x => x[1] > 1).length, paises, mejorDia: dias && dias[1] > 1 ? { f: dias[0], n: dias[1] } : null,
    ticket: M.length ? Math.round(ventas / M.length * 100) / 100 : 0 };
}
export function mesesConPedidos(pedidos = S.t.pedidos, hoy = S.hoy) {
  const s = new Set([hoy.slice(0, 7)]); (pedidos || []).forEach(o => { const f = String(o.fecha || o.creado || '').slice(0, 7); if (/^\d{4}-\d{2}$/.test(f) && !o.eliminado) s.add(f); });
  return [...s].sort().reverse().slice(0, 12);
}
// ---------- el guion: qué escenas salen y cuánto duran ----------
export function guion(D, conDinero = true) {
  if (!D.pedidos) return [];
  const E = [{ k: 'titulo', d: 3 }, { k: 'pedidos', d: 3.6 }];
  if (conDinero && D.ventas > 0) E.push({ k: 'ventas', d: 3.6 });
  if (D.estrella) E.push({ k: 'estrella', d: 3.6 });
  if (D.clientes) E.push({ k: 'clientes', d: 3.6 });
  E.push({ k: 'final', d: 3.6 });
  let t = 0; E.forEach(e => { e.t = Math.round(t * 100) / 100; t += e.d; });
  return E;
}
export const duracion = E => (E.length ? E[E.length - 1].t + E[E.length - 1].d : 0);

// ---------- la música (100 golpes por minuto, hecha con el sintetizador del navegador) ----------
const ACORDES = [[220, 261.63, 329.63, 55], [174.61, 220, 261.63, 43.65], [261.63, 329.63, 392, 65.41], [196, 246.94, 293.66, 49]]; // la menor · fa · do · sol
export function partitura(E) {
  const T = duracion(E), ev = [], B = 0.6; if (!T) return ev;
  E.forEach((e, i) => { ev.push({ s: 'golpe', t: e.t, v: i ? 0.5 : 0.7 }); if (i) ev.push({ s: 'sube', t: e.t - 1.2, d: 1.2 }); });
  const fin = E[E.length - 1].t;
  for (let t = 0, k = 0; t < T - 0.05; t += 2.4, k++) { const a = ACORDES[k % 4]; ev.push({ s: 'pad', t, d: Math.min(2.5, T - t), f: a.slice(0, 3), v: t >= fin ? 0.11 : 0.07 }); }
  for (let t = E[1] ? E[1].t : 3, k = 0; t < fin - 0.05; t += B, k++) { const a = ACORDES[Math.floor((t + 0.001) / 2.4) % 4]; ev.push({ s: 'bombo', t }, { s: 'bajo', t, f: a[3], d: B * 0.9 }); if (k >= 6) ev.push({ s: 'hat', t: t + B / 2 }); }
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => ev.push({ s: 'tin', t: fin + 0.6 + i * 0.3, f, d: 1.6 }));
  return ev.sort((a, b) => a.t - b.t);
}
export function tocar(AC, salida, ev) {
  const b = AC.currentTime + 0.06, m = AC.createGain(), comp = AC.createDynamicsCompressor(); m.gain.value = 0.9; m.connect(comp); comp.connect(salida);
  const ruido = AC.createBuffer(1, AC.sampleRate, AC.sampleRate), dd = ruido.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
  const osc = (tipo, f, a, d, v, at = 0.01) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = tipo; o.frequency.setValueAtTime(f, a); g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(v, a + at); g.gain.exponentialRampToValueAtTime(0.0001, a + d); o.connect(g); g.connect(m); o.start(a); o.stop(a + d + 0.05); return o; };
  const sopl = (a, d, v, f0, f1) => { const n = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); n.buffer = ruido; n.loop = true; fl.type = 'bandpass'; fl.Q.value = 1.2; fl.frequency.setValueAtTime(f0, a); fl.frequency.exponentialRampToValueAtTime(f1, a + d); g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(v, a + d * 0.92); g.gain.exponentialRampToValueAtTime(0.0001, a + d + 0.08); n.connect(fl); fl.connect(g); g.connect(m); n.start(a); n.stop(a + d + 0.12); };
  ev.forEach(e => { const a = b + e.t;
    if (e.s === 'golpe') { const o = osc('sine', 120, a, 1.3, e.v, 0.005); o.frequency.exponentialRampToValueAtTime(36, a + 0.6); const n = AC.createBufferSource(), g = AC.createGain(), fl = AC.createBiquadFilter(); n.buffer = ruido; fl.type = 'highpass'; fl.frequency.value = 3000; g.gain.setValueAtTime(e.v * 0.35, a); g.gain.exponentialRampToValueAtTime(0.0001, a + 0.9); n.connect(fl); fl.connect(g); g.connect(m); n.start(a); n.stop(a + 1); }
    else if (e.s === 'sube') sopl(a, e.d, 0.16, 300, 6000);
    else if (e.s === 'bombo') { const o = osc('sine', 150, a, 0.28, 0.6, 0.004); o.frequency.exponentialRampToValueAtTime(42, a + 0.18); }
    else if (e.s === 'bajo') osc('triangle', e.f, a, e.d, 0.3, 0.012);
    else if (e.s === 'hat') { const n = AC.createBufferSource(), g = AC.createGain(), fl = AC.createBiquadFilter(); n.buffer = ruido; fl.type = 'highpass'; fl.frequency.value = 7000; g.gain.setValueAtTime(0.09, a); g.gain.exponentialRampToValueAtTime(0.0001, a + 0.06); n.connect(fl); fl.connect(g); g.connect(m); n.start(a); n.stop(a + 0.08); }
    else if (e.s === 'pad') e.f.forEach((f, i) => { osc('sawtooth', f, a, e.d, e.v * 0.5, 0.5); osc('triangle', f * 2 * (1 + (i - 1) * 0.003), a, e.d, e.v * 0.6, 0.6); });
    else osc('triangle', e.f, a, e.d, 0.16, 0.006);
  });
  return b;
}

// ---------- el dibujo ----------
const FD = 'Bahnschrift, "Segoe UI", Arial, sans-serif';
function texto(g, s, x, y, tam, o = {}) {
  g.save(); g.font = (o.peso || 700) + ' ' + tam + 'px ' + FD; g.textAlign = o.al || 'center'; g.textBaseline = 'middle'; try { g.letterSpacing = (o.esp || 0) + 'px'; } catch (e) { }
  g.globalAlpha = entre(o.a === undefined ? 1 : o.a, 0, 1);
  // que quepa siempre: si es más ancho que el hueco, se encoge
  let w = g.measureText(s).width; if (o.max && w > o.max) { tam = tam * o.max / w; g.font = (o.peso || 700) + ' ' + tam + 'px ' + FD; }
  if (o.grad) { w = Math.min(g.measureText(s).width, o.max || 1e9); const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, '#8f82ff'); gr.addColorStop(0.55, '#f472b6'); gr.addColorStop(1, '#22d3ee'); g.fillStyle = gr; } else g.fillStyle = o.col || '#eef1fb';
  if (o.brillo) { g.shadowColor = o.brillo; g.shadowBlur = tam * 0.35; }
  g.fillText(s, x, y); g.restore();
}
function fondo(g, W, H, t, T) {
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#05070d'); gr.addColorStop(0.5, '#0c1026'); gr.addColorStop(1, '#070a14'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const m = Math.max(W, H);
  [['#8f82ff', 0.18, 0.2, 0.07], ['#22d3ee', 0.82, 0.75, -0.05], ['#f472b6', 0.55, 0.45, 0.04]].forEach(([c, x, y, v], i) => { const cx = (x + Math.sin(t * 0.5 + i * 2) * 0.08 + v * t * 0.2) * W, cy = (y + Math.cos(t * 0.4 + i) * 0.06) * H, r = g.createRadialGradient(cx, cy, 0, cx, cy, m * 0.55); r.addColorStop(0, c); r.addColorStop(1, 'transparent'); g.globalAlpha = 0.2; g.fillStyle = r; g.fillRect(0, 0, W, H); });
  g.globalAlpha = 1; g.fillStyle = '#fff';
  for (let i = 0; i < 70; i++) { const x = ((i * 137.5 + t * (6 + (i % 5) * 4)) % (W + 40)) - 20, y = (i * 97.3 + Math.sin(t * 0.7 + i) * 12) % H, r = (i % 3 + 1) * m / 1400; g.globalAlpha = 0.15 + 0.25 * Math.abs(Math.sin(t * 1.3 + i)); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  const v = g.createRadialGradient(W / 2, H / 2, m * 0.25, W / 2, H / 2, m * 0.75); v.addColorStop(0, 'transparent'); v.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  // la barra de avance, abajo
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(W * 0.08, H * 0.955, W * 0.84, Math.max(2, H * 0.003)); const b = g.createLinearGradient(W * 0.08, 0, W * 0.92, 0); b.addColorStop(0, '#8f82ff'); b.addColorStop(1, '#22d3ee'); g.fillStyle = b; g.fillRect(W * 0.08, H * 0.955, W * 0.84 * entre(t / T, 0, 1), Math.max(2, H * 0.003));
}
const numero = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// u = 0…1 dentro de la escena. u es la unidad de medida (el lado corto / 100)
const ESCENA = {
  titulo(g, W, H, u, D, q) { const a = sal(u / 0.35), f = 1 - sal((u - 0.85) / 0.15);
    texto(g, 'CELEBRIDISEÑOS PRESENTA', W / 2, H * 0.36, 2.6 * q, { esp: q * (1.6 - a), a: a * f, col: '#9aa4c7', max: W * 0.86 });
    texto(g, D.titulo, W / 2, H * 0.48 + (1 - a) * 4 * q, 12 * q, { grad: true, a: sal((u - 0.12) / 0.3) * f, max: W * 0.88, esp: q * 0.3, brillo: 'rgba(143,130,255,.6)' });
    texto(g, 'EL TRÁILER', W / 2, H * 0.6, 4.2 * q, { esp: q * 2.2, a: sal((u - 0.35) / 0.3) * f, max: W * 0.8 }); },
  pedidos(g, W, H, u, D, q) { const a = sal(u / 0.2), f = 1 - sal((u - 0.88) / 0.12), n = D.pedidos * sal(u / 0.55);
    texto(g, 'ESTE MES HAN ENTRADO', W / 2, H * 0.32, 3 * q, { esp: q * 0.9, a: a * f, col: '#9aa4c7', max: W * 0.86 });
    texto(g, numero(n), W / 2, H * 0.47, 30 * q * (0.92 + 0.08 * sal(u / 0.55)), { grad: true, a: a * f, max: W * 0.86, brillo: 'rgba(34,211,238,.5)' });
    texto(g, D.pedidos === 1 ? 'PEDIDO' : 'PEDIDOS', W / 2, H * 0.62, 6 * q, { esp: q * 1.6, a: sal((u - 0.3) / 0.25) * f, max: W * 0.8 });
    if (D.antes.pedidos) texto(g, 'el mes anterior: ' + D.antes.pedidos, W / 2, H * 0.7, 2.6 * q, { a: sal((u - 0.5) / 0.25) * f, col: '#9aa4c7', peso: 500, max: W * 0.8 }); },
  ventas(g, W, H, u, D, q) { const a = sal(u / 0.2), f = 1 - sal((u - 0.88) / 0.12), n = D.ventas * sal(u / 0.6);
    texto(g, 'HAS FACTURADO', W / 2, H * 0.33, 3 * q, { esp: q * 0.9, a: a * f, col: '#9aa4c7', max: W * 0.86 });
    texto(g, numero(n) + ' €', W / 2, H * 0.47, 22 * q, { grad: true, a: a * f, max: W * 0.86, brillo: 'rgba(244,114,182,.5)' });
    if (D.cambio !== null) { const sube = D.cambio >= 0; texto(g, (sube ? '▲ +' : '▼ ') + D.cambio + ' % frente al mes anterior', W / 2, H * 0.6, 3.4 * q, { a: sal((u - 0.45) / 0.25) * f, col: sube ? '#34d399' : '#fbbf24', max: W * 0.86 }); }
    texto(g, 'media por pedido: ' + eur(D.ticket), W / 2, H * 0.67, 2.6 * q, { a: sal((u - 0.55) / 0.25) * f, col: '#9aa4c7', peso: 500, max: W * 0.8 }); },
  estrella(g, W, H, u, D, q) { const a = sal(u / 0.2), f = 1 - sal((u - 0.88) / 0.12), z = sal(u / 0.4);
    texto(g, '★', W / 2, H * 0.3, 13 * q * (0.6 + 0.4 * z), { a: a * f, col: '#fde68a', brillo: 'rgba(253,230,138,.8)' });
    texto(g, 'LA ESTRELLA DEL MES', W / 2, H * 0.4, 3 * q, { esp: q * 0.9, a: a * f, col: '#9aa4c7', max: W * 0.86 });
    texto(g, D.estrella.nombre.toUpperCase(), W / 2, H * 0.5, 9 * q, { grad: true, a: sal((u - 0.15) / 0.3) * f, max: W * 0.86 });
    texto(g, numero(D.estrella.uds) + (D.estrella.uds === 1 ? ' unidad' : ' unidades'), W / 2, H * 0.6, 4.4 * q, { a: sal((u - 0.35) / 0.25) * f, max: W * 0.8 }); },
  clientes(g, W, H, u, D, q) { const a = sal(u / 0.2), f = 1 - sal((u - 0.88) / 0.12);
    texto(g, 'HAN CONFIADO EN TI', W / 2, H * 0.31, 3 * q, { esp: q * 0.9, a: a * f, col: '#9aa4c7', max: W * 0.86 });
    texto(g, numero(D.clientes * sal(u / 0.5)), W / 2, H * 0.44, 24 * q, { grad: true, a: a * f, max: W * 0.8, brillo: 'rgba(143,130,255,.5)' });
    texto(g, D.clientes === 1 ? 'CLIENTE' : 'CLIENTES', W / 2, H * 0.57, 5.4 * q, { esp: q * 1.6, a: sal((u - 0.25) / 0.25) * f, max: W * 0.8 });
    const l = []; if (D.repiten) l.push(D.repiten + (D.repiten === 1 ? ' ha repetido' : ' han repetido')); if (D.paises.length) l.push(D.paises.length === 1 ? 'desde ' + D.paises[0] : 'desde ' + D.paises.length + ' países');
    if (l.length) texto(g, l.join('  ·  '), W / 2, H * 0.65, 3 * q, { a: sal((u - 0.45) / 0.25) * f, col: '#67e8f9', max: W * 0.86 });
    if (D.mejorDia) { const d = new Date(D.mejorDia.f + 'T12:00:00'); texto(g, 'tu mejor día: el ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ', ' + D.mejorDia.n + ' pedidos', W / 2, H * 0.71, 2.6 * q, { a: sal((u - 0.55) / 0.25) * f, col: '#9aa4c7', peso: 500, max: W * 0.86 }); } },
  final(g, W, H, u, D, q, cfg) { const a = sal(u / 0.25);
    texto(g, 'Y ESTO NO PARA', W / 2, H * 0.4, 7 * q, { grad: true, a, esp: q * (1.4 - a * 0.6), max: W * 0.88, brillo: 'rgba(143,130,255,.6)' });
    texto(g, ((cfg && cfg.empresa && cfg.empresa.nombre) || 'CelebriDiseños').toUpperCase(), W / 2, H * 0.52, 5 * q, { a: sal((u - 0.25) / 0.3), esp: q * 0.8, max: W * 0.86 });
    texto(g, 'hecho a mano, pieza a pieza', W / 2, H * 0.59, 2.8 * q, { a: sal((u - 0.45) / 0.3), col: '#9aa4c7', peso: 500, max: W * 0.8 }); }
};
export function pintaTrailer(g, W, H, t, E, D, cfg) {
  const T = duracion(E), q = Math.min(W, H) / 100; fondo(g, W, H, t, T);
  const i = Math.max(0, E.findIndex((e, k) => t < e.t + e.d || k === E.length - 1)), e = E[i], u = entre((t - e.t) / e.d, 0, 1);
  ESCENA[e.k](g, W, H, u, D, q, cfg);
  if (i && t - e.t < 0.28) { g.globalAlpha = (1 - (t - e.t) / 0.28) * 0.7; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } // el fogonazo del corte
  // las dos bandas de cine
  g.fillStyle = '#000'; const b = H * 0.045; g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b);
  return e.k;
}

// ---------- la pantalla ----------
export function render(el) {
  const root = h('div.tr18'); el.appendChild(root);
  if (!can('pedidos.ver')) { mount(root, h('div.card', h('p.muted', 'Hace falta permiso para ver los pedidos.'))); return {}; }
  let ym = S.hoy.slice(0, 7), formato = 'v', vivo = true, AC = null, t0 = 0, suena = false, grabando = false;
  const cv = h('canvas.tr18-cv'), g = cv.getContext('2d'), caja = h('div.tr18-caja', cv), info = h('div.tr18-info'), mandos = h('div.tr18-mandos');
  const TAM = { v: [1080, 1920], h: [1920, 1080], c: [1080, 1080] };
  let D = null, E = [], T = 0;
  const lienzo = k => { const [w, hh] = TAM[formato]; cv.width = w * k; cv.height = hh * k; cv.dataset.formato = formato; };
  const cuadro = t => { if (E.length) pintaTrailer(g, cv.width, cv.height, t, E, D, S.cfg); };
  const para = () => { suena = false; try { AC && AC.close(); } catch (e) { } AC = null; };
  function prepara() {
    para(); D = datosTrailer(ym); E = guion(D, dinero()); T = duracion(E); t0 = performance.now(); lienzo(0.5);
    const nombre = D.mes.charAt(0).toUpperCase() + D.mes.slice(1) + ' de ' + ym.slice(0, 4);
    mount(info, E.length ? [h('b', nombre), h('span', ' · ' + D.pedidos + (D.pedidos === 1 ? ' pedido' : ' pedidos') + ' · ' + E.length + ' escenas · ' + Math.round(T) + ' segundos')] :
      h('span.muted', 'En ' + nombre + ' no hay pedidos: no hay tráiler que montar. Elige otro mes.'));
    caja.classList.toggle('vacio', !E.length);
    if (!E.length) { g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.width, cv.height); }
    window.__trailer = { D, E, T, ym, formato };
  }
  function bucle(now) {
    if (!vivo || !cv.isConnected) { vivo = false; para(); return; }
    requestAnimationFrame(bucle);
    if (grabando || !E.length || document.hidden) return;
    let t = (now - t0) / 1000; if (t > T + 0.8) { t0 = now; t = 0; if (suena) { para(); pintaMandos(); } }
    cuadro(Math.min(T - 0.001, t));
  }
  function conSonido() {
    if (!E.length) return; para();
    try { const A = window.AudioContext || window.webkitAudioContext; AC = new A(); tocar(AC, AC.destination, partitura(E)); suena = true; t0 = performance.now() + 60; } catch (e) { toast('Este aparato no puede sonar.', 'warn'); }
    pintaMandos();
  }
  async function crear() {
    if (!E.length || grabando) return; para(); grabando = true; pintaMandos(); lienzo(1);
    try {
      const ev = partitura(E), r = await grabarConSonido(cv, T, x => cuadro(Math.min(T - 0.001, x * T)), (a, d) => tocar(a, d, ev));
      const u = URL.createObjectURL(r.blob), a = h('a', { href: u, download: 'trailer_' + ym + '.' + r.ext }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000);
      window.__trailerVideo = { tam: r.blob.size, ext: r.ext, sonido: r.sonido, seg: T }; window.__trailerBlob = r.blob;
      toast('🎬 Tráiler guardado en Descargas: trailer_' + ym + '.' + r.ext + (r.sonido ? '' : ' (sin sonido: este aparato no lo graba)'), 'ok', 8000);
    } catch (e) { toast(String(e.message || e), 'bad', 8000); }
    grabando = false; lienzo(0.5); t0 = performance.now(); pintaMandos();
  }
  function pintaMandos() {
    const meses = mesesConPedidos();
    mount(mandos,
      h('div.field', h('label', 'Mes'), h('select.inp.tr18-mes', { onchange: e => { ym = e.target.value; prepara(); pintaMandos(); } }, meses.map(k => h('option', { value: k, selected: k === ym }, MESES[Number(k.slice(5)) - 1] + ' ' + k.slice(0, 4))))),
      h('div.field', h('label', 'Forma'), h('div.seg', [['v', '📱 Vertical'], ['c', '⬛ Cuadrado'], ['h', '🖥️ Horizontal']].map(([k, t]) => h('button' + (formato === k ? '.on' : ''), { type: 'button', 'data-formato': k, onclick: () => { formato = k; prepara(); pintaMandos(); } }, t)))),
      h('div.row.wrap', { style: { gap: '10px' } },
        btn(suena ? '⏹ Parar' : '▶ Ver con música', () => { if (suena) { para(); pintaMandos(); } else conSonido(); }, { cls: 'tr18-ver', disabled: !E.length || grabando }),
        btn(grabando ? '⏳ Montando… ' + Math.round(T) + ' s' : '🎬 Crear el vídeo', () => crear(), { cls: 'primary tr18-crear', disabled: !E.length || grabando })),
      h('p.tiny.muted', 'El vídeo se monta en este aparato con tus pedidos reales (los cancelados no cuentan) y se guarda en Descargas. La música la hace el propio programa: es tuya, sin derechos de nadie.'),
      dinero() ? null : h('p.tiny.muted', 'Sin permiso para ver importes: el tráiler sale sin la escena del dinero.'));
  }
  mount(root, h('div.page-head', h('div', h('h1', '🎬 Tráiler del mes'), h('div.muted', 'Tus números del mes, convertidos en un vídeo de cine para compartir.'))),
    h('div.tr18-g', caja, h('div.card.tr18-panel', info, mandos)));
  prepara(); pintaMandos(); requestAnimationFrame(bucle);
  return { destroy: () => { vivo = false; para(); } };
}
