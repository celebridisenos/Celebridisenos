// ================= 👗 CelebriDREW · 📦 EXPORTACIÓN COMPLETA (dossier A4 «estilo Canva») · 17-10-2026, noche =================
// Ella: «al exportar tiene que haber dos formas: exportar PDF normal para imprimir y EXPORTACIÓN COMPLETA que genere un tech pack automático,
// un PDF para imprimir y el patrón con sus medidas en mini, que quepa todo en A4, estilizado estilo Canva con sus colores bonitos, con sus
// referencias; vamos, un full export de todo».
// El «PDF normal» sigue siendo el de siempre (el patrón a tamaño real). Este es el DOSSIER: A4 vertical, bandas de color, tarjetas
// redondeadas y círculos de color con los colores de SU marca (THE NOORKO) o los de CelebriDiseños:
//   portada (foto del 3D, nombre, marca, talla, colores, su plano de referencia, índice) · la prenda (delante y detrás, datos, referencias,
//   detalles, plano técnico) · medidas por talla (XS–XXL, graduadas) y materiales (siguen en otra hoja si no caben: nunca se pierde nada) ·
//   estampados (tarjetas + dónde va cada uno, dibujado a escala sobre su pieza) · EL PATRÓN EN MINI (todas las piezas a escala 1:N en una
//   hoja, con su ancho × alto, cuántas se cortan, doblez, hilo y una regla de 10 cm) · cómo se cose (cada paso con el dibujo de las piezas y la
//   costura marcada; los textos de la IA si ella los aceptó, o los del montaje).
//   pdfDossier(prenda, o) → { bytes, paginas }   o = { nombre, descripcion, marca, ref, coleccion, temporada, sexo, talla, pechoCuerpo,
//     cuerpo: 'Mujer · pecho 92 cm', ajuste, opciones, tela: { t, color }, fotos: [{ jpg, w, h, t }], plano: { jpg, w, h }, planoRef,
//     estampados: [{ jpg, pw, ph, nombre, pieza, w, h, x, yc }], manual: ['texto de cada paso'] (de la IA, revisado) | null, manualIA, tipos }
import * as G from './geom.js';
import * as Z from './pieza.js';
import * as EX from './exporta.js';
import { nuevoPDF, anchoTexto, renglones } from './pdf.js';
import { pasos } from './montaje.js';
import { BLOQUES } from './bloques/index.js';
import { gradua, materiales, detalles } from './ficha_pdf.js';

const W = 210, H = 297, M = 12, ARRIBA = H - 22 - 10; // (ARRIBA: donde empieza lo de cada hoja, bajo la cabecera)
const hex = s => [1, 3, 5].map(i => parseInt(String(s).slice(i, i + 2), 16) / 255);
export const TEMAS = {
  noorko: { marca: 'THE NOORKO', lema: 'La Luz Impacta', oscuro: hex('#0D0D0D'), acero: hex('#1C1F26'), acento: hex('#7A000E'), luz: hex('#00C2D1'), claro: hex('#F2F2F2'), suave: [0.93, 0.93, 0.94], texto: [0.08, 0.08, 0.09], paleta: ['#0D0D0D', '#1C1F26', '#7A000E', '#00C2D1', '#F2F2F2'] },
  celebri: { marca: 'CelebriDiseños', lema: 'Diseñado con CelebriDREW', oscuro: [0.16, 0.10, 0.22], acero: [0.27, 0.20, 0.36], acento: hex('#b0305a'), luz: hex('#8b5cf6'), claro: [0.98, 0.96, 0.98], suave: [0.95, 0.93, 0.96], texto: [0.12, 0.09, 0.15], paleta: null }
};
export const temaDe = o => (/noorko/i.test(String(o.marca || '')) || o.tema === 'noorko' ? TEMAS.noorko : TEMAS.celebri);
const cm = (mm, d = 1) => G.cm(mm, d), BLANCO = [1, 1, 1];
const mezcla = (c, k) => c.map(v => v * k + (1 - k)); // (un color aclarado hacia el blanco: k = cuánto queda del color)
// recortar un texto a un ancho (por palabras, con «…»)
export function cabe(s, tam, ancho) { s = String(s ?? ''); if (anchoTexto(s, tam) <= ancho) return s; const p = s.split(/\s+/); while (p.length > 1 && anchoTexto(p.join(' ') + '…', tam) > ancho) p.pop(); let r = p.join(' '); while (r.length > 1 && anchoTexto(r + '…', tam) > ancho) r = r.slice(0, -1); return r + '…'; }
// una tarjeta con las esquinas redondeadas
function tarjeta(g, x, y, w, h, r, o) { r = Math.min(r, w / 2, h / 2); const P = [], arco = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = (a0 + 90 * i / 6) * Math.PI / 180; P.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  arco(x + w - r, y + r, 270); arco(x + w - r, y + h - r, 0); arco(x + r, y + h - r, 90); arco(x + r, y + r, 180); g.poli(P, o); }
// una imagen JPEG encajada (sin deformar) en el hueco (x, y abajo-izquierda, w, h)
function imagen(g, im, x, y, w, h) { if (!im || !im.jpg) return null; const r = im.w / im.h, hh = Math.min(h, w / r), ww = hh * r, X = x + (w - ww) / 2, Y = y + (h - hh) / 2; g.imagen(im.jpg, im.w, im.h, X, Y, ww, hh); return { x: X, y: Y, w: ww, h: hh }; }
const NOMBRES_COLOR = { '#0d0d0d': 'Negro Carbón', '#1c1f26': 'Gris Acero', '#7a000e': 'Deep Crimson', '#00c2d1': 'Electric Cyan', '#f2f2f2': 'Off-White' };
export const nombreColor = c => { if (!c || c === 'natural') return 'Color natural de la tela'; const n = NOMBRES_COLOR[String(c).toLowerCase()]; return (n ? n + ' · ' : '') + String(c).toUpperCase(); };
// de qué lado queda un estampado, dicho para quien la lleva (tela.js: los delanteros ponen su +x en el lado IZQUIERDO del cuerpo; las espaldas, en el derecho)
export function ladoDe(E) { const x = E.x || 0; if (Math.abs(x) < 5) return 'centrado'; const del = /^(Delantero|Cuerpo delantero|Falda delantera)/.test(E.pieza || ''), esp = /^(Espalda|Cuerpo espalda|Falda espalda)/.test(E.pieza || ''), izq = del ? x > 0 : esp ? x < 0 : null;
  return cm(Math.abs(x)) + ' cm del centro' + (izq === null ? '' : ', a la ' + (izq ? 'izquierda' : 'derecha') + ' de quien la lleva'); }
const piezaPorNombre = (prenda, n) => prenda.piezas.find(p => p.nombre === n || p.nombre.startsWith(n + ' (')) || prenda.piezas.find(p => p.nombre.toLowerCase().includes(String(n || '').toLowerCase())) || null; // (en el vestido, «Espalda» es «Cuerpo espalda»)
// la pieza ENTERA para dibujarla «como se ve»: al doblez → con su espejo; media pieza que empieza en el centro (espalda con costura) → las dos mitades
function piezaEntera(pz) { if (pz.corte && pz.corte.doblez) return [Z.entera(pz)]; const C = Z.contorno(pz), b = G.caja(C);
  return Math.abs(b.x0) < 1 && pz.puntos.hps ? [C, C.map(p => [-p[0], p[1]])] : [C]; }

// ---------- el PATRÓN EN MINI: todas las piezas en una hoja, a la escala 1:N más grande en la que caben (por filas) ----------
export function colocaPiezas(piezas, ancho, alto, sep = 6) {
  const cajas = piezas.map(pz => { const d = EX.dibujo(pz), C = d.corte && d.corte.length ? d.corte : Z.contorno(pz), b = G.caja(C); return { pz, d, C, b }; });
  const prueba = s => { let x = 0, y = 0, fila = 0; const pos = [];
    for (const c of cajas.slice().sort((a, b) => b.b.h - a.b.h)) { const w = Math.max(c.b.w * s, 34), h = c.b.h * s + 9; if (x + w > ancho && x > 0) { x = 0; y += fila + sep; fila = 0; } if (w > ancho) return null; pos.push({ c, x, y, w, h }); x += w + sep; fila = Math.max(fila, h); }
    return y + fila <= alto ? pos : null; };
  let N = 2; while (N < 40 && !prueba(1 / N)) N++;
  return { s: 1 / N, N, pos: prueba(1 / N) || [] };
}

export function pdfDossier(prenda, o = {}) {
  const T = temaDe(o), k = prenda.bloque.k, D = BLOQUES[k], doc = nuevoPDF({ titulo: (o.nombre || D.t) + ' · exportación completa', escala: false });
  const Gd = gradua(prenda, o), mats = materiales(prenda, o), det = detalles(prenda, o), est = (o.estampados || []).filter(E => E && E.w > 0 && E.h > 0);
  const P0 = pasos(prenda, o.tipos), iaUno = !!(o.manual && o.manual.length === P0.length); // (la IA reescribe paso a paso: se quedan el título y el dibujo)
  const manual = o.manual && o.manual.length ? (iaUno ? P0.map((p, i) => Object.assign({}, p, { texto: String(o.manual[i]) })) : o.manual.map(t => ({ titulo: '', texto: String(t) }))) : P0;
  const marca = (o.marca || T.marca), fecha = new Date().toLocaleDateString('es-ES'), color = o.tela && o.tela.color, nombre = o.nombre || D.t;
  const hojas = []; // [{ g, titulo }] · el pie (con «N de total») se pone al final, cuando ya se sabe cuántas son
  const hoja = (titulo, sub) => { const g = doc.pagina(W, H); hojas.push({ g, titulo }); if (titulo) {
    g.rect(0, H - 22, W, 22, { fondo: T.oscuro, sinRaya: true }); g.rect(0, H - 23.2, W, 1.2, { fondo: T.acento, sinRaya: true });
    const tt = cabe(titulo, 5, 92); g.texto(W - M - anchoTexto(tt, 5), H - 12, tt, { tam: 5, negrita: true, color: T.claro }); if (sub) { const ss = cabe(sub, 2.6, 92); g.texto(W - M - anchoTexto(ss, 2.6), H - 17.5, ss, { tam: 2.6, color: [0.75, 0.75, 0.78] }); }
    g.texto(M, H - 10.5, cabe(marca.toUpperCase(), 4.6, 80), { tam: 4.6, negrita: true, color: T.claro }); g.texto(M, H - 16.5, cabe(nombre, 3, 80), { tam: 3, color: T.luz }); } return g; };
  const dato = (g, x, y, t, v, w) => { tarjeta(g, x, y, w, 15, 3, { fondo: T.suave, sinRaya: true }); g.texto(x + 3, y + 10, t.toUpperCase(), { tam: 2.2, negrita: true, color: T.acento }); g.texto(x + 3, y + 4.2, cabe(v, 3.2, w - 6), { tam: 3.2, negrita: true, color: T.texto }); };
  const tituloSeccion = (g, x, y, t) => { g.rect(x, y - 0.6, 1.4, 4.4, { fondo: T.acento, sinRaya: true }); g.texto(x + 3.4, y, t, { tam: 3.4, negrita: true, color: T.texto }); };
  const indice = [['La prenda', 'fotos, datos y plano'], ['Medidas y materiales', 'de ' + Gd.tallas[0].t + ' a ' + Gd.tallas[Gd.tallas.length - 1].t]].concat(est.length ? [['Estampados', 'tamaño y colocación']] : [], [['El patrón en mini', 'todas las piezas a escala'], ['Cómo se cose', manual.length + ' pasos']]);

  // ===== PORTADA =====
  { const g = hoja(null);
    g.rect(0, 105, W, H - 105, { fondo: T.oscuro, sinRaya: true }); g.rect(0, 103, W, 2.2, { fondo: T.acento, sinRaya: true });
    g.circulo(W - 30, H - 34, 46, { fondo: T.acero, sinRaya: true }); g.circulo(W - 18, H - 70, 9, { fondo: T.luz, sinRaya: true });
    g.texto(M, H - 20, cabe(marca.toUpperCase(), 6.5, 120), { tam: 6.5, negrita: true, color: T.claro }); g.texto(M, H - 27, T.lema, { tam: 3.2, color: T.luz });
    g.texto(M, H - 52, 'EXPORTACIÓN COMPLETA', { tam: 3.4, negrita: true, color: [0.75, 0.75, 0.78] });
    let y = H - 66; const L = renglones(nombre.toUpperCase(), 11, 100); L.slice(0, 3).forEach((l, i) => { g.texto(M, y, i === 2 && L.length > 3 ? cabe(l + ' …', 11, 100) : cabe(l, 11, 100), { tam: 11, negrita: true, color: T.claro }); y -= 12.5; });
    const sub = [o.coleccion ? 'Colección ' + o.coleccion : null, o.temporada || null, o.ref ? 'Ref. ' + o.ref : null].filter(Boolean).join(' · ') || D.t; y -= 1;
    renglones(sub, 3.4, 100).slice(0, 2).forEach(l => { g.texto(M, y, cabe(l, 3.4, 100), { tam: 3.4, color: [0.82, 0.82, 0.85] }); y -= 4.8; });
    if (o.descripcion && y > 182) { y -= 2; renglones(o.descripcion, 3, 100).slice(0, 2).forEach(l => { g.texto(M, y, cabe(l, 3, 100), { tam: 3, color: [0.68, 0.68, 0.72] }); y -= 4.4; }); }
    // el índice (en lo oscuro, abajo a la izquierda)
    let yi = 160; g.texto(M, yi + 9, 'DENTRO', { tam: 2.6, negrita: true, color: T.luz }); indice.forEach(([t, s], i) => { g.circulo(M + 3, yi + 1, 3, { fondo: T.acento, sinRaya: true }); g.texto(M + 3, yi, String(i + 2), { tam: 2.6, negrita: true, color: BLANCO, centro: true }); g.texto(M + 9, yi, t, { tam: 3.2, negrita: true, color: T.claro }); g.texto(M + 9 + anchoTexto(t, 3.2) + 2, yi, cabe(s, 2.5, 96 - anchoTexto(t, 3.2) - 11), { tam: 2.5, color: [0.62, 0.62, 0.66] }); yi -= 8.4; });
    // la foto del 3D en una tarjeta blanca que pisa la banda
    tarjeta(g, 120, 62, 78, 150, 6, { fondo: BLANCO, color: T.suave, ancho: 0.4 }); if (!imagen(g, (o.fotos || [])[0], 123, 65, 72, 144)) { g.circulo(159, 137, 16, { fondo: T.suave, sinRaya: true }); g.texto(159, 110, 'La foto del 3D sale', { tam: 2.8, gris: 0.45, centro: true }); g.texto(159, 106, 'al exportar desde CelebriDREW', { tam: 2.8, gris: 0.45, centro: true }); }
    // datos rápidos
    dato(g, M, 80, 'Talla', o.talla ? o.talla + (Gd.base && Gd.base !== o.talla ? ' (muestra ' + Gd.base + ')' : '') : Gd.base, 48); dato(g, M + 52, 80, 'Ajuste', o.ajuste || 'normal', 48);
    dato(g, M, 61, 'Tela', (o.tela && o.tela.t) || (prenda.tejido === 'punto' ? 'Punto' : 'Tejido plano'), 48); dato(g, M + 52, 61, 'Tallas', Gd.tallas[0].t + ' – ' + Gd.tallas[Gd.tallas.length - 1].t, 48);
    // el color de la prenda y la paleta
    g.texto(M, 50, 'COLOR', { tam: 2.4, negrita: true, color: T.acento }); g.circulo(M + 6, 40, 6, { fondo: /^#[0-9a-f]{6}$/i.test(color || '') ? hex(color) : [0.85, 0.82, 0.78], color: [0.8, 0.8, 0.82], ancho: 0.5 }); g.texto(M + 15, 39, cabe(nombreColor(color), 3.2, 86), { tam: 3.2, negrita: true, color: T.texto });
    if (T.paleta) { g.texto(M, 30, 'PALETA DE LA MARCA', { tam: 2.2, negrita: true, color: [0.5, 0.5, 0.52] }); T.paleta.forEach((c, i) => g.circulo(M + 4 + i * 9, 23, 3.6, { fondo: hex(c), color: [0.8, 0.8, 0.82], ancho: 0.3 })); }
    // su plano de referencia
    if (o.plano && o.plano.jpg) { tarjeta(g, 120, 14, 78, 42, 4, { fondo: BLANCO, color: T.suave, ancho: 0.4 }); imagen(g, o.plano, 123, 16, 72, 33); g.texto(123, 51.5, 'PLANO TÉCNICO', { tam: 2.3, negrita: true, color: T.acento }); }
    g.rect(0, 0, W, 8, { fondo: T.acento, sinRaya: true }); g.texto(M, 2.8, 'Patrón, medidas, materiales y montaje · ' + fecha, { tam: 2.6, color: BLANCO }); }

  // ===== LA PRENDA =====
  { const g = hoja('LA PRENDA', 'delante, detrás y cómo es'); const F = (o.fotos || []).filter(f => f && f.jpg).slice(0, 2);
    if (F.length) F.forEach((f, i) => { const w = F.length === 1 ? 124 : 60, x = M + i * 64; tarjeta(g, x, 150, w, 118, 5, { fondo: BLANCO, color: T.suave, ancho: 0.4 }); imagen(g, f, x + 2, 157, w - 4, 107); g.texto(x + w / 2, 152.5, f.t || (i ? 'Detrás' : 'Delante'), { tam: 2.8, negrita: true, color: T.acento, centro: true }); });
    else { tarjeta(g, M, 150, 124, 118, 5, { fondo: T.suave, sinRaya: true }); g.texto(M + 62, 210, 'Las fotos del 3D se añaden solas al exportar desde CelebriDREW', { tam: 2.8, gris: 0.45, centro: true }); }
    tarjeta(g, 142, 150, W - M - 142, 118, 5, { fondo: T.suave, sinRaya: true }); let y = 260; g.texto(146, y, 'DATOS', { tam: 3, negrita: true, color: T.acento }); y -= 7;
    const datos = [['Prenda', D.t], ['Talla de muestra', Gd.base], ['Tallas', Gd.tallas.map(t => t.t).join(' · ')], ['Tela', (o.tela && o.tela.t) || '—'], ['Color', nombreColor(color)], ['Ajuste', o.ajuste || 'normal'], ['Hecha sobre', o.cuerpo || null], ['Ref.', o.ref || null], ['Plano', o.planoRef ? String(o.planoRef).split(/[\\/]/).pop() : null]].filter(d => d[1]);
    datos.forEach(([t, v]) => { if (y < 160) return; g.texto(146, y, t, { tam: 2.3, gris: 0.45 }); y -= 3.6; renglones(String(v), 2.9, 46).slice(0, 2).forEach(l => { g.texto(146, y, cabe(l, 2.9, 46), { tam: 2.9, negrita: true, color: T.texto }); y -= 3.8; }); y -= 1.4; });
    tarjeta(g, M, 18, W - 2 * M, 124, 5, { fondo: BLANCO, color: T.suave, ancho: 0.4 }); const conPlano = !!(o.plano && o.plano.jpg);
    if (conPlano) { tituloSeccion(g, M + 5, 134, 'PLANO TÉCNICO (referencia)'); imagen(g, o.plano, M + 4, 60, W - 2 * M - 8, 70); }
    tituloSeccion(g, M + 5, conPlano ? 53 : 134, 'CÓMO ES'); const y0 = conPlano ? 46 : 127, col2 = det.length > 6 && conPlano, mitad = Math.ceil(det.length / 2);
    det.forEach((t, i) => { const dcha = col2 && i >= mitad, x = M + 7 + (dcha ? (W - 2 * M) / 2 : 0), yd = y0 - 5.2 * (dcha ? i - mitad : i); if (yd < 22) return; g.circulo(x, yd + 0.9, 0.9, { fondo: T.acento, sinRaya: true }); g.texto(x + 3, yd, cabe(t, 3, col2 ? 80 : 168), { tam: 3, color: T.texto }); }); }

  // ===== MEDIDAS POR TALLA Y MATERIALES (si no caben, siguen en otra hoja) =====
  { let g = hoja('MEDIDAS Y MATERIALES', 'graduadas de ' + Gd.tallas[0].t + ' a ' + Gd.tallas[Gd.tallas.length - 1].t + ' · en cm');
    const filas = D.medidas.filter(m => Gd.tallas[0].m[m.k] != null), cw0 = 70, cw = (W - 2 * M - cw0) / Gd.tallas.length, al = 7.4, cab = 7; let y = ARRIBA;
    const altoT = cab + al * filas.length; tarjeta(g, M, y - altoT - 3, W - 2 * M, altoT + 3, 3, { fondo: BLANCO, color: T.suave, ancho: 0.4 });
    g.rect(M, y - cab, W - 2 * M, cab, { fondo: T.oscuro, sinRaya: true }); g.texto(M + 3, y - cab + 2.3, 'MEDIDA DE LA PRENDA', { tam: 2.5, negrita: true, color: T.claro });
    Gd.tallas.forEach((t, j) => { const x = M + cw0 + j * cw; if (t.base) { g.rect(x, y - altoT, cw, altoT - cab, { fondo: mezcla(T.acento, 0.14), sinRaya: true }); g.rect(x, y - cab, cw, cab, { fondo: T.acento, sinRaya: true }); } g.texto(x + cw / 2, y - cab + 2.3, t.t, { tam: 2.9, negrita: true, color: t.base ? BLANCO : T.claro, centro: true }); });
    filas.forEach((m, i) => { const yy = y - cab - al * (i + 1), nom = String(m.t), par = nom.match(/^(.*?)\s*\((.*)\)\s*$/), n1 = par ? par[1] : nom, n2 = par ? par[2] : '';
      if (i % 2) g.rect(M, yy, cw0, al, { fondo: T.suave, sinRaya: true });
      g.texto(M + 3, yy + (n2 ? 4.1 : 2.6), cabe(n1, 2.5, cw0 - 5), { tam: 2.5, color: T.texto }); if (n2) g.texto(M + 3, yy + 1.2, cabe(n2, 1.8, cw0 - 5), { tam: 1.8, gris: 0.5 });
      Gd.tallas.forEach((t, j) => g.texto(M + cw0 + j * cw + cw / 2, yy + 2.6, cm(t.m[m.k]), { tam: 2.7, negrita: t.base, color: T.texto, centro: true })); });
    g.texto(M, y - altoT - 8, 'La columna en color es la talla de muestra (la prenda tal cual la has hecho); las demás se gradúan solas.', { tam: 2.3, gris: 0.45 });
    y = y - altoT - 17; tituloSeccion(g, M, y, 'MATERIALES Y AVÍOS'); y -= 5;
    const aw = (W - 2 * M - 3) / 2, ah = 11, paso = 12.6; let col = 0;
    mats.forEach(m2 => { if (y - ah < 16) { g = hoja('MATERIALES Y AVÍOS', 'sigue'); y = ARRIBA; col = 0; }
      const x = M + col * (aw + 3); tarjeta(g, x, y - ah, aw, ah, 3, { fondo: T.suave, sinRaya: true }); g.circulo(x + 5, y - ah / 2, 2.2, { fondo: m2.g === 'Tela' ? T.acento : m2.g === 'Avío' || m2.g === 'Cierre' ? T.luz : T.acero, sinRaya: true });
      const cant = cabe(String(m2.cant), 2.5, aw * 0.42), wc = anchoTexto(cant, 2.5); g.texto(x + aw - 3 - wc, y - 4.3, cant, { tam: 2.5, negrita: true, color: T.texto });
      g.texto(x + 10, y - 4.3, cabe(m2.d, 2.8, aw - 16 - wc), { tam: 2.8, negrita: true, color: T.texto }); g.texto(x + 10, y - 8.4, cabe([m2.mat, m2.donde].filter(Boolean).join(' · '), 2.1, aw - 13), { tam: 2.1, gris: 0.42 });
      if (col) { col = 0; y -= paso; } else col = 1; }); }

  // ===== ESTAMPADOS: las tarjetas y dónde va cada uno, a escala sobre su pieza =====
  if (est.length) { const g = hoja('ESTAMPADOS', 'medidas y colocación'); const y = ARRIBA, cw = (W - 2 * M - 4) / 2, ch = 44;
    est.slice(0, 4).forEach((E, i) => { const x = M + (i % 2) * (cw + 4), yy = y - Math.floor(i / 2) * (ch + 4); tarjeta(g, x, yy - ch, cw, ch, 4, { fondo: T.suave, sinRaya: true }); tarjeta(g, x + 3, yy - ch + 3, 36, ch - 6, 3, { fondo: [0.2, 0.2, 0.22], sinRaya: true });
      if (E.jpg) imagen(g, { jpg: E.jpg, w: E.pw, h: E.ph }, x + 5, yy - ch + 5, 32, ch - 10); else g.texto(x + 21, yy - ch / 2, 'sin imagen', { tam: 2.4, gris: 0.7, centro: true });
      const tx = x + 43, an = cw - 46; g.circulo(tx + 2.2, yy - 6.4, 2.2, { fondo: T.acento, sinRaya: true }); g.texto(tx + 2.2, yy - 7.3, String(i + 1), { tam: 2.6, negrita: true, color: BLANCO, centro: true });
      g.texto(tx + 6, yy - 7.4, cabe(E.nombre || 'Estampado', 3.4, an - 6), { tam: 3.4, negrita: true, color: T.texto });
      [['Tamaño', cm(E.w) + ' × ' + cm(E.h) + ' cm'], ['Pieza', E.pieza], ['Altura', E.yc != null ? 'centro a ' + cm(E.yc) + ' cm del hombro' : 'ver el patrón'], ['Lado', ladoDe(E)]].reduce((y1, [t, v]) => { g.texto(tx, y1, t.toUpperCase(), { tam: 1.9, negrita: true, color: T.acento }); const Lv = renglones(String(v), 2.7, an).slice(0, 2); Lv.forEach((l, q) => g.texto(tx, y1 - 3.3 - q * 3.2, cabe(l, 2.7, an), { tam: 2.7, color: T.texto })); return y1 - 6.6 - (Lv.length - 1) * 3.2; }, yy - 13.6); });
    // la colocación: cada pieza que lleva estampado, entera, con sus estampados encima (a escala)
    const filasE = Math.ceil(Math.min(4, est.length) / 2), yTop = y - filasE * (ch + 4) - 6, nombres = [...new Set(est.map(E => E.pieza))].filter(n => piezaPorNombre(prenda, n)).slice(0, 3);
    if (nombres.length) { tituloSeccion(g, M, yTop, 'DÓNDE VA (a escala, como en el patrón)'); const altoD = yTop - 8 - 20, anD = (W - 2 * M - 6 * (nombres.length - 1)) / nombres.length;
      nombres.forEach((n, i) => { const pz = piezaPorNombre(prenda, n), Cs = piezaEntera(pz), b = G.caja([].concat(...Cs)), hps = pz.puntos.hps ? pz.puntos.hps.y : b.y1, x0 = M + i * (anD + 6), s = Math.min((anD - 10) / b.w, (altoD - 14) / b.h);
        tarjeta(g, x0, 20, anD, altoD, 4, { fondo: BLANCO, color: T.suave, ancho: 0.4 }); g.texto(x0 + anD / 2, 20 + altoD - 6, cabe(n.toUpperCase(), 2.8, anD - 6), { tam: 2.8, negrita: true, color: T.acento, centro: true });
        const ox = x0 + anD / 2 - (b.x0 + b.w / 2) * s, oy = 24 + (altoD - 14 - b.h * s) / 2 - b.y0 * s, tx = p => [ox + p[0] * s, oy + p[1] * s];
        Cs.forEach(C => g.poli(C.map(tx), { fondo: /^#[0-9a-f]{6}$/i.test(color || '') ? mezcla(hex(color), 0.22) : T.suave, color: T.texto, ancho: 0.3 }));
        est.forEach((E, j) => { if (E.pieza !== n || j > 3) return; const cy = E.yc != null ? hps - E.yc : (E.y || b.y0 + b.h / 2), p0 = tx([(E.x || 0) - E.w / 2, cy - E.h / 2]), w = E.w * s, h = E.h * s;
          if (E.jpg) g.recorta(p0[0], p0[1], w, h, () => imagen(g, { jpg: E.jpg, w: E.pw, h: E.ph }, p0[0], p0[1], w, h)); g.rect(p0[0], p0[1], w, h, { color: T.acento, ancho: 0.35, trazos: [1, 0.7] });
          g.circulo(p0[0] + w, p0[1] + h, 2, { fondo: T.acento, sinRaya: true }); g.texto(p0[0] + w, p0[1] + h - 0.8, String(j + 1), { tam: 2.2, negrita: true, color: BLANCO, centro: true }); }); });
      g.texto(M, 17.0, 'Cada estampado se coloca midiendo desde el punto más alto del hombro hasta su centro; los números son los de arriba.', { tam: 2.3, gris: 0.45 }); g.texto(M, 14.0, 'Delante, visto de frente: lo que queda a TU derecha es el lado IZQUIERDO de quien la lleva (ahí va el logo de pecho).', { tam: 2.3, gris: 0.45 }); } }

  // ===== EL PATRÓN EN MINI =====
  { const ancho = W - 2 * M - 8, alto = ARRIBA - 4 - 34, L = colocaPiezas(prenda.piezas, ancho, alto), g = hoja('EL PATRÓN EN MINI', 'escala 1:' + L.N + ' · ' + prenda.piezas.length + ' piezas');
    tarjeta(g, M, 18, W - 2 * M, ARRIBA - 18, 5, { fondo: BLANCO, color: T.suave, ancho: 0.4 }); const x0 = M + 4, yTop = ARRIBA - 4;
    L.pos.forEach(({ c, x, y }) => { const pz = c.pz, s = L.s, tx = p => [x0 + x + (p[0] - c.b.x0) * s, yTop - y - 9 - (c.b.y1 - p[1]) * s];
      g.poli(c.C.map(tx), { fondo: T.suave, color: T.texto, ancho: 0.25 }); g.poli(Z.contorno(pz).map(tx), { color: T.acento, ancho: 0.2, trazos: [0.8, 0.6] });
      if (c.d.doblez) { const a = tx(c.d.doblez[0]), b = tx(c.d.doblez[1]); g.linea(a[0], a[1], b[0], b[1], { color: T.luz, ancho: 0.8 }); }
      if (c.d.hilo && c.d.hilo.length > 1) { const a = tx(c.d.hilo[0]), b = tx(c.d.hilo[c.d.hilo.length - 1]); g.linea(a[0], a[1], b[0], b[1], { gris: 0.35, ancho: 0.2 }); }
      const n = (pz.corte && pz.corte.n) || 1, dob = pz.corte && pz.corte.doblez, wTxt = Math.max(c.b.w * s, 34);
      g.texto(x0 + x, yTop - y - 3, cabe(pz.nombre, 2.4, wTxt), { tam: 2.4, negrita: true, color: T.texto });
      g.texto(x0 + x, yTop - y - 6.4, cabe('Cortar ' + (dob ? '1 al doblez' : '×' + n) + ' · ' + cm(c.b.w) + ' × ' + cm(c.b.h) + ' cm', 2, wTxt + 4), { tam: 2, gris: 0.4 }); });
    // la leyenda y la regla de 10 cm a esa escala
    const yL = 32; g.linea(M + 6, yL, M + 14, yL, { gris: 0, ancho: 0.4 }); g.texto(M + 16, yL - 0.8, 'corte', { tam: 2.3, gris: 0.35 }); g.linea(M + 30, yL, M + 38, yL, { color: T.acento, ancho: 0.3, trazos: [0.8, 0.6] }); g.texto(M + 40, yL - 0.8, 'costura', { tam: 2.3, gris: 0.35 });
    g.linea(M + 58, yL, M + 66, yL, { color: T.luz, ancho: 0.9 }); g.texto(M + 68, yL - 0.8, 'doblez de la tela', { tam: 2.3, gris: 0.35 }); g.linea(M + 96, yL, M + 104, yL, { gris: 0.35, ancho: 0.25 }); g.texto(M + 106, yL - 0.8, 'hilo (al largo de la tela)', { tam: 2.3, gris: 0.35 });
    const r = 100 * L.s; g.rect(M + 6, 23, r, 2.2, { fondo: T.oscuro, sinRaya: true }); for (let i = 0; i <= 10; i++) g.linea(M + 6 + i * r / 10, 25.2, M + 6 + i * r / 10, i % 5 ? 26.4 : 27.4, { ancho: 0.2, color: T.oscuro });
    g.texto(M + 6 + r + 3, 23.4, cabe('10 cm a escala 1:' + L.N + ' · el patrón a tamaño real va en «PDF para imprimir»', 2.4, W - 2 * M - r - 14), { tam: 2.4, gris: 0.4 }); }

  // ===== CÓMO SE COSE (2 × 4 por hoja; cada paso con el dibujo de sus piezas y la costura marcada) =====
  const subM = o.manual && o.manual.length ? (o.manualIA ? 'manual escrito con la IA de tu PC (revisado)' : 'manual') : 'paso a paso, del montaje del patrón';
  for (let i0 = 0; i0 < Math.max(1, manual.length); i0 += 8) { const g = hoja('CÓMO SE COSE', subM);
    manual.slice(i0, i0 + 8).forEach((p, j) => { const n = i0 + j + 1, cw = (W - 2 * M - 4) / 2, x = M + (j % 2) * (cw + 4), y = ARRIBA - Math.floor(j / 2) * 61, ch = 57;
      tarjeta(g, x, y - ch, cw, ch, 5, { fondo: T.suave, sinRaya: true }); g.circulo(x + 8, y - 8, 4.6, { fondo: T.acento, sinRaya: true }); g.texto(x + 8, y - 9.4, String(n), { tam: 3.8, negrita: true, color: BLANCO, centro: true });
      // el dibujo (si se sabe qué piezas son): a la derecha, las piezas pequeñitas con la costura en color
      const bordes = (p.bordes || []).map(([pn, bid]) => ({ pz: piezaPorNombre(prenda, pn), bid })).filter(q => q.pz), dib = bordes.length ? 30 : 0;
      if (dib) { const pzs = [...new Set(bordes.map(q => q.pz))].slice(0, 2), bx = x + cw - dib - 3, by = y - ch + 4, bw = dib, bh = ch - 8; tarjeta(g, bx, by, bw, bh, 3, { fondo: BLANCO, sinRaya: true });
        pzs.forEach((pz, q) => { const C = Z.contorno(pz), b = G.caja(C), hh = (bh - 4) / pzs.length, s = Math.min((bw - 4) / b.w, (hh - 3) / b.h), ox = bx + bw / 2 - (b.x0 + b.w / 2) * s, oy = by + bh - 2 - hh * (q + 1) + (hh - b.h * s) / 2 - b.y0 * s, tx = pt => [ox + pt[0] * s, oy + pt[1] * s];
          g.poli(C.map(tx), { fondo: T.suave, color: [0.45, 0.45, 0.48], ancho: 0.2 }); bordes.filter(r => r.pz === pz).forEach(r => { const Lb = Z.bordePolilinea(pz, r.bid); if (Lb.length > 1) g.poli(Lb.map(tx), { color: T.acento, ancho: 0.9, cerrado: false }); }); }); }
      const anT = cw - 8 - (dib ? dib + 3 : 0); let yy = y - 9.4;
      if (p.titulo) { renglones(p.titulo, 3.3, anT - 10).slice(0, 2).forEach(l => { g.texto(x + 15, yy, cabe(l, 3.3, anT - 10), { tam: 3.3, negrita: true, color: T.texto }); yy -= 4.3; }); yy = Math.min(yy, y - 17.5); } else yy = y - 17.5;
      const Lx = renglones(p.texto || '', 2.7, anT), maxL = Math.floor((yy - (y - ch + 3)) / 3.6) + 1; Lx.slice(0, maxL).forEach((l, q) => { g.texto(x + 5, yy, q === maxL - 1 && Lx.length > maxL ? cabe(l + ' …', 2.7, anT) : l, { tam: 2.7, color: T.texto }); yy -= 3.6; }); });
    if (!manual.length) g.texto(M, 250, 'Esta prenda no tiene pasos de montaje.', { tam: 3 }); }

  // el pie de cada hoja (menos la portada), ya con el total
  const total = hojas.length; hojas.forEach(({ g }, i) => { if (!i) return; g.linea(M, 12, W - M, 12, { ancho: 0.25, color: T.suave });
    g.texto(M, 7, cabe(marca + ' · ' + (o.ref ? 'Ref. ' + o.ref + ' · ' : '') + 'exportación completa hecha con CelebriDREW · ' + fecha, 2.4, W - 2 * M - 30), { tam: 2.4, gris: 0.5 });
    g.circulo(W - M - 4, 8, 4, { fondo: T.acento, sinRaya: true }); g.texto(W - M - 4, 7, String(i + 1), { tam: 3, negrita: true, color: BLANCO, centro: true }); g.texto(W - M - 10 - anchoTexto('de ' + total, 2.4), 7, 'de ' + total, { tam: 2.4, gris: 0.5 }); });
  return { bytes: doc.bytes(), paginas: total };
}
