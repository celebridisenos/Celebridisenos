// ================= v20.1 · HUGGING FACE EN UN PASO =================
// Lo pidió la dueña: «cuando esté lista, solo pongo la clave y ya está». Un cuadro: pega la clave → el programa del PC la
// comprueba con Hugging Face y la guarda en este PC (donde la busca su herramienta oficial) → baja Stable Fast 3D solo y lo
// prueba con una figura. La clave no vuelve nunca a la pantalla. Sin ventanas negras.
import { h, mount, btn, toast } from '../ui.js';

const AYUDA = 'https://huggingface.co/settings/tokens';

// opts: { alCambiar() } · devuelve el elemento (se pinta solo)
export function cajaHF(opts = {}) {
  const caja = h('div.hfk', { 'data-hf': 'caja' });
  let D = null, vigila = 0;
  const avisa = () => { try { if (opts.alCambiar) opts.alCambiar(); } catch (e) { } };

  async function pinta() {
    if (!D) { const d = await import('../desktop.js').catch(() => null); D = d && d.desktop && d.desktop.on ? d.desktop : null; }
    if (!D || !D.hfQuien) { mount(caja, h('p.small.muted', 'Hugging Face se configura en el programa del PC del taller.')); return; }
    mount(caja, h('p.small.muted', 'Mirando tu sesión de Hugging Face…'));
    let q = {}, s = {};
    try { [q, s] = await Promise.all([D.hfQuien(), D.sf3dEstado ? D.sf3dEstado() : {}]); } catch (e) { q = { sesion: false }; }
    if (s && s.enMarcha) return progreso();
    if (!q.sesion || q.valida === false) return pidiendo(q);
    const trellisOk = !s || s.trellis !== false; // (un programa del PC antiguo no lo dice: se da por bueno, como antes)
    mount(caja,
      h('div.hfk-ok', h('span', '✅'), h('div', h('b', 'Hugging Face: has entrado como ', h('span.hfk-user', q.usuario || '?')),
        q.tipo === 'fineGrained' ? h('small', 'Tu clave es «Fine-grained»: si Stable Fast 3D no baja, crea una de tipo «Read».') : null)),
      trellisOk ? h('div.hfk-ok', { 'data-hf': 'trellis' }, h('span', '✅'), h('div', h('b', 'TRELLIS.2 listo'), h('small', 'Nube gratis de Hugging Face: 1–2 figuras al día.')))
        : h('div.hfk-falta', { 'data-hf': 'trellis' }, h('span', '⬇️'), h('div', h('b', 'Falta preparar TRELLIS.2 en este PC (unos 115 MB, una sola vez)'), s.trellisError ? h('small.bad-t', '⚠️ ' + s.trellisError) : h('small', 'Se prepara solo junto con Stable Fast 3D.'))),
      s && s.instalado ? h('div.hfk-ok', { 'data-hf': 'sf3d' }, h('span', '✅'), h('div', h('b', 'Stable Fast 3D instalado en este PC'), s.prueba ? h('small', s.prueba) : null))
        : h('div.hfk-falta', { 'data-hf': 'sf3d' }, h('span', '⬇️'), h('div', h('b', 'Falta bajar Stable Fast 3D (unos 1–2 GB, una sola vez)'), s && s.error ? h('small.bad-t', '⚠️ ' + s.error) : h('small', 'Gratis con tu cuenta. Se baja solo y se prueba con una figura.'))),
      !(s && s.instalado) || !trellisOk ? h('div.row', btn(s && (s.error || s.trellisError) ? 'Reintentar' : 'Prepararlo ahora', () => empieza(), { cls: 'sm primary hfk-bajar' })) : null,
      h('div.row.wrap', { style: { gap: '6px' } }, btn('Cerrar sesión en este PC', async () => { await D.hfSalir(); toast('Sesión de Hugging Face cerrada en este PC', 'ok'); pinta(); avisa(); }, { cls: 'sm ghost' })));
  }

  function pidiendo(q) {
    const inp = h('input.inp.hfk-in', { type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'Pega aquí tu clave (empieza por hf_)', 'aria-label': 'Clave de Hugging Face' });
    const msg = h('p.small.hfk-msg');
    const guarda = async ev => {
      const b = ev && ev.target && ev.target.closest('button'), v = inp.value.trim();
      if (!v) { msg.className = 'small hfk-msg bad-t'; msg.textContent = 'Primero pega la clave en el cuadro.'; inp.focus(); return; }
      if (b) b.disabled = true; msg.className = 'small hfk-msg muted'; msg.textContent = 'Comprobando la clave con Hugging Face…';
      let r;
      try { r = await D.hfClave(v); } catch (e) { r = { ok: false, error: e.message || String(e) }; }
      inp.value = ''; // la clave no se queda en la pantalla
      if (!r || !r.ok) { if (b) b.disabled = false; msg.className = 'small hfk-msg bad-t'; msg.textContent = '⚠️ ' + ((r && r.error) || 'No se pudo comprobar.'); return; }
      toast('✅ Hugging Face: has entrado como ' + r.usuario, 'ok', 6000); avisa();
      if (!r.sf3d || r.trellis === false) empieza(); else pinta();
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') guarda(e); });
    mount(caja,
      h('div.hfk-pide',
        h('b', '🔑 Hugging Face (gratis): pega tu clave y ya está'),
        h('small', 'Con ella se bajan solos Stable Fast 3D y se activa TRELLIS.2. La clave se guarda solo en este PC y no vuelve a salir en pantalla. Nunca la pegues en un chat.'),
        q && q.valida === false ? h('small.bad-t', '⚠️ La clave guardada ya no vale (' + (q.error || 'caducada o borrada') + '). Pega una nueva.') : null,
        h('div.row.hfk-fila', inp, btn('Guardar y preparar todo', guarda, { cls: 'primary hfk-guardar' })), msg,
        h('details.more.hfk-como', h('summary', '¿Dónde está mi clave?'), h('div.in',
          h('ol.small', h('li', 'Entra en huggingface.co con tu cuenta.'), h('li', 'Arriba a la derecha: tu foto → Settings → Access Tokens.'), h('li', '«Create new token» → tipo «Read» → ponle un nombre (por ejemplo CelebriR8) → «Create».'), h('li', 'Copia la clave (empieza por hf_) y pégala arriba.')),
          h('a', { href: AYUDA, target: '_blank', rel: 'noopener' }, 'Abrir la página de las claves'),
          h('p.tiny.muted', 'Stable Fast 3D pide además aceptar su licencia (gratis) en huggingface.co/stabilityai/stable-fast-3d con tu cuenta; si no la aceptaste, el programa te lo dirá.')))));
  }

  async function empieza() {
    try { await D.sf3dBajar(true); } catch (e) { toast(e.message || String(e), 'bad'); return pinta(); }
    progreso();
  }
  function progreso() {
    const barra = h('i'), txt = h('small.hfk-txt', 'Empezando…');
    mount(caja, h('div.hfk-bajando', h('b', '⬇️ Preparando TRELLIS.2 y Stable Fast 3D'), h('div.hfk-barra', barra), txt,
      btn('Cancelar', async () => { await D.sf3dCancelar(); }, { cls: 'sm ghost' })));
    clearInterval(vigila);
    vigila = setInterval(async () => {
      if (!caja.isConnected) { clearInterval(vigila); return; }
      let s; try { s = await D.sf3dEstado(); } catch (e) { return; }
      barra.style.width = Math.max(2, s.pct || 0) + '%'; txt.textContent = s.txt || '';
      if (!s.enMarcha) {
        clearInterval(vigila);
        if (s.listo) toast('✅ Stable Fast 3D listo' + (s.prueba ? ' · ' + s.prueba : ''), 'ok', 8000);
        else if (s.error) toast('⚠️ Stable Fast 3D: ' + s.error, 'warn', 10000);
        if (s.trellisError) toast('⚠️ TRELLIS.2: ' + s.trellisError, 'warn', 10000);
        pinta(); avisa();
      }
    }, 1000);
  }

  pinta();
  caja.repinta = pinta;
  return caja;
}
