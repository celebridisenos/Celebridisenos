// ================= v10 · Documento de venta de un producto =================
// Crear producto → generar textos (Vinted, Wallapop, Etsy, Instagram, TikTok) → documento
// Word listo para copiar y pegar. Los textos salen de la biblioteca de frases (escritas a
// mano, sin repetir) y SOLO de los datos del producto: no se inventan medidas ni precios.
import { S, byId } from './store.js';
import { load, pick, fill } from './ai/frases.js';
import { zipFiles } from './xlsx.js';

const CL = window.CL;
const low = s => String(s || '').toLowerCase();
export const PLATAFORMAS = [
  { k: 'vinted', t: 'Vinted' }, { k: 'wallapop', t: 'Wallapop' }, { k: 'etsy', t: 'Etsy' },
  { k: 'instagram', t: 'Instagram' }, { k: 'tiktok', t: 'TikTok' }
];

// Precio recomendado por plataforma: el del producto o el de la calculadora de costes (datos reales)
function precios(p) {
  const out = {};
  try {
    const calc = (S.t.calculadora || []).find(c => CL.norm(c.nombre) === CL.norm(p.nombre));
    if (calc && S.cfg && S.cfg.precios) { const r = CL.prices(calc, S.cfg.precios, {}); out.rec = r.recomendado; out.coste = r.desglose.costeTotal; }
  } catch (e) { }
  out.base = Number(p.precio) || 0;
  return out;
}

// Tipo de producto para elegir frases que encajen (no hablar de impresión 3D en una camiseta)
export function tipo(p) {
  const s = low([p.categoria, p.subcategoria, p.nombre, p.material].join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/ropa|tee\b|t-?shirt|camiseta|sudadera|hoodie|gorra|moda|algodon|textil|pantalon|chaqueta|noorko|streetwear|prenda/.test(s)) return 'textil';
  if (/pla\b|petg|resina|3d|stl|impres/.test(s)) return '3d';
  return '3d'; // CelebriDiseños: el negocio principal es impresión 3D
}
export async function generate(p) {
  const [fp, fs, mk] = await Promise.all([load('productos'), load('social'), load('marketplaces')]);
  const pr = precios(p);
  const t = tipo(p);
  const mix = (base, k) => (base[k] || []).concat((base[t] && base[t][k]) || []);
  const data = {
    nombre: p.nombre, material: p.material, color: p.color, medidas: p.tamano, tallas: p.tallas, sku: p.sku || p.id,
    apertura: pick(mix(fp, 'aperturas')), calidad: pick(mix(fp, 'calidad')), personalizacion: pick(mix(fp, 'personalizacion')), envio: pick(fp.envio), cierre: pick(fp.cierres),
    gancho: pick(mix(fs, 'ganchos')), cuerpo: pick(fs.cuerpo), llamada: pick(fs.llamadas)
  };
  const cat = low(p.categoria + ' ' + p.subcategoria);
  const tags = fs.hashtags.general.concat(fs.hashtags[t] || [], /hogar|bano|cocina|decor|jardin/.test(cat) ? fs.hashtags.hogar : [], /regalo|celebr|navidad|valentin|llavero/.test(cat) ? fs.hashtags.regalo : [], t === 'textil' ? fs.hashtags.moda || [] : []);
  data.hashtags = [...new Set(tags)].slice(0, 10).map(t => '#' + t).join(' ');
  const cut = (t, n) => t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
  const precio = k => pr.base || (pr.rec && pr.rec[k]) || 0;
  const res = {};
  ['vinted', 'wallapop', 'etsy'].forEach(k => {
    res[k] = { titulo: cut(fill(pick(mk[k].titulo), data), mk[k].max_titulo || 80), descripcion: fill(pick(mk[k].descripcion), data), precio: precio(k) };
  });
  res.etsy.materiales = [p.material].filter(Boolean).join(', ');
  res.etsy.variaciones = [p.color ? 'Color: ' + p.color : '', p.tallas ? 'Talla: ' + p.tallas : '', p.tamano ? 'Tamaño: ' + p.tamano : ''].filter(Boolean).join(' · ');
  res.instagram = { texto: fill(pick(mk.instagram.texto), data) };
  res.tiktok = { texto: cut(fill(pick(mk.tiktok.texto), data), 300) };
  res.general = { nombre: p.nombre, sku: p.sku || p.id, categoria: [p.categoria, p.subcategoria].filter(Boolean).join(' / '), material: p.material || '', color: p.color || '', tallas: p.tallas || '', medidas: p.tamano || '',
    stock: stockOf(p), precioRecomendado: pr.rec ? pr.rec.wallapop : (pr.base || 0), coste: pr.coste || 0 };
  return res;
}
function stockOf(p) { const s = (S.t.stock || []).find(x => CL.norm(x.producto) === CL.norm(p.nombre)); return s && s.unidades !== '' ? s.unidades : ''; }
const e2 = v => v ? Number(v).toFixed(2).replace('.', ',') + ' €' : '';

// Texto completo (para copiar todo de una vez)
export function asText(p, d) {
  const g = d.general, L = [];
  L.push(p.nombre.toUpperCase(), '', 'INFORMACIÓN GENERAL');
  [['SKU', g.sku], ['Categoría', g.categoria], ['Material', g.material], ['Color', g.color], ['Tallas', g.tallas], ['Medidas', g.medidas], ['Stock', g.stock], ['Precio recomendado', e2(g.precioRecomendado)]].forEach(([k, v]) => { if (v !== '' && v !== undefined && v !== 0) L.push(k + ': ' + v); });
  L.push('', 'VINTED', 'Título: ' + d.vinted.titulo, d.vinted.precio ? 'Precio: ' + e2(d.vinted.precio) : '', d.vinted.descripcion);
  L.push('', 'WALLAPOP', 'Título: ' + d.wallapop.titulo, d.wallapop.precio ? 'Precio: ' + e2(d.wallapop.precio) : '', d.wallapop.descripcion);
  L.push('', 'ETSY', 'Título: ' + d.etsy.titulo, d.etsy.precio ? 'Precio: ' + e2(d.etsy.precio) : '', d.etsy.materiales ? 'Materiales: ' + d.etsy.materiales : '', d.etsy.variaciones ? 'Variaciones: ' + d.etsy.variaciones : '', 'SKU: ' + g.sku, d.etsy.descripcion);
  L.push('', 'INSTAGRAM', d.instagram.texto, '', 'TIKTOK', d.tiktok.texto);
  return L.filter(x => x !== '').join('\n').replace(/\n(INFORMACIÓN|VINTED|WALLAPOP|ETSY|INSTAGRAM|TIKTOK)/g, '\n\n$1');
}

// ---------- Documento Word (.docx) sin librerías ----------
const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function para(text, o = {}) {
  const runs = String(text).split('\n').map((line, i) => (i ? '<w:r><w:br/></w:r>' : '') + '<w:r><w:rPr>' + (o.b ? '<w:b/>' : '') + (o.sz ? '<w:sz w:val="' + o.sz + '"/>' : '') + (o.color ? '<w:color w:val="' + o.color + '"/>' : '') + '</w:rPr><w:t xml:space="preserve">' + X(line) + '</w:t></w:r>').join('');
  return '<w:p><w:pPr><w:spacing w:after="' + (o.after ?? 120) + '"/></w:pPr>' + runs + '</w:p>';
}
export function docxBlob(p, d) {
  const g = d.general, b = [];
  b.push(para(p.nombre, { b: true, sz: 40, after: 80 }), para('Documento de venta · ' + (S.cfg && S.cfg.empresa ? S.cfg.empresa.nombre : '') + ' · ' + new Date().toLocaleDateString('es-ES'), { color: '777777', sz: 18, after: 240 }));
  const sec = t => b.push(para(t, { b: true, sz: 26, color: '5B21B6', after: 100 }));
  sec('INFORMACIÓN GENERAL');
  [['Nombre', g.nombre], ['SKU', g.sku], ['Categoría', g.categoria], ['Material', g.material], ['Color', g.color], ['Tallas', g.tallas], ['Medidas', g.medidas], ['Stock', g.stock], ['Precio recomendado', e2(g.precioRecomendado)]]
    .filter(([, v]) => v !== '' && v !== undefined && v !== 0).forEach(([k, v]) => b.push(para(k + ': ' + v, { after: 40 })));
  const plat = (t, x, extra) => { sec(t); b.push(para('Título', { b: true, after: 20 }), para(x.titulo)); if (x.precio) b.push(para('Precio: ' + e2(x.precio))); (extra || []).forEach(e => e[1] && b.push(para(e[0] + ': ' + e[1]))); b.push(para('Descripción', { b: true, after: 20 }), para(x.descripcion, { after: 240 })); };
  plat('VINTED', d.vinted); plat('WALLAPOP', d.wallapop); plat('ETSY', d.etsy, [['Materiales', d.etsy.materiales], ['Variaciones', d.etsy.variaciones], ['SKU', g.sku]]);
  sec('INSTAGRAM'); b.push(para(d.instagram.texto, { after: 240 }));
  sec('TIKTOK'); b.push(para(d.tiktok.texto, { after: 240 }));
  sec('OTRAS PLATAFORMAS'); b.push(para('Usa el título y la descripción de Wallapop como base (Milanuncios, Opla, tienda propia…).', { color: '777777' }));
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + b.join('') + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  return docxPack(doc);
}
// v13.10: empaquetar cualquier documento Word (lo usan también el manual de respuestas y los consejos)
function docxPack(doc) {
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': doc
  };
  return new Blob([zipFiles(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); // zipFiles ya es un Blob
}
// bloques: [[texto, { b, sz, color, after }], …] → .docx
export function docxDe(bloques) {
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + bloques.map(([t, o]) => para(t, o || {})).join('') + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>';
  return docxPack(doc);
}
export const docName = p => 'Venta - ' + (p.sku || p.id) + ' - ' + String(p.nombre).replace(/[\\/:*?"<>|]+/g, '_') + '.docx';
