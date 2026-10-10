// ================= v20 · 🛍️ CelebriR8 · EL CATÁLOGO (un mini MakerWorld propio) =================
// La dueña (9-10-2026): «STL ya hechos que funcionen, para organizadores, diferentes categorías, casi como un mini
// MakerWorld… cosas cuquis, cosas para herramientas, organizadores, figuras de decoración, esculturas, macetas tipo
// pelota, lámparas y cuerpos de lámpara… que se puedan vender como churros».
// TODOS están diseñados aquí (no se ha copiado ningún modelo de nadie: así se pueden vender sin problemas de derechos).
// Cada diseño tiene sus medidas (se cambian con números), su color, y se abre en el Estudio como un cuerpo editable más.
// Lo que depende de una pieza comprada (imán, rodamiento, maquinaria de reloj, vela LED) lleva su medida estándar y se
// avisa de que hay que comprobarla con la pieza en la mano.
import * as N from './nucleo.js';
import * as PT from './patrones.js';
import { ENCAJES, perfilEngranaje, circulo, rectR } from './motor.js';
import { registrar } from './proyecto.js';
import { MOVILES, movil, MATERIAL } from './moviles.js';
import { funda, kitFunda, ESTILOS_FUNDA } from './fundas.js';

export const CATEGORIAS = [['', '✨ Todo'], ['cuqui', '🌸 Cuqui'], ['organizar', '🗂️ Organizadores'], ['taller', '🧰 Taller y herramientas'], ['macetas', '🪴 Macetas'], ['jarrones', '🏺 Jarrones'], ['vasos', '🕯️ Vasos y velas'], ['lamparas', '💡 Lámparas'],
  ['deco', '🗿 Figuras y esculturas'], ['calados', '✴️ Calados con estilo'], ['hogar', '🏠 Hogar y cocina'], ['regalos', '🎁 Regalos y llaveros'], ['juegos', '🎲 Juegos y fidget'], ['gaming', '🎮 Gaming'], ['mascotas', '🐾 Mascotas'], ['movil', '📱 Fundas de móvil'], ['mecanica', '⚙️ Piezas mecánicas'], ['rc', '🏎️ RC y repuestos'], ['componentes', '🔩 Componentes']];
const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const M = () => N.MF(), CS = () => N.CSX();
const FUENTES_OPS = [['gorda', 'Gorda'], ['redonda', 'Redonda'], ['cursiva', 'Cursiva'], ['clasica', 'Clásica'], ['estrecha', 'Estrecha']];
const PAT = Object.entries(PT.PATRONES);
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));

// ---------- ayudas ----------
const rr = (w, h, r = 0) => N.cs([N.ccw(rectR(w, h, r))], 'Positive');
const circ = d => N.cs([N.ccw(circulo(d / 2, 0, 0, seg(d)))], 'Positive');
const cil = (d, h, z = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([0, 0, z]);
const caja = (x, y, z, r = 0) => rr(x, y, r).extrude(z);
// pieza de revolución: «perfil(t)» da el radio a la altura t·h (t de 0 a 1)
function revol(h, radio, pasos = 60) { const P = [[0, 0]]; for (let i = 0; i <= pasos; i++) { const t = i / pasos; P.push([Math.max(0.3, radio(t)), t * h]); } P.push([0, h]); return CS().ofPolygons([N.ccw(P)]).revolve(seg(radio(0.5) * 2) * 2); }
// recipiente (maceta, vaso, jarrón con pared): por fuera el perfil, por dentro el perfil menos la pared
function recipiente(h, radio, pared, fondo, pasos = 60) {
  const fuera = revol(h, radio, pasos); if (pared <= 0) return fuera;
  const P = [[0, fondo]]; for (let i = 0; i <= pasos; i++) { const t = i / pasos, z = fondo + t * (h - fondo + 1); P.push([Math.max(0.2, radio(Math.min(1, z / h)) - pared), z]); } P.push([0, h + 1]);
  return fuera.subtract(CS().ofPolygons([N.ccw(P)]).revolve(seg(radio(0.5) * 2) * 2));
}
const texto3d = (t, fuente, alto, grosor) => N.centraCS(N.texto2(t, fuente, alto)).extrude(grosor);
// texto en la cara de delante de algo redondo o plano: de pie, mirando a -Y, centrado en x
const textoDePie = (t, fuente, alto, grosor) => texto3d(t, fuente, alto, grosor).rotate([90, 0, 0]);
const agujeroTornillo = (d, largo) => cil(d + 0.4, largo + 2, -1);
function figuraEmoji(e, ancho) { // la silueta de un emoji (o letra) de «ancho» mm, centrada
  const s0 = N.texto2(e || '❤', 'gorda', 40), b = N.cajaCS(s0); return N.centraCS(s0).scale([ancho / b.w, ancho / b.w]);
}
// patrones de agujeros alrededor de un recipiente (entre «abajo» y «arriba» mm)
function calarRedondo(m, R, z0, z1, p) { if (!p.patron || p.patron === 'ninguno') return m; const ag = PT.agujerosCilindro(R, z0, z1, p.patron, p.celda || 12, p.puente || 2.4, (p.pared || 2) + 6, p.semilla || 7); return ag ? m.subtract(ag) : m; }
const OPS_PAT = [['ninguno', 'Sin calado']].concat(PAT);
const deforma = (m, L) => N.deformar(m, L.filter(Boolean));

// ---------- LOS DISEÑOS ----------
// uso: deco (decorativo) · funcional (aguanta esfuerzo) · jarron (se imprime en «Jarrón en espiral») · flexible (TPU) · encaje (lleva holguras)
export const DISENOS = {
  // ======================= 🌸 CUQUI =======================
  macetaAnimal: { cat: 'cuqui', e: '🐱', t: 'Maceta animalito', d: 'Gatito, osito, conejito o rana', uso: 'deco', color: '#f9c6d9',
    campos: [s('animal', 'Animal', 'gato', [['gato', '🐱 Gatito'], ['oso', '🐻 Osito'], ['conejo', '🐰 Conejito'], ['rana', '🐸 Ranita']]), n('d', 'Diámetro', 80, 40, 200), n('h', 'Alto', 70, 30, 200), n('pared', 'Pared', 2, 1.2, 5, 0.2), c('agujero', 'Agujero de drenaje', true)],
    gen(p) {
      const R = p.d / 2, m0 = recipiente(p.h, t => R * (0.86 + 0.14 * Math.sin(Math.PI * (0.25 + t * 0.6))), p.pared, 2.4); let m = m0;
      // las orejas van SOBRE el borde, un poco hacia atrás (la cara mira hacia delante, a -Y), giradas con el borde
      const Rb = R * (0.86 + 0.14 * Math.sin(Math.PI * 0.85)) - p.pared / 2, enBorde = (pieza, fi) => pieza.rotate([0, 0, fi - 90]).translate([Rb * Math.cos(fi * Math.PI / 180), Rb * Math.sin(fi * Math.PI / 180), 0]);
      const pico = (alto, ancho) => CS().ofPolygons([N.ccw([[-ancho / 2, 0], [ancho / 2, 0], [0, alto]])]).offset(ancho * 0.12, 'Round', 2, 16).extrude(p.pared * 1.6, 0, 0, [1, 1], true).rotate([90, 0, 0]).translate([0, 0, p.h - ancho * 0.12]);
      const cara = [], y = -R * 0.985, zc = p.h * 0.55;
      if (p.animal === 'gato') [60, 120].forEach(fi => { m = m.add(enBorde(pico(R * 0.5, R * 0.55), fi)); });
      if (p.animal === 'oso') [50, 130].forEach(fi => { m = m.add(enBorde(M().sphere(R * 0.21, 32).scale([1, 0.55, 1]).translate([0, 0, p.h]), fi)); });
      if (p.animal === 'conejo') [70, 110].forEach(fi => { m = m.add(enBorde(M().sphere(R * 0.17, 28).scale([1, 0.55, 4.2]).translate([0, 0, p.h + R * 0.55]), fi)); });
      if (p.animal === 'rana') [240, 300].forEach(fi => { const rad = fi * Math.PI / 180; m = m.add(M().sphere(R * 0.22, 32).translate([R * 0.8 * Math.cos(rad), R * 0.8 * Math.sin(rad), p.h + R * 0.02])); cara.push(M().sphere(R * 0.09, 20).translate([R * 0.97 * Math.cos(rad), R * 0.97 * Math.sin(rad), p.h + R * 0.06])); });
      if (p.animal !== 'rana') [-1, 1].forEach(k => cara.push(M().sphere(R * 0.075, 20).scale([1, 0.6, 1.25]).translate([k * R * 0.32, y, zc])));
      cara.push(M().sphere(R * 0.06, 20).scale([1.3, 0.6, 0.9]).translate([0, y - 0.5, zc - R * 0.16])); // nariz
      [-1, 1].forEach(k => cara.push(M().sphere(R * 0.09, 20).scale([1, 0.35, 0.6]).translate([k * R * 0.55, y + R * 0.1, zc - R * 0.24]))); // coloretes
      m = m.add(N.union(cara));
      if (p.agujero) m = m.subtract(cil(Math.min(12, R * 0.3), 6, -1));
      return m;
    }, nota: () => 'La cara va en relieve: si en el laminador pintas la cara de otro color (o la pintas a mano), queda ideal. Planta pequeña (suculenta o cactus).' },
  figuraInflada: { cat: 'cuqui', e: '🎈', t: 'Figura blandita', d: 'Un emoji inflado como un globo', uso: 'deco', color: '#c08ee8',
    campos: [tx('emoji', 'Figura (emoji o letra)', '🐱', '🐱 🐶 🦋 🐻 🦄 🐳 ⭐ ❤ ☁ 🍄 🌙'), n('ancho', 'Ancho', 60, 15, 200), n('alto', 'Lo gordo que sale', 12, 2, 60), c('doble', 'Inflado por los dos lados (de pie)', false), c('anilla', 'Con agujero para colgar', false)],
    gen(p) { let m = N.inflar(figuraEmoji(p.emoji || '❤', p.ancho), { alto: p.alto, base: 1.2, doble: p.doble }); if (p.anilla) { const b = N.caja(m); m = m.subtract(cil(3.2, 200, -50).rotate(p.doble ? [90, 0, 0] : [0, 0, 0]).translate([0, b.max[1] - 6, p.doble ? b.max[2] / 2 : 0])); } return m; },
    nota: () => 'Imprímela sin relleno raro: «Giroide» al 10 % y 3 paredes, queda ligera y suave.' },
  nubeEstante: { cat: 'cuqui', e: '☁️', t: 'Estante nube', d: 'Para la pared, con su cuelgue', uso: 'funcional', color: '#f4f4f2',
    campos: [n('ancho', 'Ancho', 160, 80, 250), n('fondo', 'Fondo', 70, 40, 120), n('grosor', 'Grosor de la balda', 6, 3, 12, 0.5), n('alto', 'Alto de la nube (pared)', 70, 30, 150)],
    gen(p) { const nube = (w, h) => { const L = [[-0.3, -0.05, 0.32], [0.05, 0.08, 0.38], [0.33, -0.03, 0.3], [-0.05, -0.2, 0.3], [0.2, -0.22, 0.25], [-0.32, -0.22, 0.22]].map(([x, y, r]) => N.cs([N.ccw(circulo(r * w * 0.55, x * w, y * h + h * 0.1, 64))], 'Positive')); return N.csUnion(L); };
      const pared = nube(p.ancho, p.alto).extrude(p.grosor).rotate([90, 0, 0]).translate([0, p.fondo / 2, p.alto * 0.5]), b = N.caja(pared);
      const balda = caja(p.ancho * 0.9, p.fondo, p.grosor, p.grosor / 2).translate([0, 0, b.min[2]]); let m = pared.translate([0, 0, -b.min[2]]).add(balda.translate([0, 0, -b.min[2]]));
      const ojal = N.csUnion([circ(9), N.cs([N.ccw(N.ranura2(14, 5))], 'Positive').rotate(90).translate([0, 6])]).extrude(p.grosor + 2).rotate([90, 0, 0]);
      [-1, 1].forEach(k => { m = m.subtract(ojal.translate([k * p.ancho * 0.25, p.fondo / 2 + 1, p.alto * 0.55])); }); return m; },
    nota: () => 'Imprímela de pie (la nube contra la cama) para que la balda aguante. Dos tornillos de cabeza plana de 4 mm.' },
  conejoLapicero: { cat: 'cuqui', e: '🐰', t: 'Lapicero con orejas', d: 'Conejo, gato u oso', uso: 'deco', color: '#f9c6d9',
    campos: [s('animal', 'Orejas de', 'conejo', [['conejo', '🐰 Conejo'], ['gato', '🐱 Gato'], ['oso', '🐻 Oso']]), n('d', 'Diámetro', 70, 40, 140), n('h', 'Alto', 95, 50, 180), tx('nombre', 'Nombre (opcional)', '')],
    gen(p) { const m = DISENOS.macetaAnimal.gen({ animal: p.animal, d: p.d, h: p.h, pared: 2, agujero: false }); return p.nombre ? m.add(textoDePie(p.nombre, 'redonda', Math.min(14, p.h * 0.14), 1.2).translate([0, -p.d / 2 + 0.6, p.h * 0.25])) : m; } },
  setaLampara: { cat: 'cuqui', e: '🍄', t: 'Seta lámpara', d: 'Para una vela LED', uso: 'deco', color: '#c8102e',
    campos: [n('d', 'Ancho del sombrero', 110, 60, 200), n('h', 'Alto total', 120, 60, 220), n('vela', 'Hueco para la vela LED (diámetro)', 39, 20, 60, 0.5), c('puntos', 'Con lunares calados', true)],
    gen(p) { const R = p.d / 2, pie = recipiente(p.h * 0.55, t => p.vela / 2 + 3 + 6 * (1 - t) ** 2, 2, 2.4), som = M().sphere(R, 96).scale([1, 1, 0.62]).trimByPlane([0, 0, 1], 0).subtract(M().sphere(R - 2, 96).scale([1, 1, 0.6]).trimByPlane([0, 0, 1], 0).translate([0, 0, -0.01])).translate([0, 0, p.h * 0.5]);
      let m = pie.add(som).add(N.forma3d('tubo', { d: 2 * R - 2, interior: p.vela + 2, h: 2 }).translate([0, 0, p.h * 0.5])).subtract(cil(p.vela + 1, 30, p.h * 0.48));
      if (p.puntos) { const L = [], r = azarS(3); for (let i = 0; i < 9; i++) { const a = i * 2.4 + r() * 0.5, e = 0.35 + r() * 0.45; L.push(cil(8 + r() * 10, R * 3).rotate([0, 90, 0]).translate([0, 0, 0]).rotate([0, -(90 - e * 70), 0]).rotate([0, 0, a * 57.3]).translate([0, 0, p.h * 0.5])); } m = m.subtract(N.union(L)); }
      return m; },
    nota: p => 'Vela LED de ' + String(p.vela).replace('.', ',') + ' mm (las «tealight» normales miden unos 38–39 mm: mide la tuya). Nunca vela de fuego de verdad.' },
  cajaCorazon: { cat: 'cuqui', e: '💝', t: 'Cajita corazón', d: 'Con tapa que encaja', uso: 'encaje', color: '#f55a9b',
    campos: [n('ancho', 'Ancho', 70, 30, 180), n('alto', 'Alto', 30, 12, 100), n('pared', 'Pared', 1.6, 1, 4, 0.2), tx('nombre', 'Nombre en la tapa', 'Te quiero'), s('encaje', 'Encaje de la tapa', 'justo', [['justo', 'Justo'], ['presion', 'A presión'], ['gira', 'Holgado']])],
    gen(p) { const co = N.cs([N.corazon2(p.ancho)], 'Positive'), hol = ENCAJES[p.encaje] ?? ENCAJES.justo, fondo = 1.6;
      const base = co.extrude(p.alto).subtract(co.offset(-p.pared, 'Round').extrude(p.alto).translate([0, 0, fondo]));
      const tapa0 = co.extrude(2), labio = co.offset(-p.pared - hol, 'Round').subtract(co.offset(-2 * p.pared - hol, 'Round')).extrude(4).translate([0, 0, 2]);
      let tapa = tapa0.add(labio).rotate([180, 0, 0]).translate([0, 0, 6]);
      if (p.nombre) tapa = tapa.add(texto3d(p.nombre, 'cursiva', Math.max(6, p.ancho * 0.12), 1).translate([0, -p.ancho * 0.05, 6]));
      const b = N.caja(base); return base.add(tapa.translate([b.dims[0] + 8, 0, 0])); } },

  // ======================= 🗂️ ORGANIZADORES =======================
  gridfinityCaja: { cat: 'organizar', e: '🧱', t: 'Cajita Gridfinity', d: 'Compatible con el estándar 42 mm', uso: 'funcional', color: '#00a4e4',
    campos: [n('ux', 'Casillas a lo ancho', 2, 1, 6, 1, ''), n('uy', 'Casillas a lo largo', 1, 1, 6, 1, ''), n('uz', 'Alto (unidades de 7 mm)', 6, 2, 20, 1, ''), n('divx', 'Separadores a lo ancho', 0, 0, 8, 1, ''), c('imanes', 'Huecos para imanes de 6 × 2 mm', false), c('etiqueta', 'Repisa para etiqueta', true)],
    gen(p) { return gridfinity(p); }, nota: () => 'Medidas del estándar Gridfinity (rejilla de 42 mm, unidades de 7 mm de alto). El labio de arriba para apilar NO va (es una caja sencilla). Imprime una y pruébala en tu base antes de hacer muchas.' },
  gridfinityBase: { cat: 'organizar', e: '▦', t: 'Base Gridfinity', d: 'La rejilla para el cajón', uso: 'funcional', color: '#1b1b1d',
    campos: [n('ux', 'Casillas a lo ancho', 4, 1, 6, 1, ''), n('uy', 'Casillas a lo largo', 3, 1, 6, 1, '')],
    gen(p) { const w = 42 * p.ux, d = 42 * p.uy, H = 4.65; let m = caja(w, d, H, 4); const hueco = cajon(42, 4, [[0, 36.3, 1.15], [2.15, 40.6, 3.3], [3.95, 40.6, 3.3], [H + 0.01, 42, 4]]).translate([0, 0, -0.01]);
      const L = []; for (let i = 0; i < p.ux; i++) for (let j = 0; j < p.uy; j++) L.push(hueco.translate([-w / 2 + 21 + 42 * i, -d / 2 + 21 + 42 * j, 0])); return m.subtract(N.union(L)); },
    nota: p => 'Mide ' + 42 * p.ux + ' × ' + 42 * p.uy + ' mm. Si no cabe en la cama, pártela con «✂️ Partir» (sin conectores) por una línea de casillas.' },
  cajonOrganizador: { cat: 'organizar', e: '🗃️', t: 'Organizador de cajón', d: 'Con separadores a tu medida', uso: 'funcional', color: '#e9d8b4',
    campos: [n('x', 'Ancho', 160, 40, 250), n('y', 'Fondo', 100, 30, 250), n('z', 'Alto', 45, 10, 120), n('cx', 'Divisiones a lo ancho', 3, 1, 10, 1, ''), n('cy', 'Divisiones a lo largo', 2, 1, 10, 1, ''), n('pared', 'Pared', 1.6, 1, 4, 0.2), n('radio', 'Esquinas', 4, 0, 20)],
    gen(p) { let m = caja(p.x, p.y, p.z, p.radio); const ix = (p.x - p.pared * (p.cx + 1)) / p.cx, iy = (p.y - p.pared * (p.cy + 1)) / p.cy; if (ix < 4 || iy < 4) N.mal('Demasiadas divisiones para ese tamaño.');
      const L = []; for (let i = 0; i < p.cx; i++) for (let j = 0; j < p.cy; j++) L.push(caja(ix, iy, p.z, Math.max(0, Math.min(p.radio - p.pared, 6))).translate([-p.x / 2 + p.pared + ix / 2 + i * (ix + p.pared), -p.y / 2 + p.pared + iy / 2 + j * (iy + p.pared), 1.6]));
      return m.subtract(N.union(L)); } },
  portaboligrafos: { cat: 'organizar', e: '🖊️', t: 'Portabolígrafos', d: 'Redondo o hexagonal, con calado', uso: 'deco', color: '#5e43b7',
    campos: [s('forma', 'Forma', 'hex', [['hex', '⬢ Hexagonal'], ['redondo', '● Redondo'], ['cuadrado', '■ Cuadrado']]), n('d', 'Ancho', 75, 40, 150), n('h', 'Alto', 100, 40, 180), s('patron', 'Calado', 'panal', OPS_PAT), n('celda', 'Tamaño del dibujo', 12, 5, 40), tx('nombre', 'Nombre (opcional)', '')],
    gen(p) { const lados = p.forma === 'hex' ? 6 : p.forma === 'cuadrado' ? 4 : 0, R = p.d / 2;
      const perfil = lados ? N.cs([N.poligono2(lados, p.d, lados === 4 ? 45 : 0)], 'Positive') : circ(p.d), dentro = perfil.offset(-2, 'Round');
      let m = perfil.extrude(p.h).subtract(dentro.extrude(p.h).translate([0, 0, 2.4]));
      if (p.patron !== 'ninguno') m = calarRedondo(m, R * (lados ? 0.93 : 1), 12, p.h - 10, Object.assign({ pared: 2 }, p));
      if (p.nombre) m = m.add(textoDePie(p.nombre, 'gorda', Math.min(12, p.h * 0.12), 1.2).translate([0, -R * (lados === 6 ? 0.866 : 1) + 0.6, 4]));
      return m; } },
  organizadorCables: { cat: 'organizar', e: '🔌', t: 'Peine de cables', d: 'Para el borde de la mesa', uso: 'funcional', color: '#1b1b1d',
    campos: [n('n', 'Cables', 5, 1, 12, 1, ''), n('d', 'Grosor del cable', 6, 2, 15, 0.5), n('mesa', 'Grosor de la mesa (0 = se pega)', 0, 0, 40)],
    gen(p) { const paso = p.d + 5, w = p.n * paso + 4, hh = p.d + 8; let m = caja(w, 14, hh, 3);
      for (let i = 0; i < p.n; i++) { const x = -w / 2 + 2 + paso * (i + 0.5); m = m.subtract(cil(p.d, 20).rotate([90, 0, 0]).translate([x, 10, hh - p.d / 2 - 2.5])).subtract(caja(p.d * 0.7, 20, 10).translate([x, 0, hh - 3])); }
      if (p.mesa > 0) { const clip = caja(w, 3, p.mesa + 6).translate([0, -8.5, -p.mesa - 3]).add(caja(w, 14, 3).translate([0, 0, -p.mesa - 3])).add(caja(w, 3, p.mesa + 6).translate([0, -8.5, -p.mesa - 3])); m = m.add(clip).translate([0, 0, p.mesa + 3]); }
      return m; } },
  bandejaLlaves: { cat: 'organizar', e: '🗝️', t: 'Vaciabolsillos', d: 'Bandeja para llaves y anillos', uso: 'deco', color: '#c9a227',
    campos: [s('forma', 'Forma', 'redonda', [['redonda', '● Redonda'], ['hex', '⬢ Hexagonal'], ['corazon', '♥ Corazón'], ['nube', '☁ Ovalada']]), n('d', 'Ancho', 120, 50, 220), n('h', 'Alto', 22, 8, 60), tx('nombre', 'Grabado en el fondo', 'Casa')],
    gen(p) { const base = p.forma === 'hex' ? N.cs([N.poligono2(6, p.d)], 'Positive') : p.forma === 'corazon' ? N.cs([N.corazon2(p.d)], 'Positive') : p.forma === 'nube' ? N.cs([N.elipse2(p.d, p.d * 0.66)], 'Positive') : circ(p.d);
      let m = base.offset(-p.h * 0.25, 'Round').extrude(p.h, 0, 0, [1 + p.h * 0.5 / p.d, 1 + p.h * 0.5 / p.d]); const b = N.caja(m);
      m = m.subtract(base.offset(-p.h * 0.25 - 2.2, 'Round').extrude(p.h, 0, 0, [1 + p.h * 0.5 / p.d, 1 + p.h * 0.5 / p.d]).translate([0, 0, 2]));
      if (p.nombre) m = m.subtract(texto3d(p.nombre, 'cursiva', Math.max(8, p.d * 0.12), 1).translate([0, 0, 1.4]));
      return m; } },
  panalPared: { cat: 'organizar', e: '🐝', t: 'Panal de pared', d: 'Celdas hexagonales que se juntan', uso: 'funcional', color: '#f7d117',
    campos: [n('d', 'Ancho de cada celda', 80, 40, 150), n('fondo', 'Fondo', 60, 20, 150), n('n', 'Celdas', 3, 1, 7, 1, ''), n('pared', 'Pared', 2, 1.2, 4, 0.2), c('fondoCerrado', 'Con fondo (estante cerrado)', false)],
    gen(p) { const hex = N.cs([N.poligono2(6, p.d / 0.866, 30)], 'Positive'), celda0 = hex.subtract(hex.offset(-p.pared, 'Miter')).extrude(p.fondo), celda = p.fondoCerrado ? celda0.add(hex.extrude(p.pared)) : celda0;
      const L = [], pos = [[0, 0], [1, 0], [0.5, 1], [-1, 0], [-0.5, 1], [0.5, -1], [-0.5, -1]]; for (let i = 0; i < p.n; i++) L.push(celda.translate([pos[i][0] * (p.d - p.pared), pos[i][1] * (p.d - p.pared) * 0.866, 0])); return N.union(L); },
    nota: () => 'Se imprimen de pie (el hueco hacia arriba). Para colgar: cinta de doble cara o un tornillo en la pared de atrás.' },
  boteRosca: { cat: 'organizar', e: '🫙', t: 'Bote con tapa de rosca', d: 'Tapa que se enrosca de verdad', uso: 'encaje', color: '#41c3bd',
    campos: [n('d', 'Diámetro', 60, 30, 140), n('h', 'Alto', 70, 20, 180), n('paso', 'Paso de la rosca', 3, 2, 6, 0.5), n('pared', 'Pared', 2, 1.6, 4, 0.2), tx('nombre', 'Nombre en la tapa', '')],
    gen(p) { const R = p.d / 2, rosH = Math.min(12, p.h * 0.3), cuerpo = recipiente(p.h - rosH, () => R, p.pared, 2.4);
      const dR = p.d - 2 * p.pared - 1.4, cuello = N.rosca(dR, p.paso, rosH + 1).translate([0, 0, p.h - rosH - 1]).subtract(cil(dR - 2 * 0.6 * p.paso - 3.2, rosH + 4, p.h - rosH - 2));
      const hueco = dR - 2 * 0.6 * p.paso - 3.2, frasco = cuerpo.add(cuello).add(N.forma3d('tubo', { d: p.d, interior: hueco, h: 2.4 }).translate([0, 0, p.h - rosH - 2.4])).subtract(cil(hueco, p.h, 2.4));
      let tapa = cil(p.d + 2, rosH + 2.4).subtract(N.rosca(dR, p.paso, rosH + 1, true).translate([0, 0, 2.4]));
      if (p.nombre) tapa = tapa.subtract(texto3d(p.nombre, 'gorda', Math.max(6, p.d * 0.15), 0.8).mirror([1, 0, 0]).translate([0, 0, -0.01]));
      return frasco.add(tapa.translate([p.d + 10, 0, 0])); },
    nota: () => 'La tapa lleva TU holgura «gira» (+0,1). La tapa se imprime boca arriba (el texto queda debajo, en la cara de fuera). Prueba una pequeña antes de hacer muchas.' },

  // ======================= 🧰 TALLER Y HERRAMIENTAS =======================
  soporteDestornilladores: { cat: 'taller', e: '🪛', t: 'Soporte de destornilladores', d: 'Para la pared o el tablero', uso: 'funcional', color: '#ff6a13',
    campos: [n('n', 'Cuántos', 8, 2, 20, 1, ''), n('d', 'Agujero (lo que mide la caña + algo)', 8, 3, 30, 0.5), n('sep', 'Separación', 24, 10, 60), n('fondo', 'Fondo de la balda', 45, 25, 100)],
    gen(p) { const w = p.n * p.sep + 8; let m = caja(w, p.fondo, 10, 3).add(caja(w, 5, 40, 2).translate([0, p.fondo / 2 - 2.5, 0]));
      for (let i = 0; i < p.n; i++) { const x = -w / 2 + 4 + p.sep * (i + 0.5); m = m.subtract(cil(p.d, 20, -1).translate([x, -4, 0])).subtract(caja(p.d * 0.6, p.fondo / 2 + 4, 20).translate([x, -p.fondo / 2 - 1, -1]).translate([0, 0, 0])); }
      [-1, 1].forEach(k => { m = m.subtract(cil(4.4, 20).rotate([90, 0, 0]).translate([k * w * 0.35, p.fondo / 2 + 5, 28])).subtract(M().cylinder(3, 4.4, 9, 32).rotate([90, 0, 0]).translate([k * w * 0.35, p.fondo / 2 - 2.5 - 2.5 + 3, 28])); });
      return m; }, nota: () => 'Dos tornillos de 4 mm de cabeza plana. Imprímelo tumbado sobre la espalda (la parte que va a la pared contra la cama) para que no se parta la balda.' },
  llavesAllen: { cat: 'taller', e: '🔧', t: 'Soporte de llaves Allen', d: 'Del 1,5 al 10 mm', uso: 'funcional', color: '#8e9196',
    campos: [s('juego', 'Juego', 'mm', [['mm', 'Métrico 1,5 · 2 · 2,5 · 3 · 4 · 5 · 6 · 8 · 10'], ['corto', 'Métrico corto 2 · 2,5 · 3 · 4 · 5 · 6']]), n('alto', 'Alto del bloque', 25, 12, 60), c('numeros', 'Con el número grabado', true)],
    gen(p) { const L = p.juego === 'corto' ? [2, 2.5, 3, 4, 5, 6] : [1.5, 2, 2.5, 3, 4, 5, 6, 8, 10], gap = 5; let x = 0; const pos = L.map(d => { const q = x + d / 2 + 3; x += d + gap; return q; }), w = x + 3;
      let m = caja(w, 22, p.alto, 3).translate([w / 2, 0, 0]);
      L.forEach((d, i) => { const hex = N.cs([N.poligono2(6, (d + 0.25) / 0.866, 30)], 'Positive').extrude(p.alto); m = m.subtract(hex.translate([pos[i], -2, 3])); if (p.numeros) m = m.subtract(texto3d(String(d).replace('.', ','), 'estrecha', 4, 0.8).translate([pos[i], 7, p.alto - 0.79])); });
      return m.translate([-w / 2, 0, 0]); }, nota: () => 'Los agujeros son hexagonales con 0,25 mm de holgura (entran sin bailar).' },
  organizadorBrocas: { cat: 'taller', e: '🔩', t: 'Organizador de brocas', d: 'Escalonado, con su medida', uso: 'funcional', color: '#0a2989',
    campos: [n('desde', 'Desde (mm)', 1, 1, 6, 0.5), n('hasta', 'Hasta (mm)', 10, 3, 13, 0.5), n('paso', 'De medio en medio o de uno en uno', 1, 0.5, 1, 0.5)],
    gen(p) { const L = []; for (let d = p.desde; d <= p.hasta + 1e-6; d += p.paso) L.push(Math.round(d * 10) / 10); if (L.length > 24) N.mal('Demasiadas brocas: sube el paso.');
      let x = 4; const pos = L.map(d => { const q = x + Math.max(d, 4) / 2; x += Math.max(d, 4) + 5; return q; }), w = x + 2;
      let m = M().hull([caja(w, 26, 6).translate([w / 2, 0, 0]), caja(w, 8, 30).translate([w / 2, 9, 0])]);
      L.forEach((d, i) => { const z = 6 + 24 * (i / Math.max(1, L.length - 1)) * 0; m = m.subtract(cil(d + 0.3, 40, 6 + z).translate([pos[i], 8, -2])).subtract(texto3d(String(d).replace('.', ','), 'estrecha', 4, 0.8).translate([pos[i], -6, 5.21])); void z; });
      return m.translate([-w / 2, 0, 0]); } },
  ganchoTablero: { cat: 'taller', e: '🪝', t: 'Gancho de tablero perforado', d: 'Estándar de 25,4 mm (1")', uso: 'funcional', color: '#00ae42',
    campos: [n('largo', 'Lo que sale', 50, 15, 150), n('grueso', 'Grosor', 6, 4, 12, 0.5), s('tipo', 'Tipo', 'recto', [['recto', 'Recto (con punta levantada)'], ['doble', 'Doble'], ['u', 'En «U» (cables y mangueras)']])],
    gen(p) { // de perfil (x: hacia fuera del tablero, y: hacia arriba) y con grosor: se imprime tumbado y aguanta
      const g = p.grueso, R2 = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], L = [R2(0, -10, 4, 34), R2(-7, 22.6, 0.5, 28.2), R2(-7, 22.6, -2, 33), R2(-6, -2.8, 0.5, 2.8)];
      const brazo = y => { L.push(R2(3.5, y, 4 + p.largo, y + g)); L.push(R2(4 + p.largo - g, y, 4 + p.largo, y + (p.tipo === 'u' ? 4 * g : 2 * g))); };
      brazo(-10); if (p.tipo === 'doble') brazo(10);
      return N.csUnion(L.map(r => N.cs([N.ccw(r)], 'Positive'))).offset(-0.6, 'Round').offset(0.6, 'Round').extrude(6); }, nota: () => 'Para tablero perforado de agujeros de 6–6,5 mm cada 25,4 mm (el más común). Los pivotes miden 5,6 × 6 mm: si tu tablero es de otro tipo, mide antes. Se imprime tumbado (como sale).' },
  cajaTornillos: { cat: 'taller', e: '🧲', t: 'Caja de tornillería', d: 'Compartimentos con fondo curvo', uso: 'funcional', color: '#f7d117',
    campos: [n('x', 'Ancho', 150, 60, 250), n('y', 'Fondo', 90, 40, 200), n('z', 'Alto', 35, 15, 80), n('cx', 'Compartimentos a lo ancho', 4, 1, 10, 1, ''), n('cy', 'Compartimentos a lo largo', 2, 1, 6, 1, '')],
    gen(p) { let m = caja(p.x, p.y, p.z, 4); const ix = (p.x - 1.6 * (p.cx + 1)) / p.cx, iy = (p.y - 1.6 * (p.cy + 1)) / p.cy;
      for (let i = 0; i < p.cx; i++) for (let j = 0; j < p.cy; j++) { const r = Math.min(ix, iy) / 2 * 0.9, cub = M().hull([caja(ix, iy, p.z, 2).translate([0, 0, 1.6 + Math.min(r, p.z * 0.6)]), caja(ix - 2 * Math.min(r, p.z * 0.6), iy, 0.01).translate([0, 0, 1.6])]);
        m = m.subtract(cub.translate([-p.x / 2 + 1.6 + ix / 2 + i * (ix + 1.6), -p.y / 2 + 1.6 + iy / 2 + j * (iy + 1.6), 0])); }
      return m; }, nota: () => 'El fondo de cada hueco es en rampa: los tornillos se sacan con el dedo sin pelearse con las esquinas.' },

  // ======================= 🪴 MACETAS =======================
  macetaBola: { cat: 'macetas', e: '⚽', t: 'Maceta bola', d: 'Como una pelota, con patrón', uso: 'deco', color: '#00ae42',
    campos: [n('d', 'Diámetro', 110, 50, 220), n('corte', 'Boca (cuánto se corta arriba)', 28, 10, 45, 1, '%'), s('estilo', 'Estilo', 'liso', [['liso', 'Lisa'], ['balon', '⚽ Balón (pentágonos)'], ['golf', '⛳ Pelota de golf'], ['ondas', '〰 Ondas'], ['facetas', '💎 Facetada']]), n('pared', 'Pared', 2.2, 1.2, 5, 0.2), c('agujero', 'Agujero de drenaje', true)],
    gen(p) { const R = p.d / 2, segs = p.estilo === 'facetas' ? 12 : 96; let bola = M().sphere(R, segs);
      if (p.estilo === 'golf') { const L = [], k = Math.round(R / 3.2); for (let i = 1; i < k; i++) { const th = Math.PI * i / k, nn = Math.max(4, Math.round(2 * k * Math.sin(th))); for (let j = 0; j < nn; j++) { const ph = 2 * Math.PI * (j + (i % 2) * 0.5) / nn; L.push(M().sphere(R * 0.07, 14).translate([R * 1.03 * Math.sin(th) * Math.cos(ph), R * 1.03 * Math.sin(th) * Math.sin(ph), R * 1.03 * Math.cos(th)])); } } bola = bola.subtract(N.union(L)); }
      if (p.estilo === 'balon') { const L = []; ico().forEach(v => L.push(cil(R * 0.62, R, 0).translate([0, 0, R * 0.96]).rotate(aDir(v)))); bola = bola.subtract(N.union(L).subtract(M().sphere(R - 0.9, 64))); }
      if (p.estilo === 'ondas') bola = N.deformar(bola, [{ t: 'ondas', n: 12, amp: R * 0.05, giro: 90 }]);
      let m = bola.translate([0, 0, R]); const zc = 2 * R * (1 - p.corte / 100), base = R * 0.12;
      m = m.trimByPlane([0, 0, -1], -zc).trimByPlane([0, 0, 1], base).translate([0, 0, -base]);
      const dentro = M().sphere(R - p.pared, segs).translate([0, 0, R - base]).trimByPlane([0, 0, 1], 2.4);
      m = m.subtract(dentro);
      if (p.agujero) m = m.subtract(cil(Math.min(14, R * 0.25), 6, -1));
      return m; }, nota: () => 'Se imprime sin soportes: la parte de abajo está cortada en plano y la bola sube con poca inclinación.' },
  macetaFacetada: { cat: 'macetas', e: '💎', t: 'Maceta facetada', d: 'Estilo «low poly»', uso: 'deco', color: '#41c3bd',
    campos: [n('d', 'Ancho arriba', 100, 40, 220), n('h', 'Alto', 90, 30, 220), n('lados', 'Caras', 7, 5, 14, 1, ''), n('giro', 'Giro', 40, 0, 120, 5, '°'), n('pared', 'Pared', 2, 1.2, 5, 0.2), c('agujero', 'Agujero de drenaje', true), c('plato', 'Con platito', true)],
    gen(p) { const pol = N.cs([N.poligono2(Math.round(p.lados), p.d * 0.72)], 'Positive'), k = 1 / 0.72; let m = pol.extrude(p.h, 6, p.giro, [k, k]);
      const ins = pol.offset(-p.pared, 'Miter').extrude(p.h, 6, p.giro, [k, k]).translate([0, 0, 2.4]); m = m.subtract(ins);
      if (p.agujero) m = m.subtract(cil(12, 6, -1));
      if (p.plato) m = m.add(pol.offset(6, 'Miter').extrude(8).subtract(pol.offset(4, 'Miter').extrude(8).translate([0, 0, 2])).translate([p.d * 1.2, 0, 0]));
      return m; } },
  macetaAutorriego: { cat: 'macetas', e: '💧', t: 'Maceta de autorriego', d: 'Dos piezas: maceta y depósito', uso: 'funcional', color: '#00ae42',
    campos: [n('d', 'Diámetro', 110, 60, 200), n('h', 'Alto del depósito', 100, 50, 200), s('patron', 'Calado del depósito', 'ninguno', OPS_PAT)],
    gen(p) { const R = p.d / 2, dep = recipiente(p.h, t => R * (0.92 + 0.08 * t), 2, 2.4);
      const maceta = recipiente(p.h * 0.85, t => R * (0.74 + 0.1 * t) - 2.6, 1.8, 2).add(N.forma3d('tubo', { d: R * 2 * 0.95 + 1, interior: 2 * (R * 0.84 - 2.6 - 1.6), h: 3 }).translate([0, 0, p.h * 0.85 - 3]));
      const ranuras = []; for (let i = 0; i < 8; i++) ranuras.push(caja(3, R * 2, 18).translate([0, 0, 3]).rotate([0, 0, i * 22.5])); const m2 = maceta.subtract(N.union(ranuras).intersect(cil(R * 0.7, 30, -1))).subtract(cil(14, 6, -1));
      return dep.add(m2.translate([p.d + 10, 0, 0])); },
    nota: () => 'La maceta de dentro cuelga de su borde y deja un depósito de agua abajo. Pasa un cordón de algodón por el agujero central como mecha. Imprímela en PETG si va a estar siempre mojada.' },
  macetaColgante: { cat: 'macetas', e: '🪢', t: 'Maceta colgante', d: 'Con tres agujeros para la cuerda', uso: 'deco', color: '#f4f4f2',
    campos: [n('d', 'Diámetro', 120, 60, 220), n('h', 'Alto', 80, 40, 180), n('ondas', 'Ondas', 10, 0, 30, 1, '')],
    gen(p) { const R = p.d / 2; let m = recipiente(p.h, t => R * (0.62 + 0.38 * Math.sin(t * Math.PI / 2) ** 0.7), 2, 2.4);
      if (p.ondas > 0) m = N.deformar(m, [{ t: 'ondas', n: p.ondas, amp: 2, giro: 0 }]);
      const L = []; for (let i = 0; i < 3; i++) L.push(M().hull([cil(10, 1).rotate([0, 90, 0]).translate([R - 2, 0, p.h - 4]), cil(10, 1).rotate([0, 90, 0]).translate([R + 6, 0, p.h - 4])]).subtract(cil(5, 20, 0).rotate([0, 0, 0]).translate([R + 3, 0, p.h - 12])).rotate([0, 0, i * 120]));
      return m.add(N.union(L)); } },

  // ======================= 🏺 JARRONES =======================
  jarronOndas: { cat: 'jarrones', e: '🌊', t: 'Jarrón de ondas', d: 'Ondas que giran al subir', uso: 'jarron', color: '#00a4e4', acabado: 'seda',
    campos: [n('h', 'Alto', 180, 60, 250), n('d', 'Ancho de la panza', 100, 40, 200), n('boca', 'Ancho de la boca', 60, 20, 200), n('ondas', 'Ondas', 9, 3, 30, 1, ''), n('fuerza', 'Fuerza de la onda', 4, 0.5, 15, 0.5), n('giro', 'Giro de las ondas', 120, -720, 720, 5, '°'), n('pared', 'Pared (0 = macizo, para «Jarrón en espiral»)', 0, 0, 5, 0.2)],
    gen(p) { const R = p.d / 2, b = p.boca / 2, rad = t => { const panza = R * Math.sin(Math.PI * Math.min(1, t * 1.25 + 0.15)) ** 0.8, k = Math.max(0, (t - 0.65) / 0.35); return Math.max(R * 0.45, panza * (1 - k) + b * k); };
      return N.deformar(recipiente(p.h, t => Math.max(rad(t), R * 0.55), p.pared, 2), [{ t: 'ondas', n: p.ondas, amp: p.fuerza, giro: p.giro }]); },
    nota: p => p.pared > 0 ? 'Con pared: se imprime normal (relleno 15 %).' : 'Es MACIZO a propósito: en Bambu Studio activa «Jarrón en espiral» (pestaña Otros) y sale hueco, con una sola pared y sin costura.' },
  jarronEspiral: { cat: 'jarrones', e: '🌀', t: 'Jarrón espiral', d: 'Estrella retorcida', uso: 'jarron', color: '#5e43b7', acabado: 'seda',
    campos: [n('h', 'Alto', 160, 60, 250), n('d', 'Ancho', 90, 40, 200), n('puntas', 'Puntas', 8, 3, 20, 1, ''), n('hondo', 'Lo marcadas que van', 22, 5, 45, 1, '%'), n('giro', 'Giro', 160, 0, 720, 5, '°'), n('arriba', 'Tamaño arriba', 85, 30, 200, 1, '%')],
    gen(p) { const st = N.cs([N.estrella2(Math.round(p.puntas), p.d / 2, p.d / 2 * (1 - p.hondo / 100))], 'Positive').offset(-p.d * 0.03, 'Round').offset(p.d * 0.03, 'Round'); return st.extrude(p.h, Math.ceil(p.h / 2), p.giro, [p.arriba / 100, p.arriba / 100]); },
    nota: () => 'Macizo: actívale «Jarrón en espiral» en Bambu Studio. En PLA seda queda espectacular.' },
  jarronFacetado: { cat: 'jarrones', e: '🔷', t: 'Jarrón facetado', d: 'Low poly, como un diamante', uso: 'jarron', color: '#c08ee8',
    campos: [n('h', 'Alto', 170, 60, 250), n('d', 'Ancho', 95, 40, 200), n('lados', 'Caras', 6, 3, 12, 1, ''), n('pisos', 'Pisos', 5, 2, 12, 1, ''), n('giro', 'Giro por piso', 30, 0, 90, 1, '°')],
    gen(p) { const L = [], nP = Math.round(p.pisos); for (let i = 0; i <= nP; i++) { const t = i / nP, r = p.d / 2 * (0.62 + 0.38 * Math.sin(Math.PI * (0.15 + t * 0.75))); L.push({ z: t * p.h, r, a: i * p.giro }); }
      const P = []; for (let i = 0; i < L.length - 1; i++) { const A = L[i], B = L[i + 1]; P.push(M().hull([N.cs([N.poligono2(Math.round(p.lados), A.r * 2, A.a)], 'Positive').extrude(0.01).translate([0, 0, A.z]), N.cs([N.poligono2(Math.round(p.lados), B.r * 2, B.a)], 'Positive').extrude(0.01).translate([0, 0, B.z - 0.01])])); }
      return N.union(P); }, nota: () => 'Macizo: imprímelo con «Jarrón en espiral».' },
  jarronBurbujas: { cat: 'jarrones', e: '🫧', t: 'Jarrón de pompas', d: 'Bolas apiladas', uso: 'deco', color: '#f9c6d9',
    campos: [n('d', 'Ancho', 80, 40, 160), n('n', 'Pompas', 4, 2, 8, 1, ''), n('pared', 'Pared', 1.8, 1, 4, 0.2), n('boca', 'Boca', 28, 10, 80)],
    gen(p) { const R = p.d / 2, L = [], I = []; let z = R * 0.8; for (let i = 0; i < p.n; i++) { const r = R * (1 - i * 0.12); L.push(M().sphere(r, 72).translate([0, 0, z])); I.push(M().sphere(r - p.pared, 64).translate([0, 0, z])); z += r * 1.35; }
      let m = N.union(L).trimByPlane([0, 0, 1], R * 0.18).translate([0, 0, -R * 0.18]); const b = N.caja(m); m = m.subtract(N.union(I).translate([0, 0, -R * 0.18]).trimByPlane([0, 0, 1], 2)).subtract(cil(p.boca, 40, b.max[2] - 20));
      return m.add(N.forma3d('tubo', { d: p.boca + 2 * p.pared, interior: p.boca, h: 13 }).translate([0, 0, b.max[2] - 10])).trimByPlane([0, 0, -1], -(b.max[2] + 3)); } },
  jarronCalado: { cat: 'jarrones', e: '🕸️', t: 'Jarrón calado', d: 'Decorativo, con patrón de agujeros', uso: 'deco', color: '#1b1b1d',
    campos: [n('h', 'Alto', 150, 60, 250), n('d', 'Ancho', 90, 40, 200), s('patron', 'Calado', 'voronoi', PAT), n('celda', 'Tamaño del dibujo', 16, 6, 40), n('puente', 'Grosor de los nervios', 2.6, 1.2, 6, 0.2), n('pared', 'Pared', 2.4, 1.6, 5, 0.2)],
    gen(p) { const R = p.d / 2, m = recipiente(p.h, t => R * (0.8 + 0.2 * Math.sin(Math.PI * t)), p.pared, 2.4); return calarRedondo(m, R * 0.95, 14, p.h - 12, p); },
    nota: () => 'Para flores secas o como funda de un bote de cristal. No es estanco.' },

  // ======================= 🕯️ VASOS Y VELAS =======================
  vasoOndas: { cat: 'vasos', e: '🥤', t: 'Vaso de ondas', d: 'Lapicero, vaso de baño o portavelas', uso: 'deco', color: '#41c3bd', acabado: 'seda',
    campos: [n('d', 'Diámetro', 75, 40, 140), n('h', 'Alto', 100, 40, 200), n('ondas', 'Ondas', 14, 0, 40, 1, ''), n('fuerza', 'Fuerza', 2, 0.4, 8, 0.2), n('giro', 'Giro', 90, -360, 360, 5, '°'), n('pared', 'Pared', 1.8, 1, 4, 0.2)],
    gen(p) { const m = recipiente(p.h, t => p.d / 2 * (0.88 + 0.12 * t), p.pared, 2.4); return p.ondas > 0 ? N.deformar(m, [{ t: 'ondas', n: p.ondas, amp: p.fuerza, giro: p.giro }]) : m; },
    nota: () => 'El PLA no es para beber ni para el lavavajillas. Como vaso de baño, mejor PETG.' },
  taza: { cat: 'vasos', e: '☕', t: 'Taza con asa', d: 'Portalápices o decoración', uso: 'deco', color: '#f4f4f2',
    campos: [n('d', 'Diámetro', 80, 50, 120), n('h', 'Alto', 90, 50, 140), tx('nombre', 'Nombre', 'Mamá'), s('fuente', 'Letra', 'cursiva', FUENTES_OPS)],
    gen(p) { const R = p.d / 2; let m = recipiente(p.h, () => R, 2.4, 3); const asa = CS().circle(5, 24).translate([p.h * 0.28, 0]).revolve(64, 180).rotate([90, 90, 0]).translate([R - 3, 0, p.h * 0.5]);
      m = m.add(asa); if (p.nombre) m = m.add(textoDePie(p.nombre, p.fuente, Math.min(16, p.h * 0.18), 1.2).translate([0, -R + 0.6, p.h * 0.38]));
      return m; }, nota: () => 'NO es para beber (el PLA no es apto). Para lápices, brochas o una planta.' },
  portavelas: { cat: 'vasos', e: '🕯️', t: 'Portavelas calado', d: 'Para una vela LED', uso: 'deco', color: '#c9a227', acabado: 'seda',
    campos: [n('d', 'Diámetro', 80, 50, 160), n('h', 'Alto', 90, 40, 200), n('vela', 'Hueco de la vela LED', 39, 20, 60, 0.5), s('patron', 'Calado', 'estrellas', PAT), n('celda', 'Tamaño del dibujo', 14, 6, 40)],
    gen(p) { const R = p.d / 2; let m = recipiente(p.h, t => R * (0.9 + 0.1 * Math.cos(Math.PI * t)), 2, 3); m = m.add(N.forma3d('tubo', { d: p.vela + 4, interior: p.vela, h: 8 }).translate([0, 0, 3])); return calarRedondo(m, R * 0.95, 16, p.h - 8, Object.assign({ puente: 2.4, pared: 2 }, p)); },
    nota: p => 'Solo vela LED de ' + String(p.vela).replace('.', ',') + ' mm (mide la tuya). Con fuego de verdad el plástico se derrite.' },

  // ======================= 💡 LÁMPARAS =======================
  lamparaCalada: { cat: 'lamparas', e: '🏮', t: 'Pantalla calada', d: 'Cilindro con patrón de luz', uso: 'deco', color: '#f4f4f2',
    campos: [n('d', 'Diámetro', 140, 60, 240), n('h', 'Alto', 180, 60, 250), s('patron', 'Calado', 'voronoi', PAT), n('celda', 'Tamaño del dibujo', 20, 6, 50), n('puente', 'Nervios', 3, 1.4, 8, 0.2), n('pared', 'Pared', 2.2, 1.4, 5, 0.2), s('montaje', 'Para', 'casquillo', [['casquillo', 'Casquillo E27 colgado (aro de 42 mm)'], ['e14', 'Casquillo E14 (aro de 29 mm)'], ['mesa', 'De mesa (sin aro, para vela LED o tira)']])],
    gen(p) { const R = p.d / 2; let m = N.forma3d('tubo', { d: p.d, interior: p.d - 2 * p.pared, h: p.h }); m = calarRedondo(m, R - p.pared / 2, 10, p.h - 10, p);
      if (p.montaje !== 'mesa') { const aro = p.montaje === 'e14' ? 29 : 42; m = m.add(N.forma3d('tubo', { d: aro + 12, interior: aro, h: 4 }).translate([0, 0, p.h - 4])); for (let i = 0; i < 3; i++) m = m.add(caja(R - aro / 2 - 5, 4, 4).translate([(aro / 2 + 5 + R) / 2 - 1, 0, p.h - 4]).rotate([0, 0, i * 120])); }
      return m; }, nota: p => p.montaje === 'mesa' ? 'Para luz LED (vela o tira). Nunca bombilla de calor.' : 'El aro es para el casquillo (E27 ≈ 42 mm de rosca de anilla; E14 ≈ 29 mm): MÍDELO, cambian según la marca. Usa SOLO bombillas LED (no calientan). PLA a menos de 5 cm de una bombilla de calor se deforma.' },
  lamparaEsfera: { cat: 'lamparas', e: '🌕', t: 'Lámpara esfera', d: 'Bola calada de mesa', uso: 'deco', color: '#f4f4f2',
    campos: [n('d', 'Diámetro', 130, 60, 220), s('patron', 'Calado', 'voronoi', [['voronoi', 'Voronoi'], ['estrellas', 'Estrellas'], ['circulos', 'Círculos'], ['panal', 'Panal']]), n('agujeros', 'Cuántos agujeros', 60, 12, 200, 1, ''), n('pared', 'Pared', 2.2, 1.4, 5, 0.2), n('base', 'Agujero de abajo (para la luz)', 50, 20, 100)],
    gen(p) { const R = p.d / 2; let m = M().sphere(R, 96).subtract(M().sphere(R - p.pared, 96)).translate([0, 0, R]);
      const r = azarS(11), L = [], nA = Math.round(p.agujeros); for (let i = 0; i < nA; i++) { const y = 1 - 2 * (i + 0.5) / nA, th = Math.acos(y), ph = i * 2.39996; if (Math.cos(th) < -0.55) continue; const tam = R * (p.patron === 'voronoi' ? 0.26 : 0.18) * (0.75 + r() * 0.5), forma2 = p.patron === 'estrellas' ? N.estrella2(5, tam / 2, tam / 4) : p.patron === 'panal' ? N.poligono2(6, tam) : N.poligono2(p.patron === 'voronoi' ? 5 + (i % 3) : 28, tam);
        L.push(N.cs([N.ccw(forma2)], 'Positive').extrude(R * 0.6, 0, 0, [1.8, 1.8]).translate([0, 0, R * 0.55]).rotate([th * 57.2958, 0, ph * 57.2958]).translate([0, 0, R])); }
      m = m.subtract(N.union(L)).trimByPlane([0, 0, 1], R * 0.12).translate([0, 0, -R * 0.12]); return m.subtract(cil(p.base, 40, -1)); },
    nota: () => 'Pon dentro una vela LED o una bombilla LED pequeña. Sin soportes no salen bien los agujeros de abajo: activa «Habilitar el soporte» (Árbol orgánico).' },
  lamparaLamas: { cat: 'lamparas', e: '🌪️', t: 'Lámpara de lamas', d: 'Aletas retorcidas', uso: 'deco', color: '#f7d117',
    campos: [n('d', 'Diámetro', 130, 60, 220), n('h', 'Alto', 190, 60, 250), n('lamas', 'Lamas', 24, 8, 60, 1, ''), n('giro', 'Giro', 90, 0, 360, 5, '°'), n('grueso', 'Grosor de cada lama', 2, 1, 4, 0.2)],
    gen(p) { const R = p.d / 2, L = []; for (let i = 0; i < p.lamas; i++) L.push(caja(R * 0.32, p.grueso, p.h).translate([R * 0.84, 0, 0]).rotate([0, 0, i * 360 / p.lamas]));
      let m = N.deformar(N.union(L), [{ t: 'retorcer', ang: p.giro }]); m = m.add(N.forma3d('tubo', { d: p.d, interior: p.d - 10, h: 4 })).add(N.forma3d('tubo', { d: p.d, interior: p.d - 10, h: 4 }).translate([0, 0, p.h - 4]));
      return m; }, nota: () => 'Imprímela con 3 bucles de pared y sin relleno raro. Para luz LED.' },
  cuerpoLampara: { cat: 'lamparas', e: '🛋️', t: 'Pie de lámpara', d: 'Con canal para el cable', uso: 'funcional', color: '#1b1b1d',
    campos: [n('d', 'Diámetro de la base', 120, 60, 220), n('h', 'Alto', 200, 60, 250), s('forma', 'Forma', 'ondas', [['liso', 'Columna lisa'], ['ondas', 'Ondas'], ['espiral', 'Espiral'], ['facetas', 'Facetada']]), n('cable', 'Agujero del cable', 8, 5, 14, 0.5), n('casquillo', 'Aro del casquillo arriba', 42, 25, 50, 0.5)],
    gen(p) { const R = p.d / 2, perfil = t => R * (t < 0.08 ? 1 : 0.45 + 0.1 * Math.sin(t * 6)) * (1 - 0.25 * t); let m = p.forma === 'facetas' ? N.cs([N.poligono2(8, p.d * 0.6)], 'Positive').extrude(p.h, 6, 45, [0.7, 0.7]).add(cil(p.d, 10)) : revol(p.h, perfil);
      if (p.forma === 'ondas') m = N.deformar(m, [{ t: 'ondas', n: 10, amp: 3, giro: 0 }]); if (p.forma === 'espiral') m = N.deformar(m, [{ t: 'ondas', n: 6, amp: 4, giro: 240 }]);
      m = m.subtract(cil(p.cable + 2, p.h + 2, 4)).subtract(cil(p.cable, 2 * R).rotate([0, 90, 0]).translate([0, 0, 5]).translate([R / 2, 0, 0])).subtract(caja(R * 1.1, p.cable, 6).translate([R / 2, 0, -1]));
      return m.add(N.forma3d('tubo', { d: p.casquillo + 8, interior: p.casquillo, h: 10 }).translate([0, 0, p.h])); },
    nota: () => 'El cable entra por debajo, por el canal lateral, y sube por dentro. El aro de arriba es para el casquillo: mídelo. Montaje eléctrico: por una persona que sepa.' },

  // ======================= 🗿 FIGURAS Y ESCULTURAS =======================
  nudo: { cat: 'deco', e: '🪢', t: 'Escultura nudo', d: 'Nudo de trébol infinito', uso: 'deco', color: '#c9a227', acabado: 'seda',
    campos: [n('d', 'Tamaño', 100, 40, 200), n('grueso', 'Grosor del tubo', 14, 5, 40), n('p', 'Vueltas (p)', 2, 2, 5, 1, ''), n('q', 'Lazos (q)', 3, 3, 7, 1, '')],
    gen(p) { const P = [], k = p.d / 6, nP = 220; for (let i = 0; i < nP; i++) { const t = i / nP * 2 * Math.PI, r = Math.cos(p.q * t) + 2; P.push([k * r * Math.cos(p.p * t), k * r * Math.sin(p.p * t), -k * Math.sin(p.q * t)]); }
      const S = P.map(q => M().sphere(p.grueso / 2, 20).translate(q)), L = []; for (let i = 0; i < nP; i++) L.push(M().hull([S[i], S[(i + 1) % nP]])); return N.aLaCama(N.union(L)); },
    nota: () => 'Necesita soportes: «Habilitar el soporte», Árbol orgánico. Queda brutal en PLA seda dorado o arcoíris.' },
  ola: { cat: 'deco', e: '🌊', t: 'Escultura ola', d: 'Cinta ondulada de pie', uso: 'deco', color: '#00a4e4', acabado: 'seda',
    campos: [n('largo', 'Largo', 160, 60, 240), n('alto', 'Alto', 90, 30, 200), n('ondas', 'Ondas', 3, 1, 8, 0.5, ''), n('grueso', 'Grosor', 3, 2, 8, 0.2), n('giro', 'Retorcido', 180, 0, 540, 10, '°')],
    gen(p) { let m = caja(p.largo, p.grueso, p.alto, 1).translate([0, 0, 0]); m = N.deformar(m, [{ t: 'retorcer', ang: p.giro }]); m = m.warp(v => { v[1] += Math.sin(v[0] / p.largo * Math.PI * 2 * p.ondas) * p.alto * 0.18; });
      return m.add(caja(p.largo * 0.5, 40, 6, 3)); } },
  letraGrande: { cat: 'deco', e: '🔠', t: 'Letra o nombre de pie', d: 'Para estanterías y bodas', uso: 'deco', color: '#f4f4f2',
    campos: [tx('txt', 'Letra, nombre o palabra', 'LOVE'), s('fuente', 'Letra', 'gorda', FUENTES_OPS), n('alto', 'Alto', 80, 15, 220), n('fondo', 'Grosor', 20, 3, 80), s('patron', 'Calado de las letras', 'ninguno', OPS_PAT), c('peana', 'Con peana', false)],
    gen(p) { let s2 = N.centraCS(N.texto2(p.txt || 'A', p.fuente, p.alto)); if (p.patron !== 'ninguno') s2 = PT.caladoPlano(s2, p.patron, Math.max(6, p.alto / 7), 2, Math.max(2.4, p.alto / 18));
      let m = s2.extrude(p.fondo).rotate([90, 0, 0]); const b = N.caja(m); m = m.translate([0, 0, -b.min[2]]);
      if (p.peana) m = m.translate([0, 0, 4]).add(caja(b.dims[0] + 10, p.fondo + 10, 4, 2)); return m; } },
  esferaVoronoi: { cat: 'deco', e: '🔮', t: 'Bola de decoración', d: 'Esfera calada o facetada', uso: 'deco', color: '#5e43b7',
    campos: [n('d', 'Diámetro', 80, 30, 200), s('estilo', 'Estilo', 'calada', [['calada', 'Calada (nido)'], ['facetas', 'Facetada (diamante)'], ['estrellas', 'Estrellada']]), c('colgar', 'Con anilla para colgar', true)],
    gen(p) { const R = p.d / 2; let m;
      if (p.estilo === 'facetas') m = M().sphere(R, 10).translate([0, 0, R]);
      else { m = M().sphere(R, 72).subtract(M().sphere(R - 2, 72)).translate([0, 0, R]); const r = azarS(5), L = [], nA = p.estilo === 'estrellas' ? 26 : 34;
        for (let i = 0; i < nA; i++) { const y = 1 - 2 * (i + 0.5) / nA, th = Math.acos(y), ph = i * 2.39996, tam = R * (p.estilo === 'estrellas' ? 0.32 : 0.42) * (0.8 + r() * 0.3), f = p.estilo === 'estrellas' ? N.estrella2(5, tam / 2, tam / 4) : N.poligono2(5 + (i % 3), tam);
          L.push(N.cs([N.ccw(f)], 'Positive').extrude(R * 0.6, 0, 0, [1.7, 1.7]).translate([0, 0, R * 0.55]).rotate([th * 57.2958, 0, ph * 57.2958]).translate([0, 0, R])); }
        m = m.subtract(N.union(L)); }
      if (p.colgar) m = m.add(M().sphere(R, 72).translate([0, 0, R]).intersect(cil(12, 6, 2 * R - 5))).add(N.forma3d('toro', { d: 12, grueso: 3 }).rotate([90, 0, 0]).translate([0, 0, 2 * R + 3]));
      return m; } },

  // ======================= ✴️ CALADOS CON ESTILO =======================
  placaCalada: { cat: 'calados', e: '✴️', t: 'Panel calado', d: 'Para paredes, celosías y lámparas', uso: 'deco', color: '#1b1b1d',
    campos: [s('forma', 'Forma', 'rect', [['rect', '▭ Rectángulo'], ['circulo', '● Círculo'], ['hex', '⬢ Hexágono'], ['corazon', '♥ Corazón'], ['arco', '⌒ Arco (ventana)']]), n('w', 'Ancho', 150, 30, 250), n('h', 'Alto', 100, 30, 250), n('grosor', 'Grosor', 3, 1.2, 10, 0.2), s('patron', 'Calado', 'voronoi', PAT), n('celda', 'Tamaño del dibujo', 14, 4, 60), n('puente', 'Nervios', 2.4, 0.8, 8, 0.2), n('marco', 'Marco', 5, 1, 30), n('semilla', 'Variante (cambia el dibujo)', 7, 1, 99, 1, '')],
    gen(p) { const f = p.forma === 'circulo' ? circ(p.w) : p.forma === 'hex' ? N.cs([N.poligono2(6, p.w)], 'Positive') : p.forma === 'corazon' ? N.cs([N.corazon2(p.w)], 'Positive') : p.forma === 'arco' ? rr(p.w, p.h, 0).intersect(rr(p.w, p.h * 2, 0).translate([0, -p.h / 2]).add(circ(p.w).translate([0, p.h / 2 - p.w / 2]))) : rr(p.w, p.h, 3);
      return PT.caladoPlano(f, p.patron, p.celda, p.puente, p.marco, p.semilla).extrude(p.grosor); } },
  posavasosCalado: { cat: 'calados', e: '🍵', t: 'Posavasos calado', d: 'Juego de posavasos con patrón', uso: 'deco', color: '#9d6d3f',
    campos: [s('forma', 'Forma', 'hex', [['circulo', '● Redondo'], ['hex', '⬢ Hexagonal'], ['cuadrado', '■ Cuadrado']]), n('d', 'Ancho', 95, 60, 140), n('cuantos', 'Cuántos', 4, 1, 6, 1, ''), s('patron', 'Calado', 'panal', PAT), n('celda', 'Tamaño del dibujo', 12, 5, 30), c('fondo', 'Con fondo liso debajo (no gotea)', true)],
    gen(p) { const f = p.forma === 'hex' ? N.cs([N.poligono2(6, p.d)], 'Positive') : p.forma === 'cuadrado' ? rr(p.d, p.d, 6) : circ(p.d);
      let uno = PT.caladoPlano(f, p.patron, p.celda, 2, 5).extrude(2).translate([0, 0, p.fondo ? 1.2 : 0]); if (p.fondo) uno = uno.add(f.extrude(1.2)); uno = uno.add(f.subtract(f.offset(-3, 'Round')).extrude(p.fondo ? 4.4 : 3.2));
      const L = []; for (let i = 0; i < p.cuantos; i++) L.push(uno.translate([(i % 2) * (p.d + 6), Math.floor(i / 2) * (p.d + 6), 0])); return N.union(L); },
    nota: () => 'Con «fondo liso»: imprime el fondo y el calado en dos colores (cambio de color a 1,2 mm en Bambu Studio) y queda de lujo.' },
  cajaCalada: { cat: 'calados', e: '🧺', t: 'Cesta calada', d: 'Caja con paredes de patrón', uso: 'deco', color: '#f4f4f2',
    campos: [n('x', 'Ancho', 140, 50, 250), n('y', 'Fondo', 100, 40, 250), n('z', 'Alto', 80, 25, 200), s('patron', 'Calado', 'rombos', PAT), n('celda', 'Tamaño del dibujo', 14, 6, 40), c('asas', 'Con asas', true)],
    gen(p) { let m = caja(p.x, p.y, p.z, 6).subtract(caja(p.x - 4.4, p.y - 4.4, p.z, 4).translate([0, 0, 2.4])), hz = p.z - 20;
      const asa = w => p.asas ? N.cs([N.ccw(N.ranura2(Math.min(50, w * 0.4), 14))], 'Positive').translate([0, hz / 2 - 2]) : N.csVacia();
      // los AGUJEROS de cada pared (dejando un marco de 6 mm arriba y abajo) y, si hay asas, el agujero de la mano
      const pared = (w, giro, d) => PT.agujeros2D(p.patron, w, hz, p.celda, 2.2).intersect(rr(w, hz - 16, 2).translate([0, -8])).add(asa(w)).extrude(12).rotate([90, 0, 0]).translate([0, d + 6, 10 + hz / 2]).rotate([0, 0, giro]);
      return m.subtract(N.union([pared(p.x - 16, 0, -p.y / 2), pared(p.x - 16, 180, -p.y / 2), pared(p.y - 16, 90, -p.x / 2), pared(p.y - 16, 270, -p.x / 2)])); } },

  // ======================= 🏠 HOGAR Y COCINA =======================
  colgadorLlaves: { cat: 'hogar', e: '🔑', t: 'Colgador de llaves', d: 'Con nombre y ganchos', uso: 'funcional', color: '#1b1b1d',
    campos: [tx('txt', 'Texto', 'HOME'), s('fuente', 'Letra', 'gorda', FUENTES_OPS), n('alto', 'Alto de las letras', 40, 15, 80), n('ganchos', 'Ganchos', 4, 1, 8, 1, '')],
    gen(p) { const t = N.centraCS(N.texto2(p.txt || 'HOME', p.fuente, p.alto)), b = N.cajaCS(t), w = b.w + 16; let m = t.extrude(8).add(rr(w, 14, 4).translate([0, -b.h / 2 - 5]).extrude(8));
      for (let i = 0; i < p.ganchos; i++) { const x = -w / 2 + 8 + (w - 16) * (p.ganchos === 1 ? 0.5 : i / (p.ganchos - 1)); m = m.add(M().hull([cil(6, 1).translate([x, -b.h / 2 - 5, 7.5]), cil(6, 1).translate([x, -b.h / 2 - 5, 20])])).add(M().sphere(4.2, 20).translate([x, -b.h / 2 - 5, 20])); }
      [-1, 1].forEach(k => { m = m.subtract(cil(4.4, 20, -1).translate([k * (w / 2 - 6), -b.h / 2 - 5, 0])).subtract(M().cylinder(2.5, 4.4, 8.5, 32).translate([k * (w / 2 - 6), -b.h / 2 - 5, 8 - 2.49])); });
      return m; }, nota: () => 'Se imprime tumbado. Dos tornillos de 4 mm avellanados.' },
  relojPared: { cat: 'hogar', e: '🕰️', t: 'Reloj de pared', d: 'Para una maquinaria de cuarzo', uso: 'deco', color: '#f4f4f2',
    campos: [n('d', 'Diámetro', 220, 100, 250), s('marcas', 'Horas', 'numeros', [['numeros', 'Números 1–12'], ['romanos', 'Números romanos'], ['rayas', 'Rayitas'], ['puntos', 'Puntos']]), s('fuente', 'Letra', 'gorda', FUENTES_OPS), n('eje', 'Agujero del eje', 8, 5, 12, 0.1), s('patron', 'Calado del centro', 'ninguno', OPS_PAT)],
    gen(p) { const R = p.d / 2; let m = cil(p.d, 4).subtract(cil(p.eje, 10, -1)); const L = [], rom = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      if (p.patron !== 'ninguno') m = m.subtract(PT.agujeros2D(p.patron, R, R, 14, 2.6).intersect(circ(R * 1.05).subtract(circ(p.eje + 20))).extrude(10).translate([0, 0, -1]));
      for (let i = 0; i < 12; i++) { const a = Math.PI / 2 - i * Math.PI / 6, rr2 = R * 0.8, x = rr2 * Math.cos(a), y = rr2 * Math.sin(a);
        if (p.marcas === 'numeros' || p.marcas === 'romanos') L.push(texto3d(p.marcas === 'numeros' ? String(i || 12) : rom[i], p.fuente, R * 0.13, 1.6).translate([x, y, 4]));
        else if (p.marcas === 'rayas') L.push(caja(3, R * 0.12, 1.6).rotate([0, 0, -i * 30]).translate([R * 0.86 * Math.cos(a), R * 0.86 * Math.sin(a), 4]));
        else L.push(cil(i % 3 ? 5 : 10, 1.6, 4).translate([R * 0.85 * Math.cos(a), R * 0.85 * Math.sin(a), 0])); }
      m = m.add(N.union(L)).add(N.forma3d('tubo', { d: p.d, interior: p.d - 6, h: 7 })); return m; },
    nota: p => 'Para una maquinaria de cuarzo con eje roscado (el agujero es de ' + String(p.eje).replace('.', ',') + ' mm: mide tu maquinaria). Los números en otro color: cambio de color a 4 mm.' },
  clipBolsas: { cat: 'hogar', e: '📎', t: 'Pinza para bolsas', d: 'Cierra bolsas de patatas o café', uso: 'flexible', color: '#ff6a13',
    campos: [n('largo', 'Largo', 100, 50, 200), n('alto', 'Ancho', 12, 8, 25), tx('nombre', 'Texto', 'CAFÉ')],
    gen(p) { const L = p.largo, g = 3; let m = caja(L, g, p.alto).translate([0, -4, 0]).add(caja(L, g, p.alto).translate([0, 4, 0])).add(N.forma3d('tubo', { d: 11, interior: 5, h: p.alto }).translate([-L / 2, 0, 0]).subtract(caja(8, 6, p.alto + 2).translate([-L / 2 - 6, 0, -1])));
      m = m.add(cil(4, p.alto).translate([0, -2.4, 0]).scale([L / 4 * 0.9 / 2, 1, 1]).intersect(caja(L - 6, 2, p.alto).translate([0, -2, 0]))).add(caja(4, 9, p.alto).translate([L / 2 - 2, 0, 0]).subtract(caja(3, 5, p.alto + 2).translate([L / 2, 3, -1])));
      if (p.nombre) m = m.add(textoDePie(p.nombre, 'gorda', p.alto * 0.6, 0.8).translate([0, -5.5 + 0.2, p.alto * 0.2]));
      return m; }, nota: () => 'Se cierra empujando el gancho del final. En PETG aguanta más aperturas que en PLA.' },
  salvamanteles: { cat: 'hogar', e: '🍲', t: 'Salvamanteles', d: 'Hexágonos o redondo, para ollas', uso: 'funcional', color: '#1b1b1d',
    campos: [n('d', 'Ancho', 180, 100, 250), s('patron', 'Dibujo', 'panal', PAT), n('grosor', 'Grosor', 8, 4, 15, 0.5)],
    gen(p) { return PT.caladoPlano(N.cs([N.poligono2(6, p.d)], 'Positive'), p.patron, 22, 4, 6).extrude(p.grosor); },
    nota: () => 'PLA aguanta unos 55 °C: para ollas recién sacadas del fuego, imprímelo en PETG (o mejor ASA). Con PLA, solo para platos templados.' },
  marcoFotos: { cat: 'hogar', e: '🖼️', t: 'Marco de fotos', d: 'Con ranura y patita', uso: 'deco', color: '#9d6d3f',
    campos: [s('foto', 'Tamaño de la foto', '10x15', [['10x15', '10 × 15 cm'], ['13x18', '13 × 18 cm'], ['9x13', '9 × 13 cm'], ['polaroid', 'Instantánea 8,6 × 5,4']]), c('vertical', 'Vertical', true), n('borde', 'Ancho del marco', 18, 8, 40), tx('txt', 'Texto abajo', '')],
    gen(p) { const F = { '10x15': [102, 152], '13x18': [127, 178], '9x13': [89, 127], polaroid: [54, 86] }[p.foto], [fw, fh] = p.vertical ? F : [F[1], F[0]], W = fw + 2 * p.borde - 6, H = fh + 2 * p.borde - 6;
      let m = caja(W, H, 7, 4).subtract(caja(fw - 8, fh - 8, 20, 1).translate([0, 0, -1])).subtract(caja(fw + 1, fh + 1, 1.2).translate([0, 6, 2.8]).add(caja(fw + 1, 10, 1.2).translate([0, H / 2, 2.8])));
      if (p.txt) m = m.add(texto3d(p.txt, 'cursiva', p.borde * 0.55, 1).translate([0, -H / 2 + p.borde / 2 - 1, 7]));
      const pata = M().hull([caja(30, 4, 4).translate([0, 0, 0]), caja(18, 4, 4).translate([0, H * 0.45, 0])]);
      return m.add(pata.translate([W / 2 + 30, 0, 0])); },
    nota: () => 'La foto entra por arriba por la ranura. La patita se pega detrás (o se imprime aparte y se encaja con pegamento).' },

  // ======================= 🎁 REGALOS =======================
  llaveroNombre: { cat: 'regalos', e: '🏷️', t: 'Llavero con nombre', d: 'Letras sobre su silueta', uso: 'deco', color: '#f55a9b',
    campos: [tx('txt', 'Nombre', 'Lucía'), s('fuente', 'Letra', 'cursiva', FUENTES_OPS), n('alto', 'Alto de las letras', 14, 6, 40), n('base', 'Grosor de la base', 2.4, 1.2, 6, 0.2), n('relieve', 'Relieve de las letras', 1.4, 0.4, 5, 0.2), n('borde', 'Borde alrededor', 2.6, 1, 8, 0.2)],
    gen(p) { const t = N.centraCS(N.texto2(p.txt || 'Lucía', p.fuente, p.alto)), b = N.cajaCS(t), sil = t.offset(p.borde, 'Round', 2, 24), anilla = circ(8).translate([b.min[0] - p.borde - 2, 0]).subtract(circ(4).translate([b.min[0] - p.borde - 2, 0]));
      const base = N.csUnion([sil, circ(8).translate([b.min[0] - p.borde - 2, 0])]).subtract(circ(4).translate([b.min[0] - p.borde - 2, 0])); void anilla; return base.extrude(p.base).add(t.extrude(p.relieve).translate([0, 0, p.base])); },
    nota: p => 'Para dos colores: cambio de color a ' + String(p.base).replace('.', ',') + ' mm en Bambu Studio (las letras en otro color).' },
  corazonNombres: { cat: 'regalos', e: '💞', t: 'Corazón con dos nombres', d: 'San Valentín, aniversarios', uso: 'deco', color: '#c8102e',
    campos: [tx('a', 'Nombre 1', 'Ana'), tx('b', 'Nombre 2', 'Leo'), s('fuente', 'Letra', 'cursiva', FUENTES_OPS), n('ancho', 'Ancho', 90, 40, 200), c('pie', 'De pie (con peana)', true)],
    gen(p) { const co = N.cs([N.corazon2(p.ancho)], 'Positive'), al = p.ancho * 0.14; let m = co.extrude(5).add(texto3d(p.a, p.fuente, al, 1.4).translate([0, al * 0.75, 5])).add(texto3d(p.b, p.fuente, al, 1.4).translate([0, -al * 0.75, 5])).add(texto3d('&', p.fuente, al * 0.7, 1.4).translate([0, 0, 5]));
      if (p.pie) { m = m.rotate([90, 0, 0]); const b = N.caja(m); m = m.translate([0, 0, -b.min[2] + 4]).add(caja(p.ancho * 0.7, 20, 4, 2)); } return m; } },
  bolaNavidad: { cat: 'regalos', e: '🎄', t: 'Bola de Navidad con nombre', d: 'Con anilla para el árbol', uso: 'deco', color: '#c8102e', acabado: 'seda',
    campos: [tx('txt', 'Nombre', 'Hugo'), s('fuente', 'Letra', 'cursiva', FUENTES_OPS), n('d', 'Diámetro', 70, 40, 120), s('estilo', 'Estilo', 'plana', [['plana', 'Plana (medallón)'], ['esfera', 'Esfera con el nombre en relieve']])],
    gen(p) { const R = p.d / 2; let m;
      if (p.estilo === 'plana') { m = cil(p.d, 4).add(texto3d(p.txt || 'Hugo', p.fuente, R * 0.42, 1.6).translate([0, 0, 4])).add(N.forma3d('tubo', { d: p.d, interior: p.d - 5, h: 5.6 })).add(N.forma3d('toro', { d: 12, grueso: 3 }).translate([0, R + 4, 0])); }
      else { m = M().sphere(R, 72).translate([0, 0, R]).add(textoDePie(p.txt || 'Hugo', p.fuente, R * 0.4, 2).translate([0, -R * 0.94, R * 0.8]).intersect(M().sphere(R + 2, 72).translate([0, 0, R]))).add(cil(10, 6, 2 * R - 2)).add(N.forma3d('toro', { d: 10, grueso: 2.6 }).rotate([90, 0, 0]).translate([0, 0, 2 * R + 8])); m = m.trimByPlane([0, 0, 1], 3).translate([0, 0, -3]); }
      return m; } },
  imanNevera: { cat: 'regalos', e: '🧲', t: 'Imán de nevera', d: 'Con hueco para un imán', uso: 'deco', color: '#f7d117',
    campos: [tx('emoji', 'Figura o texto', '🍋'), n('ancho', 'Ancho', 50, 20, 120), n('alto', 'Lo gordo que sale', 6, 2, 20), n('imanD', 'Imán (diámetro)', 10, 4, 25, 0.5), n('imanH', 'Imán (grosor)', 3, 1, 6, 0.5)],
    gen(p) { return N.inflar(figuraEmoji(p.emoji, p.ancho), { alto: p.alto, base: 1.6 }).subtract(cil(p.imanD + 2 * ENCAJES.justo, p.imanH + 0.2, -0.01)); },
    nota: p => 'Imán de ' + p.imanD + ' × ' + p.imanH + ' mm a presión por detrás (con una gota de pegamento si baila).' },

  // ======================= 🎲 JUEGOS Y FIDGET =======================
  spinner: { cat: 'juegos', e: '🌀', t: 'Fidget spinner', d: 'Para rodamientos 608', uso: 'encaje', color: '#00a4e4',
    campos: [n('brazos', 'Brazos', 3, 2, 6, 1, ''), n('largo', 'Largo de cada brazo', 30, 22, 50), s('peso', 'Peso en las puntas', 'rodamiento', [['rodamiento', 'Otro rodamiento 608'], ['moneda', 'Moneda de 1 € (23,25 mm)'], ['nada', 'Nada (liso)']])],
    gen(p) { const g = 7, rod = 22 + 2 * ENCAJES.presion, L = []; L.push(cil(rod + 8, g)); for (let i = 0; i < p.brazos; i++) { const a = i * 360 / p.brazos; L.push(M().hull([cil(14, g), cil(rod + 6, g).translate([p.largo, 0, 0])]).rotate([0, 0, a])); }
      let m = N.union(L).subtract(cil(rod, g + 2, -1)); for (let i = 0; i < p.brazos; i++) { const a = i * 360 / p.brazos; if (p.peso === 'rodamiento') m = m.subtract(cil(rod, g + 2, -1).translate([p.largo, 0, 0]).rotate([0, 0, a])); if (p.peso === 'moneda') m = m.subtract(cil(23.25 + 0.3, 2.4, g - 2.33).translate([p.largo, 0, 0]).rotate([0, 0, a])).subtract(cil(23.25 + 0.3, 2.4, -0.01).translate([p.largo, 0, 0]).rotate([0, 0, a])); }
      return m; }, nota: () => 'Rodamiento 608 (22 × 7 mm, el de los patines) a presión con tu holgura «apretando». Dos tapitas opcionales: imprime dos «Arandelas» de 22 mm.' },
  dado: { cat: 'juegos', e: '🎲', t: 'Dado', d: 'De 6 caras con puntos', uso: 'deco', color: '#f4f4f2',
    campos: [n('lado', 'Lado', 20, 10, 60), n('redondeo', 'Redondeo', 2, 0, 6, 0.2)],
    gen(p) { const a = p.lado; let m = N.forma3d('caja', { x: a, y: a, z: a, redondeo: p.redondeo }); const r = a * 0.09, d = a * 0.27, P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, 1], [-1, 1], [1, -1]], 5: [[-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]], 6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]] };
      const caras = [[1, [0, 0, a], [0, 0, 0]], [6, [0, 0, 0], [180, 0, 0]], [2, [0, -a / 2, a / 2], [90, 0, 0]], [5, [0, a / 2, a / 2], [-90, 0, 0]], [3, [a / 2, 0, a / 2], [0, 90, 0]], [4, [-a / 2, 0, a / 2], [0, -90, 0]]];
      const L = []; caras.forEach(([nn, c2, rot]) => P[nn].forEach(([u, v]) => { L.push(M().sphere(r, 16).translate([u * d, v * d, 0]).rotate(rot).translate(c2)); })); return m.subtract(N.union(L)); },
    nota: () => 'Los puntos se pueden rellenar con pintura acrílica y repasar con un trapo.' },
  laberinto: { cat: 'juegos', e: '🌀', t: 'Laberinto de bolsillo', d: 'Diferente cada vez', uso: 'deco', color: '#00ae42',
    campos: [n('n', 'Casillas por lado', 9, 4, 20, 1, ''), n('celda', 'Tamaño de casilla', 9, 6, 20), n('semilla', 'Laberinto número', 1, 1, 9999, 1, '')],
    gen(p) { const nC = Math.round(p.n), cel = p.celda, W = nC * cel, r = azarS(p.semilla), vis = new Array(nC * nC).fill(false), muros = new Set(), pila = [0]; vis[0] = true;
      for (let i = 0; i <= nC; i++) for (let j = 0; j < nC; j++) { muros.add('h' + i + ',' + j); muros.add('v' + i + ',' + j); }
      while (pila.length) { const cur = pila[pila.length - 1], x = cur % nC, y = (cur / nC) | 0, vec = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => x + dx >= 0 && x + dx < nC && y + dy >= 0 && y + dy < nC && !vis[(y + dy) * nC + x + dx]);
        if (!vec.length) { pila.pop(); continue; } const [dx, dy] = vec[Math.floor(r() * vec.length)], nx = x + dx, ny = y + dy; vis[ny * nC + nx] = true; pila.push(ny * nC + nx);
        if (dx === 1) muros.delete('v' + (x + 1) + ',' + y); if (dx === -1) muros.delete('v' + x + ',' + y); if (dy === 1) muros.delete('h' + (y + 1) + ',' + x); if (dy === -1) muros.delete('h' + y + ',' + x); }
      muros.delete('v0,0'); muros.delete('v' + nC + ',' + (nC - 1));
      const L = [caja(W + 4, W + 4, 2)]; muros.forEach(k => { const [i, j] = k.slice(1).split(',').map(Number); if (k[0] === 'h') L.push(caja(cel + 1.6, 1.6, 6).translate([-W / 2 + j * cel + cel / 2, -W / 2 + i * cel, 2])); else L.push(caja(1.6, cel + 1.6, 6).translate([-W / 2 + i * cel, -W / 2 + j * cel + cel / 2, 2])); });
      return N.union(L); }, nota: () => 'Cambia «Laberinto número» y sale otro distinto. Con una bolita de 6 mm y una tapa de metacrilato, es un juego de bolsillo.' },
  torreDados: { cat: 'juegos', e: '🗼', t: 'Torre de dados', d: 'Con rampas y bandeja', uso: 'funcional', color: '#5e43b7',
    campos: [n('ancho', 'Ancho', 60, 45, 100), n('alto', 'Alto', 150, 100, 230)],
    gen(p) { const w = p.ancho, H = p.alto; let m = caja(w, w, H).subtract(caja(w - 5, w - 5, H).translate([0, 0, 2.5])).subtract(caja(w - 12, 10, 34).translate([0, -w / 2, 2.5]));
      [0.75, 0.5, 0.27].forEach((t, i) => { const r = caja(w - 4, w * 0.8, 2.5).rotate([i % 2 ? 35 : -35, 0, 0]).translate([0, i % 2 ? w * 0.1 : -w * 0.1, H * t]); m = m.add(r.intersect(caja(w - 1, w - 1, H))); });
      return m.add(caja(w + 30, 40, 2.5).translate([0, -w / 2 - 18, 0])).add(caja(w + 30, 2.5, 12).translate([0, -w / 2 - 37, 0])); },
    nota: () => 'Se imprime de pie; las rampas llevan 35° y salen sin soportes. Si tu laminador se queja, activa «Sólo en la placa de impresión».' },

  // ======================= 🎮 GAMING =======================
  soporteMando: { cat: 'gaming', e: '🎮', t: 'Soporte de mandos', d: 'Para uno o dos mandos', uso: 'funcional', color: '#1b1b1d',
    campos: [n('n', 'Mandos', 2, 1, 3, 1, ''), n('ancho', 'Ancho del mando (por las asas)', 160, 120, 180), n('grueso', 'Grueso del mando por el centro', 55, 40, 70)],
    gen(p) { const W = p.ancho * 0.55, L = []; for (let i = 0; i < p.n; i++) { const pieza = caja(W, 30, 70, 6).subtract(caja(W + 2, p.grueso * 0.35, 60).rotate([-12, 0, 0]).translate([0, 2, 18])); L.push(pieza.translate([0, i * 34, i * 0])); }
      return N.union(L).add(caja(W + 10, 34 * p.n + 10, 6, 6).translate([0, 34 * (p.n - 1) / 2, 0])); },
    nota: () => 'ESTIMADO: mide tu mando (ancho y grueso del centro) y ajusta. Pon una tira de fieltro en la ranura para no rayarlo.' },
  soporteSwitch: { cat: 'gaming', e: '🕹️', t: 'Organizador de cartuchos', d: 'Juegos de Switch o tarjetas SD', uso: 'funcional', color: '#c8102e',
    campos: [s('tipo', 'Para', 'switch', [['switch', 'Cartuchos de Switch (21 × 31 × 3,3)'], ['sd', 'Tarjetas SD (24 × 32 × 2,1)'], ['micro', 'Micro SD (11 × 15 × 1)']]), n('filas', 'Filas', 2, 1, 4, 1, ''), n('cols', 'Por fila', 6, 2, 12, 1, '')],
    gen(p) { const [a, b, g] = { switch: [21, 31, 3.3], sd: [24, 32, 2.1], micro: [11, 15, 1] }[p.tipo], ga = g + 0.6, paso = ga + 3, W = p.cols * paso + 6, D = p.filas * (a + 6) + 4, H = b * 0.55 + 3;
      let m = caja(W, D, H, 3); for (let i = 0; i < p.cols; i++) for (let j = 0; j < p.filas; j++) m = m.subtract(caja(ga, a + 0.6, b).translate([-W / 2 + 3 + paso * (i + 0.5), -D / 2 + 2 + (a + 6) * (j + 0.5), 3])); return m; },
    nota: () => 'Medidas de los cartuchos ESTIMADAS (con 0,6 mm de holgura): imprime una fila de prueba.' },
  soporteAuriculares: { cat: 'gaming', e: '🎧', t: 'Soporte de auriculares', d: 'De mesa, con arco', uso: 'funcional', color: '#1b1b1d',
    campos: [n('alto', 'Alto', 240, 150, 250), n('ancho', 'Ancho del arco', 100, 60, 140), n('base', 'Base', 110, 80, 160), tx('txt', 'Texto en la base', '')],
    gen(p) { const g = 18; let m = cil(p.base, 8).add(caja(g, 12, p.alto - 6, 4).translate([0, 0, 8])).add(CS().circle(6, 32).translate([p.ancho / 2 - 6, 0]).revolve(96, 180).rotate([90, 0, 0]).rotate([0, 0, 0]).translate([0, 0, 0]).scale([1, 4, 0.5]).translate([0, 0, p.alto - 20]));
      if (p.txt) m = m.add(texto3d(p.txt, 'gorda', 12, 1.2).translate([0, -p.base * 0.25, 8])); return m; },
    nota: () => 'Se imprime de pie con 4 bucles de pared y 25 % de relleno: el palo tiene que aguantar.' },
  soporteMovil: { cat: 'gaming', e: '📲', t: 'Soporte de móvil o tablet', d: 'Con hueco para el cable', uso: 'funcional', color: '#00a4e4',
    campos: [n('ancho', 'Ancho', 80, 50, 200), n('angulo', 'Inclinación', 65, 45, 80, 1, '°'), n('grueso', 'Grosor del móvil con funda', 12, 6, 25, 0.5), c('cable', 'Hueco para el cable', true), tx('txt', 'Texto', '')],
    gen(p) { const a = p.angulo * Math.PI / 180, L = 95, perfil = N.cs([N.ccw([[0, 0], [70, 0], [70, 4], [8 + p.grueso + 6, 4], [8 + p.grueso + 6, 14], [8 + p.grueso + 3, 14], [8 + p.grueso + 3, 7], [8, 7], [8 + L * Math.cos(a) - 4, L * Math.sin(a)], [4 + L * Math.cos(a) - 4, L * Math.sin(a)], [0, 6]])], 'Positive').offset(-1, 'Round').offset(1, 'Round');
      let m = perfil.extrude(p.ancho).rotate([90, 0, 90]).translate([-p.ancho / 2, -35, 0]); if (p.cable) m = m.subtract(caja(14, 30, 40).translate([0, -35 + 8 + p.grueso / 2, -1])).subtract(cil(14, 60).rotate([90, 0, 0]).translate([0, 0, 30]));
      if (p.txt) m = m.add(texto3d(p.txt, 'gorda', 8, 1).rotate([0, 0, 180]).translate([0, 32, 4])); return m; } },

  // ======================= 🐾 MASCOTAS =======================
  placaCollar: { cat: 'mascotas', e: '🦴', t: 'Placa para el collar', d: 'Nombre delante y teléfono detrás', uso: 'deco', color: '#f7d117',
    campos: [s('forma', 'Forma', 'hueso', [['hueso', '🦴 Hueso'], ['corazon', '♥ Corazón'], ['circulo', '● Redonda'], ['huella', '🐾 Huella']]), tx('nombre', 'Nombre', 'Toby'), tx('tel', 'Teléfono (detrás)', '600 000 000'), n('ancho', 'Ancho', 38, 25, 60)],
    gen(p) { const w = p.ancho; const f = p.forma === 'corazon' ? N.cs([N.corazon2(w)], 'Positive') : p.forma === 'circulo' ? circ(w) : p.forma === 'huella' ? N.csUnion([circ(w * 0.55).translate([0, -w * 0.12]), circ(w * 0.2).translate([-w * 0.3, w * 0.2]), circ(w * 0.2).translate([-w * 0.1, w * 0.33]), circ(w * 0.2).translate([w * 0.1, w * 0.33]), circ(w * 0.2).translate([w * 0.3, w * 0.2])])
        : N.csUnion([rr(w * 0.7, w * 0.3, 0), circ(w * 0.26).translate([-w * 0.37, w * 0.1]), circ(w * 0.26).translate([-w * 0.37, -w * 0.1]), circ(w * 0.26).translate([w * 0.37, w * 0.1]), circ(w * 0.26).translate([w * 0.37, -w * 0.1])]);
      const b = N.cajaCS(f); let m = f.extrude(3).subtract(cil(3.5, 10, -1).translate([0, b.max[1] - 3.5, 0]));
      if (p.nombre) m = m.add(texto3d(p.nombre, 'gorda', w * 0.2, 0.8).translate([0, 0, 3])); if (p.tel) m = m.subtract(texto3d(p.tel, 'estrecha', w * 0.11, 0.6).mirror([1, 0, 0]).translate([0, -w * 0.05, -0.01]));
      return m; }, nota: () => 'El teléfono va grabado por detrás (al revés para que se lea bien). En PETG aguanta mejor los mordiscos y el agua.' },

  // ======================= 📱 FUNDAS =======================
  funda: { cat: 'movil', e: '📱', t: 'Funda de móvil', d: MOVILES.length + ' móviles · ' + Object.keys(ESTILOS_FUNDA).length + ' estilos', uso: 'flexible', color: '#1b1b1d',
    campos: [s('modelo', 'Móvil', 'iPhone 16', MOVILES.map(m => [m[1], m[0] + ' · ' + m[1]])), s('estilo', 'Estilo', 'panal', Object.entries(ESTILOS_FUNDA).map(([k, v]) => [k, v]).map(([k, v]) => [k, v.t])), tx('txt', 'Nombre o figura (estilos con texto)', ''), s('material', 'Material', 'pla', [['pla', 'PLA (rígida)'], ['petg', 'PETG'], ['tpu', 'TPU (flexible)']]), s('ajuste', 'Ajuste', 'estandar', [['estandar', 'Estándar'], ['ajustada', 'Más ajustada'], ['holgada', 'Más holgada'], ['medido', '✓ Medido por ti']]), c('cordon', 'Anillas para colgante', false), c('kit', '🧪 Solo la PRUEBA DE AJUSTE (≈5 g)', false)],
    gen(p) { return p.kit ? kitFunda(p) : funda(p); }, nota: p => { const m = movil(p.modelo); return (m ? 'Alto, ancho y grosor: medidas oficiales del ' + m.modelo + '. ' : '') + 'Cámara y botones: ESTIMADOS. Imprime antes la «prueba rápida» y pon el móvil encima.'; } },

  // ======================= ⚙️ PIEZAS MECÁNICAS (v20) =======================
  // Para piezas de máquina, la IA de fotos se inventa los dientes y tapa los agujeros (medido con un engranaje de prueba):
  // aquí se construyen con MEDIDAS. Lo que escribes es lo de TU pieza (mídelo con el calibre); las holguras de tu Bambu
  // (0,05 a presión · 0,10 encaja · 0,15 gira, por lado) se suman solas.
  engranaje: { cat: 'mecanica', e: '⚙️', t: 'Engranaje recto', d: 'Dientes de evolvente, como los de fábrica', uso: 'pieza', color: '#2457d6',
    campos: [n('z', 'Dientes', 20, 8, 150, 1, ''), n('m', 'Módulo (tamaño del diente)', 1.5, 0.5, 5, 0.25), n('grosor', 'Grosor', 8, 2, 60), n('eje', 'Diámetro del eje (0 = sin agujero)', 5, 0, 40, 0.1),
      s('forma', 'Forma del eje', 'redondo', [['redondo', 'Redondo'], ['d', 'Con plano (eje en D)'], ['chaveta', 'Con chavetero']]), n('plano', 'Del plano al otro lado (eje en D)', 4.5, 1, 40, 0.1),
      s('encaje', 'Ajuste en el eje', 'presion', [['presion', 'A presión (0,05)'], ['justo', 'Encaja (0,10)'], ['gira', 'Gira libre (0,15)']]), n('juego', 'Juego entre dientes', 0.1, 0, 0.4, 0.05),
      c('buje', 'Con buje (refuerzo alrededor del eje)', true), n('bujeH', 'Alto del buje', 5, 1, 40), n('pareja', 'Dientes del otro engranaje (para la distancia entre ejes)', 40, 8, 150, 1, '')],
    gen(p) {
      const hol = ENCAJES[p.encaje] ?? ENCAJES.presion, z = Math.round(p.z);
      let perfil = N.cs([N.ccw(perfilEngranaje(z, p.m))], 'Positive');
      if (p.juego > 0) perfil = perfil.offset(-p.juego / 2, 'Round', 2, 16); // el juego se reparte entre los dos engranajes
      let m = perfil.extrude(p.grosor);
      if (p.buje && p.eje > 0) m = m.add(cil(Math.min(p.m * z - 2.5 * p.m, Math.max(p.eje * 2 + 4, p.eje + 8)), p.bujeH, p.grosor - 0.01));
      if (p.eje > 0) {
        const alto = p.grosor + (p.buje ? p.bujeH : 0) + 2, d = p.eje + 2 * hol;
        let ag = cil(d, alto, -1);
        if (p.forma === 'd') { const P = Math.min(d, p.plano + 2 * hol); ag = ag.intersect(caja(d + 2, P + 1, alto).translate([0, d / 2 - P / 2 + 0.5, -1])); } // el plano queda a P del otro lado
        if (p.forma === 'chaveta') { const b = Math.max(1.5, Math.round(p.eje / 4)), t = b / 2 + hol; ag = ag.add(caja(b + 2 * hol, d / 2 + t, alto).translate([0, (d / 2 + t) / 2, -1])); }
        m = m.subtract(ag);
      }
      return m;
    },
    nota: p => { const z = Math.round(p.z), dp = p.m * z; return 'Diámetro de fuera ' + n2((z + 2) * p.m) + ' mm · primitivo ' + n2(dp) + ' mm. Con otro de ' + Math.round(p.pareja) + ' dientes del MISMO módulo, separa los ejes ' + n2(p.m * (z + Math.round(p.pareja)) / 2) + ' mm. Imprímelo plano (la cara grande en la cama), con 3–4 paredes y 40 % de relleno: los dientes salen más fuertes. Para sustituir uno roto: cuenta los dientes y mide el diámetro de fuera; módulo = diámetro de fuera ÷ (dientes + 2).'; } },
  perillaD: { cat: 'mecanica', e: '🎛️', t: 'Perilla para eje en D', d: 'Potenciómetros, hornos, ventiladores…', uso: 'pieza', color: '#2457d6',
    campos: [n('d', 'Diámetro de la perilla', 22, 10, 60), n('h', 'Alto', 16, 6, 40), n('eje', 'Diámetro del eje', 6, 2, 12, 0.1), n('plano', 'Del plano al otro lado', 4.5, 1, 12, 0.1), n('fondo', 'Profundidad del agujero', 10, 3, 30),
      s('encaje', 'Ajuste', 'presion', [['presion', 'A presión (0,05)'], ['justo', 'Encaja (0,10)']]), n('estrias', 'Estrías para agarrar (0 = lisa)', 18, 0, 40, 1, ''), c('marca', 'Rayita que marca la posición', true)],
    gen(p) {
      const hol = ENCAJES[p.encaje] ?? ENCAJES.presion, R = p.d / 2;
      let m = M().hull([cil(p.d, p.h - 1.5), cil(p.d - 3, 1.5, p.h - 1.5)]);
      for (let i = 0; i < Math.round(p.estrias); i++) m = m.subtract(cil(2.2, p.h + 2, -1).translate([R + 0.5, 0, 0]).rotate([0, 0, i * 360 / Math.round(p.estrias)]));
      if (p.marca) m = m.subtract(caja(1.4, R * 0.7, 1.2).translate([0, -R * 0.45, p.h - 1]));
      const d = p.eje + 2 * hol, P = Math.min(d, p.plano + 2 * hol), ag = cil(d, p.fondo + 1, -1).intersect(caja(d + 2, P + 1, p.fondo + 1).translate([0, d / 2 - P / 2 + 0.5, -1]));
      return m.subtract(ag);
    },
    nota: () => 'Mide el eje con el calibre: el diámetro y, en la parte plana, de la cara plana al otro lado. Se imprime boca abajo (la cara de la rayita en la cama) para que el agujero en D salga limpio.' },
  separador: { cat: 'mecanica', e: '🛞', t: 'Separador o arandela', d: 'Distancias exactas entre piezas', uso: 'pieza', color: '#2457d6',
    campos: [n('d', 'Diámetro de fuera', 10, 3, 80, 0.1), n('eje', 'Diámetro del tornillo o eje', 3, 1, 60, 0.1), n('h', 'Alto', 5, 0.4, 100, 0.1), s('encaje', 'Ajuste', 'gira', [['presion', 'A presión (0,05)'], ['justo', 'Encaja (0,10)'], ['gira', 'Gira libre (0,15)']])],
    gen(p) { const hol = ENCAJES[p.encaje] ?? ENCAJES.gira; if (p.eje + 2 * hol >= p.d - 0.8) N.mal('El agujero no cabe: el diámetro de fuera tiene que ser al menos 0,8 mm mayor.'); return cil(p.d, p.h).subtract(cil(p.eje + 2 * hol, p.h + 2, -1)); },
    nota: () => 'Para separadores de menos de 1 mm, imprime con capa de 0,12 (tu perfil «Ligero»).' },
  escuadra: { cat: 'mecanica', e: '📐', t: 'Escuadra con agujeros', d: 'Para unir dos piezas en ángulo recto', uso: 'pieza', color: '#2457d6',
    campos: [n('ancho', 'Ancho', 20, 8, 120), n('lado', 'Largo de cada lado', 30, 10, 150), n('g', 'Grosor', 4, 2, 15, 0.5), s('tornillo', 'Tornillo', '4', [['3', 'M3'], ['4', 'M4'], ['5', 'M5'], ['6', 'M6']]), n('agujeros', 'Agujeros por lado', 1, 1, 4, 1, ''), c('refuerzo', 'Con refuerzo en el ángulo', true)],
    gen(p) {
      let m = caja(p.ancho, p.lado, p.g).translate([0, p.lado / 2, 0]).add(caja(p.ancho, p.g, p.lado).translate([0, p.g / 2, 0]));
      if (p.refuerzo) m = m.add(CS().ofPolygons([N.ccw([[0, 0], [p.lado * 0.55, 0], [0, p.lado * 0.55]])]).extrude(Math.min(3, p.ancho / 4)).rotate([90, 0, 90]).translate([-Math.min(3, p.ancho / 4) / 2, 0, 0]));
      const d = Number(p.tornillo) + 2 * ENCAJES.gira + 0.2, k = Math.round(p.agujeros), paso = (p.lado - p.g - d) / (k + 1) || 1;
      for (let i = 1; i <= k; i++) { const pos = p.g + d / 2 + paso * i; m = m.subtract(cil(d, p.g + 2, -1).translate([0, pos, 0])).subtract(cil(d, p.g + 2, -1).rotate([-90, 0, 0]).translate([0, 0, pos])); }
      return m;
    },
    nota: () => 'Imprímela tumbada de lado (el canto en la cama) y con 4 paredes: así las capas no se abren por el ángulo, que es donde sufre.' },
  // ======================= 🔩 COMPONENTES (piezas para tus diseños) =======================
  // ======================= 🏎️ RC Y REPUESTOS (v20) =======================
  // Diseños PROPIOS y a medida (no copias de ninguna marca). Las medidas por defecto son las habituales del RC (hexágono de
  // 12 mm, paso 48P/32P, eje de motor de 3,175 mm…): compruébalas siempre con TU pieza y el calibre antes de imprimir.
  diferencial: { cat: 'rc', e: '🔄', t: 'Diferencial: planetarios y satélites', d: 'Juego de piñones cónicos a medida', uso: 'pieza', color: '#e2231a',
    campos: [n('m', 'Módulo', 1, 0.5, 3, 0.05), n('zp', 'Dientes de cada planetario', 16, 10, 40, 1, ''), n('zs', 'Dientes de cada satélite', 10, 6, 30, 1, ''), s('ns', 'Satélites', '2', [['2', '2 satélites'], ['3', '3 satélites'], ['4', '4 satélites (más fuerte)']]),
      n('ancho', 'Ancho del diente', 5, 2, 20), n('pasador', 'Pasador de los satélites (cruceta)', 3, 1.5, 8, 0.1), s('salida', 'Salida de los planetarios', 'hex', [['hex', 'Hexágono'], ['d', 'Eje en D'], ['redonda', 'Redonda']]),
      n('ejeSal', 'Medida de la salida (entre caras / diámetro)', 5, 2, 15, 0.1), n('juego', 'Juego entre dientes', 0.15, 0, 0.4, 0.05)],
    gen(p) {
      const zp = Math.round(p.zp), zs = Math.round(p.zs), ns = Number(p.ns);
      const pla = conico(zp, zs, p.m, p.ancho, p.juego), sat = conico(zs, zp, p.m, p.ancho, p.juego);
      const P = pla.m.subtract(salidaEje(p.salida, p.ejeSal, ENCAJES.presion, pla.alto + 12).translate([0, 0, -1])).add(cil(Math.min(pla.dRaiz * 0.8, p.ejeSal * 2 + 6), 4, -3.99).subtract(salidaEje(p.salida, p.ejeSal, ENCAJES.presion, 12).translate([0, 0, -6])));
      const S = sat.m.subtract(cil(p.pasador + 2 * ENCAJES.gira, sat.alto + 2, -1));
      const L = [P, P.translate([pla.dExt + 4, 0, 0])], paso = sat.dExt + 4;
      for (let i = 0; i < ns; i++) L.push(S.translate([(i - (ns - 1) / 2) * paso + (pla.dExt + 4) / 2, pla.dExt / 2 + sat.dExt / 2 + 4, 0]));
      return N.union(L.map(x => x.translate([0, 0, -N.caja(x).min[2]])));
    },
    nota: p => { const zp = Math.round(p.zp), zs = Math.round(p.zs), dp = Math.atan(zp / zs), ds = Math.atan(zs / zp), A = p.m * zp / 2 / Math.sin(dp); return 'Juego para un diferencial de piñones cónicos (ejes a 90°): 2 planetarios de ' + zp + ' dientes y ' + p.ns + ' satélites de ' + zs + '. Montaje: los ejes de todos se cruzan en un punto que queda a ' + n2(A * Math.cos(dp)) + ' mm de la cara ancha de los dientes de cada planetario (sin contar su buje) y a ' + n2(A * Math.cos(ds)) + ' mm de la de cada satélite. Los satélites giran en un pasador metálico de ' + n2(p.pasador) + ' mm (la cruceta). Imprime con la cara grande en la cama, 4 paredes y 50 % de relleno; en PLA es para probar y para cargas suaves: para correr de verdad, PETG o nailon.'; } },
  reductora: { cat: 'rc', e: '🪐', t: 'Reductora planetaria', d: 'Sol, planetas, corona y portaplanetas', uso: 'pieza', color: '#e2231a',
    campos: [n('m', 'Módulo', 1, 0.5, 3, 0.05), n('zsol', 'Dientes del sol', 12, 8, 60, 1, ''), n('zpl', 'Dientes de cada planeta', 18, 8, 60, 1, ''), s('np', 'Planetas', '3', [['2', '2'], ['3', '3'], ['4', '4']]), n('ancho', 'Ancho', 8, 3, 40),
      n('ejeSol', 'Eje del sol (motor)', 3.175, 1, 12, 0.005), s('formaSol', 'Eje del sol', 'd', [['redondo', 'Redondo'], ['d', 'Eje en D']]), n('pin', 'Pasador de los planetas', 3, 1.5, 8, 0.1), n('juego', 'Juego entre dientes', 0.15, 0, 0.4, 0.05), n('pared', 'Pared de la corona', 4, 2, 15, 0.5)],
    gen(p) {
      const zs = Math.round(p.zsol), zpl = Math.round(p.zpl), np = Number(p.np), zr = zs + 2 * zpl, m = p.m, hol = ENCAJES.gira;
      if ((zs + zr) % np) N.mal('Con esos dientes los planetas no quedan repartidos por igual: (sol + corona) tiene que dividirse entre ' + np + '. Prueba con ' + (zs + 1) + ' o ' + (zs - 1) + ' dientes en el sol.');
      const rueda = (z, k = 1) => { let c = N.cs([N.ccw(perfilEngranaje(z, m))], 'Positive'); if (p.juego > 0) c = c.offset(-k * p.juego / 2, 'Round', 2, 16); return c; };
      const sol = rueda(zs).extrude(p.ancho).subtract(salidaEje(p.formaSol === 'd' ? 'd' : 'redonda', p.ejeSol, ENCAJES.presion, p.ancho + 2, p.ejeSol * 0.82).translate([0, 0, -1]));
      const planeta = rueda(zpl).extrude(p.ancho).subtract(cil(p.pin + 2 * hol, p.ancho + 2, -1));
      const rCorona = m * zr / 2 + m + p.pared, hueco = N.cs([N.ccw(perfilEngranaje(zr, m))], 'Positive').offset(p.juego / 2, 'Round', 2, 16).add(circ(2 * (m * zr / 2 - m)));
      const corona = circ(2 * rCorona).subtract(hueco).extrude(p.ancho);
      const a = m * (zs + zpl) / 2, porta = [cil(2 * (a + p.pin * 1.6), 3)];
      for (let i = 0; i < np; i++) porta.push(cil(p.pin, p.ancho + 0.5, 2.99).translate([a * Math.cos(i * 2 * Math.PI / np), a * Math.sin(i * 2 * Math.PI / np), 0]));
      const portaP = N.union(porta).subtract(salidaEje('hex', 5, ENCAJES.presion, 6).translate([0, 0, -1]));
      const dPl = m * (zpl + 2), L = [corona, sol.translate([rCorona + m * (zs + 2) / 2 + 4, 0, 0]), portaP.translate([-(rCorona + a + p.pin * 1.6 + 4), 0, 0])];
      for (let i = 0; i < np; i++) L.push(planeta.translate([(i - (np - 1) / 2) * (dPl + 4), -(rCorona + dPl / 2 + 4), 0])); // en fila, debajo
      return N.union(L);
    },
    nota: p => { const zs = Math.round(p.zsol), zpl = Math.round(p.zpl), zr = zs + 2 * zpl; return 'Corona de ' + zr + ' dientes. Con la corona quieta y el sol de entrada, el portaplanetas sale ' + n2(1 + zr / zs) + ' veces más lento (y con esa fuerza de más). Los planetas giran sobre los pasadores del portaplanetas (impresos) o sobre tornillos de ' + n2(p.pin) + ' mm. Cara grande en la cama, 4 paredes.'; } },
  pinonCorona: { cat: 'rc', e: '⚙️', t: 'Piñón y corona (motor)', d: '48P, 32P o módulo, con prisionero', uso: 'pieza', color: '#e2231a',
    campos: [s('paso', 'Paso de los dientes', '48P', [['48P', '48P (módulo 0,53)'], ['32P', '32P (módulo 0,79)'], ['m0.5', 'Módulo 0,5'], ['m0.6', 'Módulo 0,6'], ['m0.8', 'Módulo 0,8'], ['m1', 'Módulo 1 (crawlers, 1/8)'], ['m1.5', 'Módulo 1,5']]), n('zp', 'Dientes del piñón', 20, 9, 60, 1, ''), n('zc', 'Dientes de la corona', 72, 30, 120, 1, ''), n('ancho', 'Ancho', 6, 2, 20),
      n('eje', 'Eje del motor', 3.175, 1, 8, 0.005), n('ejeC', 'Eje de la corona', 5, 2, 12, 0.1), c('prisionero', 'Agujero para prisionero M3 (sujeta el piñón al eje)', true), n('juego', 'Juego entre dientes', 0.1, 0, 0.4, 0.05)],
    gen(p) {
      const m = moduloRC(p.paso), zp = Math.round(p.zp), zc = Math.round(p.zc);
      const rueda = z => { let c = N.cs([N.ccw(perfilEngranaje(z, m))], 'Positive'); if (p.juego > 0) c = c.offset(-p.juego / 2, 'Round', 2, 16); return c.extrude(p.ancho); };
      const dBuje = Math.max(p.eje + 7, m * zp * 0.9);
      let pin = rueda(zp).add(cil(dBuje, 5, p.ancho - 0.01)).subtract(cil(p.eje + 2 * ENCAJES.presion, p.ancho + 7, -1));
      if (p.prisionero) pin = pin.subtract(cil(2.6, dBuje, 0).rotate([-90, 0, 0]).translate([0, 0, p.ancho + 2.5]));
      const cor = rueda(zc).subtract(cil(p.ejeC + 2 * ENCAJES.presion, p.ancho + 2, -1));
      return pin.add(cor.translate([m * (zp + zc) / 2 + 3 + m * 2, 0, 0]));
    },
    nota: p => { const m = moduloRC(p.paso); return 'Módulo ' + n2(m) + '. Distancia entre ejes motor–corona: ' + n2(m * (Math.round(p.zp) + Math.round(p.zc)) / 2) + ' mm. Reducción ' + n2(Math.round(p.zc) / Math.round(p.zp)) + ':1. El prisionero (M3) se rosca solo en el plástico. En PLA el piñón se gasta rápido: para correr, PETG o nailon; en PLA, para probar la relación.'; } },
  hexRueda: { cat: 'rc', e: '🛞', t: 'Hexágono de rueda', d: '12 mm (1/10) o a medida, con ranura del pasador', uso: 'pieza', color: '#e2231a',
    campos: [n('hex', 'Hexágono (entre caras)', 12, 5, 30, 0.1), n('g', 'Grosor (más = rueda más hacia fuera)', 5, 2, 30, 0.1), n('eje', 'Diámetro del eje o varilla', 5, 2, 12, 0.1),
      s('sujecion', 'Cómo se sujeta al eje', 'pasador', [['pasador', 'Pasador cruzado (ranura)'], ['prisionero', 'Prisionero M3 (varilla lisa)'], ['d', 'Eje en D']]), n('pasador', 'Pasador del eje', 2, 1, 4, 0.1), n('ranura', 'Profundidad de la ranura', 2, 0.5, 6, 0.1), n('plano', 'Eje en D: del plano al otro lado', 4.5, 1, 11, 0.1)],
    gen(p) {
      let h = N.cs([N.poligono2(6, (p.hex - 2 * ENCAJES.justo) / 0.866025, 0)], 'Positive').extrude(p.g);
      if (p.sujecion === 'd') return h.subtract(salidaEje('d', p.eje, ENCAJES.presion, p.g + 2, p.plano).translate([0, 0, -1]));
      h = h.subtract(cil(p.eje + 2 * ENCAJES.justo, p.g + 2, -1));
      if (p.sujecion === 'prisionero') { if ((p.hex - p.eje) / 2 < 2.5) N.mal('No cabe el prisionero: el hexágono tiene que ser al menos 5 mm mayor que el eje.'); return h.subtract(cil(2.6, p.hex, 0).rotate([-90, 0, 0]).translate([0, 0, p.g / 2])); }
      return h.subtract(caja(p.hex + 4, p.pasador + 2 * ENCAJES.justo, p.ranura + 1).translate([0, 0, p.g - p.ranura]));
    },
    nota: p => 'El hexágono sale 0,1 mm más justo por cara para que entre en la llanta sin bailar. ' + (p.sujecion === 'prisionero' ? 'El prisionero M3 se rosca solo en el plástico (agujero de 2,6 mm).' : p.sujecion === 'd' ? 'Agujero en D con tu holgura «a presión».' : 'La ranura del pasador queda arriba: así se imprime sin soportes.') + ' Mejor en PETG o nailon: el PLA se deforma con el calor del motor y los golpes.' },
  trapecio: { cat: 'rc', e: '🦾', t: 'Trapecio de suspensión', d: 'Brazo en A o recto, con anclaje de amortiguador', uso: 'pieza', color: '#e2231a',
    campos: [n('largo', 'Largo (pasador interior → exterior)', 60, 25, 200), n('ancho', 'Separación de los anclajes al chasis', 30, 6, 120), n('pin', 'Pasador (varilla)', 3, 1.5, 6, 0.1), n('g', 'Grosor', 6, 3, 15, 0.5), s('forma', 'Forma', 'A', [['A', 'En A (dos anclajes)'], ['recto', 'Recto (un anclaje largo)']]), n('amort', 'Anclaje del amortiguador (desde dentro)', 42, 0, 200), n('agAm', 'Tornillo del amortiguador', 3, 2, 5, 0.1)],
    gen(p) {
      const D = p.pin + 2 * ENCAJES.gira, Rb = D / 2 + 2.2, tubo = (largo, x) => M().cylinder(largo, Rb, Rb, seg(2 * Rb)).rotate([-90, 0, 0]).translate([x, -largo / 2, Rb]);
      const lb = p.forma === 'A' ? Math.min(10, p.ancho / 3) : p.ancho, piezas = [], fuera = tubo(Math.max(10, p.g * 2), p.largo);
      if (p.forma === 'A') [-1, 1].forEach(k => piezas.push(tubo(lb, 0).translate([0, k * (p.ancho - lb) / 2, 0]))); else piezas.push(tubo(p.ancho, 0));
      const alma = piezas.map(t => M().hull([t, fuera]).intersect(caja(1000, 1000, p.g))); // el alma, del grosor elegido
      let m = N.union(alma.concat(piezas, [fuera]));
      if (p.amort > 0 && p.amort < p.largo) m = m.add(cil(p.agAm + 5, 2 * Rb, 0).translate([p.amort, 0, 0])).subtract(cil(p.agAm + 2 * ENCAJES.justo - 0.4, 2 * Rb + 2, -1).translate([p.amort, 0, 0]));
      const ag = l => M().cylinder(l, D / 2, D / 2, seg(D)).rotate([-90, 0, 0]);
      return m.subtract(ag(p.ancho + 4).translate([0, -p.ancho / 2 - 2, Rb])).subtract(ag(40).translate([p.largo, -20, Rb]));
    },
    nota: p => 'Se imprime tumbado (como sale), sin soportes. Los pasadores son varilla de ' + n2(p.pin) + ' mm con tu holgura «gira». En PLA es para probar medidas; para correr, PETG o nailon con 4–5 paredes.' },
  torreAmort: { cat: 'rc', e: '🗼', t: 'Torre de amortiguadores', d: 'Varias alturas de anclaje', uso: 'pieza', color: '#e2231a',
    campos: [n('ancho', 'Ancho arriba', 120, 40, 260), n('base', 'Ancho de la base', 60, 20, 200), n('alto', 'Alto', 45, 15, 120), n('g', 'Grosor', 4, 2, 10, 0.5), n('nAg', 'Agujeros de amortiguador por lado', 3, 1, 6, 1, ''), n('agAm', 'Tornillo del amortiguador', 3, 2, 5, 0.1), n('sep', 'Separación de los tornillos de la base', 40, 10, 180), n('agBase', 'Tornillo de la base', 3, 2, 5, 0.1)],
    gen(p) {
      const placa = M().hull([caja(p.base, 6, p.g).translate([0, 3, 0]), caja(p.ancho, 10, p.g).translate([0, p.alto - 5, 0])]);
      let m = placa.subtract(cil(Math.min(p.base, p.ancho) * 0.35, p.g + 2, -1).scale([1.4, 0.9, 1]).translate([0, p.alto * 0.48, 0]));
      const k = Math.round(p.nAg);
      for (let i = 0; i < k; i++) [-1, 1].forEach(sg => { m = m.subtract(cil(p.agAm + 2 * ENCAJES.justo, p.g + 2, -1).translate([sg * (p.ancho / 2 - 5 - i * (p.agAm + 4)), p.alto - 5, 0])); });
      [-1, 1].forEach(sg => { m = m.subtract(cil(p.agBase + 2 * ENCAJES.gira, p.g + 2, -1).translate([sg * p.sep / 2, 4.5, 0])); });
      return m;
    },
    nota: () => 'Se imprime plana. Los agujeros de arriba, de fuera hacia dentro, cambian la dureza de la suspensión. Para pegar al chasis, los dos de abajo.' },
  precarga: { cat: 'rc', e: '🔧', t: 'Clips de precarga del amortiguador', d: 'Separadores que se ponen a presión', uso: 'pieza', color: '#e2231a',
    campos: [n('vastago', 'Diámetro donde se pone (cuerpo o vástago)', 12, 2, 30, 0.1), n('fuera', 'Diámetro de fuera', 17, 5, 40, 0.1), tx('lista', 'Alturas (mm, separadas por comas)', '1, 2, 3, 4', 'Ej.: 1, 2, 3')],
    gen(p) {
      const H = String(p.lista || '1,2,3').split(/[;,\s]+/).map(Number).filter(x => x > 0.2 && x < 40).slice(0, 8);
      if (!H.length) N.mal('Escribe al menos una altura (por ejemplo: 1, 2, 3).');
      const di = p.vastago + 2 * ENCAJES.presion, abertura = p.vastago * 0.8;
      if (p.fuera <= di + 1.6) N.mal('El diámetro de fuera tiene que ser al menos 1,6 mm mayor que el de dentro.');
      return N.union(H.map((h, i) => cil(p.fuera, h).subtract(cil(di, h + 2, -1)).subtract(caja(abertura, p.fuera, h + 2).translate([0, p.fuera / 2, -1])).translate([i * (p.fuera + 3), 0, 0])));
    },
    nota: () => 'Abiertos por un lado para ponerlos y quitarlos sin desmontar el amortiguador. Mejor en PETG o TPU 95A (no se parten al abrirlos).' },
  chasisPlaca: { cat: 'rc', e: '🛻', t: 'Chasis de placa', d: 'Base con hueco de batería y agujeros', uso: 'pieza', color: '#e2231a',
    campos: [n('largo', 'Largo', 200, 60, 250), n('ancho', 'Ancho', 90, 30, 250), n('g', 'Grosor', 4, 2, 10, 0.5), n('r', 'Esquinas', 8, 0, 40), n('batL', 'Hueco de batería: largo (0 = sin hueco)', 0, 0, 200), n('batA', 'Hueco de batería: ancho', 48, 10, 150),
      n('paso', 'Separación de la rejilla de agujeros', 20, 6, 60), n('ag', 'Agujeros', 3, 0, 6, 0.1), c('aligerar', 'Aligerar con calado (más ligera)', false)],
    gen(p) {
      if (p.largo > 250 || p.ancho > 250) N.mal('No cabe en tus Bambu (256 × 256 mm). Pártela con «Partir» en el Estudio.');
      let m = caja(p.ancho, p.largo, p.g, p.r);
      if (p.batL > 0) m = m.subtract(caja(p.batA + 2 * ENCAJES.gira, p.batL + 2 * ENCAJES.gira, p.g + 2, 2).translate([0, 0, -1]));
      if (p.ag > 0) for (let x = -p.ancho / 2 + p.paso / 2; x <= p.ancho / 2 - p.paso / 2 + 0.01; x += p.paso) for (let y = -p.largo / 2 + p.paso / 2; y <= p.largo / 2 - p.paso / 2 + 0.01; y += p.paso) {
        if (p.batL > 0 && Math.abs(x) < p.batA / 2 + p.ag && Math.abs(y) < p.batL / 2 + p.ag) continue;
        m = m.subtract(cil(p.ag + 2 * ENCAJES.gira, p.g + 2, -1).translate([x, y, 0]));
      }
      if (p.aligerar) m = m.subtract(PT.agujeros2D('panal', p.ancho * 0.6, p.largo * 0.3, 10, 2.4, 7).intersect(rr(p.ancho * 0.6, p.largo * 0.3, 3)).extrude(p.g + 2).translate([0, p.largo * 0.3, -1]));
      return m;
    },
    nota: () => 'Base para hacer tu propio chasis: la rejilla de agujeros sirve para atornillar soportes, servos y la electrónica. Si es más grande que tu cama, pártela en el Estudio con «Partir» (conector de cola de milano).' },
  llantaRC: { cat: 'rc', e: '🛞', t: 'Llanta RC', d: '1.9", 2.2", 2.8", 3.8" o a medida', uso: 'pieza', color: '#e2231a',
    campos: [s('talla', 'Talla (asiento del neumático)', '2.2', [['1.9', '1.9" (48,3 mm)'], ['2.2', '2.2" (55,9 mm)'], ['2.8', '2.8" (71,1 mm)'], ['3.8', '3.8" (96,5 mm)'], ['medida', 'A medida']]), n('asiento', 'Asiento a medida (diámetro)', 52, 30, 150, 0.1), n('ancho', 'Ancho', 30, 12, 80),
      s('radios', 'Diseño', 'r6', [['r5', '5 radios'], ['r6', '6 radios'], ['estrella', 'Estrella (radios dobles)'], ['malla', 'Malla de panal'], ['disco', 'Disco con agujeros'], ['beadlock', 'Estilo crawler (anillo con tornillos)']]),
      s('hex', 'Hexágono', '12', [['12', '12 mm (1/10)'], ['14', '14 mm'], ['17', '17 mm (1/8)'], ['medida', 'A medida']]), n('hexM', 'Hexágono a medida (entre caras)', 12, 5, 30, 0.1),
      n('buje', 'Grosor del centro (más = rueda más hacia fuera)', 8, 4, 40, 0.5), n('eje', 'Tornillo de la tuerca de rueda', 4, 2, 8, 0.1),
      c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (anillo del asiento + centro con el hexágono, 2–3 g)', false)],
    gen(p) {
      const S = p.talla === 'medida' ? p.asiento : Number(p.talla) * 25.4, R = S / 2, W = p.ancho, ri = R - 2, L = 1.2, t = 3.2;
      if (p.prueba) { // antes de gastar 15 g: ¿entra el neumático en el asiento y la llanta en el hexágono del coche?
        const hx0 = p.hex === 'medida' ? p.hexM : Number(p.hex), anillo = CS().ofPolygons([N.ccw([[R - 1.2, 0], [R + L, 0], [R + L, 1.2], [R, 1.2 + L], [R, 3.6], [R - 1.2, 3.6]])]).revolve(seg(S) * 2);
        const centro = cil(hx0 / 0.866025 + 4, 4.2).subtract(N.cs([N.poligono2(6, (hx0 + 2 * ENCAJES.justo) / 0.866025, 0)], 'Positive').extrude(4).translate([0, 0, 1.2])).subtract(cil(p.eje + 0.3, 8, -1));
        return anillo.add(centro);
      }
      const hx = p.hex === 'medida' ? p.hexM : Number(p.hex), dHub = hx / 0.866025 + 6;
      if (p.buje > W - 1) N.mal('El centro no puede ser más grueso que la llanta (' + n2(W) + ' mm).');
      if (dHub > 2 * ri - 6) N.mal('El hexágono no cabe en una llanta tan pequeña.');
      let m = CS().ofPolygons([N.ccw([[ri, 0], [R + L, 0], [R + L, 1.2], [R, 1.2 + L], [R, W - 1.2 - L], [R + L, W - 1.2], [R + L, W], [ri, W]])]).revolve(seg(S) * 2);
      const zona = circ(2 * ri + 1).subtract(circ(dHub - 1)), barra = (a, w1, w2, fin) => M().hull([cil(w1, t).translate([dHub / 2, 0, 0]), cil(w2, t).translate([fin, 0, 0])]).rotate([0, 0, a]);
      let rad;
      if (p.radios === 'r5' || p.radios === 'r6' || p.radios === 'beadlock') { const k = p.radios === 'r5' ? 5 : 6; rad = N.union([...Array(k)].map((_, i) => barra(i * 360 / k, 5, S / 8, ri - 1))); }
      else if (p.radios === 'estrella') { const L2 = []; for (let i = 0; i < 5; i++) [-1, 1].forEach(sg => L2.push(M().hull([cil(4.5, t).translate([dHub / 2, 0, 0]), cil(4, t).translate([(ri - 1) * Math.cos(sg * 0.24), (ri - 1) * Math.sin(sg * 0.24), 0])]).rotate([0, 0, i * 72]))); rad = N.union(L2); }
      else if (p.radios === 'malla') rad = zona.subtract(PT.agujeros2D('panal', 2 * ri, 2 * ri, Math.max(6, S / 8), 2.2, 3).intersect(circ(2 * ri - 5)).subtract(circ(dHub + 5))).extrude(t);
      else { let d0 = zona; const k = 8, r0 = (dHub / 2 + ri) / 2, dh = Math.min((ri - dHub / 2) * 0.6, 2 * Math.PI * r0 / k * 0.6); for (let i = 0; i < k; i++) d0 = d0.subtract(circ(dh).translate([r0 * Math.cos(i * 2 * Math.PI / k), r0 * Math.sin(i * 2 * Math.PI / k)])); rad = d0.extrude(t); }
      m = m.add(rad.intersect(zona.extrude(t))).add(cil(dHub, p.buje));
      if (p.radios === 'beadlock') { let aro = circ(2 * (R + L + 1.8)).subtract(circ(2 * (R - 2.5))).extrude(2.4); for (let i = 0; i < 12; i++) aro = aro.subtract(cil(1.7, 3, -0.3).translate([(R + 0.3) * Math.cos(i * Math.PI / 6), (R + 0.3) * Math.sin(i * Math.PI / 6), 0])); m = m.add(aro); }
      const pocket = N.cs([N.poligono2(6, (hx + 2 * ENCAJES.justo) / 0.866025, 0)], 'Positive').extrude(p.buje).translate([0, 0, 2]);
      return m.subtract(pocket).subtract(cil(p.eje + 0.3, p.buje + 2, -1));
    },
    nota: p => { const S = p.talla === 'medida' ? p.asiento : Number(p.talla) * 25.4; if (p.prueba) return 'PRUEBA DE ENCAJE: mete el talón de TU neumático en el anillo (debe entrar justo, sin holgura) y el centro en el hexágono de TU coche (debe entrar sin bailar). Si algo no encaja, cambia «Asiento a medida» o «Hexágono a medida» y repite la prueba antes de imprimir la llanta entera.'; return 'Antes de la llanta entera, imprime la «🧪 prueba de encaje» (2–3 g). Asiento del neumático: ' + n2(S) + ' mm (para el neumático de la MISMA talla). Imprime con la cara de los radios en la cama (sin soportes), 4 paredes; en PETG o nailon aguanta los golpes. El hueco del hexágono lleva tu holgura «encaja» (0,10 por cara).' + (p.radios === 'beadlock' ? ' El anillo con tornillos es decorativo (estilo crawler).' : ''); } },
  neumaticoRC: { cat: 'rc', e: '⚫', t: 'Neumático RC (TPU)', d: 'Tacos, bloques, barras, chevron, rayas o liso', uso: 'flexible', color: '#2b2b2b',
    campos: [s('talla', 'Talla (la de la llanta)', '2.2', [['1.9', '1.9" (48,3 mm)'], ['2.2', '2.2" (55,9 mm)'], ['2.8', '2.8" (71,1 mm)'], ['3.8', '3.8" (96,5 mm)'], ['medida', 'A medida']]), n('asiento', 'Asiento a medida (diámetro)', 52, 30, 150, 0.1), n('ancho', 'Ancho de la llanta', 30, 12, 80), n('alto', 'Alto del neumático (de la llanta al suelo)', 14, 5, 50, 0.5),
      s('dibujo', 'Dibujo', 'tacos', [['tacos', 'Tacos (pinchos): tierra'], ['bloques', 'Bloques: todo terreno'], ['barras', 'Barras: barro y arena'], ['chevron', 'Chevron (en V): tracción'], ['rayas', 'Rayas: asfalto mojado'], ['slick', 'Liso (slick): asfalto']]), n('prof', 'Profundidad del dibujo', 2.5, 0, 6, 0.1)],
    gen(p) {
      const S = p.talla === 'medida' ? p.asiento : Number(p.talla) * 25.4, R = S / 2 - 0.3, W = p.ancho - 2.6, pr = p.dibujo === 'slick' ? 0 : p.prof, Ro = S / 2 + p.alto - pr, rc = Math.min(4, (Ro - R) / 2.5, W / 4);
      if (W < 6) N.mal('La llanta es demasiado estrecha.');
      const P = [[R, 0], [Ro - rc, 0]]; for (let i = 1; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 16; P.push([Ro - rc + rc * Math.cos(a), rc + rc * Math.sin(a)]); }
      P.push([Ro, rc], [Ro, W - rc]); for (let i = 1; i < 8; i++) { const a = i * Math.PI / 16; P.push([Ro - rc + rc * Math.cos(a), W - rc + rc * Math.sin(a)]); } P.push([Ro - rc, W], [R, W]);
      let m = CS().ofPolygons([N.ccw(P)]).revolve(seg(2 * Ro) * 2);
      if (!pr) return m;
      const prof = pr + 3, pieza = (w, h, ang, z) => { let b = caja(w, prof, h).translate([0, 0, -h / 2]); if (ang) b = b.rotate([0, ang, 0]); return b.translate([0, Ro - 3 + prof / 2, z]); };
      const L = [], vuelta = (n, f) => { for (let i = 0; i < n; i++) f(i, i * 360 / n); }, Hb = W - rc;
      if (p.dibujo === 'tacos') { const filas = Math.max(2, Math.floor(Hb / 6)), n = Math.max(12, Math.round(2 * Math.PI * Ro / 7)); for (let f = 0; f < filas; f++) vuelta(n, (i, a) => L.push(pieza(3.2, 3.2, 0, rc / 2 + (f + 0.5) * Hb / filas).rotate([0, 0, a + (f % 2) * 180 / n]))); }
      if (p.dibujo === 'bloques') { const n = Math.max(10, Math.round(2 * Math.PI * Ro / 11)); [0.27, 0.73].forEach((zz, f) => vuelta(n, (i, a) => L.push(pieza(7, Math.min(6, W * 0.32), 0, W * zz).rotate([0, 0, a + f * 180 / n])))); }
      if (p.dibujo === 'barras') { const n = Math.max(10, Math.round(2 * Math.PI * Ro / 9)); [0.27, 0.73].forEach((zz, f) => vuelta(n, (i, a) => L.push(pieza(3.5, W * 0.46, 0, W * zz).rotate([0, 0, a + f * 180 / n])))); }
      if (p.dibujo === 'chevron') { const n = Math.max(10, Math.round(2 * Math.PI * Ro / 10)); vuelta(n, (i, a) => [-1, 1].forEach(sg => L.push(pieza(3.2, W * 0.5, sg * 35, W / 2 + sg * W * 0.2).rotate([0, 0, a])))); }
      if (p.dibujo === 'rayas') { const k = Math.max(2, Math.floor(W / 6)); for (let i = 0; i < k; i++) L.push(CS().ofPolygons([N.ccw([[Ro - 1, 0], [Ro + pr, 0], [Ro + pr, 2.4], [Ro - 1, 2.4]])]).revolve(seg(2 * Ro) * 2).translate([0, 0, rc / 2 + (i + 0.5) * Hb / k - 1.2])); }
      return m.add(N.union(L).intersect(cil(2 * (Ro + pr + 1), W)));
    },
    nota: () => 'Imprímelo en TPU 95A tumbado, con 2 paredes y relleno giroide del 15–20 %: el relleno hace de «espuma» y queda blando. Velocidad lenta (TPU). Se pega a la llanta con pegamento instantáneo en los dos talones.' },
  adaptadorHex: { cat: 'rc', e: '🔁', t: 'Adaptador de hexágono', d: 'Ruedas de 17 mm en un coche de 12, etc.', uso: 'pieza', color: '#e2231a',
    campos: [n('hexIn', 'Hexágono del coche (entre caras)', 12, 5, 24, 0.1), n('fondo', 'Grosor del hexágono del coche', 5, 2, 15, 0.1), n('hexOut', 'Hexágono de la rueda (entre caras)', 17, 8, 30, 0.1), n('extra', 'Cuánto saca la rueda hacia fuera', 3, 0, 30, 0.5), n('eje', 'Agujero para el tornillo', 4, 2, 8, 0.1)],
    gen(p) {
      if (p.hexOut < p.hexIn + 3) N.mal('Para el mismo hexágono (ensanchar) usa «Hexágono de rueda» con más grosor: entra en la rueda y saca la rueda hacia fuera.');
      const alto = 2 + p.extra + p.fondo;
      return N.cs([N.poligono2(6, (p.hexOut - 2 * ENCAJES.justo) / 0.866025, 0)], 'Positive').extrude(alto)
        .subtract(N.cs([N.poligono2(6, (p.hexIn + 2 * ENCAJES.justo) / 0.866025, 0)], 'Positive').extrude(p.fondo + 1).translate([0, 0, alto - p.fondo]))
        .subtract(cil(p.eje + 0.3, alto + 2, -1));
    },
    nota: p => 'Necesitarás un tornillo o espárrago ' + n2(2 + p.extra) + ' mm más largo. Imprime con el hueco hacia arriba (sin soportes), en PETG o nailon.' },
  mangueta: { cat: 'rc', e: '🦿', t: 'Mangueta de dirección', d: 'Con rodamientos, pivotes y brazo de dirección', uso: 'pieza', color: '#e2231a',
    campos: [s('rod', 'Rodamientos de la rueda', '5x11x4', [['5x10x4', '5 × 10 × 4'], ['5x11x4', '5 × 11 × 4'], ['6x10x3', '6 × 10 × 3'], ['8x12x3.5', '8 × 12 × 3,5'], ['10x15x4', '10 × 15 × 4']]), n('alto', 'Alto (entre las caras de arriba y abajo)', 26, 16, 60), n('pin', 'Tornillo de los pivotes', 3, 2, 5, 0.1), n('brazo', 'Largo del brazo de dirección', 14, 6, 40), n('ack', 'Ángulo Ackermann (hacia dentro)', 10, 0, 30, 1, '°'), n('rotula', 'Agujero de la rótula (para roscar)', 2.6, 1.5, 5, 0.1), s('lado', 'Cuáles', 'par', [['par', 'Las dos (izquierda y derecha)'], ['der', 'Solo la derecha'], ['izq', 'Solo la izquierda']])],
    gen(p) {
      const [di, de, bw] = p.rod.split('x').map(Number), Lb = 2 * bw + 3, oR = de / 2 + 2.6, eLen = 11, wX = 2 * oR, A = p.alto;
      const yz = CS().ofPolygons([N.ccw([[-Lb / 2 - eLen, -A / 2], [Lb / 2, -A / 2], [Lb / 2, A / 2], [-Lb / 2 - eLen, A / 2]])]).subtract(rr(eLen + 2, A - 8).translate([-Lb / 2 - eLen / 2 - 1, 0]));
      let m = yz.extrude(wX).translate([0, 0, -wX / 2]).rotate([90, 0, 90]);
      const porY = (d, y0, l) => cil(d, l).rotate([-90, 0, 0]).translate([0, y0, 0]);
      m = m.subtract(porY(de + 2 * ENCAJES.presion, Lb / 2 - bw, bw + 1)).subtract(porY(de + 2 * ENCAJES.presion, -Lb / 2 - 1, bw + 1)).subtract(porY(di + 1, -Lb, 2 * Lb));
      const yk = -Lb / 2 - eLen + 4.5;
      m = m.add(cil(9, 4, A / 2 - 4).translate([0, yk, 0]).add(cil(9, 4, -A / 2).translate([0, yk, 0])));
      const ak = p.ack * Math.PI / 180, punta = [-p.brazo * Math.cos(ak), yk - p.brazo * Math.sin(ak)]; // hacia atrás y un poco hacia dentro
      m = m.add(M().hull([cil(8, 4, A / 2 - 4).translate([0, yk, 0]), cil(7.5, 4, A / 2 - 4).translate([punta[0], punta[1], 0])])).subtract(cil(p.rotula, 6, A / 2 - 5).translate([punta[0], punta[1], 0]));
      m = m.subtract(cil(p.pin + 2 * ENCAJES.gira, A + 2, -A / 2 - 1).translate([0, yk, 0]));
      const imp = x => x.rotate([90, 0, 0]);
      const der = imp(m), izq = imp(m.mirror([0, 1, 0]));
      if (p.lado === 'der') return der; if (p.lado === 'izq') return izq;
      return der.add(izq.translate([wX + A + 6, 0, 0]));
    },
    nota: p => 'Rodamientos ' + p.rod.replace(/x/g, ' × ') + ' a presión (tu holgura 0,05). Los pivotes son tornillos M' + n2(p.pin) + ' que atraviesan arriba y abajo. El brazo apunta hacia atrás con ' + Math.round(p.ack) + '° hacia dentro (Ackermann: la rueda de dentro gira más en las curvas). Se imprime con el agujero del eje en vertical, sin soportes, en PETG o nailon.' },
  balancines: { cat: 'rc', e: '🕹️', t: 'Dirección de balancines', d: 'Dos balancines y su barra (bellcrank)', uso: 'pieza', color: '#e2231a',
    campos: [n('sep', 'Separación entre los dos pivotes', 40, 15, 160), n('brazo', 'Brazo hacia la biela de la rueda', 14, 6, 40), n('brazoB', 'Brazo hacia la barra de unión', 12, 6, 40), n('servo', 'Brazo para el servo', 16, 6, 40), n('g', 'Grosor', 5, 3, 12, 0.5),
      s('pivote', 'Pivote', 'rod', [['rod', 'Rodamiento 5 × 10 × 4'], ['tornillo', 'Tornillo M3']]), n('rotula', 'Agujeros de rótulas (para roscar)', 2.6, 1.5, 5, 0.1)],
    gen(p) {
      const dB = p.pivote === 'rod' ? 14 : 8, pivote = p.pivote === 'rod' ? cil(10 + 2 * ENCAJES.presion, 5, p.g - 4).add(cil(6.5, p.g + 2, -1)) : cil(3 + 2 * ENCAJES.gira, p.g + 2, -1); // el rodamiento apoya en un escalón
      if (p.pivote === 'rod' && p.g < 4) N.mal('Para el rodamiento hace falta un grosor de 4 mm o más.');
      const brazo = (x, y) => M().hull([cil(dB, p.g), cil(7, p.g).translate([x, y, 0])]).subtract(cil(p.rotula, p.g + 2, -1).translate([x, y, 0]));
      const balancin = (sg, conServo) => { let b = N.union([brazo(sg * p.brazo, 0), brazo(0, -p.brazoB)].concat(conServo ? [brazo(0, p.servo)] : [])); return b.subtract(pivote); };
      const barra = M().hull([cil(7, p.g), cil(7, p.g).translate([p.sep, 0, 0])]).subtract(cil(p.rotula + 0.6, p.g + 2, -1)).subtract(cil(p.rotula + 0.6, p.g + 2, -1).translate([p.sep, 0, 0]));
      return N.union([balancin(-1, true), balancin(1, false).translate([p.brazo * 2 + dB + 6, 0, 0]), barra.translate([-p.sep / 2 + p.brazo + dB / 2 + 3, -(p.brazoB + 14), 0])]);
    },
    nota: p => 'Montaje: los dos balancines atornillados al chasis a ' + n2(p.sep) + ' mm; la barra de unión une los dos brazos cortos (queda un paralelogramo: las dos ruedas giran igual) y el servo empuja el brazo largo del izquierdo. En los agujeros pequeños van rótulas de bola M3 (se roscan solas). PETG o nailon.' },
  bielaRotula: { cat: 'rc', e: '🔗', t: 'Bielas y rótulas', d: 'Para bolas de 5,8 mm o a medida', uso: 'pieza', color: '#e2231a',
    campos: [n('bola', 'Diámetro de la bola', 5.8, 3, 10, 0.1), s('tipo', 'Qué', 'biela', [['biela', 'Biela entera (dos rótulas)'], ['cazoleta', 'Rótulas sueltas para varilla M3']]), n('largo', 'Largo de la biela (de centro a centro)', 40, 15, 150), n('n', 'Cuántas', 2, 1, 8, 1, '')],
    gen(p) {
      const b = p.bola, od = b + 3.4, h = b + 1.8, cav = M().sphere((b + 0.1) / 2, 32).translate([0, 0, h / 2]);
      const cazo = () => cil(od, h).subtract(cav).subtract(cil(b * 0.82, h, h / 2));
      const una = p.tipo === 'biela'
        ? N.union([cazo(), cazo().translate([p.largo, 0, 0]), caja(p.largo - od + 1, 4.5, 4.5).translate([p.largo / 2, 0, h / 2 - 2.25])])
        : cazo().add(cil(6, 7, 0).rotate([0, 90, 0]).translate([od / 2 - 1, 0, h / 2]).intersect(caja(40, 40, h))).subtract(cil(2.5, 9, 0).rotate([0, 90, 0]).translate([od / 2 - 1, 0, h / 2]));
      const paso = (p.tipo === 'biela' ? od + 3 : od + 11), k = Math.round(p.n);
      return N.union([...Array(k)].map((_, i) => una.translate([0, i * paso, 0])));
    },
    nota: () => 'La bola entra a presión por arriba (el agujero es más estrecho que la bola). Imprime con la abertura hacia arriba, en PETG o nailon (el PLA se parte al meter la bola). Las sueltas llevan agujero de 2,5 mm para roscar varilla M3.' },
  tornillo: { cat: 'componentes', e: '🔩', t: 'Agujero de tornillo', d: 'M2 a M8, avellanado o recto', uso: 'pieza', hueco: true, color: '#ff4d6d',
    campos: [s('m', 'Métrica', '3', [['2', 'M2'], ['2.5', 'M2,5'], ['3', 'M3'], ['4', 'M4'], ['5', 'M5'], ['6', 'M6'], ['8', 'M8']]), n('largo', 'Profundidad', 15, 2, 100), s('cabeza', 'Cabeza', 'avellanada', [['avellanada', 'Avellanada (plana)'], ['alomada', 'Cilíndrica (Allen)'], ['ninguna', 'Sin cabeza']])],
    gen(p) { const d = Number(p.m); let m = cil(d + 0.4, p.largo + 0.01); if (p.cabeza === 'avellanada') m = m.add(M().cylinder(d * 1.1, d / 2 + 0.2, d + 0.3, 32).translate([0, 0, p.largo - d * 1.1 + 0.01])); if (p.cabeza === 'alomada') m = m.add(cil(d * 1.75 + 0.6, d + 1, p.largo - 0.01)); return m; },
    nota: () => 'Es un HUECO: ponlo donde quieras el tornillo (la cabeza queda arriba). Agujero = métrica + 0,4 mm para que pase.' },
  tuerca: { cat: 'componentes', e: '⬡', t: 'Alojamiento de tuerca', d: 'Hexagonal, medidas ISO', uso: 'pieza', hueco: true, color: '#ff4d6d',
    campos: [s('m', 'Métrica', '3', [['2', 'M2'], ['2.5', 'M2,5'], ['3', 'M3'], ['4', 'M4'], ['5', 'M5'], ['6', 'M6'], ['8', 'M8']]), c('pasante', 'Con el agujero del tornillo', true), n('largo', 'Largo del agujero', 15, 2, 100)],
    gen(p) { const T = { 2: [4, 1.6], 2.5: [5, 2], 3: [5.5, 2.4], 4: [7, 3.2], 5: [8, 4], 6: [10, 5], 8: [13, 6.5] }[p.m], hol = ENCAJES.gira; let m = N.cs([N.poligono2(6, (T[0] + 2 * hol) / 0.866, 0)], 'Positive').extrude(T[1] + 0.3); if (p.pasante) m = m.add(cil(Number(p.m) + 0.4, p.largo).translate([0, 0, -p.largo + T[1]])); return m; },
    nota: () => 'Medidas de tuerca ISO 4032 (entre caras) con tu holgura «gira». La tuerca entra por arriba.' },
  inserto: { cat: 'componentes', e: '🔥', t: 'Agujero para inserto roscado', d: 'Insertos de latón a calor', uso: 'pieza', hueco: true, color: '#ff4d6d',
    campos: [s('m', 'Inserto', '3', [['2', 'M2 (agujero 3,2)'], ['2.5', 'M2,5 (3,6)'], ['3', 'M3 (4,0)'], ['4', 'M4 (5,6)'], ['5', 'M5 (6,4)']]), n('largo', 'Profundidad', 6, 3, 15, 0.5)],
    gen(p) { const d = { 2: 3.2, 2.5: 3.6, 3: 4, 4: 5.6, 5: 6.4 }[p.m]; return cil(d, p.largo).add(M().cylinder(0.6, d / 2, d / 2 + 0.4, 32).translate([0, 0, p.largo - 0.6])); },
    nota: () => 'Los agujeros son los MÁS COMUNES para insertos cortos; cada marca da el suyo en su ficha. ESTIMADO: compruébalo con los tuyos.' },
  iman: { cat: 'componentes', e: '🧲', t: 'Hueco para imán', d: 'Redondo, a presión', uso: 'pieza', hueco: true, color: '#ff4d6d',
    campos: [n('d', 'Diámetro del imán', 6, 2, 30, 0.5), n('h', 'Grosor del imán', 3, 1, 10, 0.5), s('encaje', 'Encaje', 'justo', [['presion', 'A presión'], ['justo', 'Justo (con gota de pegamento)']])],
    gen(p) { return cil(p.d + 2 * (ENCAJES[p.encaje] ?? ENCAJES.justo), p.h + 0.2); } },
  rodamiento: { cat: 'componentes', e: '⚙️', t: 'Alojamiento de rodamiento', d: '608, 625, 6000…', uso: 'pieza', hueco: true, color: '#ff4d6d',
    campos: [s('r', 'Rodamiento', '608', [['608', '608 (22 × 8 × 7)'], ['625', '625 (16 × 5 × 5)'], ['6000', '6000 (26 × 10 × 8)'], ['688', '688 (16 × 8 × 5)']]), c('eje', 'Con agujero para el eje', true)],
    gen(p) { const R = { 608: [22, 8, 7], 625: [16, 5, 5], 6000: [26, 10, 8], 688: [16, 8, 5] }[p.r]; let m = cil(R[0] + 2 * ENCAJES.presion, R[2] + 0.1); if (p.eje) m = m.add(cil(R[1] + 3, 30, -30)); return m; } },
  colgar: { cat: 'componentes', e: '🔐', t: 'Ojal para colgar', d: 'Ranura tipo cerradura', uso: 'pieza', hueco: true, color: '#ff4d6d',
    campos: [n('cabeza', 'Cabeza del tornillo', 8, 5, 14, 0.5), n('cana', 'Caña del tornillo', 4, 2.5, 7, 0.5), n('fondo', 'Profundidad', 6, 4, 15, 0.5)],
    gen(p) { const t = p.cabeza + 0.6, c2 = p.cana + 0.6; return cil(t, p.fondo).add(caja(c2, 12, p.fondo).translate([0, 6, 0])).add(caja(t, 12, p.fondo - 2.4).translate([0, 6, 0])); } },
  patronHuecos: { cat: 'componentes', e: '✴️', t: 'Calado (para restar)', d: 'Pon un patrón en cualquier cara', uso: 'pieza', hueco: true, color: '#ff4d6d',
    campos: [s('patron', 'Calado', 'panal', PAT), n('w', 'Ancho de la zona', 60, 10, 250), n('h', 'Alto de la zona', 40, 10, 250), n('celda', 'Tamaño del dibujo', 10, 3, 40), n('puente', 'Nervios', 2, 0.8, 8, 0.2), n('fondo', 'Profundidad', 10, 0.4, 100), n('semilla', 'Variante', 7, 1, 99, 1, '')],
    gen(p) { return PT.agujeros2D(p.patron, p.w, p.h, p.celda, p.puente, p.semilla).intersect(rr(p.w, p.h, 2)).extrude(p.fondo); },
    nota: () => 'Es un HUECO con forma de patrón: colócalo sobre la cara que quieras calar (gíralo 90° para una pared) y se resta solo.' },
  roscaBote: { cat: 'componentes', e: '🌀', t: 'Rosca (tornillo o tuerca)', d: 'Macho o hembra, a medida', uso: 'pieza', color: '#7c6cff',
    campos: [n('d', 'Diámetro', 30, 6, 200), n('paso', 'Paso', 3, 0.8, 10, 0.1), n('h', 'Largo', 12, 2, 150), c('hembra', 'Hembra (márcala como HUECO para restarla)', false)],
    gen(p) { return N.rosca(p.d, p.paso, p.h, p.hembra); }, nota: () => 'Rosca redonda (como la de los botes), fácil de imprimir. La hembra lleva tu holgura «gira» + 0,1.' },
  anilla: { cat: 'componentes', e: '⭕', t: 'Anilla de llavero', d: 'Para añadir a cualquier pieza', uso: 'pieza', color: '#7c6cff',
    campos: [n('d', 'Diámetro de fuera', 10, 6, 30, 0.5), n('agujero', 'Agujero', 4.5, 2, 20, 0.5), n('h', 'Grosor', 2.4, 1, 8, 0.2)],
    gen(p) { return N.forma3d('tubo', { d: p.d, interior: p.agujero, h: p.h }); } }
};
// ---------- v20 · ayudas para piezas mecánicas y de RC ----------
// paso RC → módulo: 48 dientes por pulgada de diámetro primitivo = 25,4 / 48 mm por diente (mismo cálculo para 32P)
function moduloRC(paso) { if (/P$/.test(paso)) return 25.4 / Number(paso.slice(0, -1)); return Number(String(paso).replace('m', '')); }
// agujero para la salida o el eje: hexágono (entre caras), eje en D (plano a «plano» mm del otro lado) o redondo, con holgura
function salidaEje(forma, medida, hol, alto, plano) {
  if (forma === 'hex') return N.cs([N.poligono2(6, (medida + 2 * hol) / 0.866025, 0)], 'Positive').extrude(alto);
  const d = medida + 2 * hol, c = cil(d, alto);
  if (forma !== 'd') return c;
  const P = Math.min(d, (plano || medida * 0.8) + 2 * hol);
  return c.intersect(caja(d + 2, P + 1, alto).translate([0, d / 2 - P / 2 + 0.5, 0]));
}
// piñón cónico recto (ejes a 90°): el perfil de evolvente de la cara grande se estrecha hacia el vértice del cono
// (todos los dientes apuntan al mismo punto, como en un diferencial de verdad). Aproximación de Tredgold sin corregir
// la curvatura: con el juego de impresión engrana bien.
function conico(z, zPareja, m, ancho, juego) {
  const delta = Math.atan(z / zPareja), rp = m * z / 2, A = rp / Math.sin(delta), b = Math.min(ancho, A / 3), k = (A - b) / A, alto = b * Math.cos(delta);
  let perfil = N.cs([N.ccw(perfilEngranaje(z, m))], 'Positive');
  if (juego > 0) perfil = perfil.offset(-juego / 2, 'Round', 2, 16);
  return { m: perfil.extrude(alto, Math.max(4, Math.round(alto * 2)), 0, [k, k]), alto, dExt: m * (z + 2), dRaiz: m * (z - 2.5) };
}
// ---------- ayudas de los diseños de arriba ----------
function azarS(s) { return PT.azar(s); }
// un hueco con perfil escalonado: L = [[z, ancho, radio], …] (Gridfinity)
function cajon(lado, r, L) { const P = []; for (let i = 0; i < L.length - 1; i++) { const [z0, w0, r0] = L[i], [z1, w1, r1] = L[i + 1]; P.push(M().hull([rr(w0, w0, r0).extrude(0.01).translate([0, 0, z0]), rr(w1, w1, r1).extrude(0.01).translate([0, 0, z1 - 0.01])])); } void lado; void r; return N.union(P); }
function gridfinity(p) {
  const ux = Math.round(p.ux), uy = Math.round(p.uy), W = 42 * ux - 0.5, D = 42 * uy - 0.5, H = 7 * Math.round(p.uz);
  const pie = cajon(41.5, 3.75, [[0, 35.6, 0.8], [0.8, 37.2, 1.6], [2.6, 37.2, 1.6], [4.75, 41.5, 3.75]]), L = [];
  for (let i = 0; i < ux; i++) for (let j = 0; j < uy; j++) { let f = pie.translate([-42 * ux / 2 + 21 + 42 * i, -42 * uy / 2 + 21 + 42 * j, 0]); if (p.imanes) [[-13, -13], [13, -13], [13, 13], [-13, 13]].forEach(([a, b]) => { f = f.subtract(cil(6.5, 2.4, -0.01).translate([-42 * ux / 2 + 21 + 42 * i + a, -42 * uy / 2 + 21 + 42 * j + b, 0])); }); L.push(f); }
  let m = N.union(L).add(rr(W, D, 3.75).extrude(H - 4.75).translate([0, 0, 4.75]));
  const suelo = 6.2, pared = 1.2, dentro = rr(W - 2 * pared, D - 2 * pared, 2.6).extrude(H).translate([0, 0, suelo]); let hueco = dentro;
  if (p.divx > 0) { const sep = []; for (let k = 1; k <= p.divx; k++) sep.push(caja(1.2, D, H).translate([-W / 2 + W * k / (p.divx + 1), 0, suelo])); hueco = hueco.subtract(N.union(sep)); }
  m = m.subtract(hueco);
  if (p.etiqueta) m = m.add(M().hull([caja(W - 2 * pared, 12, 1).translate([0, D / 2 - pared - 6, H - 1]), caja(W - 2 * pared, 0.5, 1).translate([0, D / 2 - pared - 0.25, H - 12])]));
  return m;
}
// icosaedro (para el balón): las 12 direcciones de sus vértices
function ico() { const t = (1 + Math.sqrt(5)) / 2; return [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(v => { const l = Math.hypot(...v); return v.map(x => x / l); }); }
// ángulos que llevan +Z a la dirección v (para Manifold.rotate)
function aDir(v) { const ry = Math.atan2(Math.hypot(v[0], v[1]), v[2]) * 180 / Math.PI, rz = Math.atan2(v[1], v[0]) * 180 / Math.PI; return [0, ry, rz]; }

// ---------- para el Estudio y la pantalla del catálogo ----------
export const valores = k => Object.fromEntries((DISENOS[k].campos || []).map(x => [x.k, x.v]));
export const especDe = k => (DISENOS[k].campos || []).map(x => (x.ops ? { k: x.k, t: x.t, ops: x.ops } : x.chk ? { k: x.k, t: x.t, chk: 1 } : x.txt ? { k: x.k, t: x.t, txt: 1, ayuda: x.ayuda } : { k: x.k, t: x.t, min: x.min, max: x.max, paso: x.paso, u: x.u }));
export function genera(k, p) { const D = DISENOS[k]; if (!D) N.mal('No encuentro ese diseño.'); const v = Object.assign(valores(k), p || {}); const m = D.gen(v); if (!m || m.isEmpty()) N.mal('Con esas medidas no sale la pieza.'); return N.aLaCama(m); }
Object.keys(DISENOS).forEach(k => registrar(k, p => genera(k, p)));
export const porCategoria = cat => Object.entries(DISENOS).filter(([, d]) => !cat || d.cat === cat);
void ico; void movil; void MATERIAL;
