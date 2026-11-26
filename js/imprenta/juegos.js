// ================= 25-11-2026 · IMPRENTA · MINIJUEGOS y retos para tarjetas (puro, sin pantalla) =================
// Estética adulta, geométrica, de taller. Todo determinista con semilla (mulberry32): misma semilla, mismo resultado.
// Cada generador devuelve capas según el contrato de modelo.js (medidas en mm) para una pieza de w × h mm.
//   laberinto · diferencias · mensajeSecreto · acertijo · retoVisual · carta
// Y JUEGOS = catálogo para la interfaz.
import { nuevaCapa, COLORES, PT_MM, r2, cajaGirada } from './modelo.js';

export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function semillaNum(s) {
  if (typeof s === 'number' && isFinite(s)) return s >>> 0;
  if (s === undefined || s === null || s === '') return 1;
  let h = 0x811c9dc5; const t = String(s);
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
  return h;
}
const num = (v, d) => { const n = Number(v); return v === '' || v === null || v === undefined || !isFinite(n) ? d : n; };
const barajar = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const PALETA = [COLORES.grafito, COLORES.turquesa, COLORES.ambar, COLORES.lila, COLORES.pizarra, COLORES.arandano, COLORES.pino, COLORES.oro];

// Ids deterministas (modelo.js usa Date.now y azar; aquí no queremos eso)
function fabrica(pref, semilla) {
  let n = 0; const base = pref + (semillaNum(semilla) % 100000).toString(36);
  return (props) => { n++; return nuevaCapa(Object.assign({ id: base + '_' + n }, props, { x: r2(props.x), y: r2(props.y), w: r2(props.w), h: r2(props.h) })); };
}
function dibujo(mk, x, y, w, h, trazos, nombre) {
  return mk({ t: 'dibujo', nombre, x, y, w, h, w0: r2(w), h0: r2(h), trazos });
}
const trazo = (p, o = {}) => ({ p: p.map(q => [r2(q[0]), r2(q[1])]), cerrado: !!o.cerrado, grosor: o.grosor || 0.4, color: o.color || COLORES.grafito, relleno: o.relleno || '' });

// ---------------------------------------------------------------- LABERINTO
export function laberinto(o = {}) {
  const W = num(o.w, 85), H = num(o.h, 55), m = num(o.margen, 5);
  const color = o.color || COLORES.grafito, acento = o.acento || COLORES.turquesa, grosor = num(o.grosor, 0.45);
  const rnd = mulberry32(semillaNum(o.semilla)), mk = fabrica('lab', o.semilla);
  const iw = W - 2 * m, ih = H - 2 * m;
  const cols = Math.max(3, (o.columnas | 0) || Math.round(iw / 5)), filas = Math.max(3, (o.filas | 0) || Math.round(ih / 5));
  const cs = Math.min(iw / cols, ih / filas), gw = cols * cs, gh = filas * cs, gx = m + (iw - gw) / 2, gy = m + (ih - gh) / 2;
  const celdas = [];
  for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) celdas.push({ c, f, n: true, e: true, s: true, o: true });
  const at = (c, f) => (c < 0 || f < 0 || c >= cols || f >= filas) ? null : celdas[f * cols + c];
  // Backtracking recursivo (iterativo, con pila)
  const vis = new Set([0]), pila = [celdas[0]];
  const DIR = [['n', 0, -1, 's'], ['e', 1, 0, 'o'], ['s', 0, 1, 'n'], ['o', -1, 0, 'e']];
  while (pila.length) {
    const a = pila[pila.length - 1];
    const vec = barajar(DIR, rnd).map(d => ({ d, b: at(a.c + d[1], a.f + d[2]) })).filter(x => x.b && !vis.has(x.b.f * cols + x.b.c));
    if (!vec.length) { pila.pop(); continue; }
    const { d, b } = vec[0];
    a[d[0]] = false; b[d[3]] = false; vis.add(b.f * cols + b.c); pila.push(b);
  }
  const fe = Math.floor(rnd() * filas), fs = Math.floor(rnd() * filas);
  const entrada = { c: 0, f: fe }, salida = { c: cols - 1, f: fs };
  at(0, fe).o = false; at(cols - 1, fs).e = false;
  // Camino con BFS (en un laberinto perfecto es único)
  const prev = new Map([[fe * cols, null]]), cola = [at(0, fe)];
  while (cola.length) {
    const a = cola.shift();
    for (const d of DIR) { if (a[d[0]]) continue; const b = at(a.c + d[1], a.f + d[2]); if (!b) continue; const k = b.f * cols + b.c; if (prev.has(k)) continue; prev.set(k, a.f * cols + a.c); cola.push(b); }
  }
  const camino = []; for (let k = fs * cols + cols - 1; k !== null && k !== undefined; k = prev.get(k)) camino.push([k % cols, Math.floor(k / cols)]);
  camino.reverse();
  // Paredes fusionadas en pocos segmentos
  const trazos = [];
  for (let j = 0; j <= filas; j++) {
    let ini = -1;
    for (let c = 0; c <= cols; c++) {
      const hay = c < cols && (j === 0 ? at(c, 0).n : j === filas ? at(c, filas - 1).s : at(c, j).n);
      if (hay && ini < 0) ini = c;
      if (!hay && ini >= 0) { trazos.push(trazo([[ini * cs, j * cs], [c * cs, j * cs]], { grosor, color })); ini = -1; }
    }
  }
  for (let i = 0; i <= cols; i++) {
    let ini = -1;
    for (let f = 0; f <= filas; f++) {
      const hay = f < filas && (i === 0 ? at(0, f).o : i === cols ? at(cols - 1, f).e : at(i, f).o);
      if (hay && ini < 0) ini = f;
      if (!hay && ini >= 0) { trazos.push(trazo([[i * cs, ini * cs], [i * cs, f * cs]], { grosor, color })); ini = -1; }
    }
  }
  const paredes = () => dibujo(mk, gx, gy, gw, gh, trazos.map(t => Object.assign({}, t, { p: t.p.map(q => q.slice()) })), 'Paredes');
  const marca = (cel, forma, rel) => mk({ t: 'forma', nombre: forma === 'elipse' ? 'Entrada' : 'Salida', forma, relleno: rel, x: gx + cel.c * cs + cs * 0.25, y: gy + cel.f * cs + cs * 0.25, w: cs * 0.5, h: cs * 0.5 });
  const frente = [paredes(), marca(entrada, 'elipse', acento), marca(salida, 'rombo', color)];
  const pts = [[0, (fe + 0.5) * cs]].concat(camino.map(([c, f]) => [(c + 0.5) * cs, (f + 0.5) * cs]), [[gw, (fs + 0.5) * cs]]);
  const dorso = [paredes(), dibujo(mk, gx, gy, gw, gh, [trazo(pts, { grosor: Math.max(0.8, cs * 0.18), color: acento })], 'Solución'), marca(entrada, 'elipse', acento), marca(salida, 'rombo', color)];
  return { frente, dorso, datos: { columnas: cols, filas, celda: r2(cs), caja: { x: r2(gx), y: r2(gy), w: r2(gw), h: r2(gh) }, celdas, entrada, salida, camino } };
}

// ---------------------------------------------------------------- DIFERENCIAS
export function diferencias(o = {}) {
  const W = num(o.w, 85), H = num(o.h, 55), m = num(o.margen, 5), acento = o.acento || COLORES.turquesa;
  const rnd = mulberry32(semillaNum(o.semilla)), mk = fabrica('dif', o.semilla);
  const gap = 3, capH = 6, pw = (W - 2 * m - gap) / 2, ph = H - 2 * m - capH;
  const cols = Math.max(3, Math.round(pw / 9)), filas = Math.max(3, Math.round(ph / 9)), cw = pw / cols, ch = ph / filas, cs = Math.min(cw, ch);
  const total = Math.max(4, Math.min(cols * filas - 2, Math.round(cols * filas * 0.75)));
  const n = Math.max(1, Math.min(num(o.n, 5) | 0, Math.floor(total / 2)));
  const celdas = barajar([...Array(cols * filas).keys()], rnd).slice(0, total);
  const tipos = ['rect', 'elipse', 'triangulo', 'arco', 'linea'];
  const els = celdas.map((k, i) => {
    const tipo = tipos[Math.floor(rnd() * tipos.length)], u = cs * (0.3 + rnd() * 0.15);
    const e = { i, tipo, cx: (k % cols + 0.5) * cw, cy: (Math.floor(k / cols) + 0.5) * ch, rot: [0, 0, 90][Math.floor(rnd() * 3)], color: PALETA[Math.floor(rnd() * PALETA.length)] };
    if (tipo === 'rect') { e.w = u; e.h = u * (0.4 + rnd() * 0.15); }
    else if (tipo === 'linea') { e.w = u * 1.4; e.h = u * 0.7; }
    else if (tipo === 'arco') { e.w = u * 1.2; e.h = u * 0.6; }
    else { e.w = u; e.h = u; }
    if (tipo === 'triangulo') e.rot = 0;
    return e;
  });
  const elegidas = barajar(els.map(e => e.i), rnd).slice(0, n);
  const modos = ['color', 'falta', 'tamano', 'giro'];
  const cambios = new Map();
  elegidas.forEach((id, j) => {
    const e = els[id]; let modo = modos[j % modos.length];
    if (modo === 'giro' && e.tipo === 'elipse') modo = 'tamano';
    cambios.set(id, modo);
  });
  const px0 = m, px1 = m + pw + gap, py = m;
  const capaEl = (e, ox, oy, nombre) => {
    const base = { nombre, x: ox + e.cx - e.w / 2, y: oy + e.cy - e.h / 2, w: e.w, h: e.h, rot: e.rot };
    if (e.tipo === 'rect') return mk(Object.assign(base, { t: 'forma', forma: 'rect', relleno: e.color }));
    if (e.tipo === 'elipse') return mk(Object.assign(base, { t: 'forma', forma: 'elipse', relleno: e.color }));
    if (e.tipo === 'triangulo') return mk(Object.assign(base, { t: 'forma', forma: 'triangulo', relleno: e.color }));
    if (e.tipo === 'linea') return mk({ t: 'dibujo', nombre, x: base.x, y: base.y, w: e.w, h: e.h, w0: r2(e.w), h0: r2(e.h), rot: e.rot, trazos: [trazo([[0, e.h], [e.w, 0]], { grosor: 0.7, color: e.color })] });
    const pts = []; for (let k = 0; k <= 16; k++) { const a = Math.PI + Math.PI * k / 16; pts.push([e.w / 2 + Math.cos(a) * e.w / 2, e.h + Math.sin(a) * e.h]); }
    return mk({ t: 'dibujo', nombre, x: base.x, y: base.y, w: e.w, h: e.h, w0: r2(e.w), h0: r2(e.h), rot: e.rot, trazos: [trazo(pts, { grosor: 0.7, color: e.color })] });
  };
  const fondo = (x) => mk({ t: 'forma', nombre: 'Panel', forma: 'rect', relleno: COLORES.hueso, borde: COLORES.piedra, grosor: 0.25, x, y: py, w: pw, h: ph });
  const izq = [fondo(px0)], der = [fondo(px1)], diffs = [];
  els.forEach(e => {
    izq.push(capaEl(e, px0, py, 'e' + e.i));
    const modo = cambios.get(e.i);
    let d = Object.assign({}, e);
    if (modo === 'falta') { const b = cajaGirada({ x: px1 + e.cx - e.w / 2, y: py + e.cy - e.h / 2, w: e.w, h: e.h, rot: e.rot }); diffs.push({ id: e.i, tipo: 'falta', caja: b }); return; }
    if (modo === 'color') { const otros = PALETA.filter(c => c !== e.color); d.color = otros[Math.floor(rnd() * otros.length)]; }
    if (modo === 'tamano') { d.w = e.w * 1.5; d.h = e.h * 1.5; }
    if (modo === 'giro') d.rot = e.tipo === 'triangulo' ? 180 : (e.rot + 90) % 180;
    const capa = capaEl(d, px1, py, 'e' + e.i);
    if (e.tipo === 'triangulo' && modo === 'giro') capa.rot = 180;
    der.push(capa);
    if (modo) diffs.push({ id: e.i, tipo: modo, caja: cajaGirada(capa) });
  });
  const lista = diffs.filter(d => cambios.has(d.id)).map(d => ({ id: d.id, tipo: d.tipo, caja: { x: r2(d.caja.x), y: r2(d.caja.y), w: r2(d.caja.w), h: r2(d.caja.h) } }));
  const pie = mk({ t: 'texto', nombre: 'Pregunta', texto: 'Encuentra ' + n + ' diferencias', x: m, y: m + ph + 1.5, w: W - 2 * m, h: capH - 1.5, tam: 7, peso: 600, color: COLORES.grafito, alin: 'centro', vAlin: 'centro', espaciado: 80, mayus: true });
  const frente = izq.concat(der, [pie]);
  const circulos = lista.map((d, k) => {
    const dm = Math.max(d.caja.w, d.caja.h) + 2.4;
    const x = Math.min(Math.max(d.caja.x + d.caja.w / 2 - dm / 2, 0), W - dm), y = Math.min(Math.max(d.caja.y + d.caja.h / 2 - dm / 2, 0), H - dm);
    return mk({ t: 'forma', nombre: 'Marca ' + (k + 1), forma: 'elipse', relleno: '', borde: acento, grosor: 0.4, x, y, w: dm, h: dm });
  });
  const dorso = der.concat(circulos, [mk({ t: 'texto', nombre: 'Solución', texto: 'Solución: ' + n, x: m, y: m + ph + 1.5, w: W - 2 * m, h: capH - 1.5, tam: 7, peso: 600, color: acento, alin: 'centro', vAlin: 'centro', espaciado: 80, mayus: true })]);
  return { frente, dorso, datos: { n, diferencias: lista, paneles: { izq: { x: r2(px0), y: r2(py), w: r2(pw), h: r2(ph) }, der: { x: r2(px1), y: r2(py), w: r2(pw), h: r2(ph) } } } };
}

// ---------------------------------------------------------------- MENSAJE SECRETO
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export function normalizarSecreto(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}
// 36 glifos distintos, cada uno de 1 a 3 trazos sobre una malla de 3×3 puntos
export function glifos(semilla) {
  const rnd = mulberry32(semillaNum(semilla) ^ 0x5bd1e995), pares = [];
  for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) pares.push([a, b]);
  const vistos = new Set(), out = [];
  while (out.length < 36) {
    const k = 1 + Math.floor(rnd() * 3), segs = barajar(pares, rnd).slice(0, k).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const firma = segs.map(s => s.join('-')).join('|');
    if (vistos.has(firma)) continue; vistos.add(firma); out.push(segs);
  }
  return out;
}
const PT3 = i => [0.2 + (i % 3) * 0.3, 0.2 + Math.floor(i / 3) * 0.3];
function trazosGlifo(segs, x, y, s, color, gr, marco) {
  const t = [];
  if (marco) t.push(trazo([[x, y], [x + s, y], [x + s, y + s], [x, y + s]], { cerrado: true, grosor: 0.15, color: COLORES.piedra }));
  segs.forEach(([a, b]) => { const A = PT3(a), B = PT3(b); t.push(trazo([[x + A[0] * s, y + A[1] * s], [x + B[0] * s, y + B[1] * s]], { grosor: gr, color })); });
  return t;
}
export function mensajeSecreto(o = {}) {
  const W = num(o.w, 85), H = num(o.h, 55), m = num(o.margen, 5), color = o.color || COLORES.grafito, acento = o.acento || COLORES.turquesa;
  const modo = o.modo === 'numeros' ? 'numeros' : 'simbolos';
  const rnd = mulberry32(semillaNum(o.semilla)), mk = fabrica('sec', o.semilla);
  const norm = normalizarSecreto(o.texto === undefined ? 'El taller abre a las nueve' : o.texto) || 'HOLA';
  const gl = glifos(o.semilla), iw = W - 2 * m, ih = H - 2 * m;
  const orden = barajar([...Array(36).keys()], rnd).map(x => x + 1); // letra i -> número orden[i] (1..36)
  const tabla = {}; ALFABETO.split('').forEach((c, i) => { tabla[c] = modo === 'numeros' ? orden[i] : i; });
  const inv = {}; Object.keys(tabla).forEach(c => { inv[tabla[c]] = c; });
  const codigo = norm.split('').map(c => c === ' ' ? -1 : tabla[c]);
  const descifrar = cod => cod.map(v => v === -1 ? ' ' : inv[v]).join('');
  const palabras = norm.split(' ');
  // Tamaño de glifo: el mayor que quepa en el área (sobra para la clave en el dorso)
  let s = 10, lineas = [];
  for (; s >= 2.5; s -= 0.5) {
    const paso = s * 1.2, max = Math.max(1, Math.floor((iw + (paso - s)) / paso)); lineas = []; let cur = '';
    for (let w of palabras) {
      while (w.length > max) { if (cur) { lineas.push(cur); cur = ''; } lineas.push(w.slice(0, max)); w = w.slice(max); }
      if (!cur) cur = w; else if ((cur + ' ' + w).length <= max) cur += ' ' + w; else { lineas.push(cur); cur = w; }
    }
    if (cur) lineas.push(cur);
    if (lineas.length * (s * 1.35) - s * 0.35 <= ih) break;
  }
  const paso = s * 1.2, altoLin = s * 1.35, bloqueH = lineas.length * altoLin - s * 0.35, y0 = m + (ih - bloqueH) / 2;
  const frente = [];
  if (modo === 'simbolos') {
    const t = [];
    lineas.forEach((l, li) => {
      const ancho = l.length * paso - (paso - s), x0 = (iw - ancho) / 2;
      l.split('').forEach((c, ci) => { if (c === ' ') return; t.push(...trazosGlifo(gl[tabla[c]], x0 + ci * paso, li * altoLin, s, color, Math.max(0.35, s * 0.08), true)); });
    });
    frente.push(dibujo(mk, m, y0, iw, bloqueH, t, 'Mensaje cifrado'));
  } else {
    const tam = Math.max(6, Math.min(12, s * 1.1 / PT_MM / 1.4));
    lineas.forEach((l, li) => frente.push(mk({ t: 'texto', nombre: 'Línea ' + (li + 1), texto: l.split('').map(c => c === ' ' ? '/' : String(tabla[c]).padStart(2, '0')).join(' '), fuente: 'monospace', peso: 700, tam, color, alin: 'centro', vAlin: 'centro', x: m, y: y0 + li * altoLin, w: iw, h: s * 1.1 })));
  }
  // La CLAVE (capa aparte, para el dorso): 9 columnas × 4 filas
  const clave = [], cc = 9, cf = 4, cw = iw / cc, cho = ih / cf, gs = Math.min(cw * 0.8, cho * 0.55), tr = [];
  ALFABETO.split('').forEach((c, i) => {
    const x = m + (i % cc) * cw, y = m + Math.floor(i / cc) * cho;
    if (modo === 'simbolos') tr.push(...trazosGlifo(gl[i], x + (cw - gs) / 2, y, gs, color, Math.max(0.3, gs * 0.08), true));
    clave.push(mk({ t: 'texto', nombre: 'Clave ' + c, texto: modo === 'simbolos' ? c : c + '=' + String(tabla[c]).padStart(2, '0'), peso: 700, tam: modo === 'simbolos' ? 7 : 6.5, color: acento, alin: 'centro', vAlin: 'centro', x: x, y: y + (modo === 'simbolos' ? gs + 0.5 : cho * 0.3), w: cw, h: modo === 'simbolos' ? Math.min(cho - gs - 0.5, 4) : 4 }));
  });
  if (modo === 'simbolos') clave.unshift(dibujo(mk, m, m, iw, ih, tr.map(t => Object.assign({}, t, { p: t.p.map(q => [r2(q[0] - m), r2(q[1] - m)]) })), 'Clave (símbolos)'));
  return { frente, dorso: clave, clave, datos: { modo, normalizado: norm, codigo, tabla, glifos: gl, tamGlifo: r2(s), descifrar } };
}

// ---------------------------------------------------------------- ACERTIJOS (propios, para adultos, cortos)
export const ACERTIJOS = [
  { id: 'ac-001', texto: 'Tengo cuatro patas y no camino. Aguanto a todos y nadie me da las gracias. ¿Qué soy?', solucion: 'La mesa.' },
  { id: 'ac-002', texto: 'Se rompe en cuanto lo nombras. ¿Qué es?', solucion: 'El silencio.' },
  { id: 'ac-003', texto: 'Siempre estoy a punto de llegar y nunca llego. ¿Qué soy?', solucion: 'El mañana.' },
  { id: 'ac-004', texto: 'Tiene hojas y no es un árbol. Tiene lomo y no es un animal. ¿Qué es?', solucion: 'Un libro.' },
  { id: 'ac-005', texto: 'Tiene dientes y no muerde. Pasa cada mañana por tu pelo. ¿Qué es?', solucion: 'Un peine.' },
  { id: 'ac-006', texto: 'Seco a todos los demás y yo acabo empapada. ¿Qué soy?', solucion: 'La toalla.' },
  { id: 'ac-007', texto: 'Tiene manos y no aplaude. Tiene cara y no sonríe. ¿Qué es?', solucion: 'Un reloj.' },
  { id: 'ac-008', texto: 'Lo tienes tú, pero lo usan más los demás. ¿Qué es?', solucion: 'Tu nombre.' },
  { id: 'ac-009', texto: 'Vuela de noche y su nombre lleva las cinco vocales, una vez cada una. ¿Cuál es?', solucion: 'El murciélago.' },
  { id: 'ac-010', texto: 'Soy un número. Si sumas la mitad de mí más tres, vuelves a tenerme. ¿Quién soy?', solucion: 'El 6.' },
  { id: 'ac-011', texto: 'Tres gatos cazan tres ratones en tres minutos. ¿Cuántos gatos cazan cien ratones en cien minutos?', solucion: 'Tres gatos.' },
  { id: 'ac-012', texto: 'La madre de Pedro tiene tres hijos: Uno, Dos y... ¿cómo se llama el tercero?', solucion: 'Pedro.' },
  { id: 'ac-013', texto: 'Dos padres y dos hijos pescan tres peces, uno para cada uno. ¿Cómo es posible?', solucion: 'Eran abuelo, padre e hijo.' },
  { id: 'ac-014', texto: 'Tengo ciudades sin casas, ríos sin agua y montañas sin árboles. ¿Qué soy?', solucion: 'Un mapa.' },
  { id: 'ac-015', texto: 'Cuanto más grande soy, menos se ve. ¿Qué soy?', solucion: 'La oscuridad.' },
  { id: 'ac-016', texto: '¿Qué sube cada año y nunca baja?', solucion: 'La edad.' },
  { id: 'ac-017', texto: 'Tiene ojo y no ve. Lleva siempre un hilo detrás. ¿Qué es?', solucion: 'La aguja.' },
  { id: 'ac-018', texto: 'Si me tienes, quieres compartirme. Si me compartes, ya no me tienes. ¿Qué soy?', solucion: 'Un secreto.' },
  { id: 'ac-019', texto: 'No tiene alas y vuela. No tiene ojos y llora. ¿Qué es?', solucion: 'La nube.' },
  { id: 'ac-020', texto: 'Pesa menos que una pluma y nadie lo sostiene mucho rato. ¿Qué es?', solucion: 'El aliento.' },
  { id: 'ac-021', texto: 'Un hombre empuja su coche hasta un hotel y se declara arruinado. ¿Qué ha pasado?', solucion: 'Estaba jugando al Monopoly.' },
  { id: 'ac-022', texto: 'Un taxista circula en sentido contrario ante un policía y no le multan. ¿Por qué?', solucion: 'Iba andando.' },
  { id: 'ac-023', texto: 'Entras a una habitación a oscuras con una vela, una lámpara y una chimenea. Solo tienes una cerilla. ¿Qué enciendes primero?', solucion: 'La cerilla.' },
  { id: 'ac-024', texto: '¿Cuántos animales de cada especie metió Moisés en el arca?', solucion: 'Ninguno. Fue Noé.' },
  { id: 'ac-025', texto: 'Tiene cabecera y pies, y jamás da un paso. ¿Qué es?', solucion: 'La cama.' },
  { id: 'ac-026', texto: 'Entra seca y sale mojada, y cuanto más tiempo está, más fuerte sabe. ¿Qué es?', solucion: 'Una bolsita de té.' },
  { id: 'ac-027', texto: 'Todos la tienen. Nadie la ha tocado. Con sol, va detrás de ti. ¿Qué es?', solucion: 'La sombra.' },
  { id: 'ac-028', texto: 'Tiene cuello y no tiene cabeza. Tiene boca y no habla. ¿Qué es?', solucion: 'Una botella.' },
  { id: 'ac-029', texto: 'Se abre para protegerte y se cierra para caber en el bolso. ¿Qué es?', solucion: 'Un paraguas.' },
  { id: 'ac-030', texto: 'Un tren eléctrico va de este a oeste con viento del norte. ¿Hacia dónde va el humo?', solucion: 'A ninguna parte: no tiene humo.' },
  { id: 'ac-031', texto: 'Un gallo pone un huevo en lo alto de un tejado. ¿Hacia qué lado cae?', solucion: 'Los gallos no ponen huevos.' },
  { id: 'ac-032', texto: '¿Cuántos meses del año tienen 28 días?', solucion: 'Todos.' },
  { id: 'ac-033', texto: 'Te dan tres pastillas y te dicen que tomes una cada media hora. ¿Cuánto tardas en tomarlas todas?', solucion: 'Una hora.' },
  { id: 'ac-034', texto: 'Tienes cinco manzanas y te quito tres. ¿Cuántas tienes tú?', solucion: 'Tres: las que me llevé.' },
  { id: 'ac-035', texto: 'Un ladrillo pesa un kilo más medio ladrillo. ¿Cuánto pesa el ladrillo entero?', solucion: 'Dos kilos.' },
  { id: 'ac-036', texto: 'Si pasado mañana es sábado, ¿qué día fue anteayer?', solucion: 'Martes.' },
  { id: 'ac-037', texto: 'Un pastor tiene 17 ovejas. Todas menos 9 se escapan. ¿Cuántas le quedan?', solucion: 'Nueve.' },
  { id: 'ac-038', texto: '¿Qué pesa más, un kilo de hierro o un kilo de plumas?', solucion: 'Pesan lo mismo.' },
  { id: 'ac-039', texto: 'Sigue la serie: 1, 11, 21, 1211, 111221, ...', solucion: '312211. Cada término describe al anterior.' },
  { id: 'ac-040', texto: 'Quito aspereza y me gasto en cada pasada. ¿Qué soy?', solucion: 'Una lija.' },
  { id: 'ac-041', texto: 'Muerdo sin dientes y agarro sin manos. Sin mí, tu estantería se cae. ¿Qué soy?', solucion: 'Un tornillo.' },
  { id: 'ac-042', texto: 'Mido sin ser regla y cabe en tu bolsillo. ¿Qué soy?', solucion: 'Un flexómetro.' },
  { id: 'ac-043', texto: 'Giro sin moverme del marco y sin mí la puerta no sabe abrir. ¿Qué soy?', solucion: 'La bisagra.' },
  { id: 'ac-044', texto: 'Tengo cuerpo de madera, cabeza de fósforo y vivo poco. ¿Qué soy?', solucion: 'Una cerilla.' }
];
export function acertijo(o = {}) {
  const W = num(o.w, 85), H = num(o.h, 55), m = num(o.margen, 5), color = o.color || COLORES.grafito, acento = o.acento || COLORES.turquesa;
  const rnd = mulberry32(semillaNum(o.semilla)), mk = fabrica('ace', o.semilla);
  const idx = o.indice !== undefined ? ((o.indice % ACERTIJOS.length) + ACERTIJOS.length) % ACERTIJOS.length : Math.floor(rnd() * ACERTIJOS.length);
  const a = ACERTIJOS[idx], giro = o.girar ? 180 : 0;
  const cab = (txt, col) => mk({ t: 'texto', nombre: 'Cabecera', texto: txt, tam: 7, peso: 700, color: col, espaciado: 150, mayus: true, x: m, y: m, w: iw(W, m), h: 4 });
  const frente = [cab('Acertijo ' + (idx + 1), COLORES.piedra),
    mk({ t: 'forma', nombre: 'Barra', forma: 'rect', relleno: acento, x: m, y: m + 5, w: 10, h: 0.8 }),
    mk({ t: 'texto', nombre: 'Pregunta', texto: a.texto, fuente: 'Manrope', peso: 600, tam: 13, color, vAlin: 'centro', interlinea: 1.25, x: m, y: m + 8, w: iw(W, m), h: H - 2 * m - 8 })];
  const dorso = [cab('Solución', acento),
    mk({ t: 'forma', nombre: 'Barra', forma: 'rect', relleno: color, x: m, y: m + 5, w: 10, h: 0.8 }),
    mk({ t: 'texto', nombre: 'Respuesta', texto: a.solucion, fuente: 'Manrope', peso: 700, tam: 15, color, vAlin: 'centro', interlinea: 1.25, x: m, y: m + 8, w: iw(W, m), h: H - 2 * m - 8 })];
  if (giro) dorso.forEach(c => { c.rot = 180; });
  return { frente, dorso, datos: { id: a.id, indice: idx, texto: a.texto, solucion: a.solucion } };
}
const iw = (W, m) => W - 2 * m;

// ---------------------------------------------------------------- RETO VISUAL
export function retoVisual(o = {}) {
  const W = num(o.w, 85), H = num(o.h, 55), m = num(o.margen, 5), acento = o.acento || COLORES.turquesa, color = o.color || COLORES.grafito;
  const tipo = o.tipo === 'intruso' ? 'intruso' : 'contar';
  const rnd = mulberry32(semillaNum(o.semilla)), mk = fabrica('ret', o.semilla);
  const capH = 7, areaY = m + capH + 1, areaH = H - areaY - m, areaW = W - 2 * m;
  const cols = Math.max(3, Math.round(areaW / 11)), filas = Math.max(2, Math.round(areaH / 11)), cw = areaW / cols, ch = areaH / filas, cs = Math.min(cw, ch);
  const centro = k => ({ x: m + (k % cols + 0.5) * cw, y: areaY + (Math.floor(k / cols) + 0.5) * ch });
  const pregunta = txt => mk({ t: 'texto', nombre: 'Pregunta', texto: txt, peso: 700, tam: 9, color, vAlin: 'centro', x: m, y: m, w: areaW, h: capH });
  const forma = (nombre, forma, c, k, rel, tam, rot) => mk({ t: 'forma', nombre, forma, relleno: rel, x: c.x - tam / 2, y: c.y - tam / 2, w: tam, h: tam, rot: rot || 0 });
  if (tipo === 'contar') {
    const nTri = 5 + Math.floor(rnd() * 8), total = Math.min(cols * filas, Math.max(nTri + 4, Math.round(cols * filas * 0.8)));
    const celdas = barajar([...Array(cols * filas).keys()], rnd).slice(0, total), esTri = new Set(celdas.slice(0, nTri));
    const decoy = ['elipse', 'rect', 'rombo'], frente = [pregunta('¿Cuántos triángulos ves?')], dorso = [pregunta('Respuesta')];
    celdas.forEach((k, i) => {
      const c = centro(k), tam = cs * (0.5 + rnd() * 0.15), rot = [0, 180][Math.floor(rnd() * 2)], col = PALETA[Math.floor(rnd() * PALETA.length)];
      if (esTri.has(k)) { frente.push(forma('Triángulo', 'triangulo', c, k, col, tam, rot)); dorso.push(forma('Triángulo', 'triangulo', c, k, acento, tam, rot)); }
      else { const f = decoy[Math.floor(rnd() * decoy.length)]; frente.push(forma('Distractor', f, c, k, col, tam, 0)); dorso.push(forma('Distractor', f, c, k, COLORES.piedra, tam, 0)); }
    });
    dorso.push(mk({ t: 'texto', nombre: 'Cuenta', texto: nTri + ' triángulos', peso: 700, tam: 8, color: acento, alin: 'der', vAlin: 'centro', x: m, y: m, w: areaW, h: capH }));
    dorso[0].texto = 'Respuesta'; dorso[0].alin = 'izq';
    return { frente, dorso, datos: { tipo, respuesta: nTri, celdas: { columnas: cols, filas } } };
  }
  const todo = cols * filas, intruso = Math.floor(rnd() * todo), tri = rnd() < 0.5, col = PALETA[1 + Math.floor(rnd() * (PALETA.length - 1))];
  const tam = cs * 0.55, frente = [pregunta('Encuentra la pieza distinta')], dorso = [pregunta('Respuesta')];
  const cajasF = [], cajasD = [];
  for (let k = 0; k < todo; k++) {
    const c = centro(k), esI = k === intruso;
    const mkp = (rel) => tri
      ? mk({ t: 'forma', nombre: esI ? 'Intruso' : 'Pieza', forma: 'triangulo', relleno: rel, x: c.x - tam / 2, y: c.y - tam / 2, w: tam, h: tam, rot: esI ? 180 : 0 })
      : mk({ t: 'forma', nombre: esI ? 'Intruso' : 'Pieza', forma: 'rect', relleno: rel, x: c.x - tam * 0.7 / 2, y: c.y - tam / 2, w: tam * 0.7, h: tam, rot: esI ? 90 : 0 });
    frente.push(mkp(col)); dorso.push(mkp(esI ? col : COLORES.piedra));
  }
  const ci = centro(intruso), dm = cs * 0.95;
  dorso.push(mk({ t: 'forma', nombre: 'Marca', forma: 'elipse', relleno: '', borde: acento, grosor: 0.5, x: ci.x - dm / 2, y: ci.y - dm / 2, w: dm, h: dm }));
  return { frente, dorso, datos: { tipo, respuesta: { columna: intruso % cols, fila: Math.floor(intruso / cols), indice: intruso }, forma: tri ? 'triangulo' : 'rect' } };
}

// ---------------------------------------------------------------- COLECCIÓN «Taller»
export const COLECCION = {
  id: 'taller', nombre: 'Taller', total: 12,
  cartas: [
    { n: 1, nombre: 'Escuadra', lema: 'Lo recto también se aprende.' },
    { n: 2, nombre: 'Yunque', lema: 'Aguanta lo que le cae.' },
    { n: 3, nombre: 'Plomada', lema: 'La gravedad no miente.' },
    { n: 4, nombre: 'Compás', lema: 'Siempre vuelve al punto de partida.' },
    { n: 5, nombre: 'Cincel', lema: 'Quita lo que sobra.' },
    { n: 6, nombre: 'Gubia', lema: 'Corta con intención.' },
    { n: 7, nombre: 'Torno', lema: 'Da vueltas hasta que sale bien.' },
    { n: 8, nombre: 'Nivel', lema: 'Manda la burbuja.' },
    { n: 9, nombre: 'Banco', lema: 'Todo empieza apoyado en algo.' },
    { n: 10, nombre: 'Lima', lema: 'La paciencia tiene grano.' },
    { n: 11, nombre: 'Gramil', lema: 'Marca una vez, mide dos.' },
    { n: 12, nombre: 'Taller', lema: 'Aquí termina todo y empieza lo demás.' }
  ]
};
function poligono(cx, cy, r, lados, rot) { const p = []; for (let i = 0; i < lados; i++) { const a = rot + 2 * Math.PI * i / lados; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
export function carta(o = {}) {
  const W = num(o.w, 63), H = num(o.h, 88), m = num(o.margen, 4);
  const n = Math.max(1, Math.min(COLECCION.total, num(o.n, 1) | 0)), info = COLECCION.cartas[n - 1];
  const rnd = mulberry32((n * 2654435761 + 97 + semillaNum(o.semilla || 0)) >>> 0), mk = fabrica('car' + n + '_', 'c');
  const fondo = o.fondo || COLORES.grafito, claro = COLORES.hueso, acentos = [COLORES.turquesa, COLORES.ambar, COLORES.oro, COLORES.lila];
  const acento = acentos[n % acentos.length], acento2 = acentos[(n + 1 + Math.floor(rnd() * 3)) % acentos.length];
  const cabH = 6, pieH = 22, ax = m, ay = m + cabH + 1, aw = W - 2 * m, ah = H - ay - m - pieH, R = Math.min(aw, ah) / 2 - 0.5, cx = aw / 2, cy = ah / 2;
  const capas = [mk({ t: 'forma', nombre: 'Fondo', forma: 'rect', relleno: fondo, x: 0, y: 0, w: W, h: H })];
  capas.push(mk({ t: 'texto', nombre: 'Número', texto: String(n).padStart(2, '0') + '/' + String(COLECCION.total), fuente: 'monospace', peso: 700, tam: 10, color: acento, espaciado: 60, vAlin: 'centro', x: m, y: m, w: aw * 0.6, h: cabH }));
  capas.push(mk({ t: 'texto', nombre: 'Serie', texto: COLECCION.nombre, peso: 600, tam: 6, color: COLORES.piedra, espaciado: 200, mayus: true, alin: 'der', vAlin: 'centro', x: m + aw * 0.5, y: m, w: aw * 0.5, h: cabH }));
  // Arte generativo: polígonos anidados que giran, más un círculo y unas líneas. Todo sale del número de la carta.
  const k = 4 + Math.floor(rnd() * 4), lados = [3, 4, 5, 6, 8][Math.floor(rnd() * 5)], giro = (0.12 + rnd() * 0.35) * (rnd() < 0.5 ? 1 : -1), rot0 = rnd() * Math.PI;
  const tz = [];
  for (let i = 0; i < k; i++) {
    const r = R * (1 - i / (k + 0.5));
    tz.push(trazo(poligono(cx, cy, r, lados, rot0 + giro * i), { cerrado: true, grosor: 0.5, color: i % 2 ? acento : claro }));
  }
  const nl = 3 + Math.floor(rnd() * 6);
  for (let i = 0; i < nl; i++) { const a = rnd() * Math.PI * 2, r1 = R * (0.2 + rnd() * 0.3), r2_ = R * (0.75 + rnd() * 0.25); tz.push(trazo([[cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], [cx + Math.cos(a) * r2_, cy + Math.sin(a) * r2_]], { grosor: 0.35, color: acento2 })); }
  capas.push(mk({ t: 'dibujo', nombre: 'Arte', x: ax, y: ay, w: aw, h: ah, w0: r2(aw), h0: r2(ah), trazos: tz }));
  const dm = R * (0.18 + rnd() * 0.16), ang = rnd() * Math.PI * 2, rr = R * (0.35 + rnd() * 0.3);
  capas.push(mk({ t: 'forma', nombre: 'Punto', forma: 'elipse', relleno: acento2, x: ax + cx + Math.cos(ang) * rr - dm / 2, y: ay + cy + Math.sin(ang) * rr - dm / 2, w: dm, h: dm }));
  const py = ay + ah + 2;
  capas.push(mk({ t: 'forma', nombre: 'Filete', forma: 'rect', relleno: acento, x: m, y: py, w: 8, h: 0.6 }));
  capas.push(mk({ t: 'texto', nombre: 'Nombre', texto: info.nombre, fuente: 'Manrope', peso: 800, tam: 15, color: claro, mayus: true, espaciado: 60, vAlin: 'centro', x: m, y: py + 2, w: aw, h: 8 }));
  capas.push(mk({ t: 'texto', nombre: 'Lema', texto: info.lema, fuente: 'Instrument Serif', cursiva: true, peso: 400, tam: 9, color: COLORES.piedra, vAlin: 'arriba', x: m, y: py + 11, w: aw, h: pieH - 11 - 1 }));
  return capas;
}

// ---------------------------------------------------------------- CATÁLOGO para la interfaz
const envolver = fn => o => { const r = fn(o || {}); return r; };
export const JUEGOS = [
  { id: 'laberinto', t: 'Laberinto', d: 'Laberinto de un solo camino, con la solución al dorso.', generar: envolver(laberinto) },
  { id: 'diferencias', t: 'Siete diferencias', d: 'Dos composiciones geométricas casi iguales. Hay que encontrar las que cambian.', generar: envolver(diferencias) },
  { id: 'mensaje-secreto', t: 'Mensaje secreto', d: 'Un texto en símbolos o números, con la clave al dorso.', generar: envolver(mensajeSecreto) },
  { id: 'acertijo', t: 'Acertijo', d: 'Una adivinanza corta para adultos, con la respuesta al dorso.', generar: envolver(acertijo) },
  { id: 'reto-contar', t: 'Cuenta las piezas', d: '¿Cuántos triángulos hay entre las demás formas?', generar: o => retoVisual(Object.assign({}, o, { tipo: 'contar' })) },
  { id: 'reto-intruso', t: 'La pieza distinta', d: 'Una cuadrícula de piezas iguales y una que no lo es.', generar: o => retoVisual(Object.assign({}, o, { tipo: 'intruso' })) },
  { id: 'carta', t: 'Carta de la serie Taller', d: 'Carta coleccionable numerada, con arte único por número.', generar: o => ({ frente: carta(o || {}), dorso: [], datos: { n: (o && o.n) || 1, serie: COLECCION.id } }) }
];
