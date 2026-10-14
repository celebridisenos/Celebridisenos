// ================= 13-10-2026 · 🏎️ MÁS RC, RODAMIENTOS Y CAJAS SEGURAS (lote de la 50.1) =================
// La dueña: «soportes de motor DC de varios modelos, de servos también, más chasis RC, más rim y neumáticos RC drift bien diseñados,
// más adaptador hexagonal que tenga entrada 6 mm y acabe en 3 mm, otra de 5 mm y de 4 mm, más rodamientos, más cajas de diferentes
// estilos, formas, cierres seguros con protección».
// Mismas reglas que rc_mas.js: diseños PROPIOS; lo que depende de TU pieza (motor, servo, eje) trae las medidas HABITUALES de ese
// modelo como PUNTO DE PARTIDA (ESTIMADAS: cada marca cambia; se dice) y se cambian; tus holguras (0,05 presión · 0,10 justo ·
// 0,15 gira, por lado); cada uno con su 🧪 PRUEBA DE ENCAJE de pocos gramos; pensados para imprimirse SIN soportes.
import * as N from './nucleo.js';
import { circulo, rectR, ENCAJES } from './motor.js';
import * as RI from './rodamiento_impreso.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const circ = (d, x = 0, y = 0) => N.cs([N.ccw(circulo(d / 2, x, y, seg(d)))], 'Positive');
const rr = (w, h, r = 0, x = 0, y = 0) => N.cs([N.ccw(rectR(w, h, r, x, y))], 'Positive');
const cil = (d, h, z = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([0, 0, z]);
const caja = (x, y, z, cx = 0, cy = 0, cz = 0) => M().cube([x, y, z], true).translate([cx, cy, cz + z / 2]);
const J = ENCAJES.justo, GI = ENCAJES.gira, PR = ENCAJES.presion;
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const PRUEBA = '🧪 PRUEBA DE ENCAJE: ';
const hexCS = (entreCaras) => N.cs([N.poligono2(6, entreCaras / Math.cos(Math.PI / 6), 0)], 'Positive');
// el perfil de un eje: redondo, en D (con su plano) o hexagonal (entre caras)
function perfilEje(forma, d, plano) {
  if (forma === 'hex') return hexCS(d);
  let p = circ(d); if (forma === 'd' && plano > 0 && plano < d) p = p.subtract(rr(d + 2, d + 2).translate([plano - d / 2 + (d + 2) / 2, 0])); return p;
}
// una cartela triangular de grosor 3 en X: de (y0, z0) hacia atrás «largo» y hacia arriba «alto»
const cartela = (x, y0, z0, largo, alto, sgY = -1) => M().hull([caja(3, 0.2, 0.2, x, y0, z0), caja(3, 0.2, 0.2, x, y0 + sgY * largo, z0), caja(3, 0.2, 0.2, x, y0, z0 + alto)]);
const enFila = (L, sep = 6) => { let x = 0; return L.map(m => { const b = N.caja(m), o = m.translate([x - b.min[0], -(b.min[1] + b.max[1]) / 2, -b.min[2]]); x += b.dims[0] + sep; return o; }); };

// ======================= 🔌 SOPORTE DE MOTOR DC (varios modelos) =======================
// Dos formas: ABRAZADERA (motores de lata con planos, N20/130/280: una cuna y su tapa con 2 tornillos M3 la aprietan, sin agujeros
// del motor) o DE CARA (370 y mayores, reductoras JGA25 / 37 mm: escuadra con los agujeros de su cara y ranuras para ajustar el
// engrane). Las medidas de cada modelo son las HABITUALES (ESTIMADAS): mídelas y cámbialas abajo; la prueba de encaje lo confirma.
export const MOTORES_DC = {
  n20: { t: 'N20 (micro reductor, 12 × 10)', forma: 'abrazadera', D: 12, plano: 10, largo: 25, caja: true },
  m130: { t: '130 (de juguete, FA-130)', forma: 'abrazadera', D: 20.4, plano: 15.1, largo: 25 },
  m280: { t: '280', forma: 'abrazadera', D: 24.4, plano: 18, largo: 30 },
  m370: { t: '370', forma: 'cara', D: 24.4, sep: 17, tor: 2.6, boss: 10, nTor: 2 },
  m380: { t: '380 (RC 1/16 – 1/10 pequeño)', forma: 'cara', D: 27.7, sep: 25, tor: 2.6, boss: 10, nTor: 2 },
  m540: { t: '540 / 550 (RC 1/10)', forma: 'cara', D: 36, sep: 25, tor: 3.2, boss: 12.7, nTor: 2 },
  m775: { t: '775 (taladros, grande)', forma: 'cara', D: 42, sep: 29, tor: 4.2, boss: 17.5, nTor: 2 },
  jga25: { t: 'Reductor de 25 mm (JGA25)', forma: 'cara', D: 25, sep: 17, tor: 3.2, boss: 7.5, nTor: 2 },
  jgb37: { t: 'Reductor de 37 mm (JGB37)', forma: 'cara', D: 37, sep: 31, tor: 3.2, boss: 12.2, nTor: 6 }
};
const DC = { soporteMotorDC: { cat: 'rc', tambien: ['mecanica', 'pro'], e: '🔌', t: 'Soporte de motor DC (N20, 130, 280, 370, 380, 540, 775, reductores)', d: 'Abrazadera o escuadra con los agujeros de su cara: elige el modelo y mídelo', uso: 'pieza', color: '#3d4048', nuevo: true,
  campos: [s('modelo', 'Modelo', 'm540', Object.entries(MOTORES_DC).map(([k, m]) => [k, m.t])), n('D', 'Ø del motor (0 = el del modelo, mídelo)', 0, 0, 60, 0.1), n('plano', 'Entre los planos de la lata (0 = el del modelo)', 0, 0, 60, 0.1),
    n('sep', 'Agujeros de la cara: de uno al otro (0 = los del modelo)', 0, 0, 60, 0.1), n('boss', 'Saliente del eje (Ø, 0 = el del modelo)', 0, 0, 30, 0.1), n('ajuste', 'Recorrido para ajustar el engrane (de cara)', 4, 0, 12, 0.5),
    n('altoEje', 'Altura del eje sobre el chasis (0 = la justa)', 0, 0, 60, 0.5), n('sepC', 'Agujeros al chasis: separación', 30, 0, 100, 0.5), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (lámina de 2 mm con su forma y agujeros)', false)],
  gen(p) {
    const Mo = MOTORES_DC[p.modelo] || MOTORES_DC.m540, D = p.D > 0 ? p.D : Mo.D, pl = p.plano > 0 ? p.plano : (Mo.plano || D), g = 3.5;
    if (Mo.forma === 'abrazadera') {
      // la lata: un círculo con dos planos (N20: un rectángulo de esquinas redondas)
      const lata = Mo.caja ? rr(D + 2 * J, pl + 2 * J, 1.2) : circ(D + 2 * J).intersect(rr(D + 4, pl + 2 * J)), L = p.prueba ? 2 : Math.max(10, Math.min(Mo.largo * 0.6, 18));
      const eje = p.altoEje > 0 ? Math.max(p.altoEje, pl / 2 + g) : pl / 2 + g, ancho = D + 2 * 3 + 2 * 9, alto = eje + pl / 2 + 2.5;
      // la cuna (abajo, con el pie y 2 agujeros al chasis) y la tapa (arriba): cortadas por el eje del motor, con 0,4 de aire para apretar
      const bloque = rr(ancho, alto, 2).translate([0, alto / 2]).subtract(lata.translate([0, eje])) /* (los planos de la lata, arriba y abajo) */, orejas = [-1, 1].map(sg => sg * (D / 2 + 3 + 4.5));
      let cuna = bloque.intersect(rr(ancho + 2, eje - 0.2).translate([0, (eje - 0.2) / 2])).extrude(L), tapa = bloque.subtract(rr(ancho + 2, eje + 0.2).translate([0, (eje + 0.2) / 2])).extrude(L);
      if (!p.prueba) orejas.forEach(x => { const t = cil(3.3, alto + 2, -1).rotate([-90, 0, 0]).translate([x, -1, L / 2]); cuna = cuna.subtract(M().cylinder(eje, 1.25, 1.25, 24).rotate([-90, 0, 0]).translate([x, 2, L / 2])); tapa = tapa.subtract(t).subtract(cil(6, 3, 0).rotate([-90, 0, 0]).translate([x, alto - 2.5, L / 2])); });
      if (p.prueba) return N.union([cuna, tapa.translate([0, 2, 0])]);
      // el pie al chasis
      let pie = caja(Math.max(ancho, p.sepC + 10), L + 12, 3, 0, 0, 0).translate([0, 0, 0]); [-1, 1].forEach(sg => { if (p.sepC > 0) pie = pie.subtract(cil(3.3, 5, -1).translate([sg * p.sepC / 2, -(L + 12) / 2 + 3.5, 0])); });
      cuna = cuna.rotate([90, 0, 0]).translate([0, L / 2, 0]).add(pie.translate([0, 0, 0]));
      return N.union(enFila([cuna, tapa.rotate([-90, 0, 0])], 8));
    }
    // DE CARA: escuadra (cara vertical con los agujeros + pie con ranuras) y dos cartelas
    const sep = p.sep > 0 ? p.sep : Mo.sep, boss = p.boss > 0 ? p.boss : Mo.boss, aj = p.ajuste, lado = Math.max(D + 6, sep + Mo.tor + 8), eje = p.altoEje > 0 ? p.altoEje : D / 2 + 3, altoC = eje + lado / 2, gc = p.prueba ? 2 : g;
    let cara = caja(lado, gc, altoC, 0, 0, 0).translate([0, gc / 2, 0]), ranura = (x, y, d) => M().hull([cil(d, gc + 2, -1).rotate([-90, 0, 0]).translate([x, -1, y - aj / 2]), cil(d, gc + 2, -1).rotate([-90, 0, 0]).translate([x, -1, y + aj / 2])]);
    const agujeros = Mo.nTor === 6 ? [...Array(6)].map((_, i) => [sep / 2 * Math.cos(i * Math.PI / 3), sep / 2 * Math.sin(i * Math.PI / 3)]) : [[-sep / 2, 0], [sep / 2, 0]];
    agujeros.forEach(([x, y]) => { cara = cara.subtract(aj > 0 && Mo.nTor !== 6 ? ranura(x, eje + y, Mo.tor) : cil(Mo.tor, gc + 2, -1).rotate([-90, 0, 0]).translate([x, -1, eje + y])); });
    cara = cara.subtract(aj > 0 ? ranura(0, eje, boss + 2 * GI) : cil(boss + 2 * GI, gc + 2, -1).rotate([-90, 0, 0]).translate([0, -1, eje]));
    if (p.prueba) return cara.rotate([-90, 0, 0]);
    let pie = caja(Math.max(lado, p.sepC + 12), 22, g, 0, -11 + gc, 0);
    if (p.sepC > 0) [-1, 1].forEach(sg => { pie = pie.subtract(M().hull([cil(3.3, g + 2, -1).translate([sg * p.sepC / 2 - 2, -12, 0]), cil(3.3, g + 2, -1).translate([sg * p.sepC / 2 + 2, -12, 0])])); });
    return N.union([cara, pie, cartela(-lado / 2 + 1.5, 0.1, g, 16, Math.min(altoC - g - 2, 18)), cartela(lado / 2 - 1.5, 0.1, g, 16, Math.min(altoC - g - 2, 18))]);
  },
  nota: p => { const Mo = MOTORES_DC[p.modelo] || MOTORES_DC.m540; return (p.prueba ? PRUEBA + (Mo.forma === 'abrazadera' ? 'mete TU motor en la cuna y pon la tapa: tiene que entrar justo y no girar.' : 'pon la lámina en la cara de TU motor: los agujeros y el saliente del eje tienen que coincidir.') + ' ' : '')
    + 'Medidas de partida de un ' + Mo.t + ' (ESTIMADAS: cada marca cambia; mídelo y cámbialo arriba). ' + (Mo.forma === 'abrazadera' ? 'Abrazadera en dos piezas con 2 tornillos M3 (se roscan solos en la cuna): aprieta la lata sin taladrarla.' : 'Escuadra con ' + (p.ajuste > 0 && Mo.nTor !== 6 ? 'ranuras de ' + n2(p.ajuste) + ' mm para ajustar el engrane piñón–corona' : 'agujeros fijos') + ' y pie con ranuras al chasis. Imprímela con el pie en la cama, en PETG.'); } } };

// ======================= 🔲 SOPORTE DE SERVO PRO (micro, estándar, 25 kg, gigante) en ESCUADRA o ABRAZADERA =======================
export const SERVOS = {
  micro: { t: 'Micro 9 g (SG90, MG90S)', L: 22.8, A: 12.4, sep: 27.8, par: 0, tor: 2 },
  estandar: { t: 'Estándar (MG996R, 15–20 kg)', L: 40.7, A: 19.9, sep: 49.5, par: 10, tor: 2.5 },
  kg25: { t: 'Digital 25–35 kg (DS3218 y parecidos)', L: 40, A: 20, sep: 49.5, par: 10, tor: 2.5 },
  bajo: { t: 'Perfil bajo (≈ 40 × 20, para coches)', L: 40.5, A: 20.2, sep: 49.5, par: 10, tor: 2.5 },
  gigante: { t: 'Gigante 1/5 (≈ 65 × 30, 60 kg)', L: 65.5, A: 30, sep: 76, par: 18, tor: 3.2 }
};
DC.soporteServoPro = { cat: 'rc', tambien: ['mecanica', 'pro'], e: '🦾', t: 'Soporte de servo PRO (escuadra o abrazadera)', d: 'Micro, estándar, 25 kg, perfil bajo o gigante: para robots, dirección y brazos', uso: 'pieza', color: '#e2231a', nuevo: true,
  campos: [s('modelo', 'Servo', 'estandar', Object.entries(SERVOS).map(([k, x]) => [k, x.t])), s('estilo', 'Forma', 'escuadra', [['escuadra', 'Escuadra en L (marco + placa a 90°)'], ['abrazadera', 'Tumbado con abrazadera (base + puente)'], ['doble', 'Escuadra doble (servo entre dos placas: brazos de robot)']]),
    n('cL', 'Largo del cuerpo (0 = el del modelo, mídelo)', 0, 0, 90, 0.1), n('cA', 'Ancho del cuerpo (0 = el del modelo)', 0, 0, 50, 0.1), n('sep', 'Agujeros de las orejas: de un lado al otro (0 = los del modelo)', 0, 0, 110, 0.1),
    n('sepC', 'Agujeros a tu pieza: separación', 30, 10, 100, 0.5), n('g', 'Grosor', 4, 3, 8, 0.5), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (el marco con 3 mm de alto)', false)],
  gen(p) {
    const S0 = SERVOS[p.modelo] || SERVOS.estandar, L = p.cL > 0 ? p.cL : S0.L, A = p.cA > 0 ? p.cA : S0.A, sep = p.sep > 0 ? p.sep : S0.sep, g = p.g, iL = L + 2 * J, iA = A + 2 * J;
    if (sep < iL + 3) N.mal('Los agujeros de las orejas (' + n2(sep) + ' mm) caen dentro del cuerpo (' + n2(L) + ' mm): mídelos otra vez de centro a centro.');
    const exL = sep + S0.tor + 8, exA = iA + 2 * g, alto = p.prueba ? 3 : g;
    // el marco: la placa donde apoyan las orejas, con el hueco del cuerpo y los agujeros (se roscan solos los tornillos del servo)
    let marco = caja(exL, exA, alto).subtract(caja(iL, iA, alto + 2, 0, 0, -1));
    [-1, 1].forEach(a => (S0.par > 0 ? [-1, 1] : [0]).forEach(b => { marco = marco.subtract(cil(S0.tor, alto + 2, -1).translate([a * sep / 2, b * S0.par / 2, 0])); }));
    if (p.prueba) return marco;
    const placa = (y) => { let pl = caja(exL, g, Math.max(26, p.sepC * 0.6 + 12), 0, y, 0); [-1, 1].forEach(sg => { pl = pl.subtract(cil(3.3, g + 2, -1).rotate([-90, 0, 0]).translate([sg * p.sepC / 2, y - g / 2 - 1, Math.max(26, p.sepC * 0.6 + 12) / 2 + 2])); }); return pl; };
    const cartelas = y0 => [-1, 1].map(sg => cartela(sg * (exL / 2 - 1.5), y0, alto, Math.min(10, exA - 2), 14, y0 > 0 ? -1 : 1));
    if (p.estilo === 'escuadra') return N.union([marco, placa(exA / 2 + g / 2), ...cartelas(exA / 2)]).translate([0, 0, 0]);
    if (p.estilo === 'doble') return N.union([marco, placa(exA / 2 + g / 2), placa(-exA / 2 - g / 2), ...cartelas(exA / 2), ...cartelas(-exA / 2)]);
    // abrazadera: el servo TUMBADO (sobre su lado ancho) en una base con dos topes y un puente que lo aprieta con 2 tornillos M3
    const altoS = iA, base = caja(iL + 30, 26, 3).add(caja(6, 26, altoS + 1.01, -(iL / 2 + 3), 0, 2.99)).add(caja(6, 26, altoS + 1.01, iL / 2 + 3, 0, 2.99));
    let b2 = base; [-1, 1].forEach(sg => { b2 = b2.subtract(cil(2.6, altoS + 2, 3).translate([sg * (iL / 2 + 3), 0, 0])); if (p.sepC > 0) b2 = b2.subtract(cil(3.3, 5, -1).translate([sg * Math.min(p.sepC / 2, iL / 2 + 13), 9, 0])); });
    let puente = caja(iL + 18, 12, 4); [-1, 1].forEach(sg => { puente = puente.subtract(cil(3.3, 6, -1).translate([sg * (iL / 2 + 3), 0, 0])); });
    return N.union(enFila([b2, puente], 8));
  },
  nota: p => { const S0 = SERVOS[p.modelo] || SERVOS.estandar; return (p.prueba ? PRUEBA + 'mete TU servo en el marco: el cuerpo entra justo y los agujeros de las orejas coinciden. ' : '') + 'Medidas de partida de un servo ' + S0.t + ' (ESTIMADAS: mídelo y cámbialo). '
    + ({ escuadra: 'Escuadra: el servo se atornilla al marco por sus orejas y la placa a 90° va a tu pieza con 2 tornillos M3.', doble: 'Escuadra doble: dos placas paralelas (para brazos y patas de robot).', abrazadera: 'Abrazadera: base con dos topes y un puente que aprieta el servo tumbado con 2 tornillos M3 (para coches con el servo de lado).' }[p.estilo] || '') + ' Imprímelo en PETG, sin soportes.'; } };

// ======================= 🔁 ACOPLADOR HEXAGONAL DE RUEDA para eje de motor (Ø 6, 5, 4 o 3 mm → hexágono de 12) =======================
// La dueña mandó la foto (13-10-2026): el acoplador de latón de robots y coches: cuerpo con el agujero del EJE DEL MOTOR y prisionero, que
// acaba en el HEXÁGONO de 12 mm de la llanta. Y luego: «hazlo mejor, eso no sirve». Impreso en plástico, un prisionero aprieta en UN
// punto y acaba pasándose de rosca o patinando; por eso:
//  · ABRAZADERA PARTIDA (la de por defecto): el cuerpo lleva un corte hasta el eje y un tornillo M3 con su tuerca lo cierra ALREDEDOR del
//    eje (como los collarines de los talleres): agarra en toda la vuelta y no se pasa. Con eje en D, además no puede girar.
//  · o PRISIONERO con TUERCA M3 encastrada (como el de latón, pero que no se pasa de rosca), uno o dos a 90°.
//  · hexágono con CHAFLÁN de entrada (la llanta entra sola) y el número del eje GRABADO arriba (6, 5, 4, 3: no se confunden).
//  · agujero en la punta para el tornillo de la rueda (M3 o M4) o pasante.
//  · «Juego de 4»: los de 6, 5, 4 y 3 de una vez.
const acoplador = (p, e) => {
  const hx = p.hex === 'medida' ? p.hexM : Number(p.hex), hL = p.prueba ? 3 : p.hexL, cL = p.prueba ? 4 : p.cuerpoL, su = p.prueba ? 'no' : p.sujecion;
  const tR = { M3: 2.5, M4: 3.3, no: 0 }[p.tRueda] || 0, fondo = p.prueba ? 0 : tR ? 4 : 0, H = hL + cL;
  // el cuerpo: con abrazadera, lo justo para el tornillo tangente (a 1,6 mm del eje) con su tuerca a un lado y la cabeza al otro
  const xs = e / 2 + 1.6 + 1.65, mitad = 0.6 + 1.6 + 2.8, Dab = 2 * Math.sqrt(xs * xs + mitad * mitad) + 0.6;
  const Dc = Math.max(hx, su === 'abrazadera' ? Dab : su === 'tuerca' ? e + 2 * (1.2 + 2.6 + 1.2) : e + 2 * 2.6);
  if (Dc / 2 - e / 2 < 1.6) N.mal('El eje de ' + n2(e) + ' mm deja muy poca pared: elige un hexágono más grande.');
  // el hexágono con su chaflán de entrada (0,6 mm) y el cuerpo encima (si es más ancho, con transición a 45°: sin voladizo)
  const hxJ = hx - 2 * J; let hexa; try { hexa = hexCS(hxJ - 1.2).extrude(0.6, 0, 0, [hxJ / (hxJ - 1.2), hxJ / (hxJ - 1.2)]).add(hexCS(hxJ).extrude(hL - 0.6 + 0.01).translate([0, 0, 0.6 - 0.005])); } catch (er) { hexa = hexCS(hxJ).extrude(hL); }
  let m = hexa.add(cil(Dc, cL + 0.01, hL - 0.01));
  if (Dc > hx + 0.5) { const t = Math.min((Dc - hx) / 2, hL - 0.8); m = m.add(M().cylinder(t + 0.01, hx / 2, hx / 2 + t, seg(Dc)).translate([0, 0, hL - t])); }
  // el agujero del eje (desde arriba, con su holgura «justo»), y el de la rueda en la punta
  m = m.subtract(perfilEje(p.forma === 'd' ? 'd' : 'redondo', e + 2 * J, p.plano + J).extrude(H - fondo + 0.01).translate([0, 0, fondo]));
  if (tR) m = m.subtract(cil(tR, fondo + 1, -0.5)); else if (!p.prueba) m = m.subtract(cil(e + 2 * J, H + 2, -1));
  const zP = hL + cL / 2;
  if (su === 'abrazadera') { // el corte (de 1,2 mm, del eje hacia fuera, solo en el cuerpo) y el tornillo que lo cierra, cruzándolo
    m = m.subtract(caja(Dc / 2 + 1, 1.2, cL + 1, Dc / 4 + 0.5, 0, hL + 0.6));
    const hy = Math.sqrt(Math.max(0, (Dc / 2) ** 2 - xs * xs)); // (dónde sale el tornillo por cada lado)
    m = m.subtract(cil(3.3, Dc + 2, 0).rotate([90, 0, 0]).translate([xs, Dc / 2 + 1, zP]))
      .subtract(hexCS(5.5 + 0.3).rotate(30).extrude(Dc).rotate([90, 0, 0]).translate([xs, -(hy - 2.8), zP])) // tuerca M3: entra por un lado
      .subtract(cil(6, Dc, 0).rotate([-90, 0, 0]).translate([xs, hy - 2.8, zP])); // la cabeza del tornillo, por el otro
  } else if (su === 'tuerca' || su === 'rosca') {
    for (const a of p.nPris === '2' ? [0, 90] : [0]) {
      if (su === 'rosca') m = m.subtract(cil(2.5, Dc, 0).rotate([0, 90, 0]).translate([0, 0, zP]).rotate([0, 0, a]));
      else { const rN = e / 2 + 1.2 + 1.25; m = m.subtract(cil(3.3, Dc, 0).rotate([0, 90, 0]).translate([0, 0, zP]).rotate([0, 0, a])).subtract(caja(2.4 + 0.3, 5.5 + 0.3, H - zP + 3.2, rN, 0, zP - 3.2).rotate([0, 0, a]).intersect(cil(Dc + 2, H + 1, zP - 3.5))); }
    }
  }
  // el número del eje, grabado arriba (en el lado contrario al corte / a la tuerca)
  if (!p.prueba) { try { const anillo = (Dc / 2 - e / 2), alto = Math.min(3.2, anillo * 0.7); if (alto >= 2) m = m.subtract(N.centraCS(N.texto2(n2(e), 'gorda', alto)).extrude(0.6).translate([-(e / 2 + anillo / 2), 0, H - 0.5])); } catch (er) { } }
  return { m, Dc, H, xs, tornillo: su === 'abrazadera' ? Math.ceil((2 * Math.sqrt(Math.max(0, (Dc / 2) ** 2 - xs * xs)) - 2.8) / 2) * 2 : 6 };
};
const EJES_JUEGO = [6, 5, 4, 3];
DC.adaptadorEje = { cat: 'rc', tambien: ['mecanica', 'componentes'], e: '🔁', t: 'Acoplador hexagonal de rueda (eje de 6, 5, 4 o 3 mm → hexágono de 12)', d: 'Como el de latón, pero con abrazadera que no patina; o el juego de los 4', uso: 'pieza', color: '#c9a227', nuevo: true,
  campos: [s('eje', 'Eje del motor', '6', [['6', 'Ø 6 mm'], ['5', 'Ø 5 mm'], ['4', 'Ø 4 mm'], ['3', 'Ø 3 mm'], ['juego', '🎁 Juego de 4 (6, 5, 4 y 3)'], ['medida', 'A medida']]), n('ejeM', 'Eje a medida (Ø)', 6, 1.5, 14, 0.05), s('forma', 'Forma del eje', 'redondo', [['redondo', 'Redondo'], ['d', 'En D (con plano: no puede girar)']]), n('plano', 'Eje en D: del plano al otro lado (mídelo)', 5.4, 1, 14, 0.05),
    s('sujecion', 'Cómo agarra el eje', 'abrazadera', [['abrazadera', '⭐ Abrazadera partida con tornillo M3 (la que más agarra)'], ['tuerca', 'Prisionero M3 con tuerca encastrada (como el de latón)'], ['rosca', 'Prisionero M3 roscado en el plástico'], ['no', 'Nada (a presión o pegado)']]), s('nPris', 'Prisioneros', '1', [['1', '1'], ['2', '2 (a 90°)']]),
    s('hex', 'Hexágono de la rueda', '12', [['12', '12 mm (1/10, el normal)'], ['7', '7 mm (1/24, 1/18)'], ['14', '14 mm'], ['17', '17 mm (1/8)'], ['medida', 'A medida']]), n('hexM', 'Hexágono a medida (entre caras)', 12, 5, 24, 0.1), n('hexL', 'Alto del hexágono', 6, 3, 15, 0.5),
    n('cuerpoL', 'Largo del cuerpo (donde va el eje)', 11, 6, 30, 0.5), s('tRueda', 'Tornillo de la rueda (en la punta)', 'M3', [['M3', 'M3'], ['M4', 'M4'], ['no', 'Ninguno (agujero pasante)']]), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (4 mm de cuerpo con el agujero del eje y 3 mm de hexágono)', false)],
  gen(p) {
    if (p.eje === 'juego') return N.union(enFila(EJES_JUEGO.map(e => acoplador(p, e).m), 6));
    return acoplador(p, p.eje === 'medida' ? p.ejeM : Number(p.eje)).m;
  },
  nota: p => { const L = p.eje === 'juego' ? EJES_JUEGO : [p.eje === 'medida' ? p.ejeM : Number(p.eje)], A = acoplador(Object.assign({}, p, { prueba: false }), L[0]), hx = p.hex === 'medida' ? p.hexM : Number(p.hex);
    return (p.prueba ? PRUEBA + 'mete el eje de TU motor (tiene que entrar justo, sin bailar) y la llanta en el hexágono. ' : '') + (L.length > 1 ? 'Juego de 4 acopladores (ejes de 6, 5, 4 y 3 mm, con su número grabado)' : 'Acoplador para eje de Ø' + n2(L[0]) + (p.forma === 'd' ? ' en D' : '')) + ' → hexágono de ' + n2(hx) + ' mm con chaflán de entrada' + ({ M3: ' y agujero M3 en la punta para el tornillo de la rueda', M4: ' y agujero M4 en la punta para el tornillo de la rueda', no: '' }[p.tRueda] || '') + '. '
      + ({ abrazadera: 'ABRAZADERA: mete una tuerca M3 en su hueco hexagonal y cierra con un tornillo M3 × ' + A.tornillo + ' desde el otro lado: el corte se cierra alrededor del eje y agarra en toda la vuelta (no se pasa de rosca como un prisionero).', tuerca: 'Prisionero: mete una TUERCA M3 por la ranura de arriba y aprieta con un tornillo M3 × 6 desde fuera.', rosca: 'Prisionero M3 roscado en el plástico: si aprietas mucho se pasa (mejor la abrazadera).', no: 'Sin nada: a presión o con una gota de pegamento.' }[p.sujecion] || '')
      + ' Imprímelo con el hexágono en la cama, en PETG o PA (nylon), 100 % de relleno. Cuerpo de Ø' + n2(A.Dc) + ' × ' + n2(A.H) + ' mm.'; } };

// ======================= 🛞 RUEDA DE DRIFT: llanta con bombeo + neumático duro =======================
// Drift 1/10: rueda de ≈ 63 mm con neumático DURO y liso (en drift se busca que deslice; se imprime en PLA, PETG o ABS, no en TPU).
// La llanta se imprime con la CARA en la cama: el aro primero y los radios a la altura del «bombeo», como puentes del aro al centro
// (sin soportes). Más bombeo = el centro más hondo = la rueda sale más hacia fuera (más ancho de vía). El neumático entra a presión
// por la cara hasta el tope del lado del coche.
DC.ruedaDrift = { cat: 'rc', tambien: ['pro'], e: '🛞', t: 'Rueda de DRIFT (llanta con bombeo + neumático duro)', d: '1/10 (≈ 63 mm) o a medida, 6 estilos de radios y el bombeo que quieras', uso: 'pieza', color: '#c9ccd2', nuevo: true,
  campos: [n('D', 'Ø de la rueda con el neumático', 63, 40, 110, 0.5), n('W', 'Ancho', 26, 16, 40, 0.5), n('bombeo', 'Bombeo (lo hondo que va el centro)', 6, 0, 14, 0.5),
    s('estilo', 'Radios', 'r5d', [['r5d', '5 radios dobles'], ['r6', '6 radios'], ['r10', '10 radios finos'], ['malla', 'Malla (agujeros redondos)'], ['turbina', 'Turbina'], ['estrella', 'Estrella de 5']]),
    s('que', 'Qué sacar', 'ambos', [['ambos', 'Llanta y neumático'], ['llanta', 'Solo la llanta'], ['neumatico', 'Solo el neumático']]), s('dibujo', 'Neumático', 'liso', [['liso', 'Liso (desliza más)'], ['surcos', 'Con 2 surcos'], ['rayas', 'Rayado fino']]),
    n('hex', 'Hexágono del coche (entre caras)', 12, 5, 20, 0.1), n('eje', 'Tornillo de la tuerca de rueda', 4, 2, 6, 0.1), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (aro del asiento con el neumático de 4 mm y el centro del hexágono)', false)],
  gen(p) {
    const D = p.D, W = p.prueba ? 4 : p.W, tN = Math.max(3.2, Math.min(6, D * 0.075)), Rs = D / 2 - tN, tope = 1.2, pared = 1.8, ri = Rs - pared, t = 3.2, dHub = p.hex / 0.866 + 6;
    if (dHub / 2 > ri - 6) N.mal('El hexágono no cabe en una llanta tan pequeña.');
    // la llanta: el aro (asiento del neumático, con un tope de 1,2 en el lado del coche) · los radios a la altura del bombeo · el centro
    const aro = CS().ofPolygons([N.ccw([[ri, 0], [Rs, 0], [Rs, W - tope], [Rs + tope, W - tope], [Rs + tope, W], [ri, W]])]).revolve(seg(D) * 2);
    const zR = Math.min(p.bombeo, W - t - 6), hubTop = Math.max(zR + t + 2 + 5, W * 0.6);
    const zona = circ(2 * ri + 0.6).subtract(circ(dHub - 1)), barra = (a, w1, w2, fin, rot = 0) => M().hull([cil(w1, t).translate([dHub / 2 - 0.5, 0, 0]), cil(w2, t).translate([fin * Math.cos(rot), fin * Math.sin(rot), 0])]).rotate([0, 0, a]);
    let rad;
    if (p.estilo === 'r5d') { const L = []; for (let i = 0; i < 5; i++) [-1, 1].forEach(sg => L.push(barra(i * 72, 3.6, 3.2, ri, sg * 0.12))); rad = N.union(L); }
    else if (p.estilo === 'r6') rad = N.union([...Array(6)].map((_, i) => barra(i * 60, 6, Math.max(4, D / 12), ri)));
    else if (p.estilo === 'r10') rad = N.union([...Array(10)].map((_, i) => barra(i * 36, 3, 2.6, ri)));
    else if (p.estilo === 'estrella') { const L = []; for (let i = 0; i < 5; i++) { L.push(barra(i * 72, 7, 3, ri, 0.32)); L.push(barra(i * 72, 7, 3, ri, -0.32)); } rad = N.union(L); }
    else if (p.estilo === 'turbina') { const P = [0, 0.33, 0.66, 1].map(f => { const r0 = dHub / 2 - 0.5 + f * (ri - dHub / 2 + 0.5), a = f * 0.7; return [r0 * Math.cos(a), r0 * Math.sin(a)]; }), una = N.union([0, 1, 2].map(j => M().hull([cil(3, t).translate([P[j][0], P[j][1], 0]), cil(3, t).translate([P[j + 1][0], P[j + 1][1], 0])]))); rad = N.union([...Array(9)].map((_, i) => una.rotate([0, 0, i * 40]))); }
    else { let d0 = zona; const k = 7, r0 = (dHub / 2 + ri) / 2, dh = Math.min((ri - dHub / 2) * 0.62, 2 * Math.PI * r0 / k * 0.62); for (let i = 0; i < k; i++) d0 = d0.subtract(circ(dh).translate([r0 * Math.cos(i * 2 * Math.PI / k), r0 * Math.sin(i * 2 * Math.PI / k)])); rad = d0.extrude(t); }
    // con bombeo, los radios van a media altura: por debajo, una RAMPA a 45° en el borde del aro y otra en el centro (el «plato
    // hondo» de las llantas de drift): así los radios no son puentes largos y se imprime sin soportes
    const rampa = zR > 0.4 ? [M().cylinder(zR + 0.01, ri, ri, seg(D) * 2).subtract(M().cylinder(zR + 0.02, ri, ri - zR, seg(D) * 2).translate([0, 0, -0.005])), M().cylinder(zR + 0.01, dHub / 2, dHub / 2 + zR, seg(D))] : [];
    let llanta = N.union([aro, rad.intersect(zona.extrude(t)).translate([0, 0, zR]), cil(dHub, hubTop), ...rampa]);
    llanta = llanta.subtract(hexCS(p.hex + 2 * J).extrude(hubTop).translate([0, 0, hubTop - 5])).subtract(cil(p.eje + 0.3, hubTop + 2, -1)).subtract(cil(p.eje * 2 + 2.5, Math.max(0, zR - 0.01), -0.01)); // (por la cara, el hueco de la tuerca)
    // el neumático: un aro duro con hombros redondeados; entra a presión por la cara hasta el tope
    const Wn = W - tope - 0.3, rH = Math.min(2.2, tN * 0.5), Ri = Rs + PR * 0 - 0.02, Ro = D / 2;
    const perfil = [[Ri, 0], [Ro - rH, 0]]; for (let k = 1; k <= 6; k++) { const a = -Math.PI / 2 + k * Math.PI / 12; perfil.push([Ro - rH + rH * Math.cos(a), rH + rH * Math.sin(a)]); }
    perfil.push([Ro, Wn - rH]); for (let k = 1; k <= 6; k++) { const a = k * Math.PI / 12; perfil.push([Ro - rH + rH * Math.cos(a), Wn - rH + rH * Math.sin(a)]); } perfil.push([Ri, Wn]);
    let neu = CS().ofPolygons([N.ccw(perfil)]).revolve(seg(D) * 2);
    if (p.dibujo === 'surcos') [Wn / 3, 2 * Wn / 3].forEach(z => { neu = neu.subtract(M().cylinder(1.6, Ro + 1, Ro + 1, seg(D) * 2).translate([0, 0, z - 0.8]).subtract(cil(2 * Ro - 1.6, 4, z - 2))); });
    if (p.dibujo === 'rayas') { const nR = Math.round(Math.PI * D / 2.4); for (let i = 0; i < nR; i++) neu = neu.subtract(caja(1.2, 0.8, Wn - 4, Ro, 0, 2).rotate([0, 0, i * 360 / nR])); }
    if (p.prueba) return N.union(enFila([llanta.intersect(cil(2 * Rs + 6, 4)), neu.intersect(cil(2 * Ro + 2, 4))], 6));
    if (p.que === 'llanta') return llanta; if (p.que === 'neumatico') return neu;
    return N.union(enFila([llanta, neu], 6));
  },
  nota: p => { const tN = Math.max(3.2, Math.min(6, p.D * 0.075)); return (p.prueba ? PRUEBA + 'mete el aro de neumático en el asiento (tiene que entrar apretado, a mano) y el centro en el hexágono de TU coche. ' : '')
    + 'Rueda de Ø' + n2(p.D) + ' × ' + n2(p.W) + ' mm: llanta con asiento de Ø' + n2(p.D - 2 * tN) + ' y bombeo de ' + n2(p.bombeo) + ' mm; neumático DURO de ' + n2(tN) + ' mm (para drift: PLA, PETG o ABS; NO TPU, que agarra). La llanta: con la CARA en la cama, sin soportes. El neumático entra a presión por la cara hasta el tope (si queda flojo, una gota de pegamento). Hexágono de ' + n2(p.hex) + ' mm.'; } };

// ======================= 🛞 RODAMIENTO IMPRESO CON PESTAÑA (redonda, rombo de 2 agujeros o cuadrada de 4) =======================
// El mismo rodamiento impreso de siempre (sale YA MONTADO, con TU holgura de la prueba) con su aro de fuera convertido en un SOPORTE:
// se atornilla a una pared o a un chasis y el eje pasa por dentro (como los soportes de pared de los ejes).
DC.rodamientoPestana = { cat: 'mecanica', tambien: ['componentes', 'rc'], e: '🛞', t: 'Rodamiento impreso con soporte (pestaña de 2 o 4 tornillos)', d: 'Sale ya montado y se atornilla: para ejes de 3 a 20 mm', uso: 'pieza', color: '#2457d6', nuevo: true,
  bambu: { enable_support: '0', brim_type: 'no_brim', ironing_type: 'no ironing', wall_loops: '4', sparse_infill_density: '100%', sparse_infill_pattern: 'zig-zag', seam_position: 'random', top_shell_layers: '5', bottom_shell_layers: '4' },
  campos: [n('d', 'Agujero del eje (mide tu eje)', 8, 3, 30, 0.1), n('D', 'Diámetro del rodamiento', 30, 16, 80, 0.5), n('B', 'Ancho', 9, 5, 30, 0.5), s('pestana', 'Soporte', 'rombo', [['rombo', 'Rombo de 2 tornillos'], ['cuadrada', 'Cuadrado de 4 tornillos'], ['redonda', 'Pestaña redonda (tope)']]),
    n('tor', 'Tornillos (Ø del agujero)', 4.2, 2.5, 8, 0.1), s('eje', 'Cómo entra el eje', 'justo', [['presion', 'A presión (no se mueve)'], ['justo', 'Justo (entra con la mano)'], ['gira', 'Suelto (el eje gira dentro)']]), s('holgura', 'Holgura para que gire (🧪 prueba)', 'auto', RI.OPS_HOLGURA), s('ret', 'Cómo sujeta los rodillos', 'auto', RI.OPS_RETENCION)],
  gen(p) {
    const Q = RI.piezas(p), RO = p.D / 2, g = Math.min(4, p.B - 1), rE = RO + 2;
    let pl;
    if (p.pestana === 'redonda') pl = circ(2 * (RO + 5));
    else if (p.pestana === 'cuadrada') { const a = 2 * RO + 4 * p.tor + 4; pl = rr(a, a, 4); }
    else { const L = 2 * RO + 6 * p.tor + 6; pl = CS().hull([circ(2 * RO + 6), circ(3 * p.tor, -L / 2 + 1.5 * p.tor, 0), circ(3 * p.tor, L / 2 - 1.5 * p.tor, 0)]); }
    let fl = pl.subtract(circ(2 * RO - 0.02)).extrude(g);
    const hs = p.pestana === 'cuadrada' ? (() => { const a = (2 * RO + 4 * p.tor + 4) / 2 - p.tor - 1; return [[a, a], [-a, a], [a, -a], [-a, -a]]; })() : p.pestana === 'rombo' ? [[-(RO + 3 * p.tor + 3) + 1.5 * p.tor, 0], [(RO + 3 * p.tor + 3) - 1.5 * p.tor, 0]] : [];
    hs.forEach(([x, y]) => { fl = fl.subtract(cil(p.tor, g + 2, -1).translate([x, y, 0])); });
    void rE; return N.union([Q.dentro, Q.fuera.add(fl)].concat(Q.rodillos));
  },
  nota: p => { try { const K = RI.cuentas(p); return 'Sale YA MONTADO: ' + K.n + ' rodillos de Ø' + n2(2 * K.r0) + ' con ' + RI.textoHolgura(K.H) + ', y su soporte (' + ({ rombo: 'rombo de 2 tornillos', cuadrada: 'cuadrado de 4', redonda: 'pestaña redonda' }[p.pestana]) + ') unido al aro de FUERA: el de dentro gira libre. Al sacarlo de la cama, gíralo con fuerza hasta que se suelte. Sin soportes, 100 % de relleno.'; } catch (e) { return e.message; } } };

// ======================= 🔐 CAJA DE BAYONETA (redonda, hexagonal u octogonal) con cierre seguro =======================
// Cierre de BAYONETA: la tapa entra y se GIRA 30° hasta que hace CLIC (un pequeño tope que hay que vencer: no se abre sola). Con
// «candado», al cerrarla quedan alineadas dos orejas con agujero: pasando un candado pequeño o un precinto ya no se puede girar.
// Con «junta», ranura para un aro de TPU (o una goma) que la hace estanca. Los tetones del cierre están DENTRO de la falda de la
// tapa (protegidos: no se enganchan ni se rompen al caer). Todo sin soportes: la caja de pie y la tapa del revés.
DC.cajaBayoneta = { cat: 'organizar', tambien: ['taller', 'hogar'], e: '🔐', t: 'Caja con cierre de bayoneta (clic + candado)', d: 'Redonda, hexagonal u octogonal: gira y hace clic; con candado y junta estanca', uso: 'deco', color: '#2a9d8f', nuevo: true,
  campos: [s('forma', 'Forma', 'redonda', [['redonda', 'Redonda'], ['hex', 'Hexagonal'], ['oct', 'Octogonal']]), n('D', 'Ancho (por fuera)', 80, 40, 200, 1), n('H', 'Alto de la caja', 60, 20, 200, 1),
    n('pared', 'Pared', 2.4, 1.6, 4, 0.2), c('candado', 'Con orejas para candado o precinto', true), c('junta', 'Con ranura de junta (estanca, aro de TPU)', false), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (el cuello y la falda: 10 mm)', false)],
  gen(p) {
    const w = p.pared, R = p.D / 2, nLados = { redonda: 0, hex: 6, oct: 8 }[p.forma], perfil = r => (nLados ? N.cs([N.poligono2(nLados, 2 * r / Math.cos(Math.PI / nLados), 180 / nLados)], 'Positive') : circ(2 * r));
    const Rc = R - w - 1.6, Hc = 10, aire = GI + 0.05, Hb = p.prueba ? Hc + 2 : p.H, tT = 2.4, lugH = 2.2, lugW = Math.min(9, Rc * 0.35), lugT = 1.4, giro = 30;
    if (Rc < 12) N.mal('Demasiado pequeña para una bayoneta: hazla de 40 mm o más.');
    // la caja: el cuerpo con su forma y, arriba, el CUELLO redondo (más estrecho) con 3 tetones hacia fuera
    // el hueco de dentro: del ancho de la caja y, antes del cuello, una rampa de 45° hasta el ancho del cuello (sin voladizos)
    const zRampa = Math.max(2, Hb - Hc - (R - Rc)), hueco = p.prueba ? cil(2 * (Rc - w), Hb + 2, -1) : N.union([perfil(R - w).extrude(zRampa - 2 + 0.01).translate([0, 0, 2]), M().cylinder(R - Rc + 0.02, R - w, Rc - w, seg(2 * R)).translate([0, 0, zRampa]), cil(2 * (Rc - w), Hc + 2, Hb - Hc)]);
    let cuerpo = perfil(R).extrude(Hb - Hc).add(cil(2 * Rc, Hc, Hb - Hc - 0.01)).subtract(hueco);
    const zL = Hb - Hc + 2.5; for (let i = 0; i < 3; i++) cuerpo = cuerpo.add(caja(lugT + 0.6, lugW, lugH, Rc + lugT / 2 - 0.3, 0, zL).rotate([0, 0, i * 120]));
    const jR0 = Rc - w + 0.5, jR1 = Rc - 0.5; let junta = null;
    if (p.junta && !p.prueba) { cuerpo = cuerpo.subtract(cil(2 * jR1, 1.2 + 0.01, Hb - 1.2).subtract(cil(2 * jR0, 2, Hb - 1.5))); junta = cil(2 * (jR1 - 0.1), 1.6).subtract(cil(2 * (jR0 + 0.1), 2, -0.1)); } // (la junta: 1,6 de alto en una ranura de 1,2: sobresale 0,4 y la aprieta la tapa)
    // la tapa (dibujada en su sitio, cerrada): techo + falda; en la falda, por dentro, 3 canales en L: baja y gira 30° hacia el clic
    const Rf = Rc + aire + lugT + 0.4, faldaE = Math.max(w, 1.8), Rt = Math.max(R, Rf + faldaE);
    let tapa = perfil(Rt).extrude(tT).translate([0, 0, Hb]).add(cil(2 * Rt, Hc - 0.2, Hb - Hc + 0.2).intersect(perfil(Rt).extrude(Hb + 1))).subtract(cil(2 * (Rc + aire), Hc + 1, Hb - Hc - 0.5));
    const anchoCanal = lugW + 2 * aire + 0.4, altoCanal = lugH + 2 * aire + 0.2, rCan = Rc + lugT + aire + 0.2;
    for (let i = 0; i < 3; i++) {
      const a0 = i * 120 - giro; // (cerrada: el tetón está al FINAL del canal)
      const bajada = caja(rCan - Rc + 0.5, anchoCanal, Hc + 1, (Rc + rCan) / 2, 0, zL - aire - 0.1).rotate([0, 0, a0]); // canal vertical desde abajo hasta la altura del tetón
      const arco = []; for (let a = a0; a <= i * 120 + 0.01; a += 3) arco.push(caja(rCan - Rc + 0.5, anchoCanal, altoCanal, (Rc + rCan) / 2, 0, zL - aire - 0.1).rotate([0, 0, a]));
      tapa = tapa.subtract(bajada.intersect(cil(2 * rCan, zL + altoCanal - 0.1 - (Hb - Hc), Hb - Hc - 1))).subtract(N.union(arco));
      // el CLIC: un bultito de 0,5 mm en el suelo del canal, justo antes del final
      const aClic = (lugW / 2 + 0.8 + 0.7) / ((Rc + rCan) / 2) * 180 / Math.PI; // (justo pasado el borde del tetón cerrado)
      tapa = tapa.add(cil(1.6, 0.5, zL - aire - 0.1 - 0.01).translate([(Rc + rCan) / 2, 0, 0]).rotate([0, 0, i * 120 - aClic]).intersect(cil(2 * rCan, Hb, 0)).subtract(cil(2 * (Rc + aire), Hb + 2, 0)));
    }
    if (p.candado && !p.prueba) { // dos orejas alineadas al cerrar (una en la caja, otra en la tapa) con agujero de 5 mm
      const ore = (z0, h) => M().hull([cil(10, h).translate([Rt + 4, 0, z0]), caja(2, 14, h, Rt - 2, 0, z0)]).subtract(cil(5.2, h + 2, z0 - 1).translate([Rt + 4.5, 0, 0]));
      const sale = Rt + 9 - R, z0 = Hb - Hc - 4.5; // (la de la caja, con una cartela a 45° por debajo: sin soportes)
      cuerpo = cuerpo.add(ore(z0, 4).add(M().hull([caja(Rt + 9 - (R - 1), 10, 0.4, (Rt + 9 + R - 1) / 2, 0, z0), caja(1, 10, 0.4, R - 0.5, 0, Math.max(0, z0 - sale - 1))]).subtract(cil(5.2, 50, z0 - 40).translate([Rt + 4.5, 0, 0])))); tapa = tapa.add(ore(Hb + tT - 4, 4));
    }
    if (p.__piezas) return { cuerpo, tapa, junta };
    if (p.prueba) { const corte = z0 => caja(4 * R, 4 * R, Hc + tT + 4, 0, 0, z0); return N.union(enFila([cuerpo.intersect(corte(Hb - Hc - 2)), tapa.intersect(corte(Hb - Hc - 2)).mirror([0, 0, 1])], 8)); }
    return N.union(enFila([cuerpo, tapa.mirror([0, 0, 1])].concat(junta ? [junta] : []), 8));
  },
  nota: p => (p.prueba ? PRUEBA + 'mete la falda en el cuello, baja y gira: tiene que hacer CLIC al final y no abrirse sola. ' : '') + 'Caja ' + ({ redonda: 'redonda', hex: 'hexagonal', oct: 'octogonal' }[p.forma]) + ' de ' + n2(p.D) + ' × ' + n2(p.H) + ' mm con cierre de BAYONETA (3 tetones protegidos dentro de la falda): baja la tapa, gira 30° hasta el clic.'
    + (p.candado ? ' Al cerrarla, las dos orejas quedan alineadas: un candado pequeño o un precinto (agujero de 5 mm) y ya no gira.' : '') + (p.junta ? ' Con JUNTA: el aro fino sale aparte (imprímelo en TPU) y va en la ranura del borde del cuello; al cerrar, la tapa lo aprieta: estanca.' : '') + ' Caja de pie y tapa del revés: sin soportes.' };

// ======================= 🏁 CHASIS BUGGY 2WD (bañera con motor atrás) =======================
DC.chasisBuggy = { cat: 'rc', tambien: ['pro'], e: '🏁', t: 'Chasis de buggy 2WD (motor atrás)', d: 'Bañera con bandeja de batería, hueco de servo y soporte de motor 540 con ranuras', uso: 'pieza', color: '#3d4048', nuevo: true,
  campos: [n('L', 'Largo', 300, 160, 380, 1), n('A', 'Ancho', 100, 60, 140, 1), n('bat', 'Batería: largo', 138, 60, 160, 1), n('batA', 'Batería: ancho', 47, 25, 60, 0.5), s('servo', 'Servo de dirección', 'estandar', [['estandar', 'Estándar (40 × 20)'], ['bajo', 'Perfil bajo (40 × 20)'], ['micro', 'Micro (23 × 12)']]),
    n('g', 'Grosor del suelo', 3.5, 2.5, 6, 0.5), c('prueba', '🧪 Solo la PRUEBA (la esquina trasera con el soporte del motor, 2 mm)', false)],
  gen(p) {
    const L = p.L, A = p.A, g = p.prueba ? 2 : p.g, alto = 10, pared = 2.4;
    let suelo = rr(L, A, 14).extrude(g);
    // paredes laterales bajas y el morro levantado (escalón de 6 mm: sin soportes)
    let bañera = rr(L, A, 14).subtract(rr(L - 2 * pared, A - 2 * pared, 12)).extrude(alto).translate([0, 0, g]).add(suelo);
    // bandeja de batería (en el lado izquierdo) con ranuras para la cinta, y el hueco del servo delante
    const bx = -L * 0.05, by = -A / 2 + pared + p.batA / 2 + 4; bañera = bañera.add(rr(p.bat + 4, p.batA + 4, 2).subtract(rr(p.bat + 2 * J, p.batA + 2 * J, 1)).extrude(4).translate([bx, by, g]));
    [-1, 1].forEach(sg => { bañera = bañera.subtract(caja(3, 22, g + 2, bx + sg * p.bat * 0.3, by, -1)); });
    const S = SERVOS[p.servo] || SERVOS.estandar; bañera = bañera.subtract(caja(S.L + 2 * J, S.A + 2 * J, g + 2, L / 2 - 50, 0, -1));
    [-1, 1].forEach(sg => { bañera = bañera.subtract(cil(S.tor, g + 2, -1).translate([L / 2 - 50 + sg * S.sep / 2, 0, 0])); });
    // soporte del motor 540 detrás (ranuras de 25 mm, 6 mm de recorrido) y el agujero del eje; rejilla de agujeros M3 de 10 mm para los mamparos
    const mx = -L / 2 + 34; let mot = caja(10, 50, 40, mx, A / 2 - pared - 30, g);
    const ran = (y, z, d) => M().hull([cil(d, 12).rotate([0, 90, 0]).translate([mx - 6, y, z - 3]), cil(d, 12).rotate([0, 90, 0]).translate([mx - 6, y, z + 3])]);
    mot = mot.subtract(ran(A / 2 - pared - 30 - 12.5, g + 22, 3.3)).subtract(ran(A / 2 - pared - 30 + 12.5, g + 22, 3.3)).subtract(ran(A / 2 - pared - 30, g + 22, 13.4));
    bañera = bañera.add(mot);
    for (const x of [L / 2 - 14, L / 2 - 24, -L / 2 + 14, -L / 2 + 64]) for (const y of [-20, -10, 10, 20]) bañera = bañera.subtract(cil(3.3, g + 2, -1).translate([x, y, 0]));
    // aligerado: ventanas en el suelo donde no hay nada
    for (let i = 0; i < 3; i++) bañera = bañera.subtract(rr(20, A * 0.3, 6).extrude(g + 2).translate([L * 0.18 + i * 26 - 20, A * 0.22, -1]));
    if (p.prueba) return bañera.intersect(caja(80, A + 2, 60, -L / 2 + 38, 0, -1));
    return bañera;
  },
  nota: p => (p.prueba ? PRUEBA + 'atornilla TU motor 540 en el soporte (ranuras de 25 mm) y mira que el engrane se ajusta. ' : '') + 'Bañera de ' + n2(p.L) + ' × ' + n2(p.A) + ' mm: bandeja para batería de ' + n2(p.bat) + ' × ' + n2(p.batA) + ' con ranuras para la cinta, hueco del servo, soporte de motor 540 con ranuras de ajuste y rejilla de agujeros M3 cada 10 mm para tus mamparos y trapecios. ' + (p.L > 250 ? 'Con ' + n2(p.L) + ' mm no cabe en la A1 mini (180): en la P1P, o en diagonal.' : '') + ' PETG o PA, sin soportes.' };

export const DISENOS_51 = DC;
