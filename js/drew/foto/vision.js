// ================= 👗 CelebriDREW · la IA de VISIÓN del PC (Ollama, local: la foto no sale del PC) (16-10-2026) =================
// Se pregunta primero a la que se puede usar para lo que se VENDE (qwen3-vl:4b, Apache-2.0) y, si no está, a la de antes (qwen2.5vl:3b,
// licencia de investigación: SOLO uso no comercial) diciéndolo. Desde el programa del PC va por el puente (/local/ia/chat); en el
// navegador del mismo PC, directo a Ollama (127.0.0.1:11434). En el móvil no hay: se dice y se sigue sin ella.
export const MODELOS = [
  { id: 'qwen3-vl:4b', t: 'Qwen3-VL 4B', licencia: 'Apache-2.0', comercial: true },
  { id: 'qwen2.5vl:3b', t: 'Qwen2.5-VL 3B', licencia: 'Qwen Research (solo uso NO comercial)', comercial: false },
];
export function leeJSON(t) { try { return JSON.parse(t); } catch (e) { const m = /\{[\s\S]*\}/.exec(String(t || '')); if (m) { try { return JSON.parse(m[0]); } catch (x) { } } return null; } }
// una foto (canvas o dataURL) → JPEG en base64 de 896 px como mucho (lo que miran estos modelos)
export function jpeg(fuente, lado = 896) {
  if (typeof fuente === 'string') return fuente.replace(/^data:[^,]+,/, '');
  const w = fuente.width, h = fuente.height, k = Math.min(1, lado / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(fuente, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.86).replace(/^data:[^,]+,/, '');
}
async function puente() { try { const { desktop } = await import('../../desktop.js'); return desktop && desktop.on ? desktop : null; } catch (e) { return null; } }
async function unaVez(modelo, texto, b64, signal) {
  const body = { model: modelo, stream: false, format: 'json', keep_alive: '2m', options: { temperature: 0 }, messages: [{ role: 'user', content: texto, images: [b64] }] }, D = await puente();
  if (D) { let txt = ''; await D.iaChat(Object.assign({}, body, { stream: true }), ch => { if (ch && ch.message && ch.message.content) txt += ch.message.content; }, signal); return txt; }
  let r; try { r = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', body: JSON.stringify(body), signal }); } catch (e) { throw new Error('La IA de visión solo está en el PC del taller (Ollama).'); }
  const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || ('Ollama respondió ' + r.status)); return (j.message && j.message.content) || '';
}
// → { j (el JSON leído), modelo, comercial, licencia, ms } o lanza un error claro
export async function pregunta(texto, b64, o = {}) {
  const t0 = Date.now(), errores = [];
  for (const M of o.modelos || MODELOS) {
    try { const txt = await unaVez(M.id, texto, b64, o.signal), j = leeJSON(txt); if (!j) throw new Error('no ha contestado en el formato pedido'); return { j, modelo: M.id, t: M.t, comercial: M.comercial, licencia: M.licencia, ms: Date.now() - t0 }; }
    catch (e) { errores.push(M.id + ': ' + e.message); if (/solo está en el PC/.test(e.message)) break; if (o.signal && o.signal.aborted) break; }
  }
  throw new Error('La IA de visión no está disponible (' + errores.join(' · ') + ').');
}
