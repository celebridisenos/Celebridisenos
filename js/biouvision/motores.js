// ================= v15.4 · BIOUVISION · ⚙️ MOTORES DE IA (solo en el PC) =================
// Lo que hace falta para cada cosa, si ya está en este PC y un botón para descargarlo (UNA vez, con permiso).
// Todos son de uso comercial libre (MIT, Apache-2.0 o BSD). Se comprueba la huella de cada archivo al bajarlo.
import { h, mount, toast, confirmDlg } from '../ui.js';
import { desktop } from '../desktop.js';

const GRUPOS = [
  ['restaurar', '🕰️ Restaurar fotos antiguas', 'Ampliar hasta 4K con detalle y recuperar las caras.'],
  ['color', '🎨 Dar color', 'Pone color a las fotos en blanco y negro. Con uno basta.'],
  ['fondo', '✂️ Quitar fondos', 'Recorte de personas y productos, hasta el pelo.']
];
const MB = b => b >= 1e9 ? (b / 1073741824).toFixed(1).replace('.', ',') + ' GB' : Math.round(b / 1048576) + ' MB';

export function pantallaMotores(el, C) {
  const cuerpo = h('div');
  let vivo = 0;
  mount(el, h('div.bv-top', h('div.grow', h('h1.bv-h2', '⚙️ Motores de IA'), h('p.bv-sub', { style: { margin: 0 } }, 'Los «cerebros» que usa Biouvision. Se descargan una sola vez y trabajan en este PC, sin internet.'))), cuerpo);

  async function refrescar(forzar) {
    clearTimeout(vivo);
    if (!desktop.on) return mount(cuerpo, h('div.bv-aviso.info', '🖥️ Los motores viven en el PC del taller. Desde el móvil no hace falta descargar nada: le encargas el trabajo al PC y la foto vuelve sola.'));
    let st = null;
    try { st = await desktop.motorEstado(!!forzar); } catch (e) { st = { listo: false, error: e.message }; }
    if (!el.isConnected) return;
    const mods = st.modelos || [], mot = st.motor || {}, ram = Number(mot.ram_gb) || 0;
    const bajando = mods.some(m => m.descarga && m.descarga.estado === 'descargando');
    mount(cuerpo,
      h('div.bv-fila', { style: { marginBottom: '18px' } },
        h('span.bv-chip', h('i' + (st.listo ? '.ok' : '.mal')), st.listo ? 'Motor de fotos listo' : 'Motor de fotos sin preparar'),
        ram ? h('span.bv-chip', '🧠 ' + ram.toFixed(0) + ' GB de memoria') : null,
        mot.nucleos ? h('span.bv-chip', '⚙️ ' + mot.nucleos + ' núcleos') : null,
        h('button.bv-btn.peq', { type: 'button', onclick: () => refrescar(true) }, '🔄 Comprobar')),
      !st.listo ? h('div.bv-aviso', { style: { marginBottom: '18px' } }, '⚠️ El motor necesita el Python de EDITOR_VIDEO (con OpenCV y onnxruntime). ' + (st.error ? 'Detalle: ' + st.error + '. ' : '') + 'Abre CelebriDiseños → «Centro de IA» para arreglarlo.') : null,
      ram && ram < 14 ? h('div.bv-aviso.info', { style: { marginBottom: '18px' } }, '💡 Este PC tiene ' + ram.toFixed(0) + ' GB de memoria. Los motores «Máxima» y «Personas» necesitan unos 8 GB libres: si va lento, usa «Rápido».') : null,
      h('div.bv-grupos', GRUPOS.map(([g, t, d]) => {
        const lista = mods.filter(m => m.grupo === g), falta = lista.filter(m => !m.presente && !(m.descarga && m.descarga.estado === 'descargando')), peso = falta.reduce((s, m) => s + (m.bytes || 0), 0);
        return h('div.bv-grupo.bv-vidrio', h('h3', t), h('p.bv-ayuda', d),
          lista.map(fila),
          g === 'restaurar' && falta.length > 1 ? h('button.bv-btn.prim', { type: 'button', onclick: () => bajarGrupo(g, t, peso) }, '⬇️ Descargar todo (' + MB(peso) + ')') : null,
          !falta.length && lista.length ? h('div.bv-aviso.ok', '✅ Todo listo para ' + t.replace(/^\S+\s/, '').toLowerCase() + '.') : null);
      })),
      h('p.bv-ayuda', { style: { marginTop: '18px' } }, '📁 Se guardan en: ' + (st.modelosDir || 'la carpeta de modelos') + '. Licencias: MIT, Apache-2.0 y BSD (uso comercial libre).'));
    if (bajando) vivo = setTimeout(() => refrescar(), 1500);
  }
  function fila(m) {
    const d = m.descarga, bajando = d && d.estado === 'descargando';
    return h('div.bv-modelo', h('b', m.nombre),
      m.presente ? h('span.est', '✅ Listo') : bajando ? h('span.est', { style: { color: '#67e8f9' } }, Math.floor(100 * d.hecho / Math.max(1, d.total)) + ' %')
        : h('button.bv-btn.peq', { type: 'button', onclick: () => bajar(m) }, '⬇️ ' + MB(m.bytes)),
      h('small', m.para + ' · ' + m.licencia + (d && d.estado === 'error' ? ' · ⚠️ ' + d.error : '')),
      bajando ? h('div.bv-barra', h('i', { style: { width: Math.floor(100 * d.hecho / Math.max(1, d.total)) + '%' } })) : null);
  }
  async function bajar(m) {
    if (!(await confirmDlg('¿Descargar «' + m.nombre + '»?', 'Son ' + MB(m.bytes) + '. Se descarga una sola vez y se queda en este PC. Licencia ' + m.licencia + ' (uso comercial libre).', 'Descargar'))) return;
    try { await desktop.motorDescargar(m.id); toast('⬇️ Descargando ' + m.nombre + '…', 'ok'); refrescar(); } catch (e) { toast(e.message, 'bad'); }
  }
  async function bajarGrupo(g, t, peso) {
    if (!(await confirmDlg('¿Descargar todo para ' + t.replace(/^\S+\s/, '').toLowerCase() + '?', 'Son ' + MB(peso) + ' en total. Se descarga una sola vez y se queda en este PC.', 'Descargar'))) return;
    try { await desktop.motorDescargarGrupo(g); toast('⬇️ Descargando…', 'ok'); refrescar(); } catch (e) { toast(e.message, 'bad'); }
  }
  refrescar();
  return { refrescar };
}
