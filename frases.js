// ================= Biblioteca de frases (textos que no suenan a IA) =================
// Frases escritas a mano en web/data/frases/*.json. Se eligen al azar evitando repetir las
// últimas usadas en este dispositivo. Es ampliable: basta con añadir líneas a los JSON.
const cache = {};
export async function load(name) {
  if (!cache[name]) cache[name] = await (await fetch('data/frases/' + name + '.json')).json();
  return cache[name];
}
function recent() { try { return JSON.parse(localStorage.getItem('cd.frasesUsadas') || '[]'); } catch (e) { return []; } }
export function pick(list, salt = '') {
  list = (list || []).filter(Boolean);
  if (!list.length) return '';
  const used = recent();
  const fresh = list.filter(x => !used.includes(x));
  const pool = fresh.length ? fresh : list;
  const x = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem('cd.frasesUsadas', JSON.stringify(used.concat([x]).slice(-40))); } catch (e) { }
  return x;
}
// Rellena {campos}. [Trozo opcional] se quita si le falta un dato. Si falta un dato: una línea tipo "• Material: {material}" desaparece
// entera; en una frase normal, el hueco se quita sin dejar espacios raros.
export function fill(tpl, data) {
  const has = k => !(data[k] === undefined || data[k] === null || data[k] === '');
  // [trozos opcionales]: desaparecen si les falta algún dato
  tpl = String(tpl).replace(/\[([^\]]*)\]/g, (_, seg) => [...seg.matchAll(/\{(\w+)\}/g)].every(m => has(m[1])) ? seg : '\u0000');
  return tpl.split('\n').map(line => {
    const keys = [...line.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    const missing = keys.filter(k => data[k] === undefined || data[k] === null || data[k] === '');
    if (missing.length && /^\s*([•✦\-]|[^{]{1,30}:\s*\{)/.test(line)) return null;
    const out = line.replace(/\{(\w+)\}/g, (_, k) => data[k] === undefined || data[k] === null ? '' : String(data[k]));
    if (line.trim() && !out.replace(/\u0000/g, '').trim()) return null; // una línea que se ha quedado vacía desaparece
    return out.replace(/\u0000/g, '');
  }).filter(l => l !== null).join('\n')
    .replace(/[ \t]+/g, ' ').replace(/ ([.,;:])/g, '$1').replace(/\s*·\s*$/gm, '').replace(/^\s*·\s*/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}
