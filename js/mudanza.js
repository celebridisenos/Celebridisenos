// ================= v30.7.1 · 📦 MUDANZA: llevar CelebriDiseños a otro ordenador =================
// La dueña (12-10-2026): «quiero que hagas una copia de seguridad fácil de usar para poder mover todo mi programa en caso de cambiar
// de ordenador: cómo hacerlo, llevarme paso a paso, con sus archivos bien, todo puesto».
// Un botón (Configuración › Mi cuenta, o buscando «mudanza») prepara UNA carpeta en el USB o el disco que elijas, con todo ordenado
// por números, una guía paso a paso con tus datos y un «RESTAURAR_EN_EL_PC_NUEVO.bat» que lo coloca todo en el otro ordenador.
// La copia la hace el programa del PC (desktop/host/mudanza.go): aquí solo está la ventana. No borra ni cambia nada de este PC.
import { h, mount, btn, modal, toast } from './ui.js';
import { desktop } from './desktop.js';
import { S } from './store.js';

const tam = b => b > 1073741824 ? (b / 1073741824).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' GB' : b > 1048576 ? Math.round(b / 1048576) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
// los ajustes de ESTE aparato que se llevan (temas, calibración de CelebriR8, menú…); nunca la sesión ni el nombre de este PC
export function ajustesDelAparato() {
  const o = {}, NO = /^cd\.(token|device|unlock|server$|sesion|iaServidor$)/;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k || !k.startsWith('cd.') || NO.test(k)) continue; const v = localStorage.getItem(k); if (v != null && v.length < 300000) o[k] = v; } } catch (e) { }
  return o;
}
// en el PC NUEVO, la primera vez que se abre el programa tras restaurar: se ponen los ajustes que venían en la copia (una sola vez)
export async function recogeAjustes() {
  if (!desktop.on || !desktop.mudanza) return false;
  try { if (sessionStorage.getItem('cd.mudanza.mirado')) return false; sessionStorage.setItem('cd.mudanza.mirado', '1'); } catch (e) { }
  let r; try { r = await desktop.mudanza('ajustes'); } catch (e) { return false; }
  if (!r || !r.ls) return false; let n = 0;
  for (const k in r.ls) { try { if (localStorage.getItem(k) == null) { localStorage.setItem(k, r.ls[k]); n++; } } catch (e) { } }
  try { sessionStorage.setItem('cd.mudanza.bienvenida', JSON.stringify({ de: r.de || '', n })); } catch (e) { }
  return n > 0;
}
export function bienvenidaMudanza() {
  let d = null; try { d = JSON.parse(sessionStorage.getItem('cd.mudanza.bienvenida') || 'null'); sessionStorage.removeItem('cd.mudanza.bienvenida'); } catch (e) { }
  if (d) toast('📦 Mudanza: he puesto tus ajustes' + (d.de ? ' del ordenador «' + d.de + '»' : '') + ' (temas, calibración de CelebriR8…). Sigue la guía desde el paso 5.', 'ok', 14000);
}

export async function dialogoMudanza() {
  if (!desktop.on || !desktop.mudanza) return toast('La copia de mudanza se hace desde el programa del PC (no desde el móvil ni el navegador).', 'warn', 8000);
  const cuerpo = h('div.mud'), m = modal('📦 Llevar CelebriDiseños a otro ordenador', cuerpo, null, { size: 'wide' });
  let E = null, destino = '', libre = 0, elegidas = new Set(), tic = null, vivo = true;
  const cierra = m.close; m.close = () => { vivo = false; clearInterval(tic); cierra(); };
  const pide = async () => { try { E = await desktop.mudanza('estado'); } catch (e) { E = { error: e.message, partes: [] }; } };
  const total = () => (E.partes || []).filter(p => p.fijo || elegidas.has(p.id)).reduce((a, p) => a + (p.bytes || 0), 0);
  function pinta() {
    if (!vivo) return;
    if (E.activa || (E.hecho && E.carpeta)) return pintaAvance();
    const cabe = !libre || total() / 1e9 < libre - 0.3;
    mount(cuerpo,
      h('p', 'Se prepara ', h('b', 'una carpeta'), ' con todo ordenado y una ', h('b', 'guía paso a paso'), '. En el otro ordenador solo hay que hacer doble clic en «RESTAURAR_EN_EL_PC_NUEVO». ', h('b', 'Aquí no se borra ni se cambia nada.')),
      h('div.mud-nota', '💡 Tus pedidos, clientes, productos y facturas están en tu Google, no en este ordenador: en el nuevo aparecen solos al entrar con tu usuario. Esta copia lleva el programa, tus ajustes, tus diseños y tus perfiles (y una copia de tus datos, por si acaso).'),
      h('div.mud-partes', (E.partes || []).map(p => h('label.mud-parte' + (p.fijo ? '.fijo' : ''), h('input', { type: 'checkbox', checked: p.fijo || elegidas.has(p.id), disabled: p.fijo, 'data-parte': p.id, onchange: e => { if (e.target.checked) elegidas.add(p.id); else elegidas.delete(p.id); pinta(); } }),
        h('div', h('b', p.titulo), h('small', p.nota), p.grande && !p.fijo ? h('small.mud-opc', 'Opcional') : null), h('span.mud-tam', p.medido ? tam(p.bytes || 0) : 'midiendo…')))),
      E.productosEnRed ? h('p.small.muted', '📁 Tus carpetas de productos están en la red del taller (' + E.productos + '): no hace falta copiarlas; el ordenador nuevo las ve igual.') : null,
      h('div.mud-dest', h('b', '¿Dónde la guardo?'), h('code', destino || 'Elige un USB, un disco externo o una carpeta'), btn('📂 Elegir', async () => { try { const r = await desktop.mudanza('elegir', {}); if (r && r.carpeta) { destino = r.carpeta; libre = r.libre_gb || 0; pinta(); } } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm mud-elegir' })),
      h('p.small' + (cabe ? '.muted' : '.bad-t'), 'Ocupará unos ' + tam(total()) + (libre ? ' · en ese disco quedan ' + libre.toLocaleString('es-ES') + ' GB libres' + (cabe ? '' : ': NO cabe, quita lo opcional o elige otro disco') : '') + (E.midiendo ? ' (aún estoy midiendo)' : '') + '.'),
      h('div.row', { style: { justifyContent: 'flex-end', gap: '8px' } }, btn('Cancelar', () => m.close()), btn('📦 Preparar la copia', async () => {
        if (!destino) return toast('Elige primero dónde guardarla.', 'warn');
        try { await desktop.mudanza('empezar', { destino, partes: [...elegidas], ajustes: ajustesDelAparato(), usuario: (S.me && S.me.usuario) || '' }); await pide(); pinta(); sigue(); } catch (e) { toast(e.message, 'bad', 8000); }
      }, { cls: 'primary mud-empezar', disabled: !destino || !cabe })));
  }
  function pintaAvance() {
    if (E.activa) return mount(cuerpo, h('div.mud-prog', h('b', E.fase || 'Copiando…'), h('div.mud-barra', h('span', { style: { width: (E.pct || 0) + '%' } })), h('small.muted', (E.pct || 0) + ' % · ' + (E.txt || ''))), h('p.small.muted', 'Puedes seguir trabajando: la copia va por detrás. No saques el USB hasta que ponga «terminada».'),
      h('div.row', { style: { justifyContent: 'flex-end' } }, btn('Cancelar la copia', () => desktop.mudanza('cancelar', {}).catch(() => { }), { cls: 'sm ghost' })));
    if (!E.ok) return mount(cuerpo, h('p.bad-t', '⚠️ ' + (E.error || 'La copia no ha terminado.')), h('div.row', { style: { justifyContent: 'flex-end' } }, btn('Volver a intentarlo', () => { E.hecho = false; E.carpeta = ''; E.activa = false; pinta(); }, { cls: 'primary' })));
    mount(cuerpo, h('div.mud-hecho', h('h3', '✅ Copia terminada y comprobada'), h('p', 'Está en ', h('code', E.carpeta), '.'),
      h('table.mud-tabla', (E.resumen || []).map(r => h('tr', h('td', r.bien ? '✅' : '⚠️'), h('td', h('b', r.carpeta)), h('td', r.titulo), h('td', r.archivos + ' archivos · ' + tam(r.bytes || 0))))),
      (E.avisos || []).length ? h('div.mud-ojo', h('b', '⚠️ Mira esto:'), h('ul', E.avisos.map(a => h('li', a)))) : null,
      h('p', h('b', 'Ahora: '), 'abre la carpeta y lee «LEEME_PASO_A_PASO» (también va dentro del USB). Ahí está cada paso para el otro ordenador.'),
      h('div.row', { style: { justifyContent: 'flex-end', gap: '8px' } }, btn('Hacer otra copia', () => { E.hecho = false; E.carpeta = ''; pinta(); }, { cls: 'ghost' }), btn('📂 Abrir la carpeta y la guía', () => desktop.mudanza('abrir', {}).catch(e => toast(e.message, 'bad')), { cls: 'primary mud-abrir' }))));
  }
  function sigue() { clearInterval(tic); tic = setInterval(async () => { if (!vivo) return clearInterval(tic); const antes = JSON.stringify([E.activa, E.pct, E.fase, E.txt, E.midiendo, (E.partes || []).map(p => p.bytes)]); await pide(); if (JSON.stringify([E.activa, E.pct, E.fase, E.txt, E.midiendo, (E.partes || []).map(p => p.bytes)]) !== antes) pinta(); if (!E.activa && !E.midiendo) clearInterval(tic); }, 1200); }
  mount(cuerpo, h('p.muted', 'Mirando qué hay en este ordenador…'));
  await pide(); if (E.hecho && !E.activa) { E.hecho = false; E.carpeta = ''; } // (una copia anterior ya terminada no tapa la pantalla de empezar)
  pinta(); sigue();
}
