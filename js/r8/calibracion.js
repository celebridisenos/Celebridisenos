// ================= v20.4 · 🎯 CelebriR8 · CALIBRAR TU CALIBRE Y TU IMPRESORA (y que luego se corrija SOLO) =================
// La dueña (10-10-2026): «quiero que mi calibre esté calibrado con mi programa… algún test que tenga que imprimir y medir y
// ponértelo, y la máquina hace todo lo que tiene que hacer».
//  1) EL CALIBRE: con las patas cerradas tiene que marcar 0,00; y una MONEDA de euro es un patrón con medida oficial (1 € = 23,25 mm,
//     2 € = 25,75 mm, 50 céntimos = 24,25 mm). Si tu calibre se desvía siempre lo mismo, se resta solo de lo que midas aquí.
//  2) LA PROBETA (laminada con su Bambu, perfil PRECISION, PETG: P1P 33 min · A1 mini 36 min · 12,2 g): cada cota con su LETRA. Con las medidas se separa lo que encoge el plástico (escala), lo que
//     engordan los contornos, lo que se cierran los agujeros y el pie de elefante (no es lo mismo: por eso no basta un cubo).
//  3) LO QUE HACE EL PROGRAMA: cada 3MF que mandes a Bambu con esa impresora lleva DENTRO, en la pieza, la compensación de agujeros,
//     la de contorno y el pie de elefante (son ajustes de Bambu Studio: él los aplica al laminar) y, si encoge en XY más de lo que el
//     calibre puede notar (0,1 %), la pieza va escalada en XY. La ALTURA no se escala: en 12 mm lo que se ve es la primera capa y el
//     propio calibre, no que el plástico encoja (si se aparta mucho, se avisa para revisar la primera capa).
//     TUS PERFILES NO SE TOCAN. Se guarda por impresora y material, y se puede apagar.
// Lo que no hace: no corrige el calibre si está roto o mide mal de forma desigual (eso se ve con dos monedas: si no cuadran, lo dice).
import * as N from './nucleo.js';

export const MONEDAS = { e1: ['1 €', 23.25], c50: ['50 céntimos', 24.25], e2: ['2 €', 25.75] }; // diámetros oficiales (BCE)
const LS = 'cd.r8.precision';
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES'), n3 = x => (Math.round(x * 1000) / 1000).toLocaleString('es-ES');
export function guardado() { try { return Object.assign({ perfiles: {}, activa: null, calibre: null }, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) { return { perfiles: {}, activa: null, calibre: null }; } }
const graba = g => { try { localStorage.setItem(LS, JSON.stringify(g)); } catch (e) { } return g; };

// ---------- 1) EL CALIBRE ----------
// m = { cero (lo que marca cerrado), e1, c50, e2 (lo que marca cada moneda; las que no tengas, vacías) }
export function calibre(m) {
  const L = Object.keys(MONEDAS).filter(k => Number(m[k]) > 0).map(k => ({ k, oficial: MONEDAS[k][1], medido: Number(m[k]) }));
  const cero = Number(m.cero) || 0, avisos = [];
  if (Math.abs(cero) > 0.005) avisos.push('Cerrado marca ' + n2(cero) + ': pon el cero (botón «ZERO» u «ORIGIN» con las patas cerradas) y vuelve a medir.');
  if (!L.length) return { off: 0, avisos: avisos.concat(['Mide al menos una moneda para comprobar el calibre.']), ok: false };
  const difs = L.map(x => x.medido - x.oficial), off = difs.reduce((a, b) => a + b, 0) / difs.length, spread = Math.max(...difs) - Math.min(...difs);
  if (L.length > 1 && spread > 0.04) avisos.push('Las monedas no cuadran entre sí (' + n2(spread) + ' mm de diferencia): mide otra vez, sin apretar, por el canto liso; si sigue, el calibre no mide igual en todo su recorrido.');
  if (Math.abs(off) > 0.03) avisos.push('Tu calibre marca ' + n2(Math.abs(off)) + ' mm de ' + (off > 0 ? 'MÁS' : 'MENOS') + ' (moneda gastada aparte). Se descuenta solo de lo que midas en la probeta; mejor: pon el cero, cambia la pila y repite.');
  return { off: Math.abs(off) <= 0.005 ? 0 : off, spread, monedas: L, avisos, ok: Math.abs(off) <= 0.03 && Math.abs(cero) <= 0.005 && !(L.length > 1 && spread > 0.04) };
}
export function guardaCalibre(r) { const g = guardado(); g.calibre = { off: r.off, ok: r.ok, fecha: new Date().toISOString().slice(0, 10) }; return graba(g); }

// ---------- 2) LA PROBETA ----------
// base 70 × 40 × 3 · bloque 40 × 20 × 12 (de x −30 a 10) con agujeros Ø5, Ø8, Ø10 · salientes Ø5 y Ø10 (de 9 de alto) · ranura de 4 × 16
export const COTAS = [
  { k: 'A', nombre: 'Largo del bloque', d: 40, tipo: 'fuera', donde: 'Bloque alto, de punta a punta por lo largo (por ARRIBA, no en la base).' },
  { k: 'B', nombre: 'Ancho del bloque', d: 20, tipo: 'fuera', donde: 'Bloque alto, de lado a lado (por arriba).' },
  { k: 'C', nombre: 'Alto total', d: 12, tipo: 'alto', donde: 'De la cara de abajo a lo más alto del bloque.' },
  { k: 'D', nombre: 'Largo de la BASE (abajo del todo)', d: 70, tipo: 'pie', donde: 'La base fina, de punta a punta, con las patas del calibre pegadas a la mesa (ahí está el pie de elefante).' },
  { k: 'F', nombre: 'Agujero pequeño', d: 5, tipo: 'dentro', donde: 'Agujero F, con las puntas de DENTRO del calibre, por arriba.' },
  { k: 'G', nombre: 'Agujero mediano', d: 8, tipo: 'dentro', donde: 'Agujero G, con las puntas de dentro.' },
  { k: 'H', nombre: 'Agujero grande', d: 10, tipo: 'dentro', donde: 'Agujero H, con las puntas de dentro.' },
  { k: 'I', nombre: 'Saliente pequeño', d: 5, tipo: 'fuera', donde: 'Cilindro I (el delgado), por fuera, a media altura.' },
  { k: 'J', nombre: 'Saliente grande', d: 10, tipo: 'fuera', donde: 'Cilindro J (el gordo), por fuera, a media altura.' },
  { k: 'K', nombre: 'Ranura', d: 4, tipo: 'dentro', donde: 'Ranura K de la base, de lado a lado (lo estrecho), con las puntas de dentro.' }
];
export const GEO = { base: [-35, 35, -20, 20, 3], bloque: [-30, 10, -10, 10, 12], agujeros: [['F', -22, 0, 5], ['G', -10, 0, 8], ['H', 3, 0, 10]], salientes: [['I', 24, -8, 5, 12], ['J', 24, 8, 10, 12]], ranura: [-28, -12, -18, -14] };
export function probeta() {
  const M = N.MF(), caja = (x0, x1, y0, y1, z0, z1) => M.cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]), cil = (x, y, d, z0, z1) => M.cylinder(z1 - z0, d / 2, d / 2, Math.max(48, Math.round(d * 10))).translate([x, y, z0]);
  const [bx0, bx1, by0, by1, bz] = GEO.base, [kx0, kx1, ky0, ky1, kz] = GEO.bloque;
  let m = caja(bx0, bx1, by0, by1, 0, bz).add(caja(kx0, kx1, ky0, ky1, 0, kz));
  GEO.salientes.forEach(([, x, y, d, z]) => { m = m.add(cil(x, y, d, 0, z)); });
  GEO.agujeros.forEach(([, x, y, d]) => { m = m.subtract(cil(x, y, d, -1, kz + 1)); });
  const [rx0, rx1, ry0, ry1] = GEO.ranura; m = m.subtract(caja(rx0, rx1, ry0, ry1, -1, bz + 1));
  // las LETRAS GRABADAS (0,6 mm hacia dentro): la cara de arriba queda PLANA (si fueran en relieve, el alto «C» mediría 12,6)
  const letra = (t, x, y, z) => N.centraCS(N.texto2(t, 'gorda', 4)).extrude(0.61).translate([x, y, z - 0.6]);
  const L = GEO.agujeros.map(([k, x]) => letra(k, x, -7.4, kz)).concat([letra('I', 31.5, -8, bz), letra('J', 31.5, 8, bz), letra('K', -8, -16, bz), letra('A', -27, 7.4, kz), letra('B', 7.2, 6.8, kz), letra('D', -32, -16, bz)]);
  m = m.subtract(N.union(L));
  return m;
}

// ---------- 3) LAS CUENTAS ----------
// med = { A: 40.1, … } (lo que marca TU calibre) · off = desvío del calibre → { s, sz, c, h, f, claves, escala, avisos, res }
export function calcula(med, off = 0) {
  const v = k => { const x = Number(String(med[k] ?? '').replace(',', '.')); return x > 0 ? x - off : null; }, falta = COTAS.filter(c => v(c.k) == null).map(c => c.k);
  if (falta.length) N.mal('Faltan medidas: ' + falta.join(', ') + '.');
  // fuera: m = s·d + 2c (mínimos cuadrados con A, B, I, J) · dentro: m = s·d − 2h
  const F = COTAS.filter(c => c.tipo === 'fuera').map(c => [c.d, v(c.k), c.k]), n = F.length, Sx = F.reduce((a, p) => a + p[0], 0), Sy = F.reduce((a, p) => a + p[1], 0), Sxx = F.reduce((a, p) => a + p[0] * p[0], 0), Sxy = F.reduce((a, p) => a + p[0] * p[1], 0);
  const s = (n * Sxy - Sx * Sy) / (n * Sxx - Sx * Sx), c = (Sy - s * Sx) / n / 2;
  const resF = F.map(([d, m, k]) => ({ k, r: m - (s * d + 2 * c) })), D = COTAS.filter(x => x.tipo === 'dentro').map(x => ({ k: x.k, h: (s * x.d - v(x.k)) / 2 }));
  const h = D.reduce((a, x) => a + x.h, 0) / D.length, resD = D.map(x => ({ k: x.k, r: x.h - h }));
  const sz = v('C') / 12, f = Math.max(0, (v('D') - (70 * s + 2 * c)) / 2), avisos = [];
  const malF = resF.filter(x => Math.abs(x.r) > 0.08), malD = resD.filter(x => Math.abs(x.r) > 0.08);
  if (malF.length) avisos.push('No cuadra' + (malF.length > 1 ? 'n' : '') + ' con las demás: ' + malF.map(x => x.k).join(', ') + ' (más de 0,08 mm). Mídela' + (malF.length > 1 ? 's' : '') + ' otra vez.');
  if (malD.length) avisos.push('Los agujeros no cuadran entre sí: ' + malD.map(x => x.k).join(', ') + '. Mide otra vez con las puntas de dentro, sin forzar.');
  if (Math.abs(v('C') - 12) > 0.1) avisos.push('El alto (C) sale ' + n2(v('C')) + ' en vez de 12: eso suele ser la PRIMERA CAPA (muy aplastada o despegada), no que encoja. No se corrige solo: revisa la nivelación / el «Z offset» y vuelve a imprimirla.');
  if (Math.abs(1 - s) > 0.02 || Math.abs(1 - sz) > 0.03) avisos.push('Sale mucho (' + n2((1 - s) * 100) + ' % en XY): ¿la probeta es la de esta pantalla y la has medido en mm?');
  const r3 = x => Math.round(x * 1000) / 1000;
  const r2 = x => Math.round(x * 100) / 100 + 0; // (v20.4: en centésimas: es lo que ve un calibre)
  const claves = { xy_hole_compensation: String(r2(Math.max(0, Math.min(0.5, h)))), xy_contour_compensation: String(r2(Math.max(-0.5, Math.min(0.5, -c)))), elefant_foot_compensation: String(r2(Math.min(0.6, f))) };
  const sXY = Math.abs(1 - s) < 0.001 ? 1 : s, escala = [r3(1 / sXY), r3(1 / sXY), 1]; // (v20.4: menos de 0,1 % no se nota con calibre; la Z no se escala)
  return { s, sz, c, h, f, claves, escala, avisos, res: resF.concat(resD) };
}
// guardar el resultado de una impresora + material (y dejarlo como el que se usa)
export function guarda(clave, R, extra = {}) { const g = guardado(); g.perfiles[clave] = Object.assign({ fecha: new Date().toISOString().slice(0, 10), claves: R.claves, escala: R.escala, s: R.s, sz: R.sz, c: R.c, h: R.h, f: R.f }, extra); g.activa = clave; return graba(g); }
export function activa() { const g = guardado(); return g.activa && g.perfiles[g.activa] ? Object.assign({ clave: g.activa }, g.perfiles[g.activa]) : null; }
export function ponActiva(clave) { const g = guardado(); g.activa = clave && g.perfiles[clave] ? clave : null; return graba(g); }
export const texto = P => (P.escala && Math.abs(P.escala[0] - 1) > 1e-6 ? 'encoge ' + n2((1 - P.s) * 100) + ' % en XY (va escalada ×' + n3(P.escala[0]) + ')' : 'no encoge en XY (o menos de lo que nota un calibre)') + ' · agujeros +' + n3(Number(P.claves.xy_hole_compensation)) + ' · contorno ' + n3(Number(P.claves.xy_contour_compensation)) + ' · pie ' + n3(Number(P.claves.elefant_foot_compensation)) + ' mm';

// ---------- 4) LO QUE HACE SOLO: al preparar un 3MF para imprimir ----------
// partes = [{ m (Manifold) | malla (sopa Float32Array), color, nombre }] · ajustes = claves del 3MF → { partes, ajustes, aplicada }
export function paraImprimir(partes, ajustes, o = {}) {
  const A = o.sin ? null : activa(); if (!A) return { partes, ajustes, aplicada: null };
  const [sx, sy, sz] = A.escala || [1, 1, 1], esc = Math.abs(sx - 1) > 1e-4 || Math.abs(sz - 1) > 1e-4;
  const P2 = partes.map(p => {
    if (!esc) return p;
    if (p.m) { const b = N.caja(p.m), cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, z0 = b.min[2]; return Object.assign({}, p, { m: p.m.translate([-cx, -cy, -z0]).scale([sx, sy, sz]).translate([cx, cy, z0]) }); }
    if (p.malla) { const S = p.malla, out = new Float32Array(S.length); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity; for (let i = 0; i < S.length; i += 3) { x0 = Math.min(x0, S[i]); x1 = Math.max(x1, S[i]); y0 = Math.min(y0, S[i + 1]); y1 = Math.max(y1, S[i + 1]); z0 = Math.min(z0, S[i + 2]); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; for (let i = 0; i < S.length; i += 3) { out[i] = cx + (S[i] - cx) * sx; out[i + 1] = cy + (S[i + 1] - cy) * sy; out[i + 2] = z0 + (S[i + 2] - z0) * sz; } return Object.assign({}, p, { malla: out }); }
    return p; });
  return { partes: P2, ajustes: Object.assign({}, ajustes || {}, A.claves), aplicada: A.clave };
}
