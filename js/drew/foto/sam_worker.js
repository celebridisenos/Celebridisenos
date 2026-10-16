// ================= 👗 CelebriDREW · SAM 2 en su HILO: recortar una prenda TOCÁNDOLA (16-10-2026) =================
// SAM 2.1 «hiera tiny» (Meta, Apache-2.0; exportado a ONNX por onnx-community, 8 bits) con ONNX Runtime Web 1.29 (Microsoft, MIT), en el
// procesador (WebAssembly): sin internet, la foto no sale del aparato. Licencias y huellas: web/data/drew/ia/LICENCIAS.txt.
// Mensajes (cada uno con su id):
//   { tipo: 'imagen', w, h, d (RGBA) } → { tipo: 'mirada', ms }   (lo lento: el «codificador» mira la foto UNA vez; ~10–25 s)
//   { tipo: 'recorta', puntos: [[x, y]…] (px de esa imagen), etiquetas: [1 = es prenda | 0 = no lo es…], caja: [x0, y0, x1, y1] | null }
//     → { tipo: 'mascara', m: Float32Array (256 × 256, «logits»: > 0 = prenda), iou, todas: [iou × 3] }   (lo rápido: ~0,1 s)
//   error → { tipo: 'error', msg }
import * as ort from '../../../vendor/onnxruntime/ort.wasm.min.mjs';

const BASE = new URL('../../../', import.meta.url).href, M = BASE + 'data/drew/ia/sam2/';
ort.env.wasm.wasmPaths = BASE + 'vendor/onnxruntime/';
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1; // (con hilos solo si la página está aislada)
const MEDIA = [0.485, 0.456, 0.406], DESV = [0.229, 0.224, 0.225], S = 1024;
let enc = null, dec = null, emb = null, iw = 0, ih = 0;
const sesion = (n) => ort.InferenceSession.create(M + n + '.onnx', { executionProviders: ['wasm'], graphOptimizationLevel: 'all', externalData: [{ path: n + '.onnx_data', data: M + n + '.onnx_data' }] });
async function carga() { if (!enc) enc = await sesion('vision_encoder_quantized'); if (!dec) dec = await sesion('prompt_encoder_mask_decoder_quantized'); }
// la foto a 1024 × 1024 ESTIRADA (como el preprocesador de SAM 2), con la media de cada trozo al reducir (sin dientes de sierra), normalizada
function entrada(d, w, h) {
  const out = new Float32Array(3 * S * S), kx = w / S, ky = h / S;
  for (let y = 0; y < S; y++) { const y0 = Math.floor(y * ky), y1 = Math.max(y0 + 1, Math.min(h, Math.floor((y + 1) * ky)));
    for (let x = 0; x < S; x++) { const x0 = Math.floor(x * kx), x1 = Math.max(x0 + 1, Math.min(w, Math.floor((x + 1) * kx))); let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * w + xx) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      const o = y * S + x; out[o] = (r / n / 255 - MEDIA[0]) / DESV[0]; out[S * S + o] = (g / n / 255 - MEDIA[1]) / DESV[1]; out[2 * S * S + o] = (b / n / 255 - MEDIA[2]) / DESV[2]; } }
  return out;
}
self.onmessage = async e => {
  const q = e.data, id = q.id, t0 = performance.now();
  try {
    if (q.tipo === 'imagen') { await carga(); iw = q.w; ih = q.h; const r = await enc.run({ pixel_values: new ort.Tensor('float32', entrada(q.d, q.w, q.h), [1, 3, S, S]) });
      emb = [r['image_embeddings.0'], r['image_embeddings.1'], r['image_embeddings.2']]; self.postMessage({ id, tipo: 'mirada', ms: Math.round(performance.now() - t0) }); return; }
    if (q.tipo === 'recorta') { if (!emb) throw new Error('Primero hay que mirar la foto.');
      const P = (q.puntos || []).map(([x, y]) => [x * S / iw, y * S / ih]), L = (q.etiquetas || []).slice(0, P.length), caja = q.caja ? [q.caja[0] * S / iw, q.caja[1] * S / ih, q.caja[2] * S / iw, q.caja[3] * S / ih] : null;
      if (!P.length && !caja) throw new Error('Toca la prenda (o di dónde está) para recortarla.');
      const n = Math.max(1, P.length), pts = new Float32Array(n * 2), lab = new BigInt64Array(n);
      if (P.length) P.forEach((p, i) => { pts[2 * i] = p[0]; pts[2 * i + 1] = p[1]; lab[i] = BigInt(L[i] == null ? 1 : L[i]); }); else lab[0] = -10n; /* (sin puntos: uno «de relleno» que no cuenta) */
      const r = await dec.run({ input_points: new ort.Tensor('float32', pts, [1, 1, n, 2]), input_labels: new ort.Tensor('int64', lab, [1, 1, n]), input_boxes: new ort.Tensor('float32', caja ? Float32Array.from(caja) : new Float32Array(0), [1, caja ? 1 : 0, 4]),
        'image_embeddings.0': emb[0], 'image_embeddings.1': emb[1], 'image_embeddings.2': emb[2] });
      const iou = r.iou_scores.data, pm = r.pred_masks, [, , nm, mh, mw] = pm.dims; let k = 0; for (let i = 1; i < nm; i++) if (iou[i] > iou[k]) k = i;
      const m = pm.data.slice(k * mh * mw, (k + 1) * mh * mw); self.postMessage({ id, tipo: 'mascara', m, mw, mh, iou: iou[k], todas: Array.from(iou.slice(0, nm)), ms: Math.round(performance.now() - t0) }, [m.buffer]); return; }
    throw new Error('Orden desconocida: ' + q.tipo);
  } catch (err) { self.postMessage({ id, tipo: 'error', msg: (err && err.message) || String(err) }); }
};
