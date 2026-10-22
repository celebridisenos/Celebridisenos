// ================= 21-10-2026 · 🎯 LANZABOLAS DE MUELLE (tarea 28 del plan maestro) · diseño PROPIO (© CelebriDiseños) =================
// Ella (21-10, con la foto de una pistola de juguete de bolas blandas de 10,41 €): «airsoft de balines» · «funcional eh y otra premium para solo en
// terreno». Dos versiones del MISMO mecanismo (pistón de aire con muelle, como las de muelle de verdad), con forma propia (nada de Glock ni marcas)
// y la PUNTA NARANJA siempre:
//  · 🟠 JUGUETE: bolas BLANDAS de 7–8 mm (las de la foto), poca fuerza: calculada por debajo del límite de los juguetes (EN 71-1).
//  · 🎯 TERRENO (premium): bolas de 6 mm de airsoft, más fuerza, cachas con textura y raíl. En España es un arma de 4.ª categoría (tarjeta de armas
//    del ayuntamiento): solo en un campo de airsoft, con gafas. La nota y la ficha lo dicen.
// CÓMO FUNCIONA (las cuentas, abajo): se tira de la CORREDERA hacia atrás → arrastra el CILINDRO (atornillado a ella), que empuja el PISTÓN y aprieta
// el MUELLE contra el tabique de atrás; el FIADOR se mete en la muesca de la VARILLA y lo deja armado. Con la boquilla atrás, el muelle del CARGADOR
// sube una bola a la RECÁMARA. Al volver la corredera (su muelle de debajo del cañón), la BOQUILLA empuja la bola hasta el RETÉN (una lengüeta con un
// diente) y tapa la ventana del cargador. GATILLO: su BARRA va hacia atrás, su cuña levanta la cola del fiador, el diente baja y el pistón sale
// disparado: el aire empuja la bola por encima del retén y por el cañón.
// Se imprime TODO sin soportes: las mitades del armazón tumbadas (la cara de fuera en la cama, los huecos hacia arriba), el cilindro y el cañón DE PIE
// (redondos de verdad: no pierden aire), la corredera boca abajo, el pistón sobre su cara de atrás, la varilla y la barra de lado.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';
import { colocaCamas } from './cat_camion3.js';

const { n, s, M, rr, poli, cil, circ, n2, R2 } = A;
// ---------- ayudas de forma (mm; x hacia la boca, y a la izquierda, z arriba; el eje del cañón en y = 0, z = 0) ----------
const caja3 = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);
const enXZ = (cs, y0, y1) => cs.extrude(y1 - y0).rotate([90, 0, 0]).translate([0, y1, 0]);           // un dibujo (x, z) con grosor de y0 a y1
const segs = d => Math.max(32, Math.min(128, Math.round(d * 3 + 24)));
const cilX = (d, x0, x1, z = 0, y = 0) => M().cylinder(x1 - x0, d / 2, d / 2, segs(d)).rotate([0, 90, 0]).translate([x0, y, z]);
const conoX = (d0, d1, x0, x1, z = 0) => M().cylinder(x1 - x0, d0 / 2, d1 / 2, 64).rotate([0, 90, 0]).translate([x0, 0, z]);
const cilY = (d, y0, y1, x = 0, z = 0) => M().cylinder(y1 - y0, d / 2, d / 2, 40).rotate([-90, 0, 0]).translate([x, y0, z]);
const cilZ = (d, z0, z1, x = 0, y = 0) => M().cylinder(z1 - z0, d / 2, d / 2, 40).translate([x, y, z0]);
const conoY = (d0, d1, y0, y1, x = 0, z = 0) => M().cylinder(y1 - y0, d0 / 2, d1 / 2, 40).rotate([-90, 0, 0]).translate([x, y0, z]);
// la GOTA: un círculo con punta a 45° hacia +v (así un agujero tumbado se imprime sin techo): arco de 45° a −225° y la punta arriba
const gotaP = (r, k = 28) => { const P = []; for (let i = 0; i <= k; i++) { const a = (45 - i * 270 / k) * R2; P.push([r * Math.cos(a), r * Math.sin(a)]); } P.push([0, r * Math.SQRT2]); return P; };
// agujero a lo largo de x, con la punta hacia +z (punta = 1) o hacia −z (punta = −1)
const gotaX = (d, x0, x1, z = 0, punta = 1) => poli(gotaP(d / 2).map(([u, v]) => [u, punta * v])).extrude(x1 - x0).rotate([90, 0, 90]).translate([x0, 0, z]);
// agujero a lo largo de y (punta hacia +z o −z) y a lo largo de z (punta hacia +x)
const gotaY = (d, y0, y1, x = 0, z = 0, punta = 1) => poli(gotaP(d / 2).map(([u, v]) => [u, punta * v])).extrude(y1 - y0).rotate([90, 0, 0]).translate([x, y1, z]);
const gotaZ = (d, z0, z1, x = 0, y = 0) => poli(gotaP(d / 2).map(([u, v]) => [v, u])).extrude(z1 - z0).translate([x, y, z0]);
const gotaZm = (d, z0, z1, x = 0, y = 0) => poli(gotaP(d / 2).map(([u, v]) => [-v, u])).extrude(z1 - z0).translate([x, y, z0]);   // (la punta hacia −x)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- las MEDIDAS: todo sale de aquí (y se comprueba en test/unit/lanzabolas.mjs) ----------
export const VERSIONES = { juguete: '🟠 Juguete de bolas blandas (casa, poca fuerza)', terreno: '🎯 Premium de 6 mm (solo en el campo de airsoft)' };
// 21-10 (tarde) · los MODELOS (ella: «más pistolas premium de diferentes formas»): la MISMA mecánica comprobada (corredera, pistón, fiador, seguro,
// cargador con su botón, hop-up) con otro CUERPO: el perfil del armazón (guardamonte, empuñadura, base, cola de castor, tapapolvo con raíl), los
// adornos de la corredera, la textura de las cachas y la punta. Nada de formas de marcas. Todo lo nuevo se imprime igual de SIN soportes.
export const ESTILOS = {
  clasica: { t: 'Clásica', guarda: 'recta', dedos: 'apoyos', espalda: 'recta', base: 'normal', castor: 'normal', tapa: 'normal', estrias: 'rectas', nariz: false, lomo: false, linea: false, trasera: false, textura: 'rombos', punta: 'normal',
    d: 'guardamonte recto, apoyos para los dedos, cachas de rombos' },
  competicion: { t: 'Competición', guarda: 'gancho', dedos: 'estrias', espalda: 'recta', base: 'embudo', castor: 'largo', tapa: 'largo', estrias: 'diagonal', nariz: true, lomo: true, linea: false, trasera: false, textura: 'puntos', punta: 'compensador', ventana: true,
    d: 'ventana en la corredera que deja ver el cañón, compensador naranja, embudo del cargador, cola de castor larga, estrías en diagonal, lomo estriado y guardamonte con gancho' },
  tactica: { t: 'Táctica', guarda: 'redonda', dedos: 'estrias', espalda: 'joroba', base: 'anilla', castor: 'corto', tapa: 'normal', estrias: 'gruesas', nariz: true, lomo: false, linea: false, trasera: true, textura: 'lineas', punta: 'normal',
    d: 'guardamonte redondo, empuñadura con curva de la palma y estrías delante, anilla para la correa, estrías gruesas' },
  futura: { t: 'Futura', guarda: 'angular', dedos: 'angulos', espalda: 'recta', base: 'talon', castor: 'angular', tapa: 'angular', estrias: 'chevron', nariz: true, lomo: false, linea: true, trasera: true, textura: 'hex', punta: 'normal', cuna: true,
    d: 'todo en ángulos: frontal en cuña, guardamonte en punta, cola de castor en flecha, talón en la base, estrías en V y una línea a lo largo de la corredera' } };
// los TONOS (solo para verla; se imprime en el color de filamento que quieras, con la punta SIEMPRE naranja)
export const TONOS = { estilo: 'Los de este modelo', negro: 'Negra', arena: 'Arena (FDE) con corredera negra', oliva: 'Verde oliva con corredera negra', plata: 'Corredera plata y armazón negro' };
const PALETA = { negro: { corredera: '#26272b', armazon: '#26272b', cachas: '#3a3d44', mando: '#26272b', cargador: '#34373d' },
  arena: { corredera: '#27282c', armazon: '#b39b6c', cachas: '#a08a5d', mando: '#27282c', cargador: '#8f7b52' },
  oliva: { corredera: '#27282c', armazon: '#5d6a45', cachas: '#525e3c', mando: '#27282c', cargador: '#4b5636' },
  plata: { corredera: '#a9b0b8', armazon: '#26272b', cachas: '#3a3d44', mando: '#a9b0b8', cargador: '#34373d' },
  gris: { corredera: '#4c5159', armazon: '#1f2024', cachas: '#2d2f35', mando: '#4c5159', cargador: '#2d2f35' } };
const TONO_DE = { clasica: 'negro', competicion: 'plata', tactica: 'arena', futura: 'gris' };
export function medidas(p = {}) {
  const T = p.version === 'terreno', V = T ? 'terreno' : 'juguete';
  const E = ESTILOS[p.estilo] ? p.estilo : 'clasica', ES = ESTILOS[E], col = PALETA[p.tono && PALETA[p.tono] ? p.tono : TONO_DE[E]];
  const B = T ? 5.95 : clamp(+p.bola || 7.5, 6.5, 8.5), r = B / 2;                       // la bola
  const Db = T ? 6.15 : B + 0.3, wb = T ? 2.4 : 2.0, ODb = Db + 2 * wb;                   // el cañón (ánima y pared)
  const dn = Db - 0.4, dni = T ? 3.0 : 3.6;                                              // la boquilla (fuera / dentro)
  const Dc = T ? 20 : 18, wc = 2.2, ODc = Dc + 2 * wc;                                    // el cilindro de aire
  const oring = T ? { d: 16, e: 2 } : { d: 14, e: 2 }, Rp = (Dc - 0.5) / 2, Lp = 10;      // la junta tórica y la cabeza del pistón
  const ranura = (Dc + 0.3 - 2 * oring.e) / 2;                                            // el fondo de la ranura de la junta (aprieta 0,15 por lado)
  const th = 16 * R2, sn = Math.sin(th), cs = Math.cos(th);                               // el ángulo de la empuñadura y del cargador
  const Dch = B + 0.6;                                                                    // el canal del cargador (redondo)
  const S = T ? 18 : 14;                                                                  // lo que se tira de la corredera (corto: la pistola sale con proporciones de réplica)
  const blkY = 8, blkZ = T ? 10.5 : 9;                                                   // la recámara: 16 de ancho (la de campo, más alta: lleva el tornillo del hop-up)
  // EL CARGADOR DE VERDAD: la bola de arriba espera en sus LABIOS, por debajo del cañón; la boquilla (al volver la corredera) la empuja por arriba
  // (la pisa 1,2 mm), la saca de los labios hacia delante y una RAMPA (a 35°) la sube al ánima hasta el retén. Con la boquilla delante, la siguiente
  // espera debajo de ella; al tirar de la corredera la boquilla pasa por encima y la siguiente sube a los labios.
  // la BOQUILLA CON QUILLA: abajo es estrecha (±kq) y a los lados está recortada hasta zcut → los LABIOS suben a sus lados (la quilla pasa entre ellos)
  const rn = dn / 2, kq = T ? 1.9 : 2.4, zcut = -rn + (T ? 1.3 : 1.5), tl = T ? 0.9 : 1.0;
  const zLt = zcut - 0.3, zLc = zLt - tl, dL = T ? 1.35 : 1.75, zL = zLc - dL, wL = 2 * Math.sqrt(r * r - dL * dL);   // labios: arriba, abajo (donde toca la bola), la bola y el hueco
  const zs0 = -(Db - B) / 2, rampa = 35 * R2;                                              // la bola en el ánima (apoyada abajo) · la rampa
  const x_t = S + 3, x_s = x_t + r + 0.2;                                                  // la punta de la boquilla (delante; atrás queda 3 mm dentro) · la bola en el retén
  const xR1 = x_s - 0.8, xR0 = xR1 - (zs0 - zL) / Math.tan(rampa), xL = xR0 - 1.5;        // la rampa (de xR0 a xR1) y la bola en los labios
  const x_bc = xL + Math.tan(th) * (0 - zL);                                               // (el eje del cargador pasa por la bola de los labios)
  const apr = T ? 0.25 : 0.35, del = Db - B + apr;                                       // el RETÉN: lo que aprieta la bola (apoyada abajo en el ánima) y lo que baja su diente
  const x_bump = x_s + Math.sqrt(r * r - (r - apr) * (r - apr));                          // donde la bola, en su sitio, toca el diente
  const xf0 = x_s - 6, xf1 = x_bump + 2.5, x_blk1 = xf1 + 3.5;                           // la lengüeta del retén y el final de la recámara
  const x_m = x_s + (T ? 52 : 50);                                                        // la boca del cañón (proporciones de pistola de verdad)
  // el cilindro (con la corredera delante): base de la boquilla en x = −1, cono a 45°, tubo hacia atrás
  const x_nb = -1, x_c0 = x_nb - (ODc - dn) / 2;
  const x_ib = x_nb + dn / 2 - Dc / 2 - wc * Math.SQRT2;                                  // donde el cono de dentro llega al tubo
  const x_pf = x_nb + dn / 2 - wc * Math.SQRT2 - Rp - 0.7;                                // frente del pistón en reposo (0,7 del cono)
  const ov = 0.7, Spm = S - 0.7, Sp = Spm - ov;                                           // lo que anda el pistón: al tirar / armado
  const x_prR = x_pf - Lp, x_prC = x_prR - Sp;                                            // cara de atrás del pistón: reposo / armado
  const x_cr = x_prC - 1.5;                                                               // final del cilindro (la junta siempre dentro)
  const x_bh = x_cr - S, eBh = 4;                                                         // el TABIQUE: la corredera para cuando el cilindro lo toca
  const L1 = x_prR - x_bh, L2 = L1 - Spm, L2c = L1 - Sp;                                  // el muelle: en reposo, a tope, armado
  // la VARILLA (6 × 6) y su muesca: tan larga que el fiador y la subida de la barra (que llega 17,4 mm por delante del diente) quedan detrás del tabique
  const rs = 6, Lr0 = L1 + 8, xt00 = x_prR - Spm - (Lr0 - 4) + 0.7, Lr = Lr0 + Math.max(0, Math.ceil(xt00 + 17.4 + 4.5 - x_bh + eBh - 4)), u2 = Lr - 4, u1 = u2 - 4.5, prof = 2;
  const x_t0 = x_prR - Spm - u2 + ov;                                                     // la cara del diente del FIADOR (la muesca le pasa 0,7)
  const zD = -(ODc / 2 + 0.8), z_sc = ODc / 2 + 0.8, z_top = z_sc + 3;                    // cubierta del armazón, techo y tapa de la corredera
  const Wsi = ODc + 1.6, Wf = Wsi - 0.4, Wso = Wsi + 4.8, z_sb = zD - 7, z_v = zD - 3.5;   // anchos (corredera por dentro / armazón / corredera) y el raíl en V
  const x_sff = x_m - 6, x_sfi = x_sff - 4;                                               // la cara de delante de la corredera (para contra la punta naranja)
  const x_ff = x_sfi - S - 1;                                                             // el armazón acaba antes (deja sitio a la corredera)
  const mR = { d: 5, hilo: 0.4, L0: 40 }, z_rg = -(ODb / 2 + 3.6);                        // muelle de la corredera: justo debajo del cañón (como en las de verdad)
  const x_rs = x_blk1 + 5;                                                                 // su asiento, delante de la recámara (por debajo pasa la pala del gatillo)
  const zGb = T ? -104 : -100;                                                            // el fondo de la empuñadura (larga: cabe la mano entera)
  const x_tr = xL + 12;                                                                   // el gatillo
  const zBar0 = z_sb + 1.2, zBar1 = zD - 1.8, zTb = z_sb - 21, zGi = zTb - 2.5, zGo = zTb - 6.5; // la barra, el final de la pala y el guardamonte (dentro / fuera)
  const xG1 = x_tr + 17;                                                                  // el guardamonte por delante
  const muelle = { hilo: T ? (p.muelle === 'fuerte' ? 1.5 : 1.4) : 1.0, D: T ? 14 : 13, L0: Math.ceil((L1 + 8) / 5) * 5 };   // el muelle principal (comprado: largos de 5 en 5)
  const x_fr = x_t0 - 9;                                                                  // la parte de atrás del armazón
  return { E, ES, col, V, T, B, r, apr, Db, wb, ODb, dn, dni, Dc, wc, ODc, oring, Rp, Lp, ranura, th, sn, cs, Dch, S, blkY, blkZ, x_bc, x_t, x_s, del, x_bump, rn, kq, zcut, tl, zLc, zL, dL, wL, zLt, zs0, xR0, xR1, xL, xf0, xf1, x_blk1, x_m,
    x_nb, x_c0, x_ib, x_pf, ov, Spm, Sp, x_prR, x_prC, x_cr, x_bh, eBh, L1, L2, L2c, rs, Lr, u1, u2, prof, x_t0, zD, z_sc, z_top, Wsi, Wf, Wso, z_sb, z_v,
    x_sff, x_sfi, x_ff, mR, z_rg, x_rs, zGb, x_tr, zBar0, zBar1, zTb, zGi, zGo, xG1, muelle, x_fr };
}
// el eje del CARGADOR: pasa por (x_bc, 0) inclinado th (arriba hacia delante); x en la altura z
export const ejeCargador = (Q, z) => Q.xL + Math.tan(Q.th) * (z - Q.zL);

// ---------- las CUENTAS: energía, velocidad (CALCULADAS: rendimiento 0,3 supuesto; se mide con un cronógrafo) ----------
export function cuentas(Q) {
  const G = 79000, d = Q.muelle.hilo, Dm = Q.muelle.D - d, nAct = Math.max(6, Math.round((Q.muelle.L0 - 2 * d) / (d * 3.2)));
  const k = G * d ** 4 / (8 * Dm ** 3 * nAct), solido = (nAct + 2) * d;                  // N/mm
  const c1 = Q.muelle.L0 - Q.L1, c2 = Q.muelle.L0 - Q.L2c;                                 // apretado en reposo y armado
  const Em = 0.5 * k * (c2 * c2 - c1 * c1) / 1000;                                         // julios guardados en el muelle
  const eta = 0.3, Eb = Em * eta, masa = Q.T ? [0.20, 0.25] : [0.24];                      // g (bola blanda de TPE de 7,5 mm ≈ 0,24 g)
  const v = masa.map(m => Math.sqrt(2 * Eb / (m / 1000)));
  const area = Math.PI * (Q.r / 10) ** 2;                                                   // cm² (la cara de la bola)
  const Vc = Math.PI / 4 * (Q.Dc / 10) ** 2 * (Q.Sp / 10), Vb = Math.PI / 4 * (Q.Db / 10) ** 2 * ((Q.x_m - Q.x_s) / 10); // cm³ de aire y de cañón
  return { k, nAct, solido, c1, c2, Em, eta, Eb, masa, v, fps: v.map(x => x * 3.281), porArea: Eb / area, Vc, Vb, fuerzaTirar: k * (Q.muelle.L0 - Q.L2) + 3.5 };
}

// ---------- 1) la RECÁMARA con su CAÑÓN (una pieza, se imprime DE PIE: la cara de atrás en la cama) ----------
function canalCargador(Q, z0, z1, d = Q.Dch) { // el canal redondo inclinado (de z0 a z1), como un cilindro a lo largo de su eje
  const L = (z1 - z0) / Q.cs + 0.02, x0 = ejeCargador(Q, z0);
  return M().cylinder(L, d / 2, d / 2, 48).rotate([0, Q.th / R2, 0]).translate([x0, 0, z0 - 0.01]); }
export function canon(Q) {
  let m = caja3(0, Q.x_blk1, -Q.blkY, Q.blkY, -Q.blkZ, Q.blkZ).add(cilX(Q.ODb, Q.x_blk1 - 0.01, Q.x_m));
  m = m.subtract(cilX(Q.Db, -1, Q.x_m + 1));                                                        // el ánima
  // el CAMINO DE LA BOLA: de los labios, hacia delante, por la rampa, hasta el ánima (una bola de 0,15 más que va dejando su hueco)
  m = m.subtract(caminoBola(Q, 0.15));
  { const z2 = -Q.rn - Q.r - 1; m = m.subtract(M().hull([M().sphere(Q.r + 0.2, 32).translate([ejeCargador(Q, z2), 0, z2]), M().sphere(Q.r + 0.2, 32).translate([Q.xL, 0, Q.zL])])); }   // por donde sube la siguiente (del canal a los labios)
  // el hueco de la cabeza del cargador (sus labios entran aquí) y la entrada achaflanada
  m = m.subtract(cabezaCargador(Q, 0.2).intersect(caja3(-5, Q.xR0 + 0.6, -20, 20, -Q.blkZ - 1, Q.zLt + 0.2)));
  // el RETÉN: hueco encima de la lengüeta (su final a 45°), la U alrededor (0,6) y el diente por debajo
  const zl = Q.Db / 2 + 1.2, wl = 2.2;
  m = m.subtract(M().hull([caja3(Q.xf0 - 0.6, Q.xf1, -wl - 0.6, wl + 0.6, zl, zl + 0.01), caja3(Q.xf0 - 0.6, Q.xf1 + (Q.blkZ - zl), -wl - 0.6, wl + 0.6, Q.blkZ + 0.01, Q.blkZ + 0.02)]).add(caja3(Q.xf0 - 0.6, Q.xf1 + (Q.blkZ - zl) + 0.01, -wl - 0.6, wl + 0.6, zl, Q.blkZ + 1)).intersect(caja3(Q.xf0 - 0.6, Q.x_blk1 - 0.5, -9, 9, zl, Q.blkZ + 1)));
  [-1, 1].forEach(sg => { m = m.subtract(caja3(Q.xf0 - 0.6, Q.xf1, sg > 0 ? wl : -wl - 0.6, sg > 0 ? wl + 0.6 : -wl, 0, zl + 0.01)); });
  m = m.subtract(caja3(Q.xf0 - 0.6, Q.xf0, -wl - 0.6, wl + 0.6, 0, zl + 0.01));
  const dz = Q.Db / 2 - Q.del, diente = M().hull([caja3(Q.x_bump - 1.2, Q.x_bump + 1.2, -wl + 0.3, wl - 0.3, Q.Db / 2 - 0.01, Q.Db / 2), caja3(Q.x_bump - 0.3, Q.x_bump + 0.3, -wl + 0.3, wl - 0.3, dz, dz + 0.01)]);
  m = m.add(diente.intersect(cilX(Q.Db + 0.2, Q.xf0, Q.xf1)));
  // 🎯 el HOP-UP (la de campo): un puente encima de la lengüeta con su tornillo prisionero M3 (aprieta la goma de TPU pegada en la lengüeta:
  // la bola sale girando hacia atrás y vuela más recto y más lejos). Se regula desde arriba, por el agujerito de la corredera, con una llave Allen de 1,5.
  if (Q.T) { const H = hopUp(Q); m = m.add(enXZ(poli([[H.x1, H.zb0], [H.x1, Q.blkZ], [H.x0, Q.blkZ], [H.x0 + (Q.blkZ - H.zb0), H.zb0]]), -wl - 0.61, wl + 0.61)).subtract(gotaZ(2.5, H.zb0 - 1, Q.blkZ + 1, Q.x_bump, 0)); }
  // la boca: anillo para la punta naranja (encola)
  return m; }
// el HOP-UP: la goma (TPU, pegada encima de la lengüeta), el puente con su tornillo y lo que se regula
export const hopUp = Q => { const zl = Q.Db / 2 + 1.2, tp = 1.6; return { x0: Q.x_bump - 2.6, x1: Q.x_bump + 2.6, zl, tp, zb0: zl + tp + 0.6 }; };
export function gomaHop(Q) { const H = hopUp(Q); return caja3(Q.x_bump - 2, Q.x_bump + 2, -1.8, 1.8, H.zl, H.zl + H.tp); }
// la PUNTA NARANJA (obligatoria en las réplicas): una capucha que tapa la boca y para la corredera delante
export function punta(Q) {
  // 🏁 el COMPENSADOR (modelo Competición): la misma capucha con un cuerpo más gordo delante y 3 respiraderos arriba (en gota: de pie, sin techo);
  // la bola ya ha salido del cañón cuando pasa por ahí. Sigue siendo NARANJA entero.
  if ((Q.ES || {}).punta === 'compensador') { const R = Q.ODb / 2 + 4.5, xa = Q.x_m - 3, xb = Q.x_m + 13;
    let c = cilX(2 * R, xa, xb).add(cilX(Q.ODb + 4.4, Q.x_sff, xa + 0.01)).subtract(cilX(Q.ODb + 0.15, Q.x_sff - 1, Q.x_m)).subtract(cilX(Q.Db + 1.6, Q.x_m - 1, xb + 1));
    [3, 6.5, 10].forEach(d => { c = c.subtract(gotaZm(3, 0, R + 1, Q.x_m + d, 0)); });
    return c; }
  return cilX(Q.ODb + 4.4, Q.x_sff, Q.x_m + 1.2).subtract(cilX(Q.ODb + 0.15, Q.x_sff - 1, Q.x_m)).subtract(cilX(Q.Db + 1.2, Q.x_m - 1, Q.x_m + 2)); }

// el camino de la bola (para cortarlo en la recámara y para comprobar que pasa): esferas en fila por el camino
export function puntosCamino(Q) { const P = [], add = (x, z) => P.push([x, z]);
  for (let x = Q.xL; x <= Q.xR0; x += 0.5) add(x, Q.zL);
  for (let k = 0; k <= 16; k++) { const t = k / 16; add(Q.xR0 + (Q.xR1 - Q.xR0) * t, Q.zL + (Q.zs0 - Q.zL) * t); }
  for (let x = Q.xR1; x <= Q.x_s + 2; x += 0.5) add(x, Q.zs0); return P; }
function caminoBola(Q, h) { const P = puntosCamino(Q), L = [];
  for (let i = 1; i < P.length; i++) L.push(M().hull([M().sphere(Q.r + h, 32).translate([P[i - 1][0], 0, P[i - 1][1]]), M().sphere(Q.r + h, 32).translate([P[i][0], 0, P[i][1]])]));
  return N.union(L); }
// la CABEZA del cargador (su parte de arriba, la que entra en la recámara): su forma por fuera (+ holgura)
function cabezaCargador(Q, h = 0) { const a = Q.Dch / 2 + 1.2 + h, zb = Q.zGb + 6, L = (Q.zLt - zb) / Q.cs + 2 * a, x0 = ejeCargador(Q, zb);
  return caja3(-a, a, -a, a, -a, L).rotate([0, Q.th / R2, 0]).translate([x0, 0, zb]).intersect(caja3(-500, Q.xR0 + 0.5 + h, -50, 50, zb - 0.01, Q.zLt + h)); }

// ---------- 2) el CILINDRO con su BOQUILLA (una pieza, DE PIE: la boca de atrás en la cama) ----------
export function cilindro(Q, dx = 0) {
  let m = cilX(Q.ODc, Q.x_cr, Q.x_c0 + 0.01).add(conoX(Q.ODc, Q.dn, Q.x_c0, Q.x_nb)).add(cilX(Q.dn, Q.x_nb - 0.01, Q.x_t));
  // el NERVIO de arriba: entra 1 mm en su ALOJAMIENTO del techo de la corredera (ese encaje lleva la fuerza al tirar) y ahí se atornilla.
  // (21-10, tarde: el agujero bajaba hasta z = 3 y el M3 × 12 entraba 6 mm en el cilindro del aire, justo donde corre el pistón. Ahora el agujero
  // es CIEGO, se para 0,7 mm por encima del cilindro, y el tornillo es un M3 × 5: comprobado en test/unit/lanzabolas.mjs)
  const xr0 = Q.x_cr + 4, xr1 = Q.x_c0 - 2, xa = (xr0 + xr1) / 2, TC = tornilloCorredera(Q);
  m = m.add(caja3(xr0, xr1, -4, 4, Q.ODc / 2 - 1, Q.z_sc + TC.encaje - 0.1));
  m = m.subtract(gotaZ(2.6, TC.fondo, Q.z_sc + TC.encaje + 1, xa, 0));
  // por dentro: el tubo, el cono a 45° y el agujero de la boquilla
  m = m.subtract(cilX(Q.Dc, Q.x_cr - 1, Q.x_ib + 0.01)).subtract(conoX(Q.Dc, 0.01, Q.x_ib, Q.x_ib + Q.Dc / 2)).subtract(cilX(Q.dni, Q.x_ib, Q.x_t + 1));
  // la QUILLA de la boquilla: los lados de abajo recortados (los labios del cargador pasan por ahí; la quilla, entre ellos)
  [-1, 1].forEach(sg => { m = m.subtract(caja3(Q.x_nb + 0.5, Q.x_t + 1, sg > 0 ? Q.kq : -Q.dn, sg > 0 ? Q.dn : -Q.kq, -Q.dn, Q.zcut)); });
  // la punta de la BOQUILLA achaflanada a 45°: al volver la corredera, empuja hacia abajo la bola siguiente (no se atasca con ella)
  m = m.subtract(cilX(Q.dn + 2, Q.x_t - 0.8, Q.x_t + 0.01).subtract(conoX(Q.dn, Q.dn - 1.6, Q.x_t - 0.81, Q.x_t + 0.001)));
  // la entrada de atrás, achaflanada (la junta entra sin cortarse)
  m = m.subtract(conoX(Q.Dc + 1.6, Q.Dc, Q.x_cr - 0.01, Q.x_cr + 0.8));
  return m.translate([dx, 0, 0]); }
export const tornilloCilindro = Q => { const xr0 = Q.x_cr + 4, xr1 = Q.x_c0 - 2; return (xr0 + xr1) / 2; };
// el TORNILLO de la corredera (M3 avellanado, a ras de arriba): su largo, dónde acaba su punta, el fondo del agujero ciego y lo que entra el nervio
export const tornilloCorredera = Q => { const L = 5, punta = Q.z_top - L; return { L, punta, fondo: punta - 0.3, encaje: 1.0, x: tornilloCilindro(Q), x0: Q.x_cr + 4, x1: Q.x_c0 - 2 }; };

// ---------- 3) el PISTÓN (sobre su cara de atrás) y su VARILLA (de lado) ----------
export function piston(Q, dx = 0) {
  const x0 = Q.x_prR, x1 = Q.x_pf, xn = x1 + Q.Rp - 1.0;
  let m = cilX(2 * Q.Rp, x0, x1 + 0.01).add(conoX(2 * Q.Rp, 2.0, x1, xn));
  // la ranura de la junta: su lado de atrás recto (ahí apoya con la presión), el de delante a 45° (se imprime sin techo)
  const xg0 = x1 - 6, xg1 = xg0 + 2.3, g = Q.Rp - Q.ranura;
  const anillo = enXZ(poli([[xg0, Q.ranura], [xg1, Q.ranura], [xg1 + g, Q.Rp + 0.01], [xg1 + g + 0.5, Q.Rp + 1], [xg0, Q.Rp + 1]]), -0.001, 0.001);
  m = m.subtract(torno2(Q, xg0, xg1, g));
  // la COLA DE MILANO de detrás (la varilla entra de lado)
  m = m.subtract(colaMilano(Q, 0.15).translate([x0, 0, 0]));
  return m.translate([dx, 0, 0]); }
function torno2(Q, xg0, xg1, g) { // el hueco de la ranura, de revolución alrededor del eje x
  const P = [[Q.ranura, xg0], [Q.Rp + 1, xg0], [Q.Rp + 1, xg1 + g + 1], [Q.Rp + 0.01, xg1 + g + 0.01], [Q.ranura, xg1]];
  return A.CS().ofPolygons([N.ccw(P)]).revolve(96).rotate([0, 90, 0]); }
function colaMilano(Q, h) { // en (x, z) desde la cara (x = 0) hacia dentro (+x), a lo ancho de y
  const P = [[-0.01, -1.85 - h], [1, -1.85 - h], [2, -2.85 - h], [4.85 + h, 0], [2, 2.85 + h], [1, 1.85 + h], [-0.01, 1.85 + h]];
  return enXZ(poli(P), -Q.Rp - 1, Q.Rp + 1); }
export function varilla(Q, dx = 0) {
  const x0 = Q.x_prR, xe = x0 - Q.Lr, h = Q.rs / 2;
  let m = caja3(xe, x0 + 0.01, -h, h, -h, h).add(colaMilano(Q, 0).intersect(caja3(0, 4.85, -h, h, -h, h)).translate([x0, 0, 0]));
  // la MUESCA del fiador (por debajo): cara de atrás recta (agarra), la de delante en rampa a 45°
  const xa = x0 - Q.u2, xb = x0 - Q.u1;
  m = m.subtract(enXZ(poli([[xa, -h - 1], [xa, -h + Q.prof], [xb - Q.prof, -h + Q.prof], [xb, -h - 0.01], [xb, -h - 1]]), -h - 1, h + 1));
  // la punta de atrás en rampa por debajo (pasa por encima del diente al armar)
  m = m.subtract(enXZ(poli([[xe - 1, -h - 1], [xe + 2.5, -h - 1], [xe + 2.5, -h - 0.01], [xe - 1, -h + 3.5]]), -h - 1, h + 1));
  return m.translate([dx, 0, 0]); }

// ---------- 4) el FIADOR (se imprime tal cual: la tripa en la cama): diente bajo la varilla, mejillas a los lados con su eje, OREJA delante por la
// izquierda (fuera del camino de la varilla): la cuña de la barra la levanta y el diente baja ----------
// gira en (x, z) = fiadorEje: el eje a la altura del enganche → la varilla no lo abre sola (enganche positivo) y el gatillo va suave
export const fiadorEje = Q => ({ x: Q.x_t0 + 2.5 + 3.6, z: -Q.rs / 2 + Q.prof / 2 - 0.45 });
const OREJA = 6.5, CUNA = 3.5, CARRERA = 3;                                               // largo de la oreja · lo que sube la cuña · recorrido del gatillo
const zOreja = Q => -Q.rs / 2 - 4.2;                                                       // la cara de abajo de la oreja (y de la tripa)
export function fiador(Q, ang = 0) {
  const h = Q.rs / 2, E = fiadorEje(Q), zt = -h + Q.prof - 0.3, zb = -h - 4.2;              // arriba del diente (0,3 por debajo del fondo de la muesca) · la tripa
  let m = caja3(Q.x_t0 - 1.5, E.x - 0.5, -2.6, 2.6, zb, -h - 0.5);                          // el cuerpo, bajo la varilla (solo detrás del eje)
  m = m.add(caja3(Q.x_t0, Q.x_t0 + 2.5, -2.6, 2.6, -h - 0.6, zt));                          // el DIENTE
  m = m.subtract(enXZ(poli([[Q.x_t0 + 1.3, zt + 0.01], [Q.x_t0 + 2.51, zt + 0.01], [Q.x_t0 + 2.51, zt - 1.2]]), -3, 3)); // su esquina de delante achaflanada
  [-1, 1].forEach(sg => { m = m.add(caja3(E.x - 3, E.x + 3, sg > 0 ? h + 0.5 : -h - 2.3, sg > 0 ? h + 2.3 : -h - 0.5, zb, E.z + 2.6)).add(caja3(E.x - 3, E.x - 0.4, sg > 0 ? 2.5 : -h - 2.3, sg > 0 ? h + 2.3 : -2.5, zb, -h - 0.5)); });
  m = m.subtract(gotaY(4.4, -h - 3, h + 3, E.x, E.z, 1));                                       // el agujero del eje (en gota: se imprime con la tripa abajo)
  m = m.add(caja3(E.x + 2.99, E.x + OREJA, h + 0.5, 7.6, zb, zb + 2));                       // la OREJA (encima de la cuña de la barra)
  m = m.add(cilZ(2.4, zb + 1.99, zb + 3.5, E.x + (3 + OREJA) / 2, 5.9));                      // el tetón de su muelle de boli (encima de la oreja: la empuja hacia abajo)
  return ang ? m.translate([-E.x, 0, -E.z]).rotate([0, ang, 0]).translate([E.x, 0, E.z]) : m; }
// el giro al DISPARAR: la cuña (con el gatillo atrás) levanta la oreja; cada punto de su cara de abajo queda por encima de la cuña
export function alturaCuna(Q, x, dx) { const E = fiadorEje(Q), x0 = E.x + OREJA + 0.3 + dx; return zOreja(Q) - 0.05 + Math.max(0, Math.min(CUNA, x - x0)); }
export function giroDisparo(Q, dx = -CARRERA) { const E = fiadorEje(Q), zb = zOreja(Q);
  for (let a = 0; a <= 45; a += 0.1) { const r = a * R2; let ok = true;
    for (let x = E.x + 3; x <= E.x + OREJA + 1e-9; x += 0.25) { const zx = E.z + (x - E.x) * Math.sin(r) + (zb - E.z) * Math.cos(r), xx = E.x + (x - E.x) * Math.cos(r) - (zb - E.z) * Math.sin(r);
      if (zx < alturaCuna(Q, xx, dx) + 0.03) { ok = false; break; } }
    if (ok) return a; }
  return 45; }
// dónde queda lo más alto del DIENTE con el fiador girado «a» grados (para comprobar que suelta la varilla)
export function topeDiente(Q, a) { const E = fiadorEje(Q), h = Q.rs / 2, zt = -h + Q.prof - 0.3, r = -a * R2;
  return Math.max(...[[Q.x_t0, zt], [Q.x_t0 + 1.3, zt], [Q.x_t0 + 2.5, zt - 1.2]].map(([x, z]) => E.z - (x - E.x) * Math.sin(r) + (z - E.z) * Math.cos(r))); }
// ---------- 5) el GATILLO (pala, centrada) y su BARRA (por la izquierda, al lado del cargador) ----------
export function gatillo(Q, dx = 0) {
  const x = Q.x_tr, z0 = Q.zBar1 - 0.5, z1 = Q.zTb;
  const P = [[x - 3, z0], [x + 4, z0], [x + 5.5, z0 - 7], [x + 4.6, z1 + 5], [x + 2, z1], [x - 1.8, z1 + 0.6], [x - 0.8, z1 + 8], [x - 1.6, z0 - 7], [x - 3, z0 - 3]];
  let m = enXZ(poli(P), -3.4, 3.4).add(cilY(3.4, 3.39, 6.2, x + 0.5, (Q.zBar0 + Q.zBar1) / 2)); // la pala y su tetón (entra en la barra)
  return m.translate([dx, 0, 0]); }
export function barra(Q, dx = 0) {
  const E = fiadorEje(Q), zb = zOreja(Q), xe = E.x + OREJA, xr0 = E.x + 1, xr1 = xe + 0.3 + CUNA + 1;
  let m = caja3(xr0, Q.x_tr + 3, 5.6, 8.4, Q.zBar0, Q.zBar1).subtract(cilY(3.7, 5, 9, Q.x_tr + 0.5, (Q.zBar0 + Q.zBar1) / 2));
  { const S0 = seguroEje(Q); m = m.add(caja3(S0.x + 2.3, S0.x + 4.3, 5.6, 8.4, S0.z + 0.6, Q.zBar0 + 0.01)); }                   // el TOPE del seguro (pasa por encima de su parte plana)
  // la SUBIDA de atrás con su CUÑA a 45° (sube hacia delante): al tirar del gatillo hacia atrás, la cuña se mete bajo la oreja y la levanta
  m = m.add(enXZ(poli([[xr0, Q.zBar1 - 0.01], [xr0, zb - 0.05], [xe + 0.3, zb - 0.05], [xe + 0.3 + CUNA, zb - 0.05 + CUNA], [xr1, zb - 0.05 + CUNA], [xr1, Q.zBar1 - 0.01]]), 5.6, 8.4));
  return m.translate([dx, 0, 0]); }
export const BARRA = { OREJA, CUNA, CARRERA };

// ---------- 6) el CARGADOR (tubo inclinado en la empuñadura, de lado), su TAPA corredera y su EMPUJADOR ----------
export function cargador(Q) {
  const e = 1.2, a = Q.Dch / 2 + e, zb = Q.zGb + 6;
  let m = cabezaCargador(Q, 0);
  // el canal (en gota hacia +y: se imprime tumbado) hasta debajo de los labios; entre los labios, su hueco de wL; delante, abierto (sale la bola)
  const L = (Q.zLt - zb) / Q.cs + 40, x0 = ejeCargador(Q, zb);
  m = m.subtract(poli(gotaP(Q.Dch / 2)).extrude(L).translate([0, 0, -10]).rotate([0, Q.th / R2, 0]).translate([x0, 0, zb]).intersect(caja3(-500, 500, -50, 50, zb - 20, Q.zLc)));
  m = m.subtract(caja3(-500, 500, -Q.wL / 2, Q.wL / 2, Q.zLc - 0.1, Q.zLt + 1));                                  // el hueco entre los LABIOS
  m = m.subtract(caja3(-500, 500, -Q.kq - 0.35, Q.kq + 0.35, -Q.rn - 0.35, Q.zLt + 1));                         // el paso de la QUILLA de la boquilla
  m = m.subtract(caja3(Q.xL + 1.5, 500, -50, 50, Q.zL - Q.r - 0.3, Q.zLt + 1));                                  // delante de los labios, abierto (la rampa está en la recámara)
  m = m.subtract(caja3(Q.xL + 0.5, 500, -Q.Dch / 2, Q.Dch / 2, Q.zL - Q.r - 0.3, Q.zLc));                        // por donde sale la bola, por debajo de los labios
  // la MUESCA del botón: en su COSTADO DERECHO, cerca de delante (como en las de verdad)
  { const B = botonGeo(Q); m = m.subtract(caja3(B.xf - 4.5, B.xf - 1.5, -a - 1, -a + 0.8, B.zc - 1.6, B.zc + 1.6)); }
  // abajo: el cuello donde entra la base (a presión)
  return m; }
// la BASE del cargador (entra a presión por abajo, con su labio delante para sacarlo con el dedo) y su EMPUJADOR (con 3 muelles de boli)
export function baseCargador(Q) { const zb = Q.zGb + 6, x0 = ejeCargador(Q, zb), a = Q.Dch / 2 + 1.2;
  let m = caja3(x0 - a / Q.cs - 2, x0 + a / Q.cs + 4, -a - 1.4, a + 1.4, Q.zGb + 0.5, zb);                               // la base (asoma por debajo de la empuñadura)
  m = m.add(cilZ(Q.Dch - 0.6, zb - 0.01, zb + 1.4, x0 + 0.2, 0)).subtract(cilZ(Q.Dch - 2.6, zb - 1, zb + 1.5, x0 + 0.2, 0));          // el tapón que entra en el canal (a presión) con su hueco
  return m; }
// el BOTÓN del cargador (barra que cruza el armazón detrás del guardamonte: su diente entra en la muesca; se aprieta desde la izquierda)
export const botonGeo = Q => { const zc = Q.zGo - 1.5, a = Q.Dch / 2 + 1.2; return { zc, a, xf: ejeCargador(Q, zc) + a / Q.cs }; };
export function botonCargador(Q, dy = 0) { const { zc, a, xf } = botonGeo(Q), yw = Q.Wf / 2;
  let m = caja3(xf + 1, xf + 4, -a - 1.2, yw + 1.6, zc - 1.8, zc + 1.8);                                              // la barra (delante del cargador; asoma 1,6 por la izquierda)
  m = m.add(caja3(xf - 4.3, xf + 1.1, -a - 1.2, -a - 0.2, zc - 1.4, zc + 1.4));                                          // el brazo (por el costado derecho del cargador)
  // el DIENTE: entra 0,7 en la muesca; su cara de abajo en rampa (al meter el cargador lo aparta solo y luego salta: «clic»)
  m = m.add(poli([[-a - 1.2, zc - 1.4], [-a - 0.2, zc - 1.4], [-a + 0.7, zc + 0.6], [-a + 0.7, zc + 1.4], [-a - 1.2, zc + 1.4]]).extrude(2.6).rotate([90, 0, 90]).translate([xf - 4.3, 0, 0]));
  m = m.add(cilY(2.2, -a - 2.4, -a - 1.19, xf + 2.5, zc));                                                               // el tetón de su muelle (un muelle de boli cortado a 6 mm, a la derecha)
  return m.translate([0, dy, 0]); }
export const BOTON = { carrera: 1.8 };
// el SEGURO (eje que cruza la mitad izquierda con su palanca fuera): con la palanca ATRÁS, la parte redonda del eje está detrás del tope de la barra
// y el gatillo no anda; con la palanca ABAJO (girada 90°), el tope pasa por encima de la parte plana
export function seguroEje(Q) { const zs = Q.zBar0 - 3.2, xs = gripR(Q, zs) + 9; return { x: xs, z: zs }; }
export function seguro(Q, puesto = true) { const S0 = seguroEje(Q), yw = Q.Wf / 2;
  let m = cilY(4, -2, yw + 0.4, S0.x, S0.z).subtract(caja3(S0.x - 3, S0.x + 3, 4.6, 9.4, S0.z + 0.2, S0.z + 3));            // el eje con su parte PLANA (arriba = se puede disparar)
  m = m.add(enXZ(poli([[S0.x + 1.6, S0.z - 1.6], [S0.x + 1.6, S0.z + 1.6], [S0.x - 9, S0.z + 1.2], [S0.x - 9, S0.z - 1.2]]), yw + 0.4, yw + 2.2)); // la PALANCA (por fuera, hacia atrás)
  return puesto ? m.translate([-S0.x, 0, -S0.z]).rotate([0, -90, 0]).translate([S0.x, 0, S0.z]) : m; }   // PUESTO: girado 90° (palanca abajo; la parte redonda frena el tope)

// ---------- 7) la CORREDERA (boca abajo): U con su tapa, frente con el agujero del cañón y del muelle, raíles en V ----------
export function corredera(Q, dx = 0) {
  const x0 = Q.x_fr - 2, x1 = Q.x_sff, wi = Q.Wsi / 2, wo = Q.Wso / 2;
  const bz = 3.2, sec = poli([[-wo, Q.z_sb], [wo, Q.z_sb], [wo, Q.z_top - bz], [wo - bz, Q.z_top], [-wo + bz, Q.z_top], [-wo, Q.z_top - bz]]);  // biseles arriba (al imprimir boca abajo, a 45°)
  let m = sec.extrude(x1 - x0).rotate([90, 0, 90]).translate([x0, 0, 0]).subtract(caja3(x0 - 1, Q.x_sfi, -wi, wi, Q.z_sb - 1, Q.z_sc));
  { const bd = (Q.ES || {}).cuna ? 7 : 4; m = m.subtract(enXZ(poli([[x1 - bd, Q.z_top + 1], [x1 + 1, Q.z_top + 1], [x1 + 1, Q.z_top - bd]]), -wo - 1, wo + 1)); }   // el bisel de delante (en CUÑA en la Futura; no llega a la mira ni al cañón)
  [-1, 1].forEach(sg => { m = m.add(M().hull([caja3(x0, Q.x_sfi + 0.01, sg > 0 ? wi - 0.01 : -wi, sg > 0 ? wi : -wi + 0.01, Q.z_v - 1.4, Q.z_v + 1.4), caja3(x0, Q.x_sfi + 0.01, sg > 0 ? wi - 1.41 : -wi + 1.4, sg > 0 ? wi - 1.4 : -wi + 1.41, Q.z_v - 0.01, Q.z_v + 0.01)])); }); // los raíles en V (entran en las ranuras del armazón)
  m = m.subtract(gotaX(Q.ODb + 0.6, Q.x_sfi - 1, x1 + 1, 0, -1));                             // el agujero del cañón (gota hacia −z: arriba al imprimir boca abajo)
  m = m.subtract(gotaX(3.6, Q.x_sfi - 1, x1 + 1, Q.z_rg, -1));                                // el de la guía del muelle
  if (Q.T) m = m.subtract(cilZ(3.2, Q.z_sc - 1, Q.z_top + 1, Q.x_bump, 0));                                          // el agujerito para regular el hop-up
  m = m.subtract(cilZ(3.4, Q.z_sc - 1, Q.z_top + 1, tornilloCilindro(Q), 0)).subtract(A.cono(3.4, 6.6, 1.61, Q.z_top - 1.6).translate([tornilloCilindro(Q), 0, 0])); // el tornillo del cilindro (avellanado)
  { const TC = tornilloCorredera(Q); m = m.subtract(caja3(TC.x0 - 0.1, TC.x1 + 0.1, -4.1, 4.1, Q.z_sc - 1, Q.z_sc + TC.encaje)); }   // el ALOJAMIENTO del nervio del cilindro (boca abajo queda abierto hacia arriba)
  // las ESTRÍAS para tirar con los dedos (detrás, a los dos lados)
  [Q.x_sff - 9, x0 + 7].forEach(x => { m = m.subtract(enXZ(poli([[x - 2.6, Q.z_top + 0.01], [x + 2.6, Q.z_top + 0.01], [x, Q.z_top - 2.6]]), -wo - 1, wo + 1)); });   // las ranuras de las miras (en V: sin techo al imprimir)
  m = m.subtract(caja3(3, 29, -wo - 1, -wo + 1.2, 1, Q.z_top - bz - 1.5));                        // la VENTANA DE EXPULSIÓN (rebaje, a la derecha)
  // las ESTRÍAS para tirar con los dedos (detrás y delante, a los dos lados), de la forma del MODELO
  const ES = Q.ES || ESTILOS.clasica, zA = Q.z_sb + 3, zB = Q.z_top - bz - 0.8, zM = (zA + zB) / 2, hondo = ES.estrias === 'gruesas' ? 1.0 : 0.8;
  const ranuras = L => { if (!L.length) return; const cs = N.csUnion(L); [-1, 1].forEach(sg => { m = m.subtract(enXZ(cs, sg > 0 ? wo - hondo : -wo - 1, sg > 0 ? wo + 1 : -wo + hondo)); }); };
  if (ES.estrias === 'diagonal') { const d = (zB - zA) * Math.tan(25 * R2);              // inclinadas 25° (hacia delante al subir)
    ranuras([0, 1, 2, 3, 4, 5, 6, 7].map(i => x0 + 5 + i * 3).concat([0, 1, 2, 3, 4].map(i => Q.x_sfi - 26 + i * 3)).map(x => poli([[x, zA], [x + 1.3, zA], [x + 1.3 + d, zB], [x + d, zB]]))); }
  else if (ES.estrias === 'gruesas') ranuras([0, 1, 2, 3, 4].map(i => x0 + 6 + i * 4.2).concat([0, 1, 2].map(i => Q.x_sfi - 20 + i * 4.2)).map(x => poli([[x, zA], [x + 2.2, zA], [x + 2.2, zB], [x, zB]])));
  else if (ES.estrias === 'chevron') { const d = (zB - zA) / 2 * Math.tan(30 * R2);      // en V, con la punta hacia delante
    ranuras([0, 1, 2, 3, 4, 5].map(i => x0 + 5 + i * 3.2).concat([0, 1, 2, 3].map(i => Q.x_sfi - 26 + i * 3.2)).map(x => poli([[x, zA], [x + 1.4, zA], [x + 1.4 + d, zM], [x + 1.4, zB], [x, zB], [x + d, zM]]))); }
  else ranuras([0, 1, 2, 3, 4, 5, 6].map(i => x0 + 6 + i * 3.2).concat([0, 1, 2, 3].map(i => Q.x_sfi - 22 + i * 3.2)).map(x => poli([[x, zA], [x + 1.4, zA], [x + 1.4, zB], [x, zB]])));
  // la VENTANA (Competición): un ojal en el techo, entre la recámara y la mira, que deja ver el CAÑÓN (boca abajo en la cama: sin techo que imprimir)
  if (ES.ventana) { const xa = Q.x_blk1 + 6, xb = Q.x_sff - 14; if (xb - xa > 9) m = m.subtract(M().hull([cilZ(7, Q.z_sc - 1, Q.z_top + 1, xa + 3.5, 0), cilZ(7, Q.z_sc - 1, Q.z_top + 1, xb - 3.5, 0)])); }
  // la NARIZ: el canto de abajo de delante a 45° (boca abajo en la cama queda arriba: sin soportes); no llega a la guía del muelle
  if (ES.nariz) m = m.subtract(enXZ(poli([[x1 - 7, Q.z_sb - 1], [x1 + 1, Q.z_sb - 1], [x1 + 1, Q.z_sb + 7]]), -wo - 1, wo + 1));
  // la TRASERA: el canto de arriba de detrás a 45° (como el bisel de delante; no llega al alza)
  if (ES.trasera) m = m.subtract(enXZ(poli([[x0 - 1, Q.z_top - 5], [x0 - 1, Q.z_top + 1], [x0 + 5, Q.z_top + 1]]), -wo - 1, wo + 1));
  // el LOMO estriado (entre las miras: no deslumbra): ranuras en V finas a lo ancho de la parte plana (paredes a 61°: sin soportes boca abajo)
  if (ES.lomo) { const L = []; for (let x = x0 + 13; x < x1 - 15; x += 1.8) L.push(poli([[x - 0.5, Q.z_top + 0.01], [x + 0.5, Q.z_top + 0.01], [x, Q.z_top - 0.9]]));
    m = m.subtract(enXZ(N.csUnion(L), -(wo - bz - 0.6), wo - bz - 0.6)); }
  // la LÍNEA a lo largo de los costados (en V, entre las estrías de detrás y las de delante; por debajo de la ventana de expulsión)
  if (ES.linea) { const zc = Q.zD + 7; m = m.subtract(aLoLargo(poli([[wo + 0.01, zc - 1.2], [wo + 0.01, zc + 1.2], [wo - 0.8, zc]]).add(poli([[-wo - 0.01, zc + 1.2], [-wo - 0.01, zc - 1.2], [-wo + 0.8, zc]])), x0 + 33, Q.x_sfi - 29)); }
  return m.translate([dx, 0, 0]); }

// las MIRAS (se imprimen aparte y se pegan en sus ranuras en V, como las de verdad): la de delante con su punto y el alza con su muesca
export function mira(Q, dx = 0) { const x = Q.x_sff - 9, z = Q.z_top;
  return enXZ(poli([[x - 2.45, z], [x, z - 2.45], [x + 2.45, z], [x + 2.45, z + 3.6], [x + 1.2, z + 4.6], [x - 2.45, z + 4.6]]), -1.6, 1.6).subtract(cilX(1.6, x - 3, x - 1.4, z + 3.2)).translate([dx, 0, 0]); }
export function alza(Q, dx = 0) { const x = Q.x_fr - 2 + 7, z = Q.z_top;
  return enXZ(poli([[x - 2.45, z], [x, z - 2.45], [x + 2.45, z], [x + 3.4, z + 5], [x - 2.45, z + 5]]), -9, 9).subtract(caja3(x - 4, x + 5, -1.8, 1.8, z + 2.6, z + 6)).subtract(cilX(1.6, x - 3, x - 1.4, z + 3.4, 4.4)).subtract(cilX(1.6, x - 3, x - 1.4, z + 3.4, -4.4)).translate([dx, 0, 0]); }

// ---------- 8) el ARMAZÓN en dos mitades (cada una se imprime TUMBADA: su cara de fuera en la cama, los huecos hacia arriba) ----------
// la empuñadura: delante y detrás del cargador (inclinada como él)
const gripF = (Q, z) => ejeCargador(Q, z) + Q.Dch / 2 + 7.5, gripR = (Q, z) => ejeCargador(Q, z) - Q.Dch / 2 - 30;
// dónde empieza la primera ranura del raíl (de delante hacia atrás)
const inicioRail = Q => { const t = (Q.ES || ESTILOS.clasica).tapa, xDc = Q.x_sff - 3; return t === 'largo' ? Q.x_sff - 7.8 : t === 'angular' ? xDc - 10 : xDc - 6; };
// (21-10, tarde: cada MODELO dibuja aquí su perfil; lo de dentro —la mecánica— no cambia. Todo lo que sale del perfil se imprime sin soportes:
// la mitad va tumbada y el perfil es lo que queda en la cama)
export function perfilArmazon(Q) {
  const ES = Q.ES || ESTILOS.clasica, zRt = Q.rs / 2 + 6, zTt = Q.blkZ + 1.5, P = [];
  const xDc = Q.x_sff - 3, zDc = Q.z_sb - 9, zBt = Q.z_sb - 10, xg = Q.xG1, zo = Q.zGo, gf = gripF(Q, Q.zGo) + 2, zb = Q.zGb;
  P.push([Q.x_fr, zRt], [Q.x_bh, zRt], [Q.x_bh, Q.zD], [-1.6, Q.zD], [-1.6, zTt], [Q.x_ff, zTt], [Q.x_ff, Q.z_sb - 0.6]);
  // el TAPAPOLVO (bajo la corredera) y su RAÍL de accesorios
  const xr = inicioRail(Q);
  if (ES.tapa === 'largo') { const xl = Q.x_sff - 0.8; P.push([xl, Q.z_sb - 0.6], [xl, zDc + 3.5], [xl - 3.5, zDc]); }            // hasta la punta
  else if (ES.tapa === 'angular') P.push([xDc + 1.5, Q.z_sb - 0.6], [xDc - 5, zDc]);                                                  // en cuña
  else P.push([xDc, Q.z_sb - 0.6], [xDc, zDc + 2.5], [xDc - 2.5, zDc]);
  for (let x = xr; x - 4.5 > Q.xG1 + 4; x -= 10) P.push([x, zDc], [x, zDc + 2.4], [x - 4.5, zDc + 2.4], [x - 4.5, zDc]);
  // el GUARDAMONTE (el hueco de dentro es el mismo en todos)
  if (ES.guarda === 'gancho') P.push([xg + 1, zDc], [xg + 1, zo + 10], [xg + 5, zo + 6.5], [xg + 5, zo + 3], [xg + 2, zo], [gf, zo]);          // con el GANCHO para el dedo
  else if (ES.guarda === 'redonda') { for (let k = 0; k <= 6; k++) P.push([xg + 1 + 2.5 * Math.sin(Math.PI * k / 6), zDc + (zo + 5 - zDc) * k / 6]);   // de frente curvo
    for (let k = 1; k <= 8; k++) { const a = -k / 8 * Math.PI / 2; P.push([xg - 5 + 6 * Math.cos(a), zo + 5 + 6 * Math.sin(a)]); } P.push([gf, zo - 1]); }
  else if (ES.guarda === 'angular') P.push([xg + 1, zDc], [xg + 5.5, zo + 2.5], [xg + 1.5, zo - 0.5], [gf, zo - 0.5]);                            // en PUNTA hacia delante
  else P.push([xg + 1, zDc], [xg + 1, zo + 2.5], [xg - 1.5, zo], [gf, zo]);                                                                      // de frente recto
  // el FRENTE de la empuñadura: apoyos de los dedos, ángulos o liso (las estrías se cortan después, en extrasPerfil)
  if (ES.dedos === 'apoyos' || ES.dedos === 'angulos') { const ang = ES.dedos === 'angulos', pr = ang ? 2.4 : 1.6, w = ang ? 5 : 7;
    const zf = (ang ? [zo - 14, zo - 30] : [zo - 12, zo - 28, zo - 44]).filter(z => z > zb + 12);
    zf.forEach(z => P.push([gripF(Q, z + w), z + w], [gripF(Q, z) - pr, z], [gripF(Q, z - w), z - w])); }
  else P.push([gripF(Q, zo - 4), zo - 4]);
  // la BASE
  let zbb = zb + 4;
  if (ES.base === 'embudo') { P.push([gripF(Q, zb + 16), zb + 16], [gripF(Q, zb + 7) + 3, zb + 7], [gripF(Q, zb) + 3.5, zb], [gripR(Q, zb) - 4, zb], [gripR(Q, zb + 7) - 3.5, zb + 7], [gripR(Q, zb + 16), zb + 16]); zbb = zb + 16; }  // EMBUDO del cargador
  else if (ES.base === 'talon') { P.push([gripF(Q, zb + 4), zb + 4], [gripF(Q, zb + 4) + 1.5, zb], [gripR(Q, zb) - 7, zb], [gripR(Q, zb + 9), zb + 9]); zbb = zb + 9; }   // con TALÓN atrás
  else P.push([gripF(Q, zb + 4), zb + 4], [gripF(Q, zb + 4) + 1.5, zb], [gripR(Q, zb) - 1.5, zb], [gripR(Q, zb + 4), zb + 4]);                                         // un poco abierta
  // la ESPALDA: recta o con la CURVA DE LA PALMA
  if (ES.espalda === 'joroba') for (let k = 1; k < 10; k++) { const z = zbb + (zBt - zbb) * k / 10; P.push([gripR(Q, z) - 3 * Math.sin(Math.PI * k / 10), z]); }
  // la COLA DE CASTOR (va por debajo de la corredera: no la toca ni tirando de ella)
  if (ES.castor === 'largo') P.push([gripR(Q, zBt), zBt], [gripR(Q, zBt) - 6, Q.z_sb - 9.5], [Q.x_fr + 6, Q.z_sb - 8], [Q.x_fr - 7, Q.z_sb - 7], [Q.x_fr - 10.5, Q.z_sb - 4.5], [Q.x_fr - 10.5, Q.z_sb - 2.5], [Q.x_fr - 8.5, Q.z_sb - 0.6], [Q.x_fr, Q.z_sb - 0.6]);   // con «joroba» de la mano y la punta redonda
  else if (ES.castor === 'corto') P.push([gripR(Q, zBt), zBt], [gripR(Q, zBt) - 3, Q.z_sb - 5.5], [Q.x_fr - 1, Q.z_sb - 6.4], [Q.x_fr - 3.5, Q.z_sb - 0.6], [Q.x_fr, Q.z_sb - 0.6]);   // (la cabeza del tornillo 1 cabe)
  else if (ES.castor === 'angular') P.push([gripR(Q, zBt), zBt], [gripR(Q, zBt) - 7, Q.z_sb - 9], [Q.x_fr + 8, Q.z_sb - 7], [Q.x_fr - 15, Q.z_sb - 3], [Q.x_fr - 9, Q.z_sb - 0.6], [Q.x_fr, Q.z_sb - 0.6]);
  else P.push([gripR(Q, zBt), zBt], [gripR(Q, zBt) - 4, Q.z_sb - 6], [Q.x_fr - 2, Q.z_sb - 6], [Q.x_fr - 7, Q.z_sb - 4], [Q.x_fr - 8, Q.z_sb - 0.6], [Q.x_fr, Q.z_sb - 0.6]);
  return P; }
// lo del perfil que es más fino que el redondeo (se pone DESPUÉS de redondear): las ESTRÍAS del frente de la empuñadura y la ANILLA de la correa
function extrasPerfil(Q, cs) { const ES = Q.ES || ESTILOS.clasica;
  if (ES.dedos === 'estrias') { const T = [], zBot = Q.zGb + (ES.base === 'embudo' ? 18 : 10);   // (empiezan por debajo del botón del cargador)
    for (let z = Q.zGo - 7; z > zBot; z -= 2.2) { const x = gripF(Q, z); T.push(poli([[x + 0.6, z + 0.9], [x - 0.9, z], [x + 0.6, z - 0.9]])); }
    cs = cs.subtract(N.csUnion(T)); }
  if (ES.base === 'anilla') { const x = gripR(Q, Q.zGb) + 6, z = Q.zGb - 2.2; cs = cs.add(circ(8.4).translate([x, z])).subtract(circ(3.8).translate([x, z])); }
  return cs; }
// el hueco del CARGADOR (su forma + 0,2)
function pozoCargador(Q, holg = 0.2) { const zt = Q.zLt + holg, zb = Q.zGb + 6, a = Q.Dch / 2 + 1.2 + holg, L = (zt - zb) / Q.cs + 2 * a, x0 = ejeCargador(Q, zb);
  return caja3(-a, a, -a, a, -a, L).rotate([0, Q.th / R2, 0]).translate([x0, 0, zb]).intersect(caja3(-500, 500, -50, 50, zb - 0.01, zt)); }
// la TAPA del cargador entra por delante en una cola de milano (abajo de la empuñadura): su sección en (y, z)
function colaTapa(Q, h) { const y1 = Q.Wf / 2 - 3.2 + h, z0 = Q.zGb - 1, z1 = Q.zGb + 1 + h, z2 = Q.zGb + 3 + h, z3 = Q.zGb + 4 + h;
  return poli([[-y1, z0], [y1, z0], [y1, z1], [y1 + 2, z2], [y1 + 2, z3], [-y1 - 2, z3], [-y1 - 2, z2], [-y1, z1]]); }
// (y, z) extruido a lo largo de x, de x0 a x1
const aLoLargo = (cs2, x0, x1) => cs2.extrude(x1 - x0).rotate([90, 0, 90]).translate([x0, 0, 0]);
export const TORNILLOS = Q => tornillos(Q);   // (para las pruebas)
export const perfilEnvolvente = Q => { const yw = Q.Wf / 2; return enXZ(extrasPerfil(Q, poli(perfilArmazon(Q)).offset(-2.5, 'Round').offset(2.5, 'Round')), -yw, yw); };
// (21-10, tarde, al dibujar los tornillos —la prueba no los veía—: el 7 caía ENCIMA de una ranura del raíl (la cabeza asomaba) → va en el diente
// macizo de detrás de la primera ranura; el 6 rozaba el borde del guardamonte → 0,7 mm más arriba; el 1 caía en la RANURA por donde corre la
// corredera y atravesaba el hueco del MUELLE DEL GATILLO → baja a la cola de castor, por debajo de los dos. Por si alguno cayera en la ranura de la
// corredera, su cabeza iría hundida por debajo (hondoTornillo). Comprobado en test/unit/lanzabolas.mjs: pared, cabeza dentro y destapada, nada que se mueva)
const tornillos = Q => [[Q.x_fr + 3.5, Q.z_sb - 2.0], [Q.x_fr + 3.5, -9], [gripR(Q, -70) + 7, -70], [gripR(Q, Q.zGb + 14) + 8, Q.zGb + 14], [Q.x_tr + 9, Q.z_sb - 3], [Q.xG1 - 3, Q.zGo + 4.2], [inicioRail(Q) - 7.25, Q.z_sb - 4.3]];
export const hondoTornillo = (Q, z) => Math.abs(z - Q.z_v) < 3.3 + 1.6 + 0.4 ? 1.8 : 0;   // la cabeza que caería en la ranura de la corredera, hundida
export function armazon(Q) {
  const yw = Q.Wf / 2, h = Q.rs / 2, E = fiadorEje(Q), xr0 = E.x + 1, xr1 = E.x + OREJA + 0.3 + CUNA + 1, zb = zOreja(Q);
  let m = enXZ(extrasPerfil(Q, poli(perfilArmazon(Q)).offset(-2.5, 'Round').offset(2.5, 'Round')), -yw, yw);
  // el hueco del guardamonte
  m = m.subtract(enXZ(poli([[gripF(Q, Q.zGi) + 2.5, Q.z_sb - 6], [Q.xG1 - 4, Q.z_sb - 6], [Q.xG1 - 4, Q.zGi + 5], [Q.xG1 - 9, Q.zGi], [gripF(Q, Q.zGi) + 0.5, Q.zGi]]), -yw - 1, yw + 1));   // (21-10 tarde: la esquina de delante más rellena: ahí va el tornillo 6)
  // los RAÍLES: ranuras en V a los dos lados (la corredera corre por ellas)
  [-1, 1].forEach(sg => { m = m.subtract(M().hull([caja3(Q.x_fr - 1, Q.x_ff + 1, sg > 0 ? yw - 0.01 : -yw - 1, sg > 0 ? yw + 1 : -yw + 0.01, Q.z_v - 1.6, Q.z_v + 1.6), caja3(Q.x_fr - 1, Q.x_ff + 1, sg > 0 ? yw - 1.61 : -yw + 1.6, sg > 0 ? yw - 1.6 : -yw + 1.61, Q.z_v - 0.01, Q.z_v + 0.01)])); });
  // la RECÁMARA: su hueco (con dos labios detrás, arriba y abajo) y el paso de la boquilla; el cañón en su cuna
  m = m.subtract(caja3(0, Q.x_blk1 + 1, -Q.blkY - 0.15, Q.blkY + 0.15, -Q.blkZ - 0.15, Q.blkZ + 0.15)).subtract(caja3(-2, 0.01, -6, 6, -6, 6));
  m = m.subtract(cilX(Q.ODb + 0.3, Q.x_blk1 - 0.5, Q.x_ff + 1));
  if (Q.T) m = m.subtract(cilZ(4, Q.blkZ - 0.5, Q.blkZ + 4, Q.x_bump, 0));                                             // por donde se regula el hop-up
  // el CARGADOR: su pozo, el suelo con su agujero y la cola de milano de la tapa (entra por delante)
  const zg = Q.zGb + 6, x0 = ejeCargador(Q, zg);
  { const zb = Q.zGb + 6, x0 = ejeCargador(Q, zb), a = Q.Dch / 2 + 1.2; m = m.subtract(pozoCargador(Q)).subtract(caja3(x0 - a / Q.cs - 2.2, x0 + a / Q.cs + 4.2, -a - 1.6, a + 1.6, Q.zGb - 12, zb + 0.01)); }            // el pozo, abierto abajo (el cargador se saca)
  { const { zc, a, xf } = botonGeo(Q); m = m.subtract(caja3(xf + 0.7, xf + 4.3, -a - 1.5, yw + 1, zc - 2.1, zc + 2.1)).subtract(caja3(xf - 4.6, xf + 1.3, -a - 3.4, -a + 0.1, zc - 1.7, zc + 1.7)).subtract(cilY(5.2, -yw + 0.8, -a - 1.4, xf + 2.5, zc)); }  // el BOTÓN, su brazo (con sitio para apartarse) y su muelle  // el BOTÓN del cargador (de lado a lado) y su muelle a la derecha
  { const S0 = seguroEje(Q); m = m.subtract(cilY(4.3, -2.2, yw + 1, S0.x, S0.z)).subtract(caja3(S0.x - 3.4, S0.x + 9, 0, 8.65, S0.z - 0.2, Q.zBar0 + 0.1)); }  // el SEGURO: su agujero y el sitio del tope de la barra
  // el MUELLE DE LA CORREDERA: su tubo (bajo el cañón), su pared de apoyo y el hueco de la cabeza del tornillo-guía
  m = m.subtract(cilX(Q.mR.d + 0.6, Q.x_rs, Q.x_ff + 1, Q.z_rg)).subtract(cilX(3.4, Q.x_rs - 1.6, Q.x_rs + 0.1, Q.z_rg)).subtract(cilX(6.2, Q.x_rs - 4.8, Q.x_rs - 1.5, Q.z_rg));
  // el TABIQUE (apoyo del muelle grande) con el paso cuadrado de la varilla y su centrador; detrás, el canal de la varilla
  m = m.subtract(caja3(Q.x_bh - Q.eBh - 0.1, Q.x_bh + 0.1, -h - 0.2, h + 0.2, -h - 0.2, h + 0.2)).subtract(caja3(Q.x_fr + 1.5, Q.x_bh - Q.eBh, -h - 0.25, h + 0.25, -h - 0.25, h + 0.25));
  m = m.add(cilX(Q.muelle.D - 2 * Q.muelle.hilo - 0.6, Q.x_bh - 0.01, Q.x_bh + 3).subtract(caja3(Q.x_bh - 1, Q.x_bh + 4, -h - 0.2, h + 0.2, -h - 0.2, h + 0.2)));
  // el FIADOR: su hueco (con lo que barre al girar), su muelle de boli · la oreja (izquierda) sobre la cuña
  m = m.subtract(caja3(Q.x_t0 - 2.2, E.x + 5.6, -h - 2.7, h + 2.7, -h - 8, E.z + 4.4)).subtract(caja3(E.x + 2.4, E.x + OREJA + 1.8, 0, 8.65, zb - 0.6, -h + 4)).subtract(caja3(E.x + 1.8, E.x + OREJA + 1.4, 0, 8.65, zb - 0.6, Q.rs / 2 + 1.5));
  m = m.subtract(cilZ(5.6, zb + 1.9, Q.rs / 2 + 4.8, E.x + (3 + OREJA) / 2, 5.9));                        // el muelle de boli del fiador (de la oreja hasta el techo de la torre)
  // el GATILLO: la ranura de la pala (abierta al guardamonte) · la BARRA (solo en la mitad izquierda) con su subida y su muelle de boli
  m = m.subtract(caja3(Q.x_tr - 3.6 - CARRERA - 0.5, Q.x_tr + 6.2, -3.6, 3.6, Q.zGi - 1, Q.zBar1 + 0.5));
  m = m.subtract(caja3(xr0 - CARRERA - 0.5, Q.x_tr + 3.6, 0, 8.65, Q.zBar0 - 0.3, Q.zBar1 + 0.3)).subtract(caja3(xr0 - CARRERA - 0.5, xr1 + 0.5, 0, 8.65, Q.zBar0 - 0.3, zb + CUNA + 0.6));
  m = m.subtract(caja3(xr0 - 14, xr0 + 0.01, 0, 8.65, (Q.zBar0 + Q.zBar1) / 2 - 2.6, (Q.zBar0 + Q.zBar1) / 2 + 2.6));        // el muelle de boli del gatillo
  // los TORNILLOS que juntan las mitades (M3: pasan por la izquierda, se roscan en la derecha)
  tornillos(Q).forEach(([x, z]) => { const hh = hondoTornillo(Q, z); m = m.subtract(cilY(3.4, 0, yw + 1, x, z)).subtract(conoY(3.4, 6.6, yw - 1.6 - hh, yw + 0.01 - hh, x, z)).subtract(cilY(2.6, -yw + 1.2, 0.01, x, z));
    if (hh) m = m.subtract(cilY(6.8, yw - hh - 0.01, yw + 1, x, z)); });
  // las dos mitades; los tetones del eje del fiador; en la derecha, la COSTILLA que guía la barra por dentro
  const izq = m.intersect(caja3(-500, 500, 0, 50, -500, 500)).add(cilY(4, h + 0.6, h + 2.8, E.x, E.z));
  let der = m.intersect(caja3(-500, 500, -50, 0, -500, 500)).add(cilY(4, -h - 2.8, -h - 0.6, E.x, E.z));
  const xg0 = xr1 + 1, xg1 = ejeCargador(Q, Q.zBar1) - Q.Dch / 2 - 1.2 / Q.cs - 1.8;
  if (xg1 > xg0 + 5) der = der.add(caja3(xg0, xg1, -0.01, 5.3, Q.zBar0 + 0.4, Q.zBar1 - 0.4));
  return { izq, der }; }
// las CACHAS (pegadas a la empuñadura, con su textura de rombos por fuera)
export function cacha(Q, sg = 1) {
  const z0 = Q.zGb + 6, z1 = Q.zGo - 4.5, P = [[gripF(Q, z1) - 3.5, z1], [gripF(Q, z0) - 3.5, z0], [gripR(Q, z0) + 4, z0], [gripR(Q, z1) + 4, z1]];
  let m = enXZ(poli(P), 0, 2.2);
  // la TEXTURA de cada modelo (relieve de 0,6 mm hacia arriba al imprimir): rombos, punteado de competición, líneas o panal
  const tx = (Q.ES || ESTILOS.clasica).textura, R = [];
  const malla = (dz, dx, desp, forma, m1 = 7, m2 = 6) => { for (let zz = z0 + 4, f = 0; zz < z1 - 3; zz += dz, f++) for (let xx = gripR(Q, zz) + m1 + (f % 2 ? desp : 0); xx < gripF(Q, zz) - m2; xx += dx) R.push(forma.translate([xx, zz])); };
  if (tx === 'puntos') malla(1.8, 1.9, 0.95, poli([[0, -0.75], [0.75, 0], [0, 0.75], [-0.75, 0]]));
  else if (tx === 'lineas') { for (let zz = z0 + 4; zz < z1 - 3; zz += 2.6) { const xa = gripR(Q, zz) + 6.5, xb = gripF(Q, zz) - 5.5; if (xb > xa + 4) R.push(poli([[xa, zz - 0.55], [xb, zz - 0.55], [xb, zz + 0.55], [xa, zz + 0.55]])); } }
  else if (tx === 'hex') malla(2.9, 3.4, 1.7, poli([0, 1, 2, 3, 4, 5].map(i => [1.45 * Math.cos((30 + 60 * i) * R2), 1.45 * Math.sin((30 + 60 * i) * R2)])));
  else malla(4.6, 3.8, 1.9, poli([[0, -2.2], [1.6, 0], [0, 2.2], [-1.6, 0]]));
  if (R.length) m = m.add(enXZ(N.csUnion(R), 2.19, 2.8));
  // (21-10 tarde: la cacha IZQUIERDA tapaba las cabezas de 2 tornillos y, pegada, ya no se podía desmontar → un agujero sobre cada cabeza)
  if (sg > 0) tornillos(Q).forEach(([x, z]) => { if (z > z0 + 3.6 && z < z1 - 3.6 && x > gripR(Q, z) + 4 + 3.6 - 1 && x < gripF(Q, z) - 3.5) m = m.subtract(cilY(7.2, -1, 4, x, z)); });
  m = m.translate([0, Q.Wf / 2, 0]);
  return sg > 0 ? m : m.mirror([0, 1, 0]); }
export function tapaCargador(Q) { const zb = Q.zGb + 6, x0 = ejeCargador(Q, zb);
  return aLoLargo(colaTapa(Q, 0), x0 - Q.Dch / 2 - 7.2, gripF(Q, Q.zGb) - 2).add(cilZ(Q.Dch - 1.6, Q.zGb + 3.9, zb + 0.5, x0, 0)); }
export function empujador(Q) { return cil(Q.Dch - 0.5, 7, 0).subtract(cil(Math.min(5.4, Q.Dch - 2.1), 4.5, -0.01)); }

// ---------- lo COMPRADO (para verlo montado, en gris): muelles, junta, tornillo-guía ----------
const muelleTubo = (D, hilo, x0, x1, z = 0) => cilX(D, x0, x1, z).subtract(cilX(D - 2 * hilo, x0 - 1, x1 + 1, z));
export function comprado(Q, est) {
  const L = [], c = est.c, pis = est.p, junta = Q.oring.d + 2 * Q.oring.e;
  L.push({ k: 'muelle', m: muelleTubo(Q.muelle.D, Q.muelle.hilo, Q.x_bh + 0.2, Q.x_prR + pis - 0.2) });
  L.push({ k: 'junta', m: cilX(Math.min(junta, Q.Dc), Q.x_pf - 6 + pis + 0.15, Q.x_pf - 6 + pis + 2.15).subtract(cilX(2 * Q.ranura + 0.1, Q.x_pf - 7 + pis, Q.x_pf - 3 + pis)) });
  L.push({ k: 'muelleCorredera', m: muelleTubo(Q.mR.d, Q.mR.hilo, Q.x_rs + 0.2, Q.x_sfi + c - 0.2, Q.z_rg) });
  if (Q.T) { const H = hopUp(Q); L.push({ k: 'prisionero', m: cilZ(2.4, H.zl + H.tp, H.zl + H.tp + 6, Q.x_bump, 0) }); }
  L.push({ k: 'guia', m: cilX(3, Q.x_rs - 1.7, Q.x_rs + 28, Q.z_rg).add(cilX(5.5, Q.x_rs - 4.4, Q.x_rs - 1.6, Q.z_rg)) });
  { const TC = tornilloCorredera(Q); L.push({ k: 'tornilloCil', m: cilZ(2.5, TC.punta, Q.z_top - 1.7, TC.x + c) }); }   // (su caña: el núcleo de la rosca)
  return L; }

// ---------- MONTADO: las piezas en su sitio en una POSTURA ----------
// reposo (desarmada, corredera delante) · atras (tirando: corredera atrás, pistón empujado) · armada (corredera delante, pistón enganchado) · disparo (gatillo apretado)
export function postura(Q, k) {
  if (k === 'atras') return { c: -Q.S, p: -Q.Spm, f: 0, t: 0 };
  if (k === 'armada') return { c: 0, p: -Q.Sp, f: 0, t: 0 };
  if (k === 'disparo') return { c: 0, p: -Q.Sp, f: -giroDisparo(Q), t: -CARRERA };
  return { c: 0, p: 0, f: 0, t: 0 }; }
export function enSitio(Q, k = 'reposo', conComprado = true) {
  const e = postura(Q, k), A2 = armazon(Q), L = [];
  L.push({ k: 'armazonI', m: A2.izq }, { k: 'armazonD', m: A2.der }, { k: 'canon', m: canon(Q) }, { k: 'punta', m: punta(Q) });
  if (Q.T) L.push({ k: 'goma', m: gomaHop(Q) });
  L.push({ k: 'corredera', m: corredera(Q, e.c) }, { k: 'mira', m: mira(Q, e.c) }, { k: 'alza', m: alza(Q, e.c) }, { k: 'cilindro', m: cilindro(Q, e.c) }, { k: 'piston', m: piston(Q, e.p) }, { k: 'varilla', m: varilla(Q, e.p) });
  L.push({ k: 'fiador', m: fiador(Q, e.f) }, { k: 'gatillo', m: gatillo(Q, e.t) }, { k: 'barra', m: barra(Q, e.t) });
  L.push({ k: 'cargador', m: cargador(Q) }, { k: 'base', m: baseCargador(Q) }, { k: 'boton', m: botonCargador(Q) }, { k: 'seguro', m: seguro(Q, k !== 'disparo') }, { k: 'cachaI', m: cacha(Q, 1) }, { k: 'cachaD', m: cacha(Q, -1) });
  if (conComprado) comprado(Q, e).forEach(x => L.push(Object.assign(x, { g: 'comp' })));
  return L; }

// ---------- las PIEZAS PARA IMPRIMIR, ya giradas como van en la cama ----------
// (cada una: nombre, cuántas, cómo va en la cama, el material y la pieza)
export function piezas(Q) {
  const A2 = armazon(Q), gY = m => m.rotate([90, 0, 0]), gYm = m => m.rotate([-90, 0, 0]), dePie = m => m.rotate([0, -90, 0]);
  const L = [
    ['Mitad izquierda del armazón', A2.izq.rotate([-90, 0, 0]), 'tumbada: la cara de fuera en la cama'],
    ['Mitad derecha del armazón', A2.der.rotate([90, 0, 0]), 'tumbada: la cara de fuera en la cama'],
    ['Corredera', corredera(Q).rotate([180, 0, 0]), 'boca abajo'],
    ['Cilindro con su boquilla', dePie(cilindro(Q)), 'de pie (la boca de atrás en la cama), con borde de adherencia'],
    ['Recámara con su cañón', dePie(canon(Q)), 'de pie (la cara de atrás en la cama)'],
    ['Pistón', dePie(piston(Q)), 'sobre su cara de atrás'],
    ['Varilla del pistón', gY(varilla(Q)), 'de lado'],
    ['Fiador', fiador(Q), 'tal cual (la tripa en la cama)'],
    ['Gatillo', gY(gatillo(Q)), 'de lado (el tetón hacia arriba)'],
    ['Barra del gatillo', gY(barra(Q)), 'de lado'],
    ['Cargador', gY(cargador(Q)), 'tumbado (la punta del canal hacia arriba)'],
    ['Base del cargador', baseCargador(Q), 'tal cual (plana en la cama)'],
    ['Botón del cargador', botonCargador(Q), 'tal cual (tumbado)'],
    ['Seguro', seguro(Q, false).rotate([-90, 0, 0]), 'la palanca en la cama'],
    ['Empujador del cargador', empujador(Q).rotate([180, 0, 0]), 'boca arriba (el hueco del muelle hacia arriba)'],
    ['Cacha izquierda', gY(cacha(Q, 1)), 'la textura hacia arriba'],
    ['Cacha derecha', gYm(cacha(Q, -1)), 'la textura hacia arriba'],
    ['Punta naranja', punta(Q).rotate([0, 90, 0]), 'de pie (la tapa en la cama) · NARANJA'],
    ...(Q.T ? [['Goma del hop-up', gomaHop(Q), 'tal cual · en TPU']] : []),
    ['Mira delantera', gY(mira(Q)), 'de lado'], ['Alza', alza(Q).rotate([0, -90, 0]), 'de pie (la cara de atrás en la cama)'] ];
  return L.map(([t, m, como]) => { let q = N.aLaCama(m); if (/^Cilindro|^Recámara/.test(t)) q = conOrejas(q); return { t, m: q, como }; }); }
// OREJAS de adherencia: 4 discos de 0,6 mm pegados al pie (la pieza es alta y apoya poco); se cortan con un cúter
function conOrejas(m) { const b = N.caja(m), cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, rx = b.dims[0] / 2, ry = b.dims[1] / 2;
  return m.add(N.union([[rx, 0], [-rx, 0], [0, ry], [0, -ry]].map(([dx, dy]) => cil(12, 0.6, 0).translate([cx + dx, cy + dy, 0])))); }

// ---------- 9) las CAMAS, la PRUEBA DE ENCAJE y el CATÁLOGO ----------
export const camasDe = P => colocaCamas(P.map(x => N.caja(x.m).dims));
function camaN(P, k) { const Cs = camasDe(P); if (!Cs[k]) N.mal('Va en ' + Cs.length + ' camas: elige «Cama 1»…«Cama ' + Cs.length + '».');
  return N.aLaCama(N.union(Cs[k].map(({ i, x, y, gira }) => { const m = gira ? P[i].m.rotate([0, 0, 90]) : P[i].m, b = N.caja(m); return m.translate([x - b.min[0], y - b.min[1], -b.min[2]]); }))); }
// 🧪 PRUEBA DE ENCAJE (pocos gramos): el pistón con TU junta en un aro del cilindro (corre y no pierde aire), la recámara con TUS bolas (entran por la
// ventana, la boquilla las empuja hasta el retén y salen soplando) y un trozo de cargador con su empujador
export function prueba(Q) {
  const aro = cilX(Q.ODc, 0, 16).subtract(cilX(Q.Dc, -1, 17)).subtract(conoX(Q.Dc + 1.6, Q.Dc, -0.01, 0.8)).rotate([0, -90, 0]);
  const rec = canon(Q).intersect(caja3(-1, Q.x_blk1 + 0.01, -20, 20, -20, 20)).rotate([0, -90, 0]);
  const trozo = cargador(Q).intersect(caja3(-500, 500, -50, 50, -Q.blkZ - 26, -Q.blkZ)).rotate([90, 0, 0]);
  return [aro, piston(Q).rotate([0, -90, 0]), rec, trozo, empujador(Q).rotate([180, 0, 0])].map(m => N.aLaCama(m)); }
export const pesoPrueba = Q => N.enAmbito(() => prueba(Q).reduce((a, m) => a + m.volume(), 0) * 1.24 / 1000 * 0.45 + 0); // g (PLA, ~45 % de relleno contando paredes)

// lo que se COMPRA (y lo que ya tienes): [qué, cuántos, buscar, para qué]
export function compra(Q) { const C = Q.muelle, j = Q.oring;
  return [
    ['Muelle de compresión de hilo ' + n2(C.hilo) + ' mm, Ø ' + C.D + ' mm por fuera y ' + C.L0 + ' mm de largo', 1, 'compression spring ' + C.hilo + 'mm wire OD ' + C.D + 'mm length ' + C.L0 + 'mm', 'el que empuja el aire'],
    ['Junta tórica de ' + j.d + ' × ' + j.e + ' mm (NBR)', 2, 'O-ring ' + j.d + 'x' + j.e + 'mm NBR', 'el cierre del pistón (una de repuesto)'],
    ['Grasa de silicona', 1, 'silicone grease', 'en la junta y dentro del cilindro'],
    ['Muelle de compresión de hilo 0,4 mm, Ø 5 mm y 40 mm de largo', 1, 'compression spring 0.4mm wire OD 5mm length 40mm', 'devuelve la corredera'],
    ['Tornillo M3 × 30', 1, 'M3 x 30 screw', 'la guía de ese muelle'],
    ['Tornillos M3 × 20 avellanados', 7, 'M3 x 20 countersunk screw', 'juntan las dos mitades'],
    ['Tornillo M3 × 5 avellanado (NO más largo)', 1, 'M3 x 5 countersunk screw', 'la corredera al cilindro (uno más largo entraría en el cilindro del aire)'],
    ...(Q.T ? [['Tornillo prisionero M3 × 6 y llave Allen de 1,5', 1, 'M3 x 6 set screw + 1.5mm hex key', 'el hop-up (se regula por el agujerito de la corredera)']] : []),
    ['Muelles de bolígrafo', 6, 'YA LOS TIENES', 'fiador (1), gatillo (1), botón del cargador (1, cortado a 6 mm) y cargador (3 seguidos)'],
    [Q.T ? 'Bolas de 6 mm de 0,20 g (biodegradables)' : 'Bolas blandas de 7–8 mm (las de las pistolas de juguete)', 1, Q.T ? '0.20g 6mm BB biodegradable' : 'soft bullet 7mm gel ball toy', 'la munición'],
    ['Cianoacrilato (pegamento rápido)', 1, 'super glue', 'la punta naranja, las cachas, las miras y la base del cargador'],
    ['Gafas de protección', 1, Q.T ? 'airsoft goggles' : 'safety glasses kids', 'SIEMPRE al jugar']]; }

export const NOMBRES = { armazonI: ['Mitad izquierda del armazón', 1], barra: ['Barra del gatillo', 2], gatillo: ['Gatillo', 2], fiador: ['Fiador', 3], canon: ['Recámara con su cañón', 4], cargador: ['Cargador', 5],
  piston: ['Pistón', 6], varilla: ['Varilla del pistón', 6], junta: ['Junta tórica', 6], cilindro: ['Cilindro', 7], muelle: ['Muelle grande', 7], guia: ['Tornillo-guía', 8], muelleCorredera: ['Muelle de la corredera', 8],
  armazonD: ['Mitad derecha del armazón', 9], seguro: ['Seguro', 9], boton: ['Botón del cargador', 9], goma: ['Goma del hop-up', 4], prisionero: ['Tornillo del hop-up', 4],
  mira: ['Mira delantera', 10], tornilloCil: ['Tornillo de la corredera', 10], alza: ['Alza', 10], base: ['Base del cargador', 13], corredera: ['Corredera', 10], punta: ['Punta naranja', 11], cachaI: ['Cacha izquierda', 12], cachaD: ['Cacha derecha', 12], tapa: ['Tapa del cargador', 13] };
// 🎬 la ANIMACIÓN exacta (ella, 21-10: «quiero que se vea todo el mecanismo y cómo sale el balín»). «Por dentro»: sin la mitad izquierda ni su
// cacha, y la corredera, el cilindro, el cañón, el cargador y el muelle cortados por la mitad; con las BOLAS: al tirar de la corredera sube una a la
// recámara, al volver la boquilla la lleva al retén, el gatillo suelta el pistón y la bola recorre el cañón y sale por la punta (a cámara lenta).
// Las posiciones son las MISMAS con las que se comprueba que nada se pisa (corredera, pistón, gatillo y fiador) y el camino de la bola.
export function montadasLanzabolas(p) { const Q = medidas(p), g = giroDisparo(Q) * R2, T0 = 5, dentro = p.anim !== 'fuera', dz = -(Q.zGb - 1);   // (todo sube dz: la animación no la recoloca sobre la cama)
  const E0 = fiadorEje(Q), E = { x: E0.x, z: E0.z + dz };
  const sv = t => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2, tr = (dx, dzz = 0, k = 1) => [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, dx, 0, dzz, 1];
  const c = t => { const u = t % T0; return u < 1 ? -Q.S * sv(u) : u < 2 ? -Q.S * (1 - sv(u - 1)) : 0; };
  const pis = t => { const u = t % T0; return u < 1 ? -Q.Spm * sv(u) : u < 2 ? -Q.Spm + (Q.Spm - Q.Sp) * sv(u - 1) : u < 3 ? -Q.Sp : u < 3.12 ? -Q.Sp * (1 - sv((u - 3) / 0.12)) : 0; };
  const gat = t => { const u = t % T0; return u < 2.6 ? 0 : u < 3 ? -BARRA.CARRERA * sv((u - 2.6) / 0.4) : u < 3.7 ? -BARRA.CARRERA * (1 - sv((u - 3) / 0.7)) : 0; };
  const fia = t => { const u = t % T0; const a = u < 2.9 ? 0 : u < 3 ? -g * sv((u - 2.9) / 0.1) : u < 3.7 ? -g * (1 - sv((u - 3) / 0.7)) : 0, co = Math.cos(a), si = Math.sin(a);
    return [co, 0, -si, 0, 0, 1, 0, 0, si, 0, co, 0, E.x - co * E.x - si * E.z, 0, E.z + si * E.x - co * E.z, 1]; };
  // las BOLAS: la de arriba espera bajo la boquilla, sube a los LABIOS cuando la boquilla pasa, la boquilla la empuja por el CAMINO (rampa) hasta el
  // retén y, al disparar, sale por el cañón; las de debajo suben una plaza por el canal del cargador
  const s1 = Q.B * Q.cs, z2 = -Q.rn - Q.r - 0.05, enCanal = z => [ejeCargador(Q, z), z], CAM = puntosCamino(Q);
  const subida = u => sv((u - 0.55) / 0.3);                                                          // sube cuando la boquilla ya ha pasado
  const porCamino = xmin => { if (xmin <= CAM[0][0]) return CAM[0]; for (let i = 1; i < CAM.length; i++) if (CAM[i][0] >= xmin) { const [a, b] = [CAM[i - 1], CAM[i]], t = (xmin - a[0]) / Math.max(1e-6, b[0] - a[0]); return [xmin, a[1] + (b[1] - a[1]) * t]; } return CAM[CAM.length - 1]; };
  const bola1 = t => { const u = t % T0;
    if (u < 1) { const z = z2 + (Q.zL - z2) * subida(u); return enCanal(z); }
    if (u < 3.04) return porCamino(Math.min(Q.x_s, Q.x_t + c(u) + Q.r));                               // la boquilla la empuja (por la rampa)
    if (u < 3.5) { const k = sv((u - 3.04) / 0.46); return [Q.x_s + (Q.x_m + 140 - Q.x_s) * k, Q.zs0 * (1 - k)]; }   // por el cañón y fuera
    return null; };
  const bolaN = n => t => { const u = t % T0, abajo = z2 - (n - 1) * s1, arriba = Q.zL - (n - 1) * s1;
    if (u < 1) { const z = abajo + (arriba - abajo) * subida(u); return enCanal(z); }
    if (u < 2) { const k = sv((u - 1.15) / 0.3), z = arriba + (z2 - (n - 2) * s1 - arriba) * k; return enCanal(z); } // la boquilla las baja una
    return enCanal(z2 - (n - 2) * s1); };
  const enBola = f => t => { const q = f(t); if (!q) return tr(Q.x_s, dz, 0.0001); return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, q[0], 0, q[1] + dz, 1]; };
  const corta = m => m.intersect(caja3(-500, 500, 0, 50, -500, 500));
  let L = enSitio(Q, 'reposo');
  if (dentro) L = L.filter(x => x.k !== 'armazonD' && x.k !== 'cachaD').map(x => ['corredera', 'cilindro', 'canon', 'cargador', 'muelle', 'punta', 'junta'].includes(x.k) ? Object.assign({}, x, { m: corta(x.m) }) : x);
  const S00 = seguroEje(Q), S0 = { x: S00.x, z: S00.z + dz }, seg = t => { const u = t % T0, a = (u < 2.1 ? 1 : u < 2.4 ? 1 - sv((u - 2.1) / 0.3) : u < 4.2 ? 0 : u < 4.5 ? sv((u - 4.2) / 0.3) : 1) * -90 * R2, co = Math.cos(a), si = Math.sin(a);
    return [co, 0, -si, 0, 0, 1, 0, 0, si, 0, co, 0, S0.x - co * S0.x - si * S0.z, 0, S0.z + si * S0.x - co * S0.z, 1]; };   // el SEGURO: se quita antes de disparar y se vuelve a poner
  L = L.map(x => x.k === 'seguro' ? Object.assign({}, x, { m: seguro(Q, false) }) : x).map(x => Object.assign({}, x, { m: x.m.translate([0, 0, dz]) }));
  const out = L.map(x => { const [nombre, paso] = NOMBRES[x.k] || [x.k, 14], o = { m: x.m, nombre, paso, color: colorDe(Q, x.k) };
    if (x.k === 'corredera' || x.k === 'cilindro' || x.k === 'muelleCorredera' || x.k === 'tornilloCil') o.mov = { f: t => tr(c(t)) };
    if (x.k === 'piston' || x.k === 'varilla' || x.k === 'junta') o.mov = { f: t => tr(pis(t)) };
    if (x.k === 'gatillo' || x.k === 'barra') o.mov = { f: t => tr(gat(t)) };
    if (x.k === 'fiador') o.mov = { f: fia };
    if (x.k === 'seguro') o.mov = { f: seg };
    if (x.k === 'corredera') o.que = dentro ? 'POR DENTRO: tira de la corredera (el pistón se queda enganchado y sube una bola), vuelve (la boquilla lleva la bola al retén), el gatillo suelta el pistón y la bola sale por el cañón' : 'se tira de la corredera, vuelve sola, se aprieta el gatillo y el pistón sale disparado';
    return o; });
  if (dentro) [bola1, bolaN(2), bolaN(3), bolaN(4)].forEach((f, i) => out.push({ m: N.MF().sphere(Q.B / 2, 32), nombre: 'Bola ' + (i + 1), paso: 15, color: colorDe(Q, 'bola'), mov: { f: enBola(f) } }));
  return out; }

// 🎨 los COLORES de la réplica (al verla montada y en la animación): negra (o el color que elijas), la PUNTA NARANJA, el mecanismo gris, lo de metal
// en acero, la goma del hop-up roja y las bolas amarillas (blandas) o blancas (6 mm)
// (21-10, tarde: cada MODELO trae sus tonos —arena, plata, gris…— y se pueden cambiar en «🎨 Colores»; si eliges un color en el catálogo, la
// corredera y el armazón salen de ese color)
export function colorDe(Q, k, base = null) { const C = Q.col || PALETA.negro; if (k === 'punta') return '#ff6a00'; if (/^bola/i.test(k)) return Q.T ? '#f4f4f4' : '#ffd23f';
  if (['muelle', 'muelleCorredera', 'guia', 'prisionero', 'tornilloCil'].includes(k)) return '#a7adb4'; if (k === 'junta') return '#1b1b1d'; if (k === 'goma') return '#c0392b';
  if (['cilindro', 'piston', 'varilla', 'fiador', 'barra', 'canon'].includes(k)) return '#7a8089'; if (k === 'cachaI' || k === 'cachaD' || k === 'base') return base ? '#3a3d44' : C.cachas;
  if (k === 'cargador') return base ? '#34373d' : C.cargador; if (base) return base;
  if (['corredera', 'mira', 'alza'].includes(k)) return C.corredera; if (['gatillo', 'seguro', 'boton'].includes(k)) return C.mando; return C.armazon; }
export function coloresVista(p, base, porDefecto = '#26272b') { const que = p.que || 'cama1'; if (!['montado', 'atras', 'dentro', 'despiece'].includes(que)) return null;
  const Q = medidas(p), b = base && base !== '#ff7a00' && String(base).toLowerCase() !== String(porDefecto).toLowerCase() ? base : null;
  let L = enSitio(Q, que === 'atras' ? 'atras' : que === 'dentro' ? 'armada' : 'reposo');
  if (que === 'dentro') L = L.filter(x => x.k !== 'armazonD' && x.k !== 'cachaD').map(x => ['corredera', 'cilindro', 'canon', 'cargador', 'muelle', 'punta', 'junta'].includes(x.k) ? Object.assign({}, x, { m: x.m.intersect(caja3(-500, 500, 0, 50, -500, 500)) }) : x);
  if (que === 'despiece') { const D = DESP; L = L.map(x => Object.assign({}, x, { m: x.m.translate(D[x.k] || [0, 0, 0]) })); }
  const grupos = new Map(); L.forEach(x => { const c = colorDe(Q, x.k, b); grupos.set(c, (grupos.get(c) || []).concat([x.m])); });
  const bb = N.caja(N.union(L.map(x => x.m))), t = [-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2, -bb.min[2]];   // como el catálogo (centrada y apoyada en la cama)
  return [...grupos].map(([color, ms]) => ({ color, m: N.union(ms).translate(t) })); }
// 📐 DESPIECE: cada grupo separado de su sitio
const DESP = { armazonI: [0, 40, 0], cachaI: [0, 55, 0], armazonD: [0, -40, 0], cachaD: [0, -55, 0], corredera: [0, 0, 45], cilindro: [0, 0, 25], piston: [-30, 0, 25], varilla: [-30, 0, 25], junta: [-30, 0, 25], muelle: [-30, 0, 25],
    canon: [20, 0, 10], punta: [40, 0, 10], cargador: [0, 0, -30], base: [0, 0, -45], boton: [0, -25, 0], seguro: [0, 25, -5], mira: [0, 0, 55], alza: [0, 0, 55], goma: [20, 0, 22], prisionero: [20, 0, 30],
  fiador: [0, 0, -12], barra: [0, 12, -12], gatillo: [0, 0, -18], guia: [20, 0, -8], muelleCorredera: [20, 0, -8], tornilloCil: [0, 0, 70] };
function despiece(Q) { return N.union(enSitio(Q, 'reposo').map(x => x.m.translate(DESP[x.k] || [0, 0, 0]))); }
// 🔍 POR DENTRO: sin la mitad derecha ni su cacha, y la corredera, el cilindro, el cañón y el cargador cortados por la mitad
function porDentro(Q, k = 'armada') { return N.union(enSitio(Q, k).filter(x => x.k !== 'armazonD' && x.k !== 'cachaD').map(x => ['corredera', 'cilindro', 'canon', 'cargador', 'muelle', 'punta', 'junta'].includes(x.k) ? x.m.intersect(caja3(-500, 500, 0, 50, -500, 500)) : x.m)); }

export function genLanzabolas(p) { const Q = medidas(p), que = p.que || 'cama1';
  if (que === 'prueba') return A.enFila(prueba(Q), 6);
  if (que === 'montado') return N.union(enSitio(Q, 'reposo').map(x => x.m));
  if (que === 'atras') return N.union(enSitio(Q, 'atras').map(x => x.m));
  if (que === 'dentro') return porDentro(Q, 'armada');
  if (que === 'despiece') return despiece(Q);
  if (/^cama\d+$/.test(que)) return camaN(piezas(Q), +que.slice(4) - 1);
  return camaN(piezas(Q), 0); }

export function notaLanzabolas(p) { let Q, C; try { Q = medidas(p); C = cuentas(Q); } catch (e) { return '⚠️ ' + e.message; }
  let nC = 0; try { nC = N.enAmbito(() => camasDe(piezas(Q)).length); } catch (e) { }
  const v = C.v.map(x => Math.round(x)), fps = C.fps.map(x => Math.round(x)), kg = Math.round(C.fuerzaTirar / 9.81 * 10) / 10;
  if (p.que === 'prueba') return '🧪 PRUEBA DE ENCAJE: el PISTÓN con TU junta tórica dentro del ARO del cilindro (con grasa: tiene que correr suave y, tapando un lado con el dedo, notar el aire), la RECÁMARA con TUS bolas (entran por la ventana de abajo; empújalas con un lápiz: se paran en el retén y salen soplando fuerte por detrás) y un trozo de CARGADOR con su empujador (las bolas bajan solas). Si algo no casa, dime cuánto y se ajusta.';
  if (p.que === 'dentro') return '🔍 POR DENTRO (armada): el pistón enganchado en el fiador, el muelle apretado, la bola esperando en el retén y la siguiente debajo de la boquilla. Gíralo con el ratón.';
  if (p.que === 'despiece') return '📐 DESPIECE: cada pieza separada de su sitio (las mitades del armazón a los lados, la corredera y el cilindro arriba, el cargador abajo).';
  const aviso = Q.T ? '⚠️ ES UN ARMA DE 4.ª CATEGORÍA (airsoft): para tenerla hace falta la TARJETA DE ARMAS de tu ayuntamiento; úsala solo en un CAMPO de airsoft, con gafas, y transpórtala en su funda. La punta naranja no se quita. No la vendas impresa sin informarte antes (es fabricar armas).'
    : '⚠️ Es un juguete de bolas BLANDAS: calculado por debajo del límite de los juguetes (0,08 J), pero ni a la cara ni a los animales, y con gafas. La punta naranja no se quita. Para vender juguetes ya hechos hace falta el marcado CE: lo seguro es vender el ARCHIVO.';
  return '🔫 MODELO «' + Q.ES.t.toUpperCase() + '»: ' + Q.ES.d + ' (la mecánica es la misma en los 4 modelos: está comprobada pieza a pieza). PARA QUÉ: ' + (Q.T ? 'una réplica de MUELLE de 6 mm para jugar en el campo de airsoft (premium: HOP-UP regulable, muelle ' + (p.muelle === 'fuerte' ? 'FUERTE' : 'normal') + ')' : 'una pistola de juguete de bolas BLANDAS como la de la foto, de muelle, que funciona de verdad') + '. Con el mecanismo de las de verdad: CARGADOR que se saca (con su botón), las bolas esperan en sus LABIOS y la boquilla las sube por una rampa al cañón; SEGURO de palanca; corredera con miras, ventana de expulsión y estrías. Se tira de la corredera hacia atrás, se suelta y se aprieta el gatillo. Diseño propio (sin forma de ninguna marca) con la PUNTA NARANJA. '
    + 'CALCULADO (no medido; se mide con un cronógrafo): muelle de ' + Math.round(C.Em * 1000) + ' mJ con un rendimiento del 30 % → unos ' + Math.round(C.Eb * 1000) + ' mJ en la bola: ' + v.join(' / ') + ' m/s (' + fps.join(' / ') + ' fps' + (Q.T ? ', con bolas de 0,20 / 0,25 g' : '') + '). Para tirar de la corredera, unos ' + kg + ' kg. '
    + 'LO QUE COMPRAS: ' + compra(Q).filter(x => x[2] !== 'YA LOS TIENES').map(x => x[1] + ' × ' + x[0]).join('; ') + '. Y 6 muelles de bolígrafo (los tienes). '
    + 'SE IMPRIME en ' + nC + (nC === 1 ? ' cama' : ' camas') + ' de la P1P, TODO SIN SOPORTES' + (Q.T ? ', en PETG (el de campo hace más fuerza)' : ', en PLA') + ', con 4 paredes; el cilindro y la recámara de pie (salen redondos: no pierden aire) con sus orejas de adherencia; la PUNTA en NARANJA. Antes, la 🧪 prueba de encaje. ' + aviso; }

export function manualLanzabolas(p) { const Q = medidas(p), C = cuentas(Q), cuenta = new Map();
  N.enAmbito(() => { piezas(Q).forEach(x => cuenta.set(x.t, { k: 1, como: x.como })); return null; });
  const kg = Math.round(C.fuerzaTirar / 9.81 * 10) / 10;
  return { vistas: [['montado', 'Así queda montada'], ['dentro', 'Por dentro, armada'], ['despiece', 'Dónde va cada pieza']],
    piezas: [...cuenta].map(([t, c2]) => [t, c2.k, c2.como]),
    tornilleria: [[7, 'Tornillo M3 × 20 avellanado', 'juntan las dos mitades del armazón (entran por la izquierda y roscan en la derecha)'], [1, 'Tornillo M3 × 5 avellanado', 'la corredera al nervio del cilindro, por arriba (NO más largo: entraría en el cilindro del aire y frenaría el pistón)'], [1, 'Tornillo M3 × 30', 'la guía del muelle de la corredera, debajo del cañón']],
    herramientas: 'Destornillador de estrella pequeño, cúter (las orejas de adherencia), lija fina, grasa de silicona y cianoacrilato. Lo que se compra: ' + compra(Q).map(x => x[1] + ' × ' + x[0]).join(' · ') + '.',
    edad: Q.T ? 'Solo adultos, con tarjeta de armas (4.ª categoría), y solo en un campo de airsoft con gafas.' : 'A partir de 14 años; con gafas y nunca a la cara.',
    pasos: ['Imprime antes la 🧪 PRUEBA DE ENCAJE con TUS bolas y TU junta. Corta con el cúter las orejas de adherencia del cilindro y de la recámara.',
      'Pon la MITAD IZQUIERDA del armazón en la mesa, con los huecos hacia arriba. Mete la BARRA DEL GATILLO en su canal (la cuña atrás) con un muelle de boli detrás, y el GATILLO en su ranura con su tetón en el agujero de la barra: tiene que ir y volver solo.',
      'Pon el FIADOR en su tetón (el diente hacia atrás, la oreja encima de la cuña) y un muelle de boli encima de la oreja, en su hueco de la torre.',
      'El SEGURO: mete su eje desde fuera por el agujero de la izquierda (la palanca por fuera). Palanca ABAJO = puesto (el gatillo no anda); palanca ATRÁS = se puede disparar.',
      'El BOTÓN del cargador: su barra entra por la izquierda en su agujero de detrás del guardamonte (el brazo con el diente por el lado derecho del pozo del cargador) con un muelle de boli cortado a 6 mm a la derecha.',
      'La RECÁMARA CON SU CAÑÓN en su hueco (la lengüeta del retén arriba)' + (Q.T ? '. Pega la GOMA DEL HOP-UP (TPU) encima de la lengüeta y pon el tornillo PRISIONERO M3 × 6 en su puente, sin apretar.' : '.'),
      'Pon la JUNTA TÓRICA en la ranura del PISTÓN con grasa, mete la VARILLA de lado en su cola de milano, el MUELLE GRANDE alrededor de la varilla y unta grasa dentro del CILINDRO.',
      'Mete el pistón en el cilindro por detrás (el chaflán ayuda a que la junta entre sin cortarse) y pon todo en la cubierta: la boquilla (con su quilla abajo) dentro de la recámara y la varilla por el paso cuadrado del tabique, por encima del diente del fiador.',
      'El TORNILLO M3 × 30 en su hueco de debajo del cañón (la cabeza detrás de su pared) y el MUELLE DE LA CORREDERA alrededor.',
      'Cierra con la MITAD DERECHA (su costilla guía la barra) y pon los 7 tornillos M3 × 20. Mira que el gatillo, el fiador, el seguro y el botón se muevan.',
      'Mete la CORREDERA por delante (sus raíles en las ranuras del armazón) hasta el fondo y atorníllala al nervio del cilindro con el M3 × 5 de arriba (el nervio entra en su alojamiento: si no entra, no aprietes; mira que no haya hilos). Pega las MIRAS en sus ranuras en V.',
      'Pega la PUNTA NARANJA en la boca del cañón y las dos CACHAS en la empuñadura (cianoacrilato).',
      'El CARGADOR: mete el EMPUJADOR (el hueco hacia abajo) y 3 muelles de boli seguidos por abajo, y pon la BASE a presión (una gota de pegamento). Las bolas se meten POR ARRIBA, entre los labios, una a una apretando con el dedo (como en los de verdad).',
      'Mete el cargador por abajo hasta que haga CLIC (el botón lo engancha). Para sacarlo, aprieta el botón desde la izquierda.',
      ...(Q.T ? ['El HOP-UP: con la llave Allen de 1,5, por el agujerito de encima de la corredera, aprieta el prisionero 1/4 de vuelta cada vez hasta que la bola vuele recta y lejos (si sube, afloja un poco).'] : []),
      'DISPARAR: con gafas, quita el seguro (palanca atrás), tira de la corredera hasta el fondo (unos ' + kg + ' kg) y suéltala; apunta al blanco y aprieta el gatillo.'],
    consejos: ['Calculado (no medido): ' + Math.round(C.Eb * 1000) + ' mJ en la bola, ' + C.v.map(x => Math.round(x)).join(' / ') + ' m/s (' + C.fps.map(x => Math.round(x)).join(' / ') + ' fps). Se mide con un cronógrafo: ' + (Q.T ? 'los campos de airsoft lo piden en la puerta.' : 'si se pasa del límite de juguete, usa un muelle más blando.'),
      'Si al soltar la corredera no se queda armada: el fiador no entra en la muesca (mira que su muelle de boli empuje). Si la bola no sale: grasa en la junta y que la boquilla no roce.',
      'En el 🎬 Catálogo de CelebriR8 → 🔧 Montaje paso a paso, se ve este mismo orden, pieza a pieza; y 🎬 Animación enseña cómo se arma y dispara.'],
    cuidados: [Q.T ? 'Es un arma de 4.ª categoría: tarjeta de armas, solo en el campo, en su funda y con la punta naranja.' : 'Es un juguete: con bolas BLANDAS, nunca a la cara ni a los animales, y con gafas.', 'Una gota de grasa de silicona en la junta cada 200 disparos. No dispares sin bola muchas veces seguidas (el pistón golpea).', 'Guárdala desarmada (sin el muelle apretado) y sin bolas.'] }; }

const QUE = [['cama1', 'Cama 1'], ['cama2', 'Cama 2'], ['prueba', '🧪 Prueba de encaje (pistón, recámara, cargador)'], ['montado', '👀 Montada'], ['atras', '👀 Con la corredera atrás'],
  ['dentro', '🔍 Por dentro (armada)'], ['despiece', '📐 Despiece: el dibujo de montaje']];
// cada MODELO es un diseño del catálogo con su ficha (la misma mecánica; cambia el cuerpo): la Clásica (la primera) y, desde el 21-10 por la tarde,
// Competición, Táctica y Futura
const conEstilo = (p, estilo) => Object.assign({}, p, { estilo });
const entrada = (estilo, color, mas) => Object.assign({ cat: 'juguetes', tambien: ['regalos', 'pro'], nuevo: true, uso: 'funcional', color,
  campos: [s('version', 'Versión', 'juguete', Object.entries(VERSIONES)), n('bola', 'Ø de tus bolas blandas (solo el juguete)', 7.5, 6.5, 8.5, 0.1),
    s('tono', '🎨 Colores (para verla: se imprime en el filamento que quieras, la punta siempre naranja)', 'estilo', Object.entries(TONOS)),
    s('anim', '🎬 Animación', 'dentro', [['dentro', 'Por dentro: se ve el mecanismo y la bola saliendo'], ['fuera', 'Por fuera (y el montaje con todas las piezas)']]),
    s('muelle', 'Muelle (solo la de campo)', 'normal', [['normal', 'Normal (hilo 1,4: ≈150 fps, 5,5 kg al tirar)'], ['fuerte', 'Fuerte (hilo 1,5: ≈180 fps, 8 kg al tirar)']]), s('que', 'Qué imprimo', 'cama1', QUE)],
  pesado: true, coloresVista: (p, base) => coloresVista(conEstilo(p, estilo), base, color), gen: p => genLanzabolas(conEstilo(p, estilo)), manual: p => manualLanzabolas(conEstilo(p, estilo)), nota: p => notaLanzabolas(conEstilo(p, estilo)) }, mas);
const BUSCA = 'lanzabolas pistola juguete bolas blandas airsoft balines muelle corredera gatillo cargador blaster soft bullet 6 mm campo punta naranja réplica';
export const DISENOS_LANZABOLAS = {
  lanzabolas: entrada('clasica', '#26272b', { busca: BUSCA + ' clásica', e: '🎯', t: 'Lanzabolas de muelle: juguete de bolas blandas o premium de 6 mm para el campo',
    d: 'Funciona de verdad: se tira de la corredera, el pistón de aire queda armado y el gatillo lo suelta. Cargador en la empuñadura, punta naranja, todo impreso sin soportes' }),
  lanzabolasCompeticion: entrada('competicion', '#a9b0b8', { busca: BUSCA + ' competición compensador embudo magwell cola de castor estriado premium ipsc', e: '🏁', t: 'Lanzabolas «Competición»: compensador, embudo del cargador y cola de castor larga',
    d: 'La misma mecánica que funciona, con cuerpo de competición: compensador naranja con respiraderos, embudo, gancho en el guardamonte, estrías en diagonal y lomo estriado' }),
  lanzabolasTactica: entrada('tactica', '#b39b6c', { busca: BUSCA + ' táctica militar arena fde oliva anilla correa guardamonte redondo premium', e: '🪖', t: 'Lanzabolas «Táctica»: guardamonte redondo, curva de la palma y anilla para la correa',
    d: 'La misma mecánica que funciona, con cuerpo táctico: empuñadura con curva de la palma y estrías delante, anilla, estrías gruesas; en arena (FDE), oliva o negra' }),
  lanzabolasFutura: entrada('futura', '#4c5159', { busca: BUSCA + ' futurista angular moderna ciencia ficción premium diseño', e: '⚡', t: 'Lanzabolas «Futura»: todo en ángulos, guardamonte en punta y estrías en V',
    d: 'La misma mecánica que funciona, con cuerpo angular: guardamonte en punta, cola de castor en flecha, talón en la base, estrías en V y una línea a lo largo de la corredera' })
};
export const montadasDe = estilo => p => montadasLanzabolas(conEstilo(p, estilo));
