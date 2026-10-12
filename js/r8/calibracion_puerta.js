// ================= v30.6.3 · 🎯 LA PUERTA DE CelebriR8: PRIMERO, CALIBRAR =================
// La dueña (12-10-2026): «en la siguiente actualización del programa, que no deje iniciar sin antes calibrar… vamos a dejarla
// calibrada: me das para imprimir una cosa que hará que esté calibrada perfectamente; mientras se imprime…; luego ponemos lo que
// nos pide y se configura; que me dé 3 pruebas en una sola placa, así mejor precisión. Hablo de CelebriR8».
//  1) eliges impresora y material · 2) imprimes LA PLACA (3 probetas numeradas; en el PC sale ya laminada por tu Bambu Studio) ·
//  3) mientras se imprime, compruebas el calibre con una moneda · 4) mides las tres y escribes lo que marcan · 5) el programa hace
//  las cuentas (de cada cota, el valor del medio de las tres), lo guarda y desde ese momento cada pieza va corregida sola.
// La calibración se guarda en el aparato y, si puedes cambiar la configuración, también en el taller (S.cfg.taller.r8calibracion,
// que el servidor ya admite): así vale en la torre, el portátil y la tablet. Sin la placa mandada a imprimir NO se entra; mientras
// se imprime (un día) se puede entrar a diseñar. («cd.r8.puerta» = «no» quita la puerta: es para las pruebas automáticas.)
import { h, mount, btn, toast } from '../ui.js';
import * as CPR from './calibracion.js';
import { dibujo } from './calibracion_ui.js';

const LS = 'cd.r8.calibrando', DIA = 24 * 3600e3;
const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
export const IMPRESORAS = [['P1P', 'Bambu P1P', 256, 'p1p'], ['A1 mini', 'Bambu A1 mini', 180, 'a1m']], MATERIALES = ['PLA', 'PETG', 'TPU'];
const nuevo = () => ({ imp: 'P1P', mat: 'PLA', n: 1, enviada: 0, lam: null, med: [{}, {}, {}], cal: { cero: 0, medido: '' } }); // v30.7.1: n = cuántas probetas lleva la placa (1, 2 o 3)
export function estado() { try { const e = Object.assign(nuevo(), JSON.parse(localStorage.getItem(LS) || '{}')); if (!Array.isArray(e.med) || e.med.length !== 3) e.med = [{}, {}, {}]; if (e.enviada && !('n' in JSON.parse(localStorage.getItem(LS) || '{}'))) e.n = 3; /* una placa mandada con la 30.6.3 era de 3 */ e.n = [1, 2, 3].includes(Number(e.n)) ? Number(e.n) : 1; return e; } catch (x) { return nuevo(); } }
const apunta = e => { try { localStorage.setItem(LS, JSON.stringify(e)); } catch (x) { } };

// ---------- el taller (para que valga en todos los aparatos) ----------
export async function traeDeLaNube() {
  try { const { S } = await import('../store.js'), n = S.cfg && S.cfg.taller && S.cfg.taller.r8calibracion, g = CPR.guardado();
    if (n && n.perfiles && Object.keys(n.perfiles).length && (n.actualizado || 0) > (g.actualizado || 0)) { CPR.pon(n); return true; } } catch (e) { }
  return false;
}
export async function llevaALaNube() {
  try { const { S, api, can, emit } = await import('../store.js'); if (!S.cfg || !can('config.editar')) return false;
    S.cfg = await api('config.guardar', { clave: 'taller', valor: Object.assign({}, S.cfg.taller || {}, { r8calibracion: CPR.guardado() }) }, { quiet: true }); emit(); return true;
  } catch (e) { console.warn('calibración → taller', e); return false; }
}
export function sinPuerta() { try { return localStorage.getItem('cd.r8.puerta') === 'no'; } catch (e) { return false; } }
export const calibrada = () => !!CPR.activa();
export const imprimiendo = () => { const e = estado(); return !!e.enviada && Date.now() - e.enviada < DIA; };
const hora = t => { const d = new Date(t), z = n => String(n).padStart(2, '0'); return z(d.getDate()) + '-' + z(d.getMonth() + 1) + ' a las ' + z(d.getHours()) + ':' + z(d.getMinutes()); };
const tiempo = s => { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : ''); };

// ---------- la puerta ----------
// Pinta la puerta en «el». alPasar({ espera }) = entrar en CelebriR8. o = { volver(), dentro (se abrió desde dentro: se puede cerrar) }
export function puerta(el, alPasar, o = {}) {
  const E = estado(); let R = null, vivo = true, ocupado = '', calR = null, pc = false;
  import('../desktop.js').then(d => { pc = !!(d.desktop && d.desktop.on); if (pc) pinta(); }).catch(() => { });
  const raiz = h('div.cpu', { role: 'region', 'aria-label': 'Calibrar la impresora antes de empezar' }); el.appendChild(raiz);
  const guarda = () => apunta(E), impDe = () => IMPRESORAS.find(i => i[0] === E.imp) || IMPRESORAS[0];
  const pinta = () => { if (vivo) mount(raiz, contenido()); };
  const nomPlaca = () => 'Placa_calibracion_' + E.n + (E.n === 1 ? '_probeta' : '_probetas') + '_' + impDe()[3] + '_' + E.mat;
  const numero = v => { const x = Number(String(v ?? '').replace(',', '.')); return x > 0 ? x : null; };
  const llenas = () => E.med.filter(m => CPR.COTAS.every(c => numero(m[c.k]) != null)).length;
  const escritas = () => E.med.reduce((a, m) => a + CPR.COTAS.filter(c => numero(m[c.k]) != null).length, 0);

  async function manda(como) {
    if (ocupado) return; ocupado = como; pinta();
    try {
      const N = await import('./nucleo.js'); await N.cargar(); const CAT = await import('./catalogo.js'), A = await import('./consejos3d.js'), D = CAT.DISENOS.pruebaPrecision, [, , cama, impK] = impDe(); let blob;
      try { blob = N.tresMF([{ m: N.aLaCama(CPR.placaN(cama, E.n)), color: D.color, nombre: 'Placa de calibracion (' + E.n + (E.n === 1 ? ' probeta)' : ' probetas)') }], nomPlaca(), Object.assign(A.claves({ acabado: 'equilibrado', uso: 'encaje', soporte: 'no', balsa: 'no' }), D.bambu)); } finally { N.limpia(); }
      window.__cpuPlaca = { bytes: blob.size, cama, imp: impK, n: E.n };
      const d = await import('../desktop.js').catch(() => null), pc = !!(d && d.desktop && d.desktop.on);
      if (como === 'laminado' && pc) {
        const res = await d.desktop.bambuAbrir(blob, nomPlaca(), true, { laminar: '1', imp: impK, mat: E.mat, proc: '0.16mm CelebriR8 PRECISION @' + (impK === 'a1m' ? 'A1mini' : 'P1P') });
        E.enviada = Date.now(); E.lam = res && res.laminado ? { seg: res.segundos || 0, g: res.gramos || 0 } : null; guarda();
        toast(res && res.laminado ? '🖨️ La placa se ha abierto en Bambu Studio, ya laminada: pulsa «Imprimir placa».' : '🖨️ La placa se ha abierto en Bambu Studio' + (res && res.motivoLaminado ? ' sin laminar (' + res.motivoLaminado + ')' : '') + ': pulsa Laminar placa e Imprimir.', 'ok', 12000);
      } else {
        const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nomPlaca() + '.3mf' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000);
        E.enviada = Date.now(); E.lam = null; guarda(); toast('⬇️ Placa descargada (3MF): ábrela con Bambu Studio, lamina e imprime.', 'ok', 10000);
      }
    } catch (e) { toast(e.message || String(e), 'bad', 9000); } finally { ocupado = ''; pinta(); }
  }
  function compruebaCalibre() { const r = CPR.calibre({ cero: Number(String(E.cal.cero || 0).replace(',', '.')) || 0, c20: numero(E.cal.medido) || 0 }); CPR.guardaCalibre(r); calR = r; toast(r.ok ? '✅ Tu calibre mide bien.' : '⚠️ ' + r.avisos.join(' '), r.ok ? 'ok' : 'warn', 9000); pinta(); }
  function calcular() { try { const c = CPR.guardado().calibre; R = CPR.calcula3(E.med, (c && c.off) || 0); } catch (e) { R = null; toast(e.message || String(e), 'warn', 9000); } pinta(); if (R) setTimeout(() => { const x = raiz.querySelector('.cpu-res'); if (x) x.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60); }
  async function guardar() {
    const clave = E.imp + ' · ' + E.mat, c = CPR.guardado().calibre;
    CPR.guarda(clave, R, { impresora: E.imp, material: E.mat, calibre: c ? c.off : 0, v: 3, probetas: R.probetas, repite: R.repite, estimada: false });
    try { localStorage.removeItem(LS); } catch (e) { }
    const nube = await llevaALaNube();
    toast('🎯 Calibrada: «' + clave + '». Desde ahora, todo lo que mandes a Bambu desde CelebriR8 sale corregido solo' + (nube ? ' (y vale en todos tus aparatos).' : '.'), 'ok', 10000);
    alPasar({});
  }
  // v30.7.1 · este material, ESTIMADO a partir de otro que sí está medido en esta misma impresora (sin imprimir otra placa)
  const medidoDe = () => { const g = CPR.guardado(); return ['PLA', 'PETG', 'TPU'].filter(m => m !== E.mat).map(m => ({ m, p: g.perfiles[E.imp + ' · ' + m] })).find(x => x.p && !x.p.estimada) || null; };
  async function estimar() {
    const b = medidoDe(); if (!b) return; const Rn = CPR.estimaMaterial(b.p, b.m, E.mat); if (!Rn) return; const clave = E.imp + ' · ' + E.mat;
    CPR.guarda(clave, Rn, { impresora: E.imp, material: E.mat, v: 3, estimada: true, desde: b.m });
    const nube = await llevaALaNube();
    toast('✨ «' + clave + '» queda ESTIMADA a partir de tu ' + b.m + ' (no medida). Para piezas a presión, afínala con una probeta cuando puedas' + (nube ? '. Vale en todos tus aparatos.' : '.'), 'ok', 12000);
    alPasar({});
  }
  // una casilla de medida; Intro pasa a la de debajo (y de la última de una probeta, a la primera de la siguiente)
  const casilla = (c, i) => h('input.inp.cpu-m', { type: 'number', step: 0.01, min: 0, inputmode: 'decimal', 'data-cota': c.k, 'data-prob': String(i + 1), 'aria-label': c.nombre + ', probeta ' + (i + 1), placeholder: n2(c.d), value: E.med[i][c.k] ?? '',
    oninput: e => { E.med[i][c.k] = e.target.value; guarda(); R = null; marca(c.k); cuenta(); solo(); },
    onkeydown: e => { if (e.key !== 'Enter') return; e.preventDefault(); const L = [...raiz.querySelectorAll('.cpu-m[data-prob="' + (i + 1) + '"]')], j = L.indexOf(e.target), sig = L[j + 1] || raiz.querySelector('.cpu-m[data-prob="' + (i + 2) + '"]') || raiz.querySelector('.cpu-calcula'); if (sig) { sig.focus(); if (sig.select) sig.select(); } } });
  // la fila se marca si sus tres medidas no cuadran (más de 0,10 mm entre la mayor y la menor)
  function marca(k) { const f = raiz.querySelector('.cpu-fila[data-fila="' + k + '"]'); if (!f) return; const V = E.med.map(m => numero(m[k])).filter(v => v != null); f.classList.toggle('duda', V.length > 1 && Math.max(...V) - Math.min(...V) > 0.1); }
  const textoCuenta = () => escritas() + ' medidas escritas · ' + llenas() + (llenas() === 1 ? ' probeta completa' : ' probetas completas') + (llenas() ? ' (ya se puede calcular)' : '');
  // v40 · «que haga automáticamente el cálculo» (la dueña, 12-10-2026): en cuanto están escritas todas las medidas de las probetas
  // que se imprimieron, las cuentas salen solas (medio segundo después de la última tecla), sin pulsar nada
  let ticSolo = null;
  function solo() { clearTimeout(ticSolo); const hechas = llenas(), amedias = E.med.some(m => { const k = CPR.COTAS.filter(c => numero(m[c.k]) != null).length; return k > 0 && k < CPR.COTAS.length; }); if (!hechas || amedias || hechas < Math.min(E.n, 3)) return;
    ticSolo = setTimeout(() => { if (!vivo || R) return; const foco = document.activeElement, dk = foco && foco.dataset ? [foco.dataset.cota, foco.dataset.prob] : null; calcular(); if (dk && dk[0]) { const x = raiz.querySelector('.cpu-m[data-cota="' + dk[0] + '"][data-prob="' + dk[1] + '"]'); if (x) { x.focus(); try { x.setSelectionRange(x.value.length, x.value.length); } catch (e) { } } } else { const gb = raiz.querySelector('.cpu-guarda'); if (gb) gb.focus(); } }, 600); }
  function cuenta() { const x = raiz.querySelector('.cpu-cuenta'), n = llenas(); if (x) x.textContent = textoCuenta(); const b = raiz.querySelector('.cpu-calcula'); if (b) b.disabled = !n; const p = raiz.querySelector('.cpu-paso[data-paso="4"]'); if (p) { p.classList.toggle('hecho', n >= Math.min(E.n, 2) || n >= 1 && E.n === 1); const q = p.querySelector('.cpu-n'); if (q) q.textContent = (n >= Math.min(E.n, 2) || n >= 1 && E.n === 1) ? '✓' : '4'; } const r = raiz.querySelector('.cpu-res'); if (r) r.remove(); }

  function contenido() {
    const [, , cama] = impDe(), g = CPR.guardado(), env = !!E.enviada, espera = imprimiendo(), cal = calR || g.calibre, guardadas = Object.keys(g.perfiles), cols = Math.max(E.n, E.med.reduce((a, m, i) => (CPR.COTAS.some(c => numero(m[c.k]) != null) ? i + 1 : a), 1)), base = medidoDe(), yaEsta = g.perfiles[E.imp + ' · ' + E.mat], TP = CPR.TIEMPO_PLACA[E.n];
    const paso = (n, hecho, titulo, cosas) => h('section.cpu-paso' + (hecho ? '.hecho' : ''), { 'data-paso': String(n) }, h('h2', h('span.cpu-n', hecho ? '✓' : String(n)), titulo), cosas);
    const chips = (L, valor, alElegir) => h('div.cpu-chips', L.map(([k, t]) => h('button.cpu-chip' + (valor === k ? '.on' : ''), { type: 'button', 'data-v': k, onclick: () => { alElegir(k); guarda(); R = null; pinta(); } }, t)));
    return [
      h('header.cpu-cab', h('span.cpu-ico', '🎯'), h('div', h('h1', o.dentro ? 'Calibrar tu impresora' : 'Antes de empezar: vamos a dejar tu impresora calibrada'),
        h('p', 'Se hace UNA vez por impresora y material, con UNA sola pieza: la imprimes, la mides con el calibre y escribes los 10 números; las cuentas salen solas. Desde ese momento, todo lo que salga de CelebriR8 hacia tu Bambu va corregido solo, a medida.')),
        o.volver ? btn(o.dentro ? '✕ Cerrar' : '← Volver al negocio', o.volver, { cls: 'ghost cpu-volver' }) : null),
      !o.dentro && guardadas.length ? h('div.cpu-aviso', h('b', 'Tienes ' + guardadas.length + ' calibraci' + (guardadas.length > 1 ? 'ones guardadas' : 'ón guardada') + ', pero ninguna en uso. '), guardadas.map(k => btn('Usar «' + k + '»', async () => { CPR.ponActiva(k); await llevaALaNube(); alPasar({}); }, { cls: 'sm cpu-usar' }))) : null,
      paso(1, true, '¿Qué impresora y con qué material?', [chips(IMPRESORAS.map(i => [i[0], i[1]]), E.imp, k => { E.imp = k; }), chips(MATERIALES.map(m => [m, m]), E.mat, k => { E.mat = k; }),
        h('p.cpu-nota', 'Con el filamento que más uses. Cada plástico encoge distinto: los demás materiales se pueden ESTIMAR a partir de este (sin imprimir otra placa) y afinarse luego.'),
        yaEsta ? h('p.' + (yaEsta.estimada ? 'cpu-ojo' : 'cpu-ok') + '.cpu-ya', { 'data-estimada': yaEsta.estimada ? '1' : '0' }, yaEsta.estimada ? '✨ «' + E.imp + ' · ' + E.mat + '» está ESTIMADA a partir de tu ' + (yaEsta.desde || 'otro material') + '. Si imprimes y mides una probeta aquí, pasa a estar medida.' : '✅ «' + E.imp + ' · ' + E.mat + '» ya está medida (' + (yaEsta.fecha || '') + '). Puedes repetirla cuando quieras.') : null,
        base && !(yaEsta && !yaEsta.estimada) ? h('div.cpu-estima', h('div', h('b', '✨ ¿No quieres imprimir otra placa para ' + E.mat + '?'), h('small', 'Ya tengo medida tu ' + E.imp + ' con ' + base.m + '. Lo que es de la máquina es igual; lo que cambia con el ' + E.mat + ' (encoge un poco más, los agujeros se cierran un poco más) lo pongo con los valores típicos. Queda marcada como ESTIMADA: vale para casi todo; para piezas que encajan a presión, afínala con una sola probeta (35 min).')),
          btn(yaEsta && yaEsta.estimada ? '✨ Volver a estimarla desde ' + base.m : '✨ Estimar ' + E.mat + ' a partir de mi ' + base.m, estimar, { cls: 'cpu-estimar' })) : null]),
      paso(2, env, 'Imprime la placa de calibración', [
        h('p', h('b', 'Una sola pieza por material'), ' (35 minutos y 12 gramos): la imprimes, la mides, escribes los 10 números y el programa hace las cuentas solo. Si algún día quieres afinar más, puedes imprimir 2 o 3 a la vez.'),
        chips([[1, '1 pieza · 35 min (lo normal)'], [2, '2 piezas · 1 h 5 min'], [3, '3 piezas · 1 h 40 min']], E.n, k => { E.n = k; }),
        h('p', E.n === 1 ? 'Una probeta, en el centro de la placa de ' + cama + ' mm.' : E.n === 2 ? ['Son ', h('b', '2 probetas numeradas (1 y 2)'), ' en la placa de ' + cama + ' mm: una delante a la izquierda y otra detrás a la derecha, girada.'] : ['Son ', h('b', '3 probetas numeradas (1, 2 y 3)'), ' en la placa de ' + cama + ' mm: delante a la izquierda, en el centro (girada) y detrás a la derecha.'], ' Sin soportes. Más o menos ', h('b', TP[0] + ' y ' + TP[1]), '.'),
        h('div.cpu-btns', pc ? btn(ocupado === 'laminado' ? '⏳ Tu Bambu Studio la está laminando…' : '🖨️ Abrir en Bambu YA LAMINADA (solo Imprimir)', () => manda('laminado'), { cls: 'primary cpu-laminada', disabled: !!ocupado }) : null,
          btn(ocupado === '3mf' ? '⏳ Preparando…' : '⬇️ Descargar el 3MF', () => manda('3mf'), { cls: (pc ? '' : 'primary ') + 'cpu-baja', disabled: !!ocupado })),
        env ? h('p.cpu-ok', '✅ Mandada el ' + hora(E.enviada) + (E.lam && E.lam.seg ? ' · ' + tiempo(E.lam.seg) + ' y ' + n2(E.lam.g) + ' g según tu Bambu Studio' : '') + '. Si ha salido mal, mándala otra vez.') : h('p.cpu-nota', 'En Bambu Studio: «Imprimir placa». No cambies la escala ni le pongas compensaciones: tiene que salir tal cual imprime tu máquina.')]),
      paso(3, !!(cal && cal.ok), 'Mientras se imprime: comprueba tu calibre', [
        h('p', 'Cierra las patas: tiene que marcar 0,00. Luego mide el DIÁMETRO de una moneda de 20 céntimos por el canto, sin apretar: mide 22,25 mm.'),
        h('div.cpu-cal', h('label', h('span', 'Cerrado marca'), h('input.inp', { type: 'number', step: 0.01, inputmode: 'decimal', 'data-k': 'cero', value: E.cal.cero ?? 0, oninput: e => { E.cal.cero = e.target.value; guarda(); } })),
          h('label', h('span', 'La moneda de 20 céntimos marca'), h('input.inp', { type: 'number', step: 0.01, min: 0, inputmode: 'decimal', 'data-k': 'c20', placeholder: '22,25', value: E.cal.medido ?? '', oninput: e => { E.cal.medido = e.target.value; guarda(); } })),
          btn('Comprobar', compruebaCalibre, { cls: 'sm cpu-comprueba' })),
        cal ? h('p' + (cal.ok ? '.cpu-ok' : '.cpu-ojo'), cal.ok ? '✅ Tu calibre mide bien.' : '⚠️ Tu calibre se desvía ' + n2(cal.off || 0) + ' mm: se descuenta solo de lo que midas en las probetas.') : h('p.cpu-nota', 'Si no tienes esa moneda, sáltate este paso: el programa usa lo que marque tu calibre tal cual.')]),
      paso(4, llenas() >= Math.min(E.n, 2) || (llenas() >= 1 && E.n === 1), 'Mide las probetas y escribe lo que marca tu calibre', [
        h('p', 'Despégalas cuando la cama esté fría. Cada probeta lleva su número grabado. En milímetros, con dos decimales (12,03). ', h('b', 'Intro'), ' pasa a la casilla de debajo. ', h('b', 'No hace falta medirlas todas: con las que tengas (aunque sea una) ya se calcula.'), ' La que no midas, déjala entera en blanco.'),
        h('div.cpu-med', h('div.cpu-dib', dibujo()),
          h('div.cpu-tabla' + (cols === 1 ? '.una' : cols === 2 ? '.dos' : ''), { role: 'table' }, h('div.cpu-fila.cpu-cabt', h('span', 'Qué se mide'), [1, 2, 3].slice(0, cols).map(i => h('b', cols === 1 ? 'Lo que marca tu calibre' : 'Probeta ' + i))),
            CPR.COTAS.map(c => { const V = E.med.map(m => numero(m[c.k])).filter(v => v != null); return h('div.cpu-fila' + (V.length > 1 && Math.max(...V) - Math.min(...V) > 0.1 ? '.duda' : ''), { 'data-fila': c.k, title: c.donde },
              h('span.cpu-que', h('b', c.k), h('span', c.nombre, h('small', ' ' + n2(c.d) + ' mm · ' + c.donde))), [0, 1, 2].slice(0, cols).map(i => casilla(c, i))); }))),
        h('p.cpu-nota', h('span.cpu-cuenta', textoCuenta()), ' · En naranja, las medidas que no cuadran entre sí (más de 0,10 mm): mídelas otra vez. Si una probeta ha salido mal, déjala entera en blanco.')]),
      paso(5, !!R, 'Las cuentas (salen solas al escribir la última medida)', [
        h('div.cpu-btns', btn(R ? '🧮 Volver a calcular' : '🧮 Calcular ahora', calcular, { cls: 'cpu-calcula', disabled: !llenas() })),
        R ? h('div.cpu-res', { 'data-probetas': R.probetas.join(',') }, h('b', 'Tu ' + E.imp + ' con ' + E.mat + ' (con ' + R.probetas.length + (R.probetas.length === 1 ? ' probeta' : ' probetas') + '):'), h('p', CPR.texto({ s: R.s, sz: R.sz, escala: R.escala, claves: R.claves })),
          h('ul', h('li', R.escala[0] !== 1 ? 'Encoge ' + n2((1 - R.s) * 100) + ' % a lo largo y a lo ancho: la pieza saldrá un poco más grande para compensarlo (×' + R.escala[0].toLocaleString('es-ES') + ').' : 'A lo largo y a lo ancho no encoge (o menos de lo que nota un calibre).'),
            h('li', 'Por fuera, las piezas salen ' + n2(Math.abs(R.c)) + ' mm por lado más ' + (R.c >= 0 ? 'gordas' : 'finas') + '; los agujeros, ' + n2(Math.abs(R.h)) + ' mm por lado más ' + (R.h >= 0 ? 'pequeños' : 'grandes') + '; el pie de elefante, ' + n2(R.f) + ' mm. Todo eso se corrige solo.'),
            R.probetas.length === 2 ? h('li', 'Con dos probetas se usa la MEDIA de las dos en cada medida.') : null, R.repite != null ? h('li', 'Tu impresora repite a ' + n2(R.repite) + ' mm entre una probeta y otra' + (R.repite <= 0.05 ? ': muy bien.' : R.repite <= 0.1 ? ': bien.' : ': es mucho; mira que la cama esté limpia y nivelada.')) : h('li', 'Con una sola probeta no se sabe cuánto repite tu impresora: si puedes, mide otra.')),
          R.avisos.length ? h('p.cpu-ojo', '⚠️ ' + R.avisos.join(' ')) : h('p.cpu-ok', '✅ Las medidas cuadran entre sí.'),
          h('div.cpu-btns', btn(o.dentro ? '✅ Guardar y usar' : '✅ Guardar y entrar en CelebriR8', guardar, { cls: 'primary cpu-guarda' }))) : null]),
      o.dentro ? null : h('footer.cpu-pie', espera ? [btn('⏳ Se está imprimiendo: entrar a diseñar mientras tanto', () => alPasar({ espera: true }), { cls: 'cpu-espera' }), h('small', 'Puedes entrar así hasta el ' + hora(E.enviada + DIA) + '. Tus piezas no saldrán a medida hasta que termines la calibración.')]
        : h('p.cpu-cerrado', '🔒 CelebriR8 se abre cuando termines la calibración. Con la placa ya mandada a imprimir, podrás entrar a diseñar mientras tanto.'))
    ];
  }
  pinta();
  window.__cpu = { get E() { return E; }, get R() { return R; }, manda, calcular };
  return { destroy() { vivo = false; raiz.remove(); if (window.__cpu) delete window.__cpu; } };
}

// La misma pantalla, abierta desde dentro («🎯 Calibrar»): encima de todo y con su botón de cerrar
export function abrirPlaca3(o = {}) {
  const capa = h('div.cpu-capa', { role: 'dialog', 'aria-modal': 'true' }); document.body.appendChild(capa); let P = null;
  const cerrar = () => { if (P) P.destroy(); capa.remove(); if (o.alCerrar) o.alCerrar(); };
  P = puerta(capa, cerrar, { dentro: true, volver: cerrar });
  return { cerrar };
}
