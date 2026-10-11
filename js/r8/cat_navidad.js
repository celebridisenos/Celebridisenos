// ================= v30.4 · 🎄 MÁS NAVIDAD: pueblo navideño (casitas para luz LED), adornos con nombre, calendario de adviento,
// farol con siluetas que brillan y belén de pie con peana (caja de luz) =================
// La dueña (11-10-2026): «más Navidad: belén de pie con peana, adornos para el árbol con nombre, pueblo navideño (casitas para luz
// LED), calendario de adviento, portavelas». Todo diseñado aquí; las siluetas que se usan son las de dominio público (CC0) de
// siluetas_cc0.js. Pensado para imprimir SIN soportes: tejados a 50° o más, aleros achaflanados a 45°, ventanas en arco.
// Vela LED de té estándar: Ø38 × 16 mm (se comprueba con la de verdad: la medida va en un campo).
import * as N from './nucleo.js';
import { circulo, rectR } from './motor.js';
import { silueta } from './cat_siluetas.js';
import { SILUETAS } from './siluetas_cc0.js';
import { huecoConTecho } from './cat_referencias.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const M = () => N.MF(), CS = () => N.CSX();
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const circ = d => N.cs([N.ccw(circulo(d / 2, 0, 0, seg(d)))], 'Positive');
const rr = (w, h, r = 0) => N.cs([N.ccw(rectR(w, h, r))], 'Positive');
const poli = P => N.cs([N.ccw(P)], 'Positive');
const cil = (d, h, z = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([0, 0, z]);
const caja = (x, y, z) => M().cube([x, y, z], true).translate([0, 0, z / 2]);
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const R2 = Math.PI / 180;
// un dibujo 2D (x, y) puesto de pie: x → X, y → Z, atravesando en Y (centrado) · en X (centrado) · a lo largo de X (sección en YZ)
const porY = (cs, L) => cs.extrude(L).rotate([90, 0, 0]).translate([0, L / 2, 0]);
const porX = (cs, L) => porY(cs, L).rotate([0, 0, 90]);
const aLoLargoX = (cs, L) => cs.extrude(L).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([-L / 2, 0, 0]);
// ventana en arco (sin puentes: el arco se imprime solo), con su cruz de parteluz si hay sitio
function ventana(w, h, cruz = true, x = 0, z = 0) {
  let v = rr(w, Math.max(0.1, h - w / 2)).translate([0, (h - w / 2) / 2]).add(circ(w).translate([0, h - w / 2]));
  if (cruz && w >= 7) { const b = Math.max(1.2, w * 0.1); v = v.subtract(rr(b, 2 * h).translate([0, h / 2])); } // solo el parteluz vertical: un travesaño sería un puente en el aire
  return v.translate([x, z]);
}
const ojo = (d, x, z, cruz = true) => { let o = circ(d); if (cruz && d >= 8) { const b = Math.max(1.2, d * 0.1); o = o.subtract(rr(b, d * 2)); } return huecoConTecho(o).translate([x, z]); };
// silueta con los agujeros RELLENOS (para calar o rebajar: si no, lo de dentro de un agujero quedaría suelto)
function sinAgujeros(cs) { const P = cs.toPolygons().filter(q => { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += q[j][0] * q[i][1] - q[i][0] * q[j][1]; return a > 0; }); return P.length ? N.cs(P, 'Positive') : cs; }
// encajar un dibujo 2D en una caja w × h (centrado en 0, 0)
function encaja(cs, w, h) { const b = N.cajaCS(cs), k = Math.min(w / b.w, h / b.h); return N.centraCS(cs).scale([k, k]); }
// ---------- dibujos propios sencillos (árbol, estrella, copo, casita) ----------
function arbol2(alto) {
  const w = alto * 0.62; let a = rr(alto * 0.1, alto * 0.16).translate([0, alto * 0.08]);
  [[0.14, 1], [0.40, 0.78], [0.63, 0.56]].forEach(([y0, f]) => { a = a.add(poli([[-w / 2 * f, alto * y0], [w / 2 * f, alto * y0], [0, alto * (y0 + 0.36)]])); });
  a = a.offset(-alto * 0.012, 'Round').offset(alto * 0.012, 'Round');
  return a.add(N.cs([N.ccw(N.estrella2(5, alto * 0.075, alto * 0.032))], 'Positive').translate([0, alto * 0.95]));
}
const estrella2 = (d, puntas = 5) => N.cs([N.ccw(N.estrella2(puntas, d / 2, d * 0.2))], 'Positive');
function copo2(d) {
  const r = d / 2, g = Math.max(1.4, d * 0.06); let f = circ(d * 0.2);
  for (let i = 0; i < 6; i++) { let br = rr(g, r).translate([0, r / 2]); [0.45, 0.72].forEach((t, k) => { const l = r * (0.32 - k * 0.1); [-1, 1].forEach(sg => { br = br.add(rr(g * 0.9, l).translate([0, l / 2]).rotate(sg * 50).translate([0, r * t])); }); }); f = f.add(br.rotate(i * 60)); }
  return f;
}
const MOTIVOS = { reno: () => silueta('renoSalto', 100), ciervo: () => silueta('ciervoCabeza', 100), belen: () => silueta('belen', 100), trineo: () => silueta('trineoRenos', 100), arbol: () => arbol2(100), estrella: () => estrella2(100), copo: () => copo2(100) };
const SERIES = { mixto: ['reno', 'arbol', 'estrella', 'ciervo', 'copo', 'belen', 'arbol', 'estrella'], renos: ['reno', 'arbol'], arboles: ['arbol', 'estrella', 'copo'], belen: ['belen', 'estrella', 'arbol'] };

// ======================= 🏘️ PUEBLO NAVIDEÑO: casitas para una vela LED =======================
// Hueca, abierta por debajo: se pone ENCIMA de la vela LED. Tejado de dos aguas a 50–62° con alero achaflanado (sin soportes).
function casita(p) {
  const a = p.tam, e = p.pared, led = p.led;
  const T = { casa: [1, 0.74, 0.7, 50], iglesia: [1.05, 0.62, 0.72, 55], tienda: [0.95, 0.72, 0.82, 47], cabana: [0.9, 0.86, 0.16, 62] }[p.tipo] || [1, 0.74, 0.7, 50];
  let W = a * T[0], D = Math.max(a * T[1], led + 2 * e + 4), Hw = a * T[2]; const P = T[3] * R2, tg = Math.tan(P), al = Math.min(3.5, a * 0.05), t = e / Math.cos(P);
  if (p.tipo === 'cabana') { Hw = Math.max(Hw, 6); W = Math.max(W, led + 2 * e + 4); }
  const zo = y => Hw + (D / 2 + al - Math.abs(y)) * tg, zi = y => zo(y) - t; // tejado por fuera y por dentro
  const cuerpo = aLoLargoX(poli([[-D / 2, 0], [D / 2, 0], [D / 2, zi(D / 2) + 0.4], [0, zi(0) + 0.4], [-D / 2, zi(D / 2) + 0.4]]), W);
  const hueco = aLoLargoX(poli([[-(D / 2 - e), -1], [D / 2 - e, -1], [D / 2 - e, zi(D / 2 - e)], [0, zi(0)], [-(D / 2 - e), zi(D / 2 - e)]]), W - 2 * e);
  const sec = dz => poli([[-D / 2, Hw - al - dz], [-D / 2 - al, Hw - dz], [0, zo(0) - dz], [D / 2 + al, Hw - dz], [D / 2, Hw - al - dz]]);
  const Lt = W + 2, tejado = aLoLargoX(sec(0), Lt).subtract(aLoLargoX(sec(0).offset(-e, 'Miter'), Lt + 2)); // grosor uniforme (lo de dentro lo quita el hueco)
  let m = cuerpo.add(tejado);
  // chimenea (por detrás): lo que entra en la casa se va con el hueco
  if (p.tipo !== 'iglesia') { const cw = a * 0.12, xc = W * 0.22, yc = D * 0.22; m = m.add(caja(cw, cw, zo(yc) + a * 0.14 - Hw * 0.6).translate([xc, yc, Hw * 0.6])).add(caja(cw + 2, cw + 2, 2.4).translate([xc, yc, zo(yc) + a * 0.14 - 2.4])); }
  const cortes = [], rebajes = [];
  const hv = Math.min(Hw * 0.42, 26), wv = Math.min(W * 0.16, 16);
  if (p.tipo === 'casa') {
    cortes.push(porY(ventana(wv, hv, true, -W * 0.27, Hw * 0.3).add(ventana(wv, hv, true, W * 0.27, Hw * 0.3)), D + 10));
    cortes.push(porX(ojo(Math.min(D * 0.26, (zo(0) - Hw) * 0.55), 0, Hw + (zo(0) - Hw) * 0.36).add(ventana(wv, hv, true, 0, Hw * 0.3)), W + 10));
  } else if (p.tipo === 'tienda') {
    const ws = W * 0.5, hs = Hw * 0.34, z0 = Hw * 0.16; let esc = rr(ws, hs).translate([-W * 0.12, z0 + hs / 2]); const b = 1.4;
    [1, 2].forEach(i => { esc = esc.subtract(rr(b, hs * 2).translate([-W * 0.12 - ws / 2 + ws * i / 3, z0 + hs / 2])); }); 
    cortes.push(porY(esc, D + 10).translate([0, 0, 0]));
    cortes.push(porX(ventana(wv, hv, true, 0, Hw * 0.42).add(ojo(Math.min(D * 0.24, (zo(0) - Hw) * 0.5), 0, Hw + (zo(0) - Hw) * 0.36)), W + 10));
    // toldo en cuña (por debajo a 45°) y cartel con el nombre
    const aw = Math.min(8, a * 0.1), zt = z0 + hs + aw * 2 + 2; m = m.add(aLoLargoX(poli([[0, zt], [-aw, zt - aw], [0, zt - 2 * aw]]), ws + 6).translate([-W * 0.12, -D / 2 + 0.3, 0]));
    const tc = String(p.cartel || '').trim(); if (tc) { const hc = Math.min(Hw * 0.16, 12), zc = Math.min(Hw - hc / 2 - 1.5, zt + 2 + hc / 2); let L = N.centraCS(N.texto2(tc, 'clasica', hc * 0.58)); const bL = N.cajaCS(L); if (bL.w > W * 0.8) L = L.scale([W * 0.8 / bL.w, W * 0.8 / bL.w]); const wc = Math.min(W - 6, N.cajaCS(L).w + 8);
      m = m.add(porY(rr(wc, hc, 1.5), 1.6).translate([0, -D / 2 - 0.5, zc - hc / 2 + hc / 2]).translate([0, 0, 0])).add(porY(L, 1.2).translate([0, -D / 2 - 1.7, zc])); }
  } else if (p.tipo === 'cabana') {
    const hg = zo(0) - Hw, hd = Math.min(30, Hw * 0.9 + hg * 0.22), z0 = hd + 4, hw0 = D / 2 - (z0 - Hw) / tg - 6, b = 1.4;
    if (hw0 > 6) { let tri = poli([[-hw0, z0], [hw0, z0], [0, z0 + hw0 * tg * 0.92]]); tri = tri.subtract(rr(b, hg * 3).translate([0, z0])); cortes.push(porX(tri, W + 10)); }
    cortes.push(porX(ventana(Math.min(wv, 9), Math.min(hd * 0.7, 14), true, -D * 0.3, Hw * 0.3).add(ventana(Math.min(wv, 9), Math.min(hd * 0.7, 14), true, D * 0.3, Hw * 0.3)), W + 10));
  } else if (p.tipo === 'iglesia') {
    [-0.28, 0, 0.28].forEach(f => cortes.push(porY(ventana(wv * 0.8, Hw * 0.55, false, W * f, Hw * 0.22), D + 10)));
    // torre delante (en el lado −X), hueca, con campanario en arco, chapitel a 4 aguas y cruz
    const tw = Math.max(a * 0.36, 22), Ht = zo(0) + a * 0.32, xt = -W / 2 - tw / 2 + e, hc2 = tw * 1.15;
    const torre = caja(tw, tw, Ht).translate([xt, 0, 0]), hT = caja(tw - 2 * e, tw - 2 * e, Ht + 0.02).translate([xt, 0, -1]);
    const rc = tw / Math.SQRT2 + 1.2, chap = M().cylinder(hc2, rc, 0, 4).rotate([0, 0, 45]).translate([xt, 0, Ht - 0.4]), chapI = M().cylinder(hc2 - t * 1.6, rc - t * 1.2, 0, 4).rotate([0, 0, 45]).translate([xt, 0, Ht - 0.42]);
    const cruz = caja(2.4, 2.4, tw * 0.5).translate([xt, 0, Ht + hc2 - 2]).add(caja(tw * 0.32, 2.4, 2.4).translate([xt, 0, Ht + hc2 + tw * 0.3]));
    m = m.add(torre.add(chap).add(cruz)); rebajes.push(hT.add(chapI));
    const wb = tw * 0.42, hb = Math.min(tw * 0.75, Ht - zo(0) - 6), zb = Ht - hb - 4;
    cortes.push(porY(ventana(wb, hb, false, xt, zb), tw + 10)); cortes.push(porX(ventana(wb, hb, false, 0, zb), tw + 10).translate([xt, 0, 0]));
    cortes.push(porX(ojo(tw * 0.42, 0, Hw * 0.68), 12).translate([xt - tw / 2, 0, 0]));
  }
  m = m.subtract(hueco); rebajes.forEach(r => { m = m.subtract(r); });
  if (cortes.length) m = m.subtract(N.union(cortes));
  // puerta: rebajada 0,8 mm (la luz sale por su ventanuco redondo); la de la iglesia, en la torre
  const hp = Math.min(Hw * (p.tipo === 'cabana' ? 3 : 0.55), 30), wp = Math.min(W * 0.17, 16);
  if (p.tipo === 'iglesia') { const tw = Math.max(a * 0.36, 22), xt = -W / 2 - tw / 2 + e; m = m.subtract(porX(ventana(Math.min(wp, tw * 0.5), Math.min(hp, Hw * 0.5), false), 1.6).translate([xt - tw / 2, 0, 0])); }
  else if (p.tipo === 'cabana') { const hd = Math.min(30, Hw * 0.9 + (zo(0) - Hw) * 0.22); m = m.subtract(porX(ventana(wp, hd, false, 0, 0), 1.6).translate([-W / 2, 0, 0])).subtract(porX(ojo(wp * 0.36, 0, hd * 0.62, false), 6).translate([-W / 2, 0, 0])); }
  else { const xp = p.tipo === 'tienda' ? W * 0.3 : 0; m = m.subtract(porY(ventana(wp, hp, false, xp, 0), 1.6).translate([0, -D / 2, 0])).subtract(porY(ojo(wp * 0.36, xp, hp * 0.62, false), 6).translate([0, -D / 2, 0])); }
  return p.tipo === 'cabana' ? m.rotate([0, 0, 90]) : m;
}

// ======================= 🎄 ADORNO PARA EL ÁRBOL CON NOMBRE =======================
function formaAdorno(f, A) {
  if (f === 'bola') return circ(A * 0.86).translate([0, -A * 0.07]).add(rr(A * 0.24, A * 0.12, 1).translate([0, A * 0.38]));
  if (f === 'estrella') return N.cs([N.ccw(N.estrella2(5, A / 2, A * 0.23))], 'Positive').offset(-A * 0.03, 'Round').offset(A * 0.03, 'Round');
  if (f === 'corazon') return N.cs([N.ccw(N.corazon2(A))], 'Positive');
  if (f === 'campana') { const Pp = []; for (let i = 0; i <= 24; i++) { const t = i / 24, y = A * (0.42 - t * 0.84), w = A * (0.14 + 0.36 * Math.pow(t, 2.2)); Pp.push([w, y]); } const Q = Pp.concat(Pp.slice().reverse().map(([x, y]) => [-x, y])); return poli(Q).add(circ(A * 0.3).translate([0, A * 0.36])).offset(-A * 0.02, 'Round').offset(A * 0.02, 'Round'); }
  if (f === 'arbol') { const T = N.centraCS(arbol2(A * 0.86)).translate([0, A * 0.07]); return T.add(poli([[-A * 0.3, -A * 0.5], [A * 0.3, -A * 0.5], [A * 0.34, -A * 0.3], [-A * 0.34, -A * 0.3]]).offset(-1.5, 'Round').offset(1.5, 'Round')); }
  if (f === 'bota') { const Q = [[-0.22, 0.36], [0.12, 0.36], [0.12, -0.1], [0.36, -0.22], [0.45, -0.34], [0.38, -0.5], [-0.12, -0.5], [-0.22, -0.4]].map(([x, y]) => [x * A, y * A]); return poli(Q).offset(-A * 0.06, 'Round').offset(A * 0.06, 'Round').add(rr(A * 0.48, A * 0.2, A * 0.05).translate([-A * 0.05, A * 0.4])); }
  return circ(A);
}
function adornoNombre(p) {
  const A = p.alto, g = p.grosor, f = formaAdorno(p.forma, A), b = N.cajaCS(f), borde = Math.max(1.6, A * 0.03);
  let m = f.extrude(g).add(f.subtract(f.offset(-borde, 'Round')).extrude(1.2).translate([0, 0, g - 0.01]));
  // anilla para colgar arriba (la de la bola, en su tapón)
  const arriba = f.intersect(rr(1.2, A * 4)), ya = (arriba.isEmpty() ? b.max[1] : N.cajaCS(arriba).max[1]) + 2.2, anilla = circ(8.4).subtract(circ(4.2)).translate([0, ya]); m = m.add(anilla.extrude(g));
  const t = String(p.nombre || '').trim(), t2 = String(p.linea2 || '').trim(), dentro = f.offset(-borde - 0.8, 'Round');
  const Y = { bola: [-0.02, -0.22], estrella: [0.02, -0.15], corazon: [0.08, -0.12], campana: [-0.12, -0.3], arbol: [-0.4, -0.17], bota: [0.4, 0.1] }[p.forma] || [0, -0.2];
  // cuánto ancho hay a esa altura (para que el nombre quepa de verdad)
  const linea = y => { const I = dentro.intersect(rr(A * 4, 0.4).translate([0, y])); if (I.isEmpty()) return null; const b2 = N.cajaCS(I); return [b2.min[0], b2.max[0]]; };
  const hueco = (y, h) => { let x0 = -Infinity, x1 = Infinity; for (const yy of [y - h / 2, y, y + h / 2]) { const q = linea(yy); if (!q) return { w: 0, x: 0 }; x0 = Math.max(x0, q[0]); x1 = Math.min(x1, q[1]); } return { w: Math.max(0, x1 - x0), x: (x0 + x1) / 2 }; };
  const pon = (txt, fuente, alto, y) => { let L = N.centraCS(N.texto2(txt, fuente, alto)); const bL = N.cajaCS(L); let k = 1, H0 = hueco(y, bL.h); for (let i = 0; i < 4; i++) { k = Math.min(1, H0.w * 0.92 / bL.w); H0 = hueco(y, bL.h * k); } L = L.scale([k, k]).translate([H0.x, y]); m = m.add(L.intersect(dentro).extrude(1.2).translate([0, 0, g - 0.01])); };
  if (t) pon(t, p.fuente, A * (p.forma === 'bota' ? 0.13 : 0.2), A * Y[0] + (b.min[1] + b.max[1]) / 2 * 0);
  if (t2) pon(t2, 'gorda', A * 0.085, A * Y[1]);
  return m;
}

// ======================= 📅 CALENDARIO DE ADVIENTO (árbol de 24 cajoncitos) =======================
const FILAS_ARBOL = [3, 6, 5, 4, 3, 2, 1]; // de abajo arriba: el tronco (3) y la copa (6…1) = 24
function celdasArbol(Pp) { const L = []; let k = 0; FILAS_ARBOL.forEach((nf, r) => { for (let i = 0; i < nf; i++) L.push({ x: (i - (nf - 1) / 2) * Pp, y: r * Pp, k: k++ }); }); return L; }
// el número de cada cajón: abajo los del final (el 24 en el tronco) y arriba el 1 en la punta
function numeroCelda(k) { const orden = []; let base = 0; FILAS_ARBOL.forEach(nf => { const f = []; for (let i = 0; i < nf; i++) f.push(base + i); orden.push(f); base += nf; }); const lin = orden.slice().reverse().flat(); return lin.indexOf(k) + 1; }
function calendario(p) {
  const F = p.cajon, Pp = F + 0.6, wt = 2, fondo = p.fondo, holg = 0.3, Lp = fondo + 2;
  const C = celdasArbol(Pp);
  const marco = () => { // tumbado sobre la espalda: las celdas abiertas hacia arriba (se imprime sin soportes)
    let solid = N.union(C.map(q => caja(Pp + wt, Pp + wt, Lp).translate([q.x, q.y, 0])));
    const hue = N.union(C.map(q => caja(Pp - wt, Pp - wt, Lp).translate([q.x, q.y, 2])));
    const yTop = (FILAS_ARBOL.length - 1) * Pp + Pp / 2 + wt / 2, ds = Pp * 1.25;
    solid = solid.add(estrella2(ds).extrude(Math.min(10, Lp)).translate([0, yTop + ds * 0.36, 0]));
    const pie = caja(3 * Pp + wt + 16, 4, Lp + 24).translate([0, -Pp / 2 - wt / 2 - 2 + 0.5, 0]);
    return solid.subtract(hue).add(pie);
  };
  const cajon = (num) => { // de pie, abierto por arriba: frente con el número en relieve y muesca para el dedo
    const bw = Pp - wt - 2 * holg, bh = Pp - wt - 2 * holg, bd = fondo - 0.5, pf = 2.4;
    let cuerpo = M().cube([bw, bd, bh]).translate([-bw / 2, pf - 0.4, 0]).subtract(M().cube([bw - 2.4, bd - 1.2 - 0.4, bh]).translate([-(bw - 2.4) / 2, pf, 1.2]));
    let frente = M().cube([F, pf, F]).translate([-F / 2, 0, 0]);
    let L = N.centraCS(N.texto2(String(num), 'gorda', F * 0.42)); const bL = N.cajaCS(L); if (bL.w > F * 0.78) L = L.scale([F * 0.78 / bL.w, F * 0.78 / bL.w]);
    frente = frente.add(porY(L, 1).translate([0, -0.5 + 0.01, F * 0.44]));
    const muesca = porY(circ(F * 0.34), pf * 3).translate([0, pf / 2, F]);
    return frente.add(cuerpo).subtract(muesca);
  };
  if (p.que === 'marco') return marco();
  const nums = p.que === 'cajones1' ? [...Array(12).keys()].map(i => i + 1) : p.que === 'cajones2' ? [...Array(12).keys()].map(i => i + 13) : [Math.round(p.uno || 1)];
  const L = nums.map(nu => cajon(nu)), sep = 5, porFila = 4; let x = 0, y = 0; const out = [];
  L.forEach((m, i) => { const b = N.caja(m); if (i && i % porFila === 0) { y += fondo + 2 + sep; x = 0; } out.push(m.translate([x - b.min[0], y - b.min[1], 0])); x += b.max[0] - b.min[0] + sep; });
  return N.union(out);
}

// ======================= 🏮 FAROL DE NAVIDAD (las siluetas BRILLAN al encender la vela) =======================
function farol(p) {
  const nC = Math.round(p.caras), H = p.alto, a = p.ancho / 2, e = p.pared, base = 3, banda = 5;
  const pol = ap => { const R = ap / Math.cos(Math.PI / nC), Q = []; for (let k = 0; k < nC; k++) { const f = (-90 + 180 / nC + k * 360 / nC) * R2; Q.push([R * Math.cos(f), R * Math.sin(f)]); } return poli(Q); };
  let m = pol(a).extrude(H).subtract(pol(a - e).extrude(H).translate([0, 0, base]));
  // zócalo y remate un poco más anchos (con chaflán a 45°: sin soportes)
  const s1 = (a + 1.5) / a; m = m.add(pol(a + 1.5).extrude(banda)).add(pol(a + 1.5).subtract(pol(a - e + 0.01)).extrude(1.5).translate([0, 0, banda]).subtract(pol(a + 1.5).subtract(pol(a)).extrude(1.5, 0, 0, [1 / s1, 1 / s1]).translate([0, 0, banda])));
  const anillo = pol(a).extrude(1.5, 0, 0, [s1, s1]).translate([0, 0, H - banda - 1.5]).add(pol(a + 1.5).extrude(banda + 1.5).translate([0, 0, H - banda])).subtract(pol(a - e).extrude(H).translate([0, 0, base + 0.01]));
  m = m.add(anillo);
  m = m.subtract(cil(p.led + 1, 2, base - 1)).subtract(cil(14, base + 2, -1)); // asiento de la vela y agujero para sacarla
  const wf = 2 * a * Math.tan(Math.PI / nC), zc = (H) / 2 + 0.5, hz = H - 2 * banda - 10, wz = wf - 2 * Math.max(4, e + 2);
  const serie = SERIES[p.motivo] || SERIES.mixto, hondo = p.modo === 'calado' ? e + 4 : e - p.piel;
  const cortes = [];
  for (let k = 0; k < nC; k++) {
    const mot = serie[k % serie.length]; let d2 = sinAgujeros(MOTIVOS[mot]()); d2 = encaja(d2, wz, hz * (mot === 'estrella' || mot === 'copo' ? 0.62 : 1));
    if (p.modo !== 'calado') d2 = d2.offset(-0.01); else d2 = huecoConTecho(d2, 0.4);
    // por DENTRO (modo luz: por fuera no se ve; al encender, brilla) o atravesando (calado)
    const y0 = p.modo === 'calado' ? -a - 2 : -a + p.piel;
    cortes.push(porY(d2.translate([0, zc]), hondo).translate([0, y0 + hondo / 2, 0]).rotate([0, 0, k * 360 / nC]));
  }
  return m.subtract(N.union(cortes));
}

// ======================= ⭐ BELÉN DE PIE CON PEANA (caja de luz: el belén en negro delante del cielo iluminado) =======================
function belenPeana(p) {
  const W = p.ancho, g = 3, ran = g + 0.3, hFig = W * 0.68, led = p.led;
  const pata = (w) => rr(w, 10).translate([0, -5 + 0.6]); // la pestaña que entra en la ranura
  // DELANTE: el belén (dominio público) sobre su pestaña
  let fig = silueta(p.dibujo, W * 0.92); const bF = N.cajaCS(fig); if (bF.h > hFig) fig = fig.scale([hFig / bF.h, hFig / bF.h]);
  const bF2 = N.cajaCS(fig); fig = fig.translate([-(bF2.min[0] + bF2.max[0]) / 2, -bF2.min[1]]).add(pata(Math.min(W - 6, bF2.w * 0.9)));
  // DETRÁS: el cielo, una lámina fina (1,2 mm: la luz la atraviesa) con marco de 3 mm y estrellas CALADAS (brillan como puntos de luz)
  const Hc = hFig * 1.12 + 8, arco = rr(W, Hc - W / 2).translate([0, (Hc - W / 2) / 2]).add(circ(W).translate([0, Hc - W / 2]));
  const az = (sem => () => { sem = (sem * 1664525 + 1013904223) % 4294967296; return sem / 4294967296; })(77), libre = arco.offset(-9, 'Round');
  const est = []; for (let i = 0; i < 60 && est.length < 24; i++) { const x = (az() - 0.5) * W * 0.8, y = Hc * (0.42 + az() * 0.52), d = 3.2 + az() * 4, e1 = estrella2(d).rotate(az() * 70).translate([x, y]); if (!e1.subtract(libre).isEmpty()) continue; if (est.some(q => !q.intersect(e1.offset(2)).isEmpty())) continue; est.push(e1); }
  const grande = estrella2(W * 0.12, 8).translate([W * 0.24, Hc * 0.8]); if (grande.subtract(libre).isEmpty()) est.push(grande);
  const lamina = arco.subtract(N.csUnion(est)), marco = arco.subtract(arco.offset(-3.2, 'Round'));
  const pc0 = lamina.extrude(1.2).add(marco.extrude(g)).add(pata(W - 6).extrude(g));
  // PEANA: ranura del belén delante, la del cielo detrás y, DETRÁS del cielo, el hueco de la vela (lo ilumina a contraluz)
  const hP = 18, L = W + 12, yF = -6, yB = 8, yL = yB + ran / 2 + 4 + led / 2, fondoP = yL + led / 2 + 6 + 12, y0 = -12 - 6;
  let peana = rr(L, fondoP, 5).extrude(hP).translate([0, y0 + fondoP / 2, 0]).subtract(rr(W - 4, ran, 0.2).extrude(12).translate([0, yF, hP - 10])).subtract(rr(W - 4, ran, 0.2).extrude(12).translate([0, yB, hP - 10]));
  peana = peana.subtract(cil(led + 1, 16, hP - 15).translate([0, yL, 0]));
  const tt = String(p.texto || '').trim(); if (tt) { let T = N.centraCS(N.texto2(tt, p.fuente, hP * 0.45)); const bT = N.cajaCS(T); if (bT.w > L - 14) T = T.scale([(L - 14) / bT.w, (L - 14) / bT.w]); peana = peana.subtract(porY(T, 1.6).translate([0, y0, hP / 2])); }
  if (p.que === 'peana') return peana;
  const pf = fig.extrude(g), bfig = N.cajaCS(fig), bcie = N.cajaCS(arco.add(pata(W - 6)));
  if (p.que === 'figura') return pf; if (p.que === 'cielo') return pc0;
  // todo en la cama: la peana y las dos piezas planas al lado
  return N.union([peana, pf.translate([L / 2 + 6 - bfig.min[0], y0 - bfig.min[1], 0]), pc0.translate([L / 2 + 12 + bfig.w - bcie.min[0], y0 - bcie.min[1], 0])]);
}

// ======================= 🎃 CALABAZA DE HALLOWEEN para vela LED (cara tallada, tapa con tallo) =======================
// Cuerpo cortado donde la pared pasa de 45° (arriba y abajo): se imprime sin soportes. La tapa, maciza y boca abajo no: con la cara
// plana en la cama; encaja en un collar de la calabaza (con 0,3 de holgura).
function caraCalabaza(tipo, W, H, nombre) {
  const tri = (P) => poli(P);
  if (tipo === 'nombre') { let T = N.centraCS(N.texto2(String(nombre || 'BOO').trim() || 'BOO', 'gorda', H * 0.5)); const b = N.cajaCS(T); if (b.w > W) T = T.scale([W / b.w, W / b.w]);
    // plantilla: cada agujero de letra (O, B, A…) queda unido con un puente de 2 mm, si no se caería al calar
    const P = T.toPolygons(), area = q => { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += q[j][0] * q[i][1] - q[i][0] * q[j][1]; return a / 2; };
    P.filter(q => area(q) < 0).forEach(q => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; q.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }); T = T.subtract(rr(2, (y1 - y0) * 3).translate([(x0 + x1) / 2, (y0 + y1) / 2])); });
    return T; }
  if (tipo === 'gato' || tipo === 'murcielagos') {
    const k = tipo === 'gato' ? (SILUETAS.gatoNegroAlto ? 'gatoNegroAlto' : 'gatoSentado') : (SILUETAS.murcielago ? 'murcielago' : 'gatoSalto');
    if (tipo === 'gato') return encaja(sinAgujeros(silueta(k, 100)), W * 0.8, H * 1.05).add(circ(H * 0.34).translate([W * 0.36, H * 0.38]));
    const b1 = sinAgujeros(silueta(k, 100)); return N.csUnion([encaja(b1, W * 0.62, H * 0.5).translate([0, H * 0.12]), encaja(b1, W * 0.36, H * 0.3).rotate(-14).translate([-W * 0.34, -H * 0.26]), encaja(b1, W * 0.3, H * 0.26).rotate(12).translate([W * 0.36, -H * 0.3])]);
  }
  const ojo = (sx, mala) => tri(mala ? [[sx * W * 0.08, H * 0.12], [sx * W * 0.36, H * 0.12], [sx * W * 0.13, H * 0.42]].map(([x, y]) => [x, y]) : [[sx * W * 0.1, H * 0.12], [sx * W * 0.34, H * 0.12], [sx * W * 0.22, H * 0.44]]);
  let cara = N.csUnion([ojo(-1, tipo === 'malvada'), ojo(1, tipo === 'malvada'), tri([[-W * 0.06, -H * 0.02], [W * 0.06, -H * 0.02], [0, H * 0.12]])]);
  if (tipo === 'malvada') { const P = []; const nD = 7; for (let i = 0; i <= nD; i++) { const x = -W * 0.42 + i * W * 0.84 / nD; P.push([x, -H * 0.18 - (i % 2 ? H * 0.14 : 0) - H * 0.12 * Math.cos((i / nD - 0.5) * Math.PI)]); }
    P.forEach((q, i) => { q[1] = -H * 0.18 - H * 0.12 * Math.cos((i / nD - 0.5) * Math.PI); }); const arriba = P.map(([x, y]) => [x, y]), abajo = []; for (let i = nD; i >= 0; i--) { const x = -W * 0.42 + i * W * 0.84 / nD; abajo.push([x, -H * 0.44 - H * 0.1 * Math.cos((i / nD - 0.5) * Math.PI) + (i % 2 ? 0 : H * 0.1)]); }
    cara = cara.add(poli(arriba.concat(abajo))); }
  else { // sonrisa en media luna con dos dientes
    const boca = circ(W * 0.84).translate([0, -H * 0.02]).subtract(circ(W * 0.92).translate([0, H * 0.16])).intersect(rr(W * 0.9, H).translate([0, -H * 0.5]));
    const yb = x => -H * 0.02 - Math.sqrt(Math.max(0, (W * 0.42) ** 2 - x * x)); // el borde de abajo de la boca: los dientes SALEN de ahí (hacia arriba)
    cara = cara.add(boca.subtract(rr(W * 0.07, H * 0.12).translate([-W * 0.12, yb(-W * 0.12) + H * 0.04])).subtract(rr(W * 0.07, H * 0.12).translate([W * 0.14, yb(W * 0.14) + H * 0.04])));
  }
  return huecoConTecho(cara, 0.4);
}
function calabaza(p) {
  const R = p.d / 2, k = p.achatada, e = p.pared, nG = Math.round(p.gajos), hondo = p.surco;
  const forma = r => M().sphere(r, 144).warp(v => { const a = Math.atan2(v[1], v[0]), u = Math.abs(Math.sin(a * nG / 2)), f = 1 - hondo * Math.pow(1 - u, 3); v[0] *= f; v[1] *= f; v[2] *= k; });
  const t = Math.atan(k) * 0.93, zc = k * R * Math.sin(t), zb = -zc; // por encima y por debajo de aquí la pared pasa de 45°
  const fuera = forma(R), dentro = forma(R - e);
  const corte = (m, z0, z1) => m.trimByPlane([0, 0, 1], z0).trimByPlane([0, 0, -1], -z1);
  let cuerpo = corte(fuera, zb, zc).subtract(corte(dentro, zb + 2.4, zc + 1));
  // collar para la tapa (dentro de la pared, sube 3 mm) y la cara tallada en la mitad de delante
  const anillo = dentro.slice(zc), collar = anillo.offset(1.2, 'Round').subtract(anillo.offset(-0.01)).extrude(5.5).translate([0, 0, zc - 2.5]);
  cuerpo = cuerpo.add(collar);
  const W = R * 1.05, H = (zc - zb) * 0.82, cara = caraCalabaza(p.cara, W, H, p.nombre).translate([0, (zc + zb) / 2 + H * 0.02]);
  cuerpo = cuerpo.subtract(porY(cara, R + 4).translate([0, -(R + 4) / 2, 0]));
  { const P = cuerpo.decompose(); if (P.length > 1) { const v = P.map(q => q.volume()); cuerpo = P[v.indexOf(Math.max(...v))]; } } // lo que quedaría suelto al calar (el centro de una letra) se va
  if (p.que === 'cuerpo') return cuerpo;
  // TAPA (maciza): de la cara plana hacia arriba, con el hueco del collar debajo y el tallo retorcido
  let tapa = fuera.trimByPlane([0, 0, 1], zc + 0.01).translate([0, 0, -zc + 3.4]).add(fuera.slice(zc + 0.02).extrude(3.45)); // franja de 3,4 mm abajo: ahí entra el collar
  tapa = tapa.subtract(anillo.offset(1.5, 'Round').subtract(anillo.offset(-0.3, 'Round')).extrude(3.4).translate([0, 0, -0.01]));
  const hT = R * 0.32, tallo = N.cs([N.ccw(N.poligono2(6, R * 0.2, 0))], 'Positive').offset(R * 0.02, 'Round').extrude(hT, 24, 70, [0.75, 0.75]);
  const bt = N.caja(tapa); tapa = tapa.add(tallo.translate([0, 0, bt.max[2] - 2]));
  if (p.que === 'tapa') return tapa;
  return cuerpo.add(tapa.translate([R * 2 + 12, 0, zb])); // la tapa, en la cama (a la altura de la base de la calabaza)
}

const opsBelen = () => Object.entries(SILUETAS).filter(([k, v]) => v.belen || k === 'belen').map(([k, v]) => [k, v.t]);
const notaLED = led => 'Vela LED de té de Ø' + n2(led) + ' mm (mide la tuya: la medida está arriba).';

export const DISENOS_NAVIDAD = {
  casitaNavidad: { cat: 'navidad', tambien: ['adultos', 'lamparas'], e: '🏘️', t: 'Pueblo navideño: casitas para luz LED', d: 'Casa, iglesia con campanario, tienda con su cartel y cabaña alpina · huecas, encima de una vela LED', uso: 'deco', color: '#f4efe6', nuevo: true,
    campos: [s('tipo', 'Casita', 'casa', [['casa', '🏠 Casa con chimenea'], ['iglesia', '⛪ Iglesia con campanario'], ['tienda', '🏪 Tienda con cartel y toldo'], ['cabana', '🏔️ Cabaña alpina']]), n('tam', 'Tamaño', 80, 60, 140, 1), tx('cartel', 'Cartel de la tienda', 'Juguetes', 'Panadería, Juguetes, tu nombre…'), n('pared', 'Pared', 1.6, 1.2, 3, 0.1), n('led', 'Vela LED (Ø)', 38, 30, 45, 0.5)],
    gen: p => casita(p), dosColores: p => ({ z: p.tipo === 'cabana' ? Math.max(p.tam * 0.16, 6) - Math.min(3.5, p.tam * 0.05) : p.tam * ({ casa: 0.7, iglesia: 0.72, tienda: 0.82 }[p.tipo] || 0.7) - Math.min(3.5, p.tam * 0.05), color: '#ffffff' }),
    nota: p => 'Hueca y abierta por debajo: ponla ENCIMA de la vela LED y la luz sale por las ventanas. Tejado a ' + ({ casa: 50, iglesia: 55, tienda: 47, cabana: 62 }[p.tipo] || 50) + '° con alero en chaflán: sin soportes. 🌈 Con «cambio a mano», el tejado sale en BLANCO (nieve). Imprime las paredes en blanco o crema translúcido: brillan. ' + notaLED(p.led) },
  adornoNombre: { cat: 'navidad', tambien: ['regalos', 'ninos'], e: '🎄', t: 'Adorno para el árbol con nombre', d: 'Bola, estrella, campana, corazón, árbol o bota · con el nombre en relieve y su anilla', uso: 'deco', color: '#b3132b', nuevo: true,
    campos: [s('forma', 'Forma', 'bola', [['bola', '🔴 Bola'], ['estrella', '⭐ Estrella'], ['campana', '🔔 Campana'], ['corazon', '❤️ Corazón'], ['arbol', '🎄 Árbol'], ['bota', '🧦 Bota']]), tx('nombre', 'Nombre', 'Lucía', 'El nombre de cada uno'), tx('linea2', 'Segunda línea (opcional)', '2026', 'El año, «Mi primera Navidad»…'), s('fuente', 'Letra', 'cursiva', [['cursiva', 'Cursiva'], ['redonda', 'Redonda'], ['gorda', 'Gorda'], ['clasica', 'Clásica']]), n('alto', 'Tamaño', 80, 50, 120, 1), n('grosor', 'Grosor', 3, 2, 5, 0.2)],
    gen: p => adornoNombre(p), dosColores: p => ({ z: p.grosor, color: '#d4a017' }),
    nota: p => 'Plano: se imprime tumbado, sin soportes. 🌈 Con «cambio a mano» a ' + n2(p.grosor) + ' mm, el borde y las letras salen en dorado (o blanco) sobre el color de la bola. Haz uno por cada nombre de la familia.' },
  calendarioAdviento: { cat: 'navidad', tambien: ['ninos', 'hogar'], e: '📅', t: 'Calendario de adviento (árbol de 24 cajones)', d: 'Un árbol con 24 cajoncitos numerados para esconder sorpresas', uso: 'deco', color: '#1f6f43', nuevo: true,
    campos: [s('que', 'Qué imprimir', 'marco', [['marco', '🎄 El árbol (marco)'], ['cajones1', '🗃️ Cajones del 1 al 12'], ['cajones2', '🗃️ Cajones del 13 al 24'], ['uno', '🧪 Un cajón de prueba']]), n('uno', 'Cajón de prueba nº', 1, 1, 24, 1, ''), n('cajon', 'Tamaño del cajón (frente)', 28, 22, 34, 0.5), n('fondo', 'Fondo del cajón', 40, 25, 60, 1)],
    gen: p => calendario(p), color2: '#c8102e',
    nota: p => { const Pp = p.cajon + 0.6, an = 6 * Pp + 2, al = 7 * Pp + 2 + Pp * 1.25; return 'El árbol mide ' + Math.round(an + 0) + ' × ' + Math.round(al) + ' mm: se imprime TUMBADO sobre la espalda (las celdas miran arriba), sin soportes' + (al > 180 || an > 180 ? ' · solo cabe en la P1P (en la A1 mini, baja el tamaño del cajón a 22)' : '') + '. Los cajones, de pie y abiertos por arriba, de 12 en 12 (holgura 0,3 por lado). Imprime primero «🧪 Un cajón de prueba» y mira que entra y sale suave. Cajones en rojo, blanco y verde alternados quedan de tienda.'; } },
  farolNavidad: { cat: 'navidad', tambien: ['vasos', 'lamparas', 'adultos'], e: '🏮', t: 'Farol de Navidad (siluetas que brillan)', d: 'Renos, árboles, estrellas, copos y belén: por fuera liso; al encender la vela, aparecen', uso: 'deco', color: '#f6f1e7', nuevo: true,
    campos: [s('modo', 'Cómo', 'calado', [['luz', '✨ Escondidas: brillan al encender (blanco)'], ['calado', '✴️ Caladas (agujeros)']]), s('motivo', 'Dibujos', 'arboles', [['mixto', 'Renos, árbol, estrella, ciervo, copo y belén'], ['renos', 'Renos y árboles'], ['arboles', 'Árboles, estrellas y copos'], ['belen', 'Belén, estrella y árbol']]), n('caras', 'Caras', 6, 4, 8, 1, ''), n('alto', 'Alto', 120, 80, 200, 1), n('ancho', 'Ancho (entre caras)', 90, 60, 140, 1), n('pared', 'Pared', 2.4, 1.6, 4, 0.1), n('piel', 'Piel que deja pasar la luz', 0.6, 0.4, 1.2, 0.05), n('led', 'Vela LED (Ø)', 38, 30, 45, 0.5)],
    gen: p => farol(p), nota: p => (p.modo === 'luz' ? 'Las siluetas están rebajadas POR DENTRO hasta dejar ' + n2(p.piel) + ' mm: apagado se ve liso y, al encender la vela, aparecen. Imprímelo en PLA BLANCO (o natural), 2 paredes. ' : 'Siluetas caladas: la luz sale por los huecos. ') + 'De pie y sin soportes. ' + notaLED(p.led) + ' Dibujos de dominio público (Openclipart, CC0) y propios.' },
  belenPeana: { cat: 'navidad', tambien: ['adultos', 'cuadros'], e: '⭐', t: 'Belén de pie con peana (caja de luz)', d: 'El belén en negro delante de un cielo con estrellas que se ilumina con una vela LED', uso: 'deco', color: '#1b1b1f', nuevo: true,
    campos: [s('que', 'Qué imprimir', 'todo', [['todo', 'Las tres piezas'], ['figura', 'El belén (negro)'], ['cielo', 'El cielo con estrellas (blanco)'], ['peana', 'La peana (madera, blanco…)']]), s('dibujo', 'Belén', 'belen', opsBelen()), n('ancho', 'Ancho', 160, 110, 220, 1), tx('texto', 'Texto de la peana', 'Feliz Navidad', 'O el apellido de la familia'), s('fuente', 'Letra', 'cursiva', [['cursiva', 'Cursiva'], ['clasica', 'Clásica'], ['gorda', 'Gorda']]), n('led', 'Vela LED (Ø)', 38, 30, 45, 0.5)],
    gen: p => belenPeana(p), nota: p => 'Tres piezas: el belén en NEGRO delante, el cielo en BLANCO detrás (lámina fina de 1,2 mm con marco y estrellas caladas) y la peana con el hueco de la vela DETRÁS del cielo (ranuras con 0,15 mm por lado). Al encender, el cielo se ilumina a contraluz, las estrellas brillan y el belén se recorta en negro delante. Todo plano y sin soportes. ' + notaLED(p.led) + ' Dibujo de dominio público: ' + ((SILUETAS[p.dibujo] || {}).url || '') },
  calabazaHalloween: { cat: 'halloween', tambien: ['ninos', 'lamparas'], e: '🎃', t: 'Calabaza de Halloween para vela LED', d: 'Con gajos, cara tallada (sonriente, malvada, gato negro, murciélagos o un nombre) y tapa con tallo', uso: 'deco', color: '#f07b16', nuevo: true,
    campos: [s('que', 'Qué imprimir', 'todo', [['todo', 'Calabaza y tapa'], ['cuerpo', 'Solo la calabaza'], ['tapa', 'Solo la tapa']]), s('cara', 'Cara', 'sonriente', [['sonriente', '😀 Sonriente'], ['malvada', '😈 Malvada'], ['gato', '🐈‍⬛ Gato negro y luna'], ['murcielagos', '🦇 Murciélagos'], ['nombre', '🔤 Un nombre']]), tx('nombre', 'Nombre (si eliges «un nombre»)', 'BOO', 'Hasta 5–6 letras'), n('d', 'Diámetro', 130, 80, 180, 1), n('achatada', 'Achatada', 0.78, 0.6, 1, 0.01, '×'), n('gajos', 'Gajos', 10, 6, 14, 1, ''), n('surco', 'Hondo de los gajos', 0.08, 0.03, 0.14, 0.01, '×'), n('pared', 'Pared', 2.4, 1.6, 4, 0.1)],
    gen: p => calabaza(p), color2: '#3b6b2a',
    nota: p => 'Sin soportes: la calabaza está cortada justo donde la pared pasaría de 45° (arriba y abajo) y la tapa se imprime maciza con la cara plana en la cama; encaja en el collar de arriba. Calabaza en naranja y la tapa en verde (el tallo). Mete una vela LED (nunca una vela de verdad). Cara en la mitad de delante.' }
};
