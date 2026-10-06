// v13.6 · Catálogo de juegos de «Descanso». Cada juego es un módulo con:
//   export const meta = { id, titulo, emoji, desc }
//   export function render(el, ctx) → { destroy() }      (ctx: { api, me, h, btn, toast, volver })
// Se cargan solo al abrirlos. Ningún juego toca los datos reales del negocio (pedidos, stock, clientes…).
// Los 6 juegos principales + la Sopa de letras salen en el menú. Los descartados (Bobi, Capas, Fusiona, Tres en raya)
// se conservan con «oculto: true»: no salen en el menú pero su código, sus pruebas y su dirección siguen funcionando.
// «detectives» (casos rápidos infinitos) también está oculto: se abre desde el juego Detectives (expedientes).
export const JUEGOS = [
  { id: 'vida', titulo: 'Vida', emoji: '🌸', desc: 'Tu barrio en pixel con tus compañeros: huerto, casa que decoras mueble a mueble, probador de ropa, misiones diarias, mercadillo, Club VIP… y tu personaje crece (1 día real = 1 año).', tag: 'Barrio', cargar: () => import('./vida.js') },
  { id: 'trivial', titulo: 'Trivial', emoji: '🧠', desc: 'Más de 400 preguntas en 14 categorías. Solo o por equipos.', tag: 'Equipos', cargar: () => import('./trivial.js') },
  { id: 'ahorcado', titulo: 'Ahorcado', emoji: '🪢', desc: 'Adivina la palabra letra a letra antes de que se complete el dibujo.', tag: '', cargar: () => import('./ahorcado.js') },
  { id: 'puesto', titulo: 'Mi puesto del mercado', emoji: '🧺', desc: 'Atiende a los clientes de tu puesto antes de que se cansen. Lo que ganas va de verdad a la hucha de tu personaje de Vida.', tag: 'Nuevo', cargar: () => import('./puesto.js') },
  { id: 'sopa', titulo: 'Sopa de ideas', emoji: '🔤', desc: 'Sopa de letras infinita. Cada palabra que encuentras es una idea de qué fabricar.', tag: 'Infinito', cargar: () => import('./sopa.js') },
  // ---- descartados (se conservan, ocultos) ----
  // v13.12: la Subasta sale del menú (el dueño: «no se entiende, no compras nada real»). La sustituye «Mi puesto del mercado».
  { id: 'subasta', titulo: 'Subasta de encargos', emoji: '🔨', desc: 'Juego ONLINE con el equipo: puja a ciegas tus horas de taller por los mejores encargos. Se juega con fichas.', tag: 'Online', oculto: true, cargar: () => import('./subasta.js') },
  // v13.9: Detectives y Fichas salen del menú (el dueño lo pidió para dar más espacio a Vida). Siguen funcionando por su dirección.
  { id: 'expedientes', titulo: 'Detectives', emoji: '🕵️', desc: '50 expedientes: escenas, pruebas, declaraciones y documentos. Resuelve quién, cómo y por qué.', tag: '50 casos', oculto: true, cargar: () => import('./expedientes.js') },
  { id: 'fichas', titulo: 'Fichas ⏱', emoji: '⏱', desc: 'Tu monedero: las fichas se ganan con tiempo activo en la app y se usan en los juegos.', tag: 'Monedero', oculto: true, cargar: () => import('./fichas.js') },
  { id: 'mascota', titulo: 'Bobi, tu mascota', emoji: '🐣', desc: 'Críala desde el huevo.', oculto: true, cargar: () => import('./mascota.js') },
  { id: 'tresenraya', titulo: 'Tres en raya', emoji: '❌', desc: 'Contra la máquina u online.', oculto: true, cargar: () => import('./tresenraya.js') },
  { id: 'detectives', titulo: 'Detectives · casos rápidos', emoji: '🕵️', desc: 'Casos infinitos generados al momento.', oculto: true, cargar: () => import('./detectives.js') },
  { id: 'tetris', titulo: 'Capas', emoji: '🎁', desc: 'Apila piezas como capas.', oculto: true, cargar: () => import('./tetris.js') },
  { id: 'fusiona', titulo: 'Fusiona bobinas', emoji: '🧵', desc: 'Un 2048 con filamento.', oculto: true, cargar: () => import('./fusiona.js') }
];
