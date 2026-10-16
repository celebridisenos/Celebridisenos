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

const MAXL = 1600, CIAN = 'rgba(0,205,230,', ROSA = '#c25d74';
let ultima = null; // la última imagen de esta sesión (para volver a abrirla): { url, L, sil }
export const ultimaImagen = () => ultima;

// o = { crear(D, L) → { ok, error }, listo() → true si el avatar ya está (para medir los largos en él) }
export function abre(o, archivo) {
  const S = { im: null, url: null, L: I.lee(null), sil: null, mk: null, ia: 'sin', iaMs: 0, iaT0: 0, iaMod: null, iaErr: '', sam: 'sin', samErr: '', puntos: [], etiq: [], ab: null, reloj: null, clave: '', vistas: [] };
  ['categoria', 'largo', 'manga', 'escote', 'ajuste', 'falda', 'cierre', 'varillas', 'tirantes', 'capucha', 'bolsillos'].forEach(c => { S.L.campos[c] = { v: null, ia: false, duda: true }; });
  S.L.campos.varillas.v = 'no'; S.L.campos.tirantes.v = 'no'; S.L.campos.capucha.v = 'no'; S.L.campos.cierre.v = null;
  const lienzo = h('canvas.dw-insp-img'), caja = h('div.dw-insp-caja', lienzo), lado = h('div.dw-cal-lado.dw-insp-lado');
  const m = modal('🌐 Diseñar desde una imagen', h('div.dw-cal.dw-insp', lado, caja), null, { size: 'full', onclose: () => { cierra(); } });
  m.el.classList.add('dw-cal-m');
  const elegir = () => { const i = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files[0]; if (f) carga(f); i.remove(); } }); document.body.append(i); i.click(); };
  const pega = e => { const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => /^image\//.test(x.type)); if (!it) return; e.preventDefault(); carga(it.getAsFile()); };
  document.addEventListener('paste', pega);
  caja.addEventListener('dragover', e => { e.preventDefault(); caja.classList.add('soltar'); }); caja.addEventListener('dragleave', () => caja.classList.remove('soltar'));
  caja.addEventListener('drop', e => { e.preventDefault(); caja.classList.remove('soltar'); const f = [...(e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (f) carga(f); });
  lienzo.addEventListener('pointerdown', e => { if (!S.im) return; const r = lienzo.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * lienzo.width, y = (e.clientY - r.top) / r.height * lienzo.height;
    S.puntos.push([x / lienzo.width * S.im.w, y / lienzo.height * S.im.h]); S.etiq.push(e.shiftKey || e.button === 2 ? 0 : 1); recorta(); });
  lienzo.addEventListener('contextmenu', e => e.preventDefault());
  function cierra() { document.removeEventListener('paste', pega); if (S.ab) S.ab.abort(); clearInterval(S.reloj); }

  // ---------- la imagen ----------
  async function carga(f) {
    try { const u = URL.createObjectURL(f), im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = () => rej(new Error('No se puede leer esa imagen.')); x.src = u; });
      const k = Math.min(1, MAXL / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), hh = Math.round(im.naturalHeight * k), c = document.createElement('canvas'); c.width = w; c.height = hh;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.drawImage(im, 0, 0, w, hh);
      S.im = { c, w, h: hh }; S.url = u; S.vistas = []; S.clave = f.name + ':' + f.size + ':' + Date.now(); S.mk = null; S.sil = null; S.sam = 'sin'; S.puntos = []; S.etiq = []; SAM.olvida();
      Object.values(S.L.campos).forEach(x => { if (x.ia) Object.assign(x, { v: null, ia: false, duda: true }); }); S.L.caja = null; S.L.detalles = []; S.L.notas = ''; S.L.confianza = 0;
      dibuja(); pinta(); mira(); }
    catch (e) { toast(e.message, 'bad'); }
  }
  // ---------- la IA de visión (en el PC) ----------
  async function mira() {
    if (S.ab) S.ab.abort(); S.ab = new AbortController(); const ab = S.ab; S.ia = 'mirando'; S.iaT0 = Date.now(); S.iaErr = ''; pinta();
    clearInterval(S.reloj); S.reloj = setInterval(() => { if (S.ia === 'mirando') pintaEstado(); }, 1000);
    try { const R = await V.pregunta(I.PREGUNTA, V.jpeg(S.im.c), { signal: ab.signal }); if (ab.signal.aborted) return;
      const N = I.lee(R.j, { modelo: R.modelo });
      // lo que ella ya ha contestado MANDA; lo demás, lo que dice la IA
      Object.entries(N.campos).forEach(([c, x]) => { const y = S.L.campos[c]; if (y && y.ia === false && y.toco) return; S.L.campos[c] = x; });
      Object.assign(S.L, { caja: N.caja, detalles: N.detalles, notas: N.notas, confianza: N.confianza, modelo: N.modelo });
      S.vistas = S.vistas.filter(c => S.L.campos[c] && S.L.campos[c].toco); // (las preguntas de antes de leerla, fuera, salvo las ya contestadas)
      S.ia = 'lista'; S.iaMs = R.ms; S.iaMod = R; clearInterval(S.reloj); dibuja(); pinta();
      if (necesitaSilueta() && SAM.disponible() && S.sam === 'sin') recorta();
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
      S.mk = SAM.aMascara(R, w2, h2); S.sil = I.silueta(S.mk); S.sam = S.sil ? 'lista' : 'mal'; S.samIou = R.iou; }
    catch (e) { S.sam = 'error'; S.samErr = e.message; }
    dibuja(); pinta();
  }
  // ---------- el dibujo: la imagen, el recuadro de la IA y la silueta recortada ----------
  function dibuja() {
    if (!S.im) { lienzo.width = 10; lienzo.height = 10; return; }
    lienzo.width = S.im.w; lienzo.height = S.im.h; const g = lienzo.getContext('2d'); g.drawImage(S.im.c, 0, 0);
    if (S.mk) { const { w, h: hh, m: M } = S.mk, c = document.createElement('canvas'); c.width = w; c.height = hh; const cg = c.getContext('2d'), id = cg.createImageData(w, hh);
      for (let i = 0; i < M.length; i++) if (M[i]) { id.data[4 * i] = 0; id.data[4 * i + 1] = 205; id.data[4 * i + 2] = 230; id.data[4 * i + 3] = 80; }
      cg.putImageData(id, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, S.im.w, S.im.h); }
    if (S.L.caja) { const [a, b, c2, d] = S.L.caja; g.save(); g.setLineDash([14, 10]); g.lineWidth = Math.max(2, S.im.w / 400); g.strokeStyle = ROSA; g.strokeRect(a * S.im.w, b * S.im.h, (c2 - a) * S.im.w, (d - b) * S.im.h); g.restore(); }
    S.puntos.forEach((p, i) => { g.beginPath(); g.arc(p[0] / S.im.w * lienzo.width, p[1] / S.im.h * lienzo.height, Math.max(6, S.im.w / 120), 0, 7); g.fillStyle = S.etiq[i] ? CIAN + '1)' : ROSA; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); });
  }
  // ---------- el lado: estado, preguntas, todo lo leído, lo que hará y lo que no ----------
  const estado = h('div.dw-cal-info.dw-insp-estado');
  function pintaEstado() {
    const s = Math.round((Date.now() - S.iaT0) / 1000);
    estado.replaceChildren(...(S.ia === 'sin' ? [h('b', '1 · La imagen'), h('div', 'Elige la foto de la prenda que has visto, o pégala: en internet, clic derecho en la foto → «Copiar imagen» y aquí Ctrl+V.')]
      : S.ia === 'mirando' ? [h('b', '🤖 La IA del PC está mirando la prenda… ' + s + ' s'), h('div', 'Tarda 1–2 minutos. Mientras, puedes ir contestando abajo: lo que elijas tú manda.')]
      : S.ia === 'lista' ? [h('b', '✔ La IA ha leído la prenda (' + Math.round(S.iaMs / 1000) + ' s)'), h('div', (S.L.notas ? '«' + S.L.notas + '» ' : '') + 'Confirma lo de abajo con un toque y crea el patrón.'), S.iaMod && !S.iaMod.comercial ? h('div.dw-ojo', '⚠ Ha contestado ' + S.iaMod.t + ' (' + S.iaMod.licencia + '). Para vender, instala la que sí se puede usar (qwen3-vl:4b).') : null]
      : [h('b', 'La IA de visión no está en este aparato'), h('div', 'Dímelo tú con unos toques (abajo). En el PC del taller lo lee sola. (' + S.iaErr + ')')]).filter(Boolean));
  }
  function pinta() {
    pintaEstado(); const D = I.diseno(S.L, S.sil), L = S.L, nombre = c => (I.CAMPOS.find(x => x[0] === c) || [, c])[1];
    const chips = (c, ops) => h('div.dw-chips', ops.map(([v, t]) => h('button.dw-chip' + (L.campos[c] && L.campos[c].v === v ? '.on' : ''), { type: 'button', 'data-campo': c, 'data-valor': v, onclick: () => { I.cambia(L, c, v); L.campos[c].toco = true; dibuja(); pinta(); if (c === 'falda' || c === 'categoria') { if (necesitaSilueta() && !S.mk && S.im && S.sam === 'sin') recorta(); } } }, t)));
    const deIA = c => L.campos[c] && L.campos[c].ia && L.campos[c].v != null ? h('small.dw-insp-ia', '🤖 la IA dice: ' + I.nombreDe(c, L.campos[c].v)) : null;
    const opsDe = c => c === 'falda' ? I.VALORES.falda : c === 'categoria' ? I.VALORES.categoria : I.VALORES[c] || [];
    // (las preguntas que ya salieron se quedan a la vista con lo que contestó; las nuevas se añaden; como mucho 3 + la que haga falta)
    (D.preguntas.length || S.ia === 'lista' ? D.preguntas : ['categoria', 'largo']).forEach(c => { if (!S.vistas.includes(c)) S.vistas.push(c); });
    const pregs = S.vistas, faltan = D.preguntas.filter(c => !(L.campos[c] && L.campos[c].toco));
    const resto = I.CAMPOS.map(([c]) => c).filter(c => !pregs.includes(c));
    const sel = c => h('select.dw-sel', { 'data-campo': c, onchange: e => { I.cambia(L, c, e.target.value || null); L.campos[c].toco = true; dibuja(); pinta(); } }, [h('option', { value: '' }, '—')].concat(opsDe(c).map(([v, t]) => h('option', { value: v, selected: L.campos[c] && L.campos[c].v === v }, t))));
    const silTxt = !D.vuelo ? null : S.sil ? '✂ Vuelo de la falda: medido en la silueta (el bajo ' + S.sil.vueloRel.toFixed(2).replace('.', ',') + ' × la cadera).' : S.sam === 'mirando' ? '✂ Recortando la prenda para medir su vuelo… (la primera vez, unos segundos)' : S.sam === 'error' ? '✂ No se ha podido recortar (' + S.samErr + '): el vuelo queda supuesto.' : '✂ Vuelo supuesto: toca la prenda en la foto para medirlo de su silueta.';
    lado.replaceChildren(
      h('div.dw-cal-pasos', ['La imagen', 'Confirma', 'Patrón'].map((t, i) => h('span' + (i === (S.im ? (faltan.length ? 1 : 2) : 0) ? '.on' : ''), h('b', String(i + 1)), t))),
      estado,
      h('div.dw-insp-botones', btn(S.im ? '🖼 Otra imagen…' : '🖼 Elegir la imagen…', elegir, { cls: S.im ? 'ghost' : 'primary' }), S.im && S.ia === 'no' ? btn('🤖 Probar otra vez la IA', mira, { cls: 'ghost' }) : null),
      S.im ? h('div.dw-insp-preg', h('h4', faltan.length ? (faltan.length === 1 ? 'Confírmame 1 cosa' : 'Confírmame ' + faltan.length + ' cosas') : '✔ Todo confirmado'),
        pregs.map(c => h('div.dw-insp-p', h('label', nombre(c)), deIA(c), chips(c, opsDe(c))))) : null,
      S.im ? h('details.dw-insp-todo', h('summary', 'Todo lo que ha leído (cámbialo si quieres)'), h('div.dw-insp-rej', resto.map(c => h('div.dw-fila', h('label', nombre(c), L.campos[c] && L.campos[c].ia ? h('small', ' 🤖') : L.campos[c] && L.campos[c].toco ? h('small', ' ✋') : null), sel(c)))),
        L.detalles.length ? h('div.dw-ayuda', 'Detalles que ve: ' + L.detalles.join(', ') + '.') : null) : null,
      S.im ? h('div.dw-insp-plan', h('h4', '👗 ' + D.nombre), h('div.dw-ayuda', 'Plantilla ' + BL.BLOQUES[D.k].t.toLowerCase() + ' · ajuste ' + D.ajuste + (D.largo ? ' · bajo: ' + I.nombreDe('largo', D.largo).toLowerCase() : '') + ' · a la medida de tu avatar.'),
        D.hace.length ? h('ul.dw-insp-si', D.hace.map(t => h('li', t))) : null, silTxt ? h('div.dw-ayuda', silTxt) : null,
        D.noHace.length ? [h('div.dw-ayuda.dw-ojo', 'Lo que el patrón todavía NO hace (no se inventa):'), h('ul.dw-insp-no', D.noHace.map(t => h('li', t)))] : null,
        btn('👗 Crear el patrón en mi avatar', () => crea(D), { cls: 'primary dw-insp-crear', title: 'Una prenda nueva en el 3D y el 2D, a la medida del avatar' })) : null,
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
    if (D.preguntas.some(c => S.L.campos[c] && S.L.campos[c].v == null)) return toast('Falta contestar: ' + D.preguntas.filter(c => S.L.campos[c].v == null).map(c => I.nombreDe(c, '') || c).join(', '), 'bad');
    if (o.listo && !o.listo()) return toast('Espera un momento: el avatar se está preparando (para medir los largos en su cuerpo).', 'bad');
    const R = o.crear(D, S.L, { color: colorDe() }); if (R && R.ok === false) return toast(R.error || 'No se ha podido crear el patrón.', 'bad', 9000);
    ultima = { url: S.url, L: S.L, sil: S.sil }; toast('👗 ' + D.nombre + ': cosiéndose en tu avatar…', 'ok', 5000); m.close();
  }
  dibuja(); pinta(); if (archivo) carga(archivo);
  const api = { carga, estado: () => S, cierra: () => m.close() }; window.__inspira = api; // (para las pruebas: test/e2e_drew_inspira.js)
  return api;
}
