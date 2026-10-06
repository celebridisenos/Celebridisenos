// ================= v15.3 · REELS: hacer el vídeo de verdad (Remotion en el PC) =================
//   · En el PC con EDITOR_VIDEO: lo hace aquí mismo (Remotion + Chrome sin ventana) y lo guarda en …\CELEBRIDISENOS\REELS.
//   · En el móvil o el portátil: se ENCARGA al PC del taller (las fotos viajan por el servidor del negocio) y vuelve el vídeo.
import { desktop } from '../desktop.js';
import { S, can } from '../store.js';
import { emisor } from '../print.js';
import { propsRemotion } from './modelo.js';
import { encargarAlPC, registrarTrabajo, refArchivo, archivoDelEncargo } from '../trabajospc.js';

export const claveFoto = f => (f ? f.id || f.local : '');

export async function estadoReels() {
  if (!desktop.on) return null;
  try { return await desktop.reelsEstado(); } catch (e) { return { listo: false, error: e.message }; }
}
export async function reelsAqui() { const e = await estadoReels(); return !!(e && e.listo); }

// Dónde se guardan: en la carpeta de contenido de redes (la de «Redes sociales → Carpeta de contenido»), o en la del programa
export async function carpetaReels() {
  try {
    const root = await desktop.getConfig('productRoot');
    if (root) { const sep = root.includes('\\') ? '\\' : '/'; return root + sep + 'REDES_SOCIALES' + sep + '01_REELS_Y_TIKTOK'; }
  } catch (e) { }
  try { const info = await desktop.info(); const dir = String((info && info.backupDir) || '').replace(/[\\/][^\\/]+$/, ''); const sep = dir.includes('\\') ? '\\' : '/'; return dir ? dir + sep + 'REELS' : ''; } catch (e) { return ''; }
}
export async function logoBlob() {
  try { const u = emisor().logo; if (!u) return null; const r = await fetch(u); return r.ok ? await r.blob() : null; } catch (e) { return null; }
}
// Música «automática»: una de RECURSOS que pegue con el estilo
const GUSTOS = { minimal: /suav|chill|acust|lofi|lo-fi|calm|relax|piano|soft/i, premium: /cinem|elegan|piano|lujo|luxury|epic|orquest|ambient/i, oferta: /energ|pop|alegr|upbeat|happy|dance|fiesta|rapid|electr/i };
export async function musicaAuto(estilo) {
  try {
    const l = await desktop.reelsMusica(); if (!l || !l.length) return null;
    const buenas = l.filter(m => GUSTOS[estilo] && GUSTOS[estilo].test(m.grupo + ' ' + m.nombre)), lista = buenas.length ? buenas : l;
    return lista[Math.floor(Math.random() * lista.length)];
  } catch (e) { return null; }
}

// En ESTE PC. fotos: Map clave → Blob. Devuelve { blob, salida, segundos }
export async function renderLocal(p, fotos, { onStatus, signal } = {}) {
  const fd = new FormData(), nombres = new Map(); let n = 0;
  for (const [k, b] of fotos) { if (!b) continue; const nm = 'foto' + (n++) + (/png/.test(b.type) ? '.png' : '.jpg'); nombres.set(k, nm); fd.append('archivo', new File([b], nm, { type: b.type || 'image/jpeg' })); }
  const logo = await logoBlob();
  if (logo) fd.append('archivo', new File([logo], 'logo.png', { type: logo.type || 'image/png' }));
  let musica = p.musica;
  if (musica && musica.auto) { const m = await musicaAuto(p.estilo); musica = m ? Object.assign({}, musica, { path: m.path, nombre: m.nombre }) : null; }
  const props = propsRemotion(Object.assign({}, p, { musica }), f => nombres.get(claveFoto(f)) || '', logo ? 'logo.png' : '');
  fd.append('props', JSON.stringify(props)); fd.append('nombre', p.nombre || 'reel'); fd.append('destino', await carpetaReels());
  if (musica && musica.path) fd.append('musica', musica.path);
  onStatus && onStatus('🎬 Preparando el vídeo…', 1);
  const { id } = await desktop.reelsRender(fd);
  for (;;) {
    if (signal && signal.aborted) { desktop.reelsCancelar(id).catch(() => { }); throw new DOMException('cancelado', 'AbortError'); }
    await new Promise(r => setTimeout(r, 900));
    const j = await desktop.reelsTrabajo(id);
    if (j.estado === 'hecho') { onStatus && onStatus('📥 Recogiendo el vídeo…', 100); return { blob: await desktop.reelsVideo(id), salida: j.salida, segundos: j.segundos, musica: musica && musica.nombre }; }
    if (j.estado === 'error') throw new Error(j.error || 'No se pudo hacer el vídeo.');
    if (j.estado === 'cancelado') throw new DOMException('cancelado', 'AbortError');
    onStatus && onStatus('🎬 ' + (j.fase || 'Haciendo el vídeo…') + (j.progreso > 2 ? ' ' + j.progreso + ' %' : ''), j.progreso || 0);
  }
}

// Desde cualquier aparato: aquí si este PC puede; si no, lo hace el PC del taller.
// fuente(foto) → Blob de esa foto (de Archivos o del aparato)
export async function crearVideo(p, fuente, { onStatus, signal } = {}) {
  const claves = [...new Set(p.escenas.map(s => claveFoto(s.foto)).filter(Boolean))];
  if (await reelsAqui()) {
    const fotos = new Map();
    for (const k of claves) { const s = p.escenas.find(x => claveFoto(x.foto) === k); onStatus && onStatus('📸 Preparando las fotos…', 0); fotos.set(k, await fuente(s.foto)); }
    return renderLocal(p, fotos, { onStatus, signal });
  }
  if (!can('archivos.subir')) throw new Error('Para hacer el vídeo desde aquí hace falta poder subir archivos (el vídeo lo hace el PC del taller).');
  const F = await import('../files.js'), refs = {};
  for (const k of claves) {
    const s = p.escenas.find(x => claveFoto(x.foto) === k);
    if (s.foto.id) { refs[k] = { id: s.foto.id }; continue; }
    onStatus && onStatus('📤 Enviando las fotos al PC del taller…', 0);
    const b = await fuente(s.foto), a = await F.uploadFile(new File([b], 'reel_foto_' + Date.now() + (/png/.test(b.type) ? '.png' : '.jpg'), { type: b.type || 'image/jpeg' }), { original: true });
    refs[k] = refArchivo(a);
  }
  const proyecto = JSON.parse(JSON.stringify(p));
  const res = await encargarAlPC('reel', { proyecto, fotos: refs }, { onStatus, signal, maxMs: 40 * 60000 });
  onStatus && onStatus('📥 Recibiendo el vídeo…', 100);
  const blob = await F.fetchFile(res.archivo);
  import('../store.js').then(m => m.api('pc.recibido', { id: res.__id }, { quiet: true })).catch(() => { });
  return { blob, archivo: res.archivo, segundos: res.segundos, musica: res.musica, salida: res.salida };
}

// ---------- lo que el PC hace por los demás: Reels ----------
registrarTrabajo('reel', () => reelsAqui(), async (job, progreso) => {
  const p = job.entrada.proyecto, refs = job.entrada.fotos || {}, fotos = new Map();
  progreso(3);
  for (const k of Object.keys(refs)) fotos.set(k, await archivoDelEncargo(refs[k]));
  progreso(8);
  const r = await renderLocal(p, fotos, { onStatus: (t, pc) => progreso(8 + (pc || 0) * 0.82) });
  progreso(92);
  const F = await import('../files.js');
  const a = await F.uploadFile(new File([r.blob], String(p.nombre || 'reel').replace(/[^\p{L}\p{N} _-]+/gu, '').slice(0, 50) + '_reel.mp4', { type: 'video/mp4' }), { original: true });
  return { archivo: refArchivo(a), salida: r.salida, segundos: r.segundos, musica: r.musica || '' };
});
