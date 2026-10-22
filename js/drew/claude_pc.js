// ================= 👗 CelebriDREW · CLAUDE y el MANUAL CON IA también desde el MÓVIL y la TABLET (21-10-2026) =================
// Ella: «CelebriDREW no puede solo funcionar en el PC, también en todo». Claude va con SU cuenta por el programa del PC (desktop/host/claude.go)
// y el manual fácil con la IA local de su torre (Ollama): el móvil no tiene ninguna de las dos. Igual que las fotos (foto/vision_pc.js), se lo
// ENCARGA al PC del taller por los encargos al PC (trabajospc.js), viajando como «caras» con modo 'claude' o 'manual' (pc_encargos.js).
// Hace falta el PC encendido con el programa abierto; si no, se dice (no se finge). La foto de trabajo se borra sola al recibir la respuesta.
import { api, can } from '../store.js';
import { encargarAlPC, refArchivo, archivoDelEncargo } from '../trabajospc.js';

export const TIPO = 'caras';
// ---------- en el móvil / la tablet ----------
// el servidor de Google pide que un encargo «caras» lleve un archivo: lo que se pide viaja en un JSON (y la foto, dentro, en base64)
async function pedido(nombre, datos) {
  if (!can('archivos.subir')) throw new Error('Para encargárselo al PC del taller hace falta poder subir archivos.');
  const w = await api('pc.servidor', {}, { quiet: true }).catch(() => null);
  if (!w || !(w.puede || []).includes(TIPO)) throw new Error('El PC del taller no está encendido con el programa abierto. Enciéndelo (o abre allí CelebriDiseños) y vuelve a pulsar.');
  const F = await import('../files.js');
  return refArchivo(await F.uploadFile(new File([JSON.stringify(datos)], nombre + '_' + Date.now() + '.json', { type: 'application/json' }), { original: true }));
}
// lo mismo que desktop.claudePregunta(texto, b64) del PC → { ok, texto, ms, error, sinSesion, pc: true }
export async function claudePorPC(texto, b64, { onStatus, signal } = {}) {
  onStatus && onStatus(b64 ? '📤 Enviando tu petición y la foto al PC del taller…' : '📤 Enviando tu petición al PC del taller…');
  const archivo = await pedido('celebridrew_claude', { pregunta: String(texto || '').slice(0, 20000), foto: b64 || '' }), t0 = Date.now();
  const res = await encargarAlPC(TIPO, { modo: 'claude', archivo }, { onStatus, signal, maxMs: 6 * 60000 });
  api('pc.recibido', { id: res.__id }, { quiet: true }).catch(() => { });
  return { ok: !!res.ok, texto: String(res.texto || ''), error: res.error || '', sinSesion: !!res.sinSesion, noInstalado: !!res.noInstalado, ms: Date.now() - t0, pc: true };
}
// el manual fácil con la IA del PC → { pasos, avisos, modelo, pc: true }
export async function manualPorPC(P0, prenda, { onStatus, signal } = {}) {
  onStatus && onStatus('📤 Pidiendo el manual a la IA del PC del taller…');
  const pasos = P0.map(p => ({ titulo: p.titulo || '', texto: String(p.texto || ''), ids: p.ids || [] }));
  const archivo = await pedido('celebridrew_manual', { pasos, prenda: prenda || {} });
  const res = await encargarAlPC(TIPO, { modo: 'manual', archivo }, { onStatus, signal, maxMs: 8 * 60000 });
  api('pc.recibido', { id: res.__id }, { quiet: true }).catch(() => { });
  if (!res || !Array.isArray(res.pasos) || res.pasos.length !== P0.length) throw new Error(res && res.error ? res.error : 'La IA del PC no ha devuelto el manual.');
  return { pasos: res.pasos.map(String), avisos: Array.isArray(res.avisos) ? res.avisos.map(String) : [], modelo: res.modelo || 'IA del PC', pc: true };
}
const leePedido = async e => { try { return JSON.parse(await (await archivoDelEncargo(e.archivo)).text()); } catch (x) { throw new Error('No puedo leer lo que se pidió (' + x.message + ').'); } };

// ---------- en el PC (lo llama pc_encargos.js) ----------
export async function atiendeClaude(job, progreso) {
  const e = job.entrada || {}, { desktop } = await import('../desktop.js'); progreso(5);
  if (!desktop.on || !desktop.claudePregunta) return { ok: false, error: 'El PC del taller no tiene Claude (abre allí el programa).' };
  const est = await desktop.claudeEstado(true).catch(x => ({ error: x.message }));
  if (est && est.error && !est.instalado) return { ok: false, error: est.error };
  if (!est.instalado) return { ok: false, noInstalado: true, error: 'En el PC del taller no está la app de escritorio de Claude.' };
  if (!est.sesion) return { ok: false, sinSesion: true, error: 'En el PC del taller Claude no está conectado: ábrelo allí una vez y pulsa «🔗 Conectar Claude».' };
  progreso(15); const q = await leePedido(e); progreso(25);
  const r = await desktop.claudePregunta(String(q.pregunta || '').slice(0, 20000), String(q.foto || '')); progreso(95);
  return { ok: !!r.ok, texto: String(r.texto || '').slice(0, 40000), error: r.error || '', sinSesion: !!r.sinSesion, ms: r.ms || 0 };
}
export async function atiendeManual(job, progreso) {
  const e = job.entrada || {}, { desktop } = await import('../desktop.js'); progreso(5);
  const q = await leePedido(e), P0 = Array.isArray(q.pasos) ? q.pasos : []; if (!P0.length) throw new Error('El encargo no trae los pasos.');
  const { localStatus } = await import('../ai/models.js'), S = await localStatus(true); progreso(15);
  if (!desktop.on || !S || !S.disponible || !S.modelo) throw new Error('La IA del PC del taller no está lista' + (S && S.motivo ? ' (' + S.motivo + ')' : '') + '.');
  const MI = await import('./manual_ia.js'); let n = 0;
  const R = await MI.escribe(P0, { chat: desktop.iaChat, modelo: S.modelo, prenda: q.prenda || {}, onTexto: () => { n++; if (n % 40 === 0) progreso(Math.min(90, 15 + n / 8)); } });
  progreso(95); return { pasos: R.pasos, avisos: R.avisos, modelo: R.modelo };
}
