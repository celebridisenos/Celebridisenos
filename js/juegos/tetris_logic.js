// ================= v13.4 · Descanso 🎮 : «Capas» — lógica PURA del Tetris (sin DOM; se prueba en Node) =================
// Tablero 10×20, 7 piezas con bolsa de 7 (RNG inyectable), rotación SRS con «wall kicks», fantasma, hold, niveles y puntuación estándar.
// Convenciones: tablero[y][x] (y=0 arriba). Cada celda vale 0 (vacía) o la letra de la pieza que la rellenó.
// pieza = { t, r, x, y }: tipo, rotación 0..3 (0 = aparición, 1 = derecha, 2 = giro doble, 3 = izquierda) y esquina sup. izq. de su caja.

export const COLS = 10, FILAS = 20;
export const TIPOS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
export const PUNTOS_LINEAS = [0, 100, 300, 500, 800]; // 0,1,2,3,4 líneas (× nivel)
export const LINEAS_POR_NIVEL = 10;
export const COLA = 5; // piezas «siguientes» que se mantienen generadas (la pantalla enseña 3)

const BASE = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
};
const giraMatriz = m => { const n = m.length; return m.map((_, y) => m.map((__, x) => m[n - 1 - x][y])); }; // 90° a la derecha
// FORMAS[t][r] = matriz n×n de la pieza t girada r veces a la derecha
export const FORMAS = {};
for (const t of TIPOS) { const l = [BASE[t]]; for (let i = 1; i < 4; i++) l.push(giraMatriz(l[i - 1])); FORMAS[t] = l; }
export const forma = (t, r) => FORMAS[t][((r % 4) + 4) % 4];
// Celdas ocupadas [x, y] relativas a la caja
export function celdas(t, r) { const m = forma(t, r), out = []; for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++) if (m[y][x]) out.push([x, y]); return out; }

// Patadas de pared SRS (x derecha, y ARRIBA como en la guía; se invierte al aplicar). Clave «de>a».
const KICK_JLSTZ = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};
const KICK_I = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};
export const patadas = (t, de, a) => t === 'O' ? [[0, 0]] : (t === 'I' ? KICK_I : KICK_JLSTZ)[de + '>' + a];

// ---------- RNG determinista (para pruebas y partidas repetibles) ----------
export function rngSemilla(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Bolsa de 7: cada 7 piezas salen las 7 distintas, una vez cada una, en orden aleatorio
export function crearBolsa(rng = Math.random) {
  let resto = [];
  return {
    sig() {
      if (!resto.length) {
        resto = TIPOS.slice();
        for (let i = resto.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor(rng() * (i + 1))); [resto[i], resto[j]] = [resto[j], resto[i]]; }
      }
      return resto.pop();
    },
    get pendientes() { return resto.slice(); }
  };
}

// ---------- Tablero ----------
export const tableroVacio = () => Array.from({ length: FILAS }, () => Array(COLS).fill(0));
// Colisión de la pieza (t, r) con la caja en (x, y): paredes, suelo o bloques. Por encima del tablero (y<0) no choca.
export function colisiona(tablero, t, r, x, y) {
  for (const [dx, dy] of celdas(t, r)) {
    const cx = x + dx, cy = y + dy;
    if (cx < 0 || cx >= COLS || cy >= FILAS) return true;
    if (cy >= 0 && tablero[cy][cx]) return true;
  }
  return false;
}

// ---------- Partida ----------
export const nivelDe = (lineas, inicial = 1) => inicial + Math.floor(lineas / LINEAS_POR_NIVEL);
// Milisegundos por fila de caída (curva de la guía, con un mínimo para que siga siendo jugable)
export const velocidad = nivel => Math.max(50, Math.round(1000 * Math.pow(Math.max(0.05, 0.8 - (nivel - 1) * 0.007), nivel - 1)));

export function nuevaPartida(opts = {}) {
  const rng = opts.rng || Math.random, bolsa = crearBolsa(rng), inicial = opts.nivel || 1;
  const s = { tablero: tableroVacio(), bolsa, cola: [], pieza: null, hold: null, holdUsado: false, puntos: 0, lineas: 0, nivelInicial: inicial, nivel: inicial, combo: -1, fin: false, pendientes: null };
  while (s.cola.length < COLA) s.cola.push(bolsa.sig());
  aparece(s);
  return s;
}
export const posInicial = t => ({ x: Math.floor((COLS - forma(t, 0).length) / 2), y: t === 'I' ? -1 : 0 });
// Saca la siguiente pieza (o la indicada, para el hold). Si no cabe → fin de partida.
export function aparece(s, tipo) {
  const t = tipo || s.cola.shift();
  if (!tipo) while (s.cola.length < COLA) s.cola.push(s.bolsa.sig());
  const p = posInicial(t); s.pieza = { t, r: 0, x: p.x, y: p.y };
  if (colisiona(s.tablero, t, 0, p.x, p.y)) s.fin = true;
  return !s.fin;
}
const activa = s => !s.fin && s.pieza && !s.pendientes;

export function mover(s, dx) {
  if (!activa(s)) return false; const p = s.pieza;
  if (colisiona(s.tablero, p.t, p.r, p.x + dx, p.y)) return false;
  p.x += dx; return true;
}
// dir: +1 derecha (horario), -1 izquierda. Prueba las 5 patadas SRS; devuelve true si giró.
export function rotar(s, dir) {
  if (!activa(s)) return false; const p = s.pieza, a = (p.r + dir + 4) % 4;
  for (const [kx, ky] of patadas(p.t, p.r, a)) {
    if (!colisiona(s.tablero, p.t, a, p.x + kx, p.y - ky)) { p.r = a; p.x += kx; p.y -= ky; return true; }
  }
  return false;
}
export const enSuelo = s => !!s.pieza && colisiona(s.tablero, s.pieza.t, s.pieza.r, s.pieza.x, s.pieza.y + 1);
// Baja una fila. suave=true (soft drop del jugador) suma 1 punto por fila; la gravedad no suma.
export function bajar(s, suave = true) {
  if (!activa(s) || enSuelo(s)) return false;
  s.pieza.y++; if (suave) s.puntos += 1; return true;
}
// Fila a la que llegaría la pieza si se dejara caer (pieza fantasma)
export function fantasmaY(s) {
  if (!s.pieza) return 0; const p = s.pieza; let y = p.y;
  while (!colisiona(s.tablero, p.t, p.r, p.x, y + 1)) y++;
  return y;
}
// Caída dura: baja del todo (+2 por fila) y bloquea. Devuelve el resultado de bloquear() + { dist }
export function caidaDura(s, opts) {
  if (!activa(s)) return null; const y = fantasmaY(s), d = y - s.pieza.y; s.pieza.y = y; s.puntos += 2 * d;
  const r = bloquear(s, opts); r.dist = d; return r;
}
// Guarda la pieza (hold): una sola vez por pieza. Si ya había una guardada, se intercambian.
export function guardar(s) {
  if (!activa(s) || s.holdUsado) return false;
  const t = s.pieza.t, antes = s.hold; s.hold = t;
  aparece(s, antes || undefined); s.holdUsado = true; return true;
}
// Fija la pieza en el tablero. Con {diferir:true} y líneas completas, deja el borrado pendiente (para animarlo) y hay que llamar a termina().
export function bloquear(s, opts = {}) {
  if (!s.pieza || s.fin) return { lineas: 0, fin: true };
  const p = s.pieza; let fuera = false;
  for (const [dx, dy] of celdas(p.t, p.r)) { const cx = p.x + dx, cy = p.y + dy; if (cy < 0) fuera = true; else s.tablero[cy][cx] = p.t; }
  s.pieza = null;
  if (fuera) { s.fin = true; s.holdUsado = false; return { lineas: 0, fin: true, filas: [] }; } // bloqueada por encima del tablero
  const filas = []; for (let y = 0; y < FILAS; y++) if (s.tablero[y].every(Boolean)) filas.push(y);
  s.pendientes = filas;
  if (filas.length && opts.diferir) return { lineas: filas.length, filas, pendiente: true };
  return termina(s);
}
// Borra las líneas pendientes, puntúa (1/2/3/4 líneas × nivel + combo), sube de nivel y saca la pieza siguiente.
export function termina(s) {
  const filas = s.pendientes || [], n = filas.length, nivelAntes = s.nivel; let ganado = 0;
  if (n) {
    const quitar = new Set(filas); s.tablero = s.tablero.filter((_, y) => !quitar.has(y));
    while (s.tablero.length < FILAS) s.tablero.unshift(Array(COLS).fill(0));
    ganado += PUNTOS_LINEAS[Math.min(4, n)] * s.nivel;
    s.combo++; if (s.combo > 0) ganado += 50 * s.combo * s.nivel;
    s.lineas += n; s.nivel = nivelDe(s.lineas, s.nivelInicial); s.puntos += ganado;
  } else s.combo = -1;
  s.pendientes = null; s.holdUsado = false;
  aparece(s);
  return { lineas: n, filas, puntos: ganado, combo: s.combo, nivelSube: s.nivel > nivelAntes, nivel: s.nivel, fin: s.fin };
}
// Un «tic» de gravedad: baja una fila o, si ya está en el suelo, bloquea. Devuelve null o el resultado de bloquear().
export function paso(s, opts) {
  if (!activa(s)) return null;
  if (bajar(s, false)) return null;
  return bloquear(s, opts);
}
