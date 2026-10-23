// ================= 👗 CelebriDREW · 🏷️ MI MARCA (THE NOORKO): todo lo de su carpeta NOORKO1, a mano y que SIRVA (18-10-2026) =================
// Ella: «adjunté una carpeta entera NOORKO con muchos recursos: no los veo que se esté utilizando». Hasta hoy solo se usaban sus planos (el
// catálogo), sus diseños y logos (en «Tela») y los colores del libro de marca. Aquí, en su pestaña y con un toque cada cosa:
//  · 🧍 su AVATAR de CLO (Avatar_Adriana.avs): se lee de su carpeta, sin buscar el archivo;
//  · 📸 sus FOTOS e IDEAS (OUTFITS, DISEÑOS/REVISION…): se abren en «Diseñar desde una imagen» (la IA la lee y hace el patrón);
//  · 🎨 sus DISEÑOS y LOGOS, ✨ los 517 GRÁFICOS de su pack: se estampan en la prenda (y se mueven en «Tela»);
//  · 🏷️ las ETIQUETAS (87): detrás del cuello, como en una prenda de verdad;
//  · 🧩 la biblioteca de DETALLES (cuellos, capuchas, bolsillos, cremalleras, botones, detalles textiles): para mirarlos en grande y usarlos
//    de referencia; · 🎨 su PALETA; · 📒 la FICHA TÉCNICA con la estructura de sus TECHPACKS.
// Nada se copia al programa (la app del móvil se publica en internet y esto es suyo y de pago): se lee de su carpeta, en el PC.
import { h, btn, modal } from '../ui.js';
import * as MA from './marca.js';

const MV = 'MOCKUP VECTORS\\MOCKUP VECTORS', ACC = MV + '\\ACCESSORIES (COLLARS, POCKETS, BUTTONS...)';
export const SECCIONES = [
  { k: 'fotos', t: '📸 Tus fotos e ideas', d: 'Tócala: se abre en «Diseñar desde una imagen» (la IA la lee, te pregunta lo que no ve y hace el patrón).', subs: ['OUTFITS', 'DISEÑOS\\REVISION', 'DISEÑOS\\PROCESO'], accion: 'abrir', max: 80, pagina: 24 },
  { k: 'disenos', t: '🎨 Tus diseños y logos', d: 'Tócalo: se estampa en el pecho de la prenda (en «Tela» lo mueves y lo cambias de tamaño).', subs: ['LOGO', 'DISEÑOS\\PALABRAS', 'DISEÑOS\\PROCESO'], accion: 'estampar', max: 80, pagina: 24 },
  { k: 'graficos', t: '✨ Gráficos de tu pack (517)', d: 'Tócalo y se estampa.', subs: [MV + '\\GRAPHIC ICONS'], accion: 'estampar', max: 540, pagina: 48 },
  { k: 'etiquetas', t: '🏷️ Etiquetas', d: 'Tócala: va detrás del cuello (5 cm de ancho), como en una prenda de tienda.', subs: [ACC + '\\LABELS'], accion: 'etiqueta', max: 100, pagina: 24 },
  { k: 'detalles', t: '🧩 Detalles: cuellos, capuchas, bolsillos, cremalleras, botones', d: 'Tu biblioteca de referencia: tócalo para verlo en grande; desde ahí «Usar como referencia» lo abre en «Diseñar desde una imagen».', subs: [ACC + '\\COLLARS, HOODS.._', ACC + '\\POCKETS', ACC + '\\ZIPPERS', ACC + '\\BUTTONS', ACC + '\\TEXTILE DETAILS'], accion: 'ver', max: 900, pagina: 36 },
];
// ctx = { st, base, repinta(), estampar(d), etiqueta(d), abrir(d), clo(ruta, nombre), color(hex), ficha() }
export function panel(ctx) {
  const st = ctx.st; st.marcaUI = st.marcaUI || { abiertas: {}, listas: {}, paginas: {}, avs: null };
  const U = st.marcaUI, base = ctx.base;
  if (!MA.enPC()) return [h('h3', '🏷️ ' + MA.MARCA.nombre), h('div.dw-ayuda', 'Tu carpeta NOORKO1 está en el PC del taller: abre CelebriDREW allí para usar tus fotos, diseños, gráficos y etiquetas. Aquí tienes tu paleta.'), paleta(ctx)];
  if (!base) return [h('h3', '🏷️ ' + MA.MARCA.nombre), h('div.dw-ayuda.dw-ojo', 'No encuentro tu carpeta NOORKO1. Escribe dónde está:'), carpetaInput(ctx)];
  // el avatar de CLO (los .avs de su carpeta), una vez
  if (!U.avs) { U.avs = 'cargando'; listaAvs(base).then(L => { U.avs = L; ctx.repinta(); }); }
  const seccion = S => { const abierta = !!U.abiertas[S.k], L = U.listas[S.k], pag = U.paginas[S.k] || 1;
    const det = h('details.dw-marca-sec', { open: abierta, 'data-sec': S.k, ontoggle: e => { U.abiertas[S.k] = e.target.open; if (e.target.open && !L) carga(S); } }, h('summary', S.t, L && L !== 'cargando' ? h('small', ' · ' + L.length) : null),
      h('div.dw-ayuda', S.d),
      !L || L === 'cargando' ? h('div.dw-ayuda', 'Mirando tu carpeta…') : !L.length ? h('div.dw-ayuda.dw-ojo', 'No hay imágenes en ' + S.subs.join(' · ')) :
        [h('div.dw-marca-rejilla', L.slice(0, pag * S.pagina).map(d => h('button.dw-marca-img', { type: 'button', title: d.nombre, 'data-ruta': d.ruta, onclick: () => usa(S, d) }, h('img', { src: MA.urlDe(d.ruta), alt: d.nombre, loading: 'lazy' })))),
          L.length > pag * S.pagina ? btn('Ver más (' + (L.length - pag * S.pagina) + ')', () => { U.paginas[S.k] = pag + 1; ctx.repinta(); }, { cls: 'sm ghost' }) : null]);
    return det; };
  function carga(S) { U.listas[S.k] = 'cargando'; MA.imagenes(base, S.subs, S.max, 3).then(L => { U.listas[S.k] = L.sort((a, b) => a.carpeta.localeCompare(b.carpeta) || a.nombre.localeCompare(b.nombre, 'es', { numeric: true })); ctx.repinta(); }).catch(() => { U.listas[S.k] = []; ctx.repinta(); }); }
  function usa(S, d) { if (S.accion === 'abrir') ctx.abrir(d); else if (S.accion === 'estampar') ctx.estampar(d); else if (S.accion === 'etiqueta') ctx.etiqueta(d); else ver(d); }
  function ver(d) { const m = modal('🧩 ' + d.nombre, h('div.dw-marca-ver', h('img', { src: MA.urlDe(d.ruta), alt: d.nombre }), h('div.dw-ayuda', d.carpeta.replace(/^.*ACCESSORIES[^\\]*\\/, ''))),
    [btn('Cerrar', () => m.close(), { cls: 'ghost' }), btn('🌐 Usar como referencia', () => { m.close(); ctx.abrir(d); }, { cls: 'primary' }), btn('🎨 Estamparlo', () => { m.close(); ctx.estampar(d); }, { cls: 'ghost' })]); }
  return [h('h3', '🏷️ ' + MA.MARCA.nombre + (MA.MARCA.lema ? ' · ' + MA.MARCA.lema : '')), h('div.dw-ayuda', 'Todo lo de tu carpeta NOORKO1, con un toque. Se lee de tu PC: no se copia a la app del móvil.'),
    h('div.dw-marca-g', h('b', '🧍 Tu avatar de CLO'), U.avs === 'cargando' || !U.avs ? h('div.dw-ayuda', 'Mirando tu carpeta…') : U.avs.length ? h('div.dw-chips', U.avs.map(a => btn('🧍 ' + a.nombre, () => ctx.clo(a.ruta, a.nombre + '.avs'), { cls: 'sm ghost dw-marca-clo' })))
      : h('div.dw-ayuda', 'No hay avatares de CLO (.avs) en «Avatares Clo 3D».')),
    h('div.dw-marca-g', h('b', '🎨 Tu paleta'), paleta(ctx)),
    SECCIONES.map(seccion),
    h('div.dw-marca-g', h('b', '📒 Ficha técnica'), h('div.dw-ayuda', 'Con la estructura de tus TECHPACKS (portada, dibujos, medidas por talla, materiales, avíos): en «Exportar».'), btn('Ir a la ficha técnica', ctx.ficha, { cls: 'sm ghost' })),
    h('details.dw-marca-sec', h('summary', '📁 Tu carpeta'), carpetaInput(ctx))];
}
async function listaAvs(base) { try { const { desktop } = await import('../desktop.js'); const r = await desktop.list(base.replace(/[\\/]+$/, '') + '\\Avatares Clo 3D'); return (r.entries || []).filter(e => /\.avs$/i.test(e.name)).map(e => ({ nombre: e.name.replace(/\.avs$/i, '').replace(/_/g, ' '), ruta: e.path })); } catch (e) { return []; } }
function paleta(ctx) { return h('div.dw-chips', MA.MARCA.colores.map(c => h('button.dw-chip', { type: 'button', 'data-color': c.hex, title: c.t + ' · ' + c.uso, style: { width: '34px', height: '34px', padding: 0, background: c.hex, borderColor: '#0003' }, onclick: () => ctx.color(c.hex) }))); }
function carpetaInput(ctx) { const i = h('input', { type: 'text', value: ctx.base || '', placeholder: 'C:\\Users\\…\\NOORKO1', style: { width: '100%' } });
  return h('div', i, btn('Guardar', () => { MA.guardaCarpeta(i.value.trim() || null); ctx.st.marca.base = undefined; ctx.st.marcaUI = null; ctx.recarga(); }, { cls: 'sm ghost' })); }
