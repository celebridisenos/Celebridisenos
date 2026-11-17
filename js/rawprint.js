// ================= v13.2 · IMPRESIÓN DIRECTA POR BLUETOOTH =================
// La etiqueta se dibuja como siempre (canvas a 203 ppp) y aquí se convierte en los bytes que entiende la impresora:
//   TSPL (la más habitual en las de 10 × 15), ZPL, ESC/POS (trama de puntos) o CPCL.
// Esos bytes salen por dos caminos:
//   · PC: el programa del PC los escribe en el puerto COM Bluetooth que crea Windows al emparejar la impresora.
//   · Móvil Android (Chrome): directamente por Bluetooth (Web Bluetooth) si la impresora tiene Bluetooth de bajo consumo (BLE).
// No se inventa cuál es el idioma de cada impresora: el asistente imprime una prueba de cada uno y eligen ellos la que sale bien.
import { qrPlanFixed } from './qr.js';

export const LANGS = [
  { k: 'tspl', t: 'TSPL', d: 'El más habitual en impresoras de etiquetas 10 × 15 (TSC, 4BARCODE, Svantto, Munbyn…)' },
  { k: 'zpl', t: 'ZPL', d: 'El de Zebra; muchas lo entienden' },
  { k: 'escpos', t: 'ESC/POS', d: 'El de las impresoras de tickets; algunas de etiquetas también' },
  { k: 'cpcl', t: 'CPCL', d: 'El de impresoras portátiles' },
  { k: 'tspl_neg', t: 'TSPL (colores invertidos)', d: 'Si con TSPL sale todo negro o en negativo, esta es la buena' }
];
export const langName = k => (LANGS.find(x => x.k === k) || {}).t || k;

// ---------- Imagen → puntos blanco/negro (1 bit). Corte fijo: QR y texto salen nítidos, sin grises ----------
// v13.7: si la etiqueta lleva un fondo de foto o degradado (canvas.__tramado), los grises se TRAMAN (Floyd–Steinberg)
// para que se vean como en la tarjeta; el negro y el blanco puros (texto, QR) siguen igual de nítidos.
export function bitmap(canvas, thr = 150, tramar) {
  const W = canvas.width, H = canvas.height, wb = Math.ceil(W / 8);
  const d = canvas.getContext('2d').getImageData(0, 0, W, H).data, rows = new Uint8Array(wb * H);   // 1 = negro
  const L = new Float32Array(W * H);
  for (let i = 0, p = 0; p < W * H; p++, i += 4) { const a = d[i + 3] / 255; L[p] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * a + 255 * (1 - a); }
  const tr = tramar === undefined ? !!canvas.__tramado : tramar;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, l = L[p], negro = tr ? l < 128 : l < thr;
    if (negro) rows[y * wb + (x >> 3)] |= 0x80 >> (x & 7);
    if (tr) {
      const e = l - (negro ? 0 : 255);
      if (x + 1 < W) L[p + 1] += e * 7 / 16;
      if (y + 1 < H) { if (x > 0) L[p + W - 1] += e * 3 / 16; L[p + W] += e * 5 / 16; if (x + 1 < W) L[p + W + 1] += e / 16; }
    }
  }
  return { w: wb * 8, h: H, wb, rows };
}
const enc = new TextEncoder();
const cat = parts => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Uint8Array(n); let k = 0; parts.forEach(p => { o.set(p, k); k += p.length; }); return o; };
const str = s => enc.encode(s);
const inv = u => { const o = new Uint8Array(u.length); for (let i = 0; i < u.length; i++) o[i] = (~u[i]) & 0xFF; return o; };
const hex = u => { let s = ''; for (let i = 0; i < u.length; i++) s += (u[i] < 16 ? '0' : '') + u[i].toString(16); return s.toUpperCase(); };

// Genera el trabajo completo. o = { wmm, hmm, copies }
export function encode(lang, canvas, o = {}) {
  const bm = bitmap(canvas), copies = Math.max(1, Math.min(99, Number(o.copies) || 1));
  const wmm = Math.round((Number(o.wmm) || 100) * 10) / 10, hmm = Math.round((Number(o.hmm) || 150) * 10) / 10;
  if (lang === 'tspl' || lang === 'tspl_neg') {
    // TSPL: en BITMAP el bit 0 = punto negro (por eso se invierte). «tspl_neg» manda 1 = negro por si la impresora lo entiende al revés.
    const data = lang === 'tspl' ? inv(bm.rows) : bm.rows;
    return cat([str(`SIZE ${wmm} mm,${hmm} mm\r\nGAP 3 mm,0 mm\r\nDIRECTION 0\r\nREFERENCE 0,0\r\nCLS\r\nBITMAP 0,0,${bm.wb},${bm.h},0,`), data, str(`\r\nPRINT 1,${copies}\r\n`)]);
  }
  if (lang === 'zpl') {
    const tot = bm.rows.length;
    return str(`^XA^CI28^PW${bm.w}^LL${bm.h}^LH0,0^FO0,0^GFA,${tot},${tot},${bm.wb},${hex(bm.rows)}^FS^PQ${copies}^XZ\r\n`);
  }
  if (lang === 'escpos') {
    const parts = [new Uint8Array([0x1B, 0x40])];
    for (let c = 0; c < copies; c++) {
      for (let y = 0; y < bm.h; y += 200) {           // bandas de 200 filas: no desbordan el búfer de la impresora
        const n = Math.min(200, bm.h - y);
        parts.push(new Uint8Array([0x1D, 0x76, 0x30, 0, bm.wb & 255, bm.wb >> 8, n & 255, n >> 8]), bm.rows.subarray(y * bm.wb, (y + n) * bm.wb));
      }
      parts.push(new Uint8Array([0x0A, 0x0C]));        // avance hasta la siguiente etiqueta
    }
    return cat(parts);
  }
  if (lang === 'cpcl') {
    return cat([str(`! 0 203 203 ${bm.h} ${copies}\r\nPAGE-WIDTH ${bm.w}\r\nCG ${bm.wb} ${bm.h} 0 0 `), bm.rows, str('\r\nFORM\r\nPRINT\r\n')]);
  }
  throw new Error('Idioma de impresora desconocido: ' + lang);
}

// ---------- Etiqueta de prueba (se numera para saber cuál salió bien) ----------
export function testCanvas(n, titulo, wmm = 100, hmm = 150, dpi = 203) {
  const k = dpi / 25.4, c = document.createElement('canvas');
  c.width = Math.round(wmm * k); c.height = Math.round(hmm * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000'; g.strokeStyle = '#000'; g.textBaseline = 'top';
  g.lineWidth = Math.round(1.2 * k); g.strokeRect(g.lineWidth, g.lineWidth, c.width - 2 * g.lineWidth, c.height - 2 * g.lineWidth);
  const ajusta = (txt, mm, w) => { let px = Math.round(mm * k); do { g.font = w + ' ' + px + 'px Arial, sans-serif'; px -= 2; } while (g.measureText(txt).width > c.width - 16 * k && px > 8); };
  ajusta('PRUEBA ' + n, 20, 700); g.fillText('PRUEBA ' + n, 8 * k, 8 * k);
  ajusta(titulo, 7, 600); g.fillText(titulo, 8 * k, 40 * k);
  g.font = '400 ' + Math.round(5.5 * k) + 'px Arial, sans-serif'; g.fillText('Si lees esto bien y el recuadro', 8 * k, 56 * k); g.fillText('está entero, es la buena.', 8 * k, 64 * k);
  g.fillRect(8 * k, 78 * k, 30 * k, 4 * k); g.fillRect(8 * k, 78 * k, 4 * k, 30 * k);      // esquina arriba-izquierda: orientación
  const P = qrPlanFixed('CelebriDisenos-bluetooth-' + n, Math.round(0.9 * k)), ox = Math.round(c.width - P.side - 8 * k), oy = Math.round(c.height - P.side - 8 * k);
  P.M.forEach((row, r) => row.forEach((v, cc) => { if (v) g.fillRect(ox + (cc + P.q) * P.mod, oy + (r + P.q) * P.mod, P.mod, P.mod); }));
  return c;
}

// ---------- Móvil Android: Bluetooth de bajo consumo (Web Bluetooth) ----------
// Servicios en los que suelen esconder el «canal de escritura» las impresoras baratas (no hay un estándar)
const SERVICES = ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb', '0000ffe0-0000-1000-8000-00805f9b34fb', '0000fff0-0000-1000-8000-00805f9b34fb', '0000ae30-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '0000fee7-0000-1000-8000-00805f9b34fb', '0000ffb0-0000-1000-8000-00805f9b34fb'];
const PREF = ['2af1', 'ff02', 'ffe1', 'fff2', 'ae01', '8841', 'bef8d6c9', 'ffb2'];
let dev = null, chr = null;
export const btTuning = { chunk: 120, pausa: 12 };   // bytes por envío y milisegundos entre envíos (las impresoras BLE son lentas y se atragantan)
export const webBtOk = () => typeof navigator !== 'undefined' && !!navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function';
export const btName = () => (dev && dev.name) || '';
export const btConnected = () => !!(dev && dev.gatt && dev.gatt.connected && chr);
async function findChar(server) {
  const sv = await server.getPrimaryServices(); let best = null;
  for (const s of sv) { let cs = []; try { cs = await s.getCharacteristics(); } catch (e) { } for (const c of cs) { if (!(c.properties.write || c.properties.writeWithoutResponse)) continue; const rank = PREF.findIndex(p => c.uuid.includes(p)); if (!best || (rank >= 0 && (best.rank < 0 || rank < best.rank))) best = { c, rank }; } }
  return best && best.c;
}
// Debe llamarse desde un botón (el navegador lo exige). Pide la impresora y abre el canal.
export async function btConnect(force) {
  if (!webBtOk()) throw new Error('Este navegador no permite Bluetooth. En Android usa Chrome; en iPhone no es posible (la etiqueta se imprimirá desde el PC).');
  if (!force && btConnected()) return dev.name || 'impresora';
  if (!dev || force) dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  const server = await dev.gatt.connect();
  chr = await findChar(server);
  if (!chr) { try { dev.gatt.disconnect(); } catch (e) { } throw new Error('«' + (dev.name || 'La impresora') + '» no tiene un canal de impresión por Bluetooth de bajo consumo. Seguramente usa Bluetooth clásico: desde el móvil no se puede, pero se imprimirá desde el PC.'); }
  return dev.name || 'impresora';
}
export async function btSend(bytes, o = {}) {
  if (!btConnected()) await btConnect();
  let size = o.chunk || btTuning.chunk, noResp = !chr.properties.write && chr.properties.writeWithoutResponse, retried = false;
  for (let i = 0; i < bytes.length;) {
    const part = bytes.subarray(i, Math.min(bytes.length, i + size));
    try {
      if (noResp) await chr.writeValueWithoutResponse(part);
      else if (chr.writeValueWithResponse) await chr.writeValueWithResponse(part);
      else await chr.writeValue(part);
    }
    catch (e) { if (!retried && size > 20) { retried = true; size = 20; continue; } throw new Error('Se cortó el envío por Bluetooth: ' + (e.message || e)); }
    i += part.length;
    if (noResp && btTuning.pausa) await new Promise(r => setTimeout(r, size > 60 ? btTuning.pausa : Math.ceil(btTuning.pausa / 2)));
  }
}
export function btDisconnect() { try { dev && dev.gatt && dev.gatt.disconnect(); } catch (e) { } dev = null; chr = null; }

