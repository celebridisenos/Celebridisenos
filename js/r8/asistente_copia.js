// ================= 13-10-2026 · 📸 ASISTENTE «COPIAR CON FOTOS»: frente + lado → solo mides lo que te marco =================
// La dueña: «que te pregunte foto por lados, cara de frente, y que automáticamente haga todo, que solo tenga que calibrar lo que me
// pida con flechas o círculos» y «tiene que ser con cualquier foto».
//  1) FOTO DE FRENTE (mirando los dientes): en el PC, la IA de la torre (BiRefNet) separa la pieza del fondo, sea cual sea; en el
//     móvil, con un fondo liso. Se cuentan los dientes, se busca el centro y el agujero, y se DIBUJAN SOBRE LA FOTO las medidas que
//     hacen falta: ① Ø exterior (de punta a punta), ② la medida sobre k dientes (los k dientes que hay que abrazar, señalados),
//     ③ el agujero (un círculo).
//  2) FOTO DE LADO (de canto, con el eje hacia arriba; se puede saltar si es plano): se ven los PISOS (dientes, buje, collar…) y se
//     marcan con flechas ④ grosor de los dientes ↕, ⑤ alto del buje ↕, ⑥ Ø del buje ↔.
//  3) Con lo que midas se rellena «Copiar uno que ya tengo». Lo que NO midas y se pueda sacar de la foto (escalada con tu Ø exterior)
//     va marcado «≈ de la foto» para que lo confirmes: nada se da por medido si no lo has medido tú.
// Todo en este aparato: las fotos no salen a ningún sitio (la IA de fondo es la de tu torre).
import { h, mount, btn, toast } from '../ui.js';
import * as FM from './foto_medida.js';
import * as EC from './engranaje_copia.js';
import * as GF from './guia_fotos.js'; // 14-10-2026 · 📷 dibujos de dónde va el móvil en cada foto, y consejos

const n2 = (x, d = 2) => x == null || !isFinite(x) ? '—' : Number(x).toLocaleString('es-ES', { maximumFractionDigits: d });
const COL = { linea: '#ffd23f', k: '#2dd4bf', ag: '#f472b6', piso: '#a78bfa', contorno: 'rgba(45,212,191,.9)' };

// ---------- separar la pieza del fondo: IA de la torre si está; si no, por contraste ----------
// (13-10-2026 · 🩹) Antes: la IA de la torre si estaba, o un corte de claro/oscuro. Ahora la foto pasa primero por el RESTAURADOR
// (foto_restaura.js: fondo con textura, luz desigual, sombras, brillos; recorte y ampliación a la pieza; la IA solo si hace falta) y
// se mide sobre su máscara de borde suave. «file» puede ser también una foto ya restaurada y retocada a mano: { img, mascara, rest }.
// Si el restaurador no encuentra pieza, se intenta como antes.
export async function silueta(file, o = {}) {
  let R = file && file.img && file.mascara ? file : null;
  if (!R && o.restaurar !== false) { try { const FRU = await import('./foto_restaura_ui.js'), I0 = await FM.cargaArchivo(file, 2400); R = await FRU.restauraImagen(I0.id, { alEsperar: o.alEsperar }); } catch (e) { R = null; } }
  if (R) {
    const D = FM.pixeles(await FM.imagenDe(R.mascara)), C = FM.contornos(D, { umbral: 127.5, oscura: false, suave: true, tol: 0.6 }), pz = FM.pieza(C.anillos, p => p, 30);
    if (pz) { const A0 = Math.abs(FM.area(pz.fuera)); pz.agujeros = pz.agujeros.filter(r => Math.abs(FM.area(r)) >= Math.max(30, 0.0015 * A0)); }
    if (pz) return { url: FM.IMAGENES.get(R.img).url, W: D.width, H: D.height, D, C, pz, ia: !!(R.rest && R.rest.conIA), R, rest: R.rest };
  }
  if (file && file.img) throw new Error('No encuentro la pieza en la foto.');
  const I = await FM.cargaArchivo(file, 1800), im = await FM.imagenDe(I.id);
  let D = FM.pixeles(im), ia = false;
  try {
    const d = await import('../desktop.js').catch(() => null);
    if (d && d.desktop && d.desktop.on && d.desktop.motorFondo) {
      const blob = await (await fetch(I.url)).blob(), r = await d.desktop.motorFondo(blob);
      if (r && r.ok && r.mascara) { const mi = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = rej; x.src = r.mascara; }); const c = document.createElement('canvas'); c.width = D.width; c.height = D.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(mi, 0, 0, D.width, D.height); D = g.getImageData(0, 0, D.width, D.height); ia = true; }
    }
  } catch (e) { /* sin la IA: por contraste */ }
  // los agujeros pequeños cuentan (el de una sierra o un llavero), pero no las motas: un agujero tiene que ser al menos el 0,15 % de la
  // pieza y de 30 píxeles; la pieza, la mancha más grande
  const C = FM.contornos(D), pz = FM.pieza(C.anillos, p => p, 30);
  if (pz) { const A0 = Math.abs(FM.area(pz.fuera)); if (A0 < D.width * D.height * 0.002) { FM.IMAGENES.delete(I.id); return { url: I.url, W: D.width, H: D.height, D, C, pz: null, ia }; } pz.agujeros = pz.agujeros.filter(r => Math.abs(FM.area(r)) >= Math.max(30, 0.0015 * A0)); }
  FM.IMAGENES.delete(I.id);
  return { url: I.url, W: D.width, H: D.height, D, C, pz, ia };
}

// ---------- 1) la cara de frente ----------
export async function analizaFrente(file, o) {
  const S = await silueta(file, o);
  if (!S.pz) throw new Error('No encuentro la pieza en la foto.' + (S.ia ? '' : ' Ponla sobre algo liso que contraste (un folio) o haz la foto en el PC, que separa la pieza sola.'));
  const L = FM.leeEngranaje(S.pz);
  // no es un engranaje: CUALQUIER PIEZA (contorno, agujeros y, si los hay, dientes en línea: sierras, peines…)
  if (L.error) { const CP = await import('./copia_pieza.js'); return Object.assign(S, { generica: true, G: CP.analiza(S.pz) }); }
  // una punta de diente (lo más lejano del centro) para dibujar el Ø de punta a punta
  let mejor = -1, th0 = 0; S.pz.fuera.forEach(([x, y]) => { const r = Math.hypot(x - L.centro[0], y - L.centro[1]); if (r > mejor) { mejor = r; th0 = Math.atan2(y - L.centro[1], x - L.centro[0]); } });
  return Object.assign(S, { L, th0 });
}
// ---------- 2) la vista de lado: los PISOS (de arriba abajo), ancho de cada uno ----------
export async function analizaLado(file, o) {
  const S = await silueta(file, o);
  if (!S.pz) throw new Error('No encuentro la pieza en la foto de lado.');
  const xs = S.pz.fuera.map(p => p[0]), ys = S.pz.fuera.map(p => p[1]), x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs)), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  // ancho de la silueta en cada fila (lo más a la izquierda y lo más a la derecha que está DENTRO del contorno de fuera)
  const filas = [];
  for (let y = y0; y <= y1; y++) { let a = Infinity, b = -Infinity; const P = S.pz.fuera; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const p = P[i], q = P[j]; if ((p[1] > y) !== (q[1] > y)) { const x = p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1]); a = Math.min(a, x); b = Math.max(b, x); } } filas.push({ y, a, b, w: b > a ? b - a : 0 }); }
  const max = Math.max(...filas.map(f => f.w)), tol = 0.05 * max, pisos = [];
  for (const f of filas) { if (!(f.w > 0.02 * max)) continue; const u = pisos[pisos.length - 1]; if (u && Math.abs(f.w - u.w) < tol && f.y === u.y1 + 1) { u.y1 = f.y; u.n++; u.w += (f.w - u.w) / u.n; u.a = Math.min(u.a, f.a); u.b = Math.max(u.b, f.b); } else pisos.push({ y0: f.y, y1: f.y, w: f.w, n: 1, a: f.a, b: f.b }); }
  // los trocitos de transición (chaflanes, bordes borrosos) se juntan con el vecino más parecido
  const alto = y1 - y0 + 1; let L = pisos.filter(p => p.y1 - p.y0 + 1 >= 0.04 * alto);
  L = L.reduce((o, p) => { const u = o[o.length - 1]; if (u && Math.abs(u.w - p.w) < tol) { u.y1 = p.y1; u.w = (u.w + p.w) / 2; u.a = Math.min(u.a, p.a); u.b = Math.max(u.b, p.b); } else o.push(Object.assign({}, p)); return o; }, []);
  const iDientes = L.reduce((m, p, i) => p.w > L[m].w ? i : m, 0);
  return Object.assign(S, { pisos: L, iDientes, caja: [x0, y0, x1, y1] });
}

// ---------- dibujar la foto con sus marcas ----------
function flecha(g, a, b, color, grosor) {
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = grosor; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  [[a, b], [b, a]].forEach(([p, q]) => { const t = Math.atan2(p[1] - q[1], p[0] - q[0]), L = grosor * 5; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - L * Math.cos(t - 0.4), p[1] - L * Math.sin(t - 0.4)); g.lineTo(p[0] - L * Math.cos(t + 0.4), p[1] - L * Math.sin(t + 0.4)); g.closePath(); g.fill(); });
}
function numero(g, p, n, color, r) { g.fillStyle = color; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill(); g.fillStyle = '#0d0820'; g.font = '800 ' + Math.round(r * 1.25) + 'px "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), p[0], p[1] + r * 0.06); }
export function pintaFrente(cv, A, k) {
  const g = cv.getContext('2d'), esc = Math.min(1, 980 / A.W), W = Math.round(A.W * esc), H = Math.round(A.H * esc); cv.width = W; cv.height = H;
  return new Promise(res => { const im = new Image(); im.onload = () => {
    g.drawImage(im, 0, 0, W, H); g.fillStyle = 'rgba(5,5,10,.35)'; g.fillRect(0, 0, W, H);
    g.save(); g.scale(esc, esc); const grosor = Math.max(2, A.W / 300), c = A.L.centro, ra = A.L.Da / 2, rf = A.L.Df / 2, z = A.L.z, paso = 2 * Math.PI / z;
    // el contorno que ha visto el programa
    g.strokeStyle = COL.contorno; g.lineWidth = grosor * 0.8; g.beginPath(); A.pz.fuera.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke();
    // ① Ø exterior de punta a punta
    const u = [Math.cos(A.th0), Math.sin(A.th0)], p1 = [c[0] + u[0] * ra * 1.02, c[1] + u[1] * ra * 1.02], p2 = [c[0] - u[0] * ra * 1.02, c[1] - u[1] * ra * 1.02];
    flecha(g, p1, p2, COL.linea, grosor); numero(g, [p1[0] + u[0] * grosor * 9, p1[1] + u[1] * grosor * 9], 1, COL.linea, grosor * 6);
    // ② los k dientes que hay que abrazar (sus puntas señaladas) y la flecha por fuera, de flanco a flanco
    const tA = A.th0 + paso * 2, tB = tA + paso * (k - 1), rr = ra + grosor * 6;
    // los k dientes, iluminados (una cuña verde de su fondo a su punta) y con su punta señalada
    g.fillStyle = 'rgba(45,212,191,.28)'; g.beginPath(); g.arc(c[0], c[1], ra * 1.01, tA - paso * 0.5, tB + paso * 0.5); g.arc(c[0], c[1], rf * 0.97, tB + paso * 0.5, tA - paso * 0.5, true); g.closePath(); g.fill();
    for (let i = 0; i < k; i++) { const t = tA + paso * i; g.fillStyle = COL.k; g.beginPath(); g.arc(c[0] + Math.cos(t) * ra, c[1] + Math.sin(t) * ra, grosor * 2.4, 0, 7); g.fill(); }
    const fa = tA - paso * 0.32, fb = tB + paso * 0.32, ca = [c[0] + Math.cos(fa) * rr, c[1] + Math.sin(fa) * rr], cb = [c[0] + Math.cos(fb) * rr, c[1] + Math.sin(fb) * rr];
    flecha(g, ca, cb, COL.k, grosor); const tm = (fa + fb) / 2; numero(g, [c[0] + Math.cos(tm) * (rr + grosor * 9), c[1] + Math.sin(tm) * (rr + grosor * 9)], 2, COL.k, grosor * 6);
    // ③ el agujero
    if (A.L.agujero) { const r = A.L.agujero.d / 2; g.strokeStyle = COL.ag; g.lineWidth = grosor; g.setLineDash([grosor * 3, grosor * 2]); g.beginPath(); g.arc(c[0], c[1], r, 0, 7); g.stroke(); g.setLineDash([]); flecha(g, [c[0] - r, c[1]], [c[0] + r, c[1]], COL.ag, grosor * 0.8); numero(g, [c[0], c[1] - r - grosor * 7], 3, COL.ag, grosor * 6); }
    g.restore(); res(); }; im.src = A.url; });
}
// la pieza cualquiera: ① el largo (por su eje largo), ② de la punta 1 a la 11 de cada borde con dientes, ③… los agujeros
export const pasosMedir = D => Math.min(10, D.n - 1);
export function pintaGenerica(cv, A) {
  const g = cv.getContext('2d'), esc = Math.min(1, 980 / A.W), W = Math.round(A.W * esc), H = Math.round(A.H * esc); cv.width = W; cv.height = H; const G = A.G;
  const c = Math.cos(G.theta), s = Math.sin(G.theta), atras = ([x, y]) => [G.o[0] + x * c - y * s, G.o[1] + x * s + y * c]; // del marco girado a la foto
  return new Promise(res => { const im = new Image(); im.onload = () => {
    g.drawImage(im, 0, 0, W, H); g.fillStyle = 'rgba(5,5,10,.35)'; g.fillRect(0, 0, W, H); g.save(); g.scale(esc, esc); const grosor = Math.max(2, A.W / 300);
    g.strokeStyle = COL.contorno; g.lineWidth = grosor * 0.8; g.beginPath(); A.pz.fuera.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke();
    // ① el largo, por fuera de la pieza (a un lado), de punta a punta
    const yF = G.y0 - grosor * 10, a1 = atras([G.x0, yF]), b1 = atras([G.x1, yF]); flecha(g, a1, b1, COL.linea, grosor); numero(g, atras([(G.x0 + G.x1) / 2, yF - grosor * 8]), 1, COL.linea, grosor * 6);
    // ② los dientes en línea: todos señalados; la punta 1 y la que toca medir, más grandes; la flecha entre las dos, por fuera
    G.dientes.forEach((D, j) => { const m = pasosMedir(D), xt = t => D.xIni + D.paso * (t + 0.5), yt = x => (D.alto + D.ta * x + D.tb) * D.lado, fuera = D.lado * grosor * 9;
      for (let t = 0; t < D.n; t++) { const x = xt(t), p = atras([x, yt(x)]); g.fillStyle = t === 0 || t === m ? COL.k : 'rgba(45,212,191,.55)'; g.beginPath(); g.arc(p[0], p[1], grosor * (t === 0 || t === m ? 2.6 : 1.4), 0, 7); g.fill(); }
      const xa = xt(0), xb = xt(m), pa = atras([xa, yt(xa) + fuera]), pb = atras([xb, yt(xb) + fuera]); flecha(g, pa, pb, COL.k, grosor); numero(g, atras([(xa + xb) / 2, (yt(xa) + yt(xb)) / 2 + fuera * 2]), j ? '2b' : 2, COL.k, grosor * 6); });
    // ③… los agujeros redondos
    let nA = 3; G.agujeros.forEach(hh => { if (!hh.redondo || !hh.c) return; const cc = atras(hh.c); g.strokeStyle = COL.ag; g.lineWidth = grosor; g.setLineDash([grosor * 3, grosor * 2]); g.beginPath(); g.arc(cc[0], cc[1], hh.r, 0, 7); g.stroke(); g.setLineDash([]); numero(g, [cc[0], cc[1] - hh.r - grosor * 7], nA++, COL.ag, grosor * 6); });
    g.restore(); res(); }; im.src = A.url; });
}
export function pintaLado(cv, A) {
  const g = cv.getContext('2d'), esc = Math.min(1, 980 / A.W), W = Math.round(A.W * esc), H = Math.round(A.H * esc); cv.width = W; cv.height = H;
  return new Promise(res => { const im = new Image(); im.onload = () => {
    g.drawImage(im, 0, 0, W, H); g.fillStyle = 'rgba(5,5,10,.35)'; g.fillRect(0, 0, W, H); g.save(); g.scale(esc, esc);
    const grosor = Math.max(2, A.W / 300); let n = 4;
    A.pisos.forEach((p, i) => { const dientes = i === A.iDientes; g.fillStyle = dientes ? 'rgba(45,212,191,.16)' : 'rgba(167,139,250,.16)'; g.fillRect(p.a, p.y0, p.b - p.a, p.y1 - p.y0 + 1); g.strokeStyle = dientes ? COL.k : COL.piso; g.lineWidth = grosor * 0.7; g.strokeRect(p.a, p.y0, p.b - p.a, p.y1 - p.y0 + 1);
      const x = p.b + grosor * 8; flecha(g, [x, p.y0], [x, p.y1], dientes ? COL.k : COL.piso, grosor); numero(g, [x + grosor * 9, (p.y0 + p.y1) / 2], p.n4 = n++, dientes ? COL.k : COL.piso, grosor * 6);
      if (!dientes) { const y = (p.y0 + p.y1) / 2; flecha(g, [p.a, y], [p.b, y], COL.piso, grosor * 0.8); numero(g, [p.a - grosor * 9, y], p.n5 = n++, COL.piso, grosor * 6); } });
    g.restore(); res(); }; im.src = A.url; });
}

// ---------- la ventana del asistente ----------
// o = { v (lo que ya hay en «Copiar uno que ya tengo»), alTerminar({ k: [valor, 'tuya' | 'estimada'] }) }
export function abrir(o = {}) {
  const ya = document.querySelector('.ac50'); if (ya) ya.remove();
  const est = { frente: null, lado: null, med: {} }, lienzoF = h('canvas.ac50-cv'), lienzoL = h('canvas.ac50-cv');
  const cuerpo = h('div.ac50-cuerpo'), raiz = h('div.ac50', { role: 'dialog', 'aria-label': 'Copiar con fotos' }, h('div.ac50-caja', h('div.ac50-cab', h('div', h('small', 'PRECISION LAB · COPIAR CON FOTOS'), h('b', '📸 Tú haces dos fotos, yo te marco qué medir')), h('button.ac50-x', { type: 'button', 'aria-label': 'Cerrar', onclick: () => raiz.remove() }, '✕')), cuerpo));
  document.body.appendChild(raiz);
  const kDe = () => EC.kRecomendado(est.frente && est.frente.L ? est.frente.L.z : 20, 20);
  const escala = () => { const F = est.frente; if (!F) return null; if (F.generica) { const L = Number(est.med.largo); return L > 0 ? L / F.G.largo : null; } const da = Number(est.med.da); return da > 0 ? da / F.L.Da : null; }; // mm por píxel de la foto de frente
  const escalaL = () => { const F = est.frente, d = Number(F && F.generica ? est.med.largo : est.med.da); return est.lado && d > 0 ? d / est.lado.pisos[est.lado.iDientes].w : null; }; // (de lado, lo más ancho es el Ø exterior o el largo)
  // (13-10-2026: antes, al cambiar una medida se redibujaba toda la ventana y lo que empezabas a escribir en la casilla siguiente se
  // perdía. Ahora solo se ponen al día los «≈» de la foto, que dependen de la escala)
  const aproxTxt = a => { if (!a) return 'mídelo'; const sc = a.e === 'L' ? escalaL() : escala(); return sc ? '≈ ' + n2(a.px * sc) : 'mídelo'; };
  const refresca = () => { cuerpo.querySelectorAll('input[data-k]').forEach(i => { if (i._aprox !== undefined) i.placeholder = aproxTxt(i._aprox); }); const b = cuerpo.querySelector('.ac50-construye'); if (b) b.disabled = !listoYa(); };
  const listoYa = () => { const F = est.frente; return !!F && Number(F.generica ? est.med.largo : est.med.da) > 0; };
  const campo = (k, n, t, ayuda, aprox, color = 'am') => { const i = h('input.inp', { type: 'number', inputmode: 'decimal', step: 0.01, min: 0, value: est.med[k] ?? '', placeholder: aproxTxt(aprox), 'data-k': k, oninput: e => { est.med[k] = e.target.value.replace(',', '.'); refresca(); } }); i._aprox = aprox || null;
    return h('label.ac50-campo', h('span.ac50-n.' + color, String(n)), h('span.ac50-t', h('b', t), h('small', ayuda)), i, h('i', 'mm')); };
  async function eligeFoto(cual) {
    const C = await import('./comun.js'), f = await C.pideArchivo('image/*'); if (!f) return;
    mount(cuerpo, h('div.ac50-espera', h('div.ac50-giro'), h('p', cual === 'frente' ? 'Buscando la pieza y contando los dientes…' : 'Buscando los pisos de la pieza…')));
    const alEsperar = t => { const p = cuerpo.querySelector('.ac50-espera p'); if (p) p.textContent = t; };
    try { est[cual] = cual === 'frente' ? await analizaFrente(f, { alEsperar }) : await analizaLado(f, { alEsperar }); if (cual === 'frente' && est.frente && est.frente.L) { est.med.z = est.frente.L.z; } }
    catch (e) { toast(e.message || String(e), 'bad', 9000); }
    pinta();
  }
  // 🩹 lo que ha arreglado el restaurador en esa foto, y la OPCIÓN B: retocar el contorno a mano (pintar, varita, contornear con imán)
  const selloDe = X => (X.rest ? (X.rest.conIA ? '✨ IA de tu PC · ' : '🩹 restaurada · ') + (X.rest.confianza === 'alta' ? '' : 'contorno ' + (X.rest.confianza === 'baja' ? 'poco seguro' : 'dudoso') + ' · ') : X.ia ? '✨ separada con la IA de tu PC · ' : '');
  const arreglos = X => (X && X.rest && (X.rest.pasos.length || X.rest.avisos.length) ? h('details.ac50-arreglos', { open: X.rest.confianza !== 'alta' }, h('summary', '🩹 Lo que he arreglado en la foto (' + X.rest.pasos.length + ')'), X.rest.pasos.map(t => h('p', '✔ ' + t)), X.rest.avisos.map(t => h('p.mal', '⚠️ ' + t))) : null);
  const bRetoca = cual => (est[cual] && est[cual].R ? btn('🩹 Retocar el contorno', async () => { const X = est[cual], FRU = await import('./foto_restaura_ui.js');
    FRU.abreRetoque({ img: X.R.img, mascara: X.R.mascara, alGuardar: async id => { const R2 = { img: X.R.img, mascara: id, rest: Object.assign({}, X.rest, { metodo: 'mano', nombre: 'Retocada a mano', confianza: 'alta', conIA: false, avisos: [], pasos: X.rest.pasos.concat(['El contorno lo has retocado tú.']) }) };
      try { est[cual] = cual === 'frente' ? await analizaFrente(R2) : await analizaLado(R2); if (cual === 'frente' && est.frente.L) est.med.z = est.frente.L.z; } catch (e) { toast(e.message || String(e), 'bad', 9000); } pinta(); } }); }, { cls: 'sm ac50-retoca', title: 'Si la línea verde no es la pieza: pinta, borra, usa la varita o marca el contorno a ojo (se pega solo al borde)' }) : null);
  function pinta() {
    const F = est.frente, Ld = est.lado, k = kDe(), s = escala(), sl = escalaL();
    const gen = F && F.generica, G = gen ? F.G : null;
    const frenteGen = () => h('div.ac50-fila', h('div.ac50-foto', lienzoF, h('div.ac50-sello', selloDe(F) + 'pieza sin engranaje' + (G.dientes.length ? ' · ' + G.dientes.map(D => D.n + ' dientes en línea').join(' · ') : '') + (G.agujeros.length ? ' · ' + G.agujeros.length + ' agujero(s)' : ''))),
      h('div.ac50-meds', campo('largo', 1, 'Largo total', 'De punta a punta por lo más largo (la flecha amarilla).'),
        G.dientes.map((D, j) => campo('paso' + j, j ? '2b' : 2, 'De la punta 1 a la punta ' + (pasosMedir(D) + 1), 'Las dos puntas grandes verdes. Mide de punta a punta con el calibre (' + pasosMedir(D) + ' pasos de ' + D.n + ' dientes).', { px: D.paso * pasosMedir(D), e: 'F' }, 've')),
        G.agujeros.map((hh, i) => hh.redondo ? campo('ag' + i, 3 + G.agujeros.slice(0, i).filter(x => x.redondo).length, 'Agujero', 'El círculo rosa. Mejor mide el eje o tornillo que entra.', { px: 2 * hh.r, e: 'F' }, 'ro') : null),
        arreglos(F), h('div.ac50-btns', btn('↺ Otra foto de frente', () => eligeFoto('frente'), { cls: 'sm ghost' }), bRetoca('frente'))));
    const pasoFrente = h('section.ac50-paso', h('h3', '1 · Foto de FRENTE (la cara que más se ve)'),
      gen ? frenteGen() : !F ? h('div.ac50-pide.ac50-guia', h('div.gf-dib', { html: GF.DIBUJOS.principal() }), h('div', h('b.gf-centro-t', '👉 AHORA: la foto de frente'), h('ul.gf-tips', GF.PASOS.principal.tips.map(t => h('li', t)).concat([h('li', 'Cualquier fondo vale en el PC (la IA separa la pieza); en el móvil, mejor un folio.')])), btn('📷 Elegir la foto de frente', () => eligeFoto('frente'), { cls: 'primary ac50-bf' })))
        : h('div.ac50-fila', h('div.ac50-foto', lienzoF, h('div.ac50-sello', selloDe(F) + F.L.z + ' dientes contados')),
          h('div.ac50-meds', h('label.ac50-campo', h('span.ac50-n.z', '#'), h('span.ac50-t', h('b', 'Dientes (contados)'), h('small', 'Compruébalos: marca uno con rotulador.')), h('input.inp', { type: 'number', step: 1, min: 6, value: est.med.z ?? '', 'data-k': 'z', onchange: e => { est.med.z = e.target.value; F.L.z = Math.round(Number(e.target.value)) || F.L.z; pinta(); } })),
            campo('da', 1, 'Ø exterior', 'Con las bocas de fuera del calibre, de punta a punta (la flecha amarilla).'),
            campo('W', 2, 'Sobre ' + k + ' dientes', 'Abraza los ' + k + ' dientes marcados en verde, con las bocas planas en los costados del primero y del último.', null, 've'),
            campo('W1', '2+', 'Sobre ' + (k + 1) + ' dientes (si puedes)', 'Uno más. Con esta saco el ángulo de los dientes.', null, 've'),
            F.L.agujero ? campo('eje', 3, 'Agujero (el eje)', 'Mejor mide el EJE donde va, no el agujero gastado (el círculo rosa).', { px: F.L.agujero.d, e: 'F' }, 'ro') : null,
            arreglos(F), h('div.ac50-btns', btn('↺ Otra foto de frente', () => eligeFoto('frente'), { cls: 'sm ghost' }), bRetoca('frente')))));
    const pasoLado = h('section.ac50-paso', h('h3', '2 · Foto de LADO (de canto, con el eje hacia arriba) · si es plano, sáltalo'),
      !Ld ? h('div.ac50-pide.ac50-guia', h('div.gf-dib', { html: GF.DIBUJOS.lado() }), h('div', F ? h('b.gf-centro-t', '👉 AHORA: la foto de lado') : h('b', 'Después de la de frente: la foto de lado'), h('ul.gf-tips', GF.PASOS.lado.tips.map(t => h('li', t))), btn('📷 Elegir la foto de lado', () => eligeFoto('lado'), { cls: (F ? 'primary ' : '') + 'ac50-bl' }))) :
        h('div.ac50-fila', h('div.ac50-foto', lienzoL, h('div.ac50-sello', Ld.pisos.length + (Ld.pisos.length === 1 ? ' piso' : ' pisos'))),
          h('div.ac50-meds', Ld.pisos.map((p, i) => i === Ld.iDientes ? campo('b', 4 + Ld.pisos.slice(0, i).reduce((a, q, j) => a + (j === Ld.iDientes ? 1 : 2), 0), gen ? 'Grosor' : 'Grosor de los dientes', 'La flecha verde, de canto.', { px: p.y1 - p.y0 + 1, e: 'L' }, 've')
            : [campo('h' + i, 4 + Ld.pisos.slice(0, i).reduce((a, q, j) => a + (j === Ld.iDientes ? 1 : 2), 0), 'Alto de este piso', 'Flecha morada ↕.', { px: p.y1 - p.y0 + 1, e: 'L' }, 'mo'), campo('d' + i, 5 + Ld.pisos.slice(0, i).reduce((a, q, j) => a + (j === Ld.iDientes ? 1 : 2), 0), 'Ø de este piso', 'Flecha morada ↔.', { px: p.w, e: 'L' }, 'mo')]),
            arreglos(Ld), h('div.ac50-btns', btn('↺ Otra foto de lado', () => eligeFoto('lado'), { cls: 'sm ghost' }), bRetoca('lado')))));
    const listo = F && Number(gen ? est.med.largo : est.med.da) > 0;
    mount(cuerpo, pasoFrente, pasoLado,
      h('section.ac50-paso.ac50-fin', h('h3', '3 · Construir la copia'), h('p', listo ? 'Con lo medido construyo la pieza exacta. Lo que no hayas medido y saque de la foto irá marcado «≈» para que lo confirmes.' : gen ? 'Mide al menos el largo total (①).' : 'Haz la foto de frente y mide al menos el Ø exterior (①).'),
        btn('🔁 Construir mi copia', () => termina(), { cls: 'primary ac50-construye', disabled: !listo })));
    if (F) (gen ? pintaGenerica(lienzoF, F) : pintaFrente(lienzoF, F, k)); if (Ld) pintaLado(lienzoL, Ld);
    window.__ac50 = { est, eligeFoto, termina };
  }
  function termina() {
    const F = est.frente, Ld = est.lado, out = {}, num = k => { const x = Number(est.med[k]); return x > 0 ? x : null; }, s = escala(), sl = escalaL();
    if (F.generica) { const G = F.G; out.__tipo = 'pieza'; out.__pieza = { A: G }; out.largo = [num('largo'), 'tuya'];
      G.dientes.forEach((D, j) => { const m = pasosMedir(D), v = num('paso' + j); out['paso' + j] = v ? [Math.round(v / m * 10 * 1000) / 1000, 'tuya'] : [null, 'tuya']; }); // (en el Lab va «sobre 10 pasos»)
      G.agujeros.forEach((hh, i) => { if (hh.redondo) out['ag' + i] = num('ag' + i) ? [num('ag' + i), 'tuya'] : [Math.round(2 * hh.r * s * 100) / 100, 'estimada']; });
      if (Ld) { const p = Ld.pisos, iD = Ld.iDientes; out.grosor = num('b') ? [num('b'), 'tuya'] : sl ? [Math.round((p[iD].y1 - p[iD].y0 + 1) * sl * 10) / 10, 'estimada'] : [null, 'falta'];
        const otro = p.map((q, i) => ({ q, i })).filter(x => x.i !== iD).sort((a, b) => b.q.y1 - b.q.y0 - (a.q.y1 - a.q.y0))[0];
        if (otro) { const i = otro.i; out.bujeD = [num('d' + i) || Math.round(otro.q.w * sl * 10) / 10, num('d' + i) ? 'tuya' : 'estimada']; out.bujeH = [num('h' + i) || Math.round((otro.q.y1 - otro.q.y0 + 1) * sl * 10) / 10, num('h' + i) ? 'tuya' : 'estimada']; } }
      else out.grosor = [null, 'falta'];
      raiz.remove(); if (o.alTerminar) o.alTerminar(out); return; }
    out.z = [Math.round(Number(est.med.z) || F.L.z), 'estimada']; out.da = [num('da'), 'tuya']; out.hibrido = [false, 'tuya']; // (lo de las fotos manda: no el STL subido antes)
    if (num('W')) { out.W = [num('W'), 'tuya']; out.k = [kDe(), 'tuya']; } if (num('W1')) out.W1 = [num('W1'), 'tuya'];
    if (num('eje')) out.eje = [num('eje'), 'tuya']; else if (F.L.agujero && s) out.eje = [Math.round(F.L.agujero.d * s * 10) / 10, 'estimada']; else out.eje = [0, 'estimada'];
    if (Ld) { const p = Ld.pisos, iD = Ld.iDientes; out.b = num('b') ? [num('b'), 'tuya'] : sl ? [Math.round((p[iD].y1 - p[iD].y0 + 1) * sl * 10) / 10, 'estimada'] : [null, 'falta'];
      const otro = p.map((q, i) => ({ q, i })).filter(x => x.i !== iD).sort((a, b) => b.q.y1 - b.q.y0 - (a.q.y1 - a.q.y0))[0]; // el buje: el piso que no es de dientes (el más alto)
      if (otro) { const i = otro.i, hh = num('h' + i) || (sl ? Math.round((otro.q.y1 - otro.q.y0 + 1) * sl * 10) / 10 : null), dd = num('d' + i) || (sl ? Math.round(otro.q.w * sl * 10) / 10 : null);
        out.buje = [true, 'tuya']; out.bujeH = [hh, num('h' + i) ? 'tuya' : 'estimada']; out.bujeD = [dd, num('d' + i) ? 'tuya' : 'estimada']; } }
    raiz.remove(); if (o.alTerminar) o.alTerminar(out);
  }
  pinta();
  return raiz;
}
