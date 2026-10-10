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
  bisagraFil: { e: '🧵', t: 'Bisagra · eje de filamento', d: 'El eje es un trozo de TU filamento de 1,75 mm: no compras nada.', pin: 1.75, Rk: 3.4, hEje: 0.05, hTapa: 0.2 },
  bisagraImp: { e: '📌', t: 'Bisagra · eje impreso', d: 'Sale un pasador con cabeza que se mete por los nudos (más fuerte).', pin: 3, Rk: 4.2, hEje: 0.1, hTapa: 0.25 },
  bisagraClic: { e: '🫰', t: 'Bisagra de clic', d: 'El eje es parte de la caja y la tapa se engancha apretando: sin piezas sueltas (la tapa se puede quitar).', pin: 3, Rk: 4.2, hTapa: 0.2, boca: 2.5 }
};
export const AJUSTES = { suave: ['Suave', 'gira'], firme: ['Firme', 'justo'], fuerte: ['Muy firme', 'presion'] };
export const conBisagra = C => C.tapa !== 'presion';
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
export function nueva() { return { L: 120, W: 80, H: 50, pared: 2.4, suelo: 2, tapaG: 2.4, radio: 4, tapa: 'bisagraFil', ajuste: 'firme', labio: 5, tope: true, color: '#9d6d3f', colorTapa: '#c9a227', els: [] }; }
let ids = 0;
export const nuevoId = () => 'e' + Date.now().toString(36) + (ids++).toString(36);
export const elemento = (tipo, cara, u, v, p) => ({ id: nuevoId(), tipo, cara, u, v, p: Object.assign({}, TIPOS[tipo].p, p || {}) });
export const PLANTILLAS = {
  joyero: { e: '💍', t: 'Joyero', d: 'Bisagra de filamento, cierre de clic y separadores', C: { L: 110, W: 72, H: 38, radio: 5, tapa: 'bisagraFil', color: '#1b1b1d', colorTapa: '#c9a227' },
    els: [['bisagra', 'atras', -26, 0, { largo: 28 }], ['bisagra', 'atras', 26, 0, { largo: 28 }], ['cierre', 'frente', 0, 0], ['separador', 'dentro', -18, 0], ['separador', 'dentro', 18, 0]] },
  herramientas: { e: '🧰', t: 'Caja de herramientas', d: 'Bisagras de eje impreso, cierres, candado y asas', C: { L: 200, W: 110, H: 70, radio: 6, tapa: 'bisagraImp', pared: 3, tapaG: 3, color: '#c8102e', colorTapa: '#1b1b1d' },
    els: [['bisagra', 'atras', -55, 0, { largo: 44 }], ['bisagra', 'atras', 55, 0, { largo: 44 }], ['cierre', 'frente', -60, 0, { ancho: 18 }], ['cierre', 'frente', 60, 0, { ancho: 18 }], ['candado', 'frente', 0, 0], ['asa', 'izq', 0, 42], ['asa', 'der', 0, 42]] },
  armarito: { e: '🗄️', t: 'Armarito con puerta', d: 'Tapa a presión, puerta de clic con su pomo', C: { L: 90, W: 70, H: 100, radio: 4, tapa: 'presion', color: '#f4f4f2', colorTapa: '#00a4e4' },
    els: [['puerta', 'frente', 0, 50, { ancho: 60, alto: 70 }], ['pomo', 'frente', 20, 50, { d: 12, alto: 10 }]] },
  tornillos: { e: '🔩', t: 'Caja de tornillos', d: 'Tapa a presión y 6 compartimentos', C: { L: 150, W: 100, H: 40, radio: 4, tapa: 'presion', color: '#8e9196', colorTapa: '#f7d117' },
    els: [['separador', 'dentro', -25, 0], ['separador', 'dentro', 25, 0], ['separador', 'dentro', 0, 0, { dir: 'x' }], ['etiqueta', 'frente', 0, 20]] },
  secreta: { e: '🤫', t: 'Caja secreta', d: 'Bisagra de clic y cierre con imanes', C: { L: 90, W: 90, H: 45, radio: 8, tapa: 'bisagraClic', pared: 3, tapaG: 3, color: '#5e43b7', colorTapa: '#c08ee8' },
    els: [['bisagra', 'atras', 0, 0, { largo: 50 }], ['iman', 'frente', -22, 0], ['iman', 'frente', 22, 0], ['pomo', 'tapa', 0, -20, { d: 14, alto: 9 }]] }
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
  const c = 0.2, r = 1.0, diente = 1.0, tt = 1.8, enganche = diente - c; // la patilla: 1,8 de grueso; el diente engancha 0,8 mm
  const La = Math.max(10, Math.ceil(Math.sqrt(1.5 * tt * enganche / 0.02))); // largo para que se doble ≤ 2 % (PLA y PETG lo aguantan)
  return { c, r, diente, tt, enganche, La, def: 1.5 * tt * enganche / (La * La) };
}
const LADO_HUECO = C => ({ L: C.L - 2 * C.pared, W: C.W - 2 * C.pared });
// el rectángulo que ocupa cada elemento en su cara (para que no se pisen)
export function rect(C, e) {
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
  const F = marco(C, cara), uso = F.hw - R - 1; // lo recto de la cara (sin la esquina redondeada)
  if (D.junta) v = H;
  const otros = C.els.filter(e => e.id !== idIgnora && e.cara === cara), yo = rect(C, { tipo, cara, u, v, p });
  const choca = otros.find(e => e.tipo !== 'pomo' && e.tipo !== 'separador' && pisa(rect(C, e), yo));
  const nombre = e => TIPOS[e.tipo].t.toLowerCase();
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
  if (pr < 1.2) N.mal('Las paredes tienen que medir al menos 1,2 mm.');
  if (L - 2 * pr < 10 || W - 2 * pr < 10 || H < sf + 8) N.mal('La caja es demasiado pequeña para sus paredes.');
  let cuerpo = prisma(L, W, R, 0, H).subtract(prisma(L - 2 * pr, W - 2 * pr, Math.max(0.3, R - pr), sf, H + 1));
  let tapa = prisma(L, W, R, H, H + tg);
  const masC = [], menosC = [], masT = [], menosT = [], sueltas = [], puertas = [], avisos = [];
  const LI = L - 2 * pr, WI = W - 2 * pr, RI = Math.max(0.3, R - pr);
  // el labio de la tapa: a presión (alto «labio», con tu holgura) o, con bisagra, un labio corto que la centra al cerrar
  { const hol = conBisagra(C) ? 0.3 : holTapa(C), alto = conBisagra(C) ? 1.6 : C.labio, g = 1.6;
    const fuera = prisma(LI - 2 * hol, WI - 2 * hol, Math.max(0.3, RI - hol), H - alto, H + 0.01), dentro = prisma(LI - 2 * hol - 2 * g, WI - 2 * hol - 2 * g, Math.max(0.3, RI - hol - g), H - alto - 1, H + 0.02);
    masT.push(fuera.subtract(dentro)); }
  // ---- las BISAGRAS de la tapa: eje a lo largo de X, detrás, a la altura de la junta ----
  let eje = null;
  const bis = C.els.filter(e => e.tipo === 'bisagra');
  if (conBisagra(C)) {
    if (!bis.length) avisos.push('La tapa es de bisagra pero no has puesto ninguna: arrastra 🔗 Bisagra al borde de atrás.');
    const Rk = T.Rk, ay = W / 2 + Rk, az = H, gap = 0.35, ga = 0.4; eje = { o: [0, ay, az], dir: [1, 0, 0] };
    bis.forEach(e => {
      const xc = -e.u, x0 = xc - e.p.largo / 2, x1 = xc + e.p.largo / 2, n = impar(e.p.largo / 7), s = (e.p.largo - (n - 1) * ga) / n;
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
        menosC.push(cilX(T.pin / 2 + T.hEje, x0 - 1, x1 + 1, ay, az)); menosT.push(cilX(T.pin / 2 + T.hTapa, x0 - 1, x1 + 1, ay, az));
        if (C.tapa === 'bisagraImp') { // el pasador: Ø3 con cabeza, plano por debajo para que apoye
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
  if (masC.length) cuerpo = cuerpo.add(N.union(masC));
  if (menosC.length) cuerpo = cuerpo.subtract(N.union(menosC));
  if (masT.length) tapa = tapa.add(N.union(masT));
  if (menosT.length) tapa = tapa.subtract(N.union(menosT));
  return { cuerpo, tapa, sueltas, puertas, eje, avisos };
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
    const v0 = toque(conTapa, fijo);
    if (v0 < 0.5) ok('Cerrada, la tapa no roza nada', 'Volumen que se pisa: ' + n2(v0) + ' mm³.'); else mal('Cerrada, la tapa se pisa con la caja', n2(v0) + ' mm³ ocupan el mismo sitio: revisa los elementos de la junta.');
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
    if (ci.length) { const K = cierreMedidas(C); out.cierre = K; ok('El cierre engancha ' + n2(K.enganche) + ' mm', 'La patilla mide ' + K.La + ' mm y al cerrar se dobla ' + n2(K.enganche) + ' mm: un ' + n1(K.def * 100) + ' % (PLA y PETG aguantan hasta un 2 %, miles de veces).'); }
    const im = C.els.filter(e => e.tipo === 'iman');
    if (im.length) ok(im.length + ' pareja' + (im.length > 1 ? 's' : '') + ' de imanes alineadas', 'Pon los de la tapa con el otro polo hacia abajo (que se atraigan). Una gota de pegamento si bailan.');
    if (!ci.length && !im.length && !C.els.some(e => e.tipo === 'candado') && conBisagra(C)) ojo('No lleva cierre', 'Se queda cerrada por su peso; si quieres que no se abra sola, arrastra un 🔒 cierre o un 🧲 imán.');
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
    { nombre: 'Tapa', m: N.aLaCama(G.tapa.rotate([180, 0, 0])), color: C.colorTapa, como: 'boca abajo (la cara de fuera en la cama)' }];
  G.puertas.forEach((P, i) => L.push({ nombre: 'Puerta' + (G.puertas.length > 1 ? ' ' + (i + 1) : ''), m: N.aLaCama(P.local.rotate([90, 0, 0])), color: C.colorTapa, como: 'tumbada (la cara de fuera en la cama)' }));
  G.sueltas.forEach(s => L.push({ nombre: s.nombre, m: s.imprimir, color: s.nombre.startsWith('Pomo') ? C.colorTapa : C.color, como: s.nota || '' }));
  return L;
}
export function colocaEnCama(L, cama = 250, sep = 6) {
  let x = 0, y = 0, fila = 0; const out = [];
  L.forEach(p => { const b = N.caja(p.m), w = b.dims[0], d = b.dims[1];
    if (x > 0 && x + w > cama) { x = 0; y += fila + sep; fila = 0; }
    out.push(Object.assign({}, p, { m: p.m.translate([x - b.min[0], y - b.min[1], -b.min[2]]) })); x += w + sep; fila = Math.max(fila, d); });
  return out;
}
export function resumen(C) { const T = TAPAS[C.tapa]; return n1(C.L) + ' × ' + n1(C.W) + ' × ' + n1(C.H + C.tapaG) + ' mm · ' + T.t.toLowerCase() + ' · ' + C.els.length + ' elemento' + (C.els.length === 1 ? '' : 's'); }
