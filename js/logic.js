// ================= Lógica compartida (servidor + app) =================
// Este archivo se usa IGUAL en el servidor de Google y en la app (PC y móvil),
// para que los contadores, plazos y estadísticas salgan siempre idénticos.
// ES5 puro: sin dependencias.

var CL = (function () {
  function s(v) { return v === null || v === undefined ? '' : String(v); }
  function n(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var t = s(v).replace(/[€\s]/g, '');
    if (!t) return 0;
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, '');
    var x = parseFloat(t);
    return isFinite(x) ? x : 0;
  }
  function norm(v) { return s(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function d2(x) { return (x < 10 ? '0' : '') + x; }
  function dateStr(d) { return d.getFullYear() + '-' + d2(d.getMonth() + 1) + '-' + d2(d.getDate()); }
  function parse(ds) { var m = s(ds).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function days(a, b) { var x = parse(a), y = parse(b); return x && y ? Math.round((y - x) / 86400000) : null; }
  function addDays(ds, k) { var d = parse(ds); if (!d) return ''; d.setDate(d.getDate() + n(k)); return dateStr(d); }
  function today() { return dateStr(new Date()); }
  // Día LOCAL de una marca de tiempo ISO (las 00:30 en España siguen siendo "hoy", no ayer en UTC)
  function day(v) { var t = s(v); if (/^\d{4}-\d{2}-\d{2}T/.test(t)) { var d = new Date(t); return isNaN(d.getTime()) ? t.substring(0, 10) : dateStr(d); } return t.substring(0, 10); }
  function weekStart(ds) { var d = parse(ds); var wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dateStr(d); }

  function stateMap(cfgPedidos) {
    var m = {};
    (cfgPedidos.estados || []).forEach(function (x) { m[x.k] = x; });
    return m;
  }
  function stateOf(cfgPedidos, k) { return stateMap(cfgPedidos)[k] || { k: k, open: true, c: '#64748b' }; }
  // v11: fase fija de cada estado (la lógica usa la fase, nunca el nombre). Reconoce también los nombres antiguos.
  var OLD_PHASE = { 'nuevo': 'confirmado', 'pendiente de revision': 'confirmado', 'pendiente de fabricacion': 'confirmado', 'incidencia': 'confirmado', 'reservado': 'reserva', 'apartado': 'reserva',
    'en fabricacion': 'impresion', 'fabricado': 'postpro', 'empaquetado': 'listo', 'listo para enviar': 'listo', 'en transito': 'enviado', 'en reparto': 'enviado' };
  var PHASES = ['reserva', 'confirmado', 'impresion', 'postpro', 'listo', 'enviado', 'entregado', 'cancelado'];
  function phaseOf(cfgPedidos, k) {
    var st = stateOf(cfgPedidos || {}, k);
    if (st.f) return st.f;
    if (st.cancelled) return 'cancelado';
    if (st.done) return 'entregado';
    if (st.shipped) return 'enviado';
    return OLD_PHASE[norm(k)] || 'confirmado';
  }
  function stateOfPhase(cfgPedidos, f) { var l = (cfgPedidos || {}).estados || []; for (var i = 0; i < l.length; i++) if (l[i].f === f) return l[i].k; return ''; }

  // ---------- Pedidos: plazos ----------
  function orderTiming(o, cfgPedidos, hoy) {
    hoy = hoy || today();
    var st = stateOf(cfgPedidos, o.estado || 'Nuevo');
    var inicio = o.fecha || day(o.creado);
    var plazo = o.plazoDias === '' || o.plazoDias === null || o.plazoDias === undefined ? null : n(o.plazoDias);
    var limite = o.fechaLimite || (inicio && plazo !== null ? addDays(inicio, plazo) : '');
    var r = { inicio: inicio, limite: limite, transcurridos: inicio ? days(inicio, hoy) : null, restantes: null, retraso: 0,
      nivel: 'none', texto: 'Sin fecha límite', abierto: !!st.open && !st.cancelled, enviado: !!st.shipped, cancelado: !!st.cancelled, incidencia: !!st.issue || !!s(o.incidencia) && !!st.open };
    if (st.cancelled) { r.nivel = 'done'; r.texto = 'Cancelado'; return r; }
    if (st.shipped || st.done) {
      r.nivel = 'done'; r.texto = st.done ? 'Entregado' : 'Enviado';
      if (limite && o.fechaEnvio) { var diff = days(limite, o.fechaEnvio); if (diff > 0) r.texto += ' con ' + diff + (diff === 1 ? ' día' : ' días') + ' de retraso'; }
      return r;
    }
    if (!limite) return r;
    var rest = days(hoy, limite);
    r.restantes = rest;
    var aviso = n(cfgPedidos.avisoDias) || 2;
    if (rest < 0) { r.retraso = -rest; r.nivel = 'late'; r.texto = 'Vencido hace ' + (-rest) + (rest === -1 ? ' día' : ' días'); }
    else if (rest === 0) { r.nivel = 'today'; r.texto = 'Vence hoy'; }
    else if (rest === 1) { r.nivel = 'soon'; r.texto = 'Queda 1 día'; }
    else if (rest <= aviso) { r.nivel = 'soon'; r.texto = 'Quedan ' + rest + ' días'; }
    else { r.nivel = 'ok'; r.texto = 'Quedan ' + rest + ' días'; }
    return r;
  }
  function orderTotal(o) { return o.total !== '' && o.total !== null && o.total !== undefined && n(o.total) > 0 ? n(o.total) : n(o.cantidad || 1) * n(o.precio); }
  function isUrgent(o, t) { return t.abierto && (o.prioridad === 'Urgente' || t.nivel === 'late' || t.nivel === 'today'); }

  // ---------- Clientes: estadísticas y etiquetas ----------
  function clientKey(c) { return c.id || ('n:' + norm(c.nombre)); }
  function ordersByClient(clientes, pedidos) {
    var byId = {}, byName = {};
    clientes.forEach(function (c) { byId[c.id] = []; byName[norm(c.nombre)] = c.id; });
    pedidos.forEach(function (o) {
      var id = o.clienteId && byId[o.clienteId] ? o.clienteId : byName[norm(o.cliente)];
      if (id && byId[id]) byId[id].push(o);
    });
    return byId;
  }
  function clientStats(c, orders, cfg, hoy) {
    hoy = hoy || today();
    var cp = cfg.pedidos, cc = cfg.clientes;
    var valid = orders.filter(function (o) { return !stateOf(cp, o.estado).cancelled; });
    var gasto = valid.reduce(function (a, o) { return a + orderTotal(o); }, 0);
    var fechas = valid.map(function (o) { return o.fecha; }).filter(Boolean).sort();
    var ult = fechas[fechas.length - 1] || '';
    var activos = valid.filter(function (o) { return stateOf(cp, o.estado).open; });
    var incid = orders.filter(function (o) { return stateOf(cp, o.estado).issue || s(o.incidencia); });
    var st = { pedidos: valid.length, gasto: Math.round(gasto * 100) / 100, ultimo: ult, diasDesdeUltimo: ult ? days(ult, hoy) : null,
      primero: fechas[0] || '', activos: activos.length, pedidoActivo: activos.length ? activos.sort(function (a, b) { return s(b.fecha) < s(a.fecha) ? -1 : 1; })[0] : null,
      incidencias: incid.length, incidenciasAbiertas: incid.filter(function (o) { return stateOf(cp, o.estado).open; }).length, etiquetas: [] };
    var fr = cc.frecuente || {};
    var within = valid;
    if (n(fr.ventanaDias) > 0) within = valid.filter(function (o) { return o.fecha && days(o.fecha, hoy) <= n(fr.ventanaDias); });
    var wGasto = within.reduce(function (a, o) { return a + orderTotal(o); }, 0);
    var conds = [];
    if (n(fr.minPedidos) > 0) conds.push(within.length >= n(fr.minPedidos));
    if (n(fr.minGasto) > 0) conds.push(wGasto >= n(fr.minGasto));
    st.frecuente = conds.length ? (fr.modo === 'y' ? conds.every(Boolean) : conds.some(Boolean)) : false;
    if (st.frecuente) st.etiquetas.push({ k: 'frecuente', t: 'Cliente frecuente', i: '⭐' });
    // v11 · CRM: VIP / Recurrente / Mayorista (automáticas o puestas a mano en "Etiquetas")
    var manual = ',' + norm(c && c.etiquetas).replace(/\s*,\s*/g, ',') + ',';
    var has = function (t) { return manual.indexOf(',' + t + ',') >= 0; };
    var maxQ = valid.reduce(function (a, o) { return Math.max(a, n(o.cantidad) || 1); }, 0);
    if (valid.length >= 2 || has('recurrente')) st.etiquetas.push({ k: 'recurrente', t: 'Recurrente', i: '🔁' });
    if ((cc.altoValor && n(cc.altoValor.minGasto) > 0 && gasto >= n(cc.altoValor.minGasto)) || has('vip')) st.etiquetas.push({ k: 'altovalor', t: 'VIP', i: '👑' });
    if (has('mayorista') || maxQ >= (n(cc.mayoristaUds) || 10)) st.etiquetas.push({ k: 'mayorista', t: 'Mayorista', i: '🏭' });
    if (st.frecuente && !activos.length) st.etiquetas.push({ k: 'descuento', t: 'Posible descuento', i: '🎁' });
    if (valid.length && st.diasDesdeUltimo !== null && st.diasDesdeUltimo >= n(cc.inactivoDias || 120)) st.etiquetas.push({ k: 'inactivo', t: 'Hace ' + st.diasDesdeUltimo + ' días que no compra', i: '💤' });
    if (st.incidencias >= n(cc.incidenciasAviso || 2)) st.etiquetas.push({ k: 'incidencias', t: st.incidencias + ' incidencias', i: '⚠️' });
    else if (st.incidenciasAbiertas) st.etiquetas.push({ k: 'incidencia', t: 'Incidencia abierta', i: '⚠️' });
    st.atencion = st.incidenciasAbiertas > 0 || (st.frecuente && !activos.length) || st.etiquetas.some(function (e) { return e.k === 'inactivo'; }) && st.frecuente;
    return st;
  }
  function allClientStats(clientes, pedidos, cfg, hoy) {
    var by = ordersByClient(clientes, pedidos), out = {};
    clientes.forEach(function (c) { out[c.id] = clientStats(c, by[c.id] || [], cfg, hoy); });
    return out;
  }

  // ---------- Panel: qué necesita atención hoy ----------
  function dashboard(data, cfg, me, hoy) {
    hoy = hoy || today();
    var cp = cfg.pedidos;
    var pedidos = data.pedidos || [], tareas = data.tareas || [], redes = data.redes || [];
    var r = { pedidos: { total: pedidos.length, abiertos: 0, urgentes: [], vencidos: [], proximos: [], incidencias: [], reservados: 0, fabricar: 0, fabricando: 0, empaquetar: 0, enviar: 0, enviados: 0, porEstado: {} },
      tareas: { pendientes: 0, mias: 0, vencidas: 0, hoy: 0, enProgreso: 0, bloqueadas: 0, completadasHoy: 0 },
      redes: { hoy: [], semana: 0, publicadasSemana: 0, sinPreparar: 0 },
      ventas: { hoy: 0, semana: 0, mes: 0, pedidosSemana: 0, pedidosMes: 0, mesAnterior: 0 },
      clientes: { seguimiento: [], frecuentes: 0, total: (data.clientes || []).length } };
    var ws = weekStart(hoy), ms = hoy.substring(0, 8) + '01';
    var pm = parse(ms); pm.setMonth(pm.getMonth() - 1); var pms = dateStr(pm);
    pedidos.forEach(function (o) {
      var st = stateOf(cp, o.estado), t = orderTiming(o, cp, hoy);
      r.pedidos.porEstado[o.estado] = (r.pedidos.porEstado[o.estado] || 0) + 1;
      if (t.abierto) r.pedidos.abiertos++;
      if (t.abierto && t.nivel === 'late') r.pedidos.vencidos.push(o.id);
      if (t.abierto && (t.nivel === 'soon' || t.nivel === 'today')) r.pedidos.proximos.push(o.id);
      if (isUrgent(o, t)) r.pedidos.urgentes.push(o.id);
      if (st.issue || (s(o.incidencia) && t.abierto)) r.pedidos.incidencias.push(o.id);
      var ph = phaseOf(cp, o.estado);
      if (ph === 'reserva') r.pedidos.reservados++;
      if (ph === 'confirmado') r.pedidos.fabricar++;
      if (ph === 'impresion') r.pedidos.fabricando++;
      if (ph === 'postpro') r.pedidos.empaquetar++;
      if (ph === 'listo') r.pedidos.enviar++;
      if (st.shipped) r.pedidos.enviados++;
      if (!st.cancelled && o.fecha) {
        var tot = orderTotal(o);
        if (o.fecha === hoy) r.ventas.hoy += tot;
        if (o.fecha >= ws) { r.ventas.semana += tot; r.ventas.pedidosSemana++; }
        if (o.fecha >= ms) { r.ventas.mes += tot; r.ventas.pedidosMes++; }
        if (o.fecha >= pms && o.fecha < ms) r.ventas.mesAnterior += tot;
      }
    });
    tareas.forEach(function (t) {
      var open = t.estado === 'Pendiente' || t.estado === 'En progreso' || t.estado === 'Bloqueada';
      if (t.estado === 'Completada' && day(t.completado) === hoy) r.tareas.completadasHoy++;
      if (!open) return;
      r.tareas.pendientes++;
      if (t.estado === 'En progreso') r.tareas.enProgreso++;
      if (t.estado === 'Bloqueada') r.tareas.bloqueadas++;
      if (me && (t.responsable === me || !t.responsable)) r.tareas.mias++;
      if (t.fechaLimite && t.fechaLimite < hoy) r.tareas.vencidas++;
      if (t.fechaLimite === hoy) r.tareas.hoy++;
    });
    var we = addDays(ws, 6);
    redes.forEach(function (x) {
      if (x.estado === 'Cancelado') return;
      if (x.fecha === hoy && x.estado !== 'Publicado') r.redes.hoy.push(x.id);
      if (x.fecha >= ws && x.fecha <= we) { r.redes.semana++; if (x.estado === 'Publicado') r.redes.publicadasSemana++; }
      if (x.fecha && x.fecha >= hoy && x.fecha <= addDays(hoy, 3) && (x.estado === 'Idea' || x.estado === 'Pendiente')) r.redes.sinPreparar++;
    });
    if (data.clientes) {
      var cs = allClientStats(data.clientes, pedidos, cfg, hoy);
      data.clientes.forEach(function (c) {
        var st = cs[c.id];
        if (st.frecuente) r.clientes.frecuentes++;
        if (st.atencion) r.clientes.seguimiento.push(c.id);
      });
      r.clientes.stats = cs;
    }
    ['hoy', 'semana', 'mes', 'mesAnterior'].forEach(function (k) { r.ventas[k] = Math.round(r.ventas[k] * 100) / 100; });
    return r;
  }

  // ---------- Precios (mismas fórmulas que la hoja Productos del Excel) ----------
  function round10up(x) { return Math.ceil(Math.round(x * 1000) / 100) / 10; }
  function prices(c, pp, gastos) {
    gastos = gastos || {};
    var gb = n(c.gramosBobina) || n(pp.gramosBobina) || 1000;
    var fil = n(c.precioBobina) ? n(c.precioBobina) / gb * n(c.gramos) : n(pp.costeKg) / 1000 * n(c.gramos);
    var luz = n(c.horas) * n(pp.luzHora), mo = n(c.horasMO) * n(pp.manoObraHora);
    var pint = (c.pintado === true || /^s/i.test(s(c.pintado))) ? n(c.costePintado) : 0;
    var ext = (gastos[norm(c.gasto1)] || 0) + (gastos[norm(c.gasto2)] || 0);
    var emb = n(c.embalaje !== undefined && c.embalaje !== '' ? c.embalaje : pp.embalaje), env = n(c.envio !== undefined && c.envio !== '' ? c.envio : pp.envio);
    var R = fil + luz + mo + pint + ext, T = R * (1 + n(pp.iva)) + emb + env;
    var etsyPct = n(pp.etsyVenta) + n(pp.etsyPago) + n(pp.etsyReg), etsyFix = n(pp.etsyFijo) + n(pp.etsyAnuncioUSD) * n(pp.usdEur);
    function plat(m) { return { general: T / (1 - m), wallapop: T / (1 - m), vinted: T / (1 - m - n(pp.vinted)), etsy: (T + etsyFix) / (1 - m - etsyPct) }; }
    var o = plat(n(pp.margen)), mi = plat(n(pp.margenMin));
    var out = { desglose: { filamento: fil, luz: luz, manoObra: mo, pintado: pint, gastosExtra: ext, produccion: R, iva: R * n(pp.iva), embalaje: emb, envio: env, costeTotal: T },
      recomendado: {}, minimo: {}, segundaMano: round10up(T / (1 - n(pp.margen)) * (1 - n(pp.segundaMano))) };
    Object.keys(o).forEach(function (k) { out.recomendado[k] = round10up(o[k]); out.minimo[k] = round10up(mi[k]); });
    out.beneficio = { wallapop: out.recomendado.wallapop - T, vinted: out.recomendado.vinted * (1 - n(pp.vinted)) - T, etsy: out.recomendado.etsy * (1 - etsyPct) - etsyFix - T };
    Object.keys(out.desglose).forEach(function (k) { out.desglose[k] = Math.round(out.desglose[k] * 100) / 100; });
    Object.keys(out.beneficio).forEach(function (k) { out.beneficio[k] = Math.round(out.beneficio[k] * 100) / 100; });
    return out;
  }

  // ---------- Búsqueda ----------
  function matches(hay, q) {
    var h = norm(hay), words = norm(q).split(' ').filter(Boolean);
    for (var i = 0; i < words.length; i++) if (h.indexOf(words[i]) < 0) return false;
    return true;
  }


  // ================= v9.5: ventas, asistente de pedidos, inteligencia, alertas y juego =================
  function e2(x) { return n(x).toFixed(2).replace('.', ','); }
  function r2(x) { return Math.round((x + 1e-9) * 100) / 100; }
  // Margen sobre el precio de venta (lo que de verdad te queda) vs recargo sobre el coste
  var sale = {
    priceFromMargin: function (cost, m) { m = n(m) > 1 ? n(m) / 100 : n(m); return m >= 1 ? null : r2(n(cost) / (1 - m)); },
    priceFromMarkup: function (cost, k) { k = n(k) > 5 ? n(k) / 100 : n(k); return r2(n(cost) * (1 + k)); },
    marginOf: function (price, cost) { return n(price) > 0 ? (n(price) - n(cost)) / n(price) : 0; },
    markupOf: function (price, cost) { return n(cost) > 0 ? (n(price) - n(cost)) / n(cost) : 0; },
    // Descuento máximo sobre "price" para no bajar del margen mínimo (exacto, sobre el precio ya rebajado)
    maxDiscount: function (price, cost, minMargin) { var p = n(price); if (p <= 0) return 0; var floor = n(cost) / (1 - n(minMargin)); return Math.max(0, (p - floor) / p); },
    discount: function (price, pct) { pct = n(pct) > 1 ? n(pct) / 100 : n(pct); return r2(n(price) * (1 - pct)); },
    breakEven: function (fixed, price, unitCost) { var c = n(price) - n(unitCost); return c > 0 ? Math.ceil(n(fixed) / c) : null; }
  };

  // Coste unitario conocido de cada producto (calculadora del Excel), por ID y por nombre
  function costIndex(data, pp) {
    var byId = {}, byName = {};
    (data.calculadora || []).forEach(function (c) {
      var ct = n(c.costeTotal);
      // si la hoja aún no ha calculado la fórmula, se calcula igual que el Excel
      if (!(ct > 0) && pp && (n(c.gramos) > 0 || n(c.horas) > 0 || n(c.horasMO) > 0)) { try { ct = prices(c, pp).desglose.costeTotal; } catch (e) { ct = 0; } }
      if (!(ct > 0)) return;
      var rec = { coste: ct, recomendado: n(c.precioVenta), minimo: n(c.precioMinimo), nombre: c.nombre, envio: n((pp || {}).envio) };
      if (c.id) byId[s(c.id)] = rec;
      if (c.nombre) byName[norm(c.nombre)] = rec;
    });
    var prodById = {};
    (data.productos || []).forEach(function (p) { prodById[p.id] = p; });
    // v11.3: productos con receta de materiales y SIN coste en la calculadora del Excel → coste de la receta
    if ((data.recetas || []).length) (data.productos || []).forEach(function (p) {
      if (byId[s(p.id)] || byName[norm(p.nombre)]) return;
      var c = productCost(p.id, data, pp);
      if (c.tieneReceta && c.total !== null) byId[s(p.id)] = { coste: c.total, recomendado: 0, minimo: 0, nombre: p.nombre, envio: 0, receta: true, estado: c.estado };
    });
    return function (o) {
      var p = o.productoId ? prodById[o.productoId] : null;
      return (p && (byId[s(p.id)] || byName[norm(p.nombre)])) || byId[s(o.productoId)] || byName[norm(o.producto)] || null;
    };
  }

  // Asistente de precios al crear un pedido: SOLO datos reales; si falta el coste lo dice.
  function orderAssist(o, data, cfg, hoy) {
    hoy = hoy || today();
    var pp = cfg.precios || {}, cp = cfg.pedidos || {};
    var minM = n((cfg.alertas || {}).margenMinimo) || n(pp.margenMin) || 0.15;
    var qty = Math.max(1, n(o.cantidad) || 1);
    var costOf = costIndex(data, pp);
    var ci = costOf(o);
    var prod = null;
    (data.productos || []).forEach(function (p) { if ((o.productoId && p.id === o.productoId) || (!o.productoId && norm(p.nombre) === norm(o.producto))) prod = prod || p; });
    var same = (data.pedidos || []).filter(function (x) { return x.id !== o.id && !stateOf(cp, x.estado).cancelled && n(x.precio) > 0 && ((o.productoId && x.productoId === o.productoId) || norm(x.producto) === norm(o.producto)); })
      .sort(function (a, b) { return s(a.fecha) < s(b.fecha) ? -1 : 1; });
    var sameClient = same.filter(function (x) { return norm(x.cliente) === norm(o.cliente); });
    var last = sameClient[sameClient.length - 1] || null, lastAny = same[same.length - 1] || null;
    var out = { coste: ci ? r2(ci.coste) : null, catalogo: prod && n(prod.precio) > 0 ? n(prod.precio) : null, recomendado: ci && ci.recomendado ? ci.recomendado : null,
      minimo: ci && ci.minimo ? ci.minimo : (ci ? r2(ci.coste / (1 - minM)) : null), anteriorCliente: last ? n(last.precio) : null, anterior: lastAny ? n(lastAny.precio) : null,
      ventasPrevias: same.length, cantidad: qty, notas: [], avisos: [], fuente: '' };
    // Precio sugerido: el del catálogo o el recomendado por costes; al cliente habitual, su último precio
    var sug = null;
    if (out.anteriorCliente && (!out.minimo || out.anteriorCliente >= out.minimo)) { sug = out.anteriorCliente; out.fuente = 'Último precio que pagó este cliente'; }
    else if (out.catalogo) { sug = out.catalogo; out.fuente = 'Precio del catálogo'; }
    else if (out.recomendado) { sug = out.recomendado; out.fuente = 'Precio recomendado por costes (Excel)'; }
    else if (out.anterior) { sug = out.anterior; out.fuente = 'Último precio de venta de este producto'; }
    else if (ci) { sug = round10up(ci.coste / (1 - (n(pp.margen) || 0.3))); out.fuente = 'Coste + margen objetivo'; }
    out.sugerido = sug;
    // Descuento recomendado: cliente frecuente o varias unidades, sin romper el margen mínimo
    var stats = null;
    if (o.cliente && data.clientes) {
      var cl = data.clientes.filter(function (c) { return norm(c.nombre) === norm(o.cliente); })[0];
      if (cl) stats = clientStats(cl, (ordersByClient([cl], data.pedidos || []))[cl.id] || [], cfg, hoy);
    }
    var want = 0;
    if (qty >= 5) { want = 0.10; out.notas.push('Pedido de ' + qty + ' unidades: se puede ofrecer descuento por volumen.'); }
    else if (qty >= 3) { want = 0.05; out.notas.push(qty + ' unidades: pequeño descuento por volumen.'); }
    if (stats && stats.frecuente) { want = Math.max(want, 0.05); out.notas.push('Cliente frecuente (' + stats.pedidos + ' pedidos): un detalle ayuda a fidelizar.'); }
    var maxD = sug && ci ? sale.maxDiscount(sug, ci.coste, minM) : null;
    out.descuentoMax = maxD === null ? null : Math.floor(maxD * 100) / 100;
    out.descuentoRecomendado = maxD === null ? (want ? want : 0) : Math.min(want, Math.floor(maxD * 100) / 100);
    if (want && maxD !== null && maxD < want) out.notas.push('No se recomienda más de un ' + Math.round(maxD * 100) + ' % para no bajar del margen mínimo (' + Math.round(minM * 100) + ' %).');
    var price = n(o.precio) > 0 ? n(o.precio) : sug;
    out.precio = price;
    // v11: rango sugerido (nunca se impone: el usuario decide)
    var base = out.recomendado || sug;
    if (base) {
      var rnd = function (x, mode) { var st = x < 10 ? 0.5 : 1, f = mode === 'up' ? Math.ceil : Math.round; return f(x / st - (mode === 'up' ? 1e-9 : 0)) * st; };
      var lo = Math.max(rnd(base * 0.95), out.minimo ? rnd(n(out.minimo), 'up') : 0), hi = rnd(Math.max(base * 1.08, n(out.anterior) > base ? n(out.anterior) : 0));
      if (hi <= lo) hi = lo + (lo < 10 ? 0.5 : 1);
      out.rango = [lo, hi];
      if (price) {
        if (out.minimo && price < out.minimo) out.sugerencia = { nivel: 'bad', texto: 'Por debajo del mínimo: no bajes de ' + e2(out.minimo) + ' €. Podrías intentar entre ' + e2(lo) + ' € y ' + e2(hi) + ' €.' };
        else if (price < lo) out.sugerencia = { nivel: 'warn', texto: 'Podrías intentar venderlo entre ' + e2(lo) + ' € y ' + e2(hi) + ' €.' };
        else if (price <= hi) out.sugerencia = { nivel: 'ok', texto: 'Precio dentro del rango recomendado (' + e2(lo) + ' – ' + e2(hi) + ' €).' };
        else out.sugerencia = { nivel: 'info', texto: 'Por encima del rango habitual (' + e2(lo) + ' – ' + e2(hi) + ' €): perfecto si el cliente lo acepta.' };
      }
    }
    if (price && ci) {
      out.beneficioUnidad = r2(price - ci.coste);
      out.beneficio = r2((price - ci.coste) * qty);
      out.margen = sale.marginOf(price, ci.coste);
      if (price < ci.coste) out.avisos.push('⚠️ El precio (' + e2(price) + ' €) está POR DEBAJO del coste (' + e2(ci.coste) + ' €): pierdes dinero.');
      else if (out.margen < minM) out.avisos.push('Margen bajo: ' + Math.round(out.margen * 100) + ' % (mínimo configurado ' + Math.round(minM * 100) + ' %).');
    }
    if (!ci) out.avisos.push('No hay coste guardado para este producto: no puedo calcular beneficio ni margen. Añádelo en Productos → Costes.');
    out.total = price ? r2(price * qty) : null;
    return out;
  }

  // v10.8 · Beneficio REAL de un pedido: coste de fabricación + envío pagado + comisión + otros gastos.
  // Si falta el envío o la comisión se ESTIMAN (y se marca como estimado); si falta el coste del producto, se dice.
  function estComision(canal, total, pp) {
    var c = norm(canal); pp = pp || {};
    if (c.indexOf('vinted') >= 0) return total * n(pp.vinted);
    if (c.indexOf('etsy') >= 0) return total * (n(pp.etsyVenta) + n(pp.etsyPago) + n(pp.etsyReg)) + n(pp.etsyFijo) + n(pp.etsyAnuncioUSD) * n(pp.usdEur);
    return 0;
  }
  function has(v) { return v !== '' && v !== null && v !== undefined; }
  function orderProfit(o, data, cfg, costOf) {
    var pp = (cfg && cfg.precios) || {};
    costOf = costOf || costIndex(data || {}, pp);
    var total = orderTotal(o), qty = n(o.cantidad) || 1, ci = costOf(o);
    var unit = ci ? Math.max(0, ci.coste - n(ci.envio)) : null;
    // v11.3: el coste CONGELADO del pedido (precios de su fecha) manda sobre el coste de hoy
    var snap = o.costeSnap && typeof o.costeSnap === 'object' ? o.costeSnap : null;
    if (snap && snap.unidad !== null && snap.unidad !== undefined && snap.unidad !== '') unit = n(snap.unidad);
    var envReal = has(o.costeEnvio), comReal = has(o.comision);
    var env = envReal ? n(o.costeEnvio) : n(pp.envio);
    var com = comReal ? n(o.comision) : estComision(o.canal, total, pp);
    var list = Array.isArray(o.gastosPedido) ? o.gastosPedido : [];
    var otros = list.reduce(function (a, g) { return a + n(g && g.coste); }, 0);
    var prod = unit === null ? null : r2(unit * qty);
    var coste = prod === null ? null : r2(prod + env + com + otros);
    var ben = coste === null ? null : r2(total - coste);
    return { costeCongelado: snap ? snap.fecha : '', total: r2(total), unidad: unit === null ? null : r2(unit), produccion: prod, envio: r2(env), envioEstimado: !envReal, comision: r2(com), comisionEstimada: !comReal,
      otros: r2(otros), gastos: list, coste: coste, beneficio: ben, margen: ben !== null && total > 0 ? ben / total : null, conCoste: unit !== null };
  }
  // v11 · Centro financiero: de lo cobrado al beneficio neto (estimación orientativa, no sustituye al gestor)
  // Precios con IVA incluido. IVA a pagar ≈ IVA de las ventas − IVA de lo que compras (costes con IVA y comisiones).
  function finance(data, cfg, desde, hasta) {
    var ps = profitSummary(data, cfg, desde, hasta);
    var fz = (cfg && cfg.finanzas) || {}, iva = n(((cfg || {}).facturacion || {}).tipoIva) || 0.21, irpfP = fz.irpf === undefined ? 0.2 : n(fz.irpf);
    var costOf = costIndex(data, (cfg && cfg.precios) || {}), cp = (cfg && cfg.pedidos) || {}, fab = 0;
    (data.pedidos || []).forEach(function (o) {
      if (!o.fecha || (desde && o.fecha < desde) || (hasta && o.fecha > hasta) || stateOf(cp, o.estado).cancelled) return;
      var p = orderProfit(o, data, cfg, costOf); if (p.produccion !== null) fab += p.produccion;
    });
    fab = r2(fab);
    var bruto = ps.beneficio, ventas = ps.ventasConCoste;
    var ivaRep = fz.repercuteIva === false ? 0 : r2(ventas * iva / (1 + iva));
    var ivaSop = fz.repercuteIva === false ? 0 : r2((fab + ps.comisiones + ps.otros) * iva / (1 + iva));
    var ivaPagar = Math.max(0, r2(ivaRep - ivaSop));
    var baseIrpf = Math.max(0, r2(bruto - ivaPagar)), irpf = r2(baseIrpf * irpfP);
    return { ventas: ps.ventas, ventasConCoste: ventas, fabricacion: fab, envios: ps.envios, comisiones: ps.comisiones, otros: ps.otros, costes: r2(fab + ps.envios + ps.comisiones + ps.otros),
      beneficioBruto: bruto, ivaRepercutido: ivaRep, ivaSoportado: ivaSop, ivaPagar: ivaPagar, irpf: irpf, irpfPct: irpfP, beneficioNeto: r2(bruto - ivaPagar - irpf),
      margen: ps.margen, margenNeto: ventas > 0 ? r2(bruto - ivaPagar - irpf) / ventas : null, pedidos: ps.pedidos, sinCoste: ps.sinCoste, estimados: ps.estimados, meses: ps.meses, bajos: ps.bajos };
  }
  // Resumen de beneficio real de un conjunto de pedidos (por meses)
  function profitSummary(data, cfg, desde, hasta) {
    var cp = (cfg && cfg.pedidos) || {}, costOf = costIndex(data, (cfg && cfg.precios) || {});
    var out = { pedidos: 0, ventas: 0, ventasConCoste: 0, coste: 0, beneficio: 0, envios: 0, comisiones: 0, otros: 0, sinCoste: 0, estimados: 0, meses: {}, bajos: [] };
    var minM = n(((cfg || {}).alertas || {}).margenMinimo) || n(((cfg || {}).precios || {}).margenMin) || 0.15;
    (data.pedidos || []).forEach(function (o) {
      if (!o.fecha || (desde && o.fecha < desde) || (hasta && o.fecha > hasta) || stateOf(cp, o.estado).cancelled) return;
      var p = orderProfit(o, data, cfg, costOf), m = s(o.fecha).substring(0, 7);
      var mm = out.meses[m] || (out.meses[m] = { mes: m, pedidos: 0, ventas: 0, beneficio: 0, sinCoste: 0 });
      out.pedidos++; mm.pedidos++; out.ventas += p.total; mm.ventas += p.total;
      out.envios += p.envio; out.comisiones += p.comision; out.otros += p.otros;
      if (p.envioEstimado || p.comisionEstimada) out.estimados++;
      if (!p.conCoste) { out.sinCoste++; mm.sinCoste++; return; }
      out.coste += p.coste; out.beneficio += p.beneficio; out.ventasConCoste += p.total; mm.beneficio += p.beneficio;
      if (p.margen !== null && p.margen < minM) out.bajos.push({ id: o.id, numero: o.numero, producto: o.producto, cliente: o.cliente, beneficio: p.beneficio, margen: p.margen });
    });
    ['ventas', 'ventasConCoste', 'coste', 'beneficio', 'envios', 'comisiones', 'otros'].forEach(function (k) { out[k] = r2(out[k]); });
    out.meses = Object.keys(out.meses).sort().map(function (k) { var x = out.meses[k]; x.ventas = r2(x.ventas); x.beneficio = r2(x.beneficio); return x; });
    out.bajos.sort(function (a, b) { return a.margen - b.margen; });
    out.margen = out.ventasConCoste > 0 ? out.beneficio / out.ventasConCoste : null;
    return out;
  }
  // v10.8 · Facturas: importes con IVA incluido → base, cuota y base por línea (cuadra al céntimo)
  function invoiceAmounts(lineas, tipoIva) {
    var iva = n(tipoIva);
    var ls = (lineas || []).map(function (l) { var imp = r2(n(l.cantidad) * n(l.precio)); return { descripcion: s(l.descripcion), cantidad: n(l.cantidad), precio: r2(n(l.precio)), importe: imp, precioBase: r2(n(l.precio) / (1 + iva)), base: r2(imp / (1 + iva)) }; });
    var total = r2(ls.reduce(function (a, l) { return a + l.importe; }, 0));
    var base = r2(total / (1 + iva)), cuota = r2(total - base);
    var sumB = r2(ls.reduce(function (a, l) { return a + l.base; }, 0));
    if (ls.length && sumB !== base) ls[ls.length - 1].base = r2(ls[ls.length - 1].base + (base - sumB));
    return { lineas: ls, total: total, base: base, cuota: cuota, tipoIva: iva };
  }

  // Periodos: [desde, hasta] y el periodo anterior equivalente
  function periodRange(per, hoy) {
    hoy = hoy || today();
    var from, to = hoy, pf, pt;
    if (per === 'hoy') { from = hoy; pf = pt = addDays(hoy, -1); }
    else if (per === 'semana') { from = weekStart(hoy); pf = addDays(from, -7); pt = addDays(pf, days(from, hoy)); }
    else if (per === 'año') { from = hoy.substring(0, 5) + '01-01'; pf = (n(hoy.substring(0, 4)) - 1) + '-01-01'; pt = (n(hoy.substring(0, 4)) - 1) + hoy.substring(4); }
    else if (per === '30d') { from = addDays(hoy, -29); pf = addDays(hoy, -59); pt = addDays(hoy, -30); }
    else { from = hoy.substring(0, 8) + '01'; var d = parse(from); d.setMonth(d.getMonth() - 1); pf = dateStr(d); pt = addDays(pf, days(from, hoy)); }
    return { desde: from, hasta: to, prevDesde: pf, prevHasta: pt };
  }
  // Centro de inteligencia: ventas, beneficios, márgenes, clientes, productos y tendencias
  function bi(data, cfg, hoy, per) {
    hoy = hoy || today();
    var cp = cfg.pedidos, R = periodRange(per || 'mes', hoy), costOf = costIndex(data, cfg.precios);
    function agg(a, b) {
      var r = { pedidos: 0, ventas: 0, coste: 0, conCoste: 0, ventasConCoste: 0, clientes: {} };
      (data.pedidos || []).forEach(function (o) {
        if (!o.fecha || o.fecha < a || o.fecha > b || stateOf(cp, o.estado).cancelled) return;
        var t = orderTotal(o), ci = costOf(o);
        r.pedidos++; r.ventas += t; r.clientes[norm(o.cliente)] = 1;
        if (ci) { r.conCoste++; r.coste += ci.coste * (n(o.cantidad) || 1); r.ventasConCoste += t; }
      });
      r.beneficio = r2(r.ventasConCoste - r.coste); r.ventas = r2(r.ventas);
      r.margen = r.ventasConCoste > 0 ? (r.ventasConCoste - r.coste) / r.ventasConCoste : null;
      r.clientesUnicos = Object.keys(r.clientes).length; delete r.clientes;
      r.ticketMedio = r.pedidos ? r2(r.ventas / r.pedidos) : 0;
      return r;
    }
    var cur = agg(R.desde, R.hasta), prev = agg(R.prevDesde, R.prevHasta);
    // Productos: ventas y margen
    var prods = {};
    (data.pedidos || []).forEach(function (o) {
      if (!o.fecha || o.fecha < R.desde || stateOf(cp, o.estado).cancelled) return;
      var k = s(o.producto) || '(sin producto)', ci = costOf(o), q = n(o.cantidad) || 1, t = orderTotal(o);
      var p = prods[k] || (prods[k] = { producto: k, unidades: 0, ventas: 0, beneficio: 0, conCoste: true });
      p.unidades += q; p.ventas += t;
      if (ci) p.beneficio += t - ci.coste * q; else p.conCoste = false;
    });
    var plist = Object.keys(prods).map(function (k) { var p = prods[k]; p.ventas = r2(p.ventas); p.beneficio = r2(p.beneficio); p.margen = p.conCoste && p.ventas > 0 ? p.beneficio / p.ventas : null; return p; });
    var rentables = plist.filter(function (p) { return p.conCoste; }).sort(function (a, b) { return b.beneficio - a.beneficio; }).slice(0, 5);
    var masVendidos = plist.slice().sort(function (a, b) { return b.unidades - a.unidades; }).slice(0, 5);
    // Clientes activos/inactivos (compra en los últimos N días)
    var inDays = n((cfg.alertas || {}).clienteInactivoDias) || n(cfg.clientes && cfg.clientes.inactivoDias) || 120;
    var act = 0, inact = 0, st = allClientStats(data.clientes || [], data.pedidos || [], cfg, hoy);
    Object.keys(st).forEach(function (k) { var x = st[k]; if (!x.pedidos) return; if (x.diasDesdeUltimo !== null && x.diasDesdeUltimo < inDays) act++; else inact++; });
    // Tendencia: ventas de las últimas 12 semanas
    var ws = weekStart(hoy), trend = [];
    for (var i = 11; i >= 0; i--) { var a = addDays(ws, -7 * i), b = addDays(a, 6); var x = agg(a, b); trend.push({ semana: a, ventas: x.ventas, pedidos: x.pedidos }); }
    var pend = (data.pedidos || []).filter(function (o) { return orderTiming(o, cp, hoy).abierto; }).length;
    var out = { periodo: R, actual: cur, anterior: prev, rentables: rentables, masVendidos: masVendidos, clientesActivos: act, clientesInactivos: inact, tendencia: trend, pendientes: pend, conclusiones: [] };
    // Conclusiones escritas SOLO con estos números
    function pc(a, b) { return b ? Math.round((a - b) / b * 100) : null; }
    var dv = pc(cur.ventas, prev.ventas);
    if (dv !== null && dv !== 0) out.conclusiones.push('Las ventas han ' + (dv > 0 ? 'aumentado un ' + dv : 'bajado un ' + (-dv)) + ' % respecto al periodo anterior (' + e2(cur.ventas) + ' € frente a ' + e2(prev.ventas) + ' €).');
    else if (!prev.ventas && cur.ventas) out.conclusiones.push('Ventas del periodo: ' + e2(cur.ventas) + ' € (el periodo anterior no tuvo ventas para comparar).');
    var dp = pc(cur.pedidos, prev.pedidos);
    if (dp !== null && dp !== 0) out.conclusiones.push('Pedidos: ' + cur.pedidos + ' (' + (dp > 0 ? '+' : '') + dp + ' % frente a ' + prev.pedidos + ').');
    if (cur.margen !== null) out.conclusiones.push('Margen medio de los pedidos con coste conocido: ' + Math.round(cur.margen * 100) + ' %.');
    if (cur.pedidos && cur.conCoste < cur.pedidos) out.conclusiones.push((cur.pedidos - cur.conCoste) + ' pedido(s) sin coste conocido: el beneficio real puede ser distinto.');
    var minM = n((cfg.alertas || {}).margenMinimo) || 0.15;
    masVendidos.forEach(function (p) { if (p.margen !== null && p.margen < minM && p.unidades >= 2) out.conclusiones.push('"' + p.producto + '" tiene muchas ventas (' + p.unidades + ' uds.) pero un margen bajo (' + Math.round(p.margen * 100) + ' %).'); });
    if (rentables[0]) out.conclusiones.push('El producto más rentable del periodo es "' + rentables[0].producto + '" (' + e2(rentables[0].beneficio) + ' € de beneficio).');
    if (inact) out.conclusiones.push(inact + ' cliente(s) llevan más de ' + inDays + ' días sin comprar.');
    return out;
  }

  // v10.8.1 · STOCK. Una sola cuenta, igual que la fórmula de la hoja Stock del Excel:
  //   lo anotado en Fabricación (entradas, impresiones, ajustes y recuentos, en + o en −)
  //   menos lo pedido en Pedidos (todo lo que no esté Cancelado).
  // Además se separa lo que ya salió de la estantería (pedidos enviados) de lo que está apartado:
  //   físico = fabricado − enviado · reservado = pedidos abiertos sin enviar · disponible = físico − reservado
  function stockLevels(data, cfgPedidos) {
    var by = {}, list = [];
    function get(name) {
      var k = norm(name);
      if (!k) return null;
      if (!by[k]) { by[k] = { producto: s(name).trim(), clave: k, fabricado: 0, enviado: 0, reservado: 0, pedidosAbiertos: 0, movimientos: 0, minimo: 0, ubicacion: '', notas: '', fila: false, productoId: '' }; list.push(by[k]); }
      return by[k];
    }
    (data.productos || []).forEach(function (p) { var x = get(p.nombre); if (x) { x.productoId = p.id; x.producto = s(p.nombre).trim(); } });
    (data.stock || []).forEach(function (r) { var x = get(r.producto); if (!x) return; x.fila = true; x.minimo = n(r.minimo); x.ubicacion = s(r.ubicacion); x.notas = s(r.notas); });
    (data.fabricacion || []).forEach(function (r) { var x = get(r.producto); if (!x) return; x.fabricado += n(r.unidades); x.movimientos++; });
    (data.pedidos || []).forEach(function (o) {
      var st = stateOf(cfgPedidos || {}, o.estado || 'Nuevo');
      if (st.cancelled) return;
      var x = get(o.producto); if (!x) return;
      var q = n(o.cantidad) || 1;
      if (st.shipped) x.enviado += q; else { x.reservado += q; x.pedidosAbiertos++; }
    });
    list.forEach(function (x) {
      x.fisico = x.fabricado - x.enviado;
      x.disponible = x.fisico - x.reservado;
      x.controlado = x.fila || x.movimientos > 0;
      x.estado = !x.controlado ? 'sin' : x.disponible < 0 ? 'faltan' : x.disponible === 0 ? 'agotado' : (x.minimo > 0 && x.disponible <= x.minimo) ? 'bajo' : 'ok';
      x.bajo = x.controlado && (x.disponible < 0 || (x.minimo > 0 && x.disponible <= x.minimo) || (x.disponible === 0 && x.minimo > 0));
    });
    return { by: by, list: list, of: function (name) { return by[norm(name)] || null; } };
  }

  // Alertas inteligentes (nunca cambian datos: solo avisan)
  function alerts(data, cfg, hoy, extra) {
    hoy = hoy || today(); extra = extra || {};
    var al = cfg.alertas || {}, out = [], cp = cfg.pedidos, minM = n(al.margenMinimo) || 0.15, costOf = costIndex(data, cfg.precios);
    if (al.stockBajo !== false) stockLevels(data, cp).list.forEach(function (x) {
      if (x.bajo) out.push({ nivel: x.disponible < 0 ? 'bad' : 'warn', tipo: 'stock', texto: (x.disponible < 0 ? 'Faltan ' + (-x.disponible) + ' uds. de ' + x.producto + ' para servir los pedidos' : 'Stock bajo: ' + x.producto + ' (' + x.disponible + ' disponibles, mínimo ' + x.minimo + ')'), enlace: 'stock' });
    });
    (data.productos || []).forEach(function (p) {
      var ci = costOf({ productoId: p.id, producto: p.nombre }), pr = n(p.precio);
      if (!ci || !(pr > 0)) return;
      if (pr < ci.coste) out.push({ nivel: 'bad', tipo: 'precio', texto: 'Precio por debajo del coste: ' + p.nombre + ' (' + e2(pr) + ' € < ' + e2(ci.coste) + ' €)', enlace: 'productos/' + p.id });
      else if (sale.marginOf(pr, ci.coste) < minM) out.push({ nivel: 'warn', tipo: 'margen', texto: 'Margen bajo en ' + p.nombre + ': ' + Math.round(sale.marginOf(pr, ci.coste) * 100) + ' %', enlace: 'productos/' + p.id });
    });
    var recent = (data.pedidos || []).filter(function (o) { return o.fecha && days(o.fecha, hoy) <= 30 && n(o.precio) > 0 && !stateOf(cp, o.estado).cancelled; });
    recent.forEach(function (o) { var ci = costOf(o); if (ci && n(o.precio) < ci.coste) out.push({ nivel: 'bad', tipo: 'precio', texto: 'Pedido nº ' + o.numero + ' vendido por debajo del coste (' + e2(n(o.precio)) + ' € < ' + e2(ci.coste) + ' €)', enlace: 'pedidos/' + o.id }); });
    var late = (data.pedidos || []).filter(function (o) { var t = orderTiming(o, cp, hoy); return t.abierto && t.nivel === 'late'; });
    if (late.length) out.push({ nivel: 'bad', tipo: 'pedido', texto: late.length + ' pedido(s) vencido(s) sin enviar', enlace: 'pedidos' });
    var stale = (data.pedidos || []).filter(function (o) { return phaseOf(cp, o.estado) === 'reserva' && o.fecha && days(o.fecha, hoy) >= 3; });
    if (stale.length) out.push({ nivel: 'warn', tipo: 'pedido', texto: stale.length + ' reserva(s) llevan 3 días o más sin confirmar', enlace: 'pedidos/?f=reservas' });
    var inDays = n(al.clienteInactivoDias) || 120;
    var cs = allClientStats(data.clientes || [], data.pedidos || [], cfg, hoy), inact = 0;
    Object.keys(cs).forEach(function (k) { var x = cs[k]; if (x.pedidos >= 2 && x.diasDesdeUltimo >= inDays && !x.activos) inact++; });
    if (inact) out.push({ nivel: 'info', tipo: 'cliente', texto: inact + ' cliente(s) que repetían llevan más de ' + inDays + ' días sin comprar', enlace: 'clientes' });
    var R = periodRange('30d', hoy), a = 0, b = 0;
    (data.pedidos || []).forEach(function (o) { if (!o.fecha || stateOf(cp, o.estado).cancelled) return; if (o.fecha >= R.desde) a += orderTotal(o); else if (o.fecha >= R.prevDesde && o.fecha <= R.prevHasta) b += orderTotal(o); });
    var drop = n(al.caidaVentas) || 0.25;
    if (b > 0 && a < b * (1 - drop)) out.push({ nivel: 'warn', tipo: 'ventas', texto: 'Caída de ventas: ' + Math.round((1 - a / b) * 100) + ' % menos en los últimos 30 días (' + e2(a) + ' € frente a ' + e2(b) + ' €)', enlace: 'informes' });
    (extra.biblioteca || []).forEach(function (d) {
      var dd = n(d.revisarDias); if (!dd || !d.actualizado) return;
      if (days(day(d.actualizado), hoy) > dd) out.push({ nivel: 'info', tipo: 'documento', texto: 'Documento por revisar: "' + d.titulo + '" (sin actualizar desde ' + s(d.actualizado).substring(0, 10) + ')', enlace: 'ia/biblioteca' });
      if (d.estado === 'Error' || d.estado === 'Sin texto') out.push({ nivel: 'warn', tipo: 'documento', texto: 'Documento sin indexar: "' + d.titulo + '"', enlace: 'ia/biblioteca' });
    });
    var nums = {}; (data.pedidos || []).forEach(function (o) { var k = norm(o.numero); if (!k) return; if (nums[k]) out.push({ nivel: 'warn', tipo: 'anomalia', texto: 'Número de pedido repetido: ' + o.numero, enlace: 'pedidos/' + o.id }); nums[k] = 1; });
    (data.pedidos || []).forEach(function (o) { if (n(o.cantidad) < 0 || n(o.precio) < 0) out.push({ nivel: 'warn', tipo: 'anomalia', texto: 'Pedido nº ' + o.numero + ' con cantidad o precio negativo', enlace: 'pedidos/' + o.id }); });
    return out;
  }

  // ---------- Juego: puntos (XP), niveles, rachas, insignias y ranking ----------
  function xpForLevel(L) { return 50 * L * (L - 1); }
  function levelOf(xp) { var L = 1; while (xpForLevel(L + 1) <= xp) L++; return { nivel: L, desde: xpForLevel(L), hasta: xpForLevel(L + 1), progreso: (xp - xpForLevel(L)) / (xpForLevel(L + 1) - xpForLevel(L)) }; }
  var BADGES = [
    { k: 'primer_pedido', i: '🏆', t: 'Primer pedido', d: 'Crear tu primer pedido' },
    { k: 'primera_venta', i: '💰', t: 'Primera venta', d: 'Un pedido tuyo enviado o entregado' },
    { k: 'racha7', i: '🔥', t: '7 días activos', d: '7 días seguidos con actividad' },
    { k: 'tareas25', i: '✅', t: 'Imparable', d: '25 tareas completadas' },
    { k: 'pedidos50', i: '📦', t: 'Máquina de pedidos', d: '50 pedidos creados' },
    { k: 'redes10', i: '📱', t: 'Estrella de redes', d: '10 publicaciones hechas' },
    { k: 'nivel10', i: '🚀', t: 'Nivel 10', d: 'Llegar al nivel 10' },
    { k: 'elite', i: '👑', t: 'Usuario Élite', d: 'Llegar al nivel 20' }
  ];
  function gamify(data, cfg, hoy) {
    hoy = hoy || today();
    var g = cfg.gamificacion || {}, P = g.puntos || {}, cp = cfg.pedidos, ms = hoy.substring(0, 8) + '01';
    var users = (data.usuarios || []).filter(function (u) { return u.activo !== false; });
    var byName = {}, byId = {};
    users.forEach(function (u) {
      var x = { id: u.id, nombre: u.nombre, color: u.color, xp: 0, xpMes: 0, pedidos: 0, pedidosMes: 0, ventas: 0, ventasMes: 0, tareas: 0, tareasMes: 0, redes: 0, dias: {}, envios: 0 };
      byName[norm(u.nombre)] = x; byId[u.id] = x;
    });
    function add(x, pts, fecha) { if (!x || !fecha) return; x.xp += pts; if (fecha >= ms) x.xpMes += pts; x.dias[fecha] = 1; }
    (data.pedidos || []).forEach(function (o) {
      var x = byName[norm(o.creadoPor)], f = day(o.creado) || o.fecha;
      if (!x || !f || stateOf(cp, o.estado).cancelled) return;
      var eur = orderTotal(o), pts = n(P.pedido || 10) + Math.floor(eur / 10) * n(P.porCadaDiezEuros || 1);
      x.pedidos++; x.ventas += eur; if (f >= ms) { x.pedidosMes++; x.ventasMes += eur; }
      if (stateOf(cp, o.estado).shipped) x.envios++;
      add(x, pts, f);
    });
    (data.tareas || []).forEach(function (t) {
      var x = byName[norm(t.completadoPor)], f = day(t.completado);
      if (!x || !f || t.estado !== 'Completada') return;
      x.tareas++; if (f >= ms) x.tareasMes++;
      add(x, t.prioridad === 'Urgente' ? n(P.tareaUrgente || 12) : n(P.tarea || 8), f);
    });
    (data.redes || []).forEach(function (r) {
      if (r.estado !== 'Publicado') return;
      var x = byName[norm(r.responsable)] || byName[norm(r.actualizadoPor)], f = day(r.actualizado) || r.fecha;
      if (!x) return; x.redes++; add(x, n(P.publicacion || 6), f);
    });
    (data.noticias || []).forEach(function (nw) { add(byId[nw.autorId], n(P.noticia || 4), day(nw.creado)); });
    (data.comentarios || []).forEach(function (c) { add(byId[c.autorId], n(P.comentario || 1), day(c.creado)); });
    var list = Object.keys(byId).map(function (k) {
      var x = byId[k], ds = Object.keys(x.dias).sort();
      // días activos: puntos extra y rachas de días seguidos
      ds.forEach(function (d) { x.xp += n(P.diaActivo || 5); if (d >= ms) x.xpMes += n(P.diaActivo || 5); });
      var best = 0, cur = 0, prev = null;
      ds.forEach(function (d) { cur = prev && days(prev, d) === 1 ? cur + 1 : 1; if (cur > best) best = cur; prev = d; });
      var streak = 0; if (ds.length) { var last = ds[ds.length - 1]; if (days(last, hoy) <= 1) { streak = 1; for (var i = ds.length - 2; i >= 0 && days(ds[i], ds[i + 1]) === 1; i--) streak++; } }
      x.diasActivos = ds.length; x.diasActivosMes = ds.filter(function (d) { return d >= ms; }).length; x.racha = streak; x.mejorRacha = best; delete x.dias;
      x.ventas = r2(x.ventas); x.ventasMes = r2(x.ventasMes);
      var lv = levelOf(x.xp); x.nivel = lv.nivel; x.progreso = lv.progreso; x.xpSiguiente = lv.hasta;
      var have = { primer_pedido: x.pedidos >= 1, primera_venta: x.envios >= 1, racha7: best >= 7, tareas25: x.tareas >= 25, pedidos50: x.pedidos >= 50, redes10: x.redes >= 10, nivel10: x.nivel >= 10, elite: x.nivel >= 20 };
      x.insignias = BADGES.filter(function (b) { return have[b.k]; }).map(function (b) { return b.k; });
      return x;
    });
    function rank(key) { return list.slice().sort(function (a, b) { return b[key] - a[key]; }).map(function (x) { return { id: x.id, nombre: x.nombre, valor: x[key] }; }); }
    return { usuarios: byId, lista: list, ranking: { xp: rank('xpMes'), ventas: rank('ventasMes'), pedidos: rank('pedidosMes'), tareas: rank('tareasMes'), actividad: rank('diasActivosMes') }, insignias: BADGES, levelOf: levelOf };
  }

  // ================= v11.3 · Materiales, embalaje, recetas (BOM) y coste real =================
  // Idea: cada material se apunta UNA vez (lo que pagaste y cuánto traía) y el programa calcula
  // el coste por unidad (€/g, €/m, €/m², €/ud…). Un producto es una RECETA: materiales + horas de
  // impresora + mano de obra + componentes + embalaje + otros. Nada se inventa: si falta un dato,
  // esa línea queda PENDIENTE y se dice qué falta. Los precios son los que pagas (IVA incluido).
  var UNITS = {
    g: { fam: 'masa', f: 1, t: 'g' }, kg: { fam: 'masa', f: 1000, t: 'kg' },
    mm: { fam: 'long', f: 0.001, t: 'mm' }, cm: { fam: 'long', f: 0.01, t: 'cm' }, m: { fam: 'long', f: 1, t: 'm' },
    cm2: { fam: 'area', f: 0.0001, t: 'cm²' }, m2: { fam: 'area', f: 1, t: 'm²' },
    ml: { fam: 'vol', f: 1, t: 'ml' }, l: { fam: 'vol', f: 1000, t: 'l' },
    ud: { fam: 'ud', f: 1, t: 'ud.' }, h: { fam: 'h', f: 1, t: 'h' }, eur: { fam: 'eur', f: 1, t: '€' }
  };
  var MAT_TIPOS = ['material', 'filamento', 'componente', 'caja', 'embalaje', 'otro'];
  // Estado de un dato: de más fiable a menos. «pendiente» = falta el dato (no se puede calcular).
  var CONF = ['confirmado', 'importado', 'calculado', 'estimado', 'orientativo', 'revisar', 'pendiente'];
  var CONF_TXT = { confirmado: 'CONFIRMADO', importado: 'IMPORTADO', calculado: 'CALCULADO', estimado: 'ESTIMADO', orientativo: 'ORIENTATIVO', revisar: 'REVISAR', pendiente: 'PENDIENTE' };
  function unitKey(u) {
    var k = norm(u).replace(/[\s.]/g, '').replace('²', '2').replace(/^(unidad(es)?|uds?|u|pieza(s)?|pza)$/, 'ud').replace(/^(metros?|mts?)$/, 'm').replace(/^(gramos?|gr)$/, 'g')
      .replace(/^(kilos?|kilogramos?)$/, 'kg').replace(/^(centimetros?)$/, 'cm').replace(/^(milimetros?)$/, 'mm').replace(/^(m\^?2|metros?cuadrados?)$/, 'm2').replace(/^(cm\^?2)$/, 'cm2')
      .replace(/^(mililitros?)$/, 'ml').replace(/^(litros?)$/, 'l').replace(/^(horas?)$/, 'h');
    return UNITS[k] ? k : '';
  }
  function worst(a, b) { return CONF.indexOf(a) > CONF.indexOf(b) ? a : b; }
  function confOf(v, dflt) { v = norm(v); return CONF.indexOf(v) >= 0 ? v : (dflt || 'confirmado'); }
  function filled(v) { return v !== '' && v !== null && v !== undefined && !(typeof v === 'number' && !isFinite(v)); }
  // Coste por unidad de un material (y por m² si es un rollo con ancho)
  function matCost(m) {
    var u = unitKey(m.unidad) || 'ud', precio = m.precio, cant = m.cantidad;
    var falta = [];
    if (!filled(precio) || n(precio) < 0) falta.push('precio de compra');
    if (!filled(cant) || !(n(cant) > 0)) falta.push(m.tipo === 'filamento' ? 'peso de la bobina' : 'cantidad que trae');
    // un dato escrito con el estado «pendiente» olvidado → REVISAR (nunca se da por confirmado solo)
    var cp = confOf(m.estadoPrecio), cq = confOf(m.estadoCantidad);
    var est = falta.length ? 'pendiente' : worst(cp === 'pendiente' ? 'revisar' : cp, cq === 'pendiente' ? 'revisar' : cq);
    var cu = falta.length ? null : n(precio) / n(cant);
    var out = { unidad: u, unidadTxt: UNITS[u].t, coste: cu, estado: est, falta: falta };
    if (cu !== null && u === 'm' && n(m.ancho) > 0) out.costeM2 = n(precio) / (n(cant) * n(m.ancho) / 100);
    if (cu !== null && UNITS[u].fam === 'long') { out.costeM = cu / UNITS[u].f; out.costeCm = out.costeM / 100; }
    if (cu !== null && UNITS[u].fam === 'masa') out.costeG = cu / UNITS[u].f;
    return out;
  }
  // Pasa "cantidad" en la unidad "de" a la unidad del material (si se puede). null = incompatible.
  function convert(cant, de, mat) {
    var a = UNITS[unitKey(de) || unitKey(mat.unidad) || 'ud'], b = UNITS[unitKey(mat.unidad) || 'ud'];
    if (a.fam === b.fam) return n(cant) * a.f / b.f;
    // un rollo en metros con ancho: lo gastado en m² → metros de rollo
    if (a.fam === 'area' && b.fam === 'long' && n(mat.ancho) > 0) return (n(cant) * a.f) / (n(mat.ancho) / 100) / b.f;
    return null;
  }
  function eur2(x) { return x === null || x === undefined ? '—' : (Math.round(x * 100) / 100).toFixed(2).replace('.', ',') + ' €'; }
  // Grupo de una línea para el desglose
  function grupoOf(l, mat) {
    if (l.grupo) return l.grupo;
    if (l.materialId === '@luz') return 'Impresión'; if (l.materialId === '@mo') return 'Mano de obra'; if (l.materialId === '@otro') return 'Otros';
    if (/^emb:/.test(s(l.materialId))) return 'Embalaje';
    var t = mat ? mat.tipo : '';
    return t === 'filamento' ? 'Filamento' : t === 'componente' ? 'Componentes' : (t === 'caja' || t === 'embalaje') ? 'Embalaje' : t === 'otro' ? 'Otros' : 'Materiales';
  }
  // Coste de una lista de líneas [{materialId, cantidad, unidad, grupo, notas}]
  // data: { materiales, embalajes } · pp: cfg.precios (luzHora, manoObraHora)
  function linesCost(lineas, data, pp, depth) {
    pp = pp || {}; depth = depth || 0;
    var mats = {}, embs = {};
    (data.materiales || []).forEach(function (m) { mats[m.id] = m; });
    (data.embalajes || []).forEach(function (e) { embs[e.id] = e; });
    var out = { lineas: [], grupos: {}, total: 0, estado: 'confirmado', pendientes: [], conocido: 0 };
    (lineas || []).forEach(function (l) {
      var id = s(l.materialId), q = n(l.cantidad), r = { materialId: id, cantidad: q, unidad: l.unidad || '', notas: s(l.notas), coste: null, costeUnidad: null, estado: 'confirmado', nombre: '', aviso: '' };
      if (id === '@luz' || id === '@mo') {
        var rate = id === '@luz' ? pp.luzHora : pp.manoObraHora;
        r.nombre = id === '@luz' ? 'Electricidad de la impresora' : 'Mano de obra'; r.unidad = 'h';
        if (!filled(rate)) { r.estado = 'pendiente'; r.aviso = 'Falta el precio de la hora en Configuración → Precios'; }
        else { r.costeUnidad = n(rate); r.coste = q * n(rate); r.estado = 'confirmado'; r.detalle = q + ' h × ' + eur2(n(rate)) + '/h'; }
      } else if (id === '@otro') {
        r.nombre = s(l.notas) || 'Otro coste'; r.unidad = 'eur'; r.costeUnidad = 1; r.coste = q; r.estado = confOf(l.estado, 'confirmado'); r.detalle = 'importe fijo';
      } else if (/^emb:/.test(id)) {
        var e = embs[id.substring(4)];
        if (!e) { r.nombre = 'Embalaje borrado'; r.estado = 'pendiente'; r.aviso = 'Este embalaje ya no existe'; }
        else if (depth > 2) { r.nombre = e.nombre; r.estado = 'revisar'; r.aviso = 'Embalaje dentro de embalaje (demasiados niveles)'; }
        else {
          var sub = linesCost(e.lineas || [], data, pp, depth + 1);
          r.nombre = e.nombre; r.unidad = 'ud'; r.sub = sub; r.estado = sub.estado;
          r.costeUnidad = sub.conocido; r.coste = q * sub.conocido;
          if (sub.estado === 'pendiente') r.aviso = 'Falta: ' + sub.pendientes.map(function (p) { return p.nombre + ' (' + p.falta + ')'; }).join('; ');
          r.detalle = q + ' × ' + sub.lineas.map(function (x) { return x.nombre; }).join(' + ');
        }
      } else {
        var m = mats[id];
        if (!m) { r.nombre = 'Material borrado'; r.estado = 'pendiente'; r.aviso = 'Este material ya no existe en la biblioteca'; }
        else {
          var mc = matCost(m);
          r.nombre = m.nombre; r.tipo = m.tipo; r.unidad = l.unidad || mc.unidad;
          var qm = convert(q, r.unidad, m);
          if (qm === null) { r.estado = 'revisar'; r.aviso = 'No se puede pasar ' + (UNITS[unitKey(r.unidad)] || {}).t + ' a ' + mc.unidadTxt + (UNITS[unitKey(r.unidad)] && UNITS[unitKey(r.unidad)].fam === 'area' ? ' (falta el ancho del rollo)' : ''); }
          else if (mc.coste === null) { r.estado = 'pendiente'; r.aviso = 'Falta ' + mc.falta.join(' y ') + ' de «' + m.nombre + '»'; }
          else { r.costeUnidad = mc.coste; r.coste = qm * mc.coste; r.estado = mc.estado; r.detalle = q + ' ' + (UNITS[unitKey(r.unidad)] || UNITS.ud).t + ' × ' + eur2(mc.coste) + '/' + mc.unidadTxt + (unitKey(r.unidad) !== mc.unidad ? ' (= ' + (Math.round(qm * 1000) / 1000) + ' ' + mc.unidadTxt + ')' : ''); }
        }
      }
      r.grupo = grupoOf(l, mats[id]);
      if (r.coste !== null) { r.coste = Math.round(r.coste * 10000) / 10000; out.conocido += r.coste; out.grupos[r.grupo] = (out.grupos[r.grupo] || 0) + r.coste; }
      if (r.estado === 'pendiente' || r.coste === null) out.pendientes.push({ nombre: r.nombre, falta: r.aviso || 'dato pendiente' });
      out.estado = worst(out.estado, r.coste === null ? 'pendiente' : r.estado);
      out.lineas.push(r);
    });
    out.conocido = Math.round(out.conocido * 100) / 100;
    Object.keys(out.grupos).forEach(function (k) { out.grupos[k] = Math.round(out.grupos[k] * 100) / 100; });
    out.total = out.estado === 'pendiente' ? null : out.conocido;
    if (!(lineas || []).length) { out.estado = 'pendiente'; out.total = null; out.vacio = true; }
    return out;
  }
  // Receta (BOM) de un producto: data.recetas = filas {productoId, materialId, cantidad, unidad, grupo, notas}
  function bomOf(productoId, data) { return (data.recetas || []).filter(function (r) { return r.productoId === productoId; }).sort(function (a, b) { return n(a.orden) - n(b.orden); }); }
  function productCost(productoId, data, pp) { var l = bomOf(productoId, data); var c = linesCost(l, data, pp); c.tieneReceta = l.length > 0; return c; }
  // Comisión de cada plataforma: porcentaje + fijo (mismos parámetros que la hoja Configuración)
  function feesOf(canal, pp) {
    var c = norm(canal); pp = pp || {};
    if (c.indexOf('etsy') >= 0) return { pct: n(pp.etsyVenta) + n(pp.etsyPago) + n(pp.etsyReg), fijo: n(pp.etsyFijo) + n(pp.etsyAnuncioUSD) * n(pp.usdEur) };
    if (c.indexOf('vinted') >= 0) return { pct: n(pp.vinted), fijo: 0 };
    return { pct: 0, fijo: 0 };
  }
  // Coste → punto de equilibrio, precio con margen objetivo (si lo hay), y margen real del precio de venta
  function costPricing(total, pp, venta, canal) {
    pp = pp || {};
    if (total === null || total === undefined) return null;
    var f = feesOf(canal, pp), m = filled(pp.margen) ? n(pp.margen) : null;
    var eq = (total + f.fijo) / (1 - f.pct);
    var out = { coste: Math.round(total * 100) / 100, canal: canal || 'General', comisionPct: f.pct, comisionFija: f.fijo, equilibrio: Math.round(eq * 100) / 100,
      margenObjetivo: m, objetivo: m !== null && m > 0 && (1 - f.pct - m) > 0 ? Math.round((total + f.fijo) / (1 - f.pct - m) * 100) / 100 : null, venta: null, margen: null, margenPct: null };
    if (filled(venta) && n(venta) > 0) {
      var v = n(venta), com = v * f.pct + f.fijo;
      out.venta = v; out.comision = Math.round(com * 100) / 100; out.margen = Math.round((v - com - total) * 100) / 100; out.margenPct = out.margen / v;
    }
    return out;
  }
  // Foto del coste de un pedido (se guarda con el pedido y NO cambia si luego suben los precios)
  function costSnapshot(productoId, data, pp, fecha) {
    var c = productCost(productoId, data, pp);
    if (!c.tieneReceta) return null;
    return { fecha: fecha || today(), unidad: c.total, conocido: c.conocido, estado: c.estado, grupos: c.grupos,
      lineas: c.lineas.map(function (l) { return { n: l.nombre, g: l.grupo, q: l.cantidad, u: l.unidad, cu: l.costeUnidad === null ? null : Math.round(l.costeUnidad * 10000) / 10000, c: l.coste === null ? null : Math.round(l.coste * 100) / 100, e: l.estado }; }),
      pendientes: c.pendientes };
  }
  function costText(c) { return (c.lineas || []).map(function (l) { return l.nombre + ' ' + (l.coste === null ? 'PENDIENTE' : eur2(l.coste)); }).join(' · '); }

  // v10 · Objetivos de Celebrity: progreso calculado SOLO con datos reales
  var OBJ_TIPOS = { publicar: 'Publicaciones en redes', pedidos: 'Pedidos', ventas: 'Ventas (€)', tareas: 'Tareas completadas', productos: 'Productos nuevos' };
  function objectiveProgress(o, data, cfg, hoy) {
    hoy = hoy || today();
    var from = o.periodo === 'semana' ? weekStart(hoy) : o.periodo === 'mes' ? hoy.substring(0, 8) + '01' : hoy;
    var inR = function (d) { d = day(d); return d && d >= from && d <= hoy; };
    var cp = (cfg && cfg.pedidos) || {}, v = 0;
    if (o.tipo === 'publicar') v = (data.redes || []).filter(function (r) { return r.estado === 'Publicado' && inR(r.fecha); }).length;
    else if (o.tipo === 'pedidos') v = (data.pedidos || []).filter(function (x) { return inR(x.fecha) && !stateOf(cp, x.estado).cancelled; }).length;
    else if (o.tipo === 'ventas') v = r2((data.pedidos || []).filter(function (x) { return inR(x.fecha) && !stateOf(cp, x.estado).cancelled; }).reduce(function (a, x) { return a + orderTotal(x); }, 0));
    else if (o.tipo === 'tareas') v = (data.tareas || []).filter(function (t) { return t.estado === 'Completada' && inR(t.completado); }).length;
    else if (o.tipo === 'productos') v = (data.productos || []).filter(function (p) { return inR(p.creado); }).length;
    var meta = n(o.meta) || 0;
    return { valor: v, meta: meta, pct: meta ? Math.min(1, v / meta) : 0, hecho: meta > 0 && v >= meta, desde: from, hasta: hoy };
  }
  return { UNITS: UNITS, MAT_TIPOS: MAT_TIPOS, CONF: CONF, CONF_TXT: CONF_TXT, unitKey: unitKey, matCost: matCost, convertUnit: convert, linesCost: linesCost, bomOf: bomOf, productCost: productCost, feesOf: feesOf, costPricing: costPricing, costSnapshot: costSnapshot, costText: costText, worstConf: worst, eur2: eur2,
    finance: finance, phaseOf: phaseOf, stateOfPhase: stateOfPhase, PHASES: PHASES, stockLevels: stockLevels, orderProfit: orderProfit, profitSummary: profitSummary, estComision: estComision, invoiceAmounts: invoiceAmounts, objectiveProgress: objectiveProgress, OBJ_TIPOS: OBJ_TIPOS, sale: sale, costIndex: costIndex, orderAssist: orderAssist, periodRange: periodRange, bi: bi, alerts: alerts, gamify: gamify, levelOf: levelOf, xpForLevel: xpForLevel, BADGES: BADGES,
    day: day, s: s, n: n, norm: norm, today: today, parse: parse, days: days, addDays: addDays, weekStart: weekStart, dateStr: dateStr,
    stateOf: stateOf, orderTiming: orderTiming, orderTotal: orderTotal, isUrgent: isUrgent, ordersByClient: ordersByClient,
    clientStats: clientStats, allClientStats: allClientStats, dashboard: dashboard, prices: prices, round10up: round10up, matches: matches };
})();
if (typeof module !== 'undefined') module.exports = CL;
