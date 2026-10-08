// ================= v17.2 · 🎬 «MIRA CÓMO NACIÓ TU PIEZA»  ·  v17.3: vídeo SUAVE, tipo TikTok =================
// El programa del PC guarda una foto limpia por capa de la cámara de la impresora (nacer.go: sin el cabezal en P1P/P1S).
// Aquí se ven las piezas grabadas y se monta el vídeo: VERTICAL, encuadrado solo en la pieza, con FUNDIDO entre fotos
// (la pieza crece seguida, no a saltos), un acercamiento lento, la luz igualada y el nombre del cliente.
// Todo ocurre en ESTE ordenador: las fotos no salen de él y el vídeo se hace en el propio navegador (sin servicios de fuera).
import { h, mount, btn, modal, toast, fdt, inp, sel, confirmDlg } from './ui.js';
import { S, timing } from './store.js';
import { desktop } from './desktop.js';
import { grabarLienzo, formatoVideo } from './simulacion.js';
import { download } from './files.js';

const CL = window.CL;
export const NACER = { max: 150 }; // como mucho estas fotos por vídeo (si hay más, se reparten)
const nombre1 = t => String(t || '').trim().split(/\s+/)[0] || '';
const limpio = t => CL.norm(String(t || '').replace(/\.(3mf|gcode|stl)$/i, '').replace(/[_\-.]+/g, ' '));
const entre = (v, a, b) => Math.max(a, Math.min(b, v));

// ¿De qué pedido es esta pieza? Los pedidos abiertos, primero los que se parecen al nombre del trabajo de la impresora
export function candidatos(pieza) {
  const t = limpio(pieza && pieza.trabajo).split(' ').filter(x => x.length > 2);
  return (S.t.pedidos || []).filter(o => !o.eliminado && !o.archivado && (timing(o) || {}).abierto).map(o => {
    const p = limpio(o.producto), n = t.filter(x => p.includes(x)).length;
    return { o, parecido: n };
  }).sort((a, b) => b.parecido - a.parecido || String(b.o.creado || '').localeCompare(String(a.o.creado || '')));
}
// Los tiempos del vídeo (segundos): entrada, la pieza creciendo y el final con la pieza terminada
export function tiempos(nFotos) {
  const cuerpo = entre(Math.round(nFotos / 15 * 10) / 10, 7, 13);
  return { portada: 0.6, cuerpo, final: 2, total: Math.round((0.6 + cuerpo + 2) * 10) / 10 };
}
// Qué fotos se usan (repartidas por igual; siempre la primera y la última)
export function reparto(total, max = NACER.max) {
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
  const out = []; for (let i = 0; i < max; i++) out.push(1 + Math.round(i * (total - 1) / (max - 1)));
  return [...new Set(out)];
}
// Por dónde va la película en el segundo t: foto i, y cuánto de la siguiente se mezcla (0..1). Arranca y frena con suavidad.
export function instante(t, n, tm) {
  if (n < 2 || t <= tm.portada) return { i: 0, f: 0, x: 0 };
  if (t >= tm.portada + tm.cuerpo) return { i: n - 1, f: 0, x: 1 };
  const x = (t - tm.portada) / tm.cuerpo, e = x * x * (3 - 2 * x), u = (0.65 * x + 0.35 * e) * (n - 1), i = Math.min(n - 2, Math.floor(u));
  return { i, f: u - i, x };
}
// Dónde está la pieza: lo que cambia entre la primera foto y la última. Devuelve el centro y el ancho (de 0 a 1) de esa zona.
export function zona(primera, ultima) {
  const W = 160, H = 90, gris = im => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data, o = new Float32Array(W * H); for (let i = 0; i < o.length; i++) o[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.6 + d[i * 4 + 2] * 0.1; return o; };
  const a = gris(primera), b = gris(ultima), col = new Float32Array(W), fil = new Float32Array(H); let total = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dif = Math.abs(a[y * W + x] - b[y * W + x]); if (dif > 30) { col[x]++; fil[y]++; total++; } }
  if (total < 40) return { cx: 0.5, cy: 0.5, ancho: 1, alto: 1, seguro: false }; // casi no cambia nada: toda la imagen
  const rango = (v, n) => { let s = 0, lo = 0, hi = n - 1; for (let i = 0; i < n; i++) { s += v[i]; if (s >= total * 0.04) { lo = i; break; } } s = 0; for (let i = n - 1; i >= 0; i--) { s += v[i]; if (s >= total * 0.04) { hi = i; break; } } return [lo, hi]; };
  const [x0, x1] = rango(col, W), [y0, y1] = rango(fil, H);
  return { cx: (x0 + x1 + 1) / 2 / W, cy: (y0 + y1 + 1) / 2 / H, ancho: (x1 - x0 + 1) / W, alto: (y1 - y0 + 1) / H, seguro: true };
}
const FORMATOS = { vertical: [1080, 1920, 'Vertical · TikTok, reel o historia'], cuadrado: [1080, 1080, 'Cuadrado · WhatsApp'] };
// El trozo de la foto que se usa (en píxeles de la foto): alrededor de la pieza, con la forma del vídeo todo lo que se pueda
export function encuadre(fw, fh, formato, centro, zoom) {
  const [W, H] = FORMATOS[formato] || FORMATOS.vertical, forma = W / H;
  let w = entre(fw / entre(zoom, 1, 4), Math.min(fw, fh * forma), fw), hh = Math.min(fh, w / forma);
  if (w / hh < forma) w = Math.min(fw, hh * forma);
  const x = entre(centro.cx * fw - w / 2, 0, fw - w), y = entre(centro.cy * fh - hh / 2, 0, fh - hh);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) };
}
// La luz de una foto (0..255), para igualarla con las vecinas y que el vídeo no parpadee
export function luzDe(bm) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bm, 0, 0, 16, 16); const d = g.getImageData(0, 0, 16, 16).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * 0.3 + d[i + 1] * 0.6 + d[i + 2] * 0.1; return s / 256; }
export function igualaLuz(fotos) { const n = fotos.length; fotos.forEach((f, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 4); j <= Math.min(n - 1, i + 4); j++) { s += fotos[j].luz; c++; } f.k = f.luz > 4 ? entre(s / c / f.luz, 0.85, 1.18) : 1; }); return fotos; }

// Un fotograma del vídeo. t en segundos. fotos = [{ bm, k }] (ya recortadas) · T = { titulo, para, marca }
export function pintaCuadro(g, W, H, fotos, t, T, tm) {
  const n = fotos.length, I = instante(t, n, tm), fin = t >= tm.portada + tm.cuerpo, u = W / 1080, a = fotos[I.i], b = fotos[Math.min(n - 1, I.i + 1)];
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none'; g.fillStyle = '#05070c'; g.fillRect(0, 0, W, H);
  if (a && a.bm) {
    const iw = a.bm.width, ih = a.bm.height, acerca = 1 + 0.07 * (fin ? 1 : I.x), s = Math.max(W / iw, Math.min(H / ih, W / iw * 1.0001)) * acerca, dw = iw * s, dh = ih * s, dx = (W - dw) / 2, dy = (H - dh) / 2;
    const dibuja = (f, alfa) => { g.globalAlpha = alfa; g.filter = f.k && Math.abs(f.k - 1) > 0.01 ? 'brightness(' + f.k.toFixed(3) + ')' : 'none'; g.drawImage(f.bm, dx, dy, dw, dh); };
    if (dh < H - 2) { // la foto no llena el alto: detrás, ella misma grande y desenfocada
      const s0 = Math.max(W / iw, H / ih) * 1.12; g.save(); g.filter = 'blur(' + Math.round(28 * u) + 'px) brightness(.5)'; g.drawImage(a.bm, (W - iw * s0) / 2, (H - ih * s0) / 2, iw * s0, ih * s0); g.restore();
    }
    dibuja(a, 1); if (I.f > 0.003 && b && b !== a) dibuja(b, I.f); // FUNDIDO con la siguiente: crece seguido, sin saltos
    g.globalAlpha = 1; g.filter = 'none';
    // sombreado arriba y abajo para que se lean las letras
    let gr = g.createLinearGradient(0, 0, 0, H * 0.24); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.24);
    gr = g.createLinearGradient(0, H * 0.72, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = gr; g.fillRect(0, H * 0.72, W, H * 0.28);
  }
  const sombra = () => { g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 18 * u; g.shadowOffsetY = 3 * u; };
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const entra = entre(t / 0.5, 0, 1); // el título entra suave
  g.save(); sombra(); g.globalAlpha = entra; g.fillStyle = '#fff'; g.font = '800 ' + Math.round(66 * u) + 'px system-ui, "Segoe UI", sans-serif'; g.fillText(T.titulo || '', W / 2, H * 0.075 + (1 - entra) * 20 * u, W * 0.92); g.restore();
  if (!fin) {
    const pct = Math.round(I.x * 100); g.save(); g.globalAlpha = entra; g.fillStyle = 'rgba(0,0,0,.55)'; const bw = 190 * u, bh = 62 * u, bx = W / 2 - bw / 2, by = H * 0.075 + 62 * u; g.beginPath(); g.roundRect ? g.roundRect(bx, by, bw, bh, bh / 2) : g.rect(bx, by, bw, bh); g.fill();
    g.fillStyle = '#fde047'; g.font = '800 ' + Math.round(38 * u) + 'px system-ui, sans-serif'; g.fillText(pct + ' %', W / 2, by + bh / 2 + 2 * u); g.restore();
  }
  // abajo: para quién y de quién. Al terminar, el nombre crece con un brillo.
  const pop = fin ? entre((t - tm.portada - tm.cuerpo) / 0.45, 0, 1) : 0, rebote = fin ? 1 + 0.14 * Math.sin(pop * Math.PI) : 1;
  g.save(); sombra();
  if (T.para) { g.fillStyle = '#fff'; g.font = '800 ' + Math.round((fin ? 84 : 60) * u * rebote) + 'px system-ui, "Segoe UI", sans-serif'; if (fin) { g.shadowColor = 'rgba(34,211,238,.95)'; g.shadowBlur = 34 * u; g.shadowOffsetY = 0; } g.fillText((fin ? '✨ ' : '') + T.para, W / 2, H * 0.875, W * 0.92); }
  if (T.marca) { g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 14 * u; g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '600 ' + Math.round(34 * u) + 'px system-ui, sans-serif'; g.fillText(T.marca, W / 2, H * 0.875 + 72 * u, W * 0.9); }
  g.restore();
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, H - 10 * u, W, 10 * u); g.fillStyle = '#22d3ee'; g.fillRect(0, H - 10 * u, W * entre(t / tm.total, 0, 1), 10 * u);
  return I;
}

// ---------- montar el vídeo de UNA pieza ----------
export async function montar(pieza) {
  const C = candidatos(pieza), o0 = C[0] && C[0].parecido ? C[0].o : null, empresa = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || '';
  const titulo = inp({ value: 'Así nació tu pieza', maxlength: 40, 'aria-label': 'Título del vídeo' }), para = inp({ value: o0 ? 'Para ' + nombre1(o0.cliente) : '', maxlength: 40, placeholder: 'Para Lucía', 'aria-label': 'Para quién es' });
  const pedido = sel([{ v: '', t: '— Sin pedido (escribe tú el nombre) —' }].concat(C.slice(0, 40).map(x => ({ v: x.o.id, t: 'nº ' + x.o.numero + ' · ' + x.o.cliente + ' · ' + x.o.producto }))), o0 ? o0.id : '', { 'aria-label': 'Pedido de esta pieza' });
  const formato = sel(Object.keys(FORMATOS).map(k => ({ v: k, t: FORMATOS[k][2] })), 'vertical', { 'aria-label': 'Formato del vídeo' });
  const mueve = h('input', { type: 'range', min: 0, max: 100, value: 50, 'aria-label': 'Mover el encuadre' }), zoomI = h('input', { type: 'range', min: 100, max: 300, value: 100, 'aria-label': 'Acercar' });
  const cv = h('canvas.nc-cv', { width: 1080, height: 1920 }), estado = h('div.nc-estado', 'Cargando las fotos…'), acciones = h('div.row.wrap.nc-acc', { style: { gap: '8px' } });
  let blobs = [], fotos = [], t = 0, vivo = true, grabando = false, ultimo = performance.now(), hecho = null, Z = { cx: 0.5, cy: 0.5, ancho: 1, alto: 1 }, tam = [1280, 720], turno = 0, espera = 0;
  const T = () => ({ titulo: titulo.value.trim(), para: para.value.trim(), marca: empresa }), tm = () => tiempos(fotos.length);
  const pinta = () => { const [W, H] = FORMATOS[formato.value]; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } pintaCuadro(cv.getContext('2d'), W, H, fotos, t, T(), tm()); };
  const bucle = now => { if (!vivo || !cv.isConnected) { vivo = false; return; } requestAnimationFrame(bucle); const dt = Math.min(0.2, (now - ultimo) / 1000); ultimo = now; if (fotos.length && !grabando) { t += dt; if (t > tm().total + 0.8) t = 0; pinta(); } };
  // recorta todas las fotos alrededor de la pieza (se repite si cambias el formato o mueves el encuadre)
  async function recorta() {
    const mio = ++turno, R = encuadre(tam[0], tam[1], formato.value, { cx: Number(mueve.value) / 100, cy: Z.cy }, Number(zoomI.value) / 100), nuevas = [];
    for (let k = 0; k < blobs.length; k++) { try { const bm = await createImageBitmap(blobs[k], R.x, R.y, R.w, R.h); nuevas.push({ bm, luz: luzDe(bm), k: 1 }); } catch (e) { } if (mio !== turno || !vivo) { nuevas.forEach(f => { try { f.bm.close(); } catch (e) { } }); return; } }
    const viejas = fotos; fotos = igualaLuz(nuevas); viejas.forEach(f => { try { f.bm.close(); } catch (e) { } });
    window.__nacer = { fotos: fotos.length, encuadre: R, zona: Z, formato: formato.value };
    const x = tm(); estado.textContent = fotos.length + ' fotos · vídeo de ' + String(x.total).replace('.', ',') + ' s' + (formatoVideo() ? '' : ' · este aparato no puede grabar vídeo'); pintaAcc(); pinta();
  }
  const luego = () => { clearTimeout(espera); espera = setTimeout(recorta, 350); };
  pedido.onchange = () => { const o = (S.t.pedidos || []).find(x => x.id === pedido.value); para.value = o ? 'Para ' + nombre1(o.cliente) : ''; pinta(); };
  [titulo, para].forEach(x => x.addEventListener('input', pinta)); formato.onchange = () => recorta(); mueve.oninput = luego; zoomI.oninput = luego;
  const nombreArchivo = ext => 'asi_nacio_' + (CL.norm(para.value.replace(/^para\s+/i, '')) || 'pieza').replace(/\s+/g, '_') + '.' + ext;
  const pintaAcc = () => mount(acciones,
    btn(grabando ? 'Creando el vídeo…' : '🎬 Crear el vídeo', crear, { cls: 'primary nc-crear', disabled: grabando || !fotos.length }),
    hecho ? btn('⬇️ Guardar otra vez', () => download(hecho.blob, nombreArchivo(hecho.ext)), { cls: 'ghost' }) : null,
    hecho && navigator.canShare && navigator.canShare({ files: [new File([hecho.blob], nombreArchivo(hecho.ext), { type: hecho.blob.type })] }) ? btn('📤 Compartir', () => navigator.share({ files: [new File([hecho.blob], nombreArchivo(hecho.ext), { type: hecho.blob.type })] }).catch(() => { }), { cls: 'ghost' }) : null);
  async function crear() {
    if (grabando || !fotos.length) return;
    grabando = true; pintaAcc(); const total = tm().total;
    try {
      estado.textContent = 'Creando el vídeo (' + String(total).replace('.', ',') + ' s)… no cierres esta ventana.';
      hecho = await grabarLienzo(cv, total, x => { t = x * total; pinta(); });
      download(hecho.blob, nombreArchivo(hecho.ext));
      estado.textContent = '✅ Vídeo guardado en Descargas (' + (hecho.blob.size / 1048576).toFixed(1).replace('.', ',') + ' MB, .' + hecho.ext + ').' + (hecho.ext === 'webm' ? ' Ojo: TikTok, WhatsApp e Instagram no aceptan .webm; este aparato no sabe grabar .mp4.' : ' Vale para TikTok, WhatsApp e Instagram.');
      window.__nacerVideo = { bytes: hecho.blob.size, ext: hecho.ext, seg: total };
    } catch (e) { estado.textContent = '❌ ' + (e.message || e); toast(e.message || 'No se pudo crear el vídeo', 'bad', 8000); }
    grabando = false; t = 0; pintaAcc();
  }
  const m = modal('🎬 Así nació · ' + (pieza.trabajo || 'pieza'), h('div.nc-montar',
    h('div.nc-izq', cv, estado),
    h('div.nc-der',
      h('label.nc-l', h('span', '¿De qué pedido es?'), pedido), h('label.nc-l', h('span', 'Para quién'), para), h('label.nc-l', h('span', 'Título'), titulo),
      h('label.nc-l', h('span', 'Formato'), formato),
      h('label.nc-l', h('span', 'Encuadre: el programa busca la pieza solo. Muévelo si no acierta.'), mueve), h('label.nc-l', h('span', 'Acercar'), zoomI),
      acciones, h('p.tiny.muted', 'La pieza crece seguida (cada foto se funde con la siguiente) y la imagen se acerca despacio. El vídeo se hace en este ordenador con las fotos de la cámara de tu impresora. No se sube a ningún sitio: lo envías tú a quien quieras.'))),
    close => [btn('Cerrar', close)], { size: 'wide', noFocus: true, onclose: () => { vivo = false; turno++; clearTimeout(espera); fotos.forEach(f => { try { f.bm.close(); } catch (e) { } }); } });
  pintaAcc(); requestAnimationFrame(bucle);
  const ns = reparto(pieza.fotos);
  for (let k = 0; k < ns.length && vivo; k++) { try { blobs.push(await desktop.nacerFoto(pieza.id, ns[k])); } catch (e) { /* una foto rota no para el vídeo */ } estado.textContent = 'Cargando las fotos… ' + Math.round((k + 1) / ns.length * 100) + ' %'; }
  if (!blobs.length) { estado.textContent = '❌ No he podido leer las fotos de esta pieza.'; return m; }
  try { // ¿dónde está la pieza? lo que cambia entre el principio y el final
    const a = await createImageBitmap(blobs[0]), b = await createImageBitmap(blobs[blobs.length - 1]); tam = [b.width, b.height]; Z = zona(a, b); a.close(); b.close();
    mueve.value = Math.round(Z.cx * 100); zoomI.value = Math.round(entre(Z.seguro ? 1 / Math.max(Z.ancho * 1.5, 0.34) : 1, 1, 3) * 100);
  } catch (e) { }
  estado.textContent = 'Preparando el encuadre…'; await recorta();
  return m;
}

// ---------- la lista de piezas grabadas ----------
export function dialogoNacer() {
  const caja = h('div.nc-lista'), urls = [];
  let m = null;
  async function pinta() {
    if (!desktop.on) return mount(caja, h('div.nc-vacio', h('i', '🖥️'), h('b', 'Esto se ve en el PC del taller'), h('p', 'Las fotos las hace el programa del ordenador que está en la misma red que la impresora, y se quedan en él. Ábrelo allí.')));
    let D; try { D = await desktop.nacer(); } catch (e) { return mount(caja, h('p.bad-t', 'No se pudo leer: ' + (e.message || e) + (/404|desconocid/i.test(String(e.message)) ? ' Actualiza el programa del PC.' : ''))); }
    const interruptor = h('input', { type: 'checkbox', checked: !!D.activo, 'aria-label': 'Grabar cómo nace cada pieza', onchange: async () => { try { await desktop.nacerAccion({ accion: 'activar', activo: interruptor.checked }); toast(interruptor.checked ? '🎬 A partir de ahora se graba cada pieza' : 'Ya no se graba', 'ok'); pinta(); } catch (e) { toast(e.message, 'bad'); } } });
    const aviso = !D.impresoras ? 'No hay ninguna impresora Bambu vinculada en este ordenador. Vincúlala en Impresión → Bambu Lab.' : !D.compatibles ? 'Tus impresoras usan otro tipo de vídeo (X1, P2S, H2) que todavía no se puede grabar. Funciona con P1P, P1S, A1 y A1 mini.' : D.problema ? 'La última foto falló: ' + D.problema : '';
    const tarjeta = p => {
      const im = h('img.nc-mini', { alt: '', width: 160, height: 90 });
      desktop.nacerFoto(p.id, p.fotos).then(b => { const u = URL.createObjectURL(b); urls.push(u); im.src = u; }).catch(() => { });
      return h('div.nc-pieza', { 'data-id': p.id }, im, h('div.grow', h('b', (p.trabajo || 'Pieza').replace(/\.(3mf|gcode)$/i, '')), h('small', (p.impresora || '') + ' · ' + fdt(p.inicio) + ' · ' + p.fotos + ' fotos'),
        h('span.nc-est' + (p.grabando ? '.rec' : p.terminada ? '.ok' : ''), p.grabando ? '🔴 Grabando · ' + p.pct + ' %' : p.terminada ? '✅ Pieza terminada' : '⏹️ Se quedó en el ' + p.pct + ' %')),
        p.fotos >= 5 ? btn('🎬 Hacer el vídeo', () => montar(p), { cls: 'primary sm nc-hacer' }) : h('span.tiny.muted', 'Aún pocas fotos'),
        p.grabando ? null : btn('', async () => { if (!await confirmDlg('Borrar esta pieza', 'Se borran sus fotos de este ordenador. ¿Seguro?', 'Borrar', true)) return; try { await desktop.nacerAccion({ accion: 'borrar', id: p.id }); pinta(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm ghost icon', icon: 'trash', title: 'Borrar' }));
    };
    mount(caja,
      h('label.nc-activar' + (D.activo ? '.on' : ''), interruptor, h('span', h('b', 'Grabar cómo nace cada pieza'), h('small', 'Una foto limpia por capa (en la P1P, sin el cabezal por medio). Mientras graba, la cámara de la impresora está encendida. Se guardan las 20 últimas piezas, en este ordenador.'))),
      aviso ? h('p.nc-aviso', '⚠️ ' + aviso) : null,
      D.piezas.length ? D.piezas.map(tarjeta) : h('div.nc-vacio', h('i', '🎬'), h('b', D.activo ? 'Todavía no hay ninguna pieza grabada' : 'Actívalo y pon algo a imprimir'), h('p', D.activo ? 'En cuanto la impresora empiece una pieza, aparecerá aquí y se irá llenando sola.' : 'Mañana tendrás el vídeo de tu primera pieza, con el nombre del cliente.')));
  }
  m = modal('🎬 Mira cómo nació tu pieza', caja, close => [btn('Actualizar', pinta, { cls: 'ghost' }), btn('Cerrar', close, { cls: 'primary' })], { size: 'wide', noFocus: true, onclose: () => urls.forEach(u => URL.revokeObjectURL(u)) });
  pinta();
  return m;
}
