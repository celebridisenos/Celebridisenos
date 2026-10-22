// ================= ✨ CelebriDREW · CLAUDE, EL ASISTENTE DE PATRONAJE (20-10-2026, plan maestro 3) =================
// Ella: «un botón Claude integrado en la interfaz para crear o modificar patrones mediante instrucciones». Se le dice con palabras («hazla
// más larga, por la rodilla, con manga larga y escote de pico») y, si se quiere, con una FOTO («cópiame este vestido»). Claude contesta la
// FICHA de la prenda (la misma que lee la IA de las fotos: inspira.js) y el programa la convierte en patrón con su camino ya probado
// (inspira.diseno → crear en el avatar): así el resultado SIEMPRE es un patrón válido y a su medida, nunca un dibujo inventado.
// Lo que pide y la plantilla no sabe hacer se DICE (no se finge). Claude va por el programa del PC (desktop/host/claude.go), con su cuenta.
// 21-10: en el MÓVIL y la TABLET también: se lo encarga al PC del taller (drew/claude_pc.js) en vez de decir «solo en el PC».
import { h, mount, btn, toast, modal } from '../ui.js';
import * as INS from './foto/inspira.js';
import { leeJSON, jpeg } from './foto/vision.js';

const ESPEC = INS.PREGUNTA.slice(INS.PREGUNTA.indexOf('Answer ONLY'));
export const EJEMPLOS = ['Hazla más larga, por la rodilla', 'Ponle manga larga y escote de pico', 'Que sea oversize y con capucha', 'Cópiame la prenda de esta foto', 'Un vestido midi evasé de tirantes finos'];

// el texto que se le manda: la prenda de ahora, lo que pide y cómo tiene que contestar
export function prompt(pide, actual, conFoto) {
  return ['Eres el asistente de patronaje de CelebriDREW, un programa que hace patrones de ropa a la medida de un avatar.',
    'La prenda que hay ahora en el programa: ' + JSON.stringify(actual || {}) + '.',
    conFoto ? 'Te paso además una FOTO de referencia: copia con fidelidad la prenda principal de la foto (lo que se vea en ella manda sobre la prenda de ahora).' : 'No hay foto: parte de la prenda de ahora y cambia SOLO lo que pide.',
    'Lo que pide la diseñadora: «' + String(pide || '').slice(0, 1200) + '».',
    'Contesta con la ficha de la prenda TAL COMO DEBE QUEDAR. ' + ESPEC,
    'Añade también "nombre" (nombre corto de la prenda en castellano, por ejemplo «Vestido midi de tirantes»), "explicacion" (una frase corta en castellano: qué has hecho) y "no_se_puede" (array con lo que pide y esta ficha no permite expresar, en castellano). Si no hay foto, pon "foto": "dibujo" y "caja": null. Solo el JSON, sin texto alrededor.'].join('\n');
}
// la respuesta de Claude → { L (la lectura, como la de las fotos), D (el diseño), explicacion, noSePuede } o un error claro
export function interpreta(texto) {
  const j = leeJSON(texto); if (!j) throw new Error('Claude no ha contestado con la ficha (vuelve a intentarlo con otras palabras).');
  const L = INS.lee(j, { modelo: 'claude' }); L.campos && Object.values(L.campos).forEach(c => { c.duda = false; }); // (lo ha decidido a propósito)
  const faltan = ['categoria', 'largo'].filter(c => !L.campos[c] || L.campos[c].v == null);
  if (faltan.length) throw new Error('A la ficha le falta ' + faltan.join(' y ') + ': dilo con palabras (por ejemplo «un vestido por la rodilla»).');
  const D = INS.diseno(L, null);
  const nom = String(j.nombre || '').trim().slice(0, 60); D.nombre = nom || String(D.nombre || 'Prenda').replace(/ de la imagen$/i, '');
  return { L, D, j, explicacion: String(j.explicacion || '').slice(0, 300), noSePuede: (Array.isArray(j.no_se_puede) ? j.no_se_puede : []).map(String).slice(0, 8) };
}

// o: { actual() → lo que hay ahora · crear(D, L, extra) → { ok } · listo() · imagen() → dataURL de la última foto de referencia (si hay) }
export function abre(o) {
  const cuerpo = h('div.dw-claude'), m = modal('✨ Claude · tu asistente de patronaje', cuerpo, null, { size: 'wide' });
  let D = null, foto = null, vigila = 0, enviando = false;
  // en el MÓVIL / la TABLET (21-10): Claude es el del PC del taller, por encargo (drew/claude_pc.js); aquí no hay sesión que mirar
  const relevo = { relevo: true, claudeEstado: async () => ({ instalado: true, sesion: true }), claudePregunta: async (t, b64) => (await import('./claude_pc.js')).claudePorPC(t, b64, { onStatus: x => { relevo.estado && relevo.estado(x); } }) };
  const desk = async () => { if (window.__claudeFalso) return window.__claudeFalso; /* (solo las pruebas: un Claude falso) */ try { const x = await import('../desktop.js'); return x.desktop && x.desktop.on ? x.desktop : relevo; } catch (e) { return relevo; } };
  async function pinta() {
    D = await desk(); clearInterval(vigila);
    if (!D || !D.claudeEstado) D = relevo;
    if (D.relevo) return formulario();
    mount(cuerpo, h('p.muted', 'Mirando si Claude está conectado en este PC…'));
    let e; try { e = await D.claudeEstado(true); } catch (x) { return mount(cuerpo, h('p.bad-t', '⚠️ ' + x.message)); }
    if (!e.instalado) return mount(cuerpo, h('div.dw-cl-falta', h('b', 'En este PC no está la app de escritorio de Claude.'), h('p.small', e.aviso || 'Instálala desde claude.ai/download y vuelve aquí.')));
    if (!e.sesion) return conectar();
    formulario();
  }
  function conectar() {
    mount(cuerpo, h('div.dw-cl-falta', h('b', '🔗 Conecta Claude con tu cuenta (una sola vez en este PC)'),
      h('p.small', 'Se abre la ventana OFICIAL de Claude y entras con tu cuenta en el navegador. El programa no ve tu contraseña ni la guarda: solo pregunta si hay sesión.'),
      btn('🔗 Conectar Claude', async ev => { const b = ev.target.closest('button'); b.disabled = true; try { const r = await D.claudeConectar(); if (!r.ok) { toast(r.error || 'No se ha podido abrir', 'bad'); b.disabled = false; return; } } catch (x) { toast(x.message, 'bad'); b.disabled = false; return; }
        toast('Termina de entrar en la ventana que se ha abierto; esto se pone solo en marcha cuando acabes.', 'ok', 8000);
        vigila = setInterval(async () => { if (!cuerpo.isConnected) return clearInterval(vigila); try { const e = await D.claudeEstado(true); if (e.sesion) { clearInterval(vigila); toast('✨ Claude conectado', 'ok'); formulario(); } } catch (x) { } }, 4000); }, { cls: 'primary dw-cl-conectar' })));
  }
  function formulario() {
    const ta = h('textarea.inp.dw-cl-pide', { rows: 4, placeholder: 'Dile qué quieres. Por ejemplo: «hazla más larga, por la rodilla, con manga larga y escote de pico» o «cópiame el vestido de esta foto».' });
    const fotoBox = h('div.dw-cl-foto'), res = h('div.dw-cl-res');
    const ponFoto = url => { foto = url; mount(fotoBox, url ? h('div.dw-cl-mini', h('img', { src: url, alt: 'Foto de referencia' }), btn('✕ Quitar la foto', () => ponFoto(null), { cls: 'sm ghost' })) : null); };
    const elige = () => { const i = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files[0]; i.remove(); if (!f) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => ponFoto('data:image/jpeg;base64,' + jpeg(im, 1280)); im.src = r.result; }; r.readAsDataURL(f); } }); document.body.append(i); i.click(); };
    const ultima = o.imagen && o.imagen();
    mount(cuerpo, h('div.dw-cl-chips', EJEMPLOS.map(t => h('button.dw-chip', { type: 'button', onclick: () => { ta.value = t; ta.focus(); } }, t))), ta,
      h('div.row.wrap', { style: { gap: '6px' } }, btn('🖼 Añadir una foto de referencia', elige, { cls: 'sm ghost dw-cl-elige' }), ultima ? btn('🖼 Usar la última foto que miré', () => { const im = new Image(); im.onload = () => ponFoto('data:image/jpeg;base64,' + jpeg(im, 1280)); im.src = ultima; }, { cls: 'sm ghost dw-cl-ultima' }) : null), fotoBox,
      h('p.tiny.muted', D && D.relevo ? '📱→🖥️ Desde aquí, Claude lo hace el PC del taller con tu cuenta (tiene que estar encendido con el programa abierto). El patrón lo hace este programa a la medida de tu avatar.' : 'Lo que escribes (y la foto, si la pones) va a Claude con tu cuenta de Claude. El patrón lo hace este programa a la medida de tu avatar.'),
      h('div.row', btn('✨ Pedírselo a Claude', () => envia(ta.value, res), { cls: 'primary dw-cl-envia' })), res);
    setTimeout(() => ta.focus(), 50);
  }
  async function envia(pide, res) {
    if (enviando) return; pide = String(pide || '').trim(); if (!pide && !foto) return toast('Escribe qué quieres (o pon una foto).', 'warn');
    if (o.listo && !o.listo()) return toast('Espera un momento: el avatar se está preparando.', 'warn');
    enviando = true; const t0 = Date.now(), reloj = h('small.muted'), tic = setInterval(() => { reloj.textContent = Math.round((Date.now() - t0) / 1000) + ' s'; }, 1000);
    const via = h('small.muted.dw-cl-via'); relevo.estado = t => { via.textContent = ' · ' + t; };
    mount(res, h('div.dw-cl-pensando', h('b', '✨ Claude está pensando la prenda…'), reloj, D && D.relevo ? via : null));
    let R;
    try { const r = await D.claudePregunta(prompt(pide || 'Cópiame la prenda de la foto', o.actual ? o.actual() : null, !!foto), foto ? foto.replace(/^data:[^,]+,/, '') : '');
      if (!r.ok) { clearInterval(tic); enviando = false; if (r.sinSesion && !D.relevo) return conectar(); return mount(res, h('p.bad-t', '⚠️ ' + (r.error || 'No ha contestado.'))); }
      R = interpreta(r.texto); R.ms = r.ms; }
    catch (x) { clearInterval(tic); enviando = false; return mount(res, h('p.bad-t', '⚠️ ' + x.message)); }
    clearInterval(tic); enviando = false; window.__drewClaude = { j: R.j, D: R.D, explicacion: R.explicacion };
    const fila = (c) => { const x = R.L.campos[c]; return x && x.v != null ? h('li', h('b', (INS.CAMPOS.find(y => y[0] === c) || [, c])[1] + ': '), INS.nombreDe(c, x.v)) : null; };
    mount(res, h('div.dw-cl-ok', h('b', '👗 ' + (R.D.nombre || 'La prenda')), R.explicacion ? h('p', R.explicacion) : null,
      h('ul.small', (INS.TOCA[R.D.k] || ['categoria', 'largo', 'manga', 'escote', 'ajuste']).map(fila)),
      (R.D.noHace || []).length || R.noSePuede.length ? h('div.dw-cl-no', h('b', 'Lo que todavía no sale en el patrón: '), [...new Set((R.D.noHace || []).concat(R.noSePuede))].join(' · ')) : null,
      h('small.muted', 'Claude ha tardado ' + Math.round((R.ms || 0) / 1000) + ' s.'),
      h('div.row', btn('🧵 Hacer el patrón en mi avatar', () => { const X = o.crear(R.D, R.L, {}); if (X && X.ok === false) return toast(X.error || 'No se ha podido crear el patrón.', 'bad', 9000); toast('👗 ' + R.D.nombre + ': cosiéndose en tu avatar…', 'ok', 5000); m.close(); }, { cls: 'primary dw-cl-crear' }))));
  }
  pinta();
  return { cierra: () => m.close() };
}
