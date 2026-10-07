// ================= v17 · EL REGALO: tres funciones nuevas =================
//  🎨 COLORES · 8 paletas: todo el programa (menú, cabeceras, botones) cambia de color al instante. Se guarda en cada aparato.
//  🧠 PLAN DE IMPRESIÓN · «¿qué imprimo ahora?»: ordena lo pendiente por fecha de entrega, junta los del mismo color para cambiar
//     menos de bobina, reparte entre tus impresoras, dice cuándo acaba cada pieza, cuál NO llega a tiempo y qué filamento falta.
//     Todo sale de tus pedidos, tus tiempos (Materiales y costes) y tus bobinas. Lo que no se sabe no se inventa: se dice.
//  🗓️ CALENDARIO DE ENTREGAS (views/calendario.js) · el mes entero con cada pedido en su día límite, del color de su estado.
// Y la tarjeta de bienvenida del Inicio (🎂 el 8 de octubre, 🎁 el resto de días), que se quita al abrir el regalo.
import { h, btn, modal, mount, toast, copyText } from './ui.js';
import { S, byId, timing, can, APP_VERSION } from './store.js';

const CL = window.CL;
const LS = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };

// ---------- 🎨 Colores ----------
export const PALETAS = [
  { k: '', n: 'Violeta', d: 'El de siempre', c: ['#7c3aed', '#6d28d9', '#efe7ff', '#ec4899', '#06b6d4'] },
  { k: 'oceano', n: 'Océano', d: 'Azules de mar', c: ['#0284c7', '#0369a1', '#e0f2fe', '#22d3ee', '#6366f1'] },
  { k: 'bosque', n: 'Bosque', d: 'Verdes tranquilos', c: ['#059669', '#047857', '#d1fae5', '#84cc16', '#14b8a6'] },
  { k: 'atardecer', n: 'Atardecer', d: 'Naranja y coral', c: ['#ea580c', '#c2410c', '#ffedd5', '#f43f5e', '#f59e0b'] },
  { k: 'fresa', n: 'Fresa', d: 'Rojo y rosa', c: ['#e11d48', '#be123c', '#ffe4e6', '#fb7185', '#a855f7'] },
  { k: 'caramelo', n: 'Caramelo', d: 'Miel y canela', c: ['#b45309', '#92400e', '#fef3c7', '#f59e0b', '#ef4444'] },
  { k: 'medianoche', n: 'Medianoche', d: 'Índigo profundo', c: ['#4f46e5', '#4338ca', '#e0e7ff', '#8b5cf6', '#0ea5e9'] },
  { k: 'menta', n: 'Menta', d: 'Fresco y limpio', c: ['#0d9488', '#0f766e', '#ccfbf1', '#34d399', '#38bdf8'] }
];
export const colorActual = () => { const k = LS.get('cd.color'); return PALETAS.some(p => p.k === k) ? k : ''; };
export function aplicarColor(k) {
  const p = PALETAS.find(x => x.k === k) || PALETAS[0], st = document.documentElement.style, oscuro = /oscuro|bio/.test(document.documentElement.dataset.theme || '');
  const V = ['--brand', '--brand-2', '--brand-soft', '--u-b', '--u-c'];
  if (!p.k) { V.concat('--focus').forEach(v => st.removeProperty(v)); document.documentElement.removeAttribute('data-color'); }
  else { V.forEach((v, i) => { if (v === '--brand-soft' && oscuro) st.removeProperty(v); else st.setProperty(v, p.c[i]); }); st.setProperty('--focus', '0 0 0 3px ' + p.c[0] + '55'); document.documentElement.setAttribute('data-color', p.k); }
  LS.set('cd.color', p.k);
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', p.c[0]);
}
export function muestras(alElegir) {
  const caja = h('div.c17-paletas');
  const pinta = () => mount(caja, PALETAS.map(p => { const b = h('button.c17-paleta' + (colorActual() === p.k ? '.on' : ''), { type: 'button', 'data-color': p.k || 'violeta', title: p.n + ' · ' + p.d, 'aria-pressed': colorActual() === p.k ? 'true' : 'false', onclick: () => { aplicarColor(p.k); pinta(); if (alElegir) alElegir(p); } },
    h('i'), h('b', p.n), h('small', p.d)); b.firstChild.style.background = 'linear-gradient(135deg, ' + p.c[0] + ' 0%, ' + p.c[3] + ' 60%, ' + p.c[4] + ' 100%)'; return b; }));
  pinta(); return caja;
}
export function dialogoColores() {
  return modal('🎨 Colores del programa', h('div.col', h('p.small.muted', { style: { margin: 0 } }, 'Toca uno y cambia todo al momento: el menú, las cabeceras y los botones. Se guarda en este aparato (cada persona puede tener el suyo).'), muestras()), close => [btn('Listo', close, { cls: 'primary' })], { size: 'wide', noFocus: true });
}

// ---------- 🧠 Plan de impresión ----------
const fase = o => CL.phaseOf(S.cfg.pedidos, o.estado);
const colorDe = o => String(o.color || '').split(/\s*[+·,]\s*/)[0].replace(/^\d+\s*[×x]\s*/i, '').trim();
export function planImpresion(ahora = Date.now()) {
  const L = (S.t.pedidos || []).filter(o => !o.eliminado && !o.archivado && ['confirmado', 'impresion'].includes(fase(o)));
  const calc = o => { const p = o.productoId ? byId('productos', o.productoId) : null, n = CL.norm(p ? p.nombre : o.producto); return (S.t.calculadora || []).find(c => CL.norm(c.nombre) === n) || null; };
  const items = L.map(o => { const c = calc(o), q = Math.max(1, Number(o.cantidad) || 1), t = timing(o) || {};
    return { o, q, horas: c && Number(c.horas) > 0 ? Number(c.horas) * q : null, gramos: c && Number(c.gramos) > 0 ? Number(c.gramos) * q : null, color: colorDe(o), limite: t.limite || '', imprimiendo: fase(o) === 'impresion' }; });
  // primero lo que ya se está imprimiendo; luego por fecha límite (sin fecha, al final) y, dentro del mismo día, juntos los del mismo color
  items.sort((a, b) => (b.imprimiendo - a.imprimiendo) || String(a.limite || '9').localeCompare(String(b.limite || '9')) || CL.norm(a.color).localeCompare(CL.norm(b.color)) || String(a.o.numero).localeCompare(String(b.o.numero)));
  const nImp = Math.max(1, (S.t.impresoras || []).filter(i => i.activa !== false && String(i.activa).toLowerCase() !== 'no').length);
  const libre = Array(nImp).fill(ahora), ult = Array(nImp).fill(''); let cambios = 0;
  items.forEach(it => { if (!it.horas) return; let k = 0; libre.forEach((t, i) => { if (t < libre[k]) k = i; });
    // si otra impresora libre a la vez ya tiene ese color puesto, mejor esa (un cambio de bobina menos)
    libre.forEach((t, i) => { if (t <= libre[k] + 600000 && it.color && CL.norm(ult[i]) === CL.norm(it.color)) k = i; });
    it.impresora = k + 1; it.empieza = libre[k]; it.acaba = libre[k] + it.horas * 3600000; libre[k] = it.acaba;
    if (it.color) { if (ult[k] && CL.norm(ult[k]) !== CL.norm(it.color)) cambios++; ult[k] = it.color; }
    it.llega = it.limite ? it.acaba <= new Date(it.limite + 'T23:59:59').getTime() : null; });
  const need = {}; items.forEach(it => { if (it.gramos && it.color) { const k = CL.norm(it.color); (need[k] = need[k] || { color: it.color, g: 0 }).g += it.gramos; } });
  const hay = {}; (S.t.bobinas || []).forEach(b => { if (b.estado === 'Agotada') return; const k = CL.norm(b.color); hay[k] = (hay[k] || 0) + Math.max(0, Number(b.restante) || 0); });
  const falta = Object.keys(need).filter(k => (hay[k] || 0) < need[k].g).map(k => ({ color: need[k].color, necesita: Math.round(need[k].g), hay: Math.round(hay[k] || 0) }));
  return { items, impresoras: nImp, cambios, falta, horas: Math.round(items.reduce((s, it) => s + (it.horas || 0), 0) * 10) / 10, fin: Math.max.apply(null, libre), sinTiempo: items.filter(it => !it.horas).length, tarde: items.filter(it => it.llega === false).length };
}
const hTxt = hh => { const m = Math.round(hh * 60); return m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min'; };
const cuando = ms => { const d = new Date(ms), hoy = new Date(), man = new Date(Date.now() + 86400000), dia = d.toDateString() === hoy.toDateString() ? 'hoy' : d.toDateString() === man.toDateString() ? 'mañana' : d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }); return dia + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };
export function textoPlan(P) {
  return ['PLAN DE IMPRESIÓN · ' + P.items.length + ' pedidos · ' + hTxt(P.horas) + ' · ' + P.impresoras + (P.impresoras === 1 ? ' impresora' : ' impresoras')].concat(
    P.items.map((it, i) => (i + 1) + '. nº ' + it.o.numero + ' · ' + (it.q > 1 ? it.q + ' × ' : '') + it.o.producto + (it.color ? ' · ' + it.color : '') + (it.horas ? ' · ' + hTxt(it.horas) + ' · acaba ' + cuando(it.acaba) + (it.llega === false ? ' · NO LLEGA' : '') : ' · sin tiempo apuntado') + (it.limite ? ' · entrega ' + it.limite.split('-').reverse().slice(0, 2).join('/') : ''))).join('\n');
}
export function dialogoPlan() {
  const P = planImpresion(), go = k => import('./app.js').then(A => A.go(k));
  const chip = (t, c) => h('span.p17-chip' + (c ? '.' + c : ''), t);
  let m = null;
  const cuerpo = !P.items.length ? h('div.p17-vacio', h('div', '🎉'), h('b', 'No hay nada esperando para imprimir'), h('p.muted', 'Cuando entre un pedido confirmado, aquí verás en qué orden conviene imprimirlo.'))
    : h('div.col', { style: { gap: '12px' } },
      h('div.p17-resumen', chip('📦 ' + P.items.length + (P.items.length === 1 ? ' pedido' : ' pedidos')), P.horas ? chip('⏱ ' + hTxt(P.horas) + ' de impresión') : null, P.horas ? chip('🏁 acaba ' + cuando(P.fin)) : null, chip('🖨️ ' + P.impresoras + (P.impresoras === 1 ? ' impresora' : ' impresoras')), P.cambios ? chip('🔁 ' + P.cambios + (P.cambios === 1 ? ' cambio de color' : ' cambios de color')) : null,
        P.tarde ? chip('⚠️ ' + P.tarde + (P.tarde === 1 ? ' no llega a tiempo' : ' no llegan a tiempo'), 'mal') : P.horas ? chip('✅ todo llega a tiempo', 'bien') : null),
      P.falta.length ? h('div.p17-falta', h('b', '🧵 Filamento que no te llega:'), P.falta.map(f => h('div', f.color + ': hacen falta ' + f.necesita + ' g y quedan ' + f.hay + ' g'))) : null,
      h('div.p17-lista', P.items.map((it, i) => { const dot = h('i.p17-dot'); import('./colores.js').then(C => { const hx = C.hexDe(it.color); if (hx && !/^(multi|marmol|transparent)$/.test(hx)) dot.style.background = hx; }).catch(() => { });
        return h('button.p17-fila' + (it.llega === false ? '.mal' : '') + (it.imprimiendo ? '.ya' : ''), { type: 'button', 'data-pedido': it.o.id, onclick: () => { if (m) m.close(); go('pedidos/' + it.o.id); } },
          h('span.p17-n', it.imprimiendo ? '🖨️' : String(i + 1)), dot,
          h('span.grow', h('b', (it.q > 1 ? it.q + ' × ' : '') + it.o.producto), h('small', 'nº ' + it.o.numero + ' · ' + (it.o.cliente || '') + (it.color ? ' · ' + it.color : ''))),
          h('span.p17-t', it.horas ? h('b', hTxt(it.horas)) : h('b.muted', 'sin tiempo'), h('small', it.horas ? (P.impresoras > 1 ? 'imp. ' + it.impresora + ' · ' : '') + 'acaba ' + cuando(it.acaba) : 'PENDIENTE')),
          h('span.p17-e', it.limite ? (it.llega === false ? '⚠️ entrega ' : '📅 ') + it.limite.split('-').reverse().slice(0, 2).join('/') : 'sin fecha')); })),
      h('p.tiny.muted', { style: { margin: 0 } }, 'ESTIMADO: cuenta desde ahora, con las impresoras sin parar y los tiempos apuntados en «Materiales y costes».' + (P.sinTiempo ? ' ' + P.sinTiempo + (P.sinTiempo === 1 ? ' pedido no tiene' : ' pedidos no tienen') + ' tiempo apuntado: no se inventa, apúntalo en su producto.' : '')));
  m = modal('🧠 Plan de impresión · ¿qué imprimo ahora?', cuerpo, close => [P.items.length ? btn('📋 Copiar el plan', () => copyText(textoPlan(P)), { cls: 'ghost' }) : null, btn('Cerrar', close, { cls: 'primary' })], { size: 'wide', noFocus: true });
  return m;
}

// ---------- 🎁 El regalo y la tira del Inicio ----------
const esCumple = () => { const d = new Date(); return d.getMonth() === 9 && d.getDate() === 8; };
const regaloVisto = () => LS.get('cd.regalo17') === '1';
export function regalo17(alCerrar) {
  LS.set('cd.regalo17', '1');
  import('./premium.js').then(P => P.confeti({ n: 260, ms: 4200 })).catch(() => { });
  const yo = ((S.me && S.me.nombre) || '').split(' ')[0], go = k => import('./app.js').then(A => A.go(k));
  let m = null; const cierra = () => { if (m) m.close(); };
  const teja = (ic, t, d, b, f) => h('div.r17-teja', h('i', ic), h('b', t), h('span', d), btn(b, f, { cls: 'sm primary' }));
  m = modal(esCumple() ? '🎂 ¡Feliz cumpleaños' + (yo ? ', ' + yo : '') + '!' : '🎁 Tu regalo: la versión 17', h('div.r17',
    h('p.r17-txt', esCumple() ? 'Hoy el regalo es para ti: CelebriDiseños 17. Tres cosas nuevas para que el taller se vea y funcione como te mereces. Empieza por elegir tu color 👇' : 'CelebriDiseños 17 trae tres cosas nuevas. Empieza por elegir tu color 👇'),
    muestras(),
    h('div.r17-tejas',
      teja('🧠', 'Plan de impresión', 'Te dice qué imprimir ahora, en qué orden, cuándo acaba y qué no llega a tiempo.', 'Verlo', () => { cierra(); dialogoPlan(); }),
      teja('🗓️', 'Calendario de entregas', 'Todo el mes de un vistazo: cada pedido en su día, del color de su estado.', 'Abrirlo', () => { cierra(); go('calendario'); }),
      teja('🎨', 'Colores', 'Ocho paletas. El programa entero cambia al momento, en cada aparato a su gusto.', 'Ya lo estás viendo', () => { }))),
    close => [btn(esCumple() ? '¡Gracias! 🥳' : 'A trabajar 🚀', close, { cls: 'primary' })], { size: 'wide', noFocus: true, onclose: () => { if (alCerrar) alCerrar(); } });
  return m;
}
export function tira17(redibuja) {
  const go = k => import('./app.js').then(A => A.go(k));
  const P = can('pedidos.ver') ? planImpresion() : { items: [], horas: 0, tarde: 0 };
  const hoy = S.hoy || new Date().toISOString().slice(0, 10), en7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const semana = (S.t.pedidos || []).filter(o => { if (o.eliminado || o.archivado) return false; const t = timing(o) || {}; return t.abierto && t.limite && t.limite <= en7; });
  const tarde = semana.filter(o => (timing(o) || {}).limite < hoy).length;
  const pal = PALETAS.find(p => p.k === colorActual()) || PALETAS[0];
  const teja = (cls, ic, t, s, f) => h('button.t17-teja.' + cls, { type: 'button', onclick: f }, h('i', ic), h('span', h('b', t), h('small', s)));
  return h('section.t17', { 'aria-label': 'Novedades de la versión ' + APP_VERSION },
    regaloVisto() ? null : h('div.t17-regalo', h('div.t17-r-ic', esCumple() ? '🎂' : '🎁'), h('div.grow', h('b', esCumple() ? '¡Feliz cumpleaños! Tienes un regalo' : 'Tienes un regalo: la versión 17'), h('span', 'Tres funciones nuevas y el programa en el color que tú quieras.')), btn('Abrir mi regalo', () => regalo17(redibuja), { cls: 'primary t17-abrir' })),
    h('div.t17-tejas',
      can('pedidos.ver') ? teja('plan', '🧠', 'Plan de impresión', P.items.length ? P.items.length + (P.items.length === 1 ? ' pedido' : ' pedidos') + (P.horas ? ' · ' + hTxt(P.horas) : '') + (P.tarde ? ' · ⚠️ ' + P.tarde + ' no llega' + (P.tarde === 1 ? '' : 'n') : '') : 'Nada esperando para imprimir', () => dialogoPlan()) : null,
      can('pedidos.ver') ? teja('cal', '🗓️', 'Calendario de entregas', semana.length ? semana.length + ' en 7 días' + (tarde ? ' · ⚠️ ' + tarde + ' con retraso' : '') : 'Sin entregas en 7 días', () => go('calendario')) : null,
      teja('col', '🎨', 'Colores', 'Ahora: ' + pal.n + ' · tócalo para cambiar', () => { const d = dialogoColores(); const obs = new MutationObserver(() => { if (!document.body.contains(d.el)) { obs.disconnect(); if (redibuja) redibuja(); } }); obs.observe(document.body, { childList: true, subtree: true }); })));
}
aplicarColor(colorActual()); // al cargar: el color elegido en este aparato
