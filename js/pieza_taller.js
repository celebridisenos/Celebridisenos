// ================= 🖥️ ACABADO · REFORZAR · ABRIR EN BAMBU desde CUALQUIER aparato (02-11-2026, Biou) =================
// Él: «no deja poner acabado ni reforzar, ni abrir en Bambu en el portátil ni en la tablet (sale “Failed to fetch”)… arregla todo
// eso de protocolo: la torre va por cable y el portátil por wifi». La torre es la que tiene Bambu Studio, Blender y las carpetas de
// los productos; el portátil y la tablet NO pueden hacerlo solos. Así que, como el catálogo desde el iPad, se lo ENCARGAN a la torre
// por el servidor del negocio (trabajospc.js, encargo «caras» con su modo): no hace falta abrir puertos ni tocar el cortafuegos.
//   · acabado → la torre prepara la pieza con la receta (Rápido/Normal/Fino/Fuerte) y la ABRE en SU Bambu Studio.
//   · bambu   → la torre abre la pieza en SU Bambu Studio, tal cual.
//   · reforzar → la torre la refuerza (Blender) y el STL reforzado se GUARDA EN EL PRODUCTO: sale en todos los aparatos.
// En el PC con todo instalado se sigue haciendo ahí mismo; si ahí falla (no tiene Bambu o Blender, la pieza está en la torre, el
// programa no contesta…), se le encarga a la torre sin que él tenga que hacer nada.
import { S, api, byId, APP_VERSION } from './store.js';
import { toast, modal, h, btn } from './ui.js';
import { desktop } from './desktop.js';
import { filesOf, extOf, uploadFile, fetchFile } from './files.js';
import { encargarAlPC, refArchivo, registrarTrabajo } from './trabajospc.js';

const ES_3D = n => ['stl', '3mf', 'obj'].includes(extOf(n));
const primero3MF = (a, b) => (extOf(b) === '3mf') - (extOf(a) === '3mf');
// ¿este error es de «aquí no se puede» (y la torre sí puede)?
// 12-11-2026 · Biou: «en el portátil no me deja abrir en Bambu, no encuentra el STL». El archivo subido desde la torre guarda la ruta
// de la TORRE (rutaLocal): en el portátil no existe. Antes de usarla se mira que el archivo esté de verdad en ESTE PC; si no, se baja de
// la nube y se abre aquí. (Antes solo se miraba la carpeta, y si el portátil tenía la misma carpeta pero no el archivo, fallaba.)
// 12-11-2026 · 💻 PORTÁTIL (Biou: «tarda mucho la comunicación con Bambu en mi portátil, no me deja»): la pieza de la torre se coge por la
// RED de casa (la torre comparte su carpeta CELEBRIDISENOS: \\NOORKO-SERVER\CELEBRIDISENOS), sin bajarla de Google (su Google tarda 2–18 s).
// Primero la carpeta de productos que tenga puesta este PC (Configuración › Carpetas), si es una CELEBRIDISENOS; luego la de la torre.
// Con tiempo máximo: si la torre está apagada no se queda esperando (y no lo vuelve a intentar en 2 minutos).
const conTiempo = (pr, ms) => Promise.race([Promise.resolve(pr).catch(() => null), new Promise(r => setTimeout(() => r(null), ms))]);
export const TORRE_RED = '\\\\NOORKO-SERVER\\CELEBRIDISENOS';
const vivas = new Map(); // carpeta de red → { ok, t }: si la torre no contesta, no se vuelve a esperar en 2 minutos
async function viva(base) { const v = vivas.get(base); if (v && Date.now() - v.t < 120000) return v.ok; const ok = !!(await conTiempo(desktop.list(base).then(() => true), 4000)); vivas.set(base, { ok, t: Date.now() }); return ok; }
export async function rutaEnLaRed(ruta, carpeta = false) {
  if (!ruta || !desktop.on) return null;
  const m = String(ruta).match(/[\\/]CELEBRIDISENOS(?:[\\/](.*))?$/i); if (!m) return null;
  const rel = (m[1] || '').replace(/\//g, '\\'), L = [];
  const root = desktop.getConfig ? await conTiempo(desktop.getConfig('productRoot'), 3000) : null;
  if (root && /CELEBRIDISENOS[\\/]?$/i.test(root)) L.push(String(root).replace(/[\\/]+$/, ''));
  L.push(TORRE_RED);
  for (const base of [...new Set(L)]) {
    const c = rel ? base + '\\' + rel : base;
    if (c.toLowerCase() === String(ruta).toLowerCase()) continue;
    if (!await viva(base)) continue;
    const ok = carpeta ? await conTiempo(desktop.list(c).then(() => c), 5000) : await conTiempo(rutaQueExiste(c), 5000);
    if (ok) return ok;
  }
  return null;
}
// la pieza EN ESTE PC: su ruta si está aquí, o por la red de casa (portátil); si no, null (y se baja de la nube)
export async function rutaAqui(ruta) { return (await rutaQueExiste(ruta)) || (await rutaEnLaRed(ruta)); }
export async function carpetaAqui(ruta) {
  if (!ruta || !desktop.on) return null;
  if (await conTiempo(desktop.list(ruta).then(() => true), 5000)) return ruta;
  return rutaEnLaRed(ruta, true);
}
export async function rutaQueExiste(ruta) {
  if (!ruta || !desktop.on || !/^[a-z]:[\\/]|^[\\/]{2}|^\//i.test(ruta)) return null;
  try {
    const dir = ruta.replace(/[\\/][^\\/]+$/, ''), nom = ruta.split(/[\\/]/).pop().toLowerCase();
    const r = await desktop.list(dir);
    return (r.entries || []).some(x => x.type === 'file' && String(x.name).toLowerCase() === nom) ? ruta : null;
  } catch (e) { return null; }
}
export const noSePuedeAqui = e => /failed to fetch|networkerror|load failed|no est[áa] instalado|no encuentro (bambu|blender)|que est[ée] en este pc|solo est[áa] en la carpeta del ordenador|error local 40[45]|sin conexi[óo]n con el programa/i.test(String((e && e.message) || e));
const NOMBRE_ACABADO = { prueba: 'Prueba', rapida: 'Rápida', normal: 'Normal', maxima: 'Máxima calidad', premium: 'Premium top', rapido: 'Rápido', fino: 'Fino', fuerte: 'Fuerte' };
const QUE = { acabado: 'prepare el acabado', bambu: 'abra la pieza en Bambu Studio', reforzar: 'refuerce la pieza' };

// ---------- el aparato que lo pide ----------
// p = producto · modo = 'acabado' | 'bambu' | 'reforzar' · extra = { imp, receta } o { modoR: 'decor' }
// 14-11-2026 · Biou: «en mi portátil no abre los productos en Bambu… y tarda en aparecer». El portátil se lo mandaba a la torre SIN
// decirlo: se abría en la torre y en el portátil «no sale nada». Ahora, si un ORDENADOR se lo pasa a la torre, se le dice bien grande
// que se abre en la torre, por qué y qué hacer para abrirlo ahí; y el encargo lleva el motivo y la versión (la torre lo apunta).
export const esOrdenador = () => { const u = navigator.userAgent || ''; if (/Android|iPhone|iPad|Mobile/i.test(u)) return false; if (/Macintosh/.test(u) && navigator.maxTouchPoints > 1) return false; return /Windows NT|Macintosh|X11|Linux x86_64|CrOS/.test(u); };
export const MOTIVO_SIN_PROGRAMA = 'estás en la app de internet, no en el programa CelebriDiseños de este ordenador';
function avisoEnLaTorre(motivo, quien) {
  const sinPrograma = !desktop.on, sinBambu = /bambu/i.test(motivo);
  const hacer = sinPrograma ? 'Para abrirlo en ESTE ordenador: abre el programa CelebriDiseños con su icono del escritorio (no la app de internet) y vuelve a darle.'
    : sinBambu ? 'Para abrirlo en ESTE ordenador: instala Bambu Studio (bambulab.com, gratis) y vuelve a darle.'
    : 'Si quieres que se abra en ESTE ordenador, cierra el programa, ábrelo otra vez y vuelve a darle.';
  modal('🖨️ Se abre en ' + quien + ', no en este ordenador', h('div.pt-aviso',
    h('p', h('b', 'Por qué: '), motivo + '.'),
    h('p', h('b', 'Qué hacer: '), hacer),
    h('p.small.muted', 'Mientras, ' + quien + ' lo abre en su Bambu Studio (tarda unos segundos: va por internet).')),
    close => btn('Entendido', close, { cls: 'primary' }));
}
export async function encargarPieza(p, modo, extra = {}) {
  const L = filesOf('productos', p.id), ref3d = L.filter(a => ES_3D(a.nombre)).sort((a, b) => primero3MF(a.nombre, b.nombre))[0], cualquiera = ref3d || L[0];
  if (!cualquiera && !p.ruta) return toast('Este producto no tiene su archivo 3D en el programa. Súbelo al producto (STL o 3MF) y vuelve a probar.', 'warn', 9000);
  if (!cualquiera) return toast('El archivo 3D de este producto solo está en la carpeta de la torre: hazlo desde la torre, o sube el STL al producto para poder hacerlo desde aquí.', 'warn', 10000);
  const w = await api('pc.servidor', {}, { quiet: true }).catch(() => null);
  const quien = w && w.dispositivo && w.dispositivo !== S.device && (w.puede || []).includes('pieza') ? w.dispositivo : 'la torre'; // (14-11: nunca este mismo aparato)
  // un aviso fijo abajo que va diciendo por dónde va (el encargo tarda lo que tarde la torre)
  const ordenador = esOrdenador(), motivo = String(extra.motivo || (desktop.on ? '' : ordenador ? MOTIVO_SIN_PROGRAMA : 'es una tablet o un móvil (lo hace la torre, como siempre)')).replace(/\.\s*$/, '');
  const t = document.createElement('div'); t.className = 'pt-estado'; t.setAttribute('role', 'status'); t.textContent = '📤 ' + (ordenador && motivo ? 'Aquí no se puede: se lo pido a ' : 'Le pido a ') + quien + ' que ' + QUE[modo] + '…'; document.body.appendChild(t);
  // (14-11: el aviso grande sale cuando el encargo ya ha salido, para que no lo tape el «cargando»; y nunca se nombra a este mismo aparato)
  let avisado = !(ordenador && motivo && modo !== 'reforzar');
  const pinta = txt => { t.textContent = String(txt).split(S.device).join('la torre'); if (!avisado) { avisado = true; avisoEnLaTorre(motivo, quien); } };
  try {
    const r = await encargarAlPC('caras', Object.assign({ modo: 'pieza_' + modo, productoId: p.id, nombre: p.nombre, archivo: refArchivo(cualquiera), archivo3d: refArchivo(ref3d), otroPC: true, desde: S.device, version: APP_VERSION }, extra, { motivo: motivo || '' }), { onStatus: pinta, maxMs: 15 * 60000 });
    t.remove();
    api('pc.recibido', { id: r.__id }, { quiet: true }).catch(() => { });
    const en = r.en || quien;
    if (modo === 'reforzar') toast('🛠️ Reforzada en ' + en + (r.paredMin ? ' (la pared más fina era ' + r.paredMin + ' mm)' : '') + '. El STL reforzado ya está en el producto: «' + (r.nombre || 'reforzado.stl') + '».', 'ok', 12000);
    else toast('✅ Abierta en Bambu Studio de ' + en + (ordenador ? ' (en ' + en + ', no en este ordenador)' : '') + (modo === 'acabado' ? ' con el acabado «' + (NOMBRE_ACABADO[extra.receta] || extra.receta || '') + '» puesto' : '') + '. Ve a la torre para laminar e imprimir.', 'ok', 12000);
    return r;
  } catch (e) {
    t.remove();
    if (e && e.name === 'AbortError') return null;
    toast('No se pudo en ' + quien + ': ' + (e.message || e), 'bad', 12000);
    return null;
  }
}

// ---------- la torre: hace el encargo ----------
// el archivo 3D de la pieza, EN ESTE PC: el subido al producto (si se guardó aquí, su ruta; si no, se baja) o el de su carpeta
// 10-11-2026: también lo usa el 💶 cotizador (laminar el producto con su Bambu)
export const rutaDePieza = p => rutaLocal({}, p, false);
async function rutaLocal(e, p, soloSTL) {
  const ok = n => soloSTL ? extOf(n) === 'stl' : ES_3D(n);
  const subidos = (p ? filesOf('productos', p.id) : []).filter(a => ok(a.nombre)).sort((a, b) => primero3MF(a.nombre, b.nombre));
  const a = (e.archivo3d && ok(e.archivo3d.nombre) && (byId('archivos', e.archivo3d.id) || e.archivo3d)) || subidos[0];
  const aq = a && a.rutaLocal ? await rutaAqui(a.rutaLocal) : null; if (aq) return { ruta: aq, nombre: a.nombre };
  const pr = p && p.ruta ? await carpetaAqui(p.ruta) : null;
  if (pr) { try { const r = await desktop.list(pr); const f = (r.entries || []).filter(x => x.type === 'file' && ok(x.name)).sort((x, y) => primero3MF(x.name, y.name))[0]; if (f) return { ruta: f.path, nombre: f.name }; } catch (x) { } }
  if (a && (a.driveId || a.id)) { const blob = await fetchFile(byId('archivos', a.id) || a); const r = await desktop.bambuAbrir(blob, a.nombre, false); if (r && r.path) return { ruta: r.path, nombre: a.nombre }; }
  throw new Error(soloSTL ? 'Esta pieza no tiene STL (reforzar necesita el STL).' : 'Esta pieza no tiene su archivo 3D ni aquí ni en el programa.');
}
export async function atiendePieza(job, progreso) {
  const e = job.entrada || {}, modo = String(e.modo || '').replace(/^pieza_/, ''), p = e.productoId ? byId('productos', e.productoId) : null;
  desktop.registro('de ' + (e.desde || '¿?') + ' (versión ' + (e.version || 'antigua, sin número') + ') · ' + modo + ' «' + (e.nombre || '') + '»' + (e.imp ? ' · ' + e.imp + ' ' + (e.receta || '') : '') + ' · por qué no lo hizo él: ' + (e.motivo || (e.version ? 'no lo dice' : 'no lo dice (versión antigua)'))); // 14-11
  progreso(5);
  const f = await rutaLocal(e, p, modo === 'reforzar'); progreso(30);
  // 10-11-2026: la A1 y los 5 acabados nuevos (con v: 2, tamaño y fuerza del cotizador)
  if (modo === 'acabado') { const r = await desktop.acabado(f.ruta, ['a1m', 'p1p', 'a1'].includes(e.imp) ? e.imp : 'a1m', e.receta || 'normal', Number(e.v) === 2 ? { v: 2, escala: e.escala, paredes: e.paredes, relleno: e.relleno, pausas: e.pausas, cal: e.cal } : null); progreso(95); return { abierto: true, proyecto: (r && r.archivo) || '', nombre: f.nombre, en: desktop.name }; } // («proyecto», no «archivo»: «archivo» es un archivo del programa)
  if (modo === 'bambu') { const r = await desktop.bambuAbrirRuta(f.ruta, true); progreso(95); if (r && r.abierto === false) throw new Error('En este PC no encuentro Bambu Studio.'); return { abierto: true, nombre: f.nombre, en: desktop.name }; }
  if (modo === 'reforzar') {
    const r = await desktop.repara(f.ruta, e.modoR || 'decor'); progreso(80);
    if (!r || !r.archivo) throw new Error('No salió la pieza reforzada.');
    const nombre = r.archivo.split(/[\\/]/).pop(), bytes = await desktop.file(r.archivo);
    const a = p ? await uploadFile(new File([bytes], nombre, { type: 'model/stl' }), { entidad: 'productos', entidadId: p.id, original: true }) : null; progreso(98);
    const inf = r.informe || {};
    return { nombre, archivo: a ? refArchivo(a) : null, paredMin: inf.pared_min_mm || null, puntos: inf.vertices_debiles || null, en: desktop.name };
  }
  throw new Error('Este PC no sabe hacer ese encargo de pieza (' + modo + ').');
}
// ¿este PC puede hacer encargos de piezas? Solo si su programa contesta y tiene Bambu Studio (la torre). Se mira cada 5 minutos.
let capaz = { t: 0, v: false };
export async function capazPieza() {
  if (!desktop.on) return false;
  if (Date.now() - capaz.t < 300000) return capaz.v;
  let v = false; try { const r = await desktop.bambuPerfiles(); v = !!(r && r.exe); } catch (e) { v = false; }
  capaz = { t: Date.now(), v }; return v;
}
// (lo registra pc_encargos.js dentro del encargo «caras»; aquí, por si se usa solo)
export const esEncargoPieza = job => /^pieza_/.test(String(((job || {}).entrada || {}).modo || ''));
export { registrarTrabajo };
