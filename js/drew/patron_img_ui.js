// ================= 👗 CelebriDREW · 📐 PATRÓN DESDE UNA IMAGEN — el panel de la ventana «Desde una imagen» (18-10-2026) =================
// Si la imagen que se elige es un PATRÓN (piezas dibujadas en papel blanco), la ventana lo dice sola y enseña: cada pieza con su nombre encima
// de la imagen (tocándola se cambia qué es), la ESCALA (la del avatar o «sé cuánto mide algo»: dos toques y sus cm), las MEDIDAS que salen y
// cuánto se PARECE la prenda rediseñada, pieza a pieza; «Crear la prenda con este patrón» la abre en el 3D y el 2D. La lógica, sin pantalla,
// está en drew/foto/patron_img.js (test/unit/drew_patron_img.mjs).
import { h, btn } from '../ui.js';
import * as PI from './foto/patron_img.js';
import * as BL from './bloques/index.js';

const COLOR = { delantero: '#c25d74', espalda: '#3a7bd5', cuerpo: '#c25d74', manga: '#19aa6e', falda: '#e0902e', pernera: '#7a55c8', capucha: '#00a3b4', tira: '#7d6b5a', bolsillo: '#a08b3c', otra: '#888888' };
const NOMBRE_ROL = { delantero: 'Delantero', espalda: 'Espalda' };
const cm = v => (v / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });
// ¿es un PATRÓN? (rápido: la imagen reducida a 1400 px como mucho) → el estado del panel, o null
export function detecta(img, o = {}) {
  const k = Math.min(1, 1400 / Math.max(img.w, img.h)), w = Math.round(img.w * k), hh = Math.round(img.h * k);
  let d = img.d; if (k < 1) { d = new Uint8ClampedArray(w * hh * 4); for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { const i = (Math.min(img.h - 1, Math.floor(y / k)) * img.w + Math.min(img.w - 1, Math.floor(x / k))) * 4, j = (y * w + x) * 4; d[j] = img.d[i]; d[j + 1] = img.d[i + 1]; d[j + 2] = img.d[i + 2]; d[j + 3] = img.d[i + 3]; } }
  // (un patrón es casi todo PAPEL: blanco o muy claro y sin color; una foto de una prenda o de una persona, no)
  let claro = 0; for (let i = 0; i < w * hh; i++) { const r = d[4 * i], g = d[4 * i + 1], b = d[4 * i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx > 200 && mx - mn < 40) claro++; }
  if (claro / (w * hh) < 0.55) return null;
  const R = PI.piezasDeImagen({ w, h: hh, d }); if (R.modo !== 'lineas' || R.piezas.length < 2) return null;
  const pat = { img: { w, h: hh, d }, k, R, tipos: {}, escala: { modo: 'avatar', puntos: [], cm: null }, sel: null, af: null, estado: 'midiendo', progreso: 0 };
  calcula(pat, o); return pat.P && pat.P.k ? pat : null;
}
// lo que sale con los tipos y la escala de ahora (sin afinar)
export function calcula(pat, o = {}) {
  const piezas = pat.R.piezas.map((p, i) => Object.assign({}, p, pat.tipos[i] ? { tipo: pat.tipos[i] } : {}));
  let mmPorPx = null; const E = pat.escala;
  if (E.modo === 'tuya' && E.puntos.length === 2 && E.cm > 0) { const [a, b] = E.puntos; mmPorPx = E.cm * 10 / Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])); }
  let P = PI.prendaDe(piezas, { mmPorPx });
  if (P.k && !mmPorPx && o.cuerpo) { const M = o.cuerpo(P.k); if (M) P = PI.prendaDe(piezas, { pechoPrenda: M.pecho, caderaPrenda: M.cadera }); }
  pat.P = P; pat.piezas = piezas; pat.af = null; pat.estado = P.k && P.mmPorPx ? 'midiendo' : 'falta'; return P;
}
// AFINAR por tandas (para que la pantalla no se quede quieta): → pat.af
export async function afina(pat, cada) {
  const P = pat.P; if (!P || !P.k || !P.mmPorPx) return null; const yo = pat.ronda = (pat.ronda || 0) + 1;
  await new Promise(r => setTimeout(r, 20)); if (pat.ronda !== yo) return null;
  // (por pasos: cada tamaño de paso es una tanda; entre una y otra, la pantalla respira y se ve el avance)
  let base = P, af = null; const pasos = [0.08, 0.04, 0.02, 0.01];
  for (let i = 0; i < pasos.length; i++) { af = PI.afina(Object.assign({}, base, af ? { medidas: af.medidas } : {}), pat.piezas, { pasos: [pasos[i]] }); pat.progreso = (i + 1) / pasos.length; if (cada) cada(); await new Promise(r => setTimeout(r, 15)); if (pat.ronda !== yo) return null; }
  pat.af = af; pat.estado = 'listo'; return af;
}
// lo que va a la prenda (para «crear»): { k, opciones, medidas: { k: { v, origen, … } }, nombre, dePatron }
export function aProyecto(pat) {
  const P = pat.P, M = (pat.af && pat.af.medidas) || PI.aPlantilla(P, BL.BLOQUES).medidas, medidas = {};
  Object.entries(M).forEach(([k, v]) => { medidas[k] = { v, origen: 'usuario', estado: 'observado', confianza: 0.95, patron: true, como: 'medida en la imagen del patrón' + (pat.af ? ' (afinada: su pieza calca la de la imagen)' : '') }; });
  return { k: P.k, opciones: Object.assign({}, P.opciones), medidas, nombre: BL.BLOQUES[P.k].t + ' del patrón',
    dePatron: { fecha: new Date().toISOString(), k: P.k, escala: P.escala, mmPorPx: P.mmPorPx, parecido: pat.af ? pat.af.parecido : null, porPieza: pat.af ? pat.af.porPieza : [], piezas: P.piezas.map(x => x.rol || x.tipo), avisos: P.avisos } };
}
// tocar la imagen (coordenadas de la imagen GRANDE): elegir pieza o poner un punto de la regla → true si ha hecho algo
export function toca(pat, x, y) {
  const X = x * pat.k, Y = y * pat.k;
  if (pat.escala.modo === 'tuya' && pat.escala.puntos.length < 2) { pat.escala.puntos.push([X, Y]); return true; }
  const dentro = (P, px, py) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xa, ya] = P[j], [xb, yb] = P[i]; if ((ya > py) !== (yb > py) && px < xa + (py - ya) / (yb - ya) * (xb - xa)) c = !c; } return c; };
  const i = pat.R.piezas.findIndex(p => dentro(p.poly, X, Y)); pat.sel = i >= 0 ? i : null; return true;
}
// encima de la imagen: cada pieza con su color y su nombre, la elegida más gruesa y la regla
export function dibuja(g, pat, W, H) {
  const s = W / pat.img.w, lw = Math.max(2, W / 400), fs = Math.max(13, Math.round(W / 60));
  pat.P.piezas.forEach((x, i) => { const p = pat.R.piezas[i], t = x.rol || x.tipo, col = COLOR[t] || '#888';
    g.save(); g.beginPath(); p.poly.forEach(([a, b], j) => (j ? g.lineTo(a * s, b * s) : g.moveTo(a * s, b * s))); g.closePath(); g.fillStyle = col + (pat.sel === i ? '33' : '1a'); g.fill(); g.lineWidth = pat.sel === i ? lw * 2.2 : lw; g.strokeStyle = col; g.stroke();
    const c = p.caja, cx = (c[0] + c[2]) / 2 * s, cy = (c[1] + c[3]) / 2 * s, txt = (NOMBRE_ROL[x.rol] || PI.TIPOS[x.tipo] || x.tipo).replace(/ \(.*\)$/, '') + (x.tuyo ? ' ✋' : '');
    g.font = '700 ' + fs + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const wt = g.measureText(txt).width + fs;
    g.fillStyle = 'rgba(255,255,255,0.93)'; g.fillRect(cx - wt / 2, cy - fs * 0.8, wt, fs * 1.6); g.fillStyle = col; g.fillText(txt, cx, cy); g.restore(); });
  const Pt = pat.escala.puntos; if (pat.escala.modo === 'tuya' && Pt.length) { g.save(); g.strokeStyle = '#111'; g.fillStyle = '#ffd400'; g.lineWidth = lw * 1.5;
    if (Pt.length === 2) { g.beginPath(); g.moveTo(Pt[0][0] * s, Pt[0][1] * s); g.lineTo(Pt[1][0] * s, Pt[1][1] * s); g.stroke(); }
    Pt.forEach(([a, b]) => { g.beginPath(); g.arc(a * s, b * s, lw * 4, 0, 7); g.fill(); g.stroke(); }); g.restore(); }
}
// el panel del lado
export function panel(pat, o) {
  const P = pat.P, af = pat.af, E = pat.escala, D = P.k ? BL.BLOQUES[P.k] : null, cuenta = {};
  P.piezas.forEach(x => { const t = NOMBRE_ROL[x.rol] || (PI.TIPOS[x.tipo] || x.tipo).replace(/ \(.*\)$/, ''); cuenta[t] = (cuenta[t] || 0) + 1; });
  const sel = pat.sel != null ? P.piezas[pat.sel] : null, M = af ? af.medidas : P.medidas || {};
  return h('div.dw-pat',
    h('h4', '📐 Es un PATRÓN' + (D ? ': ' + D.t.toLowerCase() : '')), h('div.dw-ayuda', 'He encontrado ' + P.piezas.length + ' piezas: ' + Object.entries(cuenta).map(([t, n]) => n + ' ' + t.toLowerCase()).join(', ') + '. Toca una pieza de la imagen si su nombre no es el bueno.'),
    sel ? h('div.dw-pat-g', h('b', 'Esta pieza es…'), h('div.dw-chips', Object.entries(PI.TIPOS).filter(([k]) => k !== 'cuerpo').map(([k, t]) => h('button.dw-chip' + ((sel.rol || sel.tipo) === k ? '.on' : ''), { type: 'button', 'data-pat-tipo': k, onclick: () => o.ponTipo(pat.sel, k) }, t.replace(/ \(.*\)$/, ''))))) : null,
    h('div.dw-pat-g', h('b', 'Tamaño'), h('div.dw-chips',
      h('button.dw-chip' + (E.modo === 'avatar' ? '.on' : ''), { type: 'button', 'data-pat-escala': 'avatar', onclick: () => o.escala('avatar') }, '🧍 A la talla de mi avatar'),
      h('button.dw-chip' + (E.modo === 'tuya' ? '.on' : ''), { type: 'button', 'data-pat-escala': 'tuya', onclick: () => o.escala('tuya') }, '📏 Sé cuánto mide algo')),
      E.modo === 'tuya' ? h('div.dw-ayuda', E.puntos.length < 2 ? 'Toca en la imagen los DOS extremos de algo que sepas cuánto mide (' + (2 - E.puntos.length) + ' más).' : h('span', 'Esa raya mide ', h('input.dw-pat-cm', { type: 'number', min: 1, step: 0.1, value: E.cm || '', placeholder: 'cm', 'aria-label': 'Lo que mide la raya en cm', onchange: e => o.cm(Number(String(e.target.value).replace(',', '.'))) }), ' cm ', h('a', { href: '#', onclick: e => { e.preventDefault(); o.otraRaya(); } }, 'otra raya')))
        : h('small.dw-ayuda', P.mmPorPx ? 'Supuesto: el pecho' + (P.k === 'falda' || P.k === 'pantalon' ? ' (la cadera)' : '') + ' de la prenda en tu avatar. Si sabes lo que mide algo de la imagen, mejor «📏».' : '')),
    !P.mmPorPx ? h('div.dw-ayuda.dw-ojo', (P.avisos || []).join(' ') || 'Falta saber el tamaño.')
      : h('div.dw-pat-g', h('b', af ? '✔ Rediseñada: se parece un ' + Math.round(af.parecido * 100) + ' %' : '⏳ Rediseñándola para que calque la imagen… ' + Math.round((pat.progreso || 0) * 100) + ' %'),
        af ? h('div.dw-ayuda', af.porPieza.map(q => q.t + ' ' + Math.round(q.v * 100) + ' %').join(' · ')) : null,
        D ? h('ul.dw-prod-med', D.medidas.filter(m => M[m.k] != null && (P.medidas[m.k] != null || af)).map(m => h('li', { 'data-medida': m.k }, m.t.replace(/ \(.*\)$/, '') + ': ', h('b', cm(M[m.k]) + ' cm')))) : null,
        (P.avisos || []).slice(0, 2).map(a => h('div.dw-ayuda.dw-ojo', a))),
    btn('👗 Crear la prenda con este patrón', o.crear, { cls: 'primary dw-pat-crear', disabled: !P.k || !P.mmPorPx, title: 'Una prenda nueva en el 3D y el 2D, con las medidas de este patrón (y editable)' }),
    h('small.dw-ayuda', 'Sirve una foto o un escaneo del papel (de frente, con el papel entero y con luz) o un dibujo de internet. Lo que mejor sale: piezas con su línea entera, sin solaparse.'));
}
