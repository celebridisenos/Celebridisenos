// ================= v16.2 · ⚡ COTIZADOR 3D =================
// Sueltas un STL o un 3MF y en dos segundos: la pieza girando, lo que mide, lo que gasta, LO QUE TE CUESTA, el precio
// recomendado en cada canal y el texto del presupuesto listo para mandar al cliente. Sin crear nada ni guardar nada:
// es para contestar rápido a «¿cuánto me costaría esto?». Si luego lo quieres vender: «Crear producto con esto».
// Usa los mismos datos y las mismas fórmulas que el resto del programa (datos3d.js + CL.prices): nada inventado; lo que
// el archivo no trae (el tiempo de un STL) se pide, y lo estimado se marca como ESTIMADO.
import { h, mount, btn, toast, eur, inp, field, icon, copyText } from '../ui.js';
import { S, can } from '../store.js';
import { analizar3D, horasTxt } from '../datos3d.js';
import { parse3D, viewer } from '../stl.js';
import { textoMedidas, esArchivo3D } from '../medidas3d.js';

const CL = window.CL;
const CANALES = [['wallapop', 'Wallapop / directo'], ['vinted', 'Vinted'], ['etsy', 'Etsy']];
let E = null; // lo último cotizado (se conserva al cambiar de pantalla y volver)

export function render(el) {
  const costes = can('productos.costes');
  const escena = h('div.cz-escena'), panel = h('div.cz-panel');
  const elegir = h('input', { type: 'file', accept: '.stl,.3mf,.obj', style: { display: 'none' }, 'aria-label': 'Elegir archivo 3D', onchange: () => { const f = elegir.files[0]; elegir.value = ''; if (f) abrir(f); } });
  el.append(h('div.page-head', h('div', h('h1', '⚡ Cotizador 3D'), h('div.muted.small', 'Suelta un STL o un 3MF y te digo al momento cuánto cuesta hacerlo y a cuánto venderlo.')),
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
      E = { file, A, pos, gramos: A.gramos ? A.gramos.v : '', horas: A.horas ? Math.floor(A.horas.v) : '', min: A.horas ? Math.round((A.horas.v % 1) * 60) : '', mo: '', cant: 1, dias: (S.cfg.pedidos && S.cfg.pedidos.plazoDias) || 7 };
      pinta();
    } catch (e) { toast(e.message, 'bad', 8000); pinta(); }
  }

  function vacio() {
    cerrarVista();
    const zona = h('button.cz-soltar', { type: 'button', onclick: () => elegir.click(),
      ondragover: e => { e.preventDefault(); zona.classList.add('sobre'); }, ondragleave: () => zona.classList.remove('sobre'),
      ondrop: e => { e.preventDefault(); zona.classList.remove('sobre'); const f = [...(e.dataTransfer.files || [])].find(x => esArchivo3D(x.name)); if (f) abrir(f); else toast('Suelta un archivo STL, 3MF u OBJ.', 'warn'); } },
      h('div.cz-cubo', h('i'), h('i'), h('i')), h('h2', 'Suelta aquí el STL o el 3MF'), h('p', 'o pulsa para elegirlo. No se guarda ni se sube a ningún sitio: solo se lee en este aparato.'));
    mount(escena, zona);
    mount(panel, h('div.card.col', h('h3', '¿Para qué sirve?'),
      h('div.cz-pasos', [['💬', 'Un cliente te manda un archivo y pregunta el precio'], ['⚡', 'Lo sueltas aquí: medidas, gramos y tiempo salen solos'], ['💶', 'Ves lo que te cuesta y a cuánto venderlo en cada canal'], ['📋', 'Copias el presupuesto y se lo mandas']].map(([i, t]) => h('div', h('i', i), h('span', t)))),
      h('p.tiny.muted', 'Con un 3MF laminado (Bambu Studio, MakerWorld) los gramos y el tiempo son los REALES del laminador. Con un STL, los gramos se estiman y el tiempo lo pones tú.')));
  }

  function calc() {
    const g = Number(E.gramos) || 0, hh = (Number(E.horas) || 0) + (Number(E.min) || 0) / 60, n = Math.max(1, Math.round(Number(E.cant) || 1));
    if (!costes || !(g > 0)) return null;
    const gastos = {}; (S.t.gastos || []).forEach(x => { gastos[CL.norm(x.nombre)] = Number(x.coste) || 0; });
    const r = CL.prices({ gramos: g, horas: hh, horasMO: (Number(E.mo) || 0) / 60, pintado: 'No' }, Object.assign({ gramosBobina: 1000 }, S.cfg.precios || {}), gastos);
    return { r, n, sinTiempo: !(hh > 0), coste: r.desglose.costeTotal, rec: r.recomendado.wallapop, min: r.minimo.wallapop };
  }
  const nombrePieza = () => String(E.file.name).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  function textoCliente(c) {
    const A = E.A, n = c ? c.n : Math.max(1, Number(E.cant) || 1), total = c ? Math.round(c.rec * n * 100) / 100 : null;
    return ['¡Hola! 😊 Te paso el presupuesto:', '• Pieza: ' + nombrePieza() + ' (' + textoMedidas({ dimX: A.medidas.x, dimY: A.medidas.y, dimZ: A.medidas.z }) + ')',
      A.material ? '• Material: ' + A.material : null, total != null ? '• ' + n + (n === 1 ? ' unidad: ' : ' unidades: ') + eur(total) + (n > 1 ? ' (' + eur(c.rec) + ' cada una)' : '') : null,
      Number(E.dias) > 0 ? '• Lo tendría listo en ' + E.dias + (Number(E.dias) === 1 ? ' día.' : ' días.') : null, '¿Te lo preparo?'].filter(Boolean).join('\n');
  }

  const resultados = h('div.cz-res');
  function pintaResultados() {
    const c = calc();
    if (!costes) return mount(resultados, h('div.card.flat', h('p.muted', '🔒 Para ver costes y precios hace falta el permiso «Ver costes». Las medidas y el consumo sí se ven arriba.')));
    if (!c) return mount(resultados, h('div.card.flat', h('p.muted', 'Pon los gramos de filamento para calcular el precio.')));
    const d = c.r.desglose, x = v => eur(Math.round(v * c.n * 100) / 100);
    mount(resultados,
      c.sinTiempo ? h('div.cz-aviso', '⏱️ Falta el tiempo de impresión: sin él no se cuenta la luz y el precio sale más bajo de lo real. Ponlo arriba (lo dice el laminador).') : null,
      h('div.rt', h('div.rt-c.coste', h('span.rt-t', 'ME CUESTA' + (c.n > 1 ? ' · ' + c.n + ' UDS' : '')), h('span.rt-v', x(c.coste)), c.n > 1 ? h('span.rt-s', eur(c.coste) + ' cada una') : null,
          h('details.rt-d', h('summary', 'Ver desglose (por unidad)'), h('div.rt-dl', [['Filamento', d.filamento], ['Electricidad', d.luz], ['Mano de obra', d.manoObra], ['Extras', d.gastosExtra], ['IVA', d.iva], ['Embalaje (coste interno)', d.embalaje], ['Envío', d.envio]].filter(l => l[1] > 0).map(l => h('div', h('span', l[0]), h('b', eur(l[1]))))))),
        h('div.rt-c.min', h('span.rt-t', 'NO BAJES DE'), h('span.rt-v', x(c.min)), h('span.rt-g.poco', 'ganas ' + x(c.min - c.coste))),
        h('div.rt-c.rec', h('span.rt-t', 'PÍDELE'), h('span.rt-v', x(c.rec)), h('span.rt-g', 'ganas ' + x(c.rec - c.coste))),
        h('div.rt-can', CANALES.map(([k, t]) => h('span', t + ' ', h('b', x(c.r.recomendado[k])))))),
      h('div.card.col.cz-msg', h('div.row', h('b.grow', '📋 Presupuesto para el cliente'), btn('Copiar', () => copyText(textoCliente(c)), { cls: 'primary sm', icon: 'copy' })), h('pre.cz-texto', textoCliente(c))));
  }

  function pinta() {
    if (!E) return vacio();
    const A = E.A, L = A.laminado, aj = A.ajustes, et = real => h('em.a3d-e' + (real ? '.real' : ''), real ? 'REAL' : 'ESTIMADO');
    cerrarVista();
    const cv = h('canvas.stl-view.cz-canvas', { 'aria-label': 'Vista 3D de la pieza' });
    mount(escena, E.pos ? cv : h('div.cz-leyendo', icon('cube', 'l'), h('span.muted', 'Sin vista 3D para este archivo')),
      h('div.cz-pie', h('b.ellipsis', E.file.name), h('span.muted.tiny', textoMedidas({ dimX: A.medidas.x, dimY: A.medidas.y, dimZ: A.medidas.z }))));
    if (E.pos) requestAnimationFrame(() => { try { vista = viewer(cv, E.pos); } catch (e) { mount(escena, h('div.cz-leyendo', h('span.muted', e.message))); } });
    const num = (k, extra) => inp(Object.assign({ type: 'number', min: 0, value: E[k], inputmode: 'decimal', oninput: e => { E[k] = e.target.value; pintaResultados(); } }, extra || {}));
    mount(panel,
      h('div.a3d', h('div.a3d-t', '✅ Leído del archivo'), h('div.a3d-g',
        h('div.a3d-d', h('i', '📐'), h('span', h('small', 'Medidas'), h('b', textoMedidas({ dimX: A.medidas.x, dimY: A.medidas.y, dimZ: A.medidas.z })), A.medidas.estado === 'revisar' ? h('em.a3d-e', 'REVISA LA ESCALA') : null)),
        A.gramos ? h('div.a3d-d', h('i', '⚖️'), h('span', h('small', 'Filamento'), h('b', String(A.gramos.v).replace('.', ',') + ' g'), et(A.gramos.real))) : null,
        A.horas ? h('div.a3d-d', h('i', '⏱️'), h('span', h('small', 'Tiempo'), h('b', A.horas.texto), et(true))) : null,
        A.material ? h('div.a3d-d', h('i', '🧵'), h('span', h('small', 'Material'), h('b', A.material + (L && L.filamentos.length > 1 ? ' · ' + L.filamentos.length + ' colores' : '')))) : null,
        aj && aj.impresora ? h('div.a3d-d', h('i', '🖨️'), h('span', h('small', 'Preparado para'), h('b', aj.impresora))) : null),
        A.gramos && !A.gramos.real ? h('div.tiny.muted', 'Gramos ESTIMADOS con ' + A.gramos.de + '. Si el laminador te da otro número, cámbialo abajo.') : null,
        L && L.piezas > 1 ? h('div.tiny.muted', 'OJO: la bandeja lleva ' + L.piezas + ' piezas: gramos y tiempo son de todas juntas.') : null),
      h('div.card.col', h('div.form.cz-form',
        field('Gramos de filamento', num('gramos', { step: 0.1, 'aria-label': 'Gramos de filamento' })),
        field('Tiempo de impresión', h('div.row', num('horas', { step: 1, placeholder: 'h', 'aria-label': 'Horas de impresión' }), h('span.muted', 'h'), num('min', { step: 1, max: 59, placeholder: 'min', 'aria-label': 'Minutos de impresión' }), h('span.muted', 'min'))),
        field('Mano de obra (minutos)', num('mo', { step: 1, placeholder: 'Quitar soportes, lijar…', 'aria-label': 'Mano de obra en minutos' })),
        field('Unidades', num('cant', { step: 1, min: 1, 'aria-label': 'Unidades' })),
        field('Plazo (días)', num('dias', { step: 1, 'aria-label': 'Plazo en días' })))),
      resultados,
      h('div.row.wrap', can('productos.editar') ? btn('➕ Crear producto con esto', crearProducto, { icon: 'cube' }) : null, btn('Otro archivo', () => elegir.click(), { cls: 'ghost' }), btn('Vaciar', () => { E = null; pinta(); }, { cls: 'ghost' })));
    pintaResultados();
  }
  async function crearProducto() {
    const c = calc(), P = await import('./productos.js');
    P.productWizard({ nombre: nombrePieza().replace(/(^|\s)\S/g, x => x.toUpperCase()), precio: c ? c.rec : '', tipo: '3D' }, { nuevo: true, archivo: E.file });
  }
  // se puede soltar el archivo en cualquier parte de la pantalla
  const sobre = e => { if ([...(e.dataTransfer && e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); };
  const suelta = e => { const f = [...(e.dataTransfer && e.dataTransfer.files || [])].find(x => esArchivo3D(x.name)); if (f && el.isConnected) { e.preventDefault(); abrir(f); } };
  el.addEventListener('dragover', sobre); el.addEventListener('drop', suelta);
  pinta();
  return { destroy: cerrarVista, abrir };
}
