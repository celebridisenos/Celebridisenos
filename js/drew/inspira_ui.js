// ================= 👗 CelebriDREW · 🌐 DISEÑAR DESDE UNA IMAGEN (internet, revista, Pinterest…) — la ventana (16-10-2026) =================
// Ella: «si quiero hacer una que he visto en internet, tiene que leer esa imagen y hacer el patrón, ir cerrando los detalles con la IA si
// lleva varillas o puntos que se le puedan pasar, pero que sean lo mínimo».
// 1) la imagen: elegirla, PEGARLA (en internet: clic derecho → «Copiar imagen» y aquí Ctrl+V) o arrastrarla;
// 2) la IA de visión del PC (drew/foto/vision.js: Qwen3-VL 4B, Apache-2.0, en Ollama; la foto no sale del PC) lee la prenda: qué es, largo,
//    manga, escote, ajuste, falda, cierre, VARILLAS, tirantes, capucha, bolsillos y detalles. Tarda ~1–2 min en este PC: mientras, ya se
//    puede contestar; lo que ella toca manda sobre lo que diga la IA;
// 3) como mucho 3 PREGUNTAS de un toque: el largo y la falda siempre (la IA los falla a menudo) y lo que la IA dude;
// 4) para faldas y vestidos con vuelo, la SILUETA: SAM 2 (drew/foto/sam.js, en su hilo) recorta la prenda dentro del recuadro de la IA (o
//    tocándola) y de ahí sale cuánto se abre;
// 5) lo que el patrón HARÁ y lo que todavía NO (dicho, no inventado) → «Crear el patrón en mi avatar» (o.crear): plantilla + opciones + ajuste
//    a la medida del avatar, con los largos en SUS niveles. La lógica (sin pantalla) está en drew/foto/inspira.js (test/unit/drew_inspira.mjs).
import { h, btn, toast, modal } from '../ui.js';
import * as I from './foto/inspira.js';
import * as V from './foto/vision.js';
import * as SAM from './foto/sam.js';
import * as BL from './bloques/index.js';
import * as PR from './foto/producto.js'; // 17-10: 📸 COPIA EXACTA desde una foto de producto con fondo liso
import * as DF from './foto/desde_foto.js';
import * as PU from './patron_img_ui.js'; // 18-10: 📐 si la imagen es un PATRÓN (piezas dibujadas), su panel
import * as TF from './foto/tela_foto.js'; // 18-10: 🧵 la tela de la foto (cuadros, rayas, estampado)

const MAXL = 1600, CIAN = 'rgba(0,205,230,', ROSA = '#c25d74';
let ultima = null; // la última imagen de esta sesión (para volver a abrirla): { url, L, sil }
export const ultimaImagen = () => ultima;

// o = { crear(D, L) → { ok, error }, listo() → true si el avatar ya está (para medir los largos en él),
//       crearExacta(A) → { ok, error } (17-10: la prenda COPIADA de una foto de producto), cuerpo(k, ajuste) → medidas de esa prenda en el avatar }
// (17-10) Ella: «no copia exactamente lo que pido; solo subir fotos con fondo blanco del producto». Si la foto tiene el fondo LISO (blanco, gris…),
// la ventana entra en «📸 COPIA EXACTA»: la prenda se recorta al píxel (sin IA), se mide ENTERA (foto/producto.js) y se dibujan sus medidas
// encima; el tamaño sale del avatar (su pecho o cadera con la holgura elegida, todo lo demás en las proporciones de la foto) o de UNA medida de
// la tabla de tallas de la tienda. Trae también capucha, cremallera, puños, cintura, el ESTAMPADO del pecho y el color. La IA sigue mirando
// detrás (bolsillos, qué prenda es) y sus pistas se enseñan; la forma ya no depende de ella.
export function abre(o, archivo) {
  const S = { im: null, url: null, L: I.lee(null), sil: null, mk: null, ia: 'sin', iaMs: 0, iaT0: 0, iaMod: null, iaErr: '', sam: 'sin', samErr: '', puntos: [], etiq: [], ab: null, reloj: null, clave: '', vistas: [],
    prod: null /* (17-10) la copia exacta: { estado, FP, fondo, escala: { modo, ajuste, k, mm, contorno }, error } */, pat: null /* (18-10) el patrón de la imagen (patron_img_ui.js) */, noPat: false };
  ['categoria', 'largo', 'manga', 'escote', 'ajuste', 'falda', 'cierre', 'varillas', 'tirantes', 'capucha', 'bolsillos'].forEach(c => { S.L.campos[c] = { v: null, ia: false, duda: true }; });
  S.L.campos.varillas.v = 'no'; S.L.campos.tirantes.v = 'no'; S.L.campos.capucha.v = 'no'; S.L.campos.cierre.v = null;
  const lienzo = h('canvas.dw-insp-img'), caja = h('div.dw-insp-caja', lienzo), lado = h('div.dw-cal-lado.dw-insp-lado');
  const m = modal(o.modoPatron ? '📐 Patrón desde una imagen' : '🌐 Diseñar desde una imagen', h('div.dw-cal.dw-insp', lado, caja), null, { size: 'full', onclose: () => { cierra(); } });
  m.el.classList.add('dw-cal-m');
  const elegir = () => { const i = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files[0]; if (f) carga(f); i.remove(); } }); document.body.append(i); i.click(); };
  const pega = e => { const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => /^image\//.test(x.type)); if (!it) return; e.preventDefault(); carga(it.getAsFile()); };
  document.addEventListener('paste', pega);
  V.calienta(); // (18-10: la IA se sube a memoria ya, mientras se elige la foto: ~9 s menos de espera)
  caja.addEventListener('dragover', e => { e.preventDefault(); caja.classList.add('soltar'); }); caja.addEventListener('dragleave', () => caja.classList.remove('soltar'));
  caja.addEventListener('drop', e => { e.preventDefault(); caja.classList.remove('soltar'); const f = [...(e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (f) carga(f); });
  lienzo.addEventListener('pointerdown', e => { if (!S.im) return; const r = lienzo.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * lienzo.width, y = (e.clientY - r.top) / r.height * lienzo.height;
    if (S.pat) { PU.toca(S.pat, x / lienzo.width * S.im.w, y / lienzo.height * S.im.h); if (S.pat.escala.modo === 'tuya' && S.pat.escala.puntos.length === 2 && S.pat.escala.cm > 0) rehacePat(); dibuja(); pinta(); return; }
    S.puntos.push([x / lienzo.width * S.im.w, y / lienzo.height * S.im.h]); S.etiq.push(e.shiftKey || e.button === 2 ? 0 : 1); recorta(); });
  lienzo.addEventListener('contextmenu', e => e.preventDefault());
  function cierra() { document.removeEventListener('paste', pega); if (S.ab) S.ab.abort(); clearInterval(S.reloj); }

  // ---------- la imagen ----------
  async function carga(f) {
    try { const u = URL.createObjectURL(f), im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = () => rej(new Error('No se puede leer esa imagen.')); x.src = u; });
      const k = Math.min(1, MAXL / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), hh = Math.round(im.naturalHeight * k), c = document.createElement('canvas'); c.width = w; c.height = hh;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.drawImage(im, 0, 0, w, hh);
      S.im = { c, w, h: hh }; S.url = u; S.vistas = []; S.clave = f.name + ':' + f.size + ':' + Date.now(); S.mk = null; S.sil = null; S.sam = 'sin'; S.puntos = []; S.etiq = []; S.tela = null; S.usarTela = null; SAM.olvida(); S.L.foto = null;
      Object.values(S.L.campos).forEach(x => { if (x.ia) Object.assign(x, { v: null, ia: false, duda: true }); }); S.L.caja = null; S.L.detalles = []; S.L.notas = ''; S.L.confianza = 0;
      S.prod = null; S.pat = null; S.noPat = false; const datos = g.getImageData(0, 0, w, hh).data;
      // (18-10) ¿es un PATRÓN? (piezas dibujadas en papel): entonces su panel, sin IA ni copia de producto (no hacen falta y tardan)
      try { S.pat = PU.detecta({ w, h: hh, d: datos }, ctxPat); } catch (e) { S.pat = null; }
      if (S.pat) { dibuja(); pinta(); afinaPat(); return; }
      if (o.modoPatron) toast('No encuentro un patrón en esta imagen (piezas con su línea cerrada en papel claro): la miro como una prenda.', 'bad', 7000);
      const F = PR.fondoLiso({ w, h: hh, d: datos });
      dibuja(); pinta(); if (F.liso) copia(F, { w, h: hh, d: datos }); mira(); }
    catch (e) { toast(e.message, 'bad'); }
  }
  // ---------- 📐 el PATRÓN de la imagen (18-10) ----------
  const ctxPat = { cuerpo: k => { try { return o.cuerpo ? o.cuerpo(k, 'normal') : null; } catch (e) { return null; } } };
  function afinaPat() { const pat = S.pat; if (!pat) return; PU.afina(pat, () => { if (S.pat === pat) pinta(); }).then(() => { if (S.pat === pat) { dibuja(); pinta(); } }); }
  function rehacePat() { if (!S.pat) return; PU.calcula(S.pat, ctxPat); afinaPat(); }
  const handPat = { ponTipo: (i, k) => { S.pat.tipos[i] = k; rehacePat(); dibuja(); pinta(); }, escala: md => { S.pat.escala.modo = md; if (md === 'avatar') { S.pat.escala.puntos = []; } rehacePat(); dibuja(); pinta(); },
    cm: v => { S.pat.escala.cm = v > 0 ? v : null; rehacePat(); dibuja(); pinta(); }, otraRaya: () => { S.pat.escala.puntos = []; dibuja(); pinta(); },
    crear: () => { if (o.listo && !o.listo()) return toast('Espera un momento: el avatar se está preparando.', 'bad'); if (!o.crearPatron) return toast('Esta ventana no puede crear la prenda.', 'bad');
      let A; try { A = PU.aProyecto(S.pat); } catch (e) { return toast(e.message, 'bad', 9000); } const R = o.crearPatron(A); if (R && R.ok === false) return toast(R.error || 'No se ha podido crear la prenda.', 'bad', 9000);
      toast('📐 ' + A.nombre + ': cosiéndose en tu avatar…', 'ok', 5000); m.close(); } };
  function noEsPatron() { const im = S.im; S.pat = null; S.noPat = true; if (!im) return; const g = im.c.getContext('2d'), datos = g.getImageData(0, 0, im.w, im.h).data, F = PR.fondoLiso({ w: im.w, h: im.h, d: datos }); dibuja(); pinta(); if (F.liso) copia(F, { w: im.w, h: im.h, d: datos }); mira(); }
  // ---------- 📸 la COPIA EXACTA (foto de producto con fondo liso) ----------
  const famDe = FP => PR.familiaDe(FP.T.etapas.RASGOS.datos);
  const catDe = FP => (FP.T.etapas.CLASIFICACION && FP.T.etapas.CLASIFICACION.datos && FP.T.etapas.CLASIFICACION.datos.categoria) || 'camiseta';
  const kDe = FP => (BL.POR_CATEGORIA[FP.categoria || catDe(FP)] || ['camiseta'])[0];
  // la escala que toca: la del avatar (su prenda con la holgura) o la medida de la tabla
  function escalaDe(FP) { const e = S.prod.escala; if (e.modo === 'tabla') return e.mm > 0 ? { modo: 'tabla', k: e.k, mm: e.mm, contorno: !!e.contorno } : null;
    let M = null; try { M = o.cuerpo ? o.cuerpo(kDe(FP), e.ajuste) : null; } catch (x) { M = null; } if (!M) return null; return { modo: 'avatar', pecho: M.pecho, cadera: M.cadera, ajuste: e.ajuste }; }
  async function copia(F, img) {
    S.prod = { estado: 'midiendo', fondo: F, img, escala: (S.prod && S.prod.escala) || { modo: 'avatar', ajuste: 'normal', k: null, mm: 0, contorno: false } }; pinta(); const yo = S.prod;
    try { await new Promise(r => setTimeout(r, 30)); const FP = await PR.analizaProducto(img, {}); if (S.prod !== yo) return; yo.FP = FP;
      if (!FP.T.etapas.RASGOS || !FP.T.etapas.RASGOS.datos) throw new Error(DF.motivo(FP.T) || 'No encuentro la prenda en la foto.');
      await PR.ponEscala(FP, escalaDe(FP)); yo.estado = 'lista'; }
    catch (e) { yo.estado = 'error'; yo.error = e.message; }
    if (S.prod === yo) { dibuja(); pinta(); }
  }
  async function reEscala() { const P = S.prod; if (!P || !P.FP) return; await PR.ponEscala(P.FP, escalaDe(P.FP)); dibuja(); pinta(); }
  async function otraPrenda(cat) { const P = S.prod; if (!P || !P.FP) return; P.estado = 'midiendo'; pinta(); try { await DF.cambiaCategoria(P.FP, cat); await PR.ponEscala(P.FP, escalaDe(P.FP)); P.estado = 'lista'; } catch (e) { P.estado = 'error'; P.error = e.message; } dibuja(); pinta(); }
  function creaExacta() {
    const P = S.prod; if (!P || !P.FP) return; if (o.listo && !o.listo()) return toast('Espera un momento: el avatar se está preparando.', 'bad');
    let A; try { A = PR.aProyecto(P.FP); } catch (e) { return toast(e.message, 'bad', 9000); }
    // lo que la IA ha visto y la foto no puede medir (bolsillos, cierre), si lo ha visto
    const c = k => S.L.campos[k] && S.L.campos[k].v; if (A.k === 'sudadera') { if (c('cierre') === 'cremallera_delante') A.opciones.cierre = 'cremallera'; if (c('bolsillos') === '0') A.opciones.bolsillo = 'no'; }
    if (A.estampado) { const E = A.estampado, cv = document.createElement('canvas'); cv.width = E.pw; cv.height = E.ph; cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(E.rgba), E.pw, E.ph), 0, 0); A.estampado = Object.assign({}, E, { url: cv.toDataURL('image/png'), rgba: null }); }
    const R = o.crearExacta(A); if (R && R.ok === false) return toast(R.error || 'No se ha podido crear el patrón.', 'bad', 9000);
    ultima = { url: S.url, L: S.L, sil: S.sil, FP: P.FP }; toast('📸 ' + A.nombre + ': cosiéndose en tu avatar…', 'ok', 5000); m.close();
  }
  // ---------- la IA de visión (en el PC) ----------
  async function mira() {
    if (S.ab) S.ab.abort(); S.ab = new AbortController(); const ab = S.ab; S.ia = 'mirando'; S.iaT0 = Date.now(); S.iaErr = ''; pinta();
    clearInterval(S.reloj); S.reloj = setInterval(() => { if (S.ia === 'mirando' || S.ia === 'pc') pintaEstado(); }, 1000);
    try { const b64 = V.jpeg(S.im.c); let R;
      try { R = await V.pregunta(I.PREGUNTA, b64, { signal: ab.signal }); }
      catch (e) { if (ab.signal.aborted) return; const { desktop } = await import('../desktop.js'); if (desktop.on) throw e;
        // (16-10: en el iPad o el móvil no hay IA de visión: la foto va al PC del taller y él la lee —drew/foto/vision_pc.js—)
        S.ia = 'pc'; S.iaPc = '📤 Enviando la foto al PC del taller…'; pinta();
        const PC = await import('./foto/vision_pc.js'); R = await PC.preguntaPorPC(I.PREGUNTA, b64, { signal: ab.signal, onStatus: t => { S.iaPc = t; pintaEstado(); } }); }
      if (ab.signal.aborted) return;
      const N = I.lee(R.j, { modelo: R.modelo });
      // lo que ella ya ha contestado MANDA; lo demás, lo que dice la IA
      Object.entries(N.campos).forEach(([c, x]) => { const y = S.L.campos[c]; if (y && y.ia === false && y.toco) return; S.L.campos[c] = x; });
      Object.assign(S.L, { caja: N.caja, detalles: N.detalles, notas: N.notas, confianza: N.confianza, modelo: N.modelo, foto: N.foto });
      S.vistas = S.vistas.filter(c => S.L.campos[c] && S.L.campos[c].toco); // (las preguntas de antes de leerla, fuera, salvo las ya contestadas)
      S.ia = 'lista'; S.iaMs = R.ms; S.iaMod = R; clearInterval(S.reloj); dibuja(); pinta();
      if (!S.prod && SAM.disponible() && S.sam === 'sin') recorta(); /* (18-10: siempre —no solo con faldas—: con la prenda recortada salen su color y su TELA; con la copia exacta la silueta ya está) */
    } catch (e) { if (ab.signal.aborted) return; S.ia = 'no'; S.iaErr = e.message; clearInterval(S.reloj); pinta(); }
  }
  // ---------- la silueta con SAM 2 (en su hilo) ----------
  const necesitaSilueta = () => { const D = I.diseno(S.L, null); return (D.k === 'falda' || D.k === 'vestido') && !!D.vuelo; };
  async function recorta() {
    if (!S.im || !SAM.disponible()) return; const W = S.im.w, H = S.im.h, cj = S.L.caja ? [S.L.caja[0] * W, S.L.caja[1] * H, S.L.caja[2] * W, S.L.caja[3] * H] : null;
    if (!S.puntos.length && !cj) { S.sam = 'toca'; pinta(); return; }
    S.sam = 'mirando'; S.samErr = ''; pinta();
    try { const g = S.im.c.getContext('2d'), d = g.getImageData(0, 0, W, H).data; await SAM.mira({ w: W, h: H, d }, S.clave);
      // solo con el recuadro, SAM a veces se queda con lo que más resalta dentro (el maniquí, la persona…): se le dice además que la prenda está
      // en el centro del recuadro, arriba y abajo (16-10: con el recuadro solo, recortaba los brazos del maniquí en vez del vestido)
      const auto = !S.puntos.length && cj ? [[(cj[0] + cj[2]) / 2, cj[1] + 0.35 * (cj[3] - cj[1])], [(cj[0] + cj[2]) / 2, cj[1] + 0.72 * (cj[3] - cj[1])]] : null;
      const R = await SAM.recorta({ puntos: auto || S.puntos, etiquetas: auto ? [1, 1] : S.etiq, caja: cj }), w2 = Math.min(480, W), h2 = Math.round(H * w2 / W);
      S.mk = SAM.aMascara(R, w2, h2); S.sil = I.silueta(S.mk); S.sam = S.sil || S.mk ? 'lista' : 'mal'; S.samIou = R.iou; telaDe(); }
    catch (e) { S.sam = 'error'; S.samErr = e.message; }
    dibuja(); pinta();
  }
  // (18-10) 🧵 la TELA de la prenda recortada: lisa (su color) o con DIBUJO (cuadros, rayas…: la pieza que se repite, a su tamaño en el avatar)
  function telaDe() {
    S.tela = null; if (!S.im || !S.mk) return; try { const g = S.im.c.getContext('2d'), img = { w: S.im.w, h: S.im.h, d: g.getImageData(0, 0, S.im.w, S.im.h).data };
      const D = I.diseno(S.L, S.sil); let ancho = null; try { const M = o.cuerpo ? o.cuerpo(D.k, D.ajuste || 'normal') : null; ancho = M && (M.pecho || M.cadera) ? (M.pecho || M.cadera) / 2 : null; } catch (e) { }
      const T = TF.telaDeFoto(img, S.mk, { mmPorPx: TF.mmPorPxDe(S.mk, ancho, S.im.w / S.mk.w) }); if (!T) return;
      if (!T.liso) { const c = document.createElement('canvas'); c.width = T.tile.w; c.height = T.tile.h; c.getContext('2d').putImageData(new ImageData(T.tile.d, T.tile.w, T.tile.h), 0, 0); T.url = c.toDataURL('image/jpeg', 0.9); }
      S.tela = T; if (S.usarTela == null) S.usarTela = !T.liso; } catch (e) { S.tela = null; }
  }
  // ---------- el dibujo: la imagen, el recuadro de la IA y la silueta recortada ----------
  function dibuja() {
    if (!S.im) { lienzo.width = 10; lienzo.height = 10; return; }
    lienzo.width = S.im.w; lienzo.height = S.im.h; const g = lienzo.getContext('2d'); g.drawImage(S.im.c, 0, 0);
    if (S.pat) { PU.dibuja(g, S.pat, S.im.w, S.im.h); return; }
    if (S.mk) { const { w, h: hh, m: M } = S.mk, c = document.createElement('canvas'); c.width = w; c.height = hh; const cg = c.getContext('2d'), id = cg.createImageData(w, hh);
      for (let i = 0; i < M.length; i++) if (M[i]) { id.data[4 * i] = 0; id.data[4 * i + 1] = 205; id.data[4 * i + 2] = 230; id.data[4 * i + 3] = 80; }
      cg.putImageData(id, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, S.im.w, S.im.h); }
    if (S.prod && S.prod.FP && S.prod.estado === 'lista') { const Dd = DF.dibujo(S.prod.FP), E = S.prod.FP.E, lw = Math.max(2, S.im.w / 380), fs = Math.max(13, Math.round(S.im.w / 55));
      if (Dd) { g.save(); g.lineWidth = lw; g.strokeStyle = 'rgba(25,170,110,0.95)'; g.beginPath(); Dd.silueta.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
        g.font = '700 ' + fs + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        Dd.lineas.forEach(l => { g.strokeStyle = 'rgba(194,93,116,0.95)'; g.setLineDash([lw * 3, lw * 2]); g.beginPath(); g.moveTo(l.a[0], l.a[1]); g.lineTo(l.b[0], l.b[1]); g.stroke(); g.setLineDash([]);
          if (l.mm) { const t = l.t + ' ' + (l.mm * (l.plano ? 2 : 1) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' cm', x = (l.a[0] + l.b[0]) / 2, y = (l.a[1] + l.b[1]) / 2, wt = g.measureText(t).width + fs * 0.8;
            g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(x - wt / 2, y - fs * 0.75, wt, fs * 1.5); g.fillStyle = '#7a2e44'; g.fillText(t, x, y); } });
        Object.values(Dd.puntos).forEach(([x, y]) => { g.beginPath(); g.arc(x, y, lw * 2.2, 0, 7); g.fillStyle = '#19aa6e'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = lw * 0.8; g.stroke(); }); g.restore(); }
      return; }
    if (S.L.caja) { const [a, b, c2, d] = S.L.caja; g.save(); g.setLineDash([14, 10]); g.lineWidth = Math.max(2, S.im.w / 400); g.strokeStyle = ROSA; g.strokeRect(a * S.im.w, b * S.im.h, (c2 - a) * S.im.w, (d - b) * S.im.h); g.restore(); }
    S.puntos.forEach((p, i) => { g.beginPath(); g.arc(p[0] / S.im.w * lienzo.width, p[1] / S.im.h * lienzo.height, Math.max(6, S.im.w / 120), 0, 7); g.fillStyle = S.etiq[i] ? CIAN + '1)' : ROSA; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); });
  }
  // ---------- el lado: estado, preguntas, todo lo leído, lo que hará y lo que no ----------
  const estado = h('div.dw-cal-info.dw-insp-estado');
  function pintaEstado() {
    const s = Math.round((Date.now() - S.iaT0) / 1000);
    estado.replaceChildren(...(S.ia === 'sin' ? [h('b', '1 · La imagen'), h('div', 'Elige la foto de la prenda que has visto, o pégala: en internet, clic derecho en la foto → «Copiar imagen» y aquí Ctrl+V.')]
      : S.ia === 'mirando' ? [h('b', '🤖 La IA del PC está mirando la prenda… ' + s + ' s'), barra(s), h('div', 'Mientras, puedes ir contestando abajo: lo que elijas tú manda (la IA rellena solo lo que no hayas tocado).')]
      : S.ia === 'pc' ? [h('b', '🖥️ Se la he mandado al PC del taller… ' + s + ' s'), h('div', (S.iaPc || '') + ' Tarda 2–3 minutos (el PC tiene que estar encendido con el programa abierto). Mientras, puedes ir contestando abajo: lo que elijas tú manda.')]
      : S.ia === 'lista' ? [h('b', '✔ La IA ' + (S.iaMod && S.iaMod.pc ? 'del PC del taller ' : '') + 'ha leído la prenda (' + (S.iaMod && S.iaMod.guardada ? 'ya la había mirado: al momento' : Math.round(S.iaMs / 1000) + ' s') + ')'), h('div', (S.L.notas ? '«' + S.L.notas + '» ' : '') + 'Confirma lo de abajo con un toque y crea el patrón.'), S.iaMod && !S.iaMod.comercial ? h('div.dw-ojo', '⚠ Ha contestado ' + S.iaMod.t + ' (' + S.iaMod.licencia + '). Para vender, instala la que sí se puede usar (qwen3-vl:4b).') : null]
      : [h('b', 'La IA de visión no está en este aparato'), h('div', 'Dímelo tú con unos toques (abajo). En el PC del taller lo lee sola. (' + S.iaErr + ')')]).filter(Boolean));
  }
  // (18-10) cuánto falta, con lo que tardó DE VERDAD en este PC las veces anteriores (la primera vez, lo medido en la torre)
  function barra(s) { const T = Math.max(5, Math.round(V.tiempoEsperado() / 1000)), f = Math.min(0.97, s / T), q = Math.max(0, T - s);
    return h('div.dw-insp-barra', { title: 'Lo que suele tardar en este PC: ' + T + ' s' }, h('i', { style: { width: Math.round(f * 100) + '%' } }), h('span', q > 0 ? 'faltan ~' + q + ' s' : 'ya casi…')); }
  // el panel de la COPIA EXACTA (17-10)
  const AJUSTES = [['ajustada', 'Ceñida'], ['normal', 'Normal'], ['holgada', 'Holgada'], ['oversize', 'Oversize']], CATS = [['camiseta', 'Camiseta'], ['sudadera', 'Sudadera'], ['vestido', 'Vestido'], ['falda', 'Falda'], ['pantalon', 'Pantalón']];
  function panelProducto() {
    const P = S.prod, cm = v => (v / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });
    if (P.estado === 'midiendo') return h('div.dw-prod', h('h4', '📸 Copia exacta'), h('div.dw-ayuda', 'Fondo liso: recorto la prenda al píxel y la mido entera… (unos segundos)'));
    if (P.estado === 'error') return h('div.dw-prod.dw-ojo', h('h4', '📸 Copia exacta'), h('div.dw-ayuda', 'No he podido medirla: ' + P.error + ' Puedes seguir con lo que lea la IA (abajo).'));
    const FP = P.FP, Rz = DF.resumen(FP), fam = famDe(FP), X = FP.extra || {}, esc = P.escala, cat = FP.categoria || catDe(FP), iaCat = S.L.campos.categoria && S.L.campos.categoria.ia ? S.L.campos.categoria.v : null;
    const ICO = { observado: '👁', mano: '✋', confirmada: '✔', inferido: '💭', confirmar: '⚠' }, hay = Rz.k && !Rz.falta;
    const tabla = PR.TABLA[fam] || [], kT = esc.k && tabla.some(x => x[0] === esc.k) ? esc.k : (tabla[0] || [])[0];
    const vista = [X.color ? h('span.dw-prod-tag', h('i', { style: { background: X.color } }), 'Color ' + X.color) : null, Rz.k === 'sudadera' || (FP.T.etapas.RASGOS.datos.extra || {}).capucha ? h('span.dw-prod-tag', '🧢 Capucha') : null,
      X.cremallera ? h('span.dw-prod-tag', '🤐 Cremallera delante') : null, X.puno ? h('span.dw-prod-tag', '⭕ Puños de punto') : null, X.cintura ? h('span.dw-prod-tag', '〰 Cintura de punto') : null,
      X.estampado ? h('span.dw-prod-tag', '🖼 Estampado del pecho (se estampa en el delantero)') : null].filter(Boolean);
    return h('div.dw-prod', h('h4', '📸 Copia exacta de la foto de producto'), h('div.dw-ayuda', 'Fondo ' + (P.fondo.blanco ? 'blanco' : 'liso') + ': la he recortado al píxel y he medido su forma entera (las rayas de la foto). Así el patrón COPIA esta prenda: sus proporciones, sus largos, su manga.'),
      h('div.dw-prod-g', h('b', 'Qué prenda es'), h('div.dw-chips', CATS.map(([k, t]) => h('button.dw-chip' + (cat === k ? '.on' : ''), { type: 'button', 'data-prod-cat': k, onclick: () => { if (k !== cat) otraPrenda(k); } }, t))),
        iaCat && iaCat !== cat && CATS.some(c => c[0] === iaCat) ? h('small.dw-insp-ia', '🤖 la IA dice: ' + I.nombreDe('categoria', iaCat) + ' ', h('a', { href: '#', onclick: e => { e.preventDefault(); otraPrenda(iaCat); } }, 'usar eso')) : null),
      h('div.dw-prod-g', h('b', 'Tamaño'), h('div.dw-chips', h('button.dw-chip' + (esc.modo === 'avatar' ? '.on' : ''), { type: 'button', 'data-prod-escala': 'avatar', onclick: () => { esc.modo = 'avatar'; reEscala(); } }, '🧍 A la talla de mi avatar'), h('button.dw-chip' + (esc.modo === 'tabla' ? '.on' : ''), { type: 'button', 'data-prod-escala': 'tabla', onclick: () => { esc.modo = 'tabla'; esc.k = kT; pinta(); } }, '📏 Con la tabla de tallas')),
        esc.modo === 'avatar' ? h('div.dw-chips', AJUSTES.map(([k, t]) => h('button.dw-chip' + (esc.ajuste === k ? '.on' : ''), { type: 'button', 'data-prod-ajuste': k, onclick: () => { esc.ajuste = k; reEscala(); } }, t)))
          : h('div.dw-prod-tabla', h('select.dw-sel', { 'data-prod-tk': '1', onchange: e => { esc.k = e.target.value; if (esc.mm > 0) reEscala(); else pinta(); } }, tabla.map(([k, t]) => h('option', { value: k, selected: k === kT }, t))),
            h('span.dw-num', h('input', { type: 'number', step: 0.5, min: 5, placeholder: 'cm', 'data-prod-mm': '1', value: esc.mm ? esc.mm / 10 : '', onchange: e => { const v = Number(String(e.target.value).replace(',', '.')); esc.k = esc.k || kT; esc.mm = v > 0 ? v * 10 : 0; reEscala(); } }), h('span.u', 'cm')),
            PR.ES_ANCHO[kT] ? h('label.dw-ayuda', h('input', { type: 'checkbox', checked: !!esc.contorno, onchange: e => { esc.contorno = e.target.checked; if (esc.mm > 0) reEscala(); } }), ' la tabla da el contorno (la vuelta entera), no el ancho plano') : null),
        h('small.dw-ayuda', DF.motivo(FP.T) ? '⚠ ' + (esc.modo === 'tabla' && !(esc.mm > 0) ? 'Escribe la medida de la tabla.' : DF.motivo(FP.T)) : PR.textoEscala(FP))),
      vista.length ? h('div.dw-prod-g', h('b', 'Lo que he visto'), h('div.dw-prod-tags', vista)) : null,
      hay ? h('div.dw-prod-g', h('b', Rz.t + ' · ' + (Rz.valida || '')), h('ul.dw-prod-med', Rz.filas.filter(f => f.ver !== 'inferido').map(f => h('li', { 'data-medida': f.k, title: f.como || '' }, h('span', ICO[f.ver] || '·'), ' ' + f.t + ': ', h('b', cm(f.v) + ' cm'), f.ver === 'confirmar' ? h('small', ' (revísala luego en la ficha)') : null))),
        h('small.dw-ayuda', '👁 medida en la foto · ⚠ medida pero poco segura · lo que no se ve (la espalda, el fondo de la capucha…) lo pone la plantilla.')) : null,
      DF.avisos(FP).filter(a => !/Revisa antes/.test(a)).slice(0, 3).map(a => h('div.dw-ayuda.dw-ojo', a)),
      btn('👗 Crear el patrón COPIADO', creaExacta, { cls: 'primary dw-prod-crear', disabled: !hay, title: 'Una prenda nueva en el 3D y el 2D con la forma de la foto' }));
  }
  function pinta() {
    if (S.pat) { lado.replaceChildren(h('div.dw-cal-pasos', ['La imagen', 'Las piezas', 'Prenda'].map((t, i) => h('span' + (i === (S.pat.af ? 2 : 1) ? '.on' : ''), h('b', String(i + 1)), t))),
      PU.panel(S.pat, handPat), h('div.dw-insp-botones', btn('🖼 Otra imagen…', elegir, { cls: 'ghost' }), btn('No es un patrón: mírala como una prenda', noEsPatron, { cls: 'ghost dw-pat-no' }))); return; }
    if (S.prod) { pintaProd(); return; }
    pintaNormal();
  }
  // (17-10) con la copia exacta: su panel arriba y, plegado debajo, lo de siempre (solo lo que lee la IA, en la forma de la plantilla)
  function pintaProd() { pintaNormal(); const resto = [...lado.childNodes].filter(n => !n.classList || !n.classList.contains('dw-cal-pasos'));
    const det = h('details.dw-prod-ia', h('summary', 'Sin copiar la forma: solo lo que lee la IA (la plantilla a tu medida)')); resto.slice(2).forEach(n => det.append(n));
    lado.replaceChildren(...resto.slice(0, 2), panelProducto(), det); }
  // (18-10) 📋 qué fotos sirven (y qué hace con cada una)
  const GUIA = h('details.dw-insp-guia', h('summary', '📋 Qué fotos sirven'), h('ul',
    h('li', h('b', 'Mejor: '), 'la prenda entera, de frente, de pie, sin taparla con los brazos ni el bolso, y con luz.'),
    h('li', h('b', 'Fondo blanco o liso '), '(foto de producto): copia EXACTA de su forma.'),
    h('li', h('b', 'Prenda plana con un folio A4 al lado: '), 'medidas reales (pestaña 📷 Foto).'),
    h('li', h('b', 'Un patrón '), '(piezas dibujadas o escaneadas): «📐 Patrón desde una imagen».'),
    h('li', h('b', 'Persona sentada, de lado, con capas o un dibujo: '), 'sirve, pero confirma el largo y el ajuste (te lo digo).')));
  function avisosFoto() {
    const F = S.L.foto || {}, A = [];
    if (F.tipo === 'patron') A.push(['📐', 'Parece un patrón dibujado: «📐 Patrón desde una imagen» saca sus piezas y medidas.']);
    if (F.tipo === 'dibujo') A.push(['✏️', 'Es un dibujo: sus proporciones son de ilustración; los largos se ponen en tu avatar.']);
    if (F.sentada) A.push(['🪑', 'Está sentada: el largo y el ajuste pueden engañar; confírmalos abajo.']);
    if (F.espejo) A.push(['🪞', 'Selfie de espejo: la foto va al revés (para el patrón, da igual).']);
    if (F.tapada) A.push(['✋', 'Algo tapa parte de la prenda: lo que no se ve lo pone la plantilla.']);
    if (F.cortada) A.push(['✂', 'La foto corta la prenda: no se ve dónde acaba; confirma el largo.']);
    if (S.im && Math.max(S.im.w, S.im.h) < 500) A.push(['🔍', 'La foto es pequeña: los detalles pueden no verse.']);
    if (F.otras && F.otras.length) A.push(['👀', 'También veo: ' + F.otras.join(', ') + '. Si quieres hacer otra, tócala en la foto y elige abajo qué prenda es.']);
    return A.length ? h('div.dw-insp-avisos', A.map(([e, t]) => h('div', h('span', e), ' ' + t))) : null;
  }
  function pintaNormal() {
    pintaEstado(); const D = I.diseno(S.L, S.sil), L = S.L, nombre = c => (I.CAMPOS.find(x => x[0] === c) || [, c])[1];
    const SN = [['no', 'No'], ['si', 'Sí']], opsDe = c => ['varillas', 'tirantes', 'capucha'].includes(c) ? SN : I.VALORES[c] || [];
    const chips = (c, ops) => h('div.dw-chips', ops.map(([v, t]) => h('button.dw-chip' + (L.campos[c] && L.campos[c].v === v ? '.on' : ''), { type: 'button', 'data-campo': c, 'data-valor': v, onclick: () => { I.cambia(L, c, v); L.campos[c].toco = true; dibuja(); pinta(); if ((c === 'falda' || c === 'categoria') && !S.prod && SAM.disponible() && S.sam === 'sin' && necesitaSilueta()) recorta(); } }, t)));
    const deIA = c => L.campos[c] && L.campos[c].ia && L.campos[c].v != null ? h('small.dw-insp-ia', '🤖 la IA dice: ' + I.nombreDe(c, L.campos[c].v) + (L.campos[c].duda ? ' (no está segura)' : '')) : null;
    // lo que hay que CONFIRMAR (lo que la IA duda y lo que suele fallar: el largo y la falda), arriba
    (D.preguntas.length || S.ia === 'lista' ? D.preguntas : ['categoria', 'largo']).forEach(c => { if (!S.vistas.includes(c)) S.vistas.push(c); });
    const pregs = S.vistas, faltan = D.preguntas.filter(c => !(L.campos[c] && L.campos[c].toco)), toca = I.TOCA[D.k] || I.CAMPOS.map(x => x[0]);
    // la FICHA entera, por partes: todo lo que cambia el patrón de esta prenda
    const ficha = I.FICHA.map(([t, cs]) => [t, cs.filter(c => toca.includes(c) && !pregs.includes(c))]).filter(([, cs]) => cs.length);
    const silTxt = !D.vuelo ? null : S.sil ? '✂ Vuelo de la falda: medido en la silueta (el bajo ' + S.sil.vueloRel.toFixed(2).replace('.', ',') + ' × la cadera).' : S.sam === 'mirando' ? '✂ Recortando la prenda para medir su vuelo… (la primera vez, unos segundos)' : S.sam === 'error' ? '✂ No se ha podido recortar (' + S.samErr + '): el vuelo sale normal.' : S.sam === 'toca' ? '✂ Toca la prenda en la imagen para recortarla y medir su vuelo.' : null;
    const T = S.tela, telaBox = T ? h('div.dw-insp-tela', T.liso ? h('i', { style: { background: T.color } }) : h('img', { src: T.url, alt: 'Tela de la foto' }),
      h('div', h('b', T.liso ? '🧵 Tela lisa, color ' + T.color : '🧵 La tela de la foto' + (T.mm ? ' (cada cuadro ~' + Math.round(T.mm / 10) + ' cm)' : '')),
        !T.liso ? h('label.dw-ayuda', h('input', { type: 'checkbox', checked: S.usarTela !== false, 'data-usar-tela': '1', onchange: e => { S.usarTela = e.target.checked; } }), ' Ponerla en el 3D (su dibujo, a su tamaño)') : h('div.dw-ayuda', 'Se pone su color.'))) : null;
    lado.replaceChildren(
      h('div.dw-cal-pasos', ['La imagen', 'Confirma', 'Patrón'].map((t, i) => h('span' + (i === (S.im ? (faltan.length ? 1 : 2) : 0) ? '.on' : ''), h('b', String(i + 1)), t))),
      estado,
      h('div.dw-insp-botones', btn(S.im ? '🖼 Otra imagen…' : '🖼 Elegir la imagen…', elegir, { cls: S.im ? 'ghost' : 'primary' }), S.im && S.ia === 'no' ? btn('🤖 Probar otra vez la IA', mira, { cls: 'ghost' }) : null),
      S.im ? null : GUIA, S.im ? avisosFoto() : null,
      S.im ? h('div.dw-insp-preg', h('h4', faltan.length ? (faltan.length === 1 ? 'Confírmame 1 cosa' : 'Confírmame ' + faltan.length + ' cosas') : '✔ Lo importante, confirmado'),
        pregs.map(c => h('div.dw-insp-p' + (faltan.includes(c) ? '.dw-insp-duda' : ''), h('label', nombre(c)), deIA(c), chips(c, opsDe(c))))) : null,
      S.im ? h('details.dw-insp-ficha', { open: true }, h('summary', '🧵 La ficha de la prenda (cómo acaba: cuello, mangas, puños, bajo, cierre…)'),
        ficha.map(([t, cs]) => h('div.dw-insp-grupo', h('h5', t), cs.map(c => h('div.dw-insp-p', h('label', nombre(c), L.campos[c] && L.campos[c].toco ? h('small', ' ✋') : null), deIA(c), chips(c, opsDe(c)))))),
        telaBox, L.detalles.length ? h('div.dw-ayuda', 'Detalles que ve: ' + L.detalles.join(', ') + '.') : null) : null,
      S.im ? h('div.dw-insp-plan', h('h4', '👗 ' + D.nombre), h('div.dw-ayuda', 'Plantilla ' + BL.BLOQUES[D.k].t.toLowerCase() + ' · ajuste ' + D.ajuste + (D.largo ? ' · bajo: ' + I.nombreDe('largo', D.largo).toLowerCase() : '') + ' · a la medida de tu avatar.'),
        D.hace.length ? h('ul.dw-insp-si', D.hace.map(t => h('li', t))) : null, silTxt ? h('div.dw-ayuda', silTxt) : null,
        D.noHace.length ? [h('div.dw-ayuda.dw-ojo', 'Lo que el patrón todavía NO hace (no se inventa):'), h('ul.dw-insp-no', D.noHace.map(t => h('li', t)))] : null,
        btn('👗 Crear el patrón en mi avatar', () => crea(D), { cls: 'primary dw-insp-crear', title: 'Una prenda nueva en el 3D y el 2D, a la medida del avatar' })) : null,
      S.im ? GUIA : null,
      h('div.dw-ayuda', 'La imagen no sale de este aparato: la mira la IA de tu PC. Lo que la IA no ve seguro te lo pregunta; lo que el patrón aún no sabe hacer, te lo dice.'));
  }
  // el COLOR de la prenda: la media de lo recortado (o del centro del recuadro de la IA), sin los brillos ni las sombras más fuertes
  function colorDe() {
    if (!S.im) return null; const W = S.im.w, H = S.im.h, d = S.im.c.getContext('2d').getImageData(0, 0, W, H).data, L = [];
    const toma = (x, y) => { const i = (Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x)))) * 4; L.push([d[i], d[i + 1], d[i + 2]]); };
    if (S.mk) { const { w, h: hh, m: M } = S.mk; for (let y = 0; y < hh; y += 2) for (let x = 0; x < w; x += 2) if (M[y * w + x]) toma((x + 0.5) * W / w, (y + 0.5) * H / hh); }
    else if (S.L.caja) { const [a, b, c, e] = S.L.caja; for (let t = 0; t < 400; t++) toma((a + (c - a) * (0.4 + 0.2 * Math.random())) * W, (b + (e - b) * (0.3 + 0.4 * Math.random())) * H); }
    if (L.length < 20) return null; L.sort((p, q) => p[0] + p[1] + p[2] - q[0] - q[1] - q[2]); const C = L.slice(Math.floor(L.length * 0.2), Math.ceil(L.length * 0.8)), n = C.length;
    return '#' + [0, 1, 2].map(k => Math.round(C.reduce((a, c) => a + c[k], 0) / n).toString(16).padStart(2, '0')).join('');
  }
  function crea(D) {
    // (16-10, probado como en el iPad: sin IA salían 6 preguntas y no dejaba crear; ahora basta con la PRENDA y el LARGO: lo demás que no se
    //  haya dicho sale con lo normal —manga corta, ajuste normal, escote redondo, falda recta— y se cambia luego en la ficha)
    const faltan = ['categoria', 'largo'].filter(c => !S.L.campos[c] || S.L.campos[c].v == null);
    if (faltan.length) return toast('Dime antes: ' + faltan.map(c => (I.CAMPOS.find(x => x[0] === c) || [, c])[1].toLowerCase()).join(' y ') + '.', 'bad');
    if (o.listo && !o.listo()) return toast('Espera un momento: el avatar se está preparando (para medir los largos en su cuerpo).', 'bad');
    const T = S.tela, telaFoto = T && !T.liso && S.usarTela !== false && T.url ? { url: T.url, mm: T.mm || 150, que: (S.L.campos.tela && S.L.campos.tela.v) || 'dibujo' } : null;
    const R = o.crear(D, S.L, { color: (T && T.liso && T.color) || colorDe(), telaFoto }); if (R && R.ok === false) return toast(R.error || 'No se ha podido crear el patrón.', 'bad', 9000);
    ultima = { url: S.url, L: S.L, sil: S.sil }; toast('👗 ' + D.nombre + ': cosiéndose en tu avatar…', 'ok', 5000); m.close();
  }
  dibuja(); pinta(); if (archivo) carga(archivo);
  const api = { carga, estado: () => S, cierra: () => m.close() }; window.__inspira = api; // (para las pruebas: test/e2e_drew_inspira.js)
  return api;
}
