// ================= v13.6 · SUBASTA DE ENCARGOS (juego online del equipo, con fichas) =================
// Reglas y árbitro en el servidor (server/30_subasta.gs). Aquí solo se muestra la partida y se manda la carta elegida.
// Conexión: consulta ligera cada 1,5 s mientras juegas (Apps Script no admite WebSocket); si no cambia nada, el servidor
// responde «igual» sin datos. Si cierras la pantalla a mitad de partida, el servidor juega por ti en automático.
import { h, btn, sel, confirmDlg } from '../ui.js';
import { pon, llamar, cargando, errorCaja, reloj, fiesta, cabecera, aviso, setSaldo, leerFichas } from './kit.js';

export const meta = { id: 'subasta', titulo: 'Subasta de encargos', emoji: '🔨', desc: 'Juego online con fichas.' };
const carta = v => h('div.sb-carta' + (v < 0 ? '.neg' : '.pos'), h('span.sb-v', (v > 0 ? '+' : '') + v), h('span.sb-t', v < 0 ? 'reclamación' : 'encargo'));
const REGLAS = () => h('details.sb-reglas', h('summary', '📖 Cómo se juega (1 minuto)'),
  h('ol.small', h('li', 'Hay 15 rondas. En cada una sale un ', h('b', 'encargo'), ' (+1 a +10 puntos) o una ', h('b', 'reclamación'), ' (−1 a −5).'),
    h('li', 'Todos tenéis las mismas cartas de horas de taller: 1 a 15. A la vez y a ciegas, cada uno pone una.'),
    h('li', 'Encargo: se lo lleva la puja ', h('b', 'más alta que nadie haya repetido'), '. Reclamación: se la come la puja ', h('b', 'más baja no repetida'), '.'),
    h('li', 'Si dos ponen la misma carta, se anulan. Si nadie queda solo, el encargo se acumula a la ronda siguiente.'),
    h('li', 'Cada carta se usa una vez. Gana quien más puntos tenga al final y se lleva el bote de fichas (si hay empate, se reparte).'),
    h('li', 'Tienes 40 s por ronda; si no pujas, juegas automáticamente tu carta más baja. Salir a mitad = pierdes tu entrada.')));

export function render(el) {
  const R = reloj(); let vivo = true, g = null, polling = false, pujando = false, ultimaRonda = 0;
  const raiz = h('div.sb'); el.append(raiz);
  async function lobby() {
    R.fin(); g = null;
    pon(raiz, cargando('Buscando partidas…'));
    let L; try { L = await llamar('subasta.lobby', {}, { silencio: true }); } catch (e) { return vivo && pon(raiz, errorCaja(e, lobby)); }
    if (!vivo) return;
    setSaldo(L.saldo);
    if (L.mia) { g = L.mia; return partida(); }
    const ent = sel(L.entradas.map(x => ({ v: x, t: x ? x + ' fichas de entrada' : 'Amistosa (sin fichas)' })), 2, { 'aria-label': 'Entrada' });
    pon(raiz, 
      cabecera('🔨 Subasta de encargos', 'Tienes ' + L.saldo + ' fichas · partidas con fichas hoy: ' + L.hoyPagadas + ' de ' + L.maxDia),
      L.devueltas ? aviso('Se han devuelto entradas de partidas que no llegaron a jugarse.', 'ok') : null,
      REGLAS(),
      h('div.jg-card', { style: { marginTop: '12px' } }, h('h3', 'Crear partida online'), h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, ent,
        btn('Crear y esperar jugadores', async ev => { ev.target.closest('button').disabled = true; try { g = await llamar('subasta.crear', { entrada: Number(ent.value) }); leerFichas(true); partida(); } catch (e) { ev.target.closest('button').disabled = false; } }, { cls: 'primary' }),
        btn('🤖 Practicar contra la máquina (gratis)', async () => { try { g = await llamar('subasta.crear', { practica: true }); partida(); } catch (e) { } }, { cls: 'ghost' })),
        h('p.tiny.muted', 'De 2 a 5 personas del equipo. El bote es la suma de las entradas. Las fichas se ganan usando la app.')),
      h('div.jg-card', { style: { marginTop: '12px' } }, h('h3', 'Partidas esperando jugadores'),
        L.abiertas.length ? L.abiertas.map(a => h('div.sb-abierta', h('div.grow', h('b', 'De ' + a.por), h('div.tiny.muted', a.jugadores.join(', ') + ' · ' + (a.entrada ? a.entrada + ' fichas de entrada' : 'amistosa'))),
          btn('Unirme', async () => { if (a.entrada && !(await confirmDlg('Unirte a la partida', 'La entrada son ' + a.entrada + ' fichas. Si ganas te llevas el bote.', 'Unirme'))) return; try { g = await llamar('subasta.unirse', { id: a.id }); leerFichas(true); partida(); } catch (e) { lobby(); } }, { cls: 'primary sm' })))
          : h('p.muted.small', 'Ahora mismo no hay ninguna. ¡Crea tú una y avisa por el chat!'),
        btn('Actualizar', lobby, { cls: 'ghost sm', icon: 'refresh' })),
      L.ranking.length ? h('div.jg-card', { style: { marginTop: '12px' } }, h('h3', '🏆 Clasificación'), h('table.jg-tabla', h('tr', h('th', 'Persona'), h('th', 'Ganadas'), h('th', 'Jugadas'), h('th', 'Fichas ±')),
        L.ranking.map(r => h('tr' + (r.yo ? '.yo' : ''), h('td', r.n), h('td', String(r.g)), h('td', String(r.j)), h('td', (r.neto > 0 ? '+' : '') + r.neto))))) : null);
    R.i(() => { if (document.visibilityState === 'visible' && vivo && !g) refrescaLobby(); }, 8000);
  }
  async function refrescaLobby() { try { const L = await llamar('subasta.lobby', {}, { silencio: true }); if (L.mia && vivo) { g = L.mia; partida(); } } catch (e) { } }

  function partida() {
    R.fin(); pinta();
    R.i(sondea, g.estado === 'espera' ? 3000 : 1500);
  }
  async function sondea() {
    if (polling || !g || !vivo || document.visibilityState !== 'visible') return;
    polling = true;
    try { const r = await llamar('subasta.estado', { id: g.id, rev: g.rev }, { silencio: true, timeout: 20000 }); if (r.igual) { g.quedaMs = r.quedaMs; pintaReloj(); } else { const antes = g.estado; g = r; if (antes === 'espera' && g.estado === 'juega') { R.fin(); R.i(sondea, 1500); } pinta(); } }
    catch (e) { if (e.code === 'VALIDATION') { polling = false; return lobby(); } }
    polling = false;
  }
  let relojEl = null, relojT0 = 0;
  function pintaReloj() { if (!relojEl || !g || g.estado !== 'juega') return; relojT0 = Date.now(); const s = Math.ceil((g.quedaMs || 0) / 1000); relojEl.textContent = '⏱ ' + s + ' s'; relojEl.classList.toggle('poco', s <= 10); }
  function pinta() {
    if (!vivo || !g) return;
    if (g.estado === 'cancelada') { pon(raiz, h('div.jg-empty', h('div.jg-empty-ic', '🚫'), h('h3', 'Partida cancelada'), h('p.muted', g.motivo || ''), btn('Volver', lobby, { cls: 'primary' }))); R.fin(); return; }
    const yo = g.jugadores.find(p => p.id === g.yo);
    const jugadores = h('div.sb-jug', g.jugadores.map(p => h('div.sb-p' + (p.id === g.yo ? '.yo' : '') + (p.listo ? '.listo' : ''), h('b', (p.bot ? '🤖 ' : '') + p.n), h('span', p.puntos + ' pts'), g.estado === 'juega' ? h('span.tiny', p.listo ? '✓ ha pujado' : p.fuera ? '🚪 se fue (automático)' : p.auto ? '⏳ automático ×' + p.auto : '… pensando') : null)));
    if (g.estado === 'espera') {
      const soyCreador = g.creador === g.yo;
      pon(raiz, cabecera('⏳ Esperando jugadores', (g.entrada ? 'Entrada ' + g.entrada + ' fichas · bote ' + g.bote : 'Partida amistosa') + ' · ' + g.jugadores.length + '/5'),
        jugadores, REGLAS(),
        h('div.row', { style: { gap: '8px', marginTop: '12px', flexWrap: 'wrap' } }, soyCreador ? btn('Empezar ya', async ev => { ev.target.closest('button').disabled = true; try { g = await llamar('subasta.empezar', { id: g.id }); partida(); } catch (e) { ev.target.closest('button').disabled = false; } }, { cls: 'primary', disabled: g.jugadores.length < 2 }) : h('span.small.muted', 'Esperando a que quien la creó la empiece…'),
          btn(soyCreador ? 'Cancelar partida' : 'Salir', salir, { cls: 'ghost' })),
        h('p.tiny.muted', 'Avisa al equipo por el chat. Si nadie se une en 10 minutos, se cancela y se devuelven las entradas.'));
      return;
    }
    if (g.estado === 'fin') {
      R.fin();
      const res = g.resultado || {}, gane = (res.ganadores || []).includes(yo && yo.n);
      pon(raiz, h('div.jg-empty', h('div.jg-empty-ic', res.abandonada ? '🚪' : gane ? '🏆' : '🔨'), h('h3', res.abandonada ? 'Has salido de la práctica' : gane ? '¡Has ganado!' : 'Gana ' + (res.ganadores || []).join(' y ')),
        res.bote ? h('p', 'Bote: ' + res.bote + ' fichas' + (res.reparto && yo && res.reparto[yo.id] ? ' · te llevas ' + res.reparto[yo.id] : '')) : h('p.muted', g.practica ? 'Práctica: sin fichas' : 'Partida amistosa'),
        jugadores, h('div.row', { style: { gap: '8px' } }, btn('Volver a la sala', lobby, { cls: 'primary' }))));
      if (gane) fiesta(document.body);
      leerFichas(true);
      return;
    }
    // ---- jugando ----
    const sumAcum = (g.acumulado || []).reduce((a, b) => a + b, 0);
    relojEl = h('span.sb-reloj');
    const ult = g.historial && g.historial.length ? g.historial[g.historial.length - 1] : null;
    if (ult && ult.ronda !== ultimaRonda) { ultimaRonda = ult.ronda; }
    const mano = h('div.sb-mano', Array.from({ length: 15 }, (_, i) => i + 1).map(c => {
      const tengo = g.mano.includes(c);
      return h('button.sb-h' + (g.miPuja === c ? '.elegida' : ''), { type: 'button', disabled: !tengo || !!g.miPuja || pujando, 'data-c': c, 'aria-label': 'Pujar ' + c + ' horas', onclick: () => pujar(c) }, String(c));
    }));
    pon(raiz, 
      h('div.tv-meta', h('b', 'Ronda ' + g.ronda + ' de ' + g.rondas), g.entrada ? h('span', '💰 bote ' + g.bote + ' fichas') : h('span', g.practica ? '🤖 práctica' : 'amistosa'), h('span.grow'), relojEl),
      h('div.sb-mesa', carta(g.carta), g.acumulado && g.acumulado.length ? h('div.sb-acum', '+ acumulado: ' + g.acumulado.map(v => (v > 0 ? '+' : '') + v).join(' '), h('div.tiny', 'En juego: ' + (sumAcum + g.carta > 0 ? '+' : '') + (sumAcum + g.carta) + ' puntos')) : null,
        h('div.small', (sumAcum + g.carta) < 0 ? '⚠️ Reclamación: se la come la puja MÁS BAJA no repetida' : '✨ Encargo: se lo lleva la puja MÁS ALTA no repetida')),
      jugadores,
      ult ? h('div.sb-ult', h('b', 'Ronda ' + ult.ronda + ': '), ult.gana ? ult.n + ' se lleva ' + ult.cartas.map(v => (v > 0 ? '+' : '') + v).join(' ') : 'nadie quedó solo: se acumula', h('div.tiny.muted', Object.keys(ult.pujas).map(u => (g.jugadores.find(p => p.id === u) || {}).n + ': ' + ult.pujas[u]).join(' · '))) : null,
      g.miPuja ? aviso('Has puesto ' + g.miPuja + ' horas. Esperando a los demás…', 'info') : aviso('Elige tus horas de taller para esta ronda:', 'warn'),
      mano,
      h('div.row', { style: { justifyContent: 'flex-end', marginTop: '8px' } }, btn('Abandonar', salir, { cls: 'ghost sm' })));
    pintaReloj();
  }
  R.i(() => { if (relojEl && g && g.estado === 'juega') { const s = Math.max(0, Math.ceil(((g.quedaMs || 0) - (Date.now() - relojT0)) / 1000)); relojEl.textContent = '⏱ ' + s + ' s'; relojEl.classList.toggle('poco', s <= 10); } }, 500);
  async function pujar(c) {
    if (pujando || !g || g.miPuja) return; pujando = true;
    raiz.querySelectorAll('.sb-h').forEach(b => { b.disabled = true; if (Number(b.dataset.c) === c) b.classList.add('elegida'); });
    try { g = await llamar('subasta.pujar', { id: g.id, carta: c, ronda: g.ronda }); } catch (e) { try { g = await llamar('subasta.estado', { id: g.id }, { silencio: true }); } catch (x) { } }
    pujando = false; pinta();
  }
  async function salir() {
    const juega = g && g.estado === 'juega' && !g.practica && g.entrada;
    if (juega && !(await confirmDlg('Abandonar la partida', 'Si te vas ahora pierdes tu entrada de ' + g.entrada + ' fichas y la partida sigue sin ti (en automático).', 'Abandonar', true))) return;
    try { await llamar('subasta.salir', { id: g.id }); } catch (e) { }
    leerFichas(true); lobby();
  }
  lobby();
  return { destroy() { vivo = false; R.fin(); } };
}
