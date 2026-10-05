// ================= v10.8 · Documentos imprimibles: etiquetas, presupuestos y facturas =================
// Se imprime SOLO el documento (el resto de la app se oculta). "Guardar como PDF" en la ventana de
// impresión del sistema. En el móvil también funciona (Compartir → Imprimir / Guardar PDF).
import { h, eur, fdate } from './ui.js';
import { S } from './store.js';
import { qrSvg } from './qr.js';

const esc = s => String(s == null ? '' : s);

// Datos del emisor: los fiscales si están; si no, los de la empresa
export function emisor() {
  const f = (S.cfg && S.cfg.facturacion) || {}, e = (S.cfg && S.cfg.empresa) || {};
  const loc = [f.cp, f.ciudad].filter(Boolean).join(' ') + (f.provincia ? ' (' + f.provincia + ')' : '');
  return { nombre: f.razonSocial || e.nombre || '', comercial: e.nombre || '', nif: f.nif || '', direccion: f.direccion || '', localidad: loc.trim(),
    email: f.email || e.email || '', telefono: f.telefono || e.telefono || '', web: e.web || '', logo: e.logo || 'icons/logo-full.png', pie: f.pie || '' };
}
export function fiscalReady() { const f = (S.cfg && S.cfg.facturacion) || {}; return !!(String(f.razonSocial || '').trim() && String(f.nif || '').trim()); }

// Dirección pública de la app (para los QR)
export function appUrl() {
  let u = (S.cfg && (S.cfg.appUrl || (S.cfg.invitaciones && S.cfg.invitaciones.appUrl))) || '';
  try { const saved = localStorage.getItem('cd.appUrl'); if (saved && /^https:\/\//.test(saved) && !/github\.com\//.test(saved)) u = saved; } catch (e) { }
  if (!u && location.protocol === 'https:') u = location.origin + location.pathname;
  return u ? u.replace(/[?#].*$/, '').replace(/\/?$/, '/') : '';
}

export async function printDoc(node, { size = 'a4' } = {}) {
  document.getElementById('print-root')?.remove();
  const root = h('div#print-root', { class: 'print-' + size }, node);
  const style = h('style#print-page', size === 'label' ? '@page { size: 100mm 150mm; margin: 3mm; }' : '@page { size: A4; margin: 12mm; }');
  document.head.appendChild(style);
  document.body.appendChild(root);
  document.body.classList.add('printing');
  // que las imágenes (logo) estén cargadas antes de imprimir
  await Promise.race([Promise.all([...root.querySelectorAll('img')].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))), new Promise(r => setTimeout(r, 2000))]);
  let done = false;
  const clean = () => { if (done) return; done = true; root.remove(); style.remove(); document.body.classList.remove('printing'); window.removeEventListener('afterprint', clean); };
  window.addEventListener('afterprint', clean);
  window.print();
  setTimeout(() => { window.addEventListener('focus', clean, { once: true }); document.addEventListener('pointerdown', clean, { once: true }); }, 800);
}

// ---------- Etiqueta de envío (100 × 150 mm) con QR ----------
export function labelDoc(o, c) {
  const em = emisor(), base = appUrl();
  const link = base ? base + '#/pedidos/' + o.id + '/?enviar=1' : '';
  const dest = o.direccionEnvio && o.direccionEnvio !== '•••' ? o.direccionEnvio : c && c.direccion && c.direccion !== '•••' ? c.direccion : ''; // v13.7: manda la dirección de envío del pedido
  return h('div.doc.label',
    h('div.lb-top', h('b', 'PEDIDO Nº ' + esc(o.numero)), h('span', fdate(o.fecha))),
    h('div.lb-box', h('div.lb-t', 'DE'), h('div.lb-from', h('b', em.comercial || em.nombre), em.direccion ? h('div', em.direccion) : null, em.localidad ? h('div', em.localidad) : null, em.telefono ? h('div', em.telefono) : null)),
    h('div.lb-box.to', h('div.lb-t', 'PARA'), h('div.lb-name', esc(o.cliente)),
      dest ? h('div.lb-addr', dest) : h('div.lb-addr.empty', 'Dirección: ______________________________\n______________________________'),
      c && c.telefono && c.telefono !== '•••' ? h('div.lb-tel', '☎ ' + c.telefono) : null),
    h('div.lb-bottom',
      link ? h('div.lb-qr', { html: qrSvg(link, 3) }) : null,
      h('div.lb-info', h('div', h('b', (o.cantidad > 1 ? o.cantidad + ' × ' : '') + esc(o.producto))), o.personalizacion ? h('div.small', esc(o.personalizacion)) : null,
        o.envio ? h('div.small', 'Envío: ' + o.envio) : null,
        link ? h('div.tiny', '📱 Escanea el QR al entregarlo en el punto de envío: se marca como enviado.') : null)));
}

// ---------- Documento A4 (factura o presupuesto) ----------
function head(title, number, date, extra) {
  const em = emisor();
  return h('div.dh',
    h('div.dh-l', h('img.dh-logo', { src: em.logo, alt: '' }), h('div', h('b.dh-name', em.nombre), em.nif ? h('div', 'NIF: ' + em.nif) : null, em.direccion ? h('div', em.direccion) : null, em.localidad ? h('div', em.localidad) : null,
      [em.telefono, em.email].filter(Boolean).length ? h('div', [em.telefono, em.email].filter(Boolean).join(' · ')) : null, em.web ? h('div', em.web) : null)),
    h('div.dh-r', h('div.dh-title', title), h('div.dh-num', number), h('div', 'Fecha: ' + fdate(date, true)), extra || null));
}
function lineTable(rows, cols) {
  return h('table.dt', h('thead', h('tr', cols.map(c => h('th' + (c.r ? '.r' : ''), c.t)))), h('tbody', rows.map(r => h('tr', cols.map(c => h('td' + (c.r ? '.r' : ''), c.v(r)))))));
}
const pct = x => Math.round(Number(x) * 100) + ' %';
const qty = x => String(Number(x)).replace('.', ',');

export function invoiceDoc(f) {
  const title = f.tipo === 'Rectificativa' ? 'FACTURA RECTIFICATIVA' : f.tipo === 'Simplificada' ? 'FACTURA SIMPLIFICADA' : 'FACTURA';
  const em = emisor();
  return h('div.doc.a4',
    head(title, 'Nº ' + f.numero, f.fecha, f.rectificaA ? h('div.small', 'Rectifica a la factura ' + f.rectificaA) : null),
    h('div.dc', h('div.dc-t', 'CLIENTE'), h('b', f.cliente), f.nif ? h('div', 'NIF: ' + f.nif) : null, f.direccion ? h('div', { style: { whiteSpace: 'pre-wrap' } }, f.direccion) : null, f.email ? h('div', f.email) : null),
    lineTable(f.lineas || [], [{ t: 'Descripción', v: l => l.descripcion }, { t: 'Cant.', r: 1, v: l => qty(l.cantidad) }, { t: 'Precio (sin IVA)', r: 1, v: l => eur(l.precioBase) }, { t: 'Importe (sin IVA)', r: 1, v: l => eur(l.base) }]),
    h('div.tot', h('div', h('span', 'Base imponible'), h('b', eur(f.base))), h('div', h('span', 'IVA ' + pct(f.tipoIva)), h('b', eur(f.cuota))), h('div.big', h('span', 'TOTAL'), h('b', eur(f.total)))),
    f.motivo && f.tipo === 'Rectificativa' ? h('p.dn', 'Motivo de la rectificación: ' + f.motivo) : null,
    f.notas ? h('p.dn', f.notas) : null,
    appUrl() && f.id ? h('div.dqr', { html: qrSvg(appUrl() + '#/q/factura/' + encodeURIComponent(f.id), 2) }, ) : null,
    h('div.df', em.pie || ''));
}

export function budgetDoc(p) {
  const iva = Number((S.cfg.facturacion || {}).tipoIva ?? 0.21);
  const sub = (p.lineas || []).reduce((a, l) => a + Number(l.cantidad) * Number(l.precio), 0);
  const tot = Number(p.total) || (sub + Number(p.envio || 0) - Number(p.descuento || 0));
  const base = Math.round(tot / (1 + iva) * 100) / 100;
  return h('div.doc.a4',
    head('PRESUPUESTO', 'Nº ' + p.numero, p.fecha, p.validoHasta ? h('div', 'Válido hasta: ' + fdate(p.validoHasta, true)) : null),
    h('div.dc', h('div.dc-t', 'PARA'), h('b', p.cliente), p.contacto ? h('div', p.contacto) : null),
    lineTable(p.lineas || [], [{ t: 'Descripción', v: l => l.descripcion }, { t: 'Cant.', r: 1, v: l => qty(l.cantidad) }, { t: 'Precio', r: 1, v: l => eur(l.precio) }, { t: 'Importe', r: 1, v: l => eur(Number(l.cantidad) * Number(l.precio)) }]),
    h('div.tot', h('div', h('span', 'Subtotal'), h('b', eur(sub))),
      Number(p.envio) ? h('div', h('span', 'Envío'), h('b', eur(p.envio))) : null,
      Number(p.descuento) ? h('div', h('span', 'Descuento'), h('b', '−' + eur(p.descuento))) : null,
      h('div.big', h('span', 'TOTAL (IVA incluido)'), h('b', eur(tot))),
      h('div.small', h('span', 'Base ' + eur(base) + ' + IVA ' + pct(iva) + ' ' + eur(Math.round((tot - base) * 100) / 100)))),
    p.notas ? h('p.dn', p.notas) : null,
    p.condiciones ? h('div.dn', h('b', 'Condiciones: '), p.condiciones) : null,
    h('div.df', 'Presupuesto sin compromiso. Para aceptarlo, responde a este mensaje. ' + (emisor().pie || '')));
}

// Vista previa dentro de la app (el mismo documento, a escala)
export function preview(doc, size = 'a4') { return h('div.doc-preview.' + size, doc); }
