// ================= Código QR (byte, corrección M, versiones 1-15) sin librerías =================
const ECM = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44], [30, 1, 50, 4, 51], [22, 6, 36, 2, 37], [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70]];
const EXP = new Array(512), LOG = new Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
function gmul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
function rsGen(n) { let g = [1]; for (let i = 0; i < n; i++) { const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], EXP[i]); } g = ng; } return g; }
function rsEc(data, n) {
  const g = rsGen(n), res = data.concat(new Array(n).fill(0));
  for (let i = 0; i < data.length; i++) { const c = res[i]; if (c) for (let j = 0; j < g.length; j++) res[i + j] ^= gmul(g[j], c); }
  return res.slice(data.length);
}
function bch(v, poly, bits) { let x = v << (bits - 1); const deg = Math.floor(Math.log2(poly)); for (let i = Math.floor(Math.log2(x)); i >= deg; i--) if (x & (1 << i)) x ^= poly << (i - deg); return x; }

export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 1;
  for (; ver <= 15; ver++) { const e = ECM[ver]; const cap = e[1] * e[2] + e[3] * e[4]; if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= cap * 8) break; }
  if (ver > 15) throw new Error('Texto demasiado largo para el QR');
  const e = ECM[ver], dataCw = e[1] * e[2] + e[3] * e[4];
  // bits
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, dataCw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let p = 0; cw.length < dataCw; p++) cw.push(p % 2 ? 0x11 : 0xec);
  // bloques
  const blocks = []; let off = 0;
  for (let i = 0; i < e[1]; i++) { blocks.push(cw.slice(off, off + e[2])); off += e[2]; }
  for (let i = 0; i < e[3]; i++) { blocks.push(cw.slice(off, off + e[4])); off += e[4]; }
  const ecs = blocks.map(b => rsEc(b, e[0]));
  const final = [];
  const maxD = Math.max(e[2], e[4]);
  for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b.length) final.push(b[i]); });
  for (let i = 0; i < e[0]; i++) ecs.forEach(b => final.push(b[i]));
  // matriz
  const N = ver * 4 + 17;
  const M = Array.from({ length: N }, () => new Array(N).fill(null));
  const fixed = Array.from({ length: N }, () => new Array(N).fill(false));
  const set = (r, c, v) => { M[r][c] = v ? 1 : 0; fixed[r][c] = true; };
  const finder = (r, c) => { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) { const y = r + i, x = c + j; if (y < 0 || x < 0 || y >= N || x >= N) continue; const on = (i >= 0 && i <= 6 && (j === 0 || j === 6)) || (j >= 0 && j <= 6 && (i === 0 || i === 6)) || (i >= 2 && i <= 4 && j >= 2 && j <= 4); set(y, x, on); } };
  finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
  for (let i = 8; i < N - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const al = ALIGN[ver];
  al.forEach(r => al.forEach(c => { if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (r === al[al.length - 1] && c === 6)) return; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1); }));
  set(N - 8, 8, 1); // módulo oscuro
  // reservar formato/versión
  for (let i = 0; i < 9; i++) { if (!fixed[8][i]) set(8, i, 0); if (!fixed[i][8]) set(i, 8, 0); }
  for (let i = 0; i < 8; i++) { if (!fixed[8][N - 1 - i]) set(8, N - 1 - i, 0); if (!fixed[N - 1 - i][8]) set(N - 1 - i, 8, 0); }
  if (ver >= 7) { for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { set(i, N - 11 + j, 0); set(N - 11 + j, i, 0); } }
  // datos en zigzag
  const dbits = []; final.forEach(b => { for (let i = 7; i >= 0; i--) dbits.push((b >> i) & 1); });
  let k = 0, up = true;
  for (let c = N - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let n = 0; n < N; n++) {
      const r = up ? N - 1 - n : n;
      for (let d = 0; d < 2; d++) { const x = c - d; if (!fixed[r][x]) { M[r][x] = k < dbits.length ? dbits[k] : 0; k++; } }
    }
    up = !up;
  }
  // máscara (elegimos la de menor penalización)
  const masks = [(r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => (r * c) % 2 + (r * c) % 3 === 0, (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0];
  let best = null, bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    const X = M.map((row, r) => row.map((v, c) => fixed[r][c] ? v : v ^ (masks[m](r, c) ? 1 : 0)));
    writeFormat(X, N, m, ver);
    const s = penalty(X, N);
    if (s < bestScore) { bestScore = s; best = X; }
  }
  return best;
}
function writeFormat(X, N, mask, ver) {
  const data = (0 << 3) | mask; // nivel M = 00
  const f = ((data << 10) | bch(data, 0x537, 11)) ^ 0x5412;
  const bit = i => (f >> i) & 1;
  for (let i = 0; i <= 5; i++) X[8][i] = bit(14 - i);
  X[8][7] = bit(8); X[8][8] = bit(7); X[7][8] = bit(6);
  for (let i = 9; i <= 14; i++) X[14 - i][8] = bit(14 - i);
  for (let i = 0; i <= 7; i++) X[N - 1 - i][8] = bit(14 - i);
  for (let i = 8; i <= 14; i++) X[8][N - 15 + i] = bit(14 - i);
  X[N - 8][8] = 1;
  if (ver >= 7) {
    const v = (ver << 12) | bch(ver, 0x1f25, 13);
    for (let i = 0; i < 18; i++) { const b = (v >> i) & 1; const r = Math.floor(i / 3), c = N - 11 + (i % 3); X[r][c] = b; X[c][r] = b; }
  }
}
function penalty(X, N) {
  let s = 0;
  for (let r = 0; r < N; r++) { let run = 1; for (let c = 1; c < N; c++) { if (X[r][c] === X[r][c - 1]) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; } }
  for (let c = 0; c < N; c++) { let run = 1; for (let r = 1; r < N; r++) { if (X[r][c] === X[r - 1][c]) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; } }
  for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) { const v = X[r][c]; if (v === X[r][c + 1] && v === X[r + 1][c] && v === X[r + 1][c + 1]) s += 3; }
  let dark = 0; X.forEach(row => row.forEach(v => { dark += v; }));
  s += Math.floor(Math.abs(dark * 100 / (N * N) - 50) / 5) * 10;
  return s;
}
export function qrSvg(text, px = 6) {
  const M = qrMatrix(text), N = M.length, q = 4;
  let d = '';
  M.forEach((row, r) => row.forEach((v, c) => { if (v) d += `M${c + q} ${r + q}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N + 2 * q} ${N + 2 * q}" width="${(N + 2 * q) * px}" height="${(N + 2 * q) * px}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
if (typeof module !== 'undefined') module.exports = { qrMatrix, qrSvg };
