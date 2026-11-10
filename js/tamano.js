// ================= 04-11-2026 · 📏 TAMAÑO → PRECIO =================
// Biou: «cuando alguien me pide aumentar el tamaño en el cotizador, debe dejarme poner el producto y dar más tamaño: cuanto más
// tamaño, más precio… tengo que saber el precio para poder vender».
// Qué pasa de verdad al agrandar una pieza s veces en Bambu Studio (1,5 = 150 %):
//   · las paredes y los techos siguen igual de gruesos (2 paredes), pero cubren s² más superficie;
//   · el relleno llena s³ más volumen;
//   · salen s veces más capas (y cada capa cuesta unos segundos).
// Con la malla del archivo (STL / 3MF) se hace esa cuenta con estimarGramos y estimarHoras (las mismas de datos3d.js).
// Sin malla (un producto de tu ficha) se usa la regla media s^2,5: entre «todo pared» (s²) y «todo macizo» (s³).
// TODO es ESTIMADO: el número de verdad sale laminando la pieza a ese tamaño en Bambu Studio.
import { estimarGramos, estimarHoras } from './datos3d.js';
import { IMPRESORAS, cabeEn } from './cotizar.js'; // 10-11-2026: sus TRES impresoras (con la A1 nueva) salen de un solo sitio

// 10-11-2026: A1 mini (18 cm), P1P (23,6 cm útiles por su esquina prohibida; 25,6 de alto) y la A1 NUEVA (25,6 cm)
export const CAMAS = IMPRESORAS.map(I => ({ nombre: I.nombre, lado: Math.min(I.x, I.y), x: I.x, y: I.y, z: I.z }));
export const EXPONENTE = 2.5;
export const ATAJOS = [75, 100, 125, 150, 200];
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const num = v => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };

// «Que mida 20 cm de alto» → el % que hay que poner (la altura es Z, como en Bambu)
export function pctDesdeAlto(altoCm, zMm) {
  const a = num(altoCm), z = num(zMm);
  if (!(a > 0) || !(z > 0)) return null;
  return Math.round(a * 10 / z * 100);
}

// base: { gramos, horas (en horas), medidas: {x, y, z} en mm o null, volMm3, areaMm2, opc: {material, densidad, relleno, paredes, boquilla, capa} }
// pct: el tamaño en % (100 = como es). Devuelve gramos, horas y medidas a ese tamaño, de dónde sale la cuenta y en qué impresora cabe.
export function aTamano(base, pct) {
  const s = Math.min(1000, Math.max(10, num(pct) || 100)) / 100;
  const g0 = num(base && base.gramos), h0 = num(base && base.horas), opc = (base && base.opc) || {};
  const V = num(base && base.volMm3), A = num(base && base.areaMm2), m = base && base.medidas, z = m ? num(m.z) : 0;
  let rg = Math.pow(s, EXPONENTE), de = 'regla';
  if (V > 0 && A > 0) {
    const e0 = estimarGramos(V, A, opc), e1 = estimarGramos(V * s * s * s, A * s * s, opc);
    if (e0 > 0 && e1 > 0) { rg = e1 / e0; de = 'malla'; }
  }
  const gramos = g0 > 0 ? r1(g0 * rg) : 0;
  let horas = 0;
  if (h0 > 0) {
    // el tiempo: plástico que sale + capas + preparación (estimarHoras); se aplica la PROPORCIÓN a tus horas, que pueden ser las reales
    const t0 = z > 0 && g0 > 0 ? estimarHoras(g0, z, opc) : null, t1 = t0 ? estimarHoras(gramos, z * s, opc) : null;
    horas = r2(h0 * (t0 && t1 ? t1.seg / t0.seg : rg));
  }
  const medidas = m && num(m.x) > 0 ? { x: r1(num(m.x) * s), y: r1(num(m.y) * s), z: r1(num(m.z) * s) } : null;
  const mayor = medidas ? Math.max(medidas.x, medidas.y, medidas.z) : 0;
  const cabe = medidas ? CAMAS.map(c => ({ nombre: c.nombre, lado: c.lado, cabe: cabeEn(c, medidas) })) : [];
  return { pct: Math.round(s * 100), s, gramos, horas, medidas, de, cabe, mayor };
}

// Una línea clara de en qué impresora cabe (o que habría que partirla)
export function textoCabe(r) {
  if (!r || !r.medidas) return '';
  const si = r.cabe.filter(c => c.cabe).map(c => c.nombre);
  if (si.length === r.cabe.length) return '✅ Cabe en tus tres impresoras.';
  if (si.length) return '⚠️ Solo cabe en la ' + si.join(' y la ') + ' (la ' + r.cabe.filter(c => !c.cabe).map(c => c.nombre + ' llega a ' + String(c.lado / 10).replace('.', ',') + ' cm').join(', ') + ').';
  return '⛔ No cabe en ninguna de tus impresoras: mide ' + String(r1(r.mayor / 10)).replace('.', ',') + ' cm y la A1 llega a 25,6 cm. Habría que partirla en piezas.';
}
