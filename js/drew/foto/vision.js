// ================= 👗 CelebriDREW · la IA de VISIÓN del PC (Ollama, local: la foto no sale del PC) (16-10-2026) =================
// Se pregunta primero a la que se puede usar para lo que se VENDE (Qwen3-VL, Apache-2.0) y, si no está, a la de antes (qwen2.5vl:3b,
// licencia de investigación: SOLO uso no comercial) diciéndolo. Desde el programa del PC va por el puente (/local/ia/chat); en el
// navegador del mismo PC, directo a Ollama (127.0.0.1:11434). En el móvil no hay: se dice y se sigue sin ella.
// 18-10-2026 · «la IA tarda mucho, mira alternativas o mejórala». Medido en la torre (GTX 1660 SUPER, con sus programas abiertos):
//  · qwen3-vl:4b es la versión que «PIENSA»: escribe 1.700–2.500 tokens por dentro antes del JSON (30–47 s) aunque se le pida que no;
//    la versión «instruct» (qwen3-vl:4b-instruct, la misma IA y licencia) contesta directa → va PRIMERO si está instalada;
//  · MIRAR la foto cuesta 40–60 s FIJOS (da igual 224 que 1024 px: Ollama la lleva siempre a su tamaño) y con el procesador solo, 32 s:
//    esta tarjeta no acelera esa parte. Por eso: se CALIENTA la IA al abrir la ventana (la carga son ~9 s más), cada foto se mira UNA vez
//    (lo leído se GUARDA por foto: la segunda vez es al momento) y se enseña cuánto falta con lo que tardó de verdad las veces anteriores.
export const MODELOS = [
  { id: 'qwen3-vl:4b-instruct', t: 'Qwen3-VL 4B (directa)', licencia: 'Apache-2.0', comercial: true, piensa: false },
  { id: 'qwen3-vl:4b', t: 'Qwen3-VL 4B', licencia: 'Apache-2.0', comercial: true, piensa: true },
  { id: 'qwen2.5vl:3b', t: 'Qwen2.5-VL 3B', licencia: 'Qwen Research (solo uso NO comercial)', comercial: false, piensa: false },
];
// lo que se espera que tarde cada una la primera vez que mira una foto (medido el 18-10 en la torre), hasta tener tiempos propios
const TIEMPO_BASE = { 'qwen3-vl:4b-instruct': 50000, 'qwen3-vl:4b': 100000, 'qwen2.5vl:3b': 48000 };
export function leeJSON(t) { try { return JSON.parse(t); } catch (e) { const m = /\{[\s\S]*\}/.exec(String(t || '')); if (m) { try { return JSON.parse(m[0]); } catch (x) { } } return null; } }
// una foto (canvas o dataURL) → JPEG en base64 de 896 px como mucho (lo que miran estos modelos)
export function jpeg(fuente, lado = 896) {
  if (typeof fuente === 'string') return fuente.replace(/^data:[^,]+,/, '');
  const w = fuente.width, h = fuente.height, k = Math.min(1, lado / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(fuente, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.86).replace(/^data:[^,]+,/, '');
}
async function puente() { try { const { desktop } = await import('../../desktop.js'); return desktop && desktop.on ? desktop : null; } catch (e) { return null; } }
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
async function unaVez(modelo, texto, b64, signal, o = {}) {
  const body = { model: modelo, stream: false, format: 'json', keep_alive: '15m', options: { temperature: 0 }, messages: [{ role: 'user', content: texto, images: [b64] }] }, D = await puente();
  if (o.think === false) body.think = false;
  // (la que «piensa» con 4.096 de memoria se quedaba SIN SITIO: ~1.500 de la foto + ~2.200 pensando → contestaba VACÍO y se perdían 100 s)
  if (o.ctx) body.options.num_ctx = o.ctx;
  if (D) { let txt = ''; await D.iaChat(Object.assign({}, body, { stream: true }), ch => { if (ch && ch.message && ch.message.content) txt += ch.message.content; }, signal); return txt; }
  let r; try { r = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', body: JSON.stringify(body), signal }); } catch (e) { if (signal && signal.aborted) throw e; throw new Error('La IA de visión solo está en el PC del taller (Ollama).'); }
  const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || ('Ollama respondió ' + r.status)); return (j.message && j.message.content) || '';
}
// ---------- el ORDEN: la mejor primero; la que NO está instalada se salta 30 min (luego se vuelve a mirar, por si ya la han bajado) ----------
const noEsta = e => /not found|no encontrado|pull/i.test(String(e && e.message || e));
function faltan() { try { return JSON.parse(ls.get('cd.drew.iaFaltan') || '{}'); } catch (e) { return {}; } }
function marcaFalta(id) { const F = faltan(); F[id] = Date.now(); ls.set('cd.drew.iaFaltan', JSON.stringify(F)); }
export function orden(lista = MODELOS) { const F = faltan(), L = lista.filter(M => !(F[M.id] && Date.now() - F[M.id] < 30 * 60 * 1000)); return L.length ? L : lista.slice(); }
// ---------- 💾 lo leído se GUARDA por foto (la huella del JPEG + la pregunta): la segunda vez, al momento ----------
export function huella(s) { let a = 0x811c9dc5, b = 0x01000193; const t = String(s); for (let i = 0; i < t.length; i += 7) { a ^= t.charCodeAt(i); a = Math.imul(a, 16777619) >>> 0; b = (b + a + t.length) >>> 0; } return a.toString(36) + b.toString(36) + t.length.toString(36); }
const CACHE = 'cd.drew.visionCache';
function deCache(k) { try { const C = JSON.parse(ls.get(CACHE) || '{}'); return C[k] || null; } catch (e) { return null; } }
function aCache(k, v) { try { const C = JSON.parse(ls.get(CACHE) || '{}'); C[k] = Object.assign({ cuando: Date.now() }, v); const L = Object.entries(C).sort((a, b) => b[1].cuando - a[1].cuando).slice(0, 40); ls.set(CACHE, JSON.stringify(Object.fromEntries(L))); } catch (e) { } }
// ---------- ⏱ cuánto tarda DE VERDAD en este PC (media de las últimas veces) ----------
export function tiempoEsperado(modelo) { const id = modelo || orden()[0].id; try { const T = JSON.parse(ls.get('cd.drew.iaMs') || '{}')[id]; if (T && T.n) return T.ms; } catch (e) { }
  return TIEMPO_BASE[id] || TIEMPO_BASE['qwen3-vl:4b']; }
function apuntaTiempo(modelo, ms) { try { const T = JSON.parse(ls.get('cd.drew.iaMs') || '{}'), t = T[modelo] || { ms, n: 0 }; t.ms = t.n ? Math.round(t.ms * 0.6 + ms * 0.4) : ms; t.n = Math.min(10, t.n + 1); T[modelo] = t; ls.set('cd.drew.iaMs', JSON.stringify(T)); } catch (e) { } }
// ---------- 🔥 CALENTAR: cargar la IA en cuanto se abre la ventana (sin foto: Ollama solo la sube a memoria) ----------
let calentando = null;
export function calienta() {
  if (calentando) return calentando;
  calentando = (async () => { const D = await puente(), id = orden()[0].id, body = { model: id, keep_alive: '15m', stream: false, messages: [] };
    try { if (D) await D.iaChat(Object.assign({}, body, { stream: true }), () => { }); else await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', body: JSON.stringify(body) }); return true; } catch (e) { return false; } })();
  setTimeout(() => { calentando = null; }, 10 * 60 * 1000); return calentando;
}
// → { j (el JSON leído), modelo, comercial, licencia, ms, guardada } o lanza un error claro
// 20-10-2026 · ✨ CLAUDE PRIMERO (plan maestro 3: «la IA para copiar imágenes no funciona»): si en este PC Claude está conectado (programa del PC,
// desktop/host/claude.go), mira él la foto: lee mejor la prenda que la IA pequeña local y no tarda 100 s. La foto va a Claude con SU cuenta
// (se dice en la ventana de Claude); se puede apagar con localStorage 'cd.drew.claudeFotos' = '0'. Si no está, todo sigue como antes (Ollama).
export const usaClaude = () => ls.get('cd.drew.claudeFotos') !== '0';
async function conClaude(texto, b64) {
  const D = await puente(); if (!D || !D.claudeEstado) return null; let e; try { e = await D.claudeEstado(); } catch (x) { return null; } if (!e || !e.sesion) return null;
  const r = await D.claudePregunta(texto + '\nAnswer ONLY the JSON object, no other text.', b64); if (!r || !r.ok) throw new Error((r && r.error) || 'Claude no ha contestado');
  const j = leeJSON(r.texto); if (!j) throw new Error('Claude no ha contestado en el formato pedido'); return { j, ms: r.ms };
}
export async function pregunta(texto, b64, o = {}) {
  const t0 = Date.now(), errores = [], clave = huella(texto) + '.' + huella(b64);
  if (!o.sinCache) { const c = deCache(clave); if (c && c.j) return Object.assign({}, c, { ms: 0, guardada: true }); }
  if (o.claude !== false && usaClaude()) { try { const C = await conClaude(texto, b64); if (C) { const R = { j: C.j, modelo: 'claude', t: 'Claude (tu cuenta)', comercial: true, licencia: 'Tu cuenta de Claude', ms: Date.now() - t0 };
    if (!o.sinCache) aCache(clave, { j: C.j, modelo: 'claude', t: R.t, comercial: true, licencia: R.licencia }); return R; } } catch (e) { errores.push('claude: ' + e.message); } }
  for (const M of o.modelos || orden()) {
    try { const ta = Date.now(), txt = await unaVez(M.id, texto, b64, o.signal, { think: M.piensa ? undefined : false, ctx: M.piensa ? 8192 : undefined }), j = leeJSON(txt); if (!j) throw new Error('no ha contestado en el formato pedido');
      const R = { j, modelo: M.id, t: M.t, comercial: M.comercial, licencia: M.licencia, ms: Date.now() - t0 };
      ls.set('cd.drew.iaModelo', M.id); apuntaTiempo(M.id, Date.now() - ta); if (!o.sinCache) aCache(clave, { j, modelo: M.id, t: M.t, comercial: M.comercial, licencia: M.licencia });
      return R; }
    catch (e) { if (noEsta(e)) marcaFalta(M.id); errores.push(M.id + ': ' + (noEsta(e) ? 'no está instalada' : e.message)); if (/solo está en el PC/.test(e.message)) break; if (o.signal && o.signal.aborted) break; }
  }
  throw new Error('La IA de visión no está disponible (' + errores.join(' · ') + '). Para que funcione siempre: ✨ Claude → «Conectar Claude» (una vez).');
}
