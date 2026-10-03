// ================= Campañas y promociones REALES (separadas de los productos) =================
// · Una CAMPAÑA (p. ej. «CELEBRY DAY») define CUÁNDO (manual o periódica), A QUÉ productos y CÓMO se ve la web.
// · Una PROMOCIÓN define el descuento: porcentaje o importe por producto, o «comprando N o más → descuento».
// · Sin valor configurado (pendiente) NO hay descuento. Sin campaña activa NO hay precio tachado, ni «oferta», ni contador.
// · La hora de referencia es SIEMPRE la del servidor. Al acabar la ventana, los precios vuelven solos a la normalidad.

const H = 3600e3, D = 24 * H;
const t = v => { const x = Date.parse(v); return isFinite(x) ? x : null; };
export const enAlcance = (id, inc, exc) => (!Array.isArray(inc) || !inc.length || inc.includes(id)) && !(Array.isArray(exc) && exc.includes(id));

// ---------- Estado de una campaña: inactiva · programada · activa · finalizada ----------
export function estadoCampana(c, now = Date.now()) {
  if (!c || c.estado !== 'lista') return { estado: 'inactiva' };
  const ini = t(c.inicio);
  if (ini === null) return { estado: 'inactiva' };
  if (c.tipo === 'periodica') {
    const per = Math.round(Number(c.cadaDias) * D), dur = Math.round(Number(c.duracionHoras) * H), fin = t(c.repetirHasta);
    if (!(per > 0) || !(dur > 0) || dur > per) return { estado: 'inactiva' };
    if (now < ini) return { estado: 'programada', proxima: new Date(ini).toISOString(), hastaProxima: new Date(ini + dur).toISOString() };
    const k = Math.floor((now - ini) / per), s = ini + k * per, e = s + dur;
    if (fin !== null && s >= fin) return { estado: 'finalizada' };
    if (now < e) return { estado: 'activa', desde: new Date(s).toISOString(), hasta: new Date(fin !== null ? Math.min(e, fin) : e).toISOString() };
    const ns = s + per;
    if (fin !== null && ns >= fin) return { estado: 'finalizada' };
    return { estado: 'programada', proxima: new Date(ns).toISOString(), hastaProxima: new Date(ns + dur).toISOString() };
  }
  const fin = t(c.fin);
  if (fin === null || fin <= ini) return { estado: 'inactiva' };
  if (now < ini) return { estado: 'programada', proxima: new Date(ini).toISOString(), hastaProxima: new Date(fin).toISOString() };
  if (now < fin) return { estado: 'activa', desde: new Date(ini).toISOString(), hasta: new Date(fin).toISOString() };
  return { estado: 'finalizada' };
}

// Promociones que valen AHORA (con su campaña activa, o con sus propias fechas si no tienen campaña)
export function promosActivas(campanas, promos, now = Date.now()) {
  const byId = new Map((campanas || []).map(c => [c.id, c])), out = [];
  (promos || []).forEach(p => {
    if (!p || !p.activa || !(Number(p.valor) > 0)) return; // sin valor = PENDIENTE DE CONFIGURAR → no hay descuento
    if (p.campanaId) {
      const c = byId.get(p.campanaId), st = estadoCampana(c, now);
      if (st.estado !== 'activa') return;
      out.push(Object.assign({}, p, { campana: c, hasta: st.hasta }));
    } else {
      const a = t(p.inicio), b = t(p.fin);
      if (a === null || b === null || now < a || now >= b) return;
      out.push(Object.assign({}, p, { campana: null, hasta: new Date(b).toISOString() }));
    }
  });
  return out;
}
const aplica = (pr, id) => enAlcance(id, pr.incluidos, pr.excluidos) && (!pr.campana || enAlcance(id, pr.campana.incluidos, pr.campana.excluidos));

// Precio de un producto con la mejor promoción de PRODUCTO activa (si no hay, el precio normal sin nada más)
export function precioConPromo(id, baseCent, activas) {
  let best = null;
  (activas || []).filter(p => (p.tipo === 'porcentaje' || p.tipo === 'importe') && aplica(p, id)).forEach(p => {
    const desc = p.tipo === 'porcentaje' ? Math.round(baseCent * Math.min(90, Number(p.valor)) / 100) : Math.min(baseCent - 1, Math.round(Number(p.valor)));
    if (desc > 0 && (!best || desc > best.desc)) best = { desc, p };
  });
  if (!best) return { cent: baseCent, antes: null, pct: 0, promo: null };
  const cent = baseCent - best.desc;
  return { cent, antes: baseCent, pct: Math.round(best.desc / baseCent * 100), promo: { id: best.p.id, nombre: best.p.nombre, campana: best.p.campana ? best.p.campana.nombre : '', hasta: best.p.hasta, combinable: !!best.p.combinable } };
}

// «Comprando N o más → descuento»: se mira la cesta YA calculada (líneas con su precio). Una sola promoción por cantidad (la mejor).
export function descuentoCantidad(lineas, activas) {
  let best = null; const pistas = [];
  (activas || []).filter(p => p.tipo === 'cantidad_porcentaje' || p.tipo === 'cantidad_importe').forEach(p => {
    const el = lineas.filter(l => aplica(p, l.id) && (!l.promo || (p.combinable && l.promo.combinable)));
    const uds = el.reduce((a, l) => a + l.cant, 0), base = el.reduce((a, l) => a + l.totalCent, 0), min = Math.max(2, Number(p.minimo) || 0);
    if (uds < min) { if (uds > 0) pistas.push({ promo: p.nombre, faltan: min - uds, minimo: min, tipo: p.tipo, valor: Number(p.valor) }); return; }
    let desc = p.tipo === 'cantidad_porcentaje' ? Math.round(base * Math.min(90, Number(p.valor)) / 100) : Math.min(base, Math.round(Number(p.valor)));
    if (Number(p.limiteCent) > 0) desc = Math.min(desc, Number(p.limiteCent));
    if (desc > 0 && (!best || desc > best.cent)) best = { id: p.id, nombre: p.nombre, campana: p.campana ? p.campana.nombre : '', cent: desc, minimo: min, unidades: uds, lineas: el.map(l => l.id) };
  });
  return { descuento: best, pistas: best ? [] : pistas.sort((a, b) => a.faltan - b.faltan).slice(0, 1) };
}

// Lo que ve el público: SOLO la campaña activa y las promociones que valen ahora
export function resumenPublico(campanas, promos, now = Date.now()) {
  const act = promosActivas(campanas, promos, now);
  // la web solo «se pone de campaña» si la campaña tiene al menos una promoción REAL (con valor) en marcha
  const cs = (campanas || []).map(c => ({ c, st: estadoCampana(c, now) })).filter(x => x.st.estado === 'activa' && act.some(p => p.campana && p.campana.id === x.c.id));
  const camp = cs[0] ? { id: cs[0].c.id, nombre: cs[0].c.nombre, descripcion: cs[0].c.descripcion || '', hasta: cs[0].st.hasta, aspecto: cs[0].c.aspecto || {} } : null;
  const fmt = p => p.tipo === 'porcentaje' ? '−' + Number(p.valor) + ' %' : p.tipo === 'importe' ? '−' + (Number(p.valor) / 100).toFixed(2).replace('.', ',') + ' €'
    : p.tipo === 'cantidad_porcentaje' ? Math.max(2, Number(p.minimo)) + ' o más productos: −' + Number(p.valor) + ' %' : Math.max(2, Number(p.minimo)) + ' o más productos: −' + (Number(p.valor) / 100).toFixed(2).replace('.', ',') + ' €';
  return { campana: camp, promociones: act.map(p => ({ id: p.id, nombre: p.nombre, tipo: p.tipo, texto: fmt(p), minimo: Number(p.minimo) || 0, hasta: p.hasta, campana: p.campana ? p.campana.nombre : '',
    alcance: { inc: p.incluidos || [], exc: p.excluidos || [], cInc: p.campana ? p.campana.incluidos || [] : [], cExc: p.campana ? p.campana.excluidos || [] : [] } })) };
}

// Próximo cambio (para que ninguna caché dure más que la campaña)
export function proximoCambio(campanas, promos, now = Date.now()) {
  let n = Infinity;
  (campanas || []).forEach(c => { const s = estadoCampana(c, now); [s.hasta, s.proxima].forEach(x => { const v = t(x); if (v !== null && v > now) n = Math.min(n, v); }); });
  (promos || []).filter(p => !p.campanaId).forEach(p => [p.inicio, p.fin].forEach(x => { const v = t(x); if (v !== null && v > now) n = Math.min(n, v); }));
  return n;
}

// ---------- Validación de lo que publica el programa ----------
const s = (v, m) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').trim().slice(0, m);
const ids = v => (Array.isArray(v) ? v : []).slice(0, 500).map(x => s(x, 40)).filter(x => /^[A-Za-z0-9_-]{3,40}$/.test(x));
const iso = v => { const x = t(v); return x === null ? '' : new Date(x).toISOString(); };
export function limpiarCampana(c) {
  const id = s(c.id, 30); if (!/^[a-z0-9_-]{2,30}$/i.test(id)) return { error: 'id de campaña' };
  const tipo = c.tipo === 'periodica' ? 'periodica' : 'manual', a = c.aspecto || {};
  const out = { id, nombre: s(c.nombre, 40) || 'Campaña', descripcion: s(c.descripcion, 200), estado: ['borrador', 'lista', 'pausada'].includes(c.estado) ? c.estado : 'borrador', tipo,
    inicio: iso(c.inicio), fin: tipo === 'manual' ? iso(c.fin) : '', cadaDias: tipo === 'periodica' ? Math.max(1, Math.min(365, Math.round(Number(c.cadaDias) || 0))) : 0,
    duracionHoras: tipo === 'periodica' ? Math.max(1, Math.min(24 * 60, Math.round(Number(c.duracionHoras) || 0))) : 0, repetirHasta: tipo === 'periodica' ? iso(c.repetirHasta) : '',
    incluidos: ids(c.incluidos), excluidos: ids(c.excluidos),
    aspecto: { color: /^#[0-9a-f]{6}$/i.test(a.color || '') ? a.color : '#ff3d7f', color2: /^#[0-9a-f]{6}$/i.test(a.color2 || '') ? a.color2 : '#7b2cff', emoji: s(a.emoji, 4) || '✨', titulo: s(a.titulo, 60), mensaje: s(a.mensaje, 160), efectos: a.efectos !== false } };
  if (out.estado === 'lista') {
    if (!out.inicio) return { error: 'la campaña «' + out.nombre + '» no tiene fecha de inicio' };
    if (tipo === 'manual' && (!out.fin || out.fin <= out.inicio)) return { error: 'la campaña «' + out.nombre + '» necesita una fecha de fin posterior al inicio' };
    if (tipo === 'periodica' && out.duracionHoras > out.cadaDias * 24) return { error: 'en «' + out.nombre + '» la duración no puede ser mayor que la frecuencia' };
  }
  return { campana: out };
}
export const TIPOS_PROMO = ['porcentaje', 'importe', 'cantidad_porcentaje', 'cantidad_importe'];
export function limpiarPromo(p) {
  const id = s(p.id, 30); if (!/^[a-z0-9_-]{2,30}$/i.test(id)) return { error: 'id de promoción' };
  const tipo = TIPOS_PROMO.includes(p.tipo) ? p.tipo : null; if (!tipo) return { error: 'tipo de promoción' };
  const pct = tipo === 'porcentaje' || tipo === 'cantidad_porcentaje';
  let valor = p.valor === null || p.valor === undefined || p.valor === '' ? null : Number(p.valor);
  if (valor !== null && (!isFinite(valor) || valor <= 0 || (pct ? valor > 90 : valor > 1000000))) return { error: 'valor del descuento de «' + s(p.nombre, 40) + '»' };
  if (valor !== null) valor = pct ? Math.round(valor * 100) / 100 : Math.round(valor);
  return { promo: { id, campanaId: p.campanaId ? s(p.campanaId, 30) : '', nombre: s(p.nombre, 60) || 'Promoción', tipo, valor, minimo: tipo.startsWith('cantidad') ? Math.max(2, Math.min(100, Math.round(Number(p.minimo) || 3))) : 0,
    limiteCent: Number(p.limiteCent) > 0 ? Math.round(Number(p.limiteCent)) : null, incluidos: ids(p.incluidos), excluidos: ids(p.excluidos), combinable: p.combinable === true,
    inicio: iso(p.inicio), fin: iso(p.fin), activa: p.activa === true } };
}
