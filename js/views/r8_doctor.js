// ================= v20 · 🩺 CelebriR8 PRINT DOCTOR · PREPARACIÓN INTELIGENTE PARA IMPRIMIR =================
// La última parada antes de la Bambu. Comprueba el modelo de la mesa (o un archivo): que se puede exportar, que está
// cerrado, piezas, paredes finas, medidas finales y si cabe en tu impresora; propone la ORIENTACIÓN (con sus ventajas e
// inconvenientes, y lo que queda en el aire pintado en rojo), si hacen falta SOPORTES y cuáles, y tus PERFILES reales de
// Bambu Studio (nunca uno inventado). Exporta STL o 3MF con los ajustes dentro, o lo abre en Bambu Studio, y hace un
// INFORME. Nunca dice «se imprimirá bien seguro»: dice lo que ha comprobado y lo que no. El original de la mesa no se toca.
import { h, mount, btn, toast, confirmDlg } from '../ui.js';
import * as E from '../r8/estado.js';
import * as MA from '../r8/malla.js';
import * as C from '../r8/comun.js';
import { estimarGramos } from '../datos3d.js';

const MATERIALES = { PLA: 'PLA', PETG: 'PETG', TPU: 'TPU (flexible)' };
const USOS = { mecanica: '⚙️ Pieza mecánica que trabaja', deco: '🎀 Decoración', funcional: '💪 Tiene que aguantar', encaje: '🧩 Encaja con otra', flexible: '🪢 Flexible' };
const ACABADOS = { rapido: ['⚡ Rápido', 'Capa 0,20 mm: la mitad de tiempo que la fina; se notan las capas en curvas y letras.'], equilibrado: ['⚖️ Equilibrado', 'Capa 0,16 mm: buen acabado sin tardar demasiado.'], fino: ['✨ Fino', 'Capa 0,12 mm: letras y caras nítidas; tarda bastante más.'] };
const SOPORTES = { no: ['Sin soportes', 'Más rápido y sin marcas. Solo si casi nada queda en el aire.'], cama: ['Árbol, solo desde la cama', 'Los soportes salen solo de la placa: no tocan la pieza por encima. Lo mejor si lo que vuela está abajo.'], arbol: ['Árbol (orgánico)', 'Se quitan fácil y dejan poca marca. Es el que usas en tus perfiles.'], normal: ['Normal (rejilla)', 'Más firme para voladizos grandes y planos; cuesta más quitarlo y deja más marca.'] };

export async function montarDoctor(el, ext = {}) {
  const D = await C.escritorio();
  const A = await import('../r8/consejos3d.js'), PF = await A.cargaPerfiles(), N = await import('../r8/nucleo.js');
  const lienzo = h('canvas.r8p-cv', { 'aria-label': 'La pieza en la cama' }), vbar = h('div.r8p-vbar'), vacio = h('div.r8p-vacio'), izq = h('div.r8p-izq.r8d-izq'), der = h('div.r8p-der.r8d-der');
  const raiz = h('div.r8p.r8d', izq, h('div.r8p-vista.r8d-vista', lienzo, vacio, vbar), der);
  el.appendChild(raiz);
  let esc = null; try { esc = await C.vista3d(lienzo); } catch (e) { }
  const guardadas = (() => { try { return JSON.parse(localStorage.getItem('cd.r8.doctor') || '{}'); } catch (e) { return {}; } })();
  const S = { imp: guardadas.imp || (PF.impresoras[0] || {}).k || 'p1p', material: guardadas.material || 'PLA', uso: guardadas.uso || 'deco', acabado: guardadas.acabado || 'equilibrado', perfil: guardadas.perfil || '', soporte: null, balsa: null, planchar: 'no', giro: null, escala: 100, M: null, rev: null, insp: null, orient: null, export: null, stlTxt: null };
  const recuerda = () => { try { localStorage.setItem('cd.r8.doctor', JSON.stringify({ imp: S.imp, material: S.material, uso: S.uso, acabado: S.acabado, perfil: S.perfil })); } catch (e) { } };
  let vivo = true; const pausa = () => new Promise(r => setTimeout(r, 30));
  const impresora = () => PF.impresoras.find(x => x.k === S.imp) || PF.impresoras[0];

  // la malla con el giro y la escala elegidos, apoyada y centrada
  function mallaFinal() {
    if (!S.M) return null; const g = (S.orient || []).find(o => o.k === S.giro) || { r: [0, 0, 0] }, M2 = MA.giraMalla(S.M, g.r), k = S.escala / 100;
    if (Math.abs(k - 1) > 1e-6) for (let i = 0; i < M2.V.length; i++) M2.V[i] *= k;
    return M2;
  }
  async function carga() {
    const M = E.mesa(); S.M = null; S.rev = null; S.insp = null; S.orient = null; S.export = null; S.giro = null;
    if (M && M.origen === 'precision' && S.uso !== 'mecanica') { S.uso = 'mecanica'; recuerda(); } // v20.2: un repuesto con medidas es una pieza que TRABAJA (fuerte y a medida)
    if (!M) { pinta(); return; }
    const T = E.tarea('Revisando «' + M.nombre + '» para imprimir'); pinta(); await pausa();
    try {
      T.avance(10, 'leyendo la malla'); S.M = MA.suelda(await MA.sopaDe(M.stl)); S.rev = MA.revisa(S.M);
      T.avance(30, 'probando las 6 formas de apoyarla'); await pausa(); S.orient = MA.orientaciones(S.M, 30);
      const best = MA.mejorOrientacion(S.orient, S.rev.area_cm2); S.giro = best.mejor.k; S.recomendado = best.mejor.k; S.ordenOr = best.orden;
      T.avance(45, 'comprobando que se puede exportar'); compruebaExport();
      recomienda(); pinta(); pintaVista(true);
      if (D && D.mallaInspeccionar) { T.avance(60, 'buscando paredes finas (motor 3D del PC)'); try { S.insp = await D.mallaInspeccionar(new Blob([M.stl]), 0.8); } catch (e) { S.insp = { error: e.message }; } }
      pinta(); T.bien(veredicto().t);
    } catch (e) { T.mal(e.message); toast('No he podido revisar el modelo: ' + e.message, 'bad', 8000); pinta(); }
    publicaDbg();
  }
  // exportar y volver a leer: ¿salen los mismos triángulos y medidas?
  function compruebaExport() {
    try { const F = mallaFinal(), sopa = MA.aSopa(F), stl = MA.stlDeSopa(sopa, 'prueba'), dv = new DataView(stl.buffer), n = dv.getUint32(80, true); let ok = n === F.T.length / 3 && stl.byteLength === 84 + n * 50;
      for (let i = 0; ok && i < Math.min(n, 2000); i++) for (let j = 0; j < 12; j++) if (!isFinite(dv.getFloat32(84 + i * 50 + j * 4, true))) { ok = false; break; }
      S.export = { ok, triangulos: n, kb: Math.round(stl.byteLength / 1024) }; } catch (e) { S.export = { ok: false, error: e.message }; }
  }
  // lo que se propone (lo puedes cambiar): soportes y balsa según la orientación elegida
  function recomienda() {
    const o = (S.orient || []).find(x => x.k === S.giro); if (!o) return;
    const area = S.rev.area_cm2 || 1, vol = o.voladizo_cm2;
    S.soporteRec = vol < 0.5 || vol / area < 0.004 ? 'no' : 'arbol';
    if (S.soporteRec === 'arbol') { const M2 = mallaFinal(), zmax = MA.caja(M2.V).max[2]; let alto = 0; o.marcadas.slice(0, 4000).forEach(f => { const z = Math.min(M2.V[M2.T[f * 3] * 3 + 2], M2.V[M2.T[f * 3 + 1] * 3 + 2], M2.V[M2.T[f * 3 + 2] * 3 + 2]); if (z > alto) alto = z; }); if (alto < zmax * 0.25) S.soporteRec = 'cama'; }
    const base = Math.min(o.dims[0], o.dims[1]), esbelta = o.alto / Math.max(1, base) > 2.6;
    S.balsaRec = o.apoyo_cm2 < 1.2 || esbelta ? 'si' : 'auto'; S.esbelta = esbelta;
    if (S.soporte == null) S.soporte = S.soporteRec; if (S.balsa == null) S.balsa = S.balsaRec;
  }
  function veredicto() {
    if (!S.rev) return { k: 'nada', t: 'Sin modelo' };
    const err = [], ojo = [], R = S.rev, F = S.M ? MA.caja(mallaFinal().V) : null, cama = impresora().cama;
    if (S.export && !S.export.ok) err.push('no se puede exportar bien');
    if (R.bordes_abiertos) err.push('tiene agujeros'); if (R.bordes_raros) err.push('aristas raras');
    if (F && F.dims.some(x => x > cama)) err.push('no cabe en la ' + impresora().t);
    if (R.caras_al_reves || R.volumen_signo < 0) ojo.push('caras al revés'); if (R.piezas > 1) ojo.push(R.piezas + ' piezas');
    if (S.insp && !S.insp.error && S.insp.paredes_finas_pct > 0.5) ojo.push('paredes finas');
    const o = (S.orient || []).find(x => x.k === S.giro); if (o && o.voladizo_cm2 > 0.5 && S.soporte === 'no') ojo.push('hay voladizos sin soporte');
    if (o && (o.apoyo_cm2 < 1.2 || S.esbelta) && S.balsa === 'no') ojo.push('apoya poco y no lleva balsa');
    if (err.length) return { k: 'mal', t: 'Conviene arreglarlo antes de imprimir: ' + err.join(', '), err, ojo };
    if (ojo.length) return { k: 'ojo', t: 'Se puede imprimir, pero revisa: ' + ojo.join(', '), err, ojo };
    return { k: 'ok', t: 'Sin problemas en las comprobaciones automáticas. Mira la vista previa por capas en Bambu Studio antes de imprimir.', err, ojo };
  }

  // ---------- la vista: la pieza girada en la cama de SU impresora, con lo que vuela en rojo ----------
  async function pintaVista(encuadra) {
    mount(vacio, S.M ? null : h('div', h('b', '🩺 Print Doctor'), h('small', 'Trae un modelo desde Reparar, el Smart Lab o el Precision Lab, o ábrelo aquí. Lo reviso antes de que lo mandes a la Bambu.'), C.zonaSoltar('Abrir un modelo', abreArchivo)));
    if (!esc) return; esc.cama(impresora().cama);
    if (!S.M) { esc.ponPartes([]); mount(vbar); return; }
    const F = mallaFinal(), o = (S.orient || []).find(x => x.k === S.giro), L = [{ id: 'p', vista: MA.vista(F), color: '#8fd3ff', acabado: 'mate' }];
    if (o && o.marcadas.length && S.verVoladizo !== false) { const k = S.escala / 100, sub = MA.subMalla(F, o.marcadas); L.push({ id: 'v', vista: MA.vista(sub), color: '#ff3b5c', resalta: 1 }); void k; }
    esc.ponPartes(L); if (encuadra) esc.encuadrar('iso');
    mount(vbar, h('span.r8p-pill', '🖨️ ' + impresora().t + ' · ' + impresora().cama + ' mm'), o ? h('button.r8p-pill' + (S.verVoladizo !== false ? '.on' : ''), { type: 'button', title: 'Pintar en rojo lo que queda en el aire (más inclinado de 30° respecto a la horizontal)', onclick: () => { S.verVoladizo = S.verVoladizo === false; pintaVista(); } }, '🔴 En el aire: ' + C.n2(o.voladizo_cm2, 1) + ' cm²') : null, C.botonesVista(() => esc));
  }
  async function abreArchivo(f) { try { const r = await C.leeModelo(f); E.ponEnMesa({ nombre: r.nombre, origen: 'archivo', stl: r.stl }); S.soporte = null; S.balsa = null; S.escala = 100; await carga(); } catch (e) { toast(e.message || String(e), 'bad', 8000); } }

  // ---------- paneles ----------
  const selec = (k, ops, alCambiar) => h('select.inp', { 'data-k': k, onchange: e => { S[k] = e.target.value; recuerda(); alCambiar && alCambiar(); pinta(); } }, Object.entries(ops).map(([v, t]) => h('option', { value: v, selected: S[k] === v }, Array.isArray(t) ? t[0] : t)));
  function pinta() {
    if (!vivo) return;
    const M = E.mesa(), R = S.rev, I = S.insp && !S.insp.error ? S.insp : null, imp = impresora();
    const F = S.M ? MA.caja(mallaFinal().V) : null, o = (S.orient || []).find(x => x.k === S.giro);
    const procs = (PF.procesos || []).filter(p => !p.impresora || p.impresora === imp.k);
    const gramos = R && R.volumen_cm3 ? estimarGramos(R.volumen_cm3 * 1000 * Math.pow(S.escala / 100, 3), R.area_cm2 * 100 * Math.pow(S.escala / 100, 2), { relleno: { mecanica: 60, deco: 12, funcional: 30, encaje: 20, flexible: 15 }[S.uso], paredes: { mecanica: 6, deco: 2, funcional: 4, encaje: 3, flexible: 3 }[S.uso], material: S.material }) : null;
    mount(izq,
      h('div.r8p-tit', h('span', '🩺'), h('div', h('span.r8p-marca', 'PRINT DOCTOR'), h('b', 'Revisión antes de imprimir'), h('small', 'Lo que compruebo, lo marco como medido o aproximado. Nada sustituye a la vista previa por capas de Bambu Studio.'))),
      h('div.r8p-sec', h('b', 'El modelo'), M ? h('div.r8t-mod', h('b', M.nombre), h('small', (E.ORIGEN[M.origen] || M.origen) + (M.historial.length ? ' · ' + M.historial.length + ' cambio(s)' : '') + ' · el original se conserva')) : null, C.zonaSoltar(M ? 'Revisar otro modelo' : 'Abrir un modelo', abreArchivo)),
      R ? h('div.r8p-sec.r8d-chequeos', h('b', 'Comprobaciones'),
        C.chk(S.export ? (S.export.ok ? 'ok' : 'mal') : 'nomedido', S.export && S.export.ok ? 'Se exporta bien' : 'Problema al exportar', S.export ? (S.export.ok ? S.export.triangulos.toLocaleString('es-ES') + ' triángulos, STL de ' + S.export.kb + ' KB (exportado y leído otra vez)' : S.export.error || 'el archivo no sale entero') : '', 'medido'),
        C.chk(R.bordes_abiertos ? 'mal' : 'ok', R.bordes_abiertos ? 'Tiene agujeros' : 'Cerrada', R.bordes_abiertos ? R.bordes_abiertos + ' bordes abiertos: Bambu Studio intentará cerrarlos, pero mejor pásala por Reparar' : '', 'medido'),
        C.chk(R.bordes_raros ? 'mal' : 'ok', R.bordes_raros ? 'Aristas raras' : 'Sin aristas raras', R.bordes_raros ? R.bordes_raros + ' aristas con más de dos caras' : '', 'medido'),
        C.chk(R.caras_al_reves || R.volumen_signo < 0 ? 'ojo' : 'ok', R.volumen_signo < 0 ? 'Del revés' : R.caras_al_reves ? 'Caras al revés' : 'Caras bien orientadas', '', 'medido'),
        C.chk(R.piezas > 1 ? 'ojo' : 'ok', R.piezas > 1 ? R.piezas + ' piezas separadas' : 'Una sola pieza', R.piezas > 1 ? 'Se imprimirán como piezas sueltas en la misma placa' + (R.migas ? ' (' + R.migas + ' son trocitos de menos del 1 %)' : '') : '', 'medido'),
        I ? C.chk(I.paredes_finas_pct > 0.5 ? 'ojo' : 'ok', I.paredes_finas_pct > 0.5 ? 'Paredes finas' : 'Paredes de 0,8 mm o más', (I.paredes_finas_pct > 0 ? C.n2(I.paredes_finas_pct) + ' % por debajo de 0,8 mm (2 líneas de tu boquilla de 0,4)' : 'Mirado') + ' · cubitos de ' + C.n2(I.paso_cubitos) + ' mm', 'aprox') : C.chk('nomedido', 'Paredes finas', S.insp && S.insp.error ? S.insp.error : D ? 'Mirando…' : 'Se miran en el programa del PC', 'nomedido'),
        F ? C.chk(F.dims.some(x => x > imp.cama) ? 'mal' : 'ok', F.dims.some(x => x > imp.cama) ? 'No cabe en la ' + imp.t : 'Cabe en la ' + imp.t, C.dimsTxt(F.dims) + ' en una cama de ' + imp.cama + ' mm', 'medido') : null,
        o ? C.chk(o.apoyo_cm2 < 1.2 || S.esbelta ? 'ojo' : 'ok', o.apoyo_cm2 < 1.2 ? 'Apoya poco en la cama' : S.esbelta ? 'Alta y estrecha' : 'Apoya bien', C.n2(o.apoyo_cm2, 1) + ' cm² tocando la cama' + (S.esbelta ? ' · puede moverse al subir: mejor con balsa' : ''), 'medido') : null,
        gramos ? C.chk('ok', '≈ ' + Math.max(1, Math.round(gramos)) + ' g de ' + S.material, 'Con ' + USOS[S.uso].replace(/^\S+ /, '').toLowerCase() + ' (paredes y relleno de ese uso)', 'estimado') : null) : null,
      R ? h('div.r8p-sec', h('b', 'Medidas finales', C.ayuda('Lo que medirá la pieza al imprimirla con el giro y la escala elegidos. Si es un repuesto, no cambies la escala: perderías las medidas.')),
        h('div.r8d-escala', h('label', 'Escala ', h('input.inp.sm', { type: 'number', min: 1, max: 1000, step: 1, value: S.escala, 'data-k': 'escala', onchange: e => { const v = Math.max(1, Math.min(1000, Number(e.target.value) || 100)); S.escala = v; compruebaExport(); recomienda(); pinta(); pintaVista(); } }), ' %'), F ? h('b', C.dimsTxt(F.dims)) : null),
        M && M.origen === 'precision' && S.escala !== 100 ? h('p.r8p-nota.mal', 'Es un repuesto con medidas: con otra escala ya no encajará.') : null) : null);
    pintaDer(o, imp, procs);
    publicaDbg();
  }
  function pintaDer(o, imp, procs) {
    const v = veredicto(), M = E.mesa();
    if (!S.rev) { mount(der, h('div.r8p-tit', h('span', '🖨️'), h('div', h('b', 'Preparar la impresión'), h('small', 'Orientación, soportes, perfil y archivo para Bambu Studio.')))); return; }
    const filaOr = x => { const pros = [], contras = []; if (x.voladizo_cm2 < 0.5) pros.push('casi nada en el aire'); else contras.push(C.n2(x.voladizo_cm2, 1) + ' cm² en el aire'); if (x.apoyo_cm2 >= 4) pros.push('apoya mucho'); else if (x.apoyo_cm2 < 1.2) contras.push('apoya poco'); const minA = Math.min(...S.orient.map(y => y.alto)); if (x.alto <= minA + 0.5) pros.push('la más baja (más rápida)'); else if (x.alto > minA * 2) contras.push('más alta (tarda más)');
      return h('button.r8d-or' + (S.giro === x.k ? '.on' : ''), { type: 'button', 'data-giro': x.k, onclick: () => { S.giro = x.k; S.soporte = null; S.balsa = null; recomienda(); compruebaExport(); pinta(); pintaVista(true); } }, h('b', (x.k === S.recomendado ? '⭐ ' : '') + x.t), h('small', [pros.length ? '✔ ' + pros.join(', ') : '', contras.length ? '✖ ' + contras.join(', ') : ''].filter(Boolean).join(' · ')), h('span.r8d-or-n', C.n2(x.voladizo_cm2, 1) + ' cm² · ' + C.n2(x.alto, 0) + ' mm')); };
    mount(der,
      h('div.r8p-nota.' + ({ ok: 'bien', ojo: 'ojo', mal: 'mal' }[v.k] || ''), h('b', { ok: '✅ ', ojo: '⚠️ ', mal: '❌ ' }[v.k] || ''), v.t),
      v.k === 'mal' && (S.rev.bordes_abiertos || S.rev.bordes_raros) ? btn('🛠️ Repararla en el Blender Workshop', () => ext.irA && ext.irA('taller'), { cls: 'sm' }) : null,
      h('div.r8p-sec.r8d-orient', h('b', 'Orientación', C.ayuda('Medido en la malla para cada forma de apoyarla: cuánto queda en el aire (necesita soporte), cuánto toca la cama y lo alta que queda. ⭐ = la que propongo. El soporte real lo calcula Bambu Studio.')), (S.ordenOr || []).map(k => filaOr(S.orient.find(x => x.k === k)))),
      h('div.r8p-sec.r8d-soportes', h('b', 'Soportes y balsa'),
        Object.entries(SOPORTES).map(([k, [t, d]]) => h('label.r8d-op', h('input', { type: 'radio', name: 'r8d-sop', checked: S.soporte === k, 'data-sop': k, onchange: () => { S.soporte = k; pinta(); } }), h('span', h('b', t + (S.soporteRec === k ? ' · recomendado' : '')), h('small', d)))),
        h('label.r8d-op', h('input', { type: 'checkbox', checked: S.balsa === 'si', 'data-balsa': 1, onchange: e => { S.balsa = e.target.checked ? 'si' : 'no'; pinta(); } }), h('span', h('b', 'Tipo de balsa: Solo borde exterior (5 mm)' + (S.balsaRec === 'si' ? ' · recomendado' : '')), h('small', 'Sujeta las piezas que apoyan poco o son altas y estrechas. Se quita con la mano.')))),
      h('div.r8p-sec.r8d-perfil', h('b', 'Impresora y perfil'),
        h('label.r8e-c.col', h('span', 'Impresora'), selec('imp', Object.fromEntries(PF.impresoras.map(x => [x.k, x.t + ' (' + x.cama + ' mm)'])), () => pintaVista(true))),
        h('div.r8d-2', h('label.r8e-c.col', h('span', 'Material'), selec('material', MATERIALES)), h('label.r8e-c.col', h('span', 'Uso'), selec('uso', USOS))),
        h('label.r8e-c.col', h('span', 'Acabado'), selec('acabado', ACABADOS)), h('small.muted', ACABADOS[S.acabado][1]),
        procs.length ? h('label.r8e-c.col', h('span', 'Perfil de proceso (' + (PF.leido ? 'leído de tu Bambu Studio' : 'tus perfiles guardados el 9-10-2026') + ')'), h('select.inp', { 'data-k': 'perfil', onchange: e => { S.perfil = e.target.value; recuerda(); pinta(); } }, h('option', { value: '' }, 'El de serie de Bambu para esa capa'), procs.map(p => h('option', { value: p.nombre, selected: S.perfil === p.nombre }, p.nombre)))) : h('small.muted', 'No encuentro perfiles propios para esta impresora: Bambu Studio usará el suyo de serie.'),
        h('small.muted', 'Los ajustes van DENTRO del 3MF; el perfil se elige al abrirlo en Bambu Studio (no se toca tu configuración).')),
      h('div.r8p-sec.r8d-exportar', h('b', 'Sacar el archivo'),
        h('div.r8p-btns', D && D.bambuAbrir ? btn('🖨️ Abrir en Bambu Studio', () => saca('abrir'), { cls: 'primary r8d-abrir' }) : null, btn('📦 3MF con los ajustes', () => saca('3mf'), { cls: (D ? '' : 'primary ') + 'r8d-3mf' })),
        h('div.r8p-btns', btn('⬇️ STL', () => saca('stl'), { cls: 'sm r8d-stl' }), btn('📋 Informe', () => informe(), { cls: 'sm r8d-informe' })),
        h('small.muted', D ? 'Se guarda en Documentos › CelebriDiseños_R8 › Imprimir. El modelo original no se toca.' : 'Se descarga en este aparato.')));
  }
  function ajustes() { const k = A.claves({ acabado: S.acabado, uso: S.uso, soporte: S.soporte, balsa: S.balsa === 'si' ? 'si' : S.balsa === 'no' ? 'no' : 'auto', planchar: S.planchar }); return k; }
  async function saca(como) {
    const M = E.mesa(); if (!M || !S.M) return;
    const v = veredicto(); if (v.k === 'mal' && !(await confirmDlg('⚠️ Hay cosas por arreglar', v.t + '. ¿Sacas el archivo igualmente?', 'Sí, sacarlo'))) return;
    const F = mallaFinal(), base = C.limpioNombre(M.nombre) + (S.escala !== 100 ? '_' + S.escala + 'pc' : '');
    try {
      if (como === 'stl') { const stl = MA.stlDeSopa(MA.aSopa(F), base); window.__r8doc.ultimo = { como, bytes: stl.byteLength }; await C.guardaEnPC(stl, 'Imprimir', base + '.stl', 'model/stl'); return; }
      const blob = N.tresMF([{ malla: F, color: '#8fd3ff', nombre: M.nombre }], M.nombre, ajustes());
      window.__r8doc.ultimo = { como, bytes: blob.size, ajustes: ajustes() };
      if (como === 'abrir') { const r = await D.bambuAbrir(blob, base); toast(r && r.abierto ? '🖨️ Abriendo en Bambu Studio (guardado en Documentos › CelebriDiseños_R8)' : '📦 Guardado en ' + (r && r.path), 'ok', 8000); window.__r8doc.abierto = r; return; }
      await C.guardaEnPC(blob, 'Imprimir', base + '.3mf', 'model/3mf');
    } catch (e) { toast(e.message || String(e), 'bad', 8000); }
  }
  // ---------- el informe (HTML de una página, para guardar o imprimir) ----------
  function informe() {
    const M = E.mesa(), R = S.rev, v = veredicto(), o = (S.orient || []).find(x => x.k === S.giro), F = MA.caja(mallaFinal().V), I = S.insp && !S.insp.error ? S.insp : null, imp = impresora(), k = ajustes();
    const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const fila = (a, b, c) => '<tr><td>' + esc(a) + '</td><td>' + esc(b) + '</td><td class="e">' + esc(c) + '</td></tr>';
    const html = '<!doctype html><html lang="es"><meta charset="utf-8"><title>Print Doctor · ' + esc(M.nombre) + '</title><style>body{font:15px/1.5 "Segoe UI",system-ui,sans-serif;max-width:780px;margin:32px auto;padding:0 16px;color:#1d2230}h1{font-size:24px;margin:0}small{color:#667}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border-bottom:1px solid #dde;padding:6px 8px;text-align:left}td.e{color:#667;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.v{padding:10px 12px;border-radius:8px;background:#eef6f1;border-left:4px solid #1b9e5a}.v.ojo{background:#fff6e5;border-color:#d68a00}.v.mal{background:#fdecee;border-color:#c62f45}</style>' +
      '<h1>🩺 Print Doctor · ' + esc(M.nombre) + '</h1><small>CelebriR8 · ' + new Date().toLocaleString('es-ES') + ' · origen: ' + esc(E.ORIGEN[M.origen] || M.origen) + (M.historial.length ? ' · ' + M.historial.length + ' cambio(s) desde el original: ' + esc(M.historial.map(x => x.que).join(' / ')) : '') + '</small>' +
      '<p class="v ' + ({ ok: '', ojo: 'ojo', mal: 'mal' }[v.k] || '') + '">' + esc(v.t) + '</p><h2>Comprobaciones</h2><table>' +
      fila('Exportación', S.export && S.export.ok ? 'Correcta (' + S.export.triangulos + ' triángulos)' : 'Con problemas', 'medido') + fila('Agujeros (bordes abiertos)', R.bordes_abiertos, 'medido') + fila('Aristas raras', R.bordes_raros, 'medido') + fila('Caras al revés', R.caras_al_reves + (R.volumen_signo < 0 ? ' (del revés)' : ''), 'medido') + fila('Piezas', R.piezas + (R.migas ? ' (' + R.migas + ' trocitos)' : ''), 'medido') +
      fila('Paredes finas (< 0,8 mm)', I ? C.n2(I.paredes_finas_pct) + ' % · cubitos de ' + C.n2(I.paso_cubitos) + ' mm' : 'sin comprobar', I ? 'aproximado' : 'sin medir') + fila('Medidas finales', C.dimsTxt(F.dims) + (S.escala !== 100 ? ' (escala ' + S.escala + ' %)' : ''), 'medido') + fila('Cabe en ' + imp.t, F.dims.some(x => x > imp.cama) ? 'NO (' + imp.cama + ' mm)' : 'Sí (' + imp.cama + ' mm)', 'medido') +
      (o ? fila('Orientación', o.t, '') + fila('En el aire (más de 30°)', C.n2(o.voladizo_cm2, 1) + ' cm²', 'medido') + fila('Tocando la cama', C.n2(o.apoyo_cm2, 1) + ' cm²', 'medido') : '') +
      (R.volumen_cm3 ? fila('Volumen', C.n2(R.volumen_cm3 * Math.pow(S.escala / 100, 3)) + ' cm³', 'medido') : '') + '</table><h2>Ajustes que van dentro del 3MF</h2><table>' + Object.entries(k).map(([a, b]) => fila(a, b, '')).join('') + '</table>' +
      '<p><small>Soportes: ' + esc(SOPORTES[S.soporte] ? SOPORTES[S.soporte][0] : '—') + ' · Material: ' + esc(S.material) + ' · Uso: ' + esc(USOS[S.uso]) + (S.perfil ? ' · Perfil: ' + esc(S.perfil) : '') + '</small></p><p><small>Estas comprobaciones son automáticas: no garantizan que la impresión salga bien. Revisa la vista previa por capas en Bambu Studio y, si la pieza encaja con otra, imprime antes su prueba de encaje.</small></p></html>';
    window.__r8doc.informe = html.length;
    C.guardaEnPC(new Blob([html], { type: 'text/html' }), 'Informes', 'print_doctor_' + C.limpioNombre(M.nombre) + '_' + C.marcaHora() + '.html', 'text/html').catch(e => toast(e.message, 'bad'));
  }
  function publicaDbg() { const o = (S.orient || []).find(x => x.k === S.giro); window.__r8doc = Object.assign(window.__r8doc || {}, { rev: S.rev, insp: S.insp, export: S.export, giro: S.giro, recomendado: S.recomendado, soporte: S.soporte, soporteRec: S.soporteRec, balsa: S.balsa, veredicto: veredicto(), orient: S.orient ? S.orient.map(x => ({ k: x.k, voladizo: x.voladizo_cm2, apoyo: x.apoyo_cm2, alto: x.alto })) : null, dims: S.M ? MA.caja(mallaFinal().V).dims : null, voladizo: o ? o.voladizo_cm2 : null }); }

  const quita = E.escucha('sistema', () => pinta());
  window.__r8doc = {}; pinta(); pintaVista(); await carga();
  return { destroy() { vivo = false; quita(); if (esc) esc.destruir(); } };
}
