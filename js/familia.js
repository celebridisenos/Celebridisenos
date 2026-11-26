// ================= 25-11-2026 · LA CARA «FAMILIA» (temas Hueso y Grafito) =================
// Biou: «quiero entrar y prácticamente no reconocerlo… profesional, adulto, con personalidad; cada programa con la suya y los tres, familia».
// CelebriDiseños = vender y fabricar = TURQUESA sobre grafito, hueso y blanco, mate (contrato: FAMILIA_VISUAL.md). Por dentro es la de siempre
// (las mismas pantallas, rutas, permisos y datos): cambia la forma de moverse y el aspecto (css/familia.css, la última hoja).
//  · el MENÚ DE LA IZQUIERDA: 4 grupos con lo que se usa de verdad; se pliega a iconos (« ») y lo demás está en «Todo el menú» (Ctrl + espacio)
//  · respeta los permisos y lo que él ocultó en «Ordenar el menú»: aquí solo sale lo que su menú deja ver
//  · la TEMPORADA (Navidad): atributo data-temporada en <html>, en sus propios archivos; apagada no se carga nada
import { h, icon } from './ui.js';
import { esFam } from './iconos_fam.js';
export { esFam };

const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const guardar = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } };
const de = document.documentElement;

// [ruta, nombre corto, icono]
export const LADO = [
  { t: 'El día', items: [['puente', 'Inicio', 'home'], ['pedidos', 'Pedidos', 'bag'], ['hoy', 'Hoy en el taller', 'list'], ['responder', 'Chats', 'msg'], ['taller', 'Imprimir', 'printer'], ['epson', 'Tu Epson', 'image'], ['embalaje', 'Empaquetar', 'paquete']] },
  { t: 'Productos', items: [['productos', 'Productos', 'cube'], ['almacen', 'Mi almacén', 'cabinet'], ['celebrir8', 'Diseñar', 'pen'], ['catalogo', 'Catálogo', 'book']] },
  { t: 'Vender', items: [['cotizador', '¿Cuánto cobro?', 'euro'], ['pedidosweb', 'Pedidos web', 'cart'], ['clientes', 'Clientes', 'users'], ['tienda', 'Tienda web', 'globe'], ['ingresos', 'Números', 'chart']] },
  { t: 'Conectado', items: [['shampu', 'Shampú', 'robot'], ['celebrimesa', 'CelebriMesa', 'grid']] },
];
export const marca = nombre => { const m = /^celebri\s*dise(ñ|n)os$/i.test(String(nombre || '').trim()); return h('span.fam-nom', m || !nombre ? ['Celebri', h('i', 'diseños')] : nombre); };
// el emblema de verdad (la C con su estrella, sacada del logo: tools/logo_familia.py); si la empresa tiene otro logo puesto, el suyo
export const emblema = logo => h('span.fam-emb' + (logo ? '.propio' : ''), h('img', { src: logo || 'icons/logo-c.png', alt: '', width: 56, height: 56 }));

export function pintaLado(el, o) {
  const G = LADO.map(g => ({ t: g.t, items: g.items.filter(([k]) => o.visibles.has(k)) })).filter(g => g.items.length);
  const firma = 'fam' + JSON.stringify([G.map(g => g.items.map(x => x[0])), o.counts, o.logo || '', o.nombre || '', o.visibles.has('config')]);
  if (el.dataset.firma === firma) return; el.dataset.firma = firma;
  const plegado = () => de.classList.contains('fam-plegado');
  const bPlegar = h('button.r50-it.lado-plegar', { type: 'button', onclick: () => { const v = !plegado(); de.classList.toggle('fam-plegado', v); guardar('cd.lado', v ? '1' : null); pon(); } });
  const pon = () => { bPlegar.title = plegado() ? 'Ensanchar el menú' : 'Plegar el menú a iconos'; bPlegar.setAttribute('aria-label', bPlegar.title); bPlegar.replaceChildren(h('span.r50-ic', icon(plegado() ? 'expand' : 'collapse')), h('span.r50-t', 'Plegar')); };
  de.classList.toggle('fam-plegado', leer('cd.lado') === '1'); pon();
  el.replaceChildren(
    h('a.r50-marca.fam-marca', { href: '#/puente', title: (o.nombre || 'CelebriDiseños') + ' · Inicio' }, emblema(o.logo), h('span.fam-marca-t', marca(o.nombre), h('small', 'vender y fabricar'))),
    h('nav.r50-lista', { 'aria-label': 'Lo de todos los días' }, G.map(g => h('div.lado-g', h('h4', g.t), g.items.map(([k, t, i]) => h('a.r50-it', { href: '#/' + k, dataset: { k }, title: t }, h('span.r50-ic', icon(i)), h('span.r50-t', t),
      o.counts[k] ? h('span.r50-n', o.counts[k] > 99 ? '99+' : String(o.counts[k])) : null))))),
    h('div.r50-pie',
      h('button.r50-it.r50-todo', { type: 'button', title: 'Todas las secciones (Ctrl + espacio)', onclick: () => o.abrirTodo() }, h('span.r50-ic', icon('menu')), h('span.r50-t', 'Todo el menú')),
      o.visibles.has('config') ? h('a.r50-it', { href: '#/config', dataset: { k: 'config' }, title: 'Configuración' }, h('span.r50-ic', icon('settings')), h('span.r50-t', 'Configuración')) : null, bPlegar));
}

// ---------- la entrada (poner la contraseña, «¿Quién eres?»): el logo de verdad, grande, sobre grafito ----------
export function portadaEntrada() {
  return h('div.fam-portada', { 'aria-hidden': 'true' }, h('div.fam-aura'), h('div.fam-portada-c', emblema(''), marca(''), h('p', 'Vender y fabricar')));
}

// ---------- temporada ----------
// «navidad» de serie hasta el 7-1-2027; después, solo si él la enciende. Se guarda en este aparato (cd.temporada).
export const FIN_NAVIDAD = '2027-01-08';
export const deSerie = () => (!navigator.webdriver && new Date().toISOString().slice(0, 10) < FIN_NAVIDAD && new Date().toISOString().slice(0, 10) >= '2026-11-25' ? 'navidad' : 'ninguna');
export const temporada = () => { const v = leer('cd.temporada'); return v === 'navidad' || v === 'ninguna' ? v : deSerie(); };
let mod = null;
export const NAVIDAD_HECHA = true; // 25-11: css/temporada_navidad.css + js/temporada_navidad.js
// la nieve que cae, con su propio interruptor (de serie, sí). Se guarda en este aparato (cd.nieve = «no» para quitarla).
export const nieve = () => leer('cd.nieve') !== 'no';
export async function aplicaTemporada() {
  const on = NAVIDAD_HECHA && esFam() && temporada() === 'navidad', ID = 'css-temporada', ya = document.getElementById(ID);
  if (!on) { de.removeAttribute('data-temporada'); if (ya) ya.remove(); if (mod) { mod.apaga(); } return false; }
  if (!ya) { const l = document.createElement('link'); l.id = ID; l.rel = 'stylesheet'; l.href = 'css/temporada_navidad.css'; document.head.appendChild(l); }
  de.setAttribute('data-temporada', 'navidad');
  try { mod = mod || await import('./temporada_navidad.js'); if (de.dataset.temporada === 'navidad') mod.enciende({ nieve: nieve() }); } catch (e) { }
  return true;
}
export function ponTemporada(v) { guardar('cd.temporada', v === deSerie() ? null : v); return aplicaTemporada(); }
export function ponNieve(si) { guardar('cd.nieve', si ? null : 'no'); return aplicaTemporada(); }
// el interruptor (Configuración): «Temporada: Navidad / Ninguna» y, con Navidad, «Nieve: Sí / No»
export function interruptorTemporada() {
  const caja = h('div.col.fam-temporada', { style: { gap: '12px' } });
  const fila = (etq, ops, val, cambia) => h('div.row.wrap', { style: { gap: '12px', alignItems: 'center' } }, h('b', { style: { minWidth: '92px' } }, etq),
    h('div.seg', { role: 'group', 'aria-label': etq }, ops.map(([v, t]) => h('button' + (v === val ? '.on' : ''), { type: 'button', 'aria-pressed': v === val ? 'true' : 'false', style: { minHeight: '44px', minWidth: '84px' }, onclick: async () => { await cambia(v); pinta(); } }, t))));
  const pinta = () => { const t = temporada();
    caja.replaceChildren(
      fila('Temporada', [['navidad', 'Navidad'], ['ninguna', 'Ninguna']], t, v => ponTemporada(v)),
      t === 'navidad' ? fila('Nieve', [['si', 'Sí'], ['no', 'No']], nieve() ? 'si' : 'no', v => ponNieve(v === 'si')) : null,
      h('p.small.muted', { style: { margin: 0 } }, t === 'navidad'
        ? 'Luces que respiran arriba, el logo con su gorrito y su estrella de oro, renos finos y, si quieres, nieve que cae despacio detrás. Una bienvenida al día. Se apaga sola el 7 de enero (este aparato).'
        : 'Sin adornos: el programa queda igual que siempre (este aparato).'));
  };
  pinta(); return caja;
}
