// ================= 🎬 VÍDEO MP4 fotograma a fotograma (WebCodecs + un empaquetador MP4 propio, sin librerías) =================
// Para el vídeo de 7 s para redes: cada fotograma lleva SU hora (f / fps), así el vídeo dura exactamente lo que debe y va suave aunque el
// ordenador tarde en pintar cada uno (no se graba «en directo»). H.264 en MP4 (lo aceptan Instagram, TikTok, WhatsApp, YouTube Shorts).
// Si el navegador no tiene WebCodecs con H.264, devuelve null y la pantalla usa la grabación de siempre (MediaRecorder).
// mp4DeLienzo(lienzo, n, fps, dibuja) → Blob | null ;  dibuja(f) pinta el fotograma f en el lienzo (puede ser async)

const u32 = v => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255], u16 = v => [(v >>> 8) & 255, v & 255];
const txt = s => [...s].map(c => c.charCodeAt(0));
function caja(tipo, ...partes) { let n = 8; const ps = partes.map(p => (p instanceof Uint8Array ? p : Uint8Array.from(p))); ps.forEach(p => { n += p.length; });
  const o = new Uint8Array(n); o.set(u32(n), 0); o.set(txt(tipo), 4); let k = 8; ps.forEach(p => { o.set(p, k); k += p.length; }); return o; }
const llena = (vf, ...r) => caja(r[0], [vf >>> 24, (vf >>> 16) & 255, (vf >>> 8) & 255, vf & 255], ...r.slice(1)); // (caja «completa»: versión + banderas)
const MATRIZ = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x40, 0, 0, 0];

export function empaquetaMP4({ ancho, alto, fps, muestras, avcC }) {
  const TS = 90000, delta = Math.round(TS / fps), n = muestras.length, durTS = n * delta, durMs = Math.round(n * 1000 / fps);
  const ftyp = caja('ftyp', txt('isom'), u32(512), txt('isom'), txt('iso2'), txt('avc1'), txt('mp41'));
  const moov = desplaza => {
    const mvhd = llena(0, 'mvhd', u32(0), u32(0), u32(1000), u32(durMs), u32(0x00010000), u16(0x0100), new Array(10).fill(0), MATRIZ, new Array(24).fill(0), u32(2));
    const tkhd = llena(3, 'tkhd', u32(0), u32(0), u32(1), u32(0), u32(durMs), new Array(8).fill(0), u16(0), u16(0), u16(0), u16(0), MATRIZ, u32(ancho << 16), u32(alto << 16));
    const mdhd = llena(0, 'mdhd', u32(0), u32(0), u32(TS), u32(durTS), u16(0x55c4), u16(0));
    const hdlr = llena(0, 'hdlr', u32(0), txt('vide'), new Array(12).fill(0), txt('CelebriDisenos\0')); // (28-10-2026: antes en CelebriDREW; lo usan el catálogo de R8 y el Escaparate)
    const vmhd = llena(1, 'vmhd', new Array(8).fill(0)), dinf = caja('dinf', llena(0, 'dref', u32(1), llena(1, 'url ')));
    const avc1 = caja('avc1', new Array(6).fill(0), u16(1), u16(0), u16(0), new Array(12).fill(0), u16(ancho), u16(alto), u32(0x00480000), u32(0x00480000), u32(0), u16(1), new Array(32).fill(0), u16(0x18), u16(0xffff), caja('avcC', avcC));
    const claves = []; muestras.forEach((m, i) => { if (m.clave) claves.push(i + 1); });
    const stbl = caja('stbl', llena(0, 'stsd', u32(1), avc1), llena(0, 'stts', u32(1), u32(n), u32(delta)), llena(0, 'stss', u32(claves.length), ...claves.map(u32)),
      llena(0, 'stsc', u32(1), u32(1), u32(n), u32(1)), llena(0, 'stsz', u32(0), u32(n), ...muestras.map(m => u32(m.b.length))), llena(0, 'stco', u32(1), u32(desplaza)));
    return caja('moov', mvhd, caja('trak', tkhd, caja('mdia', mdhd, hdlr, caja('minf', vmhd, dinf, stbl))));
  };
  const datos = muestras.reduce((s, m) => s + m.b.length, 0), m0 = moov(0), m1 = moov(ftyp.length + m0.length + 8); // (moov delante: el vídeo empieza a verse antes de bajar entero)
  const out = new Uint8Array(ftyp.length + m1.length + 8 + datos); out.set(ftyp, 0); out.set(m1, ftyp.length); let k = ftyp.length + m1.length;
  out.set(u32(8 + datos), k); out.set(txt('mdat'), k + 4); k += 8; muestras.forEach(m => { out.set(m.b, k); k += m.b.length; }); return out;
}

export async function mp4DeLienzo(lienzo, n, fps, dibuja, bitrate = 12e6) {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;
  const ancho = lienzo.width, alto = lienzo.height; let cfg = null;
  for (const codec of ['avc1.640033', 'avc1.4D0033', 'avc1.640028', 'avc1.4D0028', 'avc1.42E028', 'avc1.42001F']) { const c = { codec, width: ancho, height: alto, bitrate, framerate: fps, avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(c)).supported) { cfg = c; break; } } catch (e) { } }
  if (!cfg) return null;
  const muestras = []; let avcC = null, fallo = null;
  const enc = new VideoEncoder({ output: (ch, meta) => { const d = meta && meta.decoderConfig && meta.decoderConfig.description; if (d && !avcC) avcC = d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
    const b = new Uint8Array(ch.byteLength); ch.copyTo(b); muestras.push({ b, clave: ch.type === 'key' }); }, error: e => { fallo = e; } });
  enc.configure(cfg);
  for (let f = 0; f < n && !fallo; f++) { await dibuja(f); const vf = new VideoFrame(lienzo, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) }); enc.encode(vf, { keyFrame: f % (fps * 2) === 0 }); vf.close();
    if (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 0)); }
  try { await enc.flush(); enc.close(); } catch (e) { fallo = fallo || e; }
  if (fallo || !avcC || muestras.length !== n) return null;
  return new Blob([empaquetaMP4({ ancho, alto, fps, muestras, avcC })], { type: 'video/mp4' });
}
