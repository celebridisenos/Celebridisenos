// ================= 21-10-2026 · 🏙️ ARQUITECTURA PREMIUM: rascacielos y estadios =================
// Ella (plan maestro, tarea 27): «tampoco hay arquitectura: edificios, estadios premium». Diseños PROPIOS (© CelebriDiseños): ningún
// edificio ni estadio con nombre o marca de nadie; formas de arquitectura (torres que giran, escalonadas art déco, estadios) a nuestra manera.
//  · 🌀 RASCACIELOS CON GIRO: la planta (cuadrada, triangular, hexagonal o en trébol) gira al subir y se estrecha; el canto de cada planta
//    sale en relieve; podio con el nombre. Modo LÁMPARA: hueco (pared de 1,6), abierto arriba, con sitio para una vela LED en el podio.
//  · 🏛️ RASCACIELOS ESCALONADO (art déco): terrazas que se retranquean, pilastras en las fachadas, corona escalonada y aguja.
//  · 🏟️ ESTADIO (ovalado o rectangular): gradas en escalones, CUBIERTA en voladizo (su cara de abajo, en escalera a 45°: sin soportes),
//    pilares en la fachada, 4 torres de focos y el CÉSPED aparte con las líneas en relieve (verde y blanco con una pausa).
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, c, tx, M, rr, poli, cil, n2, conBisel } = A;
const elipse = (w, h) => poli(N.elipse2(w, h, 96));

// ---------- 🌀 RASCACIELOS CON GIRO ----------
export const PLANTAS = { cuadrada: 'Cuadrada (esquinas redondas)', triangulo: 'Triangular', hexagono: 'Hexagonal', trebol: 'En trébol' };
function planta(k, L) { if (k === 'triangulo') return poli(N.poligono2(3, L * 1.25)).offset(-L * 0.06, 'Round').offset(L * 0.06, 'Round');
  if (k === 'hexagono') return poli(N.poligono2(6, L * 1.08, 0)); if (k === 'trebol') return N.csUnion([0, 120, 240].map(g => A.circ(L * 0.62).translate([L * 0.2 * Math.cos(g * Math.PI / 180), L * 0.2 * Math.sin(g * Math.PI / 180)]))).offset(-1, 'Round').offset(1, 'Round');
  return rr(L, L, L * 0.18); }
export function medidasTorsion(p) { const H = Math.max(100, Math.min(235, +p.alto || 200)), L = Math.max(28, Math.min(70, +p.ancho || 46)), giro = Math.max(0, Math.min(270, +p.giro == null ? 120 : +p.giro)), arriba = Math.max(0.45, Math.min(1, (+p.arriba || 70) / 100)), hp = Math.max(3, Math.min(10, +p.planta || 5));
  return { H, L, giro, arriba, hp, plantas: Math.floor(H / hp), podio: p.modo === 'lampara' ? 30 : 12 }; }
export function torsion(p) { const Q = medidasTorsion(p), P = planta(p.plano || 'cuadrada', Q.L), pd = Q.podio, lampara = p.modo === 'lampara';
  const nd = Math.max(8, Math.round(Q.H / 2));
  let torre = P.extrude(Q.H, nd, Q.giro, [Q.arriba, Q.arriba]);
  // el CANTO de cada planta, en relieve (0,6 mm hacia fuera, 0,8 de alto): girado y estrechado como la torre a esa altura
  const losas = []; for (let k = 1; k < Q.plantas; k++) { const z = k * Q.hp, t = z / Q.H, e = 1 + (Q.arriba - 1) * t; losas.push(P.offset(0.6 / e, 'Round').scale([e, e]).rotate(Q.giro * t).extrude(0.8).translate([0, 0, z - 0.4])); }
  if (losas.length) torre = torre.add(N.union(losas));
  if (lampara) { const dentro = P.offset(-1.6, 'Round').extrude(Q.H + 2, nd, Q.giro * (Q.H + 2) / Q.H, [Q.arriba, Q.arriba]).translate([0, 0, -1]); torre = torre.subtract(dentro); }
  // la CORONA: dos escalones y, si es maciza, una aguja
  const top = P.scale([Q.arriba, Q.arriba]).rotate(Q.giro);
  if (!lampara) { torre = torre.add(top.offset(-Q.L * Q.arriba * 0.12, 'Round').extrude(4).translate([0, 0, Q.H - 0.01])).add(top.offset(-Q.L * Q.arriba * 0.26, 'Round').extrude(4).translate([0, 0, Q.H + 4 - 0.02])).add(A.cono(4, 1.4, Math.min(30, 248 - pd - Q.H - 8), Q.H + 8 - 0.03)); }
  // el PODIO con el nombre (y, en la lámpara, el hueco de la vela LED y la salida del cable)
  const bp = Math.max(Q.L * 1.7, 70); let podio = conBisel(rr(bp, bp, 8), pd, 1.2);
  // (lámpara: la vela LED de Ø38 × 15 en un hueco de Ø40 × 16 y, encima, un CONO a 45° que estrecha hasta Ø16: la torre no cuelga sobre el hueco)
  if (lampara) podio = podio.subtract(cil(40, 16.01, 2)).subtract(A.cono(40, 16, 12, 18)).subtract(cil(16, 2, pd - 1)).subtract(M().hull([A.caja(10, bp / 2 + 2, 4).translate([0, -bp / 4, 2]), A.caja(0.6, bp / 2 + 2, 0.1).translate([0, -bp / 4, 2 + 4 + 5])])); // (la salida del cable, con techo a dos aguas: sin puente)
  let m = podio.add(torre.translate([0, 0, pd - 0.01]));
  const t = String(p.txt || '').trim(); if (t) { try { const T = N.centraCS(N.texto2(t, 'estrecha', 6)), b = N.cajaCS(T), k = Math.min(1, (bp - 14) / b.w, (pd - 4) / b.h); m = m.subtract(T.scale([k, k]).extrude(0.81).rotate([90, 0, 0]).translate([0, -bp / 2 + 0.8, pd / 2])); } catch (e) { } }
  return m; }

// ---------- 🏛️ RASCACIELOS ESCALONADO (art déco) ----------
export function escalonado(p) { const H = Math.max(120, Math.min(230, +p.alto || 190)), W = Math.max(40, Math.min(90, +p.ancho || 60)), niv = Math.max(3, Math.min(6, +p.terrazas || 4));
  const R = 0.8, fl = 4.6, L = [], pd = 10; let wx = W, z = pd + 3, hRest = H * 0.8;
  // la planta de cada tramo: rectángulo con las ESQUINAS ESCALONADAS (muescas), lo más art déco que hay
  const planta = (wx, wy) => { const c = Math.max(2.5, wx * 0.07), a = wx / 2, b = wy / 2;
    return { c, P: poli([[-a + c, -b], [a - c, -b], [a - c, -b + c], [a, -b + c], [a, b - c], [a - c, b - c], [a - c, b], [-a + c, b], [-a + c, b - c], [-a, b - c], [-a, -b + c], [-a + c, -b + c]]) }; };
  // una VENTANA: hueco de 1 mm de hondo con el techo a 45° (sin soportes); de perfil (y hacia dentro, z hacia arriba) y estirada a lo ancho
  const ventana = (ancho, alto) => N.transforma(poli([[-1, 0], [1, 0], [1, alto], [-1, alto + 2]]).extrude(ancho), [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, -ancho / 2, 0, 0, 1]);
  // una FACHADA (de largo «len», mirando a −y, con la cara en y = 0): pilastras de 1,2 mm de relieve y, entre ellas, filas de ventanas hundidas
  const fachada = (len, h) => { const nb = Math.max(2, Math.round(len / 6.5)), bay = (len - 1.8) / nb, add = [], sub = [], nf = Math.max(1, Math.floor((h - 5) / fl)), v = ventana(bay - 1.8 - 1.4, 2.9);
    for (let i = 0; i <= nb; i++) add.push(A.caja(1.8, 2.4, h + 0.5).translate([-len / 2 + 0.9 + bay * i, 0, -0.5]));
    for (let i = 0; i < nb; i++) for (let f = 0; f < nf; f++) sub.push(v.translate([-len / 2 + 0.9 + bay * (i + 0.5), 0, 2.6 + f * fl]));
    return { add: N.union(add), sub: N.union(sub) }; };
  const enCaras = (wx, wy, c, h, z0) => { const add = [], sub = [];
    for (const [len, x, y, g] of [[wx - 2 * c, 0, -wy / 2, 0], [wx - 2 * c, 0, wy / 2, 180], [wy - 2 * c, wx / 2, 0, 90], [wy - 2 * c, -wx / 2, 0, 270]]) { const F = fachada(len, h); add.push(F.add.rotate([0, 0, g]).translate([x, y, z0])); sub.push(F.sub.rotate([0, 0, g]).translate([x, y, z0])); }
    return { add: N.union(add), sub: N.union(sub) }; };
  // el ZÓCALO en dos escalones (el nombre va en el de abajo)
  L.push(conBisel(rr(W * 1.35, W * 1.35, 6), pd, 1.2), conBisel(rr(W + 9, W * R + 9, 3), 3.5, 0.8).translate([0, 0, pd - 0.5]));
  let prev = null;
  for (let k = 0; k < niv; k++) { const h = hRest * (k === 0 ? 0.4 : 0.6 / (niv - 1)), wy = wx * R, { c, P } = planta(wx, wy), F = enCaras(wx, wy, c, h, z);
    L.push(P.extrude(h + 0.5).translate([0, 0, z - 0.5]).add(F.add).subtract(F.sub)); /* (cada tramo se mete 0,5 en el de abajo: una sola pieza) */
    // en la TERRAZA del tramo de abajo: un pretil (1,4 de grueso, 2,4 de alto) y, encima, una pirámide en la punta de cada brazo (8)
    if (prev) { L.push(prev.P.subtract(prev.P.offset(-1.4, 'Miter')).extrude(2.4 + 0.5).translate([0, 0, z - 0.5]));
      const a = prev.wx / 2, b = prev.wy / 2, cc = prev.c, pir = M().cylinder(5.5, 1.7, 0.2, 4).rotate([0, 0, 45]); /* (base cuadrada de 2,4: cabe en la punta de cada brazo de la planta, encima del pretil) */
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) L.push(pir.translate([sx * (a - 1.2), sy * (b - cc - 1.2), z - 0.5 + 2.4]), pir.translate([sx * (a - cc - 1.2), sy * (b - 1.2), z - 0.5 + 2.4])); }
    prev = { P, c, wx, wy }; z += h; wx *= 0.78; }
  // la CORONA: 4 escalones con muescas, cada uno con un frontón en punta (chevron) en cada cara, y la AGUJA en tramos
  for (let k = 0; k < 4; k++) { const e = 1 - k * 0.19, cx = wx * e, cy = wx * R * e, { P } = planta(cx, cy), zk = z + k * 4 - 0.5;
    L.push(P.extrude(4.5).translate([0, 0, zk]));
    if (k < 3) { const g = Math.min(cx, cy) * 0.42, tri = poli([[-g / 2, 0], [g / 2, 0], [0, g * 0.5]]).extrude(2).rotate([90, 0, 0]);
      for (const [x, y, r] of [[0, -cy / 2, 0], [0, cy / 2, 180], [cx / 2, 0, 90], [-cx / 2, 0, 270]]) L.push(tri.translate([0, 2, 0]).rotate([0, 0, r]).translate([x, y, zk + 4.5 - 0.01])); } }
  z += 16;
  { const tr = [[5.2, 3.8, 5], [4.8, 3.4, 5], [4.4, 3.0, 5]]; let zz = z - 0.5; for (const [a, b, h] of tr) { L.push(A.cono(a, b, h + 0.3, zz)); zz += h; }
    L.push(A.cono(3.6, 1.2, Math.max(8, Math.min(H * 0.12, 246 - zz)), zz)); }
  let m = N.union(L);
  const t = String(p.txt || '').trim(); if (t) { try { const T = N.centraCS(N.texto2(t, 'estrecha', 6)), b = N.cajaCS(T), k = Math.min(1, (W * 1.35 - 14) / b.w, (pd - 4) / b.h); m = m.subtract(T.scale([k, k]).extrude(0.81).rotate([90, 0, 0]).translate([0, -W * 1.35 / 2 + 0.8, pd / 2])); } catch (e) { } }
  return m; }

// ---------- 🏟️ ESTADIO ----------
export function medidasEstadio(p) { const Lg = Math.max(140, Math.min(235, +p.largo || 200)), rect = p.forma === 'rectangular';
  const grad = Math.max(4, Math.min(9, +p.gradas || 6)), paso = 3.2, sube = 2.6, suelo = 3, muro = 3, cub = Math.max(0, Math.min(22, +p.cubierta == null ? 14 : +p.cubierta)), dMax = grad * paso + muro;
  // el CAMPO, lo más grande que deja el largo (proporción 105 × 68): el óvalo lo contiene con ×1,45 (> √2), el rectángulo a ras
  const wc = rect ? Lg - 10 - 2 * dMax : (Lg - 2 * dMax) / 1.45 - 10, An = Math.round(Lg * 0.74), campo = [wc, wc * 0.65];
  return { Lg, An, rect, campo, grad, paso, sube, suelo, muro, cub, H: suelo + grad * sube + 6 + cub }; } // (el muro, lo justo para que la cubierta vuele 4 mm por encima de la última grada)
// la forma del estadio a una «distancia» d del borde del campo (crece hacia fuera): elipse o rectángulo de esquinas redondas
function contorno(Q, d) { const w = Q.campo[0] + 10, h = Q.campo[1] + 10, B = Q.rect ? rr(w, h, Math.min(w, h) * 0.18) : elipse(w * 1.45, h * 1.45); return d > 0 ? B.offset(d, 'Round') : B; } // (DESPLAZADO de verdad d mm: así la escalera de la cubierta es de 45° también en el óvalo)
export function estadio(p) { const Q = medidasEstadio(p), dMax = Q.grad * Q.paso + Q.muro, fuera = contorno(Q, dMax);
  let m = conBisel(fuera, Q.H, 1.0);
  // el CUENCO: cada grada un escalón (más ancho y más alto hacia fuera); abajo, el hueco del césped
  const hueco = []; hueco.push(contorno(Q, 0).extrude(Q.H + 2).translate([0, 0, Q.suelo]));
  for (let k = 1; k <= Q.grad; k++) hueco.push(contorno(Q, k * Q.paso).extrude(Q.H + 2).translate([0, 0, Q.suelo + k * Q.sube]));
  m = m.subtract(N.union(hueco));
  // el asiento del CÉSPED: un rebaje de 1,2 mm en el suelo (el césped entra con 0,15 por lado)
  m = m.subtract(rr(Q.campo[0] + 0.3, Q.campo[1] + 0.3, 2).extrude(1.21).translate([0, 0, Q.suelo - 1.2]));
  // la CUBIERTA: un anillo arriba que vuela hacia el campo; por debajo, escalones de 0,5 × 0,5 (45°: se imprime sin soportes)
  const zTop = Q.H, dIn = Q.grad * Q.paso - Q.cub;
  if (Q.cub > 0) { const capas = [], nC = Math.round(Q.cub / 0.5); for (let j = 0; j <= nC; j++) { const z0 = zTop - Q.cub - 2 + j * 0.5, dd = Q.grad * Q.paso - j * 0.5; capas.push(fuera.subtract(contorno(Q, Math.max(dIn, dd))).extrude(zTop + 2.5 - z0).translate([0, 0, z0])); }
    m = m.add(N.union(capas)); }
  // la FACHADA: pilares (medias columnas) todo alrededor, y una franja arriba
  const pil = [], per = N.cajaCS(fuera), nP = Math.round((per.w + per.h) * 1.6 / 9);
  const P0 = fuera.toPolygons()[0]; let Lp = 0; const seg = []; for (let i = 0; i < P0.length; i++) { const a = P0[i], b = P0[(i + 1) % P0.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push([a, b, l]); Lp += l; }
  for (let k = 0; k < nP; k++) { let d = k * Lp / nP; for (const [a, b, l] of seg) { if (d <= l) { const t = d / l; pil.push(cil(3.2, Q.H - 3, 0).translate([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0])); break; } d -= l; } }
  m = m.add(N.union(pil));
  // 4 TORRES DE FOCOS (en las diagonales, por fuera), con su cabeza inclinada hacia el campo (sin voladizos: pirámide)
  if (p.focos !== false) { const tor = []; [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => { let q = P0[0]; P0.forEach(v => { if (v[0] * sx * per.h + v[1] * sy * per.w > q[0] * sx * per.h + q[1] * sy * per.w) q = v; }); // (el punto de la fachada en esa diagonal: la torre, pegada a ella)
    const x = q[0], y = q[1], Ht = Math.min(Q.H + 34, 120); /* (el eje de la torre, EN la fachada: media torre metida en ella) */
    tor.push(A.cono(6, 3.2, Ht, 0).translate([x, y, 0]), M().hull([A.caja(3.2, 3.2, 0.1).translate([x, y, Ht - 6]), A.caja(12, 8, 5, 1).rotate([0, 0, Math.atan2(-y, -x) * 180 / Math.PI + 90]).translate([x - sx * 1.5, y - sy * 1.5, Ht - 1])])); });
    m = m.add(N.union(tor)); }
  return m; }
// el CÉSPED (aparte): con las líneas en relieve (0,6 mm): banda, medio campo, círculo central, áreas y porterías
export function cesped(p) { const Q = medidasEstadio(p), [w, h] = Q.campo, g = 0.9, L = [];
  let m = rr(w - 0.3, h - 0.3, 2).extrude(1.2);
  const linea = (x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy); return A.caja(l + g, g, 0.6).rotate([0, 0, Math.atan2(dy, dx) * 180 / Math.PI]).translate([(x0 + x1) / 2, (y0 + y1) / 2, 1.19]); };
  const bx = w / 2 - 3, by = h / 2 - 3; L.push(linea(-bx, -by, bx, -by), linea(-bx, by, bx, by), linea(-bx, -by, -bx, by), linea(bx, -by, bx, by), linea(0, -by, 0, by));
  L.push(A.circ(h * 0.3 + g).subtract(A.circ(h * 0.3 - g)).extrude(0.6).translate([0, 0, 1.19]), A.circ(1.8).extrude(0.6).translate([0, 0, 1.19]));
  [-1, 1].forEach(sx => { const ax = w * 0.16, ay = h * 0.6, px = w * 0.055, py = h * 0.28; L.push(linea(sx * bx, -ay / 2, sx * (bx - ax), -ay / 2), linea(sx * bx, ay / 2, sx * (bx - ax), ay / 2), linea(sx * (bx - ax), -ay / 2, sx * (bx - ax), ay / 2));
    L.push(linea(sx * bx, -py / 2, sx * (bx - px), -py / 2), linea(sx * bx, py / 2, sx * (bx - px), py / 2), linea(sx * (bx - px), -py / 2, sx * (bx - px), py / 2)); });
  return m.add(N.union(L)); }

export const DISENOS_ARQUITECTURA = {
  rascacielosGiro: { cat: 'adultos', tambien: ['deco', 'lamparas', 'oficina', 'regalos'], nuevo: true, busca: 'rascacielos torre edificio arquitectura giro torsión twist skyscraper maqueta ciudad lámpara led moderno premium decoración',
    e: '🌀', t: 'Rascacielos con giro (y lámpara)', d: 'La planta gira al subir y se estrecha, con el canto de cada planta en relieve; maciza con aguja o LÁMPARA hueca para una vela LED', uso: 'decorativo', color: '#c9ced6',
    campos: [s('plano', 'Planta', 'cuadrada', Object.entries(PLANTAS)), n('alto', 'Alto de la torre', 200, 100, 235, 5), n('ancho', 'Ancho de la planta', 46, 28, 70, 1), n('giro', 'Giro total', 120, 0, 270, 5, '°'),
      n('arriba', 'Arriba, ancho (%)', 70, 45, 100, 5, '%'), n('planta', 'Alto de cada planta', 5, 3, 10, 0.5), s('modo', 'Modo', 'maciza', [['maciza', 'Maciza (con aguja)'], ['lampara', '💡 Lámpara (hueca, con vela LED)']]), tx('txt', 'Nombre (en el podio)', '')],
    gen: p => torsion(p),
    nota: p => { const Q = medidasTorsion(p); return 'PARA QUÉ: una torre de ' + Math.round(Q.H) + ' mm (más el podio) que GIRA ' + Q.giro + '° al subir y se estrecha al ' + Math.round(Q.arriba * 100) + ' %, con ' + Q.plantas + ' plantas marcadas en relieve. '
      + (p.modo === 'lampara' ? '💡 LÁMPARA: hueca (pared de 1,6), abierta arriba; en el podio, el hueco de una vela LED de Ø40 y la salida del cable. Imprímela en blanco o natural (la luz pasa). ' : '')
      + 'IMPRESIÓN: de pie, SIN soportes (el giro inclina las caras menos de 30°), 0,16 mm para que se vean bien las plantas; maciza, 2 paredes y 10 % de relleno.'; } },
  rascacielosArtDeco: { cat: 'adultos', tambien: ['deco', 'oficina', 'regalos'], nuevo: true, busca: 'rascacielos art deco escalonado torre edificio arquitectura aguja pilastras skyscraper maqueta ciudad nueva york estilo años 30',
    e: '🏛️', t: 'Rascacielos escalonado art déco', d: 'Terrazas que se retranquean con esquinas escalonadas, pilastras y ventanas hundidas, pretiles con pirámides, corona de frontones y aguja', uso: 'decorativo', color: '#d8c7a5',
    campos: [n('alto', 'Alto', 190, 120, 230, 5), n('ancho', 'Ancho de abajo', 60, 40, 90, 1), n('terrazas', 'Terrazas', 4, 3, 6, 1, ''), tx('txt', 'Nombre (en el podio)', '')],
    gen: p => escalonado(p),
    nota: p => 'PARA QUÉ: un rascacielos de estilo años 30 (diseño propio): ' + (+p.terrazas || 4) + ' terrazas que se retranquean, pilastras en relieve en las 4 fachadas, corona escalonada y aguja. IMPRESIÓN: de pie, SIN soportes, 0,12–0,16 mm; en dorado, latón o piedra queda muy elegante. La aguja es fina: imprímela con «Ventilador» al máximo arriba.' },
  estadioPremium: { cat: 'adultos', tambien: ['deco', 'jovenes', 'regalos', 'pro'], nuevo: true, busca: 'estadio fútbol campo maqueta arquitectura gradas cubierta focos césped stadium football soccer model regalo futbolero',
    e: '🏟️', t: 'Estadio de fútbol (maqueta premium, por piezas)', d: 'Ovalado o rectangular: gradas en escalones, cubierta en voladizo sin soportes, pilares, 4 torres de focos y el césped aparte con sus líneas', uso: 'decorativo', color: '#bfc5cc',
    campos: [s('forma', 'Forma', 'ovalado', [['ovalado', 'Ovalado'], ['rectangular', 'Rectangular (esquinas redondas)']]), n('largo', 'Largo', 200, 140, 235, 5), n('gradas', 'Gradas', 6, 4, 9, 1, ''), n('cubierta', 'Vuelo de la cubierta', 14, 0, 22, 1), c('focos', 'Torres de focos', true),
      s('que', 'Qué imprimo', 'estadio', [['estadio', 'El estadio'], ['cesped', 'El césped (con las líneas)']])],
    gen: p => p.que === 'cesped' ? cesped(p) : estadio(p),
    nota: p => { const Q = medidasEstadio(p); return 'PARA QUÉ: una maqueta de estadio (diseño propio, sin escudos ni nombres de nadie): ' + Q.grad + ' gradas en escalones, CUBIERTA que vuela ' + Q.cub + ' mm sobre las gradas, pilares en la fachada y 4 torres de focos. El CÉSPED va aparte (' + Math.round(Q.campo[0]) + ' × ' + Math.round(Q.campo[1]) + ' mm) y encaja en su rebaje. '
      + 'IMPRESIÓN: el estadio de pie, SIN soportes (la cara de abajo de la cubierta va en escalera a 45°), 0,16 mm, gris o blanco. El césped en VERDE con una PAUSA a 1,2 mm para las líneas en BLANCO.'; } }
};
