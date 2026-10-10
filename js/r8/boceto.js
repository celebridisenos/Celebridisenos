// ================= v20 · 🧊 CelebriR8 · EL BOCETO (como en Fusion, a tu estilo) =================
// Dibujas en plano, con medidas de verdad (cada forma dice lo que mide y se puede escribir el número exacto), y luego
// lo EXTRUYES, lo GIRAS alrededor de su eje (un jarrón, un pomo) o lo INFLAS como un globo.
// ✏️ LÁPIZ (iPad con Apple Pencil) o 🖱️ RATÓN: el programa nota con qué dibujas. Con el lápiz: se dibuja con el lápiz y
// la vista se mueve con los dedos (la palma no pinta). Lo que dibujas a mano se «limpia»: un círculo hecho a mano sale
// redondo, un rectángulo sale recto; un trazo abierto se queda como una línea con grosor (más gruesa si aprietas más).
import { h, mount, btn, toast } from '../ui.js';
import { contornoDe, FORMAS2D } from './nucleo.js';
import { FUENTES } from './motor.js';
import * as FM from './foto_medida.js';
import * as SV from './svg.js'; // v20.4: importar un SVG (contornos → formas; los de dentro, agujeros) // v20.4: foto para calcar: calibrar, enderezar, contorno, medir, leer engranajes y acoplamientos

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
    const F = P.formas; let sel = F.length ? F.length - 1 : -1, herr = F.length ? 'sel' : 'rect', modo = 'suma', imant = true, reconocer = true, calco = P.calco || null, calcoIm = null;
    // v20.4 · la FOTO: modoF = 'calibra' | 'persp' | 'medir' (lo que hacen los clics sobre ella) · ptsF = los puntos marcados (mm)
    let modoF = null, ptsF = [], calPend = null, comparar = false, lectura = null, arrastreImg = null;
    const cargaCalco = () => { if (!calco) { calcoIm = null; return; } FM.imagenDe(calco.img).then(im => { calcoIm = im; pinta(); }).catch(e => { toast(e.message, 'warn'); }); };
    cargaCalco();
    let vista = { s: 4, ox: 0, oy: 0 }, entrada = '', penVisto = false, enCurso = null, linea = null, raton = [0, 0], atras = [];
    const lienzo = h('canvas.r8b-cv', { 'aria-label': 'Hoja del boceto' }), g = lienzo.getContext('2d');
    const panel = h('div.r8b-panel'), pista = h('div.r8b-pista'), quien = h('span.r8b-quien', '🖱️ Ratón');
    const fiCalco = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp', style: { display: 'none' }, onchange: async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
      try { const I = await FM.cargaArchivo(f), an = Math.min(160, Math.max(40, (lienzo.clientWidth / vista.s) * 0.6)); calco = { img: I.id, w: Math.round(an * 10) / 10, x: 0, y: 0, ang: 0, op: 0.5, ver: true, bloq: false, refs: [], nombre: f.name }; P.calco = calco; lectura = null; cargaCalco(); pintaPanel(); toast('🖼️ Foto puesta. El tamaño es A OJO: calíbrala con una medida que conozcas (📏 en el panel).', 'ok', 6000); } catch (x) { toast(x.message || String(x), 'bad'); } } });
    // v20.4 · 📐 SVG: se lee (en mm de verdad) y sus formas entran marcadas «svg»: un panel las escala, gira y mueve juntas
    const fiSvg = h('input', { type: 'file', accept: '.svg,image/svg+xml', style: { display: 'none' }, onchange: async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) metSvg(await f.text(), f.name); } });
    let infoSvg = null;
    function metSvg(texto, nombre) {
      try { const R = SV.leeSVG(texto), L = SV.aFormas(R); guardaAtras(); F.forEach(f => { if (f.svg) f.svg = 2; }); L.forEach(f => F.push(f)); sel = -1; infoSvg = { nombre: nombre || 'dibujo.svg', avisos: R.avisos, ancho0: R.ancho, alto0: R.alto, n: L.length, ag: L.filter(f => f.modo === 'agujero').length, ab: R.abiertos.length };
        encuadra(); pintaPanel(); toast('📐 SVG: ' + L.filter(f => f.t === 'linea').length + ' contorno' + (L.length === 1 ? '' : 's') + ' (' + infoSvg.ag + ' agujero' + (infoSvg.ag === 1 ? '' : 's') + '), ' + n1(R.ancho) + ' × ' + n1(R.alto) + ' mm. Ajusta el tamaño a la derecha.', 'ok', 7000);
        if (R.avisos.length) setTimeout(() => toast('⚠️ ' + R.avisos.join(' · '), 'warn', 9000), 400);
      } catch (x) { toast(x.message || String(x), 'bad', 7000); }
    }
    const delSvg = () => F.filter(f => f.svg === 1);
    function cajaSvg() { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; delSvg().forEach(f => f.pts.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); })); return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
    function transSvg(fn) { const B = cajaSvg(); delSvg().forEach(f => { f.pts = f.pts.map(q => { const r = fn(q[0], q[1], B); return [r2(r[0]), r2(r[1])].concat(q.length > 2 ? [q[2]] : []); }); }); pinta(); }
    window.__r8bSvg = { metSvg, cajaSvg }; // (para las pruebas)
    const herrs = h('div.r8b-herr', HERR.map(([k, ic, t, tecla]) => h('button.r8b-h' + (k === herr ? '.on' : ''), { type: 'button', 'data-h': k, title: t + ' (' + tecla + ')', 'aria-label': t, onclick: () => ponHerr(k) }, h('span', ic), h('small', t.split(' ')[0]))),
      h('div.r8b-sep'),
      h('button.r8b-h.r8b-modo', { type: 'button', title: 'Lo que dibujes: suma material o es un agujero', onclick: e => { modo = modo === 'suma' ? 'agujero' : 'suma'; if (sel >= 0) { guardaAtras(); F[sel].modo = modo; } e.currentTarget.classList.toggle('agujero', modo === 'agujero'); e.currentTarget.querySelector('small').textContent = modo === 'suma' ? 'Sólido' : 'Agujero'; pinta(); pintaPanel(); } }, h('span', '◐'), h('small', 'Sólido')),
      h('button.r8b-h', { type: 'button', title: 'Poner una imagen debajo para calcarla', onclick: () => fiCalco.click() }, h('span', '🖼️'), h('small', 'Calcar')),
      h('button.r8b-h', { type: 'button', title: 'Traer un dibujo SVG (Inkscape, Canva, iconos…): sus contornos pasan a ser formas en mm', 'data-h': 'svg', onclick: () => fiSvg.click() }, h('span', '📐'), h('small', 'SVG')),
      h('button.r8b-h', { type: 'button', title: 'Deshacer (Ctrl+Z)', onclick: () => deshacer() }, h('span', '↶'), h('small', 'Deshacer')),
      h('button.r8b-h', { type: 'button', title: 'Borrar la forma elegida (Supr)', onclick: () => borraSel() }, h('span', '🗑️'), h('small', 'Borrar')), fiCalco, fiSvg);
    const raiz = h('div.r8b', { tabindex: '-1' },
      h('div.r8b-top', h('b', '✏️ Boceto'), quien, pista, h('label.check.r8b-chk', h('input', { type: 'checkbox', checked: imant, onchange: e => { imant = e.target.checked; } }), 'Imán a la cuadrícula'), h('label.check.r8b-chk', h('input', { type: 'checkbox', checked: reconocer, onchange: e => { reconocer = e.target.checked; } }), 'Limpiar lo dibujado a mano'),
        h('span.grow'), btn('Encuadrar', () => encuadra(), { cls: 'sm ghost' }), btn('Cancelar', () => cerrar(null), { cls: 'sm ghost r8b-cancelar' }), btn('✓ Terminar boceto', () => terminar(), { cls: 'primary r8b-ok' })),
      h('div.r8b-cuerpo', herrs, h('div.r8b-hoja', lienzo), panel));
    caja.appendChild(raiz); setTimeout(() => { raiz.focus(); encuadra(); if (P.svgTexto) { const t = P.svgTexto, nmb = P.svgNombre; delete P.svgTexto; delete P.svgNombre; metSvg(t, nmb); } }, 0);

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
      if (calco && calcoIm && calco.ver !== false) { const [Wi, Hi] = imgDims(), s = sImg(), c0 = aPx([calco.x, calco.y]); g.save(); g.translate(c0[0], c0[1]); g.rotate(-(calco.ang || 0) * Math.PI / 180); g.globalAlpha = calco.op; g.drawImage(calcoIm, -Wi * s * vista.s / 2, -Hi * s * vista.s / 2, Wi * s * vista.s, Hi * s * vista.s); g.restore(); g.globalAlpha = 1; }
      // cuadrícula: 1 mm (si se ve), 10 mm y 50 mm
      const linea2 = (paso, col) => { if (paso * vista.s < 6) return; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); const [mx0, my1] = aMm(lienzo.getBoundingClientRect().left, lienzo.getBoundingClientRect().top), [mx1, my0] = aMm(lienzo.getBoundingClientRect().right, lienzo.getBoundingClientRect().bottom);
        for (let x = Math.floor(mx0 / paso) * paso; x <= mx1; x += paso) { const p = aPx([x, 0])[0]; g.moveTo(Math.round(p) + 0.5, 0); g.lineTo(Math.round(p) + 0.5, H); }
        for (let y = Math.floor(my0 / paso) * paso; y <= my1; y += paso) { const p = aPx([0, y])[1]; g.moveTo(0, Math.round(p) + 0.5); g.lineTo(W, Math.round(p) + 0.5); } g.stroke(); };
      linea2(1, oscuro ? '#141a30' : '#eef0f6'); linea2(10, oscuro ? '#1f2745' : '#dde1ec'); linea2(50, oscuro ? '#2d3863' : '#c3c9da');
      const o = aPx([0, 0]); g.lineWidth = 1.5; g.strokeStyle = P.modo === 'revolucion' ? '#ff4d6d' : 'rgba(255,77,109,.6)'; g.beginPath(); g.moveTo(o[0], 0); g.lineTo(o[0], H); g.stroke(); g.strokeStyle = 'rgba(61,220,132,.6)'; g.beginPath(); g.moveTo(0, o[1]); g.lineTo(W, o[1]); g.stroke();
      if (P.modo === 'revolucion') { g.fillStyle = '#ff4d6d'; g.font = '600 12px system-ui'; g.fillText('↻ eje de giro', o[0] + 6, 16); }
      // v20.2 · las GUÍAS: el contorno de la cara (o del plano) sobre el que dibujas
      if (P.guias && P.guias.length) { g.save(); g.setLineDash([7, 5]); g.lineWidth = 2; g.strokeStyle = '#f5a524'; g.fillStyle = 'rgba(245,165,36,.07)'; P.guias.forEach(r => { g.beginPath(); r.forEach((q, k) => { const p = aPx(q); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.fill(); g.stroke(); }); g.restore(); }
      // formas
      F.forEach((f, i) => {
        const on = i === sel, ag = f.modo === 'agujero', col = ag ? '255,77,109' : '124,108,255';
        g.lineWidth = on ? 2.4 : 1.6; g.strokeStyle = on ? '#29d3ff' : 'rgb(' + col + ')'; g.fillStyle = 'rgba(' + col + ',' + (ag ? 0.16 : 0.22) + ')';
        if (comparar) { g.fillStyle = 'rgba(0,0,0,0)'; g.lineWidth = 2; g.strokeStyle = on ? '#29d3ff' : ag ? '#ff3b6b' : '#ffd23f'; } // v20.4: solo la raya, para ver la foto debajo y comparar
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
      pintaFoto();
      if (linea) { // líneas clic a clic
        g.strokeStyle = '#29d3ff'; g.lineWidth = 2; g.beginPath(); linea.forEach((q, k) => { const p = aPx(q); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); const c = aPx(raton); g.lineTo(c[0], c[1]); g.stroke();
        const u = linea[linea.length - 1], L = Math.hypot(raton[0] - u[0], raton[1] - u[1]), A = Math.atan2(raton[1] - u[1], raton[0] - u[0]) * 180 / Math.PI; etiqueta(c[0] + 12, c[1] - 12, n1(L) + ' mm · ' + Math.round(A) + '°');
        const p0 = aPx(linea[0]); if (linea.length > 2 && Math.hypot(c[0] - p0[0], c[1] - p0[1]) < 12) { g.strokeStyle = '#ffd23f'; g.beginPath(); g.arc(p0[0], p0[1], 9, 0, 7); g.stroke(); }
      }
    }
    // ---------- v20.4 · la FOTO: de sus píxeles a mm del boceto y al revés (con su giro) ----------
    function imgDims() { const I = calco && FM.IMAGENES.get(calco.img); return I ? [I.w, I.h] : [calcoIm ? calcoIm.naturalWidth : 1, calcoIm ? calcoIm.naturalHeight : 1]; }
    const sImg = () => calco.w / imgDims()[0]; // mm por píxel de la foto
    function imgAMm(u, v) { const [W, H] = imgDims(), s = sImg(), x = (u - W / 2) * s, y = -(v - H / 2) * s, a = (calco.ang || 0) * Math.PI / 180; return [calco.x + x * Math.cos(a) - y * Math.sin(a), calco.y + x * Math.sin(a) + y * Math.cos(a)]; }
    function mmAImg(q) { const [W, H] = imgDims(), s = sImg(), a = -(calco.ang || 0) * Math.PI / 180, dx = q[0] - calco.x, dy = q[1] - calco.y, x = dx * Math.cos(a) - dy * Math.sin(a), y = dx * Math.sin(a) + dy * Math.cos(a); return [x / s + W / 2, -y / s + H / 2]; }
    const enFoto = q => { if (!calco || calco.ver === false) return false; const [W, H] = imgDims(), p = mmAImg(q); return p[0] >= 0 && p[1] >= 0 && p[0] <= W && p[1] <= H; };
    const cal = () => (calco && calco.refs && calco.refs.length ? FM.calibra(calco.refs) : null);
    function aplicaCalibra() { const C = cal(); if (!C) return; calco.w = Math.round(C.mmPorPx * imgDims()[0] * 1000) / 1000; calco.cal = { mmPorPx: C.mmPorPx, errMax: C.errMax, n: C.n }; }
    function pintaFoto() { // las referencias, los puntos que se están marcando y lo que se mide
      if (!calco) return; g.save(); g.lineWidth = 2;
      (calco.refs || []).forEach((r, i) => { const a = aPx(imgAMm(...r.a)), b = aPx(imgAMm(...r.b)); g.strokeStyle = '#3ddc84'; g.setLineDash([]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); [a, b].forEach(p => { g.fillStyle = '#3ddc84'; g.beginPath(); g.arc(p[0], p[1], 4, 0, 7); g.fill(); }); etiqueta((a[0] + b[0]) / 2 + 6, (a[1] + b[1]) / 2 - 8, 'Ref ' + (i + 1) + ': ' + n1(r.mm) + ' mm'); });
      if (modoF) { g.strokeStyle = '#ffd23f'; g.fillStyle = '#ffd23f'; g.setLineDash([5, 4]); const L = ptsF.map(aPx);
        L.forEach((p, i) => { g.beginPath(); g.arc(p[0], p[1], 5, 0, 7); g.fill(); if (modoF === 'persp') etiqueta(p[0] + 7, p[1] - 7, ['1 arriba-izq', '2 arriba-der', '3 abajo-der', '4 abajo-izq'][i]); });
        if (L.length > 1) { g.beginPath(); L.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (modoF === 'persp' && L.length === 4) g.closePath(); g.stroke(); }
        const M = medidaF(); if (M) etiqueta(L[L.length - 1][0] + 10, L[L.length - 1][1] + 14, M.t); }
      g.restore();
    }
    function medidaF() { // lo que miden los puntos marcados con 🔍
      if (modoF !== 'medir' || ptsF.length < 2) return null; const [a, b, c] = ptsF;
      if (ptsF.length === 2) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), A = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; return { d, A, t: n1(d) + ' mm · ' + Math.round(A * 10) / 10 + '°' }; }
      const C = FM.circulo([a, b, c]), ang = (() => { const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]]; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)))) * 180 / Math.PI; })();
      return { D: C ? 2 * C.r : null, ang, t: (C ? 'Ø ' + n1(2 * C.r) + ' mm (por 3 puntos)' : '') + ' · ángulo en el 2.º: ' + Math.round(ang * 10) / 10 + '°' };
    }
    // contorno de la foto → la pieza en mm (el más grande y sus agujeros)
    function piezaDeFoto() { if (!calcoIm) throw new Error('La foto aún se está cargando.'); const C = FM.contornos(FM.pixeles(calcoIm)); const pz = FM.pieza(C.anillos, q => imgAMm(q[0], q[1]), 1); if (!pz) throw new Error('No encuentro la pieza: ponla sobre un fondo liso que contraste (papel blanco) y que no toque el borde de la foto.'); return pz; }
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
    const ptrs = new Map(); let gesto = null, arrastre = null, toque2 = null; // v20.4: toque con dos dedos (sin moverlos) = deshacer
    lienzo.addEventListener('pointerdown', e => {
      lienzo.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, tipo: e.pointerType });
      if (e.pointerType === 'pen' && !penVisto) { penVisto = true; mount(quien, '✏️ Apple Pencil'); quien.classList.add('lapiz'); toast('✏️ Lápiz detectado: dibuja con el lápiz y mueve la vista con dos dedos. Tu mano no pinta.', 'ok', 6000); if (herr === 'sel' || herr === 'rect') ponHerr('lapiz'); }
      else if (e.pointerType === 'touch' && !penVisto) mount(quien, '👆 Dedo'); else if (e.pointerType === 'mouse') mount(quien, '🖱️ Ratón');
      const dedos = [...ptrs.values()].filter(p => p.tipo === 'touch');
      if (dedos.length >= 2 || e.button === 1 || e.button === 2 || (e.pointerType === 'touch' && penVisto)) { enCurso = null; gesto = { ini: [...ptrs.values()].map(p => [p.x, p.y]), vista: Object.assign({}, vista) }; if (dedos.length === 2) toque2 = { t0: Date.now(), ini: dedos.map(p => [p.x, p.y]) }; return; }
      if (ptrs.size > 1) return;
      const q0 = aMm(e.clientX, e.clientY), q = herr === 'lapiz' ? q0 : iman(q0);
      if (modoF && calco) { // v20.4: marcar puntos en la foto
        if (modoF === 'medir' && ptsF.length >= 3) ptsF = [];
        if ((modoF === 'calibra' && ptsF.length >= 2) || (modoF === 'persp' && ptsF.length >= 4)) return;
        ptsF.push(q0);
        if (modoF === 'calibra' && ptsF.length === 2) calPend = { a: mmAImg(ptsF[0]), b: mmAImg(ptsF[1]), mm: Math.round(Math.hypot(ptsF[1][0] - ptsF[0][0], ptsF[1][1] - ptsF[0][1]) * 10) / 10 };
        pinta(); pintaPanel(); if (modoF === 'calibra' && ptsF.length === 2) setTimeout(() => { const i = panel.querySelector('[data-k="calmm"]'); if (i) { i.focus(); i.select(); } }, 30); return; }
      if (herr === 'sel') { sel = cual(q0); pintaPanel(); if (sel >= 0) { guardaAtras(); arrastre = { q: q, f: JSON.parse(JSON.stringify(F[sel])) }; } else if (calco && !calco.bloq && enFoto(q0)) arrastreImg = { q: q0, x: calco.x, y: calco.y }; pinta(); return; }
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
      if (arrastreImg) { calco.x = r2(arrastreImg.x + q0[0] - arrastreImg.q[0]); calco.y = r2(arrastreImg.y + q0[1] - arrastreImg.q[1]); pinta(); return; }
      if (arrastre && sel >= 0) { const dx = raton[0] - arrastre.q[0], dy = raton[1] - arrastre.q[1], f = F[sel], o = arrastre.f; if (o.pts) f.pts = o.pts.map(p => [r2(p[0] + dx), r2(p[1] + dy)].concat(p.length > 2 ? [p[2]] : [])); if ('x' in o) { f.x = r2(o.x + dx); f.y = r2(o.y + dy); } pinta(); return; }
      if (enCurso && enCurso.t === 'mano') { const L = enCurso.pts, u = L[L.length - 1]; if (Math.hypot(raton[0] - u[0], raton[1] - u[1]) * vista.s > 2) { const pr = e.pressure > 0 && e.pointerType === 'pen' ? e.pressure : 0.5; L.push([r2(raton[0]), r2(raton[1]), r2(0.8 + pr * 3.2)]); } pinta(); return; }
      if (enCurso) { Object.assign(enCurso, nueva(enCurso.herr, enCurso.q0, raton)); pinta(); return; }
      if (linea) pinta();
    });
    const suelta = e => {
      const yo = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
      if (toque2 && yo) { const movio = toque2.ini.every(q => Math.hypot(q[0] - yo.x, q[1] - yo.y) > 12); if (movio || Date.now() - toque2.t0 > 400) toque2 = null; }
      if (gesto) { if (!ptrs.size) { gesto = null; if (toque2) { toque2 = null; deshacer(); toast('↶ Deshecho (toque con dos dedos)', '', 1400); } } else gesto = { ini: [...ptrs.values()].map(p => [p.x, p.y]), vista: Object.assign({}, vista) }; return; }
      if (arrastreImg) { arrastreImg = null; pintaPanel(); return; }
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
      if (e.key === 'Escape' && modoF) { modoF = null; ptsF = []; calPend = null; pinta(); pintaPanel(); return; }
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
        if (f.t !== 'trazo') out.push(campoN(f, 'desfase', 'Desfase del contorno (+ hacia fuera, − hacia dentro)', -50, 50, 0.2, 'mm')); // v20.2
        out.push(h('div.row.wrap.r8b-acc', btn(f.modo === 'agujero' ? 'Hacerlo sólido' : 'Hacerlo agujero', () => { guardaAtras(); f.modo = f.modo === 'agujero' ? 'suma' : 'agujero'; pinta(); pintaPanel(); }, { cls: 'sm' }), btn('Duplicar', () => { guardaAtras(); const n = JSON.parse(JSON.stringify(f)); if ('x' in n) n.x = r2(n.x + 5); if (n.pts) n.pts = n.pts.map(p => [p[0] + 5, p[1] - 5].concat(p.length > 2 ? [p[2]] : [])); F.push(n); sel = F.length - 1; pinta(); pintaPanel(); }, { cls: 'sm' }), btn('Borrar', borraSel, { cls: 'sm ghost' })));
      } else out.push(h('div.r8b-tit', h('b', 'Nada elegido')), h('p.small.muted', F.length ? 'Toca una forma (con 👆) para ver y escribir sus medidas.' : 'Elige una herramienta a la izquierda y dibuja. Con el lápiz del iPad, dibuja a mano: los círculos y rectángulos salen perfectos solos.'));
      if (calco) out.push(panelFoto());
      if (delSvg().length) { const B = cajaSvg(), st = { w: r2(B.w), h: r2(B.h), ang: 0, x: r2(B.cx), y: r2(B.cy) };
        const campo = (k, t, u = 'mm', paso = 0.1) => h('label.r8b-f', h('span', t), h('span.r8b-n', h('input.inp', { type: 'number', step: paso, value: st[k], 'data-svg': k, onfocus: () => guardaAtras(), onchange: e => { const v = Number(String(e.target.value).replace(',', '.')); if (!isFinite(v)) return; const B2 = cajaSvg();
          if (k === 'w' && v > 0) { const s = v / B2.w; transSvg((x, y, B) => [B.cx + (x - B.cx) * s, B.cy + (y - B.cy) * s]); }
          if (k === 'h' && v > 0) { const s = v / B2.h; transSvg((x, y, B) => [B.cx + (x - B.cx) * s, B.cy + (y - B.cy) * s]); }
          if (k === 'ang' && v) { const a = v * Math.PI / 180; transSvg((x, y, B) => [B.cx + (x - B.cx) * Math.cos(a) - (y - B.cy) * Math.sin(a), B.cy + (x - B.cx) * Math.sin(a) + (y - B.cy) * Math.cos(a)]); }
          if (k === 'x') transSvg((x, y, B) => [x + v - B.cx, y]); if (k === 'y') transSvg((x, y, B) => [x, y + v - B.cy]);
          pintaPanel(); } }), h('i', u)));
        out.push(h('div.r8b-calco.r8b-svgp', h('div.r8b-tit', h('b', '📐 SVG · ' + (infoSvg ? infoSvg.nombre : 'importado')), h('small.muted', delSvg().length + ' formas')),
          h('div.r8b-dos', campo('w', 'Ancho (mantiene la proporción)'), campo('h', 'Alto (mantiene la proporción)')), h('div.r8b-dos', campo('x', 'Centro X'), campo('y', 'Centro Y')), campo('ang', 'Girar (cada vez que escribes)', '°', 1),
          infoSvg && infoSvg.avisos.length ? h('p.small.r8e-mal', '⚠️ ' + infoSvg.avisos.join(' · ')) : null,
          h('p.small.muted', 'Los contornos de DENTRO son agujeros (rojo). Luego: ⬆️ Extruir para hacerlo sólido, o en el Estudio «➖ Cortar» para usarlo de corte (también sobre una cara plana: «Dibujar un boceto encima»). Sobre superficies curvas todavía no se puede proyectar.'),
          h('div.row.wrap', btn('Fijar (dejar de moverlas juntas)', () => { delSvg().forEach(f => { f.svg = 2; }); infoSvg = null; pintaPanel(); }, { cls: 'sm ghost' }), btn('Quitar el SVG', () => { guardaAtras(); for (let i = F.length - 1; i >= 0; i--) if (F[i].svg === 1) F.splice(i, 1); infoSvg = null; sel = -1; pinta(); pintaPanel(); }, { cls: 'sm ghost' })))); }
      // v20.2 · dibujando SOBRE UNA CARA: usar su contorno, y si suma o corta (y hacia dónde)
      if (P.guias && P.guias.length) out.push(h('div.r8b-cara', h('b', '▱ Dibujas sobre ' + (P.enCara === 'plano' ? 'un plano' : 'una cara')),
        btn('📐 Usar el contorno de la cara', () => { guardaAtras(); const A = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return Math.abs(s / 2); }; const L = P.guias.slice().sort((a, b) => A(b) - A(a)); L.forEach((r, i) => F.push({ t: 'linea', pts: r.map(q => [r2(q[0]), r2(q[1])]), modo: i === 0 ? 'suma' : 'agujero' })); sel = F.length - 1; pinta(); pintaPanel(); }, { cls: 'sm r8b-usarcara' }),
        P.enCara ? h('div.r8b-opsg', [['unir', '➕ Unir'], ['cortar', '➖ Cortar'], ['nuevo', '🧩 Nuevo componente']].map(([k, t]) => h('button.r8b-op' + ((P.op || 'unir') === k ? '.on' : ''), { type: 'button', 'data-cop': k, onclick: () => { P.op = k; if (k === 'cortar' && !P.dir) P.dir = 'dentro'; pintaPanel(); } }, h('b', t)))) : null,
        P.enCara ? h('div.r8b-opsg', [['fuera', '⬆ Hacia fuera'], ['dentro', '⬇ Hacia dentro']].map(([k, t]) => h('button.r8b-op' + ((P.dir || 'fuera') === k ? '.on' : ''), { type: 'button', 'data-dir': k, onclick: () => { P.dir = k; pintaPanel(); } }, h('b', t)))) : null));
      // ¿qué hago con el boceto?
      const op = (k, t, d) => h('button.r8b-op' + (P.modo === k ? '.on' : ''), { type: 'button', 'data-op': k, onclick: () => { P.modo = k; pinta(); pintaPanel(); } }, h('b', t), h('small', d));
      const pn = (k, t, min, max, paso, u) => campoN(P, k, t, min, max, paso, u);
      out.push(h('div.r8b-ops', h('b', '¿Qué hago con el boceto?'), h('div.r8b-opsg', op('extruir', '⬆️ Extruir', 'Darle altura'), op('revolucion', '↻ Girar', 'Alrededor del eje rojo'), op('inflar', '🎈 Inflar', 'Como un globo')),
        P.modo === 'extruir' ? [pn('alto', 'Altura', 0.1, 500, 0.5, 'mm'), pn('desmoldeo', 'Tamaño arriba (100 = recto)', 0, 300, 1, '%'), pn('giro', 'Retorcer al subir', -1080, 1080, 5, '°'), pn('redondeo', 'Redondear esquinas del dibujo', 0, 50, 0.5, 'mm')] : null,
        P.modo === 'revolucion' ? [pn('angulo', 'Cuánto gira', 1, 360, 5, '°'), h('small.muted', 'Dibuja el perfil a la DERECHA de la línea roja (como medio jarrón). Al girarlo sale la pieza entera.')] : null,
        P.modo === 'inflar' ? [pn('alto', 'Lo gordo que sale', 1, 120, 0.5, 'mm'), pn('base', 'Borde plano de abajo', 0, 10, 0.2, 'mm'), h('label.check.small', h('input', { type: 'checkbox', checked: !!P.doble, onchange: e => { P.doble = e.target.checked; } }), 'Inflado por los dos lados (figura de peluche)'), h('small.muted', 'Perfecto para dibujos hechos con el lápiz: cortadores, colgantes, figuritas.')] : null));
      mount(panel, out);
    }
    // ---------- v20.4 · EL PANEL DE LA FOTO ----------
    function modoFoto(k) { modoF = modoF === k ? null : k; ptsF = []; calPend = null; if (modoF) pista.textContent = { calibra: 'Toca las DOS puntas de algo que sepas lo que mide (una regla, el borde de la pieza…).', persp: 'Toca las 4 esquinas de algo rectangular que sepas lo que mide: arriba-izquierda, arriba-derecha, abajo-derecha y abajo-izquierda.', medir: '2 puntos: distancia y ángulo · 3 puntos: el diámetro del círculo que pasa por ellos.' }[k]; pinta(); pintaPanel(); }
    function panelFoto() {
      const [W, H] = imgDims(), C = cal(), b = (k, t, f, o = {}) => h('button.r8b-op' + (o.on ? '.on' : ''), { type: 'button', 'data-foto': k, onclick: f }, h('b', t), o.d ? h('small', o.d) : null);
      const bloq = !!calco.bloq, alto = calco.w * H / W;
      const fila = [h('div.r8b-tit', h('b', '🖼️ Foto para calcar'), h('small.muted', n1(calco.w) + ' × ' + n1(alto) + ' mm')),
        h('div.r8b-opsg', b('ver', calco.ver === false ? '🙈 Oculta' : '👁 Se ve', () => { calco.ver = calco.ver === false; pinta(); pintaPanel(); }, { on: calco.ver !== false }), b('bloq', bloq ? '🔒 Bloqueada' : '🔓 Se mueve', () => { calco.bloq = !bloq; pintaPanel(); }, { on: bloq }), b('comparar', comparar ? '✏️ Comparando' : '✏️ Comparar', () => { comparar = !comparar; pinta(); pintaPanel(); }, { on: comparar, d: 'Tu dibujo solo en raya' }))];
      if (!bloq) fila.push(h('div.r8b-dos', campoN(calco, 'w', 'Ancho (mantiene la proporción)', 1, 5000, 0.1), campoN(calco, 'ang', 'Girar', -360, 360, 0.5, '°')), h('div.r8b-dos', campoN(calco, 'x', 'X', -2000, 2000), campoN(calco, 'y', 'Y', -2000, 2000)));
      fila.push(campoN(calco, 'op', 'Se ve al', 0.05, 1, 0.05, ''));
      // calibrar
      fila.push(h('div.r8b-sub', h('b', '📏 Calibrar con medidas reales'),
        C ? h('p.small', h('b', '1 px = ' + (Math.round(C.mmPorPx * 1000) / 1000).toLocaleString('es-ES') + ' mm'), ' · ', C.n + ' referencia' + (C.n === 1 ? '' : 's') + (C.n > 1 ? ' · error ' + (Math.round(C.errMax * 100) / 100).toLocaleString('es-ES') + ' %' : '') + ' · una foto no puede medir mejor que ±' + n1(Math.max(0.01, C.incertidumbre)) + ' mm aquí') : h('p.small.r8e-mal', 'Sin calibrar: el tamaño de la foto es A OJO.'),
        C ? h('p.small' + (C.errMax > 2 ? '.r8e-mal' : '.muted'), C.aviso) : null,
        (calco.refs || []).map((r, i) => { const px = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]), medido = C ? C.mmPorPx * px : null; return h('div.r8b-ref', h('span', 'Ref ' + (i + 1) + ': ' + n1(r.mm) + ' mm' + (medido != null && C.n > 1 ? ' (con la escala sale ' + n1(medido) + ' · ' + (C.errores[i] >= 0 ? '+' : '') + (Math.round(C.errores[i] * 100) / 100).toLocaleString('es-ES') + ' %)' : '')), btn('✕', () => { calco.refs.splice(i, 1); aplicaCalibra(); pinta(); pintaPanel(); }, { cls: 'sm ghost', title: 'Quitar esta referencia' })); }),
        calPend ? h('div.r8b-dos', h('label.r8b-f', h('span', 'Lo que mide DE VERDAD'), h('span.r8b-n', h('input.inp', { type: 'number', min: 0.1, step: 0.1, value: calPend.mm, 'data-k': 'calmm', oninput: e => { calPend.mm = Number(String(e.target.value).replace(',', '.')); }, onkeydown: e => { if (e.key === 'Enter') guardaRef(); } }), h('i', 'mm'))), btn('✓ Guardar referencia', guardaRef, { cls: 'sm primary r8b-guardaref' })) : null,
        h('div.r8b-opsg', b('calibra', modoF === 'calibra' ? '… toca 2 puntos' : (calco.refs || []).length ? '➕ Otra referencia' : '📏 Marcar una medida', () => modoFoto('calibra'), { on: modoF === 'calibra' }), (calco.refs || []).length ? b('recal', '🔄 Volver a calibrar', () => { calco.refs = []; delete calco.cal; pinta(); pintaPanel(); }) : null)));
      // enderezar
      fila.push(h('div.r8b-sub', h('b', '⬚ Enderezar (foto en perspectiva)'), h('small.muted', 'Si la foto está hecha de lado: marca las 4 esquinas de algo rectangular de medida conocida (una hoja A4 = 297 × 210, papel milimetrado, una tarjeta = 85,6 × 54).'),
        b('persp', modoF === 'persp' ? '… toca 4 esquinas (' + ptsF.length + '/4)' : '⬚ Marcar 4 esquinas', () => modoFoto('persp'), { on: modoF === 'persp' }),
        modoF === 'persp' && ptsF.length === 4 ? h('div', h('div.r8b-dos', campoN(calco, 'rectW', 'Ancho real', 1, 2000, 0.1), campoN(calco, 'rectH', 'Alto real', 1, 2000, 0.1)), btn('⬚ Enderezar la foto', enderezar, { cls: 'sm primary r8b-endereza' })) : null));
      // medir, contorno y leer la pieza
      const M = medidaF();
      fila.push(h('div.r8b-sub', h('b', '🔍 Medir en la foto'), b('medir', modoF === 'medir' ? '… toca 2 o 3 puntos' : '🔍 Medir', () => modoFoto('medir'), { on: modoF === 'medir', d: '2 = distancia y ángulo · 3 = diámetro' }), M ? h('p.r8b-medida', h('b', M.t)) : null));
      fila.push(h('div.r8b-sub', h('b', '✨ De la foto al dibujo'), h('small.muted', 'La pieza sobre un fondo liso que contraste (papel blanco), de frente y sin sombras fuertes.'),
        h('div.r8b-opsg', b('contorno', '✨ Sacar el contorno', sacaContorno, { d: 'Silueta y agujeros, en mm' }), b('engranaje', '⚙️ ¿Engranaje?', () => leer('engranaje'), { d: 'Dientes y módulo' }), b('acople', '🔗 ¿Acoplamiento?', () => leer('acople'), { d: 'Garras y medidas' })),
        lectura ? tarjetaLectura() : null));
      fila.push(h('p.tiny.muted', 'Una foto NUNCA da una medida exacta (perspectiva, lente, resolución). Para piezas que encajan: comprueba con el calibre y haz antes una probeta pequeña.'));
      fila.push(btn('Quitar la foto', () => { calco = null; delete P.calco; modoF = null; lectura = null; pinta(); pintaPanel(); }, { cls: 'sm ghost' }));
      return h('div.r8b-calco', fila);
    }
    function guardaRef() { if (!calPend || !(calPend.mm > 0)) return toast('Escribe lo que mide de verdad (mm).', 'warn'); calco.refs = (calco.refs || []).concat([{ a: calPend.a.map(r2), b: calPend.b.map(r2), mm: calPend.mm }]); aplicaCalibra(); calPend = null; ptsF = []; modoF = null; const C = cal(); toast('📏 Calibrada: 1 px = ' + (Math.round(C.mmPorPx * 1000) / 1000).toLocaleString('es-ES') + ' mm' + (C.n > 1 ? ' · error entre referencias ' + (Math.round(C.errMax * 100) / 100).toLocaleString('es-ES') + ' %' : ''), C.errMax > 2 ? 'warn' : 'ok', 6000); pinta(); pintaPanel(); }
    function enderezar() {
      try { if (!calcoIm) throw new Error('La foto aún se está cargando.'); const quad = ptsF.map(mmAImg), E = FM.endereza(calcoIm, quad, Number(calco.rectW), Number(calco.rectH)), c0 = imgAMm(...quad.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]));
        calco.img = E.id; calco.w = Math.round(E.mmPorPx * E.w * 1000) / 1000; calco.ang = 0; calco.refs = [{ a: [E.cuadro[0], E.cuadro[1]], b: [E.cuadro[2], E.cuadro[1]], mm: Number(calco.rectW) }, { a: [E.cuadro[0], E.cuadro[1]], b: [E.cuadro[0], E.cuadro[3]], mm: Number(calco.rectH) }];
        // el rectángulo conocido queda donde estaba
        const cx = (E.cuadro[0] + E.cuadro[2]) / 2, cy = (E.cuadro[1] + E.cuadro[3]) / 2; calco.x = r2(c0[0] - (cx - E.w / 2) * E.mmPorPx); calco.y = r2(c0[1] + (cy - E.h / 2) * E.mmPorPx);
        modoF = null; ptsF = []; lectura = null; cargaCalco(); pintaPanel(); toast('⬚ Foto enderezada y calibrada con tu rectángulo (' + n1(calco.rectW) + ' × ' + n1(calco.rectH) + ' mm). Lo que esté a otra altura que el rectángulo puede salir algo distinto.', 'ok', 8000);
      } catch (e) { toast(e.message || String(e), 'bad'); }
    }
    function sacaContorno() {
      try { const pz = piezaDeFoto(); guardaAtras(); const r = L => L.map(q => [r2(q[0]), r2(q[1])]);
        F.push({ t: 'linea', pts: r(pz.fuera), suave: true, modo: 'suma' }); pz.agujeros.forEach(a => F.push({ t: 'linea', pts: r(a), suave: true, modo: 'agujero' })); sel = F.length - 1 - pz.agujeros.length; comparar = true; pinta(); pintaPanel();
        toast('✨ Contorno sacado: la pieza y ' + pz.agujeros.length + ' agujero' + (pz.agujeros.length === 1 ? '' : 's') + ' (' + n1(pz.area) + ' mm²). Compáralo con la foto y retócalo si hace falta.' + (cal() ? '' : ' OJO: la foto no está calibrada.'), 'ok', 8000);
      } catch (e) { toast(e.message || String(e), 'bad', 8000); }
    }
    function leer(tipo) {
      try { if (!cal()) toast('Calibra antes la foto: si no, las medidas salen a ojo.', 'warn', 6000); const pz = piezaDeFoto(); lectura = tipo === 'engranaje' ? FM.leeEngranaje(pz) : FM.leeAcople(pz); lectura.grosor = lectura.grosor || 8; lectura.largo = lectura.largo || 20; pintaPanel(); }
      catch (e) { toast(e.message || String(e), 'bad', 8000); }
    }
    function tarjetaLectura() {
      const L = lectura; if (L.error) return h('p.r8e-nota.r8e-mal', '⚠️ ' + L.error);
      const crear = L.tipo === 'engranaje'
        ? () => cerrar({ crear: { k: 'engranaje', nombre: 'Engranaje ' + L.z + ' dientes (de la foto)', p: { z: L.z, m: L.m, grosor: Number(L.grosor) || 8, eje: L.agujero ? Math.round(L.agujero.d * 10) / 10 : 0, buje: false } } })
        : () => cerrar({ crear: { k: 'acopleGarras', nombre: 'Acoplamiento de ' + L.garras + ' garras (de la foto)', p: { garras: L.garras, D: Math.round(L.D * 10) / 10, eje1: L.agujero ? Math.round(L.agujero.d * 10) / 10 : 5, eje2: L.agujero ? Math.round(L.agujero.d * 10) / 10 : 5, ancho: Math.round(L.anchoGarra), largo: Number(L.largo) || 20 } } });
      return h('div.r8b-lectura', h('b', L.tipo === 'engranaje' ? '⚙️ Su código' : '🔗 Lo que mide'), h('p', h('b', L.texto)),
        L.tipo === 'engranaje' ? h('p.small', 'Confianza ' + L.confianza + ' · módulo medido ' + (Math.round(L.mMedido * 1000) / 1000).toLocaleString('es-ES') + (L.otra ? ' · lo siguiente más parecido: ' + (L.otra.dp ? L.otra.dp + ' DP' : 'módulo ' + n1(L.otra.m)) : '')) : null,
        L.agujero && L.agujero.redondo === false ? h('p.small.r8e-mal', 'El agujero no es redondo: puede llevar plano (eje en D) o chavetero. Ajústalo luego en la pieza.') : null,
        h('p.small.muted', L.nota), campoN(L, L.tipo === 'engranaje' ? 'grosor' : 'largo', L.tipo === 'engranaje' ? 'Grosor (mídelo con el calibre)' : 'Largo de cada mitad (mídelo)', 1, 200, 0.5),
        btn(L.tipo === 'engranaje' ? '⚙️ Crear este engranaje' : '🔗 Crear este acoplamiento', crear, { cls: 'primary r8b-crear' }));
    }
    function terminar() {
      if (linea) cierraLinea();
      if (!F.some(f => f.modo !== 'agujero')) { toast('Dibuja al menos una forma sólida (las de color morado).', 'warn'); return; }
      F.forEach(f => { delete f.svg; }); // (la marca «svg» solo sirve mientras se edita)
      if (calco) P.calco = calco; else delete P.calco; // v20.4: la foto se queda con el boceto (para volver a calcar o comparar)
      cerrar(P);
    }
    function cerrar(r) { if (ro) ro.disconnect(); raiz.remove(); if (window.__r8b && window.__r8b.raiz === raiz) delete window.__r8b; resolver(r); }
    window.__r8b = { raiz, aPx: q => aPx(q), imgAMm: (u, v) => imgAMm(u, v), get calco() { return calco; }, F, P, get lectura() { return lectura; } }; // (para las pruebas automáticas)
    ponHerr(herr); pintaPanel();
  });
}
