// ================= 17-10-2026 · 🔐 CERRADURA DE DISCOS (la de las cajas con llave, nueva) =================
// Ella: «las cajas con llave: el mecanismo revísalo, es muy simple y fácil de abrir; eso no es vendible; piensa otra estrategia y llave».
// La de antes era un bombín con guardas: cualquier cosa plana (un destornillador fino) lo giraba. Esta es una cerradura de DISCOS
// GIRATORIOS (la idea de las de alta seguridad, toda impresa y SIN MUELLES):
//  · dentro del bombín hay 5 DISCOS, separados por 4 SEPARADORES que no giran. Cada disco tiene una MUESCA en el borde, en un sitio distinto.
//  · una BARRA LATERAL, abajo, une el bombín con la caja (está metida en una ranura del agujero): mientras la barra esté ahí, el bombín no gira.
//  · la LLAVE es una media caña con 5 cortes en ángulo (cada uno de 0 a 4 pasos de 22,5°). Al girarla, cada disco empieza a moverse
//    cuando su corte lo alcanza: con SU llave, al llegar a ~115° las 5 muescas quedan juntas debajo de la barra; la barra cae en ellas y el
//    bombín (con la leva de siempre) gira el cuarto de vuelta que abre la tapa. Al volver, la llave devuelve los discos a su sitio.
//  · con otra llave (un corte distinto), con un destornillador o sin llave, alguna muesca no está debajo y la barra no puede bajar.
//  · 1.320 llaves distintas (5 cortes de 0 a 4, con algún 0 y algún 4: así ninguna llave «corrida» un paso sirve).
//  · la barra baja por su peso cuando el bombín vuelve a «cerrado» (va abajo): no necesita muelle; unos topes marcan 0° y 90°.
// Todo se comprueba MONTADO en el ordenador (test/unit/cerradura.mjs): su llave abre; con un corte cambiado (en cualquier disco, por
// arriba o por abajo), con «todo 0» (un destornillador) o sin llave, la barra choca; la llave entra y gira sin rozar; no se puede sacar
// a medio girar; el bombín cerrado no gira; los topes; y cada pieza se imprime sin soportes.
// Coordenadas «de eje»: X a lo ancho, Y hacia ARRIBA, Z hacia DENTRO de la caja (0 = cara de fuera de la pared). θ se mide de +X a +Y.
// Para abrir, el bombín gira con θ bajando (sentido de las agujas, visto desde fuera) en las caras frente/izquierda; en la derecha, al revés
// (todo se refleja). `enCaja` lo pasa a las coordenadas de la cara de cajas_pro.js (x = u, y = hacia dentro, z = altura).
import * as N from './nucleo.js';

const M = () => N.MF(), CS = () => N.CSX();
const RAD = Math.PI / 180;
export const DD = {
  RK: 4.0, HK: 0.15, RO: 4.25,             // llave: media caña de radio 4 con la cara plana 0,15 por encima del eje · hueco de los discos (media luna)
  RD: 7.5, RG: 6.1, GW: 1.15, GS: 20,      // discos: radio, fondo de la muesca, medio ancho del fondo y las paredes a 20°
  TD: 2.0, TS: 1.0, N: 5, PASO: 22.5,      // grueso de disco y separador · 5 discos · un paso de corte
  RS: 7.5, RSH: 4.45,                      // separadores: radio y agujero (la llave gira suelta)
  RI: 7.75, RC: 9.35, RH: 9.6,             // bombín: por dentro y por fuera · agujero de la caja
  RT: 12.5, RF: 13, FL: 2.4,               // refuerzo de la caja · pestaña del bombín (por fuera) y su grueso
  SW: 0.9, SH: 2.6,                        // barra lateral: medio ancho y alto
  Z0: 1.8, HEX: 7, GRUESO: 5,              // donde empieza la pila de discos · el hexágono de la leva (el de siempre)
  TB: 135, RB: 11.15,                      // el tope de la pared (dentro de la pestaña): ángulo y radio
};
const K = DD;
export const zDisco = k => K.Z0 + k * (K.TD + K.TS);
export const Z_FIN = K.Z0 + K.N * K.TD + (K.N - 1) * K.TS;   // 15,8: donde acaba la pila
export const ZC = Z_FIN + 0.4;                                // 16,2: empieza el tapón (0,4 de juego)
export const ZH = ZC + 2;                                     // 18,2: acaba el bombín (y el refuerzo de la caja)
export const EPS = Math.asin(K.HK / K.RK) / RAD;              // lo que gira la llave antes de tocar un disco sin corte (2,15°)
export const KF = 90 + K.PASO + EPS;                          // a estos grados de llave, las muescas quedan juntas debajo de la barra
export const KT = KF + 90;                                    // y aquí, abierta (el bombín ha girado su cuarto de vuelta)
const RIN = { cerrada: K.RD + 0.1, abierta: K.RG + 0.1 };     // lo de dentro de la barra: encima de los discos / metida en las muescas

// ---------- el código: 5 cifras de 0 a 4 (cuántos pasos de 22,5° lleva cada corte), con algún 0 y algún 4 ----------
export function codigo(c) {
  const s = String(c == null ? '' : c).trim();
  if (/^[0-4]{5}$/.test(s)) return s;
  // los de antes (3 letras N/C/L) y cualquier otra cosa: uno fijo sacado de ese texto (siempre el mismo para el mismo texto)
  let h = 2166136261; for (const ch of s || 'LCL') { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const d = Array.from({ length: 5 }, (_, i) => (h >>> (i * 3)) % 5), a = h % 5, b = (a + 1 + ((h >>> 20) % 4)) % 5; d[a] = 0; d[b] = 4;
  return d.join('');
}
export const codigoValido = s => /^[0-4]{5}$/.test(String(s || '')) && /0/.test(s) && /4/.test(s);
export const cortes = cod => codigo(cod).split('').map(x => Number(x) * K.PASO);
// cuánto ha girado cada disco con la llave a κ grados (con la llave cuyo código es «cod»)
export const giroDisco = (cod, k, kappa) => Math.max(0, kappa - cortes(cod)[k] - EPS);
export const giroBombin = kappa => Math.min(90, Math.max(0, kappa - KF));
// dónde está la muesca de cada disco en reposo (θ): al girar KF, acaba abajo (−90°)
export const muesca = (cod, k) => -90 + (KF - cortes(cod)[k] - EPS);

// ---------- ayudas ----------
const sector = (r, a0, a1, n = 48) => { const P = [[0, 0]]; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * RAD; P.push([r * Math.cos(a), r * Math.sin(a)]); } return N.cs([N.ccw(P)], 'Positive'); };
const circ = (r, n) => CS().circle(r, n || Math.max(32, Math.round(r * 10)));
const rect = (x0, x1, y0, y1) => CS().square([x1 - x0, y1 - y0]).translate([x0, y0]);
const ext = (cs, z0, z1) => cs.extrude(z1 - z0).translate([0, 0, z0]);
const cil = (r, z0, z1) => M().cylinder(z1 - z0, r, r, Math.max(32, Math.round(r * 10))).translate([0, 0, z0]);
const caja = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);
const mediaLuna = (r, y0) => circ(r).intersect(rect(-r - 1, r + 1, y0, r + 1));
const hexagono = d => N.cs([N.poligono2(6, d / Math.cos(Math.PI / 6), 0)], 'Positive');

// ---------- las piezas (en coordenadas de eje, cerradas: llave a 0°) ----------
// la LLAVE: media caña con sus 5 cortes, el cuello que la retiene (no sale a medio girar) y la cabeza plana para cogerla
export function llave(cod) {
  const C = cortes(cod), zA = -K.FL - 0.1, zB = Z_FIN + 0.25;
  let m = ext(mediaLuna(K.RK, K.HK), zA - 0.6, zB); // (empieza dentro de la cabeza)
  m = m.subtract(ext(circ(K.RK + 1).subtract(circ(2.8)), 0.3, K.Z0 + 0.05)); // el cuello: por ahí pasa el labio del bombín
  // cada corte: la cara va a 0,15 del eje, paralela a la línea de «c» grados (como la cara plana): así todos los discos arrancan igual
  C.forEach((c, k) => { if (c > 0) m = m.subtract(ext(rect(-12, 12, -12, K.HK).rotate(c), zDisco(k) - 0.5, Math.min(zB + 1, zDisco(k) + K.TD + 0.5))); });
  m = m.intersect(M().cylinder(1.2, K.RK + 0.01, K.RK - 0.8, 48).translate([0, 0, zB - 1.2]).add(cil(K.RK + 0.01, zA - 1, zB - 1.19))); // la punta, achaflanada (entra fácil)
  // la cabeza (plana, a ras de la cara plana de la llave): un óvalo de 22 × 24 con su agujero para la anilla
  const cab = CS().circle(11, 64).scale([1, 1.1]).translate([0, -14.6]).subtract(CS().circle(3, 32).translate([0, -19.5])).add(rect(-6, 6, -4.5, 0)); // (el cuello, más ancho que el agujero: hace de tope)
  const cabeza = cab.extrude(2.6).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, K.HK, zA - 0.05, 1]); // (perfil en X-Z, grueso hacia +Y)
  return m.add(cabeza);
}
// un DISCO (k = 0…4, de delante a atrás): aro con el hueco en media luna, su muesca y k+1 puntitos para saber cuál es
export function disco(cod, k) {
  let s = circ(K.RD, 96).subtract(mediaLuna(K.RO, 0));
  const t = Math.tan(K.GS * RAD), Rf = K.RD + 1, g = N.cs([N.ccw([[-K.GW, -K.RG], [K.GW, -K.RG], [K.GW + (Rf - K.RG) * t, -Rf], [-K.GW - (Rf - K.RG) * t, -Rf]])], 'Positive');
  s = s.subtract(g.rotate(muesca(cod, k) + 90));
  for (let j = 0; j <= k; j++) s = s.subtract(circ(0.5, 16).translate([5.6 * Math.cos((118 + 13 * j) * RAD), 5.6 * Math.sin((118 + 13 * j) * RAD)]));
  return ext(s, zDisco(k), zDisco(k) + K.TD);
}
// un SEPARADOR (no gira: su pestaña va en la ranura de arriba del bombín; abajo, hueco para la barra)
export function separador(k) {
  const s = circ(K.RS, 96).subtract(circ(K.RSH, 64)).subtract(rect(-1.4, 1.4, -K.RS - 1, -5.8)).add(rect(-1.0, 1.0, K.RS - 0.5, K.RI + 0.6));
  return ext(s, zDisco(k) + K.TD, zDisco(k) + K.TD + K.TS);
}
// la BARRA LATERAL (abajo): cerrada = metida en la ranura de la caja; abierta = 1,4 mm más arriba, en las muescas
export function barra(abierta = false) {
  const r0 = abierta ? RIN.abierta : RIN.cerrada, r1 = r0 + K.SH, c = 0.45;
  const s = N.cs([N.ccw([[-K.SW, -r0], [K.SW, -r0], [K.SW, -r1 + c], [K.SW - c, -r1], [-K.SW + c, -r1], [-K.SW, -r1 + c]])], 'Positive');
  return ext(s, K.Z0 + 0.05, ZC - 0.05);
}
// el BOMBÍN: pestaña por fuera (con la ranura de los topes por detrás), tubo, placa de delante con el labio que retiene la llave,
// ranura de la barra (abajo), ranura de las pestañas de los separadores (arriba) y las 2 ventanitas donde encaja el tapón
export function bombin() {
  let m = cil(K.RF, -K.FL - 0.1, -0.1).add(cil(K.RC, -0.11, ZH));
  m = m.subtract(cil(K.RI, K.Z0, ZH + 1)).subtract(cil(K.RK + 0.3, -K.FL - 1, K.Z0 + 0.01));
  // el labio (abajo, de −178° a −2°): con la llave girada, su cuello queda debajo y no sale; de frente, en 45° (se imprime sin soportes)
  const anillo = cil(K.RK + 0.32, 0.45, K.Z0).subtract(M().cylinder(1.21, K.RK + 0.3, 3.1, 64).translate([0, 0, 0.44])).subtract(cil(3.1, 1.64, K.Z0 + 1));
  m = m.add(anillo.intersect(ext(sector(K.RK + 1, -178, -2), 0, K.Z0 + 0.01)));
  m = m.subtract(caja(-K.SW - 0.15, K.SW + 0.15, -K.RC - 1, -K.RI + 0.2, K.Z0, ZC));      // la ranura de la barra
  m = m.subtract(caja(-1.15, 1.15, K.RI - 0.2, K.RI + 0.7, K.Z0, ZH + 1));               // la de las pestañas (abierta por detrás)
  [-1, 1].forEach(sg => { m = m.subtract(caja(sg > 0 ? K.RI - 0.5 : -K.RC - 0.5, sg > 0 ? K.RC + 0.5 : -K.RI + 0.5, -0.8, 0.8, ZC + 0.3, ZC + 1.65)); }); // (las ventanas del «clic»)
  // la ranura de los topes, por detrás de la pestaña: el tope de la pared va dentro y para el bombín en 0° y en 90°
  const a = Math.asin(0.5 / (K.RB - 0.5)) / RAD + 0.6;
  m = m.subtract(ext(sector(K.RB + 0.8, K.TB - a, K.TB + 90 + a, 64).subtract(circ(K.RB - 0.8)), -1.3, -0.09));
  return m;
}
// el TAPÓN de detrás: cierra la pila, encaja con «clic» en las ventanitas, gira con el bombín (su pestaña) y lleva el hexágono de la leva
export function tapon() {
  let m = cil(K.RI - 0.1, ZC, ZH).add(caja(-1.0, 1.0, K.RI - 0.3, K.RI + 0.6, ZC, ZH));
  // los dos dientes del «clic»: rampa a 45° para entrar (se mete de atrás hacia delante) y cara plana detrás: tirando, topan con la ventana
  const diente = N.cs([N.ccw([[K.RI - 0.4, ZC + 0.4], [K.RI + 0.45, ZC + 1.25], [K.RI + 0.45, ZC + 1.55], [K.RI - 0.4, ZC + 1.55]])], 'Positive').extrude(1.2).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, -0.6, 0, 1]);
  [-1, 1].forEach(sg => { m = m.add(sg > 0 ? diente : diente.mirror([1, 0, 0])); });
  return m.add(ext(hexagono(K.HEX), ZH - 0.01, ZH + 0.5 + K.GRUESO));
}
// lo que pone la CAJA: el refuerzo alrededor (con su escuadra a 45° por debajo) y el tope por fuera; y lo que quita: el agujero (con techo
// en punta, se imprime sin soportes) y la ranura en V de la barra (abajo)
export function cajaMas(pr) {
  // (la quilla en V a 45° por debajo: se imprime sin soportes y baja poco: así no pisa un fondo falso ni un cajón)
  const q = K.RT / Math.SQRT2, boss = ext(circ(K.RT, 96).add(N.cs([N.ccw([[-q, -q], [0, -K.RT * Math.SQRT2], [q, -q]])], 'Positive')), pr - 0.01, ZH);
  const t = K.TB * RAD, tope = caja(-0.5, 0.5, -0.5, 0.5, -0.9, 0.02).rotate([0, 0, K.TB]).translate([K.RB * Math.cos(t), K.RB * Math.sin(t), 0]);
  return { boss, tope };
}
export function cajaMenos() {
  const r = K.RH, q = r / Math.SQRT2, top = K.RT - 1.2;
  const agujero = ext(circ(r, 96).add(N.cs([N.ccw([[-q, q], [q, q], [q - (top - q), top], [-(q - (top - q)), top]])], 'Positive')), -1, ZH + 1);
  const ranura = ext(N.cs([N.ccw([[-1.65, -r + 0.3], [1.65, -r + 0.3], [0.5, -(RIN.cerrada + K.SH + 0.25)], [-0.5, -(RIN.cerrada + K.SH + 0.25)]])], 'Positive'), K.Z0 - 0.2, ZC + 0.2);
  return agujero.add(ranura);
}

// ---------- a la cara de la caja ----------
// gira «a» grados en el sentido de ABRIR (θ bajando), refleja en la cara derecha (s = −1) y lo lleva a (u, ZK)
export const enCaja = (m, s, u, ZK, a = 0) => { let r = a ? m.rotate([0, 0, -a]) : m; if (s < 0) r = r.mirror([1, 0, 0]); return r.transform([1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, u, 0, ZK, 1]); };
// todas las piezas sueltas con la llave a κ grados (para montarla, animarla y comprobarla)
export function montada(cod, kappa = 0, opts = {}) {
  const b = giroBombin(kappa), abierta = opts.barra != null ? opts.barra === 'abierta' : kappa >= KF - 0.01;
  return {
    bombin: { m: bombin(), a: b }, tapon: { m: tapon(), a: b }, barra: { m: barra(abierta), a: b },
    discos: Array.from({ length: K.N }, (_, k) => ({ m: disco(cod, k), a: giroDisco(opts.llave != null ? opts.llave : cod, k, kappa) })), // (los gira la llave que se mete)
    separadores: Array.from({ length: K.N - 1 }, (_, k) => ({ m: separador(k), a: b })),
    llave: { m: llave(opts.llave != null ? opts.llave : cod), a: kappa }
  };
}
// para imprimir: cada pieza en la cama, en su postura buena (todas sin soportes)
export const paraImprimir = {
  llave: cod => N.aLaCama(llave(cod).rotate([90, 0, 0])),            // tumbada sobre su cara plana
  disco: (cod, k) => N.aLaCama(disco(cod, k)),                        // planos
  separador: k => N.aLaCama(separador(k)),
  barra: () => N.aLaCama(barra(false).rotate([0, 90, 0])),           // de lado
  bombin: () => N.aLaCama(bombin()),                                  // de pie sobre su pestaña
  tapon: () => N.aLaCama(tapon())                                     // de pie, el hexágono arriba
};
