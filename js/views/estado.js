// ================= 🔧 Estado del sistema (centro de diagnóstico) =================
// Comprueba de verdad cada pieza y dice exactamente qué falla y qué hacer.
import { h, mount, btn, ago } from '../ui.js';
import { S, api, kv, can, APP_VERSION } from '../store.js';
import { desktop } from '../desktop.js';
import { localStatus, invalidateStatus } from '../ai/models.js';
import { ensureIndex, search, ragStatus, baseDocs } from '../ai/rag.js';
import { CHAT } from '../chat.js';

export function render(el) {
  const list = h('div.checklist.diag');
  const sum = h('div');
  el.append(h('div.page-head', h('div', h('h1', '🔧 Estado del sistema'), h('div.muted.small', 'Comprueba cada pieza de CelebriDiseños en este dispositivo y en el servidor.')), h('div.right', btn('Volver a comprobar', run, { cls: 'primary', icon: 'refresh' }))), sum, list);
  const rows = {};
  function row(k, name) { rows[k] = h('div.ck', h('span.st.wait', '…'), h('div.grow', h('div.bold', name), h('div.tiny.muted', 'Comprobando…'))); list.appendChild(rows[k]); }
  function set(k, st, detail, fix) {
    const icon = st === 'ok' ? '✅' : st === 'warn' ? '⚠️' : st === 'off' ? '–' : '❌';
    mount(rows[k], h('span.st.' + (st === 'ok' ? 'ok' : st === 'warn' || st === 'off' ? 'wait' : 'bad'), icon), h('div.grow', h('div.bold', rows[k].querySelector('.bold') ? rows[k].querySelector('.bold').textContent : k), h('div.small', detail), fix ? h('div.tiny.muted', '👉 ' + fix) : null));
  }
  const ITEMS = [['servidor', 'Servidor (Google)'], ['bd', 'Base de datos (Google Sheets)'], ['ia', 'IA local'], ['modelo', 'Modelo de IA'], ['equipo', 'IA del equipo (móvil y otros PC)'], ['biblioteca', 'Biblioteca'], ['rag', 'RAG (búsqueda inteligente)'], ['chat', 'Chat'], ['telegram', 'Telegram'], ['github', 'GitHub (actualizaciones)'], ['backup', 'Copias de seguridad'], ['sync', 'Sincronización de este dispositivo']];
  async function run() {
    list.innerHTML = ''; ITEMS.forEach(([k, n]) => row(k, n));
    mount(sum, h('p.small.muted', 'Comprobando…'));
    const res = {};
    const done = (k, st, d, f) => { res[k] = st; set(k, st, d, f); };
    // Servidor + comprobaciones del servidor
    const t0 = Date.now();
    let comp = null;
    try { await api('sys.ping', {}); done('servidor', 'ok', 'Responde en ' + (Date.now() - t0) + ' ms · app ' + APP_VERSION + (S.cfg ? ' · servidor ' + S.cfg.version : '')); }
    catch (e) { done('servidor', 'bad', e.message, 'Comprueba la conexión a Internet. Si persiste, revisa la implementación de Apps Script (guía, Parte A).'); }
    try { comp = can('config.ver') ? await api('sys.comprobar', {}, { timeout: 120000 }) : null; } catch (e) { comp = null; }
    const c = n => comp && comp.find(x => x.nombre.startsWith(n));
    const sh = c('Google Sheet'), sis = c('Libro de sistema');
    if (!comp) done('bd', S.errors && Object.keys(S.errors).length ? 'bad' : 'ok', S.errors && Object.keys(S.errors).length ? 'No se pudo leer: ' + Object.keys(S.errors).join(', ') : 'Datos sincronizados correctamente' + (S.lastSync ? ' (' + ago(S.lastSync) + ')' : ''));
    else done('bd', sh && sh.ok && sis && sis.ok ? 'ok' : 'bad', [sh && ('Negocio: ' + (sh.ok ? sh.detalle : '❌ ' + sh.detalle)), sis && ('Sistema: ' + (sis.ok ? sis.detalle : '❌ ' + sis.detalle))].filter(Boolean).join(' · '), sh && !sh.ok ? 'Configuración → Estado del sistema → "Reparar Sheet".' : '');
    // IA local
    invalidateStatus();
    const ls = await localStatus(true);
    if (!desktop.on) {
      done('ia', 'off', 'Este dispositivo no ejecuta modelos (normal en el móvil o en el navegador): usa el PC servidor.');
      done('modelo', 'off', S.iaServidor ? 'Se usa el del PC servidor: ' + (S.iaServidor.modelo || '') : 'Sin PC servidor ahora: modo básico.');
    } else {
      const est = ls.estado || {};
      if (!est.instalado) done('ia', 'bad', 'Ollama no está instalado en este PC.', 'Configuración → IA local y modelos → "Instalar el motor de IA".');
      else if (!est.funcionando) done('ia', 'bad', 'Ollama está instalado pero parado.', 'Configuración → IA local → "Arrancar".');
      else done('ia', 'ok', 'Ollama ' + (est.version || '') + ' funcionando · ' + (ls.hw ? ls.hw.cpu + ' · ' + ls.hw.ramGB + ' GB RAM' + ((ls.hw.gpus || [])[0] ? ' · ' + ls.hw.gpus[0].nombre : '') : ''));
      if (!ls.tieneModelo) done('modelo', 'bad', ls.motivo || 'Falta el modelo.', 'Configuración → IA local → descargar ' + (ls.modelo || 'el modelo recomendado') + '.');
      else {
        const t1 = Date.now(); let out = '';
        try {
          await desktop.iaChat({ model: ls.modelo, stream: true, think: false, keep_alive: '30m', options: { temperature: 0, num_predict: 12 }, messages: [{ role: 'user', content: 'Responde solo con la palabra: FUNCIONA' }] }, ch => { if (ch.message && ch.message.content) out += ch.message.content; });
          const ok = /funciona/i.test(out);
          done('modelo', ok ? 'ok' : 'warn', ls.modelo + (ls.alternativo ? ' (alternativo)' : '') + ' respondió en ' + ((Date.now() - t1) / 1000).toFixed(1).replace('.', ',') + ' s' + (ok ? '' : ': "' + out.slice(0, 60) + '"'), ok ? '' : 'Responde, pero no como se esperaba. Prueba el perfil Equilibrado.');
        } catch (e) { done('modelo', 'bad', 'El modelo no responde: ' + e.message, 'Reinicia Ollama o el PC. Si persiste, vuelve a descargar el modelo.'); }
      }
    }
    // IA del equipo
    const q = c('Cola de la IA');
    done('equipo', S.iaServidor ? 'ok' : 'warn', S.iaServidor ? 'Atiende ' + S.iaServidor.dispositivo + (S.iaServidor.modelo ? ' con ' + S.iaServidor.modelo : '') : (q ? q.detalle : 'Ningún PC atendiendo ahora.'), S.iaServidor ? '' : 'Abre la app en el PC con IA (NOORKO-SERVER) y activa "Este PC atiende la IA del equipo".');
    // Biblioteca y RAG
    try {
      const base = await baseDocs();
      const own = S.t.biblioteca || [];
      const bad = own.filter(d => d.estado === 'Error' || d.estado === 'Sin texto');
      done('biblioteca', bad.length ? 'warn' : 'ok', base.filter(d => d.activo).length + ' documentos base · ' + own.length + ' propios' + (bad.length ? ' · ' + bad.length + ' sin indexar: ' + bad.map(d => d.titulo).slice(0, 3).join(', ') : ''), bad.length ? 'Abre la Biblioteca y vuelve a subir esos documentos (o usa OCR si son escaneados).' : '');
      await ensureIndex();
      const r = await search('cómo responder cuando un cliente dice que es caro', { k: 2 });
      const st = ragStatus();
      done('rag', r.length ? (desktop.on && !st.modelo ? 'warn' : 'ok') : 'bad', st.chunks + ' fragmentos indexados · prueba: ' + (r.length ? '"' + r[0].titulo + '"' : 'sin resultados') + ' · significado: ' + (st.modelo ? st.vectores + '/' + st.chunks + ' con ' + st.modelo : 'no (búsqueda por palabras)'), desktop.on && !st.modelo ? 'Descarga "Búsqueda inteligente (RAG)" en Configuración → IA local para búsquedas por significado.' : '');
    } catch (e) { done('rag', 'bad', e.message); done('biblioteca', 'bad', e.message); }
    // Chat
    if (!can('chat.usar')) done('chat', 'off', 'Sin permiso de chat.');
    else { const t2 = Date.now(); try { const r = await api('chat.poll', { desde: new Date().toISOString(), activo: true }); done('chat', 'ok', 'En vivo · responde en ' + (Date.now() - t2) + ' ms · conectados: ' + (r.conectados || []).map(x => x.nombre).join(', ')); } catch (e) { done('chat', 'bad', e.message); } }
    // Telegram
    const tg = c('Telegram');
    done('telegram', tg ? (tg.ok ? 'ok' : /opcional|Sin configurar/.test(tg.detalle) ? 'warn' : 'bad') : (S.cfg && S.cfg.secretos && S.cfg.secretos.telegram ? 'ok' : 'warn'), tg ? (tg.ok ? 'Bot ' + tg.detalle : tg.detalle) : (S.cfg.secretos.telegram ? 'Bot configurado' : 'Sin configurar'), tg && !tg.ok ? 'Configuración → Telegram y avisos.' : '');
    // GitHub
    if (!desktop.on) done('github', 'off', 'La app del móvil se actualiza sola desde GitHub Pages.');
    else { try { const u = await desktop.update(); done('github', 'ok', 'Conectado · instalada ' + u.actual + ' · última publicada ' + u.version + (u.nueva ? ' (¡hay una nueva!)' : '')); } catch (e) { done('github', /todavía no hay versiones/.test(e.message) ? 'warn' : 'bad', e.message, 'Configuración → GitHub y actualizaciones: revisa el repositorio.'); } }
    // Copias
    const bk = c('Copias de seguridad');
    const lb = desktop.on ? await kv.get('localBackup') : null;
    done('backup', bk ? (bk.ok ? 'ok' : 'warn') : 'off', (bk ? bk.detalle : 'Solo visible con permiso de configuración') + (desktop.on ? ' · copia local de este PC: ' + (lb || 'aún no') : ''), bk && !bk.ok ? 'Configuración → Copias de seguridad → "Hacer copia ahora".' : '');
    // Sincronización
    done('sync', S.queue.length ? 'warn' : S.online ? 'ok' : 'warn', (S.online ? 'En línea' : 'Sin conexión') + ' · última sincronización ' + (S.lastSync ? ago(S.lastSync) : 'nunca') + ' · ' + S.queue.length + ' cambio(s) pendiente(s)' + (CHAT.error ? ' · chat: ' + CHAT.error : ''));
    const bad = Object.values(res).filter(x => x === 'bad').length, warn = Object.values(res).filter(x => x === 'warn').length;
    mount(sum, h('div.card.flat', h('b', bad ? '❌ ' + bad + ' problema(s) que corregir' : warn ? '⚠️ Todo funciona, con ' + warn + ' aviso(s)' : '✅ Todo funciona correctamente'), h('span.tiny.muted', ' · ' + new Date().toLocaleTimeString('es-ES'))));
  }
  run();
  return {};
}
