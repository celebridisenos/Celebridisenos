// ================= v30 · ✋ LA CAMA DE LAS PESTAÑAS (Fundas, Catálogo…): tocar, MOVER, DUPLICAR, COPIAR y PEGAR =================
// La dueña (11-10-2026): «en el taller de fundas, bueno, en todo, no me deja hacer clic al objeto y moverlo, y menos copiar o
// duplicar». Esto se engancha a una vista hecha con crearEscena SIN cambiar cómo dibuja: envuelve escena.ponPartes y dibuja la pieza
// una vez por COPIA. Tocar la pieza la elige (contorno naranja); ARRASTRARLA la mueve por la cama (la vista no gira); ⧉ Duplicar
// (Ctrl D), 📋 Copiar (Ctrl C) y 📌 Pegar (Ctrl V), ⟳ Girar 90° (R), 🗑 Quitar copia (Supr), ▦ Colocar (que no se pisen) y clic
// derecho = menú. Las copias salen en el archivo para imprimir: quien prepara el 3MF pasa sus piezas por mesa.expande().
import { h, mount, toast } from '../ui.js';
import { estimacion, tiempoTxt } from './sorpresas.js'; // v30.2: 🧩 llenar la cama (gramos y tiempo ESTIMADOS)

export function mesa(escena, lienzo, o = {}) {
  const T = escena.T, orig = escena.ponPartes, contenedor = o.contenedor || lienzo.parentElement;
  let inst = [{ id: 'm0', dx: 0, dy: 0, rot: 0 }], selI = null, ultL = null, ultH = [], centro = [0, 0], tam = [0, 0], arr = null, copia = null, vivo = true, sig = 1, lleno = null;
  const r1 = x => Math.round(x * 10) / 10;
  const mat = (i, M) => { const m = new T.Matrix4().makeTranslation(centro[0] + i.dx, centro[1] + i.dy, 0).multiply(new T.Matrix4().makeRotationZ(i.rot * Math.PI / 180)).multiply(new T.Matrix4().makeTranslation(-centro[0], -centro[1], 0)); if (M) m.multiply(new T.Matrix4().fromArray(M)); return m; };
  const principal = p => !p.fantasma && !p.resalta;
  function medir(L) { // centro y tamaño (de la caja) de lo que se dibuja: lo que se copia
    const b = new T.Box3(), v = new T.Vector3();
    L.filter(principal).forEach(p => { const X = p.vista.pos, M = p.matriz ? new T.Matrix4().fromArray(p.matriz) : null, paso = 3 * Math.max(1, Math.floor(X.length / 3 / 4000)); for (let k = 0; k < X.length; k += paso) { v.set(X[k], X[k + 1], X[k + 2]); if (M) v.applyMatrix4(M); b.expandByPoint(v); } });
    if (b.isEmpty()) return; const t0 = tam.slice(); centro = [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2]; tam = [b.max.x - b.min.x, b.max.y - b.min.y];
    if (inst.length > 1 && (Math.abs(t0[0] - tam[0]) > 1 || Math.abs(t0[1] - tam[1]) > 1)) coloca(true); // cambió de tamaño: que no se pisen
  }
  escena.ponPartes = (L, H = []) => { ultL = L; ultH = H; medir(L); pinta(); };
  function pinta() {
    if (!ultL || !vivo) return;
    const L2 = [];
    inst.forEach((i, n) => ultL.forEach((p, k) => { if (n > 0 && !principal(p)) return; L2.push(Object.assign({}, p, { id: (p.id || 'p' + k) + '@' + i.id, matriz: mat(i, p.matriz).elements.slice() })); }));
    orig(L2, ultH);
    escena.ponProxies(inst.flatMap(i => ultL.filter(principal).map(p => ({ id: i.id, vista: p.vista, matriz: mat(i, p.matriz) }))));
    const s = inst.find(i => i.id === selI); escena.marcar(s ? ultL.filter(p => principal(p) && !p.matriz).map(p => { const m = mat(s), e = new T.Euler().setFromRotationMatrix(m, 'ZYX'), q = new T.Vector3().setFromMatrixPosition(m); return { id: s.id, vista: p.vista, t: { pos: q.toArray(), rot: [0, 0, e.z * 180 / Math.PI], esc: [1, 1, 1] } }; }) : []);
    if (lleno && lleno.n !== inst.length) lleno = null;
    barra(); window.__mesa = { lleno, copias: inst.length, sel: selI, inst: inst.map(i => ({ dx: r1(i.dx), dy: r1(i.dy), rot: i.rot })) };
  }
  // ---------- la barrita de la cama ----------
  const bar = h('div.mesa-bar', { role: 'toolbar', 'aria-label': 'La pieza en la cama' }); contenedor.appendChild(bar);
  const bt = (ic, t, f, k) => h('button.mesa-b', { type: 'button', title: t, 'data-m': k, onclick: e => { e.stopPropagation(); f(); } }, ic);
  function barra() {
    mount(bar, h('span.mesa-n', inst.length > 1 ? '🧩 ' + inst.length + ' en la cama' : '✋ Toca y arrastra la pieza'),
      bt('⧉', 'Duplicar (Ctrl D)', duplicar, 'duplicar'), bt('📋', 'Copiar (Ctrl C)', copiar, 'copiar'), bt('📌', 'Pegar (Ctrl V)', pegar, 'pegar'), bt('⟳', 'Girar 90° (R)', gira, 'girar'),
      bt('▦', 'Colocar: en fila, sin pisarse', () => coloca(), 'colocar'), inst.length > 1 ? bt('🗑', 'Quitar esta copia (Supr)', quita, 'quitar') : null,
      bt('🧩', '🎁 Llenar la cama: todas las que caben (con los gramos y el tiempo)', menuLlenar, 'llenar'), inst.length > 1 ? bt('①', 'Dejar solo una', () => { inst = [inst[0]]; inst[0].dx = inst[0].dy = 0; selI = null; pinta(); o.alCambiar && o.alCambiar(); }, 'una') : null,
      lleno ? h('span.mesa-lleno', '≈ ' + Math.round(lleno.g) + ' g · ≈ ' + tiempoTxt(lleno.min) + ' · ESTIMADO') : null);
  }
  // ---------- v30.2 · 🎁 LLENAR LA CAMA: todas las que caben (rectas o giradas 90°, lo que meta más), centradas y a 5 mm unas de
  // otras, con los gramos y el tiempo ESTIMADOS de la cama entera (lo exacto te lo da Bambu Studio al laminar) ----------
  const IMPS = [['p1p', 'Bambu P1P', 256], ['a1m', 'Bambu A1 mini', 180]];
  function menuLlenar() { // ¿en qué impresora? (se recuerda)
    document.querySelectorAll('.mesa-menu').forEach(m => m.remove()); const r = bar.getBoundingClientRect();
    const m = h('div.r8e-menu.mesa-menu.mesa-llenar', { style: { left: Math.max(8, r.left) + 'px', top: Math.max(8, r.top - 150) + 'px' } }, h('div.mesa-menu-t', '🧩 Llenar la cama de…'),
      IMPS.map(([k, t, c]) => h('button', { type: 'button', 'data-imp': k, onclick: () => { m.remove(); try { localStorage.setItem('cd.r8.mesa.imp', k); } catch (e) { } llenar(c, t); } }, h('span', '🖨️'), h('b', t + ' · ' + c + ' mm'))));
    document.body.appendChild(m); setTimeout(() => document.addEventListener('pointerdown', function fuera(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', fuera); } }), 0);
  }
  function llenar(camaElegida, nomImp) {
    if (!ultL || !tam[0] || !tam[1]) return;
    if (!camaElegida) { let k = 'p1p'; try { k = localStorage.getItem('cd.r8.mesa.imp') || 'p1p'; } catch (e) { } const I = IMPS.find(x => x[0] === k) || IMPS[0]; camaElegida = I[2]; nomImp = I[1]; }
    const cama = camaElegida || o.cama || 256, sep = 5, util = cama - 8;
    const prueba = rot => { const w = (rot ? tam[1] : tam[0]) + sep, d = (rot ? tam[0] : tam[1]) + sep, nx = Math.max(0, Math.floor((util + sep) / w)), ny = Math.max(0, Math.floor((util + sep) / d)); return { rot, w, d, nx, ny, n: nx * ny }; };
    const a = prueba(0), b = prueba(90), m = b.n > a.n ? b : a;
    if (m.n < 2) return toast(m.n ? '🧩 En tu cama (' + cama + ' mm) solo cabe una de este tamaño.' : '🧩 Esta pieza es más grande que tu cama (' + cama + ' mm).', 'info', 3500);
    inst = [];
    for (let fy = 0; fy < m.ny; fy++) for (let fx = 0; fx < m.nx; fx++) inst.push({ id: 'm' + (sig++), dx: r1((fx - (m.nx - 1) / 2) * m.w - centro[0]), dy: r1(((m.ny - 1) / 2 - fy) * m.d - centro[1]), rot: m.rot });
    let e = { gramos: 0, minutos: 0 }; try { e = estimacion(ultL.filter(p => principal(p) && p.vista && p.vista.idx)); } catch (x) { }
    lleno = { n: inst.length, g: e.gramos * inst.length, min: 2 + e.minutos * inst.length, giradas: !!m.rot, cama, imp: nomImp || '' };
    selI = null; pinta(); o.alCambiar && o.alCambiar();
    toast('🧩 ¡En tu ' + (nomImp || 'cama') + ' caben ' + inst.length + '! (' + m.nx + ' × ' + m.ny + (m.rot ? ', giradas 90°' : '') + ') · ≈ ' + Math.round(lleno.g) + ' g · ≈ ' + tiempoTxt(lleno.min) + ' (ESTIMADO: lo exacto te lo dice Bambu al laminar)', 'ok', 7000);
  }
  const elegida = () => inst.find(i => i.id === selI) || inst[inst.length - 1];
  function libre(i0) { // el primer sitio libre a la derecha (y luego más abajo) dentro de la cama
    const cama = o.cama || 256, w = tam[0] + 6, d = tam[1] + 6;
    for (let fila = 0; fila < 12; fila++) for (let col = 0; col < 12; col++) { const dx = i0.dx + col * w, dy = i0.dy - fila * d; if (Math.abs(centro[0] + dx) + tam[0] / 2 > cama / 2 || Math.abs(centro[1] + dy) + tam[1] / 2 > cama / 2) continue; if (!inst.some(j => Math.abs(j.dx - dx) < w - 0.5 && Math.abs(j.dy - dy) < d - 0.5)) return { dx, dy }; }
    return { dx: i0.dx + w, dy: i0.dy };
  }
  function duplicar() { const b = elegida(), p = libre(b), n = { id: 'm' + (sig++), dx: p.dx, dy: p.dy, rot: b.rot }; inst.push(n); selI = n.id; pinta(); toast('⧉ Duplicada: ahora hay ' + inst.length + ' en la cama (salen todas al imprimir)', 'ok', 2200); o.alCambiar && o.alCambiar(); }
  function copiar() { copia = Object.assign({}, elegida()); toast('📋 Copiada · Ctrl V para pegar', 'ok', 1800); }
  function pegar() { if (!copia) return toast('Copia antes la pieza (Ctrl C).', 'warn'); const p = libre(copia), n = { id: 'm' + (sig++), dx: p.dx, dy: p.dy, rot: copia.rot }; inst.push(n); selI = n.id; pinta(); o.alCambiar && o.alCambiar(); }
  function gira() { const b = elegida(); b.rot = (b.rot + 90) % 360; selI = b.id; pinta(); o.alCambiar && o.alCambiar(); }
  function quita() { if (inst.length < 2) return toast('Es la pieza: se quitan solo sus copias.', 'info'); const b = elegida(); inst = inst.filter(i => i !== b); selI = null; pinta(); o.alCambiar && o.alCambiar(); }
  function coloca(callado) { const w = tam[0] + 6, d = tam[1] + 6, cama = o.cama || 256, porFila = Math.max(1, Math.floor((cama - 10) / w)); inst.forEach((i, n) => { i.dx = (n % porFila) * w - ((Math.min(inst.length, porFila) - 1) * w) / 2; i.dy = -Math.floor(n / porFila) * d; }); if (!callado) { pinta(); toast('▦ Colocadas en fila, sin pisarse', 'ok', 1600); } }
  // ---------- tocar, ARRASTRAR (la vista no gira) y clic derecho ----------
  const enPlano = e => escena.puntoPlano(e, { normal: [0, 0, 1], punto: [0, 0, 0] });
  const abajo = e => {
    if (!vivo || e.target !== lienzo || e.button !== 0) return;
    const id = escena.cuerpoEn(e); if (!id) { if (selI) { selI = null; pinta(); } return; }
    const i = inst.find(x => x.id === id); if (!i) return; selI = id; const p0 = enPlano(e); if (!p0) return;
    arr = { i, p0, dx0: i.dx, dy0: i.dy, x0: e.clientX, y0: e.clientY, pid: e.pointerId, movido: false }; escena.ctl.enabled = false; pinta();
  };
  const mueve = e => {
    if (!arr || e.pointerId !== arr.pid) return; if (!arr.movido && Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 4) return; arr.movido = true;
    const p = enPlano(e); if (!p) return; const paso = e.shiftKey ? 0.1 : 1;
    arr.i.dx = arr.dx0 + Math.round((p[0] - arr.p0[0]) / paso) * paso; arr.i.dy = arr.dy0 + Math.round((p[1] - arr.p0[1]) / paso) * paso; pinta();
  };
  const arriba = e => { if (!arr || (e && e.pointerId !== arr.pid)) return; const m = arr.movido; arr = null; escena.ctl.enabled = true; if (m) o.alCambiar && o.alCambiar(); };
  contenedor.addEventListener('pointerdown', abajo, true); window.addEventListener('pointermove', mueve); window.addEventListener('pointerup', arriba); window.addEventListener('pointercancel', arriba);
  let der = null;
  lienzo.addEventListener('pointerdown', e => { if (e.button === 2) der = { x: e.clientX, y: e.clientY }; });
  lienzo.addEventListener('contextmenu', e => {
    e.preventDefault(); const d = der; der = null; if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
    const id = escena.cuerpoEn(e); if (id) { selI = id; pinta(); }
    document.querySelectorAll('.mesa-menu').forEach(m => m.remove());
    const it = (ic, t, f) => h('button', { type: 'button', onclick: () => { m.remove(); f(); } }, h('span', ic), h('b', t));
    const m = h('div.r8e-menu.mesa-menu', { style: { left: Math.min(window.innerWidth - 260, e.clientX) + 'px', top: Math.min(window.innerHeight - 260, e.clientY) + 'px' } },
      id ? [it('⧉', 'Duplicar  (Ctrl D)', duplicar), it('📋', 'Copiar  (Ctrl C)', copiar), it('📌', 'Pegar  (Ctrl V)', pegar), it('⟳', 'Girar 90°  (R)', gira), it('🧩', 'Llenar la cama', menuLlenar), inst.length > 1 ? it('🗑', 'Quitar esta copia  (Supr)', quita) : null] : [it('📌', 'Pegar  (Ctrl V)', pegar), it('▦', 'Colocar en fila', () => coloca()), it('🧩', 'Llenar la cama', menuLlenar)]);
    document.body.appendChild(m); setTimeout(() => document.addEventListener('pointerdown', function fuera(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', fuera); } }), 0);
  });
  // ---------- teclado (cuando esta vista se ve y no se escribe en una casilla) ----------
  const tecla = e => {
    if (!vivo || !lienzo.isConnected || lienzo.offsetParent === null || /^(INPUT|SELECT|TEXTAREA)$/.test((e.target && e.target.tagName) || '') || document.querySelector('.modal')) return;
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'd') { e.preventDefault(); duplicar(); } else if (ctrl && k === 'c' && selI) { e.preventDefault(); copiar(); } else if (ctrl && k === 'v' && copia) { e.preventDefault(); pegar(); }
    else if (!ctrl && k === 'r' && selI) { gira(); } else if ((e.key === 'Delete' || e.key === 'Backspace') && selI && inst.length > 1) { e.preventDefault(); quita(); } else if (e.key === 'Escape' && selI) { selI = null; pinta(); }
  };
  document.addEventListener('keydown', tecla);
  barra(); window.__mesaApi = { escena, lienzo }; // (para las pruebas)
  // ---------- para imprimir: cada pieza, una vez por copia (Manifold) ----------
  function expande(partes) {
    if (inst.length < 2 && !inst[0].dx && !inst[0].dy && !inst[0].rot) return partes;
    // el centro de lo que se imprime (las mismas piezas que se ven)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; partes.forEach(p => { const b = p.m.boundingBox(); x0 = Math.min(x0, b.min[0]); x1 = Math.max(x1, b.max[0]); y0 = Math.min(y0, b.min[1]); y1 = Math.max(y1, b.max[1]); });
    const c = [(x0 + x1) / 2, (y0 + y1) / 2], guarda = centro; centro = c;
    const out = inst.flatMap((i, n) => partes.map(p => Object.assign({}, p, { m: p.m.transform(mat(i).elements.slice()), nombre: (p.nombre || 'pieza') + (inst.length > 1 ? ' · ' + (n + 1) : '') })));
    centro = guarda; return out;
  }
  return {
    expande, llenar, get copias() { return inst.length; },
    // 18-10-2026 · una animación hecha para las piezas «de verdad» ({ id: Matrix4 }) → la misma en CADA copia de la cama (las piezas aquí se llaman «id@copia»)
    anim(fn) { if (!fn) return null; return t => { const D = fn(t) || {}, out = {}; inst.forEach(i => { const Mi = mat(i), Mn = Mi.clone().invert(); Object.entries(D).forEach(([id, M]) => { out[id + '@' + i.id] = Mi.clone().multiply(M).multiply(Mn); }); }); return out; }; }, reinicia() { inst = [{ id: 'm0', dx: 0, dy: 0, rot: 0 }]; selI = null; pinta(); },
    destruir() { vivo = false; escena.ponPartes = orig; bar.remove(); contenedor.removeEventListener('pointerdown', abajo, true); window.removeEventListener('pointermove', mueve); window.removeEventListener('pointerup', arriba); window.removeEventListener('pointercancel', arriba); document.removeEventListener('keydown', tecla); }
  };
}
