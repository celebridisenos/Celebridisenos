// ================= v20 · 🖨️ CelebriR8 · ASISTENTE DE IMPRESIÓN (ajustes para TU Bambu) =================
// La dueña (9-10-2026): «cada diseño, antes de descargar el STL, una pequeña nota con ajustes recomendados… entra en mi
// PC, mira los ajustes de Bambu para que no digas una cosa que luego no está de acuerdo».
// Se miran SUS perfiles de Bambu Studio (los lee el programa del PC, solo lectura) y se habla con LAS MISMAS PALABRAS de su
// pantalla (Bambu Studio en español: «Bucles de pared», «Densidad de relleno», «Habilitar el soporte», «Tipo de balsa»…).
// Lo que se calcula de la pieza es MEDIDO (voladizos, apoyo, tamaño, orientación); el tiempo y el peso son ESTIMADOS.
import { h, mount, btn, toast } from '../ui.js';
import { estimarGramos, estimarHoras } from '../datos3d.js';
import * as CC from './colores_capas.js'; // v30.2 · 🎁 🌈 colores por capas (sin AMS)

// Sus perfiles (leídos de su Bambu Studio el 9-10-2026). El programa del PC los vuelve a leer al abrir (por si cambian).
export const PERFILES_DE_SERIE = {
  impresoras: [{ k: 'p1p', t: 'Bambu Lab P1P', cama: 256, sufijo: '@BBL P1P' }, { k: 'a1m', t: 'Bambu Lab A1 mini', cama: 180, sufijo: '@BBL A1M' }],
  procesos: [
    { nombre: '0.12mm Perfil01_Ligero', impresora: 'a1m', capa: 0.12, paredes: 4, relleno: 20, soporte: 'Árbol orgánico 30°', propio: 1 },
    { nombre: '0.16mm High QualityBUENATEXTURA', impresora: 'a1m', capa: 0.16, paredes: 6, relleno: 45, propio: 1 },
    { nombre: '0.16mm Optimal @FueerteCalidad', impresora: 'a1m', capa: 0.16, paredes: 5, relleno: 20, soporte: 'activado, Árbol orgánico 30°', planchado: 1, propio: 1 },
    { nombre: '0.20mm PerfilRobusto', impresora: 'a1m', capa: 0.2, relleno: 45, propio: 1 }
  ],
  filamentos: ['Bambu PLA Basic', 'Generic PETG @BBL A1M -BIOU', 'Generic PLA baja temperatura']
};
let perfiles = null;
export async function cargaPerfiles() {
  if (perfiles) return perfiles;
  try { const d = await import('../desktop.js'); const r = d.desktop && d.desktop.bambuPerfiles ? await d.desktop.bambuPerfiles() : null; if (r && r.procesos && r.procesos.length) { perfiles = Object.assign({}, PERFILES_DE_SERIE, r, { leido: true }); return perfiles; } } catch (e) { }
  perfiles = PERFILES_DE_SERIE; return perfiles;
}

// ---------- medir la pieza ----------
// sopa: Float32Array de triángulos. Devuelve áreas en mm²: apoyo en la cama, voladizo que pide soporte, etc.
export function mide(sopa, umbral = 30) {
  let zmin = Infinity, zmax = -Infinity; for (let i = 2; i < sopa.length; i += 3) { if (sopa[i] < zmin) zmin = sopa[i]; if (sopa[i] > zmax) zmax = sopa[i]; }
  const lim = -Math.cos(umbral * Math.PI / 180); let apoyo = 0, voladizo = 0, techo = 0, arriba = 0, total = 0, volBajo = 0, zVol = -Infinity;
  for (let i = 0; i < sopa.length; i += 9) {
    const ax = sopa[i], ay = sopa[i + 1], az = sopa[i + 2], bx = sopa[i + 3] - ax, by = sopa[i + 4] - ay, bz = sopa[i + 5] - az, cx = sopa[i + 6] - ax, cy = sopa[i + 7] - ay, cz = sopa[i + 8] - az;
    const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx, l = Math.hypot(nx, ny, nz); if (l < 1e-12) continue;
    const A = l / 2, k = nz / l, zc = (az + sopa[i + 5] + sopa[i + 8]) / 3; total += A;
    if (k < -0.97 && zc < zmin + 0.06) apoyo += A;
    else if (k < lim) { voladizo += A; if (zc > zVol) zVol = zc; if (k < -0.99) techo += A; }
    if (k > 0.97) arriba += A;
    void volBajo;
  }
  return { zmin, zmax, alto: zmax - zmin, apoyo, voladizo, techo, arriba, total, alturaVoladizo: zVol > -Infinity ? zVol - zmin : 0 };
}
// prueba las 6 caras: ¿cuál necesita menos soportes y apoya mejor?
const ORIENTACIONES = [['como está', [0, 0, 0]], ['boca abajo', [180, 0, 0]], ['tumbada hacia delante', [90, 0, 0]], ['tumbada hacia atrás', [-90, 0, 0]], ['de lado (derecha)', [0, 90, 0]], ['de lado (izquierda)', [0, -90, 0]]];
const gira = (s, r) => { const [a, b, c] = r.map(x => x * Math.PI / 180), ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c), o = new Float32Array(s.length);
  for (let i = 0; i < s.length; i += 3) { let x = s[i], y = s[i + 1], z = s[i + 2]; let y1 = y * ca - z * sa, z1 = y * sa + z * ca; y = y1; z = z1; let x1 = x * cb + z * sb; z1 = -x * sb + z * cb; x = x1; z = z1; x1 = x * cc - y * sc; y1 = x * sc + y * cc; o[i] = x1; o[i + 1] = y1; o[i + 2] = z; } return o; };
export function mejorOrientacion(sopa, umbral = 30) {
  const L = ORIENTACIONES.map(([t, r]) => { const m = mide(r.some(Boolean) ? gira(sopa, r) : sopa, umbral); return { t, rot: r, m, nota: m.voladizo * 1 - Math.min(m.apoyo, 3000) * 0.15 + m.alto * 0.4 }; });
  L.sort((a, b) => a.nota - b.nota); return { mejor: L[0], actual: L.find(x => x.t === 'como está'), todas: L };
}

// ---------- los consejos ----------
// ctx = { uso, material, impresora, colores: [{color, z0}], texto: bool, partes, nombre, cama }
export function aconseja(sopa, info, ctx = {}) {
  const P = perfiles || PERFILES_DE_SERIE, imp = P.impresoras.find(x => x.k === (ctx.impresora || 'p1p')) || P.impresoras[0], cama = imp.cama;
  const m = mide(sopa, 30), O = mejorOrientacion(sopa, 30), uso = ctx.uso || 'deco', mat = ctx.material || (uso === 'flexible' ? 'TPU' : 'PLA');
  const [X, Y, Z] = info.dims, fino = ctx.texto || Math.min(X, Y) < 25 || Z < 12, grande = Math.max(X, Y, Z) > 150;
  const A = [], aviso = [], porque = {};
  const ajuste = (pest, nombre, valor, razon) => A.push({ pest, nombre, valor, razon });
  // perfil para empezar: uno SUYO de esa impresora y esa capa si lo tiene; si no, el de serie de Bambu
  let capa, tipoP;
  if (uso === 'jarron') { capa = 0.2; tipoP = 'Standard'; } else if (uso === 'mecanica') { capa = 0.16; tipoP = 'Strength'; } else if (uso === 'funcional' || uso === 'encaje') { capa = 0.2; tipoP = 'Strength'; } else if (fino) { capa = 0.12; tipoP = 'Fine'; } else if (grande) { capa = 0.2; tipoP = 'Standard'; } else { capa = 0.16; tipoP = 'Optimal'; }
  const suyos = (P.procesos || []).filter(x => x.propio && x.impresora === imp.k && Math.abs((x.capa || 0) - capa) < 0.001), quiere = uso === 'funcional' || uso === 'mecanica' ? (x => (x.relleno || 0) >= 35) : (x => !x.relleno || x.relleno <= 25);
  const suyo = uso === 'jarron' ? null : suyos.find(quiere) || suyos[0] || null;
  const perfil = suyo ? suyo.nombre : capa.toFixed(2) + 'mm ' + tipoP + ' ' + imp.sufijo;
  porque.perfil = (suyo ? 'Es TUYO. ' : '') + (uso === 'jarron' ? 'Es un jarrón para imprimir en espiral: la capa de 0,20 lo hace rápido y liso.' : uso === 'mecanica' ? 'Pieza mecánica que trabaja: muy fuerte y a medida (capa de 0,16 para que las alturas salgan exactas).' : uso === 'funcional' || uso === 'encaje' ? 'Tiene que aguantar (o encajar): más paredes y más relleno.' : fino ? 'Tiene letras o detalles pequeños: con capa fina se ven nítidos.' : grande ? 'Es grande: a 0,20 tarda bastante menos y se nota poco.' : 'Decorativa de tamaño medio: buen equilibrio entre acabado y tiempo.');
  const tuyo = (k, t) => (suyo && suyo[k] ? ' (tu perfil trae ' + suyo[k] + t + ')' : '');
  ajuste('Calidad', 'Altura de la capa', String(capa).replace('.', ',') + ' mm', porque.perfil);
  // paredes y relleno
  if (uso === 'jarron') { ajuste('Otros', 'Jarrón en espiral', 'Activado', 'La pieza va maciza a propósito: así sale con una sola pared, sin costura y en la mitad de tiempo.'); ajuste('Fuerza', 'Capas inferiores de cubierta', '4', 'Que el fondo no gotee si lo usas con agua (aun así, no es 100 % estanco).'); }
  else if (uso === 'mecanica') { ajuste('Fuerza', 'Bucles de pared', '6', 'Las paredes son las que aguantan (dientes, ejes, agujeros): con 6 el diente es casi macizo.'); ajuste('Fuerza', 'Capas superiores de la cubierta', '6', 'Caras fuertes donde apoyan los rodamientos y los tornillos.'); ajuste('Fuerza', 'Capas inferiores de cubierta', '6', ''); ajuste('Fuerza', 'Densidad de relleno', '60 %', 'Para que no ceda con la carga ni con los golpes.'); ajuste('Fuerza', 'Patrón de relleno disperso', 'Giroide', 'Aguanta igual en todas las direcciones.'); ajuste('Velocidad', 'Velocidad de la pared exterior', '60 mm/s', 'Más despacio fuera = medidas más exactas (los encajes entran como deben).'); ajuste('Filamento', 'Material', 'PETG o nailon (PA)', 'El PLA se deforma con el calor del motor y se parte con los golpes: para probar, sí; para correr, no.'); }
  else if (uso === 'funcional') { ajuste('Fuerza', 'Bucles de pared', '4' + tuyo('paredes', ''), 'Lo que da fuerza a una pieza son las paredes, más que el relleno.'); ajuste('Fuerza', 'Densidad de relleno', '25–40 %', 'Para que no ceda al apretar o colgar cosas.'); ajuste('Fuerza', 'Patrón de relleno disperso', 'Giroide', 'Aguanta igual en todas las direcciones.'); }
  else if (uso === 'encaje') { ajuste('Fuerza', 'Bucles de pared', '3', 'Paredes firmes en las zonas que encajan.'); ajuste('Fuerza', 'Densidad de relleno', '20 %', ''); ajuste('Calidad', 'Pared precisa', 'Activado (si tu versión lo tiene)', 'Las medidas por fuera salen más exactas: los encajes entran como deben.'); }
  else if (uso === 'flexible') { ajuste('Fuerza', 'Bucles de pared', '3', ''); ajuste('Fuerza', 'Densidad de relleno', '15 %', 'Con TPU, más relleno la hace dura.'); }
  else { ajuste('Fuerza', 'Bucles de pared', '2–3' + tuyo('paredes', ''), 'Decorativa: no necesita más.'); ajuste('Fuerza', 'Densidad de relleno', '10–15 %' + tuyo('relleno', ' %'), 'Ligera y rápida.'); ajuste('Fuerza', 'Patrón de relleno disperso', 'Giroide', 'Se ve bonito si la pieza deja pasar la luz y no hace ruido al imprimir.'); }
  // soportes
  const pideSoporte = m.voladizo > 30 && uso !== 'jarron';
  if (pideSoporte) {
    ajuste('Soporte', 'Habilitar el soporte', 'Sí', 'Hay ' + Math.round(m.voladizo / 100) + ' cm² de pieza «en el aire» (más inclinada de 30°).');
    ajuste('Soporte', 'Tipo · Estilo', 'árbol(auto) · Árbol orgánico', 'Se quitan fácil y casi no dejan marca (es el que usas en tus perfiles).');
    ajuste('Soporte', 'Ángulo de umbral', '30°', 'El mismo que tienes en tus perfiles.');
    if (m.alturaVoladizo < m.alto * 0.25) ajuste('Soporte', 'Sólo en la placa de impresión', 'Activado', 'Lo que está en el aire está abajo: los soportes solo desde la cama, sin ensuciar la pieza.');
  } else if (uso !== 'jarron') ajuste('Soporte', 'Habilitar el soporte', 'No', m.voladizo > 1 ? 'Lo que vuela es muy poco: sale bien sin soportes.' : 'No tiene nada en el aire.');
  // apoyo y balsa (brim)
  const base = Math.min(X, Y), esbelta = Z / Math.max(1, base) > 2.6;
  if (m.apoyo < 120 || esbelta) ajuste('Otros', 'Tipo de balsa', 'Solo borde exterior · Ancho de la balsa 5 mm', esbelta ? 'Es alta y estrecha: el borde la sujeta para que no se mueva al subir.' : 'Apoya poco en la cama (' + Math.round(m.apoyo) + ' mm²): el borde ayuda a que no se despegue.');
  else ajuste('Otros', 'Tipo de balsa', 'Automático', 'Apoya bien (' + Math.round(m.apoyo / 100) + ' cm² en la cama).');
  // superficie de arriba plana y grande → planchado
  if (uso !== 'jarron' && m.arriba > 1500 && (ctx.texto || uso === 'deco')) ajuste('Calidad', 'Tipo de planchado', 'Superficie superior', 'La cara de arriba es plana y grande: queda lisa como un espejo (tarda un poco más).');
  // material
  if (mat === 'TPU') { aviso.push('TPU: imprímelo despacio (el perfil de TPU de Bambu ya va lento) y, en la P1P, sin pasar por el AMS. Sin balsa: con TPU no hace falta y cuesta quitarla.'); }
  if (mat === 'PETG') ajuste('Filamento', 'Perfil', 'Generic PETG @BBL A1M -BIOU (tu PETG)', 'Tu PETG ya tiene la retracción y el salto en Z afinados.');
  // orientación
  const ganancia = O.actual.m.voladizo - O.mejor.m.voladizo;
  const orient = O.mejor.t !== 'como está' && ganancia > Math.max(40, O.actual.m.voladizo * 0.4) ? { t: O.mejor.t, rot: O.mejor.rot, antes: O.actual.m.voladizo, despues: O.mejor.m.voladizo } : null;
  // cama
  if (X > cama || Y > cama || Z > cama) aviso.push('No cabe en la ' + imp.t + ' (' + cama + ' mm). Redúcela o pártela con «✂️ Partir».');
  // colores
  const cambios = (ctx.colores || []).filter(c => c.z0 > 0.1).map(c => Math.round(c.z0 * 100) / 100);
  if (cambios.length) ajuste('Capas', 'Cambio de color', 'A ' + cambios.map(z => String(z).replace('.', ',') + ' mm').join(' y a '), 'En la vista previa de Bambu Studio, en la barra de capas: clic derecho a esa altura → «Añadir pausa». La impresora se para y cambias la bobina.');
  // estimados
  const g = estimarGramos(info.vol, info.area, { relleno: uso === 'mecanica' ? 60 : uso === 'funcional' ? 30 : 15, paredes: uso === 'mecanica' ? 6 : uso === 'funcional' ? 4 : 2, material: mat });
  return { perfil, porque: porque.perfil, ajustes: A, avisos: aviso, orient, mide: m, gramos: g, impresora: imp, material: mat, uso };
}

// ---------- en pantalla ----------
const PEST = { Calidad: '🎯', Fuerza: '💪', Soporte: '🌲', Otros: '⚙️', Filamento: '🧵', Capas: '🎨' };
export function vista(r, o = {}) {
  const grupos = {}; r.ajustes.forEach(a => { (grupos[a.pest] = grupos[a.pest] || []).push(a); });
  return h('div.cj',
    h('div.cj-perfil', h('span', '🧩 Perfil para empezar'), h('b', r.perfil), h('small', r.porque)),
    Object.entries(grupos).map(([p, L]) => h('div.cj-grupo', h('div.cj-pest', (PEST[p] || '•') + ' ' + p), L.map(a => h('div.cj-aj', h('span.cj-n', a.nombre), h('b.cj-v', a.valor), a.razon ? h('small', a.razon) : null)))),
    r.orient ? h('div.cj-orient', h('b', '↻ Mejor ' + r.orient.t), h('small', 'Pasa de ' + Math.round(r.orient.antes / 100) + ' a ' + Math.round(r.orient.despues / 100) + ' cm² en el aire: menos soportes y mejor acabado.'), o.alGirar ? btn('Tumbarla así', () => o.alGirar(r.orient.rot), { cls: 'sm primary cj-girar' }) : h('small', 'En Bambu Studio: «Colocar en la cara» (tecla F) sobre la cara que quieres abajo.')) : null,
    r.avisos.map(a => h('p.cj-aviso', '⚠️ ' + a)),
    h('div.cj-pie', h('span', '⚖️ ≈ ' + (r.gramos ? Math.max(1, Math.round(r.gramos)) : '?') + ' g de ' + r.material), h('small', 'ESTIMADO · ' + r.impresora.t + (perfiles && perfiles.leido ? ' · perfiles leídos de tu Bambu Studio' : ' · tus perfiles del 9-10-2026'))));
}
// ---------- EL ASISTENTE: te pregunta, tú tocas, y el 3MF sale con los ajustes dentro ----------
// «Que me pregunte: ¿quieres un acabado así?, ¿va bien soporte este o mejor este?… y yo voy completando, y al darle a
// imprimir esos ajustes ya se quedan para darla a imprimir a la Bambu» (la dueña, 9-10-2026).
// Cada respuesta se traduce a las claves que Bambu Studio guarda DENTRO de cada pieza del 3MF (lo hemos visto en sus
// propios 3MF de MakerWorld: enable_support, brim_type, support_style…). Lo que contestas se recuerda para la próxima vez.
const ACABADO = { rapido: { t: '⚡ Rápido', d: 'Capa de 0,20 mm', capa: 0.2 }, equilibrado: { t: '⚖️ Equilibrado', d: 'Capa de 0,16 mm', capa: 0.16 }, fino: { t: '✨ Fino', d: 'Capa de 0,12 mm: letras nítidas', capa: 0.12 } };
const USOS = { mecanica: ['⚙️ Pieza mecánica que trabaja', 'Engranajes, ejes, RC: muy fuerte y a medida'], deco: ['🎀 Decoración', 'Bonita y ligera'], funcional: ['💪 Tiene que aguantar', 'Colgar, apretar, usar a diario'], encaje: ['🧩 Encaja con otra', 'Tapas, roscas, pasadores'], jarron: ['🏺 Jarrón en espiral', 'Una sola pared, sin costura'], flexible: ['🪢 Flexible (TPU)', 'Fundas, gomas'] };
// v30.6.1 · PERFILES DE UN TOQUE (la dueña: «alta calidad, calidad robusta, calidad normal, recomendada para esto… como una pequeña
// encuesta, y se aplica ese perfil automáticamente para que Bambu lo configure, que solo tenga que laminar e imprimir»). Cada uno pone
// de golpe varias respuestas de abajo (acabado y uso); las demás (soportes, borde) las pone la propia pieza.
export const PERFILES_RAPIDOS = {
  alta: { e: '✨', t: 'Alta calidad', d: 'Figuras, regalos y letras pequeñas: capa fina de 0,12 mm', R: { acabado: 'fino', uso: 'deco' } },
  normal: { e: '⚖️', t: 'Normal', d: 'Para casi todo: capa de 0,16 mm, 2 paredes y 12 % de relleno', R: { acabado: 'equilibrado', uso: 'deco' } },
  robusta: { e: '💪', t: 'Robusta', d: 'Tiene que aguantar (colgar, apretar, uso diario): 4 paredes y 30 % de relleno', R: { acabado: 'rapido', uso: 'funcional' } },
  mecanica: { e: '⚙️', t: 'Mecánica a medida', d: 'Engranajes, ejes y piezas que encajan: 6 paredes y 60 % de relleno', R: { acabado: 'equilibrado', uso: 'mecanica' } },
  rapida: { e: '⚡', t: 'Rápida (de prueba)', d: 'Para ver si vale antes de la buena: capa de 0,20 mm y lo justo', R: { acabado: 'rapido', uso: 'deco' } },
};
export const perfilRapidoDe = R => (Object.entries(PERFILES_RAPIDOS).find(([, q]) => q.R.acabado === R.acabado && q.R.uso === R.uso) || [''])[0];
const leeResp = k => { try { return JSON.parse(localStorage.getItem('cd.r8.imprimir.' + k) || 'null') || {}; } catch (e) { return {}; } };
const guardaResp = (k, o) => { try { localStorage.setItem('cd.r8.imprimir.' + k, JSON.stringify(o)); } catch (e) { } };
// Las respuestas → claves de Bambu Studio (las mismas que escribe él en sus 3MF)
export function claves(R) {
  const k = { layer_height: String(ACABADO[R.acabado || 'equilibrado'].capa) };
  if (R.uso === 'jarron') Object.assign(k, { spiral_mode: '1', wall_loops: '1', sparse_infill_density: '0%', top_shell_layers: '0', bottom_shell_layers: '4' });
  else { const pared = { mecanica: 6, deco: 2, funcional: 4, encaje: 3, flexible: 3 }[R.uso] || 2, rell = { mecanica: 60, deco: 12, funcional: 30, encaje: 20, flexible: 15 }[R.uso] || 15;
    Object.assign(k, { wall_loops: String(pared), sparse_infill_density: rell + '%', sparse_infill_pattern: R.uso === 'encaje' || R.uso === 'flexible' ? 'grid' : 'gyroid' });
    if (R.uso === 'mecanica') Object.assign(k, { top_shell_layers: '6', bottom_shell_layers: '6' }); } // v20.2: fuerte y a medida · v20.4: SIN outer_wall_speed (en su Bambu Studio es una LISTA por boquilla; escrito suelto, la línea de órdenes rechaza el 3MF: «Invalid parameter value(s)»)
  if (R.soporte === 'arbol' || R.soporte === 'cama') Object.assign(k, { enable_support: '1', support_type: 'tree(auto)', support_style: 'tree_organic', support_threshold_angle: '30', support_on_build_plate_only: R.soporte === 'cama' ? '1' : '0' });
  else if (R.soporte === 'normal') Object.assign(k, { enable_support: '1', support_type: 'normal(auto)', support_threshold_angle: '30' }); // v20: Print Doctor
  else k.enable_support = '0';
  k.brim_type = R.balsa === 'si' ? 'outer_only' : R.balsa === 'no' ? 'no_brim' : 'auto_brim'; if (R.balsa === 'si') k.brim_width = '5';
  if (R.planchar === 'si') k.ironing_type = 'top';
  return k;
}
// Lo mismo, como lo ves en tu pantalla de Bambu Studio
export function enPantalla(R) {
  const L = [['Calidad', 'Altura de la capa', String(ACABADO[R.acabado || 'equilibrado'].capa).replace('.', ',') + ' mm']];
  if (R.uso === 'jarron') L.push(['Otros', 'Jarrón en espiral', 'Activado']);
  else { const c = claves(R); L.push(['Fuerza', 'Bucles de pared', c.wall_loops], ['Fuerza', 'Densidad de relleno', c.sparse_infill_density], ['Fuerza', 'Patrón de relleno disperso', c.sparse_infill_pattern === 'gyroid' ? 'Giroide' : 'Rejilla']);
    if (R.uso === 'mecanica') L.push(['Fuerza', 'Capas superiores de la cubierta', '6'], ['Fuerza', 'Capas inferiores de cubierta', '6'], ['Velocidad', 'Velocidad de la pared exterior', '60 mm/s (el perfil «0.16mm CelebriR8 PRECISION» ya la lleva; si usas otro, ponla tú: no va dentro del 3MF)']); }
  L.push(['Soporte', 'Habilitar el soporte', R.soporte === 'arbol' ? 'Sí · árbol(auto) · Árbol orgánico · 30°' : R.soporte === 'cama' ? 'Sí · Árbol orgánico · Sólo en la placa de impresión' : 'No']);
  L.push(['Otros', 'Tipo de balsa', R.balsa === 'si' ? 'Solo borde exterior · 5 mm' : R.balsa === 'no' ? 'Sin borde' : 'Automático']);
  if (R.planchar === 'si') L.push(['Calidad', 'Tipo de planchado', 'Superficie superior']);
  return L;
}
// o = { clave, partes: () => [{ m, color, nombre }], N, uso, texto, nombre, baja, alGirar, cama, desktopAbrir }
export async function asistente(el, o) {
  await cargaPerfiles();
  const { N } = o; let L, r, sopa, info, perf = null;
  try { L = o.partes(); if (!L.length) throw new Error('No hay nada que imprimir.'); const tot = N.union(L.map(x => x.m)); sopa = N.aSopa(tot); info = N.info(tot); try { perf = CC.perfil(tot, N); } catch (e) { perf = null; } }
  catch (e) { mount(el, h('p.r8e-mal', '⚠️ ' + (e.message || e))); N.limpia(); return; }
  const zmin = info.min[2], cols = {}; L.forEach(x => { const b = N.caja(x.m); cols[x.color] = Math.min(cols[x.color] ?? Infinity, b.min[2] - zmin); });
  const colores = Object.entries(cols).sort((a, b) => a[1] - b[1]).map(([color, z0]) => ({ color, z0 }));
  N.limpia();
  // v30 · 🎯 la calibración, a la vista también aquí
  const calAviso = h('div.aj-cal');
  import('./calibracion.js').then(CPR => { const A = o.sinCalibrar ? null : CPR.activa();
    mount(calAviso, A ? h('div.aj-ok', '🎯 Va corregida con tu calibración «' + A.clave + '» (' + A.fecha + ').')
      : o.sinCalibrar ? null : h('div.aj-cal-no', h('span', '🎯 Tu impresora aún no está calibrada: con la placa de 3 probetas tus piezas salen a medida solas.'), h('button.btn.sm.aj-calibrar', { type: 'button', onclick: () => import('./calibracion_puerta.js').then(m => m.abrirPlaca3({})) }, 'Calibrar ahora'))); }).catch(() => { });
  const clave = o.clave || 'estudio', R = Object.assign({ impresora: (o.cama || 256) <= 180 ? 'a1m' : 'p1p', material: o.uso === 'flexible' ? 'TPU' : 'PLA', uso: o.uso || 'deco' }, leeResp(clave));
  // v30.2 · 🌈 los cambios de color: los que ya trae el diseño (el QR: negro al acabar la base) o los de sus piezas de colores
  if (!R.cc) R.cc = { cambios: (o.cambios || []).filter(Boolean).map(c => ({ z: Math.round(c.z * 100) / 100, color: c.color })).concat(!o.cambios && colores.length > 1 ? colores.slice(1).map(c => ({ z: Math.round(c.z0 * 100) / 100, color: c.color })) : []), base: colores.length > 1 ? colores[0].color : (o.colorBase || null) };
  // v30.6 · desde el Estudio, los colores y las pausas viven en el PROYECTO (o.cc): si aún está vacío, se rellena con lo propuesto
  if (o.cc) { if (!(o.cc.cambios || []).length && !o.cc.base) Object.assign(o.cc, JSON.parse(JSON.stringify(R.cc))); R.cc = o.cc; }
  const pregunta = h('input.inp.cj-preg', { placeholder: '¿Y si lo quiero más resistente? ¿Lo puedo hacer en PETG?…', onkeydown: e => { if (e.key === 'Enter') preguntar(); } }), resp = h('div.cj-resp');
  let hayCC = false; // (si aparecen o desaparecen los cambios de color, se repinta para la pregunta 8 y el botón)
  const pinta = () => {
    hayCC = !!(R.cc && (R.cc.cambios || []).length);
    r = aconseja(sopa, info, { uso: R.uso, texto: o.texto, material: R.material, impresora: R.impresora, colores: colores.length > 1 ? colores : [] });
    const fino = /0\.12/.test(r.perfil), rec = { acabado: R.uso === 'jarron' || R.uso === 'funcional' || R.uso === 'encaje' ? 'rapido' : fino ? 'fino' : 'equilibrado', soporte: o.soportes ? 'arbol' : r.mide.voladizo > 30 && R.uso !== 'jarron' ? (r.mide.alturaVoladizo < r.mide.alto * 0.25 ? 'cama' : 'arbol') : 'no', balsa: r.ajustes.some(a => a.nombre === 'Tipo de balsa' && /borde/.test(a.valor)) ? 'si' : 'auto', planchar: r.ajustes.some(a => a.nombre === 'Tipo de planchado') ? 'si' : 'no', modoColor: 'pausa' };
    if (R.modoColor !== 'normal') R.modoColor = 'pausa'; // (v30.2.2: ya no hay «AMS»: no tiene)
    ['acabado', 'soporte', 'balsa', 'planchar', 'modoColor'].forEach(k => { if (!R[k]) R[k] = rec[k]; });
    const preg = (k, titulo, ops, ayuda) => h('div.aj-preg', { 'data-preg': k }, h('b', titulo), ayuda ? h('small', ayuda) : null, h('div.aj-ops', ops.map(([v, t, d]) => h('button.aj-op' + (R[k] === v ? '.on' : ''), { type: 'button', 'data-v': v, onclick: () => { R[k] = v; guardaResp(clave, R); pinta(); } }, h('span', t), rec[k] === v ? h('i.aj-rec', '⭐ recomendado') : null, d ? h('small', d) : null))));
    const imp = (perfiles || PERFILES_DE_SERIE).impresoras, vol = r.mide.voladizo;
    const usoPieza = o.uso || 'deco', recPerfil = usoPieza === 'mecanica' ? 'mecanica' : usoPieza === 'funcional' || usoPieza === 'encaje' ? 'robusta' : (o.texto || Math.min(info.dims[0], info.dims[1]) < 25 || info.dims[2] < 12) ? 'alta' : 'normal', perfilAhora = perfilRapidoDe(R);
    mount(el, h('div.r8e-prop-t', h('b', '🖨️ PREPARAR PARA TU BAMBU')), h('p.small.muted', 'Toca lo que quieras. Lo marcado con ⭐ es lo que haría yo con esta pieza. Al final, el archivo sale con todo puesto.'),
      // v30.6.1 · lo primero que se ve: si necesita soportes, y los perfiles de un toque
      R.uso === 'jarron' ? null : h('div.aj-soporte' + (vol > 30 ? '.si' : '.no'), { 'data-soporte': vol > 30 ? 'si' : 'no' }, vol > 30
        ? [h('b', '🌳 Necesitará soportes'), h('span', ' Tiene ' + Math.round(vol / 100) + ' cm² en el aire. ' + (R.soporte === 'no' ? 'Ahora mismo va SIN ellos (cámbialo en la pregunta 5).' : 'Ya van puestos en el archivo (pregunta 5).') + (r.orient ? ' Tumbada ' + r.orient.t + ' necesitaría muchos menos.' : ''))]
        : [h('b', '✅ No necesita soportes'), h('span', ' No tiene nada en el aire: va tal cual.')]),
      R.uso === 'jarron' ? null : h('div.aj-preg.aj-perfiles', { 'data-preg': 'perfil' }, h('b', '⭐ Elige un perfil (lo pone todo de una vez)'), h('small', 'Capa, paredes y relleno de golpe. Debajo puedes cambiar cada cosa si quieres afinar.'),
        h('div.aj-ops', Object.entries(PERFILES_RAPIDOS).map(([k, q]) => h('button.aj-op' + (perfilAhora === k ? '.on' : ''), { type: 'button', 'data-perfil': k, onclick: () => { Object.assign(R, q.R); guardaResp(clave, R); pinta(); } }, h('span', q.e + ' ' + q.t), recPerfil === k ? h('i.aj-rec', '⭐ recomendado para esta pieza') : null, h('small', q.d))))),
      preg('impresora', '1. ¿En qué impresora?', imp.map(i => [i.k, i.t, 'Cama de ' + i.cama + ' mm'])),
      preg('material', '2. ¿Con qué material?', [['PLA', 'PLA', 'El de siempre'], ['PETG', 'PETG', 'Agua, sol, golpes'], ['TPU', 'TPU', 'Flexible']]),
      preg('uso', '3. ¿Para qué es?', Object.entries(USOS).map(([k, [t, d]]) => [k, t, d])),
      preg('acabado', '4. ¿Qué acabado quieres?', Object.entries(ACABADO).map(([k, a]) => [k, a.t, a.d])),
      R.uso === 'jarron' ? null : vol > 30 ? preg('soporte', '5. Tiene ' + Math.round(vol / 100) + ' cm² en el aire. ¿Cómo lo hacemos?', [['arbol', '🌲 Soportes de árbol', 'Se quitan fácil'], ['cama', '🛏️ Solo desde la cama', 'No ensucian la pieza por arriba'], ['no', '🚫 Sin soportes', 'Lo que vuela puede salir feo']].concat(r.orient && o.alGirar ? [['tumbar', '↻ Tumbarla ' + r.orient.t, 'Casi no hace falta soporte']] : []), r.orient ? 'Si la tumbas ' + r.orient.t + ', se queda en ' + Math.round(r.orient.despues / 100) + ' cm² en el aire.' : null)
        : h('div.aj-ok', '✅ No tiene nada en el aire: va sin soportes.'),
      preg('balsa', '6. ¿Le pongo un borde para que no se despegue?', [['si', 'Sí, borde exterior', 'Si apoya poco o es alta'], ['auto', 'Que decida Bambu', 'Automático'], ['no', 'Sin borde', 'Más limpio']], 'Apoya ' + Math.round(r.mide.apoyo / 100) + ' cm² en la cama.'),
      r.mide.arriba > 1500 && R.uso !== 'jarron' ? preg('planchar', '7. ¿Plancho la cara de arriba?', [['si', 'Sí, lisa como un espejo', 'Tarda un poco más'], ['no', 'No', '']]) : null,
      colores.length > 1 ? h('div.aj-ok', '🎨 Lleva ' + colores.length + ' colores (abajo, en «🌈 Colores por capas», la capa exacta de cada cambio).') : null,
      (() => { try { localStorage.setItem('cd.r8.capaTaller', String(capaArchivo())); } catch (e) { } return null; })(), // (el taller de colores del Estudio cuenta las capas con la misma altura)
      CC.bloque(R.cc, { perf, capa: capaArchivo(), colorBase: (L[0] && L[0].color) || '#f4f4f0', alGuardar: () => { guardaResp(clave, R); o.alCambiarCC && o.alCambiarCC(); if (((R.cc.cambios || []).length > 0) !== hayCC) pinta(); }, modo: R.modoColor || 'pausa', conBambu: !!o.desktopAbrir,
        abrirTaller: sopa ? async () => { const T = await import('./colores_taller.js'); await T.abrirColores({ sopa, nombre: o.nombre || 'Pieza', est: R.cc, capa: capaArchivo(), colorBase: (L[0] && L[0].color) || '#f4f4f0', prop: perf ? perf.prop : [], impresora: (r && r.impresora && (r.impresora.t || r.impresora.nombre || '')) || '', alGuardar: () => { guardaResp(clave, R); o.alCambiarCC && o.alCambiarCC(); pinta(); } }); } : null }), // v30.2 · 🎁 🌈 · v30.6: el taller sobre la pieza
      // v30.2.1 · la dueña: «que al exportar me diga imprimir normal o manual, y que lo exporte él a Bambu directamente» (v30.2.2: «no tengo AMS»)
      (R.cc && R.cc.cambios || []).length ? preg('modoColor', '8. ¿Cómo lo vas a imprimir?', [['pausa', '✋ Cambio a mano', 'Se para sola en la capa y cambias tú la bobina'], ['normal', '🖨️ Normal', 'De un solo color, sin pausas']], o.desktopAbrir ? 'Al abrirlo en Bambu Studio, la pausa ya va PUESTA (lo hace tu propio Bambu Studio).' : 'En el móvil o la tablet: abajo te digo la capa para poner la pausa en Bambu Studio.') : null,
      h('div.aj-resumen', h('b', '📋 Así va a ir'), h('div.aj-perfil', 'Perfil de arriba (Proceso): ', h('b', r.perfil)), enPantalla(R).map(([p, n, v]) => h('div.aj-fila', h('span', p + ' · ' + n), h('b', v))), r.avisos.map(a => h('p.cj-aviso', '⚠️ ' + a)), h('small.aj-peso', (() => { const hE = r.gramos ? estimarHoras(r.gramos, info.dims[2], { material: R.material, capa: Number(claves(R).layer_height) }) : null; window.__r8ajHoras = hE ? hE.v : null; return '⚖️ ≈ ' + (r.gramos ? Math.max(1, Math.round(r.gramos)) : '?') + ' g' + (hE ? ' · ⏱️ ' + hE.texto : '') + ' · ESTIMADO (lo de verdad, al laminar en Bambu Studio)'; })())),
      calAviso, // v30: 🎯 si va corregida con su calibración, o el botón para calibrar
      estadoColor(), // v30.6.2: antes de salir, se ve si lleva paradas (y cuáles) o si sale de un color
      h('div.r8e-btns.aj-bajar', o.desktopAbrir ? btn(conPausas() ? '🖨️ Abrir en Bambu YA LAMINADO, con la pausa dentro' : '🖨️ Abrir en Bambu YA LAMINADO (solo Imprimir)', () => sale('laminado'), { cls: 'primary aj-laminado', title: 'Lo lamina tu propio Bambu Studio con estos ajustes y se abre listo para imprimir: así no se pierde nada por el camino' }) : null,
        o.desktopAbrir ? btn(conPausas() ? '🧩 Abrir el proyecto con la pausa puesta' : '🧩 Abrir el proyecto en Bambu Studio', () => sale('abrir'), { cls: 'aj-abrir', title: 'Sin laminar: para cambiar cosas en Bambu Studio antes de imprimir' }) : null,
        btn('📦 3MF con los ajustes', () => sale('3mf'), { cls: (o.desktopAbrir ? '' : 'primary ') + 'aj-3mf' }), btn('⬇ Solo el STL', () => sale('stl'), { cls: 'aj-stl' })),
      o.desktopAbrir ? h('p.tiny.muted.aj-como', h('b', '«Ya laminado»'), ': lo lamina tu Bambu Studio con tus perfiles y estos ajustes, y se abre en «Modo de vista previa»: solo queda pulsar ', h('b', 'Imprimir placa'), '. Es lo seguro: ahí no se puede perder ni la pausa ni ningún ajuste. ', h('b', '«El proyecto»'), ' es para cambiar cosas en Bambu antes de laminar; si Bambu pregunta «Seleccione una acción», elige ', h('b', '«Abrir como proyecto»'), ' (con «Importar geometría solo» se pierden la pausa y los ajustes).')
        : h('p.tiny.muted', 'En Bambu Studio elige arriba el perfil «' + r.perfil + '». Los ajustes de esta pieza ya van DENTRO del archivo (en la lista de objetos, junto a la pieza, sale el icono de sus ajustes). Luego: Laminar placa → Imprimir.'),
      h('div.cj-ia', h('b', '🤖 ¿Alguna duda?'), pregunta, resp));
    window.__r8aj = { perfilRapido: perfilAhora, recPerfil, soportes: vol > 30, R: Object.assign({}, R), claves: claves(R), perfil: r.perfil, voladizo: Math.round(vol), apoyo: Math.round(r.mide.apoyo), orient: r.orient && r.orient.t };
  };
  async function preguntar() {
    const q = pregunta.value.trim(); if (!q) return; mount(resp, h('small.muted', '🤖 Pensando…'));
    try { const E = await import('../ai/engine.js'); const datos = 'Pieza de ' + r.mide.alto.toFixed(0) + ' mm de alto, ' + Math.round(r.mide.voladizo / 100) + ' cm² en voladizo, ' + Math.round(r.mide.apoyo / 100) + ' cm² de apoyo; uso ' + R.uso + ', material ' + R.material + ', impresora ' + r.impresora.t + '. Ajustes elegidos: ' + enPantalla(R).map(x => x[1] + ' = ' + x[2]).join('; ') + '.';
      const txt = await E.write('Eres experto en impresión 3D con Bambu Studio EN ESPAÑOL (usa sus nombres: Altura de la capa, Bucles de pared, Densidad de relleno, Habilitar el soporte, Árbol orgánico, Tipo de balsa, Jarrón en espiral). ' + datos + ' Pregunta de la dueña: «' + q + '». Responde en 3 frases cortas y concretas, sin inventar datos de la pieza.', { onToken: t => mount(resp, h('p', t)) }); mount(resp, h('p', txt)); }
    catch (e) { mount(resp, h('p.r8e-mal', '🤖 ' + (e.message || 'La IA no está disponible ahora.'))); }
  }
  // hay cambios de color y no se ha elegido imprimirla «normal» (de un color)
  // la altura de capa que va DENTRO del archivo (la que usará Bambu para esta pieza): de ella sale el número de capa de la pausa
  const capaArchivo = () => Number(Object.assign(claves(R), o.forzar || {}).layer_height) || CC.capaPerfil(r && r.perfil);
  const conPausas = () => !!(R.cc && (R.cc.cambios || []).filter(c => c.activa !== false).length) && (R.modoColor || 'pausa') !== 'normal';
  // v30.6.2 · la dueña (12-10-2026): «separar los colores por capa: en Bambu no se refleja, no pausa». Antes de salir se dice
  // CLARO qué va a pasar: las paradas con su capa y su color, o que sale de un color (y por qué), o que solo hay caras pintadas.
  const mm = z => String(Math.round(z * 100) / 100).replace('.', ',');
  const paradasTxt = () => (R.cc.cambios || []).filter(c => c.activa !== false).slice().sort((a, b) => a.z - b.z).map(c => { const K = CC.capaDe(c.z, capaArchivo()), t = c.tipo || 'color'; return { capa: K.capa, z: K.z, tipo: t, color: c.color, que: t === 'color' ? 'pon el ' + CC.nombreColor(c.color).toLowerCase() : t === 'filamento' ? 'pon otra bobina del mismo color' : t === 'gcode' ? 'orden propia' : 'pausa (mete lo que toque y sigue)' }; });
  const carasPintadas = () => { const q = R.cc && R.cc.caras && R.cc.caras.rle; if (!q) return false; for (let i = 0; i < q.length; i += 2) if (q[i]) return true; return false; };
  function estadoColor() {
    const todos = (R.cc && R.cc.cambios) || [];
    if (conPausas()) { const L = paradasTxt(); return h('div.aj-pausas.si', { 'data-pausas': String(L.length) }, h('b', '🌈 Va con ' + L.length + (L.length === 1 ? ' parada' : ' paradas') + ' (colores por capas):'), h('ul', L.map(p => h('li', h('i', { style: { background: p.tipo === 'color' ? p.color : 'transparent' } }), '⏸ capa ' + p.capa + ' (' + mm(p.z) + ' mm) → ' + p.que))), carasPintadas() ? h('small', '🖌️ Las caras que pintaste son solo para verlo: no se imprimen.') : null); }
    if (todos.length) return h('div.aj-pausas.no', { 'data-pausas': '0' }, h('b', '🖨️ Tal como está, sale de UN color y NO se para. '), R.modoColor === 'normal' ? 'Has elegido «Normal» en la pregunta 8: cámbiala a «✋ Cambio a mano» si quieres las paradas.' : 'Las paradas están desactivadas en «🌈 Colores por capas».');
    if (carasPintadas()) return h('div.aj-pausas.ojo', { 'data-pausas': 'caras' }, h('b', '🖌️ Has pintado CARAS: eso es solo para verlo. '), 'Con una bobina cada vez la impresora solo puede cambiar de color por CAPAS (de abajo arriba). Tal como está, sale de un color y NO se para. Para que se pare: abre «🌈 Colores por capas», pulsa «🎨 Ponerlos sobre la pieza» y pinta «🧱 Por capas».');
    return null;
  }
  // una ventana propia, encima de todo (el asistente ya suele estar dentro de otra ventana)
  function ventana(clase, cosas, sePuedeCerrar) {
    const fondo = h('div.aj-vent-f', { role: 'dialog', 'aria-modal': 'true' }), cerrar = () => { fondo.remove(); document.removeEventListener('keydown', esc, true); }, esc = e => { if (e.key === 'Escape' && sePuedeCerrar) { e.preventDefault(); e.stopPropagation(); cerrar(); } };
    mount(fondo, h('div.aj-vent' + clase, cosas, sePuedeCerrar ? h('div.r8e-btns', btn('Entendido', cerrar, { cls: 'primary aj-vent-ok' })) : null)); document.body.appendChild(fondo); document.addEventListener('keydown', esc, true); return { cerrar, el: fondo };
  }
  const tiempoTxt = s => { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : ''); };
  const alCambiarBobina = () => h('p.small', 'Cuando la impresora se pare: en su pantalla, ', h('b', 'Filamento → Descargar'), ', pon la bobina nueva, ', h('b', 'Cargar'), ' (que purgue un poco) y ', h('b', 'Reanudar'), '.');
  // lo que ha pasado al mandarlo a Bambu Studio: se queda en pantalla hasta que lo cierres (antes era un aviso de 12 segundos)
  function resultado(res, como, L, conCal) {
    res = res || {}; const pres = res.presets || {}, V = res.comprobadas || [], hay = L.length > 0;
    const perfiles = pres.maquina ? h('p.small.muted', 'Con tus perfiles: ' + [pres.maquina, pres.proceso, pres.filamento, pres.placa].filter(Boolean).join(' · ') + '.' + (conCal || '')) : null;
    const lista = conMarca => h('ul.aj-vent-l', L.map((p, i) => { const v = V[i]; return h('li', h('i', { style: { background: p.tipo === 'color' ? p.color : 'transparent' } }), h('span', '⏸ capa ' + (v && v.capa ? v.capa + ' de ' + v.total : p.capa) + ' (' + mm(p.z) + ' mm) → ' + p.que), conMarca && v && v.ok ? h('b.aj-vent-si', '✅ comprobada en el archivo') : null); }));
    if (res.laminado === true) return ventana('.ok', [h('h3', '✅ Abierto en Bambu Studio, YA LAMINADO'),
      h('p', 'Lo ha laminado tu propio Bambu Studio. ', res.segundos ? h('b', '⏱️ ' + tiempoTxt(res.segundos) + (res.gramos ? ' · ⚖️ ' + String(Math.round(res.gramos * 10) / 10).replace('.', ',') + ' g' : '')) : null, res.segundos ? ' (lo dice Bambu Studio).' : null), perfiles,
      hay ? h('div.aj-vent-p', h('b', 'He leído el archivo laminado y la impresora se va a parar aquí:'), lista(true)) : null,
      h('ol', h('li', 'Se ha abierto una ventana de Bambu Studio en ', h('b', '«Previsualización»'), ', con la pieza ya laminada', hay ? [' y la etiqueta naranja ', h('b', '«Pausa»'), ' en la barra de capas de la derecha'] : null, '.'), h('li', 'Pulsa ', h('b', '«Imprimir placa»'), ' (arriba a la derecha) y elige tu impresora.'), hay ? h('li', alCambiarBobina()) : null),
      h('p.tiny.muted', 'Se abre en «Modo de vista previa»: ahí no se cambia nada, y por eso no se pierde nada. Si quieres cambiar algo en Bambu, usa «🧩 Abrir el proyecto». Guardado en ' + (res.path || '') + '.')], true);
    const noLam = como === 'laminado' ? h('p.aj-vent-aviso', '⚠️ No he podido dejarlo laminado (' + (res.motivoLaminado || 'Bambu Studio no respondió') + ').') : null;
    if (hay && res.pausa) return ventana('.ojo', [h('h3', '🧩 Abierto el PROYECTO con la pausa puesta'), noLam, perfiles, h('div.aj-vent-p', h('b', 'Paradas que lleva el proyecto:'), lista(false)),
      h('ol', h('li', 'Si Bambu Studio pregunta ', h('b', '«Seleccione una acción»'), ', elige ', h('b', '«Abrir como proyecto»'), '. Con «Importar geometría solo» se pierden la pausa y todos los ajustes.', res.geometriaSolo ? h('b.aj-vent-aviso', ' ⚠️ Tu Bambu Studio tiene guardado «Importar geometría solo»: cámbialo en ese cuadro.') : null),
        h('li', 'No lo metas con «Importar»: deja que lo abra el programa, o usa Archivo → Abrir proyecto.'), h('li', 'Pulsa ', h('b', 'Laminar placa'), ': en la barra de capas de la derecha tiene que salir la etiqueta naranja «Pausa» en esa capa. Si no sale, es que no se abrió como proyecto.'), h('li', alCambiarBobina())),
      h('p.tiny.muted', 'Guardado en ' + (res.path || '') + '.')], true);
    if (hay) return ventana('.mal', [h('h3', '⚠️ No he podido poner la pausa sola'), noLam, h('p', (res.motivo || 'Bambu Studio no respondió') + '. ' + (res.abierto ? 'Se ha abierto SIN ella.' : '')), h('div.aj-vent-p', h('b', 'Ponla a mano en Bambu Studio (10 segundos):'), lista(false)),
      h('ol', h('li', 'Laminar placa.'), h('li', 'En la barra de capas de la derecha, sube hasta esa capa.'), h('li', 'Clic derecho en el circulito → ', h('b', '«Añadir pausa»'), '.'))], true);
    if (como === 'laminado') return ventana('.ojo', [h('h3', '🧩 Abierto sin laminar'), noLam, h('p', res.abierto ? 'Se ha abierto la pieza con sus ajustes dentro: pulsa Laminar placa e Imprimir.' : 'Guardado en ' + (res.path || '') + '.')], true);
    return null;
  }
  async function sale(como) {
    try {
      if (R.soporte === 'tumbar' && r.orient && o.alGirar) { R.soporte = 'no'; guardaResp(clave, R); o.alGirar(r.orient.rot); return; }
      const P2 = o.partes(), base = o.nombre || 'pieza';
      if (como === 'stl') { o.baja(new Blob([N.stl(N.union(P2.map(x => x.m)), base)], { type: 'model/stl' }), base + '.stl'); toast('⬇ STL descargado', 'ok'); return; }
      // v20.4 · 🎯 tu CALIBRACIÓN (impresora + material): compensaciones de Bambu dentro de la pieza y, si encoge, escalada (no en las probetas de calibrar)
      const CPR = await import('./calibracion.js'), X = CPR.paraImprimir(P2.map(x => ({ m: x.m, color: x.color, nombre: x.nombre })), Object.assign(claves(R), o.forzar || {}), { sin: !!o.sinCalibrar });
      const pausas = conPausas() ? CC.paraArchivo(R.cc.cambios, capaArchivo()) : [];
      const blob = N.tresMF(X.partes, base, X.ajustes, { cambios: pausas }); window.__r8calib = X.aplicada; // v20.3: lo que un diseño NECESITA sí o sí (el rodamiento impreso: sin soportes ni balsa)
      const conCal = X.aplicada ? ' · 🎯 con tu calibración «' + X.aplicada + '»' : '';
      const extra = pausas.length ? { pausas: JSON.stringify(pausas.map(c => Object.assign({ z: c.z, color: c.color }, c.tipo ? { tipo: c.tipo } : {}, c.gcode ? { gcode: c.gcode } : {}))), imp: R.impresora, mat: R.material, proc: r.perfil } : null;
      // v30.6.2 · YA LAMINADO por su Bambu Studio (con o sin paradas), cada parada comprobada en el G-code, y abierto listo para imprimir
      if (como === 'laminado' && o.desktopAbrir) { const d = await import('../desktop.js'), L = pausas.length ? paradasTxt() : [];
        const esp = ventana('.espera', [h('h3', '⏳ Tu Bambu Studio está laminando la pieza…'), h('p', 'Con tus perfiles y estos ajustes' + (L.length ? ', y con ' + (L.length === 1 ? 'la parada' : 'las ' + L.length + ' paradas') + ' dentro' : '') + '. Una pieza grande tarda uno o dos minutos: no cierres el programa.'), h('div.aj-vent-barra')], false);
        let res; try { res = await d.desktop.bambuAbrir(blob, base, true, Object.assign({ laminar: '1', imp: R.impresora, mat: R.material, proc: r.perfil }, extra || {})); } finally { esp.cerrar(); }
        window.__r8aj && (window.__r8aj.abierto = res); resultado(res, 'laminado', L, conCal); return; }
      const capasTxt = pausas.length ? R.cc.cambios.slice().sort((a, b) => a.z - b.z).map(c => { const K = CC.capaDe(c.z, capaArchivo()); return 'capa ' + K.capa + ' (' + String(K.z).replace('.', ',') + ' mm)'; }).join(', ') : '';
      // v30.2.1 · en el PC: Bambu Studio hace SU proyecto con la pausa puesta (y se abre, o se guarda en Documentos con «3MF»)
      if (extra && o.desktopAbrir) { const d = await import('../desktop.js'); toast('🌈 Tu Bambu Studio está poniendo la pausa…', 'info', 4000); const res = await d.desktop.bambuAbrir(blob, base, como === 'abrir', extra); window.__r8aj && (window.__r8aj.abierto = res);
        if (como === 'abrir') resultado(res, 'abrir', paradasTxt(), conCal); // (se queda en pantalla, con lo de «Abrir como proyecto»)
        else if (res && res.pausa) toast('📦 Guardado con la pausa puesta en ' + res.path + ' (' + capasTxt + '). Ábrelo en Bambu Studio COMO PROYECTO, lamina e imprime.' + conCal, 'ok', 12000);
        else toast('⚠️ No he podido poner la pausa sola (' + ((res && res.motivo) || 'Bambu Studio no respondió') + '). Ponla a mano: clic derecho en la barra de capas → «Añadir pausa» en la ' + capasTxt + '.', 'warn', 14000);
        return; }
      if (como === 'abrir') { const d = await import('../desktop.js'), res = await d.desktop.bambuAbrir(blob, base); toast((res && res.abierto ? '🖨️ Abriendo en Bambu Studio… (guardado en Documentos\\CelebriDiseños_R8)' : '📦 Guardado en ' + (res && res.path)) + conCal, 'ok', 8000); window.__r8aj && (window.__r8aj.abierto = res); return; }
      o.baja(blob, base + '.3mf'); toast('📦 3MF con los ajustes descargado' + conCal + '. Ábrelo con Bambu Studio.' + (pausas.length ? ' 🌈 Pon la pausa en la ' + capasTxt + ': clic derecho en la barra de capas → «Añadir pausa».' : ''), 'ok', pausas.length ? 12000 : 6000);
    } catch (e) { toast(e.message || String(e), 'bad', 7000); } finally { N.limpia(); }
  }
  pinta();
}
// El panel del Estudio
export async function panel(el, o) {
  const d = await import('../desktop.js').catch(() => null);
  return asistente(el, { clave: 'estudio_' + (o.P.id || ''), partes: () => o.PR.partesFinales(o.P), N: o.N, uso: usoDe(o), texto: tieneTexto(o), nombre: o.nombre, baja: o.baja, alGirar: o.alGirar, cama: o.cama, desktopAbrir: !!(d && d.desktop && d.desktop.on), cc: o.cc, alCambiarCC: o.alCambiarCC }); // v30.6: los colores y las pausas, los del proyecto
}
function usoDe(o) { let uso = 'deco'; o.PR.recorre(o.P.cuerpos, c => { if (c.tipo === 'cat' && o.catalogo && o.catalogo.DISENOS[c.p.k]) { const u = o.catalogo.DISENOS[c.p.k].uso; if (u === 'pieza') uso = 'mecanica'; else if (u && uso !== 'mecanica') uso = u; } if (c.tipo === 'rosca' && uso !== 'mecanica') uso = 'encaje'; }); return uso; } // v20.2: «pieza» (mecánica/RC) = pieza que trabaja
function tieneTexto(o) { let t = false; o.PR.recorre(o.P.cuerpos, c => { if (c.tipo === 'texto' || (c.p && (c.p.txt || c.p.nombre || c.p.texto))) t = true; }); return t; }
