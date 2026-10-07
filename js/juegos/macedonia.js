// ================= v16.2 · 🍉 MACEDONIA — suelta, junta y haz la sandía =================
// Sueltas frutas en el frasco. Dos iguales que se tocan se funden en la siguiente, más grande. Si el frasco se desborda,
// se acaba. Fácil de entender, difícil de dejar. Con física de verdad (ruedan, se empujan, se apilan), rachas que
// multiplican los puntos, un «meneo» por partida y la clasificación del equipo (la mejor marca de cada uno).
import { h, btn } from '../ui.js';
import { pon, llamar, fiesta } from './kit.js';

export const meta = { id: 'macedonia', titulo: 'Macedonia', emoji: '🍉', desc: 'Junta frutas iguales hasta hacer la sandía.' };
export const FRUTAS = [['🫐', 13], ['🍒', 18], ['🍓', 24], ['🍋', 30], ['🍊', 37], ['🍎', 45], ['🍐', 54], ['🍑', 64], ['🍍', 75], ['🍉', 88]];
const AN = 360, AL = 540, LINEA = 96, G = 1700, FE = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
export const puntosDe = n => (n + 1) * (n + 2); // lo que da crear la fruta de nivel n

// El motor (sin pantalla: se puede probar solo). soltar(x) deja caer la fruta que toca; paso(dt) avanza la física.
export function motor(azar = Math.random) {
  const st = { b: [], puntos: 0, racha: 0, tRacha: 0, t: 0, fin: false, tFuera: 0, max: 0, meneos: 1, id: 0, eventos: [] };
  const nueva = () => { const r = azar(); return r < 0.34 ? 0 : r < 0.62 ? 1 : r < 0.82 ? 2 : r < 0.94 ? 3 : 4; };
  st.toca = nueva(); st.luego = nueva();
  function soltar(x) { if (st.fin || st.t - (st.tUlt || -9) < 0.45) return false; const l = st.toca, r = FRUTAS[l][1]; st.b.push({ id: ++st.id, x: Math.max(r + 2, Math.min(AN - r - 2, x)), y: LINEA - r - 8, vx: 0, vy: 0, l, r, a: 0, t0: st.t }); st.toca = st.luego; st.luego = nueva(); st.tUlt = st.t; return true; }
  function menear() { if (st.fin || st.meneos < 1) return false; st.meneos--; st.b.forEach(o => { o.vx += (azar() - 0.5) * 900; o.vy -= 350 + azar() * 350; }); return true; }
  function sub(dt) {
    const B = st.b;
    for (const o of B) { o.vy += G * dt; o.vx *= 0.995; o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.vx / o.r * dt; }
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < B.length; i++) { const a = B[i]; if (a.fuera) continue;
        if (a.x < a.r) { a.x = a.r; a.vx = Math.abs(a.vx) * 0.25; } else if (a.x > AN - a.r) { a.x = AN - a.r; a.vx = -Math.abs(a.vx) * 0.25; }
        if (a.y > AL - a.r) { a.y = AL - a.r; if (a.vy > 0) a.vy = -a.vy * 0.18; a.vx *= 0.92; }
        for (let j = i + 1; j < B.length; j++) { const b = B[j]; if (b.fuera) continue; const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r, d2 = dx * dx + dy * dy; if (d2 >= min * min) continue;
          if (a.l === b.l) { // ¡se funden!
            a.fuera = b.fuera = true; const l = a.l + 1, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2; st.racha = st.t - st.tRacha < 1.3 ? st.racha + 1 : 1; st.tRacha = st.t;
            const pts = puntosDe(Math.min(l, 10)) * st.racha; st.puntos += pts; st.eventos.push({ x, y, l, pts, racha: st.racha });
            if (l < FRUTAS.length) { B.push({ id: ++st.id, x, y, vx: (a.vx + b.vx) / 2, vy: Math.min(0, (a.vy + b.vy) / 2) - 120, l, r: FRUTAS[l][1], a: 0, t0: st.t - 9 }); st.max = Math.max(st.max, l); }
            break; }
          const d = Math.sqrt(d2) || 0.01, nx = dx / d, ny = dy / d, ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb, pen = min - d;
          a.x -= nx * pen * mb / tot; a.y -= ny * pen * mb / tot; b.x += nx * pen * ma / tot; b.y += ny * pen * ma / tot;
          const vr = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vr < 0) { const jx = -(1.12) * vr / (1 / ma + 1 / mb); a.vx -= jx * nx / ma; a.vy -= jx * ny / ma; b.vx += jx * nx / mb; b.vy += jx * ny / mb; } } }
    }
    if (B.some(o => o.fuera)) st.b = B.filter(o => !o.fuera);
  }
  function paso(dt) { if (st.fin) return; const n = Math.max(1, Math.round(dt / (1 / 180))); for (let i = 0; i < n; i++) sub(dt / n); st.t += dt;
    const alto = st.b.some(o => st.t - o.t0 > 1.4 && o.y - o.r < LINEA && Math.abs(o.vy) < 60); st.tFuera = alto ? st.tFuera + dt : 0; if (st.tFuera > 1.6) st.fin = true; }
  return { st, soltar, menear, paso };
}

export function render(el) {
  let vivo = true, raf = 0, M = motor(), apunta = AN / 2, tAnt = performance.now(), enviado = false; const flota = [], SP = new Map();
  const mejor = () => { try { return Number(localStorage.getItem('cd.macedonia.mejor')) || 0; } catch (e) { return 0; } };
  const cv = h('canvas.mc-cv', { width: AN * 2, height: AL * 2, tabindex: 0, 'aria-label': 'Frasco: mueve y toca para soltar la fruta' }), X = cv.getContext('2d');
  const lado = h('div.mc-lado'), rank = h('div.mc-rank', h('p.muted.tiny', 'Cargando la clasificación…')), fin = h('div.mc-fin'); fin.hidden = true;
  el.append(h('div.mc', h('div.mc-marco', cv, fin), h('div.mc-der', lado, h('div.jg-card', h('b', '🏆 Clasificación del equipo'), rank), h('p.muted.tiny', 'Mueve el ratón (o el dedo) y toca para soltar. Dos frutas iguales se funden en la siguiente. Que no pasen de la raya.'))));
  const sprite = (e, r) => { const k = e + r; let c = SP.get(k); if (!c) { c = document.createElement('canvas'); c.width = c.height = r * 4 + 8; const g = c.getContext('2d'); g.font = r * 3.5 + 'px ' + FE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, c.width / 2, c.width / 2 + r * 0.22); SP.set(k, c); } return c; };
  function pintaLado() { const st = M.st; pon(lado,
    h('div.mc-pts', h('span', 'Puntos'), h('b.mc-puntos', String(st.puntos)), h('small', 'Tu mejor marca: ' + Math.max(mejor(), st.puntos))),
    h('div.mc-sig', h('span', 'Después'), h('i', FRUTAS[st.luego][0])),
    h('div.mc-orden', FRUTAS.map(([e], i) => h('i' + (i <= st.max ? '.on' : ''), { title: i <= st.max ? 'Conseguida' : 'Aún no' }, e))),
    h('div.row.wrap', { style: { gap: '6px' } }, btn('🫨 Menear el frasco (' + st.meneos + ')', () => { if (M.menear()) pintaLado(); }, { cls: 'sm mc-menear' }), btn('Nueva partida', nueva, { cls: 'sm ghost mc-nueva' }))); }
  function pintaRank(r) { pon(rank, r && r.top.length ? r.top.map((x, i) => h('div.mc-fila' + (x.id === r.yo ? '.yo' : ''), h('span', ['🥇', '🥈', '🥉'][i] || (i + 1) + '.'), h('span.grow', x.nombre), h('b', String(x.puntos)))) : h('p.muted.tiny', 'Nadie ha jugado todavía. ¡Pon la primera marca!')); }
  async function acaba() { if (enviado) return; enviado = true; const p = M.st.puntos, record = p > mejor(); if (record) { try { localStorage.setItem('cd.macedonia.mejor', String(p)); } catch (e) { } fiesta(el); }
    fin.hidden = false; pon(fin, h('div.mc-fin-c', h('div.mc-fin-e', record ? '🏆' : '🍉'), h('h3', record ? '¡Nuevo récord!' : 'Se ha desbordado'), h('p', p + ' puntos · llegaste hasta ' + FRUTAS[M.st.max][0]), btn('Otra partida', nueva, { cls: 'primary mc-otra' })));
    if (p > 0) { try { pintaRank(await llamar('marcas.record', { juego: 'macedonia', puntos: p }, { silencio: true })); } catch (e) { } } }
  function nueva() { M = motor(); enviado = false; fin.hidden = true; pon(fin); flota.length = 0; pintaLado(); cv.focus({ preventScroll: true }); if (window.__mace) window.__mace.M = M; }
  function soltar() { if (M.soltar(apunta)) pintaLado(); }
  function pinta(t) {
    const st = M.st; X.setTransform(2, 0, 0, 2, 0, 0);
    const g = X.createLinearGradient(0, 0, 0, AL); g.addColorStop(0, '#fff7ed'); g.addColorStop(1, '#fde7c8'); X.fillStyle = g; X.fillRect(0, 0, AN, AL);
    X.setLineDash([8, 7]); X.strokeStyle = st.tFuera > 0 ? '#dc2626' : 'rgba(180,83,9,.45)'; X.lineWidth = st.tFuera > 0 ? 3 : 2; X.beginPath(); X.moveTo(0, LINEA); X.lineTo(AN, LINEA); X.stroke(); X.setLineDash([]);
    if (!st.fin) { const [e, r] = FRUTAS[st.toca], x = Math.max(r + 2, Math.min(AN - r - 2, apunta)); X.strokeStyle = 'rgba(0,0,0,.12)'; X.lineWidth = 2; X.beginPath(); X.moveTo(x, LINEA - 8); X.lineTo(x, AL); X.stroke(); X.globalAlpha = st.t - (st.tUlt || -9) < 0.45 ? 0.35 : 1; const c = sprite(e, r); X.drawImage(c, x - c.width / 4, LINEA - r - 8 - c.width / 4, c.width / 2, c.width / 2); X.globalAlpha = 1; }
    for (const o of st.b) { const c = sprite(FRUTAS[o.l][0], o.r); X.save(); X.translate(o.x, o.y); X.rotate(o.a); X.drawImage(c, -c.width / 4, -c.width / 4, c.width / 2, c.width / 2); X.restore(); }
    while (st.eventos.length) { const ev = st.eventos.shift(); flota.push({ x: ev.x, y: ev.y, t0: t, txt: '+' + ev.pts + (ev.racha > 1 ? '  ×' + ev.racha : ''), r: FRUTAS[Math.min(ev.l, 9)][1] }); if (ev.l === 9) fiesta(el); pintaLado(); }
    for (let i = flota.length - 1; i >= 0; i--) { const f = flota[i], u = (t - f.t0) / 800; if (u >= 1) { flota.splice(i, 1); continue; } X.globalAlpha = 1 - u; X.strokeStyle = '#f59e0b'; X.lineWidth = 3; X.beginPath(); X.arc(f.x, f.y, f.r * (0.6 + u * 0.9), 0, 7); X.stroke(); X.font = '800 17px system-ui, sans-serif'; X.textAlign = 'center'; X.lineWidth = 4; X.strokeStyle = '#fff'; X.strokeText(f.txt, f.x, f.y - 10 - u * 30); X.fillStyle = '#b45309'; X.fillText(f.txt, f.x, f.y - 10 - u * 30); X.globalAlpha = 1; }
  }
  function bucle(t) { if (!vivo) return; raf = requestAnimationFrame(bucle); const dt = Math.min(0.033, (t - tAnt) / 1000); tAnt = t; M.paso(dt); pinta(t); if (M.st.fin) acaba(); }
  const aX = ev => { const b = cv.getBoundingClientRect(); apunta = (ev.clientX - b.left) / b.width * AN; };
  cv.addEventListener('pointermove', aX); cv.addEventListener('pointerdown', ev => { aX(ev); soltar(); });
  const tecla = ev => { if (!document.body.contains(cv) || /INPUT|TEXTAREA/.test((ev.target && ev.target.tagName) || '')) return; if (ev.key === 'ArrowLeft') { apunta = Math.max(0, apunta - 14); ev.preventDefault(); } else if (ev.key === 'ArrowRight') { apunta = Math.min(AN, apunta + 14); ev.preventDefault(); } else if (ev.key === ' ' || ev.key === 'ArrowDown') { ev.preventDefault(); soltar(); } };
  window.addEventListener('keydown', tecla);
  window.__mace = { M, apuntar: x => { apunta = x; }, soltar, acaba };
  pintaLado(); raf = requestAnimationFrame(bucle);
  llamar('marcas.ranking', { juego: 'macedonia' }, { silencio: true }).then(r => vivo && pintaRank(r)).catch(() => vivo && pon(rank, h('p.muted.tiny', 'Sin conexión: la clasificación sale cuando vuelva Internet.')));
  return { destroy() { vivo = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', tecla); delete window.__mace; } };
}
