// ================= 25-11-2026 · 🔓 ENTRAR SIN CONTRASEÑA =================
// Biou (25-11): «dije que no quería iniciar sesión con contraseña». Lo que aún la pedía (medido en SU programa): el bloqueo por
// inactividad (Configuración › Seguridad: 20 min) y la primera vez en cada aparato. Ahora:
//  · 🔒 el bloqueo enseña las CARAS guardadas en este aparato: un toque en la tuya y sigues (en otra, entra esa persona);
//    solo si tu cara no está guardada aquí (modo USB, o la quitaste con «Cerrar sesión») se pide la contraseña, como antes;
//  · 📱 «Entrar en otro aparato»: un QR que vale 3 minutos y una sola vez (server/54_vincular.gs). El móvil lo lee con la cámara y entra;
//    en el portátil se escribe el código corto («K7M2-P9QX») en «📱 Tengo un código».
// La seguridad sigue igual de fuerte: las caras solo existen en los aparatos donde esa persona ya entró, cada aparato tiene su sesión
// (se ve y se cierra en Configuración › Seguridad) y el QR solo lo puede sacar quien ya está dentro.
import { h, mount, btn, modal, toast, avatar, field, inp, copyText } from './ui.js';
import { S, perfilesGuardados, entrarPerfil, pedirCodigoVincular, entrarConCodigo, unlock } from './store.js';
import { qrSvg } from './qr.js';
import { desktop } from './desktop.js';
export { entrarConCodigo as entrarConCodigoYa } from './store.js'; // (el arranque por el enlace del QR: app.js)

// La dirección pública de la app del móvil (la misma que usa Configuración › App del móvil)
export function direccionApp() {
  const guardada = localStorage.getItem('cd.appUrl') || '';
  return (S.cfg && S.cfg.appUrl) || (guardada && !/^https:\/\/github\.com\//i.test(guardada) ? guardada : '') || (S.cfg && S.cfg.invitaciones && S.cfg.invitaciones.appUrl) || (location.protocol === 'https:' ? location.origin + location.pathname : '');
}
export function enlaceVincular(codigo) {
  const u = direccionApp(); if (!/^https:\/\//.test(u)) return '';
  return u + (u.includes('?') ? '&' : '?') + 's=' + encodeURIComponent(S.server) + '&vin=' + encodeURIComponent(codigo);
}

// ---------- 📱 Enseñar el QR (en el aparato donde ya estás dentro) ----------
export function abrirQR() {
  const caja = h('div.vin-caja', h('p.muted', 'Preparando el código…'));
  let reloj = null;
  const m = modal('📱 Entrar en otro aparato', h('div.col', caja), close => [btn('Cerrar', close)], { size: 'narrow', sinBorrador: true, onclose: () => clearInterval(reloj) });
  const pide = async () => {
    clearInterval(reloj);
    mount(caja, h('p.muted', 'Preparando el código…'));
    let r;
    try { r = await pedirCodigoVincular(); } catch (e) { mount(caja, h('p.bad-t', e.code === 'NET' ? 'Sin conexión: hace falta Internet para sacar el código.' : e.message), btn('🔄 Probar otra vez', pide)); return; }
    const link = enlaceVincular(r.codigo), fin = Date.now() + (r.segundos || 180) * 1000;
    const cuenta = h('b.vin-cuenta'), qr = link ? h('div.vin-qr', { html: qrSvg(link, 6) }) : h('p.small.muted', 'Falta la dirección de la app del móvil (Configuración › App del móvil). Mientras, usa el código de abajo.');
    const nuevo = btn('🔄 Otro código', pide, { cls: 'sm' }); nuevo.hidden = true;
    mount(caja,
      h('ol.vin-pasos', h('li', 'En el móvil, abre la ', h('b', 'cámara'), ' y apunta aquí.'), h('li', 'Toca el enlace que sale.'), h('li', '✅ Entras ', h('b', 'sin contraseña'), '.')),
      qr,
      h('div.vin-codigo', { title: 'En el portátil: «📱 Tengo un código» y escribe esto' }, r.codigo),
      h('p.small.muted', 'En el portátil: en la pantalla de entrar, «📱 Tengo un código» y escribe el de arriba.'),
      h('p.small', '⏳ Vale ', cuenta, ' y sirve una sola vez.'), nuevo,
      link ? h('div.row.wrap', btn('Copiar enlace', () => copyText(link), { icon: 'copy', cls: 'sm ghost' })) : null);
    const tic = () => { const s = Math.max(0, Math.round((fin - Date.now()) / 1000)); cuenta.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); if (!s) { clearInterval(reloj); caja.classList.add('vin-caducado'); cuenta.textContent = '0:00 (ya no vale)'; nuevo.hidden = false; } };
    caja.classList.remove('vin-caducado'); tic(); reloj = setInterval(tic, 1000);
  };
  pide();
  return m;
}

// ---------- 📱 «Tengo un código» (en el aparato nuevo, sin cámara: el portátil) ----------
export function escribirCodigo(done) {
  const c = inp({ placeholder: 'K7M2-P9QX', autocomplete: 'one-time-code', autocapitalize: 'characters', style: { letterSpacing: '.14em', textTransform: 'uppercase', fontSize: '22px', textAlign: 'center' } });
  const msg = h('p.small');
  const m = modal('📱 Tengo un código', h('div.col', h('p.small.muted', 'En el aparato donde ya estás dentro: tu cara (arriba a la derecha) › «📱 Entrar en otro aparato». Escribe aquí el código que sale.'), field('Código', c), msg),
    close => [btn('Cancelar', close), btn('Entrar', async ev => {
      const b = ev.target.closest('button'); msg.className = 'small'; msg.textContent = '';
      if (c.value.replace(/[^a-z0-9]/gi, '').length !== 8) { msg.className = 'small bad-t'; msg.textContent = 'Son 8 letras y números (por ejemplo K7M2-P9QX).'; return; }
      b.disabled = true;
      try { await entrarConCodigo(c.value); close(); toast('✅ Dentro. La próxima vez, con un toque en tu cara.', 'ok', 6000); done(); }
      catch (e) { msg.className = 'small bad-t'; msg.textContent = e.code === 'NET' ? 'Sin conexión: prueba otra vez en un momento.' : e.message; b.disabled = false; }
    }, { cls: 'primary' })], { size: 'narrow', sinBorrador: true });
  c.addEventListener('keydown', e => { if (e.key === 'Enter') m.el && m.el.querySelector('.btn.primary') && m.el.querySelector('.btn.primary').click(); });
  setTimeout(() => c.focus(), 50);
  return m;
}

// ---------- 🔒 El bloqueo por inactividad, con las caras ----------
// alSeguir(): la misma persona sigue (no se cambia nada) · alCambiar(): ya ha entrado OTRA persona (hay que rehacer la pantalla)
// · alOtraConClave(): ir a «¿Quién eres?» para que entre alguien con su contraseña
export async function pantallaBloqueo({ alSeguir, alCambiar, alOtraConClave }) {
  const caras = desktop.portable ? [] : await perfilesGuardados().catch(() => []);
  const mia = S.me && caras.find(c => c.usuario === S.me.usuario);
  const msg = h('p.bad-t');
  let o;
  if (mia) {
    const orden = [mia].concat(caras.filter(c => c !== mia));
    const tocar = async (c, b) => {
      msg.textContent = '';
      if (c === mia) { o.remove(); alSeguir(); return; } // es la misma persona: su sesión sigue abierta en este aparato
      b.disabled = true; b.classList.add('entrando');
      try { await entrarPerfil(c.usuario); o.remove(); alCambiar(); }
      catch (e) { b.disabled = false; b.classList.remove('entrando'); msg.textContent = e.code === 'NET' ? 'Sin conexión: prueba otra vez en un momento.' : e.message; }
    };
    o = h('div.overlay.bloqueo-caras', { style: { background: 'var(--bg)', zIndex: 300 } }, h('div.card.auth-card.col.qe-bloqueo', { style: { padding: '28px' } },
      h('h2', '🔒 ¿Quién sigue? 👋'), h('p.muted', 'Toca tu cara para seguir. Sin contraseña.'),
      h('div.qe-caras', orden.map(c => { const b = h('button.qe-cara', { 'data-u': c.usuario, onclick: () => tocar(c, b) }, avatar(c, 'xl'), h('b', c.nombre || c.usuario), c === mia ? h('small.muted', 'estabas tú') : null); return b; })),
      msg,
      h('button.btn.ghost.sm', { onclick: () => { o.remove(); alOtraConClave(); } }, '👥 Cambiar de persona (o entrar con contraseña)')));
    document.body.appendChild(o);
    setTimeout(() => { const b = o.querySelector('.qe-cara'); if (b) b.focus(); }, 50);
    return o;
  }
  // Sin su cara guardada aquí (modo USB o «Cerrar sesión»): como antes, con la contraseña
  const p = inp({ type: 'password', placeholder: 'Tu contraseña', autocomplete: 'current-password' });
  const go2 = async () => {
    try { await unlock(p.value); o.remove(); alSeguir(); }
    catch (e) { msg.textContent = e.message; p.value = ''; p.focus(); }
  };
  p.addEventListener('keydown', e => { if (e.key === 'Enter') go2(); });
  o = h('div.overlay', { style: { background: 'var(--bg)', zIndex: 300 } }, h('div.card.auth-card.col', { style: { padding: '28px' } },
    h('div.row', avatar(S.me, 'l'), h('div', h('h2', 'Pantalla bloqueada'), h('p.muted', S.me.nombre + ' · por inactividad'))),
    field('Contraseña', p), msg, btn('Desbloquear', go2, { cls: 'primary' }),
    btn('Cambiar de persona', () => { o.remove(); alOtraConClave(); }, { cls: 'ghost' })));
  document.body.appendChild(o);
  setTimeout(() => p.focus(), 50);
  return o;
}
