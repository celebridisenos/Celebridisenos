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
    if (valid.length >= 2) st.etiquetas.push({ k: 'recurrente', t: 'Cliente recurrente', i: '💬' });
    if (cc.altoValor && n(cc.altoValor.minGasto) > 0 && gasto >= n(cc.altoValor.minGasto)) st.etiquetas.push({ k: 'altovalor', t: 'Alto valor', i: '📈' });
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
    var r = { pedidos: { total: pedidos.length, abiertos: 0, urgentes: [], vencidos: [], proximos: [], incidencias: [], fabricar: 0, fabricando: 0, empaquetar: 0, enviar: 0, enviados: 0, porEstado: {} },
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
      if (o.estado === 'Pendiente de fabricación' || o.estado === 'Nuevo' || o.estado === 'Pendiente de revisión') r.pedidos.fabricar++;
      if (o.estado === 'En fabricación') r.pedidos.fabricando++;
      if (o.estado === 'Fabricado') r.pedidos.empaquetar++;
      if (o.estado === 'Empaquetado' || o.estado === 'Listo para enviar') r.pedidos.enviar++;
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
    var R = fil + luz + mo + pint + ext, T = R * (1 + n(pp.iva));
    var etsyPct = n(pp.etsyVenta) + n(pp.etsyPago) + n(pp.etsyReg), etsyFix = n(pp.etsyFijo) + n(pp.etsyAnuncioUSD) * n(pp.usdEur);
    function plat(m) { return { general: T / (1 - m), wallapop: T / (1 - m), vinted: T / (1 - m - n(pp.vinted)), etsy: (T + etsyFix) / (1 - m - etsyPct) }; }
    var o = plat(n(pp.margen)), mi = plat(n(pp.margenMin));
    var out = { desglose: { filamento: fil, luz: luz, manoObra: mo, pintado: pint, gastosExtra: ext, produccion: R, iva: R * n(pp.iva), costeTotal: T },
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
      var rec = { coste: ct, recomendado: n(c.precioVenta), minimo: n(c.precioMinimo), nombre: c.nombre };
      if (c.id) byId[s(c.id)] = rec;
      if (c.nombre) byName[norm(c.nombre)] = rec;
    });
    var prodById = {};
    (data.productos || []).forEach(function (p) { prodById[p.id] = p; });
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

  // Alertas inteligentes (nunca cambian datos: solo avisan)
  function alerts(data, cfg, hoy, extra) {
    hoy = hoy || today(); extra = extra || {};
    var al = cfg.alertas || {}, out = [], cp = cfg.pedidos, minM = n(al.margenMinimo) || 0.15, costOf = costIndex(data, cfg.precios);
    if (al.stockBajo !== false) (data.stock || []).forEach(function (x) {
      if (x.producto && (x.alerta || (n(x.minimo) > 0 && n(x.unidades) <= n(x.minimo)))) out.push({ nivel: 'warn', tipo: 'stock', texto: 'Stock bajo: ' + x.producto + ' (' + n(x.unidades) + ' uds., mínimo ' + n(x.minimo) + ')', enlace: 'productos' });
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
    var stale = (data.pedidos || []).filter(function (o) { var st = stateOf(cp, o.estado); return st.open && !st.issue && (o.estado === 'Nuevo' || o.estado === 'Pendiente de revisión') && o.fecha && days(o.fecha, hoy) >= 3; });
    if (stale.length) out.push({ nivel: 'warn', tipo: 'pedido', texto: stale.length + ' pedido(s) llevan 3 días o más sin revisar', enlace: 'pedidos' });
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

  return { sale: sale, costIndex: costIndex, orderAssist: orderAssist, periodRange: periodRange, bi: bi, alerts: alerts, gamify: gamify, levelOf: levelOf, xpForLevel: xpForLevel, BADGES: BADGES,
    day: day, s: s, n: n, norm: norm, today: today, parse: parse, days: days, addDays: addDays, weekStart: weekStart, dateStr: dateStr,
    stateOf: stateOf, orderTiming: orderTiming, orderTotal: orderTotal, isUrgent: isUrgent, ordersByClient: ordersByClient,
    clientStats: clientStats, allClientStats: allClientStats, dashboard: dashboard, prices: prices, round10up: round10up, matches: matches };
})();
if (typeof module !== 'undefined') module.exports = CL;
