// ================= v40.1 · 🧩 TARJETAS-KIT PARA NIÑOS: se sacan las piezas y se montan, sin pegamento =================
// La dueña (12-10-2026): «tienes que hacer más tarjetas kits de montaje de juegos… y que funcione, funcional» · «acaba los kits, son
// importantes para los niños».
// Una TARJETA plana (2 mm, 10 capas) con las piezas dentro, cada una sujeta al marco por cuatro puntitos finos (0,6 mm): el niño las
// saca girándolas un poco y las monta ENCAJANDO ranura con ranura. Todo va a «media madera»: cada pieza lleva media ranura y entra en
// la media ranura de la otra, así quedan trabadas y a ras. La ranura mide el grosor de la pieza + la holgura (0,10 por lado de serie:
// «encaja» en sus Bambu); hay una 🧪 prueba con tres ranuras para elegirla antes de imprimir veinte tarjetas.
// Cada kit se describe UNA vez (sus piezas en 2D) y de ahí salen la tarjeta para imprimir y el modelo MONTADO; el ordenador comprueba
// con ese montaje que ninguna pieza pisa a otra y que la tarjeta es una sola pieza (nada suelto al despegarla de la cama).
// Se imprimen en 15–30 minutos, sin soportes, y caben muchas en una cama. Diseñados aquí (© CelebriDiseños).
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';

const { n, s, M, circ, rr, poli, n2, enFila } = A;
const T = 2, HUECO = 1.3, PUNTO = 0.6; // grosor de las piezas · aire entre cada pieza y el marco · alto de los puntitos que las sujetan
const lim = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
const rect = (x0, x1, y0, y1) => rr(x1 - x0, y1 - y0, 0).translate([(x0 + x1) / 2, (y0 + y1) / 2]);
const suave = (c, r) => c.offset(-r, 'Round').offset(2 * r, 'Round').offset(-r, 'Round'); // esquinas redondas (por fuera y por dentro)
const espejo = D => D.concat(D.slice().reverse().filter(q => Math.abs(q[0]) > 1e-6).map(([x, y]) => [-x, y])); // medio dibujo → entero (simétrico en X)
// una pieza plana de pie: su dibujo (u, v) pasa a ser (x, z) con el grosor centrado en Y · o (y, z) con el grosor en X
const dePieXZ = c => c.extrude(T).translate([0, 0, -T / 2]).rotate([90, 0, 0]);
const dePieYZ = (c, x = 0) => c.extrude(T).translate([0, 0, -T / 2]).rotate([90, 0, 0]).rotate([0, 0, 90]).translate([x, 0, 0]);
const tumbada = (c, z) => c.extrude(T).translate([0, 0, z]);

// ---------- LOS KITS: piezas = [{ t (nombre), cs (dibujo 2D), m (la pieza colocada en el montaje) }] ----------
function kitAvion(h) { const sw = T + 2 * h, zA = 5, zE = 9;
  const fus = suave(poli([[-39, 6], [-30, 3], [-5, 0], [22, 0], [34, 2], [39, 6], [36, 10], [26, 13], [16, 16], [6, 16], [0, 13], [-20, 11], [-27, 12], [-33, 24], [-39, 24]]), 1.4)
    .subtract(rect(-2, 18.35, zA, zA + sw)).subtract(rect(-41, -31, zE, zE + sw));                                         // la ranura del ala (cerrada) y la de la cola (abierta por detrás)
  const ala = suave(poli([[-1.85, -45], [6, -45], [18.15, -12], [18.15, 12], [6, 45], [-1.85, 45]]), 1.2);
  const est = suave(poli([[-39, -17], [-33, -17], [-25, -6], [-25, 6], [-33, 17], [-39, 17]]), 1).subtract(rect(-31, -23, -sw / 2, sw / 2));   // media ranura por delante
  return [{ t: 'Fuselaje', cs: fus, m: dePieXZ(fus) }, { t: 'Ala', cs: ala, m: tumbada(ala, zA + h) }, { t: 'Cola', cs: est, m: tumbada(est, zE + h) }]; }
function kitDino(h) { const sw = T + 2 * h, X = [-12, 14];
  let cu = suave(poli([[-46, 16], [-34, 11.5], [-20, 10], [20, 10], [26, 12], [31, 22], [35, 31], [38, 33], [46, 33], [47, 36], [44, 39.5], [36, 40], [31, 37], [26, 28], [20, 22], [8, 24], [-8, 24], [-22, 20], [-34, 17], [-46, 18.5]]), 1.6);
  X.forEach(x => { cu = cu.subtract(rect(x - sw / 2, x + sw / 2, 8, 15)); });                                             // media ranura por la barriga
  cu = cu.subtract(circ(2.4).translate([41.5, 36.5]));                                                                     // el ojo
  const pata = () => suave(poli([[-16, 0], [-10, 0], [-7.5, 12], [7.5, 12], [10, 0], [16, 0], [11, 20], [-11, 20]]), 1.2).subtract(rect(-sw / 2, sw / 2, 15, 22)); // media ranura por arriba
  return [{ t: 'Cuerpo', cs: cu, m: dePieXZ(cu) }, { t: 'Patas de delante', cs: pata(), m: dePieYZ(pata(), X[1]) }, { t: 'Patas de atrás', cs: pata(), m: dePieYZ(pata(), X[0]) }]; }
function kitPeonza(h) { const sw = T + 2 * h, alto = 36.5, medio = 18, zD = 10;
  const hoja = () => poli(espejo([[0, 0], [7, 7], [7, zD], [4.5, zD], [4.5, zD + T + 0.3], [4, zD + T + 0.3], [4, 34], [0, alto]])); // (sin redondear: el disco asienta en hombros rectos)
  const a = hoja().subtract(rect(-sw / 2, sw / 2, medio, alto + 1)), b = hoja().subtract(rect(-sw / 2, sw / 2, -1, medio));     // una, media ranura por arriba; la otra, por abajo
  let disco = circ(50).subtract(rect(-4.5 - h, 4.5 + h, -sw / 2, sw / 2)).subtract(rect(-sw / 2, sw / 2, -4.5 - h, 4.5 + h)); // el agujero en cruz
  for (let i = 0; i < 6; i++) { const q = (i * 60 + 30) * Math.PI / 180; disco = disco.subtract(circ(7).translate([16 * Math.cos(q), 16 * Math.sin(q)])); }
  return [{ t: 'Disco', cs: disco, m: tumbada(disco, zD + 0.05) }, { t: 'Hoja del eje (con punta)', cs: a, m: dePieXZ(a) }, { t: 'Hoja del eje (cruzada)', cs: b, m: dePieYZ(b) }]; }
// dos siluetas iguales cruzadas a media madera (cohete, árbol…): se tienen de pie sobre sus cuatro pies
function cruzadas(medio, alto, h, nombres) { const sw = T + 2 * h, mid = Math.round(alto / 2), sil = () => suave(poli(espejo(medio)), 0.9), z0 = Math.min(...medio.filter(q => Math.abs(q[0]) < 1e-6).map(q => q[1]));
  const a = sil().subtract(rect(-sw / 2, sw / 2, mid, alto + 2)), b = sil().subtract(rect(-sw / 2, sw / 2, z0 - 1, mid));
  return [{ t: nombres[0], cs: a, m: dePieXZ(a) }, { t: nombres[1], cs: b, m: dePieYZ(b) }]; }
const kitCohete = h => cruzadas([[0, 7], [8, 7], [11, 0], [18, 0], [18, 12], [9, 26], [8, 60], [4.5, 70], [0, 76]], 76, h, ['Cohete (ranura arriba)', 'Cohete (ranura abajo)']);
const kitArbol = h => cruzadas([[0, 0], [8, 0], [3.5, 7], [22, 7], [10, 23], [18, 23], [7, 40], [13, 40], [4, 56], [8, 56], [0, 70]], 70, h, ['Árbol (ranura arriba)', 'Árbol (ranura abajo)']);
// 13-10-2026 · cuatro kits más (la dueña: «juegos, canicas y kits niños»)
// VELERO: el casco con sus dos velas en una pieza (de pie) y dos soportes cruzados abajo (se tiene de pie, no rueda)
function kitVelero(h) { const sw = T + 2 * h, X = [-20, 18], corte = 4.5;
  let c = suave(poli([[-36, 7], [-31, 0], [28, 0], [38, 9], [38, 10.5], [2, 10.5], [2, 15], [27, 15], [2, 57], [1.2, 64], [-1.2, 64], [-1.2, 61], [-27, 13], [-1.2, 13], [-1.2, 10.5], [-37, 10.5]]), 0.9);
  c = c.subtract(circ(3).translate([-6, 5])).subtract(circ(3).translate([4, 5]));                                                          // portillos
  X.forEach(x => { c = c.subtract(rect(x - sw / 2, x + sw / 2, -1, corte)); });                                                          // media ranura por abajo
  const sop = () => suave(poli([[-18, 0], [18, 0], [13, 10], [-13, 10]]), 1).subtract(rect(-sw / 2, sw / 2, corte, 11));                // media ranura por arriba
  return [{ t: 'Casco con las velas', cs: c, m: dePieXZ(c) }, { t: 'Soporte de proa', cs: sop(), m: dePieYZ(sop(), X[1]) }, { t: 'Soporte de popa', cs: sop(), m: dePieYZ(sop(), X[0]) }]; }
// HELICÓPTERO: el fuselaje (con su mástil), el ROTOR que atraviesa el mástil por una ranura cerrada (como el ala del avión) y dos soportes
function kitHeli(h) { const sw = T + 2 * h, X = [-6, 12], zR = 33, cuerda = 10, corte = 6.5;
  let f = suave(poli([[-46, 13], [-46, 26], [-42, 26], [-36, 17], [-14, 16], [-10, 22], [-2, 26], [-2, 30], [-7, 30], [-7, 41], [7, 41], [7, 30], [2, 30], [10, 29], [18, 25], [22, 17], [20, 9], [14, 4], [-12, 4], [-16, 12]]), 1.1);
  f = f.subtract(suave(poli([[4, 15], [12, 22], [17, 22], [19, 16]]), 0.6));                                                              // la cristalera
  f = f.subtract(rect(-cuerda / 2 - h, cuerda / 2 + h, zR, zR + sw));                                                                     // la ranura del rotor (cerrada)
  X.forEach(x => { f = f.subtract(rect(x - sw / 2, x + sw / 2, 3, corte)); });                                                           // medias ranuras por abajo
  const rotor = suave(poli([[-cuerda / 2, -6], [-3, -44], [3, -44], [cuerda / 2, -6], [cuerda / 2, 6], [3, 44], [-3, 44], [-cuerda / 2, 6]]), 1);
  const sop = () => suave(poli([[-17, 0], [17, 0], [17, 2.6], [5, 2.6], [5, 10], [-5, 10], [-5, 2.6], [-17, 2.6]]), 0.6).subtract(rect(-sw / 2, sw / 2, corte, 11)); // patín con su media ranura arriba
  return [{ t: 'Fuselaje', cs: f, m: dePieXZ(f) }, { t: 'Rotor', cs: rotor, m: tumbada(rotor, zR + h) }, { t: 'Soporte de delante', cs: sop(), m: dePieYZ(sop(), X[1]) }, { t: 'Soporte de atrás', cs: sop(), m: dePieYZ(sop(), X[0]) }]; }
// TORTUGA: el caparazón con la cabeza (de pie) y dos piezas de patas cruzadas, como el dinosaurio
function kitTortuga(h) { const sw = T + 2 * h, X = [-14, 14], corte = 10.5;
  let cu = suave(poli([[-36, 10], [-32, 12], [-29, 18], [-22, 25], [-12, 30], [0, 32], [12, 30], [21, 24], [25, 17], [28, 15], [32, 17], [36, 20], [41, 20], [44, 17], [43, 13], [37, 11], [30, 10], [26, 8], [-27, 8], [-31, 9]]), 1.5); // (cúpula alta y cabeza corta: que parezca una tortuga)
  [[-15, 20], [0, 24], [15, 20], [-7.5, 14.5], [7.5, 14.5], [-8, 26.5], [8, 26.5]].forEach(([x, z]) => { cu = cu.subtract(N.cs([N.poligono2(6, 5.6, 0)], 'Positive').translate([x, z])); }); // el dibujo del caparazón (hexágonos)
  cu = cu.subtract(circ(2).translate([39.5, 17]));                                                                                           // el ojo
  X.forEach(x => { cu = cu.subtract(rect(x - sw / 2, x + sw / 2, 7, corte)); });
  const pata = () => suave(poli([[-16, 0], [-10, 0], [-8.5, 7], [8.5, 7], [10, 0], [16, 0], [13, 13], [-13, 13]]), 1.1).subtract(rect(-sw / 2, sw / 2, corte, 14));
  return [{ t: 'Caparazón', cs: cu, m: dePieXZ(cu) }, { t: 'Patas de delante', cs: pata(), m: dePieYZ(pata(), X[1]) }, { t: 'Patas de atrás', cs: pata(), m: dePieYZ(pata(), X[0]) }]; }
// ESTRELLA 3D: dos estrellas de cinco puntas cruzadas (se tiene de pie sobre sus cuatro puntas de abajo)
const kitEstrella = h => cruzadas([[0, 13.5], [19.98, 0], [13.31, 23.17], [32.34, 38], [8.23, 38.83], [0, 61.5]], 61.5, h, ['Estrella (ranura arriba)', 'Estrella (ranura abajo)']);
function kitCoche(h) { const sw = T + 2 * h, X = [-22, 20], zE = 5;
  // dos laterales con la silueta del coche y, entre ellos, dos puentes (delante y detrás) a media madera: queda una caja que rueda de adorno
  const lat = () => { let c = suave(poli([[-38, 3], [-38, 12], [-30, 14], [-20, 24], [6, 24], [16, 15], [34, 13], [38, 10], [38, 3], [30, 3], [27, 0], [14, 0], [11, 3], [-12, 3], [-15, 0], [-28, 0], [-31, 3]]), 1.3);
    c = c.subtract(suave(poli([[-17, 15.5], [-11, 21], [-1, 21], [-1, 15.5]]), 0.8)).subtract(suave(poli([[2, 15.5], [2, 21], [5, 21], [10.5, 15.5]]), 0.8));   // ventanillas
    X.forEach(x => { c = c.subtract(rect(x - sw / 2, x + sw / 2, zE + 4, 30)); }); return c; };                         // media ranura por arriba (hasta el techo)
  const puente = () => suave(rect(-17, 17, zE, zE + 8), 1).subtract(rect(-11 - sw / 2, -11 + sw / 2, zE - 1, zE + 4)).subtract(rect(11 - sw / 2, 11 + sw / 2, zE - 1, zE + 4)); // media ranura por abajo, una para cada lateral
  return [{ t: 'Lateral izquierdo', cs: lat(), m: dePieXZ(lat()).translate([0, -11, 0]) }, { t: 'Lateral derecho', cs: lat(), m: dePieXZ(lat()).translate([0, 11, 0]) },
    { t: 'Puente de delante', cs: puente(), m: dePieYZ(puente(), X[1]) }, { t: 'Puente de atrás', cs: puente(), m: dePieYZ(puente(), X[0]) }]; }

const KITS = {
  avion: { t: 'Avión', gen: kitAvion, pasos: ['Saca las tres piezas de la tarjeta girándolas un poco: los puntitos se sueltan solos. Si queda algún pico, quítalo con la uña.', 'Coge el FUSELAJE (la pieza larga con la cola hacia arriba) y pasa el ALA por la ranura del centro hasta que quede igual de larga por los dos lados.', 'Mete la COLA por detrás: su ranura abraza al fuselaje y entra en la ranura abierta del final.', '¡A volar! (de la mano: no es un planeador).'] },
  dino: { t: 'Dinosaurio', gen: kitDino, pasos: ['Saca las tres piezas de la tarjeta girándolas un poco.', 'Pon el CUERPO de pie, con las dos ranuras de la barriga hacia abajo.', 'Encaja unas PATAS en cada ranura, de abajo arriba, con su ranura mirando hacia arriba: empuja hasta que queden a ras.', 'Ponlo de pie sobre sus cuatro patas.'] },
  peonza: { t: 'Peonza', gen: kitPeonza, pasos: ['Saca el disco y las dos hojas del eje.', 'Cruza las dos HOJAS: la que tiene la ranura por arriba entra en la que la tiene por abajo, hasta que las dos puntas queden juntas.', 'Mete el DISCO por arriba (por el mango) y bájalo hasta que se apoye en los hombros del eje.', 'Coge el mango con dos dedos, gira fuerte y suéltala sobre una mesa lisa.'], extra: ['Si el disco baila, sube un poco la holgura a 0,05 en la siguiente tarjeta; si no entra, a 0,15.'] },
  cohete: { t: 'Cohete', gen: kitCohete, pasos: ['Saca las dos piezas de la tarjeta.', 'Coge la que tiene la ranura por ARRIBA y ponla de pie.', 'Baja la otra (ranura por ABAJO) cruzada sobre ella, hasta que las dos puntas queden a la misma altura.', 'Se queda de pie sobre sus cuatro aletas.'] },
  arbol: { t: 'Árbol', gen: kitArbol, pasos: ['Saca las dos piezas de la tarjeta.', 'Coge la que tiene la ranura por ARRIBA y ponla de pie.', 'Baja la otra (ranura por ABAJO) cruzada sobre ella, hasta que las dos puntas queden a la misma altura.', 'Se queda de pie solo. En verde, con una estrella pintada arriba, es un adorno de Navidad.'] },
  velero: { t: 'Velero', gen: kitVelero, pasos: ['Saca las tres piezas: el casco con las velas y los dos soportes.', 'Pon el CASCO de pie, con las dos ranuras de abajo hacia la mesa.', 'Encaja un SOPORTE en cada ranura, cruzado, hasta abajo del todo: la ranura del soporte entra en la del casco.', '¡Listo! El velero se tiene de pie solo.'] },
  heli: { t: 'Helicóptero', gen: kitHeli, pasos: ['Saca las cuatro piezas: el fuselaje, el rotor y los dos soportes.', 'Mete el ROTOR por la ranura del mástil (la de arriba), empezando por una punta, hasta que quede centrado: en el centro entra justo.', 'Pon el fuselaje de pie y encaja los dos SOPORTES en sus ranuras de abajo, cruzados.', '¡A volar! (de mentira).'] },
  tortuga: { t: 'Tortuga', gen: kitTortuga, pasos: ['Saca las tres piezas: el caparazón y dos piezas de patas.', 'Pon el CAPARAZÓN de pie, con las ranuras de la barriga hacia abajo.', 'Encaja unas PATAS en cada ranura, cruzadas, hasta el fondo.', '¡Ya camina! (despacio).'] },
  estrella: { t: 'Estrella', gen: kitEstrella, pasos: ['Saca las dos estrellas.', 'Coge la que tiene la ranura por ARRIBA y ponla de pie sobre sus dos puntas.', 'Baja la otra (ranura por ABAJO) cruzada sobre ella hasta que las dos queden a ras.', 'Queda una estrella 3D que se tiene de pie: adorno de Navidad o de mesa.'] },
  coche: { t: 'Coche', gen: kitCoche, pasos: ['Saca las cuatro piezas de la tarjeta: dos laterales (con ventanillas) y dos puentes.', 'Pon de pie los dos LATERALES, uno al lado del otro, con las ruedas en la mesa: sus ranuras miran hacia arriba.', 'Coge un PUENTE con sus dos ranuras hacia ABAJO y bájalo sobre las ranuras de delante de los dos laterales, hasta el fondo.', 'Haz lo mismo con el otro puente en las ranuras de atrás. El coche queda como una cajita, de pie sobre sus ruedas.'] },
};

// ---------- LA TARJETA: las piezas colocadas en estantes dentro de un marco, sujetas con puntitos ----------
function coloca(P, anchoMax) { const sep = 2 * HUECO + 1.4, L = P.map(q => ({ q, b: N.cajaCS(q.cs) })).map(o => { const gira = o.b.h > o.b.w + 0.5 && o.b.h > 40; const c = gira ? o.q.cs.rotate(90) : o.q.cs; const b = gira ? N.cajaCS(c) : o.b; return { c, b }; }).sort((a, b) => b.b.h - a.b.h);
  const out = []; let x = 0, y = 0, altoFila = 0, anchoTotal = 0;
  L.forEach(o => { if (x > 0 && x + o.b.w > anchoMax) { x = 0; y -= altoFila + sep; altoFila = 0; } out.push(o.c.translate([x - o.b.min[0], y - o.b.max[1]])); x += o.b.w + sep; altoFila = Math.max(altoFila, o.b.h); anchoTotal = Math.max(anchoTotal, x - sep); });
  return { piezas: out, w: anchoTotal, h: -y + altoFila }; }
function tarjeta(P, nombre, anchoMax = 118) {
  const C = coloca(P, anchoMax), mar = 5, pie = 9, W = C.w + 2 * (mar + HUECO), H = C.h + mar + pie + 2 * HUECO;
  const piezas = C.piezas.map(c => c.translate([-C.w / 2, H / 2 - mar - HUECO]));                                          // (el estante de arriba, pegado al margen de arriba)
  // el hueco de cada pieza en el marco es su contorno DE FUERA engordado (sin sus agujeros: si no, dentro de cada ventanilla quedaría una isla suelta)
  const area = q => { let a2 = 0; for (let i = 0; i < q.length; i++) { const p1 = q[i], p2 = q[(i + 1) % q.length]; a2 += p1[0] * p2[1] - p2[0] * p1[1]; } return a2 / 2; };
  const porFuera = c => N.cs(c.toPolygons().filter(q => area(q) > 0).map(q => q.map(v => [v[0], v[1]])), 'Positive');
  let marco = rr(W, H, 5).subtract(N.csUnion(piezas.map(c => porFuera(c).offset(HUECO, 'Round')))).subtract(circ(4.6).translate([W / 2 - 6, -H / 2 + 4.6]));
  // los puntitos: en los cuatro extremos de cada pieza (izquierda, derecha, arriba y abajo), cruzando el aire hasta el marco
  const puntos = [];
  piezas.forEach(c => { const V = c.toPolygons().flat(), b = N.cajaCS(c), cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, mejor = (f, g) => V.reduce((a, q) => (f(q) < f(a) - 1e-6 || (Math.abs(f(q) - f(a)) < 1e-6 && g(q) < g(a)) ? q : a), V[0]);
    const iz = mejor(q => q[0], q => Math.abs(q[1] - cy)), de = mejor(q => -q[0], q => Math.abs(q[1] - cy)), ab = mejor(q => q[1], q => Math.abs(q[0] - cx)), ar = mejor(q => -q[1], q => Math.abs(q[0] - cx)), L = HUECO + 1.6;
    puntos.push(rect(iz[0] - L + 0.8, iz[0] + 0.8, iz[1] - 0.5, iz[1] + 0.5), rect(de[0] - 0.8, de[0] + L - 0.8, de[1] - 0.5, de[1] + 0.5), rect(ab[0] - 0.5, ab[0] + 0.5, ab[1] - L + 0.8, ab[1] + 0.8), rect(ar[0] - 0.5, ar[0] + 0.5, ar[1] - 0.8, ar[1] + L - 0.8)); });
  let m = marco.extrude(T).add(N.csUnion(piezas).extrude(T)).add(N.csUnion(puntos).intersect(rr(W - 1, H - 1, 4)).extrude(PUNTO));
  // el nombre, grabado en la tira de abajo
  try { let tx = N.centraCS(N.texto2(nombre, 'gorda', 4.4)); const bt = N.cajaCS(tx), k = Math.min(1, (W - 26) / bt.w); m = m.subtract(tx.scale([k, k]).translate([-4, -H / 2 + pie / 2 + 0.4]).extrude(0.7).translate([0, 0, T - 0.6])); } catch (e) { }
  return m; }
// la 🧪 prueba: una tirita con tres ranuras (0,05 · 0,10 · 0,15 por lado, marcadas con 1, 2 y 3 puntos) y una lengüeta para probarlas
function prueba() { let peine = rr(46, 14, 2);
  [0.05, 0.10, 0.15].forEach((h, i) => { const x = -14 + i * 14; peine = peine.subtract(rect(x - T / 2 - h, x + T / 2 + h, -1, 8)); for (let k = 0; k <= i; k++) peine = peine.subtract(circ(1.6).translate([x + k * 2.6 - i * 1.3, -4.6])); });
  return tarjeta([{ cs: peine }, { cs: rr(12, 22, 2) }], 'PRUEBA', 70); }

export function piezasDeTarjeta(k, hol) { return KITS[k].gen(lim(hol, 0.03, 0.3)); }
function genTarjeta(k, p) { const K = KITS[k], h = lim(p.holgura, 0.03, 0.3);
  if (p.que === 'prueba') return prueba();
  const P = K.gen(h);
  if (p.que === 'montado') return N.union(P.map(x => x.m));
  if (p.que === 'cuatro') { const una = tarjeta(P, K.t + ' · CelebriDiseños'), b = N.caja(una), dx = b.dims[0] + 4, dy = b.dims[1] + 4; if (2 * dx > 250 || 2 * dy > 250) return enFila([una, una], 4); return N.union([[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j]) => una.translate([i * dx - dx / 2, j * dy - dy / 2, 0]))); }
  return tarjeta(P, K.t + ' · CelebriDiseños'); }
// ¿se monta? ninguna pieza pisa a otra · ¿la tarjeta sale entera? una sola pieza al despegarla
const _ck = new Map();
export function compruebaTarjeta(k, hol) { const key = k + '|' + hol; if (_ck.has(key)) return _ck.get(key);
  const r = N.enAmbito(() => { const P = KITS[k].gen(lim(hol, 0.03, 0.3)); let pisa = 0; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) pisa = Math.max(pisa, P[i].m.intersect(P[j].m).volume());
    const t = tarjeta(P, KITS[k].t), b = N.caja(t); return { pisa, trozos: t.decompose().length, w: b.dims[0], h: b.dims[1], piezas: P.length, gramos: Math.round(t.volume() / 1000 * 1.24 * 10) / 10 }; });
  if (_ck.size > 30) _ck.clear(); _ck.set(key, r); return r; }

const QUE = s('que', 'Qué imprimo', 'tarjeta', [['tarjeta', 'Una tarjeta'], ['cuatro', 'Cuatro tarjetas en la cama (para vender)'], ['prueba', '🧪 Prueba de la ranura (10 min): elige tu holgura'], ['montado', '👀 Verlo montado (solo para mirar)']]);
const HOL = n('holgura', 'Holgura de las ranuras (por lado)', 0.1, 0.03, 0.3, 0.01);
const ficha = (k, e, d, color, busca) => ({ cat: 'kits', tambien: ['ninos', 'juguetes', 'juegos', 'regalos'], e, t: 'Tarjeta-kit: ' + KITS[k].t.toLowerCase(), d, uso: 'encaje', color, nuevo: true, busca: 'tarjeta kit montar niños puzzle 3d encajar ' + busca,
  sinSoportes: 'Es plana: no tiene nada en el aire.', campos: [QUE, HOL], gen: p => genTarjeta(k, p),
  nota: p => { if (p.que === 'prueba') return '🧪 Una tirita con TRES ranuras y una lengüeta. La ranura con 1 puntito lleva 0,05 mm de holgura por lado; la de 2, 0,10; la de 3, 0,15. Saca la lengüeta y pruébala de canto en las tres: la buena es la que entra apretando un poco con los dedos y NO se cae al darle la vuelta. Pon ese número en «Holgura» y ya valen todas tus tarjetas-kit.';
    let R = null; try { R = compruebaTarjeta(k, p.holgura); } catch (e) { return '⚠️ ' + e.message; } if (p.que === 'montado') return '👀 Así queda montado. Para imprimir, elige «Una tarjeta» o «Cuatro tarjetas».';
    return (R.pisa < 0.05 && R.trozos === 1 ? 'COMPROBADA (en el ordenador): montado, ninguna pieza pisa a otra, y la tarjeta sale de la cama en una sola pieza' : '⚠️ Con esa holgura algo no casa (' + n2(R.pisa) + ' mm³ de choque, ' + R.trozos + ' trozos): vuelve a 0,10') + '. Tarjeta de ' + n2(R.w) + ' × ' + n2(R.h) + ' × 2 mm con ' + R.piezas + ' piezas, unos ' + n2(R.gramos) + ' g (15–25 minutos). El niño saca las piezas girándolas (van sujetas con puntitos de 0,6 mm) y las monta encajando ranura con ranura, SIN pegamento. Las ranuras miden 2 mm + ' + n2(lim(p.holgura, 0.03, 0.3)) + ' por lado: imprime una vez la 🧪 prueba para acertar con tu filamento. Imprímela con la primera capa bien pegada y SIN «pie de elefante» (o con tu calibración puesta): si la primera capa sale gorda, las ranuras cierran. Con «Cuatro tarjetas» llenas la cama para vender. No es para menores de 3 años (piezas pequeñas).'; },
  manual: () => ({ vistas: [['montado', 'Así queda montado'], ['tarjeta', 'La tarjeta, tal como viene']], piezas: KITS[k].gen(0.1).map(x => [x.t, 1]), pasos: KITS[k].pasos, herramientas: 'Nada: ni tijeras ni pegamento. Solo las manos.', edad: 'A partir de 5 años, con un adulto cerca la primera vez. No es para menores de 3 años (piezas pequeñas).', consejos: (KITS[k].extra || []).concat(['Si una ranura entra muy dura, no fuerces de lado: empuja recto, ranura contra ranura.', 'Se puede pintar con rotuladores permanentes o pintura acrílica.']), cuidados: ['Es plástico: no lo dejes al sol dentro del coche.'] }) });
export const DISENOS_TARJETAS = {
  tarjetaAvion: ficha('avion', '✈️', 'Fuselaje, ala y cola: tres piezas que se encajan', '#00a4e4', 'avion avioneta'),
  tarjetaDino: ficha('dino', '🦕', 'Un dinosaurio de cuello largo que se tiene de pie sobre sus cuatro patas', '#3fa34d', 'dinosaurio dino diplodocus animal'),
  tarjetaPeonza: ficha('peonza', '🌀', 'Una peonza que GIRA de verdad: disco y eje de dos hojas cruzadas', '#ff8a00', 'peonza trompo girar juego'),
  tarjetaCohete: ficha('cohete', '🚀', 'Dos siluetas cruzadas: se tiene de pie sobre sus aletas', '#e2231a', 'cohete nave espacio'),
  tarjetaCoche: ficha('coche', '🚗', 'Dos laterales con ventanillas y dos puentes: un coche con cuerpo', '#f4c20d', 'coche carro auto'),
  tarjetaVelero: ficha('velero', '⛵', 'El casco con sus velas y dos soportes: se tiene de pie', '#0077b6', 'barco velero mar'),
  tarjetaHeli: ficha('heli', '🚁', 'Fuselaje, rotor que atraviesa el mástil y dos soportes', '#e76f51', 'helicoptero vuelo'),
  tarjetaTortuga: ficha('tortuga', '🐢', 'Una tortuga con su caparazón dibujado, de pie sobre sus patas', '#2a9d8f', 'tortuga animal'),
  tarjetaEstrella: ficha('estrella', '⭐', 'Dos estrellas cruzadas: estrella 3D de pie (Navidad o mesa)', '#f4c20d', 'estrella navidad adorno'),
  tarjetaArbol: ficha('arbol', '🎄', 'Un árbol en 3D que se tiene de pie: adorno de mesa o de Navidad', '#1f8a4c', 'arbol navidad abeto pino adorno'),
};
export const _TAR = { KITS, tarjeta, prueba, T };
