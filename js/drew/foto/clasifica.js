// ================= 👗 CelebriDREW · ¿QUÉ PRENDA ES? (visión con IA local + la forma de la silueta) =================
// · La IA de visión de la torre (Ollama, modelo «qwen2.5vl:3b», sin internet: la foto no sale del PC) mira la foto y contesta en JSON:
//   categoría, vista, cómo está puesta, manga, cuello, cierre, bolsillos, capucha, pliegues/pinzas, si es elástica, y su confianza.
// · La forma de la silueta da otra pista (perneras = pantalón; mangas separadas = prenda de arriba…).
// Se combinan y se enseñan las DOS; decide la persona. Si la IA no está (o no contesta en JSON), se dice y se sigue con la forma.
// El modelo es pequeño: se ha comprobado que contesta en JSON; su acierto con prendas NO está medido todavía (se apunta en cada análisis).
export const CATEGORIAS = { camiseta: 'Camiseta', polo: 'Polo', camisa: 'Camisa', sudadera: 'Sudadera con capucha', 'sudadera sin capucha': 'Sudadera sin capucha', chaqueta: 'Chaqueta', abrigo: 'Abrigo', pantalon: 'Pantalón', vaquero: 'Vaquero', falda: 'Falda', vestido: 'Vestido', deporte: 'Ropa deportiva' };
export const MODELO_VISION = 'qwen2.5vl:3b';
const PREGUNTA = 'Eres un sistema de análisis de prendas para patronaje. Mira la foto y contesta SOLO con un JSON con estas claves: ' +
  '"categoria" (una de: ' + Object.keys(CATEGORIAS).join(', ') + ', otra), "vista" (frontal, trasera, lateral, desconocida), "presentacion" (plana, maniqui, persona, percha, desconocida), ' +
  '"manga" (sin, corta, tres_cuartos, larga, desconocida), "cuello" (redondo, pico, polo, camisa, capucha, alto, otro, desconocido), "cierre" (ninguno, botones, cremallera, desconocido), ' +
  '"bolsillos" (número que se ven), "capucha" (true/false), "pinzas_o_pliegues" (true/false), "elastico" (true/false si parece punto elástico), "confianza" (0 a 1), "notas" (una frase corta en español con lo que ves). No inventes lo que no se ve.';
// pregunta a la IA local; img = dataURL o base64 (JPEG). Devuelve el JSON leído o lanza un error claro.
export async function conIA(imgBase64, o = {}) {
  const { desktop } = await import('../../desktop.js'); if (!desktop || !desktop.on) throw new Error('La IA local solo está en el programa del PC.');
  const b64 = String(imgBase64).replace(/^data:[^,]+,/, ''); let txt = ''; const t0 = Date.now();
  await desktop.iaChat({ model: o.modelo || MODELO_VISION, stream: true, format: 'json', options: { temperature: 0 }, messages: [{ role: 'user', content: PREGUNTA, images: [b64] }] }, ch => { if (ch && ch.message && ch.message.content) txt += ch.message.content; }, o.signal);
  const j = leeJSON(txt); if (!j) throw new Error('La IA no ha contestado en el formato pedido.'); j.ms = Date.now() - t0; j.modelo = o.modelo || MODELO_VISION; return normaliza(j);
}
export function leeJSON(t) { try { return JSON.parse(t); } catch (e) { const m = /\{[\s\S]*\}/.exec(String(t || '')); if (m) { try { return JSON.parse(m[0]); } catch (x) { } } return null; } }
export function normaliza(j) {
  const s = v => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(), cat = s(j.categoria).replace('pantalones', 'pantalon').replace('camisetas', 'camiseta').replace('hoodie', 'sudadera').replace('t-shirt', 'camiseta').replace('jeans', 'vaquero').replace('skirt', 'falda').replace('dress', 'vestido');
  return { categoria: CATEGORIAS[cat] ? cat : 'otra', vista: s(j.vista) || 'desconocida', presentacion: s(j.presentacion) || 'desconocida', manga: s(j.manga) || 'desconocida', cuello: s(j.cuello) || 'desconocido', cierre: s(j.cierre) || 'desconocido',
    bolsillos: Number.isFinite(+j.bolsillos) ? +j.bolsillos : null, capucha: j.capucha === true || s(j.capucha) === 'true', pinzas: j.pinzas_o_pliegues === true, elastico: j.elastico === true, confianza: Math.max(0, Math.min(1, +j.confianza || 0)), notas: String(j.notas || '').slice(0, 300), ms: j.ms, modelo: j.modelo };
}
// junta la IA y la forma → { categoria, candidatos, fuente, pistas }
export function decide(forma, ia) {
  const cand = new Map(); forma.forEach(f => cand.set(f.k, { k: f.k, conf: f.conf * 0.6, porque: ['Forma: ' + f.porque] }));
  if (ia && ia.categoria !== 'otra') { const c = cand.get(ia.categoria) || { k: ia.categoria, conf: 0, porque: [] }; c.conf = Math.min(0.95, c.conf + 0.5 * (ia.confianza || 0.5) + 0.2); c.porque.push('IA de visión: ' + (ia.notas || ia.categoria)); cand.set(ia.categoria, c);
    if (ia.capucha && cand.has('camiseta') && !cand.has('sudadera')) cand.set('sudadera', { k: 'sudadera', conf: 0.5, porque: ['La IA ve capucha.'] }); }
  const L = [...cand.values()].sort((a, b) => b.conf - a.conf);
  return { categoria: L[0].k, candidatos: L, fuente: ia ? 'ia+forma' : 'forma', pistas: ia ? { vista: ia.vista, cuello: ia.cuello, cierre: ia.cierre, bolsillos: ia.bolsillos, capucha: ia.capucha, presentacion: ia.presentacion } : {} };
}
