// ================= 👗 CelebriDREW · EXPORTAR PARA CONFECCIÓN =================
// · SVG a tamaño real (width/height en mm: 1 unidad = 1 mm) · PDF 1:1 repartido en A4 (o en una hoja grande, A0) con el cuadrado de
//   5 × 5 cm para comprobar la escala, el mapa de hojas y rombos para casarlas · DXF R12 (ASCII, en mm, cada cosa en su capa y cada pieza
//   como bloque) · el proyecto entero (.drew.json) · la ficha técnica (HTML para imprimir o guardar en PDF).
// Cada pieza lleva: línea de corte (gruesa), línea de costura (fina), piquetes (marcas en el margen; dobles en la espalda), línea de hilo
// con flechas, el doblez marcado, líneas internas, su nombre, la talla y cuántas se cortan. Las unidades se comprueban al exportar.
import * as G from './geom.js';
import * as Z from './pieza.js';
import { lineaCorte } from './margen.js';
import { nuevoPDF } from './pdf.js';

export const VERSION_FORMATO = 1;
const cortar = pz => (pz.corte.doblez ? 'Cortar ' + (pz.corte.n || 1) + ' al doblez' : pz.corte.espejo ? 'Cortar ' + (pz.corte.n || 2) + ' (una en espejo)' : 'Cortar ' + (pz.corte.n || 1));
// todo lo que se dibuja de una pieza, en sus coordenadas (mm, Y hacia arriba)
export function dibujo(pz) {
  const costura = Z.contorno(pz), corte = lineaCorte(pz), piq = [], tx = [];
  pz.piquetes.forEach(q => { const P = Z.piqueteEn(pz, q); if (!P) return; const m = Z.margenDe(pz, q.borde) || 0, largo = Math.max(4, Math.min(6, m || 5)), off = (q.n || 1) === 2 ? [-1.5, 1.5] : [0];
    off.forEach(o => { const b = G.suma(P.p, G.esc(P.tg, o)), a = G.suma(b, G.esc(P.fuera, m)), c = G.suma(a, G.esc(P.fuera, -largo)); piq.push([m ? a : b, m ? c : G.suma(b, G.esc(P.fuera, 5))]); }); });
  const internas = pz.internas.filter(i => i.tipo !== 'hilo').map(i => ({ tipo: i.tipo, pts: i.pts, n: i.n })), hilo = pz.internas.find(i => i.tipo === 'hilo');
  let doblez = null; if (pz.corte.doblez) { const L = Z.bordePolilinea(pz, pz.corte.doblez); doblez = [L[0], L[L.length - 1]]; }
  const b = G.caja(costura); const tam = Math.max(3, Math.min(7, b.w / 16, b.h / 7)), tam2 = Math.max(2.4, Math.min(4, tam * 0.55)); // (la letra cabe en la pieza: una tira estrecha la lleva pequeña)
  tx.push({ p: [b.x0 + b.w / 2, b.y0 + b.h * 0.55], t: pz.nombre.toUpperCase(), tam }, { p: [b.x0 + b.w / 2, b.y0 + b.h * 0.55 - tam * 1.25], t: cortar(pz) + (pz.talla ? ' · Talla ' + pz.talla : ''), tam: tam2 });
  return { costura, corte, piq, internas, hilo: hilo ? hilo.pts : null, doblez, pinzas: pz.pinzas.map(z => z.tramos.map(id => Z.tramoGeo(pz, Z.tramoPorId(pz, id)))), tx, caja: G.caja(corte) };
}
// colocar las piezas en filas (para el SVG, el DXF y el PDF): [{ pz, d, x, y }] en un pliego con la Y hacia ABAJO
export function coloca(prenda, anchoMax = 1400, hueco = 25) {
  let x = hueco, y = hueco, fila = 0, ancho = 0; const out = [];
  prenda.piezas.forEach(pz => { const d = dibujo(pz), b = d.caja; if (x > hueco && x + b.w > anchoMax) { x = hueco; y += fila + hueco; fila = 0; }
    const X0 = x, Y0 = y; out.push({ pz, d, x: X0, y: Y0, w: b.w, h: b.h, a: p => [X0 + (p[0] - b.x0), Y0 + (b.y1 - p[1])] }); x += b.w + hueco; fila = Math.max(fila, b.h); ancho = Math.max(ancho, x); });
  return { items: out, ancho, alto: y + fila + hueco };
}
const f2 = v => (Math.round(v * 100) / 100).toString();
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- SVG (tamaño real) ----------
export function svg(prenda, o = {}) {
  const C = coloca(prenda, o.anchoMax || 1400), L = [];
  C.items.forEach(it => { const d = it.d, a = it.a, pts = P => P.map(p => a(p).map(f2).join(',')).join(' ');
    L.push(`<g data-pieza="${esc(it.pz.id)}">`);
    L.push(`<polygon class="corte" points="${pts(d.corte)}"/>`, `<polygon class="costura" points="${pts(d.costura)}"/>`);
    d.piq.forEach(([p, q]) => L.push(`<line class="piq" x1="${f2(a(p)[0])}" y1="${f2(a(p)[1])}" x2="${f2(a(q)[0])}" y2="${f2(a(q)[1])}"/>`));
    d.internas.forEach(i => { if (i.tipo === 'boton') { const c = a(i.pts[0]); L.push(`<circle class="int" cx="${f2(c[0])}" cy="${f2(c[1])}" r="4"/>`); } else L.push(`<polyline class="int ${i.tipo}" points="${pts(i.pts)}"/>`); });
    if (d.hilo) { const [p, q] = d.hilo.map(a); L.push(`<line class="hilo" x1="${f2(p[0])}" y1="${f2(p[1])}" x2="${f2(q[0])}" y2="${f2(q[1])}" marker-start="url(#fl)" marker-end="url(#fl)"/>`); }
    if (d.doblez) { const [p, q] = d.doblez.map(a), m = G.lerp(p, q, 0.5); L.push(`<line class="dob" x1="${f2(p[0])}" y1="${f2(p[1])}" x2="${f2(q[0])}" y2="${f2(q[1])}"/>`, `<text class="tdob" x="${f2(m[0] + 4)}" y="${f2(m[1])}" transform="rotate(-90 ${f2(m[0] + 4)} ${f2(m[1])})">DOBLEZ</text>`); }
    d.tx.forEach(t => { const p = a(t.p); L.push(`<text x="${f2(p[0])}" y="${f2(p[1])}" font-size="${f2(t.tam)}" text-anchor="middle">${esc(t.t)}</text>`); });
    L.push('</g>'); });
  // el cuadrado de 5 × 5 cm para comprobar la escala
  const yq = C.alto; L.push(`<rect class="cuadro" x="25" y="${f2(yq)}" width="50" height="50"/><text x="85" y="${f2(yq + 28)}" font-size="5">5 × 5 cm: mídelo para comprobar que está a tamaño real</text>`);
  const W = Math.max(C.ancho, 300), H = C.alto + 80;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${f2(W)}mm" height="${f2(H)}mm" viewBox="0 0 ${f2(W)} ${f2(H)}" font-family="Arial, sans-serif">` +
    `<title>${esc(prenda.nombre || 'Patrón')} · CelebriDREW</title><defs><marker id="fl" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#000"/></marker></defs>` +
    `<style>.corte{fill:none;stroke:#000;stroke-width:0.6}.costura{fill:none;stroke:#555;stroke-width:0.25;stroke-dasharray:3 1.5}.piq{stroke:#000;stroke-width:0.5}.int{fill:none;stroke:#333;stroke-width:0.3;stroke-dasharray:4 2}.hilo{stroke:#000;stroke-width:0.35}.dob{stroke:#000;stroke-width:0.8;stroke-dasharray:10 2 2 2}.tdob{font-size:5px}.cuadro{fill:none;stroke:#000;stroke-width:0.4}text{fill:#000}</style>` + L.join('') + '</svg>';
}

// ---------- DXF R12 (ASCII, mm) ----------
// Capas: 1 CORTE · 8 COSTURA · 4 PIQUETES · 7 HILO · 5 INTERNAS · 6 TEXTO. Cada pieza es un BLOQUE con su nombre y se inserta en el pliego.
export function dxf(prenda, o = {}) {
  const C = coloca(prenda, o.anchoMax || 1400), out = [], g = (c, v) => out.push(String(c), String(v));
  const capas = [['CORTE', 7], ['COSTURA', 8], ['PIQUETES', 1], ['HILO', 3], ['INTERNAS', 5], ['TEXTO', 6]];
  g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$MEASUREMENT'); g(70, 1); g(9, '$EXTMIN'); g(10, 0); g(20, 0); g(9, '$EXTMAX'); g(10, f2(C.ancho)); g(20, f2(C.alto)); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'TABLES'); g(0, 'TABLE'); g(2, 'LAYER'); g(70, capas.length); capas.forEach(([n, c]) => { g(0, 'LAYER'); g(2, n); g(70, 0); g(62, c); g(6, 'CONTINUOUS'); }); g(0, 'ENDTAB'); g(0, 'ENDSEC');
  const poli = (P, capa, cerrada) => { g(0, 'POLYLINE'); g(8, capa); g(66, 1); g(70, cerrada ? 1 : 0); g(10, 0); g(20, 0); g(30, 0); P.forEach(p => { g(0, 'VERTEX'); g(8, capa); g(10, f2(p[0])); g(20, f2(p[1])); g(30, 0); }); g(0, 'SEQEND'); g(8, capa); };
  const texto = (p, t, h, capa = 'TEXTO') => { g(0, 'TEXT'); g(8, capa); g(10, f2(p[0])); g(20, f2(p[1])); g(30, 0); g(40, f2(h)); g(1, String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '')); };
  const nombreBloque = (pz, i) => ('P' + (i + 1) + '_' + pz.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_')).slice(0, 31);
  g(0, 'SECTION'); g(2, 'BLOCKS');
  C.items.forEach((it, i) => { const d = it.d, b = d.caja, loc = p => [p[0] - b.x0, p[1] - b.y0];
    g(0, 'BLOCK'); g(8, '0'); g(2, nombreBloque(it.pz, i)); g(70, 0); g(10, 0); g(20, 0); g(30, 0); g(3, nombreBloque(it.pz, i));
    poli(d.corte.map(loc), 'CORTE', true); poli(d.costura.map(loc), 'COSTURA', true); d.piq.forEach(s => poli(s.map(loc), 'PIQUETES', false));
    if (d.hilo) poli(d.hilo.map(loc), 'HILO', false); d.internas.forEach(x => { if (x.pts.length > 1) poli(x.pts.map(loc), 'INTERNAS', false); }); if (d.doblez) poli(d.doblez.map(loc), 'INTERNAS', false);
    d.tx.forEach(t => texto(loc(t.p), t.t, t.tam)); g(0, 'ENDBLK'); g(8, '0'); });
  g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  C.items.forEach((it, i) => { g(0, 'INSERT'); g(8, '0'); g(2, nombreBloque(it.pz, i)); g(10, f2(it.x)); g(20, f2(C.alto - it.y - it.h)); g(30, 0); });
  g(0, 'ENDSEC'); g(0, 'EOF');
  return out.join('\r\n') + '\r\n';
}
// leer un DXF (para comprobar lo exportado): las entidades por capa y los bloques
export function leeDXF(txt) {
  const L = txt.split(/\r?\n/), pares = []; for (let i = 0; i + 1 < L.length; i += 2) pares.push([Number(L[i].trim()), L[i + 1].trim()]);
  const R = { capas: [], bloques: [], polilineas: 0, vertices: 0, textos: 0, inserts: 0, eof: false, unidades: null };
  for (let i = 0; i < pares.length; i++) { const [c, v] = pares[i]; if (c !== 0 && !(c === 9)) continue;
    if (c === 9 && v === '$MEASUREMENT') R.unidades = pares[i + 1] && pares[i + 1][1] === '1' ? 'mm' : 'pulgadas';
    if (v === 'LAYER' && pares[i + 1] && pares[i + 1][0] === 2) R.capas.push(pares[i + 1][1]); if (v === 'BLOCK') R.bloques.push((pares.slice(i, i + 6).find(p => p[0] === 2) || [])[1]);
    if (v === 'POLYLINE') R.polilineas++; if (v === 'VERTEX') R.vertices++; if (v === 'TEXT') R.textos++; if (v === 'INSERT') R.inserts++; if (v === 'EOF') R.eof = true; }
  return R;
}

// ---------- PDF 1:1 ----------
// formato 'a4' (repartido en hojas con 1 cm que se repite y rombos para casarlas) o 'a0' (una hoja grande; si no cabe, varias A0)
export function pdf(prenda, o = {}) {
  const hoja = o.formato === 'a0' ? { w: 841, h: 1189 } : { w: 210, h: 297 }, m = 10, sol = o.formato === 'a0' ? 0 : 10, uw = hoja.w - 2 * m, uh = hoja.h - 2 * m, pw = uw - sol, ph = uh - sol;
  const C = coloca(prenda, o.formato === 'a0' ? uw - 10 : Math.max(uw * 3, 600)), cols = Math.max(1, Math.ceil((C.ancho - sol) / pw)), filas = Math.max(1, Math.ceil((C.alto - sol) / ph)), doc = nuevoPDF({ titulo: prenda.nombre || 'Patrón', escala: o.formato === 'a0' ? false : undefined }) /* (16-10: la corrección de SU impresora no va en el A0: lo imprime la copistería) */;
  // portada: cuadrado de comprobación, mapa de hojas y lista de piezas
  const P0 = doc.pagina(210, 297); let y = 297 - 22;
  P0.texto(15, y, (prenda.nombre || 'Patrón') + ' · CelebriDREW', { tam: 7, negrita: true }); y -= 9;
  P0.texto(15, y, 'Imprime al 100 % («tamaño real», sin «ajustar a la página»). Mide el cuadrado: tiene que dar 5 × 5 cm.', { tam: 3.6 }); y -= 8;
  if (doc.escala) { P0.texto(15, y + 2.5, 'Corregido para tu impresora (calibrada): a lo ancho ×' + doc.escala.x.toFixed(4).replace('.', ',') + ' · a lo alto ×' + doc.escala.y.toFixed(4).replace('.', ','), { tam: 2.8, gris: 0.35 }); y -= 3; }
  P0.rect(15, y - 50, 50, 50, { ancho: 0.4 }); P0.texto(70, y - 25, '5 cm × 5 cm', { tam: 4, negrita: true }); P0.linea(15, y - 56, 115, y - 56, { ancho: 0.4 }); for (let k = 0; k <= 10; k++) P0.linea(15 + k * 10, y - 56, 15 + k * 10, y - (k % 5 ? 58 : 60), { ancho: 0.3 }); P0.texto(118, y - 58, 'regla de 10 cm', { tam: 3 }); y -= 70;
  if (o.formato !== 'a0') { P0.texto(15, y, 'Hojas: ' + cols + ' × ' + filas + ' = ' + cols * filas + '. Recorta el margen de una hoja y pégala encima de la siguiente haciendo coincidir los rombos.', { tam: 3.4 }); y -= 6;
    const k = Math.min(160 / (cols * pw), 70 / (filas * ph)); for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) { const x0 = 15 + c * pw * k, y0 = y - (f + 1) * ph * k; P0.rect(x0, y0, pw * k, ph * k, { ancho: 0.2, gris: 0.5 }); P0.texto(x0 + 2, y0 + 2, String.fromCharCode(65 + f) + (c + 1), { tam: 3 }); }
    C.items.forEach(it => P0.rect(15 + it.x * k, y - (it.y + it.h) * k, it.w * k, it.h * k, { ancho: 0.3 })); y -= filas * ph * k + 8; }
  P0.texto(15, y, 'Piezas:', { tam: 4, negrita: true }); y -= 6; prenda.piezas.forEach(pz => { P0.texto(18, y, '· ' + pz.nombre + ' — ' + cortar(pz) + (pz.material ? ' · ' + pz.material : ''), { tam: 3.4 }); y -= 5; });
  if (prenda.validacion) { y -= 3; P0.texto(15, y, 'Estado: ' + prenda.validacion, { tam: 3.4, negrita: true }); }
  // las hojas del patrón
  const pinta = (g, ox, oy) => { // ox, oy = esquina del pliego que cae en el origen útil de la hoja
    const a = p => [m + p[0] - ox, hoja.h - m - (p[1] - oy)];
    C.items.forEach(it => { const d = it.d, A = p => a(it.a(p));
      if (it.x > ox + uw || it.x + it.w < ox || it.y > oy + uh || it.y + it.h < oy) return;
      g.poli(d.corte.map(A), { ancho: 0.5 }); g.poli(d.costura.map(A), { ancho: 0.2, gris: 0.35, trazos: [3, 1.5] });
      d.piq.forEach(s => g.linea(...A(s[0]), ...A(s[1]), { ancho: 0.4 }));
      d.internas.forEach(x => { if (x.pts.length > 1) g.poli(x.pts.map(A), { ancho: 0.25, trazos: [4, 2], cerrado: false }); });
      if (d.hilo) { const [p, q] = d.hilo.map(A); g.linea(p[0], p[1], q[0], q[1], { ancho: 0.3 }); }
      if (d.doblez) { const [p, q] = d.doblez.map(A); g.linea(p[0], p[1], q[0], q[1], { ancho: 0.7, trazos: [8, 2, 2, 2] }); const mm = G.lerp(p, q, 0.5); g.texto(mm[0] + 3, mm[1], 'DOBLEZ', { tam: 3.5, giro: 90 }); }
      d.tx.forEach(t => { const p = A(t.p); g.texto(p[0], p[1], t.t, { tam: t.tam, centro: true, negrita: t.tam > 4.5 }); }); });
  };
  for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) {
    const g = doc.pagina(hoja.w, hoja.h), ox = c * pw, oy = f * ph;
    g.recorta(m, m, uw, uh, () => pinta(g, ox, oy)); g.rect(m, m, uw, uh, { ancho: 0.15, gris: 0.6 });
    if (sol) { [[m + sol / 2, m + uh / 2], [m + uw - sol / 2, m + uh / 2], [m + uw / 2, m + sol / 2], [m + uw / 2, m + uh - sol / 2]].forEach(([x, yy]) => g.poli([[x, yy - 3], [x + 3, yy], [x, yy + 3], [x - 3, yy]], { ancho: 0.3 })); g.linea(m + uw - sol, m, m + uw - sol, m + uh, { ancho: 0.1, gris: 0.6, trazos: [2, 2] }); g.linea(m, m + sol, m + uw, m + sol, { ancho: 0.1, gris: 0.6, trazos: [2, 2] }); }
    g.texto(m + 2, hoja.h - m + 3, 'Hoja ' + String.fromCharCode(65 + f) + (c + 1) + ' de ' + cols * filas + ' · ' + (prenda.nombre || ''), { tam: 3 });
    g.rect(hoja.w - m - 22, m + 2, 20, 20, { ancho: 0.3 }); g.texto(hoja.w - m - 21, m + 23, '2 × 2 cm', { tam: 2.5 });
  }
  return { bytes: doc.bytes(), hojas: cols * filas, cols, filas, formato: o.formato || 'a4' };
}

// ---------- el proyecto entero y la ficha técnica ----------
export const proyectoJSON = proyecto => JSON.stringify(Object.assign({ formato: 'celebridrew', version: VERSION_FORMATO, guardado: new Date().toISOString() }, proyecto), null, 1);
export function leeProyecto(txt) { const j = JSON.parse(txt); if (j.formato !== 'celebridrew') throw new Error('No es un proyecto de CelebriDREW.'); if (j.version > VERSION_FORMATO) throw new Error('Este proyecto es de una versión más nueva de CelebriDREW.'); return j; }
export function fichaTecnica(prenda, V, o = {}) {
  const t = Z, piezas = prenda.piezas.map(pz => { const D = t.datos(pz); return `<tr><td><b>${esc(pz.nombre)}</b></td><td>${esc(cortar(pz))}</td><td>${G.cm(D.ancho)} × ${G.cm(D.alto)}</td><td>${(Math.abs(D.area) / 100).toFixed(0)} cm²</td><td>${esc(pz.material || '—')}</td></tr>`; }).join('');
  const med = Object.entries((prenda.bloque || {}).medidas || {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${G.cm(v)} cm</td><td>${esc(((prenda.origenMedidas || {})[k]) || 'plantilla')}</td></tr>`).join('');
  const cos = (V && V.costuras || []).map(c => `<tr><td>${esc(c.n)}</td><td>${G.cm(c.La, 2)} / ${G.cm(c.Lb, 2)} cm</td><td>${c.ok ? '✔' : '✘ ' + G.cm(Math.abs(c.dif), 2) + ' cm'}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ficha técnica · ${esc(prenda.nombre)}</title><style>@page{size:A4;margin:14mm}body{font:11pt/1.45 "Segoe UI",system-ui,sans-serif;color:#1b1814;margin:0}@media screen{body{max-width:190mm;margin:10mm auto;padding:0 6mm}}h1{font:800 20pt Georgia,serif;margin:0 0 4px}h2{font-size:12pt;text-transform:uppercase;letter-spacing:.06em;color:#7a1f2b;margin:14px 0 4px}table{border-collapse:collapse;width:100%;font-size:10pt}td,th{border-bottom:1px solid #e6dfd2;padding:3px 6px;text-align:left}.estado{border:1px solid #ccc;border-radius:8px;padding:6px 10px;background:#faf7f0}</style></head><body>` +
    `<h1>${esc(prenda.nombre || 'Prenda')}</h1><p>${esc(o.tienda || 'CelebriDiseños')} · CelebriDREW · ${new Date().toLocaleDateString('es-ES')}${prenda.talla ? ' · Talla ' + esc(prenda.talla) : ''}</p>` +
    `<p class="estado"><b>Estado:</b> ${esc(V ? V.estadoT || V.estado : '—')}. La validación geométrica no sustituye una prueba física con tela.</p>` +
    `<h2>Piezas</h2><table><tr><th>Pieza</th><th>Corte</th><th>Tamaño (cm)</th><th>Superficie</th><th>Material</th></tr>${piezas}</table>` +
    (med ? `<h2>Medidas de la prenda</h2><table><tr><th>Medida</th><th>Valor</th><th>De dónde sale</th></tr>${med}</table>` : '') +
    (cos ? `<h2>Costuras</h2><table><tr><th>Costura</th><th>Largos</th><th>Casa</th></tr>${cos}</table>` : '') + '</body></html>';
}
