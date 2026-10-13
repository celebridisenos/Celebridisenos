// ================= 13-10-2026 · 🔁 COPIAR UN ENGRANAJE QUE YA TIENES · que salga IDÉNTICO =================
// La dueña: «una pieza mecánica con dientes tiene que ser más precisa, o que tenga una orden de proceso que haga que la pieza sea
// idéntica… mejorar la precisión y poder calibrar también ahí» y «hay veces que la pieza tiene geometría difícil con muchos dientes».
// Una IA de fotos NUNCA saca bien unos dientes (los redondea o se inventa cuántos hay). El camino bueno es el de un taller:
//  1) CONTAR los dientes (a mano o con una foto de frente: el programa los cuenta, también si son 80 o 120);
//  2) MEDIR con el calibre el Ø exterior y, para la precisión de verdad, la MEDIDA SOBRE k DIENTES (la «cota W» de los talleres:
//     las bocas del calibre apoyadas en los flancos de k dientes seguidos). Con dos (sobre k y sobre k+1) sale además el ÁNGULO de
//     presión, que en una foto no se ve: W(k+1) − W(k) = π · m · cos α (el paso de base), sin depender del desgaste;
//  3) DEDUCIR (este archivo): se prueban todos los módulos normalizados (ISO) y pasos diametrales con 20°, 14,5° y 25°, y se queda
//     el que mejor explica TODAS las medidas, con su desplazamiento de perfil. Se dice lo que sobra o falta en cada medida (en mm)
//     y la confianza. Si nada normalizado cuadra, se dice (no se maquilla);
//  4) CONSTRUIR la pieza con la geometría de evolvente exacta (engranajes.js) y TU calibración;
//  5) PROBAR con una rodaja fina (2–3 mm, pocos gramos) y MEDIRLA: lo que tu impresora engorda los flancos se convierte en el juego
//     que hay que quitar, se guarda por impresora y material, y desde ese momento todos los engranajes salen corregidos solos.
// Para piezas difíciles (cuerpo raro, levas, nervios, varios pisos): se sube el STL o el escaneo y se CAMBIAN SOLO LOS DIENTES por
// los exactos (hibrido), o se monta por pisos (doble engranaje). Todo local, en este aparato.
import * as N from './nucleo.js';
import * as G from './engranajes.js';

const RAD = Math.PI / 180, inv = a => Math.tan(a) - a;
// módulos normalizados (ISO 54, series 1 y 2) y los pasos diametrales que se encuentran en aparatos y en RC
export const MODULOS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.125, 1.25, 1.375, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10];
export const DPS = [96, 72, 64, 48, 40, 36, 32, 28, 24, 22, 20, 18, 16, 14, 12, 11, 10, 9, 8, 7, 6, 5, 4];
const ALFAS = [20, 14.5, 25];
const f = (x, d = 2) => G.fmt(x, d);

// ---------- la medida sobre k dientes (cota W) de un engranaje: en la NORMAL al diente (lo que mide el calibre) ----------
// juego = lo que se le quita al grueso del diente (total, en la normal): la cota baja juego · cos αn
export function cotaW({ mn, alfa = 20, beta = 0, z, x = 0, k, juego = 0 }) {
  const an = alfa * RAD, be = beta * RAD, at = Math.atan(Math.tan(an) / Math.cos(be));
  return mn * Math.cos(an) * ((k - 0.5) * Math.PI + z * inv(at)) + 2 * x * mn * Math.sin(an) - juego * Math.cos(an);
}
// cuántos dientes abarcar para que las bocas apoyen cerca de la mitad del diente (lo que dicen las tablas de taller)
export function kRecomendado(z, alfa = 20, beta = 0, x = 0) {
  const an = alfa * RAD, be = beta * RAD, at = Math.atan(Math.tan(an) / Math.cos(be)), zv = z / Math.pow(Math.cos(be), 3);
  // k = zv/π · (tan αx − inv αt) − 2x·tan αn/π + 0,5, con αx el ángulo en el radio medio del diente (aprox. tabla DIN 3960)
  const ax = Math.acos(zv * Math.cos(an) / (zv + 2 * x)); const k = zv / Math.PI * (Math.tan(ax) - inv(an)) - 2 * x * Math.tan(an) / Math.PI + 0.5;
  return Math.max(2, Math.min(z - 1, Math.round(isFinite(k) ? k : z * alfa / 180 + 0.5)));
}

// ---------- 3) DEDUCIR el engranaje a partir de lo medido ----------
// med = { z, da, df?, W?, k?, W1? (sobre k+1), beta?, sistema: 'auto'|'modulo'|'dp', alfa: 'auto'|20|14.5|25 }
// → { mejor, otras: [...], avisos: [...] } · cada opción: { mn, dp?, sistema, alfa, x, errores: {da, df, pb, W}, score, texto }
export function deduce(med) {
  const z = Math.round(Number(med.z)), da = Number(med.da), df = Number(med.df) || 0, W = Number(med.W) || 0, W1 = Number(med.W1) || 0;
  const k = Math.round(Number(med.k)) || 0, beta = Number(med.beta) || 0, be = beta * RAD, avisos = [];
  if (!(z >= 6) || !(da > 0)) return { mejor: null, otras: [], avisos: [{ n: 'error', t: 'Hacen falta los dientes y el Ø exterior.' }] };
  const lista = [];
  if (med.sistema !== 'dp') MODULOS.forEach(m => lista.push({ mn: m, sistema: 'módulo' }));
  if (med.sistema !== 'modulo') DPS.forEach(dp => lista.push({ mn: 25.4 / dp, dp, sistema: 'DP' }));
  const alfas = med.alfa && med.alfa !== 'auto' ? [Number(med.alfa)] : ALFAS;
  const conW = W > 0 && k >= 2, conPb = conW && W1 > W;
  const pbMed = conPb ? W1 - W : 0;
  const ops = [];
  for (const c of lista) for (const alfa of alfas) {
    const mn = c.mn, an = alfa * RAD, mt = mn / Math.cos(be), at = Math.atan(Math.tan(an) / Math.cos(be));
    const xDa = (da - mt * z - 2 * mn) / (2 * mn);
    // sin la cota W, el desplazamiento no se puede separar del módulo: se supone el normal (0) y lo que sobre lo dice el error del Ø
    let x = 0;
    if (conW) x = (W - mn * Math.cos(an) * ((k - 0.5) * Math.PI + z * inv(at))) / (2 * mn * Math.sin(an));
    if (x < -0.9 || x > 1.2) continue; // nadie fabrica eso: no es esta
    const daP = mt * z + 2 * mn * (1 + x), dfP = mt * z - 2 * mn * (1.25 - x), err = { da: daP - da };
    if (df > 0) err.df = dfP - df;
    if (conPb) err.pb = Math.PI * mn * Math.cos(an) - pbMed;
    // la punta suele venir algo achaflanada o gastada (el Ø medido sale MÁS PEQUEÑO que el teórico, hasta ¼ de módulo): eso casi no
    // cuenta; al revés (más grande de lo que puede ser) cuenta entero
    const eDa = err.da > 0 ? Math.max(0, err.da - 0.25 * mn) * 0.6 + err.da * 0.1 : err.da;
    let score = eDa * eDa + (err.df != null ? 0.5 * err.df * err.df : 0) + (err.pb != null ? 9 * err.pb * err.pb : 0);
    // lo que es más habitual gana cuando las medidas no deciden: sin desplazamiento, 20°, módulo métrico (con la cota W y W+1 el
    // ángulo ya se mide y casi no hace falta empujar)
    score = Math.sqrt(score) + 0.25 * x * x + (alfa === 20 ? 0 : conPb ? 0.004 : alfa === 14.5 ? 0.05 : 0.06) + (c.sistema === 'DP' ? (conPb ? 0.002 : 0.006) : 0);
    ops.push(Object.assign({}, c, { alfa, x: Math.round(x * 1000) / 1000, xDa, errores: err, score, daP, dfP }));
  }
  ops.sort((a, b) => a.score - b.score);
  // quitar repetidos (mismo diente con otro ángulo, que sin cota W no se distinguen)
  const vistas = new Set(), unicas = ops.filter(o => { const kk = o.sistema + o.mn.toFixed(4); if (vistas.has(kk)) return false; vistas.add(kk); return true; });
  const mejor = unicas[0] || null, seg = unicas[1] || null;
  if (!mejor) return { mejor: null, otras: [], avisos: [{ n: 'error', t: 'Ningún módulo ni paso diametral normalizado explica esas medidas. Revisa los dientes (¿los has contado dos veces?) y el Ø exterior.' }] };
  const tol = conPb ? 0.05 : conW ? 0.06 : 0.08;
  mejor.confianza = mejor.score < tol && (!seg || seg.score > 2 * mejor.score) ? 'alta' : mejor.score < 2.5 * tol ? 'media' : 'baja';
  mejor.alfaSabido = conPb || (med.alfa && med.alfa !== 'auto');
  mejor.texto = (mejor.dp ? mejor.dp + ' DP (módulo ' + f(mejor.mn, 4) + ')' : 'módulo ' + f(mejor.mn, 3)) + ' · ' + f(mejor.alfa, 1) + '°' + (Math.abs(mejor.x) > 0.005 ? ' · desplazamiento ' + f(mejor.x, 3) : '');
  if (mejor.confianza === 'baja') avisos.push({ n: 'aviso', t: 'Las medidas no cuadran del todo con ningún engranaje normalizado (lo más cercano: ' + mejor.texto + '). Puede estar muy gastado o ser a medida: vuelve a medir el Ø exterior en varios sitios y, si puedes, la medida sobre ' + (k || 'k') + ' dientes.' });
  if (!conW) avisos.push({ n: 'aviso', t: 'Sin la «medida sobre ' + kRecomendado(z, mejor.alfa, beta) + ' dientes» la precisión es la del Ø exterior (±0,05 mm como mucho) y el grueso del diente se supone el normal. Para que salga IDÉNTICO, mídela (ver la ayuda) y escríbela.' });
  if (!mejor.alfaSabido) avisos.push({ n: 'aviso', t: 'El ángulo de presión no se puede saber solo con el Ø: se ha puesto ' + f(mejor.alfa, 1) + '° (el más común). Con la medida sobre ' + kRecomendado(z, 20, beta) + ' y sobre ' + (kRecomendado(z, 20, beta) + 1) + ' dientes lo calculo de verdad.' });
  if (seg && seg.score < 1.5 * mejor.score && seg.mn !== mejor.mn) avisos.push({ n: 'aviso', t: 'Hay otra opción casi igual de buena: ' + (seg.dp ? seg.dp + ' DP' : 'módulo ' + f(seg.mn, 3)) + '. La medida sobre k dientes las distingue.' });
  if (mejor.errores.da > 0.03 && conW) avisos.push({ n: 'ok', t: 'El Ø exterior medido es ' + f(mejor.errores.da, 2) + ' mm más pequeño que el teórico: la punta está achaflanada o gastada. Se copia el diente por su flanco (cota W), que es lo que engrana.' });
  if (mejor.confianza === 'alta') avisos.push({ n: 'ok', t: 'Identificado con confianza ALTA: ' + mejor.texto + '.' });
  return { mejor, otras: unicas.slice(1, 4), avisos, conW, conPb };
}
// los parámetros de engranajes.js para construir lo deducido (con su juego de funcionamiento y la corrección de la impresora)
export function params(D, v, juegoTotal) {
  const o = D.mejor; return { por: 'modulo', m: o.mn, z: Math.round(v.z), alfa: o.alfa, beta: v.forma && v.forma !== 'recto' ? Number(v.beta) || 0 : 0, mano: v.mano || 'der',
    tipo: v.forma === 'espiga' ? 'espiga' : v.forma === 'helicoidal' ? 'helicoidal' : 'recto', x: o.x, juego: Math.max(0, juegoTotal), b: v.b };
}

// ---------- 5) CALIBRAR los engranajes con la rodaja de prueba (por impresora y material) ----------
const LS = 'cd.r8.cal.engranajes';
const lee = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } };
export const claveCal = (imp, mat) => (/a1/i.test(String(imp || '')) ? 'A1 mini' : 'P1P') + ' · ' + (String(mat || 'PLA').toUpperCase().replace(/[^A-Z]/g, '') || 'PLA');
export const calDe = (imp, mat) => lee()[claveCal(imp, mat)] || null;
export function guardaCal(imp, mat, dJ, extra = {}) { const L = lee(); L[claveCal(imp, mat)] = Object.assign({ dJ: Math.round(dJ * 1000) / 1000, fecha: new Date().toISOString().slice(0, 10) }, extra); try { localStorage.setItem(LS, JSON.stringify(L)); } catch (e) { } return L[claveCal(imp, mat)]; }
export const borraCal = (imp, mat) => { const L = lee(); delete L[claveCal(imp, mat)]; try { localStorage.setItem(LS, JSON.stringify(L)); } catch (e) { } };
// la rodaja se imprimió con juego jUsado; su cota W de diseño es Wdis. Medida: Wimp. Lo que la impresora engorda el diente (en la
// normal) = (Wimp − Wdis) / cos αn → esa es la corrección TOTAL que hay que sumar al juego (la que ya tenía + la nueva)
export function correccionDePrueba({ Wimp, Wdis, alfa, dJusado = 0 }) {
  const e = (Wimp - Wdis) / Math.cos(alfa * RAD); return { e, dJ: dJusado + e };
}

// ---------- 1) CONTAR LOS DIENTES con una foto de frente (no hace falta calibrar la foto: el número no depende del tamaño) ----------
export async function contarDientesFoto(file) {
  const FM = await import('./foto_medida.js');
  const I = await FM.cargaArchivo(file, 1800), im = await FM.imagenDe(I.id), D = FM.pixeles(im), C = FM.contornos(D), pz = FM.pieza(C.anillos, p => p, 400);
  FM.IMAGENES.delete(I.id);
  if (!pz) throw new Error('No encuentro la pieza en la foto: ponla sobre un fondo liso (un folio) y que salga entera.');
  const L = FM.leeEngranaje(pz);
  if (L.error) throw new Error(L.error);
  return { z: L.z, proporcion: L.Df / L.Da, agujero: L.agujero ? L.agujero.d / L.Da : null };
}

// ---------- 6) PIEZAS DIFÍCILES: cambiar SOLO LOS DIENTES de un STL o escaneo por los exactos ----------
// sopa = triángulos del STL (el eje del engranaje a lo largo de Z: si no, se tumba solo buscando el eje «más redondo»).
// Se busca la zona de los dientes (las alturas donde la pieza llega al Ø exterior), se le quita al STL el anillo de los dientes
// (de un poco por debajo de su fondo hacia fuera) y en su sitio se pone el anillo de dientes EXACTO. El resto (buje, nervios,
// levas, chavetero…) se queda como estaba.
export function hibrido(sopa, P, o = {}) {
  let m = N.deSopa(sopa);
  // el eje: la orientación en la que ALGÚN corte (se miran 15 alturas: los dientes pueden estar arriba, abajo o en medio, con un buje
  // o una leva encima) es REDONDO y mide el Ø exterior (ancho ≈ fondo ≈ Ø). De lado, los cortes salen rectángulos.
  const ejes = [null, [90, 0, 0], [0, 90, 0]].map(r => { const mm = r ? m.rotate(r) : m, b = N.caja(mm); let err = Infinity;
    for (let i = 1; i < 16; i++) { const s = N.cajaCS(mm.slice(b.min[2] + b.dims[2] * i / 16)); if (s.w > 0) err = Math.min(err, Math.abs(s.w - s.h) + Math.abs(Math.max(s.w, s.h) - o.da)); }
    return { r, mm, b, err }; }).sort((a, b) => a.err - b.err);
  m = ejes[0].mm; let b = ejes[0].b;
  m = m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]); b = N.caja(m);
  const K = G.numeros(P), H = b.dims[2], pasos = Math.max(24, Math.min(200, Math.round(H / 0.2))), zona = [];
  for (let i = 0; i <= pasos; i++) { const zz = Math.min(H - 0.01, Math.max(0.01, H * i / pasos)), s = N.cajaCS(m.slice(zz)); zona.push({ z: zz, w: Math.max(s.w, s.h) }); }
  const umbral = 2 * K.rf + 0.3 * K.mn, hayDientes = zz => Math.max(...(s => [s.w, s.h])(N.cajaCS(m.slice(zz)))) > umbral;
  const iDent = zona.map((q, i) => q.w > umbral ? i : -1).filter(i => i >= 0);
  if (!iDent.length) N.mal('No encuentro los dientes en ese STL: ¿es el mismo engranaje (' + Math.round(P.z) + ' dientes, Ø ' + f(2 * K.ra, 1) + ' mm)? Si está en pulgadas o a otra escala, cámbiala antes.');
  // el borde EXACTO de la zona de dientes (entre la última altura con dientes y la primera sin ellos, se parte por la mitad 14 veces:
  // menos de una milésima): así no queda ni una lámina de los dientes viejos
  const borde = (dentro, fuera) => { for (let i = 0; i < 14; i++) { const mid = (dentro + fuera) / 2; if (hayDientes(mid)) dentro = mid; else fuera = mid; } return fuera; };
  const iA = iDent[0], iB = iDent[iDent.length - 1];
  const z0 = iA === 0 ? 0 : borde(zona[iA].z, zona[iA - 1].z), z1 = iB === zona.length - 1 ? H : borde(zona[iB].z, zona[iB + 1].z), alto = z1 - z0;
  const Rcorte = K.rf - Math.max(0.15, 0.1 * K.mn), C = N.CSX(), Rfuera = Math.max(b.dims[0], b.dims[1]) / 2 + 5;
  const anillo = C.circle(Rfuera, 96).subtract(C.circle(Rcorte, Math.max(96, Math.round(P.z) * 6))).extrude(alto + 0.02).translate([0, 0, z0 - 0.01]);
  const cuerpo = m.subtract(anillo), dientes = G.engranaje(Object.assign({}, P, { b: alto, eje: 0, buje: false })).m.subtract(C.circle(Rcorte - 0.4, 96).extrude(alto + 2).translate([0, 0, -1])).translate([0, 0, z0]);
  return { m: cuerpo.add(dientes), z0, z1, alto, fuera: b.dims };
}
