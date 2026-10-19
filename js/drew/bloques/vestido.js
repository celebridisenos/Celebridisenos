// ================= 👗 CelebriDREW · VESTIDO entallado (cuerpo con pinzas + falda, costura en la cintura) · tejido plano =================
// Ella: «ojo con los vestidos». Trazado de patronaje clásico (cuerpo base entallado), a partir de las MEDIDAS DE LA PRENDA:
//   · CUERPO DELANTERO (al doblez): ancho de pecho = contorno / 4 + 1 cm; el pecho pide LARGO de más por delante → PINZA DE PECHO en el
//     costado (su abertura sale de la copa: pecho − bajo pecho) apuntando al pecho (2,5 cm antes); lo que sobra de pecho a cintura se reparte
//     entre el costado (hasta 2,5 cm) y una PINZA DE CINTURA bajo el pecho. La abertura de la pinza de pecho se calcula para que el costado
//     de delante, cerrada la pinza, mida EXACTAMENTE lo que el de la espalda.
//   · CUERPO ESPALDA (en dos piezas, cremallera en el centro): ancho = contorno / 4 − 1 cm, pinza de cintura bajo el omóplato; el hombro
//     mide lo mismo que el de delante.
//   · FALDA (la de la plantilla de falda: delantera al doblez y espalda en dos con sus pinzas): su cintura = la del cuerpo.
//   · MANGA (opcional): la de la camiseta, con la copa a la medida de las sisas + 1,5 cm de embebido (tejido plano).
//   · Escote y sisas (si no lleva manga) se rematan con bies (7 mm). Cremallera invisible de la nuca a la cadera.
import * as G from '../geom.js';
import * as Z from '../pieza.js';
import { mal, costura, costuraEspejo, med, opc, compruebaMedidas, perpAbajo, largo, volante } from './comun.js';
import { mitad } from './falda.js';
import { manga } from './camiseta.js';

export const MEDIDAS_VESTIDO = [
  med('pecho', 'Contorno de pecho (de la prenda)', 960, 700, 1500, 'Pecho del cuerpo + holgura (4–8 cm en un vestido entallado).'),
  med('cintura', 'Contorno de cintura (de la prenda)', 740, 520, 1300),
  med('cadera', 'Contorno de cadera (de la prenda)', 1000, 760, 1600),
  med('espalda', 'Talle de espalda (de la nuca a la cintura)', 410, 330, 520),
  med('hombros', 'Ancho de hombros (por la espalda)', 380, 300, 520),
  med('cuello', 'Ancho del cuello (de lado a lado)', 160, 110, 240),
  med('bajadaDel', 'Bajada del escote delantero', 90, 20, 280),
  med('bajadaEsp', 'Bajada del escote de la espalda', 20, 5, 200),
  med('sisa', 'Profundidad de sisa (del hombro a la axila)', 205, 160, 300),
  med('caida', 'Caída de hombro', 45, 20, 80),
  med('alturaPecho', 'Altura de pecho (del hombro junto al cuello al pezón)', 255, 190, 340, 'Del punto del hombro pegado al cuello hasta el punto más alto del pecho.'),
  med('separacion', 'Separación de pecho (de pezón a pezón)', 180, 140, 240),
  med('pinzaPecho', 'Pinza de pecho (lo que pide la copa)', 35, 0, 90, 'Copa A ≈ 2,5 cm · B ≈ 3,5 · C ≈ 4,5 · D ≈ 5,5. Sale sola del pecho y el bajo pecho del avatar.'),
  med('altoCadera', 'Altura de cadera (de la cintura a la cadera)', 200, 140, 260),
  med('largo', 'Largo de falda (de la cintura al bajo)', 550, 250, 1300),
  med('vuelo', 'Vuelo en el bajo, en cada costado (0 = recta)', 0, 0, 250),
  med('manga', 'Largo de manga (desde la punta del hombro)', 180, 0, 800),
  med('biceps', 'Contorno de la manga en la axila', 320, 220, 600),
  med('boca', 'Contorno de la boca de la manga', 300, 160, 560),
];

// el cuerpo (delantero o espalda), con la cintura en y = 0
function cuerpoV(M, esp) {
  const H = M.espalda + 15, nw = M.cuello / 2, Wb = M.pecho / 4 - 10, Wf = M.pecho / 4 + 10, W = esp ? Wb : Wf, wq = M.cintura / 4 + (esp ? -5 : 5);
  const red = W - wq; if (red < 0) mal('La cintura es más ancha que el pecho: revisa las medidas.');
  const lado = Math.min(25, red * 0.35), pzC = red - lado, yax = H - M.sisa;
  // el costado de la espalda (recto) y lo que tiene que medir el de delante sin su pinza
  const LB = Math.hypot(lado, yax);
  const dp = esp ? 0 : M.pinzaPecho, Hf = H + dp, yaxF = yax + dp, Lf = Math.hypot(lado, yaxF), darto = esp ? 0 : Lf - LB; // abertura real de la pinza, medida en el costado
  const Hh = esp ? H : Hf, top = [nw, Hh], shx = esp ? M.hombros / 2 : M.hombros / 2 - 10;
  // el hombro: el mismo largo delante y detrás (con la caída de la espalda)
  const Lsh = Math.hypot(M.hombros / 2 - nw, M.caida), dx = shx - nw, sp = [shx, Hh - Math.sqrt(Math.max(1, Lsh * Lsh - dx * dx))];
  const B = Z.constructor(esp ? 'Cuerpo espalda' : 'Cuerpo delantero', { corte: esp ? { n: 2, espejo: true, doblez: null } : { n: 1, espejo: false, doblez: 'centro' } }), p = B.p;
  const C = esp ? 'Centro espalda' : 'Centro delantero', bpx = esp ? Math.min(W * 0.5, wq * 0.55) : M.separacion / 2, bpy = esp ? yax - 25 : Hf - M.alturaPecho;
  p('cw', 0, 0, C + ' (cintura)'); const xsw = wq + pzC; p('sw', xsw, 0, 'Costado (cintura)');
  // pinza de CINTURA (bajo el pecho / bajo el omóplato)
  const wd = pzC, xa = bpx - wd / 2, xb = bpx + wd / 2, apex = [bpx, esp ? bpy : bpy - 20];
  p('da', xa, 0, 'Pinza'); p('dv', apex[0], apex[1], 'Punta de la pinza'); p('db', xb, 0, 'Pinza');
  const ax = [W, esp ? yax : yaxF]; p('ax', ax[0], ax[1], 'Axila'); p('sp', sp[0], sp[1], 'Punta del hombro'); p('hps', top[0], top[1], 'Cuello en el hombro');
  const cn = [0, Hh - (esp ? M.bajadaEsp : M.bajadaDel)]; p('cn', cn[0], cn[1], C + ' (cuello)');
  B.t('cint0', 'cw', 'da'); B.t('patac0', 'da', 'dv'); B.t('patac1', 'dv', 'db'); B.t('cint1', 'db', 'sw'); B.pinza('pinzaCintura', 'patac0', 'patac1', 'dv');
  if (!esp && darto > 1) {
    // pinza de PECHO en el costado: boca a 7 cm bajo la axila (medido por el costado), punta 2,5 cm antes del pecho
    const u = G.norma(G.sub(ax, [xsw, 0])), sB = Lf - 70 - darto, pb = G.suma([xsw, 0], G.esc(u, sB)), pa = G.suma(pb, G.esc(u, darto)), mid = G.lerp(pa, pb, 0.5), nIn = [-u[1], u[0]][0] < 0 ? [-u[1], u[0]] : [u[1], -u[0]], Lp = Math.max(40, G.punto(G.sub([bpx, bpy], mid), nIn) - 25), vtx = G.suma(mid, G.esc(nIn, Lp)); /* (la punta, sobre la mediatriz de la boca: las dos patas miden lo mismo) */
    p('pb', pb[0], pb[1], 'Pinza de pecho'); p('pv', vtx[0], vtx[1], 'Punta de la pinza de pecho'); p('pa', pa[0], pa[1], 'Pinza de pecho');
    B.t('costadoA', 'sw', 'pb'); B.t('patap0', 'pb', 'pv'); B.t('patap1', 'pv', 'pa'); B.t('costadoB', 'pa', 'ax'); B.pinza('pinzaPecho', 'patap0', 'patap1', 'pv');
    B.borde('costado', 'Costado', ['costadoA', 'costadoB']);
  } else { B.t('costado', 'sw', 'ax'); B.borde('costado', 'Costado', ['costado']); }
  // sisa, hombro, escote y centro
  const uSh = G.norma(G.sub(sp, top)), abajo = perpAbajo(uSh), prof = sp[1] - ax[1], kx = Math.max(10, (esp ? 0.45 : 0.62) * (W - sp[0]) + 14);
  B.t('sisa', 'ax', 'sp', [ax[0] - kx, ax[1]], G.suma(sp, G.esc(abajo, (esp ? 0.5 : 0.42) * prof)));
  B.t('hombro', 'sp', 'hps');
  const baj = esp ? M.bajadaEsp : M.bajadaDel; let tramosEsc = ['escote'];
  // (18-10) el escote delantero: redondo, de PICO o CUADRADO (la espalda, siempre redonda)
  if (!esp && M.escote === 'pico') B.t('escote', 'hps', 'cn', G.suma(top, G.esc(abajo, 0.25 * baj)), [cn[0] + 0.12 * nw, cn[1] + 0.25 * baj]);
  else if (!esp && M.escote === 'cuadrado') { const xq = Math.max(nw * 0.92, nw - 12); p('eq', xq, cn[1], 'Esquina del escote'); B.t('escote', 'hps', 'eq'); B.t('escoteB', 'eq', 'cn'); tramosEsc = ['escote', 'escoteB']; }
  else B.t('escote', 'hps', 'cn', G.suma(top, G.esc(abajo, Math.min(0.55 * baj, 0.6 * nw))), [cn[0] + 0.55 * nw, cn[1]]);
  B.t('centro', 'cn', 'cw');
  B.borde('cintura', 'Cintura', ['cint0', 'cint1']); B.borde('sisa', 'Sisa', ['sisa'], M.sinMangas ? 'remate' : 'costura', M.sinMangas ? 7 : null);
  B.borde('hombro', 'Hombro', ['hombro']); B.borde('escote', 'Escote (se remata con bies)', tramosEsc, 'remate', 7);
  B.borde('centro', esp ? 'Centro espalda (cremallera)' : 'Centro delantero (doblez)', ['centro'], esp ? 'costura' : 'doblez', esp ? 15 : null);
  B.hilo([W * 0.55, yax * 0.25], [W * 0.55, yax * 0.85]);
  // (16-10) VARILLAS (corsé): canales de abajo arriba, 1,2 cm por encima de la cintura (su margen) hasta 2,5–3 cm antes del borde de arriba;
  // delante: centro (sobre el doblez), pinza de cintura y costado (hasta la pinza de pecho); detrás: junto a la cremallera, pinza y costado
  if (M.varillas) { const can = (a, b, n) => { if (b[1] - a[1] > 40) B.pz.internas.push({ id: Z.nid('in'), tipo: 'varilla', pts: [a, b], n: 'Varilla: ' + n + ' · canal ' + G.cm(b[1] - a[1]) + ' cm' }); };
    const xLado = y => xsw + (ax[0] - xsw) * (y / ax[1]), topeLado = esp ? yax - 30 : (darto > 1 ? B.pz.puntos.pb.y - 15 : yaxF - 30);
    if (!esp) can([0, 12], [0, cn[1] - 30], 'centro delantero (sobre el doblez)'); else can([14, 12], [14, cn[1] - 30], 'junto a la cremallera');
    can([bpx, 12], [bpx, apex[1] - (esp ? 15 : 25)], 'pinza de cintura'); can([xLado(12) - 14, 12], [xLado(topeLado) - 14, topeLado], 'costado'); }
  B.pz.meta.notas.push(esp ? 'Pinza de cintura de ' + G.cm(wd) + ' cm.' : 'Pinza de pecho de ' + G.cm(darto) + ' cm (copa) y de cintura de ' + G.cm(wd) + ' cm.');
  return B.pz;
}

export function generaVestido(M0, O = {}, D = VESTIDO) {
  const M = Object.assign({}, M0); if (O.falda === 'evase' && !(M.vuelo > 0)) M.vuelo = 60; if (O.falda === 'recta') M.vuelo = 0;
  compruebaMedidas(D, M); M.sinMangas = O.mangaTipo === 'sin'; M.varillas = O.varillas === 'si'; M.escote = O.escote || 'redondo';
  // (18-10) con VOLANTE en el bajo: la falda acaba antes (el volante pone el resto del largo)
  // (con una falda CORTA, el volante la alarga en vez de quitarle largo: se dice)
  const conVol = O.bajo === 'volante', altVol = conVol ? Math.min(140, Math.max(60, Math.round(M.largo * 0.18))) : 0, quita = conVol ? Math.max(0, Math.min(altVol, M.largo - M.altoCadera - 50)) : 0; M.largo -= quita;
  if (M.cadera < M.cintura) mal('La cadera tiene que medir más que la cintura.');
  if (M.alturaPecho > M.espalda + 15 - 40) mal('La altura de pecho no cabe en el talle: revisa la altura de pecho o el talle de espalda.');
  const del = cuerpoV(M, false), esp = cuerpoV(M, true);
  const fdel = mitad(M, false), fesp = mitad(M, true); fdel.nombre = 'Falda delantera'; fesp.nombre = 'Falda espalda';
  const piezas = [del, esp, fdel, fesp], costuras = [costura('hombro', 'Hombros', del, 'hombro', esp, 'hombro'), costura('costado', 'Costados del cuerpo', del, 'costado', esp, 'costado'),
    costuraEspejo('cremallera', 'Centro espalda del cuerpo (cremallera)', esp, 'centro'), costura('costadoFalda', 'Costados de la falda', fdel, 'costado', fesp, 'costado'), costuraEspejo('cremalleraFalda', 'Centro espalda de la falda (cremallera)', fesp, 'centro'),
    // la cintura del cuerpo (de dentro a fuera) con la de la falda (de fuera a dentro)
    costura('cinDel', 'Cuerpo con la falda (delante)', del, 'cintura', fdel, 'cintura', { inv: true }), costura('cinEsp', 'Cuerpo con la falda (detrás)', esp, 'cintura', fesp, 'cintura', { inv: true })];
  if (O.mangaTipo !== 'sin') {
    const Lfa = largo(del, 'sisa'), Lba = largo(esp, 'sisa'), Mm = Object.assign({}, M, { manga: O.mangaTipo === 'larga' ? Math.max(M.manga, 520) : M.manga }), m = manga(Mm, Lfa, Lba, 15);
    const dF = 0.5 * Lfa, dB = 0.5 * Lba, Lcf = largo(m.pz, 'copaDel'), Lcb = largo(m.pz, 'copaEsp');
    del.piquetes.push({ id: Z.nid('pq'), borde: 'sisa', d: dF, n: 1 }); esp.piquetes.push({ id: Z.nid('pq'), borde: 'sisa', d: dB, n: 2 });
    m.pz.piquetes.push({ id: Z.nid('pq'), borde: 'copaDel', d: dF * Lcf / Lfa, n: 1 }, { id: Z.nid('pq'), borde: 'copaEsp', d: Lcb - dB * Lcb / Lba, n: 2 });
    piezas.push(m.pz);
    costuras.push(costura('sisaDel', 'Sisa delantera con la manga', del, 'sisa', m.pz, 'copaDel', { ratio: Lcf / Lfa }), costura('sisaEsp', 'Sisa de la espalda con la manga', esp, 'sisa', m.pz, 'copaEsp', { inv: true, ratio: Lcb / Lba }),
      costura('manga', 'Costura de la manga', m.pz, 'costuraDer', m.pz, 'costuraIzq', { inv: true }));
  }
  esp.meta.notas.push('Cremallera invisible desde la nuca hasta ' + G.cm(M.altoCadera - 20, 0) + ' cm por debajo de la cintura (cuerpo + falda).');
  if (M.escote === 'cuadrado') del.meta.notas.push('Escote CUADRADO: en las esquinas, un piquete hasta 2 mm de la costura para que la vista quede plana.');
  if (conVol) { const fr = 1.35, Bd = largo(fdel, 'bajo'), Be = largo(fesp, 'bajo'), v = volante(Bd, Be, altVol, fr, M.largo); [fdel, fesp].forEach(z => { z.bordes.find(x => x.id === 'bajo').tipo = 'costura'; z.margen.borde.bajo = 10; });
    if (quita < altVol) v.meta.notas.push('La falda es corta: el volante la alarga ' + G.cm(altVol - quita) + ' cm (para no subir el bajo por encima de la cadera).');
    piezas.push(v); costuras.push(costura('volDel', 'Volante con el bajo delantero', fdel, 'bajo', v, 'del', { ratio: fr }), costura('volEsp', 'Volante con el bajo de la espalda', fesp, 'bajo', v, 'esp', { ratio: fr, inv: true }), costuraEspejo('volCB', 'Centro espalda del volante', v, 'cb')); }
  return { piezas, costuras, avisos: [] };
}

export const VESTIDO = { k: 'vestido', e: '👗', t: 'Vestido', categoria: 'vestido', tejido: 'plano', medidas: MEDIDAS_VESTIDO,
  opciones: [opc('mangaTipo', 'Manga', 'sin', [['sin', 'Sin mangas'], ['corta', 'Corta'], ['larga', 'Larga']]), opc('escote', 'Escote', 'redondo', [['redondo', 'Redondo'], ['pico', 'De pico'], ['cuadrado', 'Cuadrado']]), opc('bajo', 'Bajo', 'dobladillo', [['dobladillo', 'Dobladillo'], ['volante', 'Con volante']]), opc('falda', 'Falda', 'recta', [['recta', 'Recta (de tubo)'], ['evase', 'Evasé (vuelo en el bajo)']]), opc('varillas', 'Varillas (corsé)', 'no', [['no', 'Sin varillas'], ['si', 'Con varillas (canales en el cuerpo)']])],
  genera(M, O) { return generaVestido(M, O, this); } };
