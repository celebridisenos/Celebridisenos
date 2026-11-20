// ================= 19-11-2026 · ✍️ BORRADORES: lo escrito no se pierde al salir de la app =================
// Biou: «en el móvil cuando pones la ventana en minimizar para copiar un nombre, vuelves a entrar, se reinicia, eso es perder
// información, jefe!». Dos causas: (1) al volver, la app buscaba versión nueva y, si la había y el cursor ya no estaba en un campo
// (al cambiar de app se pierde), se recargaba sola; (2) el móvil cierra las apps de fondo para ahorrar memoria y, al volver, la abre
// de cero. La (1) se corta en index.html (si has escrito algo en la última media hora, la versión nueva espera a que pulses el botón).
// Para la (2) y cualquier otra recarga: todo lo que escribes en una ventana (modal), en un panel lateral (drawer) o en la pantalla se
// guarda EN ESTE DISPOSITIVO mientras escribes y al salir de la app. Al volver:
//   · la misma ventana se vuelve a abrir sola («Nuevo pedido», «Editar pedido nº …») con lo escrito, y lo dice;
//   · en la pantalla, los campos que vuelven vacíos se rellenan con lo que tenías;
//   · si la ventana no se puede abrir sola, sale un aviso con «Ver lo escrito» (para copiarlo).
// Se borra al guardar o cancelar esa ventana. Caduca a las 12 h. Nunca contraseñas, archivos ni buscadores. No va a ningún servidor.
const KEY = 'cd.borradores', CADUCA = 12 * 3600e3;
const REABRIR = []; // [regex del título, fn(match)] · los registra app.js
export function registraReabrir(rx, fn) { REABRIR.push([rx, fn]); }
const lee = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'), t = Date.now(); Object.keys(o).forEach(k => { if (!o[k] || t - o[k].t > CADUCA) delete o[k]; }); return o; } catch (e) { return {}; } };
const escribe = o => { try { if (Object.keys(o).length) localStorage.setItem(KEY, JSON.stringify(o)); else localStorage.removeItem(KEY); } catch (e) { } };

// Los campos que cuentan (lo que escribe una persona)
const VALE = el => /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(password|file|hidden|search|button|submit|reset|image)$/i.test(el.type || '') && !el.closest('.topbar, .quickbar, .inp-icon, .palette, .bd-no') && !el.disabled;
const campos = raiz => [...raiz.querySelectorAll('input, textarea, select')].filter(VALE);
const etiquetaDe = el => { const f = el.closest('.field, label'); const l = f && f.querySelector('label, .lbl, span'); return (el.name || el.getAttribute('aria-label') || el.placeholder || (l && l.textContent) || '').trim().slice(0, 60); };
const firma = el => el.tagName + ':' + (el.type || '') + ':' + etiquetaDe(el);
const valorDe = el => el.type === 'checkbox' || el.type === 'radio' ? (el.checked ? '1' : '0') : String(el.value || '');
const porDefecto = el => el.type === 'checkbox' || el.type === 'radio' ? (el.defaultChecked ? '1' : '0') : el.tagName === 'SELECT' ? null : String(el.defaultValue || '');
function foto(raiz) { // lo escrito en esta caja: [firma, nº de esa firma, valor, etiqueta]
  const n = {}; const out = [];
  campos(raiz).forEach(el => { const f = firma(el); n[f] = (n[f] || 0) + 1; out.push([f, n[f] - 1, valorDe(el), etiquetaDe(el)]); });
  return out;
}
const hayAlgo = (raiz, F) => campos(raiz).some((el, i) => { const d = porDefecto(el); return d !== null && valorDe(el) !== d && (el.type === 'checkbox' || String(F[i][2]).trim() !== ''); });
function pon(raiz, F, soloVacios) { // vuelve a poner lo guardado; devuelve cuántos campos
  const n = {}; let puestos = 0; const por = new Map(F.map(x => [x[0] + '#' + x[1], x[2]]));
  campos(raiz).forEach(el => {
    const f = firma(el); n[f] = (n[f] || 0) + 1; const v = por.get(f + '#' + (n[f] - 1)); if (v == null) return;
    if (el.type === 'checkbox' || el.type === 'radio') { const c = v === '1'; if (el.checked !== c && !soloVacios) { el.checked = c; el.dispatchEvent(new Event('change', { bubbles: true })); puestos++; } return; }
    if (valorDe(el) === v || (soloVacios && String(el.value || '').trim() !== '')) return;
    if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === v)) return;
    el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); puestos++;
  });
  return puestos;
}
const tituloDe = (caja, tipo) => tipo === 'vista' ? 'vista:' + location.hash : tipo + ':' + ((caja.getAttribute && caja.getAttribute('aria-label')) || ((caja.querySelector('h2, h3') || {}).textContent || '').trim()).slice(0, 80);
const cajaDe = el => { const m = el.closest('.modal'); if (m) return [m, 'modal']; const d = el.closest('.drawer'); if (d) return [d, 'panel']; const c = el.closest('.content'); return c ? [c, 'vista'] : [null, '']; };

const vivas = new Map(), tocadas = new WeakSet(); // título → caja abierta (para guardar al salir) · cajas en las que TÚ has escrito
function guarda(caja, tipo) {
  if (!caja || !caja.isConnected) return; const t = tituloDe(caja, tipo); if (!t || /:$/.test(t)) return;
  const F = foto(caja), o = lee();
  if (hayAlgo(caja, F)) { o[t] = { t: Date.now(), hash: location.hash, F }; window.__cdHayBorrador = true; } else delete o[t];
  escribe(o); vivas.set(t, [caja, tipo]);
}
const guardaTodo = () => vivas.forEach(([c, tp]) => { if (tocadas.has(c)) guarda(c, tp); });
let tm = null;
export function arrancar() {
  if (arrancar._ok) return; arrancar._ok = true;
  document.addEventListener('input', e => { if (!e.isTrusted || !VALE(e.target)) return; window.__cdEscribio = Date.now(); const [c, tp] = cajaDe(e.target); if (!c) return; tocadas.add(c); vivas.set(tituloDe(c, tp), [c, tp]); clearTimeout(tm); tm = setTimeout(() => guarda(c, tp), 400); }, true);
  document.addEventListener('change', e => { if (!e.isTrusted || !VALE(e.target)) return; const [c, tp] = cajaDe(e.target); if (c) { tocadas.add(c); guarda(c, tp); } }, true);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardaTodo(); });
  addEventListener('pagehide', guardaTodo);
  window.__cdHayBorrador = Object.keys(lee()).length > 0;
  // al arrancar: las ventanas que estaban a medias se vuelven a abrir solas (si se sabe cómo); si no, aviso con «Ver lo escrito»
  setTimeout(() => {
    const o = lee();
    Object.entries(o).forEach(([t, r]) => { if (!t.startsWith('modal:') || r.hash !== location.hash) return; const tit = t.slice(6), R = REABRIR.find(([rx]) => rx.test(tit)); if (R && ![...document.querySelectorAll('.modal')].some(m => m.getAttribute('aria-label') === tit)) { try { R[1](tit.match(R[0])); } catch (e) { } } });
    setTimeout(() => {
      const o2 = lee(), sueltos = Object.entries(o2).filter(([t, r]) => !t.startsWith('vista:') && ![...vivas.keys()].includes(t) && r.F.some(x => String(x[2]).trim().length > 1 && x[2] !== '0' && x[2] !== '1'));
      if (sueltos.length) import('./ui.js').then(U => U.toast('✍️ Tenías algo escrito en «' + sueltos[0][0].replace(/^\w+:/, '') + '».', 'info', 20000, { t: 'Ver lo escrito', on: () => verLoEscrito(sueltos) })).catch(() => { });
    }, 2500);
  }, 1500);
}
// ui.js lo llama al abrir una ventana o un panel: si hay borrador de ESA ventana, lo vuelve a poner (y lo dice)
export function alAbrir(caja, tipo) {
  const t = tituloDe(caja, tipo); vivas.set(t, [caja, tipo]);
  const r = lee()[t]; if (!r) return; tocadas.add(caja);
  let total = 0; const intenta = () => { total += pon(caja, r.F, false); };
  setTimeout(() => { intenta(); setTimeout(() => { intenta(); if (total) import('./ui.js').then(U => U.toast('✍️ He recuperado lo que tenías escrito', 'ok', 5000)).catch(() => { }); }, 700); }, 80);
}
// ui.js lo llama al cerrar (guardar o cancelar): ese borrador ya no hace falta
export function alCerrar(caja, tipo) { const t = tituloDe(caja, tipo); vivas.delete(t); const o = lee(); if (o[t]) { delete o[t]; escribe(o); } window.__cdHayBorrador = Object.keys(o).length > 0; }
// app.js lo llama al pintar una pantalla: los campos que vuelven vacíos se rellenan con lo que tenías
export function alPintarVista(content) {
  const t = 'vista:' + location.hash, r = lee()[t]; vivas.set(t, [content, 'vista']); if (!r) return; tocadas.add(content);
  setTimeout(() => { const n = pon(content, r.F, true); if (n) import('./ui.js').then(U => U.toast('✍️ He recuperado lo que tenías escrito', 'ok', 5000)).catch(() => { }); }, 300);
}
function verLoEscrito(lista) {
  import('./ui.js').then(U => {
    const filas = []; lista.forEach(([t, r]) => { filas.push(U.h('h3', t.replace(/^\w+:/, ''))); r.F.filter(x => String(x[2]).trim() && x[2] !== '0' && x[2] !== '1').forEach(x => filas.push(U.h('div.row', { style: { gap: '8px', alignItems: 'center', margin: '4px 0' } }, U.h('b', { style: { minWidth: '90px' } }, x[3] || 'Campo'), U.h('span', { style: { flex: '1', wordBreak: 'break-word' } }, x[2]), U.btn('Copiar', () => { try { navigator.clipboard.writeText(x[2]); U.toast('Copiado', 'ok'); } catch (e) { } }, { cls: 'sm ghost' })))); });
    U.modal('✍️ Lo que tenías escrito', U.h('div', filas), close => [U.btn('Borrar estos borradores', () => { const o = lee(); lista.forEach(([t]) => delete o[t]); escribe(o); close(); }, { cls: 'ghost' }), U.btn('Cerrar', close, { cls: 'primary' })], { sinBorrador: true });
  });
}
export const _t = { lee, foto, firma };
