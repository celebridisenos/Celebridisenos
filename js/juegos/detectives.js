// ================= v13.4 · Descanso 🎮 : «Detectives del taller» (casos infinitos de deducción) =================
// Para los ratos de descanso en el taller. Juego de verdad, SIN relación con los datos del negocio:
//   · no usa el servidor ni toca pedidos, stock ni puntos reales; los récords se guardan solo en este aparato (localStorage)
//   · cada caso se genera con una semilla (mulberry32) y lo VERIFICA un solver por fuerza bruta (120 × 120 mundos posibles)
//   · 5 sospechosos: cada uno estaba en una sala distinta y llevaba un objeto distinto. El culpable es quien cumple las pruebas de la escena.
//   · todas las pistas son verdaderas en el mundo real del caso; el culpable queda determinado de forma única (no hay que adivinar)
import { h, btn } from '../ui.js';

export const meta = { id: 'detectives', titulo: 'Detectives del taller', emoji: '🕵️', desc: 'Casos infinitos: lee las pistas, deduce quién fue.' };

// ---------- Datos del escenario ----------
export const NOMBRES = ['Marta', 'Iván', 'Lucía', 'Pablo', 'Noa', 'Sergio', 'Elena', 'Hugo', 'Carmen', 'Álvaro', 'Inés', 'Daniel', 'Paula', 'Mateo'];
// El orden de las salas es el del pasillo del taller (la entrada está junto a Impresión): dos salas son «contiguas» si son vecinas en esta lista
export const SALAS = [
  { id: 'impresion', nombre: 'Impresión', emoji: '🖨️', rastro: 'En Impresión quedaron restos de filamento todavía tibios.' },
  { id: 'embalaje', nombre: 'Embalaje', emoji: '📦', rastro: 'En Embalaje apareció cinta de embalar recién cortada.' },
  { id: 'almacen', nombre: 'Almacén', emoji: '🗄️', rastro: 'En Almacén el polvo de las estanterías está recién removido.' },
  { id: 'oficina', nombre: 'Oficina', emoji: '🗂️', rastro: 'En Oficina quedó una huella en el teclado.' },
  { id: 'postproceso', nombre: 'Postproceso', emoji: '🧽', rastro: 'En Postproceso hay virutas de lijado muy frescas.' }
];
export const OBJETOS = [
  { id: 'espatula', nombre: 'espátula', art: 'la espátula', emoji: '🔧', rastro: 'Hay marcas de espátula en el borde de la mesa.' },
  { id: 'cafe', nombre: 'café', art: 'el café', emoji: '☕', rastro: 'Quedó un cerco de café aún caliente junto a la caja.' },
  { id: 'cinta', nombre: 'cinta métrica', art: 'la cinta métrica', emoji: '📏', rastro: 'Alguien midió la caja: quedó la marca de una cinta métrica.' },
  { id: 'guantes', nombre: 'guantes', art: 'los guantes', emoji: '🧤', rastro: 'Se encontró la huella de un guante de nitrilo junto a la caja.' },
  { id: 'tablet', nombre: 'tablet', art: 'la tablet', emoji: '📱', rastro: 'En el polvo quedó el rectángulo de una tablet apoyada.' }
];
const N = 5;

// Plantillas de historia (≥6): intro, qué se busca y relato final (c = nombre del culpable)
export const PLANTILLAS = [
  { id: 'bobina', emoji: '🥇', titulo: 'La bobina de oro', intro: 'Esta mañana ha desaparecido la bobina de filamento dorado, la reservada para el pedido más importante del mes. Nadie ha visto nada, aunque alguien huele a PLA recién derretido.',
    final: c => `${c} confesó entre risas: quería estrenar el filamento dorado en una figura sorpresa para el cumpleaños de la jefa. La bobina apareció intacta y brillante dentro de una caja de zapatos, con un lacito.` },
  { id: 'boquilla', emoji: '🔩', titulo: 'La impresora sin boquilla', intro: 'Al abrir el taller, la impresora grande estaba a media pieza… y sin boquilla. Un enredo de plástico lo cubría todo, como un nido de araña de colores.',
    final: c => `${c} se llevó la boquilla para limpiarla con una aguja finísima y se olvidó de volver a montarla. Prometió pegar un cartel de «¡Boquilla en revisión!» y dormir una hora más.` },
  { id: 'pedido', emoji: '📮', titulo: 'El pedido que no llegó a la tienda', intro: 'Los doce llaveros del pedido de la tienda online estaban listos ayer por la tarde. Hoy la caja ya no está en el mostrador y el cliente pregunta cada diez minutos.',
    final: c => `${c} se los había llevado para hacerles una foto bonita para la web y se le pasó dejarlos en su sitio. Aparecieron en un escritorio, con un lazo y la etiqueta del envío perfectamente puesta.` },
  { id: 'cafe', emoji: '☕', titulo: 'El teclado del café', intro: 'Hay un charco de café sobre el teclado del ordenador de diseño, y el archivo del lote del viernes estaba sin guardar. Huele a canela y a pánico.',
    final: c => `${c} intentó secar el teclado con papel, con un trapo y, por último, con un secador de pelo. El archivo se recuperó, el teclado se jubiló con honores y hubo tarta para todos.` },
  { id: 'mezcla', emoji: '🧩', titulo: 'Las piezas mezcladas', intro: 'Las piezas de tres pedidos distintos aparecieron mezcladas en la misma bandeja: tapas con cajas que no son suyas, patas sin mesa… y nadie sabe quién las barajó.',
    final: c => `${c} quiso «ordenarlas por colores» para que quedaran bonitas. Tardó dos horas en volver a separarlas y acabó proponiendo etiquetar todas las bandejas. Idea aprobada.` },
  { id: 'puerta', emoji: '🚪', titulo: 'La puerta abierta', intro: 'Alguien dejó abierta la puerta de la cámara de la impresora y una corriente de aire despegó de la cama una pieza de catorce horas. El taller entero guarda un minuto de silencio.',
    final: c => `${c} solo quería ver cómo iba la pieza «un segundito» y la puerta se quedó abierta. Desde entonces el taller tiene una ventanita para mirar, con un cartel que dice: «No abras, mira».` },
  { id: 'tarta', emoji: '🎂', titulo: 'La tarta desaparecida', intro: 'La tarta de cumpleaños que había en la nevera del taller ha desaparecido a falta de la vela. Solo queda una miga con aspecto de prueba de laboratorio.',
    final: c => `${c} confesó que «solo iba a probar un trocito para comprobar que no estaba envenenada». El trocito fue la tarta entera. Pagó una nueva con intereses: dos trozos para quien lo descubrió.` },
  { id: 'purpurina', emoji: '✨', titulo: 'La mesa de purpurina', intro: 'La mesa de postproceso amaneció cubierta de purpurina dorada y hay destellos hasta en el café. Nadie recuerda haber pedido nada brillante.',
    final: c => `${c} probaba un acabado «efecto lujo» para un pedido y el bote se le fue de las manos. El pedido quedó precioso; el taller aún brilla cuando le da el sol.` },
  { id: 'cinta', emoji: '📼', titulo: 'El rollo de cinta infinito', intro: 'Se ha acabado el rollo de cinta de embalar, ese que dura meses, y nadie sabe en qué se lo ha gastado. Hay una momia con forma de caja al fondo de la sala.',
    final: c => `${c} empaquetó un pedido «con muchísimo cariño» y luego lo volvió a empaquetar por si acaso. El pedido llegó a su destino, eso sí, indestructible.` }
];

// ---------- Lógica pura (se prueba sin pantalla) ----------
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const mix = (a, b, c) => (Math.imul((a >>> 0) || 1, 2654435761) ^ Math.imul(b + 1, 40503) ^ Math.imul(c + 1, 9973)) >>> 0;
const rint = (rnd, n) => Math.floor(rnd() * n);
const mezcla = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = rint(rnd, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const inversa = p => { const o = Array(N); p.forEach((v, i) => { o[v] = i; }); return o; };

// Los 120 órdenes posibles de 5 elementos
const PERMS = (() => { const out = []; (function rec(a, rest) { if (!rest.length) { out.push(a); return; } rest.forEach((v, i) => rec(a.concat(v), rest.filter((_, j) => j !== i))); })([], [0, 1, 2, 3, 4]); return out; })();
const INV = PERMS.map(inversa);
// Mundo = { sala[persona] → sala, objeto[persona] → objeto, enSala[sala] → persona, conObjeto[objeto] → persona }.  120 × 120 = 14.400 mundos
let _mundos = null;
export function mundos() {
  if (_mundos) return _mundos; _mundos = [];
  for (let i = 0; i < PERMS.length; i++) for (let j = 0; j < PERMS.length; j++) _mundos.push({ sala: PERMS[i], objeto: PERMS[j], enSala: INV[i], conObjeto: INV[j] });
  return _mundos;
}
const completo = m => (m.enSala && m.conObjeto) ? m : { sala: m.sala, objeto: m.objeto, enSala: inversa(m.sala), conObjeto: inversa(m.objeto) };

// Referencias: { k: 'p', v: persona } · { k: 'o', v: objeto } («quien llevaba…») · { k: 's', v: sala } («quien estaba en…»)
const quien = (r, m) => r.k === 'p' ? r.v : r.k === 'o' ? m.conObjeto[r.v] : m.enSala[r.v];
// Pistas: en, noen, lleva, nolleva, cont, nocont, antes, oen, olleva, xor, si.  (cont/nocont necesitan dos personas distintas)
export function esVerdad(p, mundo) {
  const m = completo(mundo);
  switch (p.t) {
    case 'en': return m.sala[quien(p.r, m)] === p.sala;
    case 'noen': return m.sala[quien(p.r, m)] !== p.sala;
    case 'lleva': return m.objeto[quien(p.r, m)] === p.objeto;
    case 'nolleva': return m.objeto[quien(p.r, m)] !== p.objeto;
    case 'cont': { const a = quien(p.a, m), b = quien(p.b, m); return a !== b && Math.abs(m.sala[a] - m.sala[b]) === 1; }
    case 'nocont': { const a = quien(p.a, m), b = quien(p.b, m); return a !== b && Math.abs(m.sala[a] - m.sala[b]) !== 1; }
    case 'antes': return m.sala[quien(p.a, m)] < m.sala[quien(p.b, m)];
    case 'oen': return p.salas.includes(m.sala[quien(p.r, m)]);
    case 'olleva': return p.objetos.includes(m.objeto[quien(p.r, m)]);
    case 'xor': return esVerdad(p.x, m) !== esVerdad(p.y, m);
    case 'si': return !esVerdad(p.x, m) || esVerdad(p.y, m);
  }
  throw new Error('pista desconocida: ' + p.t);
}
// Las pruebas de la escena son condiciones sobre el culpable: { sala } y/o { objeto }. Devuelve la persona que las cumple todas en ese mundo, o -1
export function culpableDe(mundo, pruebas) {
  const m = completo(mundo); let c = -1;
  for (const pr of pruebas) {
    if (pr.sala !== undefined) { const q = m.enSala[pr.sala]; if (c >= 0 && c !== q) return -1; c = q; }
    if (pr.objeto !== undefined) { const q = m.conObjeto[pr.objeto]; if (c >= 0 && c !== q) return -1; c = q; }
  }
  return c;
}
// Solver por fuerza bruta: recorre los 14.400 mundos, se queda con los que cumplen TODAS las pistas y las pruebas, y devuelve los culpables posibles (índices)
export function resolver(caso) {
  const out = new Set();
  for (const m of mundos()) {
    const c = culpableDe(m, caso.pruebas); if (c < 0) continue;
    if (caso.pistas.every(p => esVerdad(p, m))) out.add(c);
  }
  return [...out].sort((a, b) => a - b);
}
// Nº de mundos que siguen siendo posibles con estas pistas (para pruebas y estadísticas)
export function mundosPosibles(caso) { let n = 0; for (const m of mundos()) if (culpableDe(m, caso.pruebas) >= 0 && caso.pistas.every(p => esVerdad(p, m))) n++; return n; }

// Dificultad 1-5: nº de pistas y tipos más retorcidos
export const NIVELES = [
  { min: 3, max: 5, q: 0.3, pruebas: 1, tipos: ['en', 'en', 'lleva', 'lleva', 'noen'] },
  { min: 4, max: 6, q: 0.5, pruebas: 2, tipos: ['en', 'lleva', 'noen', 'nolleva', 'lleva', 'en'] },
  { min: 5, max: 8, q: 0.7, pruebas: 2, tipos: ['en', 'lleva', 'noen', 'nolleva', 'cont', 'nocont'] },
  { min: 6, max: 9, q: 0.9, pruebas: 2, tipos: ['en', 'lleva', 'noen', 'nolleva', 'cont', 'nocont', 'antes', 'oen', 'olleva'] },
  { min: 7, max: 10, q: 1, pruebas: 2, tipos: ['noen', 'nolleva', 'cont', 'nocont', 'antes', 'oen', 'olleva', 'xor', 'si', 'en', 'lleva'] }
];
const refP = rnd => ({ k: 'p', v: rint(rnd, N) });
function atomo(rnd, nivel) {
  return rnd() < 0.5 ? { t: rnd() < 0.5 ? 'en' : 'noen', r: refP(rnd), sala: rint(rnd, N) } : { t: rnd() < 0.5 ? 'lleva' : 'nolleva', r: refP(rnd), objeto: rint(rnd, N) };
}
function crear(tipo, rnd, nivel) {
  const kind = () => ['p', 'o', 's'][rint(rnd, 3)];
  const ref = () => { const k = kind(); return { k, v: rint(rnd, N) }; };
  switch (tipo) {
    case 'en': case 'noen': return { t: tipo, r: (nivel >= 2 && rnd() < 0.35) ? { k: 'o', v: rint(rnd, N) } : refP(rnd), sala: rint(rnd, N) };
    case 'lleva': case 'nolleva': return { t: tipo, r: rnd() < 0.35 ? { k: 's', v: rint(rnd, N) } : refP(rnd), objeto: rint(rnd, N) };
    case 'cont': case 'nocont': case 'antes': { const a = rnd() < 0.6 ? refP(rnd) : ref(), b = ref(); return { t: tipo, a, b }; }
    case 'oen': { const s1 = rint(rnd, N); let s2 = rint(rnd, N); while (s2 === s1) s2 = rint(rnd, N); return { t: 'oen', r: rnd() < 0.7 ? refP(rnd) : { k: 'o', v: rint(rnd, N) }, salas: [s1, s2] }; }
    case 'olleva': { const o1 = rint(rnd, N); let o2 = rint(rnd, N); while (o2 === o1) o2 = rint(rnd, N); return { t: 'olleva', r: rnd() < 0.7 ? refP(rnd) : { k: 's', v: rint(rnd, N) }, objetos: [o1, o2] }; }
    case 'xor': case 'si': return { t: tipo, x: atomo(rnd, nivel), y: atomo(rnd, nivel) };
  }
  return null;
}
// ¿Dos referencias distintas por construcción? (evita pistas absurdas como «Marta y Marta»)
const sentido = p => {
  if (p.t === 'cont' || p.t === 'nocont' || p.t === 'antes') return !(p.a.k === p.b.k && p.a.v === p.b.v);
  if (p.t === 'xor' || p.t === 'si') return JSON.stringify(p.x) !== JSON.stringify(p.y);
  return true;
};
const clave = p => JSON.stringify(p);
function candidata(rnd, tipos, mundo, nivel) {
  for (let t = 0; t < 120; t++) { const c = crear(tipos[rint(rnd, tipos.length)], rnd, nivel); if (c && sentido(c) && esVerdad(c, mundo)) return c; }
  return null;
}
function culpablesDe(idx, pruebas) { const M = mundos(); let mask = 0; for (const i of idx) mask |= 1 << culpableDe(M[i], pruebas); let n = 0; for (let b = mask; b; b &= b - 1) n++; return n; }

// generarCaso(semilla, nivel) → { semilla, nivel, plantilla, sospechosos, salas, objetos, pistas, pruebas, culpable, mundo }
export function generarCaso(semilla, nivel = 1) {
  nivel = Math.min(5, Math.max(1, Math.round(Number(nivel)) || 1)); semilla = Number(semilla) >>> 0;
  const cfg = NIVELES[nivel - 1], M = mundos(); let ultimo = null;
  for (let intento = 0; intento < 30; intento++) {
    const rnd = mulberry32(mix(semilla, nivel, intento));
    const sospechosos = mezcla(NOMBRES.slice(), rnd).slice(0, N), plantilla = rint(rnd, PLANTILLAS.length);
    const mundo = M[rint(rnd, M.length)], culpable = rint(rnd, N);
    const pruebas = cfg.pruebas === 1 ? [{ sala: mundo.sala[culpable] }] : [{ sala: mundo.sala[culpable] }, { objeto: mundo.objeto[culpable] }];
    const base = []; for (let i = 0; i < M.length; i++) if (culpableDe(M[i], pruebas) >= 0) base.push(i);
    let vivos = base, pistas = [], vistas = new Set();
    while (culpablesDe(vivos, pruebas) > 1 && pistas.length < cfg.max) {
      let cands = [];
      for (let k = 0; k < 14; k++) {
        const c = candidata(rnd, cfg.tipos, mundo, nivel); if (!c || vistas.has(clave(c))) continue;
        const f = vivos.filter(i => esVerdad(c, M[i])); if (f.length === vivos.length || !f.length) continue;
        cands.push({ c, f, nc: culpablesDe(f, pruebas) });
      }
      if (!cands.length) break;
      if (pistas.length + 1 < cfg.min) { const aun = cands.filter(x => x.nc > 1); if (aun.length) cands = aun; }
      cands.sort((a, b) => a.nc - b.nc || a.f.length - b.f.length);
      const q = (cfg.max - pistas.length <= 2) ? 0.1 : cfg.q;
      const pick = cands[Math.min(cands.length - 1, Math.floor(rnd() * cands.length * q))];
      pistas.push(pick.c); vistas.add(clave(pick.c)); vivos = pick.f;
    }
    if (culpablesDe(vivos, pruebas) > 1) { const c = { t: 'en', r: { k: 'p', v: culpable }, sala: mundo.sala[culpable] }; if (!vistas.has(clave(c))) { pistas.push(c); } }
    // quita las pistas que sobran (sin bajar del mínimo del nivel)
    const unico = lista => { let v = base; for (const p of lista) v = v.filter(i => esVerdad(p, M[i])); return culpablesDe(v, pruebas) === 1; };
    for (const p of mezcla(pistas.slice(), rnd)) { if (pistas.length <= cfg.min) break; const sin = pistas.filter(x => x !== p); if (unico(sin)) pistas = sin; }
    mezcla(pistas, rnd);
    pistas.forEach(p => { p.i = rint(rnd, 5); });
    const caso = { semilla, nivel, plantilla, sospechosos, salas: SALAS.map(s => s.nombre), objetos: OBJETOS.map(o => o.nombre), pistas, pruebas, culpable, mundo: { sala: mundo.sala.slice(), objeto: mundo.objeto.slice(), enSala: mundo.enSala.slice(), conObjeto: mundo.conObjeto.slice() } };
    const r = resolver(caso);
    if (r.length === 1 && r[0] === culpable && pistas.every(p => esVerdad(p, caso.mundo))) { ultimo = caso; if (pistas.length >= cfg.min) return caso; }
  }
  if (!ultimo) throw new Error('No se pudo generar el caso (semilla ' + semilla + ', nivel ' + nivel + ')');
  return ultimo;
}

// ---------- Textos ----------
const nomS = i => SALAS[i].nombre, artO = i => OBJETOS[i].art;
function refTxt(r, caso, ini) {
  if (r.k === 'p') return caso.sospechosos[r.v];
  const q = ini ? 'Quien' : 'quien';
  return r.k === 'o' ? q + ' llevaba ' + artO(r.v) : q + ' estaba en ' + nomS(r.v);
}
const minus1 = s => s.replace(/^Quien /, 'quien ');
export function textoPista(p, caso, ini = true) {
  const R = (r, i = true) => refTxt(r, caso, i && ini);
  switch (p.t) {
    case 'en': return `${R(p.r)} estaba en ${nomS(p.sala)}.`;
    case 'noen': return `${R(p.r)} no estaba en ${nomS(p.sala)}.`;
    case 'lleva': return `${R(p.r)} llevaba ${artO(p.objeto)}.`;
    case 'nolleva': return `${R(p.r)} no llevaba ${artO(p.objeto)}.`;
    case 'cont': return `${R(p.a)} y ${refTxt(p.b, caso, false)} estaban en salas contiguas.`;
    case 'nocont': return `${R(p.a)} y ${refTxt(p.b, caso, false)} no estaban en salas contiguas.`;
    case 'antes': return `${R(p.a)} estaba en una sala más cercana a la entrada que ${refTxt(p.b, caso, false)}.`;
    case 'oen': return `${R(p.r)} estaba en ${nomS(p.salas[0])} o en ${nomS(p.salas[1])}.`;
    case 'olleva': return `${R(p.r)} llevaba ${artO(p.objetos[0])} o ${artO(p.objetos[1])}.`;
    case 'xor': return `Solo una de estas dos cosas es cierta: (a) ${textoPista(p.x, caso).replace(/\.$/, '')}; (b) ${minus1(textoPista(p.y, caso)).replace(/\.$/, '')}.`;
    case 'si': return `Si ${minus1(textoPista(p.x, caso)).replace(/\.$/, '')}, entonces ${minus1(textoPista(p.y, caso)).replace(/\.$/, '')}.`;
  }
  return '';
}
export function textoPruebas(caso) {
  const l = [];
  for (const pr of caso.pruebas) {
    if (pr.sala !== undefined) l.push({ e: SALAS[pr.sala].emoji, t: SALAS[pr.sala].rastro, d: 'Quien lo hizo estaba en ' + nomS(pr.sala) + '.' });
    if (pr.objeto !== undefined) l.push({ e: OBJETOS[pr.objeto].emoji, t: OBJETOS[pr.objeto].rastro, d: 'Quien lo hizo llevaba ' + artO(pr.objeto) + '.' });
  }
  return l;
}
export function puntuacion(nivel, fallos) { return Math.max(nivel * 20, nivel * 100 - fallos * nivel * 30); }
export function relato(caso) { return PLANTILLAS[caso.plantilla].final(caso.sospechosos[caso.culpable]); }

// ---------- Guardado local (solo en este aparato) ----------
const LS = 'cd.descanso.detectives';
const num = v => Math.max(0, Math.floor(Number(v)) || 0);
const lee = () => { try { const o = JSON.parse(localStorage.getItem(LS) || '{}') || {}; return { puntos: num(o.puntos), resueltos: num(o.resueltos), mejorCaso: num(o.mejorCaso), nivel: Math.min(5, Math.max(1, num(o.nivel) || 1)), sinFallos: num(o.sinFallos) }; } catch (e) { return { puntos: 0, resueltos: 0, mejorCaso: 0, nivel: 1, sinFallos: 0 }; } };
const guarda = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { } };
const semillaNueva = () => (Math.floor(Math.random() * 4294967296)) >>> 0;
const COLORES = ['#c2418c', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];
const FUENTES = ['📹', '🗣️', '📝', '🔖', '👀'];

export function render(el, ctx) {
  let rec = lee(), nivel = rec.nivel, caso, fallos = 0, acusados = new Set(), resuelto = false, nota, tachadas = new Set(), semilla = semillaNueva();
  const sNivel = h('b'), sRes = h('b'), sPts = h('b'), sFall = h('b');
  const cabecera = h('div.det-top',
    h('div.det-stat', h('span', 'Dificultad'), sNivel), h('div.det-stat', h('span', 'Resueltos'), sRes), h('div.det-stat', h('span', 'Puntos'), sPts), h('div.det-stat', h('span', 'Fallos'), sFall));
  const niveles = h('div.det-niveles', { role: 'group', 'aria-label': 'Dificultad' });
  const bNuevo = btn('Nuevo caso', () => nuevo(), { cls: 'primary', icon: 'plus', title: 'Un caso nuevo de la misma dificultad' });
  const bSig = btn('Siguiente dificultad', () => { if (nivel < 5) { nivel++; nuevo(); } }, { title: 'Casos más retorcidos' });
  const acciones = h('div.det-actions', bNuevo, bSig);
  const caja = h('div.det-caso'), pistasEl = h('ol.det-pistas'), libreta = h('div.det-libreta'), sosp = h('div.det-sosp'), msg = h('div.det-msg', { 'aria-live': 'polite' }), final = h('div.det-final');
  const root = h('div.det', cabecera, niveles, acciones, caja,
    h('h3.det-h', '🔎 Pistas'), h('p.muted.tiny.det-nota', 'Todas las pistas son verdaderas. Toca una pista para tacharla cuando ya la hayas usado.'), pistasEl,
    h('h3.det-h', '📒 Libreta'), h('p.muted.tiny.det-nota', 'Toca una casilla para cambiar: · (no sé) → ✘ (no) → ✔ (sí).'), libreta,
    h('h3.det-h', '👥 Sospechosos'), sosp, msg, final);
  el.append(root);

  const estrellas = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  function stats() { sNivel.textContent = estrellas(nivel); sNivel.title = 'Dificultad ' + nivel + ' de 5'; sRes.textContent = String(rec.resueltos); sPts.textContent = String(rec.puntos); sFall.textContent = String(fallos); bSig.disabled = nivel >= 5; bSig.title = nivel >= 5 ? 'Ya estás en la dificultad máxima' : 'Casos más retorcidos'; }
  function pintaNiveles() {
    niveles.replaceChildren(...[1, 2, 3, 4, 5].map(n => h('button.det-niv' + (n === nivel ? '.on' : ''), { type: 'button', 'data-n': String(n), 'aria-pressed': n === nivel ? 'true' : 'false', title: 'Dificultad ' + n, onclick: () => { if (n !== nivel) { nivel = n; nuevo(); } } }, String(n))));
  }
  function pintaCaso() {
    const pl = PLANTILLAS[caso.plantilla];
    caja.replaceChildren(
      h('div.det-titulo', h('span.det-emo', pl.emoji), h('b', 'Caso: ' + pl.titulo)),
      h('p.det-intro', pl.intro),
      h('div.det-pruebas', h('b', 'Pruebas de la escena'), ...textoPruebas(caso).map(x => h('div.det-prueba', h('span', x.e), h('span', x.t + ' '), h('b', '→ ' + x.d)))),
      h('div.det-plano', h('span.muted.tiny', 'Plano del pasillo (salas contiguas = vecinas):'),
        h('div.det-salas', h('span.det-puerta', '🚪'), ...SALAS.map((s, i) => [i ? h('span.det-flecha', '›') : null, h('span.det-sala', s.emoji + ' ' + s.nombre)]).flat().filter(Boolean))));
  }
  function pintaPistas() {
    pistasEl.replaceChildren(...caso.pistas.map((p, i) => h('li', h('button.det-pista' + (tachadas.has(i) ? '.hecha' : ''), { type: 'button', 'aria-pressed': tachadas.has(i) ? 'true' : 'false', title: 'Toca para tachar o destachar', onclick: ev => { if (tachadas.has(i)) tachadas.delete(i); else tachadas.add(i); ev.currentTarget.classList.toggle('hecha'); ev.currentTarget.setAttribute('aria-pressed', tachadas.has(i) ? 'true' : 'false'); } },
      h('span.det-n', String(i + 1)), h('span.det-ico', FUENTES[p.i || 0]), h('span.det-txt', textoPista(p, caso))))));
  }
  const SIMB = ['·', '✘', '✔'], ESTADO = ['sin marcar', 'descartado', 'confirmado'];
  function pintaLibreta() {
    const tabla = (clave, titulo, cols) => h('div.det-tabw', h('div.det-tabt', titulo), h('table.det-tab', h('thead', h('tr', h('th'), ...cols.map(c => h('th', h('span.det-th-e', c.emoji), h('span.det-th-n', c.corto || c.nombre))))),
      h('tbody', caso.sospechosos.map((nom, s) => h('tr', h('th', { scope: 'row' }, nom), ...cols.map((c, j) => {
        const b = h('button.det-cell.e' + nota[clave][s][j], { type: 'button', 'data-k': clave, 'data-s': String(s), 'data-c': String(j), 'aria-label': nom + ', ' + c.nombre + ': ' + ESTADO[nota[clave][s][j]] }, SIMB[nota[clave][s][j]]);
        b.addEventListener('click', () => {
          const v = (nota[clave][s][j] + 1) % 3; nota[clave][s][j] = v; b.className = 'det-cell e' + v; b.textContent = SIMB[v]; b.setAttribute('aria-label', nom + ', ' + c.nombre + ': ' + ESTADO[v]);
        });
        return h('td', b);
      }))))));
    libreta.replaceChildren(tabla('sala', 'Sospechoso × sala', SALAS.map(x => ({ emoji: x.emoji, nombre: x.nombre, corto: x.id === 'postproceso' ? 'Postproc.' : x.nombre }))), tabla('objeto', 'Sospechoso × objeto', OBJETOS.map(o => ({ emoji: o.emoji, nombre: o.nombre }))),
      btn('Borrar libreta', () => { nota = vacia(); pintaLibreta(); }, { cls: 'ghost', title: 'Quita todas las marcas' }));
  }
  const vacia = () => ({ sala: Array.from({ length: N }, () => Array(N).fill(0)), objeto: Array.from({ length: N }, () => Array(N).fill(0)) });
  function pintaSosp() {
    sosp.replaceChildren(...caso.sospechosos.map((nom, i) => {
      const des = acusados.has(i), esC = resuelto && i === caso.culpable;
      return h('div.det-s' + (des ? '.des' : '') + (esC ? '.culpable' : ''), { 'data-s': String(i) },
        h('span.det-av', { style: { background: COLORES[(caso.semilla + i) % COLORES.length] } }, nom[0]), h('b', nom),
        btn(esC ? 'Culpable' : des ? 'No fue' : 'Acusar', () => acusar(i), { cls: 'sm' + (des || resuelto ? '' : ' primary'), disabled: des || resuelto, title: 'Acusar a ' + nom }));
    }));
  }
  function acusar(i) {
    if (resuelto || acusados.has(i)) return;
    if (i !== caso.culpable) {
      fallos++; acusados.add(i); msg.className = 'det-msg bad'; msg.textContent = 'No es esa persona… ' + caso.sospechosos[i] + ' tiene coartada. Sigue investigando (fallos: ' + fallos + ').';
      pintaSosp(); stats(); return;
    }
    resuelto = true; const pts = puntuacion(nivel, fallos);
    rec = { puntos: rec.puntos + pts, resueltos: rec.resueltos + 1, mejorCaso: Math.max(rec.mejorCaso, pts), nivel, sinFallos: rec.sinFallos + (fallos === 0 ? 1 : 0) }; guarda(rec);
    msg.className = 'det-msg ok'; msg.textContent = '¡Exacto! Fue ' + caso.sospechosos[i] + '.';
    pintaSosp(); stats(); pintaFinal(pts);
  }
  function pintaFinal(pts) {
    const m = caso.mundo;
    final.className = 'det-final on';
    final.replaceChildren(h('b.det-final-t', '🎉 ¡Caso resuelto!'),
      h('p.det-pts', '+' + pts + ' puntos · ' + (fallos === 0 ? 'a la primera' : fallos + (fallos === 1 ? ' fallo' : ' fallos')) + ' · dificultad ' + nivel),
      h('p.det-relato', relato(caso)),
      h('div.det-asifue', h('b', 'Así fue cada uno:'), ...caso.sospechosos.map((nom, i) => h('div.det-fila' + (i === caso.culpable ? '.culpable' : ''), h('span', (i === caso.culpable ? '🕵️ ' : '') + nom), h('span', SALAS[m.sala[i]].emoji + ' ' + SALAS[m.sala[i]].nombre), h('span', OBJETOS[m.objeto[i]].emoji + ' ' + OBJETOS[m.objeto[i]].nombre)))),
      h('div.det-actions', btn('Nuevo caso', () => nuevo(), { cls: 'primary', icon: 'plus' }), nivel < 5 ? btn('Siguiente dificultad', () => { nivel++; nuevo(); }) : null));
    final.scrollIntoView && final.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function nuevo() {
    semilla = semillaNueva(); caso = generarCaso(semilla, nivel); fallos = 0; acusados = new Set(); resuelto = false; nota = vacia(); tachadas = new Set();
    msg.className = 'det-msg'; msg.textContent = ''; final.className = 'det-final'; final.replaceChildren();
    if (nivel !== rec.nivel) { rec = Object.assign({}, rec, { nivel }); guarda(rec); }
    pintaNiveles(); pintaCaso(); pintaPistas(); pintaLibreta(); pintaSosp(); stats();
  }
  nuevo();
  window.__detectives = {
    caso: () => JSON.parse(JSON.stringify(caso)), solucion: () => ({ culpable: caso.culpable, nombre: caso.sospechosos[caso.culpable], sala: caso.mundo.sala.slice(), objeto: caso.mundo.objeto.slice() }),
    nivel: () => nivel, semilla: () => semilla, intentos: () => fallos, resuelto: () => resuelto, record: () => Object.assign({}, rec), textos: () => caso.pistas.map(p => textoPista(p, caso))
  };
  return { destroy() { delete window.__detectives; } };
}
