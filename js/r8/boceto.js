// ================= v20 · 🧊 CelebriR8 · EL BOCETO (como en Fusion, a tu estilo) =================
// Dibujas en plano, con medidas de verdad (cada forma dice lo que mide y se puede escribir el número exacto), y luego
// lo EXTRUYES, lo GIRAS alrededor de su eje (un jarrón, un pomo) o lo INFLAS como un globo.
// ✏️ LÁPIZ (iPad con Apple Pencil) o 🖱️ RATÓN: el programa nota con qué dibujas. Con el lápiz: se dibuja con el lápiz y
// la vista se mueve con los dedos (la palma no pinta). Lo que dibujas a mano se «limpia»: un círculo hecho a mano sale
// redondo, un rectángulo sale recto; un trazo abierto se queda como una línea con grosor (más gruesa si aprietas más).
import { h, mount, btn, toast } from '../ui.js';
import { contornoDe, FORMAS2D } from './nucleo.js';
import { FUENTES } from './motor.js';

const HERR = [
  ['sel', '👆', 'Elegir y mover', 'V'], ['lapiz', '✏️', 'Lápiz / mano alzada', 'B'], ['linea', '📏', 'Líneas (clic a clic)', 'L'], ['rect', '▭', 'Rectángulo', 'R'], ['circulo', '◯', 'Círculo', 'C'],
  ['poligono', '⬡', 'Polígono', 'P'], ['estrella', '☆', 'Estrella', 'S'], ['corazon', '♡', 'Corazón', 'H'], ['elipse', '⬭', 'Elipse', 'E'], ['ranura', '⊂⊃', 'Ranura', 'O'], ['texto', 'T', 'Texto', 'T']
];
const r2 = x => Math.round(x * 100) / 100;
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
const FU = Object.entries(FUENTES).map(([k, f]) => [k, f[0]]);
const dentro = (q, r) => { let d = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) d = !d; } return d; };
const dSeg = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1e-12))); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy); };
function rdp(L, tol) { if (L.length < 3) return L; let i0 = 0, dm = 0; for (let i = 1; i < L.length - 1; i++) { const d = dSeg(L[i], L[0], L[L.length - 1]); if (d > dm) { dm = d; i0 = i; } } return dm > tol ? rdp(L.slice(0, i0 + 1), tol).slice(0, -1).concat(rdp(L.slice(i0), tol)) : [L[0], L[L.length - 1]]; }
const chaikin = (L, n = 2) => { for (let k = 0; k < n; k++) { const o = []; for (let i = 0; i < L.length; i++) { const a = L[i], b = L[(i + 1) % L.length]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } L = o; } return L; };

// Lo que dibujas a mano, limpio: ¿era un círculo? ¿un rectángulo? ¿un polígono? Si no, una curva suave.
export function reconoce(pts) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; pts.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
  const tam = Math.max(x1 - x0, y1 - y0, 0.1), ini = pts[0], fin = pts[pts.length - 1], cerrado = Math.hypot(fin[0] - ini[0], fin[1] - ini[1]) < Math.max(3, tam * 0.18);
  if (!cerrado || pts.length < 8) return { abierto: true };
  const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length, R = pts.map(q => Math.hypot(q[0] - cx, q[1] - cy)), rm = R.reduce((s, x) => s + x, 0) / R.length, sd = Math.sqrt(R.reduce((s, x) => s + (x - rm) ** 2, 0) / R.length);
  if (sd / rm < 0.085) return { t: 'circulo', x: r2(cx), y: r2(cy), d: r2(Math.round(rm * 2 * 2) / 2) };
  const esq = rdp(pts.concat([pts[0]]), tam * 0.07).slice(0, -1);
  if (esq.length === 4) { // ¿cuatro esquinas casi en ángulo recto y alineadas? → rectángulo
    const ang = esq.map((q, i) => { const a = esq[(i + 3) % 4], b = esq[(i + 1) % 4], u = [a[0] - q[0], a[1] - q[1]], v = [b[0] - q[0], b[1] - q[1]]; return Math.abs((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)); });
    const rectos = ang.every(c => c < 0.26), lados = esq.map((q, i) => { const b = esq[(i + 1) % 4]; return Math.abs(Math.atan2(b[1] - q[1], b[0] - q[0])) % (Math.PI / 2); }), alineado = lados.every(a => a < 0.2 || a > Math.PI / 2 - 0.2);
    if (rectos && alineado) return { t: 'rect', x: r2((x0 + x1) / 2), y: r2((y0 + y1) / 2), w: r2(Math.round((x1 - x0) * 2) / 2), h: r2(Math.round((y1 - y0) * 2) / 2), r: 0 };
  }
  if (esq.length >= 3 && esq.length <= 8) { // ¿hecho de rectas? (triángulo, rombo…) → líneas rectas
    const err = pts.reduce((m, q) => Math.max(m, Math.min(...esq.map((a, i) => dSeg(q, a, esq[(i + 1) % esq.length])))), 0);
    if (err < tam * 0.06) return { t: 'linea', pts: esq.map(q => [r2(q[0]), r2(q[1])]) };
  }
  return { t: 'linea', pts: chaikin(rdp(pts, tam * 0.012), 2).map(q => [r2(q[0]), r2(q[1])]), suave: true };
}

// p (el boceto que había, o vacío) → Promise<p nuevo | null>
export function editarBoceto(caja, p0 = {}) {
  return new Promise(resolver => {
    const P = Object.assign({ formas: [], modo: 'extruir', alto: 10, desmoldeo: 100, giro: 0, redondeo: 0, angulo: 360, base: 1.2, doble: false }, JSON.parse(JSON.stringify(p0 || {})));
    const F = P.formas; let sel = F.length ? F.length - 1 : -1, herr = F.length ? 'sel' : 'rect', modo = 'suma', imant = true, reconocer = true, calco = null;
    let vista = { s: 4, ox: 0, oy: 0 }, entrada = '', penVisto = false, enCurso = null, linea = null, raton = [0, 0], atras = [];
    const lienzo = h('canvas.r8b-cv', { 'aria-label': 'Hoja del boceto' }), g = lienzo.getContext('2d');
    const panel = h('div.r8b-panel'), pista = h('div.r8b-pista'), quien = h('span.r8b-quien', '🖱️ Ratón');
    const fiCalco = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; const im = new Image(), u = URL.createObjectURL(f); im.onload = () => { const an = Math.min(160, Math.max(40, (lienzo.clientWidth / vista.s) * 0.6)); calco = { im, w: an, h: an * im.height / im.width, x: 0, y: 0, op: 0.45 }; pinta(); pintaPanel(); }; im.src = u; } });
    const herrs = h('div.r8b-herr', HERR.map(([k, ic, t, tecla]) => h('button.r8b-h' + (k === herr ? '.on' : ''), { type: 'button', 'data-h': k, title: t + ' (' + tecla + ')', 'aria-label': t, onclick: () => ponHerr(k) }, h('span', ic), h('small', t.split(' ')[0]))),
      h('div.r8b-sep'),
      h('button.r8b-h.r8b-modo', { type: 'button', title: 'Lo que dibujes: suma material o es un agujero', onclick: e => { modo = modo === 'suma' ? 'agujero' : 'suma'; if (sel >= 0) { guardaAtras(); F[sel].modo = modo; } e.currentTarget.classList.toggle('agujero', modo === 'agujero'); e.currentTarget.querySelector('small').textContent = modo === 'suma' ? 'Sólido' : 'Agujero'; pinta(); pintaPanel(); } }, h('span', '◐'), h('small', 'Sólido')),
      h('button.r8b-h', { type: 'button', title: 'Poner una imagen debajo para calcarla', onclick: () => fiCalco.click() }, h('span', '🖼️'), h('small', 'Calcar')),
      h('button.r8b-h', { type: 'button', title: 'Deshacer (Ctrl+Z)', onclick: () => deshacer() }, h('span', '↶'), h('small', 'Deshacer')),
      h('button.r8b-h', { type: 'button', title: 'Borrar la forma elegida (Supr)', onclick: () => borraSel() }, h('span', '🗑️'), h('small', 'Borrar')), fiCalco);
    const raiz = h('div.r8b', { tabindex: '-1' },
      h('div.r8b-top', h('b', '✏️ Boceto'), quien, pista, h('label.check.r8b-chk', h('input', { type: 'checkbox', checked: imant, onchange: e => { imant = e.target.checked; } }), 'Imán a la cuadrícula'), h('label.check.r8b-chk', h('input', { type: 'checkbox', checked: reconocer, onchange: e => { reconocer = e.target.checked; } }), 'Limpiar lo dibujado a mano'),
        h('span.grow'), btn('Encuadrar', () => encuadra(), { cls: 'sm ghost' }), btn('Cancelar', () => cerrar(null), { cls: 'sm ghost r8b-cancelar' }), btn('✓ Terminar boceto', () => terminar(), { cls: 'primary r8b-ok' })),
      h('div.r8b-cuerpo', herrs, h('div.r8b-hoja', lienzo), panel));
    caja.appendChild(raiz); setTimeout(() => { raiz.focus(); encuadra(); }, 0);

    // ---------- coordenadas ----------
    const aMm = (cx, cy) => { const r = lienzo.getBoundingClientRect(); return [((cx - r.left) - vista.ox) / vista.s, -((cy - r.top) - vista.oy) / vista.s]; };
    const aPx = q => [vista.ox + q[0] * vista.s, vista.oy - q[1] * vista.s];
    const iman = q => { if (!imant) return q; const paso = vista.s > 14 ? 0.5 : vista.s > 3 ? 1 : 5; for (const f of F) for (const r of (f.t === 'linea' ? [f.pts] : [])) for (const a of r) if (Math.hypot(a[0] - q[0], a[1] - q[1]) * vista.s < 9) return [a[0], a[1]]; return [Math.round(q[0] / paso) * paso, Math.round(q[1] / paso) * paso]; };
    function encuadra() {
      const W = lienzo.clientWidth || 600, H = lienzo.clientHeight || 400; let x0 = -40, x1 = 40, y0 = -30, y1 = 30;
      F.forEach(f => contornoDe(f).concat(f.t === 'trazo' || f.t === 'texto' ? [[[ (f.x || 0) - 20, (f.y || 0) - 10], [(f.x || 0) + 20, (f.y || 0) + 10]]].concat(f.pts ? [f.pts] : []) : []).forEach(r => r.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); })));
      vista.s = Math.max(0.5, Math.min(40, Math.min(W / (x1 - x0) * 0.8, H / (y1 - y0) * 0.8))); vista.ox = W / 2 - (x0 + x1) / 2 * vista.s; vista.oy = H / 2 + (y0 + y1) / 2 * vista.s; pinta();
    }
    // ---------- dibujar ----------
    const contornos = f => f.t === 'texto' ? [] : f.t === 'trazo' ? [] : contornoDe(f);
    function pinta() {
      const W = lienzo.clientWidth || 600, H = lienzo.clientHeight || 400, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (lienzo.width !== Math.round(W * dpr)) { lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      const oscuro = !document.documentElement.classList.contains('claro') && document.documentElement.getAttribute('data-modo') !== 'dia';
      g.fillStyle = oscuro ? '#0b0f1e' : '#fbfbfe'; g.fillRect(0, 0, W, H);
      if (calco) { const a = aPx([calco.x - calco.w / 2, calco.y + calco.h / 2]); g.globalAlpha = calco.op; g.drawImage(calco.im, a[0], a[1], calco.w * vista.s, calco.h * vista.s); g.globalAlpha = 1; }
      // cuadrícula: 1 mm (si se ve), 10 mm y 50 mm
      const linea2 = (paso, col) => { if (paso * vista.s < 6) return; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); const [mx0, my1] = aMm(lienzo.getBoundingClientRect().left, lienzo.getBoundingClientRect().top), [mx1, my0] = aMm(lienzo.getBoundingClientRect().right, lienzo.getBoundingClientRect().bottom);
        for (let x = Math.floor(mx0 / paso) * paso; x <= mx1; x += paso) { const p = aPx([x, 0])[0]; g.moveTo(Math.round(p) + 0.5, 0); g.lineTo(Math.round(p) + 0.5, H); }
        for (let y = Math.floor(my0 / paso) * paso; y <= my1; y += paso) { const p = aPx([0, y])[1]; g.moveTo(0, Math.round(p) + 0.5); g.lineTo(W, Math.round(p) + 0.5); } g.stroke(); };
      linea2(1, oscuro ? '#141a30' : '#eef0f6'); linea2(10, oscuro ? '#1f2745' : '#dde1ec'); linea2(50, oscuro ? '#2d3863' : '#c3c9da');
      const o = aPx([0, 0]); g.lineWidth = 1.5; g.strokeStyle = P.modo === 'revolucion' ? '#ff4d6d' : 'rgba(255,77,109,.6)'; g.beginPath(); g.moveTo(o[0], 0); g.lineTo(o[0], H); g.stroke(); g.strokeStyle = 'rgba(61,220,132,.6)'; g.beginPath(); g.moveTo(0, o[1]); g.lineTo(W, o[1]); g.stroke();
      if (P.modo === 'revolucion') { g.fillStyle = '#ff4d6d'; g.font = '600 12px system-ui'; g.fillText('↻ eje de giro', o[0] + 6, 16); }
      // formas
      F.forEach((f, i) => {
        const on = i === sel, ag = f.modo === 'agujero', col = ag ? '255,77,109' : '124,108,255';
        g.lineWidth = on ? 2.4 : 1.6; g.strokeStyle = on ? '#29d3ff' : 'rgb(' + col + ')'; g.fillStyle = 'rgba(' + col + ',' + (ag ? 0.16 : 0.22) + ')';
        if (f.t === 'trazo') { g.lineCap = g.lineJoin = 'round'; for (let k = 1; k < f.pts.length; k++) { const a = aPx(f.pts[k - 1]), b = aPx(f.pts[k]); g.lineWidth = Math.max(1, (f.pts[k][2] || f.ancho || 2) * vista.s); g.strokeStyle = on ? 'rgba(41,211,255,.85)' : 'rgba(' + col + ',.85)'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } return; }
        if (f.t === 'texto') { const a = aPx([f.x || 0, f.y || 0]), fuente = (FUENTES[f.fuente] || FUENTES.gorda)[1].replace('{t}', Math.max(4, (f.alto || 10) * vista.s * 1.3)); g.save(); g.translate(a[0], a[1]); g.rotate(-(f.ang || 0) * Math.PI / 180); g.font = fuente; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = on ? '#29d3ff' : 'rgb(' + col + ')'; g.fillText(f.txt || 'Texto', 0, 0); g.restore(); return; }
        contornos(f).forEach(r => { g.beginPath(); r.forEach((q, k) => { const p = aPx(q); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.fill(); g.stroke(); });
        if (on) cotas(f);
      });
      // lo que se está dibujando
      if (enCurso) {
        g.setLineDash([6, 4]); g.strokeStyle = '#29d3ff'; g.lineWidth = 1.6;
        if (enCurso.t === 'mano') { g.setLineDash([]); g.lineCap = g.lineJoin = 'round'; for (let k = 1; k < enCurso.pts.length; k++) { const a = aPx(enCurso.pts[k - 1]), b = aPx(enCurso.pts[k]); g.lineWidth = Math.max(1, enCurso.pts[k][2] * vista.s); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
        else { contornoDe(enCurso).forEach(r => { g.beginPath(); r.forEach((q, k) => { const p = aPx(q); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.stroke(); }); cotas(enCurso); }
        g.setLineDash([]);
      }
      if (linea) { // líneas clic a clic
        g.strokeStyle = '#29d3ff'; g.lineWidth = 2; g.beginPath(); linea.forEach((q, k) => { const p = aPx(q); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); const c = aPx(raton); g.lineTo(c[0], c[1]); g.stroke();
        const u = linea[linea.length - 1], L = Math.hypot(raton[0] - u[0], raton[1] - u[1]), A = Math.atan2(raton[1] - u[1], raton[0] - u[0]) * 180 / Math.PI; etiqueta(c[0] + 12, c[1] - 12, n1(L) + ' mm · ' + Math.round(A) + '°');
        const p0 = aPx(linea[0]); if (linea.length > 2 && Math.hypot(c[0] - p0[0], c[1] - p0[1]) < 12) { g.strokeStyle = '#ffd23f'; g.beginPath(); g.arc(p0[0], p0[1], 9, 0, 7); g.stroke(); }
      }
    }
    function etiqueta(x, y, t) { g.font = '600 12px system-ui'; const w = g.measureText(t).width + 10; g.fillStyle = 'rgba(10,14,28,.88)'; g.beginPath(); g.roundRect ? g.roundRect(x, y - 10, w, 20, 6) : g.rect(x, y - 10, w, 20); g.fill(); g.fillStyle = '#fff'; g.fillText(t, x + 5, y + 4); }
    function cotas(f) {
      const p = aPx([f.x || 0, f.y || 0]);
      if (f.t === 'rect' || f.t === 'elipse') { const a = aPx([(f.x || 0) - f.w / 2, (f.y || 0) - f.h / 2]); etiqueta(p[0] - 20, a[1] + 16, n1(f.w) + ' mm'); etiqueta(a[0] + (f.w * vista.s) + 6, p[1], n1(f.h) + ' mm'); }
      else if (f.t === 'circulo' || f.t === 'poligono' || f.t === 'estrella') etiqueta(p[0] + 6, p[1], 'Ø ' + n1(f.d) + ' mm');
      else if (f.t === 'corazon') etiqueta(p[0] + 6, p[1], n1(f.w) + ' mm');
      else if (f.t === 'ranura') etiqueta(p[0] + 6, p[1], n1(f.l) + ' × ' + n1(f.w) + ' mm');
      else if (f.t === 'linea') f.pts.forEach((q, k) => { const b = f.pts[(k + 1) % f.pts.length], m = aPx([(q[0] + b[0]) / 2, (q[1] + b[1]) / 2]); if (f.suave) return; etiqueta(m[0] + 4, m[1], n1(Math.hypot(b[0] - q[0], b[1] - q[1]))); });
    }
    // ---------- tocar ----------
    function cual(q) {
      for (let i = F.length - 1; i >= 0; i--) { const f = F[i];
        if (f.t === 'trazo') { for (let k = 1; k < f.pts.length; k++) if (dSeg(q, f.pts[k - 1], f.pts[k]) < Math.max(f.pts[k][2] || 2, 6 / vista.s)) return i; continue; }
        if (f.t === 'texto') { if (Math.abs(q[0] - (f.x || 0)) < (String(f.txt || '').length * (f.alto || 10) * 0.4 + 3) && Math.abs(q[1] - (f.y || 0)) < (f.alto || 10) * 0.7) return i; continue; }
        if (contornoDe(f).some(r => dentro(q, r) || r.some((a, k) => dSeg(q, a, r[(k + 1) % r.length]) < 6 / vista.s))) return i; }
      return -1;
    }
    const guardaAtras = () => { atras.push(JSON.stringify(F)); if (atras.length > 80) atras.shift(); };
    function deshacer() { if (linea) { linea.pop(); if (!linea.length) linea = null; pinta(); return; } const s = atras.pop(); if (!s) return; F.splice(0, F.length, ...JSON.parse(s)); sel = Math.min(sel, F.length - 1); pinta(); pintaPanel(); }
    function borraSel() { if (sel < 0) return; guardaAtras(); F.splice(sel, 1); sel = -1; pinta(); pintaPanel(); }
    function ponHerr(k) { herr = k; linea = null; enCurso = null; herrs.querySelectorAll('[data-h]').forEach(b => b.classList.toggle('on', b.dataset.h === k)); pista.textContent = { sel: 'Toca una forma para elegirla; arrástrala para moverla.', lapiz: penVisto ? 'Dibuja con el lápiz. Mueve la vista con dos dedos.' : 'Dibuja a mano alzada. Si lo cierras, sale una forma; si no, una línea con grosor.', linea: 'Clic en cada esquina. Vuelve al primer punto (o Intro) para cerrar. Esc: cancelar.', texto: 'Toca donde quieres el texto y escríbelo a la derecha.' }[k] || 'Arrastra para dibujarlo. Luego escribe la medida exacta a la derecha.'; pinta(); }
    const nueva = (t, q, q2) => {
      const dx = q2[0] - q[0], dy = q2[1] - q[1], R = Math.hypot(dx, dy), cx = (q[0] + q2[0]) / 2, cy = (q[1] + q2[1]) / 2, m = { modo };
      if (t === 'rect') return Object.assign(m, { t, x: r2(cx), y: r2(cy), w: r2(Math.abs(dx)) || 20, h: r2(Math.abs(dy)) || 20, r: 0 });
      if (t === 'elipse') return Object.assign(m, { t, x: r2(cx), y: r2(cy), w: r2(Math.abs(dx)) || 30, h: r2(Math.abs(dy)) || 20 });
      if (t === 'ranura') return Object.assign(m, { t, x: r2(cx), y: r2(cy), l: r2(Math.max(Math.abs(dx), 2)) || 30, w: r2(Math.max(1, Math.abs(dy))) || 8, ang: 0 });
      if (t === 'circulo') return Object.assign(m, { t, x: q[0], y: q[1], d: r2(R * 2) || 20 });
      if (t === 'poligono') return Object.assign(m, { t, x: q[0], y: q[1], d: r2(R * 2) || 20, n: 6, ang: 0 });
      if (t === 'estrella') return Object.assign(m, { t, x: q[0], y: q[1], d: r2(R * 2) || 30, n: 5, ri: 45, ang: 0 });
      if (t === 'corazon') return Object.assign(m, { t, x: q[0], y: q[1], w: r2(R * 2) || 30, ang: 0 });
      return null;
    };
    const ptrs = new Map(); let gesto = null, arrastre = null;
    lienzo.addEventListener('pointerdown', e => {
      lienzo.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, tipo: e.pointerType });
      if (e.pointerType === 'pen' && !penVisto) { penVisto = true; mount(quien, '✏️ Apple Pencil'); quien.classList.add('lapiz'); toast('✏️ Lápiz detectado: dibuja con el lápiz y mueve la vista con dos dedos. Tu mano no pinta.', 'ok', 6000); if (herr === 'sel' || herr === 'rect') ponHerr('lapiz'); }
      else if (e.pointerType === 'touch' && !penVisto) mount(quien, '👆 Dedo'); else if (e.pointerType === 'mouse') mount(quien, '🖱️ Ratón');
      const dedos = [...ptrs.values()].filter(p => p.tipo === 'touch');
      if (dedos.length >= 2 || e.button === 1 || e.button === 2 || (e.pointerType === 'touch' && penVisto)) { enCurso = null; gesto = { ini: [...ptrs.values()].map(p => [p.x, p.y]), vista: Object.assign({}, vista) }; return; }
      if (ptrs.size > 1) return;
      const q0 = aMm(e.clientX, e.clientY), q = herr === 'lapiz' ? q0 : iman(q0);
      if (herr === 'sel') { sel = cual(q0); pintaPanel(); if (sel >= 0) { guardaAtras(); arrastre = { q: q, f: JSON.parse(JSON.stringify(F[sel])) }; } pinta(); return; }
      if (herr === 'lapiz') { const pr = e.pressure > 0 && e.pointerType === 'pen' ? e.pressure : 0.5; enCurso = { t: 'mano', pts: [[q[0], q[1], r2(0.8 + pr * 3.2)]] }; return; }
      if (herr === 'texto') { guardaAtras(); F.push({ t: 'texto', x: q[0], y: q[1], txt: 'Texto', fuente: 'gorda', alto: 10, ang: 0, modo }); sel = F.length - 1; pinta(); pintaPanel(); setTimeout(() => { const i = panel.querySelector('[data-k="txt"]'); if (i) { i.focus(); i.select(); } }, 30); return; }
      if (herr === 'linea') { if (!linea) linea = [q]; else { const p0 = linea[0]; if (linea.length > 2 && Math.hypot(q[0] - p0[0], q[1] - p0[1]) * vista.s < 12) return cierraLinea(); linea.push(q); } pinta(); return; }
      enCurso = { herr, q0: q, ...nueva(herr, q, q) };
    });
    lienzo.addEventListener('pointermove', e => {
      const prev = ptrs.get(e.pointerId); if (prev) { prev.x = e.clientX; prev.y = e.clientY; }
      if (gesto) { const ahora = [...ptrs.values()].map(p => [p.x, p.y]); if (!ahora.length) return; const c = L => [L.reduce((s, p) => s + p[0], 0) / L.length, L.reduce((s, p) => s + p[1], 0) / L.length];
        const c0 = c(gesto.ini), c1 = c(ahora); let k = 1; if (ahora.length >= 2 && gesto.ini.length >= 2) { const d0 = Math.hypot(gesto.ini[0][0] - gesto.ini[1][0], gesto.ini[0][1] - gesto.ini[1][1]), d1 = Math.hypot(ahora[0][0] - ahora[1][0], ahora[0][1] - ahora[1][1]); if (d0 > 10) k = d1 / d0; }
        const r = lienzo.getBoundingClientRect(), s = Math.max(0.3, Math.min(60, gesto.vista.s * k)), f = s / gesto.vista.s;
        vista = { s, ox: (c0[0] - r.left) - ((c0[0] - r.left) - gesto.vista.ox) * f + (c1[0] - c0[0]), oy: (c0[1] - r.top) - ((c0[1] - r.top) - gesto.vista.oy) * f + (c1[1] - c0[1]) }; pinta(); return; }
      const q0 = aMm(e.clientX, e.clientY); raton = herr === 'lapiz' ? q0 : iman(q0);
      if (arrastre && sel >= 0) { const dx = raton[0] - arrastre.q[0], dy = raton[1] - arrastre.q[1], f = F[sel], o = arrastre.f; if (o.pts) f.pts = o.pts.map(p => [r2(p[0] + dx), r2(p[1] + dy)].concat(p.length > 2 ? [p[2]] : [])); if ('x' in o) { f.x = r2(o.x + dx); f.y = r2(o.y + dy); } pinta(); return; }
      if (enCurso && enCurso.t === 'mano') { const L = enCurso.pts, u = L[L.length - 1]; if (Math.hypot(raton[0] - u[0], raton[1] - u[1]) * vista.s > 2) { const pr = e.pressure > 0 && e.pointerType === 'pen' ? e.pressure : 0.5; L.push([r2(raton[0]), r2(raton[1]), r2(0.8 + pr * 3.2)]); } pinta(); return; }
      if (enCurso) { Object.assign(enCurso, nueva(enCurso.herr, enCurso.q0, raton)); pinta(); return; }
      if (linea) pinta();
    });
    const suelta = e => {
      ptrs.delete(e.pointerId); if (gesto) { if (!ptrs.size) gesto = null; else gesto = { ini: [...ptrs.values()].map(p => [p.x, p.y]), vista: Object.assign({}, vista) }; return; }
      if (arrastre) { arrastre = null; pintaPanel(); return; }
      if (enCurso && enCurso.t === 'mano') {
        const L = enCurso.pts; enCurso = null; if (L.length < 3) { pinta(); return; }
        guardaAtras(); const r = reconocer ? reconoce(L) : { abierto: !(Math.hypot(L[0][0] - L[L.length - 1][0], L[0][1] - L[L.length - 1][1]) < 4) };
        if (r.abierto) F.push({ t: 'trazo', pts: rdp(L, 0.25 / Math.max(0.2, vista.s / 4)).map(q => [r2(q[0]), r2(q[1]), q[2] || 2]), ancho: 2, modo });
        else if (r.t) F.push(Object.assign(r, { modo }));
        else F.push({ t: 'linea', pts: chaikin(rdp(L, 0.3), 1).map(q => [r2(q[0]), r2(q[1])]), suave: true, modo });
        sel = F.length - 1; const f = F[sel]; toast(f.t === 'circulo' ? '◯ Lo he dejado redondo: Ø ' + n1(f.d) + ' mm' : f.t === 'rect' ? '▭ Lo he dejado recto: ' + n1(f.w) + ' × ' + n1(f.h) + ' mm' : f.t === 'trazo' ? '✏️ Trazo con grosor (más gordo donde aprietas)' : f.suave ? '✨ Curva suavizada' : '📐 Lo he dejado con lados rectos', 'ok', 2600);
        pinta(); pintaPanel(); return; }
      if (enCurso) { const f = enCurso; enCurso = null; delete f.herr; delete f.q0; guardaAtras(); F.push(f); sel = F.length - 1; pinta(); pintaPanel(); }
    };
    lienzo.addEventListener('pointerup', suelta); lienzo.addEventListener('pointercancel', suelta);
    lienzo.addEventListener('dblclick', () => { if (linea) cierraLinea(); });
    lienzo.addEventListener('contextmenu', e => e.preventDefault());
    lienzo.addEventListener('wheel', e => { e.preventDefault(); const r = lienzo.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, k = e.deltaY > 0 ? 0.88 : 1.14, s = Math.max(0.3, Math.min(60, vista.s * k)), f = s / vista.s; vista = { s, ox: mx - (mx - vista.ox) * f, oy: my - (my - vista.oy) * f }; pinta(); }, { passive: false });
    function cierraLinea() { if (!linea || linea.length < 3) { linea = null; pinta(); return; } guardaAtras(); F.push({ t: 'linea', pts: linea.map(q => [r2(q[0]), r2(q[1])]), modo }); linea = null; sel = F.length - 1; pinta(); pintaPanel(); }
    raiz.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); deshacer(); return; }
      if (e.key === 'Escape') { if (linea || enCurso) { linea = null; enCurso = null; pinta(); } else if (sel >= 0) { sel = -1; pinta(); pintaPanel(); } return; }
      if (e.key === 'Enter' && linea) { cierraLinea(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (linea) { linea.pop(); if (!linea.length) linea = null; pinta(); } else borraSel(); e.preventDefault(); return; }
      const H = HERR.find(x => x[3].toLowerCase() === e.key.toLowerCase()); if (H && !e.ctrlKey && !e.metaKey) ponHerr(H[0]);
    });
    const ro = window.ResizeObserver ? new ResizeObserver(() => pinta()) : null; if (ro) ro.observe(lienzo);

    // ---------- el panel: medidas exactas de la forma elegida y qué hacer con el boceto ----------
    const campoN = (o, k, t, min, max, paso = 0.5, u = 'mm') => { const i = h('input.inp', { type: 'number', value: o[k] ?? '', min, max, step: paso, 'data-k': k, 'aria-label': t }); i.oninput = () => { const v = Number(String(i.value).replace(',', '.')); if (!isFinite(v)) return; o[k] = Math.max(min, Math.min(max, v)); pinta(); }; i.onfocus = () => guardaAtras(); return h('label.r8b-f', h('span', t), h('span.r8b-n', i, h('i', u))); };
    function pintaPanel() {
      const f = sel >= 0 ? F[sel] : null, out = [];
      if (f) {
        out.push(h('div.r8b-tit', h('b', f.t === 'trazo' ? '✏️ Trazo' : FORMAS2D[f.t] || f.t), h('span.r8b-tag' + (f.modo === 'agujero' ? '.ag' : ''), f.modo === 'agujero' ? 'Agujero' : 'Sólido')));
        if ('x' in f) out.push(h('div.r8b-dos', campoN(f, 'x', 'X (centro)', -500, 500), campoN(f, 'y', 'Y (centro)', -500, 500)));
        if (f.t === 'rect') out.push(h('div.r8b-dos', campoN(f, 'w', 'Ancho', 0.1, 500), campoN(f, 'h', 'Alto', 0.1, 500)), campoN(f, 'r', 'Esquinas redondas', 0, 100), campoN(f, 'ang', 'Girar', -360, 360, 1, '°'));
        if (f.t === 'elipse') out.push(h('div.r8b-dos', campoN(f, 'w', 'Ancho', 0.1, 500), campoN(f, 'h', 'Alto', 0.1, 500)), campoN(f, 'ang', 'Girar', -360, 360, 1, '°'));
        if (f.t === 'circulo') out.push(campoN(f, 'd', 'Diámetro', 0.1, 500));
        if (f.t === 'poligono') out.push(campoN(f, 'd', 'Diámetro', 0.1, 500), campoN(f, 'n', 'Lados', 3, 64, 1, ''), campoN(f, 'ang', 'Girar', -360, 360, 1, '°'));
        if (f.t === 'estrella') out.push(campoN(f, 'd', 'Diámetro', 0.1, 500), campoN(f, 'n', 'Puntas', 3, 40, 1, ''), campoN(f, 'ri', 'Hueco de las puntas', 5, 95, 1, '%'), campoN(f, 'ang', 'Girar', -360, 360, 1, '°'));
        if (f.t === 'corazon') out.push(campoN(f, 'w', 'Ancho', 1, 500), campoN(f, 'ang', 'Girar', -360, 360, 1, '°'));
        if (f.t === 'ranura') out.push(h('div.r8b-dos', campoN(f, 'l', 'Largo', 0.2, 500), campoN(f, 'w', 'Ancho', 0.1, 200)), campoN(f, 'ang', 'Girar', -360, 360, 1, '°'));
        if (f.t === 'texto') { const ti = h('input.inp', { type: 'text', value: f.txt || '', maxlength: 40, 'data-k': 'txt', oninput: e => { f.txt = e.target.value; pinta(); } });
          out.push(h('label.r8b-f.col', h('span', 'Texto'), ti), h('label.r8b-f.col', h('span', 'Letra'), h('select.inp', { onchange: e => { f.fuente = e.target.value; pinta(); } }, FU.map(([k, t]) => h('option', { value: k, selected: f.fuente === k }, t)))), campoN(f, 'alto', 'Altura de las letras', 1, 200), campoN(f, 'ang', 'Girar', -360, 360, 1, '°')); }
        if (f.t === 'trazo') { const anchoTodo = h('input.inp', { type: 'number', min: 0.4, max: 20, step: 0.2, value: f.ancho || 2 }); anchoTodo.oninput = () => { const v = Math.max(0.4, Math.min(20, Number(anchoTodo.value) || 2)); f.ancho = v; f.pts.forEach(p => { p[2] = v; }); pinta(); }; out.push(h('label.r8b-f', h('span', 'Grosor de todo el trazo'), h('span.r8b-n', anchoTodo, h('i', 'mm'))), h('small.muted', 'Con el lápiz, cada punto tiene el grosor de lo que apretaste. Si escribes aquí un número, todo el trazo queda igual.')); }
        if (f.t === 'linea' && !f.suave) { // cada lado con su medida: escribe el número y el lado se estira
          out.push(h('div.r8b-lados', h('span', 'Medida de cada lado'), f.pts.map((q, k) => { const b = f.pts[(k + 1) % f.pts.length], L = Math.hypot(b[0] - q[0], b[1] - q[1]), i = h('input.inp', { type: 'number', min: 0.1, step: 0.5, value: r2(L) });
            i.onchange = () => { const v = Number(String(i.value).replace(',', '.')); if (!(v > 0) || !(L > 0)) return; guardaAtras(); const dx = (b[0] - q[0]) / L * (v - L), dy = (b[1] - q[1]) / L * (v - L); for (let j = k + 1; j < f.pts.length; j++) { f.pts[j] = [r2(f.pts[j][0] + dx), r2(f.pts[j][1] + dy)]; } pinta(); pintaPanel(); };
            return h('label.r8b-lado', h('i', String.fromCharCode(65 + k % 26) + '→' + String.fromCharCode(65 + (k + 1) % f.pts.length % 26)), i, h('small', 'mm')); })), h('small.muted', 'Al cambiar un lado se mueven los puntos que vienen detrás (el último lado se ajusta solo).'));
        }
        out.push(h('div.row.wrap.r8b-acc', btn(f.modo === 'agujero' ? 'Hacerlo sólido' : 'Hacerlo agujero', () => { guardaAtras(); f.modo = f.modo === 'agujero' ? 'suma' : 'agujero'; pinta(); pintaPanel(); }, { cls: 'sm' }), btn('Duplicar', () => { guardaAtras(); const n = JSON.parse(JSON.stringify(f)); if ('x' in n) n.x = r2(n.x + 5); if (n.pts) n.pts = n.pts.map(p => [p[0] + 5, p[1] - 5].concat(p.length > 2 ? [p[2]] : [])); F.push(n); sel = F.length - 1; pinta(); pintaPanel(); }, { cls: 'sm' }), btn('Borrar', borraSel, { cls: 'sm ghost' })));
      } else out.push(h('div.r8b-tit', h('b', 'Nada elegido')), h('p.small.muted', F.length ? 'Toca una forma (con 👆) para ver y escribir sus medidas.' : 'Elige una herramienta a la izquierda y dibuja. Con el lápiz del iPad, dibuja a mano: los círculos y rectángulos salen perfectos solos.'));
      if (calco) out.push(h('div.r8b-calco', h('b', '🖼️ Imagen para calcar'), h('div.r8b-dos', campoN(calco, 'w', 'Ancho', 5, 1000), campoN(calco, 'op', 'Se ve al', 0.05, 1, 0.05, '')), h('div.r8b-dos', campoN(calco, 'x', 'X', -500, 500), campoN(calco, 'y', 'Y', -500, 500)), btn('Quitar la imagen', () => { calco = null; pinta(); pintaPanel(); }, { cls: 'sm ghost' })));
      // ¿qué hago con el boceto?
      const op = (k, t, d) => h('button.r8b-op' + (P.modo === k ? '.on' : ''), { type: 'button', 'data-op': k, onclick: () => { P.modo = k; pinta(); pintaPanel(); } }, h('b', t), h('small', d));
      const pn = (k, t, min, max, paso, u) => campoN(P, k, t, min, max, paso, u);
      out.push(h('div.r8b-ops', h('b', '¿Qué hago con el boceto?'), h('div.r8b-opsg', op('extruir', '⬆️ Extruir', 'Darle altura'), op('revolucion', '↻ Girar', 'Alrededor del eje rojo'), op('inflar', '🎈 Inflar', 'Como un globo')),
        P.modo === 'extruir' ? [pn('alto', 'Altura', 0.1, 500, 0.5, 'mm'), pn('desmoldeo', 'Tamaño arriba (100 = recto)', 0, 300, 1, '%'), pn('giro', 'Retorcer al subir', -1080, 1080, 5, '°'), pn('redondeo', 'Redondear esquinas del dibujo', 0, 50, 0.5, 'mm')] : null,
        P.modo === 'revolucion' ? [pn('angulo', 'Cuánto gira', 1, 360, 5, '°'), h('small.muted', 'Dibuja el perfil a la DERECHA de la línea roja (como medio jarrón). Al girarlo sale la pieza entera.')] : null,
        P.modo === 'inflar' ? [pn('alto', 'Lo gordo que sale', 1, 120, 0.5, 'mm'), pn('base', 'Borde plano de abajo', 0, 10, 0.2, 'mm'), h('label.check.small', h('input', { type: 'checkbox', checked: !!P.doble, onchange: e => { P.doble = e.target.checked; } }), 'Inflado por los dos lados (figura de peluche)'), h('small.muted', 'Perfecto para dibujos hechos con el lápiz: cortadores, colgantes, figuritas.')] : null));
      mount(panel, out);
    }
    function terminar() {
      if (linea) cierraLinea();
      if (!F.some(f => f.modo !== 'agujero')) { toast('Dibuja al menos una forma sólida (las de color morado).', 'warn'); return; }
      cerrar(P);
    }
    function cerrar(r) { if (ro) ro.disconnect(); raiz.remove(); resolver(r); }
    ponHerr(herr); pintaPanel();
  });
}
