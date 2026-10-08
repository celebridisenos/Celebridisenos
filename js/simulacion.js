// ================= v13.10 · ▶️ SIMULACIÓN DE IMPRESIÓN DEL STL + 🎬 VÍDEO CORTO =================
// Con el STL/3MF/OBJ REAL: la pieza crece capa a capa (la capa que se está haciendo brilla y lo que falta se ve como un
// fantasma), girando despacio, como en la impresora. Se puede pausar, mover a cualquier capa y cambiar la velocidad.
// «🎬 Crear vídeo» graba la simulación (3 o 6 s) en el propio aparato: sin servicios externos.
import { h, mount, btn, modal, toast } from './ui.js';
import { crearPieza } from './piezaviva.js';

const CAPA_MM = 0.2;
function altoMm(pos) { let a = Infinity, b = -Infinity; for (let i = 2; i < pos.length; i += 3) { if (pos[i] < a) a = pos[i]; if (pos[i] > b) b = pos[i]; } return isFinite(a) ? b - a : 0; }
export function formatoVideo() {
  const C = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  if (typeof MediaRecorder === 'undefined') return null;
  return C.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || null;
}
// Graba un lienzo durante «seg» segundos mientras «paso(f)» (0..1) va moviendo la animación
// v17.2: si un formato «dice» que vale pero no graba nada (pasa con .mp4 en algunos navegadores sin su códec), se prueba el siguiente.
export async function grabarLienzo(canvas, seg, paso, fps = 30) {
  const C = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const tipos = typeof MediaRecorder === 'undefined' ? [] : C.filter(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } });
  if (!tipos.length || !canvas.captureStream) throw new Error('Este aparato no puede grabar vídeo desde el navegador. Prueba en el PC o en Chrome.');
  const vistos = new Set();
  for (const tipo of tipos) {
    const fam = /mp4/.test(tipo) ? 'mp4' : tipo; if (vistos.has(fam)) continue; vistos.add(fam);
    let blob = null;
    try {
      const st = canvas.captureStream(fps), rec = new MediaRecorder(st, { mimeType: tipo, videoBitsPerSecond: 6000000 }), trozos = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); };
      const fin = new Promise(res => { rec.onstop = res; rec.onerror = res; });
      rec.start(200);
      const t0 = performance.now();
      await new Promise(res => { const f = () => { const x = Math.min(1, (performance.now() - t0) / (seg * 1000)); paso(x); if (x < 1) requestAnimationFrame(f); else setTimeout(res, 120); }; requestAnimationFrame(f); });
      try { rec.stop(); } catch (e) { } await fin; st.getTracks().forEach(t => t.stop());
      blob = new Blob(trozos, { type: tipo.split(';')[0] });
    } catch (e) { blob = null; }
    if (blob && blob.size > 2000) return { blob, ext: /mp4/.test(tipo) ? 'mp4' : 'webm' };
  }
  throw new Error('Este aparato no ha podido grabar el vídeo. Prueba en el PC del taller.');
}
function bajar(blob, nombre) { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); }

// pos: triángulos del modelo · opts: { nombre, color: [r,g,b], productoId }
export function simularImpresion(pos, opts = {}) {
  const alto = altoMm(pos), capas = Math.max(1, Math.round(alto / CAPA_MM));
  const cv = h('canvas.sim-cv'), estado = h('div.sim-estado'), barra = h('input', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Capa' });
  let pieza = null, f = 0, jugando = true, dur = 12, raf = 0, ultimo = performance.now(), grabando = false;
  const pinta = () => { if (pieza) pieza.setProgreso(f, true); barra.value = Math.round(f * 1000); const c = Math.max(1, Math.round(f * capas)); estado.textContent = f >= 0.999 ? '✅ Terminada · ' + capas + ' capas · ' + alto.toFixed(1).replace('.', ',') + ' mm de alto' : 'Capa ' + c + ' de ' + capas + ' · ' + Math.round(f * 100) + ' %'; };
  const bucle = now => { raf = requestAnimationFrame(bucle); const dt = Math.min(0.2, (now - ultimo) / 1000); ultimo = now; if (jugando && !grabando) { f += dt / dur; if (f >= 1) { f = 1; jugando = false; pintaBotones(); } pinta(); } };
  barra.oninput = () => { f = Number(barra.value) / 1000; jugando = false; pintaBotones(); pinta(); };
  const botones = h('div.row.wrap.sim-btns', { style: { gap: '6px' } });
  const pintaBotones = () => mount(botones,
    btn(jugando ? '⏸ Pausa' : (f >= 1 ? '↺ Otra vez' : '▶️ Seguir'), () => { if (f >= 1) f = 0; jugando = !jugando; pintaBotones(); }, { cls: 'sm primary' }),
    [[24, 'Lenta'], [12, 'Normal'], [5, 'Rápida']].map(([d, t]) => h('button.chip' + (dur === d ? '.on' : ''), { type: 'button', onclick: () => { dur = d; pintaBotones(); } }, t)),
    h('span.grow'),
    btn('🎬 Vídeo de 3 s', ev => video(3, ev.currentTarget), { cls: 'sm' }), btn('🎬 Vídeo de 6 s', ev => video(6, ev.currentTarget), { cls: 'sm ghost' }));
  async function video(seg, b) {
    if (grabando) return;
    grabando = true; b.disabled = true; const t0 = b.textContent; b.textContent = '⏺ Grabando…';
    try {
      const r = await grabarLienzo(cv, seg, x => { f = Math.min(1, x * 1.08); pinta(); });
      const nombre = String(opts.nombre || 'pieza').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_') + '_impresion_' + seg + 's.' + r.ext;
      bajar(r.blob, nombre);
      toast('🎬 Vídeo listo: ' + nombre + ' (' + Math.round(r.blob.size / 1024) + ' KB)', 'ok', 7000, opts.productoId ? { t: 'Guardar en el producto', on: async () => { try { const F = await import('./files.js'); await F.uploadFile(new File([r.blob], nombre, { type: r.blob.type }), { entidad: 'productos', entidadId: opts.productoId }); toast('🎬 Vídeo guardado en el producto', 'ok'); } catch (e) { toast(e.message, 'bad'); } } } : null);
    } catch (e) { toast(e.message, 'bad', 8000); }
    finally { grabando = false; b.disabled = false; b.textContent = t0; jugando = false; pintaBotones(); }
  }
  const m = modal('▶️ Así se imprime · ' + (opts.nombre || 'pieza'), h('div.col.sim', { style: { gap: '8px' } }, cv, h('div.row', { style: { gap: '10px', alignItems: 'center' } }, h('span.tiny.muted', 'Capa'), h('div.grow', barra)), estado, botones,
    h('p.tiny.muted', 'Simulación con tu modelo real (capas de ' + String(CAPA_MM).replace('.', ',') + ' mm). El vídeo se crea en este aparato y se descarga.')),
  close => [btn('Cerrar', close, { cls: 'primary' })], { size: 'wide', onclose: () => { cancelAnimationFrame(raf); try { pieza && pieza.destroy(); } catch (e) { } } });
  try { pieza = crearPieza(cv, pos, { color: opts.color }); } catch (e) { mount(m.body, h('p.bad-t', 'Este aparato no puede dibujar en 3D: ' + e.message)); return m; }
  pintaBotones(); pinta(); raf = requestAnimationFrame(bucle);
  window.__cdSim = { get f() { return f; }, set f(v) { f = v; pinta(); }, capas, alto };
  return m;
}
