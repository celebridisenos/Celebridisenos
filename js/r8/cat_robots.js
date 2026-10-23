// ================= 22-10-2026 · 🤖 ROBOTS: BICHA, CelebriBot 3 y CelebriBot 2 (ella: «no encuentro CelebriBot ni Guardián en R8» → «Sí, mételos»; BICHA sustituye al Guardián) =================
// Se diseñaron FUERA del catálogo (00_SISTEMA/DISENOS_PROPIOS, cada uno con su comprobador: nada choca en ninguna postura y cada pieza laminada con
// su Bambu Studio sin avisos). Aquí van sus piezas TAL CUAL (tools/robots_r8.py → data/r8/robots/): no se rehacen, lo que se ve es lo verificado.
// Las piezas se bajan al abrir el robot (comprimidas, 0,1–1,6 MB por grupo): mientras, «⏳ Bajando…» y al llegar se dibuja sola (evento
// «r8-robots-listo», que escucha el catálogo). En las pruebas de node se leen del disco.
import * as N from './nucleo.js';
import { AYUDAS as A } from './cat_utiles.js';
import { ROBOTS } from './robots_datos.js';
const { s } = A;
const RAIZ = new URL('../../data/r8/robots/', import.meta.url);
const NODE = typeof document === 'undefined' && typeof process !== 'undefined' && !!(process.versions && process.versions.node);
const FS = NODE ? await import('node:fs') : null, ZL = NODE ? await import('node:zlib') : null;
const GRUPOS = new Map(), PIDIENDO = new Map(), FALLO = new Map(), SOPAS = new Map();

const esGzip = u8 => u8.length > 2 && u8[0] === 0x1f && u8[1] === 0x8b;
async function bajaGrupo(clave) {
  const r = await fetch(new URL(clave + '.bin.gz', RAIZ).href); if (!r.ok) throw new Error('no está en el programa (' + r.status + ')');
  const ab = await r.arrayBuffer();
  if (!esGzip(new Uint8Array(ab, 0, Math.min(4, ab.byteLength)))) return ab;      // (si el servidor ya lo descomprimió)
  if (typeof DecompressionStream === 'undefined') throw new Error('este navegador no sabe descomprimir: actualízalo');
  return await new Response(new Blob([ab]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
function grupoYa(clave) {
  if (GRUPOS.has(clave)) return GRUPOS.get(clave);
  if (FS) { const b = ZL.gunzipSync(FS.readFileSync(new URL(clave + '.bin.gz', RAIZ))); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); GRUPOS.set(clave, ab); return ab; }
  return null;
}
export function pide(claves) {
  for (const c of claves) {
    if (GRUPOS.has(c) || PIDIENDO.has(c)) continue; FALLO.delete(c);
    PIDIENDO.set(c, bajaGrupo(c).then(ab => { GRUPOS.set(c, ab); }).catch(e => { FALLO.set(c, e.message || String(e)); console.warn('robot', c, e); })
      .finally(() => { PIDIENDO.delete(c); try { window.dispatchEvent(new CustomEvent('r8-robots-listo', { detail: c })); } catch (e) { } }));
  }
  return Promise.all(claves.map(c => PIDIENDO.get(c)).filter(Boolean));
}
// las piezas de un grupo, ya bajadas (si no, las pide y avisa: el catálogo vuelve a dibujar al llegar)
function necesita(robot, grupos) {
  const claves = grupos.map(g => robot + '/' + g), faltan = claves.filter(c => !grupoYa(c));
  if (!faltan.length) return;
  const f = faltan.find(c => FALLO.has(c) && !PIDIENDO.has(c));
  if (f) { const m = FALLO.get(f); FALLO.delete(f); N.mal('No he podido bajar las piezas del robot: ' + m + '. ¿Hay internet? Vuelve a tocar el robot.'); }
  pide(faltan); N.mal('⏳ Bajando las piezas del robot… (se dibuja sola en un momento)');
}
// un STL de su paquete → «sopa» de triángulos (lo que lee el motor)
function sopa(robot, grupo, p) {
  const k = robot + '/' + grupo + '/' + p.id; if (SOPAS.has(k)) return SOPAS.get(k);
  const ab = grupoYa(robot + '/' + grupo), [ini, , n] = p.trozo, dv = new DataView(ab, ini), out = new Float32Array(n * 9);
  for (let t = 0; t < n; t++) { const o = 84 + t * 50 + 12; for (let j = 0; j < 9; j++) out[t * 9 + j] = dv.getFloat32(o + j * 4, true); }
  SOPAS.set(k, out); return out;
}
const pieza = (robot, grupo, p) => N.deSopa(sopa(robot, grupo, p));
// varias piezas en la cama, en filas (como las pondría ella), sin tocarse
function enFilas(L, ancho = 240, hueco = 8) {
  let x = 0, y = 0, fila = 0; const out = [];
  for (const it of L) { const b = N.caja(it.m), w = b.dims[0], d = b.dims[1];
    if (x > 0 && x + w > ancho) { x = 0; y -= fila + hueco; fila = 0; }
    out.push(Object.assign({}, it, { m: it.m.translate([x - b.min[0], y - b.max[1], -b.min[2]]) })); x += w + hueco; fila = Math.max(fila, d); }
  return out;
}
// lo que se ve (con su color) según «Qué imprimo»
function partes(robot, v) {
  const R = ROBOTS[robot], q = v.que || 'montado';
  if (q === 'montado') { necesita(robot, ['montado']); return R.montado.map(p => ({ m: pieza(robot, 'montado', p), color: p.color })); }
  if (q === 'pruebas') { necesita(robot, ['pruebas']); return enFilas(R.pruebas.map(p => ({ m: N.aLaCama(pieza(robot, 'pruebas', p)), color: p.color }))); }
  if (q === 'paso1') { necesita(robot, ['pruebas', 'robot']);
    return enFilas(R.paso1.map(id => { const g = id.startsWith('P') ? 'pruebas' : 'robot', p = R[g].find(x => x.id === id); return { m: N.aLaCama(pieza(robot, g, p)), color: p.color }; })); }
  const [g, id] = q.split(':'), grupo = g === 'p' ? 'pruebas' : g === 'b' ? 'planb' : 'robot', p = (R[grupo] || []).find(x => x.id === id);
  if (!p) N.mal('No encuentro esa pieza.');
  necesita(robot, [grupo]); return [{ m: N.aLaCama(pieza(robot, grupo, p)), color: p.color }];
}
const junta = L => L.length === 1 ? L[0].m : N.MF().compose(L.map(x => x.m));
const QUE = robot => [['montado', '👀 Montado (para verlo: así no se imprime)']]
  .concat(ROBOTS[robot].paso1 ? [['paso1', '1️⃣ Paso 1: ' + ROBOTS[robot].paso1.join(' + ')]] : [])
  .concat([['pruebas', '🧪 Todas las pruebas de encaje']], ROBOTS[robot].pruebas.map(p => ['p:' + p.id, '🧪 ' + p.id + ' · ' + p.t]), ROBOTS[robot].robot.map(p => ['r:' + p.id, p.id.replace('_', '') + ' · ' + p.t]),
    (ROBOTS[robot].planb || []).map(p => ['b:' + p.id, '🅱️ Plan B · ' + p.id + ' · ' + p.t]));
// (BICHA y CelebriBot 3 traen además la hoja «lo más importante» y la guía del plan B: cabeza fija, sin motores)
const enlaces = robot => [['📘 Guía paso a paso', new URL(robot + '/guia.pdf', RAIZ).href], ['🛒 Comprar (con botones)', new URL(robot + '/comprar.html', RAIZ).href]]
  .concat(ROBOTS[robot].planb ? [['⭐ Lo más importante (1 hoja)', new URL(robot + '/importante.pdf', RAIZ).href], ['🅱️ Plan B: cabeza fija', new URL(robot + '/planb.pdf', RAIZ).href]] : []);
const nota = (robot, plastico) => v => {
  const q = v.que || 'montado';
  if (q === 'montado') return '👀 Así queda montado: lo impreso en sus colores y lo que se compra (placas, servos, pantalla…) en el suyo. Para imprimir, elige una pieza en «Qué imprimo». '
    + 'Empieza por la guía paso a paso: se compra en pasos y antes se imprimen las pruebas de encaje.';
  return '🖨️ ' + plastico + ' · sin soportes · la pieza ya va girada como se imprime (comprobada con tu Bambu Studio: 0 avisos). ' + (q.startsWith('p:') || q === 'pruebas' || q === 'paso1'
    ? '🧪 Prueba de encaje: imprímela antes del robot y comprueba que lo comprado entra (la guía dice qué mirar en cada una).'
    : q.startsWith('b:') ? '🅱️ Plan B (cabeza fija, sin motores): solo si decides no montar los servos. Su guía está en el botón «Plan B».' : '');
};

// (22-10 tarde) el Guardián ya NO está aquí: BICHA lo sustituye (ella lo eligió) y él tenía 2 fallos sin arreglar (la placa de micrófonos
// dibujada al revés y 2 tornillos de la cara que no muerden). Su carpeta sigue en DISENOS_PROPIOS con el aviso «no lo imprimas así».
export const DISENOS_ROBOTS = {
  robotBicha: { cat: 'robots', tambien: ['ciencia', 'taller'], nuevo: true, e: '🐞', t: 'BICHA · robot con pantalla táctil de 7"',
    d: 'La que sustituye al Guardián: pantalla táctil de 7" y la Raspberry Pi 5 dentro. Funciona sola: oye, habla, ve y mueve la cabeza. Con plan B (cabeza fija, sin motores). 23 piezas en PETG',
    busca: 'robot bicha guardian celebribot raspberry pi 5 pantalla tactil 7 camara caras voz asistente servo st3215 microfonos xvf3800 radar ld2410 bateria ups lastre plan b',
    uso: 'encaje', color: '#f3f2ee', mini: new URL('bicha/mini.jpg', RAIZ).href, robot: 'bicha',
    campos: [s('que', 'Qué imprimo', 'montado', QUE('bicha'))],
    gen: v => junta(partes('bicha', v)), coloresVista: v => partes('bicha', v), nota: nota('bicha', 'PETG en la P1P (aguanta el calor de dentro)'), enlaces: () => enlaces('bicha') },
  robotCelebriBot3: { cat: 'robots', tambien: ['ciencia', 'oficina'], nuevo: true, e: '🤖', t: 'CelebriBot 3 · robot de escritorio de lujo',
    d: 'Cara redonda táctil, 4 micrófonos, cámara con párpado y radar; gira el cuello y mueve la cabeza y piensa con tu PC. Con plan B (cabeza fija, sin motores). 18 piezas en PETG',
    busca: 'robot celebribot 3 escritorio pantalla redonda tactil camara parpado radar microfonos servo sc09 esp32 asistente ia voz plan b',
    uso: 'encaje', color: '#f3f2ee', mini: new URL('celebribot3/mini.jpg', RAIZ).href, robot: 'celebribot3',
    campos: [s('que', 'Qué imprimo', 'montado', QUE('celebribot3'))],
    gen: v => junta(partes('celebribot3', v)), coloresVista: v => partes('celebribot3', v), nota: nota('celebribot3', 'PETG en la P1P'), enlaces: () => enlaces('celebribot3') },
  robotCelebriBot2: { cat: 'robots', tambien: ['ciencia', 'oficina'], nuevo: true, e: '🤖', t: 'CelebriBot 2 · asistente de escritorio',
    d: 'Cabeza con pantalla y cámara que gira y se inclina, micrófono y altavoz; piensa con tu PC por la wifi de casa (XIAO ESP32-S3 Sense, 2 servos MG90S). 20 piezas en PLA',
    busca: 'robot celebribot 2 asistente escritorio xiao esp32s3 sense camara pantalla servo mg90s pca9685 altavoz ia voz',
    uso: 'encaje', color: '#efeeea', mini: new URL('celebribot2/mini.jpg', RAIZ).href, robot: 'celebribot2',
    campos: [s('que', 'Qué imprimo', 'montado', QUE('celebribot2'))],
    gen: v => junta(partes('celebribot2', v)), coloresVista: v => partes('celebribot2', v), nota: nota('celebribot2', 'PLA en la A1 mini (las piezas de dos colores, mejor con el proyecto «con la pausa» de su carpeta)'), enlaces: () => enlaces('celebribot2') }
};
