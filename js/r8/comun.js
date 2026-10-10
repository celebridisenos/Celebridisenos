// ================= v20 · 🧊 CelebriR8 · PIEZAS COMUNES de las pantallas PRO (Smart Lab, Reparar, Precisión, Imprimir) =================
// Para que todas se comporten igual: la vista 3D con sus botones, abrir un archivo (STL, OBJ o 3MF), guardar en el PC o
// descargar, las ayudas «?» (sin llenar la pantalla de texto) y las etiquetas de cada dato: MEDIDO · APROX. · SIN MEDIR.
import { h, mount, btn, toast } from '../ui.js';
import * as MA from './malla.js';

export const n2 = (x, d = 2) => x == null || !isFinite(x) ? '—' : Number(x).toLocaleString('es-ES', { maximumFractionDigits: d });
export const mm = (x, d = 2) => n2(x, d) + ' mm';
export const dimsTxt = (d, k = 1) => d ? d.map(x => n2(x, k)).join(' × ') + ' mm' : '—';

// ---------- etiquetas: de dónde sale cada dato ----------
export const ET = { medido: ['MEDIDO', 'Sale de medir la malla de verdad'], aprox: ['APROX.', 'Es una aproximación: mírala como orientación, no como una medida exacta'], nomedido: ['SIN MEDIR', 'No se ha podido comprobar'], estimado: ['ESTIMADO', 'Calculado con supuestos (densidad, relleno…): puede variar'] };
export const etiqueta = k => h('span.r8p-et.' + (k === 'estimado' ? 'aprox' : k), { title: ET[k][1] }, ET[k][0]);

// ---------- ayuda «?» ----------
let tip = null;
export function ayuda(texto) {
  const b = h('button.r8p-ayuda', { type: 'button', 'aria-label': 'Ayuda: ' + texto, title: texto }, '?');
  const sale = () => { if (tip) { tip.remove(); tip = null; } };
  const entra = () => { sale(); const r = b.getBoundingClientRect(); tip = h('div.r8p-tip', { role: 'tooltip' }, texto); document.body.appendChild(tip); const w = tip.offsetWidth, hh = tip.offsetHeight; tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px'; tip.style.top = (r.top - hh - 8 > 8 ? r.top - hh - 8 : r.bottom + 8) + 'px'; };
  b.addEventListener('mouseenter', entra); b.addEventListener('focus', entra); b.addEventListener('mouseleave', sale); b.addEventListener('blur', sale); b.addEventListener('click', e => { e.preventDefault(); tip ? sale() : entra(); });
  return b;
}

// ---------- una fila de comprobación ----------
// estado: 'ok' | 'mal' | 'ojo' | 'nomedido'; et: 'medido' | 'aprox' | 'nomedido' | 'estimado'
export function chk(estado, titulo, detalle, et) {
  return h('div.r8p-chk.' + (estado === 'nomedido' ? 'nada' : estado), h('span', { ok: '✅', mal: '❌', ojo: '⚠️', nomedido: '⚪' }[estado] || '⚪'), h('div', h('b', titulo), detalle ? h('small', detalle) : null), et ? etiqueta(et) : h('span'));
}

// ---------- la vista 3D ----------
export async function vista3d(lienzo, o = {}) {
  const { crearEscena } = await import('./escena3d.js');
  const esc = crearEscena(lienzo, { cama: o.cama || 256, dia: document.documentElement.getAttribute('data-modo') === 'dia', foto: !!o.foto });
  esc.encuadrar('iso');
  return esc;
}
export const VISTAS = [['iso', '◆', 'Vista 3D'], ['frente', 'Frente', 'De frente'], ['derecha', 'Lado', 'De lado'], ['detras', 'Detrás', 'Por detrás'], ['arriba', 'Arriba', 'Desde arriba']];
export const botonesVista = esc => h('div.der', VISTAS.map(([k, t, tt]) => h('button.r8p-pill', { type: 'button', title: tt, 'data-v': k, onclick: () => esc() && esc().encuadrar(k) }, t)));

// ---------- abrir un archivo (STL / OBJ / 3MF) → STL binario + sopa ----------
export function pideArchivo(acepta = '.stl,.obj,.3mf') { return new Promise(res => { const i = h('input', { type: 'file', accept: acepta, style: { display: 'none' }, onchange: () => { const f = i.files && i.files[0]; i.remove(); res(f || null); } }); document.body.appendChild(i); i.click(); }); }
export async function leeModelo(f) {
  const buf = await f.arrayBuffer(), { parse3D } = await import('../stl.js');
  const sopa = await parse3D(buf, f.name);
  if (!sopa || sopa.length < 9) throw new Error('No he encontrado ninguna pieza en «' + f.name + '».');
  return { nombre: f.name.replace(/\.[^.]+$/, ''), stl: MA.stlDeSopa(sopa, f.name), sopa }; // siempre STL binario (también si llega de texto, OBJ o 3MF)
}
// zona para soltar un archivo
export function zonaSoltar(texto, alAbrir) {
  const z = h('button.r8p-drop', { type: 'button', onclick: async () => { const f = await pideArchivo(); if (f) alAbrir(f); } }, h('b', '📂 ' + texto), h('small', 'STL, OBJ o 3MF · o suéltalo aquí'));
  z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('encima'); }); z.addEventListener('dragleave', () => z.classList.remove('encima'));
  z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('encima'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) alAbrir(f); });
  return z;
}

// ---------- descargar / guardar en el PC ----------
export function descarga(datos, nombre, tipo = 'model/stl') { const b = datos instanceof Blob ? datos : new Blob([datos], { type: tipo }), u = URL.createObjectURL(b), a = h('a', { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); }
export async function guardaEnPC(datos, carpeta, nombre, tipo) {
  const d = await import('../desktop.js').catch(() => null), D = d && d.desktop;
  const b = datos instanceof Blob ? datos : new Blob([datos], { type: tipo || 'application/octet-stream' });
  if (D && D.on && D.r8Guardar) { const r = await D.r8Guardar(b, carpeta, nombre); toast('💾 Guardado en Documentos › CelebriDiseños_R8 › ' + carpeta.replace(/\//g, ' › '), 'ok', 6000, D.r8Carpeta ? { t: 'Abrir carpeta', on: () => D.r8Carpeta(carpeta) } : null); return r.path; }
  descarga(b, nombre, tipo); return null;
}
export const marcaHora = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '_' + z(d.getHours()) + z(d.getMinutes()); };
export const limpioNombre = s => String(s || 'modelo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'modelo';
export async function escritorio() { const d = await import('../desktop.js').catch(() => null); return d && d.desktop && d.desktop.on ? d.desktop : null; }
// guardar en el PC sin avisos (el Smart Lab guarda cada modelo según sale); fuera del PC no hace nada
export async function guardaEnPCSilencio(datos, carpeta, nombre) {
  const D = await escritorio(); if (!D || !D.r8Guardar) return null;
  const b = datos instanceof Blob ? datos : new Blob([datos]); const r = await D.r8Guardar(b, carpeta, nombre); return r && r.path;
}
// zona para soltar (o elegir) una FOTO
export function zonaSoltarFoto(texto, alAbrir) {
  const z = h('button.r8p-drop', { type: 'button', onclick: async () => { const f = await pideArchivo('image/*'); if (f) alAbrir(f); } }, h('b', '📷 ' + texto), h('small', 'JPG o PNG · o suéltala aquí'));
  z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('encima'); }); z.addEventListener('dragleave', () => z.classList.remove('encima'));
  z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('encima'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) alAbrir(f); });
  return z;
}
