// ================= 👗 CelebriDREW · PANTALÓN · tejido plano =================
// Trazado de pantalón base: la línea de la RAYA (x = 0) en medio del delantero a la altura del tiro; delante, cuarto de cadera − 1 cm y
// cadera/16 de extensión de tiro; detrás, cuarto de cadera + 1 cm, cadera/8 − 0,5 cm de extensión, el centro de la espalda inclinado
// (sube 2,5 cm y entra 3) y el tiro de atrás más bajo. Lo que hace casar las piezas, calculado (bisección), no a ojo:
//   · la bajada del tiro de la espalda, para que la ENTREPIERNA de atrás mida lo mismo que la de delante;
//   · la altura del costado de atrás en la cintura, para que los COSTADOS midan lo mismo.
// Lo que sobra en la cintura: delante, al costado (si pasa de 3 cm, pinza); detrás, pinza(s). Cinturilla en dos mitades.
import * as G from '../geom.js';
import * as Z from '../pieza.js';
import { mal, resuelve, costura, costuraEspejo, med, opc, compruebaMedidas, largo } from './comun.js';

export const MEDIDAS_PANTALON = [
  med('cintura', 'Contorno de cintura (de la prenda)', 780, 520, 1400),
  med('cadera', 'Contorno de cadera (de la prenda)', 1020, 760, 1700),
  med('tiro', 'Tiro (de la cintura a la entrepierna, sentado)', 270, 190, 380, 'Delante, de la cintura a la línea de la entrepierna.'),
  med('altoCadera', 'Altura de cadera (de la cintura a la cadera)', 190, 130, 260),
  med('largo', 'Largo exterior (de la cintura al bajo)', 1020, 300, 1300),
  med('rodilla', 'Contorno en la rodilla', 460, 300, 800),
  med('bajo', 'Contorno del bajo', 400, 220, 900),
  med('cinturilla', 'Ancho de la cinturilla', 40, 20, 80),
];

// una pierna (delantero o espalda); o.d = bajada del tiro; o.dz = altura extra del costado en la cintura
function pierna(M, esp, o = {}) {
  const H = M.cadera, W = M.cintura, hw = H / 4 + (esp ? 10 : -10), ext = esp ? H / 8 - 5 : H / 16, tot = hw + ext, xs = -tot / 2, xc = tot / 2, xcf = xc - ext;
  const yh = M.tiro - M.altoCadera, yb = -(M.largo - M.tiro), yk = yb / 2 + 50, ab = o.ab || 0, kq = (M.rodilla / 2 + (esp ? 10 : -10)) / 2 + ab / 2, bq = (M.bajo / 2 + (esp ? 10 : -10)) / 2 + ab, d = o.d || 0; // (ab: SHORTS, ver genera)
  const B = Z.constructor(esp ? 'Espalda' : 'Delantero', { corte: { n: 2, espejo: true, doblez: null } }), p = B.p;
  // el centro en la cintura (detrás, inclinado) y lo que mide la cintura que va a la cinturilla
  const cw = esp ? [xcf - 30, M.tiro + 25] : [xcf - 10, M.tiro], wq = W / 4 + (esp ? -5 : 5), ysw = M.tiro + (o.dz || 0);
  // el costado en la cintura: entra hasta 2 cm (delante) / 1,5 (detrás); el resto va a pinzas
  const entra = esp ? 15 : 20; let xsw = xs + entra; const Lw = Math.hypot(cw[0] - xsw, cw[1] - ysw);
  let ip = Lw - wq, npz = 0; if (ip < 0) { xsw = cw[0] - Math.sqrt(Math.max(0, wq * wq - (cw[1] - ysw) ** 2)); ip = 0; } else if (ip > 3) npz = ip > 35 ? 2 : 1; else ip = 0;
  if (xsw < xs - 30) mal('La cintura es mucho más ancha que la cadera: revisa las medidas.');
  p('sb', -bq, yb, 'Costado (bajo)'); p('ib', bq, yb, 'Entrepierna (bajo)'); p('ik', kq, yk, 'Rodilla (dentro)'); p('cp', xc, -d, 'Punta del tiro'); p('ch', xcf, yh, esp ? 'Centro espalda (cadera)' : 'Centro delantero (cadera)'); p('cw', cw[0], cw[1], esp ? 'Centro espalda (cintura)' : 'Centro delantero (cintura)');
  p('sw', xsw, ysw, 'Costado (cintura)'); p('sh', xs, yh, 'Costado (cadera)'); p('sc', xs, 0, 'Costado (tiro)'); p('sk', -kq, yk, 'Rodilla (fuera)');
  const dirC = G.norma(G.sub([xcf, yh], cw)); // del centro en la cintura hacia la cadera (hacia abajo)
  B.t('bajo', 'sb', 'ib'); B.t('entreA', 'ib', 'ik'); B.t('entreB', 'ik', 'cp', [kq + 0.05 * (xc - kq), yk * 0.55], [xc - 0.25 * (xc - kq), -d - 0.25 * Math.abs(yk)]);
  B.t('tiroCurva', 'cp', 'ch', [xc - (esp ? 0.6 : 0.55) * ext, -d], G.suma([xcf, yh], G.esc(dirC, 0.5 * (yh + d))));
  B.t('tiroRecto', 'ch', 'cw');
  // la cintura (del centro al costado) con sus pinzas
  const cint = []; let prev = 'cw';
  if (npz) { const ipz = ip / npz; for (let i = 0; i < npz; i++) { const f = npz === 2 ? [0.35, 0.65][i] : 0.5, base = G.lerp(cw, [xsw, ysw], f), dirW = G.norma(G.sub([xsw, ysw], cw)), nrm = [dirW[1], -dirW[0]], lp = esp ? 120 : 90;
      const a = G.suma(base, G.esc(dirW, -ipz / 2)), b = G.suma(base, G.esc(dirW, ipz / 2)), v = G.suma(base, G.esc(nrm, nrm[1] < 0 ? lp : -lp));
      p('pa' + i, a[0], a[1], 'Pinza'); p('pv' + i, v[0], v[1], 'Punta de la pinza'); p('pb' + i, b[0], b[1], 'Pinza');
      B.t('cintura' + i, prev, 'pa' + i); B.t('pata' + i + 'a', 'pa' + i, 'pv' + i); B.t('pata' + i + 'b', 'pv' + i, 'pb' + i); B.pinza('pinza' + i, 'pata' + i + 'a', 'pata' + i + 'b', 'pv' + i); cint.push('cintura' + i); prev = 'pb' + i; } }
  B.t('cintura' + npz, prev, 'sw'); cint.push('cintura' + npz);
  B.t('costadoA', 'sw', 'sh', [xsw - 0.2 * (xsw - xs), ysw - 0.4 * (ysw - yh)], [xs, yh + 0.35 * (ysw - yh)]); B.t('costadoB', 'sh', 'sc'); B.t('costadoC', 'sc', 'sk', [xs, yk * 0.3], [-kq - 0.1 * (xs + kq), yk * 0.6]); B.t('costadoD', 'sk', 'sb');
  B.borde('bajo', 'Bajo', ['bajo'], 'bajo', 35); B.borde('entrepierna', 'Entrepierna', ['entreA', 'entreB']); B.borde('tiro', esp ? 'Tiro trasero' : 'Tiro delantero (bragueta)', ['tiroCurva', 'tiroRecto']); B.borde('cintura', 'Cintura', cint); B.borde('costado', 'Costado', ['costadoA', 'costadoB', 'costadoC', 'costadoD']);
  B.hilo([0, yb * 0.8], [0, yh * 0.5]); B.interna('linea', [[0, yb], [0, -d * 0.5]], 'Raya');
  B.pz.meta.notas.push(npz ? npz + ' pinza(s) de ' + G.cm(ip / npz) + ' cm en la cintura.' : 'Sin pinzas.');
  return B.pz;
}

export const PANTALON = { k: 'pantalon', e: '👖', t: 'Pantalón', categoria: 'pantalon', tejido: 'plano', medidas: MEDIDAS_PANTALON,
  opciones: [opc('pierna', 'Pierna', 'recta', [['recta', 'Recta'], ['pitillo', 'Pitillo (estrecha)'], ['ancha', 'Ancha']])],
  genera(M0, O = {}) {
    const M = Object.assign({}, M0); if (O.pierna === 'pitillo') { M.rodilla = Math.min(M.rodilla, M.cadera * 0.36); M.bajo = Math.min(M.bajo, M.cadera * 0.3); } if (O.pierna === 'ancha') { M.rodilla = Math.max(M.rodilla, M.cadera * 0.6); M.bajo = Math.max(M.bajo, M.cadera * 0.62); }
    compruebaMedidas(this, M);
    if (M.tiro < M.altoCadera + 40) mal('El tiro tiene que ser al menos 4 cm más largo que la altura de cadera.');
    if (M.largo < M.tiro + 100) mal('Muy corto: del tiro al bajo quedan menos de 10 cm.');
    const del = pierna(M, false), Le = largo(del, 'entrepierna'), Lc = largo(del, 'costado');
    // la bajada del tiro de atrás que iguala la entrepierna; luego la altura del costado que iguala los costados
    let dB = resuelve(d => largo(pierna(M, true, { d }), 'entrepierna'), Le, -20, 60), ab = 0;
    // 17-10-2026 · SHORTS: con la pierna corta, bajar el tiro de atrás no basta para igualar la entrepierna (la de atrás es más ancha); se
    // hace como en un short de verdad: el bajo de atrás se abre un poco hacia la entrepierna, con 1 cm de bajada del tiro de atrás
    if (dB == null && M.largo - M.tiro < 420) { const a = resuelve(x => largo(pierna(M, true, { d: 10, ab: x }), 'entrepierna'), Le, -150, 150); if (a != null) { dB = 10; ab = a; } }
    if (dB == null) mal('No consigo que la entrepierna de atrás mida lo mismo que la de delante con estas medidas (rodilla o bajo muy distintos de la cadera).');
    const dz = resuelve(z => largo(pierna(M, true, { d: dB, dz: z, ab }), 'costado'), Lc, -25, 25);
    if (dz == null) mal('No consigo que los costados midan lo mismo con estas medidas.');
    const esp = pierna(M, true, { d: dB, dz, ab });
    const Ld = largo(del, 'cintura'), Lb = largo(esp, 'cintura'), w = M.cinturilla, sol = 35;
    const C = Z.constructor('Cinturilla (mitad)', { corte: { n: 2, espejo: true, doblez: null } }), p = C.p;
    p('o', 0, 0, 'Centro delantero'); p('s', Ld, 0, 'Costado'); p('cb', Ld + Lb, 0, 'Centro espalda'); p('cbt', Ld + Lb, 2 * w); p('ot', -sol, 2 * w); p('ox', -sol, 0, 'Solapa');
    C.t('del', 'o', 's'); C.t('esp', 's', 'cb'); C.t('cb', 'cb', 'cbt'); C.t('arriba', 'cbt', 'ot'); C.t('punta', 'ot', 'ox'); C.t('solapa', 'ox', 'o');
    C.borde('del', 'A la cintura delantera', ['del']); C.borde('esp', 'A la cintura de la espalda', ['esp']); C.borde('cb', 'Centro espalda', ['cb']); C.borde('arriba', 'Canto (se dobla)', ['arriba'], 'abierto'); C.borde('punta', 'Punta', ['punta'], 'abierto'); C.borde('solapa', 'Solapa del botón', ['solapa'], 'abierto');
    C.interna('linea', [[-sol, w], [Ld + Lb, w]], 'Se dobla aquí'); C.interna('boton', [[-sol / 2, w / 2]], 'Ojal / botón'); C.hilo([(Ld + Lb) * 0.5, w * 0.4], [(Ld + Lb) * 0.5, w * 1.6]);
    del.piquetes.push({ id: Z.nid('pq'), borde: 'tiro', d: largo(del, 'tiro') - 180, n: 1 }); del.meta.notas.push('Bragueta: cremallera de 18 cm desde la cintura (hasta el piquete del tiro).');
    const piezas = [del, esp, C.pz], costuras = [costura('costado', 'Costados', del, 'costado', esp, 'costado'), costura('entrepierna', 'Entrepierna', del, 'entrepierna', esp, 'entrepierna'),
      costuraEspejo('tiroDel', 'Tiro delantero (con la bragueta)', del, 'tiro'), costuraEspejo('tiroEsp', 'Tiro trasero', esp, 'tiro'),
      costura('cinDel', 'Cinturilla con la cintura delantera', del, 'cintura', C.pz, 'del'), costura('cinEsp', 'Cinturilla con la cintura de la espalda', esp, 'cintura', C.pz, 'esp', { inv: true }), costuraEspejo('cinCB', 'Centro espalda de la cinturilla', C.pz, 'cb')];
    return { piezas, costuras, avisos: [] };
  } };
