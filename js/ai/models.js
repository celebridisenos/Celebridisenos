// ================= IA local: hardware, modelos y perfiles =================
// La IA funciona en vuestros PC con Ollama. Aquí se detecta el hardware y se recomienda
// el modelo adecuado (sin instalar nunca uno que pueda bloquear el ordenador).
import { h, mount, btn, toast, pill, icon, sw, confirmDlg } from '../ui.js';
import { S, can } from '../store.js';
import { desktop } from '../desktop.js';

export const PROFILES = {
  rapido: { t: 'Rápido', modelo: 'qwen3:1.7b', gb: 1.4, vram: 2, ram: 6, d: 'Respuestas casi instantáneas. Para ordenadores sin gráfica potente.' },
  equilibrado: { t: 'Equilibrado', modelo: 'qwen3:4b', gb: 2.5, vram: 3.5, ram: 12, d: 'El mejor equilibrio entre inteligencia y velocidad. Bueno en español y con herramientas.' },
  inteligente: { t: 'Inteligente', modelo: 'qwen3:8b', gb: 5.2, vram: 7, ram: 24, d: 'Razona mejor en preguntas complejas. Necesita una gráfica con 8 GB o más para ir rápido.' }
};
export const EMBED = { t: 'Búsqueda inteligente (RAG)', modelo: 'qwen3-embedding:0.6b', gb: 0.64, d: 'Entiende el significado de las preguntas para encontrar el documento correcto (multilingüe).' };
export const VISION = { t: 'Leer imágenes (OCR)', modelo: 'qwen2.5vl:3b', gb: 3.2, d: 'Opcional. Extrae el texto de fotos y documentos escaneados.' };

function maxVram(hw) { return Math.max(0, ...(hw.gpus || []).filter(g => g.tipo === 'nvidia' || g.tipo === 'amd').map(g => g.vramGB || 0)); }

// Recomendación según el hardware real de ESTE ordenador
export function recommend(hw) {
  const vram = maxVram(hw), ram = hw.ramGB || 0, disk = hw.discoLibreGB || 0;
  const out = { vram, ram, disk, razones: [], perfiles: {} };
  for (const [k, p] of Object.entries(PROFILES)) {
    let apto = 'no', nota = '';
    if (vram >= p.vram + 1.5) { apto = 'optimo'; nota = 'Cabe entero en la gráfica: rápido.'; }
    else if (vram >= p.vram) { apto = 'bien'; nota = 'Cabe en la gráfica con poco margen.'; }
    else if (ram >= p.ram) { apto = 'lento'; nota = vram ? 'Parte irá en la memoria RAM: funciona, pero más lento.' : 'Sin gráfica compatible: irá con el procesador (más lento).'; }
    else nota = 'No recomendado en este ordenador: podría ir muy lento o bloquearlo.';
    if (disk && disk < p.gb + 5) { apto = 'no'; nota = 'No hay espacio suficiente en el disco.'; }
    out.perfiles[k] = { apto, nota };
  }
  const order = ['inteligente', 'equilibrado', 'rapido'];
  out.auto = order.find(k => out.perfiles[k].apto === 'optimo') || order.find(k => out.perfiles[k].apto === 'bien') || (ram >= 12 ? 'equilibrado' : 'rapido');
  // Con 6-8 GB de VRAM el "Equilibrado" es el más ágil para el día a día
  if (out.auto === 'inteligente' && vram < 10) out.auto = 'equilibrado';
  if (vram) out.razones.push('Gráfica con ' + vram + ' GB de memoria de vídeo.'); else out.razones.push('No se ha detectado una gráfica NVIDIA/AMD compatible.');
  out.razones.push(ram + ' GB de RAM · ' + Math.round(disk) + ' GB libres en disco.');
  return out;
}

// Perfil activo en este dispositivo (se guarda por PC: cada ordenador tiene su hardware)
export async function activeProfile(hw) {
  const local = desktop.on ? await desktop.getConfig('aiPerfil') : null;
  const pref = local || (S.cfg && S.cfg.ia && S.cfg.ia.perfil) || 'auto';
  if (pref !== 'auto' && PROFILES[pref]) return pref;
  return hw ? recommend(hw).auto : 'equilibrado';
}

// Estado completo de la IA local de este PC (para el asistente y el diagnóstico)
let cache = null, cacheT = 0;
export async function localStatus(force) {
  if (!desktop.on) return { disponible: false, motivo: 'Este dispositivo no ejecuta modelos: usa el PC servidor o el modo básico.' };
  if (!force && cache && Date.now() - cacheT < 15000) return cache;
  const out = { disponible: false };
  try {
    const [hw, est] = await Promise.all([desktop.hardware(), desktop.iaEstado()]);
    out.hw = hw; out.estado = est;
    out.perfil = await activeProfile(hw);
    out.modelo = PROFILES[out.perfil].modelo;
    const names = (est.modelos || []).map(m => m.nombre);
    const has = m => names.some(n => n === m || n === m + ':latest' || n.split(':')[0] === m && m.indexOf(':') < 0);
    out.tieneModelo = has(out.modelo);
    // si el del perfil no está pero hay otro de la lista, se usa ese
    if (!out.tieneModelo) { const alt = Object.values(PROFILES).map(p => p.modelo).find(has); if (alt) { out.modelo = alt; out.tieneModelo = true; out.alternativo = true; } }
    out.tieneEmbed = has(EMBED.modelo);
    out.tieneVision = has(VISION.modelo);
    out.disponible = !!(est.funcionando && out.tieneModelo);
    if (!est.instalado) out.motivo = 'El motor de IA (Ollama) no está instalado en este PC.';
    else if (!est.funcionando) out.motivo = 'El motor de IA está instalado pero parado.';
    else if (!out.tieneModelo) out.motivo = 'Falta descargar el modelo ' + out.modelo + '.';
  } catch (e) { out.motivo = 'No se pudo consultar la IA local: ' + e.message; }
  cache = out; cacheT = Date.now();
  return out;
}
export function invalidateStatus() { cache = null; }

const fmtGB = x => (Math.round(x * 10) / 10).toString().replace('.', ',') + ' GB';

// Tarjeta de hardware
export function hwCard(hw, rec) {
  const g = (hw.gpus || []).map(x => x.nombre + (x.vramGB ? ' · ' + fmtGB(x.vramGB) : '')).join(' / ') || 'Sin gráfica dedicada detectada';
  return h('div.kv', h('dt', 'Equipo'), h('dd', hw.equipo + ' · ' + hw.so), h('dt', 'Procesador'), h('dd', (hw.cpu || '—') + ' · ' + hw.hilos + ' hilos'),
    h('dt', 'Memoria RAM'), h('dd', fmtGB(hw.ramGB) + (hw.ramLibreGB ? ' (' + fmtGB(hw.ramLibreGB) + ' libres)' : '')), h('dt', 'Gráfica'), h('dd', g),
    h('dt', 'Disco (modelos)'), h('dd', fmtGB(hw.discoLibreGB) + ' libres de ' + fmtGB(hw.discoTotalGB)),
    rec ? [h('dt', 'Recomendación'), h('dd', h('b', PROFILES[rec.auto].t + ' (' + PROFILES[rec.auto].modelo + ')'), ' — ', rec.razones.join(' '))] : null);
}

// Panel de gestión (Configuración → IA local y asistente de instalación)
export function iaPanel(el, opts = {}) {
  const box = h('div.col');
  mount(el, box);
  let timer = null;
  async function draw() {
    if (!desktop.on) {
      mount(box, h('div.card.flat', h('p', '📱 Este dispositivo no ejecuta modelos de IA. ', S.iaServidor ? h('span', 'Tus preguntas las responde ', h('b', S.iaServidor.dispositivo), ' (PC servidor de IA), con tus permisos.') : h('span', 'Cuando el PC servidor de IA esté encendido con la app abierta, responderá por ti; mientras tanto el asistente funciona en modo básico (busca y calcula).'))));
      return;
    }
    const st = await localStatus(true);
    const hw = st.hw || {}, est = st.estado || {};
    const rec = hw.ramGB ? recommend(hw) : null;
    const prog = await desktop.iaProgreso().catch(() => []);
    const pr = m => prog.find(p => p.modelo === m && !p.terminado);
    const inst = est.instalacion;
    const names = (est.modelos || []).map(m => m.nombre);
    const has = m => names.includes(m);
    const perfilSel = (await desktop.getConfig('aiPerfil')) || 'auto';
    const modelRow = (k, p, apto) => {
      const busy = pr(p.modelo);
      const installed = has(p.modelo);
      return h('div.item.model-row',
        h('div.grow', h('div.bold', p.t + ' · ', h('code', p.modelo), ' ', h('span.tiny.muted', fmtGB(p.gb))), h('div.tiny.muted', p.d), apto ? h('div.tiny', { style: { color: apto.apto === 'no' ? 'var(--bad)' : apto.apto === 'lento' ? 'var(--warn)' : 'var(--ok)' } }, apto.nota) : null,
          busy ? h('div.progress', h('span', { style: { width: Math.round((busy.progreso || 0) * 100) + '%' } })) : null,
          busy ? h('div.tiny.muted', (busy.estado || 'Descargando') + ' · ' + Math.round((busy.progreso || 0) * 100) + ' %') : null),
        installed ? pill('Descargado', 'ok') : null,
        !installed && !busy && est.funcionando ? btn('Descargar', async () => { try { await desktop.iaDescargar(p.modelo); toast('Descargando ' + p.modelo + '…', 'ok'); draw(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm' + (apto && apto.apto !== 'no' && k === (rec && rec.auto) ? ' primary' : ''), icon: 'download' }) : null,
        installed && can('config.editar') ? btn('', async () => { if (!await confirmDlg('Borrar modelo', '¿Borrar el modelo ' + p.modelo + ' de este PC? Se puede volver a descargar cuando quieras.', 'Borrar', true)) return; await desktop.iaBorrar(p.modelo); invalidateStatus(); draw(); }, { cls: 'ghost sm icon', icon: 'trash', title: 'Borrar del disco' }) : null);
    };
    const failed = prog.filter(p => p.terminado && p.error);
    mount(box,
      h('div.card.flat', h('h4', icon('cube', 's'), ' Hardware de este ordenador'), hw.ramGB ? hwCard(hw, rec) : h('p.muted', 'Detectando…')),
      h('div.card.flat.col',
        h('h4', '🧠 Motor de IA (Ollama)'),
        est.funcionando ? h('p', pill('Funcionando', 'ok'), ' versión ', est.version || '') :
          est.instalado ? h('div.row', pill('Parado', 'warn'), btn('Arrancar', async () => { try { await desktop.iaArrancar(); invalidateStatus(); draw(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm primary' })) :
            h('div.col', h('p', pill('No instalado', 'bad'), ' Ollama es gratuito y funciona sin Internet una vez descargados los modelos.'),
              inst && inst.estado && inst.estado !== 'listo' ? h('div', h('div.progress', h('span', { style: { width: Math.round((inst.progreso || 0) * 100) + '%' } })), h('p.tiny.muted', inst.mensaje || inst.estado)) :
                btn('Instalar el motor de IA', async () => { try { await desktop.iaInstalar(); toast('Descargando e instalando Ollama… (unos minutos)', 'ok'); draw(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'primary', icon: 'download' })),
        inst && inst.estado === 'error' ? h('p.bad-t', inst.mensaje) : null),
      h('div.card.flat.col', h('h4', '⚙️ Modelo que usa este PC'),
        h('div.seg', ['auto', 'rapido', 'equilibrado', 'inteligente'].map(k => h('button' + (perfilSel === k ? '.on' : ''), { onclick: async () => { await desktop.setConfig('aiPerfil', k === 'auto' ? '' : k); invalidateStatus(); draw(); } }, k === 'auto' ? 'Automático' + (rec ? ' (' + PROFILES[rec.auto].t + ')' : '') : PROFILES[k].t))),
        h('div.list.boxed', Object.entries(PROFILES).map(([k, p]) => modelRow(k, p, rec && rec.perfiles[k])), modelRow('embed', EMBED), modelRow('vision', VISION)),
        failed.length ? h('p.bad-t', failed.map(f => f.modelo + ': ' + f.error).join(' · ')) : null,
        h('p.tiny.muted', 'Los modelos se guardan en ', h('code', hw.discoRuta || '~/.ollama/models'), '. Nunca se descarga nada sin que lo pidas.')),
      opts.sinServidor ? null : serverCard());
    if (prog.some(p => !p.terminado) || (inst && (inst.estado === 'descargando' || inst.estado === 'instalando'))) { clearTimeout(timer); timer = setTimeout(() => { if (document.body.contains(box)) { invalidateStatus(); draw(); } }, 1500); }
  }
  function serverCard() {
    const on = localStorage.getItem('cd.iaServidor') !== '0';
    return h('div.card.flat.col', h('h4', '🖥️ Servidor de IA para el equipo'),
      h('p.small.muted', 'Si este PC tiene la app abierta, responde también a las preguntas que se hagan desde el móvil y desde otros ordenadores sin IA. Cada respuesta usa los permisos de quien pregunta, no los de este PC.'),
      can('ia.servidor') ? h('label.check', sw(on, v => { localStorage.setItem('cd.iaServidor', v ? '1' : '0'); toast(v ? 'Este PC atenderá al equipo' : 'Este PC ya no atenderá al equipo', 'ok'); }), 'Este PC atiende la IA del equipo') : h('p.small', 'Solo un usuario con el permiso "servidor de IA" (administración) puede activarlo.'),
      S.iaServidor ? h('p.small', 'Ahora mismo atiende: ', h('b', S.iaServidor.dispositivo), S.iaServidor.modelo ? ' (' + S.iaServidor.modelo + ')' : '') : h('p.small.muted', 'Ningún PC está atendiendo ahora.'));
  }
  draw();
  return { refresh: draw };
}

// Paso del asistente de instalación
export function iaSetupStep(b, n, { next, back }) {
  const panel = h('div');
  mount(b, h('h2', 'Asistente de IA local (privado)'),
    h('p', 'Vuestro asistente de IA funciona en vuestros ordenadores: no necesita ninguna clave ni cuenta externa y los datos no salen de casa. Consulta pedidos, clientes, productos y la biblioteca de la empresa, y calcula precios y márgenes sin inventar.'),
    desktop.on ? h('p.small.muted', 'He revisado el hardware de este PC y te recomiendo un modelo. Puedes descargarlo ahora o más tarde en Configuración → IA local.') : h('p.small.muted', 'La IA se instala desde el programa de escritorio del PC principal. Puedes seguir.'),
    panel);
  if (desktop.on) iaPanel(panel, { sinServidor: true });
  mount(n, btn('Atrás', back), h('span.grow'), btn('Siguiente', next, { cls: 'primary' }));
}
