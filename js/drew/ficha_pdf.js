// ================= 👗 CelebriDREW · FICHA TÉCNICA PARA FÁBRICA (tech pack) en PDF (17-10-2026) =================
// Ella compró unas plantillas de «tech pack» (carpeta NOORKO1/TECHPACKS: sudadera, camiseta, pantalón…, 12 hojas: portada, dibujos, avíos y
// detalles, lista de materiales, estampados, colores, tabla de medidas por talla, etiquetas, etiqueta colgante y embalaje). CelebriDREW ya sabe
// casi todo eso de cada prenda, así que la RELLENA sola con la misma estructura (en español), sin inventar: lo que no puede saber (proveedor,
// fábrica, Pantone exacto) va en blanco o «por confirmar».
//   pdfFicha(prenda, o) → { bytes, paginas, tallas }   o = { nombre, marca, ref, coleccion, temporada, disenadora, fabrica, sexo, talla (base),
//     ajuste, opciones, tela: { t, color }, fotos: [{ jpg, w, h, t }], estampados: [{ jpg?, pw?, ph?, nombre, pieza, w, h, x, yc }], tipos }
import * as G from './geom.js';
import * as Z from './pieza.js';
import * as EX from './exporta.js';
import { nuevoPDF, anchoTexto, renglones } from './pdf.js';
import { pasos, TIPOS, tipoDe } from './montaje.js';
import { consumoTela } from './pdf_montaje.js';
import { BLOQUES } from './bloques/index.js';
import { TABLAS, medidasPrenda } from './tallas.js';
import { desdeTabla, cuerpoParaPrenda } from './avatar.js';

const W = 297, H = 210, M = 10, TINTA = [0.10, 0.09, 0.12], GRIS = [0.45, 0.43, 0.48], BORDE = [0.78, 0.76, 0.80], FONDO = [0.95, 0.94, 0.92], MARCA = [0.70, 0.18, 0.36];
const cm = (mm, d = 1) => G.cm(mm, d);
const RIB = /^(Puño|Cintura|Tira del cuello|Cuello alto)/;

// ---------- la GRADUACIÓN: las medidas de la prenda en cada talla de la tabla ----------
// Se gradúa por DIFERENCIA: a lo que mide la prenda ahora (su talla base) se le suma lo que cambia la prenda de esa plantilla, con la misma
// holgura, del cuerpo de la talla base al de cada talla (tallas.js). Así una prenda copiada de una foto o retocada a mano gradúa igual.
export function gradua(prenda, o = {}) {
  const k = prenda.bloque.k, sexo = o.sexo === 'hombre' ? 'hombre' : 'mujer', L = TABLAS[sexo].tallas, cur = prenda.bloque.medidas, op = { ajuste: o.ajuste || 'normal', manga: (o.opciones || {}).mangaTipo, escote: (o.opciones || {}).escote };
  const deT = T => { try { return medidasPrenda(k, cuerpoParaPrenda(desdeTabla(sexo, T.v)), op); } catch (e) { return null; } };
  const base = L.find(t => t.t === o.talla) || L.reduce((a, t) => (Math.abs(t.v.pecho - (o.pechoCuerpo || 0)) < Math.abs(a.v.pecho - (o.pechoCuerpo || 0)) ? t : a), L[2]), GB = deT(base) || {};
  const tallas = L.map(T => { const GT = deT(T) || {}, m = {}; Object.entries(cur).forEach(([kk, v]) => { m[kk] = GT[kk] != null && GB[kk] != null ? Math.round(v + GT[kk] - GB[kk]) : v; }); return { t: T.t, m, base: T === base }; });
  return { base: base.t, tallas };
}
const tolerancia = mm => (mm >= 400 ? 10 : mm >= 150 ? 7 : 5);

// ---------- los AVÍOS y la LISTA DE MATERIALES, de la prenda y sus opciones ----------
export function materiales(prenda, o = {}) {
  const k = prenda.bloque.k, O = Object.assign({}, prenda.bloque.opciones, o.opciones || {}), P = prenda.piezas, pz = n => P.find(p => p.nombre.startsWith(n)), sub = f => ({ piezas: P.filter(f), bloque: prenda.bloque });
  const ppal = consumoTela(sub(p => !RIB.test(p.nombre)), 1500), rib = P.some(p => RIB.test(p.nombre)) ? consumoTela(sub(p => RIB.test(p.nombre)), 1000) : null, out = [];
  out.push({ g: 'Tela', d: 'Tela principal', mat: (o.tela && o.tela.t) || (prenda.tejido === 'punto' ? 'Punto' : 'Tejido plano'), cant: String(ppal.m.toFixed(2)).replace('.', ',') + ' m (ancho 150 cm, +15 %)', donde: 'Cuerpo' + (pz('Manga') ? ', mangas' : '') + (pz('Capucha') ? ', capucha' : '') + (pz('Bolsillo') ? ', bolsillo' : '') });
  if (rib) out.push({ g: 'Tela', d: 'Canalé (rib) elástico', mat: 'Punto canalé 1×1 o 2×2 (con elastano)', cant: String(rib.m.toFixed(2)).replace('.', ',') + ' m (ancho 100 cm, +15 %)', donde: P.filter(p => RIB.test(p.nombre)).map(p => p.nombre.toLowerCase()).join(', ') });
  const del = pz('Delantero'), cc = del && del.puntos && del.puntos.cc, cuelloA = pz('Cuello alto');
  if (O.cierre === 'cremallera' && cc) { const L = cc.y + (cuelloA ? Z.caja(cuelloA).y1 / 2 : 0) + (pz('Cintura') ? Z.caja(pz('Cintura')).y1 / 2 : 0), std = [40, 45, 50, 55, 60, 65, 70, 75, 80].find(v => v * 10 >= L - 5) || Math.ceil(L / 50) * 5;
    out.push({ g: 'Avío', d: 'Cremallera separable', mat: 'Espiral nº 5, tirador metálico', cant: '1 de ' + std + ' cm (abre del todo)', donde: 'Centro delantero, del bajo al ' + (cuelloA ? 'canto del cuello' : 'escote') }); }
  if (O.cierre === 'media') out.push({ g: 'Avío', d: 'Cremallera de media apertura', mat: 'Espiral nº 5, cerrada abajo', cant: '1 de 22 cm', donde: 'Centro delantero, desde el ' + (cuelloA ? 'canto del cuello' : 'escote') });
  if (k === 'falda') out.push({ g: 'Avío', d: 'Cremallera invisible', mat: 'Invisible nº 3', cant: '1 de 20 cm', donde: 'Centro espalda' }, { g: 'Avío', d: 'Botón', mat: '15 mm', cant: '1', donde: 'Cinturilla' });
  if (k === 'pantalon') out.push({ g: 'Avío', d: 'Cremallera de bragueta', mat: 'Metálica nº 4', cant: '1 de 18 cm', donde: 'Bragueta' }, { g: 'Avío', d: 'Botón', mat: '17 mm', cant: '1', donde: 'Cinturilla' });
  if (k === 'vestido') out.push({ g: 'Avío', d: 'Cremallera invisible', mat: 'Invisible nº 3', cant: '1 de 55 cm', donde: 'Centro espalda' });
  const cap = pz('Capucha'); if (cap) { const B = Z.bordePorId(cap, 'cara'), Lc = B ? G.polilineaLargo(Z.bordePolilinea(cap, 'cara')) : 300; out.push({ g: 'Avío', d: 'Cordón de la capucha', mat: 'Cordón plano o redondo, puntas rematadas', cant: '1 de ' + Math.round((2 * Lc + 400) / 10) + ' cm + 2 ojetes metálicos', donde: 'Jareta del canto de la cara' }); }
  if (O.bajo === 'cordon' && del) { const Wb = (G.polilineaLargo(Z.bordePolilinea(del, 'bajo')) * 2 + G.polilineaLargo(Z.bordePolilinea(pz('Espalda'), 'bajo')) * 2); out.push({ g: 'Avío', d: 'Cordón del bajo', mat: 'Cordón redondo + 2 topes', cant: '1 de ' + Math.round((Wb + 400) / 10) + ' cm', donde: 'Jareta del bajo, ojales en el delantero' }); }
  out.push({ g: 'Hilo', d: 'Hilo', mat: 'Poliéster a juego' + (prenda.tejido === 'punto' ? ' (4 conos, remalladora)' : ''), cant: 'según producción', donde: 'Todas las costuras' });
  out.push({ g: 'Etiqueta', d: 'Etiqueta de marca', mat: 'Tejida', cant: '1', donde: 'Centro espalda, bajo el cuello' }, { g: 'Etiqueta', d: 'Etiqueta de talla', mat: 'Tejida o estampada', cant: '1', donde: 'Junto a la de marca' }, { g: 'Etiqueta', d: 'Composición y cuidados', mat: 'Satén impreso', cant: '1', donde: 'Costado izquierdo, a 10 cm del bajo' });
  (o.estampados || []).forEach((E, i) => out.push({ g: 'Estampado', d: E.nombre || 'Estampado ' + (i + 1), mat: 'Serigrafía o vinilo textil (DTF)', cant: cm(E.w) + ' × ' + cm(E.h) + ' cm', donde: E.pieza + (E.yc != null ? ', centro a ' + cm(E.yc) + ' cm bajo el cuello' : '') }));
  return out;
}
// lo que tiene la prenda, en palabras (de sus opciones)
export function detalles(prenda, o = {}) { const D = BLOQUES[prenda.bloque.k], O = Object.assign({}, prenda.bloque.opciones, o.opciones || {}); return (D.opciones || []).map(op => { const v = (op.ops.find(x => x[0] === O[op.k]) || [])[1]; return v ? op.t + ': ' + v : null; }).filter(Boolean); }
const CUIDADOS = { punto: 'Lavar a 30 °C del revés · No usar lejía · No secadora · Planchar a temperatura baja (sin planchar el estampado) · No limpiar en seco', plano: 'Lavar a 30 °C · No usar lejía · Secar colgado · Planchar a temperatura media · Se puede limpiar en seco' };

// ---------- el PDF ----------
export function pdfFicha(prenda, o = {}) {
  const k = prenda.bloque.k, D = BLOQUES[k], doc = nuevoPDF({ titulo: (o.nombre || 'Prenda') + ' · ficha técnica', escala: false }), Gd = gradua(prenda, o), mats = materiales(prenda, o), L = pasos(prenda, o.tipos);
  // (las páginas del montaje se cuentan antes, con el mismo reparto, para poner «página N de M»)
  const anchoM = (W - 2 * M - 8) / 2, textoP = p => String(p.texto || '').replace(/\s+/g, ' '), altoP = p => 7 + renglones(textoP(p), 2.5, anchoM).length * 3.2;
  let pm = 1; { let y = 180, col = 0; L.forEach(p => { const a = altoP(p); if (y - a < 14) { if (col === 0) { col = 1; y = 180; } else { pm++; y = 180; col = 0; } } y -= a; }); }
  const total = 6 + pm; let nPag = 0;
  const datos = [['Fecha', new Date().toLocaleDateString('es-ES')], ['Tallas', Gd.tallas[0].t + ' – ' + Gd.tallas[Gd.tallas.length - 1].t], ['Ref.', o.ref || '—'], ['Tela', (o.tela && o.tela.t) || '—'],
    ['Temporada', o.temporada || '—'], ['Nombre', o.nombre || D.t], ['Talla de muestra', Gd.base], ['Descripción', D.t], ['Diseño', o.disenadora || o.marca || '—'], ['Fábrica', o.fabrica || '(por completar)'], ['Color', (o.tela && o.tela.color && o.tela.color !== 'natural') ? o.tela.color.toUpperCase() : 'el de la tela']];
  const cab = (g, titulo) => { nPag++;
    g.rect(0, H - 22, W, 22, { fondo: FONDO, sinRaya: true }); g.texto(M, H - 10, (o.marca || 'CelebriDiseños').toUpperCase(), { tam: 6, negrita: true, color: TINTA }); g.texto(M, H - 17, titulo, { tam: 4.2, negrita: true, color: MARCA });
    const x0 = 152, cw = (W - M - x0) / 3; datos.forEach(([t, v], i) => { const c = i % 3, f = Math.floor(i / 3), x = x0 + c * cw, y = H - 5.5 - f * 4.6, xv = x + anchoTexto(t + ': ', 2.3) + 0.6, s = String(v), maxc = Math.floor((x + cw - 2 - xv) / 1.25); g.texto(x, y, t + ':', { tam: 2.3, gris: 0.45 }); g.texto(xv, y, s.length > maxc ? s.slice(0, maxc - 1) + '…' : s, { tam: 2.4, negrita: true }); }); /* (3 columnas a la derecha: el título de la hoja no las pisa) */
    g.linea(M, 9, W - M, 9, { ancho: 0.2, color: BORDE }); g.texto(M, 5, 'Ficha técnica hecha con CelebriDREW a partir del patrón validado. Lo marcado «por completar» lo rellena la marca.', { tam: 2.3, gris: 0.5 }); g.texto(W - M - 20, 5, 'Página ' + nPag + ' de ' + total, { tam: 2.6, gris: 0.4 }); };
  const caja = (g, x, y, w, h, t) => { g.rect(x, y - h, w, h, { ancho: 0.3, color: BORDE }); if (t) { g.rect(x, y - 6, w, 6, { fondo: [0.92, 0.90, 0.94], sinRaya: true }); g.texto(x + 2.5, y - 4.2, t, { tam: 3, negrita: true, color: TINTA }); } return y - 10; };
  const foto = (g, f, x, y, w, h) => { if (!f || !f.jpg) return; const r = f.w / f.h, hh = Math.min(h, w / r), ww = hh * r; g.imagen(f.jpg, f.w, f.h, x + (w - ww) / 2, y - h + (h - hh) / 2, ww, hh); };
  const tabla = (g, x, y, cols, filas, o2 = {}) => { const tam = o2.tam || 2.7, al = o2.alto || 5.2; let cx = x; cols.forEach(([t, w]) => { g.rect(cx, y - al, w, al, { fondo: [0.92, 0.90, 0.94], color: BORDE, ancho: 0.2 }); g.texto(cx + 1.5, y - al + 1.6, t, { tam, negrita: true }); cx += w; });
    filas.forEach((F, i) => { let x2 = x; const yy = y - al * (i + 2); F.forEach((v, j) => { const w = cols[j][1]; g.rect(x2, yy, w, al, { color: BORDE, ancho: 0.2, fondo: i % 2 ? [1, 1, 1] : [0.985, 0.98, 0.975] }); const s = String(v), maxc = Math.floor(w / (tam * 0.52)); g.texto(x2 + 1.5, yy + 1.6, s.length > maxc ? s.slice(0, maxc - 1) + '…' : s, { tam, negrita: !!(o2.negrita && o2.negrita[j]) }); x2 += w; }); });
    return y - al * (filas.length + 1); };
  const pieza = (g, pz, x, y, w, h) => { const d = EX.dibujo(pz), C = d.corte.length ? d.corte : Z.contorno(pz), bb = G.caja(C), s = Math.min(w / bb.w, h / bb.h), tx = p => [x + (w - bb.w * s) / 2 + (p[0] - bb.x0) * s, y - h + (h - bb.h * s) / 2 + (p[1] - bb.y0) * s];
    g.poli(C.map(tx), { ancho: 0.3, color: TINTA }); g.poli(Z.contorno(pz).map(tx), { ancho: 0.2, color: GRIS, trazos: [1, 0.8] }); g.texto(x + w / 2, y - h - 3, pz.nombre, { tam: 2.4, centro: true }); };

  // 1 · PORTADA
  { const g = doc.pagina(W, H); cab(g, 'PORTADA'); g.texto(M, 150, 'FICHA TÉCNICA', { tam: 14, negrita: true, color: TINTA }); g.texto(M, 140, 'TECH PACK', { tam: 6, negrita: true, color: MARCA });
    g.texto(M, 124, (o.nombre || D.t).toUpperCase(), { tam: 7, negrita: true }); g.texto(M, 116, 'Colección: ' + (o.coleccion || '(por completar)'), { tam: 3.6 }); g.texto(M, 110, 'Referencia: ' + (o.ref || '(por completar)'), { tam: 3.6 });
    g.texto(M, 104, 'Talla de muestra: ' + Gd.base + ' · tallas ' + Gd.tallas.map(t => t.t).join(', '), { tam: 3.6 }); detalles(prenda, o).forEach((t, i) => g.texto(M, 94 - i * 5.2, '· ' + t, { tam: 3.2 }));
    caja(g, 160, 182, 127, 168, null); foto(g, (o.fotos || [])[0], 162, 180, 123, 164); }
  // 2 · VISTAS Y PIEZAS
  { const g = doc.pagina(W, H); cab(g, 'VISTAS Y PIEZAS (dibujo técnico)'); const fotos = (o.fotos || []).slice(0, 2);
    let y = caja(g, M, 182, 130, 168, 'DELANTE Y DETRÁS (prenda simulada en 3D)'); if (!fotos.length) g.parrafo(M + 4, y - 4, 'Las fotos del 3D se añaden solas al sacar la ficha desde CelebriDREW (Exportar).', { tam: 3, ancho: 120, gris: 0.45 }); fotos.forEach((f, i) => { foto(g, f, M + 3 + i * 63, y, 61, 150); if (f.t) g.texto(M + 33 + i * 63, 18, f.t, { tam: 2.8, centro: true, negrita: true }); });
    y = caja(g, M + 136, 182, W - 2 * M - 136, 168, 'PIEZAS DEL PATRÓN (' + prenda.piezas.length + ')'); const n = prenda.piezas.length, cols = n > 6 ? 4 : 3, filas = Math.ceil(n / cols), cw = (W - 2 * M - 142) / cols, ch = 150 / filas;
    prenda.piezas.forEach((pz, i) => pieza(g, pz, M + 139 + (i % cols) * cw, y - Math.floor(i / cols) * ch, cw - 4, ch - 9)); }
  // 3 · AVÍOS, DETALLES Y LISTA DE MATERIALES
  { const g = doc.pagina(W, H); cab(g, 'AVÍOS, DETALLES Y LISTA DE MATERIALES (BOM)'); let y = caja(g, M, 182, 80, 60, 'DETALLES DE LA PRENDA');
    detalles(prenda, o).forEach((t, i) => g.texto(M + 3, y - i * 5, '· ' + t, { tam: 3 })); y = caja(g, M, 116, 80, 45, 'MUESTRA DE COLOR');
    const col = o.tela && /^#[0-9a-f]{6}$/i.test(o.tela.color || '') ? [1, 3, 5].map(i => parseInt(o.tela.color.slice(i, i + 2), 16) / 255) : [0.85, 0.83, 0.8]; g.rect(M + 3, y - 26, 30, 28, { fondo: col, color: BORDE });
    g.texto(M + 37, y - 2, (o.tela && o.tela.t) || 'Tela', { tam: 3.2, negrita: true }); g.texto(M + 37, y - 7, o.tela && o.tela.color && o.tela.color !== 'natural' ? 'HEX ' + o.tela.color.toUpperCase() : 'Color natural de la tela', { tam: 2.8 }); g.texto(M + 37, y - 12, 'Pantone: por confirmar', { tam: 2.8, gris: 0.45 });
    caja(g, M + 86, 182, W - 2 * M - 86, 168, 'LISTA DE MATERIALES'); tabla(g, M + 88, 170, [['Tipo', 15], ['Detalle', 33], ['Material', 47], ['Cantidad', 40], ['Colocación', 52]], mats.map(m => [m.g, m.d, m.mat, m.cant, m.donde]), { tam: 2.3, alto: 5.6 }); }
  // 4 · ESTAMPADOS Y COLORES
  { const g = doc.pagina(W, H); cab(g, 'ESTAMPADOS Y COLOCACIÓN'); const E = (o.estampados || []).slice(0, 4);
    if (!E.length) { caja(g, M, 182, W - 2 * M, 40, 'SIN ESTAMPADOS'); g.texto(M + 3, 160, 'Esta prenda no lleva estampados. (Se añaden en CelebriDREW → Tela → Estampados.)', { tam: 3.2 }); }
    E.forEach((e, i) => { const x = M + (i % 2) * 140, yT = 182 - Math.floor(i / 2) * 86; let y = caja(g, x, yT, 136, 82, (e.nombre || 'Estampado ' + (i + 1)).toUpperCase());
      g.rect(x + 3, y - 62, 62, 62, { fondo: [0.97, 0.96, 0.95], color: BORDE }); if (e.jpg) foto(g, { jpg: e.jpg, w: e.pw, h: e.ph }, x + 4, y - 1, 60, 60);
      [['Pieza', e.pieza], ['Ancho', cm(e.w) + ' cm'], ['Alto', cm(e.h) + ' cm'], ['Colocación', e.yc != null ? 'Centro a ' + cm(e.yc) + ' cm bajo el cuello en el hombro' : 'Ver el patrón'], ['Horizontal', Math.abs(e.x || 0) < 5 ? 'Centrado' : cm(Math.abs(e.x)) + ' cm a la ' + (e.x > 0 ? 'izquierda' : 'derecha') + ' del centro'], ['Técnica', 'Serigrafía o vinilo textil (DTF)']]
        .forEach(([t, v], j) => { g.texto(x + 69, y - 3 - j * 6.5, t + ':', { tam: 2.7, gris: 0.45 }); g.texto(x + 69, y - 6.3 - j * 6.5, v, { tam: 2.9, negrita: true }); }); }); }
  // 5 · TABLA DE MEDIDAS POR TALLA (graduada)
  { const g = doc.pagina(W, H); cab(g, 'TABLA DE MEDIDAS POR TALLA (prenda acabada, en cm)'); const filas = D.medidas.map((m, i) => [String.fromCharCode(65 + (i % 26)), m.t, '±' + cm(tolerancia(prenda.bloque.medidas[m.k] || 0))].concat(Gd.tallas.map(T => cm(T.m[m.k]))));
    const cols = [['', 7], ['Medida', 112], ['Tol.', 14]].concat(Gd.tallas.map(T => [T.t + (T.base ? ' (muestra)' : ''), (W - 2 * M - 133) / Gd.tallas.length])); const y = tabla(g, M, 182, cols, filas, { tam: 2.6, alto: 5.4 });
    g.parrafo(M, y - 6, 'Graduado desde la talla de muestra (' + Gd.base + ') con las diferencias entre los cuerpos de la tabla ' + TABLAS[o.sexo === 'hombre' ? 'hombre' : 'mujer'].t.toLowerCase() + ' y la misma holgura. Los contornos son la vuelta entera (plana: la mitad). Se mide con la prenda plana y sin estirar.', { tam: 2.6, ancho: W - 2 * M, interlinea: 3.4 }); }
  // 6 · MONTAJE
  { let g = doc.pagina(W, H); cab(g, 'MONTAJE (orden y tipo de costura)'); let y = 180, col = 0; const ancho = anchoM;
    L.forEach((p, i) => { const t = (i + 1) + '. ' + p.titulo, txt = textoP(p), alto = altoP(p); if (y - alto < 14) { if (col === 0) { col = 1; y = 180; } else { g = doc.pagina(W, H); cab(g, 'MONTAJE (sigue)'); y = 180; col = 0; } }
      const x = M + col * (ancho + 8); g.texto(x, y, t, { tam: 3, negrita: true, color: MARCA }); g.parrafo(x, y - 4, txt, { tam: 2.5, ancho, interlinea: 3.2 }); y -= alto; }); }
  // 7 · ETIQUETAS, CUIDADOS Y EMBALAJE
  { const g = doc.pagina(W, H); cab(g, 'ETIQUETAS, CUIDADOS Y EMBALAJE'); const tejido = prenda.tejido === 'punto' ? 'punto' : 'plano'; let y = caja(g, M, 182, 136, 70, 'ETIQUETA DE MARCA Y DE TALLA');
    g.rect(M + 6, y - 22, 54, 22, { fondo: [0.12, 0.11, 0.13], sinRaya: true }); g.texto(M + 33, y - 13, (o.marca || 'CelebriDiseños').toUpperCase(), { tam: 4.6, negrita: true, centro: true, gris: 1 }); g.rect(M + 66, y - 22, 22, 22, { color: TINTA }); g.texto(M + 77, y - 13, Gd.base, { tam: 6, negrita: true, centro: true });
    g.parrafo(M + 6, y - 30, 'Tejida, cosida en el centro de la espalda bajo el cuello (la de talla, junto a ella). Tamaño orientativo: 5 × 2 cm.', { tam: 2.7, ancho: 126, interlinea: 3.4 });
    y = caja(g, M, 106, 136, 92, 'COMPOSICIÓN Y CUIDADOS (propuesta: confírmala con la tela real)'); g.parrafo(M + 3, y, 'Composición: (por completar según la etiqueta del rollo de tela)', { tam: 3, ancho: 130 }); g.parrafo(M + 3, y - 8, CUIDADOS[tejido], { tam: 3, ancho: 130, interlinea: 4 });
    y = caja(g, M + 142, 182, W - 2 * M - 142, 168, 'ETIQUETA COLGANTE Y EMBALAJE'); [['Etiqueta colgante', 'Marca delante; detrás: nombre, referencia, talla, composición y precio. Cordel o pin en la etiqueta de marca.'], ['Doblado', 'Del revés no: estampado hacia fuera, mangas dobladas por detrás, capucha o cuello hacia arriba.'], ['Bolsa', 'Individual, transparente y reciclable, con el aviso de peligro de asfixia y la talla visible.'], ['Caja', 'Por tallas, con la referencia y el número de piezas por fuera.']]
      .forEach(([t, v], i) => { g.texto(M + 145, y - i * 20, t, { tam: 3.2, negrita: true, color: MARCA }); g.parrafo(M + 145, y - 5 - i * 20, v, { tam: 2.8, ancho: W - 2 * M - 152, interlinea: 3.6 }); }); }
  return { bytes: doc.bytes(), paginas: doc.paginas, tallas: Gd.tallas.map(t => t.t), base: Gd.base, materiales: mats.length };
}
