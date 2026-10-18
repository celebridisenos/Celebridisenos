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
  cuadros: { t: '▦ Cuadros calados', p: 'cuadros' },
  circulosGrabado: { t: '● Lunares grabados', p: 'circulos', grabado: 1 }, estrellasGrabado: { t: '★ Estrellas grabadas', p: 'estrellas', grabado: 1 }, corazonesGrabado: { t: '♥ Corazones grabados', p: 'corazones', grabado: 1 },
  voronoiGrabado: { t: '🕸️ Voronoi grabado', p: 'voronoi', grabado: 1 }, escamasGrabado: { t: '🐟 Escamas grabadas', p: 'escamas', grabado: 1 }, triangulosGrabado: { t: '▲ Triángulos grabados', p: 'triangulos', grabado: 1 }, rayasGrabado: { t: '▤ Rayas grabadas', p: 'rayas', grabado: 1 },
  mediaPanal: { t: '◒ Media funda: panal abajo, lisa arriba', p: 'panal', zona: 'abajo' }, mediaRombos: { t: '◒ Media funda: rombos abajo', p: 'rombos', zona: 'abajo' }, franjaOndas: { t: '▬ Franja de ondas en el centro', p: 'ondas', zona: 'franja' }, franjaEstrellas: { t: '▬ Franja de estrellas en el centro', p: 'estrellas', zona: 'franja' },
  nombre: { t: '🔤 Nombre calado', texto: 1 }, nombreGrabado: { t: '🔤 Nombre grabado', texto: 1, grabado: 1 },
  figura: { t: '🦋 Figura calada (emoji)', figura: 1 }, figuraGrabada: { t: '🦋 Figura grabada', figura: 1, grabado: 1 },
  // 18-10-2026 · seis dibujos nuevos, calados y grabados
  hojas: { t: '🍃 Hojas en espiga caladas', p: 'hojas' }, hojasGrabado: { t: '🍃 Hojas en espiga grabadas', p: 'hojas', grabado: 1 }, flores: { t: '🌸 Flores caladas', p: 'flores' }, floresGrabado: { t: '🌸 Flores grabadas', p: 'flores', grabado: 1 },
  gotas: { t: '💧 Gotas caladas', p: 'gotas' }, cruces: { t: '✚ Cruces caladas', p: 'cruces' }, chevron: { t: '⋀ Zigzag calado', p: 'chevron' }, chevronGrabado: { t: '⋀ Zigzag grabado', p: 'chevron', grabado: 1 },
  degradado: { t: '◐ Lunares en degradado (calados)', p: 'degradado' }, degradadoGrabado: { t: '◐ Lunares en degradado (grabados)', p: 'degradado', grabado: 1 },
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
// v30.4 · la dueña: «las fundas las he probado y se rompen nada más ponerlas» → en rígido, labio algo más corto (y sin labio en las
// esquinas, ver funda()), pared de 2 mm y huecos de botones que no cortan el raíl de arriba
export const LABIO = { pla: 0.5, petg: 0.6, tpu: 1.2 }, ALTO_EXTRA = { pla: 0.1, petg: 0.1, tpu: 0 };
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
    pared: num(p.pared, mat === 'tpu' ? 1.6 : 2.0), fondo: num(p.fondo, 1.4)
  };
}

// p = { modelo | alto, ancho, grosor, radio, camara, camAncho, camAlto, estilo, txt, material, ajuste, holAncho, holLargo, prof, labio, cordon }
export function funda(p) {
  const m0 = movil(p.modelo) || {}, V = valoresFunda(p), mat = V.mat, A = V.A, W = V.W, T = V.T, rad = V.radio, pared = V.pared, fondo = V.fondo, labio = V.labio;
  const camara = p.camara || m0.camara || 'izq', camAn = Number(p.camAncho || m0.camAncho || 56), camAl = Number(p.camAlto || m0.camAlto || 29);
  const E = ESTILOS_FUNDA[p.estilo] || ESTILOS_FUNDA.liso, canto = p.canto || cantoDe(m0);
  const Wi = W + 2 * V.holAncho, Ai = A + 2 * V.holLargo, Ti = T + V.prof, We = Wi + 2 * pared, Ae = Ai + 2 * pared, He = fondo + Ti + 1.2; // 1,2 mm de labio por encima de la pantalla
  // por fuera: caja redondeada (esquinas de pie + cantos suaves)
  // v40.2 · «las esquinas están muy puntiagudas» (ella, 13-10-2026, con la funda rígida del iPhone puesta: «ha entrado bien»):
  //   a) por FUERA la esquina va más redonda que por dentro (radio de dentro + pared + hasta 1,5: en la diagonal quedan ≥ 2,2 mm);
  //   b) el canto de arriba, más suave; c) en las esquinas el borde BAJA hasta casi el ras de la pantalla, en rampa (ver más abajo).
  const suaves = p.esquinas !== 'altas', radFuera = rad + pared + (suaves ? Math.min(1.5, pared * 0.75) : 0);
  let m = N.forma3d('caja', { x: We, y: Ae, z: He, radio: radFuera, redondeo: Math.min(suaves ? 2.8 : 2.2, He / 2 - 0.1) });
  // el móvil: un hueco con su forma (lados planos o redondeados)
  const movilH = N.forma3d('caja', { x: Wi, y: Ai, z: Ti, radio: rad, redondeo: canto === 'plano' ? Math.min(0.8, Ti / 2 - 0.05) : Math.min(Ti * 0.42, 3.4) }).translate([0, 0, fondo]);
  m = m.subtract(movilH);
  // la boca de arriba: deja el LABIO que sujeta la pantalla; en PLA/PETG con bisel (el móvil entra con un «clic»)
  const bL = Wi - 2 * labio, aL = Ai - 2 * labio, rL = Math.max(0.5, rad - labio), z1 = fondo + Ti - 0.01;
  const boca = mat === 'tpu' ? r(bL, aL, rL).extrude(He).translate([0, 0, z1]) : M().hull([r(bL, aL, rL).extrude(0.01).translate([0, 0, z1]), r(bL + 1.6, aL + 1.6, rL + 0.8).extrude(0.01).translate([0, 0, He + 0.01])]);
  m = m.subtract(boca);
  // v30.4 · RÍGIDA (PLA/PETG): sin labio en las 4 esquinas. Ahí la pared no puede doblarse y era donde se partía al meter el móvil;
  // así entra doblando solo los lados largos (que ceden sin romperse) y el labio de los lados lo sujeta igual.
  if (mat !== 'tpu' && !suaves) { const sq = rad + 5, esq = []; [-1, 1].forEach(a => [-1, 1].forEach(b => esq.push(r(sq, sq, 0).translate([a * (Wi / 2 - sq / 2), b * (Ai / 2 - sq / 2)])))); m = m.subtract(N.csUnion(esq).intersect(r(Wi, Ai, rad)).extrude(He).translate([0, 0, z1])); }
  if (suaves) { // el labio se acaba en rampa a 45° antes de cada esquina y, en la esquina, el borde baja a 0,3 mm sobre la pantalla (también en rampa)
    const zBajo = fondo + Ti + 0.3, dz = He - zBajo, cortes = [];
    [-1, 1].forEach(a => [-1, 1].forEach(b => {
      if (mat !== 'tpu') { const sq = rad + 4, d = He - z1 + 0.4; cortes.push(M().hull([r(sq, sq, 1.5).extrude(0.01).translate([a * (Wi / 2 - sq / 2), b * (Ai / 2 - sq / 2), z1]), r(sq + d, sq + d, 1.5).extrude(0.01).translate([a * (Wi / 2 - (sq + d) / 2), b * (Ai / 2 - (sq + d) / 2), He + 0.4])]).intersect(r(Wi, Ai, rad).extrude(He + 2))); }
      const S = radFuera + 3, d2 = dz * 1.6; cortes.push(M().hull([r(S, S, 2).extrude(0.01).translate([a * (We / 2 - S / 2 + 1), b * (Ae / 2 - S / 2 + 1), zBajo]), r(S + d2, S + d2, 2).extrude(0.01).translate([a * (We / 2 - (S + d2) / 2 + 1), b * (Ae / 2 - (S + d2) / 2 + 1), He + 0.02])]));
    }));
    m = m.subtract(N.union(cortes));
  }
  // ventana de la cámara (por detrás: «izquierda» vista desde atrás = +X vista desde la pantalla)
  if (camara !== 'sin') {
    const cw = camara === 'ancha' ? Wi - 6 : Wi * camAn / 100, ch = Ai * camAl / 100, cx = camara === 'izq' ? Wi / 2 - cw / 2 - 2.5 : 0, cy = Ai / 2 - ch / 2 - 2.5;
    m = m.subtract(r(cw, ch, Math.min(8, Math.min(cw, ch) / 3)).extrude(fondo + 2).translate([cx, cy, -1]));
  }
  // los lados: botones (en los dos lados, de «desde» a «hasta» contando desde arriba) y la abertura de abajo
  const desde = Number(p.desde ?? 14), hasta = Number(p.hasta ?? 62), abajo = Number(p.abajo ?? 62), zc = fondo + T / 2;
  // botones: en rígido, el hueco es más bajo (deja arriba un raíl de casi 4 mm) y con las esquinas REDONDEADAS (de una esquina en
  // ángulo recto sale la grieta); en TPU, como antes
  if (p.lados !== false && hasta > desde) { const L = Ai * (hasta - desde) / 100, y = Ai / 2 - Ai * desde / 100 - L / 2, margen = p.margenBotones === undefined ? 3 : Number(p.margenBotones) || 0, hz = mat === 'tpu' ? T * 0.66 : T * 0.6, z0 = mat === 'tpu' ? zc - T * 0.33 : zc - T * 0.3; // v40.2: «los botones están al límite» → el hueco llega 0,3 × grosor por encima del centro (antes 0,2) y es 3 mm más largo por cada punta
    const ven = r(L + 2 * margen, hz, Math.min(2.5, hz / 2 - 0.05)).extrude(pared * 4).rotate([90, 0, 0]).rotate([0, 0, 90]); [-1, 1].forEach(k => { m = m.subtract(ven.translate([k * (Wi / 2 + pared) - pared * 2, y, z0 + hz / 2])); }); }
  if (abajo > 0) m = m.subtract(N.cs([N.ccw(N.ranura2(Wi * abajo / 100, T * 0.7))], 'Positive').extrude(pared * 4).rotate([90, 0, 0]).translate([0, -Ai / 2 + pared * 2, zc]));
  // la trasera: calado, grabado, nombre, figura, marco…
  const zonaW = Wi - 10, camH = camara === 'sin' ? 0 : Ai * camAl / 100 + 6, zonaH = Ai - 12 - camH, zonaY = -camH / 2;
  const prof = E.grabado ? 0.7 : fondo + 2, z0 = E.grabado ? -0.01 : -1;
  if (E.p) { // (v40.2) zona: toda la trasera · solo la mitad de abajo · una franja en el centro
    const zh = E.zona === 'abajo' ? zonaH * 0.5 : E.zona === 'franja' ? Math.min(zonaH * 0.3, 44) : zonaH, zy = E.zona === 'abajo' ? zonaY - zonaH * 0.25 : zonaY;
    const ag = PT.agujeros2D(E.p, zonaW, zh, p.celda || 9, p.puente || 2, p.semilla || 7).intersect(r(zonaW, zh, 6)).translate([0, zy]); m = m.subtract(ag.extrude(prof).translate([0, 0, z0])); }
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
// ================= v40.2 · 🧩 FUNDA DE DOS PIEZAS QUE ENCAJAN · 🎒 JUEGO «4 EN 1» =================
// Ella (13-10-2026): «más diseños de fundas… 4 en 1 en una funda… también fundas para encajar de múltiples partes».
// DOS PIEZAS (para PLA / PETG, que no se doblan): el CUERPO (de arriba hasta casi abajo) y un CAPUCHÓN de abajo. El móvil entra
// DESLIZANDO por abajo (no hay que abrir la funda a la fuerza, que es por donde se partían) y el capuchón lo cierra. La unión es a
// media pared: del cuerpo salen dos LENGÜETAS (la mitad de dentro de cada pared lateral, 9 mm) y el capuchón las abraza por fuera
// con su media pared; un botoncito en cada lengüeta hace «clic» en su hoyo. La unión va en la zona sin botones (del 78 % al 84 % del
// largo). Las dos piezas se imprimen con la espalda en la cama, sin soportes. La pared pasa a 2,4 mm (1,1 + 1,1 en la unión).
export const UNION_DOS = { largo: 9, hol: 0.15, donde: 0.78 };
export function fundaDos(p) {
  const p2 = Object.assign({}, p, { pared: Math.max(2.4, Number(p.pared) || 0), hasta: Math.min(Number(p.hasta ?? 62), 70), cordon: false }), V = valoresFunda(p2), f = funda(p2), b = N.caja(f);
  const Wi = V.W + 2 * V.holAncho, Ai = V.A + 2 * V.holLargo, Ti = V.T + V.prof, J = UNION_DOS.largo, h = UNION_DOS.hol, yS = Ai / 2 - Ai * UNION_DOS.donde, G = 400, alto = b.dims[2] + 4;
  const caja = (x0, x1, y0, y1, z0 = -2, z1 = alto) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
  const xi = Wi / 2 - 1.8, xm = Wi / 2 + V.pared / 2;                                                // desde dentro del labio hasta la mitad de la pared
  const leng = k => (k > 0 ? caja(xi, xm - h / 2, yS - J, yS + 0.01) : caja(-(xm - h / 2), -xi, yS - J, yS + 0.01));
  const sitio = k => (k > 0 ? caja(xi - h, xm + h / 2, yS - J - 0.3, yS + 0.02) : caja(-(xm + h / 2), -(xi - h), yS - J - 0.3, yS + 0.02));
  // el «clic»: medio botón en la cara de fuera de cada lengüeta y su hoyo en el capuchón
  const zc = V.fondo + Ti / 2, boton = (k, mas = 0) => M().cylinder(Ti * 0.5, 0.9 + mas, 0.9 + mas, 24).translate([k * (xm - h / 2 - 0.55), yS - J / 2, zc - Ti * 0.25]);
  let cuerpo = f.intersect(caja(-G, G, yS, G)).add(f.intersect(leng(1))).add(f.intersect(leng(-1))).add(boton(1)).add(boton(-1));
  let capuchon = f.intersect(caja(-G, G, -G, yS - 0.12)).subtract(sitio(1)).subtract(sitio(-1)).subtract(boton(1, 0.12)).subtract(boton(-1, 0.12));
  return { cuerpo, capuchon, V, yS, J, dims: b.dims };
}
// 🎒 4 EN 1: la funda (1) con sus anillas para colgarla (2) y un SOPORTE de mesa a la medida de ESA funda (3: de pie o tumbado)
// con ranura para una tarjeta y paso para el cable del cargador (4).
export function soporteFunda(p) {
  const V = valoresFunda(p), We = V.W + 2 * V.holAncho + 2 * V.pared, He = V.fondo + V.T + V.prof + 1.2, an = Math.max(96, We + 26), fo = 66, al = 24, ran = He + 0.9;
  let s = r(an, fo, 8).extrude(al);
  s = s.subtract(M().cube([We + 1.2, ran, 60], false).translate([-(We + 1.2) / 2, -ran / 2, 0]).rotate([-16, 0, 0]).translate([0, 4, 7]));            // la ranura del móvil con su funda, echada 16° hacia atrás
  [-1, 1].forEach(k => { s = s.subtract(M().cube([13.6, ran + 3.6, 22], false).translate([k * (We / 2 - 1.5) - 6.8, -(ran + 3.6) / 2, -6]).rotate([-16, 0, 0]).translate([0, 4, 7])); });   // sitio para las dos anillas de abajo de la funda
  s = s.subtract(M().cube([14, fo, 60], false).translate([-7, 4, 7]));                                                                              // el paso del cable (del fondo de la ranura hacia atrás)
  s = s.subtract(M().cube([87.2, 2, 30], false).translate([-43.6, -fo / 2 + 9, al - 11]));                                                          // la ranura de la tarjeta (85,6 mm), delante
  s = s.subtract(r(an - 30, 12, 5).extrude(30).translate([0, -fo / 2 + 22, al - 5]));                                                               // una bandejita para clips, anillos o los auriculares
  return s;
}
// lo que se imprime según el formato: 'una' (la de siempre) · 'dos' (cuerpo + capuchón) · 'cuatro' (funda con anillas + soporte) · 'dosMontada' / 'cuatroMontado' (solo para mirar)
export function fundaFormato(p) {
  const fmt = p.formato || 'una', lado = (L, hueco = 8) => { let x = 0; return N.union(L.map(m => { const b = N.caja(m), q = m.translate([x - b.min[0], -(b.min[1] + b.max[1]) / 2, -b.min[2]]); x += b.dims[0] + hueco; return q; })); };
  // 🧪 la prueba de la unión: solo los 2 cm de cada pieza donde encajan (lengüetas, manga y «clic»). Minutos y pocos gramos, antes de la funda entera.
  if (fmt === 'dosPrueba') { const D = fundaDos(p), G = 400, tramo = (y0, y1) => M().cube([2 * G, y1 - y0, 2 * G], false).translate([-G, y0, -G]); return lado([D.cuerpo.intersect(tramo(D.yS - D.J - 0.5, D.yS + 12)), D.capuchon.intersect(tramo(D.yS - D.J - 12, D.yS + 0.5))]); }
  if (fmt === 'dos' || fmt === 'dosMontada') { const D = fundaDos(p); return fmt === 'dos' ? lado([D.cuerpo, D.capuchon]) : D.cuerpo.add(D.capuchon); }
  if (fmt === 'cuatro' || fmt === 'cuatroMontado') { const f = funda(Object.assign({}, p, { cordon: true })), s = soporteFunda(p); if (fmt === 'cuatro') return lado([f, s]);
    const V = valoresFunda(p), He = V.fondo + V.T + V.prof + 1.2, Ae = V.A + 2 * V.holLargo + 2 * V.pared; return s.add(f.translate([0, Ae / 2, -He / 2]).rotate([90 - 16, 0, 0]).translate([0, 4, 7.2])); }
  return funda(p);
}
export const FORMATOS_FUNDA = [['una', 'Una pieza (la de siempre)'], ['dos', '🧩 Dos piezas que encajan (el móvil entra deslizando)'], ['dosPrueba', '🧪 Prueba de la unión de dos piezas (dos aros de 2 cm: imprímela antes)'], ['cuatro', '🎒 4 en 1: funda + anillas + soporte con tarjetero y paso de cable']];
export const radiosKit = r0 => [r0 - 1.5, r0, r0 + 1.5, r0 + 3].map(x => Math.max(2, Math.round(x * 10) / 10));
const M = () => N.MF();
