// CelebriFábrica · LECTOR CON CÁMARA del lanzador (iPhone, Android y PC) · © CelebriDiseños (18-11-2026)
// Él: «me encanta el lector de cámara pero que funcione, sí o sí». Dentro del marco de Google el iPhone no tiene lector de QR
// (BarcodeDetector) y la cámara puede estar bloqueada. Aquí arriba (la página del icono) sí hay permiso de cámara: la abrimos aquí,
// leemos el QR con jsQR (JavaScript puro, va en todos los navegadores) y mandamos el texto a CelebriFábrica (postMessage).
// Sin datos ni llaves: solo el texto del QR, y solo hacia dentro de la página de CelebriFábrica.
(function () {
  'use strict'
  var JSQR = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
  var DE_GOOGLE = /^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|google\.com)$|^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/
  var F = document.getElementById('cf')

  // A todos los marcos de dentro: Google mete la página de CelebriFábrica 2 marcos más abajo.
  function aTodos(msg, w, n) {
    w = w || (F && F.contentWindow); n = n || 0; if (!w || n > 4) return
    try { w.postMessage(msg, '*') } catch (e) { }
    try { for (var i = 0; i < w.frames.length; i++) aTodos(msg, w.frames[i], n + 1) } catch (e) { }
  }
  // «Aquí hay lanzador con cámara»: se repite porque los marcos de Google cargan tarde (y al volver a entrar con el PIN).
  setInterval(function () { aTodos({ cfLanzador: 2 }) }, 1500)
  if (F) F.addEventListener('load', function () { setTimeout(function () { aTodos({ cfLanzador: 2 }) }, 300) })

  // ---- la ventana de la cámara (encima de todo)
  var css = document.createElement('style')
  css.textContent =
    '#lc{position:fixed;inset:0;z-index:50;background:#000;display:none;color:#fff;font-family:-apple-system,"Segoe UI",system-ui,sans-serif}' +
    '#lc.on{display:block}#lc video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
    '#lc .marco{position:absolute;left:50%;top:46%;width:min(70vw,70vh,340px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:28px;' +
    'box-shadow:0 0 0 200vmax rgba(0,0,0,.45);border:4px solid #ef4444;transition:border-color .15s,box-shadow .15s}' +
    '#lc.vio .marco{border-color:#22c55e;box-shadow:0 0 0 200vmax rgba(34,197,94,.35)}' +
    '#lc .arriba{position:absolute;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top) + 14px) 18px 14px;display:flex;align-items:center;gap:10px;' +
    'background:linear-gradient(#000c,#0000)}#lc .arriba b{font-size:19px;flex:1}#lc .arriba b i{font-style:normal;color:#ef4444}' +
    '#lc button{font-family:inherit;font-size:17px;font-weight:600;line-height:1;color:#fff;background:#ffffff26;border:1px solid #ffffff55;border-radius:999px;padding:12px 18px}' +
    '#lc .abajo{position:absolute;left:0;right:0;bottom:0;padding:18px 18px calc(env(safe-area-inset-bottom) + 22px);text-align:center;' +
    'background:linear-gradient(#0000,#000c)}#lc .txt{font-size:20px;font-weight:700}#lc .peq{margin-top:6px;font-size:14px;color:#ffffffb0}'
  document.head.appendChild(css)
  var lc = document.createElement('div'); lc.id = 'lc'
  lc.innerHTML = '<video playsinline muted autoplay></video><div class="marco"></div>' +
    '<div class="arriba"><b><i>Celebri</i>Fábrica · cámara</b><button type="button">✕ Cerrar</button></div>' +
    '<div class="abajo"><div class="txt">Enseña el QR del pedido</div><div class="peq">Dentro del cuadro, a un palmo</div></div>'
  document.body.appendChild(lc)
  var V = lc.querySelector('video'), TXT = lc.querySelector('.txt'), PEQ = lc.querySelector('.peq')
  lc.querySelector('button').addEventListener('click', function () { cierra() })

  var C = { on: false, stream: null, t: 0, ult: '', ultT: 0, lienzo: document.createElement('canvas'), ctx: null }
  function pon(t, p) { TXT.textContent = t; PEQ.textContent = p || '' }
  function cargaJsQR() {
    return new Promise(function (ok, mal) {
      if (window.jsQR) return ok()
      var s = document.createElement('script'); s.src = JSQR; s.onload = function () { window.jsQR ? ok() : mal() }; s.onerror = mal
      document.head.appendChild(s)
    })
  }
  function abre() {
    if (C.on) return
    lc.classList.add('on'); lc.classList.remove('vio'); pon('Abriendo la cámara…')
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { pon('Este navegador no deja usar la cámara.', 'Ábrelo en Safari (iPhone) o Chrome.'); return }
    cargaJsQR().then(function () {
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
    }).then(function (s) {
      C.stream = s; V.srcObject = s; C.on = true
      var p = V.play(); if (p && p.catch) p.catch(function () { })
      pon('Enseña el QR del pedido', 'Dentro del cuadro, a un palmo'); vuelta()
    }).catch(function (e) {
      if (!window.jsQR) pon('No se ha podido cargar el lector.', '¿Hay internet? Cierra y vuelve a tocar 📷.')
      else if (e && e.name === 'NotAllowedError') pon('Has dicho que no a la cámara.', 'iPhone: Ajustes → Safari → Cámara → Permitir. Luego vuelve a tocar 📷.')
      else pon('No encuentro la cámara.', '¿La está usando otra app?')
    })
  }
  function cierra(silencio) {
    clearTimeout(C.t); C.on = false
    try { if (C.stream) C.stream.getTracks().forEach(function (t) { t.stop() }) } catch (e) { }
    C.stream = null; V.srcObject = null; lc.classList.remove('on')
    if (!silencio) aTodos({ cfCam: 'cerrada' })
  }
  function vuelta() {
    if (!C.on) return
    if (V.readyState >= 2 && V.videoWidth && !document.hidden) {
      var k = Math.min(1, 640 / Math.max(V.videoWidth, V.videoHeight)), w = Math.round(V.videoWidth * k), h = Math.round(V.videoHeight * k)
      if (C.lienzo.width !== w) { C.lienzo.width = w; C.lienzo.height = h; C.ctx = C.lienzo.getContext('2d', { willReadFrequently: true }) }
      try {
        C.ctx.drawImage(V, 0, 0, w, h)
        var r = window.jsQR(C.ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
        if (r && r.data) return leido(r.data)
      } catch (e) { }
    }
    C.t = setTimeout(vuelta, 110)
  }
  function leido(txt) {
    var ahora = Date.now()
    if (txt === C.ult && ahora - C.ultT < 2500) { C.ultT = ahora; C.t = setTimeout(vuelta, 110); return }   // el mismo, aún delante
    C.ult = txt; C.ultT = ahora
    try { if (navigator.vibrate) navigator.vibrate(80) } catch (e) { }
    lc.classList.add('vio'); pon('✓ Leído')
    aTodos({ cfQR: String(txt).slice(0, 400) })
    setTimeout(function () { cierra(true) }, 500)
  }
  window.addEventListener('message', function (e) {
    if (!DE_GOOGLE.test(e.origin)) return
    var d = e.data || {}
    if (d.cfCam === 'abre') abre()
    else if (d.cfCam === 'cierra') cierra()
  })
  document.addEventListener('visibilitychange', function () { if (document.hidden && C.on) cierra() })
  window.cfCamara = { abre: abre, cierra: cierra, leido: leido }   // para probar
})()
