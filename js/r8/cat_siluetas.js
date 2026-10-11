// ================= v30.3 · 🖼️ SILUETAS Y CUADROS con dibujos de DOMINIO PÚBLICO (Openclipart, CC0) =================
// La dueña (11-10-2026): «si no sabes dibujar, coge dibujos de otros… las mejores, las más tops» → solo DOMINIO PÚBLICO (se pueden
// vender): siluetas_cc0.js (28 elegidas a ojo entre 78). Aquí se convierten en piezas: de pared, de pie con peana, en un MARCO del
// que se salen o en un círculo, y el ÁRBOL CON PAREJA. Las hojas sueltas se juntan (lo que está a menos de 0,8 mm) para que salga de
// una pieza; las motas se quitan.
import * as N from './nucleo.js';
import { SILUETAS, FUENTE } from './siluetas_cc0.js';
import { circulo, rectR } from './motor.js';

const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const tx = (k, t, v, ayuda) => ({ k, t, v, txt: 1, ayuda });
const CS = () => N.CSX();
const rr = (w, h, r = 0) => N.cs([N.ccw(rectR(w, h, r))], 'Positive');
const circ = d => N.cs([N.ccw(circulo(d / 2, 0, 0, Math.max(48, Math.round(d * 1.5))))], 'Positive');
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const GRUPOS = { gatos: '🐈', mariposas: '🦋', arboles: '🌳', parejas: '💑', navidad: '🎄', perros: '🐕', personas: '👧', caballos: '🐎', ciervos: '🦌', flores: '🌸', mandalas: '🔆', baile: '🩰', musica: '🎷', deporte: '⚽', transporte: '✈️', ciudades: '🏙️', salvajes: '🦁', halloween: '🎃', bebes: '👶', mascotas: '🐾' };

// la silueta k con su LADO MÁS LARGO = lado (mm); origen abajo en el centro
export function silueta(k, lado, juntar = 0.8, unir = true) {
  const S0 = SILUETAS[k] || SILUETAS.gatoSentado, esc = lado / Math.max(100, S0.ancho);
  let cs = N.cs(S0.polys.map(q => q.map(([x, y]) => [x * esc, y * esc])), 'Positive');
  if (juntar > 0) cs = cs.offset(juntar, 'Round', 2, 16).offset(-juntar, 'Round', 2, 16); // lo que casi se toca, unido
  let P = cs.decompose(); if (P.length > 1) { const A = P.map(q => q.area()), am = Math.max(...A); P = P.filter((q, i) => A[i] >= am * 0.003); cs = CS().union(P); } // fuera motas
  // v30.4 · lo que mide menos de 0,9 mm de ancho (radios, crines, cuerdas) se engorda 0,25 mm por lado: así la boquilla de 0,4 lo hace
  try { const fino = cs.subtract(cs.offset(-0.45, 'Round').offset(0.45, 'Round')); if (!fino.isEmpty() && fino.area() > 0.5) cs = cs.add(fino.offset(0.25, 'Round')); } catch (e) { }
  // lo que queda suelto (la estrella del belén, la mariposa de la niña…) se une a lo grande con una varilla fina: sale de UNA pieza
  if (unir && P.length > 1) { P.sort((a, b) => b.area() - a.area()); let todo = P[0]; for (let i = 1; i < P.length; i++) { const A = todo.toPolygons().flat(), B = P[i].toPolygons().flat(); let mejor = null, md = Infinity; for (let a = 0; a < A.length; a += Math.max(1, Math.floor(A.length / 900))) for (const q of B) { const d = Math.hypot(A[a][0] - q[0], A[a][1] - q[1]); if (d < md) { md = d; mejor = [A[a], q]; } } if (mejor) { const [a, b] = mejor, w = Math.max(1.2, lado / 160); const varilla = CS().hull([circ(w).translate(a), circ(w).translate(b)]); todo = todo.add(P[i]).add(varilla); } } cs = todo; }
  return cs;
}
const opsSil = (grupos) => Object.entries(SILUETAS).filter(([, v]) => !grupos || grupos.includes(v.grupo)).map(([k, v]) => [k, (GRUPOS[v.grupo] || '') + ' ' + v.t]);
// la PLACA del texto: rectángulo redondeado (de una pieza con la figura) y las letras EN RELIEVE encima (+1 mm: otro color con la pausa)
function placaTexto(t, ancho, alto, grosor) { let T = N.centraCS(N.texto2(t, 'gorda', alto)); let bt = N.cajaCS(T); if (bt.w > ancho - 8) { T = T.scale([(ancho - 8) / bt.w, (ancho - 8) / bt.w]); bt = N.cajaCS(T); }
  const H = bt.h + 8, W = Math.max(bt.w + 12, ancho * 0.55); return { placa: rr(W, H, Math.min(4, H / 3)), letras: T, H, W }; }
function textoDebajo(t, ancho, alto) { let T = N.centraCS(N.texto2(t, 'gorda', alto)); const b = N.cajaCS(T); if (b.w > ancho) T = T.scale([ancho / b.w, ancho / b.w]); return T; }

function cuadroSilueta(p) {
  const L = p.lado, g = Math.max(2.4, p.marco);
  let fig = silueta(p.dibujo, L, 0.8, p.montaje !== 'pared'), b = N.cajaCS(fig);
  let pieza = fig;
  if (p.montaje === 'marco') { // marco más bajo que la figura: la figura se SALE por arriba (como en las fotos de decoración)
    const W = b.w * 1.12 + 2 * g, H = Math.max(b.h * 0.72, 30); const marco = rr(W, H, 1.5).subtract(rr(W - 2 * g, H - 2 * g, 0.5)).translate([0, H / 2 - 0.01]);
    pieza = marco.add(fig.translate([0, g - 0.6]));
  } else if (p.montaje === 'circulo') { /* la figura de pie sobre una barra (cuerda) unida al aro: así nunca queda suelta dentro */
    const D = Math.max(b.w * 1.18, b.h * 1.32) + 2 * g, Rc = D / 2 - g, yb = Rc * 0.42, cuerda = 2 * Math.sqrt(Math.max(1, Rc * Rc - (Rc - yb) * (Rc - yb))) + 2;
    const aro = circ(D).subtract(circ(D - 2 * g)).translate([0, D / 2 - g]), barra = rr(cuerda, g, 0).translate([0, yb - g / 2]);
    // (v30.4: si el dibujo solo roza la barra con una punta —un mandala, una estrella—, se hunde un poco más hasta que quede UNIDO)
    for (const hunde of [0.6, 1.6, 3, 5, 8]) { pieza = aro.add(barra).add(fig.translate([0, yb - hunde])); if (pieza.decompose().length === 1) break; }
    if (p.peana) pieza = pieza.add(rr(D * 0.45, 8, 1).translate([0, 4 - g * 0.3])); }
  else if (p.montaje === 'pie' || p.montaje === 'suelo') { const base = rr(b.w * 1.04, 8, 1).translate([0, 4 - 0.6]); pieza = fig.translate([0, 7.0]).add(base); /* la figura ENTRA 0,6 en su suelo (si solo lo toca, sale suelta); los 7 mm de abajo van dentro de la ranura de la peana */ }
  const t = String(p.texto || '').trim(); let letras = null;
  if (t) { b = N.cajaCS(pieza); const PL = placaTexto(t, Math.max(b.w * 0.8, 60), Math.max(7, L * 0.065), p.grosor), y = b.min[1] - PL.H / 2 + 1.2; pieza = pieza.add(PL.placa.translate([(b.min[0] + b.max[0]) / 2, y])); letras = PL.letras.translate([(b.min[0] + b.max[0]) / 2, y]); }
  let m = pieza.extrude(p.grosor); if (letras) m = m.add(letras.extrude(1.2).translate([0, 0, p.grosor - 0.2]));
  if (p.agujeros && (p.montaje === 'marco' || p.montaje === 'circulo')) { // en la barra de arriba del marco (o arriba del círculo)
    if (p.montaje === 'marco') { const W = b.w * 1.12 + 2 * g, H = Math.max(b.h * 0.72, 30); [-1, 1].forEach(sx => { m = m.subtract(N.MF().cylinder(p.grosor + 2, 1.7, 1.7, 24).translate([sx * (W / 2 - g / 2), H - g / 2, -1])); }); }
    else { const D = Math.max(b.w * 1.18, b.h * 1.32) + 2 * g; m = m.subtract(N.MF().cylinder(p.grosor + 2, 1.7, 1.7, 24).translate([0, D - 1.5 * g, -1])); } }
  if (p.montaje === 'pie' || p.montaje === 'suelo' || p.peana) m = m.add(peanaPara(m, p.grosor));
  return m;
}
// v30.4 · PEANA para ponerla de pie (la dueña: «a las figuras ponles una base si no pueden mantenerse de pie»): honda (16 % del
// alto, mínimo 24 mm), 11 mm de alta y ranura de 7 mm con 0,125 de holgura por lado. Va al lado, en la misma cama.
export function peanaPara(m, grosor) {
  const bb = N.caja(m), H = bb.max[1] - bb.min[1], Lb = bb.max[0] - bb.min[0] + 10, F = Math.max(24, H * 0.16), ran = grosor + 0.25;
  const pe = rr(Lb, F, 5).extrude(11).subtract(rr(Lb - 8, ran, 0.2).extrude(12).translate([0, 0, 4]));
  return pe.translate([(bb.min[0] + bb.max[0]) / 2, bb.min[1] - F / 2 - 6, 0]);
}
function arbolPareja(p) {
  const H = p.alto, arbol = silueta(p.arbol, H, 1.0), bA = N.cajaCS(arbol), alt = H * p.pareja / 100, par = silueta(p.quien, alt, 0.6), bP = N.cajaCS(par);
  const x = bA.max[0] - bP.w * 0.5 - bA.w * 0.08, suelo = rr(bA.w * 1.1 + bP.w * 0.4, 8, 1.5).translate([bA.w * 0.05, -1]);
  let pieza = arbol.translate([0, 2.5]).add(par.translate([x, 2.5])).add(suelo);
  const t = String(p.nombres || '').trim(); let letras = null;
  if (t) { const b = N.cajaCS(pieza), PL = placaTexto(t, b.w * 0.75, Math.max(8, H * 0.065), p.grosor), y = b.min[1] - PL.H / 2 + 1.2, cx = (b.min[0] + b.max[0]) / 2; pieza = pieza.add(PL.placa.translate([cx, y])); letras = PL.letras.translate([cx, y]); }
  let m = pieza.extrude(p.grosor); if (letras) m = m.add(letras.extrude(1.2).translate([0, 0, p.grosor - 0.2]));
  if (p.peana) m = m.add(peanaPara(m, p.grosor));
  return m;
}
const MONTAJES = [['pie', 'De pie, con peana'], ['marco', 'En un marco (se sale por arriba)'], ['circulo', 'Dentro de un círculo'], ['pared', 'Suelta, para la pared']];
const camposSil = (grupos, dib, montaje, lado) => [s('dibujo', 'Dibujo', dib, opsSil(grupos)), s('montaje', 'Cómo va', montaje, MONTAJES), n('lado', 'Tamaño (lado más largo)', lado, 60, 250, 1), n('grosor', 'Grosor', 3, 2, 6, 0.2), n('marco', 'Grosor del marco', 4, 2.4, 10, 0.2), tx('texto', 'Texto debajo (opcional)', '', 'Un nombre, una fecha…'), c('peana', 'Peana también en marco y círculo (de pie)', false), c('agujeros', 'Agujeros para colgar', true)];
// v30.4 · una sección del catálogo por tema, con sus dibujos de dominio público (las figuras, de pie con peana de serie)
function tema(cat, tambien, e, t, d, grupos, dib, montaje = 'pie', lado = 180) {
  return { cat, tambien, e, t, d, uso: 'deco', color: '#1b1b1f', nuevo: true, campos: camposSil(grupos, dib, montaje, lado), gen: p => cuadroSilueta(p),
    dosColores: p => String(p.texto || '').trim() ? { z: p.grosor, color: '#d4a017' } : null,
    nota: p => (p.montaje === 'pie' ? 'De pie: la silueta entra 7 mm en la ranura de su peana (va al lado, en la misma cama). ' : '') + 'Pieza plana, se imprime tumbada y sin soportes: negro mate o seda. ' + notaCC0(p.dibujo) };
}
// v30.4 · 🔆 MANDALA / FLOR EN RELIEVE sobre un disco (posavasos o cuadro), a dos colores con «cambio a mano»
function mandalaRelieve(p) {
  const D = p.d, fondo = p.base; let mand = silueta(p.dibujo, D - 2 * p.borde, 0.5, false); const b = N.cajaCS(mand); mand = mand.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]);
  let disco = circ(D); if (p.forma === 'hexagono') disco = N.cs([N.ccw(N.poligono2(6, D * 1.08, 90))], 'Positive');
  let m = disco.extrude(fondo).add(mand.intersect(disco.offset(-1)).extrude(p.relieve).translate([0, 0, fondo - 0.01]));
  if (p.borde > 0) m = m.add(disco.subtract(disco.offset(-Math.min(2, p.borde * 0.6))).extrude(p.relieve).translate([0, 0, fondo - 0.01]));
  if (p.colgar) m = m.subtract(N.MF().cylinder(fondo + p.relieve + 2, 2, 2, 32).translate([0, D / 2 - 6, -1]));
  return m;
}
const notaCC0 = k => { const S0 = SILUETAS[k]; return S0 ? 'Dibujo de dominio público: «' + S0.t + '» (' + S0.url + '), ' + FUENTE + ': se puede vender.' : ''; };

export const DISENOS_SILUETAS = {
  siluetaPared: { cat: 'cuadros', tambien: ['adultos', 'navidad', 'mascotas'], e: '🖼️', t: 'Silueta de decoración (28 dibujos top)', d: 'Gatos, mariposas, árboles, parejas, novios, renos, trineo, belén, perros… en marco, círculo, de pie o de pared', uso: 'deco', color: '#1b1b1f', nuevo: true,
    campos: [s('dibujo', 'Dibujo', 'gatoSalto', opsSil()), s('montaje', 'Cómo va', 'marco', [['marco', 'En un marco (se sale por arriba)'], ['circulo', 'Dentro de un círculo'], ['pared', 'Suelta, para la pared'], ['pie', 'De pie, con peana'], ['suelo', 'Con suelo (para estantería)']]), n('lado', 'Tamaño (lado más largo)', 200, 60, 250, 1), n('grosor', 'Grosor', 3, 2, 6, 0.2), n('marco', 'Grosor del marco', 4, 2.4, 10, 0.2), tx('texto', 'Texto debajo (opcional)', '', 'Un nombre, una fecha, «Home»…'), c('agujeros', 'Agujeros para colgar', true)],
    gen: p => cuadroSilueta(p), dosColores: p => String(p.texto || '').trim() ? { z: p.grosor, color: '#d4a017' } : null, nota: p => 'Pieza plana de ' + p.lado + ' mm: se imprime tumbada y sin soportes, en negro mate (o seda). ' + notaCC0(p.dibujo) },
  arbolPareja: { cat: 'cuadros', tambien: ['adultos', 'regalos'], e: '🌳', t: 'Árbol del amor (árbol + pareja + nombres)', d: 'Silueta de pie con peana: bodas, aniversarios, San Valentín', uso: 'deco', color: '#1b1b1f', nuevo: true,
    campos: [s('arbol', 'Árbol', 'arbolFrondoso', [['arbolFrondoso', 'Frondoso'], ['arbolRaices', 'Con raíces y columpio de ramas']]), s('quien', 'Pareja', 'parejaAbrazo', [['parejaAbrazo', 'Abrazados'], ['parejaBeso', 'Besándose'], ['parejaBoda', 'Novios (boda)'], ['parejaMano', 'De la mano']]), n('alto', 'Alto del árbol', 200, 100, 250, 1), n('pareja', 'Alto de la pareja (% del árbol)', 42, 25, 70, 1, '%'), n('grosor', 'Grosor', 3, 2, 5, 0.2), tx('nombres', 'Nombres o fecha (opcional)', 'Ana & Leo · 2026'), c('peana', 'Con peana (encaja la silueta)', true)],
    gen: p => arbolPareja(p), dosColores: p => String(p.nombres || '').trim() ? { z: p.grosor, color: '#d4a017' } : null, nota: p => 'Silueta de pie: imprime la figura en negro mate y la peana en blanco o madera; entra en la ranura (holgura 0,25). ' + notaCC0(p.arbol) + ' ' + notaCC0(p.quien) },
  // ---- v30.4 · SECCIONES POR TEMA (dibujos de dominio público, Openclipart CC0) ----
  silCaballos: tema('cuadros', ['adultos', 'regalos'], '🐎', 'Caballos (siluetas)', 'Encabritados, al galope, al trote, amazona, niña con su caballo…', ['caballos'], 'caballoEncabritado'),
  silCiervos: tema('cuadros', ['adultos', 'navidad'], '🦌', 'Ciervos y renos (siluetas)', 'Bramando, saltando, pareja en corazón…', ['ciervos', 'navidad'], 'ciervoBrama'),
  silFlores: tema('cuadros', ['adultos', 'hogar'], '🌸', 'Flores (siluetas)', 'Lotos, rosas, enredaderas y hojas', ['flores'], 'loto', 'pared', 160),
  silBaile: tema('cuadros', ['jovenes', 'regalos', 'ninos'], '🩰', 'Baile y música (siluetas)', 'Bailarinas, pareja de ballet, saxofonista, pianista, violín…', ['baile', 'musica'], 'bailarinaArabesco'),
  silDeporte: tema('jovenes', ['cuadros', 'regalos'], '⚽', 'Deporte (siluetas)', 'Fútbol, ciclismo, motocross y BMX', ['deporte'], 'futbolista'),
  silViajes: tema('cuadros', ['adultos', 'hogar'], '✈️', 'Viajes: aviones, barcos y ciudades', 'Galeón, velero, barco vikingo, avión, Torre Eiffel, Nueva York, corazón de rascacielos…', ['transporte', 'ciudades'], 'corazonCiudad'),
  silSalvajes: tema('cuadros', ['adultos', 'ninos'], '🦁', 'Animales salvajes (siluetas)', 'León, elefantes, jirafas, lobos…', ['salvajes'], 'jirafas'),
  silHalloween: tema('halloween', ['ninos', 'cuadros'], '🎃', 'Halloween (siluetas)', 'Calabazas talladas, brujas en escoba, gatos negros, murciélagos y casas encantadas', ['halloween'], 'brujaGato'),
  silBebes: tema('bebes', ['regalos', 'cuadros'], '👶', 'Comunión, bautizo y bebés (siluetas)', 'Angelito, cigüeña con bebé, cochecito, paloma, cruz labrada, mamá embarazada…', ['bebes'], 'ciguena'),
  silMascotas: tema('mascotas', ['cuadros', 'regalos'], '🐾', 'Mascotas (siluetas)', 'Gato con la cola en corazón, cachorro, chihuahua, conejos, loro…', ['mascotas', 'gatos', 'perros'], 'gatoCorazon'),
  mandalaRelieve: { cat: 'cuadros', tambien: ['adultos', 'hogar', 'regalos'], e: '🔆', t: 'Mandala en relieve (posavasos o cuadro)', d: 'Mandalas celtas, florales y de sol en relieve sobre un disco: a dos colores', uso: 'deco', color: '#1b1b1f', nuevo: true,
    campos: [s('dibujo', 'Mandala', 'mandalaCeltaA', opsSil(['mandalas', 'flores'])), s('forma', 'Forma', 'circulo', [['circulo', 'Redondo'], ['hexagono', 'Hexagonal']]), n('d', 'Diámetro', 100, 70, 250, 1), n('base', 'Grosor del disco', 2.4, 1.6, 5, 0.2), n('relieve', 'Relieve', 1.4, 0.8, 3, 0.2), n('borde', 'Margen', 5, 0, 15, 0.5), c('colgar', 'Agujero para colgar (cuadro)', false)],
    gen: p => mandalaRelieve(p), dosColores: p => ({ z: p.base, color: '#d4a017' }),
    nota: p => 'Se imprime tumbado y sin soportes. 🌈 Con «cambio a mano» a ' + n2(p.base) + ' mm: disco negro y mandala dorado (o al revés). De ' + p.d + ' mm es un posavasos (pon fieltro debajo); de 180 o más, un cuadro. ' + notaCC0(p.dibujo) }
};
