// ================= 13-10-2026 · 🛡️ CelebriR8 · RESISTENCIA: el detector de fragilidad, en pantalla =================
// La dueña: «hay piezas que se ven bien pero las tocas y se rompen; que pueda detectar y ajustar a más robusto TOCANDO esa zona que
// dice que es débil y subirle la dureza».
// La pieza de la mesa (o un archivo) se pinta por zonas: verde = bien; amarillo = justa para lo que le pides; naranja = frágil;
// rojo = se parte al tocarla. Cada zona dice su medida y lo que aguanta (en kilos, ESTIMADO con la cuenta de una viga). Se toca la
// zona —en la pieza o en la lista— y se refuerza: engordarla hasta lo que se pide, o solo redondear su base. «Subir la dureza» es el
// desplegable de arriba: decoración, normal, fuerte, muy fuerte; cambia lo que se exige y, por tanto, cuánto se engorda.
// También dice lo que NO es geometría: si en otra postura aguantaría más, y lo que ganas con más paredes y relleno.
// El original de la mesa no se toca: cada refuerzo se puede deshacer. Las cuentas están en r8/fragilidad.js.
import { h, mount, btn, toast } from '../ui.js';
import * as E from '../r8/estado.js';
import * as MA from '../r8/malla.js';
import * as C from '../r8/comun.js';
import * as FG from '../r8/fragilidad.js';

const PUNTO = { rojo: '🔴', naranja: '🟠', amarillo: '🟡', verde: '🟢' };
const kilos = F => (F == null || !isFinite(F) ? '—' : F / 9.81 < 1 ? FG.n1(F / 9.81 * 1000, 0) + ' g' : FG.n1(F / 9.81) + ' kg');
const GIRO = { x: [0, -90, 0], y: [90, 0, 0] }, POSTURA = { z: 'como está ahora', x: 'tumbada, con su lado derecho hacia arriba', y: 'tumbada, con su parte de atrás hacia arriba' };

export async function montarFragil(el, ext = {}) {
  const N = await import('../r8/nucleo.js');
  const lienzo = h('canvas.r8p-cv', { 'aria-label': 'La pieza pintada por zonas: toca una zona de color' }), vbar = h('div.r8p-vbar'), vacio = h('div.r8p-vacio'), izq = h('div.r8p-izq.fg-izq'), der = h('div.r8p-der.fg-der');
  const raiz = h('div.r8p.fg', izq, h('div.r8p-vista.fg-vista', lienzo, vacio, vbar), der);
  el.appendChild(raiz);
  let esc = null; try { esc = await C.vista3d(lienzo); } catch (e) { mount(vacio, h('div', h('b', '⚠️ La vista 3D no arranca'), h('small', e.message))); }
  const guardadas = (() => { try { return JSON.parse(localStorage.getItem('cd.r8.fragil') || '{}'); } catch (e) { return {}; } })();
  const S = { material: FG.MATERIALES[guardadas.material] ? guardadas.material : 'PLA', dureza: FG.DUREZAS[guardadas.dureza] ? guardadas.dureza : 'normal', impresion: FG.IMPRESION[guardadas.impresion] ? guardadas.impresion : 'media', M: null, R: null, sel: -1, mas: 0, ocupado: '', antes: null, error: '' };
  const recuerda = () => { try { localStorage.setItem('cd.r8.fragil', JSON.stringify({ material: S.material, dureza: S.dureza, impresion: S.impresion })); } catch (e) { } };
  let vivo = true; const pausa = (ms = 30) => new Promise(r => setTimeout(r, ms));

  // ---------- mirar la pieza ----------
  async function carga(conserva) {
    const M = E.mesa(); S.M = null; S.R = null; S.sel = -1; S.error = ''; if (!conserva) S.antes = null;
    if (!M) { pinta(); pintaVista(); return; }
    S.ocupado = 'Buscando zonas frágiles…'; pinta(); const T = E.tarea('Buscando zonas frágiles en «' + M.nombre + '»'); await pausa();
    try { S.M = MA.suelda(await MA.sopaDe(M.stl)); await pausa(); await analiza(T); T.bien(S.R.veredicto); }
    catch (e) { S.error = e.message || String(e); T.mal(S.error); toast('No he podido revisar la pieza: ' + S.error, 'bad', 8000); }
    S.ocupado = ''; if (!vivo) return; pinta(); pintaVista(true); publica();
  }
  async function analiza(T) { let ult = 0; S.R = FG.analiza(S.M, { material: S.material, dureza: S.dureza, impresion: S.impresion, alAvanzar: (p, t) => { if (T && p - ult > 0.1) { ult = p; T.avance(Math.round(p * 100), t); } } }); S.sel = S.R.zonas.length ? 0 : -1; }
  async function repite() { if (!S.M) return; S.ocupado = 'Rehaciendo las cuentas…'; pinta(); await pausa(); try { await analiza(null); } catch (e) { S.error = e.message; } S.ocupado = ''; pinta(); pintaVista(); publica(); }
  async function abreArchivo(f) { try { const r = await C.leeModelo(f); E.ponEnMesa({ nombre: r.nombre, origen: 'archivo', stl: r.stl }); await carga(); } catch (e) { toast(e.message || String(e), 'bad', 8000); } }

  // ---------- la vista: la pieza por colores; se toca una zona ----------
  function pintaVista(encuadra) {
    const M = E.mesa();
    mount(vacio, M ? null : h('div', h('b', '🛡️ Resistencia'), h('small', 'Trae una pieza del Estudio, del Catálogo o de cualquier pestaña (o ábrela aquí) y te digo dónde se va a partir antes de imprimirla.'), C.zonaSoltar('Abrir un modelo', abreArchivo)));
    if (!esc) return; if (!S.M || !S.R) { esc.ponPartes([]); mount(vbar); return; }
    esc.ponPartes([{ id: 'p', vista: FG.vistaColores(S.M, S.R, S.sel), color: '#ffffff', acabado: 'mate' }]);
    const z = S.R.zonas[S.sel]; esc.marcadores(z ? [{ p: z.centro, r: Math.max(0.9, Math.min(3, z.min)) }] : []);
    if (encuadra) esc.encuadrar('iso');
    const c = S.R.cuenta; mount(vbar, h('span.r8p-pill.fg-ley', h('i.fg-p.rojo'), c.rojo + ' se parte'), h('span.r8p-pill.fg-ley', h('i.fg-p.naranja'), c.naranja + ' frágil'), h('span.r8p-pill.fg-ley', h('i.fg-p.amarillo'), c.amarillo + ' justa'), h('span.r8p-pill.fg-ley', h('i.fg-p.verde'), 'lo demás, bien'), C.botonesVista(() => esc));
  }
  // un toque (sin arrastrar) sobre la pieza elige la zona de esa cara
  let abajo = null;
  lienzo.addEventListener('pointerdown', e => { abajo = [e.clientX, e.clientY]; });
  lienzo.addEventListener('pointerup', e => { if (!abajo || Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 5 || !esc || !S.R) return; abajo = null; const c = esc.caraEn ? esc.caraEn(e) : null; if (!c) return; const zi = S.R.deCara[c.tri]; if (zi == null || zi < 0) { toast('Esa parte está bien: no hay nada que reforzar ahí.', 'ok', 2500); return; } elige(zi, true); });
  function elige(i, desdePieza) { S.sel = i; S.mas = 0; pinta(); pintaVista(); if (desdePieza) setTimeout(() => { const f = der.querySelector('.fg-z.on'); if (f) f.scrollIntoView({ block: 'nearest' }); }, 30); }

  // ---------- reforzar ----------
  async function refuerza(zonas, modo) {
    const M = E.mesa(); if (!M || !S.R || S.ocupado) return;
    S.ocupado = zonas.length > 1 ? 'Reforzando ' + zonas.length + ' zonas…' : 'Reforzando la zona…'; pinta(); const T = E.tarea('Reforzando «' + M.nombre + '»'); await pausa(60);
    const antes = { cuenta: Object.assign({}, S.R.cuenta), zonas: zonas.map(z => ({ titulo: z.titulo, F: z.F, min: z.min, tipo: z.tipo, nivel: z.nivel })), vol: S.R.vol }; let hechas = 0, fallos = [], añadido = 0;
    try {
      let m = N.deSopa(MA.aSopa(S.M));
      for (const z of zonas) { T.avance(Math.round(10 + 80 * hechas / zonas.length), z.titulo); await pausa();
        try { const X = FG.refuerza(N, m, z, S.R, { modo: z.tipo === 'cuello' ? modo : 'engordar', mas: S.mas }); m = X.m; añadido += X.añadido; hechas++; } catch (e) { fallos.push(z.titulo + ': ' + (e.message || e)); } }
      if (!hechas) throw new Error(fallos[0] || 'No he podido reforzar esa zona.');
      const stl = new Uint8Array(N.stl(m, M.nombre)); N.limpia(); E.cambiaMesa(stl, (modo === 'base' ? 'redondear la base de ' : 'reforzar ') + (zonas.length > 1 ? zonas.length + ' zonas' : zonas[0].titulo.toLowerCase()));
      S.antes = Object.assign(antes, { añadido, modo, hechas, fallos }); T.bien('+' + FG.n1(añadido / 1000, 2) + ' cm³'); S.ocupado = ''; await carga(true);
      const g = añadido / 1000 * 1.24; toast('💪 Reforzada: +' + FG.n1(añadido / 1000, 2) + ' cm³ (≈ ' + FG.n1(g) + ' g de PLA). Mira cómo ha quedado; si no te gusta, «Deshacer».' + (fallos.length ? ' · ' + fallos.length + ' zona(s) no se han podido.' : ''), 'ok', 9000);
    } catch (e) { N.limpia(); S.ocupado = ''; T.mal(e.message || String(e)); toast(e.message || String(e), 'bad', 10000); pinta(); }
  }
  async function deshaz() { const que = E.deshazMesa(); if (!que) return; S.antes = null; toast('↶ Deshecho: ' + que, 'ok', 3000); await carga(); }
  async function gira(P) { const M = E.mesa(); if (!M || !GIRO[P]) return; try { S.ocupado = 'Girando la pieza…'; pinta(); await pausa(); const m = N.aLaCama(N.deSopa(MA.aSopa(S.M)).rotate(GIRO[P])), stl = new Uint8Array(N.stl(m, M.nombre)); N.limpia(); E.cambiaMesa(stl, 'girarla para que aguante más'); S.ocupado = ''; await carga(); toast('🔄 Girada. Así, el hilo va a lo largo de la zona débil.', 'ok', 5000); } catch (e) { N.limpia(); S.ocupado = ''; toast(e.message || String(e), 'bad', 8000); pinta(); } }

  // ---------- paneles ----------
  const selec = (k, ops, titulo) => h('label.r8e-c.col', h('span', titulo), h('select.inp', { 'data-k': k, disabled: !!S.ocupado, onchange: e => { S[k] = e.target.value; recuerda(); repite(); } }, Object.entries(ops).map(([v, o]) => h('option', { value: v, selected: S[k] === v }, o.t))));
  function pinta() {
    if (!vivo) return; const M = E.mesa(), R = S.R, dur = FG.DUREZAS[S.dureza];
    mount(izq,
      h('div.r8p-tit', h('span', '🛡️'), h('div', h('span.r8p-marca', 'RESISTENCIA'), h('b', 'Detector de fragilidad'), h('small', 'Dónde se va a partir la pieza, cuánto aguanta y cómo reforzarla. Es una estimación (la cuenta de una viga), no un ensayo.'))),
      h('div.r8p-sec', h('b', 'La pieza'), M ? h('div.r8t-mod', h('b', M.nombre), h('small', (E.ORIGEN[M.origen] || M.origen) + (M.historial.length ? ' · ' + M.historial.length + ' cambio(s)' : '') + ' · el original se conserva')) : null, C.zonaSoltar(M ? 'Mirar otra pieza' : 'Abrir un modelo', abreArchivo),
        M ? h('small.muted', 'Se mira TAL COMO ESTÁ PUESTA: de pie en la cama, como se va a imprimir.') : null),
      h('div.r8p-sec.fg-pide', h('b', '¿Cuánto tiene que aguantar?', C.ayuda('Es «la dureza» que le pides. Cuanto más alto, más zonas se marcan y más se engordan al reforzarlas. Decoración: paredes de 1,2 mm y 0,6 kg en la punta de un saliente. Normal: 1,6 mm y 1,5 kg. Fuerte: 2,4 mm y 3,5 kg. Muy fuerte: 3,2 mm y 7 kg.')),
        selec('dureza', FG.DUREZAS, 'Dureza'), h('small.muted', 'Paredes de ' + FG.n1(dur.pared) + ' mm o más · un saliente aguanta ' + kilos(dur.F) + ' en la punta'),
        selec('material', FG.MATERIALES, 'Material'), selec('impresion', FG.IMPRESION, 'Cómo la imprimes'),
        h('small.muted', 'Con más paredes y más relleno la pieza es más maciza por dentro y aguanta más: cámbialo y mira cómo cambian los kilos.')),
      R && R.mejorPostura !== 'z' && isFinite(R.posturas.z) ? h('div.r8p-sec.fg-postura', h('b', '🔄 Aguantaría más en otra postura'), h('p.small', 'Como está, lo más débil aguanta ≈ ' + kilos(R.posturas.z) + ' y se parte por una capa. Imprimiéndola ' + POSTURA[R.mejorPostura] + ', aguantaría ≈ ' + kilos(R.posturas[R.mejorPostura]) + ' (el hilo iría a lo largo de esa zona).'), btn('🔄 Girarla así', () => gira(R.mejorPostura), { cls: 'sm fg-girar', disabled: !!S.ocupado }), h('small.muted', 'Ojo: al girarla pueden hacer falta soportes. Míralo luego en el Print Doctor.')) : null,
      h('details.r8p-sec.fg-como', h('summary', '❔ Cómo lo calculo'), h('p.small', 'PAREDES: desde cada cara miro hacia dentro hasta la cara de enfrente; eso es el grueso. Menos de 0,8 mm (2 líneas de la boquilla de 0,4) se parte al tocarla.'), h('p.small', 'CUELLOS: corto la pieza en rodajas en los tres sentidos. Donde todo lo de más allá cuelga de una sección pequeña, esa sección hace de palanca: fuerza que aguanta = resistencia del plástico × lo dura que es la sección ÷ el largo de lo que cuelga.'), h('p.small', 'Entre capas el plástico aguanta la mitad que a lo largo del hilo: por eso lo que se imprime de pie se parte por una capa.'), h('p.small', 'Lo que NO sé: golpes, calor, piezas mal impresas (capas despegadas), ni el esfuerzo real que le vas a dar. Imprime la zona y pruébala.')));
    pintaDer(); publica();
  }
  function pintaDer() {
    const M = E.mesa(), R = S.R;
    if (S.ocupado) { mount(der, h('div.fg-espera', h('div.ac50-giro'), h('p', S.ocupado))); return; }
    if (!M) { mount(der, h('div.r8p-tit', h('span', '💪'), h('div', h('b', 'Zonas débiles'), h('small', 'Aquí sale la lista, de la más grave a la menos.')))); return; }
    if (!R) { mount(der, h('p.r8p-nota.mal', S.error || 'No he podido revisar esta pieza.'), ext.irA ? btn('🛠️ Repararla primero', () => ext.irA('taller'), { cls: 'sm' }) : null); return; }
    const graves = R.zonas.filter(z => z.nivel !== 'amarillo'), A = S.antes;
    const fila = z => { const on = z.id === S.sel;
      return h('div.fg-z.' + z.nivel + (on ? '.on' : ''), { 'data-zona': z.id, 'data-tipo': z.tipo, onclick: e => { if (e.target.closest('button, input')) return; elige(z.id); } },
        h('div.fg-z-t', h('span', PUNTO[z.nivel]), h('b', z.titulo), z.tipo === 'cuello' ? h('span.fg-kg', '≈ ' + kilos(z.F)) : h('span.fg-kg', FG.n1(z.min) + ' mm')),
        h('small', z.texto),
        on ? h('div.fg-acc',
          h('div.r8p-btns', btn(z.tipo === 'cuello' ? '💪 Engordar esta zona' : '💪 Engordar esta pared', () => refuerza([z], 'engordar'), { cls: 'primary sm fg-reforzar', title: z.tipo === 'cuello' ? 'Se engorda todo lo que cuelga de aquí, más en la base y nada en la punta, hasta que aguante lo que le pides' : 'Se engorda solo lo que mide menos de lo que le pides, capa a capa' }),
            z.tipo === 'cuello' ? btn('◢ Solo redondear la base', () => refuerza([z], 'base'), { cls: 'sm fg-base', title: 'No cambia el grueso de la zona (si encaja en otra pieza, sigue encajando): solo quita la esquina viva de la base, que es por donde se parte' }) : null),
          h('label.fg-mas', h('span', 'Un poco más (mm)'), h('input', { type: 'range', min: 0, max: 2, step: 0.2, value: S.mas, 'data-k': 'mas', oninput: e => { S.mas = Number(e.target.value); e.target.nextSibling.textContent = '+' + FG.n1(S.mas); } }), h('i', '+' + FG.n1(S.mas))),
          h('small.fg-ojo', '⚠️ Si esta zona ENCAJA en otra pieza (un eje en un agujero, una pestaña en su ranura), al engordarla dejará de entrar' + (z.tipo === 'cuello' ? ': usa «Solo redondear la base».' : ': engorda entonces la otra pieza o cambia el diseño.'))) : null); };
    mount(der,
      h('div.r8p-nota.' + ({ verde: 'bien', amarillo: 'ojo', naranja: 'ojo', rojo: 'mal' }[R.peor]), h('b', { verde: '✅ ', amarillo: '🟡 ', naranja: '⚠️ ', rojo: '❌ ' }[R.peor]), R.veredicto),
      A ? h('div.fg-antes', h('b', '💪 ' + (A.modo === 'base' ? 'Base redondeada' : 'Reforzada') + ' · +' + FG.n1(A.añadido / 1000, 2) + ' cm³ (≈ ' + FG.n1(A.añadido / 1000 * 1.24) + ' g)'), h('small', 'Antes: ' + A.cuenta.rojo + ' 🔴 · ' + A.cuenta.naranja + ' 🟠 · ' + A.cuenta.amarillo + ' 🟡 → ahora: ' + R.cuenta.rojo + ' 🔴 · ' + R.cuenta.naranja + ' 🟠 · ' + R.cuenta.amarillo + ' 🟡'), A.fallos && A.fallos.length ? h('small.r8e-mal', A.fallos.join(' · ')) : null) : null,
      h('div.r8p-btns.fg-global', graves.length > 1 ? btn('💪 Reforzar todo lo rojo y naranja (' + graves.length + ')', () => refuerza(graves, 'engordar'), { cls: 'sm fg-todo' }) : null, M.historial.length ? btn('↶ Deshacer', deshaz, { cls: 'sm ghost fg-deshacer', title: 'Vuelve a como estaba antes del último cambio' }) : null),
      R.zonas.length ? h('div.fg-lista', R.zonas.map(fila)) : h('p.small.muted', 'Nada que reforzar. Si quieres ser más exigente, sube la dureza a la izquierda.'),
      R.zonas.length >= 40 ? h('small.muted', 'Hay más zonas: se enseñan las 40 más graves. Refuerza y vuelve a mirar.') : null,
      h('div.r8p-sec', h('b', 'Siguiente paso'), h('div.r8p-btns', ext.irA ? btn('🩺 Al Print Doctor', () => ext.irA('doctor'), { cls: 'sm fg-doctor' }) : null, btn('💾 Guardar el STL', () => C.guardaEnPC(M.stl, 'Reforzados', C.limpioNombre(M.nombre) + (M.historial.length ? '_reforzada' : '') + '.stl', 'model/stl').catch(e => toast(e.message, 'bad')), { cls: 'sm ghost' }))));
  }
  function publica() { window.__r8fg = { ocupado: S.ocupado, error: S.error, dureza: S.dureza, material: S.material, impresion: S.impresion, sel: S.sel, peor: S.R ? S.R.peor : null, cuenta: S.R ? S.R.cuenta : null, veredicto: S.R ? S.R.veredicto : null, posturas: S.R ? S.R.posturas : null, mejorPostura: S.R ? S.R.mejorPostura : null, vol: S.R ? S.R.vol : null, antes: S.antes ? { añadido: S.antes.añadido, modo: S.antes.modo, cuenta: S.antes.cuenta } : null,
    zonas: S.R ? S.R.zonas.map(z => ({ id: z.id, tipo: z.tipo, nivel: z.nivel, titulo: z.titulo, min: z.min, F: z.F ?? null, centro: z.centro, caras: z.caras.length, eje: z.eje || null })) : null, aPantalla: p => { const q = esc.aPantalla(p), r = lienzo.getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; }, elige, refuerza: (i, modo) => refuerza([S.R.zonas[i]], modo || 'engordar') }; }

  const quita = E.escucha('mesa', () => { /* (otra pestaña ha cambiado la pieza: se vuelve a mirar al entrar) */ });
  pinta(); pintaVista(); await carga();
  return { destroy() { vivo = false; quita(); if (esc) esc.destruir(); delete window.__r8fg; }, abreArchivo };
}
