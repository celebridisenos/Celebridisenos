// ================= v40 · 📄 MANUAL DE MONTAJE (para meterlo en el paquete o mandarlo al cliente) =================
// La dueña (12-10-2026): «ya que vendemos estos diseños, que vengan con su manual de instrucciones de instalación los que lo
// requieran, los que tengan piezas».
// Para cualquier diseño del catálogo que se MONTA (los que traen «manual» o cuya nota dice «CÓMO SE MONTA: (1)… (2)…»): una hoja
// A4 con la foto del producto montado (sacada del propio 3D, con el color elegido), la lista de piezas con sus cantidades, los
// pasos numerados en letra grande, consejos y cuidados, y la firma de la tienda. Se imprime o se guarda en PDF desde aquí.
// Lo que dice el manual sale del diseño (medidas y piezas reales de ESA variante): no se inventa nada.
import { h, mount, btn, modal, toast } from '../ui.js';

const claro = c => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c || ''); return !m || (parseInt(m[1], 16) * 3 + parseInt(m[2], 16) * 6 + parseInt(m[3], 16)) / 10 > 150; }; // (un color claro no vale para títulos sobre blanco)
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// de la nota de un diseño («… CÓMO SE MONTA: (1) … (2) … Las RUEDAS giran…») a sus pasos
export function pasosDeNota(nota) {
  const t = String(nota || ''), i = t.search(/C[ÓO]MO SE MONTA\s*:/i); if (i < 0) return null;
  const resto = t.slice(i).replace(/^[^:]*:\s*/, ''), trozos = resto.split(/\(\d+\)\s*/).map(x => x.trim()).filter(Boolean); if (trozos.length < 2) return null;
  const ult = trozos[trozos.length - 1], corte = ult.search(/\.\s+[A-ZÁÉÍÓÚ🧪⚠️]/u); let cola = '';
  if (corte > 0) { cola = ult.slice(corte + 1).trim(); trozos[trozos.length - 1] = ult.slice(0, corte + 1); }
  return { pasos: trozos.map(x => x.replace(/[;.]\s*$/, '') + '.').map(x => x[0].toUpperCase() + x.slice(1)), cola };
}
export function tieneManual(D, v) { if (!D) return false; if (D.manual) return true; try { return !!pasosDeNota(typeof D.nota === 'function' ? D.nota(Object.assign({}, v, { que: (D.campos || []).some(c => c.k === 'que') ? ((D.campos.find(c => c.k === 'que').ops || [])[0] || [])[0] : undefined })) : D.nota); } catch (e) { return false; } }
// los datos del manual de un diseño con unos valores
export function datosManual(D, v) {
  if (D.manual) { const m = D.manual(v) || {}; return { piezas: m.piezas || [], pasos: m.pasos || [], consejos: m.consejos || [], cuidados: m.cuidados || [], herramientas: m.herramientas || 'Ninguna: se monta con las manos.', vistas: m.vistas || null, edad: m.edad || '' }; }
  const q0 = (D.campos || []).find(c => c.k === 'que'), nota = typeof D.nota === 'function' ? D.nota(Object.assign({}, v, q0 ? { que: q0.ops[0][0] } : {})) : D.nota, P = pasosDeNota(nota) || { pasos: [], cola: '' };
  return { piezas: [], pasos: P.pasos, consejos: P.cola ? [P.cola] : [], cuidados: [], herramientas: 'Ninguna: se monta con las manos.', vistas: null, edad: '' };
}
// la hoja (HTML que se imprime sola en A4)
export function hojaManual({ titulo, sub, tienda, fotos, M, color }) {
  const c = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#9c6218', hoy = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Manual de montaje · ${esc(titulo)}</title><style>
@page { size: A4; margin: 14mm; } * { box-sizing: border-box; } body { font: 12.5pt/1.5 "Segoe UI", system-ui, sans-serif; color: #1b1814; margin: 0; }
.cab { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${c}; padding-bottom: 6px; } .cab b { font-size: 12pt; letter-spacing: .12em; text-transform: uppercase; } .cab span { font-size: 9.5pt; color: #6a6052; }
h1 { font: 800 25pt/1.15 Georgia, serif; margin: 12px 0 2px; } .sub { color: #5c5346; margin: 0 0 10px; font-size: 12pt; }
.fotos { display: grid; grid-template-columns: ${fotos.length > 1 ? '1.25fr 1fr' : '1fr'}; gap: 10px; margin: 8px 0 12px; } .fotos figure { margin: 0; border: 1px solid #e3dccf; border-radius: 12px; overflow: hidden; background: #f6f2ea; } .fotos img { display: block; width: 100%; height: ${fotos.length > 1 ? '62mm' : '78mm'}; object-fit: contain; } .fotos figcaption { font-size: 9.5pt; color: #5c5346; padding: 4px 10px; border-top: 1px solid #e3dccf; background: #fff; }
h2 { font: 800 13.5pt/1.2 "Segoe UI", sans-serif; margin: 14px 0 6px; color: ${c}; text-transform: uppercase; letter-spacing: .06em; }
table { border-collapse: collapse; width: 100%; font-size: 11.5pt; } td { padding: 4px 8px; border-bottom: 1px solid #ebe4d8; vertical-align: top; } td:first-child { width: 14mm; text-align: center; font-weight: 800; } td small { color: #6a6052; }
ol { list-style: none; margin: 0; padding: 0; counter-reset: paso; } ol li { counter-increment: paso; position: relative; padding: 5px 0 5px 13mm; min-height: 10mm; break-inside: avoid; } ol li::before { content: counter(paso); position: absolute; left: 0; top: 3px; width: 9mm; height: 9mm; border-radius: 50%; background: ${c}; color: #fff; font-weight: 800; display: grid; place-items: center; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
ul { margin: 0; padding-left: 5mm; } ul li { margin: 3px 0; } .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10mm; } .caja { border: 1px solid #e3dccf; border-radius: 10px; padding: 6px 12px; background: #fbf8f2; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pie { margin-top: 12px; border-top: 1px solid #d9d0c0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9.5pt; color: #6a6052; } @media screen { body { max-width: 190mm; margin: 10mm auto; padding: 0 6mm; } }
</style></head><body>
<div class="cab"><b>${esc(tienda || 'CelebriDiseños')}</b><span>Manual de montaje · ${esc(hoy)}</span></div>
<h1>${esc(titulo)}</h1><p class="sub">${esc(sub || '')}</p>
<div class="fotos">${fotos.map(f => `<figure><img src="${f.src}" alt=""><figcaption>${esc(f.pie)}</figcaption></figure>`).join('')}</div>
${M.piezas.length ? `<h2>Qué viene en el paquete</h2><table>${M.piezas.map(p => `<tr><td>${esc(p[1] || 1)} ×</td><td><b>${esc(p[0])}</b>${p[2] ? ` <small>· ${esc(p[2])}</small>` : ''}</td></tr>`).join('')}</table>` : ''}
<div class="dos"><div><h2>Necesitas</h2><div class="caja">${esc(M.herramientas)}</div></div>${M.edad ? `<div><h2>Para quién</h2><div class="caja">${esc(M.edad)}</div></div>` : ''}</div>
<h2>Montaje, paso a paso</h2><ol>${M.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
${M.consejos.length ? `<h2>Consejos</h2><ul>${M.consejos.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
${M.cuidados.length ? `<h2>Cuidados</h2><ul>${M.cuidados.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
<div class="pie"><span>Diseñado y fabricado por ${esc(tienda || 'CelebriDiseños')} · impreso en 3D, pieza a pieza</span><span>¿Alguna duda con el montaje? Escríbenos: te ayudamos.</span></div>
</body></html>`;
}

// abre la ventana del manual desde la ficha de un diseño del catálogo. o = { K, N, k, v, escena, color, acabado, alAcabar() }
// 14-10-2026 · la HOJA sola (sin enseñarla): para «📦 Exportar todo» (Cults) · null si es de una sola pieza
export async function hojaDe(o) {
  const { K, N, k, escena } = o, D = K.DISENOS[k], v = Object.assign({}, o.v); if (!D) return null;
  const M = datosManual(D, v); if (!M.pasos.length) return null;
  // las fotos: montado (si el diseño sabe enseñarse montado) y las piezas tal como salen de la impresora
  const q = (D.campos || []).find(c => c.k === 'que'), ops = q ? q.ops.map(x => x[0]) : [], vistas = M.vistas || [ops.includes('montado') ? ['montado', 'Así queda montado'] : null, ops.length ? [ops.find(x => !/montado|prueba|cerrad|media/.test(x)) || ops[0], 'Las piezas, tal como salen'] : [v.que, 'El producto']].filter(Boolean);
  const fotos = [];
  for (const [que, pie] of vistas) { try { const m = K.genera(k, Object.assign({}, v, q ? { que } : {})); escena.ponPartes([{ id: k, vista: N.aVista(m), color: o.color || D.color || '#7c6cff', acabado: o.acabado || 'mate' }]); escena.encuadrar('iso'); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); fotos.push({ src: escena.foto('image/jpeg', 0.9), pie }); } catch (e) { console.warn('manual: foto', e); } finally { N.limpia(); } }
  if (o.alAcabar) o.alAcabar();
  let tienda = 'CelebriDiseños'; try { const { S } = await import('../store.js'); tienda = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || tienda; } catch (e) { }
  return { M, fotos, html: hojaManual({ titulo: D.t, sub: D.d, tienda, fotos, M, color: claro(o.color || D.color) ? '' : (o.color || D.color) }) };
}
export async function abrirManual(o) {
  const { K, k } = o, D = K.DISENOS[k]; if (!D) return;
  let H; try { H = await hojaDe(o); } catch (e) { return toast('No he podido preparar el manual: ' + (e.message || e), 'bad', 8000); }
  if (!H) return toast('Este diseño es de una sola pieza: no necesita manual de montaje.', 'warn', 6000);
  const { M, fotos, html } = H;
  const marco = h('iframe.man-marco', { title: 'Manual de montaje', sandbox: 'allow-same-origin allow-modals' }); marco.srcdoc = html;
  const nombre = 'Manual_' + D.t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').slice(0, 50);
  window.__r8manual = { k, pasos: M.pasos.length, piezas: M.piezas.length, fotos: fotos.length, html };
  modal('📄 Manual de montaje · ' + D.t, h('div.man', h('p.small.muted', { style: { margin: 0 } }, 'Una hoja A4 para meter en el paquete o mandar al cliente en PDF. Lleva las piezas y las medidas de ESTA variante y el color que tienes elegido.'), marco), close => [btn('Cerrar', close, { cls: 'ghost' }),
    btn('⬇️ Guardar (archivo)', () => { const u = URL.createObjectURL(new Blob([html], { type: 'text/html' })), a = h('a', { href: u, download: nombre + '.html' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); toast('Guardado: ábrelo y «Imprimir → Guardar como PDF» si lo quieres en PDF.', 'ok', 8000); }, { cls: 'man-guardar' }),
    btn('🖨️ Imprimir o guardar en PDF', () => { try { marco.contentWindow.focus(); marco.contentWindow.print(); } catch (e) { toast('No se pudo abrir la impresión: guarda el archivo y ábrelo.', 'warn', 8000); } }, { cls: 'primary man-imprimir' })], { size: 'wide' });
}
