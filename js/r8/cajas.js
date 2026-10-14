// ================= v30 · 📦 CelebriR8 · TALLER DE CAJAS (tapas, bisagras, cierres, pomos, puertas…) =================
// La dueña (10-10-2026): «si quiero hacer cajas con cierre, que haya variedad de bisagras de tapas de cajas y que los elementos
// se puedan arrastrar y el programa te diga más o menos aquí estaría bien con verde, esta zona no en rojo. Elementos como pomo,
// puertas, bisagras, cierres, etc.».
// Todo sale de las MISMAS medidas de la caja (así encaja por construcción) y se MONTA en el ordenador: la tapa y las puertas se
// abren de 5 en 5 grados hasta que algo choca (eso es lo que se abren de verdad), el cierre se comprueba (cuánto engancha y cuánto
// se dobla la patilla) y cada elemento tiene sus ZONAS: verde = ahí funciona; rojo = ahí no, con el porqué.
// Medidas en mm. La caja está centrada en X/Y y apoyada en z = 0; la tapa cerrada va de H a H + tapaG.
// Cada cara lateral tiene su «u» (a lo ancho, mirándola desde fuera, de izquierda a derecha) y su «v» (la altura, z).
import * as N from './nucleo.js';
import { ENCAJES } from './motor.js';
import * as CP from './cajas_pro.js'; // 14-10-2026 · cerraduras, compartimentos, estilos y el limitador (Taller de cajas PRO)

const M = () => N.MF();
const segs = d => Math.max(24, Math.min(96, Math.round(d * 3 + 16)));
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES'), n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const cubo = (x0, x1, y0, y1, z0, z1) => M().cube([x1 - x0, y1 - y0, z1 - z0], false).translate([x0, y0, z0]);
const cilZ = (r, z0, z1, x = 0, y = 0) => M().cylinder(z1 - z0, r, r, segs(2 * r)).translate([x, y, z0]);
const cilX = (r, x0, x1, y = 0, z = 0) => M().cylinder(x1 - x0, r, r, segs(2 * r)).rotate([0, 90, 0]).translate([x0, y, z]);
const cilY = (r, y0, y1, x = 0, z = 0) => M().cylinder(y1 - y0, r, r, segs(2 * r)).rotate([-90, 0, 0]).translate([x, y0, z]);
// un perfil en el plano (y, z) estirado a lo largo de X (de x0 a x1)
const perfilX = (pts, x0, x1) => N.cs([N.ccw(pts)], 'Positive').extrude(x1 - x0).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1]);
const rrect = (L, W, r) => { const S = N.CSX().square([Math.max(0.02, L - 2 * r), Math.max(0.02, W - 2 * r)], true); return r > 0.05 ? S.offset(r, 'Round', 2, segs(2 * r)) : S; };
const prisma = (L, W, r, z0, z1) => rrect(L, W, r).extrude(z1 - z0).translate([0, 0, z0]);
const impar = x => { x = Math.max(3, Math.round(x)); return x % 2 ? x : x + 1; };

// ---------- lo que se puede elegir ----------
export const TAPAS = {
  presion: { e: '⬒', t: 'Tapa a presión', d: 'Un labio que entra justo dentro de la caja. Sin bisagras: se quita entera.' },
  // v30.6 · LA DUEÑA LAS IMPRIMIÓ Y SE PARTÍAN («no cierran ni abren… se parte todo, es muy fino»). Lo que estaba mal: el agujero del
  // filamento medía 1,85 (tumbado sale a ~1,7: el filamento de 1,75 no entra), el pasador impreso era de Ø3 (se parte al meterlo) y la
  // de clic obliga a abrir un aro impreso por capas (se raja). Ahora: nudos más gordos y largos, agujeros con sitio de verdad
  // (agarre = pin + 0,3; giro = pin + 0,6), pasador de Ø4, y una nueva con TORNILLO M3 de eje. La de clic ya no se ofrece (fragil).
  bisagraFil: { e: '🧵', t: 'Bisagra · eje de filamento', d: 'El eje es un trozo de TU filamento de 1,75 mm: no compras nada.', pin: 1.75, Rk: 4.2, hEje: 0.15, hTapa: 0.3 },
  bisagraImp: { e: '📌', t: 'Bisagra · eje impreso', d: 'Sale un pasador gordo (Ø4) con cabeza que se mete por los nudos: fuerte y sin comprar nada.', pin: 4, Rk: 5.5, hEje: 0.15, hTapa: 0.3 },
  bisagraTor: { e: '🪛', t: 'Bisagra · tornillo M3', d: 'El eje es un tornillo M3 largo que se rosca en el último nudo: la más fuerte (el tornillo se compra).', pin: 3, Rk: 5, hEje: 0.2, hTapa: 0.3, rosca: 1.3, comprado: 'tornillo M3' },
  bisagraClic: { e: '🫰', t: 'Bisagra de clic (frágil)', d: 'Ya no se recomienda: para engancharla hay que abrir un aro impreso por capas y se raja. Cámbiala por otra.', pin: 4, Rk: 5.5, hTapa: 0.3, boca: 3.4, fragil: true },
  corredera: { e: '↔️', t: 'Tapa corredera', d: 'Va metida y corre por unas ranuras en cola de milano; sale por la derecha. La del cierre secreto.' }
};
export const AJUSTES = { suave: ['Suave', 'gira'], firme: ['Firme', 'justo'], fuerte: ['Muy firme', 'presion'] };
export const conBisagra = C => C.tapa !== 'presion' && C.tapa !== 'corredera';
export const CARAS = { frente: 'Delante', atras: 'Detrás', izq: 'Izquierda', der: 'Derecha', tapa: 'Encima de la tapa', dentro: 'Dentro' };
const LADOS = ['frente', 'atras', 'izq', 'der'];
// p = medidas por defecto · campos = [clave, texto, mín, máx, paso] · junta = va en la unión tapa-caja (su altura no se elige)
export const TIPOS = {
  bisagra: { e: '🔗', t: 'Bisagra', d: 'En el borde de atrás: une la tapa y la caja', caras: ['atras'], junta: 1, p: { largo: 32 }, campos: [['largo', 'Largo', 12, 160, 1]] },
  cierre: { e: '🔒', t: 'Cierre de clic', d: 'Una patilla de la tapa engancha en un diente de la caja', caras: LADOS, junta: 1, p: { ancho: 14 }, campos: [['ancho', 'Ancho', 8, 40, 1]] },
  candado: { e: '🔐', t: 'Para candado', d: 'Dos orejetas con agujero: pasa el arco de un candado', caras: LADOS, junta: 1, p: { agujero: 6 }, campos: [['agujero', 'Agujero (el arco del candado)', 3, 10, 0.5]] },
  iman: { e: '🧲', t: 'Imán', d: 'Una columnita por dentro con su hueco, y su pareja en la tapa (la cierra sola)', caras: LADOS, junta: 1, p: { d: 6, h: 2 }, campos: [['d', 'Diámetro del imán', 3, 15, 0.5], ['h', 'Grosor del imán', 1, 5, 0.5]], comprado: 'imanes redondos' },
  pomo: { e: '🔘', t: 'Pomo', d: 'Encima de la tapa, o en una puerta', caras: ['tapa', ...LADOS], p: { d: 16, alto: 12 }, campos: [['d', 'Diámetro', 8, 40, 1], ['alto', 'Alto', 6, 30, 1]] },
  asa: { e: '🫳', t: 'Asa', d: 'Para cogerla, en un lateral', caras: LADOS, p: { ancho: 44, alto: 15 }, campos: [['ancho', 'Ancho', 24, 140, 1], ['alto', 'Lo que sale hacia fuera', 10, 26, 1]] },
  puerta: { e: '🚪', t: 'Puerta', d: 'Hueco en la pared con su puerta de clic', caras: LADOS, p: { ancho: 40, alto: 30 }, campos: [['ancho', 'Ancho', 18, 200, 1], ['alto', 'Alto', 16, 200, 1]] },
  cable: { e: '🔌', t: 'Agujero', d: 'Para un cable o para ventilar', caras: LADOS, p: { d: 8 }, campos: [['d', 'Diámetro', 3, 40, 0.5]] },
  etiqueta: { e: '🏷️', t: 'Portaetiquetas', d: 'Un marquito para meter una tarjeta', caras: LADOS, p: { ancho: 40, alto: 22 }, campos: [['ancho', 'Ancho de la tarjeta', 16, 140, 1], ['alto', 'Alto de la tarjeta', 10, 90, 1]] },
  separador: { e: '▤', t: 'Separador', d: 'Una pared por dentro (compartimentos)', caras: ['dentro'], p: { dir: 'y' }, campos: [] }
};
// 14-10-2026 · los nuevos (cajas_pro.js) y los GRUPOS de la paleta
Object.assign(TIPOS, CP.TIPOS_PRO);
Object.entries({ bisagra: 'cerrar', cierre: 'cerrar', candado: 'cerrar', iman: 'cerrar', pomo: 'abrir', asa: 'abrir', puerta: 'abrir', cable: 'mas', etiqueta: 'mas', separador: 'dentro' }).forEach(([k, g]) => { TIPOS[k].grupo = g; });
export const GRUPOS = { cerrar: '🔒 Cerrar', abrir: '✋ Abrir y coger', dentro: '🗂️ Dentro', mas: '✨ Más' };
// 🛑 ¿por qué NO se puede poner este elemento en esta caja, esté donde esté? → el motivo o null (soloTapa: solo lo que depende de la tapa)
export function porQueNo(C, tipo, idIgnora, soloTapa) {
  const D = TIPOS[tipo]; if (!D) return 'No sé qué es eso.';
  if (tipo === 'bisagra' && !conBisagra(C)) return C.tapa === 'corredera' ? 'La tapa corredera no lleva bisagras (va metida en sus ranuras).' : 'Con la tapa a presión no hay bisagras: elige arriba una tapa con bisagra.';
  if (C.tapa === 'corredera' && ['cierre', 'candado', 'iman', 'combinacion', 'llave'].includes(tipo)) return 'Con la tapa corredera no hace falta ni cabe (la tapa va metida en sus ranuras): elige una tapa con bisagra o a presión.';
  if (tipo === 'gravedad' && C.tapa !== 'corredera') return 'El cierre secreto va con la TAPA CORREDERA: elígela arriba.';
  if (soloTapa) return null;
  const yaHay = C.els.filter(e => e.id !== idIgnora && e.tipo === tipo).length;
  if (yaHay >= (CP.MAXIMO[tipo] || 99)) return 'Ya hay ' + yaHay + ': como mucho ' + CP.MAXIMO[tipo] + ' por caja.';
  return null;
}
export function nueva() { return { L: 120, W: 80, H: 50, pared: 3, suelo: 2.4, tapaG: 3, radio: 4, tapa: 'bisagraFil', ajuste: 'firme', labio: 5, tope: true, color: '#9d6d3f', colorTapa: '#c9a227', estilo: 'lisa', pies: false, impresora: 'p1p', els: [] }; }
let ids = 0;
export const nuevoId = () => 'e' + Date.now().toString(36) + (ids++).toString(36);
export const elemento = (tipo, cara, u, v, p) => ({ id: nuevoId(), tipo, cara, u, v, p: Object.assign({}, TIPOS[tipo].p, p || {}) });
export const PLANTILLAS = {
  joyero: { e: '💍', t: 'Joyero', d: 'Bisagra de filamento, cierre de clic y separadores', C: { L: 110, W: 72, H: 38, radio: 5, tapa: 'bisagraFil', color: '#1b1b1d', colorTapa: '#c9a227' },
    els: [['bisagra', 'atras', -26, 0, { largo: 28 }], ['bisagra', 'atras', 26, 0, { largo: 28 }], ['cierre', 'frente', 0, 0], ['separador', 'dentro', -18, 0], ['separador', 'dentro', 18, 0]] },
  herramientas: { e: '🧰', t: 'Caja de herramientas', d: 'Bisagras de eje impreso, cierres, candado y asas', C: { L: 200, W: 110, H: 70, radio: 6, tapa: 'bisagraImp', pared: 3, tapaG: 3, color: '#c8102e', colorTapa: '#1b1b1d' },
    els: [['bisagra', 'atras', -55, 0, { largo: 44 }], ['bisagra', 'atras', 55, 0, { largo: 44 }], ['cierre', 'frente', -60, 0, { ancho: 18 }], ['cierre', 'frente', 60, 0, { ancho: 18 }], ['candado', 'frente', 0, 0], ['asa', 'izq', 0, 42], ['asa', 'der', 0, 42]] },
  // 13-10-2026 · 50.1 («cajas de diferentes estilos, formas, cierres seguros con protección»): con las piezas que ya se han probado aquí
  maletin: { e: '💼', t: 'Maletín', d: 'Bisagra con tornillo M3 (la más fuerte), dos cierres, candado y asa arriba', C: { L: 200, W: 140, H: 60, radio: 8, tapa: 'bisagraTor', pared: 3.2, tapaG: 3.2, color: '#1b1b1d', colorTapa: '#3d4048' }, // (con las asas, 230 mm: cabe en la P1P)
    els: [['bisagra', 'atras', -55, 0, { largo: 52 }], ['bisagra', 'atras', 55, 0, { largo: 52 }], ['cierre', 'frente', -65, 0, { ancho: 20 }], ['cierre', 'frente', 65, 0, { ancho: 20 }], ['candado', 'frente', 0, 0, { agujero: 6 }], ['asa', 'izq', 0, 30, { ancho: 56, alto: 15 }], ['asa', 'der', 0, 30, { ancho: 56, alto: 15 }], ['separador', 'dentro', 0, 0]] },
  segura: { e: '🛡️', t: 'Caja de seguridad', d: 'Paredes gruesas, bisagra de tornillo, dos cierres y candado en medio', C: { L: 150, W: 100, H: 70, radio: 5, tapa: 'bisagraTor', pared: 4, tapaG: 4, suelo: 3, color: '#2a3a4a', colorTapa: '#c9a227' },
    els: [['bisagra', 'atras', -38, 0, { largo: 50 }], ['bisagra', 'atras', 38, 0, { largo: 50 }], ['cierre', 'frente', -48, 0, { ancho: 18 }], ['cierre', 'frente', 48, 0, { ancho: 18 }], ['candado', 'frente', 0, 0, { agujero: 7 }], ['etiqueta', 'izq', 0, 35]] },
  armarito: { e: '🗄️', t: 'Armarito con puerta', d: 'Tapa a presión, puerta de clic con su pomo', C: { L: 90, W: 70, H: 100, radio: 4, tapa: 'presion', color: '#f4f4f2', colorTapa: '#00a4e4' },
    els: [['puerta', 'frente', 0, 50, { ancho: 60, alto: 70 }], ['pomo', 'frente', 20, 50, { d: 12, alto: 10 }]] },
  tornillos: { e: '🔩', t: 'Caja de tornillos', d: 'Tapa a presión y 6 compartimentos', C: { L: 150, W: 100, H: 40, radio: 4, tapa: 'presion', color: '#8e9196', colorTapa: '#f7d117' },
    els: [['separador', 'dentro', -25, 0], ['separador', 'dentro', 25, 0], ['separador', 'dentro', 0, 0, { dir: 'x' }], ['etiqueta', 'frente', 0, 20]] },
  // 14-10-2026 · las que pidió: secreta de verdad, combinación, llave, pilas, 6 en 1 y multifunción (y herramientas y tornillos, mejores)
  secreta: { e: '🤫', t: 'Caja secreta', d: 'Tapa corredera que solo sale BOCA ABAJO (cierre por gravedad) y fondo falso', C: { L: 110, W: 80, H: 50, radio: 6, tapa: 'corredera', pared: 3.2, tapaG: 4, suelo: 2.4, color: '#2b2d42', colorTapa: '#c9a227', estilo: 'acanalada' },
    els: [['gravedad', 'dentro', -30, 12], ['fondo', 'dentro', 0, 0, { alto: 12 }]] },
  combinacion: { e: '🔢', t: 'Caja con combinación', d: 'Tres ruedas de números (diseño propio) y bisagra de tornillo', C: { L: 130, W: 90, H: 60, radio: 5, tapa: 'bisagraTor', pared: 3.2, tapaG: 3.2, color: '#1b1b1d', colorTapa: '#c9a227', estilo: 'biselada' },
    els: [['bisagra', 'atras', -35, 0, { largo: 40 }], ['bisagra', 'atras', 35, 0, { largo: 40 }], ['combinacion', 'frente', 0, 0, { codigo: '427' }]] },
  conLlave: { e: '🔑', t: 'Caja con llave', d: 'Bombín impreso con su llave: un cuarto de vuelta y no se abre', C: { L: 120, W: 85, H: 55, radio: 5, tapa: 'bisagraImp', pared: 3.2, tapaG: 3.2, color: '#7a4a2a', colorTapa: '#d4a373', estilo: 'biselada' },
    els: [['bisagra', 'atras', -30, 0, { largo: 40 }], ['bisagra', 'atras', 30, 0, { largo: 40 }], ['llave', 'frente', -20, 0, { codigo: 'LCL' }]] },
  pilas: { e: '🔋', t: 'Caja de pilas', d: 'AA y AAA de pie, cada una en su hueco, y tapa a presión', C: { L: 150, W: 90, H: 60, radio: 5, tapa: 'presion', pared: 2.6, tapaG: 2.6, labio: 4, color: '#f7d117', colorTapa: '#1b1b1d' },
    els: [['pilas', 'dentro', 0, 0, { tipo: 'aa_aaa' }], ['etiqueta', 'frente', 0, 24, { ancho: 50, alto: 18 }]] },
  seisEnUno: { e: '🧊', t: 'Caja 6 en 1', d: 'Seis cubetas sueltas que encajan dentro: cámbialas de sitio o sácalas a la mesa', C: { L: 170, W: 110, H: 50, radio: 6, tapa: 'bisagraImp', pared: 3, tapaG: 3, color: '#f4acb7', colorTapa: '#ffffff', estilo: 'acanalada' },
    els: [['bisagra', 'atras', -45, 0, { largo: 40 }], ['bisagra', 'atras', 45, 0, { largo: 40 }], ['cierre', 'frente', 0, 0, { ancho: 18 }], ['cubetas', 'dentro', 0, 0, { cols: 3, filas: 2 }]] },
  multifuncion: { e: '🗃️', t: 'Caja multifunción', d: 'Cajón abajo, bandeja arriba, dos cierres, asas y nombre', C: { L: 180, W: 120, H: 95, radio: 6, tapa: 'bisagraImp', pared: 3.2, tapaG: 3.2, suelo: 2.4, color: '#3d5a80', colorTapa: '#e0fbfc', estilo: 'biselada', pies: true },
    els: [['bisagra', 'atras', -50, 0, { largo: 44 }], ['bisagra', 'atras', 50, 0, { largo: 44 }], ['cierre', 'frente', -60, 0, { ancho: 18 }], ['cierre', 'frente', 60, 0, { ancho: 18 }], ['cajon', 'frente', 0, 0, { alto: 24 }], ['bandeja', 'dentro', 0, 0, { prof: 20, cols: 3 }], ['asa', 'izq', 0, 62, { ancho: 50, alto: 15 }], ['asa', 'der', 0, 62, { ancho: 50, alto: 15 }], ['texto', 'tapa', 0, 0, { txt: 'CelebriDiseños', alto: 9 }]] },
  herramientas2: { e: '🧰', t: 'Herramientas PRO', d: 'Bandeja que se saca, dos cierres, candado, asas y patas', C: { L: 220, W: 120, H: 90, radio: 6, tapa: 'bisagraTor', pared: 3.2, tapaG: 3.2, color: '#c8102e', colorTapa: '#1b1b1d', estilo: 'biselada', pies: true },
    els: [['bisagra', 'atras', -60, 0, { largo: 48 }], ['bisagra', 'atras', 60, 0, { largo: 48 }], ['cierre', 'frente', -70, 0, { ancho: 20 }], ['cierre', 'frente', 70, 0, { ancho: 20 }], ['candado', 'frente', 0, 0, { agujero: 6 }], ['bandeja', 'dentro', 0, 0, { prof: 24, cols: 3 }], ['asa', 'izq', 0, 60, { ancho: 60, alto: 16 }], ['asa', 'der', 0, 60, { ancho: 60, alto: 16 }]] },
  tornillos2: { e: '🔩', t: 'Tornillos PRO', d: 'Rejilla de 4 × 3 con fondo en cuenco (se cogen con un dedo)', C: { L: 170, W: 110, H: 40, radio: 5, tapa: 'presion', pared: 2.6, tapaG: 2.6, labio: 4, color: '#8e9196', colorTapa: '#f7d117', estilo: 'hexagonal' },
    els: [['rejilla', 'dentro', 0, 0, { cols: 4, filas: 3, cuencos: 1 }], ['etiqueta', 'frente', 0, 18, { ancho: 50, alto: 14 }]] }
};
export function dePlantilla(k) { const P = PLANTILLAS[k], C = Object.assign(nueva(), P.C); C.els = P.els.map(([t, c, u, v, p]) => elemento(t, c, u, v, p)); return C; }

// ---------- las caras: de (u, v) a la caja y al revés ----------
export function marco(C, cara) {
  const L = C.L, W = C.W, top = C.H + C.tapaG;
  switch (cara) {
    case 'frente': return { o: [0, -W / 2, 0], eu: [1, 0, 0], ev: [0, 0, 1], n: [0, -1, 0], hw: L / 2, v0: 0, v1: top };
    case 'atras': return { o: [0, W / 2, 0], eu: [-1, 0, 0], ev: [0, 0, 1], n: [0, 1, 0], hw: L / 2, v0: 0, v1: top };
    case 'izq': return { o: [-L / 2, 0, 0], eu: [0, -1, 0], ev: [0, 0, 1], n: [-1, 0, 0], hw: W / 2, v0: 0, v1: top };
    case 'der': return { o: [L / 2, 0, 0], eu: [0, 1, 0], ev: [0, 0, 1], n: [1, 0, 0], hw: W / 2, v0: 0, v1: top };
    case 'tapa': return { o: [0, 0, top], eu: [1, 0, 0], ev: [0, 1, 0], n: [0, 0, 1], hw: L / 2, hv: W / 2 };
    case 'dentro': return { o: [0, 0, C.suelo], eu: [1, 0, 0], ev: [0, 1, 0], n: [0, 0, 1], hw: L / 2 - C.pared, hv: W / 2 - C.pared };
  }
  return null;
}
export const aMundo = (F, u, v, n = 0) => [0, 1, 2].map(k => F.o[k] + F.eu[k] * u + F.ev[k] * v + F.n[k] * n);
// cada elemento se dibuja en las coordenadas de SU cara: x = u, y = hacia DENTRO de la caja (fuera = negativo), z = v
const matCara = F => [F.eu[0], F.eu[1], F.eu[2], 0, -F.n[0], -F.n[1], -F.n[2], 0, F.ev[0], F.ev[1], F.ev[2], 0, F.o[0], F.o[1], F.o[2], 1];
const enCara = (m, F) => m.transform(matCara(F));

// ---------- medidas que salen de la caja ----------
const holTapa = C => ENCAJES[(AJUSTES[C.ajuste] || AJUSTES.firme)[1]];
export function cierreMedidas(C) {
  // v30.6 · la patilla cuelga de la tapa y se imprime DE PIE: al doblarse tira de las capas, que es por donde el plástico aguanta
  // menos (el PLA se raja cerca del 1 %). Antes se doblaba un 2 % (0,8 mm en 11 mm) y se partía. Ahora engancha 0,5 mm y es todo
  // lo larga que deja la caja (hasta 22 mm): se estira un 0,3–0,5 %. Si la caja es baja, la patilla se hace más fina para no pasar.
  const c = 0.2, r = 0.7, diente = 0.7, enganche = r - c + 0.0; // lo que monta el diente sobre el saliente
  const sitio = Math.max(8, (C.H || 50) - (C.suelo || 2.4) - 5), La = Math.max(10, Math.min(22, Math.floor(sitio)));
  let tt = 2; while (tt > 1.2 && 1.5 * tt * enganche / (La * La) > 0.005) tt = Math.round((tt - 0.2) * 10) / 10;
  return { c, r, diente, tt, enganche, La, def: 1.5 * tt * enganche / (La * La) };
}
const LADO_HUECO = C => ({ L: C.L - 2 * C.pared, W: C.W - 2 * C.pared });
// el rectángulo que ocupa cada elemento en su cara (para que no se pisen)
export function rect(C, e) {
  if (CP.TIPOS_PRO[e.tipo]) return CP.rectPro(C, e);
  const H = C.H, tg = C.tapaG, p = e.p, u = e.u, v = e.v, T = TAPAS[C.tapa] || {};
  switch (e.tipo) {
    case 'bisagra': return { u0: u - p.largo / 2, u1: u + p.largo / 2, v0: H - 2.6 * (T.Rk || 4), v1: H + tg };
    case 'cierre': { const K = cierreMedidas(C); return { u0: u - p.ancho / 2, u1: u + p.ancho / 2, v0: H - K.La - 1, v1: H + tg }; }
    case 'candado': return { u0: u - 4.5, u1: u + 4.5, v0: H - 26, v1: H + tg };
    case 'iman': return { u0: u - p.d / 2 - 1.4, u1: u + p.d / 2 + 1.4, v0: H - p.h - 1, v1: H + tg };
    case 'asa': return { u0: u - p.ancho / 2, u1: u + p.ancho / 2, v0: v - 3 - p.alto, v1: v + 3 };
    case 'puerta': return { u0: u - p.ancho / 2 - 4, u1: u + p.ancho / 2, v0: v - p.alto / 2 - 2.5, v1: v + p.alto / 2 + 2.5 };
    case 'cable': return { u0: u - p.d / 2, u1: u + p.d / 2, v0: v - p.d / 2, v1: v + p.d / 2 };
    case 'etiqueta': return { u0: u - p.ancho / 2 - 2.5, u1: u + p.ancho / 2 + 2.5, v0: v - p.alto / 2 - 2.5, v1: v + p.alto / 2 };
    case 'pomo': return { u0: u - p.d / 2, u1: u + p.d / 2, v0: v - p.d / 2, v1: v + p.d / 2 };
    case 'separador': return p.dir === 'x' ? { u0: -C.L / 2, u1: C.L / 2, v0: v - 0.8, v1: v + 0.8 } : { u0: u - 0.8, u1: u + 0.8, v0: -C.W / 2, v1: C.W / 2 };
  }
  return null;
}
const pisa = (a, b, m = 1.5) => a.u0 < b.u1 + m && b.u0 < a.u1 + m && a.v0 < b.v1 + m && b.v0 < a.v1 + m;

// ---------- 🟩🟥 LAS ZONAS: ¿aquí está bien? ----------
// Devuelve { ok, motivo, u, v } (u y v ya «pegados» donde toca: lo de la junta va a la altura de la junta).
export function zona(C, tipo, cara, u, v, p, idIgnora) {
  const D = TIPOS[tipo]; if (!D) return { ok: false, motivo: 'No sé qué es eso.' };
  p = Object.assign({}, D.p, p || {});
  const H = C.H, tg = C.tapaG, pr = C.pared, R = C.radio, T = TAPAS[C.tapa] || {};
  const no = (motivo, extra) => Object.assign({ ok: false, motivo, u, v }, extra || {}), si = (motivo, extra) => Object.assign({ ok: true, motivo, u, v }, extra || {});
  if (!D.caras.includes(cara)) return no('«' + D.t + '» va ' + D.caras.map(c => CARAS[c].toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' o $1') + '.');
  // 14-10-2026 · 🛑 el LIMITADOR: cuántos como mucho de cada uno, y lo que no va con la tapa corredera
  const no0 = porQueNo(C, tipo, idIgnora); if (no0) return no(no0);
  const F = marco(C, cara), uso = F.hw - R - 1; // lo recto de la cara (sin la esquina redondeada)
  if (D.junta) v = H;
  const otros = C.els.filter(e => e.id !== idIgnora && e.cara === cara), yo = rect(C, { tipo, cara, u, v, p });
  const choca = otros.find(e => e.tipo !== 'pomo' && e.tipo !== 'separador' && (cara !== 'dentro') && pisa(rect(C, e), yo));
  const nombre = e => TIPOS[e.tipo].t.toLowerCase();
  if (CP.TIPOS_PRO[tipo]) return CP.zonaPro(C, tipo, cara, u, v, p, idIgnora, { no, si, uso, choca, nombre: e => 'el ' + nombre(e), rectDe: e => rect(C, e), marco: c => marco(C, c), Rk: conBisagra(C) ? (T.Rk || 0) : 0 });
  switch (tipo) {
    case 'bisagra': {
      if (!conBisagra(C)) return no('Con la tapa a presión no hay bisagras: elige arriba una tapa con bisagra.');
      if (Math.abs(u) + p.largo / 2 > uso - 1) return no('Muy cerca de la esquina: la bisagra tiene que caber en lo recto (como mucho ' + n1(2 * (uso - 1)) + ' mm de punta a punta).');
      if (choca) return no('Se pisa con ' + (choca.tipo === 'bisagra' ? 'otra bisagra' : 'el ' + nombre(choca)) + '.');
      return si('Aquí la tapa gira bien.');
    }
    case 'cierre': case 'candado': case 'iman': {
      if (conBisagra(C) && cara === 'atras') return no('Detrás van las bisagras: ' + (tipo === 'iman' ? 'el imán' : 'el cierre') + ' va delante o en un lado.');
      const media = (rect(C, { tipo, cara, u, v, p }).u1 - rect(C, { tipo, cara, u, v, p }).u0) / 2;
      if (Math.abs(u) + media > uso) return no('Muy cerca de la esquina redondeada: muévelo hacia el centro.');
      if (tipo === 'cierre') { const K = cierreMedidas(C); if (H - K.La < C.suelo + 4) return no('La caja es muy baja para la patilla del cierre (necesita ' + K.La + ' mm): súbela o usa imanes.'); }
      if (tipo === 'candado' && H < 30) return no('La caja es muy baja para las orejetas del candado (hace falta 30 mm de alto).');
      if (tipo === 'iman') {
        if (tg < p.h + 0.4) return no('La tapa mide ' + n1(tg) + ' mm: para enrasar su pareja hace falta ' + n1(p.h + 0.4) + ' (sube el grosor de la tapa o usa un imán más fino).');
        if (C.H < p.h + C.suelo + 6) return no('La caja es muy baja para la columnita del imán.');
      }
      if (choca) return no('Se pisa con el ' + nombre(choca) + '.');
      return si(tipo === 'iman' ? 'Aquí los dos imanes se juntan al cerrar.' : 'Aquí engancha bien.');
    }
    case 'pomo': {
      if (cara === 'tapa') {
        if (Math.abs(u) + p.d / 2 > C.L / 2 - R - 2 || Math.abs(v) + p.d / 2 > C.W / 2 - R - 2) return no('Se sale de la tapa: muévelo hacia dentro.');
        if (conBisagra(C) && v + p.d / 2 > C.W / 2 - 10) return no('Muy pegado a la bisagra: lejos de ella cuesta menos abrir (y no estorba al girar).');
        const otro = C.els.find(e => e.id !== idIgnora && e.cara === 'tapa' && Math.hypot(e.u - u, e.v - v) < (e.p.d + p.d) / 2 + 2); if (otro) return no('Se pisa con otro pomo.');
        return si(conBisagra(C) ? 'Aquí: lejos de la bisagra, la tapa se abre con un dedo.' : 'Aquí está bien.');
      }
      const pu = otros.find(e => e.tipo === 'puerta' && Math.abs(u - e.u) <= e.p.ancho / 2 - p.d / 2 - 2 && Math.abs(v - e.v) <= e.p.alto / 2 - p.d / 2 - 2);
      if (!pu) return no('En un lateral, el pomo va EN una puerta (pon antes una puerta).');
      if (u - (pu.u - pu.p.ancho / 2) < 9) return no('Pegado a la bisagra de la puerta: ponlo hacia el otro lado (cuesta menos abrir).');
      return si('Aquí, en la puerta, se abre bien.', { puerta: pu.id });
    }
    case 'asa': case 'etiqueta': case 'cable': case 'puerta': {
      const r = yo, techo = conBisagra(C) ? H - 3 : H - Math.max(C.labio, 0) - 2;
      if (Math.abs(u) + (r.u1 - r.u0) / 2 > uso - (tipo === 'puerta' ? pr : 0)) return no('Se sale de lo recto de la cara: muévelo al centro o hazlo más pequeño.');
      if (r.v0 < (tipo === 'asa' ? 0 : C.suelo + 1)) return no('Muy abajo: ' + (tipo === 'asa' ? 'el asa tocaría la mesa.' : 'chocaría con el suelo de la caja.'));
      const sube = C.els.filter(e => e.cara === cara && TIPOS[e.tipo].junta && e.id !== idIgnora).map(e => rect(C, e).v0);
      const tope = Math.min(techo, ...sube.map(x => x - 1.5));
      if (r.v1 > tope) return no(sube.length && tope < techo ? 'Muy arriba: choca con el cierre o la bisagra de esta cara.' : (conBisagra(C) ? 'Muy arriba: pegado a la tapa.' : 'Muy arriba: ahí entra el labio de la tapa.'));
      if (choca) return no('Se pisa con ' + (choca.tipo === tipo ? 'otro ' + nombre(choca) : 'el ' + nombre(choca)) + '.');
      if (tipo === 'asa' && p.alto < 13) return si('Cabe, pero con menos de 13 mm hacia fuera no entran bien los dedos.', { aviso: true });
      return si({ asa: 'Aquí se coge bien.', etiqueta: 'Aquí se lee bien.', cable: 'Aquí pasa el cable.', puerta: 'Aquí la puerta abre sin chocar.' }[tipo]);
    }
    case 'separador': {
      const I = LADO_HUECO(C), dir = p.dir === 'x' ? 'x' : 'y', pos = dir === 'y' ? u : v, lim = (dir === 'y' ? I.L : I.W) / 2;
      if (Math.abs(pos) > lim - 8) return no('Muy pegado a la pared: deja al menos 8 mm para que quepan los dedos.');
      const ll = C.els.filter(e => e.tipo === 'llave').map(e => CP.llaveSitio(C, e, marco(C, e.cara))); // (14-10: la cuña de la cerradura de llave gira ahí dentro)
      if (ll.some(B => dir === 'y' ? pos > B.x0 - 1.5 && pos < B.x1 + 1.5 : pos > B.y0 - 1.5 && pos < B.y1 + 1.5)) return no('Ahí gira la leva de la cerradura de llave: muévelo un poco.');
      const par = C.els.find(e => e.id !== idIgnora && e.tipo === 'separador' && (e.p.dir === 'x' ? 'x' : 'y') === dir && Math.abs((dir === 'y' ? e.u : e.v) - pos) < 8);
      if (par) return no('Muy pegado a otro separador (menos de 8 mm).');
      return si('Aquí queda un compartimento de ' + n1(lim + pos - 0.8) + ' y otro de ' + n1(lim - pos - 0.8) + ' mm.');
    }
  }
  return si('');
}

// ---------- 🔨 LA GEOMETRÍA ----------
// → { cuerpo, tapa, sueltas: [{ id, nombre, m (en su sitio), imprimir (para la cama), con: 'tapa' | 'puerta:<id>' | null }],
//     puertas: [{ id, m, eje: { o, dir } }], eje (de la tapa: { o, dir }), avisos, piezas }
export function construye(C) {
  const L = C.L, W = C.W, H = C.H, pr = C.pared, sf = C.suelo, tg = C.tapaG, R = Math.max(0, Math.min(C.radio, Math.min(L, W) / 2 - 1)), T = TAPAS[C.tapa] || TAPAS.presion;
  if (pr < 1.6) N.mal('Las paredes tienen que medir al menos 1,6 mm (con menos se parten).');
  if (L - 2 * pr < 10 || W - 2 * pr < 10 || H < sf + 8) N.mal('La caja es demasiado pequeña para sus paredes.');
  const corr = C.tapa === 'corredera', LI0 = L - 2 * pr, WI0 = W - 2 * pr, RI0 = Math.max(0.3, R - pr);
  let cuerpo = prisma(L, W, R, 0, H + (corr ? tg : 0)).subtract(prisma(LI0, WI0, RI0, sf, H + tg + 1));
  let tapa = prisma(L, W, R, H, H + tg);
  if (corr) { const TC = CP.tapaCorredera({ L, W, H, pr, tg, LI: LI0, WI: WI0 }); tapa = TC.tapa; cuerpo = cuerpo.subtract(TC.corte); }
  ({ cuerpo, tapa } = CP.aplicaEstilo({ C, L, W, H, tg, R, marco, enCara }, cuerpo, tapa)); // 14-10: biselada, acanalada, panal, patas
  const masC = [], menosC = [], masT = [], menosT = [], sueltas = [], puertas = [], avisos = [], mec = [];
  if (T.fragil) avisos.push('La bisagra de clic se raja al engancharla: cámbiala por la de eje impreso, la de filamento o la de tornillo.');
  if (pr < 2.4 || tg < 2.4) avisos.push('Paredes o tapa de menos de 2,4 mm: con bisagras y cierres conviene 3 mm (lo fino se parte).');
  const LI = L - 2 * pr, WI = W - 2 * pr, RI = Math.max(0.3, R - pr);
  // el labio de la tapa: a presión (alto «labio», con tu holgura) o, con bisagra, un labio corto que la centra al cerrar
  if (!corr) { const hol = conBisagra(C) ? 0.3 : holTapa(C), alto = conBisagra(C) ? 1.6 : C.labio, g = 1.6;
    const fuera = prisma(LI - 2 * hol, WI - 2 * hol, Math.max(0.3, RI - hol), H - alto, H + 0.01), dentro = prisma(LI - 2 * hol - 2 * g, WI - 2 * hol - 2 * g, Math.max(0.3, RI - hol - g), H - alto - 1, H + 0.02);
    masT.push(fuera.subtract(dentro)); }
  // ---- las BISAGRAS de la tapa: eje a lo largo de X, detrás, a la altura de la junta ----
  let eje = null;
  const bis = C.els.filter(e => e.tipo === 'bisagra');
  if (conBisagra(C)) {
    if (!bis.length) avisos.push('La tapa es de bisagra pero no has puesto ninguna: arrastra 🔗 Bisagra al borde de atrás.');
    const Rk = T.Rk, ay = W / 2 + Rk, az = H, gap = 0.4, ga = 0.5; eje = { o: [0, ay, az], dir: [1, 0, 0] };
    bis.forEach(e => {
      const xc = -e.u, x0 = xc - e.p.largo / 2, x1 = xc + e.p.largo / 2, n = impar(e.p.largo / 9), s = (e.p.largo - (n - 1) * ga) / n;
      for (let i = 0; i < n; i++) {
        const a = x0 + i * (s + ga), b = a + s;
        if (i % 2 === 0) { // nudo de la CAJA (con su escuadra a 45° para imprimirse sin soportes)
          masC.push(M().hull([cilX(Rk, a, b, ay, az), cubo(a, b, W / 2 - 0.6, W / 2 + 0.01, H - 2.6 * Rk, H)]).intersect(cubo(a - 1, b + 1, W / 2 - 1, ay + Rk + 1, H - 3 * Rk, H)).add(cilX(Rk, a, b, ay, az))); // (por encima de la junta, solo el cilindro: no roza la tapa)
          menosT.push(cilX(Rk + gap, a - ga, b + ga, ay, az));
          if (C.tope !== false) { // v30 · TOPE: un saliente encima del nudo (detrás) donde el borde de la tapa se apoya a unos 105°: se queda abierta
            const arco = (r, a0, a1) => Array.from({ length: 9 }, (_, j) => { const t = (a0 + (a1 - a0) * j / 8) * Math.PI / 180; return [ay + r * Math.cos(t), az + r * Math.sin(t)]; });
            masC.push(perfilX(arco(Rk - 0.4, -45, 46).concat(arco(Rk + 1.6, 46, -45)), a + 0.3, b - 0.3)); // (por debajo, a 45°: sin soportes)
          }
        } else { // nudo de la TAPA (plano por arriba: la tapa se imprime boca abajo)
          masT.push(M().hull([cilX(Rk, a, b, ay, az), cubo(a, b, W / 2 - 0.6, W / 2 + 0.01, H, H + tg)]).intersect(cubo(a - 1, b + 1, W / 2 - 1, ay + Rk + 1, H, H + tg)).add(cilX(Rk, a, b, ay, az)).intersect(cubo(a - 1, b + 1, W / 2 - 1, ay + Rk + 1, H - Rk - 1, H + tg))); // (por debajo de la junta, solo el cilindro: no roza la pared)
          menosC.push(cilX(Rk + gap, a - ga, b + ga, ay, az));
        }
      }
      if (C.tapa === 'bisagraClic') {
        masC.push(cilX(T.pin / 2, x0 + 0.01, x1 - 0.01, ay, az)); // el eje, de la caja
        const rH = T.pin / 2 + T.hTapa; for (let i = 1; i < n; i += 2) { const a = x0 + i * (s + ga), b = a + s; menosT.push(cilX(rH, a - 0.1, b + 0.1, ay, az)); menosT.push(cubo(a - 0.1, b + 0.1, 0, Rk + 2, -T.boca / 2, T.boca / 2).rotate([-45, 0, 0]).translate([0, ay, az])); }
      } else {
        if (C.tapa === 'bisagraTor') { const aUlt = x0 + (n - 1) * (s + ga); // el tornillo pasa libre por todos los nudos y se ROSCA en el último de la caja
          menosC.push(cilX(T.pin / 2 + T.hEje, x0 - 1, aUlt + 0.01, ay, az)); menosC.push(cilX(T.rosca, aUlt - 0.01, x1 + 1, ay, az)); menosC.push(cilX(3.1, x0 - 1.2, x0 + 2.2, ay, az)); // (y el hueco de la cabeza, Ø6,2 × 2,2)
        } else menosC.push(cilX(T.pin / 2 + T.hEje, x0 - 1, x1 + 1, ay, az));
        menosT.push(cilX(T.pin / 2 + T.hTapa, x0 - 1, x1 + 1, ay, az));
        if (C.tapa === 'bisagraImp') { // el pasador: Ø4 con cabeza, plano por debajo para que apoye
          const lp = e.p.largo + 0.6, pin = cilX(T.pin / 2, 0, lp).add(cilX(T.pin, -1.6, 0.01)).intersect(cubo(-2, lp + 1, -5, 5, -T.pin / 2 + 0.3, 5));
          sueltas.push({ id: 'pin:' + e.id, nombre: 'Pasador de la bisagra', m: pin.translate([x0 - 0.3, ay, az]), imprimir: pin.translate([0, 0, T.pin / 2 - 0.3]), con: null, nota: 'por el lado de la cabeza' });
        }
      }
    });
  } else if (bis.length) avisos.push('Hay bisagras pero la tapa es a presión: no se usan (cambia la tapa o quítalas).');
  // ---- los demás elementos, cada uno en su cara ----
  C.els.forEach(e => {
    if (e.tipo === 'bisagra') return;
    const F = marco(C, e.cara), p = e.p, u = e.u, v = e.v, Z = zona(C, e.tipo, e.cara, u, v, p, e.id);
    if (!Z.ok) avisos.push(TIPOS[e.tipo].e + ' ' + TIPOS[e.tipo].t + ' (' + CARAS[e.cara].toLowerCase() + '): ' + Z.motivo);
    if (porQueNo(C, e.tipo, e.id, true)) return; // (14-10: lo que no va con esta tapa —un cierre con la corredera…— no se construye: saldría suelto)
    if (CP.TIPOS_PRO[e.tipo]) return; // (los nuevos se hacen en cajas_pro.js, abajo)
    const enF = m => enCara(m, F);
    switch (e.tipo) {
      case 'cierre': {
        const K = cierreMedidas(C), w = p.ancho, yT = -(K.r + K.c), zr0 = H - K.La + 2.4, zt1 = zr0 - 0.1;
        masT.push(enF(cubo(u - w / 2, u + w / 2, yT - K.tt, 0.01, H, H + tg)));                         // el puente que la une a la tapa
        masT.push(enF(cubo(u - w / 2, u + w / 2, yT - K.tt, yT, H - K.La, H + tg)));                      // la patilla
        masT.push(enF(cubo(u - w / 2, u + w / 2, yT - K.tt - 1.5, yT - K.tt + 0.01, H - K.La, H - K.La + 2))); // la uña para abrir
        masT.push(enF(perfilX([[yT - 0.01, zt1], [-K.c, zt1], [-K.c, zt1 - 0.5], [yT - 0.01, zt1 - 0.5 - 1.6 * K.diente]], u - w / 2, u + w / 2))); // el diente (rampa abajo)
        masC.push(enF(perfilX([[0.01, zr0], [-K.r, zr0], [-K.r, zr0 + 0.5], [0.01, zr0 + 0.5 + 1.6 * K.r]], u - w / 2 + 0.5, u + w / 2 - 0.5))); // el saliente de la caja
        break;
      }
      case 'candado': {
        const ag = p.agujero / 2 + 0.25, hy = -8, hz = H - 6;
        masC.push(enF(perfilX([[0.01, H - 26], [0.01, H - 0.6], [-14, H - 0.6], [-14, H - 12]], u + 0.6, u + 3.6)).subtract(enF(cilX(ag, u - 6, u + 6, hy, hz))));
        masT.push(enF(perfilX([[0.01, H + tg], [-14, H + tg], [-14, H - 12], [-0.25, H - 12], [-0.25, H], [0.01, H]], u - 3.6, u - 0.6)).subtract(enF(cilX(ag, u - 6, u + 6, hy, hz)))); // (0,25 de aire con la pared)
        break;
      }
      case 'iman': { // una columnita pegada a la pared (de abajo arriba: se imprime sola) con el hueco arriba; la pareja, en la tapa
        const r = p.d / 2 + ENCAJES.presion, rb = p.d / 2 + 1.2, yb = pr + rb - 1;
        masC.push(enF(cilZ(rb, sf - 0.01, H, u, yb)));
        menosC.push(enF(cilZ(r, H - p.h - 0.2, H + 1, u, yb))); menosT.push(enF(cilZ(r, H - 1, H + p.h, u, yb)));
        menosT.push(enF(cilZ(rb + 0.35, H - Math.max(C.labio, 2) - 1, H + 0.01, u, yb))); // el labio de la tapa le deja sitio
        break;
      }
      case 'asa': {
        const a = p.alto, w = p.ancho;
        [[u - w / 2, u - w / 2 + 5], [u + w / 2 - 5, u + w / 2]].forEach(([x0, x1]) => masC.push(enF(perfilX([[0.01, v + 3], [-a, v + 3], [-a, v - 3], [0.01, v - 3 - a]], x0, x1))));
        masC.push(enF(cubo(u - w / 2, u + w / 2, -a, -a + 5, v - 3, v + 3)));
        break;
      }
      case 'cable': menosC.push(enF(cilY(p.d / 2, -1, pr + 1, u, v))); break;
      case 'etiqueta': {
        const w = p.ancho, hh = p.alto, xa = u - w / 2, xb = u + w / 2, za = v - hh / 2, zb = v + hh / 2;
        [[xa - 2.5, xa + 0.01], [xb - 0.01, xb + 2.5]].forEach(([x0, x1]) => masC.push(enF(cubo(x0, x1, -1.0, 0.01, za - 2.5, zb))));
        masC.push(enF(cubo(xa - 2.5, xb + 2.5, -1.0, 0.01, za - 2.5, za + 0.01)));
        [[xa - 2.5, xa + 2], [xb - 2, xb + 2.5]].forEach(([x0, x1]) => masC.push(enF(cubo(x0, x1, -1.8, -0.99, za - 2.5, zb))));
        masC.push(enF(cubo(xa - 2.5, xb + 2.5, -1.8, -0.99, za - 2.5, za + 2)));
        break;
      }
      case 'separador': {
        const top = H - (conBisagra(C) ? 2.5 : C.labio + 0.6);
        masC.push(p.dir === 'x' ? cubo(-LI / 2 - 0.01, LI / 2 + 0.01, v - 0.8, v + 0.8, sf - 0.01, top) : cubo(u - 0.8, u + 0.8, -WI / 2 - 0.01, WI / 2 + 0.01, sf - 0.01, top));
        break;
      }
      case 'puerta': {
        // PUERTA DE CLIC: el eje (Ø3) es de la caja, de arriba abajo del hueco; la puerta lleva dos o tres «C» que se enganchan
        // apretando. Se imprime TUMBADA (cara de fuera en la cama). El eje va metido 2,5 mm en la pared (las C no asoman fuera).
        const w = p.ancho, hh = p.alto, u0 = u - w / 2, u1 = u + w / 2, v0 = v - hh / 2, v1 = v + hh / 2, g = 0.3, rp = 1.5, Rk = 3.4, ya = Math.min(2.5, pr + 0.1), gap = 0.35, boca = 2.5;
        menosC.push(enF(cubo(u0, u1, -1, pr + 1, v0, v1)));                                                  // el hueco
        menosC.push(enF(cilZ(Rk + gap, v0 - 0.01, v1 + 0.01, u0, ya)), enF(cubo(u0 - Rk - gap, u0 + 0.01, -1, pr + 1, v0, v1))); // donde gira la puerta (sin dejar una lámina de pared)
        masC.push(enF(cilZ(rp, v0 - 1.5, v1 + 1.5, u0, ya)));                                               // el eje
        masC.push(enF(cubo(u0 - 1.6, u0 + 1.6, 0, ya + 2, v1 - 0.01, v1 + 2.5)), enF(cubo(u0 - 1.6, u0 + 1.6, 0, ya + 2, v0 - 2.5, v0 + 0.01))); // sus apoyos
        let pu = cubo(u0 + g, u1 - g, 0, pr, v0 + g, v1 - g).subtract(cilZ(rp + gap, v0 - 1, v1 + 1, u0, ya));
        const nk = hh > 50 ? 3 : 2, S = hh - 2 * g - 4, hk = Math.min(10, S / (2 * nk - 1)), zs = Array.from({ length: nk }, (_, i) => v0 + g + 2 + (i + 0.5) * S / nk);
        zs.forEach(z => { const a = z - hk / 2, b = z + hk / 2;
          let k = M().hull([cilZ(Rk, a, b, u0, ya), cubo(u0 + Rk, u0 + Rk + 2, 0, pr, a, b)]).intersect(cubo(u0 - Rk - 1, u0 + Rk + 3, 0, ya + Rk + 1, a, b));
          k = k.subtract(cilZ(rp + 0.2, a - 1, b + 1, u0, ya)).subtract(cubo(-boca / 2, boca / 2, -Rk - 2, 0, a - 1, b + 1).rotate([0, 0, -45]).translate([u0, ya, 0])); pu = pu.add(k); });
        // el pomo que vaya en esta puerta
        C.els.filter(x => x.tipo === 'pomo' && x.cara === e.cara && Math.abs(x.u - u) <= w / 2 && Math.abs(x.v - v) <= hh / 2).forEach(x => { pu = pu.subtract(cilY(3.05, -1, pr + 1, x.u, x.v)); });
        const eW = aMundo(F, u0, v0, -ya), dW = F.ev.slice();
        puertas.push({ id: e.id, m: enF(pu), local: pu, eje: { o: eW, dir: dW }, F, u0, ya });
        break;
      }
      case 'pomo': {
        const d = p.d, a = p.alto, espiga = (e.cara === 'tapa' ? tg : pr) - 0.2;
        let k = cilZ(d * 0.28, 0, a * 0.55 + 0.01).add(M().cylinder(a * 0.45, d / 2, d / 2 - 1, segs(d)).translate([0, 0, a * 0.55])).add(cilZ(3, -espiga, 0.01));
        if (e.cara === 'tapa') {
          menosT.push(cilZ(3.05, H - 1, H + tg + 1, u, v));
          sueltas.push({ id: 'pomo:' + e.id, nombre: 'Pomo', m: k.translate([u, v, H + tg]), imprimir: N.aLaCama(k.rotate([180, 0, 0])), con: 'tapa', nota: 'a presión en su agujero' });
        } else {
          const Z2 = zona(C, 'pomo', e.cara, u, v, p, e.id);
          const kl = k.rotate([90, 0, 0]).translate([u, 0, v]); // en la cara: hacia fuera (−y)
          sueltas.push({ id: 'pomo:' + e.id, nombre: 'Pomo de la puerta', m: enF(kl), imprimir: N.aLaCama(k.rotate([180, 0, 0])), con: Z2.puerta ? 'puerta:' + Z2.puerta : null, nota: 'a presión en la puerta' });
        }
        break;
      }
    }
  });
  CP.construyePro({ C, L, W, H, pr, sf, tg, R, LI, WI, RI, masC, menosC, masT, menosT, sueltas, avisos, mec, marco, enCara, porQueNo });
  if (masC.length) cuerpo = cuerpo.add(N.union(masC));
  if (menosC.length) cuerpo = cuerpo.subtract(N.union(menosC));
  if (masT.length) tapa = tapa.add(N.union(masT));
  if (menosT.length) tapa = tapa.subtract(N.union(menosT));
  return { cuerpo, tapa, sueltas, puertas, eje, avisos, mec };
}

// ---------- girar piezas (para animar y para comprobar) ----------
// matriz 4×4 (columnas) de girar «ang» grados alrededor del eje { o, dir }
export function giro(eje, ang) {
  const [x, y, z] = eje.dir, l = Math.hypot(x, y, z), a = x / l, b = y / l, c = z / l, t = ang * Math.PI / 180, co = Math.cos(t), s = Math.sin(t), k = 1 - co;
  const R = [[co + a * a * k, a * b * k - c * s, a * c * k + b * s], [b * a * k + c * s, co + b * b * k, b * c * k - a * s], [c * a * k - b * s, c * b * k + a * s, co + c * c * k]];
  const o = eje.o, tr = [0, 1, 2].map(i => o[i] - (R[i][0] * o[0] + R[i][1] * o[1] + R[i][2] * o[2]));
  return [R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, tr[0], tr[1], tr[2], 1];
}
// la tapa se ABRE girando hacia atrás (el borde de delante sube): ángulo negativo alrededor de +X
export const giroTapa = (G, ang) => giro(G.eje, -ang);
// la puerta se abre hacia fuera: alrededor de su eje vertical, en el sentido que saca la puerta de la caja
export function giroPuerta(P, ang) { const n = P.F.n, d = P.eje.dir, eu = P.F.eu, cr = [d[1] * eu[2] - d[2] * eu[1], d[2] * eu[0] - d[0] * eu[2], d[0] * eu[1] - d[1] * eu[0]], s = Math.sign(cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2]) || 1; return giro(P.eje, s * ang); } // (eje × u) · fuera: el sentido que saca la puerta
const mueve = (m, M4) => m.transform(M4);

// ---------- 🧪 COMPROBAR: montarla en el ordenador ----------
export function comprueba(C) {
  const out = { lista: [], apertura: null, puertas: [], cierre: null };
  const ok = (t, d) => out.lista.push({ ok: true, t, d }), mal = (t, d) => out.lista.push({ ok: false, t, d }), ojo = (t, d) => out.lista.push({ ok: null, t, d });
  try {
    const G = construye(C), mesa = cubo(-2000, 2000, -2000, 2000, -100, 0);
    G.avisos.forEach(a => mal('Elemento en zona roja', a));
    const conTapa = N.union([G.tapa].concat(G.sueltas.filter(s => s.con === 'tapa').map(s => s.m)));
    const fijo = G.cuerpo;
    const toque = (a, b) => { const x = a.intersect(b); const v = x.isEmpty() ? 0 : x.volume(); return v; };
    const v0 = Math.max(0, toque(conTapa, fijo)); // (sin el «-0»)
    if (v0 < 0.5) ok('Cerrada, la tapa no roza nada', 'Volumen que se pisa: ' + n2(v0) + ' mm³.'); else mal('Cerrada, la tapa se pisa con la caja', n2(v0) + ' mm³ ocupan el mismo sitio: revisa los elementos de la junta.');
    // abrir la tapa con otras cosas en medio (los pestillos, las levas): bisagra = grados que se abre; a presión o corredera = −1 si sale, 0 si no
    const abreTapa = extra => { const obst = N.union([fijo, mesa].concat(extra || []));
      if (conBisagra(C) && G.eje) { let m = 0; for (let a = 1; a <= 180; a += a < 20 ? 1 : 5) { if (toque(mueve(conTapa, giroTapa(G, a)), obst) > 0.5) break; m = a; } return m; } // (de grado en grado al principio: un gancho fino no puede «saltar» un pestillo)
      if (C.tapa === 'corredera') { for (let d = 1; d <= C.L + 6; d += 3) if (toque(conTapa.translate([d, 0, 0]), obst) > 0.5) return 0; return -1; }
      for (let d = 0.5; d <= (C.labio || 5) + 3; d += 0.5) if (toque(conTapa.translate([0, 0, d]), obst) > 0.5) return 0; return -1; };
    if (C.tapa === 'corredera') { const a = abreTapa([]); out.apertura = a; if (a === -1) ok('La tapa corre y sale entera por la derecha', 'Montada en el ordenador: corre ' + Math.round(C.L) + ' mm por sus ranuras sin tocar nada.'); else mal('La tapa corredera se traba', 'Algo se pisa en las ranuras.'); }
    if (conBisagra(C) && G.eje) {
      let max = 0; const obst = fijo.add(mesa);
      for (let a = 5; a <= 200; a += 5) { if (toque(mueve(conTapa, giroTapa(G, a)), obst) > 0.5) break; max = a; }
      out.apertura = max;
      if (max >= 95 && max <= 125 && C.tope !== false) ok('La tapa se abre hasta ' + max + '° y se queda abierta', 'Montada en el ordenador, de 5 en 5 grados: a esa altura el borde de la tapa se apoya en el tope de la bisagra.');
      else if (max >= 200) ok('La tapa se abre del todo (más de 180°) sin chocar', 'Montada en el ordenador, de 5 en 5 grados (con la mesa debajo). Hacia atrás no tiene tope: abierta, apóyala en la mesa.');
      else if (max >= 95) ok('La tapa se abre hasta ' + max + '° sin chocar', 'Montada en el ordenador, de 5 en 5 grados (con la mesa debajo).');
      else if (max > 0) mal('La tapa solo se abre ' + max + '°', 'Algo choca al abrir (un pomo, un asa o un cierre de atrás): muévelo.');
      else mal('La tapa no puede abrirse', 'Algo la bloquea desde el principio.');
    }
    G.puertas.forEach(P => {
      const con = N.union([P.m].concat(G.sueltas.filter(s => s.con === 'puerta:' + P.id).map(s => s.m))), obst = fijo.add(mesa);
      const c0 = toque(con, fijo); let max = 0;
      for (let a = 5; a <= 180; a += 5) { if (toque(mueve(con, giroPuerta(P, a)), obst) > 0.5) break; max = a; }
      out.puertas.push({ id: P.id, apertura: max, cerrada: c0 });
      if (c0 > 0.5) mal('Una puerta roza cerrada', n2(c0) + ' mm³.');
      else if (max >= 90) ok('La puerta se abre hasta ' + max + '° sin chocar', 'Con su pomo, de 5 en 5 grados.');
      else mal('La puerta solo se abre ' + max + '°', 'Algo choca al abrirla: muévela o quita lo que estorba.');
    });
    const ci = C.els.filter(e => e.tipo === 'cierre');
    if (ci.length) { const K = cierreMedidas(C); out.cierre = K; ok('El cierre engancha ' + n2(K.enganche) + ' mm', 'La patilla mide ' + K.La + ' mm y al cerrar se dobla ' + n2(K.enganche) + ' mm: un ' + n1(K.def * 100) + ' % (se imprime de pie: entre capas el PLA aguanta cerca del 1 %; el PETG, más). Grosor de la patilla: ' + n2(K.tt) + ' mm.'); if (K.def > 0.0051) ojo('El cierre se dobla un ' + n1(K.def * 100) + ' %', 'En PLA puede partirse: sube la caja (la patilla será más larga) o imprímelo en PETG.'); }
    const im = C.els.filter(e => e.tipo === 'iman');
    if (im.length) ok(im.length + ' pareja' + (im.length > 1 ? 's' : '') + ' de imanes alineadas', 'Pon los de la tapa con el otro polo hacia abajo (que se atraigan). Una gota de pegamento si bailan.');
    if (!ci.length && !im.length && !C.els.some(e => ['candado', 'combinacion', 'llave'].includes(e.tipo)) && conBisagra(C)) ojo('No lleva cierre', 'Se queda cerrada por su peso; si quieres que no se abra sola, arrastra un 🔒 cierre o un 🧲 imán.');
    out.lista.push(...CP.compruebaPro(C, G, { toque, abreTapa, enCara }));
    if (C.tapa === 'presion') ok('Tapa a presión: ' + (AJUSTES[C.ajuste] || AJUSTES.firme)[0].toLowerCase(), 'El labio entra con ' + n2(holTapa(C)) + ' mm por lado (tu holgura «' + (AJUSTES[C.ajuste] || AJUSTES.firme)[1] + '»).');
    out.piezas = piezasDe(C, G).map(p => p.nombre);
  } catch (e) { mal('No se ha podido montar', e.message || String(e)); }
  finally { N.limpia(); }
  return out;
}

// ---------- 🖨️ PARA IMPRIMIR: cada pieza en su postura (sin soportes) y colocadas en la cama ----------
export function piezasDe(C, G) {
  G = G || construye(C);
  const L = [{ nombre: 'Caja', m: N.aLaCama(G.cuerpo), color: C.color, como: 'de pie, como se usa' },
    C.tapa === 'corredera' ? { nombre: 'Tapa corredera', m: N.aLaCama(G.tapa), color: C.colorTapa, como: 'tal cual (lo de abajo en la cama: así sus cantos no cuelgan)' } : { nombre: 'Tapa', m: N.aLaCama(G.tapa.rotate([180, 0, 0])), color: C.colorTapa, como: 'boca abajo (la cara de fuera en la cama)' }];
  G.puertas.forEach((P, i) => L.push({ nombre: 'Puerta' + (G.puertas.length > 1 ? ' ' + (i + 1) : ''), m: N.aLaCama(P.local.rotate([90, 0, 0])), color: C.colorTapa, como: 'tumbada (la cara de fuera en la cama)' }));
  G.sueltas.forEach(s => L.push({ nombre: s.nombre, m: s.imprimir, color: s.tapaColor || s.nombre.startsWith('Pomo') ? C.colorTapa : C.color, como: s.nota || '' }));
  return L;
}
export function colocaEnCama(L, cama = 250, sep = 6) {
  let x = 0, y = 0, fila = 0; const out = [];
  L.forEach(p => { const b = N.caja(p.m), w = b.dims[0], d = b.dims[1];
    if (x > 0 && x + w > cama) { x = 0; y += fila + sep; fila = 0; }
    out.push(Object.assign({}, p, { m: p.m.translate([x - b.min[0], y - b.min[1], -b.min[2]]) })); x += w + sep; fila = Math.max(fila, d); });
  return out;
}
// ---------- 🛑 EL LIMITADOR y el CONTROLADOR DE ERRORES (que no salga nada mal) ----------
// ¿cabe en la impresora? ¿hay algo en zona roja? ¿le falta algo? → [{ t, arreglo, id? }]
export const altoTotal = C => C.H + C.tapaG + (C.pies ? 3 : 0) + (C.els.some(e => e.tipo === 'gravedad') ? CP.gravBoss(C.tapaG) : 0);
export function revisa(C) {
  const I = CP.IMPRESORAS[C.impresora] || CP.IMPRESORAS.p1p, out = [];
  if (C.L > I.cama - 6 || C.W > I.cama - 6) out.push({ t: 'No cabe en la cama de tu ' + I.t + ': la caja mide ' + n1(C.L) + ' × ' + n1(C.W) + ' mm y caben ' + (I.cama - 6) + '.', arreglo: 'medidas' });
  if (altoTotal(C) > I.alto - 2) out.push({ t: 'Mide ' + n1(altoTotal(C)) + ' mm de alto: más de lo que imprime tu ' + I.t + '.', arreglo: 'medidas' });
  if (conBisagra(C) && (C.pared < 2.4 || C.tapaG < 2.4)) out.push({ t: 'Con bisagras, paredes y tapa de menos de 2,4 mm se parten.', arreglo: 'grosor' });
  if (conBisagra(C) && !C.els.some(e => e.tipo === 'bisagra')) out.push({ t: 'La tapa es de bisagra pero no tiene ninguna bisagra.', arreglo: 'bisagras' });
  C.els.forEach(e => { const Z = zona(C, e.tipo, e.cara, e.u, e.v, e.p, e.id); if (!Z.ok) out.push({ t: TIPOS[e.tipo].e + ' ' + TIPOS[e.tipo].t + ': ' + Z.motivo, arreglo: 'mover', id: e.id }); });
  return out;
}
// el sitio BUENO más cercano (en la misma cara): se busca alrededor, cada vez más lejos → la zona buena (con su u, v) o null
export function sitioBueno(C, tipo, cara, u, v, p, id) {
  const D = TIPOS[tipo], F = marco(C, cara); if (!D || !F) return null;
  const Z0 = zona(C, tipo, cara, u, v, p, id); if (Z0.ok) return Object.assign({ dist: 0 }, Z0);
  const plano = cara === 'tapa' || cara === 'dentro', vmax = plano ? F.hv : C.H, paso = Math.max(1, Math.min(C.L, C.W) / 70);
  for (let r = paso; r <= 2.2 * Math.max(F.hw, vmax); r += paso) {
    const L = D.junta ? [[u - r, v], [u + r, v]] : [[u - r, v], [u + r, v], [u, v - r], [u, v + r], [u - r, v - r], [u + r, v + r], [u - r, v + r], [u + r, v - r]];
    for (const [uu, vv] of L) { if (Math.abs(uu) > F.hw || (plano ? Math.abs(vv) > vmax : vv < 0 || vv > vmax)) continue; const Z = zona(C, tipo, cara, uu, vv, p, id); if (Z.ok) return Object.assign({ dist: r }, Z); }
  }
  return null;
}
// 🛠️ ARREGLAR TODO: medidas a tu impresora, grosores, bisagras que faltan y cada elemento en rojo a su sitio bueno (o fuera, si no hay)
export function arreglaTodo(C0) {
  const C = JSON.parse(JSON.stringify(C0)), I = CP.IMPRESORAS[C.impresora] || CP.IMPRESORAS.p1p, hechos = [];
  const k = Math.min(1, (I.cama - 6) / C.L, (I.cama - 6) / C.W);
  if (k < 1) { C.L = Math.floor(C.L * k); C.W = Math.floor(C.W * k); C.els.forEach(e => { e.u = Math.round(e.u * k * 2) / 2; if (e.cara === 'dentro' || e.cara === 'tapa') e.v = Math.round(e.v * k * 2) / 2; }); hechos.push('Medidas ajustadas a tu ' + I.t + ': ' + C.L + ' × ' + C.W + ' mm.'); }
  const extra = altoTotal(C) - C.H; if (C.H + extra > I.alto - 2) { C.H = Math.floor(I.alto - 2 - extra); hechos.push('Alto ajustado a ' + C.H + ' mm.'); }
  if (conBisagra(C) && C.pared < 2.4) { C.pared = 3; hechos.push('Paredes a 3 mm (con bisagras, lo fino se parte).'); }
  if (conBisagra(C) && C.tapaG < 2.4) { C.tapaG = 3; hechos.push('Tapa a 3 mm.'); }
  if (conBisagra(C) && !C.els.some(e => e.tipo === 'bisagra')) { const lg = Math.max(16, Math.min(44, Math.round(C.L * 0.28))); [-1, 1].forEach(s => C.els.push(elemento('bisagra', 'atras', s * Math.round(C.L * 0.25), 0, { largo: lg }))); hechos.push('Puestas dos bisagras detrás (la tapa las necesita).'); }
  C.els.slice().forEach(e => { if (!C.els.includes(e)) return; const Z = zona(C, e.tipo, e.cara, e.u, e.v, e.p, e.id); if (Z.ok) return;
    const S = sitioBueno(C, e.tipo, e.cara, e.u, e.v, e.p, e.id), D = TIPOS[e.tipo];
    if (S) { e.u = Math.round(S.u * 2) / 2; e.v = Math.round(S.v * 2) / 2; hechos.push(D.e + ' ' + D.t + ': movido a su sitio bueno, a ' + n1(S.dist) + ' mm.'); }
    else { C.els = C.els.filter(x => x.id !== e.id); hechos.push(D.e + ' ' + D.t + ': quitado (' + Z.motivo.replace(/\.$/, '') + ').'); } });
  return { C, hechos };
}
export function resumen(C) { const T = TAPAS[C.tapa]; return n1(C.L) + ' × ' + n1(C.W) + ' × ' + n1(C.H + C.tapaG) + ' mm · ' + T.t.toLowerCase() + ' · ' + C.els.length + ' elemento' + (C.els.length === 1 ? '' : 's'); }
