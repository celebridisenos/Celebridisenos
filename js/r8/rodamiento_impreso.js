// ================= v20.3 → v20.4 · 🛞 CelebriR8 · RODAMIENTOS QUE SE IMPRIMEN (de plástico, ya montados) =================
// La dueña (10-10-2026): «Plantilla de rodamientos funcionales sabiendo que se imprime en plástico, ojo con eso y ser perfeccionista».
// Sale de la impresora YA MONTADO y gira. Diseño propio, pensado para SU Bambu Studio (leído el 10-10-2026: boquilla 0,4 · línea 0,42
// · primera capa 0,20 · paredes «clásicas» · pie de elefante 0,15 en la P1P y 0 en su «0.16mm Optimal @FueerteCalidad» de la A1 mini).
//
// v20.4 · SU PRUEBA FÍSICA: «el nº 1 gira bien, pero las bolas se salen». POR QUÉ (medido en la geometría de la 20.3):
//  · los rodillos (dos conos a 45°: ella los llama «bolas») solo quedaban atrapados por un labio que se metía t − c − 0,6 mm sobre su
//    parte más ancha: 0,37 mm en el nº 1, 0,27 en el nº 2 y 0,15 en el nº 3. Para salir, el plástico solo tenía que ceder eso;
//  · el recorte de 0,6 mm para que la primera capa no suelde se puso ARRIBA también (allí no hace falta): se comía el labio de arriba,
//    que es por donde se escapan;
//  · paredes de 1,3 mm: los aros se doblan y abren paso;
//  · la prueba automática de la 20.3 («no se desmonta») movía un aro ENTERO 0,45 mm y veía que chocaba: nunca medía cuánto tiene que
//    ceder el plástico para que salga UN rodillo. Por eso pasaba y en la mano fallaba.
// LO QUE CAMBIA (sin metal, sin montaje, sin soportes):
//  · LABIO PROFUNDO: el cono de cada rodillo llega hasta un extremo de Ø2 (lo más fino que la boquilla de 0,4 imprime bien), así el
//    labio de cada pista se mete mucho más: para escapar el plástico tendría que ceder ≈2,5–3 mm («retención alta») o ≈1,7 mm («media»),
//    no 0,3–0,7 como antes. Se MIDE y se dice («interferencia»);
//  · el recorte de la cama (0,45 mm) solo ABAJO: arriba el labio queda entero;
//  · paredes de 1,7 mm como poco (4 pasadas de 0,42): los aros no se abren al apretar;
//  · combinaciones que no puedan sujetar los rodillos (labio de abajo < 0,6 mm de interferencia) se RECHAZAN con la medida que sí vale;
//  · la 🧪 prueba nueva lleva 4 rodamientos: 1-2-3 con retención alta y tres holguras, y el 4 con retención media; se contestan DOS
//    cosas de cada uno: ¿gira suave? y ¿se sale algún rodillo? Gana el más justo que cumple las dos.
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';

export const HOLGURAS = [0.15, 0.20, 0.27, 0.35, 0.42, 0.50]; // mm en horizontal entre rodillo y pista (v20.4; el 0,20 es el que le giró bien)
export const HOLGURAS_V203 = [0.20, 0.27, 0.35, 0.42, 0.50, 0.58]; // (los números de la prueba de la 20.3, para leer lo que hubiera apuntado)
export const POR_DEFECTO = 0.20; // su prueba física de la 20.3: el nº 1 (0,20) giró bien
export const PARED_MIN = 1.7, PARED_FINA = 1.3, RODILLO_MIN = 1.6, PUNTA_MIN = 1.0, PIE = 0.45, CANTO = 0.3, BAJO = 0.2, INTERF_MIN = 1.2; // (abajo; arriba siempre 0,9 más. Con 0,75 a ella se le salían)
export const RETENCIONES = { alta: 'Alta (labio hasta el fondo: lo más seguro)', media: 'Media (labio más corto: algo más suave al girar)' };
const LS = 'cd.r8.rodImpreso';
export const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
export function guardado() {
  let g = {}; try { g = JSON.parse(localStorage.getItem(LS) || 'null') || {}; } catch (e) { }
  if (!g.v && g.n) { g = { v: 2, c: HOLGURAS_V203[Math.max(1, Math.min(6, g.n)) - 1], ret: 'alta', fecha: g.fecha, deV203: true }; } // lo apuntado con la prueba de la 20.3
  return g;
}
const graba = g => { try { localStorage.setItem(LS, JSON.stringify(Object.assign(g, { v: 2 }))); } catch (e) { } return g; };
// qué lleva la prueba: 4 rodamientos (1-2-3 retención alta con tres holguras seguidas; 4 = la del medio con retención media)
export function tanda() { const g = guardado(), i0 = Math.max(0, Math.min(HOLGURAS.length - 3, Number(g.i0) || 0)); return [1, 2, 3, 4].map(num => ({ num, c: HOLGURAS[i0 + (num === 4 ? 1 : num - 1)], ret: num === 4 ? 'media' : 'alta', i0 })); }
// apuntar a mano una holgura (nº 1…6) con retención alta
export function guarda(n, ret = 'alta') { const g = guardado(); if (n > 0) { g.c = HOLGURAS[Math.max(1, Math.min(HOLGURAS.length, Math.round(n))) - 1]; g.ret = ret; } else { delete g.c; g.i0 = Math.min(HOLGURAS.length - 3, (Number(g.i0) || 0) + 2); } g.fecha = new Date().toISOString().slice(0, 10); delete g.deV203; return graba(g); }
// LA RESPUESTA DE LA PRUEBA: { 1: { gira: true, sale: false }, 2: … } → qué holgura y qué retención usar desde ahora
export function decide(res) {
  const T = tanda(), ok = T.filter(v => res[v.num] && res[v.num].gira === true && res[v.num].sale === false), g = guardado(), hoy = new Date().toISOString().slice(0, 10);
  const altas = ok.filter(v => v.ret === 'alta').sort((a, b) => a.c - b.c);
  let r;
  if (altas.length) r = { estado: 'ok', c: altas[0].c, ret: 'alta', num: altas[0].num };
  else if (ok.length) r = { estado: 'ok', c: ok[0].c, ret: ok[0].ret, num: ok[0].num };
  else if (!T.some(v => res[v.num] && res[v.num].gira)) r = T[0].i0 < HOLGURAS.length - 3 ? { estado: 'masHolgura', i0: Math.min(HOLGURAS.length - 3, T[0].i0 + 2) } : { estado: 'nada' };
  else { const gira = T.filter(v => res[v.num] && res[v.num].gira).sort((a, b) => a.c - b.c)[0]; r = { estado: 'bolas', c: gira.c, ret: 'alta', num: gira.num }; }
  if (r.c) { g.c = r.c; g.ret = r.ret; } if (r.i0 !== undefined) { g.i0 = r.i0; delete g.c; }
  g.fecha = hoy; g.resultados = res; g.estado = r.estado; delete g.deV203; graba(g);
  return r;
}
export function holguraDe(p) {
  const g = guardado(), auto = !p || !p.holgura || p.holgura === 'auto';
  if (!auto) { const n = Math.max(1, Math.min(HOLGURAS.length, Number(p.holgura) || 2)); return { n, c: HOLGURAS[n - 1], auto, deTuPrueba: false }; }
  const c = g.c || POR_DEFECTO, n = HOLGURAS.findIndex(x => Math.abs(x - c) < 1e-9) + 1 || null;
  return { n, c, auto, deTuPrueba: !!g.c && !g.deV203, deV203: !!g.deV203 };
}
export function retencionDe(p) { const r = p && p.ret && p.ret !== 'auto' ? p.ret : (guardado().ret || 'alta'); return RETENCIONES[r] ? r : 'alta'; }
export const OPS_HOLGURA = [['auto', '⭐ La de tu 🧪 prueba (si no la has hecho: 0,20, la que te giró bien)']].concat(HOLGURAS.map((h, i) => [String(i + 1), 'nº ' + (i + 1) + ' · ' + n2(h) + ' mm' + (i === 0 ? ' (el más justo)' : i === HOLGURAS.length - 1 ? ' (el más suelto)' : '')]));
export const OPS_RETENCION = [['auto', '⭐ La de tu 🧪 prueba (si no: alta)'], ['alta', RETENCIONES.alta], ['media', RETENCIONES.media]];
export const textoHolgura = H => 'holgura de ' + n2(H.c) + ' mm' + (H.deTuPrueba ? ' (la de TU prueba)' : H.deV203 ? ' (la que apuntaste con la prueba antigua)' : H.auto ? ' (la de partida: el 0,20 que te giró bien; haz la 🧪 prueba nueva)' : '');

const seg = d => 4 * Math.max(16, Math.round(d * 5 / 4));
const revol = (P, s) => N.CSX().ofPolygons([N.ccw(P)]).revolve(s);

// ---------- LAS CUENTAS: de tres medidas (eje, fuera, ancho) sale todo lo demás ----------
// p = { d, D, B, eje: 'presion' | 'justo' | 'gira', holgura, ret, cuad (lado de un agujero CUADRADO en vez de redondo: la prueba) }
export function cuentas(p) {
  const d = Number(p.d), D = Number(p.D), B = Number(p.B), H = p.c ? { c: Number(p.c), n: null, auto: false } : holguraDe(p), c = H.c, ret = retencionDe(p);
  const fit = p.cuad ? 0 : (ENCAJES[p.eje] !== undefined ? ENCAJES[p.eje] : ENCAJES.justo);
  const rb = p.cuad ? p.cuad * Math.SQRT1_2 + 0.25 : d / 2 + fit, RO = D / 2, S = RO - rb;
  if (!(D > 0 && B > 0 && rb > 0 && S > 0)) N.mal('Pon el agujero del eje, el diámetro de fuera (más grande) y el ancho.');
  if (B < 5) N.mal('Con menos de 5 mm de ancho la «V» que sujeta los rodillos no tiene sitio: súbelo a 5 o más.');
  const tMin = c + PIE + INTERF_MIN / 2, rMin = Math.max(RODILLO_MIN, PUNTA_MIN + tMin); // un rodillo más fino no deja sitio a un labio que lo sujete
  // paredes de 1,7 (4 pasadas): si así no caben rodillos que se sujeten, bajan hasta 1,3 (3 pasadas) y la nota lo dice
  let w0 = Math.max(PARED_MIN, 0.14 * S); if ((S - 2 * w0 - 2 * c) / 2 < rMin) w0 = Math.max(PARED_FINA, (S - 2 * c - 2 * rMin) / 2);
  const r0 = Math.min((S - 2 * w0 - 2 * c) / 2, 0.55 * B), w = (S - 2 * c - 2 * r0) / 2; // (rodillos nunca más gordos que ~su alto: lo que sobra, a las paredes)
  if (r0 < rMin - 1e-9) { const falta = 2 * (rMin - r0); N.mal('Entre el eje y el borde no caben rodillos que se puedan imprimir Y que no se salgan (saldrían de Ø' + n2(2 * r0) + ' y hacen falta Ø' + n2(2 * rMin) + '): sube el diámetro de fuera a ' + n2(Math.ceil((D + 2 * falta) * 2) / 2) + ' mm o más, o usa un eje más fino.'); }
  const tMax = Math.min(r0 - PUNTA_MIN, B / 2 - 0.5);
  if (tMax < tMin - 1e-9) N.mal('Con ' + n2(B) + ' mm de ancho el labio no sujetaría bien los rodillos: sube el ancho a ' + n2(Math.ceil(2 * (tMin + 0.5) * 2) / 2) + ' mm o más.');
  const t = ret === 'media' ? Math.min(tMax, c + PIE + INTERF_MIN / 2) : tMax, rEnd = r0 - t, Rm = rb + w + c + r0;
  const sep = Math.max(0.45, c + 0.15), n = Math.floor(Math.PI / Math.asin(Math.min(1, (2 * r0 + sep) / (2 * Rm)))); // (por la CUERDA: el aire de verdad entre dos rodillos vecinos)
  if (n < 5) N.mal('Salen menos de 5 rodillos: haz el rodamiento más grande por fuera.');
  const hueco = 2 * Rm * Math.sin(Math.PI / n) - 2 * r0; // aire entre dos rodillos vecinos al imprimir
  // INTERFERENCIA = cuánto tendría que ceder el plástico (en diámetro) para que un rodillo pase por el labio: arriba y abajo (en la
  // cama el labio va recortado PIE para que no suelde)
  const interf = { arriba: 2 * (t - c), abajo: 2 * (t - c - PIE) };
  return { d, D, B, c, H, ret, fit, rb, RO, S, w, r0, t, rEnd, Rm, n, hueco, interf, paredFina: w < PARED_MIN - 1e-9, cuad: p.cuad || 0 };
}
// ---------- LAS PIEZAS (eje Z; z = 0 es la cama): aro de dentro, aro de fuera y los rodillos, cada uno en su sitio ----------
export function piezas(p) {
  const K = cuentas(p), { B, c, rb, RO, r0, t, rEnd, Rm, n } = K, e = Math.min(CANTO, K.w / 3);
  const iP = Rm - rEnd - c, oP = Rm + rEnd + c; // la punta de cada labio (abajo va recortada PIE: la primera capa no suelda)
  let dentro = revol([[K.cuad ? 0 : rb + e, 0], [iP - PIE, 0], [iP - PIE, PIE], [Rm - r0 - c, t], [Rm - r0 - c, B - t], [iP, B]].concat(K.cuad ? [[0, B]] : [[rb + e, B], [rb, B - e], [rb, e]]), seg(2 * iP));
  if (K.cuad) { const l = K.cuad + 2 * ENCAJES.gira; dentro = dentro.subtract(N.MF().cube([l, l, B + 2], true).translate([0, 0, B / 2])); }
  const fuera = revol([[oP + PIE, 0], [RO - e, 0], [RO, e], [RO, B - e], [RO - e, B], [oP, B], [Rm + r0 + c, B - t], [Rm + r0 + c, t], [oP + PIE, PIE]], seg(2 * RO));
  const zR = B - BAJO, uno = revol([[0, 0], [rEnd, 0], [r0, t], [r0, B - t], [r0 - Math.max(0, zR - (B - t)), zR], [0, zR]], 48);
  const rodillos = []; for (let i = 0; i < n; i++) { const a = (i + 0.5) * 2 * Math.PI / n; rodillos.push(uno.translate([Rm * Math.cos(a), Rm * Math.sin(a), 0])); }
  return { K, dentro, fuera, rodillos, rodillo: uno };
}
export function rodamiento(p) { const Q = piezas(p); return N.union([Q.dentro, Q.fuera].concat(Q.rodillos)); }

// ---------- 🧪 LA PRUEBA: 4 rodamientos pequeños (cada uno con su NÚMERO en relieve) en una tira, y una LLAVE para girarlos ----------
export const MINI = { D: 26, B: 7, cuad: 5 }; // (pequeños para que la prueba sea corta)
export function prueba() {
  const T = tanda(), L = [], M = N.MF(), RO = MINI.D / 2, paso = MINI.D + 4;
  T.forEach((v, i) => {
    const x = i * paso, Q = piezas(Object.assign({ c: v.c, ret: v.ret }, MINI));
    let m = N.union([Q.dentro, Q.fuera].concat(Q.rodillos));
    // la chapita con su número (por detrás, pegada al aro de fuera); el 4 lleva además una rayita debajo (retención media)
    const cifra = N.centraCS(N.texto2(String(v.num), 'gorda', 6)).extrude(1.0).translate([0, RO + 4.2, 1.0]); // (hundida 0,2 en su chapita: una sola pieza)
    m = m.add(M.cube([10, 9.4, 1.2], false).translate([-5, RO - 0.8, 0])).add(cifra);
    if (v.ret === 'media') m = m.add(M.cube([6, 1.0, 1.0], false).translate([-3, RO + 0.2, 1.0]));
    L.push(m.translate([x, 0, 0]));
  });
  L.push(M.cube([3 * paso, 3.6, 1.2], false).translate([0, -RO - 3, 0])); // la tira que los une (solo toca los aros de fuera)
  // la LLAVE: una espiga cuadrada (con la punta achaflanada: entra sin dañar el cuadrado) y unas alas para girar con dos dedos
  const lado = MINI.cuad, hE = 3 + MINI.B - 0.5, esp = M.hull([M.cube([lado, lado, hE - 0.6], true).translate([0, 0, (hE - 0.6) / 2]), M.cube([lado - 1.2, lado - 1.2, 0.01], true).translate([0, 0, hE])]);
  const llave = M.cube([30, 9, 3], true).translate([0, 0, 1.5]).add(esp);
  L.push(llave.translate([1.5 * paso, -RO - 3 - 4 - 4.5, 0]));
  return { m: N.union(L), tanda: T, holguras: T.map(v => v.c) };
}
// ---------- ¿SE SALE UN RODILLO? Simulación: el rodillo pegado a una pista (lo peor) y subido o bajado poco a poco: tiene que CHOCAR
// con un labio antes de salir. Devuelve, arriba y abajo, cuánto sube hasta chocar (mm) o null si sale sin tocar nada.
export function compruebaRetencion(p) {
  const Q = piezas(p), K = Q.K, aros = Q.dentro.add(Q.fuera), a = Math.PI / K.n, out = {};
  for (const [lado, s] of [['arriba', 1], ['abajo', -1]]) {
    out[lado] = [];
    for (const dr of [-K.c, 0, K.c]) { // pegado a la pista de dentro, centrado y pegado a la de fuera
      const rod = Q.rodillo.translate([(K.Rm + dr * 0.98) * Math.cos(a), (K.Rm + dr * 0.98) * Math.sin(a), 0]);
      let choca = null; for (let dz = 0.05; dz <= K.B + 0.1; dz += 0.05) { if (rod.translate([0, 0, s * dz]).intersect(aros).volume() > 0.001) { choca = dz; break; } }
      out[lado].push(choca);
    }
  }
  return { K, out };
}
