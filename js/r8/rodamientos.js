// ================= v20.2 · 🛞 CelebriR8 · RODAMIENTOS QUE FUNCIONAN EN PLÁSTICO =================
// La dueña (10-10-2026): «plantilla de rodamientos funcionales, sabiendo que se imprime en plástico: ojo con eso y sé perfeccionista».
// Un rodamiento metido en plástico impreso NO es como en metal: el agujero sale algo más pequeño (y nunca redondo del todo), el
// plástico cede con el tiempo y con el calor, y si aprieta de más, RAJA la pieza. Por eso el ASIENTO lleva:
//  · COSTILLAS que se aplastan (opcional, lo recomendado): el hueco es holgado («gira») y solo unas costillas finas aprietan; se
//    aplastan al meterlo y absorben los errores de la impresora sin rajar. O LISO: todo el contorno a tu medida «a presión».
//  · CHAFLÁN DE ENTRADA (0,5 mm a 45°): entra centrado y sin «pelar» la boca (y compensa la pata de elefante si va hacia la cama).
//  · ALIVIO en el fondo: una ranurita de 0,3 mm para que la esquina redondeada que deja la impresora no impida que asiente.
//  · TOPE que apoya SOLO EL ARO DE FUERA: el agujero del tope deja libre el aro de dentro y la tapa (si rozaran, frena).
//  · PROFUNDIDAD a CAPAS ENTERAS: queda a ras o un pelo hundido (nunca sobresale), y el agujero del tope sirve para SACARLO empujando.
// Medidas de los rodamientos: las del catálogo (ISO, series 6xx, 6700/6800/6900 y miniatura MR). Los blindados (ZZ / 2RS) de algunos
// miniatura son más ANCHOS que los abiertos: mide el tuyo con el calibre (se puede poner a medida).
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';

// interior × exterior × ancho (mm)
export const RODAMIENTOS = {
  'MR52 · 2×5×2,5': [2, 5, 2.5], 'MR63 · 3×6×2,5': [3, 6, 2.5], 'MR74 · 4×7×2,5': [4, 7, 2.5], '683 · 3×7×3': [3, 7, 3], 'MR83 · 3×8×3': [3, 8, 3], '693 · 3×8×4': [3, 8, 4],
  'MR84 · 4×8×3': [4, 8, 3], 'MR85 · 5×8×2,5': [5, 8, 2.5], '684 · 4×9×4': [4, 9, 4], 'MR95 · 5×9×3': [5, 9, 3], '623 · 3×10×4': [3, 10, 4], 'MR105 · 5×10×4': [5, 10, 4],
  'MR106 · 6×10×3': [6, 10, 3], '694 · 4×11×4': [4, 11, 4], 'MR115 · 5×11×4': [5, 11, 4], '685 · 5×11×5': [5, 11, 5], 'MR117 · 7×11×3': [7, 11, 3], 'MR126 · 6×12×4': [6, 12, 4],
  'MR128 · 8×12×3,5': [8, 12, 3.5], '624 · 4×13×5': [4, 13, 5], '695 · 5×13×4': [5, 13, 4], 'MR137 · 7×13×4': [7, 13, 4], 'MR148 · 8×14×4': [8, 14, 4], '605 · 5×14×5': [5, 14, 5],
  '6700 · 10×15×4': [10, 15, 4], '625 · 5×16×5': [5, 16, 5], '688 · 8×16×5': [8, 16, 5], '689 · 9×17×5': [9, 17, 5], '6701 · 12×18×4': [12, 18, 4], '626 · 6×19×6': [6, 19, 6],
  '6800 · 10×19×5': [10, 19, 5], '13×19×4 (RC)': [13, 19, 4], '6801 · 12×21×5': [12, 21, 5], '608 · 8×22×7': [8, 22, 7], '627 · 7×22×7': [7, 22, 7], '6900 · 10×22×6': [10, 22, 6],
  '609 · 9×24×7': [9, 24, 7], '6901 · 12×24×6': [12, 24, 6], '6000 · 10×26×8': [10, 26, 8], '6001 · 12×28×8': [12, 28, 8] };
export const OPS_RODAMIENTOS = Object.keys(RODAMIENTOS).map(k => [k, k.replace(/·/, '—')]).concat([['medida', '✏️ A medida (mídelo)']]);
export function medidasRod(p, pre = '') { // [d, D, B] de la tabla o a medida
  const k = p[pre + 'rod'];
  if (k === 'medida') { const d = Number(p[pre + 'rodD_int']), D = Number(p[pre + 'rodD_ext']), B = Number(p[pre + 'rodB']); if (!(d > 0 && D > d + 1 && B > 0.5)) N.mal('Pon las medidas del rodamiento: interior, exterior (más grande) y ancho.'); return [d, D, B]; }
  return RODAMIENTOS[k] || N.mal('No conozco ese rodamiento.');
}
const seg = d => 4 * Math.max(16, Math.round(d * 5 / 4)); // círculos finos (que el STL no «aplane» el ajuste)
const M = () => N.MF();
const cilZ = (r, z0, z1, s) => M().cylinder(z1 - z0, r, r, s || seg(2 * r)).translate([0, 0, z0]);
const conoZ = (r0, r1, z0, z1, s) => M().cylinder(z1 - z0, r0, r1, s || seg(2 * Math.max(r0, r1))).translate([0, 0, z0]);
export const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');

// ---------- EL ASIENTO: el hueco que hay que RESTAR a la pieza (eje Z; z = 0 la cara de abajo de la pieza, z = grosor la de arriba) ----------
// o = { d, D, B, grosor, modo: 'costillas' | 'liso', extra (mm por lado: MÁS apriete que tu «a presión»; − = más suelto), capa, sinTope }
export function asiento(o) {
  const { d, D, B } = o, capa = o.capa || 0.16, hp = ENCAJES.presion, hg = ENCAJES.gira, extra = Number(o.extra) || 0, c = Math.min(0.5, D * 0.04 + 0.1);
  const prof = Math.ceil((B - 1e-6) / capa) * capa, grosor = o.grosor || prof + 1.2, base = grosor - prof;
  if (base < 0.6 - 1e-9) N.mal('La pieza es demasiado fina para un rodamiento de ' + n2(B) + ' mm: necesita al menos ' + n2(prof + 0.6) + ' mm (el rodamiento a capas enteras + 0,6 de tope).');
  const anillo = (D - d) / 2, tope = D - 2 * Math.max(0.5, 0.22 * anillo); // el tope apoya SOLO en el aro de fuera
  const costillas = o.modo === 'costillas', Rp = costillas ? D / 2 + hg : D / 2 + hp - extra, Rtip = D / 2 + hp - extra;
  if (costillas && Rtip >= Rp - 0.02) N.mal('Con ese apriete las costillas no tocan el rodamiento: pon más apriete.');
  let h = cilZ(Rp, base, grosor + 0.5)
    .add(conoZ(Rp, Rp + c, grosor - c, grosor + 0.001)).add(cilZ(Rp + c, grosor, grosor + 0.5)) // chaflán de entrada
    .add(cilZ(Rp + 0.2, base, base + 0.3)); // alivio del fondo
  if (!o.sinTope) h = h.add(cilZ(tope / 2, -0.5, base + 0.01)); // el tope (y por donde se empuja para sacarlo)
  let nCost = 0;
  if (costillas) { // las costillas: medias cañas verticales que se quedan en la pared (desde encima del alivio hasta debajo del chaflán)
    nCost = D <= 12 ? 6 : D <= 20 ? 8 : 10;
    const rr = Math.max(0.45, Math.min(0.8, D * 0.035)), z0 = base + 0.3, z1 = grosor - c, L = [];
    for (let i = 0; i < nCost; i++) { const a = (i + 0.5) * 2 * Math.PI / nCost; L.push(cilZ(rr, z0, z1, 16).translate([(Rtip + rr) * Math.cos(a), (Rtip + rr) * Math.sin(a), 0])); }
    h = h.subtract(M().union(L));
  }
  return { m: h, prof, base, grosor, tope, Rp, Rtip, chaflan: c, nCost, hundido: prof - B };
}

// ---------- v20.2.2 · EL NÚMERO DE TU PLANTILLA (la dueña: «cuando inicie que me lo pregunte y pongo el número») ----------
// Se guarda en este aparato por medida de rodamiento (y el último vale para los demás). Los diseños con ajuste «⭐ El de tu plantilla»
// lo usan solos; si aún no lo has dicho, el nº 3 (el de partida).
const LS_AJ = 'cd.r8.ajustesRod';
export const claveRod = (d, D, B) => [d, D, B].map(x => +Number(x).toFixed(2)).join('x');
export function ajustesGuardados() { try { return JSON.parse(localStorage.getItem(LS_AJ) || '{}') || {}; } catch (e) { return {}; } }
export function guardaAjuste(d, D, B, n, modo = 'costillas') {
  const A = ajustesGuardados(), k = claveRod(d, D, B), x = { n: Math.max(1, Math.min(5, Math.round(n))), modo, fecha: new Date().toISOString().slice(0, 10) };
  A[k] = x; A.ultimo = Object.assign({ rod: k }, x); try { localStorage.setItem(LS_AJ, JSON.stringify(A)); } catch (e) { } return x;
}
export function ajusteDe(d, D, B) { const A = ajustesGuardados(), x = A[claveRod(d, D, B)]; return x ? Object.assign({ propio: true }, x) : A.ultimo ? Object.assign({ propio: false }, A.ultimo) : null; }
// el apriete que toca: con «auto» (o sin decir), el de tu plantilla para esa medida; si no, el número elegido
export function ajusteParaDiseno(p, d, D, B, kModo = 'modoRod', kAj = 'ajusteRod') {
  const modo = p[kModo] === 'liso' ? 'liso' : 'costillas', g = ajusteDe(d, D, B);
  const auto = !p[kAj] || p[kAj] === 'auto', n = auto ? (g && g.modo === modo ? g.n : 3) : Number(p[kAj]);
  return { modo, n, extra: APRETES[modo][n - 1], deTuPlantilla: auto && !!(g && g.modo === modo), auto };
}
export const OPS_AJUSTE = [['auto', '⭐ El de tu plantilla (si no la has probado, el 3)'], ['1', '1 (el más suelto)'], ['2', '2'], ['3', '3 (el de partida)'], ['4', '4'], ['5', '5 (el más apretado)']];
export const textoAjuste = A => A.deTuPlantilla ? 'el nº ' + A.n + ' de TU plantilla' : A.auto ? 'el nº 3 de partida (aún no me has dicho el de tu plantilla)' : 'el nº ' + A.n;

// ---------- 🧪 LA PLANTILLA: 5 anillos con 5 apretes (marcados con 1 a 5 muescas) y, si quieres, 3 ejes de prueba ----------
export const APRETES = { costillas: [0, 0.05, 0.1, 0.15, 0.2], liso: [-0.1, -0.05, 0, 0.05, 0.1] }; // el nº 3 es el de partida (liso: justo tu «a presión»)
export function plantilla(p) {
  const [d, D, B] = medidasRod(p), modo = p.modo || 'costillas', capa = p.capa || 0.16, L = APRETES[modo], pared = 1.6;
  const prof = Math.ceil((B - 1e-6) / capa) * capa, grosor = prof + 0.8, piezas = []; // (tope de 0,8: para probar basta y pesa menos)
  try { localStorage.setItem('cd.r8.plantillaUltima', JSON.stringify({ rod: p.rod, d, D, B, modo })); } catch (e) { } // para preguntar luego por ESTA
  let x = 0;
  L.forEach((ex, i) => {
    const A = asiento({ d, D, B, grosor, modo, extra: ex, capa }), Ro = A.Rp + A.chaflan + pared;
    let anillo = cilZ(Ro, 0, grosor).subtract(A.m);
    const paso = 2.4 / Ro; // muescas de 1,2 mm de ancho con 1,2 mm de pared entre ellas (antes, en anillos pequeños, se tocaban y dejaban astillas sueltas)
    for (let k = 0; k <= i; k++) { const a = Math.PI / 2 + (k - i / 2) * paso; anillo = anillo.subtract(M().cube([2.0, 1.2, grosor + 1], true).rotate([0, 0, a * 180 / Math.PI]).translate([Ro * Math.cos(a), Ro * Math.sin(a), grosor / 2])); } // muescas: 1 a 5 (1 mm de hondo)
    piezas.push({ m: anillo.translate([x + Ro, 0, 0]), Ro, x0: x });
    x += 2 * Ro + 3;
  });
  let m = M().union(piezas.map(q => q.m));
  // la tira que los une (1 mm, por abajo), para que no se pierdan ni se mezclen
  m = m.add(M().cube([x - 3 - 2 * piezas[0].Ro + 2, 3, 1], false).translate([piezas[0].Ro - 1, -1.5 - piezas[0].Ro + 0.6, 0]));
  if (p.ejes) { // ejes de prueba para el aro de DENTRO: gira · justo · a presión (1, 2 y 3 muescas)
    ['gira', 'justo', 'presion'].forEach((k, i) => { const r = d / 2 - ENCAJES[k]; let e = cilZ(r, 0, B + 3).add(cilZ(r + 1.5, 0, 1.5)); for (let j = 0; j <= i; j++) e = e.subtract(M().cube([0.8, 1.2, 1.6], true).translate([r + 1.2 - 0.3, (j - i / 2) * 1.6, 0.8])); m = m.add(e.translate([piezas[i].x0 + piezas[i].Ro, -(piezas[0].Ro + r + 5), 0])); });
  }
  return { m, apretes: L, modo, prof, grosor };
}
