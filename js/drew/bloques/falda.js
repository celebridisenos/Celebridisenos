// ================= 👗 CelebriDREW · FALDA (recta o evasé) · tejido plano =================
// Trazado de la falda base con PINZAS: cuarto de cadera + 0,5 cm delante (− 0,5 detrás); lo que sobra en la cintura se reparte entre la
// curva del costado (hasta 2 cm) y la pinza (delante 9 cm de larga, detrás 14); si la pinza saldría de más de 3,5 cm, se hacen dos.
// El costado sube recto desde el bajo hasta la cadera y curva hasta la cintura. Delantero al doblez; espalda en dos piezas con la
// CREMALLERA en el centro; cinturilla al doblez del centro delantero, que acaba A RAS de la cremallera y cierra con CORCHETE (16-10: antes
// llevaba 3 cm de solapa en la punta, y al cortarla al doblez salían DOS solapas, una en cada extremo: sobraban 3 cm y en 3D se abría).
import * as G from '../geom.js';
import * as Z from '../pieza.js';
import { mal, costura, costuraEspejo, med, opc, compruebaMedidas, largo, volante } from './comun.js';

export const MEDIDAS_FALDA = [
  med('cintura', 'Contorno de cintura (de la prenda)', 720, 500, 1300),
  med('cadera', 'Contorno de cadera (de la prenda)', 1000, 700, 1600),
  med('altoCadera', 'Altura de cadera (de la cintura a la cadera)', 200, 140, 260),
  med('largo', 'Largo (de la cintura al bajo)', 550, 250, 1200),
  med('vuelo', 'Vuelo en el bajo, en cada costado (0 = recta)', 0, 0, 250),
  med('cinturilla', 'Ancho de la cinturilla', 35, 20, 80),
];

export function mitad(M, esp) {
  const hq = M.cadera / 4 + (esp ? -5 : 5), wq = M.cintura / 4 + (esp ? -5 : 5), exceso = hq - wq;
  if (exceso < 0) mal('La cintura es más ancha que la cadera: revisa las medidas.');
  const lado = Math.min(20, exceso * 0.5), npz = exceso - lado > 35 ? 2 : (exceso - lado > 3 ? 1 : 0), ip = npz ? (exceso - lado) / npz : 0;
  const L = M.largo, yc = L - M.altoCadera, xl = hq - lado; // el punto de la cintura en el costado
  const B = Z.constructor(esp ? 'Espalda' : 'Delantero', { corte: esp ? { n: 2, espejo: true, doblez: null } : { n: 1, espejo: false, doblez: 'centro' } }), p = B.p;
  p('cb', 0, 0, esp ? 'Centro espalda (bajo)' : 'Centro delantero (bajo)'); p('lb', hq + M.vuelo, 0, 'Costado (bajo)'); p('cad', hq, yc, 'Cadera'); p('lc', xl, L, 'Costado (cintura)'); p('cc', 0, L, esp ? 'Centro espalda (cintura)' : 'Centro delantero (cintura)');
  B.t('bajo', 'cb', 'lb'); B.t('costadoA', 'lb', 'cad'); B.t('costadoB', 'cad', 'lc', [hq, yc + 0.5 * M.altoCadera], [xl + 0.15 * lado + 2, L - 0.3 * M.altoCadera]);
  // la cintura de fuera hacia el centro, con sus pinzas
  const lp = esp ? 140 : 90, cint = ['cintura0'], pos = npz === 2 ? [0.32, 0.62] : [0.5]; let prev = 'lc';
  const xs = pos.map(f => xl * (1 - f) * 0.9 + 10).sort((a, b) => b - a); // de fuera hacia dentro
  xs.forEach((x, i) => { const a = 'pa' + i, v = 'pv' + i, b = 'pb' + i; p(a, x + ip / 2, L, 'Pinza'); p(v, x, L - lp, 'Punta de la pinza'); p(b, x - ip / 2, L, 'Pinza');
    B.t('cintura' + i, prev, a); B.t('pata' + i + 'a', a, v); B.t('pata' + i + 'b', v, b); B.pinza('pinza' + i, 'pata' + i + 'a', 'pata' + i + 'b', v); cint[i] = 'cintura' + i; prev = b; });
  if (!npz) B.t('cintura0', 'lc', 'cc'); else { B.t('cintura' + npz, prev, 'cc'); cint.push('cintura' + npz); }
  B.t('centro', 'cc', 'cb');
  B.borde('bajo', 'Bajo', ['bajo'], 'bajo', 30); B.borde('costado', 'Costado', ['costadoA', 'costadoB']); B.borde('cintura', 'Cintura', cint);
  B.borde('centro', esp ? 'Centro espalda (cremallera)' : 'Centro delantero (doblez)', ['centro'], esp ? 'costura' : 'doblez', esp ? 15 : null);
  B.hilo([hq * 0.55, L * 0.15], [hq * 0.55, L * 0.6]);
  B.piquete('costado', G.cadenaLargo(Z.tramosDe(B.pz, 'costado')) - G.tramoLargo(Z.tramoGeo(B.pz, Z.tramoPorId(B.pz, 'costadoB'))), esp ? 2 : 1); // en la cadera
  if (esp) { B.piquete('centro', M.altoCadera - 20, 1); B.pz.meta.notas.push('Cremallera invisible de ' + G.cm(M.altoCadera - 20, 0) + ' cm en el centro de la espalda (hasta el piquete).'); }
  B.pz.meta.notas.push(npz ? npz + ' pinza(s) de ' + G.cm(ip) + ' cm por mitad.' : 'Sin pinzas (la cintura casi como la cadera).');
  return B.pz;
}

export const FALDA = { k: 'falda', e: '👗', t: 'Falda', categoria: 'falda', tejido: 'plano', medidas: MEDIDAS_FALDA, opciones: [opc('forma', 'Forma', 'recta', [['recta', 'Recta (de tubo)'], ['evase', 'Evasé (vuelo en el bajo)']]), opc('bajo', 'Bajo', 'dobladillo', [['dobladillo', 'Dobladillo'], ['volante', 'Con volante']])],
  genera(M0, O = {}) {
    const M = Object.assign({}, M0); if (O.forma === 'evase' && !(M.vuelo > 0)) M.vuelo = 60; if (O.forma === 'recta') M.vuelo = Math.min(M.vuelo || 0, 0);
    compruebaMedidas(this, M);
    if (M.largo < M.altoCadera + 50) mal('La falda tiene que llegar por lo menos 5 cm por debajo de la cadera.');
    // (18-10) con VOLANTE: la falda acaba antes (el volante pone el resto del largo)
    // (si la falda es CORTA y no se le puede quitar el largo del volante sin quedar por encima de la cadera, el volante la ALARGA: se dice)
    const conVol = O.bajo === 'volante', altVol = conVol ? Math.min(140, Math.max(60, Math.round(M.largo * 0.18))) : 0, quita = conVol ? Math.max(0, Math.min(altVol, M.largo - M.altoCadera - 50)) : 0;
    const Mf = Object.assign({}, M, { largo: M.largo - quita }), del = mitad(Mf, false), esp = mitad(Mf, true), Ld = largo(del, 'cintura'), Le = largo(esp, 'cintura'), w = M.cinturilla;
    const piezas = [del, esp], costuras = [costura('costado', 'Costados', del, 'costado', esp, 'costado'), costuraEspejo('centroEsp', 'Centro espalda (cremallera)', esp, 'centro')];
    const B = Z.constructor('Cinturilla', { corte: { n: 1, espejo: false, doblez: 'cf' } }), p = B.p;
    p('o', 0, 0, 'Centro delantero'); p('s', Ld, 0, 'Costado'); p('cb', Ld + Le, 0, 'Centro espalda'); p('cbt', Ld + Le, 2 * w); p('ot', 0, 2 * w);
    B.t('del', 'o', 's'); B.t('esp', 's', 'cb'); B.t('punta', 'cb', 'cbt'); B.t('arriba', 'cbt', 'ot'); B.t('cf', 'ot', 'o');
    B.borde('del', 'A la cintura delantera', ['del']); B.borde('esp', 'A la cintura de la espalda', ['esp']); B.borde('punta', 'Extremo (a ras de la cremallera)', ['punta'], 'abierto'); B.borde('arriba', 'Canto (se dobla)', ['arriba'], 'abierto'); B.borde('cf', 'Centro delantero (doblez)', ['cf'], 'doblez');
    B.interna('linea', [[0, w], [Ld + Le, w]], 'Se dobla aquí'); B.interna('boton', [[Ld + Le - 10, w / 2]], 'Corchete'); B.hilo([(Ld + Le) * 0.5, w * 0.4], [(Ld + Le) * 0.5, w * 1.6]);
    B.piquete('del', Ld, 1);
    piezas.push(B.pz);
    // la cintura de las faldas va de fuera (costado) al centro: en la cinturilla, del centro al costado (delante) y del costado al centro (detrás)
    costuras.push(costura('cinDel', 'Cinturilla con la cintura delantera', del, 'cintura', B.pz, 'del', { inv: true }), costura('cinEsp', 'Cinturilla con la cintura de la espalda', esp, 'cintura', B.pz, 'esp', {}),
      Object.assign(costuraEspejo('cinCB', 'Corchete de la cinturilla', B.pz, 'punta'), { cierre: true })); // (en 3D, cerrada como con el corchete puesto; no es una costura)
    B.pz.piquetes = []; // (el del costado coincide con la esquina entre los dos bordes)
    if (conVol) { const fr = 1.35, Bd = largo(del, 'bajo'), Be = largo(esp, 'bajo'), v = volante(Bd, Be, altVol, fr, Mf.largo); [del, esp].forEach(z => { z.bordes.find(x => x.id === 'bajo').tipo = 'costura'; z.margen.borde.bajo = 10; });
      if (quita < altVol) v.meta.notas.push('La falda es corta: el volante la alarga ' + G.cm(altVol - quita) + ' cm (para no subir el bajo por encima de la cadera).');
      piezas.push(v); costuras.push(costura('volDel', 'Volante con el bajo delantero', del, 'bajo', v, 'del', { ratio: fr }), costura('volEsp', 'Volante con el bajo de la espalda', esp, 'bajo', v, 'esp', { ratio: fr, inv: true }), costuraEspejo('volCB', 'Centro espalda del volante', v, 'cb')); }
    return { piezas, costuras, avisos: [] };
  } };
