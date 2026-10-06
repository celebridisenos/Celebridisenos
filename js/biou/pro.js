// ================= v15.2 · BIOUVISION PRO: máscaras de IA, pincel, historial y favoritos =================
// Piezas que usa el editor de fotos (y que pueden usar los demás editores):
//   · subMascara: la máscara de la IA se calcula UNA vez sobre la foto entera y se recorta al encuadre (no hay que repetirla).
//   · aplicarTrazos: el pincel «Recuperar» / «Borrar» corrige la máscara a mano (los trazos se guardan, no se pierden).
//   · historial: deshacer y rehacer (Ctrl+Z / Ctrl+Y) en cualquier editor.
//   · favoritos: los filtros marcados con ★ salen los primeros.

// Caja y área de una máscara { w, h, a } (lo que vale > 0.5 es producto). null si no queda nada.
export function conCaja(m) {
  if (!m) return null;
  const { w, h, a } = m; let x0 = w, y0 = h, x1 = -1, y1 = -1, area = 0;
  for (let p = 0; p < a.length; p++) if (a[p] > 0.5) { area++; const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (!area) return null;
  return Object.assign({}, m, { caja: { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h }, area: area / a.length });
}

// La parte de la máscara que cae dentro del encuadre cr = { x, y, w, h } (0..1)
export function subMascara(m, cr) {
  if (!m) return null;
  if (!cr || (cr.x <= 0 && cr.y <= 0 && cr.w >= 1 && cr.h >= 1)) return m;
  const x0 = Math.max(0, Math.floor(cr.x * m.w)), y0 = Math.max(0, Math.floor(cr.y * m.h));
  const w = Math.max(1, Math.min(m.w - x0, Math.round(cr.w * m.w))), h = Math.max(1, Math.min(m.h - y0, Math.round(cr.h * m.h)));
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) a.set(m.a.subarray((y0 + y) * m.w + x0, (y0 + y) * m.w + x0 + w), y * w);
  return conCaja({ w, h, a, modelo: m.modelo, ia: m.ia });
}

// Pincel. Cada trazo: { modo: '+' (recuperar) | '-' (borrar), r: radio (fracción del ANCHO de la foto girada), pts: [[x,y]…] (0..1 de la foto girada) }
// m es la máscara del encuadre (o null si no se encontró nada: se empieza de cero). W×H = proporción del encuadre.
export function aplicarTrazos(m, trazos, cr, W, H) {
  if (!trazos || !trazos.length) return m;
  cr = cr || { x: 0, y: 0, w: 1, h: 1 };
  if (!m) { const k = Math.min(1, 520 / Math.max(W, H)); m = { w: Math.max(8, Math.round(W * k)), h: Math.max(8, Math.round(H * k)), a: null }; }
  const w = m.w, h = m.h, a = m.a ? new Float32Array(m.a) : new Float32Array(w * h);
  const sello = (cx, cy, r, mas) => {
    const xa = Math.max(0, Math.floor(cx - r)), xb = Math.min(w - 1, Math.ceil(cx + r)), ya = Math.max(0, Math.floor(cy - r)), yb = Math.min(h - 1, Math.ceil(cy + r));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const d = Math.hypot(x - cx, y - cy) / r; if (d >= 1) continue;
      const f = d < 0.7 ? 1 : (1 - d) / 0.3, p = y * w + x;
      a[p] = mas ? Math.max(a[p], f) : Math.min(a[p], 1 - f);
    }
  };
  for (const t of trazos) {
    const r = Math.max(1, t.r * w / cr.w), mas = t.modo === '+';
    const pt = q => [(q[0] - cr.x) / cr.w * w, (q[1] - cr.y) / cr.h * h];
    let prev = null;
    for (const q of t.pts) {
      const [x, y] = pt(q);
      if (prev) { const n = Math.ceil(Math.hypot(x - prev[0], y - prev[1]) / (r * 0.35)); for (let i = 1; i <= n; i++) sello(prev[0] + (x - prev[0]) * i / n, prev[1] + (y - prev[1]) * i / n, r, mas); }
      else sello(x, y, r, mas);
      prev = [x, y];
    }
  }
  return conCaja({ w, h, a, modelo: m.modelo, ia: m.ia });
}

// Capa roja (lo que se quita) para ver la máscara mientras se usa el pincel
export function capaRoja(m, W, H) {
  const c = document.createElement('canvas'); c.width = m.w; c.height = m.h; const g = c.getContext('2d');
  const im = g.createImageData(m.w, m.h);
  for (let p = 0; p < m.a.length; p++) { im.data[p * 4] = 239; im.data[p * 4 + 1] = 68; im.data[p * 4 + 2] = 68; im.data[p * 4 + 3] = (1 - m.a[p]) * 140; }
  g.putImageData(im, 0, 0);
  const o = document.createElement('canvas'); o.width = W; o.height = H; const go = o.getContext('2d'); go.imageSmoothingQuality = 'high'; go.drawImage(c, 0, 0, W, H);
  return o;
}

// ---------- Deshacer / rehacer ----------
// Las cosas pesadas (fotos, LUT, máscaras) no se copian: se guardan por referencia, así el historial ocupa poco.
const PESADOS = new Set(['imagen', 'lut', 'ia']);
const ids = new WeakMap(); let nId = 0;
const idDe = v => { if (!ids.has(v)) ids.set(v, ++nId); return ids.get(v); };
export function clonar(o) {
  const refs = [];
  const s = JSON.stringify(o, (k, v) => PESADOS.has(k) && v && typeof v === 'object' ? (refs.push(v), { __ref: refs.length - 1 }) : v);
  return s === undefined ? o : JSON.parse(s, (k, v) => v && typeof v === 'object' && '__ref' in v ? refs[v.__ref] : v);
}
export const firma = o => JSON.stringify(o, (k, v) => PESADOS.has(k) && v && typeof v === 'object' ? '#' + idDe(v) : v);

// historial(alCambiar): poner(estado) tras cada cambio; atras()/adelante() devuelven el estado a restaurar (o null)
export function historial(alCambiar, max = 80) {
  let pila = [], i = -1, ultima = '';
  const avisa = () => alCambiar && alCambiar({ atras: i > 0, adelante: i < pila.length - 1 });
  return {
    vaciar(st) { pila = st ? [clonar(st)] : []; i = pila.length - 1; ultima = st ? firma(st) : ''; avisa(); },
    // apunta el estado si cambió desde la última vez (devuelve true si lo apuntó)
    apuntar(st) { const f = firma(st); if (f === ultima) return false; pila = pila.slice(0, i + 1); pila.push(clonar(st)); if (pila.length > max) pila.shift(); i = pila.length - 1; ultima = f; avisa(); return true; },
    // cambia el último estado sin crear un paso nuevo (p. ej. cuando el programa encuentra la cara él solo)
    rebase(st) { if (i < 0) return this.vaciar(st); pila[i] = clonar(st); ultima = firma(st); },
    atras() { if (i <= 0) return null; i--; ultima = firma(pila[i]); avisa(); return clonar(pila[i]); },
    adelante() { if (i >= pila.length - 1) return null; i++; ultima = firma(pila[i]); avisa(); return clonar(pila[i]); },
    get puedeAtras() { return i > 0; }, get puedeAdelante() { return i < pila.length - 1; }
  };
}
// Ctrl+Z / Ctrl+Y / Ctrl+Mayús+Z (sin molestar al escribir en una casilla de texto). Devuelve la función para quitarlo.
export function teclasDeshacer(atras, adelante) {
  const f = e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const t = e.target, tag = t && t.tagName;
    if (tag === 'TEXTAREA' || (t && t.isContentEditable) || (tag === 'INPUT' && !/^(range|checkbox|radio|button|color)$/i.test(t.type))) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); atras(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); adelante(); }
  };
  addEventListener('keydown', f);
  return () => removeEventListener('keydown', f);
}

// ---------- Favoritos (★) ----------
const FAV = 'cd.biouFav';
export function favoritos() { try { return new Set(JSON.parse(localStorage.getItem(FAV) || '[]')); } catch (e) { return new Set(); } }
export function alternarFavorito(id) { const s = favoritos(); if (s.has(id)) s.delete(id); else s.add(id); try { localStorage.setItem(FAV, JSON.stringify([...s].slice(-300))); } catch (e) { } return s.has(id); }
