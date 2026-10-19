// ================= 👗 CelebriDREW · CAMISETA (y la base de la sudadera) · tejido de punto =================
// Trazado de la camiseta básica de punto (sin pinzas), a partir de las MEDIDAS DE LA PRENDA:
//   · delantero y espalda: medias piezas al DOBLEZ del centro; el ancho de pecho es el contorno / 4; la sisa sale horizontal de la axila
//     y llega en ángulo recto al hombro; el escote llega en ángulo recto al centro (así, abierto el doblez, no hace pico);
//   · manga: la COPA se calcula para que su mitad delantera mida exactamente la sisa delantera (y la de atrás, la de atrás), más la
//     holgura de copa (0 en punto) → se resuelve la altura de la copa y el desplazamiento de su punto alto (bisección);
//   · tira del cuello: mide el escote × 0,85 (el punto se estira al coserla), al doblez del centro delantero.
// Piquetes: uno en la sisa delantera, dos en la de atrás, y los mismos en la manga a la misma distancia (× la proporción de la costura).
import * as G from '../geom.js';
import * as Z from '../pieza.js';
import { mal, resuelve, costura, costuraEspejo, med, opc, compruebaMedidas, perpAbajo, largo } from './comun.js';

export const MEDIDAS_CAMISETA = [
  med('pecho', 'Contorno de pecho (de la prenda)', 1040, 600, 1900, 'El contorno entero. Si la mides plana, el ancho de axila a axila × 2.'),
  med('largo', 'Largo total (desde el cuello, en el hombro)', 700, 350, 1100),
  med('hombros', 'Ancho de hombros (de costura a costura)', 450, 280, 750),
  med('cuello', 'Ancho del cuello (de lado a lado, por arriba)', 180, 110, 300),
  med('bajadaDel', 'Bajada del escote delantero', 90, 25, 320),
  med('bajadaEsp', 'Bajada del escote de la espalda', 20, 5, 150),
  med('sisa', 'Profundidad de sisa (del hombro a la axila, en vertical)', 230, 140, 380),
  med('manga', 'Largo de manga (desde la punta del hombro)', 200, 0, 800),
  med('biceps', 'Contorno de la manga en la axila', 380, 200, 750),
  med('boca', 'Contorno de la boca de la manga', 340, 120, 650),
  med('bajo', 'Contorno del bajo', 1040, 600, 2000),
  med('caida', 'Caída de hombro', 45, 5, 100),
];
const MANGAS = [['corta', 'Corta'], ['larga', 'Larga'], ['sin', 'Sin mangas']];

// las dos medias piezas del cuerpo (delantero o espalda)
export function cuerpo(M, o) {
  const L = M.largo, W = M.pecho / 4, Wb = M.bajo / 4, sh = M.hombros / 2, nw = M.cuello / 2, bajada = o.esp ? M.bajadaEsp : M.bajadaDel;
  const B = Z.constructor(o.esp ? 'Espalda' : 'Delantero', { corte: { n: 1, espejo: false, doblez: 'centro' } }), p = B.p;
  const C = o.esp ? 'Centro espalda' : 'Centro delantero';
  p('cb', 0, 0, C + ' (bajo)'); p('lb', Wb, 0, 'Costado (bajo)'); p('ax', W, L - M.sisa, 'Axila'); p('sp', sh, L - M.caida, 'Punta del hombro'); p('hps', nw, L, 'Cuello en el hombro'); p('cc', 0, L - bajada, C + ' (cuello)');
  const ax = [W, L - M.sisa], sp = [sh, L - M.caida], hps = [nw, L], cc = [0, L - bajada], u = G.norma(G.sub(sp, hps)), abajo = perpAbajo(u), prof = sp[1] - ax[1];
  // sisa: la de delante, más honda
  const kx = Math.max(10, (o.esp ? 0.45 : 0.62) * (W - sh) + 14);
  B.t('bajo', 'cb', 'lb'); B.t('costado', 'lb', 'ax'); B.t('sisa', 'ax', 'sp', [ax[0] - kx, ax[1]], G.suma(sp, G.esc(abajo, (o.esp ? 0.5 : 0.42) * prof))); B.t('hombro', 'sp', 'hps');
  let tramosEscote = ['escote'];
  if (o.pico) B.t('escote', 'hps', 'cc', G.suma(hps, G.esc(abajo, 0.25 * bajada)), [cc[0] + 0.12 * nw, cc[1] + 0.25 * bajada]);
  else if (o.cuadrado && !o.esp) { const xq = Math.max(nw * 0.92, nw - 12); p('eq', xq, cc[1], 'Esquina del escote'); B.t('escote', 'hps', 'eq'); B.t('escoteB', 'eq', 'cc'); tramosEscote = ['escote', 'escoteB']; } /* (18-10: escote CUADRADO) */
  else B.t('escote', 'hps', 'cc', G.suma(hps, G.esc(abajo, Math.min(0.55 * bajada, 0.6 * nw))), [cc[0] + 0.55 * nw, cc[1]]);
  B.t('centro', 'cc', 'cb');
  B.borde('bajo', 'Bajo', ['bajo'], 'bajo', 25); B.borde('costado', 'Costado', ['costado']); B.borde('sisa', 'Sisa', ['sisa'], o.sinMangas ? 'remate' : 'costura', o.sinMangas ? 8 : null);
  B.borde('hombro', 'Hombro', ['hombro']); B.borde('escote', 'Escote', tramosEscote, o.rib ? 'costura' : 'remate', o.rib ? 7 : 8); B.borde('centro', o.esp ? 'Centro espalda (doblez)' : 'Centro delantero (doblez)', ['centro'], 'doblez');
  B.hilo([W * 0.42, L * 0.2], [W * 0.42, L * 0.7]);
  return B.pz;
}
// la manga con su copa a la medida de las sisas
export function manga(M, Lfa, Lba, holgura) {
  const B2 = M.biceps / 2, Hb = M.boca / 2, tf = Lfa + holgura * 0.45, tb = Lba + holgura * 0.55;
  const del = (ch, s) => ({ a: [B2, 0], c1: [B2 - 0.3 * (B2 - s), 0.1 * ch], c2: [s + 0.45 * (B2 - s), ch], b: [s, ch] });
  const esp = (ch, s) => ({ a: [s, ch], c1: [s - 0.45 * (B2 + s), ch], c2: [-B2 + 0.3 * (B2 + s), 0.1 * ch], b: [-B2, 0] });
  const lf = (ch, s) => G.tramoLargo(del(ch, s)), lb = (ch, s) => G.tramoLargo(esp(ch, s));
  const sDe = ch => resuelve(s => lf(ch, s) - lb(ch, s), tf - tb, -0.6 * B2, 0.6 * B2);
  const total = ch => { const s = sDe(ch); return s == null ? NaN : lf(ch, s) + lb(ch, s); };
  const chMin = 0.04 * B2, chMax = 1.4 * B2;
  if (!(total(chMin) <= tf + tb)) mal('La manga es más ancha que su sisa (la copa no puede medir tan poco): estrecha la manga o haz la sisa más honda.');
  if (!(total(chMax) >= tf + tb)) mal('La sisa es enorme para esa manga: ensancha la manga o sube la sisa.');
  const ch = resuelve(total, tf + tb, chMin, chMax), s = sDe(ch);
  const yh = ch - M.manga; if (M.manga < ch + 15) mal('El largo de manga (' + G.cm(M.manga) + ' cm) no llega ni a la copa (' + G.cm(ch) + ' cm): alárgala o elige «sin mangas».');
  const Bm = Z.constructor('Manga', { corte: { n: 2, espejo: true, doblez: null } }), p = Bm.p;
  p('hi', -Hb, yh, 'Boca (atrás)'); p('hd', Hb, yh, 'Boca (delante)'); p('ad', B2, 0, 'Axila (delante)'); p('top', s, ch, 'Punta de la copa'); p('ai', -B2, 0, 'Axila (atrás)');
  const D = del(ch, s), E = esp(ch, s);
  Bm.t('boca', 'hi', 'hd'); Bm.t('costuraDer', 'hd', 'ad'); Bm.t('copaDel', 'ad', 'top', D.c1, D.c2); Bm.t('copaEsp', 'top', 'ai', E.c1, E.c2); Bm.t('costuraIzq', 'ai', 'hi');
  Bm.borde('boca', 'Boca de la manga', ['boca'], 'bajo', 20); Bm.borde('costuraDer', 'Costura (delante)', ['costuraDer']); Bm.borde('copaDel', 'Copa (delante)', ['copaDel']); Bm.borde('copaEsp', 'Copa (detrás)', ['copaEsp']); Bm.borde('costuraIzq', 'Costura (detrás)', ['costuraIzq']);
  Bm.hilo([0, yh * 0.25], [0, yh * 0.75 + ch * 0.25]);
  Bm.pz.meta.notas.push('Copa: ' + G.cm(ch) + ' cm de alto; mide lo que las sisas' + (holgura ? ' + ' + G.cm(holgura) + ' cm de holgura' : '') + '.');
  return { pz: Bm.pz, ch, s };
}
// la tira de punto del cuello (media, al doblez del centro delantero)
export function tira(Lfn, Lbn, k, ancho) {
  const B = Z.constructor('Tira del cuello', { corte: { n: 1, espejo: false, doblez: 'cf' } }), p = B.p, a = Lfn * k, b = (Lfn + Lbn) * k;
  p('o', 0, 0, 'Centro delantero'); p('h', a, 0, 'Hombro'); p('cb', b, 0, 'Centro espalda'); p('cbt', b, 2 * ancho); p('ot', 0, 2 * ancho);
  B.t('cuelloDel', 'o', 'h'); B.t('cuelloEsp', 'h', 'cb'); B.t('cb', 'cb', 'cbt'); B.t('arriba', 'cbt', 'ot'); B.t('cf', 'ot', 'o');
  B.borde('cuelloDel', 'Al escote delantero', ['cuelloDel'], 'costura', 7); B.borde('cuelloEsp', 'Al escote de la espalda', ['cuelloEsp'], 'costura', 7); B.borde('cb', 'Centro espalda', ['cb'], 'costura', 7); B.borde('arriba', 'Canto (se dobla por la mitad)', ['arriba'], 'abierto', 7); B.borde('cf', 'Centro delantero (doblez)', ['cf'], 'doblez');
  B.interna('linea', [[0, ancho], [b, ancho]], 'Se dobla aquí'); B.hilo([b * 0.5, 0.3 * ancho], [b * 0.5, 1.7 * ancho]);
  B.pz.meta.notas.push('Tira de punto (rib): mide el escote × ' + k + ' (se estira al coserla).');
  return B.pz;
}

// (18-10) una TIRA DE PUNTO de dos caras (se dobla por la mitad): puño · ancho = lo que mide acabada · alto = lo que se ve
function tiraPunto(nombre, ancho, alto, bordes, corte) {
  const B = Z.constructor(nombre, { corte }), p = B.p, h = 2 * alto; p('a', 0, 0); p('b', ancho, 0); p('c', ancho, h); p('d', 0, h);
  B.t('abajo', 'a', 'b'); B.t('der', 'b', 'c'); B.t('arriba', 'c', 'd'); B.t('izq', 'd', 'a'); bordes.forEach(([id, n, tipo]) => B.borde(id, n, [id], tipo, tipo === 'doblez' ? null : 7));
  B.interna('linea', [[0, alto], [ancho, alto]], 'Se dobla aquí'); B.hilo([ancho * 0.5, h * 0.2], [ancho * 0.5, h * 0.8]); return B.pz;
}
export function generaCamiseta(M0, O = {}, D = CAMISETA) {
  compruebaMedidas(D, M0);
  // (18-10) «una prenda acaba de mil formas»: escote CUADRADO (delante, sin tira: se remata con vista o bies), CUELLO ALTO (tira de punto de 6 cm),
  // PUÑOS de punto y BAJO de punto (cintura elástica). El largo y la manga totales se respetan: el puño y la cintura ponen su parte.
  const esc = O.escote || 'redondo', alto = esc === 'alto', cuad = esc === 'cuadrado', sin = O.mangaTipo === 'sin', rib = alto || (O.rib !== 'no' && !cuad), pico = esc === 'pico', kRib = O.ribRatio || 0.85;
  const punoP = O.puno === 'punto' && !sin, bajoP = O.bajo === 'punto', altPuno = punoP ? (O.mangaTipo === 'larga' ? 60 : 25) : 0, altCin = bajoP ? 55 : 0;
  const M = Object.assign({}, M0, { largo: M0.largo - altCin, manga: M0.manga - altPuno, bajo: bajoP ? M0.pecho : M0.bajo, bajadaDel: alto ? Math.min(M0.bajadaDel, 45) : M0.bajadaDel });
  if (M.hombros / 2 - M.cuello / 2 < 40) mal('La costura del hombro mediría ' + G.cm(M.hombros / 2 - M.cuello / 2) + ' cm: los hombros son muy estrechos para ese cuello.');
  if (M.sisa < M.caida + 70) mal('La sisa es muy corta para esa caída de hombro.');
  if (M.bajadaDel >= M.largo - M.sisa) mal('El escote baja más que la axila.');
  const del = cuerpo(M, { pico, cuadrado: cuad, rib, sinMangas: sin }), esp = cuerpo(M, { esp: true, rib, sinMangas: sin });
  const piezas = [del, esp], costuras = [costura('hombro', 'Hombros', del, 'hombro', esp, 'hombro'), costura('costado', 'Costados', del, 'costado', esp, 'costado')];
  if (!sin) {
    const Lfa = largo(del, 'sisa'), Lba = largo(esp, 'sisa'), m = manga(M, Lfa, Lba, O.holguraCopa || 0), Lcf = largo(m.pz, 'copaDel'), Lcb = largo(m.pz, 'copaEsp');
    const dF = 0.5 * Lfa, dB = 0.5 * Lba;
    del.piquetes.push({ id: Z.nid('pq'), borde: 'sisa', d: dF, n: 1 }); esp.piquetes.push({ id: Z.nid('pq'), borde: 'sisa', d: dB, n: 2 });
    m.pz.piquetes.push({ id: Z.nid('pq'), borde: 'copaDel', d: dF * Lcf / Lfa, n: 1 }, { id: Z.nid('pq'), borde: 'copaEsp', d: Lcb - dB * Lcb / Lba, n: 2 });
    piezas.push(m.pz);
    costuras.push(costura('sisaDel', 'Sisa delantera con la manga', del, 'sisa', m.pz, 'copaDel', { ratio: Lcf / Lfa }), costura('sisaEsp', 'Sisa de la espalda con la manga', esp, 'sisa', m.pz, 'copaEsp', { inv: true, ratio: Lcb / Lba }),
      costura('manga', 'Costura de la manga', m.pz, 'costuraDer', m.pz, 'costuraIzq', { inv: true }));
  }
  if (rib) { const k = alto ? 0.95 : kRib, t = tira(largo(del, 'escote'), largo(esp, 'escote'), k, alto ? 60 : (O.ribAncho || 20)); if (alto) { t.nombre = 'Cuello alto'; t.meta.notas = ['Cuello alto: mide el escote × 0,95 (se estira apenas); 6 cm de alto acabado.']; } piezas.push(t);
    costuras.push(costura('cuelloDel', (alto ? 'Cuello' : 'Tira') + ' con el escote delantero', del, 'escote', t, 'cuelloDel', { ratio: k, inv: true }), costura('cuelloEsp', (alto ? 'Cuello' : 'Tira') + ' con el escote de la espalda', esp, 'escote', t, 'cuelloEsp', { ratio: k }), costuraEspejo('tiraCB', 'Centro ' + (alto ? 'del cuello' : 'de la tira'), t, 'cb'));
    if (pico) t.meta.notas.push('En el pico, la tira se cose en inglete (las dos puntas a 45°).'); }
  if (cuad) del.meta.notas.push('Escote CUADRADO: se remata con una vista (o con bies) y, en las esquinas, un piquete hasta 2 mm de la costura para que quede plano.');
  // los PUÑOS de punto (dos): miden la boca × 0,8
  if (punoP) { const m = piezas.find(z => z.nombre === 'Manga'), Lb = largo(m, 'boca'), kP = 0.8, b = m.bordes.find(x => x.id === 'boca'); b.tipo = 'costura'; delete m.margen.borde.boca;
    const pu = tiraPunto('Puño', Lb * kP, altPuno, [['abajo', 'A la manga', 'costura'], ['der', 'Costura del puño', 'costura'], ['arriba', 'Canto (se dobla)', 'abierto'], ['izq', 'Costura del puño', 'costura']], { n: 2, espejo: false, doblez: null });
    piezas.push(pu); costuras.push(costura('puno', 'Puño con la manga', m, 'boca', pu, 'abajo', { ratio: kP }), costura('punoLado', 'Costura del puño', pu, 'der', pu, 'izq', { inv: true })); }
  // la CINTURA de punto (bajo): mide el bajo × 0,85, al doblez del centro delantero
  if (bajoP) { const kC = 0.85, Wd = largo(del, 'bajo'), We = largo(esp, 'bajo'); [del, esp].forEach(z => { z.bordes.find(x => x.id === 'bajo').tipo = 'costura'; delete z.margen.borde.bajo; });
    const ci = Z.constructor('Cintura', { corte: { n: 1, espejo: false, doblez: 'cf' } }), p = ci.p, h = 2 * altCin;
    p('o', 0, 0, 'Centro delantero'); p('s', Wd * kC, 0, 'Costado'); p('cb', (Wd + We) * kC, 0, 'Centro espalda'); p('cbt', (Wd + We) * kC, h); p('ot', 0, h);
    ci.t('del', 'o', 's'); ci.t('esp', 's', 'cb'); ci.t('cb', 'cb', 'cbt'); ci.t('arriba', 'cbt', 'ot'); ci.t('cf', 'ot', 'o');
    ci.borde('del', 'Al bajo delantero', ['del'], 'costura', 7); ci.borde('esp', 'Al bajo de la espalda', ['esp'], 'costura', 7); ci.borde('cb', 'Centro espalda', ['cb'], 'costura', 7); ci.borde('arriba', 'Canto (se dobla)', ['arriba'], 'abierto', 7); ci.borde('cf', 'Centro delantero (doblez)', ['cf'], 'doblez');
    ci.interna('linea', [[0, h / 2], [(Wd + We) * kC, h / 2]], 'Se dobla aquí'); ci.hilo([(Wd + We) * kC * 0.5, h * 0.2], [(Wd + We) * kC * 0.5, h * 0.8]);
    piezas.push(ci.pz); costuras.push(costura('cinDel', 'Cintura con el bajo delantero', del, 'bajo', ci.pz, 'del', { ratio: kC }), costura('cinEsp', 'Cintura con el bajo de la espalda', esp, 'bajo', ci.pz, 'esp', { ratio: kC, inv: true }), costuraEspejo('cinCB', 'Centro de la cintura', ci.pz, 'cb')); }
  return { piezas, costuras, avisos: [] };
}

export const CAMISETA = { k: 'camiseta', e: '👕', t: 'Camiseta', categoria: 'camiseta', tejido: 'punto', medidas: MEDIDAS_CAMISETA,
  opciones: [opc('mangaTipo', 'Manga', 'corta', MANGAS), opc('escote', 'Cuello', 'redondo', [['redondo', 'Redondo'], ['pico', 'De pico'], ['cuadrado', 'Cuadrado'], ['alto', 'Cuello alto (perkins)']]), opc('rib', 'Remate del cuello', 'si', [['si', 'Tira de punto (rib)'], ['no', 'Vuelto hacia dentro']]),
    opc('puno', 'Puños', 'dobladillo', [['dobladillo', 'Dobladillo'], ['punto', 'Puño de punto']]), opc('bajo', 'Bajo', 'dobladillo', [['dobladillo', 'Dobladillo'], ['punto', 'Cintura de punto']])],
  genera(M, O) { return generaCamiseta(M, O, this); } };
