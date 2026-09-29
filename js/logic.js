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
    var inicio = o.fecha || s(o.creado).substring(0, 10);
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
      if (t.estado === 'Completada' && s(t.completado).substring(0, 10) === hoy) r.tareas.completadasHoy++;
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

  return { s: s, n: n, norm: norm, today: today, parse: parse, days: days, addDays: addDays, weekStart: weekStart, dateStr: dateStr,
    stateOf: stateOf, orderTiming: orderTiming, orderTotal: orderTotal, isUrgent: isUrgent, ordersByClient: ordersByClient,
    clientStats: clientStats, allClientStats: allClientStats, dashboard: dashboard, prices: prices, round10up: round10up, matches: matches };
})();
if (typeof module !== 'undefined') module.exports = CL;
