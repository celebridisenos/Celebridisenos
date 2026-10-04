// ================= Extraer el texto de los documentos (en el propio dispositivo) =================
// PDF, Word (DOCX), Excel (XLSX), CSV, TXT, Markdown y, con el modelo de visión, imágenes (OCR).
// Nada se envía a servicios externos: todo se procesa aquí.
import { desktop } from '../desktop.js';

export const DOC_TYPES = ['pdf', 'txt', 'md', 'markdown', 'csv', 'docx', 'xlsx', 'json', 'html', 'htm', 'jpg', 'jpeg', 'png', 'webp'];
export const MAX_DOC_MB = 60;
const ext = name => String(name).split('.').pop().toLowerCase();

export async function extractText(file, onStep) {
  const e = ext(file.name);
  if (!DOC_TYPES.includes(e)) throw new Error('Formato no admitido (.' + e + '). Admitidos: PDF, Word (.docx), Excel (.xlsx), CSV, TXT, Markdown e imágenes.');
  if (file.size > MAX_DOC_MB * 1048576) throw new Error('El archivo pesa demasiado (máximo ' + MAX_DOC_MB + ' MB).');
  if (!file.size) throw new Error('El archivo está vacío.');
  onStep && onStep('Leyendo ' + file.name + '…');
  switch (e) {
    case 'txt': case 'md': case 'markdown': case 'json': return { texto: await readText(file), tipo: e };
    case 'html': case 'htm': { const d = new DOMParser().parseFromString(await readText(file), 'text/html'); return { texto: d.body ? d.body.innerText || d.body.textContent : '', tipo: 'html' }; }
    case 'csv': return { texto: csvToText(await readText(file)), tipo: 'csv' };
    case 'docx': return { texto: await docxText(await file.arrayBuffer()), tipo: 'docx' };
    case 'xlsx': return { texto: await xlsxText(await file.arrayBuffer()), tipo: 'xlsx' };
    case 'pdf': return await pdfText(await file.arrayBuffer(), onStep);
    default: return await imageText(file, onStep);
  }
}

async function readText(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let t = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  if (t.includes('�')) t = new TextDecoder('windows-1252').decode(buf); // archivos antiguos de Windows
  return t.replace(/^﻿/, '');
}

// ---------- CSV → texto legible (cada fila con sus encabezados) ----------
export function parseCsv(text) {
  const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}
function csvToText(text) {
  const rows = parseCsv(text);
  if (!rows.length) return '';
  const hd = rows[0].map(x => x.trim());
  return rows.slice(1).map((r, i) => 'Fila ' + (i + 1) + ': ' + r.map((v, j) => (hd[j] || 'Col' + (j + 1)) + ' = ' + String(v).trim()).filter(x => !/= $/.test(x)).join('; ')).join('\n');
}

// ---------- ZIP (DOCX y XLSX son archivos ZIP con XML dentro) ----------
async function unzip(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('El archivo está dañado o no es un documento de Office válido.');
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    files[name] = { method, csize, off };
    p += 46 + nl + el + cl;
  }
  return {
    names: Object.keys(files),
    async text(name) {
      const f = files[name]; if (!f) return null;
      const lnl = dv.getUint16(f.off + 26, true), lel = dv.getUint16(f.off + 28, true);
      const data = u8.subarray(f.off + 30 + lnl + lel, f.off + 30 + lnl + lel + f.csize);
      if (f.method === 0) return new TextDecoder().decode(data);
      if (f.method !== 8) throw new Error('Compresión no admitida en ' + name);
      const ds = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(ds).text();
    }
  };
}
const xml = s => new DOMParser().parseFromString(s, 'application/xml');
const unesc = s => s;

async function docxText(buf) {
  const z = await unzip(buf);
  const parts = ['word/document.xml'].concat(z.names.filter(n => /^word\/(header|footer)\d*\.xml$/.test(n)));
  const out = [];
  for (const p of parts) {
    const s = await z.text(p); if (!s) continue;
    const d = xml(s);
    d.querySelectorAll('p').forEach(par => {
      let t = '';
      par.querySelectorAll('t, tab, br').forEach(x => { t += x.localName === 't' ? unesc(x.textContent) : x.localName === 'tab' ? '\t' : '\n'; });
      const style = par.querySelector('pStyle');
      const lvl = style && /Heading(\d)|Ttulo(\d)|Titulo(\d)/i.exec(style.getAttribute('w:val') || '');
      if (t.trim()) out.push(lvl ? '#'.repeat(Math.min(3, +(lvl[1] || lvl[2] || lvl[3]) + 1)) + ' ' + t.trim() : t);
    });
  }
  return out.join('\n');
}

async function xlsxText(buf) {
  const z = await unzip(buf);
  const ss = [];
  const sst = await z.text('xl/sharedStrings.xml');
  if (sst) xml(sst).querySelectorAll('si').forEach(si => { let t = ''; si.querySelectorAll('t').forEach(x => { t += x.textContent; }); ss.push(t); });
  const wb = xml(await z.text('xl/workbook.xml') || '<a/>');
  const rels = xml(await z.text('xl/_rels/workbook.xml.rels') || '<a/>');
  const relMap = {}; rels.querySelectorAll('Relationship').forEach(r => { relMap[r.getAttribute('Id')] = r.getAttribute('Target'); });
  const out = [];
  for (const sh of wb.querySelectorAll('sheet')) {
    const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let target = relMap[rid] || ''; target = target.replace(/^\//, '').replace(/^xl\//, '');
    const s = await z.text('xl/' + target); if (!s) continue;
    const rows = [];
    xml(s).querySelectorAll('sheetData row').forEach(r => {
      const cells = [];
      r.querySelectorAll('c').forEach(c => {
        const ref = c.getAttribute('r') || '', t = c.getAttribute('t'), v = c.querySelector('v'), is = c.querySelector('is');
        let val = is ? is.textContent : v ? v.textContent : '';
        if (t === 's') val = ss[+val] ?? '';
        const col = ref.replace(/\d+/g, '');
        if (String(val).trim()) cells.push([col, String(val).trim()]);
      });
      if (cells.length) rows.push(cells);
    });
    if (!rows.length) continue;
    out.push('## Hoja: ' + sh.getAttribute('name'));
    // Si la primera fila parece de encabezados, se usa para dar sentido a cada valor
    const head = rows[0].every(c => isNaN(parseFloat(c[1]))) ? Object.fromEntries(rows[0]) : null;
    rows.slice(head ? 1 : 0).slice(0, 5000).forEach((r, i) => out.push((head ? 'Fila ' + (i + 2) + ': ' : '') + r.map(([c, v]) => (head && head[c] ? head[c] : c) + ' = ' + v).join('; ')));
  }
  return out.join('\n');
}

// ---------- PDF (pdf.js, incluido en la app: no necesita Internet) ----------
let pdfjs = null;
async function pdfText(buf, onStep) {
  if (!pdfjs) {
    pdfjs = await (await import('../pdfview.js')).pdfjs(); // v13.5: con la compatibilidad para móviles antiguos
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onStep && onStep('Leyendo página ' + i + ' de ' + doc.numPages + '…');
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let line = '', lastY = null;
    const lines = [];
    tc.items.forEach(it => {
      const y = it.transform ? Math.round(it.transform[5]) : 0;
      if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line); line = ''; }
      line += it.str + (it.hasEOL ? '\n' : '');
      lastY = y;
    });
    if (line) lines.push(line);
    out.push('## Página ' + i + '\n' + lines.join('\n'));
  }
  const texto = out.join('\n\n');
  const chars = texto.replace(/## Página \d+|\s/g, '').length;
  return { texto, tipo: 'pdf', paginas: doc.numPages, aviso: chars < 30 * doc.numPages ? 'El PDF casi no tiene texto (¿está escaneado?). Para leerlo usa el OCR con el modelo de visión.' : '' };
}

// ---------- Imágenes: OCR con el modelo de visión local ----------
export async function imageText(file, onStep) {
  if (!desktop.on) throw new Error('El OCR de imágenes se hace en el PC con IA local. Sube la imagen desde el ordenador.');
  const st = await desktop.iaEstado();
  const vis = (st.modelos || []).find(m => /qwen2\.5vl|llava|gemma3|minicpm-v|llama3\.2-vision/i.test(m.nombre));
  if (!vis) throw new Error('Para leer texto de imágenes descarga el modelo "Leer imágenes (OCR)" en Configuración → IA local.');
  onStep && onStep('Leyendo el texto de la imagen con ' + vis.nombre + '… (puede tardar un poco)');
  const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
  let text = '';
  await desktop.iaChat({ model: vis.nombre, stream: true, options: { temperature: 0 }, messages: [{ role: 'user', content: 'Transcribe EXACTAMENTE todo el texto que aparece en la imagen, respetando el orden y los saltos de línea. No añadas comentarios ni traducciones. Si no hay texto, responde: [SIN TEXTO]', images: [b64] }] }, ch => { if (ch.message && ch.message.content) text += ch.message.content; });
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (/^\[SIN TEXTO\]$/i.test(text)) text = '';
  return { texto: text, tipo: 'imagen', aviso: text ? 'Texto obtenido por OCR: revisa que sea correcto.' : 'No se ha encontrado texto en la imagen.' };
}
