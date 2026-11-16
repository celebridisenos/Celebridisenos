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
import { ACABADOS, IMPRESORAS, cabeEn, acabadoPorK, impPorK, recordar, recordado, RECETA_VISTA } from './cotizar.js';
import { nuevoProg, tarjetaProgreso, sigueProgreso } from './progreso_bambu.js'; // 14-11: «Laminando en tu Bambu… %»

const coma = v => String(v).replace('.', ',');
// 14-11-2026 (noche) · 🧵 MATERIAL y 🛏️ PLACA. Biou: «NUESTRO PROGRAMA TIENE QUE PREGUNTAR QUÉ PLACA PONEMOS, SI ES PETG O PLA».
// Lo mismo que desktop/host/placa_material.go: la placa se recuerda POR IMPRESORA (aquí y en el programa del PC: «placa_a1m»…);
// el material va por trabajo (el del producto o el último usado).
export const PLACAS = [
  { k: 'texturizada', e: '🟫', nombre: 'Texturizada', largo: 'PEI texturizada (rugosa)' },
  { k: 'lisa', e: '⬛', nombre: 'Lisa', largo: 'PEI lisa' },
  { k: 'fria', e: '🧊', nombre: 'Fría', largo: 'Placa fría' },
  { k: 'ingenieria', e: '⚙️', nombre: 'Ingeniería', largo: 'Placa de ingeniería' },
];
export const placaPorK = k => PLACAS.find(p => p.k === k) || PLACAS[0];
export const matDe = s => /petg/i.test(String(s || '')) ? 'PETG' : 'PLA';
export const placaDe = imp => placaPorK(recordado('placa_' + imp)).k;
export function guardaPlaca(imp, k) { recordar('placa_' + imp, k); try { if (desktop.on && desktop.setConfig) desktop.setConfig('placa_' + imp, k).catch(() => { }); } catch (e) { } }
// lo que diría un experto de esa mezcla (igual que avisosPlacaMaterial en el programa del PC)
export function avisoPlaca(mat, placa) {
  if (mat === 'PETG' && placa === 'fria') return { no: true, t: '⛔ El PETG no va en la placa fría: pon la texturizada' };
  if (mat === 'PETG' && placa === 'lisa') return { t: '🧴 PETG en PEI lisa: pon pegamento de barra antes, o arranca trozos de la placa' };
  if (mat === 'PETG' && placa === 'ingenieria') return { t: '🧴 PETG en la de ingeniería: una capa fina de pegamento de barra' };
  if (mat === 'PLA' && (placa === 'fria' || placa === 'ingenieria')) return { t: '🧴 PLA en ' + placaPorK(placa).largo.toLowerCase() + ': una capa fina de pegamento de barra' };
  return null;
}
// el aire entre el soporte y la pieza (huecoSoporte en desktop/host/soportes.go): en capas enteras, nunca menos de 0,2 mm (PETG, 0,3)
export function aireSoporte(capa, mat) { const c = Number(capa) > 0.04 ? Number(capa) : 0.2, n = Math.max(1, Math.ceil((mat === 'PETG' ? 0.3 : 0.2) / c - 0.07)); return Math.round(n * c * 1000) / 1000; }
const SEMAFORO = { verde: '🟢', amarillo: '🟡', rojo: '🔴' };

export const ajustesTxt = (a, extra = {}) => 'capa ' + coma(a.capa) + ' · ' + (extra.paredes || a.paredes) + ' paredes · ' + (extra.relleno || a.relleno) + ' %' + (a.planchado ? ' · planchado' : '');

// 14-11-2026 · 🎞️ LA CINTA de «Laminando en tu Bambu…» (progreso_bambu.js). Biou: «que abajo vaya saliendo lo que va a ser, para saber
// qué ajustes tendrá y qué acabado». Cada frase sale de lo que de verdad va a su Bambu: la receta (RECETA_VISTA, comprobada contra
// desktop/host/acabado.go por acabado_cinta_test.go), lo del cotizador (tamaño, fuerza), los colores y la calibración.
// o = { a: acabado, I: impresora, extra, paradas: nº de paradas de color, ruta, cal: calibración de esa impresora (o null) }
export function cintaAcabado(o) {
  const a = o.a, I = o.I, x = o.extra || {}, R = RECETA_VISTA[a.k] || {}, np = o.paradas || 0;
  const mat = matDe(o.mat || x.mat), P = placaPorK(o.placa || x.placa), av = avisoPlaca(mat, P.k); // (14-11 noche)
  const paredes = Number(x.paredes) || a.paredes, relleno = Number(x.relleno) || a.relleno, esc = Number(x.escala) || 100;
  const fuerte = (Number(x.paredes) && Number(x.paredes) !== a.paredes) || (Number(x.relleno) && Number(x.relleno) !== a.relleno);
  const es3mf = /\.3mf$/i.test(o.ruta || '');
  return [
    a.e + ' ' + a.nombre + ' · ' + a.para.replace(/\.$/, ''),
    '📏 Capa de ' + coma(a.capa) + ' mm · ' + paredes + ' paredes · relleno ' + (relleno >= 100 ? 'macizo (100 %)' : relleno + ' % ' + (R.patron || '')).trim() + (fuerte ? ' · 💪 reforzada' : ''),
    R.exterior ? '🐢 La pared de fuera va despacio (' + R.exterior + ' mm/s): sale lisa, sin granitos' : R.serie ? '⚡ Velocidad de serie de tu Bambu: rápida, para ver si encaja' : '',
    R.boquilla && mat === 'PLA' ? '🔥 Boquilla a ' + R.boquilla + ' °C: las capas se pegan fuerte y no se parte' : '',
    mat === 'PETG' ? '🔥 PETG: con las temperaturas de tu perfil de PETG' : '',
    R.cama && mat === 'PLA' && P.k !== 'fria' ? '🛏️ Cama a ' + R.cama[0] + ' °C la primera capa y a ' + R.cama[1] + ' °C después: se agarra y no se tuerce' : '',
    R.capaSeg ? '🌬️ Cada capa tarda al menos ' + R.capaSeg + ' s: le da tiempo a enfriar' : '',
    a.planchado ? '👑 La cara de arriba sale planchada: lisa al tacto' : '',
    R.techo ? '🧱 ' + R.techo + ' capas de techo y ' + R.suelo + ' de suelo: no se transparenta el relleno' : '',
    esc !== 100 ? '📐 Al ' + esc + ' % de su tamaño' : '',
    np ? '🌈 ' + (np + 1) + ' colores: se para sola ' + (np === 1 ? 'una vez' : np + ' veces') + ' para que cambies la bobina' : '',
    '🖨️ En tu ' + I.nombre + ' · ' + P.e + ' ' + P.largo + ' · ' + mat,
    av ? av.t : '',
    o.cal ? '🎯 Tu ' + I.nombre + ' está calibrada: agujeros y encajes a su medida' : '',
    np ? '🧭 Con colores se queda en su postura: las paradas van por altura'
      : es3mf ? '📦 Es un 3MF: si su diseñador dejó postura y soporte, se respetan'
        : '🧭 Busca sola la mejor postura y pone soporte de árbol solo donde haga falta',
    '🌳 Soporte con ' + coma(aireSoporte(a.capa, mat)) + ' mm de aire y 0,6 a los lados: se quita con la mano',
    '🪵 Lo mide con tu Bambu: troncos firmes que no se doblan',
    '🧲 Borde (brim) solo si hace falta para que no se despegue · la costura, detrás',
    a.tiempo + (a.k === 'normal' ? '' : ' que el Normal'),
  ].filter(Boolean);
}

// Lo que se sabe AL ACABAR (la respuesta del programa del PC): para «Cómo ha quedado». r = respuesta de desktop.acabado
export function cintaResultado(r, paradas) {
  r = r || {};
  const g = v => coma(Math.round(v * 10) / 10);
  return [
    r.experto ? /* (14-11 noche: lo primero, la nota del 🧠 experto) */ (SEMAFORO[r.experto.semaforo] || '🧠') + ' Experto 3D: ' + r.experto.nota + '/100 · ' + r.experto.titular : '',
    r.posturaNombre ? '📐 Colocada: ' + r.posturaNombre : '',
    r.posturaNombre || r.soporte != null ? (r.soporte >= 0.3 ? '🌳 Soporte ≈ ' + g(r.soporte) + ' g · ' + (r.delDisenador ? 'el de su diseñador, que gasta menos' : r.arreglo === 'normal' ? 'normal ajustado (el de árbol dejaba algo en el aire)' : 'fácil de quitar') : '✨ Sin soporte') : '',
    r.recolocada ? '🧩 Recolocada para que quepa en tu cama, con todas sus piezas' : '',
    r.piePegado ? '🦶 Un soporte alto nace encima de la pieza: su pie va pegado para que no se suelte' : '',
    r.troncoGordo ? '🌳 Troncos de soporte más gordos y con doble pared: no se doblan' : '',
    paradas ? '🌈 ' + paradas + (paradas === 1 ? ' parada' : ' paradas') + ' de color puestas: las ves en la barra de capas' : '',
    // 14-11 noche · 🧠 el experto: marcas medidas, aire medido y lo que hay que saber
    r.soporte >= 0.3 && r.marcasVista != null && r.marcasVista < 300 ? (r.marcasVista < 100 ? '✨ El soporte casi no toca lo que se ve' : '👀 El soporte toca ' + coma(Math.round(r.marcasVista / 10) / 10) + ' cm² que se ven (poco)') : '',
    r.soporte >= 0.3 && r.hueco > 0 ? '🌬️ Aire medido entre soporte y pieza: ' + coma(r.hueco) + ' mm' : '',
    ...((r.experto && r.experto.consejos) || []).map(c => (c.icono || '⚠️') + ' ' + c.texto),
  ].filter(Boolean); // («si no lo ves, míralo en la barra de abajo de Windows» ya lo dice la tarjeta debajo del título)
}

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
// opts.directo (14-11-2026, desde el cotizador) = sin esta ventana: abre YA con lo elegido allí. Biou: «cuando pongo lo que quiero no
//   abre bien»: le salía otra ventana preguntando lo mismo (y más consejos). Las zonas de color guardadas de ese producto se respetan.
// 16-11-2026 · 🛟 EL ORIGINAL, SIEMPRE A MANO. Biou (el día que se partieron los soportes del Pájaro en la P1P): «si el sistema no sabe
// generar unos soportes correctos… que permita abrir el archivo original, descargarlo, llevarlo a Bambu Studio y preparar los soportes
// a mano. El original nunca debe perderse ni sobrescribirse». Se abre una COPIA idéntica (desktop/host/original.go): si en Bambu le das
// a Guardar, el original no se toca. Antes «Abrirlo tal cual» abría el mismo archivo del producto.
function origenEl(ruta, nombre, opts, remoto, cerrar) {
  const local = !remoto && desktop.on && !!ruta && typeof desktop.original === 'function';
  if (!local && typeof opts.talCual !== 'function') return null;
  const hace = que => async ev => {
    const b = ev.currentTarget; b.disabled = true;
    try {
      // 16-11 (noche): «Abrir el original» va por el mismo camino que «tal cual» (abrirEnBambu): sabe si el archivo está en ESTE PC o hay
      // que bajarlo de la nube (el portátil no tiene la ruta de la torre), y el programa abre siempre una COPIA (bambu-abrir → copiaParaAbrir).
      if (que === 'bambu' && typeof opts.talCual === 'function') { cerrar(); return opts.talCual(); }
      const r = await desktop.original(ruta, que);
      if (que === 'bambu') { cerrar(); toast(r && r.abierto ? '📂 Abierto en Bambu el ORIGINAL de «' + (nombre || r.nombre) + '» (una copia: pon el soporte a tu gusto y guarda sin miedo)' : 'No encuentro Bambu Studio en este PC. La copia del original está en ' + (r && r.copia), r && r.abierto ? 'ok' : 'warn', 9000); }
      else if (que === 'bajar') toast('⬇️ Copia del original en Descargas: ' + String(r.copia || '').split(/[\\/]/).pop(), 'ok', 8000);
      else toast('📁 Te enseño dónde está el original (no se ha copiado ni tocado nada)', 'ok', 6000);
    } catch (e) { toast('No se pudo: ' + (e.message || e), 'bad', 8000); }
    b.disabled = false;
  };
  return h('div.ab-orig', { 'data-orig': '1' },
    h('div.ab-orig-t', h('b', '🛟 ¿Prefieres poner el soporte tú?'), h('small', 'El archivo original del diseñador, sin tocar. Se abre una copia: el original nunca se pisa.')),
    h('div.ab-orig-bs',
      h('button.btn.sm.ab-orig-bambu', { type: 'button', onclick: hace('bambu') }, '📂 Abrir el original en Bambu'),
      local ? h('button.btn.ghost.sm.ab-orig-bajar', { type: 'button', onclick: hace('bajar') }, '⬇️ Bajar el original') : null,
      local ? h('button.btn.ghost.sm.ab-orig-carpeta', { type: 'button', onclick: hace('carpeta') }, '📁 Ver dónde está') : null));
}
export function elegirAcabado(ruta, nombre, opts = {}) {
  const remoto = typeof opts.remoto === 'function';
  const directo = !!opts.directo && !remoto; // (14-11: si va a la TORRE, sí sale la ventana: avisa en grande de que se abre allí)
  if (!remoto && !desktop.on) return toast('El acabado se prepara en el programa del PC.', 'warn', 6000);
  if (!remoto && !ruta) return toast('Para el acabado necesito el archivo guardado en el PC (ábrelo desde un producto con su STL).', 'warn', 7000);
  const esc = Number(opts.escala) > 0 ? Number(opts.escala) : 100;
  const med = opts.medidas && Number(opts.medidas.x) > 0 ? { x: opts.medidas.x * esc / 100, y: opts.medidas.y * esc / 100, z: opts.medidas.z * esc / 100 } : null;
  const caben = IMPRESORAS.filter(I => !med || cabeEn(I, med));
  let rec = acabadoPorK(opts.acabado || recordado('acabado') || 'normal').k;
  let imp = opts.imp && caben.some(I => I.k === opts.imp) ? opts.imp : (caben.find(I => I.k === recordado('imp')) || caben[0] || IMPRESORAS[0]).k;
  let mat = matDe(opts.mat || recordado('mat') || 'PLA'); // (14-11 noche: el del producto o el último)
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
  const md = directo ? { close() { } } : modal(opts.titulo || '🖨️ Abrir en Bambu', body, null, { size: 'wide' }); // (14-11: «directo» = sin ventana)
  const tiles = h('div.ab-acab'), imps = h('div.ab-imps'), resumen = h('div.ab-resumen');
  const placaTit = h('p.ab-subp'), placas = h('div.ab-ams.ab-placas'), mats = h('div.ab-ams.ab-mats'), avisoEl = h('p.ab-aviso-placa');
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
    // 14-11 noche · 🛏️ la placa de ESA impresora (se recuerda) y 🧵 el material
    const pl = placaDe(imp), P = placaPorK(pl), av = avisoPlaca(mat, pl);
    mount(placaTit, '🛏️ ¿Qué placa tiene puesta la ' + I.nombre + '?');
    mount(placas, PLACAS.map(X => h('button.ab-am.ab-placa' + (pl === X.k ? '.on' : ''), { type: 'button', 'data-placa': X.k, onclick: () => { guardaPlaca(imp, X.k); pinta(); } }, h('span.ab-e', X.e), h('b', X.nombre), h('small', X.largo))));
    mount(mats, ['PLA', 'PETG'].map(m => h('button.ab-am.ab-mat' + (mat === m ? '.on' : ''), { type: 'button', 'data-mat': m, onclick: () => { mat = m; pinta(); } }, h('span.ab-e', m === 'PLA' ? '🌽' : '🧪'), h('b', m), h('small', m === 'PLA' ? 'Figuras y decoración: el acabado más bonito' : 'Fuerte y aguanta el calor: piezas que se usan'))));
    mount(avisoEl, av ? av.t : '');
    avisoEl.classList.toggle('no', !!(av && av.no)); avisoEl.hidden = !av;
    bAbrir.disabled = !!(av && av.no);
    mount(resumen, h('span', a.e + ' ' + a.nombre + ' · ' + I.nombre + (esc !== 100 ? ' · tamaño ' + esc + ' %' : '') + (opts.paredes || opts.relleno ? ' · reforzada' : '') + (np ? ' · 🌈 ' + (np + 1) + ' colores (' + np + (np === 1 ? ' parada)' : ' paradas)') : '') + (calDe(imp) ? ' · 🎯 calibrada' : '')), h('span.tiny.muted', ajustesTxt(a, extra) + ' · ' + mat + ' · ' + P.e + ' ' + P.largo + ' · ' + (np ? 'se para sola en cada cambio de color' : 'de un color')));
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
    const avP = avisoPlaca(mat, placaDe(imp)); if (avP && avP.no) { toast(avP.t, 'warn', 7000); return; } // (14-11 noche)
    extra.mat = mat; extra.placa = placaDe(imp); recordar('mat', mat);
    const cal = calDe(imp); if (cal) extra.cal = JSON.stringify(cal.claves); else delete extra.cal;
    md.close();
    recordar('acabado', rec); recordar('imp', imp);
    const a = acabadoPorK(rec), I = impPorK(imp);
    window.__acabadoPedido = { rec, imp, extra: Object.assign({}, extra) };
    if (remoto) return opts.remoto(imp, rec, extra);
    // 14-11-2026 · una tarjeta fija con el % de verdad hasta que se abre (antes: un aviso de 5 s y minutos sin nada)
    // 14-11 (tarde) · y debajo, la CINTA: lo que va a llevar (acabado, capa, velocidad, temperatura…) y, al acabar, cómo ha quedado
    const pid = nuevoProg(), tj = tarjetaProgreso('🖨️ Laminando en tu Bambu… ' + a.nombre + ' · ' + I.nombre, { cinta: cintaAcabado({ a, I, extra, paradas: L.length, ruta, cal, mat, placa: extra.placa }) }), para = sigueProgreso(pid, f => tj.pon(f));
    try {
      const r = await desktop.acabado(ruta, imp, rec, Object.assign({}, extra, { prog: pid }));
      para(); tj.fin('✅ Listo: abierto en Bambu Studio', 'ok', (r && r.troncoFlojo ? '⚠️ Un tronco de soporte sigue fino: vigílalo al subir. ' : '') + 'Si no lo ves delante, míralo en la barra de abajo de Windows.', cintaResultado(r, L.length)); // (14-11 tarde: los troncos gordos y lo demás que va bien, en la cinta)
      window.__acabadoAbierto = r || null;
      // (14-11 tarde: lo que va bien —postura, gramos de soporte, troncos, pie pegado— ya pasa por la cinta de la tarjeta; en el aviso, solo lo de vigilar)
      toast('🖨️ Abierto en Bambu: ' + a.nombre + ' en la ' + I.nombre + ', listo para laminar.' + (L.length ? ' 🌈 Con ' + L.length + (L.length === 1 ? ' parada' : ' paradas') + ' de color.' : '') + (L.length && directo && a.capa >= 0.24 ? ' ⚠️ Con «' + a.nombre + '» el borde del color se nota escalonado: para colores, mejor Normal, Máxima calidad o Premium.' : '') + (r && r.torreSuelta ? ' ⚠️ Un soporte alto nace encima de la pieza y pegarle el pie estropeaba otro soporte: se queda como el diseñador, vigila que no se suelte al subir.' : '') + (r && r.troncoFlojo && !r.troncoGordo ? ' ⚠️ Hay un tronco de soporte alto y fino que no he podido engordar sin estropear otra cosa: vigílalo al subir.' : '') + (r && r.troncoFlojo && r.troncoGordo ? ' ⚠️ Aun así, un tronco sigue alto y fino: vigílalo al subir.' : ''), 'ok', 8000); // (12-11: cómo la ha colocado; 13-11: el pie pegado)
    } catch (e) {
      para(); tj.fin('❌ No se ha podido abrir', 'bad', String(e.message || e));
      if (typeof opts.siNoAqui === 'function' && noSePuedeAqui(e)) { tj.quita(); if (!esOrdenador()) toast('En este aparato no se puede (' + (e.message || e) + '): se lo encargo a la torre.', 'warn', 6000); return opts.siNoAqui(imp, rec, Object.assign({}, extra, { motivo: String(e.message || e) })); }
      toast('No se pudo preparar el acabado: ' + (e.message || e), 'bad', 8000);
    }
  }
  if (directo) { // 14-11: desde el cotizador, sin la ventana (con la calibración de esa impresora, si la tiene)
    return import('./r8/calibracion.js').then(m => { CAL = m; }).catch(() => { }).then(() => abrir());
  }
  pinta();
  mount(body,
    nombre ? h('p.ab-pieza', '📦 ' + nombre + (esc !== 100 ? ' · al ' + esc + ' %' : '')) : null,
    remoto ? (esOrdenador() && !desktop.on ? h('p.ab-remoto.ab-remoto-pc', '⚠️ Estás en la app de internet: se abrirá en el Bambu de la TORRE, no en este ordenador. Para abrirlo aquí, abre el programa CelebriDiseños con su icono.') : h('p.small.ab-remoto', '🖥️ Lo prepara la torre y se abre allí, en su Bambu Studio.')) : null, // (14-11: en un ordenador sin el programa, bien claro)
    h('h3.ab-paso', h('i', '1'), '¿Qué acabado?'), tiles,
    h('h3.ab-paso', h('i', '2'), '¿En qué impresora?'), imps, calEl, placaTit, placas,
    h('h3.ab-paso', h('i', '3'), '¿PLA o PETG?'), mats, avisoEl,
    h('h3.ab-paso', h('i', '4'), '¿De un color o con colores?', h('small.ab-paso-s', 'sin AMS: se para y cambias tú la bobina')), coloresEl,
    puedeSop ? h('h3.ab-paso.ab-paso-sop', h('i', '5'), '¿Con menos soportes?', h('small.ab-paso-s', 'la gira hasta que necesite el mínimo')) : null, puedeSop ? sopEl : null,
    resumen,
    origenEl(ruta, nombre, opts, remoto, () => md.close()),
    h('div.ab-pie', bAbrir,
      // (16-11 noche: vuelve a salir SIEMPRE. Esconderlo en el PC dejaba al portátil sin manera de abrirlo: la ruta es la de la torre.
      //  Ya no pisa nada: el programa abre una copia del original, comprobada por huella.)
      typeof opts.talCual === 'function' ? h('button.btn.ghost.sm.ab-talcual', { type: 'button', onclick: () => { md.close(); opts.talCual(); } }, 'Abrirlo tal cual, sin tocar nada') : null),
    h('p.tiny.muted.ab-nota', 'Usa el perfil de serie de esa impresora con estos ajustes (probado con tu Bambu Studio: 0 avisos). No cambia nada de tu Bambu Studio.'));
  return md;
}
