// ================= v18 · 🏭 TALLER VIVO: tus pedidos moviéndose por el taller, en directo =================
// Sustituye a los juegos («quita los juegos, pon algo increíble»). No es un juego: es TU taller de verdad, dibujado.
//  · Cada cubo es un pedido abierto REAL, con el color de su estado. Está en su parada: Entrada → Impresoras → Mesa →
//    Empaquetado → Muelle. Cuando cambias un pedido de estado (aquí o en otro aparato), su cubo sube a la cinta y viaja solo.
//  · Las impresoras imprimen de verdad: la pieza crece con el % real de cada Bambu (en el programa del PC).
//  · Los pedidos con retraso laten en rojo; los que vencen hoy, en ámbar. Toca un cubo y se abre el pedido.
//  · Cuando un pedido se envía, el cubo entra en el camión y el camión sale.
// Nada se inventa: sin pedidos, el taller sale vacío y lo dice.
import { h, mount, btn, toast } from '../ui.js';
import { S, can, timing } from '../store.js';
import { go } from '../app.js';
import { BAMBU } from '../bambu.js';

const CL = window.CL;
export const PARADAS = [
  { k: 'confirmado', t: 'ENTRADA', d: 'Por imprimir', x: 2 }, { k: 'impresion', t: 'IMPRESORAS', d: 'Imprimiendo', x: 9.5 }, { k: 'postpro', t: 'MESA', d: 'Repasar y acabar', x: 17 },
  { k: 'empaquetar', t: 'EMPAQUETADO', d: 'Caja, tarjeta y etiqueta', x: 23.5 }, { k: 'listo', t: 'MUELLE', d: 'Listo para enviar', x: 30 }
];
const COLS = 4, FILAS = 3, HUECO = 1.05; // huecos de cada parada (lo que no cabe se apila encima)
const NIVEL = { late: 0, today: 1, soon: 2, ok: 3, none: 4 };

// ---------- qué cubo va en qué sitio (función pura: se prueba sin pantalla) ----------
// pedidos → [{ id, numero, cliente, producto, estado, color, parada (0-4), hueco, piso, nivel, vence }]
export function fichas(pedidos, cfgPedidos, hoy) {
  const out = [];
  (pedidos || []).forEach(o => {
    if (!o || o.eliminado) return;
    const t = CL.orderTiming(o, cfgPedidos, hoy) || {}; if (!t.abierto) return;
    let f = CL.phaseOf(cfgPedidos, o.estado); if (f === 'reserva') f = 'confirmado';
    const p = PARADAS.findIndex(x => x.k === f); if (p < 0) return;
    const st = CL.stateOf(cfgPedidos, o.estado), c = /^#[0-9a-f]{6}$/i.test(st.c || '') ? st.c : '#64748b';
    out.push({ id: o.id, numero: o.numero || '', cliente: o.cliente || '', producto: o.producto || '', estado: o.estado || '', color: c, parada: p, nivel: t.incidencia ? 'late' : (t.nivel || 'none'), vence: t.texto || '', fecha: t.limite || '9999' });
  });
  PARADAS.forEach((_, p) => { out.filter(x => x.parada === p).sort((a, b) => (NIVEL[a.nivel] ?? 4) - (NIVEL[b.nivel] ?? 4) || a.fecha.localeCompare(b.fecha) || String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true }))
    .forEach((x, i) => { x.hueco = i % (COLS * FILAS); x.piso = Math.floor(i / (COLS * FILAS)); }); });
  return out;
}
// Dónde está el hueco «hueco» de la parada «p» (en metros del taller)
export const sitio = (p, hueco, piso) => ({ x: PARADAS[p].x - (COLS - 1) * HUECO / 2 + (hueco % COLS) * HUECO, y: -1.5 - Math.floor(hueco / COLS) * HUECO, z: (piso || 0) * 0.82 });
// Las impresoras que se dibujan: las Bambu en directo o, si no hay, los trabajos «Imprimiendo» del programa
export function maquinas() {
  const L = (BAMBU.list || []).map(b => ({ nombre: b.nombre || b.modelo || 'Impresora', activa: !!b.conectada && ['imprimiendo', 'preparando'].includes(b.estado), pausa: !!b.conectada && b.estado === 'pausada', mal: !!b.conectada && ['error', 'sin_filamento'].includes(b.estado), hecha: !!b.conectada && b.estado === 'finalizada', pct: Math.max(0, Math.min(100, Number(b.pct) || 0)), capa: b.capa || 0, capas: b.capas || 0, directo: true }));
  if (L.length) return L.slice(0, 3);
  const imp = (S.t.impresoras || []).filter(i => !i.eliminado && i.activa !== false), tr = (S.t.trabajos || []).filter(j => j.estado === 'Imprimiendo');
  const M = imp.slice(0, 3).map(i => { const j = tr.find(t => t.impresoraId === i.id); return { nombre: i.nombre || 'Impresora', activa: !!j, pct: j ? 50 : 0, directo: false }; });
  return M.length ? M : [{ nombre: 'Impresora', activa: tr.length > 0, pct: tr.length ? 50 : 0, directo: false }];
}

// ---------- dibujo: proyección «de gabinete» (x a la derecha, y al fondo, z arriba) ----------
const sombra = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, f = v => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k))); return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')'; };
function pintor(g, W, H) {
  const ANCHO = 38, s = Math.min(W / ANCHO, H / 12.6), ox = (W - ANCHO * s) / 2 + 3.2 * s, oy = H - 3.3 * s;
  const P = (x, y, z) => [ox + (x + y * 0.42) * s, oy - (y * 0.46 + (z || 0)) * s];
  const cara = (pts, col, a) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); if (a !== undefined) g.globalAlpha = a; g.fillStyle = col; g.fill(); g.globalAlpha = 1; };
  // caja con sus tres caras a la vista (frente, tapa y lado derecho)
  const caja = (x, y, z, w, d, a, col, o = {}) => {
    cara([P(x, y + d, z + a), P(x + w, y + d, z + a), P(x + w, y, z + a), P(x, y, z + a)], sombra(col, o.tapa || 1.28), o.alfa);
    cara([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + a), P(x + w, y, z + a)], sombra(col, 0.62), o.alfa);
    cara([P(x, y, z), P(x + w, y, z), P(x + w, y, z + a), P(x, y, z + a)], col, o.alfa);
  };
  return { P, s, caja, cara, techo: Math.max(4.6, (oy - 10) / s - 3.04) }; // techo: hasta dónde sube la pared del fondo para llenar el lienzo
}

export function render(el) {
  const cv = h('canvas.tv18-cv', { 'aria-label': 'El taller en directo' }), g = cv.getContext('2d');
  const tip = h('div.tv18-tip.hidden'), cuenta = h('div.tv18-cuenta'), pie = h('div.tv18-pie');
  const marco = h('div.tv18-marco', cv, tip);
  const root = h('div.tv18',
    h('div.page-head', h('div', h('h1', '🏭 Taller vivo'), h('div.muted', 'Tu taller de verdad, en directo. Cada cubo es un pedido: toca uno para abrirlo.')),
      h('div.right.row', btn('⛶ Pantalla completa', () => { try { (document.fullscreenElement ? document.exitFullscreen() : marco.requestFullscreen()); } catch (e) { } }, { cls: 'sm' }), btn('🎥 Grabar 12 s', () => grabar(), { cls: 'sm' }))),
    cuenta, marco, pie);
  el.appendChild(root);

  const T = new Map(); // id → cubo que se mueve
  let M = [], vivo = true, W = 0, H = 0, D = null, sobre = null, camion = { x: 0, sale: 0 }, enviados = 0, t0 = performance.now(), ult = 0, ultM = 0;
  const confeti = []; // v18: al salir un pedido en el camión, una lluvia corta de papelitos
  const BOBINAS = ['#f472b6', '#8f82ff', '#22d3ee', '#fbbf24', '#34d399', '#fb7185', '#e2e8f0', '#60a5fa', '#f97316'];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const tam = () => { const r = marco.getBoundingClientRect(); W = Math.max(900, Math.round(r.width)); H = Math.round(Math.max(400, Math.min(W * 0.46, (document.fullscreenElement ? innerHeight : innerHeight - 235)))); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; D = pintor(g, W, H); };

  function datos(primera) {
    const F = fichas(S.t.pedidos, S.cfg.pedidos, S.hoy), ids = new Set(F.map(f => f.id));
    M = maquinas();
    F.forEach((f, i) => {
      const d = sitio(f.parada, f.hueco, f.piso), c = T.get(f.id);
      if (!c) T.set(f.id, Object.assign({ x: primera ? d.x : -5, y: primera ? d.y : 0.25, z: primera ? d.z + 7 + i * 0.25 : 0.4, cae: primera, ruta: primera ? null : ruta({ x: -5, y: 0.25 }, d), p: 0, a: 1 }, f, { d }));
      else { const mueve = c.parada !== f.parada; Object.assign(c, f, { d }); if (mueve) { c.ruta = ruta({ x: c.x, y: c.y }, d); c.p = 0; c.cae = false; } else if (!c.ruta && !c.cae) { c.ruta = [{ x: c.x, y: c.y, z: c.z }, d]; c.p = 0; } }
    });
    T.forEach((c, id) => { if (ids.has(id) || c.fuera) return; const o = (S.t.pedidos || []).find(p => p.id === id), f = o && !o.eliminado ? CL.phaseOf(S.cfg.pedidos, o.estado) : '';
      c.fuera = true; if (f === 'enviado' || f === 'entregado') { c.ruta = ruta({ x: c.x, y: c.y }, { x: 33.2, y: 3.1, z: 0.9 }); c.p = 0; c.alCamion = true; } else c.desaparece = true; });
    const n = PARADAS.map((_, p) => F.filter(f => f.parada === p).length), tarde = F.filter(f => f.nivel === 'late').length, hoy = F.filter(f => f.nivel === 'today').length;
    mount(cuenta, PARADAS.map((p, i) => h('span.tv18-chip' + (n[i] ? '.on' : ''), h('b', String(n[i])), p.d)), tarde ? h('span.tv18-chip.bad', h('b', String(tarde)), 'con retraso') : null, hoy ? h('span.tv18-chip.warn', h('b', String(hoy)), hoy === 1 ? 'vence hoy' : 'vencen hoy') : null);
    mount(pie, F.length ? h('span', '● EN DIRECTO · ' + F.length + (F.length === 1 ? ' pedido abierto' : ' pedidos abiertos') + ' · ' + (M.some(m => m.directo) ? 'impresoras leídas de las Bambu' : 'impresoras según tus trabajos') + ' · se actualiza solo') : h('span', 'No hay pedidos abiertos: el taller está despejado. Cuando entre uno, aparecerá por la izquierda.'));
    window.__taller18 = { fichas: F, cubos: T, maquinas: M, punto: id => { const c = T.get(id); if (!c || !D) return null; const q = D.P(c.x + 0.4, c.y, c.z + 0.4), r = cv.getBoundingClientRect(); return { x: r.left + q[0] * r.width / W, y: r.top + q[1] * r.height / H }; } };
  }
  // del hueco a la cinta, por la cinta, y de la cinta al hueco nuevo
  const ruta = (a, b) => [{ x: a.x, y: a.y, z: 0 }, { x: a.x, y: 0.25, z: 0.4 }, { x: b.x, y: 0.25, z: 0.4 }, { x: b.x, y: b.y, z: b.z || 0 }];
  function mueve(c, dt) {
    if (c.cae) { c.z = Math.max(c.d.z, c.z - dt * 9); if (c.z <= c.d.z) c.cae = false; return; }
    if (c.desaparece) { c.a = Math.max(0, c.a - dt * 1.4); if (!c.a) T.delete(c.id); return; }
    if (!c.ruta) return;
    const R = c.ruta; let largo = 0; const L = []; for (let i = 1; i < R.length; i++) { const l = Math.hypot(R[i].x - R[i - 1].x, R[i].y - R[i - 1].y) + Math.abs((R[i].z || 0) - (R[i - 1].z || 0)); L.push(l); largo += l; }
    c.p = Math.min(1, c.p + dt * 5.2 / Math.max(0.5, largo));
    let q = c.p * largo, i = 0; while (i < L.length - 1 && q > L[i]) { q -= L[i]; i++; }
    const u = L[i] ? Math.min(1, q / L[i]) : 1, e = u * u * (3 - 2 * u);
    c.x = R[i].x + (R[i + 1].x - R[i].x) * e; c.y = R[i].y + (R[i + 1].y - R[i].y) * e; c.z = (R[i].z || 0) + ((R[i + 1].z || 0) - (R[i].z || 0)) * e;
    if (c.p >= 1) { c.ruta = null; if (c.alCamion) { T.delete(c.id); enviados++; camion.sale = performance.now(); for (let i = 0; i < 46; i++) confeti.push({ x: 31.5 + Math.random() * 2.4, y: 3.2, z: 2.6 + Math.random(), vx: (Math.random() - .5) * 5, vz: 2.5 + Math.random() * 4.5, c: BOBINAS[i % BOBINAS.length], t: 0, g: Math.random() * 6 }); } }
  }

  function dibuja(now) {
    if (!vivo || !cv.isConnected) { vivo = false; return; }
    requestAnimationFrame(dibuja);
    if (document.hidden || now - ult < 30) return; const dt = Math.min(0.08, (now - ult) / 1000); ult = now;
    const { P, s, caja, cara } = D, t = (now - t0) / 1000;
    if (now - ultM > 1000) { ultM = now; M = maquinas(); if (window.__taller18) window.__taller18.maquinas = M; } // las impresoras se vuelven a leer cada segundo: el % sube solo
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fondo = g.createLinearGradient(0, 0, 0, H); fondo.addColorStop(0, '#070a14'); fondo.addColorStop(1, '#0e1326'); g.fillStyle = fondo; g.fillRect(0, 0, W, H);
    // suelo y su cuadrícula
    cara([P(-4, -5.4), P(36, -5.4), P(36, 6.6), P(-4, 6.6)], '#0b0f1e');
    g.strokeStyle = 'rgba(120,135,190,.10)'; g.lineWidth = 1; g.beginPath();
    for (let x = -4; x <= 36; x += 2) { const a = P(x, -5.4), b = P(x, 6.6); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    for (let y = -5.4; y <= 6.6; y += 2) { const a = P(-4, y), b = P(36, y); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    g.stroke();
    // ---- la pared del fondo: rótulo de neón, estantería de bobinas, reloj (con la hora de verdad) y lámparas ----
    { const zT = D.techo, yW = 6.6, pared = g.createLinearGradient(0, P(0, yW, zT)[1], 0, P(0, yW, 0)[1]); pared.addColorStop(0, '#0a0e1d'); pared.addColorStop(1, '#131a36');
      cara([P(-4, yW, 0), P(36, yW, 0), P(36, yW, zT), P(-4, yW, zT)], pared);
      g.strokeStyle = 'rgba(120,135,190,.09)'; g.lineWidth = 1; g.beginPath(); for (let x = -4; x <= 36; x += 4) { const a = P(x, yW, 0), b = P(x, yW, zT); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      cara([P(-4, yW, 0), P(36, yW, 0), P(36, yW, 0.35), P(-4, yW, 0.35)], '#1d2648');
      // el rótulo
      const nombre = String((S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'CelebriDiseños').toUpperCase().slice(0, 22), q = P(17, yW, zT - 1.25), tn = Math.max(13, Math.min(1.05, zT * 0.2) * s), late = 0.86 + 0.14 * Math.sin(t * 2.3);
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 ' + tn + 'px Bahnschrift, "Segoe UI", sans-serif'; try { g.letterSpacing = (tn * 0.16) + 'px'; } catch (e) { }
      g.shadowColor = '#8f82ff'; g.shadowBlur = tn * 0.9 * late; g.globalAlpha = late; const gr = g.createLinearGradient(q[0] - tn * 5, 0, q[0] + tn * 5, 0); gr.addColorStop(0, '#a99dff'); gr.addColorStop(0.55, '#f9a8d4'); gr.addColorStop(1, '#67e8f9'); g.fillStyle = gr; g.fillText(nombre, q[0], q[1]);
      g.shadowBlur = 0; g.globalAlpha = 0.75; g.font = '600 ' + tn * 0.34 + 'px Bahnschrift, "Segoe UI", sans-serif'; try { g.letterSpacing = (tn * 0.2) + 'px'; } catch (e) { } g.fillStyle = '#9aa4c7'; g.fillText('TALLER EN DIRECTO', q[0], q[1] + tn * 0.95); g.restore();
      // la estantería de bobinas (decorado)
      if (zT > 7) [0, 1].forEach(f => { const zb = 4.7 + f * 1.25; /* por encima de los rótulos de las impresoras */ if (zb + 1 > zT - 0.3) return; caja(1.2, yW - 0.5, zb, 7.2, 0.5, 0.1, '#2a3358'); for (let i = 0; i < 7; i++) { const c0 = P(1.75 + i * 1, yW - 0.25, zb + 0.56), col = BOBINAS[(i + f * 4) % BOBINAS.length]; g.fillStyle = col; g.beginPath(); g.arc(c0[0], c0[1], 0.44 * s, 0, 7); g.fill(); g.fillStyle = '#0b0f1e'; g.beginPath(); g.arc(c0[0], c0[1], 0.15 * s, 0, 7); g.fill(); } });
      // el reloj de pared, en hora
      if (zT > 5.4) { const c0 = P(27.6, yW, Math.min(zT - 1.3, 4.4)), r = 0.72 * s, d = new Date(), hm = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * 6.2832, mm = (d.getMinutes() + d.getSeconds() / 60) / 60 * 6.2832;
        g.fillStyle = '#0c1126'; g.strokeStyle = '#55609c'; g.lineWidth = Math.max(1.5, 0.07 * s); g.beginPath(); g.arc(c0[0], c0[1], r, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = '#eef1fb'; g.lineCap = 'round'; g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c0[0] + Math.sin(hm) * r * 0.5, c0[1] - Math.cos(hm) * r * 0.5); g.stroke();
        g.strokeStyle = '#22d3ee'; g.lineWidth = Math.max(1, 0.045 * s); g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c0[0] + Math.sin(mm) * r * 0.78, c0[1] - Math.cos(mm) * r * 0.78); g.stroke(); g.lineCap = 'butt'; }
      // las lámparas: un cono de luz sobre cada zona de trabajo
      [9.5, 17, 23.5].forEach((x, i) => { const a = P(x, 3.6, zT - 0.2), b = P(x, 3.6, 0); const cono = g.createLinearGradient(0, a[1], 0, b[1]); cono.addColorStop(0, 'rgba(190,200,255,' + (0.13 + 0.02 * Math.sin(t * 1.7 + i)) + ')'); cono.addColorStop(1, 'rgba(190,200,255,0)');
        g.fillStyle = cono; g.beginPath(); g.moveTo(a[0] - 0.25 * s, a[1]); g.lineTo(a[0] + 0.25 * s, a[1]); g.lineTo(b[0] + 2.7 * s, b[1]); g.lineTo(b[0] - 2.7 * s, b[1]); g.closePath(); g.fill();
        g.fillStyle = '#3b4680'; g.fillRect(a[0] - 0.4 * s, a[1] - 0.16 * s, 0.8 * s, 0.16 * s); }); }
    // ---- al fondo: las máquinas de cada parada ----
    const rot = (txt, x, y, z, col, tam) => { const q = P(x, y, z); g.font = '700 ' + Math.max(9, tam * s) + 'px Bahnschrift, "Segoe UI", sans-serif'; g.textAlign = 'center'; g.fillStyle = col; g.fillText(txt, q[0], q[1]); };
    // 0 · entrada: un arco con pantalla
    caja(0.4, 3, 0, 0.4, 0.5, 3, '#2a3358'); caja(3.2, 3, 0, 0.4, 0.5, 3, '#2a3358'); caja(0.4, 3, 3, 3.2, 0.5, 0.5, '#3b4680');
    caja(0.9, 3.1, 1.2, 2.2, 0.1, 1.5, '#101a3a'); rot('📥', 2.15, 3.1, 1.7, '#fff', 0.7);
    // 1 · impresoras
    M.forEach((m, i) => { const x = 9.5 - (M.length * 2.6) / 2 + i * 2.6 + 0.2, col = m.mal ? '#7f1d2e' : '#232b4d';
      caja(x, 2.6, 0, 2.2, 2, 0.35, col); caja(x, 4.5, 0.35, 0.14, 0.1, 2.5, '#3b4680'); caja(x + 2.06, 4.5, 0.35, 0.14, 0.1, 2.5, '#3b4680'); // base y postes del fondo
      caja(x + 0.25, 2.85, 0.35, 1.7, 1.5, 0.08, '#4a5591'); // cama
      const alto = (m.activa || m.pausa || m.hecha) ? Math.max(0.08, (m.hecha ? 100 : m.pct) / 100 * 1.6) : 0;
      if (alto) caja(x + 0.75, 3.25, 0.43, 0.7, 0.7, alto, m.hecha ? '#34d399' : '#f59e0b');
      const hx = m.activa ? x + 0.35 + (Math.sin(t * 3.1 + i) * 0.5 + 0.5) * 1.3 : x + 0.3, hz = 0.5 + alto;
      caja(x, 3.5, hz + 0.25, 2.2, 0.14, 0.12, '#55609c'); caja(hx, 3.35, hz, 0.34, 0.3, 0.3, m.activa ? '#22d3ee' : '#7780a0'); // puente y cabezal
      if (m.activa) { const q = P(hx + 0.17, 3.5, hz); g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 9 + i); g.fillStyle = '#22d3ee'; g.beginPath(); g.arc(q[0], q[1], 0.32 * s, 0, 7); g.fill(); g.globalAlpha = 1; }
      caja(x, 4.5, 2.85, 2.2, 0.1, 0.14, '#3b4680');
      rot(m.activa ? (m.directo ? m.pct + ' %' : 'imprimiendo') : m.pausa ? 'en pausa' : m.mal ? '¡revisar!' : m.hecha ? 'terminada ✓' : 'libre', x + 1.1, 4.6, 3.35, m.activa ? '#67e8f9' : m.mal ? '#fb7185' : m.hecha ? '#34d399' : '#7780a0', 0.42);
      rot(m.nombre.slice(0, 14), x + 1.1, 4.6, 3.85, '#b4bcd6', 0.34); });
    // 2 · mesa de repaso con su flexo
    caja(15.2, 2.8, 0, 0.18, 0.18, 1, '#3a2f25'); caja(18.6, 2.8, 0, 0.18, 0.18, 1, '#3a2f25'); caja(15.1, 2.7, 1, 3.8, 1.8, 0.16, '#8b6a45');
    caja(18.2, 4, 1.16, 0.12, 0.12, 1.3, '#55609c'); caja(17.5, 3.9, 2.4, 0.9, 0.3, 0.12, '#55609c'); { const q = P(17.9, 3.6, 1.3); const l = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], 1.9 * s); l.addColorStop(0, 'rgba(253,230,138,.34)'); l.addColorStop(1, 'rgba(253,230,138,0)'); g.fillStyle = l; g.fillRect(q[0] - 2 * s, q[1] - 2 * s, 4 * s, 4 * s); }
    caja(15.6, 3.2, 1.16, 0.5, 0.4, 0.22, '#f472b6'); caja(16.4, 3.3, 1.16, 0.3, 0.3, 0.5, '#8f82ff');
    // 3 · empaquetado: mesa con cajas de cartón
    caja(21.7, 2.8, 0, 3.6, 1.7, 0.9, '#2a3358'); caja(22, 3.1, 0.9, 1, 0.9, 0.8, '#c9995e'); caja(23.2, 3.2, 0.9, 0.8, 0.8, 0.55, '#b98548'); caja(22.2, 3.3, 1.7, 0.7, 0.6, 0.5, '#d9ad72'); caja(24.3, 3.1, 0.9, 0.5, 0.5, 0.2, '#f1f5f9');
    // 4 · muelle: el camión (sale cuando se envía un pedido y vuelve)
    const ds = camion.sale ? (now - camion.sale) / 1000 : 9; camion.x = ds < 1 ? 0 : ds < 3 ? (ds - 1) * (ds - 1) * 4 : ds < 5.5 ? 16 * (1 - (ds - 3) / 2.5) * (1 - (ds - 3) / 2.5) : 0;
    { const x = 30.2 + camion.x; caja(x, 2.6, 0.5, 3.3, 1.9, 2, '#e2e8f0'); caja(x + 3.3, 2.7, 0.5, 1.1, 1.7, 1.3, '#8f82ff'); caja(x + 3.5, 2.7, 1.25, 0.9, 1.7, 0.5, '#bae6fd');
      [x + 0.7, x + 2.5, x + 3.8].forEach(wx => { const q = P(wx, 2.6, 0.45); g.fillStyle = '#05070d'; g.beginPath(); g.arc(q[0], q[1], 0.45 * s, 0, 7); g.fill(); g.fillStyle = '#475569'; g.beginPath(); g.arc(q[0], q[1], 0.18 * s, 0, 7); g.fill(); });
      rot('CELEBRI', x + 1.65, 2.6, 1.35, '#8f82ff', 0.46); if (enviados) rot('enviados hoy aquí: ' + enviados, 32, 4.6, 3.1, '#34d399', 0.36); }
    // ---- la cinta ----
    caja(-3.6, 0, 0, 38.4, 1.3, 0.34, '#1b2240', { tapa: 1.5 });
    g.save(); g.beginPath(); [P(-3.6, 0, 0.34), P(34.8, 0, 0.34), P(34.8, 1.3, 0.34), P(-3.6, 1.3, 0.34)].forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.clip();
    g.strokeStyle = 'rgba(143,130,255,.5)'; g.lineWidth = Math.max(1, s * 0.07); g.beginPath(); const des = (t * 1.6) % 1.4;
    for (let x = -4 + des; x < 35; x += 1.4) { const a = P(x, 0.2, 0.34), b = P(x + 0.35, 0.65, 0.34), c = P(x, 1.1, 0.34); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); }
    g.stroke(); g.restore();
    // ---- delante: las alfombras de cada parada con su rótulo ----
    PARADAS.forEach((p, i) => { const n = [...T.values()].filter(c => c.parada === i && !c.fuera).length, x0 = p.x - 2.5;
      cara([P(x0, -5, 0.01), P(x0 + 5, -5, 0.01), P(x0 + 5, -0.6, 0.01), P(x0, -0.6, 0.01)], n ? 'rgba(143,130,255,.10)' : 'rgba(120,135,190,.05)');
      g.strokeStyle = n ? 'rgba(143,130,255,.55)' : 'rgba(120,135,190,.22)'; g.lineWidth = 1.2; g.beginPath(); [P(x0, -5), P(x0 + 5, -5), P(x0 + 5, -0.6), P(x0, -0.6)].forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.stroke();
      const q = P(p.x - 1.05, -5.25, 0); g.textAlign = 'center'; g.font = '700 ' + Math.max(10, 0.46 * s) + 'px Bahnschrift, "Segoe UI", sans-serif'; g.fillStyle = n ? '#eef1fb' : '#7780a0'; g.fillText(p.t + (n ? '  ' + n : ''), q[0], q[1] + 0.62 * s); });
    // ---- los cubos (del fondo hacia delante) ----
    const cubos = [...T.values()]; cubos.forEach(c => mueve(c, dt));
    cubos.sort((a, b) => b.y - a.y || a.z - b.z || a.x - b.x).forEach(c => {
      const late = c.nivel === 'late', hoy = c.nivel === 'today', lat = 0.5 + 0.5 * Math.sin(t * 5 + c.x);
      if ((late || hoy) && !c.ruta) { const q = P(c.x + 0.4, c.y + 0.4, c.z); g.globalAlpha = 0.25 + 0.3 * lat; g.fillStyle = late ? '#fb7185' : '#fbbf24'; g.beginPath(); g.ellipse(q[0], q[1], 0.85 * s, 0.4 * s, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
      caja(c.x, c.y, c.z, 0.8, 0.8, 0.8, c.color, { alfa: c.a });
      if (late || hoy) { const q = P(c.x + 0.4, c.y, c.z + 1.15); g.fillStyle = late ? '#fb7185' : '#fbbf24'; g.font = '700 ' + 0.5 * s + 'px sans-serif'; g.textAlign = 'center'; g.fillText(late ? '!' : '•', q[0], q[1]); }
      if (c === sobre) { const a = P(c.x - 0.08, c.y, c.z - 0.06), b = P(c.x + 0.88, c.y, c.z + 0.88); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(a[0], b[1], b[0] - a[0], a[1] - b[1]); }
    });
    // ---- confeti: un pedido acaba de salir en el camión ----
    for (let i = confeti.length - 1; i >= 0; i--) { const f = confeti[i]; f.t += dt; f.vz -= 9 * dt; f.x += f.vx * dt; f.z += f.vz * dt; if (f.t > 2.2 || f.z < 0) { confeti.splice(i, 1); continue; } const q = P(f.x, f.y, f.z); g.save(); g.translate(q[0], q[1]); g.rotate(f.g + f.t * 7); g.globalAlpha = Math.min(1, (2.2 - f.t) * 1.4); g.fillStyle = f.c; g.fillRect(-0.11 * s, -0.05 * s, 0.22 * s, 0.1 * s); g.restore(); }
  }

  // ---------- ratón: señalar y abrir ----------
  const bajo = e => { if (!D) return null; const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * H / r.height; let m = null;
    [...T.values()].sort((a, b) => a.y - b.y || b.z - a.z).some(c => { const a = D.P(c.x, c.y, c.z), b = D.P(c.x + 0.8, c.y, c.z + 0.8), tapa = D.P(c.x + 0.8, c.y + 0.8, c.z + 0.8); if (mx >= a[0] - 2 && mx <= tapa[0] + 2 && my <= a[1] + 2 && my >= tapa[1] - 2) { m = c; return true; } return false; }); return m; };
  cv.addEventListener('pointermove', e => { sobre = bajo(e); cv.style.cursor = sobre ? 'pointer' : 'default';
    if (!sobre) return tip.classList.add('hidden');
    mount(tip, h('b', (sobre.numero ? 'nº ' + sobre.numero + ' · ' : '') + (sobre.cliente || 'Sin nombre')), h('div', sobre.producto), h('div.tiny', h('i', { style: 'background:' + sobre.color }), sobre.estado, sobre.vence ? ' · ' + sobre.vence : ''));
    const r = marco.getBoundingClientRect(); tip.classList.remove('hidden'); tip.style.left = Math.min(r.width - 250, Math.max(8, e.clientX - r.left + 14)) + 'px'; tip.style.top = Math.max(8, e.clientY - r.top - 84) + 'px'; });
  cv.addEventListener('pointerleave', () => { sobre = null; tip.classList.add('hidden'); });
  cv.addEventListener('click', e => { const c = bajo(e); if (c && can('pedidos.ver')) go('pedidos/' + encodeURIComponent(c.id)); });

  async function grabar() {
    try { const { grabarLienzo } = await import('../simulacion.js'); toast('🎥 Grabando 12 segundos del taller…', 'ok', 12000);
      const r = await grabarLienzo(cv, 12, () => { }), u = URL.createObjectURL(r.blob), a = h('a', { href: u, download: 'taller_vivo.' + r.ext }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000);
      window.__taller18Video = { tam: r.blob.size, ext: r.ext }; toast('Vídeo guardado en Descargas: taller_vivo.' + r.ext, 'ok', 6000);
    } catch (e) { toast(String(e.message || e), 'bad', 7000); }
  }
  const alCambiar = () => { tam(); };
  addEventListener('resize', alCambiar); document.addEventListener('fullscreenchange', alCambiar);
  tam(); datos(true); requestAnimationFrame(dibuja);
  return { update: () => datos(false), destroy: () => { vivo = false; removeEventListener('resize', alCambiar); document.removeEventListener('fullscreenchange', alCambiar); delete window.__taller18; } };
}
