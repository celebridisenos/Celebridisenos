// ================= v13.5 · Visor de PDF propio (PC, Android e iPhone) =================
// Antes el PDF de una etiqueta se abría con window.open(blob:…) DESPUÉS de esperar al servidor:
//  · el navegador del móvil lo bloqueaba (ya no era «un toque» de la persona) o abría una pestaña en blanco;
//  · Chrome de Android no sabe mostrar un PDF dentro de la página (iframe en blanco);
//  · en el iPhone con la app instalada (pantalla de inicio) las direcciones blob: salen vacías;
//  · el enlace se borraba al minuto: no se podía volver a abrir.
// Ahora el PDF se enseña DENTRO de la app (cada página dibujada como imagen) y desde ahí se imprime,
// se descarga, se comparte o se abre con el visor del sistema. Funciona igual en el PC y en el móvil.
import { h, mount, btn, modal, toast, bytes } from './ui.js';
import { desktop } from './desktop.js';

// ---------- pdf.js con la compatibilidad de móviles antiguos cargada antes ----------
let libP = null;
export function pdfjs() {
  if (libP) return libP;
  libP = (async () => {
    await import('../vendor/pdfjs/compat.mjs');
    const m = await import('../vendor/pdfjs/pdf.mjs');
    m.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.compat.mjs', import.meta.url).href;
    return m;
  })();
  libP.catch(() => { libP = null; });
  return libP;
}
export const isPdfBlob = async b => { try { const t = new Uint8Array(await b.slice(0, 5).arrayBuffer()); return String.fromCharCode(...t) === '%PDF-'; } catch (e) { return false; } };

// Dibuja las páginas de un PDF. Devuelve [{ canvas, wmm, hmm }] (tamaño real de cada página en mm).
export async function renderPdf(blob, opts = {}) {
  if (!blob || !blob.size) throw new Error('El PDF está vacío (0 bytes).');
  if (!(await isPdfBlob(blob))) throw new Error('El archivo no es un PDF válido (no empieza por %PDF).');
  const lib = await pdfjs();
  let doc;
  try { doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise; }
  catch (e) { throw new Error(/password/i.test(e && e.name) ? 'El PDF tiene contraseña: ábrelo con tu visor de PDF.' : 'No se puede leer el PDF (' + ((e && e.message) || e) + ').'); }
  const max = Math.min(doc.numPages, opts.maxPages || 30), pages = [];
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i), vp1 = page.getViewport({ scale: 1 });
    const wmm = vp1.width / 72 * 25.4, hmm = vp1.height / 72 * 25.4;
    // unas 1300 px de ancho: nítido en pantalla y al imprimir una etiqueta (≈ 330 ppp a 10 cm) sin gastar la memoria del móvil
    const scale = Math.max(1, Math.min(opts.maxScale || 4, (opts.targetPx || 1300) / vp1.width)), vp = page.getViewport({ scale });
    const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    pages.push({ canvas: cv, wmm, hmm });
  }
  return { pages, total: doc.numPages };
}

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = () => isIOS() || /Android|Mobi/i.test(navigator.userAgent);
const standalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const safeName = s => (String(s || 'documento').replace(/[\\/:*?"<>|#%\u0000-\u001f]+/g, '_').replace(/\s+/g, '_').replace(/\.pdf$/i, '').slice(0, 90) || 'documento') + '.pdf';
const toBlob = cv => new Promise(r => cv.toBlob(b => r(b), 'image/jpeg', 0.92));

// ---------- Imprimir: solo las páginas, a su tamaño real (sin márgenes ni «ajustar») ----------
export async function printPages(pages) {
  if (!pages || !pages.length) throw new Error('No hay nada que imprimir.');
  document.getElementById('print-root')?.remove(); document.getElementById('print-page')?.remove();
  const w = pages[0].wmm, hh = pages[0].hmm;
  const urls = await Promise.all(pages.map(async p => URL.createObjectURL(await toBlob(p.canvas))));
  const root = h('div#print-root.print-pdf', urls.map((u, i) => h('img.pdf-print-page', { src: u, alt: 'Página ' + (i + 1), style: { width: pages[i].wmm.toFixed(2) + 'mm', height: pages[i].hmm.toFixed(2) + 'mm' } })));
  const style = h('style#print-page', '@page { size: ' + w.toFixed(2) + 'mm ' + hh.toFixed(2) + 'mm; margin: 0; } body.printing #print-root img { display: block; break-after: page; page-break-after: always; } body.printing #print-root img:last-child { break-after: auto; page-break-after: auto; }');
  document.head.appendChild(style); document.body.appendChild(root); document.body.classList.add('printing');
  await Promise.race([Promise.all([...root.querySelectorAll('img')].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))), new Promise(r => setTimeout(r, 3000))]);
  let done = false;
  const clean = () => { if (done) return; done = true; root.remove(); style.remove(); document.body.classList.remove('printing'); urls.forEach(u => URL.revokeObjectURL(u)); window.removeEventListener('afterprint', clean); };
  window.addEventListener('afterprint', clean);
  window.print();
  setTimeout(() => { window.addEventListener('focus', clean, { once: true }); document.addEventListener('pointerdown', clean, { once: true }); }, 800);
}

// ---------- Guardar / compartir ----------
export function downloadBlob(blob, name) {
  const u = URL.createObjectURL(blob), a = h('a', { href: u, download: name, rel: 'noopener' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 120000);
}
export async function sharePdf(blob, name, title) {
  const f = new File([blob], name, { type: 'application/pdf' });
  if (!navigator.canShare || !navigator.canShare({ files: [f] })) return false;
  try { await navigator.share({ files: [f], title: title || name }); return true; }
  catch (e) { if (e && e.name === 'AbortError') return true; throw e; }
}
// PC con el programa: se guarda en %LOCALAPPDATA%\CelebriDisenos\PDF y se abre con el visor de Windows
export async function saveOnPc(blob, name, abrir) {
  const info = await desktop.info();
  const dir = String((info && info.backupDir) || '').replace(/[\\/][^\\/]+$/, '');
  if (!dir) throw new Error('No sé dónde guardar en este PC.');
  const sep = dir.includes('\\') ? '\\' : '/';
  const r = await desktop.save(dir + sep + 'PDF' + sep + name, blob, true);
  const path = (r && r.path) || (dir + sep + 'PDF' + sep + name);
  if (abrir) await desktop.open(path);
  return path;
}

// ---------- Visor ----------
// opts: { blob (PDF), pages?: [{canvas, wmm, hmm}] (si ya están dibujadas), title, fileName, nota, onclose }
// Devuelve { close, closed (promesa), pages }.
export async function showPdf(opts = {}) {
  const name = safeName(opts.fileName || opts.title);
  try { if (typeof window.__cdTestPdf === 'function') window.__cdTestPdf(opts.blob, { title: opts.title, fileName: name }); } catch (e) { } // solo pruebas automáticas
  const box = h('div.pdfv-pages', h('p.muted.small', 'Preparando el PDF…'));
  const info = h('p.tiny.muted.pdfv-info');
  const urls = [];
  let pages = opts.pages || null, closedRes;
  const closed = new Promise(r => { closedRes = r; });
  const busy = async (b, fn) => { b.disabled = true; try { await fn(); } catch (e) { toast(e.message || String(e), 'bad', 8000); } finally { b.disabled = false; } };
  const acciones = close => {
    const out = [];
    out.push(btn('Cerrar', close, { cls: 'ghost' }));
    if (desktop.on) {
      out.push(btn('Abrir con el visor del PC', ev => busy(ev.target.closest('button'), async () => { const p = await saveOnPc(opts.blob, name, true); toast('📄 Guardado en ' + p, 'ok', 6000); }), { icon: 'external' }));
      out.push(btn('Guardar PDF', ev => busy(ev.target.closest('button'), async () => { const p = await saveOnPc(opts.blob, name, false); toast('📄 Guardado en ' + p, 'ok', 8000); }), { icon: 'download' }));
    } else {
      if (navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(1)], 'x.pdf', { type: 'application/pdf' })] })) out.push(btn(isIOS() ? 'Compartir / Guardar en Archivos' : 'Compartir', ev => busy(ev.target.closest('button'), async () => { if (!(await sharePdf(opts.blob, name, opts.title))) downloadBlob(opts.blob, name); }), { icon: 'send' }));
      out.push(btn('Descargar PDF', () => { downloadBlob(opts.blob, name); toast('📄 ' + name + ' descargado (mira en «Descargas»).', 'ok', 6000); }, { icon: 'download' }));
      if (!isMobile() && !standalone()) out.push(btn('Abrir en otra pestaña', () => { const u = URL.createObjectURL(opts.blob); urls.push(u); const w = window.open(u, '_blank'); if (!w) downloadBlob(opts.blob, name); }, { icon: 'external' }));
    }
    out.push(btn('Imprimir', ev => busy(ev.target.closest('button'), async () => { if (!pages) throw new Error('Espera a que se vea el PDF.'); await printPages(pages); }), { cls: 'primary', icon: 'printer' }));
    return out;
  };
  const m = modal(opts.title || 'PDF', h('div.col.pdfv', opts.nota ? h('p.small', opts.nota) : null, box, info), acciones, {
    size: 'wide', onclose: () => { urls.forEach(u => URL.revokeObjectURL(u)); closedRes(true); opts.onclose && opts.onclose(); }
  });
  m.el.classList.add('pdfv-modal');
  try {
    let total = pages ? pages.length : 0;
    if (!pages) { const r = await renderPdf(opts.blob); pages = r.pages; total = r.total; }
    if (!pages.length) throw new Error('El PDF no tiene páginas.');
    const imgs = await Promise.all(pages.map(async (p, i) => {
      const b = await toBlob(p.canvas); const u = URL.createObjectURL(b); urls.push(u);
      return h('figure.pdfv-page', h('img', { src: u, alt: 'Página ' + (i + 1), style: { aspectRatio: p.wmm + ' / ' + p.hmm, maxWidth: Math.round(p.wmm * 3.2) + 'px' } }), pages.length > 1 ? h('figcaption.tiny.muted', 'Página ' + (i + 1) + ' de ' + total) : null);
    }));
    mount(box, imgs);
    const p0 = pages[0];
    info.textContent = (total === 1 ? '1 página' : total + ' páginas') + ' · ' + Math.round(p0.wmm) + ' × ' + Math.round(p0.hmm) + ' mm · ' + bytes(opts.blob ? opts.blob.size : 0) + (total > pages.length ? ' · se muestran las ' + pages.length + ' primeras' : '') + ' · al imprimir: «Tamaño real» / escala 100 %.';
  } catch (e) {
    mount(box, h('div.pdfv-err', h('p.bad-t', 'No se puede mostrar el PDF aquí: ' + (e.message || e)), h('p.small.muted', 'Puedes descargarlo o abrirlo con tu visor de PDF con los botones de abajo.')));
  }
  return { close: m.close, closed, get pages() { return pages; }, el: m.el };
}
