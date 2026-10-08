// ================= v17.1 · 🧠 INTELIGENCIA DEL NEGOCIO =================
// Lo pidió la dueña: «el centro de inteligencia que sea de verdad, mucha info», «un banco de metas: si quieres llegar a 1k al mes
// tienes que vender esto» y «un planeta holográfico, tipo CSI, con los países de los clientes».
//  🎯 BANCO DE METAS · eliges cuánto quieres ganar al mes y te dice cuántos pedidos son al día, a la semana y al mes, con TU
//     media real por pedido (o la que escribas tú si aún hay pocos pedidos). Y cómo vas este mes.
//  🌍 PLANETA DE CLIENTES · de qué países te compran. El país sale de la ficha del cliente; a quien no lo tenga se le pone aquí
//     con un toque («¿De qué país es…?»).
//  💡 LO QUE DICEN TUS NÚMEROS · media por pedido, mejor día, canal y producto que más venden, clientes que repiten…
// Todo sale de TUS pedidos reales (los cancelados no cuentan). Con pocos datos se dice; nada se inventa.
import { h, mount, btn, toast, inp, eur } from '../ui.js';
import { S, can, api, byId, upsertLocal, emit } from '../store.js';
import { go } from '../app.js';
import { CONTINENTES, puntosTierra } from '../tierra.js'; // v17.3: la silueta de los continentes

const CL = window.CL;
const LS = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
export const PAISES = { ES: ['España', 40, -4], PT: ['Portugal', 39.5, -8], FR: ['Francia', 46.5, 2.5], IT: ['Italia', 42.8, 12.5], DE: ['Alemania', 51, 10], AD: ['Andorra', 42.5, 1.5], GB: ['Reino Unido', 54, -2], IE: ['Irlanda', 53, -8], NL: ['Países Bajos', 52.2, 5.3], BE: ['Bélgica', 50.6, 4.6], CH: ['Suiza', 46.8, 8.2], AT: ['Austria', 47.6, 14], SE: ['Suecia', 62, 15], PL: ['Polonia', 52, 19], US: ['Estados Unidos', 39, -98], MX: ['México', 23, -102], AR: ['Argentina', -35, -65], CO: ['Colombia', 4, -73], CL: ['Chile', -33, -71], PE: ['Perú', -10, -76], BR: ['Brasil', -10, -53], MA: ['Marruecos', 32, -6] };
const ALIAS = { espana: 'ES', spain: 'ES', espanya: 'ES', portugal: 'PT', francia: 'FR', france: 'FR', italia: 'IT', italy: 'IT', alemania: 'DE', germany: 'DE', andorra: 'AD', 'reino unido': 'GB', uk: 'GB', inglaterra: 'GB', irlanda: 'IE', holanda: 'NL', 'paises bajos': 'NL', belgica: 'BE', suiza: 'CH', austria: 'AT', suecia: 'SE', polonia: 'PL', 'estados unidos': 'US', eeuu: 'US', usa: 'US', mexico: 'MX', argentina: 'AR', colombia: 'CO', chile: 'CL', peru: 'PE', brasil: 'BR', marruecos: 'MA' };
export const paisDe = v => { const t = String(v || '').trim(); if (!t) return ''; if (PAISES[t.toUpperCase()]) return t.toUpperCase(); return ALIAS[CL.norm(t)] || ''; };

// ---------- los números (se pueden probar sin pantalla) ----------
export function numeros(hoy = S.hoy || new Date().toISOString().slice(0, 10)) {
  const est = k => ((S.cfg.pedidos.estados || []).find(s => s.k === k) || {});
  const L = (S.t.pedidos || []).filter(o => !o.eliminado && !est(o.estado).cancelled).map(o => ({ o, f: String(o.fecha || o.creado || '').slice(0, 10), t: Number(CL.orderTotal(o)) || 0 })).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.f));
  const ym = hoy.slice(0, 7), d = new Date(hoy + 'T12:00:00'), dias = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), dia = d.getDate();
  const desde90 = new Date(d.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  const mes = L.filter(x => x.f.slice(0, 7) === ym), r90 = L.filter(x => x.f >= desde90 && x.f <= hoy);
  const suma = l => Math.round(l.reduce((a, x) => a + x.t, 0) * 100) / 100;
  const top = (l, clave, valor) => { const m = {}; l.forEach(x => { const k = clave(x); if (k) m[k] = (m[k] || 0) + valor(x); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const primerDia = r90.length ? r90.map(x => x.f).sort()[0] : hoy, diasCon = Math.max(1, Math.round((new Date(hoy) - new Date(primerDia)) / 86400000) + 1);
  const porCliente = top(L, x => x.o.clienteId || CL.norm(x.o.cliente), () => 1), SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const paises = {}; let sinPais = [];
  const vistos = new Set();
  L.forEach(x => { const c = x.o.clienteId ? byId('clientes', x.o.clienteId) : null, p = paisDe((c && c.pais) || x.o.pais);
    if (p) { paises[p] = paises[p] || { k: p, pedidos: 0, total: 0 }; paises[p].pedidos++; paises[p].total += x.t; }
    else if (c && !vistos.has(c.id)) { vistos.add(c.id); sinPais.push(c); } });
  return { hoy, dia, dias, pedidosTotales: L.length,
    mes: { ventas: suma(mes), pedidos: mes.length }, r90: { ventas: suma(r90), pedidos: r90.length, dias: Math.min(90, diasCon) },
    ticket: r90.length >= 5 ? Math.round(suma(r90) / r90.length * 100) / 100 : null,
    pedidosMes: r90.length ? Math.round(r90.length / Math.min(90, diasCon) * 30 * 10) / 10 : 0,
    diaSemana: (top(r90, x => SEM[new Date(x.f + 'T12:00:00').getDay()], () => 1)[0] || [])[0] || '',
    canal: top(r90, x => x.o.canal, x => x.t)[0] || null, producto: top(r90, x => x.o.producto, x => Number(x.o.cantidad) || 1)[0] || null,
    repiten: porCliente.length ? Math.round(porCliente.filter(x => x[1] > 1).length / porCliente.length * 100) : null, clientes: porCliente.length,
    paises: Object.values(paises).sort((a, b) => b.pedidos - a.pedidos), sinPais };
}
// Para llegar a «meta» €/mes con «ticket» € de media por pedido
export function plan(meta, ticket, N) {
  if (!(meta > 0) || !(ticket > 0)) return null;
  const alMes = Math.ceil(meta / ticket), falta = Math.max(0, meta - N.mes.ventas), quedan = Math.max(1, N.dias - N.dia + 1);
  return { alMes, aLaSemana: Math.ceil(alMes / 4.345), alDia: Math.round(alMes / 30 * 10) / 10, cadaDias: alMes >= 30 ? 0 : Math.round(30 / alMes * 10) / 10,
    ahora: N.pedidosMes, faltanPedidos: Math.max(0, Math.ceil(alMes - N.pedidosMes)), pct: Math.min(1, N.mes.ventas / meta), falta: Math.round(falta * 100) / 100,
    alDiaParaLlegar: Math.round(falta / quedan * 100) / 100, pedidosDiaParaLlegar: Math.round(falta / ticket / quedan * 10) / 10, quedan,
    proyeccion: N.dia ? Math.round(N.mes.ventas / N.dia * N.dias) : 0, conDosMas: Math.ceil(meta / (ticket + 2)) };
}

// ---------- 🎯 banco de metas ----------
function bancoMetas(N) {
  const caja = h('section.card.in-metas'), dinero = can('productos.costes') || can('informes.ver');
  if (!dinero) { mount(caja, h('h3', '🎯 Banco de metas'), h('p.muted', 'Hace falta permiso para ver importes.')); return caja; }
  let meta = Number(LS.get('cd.meta17')) || 1000, ticketMio = Number(LS.get('cd.ticket17')) || 0;
  const pinta = () => {
    const ticket = N.ticket || ticketMio, P = plan(meta, ticket, N);
    const metaI = inp({ type: 'number', min: 50, step: 50, value: meta, 'aria-label': 'Meta del mes en euros', oninput: () => { const v = Number(metaI.value); if (v > 0) { meta = v; LS.set('cd.meta17', String(v)); pintaRes(); } } });
    const tI = inp({ type: 'number', min: 1, step: 0.5, value: ticketMio || '', placeholder: 'p. ej. 12', 'aria-label': 'Tu media por pedido', oninput: () => { ticketMio = Number(tI.value) || 0; LS.set('cd.ticket17', String(ticketMio)); pintaRes(); } });
    const res = h('div.in-res');
    const dato = (v, t, cls) => h('div.in-dato' + (cls ? '.' + cls : ''), h('b', v), h('span', t));
    function pintaRes() {
      const tk = N.ticket || ticketMio, Q = plan(meta, tk, N);
      if (!Q) return mount(res, h('p.in-aviso', '✏️ Todavía hay pocos pedidos para sacar tu media. Escribe arriba cuánto te deja de media un pedido y te digo cuánto tienes que vender.'));
      mount(res,
        h('div.in-datos', dato(String(Q.alMes), 'pedidos al mes', 'gr'), dato(String(Q.aLaSemana), 'a la semana'), dato(Q.alDia >= 1 ? String(Q.alDia).replace('.', ',') : '1 cada ' + String(Q.cadaDias).replace('.', ',') + ' días', Q.alDia >= 1 ? 'al día' : 'de ritmo')),
        h('p.in-frase', 'Para llegar a ', h('b', eur(meta)), ' al mes, con ', h('b', eur(tk)), ' de media por pedido' + (N.ticket ? ' (tu media real de los últimos 90 días)' : ' (la que has escrito)') + ', necesitas ', h('b', Q.alMes + ' pedidos al mes'), '.'),
        N.r90.pedidos ? h('p.in-frase', 'Ahora haces unos ', h('b', String(Q.ahora).replace('.', ',') + ' al mes'), Q.faltanPedidos ? [': te faltan ', h('b', Q.faltanPedidos + ' más'), '.'] : ': ✅ ya vas a ese ritmo.') : null,
        h('div.in-barra', h('i', { style: { width: Math.round(Q.pct * 100) + '%' } })),
        h('p.in-frase.small', 'Este mes llevas ', h('b', eur(N.mes.ventas)), ' (' + Math.round(Q.pct * 100) + ' %). ', Q.falta ? ['Te faltan ', h('b', eur(Q.falta)), ': son ', h('b', eur(Q.alDiaParaLlegar) + ' al día'), ' (' + String(Q.pedidosDiaParaLlegar).replace('.', ',') + ' pedidos) los ' + Q.quedan + ' días que quedan. '] : '🎉 ¡Meta conseguida! ', N.dia > 3 ? 'A este ritmo cerrarás en ' + eur(Q.proyeccion) + '.' : ''),
        h('p.in-truco', '💡 Si cada pedido te dejara 2 € más (un extra, un pack, el envío mejor cobrado), bastarían ', h('b', Q.conDosMas + ' pedidos'), ' en vez de ' + Q.alMes + '.'));
    }
    mount(caja, h('h3', '🎯 Banco de metas'), h('p.small.muted', { style: { margin: '0 0 8px' } }, 'Elige cuánto quieres vender al mes y te digo cuánto es al día.'),
      h('div.in-metas-f', h('div.in-chips', [500, 1000, 2000, 4000].map(v => h('button.chip' + (meta === v ? '.on' : ''), { type: 'button', 'data-meta': v, onclick: () => { meta = v; LS.set('cd.meta17', String(v)); pinta(); } }, eur(v)))), h('label.in-campo', h('span', 'Otra meta (€/mes)'), metaI),
        N.ticket ? h('span.in-ticket', 'Tu media por pedido: ', h('b', eur(N.ticket))) : h('label.in-campo', h('span', 'Tu media por pedido (€)'), tI)), res);
    pintaRes();
  };
  pinta(); return caja;
}

// ---------- 🌍 planeta de clientes (holograma) ----------
const FRONTERA = new Set(['60,68.5', '60,55', '55,51', '50,46', '48,42']); // la raya entre Europa y Asia no es costa: no se dibuja
export function planeta(N, repinta) {
  const cv = h('canvas.in-globo', { width: 520, height: 520, 'aria-label': 'Planeta con los países de tus clientes' }), X = cv.getContext('2d'), lista = h('div.in-paises'), pregunta = h('div.in-pregunta');
  let lon0 = -4, lat0 = 22, vivo = true, arr = null, auto = true, t0 = performance.now();
  const max = Math.max(1, ...N.paises.map(p => p.pedidos)), R = 205, cx = 260, cy = 262, rad = Math.PI / 180;
  const pro = (lat, lon) => { const l = (lon - lon0) * rad, f = lat * rad, f0 = lat0 * rad, c = Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(l); return { x: cx + R * Math.cos(f) * Math.sin(l), y: cy - R * (Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(l)), v: c > 0, c }; };
  function dibuja(t) {
    if (!vivo || !cv.isConnected) { vivo = false; return; }
    requestAnimationFrame(dibuja); if (auto) lon0 += 0.12;
    X.clearRect(0, 0, 520, 520);
    const g = X.createRadialGradient(cx - 60, cy - 70, 20, cx, cy, R + 8); g.addColorStop(0, 'rgba(34,211,238,.20)'); g.addColorStop(0.7, 'rgba(8,47,73,.55)'); g.addColorStop(1, 'rgba(34,211,238,.05)');
    X.fillStyle = g; X.beginPath(); X.arc(cx, cy, R, 0, 7); X.fill(); X.strokeStyle = 'rgba(103,232,249,.75)'; X.lineWidth = 1.5; X.stroke();
    X.strokeStyle = 'rgba(103,232,249,.16)'; X.lineWidth = 1;
    for (let lo = -180; lo < 180; lo += 20) { X.beginPath(); let on = false; for (let la = -90; la <= 90; la += 5) { const p = pro(la, lo); if (p.v) { on ? X.lineTo(p.x, p.y) : X.moveTo(p.x, p.y); on = true; } else on = false; } X.stroke(); }
    for (let la = -60; la <= 60; la += 20) { X.beginPath(); let on = false; for (let lo = -180; lo <= 180; lo += 5) { const p = pro(la, lo); if (p.v) { on ? X.lineTo(p.x, p.y) : X.moveTo(p.x, p.y); on = true; } else on = false; } X.stroke(); }
    X.fillStyle = 'rgba(125,244,255,.5)'; // continentes: su silueta (simplificada) rellena de puntos
    const PT = puntosTierra(2.5); for (let i = 0; i < PT.length; i += 2) { const p = pro(PT[i], PT[i + 1]); if (p.v) X.fillRect(p.x - 0.8, p.y - 0.8, 1.4 + p.c, 1.4 + p.c); }
    X.strokeStyle = 'rgba(165,243,252,.9)'; X.lineWidth = 1.3; X.lineJoin = 'round'; // las costas
    for (const k in CONTINENTES) { const pol = CONTINENTES[k], n = pol.length; X.beginPath(); let on = false; for (let i = 0; i <= n; i++) { const a = pol[i % n], b = pol[(i + n - 1) % n], p = pro(a[1], a[0]), salta = i > 0 && FRONTERA.has(a + '') && FRONTERA.has(b + ''); if (p.v && on && !salta) X.lineTo(p.x, p.y); else if (p.v) X.moveTo(p.x, p.y); on = p.v; } X.stroke(); }
    const sy = cy - R + ((t - t0) / 18) % (2 * R); X.strokeStyle = 'rgba(165,243,252,.35)'; X.beginPath(); const hw = Math.sqrt(Math.max(0, R * R - (sy - cy) * (sy - cy))); X.moveTo(cx - hw, sy); X.lineTo(cx + hw, sy); X.stroke();
    N.paises.forEach(q => { const P = PAISES[q.k]; if (!P) return; const p = pro(P[1], P[2]); if (!p.v) return; const k = q.pedidos / max, alto = 18 + k * 70, pulso = 5 + k * 9 + Math.sin(t / 300 + P[2]) * 2;
      const nx = (p.x - cx) / R, ny = (p.y - cy) / R; X.strokeStyle = 'rgba(253,224,71,.9)'; X.lineWidth = 2; X.beginPath(); X.moveTo(p.x, p.y); X.lineTo(p.x + nx * alto, p.y + ny * alto); X.stroke();
      X.fillStyle = 'rgba(253,224,71,.22)'; X.beginPath(); X.arc(p.x, p.y, pulso + 5, 0, 7); X.fill(); X.fillStyle = '#fde047'; X.beginPath(); X.arc(p.x, p.y, 4, 0, 7); X.fill();
      X.font = '700 13px system-ui, sans-serif'; X.fillStyle = '#ecfeff'; X.textAlign = nx < 0 ? 'right' : 'left'; X.fillText(P[0] + ' · ' + q.pedidos, p.x + nx * alto + (nx < 0 ? -6 : 6), p.y + ny * alto + 4); });
  }
  cv.addEventListener('pointerdown', e => { arr = { x: e.clientX, y: e.clientY, lon: lon0, lat: lat0 }; auto = false; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!arr) return; lon0 = arr.lon - (e.clientX - arr.x) * 0.4; lat0 = Math.max(-60, Math.min(60, arr.lat + (e.clientY - arr.y) * 0.3)); });
  cv.addEventListener('pointerup', () => { arr = null; });
  mount(lista, N.paises.length ? N.paises.map((q, i) => h('button.in-pais', { type: 'button', 'data-pais': q.k, title: 'Girar el planeta hasta ' + (PAISES[q.k] || [q.k])[0], onclick: () => { const P = PAISES[q.k]; if (P) { auto = false; lon0 = P[2]; lat0 = Math.max(-60, Math.min(60, P[1])); } } },
    h('span.in-n', String(i + 1)), h('span.grow', h('b', (PAISES[q.k] || [q.k])[0]), h('i', { style: { width: Math.round(q.pedidos / max * 100) + '%' } })), h('span.in-c', q.pedidos + (q.pedidos === 1 ? ' pedido' : ' pedidos'), can('productos.costes') ? h('small', eur(Math.round(q.total * 100) / 100)) : null)))
    : h('p.in-vacio', 'Todavía no sé de qué país es ningún cliente. Ponlo aquí abajo o en su ficha y el planeta se enciende.'));
  // «¿De qué país es…?»: se pone con un toque (y queda guardado en la ficha del cliente)
  const cola = N.sinPais.slice();
  function pregunta1() {
    const c = cola[0]; if (!c || !can('clientes.editar')) return mount(pregunta, cola.length ? h('p.tiny', cola.length + ' clientes sin país: se pone en su ficha.') : null);
    const pon = async k => { try { const r = await api('clientes.guardar', { id: c.id, datos: { pais: PAISES[k][0] } }); upsertLocal('clientes', r && r.id ? r : Object.assign({}, c, { pais: PAISES[k][0] })); emit(); cola.shift(); toast('🌍 ' + c.nombre + ' → ' + PAISES[k][0], 'ok', 1800); repinta(); } catch (e) { toast(e.message || 'No se pudo guardar', 'bad'); } };
    const otro = h('select.inp.in-otro', { 'aria-label': 'Otro país', onchange: () => { if (otro.value) pon(otro.value); } }, h('option', { value: '' }, 'Otro…'), Object.keys(PAISES).slice(4).map(k => h('option', { value: k }, PAISES[k][0])));
    mount(pregunta, h('b', '¿De qué país es ' + c.nombre + '?'), h('span.tiny', ' · quedan ' + cola.length + ' sin país'), h('div.in-chips', ['ES', 'PT', 'FR', 'IT'].map(k => h('button.chip', { type: 'button', 'data-pon': k, onclick: () => pon(k) }, PAISES[k][0])), otro, h('button.chip.gh', { type: 'button', onclick: () => { cola.push(cola.shift()); pregunta1(); } }, 'Saltar')));
  }
  pregunta1(); requestAnimationFrame(dibuja);
  return h('section.card.in-planeta', h('h3', '🌍 Planeta de clientes'), h('p.small', { style: { margin: '0 0 6px', opacity: .8 } }, 'Dónde te compran. Arrastra el planeta para girarlo.'), h('div.in-planeta-g', cv, h('div.in-planeta-l', lista, pregunta)));
}

// ---------- 💡 lo que dicen tus números ----------
function ideas(N) {
  const dinero = can('productos.costes') || can('informes.ver'), l = [];
  if (N.pedidosTotales < 5) l.push(['🌱', 'Aún hay pocos pedidos', 'Con ' + N.pedidosTotales + ' pedidos los números todavía no dicen mucho. A partir de 5 en 90 días empiezo a sacar medias de verdad.']);
  if (N.ticket && dinero) l.push(['🧾', 'Cada pedido te deja ' + eur(N.ticket) + ' de media', 'Sale de ' + N.r90.pedidos + ' pedidos en los últimos ' + N.r90.dias + ' días. Subirla 2 € es más fácil que conseguir clientes nuevos: packs, extras, personalización.']);
  if (N.r90.pedidos) l.push(['📦', 'Haces unos ' + String(N.pedidosMes).replace('.', ',') + ' pedidos al mes', 'Es tu ritmo real de los últimos ' + N.r90.dias + ' días.']);
  if (N.diaSemana) l.push(['📅', 'Tu mejor día es el ' + N.diaSemana, 'Es cuando más pedidos entran. Buen día para publicar o lanzar una oferta la víspera.']);
  if (N.canal) l.push(['🛒', 'Donde más vendes: ' + N.canal[0], dinero ? eur(Math.round(N.canal[1] * 100) / 100) + ' en 90 días. Cuida primero ese canal.' : 'Cuida primero ese canal.']);
  if (N.producto) l.push(['⭐', 'Lo que más sale: ' + N.producto[0], N.producto[1] + ' unidades en 90 días. Ten siempre fotos buenas y stock de filamento para él.']);
  if (N.repiten !== null && N.clientes >= 5) l.push(['💜', N.repiten + ' % de tus clientes repite', N.repiten >= 20 ? 'Buena señal: quien prueba, vuelve.' : 'Una tarjeta con un descuento para la próxima compra ayuda a que vuelvan.']);
  if (N.paises.length > 1) l.push(['🌍', 'Vendes en ' + N.paises.length + ' países', 'El primero es ' + (PAISES[N.paises[0].k] || [N.paises[0].k])[0] + ' con ' + N.paises[0].pedidos + ' pedidos.']);
  return h('section.card.in-ideas', h('h3', '💡 Lo que dicen tus números'), h('div.in-ideas-l', l.map(([ic, t, s]) => h('div.in-idea', h('i', ic), h('span', h('b', t), h('small', s))))));
}

export function panel(caja) {
  const pinta = () => { const N = numeros(), acc = h('div.in-acc'), extra = h('div.in-extra'); mount(caja, h('div.intel', acc, bancoMetas(N), planeta(N, pinta), extra, ideas(N)));
    // v17.1 · las tres premium: parte del día, sala de control y recuperar clientes
    import('../premium171.js').then(M => { mount(acc, btn('☀️ Parte del día', () => M.dialogoParte(), { cls: 'in-parte' }), btn('🛰️ Sala de control', () => M.salaControl(), { cls: 'in-sala' }), h('span.tiny.muted', 'La sala es para verla a pantalla completa: sal con Esc.')); mount(extra, M.seccionDormidos()); }).catch(() => { }); };
  pinta(); return pinta;
}
export function render(el) {
  if (!can('pedidos.ver')) { mount(el, h('div.card', h('h3', '🔒 Inteligencia'), h('p.muted', 'Necesitas permiso para ver los pedidos.'))); return {}; }
  const caja = h('div'); el.append(h('div.page-head', h('div', h('h1', '🧠 Inteligencia del negocio'), h('div.muted.small', 'Tus metas, de dónde te compran y lo que dicen tus números. Todo sale de tus pedidos reales.'))), caja);
  let firma = ''; const sig = () => (S.t.pedidos || []).length + '|' + (S.t.clientes || []).map(c => c.pais || '').join(',').length;
  const pinta = panel(caja); firma = sig();
  return { update: () => { if (sig() !== firma && !caja.contains(document.activeElement)) { firma = sig(); pinta(); } } };
}
