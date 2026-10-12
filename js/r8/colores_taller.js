// ================= v30.6 · 🎨 TALLER DE COLORES Y PAUSAS (sobre la pieza, no en un dibujito aparte) =================
// El encargo de la dueña (11-10-2026): «the current color-pause functionality is confusing because users cannot clearly understand
// where a printing pause will be placed on the model… never create an immutable pause marker… assign red to layers 10–20, blue to
// 21–35… the 3D model must be the primary source of visual feedback».
//  · CENTRO: la pieza en 3D, cortada DE VERDAD en franjas de color (cada franja es su trozo de sólido), con la capa elegida
//    iluminada y cada pausa marcada en su altura con una etiqueta que se puede ARRASTRAR arriba y abajo.
//  · IZQUIERDA: la regla de capas (nº de capa, altura de capa, altura Z, total, anterior/siguiente, deslizador y números) y el
//    rango «desde… hasta…»; o las herramientas de pintar CARAS (solo para verlo: con una bobina cada vez, lo que se imprime de
//    verdad son los colores por capas).
//  · DERECHA: la paleta (con colores propios), «pintar las capas elegidas», y la LISTA de pausas: nº, capa, Z, color, tipo,
//    activa o no; se mueven, se cambian, se duplican y se borran. Todo lo que se toca cambia la configuración de verdad.
//  · ABAJO: la tira de capas (de la cama a la punta) con sus colores, el perfil de la pieza y el corte de la capa elegida.
// Lo que se guarda (en las respuestas del asistente o en el proyecto del Estudio): est = { base, cambios: [{ id, z, color, tipo,
// activa, gcode }], caras }. «z» es la altura (mm) donde EMPIEZA la capa del cambio: si luego cambias la altura de capa, la
// pausa sigue a la misma altura de la pieza. Es compatible con lo de antes (z y color).
import { h, mount, btn, toast } from '../ui.js';
import * as N from './nucleo.js';
import { crearEscena } from './escena3d.js';
import { COLORES as PALETA, capaDe } from './colores_capas.js';

export const TIPOS = { color: ['🎨', 'Cambio de color', 'La impresora se para, cambias la bobina por la del color nuevo y sigue'], pausa: ['⏸', 'Pausa', 'Se para para que metas algo (un imán, una tuerca) y sigue con el mismo color'],
  filamento: ['🧵', 'Cambio de bobina', 'Se para para poner otra bobina del MISMO color (se acaba la que hay)'], gcode: ['⌨', 'Orden propia', 'Una orden de tu impresora (G-code) en esa capa: solo si sabes cuál'] };
const r3 = x => Math.round(x * 1000) / 1000, f2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nuevoId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const nombreColor = c => (PALETA.find(x => x[0].toLowerCase() === String(c || '').toLowerCase()) || [0, String(c || '').toUpperCase()])[1];

// ---------- LAS CUENTAS DE CAPAS (puras: se prueban sin pantalla) ----------
export const zTecho = (k, capa, primera = 0.2) => (k <= 0 ? 0 : r3(primera + (k - 1) * capa)); // dónde acaba la capa k
export const zSuelo = (k, capa, primera = 0.2) => zTecho(k - 1, capa, primera); // dónde empieza (= donde se para la impresora antes de hacerla)
export const totalCapas = (alto, capa, primera = 0.2) => Math.max(1, 1 + Math.ceil((alto - primera) / capa - 1e-6));
export const capaDeZ = (z, capa, primera = 0.2) => capaDe(z, capa, primera).capa;
export const capaEnAltura = (z, capa, primera = 0.2) => (z <= primera ? 1 : 1 + Math.ceil((z - primera) / capa - 1e-9)); // la capa que CONTIENE esa altura
// los cambios, ordenados y con su capa
export function eventos(est, capa, primera = 0.2) {
  return (est.cambios || []).map(c => { const k = capaDeZ(c.z, capa, primera); return { ref: c, id: c.id, capa: k, z: zSuelo(k, capa, primera), color: c.color, tipo: c.tipo || 'color', activa: c.activa !== false, gcode: c.gcode || '' }; }).sort((a, b) => a.capa - b.capa || (a.tipo === 'color' ? 1 : -1));
}
// el color de cada capa (C[1]…C[n]): el de la base y, desde cada cambio de color ACTIVO, el suyo
export function coloresPorCapa(est, n, capa, primera = 0.2, baseDef = '#f4f4f0') {
  const C = new Array(n + 1), ev = eventos(est, capa, primera).filter(e => e.activa && e.tipo === 'color'); let col = est.base || baseDef, i = 0;
  for (let k = 1; k <= n; k++) { while (i < ev.length && ev[i].capa <= k) { col = ev[i].color; i++; } C[k] = col; }
  return C;
}
// PINTAR de un color las capas a…b: se rehacen los cambios de color; las pausas sin color y lo desactivado se respetan
export function pintaCapas(est, a, b, color, n, capa, primera = 0.2, baseDef = '#f4f4f0') {
  const C = coloresPorCapa(est, n, capa, primera, baseDef), k0 = Math.max(1, Math.min(a, b)), k1 = Math.min(n, Math.max(a, b)); for (let k = k0; k <= k1; k++) C[k] = color;
  const viejos = eventos(est, capa, primera), otros = viejos.filter(e => e.tipo !== 'color' || !e.activa).map(e => e.ref), nuevos = [];
  for (let k = 2; k <= n; k++) if (C[k].toLowerCase() !== C[k - 1].toLowerCase()) { const v = viejos.find(e => e.tipo === 'color' && e.activa && e.capa === k); nuevos.push({ id: v ? v.id : nuevoId(), z: zSuelo(k, capa, primera), color: C[k], tipo: 'color', activa: true }); }
  est.base = C[1]; est.cambios = nuevos.concat(otros).sort((x, y) => x.z - y.z); return est;
}
// mover un cambio a otra capa (lo que hay entre medias toma el color que corresponde)
export function mueveEvento(est, id, k, n, capa, primera = 0.2) { const c = (est.cambios || []).find(x => x.id === id); if (!c) return false; k = Math.max(2, Math.min(n, Math.round(k))); c.z = zSuelo(k, capa, primera); est.cambios.sort((x, y) => x.z - y.z); return true; }
// ¿está bien para exportar? errores (no se exporta) y avisos (se exporta, pero míralo)
export function valida(est, n, capa, primera = 0.2) {
  const E = eventos(est, capa, primera), errores = [], avisos = [], vistas = new Map();
  E.forEach((e, i) => { const t = 'Nº ' + (i + 1) + ' (capa ' + e.capa + ')';
    if (e.capa < 2) errores.push(t + ': no se puede parar antes de la primera capa.');
    if (e.capa > n) errores.push(t + ': está por encima de la pieza (tiene ' + n + ' capas).');
    if (e.tipo === 'gcode' && e.activa) { if (!e.gcode.trim()) errores.push(t + ': la orden propia está vacía.'); else if (/[^\x20-\x7e\n\r\t]/.test(e.gcode)) errores.push(t + ': la orden lleva letras raras (solo letras y números normales).'); }
    if (e.activa) { if (vistas.has(e.capa)) avisos.push(t + ': hay dos paradas en la misma capa (la impresora se parará una sola vez).'); vistas.set(e.capa, 1); } });
  const col = E.filter(e => e.activa && e.tipo === 'color'); let ant = est.base || '';
  col.forEach(e => { if (String(e.color).toLowerCase() === String(ant).toLowerCase()) avisos.push('Capa ' + e.capa + ': cambia al mismo color que ya había.'); ant = e.color; });
  if (E.filter(e => e.activa).length > 20) avisos.push('Son ' + E.filter(e => e.activa).length + ' paradas: vas a estar mucho rato delante de la impresora.');
  return { ok: !errores.length, errores, avisos, paradas: E.filter(e => e.activa).length };
}
// resumen: cuántas capas y cuántos mm de cada color
export function resumen(est, n, capa, primera = 0.2, baseDef) { const C = coloresPorCapa(est, n, capa, primera, baseDef), M = new Map(); for (let k = 1; k <= n; k++) { const o = M.get(C[k]) || { color: C[k], capas: 0, mm: 0 }; o.capas++; o.mm += k === 1 ? primera : capa; M.set(C[k], o); } return [...M.values()]; }

// ---------- v30.6.3 · 🪄 DE LO PINTADO (caras) A COLORES POR CAPAS, cuando se puede ----------
// La dueña pinta lo natural: los cuadraditos del QR en negro, las letras de un color… y esperaba que se imprimiera así (12-10-2026).
// Con una bobina cada vez solo se puede cambiar de color por capas; pero en una pieza «de relieve» lo pintado y las capas son lo
// mismo: cada MESETA (cara plana que mira hacia arriba, a una altura) es el techo de una franja de capas. El color de cada franja es
// el más pintado en la meseta de su techo; la meseta sin pintar se queda del color de la pieza. Si a una misma altura hay dos colores
// pintados, no se puede (uno al lado del otro necesita un AMS): se elige el que más hay y SE DICE.
// s = sopa (9 números por triángulo, Z arriba) · triCol[t] = 0 sin pintar | i+1 → cols[i] · devuelve { ok, C, base, cambios, mezcla, … }
export function capasDeCaras(s, triCol, cols, n, capa, primera = 0.2, propio = '#f4f4f0') {
  const nT = s.length / 9; let z0 = Infinity; for (let i = 2; i < s.length; i += 3) if (s[i] < z0) z0 = s[i];
  const mes = new Map(); let aPint = 0, aPlano = 0, total = 0;
  for (let t = 0; t < nT; t++) {
    const p = t * 9, ux = s[p + 3] - s[p], uy = s[p + 4] - s[p + 1], uz = s[p + 5] - s[p + 2], vx = s[p + 6] - s[p], vy = s[p + 7] - s[p + 1], vz = s[p + 8] - s[p + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz), a = L / 2; if (!(a > 1e-9)) continue;
    const c = triCol[t]; if (c) aPint += a;
    if (nz / L < 0.985) continue; // solo las caras que miran arriba (hasta unos 10° de inclinación)
    const z = Math.round(((s[p + 2] + s[p + 5] + s[p + 8]) / 3 - z0) * 100) / 100; if (z < primera * 0.5) continue;
    let m = mes.get(z); if (!m) { m = { z, a: 0, por: new Map() }; mes.set(z, m); } m.a += a; total += a; if (c) { m.por.set(c, (m.por.get(c) || 0) + a); aPlano += a; }
  }
  if (!(aPint > 0)) return { ok: false, motivo: 'Todavía no hay ninguna cara pintada.' };
  // mesetas a menos de media capa = la misma; las muy pequeñas sin pintar no cuentan
  const J = []; [...mes.values()].sort((x, y) => x.z - y.z).forEach(m => { const u = J[J.length - 1]; if (u && m.z - u.z < capa * 0.5) { u.a += m.a; u.z = m.z; m.por.forEach((v, k) => u.por.set(k, (u.por.get(k) || 0) + v)); } else J.push({ z: m.z, a: m.a, por: new Map(m.por) }); });
  const mezcla = [], P = J.filter(m => m.por.size || m.a > total * 0.003).map(m => { const L = [...m.por.entries()].sort((x, y) => y[1] - x[1]), pint = L.reduce((x, q) => x + q[1], 0); let color = null;
    if (L.length && pint >= m.a * 0.35) { color = cols[L[0][0] - 1] || null; if (L[1] && L[1][1] >= pint * 0.25) mezcla.push({ z: m.z, capa: capaEnAltura(m.z - 1e-6, capa, primera), colores: L.slice(0, 3).map(q => cols[q[0] - 1]) }); }
    return { z: m.z, color, a: m.a }; });
  if (!P.some(m => m.color)) return { ok: false, motivo: aPlano < aPint * 0.4 ? 'Lo pintado está en paredes o caras inclinadas, no en caras planas que miren hacia arriba: eso no se puede copiar por capas (haría falta un AMS).' : 'Lo pintado ocupa muy poco de cada cara: pinta la cara entera (con «▱ Una cara plana» o «◔ Una zona lisa») y prueba otra vez.', mezcla };
  // de abajo arriba: cada capa toma el color de la meseta que le hace de techo
  const C = new Array(n + 1); let i = 0;
  for (let k = 1; k <= n; k++) { const zt = zTecho(k, capa, primera); while (i < P.length - 1 && P[i].z < zt - capa * 0.5) i++; C[k] = P[i].z >= zt - capa * 0.5 ? (P[i].color || propio) : (C[k - 1] || propio); }
  const cambios = []; for (let k = 2; k <= n; k++) if (String(C[k]).toLowerCase() !== String(C[k - 1]).toLowerCase()) cambios.push({ capa: k, z: zSuelo(k, capa, primera), color: C[k] });
  return { ok: true, C, base: C[1], cambios, mezcla, mesetas: P, enPlano: aPlano / aPint };
}

// ---------- CARAS PINTADAS (solo para verlo): un número de color por triángulo, guardado comprimido ----------
const aRle = A => { const o = []; let i = 0; while (i < A.length) { let j = i; while (j < A.length && A[j] === A[i]) j++; o.push(A[i], j - i); i = j; } return o; };
const deRle = (R, n) => { const A = new Uint8Array(n); let i = 0; for (let q = 0; q + 1 < R.length && i < n; q += 2) { A.fill(R[q], i, Math.min(n, i + R[q + 1])); i += R[q + 1]; } return A; };
// vecinos de cada triángulo (por las aristas que comparten) y su normal
function topologia(s) {
  const nT = s.length / 9, mapa = new Map(), id = new Uint32Array(nT * 3), q = 1e3; let nv = 0;
  for (let i = 0; i < nT * 3; i++) { const k = Math.round(s[i * 3] * q) + ',' + Math.round(s[i * 3 + 1] * q) + ',' + Math.round(s[i * 3 + 2] * q); let v = mapa.get(k); if (v === undefined) { v = nv++; mapa.set(k, v); } id[i] = v; }
  const E = new Map(), vec = new Int32Array(nT * 3).fill(-1), nor = new Float32Array(nT * 3);
  for (let t = 0; t < nT; t++) { const p = t * 9, ux = s[p + 3] - s[p], uy = s[p + 4] - s[p + 1], uz = s[p + 5] - s[p + 2], vx = s[p + 6] - s[p], vy = s[p + 7] - s[p + 1], vz = s[p + 8] - s[p + 2]; let x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx; const l = Math.hypot(x, y, z) || 1; nor[t * 3] = x / l; nor[t * 3 + 1] = y / l; nor[t * 3 + 2] = z / l;
    for (let k = 0; k < 3; k++) { const a = id[t * 3 + k], b = id[t * 3 + (k + 1) % 3], key = a < b ? a * 4294967296 + b : b * 4294967296 + a, o = E.get(key); if (o === undefined) E.set(key, t * 3 + k); else { vec[t * 3 + k] = Math.floor(o / 3); vec[o] = t; } } }
  return { nT, vec, nor };
}
// la región que sale de un triángulo cruzando aristas mientras el ángulo entre caras no pase de «grados» (0,5° = una cara plana; 180° = todo el cuerpo)
function region(T, t0, grados) { const cos = Math.cos(grados * Math.PI / 180), visto = new Uint8Array(T.nT), pila = [t0], out = []; visto[t0] = 1;
  while (pila.length) { const t = pila.pop(); out.push(t); for (let k = 0; k < 3; k++) { const v = T.vec[t * 3 + k]; if (v < 0 || visto[v]) continue; const d = T.nor[t * 3] * T.nor[v * 3] + T.nor[t * 3 + 1] * T.nor[v * 3 + 1] + T.nor[t * 3 + 2] * T.nor[v * 3 + 2]; if (d >= cos - 1e-6) { visto[v] = 1; pila.push(v); } } }
  return out; }
const rgb = hex => { const x = parseInt(String(hex).replace('#', ''), 16) || 0; return [((x >> 16) & 255) / 255, ((x >> 8) & 255) / 255, (x & 255) / 255].map(v => Math.pow(v, 2.2)); };

// ---------- LA VENTANA ----------
// o = { sopa (Float32Array), nombre, est (se cambia al guardar), capa, primera, colorBase, prop (alturas propuestas), impresora, alGuardar }
export function abrirColores(o) {
  return new Promise(resolve => {
    const capa = o.capa > 0.04 && o.capa < 0.6 ? o.capa : 0.2, primera = o.primera || 0.2, baseDef = o.colorBase || '#f4f4f0';
    // la pieza, apoyada en z = 0 y centrada
    const s = new Float32Array(o.sopa); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < s.length; i += 3) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); z0 = Math.min(z0, s[i + 2]); z1 = Math.max(z1, s[i + 2]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; for (let i = 0; i < s.length; i += 3) { s[i] -= cx; s[i + 1] -= cy; s[i + 2] -= z0; }
    const alto = z1 - z0, ancho = x1 - x0, fondo = y1 - y0, n = totalCapas(alto, capa, primera), nT = s.length / 9;
    let M = null, rota = ''; try { M = N.guarda(N.deSopa(s)); } catch (e) { rota = e.message || String(e); } N.limpia();
    const E = JSON.parse(JSON.stringify({ base: o.est.base || baseDef, cambios: (o.est.cambios || []).map(c => Object.assign({ id: nuevoId(), tipo: 'color', activa: true }, c)), caras: o.est.caras || null, propio: o.est.propio || o.est.base || baseDef })); // (propio = el color de la pieza antes de pasar lo pintado a capas)
    let pal = (() => { try { return JSON.parse(localStorage.getItem('cd.r8.paleta') || '[]'); } catch (e) { return []; } })();
    let sel = { a: Math.min(n, Math.max(2, Math.round(n / 2))), b: Math.min(n, Math.max(2, Math.round(n / 2))) }, color = '#1b1b1f', modo = 'capas', herr = 'cara', grados = 25, radio = 4, selId = null, escena = null, vivo = true;
    const hist = [JSON.stringify(E)]; let hi = 0;
    // caras pintadas
    let TOPO = null, triCol = new Uint8Array(nT), triSel = new Uint8Array(nT), colCaras = E.caras && E.caras.colores ? E.caras.colores.slice() : [];
    if (E.caras && E.caras.tris === nT && E.caras.rle) triCol = deRle(E.caras.rle, nT); else if (E.caras && E.caras.tris) { E.caras = null; colCaras = []; setTimeout(() => toast('La pieza ha cambiado desde que pintaste sus caras: esa pintura ya no vale (las capas y las pausas, sí).', 'warn', 8000), 600); }
    const apunta = () => { E.caras = triCol.some(v => v) ? { tris: nT, colores: colCaras, rle: aRle(triCol) } : null; hist.length = hi + 1; hist.push(JSON.stringify(E)); hi = hist.length - 1; if (hist.length > 80) { hist.shift(); hi--; } todo(); };
    const vuelve = d => { const k = hi + d; if (k < 0 || k >= hist.length) return; hi = k; const X = JSON.parse(hist[hi]); E.base = X.base; E.cambios = X.cambios; E.caras = X.caras; colCaras = X.caras ? X.caras.colores.slice() : []; triCol = X.caras ? deRle(X.caras.rle, nT) : new Uint8Array(nT); if (selId && !E.cambios.some(c => c.id === selId)) selId = null; todo(); };

    // ---- la ventana ----
    const lienzo = h('canvas.ct-cv'), etiquetas = h('div.ct-etis'), izq = h('div.ct-izq'), der = h('div.ct-der'), abajo = h('div.ct-abajo'), cabeza = h('div.ct-cab'), regla = h('div.ct-regla'), cubo = h('div.ct-cubo'), caja = h('div.ct-caja');
    // v30.6.2 · si SOLO se han pintado caras (sin colores por capas), al guardar se dice claro: eso no cambia nada al imprimir
    const avisoC = h('div.ct-aviso-c', { hidden: true, 'data-ct': 'aviso-caras' });
    const soloCaras = () => triCol.some(v => v) && !eventos(E, capa, primera).some(e => e.activa);
    const avisaCaras = () => { avisoC.hidden = false; mount(avisoC, h('b', '🖌️ Solo has pintado CARAS'), h('p', 'Se guarda para VERLO, pero al imprimir no cambia nada: con una bobina cada vez la impresora solo puede cambiar de color por CAPAS (de abajo arriba). Tal como está, sale de un color y NO se para.'),
      h('div.ct-aviso-b', h('button.btn.primary', { type: 'button', 'data-ct': 'convertir-aviso', onclick: () => convierte() }, '🪄 Pasarlo a colores por capas'), h('button.btn', { type: 'button', 'data-ct': 'ir-capas', onclick: () => { avisoC.hidden = true; modo = 'capas'; todo(); } }, '🧱 Pintar las capas yo'), h('button.btn', { type: 'button', 'data-ct': 'guardar-asi', onclick: () => cerrar(true) }, 'Guardar así, solo para verlo'))); };
    const fondoV = h('div.ct-fondo', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Colores y pausas' }, h('div.ct', cabeza, h('div.ct-medio', izq, h('div.ct-vista', lienzo, etiquetas, caja, regla, cubo, avisoC), der), abajo));
    document.body.append(fondoV);
    const cerrar = guardar => { if (!vivo) return; vivo = false; document.removeEventListener('keydown', tecla, true); window.removeEventListener('pointerup', alSoltar); window.removeEventListener('resize', alCambiarTam);
      if (guardar) { o.est.base = E.base; o.est.cambios = E.cambios.map(c => { const x = { id: c.id, z: c.z, color: c.color }; if (c.tipo && c.tipo !== 'color') x.tipo = c.tipo; if (c.activa === false) x.activa = false; if (c.gcode) x.gcode = c.gcode; return x; }); if (E.caras) o.est.caras = E.caras; else delete o.est.caras; if (E.propio) o.est.propio = E.propio; o.alGuardar && o.alGuardar(o.est); }
      try { escena && escena.destruir(); } catch (e) { } if (M) N.suelta(M); fondoV.remove(); window.__r8ct = null; resolve(guardar ? o.est : null); };
    try { escena = crearEscena(lienzo, { cama: Math.max(120, Math.ceil(Math.max(ancho, fondo) * 1.5 / 10) * 10), dia: document.documentElement.getAttribute('data-modo') === 'dia' }); try { escena.cuboVistas(cubo, 84); } catch (e) { } } catch (e) { toast('Este aparato no deja ver en 3D: ' + (e.message || e), 'bad'); cerrar(false); return; }

    // ---- pintar la pieza: franjas de color de verdad + la capa elegida + las pausas ----
    let tic = 0; const pide3d = () => { clearTimeout(tic); tic = setTimeout(pinta3d, 40); };
    function vistaCaras(C) { // la malla con un color por triángulo (lo pintado; lo demás, el color de su capa; lo elegido, amarillo)
      const nor = new Float32Array(s.length), idx = new Uint32Array(nT * 3), col = new Float32Array(s.length), T = TOPO || (TOPO = topologia(s)), cols = colCaras.map(rgb), am = rgb('#ffe14a'), cache = new Map();
      for (let t = 0; t < nT; t++) { let c; if (triSel[t]) c = am; else if (triCol[t]) c = cols[triCol[t] - 1] || am; else { const zc = (s[t * 9 + 2] + s[t * 9 + 5] + s[t * 9 + 8]) / 3, hx = C[Math.max(1, Math.min(n, capaEnAltura(zc, capa, primera)))]; c = cache.get(hx); if (!c) { c = rgb(hx); cache.set(hx, c); } }
        for (let k = 0; k < 3; k++) { const i = t * 9 + k * 3; nor[i] = T.nor[t * 3]; nor[i + 1] = T.nor[t * 3 + 1]; nor[i + 2] = T.nor[t * 3 + 2]; col[i] = c[0]; col[i + 1] = c[1]; col[i + 2] = c[2]; idx[t * 3 + k] = t * 3 + k; } }
      return { pos: s, nor, idx, col, cruda: true };
    }
    function pinta3d() {
      if (!vivo) return; const C = coloresPorCapa(E, n, capa, primera, baseDef), partes = [];
      try {
        if (modo === 'caras' || !M) partes.push({ id: 'pieza', vista: vistaCaras(C), color: E.base, acabado: 'mate' });
        N.enAmbito(() => {
          if (M && modo !== 'caras') { let k0 = 1; for (let k = 2; k <= n + 1; k++) if (k > n || C[k] !== C[k0]) { const za = k0 === 1 ? -1 : zSuelo(k0, capa, primera), zb = k > n ? alto + 1 : zSuelo(k, capa, primera), b = M.trimByPlane([0, 0, 1], za).trimByPlane([0, 0, -1], -zb); if (!b.isEmpty()) partes.push({ id: 'f' + k0, vista: N.aVista(b), color: C[k0], acabado: 'mate' }); k0 = k; } }
          if (M && modo === 'capas') { const za = zSuelo(sel.a, capa, primera), zb = zTecho(sel.b, capa, primera), b = M.trimByPlane([0, 0, 1], za).trimByPlane([0, 0, -1], -zb); if (!b.isEmpty()) partes.push({ id: 'sel', vista: N.aVista(b), color: '#ffe14a', resalta: true }); }
          if (M) eventos(E, capa, primera).filter(e => e.capa >= 2 && e.capa <= n).forEach(e => { try { const cs = M.slice(Math.min(alto - 0.01, e.z + 0.02)); if (cs.isEmpty()) return; const g = Math.max(0.5, Math.max(ancho, fondo) * 0.008), aro = cs.offset(g, 'Round').subtract(cs.offset(-g * 0.3, 'Round')).extrude(Math.max(0.24, capa)).translate([0, 0, e.z - Math.max(0.24, capa) / 2]); partes.push({ id: 'aro' + e.id, vista: N.aVista(aro), color: e.id === selId ? '#ff7a1a' : e.activa ? '#ffffff' : '#666a75', acabado: 'mate' }); } catch (x) { } });
        });
      } catch (e) { console.warn('colores: pintar', e); } finally { N.limpia(); }
      escena.ponPartes(partes); pintaEtiquetas();
    }
    // ---- las etiquetas de las pausas, pegadas a su altura (se arrastran) ----
    let etiArr = false; // (mientras se arrastra una, no se rehacen)
    const xEti = () => ancho / 2 + Math.max(4, ancho * 0.12);
    function colocaEtiquetas() { if (!vivo || !escena) return; const L = eventos(E, capa, primera); etiquetas.querySelectorAll('.ct-eti').forEach(el => { const e = L.find(x => x.id === el.dataset.eti); if (!e) return; const p = escena.aPantalla([xEti(), 0, e.z]); el.style.display = p.delante ? '' : 'none'; el.style.left = Math.round(p.x) + 'px'; el.style.top = Math.round(p.y) + 'px'; el.dataset.y = String(Math.round(p.y)); const sp = el.querySelector('span'); if (sp) sp.textContent = 'capa ' + e.capa; });
      // las que caen casi a la misma altura se corren a la derecha, para que no se tapen
      let yAnt = -99, col = 0; [...etiquetas.querySelectorAll('.ct-eti')].filter(el => el.style.display !== 'none').sort((a, b) => Number(b.dataset.y) - Number(a.dataset.y)).forEach(el => { const y = Number(el.dataset.y); col = Math.abs(y - yAnt) < 26 ? col + 1 : 0; yAnt = y; el.style.marginLeft = (col * 104) + 'px'; }); }
    function pintaEtiquetas() {
      if (!vivo || !escena) return; if (etiArr) return colocaEtiquetas(); const L = eventos(E, capa, primera);
      mount(etiquetas, L.map((e, i) => {
        const el = h('button.ct-eti' + (e.id === selId ? '.on' : '') + (e.activa ? '' : '.off'), { type: 'button', 'data-eti': e.id, title: TIPOS[e.tipo][1] + ' · arrástrala arriba o abajo para cambiarla de capa' }, h('i', { style: { background: e.tipo === 'color' ? e.color : 'transparent' } }, e.tipo === 'color' ? '' : TIPOS[e.tipo][0]), h('b', String(i + 1)), h('span', 'capa ' + e.capa));
        el.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); selId = e.id; const y0 = ev.clientY; let movido = false; el.setPointerCapture(ev.pointerId); etiArr = true;
          const mueve = ev2 => { if (Math.abs(ev2.clientY - y0) < 3 && !movido) return; movido = true; const r = lienzo.getBoundingClientRect(), y = ev2.clientY - r.top; let mejor = 2, md = Infinity; for (let k = 2; k <= n; k++) { const d = Math.abs(escena.aPantalla([xEti(), 0, zSuelo(k, capa, primera)]).y - y); if (d < md) { md = d; mejor = k; } } if (mejor !== capaDeZ(e.ref.z, capa, primera)) mueveA(e.id, mejor, true); };
          const fin = () => { el.removeEventListener('pointermove', mueve); el.removeEventListener('pointerup', fin); el.removeEventListener('pointercancel', fin); etiArr = false; if (movido) apunta(); else { sel = { a: e.capa, b: e.capa }; todo(); } };
          el.addEventListener('pointermove', mueve); el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin); });
        return el; }));
      colocaEtiquetas();
    }
    function mueveA(id, k, sinApuntar) { const c = E.cambios.find(x => x.id === id); if (!c) return; mueveEvento(E, id, k, n, capa, primera); sel = { a: capaDeZ(c.z, capa, primera), b: capaDeZ(c.z, capa, primera) }; if (sinApuntar) { pide3d(); pintaDer(); pintaIzq(); pintaAbajo(); } else apunta(); }

    // ---- izquierda: la regla de capas o las herramientas de caras ----
    const numero = (v, min, max, paso, alCambiar, extra) => h('input.inp.ct-num', Object.assign({ type: 'number', min, max, step: paso, value: v, onchange: e => { const x = Number(String(e.target.value).replace(',', '.')); if (isFinite(x)) alCambiar(x); } }, extra || {}));
    const ponSel = (a, b) => { sel = { a: Math.max(1, Math.min(n, Math.round(Math.min(a, b)))), b: Math.max(1, Math.min(n, Math.round(Math.max(a, b)))) }; todo(true); };
    function pintaIzq() {
      const k = sel.b, uno = sel.a === sel.b;
      mount(izq, h('div.ct-modos', [['capas', '🧱 Por capas', 'Lo que se imprime de verdad con una bobina cada vez'], ['caras', '🖌️ Pintar caras', 'Para verlo y enseñarlo: no cambia cómo se imprime']].map(([m, t, tt]) => h('button' + (modo === m ? '.on' : ''), { type: 'button', 'data-modo': m, title: tt, onclick: () => { modo = m; triSel.fill(0); if (m === 'caras' && !TOPO) TOPO = topologia(s); todo(); } }, t))),
        modo === 'capas' ? [
          h('div.ct-capa', h('small', 'CAPA ELEGIDA'), h('div.ct-capa-n', h('b', { 'data-ct': 'capa' }, uno ? String(k) : sel.a + '–' + sel.b), h('span', ' de ' + n)),
            h('div.ct-capa-d', h('span', 'Altura Z ', h('b', { 'data-ct': 'z' }, f2(zSuelo(sel.a, capa, primera)) + (uno ? '' : ' – ' + f2(zTecho(sel.b, capa, primera))) + ' mm')), h('span', 'Altura de capa ', h('b', f2(capa) + ' mm'), ' (la 1.ª, ' + f2(primera) + ')'))),
          h('div.ct-pasos', [['⏮', 1 - k, 'La primera'], ['−10', -10, '10 capas abajo'], ['◀', -1, 'La de abajo (flecha ↓)'], ['▶', 1, 'La de arriba (flecha ↑)'], ['+10', 10, '10 capas arriba'], ['⏭', n - k, 'La última']].map(([t, d, tt]) => h('button', { type: 'button', title: tt, 'data-paso': String(d), onclick: () => ponSel(k + d, k + d) }, t))),
          h('label.ct-campo', h('span', 'Ir a la capa'), numero(k, 1, n, 1, v => ponSel(v, v), { 'data-ct': 'irCapa' })),
          h('label.ct-campo', h('span', 'Ir a la altura'), numero(r3(zSuelo(k, capa, primera)), 0, r3(alto), 0.01, v => { const c = capaEnAltura(v + 1e-6, capa, primera); ponSel(c, c); }, { 'data-ct': 'irZ' }), h('small', 'mm')),
          h('div.ct-rango', h('small', 'VARIAS CAPAS A LA VEZ'), h('div.ct-rango-f', h('span', 'Desde'), numero(sel.a, 1, n, 1, v => ponSel(v, Math.max(v, sel.b)), { 'data-ct': 'desde' }), h('span', 'hasta'), numero(sel.b, 1, n, 1, v => ponSel(Math.min(v, sel.a), v), { 'data-ct': 'hasta' })),
            h('div.ct-rango-b', h('button', { type: 'button', onclick: () => ponSel(k, n) }, 'De aquí hasta arriba'), h('button', { type: 'button', onclick: () => ponSel(1, k) }, 'De aquí hasta abajo'), h('button', { type: 'button', onclick: () => ponSel(1, n) }, 'Todas'))),
          (o.prop || []).length ? h('div.ct-prop', h('small', '💡 DONDE CAMBIA LA FORMA'), (o.prop || []).map(z => { const c = capaEnAltura(z, capa, primera); return h('button', { type: 'button', 'data-prop': String(c), onclick: () => ponSel(c, c) }, 'capa ' + c + ' · ' + f2(z) + ' mm'); })) : null,
          h('p.ct-ayuda', 'Toca la pieza para ir a esa capa. La franja amarilla es lo elegido. Para elegir varias, arrastra en la tira de abajo o escribe «desde… hasta…».')]
        : [h('p.ct-aviso', '🖌️ Pintar caras es para VERLO (enseñarlo a un cliente, planear los colores). Con una bobina cada vez, lo que se imprime de verdad son los colores POR CAPAS.'),
          h('small.ct-tit', 'QUÉ ELIJO AL TOCAR'),
          h('div.ct-herr', [['cara', '▱ Una cara plana'], ['region', '◔ Una zona lisa'], ['pincel', '🖌️ Con el pincel'], ['caja', '⬚ Con un recuadro'], ['cuerpo', '🧊 Todo el trozo']].map(([q, t]) => h('button' + (herr === q ? '.on' : ''), { type: 'button', 'data-herr': q, onclick: () => { herr = q; pintaIzq(); } }, t))),
          herr === 'region' ? h('label.ct-campo', h('span', 'Hasta qué esquina'), h('input', { type: 'range', min: 3, max: 80, step: 1, value: grados, oninput: e => { grados = Number(e.target.value); e.target.nextSibling.textContent = grados + '°'; } }), h('b', grados + '°')) : null,
          herr === 'pincel' ? h('label.ct-campo', h('span', 'Tamaño del pincel'), h('input', { type: 'range', min: 1, max: 25, step: 0.5, value: radio, oninput: e => { radio = Number(e.target.value); e.target.nextSibling.textContent = f2(radio) + ' mm'; } }), h('b', f2(radio) + ' mm')) : null,
          h('div.ct-elegido', h('b', { 'data-ct': 'nsel' }, String(triSel.reduce((a, v) => a + v, 0))), ' triángulos elegidos (en amarillo)'),
          h('div.ct-rango-b', h('button', { type: 'button', 'data-ct': 'limpia', onclick: () => { triSel.fill(0); todo(true); } }, 'Soltar lo elegido (Esc)')),
          h('p.ct-ayuda', 'Toca para elegir (con Mayús, se suma). Luego pulsa «Pintar lo elegido» a la derecha. Con el pincel y el recuadro, arrastra; para girar la pieza, usa el botón derecho.')]);
    }
    // ---- derecha: paleta, pintar y la lista de pausas ----
    function ponColor(c) { color = c; pintaDer(); }
    function pinta() { // pintar lo elegido (capas o caras)
      if (modo === 'capas') { pintaCapas(E, sel.a, sel.b, color, n, capa, primera, baseDef); apunta(); toast('🎨 Capas ' + sel.a + (sel.a === sel.b ? '' : '–' + sel.b) + ' en ' + nombreColor(color).toLowerCase(), 'ok', 1800); }
      else { if (!triSel.some(v => v)) return toast('Toca antes la pieza para elegir qué pintas.', 'warn'); let i = colCaras.findIndex(c => c.toLowerCase() === color.toLowerCase()); if (i < 0) { if (colCaras.length >= 250) return toast('Demasiados colores distintos.', 'warn'); colCaras.push(color); i = colCaras.length - 1; } for (let t = 0; t < nT; t++) if (triSel[t]) triCol[t] = i + 1; triSel.fill(0); apunta(); }
    }
    // 🪄 lo pintado → colores por capas (v30.6.3): se rehacen los cambios de COLOR; las pausas sin color se respetan
    function convierte() {
      const R = capasDeCaras(s, triCol, colCaras, n, capa, primera, E.propio || E.base || baseDef); if (!R.ok) return toast('🪄 ' + R.motivo, 'warn', 10000);
      const viejos = eventos(E, capa, primera), otros = viejos.filter(e => e.tipo !== 'color').map(e => e.ref);
      E.base = R.base; E.cambios = R.cambios.map(c => { const v = viejos.find(e => e.tipo === 'color' && e.capa === c.capa); return { id: v ? v.id : nuevoId(), z: c.z, color: c.color, tipo: 'color', activa: true }; }).concat(otros).sort((x, y) => x.z - y.z);
      avisoC.hidden = true; modo = 'capas'; if (R.cambios.length) { sel = { a: R.cambios[0].capa, b: R.cambios[0].capa }; selId = E.cambios.find(c => (c.tipo || 'color') === 'color').id; } apunta();
      const txt = R.cambios.length ? R.cambios.length + (R.cambios.length === 1 ? ' parada: ' : ' paradas: ') + R.cambios.map(c => 'capa ' + c.capa + ' → ' + nombreColor(c.color).toLowerCase()).join(', ') + '.' : 'Sale todo de un color (' + nombreColor(R.base).toLowerCase() + '): no hace falta ninguna parada.';
      toast('🪄 Pasado a colores por capas. ' + txt + (R.mezcla.length ? ' ⚠️ En la capa ' + R.mezcla.map(m => m.capa).join(', ') + ' habías pintado dos colores a la misma altura: con una bobina solo puede salir uno, he dejado el que más había.' : '') + ' Míralo en la pieza: así es como saldrá.', R.mezcla.length ? 'warn' : 'ok', 12000);
      window.__r8ct && (window.__r8ct.convertido = { cambios: R.cambios, mezcla: R.mezcla, base: R.base });
    }
    function quitaPintura() { if (!triSel.some(v => v)) return toast('Toca antes la pieza para elegir de dónde la quitas.', 'warn'); for (let t = 0; t < nT; t++) if (triSel[t]) triCol[t] = 0; triSel.fill(0); apunta(); }
    function nuevaPausa(tipo) { const k = Math.max(2, sel.a); if (E.cambios.some(c => capaDeZ(c.z, capa, primera) === k && (c.tipo || 'color') === tipo)) return toast('Ya hay una parada de ese tipo en la capa ' + k + '.', 'warn'); const c = { id: nuevoId(), z: zSuelo(k, capa, primera), color: tipo === 'color' ? color : coloresPorCapa(E, n, capa, primera, baseDef)[k], tipo, activa: true }; E.cambios.push(c); E.cambios.sort((x, y) => x.z - y.z); selId = c.id; apunta(); }
    function pintaDer() {
      const L = eventos(E, capa, primera), V = valida(E, n, capa, primera), R = resumen(E, n, capa, primera, baseDef), todos = PALETA.map(x => x[0]).concat(pal.filter(c => !PALETA.some(x => x[0].toLowerCase() === c.toLowerCase())));
      const nCaras = new Map(); if (modo === 'caras') for (let t = 0; t < nT; t++) if (triCol[t]) nCaras.set(triCol[t], (nCaras.get(triCol[t]) || 0) + 1);
      mount(der, h('small.ct-tit', 'COLOR'), h('div.ct-paleta', todos.map(c => h('button.ct-col' + (c.toLowerCase() === color.toLowerCase() ? '.on' : ''), { type: 'button', 'data-col': c, title: nombreColor(c), style: { background: c }, onclick: () => ponColor(c) })),
          h('label.ct-col.ct-otro', { title: 'Otro color (se guarda en tu paleta)' }, '＋', h('input', { type: 'color', value: color, 'data-ct': 'otro', onchange: e => { const c = e.target.value; if (!todos.some(x => x.toLowerCase() === c.toLowerCase())) { pal = pal.concat([c]).slice(-12); try { localStorage.setItem('cd.r8.paleta', JSON.stringify(pal)); } catch (x) { } } ponColor(c); } }))),
        h('div.ct-actual', h('i', { style: { background: color } }), h('b', nombreColor(color)), h('code', color.toUpperCase())),
        modo === 'capas' ? [h('button.btn.primary.ct-pintar', { type: 'button', 'data-ct': 'pintar', onclick: pinta }, '🎨 Pintar ' + (sel.a === sel.b ? 'la capa ' + sel.a : 'las capas ' + sel.a + '–' + sel.b)),
          h('div.ct-mas', h('small', 'PARAR EN LA CAPA ' + Math.max(2, sel.a) + ' SIN CAMBIAR DE COLOR'), h('div.ct-rango-b', ['pausa', 'filamento', 'gcode'].map(t => h('button', { type: 'button', 'data-nueva': t, title: TIPOS[t][2], onclick: () => nuevaPausa(t) }, TIPOS[t][0] + ' ' + TIPOS[t][1]))))]
          : [h('button.btn.primary.ct-pintar', { type: 'button', 'data-ct': 'pintar', onclick: pinta }, '🖌️ Pintar lo elegido'), h('div.ct-rango-b', h('button', { type: 'button', 'data-ct': 'quita', onclick: quitaPintura }, 'Quitar la pintura de lo elegido')),
            triCol.some(v => v) ? h('button.btn.ct-convertir', { type: 'button', 'data-ct': 'convertir', title: 'La impresora cambia de color por capas (de abajo arriba). Esto mira lo que has pintado en las caras planas y lo convierte en esas paradas.', onclick: convierte }, '🪄 Pasarlo a colores POR CAPAS (lo que se imprime)') : null],
        modo === 'caras' ? h('div.ct-lista', h('small.ct-tit', 'CARAS PINTADAS'), colCaras.map((c, i) => nCaras.get(i + 1) ? h('div.ct-res', { 'data-cara': c }, h('i', { style: { background: c } }), h('span', nombreColor(c)), h('b', nCaras.get(i + 1) + ' triángulos'), h('button', { type: 'button', title: 'Elegir todo lo de este color (para cambiarlo o quitarlo)', onclick: () => { for (let t = 0; t < nT; t++) triSel[t] = triCol[t] === i + 1 ? 1 : 0; todo(true); } }, '☝')) : null), nCaras.size ? null : h('p.ct-ayuda', 'Todavía no hay ninguna cara pintada.'))
        : h('div.ct-lista', h('small.ct-tit', 'PARADAS · ' + L.length), L.length ? L.map((e, i) => h('div.ct-pausa' + (e.id === selId ? '.on' : '') + (e.activa ? '' : '.off'), { 'data-pausa': e.id, onclick: ev => { if (ev.target.closest('button,input,select,textarea,label')) return; selId = e.id; sel = { a: e.capa, b: e.capa }; todo(true); } },
          h('div.ct-p1', h('b.ct-pn', String(i + 1)), h('i', { style: { background: e.tipo === 'color' ? e.color : 'transparent' } }, e.tipo === 'color' ? '' : TIPOS[e.tipo][0]), h('span', TIPOS[e.tipo][1] + (e.tipo === 'color' ? ' → ' + nombreColor(e.color).toLowerCase() : '')),
            h('label.ct-act', { title: 'Activa: si la quitas, se guarda pero no se manda a la impresora' }, h('input', { type: 'checkbox', checked: e.activa, 'data-ct': 'activa', onchange: ev => { e.ref.activa = ev.target.checked; apunta(); } }))),
          h('div.ct-p2', h('span', 'Capa'), numero(e.capa, 2, n, 1, v => { selId = e.id; mueveA(e.id, v); }, { 'data-ct': 'pCapa' }), h('span', 'Z'), numero(e.z, 0, r3(alto), 0.01, v => { selId = e.id; mueveA(e.id, Math.max(2, capaEnAltura(v + 1e-6, capa, primera))); }, { 'data-ct': 'pZ' }), h('small', 'mm')),
          h('div.ct-p3', h('button', { type: 'button', title: 'Una capa más abajo', 'data-ct': 'baja', onclick: () => { selId = e.id; mueveA(e.id, e.capa - 1); } }, '▼'), h('button', { type: 'button', title: 'Una capa más arriba', 'data-ct': 'sube', onclick: () => { selId = e.id; mueveA(e.id, e.capa + 1); } }, '▲'),
            h('select.inp', { 'data-ct': 'tipo', title: 'Qué hace la impresora ahí', onchange: ev => { e.ref.tipo = ev.target.value; if (ev.target.value !== 'gcode') delete e.ref.gcode; apunta(); } }, Object.entries(TIPOS).map(([t, v]) => h('option', { value: t, selected: e.tipo === t }, v[0] + ' ' + v[1]))),
            e.tipo === 'color' ? h('button', { type: 'button', title: 'Ponerle el color elegido arriba', 'data-ct': 'recolor', style: { borderColor: color }, onclick: () => { e.ref.color = color; apunta(); } }, '🎨') : null,
            h('button', { type: 'button', title: 'Duplicar (otra igual, 5 capas más arriba)', 'data-ct': 'dup', onclick: () => { const c = Object.assign({}, e.ref, { id: nuevoId(), z: zSuelo(Math.min(n, e.capa + 5), capa, primera) }); E.cambios.push(c); E.cambios.sort((x, y) => x.z - y.z); selId = c.id; apunta(); } }, '⧉'),
            h('button', { type: 'button', title: 'Borrar', 'data-ct': 'borra', onclick: () => { E.cambios = E.cambios.filter(c => c !== e.ref); if (selId === e.id) selId = null; apunta(); } }, '🗑')),
          e.tipo === 'gcode' ? h('textarea.inp.ct-gcode', { rows: 2, placeholder: 'M400 U1 (por ejemplo)', 'data-ct': 'gcode', value: e.gcode, onchange: ev => { e.ref.gcode = ev.target.value; apunta(); } }) : null))
          : h('p.ct-ayuda', 'Sin paradas: sale de un solo color. Elige capas y pulsa «Pintar», o pon una pausa.')),
        h('div.ct-resumen', h('small.ct-tit', 'ASÍ QUEDA'), R.map(x => h('div.ct-res', { 'data-res': x.color }, h('i', { style: { background: x.color } }), h('span', nombreColor(x.color)), h('b', x.capas + ' capas · ' + f2(x.mm) + ' mm'))),
          h('p.ct-ayuda', V.paradas ? '✋ La impresora se parará ' + V.paradas + (V.paradas === 1 ? ' vez' : ' veces') + ': ' + (o.impresora ? 'en tu ' + o.impresora + ' ' : '') + 'cada parada es una PAUSA al empezar esa capa (no hay cambio automático de bobina).' : 'Sin paradas.'),
          V.errores.map(t => h('p.ct-error', '⛔ ' + t)), V.avisos.map(t => h('p.ct-avisito', '⚠️ ' + t))));
    }
    // ---- abajo: la tira de capas (de la cama a la punta) y el corte de la capa elegida ----
    let perfil = null; const tira = h('canvas.ct-tira', { height: 64 }), corte = h('canvas.ct-corte', { width: 150, height: 110 });
    function calculaPerfil() { if (!M) return; try { N.enAmbito(() => { const L = [], pasos = Math.min(160, n); let mx = 1; for (let i = 0; i < pasos; i++) { const z = (i + 0.5) * alto / pasos; let a = 0; try { a = M.slice(z).area(); } catch (e) { } L.push(a); mx = Math.max(mx, a); } perfil = L.map(a => a / mx); }); } finally { N.limpia(); } }
    function pintaAbajo() {
      const C = coloresPorCapa(E, n, capa, primera, baseDef), W = Math.max(300, tira.parentElement ? tira.parentElement.clientWidth - 8 : 800), H = 64; tira.width = W; tira.style.width = W + 'px'; const g = tira.getContext('2d'); g.clearRect(0, 0, W, H);
      const x = k => (k - 1) / n * W;
      for (let k = 1; k <= n; k++) { g.fillStyle = C[k]; g.fillRect(Math.floor(x(k)), 14, Math.ceil(W / n) + 1, H - 14); }
      if (perfil) { g.fillStyle = 'rgba(0,0,0,.34)'; g.beginPath(); g.moveTo(0, H); perfil.forEach((a, i) => g.lineTo((i + 0.5) / perfil.length * W, H - 4 - a * (H - 22))); g.lineTo(W, H); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(255,225,74,.55)'; g.fillRect(x(sel.a), 14, Math.max(2, x(sel.b + 1) - x(sel.a)), H - 14); g.strokeStyle = '#ffe14a'; g.lineWidth = 2; g.strokeRect(x(sel.a) + 1, 15, Math.max(2, x(sel.b + 1) - x(sel.a)) - 2, H - 16);
      eventos(E, capa, primera).forEach((e, i) => { const px = x(e.capa); g.fillStyle = e.id === selId ? '#ff7a1a' : e.activa ? '#fff' : '#777'; g.beginPath(); g.moveTo(px, 13); g.lineTo(px - 6, 1); g.lineTo(px + 6, 1); g.closePath(); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); g.fillStyle = '#000'; g.font = 'bold 8px system-ui'; g.textAlign = 'center'; g.fillText(String(i + 1), px, 9); });
      // el corte de la capa elegida, visto desde arriba, con su color
      const g2 = corte.getContext('2d'); g2.clearRect(0, 0, 150, 110);
      if (M) { try { const zc = Math.min(alto - 0.005, (zSuelo(sel.b, capa, primera) + zTecho(sel.b, capa, primera)) / 2), P = N.enAmbito(() => M.slice(zc).toPolygons()), e = Math.min(140 / Math.max(1, ancho), 100 / Math.max(1, fondo)); g2.fillStyle = C[sel.b]; g2.strokeStyle = 'rgba(128,128,128,.9)'; g2.lineWidth = 1; g2.beginPath(); P.forEach(r => { r.forEach((q, i) => { const px = 75 + q[0] * e, py = 55 - q[1] * e; if (i) g2.lineTo(px, py); else g2.moveTo(px, py); }); g2.closePath(); }); g2.fill('evenodd'); g2.stroke(); } catch (e) { } finally { N.limpia(); } }
      const ct = abajo.querySelector('.ct-corte-t'); if (ct) ct.textContent = 'Capa ' + sel.b + ' desde arriba';
    }
    const capaDeX = ev => { const r = tira.getBoundingClientRect(); return Math.max(1, Math.min(n, 1 + Math.floor((ev.clientX - r.left) / r.width * n))); };
    tira.addEventListener('pointerdown', ev => { const k0 = capaDeX(ev); tira.setPointerCapture(ev.pointerId); sel = ev.shiftKey ? { a: Math.min(sel.a, k0), b: Math.max(sel.a, k0) } : { a: k0, b: k0 }; todo(true); const mueve = e2 => { const k = capaDeX(e2); sel = { a: Math.min(k0, k), b: Math.max(k0, k) }; todo(true); }, fin = () => { tira.removeEventListener('pointermove', mueve); tira.removeEventListener('pointerup', fin); }; tira.addEventListener('pointermove', mueve); tira.addEventListener('pointerup', fin); });
    mount(abajo, h('div.ct-corte-c', corte, h('small.ct-corte-t', '')), h('div.ct-tira-c', h('div.ct-tira-l', h('span', '⬇ capa 1 (la cama)'), h('b', 'Arrastra aquí para elegir capas · los triángulos son las paradas'), h('span', 'capa ' + n + ' (la punta) ⬆')), tira));
    // ---- la regla vertical junto a la pieza ----
    const desl = h('input.ct-desl', { type: 'range', min: 1, max: n, step: 1, value: sel.b, 'aria-label': 'Capa elegida', 'data-ct': 'desl', oninput: e => { const k = Number(e.target.value); sel = { a: k, b: k }; todo(true); } });
    mount(regla, h('small', 'capa ' + n), desl, h('small', 'capa 1'));
    // ---- cabecera ----
    function pintaCab() { mount(cabeza, h('div.ct-titulo', h('b', '🎨 Colores y pausas'), h('span', (o.nombre || 'Pieza') + ' · ' + f2(ancho) + ' × ' + f2(fondo) + ' × ' + f2(alto) + ' mm · ' + n + ' capas de ' + f2(capa) + ' mm')),
      rota ? h('span.ct-rota', { title: rota }, '⚠️ Malla rota: se ve aproximado') : null,
      h('div.ct-botones', h('button.btn.sm.ghost', { type: 'button', 'data-ct': 'deshacer', disabled: hi <= 0, title: 'Deshacer (Ctrl+Z)', onclick: () => vuelve(-1) }, '↶ Deshacer'), h('button.btn.sm.ghost', { type: 'button', 'data-ct': 'rehacer', disabled: hi >= hist.length - 1, title: 'Rehacer (Ctrl+Y)', onclick: () => vuelve(1) }, '↷ Rehacer'),
        h('button.btn.sm.ghost', { type: 'button', 'data-ct': 'cancelar', onclick: () => cerrar(false) }, 'Cancelar'), h('button.btn.sm.primary', { type: 'button', 'data-ct': 'guardar', onclick: () => { const V = valida(E, n, capa, primera); if (!V.ok) return toast('⛔ ' + V.errores[0], 'bad', 7000); if (soloCaras()) return avisaCaras(); cerrar(true); } }, '✔ Guardar'))); }
    function todo(ligero) { if (!vivo) return; if (desl.value !== String(sel.b)) desl.value = sel.b; pintaCab(); pintaIzq(); pintaDer(); pintaAbajo(); pide3d();
      window.__r8ct = { n, capa, primera, alto, sel: Object.assign({}, sel), color, modo, herr, selId, base: E.base, eventos: eventos(E, capa, primera).map(e => ({ id: e.id, capa: e.capa, z: e.z, color: e.color, tipo: e.tipo, activa: e.activa })), colores: coloresPorCapa(E, n, capa, primera, baseDef), valida: valida(E, n, capa, primera), elegidos: triSel.reduce((a, v) => a + v, 0), pintados: triCol.reduce((a, v) => a + (v ? 1 : 0), 0), deshacer: hi, rota: !!rota, tris: nT, partes: 0 }; void ligero; }

    // ---- tocar la pieza ----
    let abajoEn = null, arrastre = null;
    const tocaCaras = (ev, sumar) => { const c = escena.caraEn(ev); if (!c) { if (!sumar) { triSel.fill(0); todo(true); } return; } const t = c.tri; if (!sumar && herr !== 'pincel') triSel.fill(0);
      if (herr === 'cara') region(TOPO, t, 0.6).forEach(i => { triSel[i] = 1; }); else if (herr === 'region') region(TOPO, t, grados).forEach(i => { triSel[i] = 1; }); else if (herr === 'cuerpo') region(TOPO, t, 181).forEach(i => { triSel[i] = 1; });
      else if (herr === 'pincel') { const p = c.p, r2 = radio * radio; region(TOPO, t, 181).forEach(i => { const q = i * 9, x = (s[q] + s[q + 3] + s[q + 6]) / 3 - p[0], y = (s[q + 1] + s[q + 4] + s[q + 7]) / 3 - p[1], z = (s[q + 2] + s[q + 5] + s[q + 8]) / 3 - p[2]; if (x * x + y * y + z * z <= r2) triSel[i] = 1; }); }
      todo(true); };
    lienzo.addEventListener('pointerdown', ev => { if (ev.button !== 0) return; abajoEn = { x: ev.clientX, y: ev.clientY };
      if (modo === 'caras' && (herr === 'pincel' || herr === 'caja')) { escena.ctl.enabled = false; arrastre = { x: ev.clientX, y: ev.clientY }; if (herr === 'pincel') { if (!ev.shiftKey) triSel.fill(0); tocaCaras(ev, true); } else { const r = lienzo.getBoundingClientRect(); caja.style.display = 'block'; caja.style.left = (ev.clientX - r.left) + 'px'; caja.style.top = (ev.clientY - r.top) + 'px'; caja.style.width = caja.style.height = '0px'; } } });
    lienzo.addEventListener('pointermove', ev => { if (!arrastre) return; if (herr === 'pincel') tocaCaras(ev, true); else { const r = lienzo.getBoundingClientRect(), xa = Math.min(arrastre.x, ev.clientX) - r.left, ya = Math.min(arrastre.y, ev.clientY) - r.top; caja.style.left = xa + 'px'; caja.style.top = ya + 'px'; caja.style.width = Math.abs(ev.clientX - arrastre.x) + 'px'; caja.style.height = Math.abs(ev.clientY - arrastre.y) + 'px'; } });
    const alSoltar = ev => { if (!vivo) return; if (arrastre) { escena.ctl.enabled = true; if (herr === 'caja') { caja.style.display = 'none'; const r = lienzo.getBoundingClientRect(), xa = Math.min(arrastre.x, ev.clientX) - r.left, xb = Math.max(arrastre.x, ev.clientX) - r.left, ya = Math.min(arrastre.y, ev.clientY) - r.top, yb = Math.max(arrastre.y, ev.clientY) - r.top;
          if (xb - xa > 4 && yb - ya > 4) { if (!ev.shiftKey) triSel.fill(0); const cam = escena.cam.position; for (let t = 0; t < nT; t++) { const q = t * 9, px = (s[q] + s[q + 3] + s[q + 6]) / 3, py = (s[q + 1] + s[q + 4] + s[q + 7]) / 3, pz = (s[q + 2] + s[q + 5] + s[q + 8]) / 3; if (TOPO.nor[t * 3] * (cam.x - px) + TOPO.nor[t * 3 + 1] * (cam.y - py) + TOPO.nor[t * 3 + 2] * (cam.z - pz) <= 0) continue; const p = escena.aPantalla([px, py, pz]); if (p.delante && p.x >= xa && p.x <= xb && p.y >= ya && p.y <= yb) triSel[t] = 1; } todo(true); } } arrastre = null; abajoEn = null; return; }
      if (!abajoEn || ev.target !== lienzo) { abajoEn = null; return; } const quieto = Math.hypot(ev.clientX - abajoEn.x, ev.clientY - abajoEn.y) < 5; abajoEn = null; if (!quieto) return;
      if (modo === 'caras') return tocaCaras(ev, ev.shiftKey);
      const c = escena.caraEn(ev); if (!c) return; const k = Math.max(1, Math.min(n, capaEnAltura(c.p[2] + 1e-6, capa, primera))); sel = ev.shiftKey ? { a: Math.min(sel.a, k), b: Math.max(sel.b, k) } : { a: k, b: k }; todo(true); };
    const alCambiarTam = () => { if (vivo) pintaAbajo(); };
    window.addEventListener('pointerup', alSoltar); window.addEventListener('resize', alCambiarTam);
    const tecla = ev => { if (!vivo) return; const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target && ev.target.tagName) || '') && ev.target.type !== 'range';
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); if (triSel.some(v => v)) { triSel.fill(0); todo(true); } else cerrar(false); return; }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ev.stopPropagation(); vuelve(ev.shiftKey ? 1 : -1); return; } if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); ev.stopPropagation(); vuelve(1); return; }
      if (enCampo) return; ev.stopPropagation();
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); const d = (ev.key === 'ArrowUp' ? 1 : -1) * (ev.shiftKey ? 10 : 1); if (selId && ev.altKey) { const e = eventos(E, capa, primera).find(x => x.id === selId); if (e) mueveA(selId, e.capa + d); } else ponSel(sel.b + d, sel.b + d); }
      else if (ev.key === 'Enter' || ev.key.toLowerCase() === 'p') { ev.preventDefault(); pinta(); } else if (ev.key === 'Delete' && selId) { E.cambios = E.cambios.filter(c => c.id !== selId); selId = null; apunta(); } };
    document.addEventListener('keydown', tecla, true);
    escena.alDibujar = colocaEtiquetas;
    calculaPerfil(); todo(); setTimeout(() => { try { escena.encuadrar('iso'); } catch (e) { } pintaAbajo(); }, 120);
    window.__r8ctApi = { cerrar, ponSel, pinta, nuevaPausa, mueveA, ponColor, vuelve, convierte, get sopa() { return s; }, get E() { return E; }, escena, get triSel() { return triSel; }, ponModo: m => { modo = m; if (m === 'caras' && !TOPO) TOPO = topologia(s); todo(); }, ponHerr: q => { herr = q; pintaIzq(); } };
  });
}
