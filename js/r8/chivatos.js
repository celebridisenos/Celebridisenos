// ================= v20.2 · 🔔 CelebriR8 · CHIVATOS (la ayuda que avisa sola) =================
// La dueña (10-10-2026): «chivatos de ayuda: si esto no gira, si ahora encaja… para saber». Cuando paras de tocar, el Estudio mira:
//  · HOLGURA entre dos piezas que se tocan o una dentro de otra, con TUS medidas de la Bambu (por lado): 0,05 a presión ·
//    0,10 justo · 0,15 gira. Dice «🔄 Gira», «✋ Justo», «🔒 A presión (no gira)», «⛔ No entra»…  (lo mide de verdad: la menor
//    distancia entre las dos superficies, triángulo a triángulo, tal cual saldrán en el STL)
//  · CHOQUES: dos piezas que se pisan un poco = una no entra en la otra (y cuánto le sobra).
//  · ENGRANAJES: si dos ruedas engranan (distancia entre centros = módulo × (z1 + z2) / 2), se clavan o no llegan; mismo módulo.
//  · EN EL AIRE: una pieza que no apoya en la cama ni en otra.
// Cada aviso dice QUÉ pasa y, si se puede, trae el ARREGLO (y se vuelve a comprobar solo). Y en 🎬 Animar: «🔍 Comprobar el
// movimiento» recorre todo el movimiento y dice si algo choca y CUÁNDO (lo de «si esto no gira»).
import * as N from './nucleo.js';
import { ENCAJES, perfilEngranaje } from './motor.js';

const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
// los cortes entre una clase y otra: a medio camino entre tus medidas
export const CORTES = { pegadas: ENCAJES.presion / 2, presion: (ENCAJES.presion + ENCAJES.justo) / 2, justo: (ENCAJES.justo + ENCAJES.gira) / 2, gira: 2 * ENCAJES.gira, holgado: 0.6 };
export function claseHolgura(d) {
  if (d < CORTES.pegadas) return 'pegadas';
  if (d < CORTES.presion) return 'presion';
  if (d < CORTES.justo) return 'justo';
  if (d < CORTES.gira) return 'gira';
  if (d <= CORTES.holgado) return 'holgado';
  return null;
}

// ---------- geometría: la pieza en el mundo y la menor distancia entre dos ----------
const MUNDO = new Map();
export function mallaMundo(p) {
  const k = p.clave || null; if (k && MUNDO.has(k)) return MUNDO.get(k);
  const v = p.vista, M = p.matriz, src = v.pos, pos = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 3) {
    const x = src[i], y = src[i + 1], z = src[i + 2];
    if (M) { pos[i] = M[0] * x + M[4] * y + M[8] * z + M[12]; pos[i + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; pos[i + 2] = M[2] * x + M[6] * y + M[10] * z + M[14]; }
    else { pos[i] = x; pos[i + 1] = y; pos[i + 2] = z; }
  }
  const r = { pos, idx: v.idx };
  if (k) { if (MUNDO.size > 80) MUNDO.delete(MUNDO.keys().next().value); MUNDO.set(k, r); }
  return r;
}
// punto más cercano de un triángulo (Ericson, «Real-Time Collision Detection» 5.1.5): devuelve la distancia² y deja el punto en q
function cercanoTri(px, py, pz, P, a, b, c, q) {
  const ax = P[a], ay = P[a + 1], az = P[a + 2], bx = P[b], by = P[b + 1], bz = P[b + 2], cx = P[c], cy = P[c + 1], cz = P[c + 2];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  let x, y, z;
  if (d1 <= 0 && d2 <= 0) { x = ax; y = ay; z = az; }
  else {
    const bpx = px - bx, bpy = py - by, bpz = pz - bz, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) { x = bx; y = by; z = bz; }
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); x = ax + v * abx; y = ay + v * aby; z = az + v * abz; }
      else {
        const cpx = px - cx, cpy = py - cy, cpz = pz - cz, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) { x = cx; y = cy; z = cz; }
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); x = ax + w * acx; y = ay + w * acy; z = az + w * acz; }
          else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); x = bx + w * (cx - bx); y = by + w * (cy - by); z = bz + w * (cz - bz); }
            else { const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; x = ax + abx * v + acx * w; y = ay + aby * v + acy * w; z = az + abz * v + acz * w; }
          }
        }
      }
    }
  }
  q[0] = x; q[1] = y; q[2] = z;
  return (px - x) * (px - x) + (py - y) * (py - y) + (pz - z) * (pz - z);
}
// rejilla de los triángulos de B que caen en la zona [lo, hi]
function rejilla(B, lo, hi, h) {
  const tam = [0, 1, 2].map(k => Math.max(1, Math.ceil((hi[k] - lo[k]) / h)));
  while (tam[0] * tam[1] * tam[2] > 250000) { h *= 1.5; for (let k = 0; k < 3; k++) tam[k] = Math.max(1, Math.ceil((hi[k] - lo[k]) / h)); }
  const cel = new Map(), P = B.pos, I = B.idx;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, i0 = [], i1 = [];
    let fuera = false;
    for (let k = 0; k < 3; k++) {
      const mn = Math.min(P[a + k], P[b + k], P[c + k]), mx = Math.max(P[a + k], P[b + k], P[c + k]);
      if (mx < lo[k] || mn > hi[k]) { fuera = true; break; }
      i0.push(Math.max(0, Math.floor((mn - lo[k]) / h))); i1.push(Math.min(tam[k] - 1, Math.floor((mx - lo[k]) / h)));
    }
    if (fuera) continue;
    for (let x = i0[0]; x <= i1[0]; x++) for (let y = i0[1]; y <= i1[1]; y++) for (let z = i0[2]; z <= i1[2]; z++) { const key = (x * tam[1] + y) * tam[2] + z; let L = cel.get(key); if (!L) cel.set(key, L = []); L.push(t); }
  }
  return { lo, h, tam, cel };
}
function unSentido(A, B, lo, hi, max, mejor) {
  const G = rejilla(B, lo, hi, Math.max(max, 0.25)), P = A.pos, PB = B.pos, IB = B.idx, q = [0, 0, 0], h = G.h, T = G.tam;
  let n = 0; for (let i = 0; i < P.length; i += 3) if (P[i] >= lo[0] && P[i] <= hi[0] && P[i + 1] >= lo[1] && P[i + 1] <= hi[1] && P[i + 2] >= lo[2] && P[i + 2] <= hi[2]) n++;
  const salto = n > 60000 ? Math.ceil(n / 60000) : 1; let k = 0;
  for (let i = 0; i < P.length; i += 3) {
    const x = P[i], y = P[i + 1], z = P[i + 2];
    if (x < lo[0] || x > hi[0] || y < lo[1] || y > hi[1] || z < lo[2] || z > hi[2]) continue;
    if (salto > 1 && (k++ % salto)) continue;
    const cx = Math.floor((x - lo[0]) / h), cy = Math.floor((y - lo[1]) / h), cz = Math.floor((z - lo[2]) / h);
    for (let a = cx - 1; a <= cx + 1; a++) { if (a < 0 || a >= T[0]) continue;
      for (let b = cy - 1; b <= cy + 1; b++) { if (b < 0 || b >= T[1]) continue;
        for (let c = cz - 1; c <= cz + 1; c++) { if (c < 0 || c >= T[2]) continue;
          const L = G.cel.get((a * T[1] + b) * T[2] + c); if (!L) continue;
          for (let j = 0; j < L.length; j++) { const t = L[j], d2 = cercanoTri(x, y, z, PB, IB[t] * 3, IB[t + 1] * 3, IB[t + 2] * 3, q); if (d2 < mejor.d2) { mejor.d2 = d2; mejor.pa = [x, y, z]; mejor.pb = q.slice(); } }
        } } }
  }
  if (salto > 1) mejor.aprox = true;
}
// la MENOR distancia entre las superficies de A y B (hasta «max» mm; más lejos → Infinity). A y B en el mundo: { pos, idx }
export function distancia(A, B, cajaA, cajaB, max = CORTES.holgado) {
  const lo = [0, 1, 2].map(k => Math.max(cajaA.min[k], cajaB.min[k]) - max), hi = [0, 1, 2].map(k => Math.min(cajaA.max[k], cajaB.max[k]) + max);
  if (lo.some((v, k) => v > hi[k])) return { d: Infinity };
  const mejor = { d2: max * max * 1.0001, pa: null, pb: null, aprox: false };
  unSentido(A, B, lo, hi, max, mejor); unSentido(B, A, lo, hi, max, mejor);
  return mejor.pa ? { d: Math.sqrt(mejor.d2), pa: mejor.pa, pb: mejor.pb, aprox: mejor.aprox } : { d: Infinity };
}
// ¿B está «dentro» de A (o al revés)? → la pequeña es la que entra: qué parte de su caja cae dentro de la caja de la grande
function anidadas(a, b) {
  const vol = c => Math.max(1e-9, c.dims[0] * c.dims[1] * c.dims[2]);
  const [ch, gr] = vol(a.caja) <= vol(b.caja) ? [a, b] : [b, a];
  const inter = [0, 1, 2].reduce((s, k) => s * Math.max(0, Math.min(ch.caja.max[k], gr.caja.max[k]) - Math.max(ch.caja.min[k], gr.caja.min[k])), 1);
  return { dentro: ch, fuera: gr, frac: inter / vol(ch.caja) };
}
const cruzan = (a, b, h) => a.min[0] <= b.max[0] + h && b.min[0] <= a.max[0] + h && a.min[1] <= b.max[1] + h && b.min[1] <= a.max[1] + h && a.min[2] <= b.max[2] + h && b.min[2] <= a.max[2] + h;

// ---------- engranajes (los «⚙️ Engranaje recto» del catálogo) ----------
// GIRO para que la rueda 2 engrane con la 1 (igual que en rc_mas.js: la 1 girada φ1 en el centro; la 2 en la dirección β, en grados)
export const giroPareja = (z1, phi1, z2, beta) => beta + 180 + 180 / z2 - (z1 / z2) * (phi1 - beta);
// el catálogo deja cada pieza centrada por su CAJA: con dientes impares el eje queda unas décimas a un lado → se calcula dónde está
const DESCENTRO = new Map();
function descentro(z, m) { const k = z + '|' + m; if (!DESCENTRO.has(k)) { const L = perfilEngranaje(z, m); let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; L.forEach(q => { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); }); DESCENTRO.set(k, [-(a + b) / 2, -(c + d) / 2]); } return DESCENTRO.get(k); }
function datosRueda(P, PR, c) {
  const p = c.p || {}, M = PR.matrizMundo(P, c.id), e = M.elements, dc = descentro(Math.round(p.z), Number(p.m)), cen = [0, 1, 2].map(k => e[k] * dc[0] + e[4 + k] * dc[1] + e[12 + k]);
  const ax = [e[8], e[9], e[10]], l = Math.hypot(...ax) || 1, eje = ax.map(v => v / l), b = Number(p.grosor) || 8, sx = Math.hypot(e[0], e[1], e[2]) || 1;
  const s0 = cen[0] * eje[0] + cen[1] * eje[1] + cen[2] * eje[2], s1 = s0 + b * l;
  return { c, dc, top: !PR.padreDe(P, c.id), z: Math.round(p.z), m: Number(p.m) * sx, b, cen, eje, s: [Math.min(s0, s1), Math.max(s0, s1)], plano: Math.abs(eje[2]) > 0.999 && Math.abs(c.t.rot[0] % 360) < 1e-6 && Math.abs(c.t.rot[1] % 360) < 1e-6 };
}
export function engranes(P, PR) {
  const ruedas = []; PR.recorre(P.cuerpos, c => { if (!c.oculto && !c.hueco && c.tipo === 'cat' && c.p && c.p.k === 'engranaje') ruedas.push(c); });
  const out = [];
  if (ruedas.length < 2 || ruedas.length > 30) return out;
  const R = ruedas.map(c => datosRueda(P, PR, c)), nom = x => '«' + (x.c.nombre || 'Engranaje') + '»';
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const A = R[i], B = R[j], dot = A.eje[0] * B.eje[0] + A.eje[1] * B.eje[1] + A.eje[2] * B.eje[2];
    if (Math.abs(dot) < 0.995) continue; // ejes cruzados: no es una pareja de rectos
    const dl = [0, 1, 2].map(k => B.cen[k] - A.cen[k]), along = dl[0] * A.eje[0] + dl[1] * A.eje[1] + dl[2] * A.eje[2], rad = dl.map((v, k) => v - along * A.eje[k]), d = Math.hypot(...rad);
    const a = A.m * (A.z + B.z) / 2, alcance = (A.z + 2) * A.m / 2 + (B.z + 2) * B.m / 2;
    if (d > alcance + 2 * Math.max(A.m, B.m)) continue; // lejos: no tienen nada que ver
    const ids = [A.c.id, B.c.id], mismaAltura = A.s[0] < B.s[1] - 0.2 && B.s[0] < A.s[1] - 0.2;
    if (Math.abs(A.m - B.m) > 1e-3) { out.push({ k: 'engr-modulo', n: 'error', ids, t: '⚙️ ' + nom(A) + ' y ' + nom(B) + ' NO ENGRANAN: dientes de distinto tamaño (módulo ' + n2(A.m) + ' y ' + n2(B.m) + '). Pon a los dos el mismo módulo.' }); continue; }
    if (!mismaAltura) { if (Math.abs(d - a) < 0.5) out.push({ k: 'engr-altura', n: 'aviso', ids, t: '⚙️ ' + nom(A) + ' y ' + nom(B) + ' están a la distancia buena pero a DISTINTA ALTURA: los dientes no se tocan.' }); continue; }
    // dónde tiene que ir B: en la misma dirección, a la distancia exacta (y, si están planas, girada para que los dientes entren)
    const u = d > 1e-6 ? rad.map(v => v / d) : [1, 0, 0], destino = [0, 1, 2].map(k => A.cen[k] + along * A.eje[k] + u[k] * a);
    const mover = { tipo: 'mover', id: B.c.id, delta: [0, 1, 2].map(k => destino[k] - B.cen[k]) };
    if (A.plano && B.plano && B.top) { // girada para que los dientes entren, y su EJE en el sitio exacto (girar mueve el eje si está descentrado)
      const rz = giroPareja(A.z, A.c.t.rot[2] || 0, B.z, Math.atan2(u[1], u[0]) * 180 / Math.PI), a2 = rz * Math.PI / 180, co = Math.cos(a2), si = Math.sin(a2);
      mover.rotZ = Math.round(rz * 1000) / 1000; mover.pos = [destino[0] - (co * B.dc[0] - si * B.dc[1]), destino[1] - (si * B.dc[0] + co * B.dc[1]), B.c.t.pos[2] + destino[2] - B.cen[2]];
    }
    const arreglo = { t: '🔧 Ponerlas engranando (' + n2(a) + ' mm)', hacer: mover };
    const txt = ' (' + n2(d) + ' mm entre centros; deben estar a ' + n2(a) + ' = módulo ' + n2(A.m) + ' × (' + A.z + ' + ' + B.z + ') / 2).';
    if (d < a - 0.05) out.push({ k: 'engr-clavan', n: 'error', ids, t: '⚙️ ' + nom(A) + ' y ' + nom(B) + ' SE CLAVAN: están demasiado juntas y NO GIRARÁN' + txt, arreglos: [arreglo] });
    else if (d <= a + 0.05) out.push({ k: 'engr-ok', n: 'ok', ids, t: '⚙️ ' + nom(A) + ' y ' + nom(B) + ' ENGRANAN: ' + n2(d) + ' mm entre centros (relación ' + n2(B.z / A.z) + ':1).', arreglos: mover.rotZ != null ? [{ t: '🔧 Encajar los dientes', hacer: Object.assign({}, mover, { delta: [0, 0, 0] }) }] : [] });
    else if (d <= a + 0.5) out.push({ k: 'engr-flojas', n: 'aviso', ids, t: '⚙️ ' + nom(A) + ' y ' + nom(B) + ' engranan FLOJAS: con fuerza pueden saltar' + txt, arreglos: [arreglo] });
    else out.push({ k: 'engr-lejos', n: 'error', ids, t: '⚙️ ' + nom(A) + ' y ' + nom(B) + ' NO LLEGAN a engranar' + txt, arreglos: [arreglo] });
  }
  return out;
}

// ---------- lo que se puede tocar para arreglar una holgura ----------
// 1) si la pieza de FUERA es del catálogo y tiene «encaje» (presión / justo / gira): se cambia ahí (es su agujero)
// 2) si el agujero lo hace un HUECO: se agranda o se achica (desfase del hueco)
// 3) si no: se adelgaza o engorda la de DENTRO (desfase)
function arreglosHolgura(P, PR, catalogo, dentro, fuera, gap, actual, dir) {
  const out = [], cF = PR.busca(P, fuera.sub || fuera.id), cD = PR.busca(P, dentro.sub || dentro.id);
  // un CILINDRO (eje o agujero) se arregla cambiando su DIÁMETRO (exacto) si la holgura es «de lado» (alrededor de su eje)
  const ejeDe = c => { const e = PR.matrizMundo(P, c.id).elements, l = Math.hypot(e[8], e[9], e[10]) || 1; return [e[8] / l, e[9] / l, e[10] / l]; };
  const cil = c => c && c.tipo === 'cilindro' && !(c.mods && c.mods.length) && !(Math.abs(Number(c.p.desfase) || 0) >= 0.005) && Math.abs(Math.abs(c.t.esc[0]) - 1) < 1e-6 && Math.abs(Math.abs(c.t.esc[1]) - 1) < 1e-6;
  const deLado = c => { const a = ejeDe(c); if (dir) { const l = Math.hypot(...dir) || 1; return Math.abs((dir[0] * a[0] + dir[1] * a[1] + dir[2] * a[2]) / l) < 0.5; } return cil(cD) && Math.abs(a[0] * ejeDe(cD)[0] + a[1] * ejeDe(cD)[1] + a[2] * ejeDe(cD)[2]) > 0.99; };
  const ENC = catalogo && cF && cF.tipo === 'cat' && catalogo.DISENOS[cF.p.k] && (catalogo.especDe(cF.p.k) || []).find(x => x.k === 'encaje' && x.ops);
  const huecoDe = () => { // el hueco que hace el agujero: el que más se cruza con la pieza de dentro
    const cd = dentro.caja; let mejor = null, mv = 0;
    PR.recorre(P.cuerpos, c => { if (!c.hueco || c.oculto) return; const b = PR.cajaMundoId(P, c.id); if (!b || !cruzan(b, cd, 0.6)) return; const v = [0, 1, 2].reduce((s, k) => s * Math.max(0, Math.min(b.max[k], cd.max[k] + 0.6) - Math.max(b.min[k], cd.min[k] - 0.6)), 1); if (v > mv) { mv = v; mejor = c; } });
    return mejor;
  };
  const H = ENC ? null : huecoDe();
  [['gira', '🔄 Que gire'], ['justo', '✋ Justo'], ['presion', '🔒 A presión']].forEach(([cl, t]) => {
    if (cl === actual) return;
    const delta = ENCAJES[cl] - gap; // lo que hay que abrir (+) o cerrar (−) por lado
    if (ENC && ENC.ops.some(o => o[0] === cl)) out.push({ t: t + ' (' + n2(ENCAJES[cl]) + ')', hacer: { tipo: 'param', id: cF.id, k: 'encaje', v: cl }, de: '«' + (cF.nombre || 'pieza') + '» → encaje ' + cl });
    else if (H && cil(H) && deLado(H)) out.push({ t: t + ' (' + n2(ENCAJES[cl]) + ')', hacer: { tipo: 'param', id: H.id, k: 'd', v: Math.round((Number(H.p.d) + 2 * delta) * 1000) / 1000 }, de: 'el agujero pasa a Ø' + n2(Number(H.p.d) + 2 * delta) + ' mm' });
    else if (H && H.tipo !== 'grupo') out.push({ t: t + ' (' + n2(ENCAJES[cl]) + ')', hacer: { tipo: 'desfase', id: H.id, suma: Math.round(delta * 1000) / 1000 }, de: (delta > 0 ? 'agrando' : 'cierro') + ' el agujero ' + n2(Math.abs(delta)) + ' mm' });
    else if (cD && cil(cD) && deLado(cD)) out.push({ t: t + ' (' + n2(ENCAJES[cl]) + ')', hacer: { tipo: 'param', id: cD.id, k: 'd', v: Math.round((Number(cD.p.d) - 2 * delta) * 1000) / 1000 }, de: '«' + (cD.nombre || 'pieza') + '» pasa a Ø' + n2(Number(cD.p.d) - 2 * delta) + ' mm' });
    else if (cD && cD.tipo !== 'grupo') out.push({ t: t + ' (' + n2(ENCAJES[cl]) + ')', hacer: { tipo: 'desfase', id: cD.id, suma: -Math.round(delta * 1000) / 1000 }, de: (delta > 0 ? 'adelgazo' : 'engordo') + ' «' + (cD.nombre || 'pieza') + '» ' + n2(Math.abs(delta)) + ' mm' });
  });
  return out.filter(a => Math.abs((a.hacer.suma ?? 1)) >= 0.005);
}

// ---------- TODO: lo que mira el chivato (R = PR.evaluar(P)) ----------
const CHOQUES = new Map();
export function analiza(P, R, PR, o = {}) {
  const t0 = performance.now(), out = [], catalogo = o.catalogo || null;
  if (!R || !R.partes) return { lista: out, ms: 0 };
  const partes = R.partes.filter(x => x.vista && x.caja), nombre = x => { const c = PR.busca(P, x.sub || x.id); return '«' + ((c && (c.nombre || PR.nombreTipo(c))) || 'pieza') + '»'; };
  const nodo = x => PR.busca(P, x.id);
  const unidas = (a, b) => { const A = nodo(a), B = nodo(b); return (A && A.une === b.id) || (B && B.une === a.id); };
  // 0) los engranajes van aparte (su «holgura» es el juego entre dientes): se miran con engranes()
  let engr = []; try { engr = engranes(P, PR); } catch (e) { }
  const ruedas = new Set(); PR.recorre(P.cuerpos, c => { if (c.tipo === 'cat' && c.p && c.p.k === 'engranaje') ruedas.add(c.id); });
  const parEngr = new Map(); engr.forEach(x => parEngr.set(x.ids.slice().sort().join('|'), x));
  // 1) parejas candidatas: de distinto componente, cerca (≤ 0,6 mm)
  let parejas = [];
  for (let i = 0; i < partes.length; i++) for (let j = i + 1; j < partes.length; j++) { const a = partes[i], b = partes[j]; if (a.id === b.id || unidas(a, b) || !cruzan(a.caja, b.caja, CORTES.holgado)) continue; parejas.push([a, b]); }
  if (parejas.length > 40) { const s = new Set(o.sel || []); parejas = parejas.filter(([a, b]) => s.has(a.id) || s.has(b.id)).slice(0, 40); }
  try {
    parejas.forEach(([a, b]) => {
      if (performance.now() - t0 > (o.tiempo || 1500)) return;
      const ids = [a.sub || a.id, b.sub || b.id], N2 = anidadas(a, b), dentro = N2.frac >= 0.6 ? N2 : null;
      // ¿se pisan? (con las piezas de verdad: Manifold)
      let ch = null;
      if (cruzan(a.caja, b.caja, 0) && a.clave && b.clave && a.hazM && b.hazM) {
        const k = a.clave + '|' + b.clave; ch = CHOQUES.get(k);
        if (!ch) { try { const I = a.hazM().intersect(b.hazM()), v = I.volume(); ch = { v, area: v > 0 ? I.surfaceArea() : 0 }; } catch (e) { ch = { v: 0, area: 0 }; } finally { N.limpia(); } if (CHOQUES.size > 300) CHOQUES.delete(CHOQUES.keys().next().value); CHOQUES.set(k, ch); }
      }
      if (ruedas.has(a.sub || a.id) && ruedas.has(b.sub || b.id)) { // dos ruedas: a buena distancia pero con los dientes pisados = no girarán
        const x = parEngr.get(ids.slice().sort().join('|'));
        if (ch && ch.v > 0.002 && x && x.k === 'engr-ok') { x.k = 'engr-dientes'; x.n = 'error'; x.choque = true; x.t = x.t.replace(' ENGRANAN: ', ' están a la distancia buena pero los DIENTES SE PISAN (así no giran): ') + ' Pulsa «Encajar los dientes».'; }
        return;
      }
      if (ch && ch.v > 0.002) {
        const menor = Math.min(a.vol || Infinity, b.vol || Infinity), mete = ch.area > 0 ? 2 * ch.v / ch.area : 0;
        if (ch.v / menor > 0.2) { out.push({ k: 'funden', n: 'info', ids, t: '🧩 ' + nombre(a) + ' y ' + nombre(b) + ' se pisan: al imprimirlas juntas salen como UNA sola pieza.' }); return; }
        if (dentro) out.push({ k: 'choca', n: 'error', ids, choque: true, t: '⛔ ' + nombre(dentro.dentro) + ' NO ENTRA en ' + nombre(dentro.fuera) + ': le sobran ≈ ' + n2(mete) + ' mm por lado (se pisan ' + n1(ch.v) + ' mm³).', arreglos: arreglosHolgura(P, PR, catalogo, dentro.dentro, dentro.fuera, -mete, 'choca', null) });
        else out.push({ k: 'choca', n: 'error', ids, choque: true, t: '⛔ ' + nombre(a) + ' CHOCA con ' + nombre(b) + ': se pisan ' + n1(ch.v) + ' mm³ (≈ ' + n2(mete) + ' mm).' });
        return;
      }
      // ¿cuánto aire queda entre las dos? (la menor distancia de verdad)
      const r = distancia(mallaMundo(a), mallaMundo(b), a.caja, b.caja);
      if (!isFinite(r.d)) return;
      const cl = claseHolgura(r.d), dd = n2(r.d) + ' mm' + (r.aprox ? ' (aprox.)' : ''), donde = r.pa && r.pb ? r.pa.map((v, k) => (v + r.pb[k]) / 2) : null;
      if (!cl) return;
      if (dentro) {
        const D = nombre(dentro.dentro), F = nombre(dentro.fuera), arreglos = arreglosHolgura(P, PR, catalogo, dentro.dentro, dentro.fuera, r.d, cl, r.pa && r.pb && r.d > 0.002 ? r.pb.map((v, k) => v - r.pa[k]) : null);
        const T = { pegadas: ['error', '⛔ ' + D + ' NO ENTRA en ' + F + ': holgura ' + dd + '. Necesita 0,05 para entrar a presión o 0,15 para girar.'],
          presion: ['ok', '🔒 ' + D + ' entra A PRESIÓN en ' + F + ' (holgura ' + dd + ' por lado): queda fija, NO gira.'],
          justo: ['ok', '✋ ' + D + ' entra JUSTO en ' + F + ' (holgura ' + dd + ' por lado): se mueve con roce.'],
          gira: ['ok', '🔄 ' + D + ' GIRA en ' + F + ' (holgura ' + dd + ' por lado).'],
          holgado: ['aviso', '↔️ ' + D + ' va HOLGADO en ' + F + ' (holgura ' + dd + ' por lado): baila.'] }[cl];
        out.push({ k: cl, n: T[0], ids, t: T[1], d: r.d, donde, arreglos, fit: true, dentro: dentro.dentro.sub || dentro.dentro.id, fuera: dentro.fuera.sub || dentro.fuera.id });
      } else if (cl === 'pegadas') out.push({ k: 'tocan', n: 'info', ids, d: r.d, donde, t: '🧲 ' + nombre(a) + ' y ' + nombre(b) + ' se tocan: si las imprimes juntas salen PEGADAS.' });
      else if (r.d < 0.3) out.push({ k: 'cerca', n: 'aviso', ids, d: r.d, donde, t: '↔️ ' + nombre(a) + ' y ' + nombre(b) + ' quedan a ' + dd + ': impresas juntas pueden quedarse pegadas (sepáralas al menos 0,3).' });
    });
  } finally { N.limpia(); }
  // 2) engranajes
  out.push(...engr);
  // 3) en el aire: no toca la cama ni se apoya en otra pieza
  const comp = new Map(); partes.forEach(x => { const c = comp.get(x.id); if (!c) comp.set(x.id, { id: x.id, caja: x.caja }); else c.caja = { min: c.caja.min.map((v, k) => Math.min(v, x.caja.min[k])), max: c.caja.max.map((v, k) => Math.max(v, x.caja.max[k])) }; });
  const L = [...comp.values()];
  L.forEach(x => {
    if (x.caja.min[2] <= 0.05) return;
    const apoya = L.some(y => y !== x && y.caja.min[2] < x.caja.min[2] - 0.01 && y.caja.max[2] >= x.caja.min[2] - 0.05 && y.caja.min[0] < x.caja.max[0] && x.caja.min[0] < y.caja.max[0] && y.caja.min[1] < x.caja.max[1] && x.caja.min[1] < y.caja.max[1]);
    const c = PR.busca(P, x.id);
    if (!apoya && c) out.push({ k: 'aire', n: 'aviso', ids: [x.id], t: '🪂 «' + (c.nombre || PR.nombreTipo(c)) + '» está EN EL AIRE (a ' + n1(x.caja.min[2]) + ' mm de la cama): no se puede imprimir así.', arreglos: [{ t: '⤓ A la cama', hacer: { tipo: 'cama', id: x.id } }] });
  });
  const orden = { error: 0, aviso: 1, ok: 2, info: 3 };
  out.sort((a, b) => orden[a.n] - orden[b.n]);
  return { lista: out, ms: Math.round(performance.now() - t0) };
}
export const peor = L => (L.some(x => x.n === 'error') ? 'error' : L.some(x => x.n === 'aviso') ? 'aviso' : L.some(x => x.n === 'ok') ? 'ok' : 'nada');

// ---------- 🔍 COMPROBAR EL MOVIMIENTO («si esto no gira»): recorre la animación y mira si algo choca, y CUÁNDO ----------
// partes = R.partes (con hazM), anim = la función de la animación (t → { id: Matrix4 }), periodo en segundos.
export function barrido(partes, anim, periodo, o = {}) {
  const t0 = performance.now(), pasos = Math.max(12, Math.min(o.pasos || 72, 180)), umbral = o.umbral ?? 0.01;
  const L = partes.filter(x => x.hazM && x.caja), base = new Map();
  const D0 = anim(0) || {}, mueve = new Set(Object.keys(D0));
  let peorChoque = null, primero = null, hechos = 0;
  try {
    L.forEach(x => base.set(x, N.guarda(x.hazM())));
    for (let s = 0; s < pasos; s++) {
      if (performance.now() - t0 > (o.tiempo || 6000)) break;
      const t = periodo * s / pasos, D = anim(t) || {};
      const cajaT = x => { const M = D[x.id]; if (!M) return x.caja; const e = M.elements, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < 8; i++) { const p = [i & 1 ? x.caja.max[0] : x.caja.min[0], i & 2 ? x.caja.max[1] : x.caja.min[1], i & 4 ? x.caja.max[2] : x.caja.min[2]]; for (let k = 0; k < 3; k++) { const w = e[k] * p[0] + e[4 + k] * p[1] + e[8 + k] * p[2] + e[12 + k]; mn[k] = Math.min(mn[k], w); mx[k] = Math.max(mx[k], w); } }
        return { min: mn, max: mx }; };
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
        const a = L[i], b = L[j]; if (a.id === b.id || (!mueve.has(a.id) && !mueve.has(b.id))) continue;
        const ca = cajaT(a), cb = cajaT(b); if (!cruzan(ca, cb, 0)) continue;
        const ma = D[a.id] ? N.transforma(base.get(a), D[a.id]) : base.get(a), mb = D[b.id] ? N.transforma(base.get(b), D[b.id]) : base.get(b);
        const v = ma.intersect(mb).volume(); hechos++;
        if (v > umbral) { const x = { t, a: a.sub || a.id, b: b.sub || b.id, v }; if (!primero) primero = x; if (!peorChoque || v > peorChoque.v) peorChoque = x; }
        N.limpia();
      }
    }
  } finally { base.forEach(m => { try { m.delete(); } catch (e) { } }); N.limpia(); }
  return { ok: !primero, primero, peor: peorChoque, pasos, comprobaciones: hechos, ms: Math.round(performance.now() - t0) };
}
