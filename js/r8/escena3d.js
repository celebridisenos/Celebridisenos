// ================= v20 · 🧊 CelebriR8 · LA VISTA 3D DEL ESTUDIO =================
// Una vista como la de Fusion o Bambu Studio: la cama de la impresora con su cuadrícula, la pieza con su COLOR y su ACABADO
// (mate, seda, brillo, translúcido, arcoíris… y hasta las capas de impresión), las flechas para mover, girar y escalar,
// la regla para medir y el plano del corte. Hecha con three.js (MIT, vendor/three). Z hacia arriba, en milímetros.
import * as T from '../../vendor/three/three_r8.js';

export const ACABADOS = {
  mate: { t: 'Mate (PLA normal)', r: 0.72, m: 0 },
  seda: { t: 'Seda (brillo metálico)', r: 0.26, m: 0.62 },
  brillo: { t: 'Brillante (PETG)', r: 0.18, m: 0.05, cc: 0.7 },
  transl: { t: 'Translúcido', r: 0.2, m: 0, op: 0.62 },
  arcoiris: { t: 'Arcoíris (multicolor)', r: 0.3, m: 0.45, arco: 1 },
  marmol: { t: 'Mármol', r: 0.55, m: 0, marmol: 1 },
  madera: { t: 'Madera', r: 0.8, m: 0, madera: 1 }
};
// Colores de filamento (los de la gama básica que más se ven). El tono en pantalla es APROXIMADO.
export const COLORES = [
  ['#f4f4f2', 'Blanco'], ['#1b1b1d', 'Negro'], ['#8e9196', 'Gris'], ['#c8102e', 'Rojo'], ['#ff6a13', 'Naranja'], ['#f7d117', 'Amarillo'], ['#00ae42', 'Verde'], ['#7ed957', 'Verde manzana'],
  ['#0a2989', 'Azul'], ['#00a4e4', 'Azul cielo'], ['#41c3bd', 'Turquesa'], ['#5e43b7', 'Morado'], ['#c08ee8', 'Lila'], ['#f55a9b', 'Rosa'], ['#f9c6d9', 'Rosa palo'], ['#9d6d3f', 'Marrón'],
  ['#e9d8b4', 'Beige'], ['#c9a227', 'Dorado'], ['#b8bec4', 'Plata'], ['#b87333', 'Cobre']
];
const tono = hex => new T.Color(hex || '#9b8cff');

function material(color, acabado, capas) {
  const A = ACABADOS[acabado] || ACABADOS.mate;
  const M = new T.MeshPhysicalMaterial({ color: tono(color), roughness: A.r, metalness: A.m, clearcoat: A.cc || 0, clearcoatRoughness: 0.25, side: T.FrontSide });
  if (A.op) { M.transparent = true; M.opacity = A.op; M.depthWrite = true; }
  if (capas || A.arco || A.marmol || A.madera) {
    M.onBeforeCompile = sh => {
      sh.vertexShader = 'varying vec3 vMundo;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      let f = '';
      if (A.arco) f += ' { float t = vMundo.z * 0.045; diffuseColor.rgb = 0.55 + 0.45 * cos(6.2831 * (t + vec3(0.0, 0.33, 0.67))); }\n';
      if (A.marmol) f += ' { float v = sin(vMundo.x * 0.21 + sin(vMundo.y * 0.37 + vMundo.z * 0.11) * 3.0 + sin(vMundo.z * 0.23) * 2.0); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32), smoothstep(0.86, 1.0, abs(v)) * 0.75); }\n';
      if (A.madera) f += ' { float v = fract(length(vMundo.xy) * 0.18 + sin(vMundo.z * 0.4) * 0.15); diffuseColor.rgb *= 0.82 + 0.18 * smoothstep(0.0, 0.5, abs(v - 0.5) * 2.0); }\n';
      if (capas) f += ' { float l = abs(fract(vMundo.z / 0.2) - 0.5) * 2.0; diffuseColor.rgb *= 0.86 + 0.14 * smoothstep(0.0, 0.7, l); }\n';
      sh.fragmentShader = 'varying vec3 vMundo;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + f);
    };
    M.customProgramCacheKey = () => acabado + (capas ? '+capas' : '');
  }
  return M;
}
function geometria(v) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(v.pos, 3)); g.setAttribute('normal', new T.BufferAttribute(v.nor, 3)); g.setIndex(new T.BufferAttribute(v.idx, 1));
  if (v.col) g.setAttribute('color', new T.BufferAttribute(v.col, 3)); // v20: colores por punto (mapa de desviación)
  g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
export const eulerDe = rot => new T.Euler(...(rot || [0, 0, 0]).map(x => x * Math.PI / 180), 'ZYX'); // = Manifold.rotate([x,y,z])

export function crearEscena(lienzo, opts = {}) {
  const ren = new T.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.foto });
  ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); ren.outputColorSpace = T.SRGBColorSpace; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.05;
  ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFShadowMap; // (PCFSoft ya no existe en three r186: avisaba en cada vista)
  const esc = new T.Scene();
  const pm = new T.PMREMGenerator(ren); esc.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose();
  const cam = new T.PerspectiveCamera(38, 1, 0.5, 6000); cam.up.set(0, 0, 1); cam.position.set(170, -230, 170);
  const ctl = new T.OrbitControls(cam, lienzo); ctl.enableDamping = true; ctl.dampingFactor = 0.12; ctl.screenSpacePanning = true; ctl.target.set(0, 0, 10);
  ctl.mouseButtons = { LEFT: T.MOUSE.ROTATE, MIDDLE: T.MOUSE.PAN, RIGHT: T.MOUSE.PAN }; ctl.zoomToCursor = true;
  esc.add(new T.HemisphereLight(0xdfe6ff, 0x2a2238, 0.55));
  const sol = new T.DirectionalLight(0xffffff, 1.7); sol.position.set(120, -160, 260); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004;
  Object.assign(sol.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 10, far: 900 }); esc.add(sol); esc.add(sol.target);
  const rel = new T.DirectionalLight(0xa9b8ff, 0.45); rel.position.set(-200, 160, 90); esc.add(rel);

  let raf = 0, vivo = true, alDibujar = null; // (antes que nada: pintaCama() ya pide dibujar)
  let anim = null, t0anim = 0, vuelta = 0; // v20.2: animación y cámara que gira
  // ---- la cama ----
  const cama = new T.Group(); esc.add(cama); let lado = opts.cama || 256;
  function pintaCama() {
    cama.clear();
    const base = new T.Mesh(new T.PlaneGeometry(lado, lado), new T.MeshStandardMaterial({ color: opts.dia ? 0xe9ecf4 : 0x151a2e, roughness: 0.92, metalness: 0 }));
    base.receiveShadow = true; base.position.z = -0.05; cama.add(base);
    const fina = [], gorda = [];
    for (let v = -lado / 2; v <= lado / 2 + 0.01; v += 10) { const L = Math.abs(Math.round(v) % 50) === 0 ? gorda : fina; L.push(v, -lado / 2, 0, v, lado / 2, 0, -lado / 2, v, 0, lado / 2, v, 0); }
    const lin = (a, c, o) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(a, 3)); const l = new T.LineSegments(g, new T.LineBasicMaterial({ color: c, transparent: true, opacity: o })); l.position.z = 0.02; cama.add(l); };
    lin(fina, opts.dia ? 0x9aa3bd : 0x2c3558, 0.55); lin(gorda, opts.dia ? 0x6d7798 : 0x45507e, 0.9);
    const borde = []; [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].forEach(([a, b], i, L) => { if (i) borde.push(L[i - 1][0] * lado / 2, L[i - 1][1] * lado / 2, 0, a * lado / 2, b * lado / 2, 0); }); lin(borde, 0x7c6cff, 1);
    // ejes: X rojo, Y verde
    lin([0, 0, 0.05, 30, 0, 0.05], 0xff4d6d, 1); lin([0, 0, 0.05, 0, 30, 0.05], 0x3ddc84, 1);
    pide();
  }
  pintaCama();

  const partes = new T.Group(), huecos = new T.Group(), marca = new T.Group(), extra = new T.Group(); esc.add(partes, huecos, marca, extra);
  const proxies = new T.Group(); // no se dibujan: sirven para saber qué cuerpo tocas
  let capas = false;
  const tira = g => g.traverse(o => { if (o.geometry && !o.geometry.userData.fija) o.geometry.dispose(); if (o.material && !o.material.userData.fijo) [].concat(o.material).forEach(m => m.dispose()); });
  // v20.2 · RÁPIDO: la geometría de cada «vista» se crea UNA vez y se reutiliza mientras siga en pantalla (las piezas que solo
  // se mueven llevan su matriz y no se rehacen). Igual con las ARISTAS (como Fusion: el contorno de cada cara se ve).
  let geos = new Map(), aris = new Map(), mats = new Map();
  const geoDe = (v, usadas) => { let g = geos.get(v); if (!g) { g = geometria(v); g.userData.fija = true; } usadas.set(v, g); return g; };
  const arisDe = (v, g, usadas) => { let e = aris.get(v); if (!e) { e = new T.EdgesGeometry(g, 24); e.userData.fija = true; } usadas.set(v, e); return e; };
  const matDe = (k, crea) => { let m = mats.get(k); if (!m) { m = crea(); m.userData.fijo = true; mats.set(k, m); } return m; };
  // v30.6 · MODOS: 'aristas' (sombreado con aristas, el de siempre) · 'sombreado' (liso) · 'alambre' · 'transparente' (SOLO si se pide: la
  // opacidad ya no se aplica en los demás modos, las piezas se ven macizas) · 'rayosx'. Y SECCIÓN: un plano que deja ver por dentro.
  let modoVista = 'aristas';
  let opacidad = 0.45, secPlano = null;
  const colorArista = () => (opts.dia ? 0x2a2f45 : 0x0b0d16);
  const ponMatriz = (o, M) => { o.matrixAutoUpdate = false; if (M) o.matrix.fromArray(M); else o.matrix.identity(); o.userData.base = o.matrix.clone(); };
  // partes = [{ id, sub?, vista, color, acabado, matriz? (16 números) }]  · huecos = [{ id, vista, matriz? }] (cristal rojo)
  function ponPartes(L, H = []) {
    tira(partes); partes.clear(); tira(huecos); huecos.clear();
    const usadasG = new Map(), usadasA = new Map(), rx = modoVista === 'rayosx', alambre = modoVista === 'alambre', op = modoVista === 'transparente' ? opacidad : 1, sec = secPlano ? '|sec' : '', corta = m => { if (secPlano) { m.clippingPlanes = [secPlano]; m.clipShadows = true; } return m; };
    L.forEach(p => {
      const g = geoDe(p.vista, usadasG);
      const mt = p.resalta ? new T.MeshBasicMaterial({ color: tono(p.color), transparent: true, opacity: 0.8, depthTest: false })
        : p.fantasma ? new T.MeshStandardMaterial({ color: tono(p.color), transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.6 })
          : p.vista.col ? corta(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, side: p.vista.cruda ? T.DoubleSide : T.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }))
            : rx ? matDe('rx' + p.color + sec, () => corta(new T.MeshStandardMaterial({ color: tono(p.color), transparent: true, opacity: 0.28, depthWrite: false, roughness: 0.5, side: T.DoubleSide })))
              : alambre ? matDe('alambre' + p.color + sec, () => corta(new T.MeshBasicMaterial({ color: tono(p.color), wireframe: true, transparent: true, opacity: 0.6 })))
                : p.rota ? matDe('rota' + p.color + sec, () => corta(new T.MeshStandardMaterial({ color: tono(p.color), roughness: 0.75, metalness: 0, side: T.DoubleSide })))
                  : matDe(p.color + '|' + p.acabado + (capas ? '|capas' : '') + '|' + op + sec, () => { const m = material(p.color, p.acabado, capas); m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; if (op < 0.99) { m.transparent = true; m.opacity = Math.min(m.opacity, op); m.depthWrite = op > 0.6; } return corta(m); });
      const m = new T.Mesh(g, mt); ponMatriz(m, p.matriz);
      if (p.resalta) m.renderOrder = 7; else m.castShadow = m.receiveShadow = !rx;
      m.userData.id = p.id; m.userData.sub = p.sub || null; m.userData.vista = p.vista; partes.add(m);
      // sección: lo de dentro se ve de un color liso (las caras de atrás), para distinguir el corte del resto
      if (secPlano && !p.resalta && !p.fantasma && !rx && !alambre) { const t2 = new T.Mesh(g, matDe('tapa', () => corta(new T.MeshBasicMaterial({ color: 0xff8a3d, side: T.BackSide })))); ponMatriz(t2, p.matriz); t2.raycast = () => { }; t2.userData.tapa = true; t2.userData.id = p.id; partes.add(t2); }
      if (!p.resalta && !p.fantasma && !p.vista.col && !p.rota && modoVista !== 'sombreado' && p.vista.idx.length < 3e6) {
        const e = new T.LineSegments(arisDe(p.vista, g, usadasA), matDe('arista' + (rx ? 'rx' : '') + sec, () => corta(new T.LineBasicMaterial({ color: rx ? 0x7c6cff : colorArista(), transparent: true, opacity: rx ? 0.9 : 0.55 }))));
        ponMatriz(e, p.matriz); e.userData.arista = true; e.userData.id = p.id; partes.add(e);
      }
    });
    H.forEach(p => {
      const g = geoDe(p.vista, usadasG), m = new T.Mesh(g, matDe('hueco', () => new T.MeshStandardMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.4 }))); ponMatriz(m, p.matriz); m.userData.id = p.id; huecos.add(m);
      const e = new T.LineSegments(arisDe(p.vista, g, usadasA), matDe('aristaHueco', () => new T.LineBasicMaterial({ color: 0xff7a8f, transparent: true, opacity: 0.7 }))); ponMatriz(e, p.matriz); e.userData.id = p.id; huecos.add(e);
    });
    // lo que ya no se ve, fuera de la memoria de la tarjeta
    geos.forEach((g, v) => { if (!usadasG.has(v)) g.dispose(); }); aris.forEach((e, v) => { if (!usadasA.has(v)) e.dispose(); });
    geos = usadasG; aris = usadasA;
    partes.updateMatrixWorld(true); huecos.updateMatrixWorld(true); if (tapados) aplicaTapados();
    pide();
  }
  // modo de vista: 'aristas' · 'sombreado' · 'rayosx' (hay que volver a llamar a ponPartes)
  function vistaModo(m) { if (m) modoVista = m; return modoVista; }
  // v20.2 · ANIMAR: fn(t en segundos) → { id: T.Matrix4 } (lo que se mueve cada pieza, en el mundo). null = quieto otra vez
  function animar(fn) {
    anim = fn || null; t0anim = performance.now(); marca.visible = !anim;
    if (!anim) { [partes, huecos].forEach(G => G.children.forEach(o => { if (o.userData.base) o.matrix.copy(o.userData.base); })); partes.updateMatrixWorld(true); huecos.updateMatrixWorld(true); }
    pide();
  }
  const animando = () => !!anim;
  function giraCamara(v) { vuelta = v ? (typeof v === 'number' ? v : 1) : 0; pide(); }
  // grabar lo que se ve (WebM) durante «seg» segundos
  function grabar(seg = 8) {
    return new Promise((res, rej) => {
      try {
        const st = lienzo.captureStream(30), tipos = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'], tipo = tipos.find(x => window.MediaRecorder && MediaRecorder.isTypeSupported(x)) || '';
        const rec = new MediaRecorder(st, tipo ? { mimeType: tipo, videoBitsPerSecond: 6e6 } : undefined), trozos = [];
        rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); }; rec.onstop = () => res(new Blob(trozos, { type: 'video/webm' }));
        rec.start(250); const tic = setInterval(pide, 30); setTimeout(() => { clearInterval(tic); rec.stop(); }, seg * 1000);
      } catch (e) { rej(e); }
    });
  }
  function ponOpacidad(v) { if (v !== undefined) opacidad = Math.max(0.1, Math.min(1, Number(v) || 1)); return opacidad; } // (solo se usa en el modo «transparente»)
  // v30.6 · SECCIÓN (ver por dentro sin tocar la pieza): o = null la quita · { n: [x, y, z], d } deja ver el lado n·p ≤ d. Mover el plano no rehace nada.
  function seccion(o) { const antes = !!secPlano; if (!o) { secPlano = null; ren.localClippingEnabled = false; } else { if (!secPlano) secPlano = new T.Plane(); secPlano.normal.set(-o.n[0], -o.n[1], -o.n[2]).normalize(); secPlano.constant = o.d; ren.localClippingEnabled = true; } pide(); return antes !== !!secPlano; }
  // proxies = [{ id, vista (en su sitio local), matriz (T.Matrix4) }]
  function ponProxies(L) {
    tira(proxies); proxies.clear();
    L.forEach(p => { const m = new T.Mesh(geometria(p.vista), new T.MeshBasicMaterial({ side: T.DoubleSide })); m.matrixAutoUpdate = false; m.matrix.copy(p.matriz); m.userData.id = p.id; proxies.add(m); });
    proxies.updateMatrixWorld(true);
  }
  const matrizDe = t => { const m = new T.Matrix4(); m.compose(new T.Vector3(...(t.pos || [0, 0, 0])), new T.Quaternion().setFromEuler(eulerDe(t.rot)), new T.Vector3(...(t.esc || [1, 1, 1]))); return m; };
  function moverProxy(id, t) { proxies.children.forEach(m => { if (m.userData.id === id) { m.matrix.copy(matrizDe(t)); } }); proxies.updateMatrixWorld(true); marca.children.forEach(o => { if (o.userData.id === id) { o.matrix.copy(matrizDe(t)); } }); pide(); }

  // ---- selección: el contorno del cuerpo elegido ----
  function marcar(L) { // [{ id, vista, t }]
    tira(marca); marca.clear();
    L.forEach(s => { const e = new T.LineSegments(new T.EdgesGeometry(geometria(s.vista), 28), new T.LineBasicMaterial({ color: 0xff7a1a, depthTest: false, transparent: true, opacity: 0.95 })); e.renderOrder = 5; e.matrixAutoUpdate = false; e.matrix.copy(matrizDe(s.t)); e.userData.id = s.id; marca.add(e); });
    pide();
  }

  // ---- flechas (mover · girar · escalar) ----
  const manija = new T.Object3D(); esc.add(manija);
  const tc = new T.TransformControls(cam, lienzo); tc.setSpace('local'); tc.setTranslationSnap(1); tc.setRotationSnap(T.MathUtils.degToRad(15)); tc.setScaleSnap(0.05); tc.setSize(0.9);
  const ayudante = tc.getHelper ? tc.getHelper() : tc; esc.add(ayudante);
  let alMover = null, alSoltar = null, arrastrando = false;
  tc.addEventListener('dragging-changed', e => { ctl.enabled = !e.value; arrastrando = e.value; if (!e.value && alSoltar) alSoltar(leeManija()); });
  tc.addEventListener('objectChange', () => { if (alMover) alMover(leeManija()); });
  tc.addEventListener('change', pide);
  const r1 = x => Math.round(x * 1000) / 1000;
  function leeManija() { const e = new T.Euler().setFromQuaternion(manija.quaternion, 'ZYX'); return { pos: manija.position.toArray().map(r1), rot: [e.x, e.y, e.z].map(a => r1(T.MathUtils.radToDeg(a))), esc: manija.scale.toArray().map(r1), n: new T.Vector3(0, 0, 1).applyQuaternion(manija.quaternion).toArray() }; } // v30.6: «n» = hacia dónde mira su Z (la normal del plano de corte)
  let pasoPropio = false;
  function flechas(modo, t, mover, soltar, op = {}) {
    alMover = mover; alSoltar = soltar;
    if (op.snap) { tc.setTranslationSnap(op.snap[0]); tc.setRotationSnap(T.MathUtils.degToRad(op.snap[1])); pasoPropio = true; } else if (pasoPropio) { pasoPropio = false; fino(false); } // v30.6: el plano de corte va de 0,5 mm y de 1°
    tc.showX = tc.showY = !op.soloZ; tc.showZ = !op.sinZ; tc.setSize(op.soloZ ? 1.35 : op.sinZ ? 1.15 : 0.9); // v30: la flecha de EXTRUIR una cara (solo su eje, más grande) · v30.6: sinZ = los dos aros que inclinan un plano
    if (!modo || !t) { tc.detach(); pide(); return; }
    manija.position.set(...(t.pos || [0, 0, 0])); if (t.normal) manija.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(...t.normal).normalize()); else manija.quaternion.setFromEuler(eulerDe(t.rot)); manija.scale.set(...(t.esc || [1, 1, 1]));
    tc.setMode({ mover: 'translate', girar: 'rotate', escalar: 'scale' }[modo] || 'translate'); tc.setSpace(op.soloZ || op.sinZ ? 'local' : modo === 'mover' ? 'world' : 'local'); tc.attach(manija); pide();
  }
  const fino = on => { tc.setTranslationSnap(on ? 0.1 : 1); tc.setRotationSnap(T.MathUtils.degToRad(on ? 1 : 15)); };

  // ---- tocar: qué cuerpo y qué punto ----
  const ray = new T.Raycaster(), nd = new T.Vector2();
  const aNdc = e => { const r = lienzo.getBoundingClientRect(); nd.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(nd, cam); };
  function cuerpoEn(e) { aNdc(e); const h = ray.intersectObjects(proxies.children, false)[0]; return h ? h.object.userData.id : null; }
  // v20.2 · la cara tocada: { id, sub, vista, matriz (16), tri (nº de triángulo de la vista), p (punto), n (normal en el mundo) }
  function caraEn(e) {
    aNdc(e); const h = ray.intersectObjects(partes.children.filter(o => o.isMesh), false)[0]; if (!h || h.faceIndex == null) return null;
    const o = h.object, n = h.face.normal.clone().transformDirection(o.matrixWorld).normalize();
    return { id: o.userData.id, sub: o.userData.sub, vista: o.userData.vista, matriz: o.matrixWorld.elements.slice(), tri: h.faceIndex, p: h.point.toArray(), n: n.toArray() };
  }
  function puntoEn(e) {
    aNdc(e); const h = ray.intersectObjects(partes.children.filter(o => o.isMesh).concat(huecos.children.filter(o => o.isMesh)), false)[0]; if (!h) return null;
    // se pega a la esquina más cercana si está a menos de 1,5 mm (v20.2: las esquinas, ya en su sitio con la matriz de la pieza)
    let p = h.point.clone(); const g = h.object.geometry, P = g.attributes.position, f = h.face; let mejor = null, md = 1.5;
    [f.a, f.b, f.c].forEach(i => { const v = new T.Vector3().fromBufferAttribute(P, i).applyMatrix4(h.object.matrixWorld); const d = v.distanceTo(p); if (d < md) { md = d; mejor = v; } }); if (mejor) p = mejor;
    const n = f.normal.clone().transformDirection(h.object.matrixWorld); return { p: p.toArray(), n: n.toArray(), esquina: !!mejor };
  }
  // ---- regla de medir ----
  let regla = null; const etiquetas = [];
  function medida(a, b) {
    if (regla) { tira(regla); extra.remove(regla); regla = null; }
    if (!a) { pide(); return; }
    regla = new T.Group(); const bola = q => { const s = new T.Mesh(new T.SphereGeometry(1.2, 16, 12), new T.MeshBasicMaterial({ color: 0xffd23f, depthTest: false })); s.position.set(...q); s.renderOrder = 9; regla.add(s); };
    bola(a); if (b) { bola(b); const g = new T.BufferGeometry().setFromPoints([new T.Vector3(...a), new T.Vector3(...b)]); const l = new T.Line(g, new T.LineBasicMaterial({ color: 0xffd23f, depthTest: false })); l.renderOrder = 9; regla.add(l); }
    extra.add(regla); pide();
  }
  // ---- plano del corte y sitios de los conectores ----
  let plano = null;
  function planoCorte(o) { // { normal, punto, tam, sitios: [[x,y,z]], d, contorno: Float32Array (rayas x,y,z · x,y,z), color, sinRelleno }
    if (plano) { tira(plano); extra.remove(plano); plano = null; }
    if (!o) { pide(); return; }
    plano = new T.Group(); const n = new T.Vector3(...o.normal).normalize(), col = o.color || 0xffa040, q0 = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), n), en = x => { x.quaternion.copy(q0); x.position.set(...o.punto); plano.add(x); return x; };
    if (!o.sinRelleno) en(new T.Mesh(new T.PlaneGeometry(o.tam, o.tam), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.2, side: T.DoubleSide, depthWrite: false })));
    en(new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(o.tam, o.tam)), new T.LineBasicMaterial({ color: col })));
    // v30.6 · rejilla (se ve por dónde pasa aunque lo tape la pieza) y la flecha que señala el lado A
    const R = [], k = 8, h2 = o.tam / 2; for (let i = 1; i < k; i++) { const v = -h2 + o.tam * i / k; R.push(v, -h2, 0, v, h2, 0, -h2, v, 0, h2, v, 0); }
    const gr = new T.BufferGeometry(); gr.setAttribute('position', new T.Float32BufferAttribute(R, 3)); en(new T.LineSegments(gr, new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.28 })));
    const fantasma = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(o.tam, o.tam)), new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthTest: false })); fantasma.renderOrder = 6; en(fantasma);
    if (o.flecha !== false) { const L = Math.max(6, o.tam * 0.16), fl = new T.ArrowHelper(n, new T.Vector3(...o.punto).addScaledVector(new T.Vector3(1, 0, 0).applyQuaternion(q0), h2).addScaledVector(new T.Vector3(0, 1, 0).applyQuaternion(q0), h2), L, 0x4aa8ff, L * 0.32, L * 0.18); fl.line.material.depthTest = false; fl.cone.material.depthTest = false; fl.renderOrder = 8; plano.add(fl); }
    if (o.contorno && o.contorno.length) { // el contorno REAL del corte, por encima de todo (blanco con sombra oscura: se ve sobre cualquier color)
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(o.contorno, 3));
      const l0 = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x101320, depthTest: false, transparent: true, opacity: 0.9, linewidth: 3 })); l0.renderOrder = 8; l0.scale.setScalar(1.0015); plano.add(l0);
      const l1 = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0xffffff, depthTest: false })); l1.renderOrder = 9; l1.userData.contorno = true; plano.add(l1);
    }
    (o.sitios || []).forEach(q => { const c = new T.Mesh(new T.CylinderGeometry(o.d / 2, o.d / 2, 1.2, 24), new T.MeshBasicMaterial({ color: 0xffd23f, depthTest: false })); c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), n); c.position.set(...q); c.renderOrder = 8; plano.add(c); });
    extra.add(plano); pide();
  }
  // ---- v30.6 · VISTA PREVIA de verdad (las dos partes de un corte, cada una de su color, opacas): [{ vista, color, matriz? (16), oculta? }]
  // «tapar» = los cuerpos del diseño que se dejan de ver mientras dura (true = todos · [ids])
  const prev = new T.Group(); esc.add(prev); let tapados = null;
  const aplicaTapados = () => { partes.children.forEach(o => { o.visible = !(tapados === true || (tapados && tapados.includes(o.userData.id))); }); };
  function previa(L, tapar) {
    prev.children.forEach(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); prev.clear();
    tapados = L && L.length ? (tapar === undefined ? true : tapar) : null; aplicaTapados();
    (L || []).forEach((x, i) => {
      const g = geometria(x.vista), m = new T.Mesh(g, new T.MeshStandardMaterial({ color: tono(x.color), roughness: 0.62, metalness: 0.02, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
      ponMatriz(m, x.matriz); m.castShadow = m.receiveShadow = true; m.userData.previa = i; m.visible = !x.oculta; prev.add(m);
      if (x.vista.idx.length < 9e5) { const e = new T.LineSegments(new T.EdgesGeometry(g, 28), new T.LineBasicMaterial({ color: colorArista(), transparent: true, opacity: 0.5 })); ponMatriz(e, x.matriz); e.userData.previa = i; e.visible = !x.oculta; prev.add(e); }
    });
    prev.updateMatrixWorld(true); pide();
  }
  // mover (o esconder) una de las partes de la vista previa sin volver a calcular nada: «separar para ver», «ver solo una»
  function previaPon(i, matriz, oculta) { prev.children.forEach(o => { if (o.userData.previa !== i) return; if (matriz !== undefined) ponMatriz(o, matriz); o.visible = !oculta; }); prev.updateMatrixWorld(true); pide(); }
  function previaEn(e) { aNdc(e); const h = ray.intersectObjects(prev.children.filter(o => o.isMesh && o.visible), false)[0]; return h ? { i: h.object.userData.previa, p: h.point.toArray() } : null; }

  // ---- v20.2 · la CARA elegida (azul, como en Fusion) ----
  let cara = null;
  function ponCara(o) { // { tris: Float32Array (x,y,z de cada esquina, en el mundo), bordes: [[[x,y,z]…]…] } o null
    if (cara) { tira(cara); extra.remove(cara); cara = null; }
    if (!o) { pide(); return; }
    cara = new T.Group(); const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(o.tris, 3));
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.renderOrder = 6; cara.add(m);
    (o.bordes || []).forEach(r => { const pts = r.concat([r[0]]).map(q => new T.Vector3(...q)); const l = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xff7a1a, depthTest: false })); l.renderOrder = 8; cara.add(l); });
    extra.add(cara); pide();
  }
  // ---- v30 · COMO FUSION: lo que hay bajo el ratón se ilumina (la cara en azul claro) y la arista que vas a tocar, en amarillo ----
  let hov = null, ari = null;
  function ponHover(o) { // { tris, bordes } o null
    if (hov) { tira(hov); extra.remove(hov); hov = null; }
    if (o) { hov = new T.Group(); const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(o.tris, 3));
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0x29d3ff, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); m.renderOrder = 5; hov.add(m);
      (o.bordes || []).forEach(r => { const pts = r.concat([r[0]]).map(q => new T.Vector3(...q)); const l = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x29d3ff, depthTest: false, transparent: true, opacity: 0.9 })); l.renderOrder = 7; hov.add(l); });
      extra.add(hov); }
    pide();
  }
  // ---- v30 · 🖼 LIENZOS (como el «Lienzo» de Fusion): imágenes de referencia en el suelo, delante o de lado, a su tamaño real ----
  const lienz = new T.Group(); esc.add(lienz); const texs = new Map();
  function lienzos(L) { // [{ url, w, h (mm), plano: 'xy'|'xz'|'yz', pos: [x,y,z] (centro), opac }]
    lienz.children.slice().forEach(m => { m.geometry.dispose(); m.material.dispose(); lienz.remove(m); });
    (L || []).forEach(l => { let tx = texs.get(l.url); if (!tx) { tx = new T.TextureLoader().load(l.url, () => pide()); tx.colorSpace = T.SRGBColorSpace; texs.set(l.url, tx); }
      const m = new T.Mesh(new T.PlaneGeometry(l.w, l.h), new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: l.opac == null ? 0.6 : l.opac, side: T.DoubleSide, depthWrite: false }));
      if (l.plano === 'xz') m.rotation.set(Math.PI / 2, 0, 0); else if (l.plano === 'yz') m.quaternion.setFromEuler(new T.Euler(Math.PI / 2, 0, Math.PI / 2, 'ZYX'));
      m.position.set(...l.pos); m.renderOrder = -1; lienz.add(m); });
    pide();
  }
  let pto = null;
  function ponPunto(p, color = 0xffd23f) { // v30: la ESQUINA (vértice) bajo el ratón o elegida
    if (pto) { tira(pto); extra.remove(pto); pto = null; }
    if (p) { const r = Math.max(0.45, cam.position.distanceTo(ctl.target) * 0.007); pto = new T.Mesh(new T.SphereGeometry(r, 16, 12), new T.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 })); pto.position.set(...p); pto.renderOrder = 10; extra.add(pto); }
    pide();
  }
  function ponArista(L, color = 0xffd23f) { // [[a, b], …] en el mundo, o null
    if (ari) { tira(ari); extra.remove(ari); ari = null; }
    if (L && L.length) { ari = new T.Group(); const r = Math.max(0.2, cam.position.distanceTo(ctl.target) * 0.003), mt = new T.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 });
      L.forEach(([a, b]) => { const A = new T.Vector3(...a), B = new T.Vector3(...b), l = A.distanceTo(B); if (l < 1e-6) return; const m = new T.Mesh(new T.CylinderGeometry(r, r, l, 10, 1, false), mt); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); m.renderOrder = 9; ari.add(m); });
      extra.add(ari); }
    pide();
  }
  // ---- v20.2 · GEOMETRÍA DE CONSTRUCCIÓN: planos (cristal con borde y nombre) y ejes (línea discontinua) ----
  const cons = new T.Group(); esc.add(cons);
  function construccion(L, elegido) { // [{ id, tipo:'plano'|'eje', o, n, u, tam, nombre } | { tipo:'eje', o, dir, largo }]
    tira(cons); cons.clear();
    (L || []).forEach(c => {
      const on = c.id === elegido, col = on ? 0xffe14d : 0xd8b62a;
      if (c.tipo === 'plano') {
        const n = new T.Vector3(...c.n).normalize(), u = new T.Vector3(...(c.u || [1, 0, 0])).normalize(), v = n.clone().cross(u), tam = c.tam || 120;
        const q = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(u, v, n));
        const m = new T.Mesh(new T.PlaneGeometry(tam, tam), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: on ? 0.22 : 0.12, side: T.DoubleSide, depthWrite: false }));
        m.quaternion.copy(q); m.position.set(...c.o); m.userData.cons = c.id; cons.add(m);
        const b = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(tam, tam)), new T.LineBasicMaterial({ color: col, transparent: true, opacity: on ? 1 : 0.7 })); b.quaternion.copy(q); b.position.copy(m.position); cons.add(b);
      } else if (c.tipo === 'eje') {
        const d = new T.Vector3(...c.dir).normalize(), L2 = (c.largo || 300) / 2, o = new T.Vector3(...c.o);
        const l = new T.Line(new T.BufferGeometry().setFromPoints([o.clone().addScaledVector(d, -L2), o.clone().addScaledVector(d, L2)]), new T.LineDashedMaterial({ color: col, dashSize: 4, gapSize: 2.5, depthTest: false }));
        l.computeLineDistances(); l.renderOrder = 8; l.userData.cons = c.id; cons.add(l);
      }
    });
    pide();
  }
  function puntoPlano(e, o) { aNdc(e); const pl = new T.Plane().setFromNormalAndCoplanarPoint(new T.Vector3(...o.normal).normalize(), new T.Vector3(...o.punto)), q = new T.Vector3(); return ray.ray.intersectPlane(pl, q) ? q.toArray() : null; } // v20.2
  function consEn(e) { aNdc(e); const h = ray.intersectObjects(cons.children.filter(o => o.isMesh), false)[0]; return h ? h.object.userData.cons : null; }
  // ---- v20.2 · FANTASMAS: vista previa (copias de una matriz, el resultado de empujar una cara…) antes de aceptar ----
  const fant = new T.Group(); esc.add(fant);
  function fantasmas(L, color = '#3ddc84') { // [{ vista, matriz (16) }]
    fant.children.forEach(o => { if (o.geometry) o.geometry.dispose(); }); fant.clear();
    if (L && L.length) { const mt = new T.MeshStandardMaterial({ color: tono(color), transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.5 });
      L.forEach(x => { const m = new T.Mesh(geometria(x.vista), mt); ponMatriz(m, x.matriz); m.renderOrder = 4; fant.add(m); }); fant.updateMatrixWorld(true); }
    pide();
  }
  // ---- marcadores (p. ej. las zonas de pared fina, en rojo) ----
  let marcas = null;
  function marcadores(L, color = 0xff3b5c, r = 1.6) {
    if (marcas) { tira(marcas); extra.remove(marcas); marcas = null; }
    if (!L || !L.length) { pide(); return; }
    marcas = new T.Group(); const g = new T.SphereGeometry(1, 14, 10), mt = new T.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.85 });
    L.forEach(q => { const s = new T.Mesh(g, q.color ? new T.MeshBasicMaterial({ color: q.color, depthTest: false, transparent: true, opacity: 0.9 }) : mt); s.position.set(...q.p); s.scale.setScalar(q.r || r); s.renderOrder = 9; marcas.add(s); }); // (v20.4: cada marca con su color)
    extra.add(marcas); pide();
  }
  // ---- cámara ----
  // v20.4: «dir» puede ser un nombre o una dirección [x, y, z] (las del cubo de vistas); con «suave» la cámara se desliza (0,35 s)
  const VISTAS = { iso: [0.62, -0.95, 0.72], frente: [0, -1, 0.0001], arriba: [0, -0.0001, 1], abajo: [0, -0.0001, -1], derecha: [1, 0, 0.0001], izquierda: [-1, 0, 0.0001], detras: [0, 1, 0.0001], atras: [0, 1, 0.0001] };
  let viaje = null;
  function encuadrar(dir, suave = false) {
    const b = new T.Box3(); partes.children.forEach(m => { if (m.isMesh) b.expandByObject(m); }); huecos.children.forEach(m => { if (m.isMesh) b.expandByObject(m); });
    if (b.isEmpty()) b.set(new T.Vector3(-40, -40, 0), new T.Vector3(40, 40, 40));
    const c = b.getCenter(new T.Vector3()), r = Math.max(20, b.getSize(new T.Vector3()).length() / 2);
    let d = Array.isArray(dir) ? dir.slice() : (VISTAS[dir] || null);
    if (d && Math.abs(d[2]) > 0.9999 * Math.hypot(...d)) d = [0, -0.0001, Math.sign(d[2])]; // mirando justo de arriba o de abajo: el frente, abajo en la pantalla
    const v = d ? new T.Vector3(...d).normalize() : cam.position.clone().sub(ctl.target).normalize();
    const dist = r / Math.sin(T.MathUtils.degToRad(cam.fov / 2)) * 1.08, p1 = c.clone().add(v.multiplyScalar(dist));
    cam.near = Math.max(0.1, dist / 200); cam.far = dist * 40; cam.updateProjectionMatrix();
    if (suave && !anim) { viaje = { t0: performance.now(), p0: cam.position.clone(), p1, g0: ctl.target.clone(), g1: c }; pide(); return; }
    viaje = null; cam.position.copy(p1); ctl.target.copy(c); ctl.update(); pide();
  }
  // ---- v20.4 · CUBO DE VISTAS (la dueña: «el cubito del eje para mover»): gira con la cámara; una CARA = esa vista, una ESQUINA =
  // la isométrica de esa esquina. Hecho con three.js en su propio lienzo (no estorba a la vista grande).
  let cuboV = null;
  function cuboVistas(div, tam = 112) {
    const cv = document.createElement('canvas'); cv.className = 'r8e-vc-cv'; cv.style.width = cv.style.height = tam + 'px'; cv.setAttribute('aria-label', 'Cubo de vistas: toca una cara o una esquina'); div.prepend(cv);
    const r2 = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); r2.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r2.setSize(tam, tam, false); r2.outputColorSpace = T.SRGBColorSpace;
    const e2 = new T.Scene(), c2 = new T.OrthographicCamera(-1.75, 1.75, 1.75, -1.75, 0.1, 20); c2.up.set(0, 0, 1);
    e2.add(new T.HemisphereLight(0xffffff, 0x8890b0, 1.1)); const l2 = new T.DirectionalLight(0xffffff, 0.9); l2.position.set(2, -3, 4); e2.add(l2);
    // caras (la caja de three es «Y arriba»: se tumba 90° para que «arriba» sea Z) · orden de three: +X, −X, +Y, −Y, +Z, −Z
    const textos = ['DERECHA', 'IZQUIERDA', 'ARRIBA', 'ABAJO', 'FRENTE', 'ATRÁS'], dirs = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0], [0, 1, 0]];
    const mats = textos.map(t => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#e9ecf6'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#7c6cff'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 246); g.fillStyle = '#1b2140'; g.font = '700 ' + (t.length > 7 ? 40 : 48) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 128, 132);
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; return new T.MeshStandardMaterial({ map: tx, roughness: 0.7, metalness: 0 }); });
    const caja = new T.Mesh(new T.BoxGeometry(2, 2, 2), mats); caja.rotation.x = Math.PI / 2; e2.add(caja);
    const bordes = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(2, 2, 2)), new T.LineBasicMaterial({ color: 0x3a3f66 })); bordes.rotation.x = Math.PI / 2; e2.add(bordes);
    const esquinas = []; [-1, 1].forEach(x => [-1, 1].forEach(y => [-1, 1].forEach(z => { const m = new T.Mesh(new T.SphereGeometry(0.2, 16, 12), new T.MeshStandardMaterial({ color: 0x7c6cff, roughness: 0.4 })); m.position.set(x, y, z); m.userData.dir = [x, y, z]; e2.add(m); esquinas.push(m); })));
    // ejes de colores (X rojo, Y verde, Z azul) que salen de la esquina de abajo-izquierda-delante
    [[1, 0, 0, 0xff4d6d], [0, 1, 0, 0x3ddc84], [0, 0, 1, 0x4d8dff]].forEach(([x, y, z, col]) => { const g = new T.BufferGeometry().setFromPoints([new T.Vector3(-1.25, -1.25, -1.25), new T.Vector3(-1.25 + 1.1 * x, -1.25 + 1.1 * y, -1.25 + 1.1 * z)]); e2.add(new T.Line(g, new T.LineBasicMaterial({ color: col }))); });
    const ray2 = new T.Raycaster(), p2 = new T.Vector2(); let encima = null;
    const quien = ev => { const r = cv.getBoundingClientRect(); p2.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray2.setFromCamera(p2, c2);
      const h1 = ray2.intersectObjects(esquinas, false)[0]; if (h1) return { esquina: h1.object, dir: h1.object.userData.dir };
      const h2 = ray2.intersectObject(caja, false)[0]; if (h2 && h2.face) return { cara: h2.face.materialIndex, dir: dirs[h2.face.materialIndex] }; return null; };
    const pinta2 = () => { mats.forEach((m, i) => m.emissive.setHex(encima && encima.cara === i ? 0x3b2f8f : 0x000000)); esquinas.forEach(m => m.material.color.setHex(encima && encima.esquina === m ? 0xffd23f : 0x7c6cff)); cv.style.cursor = encima ? 'pointer' : 'default'; pide(); };
    const clave = q => (q ? (q.cara !== undefined ? 'c' + q.cara : q.esquina ? 'e' + q.esquina.id : '') : '');
    cv.addEventListener('pointermove', ev => { const q = quien(ev); if (clave(q) !== clave(encima)) { encima = q; pinta2(); } });
    cv.addEventListener('pointerleave', () => { encima = null; pinta2(); });
    cv.addEventListener('click', ev => { const q = quien(ev); if (q) { encuadrar(q.dir, true); if (cuboV && cuboV.alElegir) cuboV.alElegir(q.dir); } });
    cuboV = { r2, e2, c2, cv, quien, alElegir: null, dirs, textos };
    pide(); return cuboV;
  }
  function pintaCubo() { if (!cuboV) return; const v = cam.position.clone().sub(ctl.target).normalize(); cuboV.c2.position.copy(v.multiplyScalar(6)); cuboV.c2.up.copy(cam.up); cuboV.c2.lookAt(0, 0, 0); cuboV.r2.render(cuboV.e2, cuboV.c2); }

  // ---- dibujar (solo cuando hace falta) ----
  function pide() { if (!raf && vivo) raf = requestAnimationFrame(dibuja); }
  function dibuja() {
    raf = 0; if (!vivo) return;
    const w = lienzo.clientWidth || 300, h = lienzo.clientHeight || 200;
    if (lienzo.width !== Math.round(w * ren.getPixelRatio()) || lienzo.height !== Math.round(h * ren.getPixelRatio())) { ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (anim) { // v20.2 · ANIMACIÓN: cada pieza = su movimiento × su matriz de reposo
      const t = (performance.now() - t0anim) / 1000, D = anim(t) || {};
      [partes, huecos].forEach(G => G.children.forEach(o => { const b = o.userData.base; if (!b) return; const d = D[o.userData.id]; o.matrix.copy(d ? d.clone().multiply(b) : b); }));
      partes.updateMatrixWorld(true); huecos.updateMatrixWorld(true);
    }
    if (vuelta) { const a = 0.006 * vuelta, v = cam.position.clone().sub(ctl.target); v.applyAxisAngle(new T.Vector3(0, 0, 1), a); cam.position.copy(ctl.target).add(v); }
    if (viaje) { const k = Math.min(1, (performance.now() - viaje.t0) / 350), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; cam.position.lerpVectors(viaje.p0, viaje.p1, e); ctl.target.lerpVectors(viaje.g0, viaje.g1, e); if (k >= 1) viaje = null; }
    const mov = ctl.update(); ren.render(esc, cam); pintaCubo(); if (alDibujar) alDibujar(); if (mov || anim || vuelta || viaje) pide();
  }
  ctl.addEventListener('change', pide);
  const ro = window.ResizeObserver ? new ResizeObserver(pide) : null; if (ro) ro.observe(lienzo);
  // de un punto del mundo a la pantalla (para las etiquetas de las medidas)
  function aPantalla(q) { const v = new T.Vector3(...q).project(cam), r = lienzo.getBoundingClientRect(); return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height, delante: v.z < 1 }; }
  function foto(tipo = 'image/png', q) { ren.render(esc, cam); return lienzo.toDataURL(tipo, q); }

  dibuja();
  return {
    T, esc, cam, ctl, ponPartes, ponProxies, moverProxy, marcar, flechas, fino, cuerpoEn, puntoEn, medida, planoCorte, marcadores, encuadrar, aPantalla, foto, pide,
    caraEn, ponCara, construccion, consEn, fantasmas, vistaModo, puntoPlano, ponOpacidad, seccion, animar, animando, giraCamara, grabar, // v20.2
    previa, previaPon, previaEn, // v30.6
    cuboVistas, get cuboV() { return cuboV; }, // v20.4
    ponHover, ponArista, ponPunto, lienzos, get sobreFlechas() { return !!(tc.object && tc.axis); }, // v30 (como Fusion)
    get arrastrando() { return arrastrando; },
    set alDibujar(f) { alDibujar = f; },
    capas(on) { capas = !!on; }, cama(l) { lado = l; pintaCama(); },
    destruir() { vivo = false; cancelAnimationFrame(raf); if (cuboV) { try { cuboV.r2.dispose(); cuboV.r2.forceContextLoss(); } catch (e) { } cuboV = null; } if (ro) ro.disconnect(); tc.detach(); tc.dispose(); ctl.dispose(); tira(esc); geos.forEach(g => g.dispose()); aris.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); ren.dispose(); try { ren.forceContextLoss(); } catch (e) { } }
  };
}

// Una miniatura de una pieza (para el catálogo): un renderizador compartido fuera de la pantalla
let mini = null;
export function miniatura(vista, color = '#7c6cff', acabado = 'mate', tam = 320, dir = [0.62, -0.95, 0.66]) { // v20: dir = desde dónde se mira (frente [0,-1,0.15], lado, espalda…)
  if (!mini) {
    const c = document.createElement('canvas'); c.width = c.height = tam;
    const ren = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true }); ren.outputColorSpace = T.SRGBColorSpace; ren.toneMapping = T.ACESFilmicToneMapping;
    const esc = new T.Scene(), pm = new T.PMREMGenerator(ren); esc.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose();
    esc.add(new T.HemisphereLight(0xffffff, 0x333344, 0.6)); const s = new T.DirectionalLight(0xffffff, 1.6); s.position.set(1, -1.4, 2); esc.add(s);
    const cam = new T.PerspectiveCamera(30, 1, 0.1, 5000); cam.up.set(0, 0, 1); mini = { c, ren, esc, cam };
  }
  const { ren, esc, cam } = mini; ren.setSize(tam, tam, false);
  const m = new T.Mesh(geometria(vista), material(color, acabado, false)); esc.add(m);
  const b = new T.Box3().setFromObject(m), c = b.getCenter(new T.Vector3()), r = Math.max(1, b.getSize(new T.Vector3()).length() / 2);
  const d = r / Math.sin(T.MathUtils.degToRad(15)) * 1.02; cam.position.copy(c.clone().add(new T.Vector3(...dir).normalize().multiplyScalar(d))); cam.near = d / 50; cam.far = d * 10; cam.lookAt(c); cam.updateProjectionMatrix();
  ren.setClearColor(0x000000, 0); ren.render(esc, cam); const url = mini.c.toDataURL('image/png');
  esc.remove(m); m.geometry.dispose(); m.material.dispose(); return url;
}
