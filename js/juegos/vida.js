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
import * as PXL from './vida_pixel.js'; // v13.12: dibujos pixel (casa por dentro, probador)

export const meta = { id: 'vida', titulo: 'Vida', emoji: '🌸', desc: 'Tu personaje vive contigo.' };
let coreP = null;
function core() {
  if (window.VIDA) return Promise.resolve(window.VIDA);
  if (!coreP) coreP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vida_core.js'; s.onload = () => res(window.VIDA); s.onerror = () => { coreP = null; rej(new Error('No se pudo cargar el juego.')); }; document.head.appendChild(s); });
  return coreP;
}
const kvLocal = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, String(v)); } catch (e) { return null; } };
const precio = it => it.fichas ? '⏱ ' + it.fichas + ' fichas' : it.precio ? '💰 ' + it.precio : 'Gratis';
const dur = ms => ms <= 0 ? '' : ms >= 3600000 ? Math.ceil(ms / 3600000) + ' h' : Math.ceil(ms / 60000) + ' min';

export function render(el) {
  const R = reloj(); let vivo = true, E = null, V = null, tab = 'barrio', offset = 0, M = null, sAhora = null;
  let cabeza = null, cuerpoEl = null, tabPintado = null, editCasa = null, probando = {}; // v13.12
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
    const tabs = [['barrio', '🗺️ Barrio'], ['hoy', '📜 Hoy y misiones'], ['trabajo', ed < 14 ? '📚 Estudios' : '💼 Trabajo y estudios'], ['casa', '🛋️ Casa'], ['tienda', '👗 Tienda'], ['mascota', '🐾 Mascota'], ['vehiculo', '🚲 Vehículo'], ['diario', '📔 Diario'], ['premium', '⏱ Premium']];
    const ms = V.misiones(s, ahora()).lista, listas = ms.filter(m => m.prog >= m.meta && !m.cobrada).length;
    const nueva = h('div.vd-cabeza',
      h('div.vd-top', h('div.vd-perfil', h('div.vd-av', avatar(s, { ahora: ahora() }), mascotaDibujo(s)),
        h('div.vd-datos', h('h2', s.nombre), h('div.muted', ed + (ed === 1 ? ' año' : ' años') + ' · ' + rs.etapa.t + ' · ' + (s.ciudad || '')),
          h('div.tiny.muted', '🎂 Cumple ' + (ed + 1) + ' en ' + dur(falta)), h('div.vd-dinero', '💰 ' + s.dinero + ' monedas' + (s.estrellas ? ' · ⭐ ' + s.estrellas : '')),
          s.trabajo ? h('div.small', (V.buscar(V.CAT.trabajos, s.trabajo.id) || {}).i + ' ' + (V.buscar(V.CAT.trabajos, s.trabajo.id) || {}).t + ' · nivel ' + s.trabajo.nivel) : null,
          h('div.small', '📚 Estudios ' + s.estudios + '/100'))),
        h('div.vd-panel', nec, acc)),
      ev, h('div.tabs.vd-tabs', tabs.map(([k, t]) => h('button' + (tab === k ? '.on' : ''), { type: 'button', 'data-tab': k, onclick: () => { tab = k; pinta(); } }, t, k === 'hoy' && listas ? h('span.vd-punto', String(listas)) : null))));
    // v13.12: el barrio (y la casa a medio decorar) NO se vuelven a montar al refrescar: así no se queda «pillado» andando ni se pierde lo que estás moviendo
    const fijo = tabPintado === tab && cuerpoEl && cuerpoEl.isConnected && ((tab === 'barrio' && M) || (tab === 'casa' && editCasa && editCasa.sucio));
    if (fijo) { cabeza.replaceWith(nueva); cabeza = nueva; if (tab === 'barrio') M.actualizar(); return; }
    if (tab !== 'casa') editCasa = null;
    const y0 = window.scrollY; cabeza = nueva; cuerpoEl = h('div.vd-cuerpo'); tabPintado = tab;
    pon(raiz, cabeza, cuerpoEl);
    ({ barrio: tBarrio, hoy: tHoy, trabajo: tTrabajo, casa: tCasa, tienda: tTienda, mascota: tMascota, vehiculo: tVehiculo, diario: tDiario, premium: tPremium }[tab])(cuerpoEl, s, ed);
    if (Math.abs(window.scrollY - y0) > 2) window.scrollTo(0, y0);
  }
  // v13.9 · el barrio: se crea una vez y se vuelve a colocar en cada repintado (no se pierde dónde estás)
  function tBarrio(c, s, ed) {
    if (!M) {
      M = mundo({ estado: () => sAhora || s, ahora, edad: () => V.edad(sAhora || s, ahora()), me: (E && E.yo) || '',
        hacer: (tipo, id, quiet) => hacer('vida.accion', { tipo, id }, null, quiet), irTab: k => { tab = k; pinta(); } });
      window.__cdVidaMundo = M;
    } else M.actualizar();
    pon(c, M.el, h('p.tiny.muted', { style: { marginTop: '6px' } }, '🕹️ Muévete con las flechas (o W A S D), con la cruceta o tocando el mapa. Acércate a una puerta, al huerto o al mercadillo y pulsa A (o Intro). Cada día hay 8 monedas por la calle y un cofre en la plaza. Los compañeros que estén jugando a la vez aparecen en el barrio: salúdalos.'));
  }
  function tHoy(c, s, ed) {
    const consejos = [], now = ahora();
    V.NEC.forEach(n => { if (s.necesidades[n] < 30) consejos.push('⚠️ ' + V.NEC_TXT[n] + ' baja: cuídalo pronto.'); });
    if (ed < 3) consejos.push('👶 Eres un bebé: come, duerme y juega. A los 3 años empezarás el colegio.');
    else if (ed < 14) consejos.push('🎒 Ve al colegio (pestaña Estudios): cuantos más estudios, mejores trabajos de mayor.');
    else if (!s.trabajo) consejos.push('💼 Ya puedes trabajar: busca un trabajo en «Trabajo y estudios».');
    if (ed >= 18 && s.casa === 'familia') consejos.push('🏠 Con 18 años puedes independizarte (pestaña Casa).');
    if (!s.mascota && ed >= 4) consejos.push('🐾 ¿Y una mascota? Mira la pestaña Mascota.');
    const hu = V.huerto(s), listas = hu.p.filter(p => p && V.crece(p, now).f >= 1).length, plantadas = hu.p.filter(Boolean).length;
    if (ed >= 5) consejos.push(listas ? '🧺 Tienes ' + listas + (listas === 1 ? ' planta lista' : ' plantas listas') + ' en el huerto: ¡ve a cosechar!' : plantadas ? '🌱 Tu huerto está creciendo (' + plantadas + ' plantas). Riégalo para que vaya más rápido.' : '🌱 Tu huerto está vacío: compra semillas en el Mercado y siémbralas delante de tu casa.');
    const ms = V.misiones(s, now).lista, todas = ms.length && ms.every(m => m.cobrada);
    const mis = h('div.jg-card.vd-misiones', h('h3', '📜 Misiones de hoy'), h('p.tiny.muted', 'Cada día hay 3 nuevas. Al terminarlas, cóbralas aquí. Si haces las 3: +25 monedas extra y una ⭐.'),
      ms.map(m => h('div.vd-mision' + (m.cobrada ? '.hecha' : m.prog >= m.meta ? '.lista' : ''), { 'data-mision': m.id }, h('span.vd-i', m.i),
        h('div.grow', h('b', m.t), h('div.vd-bar-b', h('i', { style: { width: Math.round(m.prog / m.meta * 100) + '%' } })), h('div.tiny.muted', m.prog + ' de ' + m.meta + ' · premio ' + m.premio + ' 💰')),
        m.cobrada ? h('span.pill', '✓ Cobrada') : btn(m.prog >= m.meta ? '⭐ Cobrar' : 'En marcha', () => hacer('vida.accion', { tipo: 'mision', id: m.id }, r => { if (r && V.misiones(JSON.parse(JSON.stringify(r.vida)), ahora()).lista.every(x => x.cobrada)) fiesta(document.body); }), { cls: 'sm' + (m.prog >= m.meta ? ' primary' : ' ghost'), disabled: m.prog < m.meta }))),
      todas ? h('p.small', '🎉 ¡Todas hechas! Mañana habrá misiones nuevas.') : null);
    pon(c, mis, h('div.jg-card', { style: { marginTop: '10px' } }, h('h3', 'Hoy'), consejos.length ? h('ul.small', consejos.map(x => h('li', x))) : h('p.small', '😊 Todo va bien. ¡Disfruta del día!'),
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
  // v13.12 · la casa por dentro (como Animal Crossing): arrastra los muebles por la habitación, gíralos y guárdalos en el almacén
  function tCasa(c, s, ed) {
    const casa = V.buscar(V.CAT.casas, s.casa), [gw, gh] = V.gridDe(s);
    if (!editCasa || editCasa.casa !== s.casa) { V.migrarDeco(s); editCasa = { casa: s.casa, deco: JSON.parse(JSON.stringify(s.deco || [])), sel: null, sucio: false, estilo: Number((kvLocal('vd.papel')) || 0) }; }
    const ec = editCasa, mios = (s.inventario || []).filter(id => V.buscar(V.CAT.muebles, id));
    const dimR = d => { const dm = V.dimDe(V.buscar(V.CAT.muebles, d.id)); return d.r ? [dm[1], dm[0]] : dm; };
    const choca = (d, x, y, r) => { const m = V.buscar(V.CAT.muebles, d.id); if (V.SUELO[d.id]) return false; const dm = V.dimDe(m), w = r ? dm[1] : dm[0], hh = r ? dm[0] : dm[1];
      if (x < 0 || y < 0 || x + w > gw || y + hh > gh) return true;
      return ec.deco.some(o => { if (o === d || V.SUELO[o.id]) return false; const [ow, oh] = dimR(o); return x < o.x + ow && x + w > o.x && y < o.y + oh && y + hh > o.y; }); };
    const fuera = (d, x, y, r) => { const dm = V.dimDe(V.buscar(V.CAT.muebles, d.id)), w = r ? dm[1] : dm[0], hh = r ? dm[0] : dm[1]; return x < 0 || y < 0 || x + w > gw || y + hh > gh; };
    const huecoPara = d => { for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (!choca(d, x, y, d.r) && !fuera(d, x, y, d.r)) return [x, y]; return null; };
    const fondo = PXL.habitacion(gw, gh, ec.estilo);
    const sala = h('div.vc-sala', { style: { aspectRatio: gw + ' / ' + (gh + 2), maxWidth: (gw * 64) + 'px', backgroundImage: 'url(' + fondo.toDataURL() + ')' } });
    const barra = h('div.vc-barra'), estado = h('span.small.vc-estado');
    const marcarSucio = () => { ec.sucio = true; estado.textContent = '● Sin guardar'; estado.className = 'small vc-estado sucio'; };
    function pintaSala() {
      const cs = sala.clientWidth / gw || 40;
      sala.replaceChildren(...ec.deco.slice().sort((a, b) => (V.SUELO[b.id] ? 1 : 0) - (V.SUELO[a.id] ? 1 : 0) || a.y - b.y).map(d => {
        const m = V.buscar(V.CAT.muebles, d.id), [w, hh] = dimR(d);
        const p = h('div.vc-pieza' + (ec.sel === d ? '.sel' : '') + (V.SUELO[d.id] ? '.suelo' : ''), { 'data-mueble': d.id, title: m.t,
          style: { left: (d.x / gw * 100) + '%', top: ((d.y + 2) / (gh + 2) * 100) + '%', width: (w / gw * 100) + '%', height: (hh / (gh + 2) * 100) + '%', fontSize: Math.round(Math.min(w, hh) * cs * 0.72) + 'px' } }, m.i);
        p.addEventListener('pointerdown', e => arrastrar(e, d, p, cs));
        return p;
      }));
      pintaBarra();
    }
    function arrastrar(e, d, p, cs) {
      e.preventDefault(); ec.sel = d; sala.querySelectorAll('.vc-pieza').forEach(x => x.classList.toggle('sel', x === p)); pintaBarra();
      try { p.setPointerCapture(e.pointerId); } catch (x) { }
      const r0 = sala.getBoundingClientRect(), x0 = d.x, y0 = d.y, ex = e.clientX, ey = e.clientY; let nx = x0, ny = y0, movido = false;
      const mv = ev => { nx = Math.round(x0 + (ev.clientX - ex) / (r0.width / gw)); ny = Math.round(y0 + (ev.clientY - ey) / (r0.height / (gh + 2))); const [w, hh] = dimR(d); nx = Math.max(0, Math.min(gw - w, nx)); ny = Math.max(0, Math.min(gh - hh, ny));
        if (nx !== x0 || ny !== y0) movido = true; p.style.left = (nx / gw * 100) + '%'; p.style.top = ((ny + 2) / (gh + 2) * 100) + '%'; p.classList.toggle('mal', choca(d, nx, ny, d.r)); };
      const fin = () => { p.removeEventListener('pointermove', mv); p.removeEventListener('pointerup', fin); p.removeEventListener('pointercancel', fin);
        if (movido) { if (choca(d, nx, ny, d.r)) toast('Ahí choca con otro mueble', 'warn', 1800); else { d.x = nx; d.y = ny; marcarSucio(); } } pintaSala(); };
      p.addEventListener('pointermove', mv); p.addEventListener('pointerup', fin); p.addEventListener('pointercancel', fin);
    }
    const mover = (dx, dy) => { const d = ec.sel; if (!d) return; if (choca(d, d.x + dx, d.y + dy, d.r) || fuera(d, d.x + dx, d.y + dy, d.r)) return toast('No cabe ahí', 'warn', 1200); d.x += dx; d.y += dy; marcarSucio(); pintaSala(); };
    function pintaBarra() {
      const d = ec.sel, m = d && V.buscar(V.CAT.muebles, d.id);
      barra.replaceChildren(d ? h('div.row.wrap', { style: { gap: '6px', alignItems: 'center' } }, h('b.small', m.i + ' ' + m.t),
        btn('◀', () => mover(-1, 0), { cls: 'sm', title: 'Mover a la izquierda' }), btn('▲', () => mover(0, -1), { cls: 'sm', title: 'Mover arriba' }), btn('▼', () => mover(0, 1), { cls: 'sm', title: 'Mover abajo' }), btn('▶', () => mover(1, 0), { cls: 'sm', title: 'Mover a la derecha' }),
        btn('↻ Girar', () => { if (choca(d, d.x, d.y, !d.r) || fuera(d, d.x, d.y, !d.r)) return toast('Girado no cabe aquí: muévelo antes', 'warn', 1800); d.r = !d.r; marcarSucio(); pintaSala(); }, { cls: 'sm' }),
        btn('📦 Al almacén', () => { ec.deco = ec.deco.filter(x => x !== d); ec.sel = null; marcarSucio(); pintaSala(); pintaAlmacen(); }, { cls: 'sm ghost' }))
        : h('span.small.muted', '👆 Toca un mueble para moverlo (arrástralo o usa las flechas), girarlo o guardarlo. Toca uno del almacén para ponerlo.'));
    }
    const almacen = h('div.vc-almacen');
    function pintaAlmacen() {
      const libres = mios.filter(id => !ec.deco.some(d => d.id === id));
      almacen.replaceChildren(...(libres.length ? libres.map(id => { const m = V.buscar(V.CAT.muebles, id), dm = V.dimDe(m);
        return h('button.vc-caja', { type: 'button', 'data-almacen': id, title: m.t, onclick: () => { const d = { id, x: 0, y: 0, r: false }, pos = huecoPara(d) || (dm[0] !== dm[1] ? huecoPara(Object.assign(d, { r: true })) : null); if (!pos) return toast('No queda sitio: guarda algo en el almacén o múdate a una casa más grande', 'warn', 3000); d.x = pos[0]; d.y = pos[1]; ec.deco.push(d); ec.sel = d; marcarSucio(); pintaSala(); pintaAlmacen(); } },
          h('span.vc-caja-i', m.i), h('span.tiny', m.t), h('span.tiny.muted', dm[0] + '×' + dm[1])); })
        : [h('p.small.muted', mios.length ? 'Todo lo que tienes está colocado. Compra más en la 👗 Tienda o en el 🛍️ Mercadillo de la plaza.' : 'Aún no tienes muebles: cómpralos en la 👗 Tienda.')]));
    }
    const guardar = btn('💾 Guardar la casa', () => hacer('vida.casa', { deco: ec.deco.map(d => ({ id: d.id, x: d.x, y: d.y, r: d.r })) }, () => { editCasa = null; }), { cls: 'primary' });
    const papeles = h('div.row', { style: { gap: '4px' } }, ['🌸', '💧', '🌿', '☀️'].map((e, i) => h('button.chip' + (ec.estilo === i ? '.on' : ''), { type: 'button', title: 'Papel pintado', onclick: () => { ec.estilo = i; kvLocal('vd.papel', i); sala.style.backgroundImage = 'url(' + PXL.habitacion(gw, gh, i).toDataURL() + ')'; papeles.querySelectorAll('.chip').forEach((x, k) => x.classList.toggle('on', k === i)); } }, e)));
    const bonos = {}; ec.deco.forEach(d => Object.entries(V.buscar(V.CAT.muebles, d.id).bono || {}).forEach(([k, v]) => { bonos[k] = (bonos[k] || 0) + v; }));
    pon(c, h('div.jg-card.vc', h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, h('h3.grow', '🏠 ' + casa.t + ' · ' + gw + ' × ' + gh), papeles, estado, guardar),
      h('p.tiny.muted', casa.d + (Object.keys(bonos).length ? ' · Tus muebles te dan: ' + Object.entries(bonos).map(([k, v]) => '+' + v + ' ' + (V.NEC_TXT[k] || k).toLowerCase()).join(' · ') : '')),
      sala, barra, h('div.lbl', { style: { marginTop: '10px' } }, '📦 Almacén (muebles que tienes sin colocar)'), almacen),
      h('div.jg-card', { style: { marginTop: '10px' } }, h('h3', 'Mudarse'), ed < 18 ? h('p.small.muted', 'Con 18 años podrás independizarte.') : null,
        h('div.vd-lista', V.CAT.casas.map(x => { const tiene = (s.casasCompradas || []).includes(x.id) || x.id === 'familia', g2 = V.CASA_GRID[x.id] || [6, 5]; return h('div.vd-item' + (ed < x.edad ? '.no' : ''), h('span.vd-i', x.id === 'atico' ? '🌆' : '🏠'), h('div.grow', h('b', x.t), h('div.tiny.muted', x.d + ' · ' + g2[0] + ' × ' + g2[1] + ' casillas · ' + (tiene ? 'ya es tuya' : precio(x)))),
          s.casa !== x.id && ed >= x.edad ? btn(tiene ? 'Volver' : x.fichas ? 'Comprar con fichas' : 'Comprar', async () => { if (!tiene && !(await confirmDlg('Mudarte', '¿Comprar «' + x.t + '» por ' + precio(x) + '?', 'Comprar'))) return; editCasa = null; hacer('vida.accion', { tipo: 'casa', id: x.id }); }, { cls: 'sm' }) : s.casa === x.id ? h('span.pill', 'Vives aquí') : null); }))));
    pintaAlmacen(); requestAnimationFrame(pintaSala);
    if (ec.sucio) marcarSucio(); else estado.textContent = '';
    if (!sala.__ro && window.ResizeObserver) { sala.__ro = new ResizeObserver(() => pintaSala()); sala.__ro.observe(sala); }
  }
  let tiendaCat = 'top';
  // v13.12 · Tienda con PROBADOR: pruébate la ropa (y combínala) antes de comprarla
  function tTienda(c, s, ed) {
    const cats = [['top', '👕 Arriba'], ['bajo', '👖 Abajo'], ['zapatos', '👟 Zapatos'], ['accesorio', '🎀 Accesorios'], ['muebles', '🛋️ Muebles'], ['peinado', '💇 Peluquería']];
    const items = tiendaCat === 'muebles' ? V.CAT.muebles : tiendaCat === 'peinado' ? null : V.CAT.ropa.filter(x => x.parte === tiendaCat);
    const comprar = async x => { if (x.fichas && !(await confirmDlg('Artículo premium', '«' + x.t + '» cuesta ' + x.fichas + ' fichas.', 'Comprar'))) return; hacer('vida.accion', { tipo: 'comprar', id: x.id }); };
    const lista = items ? h('div.vd-lista', items.map(x => {
      const tiene = (s.inventario || []).includes(x.id), puesto = x.parte && s.ropa[x.parte] === x.id, prob = x.parte && probando[x.parte] === x.id;
      return h('div.vd-item' + (prob ? '.probando' : ''), h('span.vd-i', x.i || h('span.vd-color', { style: { background: x.color } })), h('div.grow', h('b', x.t), h('div.tiny.muted', tiene ? (puesto ? 'Lo llevas puesto' : 'Es tuyo') : precio(x) + (x.bono ? ' · ' + Object.entries(x.bono).map(([k, v]) => '+' + v + ' ' + (V.NEC_TXT[k] || k)).join(' · ') : ''))),
        x.parte && !puesto ? btn(prob ? '✓ Probando' : '👀 Probar', () => { if (prob) delete probando[x.parte]; else probando[x.parte] = x.id; pinta(); }, { cls: 'sm ghost vd-probar' }) : null,
        !tiene ? btn(x.fichas ? 'Comprar ⏱' : 'Comprar', () => comprar(x), { cls: 'sm' + (x.fichas ? ' primary' : '') })
          : x.parte ? btn(puesto ? (x.parte === 'accesorio' ? 'Quitar' : 'Puesto') : 'Ponérmelo', () => { delete probando[x.parte]; hacer('vida.accion', { tipo: 'equipar', id: x.id }); }, { cls: 'sm ghost', disabled: puesto && x.parte !== 'accesorio' }) : null);
    })) : h('div.row.wrap', { style: { gap: '8px' } }, V.PEINADOS[s.sexo].map(p => btn(p + (s.aspecto.peinado === p ? ' ✓' : ''), () => hacer('vida.accion', { tipo: 'peinado', id: p }), { cls: 'sm' + (s.aspecto.peinado === p ? ' primary' : '') })), h('p.tiny.muted', ed < 12 ? 'De pequeño, la peluquería la paga tu familia.' : 'Cortarse el pelo cuesta 15 monedas.'));
    // el probador: tu personaje con lo que te estás probando (grande y en pixel, como se verá en el barrio)
    Object.keys(probando).forEach(k => { if ((s.ropa || {})[k] === probando[k]) delete probando[k]; });
    const prendas = Object.values(probando).map(id => V.buscar(V.CAT.ropa, id)).filter(Boolean);
    let probador = null;
    if (prendas.length) {
      const s2 = JSON.parse(JSON.stringify(s)); prendas.forEach(x => { s2.ropa[x.parte] = x.id; });
      const px = (st, d) => { const cv = PXL.personaje(PXL.lookDe(st, V, ed), d, 0), o = h('canvas.vd-px', { width: cv.width * 5, height: cv.height * 5 }); const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(cv, 0, 0, o.width, o.height); return o; };
      const sinPagar = prendas.filter(x => !(s.inventario || []).includes(x.id)), total = sinPagar.reduce((a, x) => a + (x.precio || 0), 0), fichas = sinPagar.reduce((a, x) => a + (x.fichas || 0), 0);
      probador = h('div.jg-card.vd-probador', h('h3', '🪞 Probador'),
        h('div.vd-prob-fila', h('figure', avatar(s, { ahora: ahora() }), h('figcaption.tiny.muted', 'Ahora')), h('div.vd-prob-flecha', '→'),
          h('figure.on', avatar(s2, { ahora: ahora() }), h('figcaption.small', h('b', 'Con lo que te pruebas'))), h('figure.vd-prob-px', px(s2, 'd'), px(s2, 'r'), h('figcaption.tiny.muted', 'Así en el barrio'))),
        h('div.row.wrap', { style: { gap: '6px', alignItems: 'center' } }, prendas.map(x => h('span.chip.on', x.t + ' ', h('button.vd-x', { type: 'button', 'aria-label': 'Quitar ' + x.t, onclick: () => { delete probando[x.parte]; pinta(); } }, '✕')))),
        h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } },
          sinPagar.length ? btn('🛍️ Comprar y ponérmelo' + (total ? ' · 💰 ' + total : '') + (fichas ? ' · ⏱ ' + fichas : ''), async () => {
            if (fichas && !(await confirmDlg('Artículos premium', 'Cuesta ' + fichas + ' fichas' + (total ? ' y ' + total + ' monedas' : '') + '.', 'Comprar'))) return;
            for (const x of sinPagar) { const r = await hacer('vida.accion', { tipo: 'comprar', id: x.id }, null, true); if (!r) return; }
            for (const x of prendas) await hacer('vida.accion', { tipo: 'equipar', id: x.id }, null, true);
            probando = {}; toast('👗 ¡Estreno! Ya lo llevas puesto.', 'ok'); pinta();
          }, { cls: 'primary' }) : btn('👕 Ponérmelo', async () => { for (const x of prendas) await hacer('vida.accion', { tipo: 'equipar', id: x.id }, null, true); probando = {}; pinta(); }, { cls: 'primary' }),
          btn('Quitarme todo lo probado', () => { probando = {}; pinta(); }, { cls: 'ghost' })));
    }
    pon(c, probador, h('div.jg-card', { style: probador ? { marginTop: '10px' } : null }, h('div.row.wrap', { style: { gap: '6px', marginBottom: '10px' } }, cats.map(([k, t]) => h('button.chip' + (tiendaCat === k ? '.on' : ''), { type: 'button', onclick: () => { tiendaCat = k; pinta(); } }, t))), ed < 3 ? aviso('Eres un bebé: tu familia elige la ropa por ti 😊', 'info') : tiendaCat !== 'muebles' && tiendaCat !== 'peinado' ? h('p.tiny.muted', '👀 Pulsa «Probar» para ver cómo te queda antes de comprar. Puedes combinar varias prendas.') : null, lista));
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
