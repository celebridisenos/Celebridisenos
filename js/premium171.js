// ================= v17.1 · TRES FUNCIONES PREMIUM =================
// Lo pidió la dueña: «haz 3 funciones premium más, que cuando me despierte diga ¡wow!».
//  ☀️ PARTE DEL DÍA · al abrir el programa por la mañana: qué hay que hacer hoy, en orden, cómo va el mes… y te lo LEE en voz alta.
//  💤 RECUPERAR CLIENTES · quién lleva tiempo sin comprar y un WhatsApp ya escrito para saludarle (lo envías tú: el programa no manda nada solo).
//  🛰️ SALA DE CONTROL · a pantalla completa, tipo CSI: el planeta, los pedidos por estado con su color, el mes y los últimos pedidos, en directo.
// Todo sale de TUS pedidos reales. Sin datos se dice; nada se inventa.
import { h, mount, btn, modal, toast, eur, copyText } from './ui.js';
import { S, can, timing, byId } from './store.js';
import { numeros, plan, planeta, PAISES } from './views/inteligencia.js';
import { desktop } from './desktop.js';
import { hayVoz } from './voz.js';

const CL = window.CL;
const LS = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
const hoyStr = () => S.hoy || new Date().toISOString().slice(0, 10);
const dinero = () => can('productos.costes') || can('informes.ver');
const estados = () => (S.cfg && S.cfg.pedidos && S.cfg.pedidos.estados) || [];
const colorOk = c => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : '#64748b';
const nombre1 = () => String((S.me && S.me.nombre) || '').trim().split(/\s+/)[0] || '';
const vivos = () => (S.t.pedidos || []).filter(o => !o.eliminado && !o.archivado);
const pl = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
const ir = k => import('./app.js').then(A => A.go(k));

// ---------- ☀️ PARTE DEL DÍA ----------
// Los números del parte (se pueden probar sin pantalla)
export function parte(hoy = hoyStr()) {
  const ab = vivos().map(o => ({ o, t: timing(o) || {}, f: CL.phaseOf(S.cfg.pedidos, o.estado) })).filter(x => x.t.abierto);
  const fase = k => ab.filter(x => x.f === k).length;
  const c = { imprimir: fase('confirmado'), imprimiendo: fase('impresion'), mesa: fase('postpro'), empaquetar: fase('empaquetar'), enviar: fase('listo'),
    tarde: ab.filter(x => x.t.nivel === 'late').length, hoy: ab.filter(x => x.t.nivel === 'today').length, incidencias: ab.filter(x => x.t.incidencia).length, abiertos: ab.length };
  const ayer = new Date(new Date(hoy + 'T12:00:00').getTime() - 86400000).toISOString().slice(0, 10);
  const N = numeros(hoy), meta = Number(LS.get('cd.meta17')) || 0, tk = N.ticket || Number(LS.get('cd.ticket17')) || 0, P = meta ? plan(meta, tk || 1, N) : null;
  const deAyer = vivos().filter(o => String(o.fecha || '').slice(0, 10) === ayer && !(timing(o) || {}).cancelado);
  // lo primero de hoy, por orden de urgencia (como mucho 4)
  const T = [];
  if (c.incidencias) T.push(['⚠️', pl(c.incidencias, 'incidencia abierta', 'incidencias abiertas'), 'Lo primero: un cliente esperando una solución pesa más que todo lo demás.', 'bad']);
  if (c.tarde) T.push(['⏰', pl(c.tarde, 'pedido va con retraso', 'pedidos van con retraso'), 'Sácalos antes que nada, o avisa al cliente de la nueva fecha.', 'bad']);
  if (c.hoy) T.push(['📅', pl(c.hoy, 'pedido vence hoy', 'pedidos vencen hoy'), 'Tienen que salir hoy.', 'warn']);
  if (c.enviar) T.push(['🚚', pl(c.enviar, 'paquete listo para enviar', 'paquetes listos para enviar'), 'Ya están empaquetados: solo falta llevarlos.', 'ok']);
  if (c.empaquetar) T.push(['📦', pl(c.empaquetar, 'pedido para empaquetar', 'pedidos para empaquetar'), 'Están hechos: caja, tarjeta y etiqueta.', 'ok']);
  if (c.mesa) T.push(['🧰', pl(c.mesa, 'pieza en mesa', 'piezas en mesa'), 'Quitar soportes, repasar y a empaquetar.', 'ok']);
  if (c.imprimir) T.push(['🖨️', pl(c.imprimir, 'pedido por imprimir', 'pedidos por imprimir'), 'Pon la impresora en marcha cuanto antes: es lo que más tarda.', 'ok']);
  if (!T.length) T.push(['🌿', 'Hoy no hay nada urgente', 'Buen día para hacer fotos nuevas, un reel o escribir a clientes que hace tiempo que no compran.', 'ok']);
  const hr = new Date().getHours(), saludo = (hr < 6 ? 'Buenas noches' : hr < 14 ? 'Buenos días' : hr < 21 ? 'Buenas tardes' : 'Buenas noches') + (nombre1() ? ', ' + nombre1() : '');
  // lo que se lee en voz alta (frases cortas)
  const v = [saludo + '.'];
  v.push(c.abiertos ? 'Tienes ' + pl(c.abiertos, 'pedido en marcha', 'pedidos en marcha') + '.' : 'No tienes pedidos en marcha.');
  T.slice(0, 3).forEach(x => { if (x[3] !== 'ok' || c.abiertos) v.push(x[1] + '.'); });
  if (deAyer.length) v.push('Ayer ' + (deAyer.length === 1 ? 'entró 1 pedido' : 'entraron ' + deAyer.length + ' pedidos') + '.');
  if (dinero() && N.mes.pedidos) v.push('Este mes llevas ' + String(Math.round(N.mes.ventas)) + ' euros' + (P ? ', el ' + Math.round(P.pct * 100) + ' por ciento de tu meta' : '') + '.');
  v.push(c.tarde || c.incidencias ? 'Empieza por lo urgente. ¡Ánimo!' : '¡A por el día!');
  return { hoy, saludo, c, tareas: T.slice(0, 4), ayer: { pedidos: deAyer.length }, mes: N.mes, meta, plan: P, voz: v };
}
// Se lee frase a frase (el navegador las pone en cola). No usa la cola de avisos del taller, que recorta si hay muchos seguidos.
export function leerParte(P) {
  if (!hayVoz()) { toast('Este aparato no sabe leer en voz alta.', 'warn'); return false; }
  try { speechSynthesis.cancel(); } catch (e) { }
  const vs = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [], voz = vs.find(v => /^es[-_]ES/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null;
  (P || parte()).voz.forEach(f => { const u = new SpeechSynthesisUtterance(f); u.lang = 'es-ES'; if (voz) u.voice = voz; u.rate = 1; try { speechSynthesis.speak(u); } catch (e) { } });
  return true;
}
export function dialogoParte() {
  const P = parte(), d = new Date(P.hoy + 'T12:00:00'), fecha = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  LS.set('cd.parte17', P.hoy);
  const E = k => colorOk((estados().find(s => s.f === k) || {}).c);
  const ficha = (n, t, col) => h('div.pd-ficha', { style: '--c: ' + col }, h('b', String(n)), h('span', t));
  let m = null; const cierra = () => { try { speechSynthesis.cancel(); } catch (e) { } if (m) m.close(); };
  m = modal('☀️ Tu parte del día', h('div.pd17',
    h('div.pd-cielo', h('div.pd-sol'), h('div', h('h2', P.saludo), h('p', fecha.charAt(0).toUpperCase() + fecha.slice(1) + ' · ' + (P.c.abiertos ? pl(P.c.abiertos, 'pedido en marcha', 'pedidos en marcha') : 'sin pedidos en marcha')))),
    h('div.pd-fichas', ficha(P.c.imprimir, 'por imprimir', E('confirmado')), ficha(P.c.imprimiendo, 'imprimiendo', E('impresion')), ficha(P.c.mesa, 'en mesa', E('postpro')), ficha(P.c.empaquetar, 'empaquetar', E('empaquetar')), ficha(P.c.enviar, 'por enviar', E('listo'))),
    h('h4.pd-t', '👉 Lo primero de hoy'),
    h('ol.pd-tareas', P.tareas.map(([ic, t, s, cls]) => h('li.pd-' + cls, h('i', ic), h('span', h('b', t), h('small', s))))),
    dinero() ? h('div.pd-mes', h('span', 'Este mes: ', h('b', eur(P.mes.ventas)), ' en ' + pl(P.mes.pedidos, 'pedido', 'pedidos'), P.plan ? [' · meta ', h('b', eur(P.meta))] : null),
      P.plan ? h('div.pd-barra', h('i', { style: { width: Math.round(P.plan.pct * 100) + '%' } })) : h('button.btn.sm.ghost', { type: 'button', onclick: () => { cierra(); ir('inteligencia'); } }, '🎯 Ponte una meta'),
      P.plan && P.plan.falta ? h('small', 'Te faltan ' + eur(P.plan.falta) + ': ' + eur(P.plan.alDiaParaLlegar) + ' al día los ' + P.plan.quedan + ' días que quedan.') : P.plan ? h('small', '🎉 ¡Meta del mes conseguida!') : null) : null),
    () => [hayVoz() ? btn('🔊 Escúchalo', () => leerParte(P), { cls: 'pd-voz' }) : null, btn('🛰️ Sala de control', () => { cierra(); salaControl(); }, { cls: 'ghost pd-sala' }), btn('📦 Ver pedidos', () => { cierra(); ir('pedidos'); }, { cls: 'ghost' }), btn('¡A por el día! 🚀', cierra, { cls: 'primary' })],
    { size: 'wide', noFocus: true, onclose: () => { try { speechSynthesis.cancel(); } catch (e) { } } });
  return m;
}
// La franja de Inicio: cada mañana avisa de que el parte está listo (no abre nada sola: no interrumpe)
export function franjaParte(redibuja) {
  if (!can('pedidos.ver')) return null;
  const P = parte(), visto = LS.get('cd.parte17') === P.hoy, urg = P.c.tarde + P.c.incidencias;
  return h('div.pd-franja' + (visto ? '.visto' : ''), h('div.pd-f-sol', visto ? '🌤️' : '☀️'),
    h('div.grow', h('b', visto ? 'Tu parte de hoy' : P.saludo + ' · tu parte de hoy está listo'), h('span', P.tareas[0][1] + (P.tareas[1] ? ' · ' + P.tareas[1][1] : '') + (urg ? ' ⚠️' : ''))),
    btn(visto ? 'Verlo' : '▶ Ver mi parte', () => { const d = dialogoParte(); const obs = new MutationObserver(() => { if (!document.body.contains(d.el)) { obs.disconnect(); if (redibuja) redibuja(); } }); obs.observe(document.body, { childList: true, subtree: true }); }, { cls: (visto ? 'sm ghost' : 'primary') + ' pd-abrir' }),
    btn('🛰️', () => salaControl(), { cls: 'sm ghost pd-sala-b', title: 'Sala de control (pantalla completa)' }));
}

// ---------- 💤 RECUPERAR CLIENTES ----------
export function dormidos(hoy = hoyStr(), dias = 60) {
  const est = k => (estados().find(s => s.k === k) || {}), m = {};
  vivos().forEach(o => { if (est(o.estado).cancelled) return; const f = String(o.fecha || o.creado || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return;
    const k = o.clienteId || 'n:' + CL.norm(o.cliente); if (!k || k === 'n:') return;
    const x = m[k] = m[k] || { c: (o.clienteId && byId('clientes', o.clienteId)) || { nombre: o.cliente }, pedidos: 0, total: 0, ultimo: '', producto: '' };
    x.pedidos++; x.total += Number(CL.orderTotal(o)) || 0; if (f > x.ultimo) { x.ultimo = f; x.producto = o.producto || ''; } });
  return Object.values(m).map(x => Object.assign(x, { dias: CL.days(x.ultimo, hoy), total: Math.round(x.total * 100) / 100 })).filter(x => x.dias >= dias).sort((a, b) => b.total - a.total || b.pedidos - a.pedidos);
}
const MSJ0 = '¡Hola {nombre}! Soy {yo} de {empresa} 😊 Hace tiempo que no hablamos y me he acordado de ti. Tengo cosas nuevas que creo que te van a gustar. ¿Te las enseño?';
export const mensajeVuelve = (c, plantilla) => String(plantilla || LS.get('cd.vuelve17') || MSJ0).replace(/\{nombre\}/g, String((c && c.nombre) || '').trim().split(/\s+/)[0] || '').replace(/\{yo\}/g, nombre1() || 'yo').replace(/\{empresa\}/g, (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'la tienda').replace(/\s+([!?.,])/g, '$1');
export function seccionDormidos() {
  const caja = h('section.card.in-dormidos'); let dias = Number(LS.get('cd.dormidos17')) || 60;
  const abre = url => desktop.on ? desktop.openUrl(url).catch(() => window.open(url, '_blank', 'noopener')) : window.open(url, '_blank', 'noopener');
  const pinta = () => {
    const L = dormidos(hoyStr(), dias), txt = h('textarea.inp.dm-msj', { rows: 3, 'aria-label': 'Mensaje para recuperar clientes', oninput: () => LS.set('cd.vuelve17', txt.value.trim() === MSJ0 ? '' : txt.value) }, LS.get('cd.vuelve17') || MSJ0);
    const fila = x => { const tel = x.c.telefono && x.c.telefono !== '•••' ? x.c.telefono : '', wa = () => CL.waLink(tel, mensajeVuelve(x.c, txt.value));
      return h('div.dm-fila', { 'data-cli': x.c.nombre }, h('span.dm-zz', x.dias >= 180 ? '😴' : '💤'), h('span.grow', h('b', x.c.nombre), h('small', 'Hace ' + x.dias + ' días · ' + pl(x.pedidos, 'pedido', 'pedidos') + (dinero() ? ' · ' + eur(x.total) : '') + (x.producto ? ' · lo último: ' + x.producto : ''))),
        tel && CL.waPhone(tel) ? h('button.btn.sm.dm-wa', { type: 'button', title: 'Abre WhatsApp con el mensaje ya escrito. Lo envías tú.', onclick: () => abre(wa()) }, '💬 WhatsApp') : h('span.tiny.muted', tel ? 'teléfono no válido' : 'sin teléfono'),
        h('button.btn.sm.ghost.dm-copia', { type: 'button', onclick: () => copyText(mensajeVuelve(x.c, txt.value)) }, 'Copiar'));
    };
    mount(caja, h('h3', '💤 Recuperar clientes'), h('p.small.muted', { style: { margin: '0 0 8px' } }, 'Quien ya te compró es quien más fácil vuelve a comprar. Aquí están los que llevan tiempo sin hacerlo, con el mensaje ya escrito. El programa no envía nada solo: tú pulsas «enviar» en WhatsApp.'),
      h('div.in-chips', [30, 60, 90, 180].map(v => h('button.chip' + (dias === v ? '.on' : ''), { type: 'button', 'data-dias': v, onclick: () => { dias = v; LS.set('cd.dormidos17', String(v)); pinta(); } }, 'Más de ' + v + ' días'))),
      L.length ? [h('label.dm-l', h('span', 'El mensaje ({nombre} se cambia solo por el de cada cliente)'), txt), h('div.dm-lista', L.slice(0, 12).map(fila)), L.length > 12 ? h('p.tiny.muted', 'Y ' + (L.length - 12) + ' más. Empieza por estos: son los que más te han comprado.') : null]
        : h('p.dm-vacio', '👏 Ningún cliente lleva más de ' + dias + ' días sin comprar' + ((S.t.pedidos || []).length < 5 ? ' (todavía hay pocos pedidos).' : '.')));
  };
  pinta(); return caja;
}

// ---------- 🛰️ SALA DE CONTROL ----------
let sala = null;
export function salaControl() {
  if (sala) return sala;
  const izq = h('div.sc-izq'), der = h('div.sc-der'), reloj = h('div.sc-reloj'), cinta = h('div.sc-cinta'), centro = h('div.sc-centro');
  let N = numeros(), firma = '', tic = 0;
  const cierra = () => { if (!sala) return; clearInterval(tic); document.removeEventListener('keydown', tecla); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { } sala.remove(); sala = null; };
  const tecla = e => { if (e.key === 'Escape') cierra(); };
  const pinta = () => {
    const P = parte(), ab = vivos().map(o => ({ o, t: timing(o) || {} })).filter(x => x.t.abierto);
    reloj.textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const f = JSON.stringify([P.c, P.mes, (S.t.pedidos || []).length, (S.t.clientes || []).map(c => c.pais || '').join('').length]); if (f === firma) return; firma = f;
    mount(izq, h('h4', 'PEDIDOS EN MARCHA'), estados().filter(s => s.open && !s.cancelled).map(s => { const n = ab.filter(x => x.o.estado === s.k).length; return h('div.sc-est' + (n ? '.hay' : ''), { 'data-estado': s.k, style: '--c: ' + colorOk(s.c) }, h('b', String(n)), h('span', s.k)); }),
      h('div.sc-est.alerta' + (P.c.incidencias ? '.hay' : ''), { style: '--c: #ef4444' }, h('b', String(P.c.incidencias)), h('span', 'Incidencias')),
      h('div.sc-est.alerta' + (P.c.tarde ? '.hay' : ''), { style: '--c: #f97316' }, h('b', String(P.c.tarde)), h('span', 'Con retraso')));
    const ult = vivos().slice().sort((a, b) => String(b.creado || b.fecha || '').localeCompare(String(a.creado || a.fecha || ''))).slice(0, 6);
    const meta = P.plan, hoyP = vivos().filter(o => String(o.fecha || '').slice(0, 10) === P.hoy && !(timing(o) || {}).cancelado);
    mount(der, h('h4', 'HOY'), h('div.sc-hoy', h('b', String(hoyP.length)), h('span', hoyP.length === 1 ? 'pedido nuevo' : 'pedidos nuevos'), dinero() ? h('em', eur(Math.round(hoyP.reduce((a, o) => a + (Number(CL.orderTotal(o)) || 0), 0) * 100) / 100)) : null),
      dinero() ? [h('h4', 'ESTE MES'), h('div.sc-mes', h('b', eur(P.mes.ventas)), h('span', pl(P.mes.pedidos, 'pedido', 'pedidos') + (meta ? ' · ' + Math.round(meta.pct * 100) + ' % de ' + eur(P.meta) : '')), meta ? h('div.sc-barra', h('i', { style: { width: Math.round(meta.pct * 100) + '%' } })) : null)] : null,
      h('h4', 'ÚLTIMOS PEDIDOS'), h('div.sc-ult', ult.length ? ult.map(o => h('div.sc-ped', { style: '--c: ' + colorOk((estados().find(s => s.k === o.estado) || {}).c) }, h('i'), h('span.grow', h('b', 'nº ' + o.numero + ' · ' + String(o.cliente || '').split(/\s+/)[0]), h('small', (Number(o.cantidad) > 1 ? o.cantidad + ' × ' : '') + (o.producto || ''))), h('em', o.estado))) : h('p', 'Sin pedidos todavía.')));
    const N2 = numeros(); if (JSON.stringify(N2.paises) !== JSON.stringify(N.paises) || !centro.firstChild) { N = N2; mount(centro, planeta(N, () => { })); }
    const fr = [N.paises.length ? 'Vendes en ' + pl(N.paises.length, 'país', 'países') + ': ' + N.paises.slice(0, 5).map(q => (PAISES[q.k] || [q.k])[0] + ' (' + q.pedidos + ')').join(' · ') : 'Pon el país de tus clientes y el planeta se enciende', N.producto ? 'Lo que más sale: ' + N.producto[0] : '', N.diaSemana ? 'Tu mejor día: el ' + N.diaSemana : '', P.tareas[0][1]].filter(Boolean);
    mount(cinta, h('div.sc-cinta-t', fr.concat(fr).map(t => h('span', '◆ ' + t))));
  };
  sala = h('div.sala17', { role: 'dialog', 'aria-label': 'Sala de control' },
    h('div.sc-top', h('div.sc-tit', h('i', '🛰️'), h('b', 'SALA DE CONTROL'), h('span', (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || '')), reloj, h('button.sc-salir', { type: 'button', onclick: cierra, title: 'Salir (Esc)' }, '✕ Salir')),
    h('div.sc-cuerpo', izq, centro, der), cinta);
  document.body.appendChild(sala); document.addEventListener('keydown', tecla);
  try { const p = sala.requestFullscreen && sala.requestFullscreen(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
  pinta(); tic = setInterval(() => { if (!sala || !sala.isConnected) return cierra(); pinta(); }, 1000);
  return sala;
}
export const _sala = () => sala;
