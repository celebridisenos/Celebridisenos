// ================= 👗 CelebriDREW · TALLAS, HOLGURAS y GRADACIÓN =================
// Se separan SIEMPRE dos cosas: las medidas del CUERPO (de una tabla de tallas o de una persona) y las de la PRENDA acabada (cuerpo +
// holgura del ajuste elegido). Las plantillas trazan con las de la prenda.
// GRADAR no es escalar el dibujo: para cada talla se calculan sus medidas de prenda y se vuelve a TRAZAR la plantilla entera (cada punto
// sale de sus medidas), así la sisa, la copa, las pinzas y las costuras siguen casando en todas las tallas.
// La tabla de serie es ORIENTATIVA (valores típicos europeos, en cm): se puede cambiar por la propia y se guarda en el proyecto.
export const CAMPOS_CUERPO = [['pecho', 'Pecho / busto (contorno)'], ['cintura', 'Cintura (contorno)'], ['cadera', 'Cadera (contorno)'], ['cuello', 'Cuello (contorno)'], ['hombros', 'Ancho de hombros'], ['espalda', 'Largo de talle (nuca a cintura)'], ['brazo', 'Largo de brazo (hombro a muñeca)'], ['biceps', 'Brazo (contorno)'], ['muneca', 'Muñeca (contorno)'], ['tiro', 'Tiro (sentado: cintura a silla)'], ['entrepierna', 'Entrepierna (al suelo)'], ['rodilla', 'Rodilla (contorno)']];
const fila = (t, v) => ({ t, v: Object.fromEntries(CAMPOS_CUERPO.map(([k], i) => [k, v[i]])) });
export const TABLAS = {
  mujer: { t: 'Mujer (orientativa)', tallas: [fila('XS', [80, 62, 88, 33, 37, 39, 58, 25, 15, 25, 76, 34]), fila('S', [84, 66, 92, 34, 38, 40, 59, 26.5, 15.5, 26, 77, 35]), fila('M', [88, 70, 96, 35, 39, 41, 60, 28, 16, 27, 78, 36]), fila('L', [94, 76, 102, 36.5, 40, 41.5, 61, 30, 16.5, 28, 78, 37.5]), fila('XL', [100, 82, 108, 38, 41.5, 42, 62, 32, 17, 29, 79, 39]), fila('XXL', [106, 88, 114, 39.5, 43, 42.5, 62.5, 34, 17.5, 30, 79, 40.5])] },
  hombre: { t: 'Hombre (orientativa)', tallas: [fila('XS', [88, 74, 90, 36, 42, 43, 60, 28, 16.5, 25, 79, 36]), fila('S', [92, 78, 94, 37.5, 44, 44, 61, 30, 17, 26, 80, 37]), fila('M', [98, 84, 100, 39, 46, 45, 62, 32, 17.5, 27, 81, 38]), fila('L', [104, 90, 106, 40.5, 48, 46, 63, 34, 18, 28, 82, 39.5]), fila('XL', [110, 96, 110, 42, 50, 46.5, 64, 36, 18.5, 29, 82, 41]), fila('XXL', [116, 102, 114, 43.5, 52, 47, 65, 38, 19, 30, 82, 42.5])] },
};
// las HOLGURAS (cm) por prenda y ajuste: lo que la prenda mide de más que el cuerpo
export const AJUSTES = { ajustada: 'Ajustada', normal: 'Normal', holgada: 'Holgada', oversize: 'Oversize' };
const HOLG = {
  camiseta: { ajustada: { pecho: 4, hombros: 0, biceps: 6, sisa: 0 }, normal: { pecho: 10, hombros: 1, biceps: 9, sisa: 2 }, holgada: { pecho: 18, hombros: 3, biceps: 12, sisa: 3 }, oversize: { pecho: 30, hombros: 9, biceps: 16, sisa: 5 } },
  sudadera: { ajustada: { pecho: 10, hombros: 2, biceps: 9, sisa: 2 }, normal: { pecho: 18, hombros: 4, biceps: 12, sisa: 4 }, holgada: { pecho: 26, hombros: 6, biceps: 15, sisa: 5 }, oversize: { pecho: 36, hombros: 11, biceps: 18, sisa: 7 } },
  falda: { ajustada: { cintura: 0.5, cadera: 2 }, normal: { cintura: 1, cadera: 4 }, holgada: { cintura: 1.5, cadera: 7 }, oversize: { cintura: 2, cadera: 10 } },
  vestido: { ajustada: { pecho: 4, cintura: 2, cadera: 3, sisa: 1, biceps: 4 }, normal: { pecho: 7, cintura: 4, cadera: 5, sisa: 2, biceps: 6 }, holgada: { pecho: 12, cintura: 10, cadera: 9, sisa: 3, biceps: 9 }, oversize: { pecho: 20, cintura: 18, cadera: 14, sisa: 4, biceps: 12 } },
  pantalon: { ajustada: { cintura: 0.5, cadera: 2, tiro: 0.5, rodilla: 4 }, normal: { cintura: 1, cadera: 5, tiro: 1.5, rodilla: 8 }, holgada: { cintura: 1.5, cadera: 8, tiro: 2.5, rodilla: 14 }, oversize: { cintura: 2, cadera: 12, tiro: 4, rodilla: 22 } },
};
const mm = cm => Math.round(cm * 10);
// del CUERPO (cm) a las medidas de la PRENDA (mm) de cada plantilla · o = { ajuste, largo, manga } (largo y manga: preferencias)
export function medidasPrenda(k, cuerpo, o = {}) {
  const h = (HOLG[k] || {})[o.ajuste || 'normal'] || {}, c = cuerpo;
  if (k === 'camiseta') { const pecho = c.pecho + h.pecho, bic = c.biceps + h.biceps, larga = o.manga === 'larga';
    return { pecho: mm(pecho), largo: mm(o.largo || c.espalda + 26), hombros: mm(c.hombros + h.hombros), cuello: mm(c.cuello / Math.PI + 5.5), bajadaDel: mm(o.escote === 'pico' ? 19 : 9), bajadaEsp: mm(2),
      sisa: mm(c.pecho / 8 + 10 + h.sisa), manga: mm(larga ? c.brazo + 1 - h.hombros : 20), biceps: mm(bic), boca: mm(larga ? c.muneca + 9 : bic - 4), bajo: mm(pecho), caida: mm(4.5) }; }
  if (k === 'sudadera') { const pecho = c.pecho + h.pecho;
    return { pecho: mm(pecho), largo: mm(o.largo || c.espalda + 27), hombros: mm(c.hombros + h.hombros), cuello: mm(c.cuello / Math.PI + 7), bajadaDel: mm(8), bajadaEsp: mm(2), sisa: mm(c.pecho / 8 + 11 + h.sisa),
      manga: mm(c.brazo + 3 - h.hombros), biceps: mm(c.biceps + h.biceps), boca: mm(c.muneca + 8), caida: mm(4.5), alturaPuno: mm(7), alturaCintura: mm(7), altoCapucha: mm(35), fondoCapucha: mm(25) }; }
  if (k === 'falda') return { cintura: mm(c.cintura + h.cintura), cadera: mm(c.cadera + h.cadera), altoCadera: mm(20), largo: mm(o.largo || 55), vuelo: mm(o.vuelo || 0), cinturilla: mm(3.5) };
  if (k === 'vestido') { const dif = c.bajoPecho ? c.pecho - c.bajoPecho : 12; // (la copa: lo que el pecho saca sobre el bajo pecho)
    return { pecho: mm(c.pecho + h.pecho), cintura: mm(c.cintura + h.cintura), cadera: mm(c.cadera + h.cadera), espalda: mm(c.espalda), hombros: mm(c.hombros), cuello: mm(c.cuello / Math.PI + 4.5),
      bajadaDel: mm(o.escote === 'pico' ? 18 : 9), bajadaEsp: mm(2), sisa: mm(c.pecho / 8 + 9 + h.sisa), caida: mm(4.5), alturaPecho: mm(c.espalda * 0.62), separacion: mm(c.pecho * 0.205),
      pinzaPecho: mm(Math.max(1.5, Math.min(8, 0.4 * dif - 1.7))), altoCadera: mm(20), largo: mm(o.largo || 58), vuelo: 0, manga: mm(o.manga === 'larga' ? c.brazo + 1 : 18), biceps: mm(c.biceps + h.biceps), boca: mm(o.manga === 'larga' ? c.muneca + 8 : c.biceps + h.biceps - 3) }; }
  if (k === 'pantalon') return { cintura: mm(c.cintura + h.cintura), cadera: mm(c.cadera + h.cadera), tiro: mm(c.tiro + h.tiro), altoCadera: mm(19), largo: mm(o.largo || c.entrepierna + c.tiro + h.tiro - 2), rodilla: mm(c.rodilla + h.rodilla), bajo: mm(o.bajo || Math.max(36, c.rodilla * 0.95)), cinturilla: mm(4) };
  throw new Error('No hay tallas para «' + k + '».');
}
// gradar: genera la prenda en cada talla de la tabla → [{ talla, prenda, error? }]
export function grada(genera, k, tabla, opciones, o = {}) {
  return tabla.tallas.map(T => { try { const P = genera(k, medidasPrenda(k, T.v, Object.assign({}, o, { manga: opciones && opciones.mangaTipo })), opciones); P.piezas.forEach(p => { p.talla = T.t; }); return { talla: T.t, prenda: P }; } catch (e) { return { talla: T.t, error: e.message }; } });
}
