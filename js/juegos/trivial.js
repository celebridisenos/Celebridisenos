// ================= v13.6 · TRIVIAL (solo o por equipos) =================
// Las preguntas y sus respuestas viven en el SERVIDOR (server/data/quiz.json + la hoja «Trivial_Preguntas» para las del
// equipo). La app recibe la pregunta con las opciones barajadas, manda la elegida y el servidor dice si es correcta y
// cuántos puntos vale (dificultad + rapidez, medida con SU reloj). Añadir preguntas no requiere tocar código.
import { h, btn, field, inp, sel, area, toast } from '../ui.js';
import { can } from '../store.js';
import { pon, llamar, cargando, errorCaja, reloj, fiesta, cabecera, aviso } from './kit.js';

export const meta = { id: 'trivial', titulo: 'Trivial', emoji: '🧠', desc: 'Preguntas por categorías, solo o por equipos.' };
const DIF = { 1: 'Fácil', 2: 'Media', 3: 'Difícil' };

export function render(el) {
  const R = reloj(); let vivo = true, cats = [], conf = { modo: 'solo', cats: [], dif: 0, n: 10, equipos: ['Equipo rosa', 'Equipo morado'] };
  const raiz = h('div.tv'); el.append(raiz);
  const catDe = id => cats.find(c => c.id === id) || { nombre: id, icono: '❓', color: '#888' };

  async function inicio() {
    pon(raiz, cargando());
    let c; try { c = await llamar('quiz.categorias', {}, { silencio: true }); } catch (e) { return vivo && pon(raiz, errorCaja(e, inicio)); }
    if (!vivo) return;
    cats = c.categorias;
    const modo = h('div.seg', ['solo', 'equipos'].map(m => h('button' + (conf.modo === m ? '.on' : ''), { type: 'button', 'data-modo': m, onclick: () => { conf.modo = m; inicio(); } }, m === 'solo' ? '🙋 Solo' : '👥 Por equipos')));
    const grid = h('div.tv-cats', cats.map(x => { const b = h('button.tv-cat' + (conf.cats.includes(x.id) ? '.on' : ''), { type: 'button', 'data-cat': x.id, 'aria-pressed': String(conf.cats.includes(x.id)), onclick: () => { const i = conf.cats.indexOf(x.id); if (i >= 0) conf.cats.splice(i, 1); else conf.cats.push(x.id); b.classList.toggle('on'); b.setAttribute('aria-pressed', String(i < 0)); } }, h('span.i', x.icono), h('span', h('b.small', x.nombre), h('div.tiny.muted', x.preguntas + ' preguntas'))); b.style.setProperty('--c', x.color); return b; }));
    const dif = sel([{ v: 0, t: 'Todas' }, { v: 1, t: 'Fácil' }, { v: 2, t: 'Media' }, { v: 3, t: 'Difícil' }], conf.dif, { 'aria-label': 'Dificultad' }); dif.onchange = () => { conf.dif = Number(dif.value); };
    const n = sel([{ v: 10, t: '10 preguntas' }, { v: 15, t: '15' }, { v: 20, t: '20' }], conf.n, { 'aria-label': 'Número de preguntas' }); n.onchange = () => { conf.n = Number(n.value); };
    const eqBox = h('div.col', { style: { gap: '6px' } });
    const pintaEq = () => pon(eqBox, ...conf.equipos.map((nm, i) => h('div.row', inp({ value: nm, maxlength: 24, 'aria-label': 'Equipo ' + (i + 1), oninput: e => { conf.equipos[i] = e.target.value; } }), conf.equipos.length > 2 ? btn('', () => { conf.equipos.splice(i, 1); pintaEq(); }, { cls: 'ghost icon sm', icon: 'x', title: 'Quitar equipo' }) : null)),
      conf.equipos.length < 6 ? btn('Añadir equipo', () => { conf.equipos.push('Equipo ' + (conf.equipos.length + 1)); pintaEq(); }, { cls: 'sm ghost', icon: 'plus' }) : null);
    pintaEq();
    pon(raiz, 
      cabecera('🧠 Trivial', c.total + ' preguntas · ' + cats.length + ' categorías'),
      conf.modo === 'solo' ? h('div.jg-stats', h('div.jg-stat', h('b', String(c.record)), h('span', 'Récord')), h('div.jg-stat', h('b', String(c.partidas)), h('span', 'Partidas')), h('div.jg-stat', h('b', c.respondidas ? Math.round(100 * c.aciertos / c.respondidas) + ' %' : '—'), h('span', 'Aciertos'))) : null,
      h('div.jg-card', h('div.row.wrap', { style: { gap: '10px', alignItems: 'center' } }, modo, dif, n),
        conf.modo === 'equipos' ? h('div', { style: { marginTop: '10px' } }, h('b.small', 'Equipos (por turnos, en este aparato)'), eqBox) : null,
        h('h3', { style: { marginTop: '14px' } }, 'Categorías ', h('span.tiny.muted', '(ninguna marcada = todas)')), grid,
        h('div.row', { style: { justifyContent: 'center', marginTop: '14px', gap: '8px', flexWrap: 'wrap' } }, btn('¡Jugar!', empezar, { cls: 'primary' }), conf.modo === 'solo' ? btn('🏆 Clasificación', ranking, { cls: 'ghost' }) : null, can('config.editar') ? btn('➕ Añadir preguntas', nuevaPregunta, { cls: 'ghost' }) : null)));
  }

  let p = null, t0 = 0, respondida = false;
  async function empezar() {
    pon(raiz, cargando('Preparando preguntas…'));
    try { p = await llamar('quiz.empezar', { modo: conf.modo, categorias: conf.cats, dificultad: conf.dif, n: conf.n, equipos: conf.equipos.map(x => x.trim()).filter(Boolean) }); }
    catch (e) { return vivo && pon(raiz, errorCaja(e, inicio)); }
    if (vivo) pregunta();
  }
  function marcador() {
    if (p.modo !== 'equipos') return h('div.tv-meta', h('b', '⭐ ' + p.puntos[0] + ' puntos'), h('span', '✔ ' + p.aciertos[0]));
    return h('div.tv-equipos', p.equipos.map((nm, i) => h('span.tv-eq' + (p.turno === i && !p.fin ? '.turno' : ''), nm + ' · ' + p.puntos[i])));
  }
  function pregunta() {
    if (p.fin) return final();
    const q = p.pregunta, c = catDe(q.categoria); respondida = false; t0 = Date.now();
    const barra = h('i'), ops = h('div.tv-ops'), pie = h('div.tv-exp');
    pon(ops, ...q.opciones.map((o, i) => h('button.tv-op', { type: 'button', 'data-i': i, onclick: () => responde(i) }, String.fromCharCode(65 + i) + ') ' + o)));
    pon(raiz, marcador(),
      h('div.tv-meta', h('span.pill', { style: { background: c.color, color: '#fff' } }, c.icono + ' ' + c.nombre), h('span', DIF[q.dificultad] || ''), h('span.grow'), h('span', 'Pregunta ' + (p.i + 1) + ' de ' + p.total)),
      p.modo === 'equipos' ? aviso('Turno de ' + p.equipos[p.turno], 'info') : null,
      h('div.tv-barra', barra), h('div.tv-preg', q.texto), ops, pie);
    const tick = () => { if (!vivo || respondida) return; const f = Math.max(0, 1 - (Date.now() - t0) / (q.tiempo * 1000)); barra.style.transform = 'scaleX(' + f + ')'; if (f <= 0) responde(-1); else R.t(tick, 100); };
    tick();
    const onK = e => { const i = '1234abcd'.indexOf((e.key || '').toLowerCase()); if (i >= 0 && !respondida && !/INPUT|TEXTAREA/.test(e.target.tagName)) responde(i % 4); };
    document.addEventListener('keydown', onK); R.t(() => document.removeEventListener('keydown', onK), q.tiempo * 1000 + 4000);
    async function responde(i) {
      if (respondida) return; respondida = true;
      ops.querySelectorAll('button').forEach(b => { b.disabled = true; if (Number(b.dataset.i) === i) b.classList.add('espera'); });
      let r;
      try { r = await llamar('quiz.responder', { id: p.id, i: p.i, opcion: i }); }
      catch (e) { respondida = false; ops.querySelectorAll('button').forEach(b => { b.disabled = false; }); return; }
      if (!vivo) return;
      document.removeEventListener('keydown', onK);
      ops.querySelectorAll('button').forEach(b => { const k = Number(b.dataset.i); if (k === r.correcta) b.classList.add('ok'); else if (k === i) b.classList.add('mal'); });
      pon(pie, aviso(r.acierto ? '✅ ¡Correcto! +' + r.puntos + ' puntos' : r.tarde ? '⏰ Se acabó el tiempo' : '❌ No era esa', r.acierto ? 'ok' : 'bad'), r.explicacion ? h('p.small.muted', r.explicacion) : null,
        h('div.row', { style: { justifyContent: 'flex-end' } }, btn(r.estado.fin ? 'Ver resultado' : 'Siguiente', () => { p = r.estado; pregunta(); }, { cls: 'primary' })));
      p = Object.assign({}, r.estado, { pregunta: r.estado.pregunta });
    }
  }
  function final() {
    let titulo, txt;
    if (p.modo === 'equipos') {
      const max = Math.max(...p.puntos), gan = p.equipos.filter((_, i) => p.puntos[i] === max);
      titulo = gan.length > 1 ? '🤝 ¡Empate!' : '🏆 ¡Gana ' + gan[0] + '!'; txt = p.equipos.map((nm, i) => nm + ': ' + p.puntos[i] + ' puntos (' + p.aciertos[i] + ' aciertos)').join(' · ');
    } else { titulo = p.nuevoRecord ? '🏆 ¡Nuevo récord!' : '¡Partida terminada!'; txt = p.puntos[0] + ' puntos · ' + p.aciertos[0] + ' de ' + p.total + ' aciertos' + (p.record ? ' · récord ' + p.record : ''); }
    pon(raiz, h('div.jg-empty', h('div.jg-empty-ic', '🧠'), h('h3', titulo), h('p', txt), h('div.row', { style: { gap: '8px' } }, btn('Otra partida', empezar, { cls: 'primary' }), btn('Cambiar opciones', inicio, { cls: 'ghost' }))));
    if (p.nuevoRecord || p.modo === 'equipos') fiesta(document.body);
  }
  async function ranking() {
    pon(raiz, cargando());
    let r = []; try { r = await llamar('juegos.ranking', { juego: 'trivial' }, { silencio: true }); } catch (e) { }
    if (!vivo) return;
    pon(raiz, cabecera('🏆 Clasificación del Trivial', 'Mejor partida de cada persona'),
      r.length ? h('table.jg-tabla', r.map((x, i) => h('tr' + (x.yo ? '.yo' : ''), h('td', String(i + 1)), h('td', x.nombre), h('td', x.puntos + ' pts'), h('td.muted', x.detalle)))) : h('p.muted', 'Aún nadie ha jugado.'),
      h('div.row', { style: { marginTop: '12px' } }, btn('Volver', inicio, { cls: 'ghost' })));
  }
  function nuevaPregunta() {
    const f = { categoria: inp({ placeholder: 'p. ej. Geografía o una nueva', list: 'tv-cats-dl' }), pregunta: area({ rows: 2, maxlength: 300 }), correcta: inp({ maxlength: 120 }), incorrecta1: inp({ maxlength: 120 }), incorrecta2: inp({ maxlength: 120 }), incorrecta3: inp({ maxlength: 120 }), explicacion: inp({ maxlength: 300 }) };
    const dif = sel([{ v: 1, t: 'Fácil' }, { v: 2, t: 'Media' }, { v: 3, t: 'Difícil' }], 2);
    const dl = h('datalist', { id: 'tv-cats-dl' }, cats.map(c => h('option', { value: c.nombre })));
    const msg = h('div');
    pon(raiz, cabecera('➕ Añadir pregunta', 'También se pueden pegar muchas de golpe en la hoja «Trivial_Preguntas» del libro del Sistema (Google Sheets).'),
      h('div.jg-card', dl, h('div.form', field('Categoría', f.categoria), field('Dificultad', dif), field('Pregunta', f.pregunta, null, 'full'), field('Respuesta correcta', f.correcta), field('Incorrecta 1', f.incorrecta1), field('Incorrecta 2', f.incorrecta2), field('Incorrecta 3', f.incorrecta3), field('Explicación (opcional)', f.explicacion, null, 'full')), msg,
        h('div.row', { style: { gap: '8px', marginTop: '10px' } }, btn('Guardar pregunta', async ev => {
          const b = ev.target.closest('button'); b.disabled = true;
          try { await llamar('quiz.guardar', { datos: Object.assign(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.value])), { dificultad: Number(dif.value) }) }); toast('Pregunta guardada', 'ok'); Object.values(f).forEach(x => { if (x !== f.categoria) x.value = ''; }); pon(msg, aviso('✅ Guardada. Ya sale en las partidas.', 'ok')); } catch (e) { }
          b.disabled = false;
        }, { cls: 'primary' }), btn('Volver', inicio, { cls: 'ghost' }))));
  }
  inicio();
  return { destroy() { vivo = false; R.fin(); } };
}
