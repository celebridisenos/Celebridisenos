// ================= v14.1 · SELECTOR DE COLORES del pedido =================
// Tres casos que pasan de verdad:
//   · un color («Rosa»);
//   · UNA pieza con varios colores («Blanco + Rosa»: la maceta blanca con el borde rosa);
//   · VARIAS piezas de colores distintos («2× Rosa · 1× Azul»: la cantidad del pedido se ajusta sola).
// Se guarda como TEXTO en el campo «Color» del pedido (el mismo de siempre): así lo entienden la lista, Hoy, las etiquetas
// y el Google Sheet sin cambiar nada. Al editar, el texto se vuelve a leer y el selector se coloca solo.
import { h, btn, inp } from './ui.js';

const CL = window.CL;
export const COLORES = [
  ['Blanco', '#ffffff'], ['Negro', '#111111'], ['Gris', '#9ca3af'], ['Plateado', '#c0c4cc'], ['Dorado', '#d4af37'],
  ['Rojo', '#dc2626'], ['Rosa', '#f472b6'], ['Rosa pastel', '#f9c6d9'], ['Fucsia', '#d9468f'], ['Naranja', '#f97316'],
  ['Amarillo', '#facc15'], ['Beige', '#e8d8b9'], ['Marrón', '#8b5a2b'], ['Verde', '#16a34a'], ['Verde menta', '#9ee6c8'],
  ['Verde oliva', '#7a8a3a'], ['Azul', '#2563eb'], ['Azul cielo', '#93c5fd'], ['Azul marino', '#1e3a8a'], ['Turquesa', '#14b8a6'],
  ['Morado', '#7c3aed'], ['Lila', '#c4b5fd'], ['Transparente', 'transparent'], ['Multicolor', 'multi'], ['Madera', '#b07a46'], ['Mármol', 'marmol']
];
const norm = s => CL.norm(String(s || '')).trim();
// Color de muestra para un nombre (también «rosa claro», «azul marino mate»…). '' si no se conoce.
export function hexDe(nombre) {
  const n = norm(nombre); if (!n) return '';
  if (/^#[0-9a-f]{6}$/i.test(String(nombre).trim())) return String(nombre).trim();
  const exacto = COLORES.find(c => norm(c[0]) === n); if (exacto) return exacto[1];
  const largo = COLORES.slice().sort((a, b) => b[0].length - a[0].length).find(c => n.includes(norm(c[0])));
  return largo ? largo[1] : '';
}
const fondo = hex => hex === 'multi' ? 'conic-gradient(#ef4444,#facc15,#22c55e,#3b82f6,#a855f7,#ef4444)' : hex === 'marmol' ? 'linear-gradient(135deg,#fafafa 40%,#cfcfcf 45%,#fafafa 52%,#e5e5e5)' : hex === 'transparent' ? 'repeating-conic-gradient(#e5e7eb 0 25%, #fff 0 50%) 0 0/8px 8px' : hex;
export const punto = (nombre, tam) => { const hx = hexDe(nombre); return hx ? h('i.col-punto', { title: nombre, style: { background: fondo(hx), width: (tam || 12) + 'px', height: (tam || 12) + 'px' } }) : null; };
// Lee el texto guardado → { modo, items: [{ c, n }] }
export function leer(texto) {
  const t = String(texto || '').trim();
  if (!t) return { modo: 'uno', items: [] };
  const partes = t.split(/\s*·\s*/).filter(Boolean);
  if (partes.length && partes.every(p => /^\d+\s*[×x]\s*\S/i.test(p))) return { modo: 'unidades', items: partes.map(p => { const m = p.match(/^(\d+)\s*[×x]\s*(.+)$/i); return { c: m[2].trim(), n: Number(m[1]) }; }) };
  const mezcla = t.split(/\s+\+\s+/).filter(Boolean);
  if (mezcla.length > 1) return { modo: 'mezcla', items: mezcla.map(c => ({ c, n: 1 })) };
  return { modo: 'uno', items: [{ c: t, n: 1 }] };
}
export function texto(st) {
  const it = st.items.filter(x => x.c && (st.modo !== 'unidades' || x.n > 0));
  if (!it.length) return '';
  if (st.modo === 'unidades') return it.map(x => x.n + '× ' + x.c).join(' · ');
  if (st.modo === 'mezcla') return it.map(x => x.c).join(' + ');
  return it[0].c;
}
// Puntos de color para enseñar en listas y fichas
export function muestras(textoColor) {
  const st = leer(textoColor); if (!st.items.length) return null;
  return h('span.col-muestras', { title: textoColor }, st.items.map(x => punto(x.c)).filter(Boolean));
}
// Colores del producto: los de la tienda web (variante «Color») o su campo Color con comas («Blanco, Negro, Rosa»)
export function coloresDeProducto(p) {
  if (!p) return [];
  const w = p.web && (p.web.variantes || []).find(v => /^color$/i.test(v.nombre));
  const lista = w && w.valores && w.valores.length ? w.valores : String(p.color || '').split(/\s*[,/;]\s*|\s+y\s+/i);
  return lista.map(x => String(x).trim()).filter(Boolean).slice(0, 16);
}

// ---------- El selector ----------
// opts: { valor, producto (objeto o null), cantidad: () => número, alCambiarCantidad(n), onChange(texto) }
export function selector(opts = {}) {
  const st = leer(opts.valor);
  let prod = opts.producto || null, abiertoOtro = false;
  const el = h('div.col-sel');
  const salida = h('div.small.col-salida');
  const avisa = () => { if (opts.onChange) opts.onChange(texto(st)); };
  const total = () => st.items.reduce((a, x) => a + (Number(x.n) || 0), 0);
  function pon(c) {
    const i = st.items.findIndex(x => norm(x.c) === norm(c));
    if (st.modo === 'uno') st.items = i >= 0 ? [] : [{ c, n: 1 }];
    else if (i >= 0) st.items.splice(i, 1);
    else st.items.push({ c, n: 1 });
    if (st.modo === 'unidades' && opts.alCambiarCantidad && total()) opts.alCambiarCantidad(total());
    pinta(); avisa();
  }
  function cambiaModo(m) {
    st.modo = m;
    if (m === 'uno' && st.items.length > 1) st.items = st.items.slice(0, 1);
    if (m === 'unidades' && st.items.length) {
      const q = Math.max(1, Number(opts.cantidad ? opts.cantidad() : 1) || 1);
      if (st.items.length === 1) st.items[0].n = q; // todas del mismo color de momento
      else st.items.forEach(x => { x.n = Math.max(1, Number(x.n) || 1); });
      if (opts.alCambiarCantidad) opts.alCambiarCantidad(total());
    }
    pinta(); avisa();
  }
  function chip(c, deProducto) {
    const on = st.items.some(x => norm(x.c) === norm(c)), hx = hexDe(c);
    return h('button.chip.col-chip' + (on ? '.on' : '') + (deProducto ? '.prod' : ''), { type: 'button', 'data-color': c, title: c, onclick: () => pon(c) },
      hx ? h('i.col-punto', { style: { background: fondo(hx) } }) : h('i.col-punto.sin'), c);
  }
  function pinta() {
    const delProd = coloresDeProducto(prod);
    const resto = COLORES.map(x => x[0]).filter(c => !delProd.some(p => norm(p) === norm(c)));
    const propios = st.items.map(x => x.c).filter(c => !delProd.concat(resto).some(p => norm(p) === norm(c))); // colores escritos a mano
    const otro = inp({ placeholder: 'Otro color (p. ej. verde agua)', 'aria-label': 'Otro color', style: { maxWidth: '220px' } });
    otro.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (otro.value.trim()) { abiertoOtro = false; pon(otro.value.trim()); } } });
    const modos = [['uno', '🎨 Un color'], ['mezcla', '🌗 Una pieza con varios colores'], ['unidades', '🔢 Varias piezas de colores distintos']];
    el.replaceChildren(
      h('div.seg.sm.col-modos', modos.map(([k, t]) => h('button' + (st.modo === k ? '.on' : ''), { type: 'button', 'data-modo': k, onclick: () => cambiaModo(k) }, t))),
      delProd.length ? h('div.col-grupo', h('div.tiny.muted', 'Colores de este producto'), h('div.chips', delProd.map(c => chip(c, true)))) : null,
      h('div.col-grupo', h('div.tiny.muted', delProd.length ? 'Otros colores' : 'Colores'), h('div.chips', resto.map(c => chip(c)), propios.map(c => chip(c)),
        abiertoOtro ? h('span.row', { style: { gap: '4px' } }, otro, btn('Añadir', () => { if (otro.value.trim()) { abiertoOtro = false; pon(otro.value.trim()); } }, { cls: 'sm' })) : h('button.chip', { type: 'button', onclick: () => { abiertoOtro = true; pinta(); setTimeout(() => el.querySelector('input[aria-label="Otro color"]').focus(), 0); } }, '＋ Otro'))),
      st.modo === 'unidades' && st.items.length ? h('div.col-unidades', st.items.map((x, i) => h('div.row.col-ud', { 'data-ud': x.c },
        punto(x.c, 16), h('span.grow', x.c),
        btn('−', () => { x.n = Math.max(0, (Number(x.n) || 0) - 1); if (!x.n) st.items.splice(i, 1); if (opts.alCambiarCantidad && total()) opts.alCambiarCantidad(total()); pinta(); avisa(); }, { cls: 'sm', title: 'Una menos' }),
        h('b.col-n', String(x.n)),
        btn('+', () => { x.n = (Number(x.n) || 0) + 1; if (opts.alCambiarCantidad) opts.alCambiarCantidad(total()); pinta(); avisa(); }, { cls: 'sm', title: 'Una más' }))),
        h('div.tiny.muted', 'Total: ' + total() + (total() === 1 ? ' pieza' : ' piezas') + ' (la cantidad del pedido se ajusta sola)')) : null,
      salida);
    const t = texto(st);
    salida.replaceChildren(t ? h('span', 'Se guardará: ', muestras(t), ' ', h('b', t)) : h('span.muted', st.modo === 'uno' ? 'Toca un color (o déjalo vacío si no importa).' : 'Toca los colores que lleva.'));
  }
  pinta();
  return { el, value: () => texto(st), setProducto(p) { prod = p; pinta(); }, total };
}

// ================= v16.2 · COLORES DEL PRODUCTO: se eligen tocando círculos, no escribiendo =================
// Primero salen los colores de TUS bobinas (las que no están agotadas), con su color de verdad; debajo, los demás.
// Se guarda como siempre, en el campo «Color» del producto: «Blanco, Negro, Rosa» (así lo entienden pedidos y tienda).
const partir = t => String(t || '').split(/\s*[,/;]\s*/).map(x => x.trim()).filter(Boolean);
const unico = l => { const v = new Set(); return l.filter(x => { const k = norm(x); if (!k || v.has(k)) return false; v.add(k); return true; }); };
export function coloresDeBobinas(bobinas) {
  const m = new Map();
  (bobinas || []).forEach(b => { const c = String(b.color || '').trim(), k = norm(c); if (!c || b.estado === 'Agotada' || m.has(k)) return; m.set(k, { c, hex: /^#[0-9a-f]{6}$/i.test(String(b.colorHex || '').trim()) ? String(b.colorHex).trim() : hexDe(c) }); });
  return [...m.values()].sort((a, b) => a.c.localeCompare(b.c, 'es'));
}
// «Blanco, Negro y Rosa»
export const fraseColores = l => l.length < 2 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1];
const LINEA_COL = /\n*^[^\S\n]*(?:🎨\s*)?Colores disponibles:.*$/im;
// Pone (o cambia, o quita) la línea «Colores disponibles: …» al final de la descripción, sin tocar el resto del texto
export function descripcionConColores(descripcion, colores) {
  const base = String(descripcion || '').replace(LINEA_COL, '').replace(/\s+$/, ''), l = unico(partir(Array.isArray(colores) ? colores.join(',') : colores));
  return l.length ? (base ? base + '\n\n' : '') + 'Colores disponibles: ' + fraseColores(l) + '.' : base;
}
// opts: { campo (el <input> de Color), bobinas, onChange(lista) } → elemento con los círculos
export function paletaProducto(opts) {
  const campo = opts.campo, el = h('div.pcol'); let verTodos = false, otroAbierto = false;
  const lista = () => unico(partir(campo.value));
  const pon = l => { campo.value = unico(l).join(', '); pinta(); if (opts.onChange) opts.onChange(lista()); };
  const alterna = c => { const l = lista(), i = l.findIndex(x => norm(x) === norm(c)); if (i >= 0) l.splice(i, 1); else l.push(c); pon(l); };
  const circulo = (c, hex) => { const on = lista().some(x => norm(x) === norm(c)); const b = h('button.pcol-c' + (on ? '.on' : ''), { type: 'button', 'data-color': c, title: c, 'aria-pressed': on ? 'true' : 'false', onclick: () => alterna(c) }, h('i' + (hex ? '' : '.sin')), h('span', c)); if (hex) b.firstChild.style.background = fondo(hex); return b; };
  function pinta() {
    const bob = coloresDeBobinas(opts.bobinas), enBob = c => bob.some(b => norm(b.c) === norm(c)), sel = lista();
    const resto = COLORES.filter(c => !enBob(c[0])), propios = sel.filter(c => !enBob(c) && !COLORES.some(x => norm(x[0]) === norm(c)));
    const otro = inp({ placeholder: 'Otro color (p. ej. verde agua)', 'aria-label': 'Otro color', style: { maxWidth: '220px' } });
    const mete = () => { const v = otro.value.trim(); otroAbierto = false; if (v) pon(lista().concat(partir(v))); else pinta(); };
    otro.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); mete(); } });
    const muchos = resto.length > 12 && bob.length > 0 && !verTodos;
    el.replaceChildren(
      h('div.pcol-cab', h('b', sel.length ? sel.length + (sel.length === 1 ? ' color elegido' : ' colores elegidos') : 'Toca los colores en los que lo haces'),
        bob.length ? btn('Todos los de mis bobinas', () => pon(lista().concat(bob.map(b => b.c))), { cls: 'sm pcol-todos' }) : null, sel.length ? btn('Quitar todos', () => pon([]), { cls: 'sm ghost pcol-nada' }) : null),
      bob.length ? h('div.pcol-g', h('div.tiny.muted', '🧵 De tus bobinas'), h('div.pcol-l', bob.map(b => circulo(b.c, b.hex)))) : null,
      h('div.pcol-g', h('div.tiny.muted', bob.length ? 'Más colores' : 'Colores'), h('div.pcol-l', (muchos ? resto.slice(0, 12) : resto).map(c => circulo(c[0], c[1])), propios.map(c => circulo(c, hexDe(c))),
        muchos ? h('button.pcol-mas', { type: 'button', onclick: () => { verTodos = true; pinta(); } }, '＋ ' + (resto.length - 12) + ' más') : null,
        otroAbierto ? h('span.row', { style: { gap: '4px' } }, otro, btn('Añadir', mete, { cls: 'sm' })) : h('button.pcol-mas', { type: 'button', onclick: () => { otroAbierto = true; pinta(); setTimeout(() => { const i = el.querySelector('input[aria-label="Otro color"]'); if (i) i.focus(); }, 0); } }, '＋ Otro'))));
  }
  campo.addEventListener('input', () => { pinta(); if (opts.onChange) opts.onChange(lista()); });
  pinta();
  return el;
}
