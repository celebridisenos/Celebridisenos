// ================= v13.6 · DETECTIVES · 50 EXPEDIENTES =================
// DATOS separados de la LÓGICA:
//   · web/data/detectives/indice.json y cNN.json → expedientes (escena, personas, pruebas, documentos, opciones). SIN soluciones.
//   · server/data/detectives.json                 → soluciones (solo el servidor). Se generan con tools/contenido/gen_casos.py.
// La app enseña el expediente, deja examinar la escena, leer declaraciones y documentos y tomar notas; para resolver manda
// quién/cómo/por qué/prueba y el SERVIDOR dice si es correcto, cuántos puntos son y guarda el avance en la cuenta.
// Las notas de la libreta y las pruebas ya examinadas se guardan solo en este aparato (comodidad, no puntúan).
import { h, btn, toast, confirmDlg } from '../ui.js';
import { S } from '../store.js';
import { pon, llamar, cargando, errorCaja, fiesta, cabecera, aviso } from './kit.js';
import { escenaSVG, retratoSVG } from './escenas.js';

export const meta = { id: 'expedientes', titulo: 'Detectives', emoji: '🕵️', desc: '50 expedientes para resolver.' };
const DIF = { 1: 'Fácil', 2: 'Media', 3: 'Difícil' };
const ESTADO = { abierto: 'Abierto', resuelto: 'Resuelto', rendido: 'Cerrado' };
const DOCICO = { informe: '📑', nota: '🗒️', mensaje: '💬', correo: '📧', carta: '✉️', ficha: '🗂️' };
const casoCache = new Map(); let indiceCache = null;

async function json(url) {
  const r = await fetch(url, { cache: 'no-cache' }).catch(() => null);
  if (!r || !r.ok) { const e = new Error('No se ha podido cargar el expediente. Comprueba la conexión y vuelve a intentarlo.'); e.code = 'NET'; throw e; }
  return r.json();
}
const indice = async () => indiceCache || (indiceCache = await json('data/detectives/indice.json'));
const cargarCaso = async id => { if (!casoCache.has(id)) casoCache.set(id, await json('data/detectives/' + encodeURIComponent(id) + '.json')); return casoCache.get(id); };
// comodidades locales (por persona y aparato)
const LK = (id, k) => 'cd.dx.' + ((S.me && S.me.id) || 'yo') + '.' + id + '.' + k;
const lee = (id, k, def) => { try { const v = JSON.parse(localStorage.getItem(LK(id, k))); return v == null ? def : v; } catch (e) { return def; } };
const guarda = (id, k, v) => { try { localStorage.setItem(LK(id, k), JSON.stringify(v)); } catch (e) { } };
const estrellas = d => '★'.repeat(d) + '☆'.repeat(3 - d);

export function render(el) {
  let vivo = true, prog = { casos: {}, puntos: 0, resueltos: 0, total: 50 }, filtro = 'todos';
  const raiz = h('div.dx'); el.append(raiz);

  async function lista() {
    pon(raiz, cargando('Abriendo el archivo de expedientes…'));
    let idx;
    try { [idx, prog] = await Promise.all([indice(), llamar('detectives.progreso', {}, { silencio: true })]); } catch (e) { return vivo && pon(raiz, errorCaja(e, lista)); }
    if (!vivo) return;
    const est = id => (prog.casos[id] && prog.casos[id].estado) || 'abierto';
    const FIL = [['todos', 'Todos'], ['pend', 'Pendientes'], ['hechos', 'Resueltos'], ['d1', 'Fáciles'], ['d2', 'Medios'], ['d3', 'Difíciles'], ['real', 'Inspirados en hechos reales']];
    const pasa = c => filtro === 'todos' || (filtro === 'pend' && est(c.id) === 'abierto') || (filtro === 'hechos' && est(c.id) !== 'abierto') || (filtro === 'real' && c.insp) || filtro === 'd' + c.dif;
    const grid = h('div.dx-lista');
    const pinta = () => pon(grid, ...idx.filter(pasa).map(c => {
      const e = est(c.id), p = prog.casos[c.id];
      return h('button.dx-carpeta.' + e, { type: 'button', 'data-caso': c.id, onclick: () => abrir(c.id) },
        h('span.dx-pestana', c.num),
        h('b.dx-ct', c.t), h('span.dx-cl', c.lugar), h('span.dx-cd', c.delito),
        h('span.dx-cf', h('span.dx-dif', { title: 'Dificultad ' + DIF[c.dif] }, estrellas(c.dif)), c.insp ? h('span.dx-real', { title: 'Inspirado en hechos reales (detalles ficticios)' }, '📜 Real') : null,
          p && p.fallos && e === 'abierto' ? h('span.tiny.muted', p.fallos + ' intento' + (p.fallos > 1 ? 's' : '')) : null),
        e !== 'abierto' ? h('span.dx-sello', e === 'resuelto' ? 'RESUELTO' + (p.puntos ? ' · ' + p.puntos : '') : 'CERRADO') : null);
    }), idx.filter(pasa).length ? null : h('p.muted', 'No hay expedientes con este filtro.'));
    const chips = h('div.dx-fil', FIL.map(([k, t]) => h('button.chip' + (filtro === k ? '.on' : ''), { type: 'button', 'data-f': k, onclick: ev => { filtro = k; chips.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b === ev.currentTarget)); pinta(); } }, t)));
    pinta();
    pon(raiz, cabecera('🗂️ Archivo de expedientes', idx.length + ' casos · examina la escena, lee las declaraciones y los documentos y resuelve quién, cómo y por qué'),
      h('div.jg-stats', st('Resueltos', prog.resueltos + ' / ' + idx.length), st('Puntos', prog.puntos), st('Pendientes', idx.filter(c => est(c.id) === 'abierto').length)),
      chips, grid,
      h('div.row', { style: { justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '14px' } }, btn('🏆 Clasificación', ranking, { cls: 'ghost' }), h('a.btn.ghost', { href: '#/descanso/detectives' }, '⚡ Casos rápidos')));
  }
  const st = (t, v) => h('div.jg-stat', h('b', String(v)), h('span', t));

  async function ranking() {
    pon(raiz, cargando());
    let r = []; try { r = await llamar('juegos.ranking', { juego: 'detectives' }, { silencio: true }); } catch (e) { }
    if (!vivo) return;
    pon(raiz, cabecera('🏆 Clasificación del equipo', 'Puntos de los expedientes resueltos'),
      r.length ? h('table.jg-tabla', r.map((x, i) => h('tr' + (x.yo ? '.yo' : ''), h('td', String(i + 1)), h('td', x.nombre), h('td', x.puntos + ' pts'), h('td.muted', x.detalle)))) : h('p.muted', 'Aún nadie ha resuelto un caso.'),
      h('div.row', { style: { marginTop: '12px' } }, btn('Volver', lista, { cls: 'ghost' })));
  }

  // ======================= un expediente =======================
  async function abrir(id, tab) {
    pon(raiz, cargando('Abriendo el expediente…'));
    let c; try { c = await cargarCaso(id); } catch (e) { return vivo && pon(raiz, errorCaja(e, () => abrir(id, tab))); }
    if (!vivo) return;
    const estado = () => (prog.casos[id] && prog.casos[id].estado) || 'abierto';
    let vistas = new Set(lee(id, 'vistas', [])), actual = tab || 'expediente';
    const marcarVista = pid => { if (!vistas.has(pid)) { vistas.add(pid); guarda(id, 'vistas', [...vistas]); } };
    const caja = h('div.dx-panel'), tabsEl = h('div.dx-tabs', { role: 'tablist' });
    const TABS = [['expediente', '📁 Expediente'], ['escena', '🖼️ Escena'], ['personas', '👥 Personas'], ['pruebas', '🔎 Pruebas'], ['documentos', '📄 Documentos'], ['libreta', '📝 Libreta'], ['resolver', '⚖️ Resolver']];
    const ir = t => { actual = t; tabsEl.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.tab === t); b.setAttribute('aria-selected', String(b.dataset.tab === t)); }); VISTA[t](); const top = tabsEl.getBoundingClientRect().top; if (top < 0) window.scrollBy(0, top - 70); }; // si las pestañas quedaron arriba fuera de la vista, se vuelve a ellas
    TABS.forEach(([k, t]) => tabsEl.appendChild(h('button', { type: 'button', role: 'tab', 'data-tab': k, onclick: () => ir(k) }, t)));
    const sello = h('span.dx-estado');
    const pintaSello = () => { const e = estado(); sello.className = 'dx-estado ' + e; sello.textContent = ESTADO[e]; };
    pintaSello();

    const pruebaCard = (p, grande) => h('div.dx-bolsa' + (grande ? '.grande' : ''), { 'data-prueba': p.id },
      h('div.dx-bolsa-dib', h('span.dx-bolsa-ic', p.icono), h('span.dx-bolsa-et', 'PRUEBA ' + p.id.toUpperCase())),
      h('div', h('b', p.nombre), h('p', p.texto)));

    const VISTA = {
      expediente() {
        pon(caja, h('div.dx-ficha',
          h('div.dx-ficha-g', fila('Nº de expediente', c.exp.num), fila('Cuándo', c.exp.fecha), fila('Dónde', c.exp.lugar), fila('Qué ha pasado', c.exp.delito), fila('Dificultad', estrellas(c.dif) + ' ' + DIF[c.dif]))),
          h('p.dx-intro', c.intro),
          h('h3', 'Lo que sabemos'), h('ol.dx-hist', c.historia.map(x => h('li', x))),
          aviso('Consejo: empieza por la ESCENA y toca cada prueba para examinarla. Luego compara las pruebas con lo que dice cada persona.'),
          h('div.row', { style: { justifyContent: 'center', marginTop: '10px' } }, btn('Ir a la escena →', () => ir('escena'), { cls: 'primary' })));
      },
      escena() {
        const det = h('div.dx-det', h('p.muted.small', '👆 Elige una prueba del dibujo.')), cont = h('div.small.muted');
        const pinta = () => { cont.textContent = 'Pruebas examinadas: ' + c.pruebas.filter(p => vistas.has(p.id)).length + ' de ' + c.pruebas.length; };
        const pins = c.pruebas.map(p => {
          const b = h('button.dx-pin' + (vistas.has(p.id) ? '.vista' : ''), { type: 'button', 'data-prueba': p.id, style: { left: p.x + '%', top: p.y + '%' }, 'aria-label': 'Examinar: ' + p.nombre, title: p.nombre }, h('span', vistas.has(p.id) ? p.icono : '?'));
          b.onclick = () => { marcarVista(p.id); b.classList.add('vista'); b.firstChild.textContent = p.icono; pins.forEach(x => x.classList.toggle('sel', x === b)); pon(det, pruebaCard(p, true)); pinta(); };
          return b;
        });
        pinta();
        pon(caja, h('div.dx-escena', h('div.dx-escena-svg', { html: escenaSVG(c.escena, c.exp.lugar) }), pins),
          h('div.row', { style: { justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', margin: '8px 0' } }, cont, h('span.tiny.muted', 'Toca los círculos «?» del dibujo para examinar cada prueba.')),
          det);
      },
      personas() {
        pon(caja, h('div.dx-personas', c.personas.map(p => h('div.dx-persona' + (p.sosp ? '.sosp' : ''), { 'data-persona': p.id },
          h('div.dx-retrato', { html: retratoSVG(p.nombre, p.rol) }),
          h('div', h('b', p.nombre), h('div.small.muted', p.rol), p.sosp ? h('span.dx-tag', 'Sospechoso/a') : h('span.dx-tag.ok', 'Testigo'),
            h('p.small', p.desc), h('blockquote.dx-decl', '«' + p.decl.replace(/^«|»$/g, '') + '»'))))));
      },
      pruebas() {
        pon(caja, h('p.small.muted', 'Las pruebas que ya has examinado en la escena. ' + c.pruebas.filter(p => vistas.has(p.id)).length + ' de ' + c.pruebas.length + '.'),
          h('div.dx-bolsas', c.pruebas.map(p => vistas.has(p.id) ? pruebaCard(p) : h('div.dx-bolsa.oculta', h('div.dx-bolsa-dib', h('span.dx-bolsa-ic', '❔')), h('div', h('b', 'Prueba sin encontrar'), h('p.small.muted', 'Búscala en el dibujo de la escena.'), btn('Ir a la escena', () => ir('escena'), { cls: 'sm ghost' }))))));
      },
      documentos() {
        pon(caja, c.docs.length ? h('div.dx-docs', c.docs.map(d => h('div.dx-doc.' + d.tipo, h('div.dx-doc-h', h('span', DOCICO[d.tipo] || '📄'), h('b', d.titulo), h('span.dx-doc-t', d.tipo.toUpperCase())), h('p', d.texto)))) : h('p.muted', 'Este expediente no tiene documentos.'));
      },
      libreta() {
        const notas = h('textarea.inp.dx-notas', { rows: 7, maxlength: 3000, placeholder: 'Apunta aquí tus sospechas, horas, contradicciones…', 'aria-label': 'Notas del caso' });
        notas.value = lee(id, 'notas', ''); let t = null;
        notas.oninput = () => { clearTimeout(t); t = setTimeout(() => guarda(id, 'notas', notas.value), 400); };
        const desc = new Set(lee(id, 'descartados', []));
        pon(caja, h('h3', '📝 Mis notas'), notas, h('div.tiny.muted', 'Se guardan solo en este aparato.'),
          h('h3', { style: { marginTop: '12px' } }, 'Sospechosos'), h('p.small.muted', 'Tacha a quien tenga coartada.'),
          h('div.dx-desc', c.personas.filter(p => p.sosp).map(p => { const b = h('button.chip' + (desc.has(p.id) ? '.tachado' : ''), { type: 'button', 'data-persona': p.id, 'aria-pressed': String(desc.has(p.id)) }, p.nombre); b.onclick = () => { if (desc.has(p.id)) desc.delete(p.id); else desc.add(p.id); b.classList.toggle('tachado'); b.setAttribute('aria-pressed', String(desc.has(p.id))); guarda(id, 'descartados', [...desc]); }; return b; })));
      },
      resolver
    };
    const fila = (k, v) => h('div', h('span.tiny.muted', k), h('b', v));

    async function resolver() {
      if (estado() !== 'abierto') return verSolucion();
      const sosp = c.personas.filter(p => p.sosp), resp = lee(id, 'resp', {}), res = h('div.dx-res', { 'aria-live': 'polite' });
      const grupo = (clave, titulo, ops) => h('fieldset.dx-q', h('legend', titulo), ops.map(([v, t, sub]) => h('label.dx-op', h('input', { type: 'radio', name: 'dx-' + clave, value: String(v), checked: String(resp[clave]) === String(v), onchange: () => { resp[clave] = String(v); guarda(id, 'resp', resp); } }), h('span', t, sub ? h('span.tiny.muted', ' · ' + sub) : null))));
      const p = prog.casos[id] || {};
      pon(caja, p.fallos ? aviso('Llevas ' + p.fallos + ' intento' + (p.fallos > 1 ? 's' : '') + ' fallido' + (p.fallos > 1 ? 's' : '') + '. Cada fallo resta un 20 % de los puntos (mínimo 30 %).' + (p.pista ? ' Has usado la pista (−25 %).' : ''), 'warn') : null,
        grupo('quien', '1. ¿Quién lo hizo?', sosp.map(x => [x.id, x.nombre, x.rol])),
        grupo('como', '2. ¿Cómo lo hizo?', c.como.map((t, i) => [i, t])),
        grupo('porque', '3. ¿Por qué lo hizo?', c.porque.map((t, i) => [i, t])),
        grupo('prueba', '4. ¿Qué prueba lo demuestra mejor?', c.pruebas.map(x => [x.id, x.icono + ' ' + x.nombre, vistas.has(x.id) ? '' : 'sin examinar'])),
        res,
        h('div.row.dx-acc', btn('⚖️ Resolver el caso', enviar, { cls: 'primary' }), btn('💡 Pista del comisario (−25 %)', pista, { cls: 'ghost' }), btn('🏳️ Rendirse', rendirse, { cls: 'ghost' })));

      async function enviar(ev) {
        const falta = ['quien', 'como', 'porque', 'prueba'].filter(k => resp[k] === undefined || resp[k] === '');
        if (falta.length) { pon(res, aviso('Responde las 4 preguntas antes de resolver.', 'warn')); return; }
        const b = ev && ev.currentTarget; if (b) b.disabled = true;
        let r; try { r = await llamar('detectives.resolver', { caso: id, quien: resp.quien, como: Number(resp.como), porque: Number(resp.porque), prueba: resp.prueba }); } catch (e) { if (b) b.disabled = false; return; }
        if (!vivo) return;
        if (b) b.disabled = false;
        prog.puntos = r.puntosTotal; prog.resueltos = r.resueltos;
        if (r.ok) {
          prog.casos[id] = { estado: 'resuelto', puntos: r.puntos, fallos: (prog.casos[id] || {}).fallos || 0 }; pintaSello();
          fiesta(document.body); toast('🎉 ¡Caso resuelto! +' + r.puntos + ' puntos', 'ok');
          return verSolucion(r);
        }
        prog.casos[id] = Object.assign(prog.casos[id] || {}, { estado: 'abierto', fallos: r.fallos });
        pon(res, h('div.dx-fallo', h('b', '❌ No es del todo correcto: has acertado ' + r.aciertos + ' de 4.'), h('p.small', 'Revisa las pruebas y las declaraciones: busca a quien dice algo que una prueba desmiente. Si aciertas ahora: ' + r.siguiente + ' puntos.')));
      }
      async function pista() {
        let r; try { r = await llamar('detectives.pista', { caso: id }); } catch (e) { return; }
        if (!vivo) return;
        prog.casos[id] = Object.assign(prog.casos[id] || { estado: 'abierto', fallos: 0 }, { pista: true });
        pon(res, h('div.dx-pista', '💡 ', r.pista));
      }
      async function rendirse() {
        if (!(await confirmDlg('¿Rendirse?', 'Verás la solución completa y este caso quedará cerrado sin puntos.', 'Ver la solución', true))) return;
        let r; try { r = await llamar('detectives.rendirse', { caso: id }); } catch (e) { return; }
        if (!vivo) return;
        prog.casos[id] = Object.assign(prog.casos[id] || {}, { estado: r.estado }); pintaSello();
        verSolucion(r);
      }
    }
    async function verSolucion(r) {
      if (!r || !r.solucion) {
        pon(caja, cargando('Abriendo la resolución…'));
        try { const s = await llamar('detectives.solucion', { caso: id }, { silencio: true }); r = Object.assign({}, r || {}, s); } catch (e) { return vivo && pon(caja, errorCaja(e, () => verSolucion(r))); }
        if (!vivo) return;
      }
      const s = r.solucion, quien = c.personas.find(p => p.id === s.quien), pr = c.pruebas.find(p => p.id === s.prueba);
      pon(caja, h('div.dx-solucion',
        h('div.dx-sol-h', estado() === 'resuelto' ? '🎉 ¡CASO RESUELTO!' : '📂 Resolución del caso', estado() === 'resuelto' && (r.puntos || (prog.casos[id] || {}).puntos) ? h('span.dx-pts', '+' + (r.puntos || prog.casos[id].puntos) + ' puntos') : null),
        h('div.dx-sol-g',
          h('div.dx-sol-quien', h('div.dx-retrato', { html: retratoSVG(quien.nombre, quien.rol) }), h('div', h('span.tiny.muted', 'Culpable'), h('b', quien.nombre), h('div.small.muted', quien.rol))),
          h('div', h('span.tiny.muted', 'Cómo'), h('p', c.como[s.como]), h('span.tiny.muted', 'Por qué'), h('p', c.porque[s.porque]))),
        h('span.tiny.muted', 'La prueba clave'), pruebaCard(pr),
        h('h3', 'Resolución'), h('p.dx-res-txt', r.res),
        c.insp ? h('p.tiny.muted', c.insp) : null,
        h('div.row.dx-acc', btn('Siguiente expediente', siguiente, { cls: 'primary' }), btn('Volver a la lista', lista, { cls: 'ghost' }))));
    }
    async function siguiente() {
      const idx = await indice().catch(() => []); const i = idx.findIndex(x => x.id === id);
      const sig = idx.slice(i + 1).concat(idx.slice(0, i)).find(x => !prog.casos[x.id] || prog.casos[x.id].estado === 'abierto');
      if (sig) abrir(sig.id); else lista();
    }

    pon(raiz, h('div.dx-cab', btn('← Expedientes', lista, { cls: 'ghost sm' }), h('div.grow', h('div.tiny.muted', c.exp.num + ' · ' + c.exp.lugar), h('h2', c.t)), sello),
      c.insp ? h('div.dx-insp', '📜 ', c.insp) : null,
      tabsEl, caja);
    ir(actual);
  }

  lista();
  return { destroy() { vivo = false; } };
}
