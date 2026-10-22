// ================= 👒 CelebriDREW · COMPLEMENTOS DEL AVATAR (20-10-2026) =================
// Ella: «pon también accesorios: gorras, sombreros, etc.». Cada complemento se hace A LA MEDIDA de la cabeza del avatar (el elipsoide de la
// parte de arriba de su malla, el mismo con el que se pinta el pelo) y del volumen del pelo si lo lleva; va pegado a la cabeza y la sigue
// en la pasarela. Son de adorno (no se simulan como la tela). Coordenadas: origen en el centro de la cabeza, +y arriba, +z hacia delante (la cara).
export const COMPLEMENTOS = [
  ['gorra', '🧢 Gorra', '#1c1f26'], ['sombrero', '🎩 Sombrero', '#3b2f2a'], ['pamela', '👒 Pamela', '#e8d9b5'], ['gorro', '🧶 Gorro de lana', '#7a000e'],
  ['boina', '🥖 Boina', '#2b2d42'], ['gafas', '🕶️ Gafas de sol', '#141414']
];
export const DE_CABEZA = new Set(['gorra', 'sombrero', 'pamela', 'gorro', 'boina']); // (solo uno a la vez en la cabeza)

// la cabeza «con pelo»: cuánto abulta (el pelo suma volumen; la gorra va por encima)
const radios = (cabeza, gros) => { const g = gros || 1; return { rx: cabeza.r[0] * g, ry: cabeza.r[1] * g, rz: cabeza.r[2] * g, R: Math.max(cabeza.r[0], cabeza.r[2]) * g }; };

function materialDe(T, k, color) {
  const fieltro = k === 'sombrero' || k === 'boina', paja = k === 'pamela', lana = k === 'gorro';
  return new T.MeshPhysicalMaterial({ color: new T.Color(color), roughness: paja ? 0.8 : lana ? 0.92 : fieltro ? 0.75 : 0.62, metalness: 0, sheen: lana || fieltro ? 0.6 : 0.2, sheenRoughness: 0.6,
    sheenColor: new T.Color(color).lerp(new T.Color('#ffffff'), 0.3), side: T.DoubleSide });
}
// un perfil girado (torno): puntos [radio, altura]
const torno = (T, pts, seg = 72) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg);

// → THREE.Group en coordenadas de la cabeza. o: { color, gros (lo que abulta el pelo), ojos: [L, R] (en coords de la cabeza) }
export function construye(T, k, cabeza, o = {}) {
  const g = new T.Group(), { rx, ry, rz, R } = radios(cabeza, o.gros), color = o.color || (COMPLEMENTOS.find(x => x[0] === k) || [])[2] || '#333333', m = materialDe(T, k, color);
  const sx = rx / R, sz = rz / R; // (la copa: ovalada como la cabeza)
  if (k === 'gorra') {
    // copa: un casquete un poco mayor que la cabeza, hasta la frente (no tapa los ojos); visera plana algo curvada hacia abajo
    const yb = 0.18 * ry, cop = new T.Mesh(new T.SphereGeometry(1, 64, 32, 0, 2 * Math.PI, 0, 0.445 * Math.PI), m); cop.scale.set(rx * 1.07, ry * 1.04, rz * 1.07); cop.position.y = 0.0; g.add(cop);
    const sh = new T.Shape(); const L = 0.95 * R, A = 0.62 * R; sh.moveTo(-A, 0); sh.quadraticCurveTo(-A * 0.9, L * 0.75, 0, L); sh.quadraticCurveTo(A * 0.9, L * 0.75, A, 0); sh.lineTo(-A, 0);
    const vis = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 1.2, bevelSegments: 2, curveSegments: 24 }), m);
    vis.rotation.x = Math.PI / 2 - 0.2; vis.position.set(0, yb + 2, rz * 1.07 * Math.sin(0.445 * Math.PI) * 0.86); g.add(vis);
    const boton = new T.Mesh(new T.SphereGeometry(0.06 * R, 16, 12), m); boton.position.y = ry * 1.04 + 1; g.add(boton);
    g.rotation.x = -0.1; g.userData.que = 'gorra';
  } else if (k === 'sombrero' || k === 'pamela') {
    const pam = k === 'pamela', y0 = (pam ? 0.18 : 0.22) * ry, rb = R * 1.03, alto = pam ? 0.98 * ry : 1.08 * ry, ala = pam ? 2.25 * R : 1.62 * R;
    const copa = torno(T, pam ? [[rb, 0], [rb * 0.98, alto * 0.55], [rb * 0.9, alto * 0.9], [rb * 0.65, alto], [0, alto * 1.02]] : [[rb, 0], [rb * 0.97, alto * 0.5], [rb * 0.88, alto * 0.93], [rb * 0.7, alto], [rb * 0.4, alto * 0.9], [0, alto * 0.86]]); // (la del sombrero, con su hendidura arriba)
    const c1 = new T.Mesh(copa, m); c1.scale.set(sx, 1, sz); c1.position.y = y0; g.add(c1);
    // el ala: un anillo con su curva (la del sombrero sube por los lados; la de la pamela cae)
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, r = rb + (ala - rb) * t; pts.push([r, (pam ? -0.22 * R * t * t : 0.08 * R * t * t)]); }
    const ala1 = new T.Mesh(torno(T, pts.concat(pts.slice().reverse().map(([r, y]) => [r, y + 2.4]))), m); ala1.scale.set(sx, 1, sz); ala1.position.y = y0; g.add(ala1);
    const cinta = new T.Mesh(new T.CylinderGeometry(rb * 1.005, rb * 1.005, alto * 0.18, 72, 1, true), materialDe(T, 'gorra', pam ? '#1c1f26' : '#111111')); cinta.scale.set(sx, 1, sz); cinta.position.y = y0 + alto * 0.1; g.add(cinta);
    g.rotation.x = pam ? -0.08 : -0.05; g.userData.que = k;
  } else if (k === 'gorro') {
    const cop = new T.Mesh(new T.SphereGeometry(1, 64, 32, 0, 2 * Math.PI, 0, 0.5 * Math.PI), m); cop.scale.set(rx * 1.05, ry * 1.2, rz * 1.05); g.add(cop);
    const vuelta = new T.Mesh(new T.CylinderGeometry(R * 1.08, R * 1.06, 0.32 * ry, 72, 1, true), m); vuelta.scale.set(sx, 1, sz); vuelta.position.y = 0.14 * ry; g.add(vuelta);
    const borla = new T.Mesh(new T.SphereGeometry(0.22 * R, 24, 18), m); borla.position.y = ry * 1.2 + 0.14 * R; g.add(borla);
    g.rotation.x = -0.06; g.userData.que = 'gorro';
  } else if (k === 'boina') {
    const b = new T.Mesh(new T.SphereGeometry(1, 64, 24), m); b.scale.set(R * 1.18, 0.34 * ry, R * 1.12); b.position.set(0.08 * R, 0.77 * ry, -0.02 * R); b.rotation.z = -0.22; g.add(b);
    const aro = new T.Mesh(new T.TorusGeometry(R * 0.92, 0.05 * ry, 12, 72), m); aro.rotation.x = Math.PI / 2; aro.scale.set(sx, sz, 1); aro.position.y = 0.55 * ry; g.add(aro);
    const rabito = new T.Mesh(new T.CylinderGeometry(2, 2.6, 0.12 * R, 12), m); rabito.position.set(0.08 * R, 0.77 * ry + 0.34 * ry, 0); g.add(rabito);
    g.userData.que = 'boina';
  } else if (k === 'gafas') {
    const ojos = o.ojos; if (!ojos) return null; // (sin ojos —el maniquí sencillo— no se sabe dónde van)
    const [L, Rr] = ojos, d = Math.hypot(L[0] - Rr[0], L[1] - Rr[1], L[2] - Rr[2]), rl = 0.41 * d, delante = 0.44 * d;
    const vidrio = new T.MeshPhysicalMaterial({ color: new T.Color('#1a1a1a'), roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.82, clearcoat: 1, side: T.DoubleSide }), mont = materialDe(T, 'gorra', color);
    [L, Rr].forEach(p => { const len = new T.Mesh(new T.CylinderGeometry(rl, rl, 2, 48), vidrio); len.rotation.x = Math.PI / 2 + 0.08; len.scale.set(1, 1, 0.8); len.position.set(p[0], p[1], p[2] + delante); g.add(len);
      const aro = new T.Mesh(new T.TorusGeometry(rl, 1.6, 10, 48), mont); aro.scale.set(1, 0.8, 1); aro.position.set(p[0], p[1], p[2] + delante); g.add(aro);
      const pat = new T.Mesh(new T.BoxGeometry(2.4, 3, rz * 1.15), mont), sg = Math.sign(p[0]); pat.position.set(p[0] + sg * rl, p[1] + 2, p[2] + delante - rz * 0.57); pat.rotation.y = sg * 0.05; g.add(pat); });
    const puente = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, Math.max(2, d - 2 * rl), 12), mont); puente.rotation.z = Math.PI / 2; puente.position.set((L[0] + Rr[0]) / 2, (L[1] + Rr[1]) / 2 + rl * 0.3, (L[2] + Rr[2]) / 2 + delante); g.add(puente);
    g.userData.que = 'gafas';
  } else return null;
  g.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return g;
}
