// ================= 👗 CelebriDREW · LA VISTA 3D (el maniquí y la prenda) =================
// three.js (vendor/three, MIT). Milímetros, Y hacia arriba, el maniquí mira a +Z. Luz de estudio (principal con sombra suave, relleno y
// contraluz), suelo que recoge la sombra, y la cámara que gira alrededor del cuerpo (ratón: girar · rueda: acercar · derecho: desplazar).
// La tela se pinta con su color (o su estampado), por las dos caras (por dentro algo más oscura), y puede enseñar el MAPA DE AJUSTE:
// verde = suelta · amarillo = justa · rojo = tira (más de un 10 % estirada).
import * as T from '../../vendor/three/three_r8.js';
import * as PL from './pelo.js';

// el color del MAPA DE AJUSTE: verde (suelta, sin estirar) → amarillo (5 %) → rojo (10 % o más) · encogida (< −3 %) en azul
export function colorEstira(e) {
  if (e < -0.03) return [0.35, 0.55, 0.95];
  const t = Math.max(0, Math.min(1, e / 0.1));
  return t < 0.5 ? [0.25 + 1.5 * t * 0.7, 0.78, 0.35 - 0.3 * t] : [0.95, 0.78 - (t - 0.5) * 1.3, 0.2 - (t - 0.5) * 0.3];
}
// ---------- el ASPECTO de cada tela (texturas en web/data/drew/telas: fotos CC0 de ambientCG y otras fabricadas aquí, ver LICENCIA_TEXTURAS) ----------
// tile = mm reales que mide un cuadro de la textura · nf = fuerza del relieve · rug = rugosidad media · sheen = la «pelusa» que brilla al
// rozar la luz (punto, felpa, ante) · aniso = brillo alargado del satén · capa = barniz (cuero, polipiel) · con = cuánto se ve el dibujo al
// teñir · transp = organza (deja ver lo de detrás) · natural = por defecto, con su color de verdad (vaquero, cuero, ante)
export const ASPECTO = {
  punto: { tile: 50, nf: 0.9, rug: 0.86, sheen: 0.55, sheenR: 0.55, con: 0.7 }, // (32 columnas por cuadro: 1,6 mm por columna, como un punto de camiseta de verdad)
  felpa: { tex: 'punto', tile: 45, nf: 0.75, rug: 0.92, sheen: 0.85, sheenR: 0.45, con: 0.6 }, // (la cara de fuera de una sudadera es punto liso; la felpa va por dentro)
  rib: { tile: 40, nf: 1.0, rug: 0.84, sheen: 0.45, sheenR: 0.55, con: 0.7 },
  algodon: { tile: 45, nf: 0.6, rug: 0.8, sheen: 0.2, sheenR: 0.7, con: 0.45 },
  denim: { tile: 150, nf: 1.0, rug: 0.82, sheen: 0.15, sheenR: 0.8, con: 1, natural: true },
  gabardina: { tile: 70, nf: 0.7, rug: 0.72, sheen: 0.15, sheenR: 0.7, con: 0.6 },
  // (satén y seda: brillo de capa fina + «sheen» claro; el brillo anisótropo marcaba los triángulos de la malla al moverse la tela)
  seda: { tex: 'saten', tile: 40, nf: 0.2, rug: 0.48, sheen: 0.8, sheenR: 0.35, con: 0.3 },
  saten: { tile: 40, nf: 0.2, rug: 0.4, sheen: 1, sheenR: 0.3, capa: 0.06, con: 0.3 },
  lino: { tile: 90, nf: 0.9, rug: 0.9, sheen: 0.1, sheenR: 0.8, con: 0.8 },
  elastica: { tile: 35, nf: 0.45, rug: 0.45, sheen: 0.25, sheenR: 0.4, con: 0.4 },
  poliester: { tile: 35, nf: 0.4, rug: 0.5, sheen: 0.3, sheenR: 0.45, con: 0.35 },
  organza: { tile: 20, nf: 0.35, rug: 0.42, sheen: 0.4, sheenR: 0.3, con: 0.5, transp: 0.42 },
  polipiel: { tile: 220, nf: 0.7, rug: 0.36, capa: 0.35, con: 0.6 },
  cuero: { tile: 260, nf: 0.8, rug: 0.45, capa: 0.18, con: 0.8, natural: true },
  ante: { tile: 200, nf: 0.9, rug: 0.95, sheen: 0.8, sheenR: 0.35, con: 0.7, natural: true },
  lana: { tile: 140, nf: 1.2, rug: 0.95, sheen: 0.6, sheenR: 0.5, con: 0.8 },
};
export const PIELES = { maniqui: ['#e9e4dd', 'Maniquí'], clara: ['#f1d3bd', 'Piel clara'], media: ['#d6a47f', 'Piel media'], morena: ['#a7714d', 'Piel morena'], oscura: ['#6b442c', 'Piel oscura'], gris: ['#9aa0a8', 'Gris'] };

export function vista3d(cont, o = {}) {
  const lienzo = document.createElement('canvas'); lienzo.className = 'dw-3d'; cont.appendChild(lienzo);
  const ren = new T.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
  ren.setPixelRatio(Math.min(2, Math.max(1.5, window.devicePixelRatio || 1))); /* (16-10: como mínimo 1,5 píxeles por píxel: bordes y tejido nítidos; la gráfica lo aguanta) */ ren.outputColorSpace = T.SRGBColorSpace; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.0;
  ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFShadowMap;
  const esc = new T.Scene(), pm = new T.PMREMGenerator(ren); esc.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; esc.environmentIntensity = 0.55; pm.dispose();
  const cam = new T.PerspectiveCamera(28, 1, 20, 30000); cam.position.set(900, 1300, 3600);
  const ctl = new T.OrbitControls(cam, lienzo); ctl.enableDamping = true; ctl.dampingFactor = 0.12; ctl.target.set(0, 950, 0); ctl.screenSpacePanning = true; ctl.minDistance = 250; ctl.maxDistance = 9000; ctl.zoomToCursor = true;
  ctl.mouseButtons = { LEFT: T.MOUSE.ROTATE, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.PAN };
  esc.add(new T.HemisphereLight(0xfff6ee, 0x6b6460, 0.7));
  const sol = new T.DirectionalLight(0xfff3e6, 1.9); sol.position.set(1400, 3000, 2200); sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096); sol.shadow.radius = 3;
  Object.assign(sol.shadow.camera, { left: -1300, right: 1300, top: 2300, bottom: -300, near: 100, far: 9000 }); sol.shadow.bias = -0.0008; sol.shadow.normalBias = 7; esc.add(sol);
  const relleno = new T.DirectionalLight(0xdfe8ff, 0.55); relleno.position.set(-2200, 1200, 1200); esc.add(relleno);
  const contra = new T.DirectionalLight(0xffffff, 0.9); contra.position.set(-600, 2200, -2600); esc.add(contra);
  const suelo = new T.Mesh(new T.CircleGeometry(1400, 64), new T.ShadowMaterial({ opacity: 0.18 })); suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; esc.add(suelo);
  const aro = new T.Mesh(new T.RingGeometry(560, 566, 96), new T.MeshBasicMaterial({ color: 0x8a7f74, transparent: true, opacity: 0.35 })); aro.rotation.x = -Math.PI / 2; aro.position.y = 1; esc.add(aro);
  const grupoAv = new T.Group(), grupoTela = new T.Group(); esc.add(grupoAv, grupoTela);
  let avatar = null, H = 1650, girar = false, vivo = true, sucio = true;
  // el maniquí: acabado de maniquí de tienda (lacado satinado), no plástico mate
  const matAv = new T.MeshPhysicalMaterial({ color: new T.Color(PIELES.maniqui[0]), roughness: 0.5, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.42, sheen: 0.15, sheenRoughness: 0.6 });

  function ponAvatar(C, M) {
    if (avatar) { grupoAv.remove(avatar); avatar.geometry.dispose(); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(M.pos, 3)); g.setAttribute('normal', new T.BufferAttribute(M.nor, 3)); g.setIndex(new T.BufferAttribute(M.idx, 1)); g.computeBoundingSphere();
    avatar = new T.Mesh(g, matAv); avatar.castShadow = true; avatar.receiveShadow = true; grupoAv.add(avatar); H = C.H; sucio = true;
    cabeza = PL.cabezaDe(M.pos, C.H); ponPelo();
  }
  // ---------- (17-10) el PELO esculpido (como el de los maniquíes de tienda): ella pidió «más avatares, no solo chicos: también mujeres» y
  // la mujer calva parecía un chico. Se calcula sobre la CABEZA del cuerpo (el elipsoide de lo de arriba de la malla) y se recorta por una
  // línea de nacimiento del pelo que depende del peinado. estilo: 'mono' | 'coleta' | 'melena' | 'corto' | 'no'; color: hex o 'igual' (el del maniquí).
  let cabeza = null, peloG = null, peloEst = { estilo: 'no', color: 'igual' };
  const matPelo = new T.MeshPhysicalMaterial({ color: new T.Color('#3b2a20'), roughness: 0.62, metalness: 0, sheen: 0.7, sheenRoughness: 0.4, sheenColor: new T.Color('#c9b39a'), side: T.DoubleSide });
  function casquete(estilo) {
    const S = new T.SphereGeometry(1, 96, 64), p = S.attributes.position, I = S.index.array, out = [], lim = PL.LINEA[estilo] || PL.LINEA.corto;
    for (let q = 0; q < I.length; q += 3) { let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { const v = I[q + k]; x += p.getX(v); y += p.getY(v); z += p.getZ(v); } const L = Math.hypot(x, y, z) || 1; x /= L; y /= L; z /= L;
      const th = Math.acos(Math.max(-1, Math.min(1, y))) * 180 / Math.PI, f = z / Math.max(1e-6, Math.hypot(x, z)); if (th <= lim(f)) out.push(I[q], I[q + 1], I[q + 2]); }
    S.setIndex(out);
    // la melena cae recta: lo de abajo se separa algo más de la cabeza (volumen) y baja un poco
    if (estilo === 'melena') for (let i = 0; i < p.count; i++) { const [x, y, z] = PL.deformaMelena(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, x, y, z); }
    S.computeVertexNormals(); return S;
  }
  function ponPelo(estilo, color) {
    if (estilo !== undefined) peloEst = { estilo, color: color || 'igual' };
    if (peloG) { grupoAv.remove(peloG); peloG.traverse(o => { if (o.geometry) o.geometry.dispose(); }); peloG = null; }
    const E = peloEst.estilo; sucio = true; if (!cabeza || !E || E === 'no') return;
    const { c, r } = cabeza, m = peloEst.color === 'igual' ? matAv : matPelo; if (m === matPelo) matPelo.color.set(peloEst.color);
    const gr = new T.Group(), gros = PL.grosorPelo(E), cap = new T.Mesh(casquete(E), m); cap.scale.set(r[0] * gros, r[1] * gros, r[2] * gros); cap.castShadow = true; gr.add(cap);
    // (el moño, el nudo y la coleta —un huso que cae hacia la espalda—: los mismos de pelo.js, con los que choca la tela)
    PL.extras(E, r).forEach(X => { const o = X.tipo === 'bola' ? new T.Mesh(new T.SphereGeometry(X.rad, 40, 28), m) : new T.Mesh(new T.CylinderGeometry(X.ra, X.rb, X.L, 28, 1), m);
      o.position.set(X.c[0], X.c[1], X.c[2]); if (X.s) o.scale.set(X.s[0], X.s[1], X.s[2]); if (X.rot) o.rotation.x = X.rot; o.castShadow = true; gr.add(o); });
    gr.position.set(c[0], c[1], c[2]); peloG = gr; grupoAv.add(gr);
  }
  function piel(k) { matAv.color.set((PIELES[k] || PIELES.maniqui)[0]); const lac = !k || k === 'maniqui' || k === 'gris'; matAv.clearcoat = lac ? 0.35 : 0.05; matAv.roughness = lac ? 0.5 : 0.58; matAv.sheen = lac ? 0.15 : 0.35; sucio = true; }
  function verAvatar(si) { grupoAv.visible = si; sucio = true; }
  // las vistas de siempre (como los botones de CLO): frente, espalda, lado, tres cuartos, de cerca a la prenda
  function vista(k, cerca) {
    const y = cerca ? cerca.y : H * 0.52, d = cerca ? cerca.d : H * 2.45, A = { frente: 0, espalda: Math.PI, izq: Math.PI / 2, der: -Math.PI / 2, tres: Math.PI / 5 }[k] ?? Math.PI / 5;
    ctl.target.set(0, y, 0); cam.position.set(Math.sin(A) * d, y + (cerca ? d * 0.12 : H * 0.08), Math.cos(A) * d); ctl.update(); sucio = true;
  }
  const tam = () => { const r = cont.getBoundingClientRect(), w = Math.max(50, r.width), h = Math.max(50, r.height); ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); sucio = true; };
  const ro = new ResizeObserver(tam); ro.observe(cont); tam();
  ctl.addEventListener('change', () => { sucio = true; });
  let cuadro = 0, alPintar = null;
  function bucle() { if (!vivo) return; requestAnimationFrame(bucle);
    if (alPintar) { try { if (alPintar()) sucio = true; } catch (e) { console.error(e); } }
    if (girar) { const a = 0.006, x = cam.position.x - ctl.target.x, z = cam.position.z - ctl.target.z; cam.position.x = ctl.target.x + x * Math.cos(a) - z * Math.sin(a); cam.position.z = ctl.target.z + x * Math.sin(a) + z * Math.cos(a); sucio = true; }
    if (ctl.update()) sucio = true; if (!sucio) return; sucio = false; cuadro++; ren.render(esc, cam); }
  // ---------- las TEXTURAS de las telas (se cargan una vez; al llegar, se repinta) ----------
  const cargador = new T.TextureLoader(), texturas = {}, raizTelas = new URL('../../data/drew/telas/', import.meta.url).href; let manifiesto = null;
  fetch(raizTelas + 'telas.json').then(r => r.json()).then(j => { manifiesto = j; if (tela) tela.metas.forEach(m => ajustaMedia(m.me.material, m.k)); sucio = true; }).catch(() => { });
  function tex(k) { if (texturas[k]) return texturas[k]; const an = ren.capabilities.getMaxAnisotropy(), nom = (ASPECTO[k] && ASPECTO[k].tex) || k;
    const t = q => { const x = cargador.load(raizTelas + nom + '_' + q + '.jpg', () => { sucio = true; }); x.wrapS = x.wrapT = T.RepeatWrapping; x.anisotropy = an; if (q === 'c') x.colorSpace = T.SRGBColorSpace; const rp = 1000 / ((ASPECTO[k] || ASPECTO.punto).tile); x.repeat.set(rp, rp); return x; };
    return (texturas[k] = { c: t('c'), n: t('n'), r: t('r') }); }
  function ajustaMedia(mat, k) { const A = ASPECTO[k] || ASPECTO.punto, M = (manifiesto && manifiesto[A.tex || k]) || { media: 0.5, rug: 0.75 }; mat.userData.u.uMedia.value = M.media; mat.roughness = Math.min(1.6, A.rug / M.rug); }
  // el material de una tela: su relieve, su rugosidad y su brillo; el COLOR elegido tiñe el dibujo de la tela (o 'natural' = el de la foto)
  // (17-10) el brillo de la pelusa, del color de la tela (blanco aclaraba los colores oscuros: un granate salía rosa)
  const brilloDe = c => new T.Color(c).lerp(new T.Color('#ffffff'), 0.3);
  function materialTela(k, color) {
    if (!ASPECTO[k]) k = 'punto'; const A = ASPECTO[k], X = tex(k), nat = color === 'natural';
    const m = new T.MeshPhysicalMaterial({ color: new T.Color(nat ? '#ffffff' : color), map: X.c, normalMap: X.n, normalScale: new T.Vector2(A.nf, A.nf), roughnessMap: X.r, roughness: A.rug, metalness: 0,
      sheen: A.sheen || 0, sheenRoughness: A.sheenR || 0.6, sheenColor: brilloDe(nat ? '#ffffff' : color), anisotropy: A.aniso || 0, clearcoat: A.capa || 0, clearcoatRoughness: 0.35,
      side: T.DoubleSide, vertexColors: true, transparent: !!A.transp, opacity: A.transp || 1, depthWrite: !A.transp });
    m.userData.u = { uMedia: { value: 0.5 }, uPropio: { value: nat ? 1 : 0 }, uCon: { value: A.con } }; ajustaMedia(m, k);
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, m.userData.u);
      sh.fragmentShader = 'uniform float uMedia;\nuniform float uPropio;\nuniform float uCon;\n' + sh.fragmentShader.replace('#include <map_fragment>', [
        '#ifdef USE_MAP', ' vec4 texC = texture2D( map, vMapUv ); float luT = dot( texC.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );',
        ' vec3 detT = vec3( clamp( 1.0 + ( luT / max( uMedia, 0.004 ) - 1.0 ) * uCon, 0.25, 1.8 ) ) * 0.94;', ' diffuseColor.rgb *= mix( detT, texC.rgb, uPropio );',
        A.transp ? ' diffuseColor.a *= clamp( 0.3 + 0.9 * luT / max( uMedia, 0.004 ), 0.0, 1.0 );' : '', '#endif'].join('\n'))
        .replace('#include <color_fragment>', '#include <color_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb *= 0.72;'); };
    m.customProgramCacheKey = () => 'tela' + (A.transp ? 'T' : '') + (A.aniso ? 'A' : '') + (A.capa ? 'C' : '');
    return m;
  }
  // ---------- la TELA: una malla por panel que comparte las posiciones del simulador (se actualiza en cada fotograma) ----------
  let tela = null;
  function ponTela(S, o2 = {}) {
    quitaTela(); const metas = [];
    S.P.forEach((p, ip) => {
      const g = new T.BufferGeometry(), sub = S.pos.subarray(3 * p.off, 3 * (p.off + p.n)), at = new T.BufferAttribute(sub, 3); at.setUsage(T.DynamicDrawUsage); g.setAttribute('position', at);
      const uv = new Float32Array(2 * p.n); for (let i = 0; i < p.n; i++) { uv[2 * i] = S.uv[2 * (p.off + i)] / 1000; uv[2 * i + 1] = S.uv[2 * (p.off + i) + 1] / 1000; } g.setAttribute('uv', new T.BufferAttribute(uv, 2));
      const col = new Float32Array(3 * p.n).fill(1); g.setAttribute('color', new T.BufferAttribute(col, 3));
      const plano = ArrayBuffer.isView(p.tri) ? p.tri : Uint32Array.from(p.tri.flat()), idx = new Uint32Array(plano.length); for (let q = 0; q < plano.length; q++) idx[q] = plano[q] - p.off; g.setIndex(new T.BufferAttribute(idx, 1)); g.computeVertexNormals();
      const k = p.tela || 'punto', m = materialTela(k, (o2.colores && o2.colores[p.pz.nombre]) || o2.color || '#e9e6df');
      const me = new T.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; me.frustumCulled = false; me.userData.panel = ip; grupoTela.add(me); metas.push({ me, g, at, col, p, k });
    });
    // las COSTURAS se ven: una línea fina por cada pareja de puntos cosidos (como el hilo)
    const lp = new Float32Array(S.pares.length * 3), gl = new T.BufferGeometry(); gl.setAttribute('position', new T.BufferAttribute(lp, 3).setUsage(T.DynamicDrawUsage));
    const lineas = new T.LineSegments(gl, new T.LineBasicMaterial({ color: 0x5b4a3a, transparent: true, opacity: 0.55 })); lineas.frustumCulled = false; grupoTela.add(lineas);
    tela = { S, metas, lineas, lp, decales: [] }; sucio = true;
    ponEstampados(o2.estampados);
  }
  function quitaTela() { if (!tela) return; quitaEstampados(); tela.metas.forEach(m => { grupoTela.remove(m.me); m.g.dispose(); m.me.material.dispose(); }); grupoTela.remove(tela.lineas); tela.lineas.geometry.dispose(); tela = null; }
  // (17-10) ESTAMPADOS: una imagen (PNG con transparencia: el logo de la foto de producto o una tuya) sobre una pieza. Las UV de la tela son los
  // mm de la pieza (x desde el centro, y desde el bajo): la imagen se coloca con su CENTRO en (x, y) y mide w × h mm. Va en una malla que comparte
  // la geometría de la pieza (se mueve con la tela) y se dibuja un pelo por delante (polygonOffset). L = [{ pieza, url, x, y, w, h }]
  const texEst = new Map();
  function quitaEstampados() { if (!tela) return; tela.decales.forEach(d => { grupoTela.remove(d); d.material.dispose(); }); tela.decales = []; sucio = true; }
  function ponEstampados(L) {
    if (!tela) return; quitaEstampados();
    (L || []).forEach(E => { if (!E || !E.url || !(E.w > 0) || !(E.h > 0)) return;
      const base = texEst.get(E.url) || (() => { const t = cargador.load(E.url, () => { sucio = true; }); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.anisotropy = ren.capabilities.getMaxAnisotropy(); texEst.set(E.url, t); return t; })();
      tela.metas.filter(m => m.p.pz.nombre === E.pieza || m.p.pz.nombre.startsWith(E.pieza + ' (')).forEach(m => {
        const t = base.clone(); t.needsUpdate = true; t.repeat.set(1000 / E.w, 1000 / E.h); t.offset.set(-(E.x - E.w / 2) / E.w, -(E.y - E.h / 2) / E.h);
        const mat = new T.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.03, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: T.DoubleSide, roughness: 0.62, metalness: 0 });
        // (fuera de la imagen no se pinta nada: la textura «se estira» en los bordes y eso no puede verse)
        mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n#ifdef USE_MAP\n if (vMapUv.x < 0.0 || vMapUv.x > 1.0 || vMapUv.y < 0.0 || vMapUv.y > 1.0) discard;\n#endif'); };
        mat.customProgramCacheKey = () => 'estampado';
        const d = new T.Mesh(m.g, mat); d.frustumCulled = false; d.renderOrder = 2; d.userData.estampado = E; grupoTela.add(d); tela.decales.push(d); }); });
    sucio = true;
  }
  // mapa: null (color de la tela) o Float32Array con lo que se ESTIRA cada punto (0 = nada, 0,1 = 10 %)
  function actualizaTela(mapa) {
    if (!tela) return; const S = tela.S;
    tela.metas.forEach(m => { m.at.needsUpdate = true; m.g.computeVertexNormals(); m.g.attributes.normal.needsUpdate = true; m.g.computeBoundingSphere();
      if (mapa !== undefined) { const c = m.col; for (let i = 0; i < m.p.n; i++) { if (!mapa) { c[3 * i] = c[3 * i + 1] = c[3 * i + 2] = 1; continue; } const e = mapa[m.p.off + i], [r, g, b] = colorEstira(e); c[3 * i] = r; c[3 * i + 1] = g; c[3 * i + 2] = b; } m.g.attributes.color.needsUpdate = true; }
      if (mapa) { m.me.material.color.set('#ffffff'); m.me.material.userData.u.uPropio.value = 0; } });
    const A = S.pares, P = S.pos, L = tela.lp; for (let q = 0; q < A.length; q++) { const i = A[q]; L[3 * q] = P[3 * i]; L[3 * q + 1] = P[3 * i + 1]; L[3 * q + 2] = P[3 * i + 2]; } tela.lineas.geometry.attributes.position.needsUpdate = true;
    sucio = true;
  }
  function colorTela(hex, nombre) { if (!tela) return; const nat = hex === 'natural'; tela.metas.forEach(m => { if (!nombre || m.p.pz.nombre === nombre) { m.me.material.color.set(nat ? '#ffffff' : hex); m.me.material.sheenColor.copy(brilloDe(nat ? '#ffffff' : hex)); m.me.material.userData.u.uPropio.value = nat ? 1 : 0; } }); sucio = true; }
  // la pieza elegida se ve resaltada (como en CLO al tocarla en el 2D)
  function resalta(nombre) { if (!tela) return; tela.metas.forEach(m => { const on = !!nombre && m.p.pz.nombre === nombre; m.me.material.emissive.set(on ? '#6a4fd8' : '#000000'); m.me.material.emissiveIntensity = on ? 0.22 : 0; }); sucio = true; }
  // tocar la tela: qué pieza y qué punto (el vértice más cercano del triángulo tocado)
  const rayo = new T.Raycaster(), nd = new T.Vector2();
  function apunta(ev) { const r = lienzo.getBoundingClientRect(); nd.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); rayo.setFromCamera(nd, cam); }
  function toca(ev) {
    if (!tela) return null; apunta(ev); const hit = rayo.intersectObjects(tela.metas.map(m => m.me), false)[0]; if (!hit) return null;
    const m = tela.metas.find(x => x.me === hit.object), P = tela.S.pos; let mejor = -1, md = Infinity;
    [hit.face.a, hit.face.b, hit.face.c].forEach(k => { const g = m.p.off + k, d = (P[3 * g] - hit.point.x) ** 2 + (P[3 * g + 1] - hit.point.y) ** 2 + (P[3 * g + 2] - hit.point.z) ** 2; if (d < md) { md = d; mejor = g; } });
    return { nombre: m.p.pz.nombre, i: mejor, punto: hit.point.clone() };
  }
  // el punto del ratón sobre el plano que pasa por «punto» de cara a la cámara (para arrastrar la tela)
  function enPlano(ev, punto) { apunta(ev); const n = cam.getWorldDirection(new T.Vector3()), pl = new T.Plane().setFromNormalAndCoplanarPoint(n, punto), out = new T.Vector3(); return rayo.ray.intersectPlane(pl, out) ? [out.x, out.y, out.z] : null; }
  vista('tres'); bucle();
  return {
    T, esc, cam, ctl, ren, grupoTela, grupoAv, lienzo, ponAvatar, piel, verAvatar, ponPelo, get cabeza() { return cabeza; }, vista, ponTela, quitaTela, actualizaTela, colorTela, ponEstampados, resalta, toca, enPlano, get tela() { return tela; },
    set gira(v) { girar = !!v; }, get gira() { return girar; }, set alPintar(f) { alPintar = f; }, marca() { sucio = true; }, get cuadros() { return cuadro; },
    foto(w, h) { if (w && h) { const s0 = ren.getSize(new T.Vector2()), pr0 = ren.getPixelRatio(); ren.setPixelRatio(1); ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); ren.render(esc, cam); const u = lienzo.toDataURL('image/png'); ren.setPixelRatio(pr0); ren.setSize(s0.x, s0.y, false); cam.aspect = s0.x / s0.y; cam.updateProjectionMatrix(); sucio = true; return u; } ren.render(esc, cam); return lienzo.toDataURL('image/png'); },
    pinta() { ren.render(esc, cam); },
    destroy() { vivo = false; ro.disconnect(); ctl.dispose(); ren.dispose(); lienzo.remove(); }
  };
}
