// ================= 28-10-2026 · ✨ ESCAPARATE (en el sitio de CelebriDREW) =================
// Ella: «celebridrew no lo estoy utilizando: quítalo entero y cámbialo por otra cosa que realmente me ayude y beneficie… quiero que te
// inventes algo… que cuando despierte ese apartado sea brutal… funcional, guapo, que me sirva». Vende casi todo por Vinted (45 de sus
// 51 pedidos) y ahí vende la FOTO. Aquí salen fotos de estudio de sus productos con su archivo 3D, en CUALQUIERA DE SUS COLORES (los de
// sus bobinas) y SIN IMPRIMIRLOS:
//  · eliges el producto (o arrastras un STL / 3MF) → color y acabado (mate, seda, mármol, madera…) → escena (fondo blanco para Vinted,
//    estudio, pastel con peana, madera, mármol, noche) → ángulo (o lo giras con el dedo) → 📸 foto cuadrada, vertical o de historia,
//    con tu marca en una esquina;
//  · 🎨 «Todos tus colores»: UNA imagen con el producto en cada color que tienes → «Disponible en N colores» (para el anuncio);
//  · 🎬 vídeo 360° de 6 s (MP4) para Instagram, TikTok o el anuncio;
//  · un 3MF con varias piezas (la base, la mano…) se pinta pieza a pieza, como lo imprimes.
// Todo se hace en el aparato con three.js (MIT, el de CelebriR8) y los acabados de filamento de CelebriR8: no se sube nada a ningún sitio
// salvo que pulses «Guardar en el producto».
import { h, mount, btn, toast, inp, empty, pill } from '../ui.js';
import { S, can, byId } from '../store.js';
import { filesOf, extOf, fetchFile, uploadFile, download, previewUrl, kindOf } from '../files.js';
import { desktop } from '../desktop.js';
import { parse3D, unzip } from '../stl.js';

const CL = window.CL;
const ES_3D = n => ['stl', '3mf', 'obj', 'glb'].includes(extOf(n));
let T = null, E3 = null; // three.js y los acabados de CelebriR8 (se cargan al abrir)
export const ESCENAS = [
  { k: 'blanco', e: '⬜', t: 'Fondo blanco', d: 'para Vinted y Wallapop', fondo: ['#ffffff', '#f1f1f3'], sombra: 0.2 },
  { k: 'estudio', e: '📷', t: 'Estudio', d: 'gris perla', fondo: ['#f5f6f8', '#cfd3da'], sombra: 0.3 },
  { k: 'pastel', e: '🌸', t: 'Pastel', d: 'con peana', fondo: ['#fde4ee', '#e3dbfb'], peana: '#fbfbfd', sombra: 0.22 },
  { k: 'madera', e: '🪵', t: 'Madera', d: 'mesa de casa', fondo: ['#f1e6d6', '#cbb79c'], suelo: 'madera', sombra: 0.4 },
  { k: 'marmol', e: '🏛️', t: 'Mármol', d: 'elegante', fondo: ['#f2f0ed', '#c9c4bd'], suelo: 'marmol', sombra: 0.3 },
  { k: 'noche', e: '🌙', t: 'Noche', d: 'para Instagram', fondo: ['#222a52', '#05060d'], sombra: 0.55, noche: true }
];
export const ANGULOS = [['34', '¾', [0.62, -0.95, 0.52]], ['frente', 'De frente', [0, -1, 0.2]], ['lado', 'De lado', [1, -0.06, 0.2]], ['arriba', 'Desde arriba', [0.22, -0.55, 1.25]]];
export const FORMATOS = [['1:1', 'Cuadrada', 1080, 1080, 'Vinted y Wallapop'], ['4:5', 'Vertical', 1080, 1350, 'Instagram'], ['9:16', 'Historia', 1080, 1920, 'Stories y TikTok']];
const ACABADOS = ['mate', 'pmate', 'seda', 'brillo', 'marmol', 'madera', 'piedra', 'metal', 'transl', 'galaxia'];
const nombreArch = t => String(t || 'producto').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'producto';

// ---------- los colores: primero los de SUS bobinas (lo que puede imprimir hoy), luego la gama básica ----------
function susColores() {
  const vistos = new Map();
  (S.t.bobinas || []).forEach(b => { const c = String(b.color || '').trim(); if (!c || Number(b.restante) <= 0) return; const k = CL.norm(c); if (!vistos.has(k)) vistos.set(k, { t: c, hex: b.colorHex || hexDeNombre(c) }); });
  return [...vistos.values()];
}
function hexDeNombre(nombre) { const k = CL.norm(nombre); const g = ((E3 && E3.COLORES) || []).find(x => CL.norm(x[1]) === k || k.startsWith(CL.norm(x[1]))); return g ? g[0] : '#b9b3ff'; }

// ---------- el 3MF pieza a pieza (cada pieza con su color, como lo imprime ella) ----------
async function partes3MF(buf) {
  const files = await unzip(buf, n => /\.model$|model_settings\.config$|project_settings\.config$/i.test(n)), docs = {};
  const norm = p => String(p || '').replace(/^\//, '');
  let ajustes = null, coloresFil = [];
  for (const name of Object.keys(files)) {
    if (/model_settings\.config$/i.test(name)) { try { ajustes = new DOMParser().parseFromString(new TextDecoder().decode(files[name]), 'application/xml'); } catch (e) { } continue; }
    if (/project_settings\.config$/i.test(name)) { try { const j = JSON.parse(new TextDecoder().decode(files[name])); coloresFil = [].concat(j.filament_colour || []); } catch (e) { } continue; }
    docs[norm(name)] = new DOMParser().parseFromString(new TextDecoder().decode(files[name]), 'application/xml');
  }
  // lo que dice Bambu Studio de cada objeto y de cada parte: con qué filamento va (extrusor) y si es una pieza de verdad o un
  // modificador / bloqueador de soportes (esos no se imprimen: no salen en la foto)
  const cfg = {};
  if (ajustes) for (const o of ajustes.getElementsByTagName('object')) {
    const meta = el => { const m = {}; for (const x of el.children) if (x.tagName === 'metadata' && x.getAttribute('key')) m[x.getAttribute('key')] = x.getAttribute('value'); return m; };
    const mo = meta(o), partes = {};
    for (const p of o.getElementsByTagName('part')) { const mp = meta(p); partes[p.getAttribute('id')] = { tipo: p.getAttribute('subtype') || 'normal_part', ext: Number(mp.extruder) || 0, nombre: mp.name || '' }; }
    cfg[o.getAttribute('id')] = { ext: Number(mo.extruder) || 1, nombre: mo.name || '', partes };
  }
  const hayCfg = Object.keys(cfg).length > 0;
  // la vista MONTADA de Bambu Studio (Ensamblaje): cada objeto en su sitio y derecho (en la cama puede ir tumbado para imprimirlo).
  // Si nunca se montó, Bambu los deja todos en el mismo punto: entonces no sirve y se ponen en fila, como en un escaparate.
  const montaje = {};
  if (ajustes) for (const a of ajustes.getElementsByTagName('assemble_item')) if (a.getAttribute('instance_id') === '0' || a.getAttribute('instance_id') === null && !a.getAttribute('volume_id')) { const t = String(a.getAttribute('transform') || '').trim().split(/\s+/).map(Number); if (t.length === 12 && t.every(isFinite)) montaje[a.getAttribute('object_id')] = t; }
  const ms = Object.values(montaje), usaMontaje = ms.length >= 1 && (ms.length === 1 || ms.some(t => Math.abs(t[9] - ms[0][9]) > 0.5 || Math.abs(t[10] - ms[0][10]) > 0.5));
  const raiz = Object.keys(docs).find(n => /^3D\/3dmodel\.model$/i.test(n)) || Object.keys(docs)[0];
  const matriz = t => { const v = String(t || '').trim().split(/\s+/).map(Number); return v.length === 12 && v.every(isFinite) ? v : null; };
  const compone = (A, B) => { if (!A) return B; if (!B) return A; const M = (m, i, j) => m[i * 3 + j]; const r = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { let x = (i === 3 ? M(B, 3, j) : 0); for (let k = 0; k < 3; k++) x += M(A, i, k) * M(B, k, j); r.push(x); } return r; };
  const objeto = (doc, id) => { for (const o of doc.getElementsByTagName('object')) if (o.getAttribute('id') === String(id)) return o; return null; };
  const grupos = new Map(); let nMalla = 0;
  const pinta = (archivo, id, Tm, prof, top, parte) => {
    const doc = docs[archivo]; if (!doc || prof > 8) return; const o = objeto(doc, id); if (!o) return;
    const mesh = o.getElementsByTagName('mesh')[0];
    if (mesh) {
      const co = cfg[top], cp = co && parte !== null ? co.partes[parte] : null;
      if (cp && cp.tipo !== 'normal_part') return; // modificador, bloqueador de soportes, volumen negativo…
      const ext = (cp && cp.ext) || (co && co.ext) || 1, clave = hayCfg ? 'e' + ext : 'm' + (nMalla++);
      let gr = grupos.get(clave); if (!gr) grupos.set(clave, gr = { ext, nombres: [], trozos: [], hex: hayCfg ? String(coloresFil[ext - 1] || '').slice(0, 7) : '' });
      const nom = (cp && cp.nombre) || (co && co.nombre) || o.getAttribute('name') || ''; if (nom && gr.nombres.length < 4 && !gr.nombres.includes(nom)) gr.nombres.push(nom);
      const out = [], verts = Array.from(mesh.getElementsByTagName('vertex')).map(v => { const x = +v.getAttribute('x'), y = +v.getAttribute('y'), z = +v.getAttribute('z'); return Tm ? [x * Tm[0] + y * Tm[3] + z * Tm[6] + Tm[9], x * Tm[1] + y * Tm[4] + z * Tm[7] + Tm[10], x * Tm[2] + y * Tm[5] + z * Tm[8] + Tm[11]] : [x, y, z]; });
      for (const t of mesh.getElementsByTagName('triangle')) ['v1', 'v2', 'v3'].forEach(a => { const q = verts[+t.getAttribute(a)] || [0, 0, 0]; out.push(q[0], q[1], q[2]); });
      if (out.length) gr.trozos.push({ obj: top, pos: new Float32Array(out) });
      return;
    }
    for (const c of o.getElementsByTagName('component')) { const ruta = c.getAttribute('p:path') || c.getAttributeNS('http://schemas.microsoft.com/3dmanufacturing/production/2015/06', 'path'); pinta(ruta ? norm(ruta) : archivo, c.getAttribute('objectid'), compone(matriz(c.getAttribute('transform')), Tm), prof + 1, top, prof === 0 ? c.getAttribute('objectid') : parte); }
  };
  const items = docs[raiz] ? Array.from(docs[raiz].getElementsByTagName('item')) : [];
  items.forEach(it => { const id = it.getAttribute('objectid'); pinta(raiz, id, usaMontaje && montaje[id] ? montaje[id] : matriz(it.getAttribute('transform')), 0, id, null); });
  // varios objetos sin montar: en fila, apoyados en el suelo, con un hueco entre ellos (en el orden de la cama)
  const objs = [...new Set([...grupos.values()].flatMap(g => g.trozos.map(t => t.obj)))];
  if (objs.length > 1 && !usaMontaje) {
    const caja = {}; objs.forEach(o => { caja[o] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; });
    grupos.forEach(g => g.trozos.forEach(t => { const b = caja[t.obj], P = t.pos; for (let i = 0; i < P.length; i += 3) { if (P[i] < b[0]) b[0] = P[i]; if (P[i + 1] < b[1]) b[1] = P[i + 1]; if (P[i + 2] < b[2]) b[2] = P[i + 2]; if (P[i] > b[3]) b[3] = P[i]; if (P[i + 1] > b[4]) b[4] = P[i + 1]; if (P[i + 2] > b[5]) b[5] = P[i + 2]; } }));
    const orden = objs.slice().sort((a, b) => caja[a][0] - caja[b][0]), anchos = orden.map(o => caja[o][3] - caja[o][0]), hueco = Math.max(3, anchos.reduce((a, b) => a + b, 0) / anchos.length * 0.18);
    let x = 0; const mueve = {}; orden.forEach(o => { const b = caja[o]; mueve[o] = [x - b[0], -(b[1] + b[4]) / 2, -b[2]]; x += (b[3] - b[0]) + hueco; });
    grupos.forEach(g => g.trozos.forEach(t => { const d = mueve[t.obj], P = t.pos; for (let i = 0; i < P.length; i += 3) { P[i] += d[0]; P[i + 1] += d[1]; P[i + 2] += d[2]; } }));
  }
  const une = l => { const n = l.reduce((a, p) => a + p.length, 0), u = new Float32Array(n); let k = 0; l.forEach(p => { u.set(p, k); k += p.length; }); return u; };
  let partes = [...grupos.values()].filter(g => g.trozos.length).sort((a, b) => a.ext - b.ext).map(g => ({ nombre: g.nombres.join(' + ').replace(/\.stl$/i, ''), pos: une(g.trozos.map(t => t.pos)), hex3mf: /^#[0-9a-f]{6}$/i.test(g.hex) ? g.hex : '' }));
  if (!partes.length) return null;
  if (partes.length > 8) { const resto = partes.splice(7); partes.push({ nombre: 'Resto', pos: une(resto.map(p => p.pos)), hex3mf: '' }); }
  return partes;
}
async function leerPiezas(buf, nombre) {
  if (extOf(nombre) === '3mf') { try { const p = await partes3MF(buf); if (p && p.length) return p; } catch (e) { /* se prueba como siempre */ } }
  return [{ nombre: '', pos: await parse3D(buf, nombre) }];
}
// normales suaves en lo curvo y aristas vivas en los cantos (como se ve una pieza impresa)
function normales(pos, umbral = 38) {
  const n = pos.length / 9, fn = new Float32Array(n * 3), nor = new Float32Array(pos.length);
  for (let f = 0; f < n; f++) { const o = f * 9, ux = pos[o + 3] - pos[o], uy = pos[o + 4] - pos[o + 1], uz = pos[o + 5] - pos[o + 2], vx = pos[o + 6] - pos[o], vy = pos[o + 7] - pos[o + 1], vz = pos[o + 8] - pos[o + 2];
    let x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx; const L = Math.hypot(x, y, z) || 1; fn[f * 3] = x / L; fn[f * 3 + 1] = y / L; fn[f * 3 + 2] = z / L; }
  if (n > 450000) { for (let i = 0; i < n * 3; i++) { const f = (i / 3) | 0; nor[i * 3] = fn[f * 3]; nor[i * 3 + 1] = fn[f * 3 + 1]; nor[i * 3 + 2] = fn[f * 3 + 2]; } return nor; } // (muy grandes: facetas, que ya son finas)
  const mapa = new Map(), q = v => Math.round(v * 500), c = Math.cos(umbral * Math.PI / 180);
  for (let i = 0; i < n * 3; i++) { const o = i * 3, k = q(pos[o]) + ',' + q(pos[o + 1]) + ',' + q(pos[o + 2]); let l = mapa.get(k); if (!l) mapa.set(k, l = []); l.push(i); }
  mapa.forEach(l => { for (const i of l) { const f = (i / 3) | 0, fx = fn[f * 3], fy = fn[f * 3 + 1], fz = fn[f * 3 + 2]; let x = 0, y = 0, z = 0;
    for (const j of l) { const g = (j / 3) | 0, gx = fn[g * 3], gy = fn[g * 3 + 1], gz = fn[g * 3 + 2]; if (fx * gx + fy * gy + fz * gz >= c) { x += gx; y += gy; z += gz; } }
    const L = Math.hypot(x, y, z) || 1; nor[i * 3] = x / L; nor[i * 3 + 1] = y / L; nor[i * 3 + 2] = z / L; } });
  return nor;
}

// ---------- texturas hechas aquí mismo (sin descargar nada): degradado de fondo, madera y mármol ----------
function lienzoTex(w, hgt, pinta) { const c = document.createElement('canvas'); c.width = w; c.height = hgt; pinta(c.getContext('2d'), w, hgt); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; }
const texFondo = (a, b, noche) => lienzoTex(64, 512, (g, w, hh) => { const d = g.createLinearGradient(0, 0, 0, hh); d.addColorStop(0, a); d.addColorStop(noche ? 0.75 : 1, b); g.fillStyle = d; g.fillRect(0, 0, w, hh); });
function texMadera() {
  const t = lienzoTex(1024, 1024, (g, w, hh) => {
    const tabla = hh / 6; let semilla = 7; const az = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 6; i++) { const base = [142 + az() * 26, 100 + az() * 18, 66 + az() * 14].map(Math.round); g.fillStyle = 'rgb(' + base.join(',') + ')'; g.fillRect(0, i * tabla, w, tabla);
      for (let k = 0; k < 70; k++) { const y = i * tabla + az() * tabla, o = 0.05 + az() * 0.12; g.strokeStyle = 'rgba(70,40,18,' + o.toFixed(2) + ')'; g.lineWidth = 0.6 + az() * 1.8; g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.006 + k) * (2 + az() * 4)); g.stroke(); }
      g.fillStyle = 'rgba(40,22,10,.35)'; g.fillRect(0, i * tabla, w, 2); }
  });
  t.wrapS = t.wrapT = T.RepeatWrapping; return t;
}
function texMarmol() {
  const t = lienzoTex(1024, 1024, (g, w, hh) => {
    g.fillStyle = '#f3f1ee'; g.fillRect(0, 0, w, hh); let semilla = 11; const az = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 26; k++) { let x = az() * w, y = az() * hh; const o = 0.05 + az() * 0.22; g.strokeStyle = 'rgba(105,100,96,' + o.toFixed(2) + ')'; g.lineWidth = 0.6 + az() * 2.2; g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 26; i++) { x += (az() - 0.3) * 60; y += (az() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  });
  t.wrapS = t.wrapT = T.RepeatWrapping; return t;
}

// ---------- EL MOTOR: la escena, las luces, la cámara y la foto ----------
function crearMotor(lienzo) {
  const ren = new T.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true, alpha: true });
  ren.outputColorSpace = T.SRGBColorSpace; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.02;
  ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFSoftShadowMap;
  const esc = new T.Scene(), pm = new T.PMREMGenerator(ren); esc.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose();
  const cam = new T.PerspectiveCamera(26, 1, 1, 100000); cam.up.set(0, 0, 1);
  const hemi = new T.HemisphereLight(0xffffff, 0x55505a, 0.55); esc.add(hemi);
  const sol = new T.DirectionalLight(0xffffff, 2.1); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 5; sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.02; esc.add(sol); esc.add(sol.target);
  const contra = new T.DirectionalLight(0xffffff, 0.8); esc.add(contra);
  const grupo = new T.Group(); esc.add(grupo);
  const sombra = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShadowMaterial({ opacity: 0.25 })); sombra.receiveShadow = true; esc.add(sombra);
  const suelo = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({ roughness: 0.55, metalness: 0 })); suelo.receiveShadow = true; suelo.visible = false; esc.add(suelo);
  const peana = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 96), new T.MeshStandardMaterial({ color: '#fbfbfd', roughness: 0.42 })); peana.rotation.x = Math.PI / 2; peana.castShadow = peana.receiveShadow = true; peana.visible = false; esc.add(peana);
  const ctl = new T.OrbitControls(cam, lienzo); ctl.enableDamping = true; ctl.dampingFactor = 0.12; ctl.enablePan = false; ctl.rotateSpeed = 0.8;
  const texs = {};
  let caja = null, centro = new T.Vector3(), R = 50, base = 0, dirVista = [0.62, -0.95, 0.52], vivo = true, girar = 0, w0 = 0, h0 = 0, pausa = false;
  const M = {
    ren, esc, cam, ctl, grupo,
    pieza(partes, colores, acabado) {
      grupo.children.slice().forEach(m => { grupo.remove(m); m.geometry.dispose(); m.material.dispose(); });
      partes.forEach((p, i) => {
        if (!p.geo) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p.pos, 3)); g.setAttribute('normal', new T.BufferAttribute(normales(p.pos), 3)); g.computeBoundingBox(); g.computeBoundingSphere(); p.geo = g; }
        const m = new T.Mesh(p.geo, E3.materialAcabado(colores[i] || colores[0] || '#f4f4f2', acabado, false)); m.castShadow = true; m.receiveShadow = true; grupo.add(m);
      });
      grupo.rotation.set(0, 0, 0); grupo.position.set(0, 0, 0);
      caja = new T.Box3().setFromObject(grupo);
      const c = caja.getCenter(new T.Vector3()); grupo.position.set(-c.x, -c.y, -caja.min.z); // la pieza centrada y apoyada en el suelo
      caja = new T.Box3().setFromObject(grupo); centro = caja.getCenter(new T.Vector3()); R = Math.max(1, caja.getSize(new T.Vector3()).length() / 2);
    },
    colores(colores, acabado) { grupo.children.forEach((m, i) => { const old = m.material; m.material = E3.materialAcabado(colores[i] || colores[0], acabado, false); old.dispose(); }); },
    escena(k) {
      const E = ESCENAS.find(x => x.k === k) || ESCENAS[0], tam = R * 40;
      esc.background = texs['f' + k] || (texs['f' + k] = texFondo(E.fondo[0], E.fondo[1], E.noche));
      let z0 = 0;
      peana.visible = !!E.peana;
      if (E.peana) { const r = Math.max(caja ? Math.max(caja.max.x - caja.min.x, caja.max.y - caja.min.y) * 0.72 : R, R * 0.55), alto = Math.max(4, R * 0.16); peana.scale.set(r, alto, r); peana.position.set(0, 0, -alto / 2); z0 = -alto; }
      base = z0;
      sombra.visible = !E.suelo; sombra.material.opacity = E.sombra; sombra.scale.set(tam, tam, 1); sombra.position.set(0, 0, z0 + 0.01);
      suelo.visible = !!E.suelo;
      if (E.suelo) { const tx = texs[E.suelo] || (texs[E.suelo] = E.suelo === 'madera' ? texMadera() : texMarmol()); tx.repeat.set(E.suelo === 'madera' ? 7 : 3, E.suelo === 'madera' ? 7 : 3); suelo.material.map = tx; suelo.material.roughness = E.suelo === 'marmol' ? 0.22 : 0.62; suelo.material.needsUpdate = true; suelo.scale.set(R * 14, R * 14, 1); suelo.position.set(0, 0, z0); }
      // luces: la del sol con sombra suave; la de contorno (de color, de noche)
      sol.intensity = E.noche ? 1.6 : 2.1; contra.color.set(E.noche ? '#7f8cff' : '#ffffff'); contra.intensity = E.noche ? 2.4 : 0.8; hemi.intensity = E.noche ? 0.25 : 0.55;
      esc.environmentIntensity = E.noche ? 0.35 : 1;
      M.luces();
    },
    luces() {
      const c = centro, d = R * 4;
      sol.position.set(c.x + d * 0.55, c.y - d * 0.75, c.z + d); sol.target.position.copy(c);
      const sc = sol.shadow.camera; sc.left = sc.bottom = -R * 1.8; sc.right = sc.top = R * 1.8; sc.near = d * 0.2; sc.far = d * 3; sc.updateProjectionMatrix();
      contra.position.set(c.x - d * 0.7, c.y + d * 0.9, c.z + d * 0.45);
    },
    vista(dir) { if (dir) dirVista = dir; M.encuadra(); },
    encuadra(aspecto) {
      const asp = aspecto || (cam.aspect || 1), c = centro.clone(); c.z = (centro.z + base) / 2 + (centro.z - base) * 0.15;
      const fov = T.MathUtils.degToRad(cam.fov), fovH = 2 * Math.atan(Math.tan(fov / 2) * asp), a = Math.min(fov, fovH);
      let d = R / Math.sin(a / 2) * 1.08; const dir = new T.Vector3(...dirVista).normalize();
      const pon = () => { cam.position.copy(c.clone().add(dir.clone().multiplyScalar(d))); cam.near = d / 100; cam.far = d * 40; cam.lookAt(c); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); };
      pon();
      if (caja) for (let k = 0; k < 3; k++) { // que ocupe ≈ el 78 % de la foto (con la peana, si la hay)
        let mx = 0; for (let i = 0; i < 8; i++) { const p = new T.Vector3(i & 1 ? caja.max.x : caja.min.x, i & 2 ? caja.max.y : caja.min.y, i & 4 ? caja.max.z : Math.min(caja.min.z, base)).project(cam); mx = Math.max(mx, Math.abs(p.x), Math.abs(p.y)); }
        if (!(mx > 0) || !isFinite(mx)) break; d *= mx / 0.78; pon(); }
      ctl.target.copy(c); ctl.minDistance = d * 0.35; ctl.maxDistance = d * 3; ctl.update();
    },
    tam(w, hgt) { if (w === w0 && hgt === h0) return; w0 = w; h0 = hgt; ren.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); ren.setSize(w, hgt, false); cam.aspect = w / hgt; cam.updateProjectionMatrix(); },
    girar(v) { girar = v ? 1 : 0; },
    // fotos de ancho × alto (lo que se ve, pero a ese tamaño): el tamaño se pone una vez para toda la serie
    async enTam(w, hgt, fn, sinFondo) {
      const pr = ren.getPixelRatio(), aw = w0, ah = h0, asp0 = cam.aspect, fondo = esc.background; pausa = true; if (sinFondo) { esc.background = null; ren.setClearColor(0x000000, 0); }
      ren.setPixelRatio(1); ren.setSize(w, hgt, false); cam.aspect = w / hgt; cam.updateProjectionMatrix();
      try { return await fn(() => { ren.render(esc, cam); return lienzo; }); }
      finally { if (sinFondo) esc.background = fondo; ren.setPixelRatio(pr); ren.setSize(aw, ah, false); cam.aspect = asp0; cam.updateProjectionMatrix(); pausa = false; }
    },
    foto(w, hgt) { return M.enTam(w, hgt, r => { const l = r(), c = document.createElement('canvas'); c.width = w; c.height = hgt; c.getContext('2d').drawImage(l, 0, 0, w, hgt); return c; }); },
    giro(a) { grupo.rotation.z = a; }, // para el vídeo 360°
    centro: () => centro, radio: () => R,
    destruye() { vivo = false; ctl.dispose(); grupo.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); Object.values(texs).forEach(t => t.dispose()); ren.dispose(); }
  };
  (function bucle() { if (!vivo) return; if (!pausa) { if (girar) grupo.rotation.z += 0.006; ctl.update(); ren.render(esc, cam); } requestAnimationFrame(bucle); })();
  return M;
}
// la marca en una esquina (el nombre de su empresa)
function conMarca(c, escenaK, si) {
  if (!si) return c;
  const g = c.getContext('2d'), nombre = ((S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'CelebriDiseños').trim(), noche = (ESCENAS.find(x => x.k === escenaK) || {}).noche;
  const t = Math.round(c.width * 0.03); g.font = '600 ' + t + 'px system-ui, -apple-system, Segoe UI, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'bottom';
  g.fillStyle = noche ? 'rgba(255,255,255,.78)' : 'rgba(30,30,40,.55)'; g.fillText(nombre, c.width - t * 1.2, c.height - t * 1.0);
  return c;
}
const aBlob = (c, tipo = 'image/png', q) => new Promise(res => c.toBlob(res, tipo, q));

export function render(el) {
  const st = { prod: null, archivos: [], archivo: null, partes: [], colores: ['#f4f4f2'], nombresCol: ['Blanco'], parteSel: -1, acabado: 'mate', escena: 'blanco', angulo: '34', formato: '1:1', marca: true, girar: false, busca: '', ocupado: false };
  const lienzo = h('canvas.esc-cv', { 'aria-label': 'Vista 3D del producto' });
  const escenario = h('div.esc-escenario', lienzo, h('div.esc-velo', h('div.esc-velo-in', h('span.e', '✨'), h('b', 'Elige un producto'), h('span', 'o arrastra aquí su STL o 3MF'))));
  const lista = h('div.esc-lista'), busca = inp({ type: 'search', placeholder: '🔎 Buscar producto…', class: 'inp esc-busca', 'aria-label': 'Buscar producto' });
  const panel = h('div.esc-panel'), acciones = h('div.esc-acciones'), aviso = h('div.esc-aviso');
  const elegir = h('input', { type: 'file', accept: '.stl,.3mf,.obj,.glb', hidden: true });
  el.append(
    h('div.page-head', h('div', h('h1', '✨ Escaparate'), h('div.muted.small', 'Fotos de estudio y vídeo 360° de tus productos en cualquiera de tus colores, sin imprimirlos. Para Vinted, Wallapop e Instagram.'))),
    h('div.esc', h('aside.esc-prod', busca, lista, h('button.esc-subir', { type: 'button', onclick: () => elegir.click() }, '🧊 Usar un STL o 3MF de mi ordenador'), elegir),
      h('section.esc-main', escenario, acciones, aviso, panel)));
  let M = null;
  const listo = (async () => { T = await import('../../vendor/three/three_r8.js'); E3 = await import('../r8/escena3d.js'); M = crearMotor(lienzo); ajusta(); M.escena(st.escena); window.__esc = { st, M }; })();
  const ajusta = () => { if (!M) return; const F = FORMATOS.find(x => x[0] === st.formato), w = Math.max(240, escenario.clientWidth || 600), hgt = Math.round(w * F[3] / F[2]); const max = Math.max(300, window.innerHeight * 0.66), ww = hgt > max ? Math.round(max * F[2] / F[3]) : w, hh = Math.min(hgt, max);
    lienzo.style.width = ww + 'px'; lienzo.style.height = hh + 'px'; M.tam(ww, hh); if (st.partes.length) M.encuadra(ww / hh); };
  const ro = new ResizeObserver(() => ajusta()); ro.observe(escenario);
  busca.addEventListener('input', () => { st.busca = busca.value; pintaLista(); });
  elegir.onchange = () => { const f = elegir.files[0]; elegir.value = ''; if (f) usaArchivoSuelto(f); };
  escenario.addEventListener('dragover', e => { e.preventDefault(); escenario.classList.add('on'); });
  escenario.addEventListener('dragleave', () => escenario.classList.remove('on'));
  escenario.addEventListener('drop', e => { e.preventDefault(); escenario.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) usaArchivoSuelto(f, st.prod); });

  // ===== los productos (los que tienen su 3D primero) =====
  const archivos3D = p => filesOf('productos', p.id).filter(a => ES_3D(a.nombre)).map(a => ({ nombre: a.nombre, a })).sort((x, y) => (extOf(y.nombre) === '3mf') - (extOf(x.nombre) === '3mf'));
  const fotoDe = p => { const f = (p.fotoId && byId('archivos', p.fotoId)) || filesOf('productos', p.id).find(a => kindOf(a.nombre) === 'foto'); if (!f) return null; const img = h('img', { alt: '', loading: 'lazy' }); Promise.resolve(previewUrl(f)).then(u => { if (u) img.src = u; }).catch(() => { }); return img; };
  function pintaLista() {
    const q = CL.norm(st.busca), L = (S.t.productos || []).filter(p => String(p.nombre || '').trim() && CL.norm(p.estado) !== 'retirado' && (!q || CL.norm(p.nombre).includes(q)))
      .map(p => ({ p, n3: archivos3D(p).length, pc: !!(desktop.on && p.ruta) })).sort((a, b) => ((b.n3 || b.pc) ? 1 : 0) - ((a.n3 || a.pc) ? 1 : 0) || String(a.p.nombre).localeCompare(String(b.p.nombre), 'es'));
    mount(lista, L.length ? L.map(({ p, n3, pc }) => { const u = fotoDe(p); return h('button.esc-item' + (st.prod && st.prod.id === p.id ? '.on' : ''), { type: 'button', 'data-id': p.id, onclick: () => eligeProducto(p) },
      u || h('span.esc-sinfoto', '🧊'), h('span.esc-item-t', h('b', p.nombre), h('small', n3 ? '🧊 con su 3D' : pc ? '🧊 su 3D en este PC' : 'sin archivo 3D'))); })
      : empty('box', 'No hay productos', 'Crea tus productos en «Productos» o arrastra un STL o 3MF aquí al lado.'));
  }
  async function eligeProducto(p) {
    st.prod = p; pintaLista(); st.archivos = archivos3D(p);
    if (!st.archivos.length && desktop.on && p.ruta) { try { const r = await desktop.list(p.ruta); let L = (r.entries || []).filter(e => e.type === 'file' && ES_3D(e.name)); for (const d of (r.entries || []).filter(e => e.type === 'dir')) { try { const sub = await desktop.list(d.path); L = L.concat((sub.entries || []).filter(e => e.type === 'file' && ES_3D(e.name))); } catch (e) { } } st.archivos = L.map(e => ({ nombre: e.name, ruta: e.path })).sort((x, y) => (extOf(y.nombre) === '3mf') - (extOf(x.nombre) === '3mf')); } catch (e) { } }
    if (!st.archivos.length) { mount(aviso, h('div.esc-falta', h('b', '🧊 «' + p.nombre + '» todavía no tiene su archivo 3D'), h('span', 'Arrástralo encima de la vista (STL o 3MF) o pulsa el botón: se ve al momento' + (can('archivos.subir') ? ' y se guarda en el producto para la próxima vez.' : '.')), btn('Elegir el archivo', () => elegir.click(), { cls: 'sm primary' }))); return; }
    mount(aviso); await cargaArchivo(st.archivos[0]);
  }
  async function usaArchivoSuelto(f, prod) {
    if (!ES_3D(f.name)) return toast('Tiene que ser un STL, 3MF u OBJ.', 'warn');
    const buf = await f.arrayBuffer();
    if (prod && can('archivos.subir')) uploadFile(f, { entidad: 'productos', entidadId: prod.id }).then(() => toast('📎 Guardado en «' + prod.nombre + '»', 'ok', 4000)).catch(() => { });
    if (!prod) { st.prod = null; st.archivo = null; st.suelto = f.name; pintaLista(); }
    mount(aviso); await cargaBytes(buf, f.name);
  }
  async function cargaArchivo(x) {
    st.archivo = x; mount(aviso, h('p.small.muted', 'Cargando el 3D…'));
    try { const buf = x.ruta ? await desktop.file(x.ruta) : await (await fetchFile(x.a)).arrayBuffer(); mount(aviso); await cargaBytes(buf, x.nombre); }
    catch (e) { mount(aviso, h('p.bad-t', '⚠️ No se puede abrir «' + x.nombre + '»: ' + (e.message || e))); }
  }
  async function cargaBytes(buf, nombre) {
    await listo; escenario.classList.add('cargando');
    try {
      const partes = await leerPiezas(buf, nombre);
      st.partes = partes; st.parteSel = -1;
      // colores de salida: los que trae el 3MF (cada pieza con su filamento, como en Bambu Studio), puestos en el color más
      // parecido de SUS bobinas; si no trae, el del producto (o su primera bobina) y, en la 2.ª pieza, uno que contraste
      const mis = susColores(), pc = st.prod && st.prod.color ? mis.find(c => CL.norm(c.t) === CL.norm(st.prod.color)) : null, c0 = pc || mis[0] || { t: 'Blanco', hex: '#f4f4f2' };
      const rgb = x => { const v = parseInt(String(x).slice(1, 7), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }, dist = (a, b) => { const p = rgb(a), q = rgb(b); return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; };
      const gama = ((E3 && E3.COLORES) || []).map(([hex, t]) => ({ hex, t })), cerca = hex => { const L = mis.length ? mis : gama; let m = L[0] || c0; L.forEach(c => { if (dist(c.hex, hex) < dist(m.hex, hex)) m = c; }); return m; };
      const luz = x => { const [r, g, b] = rgb(x); return 0.3 * r + 0.59 * g + 0.11 * b; }, contraste = mis.slice().sort((a, b) => Math.abs(luz(b.hex) - luz(c0.hex)) - Math.abs(luz(a.hex) - luz(c0.hex)))[0] || c0;
      const salida = partes.map((p, i) => p.hex3mf ? cerca(p.hex3mf) : i === 0 ? c0 : i === 1 ? contraste : c0);
      st.colores = salida.map(c => c.hex); st.nombresCol = salida.map(c => c.t);
      M.pieza(partes, st.colores, st.acabado); M.escena(st.escena); M.vista((ANGULOS.find(a => a[0] === st.angulo) || ANGULOS[0])[2]); ajusta();
      escenario.classList.add('hay'); pintaPanel(); pintaAcciones();
      window.__esc.listo = true; window.__esc.triangulos = partes.reduce((a, p) => a + p.pos.length / 9, 0);
    } catch (e) { mount(aviso, h('p.bad-t', '⚠️ ' + (e.message || e))); }
    finally { escenario.classList.remove('cargando'); }
  }

  // ===== las opciones: color (por pieza), acabado, escena, ángulo, formato, marca =====
  function pintaPanel() {
    const mis = susColores(), gama = (E3.COLORES || []).filter(([hex, t]) => !mis.some(m => CL.norm(m.t) === CL.norm(t))).map(([hex, t]) => ({ t, hex }));
    const sel = i => st.parteSel === -1 || st.parteSel === i;
    const ponColor = c => { st.partes.forEach((_, i) => { if (sel(i)) { st.colores[i] = c.hex; st.nombresCol[i] = c.t; } }); M.colores(st.colores, st.acabado); pintaPanel(); };
    const chipColor = c => h('button.esc-col' + (st.partes.some((_, i) => sel(i) && CL.norm(st.nombresCol[i]) === CL.norm(c.t)) ? '.on' : ''), { type: 'button', title: c.t, 'data-color': c.t, onclick: () => ponColor(c) }, h('i', { style: { background: c.hex } }), h('span', c.t));
    const grupoOp = (t, hijos, extra) => h('div.esc-op', h('div.esc-op-t', t, extra || null), h('div.esc-op-l', hijos));
    mount(panel,
      st.partes.length > 1 ? grupoOp('🧩 Piezas', [h('button.esc-chip' + (st.parteSel === -1 ? '.on' : ''), { type: 'button', onclick: () => { st.parteSel = -1; pintaPanel(); } }, 'Todas')].concat(st.partes.map((p, i) =>
        h('button.esc-chip' + (st.parteSel === i ? '.on' : ''), { type: 'button', 'data-parte': i, onclick: () => { st.parteSel = i; pintaPanel(); } }, h('i.esc-dot', { style: { background: st.colores[i] } }), p.nombre && p.nombre.length < 18 ? p.nombre : 'Pieza ' + (i + 1)))), h('small', ' elige una pieza y luego su color')) : null,
      grupoOp('🎨 Tus colores', mis.length ? mis.map(chipColor) : [h('span.small.muted', 'Apunta tus bobinas en Mi almacén y salen aquí.')]),
      h('details.esc-mas', { open: !mis.length }, h('summary', 'Más colores'), h('div.esc-op-l', gama.map(chipColor))),
      grupoOp('✨ Acabado', ACABADOS.filter(k => E3.ACABADOS[k]).map(k => h('button.esc-chip' + (st.acabado === k ? '.on' : ''), { type: 'button', 'data-acabado': k, onclick: () => { st.acabado = k; M.colores(st.colores, st.acabado); pintaPanel(); } }, E3.ACABADOS[k].t.replace(/\s*\(.*\)$/, '')))),
      grupoOp('🖼️ Escena', ESCENAS.map(E => h('button.esc-esc' + (st.escena === E.k ? '.on' : ''), { type: 'button', 'data-escena': E.k, onclick: () => { st.escena = E.k; M.escena(E.k); M.encuadra(); pintaPanel(); } },
        h('i', { style: { background: 'linear-gradient(180deg,' + E.fondo[0] + ',' + E.fondo[1] + ')' } }, E.e), h('b', E.t), h('small', E.d)))),
      grupoOp('📐 Ángulo', ANGULOS.map(([k, t, dir]) => h('button.esc-chip' + (st.angulo === k ? '.on' : ''), { type: 'button', 'data-angulo': k, onclick: () => { st.angulo = k; M.vista(dir); pintaPanel(); } }, t)).concat([
        h('button.esc-chip' + (st.girar ? '.on' : ''), { type: 'button', onclick: () => { st.girar = !st.girar; M.girar(st.girar); pintaPanel(); } }, st.girar ? '⏸ Parar' : '🔄 Que gire')]), h('small', ' · o arrástrala con el dedo')),
      grupoOp('📱 Formato', FORMATOS.map(([k, t, w, hh, d]) => h('button.esc-chip' + (st.formato === k ? '.on' : ''), { type: 'button', 'data-formato': k, title: d, onclick: () => { st.formato = k; ajusta(); pintaPanel(); } }, t, h('small', ' ' + k)))
        .concat([h('label.esc-marca', h('input', { type: 'checkbox', checked: st.marca, onchange: e => { st.marca = e.target.checked; } }), ' Mi marca en la esquina')])));
  }

  // ===== lo que sale: la foto, todos los colores, el vídeo 360° y guardarlo en el producto =====
  const base = () => nombreArch(st.prod ? st.prod.nombre : st.archivo ? st.archivo.nombre.replace(/\.[a-z0-9]+$/i, '') : 'producto');
  const ocupa = async (b, txt, fn) => { if (st.ocupado) return; st.ocupado = true; const t0 = b.innerHTML; b.disabled = true; b.textContent = txt; try { await fn(); } catch (e) { toast(e.message || String(e), 'bad', 8000); } finally { st.ocupado = false; b.disabled = false; b.innerHTML = t0; } };
  async function foto() { const F = FORMATOS.find(x => x[0] === st.formato); return conMarca(await M.foto(F[2], F[3]), st.escena, st.marca); }
  async function todosColores() {
    let cols = susColores(); if (cols.length < 2) cols = (E3.COLORES || []).slice(0, 6).map(([hex, t]) => ({ hex, t }));
    cols = cols.slice(0, 9);
    const nC = cols.length <= 4 ? 2 : 3, filas = Math.ceil(cols.length / nC), W = 1080, tile = Math.floor(W / nC), cab = 150, pie = 70, out = document.createElement('canvas'); out.width = W; out.height = cab + filas * tile + pie;
    const g = out.getContext('2d'), E = ESCENAS.find(x => x.k === st.escena) || ESCENAS[0], noche = E.noche;
    const fondo = g.createLinearGradient(0, 0, 0, out.height); fondo.addColorStop(0, E.fondo[0]); fondo.addColorStop(1, E.fondo[1]); g.fillStyle = fondo; g.fillRect(0, 0, W, out.height);
    g.fillStyle = noche ? '#ffffff' : '#1d1d26'; g.textAlign = 'center'; g.font = '700 46px system-ui, -apple-system, Segoe UI, sans-serif'; g.fillText(st.prod ? st.prod.nombre : (st.archivo ? st.archivo.nombre : st.suelto || 'Mi producto').replace(/\.[a-z0-9]+$/i, '').replace(/[_+]+/g, ' ').slice(0, 40), W / 2, 70);
    g.font = '500 30px system-ui, -apple-system, Segoe UI, sans-serif'; g.fillStyle = noche ? 'rgba(255,255,255,.75)' : 'rgba(30,30,40,.65)'; g.fillText('Disponible en ' + cols.length + ' colores', W / 2, 118);
    const antes = st.colores.slice(), acab = st.acabado;
    await M.enTam(tile, tile, async r => { for (let i = 0; i < cols.length; i++) {
      M.colores(st.partes.map((_, k) => st.partes.length > 1 && st.parteSel !== -1 && k !== st.parteSel ? antes[k] : cols[i].hex), acab);
      const c = r(), x = (i % nC) * tile, y = cab + Math.floor(i / nC) * tile; g.drawImage(c, x, y, tile, tile);
      g.fillStyle = noche ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.82)'; const tw = Math.min(tile - 40, 26 * cols[i].t.length + 60); g.beginPath(); g.roundRect ? g.roundRect(x + (tile - tw) / 2, y + tile - 70, tw, 46, 23) : g.rect(x + (tile - tw) / 2, y + tile - 70, tw, 46); g.fill();
      g.fillStyle = cols[i].hex; g.beginPath(); g.arc(x + (tile - tw) / 2 + 26, y + tile - 47, 11, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = noche ? '#fff' : '#1d1d26'; g.font = '600 26px system-ui, -apple-system, Segoe UI, sans-serif'; g.textAlign = 'center'; g.fillText(cols[i].t, x + tile / 2 + 12, y + tile - 38);
      await new Promise(rr => setTimeout(rr, 0));
    } }, !E.suelo);
    M.colores(antes, acab);
    if (st.marca) { g.font = '600 30px system-ui, -apple-system, Segoe UI, sans-serif'; g.textAlign = 'center'; g.fillStyle = noche ? 'rgba(255,255,255,.7)' : 'rgba(30,30,40,.5)'; g.fillText(((S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'CelebriDiseños').trim(), W / 2, out.height - 26); }
    return { c: out, n: cols.length };
  }
  async function video360(prog) {
    const F = FORMATOS.find(x => x[0] === st.formato), W = F[2] === 1080 && F[3] > 1400 ? 720 : 1080, H = Math.round(W * F[3] / F[2]), fps = 30, N = fps * 6;
    const out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d'), rot0 = M.grupo.rotation.z;
    let blob = null, ext = 'mp4';
    await M.enTam(W, H, async r => {
    const dibuja = f => { M.giro(rot0 + f / N * Math.PI * 2); g.drawImage(r(), 0, 0, W, H); conMarca(out, st.escena, st.marca); if (prog) prog(f / N); };
    try { const V = await import('../video_mp4.js'); blob = await V.mp4DeLienzo(out, N, fps, async f => { dibuja(f); if (f % 15 === 0) await new Promise(r => setTimeout(r, 0)); }); } catch (e) { blob = null; }
    if (!blob) { // sin WebCodecs: se graba en directo (WebM)
      const tipo = ['video/webm;codecs=vp9', 'video/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)); if (!tipo) throw new Error('Este navegador no sabe hacer vídeos. Prueba en el programa del PC o en Chrome.');
      const rec = new MediaRecorder(out.captureStream(fps), { mimeType: tipo, videoBitsPerSecond: 10e6 }), trozos = []; rec.ondataavailable = e => e.data.size && trozos.push(e.data);
      const fin = new Promise(r => { rec.onstop = r; }); rec.start(); const t0 = performance.now();
      await new Promise(res => { const paso = () => { const f = Math.min(N, Math.round((performance.now() - t0) / 1000 * fps)); dibuja(f); if (f >= N) return res(); requestAnimationFrame(paso); }; paso(); });
      rec.stop(); await fin; blob = new Blob(trozos, { type: 'video/webm' }); ext = 'webm';
    }
    });
    M.giro(rot0); return { blob, ext };
  }
  function pintaAcciones() {
    const bFoto = btn('📸 Descargar la foto', ev => ocupa(ev.currentTarget, 'Haciendo la foto…', async () => { const c = await foto(); const b = await aBlob(c); download(b, base() + '_' + nombreArch(st.nombresCol[0]) + '_' + st.escena + '.png'); window.__esc.foto = { w: c.width, h: c.height }; toast('📸 Foto lista (' + c.width + ' × ' + c.height + ')', 'ok'); }), { cls: 'primary esc-foto' });
    const bTodos = btn('🎨 Foto con todos tus colores', ev => ocupa(ev.currentTarget, 'Pintando cada color…', async () => { const r = await todosColores(); const b = await aBlob(r.c, 'image/jpeg', 0.92); download(b, base() + '_todos_los_colores.jpg'); window.__esc.todos = { n: r.n, w: r.c.width, h: r.c.height }; toast('🎨 Lista: «Disponible en ' + r.n + ' colores»', 'ok'); }), { cls: 'esc-todos' });
    const bVideo = btn('🎬 Vídeo 360°', ev => { const b = ev.currentTarget; ocupa(b, 'Grabando…', async () => { const r = await video360(p => { b.textContent = '🎬 Grabando… ' + Math.round(p * 100) + ' %'; }); download(r.blob, base() + '_360.' + r.ext); window.__esc.video = { tipo: r.ext, bytes: r.blob.size }; toast('🎬 Vídeo de 6 s listo (' + r.ext.toUpperCase() + ')', 'ok'); }); }, { cls: 'esc-video' });
    const bGuarda = st.prod && can('archivos.subir') ? btn('💾 Guardar la foto en el producto', ev => ocupa(ev.currentTarget, 'Guardando…', async () => { const c = await foto(); const b = await aBlob(c, 'image/jpeg', 0.92); await uploadFile(new File([b], base() + '_' + st.escena + '.jpg', { type: 'image/jpeg' }), { entidad: 'productos', entidadId: st.prod.id }); toast('💾 Guardada en las fotos de «' + st.prod.nombre + '»', 'ok', 6000); }), { cls: 'ghost esc-guarda' }) : null;
    mount(acciones, bFoto, bTodos, bVideo, bGuarda, st.archivos.length > 1 ? h('select.inp.sm.esc-arch', { 'aria-label': 'Archivo 3D', onchange: e => cargaArchivo(st.archivos[Number(e.target.value)]) }, st.archivos.map((x, i) => h('option', { value: i, selected: x === st.archivo }, x.nombre))) : null);
  }
  pintaLista();
  return { destroy: () => { ro.disconnect(); if (M) M.destruye(); delete window.__esc; } };
}
