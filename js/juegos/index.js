// v13.4 · Catálogo de juegos de «Descanso». Cada juego es un módulo con:
//   export const meta = { id, titulo, emoji, desc }
//   export function render(el, ctx) → { destroy() }      (ctx: { api, me, h, btn, toast, volver })
// Se cargan solo al abrirlos. Ningún juego toca los datos reales del negocio (pedidos, stock, puntos…).
export const JUEGOS = [
  { id: 'mascota', titulo: 'Bobi, tu mascota', emoji: '🐣', desc: 'Críala desde el huevo: come, juega, duerme y crece. Tiene ánimo propio.', tag: 'Se queda contigo', cargar: () => import('./mascota.js') },
  { id: 'tresenraya', titulo: 'Tres en raya', emoji: '❌', desc: 'Contra la máquina (de fácil a imposible) o ONLINE contra alguien del equipo conectado.', tag: 'Online', cargar: () => import('./tresenraya.js') },
  { id: 'detectives', titulo: 'Detectives del taller', emoji: '🕵️', desc: 'Casos infinitos: lee las pistas, deduce quién fue.', tag: 'Infinito', cargar: () => import('./detectives.js') },
  { id: 'sopa', titulo: 'Sopa de ideas', emoji: '🔤', desc: 'Sopa de letras infinita. Cada palabra que encuentras es una idea de qué fabricar.', tag: 'Infinito', cargar: () => import('./sopa.js') },
  { id: 'tetris', titulo: 'Capas', emoji: '🎁', desc: 'La sorpresa: apila piezas como capas de una impresión 3D.', tag: 'Sorpresa', cargar: () => import('./tetris.js') },
  { id: 'fusiona', titulo: 'Fusiona bobinas', emoji: '🧵', desc: 'Un 2048 con filamento. Junta bobinas iguales hasta la de oro.', tag: '', cargar: () => import('./fusiona.js') }
];
