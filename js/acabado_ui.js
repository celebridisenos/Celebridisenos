// 🎚️ ABRIR EN BAMBU CON EL ACABADO PUESTO (01-11-2026; rehecho el 10-11-2026, pedido por Biou)
// Él (10-11): «que cada producto, cuando se vaya a abrir en Bambu, me pregunte cómo quieres el acabado: premium top, impresión rápida,
// de prueba, normal, de máxima calidad; que ya esté automáticamente, que configure el perfil listo para imprimir, seleccionar la
// impresora; ahora tenemos la A1 también». Dos preguntas, una debajo de otra, y un botón grande:
//   1 · ¿Qué acabado?  (Prueba · Rápida · Normal · Máxima calidad · Premium top)
//   2 · ¿En qué impresora?  (A1 mini · P1P · A1 NUEVA — las tres SIN AMS; la que no cabe, tachada)
//   → «Abrir en Bambu listo para imprimir»: la torre saca un proyecto de SU Bambu con capa, paredes, relleno, impresora y placa ya
//     puestas (desktop/host/acabado.go) y lo abre. Desde el cotizador llegan también el TAMAÑO y la FUERZA presupuestados.
//   3 · (11-11-2026) ¿De un color o CON COLORES (AMS manual)? Biou: «que en el mismo me diga ¿quieres con AMS manual? qué zonas quieres
//     de color… y haga las pausas automáticamente… siempre con el acabado perfecto… que me traslade a R8 a colorear y de ahí me devuelva».
//     «Con colores» abre el TALLER DE COLORES de CelebriR8 sobre la pieza (r8/colores_taller.js: franjas de color por capas, pausas que
//     se arrastran) a su TAMAÑO y con la capa de ESE acabado; al guardar vuelve aquí y el proyecto sale con las paradas puestas (M400 U1
//     al empezar cada capa: comprobado con su Bambu en desktop/host/acabado_colores_test.go). Las zonas se recuerdan por producto.
import { h, mount, modal, toast } from './ui.js';
import { paraArchivo, capaDe, nombreColor } from './r8/colores_capas.js';
import { desktop } from './desktop.js';
import { noSePuedeAqui, esOrdenador } from './pieza_taller.js'; // 02-11-2026: si este aparato no puede, se encarga a la torre
import { ACABADOS, IMPRESORAS, cabeEn, acabadoPorK, impPorK, recordar, recordado } from './cotizar.js';

const coma = v => String(v).replace('.', ',');
export const ajustesTxt = (a, extra = {}) => 'capa ' + coma(a.capa) + ' · ' + (extra.paredes || a.paredes) + ' paredes · ' + (extra.relleno || a.relleno) + ' %' + (a.planchado ? ' · planchado' : '');

// dibujito de impresora (cama + pórtico), en el color de cada una
export function dibujoImpresora(k) {
  const I = impPorK(k), c = I.color, ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 64 52'); s.setAttribute('class', 'ab-imp-svg'); s.setAttribute('aria-hidden', 'true');
  const caja = k === 'p1p'; // la P1P es una caja; las A1, de pórtico abierto
  s.innerHTML = caja
    ? '<rect x="8" y="4" width="48" height="44" rx="5" fill="' + c + '" opacity=".18" stroke="' + c + '" stroke-width="3"/><rect x="16" y="34" width="32" height="5" rx="2" fill="' + c + '"/><rect x="26" y="14" width="12" height="9" rx="2" fill="' + c + '"/><line x1="12" y1="14" x2="52" y2="14" stroke="' + c + '" stroke-width="3"/>'
    : '<rect x="' + (k === 'a1m' ? 14 : 6) + '" y="40" width="' + (k === 'a1m' ? 36 : 52) + '" height="6" rx="2" fill="' + c + '"/><rect x="' + (k === 'a1m' ? 46 : 52) + '" y="6" width="5" height="40" rx="2" fill="' + c + '"/><line x1="' + (k === 'a1m' ? 12 : 4) + '" y1="16" x2="' + (k === 'a1m' ? 50 : 56) + '" y2="16" stroke="' + c + '" stroke-width="3"/><rect x="24" y="12" width="12" height="11" rx="2" fill="' + c + '"/>';
  return s;
}

// ruta = archivo (STL/3MF/OBJ/STEP) que está en el PC. nombre = para los avisos.
// opts.remoto(imp, receta, extra) = hacerlo en la TORRE (portátil, tablet, móvil) · opts.siNoAqui(imp, receta, extra) = si aquí falla, en la torre
// opts.medidas {x,y,z} mm (al 100 %) para tachar la impresora en la que no cabe · opts.escala (%) · opts.paredes · opts.relleno (del cotizador)
// opts.acabado / opts.imp = lo ya elegido · opts.talCual() = «abrirlo sin tocar nada» · opts.titulo
export function elegirAcabado(ruta, nombre, opts = {}) {
  const remoto = typeof opts.remoto === 'function';
  if (!remoto && !desktop.on) return toast('El acabado se prepara en el programa del PC.', 'warn', 6000);
  if (!remoto && !ruta) return toast('Para el acabado necesito el archivo guardado en el PC (ábrelo desde un producto con su STL).', 'warn', 7000);
  const esc = Number(opts.escala) > 0 ? Number(opts.escala) : 100;
  const med = opts.medidas && Number(opts.medidas.x) > 0 ? { x: opts.medidas.x * esc / 100, y: opts.medidas.y * esc / 100, z: opts.medidas.z * esc / 100 } : null;
  const caben = IMPRESORAS.filter(I => !med || cabeEn(I, med));
  let rec = acabadoPorK(opts.acabado || recordado('acabado') || 'normal').k;
  let imp = opts.imp && caben.some(I => I.k === opts.imp) ? opts.imp : (caben.find(I => I.k === recordado('imp')) || caben[0] || IMPRESORAS[0]).k;
  const extra = { v: 2 }; if (esc !== 100) extra.escala = esc; if (opts.paredes) extra.paredes = opts.paredes; if (opts.relleno) extra.relleno = opts.relleno;
  // ---- 3 · 🌈 AMS manual: las zonas de color se guardan a tamaño 100 % (z100) y se pasan al tamaño y la capa de cada momento
  const CK = 'cd.colores.' + (opts.pid || nombre || ruta || 'pieza'), r3 = v => Math.round(v * 1000) / 1000, k = esc / 100;
  let col = (() => { try { const x = JSON.parse(localStorage.getItem(CK) || 'null'); return x && Array.isArray(x.cambios) ? x : { base: '', cambios: [] }; } catch (e) { return { base: '', cambios: [] }; } })();
  const guardaCol = () => { try { localStorage.setItem(CK, JSON.stringify(col)); } catch (e) { } };
  let ams = col.cambios.length > 0;
  const aTam = () => col.cambios.map(c => Object.assign({}, c, { z: r3(c.z100 * k) }));
  const paradas = () => paraArchivo(aTam(), acabadoPorK(rec).capa); // (lo que va a su Bambu: la altura de la capa donde empieza el color)
  // para enseñarlo: la capa donde EMPIEZA cada color y su altura de abajo (la misma cuenta que paraArchivo)
  const paradasVista = () => aTam().filter(c => c.activa !== false).sort((a, b) => a.z - b.z).map(c => { const K = capaDe(c.z, acabadoPorK(rec).capa); return { color: c.color, tipo: c.tipo, capa: K.capa, desde: K.desde }; });
  const coloresEl = h('div.ab-colores');
  // ---- 4 · 🪄 MENOS SOPORTES (12-11-2026, Biou: «lo de quitar soporte tiene que estar en la pestaña Abrir en Bambu, tiene más sentido debajo
  // de color»). Antes era un botón suelto en la ficha. Elige «🪄 Menos soportes» y el botón de abajo prueba las posturas con SU Bambu
  // (sinsoportes_ui.js) con el acabado y la impresora de arriba. Solo en el PC con el archivo; con colores no (las paradas van por altura).
  const puedeSop = !remoto && desktop.on && typeof desktop.soportesMedir === 'function' && !!ruta;
  const sopNo = () => ams ? 'Con colores, la pieza se queda en su postura: las paradas van por altura.' : esc !== 100 || opts.paredes || opts.relleno ? 'Con otro tamaño o reforzada, de momento no: ábrela al 100 % sin reforzar.' : '';
  let sop = false;
  const sopEl = h('div.ab-sopw');
  const bAbrir = h('button.btn.primary.ab-abrir', { type: 'button', onclick: () => abrir() }, '🖨️ Abrir en Bambu listo para imprimir');
  function pintaSop() {
    if (!puedeSop) return;
    const no = sopNo(); if (no) sop = false;
    mount(sopEl, h('div.ab-ams',
      h('button.ab-am.ab-sop' + (!sop ? '.on' : ''), { type: 'button', 'data-sop': 'no', onclick: () => { sop = false; pintaSop(); } }, h('span.ab-e', '📦'), h('b', 'Tal como está'), h('small', 'En la postura en que está guardada')),
      h('button.ab-am.ab-sop' + (sop ? '.on' : ''), { type: 'button', 'data-sop': 'si', disabled: !!no, onclick: () => { sop = true; pintaSop(); } }, h('span.ab-e', '🪄'), h('b', 'Menos soportes'), h('small', no || 'Prueba varias posturas con tu Bambu y te enseña la de menos soporte (o ninguno)'))));
    bAbrir.textContent = sop ? '🪄 Buscar la postura con menos soportes' : '🖨️ Abrir en Bambu listo para imprimir';
  }
  // ---- 2 bis · 🎯 la CALIBRACIÓN de cada impresora (11-11-2026, Biou: «prueba de calibre para cada máquina, rápida… así ya tienes los
  // ajustes perfectos de cada una»): lo medido con la probeta en ESA impresora va puesto (agujeros, contorno, pie de elefante).
  let CAL = null; const calEl = h('div.ab-calrow');
  import('./r8/calibracion.js').then(m => { CAL = m; pinta(); }).catch(() => { });
  import('./r8/calibracion_puerta.js').then(m => m.traeDeLaNube()).then(x => { if (x) pinta(); }).catch(() => { });
  const calDe = k => { try { return CAL ? CAL.paraAcabado(k, 'PLA') : null; } catch (e) { return null; } };
  async function calibrar() {
    const U = await import('./r8/calibracion_ui.js');
    U.abrir({ imp, mat: 'PLA', rapida: true, alGuardar: () => pinta(), alCerrar: () => pinta() });
  }
  function pintaCal() {
    const I = impPorK(imp), c = calDe(imp), t = CAL ? CAL.TIEMPO_PROBETA.rapida : null;
    window.__acabadoCal = c;
    mount(calEl, c
      ? h('div.ab-cal-si', h('span', '🎯 '), h('div', h('b', 'Tu ' + I.nombre + ' está calibrada' + (c.fecha ? ' (' + c.fecha.split('-').reverse().join('-') + ')' : '') + (c.estimada ? ' · estimada' : '')),
          h('small', 'Va puesto: agujeros ' + coma(c.claves.xy_hole_compensation) + ' · contorno ' + coma(c.claves.xy_contour_compensation) + ' · pie de elefante ' + coma(c.claves.elefant_foot_compensation) + ' mm')),
        h('button.btn.ghost.sm.ab-calibrar', { type: 'button', onclick: calibrar }, 'Volver a calibrar'))
      : h('div.ab-cal-no', h('span', '🎯 '), h('div', h('b', 'Tu ' + I.nombre + ' está sin calibrar'), h('small', 'Sale bien igual; calibrada, los encajes y agujeros salen a la medida.')),
        h('button.btn.sm.ab-calibrar', { type: 'button', onclick: calibrar }, '⚡ Calibrarla' + (t ? ' (' + t[imp] + ' min, ' + coma(t.g) + ' g)' : ''))));
  }
  async function abrirTaller() {
    const puede = typeof opts.cargar3D === 'function' || (ruta && desktop.on);
    if (!puede) return toast('Para elegir las zonas de color necesito el archivo 3D de la pieza (súbelo al producto).', 'warn', 7000);
    toast('🎨 Abriendo el taller de colores sobre la pieza…', '', 3000);
    try {
      const d = typeof opts.cargar3D === 'function' ? await opts.cargar3D() : { buf: await desktop.file(ruta), nombre };
      const [{ parse3D }, N, T] = await Promise.all([import('./stl.js'), import('./r8/nucleo.js'), import('./r8/colores_taller.js')]);
      await N.cargar();
      const pos = await parse3D(d.buf, d.nombre || nombre || 'pieza.stl'), sopa = new Float32Array(pos.length);
      for (let i = 0; i < pos.length; i++) sopa[i] = pos[i] * k; // (al tamaño que se va a imprimir)
      const est = { base: col.base || '#f4f4f0', cambios: col.cambios.map(c => { const x = { id: c.id, z: r3(c.z100 * k), color: c.color }; if (c.tipo) x.tipo = c.tipo; if (c.activa === false) x.activa = false; if (c.gcode) x.gcode = c.gcode; return x; }) };
      if (Array.isArray(col.cortes100)) est.cortes = col.cortes100.map(z => r3(z * k)); // 11-11-2026 · las zonas del modo fácil
      window.__acabadoTaller = true;
      const r = await T.abrirColores({ sopa, nombre: (nombre || 'Pieza') + (esc !== 100 ? ' · al ' + esc + ' %' : ''), est, capa: acabadoPorK(rec).capa, colorBase: est.base, prop: [], impresora: impPorK(imp).nombre });
      window.__acabadoTaller = false;
      if (r) {
        col = { base: r.base || est.base, cambios: (r.cambios || []).map(c => { const x = { id: c.id, z100: r3(c.z / k), color: c.color }; if (c.tipo) x.tipo = c.tipo; if (c.activa === false) x.activa = false; if (c.gcode) x.gcode = c.gcode; return x; }) };
        if (Array.isArray(r.cortes)) col.cortes100 = r.cortes.map(z => r3(z / k));
        guardaCol(); ams = true; pintaColores(); pinta();
        toast(col.cambios.length ? '🌈 ' + col.cambios.length + (col.cambios.length === 1 ? ' cambio de color guardado' : ' cambios de color guardados') + ': ya puedes abrirlo en Bambu.' : 'Sin cambios de color: saldrá de un color.', 'ok', 5000);
      }
    } catch (e) { window.__acabadoTaller = false; toast('No se pudo abrir el taller de colores: ' + (e.message || e), 'bad', 8000); }
  }
  function pintaColores() {
    const a = acabadoPorK(rec), L = paradasVista(), base = col.base || '#f4f4f0';
    const punto = c => h('i.ab-pt', { style: 'background:' + c });
    mount(coloresEl,
      h('div.ab-ams',
        h('button.ab-am' + (!ams ? '.on' : ''), { type: 'button', 'data-ams': 'no', onclick: () => { ams = false; pintaColores(); pinta(); } }, h('span.ab-e', '⚪'), h('b', 'De un color'), h('small', 'Sin paradas: la imprime de principio a fin')),
        h('button.ab-am' + (ams ? '.on' : ''), { type: 'button', 'data-ams': 'si', onclick: () => { ams = true; pintaColores(); pinta(); if (!col.cambios.length) abrirTaller(); } }, h('span.ab-e', '🌈'), h('b', 'Con colores (AMS manual)'), h('small', 'Se para sola en cada zona y cambias tú la bobina'))),
      ams ? h('div.ab-zonas',
        L.length ? h('div.ab-lista', h('span.ab-z', punto(base), h('b', nombreColor(base)), ' desde la cama'),
          L.map(p => h('span.ab-z', '→ ', punto(p.color), h('b', p.tipo === 'pausa' ? '⏸ pausa' : nombreColor(p.color)), ' desde ' + coma(Math.round(p.desde * 100) / 100) + ' mm (capa ' + p.capa + ')')))
          : h('p.small.ab-sin', 'Todavía no has elegido las zonas de color.'),
        h('button.btn.ab-taller' + (L.length ? '' : '.primary'), { type: 'button', onclick: abrirTaller }, L.length ? '🎨 Cambiar las zonas de color' : '🎨 Elegir las zonas de color sobre la pieza'),
        h('ul.ab-consejos',
          h('li', '🧵 Cuando se pare: en la pantalla de la impresora, ', h('b', 'Filamento → Descargar'), ', mete la bobina nueva y ', h('b', 'Cargar'), ' (purga sola el color de antes). Quita el hilo que cuelgue de la punta y ', h('b', 'Reanudar'), '.'),
          h('li', '✨ El cambio queda más limpio donde cambia la forma o empieza una cara plana: en el taller lo ves sobre la pieza.'),
          a.capa >= 0.24 ? h('li.ojo', '⚠️ Con «' + a.nombre + '» (capa ' + coma(a.capa) + ') el borde del color se nota escalonado: para colores, mejor Normal, Máxima calidad o Premium.') : null,
          a.planchado ? h('li', '👑 Con Premium la cara de arriba se plancha: el último color queda liso.') : null,
          esc !== 100 ? h('li', '📏 Las zonas van al tamaño que imprimes (' + esc + ' %).') : null)) : null);
  }
  const body = h('div.ab');
  const md = modal(opts.titulo || '🖨️ Abrir en Bambu', body, null, { size: 'wide' });
  const tiles = h('div.ab-acab'), imps = h('div.ab-imps'), resumen = h('div.ab-resumen');
  function pinta() {
    mount(tiles, ACABADOS.map(a => h('button.ab-tile' + (rec === a.k ? '.on' : ''), { type: 'button', 'data-k': a.k, style: '--c:' + a.color, onclick: () => { rec = a.k; pinta(); } },
      h('span.ab-e', a.e), h('b.ab-nom', a.nombre), h('span.ab-para', a.para), h('span.ab-aj', ajustesTxt(a, extra)), h('span.ab-t', a.tiempo))));
    mount(imps, IMPRESORAS.map(I => {
      const no = med && !cabeEn(I, med);
      return h('button.ab-imp' + (imp === I.k ? '.on' : '') + (no ? '.no' : ''), { type: 'button', 'data-k': I.k, style: '--c:' + I.color, disabled: no, title: no ? 'No cabe: la pieza mide más que su cama' : '', onclick: () => { imp = I.k; pinta(); } },
        dibujoImpresora(I.k), h('b', I.nombre, I.nueva ? h('em.ab-nueva', 'NUEVA') : null), h('span.ab-cama', no ? '⛔ No cabe' : 'cama ' + coma(I.x / 10) + ' cm'),
        CAL ? h('span.ab-cal' + (calDe(I.k) ? '.si' : ''), calDe(I.k) ? '🎯 calibrada' : 'sin calibrar') : null);
    }));
    const a = acabadoPorK(rec), I = impPorK(imp);
    const np = ams ? paradas().length : 0;
    mount(resumen, h('span', a.e + ' ' + a.nombre + ' · ' + I.nombre + (esc !== 100 ? ' · tamaño ' + esc + ' %' : '') + (opts.paredes || opts.relleno ? ' · reforzada' : '') + (np ? ' · 🌈 ' + (np + 1) + ' colores (' + np + (np === 1 ? ' parada)' : ' paradas)') : '') + (calDe(imp) ? ' · 🎯 calibrada' : '')), h('span.tiny.muted', ajustesTxt(a, extra) + ' · placa texturizada · ' + (np ? 'se para sola en cada cambio de color' : 'de un color')));
    pintaColores(); pintaCal(); pintaSop();
  }
  async function abrir() {
    if (sop && puedeSop && !sopNo()) { // 🪄 con el acabado y la impresora elegidos: prueba las posturas y la abre así, laminada
      md.close(); recordar('acabado', rec); recordar('imp', imp);
      window.__acabadoPedido = { rec, imp, sop: true };
      return import('./sinsoportes_ui.js').then(M => M.abrirMenosSoportes({ nombre: nombre || 'Pieza', ruta }, { imp, receta: rec }));
    }
    const L = ams ? paradas() : [];
    if (ams && !L.length) { toast('Elige las zonas de color (o marca «De un color»).', 'warn', 6000); return abrirTaller(); }
    if (L.length) extra.pausas = JSON.stringify(L); else delete extra.pausas;
    const cal = calDe(imp); if (cal) extra.cal = JSON.stringify(cal.claves); else delete extra.cal;
    md.close();
    recordar('acabado', rec); recordar('imp', imp);
    const a = acabadoPorK(rec), I = impPorK(imp);
    window.__acabadoPedido = { rec, imp, extra: Object.assign({}, extra) };
    if (remoto) return opts.remoto(imp, rec, extra);
    toast('Preparando «' + a.nombre + '» para la ' + I.nombre + ' y abriendo Bambu Studio…', 'ok', 5000);
    try {
      const r = await desktop.acabado(ruta, imp, rec, extra);
      window.__acabadoAbierto = r || null;
      toast('🖨️ Abierto en Bambu: ' + a.nombre + ' en la ' + I.nombre + ', listo para laminar.' + (L.length ? ' 🌈 Con ' + L.length + (L.length === 1 ? ' parada' : ' paradas') + ' de color puestas (las ves en la barra de capas).' : '') + (r && r.posturaNombre ? ' 📐 Colocada: ' + r.posturaNombre + (r.soporte >= 0.3 ? (r.delDisenador ? ' · con el soporte de su diseñador, que gasta menos (≈ ' : r.arreglo === 'normal' ? ' · con soporte normal ajustado, porque el de árbol dejaba algo en el aire (≈ ' : ' · con soporte fácil de quitar (≈ ') + Math.round(r.soporte * 10) / 10 + ' g).' : ' · sin soporte.') + (r.recolocada ? ' Recolocada para que quepa en tu cama, con todas sus piezas.' : '') + (r.piePegado ? ' 🦶 Un soporte alto nace encima de la pieza: su pie va pegado para que no se suelte (arriba sigue igual de fácil).' : '') + (r.torreSuelta ? ' ⚠️ Un soporte alto nace encima de la pieza y pegarle el pie estropeaba otro soporte: se queda como el diseñador, vigila que no se suelte al subir.' : '') : ''), 'ok', 11000); // (12-11: cómo la ha colocado; 13-11: el pie pegado)
    } catch (e) {
      if (typeof opts.siNoAqui === 'function' && noSePuedeAqui(e)) { if (!esOrdenador()) toast('En este aparato no se puede (' + (e.message || e) + '): se lo encargo a la torre.', 'warn', 6000); return opts.siNoAqui(imp, rec, Object.assign({}, extra, { motivo: String(e.message || e) })); }
      toast('No se pudo preparar el acabado: ' + (e.message || e), 'bad', 8000);
    }
  }
  pinta();
  mount(body,
    nombre ? h('p.ab-pieza', '📦 ' + nombre + (esc !== 100 ? ' · al ' + esc + ' %' : '')) : null,
    remoto ? (esOrdenador() && !desktop.on ? h('p.ab-remoto.ab-remoto-pc', '⚠️ Estás en la app de internet: se abrirá en el Bambu de la TORRE, no en este ordenador. Para abrirlo aquí, abre el programa CelebriDiseños con su icono.') : h('p.small.ab-remoto', '🖥️ Lo prepara la torre y se abre allí, en su Bambu Studio.')) : null, // (14-11: en un ordenador sin el programa, bien claro)
    h('h3.ab-paso', h('i', '1'), '¿Qué acabado?'), tiles,
    h('h3.ab-paso', h('i', '2'), '¿En qué impresora?'), imps, calEl,
    h('h3.ab-paso', h('i', '3'), '¿De un color o con colores?', h('small.ab-paso-s', 'sin AMS: se para y cambias tú la bobina')), coloresEl,
    puedeSop ? h('h3.ab-paso.ab-paso-sop', h('i', '4'), '¿Con menos soportes?', h('small.ab-paso-s', 'la gira hasta que necesite el mínimo')) : null, puedeSop ? sopEl : null,
    resumen,
    h('div.ab-pie', bAbrir,
      typeof opts.talCual === 'function' ? h('button.btn.ghost.sm.ab-talcual', { type: 'button', onclick: () => { md.close(); opts.talCual(); } }, 'Abrirlo tal cual, sin tocar nada') : null),
    h('p.tiny.muted.ab-nota', 'Usa el perfil de serie de esa impresora con estos ajustes (probado con tu Bambu Studio: 0 avisos). No cambia nada de tu Bambu Studio.'));
  return md;
}
