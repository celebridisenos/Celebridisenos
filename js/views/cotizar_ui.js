// ================= 10-11-2026 · 💶 COTIZAR ESTE PRODUCTO (ventana propia, desde la ficha de Productos) =================
// Biou: «que en productos pueda darle a un botón “cotizar este producto” y me pregunte si es para más tamaño o más peso de lo que
// ya está, y siempre con sus recomendaciones… que sea lo más top… con su propia interfaz bonita».
// Lo que pide el cliente (más grande · más fuerte = más peso · mejor acabado · impresora) a la izquierda; a la derecha, al momento:
// cuánto pedirle, lo que te cuesta, gramos, tiempo, medidas, mis consejos y la frase lista para mandarle.
// Con el programa del PC y el 3D del producto, cada opción se LAMINA con su Bambu (sello «MEDIDO»); si no, cuentas calibradas
// («ESTIMADO»). Las cuentas están en ../cotizar.js; los precios, con las mismas fórmulas de siempre (CL.prices).
import { h, mount, modal, toast, eur, copyText, btn, inp } from '../ui.js';
import { S, can, mutate, upsertLocal, emit } from '../store.js';
import { desktop } from '../desktop.js';
import { filesOf, fetchFile, extOf } from '../files.js';
import { textoMedidas } from '../medidas3d.js';
import { analizar3D, horasTxt } from '../datos3d.js';
import { ACABADOS, IMPRESORAS, CALIBRADO, horasNormal, acabadoPorK, impPorK, estimar, consejos, mejorImpresora, geoDe, recordar, recordado, cabeEn, escalaParaMedida, medidasDeCm } from '../cotizar.js';
import { sumaMovil, ponMovil, cuotaMovil, variantesDe, puedeGuardar } from '../variantes.js'; // 11-11-2026: 📱 con o sin móvil y 🏷️ variantes
import { ventanaGuardar, nombreDe, igualQue } from './variantes_ui.js';
import { elegirAcabado, dibujoImpresora, ajustesTxt } from '../acabado_ui.js';
import { rutaDePieza } from '../pieza_taller.js';
import { nuevoProg, sigueProgreso } from '../progreso_bambu.js'; // 14-11: «Laminando con tu Bambu… %»

const CL = window.CL;
const numero = v => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
const coma = v => String(v).replace('.', ',');
const TAM = [100, 110, 120, 130, 150, 200];
const PESO = [0, 10, 20, 30, 40, 50];
const ES_3D = n => ['stl', '3mf', 'obj'].includes(extOf(n));
const medTxt = m => m ? textoMedidas({ dimX: m.x, dimY: m.y, dimZ: m.z }) : '';
const tiempoTxt = hh => hh > 0 ? horasTxt(Math.round(hh * 3600)) : '—';

// el producto tal como se vende hoy: gramos y horas de su fila de la calculadora (o los de Bambu de su ficha), medidas de su ficha
export function baseDe(p) {
  const fila = (S.t.calculadora || []).find(c => CL.norm(c.nombre) === CL.norm(p.nombre)) || {};
  const g = numero(fila.gramos) || numero(p.bambuGramos), hh = numero(fila.horas) || numero(p.horas), mo = numero(fila.horasMO);
  const x = numero(p.dimX), y = numero(p.dimY), z = numero(p.dimZ);
  return { gramos: g, horas: hh, horasMO: mo, medidas: x > 0 && y > 0 && z > 0 ? { x, y, z } : null, geo: null, material: String(p.material || '').toUpperCase().includes('PETG') ? 'PETG' : 'PLA', fila };
}

// precio con las fórmulas de siempre (CL.prices, como el Cotizador y Productos → Costes)
// (11-11-2026: movil = sumar lo que se recupera del móvil y la SIM en cada pedido, como «Me cuesta» de la ficha)
export function precioDe(gramos, horas, horasMO, movil) {
  if (!(gramos > 0)) return null;
  const gastos = {}; (S.t.gastos || []).forEach(x => { gastos[CL.norm(x.nombre)] = Number(x.coste) || 0; });
  const r = CL.prices({ gramos, horas, horasMO: horasMO || 0, pintado: 'No' }, Object.assign({ gramosBobina: 1000 }, S.cfg.precios || {}, { negocioPedido: movil ? cuotaMovil() : 0 }), gastos);
  return { r, coste: r.desglose.costeTotal, rec: r.recomendado.wallapop, min: r.minimo.wallapop, vinted: r.recomendado.vinted };
}

// texto para el cliente (corto, de tú, como habla él)
export function fraseCliente(p, e, r, precio, dias) {
  const a = acabadoPorK(e.acabado), esc = Number(e.escala) || 100, fz = Number(e.fuerza) || 0;
  return ['¡Hola! 😊 Te paso el presupuesto de «' + p.nombre + '»:',
    esc !== 100 ? '• Tamaño: ' + (esc > 100 ? 'un ' + (esc - 100) + ' % más grande' : 'un ' + (100 - esc) + ' % más pequeño') + (r.medidas ? ' (' + medTxt(r.medidas) + ')' : '') : (r.medidas ? '• Medidas: ' + medTxt(r.medidas) : null),
    fz > 0 ? '• Más resistente: paredes más gruesas y más relleno (pesa un ' + Math.round((r.fuerza.razon - 1) * 100) + ' % más)' : null,
    a.k === 'premium' ? '• Acabado premium: muy liso, más fuerte y con la cara de arriba planchada' : a.k === 'maxima' ? '• Acabado de máxima calidad: muy liso y con todo el detalle' : a.k === 'rapida' ? '• Impresión rápida' : a.k === 'prueba' ? '• Pieza de prueba (para ver medidas y encaje)' : null,
    precio ? '• Precio: ' + eur(precio.rec * (e.cant || 1)) + (e.cant > 1 ? ' (' + e.cant + ' unidades, ' + eur(precio.rec) + ' cada una)' : '') : null,
    dias > 0 ? '• Lo tendría listo en ' + dias + (dias === 1 ? ' día.' : ' días.') : null,
    '¿Te lo preparo?'].filter(Boolean).join('\n');
}

export async function abrirCotizador(p, opts = {}) {
  const B = baseDe(p);
  const E = { acabado: 'normal', imp: '', escala: 100, fuerza: 0, cant: 1, autoImp: true, movil: sumaMovil(p.id) };
  const dias = (S.cfg.pedidos && S.cfg.pedidos.plazoDias) || 7;
  const costes = can('productos.costes');
  let ruta = null, puedeMedir = false; const MED = new Map(); let turno = 0, temp = null;
  const body = h('div.cq');
  const md = modal('💶 Cotizar · ' + p.nombre, body, null, { size: 'cqm', onclose: () => { clearTimeout(temp); turno++; } });
  // ---------- cabecera ----------
  let foto = null; try { const R = await import('./responder.js'); const f = R.fotoDe(p); foto = f ? R.fotoImg(f, p) : null; } catch (e) { }
  const cab = h('div.cq-cab', h('div.cq-foto', foto || h('span', '📦')), h('div.grow',
    h('b.cq-nombre', p.nombre), h('div.cq-ahora', 'Así lo vendes ahora: ', h('b', Number(p.precio) > 0 ? eur(p.precio) : 'sin precio'), B.gramos > 0 ? ' · ' + coma(B.gramos) + ' g' : '', B.horas > 0 ? ' · ' + tiempoTxt(B.horas) : '', B.medidas ? ' · ' + medTxt(B.medidas) : ''),
    h('div.cq-fuente', h('span.cq-sello')), h('div.cq-vars')));
  const sello = cab.querySelector('.cq-sello'), varsEl = cab.querySelector('.cq-vars');
  const pintaSello = () => { const m = MED.get(clave()); if (m && m.midiendo) sello.textContent = '⏳ Laminando con tu Bambu… ' + (m.pct || 0) + ' %' + (m.fase ? ' · ' + m.fase : ''); }; // (14-11: solo el sello, sin repintar todo)
  // 11-11-2026 · 🏷️ las variantes que ya vende: un clic y el cotizador se pone así
  function pintaVars() {
    const L = variantesDe(p.id);
    mount(varsEl, L.length ? [h('span.cq-vars-t', '🏷️ Ya lo vendes así:'), L.slice(0, 8).map(v => h('button.cq-var' + (igualQue(p, E) === v ? '.on' : ''), { type: 'button', 'data-id': v.id, title: 'Poner el cotizador como esta variante', onclick: () => cargaVariante(v) }, nombreDe(v), h('b', eur(v.pr))))] : []);
  }
  function cargaVariante(v) {
    if (!B.medidas && Array.isArray(v.med) && v.med[0] > 0) { const k = 100 / (Number(v.esc) || 100); B.medidas = { x: v.med[0] * k, y: v.med[1] * k, z: v.med[2] * k }; }
    const o = { escala: Number(v.esc) || 100, fuerza: Number(v.fz) || 0, acabado: v.ac || 'normal' };
    if (v.imp) { o.imp = v.imp; o.autoImp = false; }
    cambia(o);
  }
  // ---------- lo que pide el cliente ----------
  const izq = h('div.cq-izq'), der = h('div.cq-der');
  mount(body, cab, h('div.cq-cuerpo', izq, der));
  const sec = (ic, t, sub, ...kids) => h('section.cq-sec', h('h3', h('span.cq-ic', ic), t, sub ? h('small', sub) : null), ...kids);
  // 11-11-2026 · 📐 medidas a mano: las tres de DESTINO (se agranda igual en todo: escribes una y las otras se ajustan) y, si la ficha no
  // tiene medidas, las de AHORA (para saber si cabe y qué medidas saldrán). Biou: «que me deje también manualmente las medidas y que haga el cálculo».
  const caja = (lbl) => inp({ type: 'number', min: 0.1, step: 0.1, inputmode: 'decimal', 'aria-label': lbl, placeholder: 'cm' });
  const anchoIn = caja('Ancho en cm'), largoIn = caja('Largo en cm'), altoIn = caja('Alto en cm');
  const bX = caja('Ancho de ahora en cm'), bY = caja('Largo de ahora en cm'), bZ = caja('Alto de ahora en cm');
  let editaBase = false;
  const gIn = inp({ type: 'number', min: 0, step: 0.1, inputmode: 'decimal', 'aria-label': 'Gramos a mano', placeholder: 'g' });
  const hIn = inp({ type: 'number', min: 0, step: 0.05, inputmode: 'decimal', 'aria-label': 'Horas a mano', placeholder: 'h' });
  [gIn, hIn].forEach(x => { x.onchange = () => { const g = numero(gIn.value), hh = numero(hIn.value); if (g > 0) { B.gramos = g; B.gramosMano = true; } if (hh > 0) { B.horas = hh; B.horasMano = true; } cambia({}); }; }); // (12-11: las de a mano ya son con el Normal de ahora)
  [bX, bY, bZ].forEach(x => { x.onchange = () => { const m = medidasDeCm(bX.value, bY.value, bZ.value); if (m) { B.medidas = m; B.medMano = true; editaBase = false; cambia({}); } }; });
  async function guardaMedidasFicha() {
    const m = B.medidas; if (!m) return;
    try {
      const datos = { dimX: m.x, dimY: m.y, dimZ: m.z, dimEstado: 'manual' }, orig = { dimX: p.dimX ?? '', dimY: p.dimY ?? '', dimZ: p.dimZ ?? '', dimEstado: p.dimEstado ?? '' };
      const r = await mutate('productos.guardar', { id: p.id, datos, orig }, { onlineOnly: true, label: 'Medidas de ' + p.nombre });
      if (r && r.id) { upsertLocal('productos', r); emit(); Object.assign(p, datos); }
      B.medMano = false; toast('📐 Medidas guardadas en la ficha', 'ok'); pintaIzq();
    } catch (e) { toast(e.message || String(e), 'bad'); }
  }
  const pctIn = inp({ type: 'number', min: 10, max: 1000, step: 5, inputmode: 'numeric', 'aria-label': 'Tamaño en %', placeholder: '%' });
  function pintaIzq() {
    const r = estimar(Object.assign({ base: B }, E));
    mount(izq,
      sec('📏', 'Más grande', '¿qué tamaño quiere?',
        h('div.cq-chips', TAM.map(t => h('button.cq-chip' + (E.escala === t ? '.on' : ''), { type: 'button', 'data-tam': t, onclick: () => cambia({ escala: t }) }, t === 100 ? 'Igual' : t === 200 ? 'El doble' : '+' + (t - 100) + ' %'))),
        h('div.cq-fila', h('label', 'Tamaño ', pctIn, ' %')),
        B.medidas && !editaBase ? h('div.cq-mide', h('span.cq-mide-t', 'o que mida (cm):'), h('label', 'Ancho ', anchoIn), h('label', 'Largo ', largoIn), h('label', 'Alto ', altoIn), h('small.tiny.muted', 'Escribe una y las otras se ajustan solas: se agranda igual en todo.')) : null,
        B.medidas && !editaBase ? h('div.cq-med', '📐 ', h('b', medTxt(r.medidas)), B.medMano ? h('span.cq-mano', ' · ahora mide ' + medTxt(B.medidas) + ' (escrito por ti) ',
          h('button.cq-link', { type: 'button', onclick: () => { editaBase = true; pintaIzq(); } }, '✏️ cambiar'),
          can('productos.editar') ? h('button.cq-link.cq-guarda-med', { type: 'button', onclick: guardaMedidasFicha }, '💾 guardar en la ficha') : null) : null)
          : h('div.cq-base', h('b', '📐 ¿Cuánto mide ahora?'), h('span.tiny.muted', ' (la ficha no tiene medidas: escríbelas y te digo si cabe y qué medidas saldrán)'),
            h('div.cq-mide', h('label', 'Ancho ', bX), h('label', 'Largo ', bY), h('label', 'Alto ', bZ), h('small.tiny.muted', 'en cm, como sale hoy')))),
      sec('💪', 'Más fuerte', 'más peso = paredes más gruesas y más relleno',
        h('div.cq-chips', PESO.map(w => { const f = estimar(Object.assign({ base: B }, E, { fuerza: w })).fuerza, mal = w > 0 && (f.pasaLimite || f.noLlega);
          return h('button.cq-chip' + (E.fuerza === w ? '.on' : '') + (mal ? '.ojo' : ''), { type: 'button', 'data-peso': w, title: mal ? 'No lo recomiendo: más allá de +' + f.limitePct + ' % solo se añade relleno' : '', onclick: () => cambia({ fuerza: w }) }, w === 0 ? 'Igual' : '+' + w + ' %', mal ? h('i', '⚠️') : null); })),
        h('div.cq-aj', '🧱 ', h('b', r.ajustes.paredes + ' paredes · ' + r.ajustes.relleno + ' % de relleno'), r.fuerza.limitePct > 0 ? h('span.tiny.muted', ' · lo útil llega hasta +' + r.fuerza.limitePct + ' %') : null)),
      sec('✨', 'Acabado', '¿cómo lo quiere de bonito?',
        h('div.cq-acab', ACABADOS.map(a => h('button.cq-ac' + (E.acabado === a.k ? '.on' : ''), { type: 'button', 'data-k': a.k, style: '--c:' + a.color, title: a.para, onclick: () => cambia({ acabado: a.k }) }, h('span', a.e), h('b', a.nombre))))),
      sec('🖨️', 'Impresora', E.autoImp ? 'la elijo yo: la más rápida en la que cabe' : '',
        h('div.cq-imps', IMPRESORAS.map(I => { const no = !!r.medidas && !cabeEn(I, r.medidas);
          return h('button.cq-imp' + (E.imp === I.k ? '.on' : '') + (no ? '.no' : ''), { type: 'button', 'data-k': I.k, style: '--c:' + I.color, disabled: no, onclick: () => cambia({ imp: I.k, autoImp: false }) }, dibujoImpresora(I.k), h('b', I.nombre, I.nueva ? h('em', 'NUEVA') : null), h('small', no ? 'no cabe' : coma(I.x / 10) + ' cm')); }))),
      sec('🔢', 'Unidades', '', h('div.cq-fila', h('input.inp.cq-cant', { type: 'number', min: 1, step: 1, value: E.cant, 'aria-label': 'Unidades', onchange: ev => cambia({ cant: Math.max(1, Math.round(numero(ev.target.value)) || 1) }) }))));
    pctIn.value = E.escala;
    if (B.medidas) { anchoIn.value = Math.round(B.medidas.x * E.escala / 100) / 10; largoIn.value = Math.round(B.medidas.y * E.escala / 100) / 10; altoIn.value = Math.round(B.medidas.z * E.escala / 100) / 10;
      if (editaBase) { bX.value = Math.round(B.medidas.x) / 10; bY.value = Math.round(B.medidas.y) / 10; bZ.value = Math.round(B.medidas.z) / 10; } }
    pctIn.onchange = () => cambia({ escala: Math.min(1000, Math.max(10, Math.round(numero(pctIn.value)) || 100)) });
    [[anchoIn, 'x'], [largoIn, 'y'], [altoIn, 'z']].forEach(([el, eje]) => { el.onchange = () => { const s = escalaParaMedida(B.medidas, eje, el.value); if (s) cambia({ escala: s }); }; });
  }
  // ---------- el resultado ----------
  // lo medido «como lo vende hoy»: el Normal al 100 %, con SUS paredes y relleno (los del acabado Normal)
  function claveNormal() { const n = acabadoPorK('normal'); return ['normal', E.imp, 100, n.paredes, n.relleno].join('|'); }
  function clave() { const r = estimar(Object.assign({ base: B }, E)); return [E.acabado, E.imp, E.escala, r.ajustes.paredes, r.ajustes.relleno].join('|'); }
  function pintaDer() {
    const r = estimar(Object.assign({ base: B }, E)), m = MED.get(clave()), mBase = MED.get(claveNormal());
    // 13-11-2026 (60.12.6): el Normal FUERTE (4 paredes, 25 %) gasta más plástico que los gramos guardados del producto. Su precio de
    // ahora es el del Normal de hoy: lo de más (o de menos) se cuenta desde ahí, no desde los gramos de antes.
    const gNormal = B.gramos > 0 ? estimar({ base: B, acabado: 'normal', imp: E.imp, escala: 100, fuerza: 0 }).gramos : B.gramos;
    // medido: gramos y tiempo de SU Bambu; la proporción frente a lo medido «normal» se aplica a lo del producto (si no, lo medido tal cual)
    let g = r.gramos, hh = r.horas, de = 'ESTIMADO';
    if (m && m.ok) { g = Math.round(m.gramos * 10) / 10; hh = Math.round(m.segundos / 36) / 100; de = 'MEDIDO'; }
    const pr = costes ? precioDe(g, hh, B.horasMO, E.movil) : null;
    const refG = de === 'MEDIDO' && mBase && mBase.ok ? mBase.gramos : gNormal; // (lo medido, frente a lo medido)
    // el precio PARTE DE LO QUE COBRA AHORA y le suma lo que cuesta de más (plástico, luz y tiempo con sus precios); nunca baja del mínimo.
    // (si no, un producto que vende a 12 € y su calculadora dice 6,50 € saldría «más fuerte: pídele 7 €»)
    const ahora = Number(p.precio) || 0;
    const prBase = pr ? (de === 'MEDIDO' && mBase && mBase.ok ? precioDe(mBase.gramos, mBase.segundos / 3600, B.horasMO, E.movil) : precioDe(gNormal, horasNormal(B), B.horasMO, E.movil)) : null; // (12-11 y 13-11: con el Normal de ahora, horas y gramos)
    if (pr && prBase && ahora > 0) {
      const extra = pr.rec - prBase.rec, calc = pr.rec;
      pr.calc = calc; pr.extra = extra; pr.rec = Math.max(pr.min, Math.round((ahora + extra) * 10) / 10);
      pr.vinted = Math.max(pr.min, Math.round((pr.rec + (pr.vinted - calc)) * 10) / 10);
    }
    const C = consejos(E, r);
    if (m && m.ok && m.avisos && m.avisos.length) C.unshift({ n: 'no', t: 'Tu Bambu da ' + m.avisos.length + ' aviso al laminarla así: «' + m.avisos[0] + '». Revísalo antes de imprimir.' });
    if (m && m.ok && !(m.avisos || []).length) C.push({ n: 'ok', t: 'Laminada de verdad con tu Bambu así: 0 avisos.' });
    if (m && m.error) C.push({ n: 'ojo', t: 'Tu Bambu no ha podido laminarla así (' + m.error + '): los números son ESTIMADOS.' });
    sello.textContent = de === 'MEDIDO' ? '✅ MEDIDO con tu Bambu (laminada así)' : (m && m.midiendo ? '⏳ Laminando con tu Bambu… ' + (m.pct || 0) + ' %' + (m.fase ? ' · ' + m.fase : '') : (puedeMedir ? '≈ ESTIMADO · en un momento lo mido con tu Bambu' : '≈ ESTIMADO (calibrado con tus laminados)'));
    sello.className = 'cq-sello ' + (de === 'MEDIDO' ? 'medido' : 'estimado');
    const dif = pr && ahora > 0 ? Math.round((pr.rec - ahora) * 100) / 100 : null;
    const I = impPorK(E.imp), a = acabadoPorK(E.acabado), cuota = cuotaMovil();
    const sinMv = pr ? precioDe(g, hh, B.horasMO, false) : null, ya = igualQue(p, E);
    const ponMv = async si => { if (si === E.movil) return; E.movil = si; pintaDer();
      if (puedeGuardar()) { try { await ponMovil(p.id, si); toast(si ? '📱 A este producto le sumo el móvil y la SIM' : '📱 A este producto ya no le sumo el móvil y la SIM', 'ok'); } catch (e) { toast(e.message || String(e), 'bad'); } }
      else toast('Solo para este cálculo: para guardarlo hace falta el permiso «Cambiar la configuración».', 'warn'); };
    const manoG = h('div.cq-mano-g', h('span', '✏️ Gramos y horas (los dice Bambu Studio al laminar): '), h('label', gIn, ' g'), h('label', hIn, ' h'));
    if (B.gramosMano) { gIn.value = B.gramos || ''; hIn.value = B.horas || ''; }
    mount(der,
      !costes ? h('div.cq-precio', h('p.muted', '🔒 Para ver precios hace falta el permiso «Ver costes».'))
        : !pr ? h('div.cq-precio', h('p', '⚖️ Este producto no tiene sus gramos apuntados en la calculadora. ' + (puedeMedir ? 'Espera: lo estoy midiendo con tu Bambu. O escríbelos tú:' : 'Escríbelos y te calculo el precio:')), manoG)
        : h('div.cq-precio', h('small', 'PÍDELE'), h('b.cq-rec', eur(pr.rec * E.cant)),
          dif !== null && Math.abs(dif) >= 0.05 ? h('span.cq-dif' + (dif > 0 ? '.mas' : '.menos'), (dif > 0 ? '+' : '−') + eur(Math.abs(dif)) + ' sobre tu precio de ahora') : null,
          h('div.cq-precio-l', h('span', 'No bajes de ', h('b', eur(pr.min * E.cant))), h('span', 'Te cuesta ', h('b', eur(pr.coste * E.cant))), h('span', 'Vinted ', h('b', eur(pr.vinted * E.cant))), pr.calc ? h('span', 'Tu calculadora ', h('b', eur(pr.calc * E.cant))) : null),
          cuota > 0 ? h('div.cq-movil', h('button.cq-mv' + (!E.movil ? '.on' : ''), { type: 'button', 'data-mv': 'no', onclick: () => ponMv(false) }, h('small', 'Sin móvil'), h('b', eur(sinMv.coste * E.cant))),
            h('button.cq-mv' + (E.movil ? '.on' : ''), { type: 'button', 'data-mv': 'si', onclick: () => ponMv(true) }, h('small', 'Con móvil y SIM'), h('b', eur((sinMv.coste + cuota) * E.cant))),
            h('span.tiny', E.movil ? '📱 Te cuesta con el móvil y la SIM (' + eur(cuota) + ' por pedido)' : '📱 Te cuesta sin el móvil y la SIM')) : null,
          B.gramosMano ? manoG : null),
      h('div.cq-datos',
        h('div', h('i', '⚖️'), h('small', 'Plástico'), h('b', g > 0 ? coma(g) + ' g' : '—'), refG > 0 && g > 0 && Math.abs(g / refG - 1) >= 0.005 ? h('em', (g >= refG ? '+' : '−') + Math.abs(Math.round((g / refG - 1) * 100)) + ' %') : null),
        h('div', h('i', '⏱️'), h('small', 'Tiempo'), h('b', tiempoTxt(hh))),
        h('div', h('i', '📐'), h('small', 'Medidas'), h('b', r.medidas ? medTxt(r.medidas) : '—')),
        h('div', h('i', '🖨️'), h('small', 'Impresora'), h('b', I.nombre), h('em', a.e + ' ' + a.nombre))),
      // 14-11-2026 · Biou: «siempre aconsejando». Solo salen los AVISOS (⚠️ y ⛔); lo que solo dice que va bien, no.
      C.some(c => c.n !== 'ok') ? h('div.cq-consejos', h('h4', '⚠️ Ojo'), C.filter(c => c.n !== 'ok').map(c => h('div.cq-c.' + c.n, h('i', c.n === 'ojo' ? '⚠️' : '⛔'), h('span', c.t)))) : null,
      h('div.cq-cliente', h('div.row', h('h4.grow', '📋 Para mandarle al cliente'), btn('Copiar', () => copyText(fraseCliente(p, E, r, pr, dias)), { cls: 'primary sm cq-copiar', icon: 'copy' })), h('pre.cq-frase', fraseCliente(p, E, r, pr, dias))),
      h('div.cq-botones',
        costes && pr ? btn(ya ? '🏷️ Ya guardada como «' + nombreDe(ya) + '» · cambiar' : '🏷️ Guardar y poner a la venta', () => ventanaGuardar(p, { E: Object.assign({}, E), r, g, hh, de, precio: pr.rec, minimo: pr.min, coste: pr.coste, movil: E.movil }, ya, () => { pintaVars(); pintaDer(); }),
          { cls: 'primary cq-variante', title: 'Lo apunta como VARIANTE de este producto: su tamaño, fuerza y acabado, su precio y dónde lo vendes. Se ve en la ficha.' }) : null,
        btn('🖨️ Abrir en Bambu así', abrirBambuAsi, { cls: 'cq-bambu', title: 'Se abre con este tamaño, esta fuerza, este acabado y esta impresora' }),
        can('pedidos.crear') ? btn('🧾 Hacer pedido con este precio', () => hacerPedido(r, pr), { cls: 'cq-pedido' }) : null),
      h('p.tiny.muted.cq-nota', de === 'MEDIDO' ? 'Gramos y tiempo de tu Bambu Studio, laminada exactamente así (' + ajustesTxt(a, r.ajustes) + ', en la ' + I.nombre + '). ' + (pr && pr.calc ? 'El precio parte de lo que lo vendes ahora (' + eur(ahora) + ') y le suma lo que cuesta de más. ' : '') + 'El precio es ORIENTATIVO, con tus precios de Configuración.'
        : 'ESTIMADO con cuentas calibradas contra ' + CALIBRADO.laminados + ' laminados de tu Bambu (' + CALIBRADO.piezas + ' productos tuyos): se equivocan de media un ' + CALIBRADO.errorG + ' % en gramos y un ' + CALIBRADO.errorT + ' % en tiempo. Parte de cómo lo vendes ahora (acabado Normal)' + (pr && pr.calc ? ': el precio es tu precio de ahora (' + eur(ahora) + ') más lo que cuesta de más' : '') + '. El precio es ORIENTATIVO, con tus precios de Configuración.'));
    window.__cotizar = { E: Object.assign({}, E), r, g, hh, de, precio: pr && pr.rec, calc: pr && pr.calc, minimo: pr && pr.min, coste: pr && pr.coste, costeSin: sinMv && sinMv.coste, cuota, movil: E.movil, variantes: variantesDe(p.id).length, ya: ya && ya.id, consejos: C.map(c => c.n + ':' + c.t), medido: !!(m && m.ok) };
  }
  function cambia(o) {
    Object.assign(E, o);
    if (E.autoImp || !cabeEn(impPorK(E.imp), estimar(Object.assign({ base: B }, E)).medidas)) { E.imp = mejorImpresora(estimar(Object.assign({ base: B }, E)).medidas) || 'a1'; }
    recordar('imp', E.imp);
    pintaIzq(); pintaDer(); pintaVars(); programaMedida();
  }
  // ---------- medir con su Bambu (con el programa del PC y el 3D del producto) ----------
  function programaMedida() {
    if (!puedeMedir) return;
    clearTimeout(temp); const k = clave(); if (MED.has(k)) return;
    temp = setTimeout(() => medir(k), 700);
  }
  async function medir(k, sinPintar) {
    if (MED.has(k)) return; const [acab, imp, esc, w, i] = k.split('|'); const yo = ++turno;
    MED.set(k, { midiendo: true, pct: 0 }); if (!sinPintar) pintaDer();
    const pid = nuevoProg(), para = sigueProgreso(pid, f => { const x = MED.get(k); if (x && x.midiendo && f.ok) { x.pct = Math.max(x.pct || 0, Math.min(99, f.pct || 0)); x.fase = f.fase || ''; if (k === clave()) pintaSello(); } });
    try {
      const res = await desktop.cotizarMedir(ruta, imp, acab, { escala: Number(esc) !== 100 ? esc : '', paredes: w, relleno: i, mat: B.material, prog: pid });
      MED.set(k, Object.assign({ ok: true }, res));
    } catch (e) { MED.set(k, { error: String(e.message || e).replace(/^Bambu no ha podido laminarla: /, '') }); }
    para();
    if (yo === turno || sinPintar) { pintaIzq(); pintaDer(); }
  }
  async function abrirBambuAsi() {
    const r = estimar(Object.assign({ base: B }, E)), pz = await import('./productos.js');
    const o = { acabado: E.acabado, imp: E.imp, escala: E.escala, medidas: B.medidas, titulo: '🖨️ Abrir en Bambu · como lo has presupuestado', directo: true }; // (14-11: sin otra ventana)
    if (Number(E.fuerza) > 0) { o.paredes = r.ajustes.paredes; o.relleno = r.ajustes.relleno; }
    pz.acabadoDeProducto(p, o);
  }
  async function hacerPedido(r, pr) {
    const P = await import('./pedidos.js'), a = acabadoPorK(E.acabado);
    const pers = [E.escala !== 100 ? 'Tamaño ' + E.escala + ' %' + (r.medidas ? ' (' + medTxt(r.medidas) + ')' : '') : '', E.fuerza > 0 ? 'Reforzada: ' + r.ajustes.paredes + ' paredes y ' + r.ajustes.relleno + ' % de relleno' : '', E.acabado !== 'normal' ? 'Acabado ' + a.nombre : '', 'Impresora ' + impPorK(E.imp).nombre].filter(Boolean).join(' · ');
    const prN = precioDe(B.gramos, horasNormal(B), B.horasMO, E.movil), extra = pr && prN ? Math.round((pr.coste - prN.coste) * E.cant * 100) / 100 : 0;
    md.close();
    P.orderForm({ producto: p.nombre, productoId: p.id, cantidad: E.cant, precio: pr ? pr.rec : p.precio, personalizacion: pers, plazoDias: dias,
      gastosPedido: extra > 0 ? [{ concepto: 'Cotizado: ' + pers + ' (plástico y luz de más)', coste: extra }] : [] }, true);
  }
  // ---------- arranque ----------
  E.imp = recordado('imp') && cabeEn(impPorK(recordado('imp')), B.medidas) ? recordado('imp') : (mejorImpresora(B.medidas) || 'a1');
  E.autoImp = !recordado('imp'); B.imp = E.imp; // (las horas de ahora cuentan como de esta impresora)
  if (opts.escala) E.escala = opts.escala; if (opts.fuerza) E.fuerza = opts.fuerza; if (opts.acabado) E.acabado = opts.acabado;
  if (opts.variante) { const v = opts.variante; E.escala = Number(v.esc) || 100; E.fuerza = Number(v.fz) || 0; E.acabado = v.ac || 'normal'; if (v.imp) { E.imp = v.imp; E.autoImp = false; }
    if (!B.medidas && Array.isArray(v.med) && v.med[0] > 0) { const k = 100 / E.escala; B.medidas = { x: v.med[0] * k, y: v.med[1] * k, z: v.med[2] * k }; } }
  pintaIzq(); pintaDer(); pintaVars();
  // la forma de la pieza (para estimar mejor) y, en el PC con Bambu, medir lo que se vaya pidiendo
  (async () => {
    try {
      const subido = filesOf('productos', p.id).filter(a => ES_3D(a.nombre))[0];
      if (desktop.on) { try { const f = await rutaDePieza(p); ruta = f && f.ruta; } catch (e) { ruta = null; } }
      let buf = null, nombre = '';
      if (ruta) { try { buf = await desktop.file(ruta); nombre = ruta.split(/[\\/]/).pop(); } catch (e) { buf = null; } }
      if (!buf && subido) { try { buf = await (await fetchFile(subido)).arrayBuffer(); nombre = subido.nombre; } catch (e) { buf = null; } }
      if (buf) {
        const A = await analizar3D(buf, nombre), geo = geoDe(A);
        if (geo) B.geo = geo;
        if (!B.medidas && A.medidas) B.medidas = { x: A.medidas.x, y: A.medidas.y, z: A.medidas.z };
        if (!(B.gramos > 0) && A.gramos) B.gramos = A.gramos.v;
        if (!(B.horas > 0) && A.horas) B.horas = A.horas.v;
      }
      puedeMedir = !!(ruta && desktop.on && desktop.cotizarMedir);
      if (!body.isConnected) return;
      cambia({});
      if (puedeMedir) { await medir(claveNormal(), true); programaMedida(); }
    } catch (e) { console.warn('cotizar', e); }
  })();
  return md;
}
