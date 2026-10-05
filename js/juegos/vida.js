// ================= v13.6 · VIDA 🌸 — simulación de vida con personaje anime =================
// 1 día real = 1 año. Historia inicial (4 decisiones; la estrella decide chico o chica) → bebé → infancia → adolescencia →
// juventud → edad adulta → madurez. Necesidades que bajan con el tiempo real, casa con muebles, tienda de ropa, vehículo,
// mascota, estudios y trabajos con minijuegos, sucesos con decisiones y artículos premium con FICHAS.
// Toda la lógica y el catálogo están en shared/vida.js (datos ampliables); el SERVIDOR aplica las acciones y guarda.
import { h, btn, inp, confirmDlg, modal, toast, fdt } from '../ui.js';
import { pon, llamar, cargando, errorCaja, reloj, fiesta, aviso, setSaldo } from './kit.js';
import { avatar, mascotaDibujo } from './vida_avatar.js';
import { jugar } from './vida_minijuegos.js';
import { mundo } from './vida_mundo.js'; // v13.9: el barrio

export const meta = { id: 'vida', titulo: 'Vida', emoji: '🌸', desc: 'Tu personaje vive contigo.' };
let coreP = null;
function core() {
  if (window.VIDA) return Promise.resolve(window.VIDA);
  if (!coreP) coreP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vida_core.js'; s.onload = () => res(window.VIDA); s.onerror = () => { coreP = null; rej(new Error('No se pudo cargar el juego.')); }; document.head.appendChild(s); });
  return coreP;
}
const precio = it => it.fichas ? '⏱ ' + it.fichas + ' fichas' : it.precio ? '💰 ' + it.precio : 'Gratis';
const dur = ms => ms <= 0 ? '' : ms >= 3600000 ? Math.ceil(ms / 3600000) + ' h' : Math.ceil(ms / 60000) + ' min';

export function render(el) {
  const R = reloj(); let vivo = true, E = null, V = null, tab = 'barrio', offset = 0, M = null, sAhora = null;
  const raiz = h('div.vd'); el.append(raiz);
  const ahora = () => Date.now() + offset;
  async function carga() {
    pon(raiz, cargando('Abriendo tu vida…'));
    try { V = await core(); E = await llamar('vida.estado', {}, { silencio: true }); } catch (e) { return vivo && pon(raiz, errorCaja(e, carga)); }
    if (!vivo) return;
    offset = E.ahora - Date.now(); setSaldo(E.fichas);
    if (!E.vida) return historia();
    pinta();
  }
  async function hacer(a, d, ok, quiet) {
    try { const r = await llamar(a, d); E = r; offset = r.ahora - Date.now(); if (typeof r.saldo === 'number') setSaldo(r.saldo); else setSaldo(r.fichas); if (r.msg && !quiet) toast(r.msg, 'ok', 3500); if (ok) ok(r); pinta(); return r; }
    catch (e) { return null; } // llamar() ya enseña el motivo (p. ej. «No tienes fichas suficientes…»)
  }

  // ---------- Historia inicial ----------
  function historia() {
    const resp = []; let paso = 0;
    const caja = h('div.vd-historia');
    const sig = () => {
      if (paso < E.historia.length) {
        const p = E.historia[paso];
        pon(caja, h('div.vd-h-num', 'Capítulo ' + (paso + 1) + ' de ' + (E.historia.length + 1)), h('p.vd-h-txt', p.texto),
          h('div.vd-h-ops', p.opciones.map((o, i) => btn(o, () => { resp[paso] = i; paso++; sig(); }, { cls: 'vd-h-op' }))));
        return;
      }
      const sexo = resp[3] === 0 ? 'chica' : 'chico', sug = E.nombres[sexo];
      const nom = inp({ maxlength: 20, value: sug[Math.floor(Math.random() * sug.length)], 'aria-label': 'Nombre' });
      pon(caja, h('div.vd-h-num', 'Capítulo final'), h('p.vd-h-txt', sexo === 'chica' ? '✨ ¡Es una niña!' : '✨ ¡Es un niño!'), h('p', '¿Cómo se va a llamar?'), nom,
        h('div.row.wrap', { style: { gap: '6px', margin: '8px 0' } }, sug.slice(0, 6).map(n => h('button.chip', { type: 'button', onclick: () => { nom.value = n; } }, n))),
        btn('🌸 Nacer', () => hacer('vida.nacer', { respuestas: resp, nombre: nom.value, nuevaVida: !!E.nuevaVida }, () => fiesta(document.body)), { cls: 'primary' }));
    };
    pon(raiz, h('div.jg-card.vd-intro', h('h2', '🌸 Una vida nueva'), h('p.muted', 'Cada día real es un año en la vida de tu personaje. Lo que decidas ahora marca cómo es: dónde nace, su familia, su carácter… y la estrella decide si nace niño o niña.'), caja));
    sig();
  }

  // ---------- Pantalla principal ----------
  function pinta() {
    if (!vivo || !E || !E.vida) return;
    const s = JSON.parse(JSON.stringify(E.vida)); V.tick(s, ahora()); sAhora = s;
    const rs = V.resumen(s, ahora()), ed = rs.edad, falta = rs.proximoCumple - ahora();
    const nec = h('div.vd-nec', V.NEC.map(n => { const v = s.necesidades[n]; return h('div.vd-bar', h('span.vd-bar-t', V.NEC_TXT[n]), h('div.vd-bar-b', h('i', { style: { width: v + '%', background: v < 20 ? '#ef4444' : v < 45 ? '#f59e0b' : '#22c55e' } })), h('b', String(v))); }),
      h('div.vd-bar', h('span.vd-bar-t', 'Salud'), h('div.vd-bar-b', h('i', { style: { width: s.salud + '%', background: s.salud < 35 ? '#ef4444' : '#ec4899' } })), h('b', String(s.salud))));
    const acc = h('div.vd-acc', Object.keys(V.ACCIONES).map(k => { const a = V.ACCIONES[k], resta = ((s.cd || {})[k] || 0) + a.cd * 60000 - ahora(); return btn(a.i + ' ' + a.t + (resta > 0 ? ' · ' + dur(resta) : ''), () => hacer('vida.accion', { tipo: k }), { cls: 'vd-a', disabled: resta > 0, title: (ed < 18 || !a.coste ? '' : 'Cuesta ' + a.coste + ' monedas · ') + '+' + a.mas + ' ' + V.NEC_TXT[a.nec] }); }),
      s.salud < 70 ? btn('🩺 Médico', () => hacer('vida.accion', { tipo: 'medico' }), { cls: 'vd-a' }) : null);
    const ev = E.evento ? h('div.jg-card.vd-evento', h('b', '📰 ¡Pasa algo!'), h('p', E.evento.t), h('div.row.wrap', { style: { gap: '6px' } }, E.evento.o.map((o, i) => btn(o.t, () => hacer('vida.evento', { opcion: i }), { cls: 'sm' })))) : null;
    const tabs = [['barrio', '🗺️ Barrio'], ['hoy', '🏠 Hoy'], ['trabajo', ed < 14 ? '📚 Estudios' : '💼 Trabajo y estudios'], ['casa', '🛋️ Casa'], ['tienda', '👗 Tienda'], ['mascota', '🐾 Mascota'], ['vehiculo', '🚲 Vehículo'], ['diario', '📔 Diario'], ['premium', '⏱ Premium']];
    const cuerpo = h('div.vd-cuerpo');
    pon(raiz,
      h('div.vd-top', h('div.vd-perfil', h('div.vd-av', avatar(s, { ahora: ahora() }), mascotaDibujo(s)),
        h('div.vd-datos', h('h2', s.nombre), h('div.muted', ed + (ed === 1 ? ' año' : ' años') + ' · ' + rs.etapa.t + ' · ' + (s.ciudad || '')),
          h('div.tiny.muted', '🎂 Cumple ' + (ed + 1) + ' en ' + dur(falta)), h('div.vd-dinero', '💰 ' + s.dinero + ' monedas'),
          s.trabajo ? h('div.small', (V.buscar(V.CAT.trabajos, s.trabajo.id) || {}).i + ' ' + (V.buscar(V.CAT.trabajos, s.trabajo.id) || {}).t + ' · nivel ' + s.trabajo.nivel) : null,
          h('div.small', '📚 Estudios ' + s.estudios + '/100'))),
        h('div.vd-panel', nec, acc)),
      ev, h('div.tabs.vd-tabs', tabs.map(([k, t]) => h('button' + (tab === k ? '.on' : ''), { type: 'button', 'data-tab': k, onclick: () => { tab = k; pinta(); } }, t))), cuerpo);
    ({ barrio: tBarrio, hoy: tHoy, trabajo: tTrabajo, casa: tCasa, tienda: tTienda, mascota: tMascota, vehiculo: tVehiculo, diario: tDiario, premium: tPremium }[tab])(cuerpo, s, ed);
  }
  // v13.9 · el barrio: se crea una vez y se vuelve a colocar en cada repintado (no se pierde dónde estás)
  function tBarrio(c, s, ed) {
    if (!M) {
      M = mundo({ estado: () => sAhora || s, ahora, edad: () => V.edad(sAhora || s, ahora()), me: (E && E.yo) || '',
        hacer: (tipo, id, quiet) => hacer('vida.accion', { tipo, id }, null, quiet), irTab: k => { tab = k; pinta(); } });
      window.__cdVidaMundo = M;
    } else M.actualizar();
    pon(c, M.el, h('p.tiny.muted', { style: { marginTop: '6px' } }, '🕹️ Muévete con las flechas (o W A S D), con los botones o tocando el mapa. Acércate a una puerta y pulsa «Entrar» (o Intro). Cada día hay 8 monedas por la calle y un cofre en la plaza. Los compañeros que estén jugando a la vez aparecen en el barrio: salúdalos.'));
  }
  function tHoy(c, s, ed) {
    const consejos = [];
    V.NEC.forEach(n => { if (s.necesidades[n] < 30) consejos.push('⚠️ ' + V.NEC_TXT[n] + ' baja: cuídalo pronto.'); });
    if (ed < 3) consejos.push('👶 Eres un bebé: come, duerme y juega. A los 3 años empezarás el colegio.');
    else if (ed < 14) consejos.push('🎒 Ve al colegio (pestaña Estudios): cuantos más estudios, mejores trabajos de mayor.');
    else if (!s.trabajo) consejos.push('💼 Ya puedes trabajar: busca un trabajo en «Trabajo y estudios».');
    if (ed >= 18 && s.casa === 'familia') consejos.push('🏠 Con 18 años puedes independizarte (pestaña Casa).');
    if (!s.mascota && ed >= 4) consejos.push('🐾 ¿Y una mascota? Mira la pestaña Mascota.');
    pon(c, h('div.jg-card', h('h3', 'Hoy'), consejos.length ? h('ul.small', consejos.map(x => h('li', x))) : h('p.small', '😊 Todo va bien. ¡Disfruta del día!'),
      h('p.tiny.muted', 'El tiempo sigue aunque cierres la app: vuelve cada día para ver cómo crece.')),
      h('div.jg-card', { style: { marginTop: '10px' } }, h('h3', 'Últimos recuerdos'), (s.diario || []).slice(-5).reverse().map(d => h('div.small', '· ' + d.x))));
  }
  function tTrabajo(c, s, ed) {
    const trab = V.trabajosPosibles(s, ahora()), cdT = ((s.cd || {}).trabajo || 0) + 30 * 60000 - ahora(), cdE = ((s.cd || {}).estudio || 0) + 45 * 60000 - ahora();
    const est = h('div.jg-card', h('h3', ed < 18 ? '🎒 Colegio e instituto' : '📚 Estudiar'), h('p.small', 'Estudios: ' + s.estudios + '/100. Cada sesión es un minijuego; cuanto mejor lo hagas, más subes. ' + (ed < 18 ? 'Además te dan 3 monedas de paga.' : '')),
      btn(cdE > 0 ? 'Podrás estudiar en ' + dur(cdE) : 'Estudiar (minijuego)', () => turno('estudio'), { cls: 'primary', disabled: cdE > 0 || ed < 3 || ed >= 30 }));
    if (ed < 14) return pon(c, est);
    const t = s.trabajo ? V.buscar(V.CAT.trabajos, s.trabajo.id) : null;
    pon(c, t ? h('div.jg-card', h('h3', t.i + ' ' + t.t + ' · nivel ' + s.trabajo.nivel), h('p.small', 'Turnos: ' + s.trabajo.turnos + ' · buenos para el ascenso: ' + s.trabajo.buenos + '/6 · sueldo base ' + t.sueldo + ' monedas'),
      h('div.row.wrap', { style: { gap: '8px' } }, btn(cdT > 0 ? 'Próximo turno en ' + dur(cdT) : 'Trabajar un turno (minijuego)', () => turno('trabajo'), { cls: 'primary', disabled: cdT > 0 }), btn('Dejar el trabajo', async () => { if (await confirmDlg('Dejar el trabajo', 'Perderás tu nivel en este trabajo.', 'Dejarlo', true)) hacer('vida.accion', { tipo: 'dimitir' }); }, { cls: 'ghost' }))) : null,
      est,
      h('div.jg-card', { style: { marginTop: '10px' } }, h('h3', 'Bolsa de trabajo'), h('div.vd-lista', trab.map(x => h('div.vd-item' + (x.ok ? '' : '.no'), h('span.vd-i', x.i), h('div.grow', h('b', x.t), h('div.tiny.muted', x.ok ? 'Sueldo base ' + x.sueldo + ' · minijuego: ' + x.juego : 'Te falta: ' + x.falta.join(' y '))),
        x.ok && (!s.trabajo || s.trabajo.id !== x.id) ? btn('Pedir', () => hacer('vida.accion', { tipo: 'trabajo', id: x.id }), { cls: 'sm' }) : null)))));
  }
  async function turno(tipo) {
    const r = await hacer('vida.turno', { tipo }); if (!r || !r.turno) return;
    const caja = h('div.vd-mj'); let cerrada = false;
    const m = modal(tipo === 'trabajo' ? '💼 Turno de trabajo' : tipo === 'carne' ? '🚗 Examen de conducir' : '📚 Sesión de estudio', caja, null, { size: 'narrow', sticky: true, onclose: () => { cerrada = true; } });
    const puntos = await jugar(caja, r.turno.juego);
    await new Promise(res => setTimeout(res, 300));
    const fin = await hacer('vida.turno', { token: r.turno.token, puntos });
    if (!cerrada) m.close();
    if (fin && fin.ascenso) fiesta(document.body);
  }
  function tCasa(c, s, ed) {
    const casa = V.buscar(V.CAT.casas, s.casa), mios = (s.inventario || []).filter(id => V.buscar(V.CAT.muebles, id));
    const huecos = h('div.vd-casa', Array.from({ length: casa.huecos }, (_, i) => { const m = V.buscar(V.CAT.muebles, (s.muebles || {})[i]); return h('button.vd-hueco' + (m ? '.lleno' : ''), { type: 'button', title: m ? m.t : 'Hueco libre', onclick: () => elegirMueble(i, mios, s) }, m ? m.i : '＋', h('span', m ? m.t : 'libre')); }));
    pon(c, h('div.jg-card', h('h3', '🏠 ' + casa.t), h('p.small.muted', casa.d + ' · ' + casa.huecos + ' huecos para muebles. Pulsa un hueco para colocar un mueble que tengas.'), huecos),
      h('div.jg-card', { style: { marginTop: '10px' } }, h('h3', 'Mudarse'), ed < 18 ? h('p.small.muted', 'Con 18 años podrás independizarte.') : null,
        h('div.vd-lista', V.CAT.casas.map(x => { const tiene = (s.casasCompradas || []).includes(x.id) || x.id === 'familia'; return h('div.vd-item' + (ed < x.edad ? '.no' : ''), h('span.vd-i', x.id === 'atico' ? '🌆' : '🏠'), h('div.grow', h('b', x.t), h('div.tiny.muted', x.d + ' · ' + x.huecos + ' huecos · ' + (tiene ? 'ya es tuya' : precio(x)))),
          s.casa !== x.id && ed >= x.edad ? btn(tiene ? 'Volver' : x.fichas ? 'Comprar con fichas' : 'Comprar', async () => { if (!tiene && !(await confirmDlg('Mudarte', '¿Comprar «' + x.t + '» por ' + precio(x) + '?', 'Comprar'))) return; hacer('vida.accion', { tipo: 'casa', id: x.id }); }, { cls: 'sm' }) : s.casa === x.id ? h('span.pill', 'Vives aquí') : null); }))));
  }
  function elegirMueble(i, mios, s) {
    const lista = h('div.vd-lista', mios.length ? mios.map(id => { const m = V.buscar(V.CAT.muebles, id); return h('div.vd-item', h('span.vd-i', m.i), h('div.grow', h('b', m.t), h('div.tiny.muted', Object.entries(m.bono || {}).map(([k, v]) => '+' + v + ' ' + (V.NEC_TXT[k] || k)).join(' · '))), btn('Colocar', () => { mm.close(); hacer('vida.accion', { tipo: 'colocar', id: i + ':' + id }); }, { cls: 'sm' })); }) : h('p.small.muted', 'No tienes muebles: cómpralos en la Tienda.'));
    const mm = modal('Hueco ' + (i + 1), h('div.col', lista, (s.muebles || {})[i] ? btn('Dejar el hueco libre', () => { mm.close(); hacer('vida.accion', { tipo: 'colocar', id: i + ':' }); }, { cls: 'ghost sm' }) : null), close => [btn('Cerrar', close)], { size: 'narrow' });
  }
  let tiendaCat = 'top';
  function tTienda(c, s, ed) {
    const cats = [['top', '👕 Arriba'], ['bajo', '👖 Abajo'], ['zapatos', '👟 Zapatos'], ['accesorio', '🎀 Accesorios'], ['muebles', '🛋️ Muebles'], ['peinado', '💇 Peluquería']];
    const items = tiendaCat === 'muebles' ? V.CAT.muebles : tiendaCat === 'peinado' ? null : V.CAT.ropa.filter(x => x.parte === tiendaCat);
    const lista = items ? h('div.vd-lista', items.map(x => {
      const tiene = (s.inventario || []).includes(x.id), puesto = x.parte && s.ropa[x.parte] === x.id;
      return h('div.vd-item', h('span.vd-i', x.i || h('span.vd-color', { style: { background: x.color } })), h('div.grow', h('b', x.t), h('div.tiny.muted', tiene ? (puesto ? 'Lo llevas puesto' : 'Es tuyo') : precio(x) + (x.bono ? ' · ' + Object.entries(x.bono).map(([k, v]) => '+' + v + ' ' + (V.NEC_TXT[k] || k)).join(' · ') : ''))),
        !tiene ? btn(x.fichas ? 'Comprar ⏱' : 'Comprar', async () => { if (x.fichas && !(await confirmDlg('Artículo premium', '«' + x.t + '» cuesta ' + x.fichas + ' fichas.', 'Comprar'))) return; hacer('vida.accion', { tipo: 'comprar', id: x.id }); }, { cls: 'sm' + (x.fichas ? ' primary' : '') })
          : x.parte ? btn(puesto ? (x.parte === 'accesorio' ? 'Quitar' : 'Puesto') : 'Ponérmelo', () => hacer('vida.accion', { tipo: 'equipar', id: x.id }), { cls: 'sm ghost', disabled: puesto && x.parte !== 'accesorio' }) : null);
    })) : h('div.row.wrap', { style: { gap: '8px' } }, V.PEINADOS[s.sexo].map(p => btn(p + (s.aspecto.peinado === p ? ' ✓' : ''), () => hacer('vida.accion', { tipo: 'peinado', id: p }), { cls: 'sm' + (s.aspecto.peinado === p ? ' primary' : '') })), h('p.tiny.muted', ed < 12 ? 'De pequeño, la peluquería la paga tu familia.' : 'Cortarse el pelo cuesta 15 monedas.'));
    pon(c, h('div.jg-card', h('div.row.wrap', { style: { gap: '6px', marginBottom: '10px' } }, cats.map(([k, t]) => h('button.chip' + (tiendaCat === k ? '.on' : ''), { type: 'button', onclick: () => { tiendaCat = k; pinta(); } }, t))), ed < 3 ? aviso('Eres un bebé: tu familia elige la ropa por ti 😊', 'info') : null, lista));
  }
  function tMascota(c, s, ed) {
    if (s.mascota) {
      const t = V.buscar(V.CAT.mascotas, s.mascota.tipo), nom = inp({ value: s.mascota.nombre || '', maxlength: 16, placeholder: 'Ponle nombre', 'aria-label': 'Nombre de la mascota' });
      return pon(c, h('div.jg-card', h('div.vd-masc-big', t.i), h('h3', (s.mascota.nombre || t.t)), h('div.vd-nec', [['Comida', s.mascota.hambre], ['Felicidad', s.mascota.feliz]].map(([n, v]) => h('div.vd-bar', h('span.vd-bar-t', n), h('div.vd-bar-b', h('i', { style: { width: v + '%' } })), h('b', String(v))))),
        h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } }, btn('🥣 Dar de comer', () => hacer('vida.accion', { tipo: 'mascota_comer' }), { cls: 'sm' }), btn('🎾 Jugar', () => hacer('vida.accion', { tipo: 'mascota_jugar' }), { cls: 'sm' })),
        h('div.row', { style: { gap: '6px', marginTop: '8px' } }, nom, btn('Guardar nombre', () => hacer('vida.accion', { tipo: 'mascota_nombre', id: nom.value }), { cls: 'sm ghost' }))));
    }
    pon(c, h('div.jg-card', h('h3', '🐾 Adoptar una mascota'), h('div.vd-lista', V.CAT.mascotas.map(x => h('div.vd-item' + (ed < x.edad ? '.no' : ''), h('span.vd-i', x.i), h('div.grow', h('b', x.t), h('div.tiny.muted', (x.d ? x.d + ' · ' : '') + precio(x) + (ed < x.edad ? ' · desde los ' + x.edad + ' años' : ''))),
      ed >= x.edad ? btn(x.fichas ? 'Adoptar ⏱' : 'Adoptar', async () => { if (x.fichas && !(await confirmDlg('Mascota premium', 'Cuesta ' + x.fichas + ' fichas.', 'Adoptar'))) return; hacer('vida.accion', { tipo: 'adoptar', id: x.id }); }, { cls: 'sm' }) : null)))));
  }
  function tVehiculo(c, s, ed) {
    const cdC = ((s.cd || {}).carne || 0) + 60 * 60000 - ahora();
    pon(c, h('div.jg-card', h('h3', '🚗 Autoescuela'), s.carne ? h('p.small', '✅ Tienes carné de conducir.') : ed < 18 ? h('p.small.muted', 'Con 18 años podrás sacarte el carné.') : h('div', h('p.small', 'Examen práctico (minijuego de reflejos, aprueba con 70). Cuesta 120 monedas.'), btn(cdC > 0 ? 'Podrás repetir en ' + dur(cdC) : 'Hacer el examen', () => turno('carne'), { cls: 'primary', disabled: cdC > 0 }))),
      h('div.jg-card', { style: { marginTop: '10px' } }, h('h3', 'Vehículos'), h('p.tiny.muted', 'Un vehículo mejora el sueldo de los trabajos de reparto.'), h('div.vd-lista', V.CAT.coches.map(x => h('div.vd-item' + (ed < x.edad ? '.no' : ''), h('span.vd-i', x.i), h('div.grow', h('b', x.t), h('div.tiny.muted', precio(x) + (x.carne ? ' · necesita carné' : '') + ' · +' + x.bono + ' % en repartos')),
        s.coche === x.id ? h('span.pill', 'Tuyo') : ed >= x.edad ? btn(x.fichas ? 'Comprar ⏱' : 'Comprar', async () => { if (!(await confirmDlg('Comprar ' + x.t, 'Precio: ' + precio(x), 'Comprar'))) return; hacer('vida.accion', { tipo: 'coche', id: x.id }); }, { cls: 'sm' }) : null)))));
  }
  function tDiario(c, s) {
    pon(c, h('div.jg-card', h('h3', '📔 Diario de ' + s.nombre), h('div.vd-diario', (s.diario || []).slice().reverse().map(d => h('div.vd-d', h('span.tiny.muted', fdt(new Date(d.t).toISOString())), h('div', d.x))))),
      h('div.jg-card', { style: { marginTop: '10px' } }, h('h3', 'Su historia'), h('ol.small', (s.historia || []).map(x => h('li', x))),
        h('div.jg-stats', h('div.jg-stat', h('b', String(s.stats.turnos)), h('span', 'turnos trabajados')), h('div.jg-stat', h('b', String(s.stats.ganado)), h('span', 'monedas ganadas')), h('div.jg-stat', h('b', String(s.stats.estudios)), h('span', 'sesiones de estudio')), h('div.jg-stat', h('b', String(s.stats.eventos)), h('span', 'sucesos vividos'))),
        h('div.row.wrap', { style: { gap: '8px' } }, btn('🏆 Clasificación', ranking, { cls: 'ghost sm' }), btn('Empezar una vida nueva', async () => { if (await confirmDlg('Vida nueva', 'Tu personaje actual se despide. Lo premium que compraste con fichas lo conservas.', 'Empezar de nuevo', true)) { E = Object.assign({}, E, { vida: null, nuevaVida: true, historia: V.HISTORIA.map(p => ({ texto: p.texto, opciones: p.opciones.map(o => o.t) })), nombres: V.NOMBRES }); historia(); } }, { cls: 'ghost sm' }))));
  }
  function tPremium(c, s) {
    const todos = [].concat(V.CAT.ropa, V.CAT.muebles, V.CAT.casas, V.CAT.coches, V.CAT.mascotas).filter(x => x.fichas);
    pon(c, h('div.jg-card', h('h3', '⏱ Premium (se paga con fichas)'), h('p.small.muted', 'Las fichas se ganan usando la app (1 cada 5 min activos). Lo premium no da ventajas injustas: son caprichos bonitos. Si empiezas una vida nueva, lo conservas.'),
      h('div.vd-lista', todos.map(x => { const tiene = (s.premium || []).includes(x.id); return h('div.vd-item', h('span.vd-i', x.i || h('span.vd-color', { style: { background: x.color } })), h('div.grow', h('b', x.t), h('div.tiny.muted', (tiene ? '✓ Ya es tuyo' : x.fichas + ' fichas') + ' · ' + (V.CAT.ropa.includes(x) ? 'ropa' : V.CAT.muebles.includes(x) ? 'mueble' : V.CAT.casas.includes(x) ? 'casa' : V.CAT.coches.includes(x) ? 'vehículo' : 'mascota'))), tiene ? null : h('span.pill', '⏱ ' + x.fichas)); })),
      h('p.tiny.muted', 'Para comprarlos ve a su pestaña (Tienda, Casa, Vehículo o Mascota).')));
  }
  async function ranking() {
    let r = []; try { r = await llamar('vida.ranking', {}, { silencio: true }); } catch (e) { }
    modal('🏆 Vidas del equipo', r.length ? h('table.jg-tabla', h('tr', h('th', 'Persona'), h('th', 'Personaje'), h('th', 'Edad'), h('th', 'Ganado')), r.map(x => h('tr' + (x.yo ? '.yo' : ''), h('td', x.nombre), h('td', x.personaje), h('td', x.edad + ' años'), h('td', x.ganado + ' 💰')))) : h('p.muted', 'Aún nadie ha empezado su vida.'), close => [btn('Cerrar', close)], { size: 'narrow' });
  }
  carga();
  R.i(() => { if (vivo && E && E.vida && document.visibilityState === 'visible' && !document.querySelector('.vd-mj')) llamar('vida.estado', {}, { silencio: true }).then(r => { if (!vivo) return; E = r; offset = r.ahora - Date.now(); pinta(); }).catch(() => { }); }, 60000);
  return { destroy() { vivo = false; R.fin(); if (M) M.destroy(); } };
}
