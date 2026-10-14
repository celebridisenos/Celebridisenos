// ================= 13-10-2026 · 📸 CelebriR8 · DESDE UNA FOTO (CelebriCLON + Foto → 3D, juntos) =================
// La dueña: «el Foto3D y CelebriCLON tienen que estar juntos si tiene sentido… tiene que ser todo ecosistema». Lo tiene: las dos
// empiezan igual (una foto) y solo cambia QUÉ quieres sacar de ella:
//   🧬 Un REPUESTO a medida (CelebriCLON): tiene que encajar → medidas, calibre, agujeros, STL exacto.
//   🪄 Una FIGURA, un relieve o una litofanía (Foto → 3D): es de adorno → la IA saca la forma, sin medidas.
// Una sola pestaña con los dos caminos arriba. La foto que subes en uno está ya en el otro (botón «Usar la misma foto»), y lo que
// hagas en cualquiera va a la misma mesa (Estudio, Resistencia, Print Doctor). Se recuerda el último camino.
// Por dentro siguen siendo las dos pantallas de siempre (r8_clon.js y r8_foto.js), sin duplicar nada.
import { h, mount, btn, toast } from '../ui.js';
import * as E from '../r8/estado.js';

const CLAVE = 'cd.r8.fotomodo';
const MODOS = {
  clon: { e: '🧬', t: 'Repuesto a medida', s: 'CelebriCLON · tiene que encajar: medidas, agujeros y calibre', mod: './r8_clon.js', fn: 'montarClon' },
  figura: { e: '🪄', t: 'Figura, relieve o litofanía', s: 'Con IA · de adorno: la forma sale sola, sin medidas', mod: './r8_foto.js', fn: 'montarFoto' }
};
const leeModo = () => { try { const m = localStorage.getItem(CLAVE); return MODOS[m] ? m : 'clon'; } catch (e) { return 'clon'; } };

export async function montarDesdeFoto(el, ext = {}) {
  let modo = MODOS[ext.modo] ? ext.modo : leeModo(), actual = null, turno = 0, vivo = true, puesto = null; // puesto = el camino que ya está abierto (o abriéndose)
  const barra = h('div.df-barra'), caja = h('div.df-caja'); let gancho = null;
  el.appendChild(h('div.df', barra, caja));
  const pintaBarra = () => {
    const f = E.fotoCompartida();
    mount(barra,
      h('div.df-tit', h('span', '📸'), h('div', h('b', 'Desde una foto'), h('small', '¿Qué quieres sacar de tu foto?'))),
      h('div.df-modos', { role: 'tablist' }, Object.entries(MODOS).map(([k, m]) => h('button.df-modo' + (k === modo ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(k === modo), 'data-modo': k, onclick: () => cambia(k) }, h('span', m.e), h('div', h('b', m.t), h('small', m.s))))),
      f && actual && actual.usaFoto && !actual.tieneFoto?.() ? btn('🔁 Usar la misma foto (' + (f.name || 'foto').slice(0, 28) + ')', () => { try { actual.usaFoto(f); pintaBarra(); } catch (e) { toast(e.message || String(e), 'bad'); } }, { cls: 'sm df-misma', title: 'La foto que subiste en el otro camino, sin volver a buscarla' }) : null);
  };
  async function cambia(k) {
    if (!MODOS[k]) return; if (k === puesto) return; // 13-10-2026 (noche): tocar el camino en el que YA estás no lo cierra y lo vuelve a abrir (se abría dos veces y la primera, al cerrarse, estorbaba a la segunda)
    const yo = ++turno; modo = k; puesto = k; try { localStorage.setItem(CLAVE, k); } catch (e) { }
    try { actual && actual.destroy && actual.destroy(); } catch (e) { } actual = null; mount(caja); pintaBarra();
    const sub = h('div.df-sub'); caja.appendChild(sub);
    try { const m = await import(MODOS[k].mod); if (yo !== turno || !vivo) return; const r = await m[MODOS[k].fn](sub, ext); if (yo !== turno || !vivo) { try { r && r.destroy && r.destroy(); } catch (e) { } return; } actual = r; }
    catch (e) { console.error(e); if (yo === turno) puesto = null; mount(sub, h('div.card', h('p.r8e-mal', '⚠️ No se ha podido abrir: ' + (e.message || e)))); } // (si falló, tocar otra vez el mismo camino lo reintenta)
    gancho = window.__r8foto = { modo, cambia }; pintaBarra();
  }
  const quita = E.escucha ? E.escucha('foto', () => pintaBarra()) : () => { };
  await cambia(modo);
  return { destroy() { vivo = false; quita(); try { actual && actual.destroy && actual.destroy(); } catch (e) { } if (window.__r8foto === gancho) delete window.__r8foto; }, cambia, get modo() { return modo; }, get actual() { return actual; } };
}
