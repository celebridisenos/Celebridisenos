// ================= v12.8 · Taller en vivo: la pieza crece en 3D mientras se imprime =================
// Toma el STL/3MF/OBJ REAL del producto que se está imprimiendo y lo dibuja «cortado» a la altura que lleva
// la impresora (capa actual / capas totales que informa la Bambu). Lo que falta por imprimir se ve como un fantasma
// azulado; la capa que se está haciendo brilla. Si no hay modelo guardado para ese trabajo, NO se inventa nada:
// la pantalla sigue mostrando el anillo de progreso de siempre.
import { S } from './store.js';
import { parse3D } from './stl.js';

const CL = window.CL;
const n = v => Number(v) || 0;
const STL_EXT = ['stl', '3mf', 'obj'];
const extOf = nombre => String(nombre || '').split('.').pop().toLowerCase();
export const MAX_MODELO = 60 * 1048576; // más grande que esto no se dibuja en vivo (tardaría demasiado en la tele)
export const PIEZA = { cargador: null }; // gancho para las pruebas: PIEZA.cargador = async archivo => Blob

// ---------- Qué modelo corresponde al trabajo (función pura: se prueba sola) ----------
export function elegirModelo(job, live, datos) {
  const archivos = ((datos && datos.archivos) || []).filter(a => a.tipo === 'stl' && STL_EXT.includes(extOf(a.nombre)) && !(n(a.tamano) > MAX_MODELO));
  if (!archivos.length) return null;
  const nom = s => CL.norm(String(s || '').replace(/\.(gcode|3mf|stl|obj|bgcode)(\.3mf)?$/i, ''));
  const t = nom(job && job.titulo), lv = nom(live && live.trabajo);
  const pedido = job && job.pedidoId ? ((datos.pedidos || []).find(o => o.id === job.pedidoId) || null) : null;
  let productoId = (job && job.productoId) || (pedido && pedido.productoId) || '';
  if (!productoId) {
    const nombreProd = CL.norm((pedido && pedido.producto) || (job && job.titulo) || '');
    const pr = nombreProd ? (datos.productos || []).find(p => CL.norm(p.nombre) === nombreProd) : null;
    if (pr) productoId = pr.id;
  }
  const mejor = lista => {
    if (!lista.length) return null;
    const porNombre = lista.find(a => { const x = nom(a.nombre); return x && (x === lv || x === t); });
    return porNombre || lista.slice().sort((a, b) => String(b.creado).localeCompare(String(a.creado)))[0];
  };
  if (productoId) { const a = mejor(archivos.filter(x => x.entidad === 'productos' && x.entidadId === productoId)); if (a) return a; }
  if (job && job.pedidoId) { const a = mejor(archivos.filter(x => x.entidad === 'pedidos' && x.entidadId === job.pedidoId)); if (a) return a; }
  // último recurso: el nombre del trabajo de la impresora coincide con el nombre de un STL guardado
  const porNombre = archivos.filter(a => { const x = nom(a.nombre); return x && (x === lv || x === t); });
  return porNombre.length ? mejor(porNombre) : null;
}

// ---------- Hasta dónde ha subido la impresión ----------
// Prioridad: capas reales de la Bambu → % de la impresora → tiempo transcurrido (estimado). Siempre dice de dónde sale.
export function fraccion(live, job, ahora) {
  ahora = ahora || Date.now();
  if (live && live.conectada) {
    const capas = n(live.capas), capa = n(live.capa);
    if (capas > 0 && live.capa !== undefined && live.capa !== '') return { f: Math.max(0, Math.min(1, capa / capas)), fuente: 'capas', texto: 'Capa ' + capa + ' de ' + capas };
    if (live.pct !== undefined && live.pct !== '' && live.pct !== null) return { f: Math.max(0, Math.min(1, n(live.pct) / 100)), fuente: 'porcentaje', texto: Math.round(n(live.pct)) + ' % (aprox.)' };
  }
  if (job && job.inicio && job.finPrevisto) {
    const t0 = new Date(job.inicio).getTime(), t1 = new Date(job.finPrevisto).getTime();
    if (t1 > t0) { const f = Math.max(0, Math.min(1, (ahora - t0) / (t1 - t0))); return { f, fuente: 'tiempo', texto: Math.round(f * 100) + ' % (estimado por tiempo)' }; }
  }
  return { f: 0, fuente: 'ninguna', texto: '' };
}

// ---------- Carga del modelo (con caché pequeña; un fallo se reintenta a los 5 min) ----------
const cache = new Map();
export function cargarModelo(a) {
  const hit = cache.get(a.id);
  if (hit && (!hit.error || Date.now() - hit.t < 300000)) return hit.p;
  const p = (async () => {
    const { fetchFile } = await import('./files.js');
    const blob = PIEZA.cargador ? await PIEZA.cargador(a) : await fetchFile(a);
    if (blob.size > MAX_MODELO) throw new Error('Modelo demasiado grande');
    const pos = await parse3D(await blob.arrayBuffer(), a.nombre);
    if (pos.length / 9 > 2500000) throw new Error('Modelo demasiado pesado para dibujarlo en vivo');
    return pos;
  })();
  const e = { p, t: Date.now(), error: false };
  p.catch(() => { e.error = true; e.t = Date.now(); });
  cache.set(a.id, e);
  while (cache.size > 6) cache.delete(cache.keys().next().value);
  return p;
}

// ---------- Dibujo ----------
function persp(f, a, nr, fa) { const t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + nr) / (nr - fa), -1, 0, 0, 2 * fa * nr / (nr - fa), 0]; }
function mul(a, b) { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; }
const rotX = r => { const c = Math.cos(r), s = Math.sin(r); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
const rotY = r => { const c = Math.cos(r), s = Math.sin(r); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
const trans = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

const VS = `attribute vec3 p; attribute vec3 n; uniform mat4 M; uniform mat4 R; varying vec3 vn; varying float vz;
void main(){ vn = (R * vec4(n, 0.0)).xyz; vz = p.z; gl_Position = M * vec4(p, 1.0); }`;
const FS = `precision mediump float; varying vec3 vn; varying float vz;
uniform vec3 col; uniform vec3 hot; uniform float cut; uniform float mode; uniform float band;
void main(){
  vec3 N = normalize(vn); if (!gl_FrontFacing) N = -N;
  float d = max(dot(N, normalize(vec3(.4,.7,.9))), 0.); float b = max(dot(N, normalize(vec3(-.6,-.3,.5))), 0.) * .35;
  if (mode < .5) {
    if (vz > cut) discard;
    vec3 c = col * (.28 + .72 * d + b);
    if (!gl_FrontFacing) c = hot * .55;
    float g = clamp(1.0 - (cut - vz) / band, 0.0, 1.0); c = mix(c, hot, g * g * .9);
    gl_FragColor = vec4(c, 1.0);
  } else if (mode < 1.5) {
    if (vz <= cut) discard;
    float a = .10 + .16 * d; gl_FragColor = vec4(.50, .62, 1.0, a);
  } else { gl_FragColor = vec4(vec3(.16, .20, .30) * (.55 + .45 * d), 1.0); }
}`;

export function crearPieza(canvas, pos, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || canvas.getContext('experimental-webgl');
  if (!gl) throw new Error('Sin WebGL');
  const reducido = !!opts.reducedMotion;
  // geometría: centrada en X/Y, de 0 a h en Z (arriba), la dimensión mayor = 1
  const cnt = pos.length / 3; let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < cnt; i++) for (let k = 0; k < 3; k++) { const v = pos[i * 3 + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
  const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1, cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2;
  const P = new Float32Array(pos.length), N = new Float32Array(pos.length);
  for (let i = 0; i < cnt; i++) { P[i * 3] = (pos[i * 3] - cx) / size; P[i * 3 + 1] = (pos[i * 3 + 1] - cy) / size; P[i * 3 + 2] = (pos[i * 3 + 2] - min[2]) / size; }
  for (let t = 0; t < cnt; t += 3) {
    const o = t * 3, ax = P[o + 3] - P[o], ay = P[o + 4] - P[o + 1], az = P[o + 5] - P[o + 2], bx = P[o + 6] - P[o], by = P[o + 7] - P[o + 1], bz = P[o + 8] - P[o + 2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let j = 0; j < 3; j++) { N[o + j * 3] = nx; N[o + j * 3 + 1] = ny; N[o + j * 3 + 2] = nz; }
  }
  const H = (max[2] - min[2]) / size || 0.01;
  const rad = Math.max((max[0] - min[0]) / size, (max[1] - min[1]) / size) * 0.5;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) || 'shader'); return x; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  gl.useProgram(prog);
  const aP = gl.getAttribLocation(prog, 'p'), aN = gl.getAttribLocation(prog, 'n');
  const U = {}; ['M', 'R', 'col', 'hot', 'cut', 'mode', 'band'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
  const mk = (data) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
  const bP = mk(P), bN = mk(N);
  // placa de impresión: disco bajo la pieza
  const pr = Math.max(0.55, rad * 1.5), seg = 48, pp = [], pn = [];
  for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832; pp.push(0, 0, -0.004, Math.cos(a0) * pr, Math.sin(a0) * pr, -0.004, Math.cos(a1) * pr, Math.sin(a1) * pr, -0.004); for (let j = 0; j < 3; j++) pn.push(0, 0, 1); }
  const bPP = mk(new Float32Array(pp)), bPN = mk(new Float32Array(pn));
  gl.enableVertexAttribArray(aP); gl.enableVertexAttribArray(aN);
  const color = opts.color || [0.62, 0.45, 0.98], hot = [1.0, 0.62, 0.2];
  let target = 0, shown = 0, yaw = 0.6, pitch = 0.55, raf = 0, alive = true, last = performance.now(), nextDraw = 0, first = true;
  gl.clearColor(0.03, 0.04, 0.09, 1);
  function dibujar(now) {
    if (!alive) return; raf = requestAnimationFrame(dibujar);
    if (document.hidden || !canvas.isConnected) { last = now; return; }
    if (now < nextDraw) return; nextDraw = now + 33; // ~30 fps: suficiente para una tele y gasta poco
    const dt = Math.min(0.2, (now - last) / 1000); last = now;
    if (!reducido) { yaw += dt * 0.35; shown += (target - shown) * Math.min(1, dt * 1.6); } else shown = target;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = canvas.clientWidth || canvas.width, hh = canvas.clientHeight || canvas.height;
    const W = Math.max(1, Math.round(w * dpr)), Hh = Math.max(1, Math.round(hh * dpr));
    if (canvas.width !== W || canvas.height !== Hh) { canvas.width = W; canvas.height = Hh; }
    gl.viewport(0, 0, W, Hh); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const dist = Math.max(1.6, (Math.max(H, rad * 2) + 0.5) * 1.55);
    const R = mul(rotX(pitch), mul(rotY(yaw), rotX(-Math.PI / 2)));
    const M = mul(persp(0.7, W / Hh, 0.05, 50), mul(trans(0, 0, -dist), mul(rotX(pitch), mul(rotY(yaw), mul(trans(0, -H / 2, 0), rotX(-Math.PI / 2))))));
    gl.uniformMatrix4fv(U.M, false, new Float32Array(M)); gl.uniformMatrix4fv(U.R, false, new Float32Array(R));
    gl.uniform3fv(U.col, color); gl.uniform3fv(U.hot, hot);
    const cut = shown * H; gl.uniform1f(U.cut, shown >= 0.999 ? 10 : cut); gl.uniform1f(U.band, Math.max(0.012, H * 0.04));
    gl.enable(gl.DEPTH_TEST);
    const draw = (bp, bn, count, mode) => { gl.uniform1f(U.mode, mode); gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ARRAY_BUFFER, bn); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, count); };
    gl.disable(gl.BLEND); draw(bPP, bPN, pp.length / 3, 2); draw(bP, bN, cnt, 0);
    if (shown < 0.999) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false); draw(bP, bN, cnt, 1); gl.depthMask(true); gl.disable(gl.BLEND); }
  }
  raf = requestAnimationFrame(dibujar);
  return {
    setProgreso(f, instante) { target = Math.max(0, Math.min(1, f)); if (instante || first) { first = false; if (instante) shown = target; } },
    estado: () => ({ objetivo: target, mostrado: shown, triangulos: cnt / 3 }),
    destroy() { alive = false; cancelAnimationFrame(raf); try { [bP, bN, bPP, bPN].forEach(b => gl.deleteBuffer(b)); const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); } catch (e) { } }
  };
}

// ---------- Una pieza por impresora, que sobrevive a los redibujados de la pantalla ----------
const vivas = new Map(); // impresoraId → { archivoId, el, canvas, cap, pieza, cargando, fallo }
const MAX_VIVAS = 4;
export function vivaPara(impresoraId, job, live, reducido) {
  const datos = { archivos: S.t.archivos || [], pedidos: S.t.pedidos || [], productos: S.t.productos || [] };
  const a = elegirModelo(job, live, datos);
  let v = vivas.get(impresoraId);
  if (!a) { if (v) { liberar(impresoraId); } return null; }
  if (v && v.archivoId !== a.id) { liberar(impresoraId); v = null; }
  if (!v) {
    if (vivas.size >= MAX_VIVAS) return null; // no se gastan más gráficos de la cuenta
    const canvas = document.createElement('canvas'); canvas.className = 'viva-cv';
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Pieza en 3D según la altura que lleva la impresión');
    const cap = document.createElement('div'); cap.className = 'viva-cap'; cap.textContent = 'Cargando el modelo 3D…';
    const el = document.createElement('div'); el.className = 'viva'; el.append(canvas, cap);
    v = { archivoId: a.id, el, canvas, cap, pieza: null, fallo: false };
    vivas.set(impresoraId, v);
    cargarModelo(a).then(pos => {
      if (vivas.get(impresoraId) !== v) return;
      v.pieza = crearPieza(canvas, pos, { reducedMotion: reducido });
      v.pieza.setProgreso(v.f || 0);
      v.cap.textContent = v.txt || '';
    }).catch(e => { if (vivas.get(impresoraId) !== v) return; v.fallo = true; v.cap.textContent = 'No se pudo dibujar el modelo (' + (e && e.message || 'error') + ')'; v.el.classList.add('fallo'); });
  }
  const fr = fraccion(live, job);
  v.f = fr.f; v.txt = fr.texto;
  if (v.pieza) { v.pieza.setProgreso(fr.f); v.cap.textContent = fr.texto; }
  return v;
}
export function liberar(id) { const v = vivas.get(id); if (!v) return; try { v.pieza && v.pieza.destroy(); } catch (e) { } vivas.delete(id); }
export function liberarTodas() { [...vivas.keys()].forEach(liberar); }
export const _vivas = vivas;
