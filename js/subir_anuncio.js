// ================= 📤 SUBIR UN PRODUCTO A LAS PLATAFORMAS, CASI SOLO (04-11-2026) =================
// Biou: «estaría genial, donde adjuntas en chat para las plataformas me encanta, pero estaría guay también, si quiero publicar, que sea
// automatizado». En la ventana de chats, «📤 Subir» abre la página de SUBIR PRODUCTO de la plataforma y le rellena las fotos, el título,
// la descripción y el precio. La categoría, el estado y el envío los elige él, revisa, y PUBLICAR lo pulsa él:
//   · Vinted, Wallapop, Milanuncios y Facebook no tienen una forma oficial de que un programa publique solo; hacerlo a escondidas puede
//     cerrarle la cuenta. Rellenar la página que él tiene abierta es lo mismo que haría él escribiendo, solo que en 2 segundos.
//   · Estas webs cambian sus páginas a menudo: si un día no encuentra una casilla, lo dice (y él la rellena a mano).
// Sin imports a propósito: la prueba de la ventana de verdad (desktop/host/chats_windows_test.go) carga este mismo archivo.

// la página de «subir producto» de cada una, y un trozo de su dirección para saber que ya estamos en ella (si pide entrar, se espera)
export const SUBIR = {
  vinted: { url: 'https://www.vinted.es/items/new', ruta: '/items/new', t: 'Vinted' },
  wallapop: { url: 'https://es.wallapop.com/app/catalog/upload', ruta: '/upload', t: 'Wallapop' },
  milanuncios: { url: 'https://www.milanuncios.com/publicar-anuncios-gratis/', ruta: 'publicar', t: 'Milanuncios' },
  facebook: { url: 'https://www.facebook.com/marketplace/create/item', ruta: '/marketplace/create', t: 'Facebook Marketplace' }
};
export const MAX_FOTOS = 6;

// el texto del anuncio: título corto y una descripción que vende (lo que ya hay en la ficha; nada inventado)
export function textoAnuncio(p, extra = {}) {
  const nombre = String(p.nombre || 'Pieza').trim();
  const L = [];
  if (p.descripcion) L.push(String(p.descripcion).trim());
  if (extra.medidas) L.push('📏 Medidas: ' + extra.medidas);
  const col = Array.isArray(extra.colores) ? extra.colores.join(' ') : String(extra.colores || '').trim(); // (colores() da una lista de muestras)
  if (col) L.push('🎨 Colores: ' + col);
  if (p.material) L.push('🧵 Material: ' + p.material);
  L.push('✨ Diseño de CelebriDiseños, hecho por nosotros en impresión 3D.');
  L.push('📦 Lo preparo y lo envío bien protegido. ¿Lo quieres en otro color o tamaño? Pregúntame.');
  if (extra.enlace) L.push('🔗 Más fotos y todo el catálogo: ' + extra.enlace);
  return { titulo: nombre.slice(0, 80), descripcion: L.join('\n\n'), precio: Number(extra.precio) > 0 ? Math.round(Number(extra.precio) * 100) / 100 : 0 };
}

// una foto para el anuncio: JPEG de 1600 px como mucho (ninguna web quiere fotos de 8 MB)
export async function fotoParaAnuncio(url, lado = 1600) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('no cargó la foto')); i.src = url; });
  const k = Math.min(1, lado / Math.max(img.naturalWidth || lado, img.naturalHeight || lado));
  const cv = document.createElement('canvas'); cv.width = Math.round((img.naturalWidth || lado) * k); cv.height = Math.round((img.naturalHeight || lado) * k);
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.9);
}

// El guion que se ejecuta DENTRO de la página de la plataforma: espera a que salga el formulario (hasta 40 s), rellena lo que encuentre y
// avisa con postMessage('subir:…'). No pulsa ningún botón de publicar. Si no estamos en la página de subir (p. ej. le pide entrar), espera.
export function guionRellenar(datos, ruta) {
  const D = JSON.stringify({ titulo: datos.titulo || '', descripcion: datos.descripcion || '', precio: Number(datos.precio) || 0, fotos: (datos.fotos || []).slice(0, MAX_FOTOS), ruta: ruta || '' });
  return '(' + rellenar.toString() + ')(' + D + ');';
}

// (se convierte a texto: sin nada de fuera de la función)
function rellenar(D) {
  var dice = function (m) { try { window.chrome.webview.postMessage('subir:' + m); } catch (e) { } try { window.__subirUltimo = m; } catch (e) { } };
  if (D.ruta && location.href.indexOf(D.ruta) < 0) return dice('espera');
  if (window.__subirHecho) return;
  var t0 = Date.now();
  var visible = function (e) { return e && (e.offsetParent !== null || e.type === 'file') && !e.disabled && !e.readOnly; };
  var textoDe = function (e) {
    var l = (e.labels && e.labels[0] && e.labels[0].textContent) || '', id = e.getAttribute('aria-labelledby'), ll = id && document.getElementById(id);
    return [e.name, e.id, e.placeholder, e.getAttribute('aria-label'), e.getAttribute('data-testid'), l, ll ? ll.textContent : ''].join(' ');
  };
  var busca = function (sel, rx) { var L = Array.prototype.filter.call(document.querySelectorAll(sel), visible); for (var i = 0; i < L.length; i++) if (rx.test(textoDe(L[i]))) return L[i]; return null; };
  // escribir «como una persona»: las webs hechas con React solo se enteran si el valor entra por su camino
  var pon = function (e, v) {
    e.focus();
    if (e.isContentEditable) { document.execCommand('selectAll', false, null); document.execCommand('insertText', false, v); }
    else {
      var proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, set = Object.getOwnPropertyDescriptor(proto, 'value').set;
      set.call(e, v);
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
    }
    e.dispatchEvent(new Event('blur', { bubbles: true }));
  };
  var fotos = function () {
    if (!D.fotos.length) return 0;
    var L = Array.prototype.filter.call(document.querySelectorAll('input[type=file]'), function (e) { return !e.disabled && (!e.accept || /image|jpe?g|png/i.test(e.accept)); });
    if (!L.length) return 0;
    var dt = new DataTransfer();
    D.fotos.forEach(function (f, k) {
      var b = atob(String(f).split(',')[1] || ''), u = new Uint8Array(b.length);
      for (var j = 0; j < b.length; j++) u[j] = b.charCodeAt(j);
      dt.items.add(new File([u], 'foto' + (k + 1) + '.jpg', { type: 'image/jpeg' }));
    });
    var i = L[0];
    if (!i.multiple && dt.files.length > 1) { var d1 = new DataTransfer(); d1.items.add(dt.files[0]); i.files = d1.files; } else i.files = dt.files;
    i.dispatchEvent(new Event('input', { bubbles: true }));
    i.dispatchEvent(new Event('change', { bubbles: true }));
    return i.files.length;
  };
  (function intenta() {
    var ti = busca('input:not([type=hidden]):not([type=file]):not([type=search])', /t[ií]tulo|title|nombre del (art[ií]culo|producto)|qu[eé] (vendes|est[aá]s vendiendo)/i);
    var de = busca('textarea,[contenteditable=true],[role=textbox]', /descrip|description|cu[eé]ntanos|detalles/i);
    var pr = busca('input:not([type=hidden]):not([type=file])', /precio|price|€/i);
    if (!ti && !de && !pr) { if (Date.now() - t0 < 40000) return setTimeout(intenta, 800); return dice('nada'); }
    window.__subirHecho = true;
    var hecho = [];
    var nf = 0; try { nf = fotos(); } catch (e) { }
    if (nf) hecho.push(nf + (nf === 1 ? ' foto' : ' fotos'));
    if (ti) { pon(ti, D.titulo); hecho.push('título'); }
    if (de) { pon(de, D.descripcion); hecho.push('descripción'); }
    if (pr && D.precio > 0) { pon(pr, pr.type === 'number' ? String(D.precio) : String(D.precio).replace('.', ',')); hecho.push('precio'); }
    var falta = []; if (!nf && D.fotos.length) falta.push('fotos'); if (!ti) falta.push('título'); if (!de) falta.push('descripción'); if (!pr && D.precio > 0) falta.push('precio');
    dice('ok:' + hecho.join(',') + (falta.length ? '|falta:' + falta.join(',') : ''));
  })();
}

// 💤 IDEA (04-11-2026): «RESUCITAR LOS DORMIDOS». Lo que subes queda apuntado (en este ordenador): dónde y qué día. Los que llevan
// 3 semanas o más subidos se marcan 💤 para volver a subirlos con la foto que mejor salga primero: estas webs suelen enseñar más lo
// recién subido. (Antes de volver a subir, borra el anuncio viejo: dos iguales a la vez no.)
const CLAVE = 'cd.subidos';
export const DIAS_DORMIDO = 21;
export function subidos() { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { return {}; } }
export function apuntaSubido(id, sitio, fecha) {
  const S = subidos(); S[id] = S[id] || {}; S[id][sitio] = fecha || new Date().toISOString().slice(0, 10);
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) { }
  return S;
}
// días desde que se subió a ese sitio (null = nunca)
export function diasSubido(id, sitio, hoy) {
  const f = (subidos()[id] || {})[sitio];
  if (!f) return null;
  const a = Date.parse(f + 'T12:00:00'), b = Date.parse((hoy || new Date().toISOString().slice(0, 10)) + 'T12:00:00');
  return isFinite(a) && isFinite(b) ? Math.max(0, Math.round((b - a) / 86400000)) : null;
}
export const dormido = (id, sitio, hoy) => { const d = diasSubido(id, sitio, hoy); return d !== null && d >= DIAS_DORMIDO; };
