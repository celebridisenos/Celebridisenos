// ================= 17-11-2026 · 🤖 SHAMPÚ: lo que comparten la pantalla y el puente =================
// Las órdenes son las mismas que acepta el programa del PC (desktop/host/shampu.go) y el servidor (51_shampu.gs), y las que da quien programa a Shampú
// en el portátil (nota del 17-11 en COORDINACION/RELEVO): nunca 8 (olvida el wifi) ni 9, 10 o 12.

export const MOVER = [
  { o: 4, e: '⬅', t: 'Izquierda' }, { o: 5, e: '⬆', t: 'Al frente' }, { o: 6, e: '➡', t: 'Derecha' },
];
export const CUERPO = [{ o: 20, e: '↶', t: 'Cuerpo a la izquierda' }, { o: 21, e: '↷', t: 'Cuerpo a la derecha' }];
export const TRUCOS = [
  { o: 15, e: '💃', t: 'Baila' }, { o: 18, e: '↻', t: 'Vuelta' }, { o: 11, e: '🤭', t: 'Cosquillas' }, { o: 13, e: '🤔', t: 'Pensar' },
  { o: 19, e: '⛅', t: 'El tiempo' }, { o: 14, e: '👂', t: 'Escúchame (20 s)' }, { o: 7, e: '🩺', t: 'Chequeo' },
];
export const PANTALLAS = [
  { m: -1, e: '👁', t: 'Como está ahora' }, { m: 0, e: '🙂', t: 'Su cara' }, { m: 2, e: '🕒', t: 'Reloj' }, { m: 3, e: '⛅', t: 'El tiempo' },
  { m: 8, e: '🖨️', t: 'Impresoras' }, { m: 16, e: '📅', t: 'Calendario' }, { m: 20, e: '📱', t: 'Su app' }, { m: 1, e: '☰', t: 'Menú' },
];
export const RELOJES = [{ e: 0, t: 'Tarjetas' }, { e: 1, t: 'Agujas' }, { e: 2, t: 'Noche' }];
export const COLORES_AVISO = [{ c: 'a', t: 'Azul', col: '#2858c8' }, { c: 'v', t: 'Verde', col: '#1e963c' }, { c: 'n', t: 'Naranja', col: '#ff8c00' }, { c: 'r', t: 'Rojo', col: '#e02020' }];
export const MENSAJES_RAPIDOS = ['Vuelvo enseguida', 'Hay un pedido nuevo', 'Llamame cuando puedas', 'La comida esta lista', 'Mira el movil'];
export const LAMPARA = [
  { lamp: 0, t: 'Apagada', c: '#20243a' }, { lamp: 1, t: 'Cálida', c: '#FFB46B' }, { lamp: 2, t: 'Amarilla', c: '#FFD000' }, { lamp: 3, t: 'Cian', c: '#00E0FF' },
  { lamp: 4, t: 'Rosa', c: '#FF4FA0' }, { lamp: 5, t: 'Verde', c: '#40FF60' }, { lamp: 6, t: 'Blanca', c: '#FFFFFF' }, { lamp: 7, t: 'Arcoíris', c: 'conic-gradient(#f44,#fd0,#4f6,#0df,#a4f,#f44)' },
];
export const BRILLO = [{ brillo: 0, t: '🌑 Mínimo' }, { brillo: 1, t: '🌘 Bajo' }, { brillo: 2, t: '🌗 Medio' }, { brillo: 3, t: '🌕 Máximo' }];
export const VOLUMEN = [{ vol: 0, t: '🔇 Silencio' }, { vol: 1, t: 'Bajo' }, { vol: 2, t: 'Medio' }, { vol: 3, t: 'Alto' }];
export const FRASES = [
  { o: 1000, t: '¡Hola! Soy Shampú, de CelebriDiseños.' }, { o: 1001, t: '¡Hola, jefe! ¿Qué inventamos hoy?' }, { o: 1003, t: '¡Te veo, te veo!' },
  { o: 1011, t: '¿Sabes por qué los robots no tienen miedo? Porque tienen nervios de acero.' }, { o: 1004, t: '¡Ja, ja! ¡Cosquillas no!' },
  { o: 1010, t: 'Qué aburrimiento... ¿Hacemos algo?' }, { o: 1012, t: 'Mmm... Déjame pensar.' }, { o: 1009, t: 'Me voy a echar una siestecita.' }, { o: 1008, t: 'Gracias. Ya estoy de pie.' },
];
export const TELE = [
  { pc: 'tecla:KEY_POWER', e: '⏻', t: 'Apagar', cls: 'rojo' }, { pc: 'tecla:KEY_MUTE', e: '🔇', t: 'Silencio' }, { pc: 'tecla:KEY_HOME', e: '🏠', t: 'Inicio' },
  { pc: 'tecla:KEY_VOLDOWN,KEY_VOLDOWN', e: '🔉', t: 'Volumen −' }, { pc: 'tecla:KEY_UP', e: '▲', t: 'Arriba' }, { pc: 'tecla:KEY_VOLUP,KEY_VOLUP', e: '🔊', t: 'Volumen +' },
  { pc: 'tecla:KEY_LEFT', e: '◀', t: 'Izquierda' }, { pc: 'tecla:KEY_ENTER', e: 'OK', t: 'Aceptar', cls: 'ok' }, { pc: 'tecla:KEY_RIGHT', e: '▶', t: 'Derecha' },
  { pc: 'tecla:KEY_RETURN', e: '↩', t: 'Atrás' }, { pc: 'tecla:KEY_DOWN', e: '▼', t: 'Abajo' }, { pc: 'tecla:KEY_PLAY', e: '⏯', t: 'Play / pausa' },
  { pc: 'tecla:KEY_CHDOWN', e: 'CH −', t: 'Canal −' }, { pc: 'tecla:KEY_SOURCE', e: '⇄', t: 'Fuente' }, { pc: 'tecla:KEY_CHUP', e: 'CH +', t: 'Canal +' },
];
export const APPS_TELE = [
  { pc: 'youtube', t: 'YouTube', c: '#e22' }, { pc: 'netflix', t: 'Netflix', c: '#900' }, { pc: 'prime', t: 'Prime', c: '#0a7bd6' },
  { pc: 'disney', t: 'Disney+', c: '#123b8f' }, { pc: 'spotify', t: 'Spotify', c: '#1db954' }, { pc: 'tele_on', t: '⏻ Encender', c: '#2a3570' }, { pc: 'tele_off', t: '⏻ Apagar', c: '#5a1a1a' },
];
export const IMP_ESTADO = { RUNNING: ['Imprimiendo', 'info'], FINISH: ['Terminada', 'ok'], FAILED: ['¡Fallo!', 'bad'], PAUSE: ['En pausa', 'warn'], IDLE: ['Libre', 'muted'], PREPARE: ['Preparando', 'info'], SIN_CONEXION: ['Sin conexión', 'muted'] };

// Qué es cada orden, para avisar en palabras («Shampú ya está vigilando»)
export function nombreOrden(o) {
  if (!o) return 'la orden';
  if (o.foto) return 'traer la foto';
  if (o.alerta) return 'el mensaje en su pantalla';
  if (o.pantalla !== undefined) return 'enseñar su pantalla';
  if (o.vol !== undefined) return 'el volumen';
  if (o.brillo !== undefined) return 'el brillo de su pantalla';
  if (o.di) return 'decirlo en voz alta';
  if (o.lamp !== undefined) return 'la lámpara (' + ((LAMPARA.find(x => x.lamp === o.lamp) || {}).t || '') + ')';
  if (o.pc) return 'la tele';
  if (o.cam) return 'la calidad de la cámara';
  const todos = { 1: 'empezar a vigilar', 2: 'parar de vigilar', 3: 'hacer una foto', 16: 'dormir', 17: 'despertar' };
  if (todos[o.o]) return todos[o.o];
  const x = [...MOVER, ...CUERPO, ...TRUCOS].find(m => m.o === o.o); if (x) return x.t.toLowerCase();
  if (o.o >= 1000) return 'decir la frase';
  return 'la orden';
}

// v_20261116_101739_2.jpg → { tipo: 'vigilancia', fecha } · r_… = ronda · lo demás, foto
export function leerFoto(n) {
  const m = /^([a-z])_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(n || '');
  const tipo = !m ? 'foto' : m[1] === 'v' ? 'vigilancia' : m[1] === 'r' ? 'ronda' : 'foto';
  const fecha = m ? new Date(+m[2], +m[3] - 1, +m[4], +m[5], +m[6], +m[7]) : null;
  return { n, tipo, fecha: fecha && !isNaN(fecha) ? fecha : null };
}
export function ordenarFotos(lista) {
  return (lista || []).map(leerFoto).sort((a, b) => (b.fecha ? b.fecha.getTime() : 0) - (a.fecha ? a.fecha.getTime() : 0) || (a.n < b.n ? 1 : -1));
}
export function diaDe(fecha) {
  if (!fecha) return 'Sin fecha';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(fecha); d.setHours(0, 0, 0, 0);
  const dif = Math.round((hoy - d) / 86400000);
  return dif === 0 ? 'Hoy' : dif === 1 ? 'Ayer' : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}
export const horaDe = f => f ? f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

// La cámara mira hacia atrás de la cabeza: giro 1 → 90°, 3 → 270° (como su app)
export const gradosDe = giro => giro === 1 ? 90 : giro === 3 ? 270 : 0;

// Wifi en rayas (dBm), voltios y el estado en palabras
export const rayasWifi = dbm => dbm === undefined || dbm === null ? 0 : dbm >= -55 ? 4 : dbm >= -65 ? 3 : dbm >= -75 ? 2 : dbm >= -85 ? 1 : 0;
export function voltios(mv) {
  if (mv === undefined || mv === null || mv < 0) return { v: null, t: 'sin medir', nivel: 'muted' };
  const v = mv / 1000;
  return { v, t: v.toFixed(2).replace('.', ',') + ' V', nivel: v >= 4.75 && v <= 5.3 ? 'ok' : v >= 4.5 ? 'warn' : 'bad' };
}
export function estadoEnPalabras(e) {
  if (!e) return { t: 'Sin datos', e: '❔', nivel: 'muted' };
  if (e.vigila) return { t: 'Vigilando', e: '🔴', nivel: 'bad' };
  const s = String(e.estado || '').toLowerCase();
  const M = { tranquilo: ['Tranquilo', '🟢', 'ok'], contento: ['Contento', '😊', 'ok'], dormido: ['Dormido', '😴', 'muted'], durmiendo: ['Dormido', '😴', 'muted'], aviso: ['¡Aviso!', '⚠️', 'warn'], alerta: ['¡Alerta!', '⚠️', 'bad'] };
  const x = M[s] || [s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Despierto', '🟢', 'ok'];
  return { t: x[0], e: x[1], nivel: x[2] };
}
export const nombrePantalla = m => ({ 0: 'Su cara', 1: 'Menú', 2: 'Reloj', 3: 'El tiempo', 8: 'Impresoras', 16: 'Calendario', 20: 'Su app' })[m] || (m === undefined || m === null ? '—' : 'Pantalla ' + m);
export function encendidoEnPalabras(s) {
  if (s === undefined || s === null || isNaN(s)) return '—';
  const d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60);
  return d ? d + (d === 1 ? ' día ' : ' días ') + hh + ' h' : hh ? hh + ' h ' + mm + ' min' : mm + ' min';
}
export const minutosEnPalabras = m => !m && m !== 0 ? '' : m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : '') : m + ' min';
export function haceCuanto(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '';
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 5 ? 'ahora mismo' : s < 60 ? 'hace ' + s + ' s' : s < 3600 ? 'hace ' + Math.round(s / 60) + ' min' : 'hace ' + Math.round(s / 3600) + ' h';
}

// ---------- 17-11 (tarde) · 🎥 calidad de la cámara y ⏱️ time-lapse ----------
// Lo que se puede elegir si el firmware de Shampú ya lo entiende (su /estado trae camTam). cal = calidad JPEG (menos = mejor).
export const CALIDADES = [{ cam: 'VGA', cal: 14, t: 'Fluida', d: '640×480 · la más suave' }, { cam: 'SVGA', cal: 12, t: 'Buena', d: '800×600' },
  { cam: 'HD', cal: 12, t: 'HD', d: '1280×720' }, { cam: 'FHD', cal: 14, t: 'Full HD', d: '1920×1080 · va más a saltos' }];
export const TL_CADA = [{ s: 1, t: '1 s' }, { s: 2, t: '2 s' }, { s: 5, t: '5 s', d: 'impresión 3D' }, { s: 10, t: '10 s' }, { s: 30, t: '30 s' }, { s: 60, t: '1 min' }];
export const TL_DURA = [{ m: 15, t: '15 min' }, { m: 30, t: '30 min' }, { m: 60, t: '1 h' }, { m: 120, t: '2 h' }, { m: 240, t: '4 h' }, { m: 480, t: '8 h' }, { m: 0, t: 'Hasta que lo pare' }];
export const TL_VIDEO = [{ s: 15, t: 'Vídeo de 15 s' }, { s: 30, t: 'Vídeo de 30 s' }, { s: 60, t: 'Vídeo de 1 min' }, { s: 0, t: 'Con todas las fotos' }];
export const fotosPrevistas = (cada, minutos) => minutos > 0 && cada > 0 ? Math.floor(minutos * 60 / cada) + 1 : 0;
// Cómo sale el vídeo con n fotos y una duración buscada (0 = todas, como mucho 3 min): imágenes por segundo, cuántas se usan y cada cuántas.
export function planVideo(n, seg) {
  if (!(n >= 2)) return null;
  let fps = 30;
  if (seg > 0 && n < seg * 30) fps = Math.max(10, Math.min(30, Math.round(n / seg)));
  const m = Math.min(n, seg > 0 ? seg * fps : 180 * 30);
  return { fps, m, paso: n / m, dur: m / fps };
}
export function duracionEnPalabras(s) {
  s = Math.max(0, Math.round(s || 0));
  if (s < 60) return s + ' s';
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  if (hh) return hh + ' h' + (mm ? ' ' + mm + ' min' : '');
  return mm + ' min' + (ss ? ' ' + ss + ' s' : '');
}
export const segEnPalabras = s => s < 60 ? s + (s === 1 ? ' segundo' : ' segundos') : s % 60 === 0 ? (s / 60) + (s === 60 ? ' minuto' : ' minutos') : duracionEnPalabras(s);
// «2026-11-17_12-30-05» → «Hoy · 12:30» (o el día)
export function fechaTL(id) {
  const m = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})/.exec(id || '');
  if (!m) return id || '';
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), dia = diaDe(d);
  return (dia === 'Hoy' || dia === 'Ayer' ? dia : dia.charAt(0).toUpperCase() + dia.slice(1)) + ' · ' + m[4] + ':' + m[5];
}
