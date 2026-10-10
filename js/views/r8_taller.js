// ================= v20 · 🛠️ CelebriR8 BLENDER WORKSHOP · REPARACIÓN INTELIGENTE REVERSIBLE =================
// «Quiero aprovechar Blender sin tener que abrirlo» (la dueña, 10-10-2026). Aquí:
//  1. el MODELO: el de la mesa (lo que vienes generando) o un archivo (STL, OBJ, 3MF);
//  2. la COMPROBACIÓN, sola: agujeros, aristas raras, caras al revés, piezas sueltas, paredes finas y peso de la malla.
//     Cada dato lleva su etiqueta: MEDIDO (contado en la malla) o APROX. (las paredes finas se miran por cubitos);
//  3. la REPARACIÓN con Blender en segundo plano (o con el motor 3D si no hay Blender). Las opciones llevan su riesgo; las
//     que deforman (engrosar, rehacer) avisan antes;
//  4. el INFORME: antes y después, cuánto se ha QUITADO y AÑADIDO en mm (Blender lo mide de verdad contra el ORIGINAL), un
//     mapa de cambios en colores (aproximado), y deshacer / volver al original. El original no se toca nunca.
import { h, mount, btn, toast, confirmDlg } from '../ui.js';
import * as E from '../r8/estado.js';
import * as MA from '../r8/malla.js';
import * as C from '../r8/comun.js';

export async function montarTaller(el, ext = {}) {
  const D = await C.escritorio();
  const lienzo = h('canvas.r8p-cv', { 'aria-label': 'El modelo en 3D' }), vbar = h('div.r8p-vbar'), vacio = h('div.r8p-vacio'), izq = h('div.r8p-izq.r8t-izq'), der = h('div.r8p-der.r8t-der');
  const raiz = h('div.r8p.r8t', izq, h('div.r8p-vista', lienzo, vacio, vbar), der);
  el.appendChild(raiz);
  let esc = null; try { esc = await C.vista3d(lienzo); } catch (e) { mount(vacio, h('div', h('b', '⚠️ La vista 3D no arranca'), h('small', e.message))); }
  const S = { modo: 'actual', rev: null, revOrig: null, insp: null, blender: null, comp: null, mapa: null, trabajando: false, op: { limpiar: true, migas: false, cerrar: false, remallar: 0, aligerar: 0, engrosar: 0, rehacer: false } };
  const cache = new WeakMap();
  async function mallaDe(stl) { if (!cache.has(stl)) cache.set(stl, MA.suelda(await MA.sopaDe(stl))); return cache.get(stl); }
  const pausa = () => new Promise(r => setTimeout(r, 30));
  let vivo = true;

  // ---------- la vista ----------
  async function pintaVista(encuadra) {
    const M = E.mesa();
    mount(vacio, M ? null : h('div', h('b', '🛠️ Blender Workshop'), h('small', 'Abre un modelo (o tráelo desde Foto → 3D o el Smart Lab) para comprobarlo y repararlo. El original se guarda siempre.'), C.zonaSoltar('Abrir un modelo', abreArchivo)));
    if (!M || !esc) { if (esc) esc.ponPartes([]); mount(vbar); return; }
    const Ma = await mallaDe(M.stl), Mo = await mallaDe(M.original), igual = M.stl === M.original;
    const L = S.modo === 'original' ? [{ id: 'o', vista: MA.vista(Mo), color: '#b8bec4', acabado: 'mate' }]
      : S.modo === 'juntos' ? [{ id: 'a', vista: MA.vista(Ma), color: '#c08ee8', acabado: 'mate' }, { id: 'o', vista: MA.vista(Mo), color: '#29d3ff', fantasma: 1 }]
        : S.modo === 'mapa' && S.mapa ? [{ id: 'a', vista: S.mapa.vista }]
          : [{ id: 'a', vista: MA.vista(Ma), color: '#c08ee8', acabado: 'mate' }];
    esc.ponPartes(L);
    const finas = S.modo !== 'original' && S.insp && S.insp.zonas_finas ? S.insp.zonas_finas.map(z => ({ p: z.p, r: Math.min(4, 1.2 + Math.sqrt(z.n) * 0.15) })) : [];
    const bordes = S.modo !== 'original' && S.rev && S.rev.bordes_abiertos ? MA.puntosBorde(Ma, 150).map(p => ({ p, r: 0.9 })) : [];
    esc.marcadores(finas.concat(bordes));
    if (encuadra) esc.encuadrar('iso');
    const modo = (k, t, tt, off) => h('button.r8p-pill' + (S.modo === k ? '.on' : ''), { type: 'button', title: tt, disabled: !!off, 'data-modo': k, onclick: () => { S.modo = k; pintaVista(); } }, t);
    mount(vbar, h('div.r8t-modos', modo('actual', 'Ahora', 'El modelo como está ahora'), modo('original', 'Original', 'El modelo tal y como llegó (no se toca nunca)', igual), modo('juntos', 'Superpuestos', 'El de ahora en color y el original transparente encima', igual), modo('mapa', 'Mapa de cambios', 'Cada cara, medida en su centro contra el original: verde = igual · amarillo · rojo = 0,5 mm o más (aproximado)', igual || !S.mapa)),
      (finas.length || bordes.length) && S.modo !== 'original' ? h('span.r8p-pill', '🔴 ' + (bordes.length ? 'bordes abiertos ' : '') + (finas.length ? (bordes.length ? '· ' : '') + 'paredes finas' : '')) : null,
      C.botonesVista(() => esc));
  }

  // ---------- 1 · el modelo ----------
  async function abreArchivo(f) {
    try { const r = await C.leeModelo(f); E.ponEnMesa({ nombre: r.nombre, origen: 'archivo', stl: r.stl }); Object.assign(S, { insp: null, blender: null, comp: null, mapa: null, modo: 'actual' }); await analiza(true); }
    catch (e) { toast(e.message || String(e), 'bad', 8000); }
  }

  // ---------- 2 · comprobar ----------
  async function analiza(encuadra) {
    const M = E.mesa(); if (!M) { pinta(); pintaVista(); return; }
    const T = E.tarea('Comprobando «' + M.nombre + '»'); S.rev = null; pinta(); await pausa();
    try {
      T.avance(10, 'contando agujeros, aristas y piezas'); const Ma = await mallaDe(M.stl); S.rev = MA.revisa(Ma);
      if (!S.revOrig || S.revOrig.id !== M.id + ':' + M.original.byteLength) { S.revOrig = Object.assign(MA.revisa(await mallaDe(M.original)), { id: M.id + ':' + M.original.byteLength }); }
      presets(); pinta(); await pintaVista(encuadra);
      if (D && D.mallaInspeccionar) { T.avance(50, 'buscando paredes finas (motor 3D del PC)'); try { S.insp = await D.mallaInspeccionar(new Blob([M.stl]), 0.8); } catch (e) { S.insp = { error: e.message }; } }
      pinta(); await pintaVista(); T.bien(problemas().length ? problemas().length + ' cosa(s) que revisar' : 'sin problemas en la malla');
    } catch (e) { T.mal(e.message); toast('No he podido comprobar el modelo: ' + e.message, 'bad', 8000); }
    window.__r8taller = { rev: S.rev, insp: S.insp, comp: S.comp, blender: S.blender, pasos: (E.mesa() || {}).historial ? E.mesa().historial.map(x => x.que) : [] };
  }
  function problemas() {
    const R = S.rev, I = S.insp && !S.insp.error ? S.insp : null, P = [];
    if (!R) return P;
    if (R.bordes_abiertos) P.push('agujeros'); if (R.bordes_raros) P.push('aristas'); if (R.caras_al_reves || R.volumen_signo < 0) P.push('normales'); if (R.migas) P.push('migas'); if (R.degeneradas) P.push('degeneradas');
    if (I && I.paredes_finas_pct > 0.5) P.push('finas'); if (R.caras > 500000) P.push('pesada');
    return P;
  }
  // lo que se propone reparar según lo encontrado (lo arriesgado nunca viene marcado)
  function presets() { const P = problemas(); Object.assign(S.op, { limpiar: true, migas: P.includes('migas'), cerrar: P.includes('agujeros'), aligerar: P.includes('pesada') ? 400000 : 0, remallar: P.includes('aristas') ? 0.35 : 0, engrosar: 0, rehacer: false }); }

  // ---------- 3 · reparar ----------
  async function repara() {
    const M = E.mesa(); if (!M || S.trabajando) return;
    if (!D) return toast('La reparación se hace en el programa del PC (Blender y el motor 3D están allí).', 'warn', 7000);
    const o = S.op, conBlender = E.SIS.blender || (await E.sistema()).blender;
    if ((o.engrosar > 0 || o.rehacer) && !(await confirmDlg('⚠️ Esta reparación DEFORMA el modelo', (o.engrosar > 0 ? 'Engrosar hace que TODA la pieza crezca ' + C.n2(o.engrosar) + ' mm por cada lado (no solo lo fino): cambian sus medidas. ' : '') + (o.rehacer ? 'Rehacerla como sólido la reconstruye por cubitos: se suavizan aristas y detalles finos. ' : '') + 'Después mediré cuánto ha cambiado y podrás deshacerlo. ¿Seguimos?', 'Sí, repararla'))) return;
    S.trabajando = true; pinta();
    const T = E.tarea('Reparando «' + M.nombre + '»'); let stl = M.stl; const pasos = [];
    try {
      const opsB = { limpiar: !!o.limpiar, migas: !!o.migas, cerrar: !!o.cerrar, remallar: Number(o.remallar) || 0, conservar: true, aligerar: Number(o.aligerar) || 0, grosor: true, pared_min: 0.8, desviacion: false };
      const hayB = opsB.limpiar || opsB.migas || opsB.cerrar || opsB.remallar || opsB.aligerar;
      if (hayB && conBlender) {
        T.avance(15, 'Blender ' + (E.SIS.blenderVer || '') + ' trabajando en segundo plano');
        const r = await D.mallaBlender(new Blob([stl]), opsB); if (!r || !r.ok || !r.stl) throw new Error((r && r.error) || 'Blender no ha podido.');
        stl = E.b64aU8(r.stl); delete r.stl; S.blender = r; pasos.push(...(r.pasos || []));
      } else if (hayB) {
        T.avance(15, 'sin Blender: reparo con el motor 3D (trimesh)');
        const r = await D.mallaReparar(new Blob([stl]), { migas: opsB.migas, cerrar: opsB.cerrar, engrosar: 0, rehacer: false }); if (!r || !r.ok || !r.stl) throw new Error((r && r.error) || 'No se pudo reparar.');
        stl = E.b64aU8(r.stl); pasos.push(...(r.hecho || []).filter(Boolean)); if (!(r.hecho || []).length) pasos.push('limpieza básica');
      }
      if (o.engrosar > 0 || o.rehacer) {
        T.avance(55, o.engrosar > 0 ? 'engrosando ' + C.n2(o.engrosar) + ' mm' : 'rehaciendo como sólido');
        const r = await D.mallaReparar(new Blob([stl]), { migas: false, cerrar: false, engrosar: o.engrosar, rehacer: !!o.rehacer }); if (!r || !r.ok || !r.stl) throw new Error((r && r.error) || 'No se pudo reparar.');
        stl = E.b64aU8(r.stl); pasos.push(...(r.hecho || []));
      }
      if (!pasos.length) { T.mal('no había nada marcado'); S.trabajando = false; pinta(); return; }
      E.cambiaMesa(stl, pasos.join(' · ')); S.insp = null;
      T.avance(75, 'midiendo cuánto ha cambiado respecto al original'); await compara();
      T.avance(90, 'comprobando otra vez'); await analiza();
      T.bien(veredicto().t);
    } catch (e) { T.mal(e.message); toast('No se ha podido reparar: ' + (e.message || e), 'bad', 9000); }
    S.trabajando = false; pinta(); pintaVista();
  }
  // cuánto se ha alejado del ORIGINAL (Blender, exacto) + el mapa de colores (por vértices, aproximado)
  async function compara() {
    const M = E.mesa(); S.comp = null; S.mapa = null; if (!M || M.stl === M.original) return;
    if (D && D.mallaComparar && E.SIS.blender) { try { const r = await D.mallaComparar(new Blob([M.stl]), new Blob([M.original])); if (r && r.ok) S.comp = Object.assign({ como: 'medido' }, r.desviacion, { antes: r.antes, despues: r.despues }); } catch (e) { S.compError = e.message; } }
    try { const Mo = await mallaDe(M.original), Ma = await mallaDe(M.stl); await pausa(); S.mapa = MA.vistaMapa(Mo, Ma, 0.5);
      if (!S.comp) { const d = MA.desviacion(Mo, Ma), L = Array.from(d).sort((a, b) => a - b); S.comp = { como: 'aprox', media_mm: L.reduce((a, b) => a + b, 0) / L.length, p95_mm: L[Math.floor(L.length * 0.95)], max_mm: Math.max(L[L.length - 1], S.mapa.max) }; } } catch (e) { }
  }
  function veredicto() {
    const c = S.comp, M = E.mesa();
    if (!M || M.stl === M.original) return { k: 'nada', t: 'Sin cambios: es el original' };
    if (!c) return { k: 'nomedido', t: 'NECESITA REVISIÓN: no he podido medir cuánto ha cambiado' };
    const q = c.quitado || c, a = c.anadido || c, p = Math.max(q.p95_mm || 0, a.p95_mm || 0);
    const zona = Math.max((a.max_mm || 0) * ((a.pct_mas_01 || 0) > 0.5 ? 1 : 0), S.mapa ? S.mapa.max : 0); // una zona concreta (una tapa, un relleno) que se ha movido mucho
    if (p <= 0.15 && zona > 1) return { k: 'ojo', t: 'Casi todo igual (el 95 % se ha movido menos de ' + C.mm(Math.max(0.01, p)) + '), pero UNA ZONA ha cambiado hasta ' + C.mm(zona, 1) + ': mírala en el mapa de cambios' };
    if (p <= 0.15) return { k: 'ok', t: 'La forma se conserva (el 95 % se ha movido menos de ' + C.mm(Math.max(0.01, p)) + ')' };
    if (p <= 0.5) return { k: 'ojo', t: 'Cambios pequeños: compáralo con el original' };
    return { k: 'mal', t: 'HA CAMBIADO BASTANTE: mira el mapa de cambios antes de usarlo' };
  }

  // ---------- pintar los paneles ----------
  const op = (k, t, ayuda, riesgo, control) => h('div.r8t-op', h('label.check', control || h('input', { type: 'checkbox', checked: !!S.op[k], 'data-op': k, onchange: e => { S.op[k] = e.target.checked; } }), h('span', t, C.ayuda(ayuda))), riesgo ? h('span.r8t-riesgo.' + riesgo, { ninguno: 'sin riesgo', bajo: 'riesgo bajo', medio: 'riesgo medio', alto: 'DEFORMA' }[riesgo]) : null);
  const sel = (k, L) => h('select.inp.sm', { 'data-op': k, onchange: e => { S.op[k] = Number(e.target.value); } }, L.map(([v, t]) => h('option', { value: v, selected: Number(S.op[k]) === v }, t)));
  function pinta() {
    if (!vivo) return;
    const M = E.mesa(), R = S.rev, I = S.insp && !S.insp.error ? S.insp : null, P = problemas();
    mount(izq,
      h('div.r8p-tit', h('span', '🛠️'), h('div', h('span.r8p-marca', 'BLENDER WORKSHOP'), h('b', 'Reparación inteligente reversible'), h('small', 'Blender trabaja en segundo plano. El original nunca se toca: puedes deshacer cualquier paso.'))),
      h('div.r8t-pasos',
        h('div.r8p-sec', h('b', '1 · El modelo'), M ? h('div.r8t-mod', h('b', M.nombre), h('small', (E.ORIGEN[M.origen] || M.origen) + (M.motor ? ' · ' + M.motor : '') + (R ? ' · ' + C.dimsTxt(R.dims) : '')), M.historial.length ? h('small', M.historial.length + ' cambio(s) desde el original') : null) : null, C.zonaSoltar(M ? 'Abrir otro modelo' : 'Abrir un modelo', abreArchivo)),
        M ? h('div.r8p-sec.r8t-checks', h('b', '2 · Comprobación', C.ayuda('Se cuentan en la malla de verdad: un borde abierto es un agujero; una arista con más de dos caras es un error que confunde al laminador; las caras al revés hacen que el laminador no sepa qué es dentro y qué fuera.')),
          !R ? h('p.small.muted', 'Comprobando…') : [
            C.chk(R.bordes_abiertos ? 'mal' : 'ok', R.bordes_abiertos ? 'Tiene agujeros' : 'Cerrada (sin agujeros)', R.bordes_abiertos ? R.bordes_abiertos + ' bordes abiertos (puntos rojos en la vista)' : '', 'medido'),
            C.chk(R.bordes_raros ? 'mal' : 'ok', R.bordes_raros ? 'Aristas raras' : 'Sin aristas raras', R.bordes_raros ? R.bordes_raros + ' aristas con más de dos caras' : '', 'medido'),
            C.chk(R.caras_al_reves || R.volumen_signo < 0 ? 'ojo' : 'ok', R.volumen_signo < 0 ? 'Está del revés (dentro y fuera cambiados)' : R.caras_al_reves ? 'Caras al revés' : 'Caras bien orientadas', R.caras_al_reves ? R.caras_al_reves + ' aristas con las caras en sentido contrario' : '', 'medido'),
            C.chk(R.migas ? 'ojo' : R.piezas > 1 ? 'ojo' : 'ok', R.piezas > 1 ? R.piezas + ' piezas separadas' : 'Una sola pieza', R.migas ? R.migas + ' son trocitos sueltos (menos del 1 %)' : R.piezas > 1 ? 'Pueden ser partes de verdad (por ejemplo, una tapa)' : '', 'medido'),
            I ? C.chk(I.paredes_finas_pct > 0.5 ? 'ojo' : 'ok', I.paredes_finas_pct > 0.5 ? 'Paredes finas' : 'Paredes de 0,8 mm o más', I.paredes_finas_pct > 0 ? C.n2(I.paredes_finas_pct) + ' % del volumen por debajo de 0,8 mm (cubitos de ' + C.n2(I.paso_cubitos) + ' mm)' : 'Mirado por cubitos de ' + C.n2(I.paso_cubitos) + ' mm', 'aprox')
              : C.chk('nomedido', 'Paredes finas', S.insp && S.insp.error ? 'No se pudo mirar: ' + S.insp.error : D ? 'Mirando…' : 'Se miran en el programa del PC', 'nomedido'),
            C.chk(R.caras > 500000 ? 'ojo' : 'ok', R.caras > 500000 ? 'Malla muy pesada' : 'Peso de la malla correcto', Number(R.caras).toLocaleString('es-ES') + ' caras' + (R.caras > 500000 ? ': Bambu Studio irá lento; se puede aligerar' : ''), 'medido')]) : null,
        M && R ? h('div.r8p-sec.r8t-ops', h('b', '3 · Reparación'),
          op('limpiar', 'Limpiar y orientar las caras', 'Une vértices repetidos, quita caras sin superficie y pone todas las caras mirando hacia fuera. No cambia la forma.', 'ninguno'),
          op('migas', 'Quitar trocitos sueltos', 'Borra las piezas que no llegan al 1 % de la superficie (restos de la IA). Las piezas grandes se quedan.', 'bajo'),
          op('cerrar', 'Cerrar agujeros', 'Tapa cada agujero con caras planas. En un hueco curvo la tapa queda plana: el mapa de cambios lo enseña.', 'bajo'),
          op('remallar', 'Rehacer la superficie', 'Remallado por vóxeles y luego «envolver» sobre el original para conservar el detalle. Arregla aristas raras y caras cruzadas. Cuanto más fino, más fiel.', 'medio', sel('remallar', [[0, 'No'], [0.25, 'Fino 0,25 mm'], [0.35, 'Normal 0,35 mm'], [0.5, 'Rápido 0,5 mm']])),
          op('aligerar', 'Aligerar la malla', 'Reduce el número de caras respetando la forma (Decimate de Blender). Para que Bambu Studio vaya fluido.', 'bajo', sel('aligerar', [[0, 'No'], [400000, 'A 400.000 caras'], [200000, 'A 200.000'], [100000, 'A 100.000']])),
          h('details.r8t-mas', h('summary', 'Reparaciones que deforman'),
            op('engrosar', 'Engrosar las paredes', 'TODA la pieza crece esa medida por cada lado, no solo lo fino. Cambian sus medidas: no lo uses en piezas que encajan.', 'alto', sel('engrosar', [[0, 'No'], [0.4, '0,4 mm'], [0.8, '0,8 mm'], [1.2, '1,2 mm']])),
            op('rehacer', 'Rehacerla como sólido', 'Para mallas muy rotas: la reconstruye por cubitos. Se suavizan aristas y detalles.', 'alto')),
          h('div.r8p-btns', btn(S.trabajando ? 'Trabajando…' : '🛠️ Reparar con Blender', () => repara(), { cls: 'primary r8t-reparar', disabled: S.trabajando || !D })),
          !D ? h('p.small.muted', 'La reparación necesita el programa del PC (allí están Blender y el motor 3D). La comprobación sí funciona aquí.') : !E.SIS.blender ? h('p.small.muted', 'No encuentro Blender: se repara con el motor 3D (sin remallar ni aligerar).') : null) : null));
    pintaDer();
  }
  function pintaDer() {
    const M = E.mesa(), R = S.rev, O = S.revOrig, v = veredicto(), c = S.comp;
    if (!M) { mount(der, h('div.r8p-tit', h('span', '📋'), h('div', h('b', 'Informe'), h('small', 'Aquí verás qué se ha cambiado y cuánto.')))); return; }
    const fila = (t, a, b, malo) => h('tr', h('td', t), h('td.n', a), h('td.n' + (malo ? '.r8t-malo' : ''), b));
    const cambiado = M.stl !== M.original;
    mount(der,
      h('div.r8p-tit', h('span', '📋'), h('div', h('b', 'Informe de la reparación'), h('small', cambiado ? M.historial.length + ' paso(s) desde el original' : 'Todavía sin reparar'))),
      h('div.r8p-nota.' + ({ ok: 'bien', ojo: 'ojo', mal: 'mal', nomedido: 'ojo' }[v.k] || ''), h('b', { ok: '✅ ', ojo: '⚠️ ', mal: '❌ ', nomedido: '⚪ ', nada: 'ℹ️ ' }[v.k]), v.t),
      cambiado && c ? h('div.r8p-sec.r8t-desv', h('b', 'Cuánto ha cambiado', ' ', C.etiqueta(c.como === 'medido' ? 'medido' : 'aprox'), C.ayuda('Se comparan miles de puntos de la superficie con el ORIGINAL. «Quitado»: lo que tenía el original y ya no está (trocitos, detalle). «Añadido»: lo que antes no estaba (tapas de agujeros, grosor). El 95 % es lo que se ha movido casi toda la superficie; el máximo suele ser un punto concreto.')),
        c.quitado ? h('table.r8p-tabla', h('tr', h('th', ''), h('th', 'Media'), h('th', '95 %'), h('th', 'Máximo')), [['Quitado', c.quitado], ['Añadido', c.anadido]].map(([t, x]) => h('tr', h('td', t), h('td.n', C.mm(x.media_mm, 3)), h('td.n', C.mm(x.p95_mm, 3)), h('td.n', C.mm(x.max_mm, 1)))))
          : h('p.small', 'Media ' + C.mm(c.media_mm, 3) + ' · 95 %: ' + C.mm(c.p95_mm, 3) + ' · máximo ' + C.mm(c.max_mm, 1) + (c.como === 'aprox' ? ' (por vértices; sin Blender no se puede medir exacto)' : '')),
        (M.historial || []).some(x => /piezas sueltas/.test(x.que)) ? h('small.muted', 'En «Quitado» entran también los trocitos sueltos que se han quitado a propósito.') : null,
        S.mapa ? btn('🎨 Ver el mapa de cambios', () => { S.modo = 'mapa'; pintaVista(); }, { cls: 'sm ghost' }) : null) : null,
      R && O ? h('div.r8p-sec', h('b', 'Antes y ahora ', C.etiqueta('medido')), h('table.r8p-tabla.r8t-tabla', h('tr', h('th', ''), h('th', 'Original'), h('th', 'Ahora')),
        fila('Caras', Number(O.caras).toLocaleString('es-ES'), Number(R.caras).toLocaleString('es-ES')), fila('Bordes abiertos', O.bordes_abiertos, R.bordes_abiertos, R.bordes_abiertos > 0), fila('Aristas raras', O.bordes_raros, R.bordes_raros, R.bordes_raros > 0),
        fila('Piezas', O.piezas, R.piezas, R.migas > 0), fila('Volumen', O.volumen_cm3 != null ? C.n2(O.volumen_cm3) + ' cm³' : 'abierta', R.volumen_cm3 != null ? C.n2(R.volumen_cm3) + ' cm³' : 'abierta'), fila('Medidas', C.dimsTxt(O.dims), C.dimsTxt(R.dims)))) : null,
      M.historial.length ? h('div.r8p-sec', h('b', 'Pasos'), h('ol.r8t-hist', M.historial.map(x => h('li', x.que)))) : null,
      S.blender && S.blender.grosor ? h('p.small.muted', 'Grosor medido por Blender con ' + S.blender.grosor.muestras + ' rayos: ' + C.n2(S.blender.grosor.pct_fino) + ' % por debajo de ' + C.mm(S.blender.grosor.minimo_mm, 1) + '.') : null,
      h('div.r8p-btns', btn('↩ Deshacer', () => { const q = E.deshazMesa(); if (q) { toast('Deshecho: ' + q, 'ok'); despuesDeCambio(); } }, { cls: 'sm r8t-deshacer', disabled: !M.historial.length || S.trabajando }), btn('⟲ Volver al original', () => { E.originalMesa(); toast('Vuelve a estar como el original', 'ok'); despuesDeCambio(); }, { cls: 'sm r8t-original', disabled: !cambiado || S.trabajando })),
      h('div.r8p-btns', btn('💾 Guardar', () => C.guardaEnPC(M.stl, 'Reparados', C.limpioNombre(M.nombre) + (cambiado ? '_reparado' : '') + '.stl', 'model/stl').catch(e => toast(e.message, 'bad')), { cls: 'sm r8t-guardar', title: 'Documentos › CelebriDiseños_R8 › Reparados (o descarga, fuera del PC)' }), btn('🩺 Revisar para imprimir', () => ext.irA && ext.irA('doctor'), { cls: 'sm primary r8t-imprimir' })));
  }
  async function despuesDeCambio() { S.insp = null; await compara(); await analiza(); pintaVista(); }

  const quita = E.escucha('sistema', () => pinta());
  E.sistema().catch(() => { });
  if (E.mesa()) { await analiza(true); if (E.mesa().stl !== E.mesa().original) { await compara(); pinta(); pintaVista(); } } else { pinta(); pintaVista(); }
  return { destroy() { vivo = false; quita(); if (esc) esc.destruir(); } };
}
