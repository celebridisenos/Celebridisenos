// ================= Visor 3D (STL, 3MF y OBJ) con WebGL, sin librerías externas =================

// ---------- Lectura de archivos 3D ----------
export async function parse3D(buf, name) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  if (ext === '3mf') return parse3MF(buf);
  if (ext === 'obj') return parseOBJ(new TextDecoder().decode(buf));
  return parseSTL(buf);
}
function parseSTL(buf) {
  const dv = new DataView(buf);
  const isBinary = buf.byteLength >= 84 && 84 + dv.getUint32(80, true) * 50 === buf.byteLength;
  if (isBinary) {
    const n = dv.getUint32(80, true);
    const pos = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50 + 12;
      for (let j = 0; j < 9; j++) pos[i * 9 + j] = dv.getFloat32(o + j * 4, true);
    }
    return pos;
  }
  const txt = new TextDecoder().decode(buf);
  const out = [];
  const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let m; while ((m = re.exec(txt))) out.push(+m[1], +m[2], +m[3]);
  if (!out.length) throw new Error('El archivo STL está vacío o dañado.');
  return new Float32Array(out);
}
function parseOBJ(txt) {
  const v = [], out = [];
  txt.split('\n').forEach(l => {
    const p = l.trim().split(/\s+/);
    if (p[0] === 'v') v.push([+p[1], +p[2], +p[3]]);
    else if (p[0] === 'f') {
      const idx = p.slice(1).map(x => { const k = parseInt(x.split('/')[0], 10); return k < 0 ? v.length + k : k - 1; });
      for (let i = 1; i + 1 < idx.length; i++) [idx[0], idx[i], idx[i + 1]].forEach(k => { const q = v[k] || [0, 0, 0]; out.push(q[0], q[1], q[2]); });
    }
  });
  if (!out.length) throw new Error('El archivo OBJ no tiene caras.');
  return new Float32Array(out);
}
// 3MF = ZIP con XML. Leemos el ZIP a mano y descomprimimos con DecompressionStream.
// v20: como manda el estándar: las piezas de <build> con su «transform» (colocación), las piezas hechas de componentes y los
// componentes que están en otro archivo del 3MF (así guarda Bambu Studio sus proyectos). Sin <build>, se leen todas las
// mallas tal cual (como antes).
async function parse3MF(buf) {
  const files = await unzip(buf, n => /\.model$/i.test(n)), docs = {};
  const norm = p => String(p || '').replace(/^\//, '');
  for (const name of Object.keys(files)) docs[norm(name)] = new DOMParser().parseFromString(new TextDecoder().decode(files[name]), 'application/xml');
  const raiz = Object.keys(docs).find(n => /^3D\/3dmodel\.model$/i.test(n)) || Object.keys(docs)[0];
  const out = [];
  const matriz = t => { const v = String(t || '').trim().split(/\s+/).map(Number); return v.length === 12 && v.every(isFinite) ? v : null; };
  const compone = (A, B) => { // primero A, luego B (filas 3MF: p' = p·M)
    if (!A) return B; if (!B) return A; const M = (m, i, j) => m[i * 3 + j];
    const r = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { let x = (i === 3 ? M(B, 3, j) : 0); for (let k = 0; k < 3; k++) x += M(A, i, k) * M(B, k, j); r.push(x); } return r;
  };
  const objeto = (doc, id) => { for (const o of doc.getElementsByTagName('object')) if (o.getAttribute('id') === String(id)) return o; return null; };
  const pinta = (archivo, id, T, prof) => {
    const doc = docs[archivo]; if (!doc || prof > 8) return; const o = objeto(doc, id); if (!o) return;
    const mesh = o.getElementsByTagName('mesh')[0];
    if (mesh) {
      const verts = Array.from(mesh.getElementsByTagName('vertex')).map(v => { const x = +v.getAttribute('x'), y = +v.getAttribute('y'), z = +v.getAttribute('z'); return T ? [x * T[0] + y * T[3] + z * T[6] + T[9], x * T[1] + y * T[4] + z * T[7] + T[10], x * T[2] + y * T[5] + z * T[8] + T[11]] : [x, y, z]; });
      for (const t of mesh.getElementsByTagName('triangle')) ['v1', 'v2', 'v3'].forEach(a => { const q = verts[+t.getAttribute(a)] || [0, 0, 0]; out.push(q[0], q[1], q[2]); });
      return;
    }
    for (const c of o.getElementsByTagName('component')) { const ruta = c.getAttribute('p:path') || c.getAttributeNS('http://schemas.microsoft.com/3dmanufacturing/production/2015/06', 'path'); pinta(ruta ? norm(ruta) : archivo, c.getAttribute('objectid'), compone(matriz(c.getAttribute('transform')), T), prof + 1); }
  };
  const items = docs[raiz] ? Array.from(docs[raiz].getElementsByTagName('item')) : [];
  if (items.length) items.forEach(it => pinta(raiz, it.getAttribute('objectid'), matriz(it.getAttribute('transform')), 0));
  else for (const name of Object.keys(docs)) for (const mesh of docs[name].getElementsByTagName('mesh')) {
    const verts = Array.from(mesh.getElementsByTagName('vertex')).map(v => [+v.getAttribute('x'), +v.getAttribute('y'), +v.getAttribute('z')]);
    for (const t of mesh.getElementsByTagName('triangle')) ['v1', 'v2', 'v3'].forEach(a => { const q = verts[+t.getAttribute(a)] || [0, 0, 0]; out.push(q[0], q[1], q[2]); });
  }
  if (!out.length) throw new Error('No he encontrado piezas dentro del 3MF.');
  return new Float32Array(out);
}
export async function unzip(buf, filter) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('No es un archivo ZIP/3MF válido.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = {};
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (filter && !filter(name)) continue;
    const lstart = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const data = u8.subarray(lstart, lstart + csize);
    if (method === 0) out[name] = data;
    else if (method === 8) out[name] = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  }
  return out;
}

// ---------- Geometría ----------
function prepare(pos) {
  const n = pos.length / 3;
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = pos[i * 3 + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
  const c = [0, 1, 2].map(k => (min[k] + max[k]) / 2);
  const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
  const P = new Float32Array(pos.length), N = new Float32Array(pos.length);
  for (let t = 0; t < n; t += 3) {
    const a = [], b = [], d = [];
    for (let k = 0; k < 3; k++) { P[t * 3 + k] = (pos[t * 3 + k] - c[k]) / size; P[t * 3 + 3 + k] = (pos[t * 3 + 3 + k] - c[k]) / size; P[t * 3 + 6 + k] = (pos[t * 3 + 6 + k] - c[k]) / size; }
    for (let k = 0; k < 3; k++) { a[k] = P[t * 3 + 3 + k] - P[t * 3 + k]; b[k] = P[t * 3 + 6 + k] - P[t * 3 + k]; }
    d[0] = a[1] * b[2] - a[2] * b[1]; d[1] = a[2] * b[0] - a[0] * b[2]; d[2] = a[0] * b[1] - a[1] * b[0];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) N[t * 3 + j * 3 + k] = d[k] / l;
  }
  return { P, N, count: n, dims: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

// ---------- Matrices ----------
function persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]; }
function mul(a, b) { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; }
function rotX(r) { const c = Math.cos(r), s = Math.sin(r); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
function rotY(r) { const c = Math.cos(r), s = Math.sin(r); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
function trans(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; }

const VS = `attribute vec3 p; attribute vec3 n; uniform mat4 M; uniform mat4 R; varying vec3 vn; void main(){ vn = (R*vec4(n,0.)).xyz; gl_Position = M*vec4(p,1.); }`;
const FS = `precision mediump float; varying vec3 vn; uniform vec3 col; void main(){ vec3 N = normalize(vn); float d = max(dot(N, normalize(vec3(.4,.7,.9))),0.); float b = max(dot(N, normalize(vec3(-.6,-.3,.5))),0.)*.35; gl_FragColor = vec4(col*(.28+.72*d+b),1.); }`;

// Crea un visor en un <canvas>. Devuelve { dims, snapshot(), destroy() }
export function viewer(canvas, pos, opts = {}) {
  let g = prepare(pos);
  const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: !!opts.snapshot }) || canvas.getContext('experimental-webgl');
  if (!gl) throw new Error('Este dispositivo no permite la vista 3D (WebGL).');
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = (data, name) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0); return b; };
  const bp = buf(g.P, 'p'), bn = buf(g.N, 'n');
  const uM = gl.getUniformLocation(prog, 'M'), uR = gl.getUniformLocation(prog, 'R'), uC = gl.getUniformLocation(prog, 'col');
  const color = opts.color || [0.55, 0.36, 0.96];
  let rx = -0.9, ry = 0.6, zoom = 2.1, raf = 0, alive = true;
  gl.enable(gl.DEPTH_TEST);
  function draw() {
    raf = 0;
    if (!alive) return;
    const w = canvas.clientWidth || canvas.width, hh = canvas.clientHeight || canvas.height, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    const bg = opts.bg || [0, 0, 0, 0]; gl.clearColor(bg[0], bg[1], bg[2], bg[3]); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const R = mul(rotX(rx), rotY(ry));
    const M = mul(persp(0.7, canvas.width / canvas.height, 0.05, 50), mul(trans(0, 0, -zoom), R));
    gl.uniformMatrix4fv(uM, false, new Float32Array(M)); gl.uniformMatrix4fv(uR, false, new Float32Array(R)); gl.uniform3fv(uC, color);
    gl.drawArrays(gl.TRIANGLES, 0, g.count);
  }
  const req = () => { if (!raf) raf = requestAnimationFrame(draw); };
  // Interacción: arrastrar para girar, rueda/pellizco para acercar
  const pts = new Map(); let lastDist = 0;
  const down = e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); };
  const move = e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) { ry += (e.clientX - prev[0]) * 0.01; rx += (e.clientY - prev[1]) * 0.01; }
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (lastDist) zoom = Math.min(8, Math.max(0.8, zoom * lastDist / d)); lastDist = d; }
    req();
  };
  const up = e => { pts.delete(e.pointerId); lastDist = 0; };
  const wheel = e => { e.preventDefault(); zoom = Math.min(8, Math.max(0.8, zoom * (e.deltaY > 0 ? 1.1 : 0.9))); req(); };
  if (!opts.static) { canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('wheel', wheel, { passive: false }); }
  const ro = window.ResizeObserver ? new ResizeObserver(req) : null; if (ro) ro.observe(canvas);
  draw();
  return {
    dims: g.dims, triangles: g.count / 3,
    set: pos2 => { g = prepare(pos2); gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.bufferData(gl.ARRAY_BUFFER, g.P, gl.STATIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, bn); gl.bufferData(gl.ARRAY_BUFFER, g.N, gl.STATIC_DRAW); req(); }, // v18: otra pieza, misma vista
    snapshot: (type, q) => { draw(); return canvas.toDataURL(type || 'image/jpeg', q || 0.8); },
    destroy: () => { alive = false; if (ro) ro.disconnect(); gl.deleteBuffer(bp); gl.deleteBuffer(bn); const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
  };
}

// Miniatura (dataURL) de un modelo 3D para guardarla con el archivo
export async function thumb3D(buf, name, size = 200) {
  const pos = await parse3D(buf, name);
  const c = document.createElement('canvas'); c.width = size; c.height = size; c.style.width = size + 'px'; c.style.height = size + 'px';
  c.style.position = 'fixed'; c.style.left = '-9999px'; document.body.appendChild(c);
  try {
    const v = viewer(c, pos, { static: true, snapshot: true, bg: [0.96, 0.95, 0.99, 1] });
    const url = v.snapshot('image/jpeg', 0.78);
    const out = { url, dims: v.dims, triangles: v.triangles };
    v.destroy();
    return out;
  } finally { c.remove(); }
}
