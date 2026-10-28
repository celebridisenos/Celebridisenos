// ================= 👗 CelebriDREW · la IA de VISIÓN del PC, también desde el iPad y el móvil (16-10-2026) =================
// Ella: «tiene que funcionar en la iPad sí o sí». En el iPad no hay Ollama: la foto viaja al PC del taller por los ENCARGOS AL PC
// (trabajospc.js: la misma vía con la que el móvil le pide quitar fondos), el PC la mira con su IA (vision.js, qwen3-vl:4b) y devuelve
// la respuesta. Hace falta el PC encendido con el programa abierto; si no, se dice y ella contesta a toques mientras tanto.
// Viaja como encargo «caras» con modo 'vision' (ver web/js/pc_encargos.js: el servidor 18.0.0 no admite tipos nuevos). La foto de
// trabajo se borra sola cuando el iPad recibe la respuesta (pc.recibido).
import { api, can } from '../../store.js';
import { encargarAlPC, refArchivo, archivoDelEncargo } from '../../trabajospc.js';
import * as V from './vision.js';

export const TIPO = 'caras';
const aB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).replace(/^data:[^,]+,/, '')); r.onerror = rej; r.readAsDataURL(blob); });

// en el iPad / móvil: la foto (JPEG en base64) → el PC → { j, modelo, t, comercial, licencia, ms, pc: true }
export async function preguntaPorPC(texto, b64, { onStatus, signal } = {}) {
  if (!can('archivos.subir')) throw new Error('Para mandar la foto al PC del taller hace falta poder subir archivos.');
  onStatus && onStatus('📤 Enviando la foto al PC del taller…');
  const F = await import('../../files.js'), bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const a = await F.uploadFile(new File([u], 'celebridrew_vision_' + Date.now() + '.jpg', { type: 'image/jpeg' }), { original: true }); // (archivo de trabajo: se borra solo)
  const t0 = Date.now();
  const res = await encargarAlPC(TIPO, { modo: 'vision', archivo: refArchivo(a), pregunta: String(texto || '').slice(0, 4000) }, { onStatus, signal, maxMs: 8 * 60000 });
  api('pc.recibido', { id: res.__id }, { quiet: true }).catch(() => { });
  if (!res || !res.j) throw new Error('El PC no ha contestado en el formato pedido.');
  return { j: res.j, modelo: res.modelo, t: res.t, comercial: res.comercial, licencia: res.licencia, ms: Date.now() - t0, pc: true };
}

// en el PC (lo llama pc_encargos.js): mira la foto con su IA de visión → { j, modelo, t, comercial, licencia, ms }
export async function atiende(job, progreso) {
  const e = job.entrada || {}; progreso(5); const b64 = await aB64(await archivoDelEncargo(e.archivo)); progreso(20);
  const R = await V.pregunta(String(e.pregunta || '').slice(0, 4000), b64); progreso(95);
  return { j: R.j, modelo: R.modelo, t: R.t, comercial: R.comercial, licencia: R.licencia, ms: R.ms };
}
