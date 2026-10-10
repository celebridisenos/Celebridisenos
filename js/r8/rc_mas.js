// ================= v20.2 · 🏎️ MÁS RC: estilos de diferencial, accesorios y repuestos =================
// La dueña (10-10-2026): «tampoco están todos los estilos de diferenciales RC ni accesorios ni repuestos extras… los repuestos
// deben coincidir, similares, compatibles y funcionales, no que luego no funcione».
// Reglas de TODO lo de aquí:
//  · Diseños PROPIOS (ni copias ni logotipos de marcas).
//  · Lo que depende de TU pieza (rodamiento, dogbone, servo, chasis…) es un campo «mídelo»: el valor que trae es el HABITUAL
//    y lo dice; no se inventa que encaje.
//  · Tus holguras de verdad (ENCAJES: 0,05 a presión · 0,10 justo · 0,15 gira, por lado).
//  · Cada diseño trae su 🧪 PRUEBA DE ENCAJE (unos gramos) para comprobarlo antes de gastar la pieza entera.
//  · Los engranajes se colocan con su GIRO exacto para que engranen todos a la vez, y el diferencial de rectos se comprueba en
//    MONTAJE VIRTUAL (difRectosMontado: que no choque nada y que los dientes se toquen).
//  · Si con esas medidas no puede funcionar o no cabe, se AVISA y no se dibuja.
import * as N from './nucleo.js';
import { ENCAJES, perfilEngranaje, circulo, rectR } from './motor.js';

const M = () => N.MF(), CS = () => N.CSX();
const n = (k, t, v, min, max, paso = 0.5, u = 'mm') => ({ k, t, v, min, max, paso, u });
const s = (k, t, v, ops) => ({ k, t, v, ops });
const c = (k, t, v) => ({ k, t, v: !!v, chk: 1 });
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const seg = d => Math.max(32, Math.min(160, Math.round(d * 1.4 + 24)));
const circ = d => N.cs([N.ccw(circulo(d / 2, 0, 0, seg(d)))], 'Positive');
const rr = (w, h, r = 0) => N.cs([N.ccw(rectR(w, h, r))], 'Positive');
const cil = (d, h, z = 0) => M().cylinder(h, d / 2, d / 2, seg(d)).translate([0, 0, z]);
const caja = (x, y, z, r = 0) => rr(x, y, r).extrude(z);
const H = ENCAJES;
export const PASOS = [['48P', '48P (módulo 0,53)'], ['32P', '32P (módulo 0,79)'], ['m0.5', 'Módulo 0,5'], ['m0.6', 'Módulo 0,6'], ['m0.8', 'Módulo 0,8'], ['m1', 'Módulo 1'], ['m1.5', 'Módulo 1,5']];
export const moduloDe = paso => (/P$/.test(paso) ? 25.4 / Number(paso.slice(0, -1)) : Number(String(paso).replace('m', '')));
// rueda dentada recta (evolvente 20°) con su JUEGO (se quita por cada flanco) y su GIRO (grados): el diente 0 mira a +X
const rueda = (z, m, juego, giro = 0) => { let s0 = N.cs([N.ccw(perfilEngranaje(z, m))], 'Positive'); if (juego) s0 = s0.offset(-juego / 2, 'Round', 2, 16); return giro ? s0.rotate(giro) : s0; }; // (juego negativo = sin holgura: solo para comprobar que engranan)
// GIRO para que dos ruedas engranen: la 1 (z1, girada φ1) en el centro; la 2 (z2) con su centro en la dirección β (grados)
export const giroPareja = (z1, phi1, z2, beta) => beta + 180 + 180 / z2 - (z1 / z2) * (phi1 - beta);
// salida de un eje: hexágono, eje en D o redonda (el agujero con su holgura)
function agujeroEje(forma, medida, hol, alto, plano) {
  if (forma === 'hex') return N.cs([N.poligono2(6, (medida + 2 * hol) / 0.866025, 0)], 'Positive').extrude(alto);
  if (forma === 'd') { const R0 = medida / 2 + hol, pl = (plano || medida * 0.82) + hol; return circ(2 * R0).intersect(rr(2 * R0 + 2, 2 * R0 + 2).translate([0, pl - R0 - (R0 + 1)])).extrude(alto); }
  return circ(medida + 2 * hol).extrude(alto);
}
// COPA de salida para un dogbone/CVD: el agujero de la cabeza y las DOS ranuras del pasador (abiertas por la boca)
function copaHueca(dogD, pinD, pinL, prof, largoTotal) {
  const bore = cil(dogD + 2 * H.gira, prof + 0.01, largoTotal - prof);
  const ran = caja(pinL + 4, pinD + 2 * H.justo, prof + 0.01).translate([0, 0, largoTotal - prof]);
  return bore.add(ran);
}
const comprobarCopa = (p, exterior) => {
  if (p.pinL <= p.dogD + 2 * H.gira + 0.4) N.mal('El pasador del dogbone (' + n2(p.pinL) + ' mm) no llega a las ranuras de una copa de ' + n2(p.dogD) + ' mm: mide otra vez la cabeza y el pasador.');
  if (exterior < p.dogD + 2 * H.gira + 2.4) N.mal('La copa queda con la pared demasiado fina (menos de 1,2 mm): necesita ser más gruesa.');
};
const PRUEBA = '🧪 PRUEBA DE ENCAJE: ';

export const DISENOS_RC = {
  // ======================= 🔒 DIFERENCIAL BLOQUEADO (SPOOL) =======================
  spool: { cat: 'rc', e: '🔒', t: 'Diferencial bloqueado (spool)', d: 'Las dos ruedas giran juntas: drift, crawler, arrastre', uso: 'pieza', color: '#e2231a',
    bambu: { brim_type: 'outer_only', brim_width: '6', enable_support: '0' }, // v20.4: de pie apoya ~30 mm² con 46 mm de alto: el borde lo sujeta a la cama
    campos: [s('paso', 'Paso de la corona (el de TU piñón)', '48P', PASOS), n('zc', 'Dientes de la corona', 72, 30, 140, 1, ''), n('anchoC', 'Ancho de la corona', 6, 3, 15), n('zp', 'Dientes de TU piñón', 20, 9, 60, 1, ''),
      n('rodI', 'Rodamiento: diámetro INTERIOR (mídelo)', 10, 3, 25, 0.1), n('rodE', 'Rodamiento: diámetro EXTERIOR (mídelo)', 15, 6, 40, 0.1), n('rodB', 'Rodamiento: ancho (mídelo)', 4, 2, 12, 0.1),
      n('largo', 'Largo total (de boca a boca de las copas, mídelo en tu caja)', 46, 24, 140), n('dogD', 'Copa: cabeza del dogbone (mídelo)', 6, 3, 15, 0.1), n('pinD', 'Copa: pasador del dogbone (mídelo)', 2, 1, 4, 0.1),
      n('pinL', 'Copa: pasador de punta a punta (mídelo)', 8.5, 4, 20, 0.1), n('prof', 'Copa: profundidad', 8, 4, 20, 0.5), n('juego', 'Juego entre dientes', 0.1, 0, 0.4, 0.05),
      c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (asiento del rodamiento + copa, ≈3 g)', false)],
    gen(p) {
      const m = moduloDe(p.paso), zc = Math.round(p.zc), L = p.largo, dJ = p.rodI - 2 * H.presion; // el rodamiento entra a presión (TU 0,05 por lado)
      const dCopa = Math.min(dJ - 0.6, Math.max(p.dogD + 2 * H.gira + 2.4, p.dogD + 4)); // la copa pasa por dentro del rodamiento
      comprobarCopa(p, dCopa);
      if (p.prueba) { const alto = p.prof + p.rodB + 1; return cil(dCopa, p.prof).add(cil(dJ, p.rodB + 1, p.prof - 0.01)).add(cil(dJ + 2, 1.2, alto - 0.01)).subtract(copaHueca(p.dogD, p.pinD, p.pinL, p.prof, p.prof).translate([0, 0, 0])).rotate([180, 0, 0]); }
      // a lo largo del eje Z: copa · asiento del rodamiento · hombro · corona en el centro · hombro · asiento · copa (de pie al imprimir)
      const rRaiz = m * zc / 2 - 1.25 * m, hombro = Math.min(dJ + 2.4, (p.rodI + p.rodE) / 2); // el hombro solo toca el aro de DENTRO del rodamiento
      const zA = p.prof, zB = p.prof + p.rodB; // de la boca hacia dentro
      const libre = L - 2 * zB; // lo que queda entre los dos rodamientos
      if (rRaiz < hombro / 2 + 1) N.mal('La corona es demasiado pequeña para ese rodamiento: pon más dientes.');
      // la corona: lo más centrada posible, pero su chaflán de abajo (para imprimir de pie sin soportes) empieza 1 mm por encima
      // del rodamiento de abajo (para no rozar su aro de fuera) y la corona acaba 1 mm antes del de arriba
      const cono = Math.max(0, rRaiz - hombro / 2), zMin = zB + 1 + cono, zMax = L - zB - 1 - p.anchoC;
      if (zMin > zMax) N.mal('No cabe: entre los dos rodamientos quedan ' + n2(libre) + ' mm y la corona (con su chaflán para imprimir sin soportes) necesita ' + n2(cono + p.anchoC + 2) + ' mm. Alarga el spool (mínimo ' + n2(2 * zB + cono + p.anchoC + 2) + ' mm) o usa menos dientes.');
      const zg0 = Math.max(zMin, Math.min(zMax, L / 2 - p.anchoC / 2));
      let cuerpo = cil(dCopa, zA).add(cil(dJ, p.rodB + 0.01, zA - 0.005)).add(cil(hombro, libre + 0.02, zB - 0.01)).add(cil(dJ, p.rodB + 0.01, L - zB - 0.005)).add(cil(dCopa, zA, L - zA));
      const corona = rueda(zc, m, p.juego).extrude(p.anchoC).translate([0, 0, zg0]);
      const chaflan = CS().ofPolygons([N.ccw([[0, 0], [hombro / 2, 0], [rRaiz, cono], [rRaiz, cono + p.anchoC], [0, cono + p.anchoC]])]).revolve(seg(2 * rRaiz) * 2).translate([0, 0, zg0 - cono]);
      cuerpo = cuerpo.add(corona).add(chaflan);
      // las dos copas (una por cada boca)
      cuerpo = cuerpo.subtract(copaHueca(p.dogD, p.pinD, p.pinL, p.prof, L)).subtract(copaHueca(p.dogD, p.pinD, p.pinL, p.prof, L).rotate([180, 0, 0]).translate([0, 0, L]));
      return cuerpo;
    },
    nota: p => { const m = moduloDe(p.paso); if (p.prueba) return PRUEBA + 'mete un rodamiento en el asiento (debe entrar a presión, con tu holgura de 0,05) y la cabeza del dogbone en la copa con su pasador en las ranuras (debe girar sin bailar). Si algo no encaja, cambia la medida que falla y vuelve a probar. Solo después, la pieza entera.';
      return 'Spool (diferencial bloqueado): las dos salidas giran siempre juntas. Corona de ' + Math.round(p.zc) + ' dientes, módulo ' + n2(m) + '. Distancia entre ejes con tu piñón de ' + Math.round(p.zp) + ': ' + n2(m * (Math.round(p.zc) + Math.round(p.zp)) / 2) + ' mm (tiene que ser la de TU coche; si no, cambia dientes). Reducción ' + n2(Math.round(p.zc) / Math.round(p.zp)) + ':1. Los rodamientos (' + n2(p.rodI) + '×' + n2(p.rodE) + '×' + n2(p.rodB) + ') entran por las copas y paran en el hombro. Imprime DE PIE (una boca en la cama) CON BORDE de 6 mm (el 3MF ya lo lleva puesto: apoya poco para lo alto que es): el chaflán de debajo de la corona hace que no necesite soportes. PETG o nailon, 4 paredes, 60 % de relleno.'; } },

  // ======================= ⚙️ DIFERENCIAL DE ENGRANAJES RECTOS (planetario) =======================
  difRectos: { cat: 'rc', e: '⚙️', t: 'Diferencial de engranajes rectos', d: 'Planetario de rectos: abierto, sin piñones cónicos', uso: 'pieza', color: '#e2231a',
    campos: [n('m', 'Módulo', 1, 0.6, 2, 0.05), n('zs', 'Dientes de cada sol (salidas)', 15, 9, 30, 1, ''), n('zp', 'Dientes de cada planeta', 10, 7, 24, 1, ''), s('np', 'Parejas de planetas', '3', [['2', '2 parejas'], ['3', '3 parejas (más fuerte)']]),
      n('w', 'Ancho de engrane con cada sol', 6, 3, 15), n('g', 'Zona central (donde engranan los planetas entre sí)', 6, 3, 15), n('pin', 'Pasador de los planetas (varilla metálica, mídela)', 3, 1.5, 5, 0.1),
      n('rodI', 'Rodamientos de la caja: interior (mídelo)', 15, 5, 30, 0.1), n('rodB', 'Rodamientos de la caja: ancho (mídelo)', 4, 2, 10, 0.1), n('pared', 'Pared de la caja', 6, 5.6, 12, 0.5),
      s('salida', 'Salida de los soles', 'hex', [['hex', 'Agujero hexagonal (eje hexagonal)'], ['d', 'Agujero en D'], ['redonda', 'Redonda']]), n('salidaM', 'Medida del eje de salida (entre caras / diámetro, mídelo)', 5, 2, 12, 0.1),
      c('corona', 'Con corona por fuera (engrana con tu piñón)', true), s('paso', 'Paso de la corona', '32P', PASOS), n('zc', 'Dientes de la corona', 80, 30, 160, 1, ''), n('anchoC', 'Ancho de la corona', 6, 3, 15),
      n('juego', 'Juego entre dientes', 0.12, 0, 0.4, 0.02), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (un sol + un planeta + su trozo de caja, ≈5 g)', false)],
    gen(p) {
      const A = difRectosMontado(p);
      if (p.prueba) return A.prueba;
      return A.imprimir;
    },
    nota: p => { const D = difRectosCuentas(p); if (p.prueba) return PRUEBA + 'monta el sol en su asiento y el planeta en su pasador metálico: deben girar a mano sin saltar ni bloquearse y sin holgura de más. Mira también que el pasador entra a presión en la caja. Si algo no va, cambia el juego o la medida y vuelve a probar.';
      return 'Diferencial abierto de RECTOS: 2 soles de ' + D.zs + ' dientes, ' + D.np + ' parejas de planetas de ' + D.zp + ' (cada planeta engrana con un sol y con su pareja, en la zona central). Distancia sol–planeta ' + n2(D.a) + ' mm. Comprobado en MONTAJE VIRTUAL: no choca nada y todos los dientes se tocan (con su giro exacto). Los planetas giran en varillas metálicas de ' + n2(p.pin) + ' mm × ' + n2(D.largoPin) + ' mm (cómpralas o usa clavos cortados); la caja se cierra con 4 tornillos M3 × ' + n2(D.largoTornillo) + ' mm y tuercas. Cara grande en la cama, PETG o nailon, 4 paredes, 60 %.' + (p.corona ? ' Corona por fuera de ' + Math.round(p.zc) + ' dientes (módulo ' + n2(moduloDe(p.paso)) + '): la distancia a tu piñón tiene que ser la de TU coche.' : ''); } },

  // ======================= 🕹️ BRAZO DE SERVO (+ salvaservo flexible) =======================
  brazoServo: { cat: 'rc', e: '🕹️', t: 'Brazo de servo (y salvaservo)', d: 'Se atornilla al DISCO original del servo: no imprime estrías', uso: 'pieza', color: '#e2231a',
    campos: [n('discoD', 'Diámetro del disco original del servo (mídelo)', 20, 10, 40, 0.1), s('agN', 'Agujeros del disco', '4', [['2', '2'], ['4', '4'], ['6', '6'], ['8', '8']]), n('agPCD', 'Círculo de esos agujeros (de centro a centro entre opuestos, mídelo)', 14, 5, 36, 0.1),
      n('agD', 'Tornillos del disco (diámetro)', 2, 1.5, 3, 0.1), n('centroD', 'Hueco central (para la cabeza del tornillo del servo)', 6, 3, 12, 0.1), n('largo', 'Largo del brazo (del centro al último agujero)', 25, 12, 60),
      n('nAg', 'Agujeros para la bieleta', 3, 1, 6, 1, ''), n('pasoAg', 'Separación entre esos agujeros', 3, 2, 8, 0.5), s('bola', 'Agujero de la bieleta', '2.6', [['2.6', 'Para roscar M3 (2,6 mm)'], ['3.2', 'Pasante M3 (3,2 mm)']]),
      n('grosor', 'Grosor', 3, 2, 6, 0.2), c('salva', 'Con SALVASERVO flexible (un zigzag que cede en los golpes)', false), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (el disco con sus agujeros, ≈1 g)', false)],
    gen(p) {
      const g = p.grosor, R = p.discoD / 2 + 2.5, k = Number(p.agN), rebaje = 1.2;
      if (p.agPCD / 2 + p.agD / 2 + 0.8 > p.discoD / 2 + 0.01) N.mal('Los agujeros no caben dentro del disco: mira otra vez el círculo de agujeros (' + n2(p.agPCD) + ' mm) y el disco (' + n2(p.discoD) + ' mm).');
      if (p.largo < R + 2) N.mal('El brazo es más corto que el disco: alárgalo.');
      let disco = cil(2 * R, g + rebaje);
      const agujeros = [...Array(k)].map((_, i) => cil(p.agD + 2 * H.justo, g + rebaje + 2, -1).translate([p.agPCD / 2 * Math.cos(i * 2 * Math.PI / k), p.agPCD / 2 * Math.sin(i * 2 * Math.PI / k), 0]));
      const asiento = cil(p.discoD + 2 * H.justo, rebaje + 0.01, -0.01); // el disco del servo encaja aquí debajo: lo centra solo
      if (p.prueba) return cil(2 * R, 1.2 + rebaje).subtract(asiento).subtract(N.union(agujeros)).subtract(cil(p.centroD, 5, -1));
      let brazo;
      const fin = p.largo + 3.5, ancho0 = 9, ancho1 = 6.5;
      if (p.salva) { // zigzag: brazo de salida unido al disco solo por un muelle de plástico
        const x0 = R - 1, x1 = Math.min(R + 14, fin - p.pasoAg * (p.nAg - 1) - 6), pts = [];
        const vueltas = 4; for (let i = 0; i <= vueltas * 2; i++) pts.push([x0 + (x1 - x0) * i / (vueltas * 2), (i % 2 ? 1 : -1) * 3.2, 1.4]);
        const zig = N.trazo2({ pts }).extrude(g);
        brazo = zig.add(M().hull([cil(ancho1, g).translate([x1, 0, 0]), cil(ancho1, g).translate([fin - 3.5, 0, 0])]));
      } else brazo = M().hull([cil(ancho0, g), cil(ancho1, g).translate([fin - 3.5, 0, 0])]);
      let m = disco.add(brazo.translate([0, 0, rebaje])).subtract(asiento).subtract(N.union(agujeros)).subtract(cil(p.centroD, g + rebaje + 2, -1));
      for (let i = 0; i < p.nAg; i++) m = m.subtract(cil(Number(p.bola), g + rebaje + 2, -1).translate([p.largo - i * p.pasoAg, 0, 0]));
      return m.rotate([180, 0, 0]);
    },
    nota: p => p.prueba ? PRUEBA + 'pon el anillo sobre el disco de TU servo: debe encajar sin holgura y los agujeros tienen que coincidir con los del disco. Si no, mide otra vez el disco y su círculo de agujeros.'
      : 'No imprime las estrías del servo (en plástico no aguantan): se atornilla ENCIMA del disco original con sus tornillos, y el rebaje de debajo lo centra. ' + (p.salva ? 'El ZIGZAG hace de salvaservo: cede en los golpes y vuelve. Imprímelo en PETG o TPU 95A (en PLA se parte), tumbado, con 100 % de relleno en el zigzag.' : 'PETG o nailon, tumbado, 100 % de relleno.') + ' Agujeros de la bieleta a ' + [...Array(Math.round(p.nAg))].map((_, i) => n2(p.largo - i * p.pasoAg)).join(', ') + ' mm del centro.' },

  // ======================= 🔲 SOPORTE DE SERVO =======================
  soporteServo: { cat: 'rc', e: '🔲', t: 'Soporte de servo', d: 'Para atornillar el servo al chasis (a tu medida)', uso: 'pieza', color: '#e2231a',
    campos: [s('tipo', 'Tamaño de partida (mide el tuyo)', 'estandar', [['estandar', 'Estándar (≈ 40 × 20 mm)'], ['mini', 'Mini (≈ 32 × 17 mm)'], ['micro', 'Micro 9 g (≈ 23 × 12 mm)']]), n('cL', 'Largo del cuerpo (mídelo)', 40.5, 15, 70, 0.1), n('cA', 'Ancho del cuerpo (mídelo)', 20.2, 8, 40, 0.1),
      n('sep', 'Agujeros de las orejas: de un lado al otro (centro a centro, mídelo)', 49.5, 20, 80, 0.1), n('par', 'Los 2 agujeros de cada oreja: separación (0 = uno solo, mídelo)', 10, 0, 20, 0.1),
      n('alto', 'Altura del soporte', 12, 3, 40), n('tornillo', 'Agujero para los tornillos del servo', 2.2, 1.5, 3.5, 0.1), n('sepC', 'Agujeros al chasis: separación (mídelo)', 30, 10, 100, 0.5), n('pared', 'Pared', 3, 2, 6, 0.5),
      c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (marco de 3 mm con los agujeros, ≈3 g)', false)],
    gen(p) {
      const iL = p.cL + 2 * H.justo, iA = p.cA + 2 * H.justo, w = p.pared, alto = p.prueba ? 3 : p.alto, orejaL = (p.sep - iL) / 2;
      if (orejaL < 2.4) N.mal('Los agujeros de las orejas (' + n2(p.sep) + ' mm) caen dentro del cuerpo del servo (' + n2(p.cL) + ' mm): mídelos otra vez de centro a centro.');
      const exL = p.sep + p.tornillo + 6, exA = Math.max(iA + 2 * w, p.par + p.tornillo + 6);
      let m = caja(exL, exA, alto, 1.5).subtract(caja(iL, iA, alto + 2).translate([0, 0, -1]));
      [-1, 1].forEach(a => (p.par > 0 ? [-1, 1] : [0]).forEach(b => { m = m.subtract(cil(p.tornillo, alto + 2, -1).translate([a * p.sep / 2, b * p.par / 2, 0])); }));
      if (!p.prueba) { // pie para atornillar al chasis (dos agujeros M3 avellanados por debajo)
        const pie = caja(exL, exA + 16, 3, 2).subtract(caja(iL, iA, 5).translate([0, 0, -1]));
        m = m.add(pie);
        [-1, 1].forEach(b => { m = m.subtract(cil(3.2, 5, -1).translate([0, b * (exA / 2 + 4), 0])).subtract(M().cylinder(1.8, 3.3, 1.6, 32).translate([0, b * (exA / 2 + 4), -0.01])); });
        if (p.sepC !== exA + 8) m = m; // (la separación al chasis se pone en el panel; aquí van centrados a lo ancho)
      }
      return m;
    },
    nota: p => p.prueba ? PRUEBA + 'mete TU servo en el marco: el cuerpo debe entrar justo y los agujeros de las orejas tienen que coincidir con los del marco. Si no, mide y cambia «largo», «ancho» o la separación de los agujeros.'
      : 'Las medidas de partida son las HABITUALES de un servo ' + ({ estandar: 'estándar', mini: 'mini', micro: 'micro de 9 g' }[p.tipo] || '') + ', pero cada marca cambia: MÍDELO. Los tornillos del servo se roscan solos en los agujeros de ' + n2(p.tornillo) + ' mm. Imprime con el pie en la cama.' },

  // ======================= 📍 POSTES DE CARROCERÍA =======================
  postesCarroceria: { cat: 'rc', e: '📍', t: 'Postes de carrocería', d: 'Con agujeros para los clips cada 5 mm', uso: 'pieza', color: '#e2231a',
    campos: [n('alto', 'Altura', 60, 15, 150), n('d', 'Diámetro (el de los agujeros de tu carrocería, mídelo)', 6, 3, 12, 0.1), n('clip', 'Agujero del clip (mídelo)', 1.5, 0.8, 3, 0.1), n('paso', 'Separación entre agujeros de clip', 5, 3, 12, 0.5),
      n('zona', 'Zona con agujeros (desde arriba)', 25, 5, 100), n('n', 'Cuántos', 2, 1, 6, 1, ''), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (un poste corto de 15 mm, ≈1 g)', false)],
    gen(p) {
      const alto = p.prueba ? 15 : p.alto, zona = Math.min(p.zona, alto - 6), uno = (() => {
        let m = cil(p.d, alto).add(cil(p.d + 6, 3)).subtract(cil(2.6, 10, -1)); // por debajo, un tornillo M3 del chasis se rosca en el poste
        for (let z = alto - 2.5; z > alto - zona; z -= p.paso) m = m.subtract(cil(p.clip + 2 * H.justo, p.d + 4, 0).rotate([0, 90, (z * 37) % 90]).translate([-(p.d + 4) / 2 * Math.cos(((z * 37) % 90) * Math.PI / 180), -(p.d + 4) / 2 * Math.sin(((z * 37) % 90) * Math.PI / 180), z]));
        return m; })();
      const k = p.prueba ? 1 : Math.round(p.n);
      return N.union([...Array(k)].map((_, i) => uno.translate([i * (p.d + 10), 0, 0])));
    },
    nota: p => p.prueba ? PRUEBA + 'mete el poste en el agujero de TU carrocería (debe pasar sin bailar) y un clip en los agujeros. Atornilla un M3 por debajo: debe roscar firme.' : 'Por debajo llevan un agujero de 2,6 mm para un tornillo M3 desde el chasis. Imprime de pie, PETG (el PLA se parte con los golpes).' },

  // ======================= 🛡️ PARACHOQUES =======================
  parachoques: { cat: 'rc', e: '🛡️', t: 'Parachoques', d: 'Delantero o trasero, curvo, con su placa de anclaje', uso: 'pieza', color: '#2b2b2b',
    campos: [n('ancho', 'Ancho', 120, 50, 300), n('flecha', 'Lo que sale por delante (curva)', 18, 0, 80), n('alto', 'Alto', 14, 6, 50), n('grosor', 'Grosor', 4, 2, 10, 0.5),
      n('placaL', 'Placa de anclaje: largo hacia atrás', 22, 10, 60), n('sep', 'Agujeros de anclaje: separación (la de TU chasis, mídela)', 30, 0, 150, 0.5), n('agD', 'Agujeros', 3.2, 2, 6, 0.1),
      c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (la placa con los agujeros, ≈2 g)', false)],
    gen(p) {
      const W = p.ancho, f = Math.max(0.01, p.flecha), R = (W * W / 4 + f * f) / (2 * f), th = Math.asin(Math.min(1, W / 2 / R)), pts = [];
      const placaW = Math.max(p.sep + p.agD + 8, 20), placa = caja(placaW, p.placaL, 3).translate([0, -p.placaL / 2, 0]);
      let ag = N.union([-1, 1].map(b => cil(p.agD, 6, -1).translate([b * p.sep / 2, -p.placaL / 2, 0])));
      if (p.prueba) return placa.subtract(ag);
      for (let i = 0; i <= 40; i++) { const a = -th + 2 * th * i / 40; pts.push([R * Math.sin(a), f - R + R * Math.cos(a)]); }
      const banda = N.trazo2({ pts: pts.map(q => [q[0], q[1], p.grosor]) }).extrude(p.alto);
      return banda.add(placa).subtract(ag);
    },
    nota: p => p.prueba ? PRUEBA + 'pon la placa sobre TU chasis: los agujeros tienen que coincidir con los del chasis.' : 'Imprime con la placa en la cama. Para que absorba golpes: TPU 95A o PETG; el PLA se parte.' },

  // ======================= 🪽 ALERÓN =======================
  aleron: { cat: 'rc', e: '🪽', t: 'Alerón', d: 'Con laterales y labio trasero (gurney)', uso: 'pieza', color: '#2b2b2b',
    campos: [n('ancho', 'Ancho', 160, 60, 320), n('fondo', 'Fondo', 50, 20, 120), n('grosor', 'Grosor', 2, 1.2, 5, 0.2), n('lateral', 'Alto de los laterales', 22, 0, 60), n('labio', 'Labio trasero', 5, 0, 15),
      n('sep', 'Agujeros de anclaje: separación (la de TU soporte, mídela)', 30, 0, 150, 0.5), n('agD', 'Agujeros', 3.2, 2, 6, 0.1), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (la tira central con los agujeros, ≈1 g)', false)],
    gen(p) {
      const ag = N.union([-1, 1].map(b => cil(p.agD, 10, -1).translate([b * p.sep / 2, 0, 0])));
      if (p.prueba) return caja(Math.max(p.sep + p.agD + 8, 20), 18, p.grosor, 2).subtract(ag);
      let m = caja(p.ancho, p.fondo, p.grosor, 4);
      if (p.lateral > 0) [-1, 1].forEach(b => { m = m.add(caja(p.grosor + 0.6, p.fondo + 6, p.lateral, 2).translate([b * (p.ancho / 2 - p.grosor / 2), -2, 0])); });
      if (p.labio > 0) m = m.add(caja(p.ancho - 2 * p.grosor, p.grosor, p.labio + p.grosor).translate([0, p.fondo / 2 - p.grosor / 2, 0]));
      return m.subtract(ag);
    },
    nota: p => p.prueba ? PRUEBA + 'comprueba que los agujeros caen en los de TU soporte de alerón.' : 'Imprime tumbado (la placa en la cama, los laterales hacia arriba). PETG o ASA si va al sol.' },

  // ======================= 🔋 SUJETA-BATERÍA =======================
  sujetaBateria: { cat: 'rc', e: '🔋', t: 'Sujeta-batería', d: 'Puente que abraza la batería (con tus medidas)', uso: 'pieza', color: '#2b2b2b',
    campos: [n('anchoB', 'Ancho de TU batería (mídelo)', 47, 15, 120, 0.1), n('altoB', 'Alto de TU batería (mídelo)', 25, 8, 80, 0.1), n('fondo', 'Ancho del puente', 15, 8, 40), n('grosor', 'Grosor', 3, 2, 6, 0.5),
      n('agD', 'Agujeros de los pies', 3.2, 2, 6, 0.1), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (una rodaja de 3 mm, ≈2 g)', false)],
    gen(p) {
      const g = p.grosor, iw = p.anchoB + 2 * H.gira, ih = p.altoB + H.justo, pie = 10;
      const perfil = rr(iw + 2 * g + 2 * pie, g).translate([0, 0]).translate([0, -g / 2]).add(rr(g, ih + g).translate([-(iw / 2 + g / 2), (ih + g) / 2 - g])).add(rr(g, ih + g).translate([iw / 2 + g / 2, (ih + g) / 2 - g])).add(rr(iw + 2 * g, g).translate([0, ih + g / 2]));
      // (los pies van a la altura de la base; el puente pasa por encima de la batería)
      const U = rr(iw + 2 * g, ih + g).translate([0, (ih + g) / 2]).subtract(rr(iw, ih).translate([0, ih / 2])).add(rr(iw + 2 * g + 2 * pie, g).translate([0, g / 2]).subtract(rr(iw, g + 1).translate([0, g / 2])));
      void perfil;
      let m = U.extrude(p.prueba ? 3 : p.fondo);
      if (!p.prueba) [-1, 1].forEach(b => { m = m.subtract(cil(p.agD, 3 * g, -g).rotate([-90, 0, 0]).translate([b * (iw / 2 + g + pie / 2), 0, p.fondo / 2])); });
      return m;
    },
    nota: p => p.prueba ? PRUEBA + 'mete TU batería en la rodaja: debe entrar sin holgura y sin apretar.' : 'Se imprime tumbado (el perfil en «U» en la cama): sin soportes. Los pies se atornillan al chasis.' },

  // ======================= 🥤 COPA DE SALIDA (para dogbone/CVD) =======================
  copaSalida: { cat: 'rc', e: '🥤', t: 'Copa de salida (outdrive)', d: 'Para el dogbone: entra en un eje hexagonal, en D o redondo', uso: 'pieza', color: '#e2231a',
    campos: [s('entrada', 'Eje donde se mete', 'd', [['hex', 'Hexagonal'], ['d', 'En D'], ['redonda', 'Redondo con prisionero']]), n('ejeM', 'Medida del eje (mídelo)', 5, 2, 12, 0.1), n('plano', 'Eje en D: del plano al otro lado (mídelo)', 4.5, 1, 11, 0.1),
      n('dogD', 'Cabeza del dogbone (mídelo)', 6, 3, 15, 0.1), n('pinD', 'Pasador del dogbone (mídelo)', 2, 1, 4, 0.1), n('pinL', 'Pasador de punta a punta (mídelo)', 8.5, 4, 20, 0.1), n('prof', 'Profundidad de la copa', 8, 4, 20, 0.5),
      n('largoE', 'Largo de la parte del eje', 8, 4, 30, 0.5), n('dExt', 'Diámetro de fuera', 11, 6, 30, 0.5), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (la copa corta, ≈1 g)', false)],
    gen(p) {
      comprobarCopa(p, p.dExt);
      if (p.pinL > p.dExt + 6) N.mal('El pasador (' + n2(p.pinL) + ' mm) es mucho más largo que la copa (' + n2(p.dExt) + ' mm): ensancha la copa.');
      const largoE = p.prueba ? 3 : p.largoE, L = largoE + p.prof;
      let m = cil(p.dExt, L).subtract(copaHueca(p.dogD, p.pinD, p.pinL, p.prof, L)).subtract(agujeroEje(p.entrada === 'hex' ? 'hex' : p.entrada === 'd' ? 'd' : 'redonda', p.ejeM, H.presion, largoE + 0.4, p.plano).translate([0, 0, -0.2]));
      if (p.entrada === 'redonda' && !p.prueba) m = m.subtract(cil(2.6, p.dExt, 0).rotate([-90, 0, 0]).translate([0, 0, largoE / 2]));
      return m;
    },
    nota: p => p.prueba ? PRUEBA + 'mete la cabeza del dogbone con su pasador: debe deslizar en las ranuras sin bailar.' : 'Imprime de pie (la boca hacia arriba). PETG o nailon, 100 % de relleno: es la pieza que más trabaja.' },


  // ======================= ✚ JUNTA CARDÁN (palieres y transmisiones con ángulo) — v20.2 =======================
  // Diseño propio: dos HORQUILLAS y una CRUCETA. Un pasador largo atraviesa la horquilla A y la cruceta; dos pasadores cortos
  // unen la horquilla B a la cruceta (agujeros ciegos, para no chocar con el largo). Los pasadores los pones tú (varilla de acero,
  // tornillo o filamento: mídelos): en las orejas giran (tu holgura «gira»), en la cruceta van a presión. Al cambiar las medidas se
  // MONTA VIRTUALMENTE y se mide cuánto puede doblar sin chocar (en los dos sentidos).
  cardan: { cat: 'rc', e: '✚', t: 'Junta cardán', d: 'Dos horquillas y su cruceta: dobla sin chocar (ángulo medido)', uso: 'pieza', color: '#e2231a',
    campos: [s('formaA', 'Eje A: forma', 'hex', [['hex', 'Hexagonal'], ['d', 'En D'], ['redonda', 'Redondo con prisionero']]), n('ejeA', 'Eje A: medida (mídelo)', 5, 2, 12, 0.05), n('planoA', 'Eje A en D: del plano al otro lado', 4.5, 1, 11, 0.05),
      s('formaB', 'Eje B: forma', 'redonda', [['hex', 'Hexagonal'], ['d', 'En D'], ['redonda', 'Redondo con prisionero']]), n('ejeB', 'Eje B: medida (mídelo)', 5, 2, 12, 0.05), n('planoB', 'Eje B en D: del plano al otro lado', 4.5, 1, 11, 0.05),
      n('pin', 'Pasadores: diámetro (mídelo: varilla, tornillo o filamento)', 3, 1.5, 6, 0.05), n('lado', 'Cruceta: lado (0 = automático)', 0, 0, 30, 0.5), n('oreja', 'Grosor de las orejas', 3, 2, 8, 0.5),
      n('buje', 'Largo de cada buje', 10, 4, 40, 0.5), n('garganta', 'Garganta (más = dobla más, y es más larga)', 0, 0, 10, 0.5), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (una horquilla corta + la cruceta)', false)],
    gen(p) {
      const D = cardanCuentas(p), A = horquilla(D, p.formaA, p.ejeA, p.planoA, p.prueba ? 3 : p.buje), cruz = cruceta(D);
      if (p.prueba) return A.add(cruz.translate([D.Dh / 2 + D.s / 2 + 6, 0, D.s / 2]));
      const B = horquilla(D, p.formaB, p.ejeB, p.planoB, p.buje);
      return A.add(B.translate([D.Dh + 6, 0, 0])).add(cruz.translate([D.Dh * 1.5 + D.s / 2 + 12, 0, D.s / 2]));
    },
    nota: p => { let D, ang = null; try { D = cardanCuentas(p); ang = anguloCardan(p); } catch (e) { return e.message; }
      const ang1 = ang ? (ang.max >= 90 ? '90° o más' : ang.max + '°') : '—';
      return (p.prueba ? PRUEBA + 'mete un pasador por la oreja y la cruceta: en la oreja tiene que GIRAR suave y en la cruceta quedar FIJO. ' : '') +
        'DOBLA HASTA ' + ang1 + ' sin chocar (montada virtualmente: ' + (ang ? ang.x + '° hacia un lado y ' + ang.y + '° hacia el otro' : '—') + '). Pasadores de Ø' + n2(p.pin) + ': uno de ' + n2(D.largoX) + ' mm (atraviesa) y dos de ' + n2(D.largoY) + ' mm. ' +
        'Imprime las horquillas de pie (el buje en la cama) y la cruceta plana; PETG o nailon al 100 %. Más garganta = dobla más (y es más larga).'; } },

  // ======================= 🔌 SOPORTE DE MOTOR 540 =======================
  soporteMotor: { cat: 'rc', e: '🔌', t: 'Soporte de motor (540 / 380)', d: 'Con ranuras para ajustar el engrane piñón–corona', uso: 'pieza', color: '#9b9ea4',
    campos: [n('sep', 'Agujeros del motor: separación (540 y 380 suelen ser 25 mm, mídelo)', 25, 10, 50, 0.1), n('agD', 'Tornillos del motor', 3.2, 2, 4, 0.1), n('bossD', 'Saliente del eje del motor (mídelo)', 13, 5, 25, 0.1),
      n('ajuste', 'Recorrido para ajustar el engrane', 6, 0, 15, 0.5), n('ancho', 'Placa: ancho', 45, 30, 80), n('alto', 'Placa: alto', 45, 30, 80), n('grosor', 'Grosor', 4, 3, 8, 0.5),
      n('sepC', 'Agujeros al chasis: separación (mídelo)', 30, 0, 80, 0.5), c('prueba', '🧪 Solo la PRUEBA DE ENCAJE (placa fina de 2 mm, ≈4 g)', false)],
    gen(p) {
      const g = p.prueba ? 2 : p.grosor, aj = p.ajuste;
      let m = caja(p.ancho, p.alto, g, 4);
      const ranura = (dx) => M().hull([cil(p.agD, g + 2, -1).translate([dx, -aj / 2, 0]), cil(p.agD, g + 2, -1).translate([dx, aj / 2, 0])]);
      m = m.subtract(ranura(-p.sep / 2)).subtract(ranura(p.sep / 2)).subtract(M().hull([cil(p.bossD + 2 * H.gira, g + 2, -1).translate([0, -aj / 2, 0]), cil(p.bossD + 2 * H.gira, g + 2, -1).translate([0, aj / 2, 0])]));
      if (!p.prueba && p.sepC > 0) [-1, 1].forEach(b => { m = m.subtract(cil(3.2, g + 2, -1).translate([b * p.sepC / 2, -p.alto / 2 + 5, 0])); });
      return m;
    },
    nota: p => p.prueba ? PRUEBA + 'apoya la placa en TU motor: los dos tornillos y el saliente del eje tienen que entrar, y el motor se tiene que poder deslizar ' + n2(p.ajuste) + ' mm para ajustar el engrane.' : 'Las ranuras dejan mover el motor ' + n2(p.ajuste) + ' mm para ajustar el engrane piñón–corona (que no apriete: un papel entre los dientes). Para un motor que se calienta: PETG o mejor ASA / aluminio. Este soporte es para probar o para cargas suaves.' }
};

// ---------- la junta cardán: cuentas, piezas, montaje virtual y el ÁNGULO que dobla sin chocar ----------
export function cardanCuentas(p) {
  const pin = p.pin, s = p.lado > 0 ? p.lado : Math.max(8, Math.ceil((3 * pin + 1.6) * 2) / 2), luz = 2 * H.gira, e = p.oreja; // (automática: que los pasadores cortos entren al menos su diámetro)
  if (s < pin * 2 + 2) N.mal('La cruceta de ' + n2(s) + ' mm es pequeña para pasadores de ' + n2(pin) + ' mm (mínimo ' + n2(pin * 2 + 2) + ').');
  const ciego = s / 2 - pin / 2 - 0.6; // los dos agujeros cortos no llegan al pasador largo
  if (ciego < pin) N.mal('Los pasadores cortos solo entrarían ' + n2(ciego) + ' mm en la cruceta: hazla más grande (lado) o usa pasadores más finos.');
  const wIn = s + 2 * luz, Dh = wIn + 2 * e, zc = 0.707 * s + 0.8 + (p.garganta || 0);
  [['A', p.ejeA, p.formaA], ['B', p.ejeB, p.formaB]].forEach(([k, d, f]) => { const ancho = f === 'hex' ? d / 0.866 : d; if (ancho + 2 * H.presion > Dh - 2.4) N.mal('El eje ' + k + ' (' + n2(d) + ' mm) no cabe en un buje de ' + n2(Dh) + ' mm: sube el lado de la cruceta o el grosor de las orejas.'); });
  return { pin, s, luz, e, wIn, Dh, zc, ciego, largoX: wIn + 2 * e, largoY: e + luz + ciego - 0.2 };
}
// una horquilla con el buje en la cama (z de 0 a L), las orejas hacia arriba y el pasador a lo largo de X a la altura L + zc
function horquilla(D, forma, medida, plano, L) {
  const { s, e, wIn, Dh, zc, pin } = D, zp = L + zc;
  let m = cil(Dh, L);
  [-1, 1].forEach(k => {
    const x0 = k > 0 ? wIn / 2 : -wIn / 2 - e;
    const oreja = M().cube([e, s, zc], false).translate([x0, -s / 2, L - 0.01]).add(M().cylinder(e, s / 2, s / 2, seg(s)).rotate([0, 90, 0]).translate([x0, 0, zp]));
    m = m.add(oreja);
  });
  m = m.subtract(M().cylinder(Dh + 2, (pin + 2 * H.gira) / 2, (pin + 2 * H.gira) / 2, seg(pin)).rotate([0, 90, 0]).translate([-Dh / 2 - 1, 0, zp]));
  m = m.subtract(agujeroEje(forma === 'hex' ? 'hex' : forma === 'd' ? 'd' : 'redonda', medida, H.presion, L + 0.4, plano).translate([0, 0, -0.2]));
  if (forma === 'redonda' && L >= 6) m = m.subtract(cil(2.6, Dh, 0).rotate([-90, 0, 0]).translate([0, 0, L / 2]));
  return m;
}
// la cruceta, centrada: el agujero LARGO a lo largo de X (atraviesa) y los dos CIEGOS a lo largo de Y (a presión los dos)
function cruceta(D) {
  const { s, pin, ciego } = D, ap = (pin + 2 * H.presion) / 2;
  return M().cube([s, s, s], true)
    .subtract(M().cylinder(s + 2, ap, ap, seg(pin)).rotate([0, 90, 0]).translate([-s / 2 - 1, 0, 0]))
    .subtract(M().cylinder(ciego + 1, ap, ap, seg(pin)).rotate([-90, 0, 0]).translate([0, s / 2 - ciego, 0]))
    .subtract(M().cylinder(ciego + 1, ap, ap, seg(pin)).rotate([90, 0, 0]).translate([0, -s / 2 + ciego, 0]));
}
// MONTADA (el centro de la cruceta en el origen): A abajo (pasador en X), B arriba (pasador en Y); B doblada «b» grados sobre su
// pasador (Y) y todo lo de arriba (cruceta + B) girado «a» grados sobre el pasador de A (X)
export function cardanMontado(p, a = 0, b = 0) {
  const D = cardanCuentas(p), L = p.buje;
  const A = horquilla(D, p.formaA, p.ejeA, p.planoA, L).translate([0, 0, -(L + D.zc)]);
  let B = horquilla(D, p.formaB, p.ejeB, p.planoB, L).translate([0, 0, -(L + D.zc)]).rotate([0, 0, 90]).rotate([180, 0, 0]);
  let cruz = cruceta(D);
  if (b) B = B.rotate([0, b, 0]);
  if (a) { B = B.rotate([a, 0, 0]); cruz = cruz.rotate([a, 0, 0]); }
  return { D, A, B, cruz };
}
const ANGULOS = new Map();
export function anguloCardan(p) {
  const k = JSON.stringify(['formaA', 'ejeA', 'planoA', 'formaB', 'ejeB', 'planoB', 'pin', 'lado', 'oreja', 'buje', 'garganta'].map(x => p[x]));
  if (ANGULOS.has(k)) return ANGULOS.get(k);
  const choca = (a, b) => { const X = cardanMontado(p, a, b); return X.B.intersect(X.A).volume() > 0.05 || X.B.intersect(X.cruz).volume() > 0.05 || X.cruz.intersect(X.A).volume() > 0.05; };
  const barre = f => { let ok = 0; for (let g = 2; g <= 90; g += 2) { if (f(g)) break; ok = g; } return ok; };
  try {
    if (choca(0, 0)) N.mal('Montada, la junta ya choca sin doblar: revisa las medidas.');
    const r = { x: barre(g => choca(g, 0)), y: barre(g => choca(0, g)) }; r.max = Math.min(r.x, r.y);
    if (ANGULOS.size > 30) ANGULOS.delete(ANGULOS.keys().next().value);
    ANGULOS.set(k, r); return r;
  } finally { N.limpia(); }
}

// ---------- el diferencial de rectos: cuentas, MONTAJE VIRTUAL y piezas para imprimir ----------
export function difRectosCuentas(p) {
  const m = p.m, zs = Math.round(p.zs), zp = Math.round(p.zp), np = Number(p.np), a = m * (zs + zp) / 2, d = m * zp;
  const phi = 2 * Math.asin(Math.min(1, d / (2 * a))) * 180 / Math.PI; // ángulo entre los dos planetas de una pareja (vistos desde el centro)
  const libreAng = 360 / np - phi, cuerda = 2 * a * Math.sin(libreAng / 2 * Math.PI / 180), tipP = m * (zp + 2);
  const rRaizS = m * zs / 2 - 1.25 * m, rCuello = a - (m * zs / 2 + m) - 0.6; // el «cuello» de cada planeta donde NO engrana con el otro sol
  const Rc = a + m * (zp / 2 + 1) + 0.8, Rout = Rc + p.pared, zTot = 2 * p.w + p.g;
  return { m, zs, zp, np, a, phi, libreAng, cuerda, tipP, rRaizS, rCuello, Rc, Rout, zTot, largoPin: zTot + 2 * 0.3 + 2 * 3, largoTornillo: Math.ceil(zTot + 2 * 4 + 4) };
}
export function difRectosMontado(p) {
  const D = difRectosCuentas(p), { m, zs, zp, np, a, phi } = D, w = p.w, g = p.g, j = p.juego, hol = H.gira;
  if (D.cuerda < D.tipP + 0.6) N.mal('No caben ' + np + ' parejas de planetas: quedan demasiado juntas. Usa 2 parejas, más dientes en los soles o menos en los planetas.');
  if (D.rCuello < p.pin / 2 + 1) N.mal('Los planetas son demasiado pequeños para un pasador de ' + n2(p.pin) + ' mm: pon más dientes en los planetas o un pasador más fino.');
  const rHub = D.rRaizS - 0.6; if (rHub < p.salidaM / 2 + 1.4) N.mal('Los soles son demasiado pequeños para un eje de ' + n2(p.salidaM) + ' mm: pon más dientes en los soles.');
  // GIROS: sol A en 0°; cada planeta 1 con su sol A; cada planeta 2 con su planeta 1; y el sol B con TODOS los planetas 2
  const pos = []; let solB = null, malB = 0;
  for (let i = 0; i < np; i++) {
    const b0 = i * 360 / np, b1 = b0 - phi / 2, b2 = b0 + phi / 2;
    const g1 = giroPareja(zs, 0, zp, b1);
    // planeta 2 (centro c2) visto desde el planeta 1 (centro c1): dirección de c1 a c2
    const c1 = [a * Math.cos(b1 * Math.PI / 180), a * Math.sin(b1 * Math.PI / 180)], c2 = [a * Math.cos(b2 * Math.PI / 180), a * Math.sin(b2 * Math.PI / 180)];
    const dir12 = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]) * 180 / Math.PI;
    const g2 = giroPareja(zp, g1, zp, dir12) + (b1 - b1); // (giro absoluto de cada rueda en el mundo)
    // el sol B tiene que engranar con el planeta 2: desde el planeta 2, el sol B está en la dirección b2 + 180
    const gB = giroPareja(zp, g2, zs, b2 + 180);
    const paso = 360 / zs, r = ((gB % paso) + paso) % paso;
    if (solB === null) solB = r; else { const dd = Math.min(Math.abs(r - solB), paso - Math.abs(r - solB)); malB = Math.max(malB, dd); }
    pos.push({ c1, c2, g1, g2 });
  }
  if (malB > 0.6) { // no se puede montar: se busca una cuenta de dientes que sí
    const sug = []; for (let k = -3; k <= 3 && sug.length < 2; k++) if (k) { try { difRectosCuentasValidas(Object.assign({}, p, { zs: Math.round(p.zs) + k })) && sug.push(Math.round(p.zs) + k); } catch (e) { } }
    N.mal('Con ' + zs + ' dientes en los soles y ' + zp + ' en los planetas, las ' + np + ' parejas no pueden engranar a la vez con el segundo sol (se descuadran ' + n2(malB) + '°).' + (sug.length ? ' Prueba con ' + sug.join(' o ') + ' dientes en los soles.' : ' Prueba otra cuenta de dientes o 2 parejas.'));
  }
  // ---- las piezas, montadas (eje Z = el de los soles) ----
  const cuello = (rad, z0, z1, x, y) => cil(2 * rad, z1 - z0, z0).translate([x, y, 0]);
  const solA = rueda(zs, m, j).extrude(w).add(cil(2 * rHub, g / 2 - 0.2, w - 0.01)).add(cil(2 * rHub, 4 + p.rodB + 1.5, -(4 + p.rodB + 1.5) + 0.01).subtract(cil(0.01, 0.01, -100))); // con su buje hacia fuera
  const salida = agujeroEje(p.salida, p.salidaM, H.presion, 200, p.salidaM * 0.82).translate([0, 0, -100]);
  const SA = solA.subtract(salida);
  const SB = SA.rotate([180, 0, 0]).rotate([0, 0, solB]).translate([0, 0, D.zTot]); // el sol B, igual pero dado la vuelta (y con su giro)
  const P1 = [], P2 = [];
  pos.forEach(q => {
    const pin = cil(p.pin + 2 * hol, D.zTot + 2, -1);
    P1.push(rueda(zp, m, j, q.g1).extrude(w + g - 0.3).add(cuello(D.rCuello, w + g - 0.31, D.zTot - 0.3, 0, 0)).subtract(pin).translate([q.c1[0], q.c1[1], 0]));
    P2.push(rueda(zp, m, j, q.g2).extrude(w + g - 0.3).translate([0, 0, w + 0.3]).add(cuello(D.rCuello, 0.3, w + 0.31, 0, 0)).subtract(pin).translate([q.c2[0], q.c2[1], 0]));
  });
  // la CAJA en dos mitades (cortada por la mitad de la zona central): pasadores metálicos de punta a punta y 4 tornillos M3
  const tp = 4, zMid = w + g / 2, Rc = D.Rc, Ro = D.Rout, dJ = p.rodI - 2 * H.presion;
  if (dJ < 2 * rHub + 2 * hol + 2.4) N.mal('El rodamiento de la caja (' + n2(p.rodI) + ' mm por dentro) es demasiado pequeño para el buje de los soles: necesita al menos ' + n2(2 * rHub + 2 * hol + 2.4 + 2 * H.presion) + ' mm.');
  let caja0 = cil(2 * Ro, D.zTot + 2 * tp + 0.6, -tp - 0.3).subtract(cil(2 * Rc, D.zTot + 0.6, -0.3));
  caja0 = caja0.add(cil(dJ, p.rodB + 0.5, -tp - 0.3 - p.rodB - 0.5 + 0.01)).add(cil(dJ, p.rodB + 0.5, D.zTot + 0.3 + tp - 0.01)); // asientos de los rodamientos
  caja0 = caja0.subtract(cil(2 * rHub + 2 * hol, D.zTot + 2 * tp + 2 * p.rodB + 6, -tp - p.rodB - 3)); // el paso de los bujes de los soles
  pos.forEach(q => [q.c1, q.c2].forEach(cc => { caja0 = caja0.subtract(cil(p.pin + 2 * H.presion, D.zTot + 2 * tp - 2, -tp + 0.7).translate([cc[0], cc[1], 0])); })); // pasadores: a presión en la caja
  const tornillos = [45, 135, 225, 315].map(ang => { const r = (Rc + Ro) / 2, x = r * Math.cos(ang * Math.PI / 180), y = r * Math.sin(ang * Math.PI / 180); return cil(3.4, D.zTot + 2 * tp + 4, -tp - 2).translate([x, y, 0]).add(N.cs([N.poligono2(6, (5.5 + 2 * hol) / 0.866025, 0)], 'Positive').extrude(2.6).translate([x, y, -tp - 0.31])).add(cil(6, 3, D.zTot + tp - 2.69).translate([x, y, 0])); });
  if (Ro - Rc < 5.6) N.mal('La pared de la caja (' + n2(p.pared) + ' mm) es muy fina para los tornillos M3: ponla de 6 mm o más.');
  caja0 = caja0.subtract(N.union(tornillos));
  let corona = null;
  if (p.corona) {
    const mc = moduloDe(p.paso), zc = Math.round(p.zc), rr0 = mc * zc / 2 - 1.25 * mc;
    if (rr0 < Ro + 1.5) N.mal('La corona de ' + zc + ' dientes es más pequeña que la caja (' + n2(2 * Ro) + ' mm): pon al menos ' + Math.ceil((2 * (Ro + 1.5 + 1.25 * mc)) / mc) + ' dientes.');
    corona = rueda(zc, mc, 0.1).extrude(p.anchoC).subtract(circ(2 * Ro - 0.02).extrude(p.anchoC + 2).translate([0, 0, -1])).translate([0, 0, zMid - p.anchoC - 0.2]);
    caja0 = caja0.add(corona);
  }
  const cajaA = caja0.intersect(cil(4 * Ro + 400, zMid + tp + 0.3 + p.rodB + 1, -tp - p.rodB - 1)), cajaB = caja0.subtract(cil(4 * Ro + 400, zMid + tp + 0.3 + p.rodB + 1, -tp - p.rodB - 1));
  const piezas = { solA: SA, solB: SB, cajaA, cajaB }; P1.forEach((x, i) => { piezas['planeta1_' + (i + 1)] = x; }); P2.forEach((x, i) => { piezas['planeta2_' + (i + 1)] = x; });
  // ---- para imprimir: cada una tumbada por su cara grande, en fila ----
  const lista = [['solA', SA], ['solB', SA]].concat(P1.map((x, i) => ['p1_' + i, P1[i].translate([-pos[i].c1[0], -pos[i].c1[1], 0])]), P2.map((x, i) => ['p2_' + i, P2[i].translate([-pos[i].c2[0], -pos[i].c2[1], 0])]), [['cajaA', cajaA.rotate([180, 0, 0])], ['cajaB', cajaB]]);
  // en FILAS que quepan en la cama (240 mm de ancho)
  let x = 0, y = 0, fila = 0; const imprimir = N.union(lista.map(([, q]) => { const b = N.caja(q); if (x > 0 && x + b.dims[0] > 240) { x = 0; y += fila + 6; fila = 0; } const r = q.translate([x - b.min[0], y - b.min[1], -b.min[2]]); x += b.dims[0] + 5; fila = Math.max(fila, b.dims[1]); return r; }));
  // ---- la PRUEBA: un sol + un planeta 1 + un trozo de la caja con su pasador (sin la corona de fuera) ----
  const prueba = (() => { const bA = SA.intersect(cil(4 * Ro, 3, 0)), pl = P1[0].intersect(cil(4 * Ro, 3, 0)), trozo = cajaA.intersect(caja(p.pin + 13, p.pin + 13, tp + 0.3, 2).translate([pos[0].c1[0], pos[0].c1[1], -tp - 0.3])); return N.union([bA, pl, trozo].map((q, i) => { const b = N.caja(q); return q.translate([i * (2 * Ro + 6) - b.min[0], -b.min[1], -b.min[2]]); })); })();
  return { D, piezas, imprimir, prueba, pos, solB };
}
// (solo para buscar sugerencias: ¿esta cuenta de dientes se puede montar?)
function difRectosCuentasValidas(p) {
  const D = difRectosCuentas(p); if (D.cuerda < D.tipP + 0.6) return false;
  let solB = null;
  for (let i = 0; i < D.np; i++) {
    const b0 = i * 360 / D.np, b1 = b0 - D.phi / 2, b2 = b0 + D.phi / 2, g1 = giroPareja(D.zs, 0, D.zp, b1);
    const c1 = [Math.cos(b1 * Math.PI / 180), Math.sin(b1 * Math.PI / 180)], c2 = [Math.cos(b2 * Math.PI / 180), Math.sin(b2 * Math.PI / 180)], dir12 = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]) * 180 / Math.PI;
    const g2 = giroPareja(D.zp, g1, D.zp, dir12), gB = giroPareja(D.zp, g2, D.zs, b2 + 180), paso = 360 / D.zs, r = ((gB % paso) + paso) % paso;
    if (solB === null) solB = r; else if (Math.min(Math.abs(r - solB), paso - Math.abs(r - solB)) > 0.6) return false;
  }
  return true;
}
