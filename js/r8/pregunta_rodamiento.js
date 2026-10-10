// ================= v20.3 · 🧪 «¿CUÁL DE TUS RODAMIENTOS DE PRUEBA GIRA?» =================
// La dueña (10-10-2026): «cuando inicie que me lo pregunte y pongo el número». Y también: «le dije que diseñara rodamientos» — la
// 20.2 preguntaba por un aro para rodamientos de METAL que ella no tenía. AHORA la pregunta es por la 🧪 prueba de RODAMIENTOS
// IMPRESOS (3 rodamientos pequeños con su número en relieve y una llave): «¿cuál es el número más bajo que gira suave?».
// El número se guarda en este aparato y lo usan SOLOS los rodamientos impresos («⭐ La de tu prueba»). «Ninguno gira» = la siguiente
// prueba sale con tres holguras mayores. «Todavía no la he impreso» = se vuelve a preguntar al abrir. Desde aquí mismo se manda la
// prueba a Bambu Studio. También se abre cuando quieras: Ctrl K → «rodamientos».
import { h, btn, toast, modal } from '../ui.js';
import * as RI from './rodamiento_impreso.js';

const SIN_PREGUNTAR = 'cd.r8.prr.no'; // (solo esta vez que está abierto el programa)
async function mandarPrueba(boton) {
  try {
    if (boton) { boton.disabled = true; boton.textContent = '⏳ Preparando la prueba…'; }
    const N = await import('./nucleo.js'); await N.cargar();
    const CAT = await import('./catalogo.js'), A = await import('./consejos3d.js'), D = CAT.DISENOS.pruebaRodImpreso;
    let blob; try { blob = N.tresMF([{ m: CAT.genera('pruebaRodImpreso', {}), color: D.color, nombre: D.t }], 'Prueba_rodamientos_impresos', Object.assign(A.claves({ acabado: 'equilibrado', uso: 'mecanica', soporte: 'no', balsa: 'no' }), D.bambu)); } finally { N.limpia(); }
    const d = await import('../desktop.js').catch(() => null);
    if (d && d.desktop && d.desktop.on) { const res = await d.desktop.bambuAbrir(blob, 'Prueba_rodamientos_impresos'); toast(res && res.abierto ? '🖨️ Abriendo la prueba en Bambu Studio… (guardada en Documentos\\CelebriDiseños_R8). Elige tu impresora y tu filamento y dale a imprimir: unos 40–50 minutos.' : '📦 Guardada en ' + (res && res.path), 'ok', 12000); window.__pruebaRod = { abierto: res }; }
    else { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: 'Prueba_rodamientos_impresos.3mf' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); toast('📦 Prueba descargada (3MF con sus ajustes). Ábrela con Bambu Studio.', 'ok', 8000); window.__pruebaRod = { bajado: blob.size }; }
  } catch (e) { toast('No he podido preparar la prueba: ' + (e.message || e), 'error', 9000); }
  finally { if (boton) { boton.disabled = false; boton.textContent = '🖨️ Mandar la prueba a Bambu Studio'; } }
}
// v20.4 · su prueba de la 20.3: «el nº 1 gira bien, pero las bolas se salen». La prueba nueva tiene 4 rodamientos y se contestan DOS
// cosas de cada uno (¿gira suave? · ¿se sale algún rodillo?); las dos son obligatorias. Gana el más justo que cumple las dos.
export function preguntar(o = {}) {
  const T = RI.tanda(), antes = RI.guardado(), res = {};
  let cerrar = () => { };
  const bGuardar = h('button.btn.prr-guardar', { type: 'button', disabled: true, onclick: () => guardar() }, '✅ Guardar lo que he visto');
  const listo = () => { bGuardar.disabled = !T.every(v => res[v.num] && typeof res[v.num].gira === 'boolean' && typeof res[v.num].sale === 'boolean'); };
  const par = (num, k, si, no) => { const fila = h('div.prr-par', { 'data-num': num, 'data-k': k },
    h('button.prr-op', { type: 'button', 'data-v': 'si', onclick: e => marca(e, true) }, si), h('button.prr-op', { type: 'button', 'data-v': 'no', onclick: e => marca(e, false) }, no));
    function marca(e, v) { res[num] = Object.assign(res[num] || {}, { [k]: v }); fila.querySelectorAll('.prr-op').forEach(b => b.classList.toggle('on', b === e.currentTarget)); listo(); }
    return fila; };
  const tarjeta = v => h('div.prr-rod', { 'data-num': v.num },
    h('div.prr-rod-c', h('b', String(v.num)), h('small', RI.n2(v.c) + ' mm · ' + (v.ret === 'media' ? 'retención media (rayita)' : 'retención alta'))),
    h('span.tiny.muted', '¿Gira suave con la llave?'), par(v.num, 'gira', '🔄 Sí, gira', '✋ No / muy duro'),
    h('span.tiny.muted', '¿Se sale algún rodillo?'), par(v.num, 'sale', '😟 Sí, se sale', '👍 No, ninguno'));
  function guardar() {
    const r = RI.decide(res); cerrar();
    const txt = r.estado === 'ok' ? '✅ Apuntado: el nº ' + r.num + ' (' + RI.n2(r.c) + ' mm, retención ' + r.ret + '). Desde ahora tus rodamientos impresos salen así.'
      : r.estado === 'masHolgura' ? '📝 Apuntado: no gira ninguno. La próxima prueba sale más holgada (' + RI.tanda().map(v => RI.n2(v.c)).join(' / ') + ' mm): mándala a imprimir otra vez.'
      : r.estado === 'bolas' ? '⚠️ Apuntado: giran pero se salen rodillos en todos. Uso el nº ' + r.num + ' con retención alta y lo dejo marcado para revisarlo: dime en el chat cómo se salen (por arriba, por abajo, al apretar).'
      : '⚠️ No gira ninguno ni con la holgura más grande: algo de la impresora o del perfil aprieta de más (pie de elefante, flujo). Dímelo en el chat.';
    toast(txt, r.estado === 'ok' || r.estado === 'masHolgura' ? 'ok' : 'error', 12000);
    window.__pruebaRodN = r; if (o.alGuardar) o.alGuardar(r);
  }
  const bMandar = h('button.btn.prr-mandar', { type: 'button', onclick: e => mandarPrueba(e.currentTarget) }, '🖨️ Mandar la prueba a Bambu Studio');
  const cuerpo = h('div.col.prr',
    h('p', 'La ', h('b', 'prueba de rodamientos impresos'), ' son 4 rodamientos pequeños en una tira, cada uno con su ', h('b', 'número en relieve'), ', y una ', h('b', 'llave'), ' con un cuadradito.'),
    h('ol.prr-pasos',
      h('li', 'Despega la tira. Mete la ', h('b', 'llave'), ' en el centro de un rodamiento y gírala. Los primeros giros pueden ir duros: fuerza un poco (un «crac» es normal).'),
      h('li', 'Ponlo ', h('b', 'boca abajo'), ', sacúdelo y empuja los rodillos con la uña: ¿se sale alguno?'),
      h('li', 'Contesta las dos cosas de cada uno. Gana el más justo que gire y no suelte nada.')),
    h('div.prr-fila', bMandar, h('span.tiny.muted', 'Si aún no la has impreso. Laminada con tu Bambu Studio (PETG, perfil «0.16mm CelebriR8 PRECISION»): 1 h 15 min y 15 g en la P1P o en la A1 mini.')),
    h('div.prr-rods', T.map(tarjeta)), bGuardar,
    antes.c ? h('p.tiny.muted', 'Ahora tienes apuntado ' + RI.n2(antes.c) + ' mm' + (antes.deV203 ? ' (de la prueba antigua, la de los rodillos que se salían)' : ', retención ' + (antes.ret || 'alta')) + (antes.fecha ? ' (' + antes.fecha + ')' : '') + '.') : null);
  return modal('🧪 ¿Qué tal tus rodamientos de prueba?', cuerpo, close => { cerrar = close; return [btn('Todavía no la he impreso', () => { try { sessionStorage.setItem(SIN_PREGUNTAR, '1'); } catch (e) { } close(); }, { cls: 'ghost prr-luego' })]; });
}
// al arrancar el programa: solo si aún no ha contestado la prueba NUEVA (nunca en las pruebas automáticas, salvo que la prueba lo pida)
export function alArrancar() {
  try {
    const forzar = localStorage.getItem('cd.r8.preguntaPlantilla') === 'forzar';
    if (navigator.webdriver && !forzar) return false;
    const g = RI.guardado();
    if ((g.c && !g.deV203) || sessionStorage.getItem(SIN_PREGUNTAR)) return false;
    if (document.querySelector('.modal, .lockbox-full, .r8vis, .est20, .drawer')) { setTimeout(alArrancar, 8000); return false; } // si hay otra ventana, luego
    preguntar(); return true;
  } catch (e) { return false; }
}

// ---------- (v20.2.2) lo de antes: el aro que sujeta un rodamiento de METAL comprado. Ya no se pregunta al arrancar: Ctrl K → «metal» ----------
export async function preguntarMetal(o = {}) {
  const RO = await import('./rodamientos.js');
  let ult = null; try { ult = JSON.parse(localStorage.getItem('cd.r8.plantillaUltima') || 'null'); } catch (e) { }
  let rod = ult && RO.RODAMIENTOS[ult.rod] ? ult.rod : '608 · 8×22×7';
  const modo = (ult && ult.modo) || 'costillas', antes = RO.ajustesGuardados().ultimo;
  const sel = h('select.inp.prr-rod', { 'aria-label': 'Tu rodamiento', onchange: e => { rod = e.target.value; } }, Object.keys(RO.RODAMIENTOS).map(k => h('option', { value: k, selected: k === rod }, k.replace('·', '—'))));
  let cerrar = () => { };
  const elige = n => { const [d, D, B] = RO.RODAMIENTOS[rod], x = RO.guardaAjuste(d, D, B, n, modo); cerrar(); toast('✅ Apuntado: el aro ' + x.n + ' para tu ' + rod.split(' ·')[0] + ' de metal.', 'ok', 8000); window.__plantillaRod = { rod, n: x.n, modo }; if (o.alGuardar) o.alGuardar(x.n); };
  const cuerpo = h('div.col.prr',
    h('p', 'Solo si tienes un rodamiento de ', h('b', 'metal'), ' (comprado) e imprimiste su plantilla (la tira con 5 aros con rayitas):'),
    h('ol.prr-pasos', h('li', 'Mete el rodamiento en el aro de 1 rayita, apretando con el dedo.'), h('li', 'Si se cae o se mueve, pasa al aro siguiente.'), h('li', 'El primer aro donde se queda quieto es el tuyo.')),
    h('label.prr-c', h('span', 'Tu rodamiento de metal'), sel),
    h('div.prr-nums', [1, 2, 3, 4, 5].map(n => h('button.prr-n', { type: 'button', 'data-aro': n, onclick: () => elige(n) }, h('b', String(n)), h('small', '|'.repeat(n))))),
    antes ? h('p.tiny.muted', 'Ahora tienes apuntado el ' + antes.n + ' (' + antes.fecha + ').') : null);
  return modal('🔩 Rodamiento de metal: ¿qué aro lo sujetó?', cuerpo, close => { cerrar = close; return [btn('Cerrar', close, { cls: 'ghost' })]; });
}
