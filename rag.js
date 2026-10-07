// ================= Biblioteca + búsqueda inteligente (RAG) =================
// Búsqueda híbrida: palabras clave (BM25, funciona siempre, también en el móvil) +
// significado (embeddings del modelo local, en el PC). Los documentos que se buscan son
// SOLO los que la persona puede ver (el servidor ya los filtra por permisos).
import { S, api, kv } from '../store.js';
import { desktop } from '../desktop.js';
import { EMBED } from './models.js';

const STOP = new Set('a al algo algun alguna algunas alguno algunos ante antes aqui asi aun bien cada casi como con contra cual cuales cuando de del desde donde dos el ella ellas ellos en entre era es esa esas ese eso esos esta estan estar estas este esto estos fue fueron ha hace hacen hacer han hasta hay la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros o os otra otras otro otros para pero poco por porque que quien se sea segun ser si sin sobre solo son su sus tambien te tiene tienen todo todos tu tus un una unas uno unos usted va vamos y ya yo'.split(' '));
export function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function stem(w) {
  if (w.length > 4) w = w.replace(/(aciones|amientos|imientos|amiento|imiento|idades|mente|acion|idad|ables|ibles|able|ible|istas|ista|osos|osas|ivos|ivas|ores|oso|osa|ivo|iva|es|s)$/, '');
  return w.slice(0, 5);
}
export function tokens(s) { return norm(s).split(/[^a-z0-9ñ]+/).filter(w => w.length > 1 && !STOP.has(w)).map(stem); }
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }

// ---------- Troceado por secciones ----------
export function chunk(text, meta, max = 1100) {
  const out = [];
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let sec = '', buf = [];
  const flush = () => {
    const body = buf.join('\n').trim(); buf = [];
    if (body.replace(/\s/g, '').length < 25) return;
    let rest = body;
    while (rest.length) {
      let cut = rest.length <= max ? rest.length : Math.max(rest.lastIndexOf('\n\n', max), rest.lastIndexOf('. ', max) + 1, max * 0.6 | 0);
      const piece = rest.slice(0, cut).trim();
      if (piece) out.push({ seccion: sec, texto: piece });
      rest = rest.length <= max ? '' : rest.slice(Math.max(1, cut - 120)); // 120 caracteres de solape
    }
  };
  for (const l of lines) {
    const m = /^(#{1,3})\s+(.*)/.exec(l);
    if (m && m[1].length >= 2) { flush(); sec = m[2].trim(); }
    else if (m && m[1].length === 1) { /* título del documento */ }
    else buf.push(l);
  }
  flush();
  return out.map((c, i) => ({ id: meta.id + '#' + i + ':' + fnv(c.texto), docId: meta.id, titulo: meta.titulo, categoria: meta.categoria || '', origen: meta.origen, seccion: c.seccion, texto: c.texto }));
}

// ---------- Documentos disponibles ----------
let baseIndex = null;
export async function baseDocs() {
  if (!baseIndex) {
    try { baseIndex = await (await fetch('biblioteca/index.json')).json(); } catch (e) { baseIndex = []; }
  }
  const off = new Set(((S.cfg && S.cfg.biblioteca && S.cfg.biblioteca.baseDesactivados) || []));
  return baseIndex.map(d => Object.assign({}, d, { origen: 'base', activo: !off.has(d.id) }));
}
async function docText(d, fetcher) {
  const key = 'rtext:' + d.id + ':' + (d.huella || '');
  const c = await kv.get(key);
  if (c !== undefined && c !== null) return c;
  let t = '';
  if (d.origen === 'base') t = await (await fetch('biblioteca/' + d.archivo)).text();
  else t = (await (fetcher ? fetcher(d.id) : api('biblioteca.texto', { id: d.id }))).texto || '';
  kv.set(key, t);
  return t;
}

// ---------- Índice BM25 en memoria ----------
class Index {
  constructor() { this.chunks = []; this.df = new Map(); this.avg = 1; }
  build(chunks) {
    this.chunks = chunks.map(c => { const tk = tokens(c.titulo + ' ' + c.seccion + ' ' + c.seccion + ' ' + c.texto); const tf = new Map(); tk.forEach(t => tf.set(t, (tf.get(t) || 0) + 1)); return Object.assign(c, { tf, len: tk.length }); });
    this.df = new Map();
    this.chunks.forEach(c => c.tf.forEach((_, t) => this.df.set(t, (this.df.get(t) || 0) + 1)));
    this.avg = this.chunks.reduce((a, c) => a + c.len, 0) / Math.max(1, this.chunks.length);
  }
  bm25(qt, c) {
    const N = this.chunks.length, k1 = 1.4, b = 0.7;
    let s = 0;
    for (const t of new Set(qt)) {
      const f = c.tf.get(t); if (!f) continue;
      const df = this.df.get(t) || 0, idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * c.len / this.avg));
    }
    return s;
  }
}
const idx = new Index();
let idxSig = '', building = null;
export const RAG = { chunks: 0, docs: 0, vectores: 0, modelo: '', estado: 'sin indexar', error: '' };

// Construye (o reutiliza) el índice con los documentos que la persona puede ver
export async function ensureIndex(extraDocs) {
  const base = (await baseDocs()).filter(d => d.activo);
  const own = (S.t.biblioteca || []).filter(d => d.textoId && (d.estado === 'Indexado')).map(d => Object.assign({}, d, { origen: 'propio' }));
  const docs = base.concat(own, extraDocs || []);
  const sig = docs.map(d => d.id + ':' + (d.huella || '')).join('|');
  if (sig === idxSig && idx.chunks.length) return idx;
  // si ya se está construyendo con otros documentos, se espera y se vuelve a comprobar
  if (building) { await building.catch(() => { }); return ensureIndex(extraDocs); }
  building = (async () => {
    RAG.estado = 'indexando';
    const all = [];
    for (const d of docs) {
      try { all.push(...chunk(await docText(d), d)); }
      catch (e) { console.warn('RAG: no se pudo leer', d.titulo, e); }
    }
    idx.build(all);
    idxSig = sig;
    RAG.chunks = all.length; RAG.docs = docs.length; RAG.estado = 'listo';
    startEmbedder();
    return idx;
  })().finally(() => { building = null; });
  return building;
}

// ---------- Vectores (significado) con el modelo local ----------
let vecs = null, vecModel = '', embedding = false;
async function loadVecs(model) {
  if (vecs && vecModel === model) return vecs;
  vecModel = model;
  const raw = await kv.get('emb:' + model);
  vecs = new Map(raw ? Object.entries(raw).map(([k, v]) => [k, new Float32Array(v)]) : []);
  return vecs;
}
let saveT = null;
function saveVecs() { clearTimeout(saveT); saveT = setTimeout(() => { const o = {}; vecs.forEach((v, k) => { o[k] = v.buffer.slice(0); }); kv.set('emb:' + vecModel, o); }, 1500); }
function normalize(v) { let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s) || 1; return Float32Array.from(v, x => x / s); }
async function embedModel() {
  if (!desktop.on) return null;
  try { const st = await desktop.iaEstado(); if (!st.funcionando) return null; const m = (st.modelos || []).find(x => x.nombre === EMBED.modelo || x.nombre.startsWith('qwen3-embedding') || /embed/.test(x.nombre)); return m ? m.nombre : null; }
  catch (e) { return null; }
}
async function embed(model, texts) {
  const r = await desktop.iaEmbed({ model, input: texts, truncate: true });
  return (r.embeddings || []).map(normalize);
}
// Trabaja en segundo plano, en lotes pequeños, sin bloquear la app
export async function startEmbedder() {
  if (embedding) return;
  const model = await embedModel();
  if (!model) { RAG.modelo = ''; return; }
  embedding = true; RAG.modelo = model;
  try {
    await loadVecs(model);
    const todo = idx.chunks.filter(c => !vecs.has(c.id));
    for (let i = 0; i < todo.length; i += 12) {
      const batch = todo.slice(i, i + 12);
      const out = await embed(model, batch.map(c => (c.titulo + (c.seccion ? ' › ' + c.seccion : '') + '\n' + c.texto).slice(0, 2000)));
      batch.forEach((c, j) => { if (out[j]) vecs.set(c.id, out[j]); });
      RAG.vectores = idx.chunks.filter(c => vecs.has(c.id)).length;
      saveVecs();
      await new Promise(r => setTimeout(r, 30));
    }
    RAG.vectores = idx.chunks.filter(c => vecs.has(c.id)).length; RAG.error = '';
  } catch (e) { RAG.error = e.message; console.warn('embeddings', e); }
  finally { embedding = false; }
}

// ---------- Buscar ----------
// allowed: Set de docId permitidos (para responder a otra persona desde el PC servidor)
export async function search(query, { k = 5, allowed = null, minScore = 0 } = {}) {
  await ensureIndex();
  const qt = tokens(query);
  let list = idx.chunks;
  if (allowed) list = list.filter(c => c.origen === 'base' || allowed.has(c.docId));
  if (!list.length) return [];
  let qv = null;
  const model = vecs && vecModel ? vecModel : await embedModel();
  if (model && vecs && vecs.size) { try { qv = (await embed(model, [query]))[0]; } catch (e) { qv = null; } }
  const scored = list.map(c => {
    const b = qt.length ? idx.bm25(qt, c) : 0;
    let v = 0; const cv = qv && vecs.get(c.id);
    if (cv) { for (let i = 0; i < cv.length; i++) v += cv[i] * qv[i]; }
    return { c, b, v };
  });
  const maxB = Math.max(0.0001, ...scored.map(x => x.b));
  // Cobertura ponderada: ¿las palabras importantes de la pregunta están en el fragmento?
  // (una palabra que no aparece en ningún documento cuenta como la más importante)
  const N = idx.chunks.length, qset = [...new Set(qt)];
  const idf = t => { const df = idx.df.get(t) || 0; return Math.log(1 + (N - df + 0.5) / (df + 0.5)); };
  const maxIdf = Math.log(1 + (N + 0.5) / 0.5);
  const w = qset.map(t => idx.df.get(t) ? idf(t) : maxIdf), wsum = w.reduce((a, b) => a + b, 0) || 1;
  scored.forEach(x => { x.cov = qset.reduce((a, t, i) => a + (x.c.tf.has(t) ? w[i] : 0), 0) / wsum; });
  // Los documentos propios de la empresa pesan algo más que la biblioteca general
  scored.forEach(x => { x.s = (qv ? 0.4 * (x.b / maxB) + 0.6 * Math.max(0, x.v) : x.b / maxB) * (x.c.origen === 'propio' ? 1.15 : 1); x.rel = qv ? x.v : x.b; });
  scored.sort((a, b) => b.s - a.s);
  // Umbral: si nada se parece de verdad, mejor devolver nada que algo irrelevante
  const good = scored.filter(x => (qv ? x.v >= 0.42 || (x.b / maxB > 0.6 && x.b > 2.5 && x.cov >= 0.5) : x.b > 2.2 && x.cov >= 0.55) && x.s >= minScore);
  const seen = new Set(), out = [];
  for (const x of good) { if (out.length >= k) break; const key = x.c.docId + '|' + x.c.seccion; if (seen.has(key)) continue; seen.add(key); out.push(Object.assign({ score: Math.round(x.s * 100) / 100, semantico: !!qv }, x.c)); }
  return out.map(({ tf, len, ...rest }) => rest);
}

export function ragStatus() { return Object.assign({}, RAG, { vectores: vecs ? idx.chunks.filter(c => vecs.has(c.id)).length : 0 }); }
