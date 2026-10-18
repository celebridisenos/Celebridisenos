// ================= 17-10-2026 · 🛒 MÁS VARIEDAD PARA VENDER EN CULTS (cajas, Halloween, bebés, juguetes, ciencia, frikis, casa) =================
// Ella: «quiero mejoras antes de la batería: más cajas, más diseños en CelebriR8, más cosas para vender en Cults, hay poca variedad, más
// objetos». Lo más flaco del catálogo era: bebés (1), Halloween (2), frikis (2), juguetes (2), ciencia (3), calados (3), canicas (4).
// Diseños PROPIOS (nada copiado), pensados para imprimirse SIN soportes (lo que no, lo dice) y con sus holguras (0,05 a presión · 0,10
// encaja · 0,15 gira · 0,4–0,5 lo impreso ya montado). Lo que encaja con otra pieza se calcula y se comprueba (test/unit/cat52.mjs).
// Lo que NO se puede comprobar sin imprimir (que un silbato pite, que un bumerán vuelva) se dice en su nota.
import * as N from './nucleo.js';
import * as PT from './patrones.js';
import { ENCAJES } from './motor.js';
import { C2, E2, P2, H2, U2, cap2, tira2, abombado } from './articulados.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const M = () => N.MF(), CS = () => N.CSX();
const RAD = Math.PI / 180, J = ENCAJES.justo, GI = ENCAJES.gira, PR = ENCAJES.presion;
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const rr = (w, h, r = 0, x = 0, y = 0) => { const S = CS().square([Math.max(0.02, w - 2 * r), Math.max(0.02, h - 2 * r)], true); return (r > 0.05 ? S.offset(r, 'Round', 2, seg(2 * r)) : S).translate([x, y]); };
const cil = (d, h, z = 0, x = 0, y = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([x, y, z]);
const caja = (x, y, z, cx = 0, cy = 0, cz = 0) => M().cube([x, y, z], true).translate([cx, cy, cz + z / 2]);
const limpia = pts => pts.filter((q, i) => { const o = pts[(i + pts.length - 1) % pts.length]; return Math.hypot(q[0] - o[0], q[1] - o[1]) > 1e-4; });
const rev = (pts, sg = 96) => CS().ofPolygons([N.ccw(limpia(pts))]).revolve(sg);
const txt2 = (t, f, alto) => N.centraCS(N.texto2(t, f, alto));
// texto que cabe en «ancho» (lo encoge si hace falta)
const txtCabe = (t, f, alto, ancho) => { const a = txt2(t, f, alto), b = N.cajaCS(a); return b.w > ancho ? a.scale([ancho / b.w, ancho / b.w]) : a; };
// de pie (en el plano XZ, mirando a -Y): un dibujo plano extruido «g» hacia -Y
const dePie = (cs, g) => cs.extrude(g).rotate([90, 0, 0]);
const enFila = (L, sep = 6, ancho = 230) => { let x = 0, y = 0, alto = 0; return L.map(m => { const b = N.caja(m); if (x > 0 && x + b.dims[0] > ancho) { x = 0; y += alto + sep; alto = 0; } const o = m.translate([x - b.min[0], y - b.min[1], -b.min[2]]); x += b.dims[0] + sep; alto = Math.max(alto, b.dims[1]); return o; }); };
const vol = (a, b) => { try { const v = a.intersect(b).volume(); return v > 0 ? v : 0; } catch (e) { return 0; } };
// el «abanico» de un círculo de r a r con un agujero de gota (horizontal, eje Y): sin soportes
const gota2 = (d) => { const r = d / 2, pts = []; for (let i = 0; i <= 40; i++) { const a = (45 - 270 * i / 40) * RAD; /* (17-10: el arco va de 45° a 135° por ABAJO y la punta arriba; antes el hueco del arco caía a la derecha y la gota salía torcida) */ pts.push([r * Math.cos(a), r * Math.sin(a)]); } pts.push([0, r * 1.414]); return P2(pts); };

// ======================= 🎁 CAJA REGALO CON LAZO =======================
// Caja + tapa que cubre por fuera (como las de regalo de verdad) + el lazo abombado con su cruz de cinta, que se sujeta a la tapa con dos
// clavijas impresas (sin pegamento). Las cintas de los lados van en relieve en la caja y en la tapa (de pie: se imprimen bien).
function regaloMedidas(p) { const L = p.lado, e = 2.4, tH = Math.max(12, Math.min(22, p.alto * 0.28)), Lt = L + 2 * J + 2 * e, b = L * 0.16; return { L, e, tH, Lt, b, H: p.alto, rc: 4 }; }
function cajaRegalo(p) {
  const Q = regaloMedidas(p), { L, e, tH, Lt, b, H, rc } = Q;
  let cajaM = rr(L, L, rc).extrude(H).subtract(rr(L - 2 * e, L - 2 * e, Math.max(0.6, rc - e)).extrude(H).translate([0, 0, 2]));
  const hb = H - tH - 0.8; [0, 90, 180, 270].forEach(a => { cajaM = cajaM.add(caja(b, 1.2, hb, 0, L / 2 + 0.6 - 0.01, 0).rotate([0, 0, a])); });
  // la tapa, al revés (lo de arriba en la cama): techo de «e» y faldón de tH
  let tapa = rr(Lt, Lt, rc + e).extrude(tH + e).subtract(rr(L + 2 * J, L + 2 * J, rc + J).extrude(tH + 1).translate([0, 0, e]));
  [0, 90, 180, 270].forEach(a => { tapa = tapa.add(caja(b, 1.2, tH + e, 0, Lt / 2 + 0.6 - 0.01, 0).rotate([0, 0, a])); });
  const pin = 3.2, sitios = [[Lt * 0.3, 0], [-Lt * 0.3, 0]];
  sitios.forEach(([x, y]) => { tapa = tapa.subtract(cil(pin + 2 * PR, 1.7, -0.01, x, y)); });
  // el lazo: cruz de cinta (2 mm) + lazo abombado con dos bucles, nudo y dos colas
  const bw = L * 0.72, lazo2 = U2([
    E2(bw * 0.27, bw * 0.17, -bw * 0.25, bw * 0.08, 18).subtract(E2(bw * 0.13, bw * 0.07, -bw * 0.28, bw * 0.09, 18)),
    E2(bw * 0.27, bw * 0.17, bw * 0.25, bw * 0.08, -18).subtract(E2(bw * 0.13, bw * 0.07, bw * 0.28, bw * 0.09, -18)),
    P2([[-bw * 0.04, 0], [-bw * 0.3, -bw * 0.36], [-bw * 0.2, -bw * 0.33], [-bw * 0.17, -bw * 0.4], [bw * 0.05, -bw * 0.02]]),
    P2([[bw * 0.04, 0], [bw * 0.3, -bw * 0.36], [bw * 0.2, -bw * 0.33], [bw * 0.17, -bw * 0.4], [-bw * 0.05, -bw * 0.02]])]);
  let lazo = abombado(lazo2, 2, 2 + L * 0.13).add(abombado(E2(bw * 0.09, bw * 0.08, 0, bw * 0.03), 2, 4 + L * 0.13));
  const cruz = U2([rr(Lt, b, 0.8), rr(b, Lt, 0.8)]);
  lazo = lazo.add(cruz.extrude(2)).subtract(N.union(sitios.map(([x, y]) => cil(pin + 2 * PR, 1.5, -0.01, x, y))));
  const clavija = () => cil(pin, 2.9, 0);
  if (p.ver === 'montada') {
    const tapaM = tapa.mirror([0, 0, 1]).translate([0, 0, H + e]);
    return N.union([cajaM, tapaM, lazo.translate([0, 0, H + e])]);
  }
  if (p.que === 'caja') return cajaM; if (p.que === 'tapa') return tapa; if (p.que === 'lazo') return N.union([lazo, clavija().translate([Lt / 2 + 8, 0, 0]), clavija().translate([Lt / 2 + 8, 8, 0])]);
  return N.union(enFila([cajaM, tapa, lazo, clavija(), clavija()], 8, 250));
}

// ======================= 🥚 ESFERAS QUE SE ABREN: huevo sorpresa, bola de Navidad, bola de premios =======================
// Dos mitades que encajan con un labio (0,10 por lado). Las dos se imprimen con la cúpula hacia ARRIBA y por dentro el techo es un cono
// de 45° (más grueso arriba, pero sin soportes). El labio va en la mitad de abajo: se imprime boca abajo sobre el labio (el escalón que
// queda en el aire es de 1,3 mm: se imprime bien).
export function esferaMedidas(p) {
  const huevo = p.forma === 'huevo', D = p.d, H = huevo ? D * 1.3 : D, hb = huevo ? H * 0.43 : H / 2, ht = H - hb, e = 2.4, jh = 4;
  return { huevo, D, H, hb, ht, e, jh, R0: D / 2 };
}
function mitadPerfil(R, h, e, zp, desde) { const pts = [], cav = [], k = 64; for (let i = 0; i <= k; i++) { const t = h * i / k; pts.push([R * Math.sqrt(Math.max(0, 1 - (t / h) ** 2)), t]); } for (let i = k; i >= 0; i--) { const t = desde + (h - desde) * i / k; const rc = Math.min(R * Math.sqrt(Math.max(0, 1 - (t / h) ** 2)) - e, zp - t); if (rc > 0.3) cav.push([rc, t]); } return { pts, cav }; }
function esferaAbre(p) {
  const Q = esferaMedidas(p), { D, hb, ht, e, jh, R0 } = Q, R = D / 2;
  const plano = Q.huevo && p.dePie !== false ? 1.4 : 0; // el huevo, con la base plana para que se tenga de pie
  // MITAD CON LABIO (la de abajo): se imprime boca abajo, apoyada en el labio
  const zpB = hb - 2.4, A = mitadPerfil(R, hb, e, zpB, 0);
  const B = [[R0 - e / 2 - J, 0], [R0 - e / 2 - J, jh]].concat(A.pts.filter(([r, t]) => t <= hb - plano).map(([r, t]) => [r, jh + t]));
  B.push([0, jh + hb - plano], [0, jh + Math.min(zpB, hb - plano - 2)]);
  A.cav.filter(([r, t]) => t <= Math.min(zpB, hb - plano - 2)).forEach(([r, t]) => B.push([r, jh + t])); B.push([R0 - e, jh], [R0 - e, 0]);
  let abajo = rev(B, 120);
  // MITAD CON HUECO (la de arriba): apoyada en su borde
  const zpT = ht - 2.4, T0 = mitadPerfil(R, ht, e, zpT, jh + 0.3);
  const T = T0.pts.slice(); T.push([0, Math.min(zpT, ht - 2)]); T0.cav.filter(([r, t]) => t <= Math.min(zpT, ht - 2)).forEach(q => T.push(q)); T.push([R0 - e / 2, jh + 0.3], [R0 - e / 2, 0]);
  let arriba = rev(T, 120);
  if (p.tipo === 'navidad') { // el colgador: una anilla de pie en lo alto
    const an = CS().circle(5, 32).subtract(CS().circle(2.6, 32)).extrude(3).rotate([90, 0, 0]).translate([0, 1.5, ht + 3.2]);
    arriba = arriba.add(an).add(cil(7, 2.4, ht - 1.6));
  }
  if (p.tipo === 'premios') { // agujeros para que salgan los premios (en las dos mitades, a media altura)
    const ag = p.agujero, hoyos = h => N.union([0, 120, 240].map(a => M().cylinder(D, ag / 2, ag / 2, 32).rotate([0, 90, 0]).translate([0, 0, h]).rotate([0, 0, a])));
    arriba = arriba.subtract(hoyos(ht * 0.45)); abajo = abajo.subtract(hoyos(jh + hb * 0.5).rotate([0, 0, 60]));
  }
  if (p.ver === 'montada') return N.union([abajo.mirror([0, 0, 1]).translate([0, 0, jh + hb - plano]), arriba.translate([0, 0, hb - plano])]);
  if (p.__piezas) return { abajo, arriba, Q, plano };
  return N.union(enFila([abajo, arriba], 10, 250));
}

// ======================= 💊 PASTILLERO GIRATORIO (7 días) =======================
// Base redonda con 8 huecos (7 días + 1 cerrado) y los días en relieve por fuera; la tapa gira sobre el poste del centro y tiene UNA
// ventana: giras hasta el día y sale la pastilla. El poste lleva dos ranuras y un diente: la tapa entra a presión y ya no se cae.
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
function pastillero(p) {
  const D = p.d, R = D / 2, H = p.alto + 2, e = 2, rp = 5, sector = 45;
  let base = cil(D, H).subtract(cil(D - 2 * e, H, 2));
  for (let i = 0; i < 8; i++) base = base.add(caja(R - e - rp + 0.5, 1.6, H - 2, (R - e + rp) / 2, 0, 1.99).rotate([0, 0, i * sector + sector / 2]));
  // el hueco «cerrado» va macizo (ahí descansa la ventana: no se ve ninguna pastilla)
  const sec = (r0, r1, a0, a1) => { const pts = []; for (let k = 0; k <= 16; k++) { const a = (a0 + (a1 - a0) * k / 16) * RAD; pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]); } for (let k = 16; k >= 0; k--) { const a = (a0 + (a1 - a0) * k / 16) * RAD; pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]); } return P2(pts); };
  base = base.add(sec(rp, R - e + 0.01, -sector / 2, sector / 2).extrude(H - 2.2).translate([0, 0, 1.99]));
  // el poste con su diente a presión
  const hPost = H + 2.4 + 0.25, poste = rev([[2, 0], [rp, 0], [rp, hPost], [rp + 0.5, hPost + 0.5], [rp - 0.6, hPost + 1.6], [2, hPost + 1.6]], 64);
  const zr = H - 8, hr = hPost + 3 - zr; base = base.add(poste).subtract(caja(1.4, 2 * rp + 2, hr, 0, 0, zr)).subtract(caja(2 * rp + 2, 1.4, hr, 0, 0, zr));
  // los días por fuera, en relieve
  DIAS.forEach((d, i) => { const a = (i + 1) * sector; base = base.add(dePie(txt2(d, 'gorda', Math.min(8, H * 0.5)), 0.8).translate([0, -R + 0.2, H / 2]).rotate([0, 0, a + 90])); });
  // la tapa (al revés): disco, faldón por fuera con estrías, agujero del poste y la ventana
  const Dt = D + 2 * GI + 4;
  let tapa = cil(Dt, 2.4 + 3).subtract(cil(D + 2 * GI, 3.1, 2.4)).subtract(cil(2 * rp + 2 * GI, 6, -1));
  for (let k = 0; k < 36; k++) tapa = tapa.subtract(cil(1.6, 6, 0.8, Dt / 2 + 0.3, 0).rotate([0, 0, k * 10]));
  tapa = tapa.subtract(sec(rp + 2.2, R - e - 0.8, -sector / 2 + 3, sector / 2 - 3).extrude(4).translate([0, 0, -1])); // la ventana (en la tapa al revés, en su sitio)
  tapa = tapa.subtract(P2([[R + 1.4, 0], [R - 2.4, 2.4], [R - 2.4, -2.4]]).extrude(0.6).translate([0, 0, -0.01])); // flecha junto a la ventana (en la cara de arriba)
  if (p.ver === 'montada') return N.union([base, tapa.mirror([0, 0, 1]).translate([0, 0, H + 2.4 + 0.15])]);
  if (p.que === 'base') return base; if (p.que === 'tapa') return tapa;
  return N.union(enFila([base, tapa], 10, 260));
}

// ======================= 🔄 CAJA DE TAPA GIRATORIA (se abre de lado) =======================
// La tapa gira sobre un pasador en una esquina y hace «clic» al cerrar (un botoncito entra en su hoyo). Con nombre grabado si quieres.
function cajaGiratoria(p) {
  const L = p.L, W = p.W, H = p.H, e = 2.4, r = 7, pin = 6, px = -L / 2 + 8, py = W / 2 - 8, dx = L / 2 - 8, dy = -W / 2 + 8;
  let base = rr(L, W, r).extrude(H).subtract(rr(L - 2 * e, W - 2 * e, r - e).extrude(H).translate([0, 0, 2]));
  base = base.add(cil(15, H, 0, px, py)).subtract(cil(pin + 2 * GI, 10.5, H - 10, px, py)); // la esquina del giro
  base = base.add(cil(10, H, 0, dx, dy)).subtract(M().sphere(1.7, 24).translate([dx, dy, H + 0.6])); // la esquina del «clic» (hoyo)
  // la tapa, montada: placa encima, pasador abajo, botón abajo, pestaña para empujar
  let tapa = rr(L, W, r).extrude(3).add(C2(7, L / 2 - 2, -W / 2 + 14).extrude(3)).translate([0, 0, H]);
  tapa = tapa.add(cil(pin, 9.6, H - 9.6, px, py)).add(M().sphere(1.4, 24).translate([dx, dy, H]).intersect(caja(4, 4, 0.7, dx, dy, H - 0.6)));
  if (p.nombre && String(p.nombre).trim()) tapa = tapa.subtract(txtCabe(p.nombre, 'redonda', Math.min(W * 0.28, 16), L * 0.7).extrude(1).translate([0, 0, H + 3 - 0.6]));
  if (p.ver === 'montada') return N.union([base, tapa]);
  const tapaImp = tapa.rotate([180, 0, 0]); const b = N.caja(tapaImp), ti = tapaImp.translate([0, 0, -b.min[2]]);
  if (p.__piezas) return { base, tapa, px, py };
  if (p.que === 'base') return base; if (p.que === 'tapa') return ti;
  return N.union(enFila([base, ti], 10, 260));
}

// ======================= 🦷 CAJITA PARA LOS DIENTES DE LECHE =======================
function dientes2(w) {
  const corona = U2([C2(w * 0.25, -w * 0.2, w * 0.12), C2(w * 0.25, w * 0.2, w * 0.12), rr(w * 0.86, w * 0.34, w * 0.1, 0, 0)]).subtract(C2(w * 0.07, 0, w * 0.38));
  const raices = U2([H2([C2(w * 0.17, -w * 0.2, -w * 0.08), C2(w * 0.085, -w * 0.15, -w * 0.42)]), H2([C2(w * 0.17, w * 0.2, -w * 0.08), C2(w * 0.085, w * 0.15, -w * 0.42)])]);
  return U2([corona, raices]).subtract(E2(w * 0.075, w * 0.2, 0, -w * 0.4)).offset(-1.5, 'Round', 2, 24).offset(1.5, 'Round', 2, 24);
}
function cajaDientes(p) {
  const w = p.ancho, H = p.alto, e = 2.4, o = dientes2(w), dentro = o.offset(-e, 'Round', 2, 24);
  const cajaM = o.extrude(H).subtract(dentro.extrude(H).translate([0, 0, 2]));
  let tapa = o.extrude(2.4).add(dentro.offset(-J, 'Round', 2, 24).subtract(dentro.offset(-J - 1.6, 'Round', 2, 24)).extrude(5).translate([0, 0, 2.39]));
  // la carita y el texto, grabados en la cara de arriba (que se imprime en la cama: la carita se lee al derecho desde fuera)
  const cara = U2([C2(w * 0.045, -w * 0.13, w * 0.12), C2(w * 0.045, w * 0.13, w * 0.12), C2(w * 0.1, 0, w * 0.04).subtract(C2(w * 0.1 - 1, 0, w * 0.04)).subtract(rr(w * 0.3, w * 0.12, 0, 0, w * 0.1))]);
  let grab = cara; if (p.texto && String(p.texto).trim()) grab = U2([grab, txtCabe(p.texto, 'redonda', w * 0.11, w * 0.62).translate([0, -w * 0.13])]);
  tapa = tapa.subtract(grab.mirror([1, 0]).extrude(0.6 + 0.01).translate([0, 0, -0.01]));
  if (p.ver === 'montada') return N.union([cajaM, tapa.mirror([0, 0, 1]).translate([0, 0, H + 2.4])]);
  if (p.que === 'caja') return cajaM; if (p.que === 'tapa') return tapa;
  return N.union(enFila([cajaM, tapa], 10, 250));
}

// ======================= 🃏 CAJA PARA CARTAS (deck box) =======================
const CARTAS = { sin: [63, 88, 'Sin fundas (63 × 88)'], fundas: [67, 92, 'Con fundas normales (67 × 92)'], dobles: [69, 94, 'Con fundas dobles (69 × 94)'], japo: [62, 89, 'Japonesas con funda (62 × 89)'] };
function deckBox(p) {
  const [cw, ch] = CARTAS[p.cartas] || CARTAS.fundas, iw = cw + 1.2, it = p.grosor + 1.2, suelo = 2, Hc = ch + 1;
  const eB = 3.2, eC = 1.4, eT = 1.6, Hb = Math.round(Hc * 0.62), Hcol = suelo + Hc - Hb, r = 3;
  const Lo = iw + 2 * eB, Wo = it + 2 * eB, Lc = iw + 2 * eC, Wc = it + 2 * eC;
  let base = rr(Lo, Wo, r).extrude(Hb).add(rr(Lc, Wc, 1.5).extrude(Hcol).translate([0, 0, Hb - 0.01])).subtract(rr(iw, it, 0.8).extrude(Hb + Hcol).translate([0, 0, suelo]));
  base = base.subtract(M().cylinder(Wo + 4, 15, 15, 64).rotate([90, 0, 0]).translate([0, (Wo + 4) / 2, Hb + Hcol])); // para sacar las cartas con dos dedos
  const Li = Lc + 2 * J, Wi = Wc + 2 * J, Lt = Li + 2 * eT, Wt = Wi + 2 * eT, Ht = Hcol + 1 + 2;
  let tapa = rr(Lt, Wt, r).extrude(Ht).subtract(rr(Li, Wi, 1.6).extrude(Ht).translate([0, 0, 2]));
  if (p.texto && String(p.texto).trim()) tapa = tapa.subtract(txtCabe(p.texto, 'gorda', Wt * 0.32, Lt * 0.8).mirror([1, 0]).extrude(0.61).translate([0, 0, -0.01]));
  if (p.ver === 'montada') return N.union([base, tapa.mirror([0, 0, 1]).translate([0, 0, Hb + Hcol + 1 + 2])]);
  if (p.que === 'caja') return base; if (p.que === 'tapa') return tapa;
  return N.union(enFila([base, tapa], 10, 250));
}

// ======================= 🎄 ÁRBOL DE NAVIDAD EN ESPIRAL (modo jarrón) =======================
function arbolEspiral(p) {
  const st = N.cs([N.ccw(N.estrella2(Math.round(p.puntas), p.d / 2, p.d / 2 * (p.estilo === 'suave' ? 0.72 : 0.6)))], 'Positive');
  const forma = p.estilo === 'suave' ? st.offset(-3, 'Round', 2, 16).offset(3, 'Round', 2, 16) : st;
  return forma.extrude(p.alto, Math.ceil(p.alto / 1.5), p.vueltas * 360, [0.03, 0.03]);
}

// ======================= 👻 FANTASMA PARA VELA LED =======================
function fantasma(p) {
  const H = p.alto, R = p.d / 2, e = 1.8, z1 = H - R * 1.1, Rb = R * 1.06;
  const rz = z => (z <= z1 ? Rb + (R - Rb) * Math.min(1, z / (z1 * 0.7)) : R * Math.sqrt(Math.max(0, 1 - ((z - z1) / (H - z1)) ** 2)));
  const out = [], inn = [], k = 80, zap = H - 2.6;
  for (let i = 0; i <= k; i++) { const z = H * i / k; out.push([rz(z), z]); }
  for (let i = k; i >= 0; i--) { const z = zap * i / k, r0 = Math.min(rz(z) - e, zap - z); if (r0 > 0.3) inn.push([r0, z]); }
  let m = rev(out.concat([[0, H], [0, zap]]).concat(inn).concat([[Math.max(1, rz(0) - e), 0]]), 128);
  // el bajo en ondas (arcos de medio punto: sin soportes)
  const nS = 9, rs = p.d * 0.085; for (let i = 0; i < nS; i++) m = m.subtract(M().cylinder(e * 4, rs, rs, 32).rotate([0, 90, 0]).translate([Rb - e * 2, 0, 0]).rotate([0, 0, i * 360 / nS + 20]));
  // bracitos (suben a ~50°)
  [1, -1].forEach(sg => { m = m.add(M().hull([M().sphere(5.5, 24).translate([sg * (R - 3), 0, H * 0.47]), M().sphere(3.6, 24).translate([sg * (R + 8), 0, H * 0.59])])); });
  // la cara (calada: la luz sale por ahí)
  const ojos = U2([E2(p.d * 0.075, p.d * 0.11, -p.d * 0.15, H * 0.66), E2(p.d * 0.075, p.d * 0.11, p.d * 0.15, H * 0.66)]);
  const boca = p.cara === 'sonrisa' ? C2(p.d * 0.16, 0, H * 0.5).subtract(C2(p.d * 0.16 - 2.6, 0, H * 0.5)).subtract(rr(p.d, p.d * 0.4, 0, 0, H * 0.5 + p.d * 0.2)) : p.cara === 'susto' ? E2(p.d * 0.08, p.d * 0.14, 0, H * 0.46) : E2(p.d * 0.1, p.d * 0.12, 0, H * 0.47);
  m = m.subtract(dePie(U2([ojos, boca]), R + 6));
  return m;
}

// ======================= 🧙 CALDERO DE BRUJA PARA CARAMELOS =======================
function caldero(p) {
  const R = p.d / 2, H = p.alto, zb = H * 0.42, Rn = R * 0.8, zn = H * 0.86, e = 2.2, r0 = Math.max(R * 0.32, R - zb);
  const rz = z => z <= zb ? r0 + (R - r0) * z / zb : z <= zn ? Rn + (R - Rn) * Math.cos((z - zb) / (zn - zb) * Math.PI / 2) : Rn + 3.2 * (z - zn) / (H - zn);
  const out = [], inn = [], k = 90; for (let i = 0; i <= k; i++) { const z = H * i / k; out.push([rz(z), z]); }
  for (let i = k; i >= 0; i--) { const z = 2.4 + (H - 2.4) * i / k; inn.push([Math.max(1, rz(z) - e), z]); }
  let m = rev([[0, 0]].concat(out).concat(inn).concat([[0, 2.4]]), 144);
  m = m.add(CS().circle(1.8, 20).translate([rz(H) - 1.1, 0]).revolve(144).translate([0, 0, H - 0.5])); // el borde, en rulo
  for (let i = 0; i < 3; i++) m = m.add(M().hull([cil(10, 1, 0, r0 + 3, 0), M().sphere(5, 24).translate([r0 + 6, 0, 8])]).rotate([0, 0, i * 120 + 30])); // patitas
  // las dos orejas del asa (cuña a 48° debajo) con su agujero de gota (horizontal, hacia el centro; no atraviesa la pared)
  const zo = zn - 4, rw = rz(zo), oreja = N.cs([N.ccw([[0, -10], [9, 0], [9, 8], [0, 8]])], 'Positive').extrude(10).rotate([90, 0, 0]).translate([rw - 1, 5, zo]);
  const agujero = gota2(4.4).extrude(12).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([rw + 0.5, 0, zo + 4]);
  [0, 180].forEach(a => { m = m.add(oreja.rotate([0, 0, a])).subtract(agujero.rotate([0, 0, a])); });
  if (p.que === 'caldero') return m;
  // el asa: medio aro plano con dos pivotes hacia dentro (se abre un poco y se meten en las orejas)
  const Ra = rw + 10.9, asa = CS().circle(Ra + 2.4, 160).subtract(CS().circle(Ra - 2.4, 160)).intersect(rr(4 * Ra, 2 * Ra + 10, 0, 0, Ra - 5)).extrude(5);
  const piv = M().cylinder(5.5, 2, 2, 24).rotate([0, 90, 0]).translate([Ra - 2.4 - 5.5 + 0.01, 0, 2.5]);
  const asaM = asa.add(piv).add(piv.mirror([1, 0, 0]));
  if (p.que === 'asa') return asaM;
  if (p.__piezas) return { m, asaM, Ra, rw, zo };
  return N.union(enFila([m, asaM], 10, 300));
}

// ======================= 🪦 LÁPIDA DE HALLOWEEN CON NOMBRE =======================
function lapida(p) {
  const W = p.ancho, H = p.alto, T = 12, zb = 8;
  const perfil = p.forma === 'recta' ? rr(W, H, W * 0.12, 0, H / 2) : U2([rr(W, H - W / 2, 0, 0, (H - W / 2) / 2), C2(W / 2, 0, H - W / 2)]);
  let m = perfil.extrude(T).rotate([90, 0, 0]).translate([0, T / 2, zb]);
  const frente = U2([txtCabe(p.texto || 'R.I.P.', 'clasica', W * 0.24, W * 0.78).translate([0, H * 0.66]), p.nombre && String(p.nombre).trim() ? txtCabe(p.nombre, 'clasica', W * 0.12, W * 0.78).translate([0, H * 0.43]) : null,
    tira2([[W * 0.18, H * 0.92, 0.6], [W * 0.1, H * 0.84, 0.55], [W * 0.2, H * 0.76, 0.5], [W * 0.13, H * 0.7, 0.4]])]); // y una grieta
  m = m.subtract(dePie(frente, 1.2 + 0.01).translate([0, -T / 2 + 1.2, zb]));
  const base = rr(W + 18, T + 18, 4).extrude(zb).add(rr(W + 12, T + 12, 3).extrude(2).translate([0, 0, zb - 0.01]));
  return N.union([base, m]);
}

// ======================= 🎂 CAKE TOPPER (nombre o frase) =======================
// El texto se engorda un poco para que las letras se toquen, lleva una barra por debajo que une todo y los puntos de la «i» o las tildes
// se unen con un palito: sale en UNA pieza. Dos palillos para pincharlo en la tarta.
function uneIslas(cs) {
  const P = cs.decompose(); if (P.length <= 1) return cs; const a = P.map(q => q.area()), k = a.indexOf(Math.max(...a)); let main = P[k], otras = P.filter((_, i) => i !== k);
  for (let pase = 0; pase < 4 && otras.length; pase++) { const quedan = [];
    for (const q of otras) { const b = N.cajaCS(q); let mejor = null;
      for (let i = 0; i < 9; i++) { const x = b.min[0] + 0.8 + Math.max(0, b.w - 1.6) * i / 8, iq = q.intersect(rr(1.4, 4000, 0, x, 0)); if (iq.isEmpty()) continue; const bq = N.cajaCS(iq);
        const abajo = main.intersect(rr(1.4, 2000, 0, x, bq.min[1] - 1000 + 0.01)); if (!abajo.isEmpty()) { const top = N.cajaCS(abajo).max[1], L = bq.min[1] - top; if (!mejor || L < mejor.L) mejor = { L, x, y0: top - 0.4, y1: bq.min[1] + 0.4 }; }
        const arriba = main.intersect(rr(1.4, 2000, 0, x, bq.max[1] + 1000 - 0.01)); if (!arriba.isEmpty()) { const bot = N.cajaCS(arriba).min[1], L = bot - bq.max[1]; if (!mejor || L < mejor.L) mejor = { L, x, y0: bq.max[1] - 0.4, y1: bot + 0.4 }; } }
      if (mejor) main = U2([main, q, rr(1.4, mejor.y1 - mejor.y0, 0, mejor.x, (mejor.y0 + mejor.y1) / 2)]); else quedan.push(q); }
    otras = quedan; }
  return otras.length ? U2([main].concat(otras)) : main;
}
function cakeTopper(p) {
  const A = p.ancho, fuente = p.fuente || 'cursiva', con = p.adorno === 'corazones' || p.adorno === 'estrellas';
  let t = txtCabe(p.texto || 'Feliz cumple', fuente, A * 0.3, con ? A * 0.78 : A).offset(0.5, 'Round', 2, 12);
  const b = N.caja(t.extrude(1)), yb = b.min[1], sz = b.dims[1] * 0.42, xe = b.dims[0] / 2 + (con ? sz * 0.62 : 0), cx = (b.min[0] + b.max[0]) / 2;
  const L = [t, rr(2 * xe - (con ? 0 : b.dims[0] * 0.14), 3.2, 1.6, cx, yb + 1.2)]; // la barra de abajo (llega hasta los adornos)
  if (con) [-1, 1].forEach(sg => { const f = p.adorno === 'corazones' ? N.cs([N.corazon2(sz)], 'Positive') : N.cs([N.ccw(N.estrella2(5, sz / 2, sz / 4.4))], 'Positive'); L.push(f.translate([cx + sg * (b.dims[0] / 2 + sz * 0.5 - 1), yb + sz * 0.5 + 1.6])); });
  let todo = uneIslas(U2(L));
  const pal = x => U2([rr(4.4, 62, 1, x, yb - 31 + 1), P2([[x - 2.2, yb - 61], [x + 2.2, yb - 61], [x, yb - 70]])]); // los palillos (con punta)
  todo = U2([todo, pal(cx - b.dims[0] * 0.26), pal(cx + b.dims[0] * 0.26)]);
  return todo.extrude(p.grosor);
}

// ======================= 👶 PLACAS CON TEXTO: de nacimiento, de puerta, número de mesa =======================
function contornoPlaca(forma, W, H) {
  if (forma === 'nube') return U2([C2(H * 0.34, -W * 0.28, -H * 0.06), C2(H * 0.42, -W * 0.05, H * 0.08), C2(H * 0.36, W * 0.22, 0), C2(H * 0.3, W * 0.36, -H * 0.12), rr(W * 0.8, H * 0.44, H * 0.2, 0, -H * 0.24)]).offset(-3, 'Round', 2, 16).offset(3, 'Round', 2, 16);
  if (forma === 'corazon') return N.cs([N.corazon2(W)], 'Positive');
  if (forma === 'arco') return U2([rr(W, H * 0.55, 6, 0, -H * 0.225), C2(W / 2, 0, H * 0.05).intersect(rr(W, H, 0, 0, H * 0.5))]);
  if (forma === 'estrella') return N.cs([N.ccw(N.estrella2(5, W / 2, W * 0.26))], 'Positive').offset(4, 'Round', 2, 16);
  return rr(W, H, Math.min(W, H) * 0.1);
}
function placaConTexto(forma, W, H, lineas, o = {}) {
  const g = o.grosor || 3, rel = 1.2, cont = contornoPlaca(forma, W, H), b = N.cajaCS(cont); let m = cont.extrude(g);
  const rel2 = [cont.subtract(cont.offset(-2.2, 'Round', 2, 16))]; // el borde, en relieve
  lineas.filter(l => l && String(l.t || '').trim()).forEach(l => rel2.push(txtCabe(l.t, l.f, l.h, b.w * (l.ancho || 0.78)).translate([(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2 + l.y])));
  (o.extra || []).forEach(x => rel2.push(x));
  m = m.add(U2(rel2).intersect(cont).extrude(rel).translate([0, 0, g - 0.01]));
  if (o.agujeros) [-1, 1].forEach(sg => { m = m.subtract(cil(4.5, g * 3, -1, sg * b.w * 0.32, b.max[1] - Math.max(9, b.h * 0.13))); });
  return m;
}
function placaNacimiento(p) {
  const W = p.ancho, H = W * 0.72;
  return placaConTexto(p.forma, W, H, [{ t: p.nombre, f: 'cursiva', h: H * 0.28, y: H * 0.1 }, { t: p.fecha, f: 'redonda', h: H * 0.085, y: -H * 0.13 }, { t: p.datos, f: 'redonda', h: H * 0.075, y: -H * 0.25 }],
    { agujeros: true, extra: [N.cs([N.ccw(N.estrella2(5, 5, 2.2))], 'Positive').translate([-W * 0.36, H * 0.2]), N.cs([N.ccw(N.estrella2(5, 3.5, 1.5))], 'Positive').translate([W * 0.36, H * 0.24])] });
}
function cartelPuerta(p) {
  const W = p.ancho, H = W * (p.forma === 'estrella' ? 1 : 0.62);
  let extra = [];
  if (p.forma === 'arco') { const R0 = W * 0.42; extra = [0, 1, 2].map(i => C2(R0 - i * 7, 0, -H * 0.05).subtract(C2(R0 - i * 7 - 4.6, 0, -H * 0.05)).intersect(rr(W, H, 0, 0, H * 0.45))); }
  return placaConTexto(p.forma, W, H, [{ t: p.nombre, f: 'gorda', h: H * 0.3, y: p.forma === 'arco' ? -H * 0.12 : 0 }], { agujeros: true, extra });
}
function numeroMesa(p) {
  const W = p.ancho, H = W * 1.25, g = 4;
  const placa = placaConTexto('arco', W, H, [{ t: p.texto, f: 'cursiva', h: H * 0.13, y: H * 0.22 }, { t: p.numero, f: 'gorda', h: H * 0.42, y: -H * 0.12, ancho: 0.62 }], { grosor: g });
  // la placa lleva una pestaña abajo que entra en la peana (a presión justa)
  const b = N.caja(placa), pest = caja(W * 0.5, 10, g, 0, b.min[1] - 5 + 0.01, 0);
  const pl = placa.add(pest), peana = rr(W * 0.8, 34, 6).extrude(12).subtract(caja(W * 0.5 + 2 * J, g + 2 * J, 11, 0, 0, 2.01));
  if (p.que === 'placa') return pl; if (p.que === 'peana') return peana;
  return N.union(enFila([pl, peana], 10, 250));
}

// ======================= ♟️ PEANAS PARA MINIATURAS (rol y wargames) =======================
const FORMAS_PEANA = { redonda: 'Redonda', hex: 'Hexagonal', cuadrada: 'Cuadrada' };
function contornoPeana(forma, d) { if (forma === 'hex') return N.cs([N.ccw(N.poligono2(6, d / Math.cos(30 * RAD), 0))], 'Positive'); if (forma === 'cuadrada') return rr(d, d, 1); return C2(d / 2); }
function texturaPeana(tipo, area, d, semilla) {
  const b = N.cajaCS(area), L = [];
  if (tipo === 'losas') return area.subtract(PT.agujeros2D('voronoi', d * 1.4, d * 1.4, d / 3.2, 0.7, semilla).translate([(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2]));
  if (tipo === 'adoquines') { const pw = Math.max(5, d / 6), ph = pw * 0.6; for (let j = -6; j <= 6; j++) { L.push(rr(d * 2, 0.6, 0, 0, j * ph)); for (let i = -8; i <= 8; i++) L.push(rr(0.6, ph, 0, i * pw + (j % 2 ? pw / 2 : 0), j * ph + ph / 2)); } return U2(L).intersect(area); }
  if (tipo === 'rejilla') { const pw = d >= 40 ? 25.4 / 2 : d / 3; for (let i = -6; i <= 6; i++) { L.push(rr(0.6, d * 2, 0, i * pw, 0)); L.push(rr(d * 2, 0.6, 0, 0, i * pw)); } return U2(L).intersect(area); }
  if (tipo === 'madera') { const pw = Math.max(5, d / 5); for (let i = -6; i <= 6; i++) L.push(rr(0.6, d * 2, 0, i * pw + pw / 2, 0)); for (let i = -6; i <= 6; i++) L.push(rr(0.5, pw * 0.8, 0, i * pw + (i % 2 ? 0 : pw / 2), (i % 3) * pw * 0.7)); return U2(L).intersect(area); }
  return null;
}
function peanas(p) {
  const d = Number(p.diametro), h = d >= 40 ? 4 : 3.2, ch = 1.2, cont = contornoPeana(p.forma, d), top = cont.offset(-ch, 'Round', 2, 24);
  const una = k => { let m = M().hull([cont.extrude(0.01), top.extrude(0.01).translate([0, 0, h - 0.01])]);
    const tex = texturaPeana(p.textura, top.offset(-0.6, 'Round', 2, 16), d, 7 + k); if (tex) m = m.subtract(tex.extrude(1).translate([0, 0, h - 0.45]));
    if (p.iman && p.iman !== 'no') { const [di, hi] = p.iman.split('x').map(Number); m = m.subtract(cil(di + 0.2, hi + 0.2, -0.01)); }
    return m; };
  const nn = Math.round(p.cantidad); return N.union(enFila(Array.from({ length: nn }, (_, k) => una(k % 4)), 3, Math.max(d + 1, Math.floor(170 / (d + 3)) * (d + 3))));
}

// ======================= ❤️ CONTADOR DE VIDAS (dos ruedas: de 00 a 99) =======================
function contadorVida(p) {
  const Dd = p.rueda, gr = 5, bw = 2 * Dd + 22, bh = Dd + 18, rp = 4, hPost = gr + 0.5 + 0.3;
  let base = rr(bw, bh, 8).extrude(4);
  const cx = [-(Dd / 2 + 3), Dd / 2 + 3];
  cx.forEach(x => {
    const poste = rev([[1.6, 0], [rp, 0], [rp, hPost], [rp + 0.45, hPost + 0.45], [rp - 0.6, hPost + 1.5], [1.6, hPost + 1.5]], 48).translate([x, 0, 3.99]);
    base = base.add(poste).subtract(caja(1.2, 2 * rp + 2, 10, x, 0, 4.6)).subtract(caja(2 * rp + 2, 1.2, 10, x, 0, 4.6));
    base = base.add(M().cylinder(0.5, 1.1, 0.8, 16).translate([x, Dd * 0.36, 3.99])); // el botón del «clic»
    base = base.add(P2([[x - 3, bh / 2 - 1.5], [x + 3, bh / 2 - 1.5], [x, Dd / 2 + 1.8]]).extrude(1.2).translate([0, 0, 3.99])); // flecha que marca el número
  });
  // la rueda: los 10 números alrededor (cada uno derecho cuando está arriba), 10 hoyitos debajo y estrías en el canto
  const rueda = () => { let m = cil(Dd, gr).subtract(cil(2 * rp + 2 * GI, gr + 2, -1));
    for (let k = 0; k < 10; k++) { const a = 90 - k * 36; m = m.subtract(txt2(String(k), 'gorda', Dd * 0.2).rotate(-k * 36).translate([Dd * 0.34 * Math.cos(a * RAD), Dd * 0.34 * Math.sin(a * RAD)]).extrude(1).translate([0, 0, gr - 0.7])); m = m.subtract(cil(2.6, 0.7, -0.01, Dd * 0.36 * Math.cos(a * RAD), Dd * 0.36 * Math.sin(a * RAD))); }
    for (let k = 0; k < 30; k++) m = m.subtract(cil(1.6, gr + 2, -1, Dd / 2 + 0.35, 0).rotate([0, 0, k * 12]));
    return m; };
  if (p.ver === 'montada') return N.union([base].concat(cx.map(x => rueda().translate([x, 0, 4.15]))));
  if (p.que === 'base') return base; if (p.que === 'ruedas') return N.union(enFila([rueda(), rueda()], 6, 200));
  return N.union(enFila([base, rueda(), rueda()], 8, 250));
}

// ======================= 🔷 SÓLIDOS PLATÓNICOS (con su peana y sus nombres) =======================
const PHI = (1 + Math.sqrt(5)) / 2;
const SOLIDOS = {
  tetraedro: { t: 'Tetraedro', v: () => [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], cara: [-1, -1, -1] },
  cubo: { t: 'Cubo', v: () => [-1, 1].flatMap(a => [-1, 1].flatMap(b => [-1, 1].map(c3 => [a, b, c3]))), cara: [0, 0, -1] },
  octaedro: { t: 'Octaedro', v: () => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], cara: [-1, -1, -1] },
  dodecaedro: { t: 'Dodecaedro', v: () => [-1, 1].flatMap(a => [-1, 1].flatMap(b => [-1, 1].map(c3 => [a, b, c3]))).concat([-1, 1].flatMap(a => [-1, 1].flatMap(b => [[0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI]]))), cara: [0, -PHI, -1] },
  icosaedro: { t: 'Icosaedro', v: () => [-1, 1].flatMap(a => [-1, 1].flatMap(b => [[0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]])), cara: [-1, -1, -1] }
};
function giraA(v, de) { // la rotación que lleva el vector «de» a (0, 0, -1)
  const l = Math.hypot(...de), a = de.map(x => x / l), b = [0, 0, -1], cx = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sn = Math.hypot(...cx);
  if (sn < 1e-9) return d > 0 ? v : v.map(q => [q[0], -q[1], -q[2]]); const k = cx.map(x => x / sn), th = Math.atan2(sn, d), co = Math.cos(th), si = Math.sin(th);
  return v.map(q => { const kq = k[0] * q[0] + k[1] * q[1] + k[2] * q[2], kx = [k[1] * q[2] - k[2] * q[1], k[2] * q[0] - k[0] * q[2], k[0] * q[1] - k[1] * q[0]]; return [0, 1, 2].map(i => q[i] * co + kx[i] * si + k[i] * kq * (1 - co)); });
}
export function solido(k, tam) { const S = SOLIDOS[k], V = S.v(), R = Math.max(...V.map(q => Math.hypot(...q))), sc = tam / 2 / R; let m = M().hull(giraA(V.map(q => q.map(x => x * sc)), S.cara)); const b = N.caja(m); return m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]); }
function solidos(p) {
  const ks = p.que === 'todos' ? Object.keys(SOLIDOS) : [p.que], tam = p.tam, piezas = ks.map(k => solido(k, tam));
  if (p.peana && ks.length > 1) {
    const paso = tam * 1.15, W = paso * ks.length + 8; let pe = rr(W, tam * 1.25 + 14, 6).extrude(5);
    ks.forEach((k, i) => { const x = -W / 2 + 4 + paso * (i + 0.5), hueco = piezas[i].slice(0.02).offset(J * 2, 'Round', 2, 12); pe = pe.subtract(hueco.translate([x, tam * 0.1]).extrude(2).translate([0, 0, 3.01])).subtract(txtCabe(SOLIDOS[k].t, 'redonda', 5, paso * 0.92).translate([x, -tam * 0.5 - 1]).extrude(1).translate([0, 0, 4.4])); });
    return N.union(enFila([pe].concat(piezas), 8, 250));
  }
  return N.union(enFila(piezas, 8, 250));
}

// ======================= ♾️ CINTA DE MÖBIUS =======================
function moebius(p) {
  const R = p.d / 2, w = p.ancho, g = p.grosor, k = Math.round(p.medias), nn = 160, sec = t => { const a = t * 2 * Math.PI, f = k * a / 2, ca = Math.cos(a), sa = Math.sin(a);
    return [[-w / 2, -g / 2], [w / 2, -g / 2], [w / 2, g / 2], [-w / 2, g / 2]].map(([u, v]) => { const ru = u * Math.cos(f) - v * Math.sin(f), rv = u * Math.sin(f) + v * Math.cos(f); return [(R + ru) * ca, (R + ru) * sa, rv]; }); };
  const L = []; for (let i = 0; i < nn; i++) L.push(M().hull(sec(i / nn).concat(sec((i + 1) / nn))));
  return N.aLaCama(N.union(L));
}

// ======================= 📐 JUEGO DE GEOMETRÍA (regla, escuadra, cartabón y transportador) =======================
function marcas(L, y0, dir = 1) { const T = []; for (let i = 0; i <= L; i++) { const lg = i % 10 === 0 ? 6.5 : i % 5 === 0 ? 4.5 : 2.8; T.push(rr(0.5, lg, 0, i, y0 + dir * lg / 2)); } return T; }
function regla(Lr, g) {
  const W = 32; let pl = rr(Lr + 16, W, 3);
  const T = marcas(Lr, -W / 2, 1).map(q => q.translate([-Lr / 2, 0])); for (let i = 0; i <= Lr / 10; i++) T.push(txt2(String(i), 'redonda', 4).translate([-Lr / 2 + i * 10, -W / 2 + 10.5]));
  return pl.extrude(g).subtract(U2(T).extrude(1).translate([0, 0, g - 0.6]));
}
function triangulo(pts, g, hueco, regleta) {
  const tri = P2(pts), dentro = tri.offset(-hueco, 'Round', 2, 16); let m = tri.offset(-2, 'Round', 2, 16).offset(2, 'Round', 2, 16).subtract(dentro).extrude(g);
  if (regleta) { const [a, b, sg = 1] = regleta, L = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) - 4), ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD;
    const T = marcas(L, 0, sg).concat(Array.from({ length: Math.floor(L / 10) + 1 }, (_, i) => txt2(String(i), 'redonda', 3.4).translate([i * 10, sg * 9.5])));
    m = m.subtract(U2(T).translate([2, 0]).rotate(ang).translate(a).intersect(tri).extrude(1).translate([0, 0, g - 0.6])); }
  return m;
}
function transportador(R, g) {
  const base = U2([C2(R, 0, 0).intersect(rr(2 * R + 2, R + 1, 0, 0, R / 2 - 0.5)), rr(2 * R, 8, 2, 0, -3)]), dentro = C2(R * 0.55, 0, 0).intersect(rr(2 * R, R, 0, 0, R / 2 + 3));
  const T = []; for (let a = 0; a <= 180; a++) { const lg = a % 10 === 0 ? 6 : a % 5 === 0 ? 4.2 : 2.6, r = R - lg / 2 - 0.6; T.push(rr(0.45, lg, 0, 0, 0).rotate(a - 90).translate([r * Math.cos(a * RAD), r * Math.sin(a * RAD)])); if (a % 10 === 0) { const rt = R - 11; T.push(txt2(String(a), 'redonda', 3.2).rotate(a - 90).translate([rt * Math.cos(a * RAD), rt * Math.sin(a * RAD)])); } }
  T.push(rr(0.5, 7, 0, 0, 0.5), rr(7, 0.5, 0, 0, 0)); // el centro
  return base.subtract(dentro).extrude(g).subtract(U2(T).extrude(1).translate([0, 0, g - 0.6]));
}
function geometria(p) {
  const g = p.grosor, L = [];
  if (p.que === 'todo' || p.que === 'regla') L.push(regla(Math.round(p.largo), g));
  if (p.que === 'todo' || p.que === 'escuadra') L.push(triangulo([[0, 0], [120, 0], [0, 120]], g, 16, [[0, 0], [120, 0]]));
  if (p.que === 'todo' || p.que === 'cartabon') L.push(triangulo([[0, 0], [80, 0], [0, 138.6]], g, 15, [[0, 0], [0, 138.6], -1]));
  if (p.que === 'todo' || p.que === 'transportador') L.push(transportador(62, g));
  return N.union(enFila(L, 8, 250));
}

// ======================= 🪃 BUMERÁN DE INTERIOR (3 palas) =======================
function bumeran(p) {
  const L = p.largo, g = p.grosor, w0 = 30, w1 = 18;
  let pl = U2([0, 120, 240].map(a => cap2(0, 0, w0 / 2, L, 0, w1 / 2).rotate(a)).concat([C2(20)])).offset(-4, 'Round', 2, 24).offset(4, 'Round', 2, 24);
  let m = pl.extrude(g - 0.6).add(pl.offset(-0.6, 'Round', 2, 16).extrude(0.61).translate([0, 0, g - 0.61]));
  // perfil de ala: el borde de salida de cada pala, rebajado en cuña (el de ataque queda redondo y entero)
  const tg = (g - 1.1) / 11, cuna = N.cs([N.ccw([[-2, g + 1], [-2, g], [-40, g - 38 * tg], [-40, g + 1]])], 'Positive').extrude(L + 10).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 14, 0, 0, 1]);
  [0, 120, 240].forEach(a => { m = m.subtract(cuna.rotate([0, 0, a])); });
  return p.mano === 'zurdo' ? m.mirror([1, 0, 0]) : m;
}

// ======================= 🎶 SILBATO (de cámara) =======================
// Canal de 1,3 mm que entra tangente en la cámara, ventana de 3,2 mm y el bisel justo enfrente del chorro (calculado). Se imprime de pie,
// sin soportes. Que suene solo se comprueba soplando.
function silbato(p) {
  const Rc = p.tam === 'grande' ? 10 : 8, e = 1.6, Hc = 10, tw = 1.3, Lm = 24, Lw = 3.2, Ht = Hc + 2 * e;
  let m = cil(2 * (Rc + e), Ht).add(caja(Lm, tw + 2.6 + 1.6 + 0.6, Ht, -Lm / 2, Rc - tw - 2.6 + (tw + 2.6 + 1.6 + 0.6) / 2, 0));
  m = m.subtract(cil(2 * Rc, Hc, e));
  const zc0 = e + 1, zc1 = e + Hc - 1;
  m = m.subtract(caja(Lm + 2, tw, zc1 - zc0, -Lm / 2 - 0.8, Rc - tw / 2, zc0)); // el canal
  m = m.subtract(caja(Lw, tw + 4, zc1 - zc0, Lw / 2, Rc - tw - 0.2 + (tw + 4) / 2, zc0)); // la ventana
  const yi = Math.sqrt(Rc * Rc - Lw * Lw); // el bisel: afila la pared justo donde corta el chorro
  m = m.subtract(P2([[Lw - 0.01, yi + 0.3], [Lw + 7, Rc + e + 0.02], [Lw - 0.01, Rc + 4]]).extrude(zc1 - zc0).translate([0, 0, zc0]));
  if (p.anilla !== false) m = m.add(CS().circle(5.5, 32).subtract(CS().circle(2.8, 32)).extrude(3.2).translate([Rc + e + 3.5, 0, 0]));
  return m;
}

// ======================= 🪀 YOYÓ (con una moneda de 1 € en cada lado para que pese) =======================
function yoyo(p) {
  const R = p.d / 2, wh = 13, rh = 7.5, mon = p.monedas !== false;
  const perfil = [[0, 0], [R - 2, 0], [R, 2], [R, wh - 2], [R - 2, wh], [R - 6, wh], [rh + 4, 4.5], [rh, 4.5], [rh, wh + 1.5], [0, wh + 1.5]];
  const mitad = () => { let m = rev(perfil, 128); if (mon) m = m.subtract(cil(23.25 + 2 * J, 2.4, -0.01)); return m; };
  const A = mitad().add(N.rosca(10, 2, 7, false).translate([0, 0, wh + 1.5 - 0.01])), B = mitad().subtract(N.rosca(10, 2, 8, true).translate([0, 0, wh + 1.5 - 7.6]));
  if (p.ver === 'montada') return N.union([A, B.rotate([180, 0, 0]).translate([0, 0, 2 * (wh + 1.5)])]); // (volteada girándola: un espejo cambiaría el sentido de la rosca)
  return N.union(enFila([A, B], 10, 200));
}

// ======================= 🏰 CATAPULTA DE MESA (con una goma elástica) =======================
function catapulta(p) {
  const La = p.largo, xp = 0, zp = 34, hU = 56, gap = 10 + 2 * 0.6;
  let base = rr(La * 1.15, 54, 6).extrude(4).translate([-La * 0.35, 0, 0]);
  [1, -1].forEach(sg => { let up = caja(16, 8, hU, xp, sg * (gap / 2 + 4), 3.99); up = up.subtract(gota2(5 + 2 * J).extrude(20).rotate([90, 0, 0]).translate([xp, sg * (gap / 2 + 4) + 10, zp])); base = base.add(up); });
  base = base.add(caja(6, gap + 16, 5, xp + 8, 0, hU - 1)); // el tope (para el brazo en vertical)
  base = base.add(cil(6, 10, 3.99, xp + 26, 0)).add(cil(10, 2, 13.98, xp + 26, 0)); // el gancho de la goma
  // el brazo (se imprime tumbado): pivote en gota, cuchara al final y muesca para la goma en la punta corta
  const brazo = (() => { let a = rr(La + 16, 10, 4, -La / 2 + 8, 0).extrude(6).add(cil(26, 12, 0, -La + 4, 0));
    a = a.subtract(M().sphere(11, 48).translate([-La + 4, 0, 12 + 6])).subtract(gota2(5 + 2 * GI).extrude(14).rotate([90, 0, 0]).rotate([0, 0, 0]).translate([0, 7, 3]));
    return a.subtract(caja(4, 12, 3, 12, 0, 3.5)); })();
  const eje = cil(5, gap + 16 + 2).add(cil(9, 2));
  if (p.que === 'base') return base; if (p.que === 'brazo') return brazo; if (p.que === 'eje') return eje;
  return N.union(enFila([base, brazo, eje], 10, 260));
}

// ======================= 🌀 HUCHA REMOLINO (las monedas dan vueltas antes de caer) =======================
// Embudo de «pozo de gravedad» (la pendiente va con 1/r: plana en el borde, muy inclinada en el centro). Por debajo, la cámara de las
// monedas: su techo sigue el embudo mientras se puede imprimir (≥ 45°) y luego baja a 45° hasta la pared (sin soportes). Una columna en el
// centro sostiene el agujero y tiene ventanas para que las monedas salgan a la cámara. Tapa de abajo a presión con tirador.
export function remolinoMedidas(p) { const R = p.d / 2, Rf = R - 8, r0 = 16, Hf = p.alto - 24, a = Hf / (1 / r0 - 1 / Rf); return { R, Rf, r0, Hf, a, H: p.alto, e: 2.4 }; }
function huchaRemolino(p) {
  const Q = remolinoMedidas(p), { R, Rf, r0, Hf, a, H, e } = Q, zf = r => H - a * (1 / r - 1 / Rf), rs = Math.sqrt(a);
  const zh = zf(r0); // donde está el agujero
  const ext = [[R, 0], [R, H], [Rf, H]]; for (let i = 1; i <= 80; i++) { const r = Rf - (Rf - r0) * i / 80; ext.push([r, zf(r)]); }
  // el techo de la cámara: pegado al embudo (offset vertical) mientras su pendiente sea ≥ 1; desde ahí, a 45° hacia la pared
  const techo = [], rm = Math.min(Rf, Math.max(r0 + 2, rs)); for (let i = 0; i <= 40; i++) { const r = r0 + 0.2 + (rm - r0 - 0.2) * i / 40, d1 = a / (r * r), l = Math.hypot(1, d1); techo.push([r + e * d1 / l, zf(r) - e / l]); }
  const [rA, zA] = techo[techo.length - 1]; let zW = zA - (R - e - rA); const rW = R - e;
  if (zW < 8) zW = 8;
  const pts = ext.concat([[r0, zh - e], [Math.min(r0 + 1.6, techo[0][0]), zh - e]]).concat(techo.filter(q => q[0] > r0 + 1.6)).concat([[rW, zW], [rW, 0]]);
  // la columna del centro (hasta la cama) con 4 ventanas en arco apuntado
  let m = rev(pts, 160).add(cil(2 * (r0 + 1.6), zh - e + 0.01).subtract(cil(2 * r0, zh, -1)));
  const hv = Math.max(10, zh - e - 6), ventana = P2([[-8, 0], [8, 0], [8, hv - 8], [0, hv], [-8, hv - 8]]);
  for (let i = 0; i < 4; i++) m = m.subtract(dePie(ventana, r0 + 4).translate([0, 0, -0.01]).rotate([0, 0, i * 90]));
  // la tapa de abajo: disco con labio que entra justo en la pared y un tirador
  const tapa = cil(2 * R, 2.4).add(cil(2 * (rW - J), 5, 2.39).subtract(cil(2 * (rW - J - 1.8), 6, 2.4))).add(rr(22, 14, 6, R + 5, 0).subtract(C2(3.5, R + 9, 0)).extrude(2.4));
  if (p.que === 'cuerpo') return m; if (p.que === 'tapa') return tapa;
  return N.union(enFila([m, tapa], 10, 420));
}

// ======================= 🔖 MARCAPÁGINAS CALADO (con nombre) =======================
function marcapaginas(p) {
  const L = p.largo, W = p.ancho, g = p.grosor;
  let cont = p.forma === 'flecha' ? U2([rr(W, L - W * 0.4, 3, 0, -W * 0.2), P2([[-W / 2, L / 2 - W * 0.4 - 1], [W / 2, L / 2 - W * 0.4 - 1], [0, L / 2]])]).offset(-2, 'Round', 2, 16).offset(2, 'Round', 2, 16) : p.forma === 'redondo' ? rr(W, L, W / 2) : rr(W, L, 4);
  const zonaTexto = p.texto && String(p.texto).trim() ? rr(W, L * 0.24, 0, 0, -L / 2 + L * 0.14) : null;
  const zonaCal = zonaTexto ? cont.subtract(zonaTexto.offset(2)) : cont;
  let cal = p.patron && p.patron !== 'ninguno' ? PT.caladoPlano(zonaCal, p.patron, p.celda || 7, 1.6, 3.5, 11) : zonaCal;
  let sh = zonaTexto ? U2([cal, cont.intersect(zonaTexto.offset(2))]) : cal;
  sh = sh.subtract(C2(2.4, 0, L / 2 - 7));
  let m = sh.extrude(g);
  if (zonaTexto) m = m.add(txtCabe(p.texto, 'redonda', Math.min(W * 0.32, 11), W * 0.8).rotate(90).translate([0, -L / 2 + L * 0.14]).intersect(cont).extrude(0.8).translate([0, 0, g - 0.01]));
  return m;
}

// ======================= 🧻 SERVILLETERO CALADO =======================
function servilletero(p) {
  const L = p.largo, H = p.alto, hu = p.hueco, e = 3;
  let base = rr(L, hu + 2 * e + 16, 8).extrude(5);
  const panel2 = U2([rr(L, H * 0.7, 0, 0, H * 0.35), E2(L / 2, H * 0.3, 0, H * 0.7)]).intersect(rr(L, H, 0, 0, H / 2));
  const cal = p.patron && p.patron !== 'ninguno' ? PT.caladoPlano(panel2.subtract(rr(L, 14, 0, 0, 7)), p.patron, 11, 2.4, 6, 5) : panel2.subtract(rr(L, 14, 0, 0, 7));
  const panel = U2([cal, panel2.intersect(rr(L, 14, 0, 0, 7))]);
  [1, -1].forEach(sg => { base = base.add(dePie(panel, e).translate([0, sg * (hu / 2 + e / 2) + e / 2, 4.99])); });
  return base;
}

// ======================= 🌱 ESTACIÓN DE ESQUEJES (tubos de ensayo) =======================
function esquejes(p) {
  const nT = Math.round(p.tubos), dT = Number(p.tubo), paso = dT + 14, L = nT * paso + 24, W = Math.max(36, dT + 18), H = p.alto, dP = 9, xP = L / 2 - 6;
  let base = rr(L, W, 8).extrude(14);
  for (let i = 0; i < nT; i++) base = base.subtract(cil(dT + 2 * J, 9, 5.01, -L / 2 + 12 + paso * (i + 0.5), 0));
  [-1, 1].forEach(sg => { base = base.add(cil(dP, H - 14, 13.99, sg * xP, 0)).add(cil(5, 5, H - 0.01, sg * xP, 0)); });
  let tapa2 = p.forma === 'nube' ? U2(Array.from({ length: nT + 1 }, (_, i) => C2(paso * 0.62, -L / 2 + 12 + paso * i, 2)).concat([rr(L, W * 0.8, 6, 0, -2)])).offset(-3, 'Round', 2, 16).offset(3, 'Round', 2, 16) : rr(L, W, 8);
  for (let i = 0; i < nT; i++) tapa2 = tapa2.subtract(C2((dT + 2 * GI) / 2, -L / 2 + 12 + paso * (i + 0.5), 0));
  [-1, 1].forEach(sg => { tapa2 = tapa2.subtract(C2(2.5 + PR, sg * xP, 0)); });
  const tapa = tapa2.extrude(4);
  if (p.ver === 'montada') return N.union([base, tapa.translate([0, 0, H])]);
  return N.union(enFila([base, tapa], 10, 260));
}

// ======================= 🪴 MACETA DE PARED (media: hexagonal, redonda o facetada) =======================
function macetaPared(p) {
  const A = p.ancho, H = p.alto, e = 2.4, nLados = p.forma === 'hex' ? 6 : p.forma === 'facetada' ? 8 : 64;
  const full = N.cs([N.ccw(N.poligono2(nLados, A, p.forma === 'hex' ? 0 : 90 / nLados * 2))], 'Positive');
  const media = full.intersect(rr(A * 2, A, 0, 0, -A / 2)); // la mitad: lo recto (y = 0) contra la pared
  let m = media.extrude(H).subtract(media.offset(-e, 'Miter').extrude(H).translate([0, 0, 2.4]));
  // el ojal en la pared de atrás (cabeza de tornillo de hasta 8 mm), de pie: arco arriba, sin soportes
  const ojal = U2([C2(4.2, 0, H * 0.72), rr(4.2, 9, 2.1, 0, H * 0.72 + 4.5)]);
  m = m.subtract(ojal.extrude(e + 2).rotate([90, 0, 0]).translate([0, 1, 0]));
  return m;
}

// ======================= 💍 EXPOSITOR DE PENDIENTES =======================
function expositor(p) {
  const W = p.ancho, H = p.alto, g = 3;
  let pl;
  if (p.forma === 'arbol') { pl = U2([rr(12, H * 0.4, 3, 0, H * 0.2)].concat([[1, 0.3, 0.62], [0.78, 0.5, 0.82], [0.56, 0.68, 1]].map(([k, y0, y1]) => P2([[-W / 2 * k, H * y0], [W / 2 * k, H * y0], [0, H * y1]])))).offset(-4, 'Round', 2, 16).offset(4, 'Round', 2, 16); }
  else pl = rr(W, H, 8, 0, H / 2).subtract(rr(W - 16, H - 16, 4, 0, H / 2 + 2).subtract(U2(Array.from({ length: 6 }, (_, i) => rr(W, 3.2, 0, 0, 14 + i * (H - 30) / 5)))));
  const hoyos = []; for (let y = 16; y < H - 6; y += 9) for (let x = -W / 2 + 8; x <= W / 2 - 8; x += 7) hoyos.push(C2(0.8, x + (Math.round(y / 9) % 2 ? 3.5 : 0), y));
  pl = pl.subtract(U2(hoyos).intersect(pl.offset(-2.2, 'Round', 2, 12)));
  const pest = rr(W * 0.4, 10, 0, 0, -4.99);
  const panel = U2([pl, pest]).extrude(g);
  const peana = rr(Math.max(W * 0.9, 60), 46, 8).extrude(12).subtract(caja(W * 0.4 + 2 * J, g + 2 * J, 11, 0, 8, 2.01)).subtract(rr(Math.max(W * 0.9, 60) - 14, 14, 6, 0, -10).extrude(9).translate([0, 0, 4]));
  if (p.que === 'panel') return panel; if (p.que === 'peana') return peana;
  return N.union(enFila([panel, peana], 10, 250));
}

// ======================= 🌿 DESHOJADOR DE HIERBAS =======================
function deshojador(p) {
  const L = p.largo, g = 3.2, hoja = U2([E2(L / 2, L * 0.24, 0, 0)]).subtract(C2(3, L / 2 - 8, 0));
  const D = [2.2, 3, 3.8, 4.8, 6, 7.2, 8.6, 10, 12], xs = D.map((d, i) => -L / 2 + 14 + (L - 34) * i / (D.length - 1));
  let m = hoja.extrude(g); D.forEach((d, i) => { m = m.subtract(M().cylinder(g + 0.02, d / 2, d / 2 + g * 0.6, 32).translate([xs[i], 0, -0.01])); });
  return m.add(tira2([[-L / 2 + 6, 0, 0.6], [L / 2 - 14, 0, 0.6]]).subtract(U2(D.map((d, i) => C2(d / 2 + 2.2, xs[i], 0)))).extrude(0.6).translate([0, 0, g - 0.01]));
}

// ======================= 🍋 EXPRIMIDOR DE LIMONES (con su vaso) =======================
function exprimidor(p) {
  const Rv = 48, Hv = 62, e = 2.2;
  // el vaso: pared, fondo, pico (muesca + cuña por fuera a 45°) y asa en D (sube a 45° desde abajo)
  let vaso = cil(2 * Rv, Hv).subtract(cil(2 * (Rv - e), Hv, 2.4));
  const muesca = P2([[-9, 0], [9, 0], [0, -9]]).extrude(20).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([Rv - 10, 0, Hv + 0.01]);
  vaso = vaso.add(N.cs([N.ccw([[0, -7], [7, 0], [0, 0]])], 'Positive').extrude(16).rotate([90, 0, 0]).translate([Rv - 0.5, 8, Hv])).subtract(muesca).subtract(cil(2 * (Rv - e), Hv, 2.4));
  const asa = [[Rv - 1, 14], [Rv + 12, 27], [Rv + 18, 40], [Rv + 13, 52], [Rv - 1, 56]];
  for (let i = 0; i < asa.length - 1; i++) vaso = vaso.add(M().hull([M().sphere(4.5, 24).translate([-asa[i][0], 0, asa[i][1]]), M().sphere(4.5, 24).translate([-asa[i + 1][0], 0, asa[i + 1][1]])]));
  // el exprimidor: suelo, cono con 12 costillas, embudo a 45° que se apoya en el borde del vaso (centrado solo) y agujeros de colar
  const rb = 30, Hc = 40, rFun = 54, zTop = rFun - rb;
  let ex = rev([[0, 0], [rb, 0], [rFun, zTop], [rFun, zTop + 4], [rFun - 2.2, zTop + 4], [rFun - 2.2, zTop], [rb - 3.1 + 0.01, 2.4], [0, 2.4]], 128);
  ex = ex.add(M().cylinder(Hc, 20, 1.2, 64).translate([0, 0, 2.39]));
  for (let k = 0; k < 12; k++) ex = ex.add(N.cs([N.ccw([[22, 0], [2.2, Hc - 1], [0, Hc - 1], [0, 0]])], 'Positive').extrude(1.6).rotate([90, 0, 0]).translate([0, 0.8, 2.39]).rotate([0, 0, k * 30]));
  for (let k = 0; k < 16; k++) ex = ex.subtract(cil(3.6, 6, -1, 24.5, 0).rotate([0, 0, k * 22.5 + 11]));
  for (let k = 0; k < 12; k++) ex = ex.subtract(caja(2.2, 12, 8, rb + 6, 0, 2.6).rotate([0, 0, k * 30 + 15]));
  if (p.que === 'vaso') return vaso; if (p.que === 'exprimidor') return ex;
  return N.union(enFila([vaso, ex], 12, 260));
}

// ======================= 🍺 ABREBOTELLAS DE LLAVERO (con una moneda) =======================
const MONEDAS = { e1: [23.25, 2.33, 'Moneda de 1 €'], e2: [25.75, 2.2, 'Moneda de 2 €'], c50: [24.25, 2.38, 'Moneda de 50 céntimos'] };
export function abreMedidas(p) { const [dm, tm] = MONEDAS[p.moneda] || MONEDAS.e1, g = 8, z0 = 2.6, zP = z0 + tm + 0.3; return { dm, tm, g, z0, zP, pausa: Math.round(Math.ceil((zP - 0.1) / 0.2 - 1e-9) * 0.2 * 100) / 100 }; }
function abrebotellas(p) {
  const Q = abreMedidas(p), { dm, tm, g, z0 } = Q, L = p.largo, W = 36, xo = L / 2 - 24, ho = 22, lo = 34;
  const cont = U2([rr(L - W / 2, W, 8, -W / 4, 0), C2(W / 2, L / 2 - W / 2, 0)]);
  let m = cont.extrude(g).subtract(rr(lo, ho, 6, xo, 0).extrude(g + 2).translate([0, 0, -1])).subtract(cil(6, g + 2, -1, -L / 2 + 8, 0));
  // la moneda asoma 4 mm por el lado del agujero que da al mango: hueco a media altura (pausa la impresión y métela)
  const xm = xo - lo / 2 - dm / 2 + 4; m = m.subtract(cil(dm + 0.4, tm + 0.3, z0, xm, 0));
  if (p.texto && String(p.texto).trim()) m = m.subtract(txtCabe(p.texto, 'gorda', 9, L * 0.45).translate([-L * 0.22, 0]).extrude(1).translate([0, 0, g - 0.6]));
  return m;
}

// ======================= 💍 ANILLO ANTIESTRÉS (gira, sale ya montado) =======================
export function anilloMedidas(p) { const din = (Number(p.talla) + 40) / Math.PI, r1 = din / 2, w = p.ancho; return { din, r1, w, rA: r1 + 2.1, rOut: r1 + 2.6 + 0.64 + 1.6 }; }
function anilloFidget(p) {
  const { r1, w } = anilloMedidas(p);
  const dentro = rev([[r1, 0], [r1 + 1.6, 0], [r1 + 1.6, w / 2 - 1], [r1 + 2.6, w / 2], [r1 + 1.6, w / 2 + 1], [r1 + 1.6, w], [r1, w]], 128);
  const ra = r1 + 2.1, ap = r1 + 2.6 + 0.64, ro = ap + 1.6, z1 = w / 2 - 1.14;
  let fuera = rev([[ra + 0.3, 0], [ro, 0], [ro, w], [ra, w], [ra, w - z1], [ap, w / 2], [ra, z1], [ra, 0.3]], 128);
  if (p.estilo === 'rayas') for (let k = 0; k < 30; k++) fuera = fuera.subtract(cil(1.4, w + 2, -1, ro + 0.35, 0).rotate([0, 0, k * 12]));
  return N.union([dentro, fuera]);
}

const PATS_VERT = [['ninguno', 'Liso'], ['panal', '⬢ Panal'], ['rombos', '◆ Rombos'], ['circulos', '● Círculos']];
const PATS = [['ninguno', 'Sin calado']].concat(Object.entries(PT.PATRONES));
export const DISENOS_52 = {
  // ---------- 📦 cajas ----------
  cajaRegalo: { cat: 'regalos', tambien: ['organizar', 'navidad', 'cuqui'], e: '🎁', t: 'Caja regalo con lazo', d: 'La tapa cubre por fuera, cintas en relieve y un lazo abombado que se clava con dos clavijas', uso: 'deco', color: '#e63946', nuevo: true,
    campos: [n('lado', 'Lado', 80, 50, 140, 1), n('alto', 'Alto', 60, 30, 120, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Todo (caja, tapa, lazo y clavijas)'], ['caja', 'La caja'], ['tapa', 'La tapa'], ['lazo', 'El lazo y las clavijas']]), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montada']])],
    gen: p => cajaRegalo(p), nota: p => { const Q = regaloMedidas(p); return 'La tapa entra por fuera con ' + n2(J) + ' mm de holgura por lado (encaja sin apretar) y baja ' + n2(Q.tH) + ' mm. La tapa se imprime boca abajo; el lazo, plano (su cruz de cinta de 2 mm queda encima de la tapa) y se sujeta con las 2 clavijas a presión. Caja y tapa en un color y el lazo en otro. Sin soportes.'; } },
  huevoSorpresa: { cat: 'regalos', tambien: ['ninos', 'cuqui'], e: '🥚', t: 'Huevo sorpresa que se abre', d: 'Dos mitades que encajan: para meter un regalo, dinero o una pedida', uso: 'deco', color: '#f4acb7', nuevo: true,
    campos: [n('d', 'Ancho', 60, 40, 90, 1), c('dePie', 'Con la base plana (se tiene de pie)', true)],
    gen: p => esferaAbre(Object.assign({}, p, { forma: 'huevo' })), nota: p => 'Labio de 4 mm con ' + n2(J) + ' mm de holgura: cierra con un clic suave. Las dos mitades se imprimen con la cúpula hacia arriba y por dentro el techo es un cono de 45°: sin soportes. Hueco de unos ' + n2(p.d - 4.8) + ' mm de ancho.' },
  bolaNavidadAbre: { cat: 'navidad', tambien: ['regalos'], e: '🎄', t: 'Bola de Navidad que se abre (regalo dentro)', d: 'Para meter dinero, una joya o una nota y colgarla en el árbol', uso: 'deco', color: '#c1121f', nuevo: true,
    campos: [n('d', 'Diámetro', 70, 50, 100, 1)],
    gen: p => esferaAbre(Object.assign({}, p, { forma: 'bola', tipo: 'navidad' })), nota: () => 'Labio de 4 mm con ' + n2(J) + ' mm de holgura. Anilla de pie arriba para la cinta. Las dos mitades con la cúpula hacia arriba (techo por dentro a 45°): sin soportes. En PLA seda brillante parece de cristal.' },
  bolaPremios: { cat: 'mascotas', tambien: ['juegos'], e: '🐶', t: 'Bola de premios para perros pequeños y gatos', d: 'Se abre, metes chuches y van saliendo por los agujeros mientras juega', uso: 'deco', color: '#ffb703', nuevo: true,
    campos: [n('d', 'Diámetro', 70, 50, 90, 1), n('agujero', 'Agujeros (tamaño de la chuche)', 11, 6, 16, 0.5)],
    gen: p => esferaAbre(Object.assign({}, p, { forma: 'bola', tipo: 'premios' })), nota: () => 'Seis agujeros (3 en cada mitad). Juego VIGILADO: no es un mordedor (el plástico mordido se astilla). Mejor PETG. Sin soportes.' },
  pastilleroGiratorio: { cat: 'hogar', tambien: ['organizar'], e: '💊', t: 'Pastillero giratorio de 7 días', d: 'Giras la tapa hasta el día y la pastilla sale por la ventana', uso: 'deco', color: '#90e0ef', nuevo: true,
    campos: [n('d', 'Diámetro', 92, 80, 120, 1), n('alto', 'Alto de los huecos', 16, 12, 26, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Base y tapa'], ['base', 'La base'], ['tapa', 'La tapa']]), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montada']])],
    gen: p => pastillero(p), nota: () => 'L M X J V S D en relieve por fuera; el octavo hueco va macizo (ahí descansa la ventana cerrada). La tapa entra a presión en el poste del centro (dos ranuras y un diente de 0,5 mm) y gira con ' + n2(GI) + ' mm de holgura. Sin soportes.' },
  cajaGiratoria: { cat: 'organizar', tambien: ['regalos', 'oficina'], e: '🔄', t: 'Caja con tapa giratoria (se abre de lado)', d: 'La tapa gira sobre un pasador y hace clic al cerrar; con nombre grabado', uso: 'deco', color: '#3a86ff', nuevo: true,
    campos: [n('L', 'Largo', 100, 60, 160, 1), n('W', 'Ancho', 70, 40, 120, 1), n('H', 'Alto', 40, 25, 80, 1), tx('nombre', 'Nombre en la tapa (opcional)', ''), s('que', 'Qué sacar', 'todo', [['todo', 'Caja y tapa'], ['base', 'La caja'], ['tapa', 'La tapa']]), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montada']])],
    gen: p => cajaGiratoria(p), nota: () => 'Pasador de 6 mm en un agujero de ' + n2(6 + 2 * GI) + ' (gira) y un botón de 0,6 mm que entra en su hoyo al cerrar. La tapa se imprime boca abajo con el pasador hacia arriba. Sin soportes.' },
  cajaDientes: { cat: 'bebes', tambien: ['regalos', 'ninos', 'cuqui'], e: '🦷', t: 'Cajita para los dientes de leche', d: 'Con forma de muela, carita sonriente y tu texto en la tapa', uso: 'deco', color: '#ffffff', nuevo: true,
    campos: [n('ancho', 'Ancho', 70, 50, 100, 1), n('alto', 'Alto', 32, 22, 60, 1), tx('texto', 'Texto de la tapa', 'Mis dientes'), s('que', 'Qué sacar', 'todo', [['todo', 'Caja y tapa'], ['caja', 'La caja'], ['tapa', 'La tapa']]), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montada']])],
    gen: p => cajaDientes(p), nota: () => 'Tapa con labio de 5 mm que entra con ' + n2(J) + ' mm de holgura. La carita y el texto van grabados en la cara de arriba de la tapa (se imprime boca abajo). Sin soportes.' },
  deckBox: { cat: 'frikis', tambien: ['juegos', 'organizar'], e: '🃏', t: 'Caja para cartas (deck box) con tapa de tubo', d: 'La tapa baja por fuera y queda a ras; hueco para sacar las cartas con dos dedos', uso: 'deco', color: '#5a189a', nuevo: true,
    campos: [s('cartas', 'Cartas', 'fundas', Object.entries(CARTAS).map(([k, v]) => [k, v[2]])), n('grosor', 'Grosor del mazo', 40, 15, 100, 1), tx('texto', 'Texto de la tapa (opcional)', ''), s('que', 'Qué sacar', 'todo', [['todo', 'Caja y tapa'], ['caja', 'La caja'], ['tapa', 'La tapa']]), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montada']])],
    gen: p => deckBox(p), nota: p => 'Para ' + (CARTAS[p.cartas] || CARTAS.fundas)[2].toLowerCase() + ': unas ' + Math.round(p.grosor / 0.62) + ' cartas con funda (mide tu mazo apretado con la mano). La tapa desliza por fuera del cuello con ' + n2(J) + ' mm de holgura. Sin soportes.' },
  // ---------- 🎃 Halloween ----------
  fantasmaVela: { cat: 'halloween', tambien: ['lamparas', 'ninos', 'cuqui'], e: '👻', t: 'Fantasma para vela LED', d: 'Con el bajo en ondas, bracitos y la cara calada: la luz sale por los ojos', uso: 'deco', color: '#f8f9fa', nuevo: true,
    campos: [n('alto', 'Alto', 110, 80, 160, 1), n('d', 'Ancho', 70, 55, 100, 1), s('cara', 'Cara', 'boo', [['boo', '😮 ¡Buuu!'], ['sonrisa', '🙂 Sonriente'], ['susto', '😱 Asustado']])],
    gen: p => fantasma(p), nota: p => 'Hueco por debajo de ' + n2(p.d * 1.06 - 3.6) + ' mm: entra una vela LED de té (Ø38–40). Techo por dentro a 45° y ondas del bajo en arco: sin soportes. En PLA blanco o que brille en la oscuridad. Nunca con vela de verdad.' },
  calderoCaramelos: { cat: 'halloween', tambien: ['hogar', 'ninos'], e: '🧙', t: 'Caldero de bruja para caramelos (con asa)', d: 'Barriga, borde redondo, tres patitas y un asa que se engancha a presión', uso: 'deco', color: '#2b2d42', nuevo: true,
    campos: [n('d', 'Ancho', 120, 80, 160, 1), n('alto', 'Alto', 90, 60, 120, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Caldero y asa'], ['caldero', 'El caldero'], ['asa', 'El asa']])],
    gen: p => caldero(p), nota: () => 'Por fuera la barriga empieza en un cono de 45° y por dentro la curva no pasa de 26°: sin soportes. Las orejas del asa llevan cuña debajo y agujero en gota. El asa se imprime plana: ábrela un poco y mete los pivotes.' },
  lapidaHalloween: { cat: 'halloween', tambien: ['deco'], e: '🪦', t: 'Lápida de Halloween con nombre', d: 'R.I.P. y el nombre grabados, con una grieta y su peana', uso: 'deco', color: '#8d99ae', nuevo: true,
    campos: [n('ancho', 'Ancho', 70, 50, 120, 1), n('alto', 'Alto', 90, 60, 150, 1), tx('texto', 'Arriba', 'R.I.P.'), tx('nombre', 'Nombre (opcional)', 'BOO'), s('forma', 'Forma', 'redonda', [['redonda', 'Arco redondo'], ['recta', 'Recta']])],
    gen: p => lapida(p), nota: () => 'Se imprime de pie (como queda): el texto grabado 1,2 mm en la cara de delante. Píntala en gris piedra con un pincel seco.' },
  // ---------- 🎄 Navidad ----------
  arbolEspiral: { cat: 'navidad', tambien: ['lamparas', 'jarrones'], e: '🌲', t: 'Árbol de Navidad en espiral', d: 'Estrella retorcida que sube en punta: en modo jarrón sale en minutos', uso: 'jarron', color: '#2d6a4f', nuevo: true,
    campos: [n('alto', 'Alto', 180, 100, 250, 1), n('d', 'Ancho de abajo', 100, 60, 160, 1), n('puntas', 'Puntas', 7, 5, 10, 1, ''), n('vueltas', 'Giro (vueltas)', 0.6, 0, 1.5, 0.05, ''), s('estilo', 'Estilo', 'estrella', [['estrella', 'Puntas marcadas'], ['suave', 'Puntas suaves']])],
    gen: p => arbolEspiral(p), nota: () => 'MODO JARRÓN (espiral, una pared). Con 0 capas de fondo lo pones encima de una vela LED y brilla entero. En PLA verde translúcido o blanco.' },
  // ---------- 👶 bebés y fiestas ----------
  cakeTopper: { cat: 'bebes', tambien: ['regalos', 'empresas'], e: '🎂', t: 'Cake topper con nombre o frase', d: 'Texto en una pieza con dos palillos: cumpleaños, bodas, bautizos y comuniones', uso: 'deco', color: '#ffd166', nuevo: true,
    campos: [tx('texto', 'Texto', 'Feliz cumple'), s('fuente', 'Letra', 'cursiva', [['cursiva', 'Cursiva'], ['redonda', 'Redonda'], ['gorda', 'Gorda'], ['clasica', 'Clásica']]), n('ancho', 'Ancho', 140, 80, 180, 1), s('adorno', 'Adorno a los lados', 'corazones', [['ninguno', 'Sin adorno'], ['corazones', '❤ Corazones'], ['estrellas', '★ Estrellas']]), n('grosor', 'Grosor', 3, 2.4, 5, 0.2)],
    gen: p => cakeTopper(p), nota: () => 'Las letras se engordan medio milímetro para tocarse, una barra por debajo lo une todo y los puntos de la «i» y las tildes llevan su palito: sale en UNA pieza. En PLA seda dorado o plateado queda de tienda. Ponle papel de horno o film entre el topper y la tarta.' },
  placaNacimiento: { cat: 'bebes', tambien: ['regalos', 'cuadros'], e: '👶', t: 'Placa de nacimiento (nombre, fecha, peso y hora)', d: 'Con el nombre en cursiva y los datos del día que nació', uso: 'deco', color: '#a2d2ff', nuevo: true,
    campos: [tx('nombre', 'Nombre', 'Lucía'), tx('fecha', 'Fecha', '17 · 10 · 2026'), tx('datos', 'Datos', '3,2 kg · 50 cm · 08:45'), s('forma', 'Forma', 'nube', [['nube', '☁ Nube'], ['rect', '▭ Rectangular'], ['corazon', '♡ Corazón']]), n('ancho', 'Ancho', 150, 110, 200, 1)],
    gen: p => placaNacimiento(p), dosColores: () => ({ z: 3, color: '#ffffff' }), nota: () => '🌈 Pon la pausa de color a 3 mm: las letras y el borde salen en blanco. Dos agujeros arriba para colgarla con cinta.' },
  cartelPuerta: { cat: 'bebes', tambien: ['ninos', 'regalos', 'cuqui'], e: '🚪', t: 'Cartel de puerta con nombre (nube, estrella o arcoíris)', d: 'Para la habitación de los peques, con dos agujeros para la cinta', uso: 'deco', color: '#ffc8dd', nuevo: true,
    campos: [tx('nombre', 'Nombre', 'Hugo'), s('forma', 'Forma', 'nube', [['nube', '☁ Nube'], ['estrella', '★ Estrella'], ['arco', '🌈 Arcoíris']]), n('ancho', 'Ancho', 160, 110, 220, 1)],
    gen: p => cartelPuerta(p), dosColores: () => ({ z: 3, color: '#ffffff' }), nota: () => '🌈 Pausa de color a 3 mm: el nombre y el borde en otro color. Cuélgalo con una cinta por los dos agujeros.' },
  // ---------- 👾 frikis ----------
  peanasMiniaturas: { cat: 'frikis', tambien: ['juegos'], e: '♟️', t: 'Peanas para miniaturas (rol y wargames)', d: '25, 28, 32, 40 o 50 mm, con textura de losas, adoquines, rejilla o madera', uso: 'pieza', color: '#495057', nuevo: true,
    campos: [s('diametro', 'Tamaño', '32', [['25', '25 mm'], ['28', '28 mm'], ['32', '32 mm'], ['40', '40 mm'], ['50', '50 mm']]), s('forma', 'Forma', 'redonda', Object.entries(FORMAS_PEANA)), s('textura', 'Textura', 'losas', [['lisa', 'Lisa'], ['losas', 'Losas'], ['adoquines', 'Adoquines'], ['rejilla', 'Rejilla'], ['madera', 'Tablas de madera']]), n('cantidad', 'Cuántas', 8, 1, 24, 1, ''), s('iman', 'Hueco para imán (debajo)', 'no', [['no', 'Sin imán'], ['6x2', 'Imán de 6 × 2'], ['8x2', 'Imán de 8 × 2'], ['10x2', 'Imán de 10 × 2']])],
    gen: p => peanas(p), nota: p => 'Biselada a 45° (1,2 mm) y con la textura grabada 0,45 mm.' + (p.iman !== 'no' ? ' El hueco del imán tiene 0,2 mm de más: entra a presión.' : '') + ' Capa de 0,12 si quieres la textura muy fina.' },
  contadorVida: { cat: 'frikis', tambien: ['juegos'], e: '❤️', t: 'Contador de vidas de 00 a 99 (con clic)', d: 'Dos ruedas de números que giran con clic: para cualquier juego de cartas o de mesa', uso: 'deco', color: '#9d0208', nuevo: true,
    campos: [n('rueda', 'Tamaño de cada rueda', 42, 34, 56, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Base y 2 ruedas'], ['base', 'La base'], ['ruedas', 'Las 2 ruedas']]), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montada']])],
    gen: p => contadorVida(p), nota: () => 'Cada rueda entra a presión en su poste (dos ranuras y un diente) y gira con ' + n2(GI) + ' mm de holgura; un botoncito de la base cae en uno de sus 10 hoyos: clic en cada número. La flecha marca el número que vale. Sin soportes.' },
  // ---------- 🔬 ciencia ----------
  solidosPlatonicos: { cat: 'ciencia', tambien: ['oficina', 'deco'], e: '🔷', t: 'Los 5 sólidos platónicos (con peana y nombres)', d: 'Tetraedro, cubo, octaedro, dodecaedro e icosaedro, cada uno apoyado en una cara', uso: 'deco', color: '#4361ee', nuevo: true,
    campos: [n('tam', 'Tamaño', 34, 20, 60, 1), s('que', 'Cuáles', 'todos', [['todos', 'Los cinco']].concat(Object.entries(SOLIDOS).map(([k, v]) => [k, v.t]))), c('peana', 'Con la peana (huecos y nombres)', true)],
    gen: p => solidos(p), nota: () => 'Cada sólido se calcula exacto (envolvente de sus vértices) y se gira para que apoye en una CARA: sin soportes. La peana tiene el hueco de esa cara (con holgura) y el nombre grabado.' },
  moebius: { cat: 'ciencia', tambien: ['deco', 'adultos'], e: '♾️', t: 'Cinta de Möbius (escultura)', d: 'Una superficie de una sola cara: con 1 o 3 medias vueltas', uso: 'deco', color: '#ff006e', soportes: true, nuevo: true,
    campos: [n('d', 'Diámetro', 80, 50, 140, 1), n('ancho', 'Ancho de la cinta', 20, 10, 40, 1), n('grosor', 'Grosor', 3, 2, 5, 0.2), n('medias', 'Medias vueltas', 1, 1, 5, 2, '')],
    gen: p => moebius(p), nota: () => 'Por su forma lleva SOPORTES de árbol (se quitan fácil). En PLA seda de dos colores queda espectacular.' },
  setGeometria: { cat: 'ciencia', tambien: ['oficina', 'ninos'], e: '📐', t: 'Juego de geometría: regla, escuadra, cartabón y transportador', d: 'Con las marcas de milímetro y de grado grabadas', uso: 'pieza', color: '#00b4d8', nuevo: true,
    campos: [s('que', 'Qué sacar', 'todo', [['todo', 'Las cuatro piezas'], ['regla', 'Regla'], ['escuadra', 'Escuadra (45°)'], ['cartabon', 'Cartabón (30° y 60°)'], ['transportador', 'Transportador']]), n('largo', 'Largo de la regla', 150, 100, 180, 10), n('grosor', 'Grosor', 2.4, 2, 4, 0.2)],
    gen: p => geometria(p), nota: () => 'Marcas grabadas 0,6 mm (cada milímetro, cada 5 y cada centímetro con su número; en el transportador, cada grado). Salen exactas si tu impresora está calibrada (la probeta de precisión): compruébalo con otra regla. Rellena las marcas con rotulador y limpia.' },
  // ---------- 🚲 juguetes ----------
  bumeran: { cat: 'juguetes', tambien: ['ninos', 'juegos'], e: '🪃', t: 'Bumerán de interior (3 palas)', d: 'Con perfil de ala en cada pala; para diestros o zurdos', uso: 'deco', color: '#ff7b00', nuevo: true,
    campos: [n('largo', 'Largo de cada pala', 75, 60, 95, 1), s('mano', 'Para', 'diestro', [['diestro', 'Diestros'], ['zurdo', 'Zurdos']]), n('grosor', 'Grosor', 3.2, 2.6, 4, 0.2)],
    gen: p => bumeran(p), nota: () => 'Plano por abajo; por arriba, el borde de salida de cada pala rebajado en cuña (perfil de ala). Lánzalo casi vertical, girando mucho, en un sitio amplio y sin personas delante. Que vuelva bien solo se comprueba lanzándolo: si se va a un lado, ajusta la inclinación.' },
  silbato: { cat: 'juguetes', tambien: ['regalos', 'ninos', 'mascotas'], e: '🎶', t: 'Silbato de cámara (de llavero)', d: 'Canal, ventana y bisel calculados; con anilla para el llavero', uso: 'deco', color: '#ffbe0b', nuevo: true,
    campos: [s('tam', 'Tamaño', 'normal', [['normal', 'Normal (más agudo)'], ['grande', 'Grande (más grave)']]), c('anilla', 'Con anilla', true)],
    gen: p => silbato(p), nota: () => 'Se imprime de pie, sin soportes (el techo de la cámara es un puente corto). Canal de 1,3 mm y el bisel justo enfrente del chorro. Lo calculado es la forma; que pite solo se comprueba soplando: si sale ronco, imprime con capa de 0,12.' },
  yoyo: { cat: 'juguetes', tambien: ['ninos', 'juegos'], e: '🪀', t: 'Yoyó de rosca (con monedas que le dan peso)', d: 'Dos mitades que se enroscan; una moneda de 1 € en cada lado', uso: 'deco', color: '#ef233c', nuevo: true,
    campos: [n('d', 'Diámetro', 56, 45, 70, 1), c('monedas', 'Hueco para una moneda de 1 € en cada lado', true), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montada']])],
    gen: p => yoyo(p), nota: () => 'Rosca de 10 mm (paso 2): se desenrosca para desenredar la cuerda. Hueco de 3 mm para la cuerda. La moneda de 1 € (Ø23,25) entra a presión por fuera. Sin soportes.' },
  catapulta: { cat: 'juguetes', tambien: ['ninos', 'ciencia'], e: '🏰', t: 'Catapulta de mesa (con goma elástica)', d: 'Brazo con cuchara, tope y gancho para la goma: lanza bolitas de papel', uso: 'deco', color: '#a47148', nuevo: true,
    campos: [n('largo', 'Largo del brazo', 110, 80, 140, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Todo'], ['base', 'La base'], ['brazo', 'El brazo'], ['eje', 'El eje']])],
    gen: p => catapulta(p), nota: () => 'Agujeros del eje en gota (sin soportes): en los pilares entra justo (' + n2(J) + ') y en el brazo gira (' + n2(GI) + '). Pon una goma del gancho de la base a la muesca del brazo, baja la cuchara y suelta: el tope la para en vertical. Solo bolitas de papel o pompones.' },
  // ---------- 🔮 canicas / monedas ----------
  huchaRemolino: { cat: 'canicas', tambien: ['regalos', 'ciencia', 'juegos'], e: '🌀', t: 'Hucha remolino (las monedas giran antes de caer)', d: 'Embudo de pozo de gravedad: las monedas dan vueltas y vueltas; también con canicas', uso: 'deco', color: '#7209b7', nuevo: true,
    campos: [n('d', 'Diámetro', 160, 120, 200, 1), n('alto', 'Alto', 80, 60, 110, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Hucha y tapa'], ['cuerpo', 'La hucha'], ['tapa', 'La tapa de abajo']])],
    gen: p => huchaRemolino(p), nota: p => { const Q = remolinoMedidas(p); return 'Agujero de ' + n2(2 * Q.r0) + ' mm (caben las de 2 €). Suelta la moneda DE CANTO junto al borde con un empujoncito: rueda dando vueltas. Por debajo, el techo sigue el embudo mientras se puede y luego baja a 45°: sin soportes (lleva relleno). ' + (p.d > 180 ? 'Solo cabe en la P1P.' : 'Cabe en la A1 mini hasta 180 mm.'); } },
  // ---------- ✴️ calados ----------
  marcapaginas: { cat: 'calados', tambien: ['regalos', 'oficina'], e: '🔖', t: 'Marcapáginas calado con nombre', d: 'Panal, voronoi, corazones… y el nombre en relieve; agujero para la borla', uso: 'deco', color: '#9d4edd', nuevo: true,
    campos: [s('forma', 'Forma', 'flecha', [['flecha', 'Punta de flecha'], ['recto', 'Recto'], ['redondo', 'Puntas redondas']]), s('patron', 'Calado', 'voronoi', PATS), tx('texto', 'Nombre (opcional)', 'Lucía'), n('largo', 'Largo', 150, 110, 180, 1), n('ancho', 'Ancho', 40, 28, 55, 1), n('grosor', 'Grosor', 1.6, 1.2, 2.4, 0.2)],
    gen: p => marcapaginas(p), dosColores: p => ({ z: p.grosor, color: '#ffffff' }), nota: p => '🌈 Pausa de color a ' + n2(p.grosor) + ' mm: el nombre en otro color. Plano, sin soportes. En PLA seda queda precioso.' },
  servilleteroCalado: { cat: 'calados', tambien: ['hogar', 'empresas'], e: '🧻', t: 'Servilletero calado', d: 'Dos paredes con calado y arco arriba sobre una base', uso: 'deco', color: '#e9c46a', nuevo: true,
    campos: [n('largo', 'Largo', 150, 100, 200, 1), n('alto', 'Alto', 95, 70, 130, 1), n('hueco', 'Hueco para las servilletas', 32, 20, 50, 1), s('patron', 'Calado', 'panal', PATS_VERT)],
    gen: p => servilletero(p), nota: () => 'Se imprime de pie, con calados que se aguantan solos de pie (panal, rombos o círculos). Sin soportes.' },
  // ---------- 🪴 macetas ----------
  estacionEsquejes: { cat: 'macetas', tambien: ['hogar', 'flores'], e: '🌱', t: 'Estación de esquejes (tubos de ensayo)', d: 'Para enraizar en agua: base con huecos y tapa con aros', uso: 'deco', color: '#bc6c25', nuevo: true,
    campos: [n('tubos', 'Tubos', 3, 2, 6, 1, ''), s('tubo', 'Diámetro del tubo', '16', [['12', '12 mm'], ['16', '16 mm'], ['20', '20 mm'], ['25', '25 mm']]), n('alto', 'Alto de la tapa', 80, 60, 120, 1), s('forma', 'Tapa', 'nube', [['nube', '☁ Nube'], ['recta', 'Recta']]), s('ver', 'Ver', 'imprimir', [['imprimir', 'Para imprimir'], ['montada', 'Montada']])],
    gen: p => esquejes(p), nota: p => 'Para tubos de ensayo de ' + p.tubo + ' mm (no incluidos). Los aros tienen ' + n2(GI) + ' mm de holgura; la tapa entra a presión en los dos pilares. Sin soportes.' },
  macetaPared: { cat: 'macetas', tambien: ['hogar'], e: '🪴', t: 'Maceta de pared (hexagonal, redonda o facetada)', d: 'Media maceta plana por detrás con ojal para un tornillo: se agrupan en la pared', uso: 'deco', color: '#f4f1de', nuevo: true,
    campos: [s('forma', 'Forma', 'hex', [['hex', '⬡ Hexagonal'], ['redonda', '◯ Redonda'], ['facetada', '◇ Facetada']]), n('ancho', 'Ancho', 110, 70, 160, 1), n('alto', 'Alto', 80, 50, 120, 1)],
    gen: p => macetaPared(p), nota: () => 'Se imprime de pie (como cuelga): el ojal de la pared de atrás tiene el arco arriba, sin soportes. Para un tornillo de cabeza de hasta 8 mm. Sin agujero de drenaje: úsala como cubremacetas.' },
  // ---------- 💼 empresas ----------
  expositorPendientes: { cat: 'empresas', tambien: ['organizar', 'cuqui'], e: '💍', t: 'Expositor de pendientes (árbol o marco)', d: 'Filas de agujeritos para ganchos y botones, en una peana con platito para anillos', uso: 'deco', color: '#ffffff', nuevo: true,
    campos: [s('forma', 'Forma', 'arbol', [['arbol', '🌳 Árbol'], ['marco', '▭ Marco con barras']]), n('ancho', 'Ancho', 120, 80, 180, 1), n('alto', 'Alto', 150, 100, 200, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Panel y peana'], ['panel', 'El panel'], ['peana', 'La peana']])],
    gen: p => expositor(p), nota: () => 'Agujeros de 1,6 mm (entran los ganchos y los pendientes de botón). El panel se imprime plano y entra en la peana con ' + n2(J) + ' de holgura. Ideal para mercadillos y tiendas.' },
  numeroMesa: { cat: 'empresas', tambien: ['regalos'], e: '🔢', t: 'Número de mesa (bodas y restaurantes)', d: 'Placa en arco con el número grande y un texto, en su peana', uso: 'deco', color: '#fefae0', nuevo: true,
    campos: [tx('numero', 'Número', '7'), tx('texto', 'Texto de arriba', 'Mesa'), n('ancho', 'Ancho', 90, 60, 140, 1), s('que', 'Qué sacar', 'todo', [['todo', 'Placa y peana'], ['placa', 'La placa'], ['peana', 'La peana']])],
    gen: p => numeroMesa(p), dosColores: () => ({ z: 4, color: '#c9a227' }), nota: () => '🌈 Pausa de color a 4 mm: número, texto y borde en dorado. La placa entra en la peana con ' + n2(J) + ' de holgura.' },
  // ---------- 🏠 casa ----------
  deshojador: { cat: 'hogar', tambien: ['flores'], e: '🌿', t: 'Deshojador de hierbas (perejil, romero, kale…)', d: '9 agujeros de 2,2 a 12 mm con el canto biselado', uso: 'pieza', color: '#52b788', nuevo: true,
    campos: [n('largo', 'Largo', 120, 90, 160, 1)],
    gen: p => deshojador(p), nota: () => 'Metes el tallo por el agujero que le va y tiras: las hojas se quedan. Para cocina, mejor PETG. Plano, sin soportes.' },
  exprimidor: { cat: 'hogar', tambien: [], e: '🍋', t: 'Exprimidor de limones con su vaso', d: 'Cono con costillas, colador y vaso con pico y asa', uso: 'deco', color: '#ffd60a', nuevo: true,
    campos: [s('que', 'Qué sacar', 'todo', [['todo', 'Vaso y exprimidor'], ['vaso', 'El vaso'], ['exprimidor', 'El exprimidor']])],
    gen: p => exprimidor(p), nota: () => 'El exprimidor se apoya en el borde del vaso con su embudo a 45° (se centra solo) y cuela por 16 agujeros y 12 ranuras. Sin soportes (el asa lleva un puente corto). Para alimentos, PETG; lávalo a mano.' },
  abrebotellas: { cat: 'regalos', tambien: ['hogar', 'empresas'], e: '🍺', t: 'Abrebotellas de llavero (con una moneda)', d: 'La moneda va dentro y hace de palanca: abre las chapas de verdad', uso: 'deco', color: '#264653', nuevo: true,
    campos: [s('moneda', 'Moneda', 'e1', Object.entries(MONEDAS).map(([k, v]) => [k, v[2]])), n('largo', 'Largo', 90, 80, 120, 1), tx('texto', 'Texto (opcional)', '')],
    gen: p => abrebotellas(p), nota: p => { const Q = abreMedidas(p); return '⏸ PAUSA la impresión a ' + n2(Q.pausa) + ' mm, mete la moneda en su hueco (plana) y sigue: queda dentro para siempre y asoma 4 mm por el agujero. Agujero de 34 × 22: entra la chapa (Ø26,6).'; } },
  anilloFidget: { cat: 'regalos', tambien: ['juegos', 'jovenes'], e: '💍', t: 'Anillo antiestrés que gira (sale montado)', d: 'Dos aros, uno dentro del otro, en tu talla', uso: 'deco', color: '#c0c0c0', nuevo: true,
    campos: [n('talla', 'Talla (española)', 16, 8, 30, 1, ''), n('ancho', 'Ancho', 8, 6, 12, 0.5), s('estilo', 'Aro de fuera', 'rayas', [['liso', 'Liso'], ['rayas', 'Con estrías']])],
    gen: p => anilloFidget(p), nota: p => { const Q = anilloMedidas(p); return 'Talla ' + p.talla + ' = ' + n2(Number(p.talla) + 40) + ' mm de contorno (Ø' + n2(Q.din) + '). Se imprime ya montado: el aro de fuera abraza el de dentro con una «V» y 0,45 mm de aire (caras a 45°: sin soportes). Si gira duro al principio, muévelo un poco hasta que se suelte.'; } }
};
