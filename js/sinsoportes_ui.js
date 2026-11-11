// ================= 11-11-2026 · 🪄 MENOS SOPORTES (la ventana) =================
// Biou: «nuestro programa tiene que tener la capacidad de arreglar las piezas sin soportes o lo mínimo o que se quiten superficial…
// esto es súper importante». Prueba la pieza en varias posturas LAMINANDO cada una con su Bambu (en la torre), enseña la foto de cada
// una con sus gramos de soporte y su tiempo, marca la mejor y la abre en Bambu así, laminada (sin soporte, o con soporte fácil de quitar).
// Las cuentas, en ./soportes.js; lo de laminar, en desktop/host/soportes.go.
import { h, mount, modal, toast, btn } from './ui.js';
import { desktop } from './desktop.js';
import { ACABADOS, IMPRESORAS, acabadoPorK, impPorK, recordado, recordar } from './cotizar.js';
import { dibujoImpresora } from './acabado_ui.js';
import { POSTURAS, ordena, faltanInclinadas, resumen } from './soportes.js';

const g1 = v => String(Math.round(Number(v || 0) * 10) / 10).replace('.', ',');
const minTxt = s => { const m = Math.round(Number(s || 0) / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };

// x = { nombre, ruta } (la pieza en ESTE PC) · o = { imp, receta }
export function abrirMenosSoportes(x, o = {}) {
  if (!desktop.on || !desktop.soportesMedir) return toast('🪄 Esto lo hace el programa del PC (la torre), laminando con tu Bambu. Ábrelo allí.', 'warn', 8000);
  if (!x || !x.ruta) return toast('Esta pieza no tiene su archivo 3D en este PC.', 'warn', 7000);
  const E = { imp: o.imp || recordado('imp') || 'a1', receta: o.receta || 'normal' };
  let R = [], turno = 0, elegida = '', trabajando = false;
  const body = h('div.ms');
  const md = modal('🪄 Menos soportes · ' + x.nombre, body, close => [btn('Cerrar', close, { cls: 'ms-cerrar' }), btn('🖨️ Abrir en Bambu así', abrir, { cls: 'primary ms-abrir', disabled: true })], { size: 'cqm', onclose: () => { turno++; } });
  const bAbrir = md.el.querySelector('.ms-abrir');
  const cab = h('div.ms-cab'), estado = h('div.ms-estado'), rejilla = h('div.ms-rejilla'), nota = h('p.tiny.muted.ms-nota');
  mount(body, cab, estado, rejilla, nota);
  function pintaCab() {
    mount(cab,
      h('div.ms-fila', h('span.ms-lbl', '🖨️ Impresora'), h('div.ms-chips', IMPRESORAS.map(I => h('button.ms-chip' + (E.imp === I.k ? '.on' : ''), { type: 'button', 'data-imp': I.k, style: '--c:' + I.color, disabled: trabajando, onclick: () => cambia({ imp: I.k }) }, dibujoImpresora(I.k), I.nombre)))),
      h('div.ms-fila', h('span.ms-lbl', '✨ Acabado'), h('div.ms-chips', ACABADOS.map(a => h('button.ms-chip' + (E.receta === a.k ? '.on' : ''), { type: 'button', 'data-receta': a.k, style: '--c:' + a.color, disabled: trabajando, onclick: () => cambia({ receta: a.k }) }, a.e + ' ' + a.nombre)))));
  }
  function cambia(c) { Object.assign(E, c); recordar('imp', E.imp); prueba(); }
  function tarjeta(m, o) {
    const mejor = o.mejor && o.mejor.postura === m.postura, sop = Number(m.soporte) || 0;
    return h('button.ms-t' + (elegida === m.postura ? '.on' : '') + (mejor ? '.mejor' : ''), { type: 'button', 'data-postura': m.postura, onclick: () => { elegida = m.postura; pinta(); } },
      mejor ? h('span.ms-estrella', '⭐ LA MEJOR') : null,
      m.foto ? h('img.ms-foto', { src: m.foto, alt: m.nombre }) : h('div.ms-foto.vacia', '📦'),
      h('b.ms-nom', m.nombre),
      h('span.ms-sop' + (sop < 0.05 ? '.cero' : ''), sop < 0.05 ? '✅ Sin soportes' : '🌳 ' + g1(sop) + ' g de soporte'),
      h('span.ms-dat', '⏱️ ' + minTxt(m.segundos) + ' · ⚖️ ' + g1(m.gramos) + ' g'),
      m.seCae ? h('span.ms-ojo', '⚠️ Apoya poco: se puede caer') : null,
      (m.avisos || []).length ? h('span.ms-ojo', '⛔ Tu Bambu avisa: ' + m.avisos[0]) : null);
  }
  function pinta() {
    const o = ordena(R);
    if (!elegida && o.mejor && !trabajando) elegida = o.mejor.postura;
    mount(rejilla, o.lista.map(m => tarjeta(m, o)), R.filter(m => m.error).map(m => h('div.ms-t.fallo', h('b.ms-nom', m.nombre), h('span.ms-ojo', '⛔ ' + m.error))));
    const sel = o.lista.find(m => m.postura === elegida);
    bAbrir.disabled = trabajando || !sel;
    bAbrir.textContent = sel ? '🖨️ Abrir en Bambu: «' + sel.nombre + '»' : '🖨️ Abrir en Bambu así';
    window.__soportes = { E: Object.assign({}, E), trabajando, elegida, resultados: R.map(m => ({ postura: m.postura, soporte: m.soporte, segundos: m.segundos, gramos: m.gramos, seCae: m.seCae, error: m.error || '' })), mejor: o.mejor && o.mejor.postura, resumen: resumen(o) };
    if (!trabajando) mount(estado, h('div.ms-resumen' + (o.sinSoporte ? '.bien' : ''), h('b', o.sinSoporte ? '✅ ' : '🌳 '), resumen(o)));
    nota.textContent = 'MEDIDO: cada postura laminada con tu Bambu (' + impPorK(E.imp).nombre + ', acabado ' + acabadoPorK(E.receta).nombre + '). Si lleva soporte, va en árbol con algo más de hueco que el de serie, para que se despegue mejor. Ojo: al girarla cambia qué cara queda abajo y por dónde es más débil (las capas): si es una pieza de fuerza o con encajes, mira la foto antes de elegir.';
  }
  async function prueba() {
    const yo = ++turno; R = []; elegida = ''; trabajando = true; pintaCab(); pinta();
    let cola = POSTURAS.filter(p => !p.inclinada), hechas = 0, total = cola.length;
    const barra = h('i'), txt = h('span');
    mount(estado, h('div.ms-progreso', h('div.ms-barra', barra), txt));
    const una = async p => {
      if (yo !== turno) return;
      txt.textContent = '⏳ Tu Bambu está probando «' + p.t + '» (' + (hechas + 1) + ' de ' + total + ')…';
      try { R.push(Object.assign({ postura: p.k, nombre: p.t }, await desktop.soportesMedir(x.ruta, E.imp, E.receta, p.k))); }
      catch (e) { R.push({ postura: p.k, nombre: p.t, error: String(e.message || e).replace(/^Bambu no ha podido laminarla así: /, '') }); }
      if (yo !== turno) return;
      hechas++; barra.style.width = Math.round(hechas / total * 100) + '%'; pinta();
    };
    // de dos en dos (su torre lamina dos a la vez sin problema; así tarda la mitad)
    const corre = async L => { const q = L.slice(); await Promise.all([0, 1].map(async () => { while (q.length && yo === turno) await una(q.shift()); })); };
    await corre(cola);
    if (yo === turno && faltanInclinadas(R)) { const inc = POSTURAS.filter(p => p.inclinada); total += inc.length; await corre(inc); }
    if (yo !== turno) return;
    trabajando = false; pintaCab(); pinta();
  }
  async function abrir() {
    const o = ordena(R), sel = o.lista.find(m => m.postura === elegida);
    if (!sel) return;
    bAbrir.disabled = true; const t0 = bAbrir.textContent; bAbrir.textContent = '⏳ Preparándola laminada…';
    try {
      const r = await desktop.soportesAbrir(x.ruta, E.imp, E.receta, sel.postura, { sin: Number(sel.soporte) < 0.05 ? 1 : '' });
      window.__soportesAbierto = r || null;
      toast('🖨️ Abierta en Bambu «' + sel.nombre + '», ya laminada' + (Number(sel.soporte) < 0.05 ? ' y SIN soportes' : ' con soporte fácil de quitar') + '. Guardada en ' + ((r && r.archivo) || 'Documentos › CelebriDiseños_R8') + '.', 'ok', 10000);
    } catch (e) { toast('No se pudo abrir: ' + (e.message || e), 'bad', 9000); }
    bAbrir.disabled = false; bAbrir.textContent = t0;
  }
  pintaCab(); prueba();
  return md;
}

// desde un producto: busca su archivo 3D en este PC
export async function menosSoportesDeProducto(p) {
  if (!desktop.on) return toast('🪄 Esto lo hace el programa del PC (la torre), laminando con tu Bambu. Ábrelo allí.', 'warn', 8000);
  try { const { rutaDePieza } = await import('./pieza_taller.js'); const f = await rutaDePieza(p); return abrirMenosSoportes({ nombre: (f && f.nombre) || p.nombre, ruta: f && f.ruta }); }
  catch (e) { toast(e.message || String(e), 'warn', 8000); }
}
