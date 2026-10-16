// ================= 👗 CelebriDREW · SUDADERA CON CAPUCHA · punto (felpa) =================
// La base de la camiseta (cuerpo y manga con la copa a la medida de la sisa) con: CAPUCHA de dos piezas cuyo cuello mide exactamente
// el escote (delantero + espalda, partido en el hombro), BOLSILLO CANGURO al doblez, PUÑOS y CINTURA de punto elástico (miden la boca
// de la manga × 0,8 y el bajo × 0,85: se estiran al coserlos). Si se elige cremallera, el delantero va en dos piezas (sin doblez).
import * as G from '../geom.js';
import * as Z from '../pieza.js';
import { mal, costura, costuraEspejo, med, opc, compruebaMedidas, largo } from './comun.js';
import { cuerpo, manga } from './camiseta.js';

export const MEDIDAS_SUDADERA = [
  med('pecho', 'Contorno de pecho (de la prenda)', 1160, 700, 2000, 'El contorno entero. Si la mides plana, el ancho de axila a axila × 2.'),
  med('largo', 'Largo total con la cintura (desde el cuello, en el hombro)', 700, 450, 1100),
  med('hombros', 'Ancho de hombros (de costura a costura)', 500, 320, 800),
  med('cuello', 'Ancho del cuello (de lado a lado, por arriba)', 200, 140, 300),
  med('bajadaDel', 'Bajada del escote delantero', 80, 40, 200),
  med('bajadaEsp', 'Bajada del escote de la espalda', 20, 5, 100),
  med('sisa', 'Profundidad de sisa (del hombro a la axila, en vertical)', 250, 160, 400),
  med('manga', 'Largo de manga con el puño (desde la punta del hombro)', 620, 300, 850),
  med('biceps', 'Contorno de la manga en la axila', 420, 260, 800),
  med('boca', 'Contorno de la manga donde empieza el puño', 240, 140, 500),
  med('caida', 'Caída de hombro', 45, 5, 100),
  med('alturaPuno', 'Alto del puño', 70, 30, 150),
  med('alturaCintura', 'Alto de la cintura de punto', 70, 30, 150),
  med('altoCapucha', 'Alto de la capucha (del cuello a la coronilla)', 350, 250, 450),
  med('fondoCapucha', 'Fondo de la capucha (de la cara a la nuca)', 250, 180, 330),
];

function capucha(Lfn, Lbn, alto, fondo) {
  const B = Z.constructor('Capucha', { corte: { n: 2, espejo: true, doblez: null } }), p = B.p, a = 12 * Math.PI / 180;
  const sh = [Lfn, 0], cb = [Lfn + Lbn * Math.cos(a), Lbn * Math.sin(a)], D = Math.max(fondo, cb[0] + 20);
  p('cf', 0, 0, 'Centro delantero (cuello)'); p('sh', sh[0], 0, 'Hombro'); p('cb', cb[0], cb[1], 'Centro espalda (cuello)'); p('nuca', D, alto * 0.55, 'Nuca'); p('coronilla', D * 0.55, alto, 'Coronilla'); p('frente', 18, alto * 0.97, 'Frente');
  B.t('cuelloDel', 'cf', 'sh'); B.t('cuelloEsp', 'sh', 'cb');
  B.t('nucaB', 'cb', 'nuca', [cb[0] + 0.25 * (D - cb[0]), cb[1] + 0.12 * alto], [D, alto * 0.3]);
  B.t('nucaA', 'nuca', 'coronilla', [D, alto * 0.82], [D * 0.82, alto]);
  B.t('arriba', 'coronilla', 'frente', [D * 0.35, alto], [30, alto]);
  B.t('cara', 'frente', 'cf', [6, alto * 0.6], [0, alto * 0.25]);
  B.borde('cuelloDel', 'Al escote delantero', ['cuelloDel']); B.borde('cuelloEsp', 'Al escote de la espalda', ['cuelloEsp']); B.borde('centro', 'Centro de la capucha', ['nucaB', 'nucaA', 'arriba']); B.borde('cara', 'Canto de la cara (jareta)', ['cara'], 'remate', 30);
  B.hilo([D * 0.45, alto * 0.25], [D * 0.45, alto * 0.75]);
  B.pz.meta.notas.push('Canto de la cara con 3 cm de margen: se vuelve para hacer la jareta del cordón.');
  return B.pz;
}
function rect(nombre, w, h, bordes, o = {}) {
  const B = Z.constructor(nombre, { corte: o.corte || { n: 1, espejo: false, doblez: null } }), p = B.p;
  p('a', 0, 0); p('b', w, 0); p('c', w, h); p('d', 0, h);
  B.t('abajo', 'a', 'b'); B.t('der', 'b', 'c'); B.t('arriba', 'c', 'd'); B.t('izq', 'd', 'a');
  bordes.forEach(([id, n, tr, tipo, m]) => B.borde(id, n, tr, tipo, m));
  if (o.dobla) B.interna('linea', [[0, h / 2], [w, h / 2]], 'Se dobla aquí'); B.hilo([w * 0.5, h * 0.2], [w * 0.5, h * 0.8]);
  return B.pz;
}

export const SUDADERA = { k: 'sudadera', e: '🧥', t: 'Sudadera con capucha', categoria: 'sudadera', tejido: 'punto', medidas: MEDIDAS_SUDADERA,
  opciones: [opc('bolsillo', 'Bolsillo', 'canguro', [['canguro', 'Canguro'], ['no', 'Sin bolsillo']]), opc('cierre', 'Delante', 'cerrada', [['cerrada', 'Cerrada (se mete por la cabeza)'], ['cremallera', 'Con cremallera']])],
  genera(M, O = {}) {
    compruebaMedidas(this, M);
    const cremallera = O.cierre === 'cremallera', kP = 0.8, kC = 0.85;
    // el cuerpo sin la cintura: la cintura de punto pone el resto del largo
    const Mc = Object.assign({}, M, { largo: M.largo - M.alturaCintura, bajo: M.pecho, manga: M.manga - M.alturaPuno });
    if (Mc.largo - M.sisa < 150) mal('Muy corta: entre la axila y la cintura quedarían menos de 15 cm.');
    if (M.hombros / 2 - M.cuello / 2 < 40) mal('La costura del hombro mediría menos de 4 cm: hombros muy estrechos para ese cuello.');
    const del = cuerpo(Mc, { rib: true }), esp = cuerpo(Mc, { esp: true, rib: true });
    del.bordes.find(b => b.id === 'bajo').tipo = 'costura'; esp.bordes.find(b => b.id === 'bajo').tipo = 'costura'; delete del.margen.borde.bajo; delete esp.margen.borde.bajo;
    if (cremallera) { del.corte = { n: 2, espejo: true, doblez: null }; const c = del.bordes.find(b => b.id === 'centro'); c.tipo = 'abierto'; c.n = 'Centro delantero (cremallera)'; del.margen.borde.centro = 15; del.nombre = 'Delantero (dos piezas)'; }
    const piezas = [del, esp], costuras = [costura('hombro', 'Hombros', del, 'hombro', esp, 'hombro'), costura('costado', 'Costados', del, 'costado', esp, 'costado')];
    const Lfa = largo(del, 'sisa'), Lba = largo(esp, 'sisa'), m = manga(Mc, Lfa, Lba, 0), Lcf = largo(m.pz, 'copaDel'), Lcb = largo(m.pz, 'copaEsp');
    del.piquetes.push({ id: Z.nid('pq'), borde: 'sisa', d: 0.5 * Lfa, n: 1 }); esp.piquetes.push({ id: Z.nid('pq'), borde: 'sisa', d: 0.5 * Lba, n: 2 });
    m.pz.piquetes.push({ id: Z.nid('pq'), borde: 'copaDel', d: 0.5 * Lcf, n: 1 }, { id: Z.nid('pq'), borde: 'copaEsp', d: Lcb - 0.5 * Lcb, n: 2 });
    const bocaM = m.pz.bordes.find(b => b.id === 'boca'); bocaM.tipo = 'costura'; delete m.pz.margen.borde.boca;
    piezas.push(m.pz); costuras.push(costura('sisaDel', 'Sisa delantera con la manga', del, 'sisa', m.pz, 'copaDel', { ratio: Lcf / Lfa }), costura('sisaEsp', 'Sisa de la espalda con la manga', esp, 'sisa', m.pz, 'copaEsp', { inv: true, ratio: Lcb / Lba }), costura('manga', 'Costura de la manga', m.pz, 'costuraDer', m.pz, 'costuraIzq', { inv: true }));
    // la capucha
    const cap = capucha(largo(del, 'escote'), largo(esp, 'escote'), M.altoCapucha, M.fondoCapucha); piezas.push(cap);
    costuras.push(costura('capDel', 'Capucha con el escote delantero', del, 'escote', cap, 'cuelloDel', { inv: true }), costura('capEsp', 'Capucha con el escote de la espalda', esp, 'escote', cap, 'cuelloEsp'), costuraEspejo('capCentro', 'Centro de la capucha', cap, 'centro'));
    // puños (dos) y cintura (al doblez del centro delantero, o abierta si hay cremallera)
    const Lboca = largo(m.pz, 'boca'), puno = rect('Puño', Lboca * kP, 2 * M.alturaPuno, [['abajo', 'A la manga', ['abajo'], 'costura', 7], ['der', 'Costura del puño', ['der'], 'costura', 7], ['arriba', 'Canto (se dobla)', ['arriba'], 'abierto', 7], ['izq', 'Costura del puño', ['izq'], 'costura', 7]], { corte: { n: 2, espejo: false, doblez: null }, dobla: true });
    piezas.push(puno); costuras.push(costura('puno', 'Puño con la manga', m.pz, 'boca', puno, 'abajo', { ratio: kP }), costura('punoLado', 'Costura del puño', puno, 'der', puno, 'izq', { inv: true }));
    const Wd = largo(del, 'bajo'), We = largo(esp, 'bajo');
    const ci = Z.constructor('Cintura', { corte: cremallera ? { n: 2, espejo: true, doblez: null } : { n: 1, espejo: false, doblez: 'cf' } }), p = ci.p, h = 2 * M.alturaCintura;
    p('o', 0, 0, 'Centro delantero'); p('s', Wd * kC, 0, 'Costado'); p('cb', (Wd + We) * kC, 0, 'Centro espalda'); p('cbt', (Wd + We) * kC, h); p('ot', 0, h);
    ci.t('del', 'o', 's'); ci.t('esp', 's', 'cb'); ci.t('cb', 'cb', 'cbt'); ci.t('arriba', 'cbt', 'ot'); ci.t('cf', 'ot', 'o');
    ci.borde('del', 'Al bajo delantero', ['del'], 'costura', 7); ci.borde('esp', 'Al bajo de la espalda', ['esp'], 'costura', 7); ci.borde('cb', 'Centro espalda', ['cb'], 'costura', 7); ci.borde('arriba', 'Canto (se dobla)', ['arriba'], 'abierto', 7); ci.borde('cf', cremallera ? 'Centro delantero (cremallera)' : 'Centro delantero (doblez)', ['cf'], cremallera ? 'abierto' : 'doblez', cremallera ? 15 : null);
    ci.interna('linea', [[0, h / 2], [(Wd + We) * kC, h / 2]], 'Se dobla aquí'); ci.hilo([(Wd + We) * kC * 0.5, h * 0.2], [(Wd + We) * kC * 0.5, h * 0.8]);
    piezas.push(ci.pz); costuras.push(costura('cinDel', 'Cintura con el bajo delantero', del, 'bajo', ci.pz, 'del', { ratio: kC }), costura('cinEsp', 'Cintura con el bajo de la espalda', esp, 'bajo', ci.pz, 'esp', { ratio: kC, inv: true }), costuraEspejo('cinCB', 'Centro de la cintura', ci.pz, 'cb'));
    // bolsillo canguro (al doblez; se pespuntea encima del delantero: su sitio va dibujado en él)
    if (O.bolsillo !== 'no') {
      const W = M.pecho / 4, pw = Math.min(W * 0.78, W - 25), ph = Math.min(0.45 * (Mc.largo - M.sisa), 210), y0 = 15, ab = Math.min(70, pw * 0.45);
      const Bp = Z.constructor('Bolsillo canguro', { corte: cremallera ? { n: 2, espejo: true, doblez: null } : { n: 1, espejo: false, doblez: 'cf' } }), q = Bp.p;
      q('o', 0, 0); q('a', pw, 0); q('b', pw, ph * 0.35); q('c', pw - ab, ph); q('d', 0, ph);
      Bp.t('abajo', 'o', 'a'); Bp.t('lado', 'a', 'b'); Bp.t('mano', 'b', 'c'); Bp.t('arriba', 'c', 'd'); Bp.t('cf', 'd', 'o');
      Bp.borde('abajo', 'Abajo (se pespuntea)', ['abajo'], 'aplicado'); Bp.borde('lado', 'Lado (se pespuntea)', ['lado'], 'aplicado'); Bp.borde('mano', 'Entrada de la mano', ['mano'], 'remate', 20); Bp.borde('arriba', 'Arriba (se pespuntea)', ['arriba'], 'aplicado'); Bp.borde('cf', cremallera ? 'Centro (cremallera)' : 'Centro delantero (doblez)', ['cf'], cremallera ? 'abierto' : 'doblez');
      Bp.hilo([pw * 0.4, ph * 0.2], [pw * 0.4, ph * 0.8]); piezas.push(Bp.pz);
      del.internas.push({ id: Z.nid('in'), tipo: 'bolsillo', pts: [[0, y0], [pw, y0], [pw, y0 + ph * 0.35], [pw - ab, y0 + ph], [0, y0 + ph]], n: 'Sitio del bolsillo canguro' });
    }
    return { piezas, costuras, avisos: [] };
  } };
