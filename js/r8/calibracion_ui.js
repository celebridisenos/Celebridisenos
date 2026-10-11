// ================= v20.4 · 🎯 CALIBRAR TU CALIBRE Y TU IMPRESORA · la ventana =================
// 1) el calibre (cero + monedas) · 2) la probeta (a Bambu Studio) · 3) tus medidas (con el dibujo de dónde se mide cada letra) ·
// 4) el resultado: se guarda por impresora + material y, desde ese momento, cada 3MF para imprimir sale corregido solo.
import { h, mount, btn, toast, modal } from '../ui.js';
import * as N from './nucleo.js';
import * as CPR from './calibracion.js';

const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
const IMPRESORAS = [['P1P', 'Bambu P1P'], ['A1 mini', 'Bambu A1 mini'], ['otra', 'Otra']], MATERIALES = ['PETG', 'PLA', 'TPU', 'ABS', 'ASA', 'Otro'];
// el dibujo de la probeta, vista de ARRIBA y de LADO, con sus letras (sale de las mismas medidas que la probeta)
function dibujo() {
  const G = CPR.GEO, E = 5, X = x => (x + 38) * E, Y = y => (22 - y) * E, W = 76 * E, H = 44 * E, ns = 'http://www.w3.org/2000/svg';
  const el = (t, a, txt) => { const e = document.createElementNS(ns, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (txt) e.textContent = txt; return e; };
  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + (H + 110), class: 'cpr-dib', role: 'img', 'aria-label': 'Dónde se mide cada letra' });
  const [bx0, bx1, by0, by1] = G.base, [kx0, kx1, ky0, ky1] = G.bloque;
  svg.append(el('rect', { x: X(bx0), y: Y(by1), width: (bx1 - bx0) * E, height: (by1 - by0) * E, class: 'cpr-base' }), el('rect', { x: X(kx0), y: Y(ky1), width: (kx1 - kx0) * E, height: (ky1 - ky0) * E, class: 'cpr-bloque' }));
  const [rx0, rx1, ry0, ry1] = G.ranura; svg.append(el('rect', { x: X(rx0), y: Y(ry1), width: (rx1 - rx0) * E, height: (ry1 - ry0) * E, class: 'cpr-hueco' }), el('text', { x: X((rx0 + rx1) / 2), y: Y(ry0) + 22, class: 'cpr-l' }, 'K'));
  G.agujeros.forEach(([k, x, y, d]) => svg.append(el('circle', { cx: X(x), cy: Y(y), r: d / 2 * E, class: 'cpr-hueco' }), el('text', { x: X(x), y: Y(y) + 6, class: 'cpr-l' }, k)));
  G.salientes.forEach(([k, x, y, d]) => svg.append(el('circle', { cx: X(x), cy: Y(y), r: d / 2 * E, class: 'cpr-saliente' }), el('text', { x: X(x) + d / 2 * E + 14, y: Y(y) + 6, class: 'cpr-l' }, k)));
  const cota = (x1, y1, x2, y2, t, dx = 0, dy = 0) => { svg.append(el('line', { x1: x1 + dx, y1: y1 + dy, x2: x2 + dx, y2: y2 + dy, class: 'cpr-cota', 'marker-start': 'url(#f)', 'marker-end': 'url(#f)' }), el('text', { x: (x1 + x2) / 2 + dx + (x1 === x2 ? 14 : 0), y: (y1 + y2) / 2 + dy + (y1 === y2 ? -6 : 5), class: 'cpr-l cpr-lc' }, t)); };
  const defs = el('defs', {}), mk = el('marker', { id: 'f', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }); mk.append(el('path', { d: 'M0 0 L10 5 L0 10 z', class: 'cpr-flecha' })); defs.append(mk); svg.prepend(defs);
  cota(X(kx0), Y(ky1), X(kx1), Y(ky1), 'A', 0, -12); cota(X(kx1), Y(ky1), X(kx1), Y(ky0), 'B', 14, 0);
  // de lado: el alto C y la base D (abajo del todo)
  const yb = H + 80, zE = 4; svg.append(el('rect', { x: X(bx0), y: yb - 3 * zE, width: (bx1 - bx0) * E, height: 3 * zE, class: 'cpr-base' }), el('rect', { x: X(kx0), y: yb - 12 * zE, width: (kx1 - kx0) * E, height: 12 * zE, class: 'cpr-bloque' }), el('text', { x: X(bx1) - 4, y: yb - 54, class: 'cpr-sub', 'text-anchor': 'end' }, 'de lado'));
  cota(X(kx0), yb, X(kx0), yb - 12 * zE, 'C', -16, 0); cota(X(bx0), yb, X(bx1), yb, 'D', 0, 14);
  svg.append(el('text', { x: 6, y: 16, class: 'cpr-sub' }, 'desde arriba'));
  return svg;
}
export function abrir(o = {}) {
  const g0 = CPR.guardado(), estado = { cal: { cero: 0 }, imp: 'P1P', mat: 'PETG', med: {}, R: null, calibre: g0.calibre };
  let cerrar = () => { };
  const cuerpo = h('div.cpr'), pinta = () => mount(cuerpo, contenido());
  const num = (o, k, t, ph, extra) => h('label.cpr-c', h('span', t), h('input.inp', { type: 'number', step: 0.01, min: k === 'cero' ? -5 : 0, value: o[k] ?? '', placeholder: ph || '', 'data-k': k, oninput: e => { o[k] = e.target.value === '' ? '' : Number(String(e.target.value).replace(',', '.')); } }), extra || null);
  function contenido() {
    const C = estado.calibre, act = CPR.activa(), g = CPR.guardado();
    return [
      h('p.small', 'Una vez: compruebas el calibre, imprimes la probeta y la mides. Desde ese momento, cada pieza que mandes a Bambu con esa impresora y ese material sale corregida SOLA (tus perfiles no se tocan).'),
      act ? h('p.cpr-ok', '🎯 Ahora se usa: «' + act.clave + '» (' + act.fecha + ') · ' + CPR.texto(act)) : h('p.small.muted', 'Todavía no hay ninguna calibración en uso.'),
      // 1 · el calibre
      h('details.cpr-sec', { open: !C }, h('summary', h('b', '1 · Tu calibre'), C ? h('small', C.ok ? ' ✅ comprobado (' + C.fecha + ')' : ' ⚠️ se desvía ' + n2(C.off) + ' mm (' + C.fecha + ')') : h('small', ' sin comprobar')),
        h('p.small', 'Cierra las patas: tiene que marcar 0,00. Luego mide el DIÁMETRO de una o varias monedas (por el canto, sin apretar). Son patrones con medida oficial.'),
        h('div.cpr-fila', num(estado.cal, 'cero', 'Cerrado marca', '0,00'), Object.entries(CPR.MONEDAS).map(([k, [t, mm]]) => num(estado.cal, k, 'Moneda de ' + t, n2(mm), h('small.muted', 'oficial ' + n2(mm))))),
        btn('Comprobar el calibre', () => { const r = CPR.calibre(estado.cal); CPR.guardaCalibre(r); estado.calibre = CPR.guardado().calibre; toast(r.ok ? '✅ Tu calibre mide bien' + (r.monedas.length ? ' (con ' + r.monedas.length + ' moneda' + (r.monedas.length > 1 ? 's' : '') + ')' : '') : '⚠️ ' + r.avisos.join(' '), r.ok ? 'ok' : 'warn', 9000); pinta(); }, { cls: 'sm primary cpr-compcal' })),
      // 2 · la probeta
      h('details.cpr-sec', { open: !!C && !act }, h('summary', h('b', '2 · Imprime la probeta')),
        h('p.small', 'Con TU perfil y TU filamento de siempre (la impresora y el material de abajo). La probeta va sin compensaciones para medir tu impresora tal cual. Laminada con tu perfil PRECISION en PETG: 33 min en la P1P, 36 min en la A1 mini, unos 12 g, sin soportes.'),
        h('div.cpr-fila', h('label.cpr-c', h('span', 'Impresora'), h('select.inp', { 'data-k': 'imp', onchange: e => { estado.imp = e.target.value; } }, IMPRESORAS.map(([k, t]) => h('option', { value: k, selected: estado.imp === k }, t)))), h('label.cpr-c', h('span', 'Material'), h('select.inp', { 'data-k': 'mat', onchange: e => { estado.mat = e.target.value; } }, MATERIALES.map(t => h('option', { value: t, selected: estado.mat === t }, t))))),
        h('div.row.wrap', btn('🖨️ Mandar a Bambu Studio', () => manda(true), { cls: 'sm primary cpr-manda' }), btn('⬇️ Descargar el 3MF', () => manda(false), { cls: 'sm ghost cpr-baja' }))),
      // 3 · las medidas
      h('details.cpr-sec', { open: !!C }, h('summary', h('b', '3 · Mídela y escribe lo que marca tu calibre')),
        h('div.cpr-med', h('div.cpr-dibw', dibujo()), h('div.cpr-lista', CPR.COTAS.map(c => h('label.cpr-m', h('b', c.k), h('span', h('span', c.nombre + ' '), h('small.muted', '(diseño ' + n2(c.d) + ' mm) · ' + c.donde)), h('input.inp', { type: 'number', step: 0.01, min: 0, 'data-cota': c.k, value: estado.med[c.k] ?? '', oninput: e => { estado.med[c.k] = e.target.value; } }))))),
        btn('🧮 Calcular', calcular, { cls: 'primary cpr-calcula' }),
        estado.R ? resultado() : null),
      // las guardadas
      Object.keys(g.perfiles).length ? h('details.cpr-sec', h('summary', h('b', 'Mis calibraciones (' + Object.keys(g.perfiles).length + ')')),
        h('label.check.small', h('input', { type: 'radio', name: 'cpr-act', checked: !g.activa, onchange: () => { CPR.ponActiva(null); pinta(); } }), 'Ninguna (no corregir)'),
        Object.entries(g.perfiles).map(([k, P]) => h('label.check.small', h('input', { type: 'radio', name: 'cpr-act', 'data-clave': k, checked: g.activa === k, onchange: () => { CPR.ponActiva(k); pinta(); toast('🎯 Desde ahora se usa «' + k + '»', 'ok'); } }), h('span', h('b', k), ' (' + P.fecha + ') · ' + CPR.texto(P))))) : null
    ];
  }
  function resultado() {
    const R = estado.R, clave = estado.imp + ' · ' + estado.mat;
    return h('div.cpr-res', h('b', 'Tu ' + estado.imp + ' con ' + estado.mat + ':'), h('p', CPR.texto({ s: R.s, sz: R.sz, escala: R.escala, claves: R.claves })),
      h('ul.small', h('li', R.escala[0] !== 1 ? 'Encoge ' + n2((1 - R.s) * 100) + ' % en XY → la pieza sale escalada ×' + R.escala[0].toLocaleString('es-ES') + ' en XY (la altura no se toca).' : 'En XY no encoge (o menos del 0,1 %, que un calibre no nota): no se escala.'),
        h('li', 'Los contornos salen ' + n2(Math.abs(R.c)) + ' mm por lado más ' + (R.c >= 0 ? 'gordos' : 'finos') + ' → «compensación de contorno» ' + R.claves.xy_contour_compensation + '.'),
        h('li', 'Los agujeros salen ' + n2(Math.abs(R.h)) + ' mm por lado más ' + (R.h >= 0 ? 'pequeños' : 'grandes') + ' → «compensación de agujeros» ' + R.claves.xy_hole_compensation + '.'),
        h('li', 'Pie de elefante: ' + n2(R.f) + ' mm → «compensación del pie de elefante» ' + R.claves.elefant_foot_compensation + '.')),
      R.avisos.length ? h('p.r8e-mal.small', '⚠️ ' + R.avisos.join(' ')) : h('p.small.cpr-ok', '✅ Las medidas cuadran entre sí (ninguna se aparta más de 0,08 mm del resto).'),
      btn('✅ Guardar y usar para «' + clave + '»', () => { CPR.guarda(clave, R, { impresora: estado.imp, material: estado.mat, calibre: estado.calibre ? estado.calibre.off : 0 }); toast('🎯 Guardado. Desde ahora, todo lo que mandes a Bambu (3MF) sale corregido para «' + clave + '». Para comprobarlo: imprime otra vez la probeta y mídela.', 'ok', 10000); estado.R = null; pinta(); }, { cls: 'primary cpr-guarda' }));
  }
  function calcular() { try { estado.R = CPR.calcula(estado.med, (estado.calibre && estado.calibre.off) || 0); } catch (e) { toast(e.message || String(e), 'warn', 7000); estado.R = null; } pinta(); }
  async function manda(abrirBambu) {
    try { await N.cargar(); const CAT = await import('./catalogo.js'), A = await import('./consejos3d.js'), D = CAT.DISENOS.pruebaPrecision; let blob;
      try { blob = N.tresMF([{ m: N.aLaCama(CAT.genera('pruebaPrecision', {})), color: D.color, nombre: D.t }], 'Probeta_precision', Object.assign(A.claves({ acabado: 'equilibrado', uso: 'encaje', soporte: 'no', balsa: 'no' }), D.bambu)); } finally { N.limpia(); }
      const d = await import('../desktop.js').catch(() => null);
      if (abrirBambu && d && d.desktop && d.desktop.on) { const r = await d.desktop.bambuAbrir(blob, 'Probeta_precision'); toast(r && r.abierto ? '🖨️ Probeta abierta en Bambu Studio: elige tu impresora, tu filamento y tu perfil de siempre.' : '📦 Guardada en ' + (r && r.path), 'ok', 9000); }
      else { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: 'Probeta_precision.3mf' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); toast('⬇️ Probeta descargada (3MF): ábrela con Bambu Studio.', 'ok', 7000); }
      window.__cprProbeta = blob.size;
    } catch (e) { toast(e.message || String(e), 'bad'); }
  }
  pinta();
  return modal('🎯 Calibrar tu calibre y tu impresora', cuerpo, close => { cerrar = close; void cerrar; return [btn('Cerrar', close, { cls: 'ghost' })]; }, { onclose: () => { if (o.alCerrar) o.alCerrar(); } });
}
