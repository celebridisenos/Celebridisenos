// ================= v30 · 🎁 LAS DOS SORPRESAS DE LA 30 =================
// 1) 📸 ESCAPARATE: tu pieza como en una foto de estudio (fondo infinito, luces suaves y su sombra) para anunciarla en Vinted,
//    Wallapop o Instagram ANTES de imprimirla: foto vertical 1080 × 1350 o cuadrada 1080 × 1080, y un vídeo de 8 s girando
//    (mp4 si el aparato sabe; si no, webm). Con su nombre y su precio si quieres, y la firma «CelebriDiseños» discreta.
// 2) 🎬 IMPRESIÓN FANTASMA: ves cómo se va a imprimir, capa a capa: la boquilla al rojo recorre cada capa, el corte recién
//    hecho brilla, lo que falta se ve como un holograma, y el tiempo y los gramos (ESTIMADOS: los exactos te los da Bambu Studio).
// Todo en este aparato (three.js, MIT, ya viene con CelebriR8). partes = [{ vista: N.aVista(m), color, acabado, nombre }]
import { h, mount, btn, toast, modal } from '../ui.js';
import * as T from '../../vendor/three/three_r8.js';
import { ACABADOS, COLORES } from './escena3d.js';

const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
const nombreArchivo = t => String(t || 'pieza').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(0, 50);
function geometria(v) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(v.pos, 3)); g.setAttribute('normal', new T.BufferAttribute(v.nor, 3)); g.setIndex(new T.BufferAttribute(v.idx, 1)); g.computeBoundingBox(); g.computeBoundingSphere(); return g; }
function material(color, acabado) { const A = ACABADOS[acabado] || ACABADOS.mate; return new T.MeshPhysicalMaterial({ color: new T.Color(color || '#9b8cff'), roughness: A.r, metalness: A.m, clearcoat: A.cc || 0, clearcoatRoughness: 0.25, transparent: !!A.op, opacity: A.op || 1 }); }
// volumen y superficie de una vista (para los gramos)
function medidas(partes) {
  let V = 0, S = 0; const b = new T.Box3();
  partes.forEach(p => { const X = p.vista.pos, I = p.vista.idx; for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, c = I[t + 1] * 3, d = I[t + 2] * 3; const ax = X[a], ay = X[a + 1], az = X[a + 2], bx = X[c], by = X[c + 1], bz = X[c + 2], cx = X[d], cy = X[d + 1], cz = X[d + 2];
    V += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az; S += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2; }
    for (let i = 0; i < X.length; i += 3) b.expandByPoint(new T.Vector3(X[i], X[i + 1], X[i + 2])); });
  return { vol: Math.abs(V), area: S, caja: b };
}
// las piezas juntas, centradas y apoyadas en z = 0
function grupoDe(partes, mat) {
  const g = new T.Group(); partes.forEach(p => { const m = new T.Mesh(geometria(p.vista), mat ? mat(p) : material(p.color, p.acabado)); m.castShadow = true; m.receiveShadow = true; g.add(m); });
  const b = new T.Box3().setFromObject(g), c = b.getCenter(new T.Vector3()); g.children.forEach(m => m.position.set(-c.x, -c.y, -b.min.z)); return g;
}
const tiposVideo = () => ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].filter(x => window.MediaRecorder && MediaRecorder.isTypeSupported(x));
function baja(blob, nombre) { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); }

// ======================= 1) 📸 ESCAPARATE =======================
const FONDOS = { blanco: ['Blanco de estudio', '#ffffff', '#d9dbe0'], crema: ['Crema', '#f6efe3', '#dccbb0'], rosa: ['Rosa palo', '#fde8ef', '#e9b8c8'], cielo: ['Azul cielo', '#e6f4ff', '#a9d2f2'], negro: ['Negro elegante', '#2a2a30', '#050507'], oro: ['Oro y coral (la 30)', '#3a2a14', '#0c0806'] };
export function escaparate(partes, o = {}) {
  if (!partes || !partes.length) return toast('No hay nada que fotografiar todavía.', 'warn');
  const lienzo = h('canvas.sp-cv', { 'aria-label': 'Tu pieza en el escaparate' }), estado = h('small.muted.sp-estado', '');
  const E = { fondo: 'blanco', color: partes.length === 1 ? partes[0].color : null, acabado: partes[0].acabado || 'mate', luz: 'suave', gira: true, nombre: o.nombre || '', precio: '', firma: true };
  const cuerpo = h('div.sp', h('div.sp-vista', lienzo, h('div.sp-pie', estado)), h('div.sp-lado'));
  const M = modal('📸 Escaparate · tu pieza lista para anunciar', cuerpo, close => [btn('Cerrar', close, { cls: 'ghost' })], { size: 'wide', onclose: () => apaga() });
  const ren = new T.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true }); ren.setPixelRatio(Math.min(2, devicePixelRatio || 1)); ren.outputColorSpace = T.SRGBColorSpace; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.05; ren.shadowMap.enabled = true;
  const esc = new T.Scene(), pm = new T.PMREMGenerator(ren); esc.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose();
  const cam = new T.PerspectiveCamera(30, 1, 1, 10000); cam.up.set(0, 0, 1);
  const ctl = new T.OrbitControls(cam, lienzo); ctl.enableDamping = true; ctl.dampingFactor = 0.1;
  const suelo = new T.Mesh(new T.PlaneGeometry(4000, 4000), new T.ShadowMaterial({ opacity: 0.22 })); suelo.receiveShadow = true; esc.add(suelo);
  const sol = new T.DirectionalLight(0xffffff, 2.2); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 6; sol.shadow.bias = -0.0005; esc.add(sol, sol.target);
  const relleno = new T.DirectionalLight(0xdfe8ff, 0.6), contra = new T.DirectionalLight(0xffffff, 1.1); esc.add(relleno, contra);
  let grupo = null, R = 50, raf = 0, vivo = true, ang = 0, t0 = performance.now(), grabando = false;
  function ponPieza() {
    if (grupo) { esc.remove(grupo); grupo.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); }
    grupo = grupoDe(partes, p => material(E.color || p.color, E.acabado || p.acabado)); esc.add(grupo);
    const b = new T.Box3().setFromObject(grupo), s = b.getBoundingSphere(new T.Sphere()); R = Math.max(5, s.radius);
    const d = R / Math.sin(T.MathUtils.degToRad(15)) * 1.05; cam.position.set(-d * 0.42, -d * 0.82, s.center.z + d * 0.36); ctl.target.copy(s.center); cam.near = d / 50; cam.far = d * 20; cam.updateProjectionMatrix();
    Object.assign(sol.shadow.camera, { left: -R * 2, right: R * 2, top: R * 2, bottom: -R * 2, near: 1, far: R * 12 }); sol.shadow.camera.updateProjectionMatrix();
    luces();
  }
  function luces() { const k = E.luz === 'dramatica'; sol.position.set(-R * 2.2, -R * 1.6, R * (k ? 2.2 : 4)); sol.intensity = k ? 3.2 : 2.2; relleno.position.set(R * 3, -R, R); relleno.intensity = k ? 0.15 : 0.6; contra.position.set(R, R * 3, R * 2); contra.intensity = k ? 1.8 : 0.9; suelo.material.opacity = k ? 0.35 : 0.2; }
  function fondo() { const [, a, b] = FONDOS[E.fondo] || FONDOS.blanco, c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; if (esc.background && esc.background.dispose) esc.background.dispose(); esc.background = t; }
  function tam() { const w = lienzo.clientWidth || 600, hh = lienzo.clientHeight || 600; if (!grabando && (lienzo.width !== Math.round(w * ren.getPixelRatio()) || lienzo.height !== Math.round(hh * ren.getPixelRatio()))) { ren.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); } }
  function dibuja() { if (!vivo) return; tam(); const t = performance.now(); if (E.gira && grupo) { ang += (t - t0) / 1000 * 0.35; grupo.rotation.z = ang; } t0 = t; ctl.update(); ren.render(esc, cam); raf = requestAnimationFrame(dibuja); }
  function apaga() { vivo = false; cancelAnimationFrame(raf); try { ctl.dispose(); grupo && grupo.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); ren.dispose(); ren.forceContextLoss(); } catch (e) { } }
  // la foto: se dibuja a su tamaño de verdad y se le pone el texto (nombre, precio y la firma)
  function rotulo(g, W, H) {
    const s = W / 1080, oscuro = ['negro', 'oro'].includes(E.fondo), tinta = oscuro ? '#fff' : '#1b1a17';
    if (E.nombre || E.precio) { g.fillStyle = oscuro ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.72)'; const y = H - 150 * s; g.fillRect(0, y, W, 150 * s);
      g.fillStyle = tinta; g.font = '700 ' + Math.round(48 * s) + 'px "Segoe UI Variable Display", "Segoe UI", sans-serif'; g.textBaseline = 'middle'; g.fillText(E.nombre || '', 48 * s, y + 75 * s, W - 380 * s);
      if (E.precio) { const p = String(E.precio).replace('.', ',') + (/€/.test(E.precio) ? '' : ' €'); g.font = '800 ' + Math.round(60 * s) + 'px "Segoe UI Variable Display", "Segoe UI", sans-serif'; g.textAlign = 'right'; g.fillStyle = oscuro ? '#f2c14e' : '#c2410c'; g.fillText(p, W - 48 * s, y + 75 * s); g.textAlign = 'left'; } }
    if (E.firma) { g.font = '600 ' + Math.round(22 * s) + 'px "Segoe UI Variable Display", "Segoe UI", sans-serif'; g.fillStyle = oscuro ? 'rgba(255,255,255,.55)' : 'rgba(27,26,23,.45)'; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText('© CelebriDiseños', W - 30 * s, 26 * s); g.textAlign = 'left'; }
  }
  function foto(W, H) {
    grabando = true; const gira = E.gira; E.gira = false; const aspect = cam.aspect; ren.setPixelRatio(1); ren.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); ren.render(esc, cam);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(lienzo, 0, 0, W, H); rotulo(g, W, H);
    ren.setPixelRatio(Math.min(2, devicePixelRatio || 1)); cam.aspect = aspect; grabando = false; E.gira = gira; tam();
    return c;
  }
  async function guardaFoto(W, H) { const c = foto(W, H); const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92)); baja(blob, nombreArchivo((E.nombre || o.nombre || 'pieza') + '_' + W + 'x' + H) + '.jpg'); window.__escaparate = Object.assign(window.__escaparate || {}, { foto: { W, H, bytes: blob.size } }); toast('📷 Foto ' + W + ' × ' + H + ' guardada en Descargas', 'ok'); }
  async function video() {
    const L = tiposVideo(); if (!L.length) return toast('Este aparato no sabe grabar vídeo.', 'warn');
    const W = 1080, H = 1080, seg = o.segundos || 8, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    grabando = true; const gira = E.gira; E.gira = false; const aspect = cam.aspect; ren.setPixelRatio(1); ren.setSize(W, H, false); cam.aspect = 1; cam.updateProjectionMatrix();
    const st = c.captureStream(30), rec = new MediaRecorder(st, { mimeType: L[0], videoBitsPerSecond: 8e6 }), trozos = []; rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); };
    const fin = new Promise(r => { rec.onstop = r; }); rec.start(250); const a0 = grupo.rotation.z, ini = performance.now(); estado.textContent = '🎥 Grabando 0 / ' + seg + ' s…';
    await new Promise(res => { const paso = () => { const t = (performance.now() - ini) / 1000; grupo.rotation.z = a0 + Math.min(1, t / seg) * Math.PI * 2; ren.render(esc, cam); g.drawImage(lienzo, 0, 0, W, H); rotulo(g, W, H); estado.textContent = '🎥 Grabando ' + Math.min(seg, Math.floor(t)) + ' / ' + seg + ' s…'; if (t < seg && vivo) requestAnimationFrame(paso); else res(); }; requestAnimationFrame(paso); });
    rec.stop(); await fin; ren.setPixelRatio(Math.min(2, devicePixelRatio || 1)); cam.aspect = aspect; grabando = false; E.gira = gira; tam();
    const ext = /mp4/.test(L[0]) ? 'mp4' : 'webm', blob = new Blob(trozos, { type: ext === 'mp4' ? 'video/mp4' : 'video/webm' }); baja(blob, nombreArchivo((E.nombre || o.nombre || 'pieza') + '_360') + '.' + ext);
    estado.textContent = '✅ Vídeo de ' + seg + ' s (' + ext + ', ' + n1(blob.size / 1048576) + ' MB) en Descargas'; window.__escaparate = Object.assign(window.__escaparate || {}, { video: { ext, bytes: blob.size } }); toast('🎥 Vídeo 360° guardado (' + ext + ')', 'ok');
  }
  const lado = cuerpo.querySelector('.sp-lado');
  function pintaLado() {
    mount(lado, [
      h('p.small', 'Anúnciala ANTES de imprimirla: así se ve con buena luz. Mueve la vista con el ratón o el dedo.'),
      h('b.sp-h', 'Fondo'), h('div.sp-fondos', Object.entries(FONDOS).map(([k, [t, a, b]]) => h('button' + (E.fondo === k ? '.on' : ''), { type: 'button', title: t, 'data-fondo': k, style: { background: 'linear-gradient(' + a + ',' + b + ')' }, onclick: () => { E.fondo = k; fondo(); pintaLado(); } }))),
      h('b.sp-h', 'Color de la pieza'), h('div.r8e-paleta', COLORES.map(([c, t]) => h('button' + ((E.color || '') === c ? '.on' : ''), { type: 'button', title: t, style: { background: c }, onclick: () => { E.color = c; ponPieza(); pintaLado(); } }))),
      h('div.sp-fila', h('select.inp', { 'aria-label': 'Acabado', onchange: e => { E.acabado = e.target.value; ponPieza(); } }, Object.entries(ACABADOS).map(([a, x]) => h('option', { value: a, selected: a === E.acabado }, x.t))),
        h('select.inp', { 'aria-label': 'Luz', onchange: e => { E.luz = e.target.value; luces(); } }, h('option', { value: 'suave', selected: E.luz === 'suave' }, '💡 Luz suave'), h('option', { value: 'dramatica', selected: E.luz === 'dramatica' }, '🎭 Luz dramática'))),
      h('label.check.small', h('input', { type: 'checkbox', checked: E.gira, onchange: e => { E.gira = e.target.checked; } }), 'Que gire sola'),
      h('b.sp-h', 'Texto (opcional)'), h('input.inp', { placeholder: 'Nombre (p. ej. Joyero con bisagra)', value: E.nombre, oninput: e => { E.nombre = e.target.value; } }), h('input.inp', { placeholder: 'Precio (p. ej. 12,90)', value: E.precio, oninput: e => { E.precio = e.target.value; } }),
      h('label.check.small', h('input', { type: 'checkbox', checked: E.firma, onchange: e => { E.firma = e.target.checked; } }), 'Firma discreta «© CelebriDiseños»'),
      h('b.sp-h', 'Guardar'), h('div.sp-botones', btn('📷 Foto vertical (Vinted · Wallapop)', () => guardaFoto(1080, 1350), { cls: 'primary sp-foto' }), btn('📷 Foto cuadrada (Instagram)', () => guardaFoto(1080, 1080), { cls: 'sp-cuadrada' }), btn('🎥 Vídeo 360° (8 s)', video, { cls: 'sp-video' })),
      h('small.muted', 'Es la pieza diseñada, no una foto de la impresa: el color es APROXIMADO. Para la venta, usa también una foto real.')]);
  }
  fondo(); ponPieza(); pintaLado(); dibuja();
  window.__escaparate = { partes: partes.length, foto: null, video: null, guardaFoto, video, E };
  return M;
}

// ======================= 2) 🎬 IMPRESIÓN FANTASMA =======================
// el recorrido de la boquilla en cada capa: los puntos de la pieza a esa altura, ordenados alrededor del centro
function recorridos(partes, capas, alto, zMin) {
  const P = []; partes.forEach(p => { const X = p.vista.pos; for (let i = 0; i < X.length; i += 3) P.push([X[i], X[i + 1], X[i + 2] - zMin]); });
  const out = [];
  for (let k = 0; k < capas; k++) {
    const z = (k + 0.5) * alto / capas, tol = Math.max(alto / capas, 0.8), L = P.filter(q => Math.abs(q[2] - z) < tol);
    if (L.length < 3) { out.push(out.length ? out[out.length - 1] : [[0, 0]]); continue; }
    const cx = L.reduce((a, q) => a + q[0], 0) / L.length, cy = L.reduce((a, q) => a + q[1], 0) / L.length;
    const pasos = Math.min(48, L.length), orden = L.map(q => [Math.atan2(q[1] - cy, q[0] - cx), q[0], q[1]]).sort((a, b) => a[0] - b[0]), sal = [];
    for (let i = 0; i < pasos; i++) { const q = orden[Math.floor(i * orden.length / pasos)]; sal.push([q[1], q[2]]); } out.push(sal);
  }
  return out;
}
export function fantasma(partes, o = {}) {
  if (!partes || !partes.length) return toast('No hay nada que imprimir todavía.', 'warn');
  const lienzo = h('canvas.sp-cv', { 'aria-label': 'Así se imprimirá tu pieza' }), hud = h('div.sp-hud'), barra = h('div.sp-barra', h('i'));
  const cuerpo = h('div.sp.sp-fan', h('div.sp-vista', lienzo, hud, barra), h('div.sp-lado'));
  const M = modal('🎬 Impresión fantasma · así nacerá tu pieza', cuerpo, close => [btn('Cerrar', close, { cls: 'ghost' })], { size: 'wide', onclose: () => apaga() });
  const ren = new T.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true }); ren.setPixelRatio(Math.min(2, devicePixelRatio || 1)); ren.outputColorSpace = T.SRGBColorSpace; ren.toneMapping = T.ACESFilmicToneMapping; ren.localClippingEnabled = true;
  const esc = new T.Scene(); esc.background = new T.Color(0x05070d); esc.fog = new T.FogExp2(0x05070d, 0.0018);
  const pm = new T.PMREMGenerator(ren); esc.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose();
  esc.add(new T.HemisphereLight(0x9aa8ff, 0x10121c, 0.7)); const sol = new T.DirectionalLight(0xffffff, 1.4); sol.position.set(-80, -120, 200); esc.add(sol);
  const cam = new T.PerspectiveCamera(36, 1, 1, 10000); cam.up.set(0, 0, 1); const ctl = new T.OrbitControls(cam, lienzo); ctl.enableDamping = true;
  const med = medidas(partes), zMin = med.caja.min.z, alto = Math.max(0.2, med.caja.max.z - zMin), capa = o.capa || 0.16, N = Math.max(1, Math.ceil(alto / capa));
  // los gramos y el tiempo, ESTIMADOS (cáscara maciza + relleno al 15 %; tiempo medido con su Bambu: ~3,2 min por gramo + 2 de calentar)
  const gramos = (() => { const dens = 1.27, gros = 2 * 0.42 + 0.2, casc = Math.min(med.vol, med.area * gros); return (casc + Math.max(0, med.vol - casc) * 0.15) / 1000 * dens; })();
  const minutos = Math.round(2 + gramos * 3.2), tiempoTxt = m => (m >= 60 ? Math.floor(m / 60) + ' h ' : '') + (m % 60) + ' min';
  const tam = Math.max(med.caja.max.x - med.caja.min.x, med.caja.max.y - med.caja.min.y) * 1.6 + 40;
  const cama = new T.Mesh(new T.BoxGeometry(tam, tam, 2), new T.MeshStandardMaterial({ color: 0x151a2b, roughness: 0.5, metalness: 0.45 })); cama.position.z = -1; esc.add(cama);
  const rej = new T.GridHelper(tam, Math.round(tam / 10), 0x3b4470, 0x222842); rej.rotation.x = Math.PI / 2; rej.position.z = 0.05; esc.add(rej);
  // la pieza: lo impreso (con su color), el corte recién hecho (al rojo) y lo que falta (holograma)
  const corte = new T.Plane(new T.Vector3(0, 0, -1), 0), falta = new T.Plane(new T.Vector3(0, 0, 1), 0);
  const g = new T.Group(); esc.add(g); const geos = [];
  partes.forEach(p => { const gm = geometria(p.vista); geos.push(gm);
    const hecho = new T.Mesh(gm, Object.assign(material(o.color || p.color, p.acabado), { clippingPlanes: [corte] }));
    const rojo = new T.Mesh(gm, new T.MeshBasicMaterial({ color: 0xff7a1a, side: T.BackSide, clippingPlanes: [corte] }));
    const holo = new T.Mesh(gm, new T.MeshBasicMaterial({ color: 0x29d3ff, transparent: true, opacity: 0.1, depthWrite: false, clippingPlanes: [falta] }));
    const eg = new T.EdgesGeometry(gm, 30); geos.push(eg); const aris = new T.LineSegments(eg, new T.LineBasicMaterial({ color: 0x29d3ff, transparent: true, opacity: 0.45, clippingPlanes: [falta] }));
    [hecho, rojo, holo, aris].forEach(m => { m.position.z = -zMin; g.add(m); }); });
  const cx = (med.caja.min.x + med.caja.max.x) / 2, cy = (med.caja.min.y + med.caja.max.y) / 2; g.position.set(-cx, -cy, 0);
  // la boquilla
  const boq = new T.Group(); const cono = new T.Mesh(new T.ConeGeometry(2.2, 4, 24), new T.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.25 })); cono.rotation.x = -Math.PI / 2; cono.position.z = 2.4; boq.add(cono);
  const bloque = new T.Mesh(new T.BoxGeometry(7, 7, 4.5), new T.MeshStandardMaterial({ color: 0x8a95b8, metalness: 0.85, roughness: 0.3, emissive: 0x3a0d06 })); bloque.position.z = 6.6; boq.add(bloque);
  const punta = new T.Mesh(new T.SphereGeometry(0.8, 16, 12), new T.MeshBasicMaterial({ color: 0xfff1c4 })); punta.position.z = 0.4; boq.add(punta);
  const luz = new T.PointLight(0xffb36b, 900, 80, 2); luz.position.z = 1; boq.add(luz); esc.add(boq);
  const R = Math.max(20, med.caja.getBoundingSphere(new T.Sphere()).radius), d = R / Math.sin(T.MathUtils.degToRad(16)) * 1.1;
  cam.position.set(-d * 0.55, -d * 0.75, alto * 0.5 + d * 0.45); ctl.target.set(0, 0, alto * 0.4); cam.near = d / 60; cam.far = d * 20; cam.updateProjectionMatrix();
  const RUTAS = recorridos(partes, Math.min(N, 220), alto, zMin).map(L => L.map(([x, y]) => [x - cx, y - cy]));
  let k = 0, vivo = true, raf = 0, pausa = false, vel = 1, ult = performance.now(), dur = o.segundos || 16;
  const lado = cuerpo.querySelector('.sp-lado');
  mount(lado, [
    h('p.small', 'Así la imprimirá tu Bambu, capa a capa (capas de ' + capa.toLocaleString('es-ES') + ' mm, como tu perfil PRECISION). Lo azul es lo que falta; el borde naranja, la capa recién hecha.'),
    h('div.sp-datos', h('div', h('small', 'Capas'), h('b', N.toLocaleString('es-ES'))), h('div', h('small', 'Gramos'), h('b', '≈ ' + n1(gramos) + ' g')), h('div', h('small', 'Tiempo'), h('b', '≈ ' + tiempoTxt(minutos))), h('div', h('small', 'Alto'), h('b', n1(alto) + ' mm'))),
    h('small.muted', 'ESTIMADO (± 40 %), en PETG con relleno del 15 %: los exactos te los da Bambu Studio al laminar.'),
    h('div.sp-botones', btn('⏯ Pausa / seguir', () => { pausa = !pausa; }, { cls: 'sp-pausa' }), btn('⏩ Más rápido', () => { vel = vel >= 4 ? 1 : vel * 2; toast('Velocidad ×' + vel, 'info', 1500); }, { cls: 'ghost' }), btn('↺ Otra vez', () => { k = 0; pausa = false; }, { cls: 'ghost sp-otra' }), btn('🎥 Grabar el vídeo', grabar, { cls: 'primary sp-grabar' })),
    h('small.muted', 'El vídeo (vertical, para Reels o TikTok) se guarda en Descargas.')]);
  function pon(f) { // f: 0..1 de la pieza impresa
    const z = f * alto; corte.constant = z + 0.001; falta.constant = -z;
    const i = Math.min(RUTAS.length - 1, Math.floor(f * RUTAS.length)), L = RUTAS[Math.max(0, i)] || [[0, 0]], dentro = (f * RUTAS.length) % 1, q = L[Math.min(L.length - 1, Math.floor(dentro * L.length))] || [0, 0];
    boq.position.set(q[0], q[1], z + 0.2); luz.intensity = f < 1 ? 700 + Math.random() * 400 : 0; boq.visible = f < 1;
    const capaAhora = Math.min(N, Math.max(1, Math.ceil(f * N)));
    hud.textContent = f < 1 ? 'Capa ' + capaAhora.toLocaleString('es-ES') + ' de ' + N.toLocaleString('es-ES') + ' · quedan ≈ ' + tiempoTxt(Math.max(0, Math.round(minutos * (1 - f)))) : '✨ ¡Impresa! ≈ ' + tiempoTxt(minutos) + ' · ≈ ' + n1(gramos) + ' g';
    barra.firstChild.style.width = (f * 100).toFixed(1) + '%';
  }
  function tamCv() { const w = lienzo.clientWidth || 600, hh = lienzo.clientHeight || 600; if (!grabandoV && (lienzo.width !== Math.round(w * ren.getPixelRatio()) || lienzo.height !== Math.round(hh * ren.getPixelRatio()))) { ren.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); } }
  let grabandoV = false;
  function dibuja() { if (!vivo) return; tamCv(); const t = performance.now(), dt = (t - ult) / 1000; ult = t; if (!pausa && k < 1.15) k += dt / dur * vel; pon(Math.min(1, k)); ctl.update(); ren.render(esc, cam); window.__fantasma.f = Math.min(1, k); raf = requestAnimationFrame(dibuja); }
  function apaga() { vivo = false; cancelAnimationFrame(raf); try { ctl.dispose(); g.traverse(x => { if (x.material) x.material.dispose(); }); geos.forEach(x => x.dispose()); ren.dispose(); ren.forceContextLoss(); } catch (e) { } }
  async function grabar() {
    const L = tiposVideo(); if (!L.length) return toast('Este aparato no sabe grabar vídeo.', 'warn');
    const W = 1080, H = 1920, seg = 12, c = document.createElement('canvas'); c.width = W; c.height = H; const gg = c.getContext('2d');
    grabandoV = true; ren.setPixelRatio(1); ren.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); const k0 = k, v0 = vel; pausa = true;
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: L[0], videoBitsPerSecond: 8e6 }), trozos = []; rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); }; const fin = new Promise(r => { rec.onstop = r; }); rec.start(250);
    const ini = performance.now();
    await new Promise(res => { const paso = () => { const t = (performance.now() - ini) / 1000, f = Math.min(1, t / (seg - 1.5)); pon(f); ren.render(esc, cam); gg.drawImage(lienzo, 0, 0, W, H);
      gg.fillStyle = 'rgba(5,7,13,.55)'; gg.fillRect(0, H - 220, W, 220); gg.fillStyle = '#fff'; gg.font = '700 46px "Segoe UI Variable Display", "Segoe UI", sans-serif'; gg.fillText(hud.textContent, 50, H - 130); gg.fillStyle = '#f2c14e'; gg.fillRect(50, H - 80, (W - 100) * f, 10); gg.font = '600 28px "Segoe UI", sans-serif'; gg.fillStyle = 'rgba(255,255,255,.6)'; gg.textAlign = 'right'; gg.fillText('© CelebriDiseños', W - 40, 70); gg.textAlign = 'left';
      if (t < seg && vivo) requestAnimationFrame(paso); else res(); }; requestAnimationFrame(paso); });
    rec.stop(); await fin; grabandoV = false; ren.setPixelRatio(Math.min(2, devicePixelRatio || 1)); tamCv(); k = k0; vel = v0; pausa = false;
    const ext = /mp4/.test(L[0]) ? 'mp4' : 'webm', blob = new Blob(trozos, { type: ext === 'mp4' ? 'video/mp4' : 'video/webm' }); baja(blob, nombreArchivo((o.nombre || 'pieza') + '_imprimiendose') + '.' + ext);
    window.__fantasma.video = { ext, bytes: blob.size }; toast('🎥 Vídeo «así se imprime» guardado (' + ext + ', ' + n1(blob.size / 1048576) + ' MB)', 'ok', 6000);
  }
  window.__fantasma = { N, gramos, minutos, alto, f: 0, grabar, video: null };
  dibuja();
  return M;
}
