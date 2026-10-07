// ================= v16.3.2 · 🔄 BUSCAR ACTUALIZACIÓN (botón fijo) =================
// Lo pidió la dueña: los móviles se quedaban en una versión vieja y no había forma de «tirar» de la nueva.
//  · «Buscar actualización» mira lo que hay publicado en Internet, lo compara con lo que tiene este aparato y, si hay
//    una versión nueva y COMPLETA, la instala y recarga. Los datos no se tocan (están aparte, en el aparato y en Google).
//  · «Comprobar la publicación» repasa archivo por archivo lo subido a GitHub y dice cuáles faltan o son antiguos
//    (una subida a medias era justo lo que dejaba los móviles atascados). También sirve desde el PC para mirar la de los móviles.
//  · «Reinstalar» borra la copia guardada de la app y la baja entera otra vez.
import { h, btn, modal, mount } from './ui.js';
import { S, APP_VERSION } from './store.js';

const enPC = !!window.__HOST__;
const sinCache = u => u + (u.includes('?') ? '&' : '?') + 'sinCache=' + Date.now();
const leer = async u => { const r = await fetch(sinCache(u), { cache: 'no-store' }); if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status }); return r; };
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
export const huella = async buf => hex(await crypto.subtle.digest('SHA-256', buf)).slice(0, 16);

// Dirección de la app de los móviles: la de esta misma página (en el móvil) o la apuntada en Configuración (en el PC)
export function baseApp() {
  if (!enPC && location.protocol === 'https:') return new URL('./', location.href).href;
  let s = ''; try { s = localStorage.getItem('cd.appUrl') || ''; } catch (e) { }
  const u = (S.cfg && (S.cfg.appUrl || (S.cfg.invitaciones && S.cfg.invitaciones.appUrl))) || s || '';
  return u && !/^https:\/\/github\.com\//i.test(u) ? u.replace(/[#?].*$/, '').replace(/\/?$/, '/') : '';
}
// Lo publicado: versión del aviso (sw.js), versión de los archivos (js/store.js) y las huellas que deben tener
export async function publicado(base = baseApp()) {
  const sw = await (await leer(base + 'sw.js')).text();
  const v = (/const VERSION = '([^']+)'/.exec(sw) || [])[1] || '';
  let hu = null; try { hu = JSON.parse((/const HUELLAS = (\{[^\n]*\});/.exec(sw) || [])[1] || 'null'); } catch (e) { }
  let app = ''; try { app = (/APP_VERSION = '([^']+)'/.exec(await (await leer(base + 'js/store.js')).text()) || [])[1] || ''; } catch (e) { }
  return { base, sw: v, app, huellas: hu, completa: !!v && !!app && v.indexOf(app + '-') === 0 };
}
// Qué toca hacer (sin pantalla: se puede probar sola)
export function decidir(pub, instaladas, mia = APP_VERSION) {
  if (!pub || !pub.sw) return { k: 'nada', t: 'No encuentro la app publicada en esa dirección.' };
  if (!pub.completa) return { k: 'incompleta', t: 'La versión publicada en Internet está A MEDIAS: el aviso dice ' + pub.sw.split('-')[0] + ' pero los archivos son de la ' + (pub.app || '¿?') + '. Hay que volver a subir la app a GitHub. Mientras tanto este aparato sigue con la suya.' };
  if ((instaladas || []).includes('cd-' + pub.sw) && pub.app === mia) return { k: 'aldia', t: 'Ya tienes la última versión: ' + pub.app + '.' };
  return { k: 'nueva', t: 'Hay una versión nueva: ' + pub.app + (pub.app === mia ? ' (retocada)' : '') + '. Tú tienes la ' + mia + '.' };
}
// Repasa lo publicado archivo por archivo → { total, mal: [{ f, por: 'falta' | 'antiguo' }] }
export async function comprobar(pub, avance) {
  const fs = Object.keys(pub.huellas || {}), mal = []; let hechos = 0, i = 0;
  const uno = async () => { while (i < fs.length) { const f = fs[i++];
    try { const r = await leer(pub.base + f.replace(/^\.\//, '')); if (await huella(await r.arrayBuffer()) !== pub.huellas[f]) mal.push({ f: f.replace(/^\.\//, ''), por: 'antiguo' }); }
    catch (e) { mal.push({ f: f.replace(/^\.\//, ''), por: e.status === 404 ? 'falta' : 'no se pudo leer' }); }
    hechos++; if (avance) avance(hechos, fs.length); } };
  await Promise.all(Array.from({ length: 6 }, uno));
  return { total: fs.length, mal: mal.sort((a, b) => a.f.localeCompare(b.f)) };
}
async function instalar(estado, fuerte) {
  const SW = navigator.serviceWorker, reg = window.__cdSW || (SW && await SW.getRegistration());
  if (reg && !fuerte) {
    estado('⬇️ Descargando la versión nueva… (no cierres la app)');
    try { await reg.update(); } catch (e) { }
    const w = reg.installing || reg.waiting;
    if (w) {
      await new Promise(res => { if (reg.waiting || w.state === 'installed') return res(); w.addEventListener('statechange', () => { if (/installed|activated|redundant/.test(w.state)) res(); }); setTimeout(res, 120000); });
      if (reg.waiting) { estado('✨ Aplicando…'); reg.waiting.postMessage('skip'); setTimeout(() => location.reload(), 3500); return; }
    }
  }
  estado('🧹 Reinstalando la app entera… (hace falta Internet)');
  try { const rs = SW ? await SW.getRegistrations() : []; await Promise.all(rs.map(r => r.unregister())); } catch (e) { }
  try { const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith('cd-')).map(k => caches.delete(k))); } catch (e) { }
  location.reload();
}

export function dialogoActualizar() {
  const caja = h('div.act'), est = h('p.act-est'), det = h('div.act-det'), bots = h('div.row.wrap.act-bots', { style: { gap: '8px' } });
  const estado = t => { est.textContent = t; };
  const haySW = 'serviceWorker' in navigator && location.protocol === 'https:' && !enPC, base = baseApp();
  mount(caja, h('div.act-v', h('span', enPC ? 'Este PC' : 'Este aparato'), h('b', 'versión ' + APP_VERSION)), est, det, bots);
  const m = modal('🔄 Actualizar la app', caja, close => [btn('Cerrar', close)], { size: 'narrow', noFocus: true });
  const bComprobar = pub => btn('🔎 Comprobar la publicación', async ev => { const b = ev.currentTarget; b.disabled = true;
    try { const p = pub || await publicado(base); if (!p.huellas) { mount(det, h('p.small', 'La versión publicada es anterior a la 16.3.2 y no trae la lista para comprobarla. Publica esta versión y vuelve a probar.')); return; }
      const r = await comprobar(p, (a, n) => { b.textContent = 'Comprobando ' + a + ' de ' + n + '…'; });
      mount(det, r.mal.length ? h('div.act-mal', h('b', '⚠️ ' + r.mal.length + ' de ' + r.total + ' archivos NO son de la versión ' + p.sw.split('-')[0] + ':'), h('ul', r.mal.slice(0, 40).map(x => h('li', x.f + ' · ' + x.por))), r.mal.length > 40 ? h('p.tiny.muted', '… y ' + (r.mal.length - 40) + ' más.') : null, h('p.small', 'Hay que volver a subir la app a GitHub (PUBLICAR_APP_MOVIL.bat de la carpeta de la versión). Los móviles NO cogen una versión a medias: siguen con la que tienen.'))
        : h('p.act-ok', '✅ Publicación completa: los ' + r.total + ' archivos son de la versión ' + p.sw.split('-')[0] + '.'));
    } catch (e) { mount(det, h('p.small', 'No he podido comprobarlo (' + (e.message || e) + '). ¿Hay Internet?')); }
    finally { b.disabled = false; b.textContent = '🔎 Comprobar la publicación'; } }, { cls: 'sm act-comprobar' });
  const bReinst = () => btn('🧹 Reinstalar la app', () => instalar(estado, true), { cls: 'sm ghost act-reinstalar', title: 'Borra la copia guardada de la app y la baja entera otra vez. Tus datos no se tocan.' });
  async function busca() {
    mount(det); mount(bots); estado('🔍 Buscando…');
    if (enPC) { // el programa del PC lleva la app dentro: se actualiza con el instalador. Desde aquí se puede mirar la de los móviles.
      estado('En el PC el programa se actualiza con «ACTUALIZAR_A_….bat» de la carpeta de la versión nueva.');
      if (!base) return mount(det, h('p.small.muted', 'Para comprobar desde aquí la app de los móviles, apunta su dirección en Configuración → Equipo → Invitar.'));
      try { const p = await publicado(base); const d = decidir(p, [], APP_VERSION);
        mount(det, h('p.small', '📱 App de los móviles (' + base.replace(/^https:\/\//, '') + '): ' + (d.k === 'incompleta' ? '⚠️ ' + d.t : 'publicada la ' + p.app + (p.app === APP_VERSION ? ' (la misma que este PC).' : '. Este PC tiene la ' + APP_VERSION + '.')))); mount(bots, bComprobar(p));
      } catch (e) { mount(det, h('p.small.muted', 'No he podido mirar la app de los móviles (' + (e.message || e) + ').')); mount(bots, btn('Reintentar', busca, { cls: 'sm' })); }
      return;
    }
    if (!haySW) { estado('En este navegador la app no se guarda: con recargar la página ya tienes la última.'); return mount(bots, btn('Recargar', () => location.reload(), { cls: 'primary act-recargar' })); }
    let pub; try { pub = await publicado(base); } catch (e) { estado('📡 Sin conexión con Internet. Vuelve a probar cuando la tengas.'); return mount(bots, btn('Reintentar', busca, { cls: 'sm primary' }), bReinst()); }
    let inst = []; try { inst = await caches.keys(); } catch (e) { }
    const d = decidir(pub, inst, APP_VERSION);
    estado((d.k === 'aldia' ? '✅ ' : d.k === 'nueva' ? '🆕 ' : '⚠️ ') + d.t);
    if (d.k === 'nueva') { mount(bots, btn('⬇️ Actualizar ahora', () => { mount(bots); instalar(estado, false); }, { cls: 'primary act-ya' })); instalar(estado, false); }
    else mount(bots, btn('Buscar otra vez', busca, { cls: 'sm' }), pub.huellas ? bComprobar(pub) : null, bReinst());
  }
  busca();
  return m;
}
// El botón fijo del menú
export const botonActualizar = () => h('button.nav-act', { type: 'button', title: 'Busca si hay una versión nueva y la instala', onclick: e => { e.stopPropagation(); dialogoActualizar(); } }, h('span', '🔄 Buscar actualización'), h('small', 'v' + APP_VERSION));
