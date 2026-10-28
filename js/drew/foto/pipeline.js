// ================= 👗 CelebriDREW · la CADENA foto → patrón, por etapas =================
// IMAGEN → CALIDAD → SEGMENTACION → CLASIFICACION → RASGOS → ESCALA → CONSTRUCCION → PATRON → COSTURAS → VALIDACION
// Cada etapa deja { estado: 'ok' | 'aviso' | 'error' | 'pendiente' | 'saltada', ms, conf, avisos, error, datos } en el TRABAJO.
// Si una falla, lo anterior se queda (resultados parciales) y se puede seguir desde ahí cuando se arregle (p. ej. al dar la medida de escala).
// El trabajo guarda también qué se ha usado (método de recorte, modelo de IA y su versión) para poder repetirlo y compararlo.
import { calidad } from './calidad.js';
import { segmentaColor } from './segmenta.js';
import { rasgosArriba, rasgosPantalon, rasgosFalda, rasgosVestido, formaSugiere } from './rasgos.js';
import { calcula } from './escala.js';
import { infiere } from './infiere.js';
import { decide } from './clasifica.js';
import * as BL from '../bloques/index.js';
import { valida, ESTADOS } from '../valida.js';
import { nid } from '../pieza.js';

export const ETAPAS = [['IMAGEN', 'Imagen'], ['CALIDAD', 'Calidad'], ['SEGMENTACION', 'Recorte'], ['CLASIFICACION', 'Qué prenda es'], ['RASGOS', 'Puntos y medidas (px)'], ['ESCALA', 'Escala'], ['CONSTRUCCION', 'Construcción'], ['PATRON', 'Patrón'], ['COSTURAS', 'Costuras'], ['VALIDACION', 'Validación']];
export const familia = k => (k === 'pantalon' || k === 'vaquero' ? 'pantalon' : k === 'falda' ? 'falda' : k === 'vestido' ? 'vestido' : 'arriba'); // (16-10: el vestido, con su cintura y su falda)
export const nuevoTrabajo = () => ({ id: nid('tr'), creado: new Date().toISOString(), etapas: {}, cancelado: false, version: 1 });
async function etapa(T, nombre, fn) {
  if (T.cancelado) { T.etapas[nombre] = { estado: 'saltada', avisos: ['Cancelado.'] }; return null; }
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  try { const r = await fn(); T.etapas[nombre] = Object.assign({ estado: r && r.avisos && r.avisos.length ? 'aviso' : 'ok', avisos: [] }, r, { ms: Math.round((typeof performance !== 'undefined' ? performance : Date).now() - t0) }); return T.etapas[nombre]; }
  catch (e) { T.etapas[nombre] = { estado: 'error', error: e.message || String(e), ms: Math.round((typeof performance !== 'undefined' ? performance : Date).now() - t0) }; return null; }
}
// 1–5: lo que se hace solo con la foto · o = { segmentaIA?(canvas) → máscara, iaVision?() → JSON, canvas?, categoria? (si la persona ya lo dijo) }
export async function analiza(img, o = {}) {
  const T = o.trabajo || nuevoTrabajo();
  await etapa(T, 'IMAGEN', async () => ({ datos: { w: img.w, h: img.h, origen: o.origen || null }, conf: 1 }));
  const Q = await etapa(T, 'CALIDAD', async () => { const q = calidad(img); return { datos: q, conf: q.puntuacion, avisos: q.avisos, estado: q.suficiente ? (q.avisos.length ? 'aviso' : 'ok') : 'aviso' }; });
  const S = await etapa(T, 'SEGMENTACION', async () => {
    let s = null, avisos = []; if (o.segmentaIA) { try { s = await o.segmentaIA(); } catch (e) { avisos.push('IA de recorte: ' + e.message); } }
    if (!s) s = segmentaColor(img, { lado: o.lado }); /* (16-10: o.lado = a cuántos píxeles se analiza; 900 si no se dice) */
    if (o.tapas && s.mascara) s.mascara.tapas = o.tapas.map(r => r.map(v => v * s.k)); /* (16-10: lo que se ha tapado, p. ej. el folio, en píxeles de la máscara: lo que lo toca no se ve entero) */ if (s.confianza < 0.4) avisos.push('Recorte poco fiable (' + Math.round(s.confianza * 100) + ' %): comprueba la silueta.');
    return { datos: { metodo: s.metodo, k: s.k, ruidoFondo: s.ruidoFondo }, mascara: s.mascara, conf: s.confianza, avisos: avisos.concat(s.avisos || []) }; });
  if (!S) return T;
  const C = await etapa(T, 'CLASIFICACION', async () => {
    const forma = formaSugiere(S.mascara); let ia = null, avisos = [];
    if (o.iaVision) { try { ia = await o.iaVision(); } catch (e) { avisos.push('IA de visión no disponible: ' + e.message + ' (se usa solo la forma).'); } }
    const d = decide(forma, ia); if (o.categoria) { d.categoria = o.categoria; d.fuente = 'persona'; }
    return { datos: Object.assign(d, { ia, forma }), conf: d.candidatos[0].conf, avisos }; });
  const cat = C ? C.datos.categoria : (o.categoria || 'camiseta');
  await etapa(T, 'RASGOS', async () => rasgosDe(S.mascara, cat));
  T.etapas.ESCALA = { estado: 'pendiente', avisos: ['Falta una medida de verdad de la prenda para pasar de píxeles a centímetros.'] };
  return T;
}
// los PUNTOS y medidas en píxeles de la silueta, según la familia de la prenda
function rasgosDe(mascara, cat) {
  const f = familia(cat), R = f === 'pantalon' ? rasgosPantalon(mascara) : f === 'falda' ? rasgosFalda(mascara) : f === 'vestido' ? rasgosVestido(mascara) : rasgosArriba(mascara);
  if (!R) throw new Error('No encuentro los puntos de un ' + cat + ' en esta silueta: ¿es la categoría correcta?');
  const confs = Object.values(R.medidas).map(m => m.conf); return { datos: R, conf: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0, avisos: R.avisos };
}
// (16-10) la persona dice QUÉ PRENDA ES (o quiere los puntos de la máquina otra vez): se rehacen los puntos con la silueta ya recortada (sin recortar otra vez)
export async function rehazRasgos(T, categoria) {
  const S = T.etapas.SEGMENTACION; if (!S || !S.mascara) throw new Error('Primero hay que analizar la foto.');
  if (T.etapas.CLASIFICACION && T.etapas.CLASIFICACION.datos) Object.assign(T.etapas.CLASIFICACION.datos, { categoria, fuente: 'persona' });
  ['ESCALA', 'CONSTRUCCION', 'PATRON', 'COSTURAS', 'VALIDACION'].forEach(k => { delete T.etapas[k]; });
  await etapa(T, 'RASGOS', async () => rasgosDe(S.mascara, categoria)); return T;
}
// 6–10: con la escala (refs) y, si la persona lo ha cambiado, la categoría y los puntos
export async function continua(T, refs, o = {}) {
  const R = T.etapas.RASGOS && T.etapas.RASGOS.datos; if (!R) throw new Error('Primero hay que analizar la foto.');
  const cat = o.categoria || (T.etapas.CLASIFICACION && T.etapas.CLASIFICACION.datos.categoria) || 'camiseta', pistas = (T.etapas.CLASIFICACION && T.etapas.CLASIFICACION.datos.pistas) || {};
  const E = await etapa(T, 'ESCALA', async () => { const e = calcula(R, refs); if (!e.ok) return { estado: 'pendiente', avisos: e.avisos }; return { datos: e, conf: e.iso ? 0.6 : (e.dif > 0.04 ? 0.5 : 0.85), avisos: e.avisos }; });
  if (!E || E.estado === 'pendiente') return T;
  const I = await etapa(T, 'CONSTRUCCION', async () => { const x = infiere(R, E.datos, cat, pistas); return { datos: x, conf: 0.6, avisos: x.avisos }; });
  if (!I) return T;
  const P = await etapa(T, 'PATRON', async () => {
    const md = I.datos.medidas, med = Object.fromEntries(Object.entries(md).map(([k, v]) => [k, v.v])); let pr, avisos = [];
    try { pr = BL.genera(I.datos.k, med, I.datos.opciones); }
    catch (e) { // con lo medido no se puede trazar: las medidas POCO FIABLES se cambian por las de la plantilla a la proporción de la prenda, y se dice
      const def = BL.medidasPorDefecto(I.datos.k), ref = ['pecho', 'cadera', 'cintura'].find(r => md[r] && md[r].estado === 'observado'), f = ref ? med[ref] / def[ref] : 1, cambiadas = [];
      Object.entries(md).forEach(([k, v]) => { if (v.estado === 'confirmar') { const nv = Math.round(def[k] * (/largo|manga|sisa|tiro|alto|caida|bajada/.test(k) ? 1 : f)); cambiadas.push(k + ': ' + (v.v / 10).toFixed(1) + ' → ' + (nv / 10).toFixed(1) + ' cm'); v.como += ' · NO se ha podido usar (' + e.message + '): se pone ' + (nv / 10).toFixed(1) + ' cm (proporcional, hay que confirmarlo)'; v.v = nv; med[k] = nv; } });
      if (!cambiadas.length) throw e; pr = BL.genera(I.datos.k, med, I.datos.opciones); avisos.push('Con lo medido no se podía trazar (' + e.message + '). He cambiado lo poco fiable: ' + cambiadas.join(' · ') + '. Confírmalo.'); }
    return { datos: { k: I.datos.k, piezas: pr.piezas.length }, prenda: pr, conf: 0.6, avisos }; });
  if (!P) return T;
  await etapa(T, 'COSTURAS', async () => ({ datos: { costuras: P.prenda.costuras.length, lista: P.prenda.costuras.map(c => c.n) }, conf: 0.6, avisos: ['Costuras de la construcción típica (no se ven en la foto): revísalas.'] }));
  await etapa(T, 'VALIDACION', async () => { const V = valida(P.prenda); return { datos: { estado: V.estado, t: ESTADOS[V.estado].t, errores: V.E.length, avisos: V.A.length }, conf: V.ok ? 1 : 0.3, avisos: V.A.map(a => a.t + ': ' + a.d), estado: V.ok ? (V.A.length ? 'aviso' : 'ok') : 'error' }; });
  return T;
}
