// ================= 👗 CelebriDREW · FOTO → PATRÓN en la pantalla (16-10-2026) =================
// Une la foto ENDEREZADA con el folio A4 (drew/calibra.js: sin perspectiva y con los mm por píxel sabidos) con la cadena por etapas
// (foto/pipeline.js). El folio hace de ESCALA (sus dos lados: a lo ancho y a lo alto) y se TAPA antes de recortar (si no, el papel blanco
// sería «otra prenda»); lo que queda fuera de la foto al enderezar, también. Sin pantalla: se prueba en Node (test/unit/drew_foto_patron.mjs).
//   analizaFoto(E, o) → FP · rehaz(FP, nombres) (tras arrastrar puntos) · enVivo(FP, nombre) (mientras se arrastra) · cambiaCategoria(FP, cat)
//   · puntosMaquina(FP) · dibujo(FP) (silueta, puntos y rayas con su medida) · superpone(FP) (el patrón encima de la foto, a tamaño real)
//   · resumen(FP) (lo que se enseña: cada medida con su estado) · aProyecto(FP) (lo que se lleva a la prenda)
import { analiza, continua, rehazRasgos, ETAPAS } from './pipeline.js';
import { contorno } from './imagen.js';
import { aMm } from './escala.js';
import { MAPA } from './infiere.js';
import { remide, lineas, CORTO, DEF, familiaDe } from './puntos.js';
import { CATEGORIAS } from './clasifica.js';
import * as G from '../geom.js';
import * as Z from '../pieza.js';
import * as BL from '../bloques/index.js';

export const ESTADO_T = { observado: '👁 vista en la foto', mano: '✋ ajustada por ti', confirmada: '✔ confirmada por ti', inferido: '💭 supuesta (no se ve)', confirmar: '⚠ por confirmar' };
const TARDE = ['ESCALA', 'CONSTRUCCION', 'PATRON', 'COSTURAS', 'VALIDACION'];

// la foto enderezada lista para recortar: lo transparente (fuera de la foto) y el FOLIO (con un margen para su sombra) se pintan del color del
// fondo, que se mide en el marco de la foto (o, si casi todo el marco cae fuera, alrededor del folio)
export function preparaEnderezada(E) {
  const { width: w, height: h, data } = E, f = E.folio, lf = Math.max(f[2] - f[0], f[3] - f[1]), mg = Math.max(8, Math.round(0.04 * lf));
  const tapa = [f[0] - mg, f[1] - mg, f[2] + mg, f[3] + mg], enFolio = (x, y) => x >= tapa[0] && x <= tapa[2] && y >= tapa[1] && y <= tapa[3];
  const M = [[], [], []], paso = Math.max(1, Math.round(Math.sqrt(w * h / 200000))), banda = Math.max(4, Math.round(0.06 * Math.min(w, h)));
  const toma = (x, y) => { const i = (y * w + x) * 4; if (data[i + 3] < 200 || enFolio(x, y)) return; M[0].push(data[i]); M[1].push(data[i + 1]); M[2].push(data[i + 2]); };
  for (let y = 0; y < h; y += paso) for (let x = 0; x < w; x += paso) if (x < banda || y < banda || x >= w - banda || y >= h - banda) toma(x, y);
  if (M[0].length < 300) { const r = Math.round(0.35 * lf); for (let y = Math.max(0, tapa[1] - r); y < Math.min(h, tapa[3] + r); y += paso) for (let x = Math.max(0, tapa[0] - r); x < Math.min(w, tapa[2] + r); x += paso) toma(x, y); }
  const mediana = a => { if (!a.length) return 235; const v = Float64Array.from(a).sort(); return v[v.length >> 1]; }, fondo = M.map(mediana);
  const d = new Uint8ClampedArray(w * h * 4); let fuera = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, tr = data[i + 3] < 128;
    if (tr || enFolio(x, y)) { if (tr) fuera++; d[i] = fondo[0]; d[i + 1] = fondo[1]; d[i + 2] = fondo[2]; } else { d[i] = data[i]; d[i + 1] = data[i + 1]; d[i + 2] = data[i + 2]; } d[i + 3] = 255; }
  return { img: { w, h, d }, fondo, tapa, fuera: fuera / (w * h) };
}
// la ESCALA sale del propio folio: su ancho y su alto (en los píxeles de la silueta, que va reducida k veces)
export function reglasFolio(E, k) { const f = E.folio, wp = f[2] - f[0], hp = f[3] - f[1]; return [{ a: [0, 0], b: [wp * k, 0], mm: wp * E.mmPorPx }, { a: [0, 0], b: [0, hp * k], mm: hp * E.mmPorPx }]; }

// ---------- la cadena entera con la foto enderezada ----------
// o = { categoria (si la persona ya lo ha dicho), segmentaIA(img, lado) → máscara (la IA del PC), iaVision() → JSON, lado (a cuántos px se analiza) }
export async function analizaFoto(E, o = {}) {
  const prep = preparaEnderezada(E), lado = o.lado || 1100;
  const FP = { id: o.id || 'fp' + Date.now().toString(36), E, prep, lado, categoria: o.categoria || null, movidos: new Set(), confirmadas: new Set(), avisos: [] };
  FP.T = await analiza(prep.img, { lado, categoria: o.categoria, origen: 'foto enderezada con un folio A4', tapas: [prep.tapa], segmentaIA: o.segmentaIA ? () => o.segmentaIA(prep.img, lado) : null, iaVision: o.iaVision || null });
  return termina(FP);
}
// (17-10) también la usa la FOTO DE PRODUCTO (foto/producto.js): FP.reglas(FP) da la escala (sin folio) y FP.trasRasgos(FP) añade lo suyo
export async function termina(FP) {
  const T = FP.T, S = T.etapas.SEGMENTACION; FP.k = S && S.datos ? S.datos.k : null; FP.sil = null; FP.vista = {};
  if (!FP.k || !T.etapas.RASGOS || !T.etapas.RASGOS.datos) return FP;
  FP.R0 = T.etapas.RASGOS.datos = tapadas(FP, T.etapas.RASGOS.datos); if (FP.trasRasgos) FP.R0 = T.etapas.RASGOS.datos = FP.trasRasgos(FP, FP.R0); ponVista(FP, FP.R0); FP.avisos = avisosFolio(FP).concat(FP.avisosPropios || []); await sigue(FP); return FP;
}
const ponVista = (FP, R) => { FP.vista = {}; Object.entries(R.puntos).forEach(([n, q]) => { if (q && isFinite(q.x) && isFinite(q.y)) FP.vista[n] = [q.x / FP.k, q.y / FP.k]; }); };
export async function sigue(FP) { const T = FP.T; TARDE.forEach(k => { delete T.etapas[k]; }); await continua(T, FP.reglas ? FP.reglas(FP) : reglasFolio(FP.E, FP.k), { categoria: FP.categoria || undefined }); if (FP.trasEscala) FP.trasEscala(FP); }
// las medidas con algún punto pegado a lo TAPADO (el folio) no se ven enteras: pasan a «por confirmar» y se dice por qué
function tapadas(FP, R) {
  const M = FP.T.etapas.SEGMENTACION.mascara, t = (M.tapas || [])[0]; if (!t) return R; const cerca = q => q && q.x >= t[0] - 6 && q.x <= t[2] + 6 && q.y >= t[1] - 6 && q.y <= t[3] + 6, med = Object.assign({}, R.medidas); let n = 0;
  Object.entries(DEF[familiaDe(R)] || {}).forEach(([k, d]) => { const m = med[k]; if (!m || !d.usa.some(p => cerca(R.puntos[p]))) return; med[k] = Object.assign({}, m, { conf: Math.min(m.conf, 0.4), como: m.como + ' · toca el folio: puede faltar el trozo que queda debajo' }); n++; });
  return n ? Object.assign({}, R, { medidas: med }) : R;
}
// ¿la prenda toca el folio? (al taparlo se le habría comido un trozo)
function avisosFolio(FP) {
  if (!FP.prep) return []; /* (17-10: la foto de producto no lleva folio) */ const M = FP.T.etapas.SEGMENTACION.mascara, k = FP.k, t = FP.prep.tapa.map(v => Math.round(v * k)), out = []; let toca = 0, n = 0;
  const mira = (x, y) => { if (x < 0 || y < 0 || x >= M.w || y >= M.h) return; n++; if (M.m[y * M.w + x]) toca++; };
  for (let x = t[0]; x <= t[2]; x++) { mira(x, t[1] - 2); mira(x, t[3] + 2); } for (let y = t[1]; y <= t[3]; y++) { mira(t[0] - 2, y); mira(t[2] + 2, y); }
  if (n && toca > 0.04 * n) out.push('La prenda toca el folio: el trozo que queda debajo del papel no se ve. Mejor otra foto con el folio separado unos centímetros.');
  if (FP.prep.fuera > 0.45) out.push('La foto está muy inclinada: casi la mitad de la foto enderezada queda fuera. Mejor desde arriba.');
  return out;
}

// ---------- lo que hace la persona ----------
// tras ARRASTRAR uno o varios puntos (FP.vista ya los tiene en su sitio nuevo, en píxeles de la foto enderezada): medir otra vez y rehacer el patrón
export async function rehaz(FP, nombres) {
  FP.T.etapas.RASGOS.datos = conPuntos(FP, nombres); nombres.forEach(n => FP.movidos.add(n)); await sigue(FP); return FP;
}
function conPuntos(FP, nombres) {
  const R = FP.T.etapas.RASGOS.datos, P = Object.assign({}, R.puntos);
  nombres.forEach(n => { const v = FP.vista[n]; if (v && P[n]) P[n] = Object.assign({}, P[n], { x: v[0] * FP.k, y: v[1] * FP.k, conf: 0.9, mano: true }); });
  return remide(Object.assign({}, R, { puntos: P }), new Set(nombres));
}
// mientras se arrastra (sin rehacer el patrón): las rayas con lo que miden ahora
export const enVivo = (FP, nombre) => dibujo(FP, conPuntos(FP, [nombre]));
// la persona dice qué prenda es: puntos nuevos para esa familia con la MISMA silueta (no se recorta otra vez)
export async function cambiaCategoria(FP, cat) {
  FP.categoria = cat; FP.movidos = new Set(); FP.confirmadas = new Set(); await rehazRasgos(FP.T, cat);
  const R = FP.T.etapas.RASGOS; if (!R || !R.datos) { FP.vista = {}; return FP; } FP.R0 = R.datos = tapadas(FP, R.datos); if (FP.trasRasgos) FP.R0 = R.datos = FP.trasRasgos(FP, FP.R0); ponVista(FP, FP.R0); await sigue(FP); return FP;
}
// volver a los puntos que puso la máquina
export async function puntosMaquina(FP) { FP.T.etapas.RASGOS.datos = FP.R0; ponVista(FP, FP.R0); FP.movidos = new Set(); await sigue(FP); return FP; }
// «está bien»: una medida por confirmar que la persona da por buena (sale como confirmada en la prenda)
export function confirma(FP, k, si = true) { if (si) FP.confirmadas.add(k); else FP.confirmadas.delete(k); }

// ---------- para dibujar ----------
// { silueta: [[x,y]…], puntos: { nombre: [x,y] }, lineas: [{ k, t, a, b, mm (lo que mide en la foto), plano, mano }] } en px de la foto enderezada
export function dibujo(FP, R) {
  R = R || (FP.T.etapas.RASGOS && FP.T.etapas.RASGOS.datos); if (!R || !FP.k) return null; const k = FP.k, E = FP.T.etapas.ESCALA && FP.T.etapas.ESCALA.datos;
  if (!FP.sil) { const S = FP.T.etapas.SEGMENTACION; FP.sil = S && S.mascara ? G.simplifica(contorno(S.mascara), 0.7).map(([x, y]) => [(x + 0.5) / k, (y + 0.5) / k]) : []; }
  const L = lineas(R).map(l => { const m = R.medidas[l.k]; return Object.assign(l, { a: [l.a[0] / k, l.a[1] / k], b: [l.b[0] / k, l.b[1] / k], mm: E && m ? aMm(m.vec, E) : null, plano: !!(m && m.plano), t: CORTO[l.k] || l.k }); });
  return { silueta: FP.sil, lineas: L, puntos: FP.vista };
}
// el PATRÓN encima de la foto, a tamaño real (la línea de costura): el delantero de la camiseta/sudadera, el de la falda y la falda del vestido,
// alineados por el centro y el bajo. El del pantalón no se parece a la silueta plana (delantero y espalda se solapan): no se pone.
export function superpone(FP) {
  const T = FP.T, PT = T.etapas.PATRON, R = T.etapas.RASGOS && T.etapas.RASGOS.datos; if (!PT || !PT.prenda || !R || !FP.k) return [];
  const pr = PT.prenda, kk = pr.bloque.k, s = 1 / FP.E.mmPorPx, xs = (R.xs + 0.5) / FP.k, yB = (R.B.y1 + 1) / FP.k, pz = n => pr.piezas.find(p => p.nombre === n);
  const pon = (n, t) => { const p = pz(n); return p ? [{ n: t || n, L: Z.entera(p).map(([x, y]) => [xs + x * s, yB - y * s]) }] : []; };
  if (kk === 'camiseta' || kk === 'sudadera' || kk === 'falda') return pon('Delantero');
  if (kk === 'vestido') return pon('Falda delantera');
  return [];
}

// ---------- lo que se enseña ----------
const ICONO = { ok: '✔', aviso: '⚠', error: '✘', pendiente: '…', saltada: '–' };
export function resumen(FP) {
  const T = FP.T, et = T.etapas, I = et.CONSTRUCCION, R = et.RASGOS && et.RASGOS.datos, C = et.CLASIFICACION && et.CLASIFICACION.datos, S = et.SEGMENTACION, V = et.VALIDACION;
  const k = I && I.datos ? I.datos.k : null, D = k && BL.BLOQUES[k], mapa = (k && MAPA[k]) || {}, filas = [];
  if (D) D.medidas.forEach(m => { const x = I.datos.medidas[m.k]; if (!x) return; const rk = m.k === 'espalda' && k === 'vestido' ? 'talle' : m.k === 'vuelo' ? 'bajoPlano' : mapa[m.k], rm = R && rk && R.medidas[rk], mano = !!(rm && rm.mano), conf = FP.confirmadas.has(m.k);
    const est = mano && x.estado !== 'inferido' ? 'mano' : conf ? 'confirmada' : x.estado; /* (si la ha confirmado y luego ha movido sus puntos, manda lo movido) */ filas.push({ k: m.k, t: m.t, v: x.v, estado: x.estado, ver: est, conf: x.conf, como: x.como, rk: rm ? rk : null, plano: !!(rm && rm.plano) }); });
  const orden = { confirmar: 0, mano: 1, confirmada: 1, observado: 2, inferido: 3 }; filas.sort((a, b) => orden[a.ver] - orden[b.ver]);
  return { k, t: D ? D.t : null, categoria: C ? C.categoria : FP.categoria, catT: C ? (CATEGORIAS[C.categoria] || C.categoria) : '', candidatos: C ? C.candidatos : [], fuenteCat: C ? C.fuente : '', ia: C ? C.ia : null,
    recorte: S && S.datos ? S.datos.metodo : '', confRecorte: S ? S.conf : 0, filas, componentes: I && I.datos ? I.datos.componentes : [],
    estadoPatron: V && V.datos ? V.datos.estado : null, valida: V && V.datos ? V.datos.t : null, piezas: et.PATRON && et.PATRON.datos ? et.PATRON.datos.piezas : 0,
    etapas: ETAPAS.map(([n, t]) => ({ n, t, e: et[n] ? et[n].estado : 'pendiente', i: ICONO[et[n] ? et[n].estado : 'pendiente'] || '…', ms: et[n] ? et[n].ms : null, conf: et[n] ? et[n].conf : null })),
    avisos: avisos(FP), falta: motivo(T), cuenta: filas.reduce((c, f) => { c[f.ver] = (c[f.ver] || 0) + 1; return c; }, {}) };
}
// todos los avisos de las etapas, sin repetir (lo de la escala con una sola dirección no aplica: el folio da las dos)
export function avisos(FP) { const out = [], T = FP.T; (FP.avisos || []).forEach(a => out.push(a));
  ['CALIDAD', 'SEGMENTACION', 'CLASIFICACION', 'RASGOS', 'CONSTRUCCION', 'PATRON', 'COSTURAS', 'VALIDACION'].forEach(n => { const e = T.etapas[n]; if (!e) return; (e.avisos || []).forEach(a => out.push(a)); if (e.error) out.push('✘ ' + e.error); });
  return [...new Set(out)].filter(a => !/una sola dirección/.test(a)); }
// por qué no hay patrón todavía ('' si lo hay)
export function motivo(T) { for (const [n, t] of ETAPAS) { const e = T.etapas[n]; if (!e) return 'falta: ' + t; if (e.estado === 'error') return t + ': ' + (e.error || 'error'); if (e.estado === 'pendiente') return t + ': ' + (e.avisos || []).join(' '); } return ''; }

// ---------- a la PRENDA ----------
// { k, opciones, medidas: { m: { v, origen, confianza, foto, estado, mano, confirmada, como } }, nombre, valida, deFoto } — las inferidas quedan
// como «de la plantilla» (no se han visto) y las demás como «estimadas por la foto» (origen 'ia'), cada una con su estado
export function aProyecto(FP) {
  const T = FP.T, I = T.etapas.CONSTRUCCION, PT = T.etapas.PATRON, V = T.etapas.VALIDACION;
  if (!I || !I.datos || !PT || !PT.prenda) throw new Error('Todavía no hay patrón (' + (motivo(T) || 'falta algún paso') + ').');
  const Rz = resumen(FP), k = I.datos.k, medidas = {};
  Rz.filas.forEach(f => { medidas[f.k] = f.estado === 'inferido' ? { v: f.v, origen: 'plantilla', confianza: 0, foto: true, estado: 'inferido', como: f.como }
    : { v: f.v, origen: 'ia', confianza: f.ver === 'confirmada' ? 0.95 : f.conf, foto: true, estado: f.ver === 'confirmada' || f.ver === 'mano' ? 'observado' : f.estado, mano: f.ver === 'mano' || undefined, confirmada: f.ver === 'confirmada' || undefined, como: f.como }; });
  return { k, opciones: Object.assign({}, I.datos.opciones), medidas, nombre: BL.BLOQUES[k].t + ' de la foto', estadoPatron: V && V.datos ? V.datos.estado : null, valida: V && V.datos ? V.datos.t : null,
    deFoto: { id: FP.id, fecha: new Date().toISOString(), k, categoria: Rz.categoria, recorte: Rz.recorte, mmPorPx: FP.E.mmPorPx, cuenta: Rz.cuenta, componentes: Rz.componentes, avisos: Rz.avisos.slice(0, 8), ajustados: [...FP.movidos] } };
}
