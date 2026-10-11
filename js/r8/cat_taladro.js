// ================= v30.5 · 🔩 MINI TALADRO DE COLUMNA (para tu multiherramienta o tu taladro de mano pequeño) y portarrollos 1:12 =================
// La dueña mandó de referencia un «compact drilling machine» de MakerWorld (solo para mirar: licencia de uso personal; ni una malla
// copiada). Este es nuestro: COLUMNA con CREMALLERA de evolvente (la del módulo de engranajes del programa), CARRO que sube y baja
// con un PIÑÓN y una MANETA, ABRAZADERA a la medida de tu herramienta, FRENO y BASE con ranuras para sujetar la pieza.
//  · La columna se imprime TUMBADA de lado: el perfil de los dientes sale en el plano de la cama (lo más preciso) y las capas
//    van a lo largo (lo más fuerte). Lleva dos ranuras-guía en los costados: el carro tiene dos nervios que corren por ellas,
//    así no puede salirse hacia atrás.
//  · El carro, de pie: el hueco de la columna, los nervios y la abrazadera son paredes verticales (sin soportes).
//  · El piñón (12 dientes, módulo 1,5, con desplazamiento de perfil para que no quede socavado) gira con un eje HEXAGONAL
//    impreso tumbado; la maneta y la tapa entran a presión en el hexágono.
// Marco montado: Z arriba (la columna), −Y hacia delante (la herramienta), X a lo ancho (el eje del piñón).
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';
import { AYUDAS as A } from './cat_utiles.js';
import * as G from './engranajes.js';

const { n, s, c, M, seg, circ, rr, poli, cil, caja, n2, R2, enRejilla, conBisel, hex } = A;
const TAL = { m: 1.5, z: 12, x: 0.3, cw: 22, cd: 16, ws: 5, wf: 5, Hc: 56, hexE: 8, juego: 0.2, guia: 3, guiaH: 2, espiga: 30 };
const cilX = (d, x0, x1, y, z) => M().cylinder(x1 - x0, d / 2, d / 2, seg(d)).rotate([0, 90, 0]).translate([x0, y, z]);
function taladroPiezas(p) {
  const { m, z, x, cw, cd, ws, wf, Hc, hexE, espiga } = TAL, d = Math.max(20, p.herramienta), Lc = Math.max(120, Math.min(248, p.columna)), paso = Math.PI * m, hf = 1.25 * m, rp = m * z / 2, h = 0.2;
  // ---- COLUMNA (como se imprime: X a lo largo, Y el fondo con los dientes hacia +Y, Z el ancho) ----
  const nD = Math.floor((Lc - espiga - 8) / paso), Lr = nD * paso, CR = G.cremallera({ por: 'modulo', m, alfa: 20, n: nD, b: cw, fondo: cd, juego: TAL.juego / 2 });
  // (la cremallera viene centrada en X, con la línea primitiva en y = 0: su cuerpo va de y = −hf − cd a −hf)
  let col = CR.m.translate([espiga + Lr / 2, hf + cd, 0]).add(M().cube([espiga + 0.01, cd, cw]).translate([0, 0, 0])).add(M().cube([Lc - espiga - Lr + 0.01, cd, cw]).translate([espiga + Lr - 0.01, 0, 0]));
  const yG = cd * 0.42, ranG = M().cube([Lc - espiga + 2, TAL.guia, TAL.guiaH + 0.01]); // ranuras-guía (de la espiga hacia arriba)
  col = col.subtract(ranG.translate([espiga, yG - TAL.guia / 2, -0.01])).subtract(ranG.translate([espiga, yG - TAL.guia / 2, cw - TAL.guiaH]));
  [14, 24].forEach(u => { col = col.subtract(cil(4.4, cw + 2, -1).translate([u, cd / 2, 0])); }); // dos tornillos M4 la fijan a la base
  // montada: X(largo) → Z, Y(fondo) → Y (dientes hacia atrás, +Y), Z(ancho) → X; el centro de su sección en x = 0, y = 0
  const colDePie = (dz = 0) => col.translate([0, -cd / 2, -cw / 2]).rotate([0, -90, 0]).translate([0, 0, dz]); // (x, y, z) → (−z, y, x)
  // ---- CARRO (de pie) ----
  const yP = cd / 2 + hf, yC = yP + rp + x * m, zC = Hc / 2, hol = 0.2, wi = cw + 2 * hol, yAtras = yC + hexE * 0.9, yDel = -cd / 2 - hol - wf;
  let carro = M().cube([wi + 2 * ws, yAtras - yDel, Hc]).translate([-(wi / 2 + ws), yDel, 0]).subtract(M().cube([wi, yAtras - (-cd / 2 - hol) + 1, Hc + 2]).translate([-wi / 2, -cd / 2 - hol, -1]));
  // nervios que corren por las ranuras-guía de la columna (y aligerar: una ventana para ver los dientes)
  const yGm = -cd / 2 + yG; [-1, 1].forEach(k => { carro = carro.add(M().cube([TAL.guiaH - 0.3 + hol, TAL.guia - 0.5, Hc]).translate([k > 0 ? wi / 2 - (TAL.guiaH - 0.3 + hol) : -wi / 2, yGm - (TAL.guia - 0.5) / 2, 0])); });
  // eje del piñón: agujero redondo donde gira el hexágono (entre caras 8 → entre esquinas 9,24)
  const dEje = hexE / Math.cos(30 * R2) + 0.4; carro = carro.subtract(cilX(dEje, -wi / 2 - ws - 1, wi / 2 + ws + 1, yC, zC));
  // freno: un tornillo M4 que se rosca en el costado y aprieta la columna
  carro = carro.subtract(cilX(3.5, wi / 2 - 1, wi / 2 + ws + 1, -cd / 2 + 3.2, Hc * 0.8));
  // abrazadera de la herramienta: aro partido delante, con dos orejas y su tornillo M4 con tuerca
  const wr = 5, hA = Math.min(Hc, 40), yT = yDel - d / 2 - 0.6, ore = 12;
  let aro = circ(d + 2 * wr + 0.4).translate([0, yT]).add(rr(ore * 2 + 3, 11, 2).translate([0, yT - d / 2 - wr - 3.5])).add(rr(Math.min(d, wi + 2 * ws), d / 2 + 1).translate([0, yT + d / 4 + 0.5]));
  aro = aro.subtract(circ(d + 0.4).translate([0, yT])).subtract(rr(3, 22).translate([0, yT - d / 2 - 6]));
  let abr = aro.extrude(hA).subtract(M().cube([wi + 2 * ws + 10, yAtras - yDel + 0.01, Hc + 2]).translate([-(wi / 2 + ws + 5), yDel + 0.01, -1]).subtract(M().cube([wi + 2 * ws, 20, Hc + 4]).translate([-(wi / 2 + ws), yDel - 0.02, -2])));
  const yO = yT - d / 2 - wr - 4.2; abr = abr.subtract(cilX(4.4, -30, 30, yO, hA / 2)).subtract(hex(7.2).extrude(4).rotate([0, 90, 0]).translate([ore + 1.5 - 3.2, yO, hA / 2]));
  carro = carro.add(abr.subtract(M().cube([wi, cd + 2 * hol, Hc + 4]).translate([-wi / 2, -cd / 2 - hol, -2])));
  // ---- PIÑÓN, EJE HEXAGONAL, MANETA Y TAPA ----
  const ancho = cw - 1, PE = G.perfilEngranaje2D({ z, por: 'modulo', m, alfa: 20, x, juego: TAL.juego / 2, b: ancho });
  const pinon = PE.cs.subtract(hex(hexE + 2 * ENCAJES.justo)).extrude(ancho);
  const lEje = wi + 2 * ws + 16.5, ejeHex = hex(hexE).extrude(lEje).rotate([90, 0, 0]).translate([0, lEje / 2, hexE / 2]); // tumbado sobre una cara
  const brazo = k => N.CSX().hull([circ(12), circ(15).translate([27, 0])]).rotate(k * 120);
  const maneta = conBisel(N.csUnion([circ(20), brazo(0), brazo(1), brazo(2)]).subtract(hex(hexE + 2 * ENCAJES.presion)), 11, 1.5);
  const tapa = conBisel(circ(16), 5.5, 1).subtract(hex(hexE + 2 * ENCAJES.presion).extrude(6).translate([0, 0, 1.2]));
  // ---- BASE: placa con el zócalo de la columna detrás, agujero bajo la broca y ranuras para sujetar la pieza ----
  const bx = Math.max(130, d + 80), yEje = yT, by0 = yEje - Math.max(60, d * 0.9 + 30), by1 = cd / 2 + 12, gB = 8, hZ = espiga;
  let base = conBisel(rr(bx, by1 - by0, 10).translate([0, (by0 + by1) / 2]), gB, 1);
  base = base.add(rr(cw + 18, cd + 16, 3).translate([0, 0]).extrude(hZ)).subtract(M().cube([cw + 2 * 0.12, cd + 2 * 0.12, hZ + 2]).translate([-cw / 2 - 0.12, -cd / 2 - 0.12, -1]));
  [14, 24].forEach(u => { base = base.subtract(cilX(4.4, -cw / 2 - 12, cw / 2 + 12, 0, u)); });
  base = base.subtract(cil(12, gB + 2, -1).translate([0, yEje, 0]));
  const RN = []; [-1, 1].forEach(k => { RN.push(poli(N.ranura2(Math.abs(by0 - yEje) * 1.25, 5.4)).rotate(90).translate([k * Math.min(bx / 2 - 14, d / 2 + 18), yEje - 4])); }); RN.push(poli(N.ranura2(bx * 0.5, 5.4)).translate([0, by0 + 12]));
  base = base.subtract(N.csUnion(RN).extrude(gB + 2).translate([0, 0, -1]));
  // ---- MONTADO (para verlo y para comprobarlo) ----
  const zCarro = espiga + 40, pinonEn = (ang, zc) => pinon.translate([0, 0, -ancho / 2]).rotate([0, 0, ang]).rotate([0, 90, 0]).translate([0, yC, zc + zC]);
  const montaje = (zc, fase = 0) => [base, colDePie(0), carro.translate([0, 0, zc]), pinonEn(fase, zc), hex(hexE).extrude(lEje).rotate([0, 0, fase]).rotate([0, 90, 0]).translate([-(wi / 2 + ws) - 4.5, yC, zc + zC]),
    maneta.rotate([0, 0, fase]).rotate([0, 90, 0]).translate([wi / 2 + ws + 1, yC, zc + zC]), tapa.rotate([0, 0, fase]).rotate([0, 90, 0]).translate([-(wi / 2 + ws) - 0.3 - 5.5, yC, zc + zC])];
  const piezas = [['Base', base], ['Columna', col], ['Carro', carro], ['Piñón', pinon], ['Eje hexagonal', ejeHex], ['Maneta', maneta], ['Tapa del eje', tapa]];
  return { piezas, montaje, col, colDePie, carro, pinonEn, zC, yC, rp, paso, Lc, Lr, recorrido: Lr - Hc - 6, zCarro, d, base, yEje };
}
// ¿funciona? el carro corre por la columna sin rozar y no puede salirse hacia atrás; el piñón rueda por la cremallera sin pisarla
const _ct = new Map();
export function compruebaTaladro(p) {
  const k = JSON.stringify([p.herramienta, p.columna]); if (_ct.has(k)) return _ct.get(k);
  const r = N.enAmbito(() => { const T = taladroPiezas(p), col = T.colDePie(0); let roce = 0;
    [TAL.espiga + 2, TAL.espiga + T.recorrido / 2, TAL.espiga + T.recorrido].forEach(zc => { roce = Math.max(roce, T.carro.translate([0, 0, zc]).intersect(col).volume()); });
    const atras = T.carro.translate([0, 1.2, TAL.espiga + 40]).intersect(col).volume();
    // el piñón: se busca la fase en que engrana (la que menos pisa) y se le hace rodar: cada grado, el carro baja rp · ángulo
    const zc0 = TAL.espiga + 40; let fase = 0, mejor = Infinity; for (let i = 0; i < 24; i++) { const a = i * 360 / TAL.z / 24, v = T.pinonEn(a, zc0).intersect(col).volume(); if (v < mejor) { mejor = v; fase = a; } }
    let engrana = 0; for (let g = 0; g <= 60; g += 5) engrana = Math.max(engrana, T.pinonEn(fase + g, zc0 + T.rp * g * Math.PI / 180).intersect(col).volume());
    const suelto = T.pinonEn(fase + 6, zc0).intersect(col).volume(); // girarlo SIN mover el carro tiene que chocar: es que los dientes están cogidos
    const pisa = (() => { const Mo = T.montaje(zc0, fase); let v = 0; for (let i = 0; i < Mo.length; i++) for (let j = i + 1; j < Mo.length; j++) { if ((i === 1 && j === 3) || (i === 3 && j === 4) || (i === 4 && j >= 5)) continue; v = Math.max(v, Mo[i].intersect(Mo[j]).volume()); } return v; })();
    return { roce, atras, engrana, suelto, pisa, recorrido: T.recorrido, fase }; });
  if (_ct.size > 12) _ct.clear(); _ct.set(k, r); return r;
}

// ---------- 🧻 PORTARROLLOS DE COCINA EN MINIATURA (casa de muñecas) ----------
function portarrollos(p) {
  const k = { '12': 1, '6': 2, '24': 0.5 }[p.escala] || 1, dB = 13 * k, hB = 1.6 * Math.max(0.8, k), dP = Math.max(1.8, 2.6 * k), hP = 23 * k, dR = 10 * k, hR = 19.5 * k, ov = Math.max(0.35, 0.8 * k), dBola = dP + 2 * ov, paso = dBola + 0.7; // el rollo pasa por la bola con 0,35 de aire por lado
  const pie = N.CSX().ofPolygons([N.ccw([[0, 0], [dB / 2, 0], [dB / 2, hB * 0.6], [dB / 2 - hB * 0.4, hB], [dP / 2, hB], [dP / 2, hB + hP], [dBola / 2, hB + hP + 1.2 * k], [dBola / 2, hB + hP + 2 * k], [0, hB + hP + 3.4 * k]])]).revolve(64);
  const hojas = []; for (let i = 0; i < 40; i++) hojas.push(rr(0.5, 0.5, 0).translate([dR / 2, 0]).rotate(i * 9));
  const rollo = circ(dR).subtract(N.csUnion(hojas)).subtract(circ(paso)).extrude(hR);
  return { pie, rollo, k, dB, alto: hB + hP + 3.4 * k };
}

export const DISENOS_TALADRO = {
  miniTaladro: { cat: 'taller', tambien: ['mecanica'], e: '🔩', t: 'Mini taladro de columna (para tu multiherramienta)', d: 'Columna con cremallera, carro con piñón y maneta, abrazadera a tu medida, freno y base con ranuras', uso: 'mecanica', color: '#ff6a13',
    campos: [s('que', 'Qué imprimo', 'cama1', [['cama1', 'Cama 1: la base'], ['cama2', 'Cama 2: columna, carro, piñón, eje, maneta y tapa'], ['montado', '👀 Verlo montado (solo para mirar)']]), n('herramienta', 'Diámetro del cuerpo de TU herramienta donde la abraza (mídelo)', 43, 20, 60, 0.1), n('columna', 'Largo de la columna', 200, 120, 248, 1)],
    gen(p) { const T = taladroPiezas(p); if (p.que === 'montado') { let fase = 0; try { fase = compruebaTaladro(p).fase; } catch (e) { } return N.union(T.montaje(T.zCarro, fase)); } if (p.que === 'cama1') return T.piezas[0][1]; return enRejilla(T.piezas.slice(1).map(x => x[1]), 240, 6); },
    nota: p => { let R = null; try { R = compruebaTaladro(p); } catch (e) { return '⚠️ ' + e.message; }
      if (p.que === 'montado') return '👀 Esto es solo para VERLO montado. Para imprimir elige «Cama 1» y luego «Cama 2».';
      const bien = R.roce < 0.01 && R.atras > 0.01 && R.engrana < 0.02 && R.suelto > 0.05 && R.pisa < 0.01;
      return (bien ? 'COMPROBADO (en el ordenador): el carro corre por la columna sin rozar y no puede salirse hacia atrás (dos nervios en sus ranuras); el piñón rueda 60° por la cremallera sin pisarla y, si lo giras sin que el carro baje, choca: los dientes van cogidos' : '⚠️ Algo no casa (roce ' + n2(R.roce) + ', engrane ' + n2(R.engrana) + ', piezas ' + n2(R.pisa) + ' mm³): vuelve a las medidas de serie') + '. Recorrido: ' + n2(R.recorrido) + ' mm (' + n2(Math.PI * TAL.m * TAL.z) + ' mm por vuelta de maneta). '
        + 'La abrazadera es para un cuerpo de Ø' + n2(p.herramienta) + ' mm: MIDE tu herramienta con el pie de rey donde la va a coger. TORNILLOS (no se imprimen): 2 × M4 × 35 con tuerca para fijar la columna a la base, 1 × M4 × 25 con tuerca para la abrazadera y 1 × M4 × 12 que se rosca en el costado del carro y hace de FRENO (apriétalo lo justo para que el carro no baje solo). '
        + 'CÓMO SE IMPRIME: la columna TUMBADA de lado, como sale (los dientes quedan perfectos y es lo más fuerte); el carro de pie; el eje hexagonal, tumbado. En PETG, 4 paredes y 40 % de relleno. Maneta y tapa entran a presión en el hexágono. Es para taladrar placas, madera fina y plástico con brocas pequeñas: es de plástico y cede si aprietas; para metal, un taladro de columna de verdad.'; } },
  portarrollosMini: { cat: 'miniaturas', e: '🧻', t: 'Portarrollos de cocina en miniatura', d: 'Para la casa de muñecas: el pie con su bola y el rollo, que se saca', uso: 'deco', color: '#f4f4f0',
    campos: [s('escala', 'Escala', '12', [['12', '1:12 (casa de muñecas)'], ['6', '1:6 (muñecas tipo Barbie)'], ['24', '1:24']]), s('que', 'Qué imprimo', 'todo', [['todo', 'El pie y el rollo'], ['pie', 'Solo el pie'], ['rollo', 'Solo el rollo']])],
    gen(p) { const P = portarrollos(p); return p.que === 'pie' ? P.pie : p.que === 'rollo' ? P.rollo : P.pie.add(P.rollo.translate([P.dB + 3, 0, 0])); },
    nota: p => { const k = { '12': 1, '6': 2, '24': 0.5 }[p.escala] || 1; return 'Dos piezas: el pie (' + n2(13 * k) + ' mm de base y ' + n2((1.6 * Math.max(0.8, k)) + 23 * k + 3.4 * k) + ' de alto, con su bola arriba) y el rollo de papel de cocina, que entra por arriba y se saca. Imprime el pie en un color (madera, negro, metal) y el rollo en blanco. Con capa de 0,12 sale fino; de pie, como sale, sin soportes.'; } },
};
