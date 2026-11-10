// ================= v16.2 · ⚡ COTIZADOR 3D =================
// Sueltas un STL o un 3MF y en dos segundos: la pieza girando, lo que mide, lo que gasta, LO QUE TE CUESTA, el precio
// recomendado en cada canal y el texto del presupuesto listo para mandar al cliente. Sin crear nada ni guardar nada:
// es para contestar rápido a «¿cuánto me costaría esto?». Si luego lo quieres vender: «Crear producto con esto».
// Usa los mismos datos y las mismas fórmulas que el resto del programa (datos3d.js + CL.prices): nada inventado; lo que
// el archivo no trae (el tiempo de un STL) se pide, y lo estimado se marca como ESTIMADO.
// 04-11-2026 · 📏 TAMAÑO → PRECIO (Biou: «cuando alguien me pide aumentar el tamaño… cuanto más tamaño, más precio»):
//   también se puede ELEGIR UNO DE TUS PRODUCTOS (sin archivo) y darle más o menos tamaño; gramos, tiempo y medidas se
//   recalculan (tamano.js), se avisa si no cabe en la A1 mini o en la P1P, y con «Hacer pedido» el precio pasa al pedido.
import { h, mount, btn, toast, eur, inp, field, icon, copyText } from '../ui.js';
import { S, can } from '../store.js';
import { analizar3D, horasTxt } from '../datos3d.js';
import { parse3D, viewer } from '../stl.js';
import { textoMedidas, esArchivo3D } from '../medidas3d.js';
import { aTamano, pctDesdeAlto, textoCabe, ATAJOS } from '../tamano.js';

const CL = window.CL;
const CANALES = [['wallapop', 'Wallapop / directo'], ['vinted', 'Vinted'], ['etsy', 'Etsy']];
let E = null; // lo último cotizado (se conserva al cambiar de pantalla y volver)
// v18: un archivo soltado en CUALQUIER pantalla del programa llega aquí (app.js lo deja con cotizarArchivo y abre esta pantalla)
let PEND = null, ABRIR = null;
export function cotizarArchivo(f) { if (ABRIR && document.querySelector('.cz-soltar, .cz-res, .cz')) { try { ABRIR(f); return; } catch (e) { } } PEND = f; }

const numero = v => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
const coma = v => String(v).replace('.', ',');
// horas decimales → { h, min } sin que salga «60 min»
function partir(horas) { let hh = Math.floor(horas), mm = Math.round((horas - hh) * 60); if (mm === 60) { hh++; mm = 0; } return { h: hh, min: mm }; }
const medTxt = m => m ? textoMedidas({ dimX: m.x, dimY: m.y, dimZ: m.z }) : '';

export function render(el) {
  const costes = can('productos.costes');
  const escena = h('div.cz-escena'), panel = h('div.cz-panel');
  const elegir = h('input', { type: 'file', accept: '.stl,.3mf,.obj', style: { display: 'none' }, 'aria-label': 'Elegir archivo 3D', onchange: () => { const f = elegir.files[0]; elegir.value = ''; if (f) abrir(f); } });
  el.append(h('div.page-head', h('div', h('h1', '⚡ Cotizador 3D'), h('div.muted.small', 'Suelta un STL o un 3MF, o elige uno de tus productos, y te digo cuánto cuesta hacerlo y a cuánto venderlo. También más grande o más pequeño.')),
    h('div.right', E ? btn('Otro archivo', () => elegir.click(), { icon: 'plus' }) : null)), h('div.cz', escena, panel), elegir);
  let vista = null;
  const cerrarVista = () => { if (vista) { try { vista.destroy(); } catch (e) { } vista = null; } };

  async function abrir(file) {
    if (!esArchivo3D(file.name)) return toast('Ese archivo no es un STL, 3MF u OBJ.', 'bad');
    mount(escena, h('div.cz-leyendo', h('div.cz-giro'), h('b', 'Leyendo «' + file.name + '»…')));
    try {
      const buf = await file.arrayBuffer(), A = await analizar3D(buf, file.name);
      if (!A.medidas) throw new Error(A.notas[0] || 'No he podido leer ese archivo.');
      let pos = null; try { pos = await parse3D(buf, file.name); } catch (e) { }
      const aj = A.ajustes, hv = A.horas ? partir(A.horas.v) : null;
      E = { file, A, pos, prod: null, pct: 100, gramos: A.gramos ? A.gramos.v : '', horas: hv ? hv.h : '', min: hv ? hv.min : '', mo: '', cant: 1, dias: (S.cfg.pedidos && S.cfg.pedidos.plazoDias) || 7,
        base: { gramos: A.gramos ? A.gramos.v : 0, horas: A.horas ? A.horas.v : 0, medidas: A.medidas, volMm3: (A.volumenCm3 || 0) * 1000, areaMm2: (A.areaCm2 || 0) * 100,
          opc: aj ? { material: aj.material, densidad: aj.densidad, relleno: aj.relleno, paredes: aj.paredes, boquilla: aj.boquilla, capa: aj.capa } : { material: A.material } } };
      pinta();
    } catch (e) { toast(e.message, 'bad', 8000); pinta(); }
  }

  // 04-11: uno de TUS productos (sin archivo): gramos y tiempo de su fila de la calculadora, medidas de su ficha
  async function elegirProducto(p) {
    if (!p) return;
    const fila = (S.t.calculadora || []).find(c => CL.norm(c.nombre) === CL.norm(p.nombre)) || {};
    const g = numero(fila.gramos), hh = numero(fila.horas), mo = numero(fila.horasMO);
    const x = numero(p.dimX), y = numero(p.dimY), z = numero(p.dimZ);
    let foto = null, fotoImg = null;
    try { const R = await import('./responder.js'); foto = R.fotoDe(p); fotoImg = R.fotoImg; } catch (e) { }
    const hv = partir(hh);
    E = { file: null, A: null, pos: null, prod: p, foto, fotoImg, pct: 100, gramos: g > 0 ? g : '', horas: hh > 0 ? hv.h : '', min: hh > 0 ? hv.min : '', mo: mo > 0 ? Math.round(mo * 60) : '', cant: 1,
      dias: (S.cfg.pedidos && S.cfg.pedidos.plazoDias) || 7, base: { gramos: g, horas: hh, medidas: x > 0 && y > 0 && z > 0 ? { x, y, z } : null, opc: {} } };
    pinta();
  }

  function vacio() {
    cerrarVista();
    const zona = h('button.cz-soltar', { type: 'button', onclick: () => elegir.click(),
      ondragover: e => { e.preventDefault(); zona.classList.add('sobre'); }, ondragleave: () => zona.classList.remove('sobre'),
      ondrop: e => { e.preventDefault(); zona.classList.remove('sobre'); const f = [...(e.dataTransfer.files || [])].find(x => esArchivo3D(x.name)); if (f) abrir(f); else toast('Suelta un archivo STL, 3MF u OBJ.', 'warn'); } },
      h('div.cz-cubo', h('i'), h('i'), h('i')), h('h2', 'Suelta aquí el STL o el 3MF'), h('p', 'o pulsa para elegirlo. No se guarda ni se sube a ningún sitio: solo se lee en este aparato.'));
    mount(escena, zona);
    const caja = h('div.cz-prod-campo');
    const tuyo = h('div.card.col.cz-prod', h('h3', '📦 O elige uno de tus productos'), h('p.tiny.muted', 'Para cuando un cliente lo quiere MÁS GRANDE (o más pequeño): lo eliges, le das el tamaño y te sale el precio.'), caja);
    import('./pedidos.js').then(P => {
      const input = inp({ placeholder: 'Escribe el nombre del producto…', autocomplete: 'off', 'aria-label': 'Producto para cotizar' });
      mount(caja, P.selectorConFoto(input, p => elegirProducto(p)));
    }).catch(() => mount(caja, h('p.muted.tiny', 'No he podido cargar tus productos.')));
    mount(panel, tuyo, h('div.card.col', h('h3', '¿Para qué sirve?'),
      h('div.cz-pasos', [['💬', 'Un cliente te manda un archivo o te pide algo tuyo más grande'], ['⚡', 'Lo sueltas o lo eliges: medidas, gramos y tiempo salen solos'], ['💶', 'Ves lo que te cuesta y a cuánto venderlo en cada canal'], ['📋', 'Copias el presupuesto y se lo mandas']].map(([i, t]) => h('div', h('i', i), h('span', t)))),
      h('p.tiny.muted', 'Con un 3MF laminado (Bambu Studio, MakerWorld) los gramos y el tiempo son los REALES del laminador. Con un STL, los gramos se estiman y el tiempo lo pones tú.')));
  }

  function calcCon(g, hh, n) {
    if (!costes || !(g > 0)) return null;
    const gastos = {}; (S.t.gastos || []).forEach(x => { gastos[CL.norm(x.nombre)] = Number(x.coste) || 0; });
    const r = CL.prices({ gramos: g, horas: hh, horasMO: (Number(E.mo) || 0) / 60, pintado: 'No' }, Object.assign({ gramosBobina: 1000 }, S.cfg.precios || {}), gastos);
    return { r, n, sinTiempo: !(hh > 0), coste: r.desglose.costeTotal, rec: r.recomendado.wallapop, min: r.minimo.wallapop };
  }
  function calc() {
    const g = Number(E.gramos) || 0, hh = (Number(E.horas) || 0) + (Number(E.min) || 0) / 60, n = Math.max(1, Math.round(Number(E.cant) || 1));
    return calcCon(g, hh, n);
  }
  const nombrePieza = () => E.prod ? String(E.prod.nombre || 'Pieza') : String(E.file.name).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  // las medidas a ESTE tamaño (las del archivo o las de la ficha, escaladas)
  const tam = () => aTamano(E.base, E.pct);
  const medidasAhora = () => { const t = tam(); return t.medidas || null; };
  function textoCliente(c) {
    const A = E.A, n = c ? c.n : Math.max(1, Number(E.cant) || 1), total = c ? Math.round(c.rec * n * 100) / 100 : null, m = medidasAhora();
    return ['¡Hola! 😊 Te paso el presupuesto:', '• Pieza: ' + nombrePieza() + (m ? ' (' + medTxt(m) + ')' : ''),
      E.pct !== 100 ? '• Tamaño: ' + E.pct + ' %' + (E.pct > 100 ? ' (más grande que el normal)' : ' (más pequeño que el normal)') : null,
      A && A.material ? '• Material: ' + A.material : null, total != null ? '• ' + n + (n === 1 ? ' unidad: ' : ' unidades: ') + eur(total) + (n > 1 ? ' (' + eur(c.rec) + ' cada una)' : '') : null,
      Number(E.dias) > 0 ? '• Lo tendría listo en ' + E.dias + (Number(E.dias) === 1 ? ' día.' : ' días.') : null, '¿Te lo preparo?'].filter(Boolean).join('\n');
  }

  const resultados = h('div.cz-res');
  function pintaResultados() {
    const c = calc();
    if (!costes) return mount(resultados, h('div.card.flat', h('p.muted', '🔒 Para ver costes y precios hace falta el permiso «Ver costes». Las medidas y el consumo sí se ven arriba.')));
    if (!c) return mount(resultados, h('div.card.flat', h('p.muted', E.prod ? 'Este producto no tiene los gramos apuntados en la calculadora: ponlos arriba (los dice Bambu Studio) y sale el precio.' : 'Pon los gramos de filamento para calcular el precio.')));
    const d = c.r.desglose, x = v => eur(Math.round(v * c.n * 100) / 100);
    // 04-11: a otro tamaño, el precio de antes y el de ahora, uno al lado del otro
    const c100 = E.pct !== 100 && E.base.gramos > 0 ? calcCon(E.base.gramos, E.base.horas, c.n) : null;
    mount(resultados,
      c.sinTiempo ? h('div.cz-aviso', '⏱️ Falta el tiempo de impresión: sin él no se cuenta la luz y el precio sale más bajo de lo real. Ponlo arriba (lo dice el laminador).') : null,
      !c.sinTiempo && E.pct === 100 && E.A && E.A.horas && !E.A.horas.real && Math.abs(((Number(E.horas) || 0) + (Number(E.min) || 0) / 60) - (Math.floor(E.A.horas.v) + Math.round((E.A.horas.v % 1) * 60) / 60)) < 0.01 ? h('div.cz-nota.cz-hest', '⏱️ El tiempo (' + E.A.horas.texto + ') es ESTIMADO con los gramos y la altura de la pieza. Si ya la has laminado, pon arriba el de Bambu Studio y el precio será exacto.') : null,
      c100 ? h('div.cz-cmp', h('div', h('small', 'Tamaño normal'), h('b', x(c100.rec))), h('i', '→'), h('div.on', h('small', 'Al ' + E.pct + ' %'), h('b', x(c.rec))),
        h('span.cz-cmp-d', (c.rec >= c100.rec ? '+' : '−') + x(Math.abs(c.rec - c100.rec)))) : null,
      h('div.rt', h('div.rt-c.coste', h('span.rt-t', 'ME CUESTA' + (c.n > 1 ? ' · ' + c.n + ' UDS' : '')), h('span.rt-v', x(c.coste)), c.n > 1 ? h('span.rt-s', eur(c.coste) + ' cada una') : null,
          h('details.rt-d', h('summary', 'Ver desglose (por unidad)'), h('div.rt-dl', [['Filamento', d.filamento], ['Electricidad', d.luz], ['Vuestro trabajo', d.manoObra], ['Extras', d.gastosExtra], ['IVA', d.iva], ['Embalaje (sumado al precio)', d.embalaje], ['Envío', d.envio], ['Gastos del negocio (móvil…)', d.negocio]].filter(l => l[1] > 0).map(l => h('div', h('span', l[0]), h('b', eur(l[1]))))))),
        h('div.rt-c.min', h('span.rt-t', 'NO BAJES DE'), h('span.rt-v', x(c.min)), h('span.rt-g.poco', 'ganas ' + x(c.min - c.coste))),
        h('div.rt-c.rec', h('span.rt-t', 'PÍDELE (ORIENTATIVO)'), h('span.rt-v', x(c.rec)), h('span.rt-g', 'ganas ' + x(c.rec - c.coste))),
        h('div.rt-can', CANALES.map(([k, t]) => h('span', t + ' ', h('b', x(c.r.recomendado[k])))))),
      h('div.cz-nota.tiny.muted', 'Es un precio ORIENTATIVO: súbelo o bájalo como veáis. «Me cuesta» ya lleva dentro vuestro trabajo; por debajo de eso, no cobráis.'),
      h('div.card.col.cz-msg', h('div.row', h('b.grow', '📋 Presupuesto para el cliente'), btn('Copiar', () => copyText(textoCliente(c)), { cls: 'primary sm', icon: 'copy' })), h('pre.cz-texto', textoCliente(c))));
  }

  // 04-11 · 📏 el tamaño: atajos (75 %… 200 %), el % a mano o «que mida X cm de alto»
  const tamanoBox = h('div.card.col.cz-tam');
  let campos = {};
  // (al rehacer la caja se borra el campo con el foco: el navegador lanza su «change» en mitad del borrado → se suelta el foco antes y no se repite)
  let aplicando = false;
  function aplicaTamano(pct) {
    if (aplicando) return; aplicando = true;
    try { const a = document.activeElement; if (a && tamanoBox.contains(a) && a.blur) a.blur(); } catch (e) { }
    try { aplicaTamano2(pct); } finally { aplicando = false; }
  }
  function aplicaTamano2(pct) {
    E.pct = Math.min(1000, Math.max(10, Math.round(numero(pct)) || 100));
    const t = tam();
    if (E.base.gramos > 0) E.gramos = t.gramos;
    if (E.base.horas > 0) { const p = partir(t.horas); E.horas = p.h; E.min = p.min; }
    ['gramos', 'horas', 'min'].forEach(k => { if (campos[k]) campos[k].value = E[k]; });
    pintaTamano(); pintaResultados(); pintaPie();
  }
  function pintaTamano() {
    const t = tam(), z = E.base.medidas ? E.base.medidas.z : 0;
    const pctIn = inp({ type: 'number', min: 10, max: 1000, step: 5, value: E.pct, inputmode: 'numeric', 'aria-label': 'Tamaño en %', onchange: e => aplicaTamano(e.target.value) });
    const altoIn = z > 0 ? inp({ type: 'number', min: 0.5, step: 0.5, value: Math.round(t.medidas.z) / 10, inputmode: 'decimal', 'aria-label': 'Alto en cm', onchange: e => { const p = pctDesdeAlto(e.target.value, z); if (p) aplicaTamano(p); } }) : null;
    mount(tamanoBox, h('div.row', h('h3.grow', '📏 Tamaño'), E.pct !== 100 ? btn('Volver al 100 %', () => aplicaTamano(100), { cls: 'ghost sm' }) : null),
      h('div.cz-atajos', ATAJOS.map(p => h('button.chip.cz-pct' + (E.pct === p ? '.on' : ''), { type: 'button', 'data-pct': p, onclick: () => aplicaTamano(p) }, p + ' %'))),
      h('div.form.cz-form', field('Tamaño (%)', pctIn), altoIn ? field('O que mida de alto (cm)', altoIn) : null),
      t.medidas ? h('div.cz-tam-med', h('span', '📐 A este tamaño: '), h('b', medTxt(t.medidas))) : h('div.tiny.muted', 'Este producto no tiene las medidas en su ficha: el precio sí cambia, pero no sé si cabe en la impresora.'),
      t.medidas ? h('div.cz-cabe' + (t.cabe.every(c => c.cabe) ? '.ok' : t.cabe.some(c => c.cabe) ? '.medio' : '.no'), textoCabe(t)) : null,
      E.pct !== 100 ? h('div.cz-nota.tiny', '📏 Gramos y tiempo a este tamaño: ESTIMADOS (al agrandar, el plástico crece MÁS que el tamaño). ' + (t.de === 'malla' ? 'Calculado con la forma de la pieza. ' : 'Sin el archivo uso una regla media. ') + 'Para el número exacto: en Bambu Studio escálala al ' + E.pct + ' %, lamina y pon aquí los gramos y el tiempo.') : null);
  }
  const pie = h('div.cz-pie');
  function pintaPie() {
    const m = medidasAhora();
    // (con archivo, su nombre tal cual, como antes: «soporte_mando.stl»; con un producto, su nombre)
    mount(pie, h('b.ellipsis', (E.prod ? nombrePieza() : E.file.name) + (E.pct !== 100 ? ' · ' + E.pct + ' %' : '')), h('span.muted.tiny', medTxt(m)));
  }

  // (04-11: quitar el foco ANTES de vaciar el panel: si se borra el campo que tiene el foco, su «blur» mueve nodos a mitad y salta un error)
  const soltarFoco = () => { const a = document.activeElement; if (a && (panel.contains(a) || escena.contains(a)) && a.blur) a.blur(); };
  function pinta() {
    soltarFoco();
    if (!E) return vacio();
    const A = E.A, L = A && A.laminado, aj = A && A.ajustes, et = real => h('em.a3d-e' + (real ? '.real' : ''), real ? 'REAL' : 'ESTIMADO');
    cerrarVista();
    pintaPie();
    if (E.prod) {
      const cuadro = h('div.cz-foto', E.foto && E.fotoImg ? E.fotoImg(E.foto, E.prod) : h('div.cz-leyendo', icon('cube', 'l'), h('span.muted', 'Sin foto')));
      mount(escena, cuadro, pie);
    } else {
      const cv = h('canvas.stl-view.cz-canvas', { 'aria-label': 'Vista 3D de la pieza' });
      mount(escena, E.pos ? cv : h('div.cz-leyendo', icon('cube', 'l'), h('span.muted', 'Sin vista 3D para este archivo')), pie);
      if (E.pos) requestAnimationFrame(() => { try { vista = viewer(cv, E.pos); } catch (e) { mount(escena, h('div.cz-leyendo', h('span.muted', e.message))); } });
    }
    // lo que escribes a mano: al 100 % cambia la BASE (luego el tamaño parte de ahí); a otro tamaño es el número exacto de ese tamaño
    const alEscribir = k => e => {
      E[k] = e.target.value;
      if (E.pct === 100 && (k === 'gramos' || k === 'horas' || k === 'min')) { E.base.gramos = Number(E.gramos) || 0; E.base.horas = (Number(E.horas) || 0) + (Number(E.min) || 0) / 60; }
      pintaResultados();
    };
    const num = (k, extra) => (campos[k] = inp(Object.assign({ type: 'number', min: 0, value: E[k], inputmode: 'decimal', oninput: alEscribir(k) }, extra || {})));
    campos = {};
    const fila = E.prod ? (S.t.calculadora || []).find(c => CL.norm(c.nombre) === CL.norm(E.prod.nombre)) : null;
    const leido = E.prod
      ? h('div.a3d', h('div.a3d-t', '📦 De tu ficha'), h('div.a3d-g',
          E.base.medidas ? h('div.a3d-d', h('i', '📐'), h('span', h('small', 'Medidas (100 %)'), h('b', medTxt(E.base.medidas)))) : null,
          E.base.gramos > 0 ? h('div.a3d-d', h('i', '⚖️'), h('span', h('small', 'Filamento (100 %)'), h('b', coma(E.base.gramos) + ' g'))) : null,
          E.base.horas > 0 ? h('div.a3d-d', h('i', '⏱️'), h('span', h('small', 'Tiempo (100 %)'), h('b', horasTxt(Math.round(E.base.horas * 3600))))) : null,
          Number(E.prod.precio) > 0 ? h('div.a3d-d', h('i', '🏷️'), h('span', h('small', 'Lo vendes a'), h('b', eur(E.prod.precio)))) : null),
          !fila ? h('div.tiny.muted', 'No está en la calculadora: pon abajo los gramos y el tiempo.') : null)
      : h('div.a3d', h('div.a3d-t', '✅ Leído del archivo'), h('div.a3d-g',
          h('div.a3d-d', h('i', '📐'), h('span', h('small', 'Medidas'), h('b', medTxt(A.medidas)), A.medidas.estado === 'revisar' ? h('em.a3d-e', 'REVISA LA ESCALA') : null)),
          A.gramos ? h('div.a3d-d', h('i', '⚖️'), h('span', h('small', 'Filamento'), h('b', coma(A.gramos.v) + ' g'), et(A.gramos.real))) : null,
          A.horas ? h('div.a3d-d', h('i', '⏱️'), h('span', h('small', 'Tiempo'), h('b', A.horas.texto), et(A.horas.real))) : null, // v30.6.1: con un STL el tiempo sale ESTIMADO (antes no salía)
          A.material ? h('div.a3d-d', h('i', '🧵'), h('span', h('small', 'Material'), h('b', A.material + (L && L.filamentos.length > 1 ? ' · ' + L.filamentos.length + ' colores' : '')))) : null,
          aj && aj.impresora ? h('div.a3d-d', h('i', '🖨️'), h('span', h('small', 'Preparado para'), h('b', aj.impresora))) : null),
          A.gramos && !A.gramos.real ? h('div.tiny.muted', 'Gramos ESTIMADOS con ' + A.gramos.de + '. Si el laminador te da otro número, cámbialo abajo.') : null,
          L && L.piezas > 1 ? h('div.tiny.muted', 'OJO: la bandeja lleva ' + L.piezas + ' piezas: gramos y tiempo son de todas juntas.') : null);
    mount(panel, leido, tamanoBox,
      h('div.card.col', h('div.form.cz-form',
        field('Gramos de filamento', num('gramos', { step: 0.1, 'aria-label': 'Gramos de filamento' })),
        field('Tiempo de impresión', h('div.row', num('horas', { step: 1, placeholder: 'h', 'aria-label': 'Horas de impresión' }), h('span.muted', 'h'), num('min', { step: 1, max: 59, placeholder: 'min', 'aria-label': 'Minutos de impresión' }), h('span.muted', 'min'))),
        field('Vuestro trabajo (minutos)', num('mo', { step: 1, placeholder: 'Vacío = lo de Configuración', 'aria-label': 'Mano de obra en minutos' })),
        field('Unidades', num('cant', { step: 1, min: 1, 'aria-label': 'Unidades' })),
        field('Plazo (días)', num('dias', { step: 1, 'aria-label': 'Plazo en días' })))),
      resultados,
      h('div.row.wrap',
        can('pedidos.crear') ? btn('🧾 Hacer pedido con este precio', hacerPedido, { cls: 'primary' }) : null,
        !E.prod && can('productos.editar') ? btn('➕ Crear producto con esto', crearProducto, { icon: 'cube' }) : null,
        E.prod ? btn('💪 Más fuerte o mejor acabado', () => import('./cotizar_ui.js').then(m => m.abrirCotizador(E.prod, { escala: E.pct })), { cls: 'cz-cotizar', title: 'El cotizador del producto: tamaño, peso (resistencia), acabado e impresora, con mis consejos' }) : null,
        btn('Otro archivo', () => elegir.click(), { cls: 'ghost' }), btn('Vaciar', () => { E = null; pinta(); }, { cls: 'ghost' })));
    pintaTamano();
    pintaResultados();
  }
  async function crearProducto() {
    const c = calc(), P = await import('./productos.js');
    P.productWizard({ nombre: nombrePieza().replace(/(^|\s)\S/g, x => x.toUpperCase()), precio: c ? c.rec : '', tipo: '3D' }, { nuevo: true, archivo: E.file });
  }
  // 04-11: el precio (y el tamaño) pasan a un pedido nuevo; tú lo cambias si habéis quedado en otro
  async function hacerPedido() {
    const c = calc(), P = await import('./pedidos.js'), m = medidasAhora();
    const pers = E.pct !== 100 ? 'Tamaño ' + E.pct + ' %' + (m ? ' (' + medTxt(m) + ')' : '') : '';
    // (el beneficio del pedido sale del coste de la ficha, que es el del tamaño NORMAL: lo que cuesta de más el tamaño grande va como gasto del pedido)
    const c100 = E.prod && c && E.pct !== 100 && E.base.gramos > 0 ? calcCon(E.base.gramos, E.base.horas, c.n) : null;
    const extra = c100 ? Math.round((c.coste - c100.coste) * c.n * 100) / 100 : 0;
    P.orderForm({ producto: nombrePieza(), cantidad: c ? c.n : Math.max(1, Number(E.cant) || 1), precio: c ? c.rec : '', personalizacion: pers, plazoDias: Number(E.dias) > 0 ? Number(E.dias) : undefined,
      gastosPedido: extra > 0 ? [{ concepto: 'Más grande (' + E.pct + ' %): plástico y luz de más', coste: extra }] : [] }, true);
  }
  // se puede soltar el archivo en cualquier parte de la pantalla
  const sobre = e => { if ([...(e.dataTransfer && e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); };
  const suelta = e => { const f = [...(e.dataTransfer && e.dataTransfer.files || [])].find(x => esArchivo3D(x.name)); if (f && el.isConnected) { e.preventDefault(); abrir(f); } };
  el.addEventListener('dragover', sobre); el.addEventListener('drop', suelta);
  ABRIR = abrir; if (PEND) { const f = PEND; PEND = null; setTimeout(() => abrir(f), 60); } // v18: lo que se soltó en otra pantalla
  pinta();
  return { destroy: cerrarVista, abrir, elegirProducto };
}
