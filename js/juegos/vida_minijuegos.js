// ================= v13.6 · VIDA: minijuegos de los trabajos y los estudios =================
// jugar(caja, tipo) → Promise<puntos 0-100>. Cinco juegos cortos (20–40 s) que sirven para muchos trabajos:
// cálculo (dar el cambio), memoria (secuencia de colores), reflejos (pulsar objetivos), orden (pasos de una tarea) y
// patrón (siguiente número). El servidor comprueba el tiempo del turno y acota lo que se cobra.
import { h, btn } from '../ui.js';

const azar = n => Math.floor(Math.random() * n);
const baraja = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = azar(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const PASOS = [
  ['Lavar las manos', 'Preparar los ingredientes', 'Cocinar', 'Emplatar'],
  ['Tomar nota del pedido', 'Preparar el café', 'Servir en la mesa', 'Cobrar'],
  ['Diseñar la pieza', 'Laminar el archivo', 'Imprimir', 'Quitar los soportes'],
  ['Saludar al paciente', 'Preguntar qué le pasa', 'Explorar', 'Dar el tratamiento'],
  ['Leer el enunciado', 'Pensar un plan', 'Resolver', 'Revisar el resultado'],
  ['Recoger el paquete', 'Planear la ruta', 'Entregar', 'Pedir la firma']
];

export function jugar(caja, tipo) {
  return new Promise(resolve => {
    const fin = p => { caja.replaceChildren(h('div.vd-mj-fin', h('b', p + ' / 100'), h('div.small.muted', 'Enviando resultado…'))); resolve(Math.max(0, Math.min(100, Math.round(p)))); };
    ({ calculo, memoria, reflejos, orden, patron }[tipo] || calculo)(caja, fin);
  });
}

function calculo(caja, fin) {
  let i = 0, ok = 0; const N = 6, t0 = Date.now();
  const sig = () => {
    if (i >= N) return fin(ok / N * 100 * (Date.now() - t0 < 60000 ? 1 : 0.85));
    const total = (azar(1800) + 120) / 100, paga = [5, 10, 20, 50].find(b => b > total) || 50, cambio = Math.round((paga - total) * 100) / 100;
    const ops = baraja([cambio, Math.round((cambio + 1) * 100) / 100, Math.max(0.05, Math.round((cambio - 0.5) * 100) / 100), Math.round((cambio + 0.1) * 100) / 100]);
    const f = v => v.toFixed(2).replace('.', ',') + ' €';
    caja.replaceChildren(h('div.vd-mj-t', '🧾 Cliente ' + (i + 1) + ' de ' + N), h('p', 'La compra son ', h('b', f(total)), ' y te paga con ', h('b', f(paga)), '. ¿Cuánto cambio le das?'),
      h('div.vd-mj-ops', ops.map(v => btn(f(v), () => { if (Math.abs(v - cambio) < 0.001) ok++; i++; sig(); }, { cls: 'vd-mj-op' }))));
  };
  sig();
}

function memoria(caja, fin) {
  const COL = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'], pads = COL.map((c, k) => h('button.vd-pad', { type: 'button', 'data-k': k, style: { background: c }, 'aria-label': 'Color ' + (k + 1) }));
  const info = h('div.vd-mj-t'), sec = []; let paso = 0, bloqueado = true, mejor = 0;
  caja.replaceChildren(info, h('div.vd-pads', pads));
  const brilla = (k, ms) => new Promise(r => { pads[k].classList.add('on'); setTimeout(() => { pads[k].classList.remove('on'); setTimeout(r, 120); }, ms); });
  const ronda = async () => {
    sec.push(azar(4)); paso = 0; bloqueado = true; info.textContent = '👀 Mira la secuencia (' + sec.length + ')';
    await new Promise(r => setTimeout(r, 500));
    for (const k of sec) await brilla(k, 380);
    bloqueado = false; info.textContent = '👆 Repítela';
  };
  pads.forEach((p, k) => p.onclick = async () => {
    if (bloqueado) return;
    await brilla(k, 150);
    if (k !== sec[paso]) { bloqueado = true; return fin(Math.min(100, Math.max(0, (mejor - 2) / 5 * 100))); }
    paso++;
    if (paso === sec.length) { mejor = sec.length; if (mejor >= 8) return fin(100); setTimeout(ronda, 400); }
  });
  sec.push(azar(4)); sec.push(azar(4)); ronda();
}

function reflejos(caja, fin) {
  const zona = h('div.vd-zona'), info = h('div.vd-mj-t'); let hits = 0, fallos = 0, vivo = true;
  caja.replaceChildren(info, zona);
  const DUR = 20000, t0 = Date.now();
  const pon = () => {
    if (!vivo) return;
    const o = h('button.vd-obj', { type: 'button', style: { left: (5 + azar(80)) + '%', top: (5 + azar(75)) + '%' }, 'aria-label': 'Objetivo' }, ['⭐', '📦', '🧵', '🎯'][azar(4)]);
    o.onclick = ev => { ev.stopPropagation(); hits++; o.remove(); };
    zona.appendChild(o); setTimeout(() => o.remove(), 1100);
  };
  zona.onclick = () => { fallos++; };
  const iv = setInterval(() => { if (Date.now() - t0 >= DUR) { vivo = false; clearInterval(iv); return fin(Math.min(100, hits * 6 - fallos * 3)); } info.textContent = '🎯 ¡Pulsa los objetivos! ' + Math.ceil((DUR - (Date.now() - t0)) / 1000) + ' s · aciertos ' + hits; if (Math.random() < 0.55) pon(); }, 450);
}

function orden(caja, fin) {
  const rondas = baraja(PASOS).slice(0, 3); let r = 0, pts = 0;
  const sig = () => {
    if (r >= rondas.length) return fin(pts / rondas.length);
    const pasos = rondas[r], el = []; let ok = true;
    const lista = h('div.vd-orden'), elegidos = h('ol.vd-elegidos');
    baraja(pasos).forEach(p => lista.appendChild(btn(p, ev => { ev.target.closest('button').disabled = true; el.push(p); if (pasos[el.length - 1] !== p) ok = false; elegidos.appendChild(h('li', p)); if (el.length === pasos.length) { pts += ok ? 100 : 0; r++; setTimeout(sig, 500); } }, { cls: 'vd-mj-op' })));
    caja.replaceChildren(h('div.vd-mj-t', '📋 Tarea ' + (r + 1) + ' de 3: pon los pasos en orden'), lista, elegidos);
  };
  sig();
}

function patron(caja, fin) {
  const gen = [() => { const a = azar(5) + 1, d = azar(5) + 2; return [a, a + d, a + 2 * d, a + 3 * d, a + 4 * d]; }, () => { const a = azar(3) + 1; return [a, a * 2, a * 4, a * 8, a * 16]; }, () => { const a = azar(4) + 1, b = azar(4) + 1; const s = [a, b]; while (s.length < 5) s.push(s[s.length - 1] + s[s.length - 2]); return s; }, () => { const a = azar(9) + 1; return [a * a, (a + 1) * (a + 1), (a + 2) * (a + 2), (a + 3) * (a + 3), (a + 4) * (a + 4)]; }, () => { const a = 50 + azar(50), d = azar(4) + 3; return [a, a - d, a - 2 * d, a - 3 * d, a - 4 * d]; }];
  let i = 0, ok = 0; const N = 5;
  const sig = () => {
    if (i >= N) return fin(ok / N * 100);
    const s = gen[i % gen.length](), sol = s[4], ops = baraja([sol, sol + 1, sol - 2, sol + 3]);
    caja.replaceChildren(h('div.vd-mj-t', '🔢 Serie ' + (i + 1) + ' de ' + N), h('p.vd-serie', s.slice(0, 4).join(', ') + ', ?'), h('div.vd-mj-ops', ops.map(v => btn(String(v), () => { if (v === sol) ok++; i++; sig(); }, { cls: 'vd-mj-op' }))));
  };
  sig();
}
