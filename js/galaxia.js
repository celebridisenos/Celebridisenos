// ================= v12.7 · Motor de la galaxia (WebGL, sin librerías) =================
// Dibuja tus clientes como estrellas: cada punto es un dato real. El polvo y las estrellas del fondo son solo adorno.
// - Se adapta solo: si el equipo va justo (menos de ~28 fps) baja el polvo y la resolución.
// - Respeta «reducir movimiento» (sin giro automático ni parpadeo fuerte).
// - Se limpia del todo al salir de la vista (sin fugas de memoria ni de contexto gráfico).

const TAU = Math.PI * 2;
const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const gauss = r => { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) * 1.2; };
const hex = c => { const n = parseInt(String(c).replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

// ---------- matrices (column-major) ----------
function perspective(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; }
function mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function view(yaw, pitch, dist) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const ry = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1]);
  const rx = new Float32Array([1, 0, 0, 0, 0, cp, sp, 0, 0, -sp, cp, 0, 0, 0, 0, 1]);
  const tr = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -dist, 1]);
  return mul(tr, mul(rx, ry));
}

const VS = `
attribute vec3 a_pos; attribute vec4 a_col; attribute float a_size; attribute float a_ph; attribute float a_pulse;
uniform mat4 u_mvp; uniform float u_time, u_k, u_twk, u_fade; varying vec4 v_col;
void main(){
  vec4 p = u_mvp * vec4(a_pos, 1.0);
  float tw = 1.0 + u_twk * (0.22 * sin(u_time * (1.2 + a_ph) + a_ph * 40.0)) + a_pulse * 0.28 * sin(u_time * 3.0 + a_ph * 20.0);
  gl_Position = p;
  gl_PointSize = clamp(a_size * u_k / max(p.w, 0.2) * (0.9 + 0.1 * tw) * (a_pulse > 0.5 ? (1.0 + 0.12 * sin(u_time * 3.0 + a_ph * 20.0)) : 1.0), 1.0, 320.0);
  v_col = vec4(a_col.rgb, a_col.a * tw * u_fade);
}`;
const FS = `
precision mediump float; varying vec4 v_col;
void main(){
  vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; if (d > 1.0) discard;
  float core = smoothstep(0.55, 0.0, d); float glow = pow(1.0 - d, 2.2);
  float a = (core * 0.85 + glow * 0.55) * v_col.a;
  gl_FragColor = vec4(v_col.rgb * a, a);
}`;
const VS_L = `attribute vec3 a_pos; uniform mat4 u_mvp; void main(){ gl_Position = u_mvp * vec4(a_pos, 1.0); }`;
const FS_L = `precision mediump float; uniform vec4 u_c; void main(){ gl_FragColor = vec4(u_c.rgb * u_c.a, u_c.a); }`;

function compile(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; }
function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link'); return p; }

export function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } }

// Radio según los días desde la última compra: 30 d ≈ 0,32 · 90 d ≈ 0,59 · 180 d o más ≈ 1,0
export const radioPorDias = d => d === null || d === undefined ? 1.02 : 0.18 + 0.82 * clamp(d / 180, 0, 1);

/**
 * createGalaxy(canvas, { color:'#7c3aed', reducedMotion })
 * setData({ stars:[{id, dias, gasto, color:'#rrggbb', pulse:bool, on:bool}], comets:[{starId}] })
 */
export function createGalaxy(canvas, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl');
  if (!gl) throw new Error('Sin WebGL');
  const reduced = !!opts.reducedMotion;
  let prog, progL, buf = {}, loc = {}, locL = {}, alive = true, lost = false;
  const st = { yaw: 0.5, pitch: 0.7, dist: 5.2, yawV: 0, pitchV: 0, auto: !reduced, t0: performance.now(), dpr: Math.min(2, window.devicePixelRatio || 1), quality: 1, w: 1, h: 1 };
  const target = { dist: 2.35 };
  let stars = [], comets = [], pos = [], hoverCb = () => { }, pickCb = () => { };
  const sun = hex(opts.color || '#7c3aed');
  const R = rng(20261003);

  function init() {
    prog = program(gl, VS, FS); progL = program(gl, VS_L, FS_L);
    ['a_pos', 'a_col', 'a_size', 'a_ph', 'a_pulse'].forEach(n => { loc[n] = gl.getAttribLocation(prog, n); });
    ['u_mvp', 'u_time', 'u_k', 'u_twk', 'u_fade'].forEach(n => { loc[n] = gl.getUniformLocation(prog, n); });
    locL.a_pos = gl.getAttribLocation(progL, 'a_pos'); locL.u_mvp = gl.getUniformLocation(progL, 'u_mvp'); locL.u_c = gl.getUniformLocation(progL, 'u_c');
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    // capas fijas: fondo y polvo (adorno)
    const bg = layer(1500, i => { const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u), r = 14 + R() * 8; const c = mix([0.7, 0.8, 1], [1, 0.85, 0.7], R()); return [r * s * Math.cos(a), r * u, r * s * Math.sin(a), c[0], c[1], c[2], 0.35 + R() * 0.5, 1.2 + R() * 2.2, R(), 0]; });
    buf.bg = bg;
    const dust = layer(9000, i => {
      const arm = i % 3, r = Math.pow(R(), 0.72) * 1.08, ang = arm * TAU / 3 + r * 2.6 + gauss(R) * (0.22 + r * 0.22);
      const c = r < 0.5 ? mix([1, 0.72, 0.42], [0.7, 0.45, 1], r / 0.5) : mix([0.7, 0.45, 1], [0.37, 0.82, 1], (r - 0.5) / 0.6);
      return [Math.cos(ang) * r, gauss(R) * 0.035 * (1.1 - r * 0.5), Math.sin(ang) * r, c[0], c[1], c[2], 0.09 + R() * 0.26, 2.5 + R() * 5.5, R(), 0];
    });
    buf.dust = dust;
    // nubes suaves de gas (adorno): dan cuerpo a los brazos
    buf.neb = layer(320, i => { const arm = i % 3, r = Math.pow(R(), 0.8) * 1.0, ang = arm * TAU / 3 + r * 2.6 + gauss(R) * 0.2; const c = r < 0.5 ? mix([1, 0.6, 0.35], [0.6, 0.35, 1], r / 0.5) : mix([0.6, 0.35, 1], [0.3, 0.7, 1], (r - 0.5) / 0.5); return [Math.cos(ang) * r, gauss(R) * 0.03, Math.sin(ang) * r, c[0], c[1], c[2], 0.035 + R() * 0.05, 70 + R() * 90, R(), 0]; });
    // el sol (tu negocio) en el centro
    const w = [1, 0.95, 0.85], c2 = mix(sun, [1, 1, 1], 0.35);
    buf.sun = layer(4, i => [0, 0, 0, i === 0 ? w[0] : c2[0], i === 0 ? w[1] : c2[1], i === 0 ? w[2] : c2[2], [1, 0.7, 0.4, 0.2][i], [36, 90, 190, 380][i], 0.1 * i, i < 2 ? 0 : 0]);
    // anillos de referencia
    buf.rings = [0.317, 0.59, 1.0].map(r => { const n = 128, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = Math.cos(i / n * TAU) * r; a[i * 3 + 1] = 0; a[i * 3 + 2] = Math.sin(i / n * TAU) * r; } const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW); return { b, n }; });
    buf.stars = dyn(); buf.comets = dyn();
    uploadStars(); uploadComets(0);
  }
  // capa = Float32Array con 10 floats por punto: x y z r g b a size phase pulse
  function layer(n, f) { const a = new Float32Array(n * 10); for (let i = 0; i < n; i++) a.set(f(i), i * 10); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW); return { b, n }; }
  function dyn() { const b = gl.createBuffer(); return { b, n: 0 }; }
  function bindLayer(L) {
    gl.bindBuffer(gl.ARRAY_BUFFER, L.b); const S = 40;
    gl.enableVertexAttribArray(loc.a_pos); gl.vertexAttribPointer(loc.a_pos, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(loc.a_col); gl.vertexAttribPointer(loc.a_col, 4, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(loc.a_size); gl.vertexAttribPointer(loc.a_size, 1, gl.FLOAT, false, S, 28);
    gl.enableVertexAttribArray(loc.a_ph); gl.vertexAttribPointer(loc.a_ph, 1, gl.FLOAT, false, S, 32);
    gl.enableVertexAttribArray(loc.a_pulse); gl.vertexAttribPointer(loc.a_pulse, 1, gl.FLOAT, false, S, 36);
  }

  // ---------- datos ----------
  function layoutStars() {
    const maxG = Math.max(1, ...stars.map(s => s.gasto || 0));
    pos = stars.map(s => {
      const r = radioPorDias(s.dias), k = hash(s.id), arm = Math.floor(hash('a' + s.id) * 3), j = (hash('j' + s.id) - 0.5) * 0.7;
      const ang = arm * TAU / 3 + r * 2.6 + j; const y = (hash('y' + s.id) - 0.5) * 0.12 * (1.1 - r * 0.5);
      s._p = [Math.cos(ang) * r, y, Math.sin(ang) * r]; s._k = k; s._size = 11 + 24 * Math.sqrt((s.gasto || 0) / maxG) + (s.gasto > 0 ? 4 : 0);
      return s._p;
    });
  }
  function uploadStars() {
    const a = new Float32Array(stars.length * 10);
    stars.forEach((s, i) => { const c = hex(s.color || '#bcd7ff'); a.set([s._p[0], s._p[1], s._p[2], c[0], c[1], c[2], s.on === false ? 0.07 : 1, s.on === false ? 4 : s._size, hash('p' + s.id), s.pulse && s.on !== false ? 1 : 0], i * 10); });
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.stars.b); gl.bufferData(gl.ARRAY_BUFFER, a, gl.DYNAMIC_DRAW); buf.stars.n = stars.length;
  }
  const TR = 7; // puntos por cometa (cabeza + cola)
  function uploadComets(time) {
    const n = comets.length * TR; if (!n) { buf.comets.n = 0; return; }
    const a = new Float32Array(n * 10); let o = 0;
    comets.forEach((c, ci) => {
      const s = c.star; if (!s || s.on === false) { for (let k = 0; k < TR; k++) { a.set([0, 0, 0, 0, 0, 0, 0, 1, 0, 0], o); o += 10; } return; }
      const base = (time * 0.22 + hash('c' + ci)) % 1;
      for (let k = 0; k < TR; k++) {
        const t = clamp(base - k * 0.028, 0, 1), e = t * t * (3 - 2 * t), p = s._p;
        const x = p[0] * (1 - e), z = p[2] * (1 - e), y = p[1] * (1 - e) + 0.22 * Math.sin(Math.PI * e);
        const fade = (1 - k / TR) * (base - k * 0.028 < 0 ? 0 : 1) * (1 - Math.pow(e, 6));
        a.set([x, y, z, 1, 0.92 - k * 0.04, 0.6 - k * 0.05, 0.9 * fade, (k === 0 ? 12 : 8 - k), 0.3, 0], o); o += 10;
      }
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.comets.b); gl.bufferData(gl.ARRAY_BUFFER, a, gl.DYNAMIC_DRAW); buf.comets.n = n;
  }
  function setData(d) {
    stars = (d.stars || []).map(s => Object.assign({}, s)); const byId = {}; stars.forEach(s => { byId[s.id] = s; });
    comets = (d.comets || []).map(c => ({ star: byId[c.starId] })).filter(c => c.star).slice(0, 40);
    layoutStars(); if (!lost) uploadStars();
  }

  // ---------- cámara y entrada ----------
  const ptrs = new Map(); let moved = 0, down = null, pinch0 = 0, lastHover = 0, hoverT = 0;
  const rect = () => canvas.getBoundingClientRect();
  function mvp() { const asp = st.w / st.h; return mul(perspective(0.9, asp, 0.1, 60), view(st.yaw, st.pitch, st.dist)); }
  function project(p, M) { const x = M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], y = M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], w = M[3] * p[0] + M[7] * p[1] + M[11] * p[2] + M[15]; if (w <= 0.05) return null; return [(x / w * 0.5 + 0.5) * st.w, (1 - (y / w * 0.5 + 0.5)) * st.h, w]; }
  function nearest(px, py) {
    const M = mvp(); let best = null, bd = 1e9;
    stars.forEach(s => { if (s.on === false) return; const q = project(s._p, M); if (!q) return; const r = Math.max(14, s._size * 0.5 * (st.h / 900) * 2.7 / q[2]); const d = Math.hypot(q[0] - px, q[1] - py); if (d < r + 6 && d - r < bd) { bd = d - r; best = { star: s, x: q[0], y: q[1] }; } });
    return best;
  }
  const on = (t, e, f, o) => { t.addEventListener(e, f, o); return () => t.removeEventListener(e, f, o); };
  const offs = [];
  offs.push(on(canvas, 'pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); down = [e.clientX, e.clientY]; moved = 0; st.auto = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } }));
  offs.push(on(canvas, 'pointermove', e => {
    const r = rect();
    if (!ptrs.has(e.pointerId)) {
      const now = performance.now(), cx = e.clientX - r.left, cy = e.clientY - r.top;
      const hv = () => { lastHover = performance.now(); hoverT = 0; const h = nearest(cx, cy); canvas.style.cursor = h ? 'pointer' : 'grab'; hoverCb(h ? { star: h.star, x: h.x, y: h.y } : null); };
      clearTimeout(hoverT); if (now - lastHover > 40) hv(); else hoverT = setTimeout(hv, 45); // el último movimiento siempre se atiende
      return;
    }
    const p = ptrs.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved += Math.abs(dx) + Math.abs(dy);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) target.dist = clamp(target.dist * pinch0 / d, 1.2, 6); pinch0 = d; return; }
    st.yawV = dx * 0.006; st.pitchV = dy * 0.004; st.yaw += st.yawV; st.pitch = clamp(st.pitch + st.pitchV, -1.2, 1.35); hoverCb(null);
  }));
  const up = e => { const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if (was && ptrs.size === 0 && down && moved < 6 && e.type === 'pointerup') { const r = rect(), h = nearest(e.clientX - r.left, e.clientY - r.top); if (h) pickCb(h.star); } if (ptrs.size < 2) pinch0 = 0; };
  offs.push(on(canvas, 'pointerup', up)); offs.push(on(canvas, 'pointercancel', up));
  offs.push(on(canvas, 'pointerleave', () => { if (!ptrs.size) hoverCb(null); }));
  offs.push(on(canvas, 'wheel', e => { e.preventDefault(); target.dist = clamp(target.dist * Math.exp(e.deltaY * 0.0012), 1.2, 6); }, { passive: false }));
  offs.push(on(canvas, 'webglcontextlost', e => { e.preventDefault(); lost = true; }));
  offs.push(on(canvas, 'webglcontextrestored', () => { lost = false; try { init(); } catch (e) { } }));

  function resize() {
    const r = canvas.getBoundingClientRect(), d = st.dpr * st.quality; st.w = Math.max(1, r.width); st.h = Math.max(1, r.height);
    const W = Math.round(st.w * d), H = Math.round(st.h * d); if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; if (ro) ro.observe(canvas);

  // ---------- bucle ----------
  let raf = 0, last = performance.now(), acc = 0, frames = 0, slow = 0, dustFrac = 1, lastC = 0, fps = 60;
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (lost || document.hidden) { last = now; return; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt; frames++;
    if (acc >= 1.5) { fps = frames / acc; acc = 0; frames = 0;
      if (fps < 28 && (dustFrac > 0.25 || st.quality > 0.6)) { if (dustFrac > 0.25) dustFrac = Math.max(0.25, dustFrac * 0.55); else st.quality = Math.max(0.6, st.quality - 0.2); resize(); }
    }
    const time = (now - st.t0) / 1000;
    if (!reduced && st.auto) st.yaw += dt * 0.045;
    if (!ptrs.size) { st.yaw += st.yawV; st.pitch = clamp(st.pitch + st.pitchV, -1.2, 1.35); st.yawV *= 0.93; st.pitchV *= 0.93; }
    st.dist += (target.dist - st.dist) * Math.min(1, dt * 3.2);
    const fade = clamp(time / 1.2, 0, 1);
    resize(); gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0.015, 0.02, 0.05, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    const M = mvp();
    // anillos
    gl.useProgram(progL); gl.uniformMatrix4fv(locL.u_mvp, false, M); gl.uniform4f(locL.u_c, 0.6, 0.7, 1, 0.13 * fade); gl.enableVertexAttribArray(locL.a_pos);
    buf.rings.forEach(r => { gl.bindBuffer(gl.ARRAY_BUFFER, r.b); gl.vertexAttribPointer(locL.a_pos, 3, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.LINE_LOOP, 0, r.n); });
    gl.disableVertexAttribArray(locL.a_pos);
    // puntos
    gl.useProgram(prog); gl.uniformMatrix4fv(loc.u_mvp, false, M); gl.uniform1f(loc.u_time, time); gl.uniform1f(loc.u_k, st.dpr * st.quality * (st.h / 900) * 2.7); gl.uniform1f(loc.u_twk, reduced ? 0.2 : 1); gl.uniform1f(loc.u_fade, fade);
    const draw = (L, n) => { if (!n) return; bindLayer(L); gl.drawArrays(gl.POINTS, 0, n); };
    draw(buf.bg, buf.bg.n); draw(buf.neb, Math.floor(buf.neb.n * dustFrac)); draw(buf.dust, Math.floor(buf.dust.n * dustFrac)); draw(buf.stars, buf.stars.n); draw(buf.sun, buf.sun.n);
    if (comets.length && !reduced) { if (now - lastC > 33) { lastC = now; uploadComets(time); } draw(buf.comets, buf.comets.n); }
    ['a_pos', 'a_col', 'a_size', 'a_ph', 'a_pulse'].forEach(n => gl.disableVertexAttribArray(loc[n]));
  }

  init(); resize(); raf = requestAnimationFrame(frame);
  return {
    screenOf(id) { const s = stars.find(x => x.id === id); if (!s) return null; const q = project(s._p, mvp()); return q ? { x: q[0], y: q[1] } : null; },
    setData, onHover: f => { hoverCb = f; }, onPick: f => { pickCb = f; },
    setAuto: v => { st.auto = !!v && !reduced; }, isAuto: () => st.auto, refresh() { uploadStars(); },
    stats: () => ({ fps: Math.round(fps), calidad: Math.round(dustFrac * 100) + ' %', resolucion: st.quality, estrellas: stars.length, cometas: comets.length, enposicion: Math.abs(st.dist - target.dist) < 0.01 }),
    destroy() { alive = false; clearTimeout(hoverT); cancelAnimationFrame(raf); offs.forEach(f => f()); if (ro) ro.disconnect(); try { const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); } catch (e) { } }
  };
}
