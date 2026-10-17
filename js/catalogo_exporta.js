// ================= 📄 «Exportar catálogo» (16-10-2026): el catálogo para clientes con los productos de AHORA, con un botón =================
// Ella: «tiene que haber una opción que ponga exportar catálogo y directamente te lo hace, así siempre estamos actualizados».
// Junta las piezas que se ven en el Catálogo (no las archivadas, retiradas ni vendidas), prepara sus fotos (tarjeta ≤ 1200 px; las fotos a toda
// página ≤ 2000 px; tapa lo que no conviene enseñar, catalogo_pdf.js → RETOQUES), elige LA PIEZA DEL MES (la destacada en la tienda o la más
// vendida de los últimos 30 días; se puede cambiar) y monta la página con catalogo_pdf.js. En el PC, el programa la convierte en PDF sin
// ventanas (Edge) y la deja en el ESCRITORIO, y la abre. En el móvil o en el navegador: sale la ventana de imprimir → «Guardar como PDF».
import { h, btn, modal, toast, sel, field } from './ui.js';
import { S, byId } from './store.js';
import { filesOf, previewUrl } from './files.js';
import { desktop } from './desktop.js';
import { pState } from './views/productos.js';
import { armaCatalogo, nombreArchivo, piezaDelMes, planFotos, elige, textoDe, precioDe, marcaDe, telefono, retoquesDe } from './catalogo_pdf.js';

const OCULTOS = ['Archivado', 'Retirado', 'Vendido'], CLAVE_MES = 'cd.catalogo.mes';
export const visibles = () => (S.t.productos || []).filter(p => p && !OCULTOS.includes(pState(p.estado)));
// unidades vendidas por producto en los últimos 30 días (sin los pedidos cancelados)
export function ventasMes(pedidos, estados, productos = [], hoy = Date.now()) {
  const fuera = new Set((estados || []).filter(s => s && s.cancelled).map(s => s.k)), desde = new Date(hoy - 30 * 864e5).toISOString().slice(0, 10), v = {};
  const norm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(), porNombre = Object.fromEntries((productos || []).map(p => [norm(p.nombre), p.id]));
  (pedidos || []).forEach(o => { const id = o && (o.productoId || porNombre[norm(o.producto)]); if (!id || fuera.has(o.estado) || String(o.fecha || '').slice(0, 10) < desde) return; v[id] = (v[id] || 0) + (Number(o.cantidad) || 1); });
  return v;
}
// sus fotos, la principal primero
function fotosDe(p) { const L = filesOf('productos', p.id).filter(a => a.tipo === 'foto'), m = (p.fotoId && byId('archivos', p.fotoId)) || L[0]; return m ? [m].concat(L.filter(a => a !== m)) : []; }
const carga = url => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => rej(new Error('no se puede leer la foto')); im.src = url; });
async function imagen(a) { const u = await previewUrl(a).catch(() => '') || a.miniatura; if (!u) throw new Error('sin foto'); return carga(u); }
// la foto → JPEG (como mucho «lado» px) con las zonas de RETOQUES tapadas con su propio color
function jpeg(im, lado, zonas) {
  const W = im.naturalWidth, H = im.naturalHeight, k = Math.min(1, lado / Math.max(W, H)), w = Math.max(1, Math.round(W * k)), hh = Math.max(1, Math.round(H * k));
  const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, w, hh);
  (zonas || []).forEach(z => { const x0 = Math.round(z[0] * w), y0 = Math.round(z[1] * hh), x1 = Math.round(z[2] * w), y1 = Math.round(z[3] * hh); if (x1 - x0 < 3 || y1 - y0 < 3) return;
    const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data, L = []; for (let i = 0; i < d.length; i += 4) L.push([d[i], d[i + 1], d[i + 2]]);
    L.sort((a, b) => a[0] + a[1] + a[2] - b[0] - b[1] - b[2]); const m = L[Math.floor(L.length / 3)]; // el tono del fondo (no el de las letras claras)
    g.save(); g.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`; g.filter = 'blur(1px)'; g.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2); g.restore(); });
  return c.toDataURL('image/jpeg', 0.86);
}
const aDataUrl = async url => { const b = await (await fetch(url)).blob(); return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); }); };
async function recursos() {
  const u = p => new URL(p, import.meta.url).href, F = { 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold' }, fuentes = {};
  await Promise.all(Object.entries(F).map(async ([w, n]) => { fuentes[w] = await aDataUrl(u('../vendor/fonts/inter/Inter-' + n + '.woff2')); }));
  fuentes.serif = await aDataUrl(u('../vendor/fonts/instrument/InstrumentSerif-Italic.woff2'));
  const [logo, icono] = await Promise.all([aDataUrl(u('../icons/logo-full.png')), aDataUrl(u('../icons/icon-192.png'))]);
  return { fuentes, logo, icono };
}

// todo el trabajo (sin la ventana): → { R (lo de armaCatalogo), html } · paso(texto) para ir contando
export async function prepara(mesId, paso = () => { }) {
  const tienda = (S.cfg && S.cfg.tienda) || {}, tel = (tienda.whatsapp && tienda.whatsapp.numero) || (S.cfg && S.cfg.empresa && S.cfg.empresa.telefono) || '';
  if (!telefono(tel)) throw new Error('Falta tu número de WhatsApp: ponlo en Tienda → Datos de la tienda.');
  const P = visibles().filter(p => precioDe(p) > 0), conFoto = P.filter(p => fotosDe(p).length), fotos = {}, tamanos = {}, ims = {}, malas = [];
  let n = 0;
  for (const p of conFoto) { paso('Preparando fotos ' + (++n) + ' de ' + conFoto.length + '…');
    try { const im = await imagen(fotosDe(p)[0]); ims[p.id] = im; tamanos[p.id] = [im.naturalWidth, im.naturalHeight]; fotos[p.id] = jpeg(im, 1200, retoquesDe(p)); } catch (e) { malas.push(textoDe(p).nombre); } }
  const ventas = ventasMes(S.t.pedidos, S.cfg && S.cfg.pedidos && S.cfg.pedidos.estados, S.t.productos), { secciones } = elige(P, fotos), todas = secciones.flat();
  if (!todas.length) throw new Error('No hay ninguna pieza con foto y precio para el catálogo.');
  const mes = mesId && fotos[mesId] ? mesId : piezaDelMes(todas, ventas), plan = planFotos(secciones, tamanos, mes, ventas), grandes = {};
  paso('Preparando las fotos grandes…');
  [mes, plan.bienvenida].concat(plan.aperturas).filter(Boolean).forEach(id => { if (ims[id]) grandes[id] = jpeg(ims[id], 2000, retoquesDe(todas.find(p => p.id === id))); });
  const extra = []; for (const a of fotosDe(todas.find(p => p.id === mes) || {}).slice(1, 3)) { try { extra.push(jpeg(await imagen(a), 1600)); } catch (e) { } }
  paso('Montando el catálogo…');
  const r = await recursos();
  const R = armaCatalogo(Object.assign(r, { productos: P, fotos, grandes, tamanos, ventas, mes: { id: mes, fotos: extra }, tel, marca: marcaDe(tienda.quienes), nombre: (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'CelebriDiseños' }));
  R.malas = malas; R.sinFoto = P.filter(p => !fotosDe(p).length).map(p => textoDe(p).nombre);
  return R;
}
// (16-10) en el iPad o el móvil: si el PC del taller está encendido con el programa, ÉL hace el PDF (Edge, igual que en el PC: con sus
// enlaces de WhatsApp) y lo devuelve; se ve en el visor del programa con «Compartir / Guardar en Archivos». Viaja como encargo «caras»
// con modo 'catalogo' (pc_encargos.js). → el PDF (Blob) o null si no hay PC al otro lado
async function pdfPorPC(html, nombre, paso, signal) {
  const { api } = await import('./store.js'), T = await import('./trabajospc.js');
  const w = await api('pc.servidor', {}, { quiet: true }).catch(() => null); if (!w || !(w.puede || []).includes('caras')) return null;
  paso('📤 Enviando el catálogo al PC del taller (' + w.dispositivo + ')…');
  const F = await import('./files.js'), a = await F.uploadFile(new File([html], 'catalogo_para_pdf_' + Date.now() + '.html', { type: 'text/html' }), { original: true });
  const res = await T.encargarAlPC('caras', { modo: 'catalogo', archivo: T.refArchivo(a), nombre }, { onStatus: t => paso(t), signal, maxMs: 6 * 60000 });
  paso('📥 Recibiendo el PDF…'); const pdf = await F.fetchFile(res.archivo); api('pc.recibido', { id: res.__id }, { quiet: true }).catch(() => { });
  return pdf;
}
// en el PC (lo llama pc_encargos.js): la página que manda el iPad → PDF con Edge sin ventana → se sube y vuelve → { archivo, nombre }
export async function atiendePC(job, progreso) {
  const { desktop: D } = await import('./desktop.js'), T = await import('./trabajospc.js'), F = await import('./files.js'), e = job.entrada || {};
  progreso(5); const html = await (await T.archivoDelEncargo(e.archivo)).text(); progreso(25);
  const pdf = await D.pdfBytes(html); progreso(80);
  const nombre = String(e.nombre || nombreArchivo()).replace(/[\\/:*?"<>|]+/g, ' ');
  const a = await F.uploadFile(new File([pdf], nombre, { type: 'application/pdf' }), { original: true });
  return { archivo: T.refArchivo(a), nombre };
}
// en el móvil / navegador sin PC: la página en un marco escondido y la ventana de imprimir del sistema («Guardar como PDF»)
async function imprimeEnMarco(html) {
  document.getElementById('cat-marco')?.remove();
  const f = h('iframe#cat-marco', { title: 'Catálogo', style: { position: 'fixed', right: '0', bottom: '0', width: '210mm', height: '297mm', border: '0', opacity: '0', pointerEvents: 'none' } });
  document.body.appendChild(f);
  await new Promise(res => { f.onload = res; f.srcdoc = html; });
  const d = f.contentDocument; await d.fonts.ready; await Promise.all([...d.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
  f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 60000);
}

// la ventana del botón
export function abrir() {
  const P = visibles().filter(p => precioDe(p) > 0), conFoto = P.filter(p => fotosDe(p).length);
  const ventas = ventasMes(S.t.pedidos, S.cfg && S.cfg.pedidos && S.cfg.pedidos.estados, S.t.productos), auto = piezaDelMes(conFoto, ventas), mesKey = new Date().toISOString().slice(0, 7);
  let guardada = null; try { const j = JSON.parse(localStorage.getItem(CLAVE_MES) || 'null'); if (j && j.mes === mesKey && conFoto.some(p => p.id === j.id)) guardada = j.id; } catch (e) { }
  const opciones = conFoto.map(p => ({ v: p.id, t: textoDe(p).nombre + ' · ' + p.id + (p.id === auto ? (p.web && p.web.destacado ? '  (destacada)' : ventas[p.id] ? '  (la más vendida)' : '') : '') }))
    .sort((a, b) => (a.v === auto ? -1 : b.v === auto ? 1 : a.t.localeCompare(b.t, 'es')));
  const elegir = sel(opciones, guardada || auto), estado = h('div.small', { style: { minHeight: '1.4em', marginTop: '10px' } });
  const sinFoto = P.length - conFoto.length;
  const cuerpo = h('div',
    h('p', 'Hace el catálogo para tus clientes con las piezas que tienes ahora: ', h('b', conFoto.length + ' piezas'), ', cada una con su precio, su foto y su código para pedir por WhatsApp.'),
    sinFoto ? h('p.small.muted', '⚠ ' + sinFoto + (sinFoto === 1 ? ' pieza no sale porque no tiene foto: ' : ' piezas no salen porque no tienen foto: ') + P.filter(p => !fotosDe(p).length).map(p => textoDe(p).nombre).slice(0, 6).join(', ') + (sinFoto > 6 ? '…' : '') + '.') : null,
    field('⭐ La pieza del mes (con su página: fotos grandes y detalles)', elegir, 'Sale sola: la destacada en la tienda o la más vendida del último mes. Puedes cambiarla.'),
    h('p.small.muted', desktop.on ? '📄 Se guarda en tu escritorio y se abre al terminar (tarda menos de un minuto).' : '📄 Si el PC del taller está encendido con el programa, él hace el PDF y te llega aquí para compartirlo por WhatsApp o guardarlo en Archivos (1–2 minutos). Si no, se abre la ventana de imprimir: elige «Guardar como PDF».'), estado);
  let ocupado = false;
  const m = modal('📄 Catálogo para clientes', cuerpo, close => [btn('Cerrar', close), btn('Crear el catálogo', async ev => {
    if (ocupado) return; ocupado = true; const b = ev.currentTarget; b.disabled = true;
    try { localStorage.setItem(CLAVE_MES, JSON.stringify({ mes: mesKey, id: elegir.value })); } catch (e) { }
    const paso = t => { estado.textContent = t; };
    try {
      const R = await prepara(elegir.value, paso), nombre = nombreArchivo(), avisos = [];
      if (R.malas.length) avisos.push('No se pudo leer la foto de: ' + R.malas.join(', ') + '.');
      let hecho = null;
      if (desktop.on) { paso('Creando el PDF… (' + R.hojas + ' páginas)'); try { const r = await desktop.pdf(R.html, nombre); if (r && r.path) hecho = r; } catch (e) { if (!/404|no encontr|not found/i.test(e.message)) throw e; } }
      if (hecho) {
        paso('✓ Guardado en el escritorio: ' + hecho.path.split(/[\\/]/).pop());
        desktop.open(hecho.path).catch(() => { });
        toast('📄 Catálogo listo: ' + R.piezas + ' piezas, ' + R.hojas + ' páginas. Está en tu escritorio.', 'ok', 8000);
      } else {
        let pdf = null; if (!desktop.on) { try { pdf = await pdfPorPC(R.html, nombre, paso); } catch (e) { paso('⚠ El PC no ha podido hacerlo (' + e.message + '): uso la ventana de imprimir de este aparato.'); } }
        if (pdf) { paso('✓ Catálogo listo (' + R.piezas + ' piezas, ' + R.hojas + ' páginas).'); const V = await import('./pdfview.js');
          m.close(); // (iPad: solo el visor del PDF; antes esta ventana se quedaba debajo y al cerrar el visor había que cerrar otra)
          V.showPdf({ blob: pdf, title: '📄 ' + nombre.replace(/\.pdf$/, ''), fileName: nombre, nota: 'Hecho por el PC del taller. Compártelo por WhatsApp o guárdalo en Archivos.' }); }
        else { paso('Abriendo la ventana de imprimir… elige «Guardar como PDF».'); await imprimeEnMarco(R.html); } }
      if (avisos.length) estado.append(h('div.small', { style: { color: 'var(--warn, #b45309)' } }, '⚠ ' + avisos.join(' ')));
    } catch (e) { estado.textContent = '✗ ' + (e.message || e); toast(e.message || String(e), 'bad'); }
    finally { ocupado = false; b.disabled = false; }
  }, { cls: 'primary', icon: 'download' })], { size: 'md' });
  return m;
}
