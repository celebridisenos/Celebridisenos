// ================= 14-10-2026 · 📄 MANUAL DE CADA CAJA (para venderla: que el cliente lo entienda paso a paso) =================
// Ella: «cada cual con su manual de instalación breve, para vender, que se entienda paso por paso».
// Sale de la caja que hay en el Taller (sus piezas, sus medidas y sus cerraduras): no se inventa nada. Primero cómo se monta (si va
// por piezas), luego cómo se usa (abrir y cerrar), consejos y cuidados. La hoja es la misma del catálogo (r8/manual.js · hojaManual).
import * as CJ from './cajas.js';
import * as CP from './cajas_pro.js';

const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
// el nombre «de catálogo» de cada pieza suelta (las llaves y las ruedas se cuentan juntas)
const grupo = nombre => /^Llave/.test(nombre) ? 'Llave' : /^Rueda/.test(nombre) ? 'Rueda con números' : /^Cubeta/.test(nombre) ? 'Cubeta' : nombre.replace(/\s*\(.*\)\s*$/, '');

export function manualCaja(C) {
  if (CJ.CE.es(C)) return CJ.CE.manual(C); // 14-10 (tarde): las cajas enigma traen el suyo (y la solución, aparte)
  const T = CJ.TAPAS[C.tapa] || {}, els = C.els, hay = t => els.filter(e => e.tipo === t), bis = hay('bisagra');
  // ---- qué viene en el paquete ----
  const cuenta = new Map();
  CJ.piezasDe(C).forEach(p => { const k = grupo(p.nombre); cuenta.set(k, (cuenta.get(k) || 0) + 1); });
  const nota = { Caja: 'el cuerpo', Tapa: C.tapa === 'corredera' ? 'corredera' : '', Llave: hay('llave').map(e => 'código ' + CP.llaveCodigo(e.p.codigo)).join(', '), 'Rueda con números': 'del 0 al 9' };
  const piezas = [...cuenta.entries()].map(([k, n]) => [k, n, nota[k] || '']);
  const pasos = [], consejos = [], cuidados = [];
  let herramientas = 'Ninguna: se monta con las manos.';
  // ---- montaje ----
  if (bis.length && C.tapa === 'bisagraImp') pasos.push('Pon la tapa sobre la caja con los nudos de la bisagra intercalados y mete ' + (bis.length > 1 ? 'cada pasador por su bisagra' : 'el pasador') + ', empujando hasta que la cabeza toque el nudo.');
  if (bis.length && C.tapa === 'bisagraFil') { pasos.push('Pon la tapa en su sitio y mete por cada bisagra un trozo de filamento de 1,75 mm, 1 mm más largo que la bisagra. Calienta un poco las puntas para que no se salga.'); herramientas = 'Un trozo de filamento de 1,75 mm por bisagra y un mechero para las puntas.'; }
  if (bis.length && C.tapa === 'bisagraTor') { const tor = bis.map(e => ([16, 20, 25, 30, 35, 40, 45, 50, 60].filter(l => l <= e.p.largo - 1.7).pop() || 16)); pasos.push('Pon la tapa en su sitio y mete por cada bisagra un tornillo M3 de ' + [...new Set(tor)].join(' o ') + ' mm. Enróscalo en el último nudo sin apretar de más: la tapa tiene que girar suave.'); herramientas = 'Un destornillador pequeño y ' + bis.length + ' tornillo' + (bis.length > 1 ? 's' : '') + ' M3 de esa medida (se compran en cualquier ferretería).'; }
  if (C.tapa === 'corredera' && !hay('gravedad').length) pasos.push('La tapa entra por la derecha: deslízala por sus ranuras hasta el fondo.');
  hay('llave').forEach(e => {
    pasos.push('Mete el bombín desde fuera por el agujero de la cerradura, hasta que su pestaña toque la pared.');
    pasos.push('Por dentro, encaja la cuña en el hexágono del bombín apretando, con la llave DE PIE: la cuña tiene que quedar hacia abajo y hacia el lado del gancho de la tapa.');
  });
  hay('combinacion').forEach(e => { const cod = String(e.p.codigo || '').replace(/\D/g, '');
    pasos.push('Coloca cada rueda entre sus orejetas, con los números hacia fuera, y gíralas hasta la combinación ' + cod + ' frente a la flecha.');
    pasos.push('Mete el pestillo por la izquierda, atravesando las orejetas y las ruedas, hasta que el pomo toque la primera orejeta.'); });
  hay('gravedad').forEach(() => pasos.push('El pasador secreto: pon la tapa del revés (el pomo hacia abajo) y mete el pasador en su agujero. Pon la caja boca abajo, deslízala sobre la tapa y dale la vuelta a todo: el pasador cae y la bloquea.'));
  if (hay('fondo').length) pasos.push('Pon el fondo falso sobre sus rebordes, con la muesca a la derecha. Para levantarlo, mete el dedo en la muesca.');
  if (hay('cajon').length) pasos.push('Pon el estante sobre sus rebordes (encima del cajón) y mete el cajón por delante.');
  if (hay('bandeja').length) pasos.push('La bandeja apoya sola en sus rebordes: se saca tirando de los huecos de los lados.');
  if (hay('cubetas').length) pasos.push('Coloca las cubetas dentro, en el orden que quieras: se sacan con el dedo por su muesca.');
  if (hay('iman').length) { const m = hay('iman')[0].p; pasos.push('Pega un imán en cada hueco (caja y tapa) con una gota de pegamento. Antes de pegarlos, comprueba que se atraen.'); herramientas = 'Imanes de ' + n1(m.d) + ' × ' + n1(m.h) + ' mm (' + 2 * hay('iman').length + ') y una gota de pegamento.'; }
  if (C.pies) pasos.push('Encaja las 4 patas a presión en los agujeros de debajo de la caja (si alguna baila, una gota de pegamento).');
  if (hay('pomo').length) pasos.push('Encaja ' + (hay('pomo').length > 1 ? 'los pomos' : 'el pomo') + ' a presión en su agujero.');
  if (hay('puerta').length) pasos.push('Engancha la puerta en su eje apretando sus clips hasta oír «clic».');
  hay('colgar').forEach(e => pasos.push('Para colgarla: pon dos tornillos en la pared separados ' + n1(e.p.sep > 0 ? e.p.sep : C.L / 2) + ' mm, con la cabeza 3 mm fuera; mete las cabezas por los agujeros redondos y baja la caja.'));
  // ---- uso ----
  hay('llave').forEach(() => pasos.push('Para CERRAR: con la llave tumbada, baja la tapa y gira la llave hasta ponerla de pie. Para ABRIR: gírala hasta tumbarla y sube la tapa.'));
  hay('combinacion').forEach(e => pasos.push('Para ABRIR: pon la combinación frente a la flecha y tira del pomo (unos 6 mm). Para CERRAR: baja la tapa, empuja el pomo hasta el fondo y desordena las ruedas.'));
  hay('gravedad').forEach(() => pasos.push('Para ABRIR: pon la caja boca abajo y desliza la tapa hacia la derecha. De pie no se abre.'));
  if (hay('iman').length) pasos.push('Se cierra sola con los imanes: para abrir, levanta la tapa por delante.');
  if (hay('cierre').length) pasos.push('Para cerrar, baja la tapa hasta oír «clic». Para abrir, tira un poco de la uña hacia fuera.');
  hay('candado').forEach(e => pasos.push('Si quieres, pasa el arco de un candado de hasta ' + n1(e.p.agujero) + ' mm por las orejetas de delante.'));
  if (C.tapa === 'presion') pasos.push('La tapa entra a presión: apriétala por los bordes para cerrar y tira de ella hacia arriba para abrir.');
  if (!pasos.length) pasos.push('Viene montada: solo tienes que abrirla y usarla.');
  // ---- consejos y cuidados ----
  if (hay('llave').length) consejos.push('Guarda la llave de repuesto en otro sitio.');
  if (hay('combinacion').length) consejos.push('Apunta la combinación en un sitio seguro.');
  if (hay('gravedad').length || C.estilo === 'libro') consejos.push('Es una caja discreta: no cuentes el truco 😉');
  if (C.estilo === 'libro') consejos.push('Queda mejor en una estantería, entre libros de verdad.');
  if (hay('rejilla').length || hay('cubetas').length) consejos.push('Los compartimentos tienen el fondo redondeado: lo pequeño se coge con un dedo.');
  cuidados.push('Lejos del calor (coche al sol, radiador, lavavajillas): el plástico se ablanda a partir de unos 55 °C.');
  cuidados.push('Límpiala con un paño húmedo, sin disolventes.');
  if (hay('llave').length || hay('combinacion').length) cuidados.push('No la fuerces: si algo no gira, revisa que la llave esté entera o la combinación bien puesta.');
  return { piezas, pasos, consejos, cuidados, herramientas, edad: hay('llave').length || hay('combinacion').length ? 'Para mayores de 8 años (piezas pequeñas).' : '', vistas: null };
}
