// ================= v20 · 📱 CelebriR8 · FUNDAS DE MÓVIL (motor nuevo) =================
// «Que los apartados de móvil tengan más móviles y muchos más diseños: son muy básicos para venta, diferentes estilos»
// (la dueña, 9-10-2026). La funda se imprime con la espalda contra la cama, así que los dibujos de la trasera van
// CALADOS (atraviesan) o GRABADOS (hundidos 0,6 mm desde fuera): nada que sobresalga por debajo.
// Lo que es exacto: alto, ancho y grosor (medidas oficiales de cada móvil, en moviles.js). Lo ESTIMADO: la ventana de
// la cámara, las aberturas y el redondeo. Por eso existe la «prueba rápida»: un marco bajito para ponerle el móvil encima.
import * as N from './nucleo.js';
import * as PT from './patrones.js';
import { movil } from './moviles.js';
import { rectR, circulo } from './motor.js';

export const ESTILOS_FUNDA = {
  liso: { t: 'Lisa' },
  panal: { t: '⬢ Panal calado', p: 'panal' }, voronoi: { t: '🕸️ Voronoi calado', p: 'voronoi' }, circulos: { t: '● Lunares calados', p: 'circulos' }, rombos: { t: '◆ Rombos calados', p: 'rombos' },
  estrellas: { t: '★ Estrellas caladas', p: 'estrellas' }, corazones: { t: '♥ Corazones calados', p: 'corazones' }, ondas: { t: '〰 Ondas caladas', p: 'ondas' }, triangulos: { t: '▲ Triángulos calados', p: 'triangulos' },
  escamas: { t: '🐟 Escamas caladas', p: 'escamas' }, rayas: { t: '▤ Rayas caladas', p: 'rayas' },
  panalGrabado: { t: '⬢ Panal grabado (sin agujeros)', p: 'panal', grabado: 1 }, rombosGrabado: { t: '◆ Rombos grabados', p: 'rombos', grabado: 1 }, ondasGrabado: { t: '〰 Ondas grabadas', p: 'ondas', grabado: 1 },
  nombre: { t: '🔤 Nombre calado', texto: 1 }, nombreGrabado: { t: '🔤 Nombre grabado', texto: 1, grabado: 1 },
  figura: { t: '🦋 Figura calada (emoji)', figura: 1 }, figuraGrabada: { t: '🦋 Figura grabada', figura: 1, grabado: 1 },
  marco: { t: '🔲 Solo marco (bumper)', marco: 1 }, antigolpes: { t: '🛡️ Esquinas antigolpes', golpes: 1 }, ventana: { t: '🪟 Ventana central (ver el logo)', ventana: 1 }
};
const r = (w, h, rad) => N.cs([N.ccw(rectR(w, h, rad))], 'Positive');

// ---------- EL AJUSTE (revisado el 9-10-2026 tras la funda del iPhone 14 en PLA que quedó grande) ----------
// Causa encontrada en la versión 18: en PLA dejaba 0,20 mm por lado (más que su «gira suelto», 0,15), el hueco era 0,3 mm
// más alto que el móvil y el labio que sujeta por delante medía 0,4 mm. Ahora:
//  · PLA y PETG (rígidos): SUS holguras medidas con la «Prueba de holgura» → ajustada 0,05 · estándar 0,10 · holgada 0,15.
//  · TPU (flexible): se estira y abraza, así que el hueco va igual o un poco MÁS PEQUEÑO que el móvil. ESTIMADO.
//  · Profundidad: la del móvil + 0,1 (PLA/PETG) o justa (TPU). Labio de 1,2 mm de grueso con bisel para que entre.
// Nada de esto se da por bueno hasta que ella lo pruebe con el KIT (clips y esquinas, unos 4-5 g) y elija lo que encaja:
// lo que elige se guarda para ESE móvil y ESE material («Medido por ti») y manda sobre todo lo demás.
export const AJUSTE_FUNDA = { pla: { ajustada: 0.05, estandar: 0.10, holgada: 0.15 }, petg: { ajustada: 0.05, estandar: 0.10, holgada: 0.15 }, tpu: { ajustada: -0.20, estandar: -0.10, holgada: 0.00 } };
export const LABIO = { pla: 0.6, petg: 0.7, tpu: 1.2 }, ALTO_EXTRA = { pla: 0.1, petg: 0.1, tpu: 0 };
export const OPS_AJUSTE = [['estandar', 'Estándar'], ['ajustada', 'Más ajustada'], ['holgada', 'Más holgada'], ['medido', '✓ Medido por ti']];
const CLAVE = 'cd.r8.funda.ajuste';
export function ajustesMedidos() { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { return {}; } }
export function ajusteMedido(modelo, material) { return ajustesMedidos()[modelo + '|' + (material || 'pla')] || null; }
export function guardaAjusteMedido(modelo, material, o) { const t = ajustesMedidos(); if (o) t[modelo + '|' + (material || 'pla')] = Object.assign({ fecha: new Date().toISOString().slice(0, 10) }, o); else delete t[modelo + '|' + (material || 'pla')]; try { localStorage.setItem(CLAVE, JSON.stringify(t)); } catch (e) { } return t; }
// iPhone 12 en adelante y Galaxy S24/S25 tienen los lados PLANOS; los demás, redondeados (ESTIMADO)
export const cantoDe = m0 => /iPhone (1[2-7]|Air|16e)|Galaxy S2[45]/.test((m0.marca || '') + ' ' + (m0.modelo || '')) ? 'plano' : 'redondo';
const num = (v, d) => (v === undefined || v === null || v === '' || !isFinite(Number(v)) ? d : Number(v));
// Los valores de verdad con los que se hace la funda (lo que enseña la pantalla y lo que sale en el STL)
export function valoresFunda(p) {
  const m0 = movil(p.modelo) || {}, mat = AJUSTE_FUNDA[p.material] ? p.material : 'pla', med = p.ajuste === 'medido' ? ajusteMedido(p.modelo, mat) : null;
  const base = AJUSTE_FUNDA[mat][p.ajuste] ?? AJUSTE_FUNDA[mat].estandar;
  const hol = med && isFinite(med.holAncho) ? med.holAncho : base;
  return {
    mat, A: num(p.alto, m0.alto || 147.6), W: num(p.ancho, m0.ancho || 71.6), T: num(p.grosor, m0.grosor || 7.8),
    holAncho: num(p.holAncho, med && isFinite(med.holAncho) ? med.holAncho : hol), holLargo: num(p.holLargo, med && isFinite(med.holLargo) ? med.holLargo : hol),
    radio: num(p.radio, med && isFinite(med.radio) ? med.radio : (m0.radio || 7)), prof: num(p.prof, med && isFinite(med.prof) ? med.prof : ALTO_EXTRA[mat]), labio: num(p.labio, med && isFinite(med.labio) ? med.labio : LABIO[mat]),
    pared: num(p.pared, 1.6), fondo: num(p.fondo, 1.4)
  };
}

// p = { modelo | alto, ancho, grosor, radio, camara, camAncho, camAlto, estilo, txt, material, ajuste, holAncho, holLargo, prof, labio, cordon }
export function funda(p) {
  const m0 = movil(p.modelo) || {}, V = valoresFunda(p), mat = V.mat, A = V.A, W = V.W, T = V.T, rad = V.radio, pared = V.pared, fondo = V.fondo, labio = V.labio;
  const camara = p.camara || m0.camara || 'izq', camAn = Number(p.camAncho || m0.camAncho || 56), camAl = Number(p.camAlto || m0.camAlto || 29);
  const E = ESTILOS_FUNDA[p.estilo] || ESTILOS_FUNDA.liso, canto = p.canto || cantoDe(m0);
  const Wi = W + 2 * V.holAncho, Ai = A + 2 * V.holLargo, Ti = T + V.prof, We = Wi + 2 * pared, Ae = Ai + 2 * pared, He = fondo + Ti + 1.2; // 1,2 mm de labio por encima de la pantalla
  // por fuera: caja redondeada (esquinas de pie + cantos suaves)
  let m = N.forma3d('caja', { x: We, y: Ae, z: He, radio: rad + pared, redondeo: Math.min(2.2, He / 2 - 0.1) });
  // el móvil: un hueco con su forma (lados planos o redondeados)
  const movilH = N.forma3d('caja', { x: Wi, y: Ai, z: Ti, radio: rad, redondeo: canto === 'plano' ? Math.min(0.8, Ti / 2 - 0.05) : Math.min(Ti * 0.42, 3.4) }).translate([0, 0, fondo]);
  m = m.subtract(movilH);
  // la boca de arriba: deja el LABIO que sujeta la pantalla; en PLA/PETG con bisel (el móvil entra con un «clic»)
  const bL = Wi - 2 * labio, aL = Ai - 2 * labio, rL = Math.max(0.5, rad - labio), z1 = fondo + Ti - 0.01;
  const boca = mat === 'tpu' ? r(bL, aL, rL).extrude(He).translate([0, 0, z1]) : M().hull([r(bL, aL, rL).extrude(0.01).translate([0, 0, z1]), r(bL + 1.6, aL + 1.6, rL + 0.8).extrude(0.01).translate([0, 0, He + 0.01])]);
  m = m.subtract(boca);
  // ventana de la cámara (por detrás: «izquierda» vista desde atrás = +X vista desde la pantalla)
  if (camara !== 'sin') {
    const cw = camara === 'ancha' ? Wi - 6 : Wi * camAn / 100, ch = Ai * camAl / 100, cx = camara === 'izq' ? Wi / 2 - cw / 2 - 2.5 : 0, cy = Ai / 2 - ch / 2 - 2.5;
    m = m.subtract(r(cw, ch, Math.min(8, Math.min(cw, ch) / 3)).extrude(fondo + 2).translate([cx, cy, -1]));
  }
  // los lados: botones (en los dos lados, de «desde» a «hasta» contando desde arriba) y la abertura de abajo
  const desde = Number(p.desde ?? 14), hasta = Number(p.hasta ?? 62), abajo = Number(p.abajo ?? 62), zc = fondo + T / 2;
  if (p.lados !== false && hasta > desde) { const L = Ai * (hasta - desde) / 100, y = Ai / 2 - Ai * desde / 100 - L / 2; [-1, 1].forEach(k => { m = m.subtract(N.forma3d('caja', { x: pared * 4, y: L, z: T * 0.62, radio: 0, redondeo: 0 }).translate([k * (Wi / 2 + pared), y, zc - T * 0.31])); }); }
  if (abajo > 0) m = m.subtract(N.cs([N.ccw(N.ranura2(Wi * abajo / 100, T * 0.7))], 'Positive').extrude(pared * 4).rotate([90, 0, 0]).translate([0, -Ai / 2 + pared * 2, zc]));
  // la trasera: calado, grabado, nombre, figura, marco…
  const zonaW = Wi - 10, camH = camara === 'sin' ? 0 : Ai * camAl / 100 + 6, zonaH = Ai - 12 - camH, zonaY = -camH / 2;
  const prof = E.grabado ? 0.7 : fondo + 2, z0 = E.grabado ? -0.01 : -1;
  if (E.p) { const ag = PT.agujeros2D(E.p, zonaW, zonaH, p.celda || 9, p.puente || 2, p.semilla || 7).intersect(r(zonaW, zonaH, 6)).translate([0, zonaY]); m = m.subtract(ag.extrude(prof).translate([0, 0, z0])); }
  if (E.texto || E.figura) {
    const t = String(p.txt || (E.figura ? '🦋' : 'NOMBRE')).trim() || 'A'; let s = N.texto2(t, p.fuente || 'gorda', 30, true); // al revés: se lee bien mirando la trasera
    const b = N.cajaCS(s), k = Math.min(zonaW * 0.8 / b.w, zonaH * 0.6 / b.h); s = N.centraCS(s).scale([k, k]);
    if (t.length > 3 && !E.figura && b.w * k < zonaH * 0.8 && b.w > b.h * 2.2) { const k2 = Math.min(zonaH * 0.85 / b.w, zonaW * 0.7 / b.h); s = N.centraCS(N.texto2(t, p.fuente || 'gorda', 30, true)).scale([k2, k2]).rotate(90); } // palabras largas: a lo largo
    m = m.subtract(s.translate([0, zonaY]).extrude(prof).translate([0, 0, z0]));
  }
  if (E.marco) m = m.subtract(r(Wi - 14, Ai - 14 - camH, 8).extrude(fondo + 2).translate([0, zonaY + 1, -1]));
  if (E.ventana) m = m.subtract(N.cs([N.ccw(circulo(Math.min(Wi, Ai) * 0.2, 0, 0, 64))], 'Positive').extrude(fondo + 2).translate([0, -Ai * 0.05, -1]));
  if (E.golpes) { const L = []; [-1, 1].forEach(a => [-1, 1].forEach(b2 => L.push(M().sphere(rad * 0.75, 32).scale([1, 1, (He / 2) / (rad * 0.75)]).translate([a * (We / 2 - rad * 0.55), b2 * (Ae / 2 - rad * 0.55), He / 2])))); m = m.add(N.union(L).subtract(movilH).subtract(r(Wi - 2 * labio, Ai - 2 * labio, Math.max(0.5, rad - labio)).extrude(He * 2).translate([0, 0, fondo + T * 0.5]))).trimByPlane([0, 0, 1], 0); }
  if (p.cordon) { // anilla en la esquina de abajo para un colgante o un cordón cruzado
    const an = N.forma3d('toro', { d: 9, grueso: 2.6 }); [-1, 1].forEach(k => { m = m.add(an.translate([k * (We / 2 - 1.5), -Ae / 2 + 1.5, 0])); });
  }
  return m;
}
// Para las líneas azules de la pantalla: dónde está cada ajuste en la funda (puntos 3D, en mm)
export function anclasFunda(p) {
  const V = valoresFunda(p), Wi = V.W + 2 * V.holAncho, Ai = V.A + 2 * V.holLargo, Ti = V.T + V.prof, z = V.fondo + Ti / 2, c = 0.293 * V.radio;
  return { holAncho: [Wi / 2, 0, z], ancho: [-Wi / 2, Ai * 0.15, z], largo: [0, Ai / 2, z], holLargo: [0, -Ai / 2, z], radio: [Wi / 2 - c, Ai / 2 - c, z], prof: [-Wi / 2 + 4, -Ai * 0.3, V.fondo + Ti], labio: [0, Ai / 2 - V.labio, V.fondo + Ti + 1.2] };
}

// 🧪 EL KIT DE PRUEBA (unos 4-5 g de PLA): 3 CLIPS (tiras de la funda de 6 mm que se meten por abajo del móvil hasta la
// mitad: prueban el ancho, el grosor y el labio) con 1, 2 y 3 puntos = más ajustada, estándar, más holgada; y 4 ESQUINAS con
// distinto redondeo (1 a 4 puntos) para ver cuál abraza la esquina del móvil sin dejar hueco. Todo con la profundidad y el
// labio que haya ahora en pantalla.
export function kitFunda(p) {
  const V = valoresFunda(p), mat = V.mat, A = AJUSTE_FUNDA[mat], rad0 = V.radio;
  const base = Object.assign({}, p, { estilo: 'liso', camara: 'sin', lados: false, abajo: 0, cordon: false, prof: V.prof, labio: V.labio, holLargo: V.holLargo }), L = [];
  const puntos = (n, x, y, fondo) => N.union(Array.from({ length: n }, (_, j) => N.forma3d('cilindro', { d: 1.8, h: fondo + 2 }).translate([x + (j - (n - 1) / 2) * 3.6, y, -1])));
  const CLIPS = [['ajustada', 1], ['estandar', 2], ['holgada', 3]];
  CLIPS.forEach(([k, n], i) => {
    const f = funda(Object.assign({}, base, { holAncho: A[k], holLargo: A[k], radio: rad0 })), b = N.caja(f);
    const clip = f.intersect(N.forma3d('caja', { x: b.dims[0] + 2, y: 6, z: b.dims[2] + 2 }).translate([0, 0, -1])).subtract(puntos(n, 0, 0, V.fondo));
    L.push({ m: clip.translate([0, i * 12, 0]), t: 'clip_' + n + '_' + k, hol: A[k] });
  });
  const RADIOS = radiosKit(rad0), lado = Math.max(16, rad0 + 9), tira = 6;
  RADIOS.forEach((rad, i) => {
    const f = funda(Object.assign({}, base, { radio: rad, holAncho: V.holAncho })), b = N.caja(f);
    let esq = f.intersect(N.forma3d('caja', { x: lado, y: lado, z: b.dims[2] + 2 }).translate([b.max[0] - lado / 2 + 0.5, b.max[1] - lado / 2 + 0.5, -1]));
    // solo una tira de 6 mm junto a la pared (lo que prueba la esquina): menos plástico
    esq = esq.subtract(N.forma3d('caja', { x: lado * 2, y: lado * 2, z: V.fondo + 2 }).translate([b.max[0] - tira - lado, b.max[1] - tira - lado, -1]));
    esq = esq.subtract(puntos(i + 1, b.max[0] - tira - 6 - i * 1.8, b.max[1] - tira / 2 - 0.4, V.fondo)).translate([-(b.max[0] - lado / 2), -(b.max[1] - lado / 2), 0]);
    L.push({ m: esq.translate([V.W / 2 + 26 + (i % 2) * 24, Math.floor(i / 2) * 24, 0]), t: 'esquina_' + (i + 1) + '_r' + String(rad).replace('.', ','), radio: rad });
  });
  const todo = N.union(L.map(x => x.m)); todo.partes = L; todo.radios = RADIOS; todo.clips = CLIPS.map(([k]) => A[k]);
  return todo;
}
export const radiosKit = r0 => [r0 - 1.5, r0, r0 + 1.5, r0 + 3].map(x => Math.max(2, Math.round(x * 10) / 10));
const M = () => N.MF();
