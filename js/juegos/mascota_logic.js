// ================= Descanso 🎮 · «Bobi, tu mascota» · LÓGICA PURA =================
// Sin DOM, sin red, sin relojes ocultos: todo recibe el estado y devuelve un estado NUEVO (no muta lo que le pasas),
// salvo las funciones de los minijuegos de la gota, que mutan su propio estado por rendimiento (se indica).
// Solo para pasar el rato: nada de esto toca pedidos, stock, clientes ni puntos reales del negocio.
//
// Convención: las necesidades van de 0 a 100 y 100 = ESTÁ BIEN (hambre 100 = barriga llena, higiene 100 = limpísimo…).
// El tiempo pasa con avanzar(estado, ms): determinista (sin azar), con suelos para que Bobi NUNCA muera ni quede destrozado.

export const VERSION = 1;
export const KEY = 'cd.descanso.mascota.v1';
const MIN = 60000, H = 3600000, DIA = 86400000;

export const NEC = ['hambre', 'energia', 'diversion', 'higiene', 'salud', 'afecto'];
export const NEC_INFO = {
  hambre: { emoji: '🍽️', nombre: 'Comida', aria: 'Comida (barriga llena)' },
  energia: { emoji: '⚡', nombre: 'Energía', aria: 'Energía' },
  diversion: { emoji: '🎈', nombre: 'Diversión', aria: 'Diversión' },
  higiene: { emoji: '🧼', nombre: 'Higiene', aria: 'Higiene' },
  salud: { emoji: '❤️', nombre: 'Salud', aria: 'Salud' },
  afecto: { emoji: '🤗', nombre: 'Cariño', aria: 'Cariño' }
};
// Por debajo de estos valores NO se baja solo con el paso del tiempo (se puede quedar triste y débil, pero se recupera con cuidados)
export const SUELO = { hambre: 8, energia: 12, diversion: 10, higiene: 12, salud: 22, afecto: 12 };
// Bajada por hora de un Bobi despierto (se multiplica por su personalidad)
const BAJA_H = { hambre: 6.5, energia: 4.5, diversion: 5, higiene: 3, afecto: 3 };
// Mientras duerme todo baja mucho más despacio
const SUENO_X = { hambre: 0.5, diversion: 0.3, higiene: 0.3, afecto: 0.5 };

export const COLORES = {
  violeta: { nombre: 'Violeta', base: '#8b5cf6', luz: '#c4b5fd', sombra: '#5b21b6' },
  rosa: { nombre: 'Rosa', base: '#ec4899', luz: '#f9a8d4', sombra: '#9d174d' },
  azul: { nombre: 'Azul', base: '#3b82f6', luz: '#93c5fd', sombra: '#1d4ed8' },
  verde: { nombre: 'Verde', base: '#22c55e', luz: '#86efac', sombra: '#15803d' },
  naranja: { nombre: 'Naranja', base: '#f97316', luz: '#fdba74', sombra: '#c2410c' },
  rojo: { nombre: 'Rojo', base: '#ef4444', luz: '#fca5a5', sombra: '#991b1b' },
  amarillo: { nombre: 'Amarillo', base: '#eab308', luz: '#fde047', sombra: '#a16207' },
  grafito: { nombre: 'Grafito', base: '#64748b', luz: '#cbd5e1', sombra: '#1e293b' }
};
export const COLOR_IDS = Object.keys(COLORES);

export const PERS = {
  jugueton: { nombre: 'Juguetón', emoji: '🤸', fav: 'helado', susto: 1, sueno: 1, desc: 'Se aburre enseguida: necesita jugar a menudo.', mult: { hambre: 1, energia: 1.1, diversion: 1.7, higiene: 1.1, afecto: 1.1 } },
  gloton: { nombre: 'Glotón', emoji: '🍕', fav: 'pizza', susto: 1, sueno: 1, desc: 'Siempre tiene hambre; la pizza es su perdición.', mult: { hambre: 1.7, energia: 0.9, diversion: 0.9, higiene: 1, afecto: 0.9 } },
  dormilon: { nombre: 'Dormilón', emoji: '😴', fav: 'sopa', susto: 1, sueno: 1.3, desc: 'Se cansa pronto, pero duerme como un tronco.', mult: { hambre: 0.85, energia: 1.5, diversion: 0.9, higiene: 0.9, afecto: 0.9 } },
  timido: { nombre: 'Tímido', emoji: '🫣', fav: 'pastel', susto: 1.8, sueno: 1, desc: 'Se asusta con facilidad y necesita mucho cariño.', mult: { hambre: 1, energia: 1, diversion: 1, higiene: 1, afecto: 1.6 } },
  remilgado: { nombre: 'Remilgado', emoji: '🧼', fav: 'manzana', susto: 1, sueno: 1, desc: 'Odia estar sucio: se ensucia en un suspiro.', mult: { hambre: 0.95, energia: 1, diversion: 1, higiene: 1.8, afecto: 1 } },
  carinoso: { nombre: 'Cariñoso', emoji: '🥰', fav: 'verdura', susto: 1.2, sueno: 1, desc: 'Vive de los mimos. Raro: adora la verdura.', mult: { hambre: 1, energia: 1, diversion: 1.1, higiene: 1, afecto: 1.8 } }
};
export const PERS_IDS = Object.keys(PERS);

export const COMIDAS = {
  manzana: { nombre: 'Manzana', emoji: '🍎', precio: 0, hambre: 15, salud: 1, diversion: 0, energia: 0, higiene: 0, afecto: 0, empacho: 4, nota: 'Sana y gratis' },
  verdura: { nombre: 'Verdura', emoji: '🥦', precio: 0, hambre: 12, salud: 5, diversion: -3, energia: 1, higiene: 0, afecto: 0, empacho: 3, nota: 'Sana, pero no divierte' },
  sopa: { nombre: 'Sopa', emoji: '🍲', precio: 3, hambre: 24, salud: 4, diversion: 0, energia: 4, higiene: -1, afecto: 1, empacho: 10, nota: 'Llena y reconforta' },
  helado: { nombre: 'Helado', emoji: '🍦', precio: 4, hambre: 8, salud: 0, diversion: 12, energia: 0, higiene: -3, afecto: 2, empacho: 12, nota: 'Muy divertido' },
  pizza: { nombre: 'Pizza', emoji: '🍕', precio: 5, hambre: 30, salud: -1, diversion: 6, energia: 0, higiene: -4, afecto: 0, empacho: 20, nota: 'Llena mucho' },
  pastel: { nombre: 'Pastel', emoji: '🍰', precio: 6, hambre: 16, salud: -2, diversion: 14, energia: 3, higiene: -3, afecto: 3, empacho: 25, nota: 'Alegra, pero empacha' }
};
export const COMIDA_IDS = Object.keys(COMIDAS);

// Tienda con monedas VIRTUALES del juego. tipo = hueco donde se coloca.
export const TIENDA = [
  { id: 'gorra', tipo: 'sombrero', nombre: 'Gorra', emoji: '🧢', precio: 15 },
  { id: 'fiesta', tipo: 'sombrero', nombre: 'Gorro de fiesta', emoji: '🥳', precio: 20 },
  { id: 'casco', tipo: 'sombrero', nombre: 'Casco de obra', emoji: '⛑️', precio: 30 },
  { id: 'copa', tipo: 'sombrero', nombre: 'Chistera', emoji: '🎩', precio: 40 },
  { id: 'corona', tipo: 'sombrero', nombre: 'Corona', emoji: '👑', precio: 120 },
  { id: 'gafas', tipo: 'gafas', nombre: 'Gafas redondas', emoji: '👓', precio: 20 },
  { id: 'corazon', tipo: 'gafas', nombre: 'Gafas de corazón', emoji: '💖', precio: 30 },
  { id: 'sol', tipo: 'gafas', nombre: 'Gafas de sol', emoji: '🕶️', precio: 35 },
  { id: 'pajarita', tipo: 'cuello', nombre: 'Pajarita', emoji: '🎀', precio: 18 },
  { id: 'corbata', tipo: 'cuello', nombre: 'Corbata', emoji: '👔', precio: 25 },
  { id: 'bufanda', tipo: 'cuello', nombre: 'Bufanda', emoji: '🧣', precio: 28 },
  { id: 'camiseta', tipo: 'ropa', nombre: 'Camiseta', emoji: '👕', precio: 30 },
  { id: 'peto', tipo: 'ropa', nombre: 'Peto vaquero', emoji: '👖', precio: 45 },
  { id: 'capa', tipo: 'ropa', nombre: 'Capa de héroe', emoji: '🦸', precio: 60 },
  { id: 'taller', tipo: 'fondo', nombre: 'Taller', emoji: '🛠️', precio: 0 },
  { id: 'jardin', tipo: 'fondo', nombre: 'Jardín', emoji: '🌳', precio: 35 },
  { id: 'cuarto', tipo: 'fondo', nombre: 'Cuarto rosa', emoji: '🛏️', precio: 40 },
  { id: 'playa', tipo: 'fondo', nombre: 'Playa', emoji: '🏖️', precio: 55 },
  { id: 'espacio', tipo: 'fondo', nombre: 'Espacio', emoji: '🪐', precio: 70 },
  { id: 'pelota', tipo: 'juguete', nombre: 'Pelota', emoji: '⚽', precio: 20 },
  { id: 'osito', tipo: 'juguete', nombre: 'Osito', emoji: '🧸', precio: 25 },
  { id: 'cubo', tipo: 'juguete', nombre: 'Cubo impreso en 3D', emoji: '🧊', precio: 30 },
  { id: 'robot', tipo: 'juguete', nombre: 'Robot', emoji: '🤖', precio: 45 }
];
export const ITEMS = Object.fromEntries(TIENDA.map(i => [i.id, i]));
export const HUECOS = ['sombrero', 'gafas', 'cuello', 'ropa', 'juguete'];

// Etapas: se entra en cada una cuando el «tiempo de crecimiento» (crecMs) llega a `desde`.
// El crecimiento va a ritmo normal si Bobi está bien cuidado y a ~1/3 si está mal.
export const ETAPAS = [
  { id: 'huevo', nombre: 'Huevo', desde: -1, emoji: '🥚' },
  { id: 'bebe', nombre: 'Bebé', desde: 0, emoji: '🐣' },
  { id: 'nino', nombre: 'Niño', desde: 5 * H, emoji: '🐥' },
  { id: 'joven', nombre: 'Joven', desde: 30 * H, emoji: '🐤' },
  { id: 'adulto', nombre: 'Adulto', desde: 72 * H, emoji: '🦚' }
];
export const ETAPA_IDS = ETAPAS.map(e => e.id);
export const HUEVO_MS = 2 * MIN;           // un huevo se abre solo a los 2 minutos…
export const CALOR_X = 0.05;               // …y cada toque de calor adelanta un 5 % (hasta un 50 %)
export const etapaDe = crecMs => { let r = 'bebe'; for (const e of ETAPAS) if (e.desde >= 0 && crecMs >= e.desde) r = e.id; return r; };
export const etapaInfo = id => ETAPAS.find(e => e.id === id) || ETAPAS[0];
export const siguienteEtapa = id => { const i = ETAPA_IDS.indexOf(id); return i >= 0 && i < ETAPA_IDS.length - 1 ? ETAPAS[i + 1] : null; };

export const STATS0 = { alimentado: 0, jugado: 0, banado: 0, curado: 0, caricias: 0, comprados: 0, revisiones: 0, favoritas: 0, sueno: 0, ganadas: 0, recordGotas: 0, recordMemoria: 0, partidasGotas: 0, partidasMemoria: 0, juguete: 0 };

export const EVENTOS = {
  hipo: { dur: 25000 }, antojo: { dur: 120000 }, pideJugar: { dur: 150000 }, susto: { dur: 30000 }, malito: { dur: 180000 }, bostezo: { dur: 8000 }
};

export const LOGROS = [
  { id: 'eclosion', emoji: '🐣', nombre: 'Ha nacido', desc: 'El huevo se abrió', ok: e => e.etapa !== 'huevo' },
  { id: 'comer1', emoji: '🍎', nombre: 'Primer bocado', desc: 'Dale de comer por primera vez', ok: e => e.stats.alimentado >= 1 },
  { id: 'jugar1', emoji: '🎮', nombre: 'A jugar', desc: 'Juega un minijuego con Bobi', ok: e => e.stats.jugado >= 1 },
  { id: 'bano1', emoji: '🛁', nombre: 'Splash', desc: 'Dale un baño', ok: e => e.stats.banado >= 1 },
  { id: 'curar1', emoji: '💊', nombre: 'Buen enfermero', desc: 'Cúrale cuando esté malito', ok: e => e.stats.curado >= 1 },
  { id: 'revision1', emoji: '🩺', nombre: 'Chequeo', desc: 'Hazle una revisión', ok: e => e.stats.revisiones >= 1 },
  { id: 'compra1', emoji: '🛍️', nombre: 'De compras', desc: 'Compra algo en la tienda', ok: e => e.stats.comprados >= 1 },
  { id: 'favorita', emoji: '😋', nombre: '¡Su favorita!', desc: 'Dale su comida preferida', ok: e => e.stats.favoritas >= 1 },
  { id: 'noche1', emoji: '🌙', nombre: 'Buenas noches', desc: 'Apaga la luz de noche', ok: e => e.stats.sueno >= 1 },
  { id: 'mimos10', emoji: '💗', nombre: 'Mimoso', desc: '10 caricias', ok: e => e.stats.caricias >= 10 },
  { id: 'mimos100', emoji: '💞', nombre: 'Amigo del alma', desc: '100 caricias', ok: e => e.stats.caricias >= 100 },
  { id: 'nino', emoji: '🐥', nombre: 'Ya es un niño', desc: 'Llega a la etapa Niño', ok: e => ETAPA_IDS.indexOf(e.etapa) >= 2 },
  { id: 'joven', emoji: '🐤', nombre: 'Ya es joven', desc: 'Llega a la etapa Joven', ok: e => ETAPA_IDS.indexOf(e.etapa) >= 3 },
  { id: 'adulto', emoji: '🦚', nombre: 'Todo un adulto', desc: 'Llega a la etapa Adulto', ok: e => e.etapa === 'adulto' },
  { id: 'dias3', emoji: '📅', nombre: 'Tres días juntos', desc: 'Bobi cumple 3 días de vida', ok: e => e.edadMs >= 3 * DIA },
  { id: 'gotas20', emoji: '💧', nombre: 'Manos de oro', desc: '20 gotas en una partida', ok: e => e.stats.recordGotas >= 20 },
  { id: 'memoria6', emoji: '🧠', nombre: 'Memoria de elefante', desc: '6 rondas seguidas en Memoria', ok: e => e.stats.recordMemoria >= 6 },
  { id: 'rico', emoji: '💰', nombre: 'Hucha llena', desc: 'Gana 100 monedas en total', ok: e => e.stats.ganadas >= 100 }
];

// ---------- utilidades ----------
export const clamp = (x, a = 0, b = 100) => x < a ? a : x > b ? b : x;
export function num(x, min, max, def) {
  const v = typeof x === 'number' ? x : (typeof x === 'string' && x.trim() !== '' ? Number(x) : NaN);
  if (!Number.isFinite(v)) return def;
  return v < min ? min : v > max ? max : v;
}
const copia = e => JSON.parse(JSON.stringify(e));
const r2 = x => Math.round(x * 1000) / 1000;
export const horaLocal = t => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60; };
export const esNoche = t => { const h = horaLocal(t); return h >= 22 || h < 7; };
export function limpiaNombre(s) {
  const t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>&"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14).trim();
  return t || 'Bobi';
}
export function edadTexto(ms) {
  ms = Math.max(0, ms || 0); const d = Math.floor(ms / DIA), h = Math.floor((ms % DIA) / H), m = Math.floor((ms % H) / MIN);
  if (d > 0) return d + (d === 1 ? ' día' : ' días') + (h ? ' ' + h + ' h' : '');
  if (h > 0) return h + ' h' + (m ? ' ' + m + ' min' : '');
  return m + ' min';
}

// ---------- estado ----------
export function nuevo(ahora = Date.now(), rnd = Math.random) {
  const pers = PERS_IDS[Math.floor(rnd() * PERS_IDS.length) % PERS_IDS.length];
  const color = COLOR_IDS[Math.floor(rnd() * COLOR_IDS.length) % COLOR_IDS.length];
  return {
    v: VERSION, nombre: 'Bobi', color, pers, etapa: 'huevo', huevoMs: 0, calor: 0, crecMs: 0, edadMs: 0,
    nacido: ahora, eclosion: null, ultimaVez: ahora,
    n: { hambre: 100, energia: 100, diversion: 100, higiene: 100, salud: 100, afecto: 100 },
    luz: true, empacho: 0, sucioMs: 0, malHumor: 0, enfado: 0, mareo: 0, emocion: 0, toqN: 0, toqT: 0,
    monedas: 30, inv: ['taller'], puesto: { sombrero: null, gafas: null, cuello: null, ropa: null, juguete: null }, fondo: 'taller', ultJuguete: -1e15,
    evento: null, ultEvento: 0, cuidados: 0, stats: { ...STATS0 }, logros: {}, sonido: false
  };
}

// Valida y repara CUALQUIER cosa que venga del almacenamiento. Si no es utilizable → huevo nuevo. Nunca lanza.
export function sanear(x, ahora = Date.now()) {
  try {
    if (!x || typeof x !== 'object' || Array.isArray(x) || x.v !== VERSION) return nuevo(ahora);
    ahora = num(ahora, 0, 8.64e15, Date.now());
    const e = nuevo(ahora, () => 0);
    e.nombre = limpiaNombre(x.nombre);
    e.color = Object.prototype.hasOwnProperty.call(COLORES, x.color) ? x.color : 'violeta';
    e.pers = Object.prototype.hasOwnProperty.call(PERS, x.pers) ? x.pers : 'jugueton';
    e.huevoMs = num(x.huevoMs, 0, 1e12, 0); e.calor = Math.floor(num(x.calor, 0, 1e6, 0));
    e.crecMs = num(x.crecMs, 0, 1e13, 0); e.edadMs = num(x.edadMs, 0, 1e13, 0);
    e.nacido = num(x.nacido, 0, ahora, ahora); e.eclosion = x.eclosion == null ? null : num(x.eclosion, 0, ahora, ahora);
    e.ultimaVez = num(x.ultimaVez, 0, ahora, ahora);
    const xn = x.n && typeof x.n === 'object' ? x.n : {};
    for (const k of NEC) e.n[k] = r2(num(xn[k], 0, 100, 100));
    e.luz = x.luz !== false;
    for (const k of ['empacho', 'malHumor', 'enfado', 'mareo', 'emocion']) e[k] = r2(num(x[k], 0, 100, 0));
    e.sucioMs = num(x.sucioMs, 0, 1e12, 0); e.toqN = Math.floor(num(x.toqN, 0, 1000, 0)); e.toqT = num(x.toqT, 0, 8.64e15, 0);
    e.monedas = Math.floor(num(x.monedas, 0, 999999, 30)); e.cuidados = r2(num(x.cuidados, 0, 1e9, 0));
    e.ultJuguete = num(x.ultJuguete, -1e15, 8.64e15, -1e15); e.ultEvento = num(x.ultEvento, 0, 8.64e15, 0);
    // inventario: solo objetos que existen
    const inv = new Set(['taller']); if (Array.isArray(x.inv)) for (const id of x.inv.slice(0, 200)) if (typeof id === 'string' && Object.prototype.hasOwnProperty.call(ITEMS, id)) inv.add(id);
    e.inv = [...inv];
    const xp = x.puesto && typeof x.puesto === 'object' ? x.puesto : {};
    for (const hz of HUECOS) { const id = xp[hz]; e.puesto[hz] = (typeof id === 'string' && inv.has(id) && ITEMS[id] && ITEMS[id].tipo === hz) ? id : null; }
    e.fondo = (typeof x.fondo === 'string' && inv.has(x.fondo) && ITEMS[x.fondo] && ITEMS[x.fondo].tipo === 'fondo') ? x.fondo : 'taller';
    const xs = x.stats && typeof x.stats === 'object' ? x.stats : {};
    for (const k of Object.keys(STATS0)) e.stats[k] = Math.floor(num(xs[k], 0, 1e9, 0));
    const xl = x.logros && typeof x.logros === 'object' ? x.logros : {};
    for (const l of LOGROS) if (Object.prototype.hasOwnProperty.call(xl, l.id)) e.logros[l.id] = num(xl[l.id], 0, 8.64e15, ahora);
    e.sonido = x.sonido === true;
    // etapa coherente con el crecimiento
    e.etapa = x.etapa === 'huevo' || !ETAPA_IDS.includes(x.etapa) ? 'huevo' : etapaDe(e.crecMs);
    // evento en curso
    const ev = x.evento;
    if (ev && typeof ev === 'object' && Object.prototype.hasOwnProperty.call(EVENTOS, ev.tipo) && Number.isFinite(ev.desde) && Number.isFinite(ev.hasta) && e.etapa !== 'huevo')
      e.evento = { tipo: ev.tipo, desde: num(ev.desde, 0, 8.64e15, 0), hasta: num(ev.hasta, 0, 8.64e15, 0), texto: String(ev.texto == null ? '' : ev.texto).replace(/[\u0000-\u001f<>]/g, '').slice(0, 80) };
    return e;
  } catch (err) { return nuevo(ahora); }
}

export const huevoProg = e => clamp(e.huevoMs / HUEVO_MS + Math.min(0.5, e.calor * CALOR_X), 0, 1);

export function bienestar(e) {
  const n = e.n;
  return clamp(n.hambre * 0.22 + n.energia * 0.16 + n.diversion * 0.16 + n.higiene * 0.14 + n.salud * 0.2 + n.afecto * 0.12);
}
export const tasaCrecimiento = e => 0.35 + 0.65 * clamp((bienestar(e) - 25) / 45, 0, 1);
export function necesidadPrincipal(e) { let k = NEC[0]; for (const x of NEC) if (e.n[x] < e.n[k]) k = x; return k; }

function eclosionar(e, t) {
  e.etapa = 'bebe'; e.eclosion = t; e.crecMs = 0; e.edadMs = 0; e.luz = true;
  e.n = { hambre: 75, energia: 85, diversion: 80, higiene: 100, salud: 100, afecto: 85 };
  e.emocion = 100;
}

// ---------- el tiempo pasa ----------
// Un paso corto (dtMs ≤ ~15 min). t = instante local en que empieza. Muta e (que ya es una copia).
function paso(e, dtMs, t) {
  if (e.etapa === 'huevo') {
    e.huevoMs += dtMs;
    if (huevoProg(e) >= 1) eclosionar(e, t + dtMs);
    return;
  }
  const dt = dtMs / H, seg = dtMs / 1000, n = e.n, P = PERS[e.pers] || PERS.jugueton;
  const noche = esNoche(t), dormido = !e.luz;
  e.edadMs += dtMs;
  // necesidades que bajan (con suelo)
  for (const k of ['hambre', 'diversion', 'higiene', 'afecto']) {
    let d = BAJA_H[k] * (P.mult[k] || 1) * dt * (dormido ? SUENO_X[k] : 1);
    if (n[k] > SUELO[k]) n[k] = Math.max(SUELO[k], n[k] - d);
  }
  // energía: despierto baja (más de noche); dormido sube (mucho más de noche y con luz apagada)
  if (!dormido) {
    const d = BAJA_H.energia * (P.mult.energia || 1) * (noche ? 1.6 : 1) * dt;
    if (n.energia > SUELO.energia) n.energia = Math.max(SUELO.energia, n.energia - d);
    if (noche && n.energia <= SUELO.energia + 3) e.luz = false;           // a esas horas y reventado: se duerme solito
  } else {
    n.energia = Math.min(100, n.energia + (noche ? 20 : 8) * (P.sueno || 1) * dt);
    if (!noche && n.energia >= 85) e.luz = true;                          // por el día se despierta cuando ya ha descansado
    else if (noche && n.energia >= 100 && horaLocal(t + dtMs) >= 7) e.luz = true;
  }
  // suciedad prolongada
  if (n.higiene < 25) e.sucioMs += dtMs; else e.sucioMs = Math.max(0, e.sucioMs - dtMs * 2);
  // salud: baja si algo va muy mal, y se recupera sola (despacio) si todo va razonablemente bien
  const pen = (n.hambre < 15 ? 1 : n.hambre < 30 ? 0.4 : 0) + (n.higiene < 20 ? 1 : 0) + (e.sucioMs > 4 * H ? 1.5 : 0) + (e.empacho >= 80 ? 1.2 : 0)
    + (n.afecto < 10 ? 0.5 : 0) + (n.diversion < 10 ? 0.4 : 0) + (n.energia < 14 ? 0.5 : 0);
  if (pen > 0) { if (n.salud > SUELO.salud) n.salud = Math.max(SUELO.salud, n.salud - pen * 2.2 * dt); }
  else if (Math.min(n.hambre, n.higiene, n.energia) > 35) n.salud = Math.min(100, n.salud + (dormido ? 6 : 3) * dt);
  e.empacho = Math.max(0, e.empacho - (dormido ? 20 : 10) * dt);
  // humor
  if (noche && !dormido && n.energia < 50) e.malHumor = Math.min(100, e.malHumor + 10 * dt);
  else if (dormido) e.malHumor = Math.max(0, e.malHumor - 30 * dt);
  else e.malHumor = Math.max(0, e.malHumor - 4 * dt);
  e.mareo = Math.max(0, e.mareo - 1.5 * seg); e.enfado = Math.max(0, e.enfado - 0.25 * seg); e.emocion = Math.max(0, e.emocion - 1.7 * seg);
  // crecimiento: tiempo × ritmo según lo bien cuidado que esté
  e.crecMs += dtMs * tasaCrecimiento(e);
  e.etapa = etapaDe(e.crecMs);
}

// Devuelve un estado NUEVO tras `ms` milisegundos de tiempo real. Determinista. Nunca NaN, nunca fuera de 0-100, nunca «muere».
export function avanzar(est, ms) {
  const e = copia(est);
  ms = num(ms, 0, 365 * DIA, 0);
  if (!(ms > 0)) return e;
  let t = Number.isFinite(e.ultimaVez) ? e.ultimaVez : 0, resto = ms;
  const PASO = ms > 4 * DIA ? 15 * MIN : 5 * MIN;
  while (resto > 0) { const dt = Math.min(PASO, resto); paso(e, dt, t); t += dt; resto -= dt; }
  e.ultimaVez = est.ultimaVez + ms;
  for (const k of NEC) e.n[k] = r2(clamp(e.n[k]));
  for (const k of ['empacho', 'malHumor', 'enfado', 'mareo', 'emocion']) e[k] = r2(clamp(e[k]));
  e.huevoMs = Math.round(e.huevoMs); e.crecMs = Math.round(e.crecMs); e.edadMs = Math.round(e.edadMs); e.sucioMs = Math.round(e.sucioMs);
  return e;
}

// ---------- estado de ánimo ----------
export const ANIMOS = {
  huevo: { emoji: '🥚', frase: 'es todavía un huevo', tono: 'normal', burbujas: ['…', '*se mueve un poquito*'] },
  durmiendo: { emoji: '😴', frase: 'está durmiendo', tono: 'normal', burbujas: ['Zzz…', 'Zzz… Zzz…'] },
  enfermo: { emoji: '🤒', frase: 'está malito', tono: 'mal', burbujas: ['No me encuentro bien…', 'Me duele todo… ¿medicina?', 'Estoy débil…'] },
  empachado: { emoji: '🤢', frase: 'está empachado', tono: 'mal', burbujas: ['Uf, me duele la barriga', '¡He comido demasiado!'] },
  mareado: { emoji: '😵', frase: 'está mareado', tono: 'mal', burbujas: ['Uuuuh… todo gira', 'Me mareo…'] },
  enfadado: { emoji: '😠', frase: 'está enfadado', tono: 'mal', burbujas: ['¡Grrr!', 'Hoy no estoy para bromas', '¡Déjame en paz!'] },
  triste: { emoji: '😢', frase: 'está triste y débil', tono: 'mal', burbujas: ['Estoy triste…', '¿Me haces un poco de caso?', 'Te echaba de menos…'] },
  hambriento: { emoji: '🤤', frase: 'está hambriento', tono: 'mal', burbujas: ['¡Tengo hambre!', 'Mi barriga hace ruiditos…', '¿Hay algo de comer?'] },
  cansado: { emoji: '🥱', frase: 'está cansado', tono: 'mal', burbujas: ['Tengo sueño…', 'Apaga la luz, porfa', 'Aaah… *bostezo*'] },
  sucio: { emoji: '🪰', frase: 'está sucio', tono: 'mal', burbujas: ['Estoy sucio, buá', '¡Necesito un baño!', 'Huelo raro…'] },
  aburrido: { emoji: '😑', frase: 'está aburrido', tono: 'mal', burbujas: ['Me aburro…', '¿Jugamos?', 'Quiero hacer algo'] },
  emocionado: { emoji: '🤩', frase: 'está emocionado', tono: 'bien', burbujas: ['¡Siiií!', '¡Vamos, vamos!', '¡Qué guay!'] },
  feliz: { emoji: '😄', frase: 'está feliz', tono: 'bien', burbujas: ['¡Qué feliz soy!', '¡Eres lo mejor!', '¡Me encanta el taller!'] },
  contento: { emoji: '🙂', frase: 'está contento', tono: 'bien', burbujas: ['Qué buen día', 'Estoy a gusto', 'Me gusta estar aquí'] },
  normal: { emoji: '😐', frase: 'está tranquilo', tono: 'normal', burbujas: ['Hola', '¿Qué hacemos?', 'Hmm…'] }
};
export function animo(e) {
  const id = animoId(e), a = ANIMOS[id];
  return { id, emoji: a.emoji, tono: a.tono, texto: (id === 'huevo' ? 'El huevo de ' : '') + e.nombre + ' ' + (id === 'huevo' ? 'está calentito' : a.frase), burbujas: a.burbujas };
}
export function animoId(e) {
  if (e.etapa === 'huevo') return 'huevo';
  if (!e.luz) return 'durmiendo';
  const n = e.n, bajos = NEC.filter(k => n[k] < 30).length, q = bienestar(e);
  if (n.salud < 35) return 'enfermo';
  if (e.empacho >= 70) return 'empachado';
  if (e.mareo >= 50) return 'mareado';
  if (e.enfado >= 50 || e.malHumor >= 60) return 'enfadado';
  if (bajos >= 3) return 'triste';
  if (n.hambre < 25) return 'hambriento';
  if (n.energia < 25) return 'cansado';
  if (n.higiene < 25) return 'sucio';
  if (n.diversion < 25) return 'aburrido';
  if (n.afecto < 25) return 'triste';
  if (e.emocion >= 40 && q >= 50) return 'emocionado';
  const mn = Math.min(...NEC.map(k => n[k]));
  if (q >= 85 && mn >= 60) return 'feliz';
  if (q >= 65 && mn >= 40) return 'contento';
  return 'normal';
}

// ---------- acciones (todas devuelven { e, ok, msg, ... } con un estado nuevo) ----------
const R = (e, ok, msg, extra) => Object.assign({ e, ok, msg: msg || '' }, extra || {});
function bloqueo(e) {
  if (e.etapa === 'huevo') return 'Todavía es un huevo: dale calor con toques.';
  if (!e.luz) return 'Shh… está durmiendo. Enciende la luz para despertarle.';
  return null;
}
function sube(e, k, v) { e.n[k] = clamp(e.n[k] + v); }
function crece(e, ms) { e.crecMs += ms; e.etapa = e.etapa === 'huevo' ? 'huevo' : etapaDe(e.crecMs); }

export function alimentar(est, id) {
  const e = copia(est), b = bloqueo(e); if (b) return R(e, false, b);
  const f = COMIDAS[id]; if (!f) return R(e, false, 'Eso no se come.');
  if (f.precio > e.monedas) return R(e, false, 'Te faltan ' + (f.precio - e.monedas) + ' monedas para ' + f.nombre.toLowerCase() + '.');
  e.monedas -= f.precio;
  const fav = (PERS[e.pers] || PERS.jugueton).fav === id, antes = e.n.hambre;
  const ganancia = f.hambre * (fav ? 1.25 : 1), pasa = Math.max(0, antes + ganancia - 100);
  e.n.hambre = clamp(antes + ganancia);
  sube(e, 'salud', f.salud); sube(e, 'diversion', f.diversion + (fav ? 8 : 0)); sube(e, 'energia', f.energia); sube(e, 'higiene', f.higiene); sube(e, 'afecto', f.afecto + (fav ? 6 : 0));
  e.empacho += f.empacho + pasa * 1.5;
  let msg = f.emoji + ' ' + (fav ? '¡Su comida favorita!' : '¡Ñam!'), empachado = false;
  if (e.empacho > 100) { e.n.salud = clamp(e.n.salud - (e.empacho - 100) * 0.6); e.empacho = 100; }
  if (antes >= 90 || pasa > 10) { msg = '¡Uf! Ha comido de más…'; empachado = true; }
  if (e.empacho >= 70) { msg = 'Uf, ¡qué empacho! Déjale descansar.'; empachado = true; }
  e.stats.alimentado++; if (fav) { e.stats.favoritas++; e.emocion = 100; }
  e.cuidados += antes < 80 ? 2 : 0.3; if (antes < 80) crece(e, 8 * MIN);
  return R(e, true, msg, { fav, empachado, comida: id });
}
export function curar(est) {
  const e = copia(est), b = bloqueo(e); if (b) return R(e, false, b);
  if (e.n.salud >= 85 && e.empacho < 40) return R(e, false, 'No está malito: la medicina es solo para cuando hace falta.');
  e.n.salud = clamp(e.n.salud + 35); e.empacho = Math.max(0, e.empacho - 25); sube(e, 'diversion', -6); sube(e, 'afecto', 1);
  e.stats.curado++; e.cuidados += 3; crece(e, 10 * MIN);
  return R(e, true, '💊 ¡Puaj, sabe mal… pero ya me siento mejor!');
}
// frac: 0..1 de lo que se ha frotado
export function banar(est, frac = 1) {
  const e = copia(est), b = bloqueo(e); if (b) return R(e, false, b);
  frac = clamp(num(frac, 0, 1, 0), 0, 1);
  if (e.n.higiene >= 92) return R(e, false, '¡Ya está limpito!');
  const antes = e.n.higiene;
  e.n.higiene = frac >= 0.99 ? 100 : clamp(antes + 80 * frac);
  sube(e, 'diversion', 5 * frac); sube(e, 'afecto', (e.pers === 'remilgado' ? 4 : 2) * frac); sube(e, 'energia', -3 * frac);
  if (e.n.higiene >= 50) e.sucioMs = 0;
  if (frac > 0.2) { e.stats.banado++; e.cuidados += 2; crece(e, 8 * MIN); }
  return R(e, true, frac >= 0.99 ? '🫧 ¡Limpio y reluciente!' : frac > 0.2 ? '🫧 Mejor… pero aún queda algo de roña.' : 'Ni se ha mojado.', { subida: e.n.higiene - antes });
}
export function luz(est, encendida) {
  const e = copia(est);
  if (e.etapa === 'huevo') return R(e, false, 'El huevo no necesita luz.');
  const noche = esNoche(e.ultimaVez);
  if (encendida) {
    if (e.luz) return R(e, false, '');
    e.luz = true;
    if (e.n.energia < 60) { e.enfado = clamp(e.enfado + 18); return R(e, true, '¡Aaah! ¡Me has despertado!', { despertado: true }); }
    return R(e, true, '¡Buenos días!');
  }
  if (!e.luz) return R(e, false, '');
  if (e.n.energia >= 90 && !noche) return R(e, false, 'No tiene sueño todavía.');
  e.luz = false; if (noche) e.stats.sueno++;
  return R(e, true, noche ? 'Buenas noches… Zzz' : 'Una siestecita… Zzz', { noche });
}
export function tocar(est, ahora) {
  const e = copia(est);
  if (e.etapa === 'huevo') { e.calor++; return R(e, true, '', { reaccion: 'huevo' }); }
  if (!e.luz) { e.enfado = clamp(e.enfado + 4); return R(e, true, '', { reaccion: 'dormido' }); }
  const seguido = ahora - e.toqT < 1600; e.toqN = seguido ? e.toqN + 1 : 1; e.toqT = ahora;
  const timido = (PERS[e.pers] || PERS.jugueton).susto > 1.5;
  let reaccion = 'corazones';
  if (e.toqN <= 4) { sube(e, 'afecto', 2); e.stats.caricias++; e.cuidados += 0.1; crece(e, 20000); reaccion = 'corazones'; }
  else if (e.toqN <= 8) { e.mareo = clamp(e.mareo + (timido ? 22 : 14)); reaccion = 'mareo'; }
  else { e.mareo = clamp(e.mareo + 10); e.enfado = clamp(e.enfado + 14); sube(e, 'afecto', -1.5); reaccion = 'enfado'; }
  return R(e, true, '', { reaccion });
}
// Arrastrar el dedo por encima = mimo. cantidad en «unidades de 40 px».
export function mimar(est, cantidad = 1) {
  const e = copia(est);
  if (e.etapa === 'huevo' || !e.luz) return R(e, false, '');
  const c = clamp(num(cantidad, 0, 20, 0), 0, 20);
  sube(e, 'afecto', 0.9 * c); sube(e, 'diversion', 0.2 * c); e.mareo = Math.max(0, e.mareo - 4 * c); e.enfado = Math.max(0, e.enfado - 2 * c);
  e.stats.caricias += c >= 1 ? 1 : 0; e.cuidados += 0.1 * c; crece(e, 15000 * c);
  return R(e, true, '', { reaccion: 'mimo' });
}
export function revision(est) {
  const e = copia(est), b = bloqueo(e); if (b) return R(e, false, b);
  e.stats.revisiones++; sube(e, 'afecto', 1); e.cuidados += 0.5;
  const dx = diagnostico(e);
  return R(e, true, dx[0] || '', { diagnostico: dx });
}
export function diagnostico(e) {
  const n = e.n, L = [], nom = e.nombre;
  if (n.salud < 35) L.push(nom + ' está malito: dale medicina (💊) y que descanse.');
  if (e.empacho >= 70) L.push('Tiene la barriga a reventar: nada de comida por un rato.');
  if (n.hambre < 30) L.push('Tiene hambre: dale de comer algo sano.');
  if (n.energia < 30) L.push('Está agotado: apaga la luz para que duerma.');
  if (n.higiene < 30) L.push('Está muy sucio: un baño le vendrá genial' + (e.sucioMs > 2 * H ? ' (¡lleva mucho así y puede ponerse malito!)' : '.'));
  if (n.diversion < 30) L.push('Se aburre: juega con él.');
  if (n.afecto < 30) L.push('Necesita mimos: acarícialo.');
  if (!L.length) L.push(n.salud >= 85 && bienestar(e) >= 80 ? '¡Sano como una manzana! Peso y altura perfectos para su edad.' : 'Está bien, aunque podría estar mejor: vigila las barras más bajas.');
  return L;
}

// ---------- minijuegos: premio ----------
export function premioJuego(juego, puntos) {
  const p = Math.max(0, Math.floor(num(puntos, 0, 1e6, 0)));
  if (juego === 'gotas') return { monedas: Math.min(30, Math.round(p * 0.8)), diversion: Math.min(45, Math.round(8 + p * 1.2)) };
  if (juego === 'memoria') return { monedas: Math.min(30, p * 3), diversion: Math.min(45, 8 + p * 5) };
  return { monedas: 0, diversion: 0 };
}
export function jugar(est, juego, puntos) {
  const e = copia(est), b = bloqueo(e); if (b) return R(e, false, b);
  if (juego !== 'gotas' && juego !== 'memoria') return R(e, false, 'Ese juego no existe.');
  if (e.n.energia < 12) return R(e, false, 'Está demasiado cansado para jugar. Que duerma un poco.');
  const p = Math.max(0, Math.floor(num(puntos, 0, 1e6, 0))), pr = premioJuego(juego, p);
  sube(e, 'diversion', pr.diversion); sube(e, 'energia', -(7 + Math.min(6, p * 0.2))); sube(e, 'hambre', -4); sube(e, 'higiene', -2); sube(e, 'afecto', 1);
  e.monedas = Math.min(999999, e.monedas + pr.monedas); e.stats.ganadas += pr.monedas; e.stats.jugado++;
  if (juego === 'gotas') { e.stats.partidasGotas++; e.stats.recordGotas = Math.max(e.stats.recordGotas, p); }
  else { e.stats.partidasMemoria++; e.stats.recordMemoria = Math.max(e.stats.recordMemoria, p); }
  if (p >= (juego === 'gotas' ? 10 : 4)) e.emocion = 100;
  e.cuidados += 3; crece(e, 15 * MIN);
  return R(e, true, p > 0 ? '¡Qué divertido! +' + pr.monedas + ' monedas' : 'Bueno… ¡a la próxima!', { premio: pr, puntos: p });
}
export function usarJuguete(est) {
  const e = copia(est), b = bloqueo(e); if (b) return R(e, false, b);
  if (!e.puesto.juguete) return R(e, false, 'Compra un juguete en la tienda y colócalo.');
  if (e.n.energia < 8) return R(e, false, 'Está demasiado cansado.');
  if (e.ultimaVez - e.ultJuguete < MIN) return R(e, false, 'Se ha cansado de ese juguete un ratito. ¡Prueba un minijuego!');
  e.ultJuguete = e.ultimaVez; sube(e, 'diversion', 12); sube(e, 'afecto', 2); sube(e, 'energia', -4); sube(e, 'higiene', -1); e.stats.juguete++; e.cuidados += 1; e.emocion = Math.max(e.emocion, 60);
  return R(e, true, '¡A jugar con ' + (ITEMS[e.puesto.juguete] ? ITEMS[e.puesto.juguete].nombre.toLowerCase() : 'el juguete') + '!');
}

// ---------- tienda ----------
export function comprar(est, id) {
  const e = copia(est), it = ITEMS[id]; if (!it) return R(e, false, 'No existe ese artículo.');
  if (e.inv.includes(id)) return R(e, false, 'Ya lo tienes.');
  if (e.monedas < it.precio) return R(e, false, 'Te faltan ' + (it.precio - e.monedas) + ' monedas.');
  e.monedas -= it.precio; e.inv.push(id); e.stats.comprados++;
  if (it.tipo === 'fondo') e.fondo = id; else e.puesto[it.tipo] = id;
  return R(e, true, '¡Comprado: ' + it.nombre + '!');
}
export function equipar(est, id) {
  const e = copia(est), it = ITEMS[id];
  if (!it || !e.inv.includes(id)) return R(e, false, 'Primero hay que comprarlo.');
  if (it.tipo === 'fondo') e.fondo = id; else e.puesto[it.tipo] = id;
  return R(e, true, '');
}
export function quitar(est, hueco) {
  const e = copia(est); if (!HUECOS.includes(hueco)) return R(e, false, '');
  e.puesto[hueco] = null; return R(e, true, '');
}

// ---------- calor del huevo ----------
export function calentarHuevo(est) { return tocar(est, 0); }

// ---------- eventos aleatorios suaves ----------
export function eventoAleatorio(est, rnd = Math.random) {
  const e = est;
  if (e.etapa === 'huevo' || !e.luz || e.evento) return null;
  const P = PERS[e.pers] || PERS.jugueton, n = e.n;
  const cand = [
    ['hipo', 2], ['antojo', n.hambre < 85 ? 3 : 0.5], ['pideJugar', n.diversion < 75 && n.energia > 30 ? 3 : 0],
    ['susto', 1 * P.susto], ['malito', e.sucioMs > 2 * H && n.salud > 40 ? 4 : 0], ['bostezo', n.energia < 50 ? 3 : 0]
  ].filter(c => c[1] > 0);
  const tot = cand.reduce((s, c) => s + c[1], 0); let x = rnd() * tot, tipo = cand[cand.length - 1][0];
  for (const c of cand) { if (x < c[1]) { tipo = c[0]; break; } x -= c[1]; }
  const fav = COMIDAS[P.fav];
  const texto = { hipo: '¡Hip! ¡Hip!', antojo: '¡Me apetece ' + (fav ? fav.nombre.toLowerCase() : 'algo rico') + '! ' + (fav ? fav.emoji : ''), pideJugar: '¡Juega conmigo, porfa!', susto: '¡Uy! ¿Has oído ese ruido?', malito: 'Uf… no me siento bien', bostezo: '*bostezo* Aaaah…' }[tipo];
  return { tipo, desde: e.ultimaVez, hasta: e.ultimaVez + EVENTOS[tipo].dur, texto };
}
export function ponerEvento(est, ev) {
  const e = copia(est); if (!ev || !EVENTOS[ev.tipo]) return e;
  e.evento = { tipo: ev.tipo, desde: ev.desde, hasta: ev.hasta, texto: ev.texto }; e.ultEvento = ev.desde;
  if (ev.tipo === 'susto') { sube(e, 'afecto', -2); e.mareo = clamp(e.mareo + 10); }
  if (ev.tipo === 'malito') { sube(e, 'salud', -8); }
  return e;
}
// accion: 'comer' (extra = id de comida) | 'jugar' | 'caricia' | 'curar'. Devuelve { e, resuelto, msg }
export function resolverEvento(est, accion, extra) {
  const e = copia(est), ev = e.evento; if (!ev) return { e, resuelto: false, msg: '' };
  const P = PERS[e.pers] || PERS.jugueton; let msg = '';
  if (ev.tipo === 'hipo' && (accion === 'caricia' || accion === 'comer')) { sube(e, 'afecto', 3); msg = '¡Se le pasó el hipo!'; }
  else if (ev.tipo === 'antojo' && accion === 'comer' && extra === P.fav) { sube(e, 'afecto', 8); sube(e, 'diversion', 10); e.monedas += 5; e.stats.ganadas += 5; e.emocion = 100; msg = '¡Justo lo que quería! +5 monedas'; }
  else if (ev.tipo === 'pideJugar' && accion === 'jugar') { sube(e, 'afecto', 6); e.monedas += 5; e.stats.ganadas += 5; msg = '¡Qué ganas tenía de jugar! +5 monedas'; }
  else if (ev.tipo === 'susto' && accion === 'caricia') { sube(e, 'afecto', 6); e.mareo = 0; msg = 'Ya se le pasó el susto.'; }
  else if (ev.tipo === 'malito' && accion === 'curar') { sube(e, 'afecto', 4); msg = '¡Menos mal que le curaste a tiempo!'; }
  else return { e, resuelto: false, msg: '' };
  e.evento = null; return { e, resuelto: true, msg };
}
// Si el evento ya caducó: se quita (con una pequeña penalización si era un antojo o una petición ignorada)
export function caducarEvento(est) {
  const e = copia(est), ev = e.evento; if (!ev || e.ultimaVez <= ev.hasta) return { e, caducado: false, msg: '' };
  let msg = '';
  if (ev.tipo === 'antojo') { sube(e, 'afecto', -2); msg = 'Se quedó con las ganas…'; }
  else if (ev.tipo === 'pideJugar') { sube(e, 'afecto', -1); sube(e, 'diversion', -3); }
  e.evento = null; return { e, caducado: true, msg };
}

// Premio por volver tras una ausencia larga (solo monedas del juego)
export function bonusRegreso(est, ms) {
  const e = copia(est); if (e.etapa === 'huevo') return R(e, false, '');
  const n = Math.min(3, Math.floor(num(ms, 0, 1e13, 0) / (3 * H)));
  if (n < 1) return R(e, false, '');
  e.monedas = Math.min(999999, e.monedas + n * 5); e.stats.ganadas += n * 5;
  return R(e, true, '¡Bobi ha encontrado ' + (n * 5) + ' monedas mientras no estabas!');
}

// Logros: devuelve el estado con los nuevos marcados y la lista de los que se acaban de ganar
export function comprobarLogros(est, ahora) {
  const e = copia(est), nuevos = [];
  for (const l of LOGROS) if (!e.logros[l.id] && l.ok(e)) { e.logros[l.id] = ahora || e.ultimaVez || 1; nuevos.push(l.id); }
  return { e, nuevos };
}

// ---------- minijuego 1: «Atrapa las gotas de filamento» (muta g) ----------
export const GOTAS = { W: 400, H: 360, DUR: 30, CESTA_W: 78, CESTA_Y: 300 };
export function gotasNueva() { return { t: 0, x: GOTAS.W / 2, gotas: [], pts: 0, malas: 0, racha: 0, mejorRacha: 0, spawn: 0.4, fin: false, ev: [] }; }
// dt en segundos; x = posición pedida de la cesta (px lógicos). rnd inyectable.
export function gotasPaso(g, dt, x, rnd = Math.random) {
  if (g.fin) return g;
  dt = clamp(num(dt, 0, 0.25, 0), 0, 0.25); g.ev = [];
  const mitad = GOTAS.CESTA_W / 2; g.x = clamp(num(x, -1e6, 1e6, g.x), mitad, GOTAS.W - mitad); g.t += dt;
  g.spawn -= dt;
  if (g.spawn <= 0) {
    const q = rnd(), tipo = g.t > 4 && q > 0.86 ? 'mala' : q < 0.1 ? 'oro' : 'ok';
    g.gotas.push({ x: 24 + rnd() * (GOTAS.W - 48), y: -12, vy: 110 + Math.min(g.t, 30) * 4.5 + rnd() * 50, tipo, r: tipo === 'oro' ? 13 : 11, h: Math.floor(rnd() * 360) });
    g.spawn = Math.max(0.3, 0.8 - g.t * 0.016) * (0.8 + rnd() * 0.4);
  }
  const rest = [];
  for (const d of g.gotas) {
    d.y += d.vy * dt;
    const dentro = d.y + d.r >= GOTAS.CESTA_Y && d.y <= GOTAS.CESTA_Y + 18 && Math.abs(d.x - g.x) <= mitad + d.r * 0.4;
    if (dentro) {
      if (d.tipo === 'mala') { g.pts = Math.max(0, g.pts - 2); g.malas++; g.racha = 0; g.ev.push('mala'); }
      else { const v = d.tipo === 'oro' ? 3 : 1; g.pts += v; g.racha++; g.mejorRacha = Math.max(g.mejorRacha, g.racha); g.ev.push(d.tipo === 'oro' ? 'oro' : 'ok'); }
    } else if (d.y > GOTAS.H + 20) { if (d.tipo !== 'mala') g.racha = 0; }
    else rest.push(d);
  }
  g.gotas = rest;
  if (g.t >= GOTAS.DUR) g.fin = true;
  return g;
}

// ---------- minijuego 2: «Memoria de colores» (Simon de 4 botones) ----------
export const MEM_COLORES = ['rojo', 'verde', 'azul', 'amarillo'];
export function memoriaNueva(rnd = Math.random) { return { sec: [Math.floor(rnd() * 4) % 4], idx: 0, ronda: 1, estado: 'mostrar', puntos: 0 }; }
export function memoriaPulsa(m, c, rnd = Math.random) {
  const o = { sec: m.sec.slice(), idx: m.idx, ronda: m.ronda, estado: m.estado, puntos: m.puntos };
  if (o.estado !== 'turno') return { m: o, r: 'ignorado' };
  if (c !== o.sec[o.idx]) { o.estado = 'fin'; return { m: o, r: 'fallo' }; }
  o.idx++;
  if (o.idx >= o.sec.length) { o.puntos = o.sec.length; o.ronda++; o.sec.push(Math.floor(rnd() * 4) % 4); o.idx = 0; o.estado = 'mostrar'; return { m: o, r: 'ronda' }; }
  return { m: o, r: 'bien' };
}
