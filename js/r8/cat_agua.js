// ================= 20-10-2026 · 🚤 AEROBARCO RC POR PIEZAS: el kit entero, solo pones los componentes =================
// Ella (20-10, plan maestro): «tienes que crear más chasis rc completos premium funcional!! listo para poner componentes!! también barcos y
// avionetas». El AEROBARCO (hélice de aire, como los de los pantanos) es el barco RC que mejor sale impreso y que de verdad no se hunde:
//  · el CASCO es una bañera CERRADA, sin un solo agujero por debajo del agua (ni eje ni bocina por donde se cuele): fondo plano, costados
//    con 5° de abanico y la proa lanzada a 45° (se imprime boca arriba sin soportes); por dentro, la REPISA donde apoya la cubierta (con
//    chaflán a 45°), 6 TETONES para sus tornillos y las 2 ANILLAS de la correa de la batería;
//  · la CUBIERTA apoya en la repisa y se atornilla; la ESCOTILLA lleva BRAZOLA de 10 mm (el agua de la cubierta no entra) y su TAPA con
//    faldón; todo lo que se clava en la cubierta va en tetones CIEGOS (no la atraviesan); los dos cables pasan por CHIMENEAS de 5 mm;
//  · la TORRE DEL MOTOR (se imprime tumbada: así es fuerte a lo largo) con su placa para un motor 370 de escobillas o un sin escobillas 22xx;
//  · el PROTECTOR DE LA HÉLICE (aro + rejilla, con dos patas que entran en la cubierta): los dedos no llegan a la hélice;
//  · dos TIMONES DE AIRE con perfil de ala y su brazo; el SERVO, de pie en la cubierta ENTRE los dos timones (detrás del protector: el
//    mando nunca pasa por la hélice); su brazo y los de los timones miden lo mismo y una BARRA DE UNIÓN los une a los tres: es un
//    PARALELOGRAMO, así los dos timones giran SIEMPRE lo mismo que el servo; giran en sus ejes entre la cubierta y un PUENTE con dos postes;
//  · DÓNDE VA LA BATERÍA para que flote DERECHO lo calcula el programa (el peso de cada pieza y de cada componente → su centro de gravedad
//    encima del centro de flotación) y las anillas de la correa se ponen ahí.
// Marco: x hacia la proa (la popa en x = 0), y a la izquierda, z arriba (el fondo en z = 0). Holguras de sus Bambu (por lado): 0,05 a
// presión · 0,10 encaja · 0,2 gira.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';
import * as B from './cat_bici.js';
import { COMPONENTES as CRC, componentes as compRC } from './cat_rc.js';

const { n, s, M, CS, circ, rr, poli, cil, caja, n2, conBisel } = A;
const { PRES, JUSTO, GIRA } = B, U = B.UTIL;
const { sum, dif, lon, R2, perfilD, varilla, capsula, M4, varZ } = U;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const deLado = (cs, y0, y1) => cs.extrude(y1 - y0).rotate([90, 0, 0]).translate([0, y1, 0]); // un perfil (x, z) con grosor en y
const capaA = (cs, z) => cs.extrude(0.01).translate([0, 0, z]), capaB = (cs, z) => cs.extrude(0.01).translate([0, 0, z - 0.01]);
// un agujero redondo en GOTA (la punta hacia +y: la torre se imprime tumbada sobre su cara −y)
const gotaZ = (d, z0, z1, x, y) => M().hull([cil(d, z1 - z0, z0), cil(0.1, z1 - z0, z0).translate([0, d / 2 * Math.SQRT2, 0])]).translate([x, y, 0]);
const gotaX = (d, x0, x1, y, z) => M().hull([cil(d, x1 - x0), cil(0.1, x1 - x0).translate([0, d / 2 * Math.SQRT2, 0])]).rotate([0, 90, 0]).translate([x0, y, z]);

// ---------- los COMPONENTES (lo que se compra; medidas HABITUALES: mídelos con la «🧪 Prueba de encaje») ----------
export const COMP_AERO = {
  m370: { t: 'Motor 370 de escobillas (Ø24,4 × 30,5; eje de 2 mm; 2 tornillos M2,6 a 17 mm)', g: 50 },
  sin: { t: 'Motor sin escobillas 2204–2212 de 2000–2600 KV (cruz de 16 × 19 mm con tornillos M3; eje de 5 mm con su tuerca)', D: 28, L: 25, g: 30, cruz: [16, 19] },
  helice: { t: 'Hélice de AVIÓN (no de barco) de 2 palas', g: 6 },
  adaptador: { t: 'Adaptador de hélice de pinza para eje de 2 mm (con el 370)', g: 3 },
  escE: { t: 'Variador (ESC) de escobillas de 10–20 A', g: 20 }, escS: { t: 'Variador (ESC) sin escobillas de 12–20 A', g: 15 },
  servo: { t: CRC.servo.t + ' (mejor estanco o el MG90S con un globo encima: le salpica)', g: 9 }, bateria: { t: CRC.bateria.t, g: 62 }, receptor: { t: CRC.receptor.t, g: 8 }
};
export const HELICES = { 4: 101.6, 5: 127, 6: 152.4 }; // Ø de la hélice de 4, 5 y 6 pulgadas

// ---------- las MEDIDAS ----------
export function medidasAero(p) {
  const L = clamp(+p.largo || 240, 220, 245), W = clamp(+p.manga || 130, 110, 140), H = 40, td = 2.4, tw = 2, tb = 2.2, zl = H - td, wl = 3.5;
  const hw = W / 2, hwb = hw - H * Math.tan(5 * R2), Lb = H, rs = 8, rb = Math.round(W * 0.3);
  const pulg = [4, 5, 6].includes(+p.helice) ? +p.helice : 5, Rp = HELICES[pulg] / 2, motor = p.motor === 'sin' ? 'sin' : '370';
  // atrás: los timones; delante de ellos, el servo de pie; después el protector y la hélice; la torre; la escotilla
  const Sv = CRC.servo, xr = 30, yR = 28, h = 18, xs = xr, xc = xs + (Sv.L / 2 - Sv.ejeX), zT = H + 27.7; // el eje del servo, en la línea de los ejes de los timones · zT: como en el coche (el servo de pie, su fondo en la cubierta)
  // (h = 18: la barra de unión, a ±45°, pasa a 1,5 mm del borde de ataque de los timones; con 12 los tocaba)
  const xg = Math.ceil(xc + Sv.sep / 2 + 6), xp = xg + 12, za = H + Rp + 16, Ri = Rp + 5, Ro = Ri + 2.4, banda = 20; // la rejilla del protector (atrás) en xg; la hélice en xp
  const xpl = xp + (motor === '370' ? 13 : 33), xpb1 = xpl + 40, zB = H + 6; // la cara de atrás de la placa del motor; el final de la base; la base, sobre tetones de 6
  const hR = Math.round(za + 15 - (H + 6.5)), z0 = H + 6.5, z1 = z0 + hR, yP = yR + 16, yL = hw - 14; // los timones (de la cubierta + 6,5 a 15 mm por encima del eje de la hélice) · postes · patas
  const xh0 = xpb1 + 8, xh1 = L - 26, Lc = xh1 - xh0, Wc = W - 34, xhc = (xh0 + xh1) / 2; // la BRAZOLA de la escotilla (su cara de fuera)
  if (Lc < 40) N.mal('Con el motor ' + (motor === 'sin' ? 'sin escobillas' : '370') + ' el casco tiene que medir al menos ' + Math.ceil(L + 40 - Lc) + ' mm: si no, la escotilla (por donde entra la batería) no cabe detrás de la torre.');
  return { L, W, H, td, tw, tb, zl, wl, hw, hwb, Lb, rs, rb, pulg, Rp, motor, Sv, xr, yR, h, xs, xc, zT, xg, xp, za, Ri, Ro, banda, xpl, xpb1, zB, hR, z0, z1, yP, yL, xh0, xh1, Lc, Wc, xhc };
}

// ---------- 1) el CASCO ----------
// la PLANTA (vista desde arriba) a una altura: rectángulo con las esquinas de popa (rs) y de proa (rb) redondeadas
export function planta(x0, x1, hw, rs, rb) { const P = [], arco = (cx, cy, r, a0, a1) => { const k = Math.max(3, Math.round(r / 1.2)); for (let i = 0; i <= k; i++) { const a = (a0 + (a1 - a0) * i / k) * R2; P.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  rb = Math.min(rb, hw - 0.5, (x1 - x0) / 2 - 0.5); rs = Math.min(rs, hw - 0.5);
  arco(x0 + rs, -hw + rs, rs, 180, 270); arco(x1 - rb, -hw + rb, rb, 270, 360); arco(x1 - rb, hw - rb, rb, 0, 90); arco(x0 + rs, hw - rs, rs, 90, 180); return poli(P); }
// la planta a la altura z, metida d hacia dentro (en la proa, a 45°, d·√2 para que la pared tenga d de grueso de verdad)
const xProa = (Q, z) => Q.L - Q.Lb + z * Q.Lb / Q.H, mitadZ = (Q, z) => Q.hwb + z * (Q.hw - Q.hwb) / Q.H;
const datosPlanta = (Q, z, d = 0) => [d, xProa(Q, z) - d * Math.SQRT2, mitadZ(Q, z) - d, Math.max(1, Q.rs - d), Math.max(2, Q.rb - d)];
export const plantaZ = (Q, z, d = 0) => planta(...datosPlanta(Q, z, d));
// medio ancho de esa planta en una x (para poner cosas pegadas a la pared)
export function anchoEn(Q, z, d, x) { const [x0, x1, hw, rs0, rb0] = datosPlanta(Q, z, d), rb = Math.min(rb0, hw - 0.5, (x1 - x0) / 2 - 0.5), rs = Math.min(rs0, hw - 0.5);
  if (x < x0 + rs) return hw - rs + Math.sqrt(Math.max(0, rs * rs - (x0 + rs - x) ** 2)); if (x > x1 - rb) return hw - rb + Math.sqrt(Math.max(0, rb * rb - (x - (x1 - rb)) ** 2)); return hw; }
export const fuera = Q => M().hull([capaA(plantaZ(Q, 0), 0), capaB(plantaZ(Q, Q.H), Q.H)]);
// el HUECO: abajo, entero; la repisa (se estrecha wl con chaflán a 45°: sin soportes); encima, entero otra vez (ahí entra la cubierta)
function hueco(Q) { const { tw, tb, zl, wl, H } = Q;
  return N.union([M().hull([capaA(plantaZ(Q, tb, tw), tb), capaB(plantaZ(Q, zl - wl + 0.01, tw), zl - wl + 0.01)]), M().hull([capaA(plantaZ(Q, zl - wl, tw), zl - wl), capaB(plantaZ(Q, zl, tw + wl), zl)]),
    M().hull([capaA(plantaZ(Q, zl - 0.001, tw), zl - 0.001), capaB(plantaZ(Q, H + 1, tw), H + 1)])]); }
// dónde van los 6 tornillos de la cubierta (en la repisa, pegados a la pared; los del medio, delante de la torre: debajo de ella van el variador y el receptor)
export const HONDO_TOR = 8.2; // el agujero del tornillo de la cubierta (M3 × 10 rosca-chapa: 7,6 dentro del tetón)
export const sitiosTornillos = Q => [12, Q.xh0 + 10, Q.L - 34].flatMap(x => { const y = Math.min(anchoEn(Q, Q.zl, Q.tw, x) - 4.5, anchoEn(Q, Q.zl - HONDO_TOR, Q.tw, x) - 1.25 - 1.2); return [[x, y], [x, -y]]; }); // (en la proa la pared se curva hacia dentro: el agujero se mira en su punta, con 1,2 de margen)
export const anillas = Q => [[Q.xBat, 21.5], [Q.xBat, -21.5]]; // las de la correa de la batería (velcro de 20)
export function casco(Q) { const ext = fuera(Q); let m = ext.subtract(hueco(Q));
  const T = sitiosTornillos(Q).map(([x, y]) => cil(9, Q.zl - Q.tb + 0.1, Q.tb - 0.1).translate([x, y, 0]));
  m = m.add(N.union(T).intersect(ext)).subtract(N.union(sitiosTornillos(Q).map(([x, y]) => cil(2.5, HONDO_TOR + 0.2, Q.zl - HONDO_TOR).translate([x, y, 0])))); // tetones con su agujero (para tornillo M3 × 10 rosca-chapa)
  if (Q.xBat) anillas(Q).forEach(([x, y]) => { m = m.add(caja(24, 6, 6, 1).translate([x, y, Q.tb - 0.1])).subtract(caja(21, 8, 2.5).translate([x, y, Q.tb + 1])); }); // (el techo de la anilla: un puente de 21 mm)
  return m; }

// ---------- 2) la CUBIERTA (se imprime así, plana; lo de encima, hacia arriba) ----------
export const tornilloTorre = Q => [Q.xpl + 11.5, Q.xpl + 25].flatMap(x => [[x, 7], [x, -7]]); // dentro de la ventana de la torre: el destornillador entra por arriba
export const cableMotor = Q => [Q.xpl + 14, 21], cableServo = Q => [Q.xc, 14];
export function cubierta(Q) { const { H, zl, td, xr, yR, yP, xg, yL, xc, Sv, xhc, Lc, Wc } = Q;
  let m = plantaZ(Q, zl, Q.tw + JUSTO + 0.05).extrude(td).translate([0, 0, zl]);
  const up = (k, z = 0) => k.translate([0, 0, H - 0.01 + z]), A = [], Hu = [];
  A.push(up(rr(Lc, Wc, 6).subtract(rr(Lc - 4, Wc - 4, 4)).extrude(10.01).translate([xhc, 0, 0]))); Hu.push(rr(Lc - 4, Wc - 4, 4).extrude(td + 12).translate([xhc, 0, zl - 1])); // la BRAZOLA y el hueco de la escotilla
  [1, -1].forEach(sg => { A.push(up(cil(11, 6.01).translate([xr, sg * yR, 0]))); A.push(up(cil(7, 0.31).translate([xr, sg * yR, 6]))); Hu.push(perfilD(4, PRES).extrude(7).translate([xr, sg * yR, H + 0.2])); // el cojinete de abajo de cada timón (con su arandela)
    A.push(up(cil(12, 6.01).translate([xr, sg * yP, 0]))); Hu.push(perfilD(6, PRES).extrude(7).translate([xr, sg * yP, H + 0.2])); // los postes del puente
    A.push(up(caja(12, 14, 8.01, 1.5).translate([xg + 3, sg * yL, 0]))); Hu.push(caja(6 + 2 * JUSTO, 8 + 2 * JUSTO, 9).translate([xg + 3, sg * yL, H + 0.4])); // las patas del protector
    const xo = xc + sg * (Sv.sep / 2 + 0.3); A.push(up(caja(4.4, 8, Sv.zOreja - 0.04).translate([xo, 0, 0]))); Hu.push(cil(1.8, 7.1, H + Sv.zOreja - 7).translate([xc + sg * Sv.sep / 2, 0, 0])); }); // los postes del servo (sus orejas se atornillan)
  tornilloTorre(Q).forEach(([x, y]) => { A.push(up(cil(8, 6.01).translate([x, y, 0]))); Hu.push(cil(2.5, 6.2, H + 0.4).translate([x, y, 0])); }); // los tetones de la torre (ciegos)
  [[cableMotor(Q), 11, 7], [cableServo(Q), 10, 5.5]].forEach(([q, D, d]) => { A.push(up(cil(D, 5.01).translate([q[0], q[1], 0]))); Hu.push(cil(d, td + 8, zl - 1).translate([q[0], q[1], 0])); }); // las CHIMENEAS de los cables
  sitiosTornillos(Q).forEach(([x, y]) => Hu.push(cil(3.4, td + 2, zl - 1).translate([x, y, 0])));
  return m.add(N.union(A)).subtract(N.union(Hu)); }
// la TAPA de la escotilla: se imprime boca abajo (la tapa en la cama, el faldón hacia arriba); entra por fuera de la brazola, justa
export function tapaEscotilla(Q) { const k = JUSTO + 1.8, sk = rr(Q.Lc + 2 * k, Q.Wc + 2 * k, 6 + k), hueco = rr(Q.Lc + 2 * JUSTO, Q.Wc + 2 * JUSTO, 6 + JUSTO);
  let m = conBisel(sk, 2, 0.6).add(sk.subtract(hueco).extrude(8.1 + 0.01).translate([0, 0, 1.99]));
  const xf = Q.Lc / 2 + k; return m.add(M().hull([caja(1, 12, 2.2).translate([xf - 0.5, 0, 7.9]), caja(1, 12, 2.2).translate([xf + 5, 0, 7.9]), caja(1, 12, 0.1).translate([xf - 0.5, 0, 2.2])])); } // la uña para levantarla (con su chaflán)
export const tapaEnSitio = Q => tapaEscotilla(Q).mirror([0, 0, 1]).translate([Q.xhc, 0, Q.H + 12.1]);

// ---------- 3) la TORRE DEL MOTOR (de lado: se imprime tumbada sobre su cara −y) ----------
export function torre(Q) { const { xpl, xpb1, zB, za } = Q, zp0 = za - 20, zp1 = za + 18, w = 12;
  const P = [[xpl, zB], [xpb1, zB], [xpb1, zB + 5], [xpl + 12, zp0], [xpl + 5, zp0], [xpl + 5, zp1], [xpl, zp1]], V = poli([[xpl + 7, zB + 5], [xpb1 - 9, zB + 5], [xpl + 7, zp0 - 9]]).offset(-1.5, 'Round').offset(1.5, 'Round');
  let m = deLado(poli(P).subtract(V), -w, w);
  tornilloTorre(Q).forEach(([x, y]) => { m = m.subtract(gotaZ(3.4, zB - 1, zB + 6, x, y)); });
  if (Q.motor === '370') { const C = CRC.motor; m = m.subtract(gotaX(C.boss + 2 * JUSTO, xpl + 5 - 1.6, xpl + 6, 0, za)).subtract(gotaX(4, xpl - 1, xpl + 6, 0, za)).subtract(gotaX(12, xpl - 1, xpl + 2, 0, za)); // el resalte del motor, el eje y el rebaje del adaptador
    [1, -1].forEach(sg => { m = m.subtract(gotaX(C.tor + 0.3, xpl - 1, xpl + 6, 0, za + sg * C.sep / 2)); }); }
  else { m = m.subtract(gotaX(8.5, xpl - 1, xpl + 6, 0, za)); const [a, b] = COMP_AERO.sin.cruz; [[a / 2, 45], [b / 2, 135], [a / 2, 225], [b / 2, 315]].forEach(([r, g]) => { m = m.subtract(gotaX(3.3, xpl - 1, xpl + 6, r * Math.cos(g * R2), za + r * Math.sin(g * R2))); }); }
  return m; }

// ---------- 4) el PROTECTOR de la hélice: aro + rejilla + dos patas (se imprime plano: la rejilla en la cama) ----------
// marco de impresión (u, v, w) = (y, z − za, x − xg): la rejilla en w = 0..3 (atrás), el aro sube hasta w = 20 (hacia la hélice)
export function protector(Q) { const { Ri, Ro, banda, za, H, yL } = Q, L = [];
  L.push(circ(2 * Ro).subtract(circ(2 * Ri)).extrude(banda));
  const rej = [circ(2 * 13.4).subtract(circ(22))], rm = 0.55 * Ri; rej.push(circ(2 * rm + 2.4).subtract(circ(2 * rm - 2.4)));
  for (let i = 0; i < 8; i++) rej.push(rr(Ri - 12 + 0.6, 2.4).translate([(Ri + 12) / 2 - 0.3, 0]).rotate(i * 45 + 22.5)); // 8 radios (ninguno en vertical: la vista atrás, limpia)
  L.push(N.csUnion(rej).extrude(3));
  const vF = H + 8 - za; [1, -1].forEach(sg => { const fi = Math.asin(Math.min(0.98, yL / (Ro + 1.8))), a = [sg * (Ro + 1.8) * Math.sin(fi), -(Ro + 1.8) * Math.cos(fi)], f = [sg * yL, vF + 4];
    L.push(capsula(a, f, 8).extrude(6)); L.push(rr(8, 7.5 + 4.5).translate([sg * yL, vF - 7.5 / 2 + 2.25]).extrude(6)); }); // la PATA y su espiga (entra en la cubierta; 0,1 de aire en el fondo)
  return N.union(L); }
export const mProtector = Q => M4([0, 1, 0], [0, 0, 1], [1, 0, 0], [Q.xg, 0, Q.za]);
export const protectorEnSitio = Q => N.transforma(protector(Q), mProtector(Q));

// ---------- 5) los TIMONES, sus ejes, los postes y el puente ----------
// perfil de ala simétrico (NACA 00xx) alrededor del eje: borde de ataque en +xa, de salida en −(c − xa); la cola, roma (0,97 de la cuerda)
export const TIMON = { c: 34, t: 8, xa: 8.5, eje: 4 };
export function perfilTimon() { const { c, t, xa } = TIMON, tr = t / c, yt = u => 5 * tr * c * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4), arr = [], abj = [];
  for (let i = 0; i <= 36; i++) { const u = 0.97 * (1 - Math.cos(i / 36 * Math.PI)) / 2; arr.push([xa - u * c, yt(u)]); abj.push([xa - u * c, -yt(u)]); }
  return poli(arr.concat(abj.reverse().slice(1, -1))); }
// el TIMÓN (de pie, como se imprime; su eje en (0, 0)): la pala, el BRAZO (hacia delante, con su escuadra debajo) a la altura del brazo del servo
export function timon(Q) { const { hR, h, zT, z0 } = Q, zb = zT - 2.6 - z0; // zb: la cara de abajo del brazo, desde el pie del timón
  let m = perfilTimon().extrude(hR).add(capsula([0, 0], [h, 0], 7, 6).extrude(2.5).translate([0, 0, zb])).add(M().hull([capsula([3.5, 0], [h, 0], 5, 5).extrude(0.01).translate([0, 0, zb]), cil(2.5, 0.01, zb - 17).translate([7, 0, 0])]));
  m = m.add(cil(8, 0.3, hR - 0.01)); // la arandela de arriba (a 0,2 del puente)
  return m.subtract(cil(TIMON.eje + 2 * GIRA, hR + 4, -1)).subtract(cil(B.PIN + 2 * PRES, 3.75, zb - 1.05).translate([h, 0, 0])); }
export const largoEjeTimon = Q => Q.z1 + 0.5 + 5 - 0.05 - (Q.H + 0.25);
export function puenteTimones(Q) { const { xr, yR, yP } = Q; let m = conBisel(capsula([0, -yP], [0, yP], 12), 5, 0.6);
  [yR, -yR].forEach(y => { m = m.subtract(perfilD(TIMON.eje, PRES).extrude(7).translate([0, y, -1])); }); [yP, -yP].forEach(y => { m = m.subtract(perfilD(6, PRES).extrude(7).translate([0, y, -1])); });
  return m.translate([xr, 0, Q.z1 + 0.5]); }
// el BRAZO DEL SERVO, recto, tan largo como los de los timones: entra a presión en la estría y lleva su tornillo (como el del coche, con un solo ojo)
export function brazoRecto(Q) { const S = CRC.servo, h = Q.h;
  return conBisel(capsula([0, 0], [h, 0], 7, 5.4), 2.5, 0.4).translate([0, 0, 2.5]).add(cil(7.5, 2.6)).subtract(cil(S.estria - 0.1, 4.1, -0.01)).subtract(cil(2.2, 6, -1)).subtract(cil(B.PIN + 2 * PRES, 4, 1.5).translate([h, 0, 0])); }
// la BARRA DE UNIÓN: tres ojos (timón izquierdo, servo, timón derecho) que giran en sus pasadores; con los tres brazos iguales y paralelos
// la barra va siempre paralela a sí misma: un paralelogramo
export function barraUnion(Q) { const y = Q.yR, P = [[0, -y], [0, 0], [0, y]]; let cs = capsula(P[0], P[2], 5.4); P.forEach(q => { cs = cs.add(circ(6.4).translate(q)); });
  let m = conBisel(cs, 2.5, 0.4); P.forEach(q => { m = m.subtract(cil(B.PIN + 2 * GIRA, 4, -1).translate([q[0], q[1], 0])); }); return m; }
// la cinemática del paralelogramo: los dos timones giran exactamente lo que el servo; la barra se traslada (sin girar)
export const giroTimones = (Q, sigma) => ({ izq: { th: sigma }, der: { th: sigma } });
export const puntaBrazo = (Q, sigma, y0) => [Q.xr + Q.h * Math.cos(sigma * R2), y0 + Q.h * Math.sin(sigma * R2)];

// ---------- 6) los COMPONENTES de mentira (para verlos montados y comprobar que caben) ----------
export function heliceFalsa(Q) { const R = Q.Rp, pala = N.cs([N.ccw(N.elipse2(R - 6, 13, 40))], 'Positive').translate([(R - 6) / 2 + 6, 0]);
  return N.union([cil(12, 8, -4), pala.extrude(1.6).translate([0, 0, -0.8]).rotate([18, 0, 0]), pala.rotate(180).extrude(1.6).translate([0, 0, -0.8]).rotate([-18, 0, 0])]); } // (de pie en z: luego se tumba con el eje en x)
export function motorFalso(Q) { if (Q.motor === '370') { const C = CRC.motor; return compRC(Q)[0][1].rotate([0, -90, 0]).translate([Q.xpl + 5 + C.L, 0, Q.za]); } // la cara del eje contra la placa (por delante), el eje hacia atrás
  const S = COMP_AERO.sin; return cil(S.D, S.L - 0.05).add(cil(5, Q.xpl - S.L - (Q.xp - 12), -(Q.xpl - S.L - (Q.xp - 12)))).rotate([0, 90, 0]).translate([Q.xpl - S.L, 0, Q.za]); } // la campana por detrás de la placa; el eje de 5 atraviesa la hélice
export const adaptadorFalso = Q => Q.motor === '370' ? cil(8, Q.xpl + 1.9 - (Q.xp - 8)).rotate([0, 90, 0]).translate([Q.xp - 8, 0, Q.za]) : cil(8, 6).rotate([0, 90, 0]).translate([Q.xp - 10, 0, Q.za]); // el adaptador (370) o la tuerca de la hélice
export const helEnSitio = Q => heliceFalsa(Q).rotate([0, 90, 0]).translate([Q.xp, 0, Q.za]);
export const discoHelice = Q => cil(2 * Q.Rp, 8).rotate([0, 90, 0]).translate([Q.xp - 4, 0, Q.za]); // lo que barre al girar

// ---------- 7) los PESOS: dónde va la batería para que flote derecho ----------
const PETG = 1.27; // g/cm³ (casco, cubierta y tapa macizos de paredes; lo demás con un 20 % menos por el relleno)
export function flotacion(Q, piezasEnSitio) { // piezasEnSitio: [{ m, peso?, relleno?, mueve? }] (sin la batería); devuelve dónde va la batería, el calado y el francobordo
  let mt = 0, mx = 0, gM = COMP_AERO.bateria.g; // gM: lo que se mueve (la batería; con «mueve», lo que vaya con ella)
  for (const x of piezasEnSitio) { const g = x.peso != null ? x.peso : x.m.volume() / 1000 * PETG * (x.relleno || 1), b = N.caja(x.m); if (x.mueve) { gM += g; continue; } mt += g; mx += g * (b.min[0] + b.max[0]) / 2; }
  const gB = gM, total = mt + gM, ext = fuera(Q); let lo = 0, hi = Q.H, sub = null;
  for (let k = 0; k < 30; k++) { const d = (lo + hi) / 2; sub = ext.intersect(caja(2000, 2000, d).translate([Q.L / 2, 0, 0])); if (sub.volume() / 1000 > total) hi = d; else lo = d; }
  const d = (lo + hi) / 2, xB = (() => { const S = ext.intersect(caja(2000, 2000, d).translate([Q.L / 2, 0, 0])); return momentoX(S) / S.volume(); })();
  // la batería tiene que poder SACARSE por la escotilla: su centro, como mucho 15 mm por debajo del borde de la escotilla (se desliza ahí)
  // (si no se puede, con media batería debajo de la escotilla: se saca levantándola por delante)
  const xMax = Math.min(Q.L - Q.Lb - 2 - 36 - 3, Q.xh1 - 2 - 21); let xMin = Math.max(8 + 36 + 2, Q.xh0 + 2 + 21); if (xMin > xMax) xMin = Math.max(8 + 36 + 2, Q.xh0 + 2);
  if (xMin > xMax) N.mal('La batería no cabe debajo de la escotilla con estas medidas: alarga el casco.');
  const xBat0 = (xB * total - mx) / gB, xBat = Math.round(clamp(xBat0, xMin, xMax)), cg = (mx + gB * xBat) / total;
  // lo que se inclina de proa (+) o de popa (−) con la batería ahí: el par del peso entre la rigidez de la flotación (ρ · I de la superficie de agua)
  const wp = ext.slice(d), bw = N.cajaCS(wp); let Aw = 0, Mw = 0, Iw = 0; for (let x = bw.min[0]; x < bw.max[0]; x += 2) { const a = wp.intersect(rr(2, 4000).translate([x + 1, 0])).area(); Aw += a; Mw += a * (x + 1); Iw += a * (x + 1) ** 2; }
  const IL = Iw - Mw * Mw / Aw, trimado = total * (cg - xB) / (0.001 * IL) / R2;
  return { xBat, xBat0, total, calado: d, franco: Q.H - d, xB, cg, trimado }; }
// el momento en x de un sólido (para su centro): por rebanadas de 2 mm
function momentoX(S) { const b = N.caja(S); let m = 0; for (let x = b.min[0]; x < b.max[0]; x += 2) { const v = S.intersect(caja(2, 2000, 2000).translate([x + 1, 0, 0])).volume(); m += v * (x + 1); } return m; }

// ---------- 8) TODO EL KIT, el barco MONTADO y el DESPIECE ----------
// grupos: 'fijo' · 'tI'/'tD' (giran con cada timón) · 'dir' (el brazo del servo) · 'barra' (la barra de unión: se traslada) · 'hel' (la hélice) · 'comp' (no se imprime)
const QS = new Map(); // las medidas con la batería ya colocada (pesar todo cuesta: una vez por medidas)
export function medidasConBateria(p) { const Q = medidasAero(p), k = [Q.L, Q.W, Q.pulg, Q.motor].join(','); if (QS.has(k)) return Object.assign(Q, QS.get(k));
  const r = N.enAmbito(() => flotacion(Q, enSitio(Q, 0).map(x => ({ m: x.m, peso: x.peso, relleno: x.relleno, mueve: x.mueve }))));
  QS.set(k, { xBat: r.xBat, F: r }); return Object.assign(Q, { xBat: r.xBat, F: r }); }
// todo en su sitio (con la dirección girada sigma grados en el servo)
export function enSitio(Q, sigma = 0) { const L = [], pon = (k, m, g = 'fijo', o = {}) => L.push(Object.assign({ k, m, g }, o)), C = COMP_AERO;
  pon('casco', casco(Q)); pon('cubierta', cubierta(Q)); pon('tapa', tapaEnSitio(Q)); pon('torre', torre(Q), 'fijo', { relleno: 0.8 }); pon('protector', protectorEnSitio(Q), 'fijo', { relleno: 0.85 });
  const Lt = largoEjeTimon(Q), Lpo = Q.z1 + 0.5 + 5 - 0.05 - (Q.H + 0.25); pon('puente', puenteTimones(Q));
  [1, -1].forEach(sg => { pon('ejeTim' + sg, varZ(TIMON.eje, Lt, [Q.xr, sg * Q.yR], Q.H + 0.25)); pon('poste' + sg, varZ(6, Lpo, [Q.xr, sg * Q.yP], Q.H + 0.25)); });
  const zT = Q.zT, pin = (k, q, g) => { pon('pas' + k, varZ(B.PIN, 6.6, q, zT - 3.55), g); pon('tapa' + k, B.tapaPequena().mirror([0, 0, 1]).translate([q[0], q[1], zT + 2.6 + 2.05]), g); };
  [[1, 'I'], [-1, 'D']].forEach(([sg, k]) => { const K = [Q.xr, sg * Q.yR];
    pon('timon' + k, timon(Q).translate([0, 0, Q.z0]).rotate([0, 0, sigma]).translate([K[0], K[1], 0]), 't' + k); pin('Tim' + k, puntaBrazo(Q, sigma, sg * Q.yR), 't' + k); });
  pon('brazoServo', brazoRecto(Q).rotate([0, 0, sigma]).translate([Q.xs, 0, zT - 5.1]), 'dir'); pin('Braz', puntaBrazo(Q, sigma, 0), 'dir');
  const pb = puntaBrazo(Q, sigma, 0); pon('barra', barraUnion(Q).translate([pb[0], pb[1], zT + 0.1]), 'barra'); // (0,2 por encima de los brazos; la tapa la sujeta con 0,05 de juego)
  // los COMPONENTES de mentira
  pon('servo', compRC(Q)[1][1].mirror([1, 0, 0]).translate([Q.xc, 0, Q.H]), 'comp', { peso: C.servo.g });
  pon('motor', motorFalso(Q), 'comp', { peso: Q.motor === '370' ? C.m370.g : C.sin.g }); pon('adaptador', adaptadorFalso(Q), 'hel', { peso: C.adaptador.g }); pon('helice', helEnSitio(Q), 'hel', { peso: C.helice.g });
  const xE = Q.xpl + 20, Bt = CRC.bateria; pon('esc', caja(45, 22, 20, 2).translate([xE, 36, Q.tb + 0.1]), 'comp', { peso: Q.motor === '370' ? C.escE.g : C.escS.g }); pon('receptor', caja(40, 22, 13, 2).translate([xE, -36, Q.tb + 0.1]), 'comp', { peso: C.receptor.g }); // (debajo de la torre: se ponen una vez)
  if (Q.xBat) pon('bateria', caja(Bt.L, Bt.W, Bt.H, 3).translate([Q.xBat, 0, Q.tb + 0.1]), 'comp', { peso: C.bateria.g });
  return L; }
// las piezas PARA IMPRIMIR (cada una tumbada como se imprime)
export function piezasAero(Q) { const P = [], add = (t, m, v = 1) => { for (let i = 0; i < v; i++) P.push([t, m]); };
  add('Casco (PETG, 4 paredes: estanco)', casco(Q)); add('Cubierta (PETG)', cubierta(Q)); add('Tapa de la escotilla (boca abajo)', tapaEscotilla(Q));
  add('Torre del motor (tumbada)', torre(Q).rotate([90, 0, 0])); add('Protector de la hélice (la rejilla en la cama)', protector(Q));
  add('Timón (izquierdo y derecho: el mismo)', timon(Q), 2); add('Eje del timón', varilla(TIMON.eje, largoEjeTimon(Q)), 2); add('Poste del puente', varilla(6, Q.z1 + 0.5 + 5 - 0.05 - (Q.H + 0.25)), 2);
  add('Puente de los timones', puenteTimones(Q).translate([-Q.xr, 0, -(Q.z1 + 0.5)])); add('Brazo del servo (boca abajo)', brazoRecto(Q).mirror([0, 0, 1])); add('Barra de unión (servo y timones)', barraUnion(Q));
  add('Pasador (brazos y barra)', varilla(B.PIN, 6.6), 3); add('Tapa pequeña (de la barra)', B.tapaPequena(), 3);
  return P; }
export function despieceAero(Q, L) { const c = [Q.L / 2, 0];
  return L.map(x => { const b = N.caja(x.m), q = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2], zc = (b.min[2] + b.max[2]) / 2, d = dif(q, c);
    const capa = x.k === 'casco' ? 0 : x.k === 'cubierta' ? 0.6 : /^(torre|protector|motor|adaptador|helice)/.test(x.k) ? 1.4 : /^(timon|ejeTim|poste|puente|pasTim|tapaTim|barra)/.test(x.k) ? 1.2 : 1;
    const dz = x.k === 'casco' ? 0 : x.k === 'cubierta' ? 45 : x.g === 'comp' && /bateria|esc|receptor/.test(x.k) ? 22 : 45 + zc * 0.45 * capa;
    return { k: x.k, g: x.g, m: x.m.translate([d[0] * 0.25 * capa, d[1] * 0.6 * capa, dz]) }; }); }

// 🧪 PRUEBA DE ENCAJE: un trozo de cubierta con el cojinete del timón, el del poste y la ranura de la pata; su eje, su poste y su espiga;
// una rodaja de timón (gira en su eje); la esquina de la brazola y la de la tapa (que entre justa); la placa del motor; el brazo del servo
export function pruebaAero(p) { const Q = medidasAero(p), L = [];
  let d = conBisel(rr(52, 22, 3), 2.4, 0.5); const A = [cil(11, 6.01, 2.39).translate([-17, 0, 0]), cil(12, 6.01, 2.39).translate([0, 0, 0]), caja(12, 14, 8.01, 1.5).translate([17, 0, 2.39])];
  d = d.add(N.union(A)).subtract(perfilD(4, PRES).extrude(7).translate([-17, 0, 2.6])).subtract(perfilD(6, PRES).extrude(7).translate([0, 0, 2.6])).subtract(caja(6 + 2 * JUSTO, 8 + 2 * JUSTO, 9).translate([17, 0, 2.8])); L.push(d);
  L.push(varilla(TIMON.eje, 18)); L.push(varilla(6, 14)); L.push(caja(8, 6, 12).rotate([0, 90, 0]));
  L.push(perfilTimon().extrude(8).subtract(cil(TIMON.eje + 2 * GIRA, 10, -1)));
  const esq = cs => cs.intersect(rr(40, 40).translate([20, 20])); // (la esquina de arriba a la derecha de la brazola y de la tapa, de 60 × 60)
  L.push(conBisel(rr(36, 36, 3).translate([15, 15]), 2, 0.4).add(esq(rr(60, 60, 6).subtract(rr(56, 56, 4))).extrude(10).translate([0, 0, 1.99])));
  const k = JUSTO + 1.8, sk = rr(60 + 2 * k, 60 + 2 * k, 6 + k), hu = rr(60 + 2 * JUSTO, 60 + 2 * JUSTO, 6 + JUSTO); L.push(esq(sk).extrude(2).add(esq(sk.subtract(hu)).extrude(6).translate([0, 0, 1.99])));
  let pl = conBisel(rr(30, 30, 3), 5, 0.4); if (Q.motor === '370') { const C = CRC.motor; pl = pl.subtract(cil(C.boss + 2 * JUSTO, 1.7, 3.4)).subtract(cil(4, 8, -1)).subtract(cil(12, 2.1, -0.1)); [1, -1].forEach(sg => { pl = pl.subtract(cil(C.tor + 0.3, 8, -1).translate([0, sg * C.sep / 2, 0])); }); }
  else { pl = pl.subtract(cil(8.5, 8, -1)); const [a, b] = COMP_AERO.sin.cruz; [[a / 2, 45], [b / 2, 135], [a / 2, 225], [b / 2, 315]].forEach(([r, g]) => { pl = pl.subtract(cil(3.3, 8, -1).translate([r * Math.cos(g * R2), r * Math.sin(g * R2), 0])); }); }
  L.push(pl); L.push(brazoRecto(Q).mirror([0, 0, 1])); return L; }

function camasDe(P) { return B.repartir(P.map(x => N.caja(x[1]).dims)); }
const GRUPOS = { casco: /^Casco/, cubierta: /^Cubierta|^Tapa de la escotilla/, popa: /^Torre|^Protector|^Timón|^Eje del timón|^Poste|^Puente|^Brazo|^Bieleta|^Pasador|^Tapa pequeña/ };
export function genAero(p) { const que = p.que || 'cama1';
  if (que === 'prueba') return U.enCama(pruebaAero(p));
  const Q = medidasConBateria(p);
  if (que === 'montado' || que === 'girado') return N.union(enSitio(Q, que === 'girado' ? 40 : 0).map(x => x.m));
  if (que === 'despiece') return N.union(despieceAero(Q, enSitio(Q, 0)).map(x => x.m));
  const P = piezasAero(Q); let I = P.map((x, i) => i);
  if (GRUPOS[que]) I = I.filter(i => GRUPOS[que].test(P[i][0]));
  else if (/^cama\d$/.test(que)) { const Cs = camasDe(P), k = +que.slice(-1) - 1; if (!Cs[k]) N.mal('Este aerobarco va en ' + Cs.length + ' camas: elige «Cama 1»…«Cama ' + Cs.length + '».'); I = Cs[k]; }
  if (!I.length) N.mal('No hay piezas en «' + que + '».');
  return U.enCama(I.map(i => P[i][1])); }
// el movimiento EXACTO para la animación: la hélice gira; el servo va a un lado y al otro y los timones le siguen
// el NOMBRE de cada pieza y su PASO de montaje (el 🔧 montaje paso a paso del catálogo y el manual van en este orden)
export const NOMBRES = { casco: ['Casco', 1], esc: ['Variador (ESC)', 2], receptor: ['Receptor', 2], cubierta: ['Cubierta', 3], ejeTim1: ['Eje del timón izquierdo', 4], 'ejeTim-1': ['Eje del timón derecho', 4],
  timonI: ['Timón izquierdo', 5], timonD: ['Timón derecho', 5], poste1: ['Poste izquierdo', 6], 'poste-1': ['Poste derecho', 6], puente: ['Puente de los timones', 7], protector: ['Protector de la hélice', 8],
  torre: ['Torre del motor', 9], motor: ['Motor', 10], adaptador: ['Adaptador de la hélice', 11], helice: ['Hélice', 12], servo: ['Servo', 13], brazoServo: ['Brazo del servo', 14],
  pasBraz: ['Pasador del brazo del servo', 15], pasTimI: ['Pasador del timón izquierdo', 15], pasTimD: ['Pasador del timón derecho', 15], barra: ['Barra de unión', 16],
  tapaBraz: ['Tapa pequeña del brazo', 17], tapaTimI: ['Tapa pequeña del timón izquierdo', 17], tapaTimD: ['Tapa pequeña del timón derecho', 17], bateria: ['Batería', 18], tapa: ['Tapa de la escotilla', 19] };
export function montadasAero(p) { const Q = medidasConBateria(p), base = enSitio(Q, 0), Wv = 0.25;
  const rotZ = (a, cx, cy) => { const c = Math.cos(a), s2 = Math.sin(a); return [c, s2, 0, 0, -s2, c, 0, 0, 0, 0, 1, 0, cx - c * cx + s2 * cy, cy - s2 * cx - c * cy, 0, 1]; };
  const rotX = (a, cy, cz) => { const c = Math.cos(a), s2 = Math.sin(a); return [1, 0, 0, 0, 0, c, s2, 0, 0, -s2, c, 0, 0, cy - c * cy + s2 * cz, cz - s2 * cy - c * cz, 1]; };
  const sig = t => 35 * Math.sin(2 * Math.PI * Wv * 0.5 * t); // el servo va a ±35° (lo normal para un timón)
  return base.map(x => { const [nombre, paso] = NOMBRES[x.k] || [x.k, 20], o = { m: x.m, nombre, paso };
    if (x.g === 'hel') o.mov = { f: t => rotX(2 * Math.PI * 3 * t, 0, Q.za) }; // la hélice: 3 vueltas por segundo (a cámara lenta)
    if (x.g === 'dir') o.mov = { f: t => rotZ(sig(t) * R2, Q.xs, 0) };
    if (x.g === 'tI' || x.g === 'tD') { const sg = x.g === 'tI' ? 1 : -1; o.mov = { f: t => rotZ(sig(t) * R2, Q.xr, sg * Q.yR) }; }
    if (x.g === 'barra') o.mov = { f: t => { const q = puntaBrazo(Q, sig(t), 0); return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, q[0] - (Q.xr + Q.h), q[1], 0, 1]; } };
    if (x.k === 'helice') o.que = 'la hélice gira y el servo mueve los dos timones a la vez (paralelogramo: los dos giran igual)';
    return o; }); }

// 📄 el MANUAL DE MONTAJE (r8/manual.js lo pone en una hoja A4): las piezas que se imprimen con sus cantidades, lo que se compra, los pasos
// en el MISMO orden que el 🔧 montaje paso a paso del catálogo, consejos y cuidados. Todo sale de ESTA variante (medidas, motor, batería).
export function manualAero(p) { const Q = medidasConBateria(p), C = COMP_AERO, F = Q.F, cuenta = new Map();
  piezasAero(Q).forEach(([t]) => cuenta.set(t, (cuenta.get(t) || 0) + 1));
  const nota = t => /^Casco|^Cubierta/.test(t) ? 'PETG, 4 paredes' : /^Tapa de la escotilla/.test(t) ? 'PETG, boca abajo' : /^Timón/.test(t) ? 'de pie (con borde de adherencia)' : /^Torre/.test(t) ? 'tumbada' : /^Protector/.test(t) ? 'la rejilla en la cama' : /^Eje|^Poste|^Pasador/.test(t) ? 'tumbado sobre su cara plana' : /^Brazo/.test(t) ? 'boca abajo' : '';
  const piezas = [...cuenta].map(([t, n]) => [t.replace(/ \(.*\)$/, ''), n, nota(t)]);
  const compra = [(Q.motor === '370' ? C.m370.t + ', su adaptador de hélice de pinza (eje de 2 mm) y un variador (ESC) de escobillas de 10–20 A' : C.sin.t + ' y un variador (ESC) sin escobillas de 12–20 A'), 'hélice de avión de ' + Q.pulg + ' pulgadas (' + Q.pulg + '×3) que EMPUJE hacia atrás', 'servo SG90 o MG90S',
    'batería LiPo 2S de 800–1300 mAh (como mucho 72 × 35 × 20) y su correa de velcro de 20 mm', 'receptor de 2–3 canales y su emisora', '10 tornillos M3 × 10 rosca-chapa y los 2 del servo'];
  return { vistas: [['montado', 'Así queda montado'], ['despiece', 'Dónde va cada pieza'], ['cama3', 'Las piezas pequeñas, tal como salen']], piezas,
    herramientas: 'Destornillador de estrella pequeño, silicona o cola caliente, cinta de doble cara. Lo que se compra: ' + compra.join(' · ') + '.',
    edad: 'A partir de 14 años; con un adulto al cargar la batería y al probarlo (lleva hélice).',
    pasos: ['Prueba el CASCO solo en la bañera, 10 minutos y con peso dentro (un vaso de agua en una bolsa): no tiene que entrar ni una gota. Si entra, repásalo por dentro con silicona.',
      'Pega con cinta de doble cara el VARIADOR (a la izquierda) y el RECEPTOR (a la derecha) en el fondo del casco, debajo de donde irá la torre.',
      'Clava a presión los dos EJES DE LOS TIMONES en sus cojinetes de la cubierta y mete en ellos los dos TIMONES, con su brazo mirando hacia la proa.',
      'Clava los dos POSTES en sus agujeros de la cubierta y pon encima el PUENTE: los ejes de los timones entran en sus agujeros. Los timones tienen que girar sueltos.',
      'Mete las dos PATAS del PROTECTOR en sus ranuras (una gota de pegamento): la rejilla queda hacia los timones.',
      'Atornilla la TORRE con sus 4 tornillos (entran por la ventana de la torre) y el MOTOR en su placa' + (Q.motor === '370' ? ' con sus 2 tornillos M2,6; pon el adaptador en el eje y la HÉLICE.' : ' con sus 4 tornillos M3 por la cara de atrás; pon la HÉLICE con su tuerca.'),
      'Atornilla el SERVO en sus dos postes, centrado (servo a 0° con la emisora encendida), y pon su BRAZO mirando hacia la proa, igual que los de los timones.',
      'Pon los 3 PASADORES a presión en el brazo del servo y en los brazos de los timones, la BARRA DE UNIÓN encima (sus ojos giran) y las 3 TAPAS PEQUEÑAS.',
      'Pasa los cables del motor y del servo por sus CHIMENEAS, conéctalo todo y sella las chimeneas con silicona o cola caliente.',
      'Pon la cubierta sobre su repisa con cinta de doble cara o silicona y sus 6 tornillos. Mete la BATERÍA por la escotilla con su centro a ' + Q.xBat + ' mm de la popa (en las anillas) y cierra la TAPA.'],
    consejos: ['Con la batería en su sitio flota ' + (Math.abs(F.trimado) < 0.3 ? 'derecho' : 'con ' + n2(Math.round(Math.abs(F.trimado) * 10) / 10) + '° de ' + (F.trimado > 0 ? 'proa' : 'popa')) + ' y le quedan ' + n2(Math.round(F.franco)) + ' mm de borda (calculado: ' + Math.round(F.total) + ' g en total).',
      'En la emisora, deja el recorrido del servo en ±35°: los timones giran exactamente lo mismo que el servo.',
      'Si al acelerar el barco va hacia atrás, la hélice está al revés o el motor gira al revés: dale la vuelta a la hélice o cambia dos cables del motor.',
      'En el 🎬 Catálogo de CelebriR8 → 🔧 Montaje paso a paso, se ve este mismo orden pieza a pieza (con ⏮ ⏸ ⏭).'],
    cuidados: ['Después de navegar, quita la tapa y deja que se seque por dentro.', 'No lo pongas en marcha sin el protector: la hélice corta.', 'La batería LiPo, siempre con su cargador y vigilada; si se hincha, no la uses.'] }; }

const QUE = [['cama1', 'Cama 1'], ['cama2', 'Cama 2'], ['cama3', 'Cama 3'], ['cama4', 'Cama 4'], ['cama5', 'Cama 5'], ['casco', 'Solo el casco'], ['cubierta', 'Solo la cubierta y la tapa'], ['popa', 'Solo la torre, el protector y los timones'],
  ['prueba', '🧪 Prueba de encaje (cojinetes, tapa, placa del motor, brazo del servo)'], ['montado', '👀 Montado (con los componentes en gris)'], ['girado', '👀 Montado con los timones girados'], ['despiece', '📐 Despiece: el dibujo de montaje']];
export const DISENOS_AGUA = {
  aerobarcoRC: { cat: 'rc', tambien: ['juguetes', 'pro', 'mecanica'], nuevo: true, busca: 'aerobarco barco rc lancha airboat pantano hélice de aire kit casco estanco timones servo sg90 motor 370 sin escobillas brushless radiocontrol agua piscina',
    e: '🚤', t: 'Aerobarco RC por piezas (el kit entero: flota y anda)', d: 'Casco estanco sin agujeros bajo el agua, cubierta con escotilla, torre para motor 370 o sin escobillas, protector de hélice y dos timones de aire movidos por un servo. El programa calcula dónde va la batería para que flote derecho. Solo pones los componentes', uso: 'funcional', color: '#0077b6',
    campos: [n('largo', 'Largo del casco', 240, 220, 245, 1), n('manga', 'Ancho del casco (manga)', 130, 110, 140, 1), s('helice', 'Hélice (de avión)', '5', [['4', '4 pulgadas (Ø102)'], ['5', '5 pulgadas (Ø127)'], ['6', '6 pulgadas (Ø152)']]),
      s('motor', 'Motor', '370', [['370', 'Motor 370 de escobillas (barato)'], ['sin', 'Sin escobillas 22xx (corre mucho más)']]), s('que', 'Qué imprimo', 'cama1', QUE)],
    gen: p => genAero(p), manual: p => manualAero(p),
    nota: p => { let Q = null, Cs = []; try { Q = medidasConBateria(p); Cs = camasDe(piezasAero(Q)); } catch (e) { return '⚠️ ' + e.message; } const C = COMP_AERO, F = Q.F;
      if (p.que === 'despiece') return '📐 EL DIBUJO DE MONTAJE: el casco abajo; encima la cubierta; arriba, la torre con el motor, el protector y los timones con su puente. Gíralo con el ratón.';
      if (p.que === 'prueba') return '🧪 PRUEBA DE ENCAJE (unos 25 g, en PETG como el barco): el EJE del timón y el POSTE entran a presión en sus cojinetes y la ESPIGA en su ranura; la RODAJA de timón gira suelta en su eje; la esquina de la TAPA entra justa por fuera de la esquina de la BRAZOLA (que no baile ni haya que forzarla); la PLACA del motor con TU motor (' + (Q.motor === '370' ? 'el resalte en su agujero y los 2 tornillos M2,6' : 'los 4 tornillos M3 de la cruz') + '); el BRAZO en la estría de TU servo. Si algo no casa, dime cuánto y lo ajusto.';
      return 'PARA QUÉ: un AEROBARCO RC de verdad (hélice de aire, como los de los pantanos): ' + Q.L + ' × ' + Q.W + ' mm, casco de fondo plano que planea y hace trompos. El CASCO no tiene ni un agujero por debajo del agua: no se cuela nada aunque te equivoques al montar. '
        + 'LO QUE COMPRAS (lo demás se imprime): ' + (Q.motor === '370' ? C.m370.t + ' con su ' + C.adaptador.t.toLowerCase() + '; ' + C.escE.t : C.sin.t + '; ' + C.escS.t) + '; una ' + C.helice.t.toLowerCase() + ' de ' + Q.pulg + ' pulgadas (' + Q.pulg + '×3; la del ' + (Q.motor === '370' ? '370 gira a izquierdas o derechas: pon la que EMPUJE hacia atrás' : 'sin escobillas, con su tuerca') + '); ' + C.servo.t + '; ' + C.bateria.t + ' con su correa de velcro de 20 mm; ' + C.receptor.t + ' y su emisora; 10 tornillos M3 × 10 (rosca-chapa) y 2 tornillos del servo. '
        + 'DÓNDE VA CADA COSA: el MOTOR en la placa de la torre; el SERVO de pie en sus dos postes, entre los dos timones (su cable baja por su chimenea); el VARIADOR (izquierda) y el RECEPTOR (derecha) dentro, debajo de la torre (se ponen una vez: con cinta de doble cara); la BATERÍA debajo de la escotilla, con su centro a ' + Q.xBat + ' mm de la popa: ahí están las anillas de su correa (es lo más atrás que se puede sin dejar de sacarla por la escotilla); el cable del motor baja por la chimenea al lado de la torre. '
        + 'PESO Y FLOTACIÓN (calculado): unos ' + Math.round(F.total) + ' g en total; se hunde ' + n2(Math.round(F.calado * 10) / 10) + ' mm y le quedan ' + n2(Math.round(F.franco * 10) / 10) + ' mm de borda fuera del agua; ' + (Math.abs(F.trimado) < 0.3 ? 'flota derecho' : 'flota con ' + n2(Math.round(Math.abs(F.trimado) * 10) / 10) + '° de ' + (F.trimado > 0 ? 'proa' : 'popa') + ' (nada: un barco de fondo plano así de ancho casi no cabecea)') + '. '
        + 'VA EN ' + Cs.length + ' CAMAS de la P1P (el casco solo ya ocupa una: en la A1 mini no cabe). Todo sin soportes. Casco, cubierta y tapa en PETG con 4 paredes y 5 capas arriba y abajo (estancos); lo demás en PETG o PLA. '
        + 'CÓMO SE MONTA: (1) prueba el CASCO vacío en la bañera 10 minutos: sin una gota dentro; (2) la cubierta: los timones con sus EJES a presión en sus cojinetes, los dos POSTES y el PUENTE encima; las PATAS del protector en sus ranuras (una gota de pegamento); la TORRE con 4 tornillos (entran por su ventana) y el motor en su placa; (3) el servo en sus postes, centrado, con su BRAZO mirando hacia la proa (igual que los de los timones) y la BARRA DE UNIÓN en los tres (pasador a presión en cada brazo, el ojo de la barra gira; su tapa pequeña); '
        + '(4) dentro: batería, variador y receptor; los cables por sus chimeneas y sella las chimeneas con silicona o cola caliente; (5) la cubierta sobre su repisa con cinta de doble cara o silicona y sus 6 tornillos; la tapa de la escotilla, a presión (con un trozo de cinta si navegas con olas). '
        + 'TIMONES: es un paralelogramo: giran EXACTAMENTE lo que el servo; deja el recorrido del servo en ±35° en la emisora (a ±45° tampoco toca nada). Probado con el ordenador (test/unit/aerobarco.mjs): nada se pisa, la hélice gira sin tocar el protector, los timones giran a tope sin tocar nada, el casco es una sola pieza cerrada. Lo que no se puede probar sin agua: lo rápido que anda con TU motor y TU hélice.'; } }
};
