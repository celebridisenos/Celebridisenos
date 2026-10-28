// ================= 👗 CelebriDREW · LA PLANTILLA PDF «PATRÓN COMPLETO» (lista para imprimir y coser) =================
// Lo que pidió la dueña: «nuestra plantilla generativa PDF con todas las partes, número de página, pequeña instrucción, unión de piezas,
// lista para imprimir» (y la ficha de su foto como «lujo extra»). Todo sale del patrón validado, nada inventado:
//   1 · PORTADA: la prenda en 3D (delante y detrás), medidas de referencia (cuerpo y prenda), materiales con el consumo de tela
//       calculado, cómo imprimir (cuadrado de 5 cm y regla), los símbolos y el mapa de hojas.
//   2 · PIEZAS con sus medidas (ancho, alto y el largo de cada orilla que se cose) y cuántas se cortan.
//   3 · MONTAJE PASO A PASO (montaje.js): cada paso con su número, sus piezas dibujadas y las orillas que se cosen resaltadas.
//   4 · DETALLES: márgenes por orilla, tipo de cada costura y consejos de ajuste.
//   5… · EL PATRÓN a tamaño real en A4 (o en A0), cada hoja con su letra y número, «página N de M», rombos para casarlas y, junto a
//       cada orilla que se cose, el NÚMERO del paso y con qué pieza va (así se sabe qué se une con qué sin mirar el manual).
import * as G from './geom.js';
import * as Z from './pieza.js';
import * as EX from './exporta.js';
import { nuevoPDF, anchoTexto, renglones } from './pdf.js';
import { pasos, numerosPorOrilla, TIPOS, tipoDe } from './montaje.js';

const ROSA = [0.78, 0.16, 0.42], AZUL = [0.13, 0.38, 0.86], TINTA = [0.12, 0.10, 0.18], SUAVE = [0.96, 0.95, 0.93], BORDE = [0.82, 0.80, 0.86], VIOLETA = [0.42, 0.18, 0.80];
const cm = (mm, d = 1) => G.cm(mm, d);
const cortar = pz => (pz.corte.doblez ? 'Cortar ' + (pz.corte.n || 1) + ' al doblez' : pz.corte.espejo ? 'Cortar ' + (pz.corte.n || 2) + ' (una en espejo)' : 'Cortar ' + (pz.corte.n || 1));
const NOTAS = { camiseta: ['Hilo de poliéster a juego', 'Tira de canalé (rib) para el cuello, si no es de la misma tela'], sudadera: ['Hilo de poliéster a juego', 'Canalé (rib) para puños y cintura', 'Cordón para la capucha (opcional)'],
  falda: ['Cremallera invisible de 20 cm', '1 botón de 15 mm', 'Entretela fina para la cinturilla', 'Hilo a juego'], pantalon: ['Cremallera de 18 cm (bragueta)', '1 botón de 17 mm', 'Entretela fina para la cinturilla', 'Hilo a juego (y de pespunte, si es vaquero)'] };
const CONSEJOS = { camiseta: ['Si el pecho queda justo, sube el contorno de pecho 2–4 cm (y el del bajo).', 'Si la sisa tira, baja 1 cm la profundidad de sisa: la manga se recalcula sola.', 'En punto, cose con remalladora o con puntada elástica.'],
  sudadera: ['Si las mangas quedan largas, recórtalas en el patrón antes de cortar: el puño se recalcula.', 'La felpa encoge: lávala antes de cortar.'],
  falda: ['Si la cintura queda justa, súbela 1–2 cm (las pinzas se recalculan).', 'Si la cadera marca, dale 2 cm más de cadera.', 'Prueba primero en tela barata (toile).'],
  pantalon: ['Si el tiro tira, alarga el tiro 1 cm.', 'Si la rodilla marca, abre 2 cm la rodilla.', 'Prueba primero en tela barata (toile): el pantalón es la prenda que más ajuste pide.'] };

export function pdfMontaje(prenda, o = {}) {
  const k = (prenda.bloque && prenda.bloque.k) || '', L = pasos(prenda, o.tipos), num = numerosPorOrilla(prenda, L), doc = nuevoPDF({ titulo: (prenda.nombre || 'Patrón') + ' · patrón completo', escala: o.formato === 'a0' ? false : undefined }) /* (sin la corrección de SU impresora en A0: lo imprime la copistería) */;
  const W = 210, H = 297, M = 12;
  // ---------- el patrón en hojas (se calcula antes para saber cuántas páginas hay) ----------
  const a0 = o.formato === 'a0', hoja = a0 ? { w: 841, h: 1189 } : { w: 210, h: 297 }, mh = 10, sol = a0 ? 0 : 10, uw = hoja.w - 2 * mh, uh = hoja.h - 2 * mh - 6, pw = uw - sol, ph = uh - sol;
  const C = empaqueta(prenda, pw, ph, sol, a0 ? 40 : 18), cols = Math.max(1, Math.ceil((C.ancho - sol) / pw)), filas = Math.max(1, Math.ceil((C.alto - sol) / ph));
  // ---------- las páginas de antes del patrón ----------
  // las hojas que llevan algo (las vacías no se imprimen: el mapa de la portada las marca)
  const hojas = []; for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) { const ox = c * pw, oy = f * ph; if (C.items.some(it => it.x < ox + uw && it.x + it.w > ox && it.y < oy + uh && it.y + it.h > oy)) hojas.push([f, c]); }
  const paginasPiezas = Math.ceil(prenda.piezas.length / 6), pagsMontaje = maquetaMontaje(L, W - 2 * M), total = 1 + paginasPiezas + pagsMontaje.length + 1 + hojas.length;
  let nPag = 0;
  const pie = (g, w = W, h = H) => { nPag++; g.linea(M, 9, w - M, 9, { ancho: 0.2, color: BORDE }); g.texto(M, 5, (o.empresa || 'CelebriDiseños') + ' · CelebriDREW · ' + (prenda.nombre || 'Patrón') + (o.talla ? ' · Talla ' + o.talla : ''), { tam: 2.6, gris: 0.45 }); const t = 'Página ' + nPag + ' de ' + total; g.texto(w - M - anchoTexto(t, 2.6), 5, t, { tam: 2.6, gris: 0.45 }); };
  const titular = (g, y, t, sub) => { g.rect(M, y - 7.5, W - 2 * M, 9.5, { fondo: [0.93, 0.90, 0.98], sinRaya: true }); g.texto(M + 3, y - 4.2, t, { tam: 4.6, negrita: true, color: VIOLETA }); if (sub) g.texto(M + 3 + anchoTexto(t, 4.6) + 4, y - 4.2, sub, { tam: 3, gris: 0.35 }); return y - 14; };
  const caja = (g, x, y, w, h, t) => { g.rect(x, y - h, w, h, { ancho: 0.3, color: BORDE }); if (t) g.texto(x + 3, y - 5.5, t, { tam: 3.4, negrita: true, color: TINTA }); return y - 9; };

  // ===== 1 · PORTADA =====
  { const g = doc.pagina(W, H); let y = H - M;
    g.texto(M, y - 7, 'PATRÓN COMPLETO', { tam: 8.5, negrita: true, color: VIOLETA }); g.texto(M, y - 14.5, (prenda.nombre || 'Prenda').toUpperCase() + (o.talla ? ' · TALLA ' + o.talla : o.cuerpo ? ' · A MEDIDA' : ''), { tam: 5, negrita: true, color: TINTA });
    g.texto(M, y - 20, (o.empresa || 'CelebriDiseños') + ' · hecho con CelebriDREW · ' + new Date().toLocaleDateString('es-ES') + (prenda.validacion ? ' · ' + prenda.validacion : ''), { tam: 3, gris: 0.4 });
    y -= 26;
    // las fotos del 3D (delante y detrás)
    const fotos = (o.fotos || []).filter(f => f && f.jpg), fx = M, fw = 82, fh = 104;
    caja(g, fx, y, fw, fh, fotos.length ? 'VISTA FINAL (simulada en 3D)' : 'PIEZAS');
    if (fotos.length) { const an = (fw - 6) / fotos.length; fotos.forEach((f, i) => { const r = f.w / f.h, hh = fh - 14, ww = Math.min(an - 2, hh * r), h2 = ww / r; g.imagen(f.jpg, f.w, f.h, fx + 3 + i * an + (an - ww) / 2, y - 10 - h2, ww, h2); if (f.t) g.texto(fx + 3 + i * an + an / 2, y - fh + 2.5, f.t, { tam: 2.8, centro: true, gris: 0.4 }); }); }
    else miniaturas(g, prenda, fx + 3, y - fh + 3, fw - 6, fh - 13);
    // medidas
    const cx = M + fw + 6, cw = W - M - cx; let yy = caja(g, cx, y, cw, 62, 'MEDIDAS DE REFERENCIA');
    const filasMed = [];
    if (o.cuerpo) [['pecho', 'Pecho'], ['cintura', 'Cintura'], ['cadera', 'Cadera'], ['altura', 'Altura'], ['espalda', 'Talle de espalda'], ['entrepierna', 'Entrepierna']].forEach(([kk, t]) => { if (o.cuerpo[kk]) filasMed.push(['Cuerpo · ' + t, String(o.cuerpo[kk]).replace('.', ',') + ' cm']); });
    Object.entries((prenda.bloque || {}).medidas || {}).slice(0, 13 - filasMed.length).forEach(([kk, v]) => filasMed.push(['Prenda · ' + etiquetaMedida(prenda, kk), cm(v) + ' cm']));
    filasMed.slice(0, 13).forEach(([t, v], i) => { g.texto(cx + 3, yy - i * 3.9, t, { tam: 2.8 }); g.texto(cx + cw - 3 - anchoTexto(v, 2.8), yy - i * 3.9, v, { tam: 2.8, negrita: true }); });
    // materiales
    const yMat = y - 66; yy = caja(g, cx, yMat, cw, 38, 'MATERIALES');
    const consumo = consumoTela(prenda, o.anchoTela || 1500);
    const mats = ['Tela: ' + (o.tela ? o.tela.t : prenda.tejido === 'punto' ? 'punto' : 'tejido plano') + ' · ' + String(consumo.m.toFixed(2)).replace('.', ',') + ' m en ' + (o.anchoTela || 1500) / 10 + ' cm de ancho (calculado con las piezas + 15 %)'].concat(NOTAS[k] || ['Hilo a juego']);
    mats.forEach(t => { yy = g.parrafo(cx + 3, yy, '· ' + t, { tam: 2.8, ancho: cw - 6, interlinea: 3.6 }); });
    y -= fh + 6;
    // imprimir + símbolos + hojas
    const bw = (W - 2 * M - 8) / 3;
    const altoB = 64; let yb = caja(g, M, y, bw, altoB, 'IMPRIMIR Y COMPROBAR');
    g.rect(M + (bw - 50) / 2, yb - 51, 50, 50, { ancho: 0.4 }); g.texto(M + bw / 2, yb - 25, '5 × 5 cm', { tam: 3.4, negrita: true, centro: true }); g.texto(M + bw / 2, yb - 30, 'mídelo', { tam: 2.6, gris: 0.4, centro: true });
    yb = caja(g, M + bw + 4, y, bw, altoB, 'SÍMBOLOS');
    simbolos(g, M + bw + 7, yb, bw - 6);
    yb = caja(g, M + 2 * (bw + 4), y, bw, altoB, a0 ? 'HOJA GRANDE (A0)' : 'CÓMO MONTAR LAS HOJAS');
    mapaHojas(g, M + 2 * (bw + 4) + 3, yb - 1, bw - 6, 34, C, cols, filas, pw, ph, a0, hojas);
    g.parrafo(M + 2 * (bw + 4) + 3, y - 49, a0 ? 'Llévalo a una copistería y pide imprimirlo a tamaño real (100 %).' : hojas.length + ' hojas A4' + (hojas.length < cols * filas ? ' (las tachadas van vacías: no se imprimen)' : '') + '. Recorta el margen derecho e inferior y pega haciendo casar los rombos.', { tam: 2.6, ancho: bw - 6, interlinea: 3.3 });
    y -= altoB + 6;
    y = g.parrafo(M, y, 'Imprime SIEMPRE al 100 % («tamaño real», sin «ajustar a la página»). Mide el cuadrado: si no da 5 × 5 cm, no cortes y revisa la impresora.' + (doc.escala ? ' (Ya va CORREGIDO para tu impresora calibrada: ×' + doc.escala.x.toFixed(4).replace('.', ',') + ' a lo ancho, ×' + doc.escala.y.toFixed(4).replace('.', ',') + ' a lo alto.)' : '') + ' Los márgenes de costura YA están incluidos (línea continua = corte; discontinua = costura).', { tam: 3, ancho: W - 2 * M, interlinea: 4 });
    // el montaje en resumen (los títulos de los pasos: el detalle va en su página)
    y -= 4; if (y > 40) { const filasR = Math.ceil(L.length / 2), alto = Math.min(y - 16, 12 + filasR * 4.4); let yr = caja(g, M, y, W - 2 * M, alto, 'EL MONTAJE EN ' + L.length + ' PASOS');
      L.forEach((p, i) => { if (i >= 2 * Math.floor((alto - 12) / 4.4)) return; const col = i < filasR ? 0 : 1, fy = yr - (i % filasR) * 4.4, fx = M + 4 + col * (W - 2 * M) / 2; g.circulo(fx + 1.6, fy + 0.9, 1.9, { fondo: AZUL, sinRaya: true }); g.texto(fx + 1.6, fy + 0.1, String(p.n), { tam: 2.3, negrita: true, centro: true, color: [1, 1, 1] }); g.texto(fx + 5, fy, p.titulo, { tam: 2.8 }); }); }
    pie(g); }

  // ===== 2 · PIEZAS (con medidas) =====
  for (let pg = 0; pg < paginasPiezas; pg++) { const g = doc.pagina(W, H); let y = titular(g, H - M, '1. PIEZAS', 'con sus medidas · ' + prenda.piezas.length + ' piezas');
    const cel = prenda.piezas.slice(pg * 6, pg * 6 + 6), cw = (W - 2 * M - 6) / 2, ch = (y - 14) / 3;
    cel.forEach((pz, i) => { const x0 = M + (i % 2) * (cw + 6), yTop = y - Math.floor(i / 2) * ch; fichaPieza(g, pz, prenda, num, x0, yTop - ch + 4, cw, ch - 6, i + 1 + pg * 6); });
    pie(g); }

  // ===== 3 · MONTAJE PASO A PASO =====
  pagsMontaje.forEach((grupo, pi) => { const g = doc.pagina(W, H); let y = titular(g, H - M, '2. MONTAJE PASO A PASO', pi ? '(sigue)' : L.length + ' pasos · derecho con derecho salvo que se diga');
    grupo.forEach(p => { y = pasoDibujado(g, p, prenda, M, y, W - 2 * M); });
    pie(g); });

  // ===== 4 · DETALLES Y CONSEJOS =====
  { const g = doc.pagina(W, H); let y = titular(g, H - M, '3. DETALLES DE CONFECCIÓN', 'márgenes, costuras y ajuste');
    g.texto(M, y, 'Márgenes de costura (ya incluidos en el patrón)', { tam: 3.6, negrita: true }); y -= 5;
    prenda.piezas.forEach(pz => { const t = pz.nombre + ': ' + pz.bordes.map(B => B.n.toLowerCase() + ' ' + (B.tipo === 'doblez' ? 'al doblez' : cm(Z.margenDe(pz, B.id)) + ' cm')).join(' · '); y = g.parrafo(M + 2, y, t, { tam: 2.8, ancho: W - 2 * M - 4, interlinea: 3.6 }); y -= 1; });
    y -= 3; g.texto(M, y, 'Tipo de cada costura', { tam: 3.6, negrita: true }); y -= 5;
    const vistas = new Set(); (prenda.costuras || []).forEach(c => { if (vistas.has(c.id)) return; vistas.add(c.id); const T = TIPOS[tipoDe(prenda, c, o.tipos)]; y = g.parrafo(M + 2, y, c.n + ': ' + T.t, { tam: 2.8, ancho: W - 2 * M - 4, interlinea: 3.6 }); });
    y -= 3; g.texto(M, y, 'Consejos de ajuste', { tam: 3.6, negrita: true }); y -= 5;
    (o.ajuste ? [o.ajuste] : []).concat(CONSEJOS[k] || [], ['Marca piquetes y puntos con tiza o un corte de 3 mm en el margen.', 'Plancha cada costura según la coses: la prenda queda mucho mejor.']).forEach(t => { y = g.parrafo(M + 2, y, '· ' + t, { tam: 2.9, ancho: W - 2 * M - 4, interlinea: 3.7 }); });
    y -= 3; g.parrafo(M, y, 'La comprobación de CelebriDREW (costuras que casan, márgenes, piquetes) es geométrica: no sustituye a una prueba con tela.', { tam: 2.8, gris: 0.4, ancho: W - 2 * M });
    pie(g); }

  // ===== 5… · EL PATRÓN A TAMAÑO REAL =====
  const orillas = rotulosOrillas(prenda, num);
  hojas.forEach(([f, c], ih) => {
    const g = doc.pagina(hoja.w, hoja.h), ox = c * pw, oy = f * ph, nombreHoja = String.fromCharCode(65 + f) + (c + 1);
    const a = p => [mh + p[0] - ox, hoja.h - mh - 6 - (p[1] - oy)];
    g.recorta(mh, mh + 6, uw, uh, () => C.items.forEach(it => { const d = it.d, A = p => a(it.a(p));
      if (it.x > ox + uw || it.x + it.w < ox || it.y > oy + uh || it.y + it.h < oy) return;
      g.poli(d.corte.map(A), { ancho: 0.5 }); g.poli(d.costura.map(A), { ancho: 0.2, gris: 0.35, trazos: [3, 1.5] });
      d.piq.forEach(s => g.linea(...A(s[0]), ...A(s[1]), { ancho: 0.4 }));
      d.internas.forEach(x => { if (x.pts.length > 1) g.poli(x.pts.map(A), { ancho: 0.25, trazos: [4, 2], cerrado: false }); else if (x.tipo === 'boton') { const p = A(x.pts[0]); g.circulo(p[0], p[1], 2, { ancho: 0.3 }); } });
      if (d.hilo) { const [p, q] = d.hilo.map(A); g.linea(p[0], p[1], q[0], q[1], { ancho: 0.3 }); flecha(g, p, q); flecha(g, q, p); }
      if (d.doblez) { const [p, q] = d.doblez.map(A); g.linea(p[0], p[1], q[0], q[1], { ancho: 0.7, trazos: [8, 2, 2, 2] }); const mm = G.lerp(p, q, 0.5); g.texto(mm[0] + 5.5, mm[1] - 8, 'AL DOBLEZ', { tam: 3.5, giro: 90 }); }
      d.tx.forEach(t => { const p = A(t.p); g.texto(p[0], p[1], t.t, { tam: t.tam, centro: true, negrita: t.tam > 4.5 }); });
      // la UNIÓN de piezas: en cada orilla que se cose, el número del paso y con qué pieza
      (orillas[it.pz.id] || []).forEach(r => { const p = A(r.p); const ancho = Math.max(5.2, anchoTexto(r.n, 2.9) + 2.4); g.rect(p[0] - ancho / 2, p[1] - 2.6, ancho, 5.2, { fondo: [1, 1, 1], color: AZUL, ancho: 0.35 }); g.texto(p[0], p[1] - 1.1, r.n, { tam: 2.9, negrita: true, centro: true, color: AZUL }); if (r.con) g.texto(p[0] + ancho / 2 + 1.2, p[1] - 0.9, r.con, { tam: 2.3, color: AZUL }); });
    }));
    g.rect(mh, mh + 6, uw, uh, { ancho: 0.15, gris: 0.6 });
    if (sol) { [[mh + sol / 2, mh + 6 + uh / 2], [mh + uw - sol / 2, mh + 6 + uh / 2], [mh + uw / 2, mh + 6 + sol / 2], [mh + uw / 2, mh + 6 + uh - sol / 2]].forEach(([x, yy]) => g.poli([[x, yy - 3], [x + 3, yy], [x, yy + 3], [x - 3, yy]], { ancho: 0.3 }));
      g.linea(mh + uw - sol, mh + 6, mh + uw - sol, mh + 6 + uh, { ancho: 0.1, gris: 0.6, trazos: [2, 2] }); g.linea(mh, mh + 6 + sol, mh + uw, mh + 6 + sol, { ancho: 0.1, gris: 0.6, trazos: [2, 2] }); }
    g.texto(mh, hoja.h - mh + 3.2, 'Hoja ' + nombreHoja + (a0 ? '' : ' (' + (ih + 1) + ' de ' + hojas.length + ')') + ' · ' + (prenda.nombre || ''), { tam: 3, negrita: true });
    { const rx = hoja.w - mh - 50, ry = hoja.h - mh + 1.5; g.linea(rx, ry, rx + 30, ry, { ancho: 0.3 }); for (let t = 0; t <= 30; t += 5) g.linea(rx + t, ry, rx + t, ry + (t % 10 ? 1.4 : 2.4), { ancho: 0.25 }); g.texto(rx + 32, ry - 0.2, '3 cm: mídela', { tam: 2.4, gris: 0.35 }); } // (la regla de comprobación, en el margen de arriba)
    pie(g, hoja.w, hoja.h);
  });
  return { bytes: doc.bytes(), paginas: total, hojas: hojas.length, pasos: L.length, consumo: consumoTela(prenda, o.anchoTela || 1500) };
}

// ---------- colocar las piezas para gastar las MENOS hojas posibles ----------
// Se prueba con 1, 2… hojas de ancho y con cada pieza tal cual o GIRADA 90° (en el papel da igual: su línea de hilo gira con ella), por
// filas de mayor a menor, y se queda lo que gaste menos hojas (y, a igualdad, lo más bajo).
const giraP = p => [-p[1], p[0]];
function giraDibujo(d) { const G2 = L => L.map(giraP), r = { costura: G2(d.costura), corte: G2(d.corte), piq: d.piq.map(G2), internas: d.internas.map(x => Object.assign({}, x, { pts: G2(x.pts) })), hilo: d.hilo ? G2(d.hilo) : null, doblez: d.doblez ? G2(d.doblez) : null, pinzas: d.pinzas, tx: d.tx.map(t => Object.assign({}, t, { p: giraP(t.p) })) };
  r.caja = G.caja(r.corte); return r; }
function empaqueta(prenda, pw, ph, sol, hueco = 18) {
  const base = prenda.piezas.map(pz => { const d = EX.dibujo(pz); return { pz, d: [d, giraDibujo(d)] }; }), n = base.length;
  let mejor = null;
  const prueba = (gir, k) => { const its = base.map((b, i) => ({ pz: b.pz, d: b.d[gir[i]], b: b.d[gir[i]].caja })).sort((a, b) => b.b.h - a.b.h), ancho = k * pw + sol; if (its.some(it => it.b.w + 2 * hueco > ancho)) return;
    let x = hueco, y = hueco, fila = 0, ancho2 = 0; const pos = [];
    its.forEach(it => { if (x + it.b.w + hueco > ancho) { x = hueco; y += fila + hueco; fila = 0; } pos.push([it, x, y]); x += it.b.w + hueco; fila = Math.max(fila, it.b.h); ancho2 = Math.max(ancho2, x); });
    const alto = y + fila + hueco, cols = Math.max(1, Math.ceil((ancho2 - sol) / pw)), filas = Math.max(1, Math.ceil((alto - sol) / ph));
    // (solo cuentan las hojas que llevan algo)
    let hojas = 0; for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) { const ox = c * pw, oy = f * ph; if (pos.some(([it, X0, Y0]) => X0 < ox + pw + sol && X0 + it.b.w > ox && Y0 < oy + ph + sol && Y0 + it.b.h > oy)) hojas++; }
    if (!mejor || hojas < mejor.hojas || (hojas === mejor.hojas && alto < mejor.alto)) mejor = { hojas, ancho: ancho2, alto, pos }; };
  const combos = n <= 9 ? 1 << n : 2; for (let m = 0; m < combos; m++) { const gir = Array.from({ length: n }, (_, i) => (n <= 9 ? (m >> i) & 1 : m)); for (let k = 1; k <= 8; k++) prueba(gir, k); }
  const items = mejor.pos.map(([it, X0, Y0]) => ({ pz: it.pz, d: it.d, x: X0, y: Y0, w: it.b.w, h: it.b.h, a: p => [X0 + (p[0] - it.b.x0), Y0 + (it.b.y1 - p[1])] }));
  return { items, ancho: mejor.ancho, alto: mejor.alto };
}
// ---------- piezas pequeñas ----------
function dibujaPieza(g, pz, x, y, w, h, o = {}) {
  const d = EX.dibujo(pz), b = d.caja, k = Math.min(w / b.w, h / b.h), ox = x + (w - b.w * k) / 2, oy = y + (h - b.h * k) / 2, A = p => [ox + (p[0] - b.x0) * k, oy + (p[1] - b.y0) * k];
  g.poli(d.corte.map(A), { ancho: 0.35, fondo: o.fondo || [0.93, 0.91, 0.97] }); g.poli(d.costura.map(A), { ancho: 0.15, gris: 0.4, trazos: [1.5, 1] });
  if (d.hilo) { const [p, q] = d.hilo.map(A); g.linea(p[0], p[1], q[0], q[1], { ancho: 0.2, gris: 0.3 }); }
  if (d.doblez) { const [p, q] = d.doblez.map(A); g.linea(p[0], p[1], q[0], q[1], { ancho: 0.45, trazos: [3, 1, 1, 1] }); }
  (o.resalta || []).forEach(bid => { const L = Z.bordePolilinea(pz, bid); if (L.length > 1) g.poli(L.map(A), { ancho: 1.1, color: AZUL, cerrado: false }); });
  return { k, A, b };
}
function miniaturas(g, prenda, x, y, w, h) { const n = prenda.piezas.length, cols = n > 4 ? 3 : 2, filas = Math.ceil(n / cols), cw = w / cols, ch = h / filas;
  prenda.piezas.forEach((pz, i) => { const cx = x + (i % cols) * cw, cy = y + h - (Math.floor(i / cols) + 1) * ch; dibujaPieza(g, pz, cx + 2, cy + 5, cw - 4, ch - 8); g.texto(cx + cw / 2, cy + 1.5, pz.nombre, { tam: 2.4, centro: true }); }); }
function fichaPieza(g, pz, prenda, num, x, y, w, h, n) {
  g.rect(x, y, w, h, { ancho: 0.25, color: BORDE });
  g.circulo(x + 5, y + h - 5, 3, { fondo: VIOLETA, sinRaya: true }); g.texto(x + 5, y + h - 6.1, String(n), { tam: 3, negrita: true, centro: true, color: [1, 1, 1] });
  g.texto(x + 10, y + h - 6.2, pz.nombre.toUpperCase(), { tam: 3.6, negrita: true }); g.texto(x + 10, y + h - 10, cortar(pz), { tam: 2.6, gris: 0.4 });
  const area = { x: x + 8, y: y + 22, w: w - 30, h: h - 38 }, r = dibujaPieza(g, pz, area.x, area.y, area.w, area.h), b = r.b;
  // ancho y alto con flechas (color rosa, como en las fichas de patronaje)
  const x0 = r.A([b.x0, b.y0])[0], x1 = r.A([b.x1, b.y0])[0], y0 = r.A([b.x0, b.y0])[1], y1 = r.A([b.x0, b.y1])[1];
  g.linea(x0, y1 + 3, x1, y1 + 3, { ancho: 0.3, color: ROSA }); flecha(g, [x0, y1 + 3], [x1, y1 + 3], ROSA); flecha(g, [x1, y1 + 3], [x0, y1 + 3], ROSA); g.texto((x0 + x1) / 2, y1 + 4.5, cm(b.w) + ' cm', { tam: 2.7, centro: true, color: ROSA, negrita: true });
  g.linea(x1 + 3, y0, x1 + 3, y1, { ancho: 0.3, color: ROSA }); flecha(g, [x1 + 3, y0], [x1 + 3, y1], ROSA); flecha(g, [x1 + 3, y1], [x1 + 3, y0], ROSA); g.texto(x1 + 5, (y0 + y1) / 2, cm(b.h) + ' cm', { tam: 2.7, color: ROSA, negrita: true });
  // orillas que se cosen, con su largo y su paso
  let yy = y + 18; pz.bordes.filter(B => B.tipo !== 'doblez').slice(0, 5).forEach(B => { const nn = num[pz.nombre + '|' + B.id], t = B.n + ': ' + cm(Z.bordeLargo(pz, B.id)) + ' cm' + (nn ? ' · paso ' + nn.join(', ') : B.tipo === 'bajo' ? ' · bajo' : ''); g.texto(x + 3, yy, t, { tam: 2.4, gris: 0.25 }); yy -= 3.1; });
}
// ---------- los pasos (con su dibujo) ----------
function maquetaMontaje(L, ancho) { // reparte los pasos en páginas según lo que ocupan
  const alto = p => Math.max(p.bordes.length ? 44 : 14, 10 + renglones(p.texto, 2.9, ancho - (p.bordes.length ? 82 : 14)).length * 3.8), disp = 297 - 12 - 14 - 16, out = [[]]; let usado = 0;
  L.forEach(p => { const a = alto(p) + 4; if (usado + a > disp && out[out.length - 1].length) { out.push([]); usado = 0; } out[out.length - 1].push(p); usado += a; p._alto = a; }); return out;
}
function pasoDibujado(g, p, prenda, x, y, w) {
  const conDibujo = p.bordes.length > 0, tw = w - (conDibujo ? 82 : 14);
  g.circulo(x + 4.5, y - 4, 4, { fondo: AZUL, sinRaya: true }); g.texto(x + 4.5, y - 5.3, String(p.n), { tam: 3.6, negrita: true, centro: true, color: [1, 1, 1] });
  g.texto(x + 11, y - 5.3, p.titulo, { tam: 3.6, negrita: true });
  g.parrafo(x + 11, y - 10, p.texto, { tam: 2.9, ancho: tw, interlinea: 3.8 });
  if (conDibujo) { const bx = x + w - 66, by = y - 42, bw = 66, bh = 38; g.rect(bx, by, bw, bh, { ancho: 0.2, color: BORDE, fondo: [0.985, 0.98, 0.975] });
    const nombres = [...new Set(p.bordes.map(b => b[0]))].slice(0, 3), cw = bw / nombres.length;
    nombres.forEach((n, i) => { const pz = prenda.piezas.find(q => q.nombre === n); if (!pz) return; dibujaPieza(g, pz, bx + i * cw + 2, by + 6, cw - 4, bh - 9, { resalta: p.bordes.filter(b => b[0] === n).map(b => b[1]) }); g.texto(bx + i * cw + cw / 2, by + 2, n, { tam: 2.4, centro: true, gris: 0.35 }); }); }
  return y - (p._alto || 30);
}
// ---------- rótulos de las orillas en el patrón ----------
function rotulosOrillas(prenda, num) { const out = {};
  prenda.piezas.forEach(pz => { out[pz.id] = []; pz.bordes.forEach(B => { const nn = num[pz.nombre + '|' + B.id]; if (!nn) return; const L = Z.tramosDe(pz, B.id); if (!L) return; const Lt = G.cadenaLargo(L); if (Lt < 25) return;
    const { p, tg } = G.cadenaEnLargo(L, Lt * 0.5), fuera = [tg[1], -tg[0]], m = Z.margenDe(pz, B.id), q0 = G.suma(p, G.esc(fuera, m + 5)), q1 = G.suma(p, G.esc(fuera, m + 10));
    const c = (prenda.costuras || []).find(c2 => (c2.a.pieza === pz.id && c2.a.borde === B.id) || (c2.b.pieza === pz.id && c2.b.borde === B.id)), otra = c && prenda.piezas.find(q => q.id === (c.a.pieza === pz.id && c.a.borde === B.id ? c.b.pieza : c.a.pieza));
    out[pz.id].push({ p: q0, q: q1, n: nn.join('·'), con: otra ? (otra === pz ? 'con su pareja' : 'con ' + otra.nombre) : '' }); }); });
  return out; }
// ---------- trocitos ----------
function flecha(g, de, a, color) { const d = G.norma(G.sub(a, de)), n = [-d[1], d[0]], t = a, l = 1.6; g.poli([t, G.suma(G.suma(t, G.esc(d, -l)), G.esc(n, l * 0.45)), G.suma(G.suma(t, G.esc(d, -l)), G.esc(n, -l * 0.45))], { ancho: 0.1, fondo: color || [0, 0, 0], sinRaya: true }); }
function simbolos(g, x, y, w) { const fila = (t, dib) => { dib(y - 1); g.texto(x + 18, y - 2, t, { tam: 2.6 }); y -= 5.6; };
  fila('Línea de corte', yy => g.linea(x, yy, x + 14, yy, { ancho: 0.5 })); fila('Línea de costura', yy => g.linea(x, yy, x + 14, yy, { ancho: 0.2, trazos: [3, 1.5] }));
  fila('Piquete (casar)', yy => { g.linea(x, yy, x + 14, yy, { ancho: 0.5 }); g.linea(x + 7, yy, x + 7, yy - 3, { ancho: 0.4 }); }); fila('Hilo de la tela', yy => { g.linea(x, yy, x + 14, yy, { ancho: 0.3 }); flecha(g, [x, yy], [x + 14, yy]); flecha(g, [x + 14, yy], [x, yy]); });
  fila('Doblez de la tela', yy => g.linea(x, yy, x + 14, yy, { ancho: 0.7, trazos: [6, 1.5, 1.5, 1.5] })); fila('Pinza / línea interna', yy => g.linea(x, yy, x + 14, yy, { ancho: 0.25, trazos: [4, 2] }));
  fila('Paso de montaje (se cose aquí)', yy => { g.circulo(x + 7, yy, 2.4, { color: AZUL, ancho: 0.35 }); g.texto(x + 7, yy - 1, '3', { tam: 2.6, negrita: true, centro: true, color: AZUL }); });
  fila('Botón / ojal', yy => g.circulo(x + 7, yy, 2, { ancho: 0.3 })); }
function mapaHojas(g, x, y, w, h, C, cols, filas, pw, ph, a0, llenas) { if (a0) { g.rect(x, y - h, w * 0.6, h, { ancho: 0.3 }); g.texto(x + 2, y - h + 2, 'A0 (84 × 119 cm)', { tam: 2.6 }); return; }
  const k = Math.min(w / (cols * pw), h / (filas * ph)); for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) { const x0 = x + c * pw * k, y0 = y - (f + 1) * ph * k, vacia = llenas && !llenas.some(([a, b]) => a === f && b === c); g.rect(x0, y0, pw * k, ph * k, { ancho: 0.2, gris: 0.55 }); if (vacia) { g.linea(x0, y0, x0 + pw * k, y0 + ph * k, { ancho: 0.2, gris: 0.6 }); g.linea(x0, y0 + ph * k, x0 + pw * k, y0, { ancho: 0.2, gris: 0.6 }); } else g.texto(x0 + 1, y0 + 1, String.fromCharCode(65 + f) + (c + 1), { tam: 2.2 }); }
  C.items.forEach(it => g.rect(x + it.x * k, y - (it.y + it.h) * k, it.w * k, it.h * k, { ancho: 0.25, color: VIOLETA })); }
function etiquetaMedida(prenda, kk) { const m = ((prenda.bloque && prenda.bloque.medidasDef) || []).find(x => x.k === kk); return m ? m.t : ({ pecho: 'pecho', largo: 'largo', hombros: 'hombros', cuello: 'ancho de cuello', bajadaDel: 'bajada escote delante', bajadaEsp: 'bajada escote espalda', sisa: 'sisa', manga: 'largo de manga', biceps: 'contorno de manga', boca: 'boca de manga', bajo: 'bajo', caida: 'caída de hombro', cintura: 'cintura', cadera: 'cadera', altoCadera: 'altura de cadera', vuelo: 'vuelo', cinturilla: 'cinturilla', tiro: 'tiro', rodilla: 'rodilla', alturaPuno: 'puño', alturaCintura: 'cintura (alto)', altoCapucha: 'alto de capucha', fondoCapucha: 'fondo de capucha' }[kk] || kk); }
// consumo de tela: área de las piezas cortadas (con márgenes y copias) en un ancho dado, + 15 % de aprovechamiento
export function consumoTela(prenda, ancho = 1500) { let A = 0; prenda.piezas.forEach(pz => { const C = pz && EX.dibujo(pz).corte, a = Math.abs(G.area(C)); A += a * (pz.corte.doblez ? 2 : 1) * (pz.corte.n || 1); }); return { area: A, m: A * 1.15 / ancho / 1000 }; }
