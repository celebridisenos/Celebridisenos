// ================= v20 · 📏 CelebriR8 PRECISION LAB · REPUESTOS CON MEDIDAS REALES =================
// «Un espacio para diseñar repuestos con fotografías, dimensiones conocidas y referencias del original» (la dueña,
// 10-10-2026). Aquí la pieza se construye con GEOMETRÍA DE CAD a partir de TUS medidas, no con una IA de fotos:
//  · cada medida dice de dónde sale: ✍️ la has puesto tú · 🧮 se calcula (con su fórmula) · ≈ valor de partida que hay que
//    confirmar · 📋 ejemplo · ❓ FALTA (en rojo: no se inventa; sin ella no se construye la pieza);
//  · se ve en 3D con sus COTAS y se puede poner encima una FOTO del original para compararla (a ojo: no es una medición);
//  · se avisa de lo que no casa (módulos distintos, paredes imposibles, agujeros que se salen…) y, si son dos piezas, se
//    hace el MONTAJE VIRTUAL: se colocan juntas y se mide si chocan;
//  · cada repuesto lleva su PRUEBA DE ENCAJE pequeña y nunca se promete que funcione sin probarlo;
//  · las medidas se guardan en «Mis repuestos» para cambiarlas otro día; se exporta STL o 3MF o se manda al Print Doctor.
import { h, mount, btn, toast, confirmDlg } from '../ui.js';
import * as E from '../r8/estado.js';
import * as C from '../r8/comun.js';

const LIB = 'cd.r8.precision.lib';
const leeLib = () => { try { return JSON.parse(localStorage.getItem(LIB) || '[]'); } catch (e) { return []; } };
const guardaLib = L => { try { localStorage.setItem(LIB, JSON.stringify(L.slice(0, 80))); } catch (e) { toast('No he podido guardar en este aparato: ' + e.message, 'bad'); } };
const EST = { tuya: ['✍️', 'La has puesto tú'], estimada: ['≈', 'Valor de partida: confírmalo (pulsa ✓) o cámbialo'], ejemplo: ['📋', 'Es de un ejemplo: cámbiala por la tuya'], falta: ['❓', 'FALTA: mídela y escríbela'] };

export async function montarPrecision(el, ext = {}) {
  const N = await import('../r8/nucleo.js'); await N.cargar();
  const R = await import('../r8/repuestos.js');
  const lienzo = h('canvas.r8p-cv', { 'aria-label': 'El repuesto en 3D con sus medidas' }), etiquetas = h('div.r8pr-cotas'), capaFoto = h('div.r8pr-foto'), vbar = h('div.r8p-vbar'), vacio = h('div.r8p-vacio');
  const izq = h('div.r8p-izq.r8pr-izq'), der = h('div.r8p-der.r8pr-der');
  const bCal = h('button.r8pr-cal', { type: 'button', title: 'Comprobar tu calibre e imprimir/medir la probeta: luego tus piezas salen corregidas solas', onclick: () => import('../r8/calibracion_ui.js').then(m => m.abrir()) }, '🎯 Calibrar calibre e impresora'); // v20.4
  const raiz = h('div.r8p.r8pr', izq, h('div.r8p-vista.r8pr-vista', lienzo, capaFoto, etiquetas, vacio, vbar, bCal), der);
  el.appendChild(raiz);
  let esc = null; try { esc = await C.vista3d(lienzo); } catch (e) { }
  const S = Object.assign({ id: null, nombre: '' }, R.nuevo(guardadoTipo()), { avisos: [], calc: [], choque: null, info: null, faltan: [], kitG: null, foto: null, fotoOp: 0.5, fotoEsc: 60, fotoX: 50, fotoY: 50, ms: 0 });
  function guardadoTipo() { try { return localStorage.getItem('cd.r8.precision.tipo') || 'engranaje'; } catch (e) { return 'engranaje'; } }
  let tic = 0, vivo = true, cotasG = null, cotasL = [];

  // ---------- generar ----------
  function genera(ya) { clearTimeout(tic); tic = setTimeout(hazlo, ya ? 0 : 260); }
  function hazlo() {
    if (!vivo) return; const T = R.TIPOS[S.tipo]; S.faltan = R.faltan(S.tipo, S.v);
    if (S.faltan.length) { S.avisos = []; S.calc = []; S.choque = null; S.info = null; if (esc) esc.ponPartes([]); pintaCotas([]); pintaDer(); pintaVacio(); publica(); return; }
    const vals = R.valores(S.tipo, S.v), t0 = performance.now();
    try {
      S.avisos = T.revisa(vals); S.calc = T.calcula(vals);
      const res = T.construye(vals), partes = res.partes.filter(p => p.m), mal = partes.find(p => p.m.status() !== 'NoError' || p.m.isEmpty());
      if (mal) throw new Error('La pieza no se ha podido cerrar (' + mal.m.status() + '): revisa las medidas.');
      const todas = N.union(partes.map(p => p.m)); S.info = N.info(todas);
      S.choque = res.montaje ? { vol: Math.max(0, res.montaje.a.intersect(res.montaje.b).volume()), que: res.montaje.que } : null;
      S.choques = res.choques || null; S.lista = res.lista || null; if (S.choques) S.choque = { vol: Math.max(...S.choques.map(c => c.vol)), que: S.choques.length + ' comprobaciones (cada pareja de piezas)' };
      if (esc) { esc.ponPartes(partes.map((p, i) => ({ id: 'p' + i, vista: N.aVista(p.m), color: p.color || '#2f7bff', acabado: 'mate' })).concat((res.fantasma || []).map((p, i) => ({ id: 'f' + i, vista: N.aVista(p.m), color: p.color || '#ff8a3d', fantasma: 1 })))); if (S.encuadrar !== false) { esc.encuadrar(S.vistaIni || 'iso'); S.encuadrar = false; } }
      try { const K = T.kit(vals), mk = N.union(K.partes.filter(p => p.m).map(p => p.m)); S.kit = { t: K.t, d: K.d, g: Math.max(0.1, mk.volume() / 1000 * 1.24), n: K.partes.length }; } catch (e) { S.kit = null; }
      pintaCotas(T.cotas ? T.cotas(vals) : []); S.ms = Math.round(performance.now() - t0);
    } catch (e) { S.avisos = [{ n: 'error', t: e.message || String(e) }]; S.info = null; if (esc) esc.ponPartes([]); pintaCotas([]); }
    finally { N.limpia(); R.olvidaDif && R.olvidaDif(); }
    pintaDer(); pintaVacio(); publica();
  }
  function pintaVacio() { mount(vacio, S.faltan.length ? h('div', h('b', '❓ Faltan medidas'), h('small', 'Para construir la pieza necesito: ' + S.faltan.join(' · ') + '. Mídelas con el calibre; no me las invento.'), h('div.r8p-btns', btn('📋 Ver con un ejemplo', () => ejemplo(), { cls: 'sm' }))) : null); }

  // ---------- cotas: líneas en la vista y su número encima ----------
  function pintaCotas(L) {
    if (!esc) return; const T3 = esc.T;
    if (cotasG) { esc.esc.remove(cotasG); cotasG.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); cotasG = null; }
    cotasL = L || []; mount(etiquetas, cotasL.map(q => h('span.r8pr-cota', q.t)));
    if (!cotasL.length) { esc.pide(); return; }
    cotasG = new T3.Group(); const mat = new T3.LineBasicMaterial({ color: 0xffd23f, depthTest: false, transparent: true });
    cotasL.forEach(q => { const a = new T3.Vector3(...q.a), b = new T3.Vector3(...q.b), d = b.clone().sub(a), n = d.length() || 1, p = new T3.Vector3(-d.y, d.x, 0).normalize().multiplyScalar(Math.min(2, n * 0.08)); if (p.length() < 0.01) p.set(Math.min(2, n * 0.08), 0, 0);
      const g = new T3.BufferGeometry().setFromPoints([a, b, a.clone().add(p), a.clone().sub(p), b.clone().add(p), b.clone().sub(p)]); const l = new T3.LineSegments(g, mat); l.renderOrder = 10; cotasG.add(l); });
    esc.esc.add(cotasG); esc.pide();
  }
  if (esc) esc.alDibujar = () => { const sp = etiquetas.children; cotasL.forEach((q, i) => { const e = sp[i]; if (!e) return; const m = [(q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2, (q.a[2] + q.b[2]) / 2], P = esc.aPantalla(m); e.style.transform = 'translate(' + Math.round(P.x) + 'px,' + Math.round(P.y) + 'px) translate(-50%,-50%)'; e.style.display = P.delante ? '' : 'none'; }); };

  // ---------- la foto de referencia (encima de la vista, para comparar a ojo) ----------
  async function ponFoto() { const f = await C.pideArchivo('image/*'); if (!f) return; if (S.foto) URL.revokeObjectURL(S.foto); S.foto = URL.createObjectURL(f); S.vistaIni = 'arriba'; if (esc) esc.encuadrar('arriba'); pintaFoto(); pintaBarra(); }
  function pintaFoto() {
    if (!S.foto) { mount(capaFoto); return; }
    const img = h('img', { src: S.foto, alt: 'Foto del original', draggable: false, style: { opacity: S.fotoOp, width: S.fotoEsc + '%', left: S.fotoX + '%', top: S.fotoY + '%' } });
    let arr = null; img.addEventListener('pointerdown', e => { arr = { x: e.clientX, y: e.clientY, X: S.fotoX, Y: S.fotoY }; img.setPointerCapture(e.pointerId); e.preventDefault(); });
    img.addEventListener('pointermove', e => { if (!arr) return; const r = capaFoto.getBoundingClientRect(); S.fotoX = arr.X + (e.clientX - arr.x) / r.width * 100; S.fotoY = arr.Y + (e.clientY - arr.y) / r.height * 100; img.style.left = S.fotoX + '%'; img.style.top = S.fotoY + '%'; });
    img.addEventListener('pointerup', () => { arr = null; });
    mount(capaFoto, img);
  }
  function pintaBarra() {
    mount(vbar, S.info ? h('span.r8p-pill', C.dimsTxt(S.info.dims, 2)) : null,
      h('button.r8p-pill' + (S.foto ? '.on' : ''), { type: 'button', title: 'Pon encima una foto del original (mejor de frente o desde arriba) para compararla a ojo', onclick: () => S.foto ? (URL.revokeObjectURL(S.foto), S.foto = null, pintaFoto(), pintaBarra()) : ponFoto() }, S.foto ? '✕ Quitar la foto' : '📷 Foto del original'),
      S.foto ? h('label.r8p-pill', 'Transparencia ', h('input', { type: 'range', min: 0.1, max: 0.9, step: 0.05, value: S.fotoOp, 'aria-label': 'Transparencia de la foto', oninput: e => { S.fotoOp = Number(e.target.value); const i = capaFoto.querySelector('img'); if (i) i.style.opacity = S.fotoOp; } })) : null,
      S.foto ? h('label.r8p-pill', 'Tamaño ', h('input', { type: 'range', min: 10, max: 160, step: 1, value: S.fotoEsc, 'aria-label': 'Tamaño de la foto', oninput: e => { S.fotoEsc = Number(e.target.value); const i = capaFoto.querySelector('img'); if (i) i.style.width = S.fotoEsc + '%'; } })) : null,
      S.foto ? h('span.r8p-pill', '👁 a ojo: no es una medición') : null,
      C.botonesVista(() => esc));
  }

  // ---------- panel izquierdo: tipo, datos del aparato, medidas ----------
  function campo(c) {
    const est = S.est[c.k] || 'tuya', id = 'r8pr-' + c.k, cambia = val => { S.v[c.k] = val; S.est[c.k] = (val === '' || val == null) && c.req ? 'falta' : 'tuya'; if (c.k === 'vista') S.encuadrar = true; pintaIzq(); genera(); };
    let ctl;
    if (c.tipo === 'sel') ctl = h('select.inp', { id, 'data-k': c.k, onchange: e => cambia(e.target.value) }, c.ops.map(([v, t]) => h('option', { value: v, selected: String(S.v[c.k]) === String(v) }, t)));
    else if (c.tipo === 'chk') ctl = h('input', { id, type: 'checkbox', 'data-k': c.k, checked: !!S.v[c.k], onchange: e => cambia(e.target.checked) });
    else ctl = h('input.inp', { id, 'data-k': c.k, type: 'number', inputmode: 'decimal', step: c.paso, min: c.min, max: c.max, value: S.v[c.k] == null ? '' : S.v[c.k], placeholder: c.req ? 'mídela' : '', onchange: e => { const t = e.target.value.replace(',', '.'); cambia(t === '' ? null : Number(t)); } });
    const badge = c.tipo === 'chk' ? null : h('span.r8pr-est.' + est, { title: EST[est][1] }, EST[est][0]);
    return h('div.r8pr-campo.' + est + (c.tipo === 'chk' ? '.chk' : ''), h('label', { for: id }, c.t, c.ayuda ? C.ayuda(c.ayuda) : null), h('div.r8pr-ctl', ctl, c.u && c.tipo === 'num' ? h('i', c.u) : null, badge, est === 'estimada' || est === 'ejemplo' ? h('button.r8pr-ok', { type: 'button', title: 'Es correcta: la confirmo', 'aria-label': 'Confirmar ' + c.t, onclick: () => { S.est[c.k] = 'tuya'; pintaIzq(); } }, '✓') : null));
  }
  function pintaIzq() {
    const T = R.TIPOS[S.tipo], vis = R.visibles(S.tipo, S.v), nEst = vis.filter(c => S.est[c.k] === 'estimada').length, nEj = vis.filter(c => S.est[c.k] === 'ejemplo').length;
    mount(izq,
      h('div.r8p-tit', h('span', '📏'), h('div', h('span.r8p-marca', 'PRECISION LAB'), h('b', 'Repuestos con medidas reales'), h('small', 'La pieza se construye con TUS medidas (geometría de CAD). Lo que falte te lo pido: no me lo invento.'))),
      h('div.r8p-sec', h('b', '1 · Qué pieza'), h('div.r8pr-tipos', Object.entries(R.TIPOS).map(([k, t]) => h('button.r8pr-tipo' + (S.tipo === k ? '.on' : ''), { type: 'button', 'data-tipo': k, title: t.d, onclick: () => elige(k) }, h('span', t.e), h('b', t.t))),
        // v20.2 · más estilos de diferencial y repuestos RC (en el catálogo RC, con sus medidas «mídelo» y su prueba de encaje)
        [['spool', '🔒', 'Diferencial bloqueado (spool)'], ['difRectos', '⚙️', 'Diferencial de rectos'], ['cardan', '✚', 'Junta cardán (dobla sin chocar)'], ['esquinaDel', '🛞', 'Esquina delantera (trapecio + copa en C + mangueta)'], ['esquinaTras', '🛞', 'Esquina trasera (trapecio + portamangueta)'], ['palier', '🦴', 'Palier (dogbone)'], ['plantillaRodamientos', '🧪', 'Plantilla de rodamientos'], ['brazoServo', '🏎️', 'Más RC: servo, carrocería, repuestos…']].map(([k, e, t]) => h('button.r8pr-tipo.r8pr-ir', { type: 'button', 'data-ircat': k, title: 'Se abre en el catálogo RC (con sus medidas «mídelo» y su prueba de encaje)', onclick: () => ext.irA && ext.irA('catalogo', cat => { try { cat.abre && cat.abre(k); } catch (x) { } }) }, h('span', e), h('b', t), h('small', '↗ catálogo RC'))))),
      h('details.r8p-sec.r8pr-datos', { open: !!(S.v.pieza || S.v.marca) }, h('summary', h('b', '2 · Del aparato (para encontrarla otro día)')), R.DATOS_APARATO.map(c => h('div.r8pr-campo', h('label', { for: 'r8pr-' + c.k }, c.t, c.ayuda ? C.ayuda(c.ayuda) : null), h('input.inp', { id: 'r8pr-' + c.k, 'data-k': c.k, value: S.v[c.k] || '', onchange: e => { S.v[c.k] = e.target.value; } })))),
      h('div.r8p-sec.r8pr-medidas', h('b', '3 · Medidas · ' + T.t), h('small.muted', '✍️ tuya · ≈ de partida (confírmala) · 📋 ejemplo · ❓ falta'),
        vis.map(campo),
        nEst || nEj ? h('p.r8p-nota.ojo', (nEj ? nEj + ' medida(s) son de ejemplo' : '') + (nEj && nEst ? ' y ' : '') + (nEst ? nEst + ' son valores de partida' : '') + ': confírmalas con el original antes de imprimir la pieza de verdad.') : null,
        h('div.r8p-btns', btn('📋 Ejemplo', () => ejemplo(), { cls: 'sm ghost r8pr-ejemplo', title: 'Rellena las medidas con un ejemplo (marcadas como ejemplo)' }), btn('🧹 Vaciar', () => elige(S.tipo, true), { cls: 'sm ghost' }))),
      h('div.r8p-sec', h('b', 'Mis repuestos'), lista()));
    publica();
  }
  function lista() {
    const L = leeLib(); if (!L.length) return h('small.muted', 'Lo que guardes aparecerá aquí con sus medidas, para cambiarlo otro día.');
    return h('div.r8pr-lib', L.slice(0, 12).map(x => h('div.r8i-r', h('div', h('b', x.nombre || R.TIPOS[x.tipo].t), h('small', R.TIPOS[x.tipo].t + (x.v.marca ? ' · ' + x.v.marca : '') + (x.v.modelo ? ' ' + x.v.modelo : '') + ' · ' + E.fechaCorta(x.fecha))),
      h('div.r8i-ra', btn('Abrir', () => abre(x), { cls: 'sm ghost' }), btn('✕', async () => { if (await confirmDlg('Quitar de Mis repuestos', '¿Quito «' + (x.nombre || R.TIPOS[x.tipo].t) + '»? (solo de esta lista)', 'Quitar')) { guardaLib(leeLib().filter(y => y.id !== x.id)); pintaIzq(); } }, { cls: 'sm ghost', title: 'Quitar' })))));
  }
  function elige(k, vaciar) { if (!R.TIPOS[k]) return; if (S.tipo !== k || vaciar) { Object.assign(S, R.nuevo(k), { id: null, nombre: '', avisos: [], calc: [], info: null, choque: null, choques: null, lista: null, kit: null }); S.encuadrar = true; } try { localStorage.setItem('cd.r8.precision.tipo', k); } catch (e) { } pintaIzq(); genera(true); }
  function ejemplo() { const T = R.TIPOS[S.tipo]; Object.entries(T.ejemplo || {}).forEach(([k, v]) => { S.v[k] = v; S.est[k] = 'ejemplo'; }); S.encuadrar = true; pintaIzq(); genera(true); }
  function abre(x) { Object.assign(S, R.nuevo(x.tipo), { avisos: [], calc: [], info: null, choque: null, choques: null, lista: null, kit: null }); S.v = Object.assign(S.v, x.v); S.est = Object.assign(S.est, x.est); S.id = x.id; S.nombre = x.nombre; S.encuadrar = true; pintaIzq(); genera(true); toast('Abierto: ' + (x.nombre || R.TIPOS[x.tipo].t), 'ok'); }
  function nombrePieza() { const T = R.TIPOS[S.tipo]; return S.nombre || S.v.pieza || (T.t + (S.v.marca ? ' ' + S.v.marca : '')); }

  // ---------- panel derecho ----------
  function pintaDer() {
    const T = R.TIPOS[S.tipo], err = S.avisos.filter(x => x.n === 'error'), avi = S.avisos.filter(x => x.n === 'aviso'), oks = S.avisos.filter(x => x.n === 'ok');
    const listo = !S.faltan.length && S.info && !err.length;
    mount(der,
      h('div.r8p-tit', h('span', T.e), h('div', h('b', T.t), h('small', T.d))),
      S.faltan.length ? h('div.r8p-nota.mal.r8pr-faltan', h('b', '❓ Faltan ' + S.faltan.length + ' medida(s): '), S.faltan.join(' · '), '. Sin ellas no construyo la pieza.') : null,
      S.calc.length ? h('div.r8p-sec', h('b', '🧮 Calculadas'), h('table.r8p-tabla', S.calc.map(([t, v, fr]) => h('tr', { title: fr || '' }, h('td', t, fr ? h('small.r8pr-fr', fr) : null), h('td.n', v))))) : null,
      S.avisos.length ? h('div.r8p-sec.r8pr-avisos', h('b', 'Comprobaciones'), err.map(x => C.chk('mal', x.t, '', null)), avi.map(x => C.chk('ojo', x.t, '', null)), oks.map(x => C.chk('ok', x.t, '', null))) : null,
      S.choques ? h('div.r8p-sec.r8pr-montaje', h('b', '🧩 Montaje virtual ', C.etiqueta('medido')), S.choques.map(c => C.chk(c.vol <= 0.05 ? 'ok' : 'mal', c.t, c.vol <= 0.05 ? 'sin choques (' + C.n2(c.vol, 3) + ' mm³)' : 'CHOCAN: ' + C.n2(c.vol, 2) + ' mm³', null))) : S.choque ? h('div.r8p-sec.r8pr-montaje', h('b', '🧩 Montaje virtual ', C.etiqueta('medido')), C.chk(S.choque.vol < 0.01 ? 'ok' : 'mal', S.choque.vol < 0.01 ? 'Sin choques' : 'CHOCAN: ' + C.n2(S.choque.vol, 2) + ' mm³ se pisan', 'He colocado ' + S.choque.que + ' y he medido el volumen que comparten.', null)) : null,
      S.lista ? h('div.r8p-sec', h('b', '🛒 Piezas estándar que hay que comprar'), h('ul.r8pr-lista', S.lista.map(([n, t]) => h('li', n + ' × ' + t)))) : null,
      S.info ? h('div.r8p-sec', h('b', 'La pieza'), h('small', C.dimsTxt(S.info.dims, 2) + ' · ' + C.n2(S.info.vol / 1000, 2) + ' cm³ · ≈ ' + C.n2(S.info.vol / 1000 * 1.24, 1) + ' g de PLA macizo (estimado) · ' + S.ms + ' ms')) : null,
      S.kit ? h('div.r8p-sec.r8pr-kit', h('b', '🧪 Prueba de encaje'), h('p.r8p-nota', h('b', S.kit.t), h('br'), S.kit.d, h('br'), h('small', '≈ ' + C.n2(S.kit.g, 1) + ' g (estimado)')), btn('🧪 Sacar la prueba (STL)', () => sacaKit(), { cls: 'sm r8pr-sacakit', disabled: !listo })) : null,
      h('p.small.muted', 'Que la geometría esté bien no garantiza que funcione: imprime primero la prueba de encaje.'),
      h('div.r8p-sec.r8pr-exportar', h('b', 'Llevármela'),
        h('div.r8p-btns', btn('🩺 Revisar e imprimir', () => aImprimir(), { cls: 'primary r8pr-imprimir', disabled: !listo })),
        h('div.r8p-btns', btn('⬇️ STL', () => saca('stl'), { cls: 'sm', disabled: !listo }), btn('📦 3MF', () => saca('3mf'), { cls: 'sm', disabled: !listo }), btn('💾 Guardar medidas', () => guardaMedidas(), { cls: 'sm r8pr-guardar', disabled: !!S.faltan.length && !S.v.pieza }))));
    pintaBarra();
  }

  // ---------- llevársela ----------
  // varias piezas: cada una apoyada en la cama y en fila, separadas 6 mm (Bambu Studio puede reorganizarlas y orientarlas)
  // (comprobado con Bambu Studio: pegadas al borde, su «balsa» se sale de la cama y no lamina; por eso van centradas, con margen)
  function enFila(P, cama = 256) { if (P.length < 2) return P; let x = 0, y = 0, fila = 0; const ancho = cama - 40, sep = 8;
    const L = P.map(p => { const b = N.caja(p.m), w = b.dims[0], d = b.dims[1]; if (x > 0 && x + w > ancho) { x = 0; y += fila + sep; fila = 0; } const m = p.m.translate([x - b.min[0], y - b.min[1], -b.min[2]]); x += w + sep; fila = Math.max(fila, d); return Object.assign({}, p, { m }); });
    const B = N.caja(N.union(L.map(p => p.m))), dx = cama / 2 - (B.min[0] + B.max[0]) / 2, dy = cama / 2 - (B.min[1] + B.max[1]) / 2;
    if (B.dims[0] > cama - 20 || B.dims[1] > cama - 20) toast('⚠️ Las piezas no caben juntas en una cama de ' + cama + ' mm: Bambu Studio las repartirá en varias placas.', 'warn', 8000);
    return L.map(p => Object.assign({}, p, { m: p.m.translate([dx, dy, 0]) })); }
  function construye(kit) { const T = R.TIPOS[S.tipo], vals = R.valores(S.tipo, S.v); if (kit) return enFila(T.kit(vals).partes.filter(p => p.m)); const r = T.construye(vals); return r.imprimir ? enFila(r.imprimir) : r.partes; }
  async function saca(como) {
    try { const P = construye(), nom = C.limpioNombre(nombrePieza());
      if (como === 'stl') { const stl = N.stl(N.union(P.map(p => p.m)), nom); await C.guardaEnPC(stl, 'Repuestos', nom + '.stl', 'model/stl'); }
      else { const A = await import('../r8/consejos3d.js'), blob = N.tresMF(P.map(p => ({ m: p.m, color: p.color || '#2f7bff', nombre: p.nombre })), nom, A.claves({ acabado: 'equilibrado', uso: 'encaje', soporte: 'no', balsa: 'auto' })); await C.guardaEnPC(blob, 'Repuestos', nom + '.3mf', 'model/3mf'); }
    } catch (e) { toast(e.message || String(e), 'bad', 8000); } finally { N.limpia(); }
  }
  async function sacaKit() { try { const P = construye(true), nom = C.limpioNombre(nombrePieza()) + '_PRUEBA'; const stl = N.stl(N.union(P.map(p => p.m)), nom); await C.guardaEnPC(stl, 'Repuestos/Pruebas de encaje', nom + '.stl', 'model/stl'); window.__r8pr.kitBytes = stl.byteLength; } catch (e) { toast(e.message || String(e), 'bad', 8000); } finally { N.limpia(); } }
  function aImprimir() {
    try { const P = construye(), nom = nombrePieza(), stl = N.stl(N.union(P.map(p => p.m)), C.limpioNombre(nom));
      E.ponEnMesa({ nombre: nom, origen: 'precision', stl, datos: { tipo: S.tipo, v: S.v, est: S.est } }); N.limpia(); ext.irA && ext.irA('doctor');
    } catch (e) { N.limpia(); toast(e.message || String(e), 'bad', 8000); }
  }
  function guardaMedidas() { const L = leeLib(), id = S.id || ('r' + Date.now().toString(36)); S.id = id; const x = { id, tipo: S.tipo, nombre: nombrePieza(), v: S.v, est: S.est, fecha: Date.now() }; guardaLib([x].concat(L.filter(y => y.id !== id))); toast('💾 Guardado en Mis repuestos (en este aparato), con todas sus medidas', 'ok'); pintaIzq(); }
  function publica() { window.__r8pr = Object.assign(window.__r8pr || {}, { tipo: S.tipo, faltan: S.faltan.slice(), avisos: S.avisos.map(x => x.n + ':' + x.t), calc: S.calc.map(x => [x[0], x[1]]), choque: S.choque && S.choque.vol, dims: S.info && S.info.dims, kit: S.kit, est: Object.assign({}, S.est), elige, ejemplo, aImprimir, pon: (k, v) => { S.v[k] = v; S.est[k] = 'tuya'; pintaIzq(); genera(true); } }); }

  pintaIzq(); pintaDer(); genera(true);
  return { destroy() { vivo = false; clearTimeout(tic); if (S.foto) URL.revokeObjectURL(S.foto); if (esc) esc.destruir(); } };
}
