// ================= v20.1 · EL ESTRENO DE LA 20: «MIRA CÓMO NACE» =================
// La primera vez que se abre la 20 se apaga la sala y en una cama de impresora en 3D se IMPRIME un «20» capa a capa, con su
// boquilla de luz recorriendo cada capa y el zumbido de los motores (hecho aquí, sin archivos). Al acabar, la pieza se
// enciende, suena el acorde y aparece lo nuevo de la 20 (cada cosa lleva a su sitio de CelebriR8).
// Se puede saltar. No sale en las pruebas automáticas (navigator.webdriver). Si el aparato no tiene 3D, va directo a lo nuevo.
// three.js (MIT) ya viene con CelebriR8: vendor/three. Se carga solo al abrir el estreno.
import { h, btn } from './ui.js';
import { reducido } from './ui14.js';

const VISTO = 'cd.estreno20';
const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
export const debeEstrenar20 = () => !leer(VISTO) && !navigator.webdriver;

// ---------- el sonido: motores paso a paso mientras imprime, y el acorde al terminar ----------
function sonido() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    const ac = new A(), m = ac.createGain(); m.gain.value = 0.35; m.connect(ac.destination);
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = 420; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3; g.gain.value = 0.0001;
    o.connect(f); f.connect(g); g.connect(m); o.start();
    let vivo = true;
    return {
      motor(v) { // v: velocidad 0..1 → tono y volumen del zumbido
        if (!vivo) return; const t = ac.currentTime;
        o.frequency.setTargetAtTime(300 + v * 520, t, 0.04); g.gain.setTargetAtTime(v > 0 ? 0.035 + v * 0.03 : 0.0001, t, 0.05);
      },
      final() {
        if (!vivo) return; const t = ac.currentTime + 0.03;
        g.gain.setTargetAtTime(0.0001, t, 0.03);
        const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'sine'; b.frequency.setValueAtTime(98, t); b.frequency.exponentialRampToValueAtTime(41, t + 0.8);
        bg.gain.setValueAtTime(0.8, t); bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); b.connect(bg); bg.connect(m); b.start(t); b.stop(t + 1.3);
        [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((fr, i) => { const c = ac.createOscillator(), cg = ac.createGain(); c.type = i % 2 ? 'triangle' : 'sine'; c.frequency.value = fr; cg.gain.setValueAtTime(0.0001, t + i * 0.06); cg.gain.exponentialRampToValueAtTime(0.09, t + 0.04 + i * 0.06); cg.gain.exponentialRampToValueAtTime(0.0001, t + 3.4); c.connect(cg); cg.connect(m); c.start(t + i * 0.06); c.stop(t + 3.6); });
      },
      cerrar() { vivo = false; try { o.stop(); } catch (e) { } setTimeout(() => { try { ac.close(); } catch (e) { } }, 3800); }
    };
  } catch (e) { return null; }
}

// ---------- el «20» en celdas (como lo cortaría el laminador) ----------
function celdas20() {
  const W = 132, H = 64, c = document.createElement('canvas'), g = c.getContext('2d'); c.width = W; c.height = H;
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 62px Bahnschrift, "Segoe UI", Arial, sans-serif';
  g.fillText('20', W / 2, H / 2 + 3);
  const px = g.getImageData(0, 0, W, H).data, paso = 2, out = [];
  for (let y = 0; y < H; y += paso) {
    const fila = [];
    for (let x = 0; x < W; x += paso) if (px[(y * W + x) * 4 + 3] > 120) fila.push([(x - W / 2) / paso, (H / 2 - y) / paso]);
    if ((y / paso) % 2) fila.reverse(); // ida y vuelta, como la boquilla
    out.push(...fila);
  }
  return out;
}

// opts: { ir(ruta), irR8(pestaña), alCerrar(), rapido (pruebas: sin esperas) }
export function estreno20(opts = {}) {
  if (document.querySelector('.est20')) return null;
  const ir = opts.ir || (r => { location.hash = '#/' + r; });
  const irR8 = opts.irR8 || (k => { guardar('cd.r8.pest', k); if (window.__r8ir && document.querySelector('.r8v')) window.__r8ir(k); else ir('celebrir8'); });
  const rapido = !!opts.rapido || reducido();
  let estado = 'espera', raf = 0, snd = null, R = null;
  const cerrar = (destino) => {
    if (estado === 'cerrado') return; estado = 'cerrado';
    cancelAnimationFrame(raf); guardar(VISTO, '1');
    if (snd) snd.cerrar();
    try { if (R) { R.renderer.dispose(); R.geos.forEach(x => x.dispose()); } } catch (e) { }
    raiz.remove();
    if (destino) irR8(destino);
    if (opts.alCerrar) opts.alCerrar();
  };
  const NOV = [
    ['🏠', 'CelebriR8 profesional', 'Pestañas, modo taller y visita guiada', 'inicio'],
    ['🧪', 'Smart Lab', 'Prueba los motores y elige el mejor', 'lab'],
    ['📏', 'Precision Lab', 'Engranajes y diferencial RC a medida', 'precision'],
    ['🛠️', 'Blender Workshop', 'Repara y deshace, en milímetros', 'taller'],
    ['🩺', 'Print Doctor', 'Listo para tu Bambu, con su 3MF', 'doctor'],
    ['🔑', 'Hugging Face en un paso', 'Pegas tu clave y se prepara todo', 'inicio']
  ];
  const final = h('div.est20-final', h('div.est20-tarjeta',
    h('div.est20-sello', 'VERSIÓN 20'), h('h2', 'Acaba de nacer tu taller en 3D'),
    h('p', 'Lo de siempre sigue en su sitio. Lo nuevo vive en CelebriR8: elige por dónde empezar.'),
    h('div.est20-nov', NOV.map(([e, t, d, k]) => h('button', { type: 'button', 'data-r8': k, onclick: () => cerrar(k) }, h('span', e), h('b', t), h('small', d)))),
    h('div.row.wrap', { style: { gap: '10px', justifyContent: 'center' } },
      btn('🧊 Entrar en CelebriR8', () => cerrar('inicio'), { cls: 'primary est20-entrar' }), btn('Seguir donde estaba', () => cerrar(), { cls: 'ghost est20-seguir' })),
    h('p.tiny', 'Puedes volver a verlo cuando quieras: busca «estreno» (Ctrl K).')));
  const avance = h('div.est20-avance', h('i'));
  const capa = h('div.est20-capa', 'Capa 0 de 0');
  const inicio = h('div.est20-inicio',
    h('div.est20-sello', 'ESTRENO'), h('h1', 'CelebriDiseños ', h('span', '20')), h('p', 'Apaga las luces. Mira cómo nace.'),
    h('button.est20-play', { type: 'button', onclick: () => empezar() }, '▶  Imprimir el 20'),
    h('button.est20-saltar', { type: 'button', onclick: () => cerrar() }, 'Saltar'));
  const lienzo = h('div.est20-3d');
  const raiz = h('div.est20', { role: 'dialog', 'aria-label': 'Estreno de la versión 20' }, lienzo, h('div.est20-hud', capa, avance), inicio, final);
  document.body.appendChild(raiz);

  async function montar() {
    const T = await import('../vendor/three/three_r8.js');
    const W = innerWidth, H = innerHeight;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); renderer.setSize(W, H);
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.outputColorSpace = T.SRGBColorSpace;
    lienzo.appendChild(renderer.domElement);
    const scene = new T.Scene(); scene.fog = new T.FogExp2(0x05070d, 0.0042);
    const cam = new T.PerspectiveCamera(38, W / H, 1, 2000);
    scene.add(new T.HemisphereLight(0x9aa8ff, 0x10121c, 0.9));
    const sol = new T.DirectionalLight(0xffffff, 1.6); sol.position.set(-60, -90, 140); scene.add(sol);
    // la cama: placa oscura con su cuadrícula
    const geos = [];
    const camaG = new T.BoxGeometry(150, 110, 2); geos.push(camaG);
    const cama = new T.Mesh(camaG, new T.MeshStandardMaterial({ color: 0x151a2b, roughness: 0.55, metalness: 0.4 })); cama.position.z = -1; scene.add(cama);
    const rejilla = new T.GridHelper(150, 30, 0x3b4470, 0x222842); rejilla.rotation.x = Math.PI / 2; rejilla.position.z = 0.05; rejilla.scale.set(1, 1, 110 / 150); scene.add(rejilla);
    // la pieza: un cubito por celda y capa (todas juntas en un solo objeto, para que vaya fluido)
    const C = celdas20(), CAPAS = 16, ALTO = 0.9;
    const cuboG = new T.BoxGeometry(1.02, 1.02, ALTO); geos.push(cuboG);
    const mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.15, emissive: 0x000000 });
    const pieza = new T.InstancedMesh(cuboG, mat, C.length * CAPAS); pieza.count = 0; scene.add(pieza);
    const o = new T.Object3D(), col = new T.Color();
    const A = new T.Color(0x8f82ff), B = new T.Color(0xf472b6), Cc = new T.Color(0x22d3ee);
    let i = 0;
    for (let k = 0; k < CAPAS; k++) {
      const t = k / (CAPAS - 1); col.copy(t < 0.5 ? A : B).lerp(t < 0.5 ? B : Cc, t < 0.5 ? t * 2 : (t - 0.5) * 2);
      const filas = k % 2 ? [...C].reverse() : C; // cada capa al revés que la anterior
      for (const [x, y] of filas) { o.position.set(x, y, ALTO / 2 + k * ALTO); o.updateMatrix(); pieza.setMatrixAt(i, o.matrix); pieza.setColorAt(i, col); i++; }
    }
    pieza.instanceMatrix.needsUpdate = true; if (pieza.instanceColor) pieza.instanceColor.needsUpdate = true;
    // la boquilla, con su luz
    const boq = new T.Group();
    const conoG = new T.ConeGeometry(2.2, 4, 24); geos.push(conoG);
    const cono = new T.Mesh(conoG, new T.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.25 })); cono.rotation.x = -Math.PI / 2; cono.position.z = 2.4; boq.add(cono);
    const cajaG = new T.BoxGeometry(6, 6, 4); geos.push(cajaG); // el bloque calefactor, rojo de calor
    const caja = new T.Mesh(cajaG, new T.MeshStandardMaterial({ color: 0x8a95b8, metalness: 0.85, roughness: 0.3, emissive: 0x3a0d06 })); caja.position.z = 6.4; boq.add(caja);
    const tuboG = new T.CylinderGeometry(1, 1, 16, 16); geos.push(tuboG);
    const tubo = new T.Mesh(tuboG, new T.MeshStandardMaterial({ color: 0xb8bec4, metalness: 0.9, roughness: 0.2 })); tubo.rotation.x = Math.PI / 2; tubo.position.z = 16.4; boq.add(tubo);
    const puntaG = new T.SphereGeometry(0.75, 16, 12); geos.push(puntaG);
    const punta = new T.Mesh(puntaG, new T.MeshBasicMaterial({ color: 0xfff1c4 })); punta.position.z = 0.4; boq.add(punta);
    const luz = new T.PointLight(0xffb36b, 900, 60, 2); luz.position.z = 1; boq.add(luz);
    scene.add(boq);
    R = { T, renderer, scene, cam, pieza, boq, luz, mat, C, CAPAS, ALTO, total: i, geos, rejilla };
    return R;
  }

  const DUR = 7200; // milisegundos de impresión
  async function empezar() {
    if (estado !== 'espera') return; estado = 'imprimiendo';
    raiz.classList.add('en-marcha');
    try { await montar(); } catch (e) { console.warn('estreno 20 sin 3D:', e); return fin(); }
    if (estado === 'cerrado') return;
    snd = sonido();
    const t0 = performance.now() - (rapido ? DUR : 0);
    const { renderer, scene, cam, pieza, boq, luz, mat, C, CAPAS, ALTO, total } = R;
    const porCapa = C.length, M4 = new R.T.Matrix4(), P3 = new R.T.Vector3();
    let terminado = 0;
    const cuadro = now => {
      if (estado === 'cerrado') return;
      const t = now - t0, k = Math.min(1, t / DUR);
      // más lento al principio (la primera capa se cuida) y rápido después
      const n = Math.min(total, Math.floor(total * (k < 0.12 ? k * 0.55 : 0.066 + (k - 0.12) / 0.88 * 0.934)));
      pieza.count = Math.max(0, n); pieza.instanceMatrix.needsUpdate = true;
      const capaAhora = Math.min(CAPAS, Math.floor(n / porCapa) + (n < total ? 1 : 0));
      capa.textContent = n < total ? 'Imprimiendo · capa ' + capaAhora + ' de ' + CAPAS : '¡Impreso!';
      avance.firstChild.style.width = (100 * n / total).toFixed(1) + '%';
      if (n < total) {
        pieza.getMatrixAt(Math.max(0, n - 1), M4); P3.setFromMatrixPosition(M4); const p = P3;
        boq.position.set(p.x, p.y, p.z + ALTO / 2 + 0.2); luz.intensity = 700 + Math.random() * 400;
        if (snd) snd.motor(k < 0.12 ? 0.35 : 0.85);
      } else if (!terminado) {
        terminado = now; if (snd) { snd.motor(0); snd.final(); }
        raiz.classList.add('impreso');
      }
      // la cámara rodea la cama por delante y acaba casi de frente (para que el «20» se lea)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, ang = -0.85 + 0.97 * e, dist = 128 - 30 * e;
      cam.position.set(Math.sin(ang) * dist, -Math.cos(ang) * dist, 64 + 20 * (1 - e)); cam.up.set(0, 0, 1); cam.lookAt(0, 4, CAPAS * ALTO * 0.35);
      if (terminado) { // la boquilla se aparta y la pieza se enciende
        const d = (now - terminado) / 1000;
        boq.position.z += 0.6; luz.intensity *= 0.94;
        mat.emissive.setRGB(0.32, 0.25, 0.55).multiplyScalar(Math.max(0, Math.sin(Math.min(Math.PI, d * 2.2))));
        if (d > (rapido ? 0 : 2.2)) return fin();
      }
      renderer.render(scene, cam);
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
  }
  function fin() {
    if (estado === 'cerrado') return; estado = 'final';
    guardar(VISTO, '1');
    raiz.classList.add('fin');
  }
  addEventListener('resize', () => { if (R && estado !== 'cerrado') { R.renderer.setSize(innerWidth, innerHeight); R.cam.aspect = innerWidth / innerHeight; R.cam.updateProjectionMatrix(); } });
  window.__estreno20 = { empezar, cerrar, estado: () => estado, raiz, piezas: () => (R ? { puestas: R.pieza.count, total: R.total } : null) };
  return raiz;
}
