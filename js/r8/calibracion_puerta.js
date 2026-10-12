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
const nuevo = () => ({ imp: 'P1P', mat: 'PLA', enviada: 0, lam: null, med: [{}, {}, {}], cal: { cero: 0, medido: '' } });
export function estado() { try { const e = Object.assign(nuevo(), JSON.parse(localStorage.getItem(LS) || '{}')); if (!Array.isArray(e.med) || e.med.length !== 3) e.med = [{}, {}, {}]; return e; } catch (x) { return nuevo(); } }
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
  const numero = v => { const x = Number(String(v ?? '').replace(',', '.')); return x > 0 ? x : null; };
  const llenas = () => E.med.filter(m => CPR.COTAS.every(c => numero(m[c.k]) != null)).length;
  const escritas = () => E.med.reduce((a, m) => a + CPR.COTAS.filter(c => numero(m[c.k]) != null).length, 0);

  async function manda(como) {
    if (ocupado) return; ocupado = como; pinta();
    try {
      const N = await import('./nucleo.js'); await N.cargar(); const CAT = await import('./catalogo.js'), A = await import('./consejos3d.js'), D = CAT.DISENOS.pruebaPrecision, [, , cama, impK] = impDe(); let blob;
      try { blob = N.tresMF([{ m: N.aLaCama(CPR.placa3(cama)), color: D.color, nombre: 'Placa de calibracion (3 probetas)' }], 'Placa_calibracion_3_probetas', Object.assign(A.claves({ acabado: 'equilibrado', uso: 'encaje', soporte: 'no', balsa: 'no' }), D.bambu)); } finally { N.limpia(); }
      window.__cpuPlaca = { bytes: blob.size, cama, imp: impK };
      const d = await import('../desktop.js').catch(() => null), pc = !!(d && d.desktop && d.desktop.on);
      if (como === 'laminado' && pc) {
        const res = await d.desktop.bambuAbrir(blob, 'Placa_calibracion_3_probetas', true, { laminar: '1', imp: impK, mat: E.mat, proc: '0.16mm CelebriR8 PRECISION @' + (impK === 'a1m' ? 'A1mini' : 'P1P') });
        E.enviada = Date.now(); E.lam = res && res.laminado ? { seg: res.segundos || 0, g: res.gramos || 0 } : null; guarda();
        toast(res && res.laminado ? '🖨️ La placa se ha abierto en Bambu Studio, ya laminada: pulsa «Imprimir placa».' : '🖨️ La placa se ha abierto en Bambu Studio' + (res && res.motivoLaminado ? ' sin laminar (' + res.motivoLaminado + ')' : '') + ': pulsa Laminar placa e Imprimir.', 'ok', 12000);
      } else {
        const u = URL.createObjectURL(blob), a = h('a', { href: u, download: 'Placa_calibracion_3_probetas.3mf' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000);
        E.enviada = Date.now(); E.lam = null; guarda(); toast('⬇️ Placa descargada (3MF): ábrela con Bambu Studio, lamina e imprime.', 'ok', 10000);
      }
    } catch (e) { toast(e.message || String(e), 'bad', 9000); } finally { ocupado = ''; pinta(); }
  }
  function compruebaCalibre() { const r = CPR.calibre({ cero: Number(String(E.cal.cero || 0).replace(',', '.')) || 0, c20: numero(E.cal.medido) || 0 }); CPR.guardaCalibre(r); calR = r; toast(r.ok ? '✅ Tu calibre mide bien.' : '⚠️ ' + r.avisos.join(' '), r.ok ? 'ok' : 'warn', 9000); pinta(); }
  function calcular() { try { const c = CPR.guardado().calibre; R = CPR.calcula3(E.med, (c && c.off) || 0); } catch (e) { R = null; toast(e.message || String(e), 'warn', 9000); } pinta(); if (R) setTimeout(() => { const x = raiz.querySelector('.cpu-res'); if (x) x.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60); }
  async function guardar() {
    const clave = E.imp + ' · ' + E.mat, c = CPR.guardado().calibre;
    CPR.guarda(clave, R, { impresora: E.imp, material: E.mat, calibre: c ? c.off : 0, v: 3, probetas: R.probetas, repite: R.repite });
    try { localStorage.removeItem(LS); } catch (e) { }
    const nube = await llevaALaNube();
    toast('🎯 Calibrada: «' + clave + '». Desde ahora, todo lo que mandes a Bambu desde CelebriR8 sale corregido solo' + (nube ? ' (y vale en todos tus aparatos).' : '.'), 'ok', 10000);
    alPasar({});
  }
  // una casilla de medida; Intro pasa a la de debajo (y de la última de una probeta, a la primera de la siguiente)
  const casilla = (c, i) => h('input.inp.cpu-m', { type: 'number', step: 0.01, min: 0, inputmode: 'decimal', 'data-cota': c.k, 'data-prob': String(i + 1), 'aria-label': c.nombre + ', probeta ' + (i + 1), placeholder: n2(c.d), value: E.med[i][c.k] ?? '',
    oninput: e => { E.med[i][c.k] = e.target.value; guarda(); R = null; marca(c.k); cuenta(); },
    onkeydown: e => { if (e.key !== 'Enter') return; e.preventDefault(); const L = [...raiz.querySelectorAll('.cpu-m[data-prob="' + (i + 1) + '"]')], j = L.indexOf(e.target), sig = L[j + 1] || raiz.querySelector('.cpu-m[data-prob="' + (i + 2) + '"]') || raiz.querySelector('.cpu-calcula'); if (sig) { sig.focus(); if (sig.select) sig.select(); } } });
  // la fila se marca si sus tres medidas no cuadran (más de 0,10 mm entre la mayor y la menor)
  function marca(k) { const f = raiz.querySelector('.cpu-fila[data-fila="' + k + '"]'); if (!f) return; const V = E.med.map(m => numero(m[k])).filter(v => v != null); f.classList.toggle('duda', V.length > 1 && Math.max(...V) - Math.min(...V) > 0.1); }
  function cuenta() { const x = raiz.querySelector('.cpu-cuenta'), n = llenas(); if (x) x.textContent = escritas() + ' de 30 medidas · ' + n + ' de 3 probetas completas'; const b = raiz.querySelector('.cpu-calcula'); if (b) b.disabled = !n; const p = raiz.querySelector('.cpu-paso[data-paso="4"]'); if (p) { p.classList.toggle('hecho', n === 3); const q = p.querySelector('.cpu-n'); if (q) q.textContent = n === 3 ? '✓' : '4'; } const r = raiz.querySelector('.cpu-res'); if (r) r.remove(); }

  function contenido() {
    const [, , cama] = impDe(), g = CPR.guardado(), env = !!E.enviada, espera = imprimiendo(), cal = calR || g.calibre, guardadas = Object.keys(g.perfiles);
    const paso = (n, hecho, titulo, cosas) => h('section.cpu-paso' + (hecho ? '.hecho' : ''), { 'data-paso': String(n) }, h('h2', h('span.cpu-n', hecho ? '✓' : String(n)), titulo), cosas);
    const chips = (L, valor, alElegir) => h('div.cpu-chips', L.map(([k, t]) => h('button.cpu-chip' + (valor === k ? '.on' : ''), { type: 'button', 'data-v': k, onclick: () => { alElegir(k); guarda(); R = null; pinta(); } }, t)));
    return [
      h('header.cpu-cab', h('span.cpu-ico', '🎯'), h('div', h('h1', o.dentro ? 'Calibrar con la placa de 3 probetas' : 'Antes de empezar: vamos a dejar tu impresora calibrada'),
        h('p', 'Se hace UNA vez por impresora y material. Imprimes una placa con 3 probetas, las mides con el calibre y escribes lo que marcan. Desde ese momento, todo lo que salga de CelebriR8 hacia tu Bambu va corregido solo, a medida.')),
        o.volver ? btn(o.dentro ? '✕ Cerrar' : '← Volver al negocio', o.volver, { cls: 'ghost cpu-volver' }) : null),
      !o.dentro && guardadas.length ? h('div.cpu-aviso', h('b', 'Tienes ' + guardadas.length + ' calibraci' + (guardadas.length > 1 ? 'ones guardadas' : 'ón guardada') + ', pero ninguna en uso. '), guardadas.map(k => btn('Usar «' + k + '»', async () => { CPR.ponActiva(k); await llevaALaNube(); alPasar({}); }, { cls: 'sm cpu-usar' }))) : null,
      paso(1, true, '¿Qué impresora y con qué material?', [chips(IMPRESORAS.map(i => [i[0], i[1]]), E.imp, k => { E.imp = k; }), chips(MATERIALES.map(m => [m, m]), E.mat, k => { E.mat = k; }),
        h('p.cpu-nota', 'Con el filamento que más uses. Si luego imprimes con otro material, se calibra aparte (cada plástico encoge distinto).')]),
      paso(2, env, 'Imprime la placa de calibración', [
        h('p', 'Son ', h('b', '3 probetas numeradas (1, 2 y 3)'), ' en una sola placa de ' + cama + ' mm: una delante a la izquierda, otra en el centro (girada) y otra detrás a la derecha. Sin soportes. Más o menos ', h('b', '1 h 40 min y 37 g'), '.'),
        h('div.cpu-btns', pc ? btn(ocupado === 'laminado' ? '⏳ Tu Bambu Studio la está laminando…' : '🖨️ Abrir en Bambu YA LAMINADA (solo Imprimir)', () => manda('laminado'), { cls: 'primary cpu-laminada', disabled: !!ocupado }) : null,
          btn(ocupado === '3mf' ? '⏳ Preparando…' : '⬇️ Descargar el 3MF', () => manda('3mf'), { cls: (pc ? '' : 'primary ') + 'cpu-baja', disabled: !!ocupado })),
        env ? h('p.cpu-ok', '✅ Mandada el ' + hora(E.enviada) + (E.lam && E.lam.seg ? ' · ' + tiempo(E.lam.seg) + ' y ' + n2(E.lam.g) + ' g según tu Bambu Studio' : '') + '. Si ha salido mal, mándala otra vez.') : h('p.cpu-nota', 'En Bambu Studio: «Imprimir placa». No cambies la escala ni le pongas compensaciones: tiene que salir tal cual imprime tu máquina.')]),
      paso(3, !!(cal && cal.ok), 'Mientras se imprime: comprueba tu calibre', [
        h('p', 'Cierra las patas: tiene que marcar 0,00. Luego mide el DIÁMETRO de una moneda de 20 céntimos por el canto, sin apretar: mide 22,25 mm.'),
        h('div.cpu-cal', h('label', h('span', 'Cerrado marca'), h('input.inp', { type: 'number', step: 0.01, inputmode: 'decimal', 'data-k': 'cero', value: E.cal.cero ?? 0, oninput: e => { E.cal.cero = e.target.value; guarda(); } })),
          h('label', h('span', 'La moneda de 20 céntimos marca'), h('input.inp', { type: 'number', step: 0.01, min: 0, inputmode: 'decimal', 'data-k': 'c20', placeholder: '22,25', value: E.cal.medido ?? '', oninput: e => { E.cal.medido = e.target.value; guarda(); } })),
          btn('Comprobar', compruebaCalibre, { cls: 'sm cpu-comprueba' })),
        cal ? h('p' + (cal.ok ? '.cpu-ok' : '.cpu-ojo'), cal.ok ? '✅ Tu calibre mide bien.' : '⚠️ Tu calibre se desvía ' + n2(cal.off || 0) + ' mm: se descuenta solo de lo que midas en las probetas.') : h('p.cpu-nota', 'Si no tienes esa moneda, sáltate este paso: el programa usa lo que marque tu calibre tal cual.')]),
      paso(4, llenas() === 3, 'Mide las tres probetas y escribe lo que marca tu calibre', [
        h('p', 'Despégalas cuando la cama esté fría. Cada probeta lleva su número grabado. En milímetros, con dos decimales (12,03). ', h('b', 'Intro'), ' pasa a la casilla de debajo.'),
        h('div.cpu-med', h('div.cpu-dib', dibujo()),
          h('div.cpu-tabla', { role: 'table' }, h('div.cpu-fila.cpu-cabt', h('span', 'Qué se mide'), h('b', 'Probeta 1'), h('b', 'Probeta 2'), h('b', 'Probeta 3')),
            CPR.COTAS.map(c => { const V = E.med.map(m => numero(m[c.k])).filter(v => v != null); return h('div.cpu-fila' + (V.length > 1 && Math.max(...V) - Math.min(...V) > 0.1 ? '.duda' : ''), { 'data-fila': c.k, title: c.donde },
              h('span.cpu-que', h('b', c.k), h('span', c.nombre, h('small', ' ' + n2(c.d) + ' mm · ' + c.donde))), casilla(c, 0), casilla(c, 1), casilla(c, 2)); }))),
        h('p.cpu-nota', h('span.cpu-cuenta', escritas() + ' de 30 medidas · ' + llenas() + ' de 3 probetas completas'), ' · En naranja, las medidas que no cuadran entre sí (más de 0,10 mm): mídelas otra vez. Si una probeta ha salido mal, déjala entera en blanco.')]),
      paso(5, false, 'Que el programa haga las cuentas', [
        h('div.cpu-btns', btn('🧮 Calcular', calcular, { cls: 'primary cpu-calcula', disabled: !llenas() })),
        R ? h('div.cpu-res', { 'data-probetas': R.probetas.join(',') }, h('b', 'Tu ' + E.imp + ' con ' + E.mat + ' (con ' + R.probetas.length + (R.probetas.length === 1 ? ' probeta' : ' probetas') + '):'), h('p', CPR.texto({ s: R.s, sz: R.sz, escala: R.escala, claves: R.claves })),
          h('ul', h('li', R.escala[0] !== 1 ? 'Encoge ' + n2((1 - R.s) * 100) + ' % a lo largo y a lo ancho: la pieza saldrá un poco más grande para compensarlo (×' + R.escala[0].toLocaleString('es-ES') + ').' : 'A lo largo y a lo ancho no encoge (o menos de lo que nota un calibre).'),
            h('li', 'Por fuera, las piezas salen ' + n2(Math.abs(R.c)) + ' mm por lado más ' + (R.c >= 0 ? 'gordas' : 'finas') + '; los agujeros, ' + n2(Math.abs(R.h)) + ' mm por lado más ' + (R.h >= 0 ? 'pequeños' : 'grandes') + '; el pie de elefante, ' + n2(R.f) + ' mm. Todo eso se corrige solo.'),
            R.repite != null ? h('li', 'Tu impresora repite a ' + n2(R.repite) + ' mm entre una probeta y otra' + (R.repite <= 0.05 ? ': muy bien.' : R.repite <= 0.1 ? ': bien.' : ': es mucho; mira que la cama esté limpia y nivelada.')) : h('li', 'Con una sola probeta no se sabe cuánto repite tu impresora: mide las otras dos cuando puedas.')),
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
