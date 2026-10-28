// ================= 👗 CelebriDREW · los PUNTOS de la foto se pueden ARRASTRAR y las medidas se vuelven a hacer (16-10-2026) =================
// Cada medida de los rasgos (foto/rasgos.js) se define aquí con los PUNTOS de los que sale: «usa» (sus nombres), «vec» (el vector en píxeles,
// igual que en rasgos: [ancho, 0] lo horizontal, [0, alto] lo vertical, [dx, dy] lo inclinado) y «linea» (dónde se dibuja en la foto).
// Cuando la persona mueve un punto, SOLO se rehacen las medidas que usan ese punto (las demás se quedan como las midió la máquina) y quedan
// «ajustadas a mano» (confianza 0,9): ya no es una suposición de la máquina, la ha mirado alguien.
import * as G from '../geom.js';

const med = (a, b) => (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a || b);
const xy = q => [q.x, q.y];
const hz = (a, b) => [Math.abs(b.x - a.x), 0];
const vt = (ya, yb) => [0, Math.abs(yb - ya)];
const recta = (a, b) => [xy(a), xy(b)];
const vertical = (x, ya, yb) => [[x, ya], [x, yb]];
const cuello = P => med(P.cuelloIzq, P.cuelloDer), cintura = P => med(P.cinturaIzq, P.cinturaDer);
// las mangas: cada lado que tenga sus puntos; la medida es la MEDIA de los lados que se ven (como en rasgos)
const lados = (P, ...n) => ['Izq', 'Der'].filter(s => n.every(k => P[k + s]));
const media = (L, f) => L.reduce((s, x) => s + f(x), 0) / L.length;
function mangaVec(P, a, b) { const L = lados(P, a, b); if (!L.length) return null; const s0 = L[0], d = G.norma(G.sub(xy(P[b + s0]), xy(P[a + s0]))).map(Math.abs);
  return G.esc(d, media(L, s => G.dist(xy(P[a + s]), xy(P[b + s])))); }
function biceps(P, s) { const r = G.distAPolilinea(xy(P['axila' + s]), [xy(P['hombro' + s]), xy(P['manga' + s])]); return r; }
const ARRIBA = {
  pecho: { usa: ['axilaIzq', 'axilaDer'], vec: P => hz(P.axilaIzq, P.axilaDer), linea: P => recta(P.axilaIzq, P.axilaDer) },
  largo: { usa: ['cuelloIzq', 'cuelloDer', 'bajoIzq', 'bajoDer'], vec: P => vt(cuello(P).y, med(P.bajoIzq, P.bajoDer).y), linea: P => vertical(P.cuelloIzq.x, cuello(P).y, med(P.bajoIzq, P.bajoDer).y) },
  bajo: { usa: ['bajoIzq', 'bajoDer'], vec: P => hz(P.bajoIzq, P.bajoDer), linea: P => recta(P.bajoIzq, P.bajoDer) },
  cuello: { usa: ['cuelloIzq', 'cuelloDer'], vec: P => hz(P.cuelloIzq, P.cuelloDer), linea: P => recta(P.cuelloIzq, P.cuelloDer) },
  bajadaDel: { usa: ['cuelloIzq', 'cuelloDer', 'escote'], vec: P => vt(cuello(P).y, P.escote.y), linea: P => vertical(P.escote.x, cuello(P).y, P.escote.y) },
  sisa: { usa: ['cuelloIzq', 'cuelloDer', 'axilaIzq', 'axilaDer'], vec: P => vt(cuello(P).y, med(P.axilaIzq, P.axilaDer).y), linea: P => vertical(P.axilaDer.x, cuello(P).y, med(P.axilaIzq, P.axilaDer).y) },
  hombros: { usa: ['hombroIzq', 'hombroDer'], vec: P => hz(P.hombroIzq, P.hombroDer), linea: P => recta(P.hombroIzq, P.hombroDer) },
  caida: { usa: ['cuelloIzq', 'cuelloDer', 'hombroIzq', 'hombroDer'], vec: P => vt(cuello(P).y, med(P.hombroIzq, P.hombroDer).y), linea: P => vertical(P.hombroDer.x, cuello(P).y, med(P.hombroIzq, P.hombroDer).y) },
  manga: { usa: ['hombroIzq', 'mangaIzq', 'hombroDer', 'mangaDer'], vec: P => mangaVec(P, 'hombro', 'manga'), linea: P => { const s = lados(P, 'hombro', 'manga')[0]; return s ? recta(P['hombro' + s], P['manga' + s]) : null; } },
  boca: { usa: ['mangaIzq', 'bocaIzq', 'mangaDer', 'bocaDer'], vec: P => mangaVec(P, 'manga', 'boca'), linea: P => { const s = lados(P, 'manga', 'boca')[0]; return s ? recta(P['manga' + s], P['boca' + s]) : null; } },
  altoCapucha: { usa: ['cuelloIzq', 'cuelloDer', 'capucha'], vec: P => vt(cuello(P).y, P.capucha.y), linea: P => vertical(P.capucha.x, P.capucha.y, cuello(P).y) }, // (17-10)
  biceps: { usa: ['axilaIzq', 'hombroIzq', 'mangaIzq', 'axilaDer', 'hombroDer', 'mangaDer'], vec: P => { const L = lados(P, 'axila', 'hombro', 'manga'); return L.length ? [media(L, s => biceps(P, s).d), 0] : null; },
    linea: P => { const s = lados(P, 'axila', 'hombro', 'manga')[0]; return s ? [xy(P['axila' + s]), biceps(P, s).p] : null; } },
};
const piernas = n => ({ usa: [n + 'IzqF', n + 'IzqD', n + 'DerD', n + 'DerF'], vec: P => { const L = []; if (P[n + 'IzqF'] && P[n + 'IzqD']) L.push(Math.abs(P[n + 'IzqD'].x - P[n + 'IzqF'].x)); if (P[n + 'DerD'] && P[n + 'DerF']) L.push(Math.abs(P[n + 'DerF'].x - P[n + 'DerD'].x)); return L.length ? [L.reduce((a, b) => a + b, 0) / L.length, 0] : null; },
  linea: P => (P[n + 'IzqF'] && P[n + 'IzqD'] ? recta(P[n + 'IzqF'], P[n + 'IzqD']) : P[n + 'DerD'] && P[n + 'DerF'] ? recta(P[n + 'DerD'], P[n + 'DerF']) : null) });
export const DEF = {
  arriba: ARRIBA,
  pantalon: {
    cintura: { usa: ['cinturaIzq', 'cinturaDer'], vec: P => hz(P.cinturaIzq, P.cinturaDer), linea: P => recta(P.cinturaIzq, P.cinturaDer) },
    cadera: { usa: ['cadera', 'caderaDer'], vec: P => hz(P.cadera, P.caderaDer), linea: P => recta(P.cadera, P.caderaDer) },
    tiro: { usa: ['cinturaIzq', 'cinturaDer', 'entrepierna'], vec: P => vt(cintura(P).y, P.entrepierna.y), linea: P => vertical(P.entrepierna.x, cintura(P).y, P.entrepierna.y) },
    altoCadera: { usa: ['cinturaIzq', 'cinturaDer', 'cadera', 'caderaDer'], vec: P => vt(cintura(P).y, med(P.cadera, P.caderaDer).y), linea: P => vertical(P.cadera.x, cintura(P).y, med(P.cadera, P.caderaDer).y) },
    largo: { usa: ['cinturaIzq', 'cinturaDer', 'bajoIzqF', 'bajoDerF'], vec: P => vt(cintura(P).y, med(P.bajoIzqF, P.bajoDerF).y), linea: P => vertical(P.cinturaIzq.x, cintura(P).y, med(P.bajoIzqF, P.bajoDerF).y) },
    bajo: piernas('bajo'), rodilla: piernas('rodilla'),
  },
  falda: {
    cintura: { usa: ['cinturaIzq', 'cinturaDer'], vec: P => hz(P.cinturaIzq, P.cinturaDer), linea: P => recta(P.cinturaIzq, P.cinturaDer) },
    cadera: { usa: ['cadera', 'caderaDer'], vec: P => hz(P.cadera, P.caderaDer), linea: P => recta(P.cadera, P.caderaDer) },
    altoCadera: { usa: ['cinturaIzq', 'cinturaDer', 'cadera', 'caderaDer'], vec: P => vt(cintura(P).y, med(P.cadera, P.caderaDer).y), linea: P => vertical(P.cadera.x, cintura(P).y, med(P.cadera, P.caderaDer).y) },
    largo: { usa: ['cinturaIzq', 'cinturaDer', 'bajoIzq', 'bajoDer'], vec: P => vt(cintura(P).y, med(P.bajoIzq, P.bajoDer).y), linea: P => vertical(P.cinturaIzq.x, cintura(P).y, med(P.bajoIzq, P.bajoDer).y) },
    bajoPlano: { usa: ['bajoIzq', 'bajoDer'], vec: P => hz(P.bajoIzq, P.bajoDer), linea: P => recta(P.bajoIzq, P.bajoDer) },
  },
  vestido: Object.assign({}, ARRIBA, {
    largo: { usa: ['cinturaIzq', 'cinturaDer', 'bajoIzq', 'bajoDer'], vec: P => vt(cintura(P).y, med(P.bajoIzq, P.bajoDer).y), linea: P => vertical(P.cinturaIzq.x, cintura(P).y, med(P.bajoIzq, P.bajoDer).y) },
    talle: { usa: ['cuelloIzq', 'cuelloDer', 'cinturaIzq', 'cinturaDer'], vec: P => vt(cuello(P).y, cintura(P).y), linea: P => vertical(P.cuelloDer.x, cuello(P).y, cintura(P).y) },
    cintura: { usa: ['cinturaIzq', 'cinturaDer'], vec: P => hz(P.cinturaIzq, P.cinturaDer), linea: P => recta(P.cinturaIzq, P.cinturaDer) },
    cadera: { usa: ['caderaIzq', 'caderaDer'], vec: P => hz(P.caderaIzq, P.caderaDer), linea: P => recta(P.caderaIzq, P.caderaDer) },
    altoCadera: { usa: ['cinturaIzq', 'cinturaDer', 'caderaIzq', 'caderaDer'], vec: P => vt(cintura(P).y, med(P.caderaIzq, P.caderaDer).y), linea: P => vertical(P.caderaIzq.x, cintura(P).y, med(P.caderaIzq, P.caderaDer).y) },
    bajoPlano: { usa: ['bajoIzq', 'bajoDer'], vec: P => hz(P.bajoIzq, P.bajoDer), linea: P => recta(P.bajoIzq, P.bajoDer) },
  }),
};
// los nombres que se enseñan (izquierda y derecha tal como se ven en la FOTO)
export const NOMBRES = { axilaIzq: 'Axila (izquierda)', axilaDer: 'Axila (derecha)', cuelloIzq: 'Cuello en el hombro (izq.)', cuelloDer: 'Cuello en el hombro (der.)', escote: 'Centro del escote', capucha: 'Lo más alto de la capucha',
  hombroIzq: 'Punta del hombro (izq.)', hombroDer: 'Punta del hombro (der.)', mangaIzq: 'Final de la manga, arriba (izq.)', mangaDer: 'Final de la manga, arriba (der.)', bocaIzq: 'Final de la manga, abajo (izq.)', bocaDer: 'Final de la manga, abajo (der.)',
  bajoIzq: 'Bajo (izquierda)', bajoDer: 'Bajo (derecha)', cinturaIzq: 'Cintura (izquierda)', cinturaDer: 'Cintura (derecha)', cadera: 'Cadera (izquierda)', caderaIzq: 'Cadera (izquierda)', caderaDer: 'Cadera (derecha)', entrepierna: 'Entrepierna',
  bajoIzqF: 'Bajo pierna izq. (fuera)', bajoIzqD: 'Bajo pierna izq. (dentro)', bajoDerD: 'Bajo pierna der. (dentro)', bajoDerF: 'Bajo pierna der. (fuera)',
  rodillaIzqF: 'Rodilla izq. (fuera)', rodillaIzqD: 'Rodilla izq. (dentro)', rodillaDerD: 'Rodilla der. (dentro)', rodillaDerF: 'Rodilla der. (fuera)' };
// el nombre corto de cada medida para escribirlo en la foto
export const CORTO = { pecho: 'Pecho', largo: 'Largo', bajo: 'Bajo', cuello: 'Cuello', bajadaDel: 'Escote', sisa: 'Sisa', hombros: 'Hombros', caida: 'Caída', manga: 'Manga', boca: 'Boca', biceps: 'Manga (ancho)',
  cintura: 'Cintura', cadera: 'Cadera', tiro: 'Tiro', altoCadera: 'Alto cadera', rodilla: 'Rodilla', bajoPlano: 'Bajo', talle: 'Talle', altoCapucha: 'Capucha' };
export const familiaDe = R => (R.tipo === 'pantalon' ? 'pantalon' : R.tipo === 'falda' ? 'falda' : R.tipo === 'vestido' ? 'vestido' : 'arriba');
const defs = R => DEF[familiaDe(R)];

// vuelve a medir lo que usa algún punto de «movidos» (Set de nombres). R.puntos ya trae los puntos en su sitio nuevo. → R nuevo (no toca el de entrada)
export function remide(R, movidos) {
  const D = defs(R), P = R.puntos, medidas = Object.assign({}, R.medidas), hechas = [];
  Object.entries(D).forEach(([k, d]) => { if (!medidas[k] || !d.usa.some(n => movidos.has(n))) return; let v = null; try { v = d.vec(P); } catch (e) { v = null; } if (!v || !v.every(isFinite)) return;
    medidas[k] = Object.assign({}, medidas[k], { vec: v, conf: 0.9, mano: true, como: String(medidas[k].como || '').replace(/ · puntos ajustados a mano$/, '') + ' · puntos ajustados a mano' }); hechas.push(k); });
  return Object.assign({}, R, { medidas, ajustadas: [...new Set((R.ajustadas || []).concat(hechas))] });
}
// las rayas de cada medida para dibujarlas: [{ k, a, b, mano }] (en las coordenadas de R, sin escalar)
export function lineas(R) {
  const D = defs(R), out = []; Object.entries(D).forEach(([k, d]) => { if (!R.medidas[k]) return; let L = null; try { L = d.linea(R.puntos); } catch (e) { L = null; } if (L && L[0] && L[1] && L.flat().every(isFinite)) out.push({ k, a: L[0], b: L[1], mano: !!R.medidas[k].mano }); });
  return out;
}
// qué medidas cambian si se mueve un punto (para decirlo al arrastrar)
export const usanPunto = (R, n) => Object.entries(defs(R)).filter(([k, d]) => R.medidas[k] && d.usa.includes(n)).map(([k]) => k);
