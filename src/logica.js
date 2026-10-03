// ================= Lógica de la tienda (precios, promociones reales, envíos, validación) =================
// Todo se calcula en el SERVIDOR con los datos publicados: el navegador nunca decide un precio.
// Importes siempre en CÉNTIMOS (enteros) para no tener errores de redondeo.

import { precioConPromo, descuentoCantidad } from './campanas.js';
export const VERSION = '1.5.0';
export const MAX_LINEAS = 30, MAX_CANT = 20;

export const hoyMadrid = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export const parseJSON = (s, def) => { try { const v = JSON.parse(s); return v === null || v === undefined ? def : v; } catch (e) { return def; } };

export function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'producto';
}

// Precio que paga AHORA el cliente: el normal, salvo que una PROMOCIÓN REAL activa lo rebaje (activas = promosActivas(...))
export function precioActual(p, activas) {
  return precioConPromo(p.id, Number(p.precio_cent) || 0, activas || []);
}

// Unidades que se pueden vender AHORA: el stock menos lo que otras personas tienen reservado mientras pagan (null = bajo pedido)
export const disponibles = p => (p.stock === null || p.stock === undefined ? null : Math.max(0, Number(p.stock) - Math.max(0, Number(p.reservado) || 0)));

// Descuento por comprar desde la web (ventaja fija, configurada en el programa; el servidor la calcula SIEMPRE).
// dw = { activo, pct, combinable }. Sin configurar o desactivado → no hay descuento web.
export function descWebCfg(cfg) {
  const d = (cfg && cfg.descuentoWeb) || null;
  if (!d || d.activo !== true) return null;
  const pct = Number(d.pct);
  return pct > 0 && pct <= 30 ? { pct, combinable: d.combinable === true } : null;
}
// Precio unitario que paga quien compra en la web (solo informativo en el catálogo: el cobro lo calcula calcularCesta)
export function precioWebUnidad(p, pr, dw) {
  if (!dw) return null;
  const base = pr.promo && !dw.combinable ? null : pr.cent; // con una oferta de producto activa y sin «combinable», la web no suma
  if (base === null) return null;
  const cent = base - Math.round(base * dw.pct / 100);
  return cent < base ? { cent, pct: dw.pct } : null;
}

// Producto tal como lo ve el público (nada interno)
export function publico(p, activas, dw) {
  const pr = precioActual(p, activas), disp = disponibles(p), pw = precioWebUnidad(p, pr, dw);
  return {
    id: p.id, slug: p.slug, nombre: p.nombre, descripcion: p.descripcion, caracteristicas: parseJSON(p.caracteristicas, []), categoria: p.categoria,
    precio: pr.cent, antes: pr.antes, descuento: pr.pct, promo: pr.promo, precioWeb: pw ? pw.cent : null, descuentoWebPct: pw ? pw.pct : 0,
    destacado: !!p.destacado, novedad: !!p.novedad, personalizable: !!p.personalizable, pesoG: Number(p.peso_g) || 0, variantes: parseJSON(p.variantes, []),
    disponible: disp === null ? 'bajo_pedido' : disp > 0 ? 'en_stock' : 'agotado',
    stock: disp, plazoDias: Number(p.plazo_dias) || 0,
    fotos: parseJSON(p.fotos, []), relacionados: parseJSON(p.relacionados, []), seoTitulo: p.seo_titulo || '', seoDesc: p.seo_desc || ''
  };
}

// ---------- Envíos: 3 opciones con TRAMOS DE PESO publicados desde el programa ----------
// Solo se ofrece una opción si está CONFIRMADA (precio real puesto por la tienda), cubre el peso y el país.
export function cotizar(cfg, pesoG, pais, subtotalCent) {
  const E = (cfg && cfg.envios) || {}, paises = Array.isArray(E.paises) ? E.paises : [];
  const out = { pesoG, pais, opciones: [], aviso: '' };
  if (!paises.includes(pais)) { out.aviso = 'Todavía no enviamos a este país desde la web. Escríbenos por WhatsApp y lo vemos.'; return out; }
  (Array.isArray(E.opciones) ? E.opciones : []).forEach(o => {
    if (!o || !o.confirmado || !o.id) return;
    if (Array.isArray(o.paises) && o.paises.length && !o.paises.includes(pais)) return;
    const t = (Array.isArray(o.tramos) ? o.tramos : []).filter(x => Number(x.hastaG) >= pesoG).sort((a, b) => a.hastaG - b.hastaG)[0];
    if (!t) return;
    let cent = Math.round(Number(t.cent));
    if (!(cent >= 0)) return;
    const gratis = Number(E.gratisDesdeCent) > 0 && subtotalCent >= Number(E.gratisDesdeCent) && o.id === (E.gratisOpcion || o.id);
    if (gratis) cent = 0;
    out.opciones.push({ id: String(o.id), nombre: String(o.nombre || o.id), descripcion: String(o.descripcion || ''), transportista: String(o.transportista || ''), plazo: String(o.plazo || ''), cent, gratis });
  });
  if (!out.opciones.length) out.aviso = 'No hay un envío configurado para este peso o destino. Escríbenos por WhatsApp y te damos precio.';
  return out;
}

// ---------- Validación ----------
const CP = { ES: /^\d{5}$/, PT: /^\d{4}-?\d{3}$/, FR: /^\d{5}$/, IT: /^\d{5}$/, DE: /^\d{5}$/ };
const txt = (v, min, max) => { v = String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim(); return v.length >= min && v.length <= max ? v : null; };
export function validarCliente(c, paises) {
  c = c && typeof c === 'object' ? c : {};
  const e = {}, r = {};
  r.nombre = txt(c.nombre, 2, 80); if (!r.nombre) e.nombre = 'Escribe tu nombre y apellidos.';
  r.email = txt(c.email, 5, 120); if (!r.email || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(r.email)) e.email = 'El email no parece correcto.';
  r.telefono = String(c.telefono || '').replace(/[\s.-]/g, ''); if (!/^\+?\d{6,15}$/.test(r.telefono)) e.telefono = 'El teléfono no parece correcto (solo números, puedes poner el prefijo +34).';
  r.direccion = txt(c.direccion, 5, 140); if (!r.direccion) e.direccion = 'Escribe la dirección (calle, número, piso).';
  r.pais = String(c.pais || '').toUpperCase(); if (!/^[A-Z]{2}$/.test(r.pais) || (paises && !paises.includes(r.pais))) e.pais = 'Elige un país de la lista.';
  r.cp = String(c.cp || '').trim().toUpperCase(); if (!(CP[r.pais] || /^[A-Z0-9 -]{3,10}$/).test(r.cp)) e.cp = 'El código postal no es válido para ese país.';
  r.ciudad = txt(c.ciudad, 2, 60); if (!r.ciudad) e.ciudad = 'Escribe la población.';
  r.provincia = txt(c.provincia, 0, 60) || '';
  r.notas = txt(c.notas, 0, 300) || '';
  return { ok: !Object.keys(e).length, errores: e, cliente: r };
}

// Comprueba las líneas de la cesta contra los productos PUBLICADOS y calcula todo (promociones reales incluidas)
export function calcularCesta(lineas, productos, activas, dw) {
  const errores = [], out = [];
  if (!Array.isArray(lineas) || !lineas.length) return { ok: false, errores: ['La cesta está vacía.'] };
  if (lineas.length > MAX_LINEAS) return { ok: false, errores: ['Demasiados productos distintos en la cesta.'] };
  const byId = new Map(productos.map(p => [p.id, p]));
  let subtotal = 0, antes = 0, peso = 0;
  lineas.forEach((l, i) => {
    const p = byId.get(String(l && l.id));
    if (!p || p.estado !== 'publicado') { errores.push('Un producto de tu cesta ya no está disponible.'); return; }
    const cant = Number(l.cant);
    if (!Number.isInteger(cant) || cant < 1 || cant > MAX_CANT) { errores.push('Cantidad no válida en «' + p.nombre + '».'); return; }
    const vars = parseJSON(p.variantes, []), sel = l.variante && typeof l.variante === 'object' ? l.variante : {}, elegida = {};
    for (const v of vars) {
      const val = sel[v.nombre];
      if (!Array.isArray(v.valores) || !v.valores.includes(val)) { errores.push('Elige ' + String(v.nombre).toLowerCase() + ' en «' + p.nombre + '».'); return; }
      elegida[v.nombre] = val;
    }
    const disp = disponibles(p);
    if (disp !== null) {
      const ya = out.filter(x => x.id === p.id).reduce((a, x) => a + x.cant, 0); // la misma pieza en otra línea (otro color…) también cuenta
      if (disp < ya + cant) { errores.push(disp - ya > 0 ? 'Solo quedan ' + (disp - ya) + ' de «' + p.nombre + '».' : '«' + p.nombre + '» está agotado.'); return; }
    }
    const pr = precioActual(p, activas);
    subtotal += pr.cent * cant; antes += (pr.antes || pr.cent) * cant; peso += (Number(p.peso_g) || 0) * cant;
    out.push({ id: p.id, slug: p.slug, nombre: p.nombre, cant, variante: elegida, unidadCent: pr.cent, antesCent: pr.antes, totalCent: pr.cent * cant, promo: pr.promo, foto: parseJSON(p.fotos, [])[0] || '' });
  });
  // «comprando N o más → descuento» (solo si hay una promoción real activa y con valor)
  const q = errores.length ? { descuento: null, pistas: [] } : descuentoCantidad(out, activas || []);
  let dq = q.descuento, web = null;
  if (!errores.length && dw) {
    // base del descuento web: sin «combinable», solo las líneas SIN oferta de producto (nunca se acumula con una campaña); con «combinable», todo lo que quede
    const el = dw.combinable ? out : out.filter(l => !l.promo), base = el.reduce((a, l) => a + l.totalCent, 0) - (dw.combinable && dq ? dq.cent : 0);
    const w = base > 0 ? Math.round(base * dw.pct / 100) : 0;
    if (w > 0) {
      web = { id: 'web', nombre: 'Descuento web ' + dw.pct + ' %', cent: w, pct: dw.pct, lineas: el.map(l => l.id) };
      if (!dw.combinable && dq && dq.cent >= web.cent) web = null; // dos descuentos distintos no se suman: gana el mejor para el cliente
      else if (!dw.combinable && dq) dq = null;
    }
  }
  const desc = (dq ? dq.cent : 0) + (web ? web.cent : 0);
  return { ok: !errores.length, errores, lineas: out, subtotalCent: subtotal, descuentoCantidad: dq, descuentoWeb: web, pistas: dq || q.descuento ? [] : q.pistas, descuentoCent: desc, productosCent: subtotal - desc, ahorroCent: antes - subtotal + desc, pesoG: peso };
}

export const eur = c => (Number(c) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// ================= v1.4 · Seguimiento del pedido para el cliente =================
// Fases que el PROGRAMA publica (la tienda nunca las inventa). «recibido» = pagado y a la espera.
export const FASES = ['recibido', 'imprimiendo', 'preparando', 'enviado', 'entregado'];
export const faseOk = f => FASES.indexOf(f) >= 0;
export const limpiarCodigo = c => String(c || '').replace(/\s+/g, '').slice(0, 40);
export const codigoOk = c => /^[A-Za-z0-9][A-Za-z0-9-]{3,39}$/.test(c);
// Enlace a la web del transportista (solo de los que tienen una dirección de seguimiento conocida y estable);
// con cualquier otro se enseña el código para copiarlo. El código ya viene validado (solo letras, números y guiones).
export function urlSeguimiento(transportista, codigo) {
  const c = limpiarCodigo(codigo), t = String(transportista || '').toLowerCase();
  if (!codigoOk(c)) return '';
  const e = encodeURIComponent(c);
  if (/correos\s*express/.test(t)) return 'https://s.correosexpress.com/c?n=' + e;
  if (/correos/.test(t)) return 'https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=' + e;
  if (/seur/.test(t)) return 'https://www.seur.com/livetracking/?segOnlineIdentificador=' + e;
  if (/\bgls\b/.test(t)) return 'https://gls-group.com/ES/es/seguimiento-envio?match=' + e;
  if (/dhl/.test(t)) return 'https://www.dhl.com/es-es/home/tracking.html?tracking-id=' + e;
  if (/\bups\b/.test(t)) return 'https://www.ups.com/track?loc=es_ES&tracknum=' + e;
  return '';
}
// Lo que ve el cliente (nunca dirección, teléfono ni email). Solo pedidos PAGADOS tienen fase.
export function vistaSeguimiento(p) {
  const pagado = p.estado === 'pagado';
  const fase = pagado ? (faseOk(p.fase) ? p.fase : 'recibido') : '';
  const transp = String(p.transportista || '').slice(0, 30), cod = limpiarCodigo(p.codigo_seg);
  return {
    id: p.id, creado: p.creado, pagadoEn: p.pagado_en || '', estado: p.estado, fase, faseEn: p.fase_en || '',
    lineas: (parseJSON(p.lineas, []) || []).map(l => ({ nombre: String(l.nombre || '').slice(0, 120), cant: Number(l.cant) || 1, variante: l.variante || null })),
    envio: String((parseJSON(p.envio, {}) || {}).nombre || '').slice(0, 80),
    transportista: fase === 'enviado' || fase === 'entregado' ? transp : '', codigo: (fase === 'enviado' || fase === 'entregado') && codigoOk(cod) ? cod : '',
    url: fase === 'enviado' || fase === 'entregado' ? urlSeguimiento(transp, cod) : ''
  };
}
