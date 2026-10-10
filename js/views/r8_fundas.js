// ================= v20 · 📱 CelebriR8 · EL TALLER DE FUNDAS =================
// La dueña (9-10-2026), tras imprimir la funda del iPhone 14 en PLA y quedarle un poco grande: «líneas azules que señalen
// los ajustes que recomiendas tocar, un botón “🔧 Corregir ajuste” con preguntas sencillas, ver el valor actual, el
// recomendado y la diferencia antes de aplicar, poder deshacer, ver en 3D lo que cambia, una prueba pequeña antes de gastar
// filamento y guardar lo que funcione para ESE móvil y ESE material». Todo en español, sin código ni terminal.
// Las líneas azules son de verdad: salen del sitio de la funda en 3D y llegan al ajuste de la derecha que lo controla.
import { h, mount, btn, toast, confirmDlg } from '../ui.js';
import * as N from '../r8/nucleo.js';
import { crearEscena, miniatura } from '../r8/escena3d.js';
import { MOVILES } from '../r8/moviles.js';
import { funda, kitFunda, valoresFunda, anclasFunda, AJUSTE_FUNDA, LABIO, ALTO_EXTRA, ESTILOS_FUNDA, ajusteMedido, guardaAjusteMedido } from '../r8/fundas.js';
import { estimarGramos } from '../datos3d.js';

const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAT = { pla: 'PLA', petg: 'PETG', tpu: 'TPU' };
// Los ajustes de la funda que se ven en pantalla (son los MISMOS valores con los que se hace el STL)
const AJ = {
  holAncho: { t: 'Holgura lateral', u: 'mm por lado', min: -0.4, max: 0.6, paso: 0.05, d: 'El espacio que queda entre el móvil y los lados. Menos = más ajustada.' },
  ancho: { t: 'Ancho interior', u: 'mm', paso: 0.05, d: 'Para estrechar o ensanchar la funda (cambia la holgura lateral).', deriv: 1 },
  largo: { t: 'Largo interior', u: 'mm', paso: 0.05, d: 'Para ajustar el largo del móvil (arriba y abajo).', deriv: 1 },
  holLargo: { t: 'Holgura a lo largo', u: 'mm por lado', min: -0.4, max: 0.6, paso: 0.05, d: 'El espacio que queda arriba y abajo del móvil.' },
  radio: { t: 'Redondeo de esquinas', u: 'mm', min: 2, max: 16, paso: 0.5, d: 'Para que la esquina de la funda abrace la del móvil sin dejar hueco.' },
  prof: { t: 'Profundidad interior', u: 'mm de más', min: 0, max: 0.6, paso: 0.05, d: 'Lo que el hueco es más alto que el móvil. Si se mueve arriba y abajo, menos.' },
  labio: { t: 'Labio que sujeta', u: 'mm', min: 0.2, max: 1.6, paso: 0.1, d: 'Lo que la funda monta sobre la pantalla para que no se salga.' }
};
const F = { modelo: 'iPhone 14', material: 'pla', ajuste: 'estandar', estilo: 'liso', txt: '', cordon: false, v: null, deshacer: [], marcados: null, rec: null };

export async function montarFundas(el, ext = {}) {
  await N.cargar();
  const lienzo = h('canvas.fu-cv', { 'aria-label': 'La funda en 3D' }), lineas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  lineas.setAttribute('class', 'fu-lineas');
  const info = h('div.r8c-info'), barraVista = h('div.fu-vbar'), izq = h('div.fu-izq'), der = h('div.fu-der'), centro = h('div.fu-vista', lienzo, info, barraVista);
  const raiz = h('div.fu', izq, centro, der, lineas); el.appendChild(raiz);
  let escena = null; try { escena = crearEscena(lienzo, { cama: 256, dia: document.documentElement.getAttribute('data-modo') === 'dia' }); } catch (e) { mount(info, '⚠️ ' + e.message); }
  let vivo = true, tic = 0, actual = null, antes = null, comparar = false;
  const ponAntes = x => { if (antes && antes !== actual && antes !== x) N.suelta(antes); antes = x; };
  const p = () => Object.assign({ modelo: F.modelo, material: F.material, ajuste: F.ajuste, estilo: F.estilo, txt: F.txt, cordon: F.cordon }, F.v || {});
  const valores = () => valoresFunda(p());
  // al cambiar de móvil o de material se parte de lo recomendado (o de lo medido por ti, si ya lo guardaste)
  function partida() { const med = ajusteMedido(F.modelo, F.material); F.ajuste = med ? 'medido' : (F.ajuste === 'medido' ? 'estandar' : F.ajuste); const V = valoresFunda({ modelo: F.modelo, material: F.material, ajuste: F.ajuste }); F.v = { holAncho: V.holAncho, holLargo: V.holLargo, radio: V.radio, prof: V.prof, labio: V.labio }; F.deshacer = []; F.rec = null; }
  partida();

  // ---------- izquierda: móvil, material, estilo ----------
  function pintaIzq() {
    const marcas = [...new Set(MOVILES.map(m => m[0]))], med = ajusteMedido(F.modelo, F.material);
    mount(izq, h('div.fu-tit', h('b', '📱 Taller de fundas'), h('small', MOVILES.length + ' móviles con sus medidas oficiales')),
      h('label.r8e-c.col', h('span', 'Móvil'), h('select.inp', { 'data-k': 'modelo', onchange: e => { F.modelo = e.target.value; partida(); todo(); } }, marcas.map(mc => h('optgroup', { label: mc }, MOVILES.filter(m => m[0] === mc).map(m => h('option', { value: m[1], selected: F.modelo === m[1] }, m[1])))))),
      h('div.r8e-c.col', h('span', 'Material'), h('div.r8e-seg', Object.entries(MAT).map(([k, t]) => h('button' + (F.material === k ? '.on' : ''), { type: 'button', 'data-mat': k, onclick: () => { F.material = k; partida(); todo(); } }, t)))),
      med ? h('p.fu-medido', '✓ Tienes un ajuste MEDIDO para el ' + F.modelo + ' en ' + MAT[F.material] + ' (' + med.fecha + '). Es el que se usa.') : h('p.small.muted', 'Aún no has guardado un ajuste comprobado para este móvil en ' + MAT[F.material] + '. Prueba antes el kit (5 g).'),
      h('label.r8e-c.col', h('span', 'Estilo de la trasera'), h('select.inp', { 'data-k': 'estilo', onchange: e => { F.estilo = e.target.value; regenera(); pintaIzq(); } }, Object.entries(ESTILOS_FUNDA).map(([k, x]) => h('option', { value: k, selected: F.estilo === k }, x.t)))),
      (ESTILOS_FUNDA[F.estilo] || {}).texto || (ESTILOS_FUNDA[F.estilo] || {}).figura ? h('label.r8e-c.col', h('span', 'Nombre o figura'), h('input.inp', { value: F.txt, maxlength: 20, oninput: e => { F.txt = e.target.value; regenera(); } })) : null,
      h('label.check.r8e-c', h('input', { type: 'checkbox', checked: F.cordon, onchange: e => { F.cordon = e.target.checked; regenera(); } }), 'Anillas para colgante'),
      h('div.fu-acc', btn('🧪 Preparar prueba de ajuste', () => preparaKit(), { cls: 'primary fu-kit' }), btn('🖨️ Funda completa → Bambu', () => imprimir(false), { cls: 'fu-imprimir' })),
      h('p.tiny.muted', 'Primero la prueba (5 g, unos minutos). Cuando encaje, la funda completa.'));
  }
  // ---------- derecha: los ajustes reales ----------
  function pintaDer() {
    const V = valores(), m0 = MOVILES.find(m => m[1] === F.modelo) || [], recK = F.rec ? F.rec.cambios.map(c => c.k) : [];
    const marcados = F.rec ? recK : ['ancho', 'largo', 'holAncho', 'radio', 'prof'];
    const fila = k => {
      const A = AJ[k], azul = marcados.includes(k), valor = k === 'ancho' ? V.W + 2 * V.holAncho : k === 'largo' ? V.A + 2 * V.holLargo : V[k];
      const i = h('input.inp', { type: 'number', step: A.paso, value: Math.round(valor * 100) / 100, 'data-ajuste': k, 'aria-label': A.t });
      i.onchange = () => { const x = Number(String(i.value).replace(',', '.')); if (!isFinite(x) || Math.abs(x - valor) < 1e-6) return; setTimeout(() => cambia(k, x, 'a mano'), 0); }; // (después del «blur»: la lista se vuelve a pintar)
      const ref = k === 'ancho' ? 'móvil ' + n2(V.W) : k === 'largo' ? 'móvil ' + n2(V.A) : k === 'prof' ? 'hueco ' + n2(V.T + V.prof) + ' (móvil ' + n2(V.T) + ')' : '';
      return h('div.fu-aj' + (azul ? '.azul' : ''), { 'data-aj': k }, h('div.fu-aj-t', azul ? h('span.fu-punto', '🔵') : null, h('b', A.t)), h('div.fu-aj-v', i, h('small', A.u)), ref ? h('small.fu-ref', ref) : null, azul ? h('small.fu-expl', A.d) : null);
    };
    mount(der, h('div.fu-tit', h('b', '🎯 Ajustes de la funda'), h('small', F.modelo + ' · ' + MAT[F.material])),
      h('div.r8e-c.col', h('span', 'Ajuste rápido'), h('div.r8e-seg.fu-rapido', [['ajustada', 'Más ajustada'], ['estandar', 'Estándar'], ['holgada', 'Más holgada']].concat(ajusteMedido(F.modelo, F.material) ? [['medido', '✓ Medido']] : []).map(([k, t]) => h('button' + (F.ajuste === k ? '.on' : ''), { type: 'button', 'data-rapido': k, onclick: () => rapido(k) }, t)))),
      h('small.muted', 'En ' + MAT[F.material] + ': más ajustada ' + n2(AJUSTE_FUNDA[F.material].ajustada) + ' · estándar ' + n2(AJUSTE_FUNDA[F.material].estandar) + ' · más holgada ' + n2(AJUSTE_FUNDA[F.material].holgada) + ' mm por lado' + (F.material === 'tpu' ? ' (en TPU va más pequeña que el móvil: se estira y abraza).' : ' (tus holguras medidas).')),
      ['holAncho', 'ancho', 'largo', 'holLargo', 'radio', 'prof', 'labio'].map(fila),
      F.rec ? tarjetaRec() : null,
      h('div.fu-acc', btn('🔧 Corregir ajuste', () => corregir(), { cls: 'fu-corregir' }), btn('↶ Deshacer cambio', () => deshacer(), { cls: 'ghost fu-deshacer', disabled: !F.deshacer.length })),
      h('div.fu-acc', btn('✅ Me encaja: guardar para el ' + F.modelo + ' en ' + MAT[F.material], () => guardar(), { cls: 'fu-guardar' })),
      h('p.tiny.muted', 'Se guarda solo para ESTE móvil y ESTE material. Cada móvil tiene sus medidas y sus esquinas.'));
    requestAnimationFrame(pintaLineas);
  }
  // ---------- cambiar un ajuste (con deshacer) ----------
  function cambia(k, x, motivo) {
    const V = valores(), previo = Object.assign({}, F.v);
    if (k === 'ancho') { F.v.holAncho = Math.round((x - V.W) / 2 * 1000) / 1000; }
    else if (k === 'largo') { F.v.holLargo = Math.round((x - V.A) / 2 * 1000) / 1000; }
    else { const A = AJ[k]; F.v[k] = Math.max(A.min, Math.min(A.max, Math.round(x * 1000) / 1000)); }
    F.deshacer.push({ v: previo, motivo }); ponAntes(actual); comparar = true; F.ajuste = 'manual'; regenera(true); pintaDer(); pintaIzq();
  }
  function rapido(k) { const previo = Object.assign({}, F.v); F.ajuste = k; const V = valoresFunda({ modelo: F.modelo, material: F.material, ajuste: k }); F.v = { holAncho: V.holAncho, holLargo: V.holLargo, radio: V.radio, prof: V.prof, labio: V.labio }; F.deshacer.push({ v: previo, motivo: 'ajuste rápido' }); ponAntes(actual); comparar = true; regenera(true); pintaDer(); }
  function deshacer() { const u = F.deshacer.pop(); if (!u) return; F.v = u.v; F.rec = null; ponAntes(null); comparar = false; regenera(true); pintaDer(); toast('↶ Vuelto al valor anterior', 'ok'); }
  // ---------- 🔧 CORREGIR AJUSTE: preguntas sencillas → qué tocar, cuánto y por qué ----------
  function corregir() {
    const R = { lados: null, esquinas: null, arriba: null, todo: null }, cuerpo = h('div.fu-preg');
    const preg = (k, t, d) => h('div.aj-preg', h('b', t), d ? h('small', d) : null, h('div.aj-ops', [['si', 'Sí'], ['no', 'No']].map(([v, tt]) => h('button.aj-op' + (R[k] === v ? '.on' : ''), { type: 'button', 'data-p': k, 'data-v': v, onclick: () => { R[k] = v; pinta(); } }, h('span', tt)))));
    let m = null; const pinta = () => mount(cuerpo, preg('lados', '¿Te queda grande por los lados?', 'El móvil baila de izquierda a derecha.'), preg('esquinas', '¿Te sobra espacio en las esquinas?', 'Se ve un hueco entre la esquina del móvil y la de la funda.'), preg('arriba', '¿Se mueve hacia arriba y hacia abajo?', 'Se separa de la trasera o se sale por delante.'), preg('todo', '¿Queda demasiado holgada por todas partes?', 'Baila a lo ancho y a lo largo.'));
    pinta();
    import('../ui.js').then(({ modal }) => { m = modal('🔧 Corregir ajuste · ' + F.modelo + ' en ' + MAT[F.material], cuerpo, close => [btn('Cancelar', close, { cls: 'ghost' }), btn('Ver qué propongo', () => { close(); propone(R); }, { cls: 'primary fu-propone' })], { size: 'narrow' }); });
    return m;
  }
  function propone(R) {
    const V = valores(), A = AJUSTE_FUNDA[F.material], c = [];
    const baja = (k, cuanto, minimo) => Math.max(minimo, Math.round((V[k] - cuanto) * 1000) / 1000);
    if (R.todo === 'si') { c.push({ k: 'holAncho', a: V.holAncho, r: baja('holAncho', 0.05, A.ajustada - 0.05), por: 'Baila por todas partes: menos holgura a los lados…' }); c.push({ k: 'holLargo', a: V.holLargo, r: baja('holLargo', 0.05, A.ajustada - 0.05), por: '…y también a lo largo.' }); }
    else if (R.lados === 'si') c.push({ k: 'holAncho', a: V.holAncho, r: baja('holAncho', 0.05, A.ajustada - 0.05), por: 'La funda parece demasiado ancha: se reduce la holgura lateral (el ancho interior baja ' + n2(0.1) + ' mm).' });
    if (R.esquinas === 'si') c.push({ k: 'radio', a: V.radio, r: Math.min(16, V.radio + 1.5), por: 'La esquina de la funda es más «picuda» que la del móvil: más redondeo para que la abrace. Mejor aún: imprime las 4 esquinas del kit y elige.' });
    if (R.arriba === 'si') { c.push({ k: 'prof', a: V.prof, r: Math.max(0, Math.round((V.prof - 0.1) * 1000) / 1000), por: 'El hueco es más alto que el móvil: se ajusta la profundidad.' }); c.push({ k: 'labio', a: V.labio, r: Math.min(F.material === 'tpu' ? 1.6 : 0.9, Math.round((V.labio + 0.2) * 10) / 10), por: 'Y el labio monta un poco más sobre la pantalla para que no se salga.' }); }
    if (!c.length) { toast('Con esas respuestas no hay nada que cambiar. Si aun así no encaja, imprime la prueba de ajuste.', 'ok', 7000); return; }
    F.rec = { cambios: c.map(x => Object.assign(x, { dif: Math.round((x.r - x.a) * 1000) / 1000 })) };
    // vista previa: cómo quedaría (sin aplicar todavía)
    const prev = Object.assign({}, F.v); c.forEach(x => { F.v[x.k] = x.r; }); const nuevo = generar(); F.v = prev;
    ponAntes(actual); if (F.previa) N.suelta(F.previa); F.previa = nuevo; mostrar(nuevo, antes, true); pintaDer(); setTimeout(() => { const t = der.querySelector('.fu-rec'); if (t) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
    window.__r8fu = Object.assign(window.__r8fu || {}, { rec: F.rec });
  }
  function tarjetaRec() {
    return h('div.fu-rec', h('b', '🔵 Te propongo'), F.rec.cambios.map(x => h('div.fu-rec-c', { 'data-rec': x.k }, h('b', AJ[x.k].t), h('small', x.por),
      h('div.fu-tres', h('div', h('span', 'Ahora'), h('b', n2(x.a))), h('div', h('span', 'Recomendado'), h('b', n2(x.r))), h('div', h('span', 'Diferencia'), h('b', (x.dif > 0 ? '+' : '') + n2(x.dif)))))),
      h('small.muted', 'En la vista: lo AZUL es lo que cambia. Gris transparente = la funda de antes.'),
      h('div.fu-acc', btn('✓ Aplicar cambio', () => { const previo = Object.assign({}, F.v); F.rec.cambios.forEach(x => { F.v[x.k] = x.r; }); F.deshacer.push({ v: previo, motivo: 'corrección' }); F.ajuste = 'manual'; F.rec = null; comparar = true; regenera(true); pintaDer(); toast('✓ Cambio aplicado. Puedes deshacerlo cuando quieras.', 'ok'); }, { cls: 'primary fu-aplicar' }), btn('Descartar', () => { F.rec = null; mostrar(actual, null); pintaDer(); }, { cls: 'ghost' })));
  }
  // ---------- generar y enseñar ----------
  function generar() { return N.guarda(funda(p())); }
  function regenera(ya) { clearTimeout(tic); tic = setTimeout(() => { try { const n = generar(); if (actual && actual !== antes) N.suelta(actual); actual = n; mostrar(actual, comparar ? antes : null); } catch (e) { mount(info, h('span.r8e-mal', '⚠️ ' + (e.message || e))); } finally { N.limpia(); } }, ya ? 0 : 160); }
  function mostrar(nuevo, viejo, esPrevia) {
    if (!escena || !nuevo) return;
    const L = [{ id: 'funda', vista: N.aVista(nuevo), color: '#1b1b1d', acabado: 'mate' }];
    if (viejo) { L.push({ id: 'antes', vista: N.aVista(viejo), color: '#b8bec4', fantasma: 1 }); try { const dif = N.union([nuevo.subtract(viejo), viejo.subtract(nuevo)]); if (!dif.isEmpty()) L.push({ id: 'cambia', vista: N.aVista(dif), color: '#1e7bff', resalta: 1 }); } catch (e) { } }
    escena.ponPartes(L); if (!mostrar.ya) { escena.encuadrar('iso'); mostrar.ya = true; }
    const V = valores(), I = N.info(nuevo), g = estimarGramos(I.vol, I.area, { relleno: 15 }) || 0;
    mount(info, h('span', 'Hueco ' + n2(V.W + 2 * V.holAncho) + ' × ' + n2(V.A + 2 * V.holLargo) + ' × ' + n2(V.T + V.prof) + ' mm'), h('span', '≈ ' + Math.round(g) + ' g'), esPrevia ? h('span.fu-previa', '👁 Vista previa (sin aplicar)') : null);
    mount(barraVista, viejo || antes ? btn(comparar || esPrevia ? '🔀 Ocultar la de antes' : '🔀 Comparar con la de antes', () => { comparar = !comparar; mostrar(actual, comparar ? antes : null); }, { cls: 'sm' }) : null);
    window.__r8fu = { modelo: F.modelo, material: F.material, v: Object.assign({}, F.v), hueco: [V.W + 2 * V.holAncho, V.A + 2 * V.holLargo, V.T + V.prof], vol: I.vol, rec: F.rec, previa: !!esPrevia };
    N.limpia(); requestAnimationFrame(pintaLineas);
  }
  // ---------- las LÍNEAS AZULES: del sitio de la funda (en 3D) al ajuste de la derecha ----------
  function pintaLineas() {
    if (!vivo || !escena) return;
    while (lineas.firstChild) lineas.removeChild(lineas.firstChild);
    const rr = raiz.getBoundingClientRect(), rc = lienzo.getBoundingClientRect(), A = anclasFunda(p()), keys = [...der.querySelectorAll('.fu-aj.azul')];
    lineas.setAttribute('width', rr.width); lineas.setAttribute('height', rr.height); lineas.setAttribute('viewBox', '0 0 ' + rr.width + ' ' + rr.height);
    const NS = 'http://www.w3.org/2000/svg', el2 = (t, a) => { const e = document.createElementNS(NS, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); lineas.appendChild(e); return e; };
    keys.forEach(fil => {
      const k = fil.dataset.aj, a = A[k === 'ancho' ? 'ancho' : k]; if (!a) return; const s = escena.aPantalla(a); if (!s.delante) return;
      const x0 = rc.left - rr.left + s.x, y0 = rc.top - rr.top + s.y, f = fil.getBoundingClientRect(), x1 = f.left - rr.left - 4, y1 = f.top - rr.top + Math.min(f.height / 2, 18);
      if (y1 < 0 || y1 > rr.height || x0 < rc.left - rr.left || x0 > rc.right - rr.left) return;
      const mx = x0 + (x1 - x0) * 0.6;
      el2('path', { d: 'M' + x0 + ',' + y0 + ' C' + mx + ',' + y0 + ' ' + mx + ',' + y1 + ' ' + x1 + ',' + y1, class: 'fu-linea' + (F.rec ? ' fuerte' : '') });
      el2('circle', { cx: x0, cy: y0, r: 5, class: 'fu-ancla' }); el2('circle', { cx: x1, cy: y1, r: 3, class: 'fu-fin' });
    });
  }
  if (escena) escena.alDibujar = () => requestAnimationFrame(pintaLineas);
  der.addEventListener('scroll', () => requestAnimationFrame(pintaLineas));
  const ro = window.ResizeObserver ? new ResizeObserver(() => requestAnimationFrame(pintaLineas)) : null; if (ro) ro.observe(raiz);
  // ---------- guardar lo que funciona ----------
  async function guardar() {
    if (!(await confirmDlg('Guardar el ajuste', '¿Lo has probado y el ' + F.modelo + ' encaja bien en ' + MAT[F.material] + '? Se guardará solo para este móvil y este material.', 'Sí, encaja: guardarlo'))) return;
    const V = valores(); guardaAjusteMedido(F.modelo, F.material, { holAncho: V.holAncho, holLargo: V.holLargo, radio: V.radio, prof: V.prof, labio: V.labio });
    F.ajuste = 'medido'; toast('✅ Guardado: el ' + F.modelo + ' en ' + MAT[F.material] + ' usará este ajuste', 'ok', 6000); pintaIzq(); pintaDer();
  }
  // ---------- 🧪 la prueba pequeña ----------
  async function preparaKit() {
    let K;
    try { K = kitFunda(p()); } catch (e) { N.limpia(); return toast(e.message, 'bad'); }
    const I = N.info(K), g = estimarGramos(I.vol, I.area, { relleno: 100 }) || I.vol / 1000 * 1.24, capas = I.dims[2] / 0.2, seg = I.vol / 9 + capas * 3, mins = [Math.max(5, Math.round(seg / 60)), Math.round(seg * 1.8 / 60)];
    const partes = K.partes.map(x => ({ m: N.guarda(x.m), color: x.t.startsWith('clip') ? '#1e7bff' : '#f7d117', nombre: x.t })); const radios = K.radios, clips = K.clips; N.limpia();
    const { modal } = await import('../ui.js'), cuerpo = h('div.r8c-aj');
    modal('🧪 Prueba de ajuste · ' + F.modelo + ' en ' + MAT[F.material], cuerpo, null, { size: 'wide' });
    mount(cuerpo, h('div.fu-kitinfo', h('div', h('span', 'Filamento'), h('b', '≈ ' + n2(g).replace(/,00$/, '') + ' g')), h('div', h('span', 'Tiempo'), h('b', '≈ ' + mins[0] + '–' + mins[1] + ' min')), h('small', 'ESTIMADO. La funda entera gasta unos ' + Math.round(estimarGramos(N.info(funda(p())).vol, 0, { relleno: 15 }) || 0) + ' g.')),
      h('ol.fu-pasos', h('li', 'Imprime el kit en tu ', h('b', MAT[F.material]), ' de siempre (de pie, como sale; sin soportes).'),
        h('li', h('b', '3 clips'), ' (azules en la vista): mételos por ABAJO del móvil y súbelos hasta la mitad. Puntos detrás: ', h('b', '•'), ' ' + n2(clips[0]) + ' · ', h('b', '••'), ' ' + n2(clips[1]) + ' · ', h('b', '•••'), ' ' + n2(clips[2]) + ' mm por lado. Quédate con el que entra sin forzar y no baila.'),
        h('li', h('b', '4 esquinas'), ' (amarillas): ponlas en una esquina del móvil. Puntos: ' + radios.map((r, i) => '•'.repeat(i + 1) + ' ' + n2(r)).join(' · ') + ' mm de redondeo. Quédate con la que no deja hueco.'),
        h('li', 'Vuelve aquí y dime cuál: lo pongo y lo guardas.')),
      h('div.fu-elige', h('b', '¿Cuál te ha encajado?'), h('div.aj-ops', clips.map((c, i) => h('button.aj-op', { type: 'button', 'data-clip': i + 1, onclick: e => { cuerpo.querySelectorAll('[data-clip]').forEach(b => b.classList.toggle('on', b === e.currentTarget)); cuerpo.dataset.clip = c; } }, h('span', '•'.repeat(i + 1) + ' clip'), h('small', n2(c) + ' mm')))),
        h('div.aj-ops', radios.map((r, i) => h('button.aj-op', { type: 'button', 'data-esq': i + 1, onclick: e => { cuerpo.querySelectorAll('[data-esq]').forEach(b => b.classList.toggle('on', b === e.currentTarget)); cuerpo.dataset.esq = r; } }, h('span', '•'.repeat(i + 1) + ' esquina'), h('small', 'radio ' + n2(r))))),
        btn('Poner estos valores en la funda', () => { const c = Number(cuerpo.dataset.clip), r = Number(cuerpo.dataset.esq); if (!isFinite(c) && !isFinite(r)) return toast('Toca primero el clip y la esquina que te han encajado.', 'warn'); const previo = Object.assign({}, F.v); if (isFinite(c)) { F.v.holAncho = c; F.v.holLargo = c; } if (isFinite(r)) F.v.radio = r; F.deshacer.push({ v: previo, motivo: 'kit' }); F.ajuste = 'manual'; ponAntes(actual); comparar = true; regenera(true); pintaDer(); toast('Puesto. Si te gusta, pulsa «✅ Me encaja: guardar».', 'ok', 7000); }, { cls: 'primary fu-ponkit' })),
      h('div.fu-kitdesc'));
    const asis = h('div'); cuerpo.appendChild(asis);
    const A = await import('../r8/consejos3d.js'), d = await import('../desktop.js').catch(() => null);
    A.asistente(asis, { clave: 'kitfunda', partes: () => partes.map(x => ({ m: x.m, color: x.color, nombre: x.nombre })), N, uso: 'encaje', texto: false, nombre: 'prueba_funda_' + F.modelo.replace(/\W+/g, '_') + '_' + F.material, baja, cama: 256, desktopAbrir: !!(d && d.desktop && d.desktop.on) });
    window.__r8fu = Object.assign(window.__r8fu || {}, { kit: { g, mins, piezas: partes.length } });
  }
  async function imprimir() {
    let m; try { m = funda(p()); } catch (e) { N.limpia(); return toast(e.message, 'bad'); }
    const { modal } = await import('../ui.js'), cuerpo = h('div.r8c-aj'); modal('🖨️ Funda ' + F.modelo + ' · preparar para tu Bambu', cuerpo, null, { size: 'wide' });
    const A = await import('../r8/consejos3d.js'), d = await import('../desktop.js').catch(() => null);
    A.asistente(cuerpo, { clave: 'funda_' + F.material, partes: () => [{ m: funda(p()), color: '#1b1b1d', nombre: 'funda ' + F.modelo }], N, uso: F.material === 'tpu' ? 'flexible' : 'encaje', texto: !!F.txt, nombre: 'funda_' + F.modelo.replace(/\W+/g, '_') + '_' + F.material, baja, cama: 256, desktopAbrir: !!(d && d.desktop && d.desktop.on) });
    void m; N.limpia();
  }
  function baja(blob, nombre) { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); window.__r8fu = Object.assign(window.__r8fu || {}, { bajado: { nombre, bytes: blob.size } }); }
  function todo() { pintaIzq(); pintaDer(); ponAntes(null); comparar = false; regenera(true); }
  todo();
  window.__r8fuApi = { cambia, propone, rapido, deshacer, guardar: () => { const V = valores(); guardaAjusteMedido(F.modelo, F.material, { holAncho: V.holAncho, holLargo: V.holLargo, radio: V.radio, prof: V.prof, labio: V.labio }); }, F, valores, preparaKit };
  return { destroy() { vivo = false; clearTimeout(tic); if (ro) ro.disconnect(); if (escena) escena.destruir(); if (actual) N.suelta(actual); if (antes) N.suelta(antes); delete window.__r8fuApi; } };
}
