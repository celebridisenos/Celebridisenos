// ================= 👗 CelebriDREW · SAM 2 desde la pantalla: «mira» una foto una vez y recorta lo que se toca (16-10-2026) =================
// El trabajo lo hace drew/foto/sam_worker.js (en su hilo: la pantalla no se congela). Aquí: preparar la foto, pedir recortes y convertir la
// máscara de SAM (256 × 256, borde blando) en una máscara de la prenda al tamaño que se quiera. El borde fino lo pone refinaPorColor
// (desde_foto.js). Si el aparato no puede (sin WebAssembly, sin memoria), se dice y se sigue con el recorte de siempre.
let hilo = null, nid = 0, mirada = null; const pend = new Map();
function trabajador() {
  if (hilo) return hilo;
  hilo = new Worker(new URL('./sam_worker.js', import.meta.url), { type: 'module' });
  hilo.onmessage = e => { const m = e.data, p = pend.get(m.id); if (!p) return; pend.delete(m.id); if (m.tipo === 'error') p.rej(new Error(m.msg)); else p.res(m); };
  hilo.onerror = e => { const err = new Error('La IA de recorte no ha podido arrancar en este aparato' + (e && e.message ? ': ' + e.message : '') + '.'); pend.forEach(p => p.rej(err)); pend.clear(); hilo = null; mirada = null; };
  return hilo;
}
const pide = (msg, transfer) => new Promise((res, rej) => { const id = ++nid; pend.set(id, { res, rej }); trabajador().postMessage(Object.assign({ id }, msg), transfer || []); });
export const disponible = () => typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined';
// la foto ({ w, h, d } RGBA) se reduce a 2048 px como mucho (el modelo la mira a 1024) y se manda al hilo → { ms }. clave = para no mirarla dos veces
export async function mira(img, clave) {
  if (mirada && clave && mirada.clave === clave) return { ms: 0, ya: true };
  const k = Math.min(1, 2048 / Math.max(img.w, img.h)), w = Math.max(1, Math.round(img.w * k)), h = Math.max(1, Math.round(img.h * k)); let d = img.d;
  if (k < 1) { d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) { const sy = Math.min(img.h - 1, Math.floor((y + 0.5) / k)); for (let x = 0; x < w; x++) { const sx = Math.min(img.w - 1, Math.floor((x + 0.5) / k)), i = (sy * img.w + sx) * 4, o = (y * w + x) * 4; d[o] = img.d[i]; d[o + 1] = img.d[i + 1]; d[o + 2] = img.d[i + 2]; d[o + 3] = 255; } } }
  else d = new Uint8ClampedArray(img.d);
  const r = await pide({ tipo: 'imagen', w, h, d }, [d.buffer]); mirada = { clave, w, h, k, W: img.w, H: img.h }; return { ms: r.ms };
}
// recortar con puntos ([[x, y]] en px de la foto ORIGINAL) y etiquetas (1 = es prenda, 0 = no) y/o una caja → { m, mw, mh, iou }
export async function recorta(o) {
  if (!mirada) throw new Error('Primero hay que mirar la foto.'); const k = mirada.k;
  return pide({ tipo: 'recorta', puntos: (o.puntos || []).map(p => [p[0] * k, p[1] * k]), etiquetas: o.etiquetas || (o.puntos || []).map(() => 1), caja: o.caja ? o.caja.map(v => v * k) : null });
}
// la máscara de SAM (logits mw × mh de TODA la foto) → { w, h, m: Uint8Array } del tamaño pedido (bilineal sobre los logits: borde suave)
export function aMascara(R, w, h) {
  const { m: L, mw, mh } = R, out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { const fy = Math.max(0, Math.min(mh - 1.001, (y + 0.5) * mh / h - 0.5)), y0 = Math.floor(fy), ty = fy - y0;
    for (let x = 0; x < w; x++) { const fx = Math.max(0, Math.min(mw - 1.001, (x + 0.5) * mw / w - 0.5)), x0 = Math.floor(fx), tx = fx - x0, i = y0 * mw + x0;
      const v = (L[i] * (1 - tx) + L[i + 1] * tx) * (1 - ty) + (L[i + mw] * (1 - tx) + L[i + mw + 1] * tx) * ty; out[y * w + x] = v > 0 ? 1 : 0; } }
  return { w, h, m: out };
}
export const olvida = () => { mirada = null; };
