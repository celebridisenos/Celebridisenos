// ================= v30 · 📦 CelebriR8 · TALLER DE CAJAS (pantalla) =================
// A la izquierda: la caja (medidas, tipo de tapa, plantillas) y los ELEMENTOS para arrastrar. En el centro: la caja en 3D; mientras
// arrastras, cada cara se pinta de VERDE donde ese elemento funciona y de ROJO donde no (y abajo se lee por qué). Al soltar en
// rojo no se pone. Lo ya puesto se mueve arrastrándolo. En tablet: tocar un elemento y luego tocar la caja también vale.
// A la derecha: lo puesto (con sus medidas), 🧪 Comprobar (la monta: abre la tapa y las puertas hasta que algo choca) e Imprimir.
import { h, mount, btn, toast, modal } from '../ui.js';
import * as N from '../r8/nucleo.js';
import { crearEscena } from '../r8/escena3d.js';
import * as CJ from '../r8/cajas.js';

const LS = 'cd.r8.cajas';
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
const lee = () => { try { const x = JSON.parse(localStorage.getItem(LS) || 'null'); if (x && x.L && Array.isArray(x.els)) return x; } catch (e) { } return CJ.dePlantilla('joyero'); };
const graba = C => { try { localStorage.setItem(LS, JSON.stringify(C)); } catch (e) { } };
const MEDIDAS = [['L', 'Largo', 30, 250, 1], ['W', 'Ancho', 30, 250, 1], ['H', 'Alto de la caja', 15, 230, 1], ['pared', 'Paredes', 1.2, 6, 0.2], ['suelo', 'Suelo', 1.2, 6, 0.2], ['tapaG', 'Grosor de la tapa', 1.6, 6, 0.2], ['radio', 'Esquinas redondeadas', 0, 30, 0.5]];

export async function montarCajas(el, ext = {}) {
  await N.cargar();
  let C = lee(), deshacer = [], G = null, ang = 0, angP = 0, verDentro = false, selId = null, arr = null, armado = null, resultado = null, vivo = true;
  const lienzo = h('canvas.r8p-cv.r8cj-cv', { 'aria-label': 'La caja en 3D: arrastra aquí los elementos' });
  const aviso = h('div.r8cj-aviso', { role: 'status', 'aria-live': 'polite' }), vbar = h('div.r8p-vbar.r8cj-vbar');
  const izq = h('div.r8p-izq.r8cj-izq'), der = h('div.r8p-der.r8cj-der'), vista = h('div.r8p-vista.r8cj-vista', lienzo, vbar, aviso);
  el.appendChild(h('div.r8p.r8cj', izq, vista, der));
  const escena = crearEscena(lienzo, { cama: 256, dia: document.documentElement.getAttribute('data-modo') === 'dia' }), T = escena.T;
  const capaZ = new T.Group(), capaM = new T.Group(); escena.esc.add(capaZ, capaM);
  const limpiaG = g => { g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); g.clear(); };

  // ---------- el modelo ----------
  function commit(antes) { if (antes) { deshacer.push(antes); if (deshacer.length > 40) deshacer.shift(); } graba(C); resultado = null; pinta3D(); pintaIzq(); pintaDer(); }
  const copia = () => JSON.parse(JSON.stringify(C));
  function pinta3D(encuadra) {
    let L = [];
    try {
      const g = CJ.construye(C);
      G = { eje: g.eje, avisos: g.avisos, puertas: g.puertas.map(P => ({ id: P.id, eje: P.eje, F: P.F })), sueltas: g.sueltas.map(s => ({ id: s.id, con: s.con, nombre: s.nombre })) };
      const mt = CJ.giroTapa(G, ang);
      L.push({ id: 'cuerpo', vista: N.aVista(g.cuerpo), color: C.color, acabado: 'mate' });
      L.push({ id: 'tapa', vista: N.aVista(g.tapa), color: C.colorTapa, acabado: 'mate', matriz: G.eje ? mt : null, fantasma: verDentro });
      g.puertas.forEach(P => L.push({ id: 'puerta:' + P.id, vista: N.aVista(P.m), color: C.colorTapa, acabado: 'mate', matriz: angP ? CJ.giroPuerta(P, angP) : null }));
      g.sueltas.forEach(s => { const P = s.con && s.con.startsWith('puerta:') ? G.puertas.find(q => 'puerta:' + q.id === s.con) : null;
        L.push({ id: s.id, vista: N.aVista(s.m), color: s.nombre.startsWith('Pomo') ? C.colorTapa : C.color, acabado: 'mate', matriz: s.con === 'tapa' ? (G.eje ? mt : null) : P && angP ? CJ.giroPuerta(P, angP) : null, fantasma: s.con === 'tapa' && verDentro }); });
    } catch (e) { G = { avisos: [e.message || String(e)], puertas: [], sueltas: [] }; }
    finally { N.limpia(); }
    escena.ponPartes(L); pintaMarcas(); if (encuadra) escena.encuadrar('iso');
    window.__r8cj = { C, G, ang, verDentro, avisos: G.avisos };
  }

  // ---------- 🟩🟥 las zonas (mientras se arrastra) ----------
  function caraEn(ev, caras) {
    const r = lienzo.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 2 - 1, y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    if (x < -1 || x > 1 || y < -1 || y > 1) return null;
    const rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2(x, y), escena.cam); const o = rc.ray.origin, d = rc.ray.direction; let mejor = null;
    (caras || ['frente', 'atras', 'izq', 'der', 'tapa']).forEach(cara => {
      if (cara === 'tapa' && verDentro) return;
      const F = CJ.marco(C, cara), n = F.n, den = d.x * n[0] + d.y * n[1] + d.z * n[2]; if (den >= -1e-6) return;
      const t = ((F.o[0] - o.x) * n[0] + (F.o[1] - o.y) * n[1] + (F.o[2] - o.z) * n[2]) / den; if (t <= 0) return;
      const P = [o.x + d.x * t - F.o[0], o.y + d.y * t - F.o[1], o.z + d.z * t - F.o[2]], u = P[0] * F.eu[0] + P[1] * F.eu[1] + P[2] * F.eu[2], v = P[0] * F.ev[0] + P[1] * F.ev[1] + P[2] * F.ev[2];
      if (cara === 'tapa' || cara === 'dentro' ? Math.abs(u) > F.hw || Math.abs(v) > F.hv : Math.abs(u) > F.hw || v < 0 || v > F.v1) return;
      if (!mejor || t < mejor.t) mejor = { cara, u, v, t };
    });
    return mejor;
  }
  // un rectángulo plano sobre una cara (u0..u1 × v0..v1), un poco por fuera
  function quad(F, u0, u1, v0, v1, fuera = 0.5) { return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => CJ.aMundo(F, u, v, fuera)); }
  function malla(quads, opac, sobre) {
    const pos = [], col = []; quads.forEach(({ q, c }) => { [0, 1, 2, 0, 2, 3].forEach(i => { pos.push(...q[i]); col.push(...c); }); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: opac, side: T.DoubleSide, depthWrite: false, depthTest: !sobre, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.renderOrder = sobre ? 9 : 6; return m;
  }
  const VERDE = [0.18, 0.86, 0.45], ROJO = [1, 0.27, 0.35], AMBAR = [1, 0.72, 0.2];
  function pintaZonas(tipo, p, idIgnora) {
    limpiaG(capaZ); if (!tipo) { escena.pide(); return; }
    const D = CJ.TIPOS[tipo], Q = [], paso = Math.max(2.5, Math.min(C.L, C.W, C.H) / 22);
    // las caras donde ese elemento NO va: enteras en rojo (la dueña: «esta zona no, en rojo»)
    if (!D.caras.includes('dentro')) ['frente', 'atras', 'izq', 'der', 'tapa'].filter(c => !D.caras.includes(c) && !(c === 'tapa' && verDentro)).forEach(cara => { const F = CJ.marco(C, cara); Q.push({ q: cara === 'tapa' ? quad(F, -F.hw + C.radio, F.hw - C.radio, -F.hv + C.radio, F.hv - C.radio, 0.6) : quad(F, -F.hw + C.radio, F.hw - C.radio, 0.5, C.H + C.tapaG - 0.5, 0.6), c: ROJO }); });
    D.caras.forEach(cara => {
      if (cara === 'tapa' && verDentro) return;
      const F = CJ.marco(C, cara);
      if (cara === 'tapa' || cara === 'dentro') { for (let u = -F.hw; u < F.hw - 0.01; u += paso) for (let v = -F.hv; v < F.hv - 0.01; v += paso) { const Z = CJ.zona(C, tipo, cara, u + paso / 2, v + paso / 2, p, idIgnora); Q.push({ q: quad(F, u + 0.15, u + paso - 0.15, v + 0.15, v + paso - 0.15, 0.6), c: Z.ok ? (Z.aviso ? AMBAR : VERDE) : ROJO }); } return; }
      if (D.junta) { for (let u = -F.hw; u < F.hw - 0.01; u += paso) { const Z = CJ.zona(C, tipo, cara, u + paso / 2, C.H, p, idIgnora); Q.push({ q: quad(F, u + 0.15, u + paso - 0.15, C.H - 5, C.H + C.tapaG, 0.6), c: Z.ok ? VERDE : ROJO }); } return; }
      for (let u = -F.hw; u < F.hw - 0.01; u += paso) for (let v = 0; v < C.H - 0.01; v += paso) { const Z = CJ.zona(C, tipo, cara, u + paso / 2, v + paso / 2, p, idIgnora); Q.push({ q: quad(F, u + 0.15, u + paso - 0.15, v + 0.15, Math.min(C.H, v + paso) - 0.15, 0.6), c: Z.ok ? (Z.aviso ? AMBAR : VERDE) : ROJO }); }
    });
    if (Q.length) capaZ.add(malla(Q, 0.42, false)); escena.pide();
  }
  // las marcas: lo elegido (naranja) y el elemento que se está arrastrando (verde / rojo)
  let fantasma = null;
  function pintaMarcas() {
    limpiaG(capaM); const Q = [];
    const e = C.els.find(x => x.id === selId); if (e) { const r = CJ.rect(C, e), F = CJ.marco(C, e.cara); if (r && F) Q.push({ q: quad(F, r.u0, r.u1, r.v0, r.v1, 1.0), c: [1, 0.55, 0.1] }); }
    if (fantasma) { const r = CJ.rect(C, fantasma), F = CJ.marco(C, fantasma.cara); if (r && F) Q.push({ q: quad(F, r.u0, r.u1, r.v0, r.v1, 1.2), c: fantasma.ok ? VERDE : ROJO }); }
    if (Q.length) capaM.add(malla(Q, 0.8, true)); escena.pide();
  }
  const dice = (txt, tipo) => { aviso.className = 'r8cj-aviso' + (tipo ? ' ' + tipo : ''); aviso.textContent = txt || ''; aviso.hidden = !txt; };
  dice('');

  // ---------- arrastrar: de la paleta a la caja, o mover lo que ya está ----------
  function empieza(tipo, ev, id) {
    const e = id ? C.els.find(x => x.id === id) : null, p = e ? e.p : Object.assign({}, CJ.TIPOS[tipo].p);
    if (CJ.TIPOS[tipo].caras.includes('dentro') && !verDentro) { verDentro = true; pinta3D(); }
    arr = { tipo, p, id, x0: ev.clientX, y0: ev.clientY, movido: false, chip: null };
    if (!id) { arr.chip = h('div.r8cj-chipvuela', CJ.TIPOS[tipo].e + ' ' + CJ.TIPOS[tipo].t); document.body.appendChild(arr.chip); mueveChip(ev); }
    pintaZonas(tipo, p, id); dice('Arrastra sobre la caja: 🟩 aquí funciona · 🟥 aquí no', 'info');
  }
  const mueveChip = ev => { if (arr && arr.chip) { arr.chip.style.left = ev.clientX + 14 + 'px'; arr.chip.style.top = ev.clientY + 10 + 'px'; } };
  function sigue(ev) {
    if (!arr) return; mueveChip(ev); if (Math.hypot(ev.clientX - arr.x0, ev.clientY - arr.y0) > 4) arr.movido = true;
    const hit = caraEn(ev, CJ.TIPOS[arr.tipo].caras.includes('dentro') ? ['dentro'] : ['frente', 'atras', 'izq', 'der', 'tapa']); // (todas: donde no va, en rojo y diciendo por qué)
    if (!hit) { fantasma = null; pintaMarcas(); dice(CJ.TIPOS[arr.tipo].e + ' Suéltalo sobre ' + CJ.TIPOS[arr.tipo].caras.map(c => CJ.CARAS[c].toLowerCase()).join(' / ') + ' de la caja', 'info'); arr.hit = null; return; }
    const Z = CJ.zona(C, arr.tipo, hit.cara, hit.u, hit.v, arr.p, arr.id);
    arr.hit = { cara: hit.cara, Z }; fantasma = { tipo: arr.tipo, cara: hit.cara, u: Z.u, v: Z.v, p: arr.p, ok: Z.ok }; pintaMarcas();
    dice((Z.ok ? (Z.aviso ? '⚠️ ' : '✅ ') : '⛔ ') + Z.motivo, Z.ok ? (Z.aviso ? 'ojo' : 'bien') : 'mal');
  }
  function suelta(ev) {
    if (!arr) return; const a = arr; arr = null; if (a.chip) a.chip.remove(); fantasma = null; pintaZonas(null); escena.ctl.enabled = true;
    if (a.id && !a.movido) { selId = a.id; pintaMarcas(); pintaDer(); dice(''); return; }
    if (!a.id && !a.movido) { armado = a.tipo; dice('👆 Ahora toca la caja donde quieras «' + CJ.TIPOS[a.tipo].t + '» (en verde)', 'info'); pintaZonas(a.tipo, a.p); pintaIzq(); return; }
    if (ev) sigue(ev);
    const hit = a.hit; dice('');
    if (!hit) { pintaMarcas(); return; }
    if (!hit.Z.ok) { toast('⛔ ' + hit.Z.motivo, 'warn', 6000); pintaMarcas(); return; }
    const antes = copia();
    if (a.id) { const e = C.els.find(x => x.id === a.id); e.cara = hit.cara; e.u = r1(hit.Z.u); e.v = r1(hit.Z.v); selId = e.id; }
    else { const e = CJ.elemento(a.tipo, hit.cara, r1(hit.Z.u), r1(hit.Z.v), a.p); C.els.push(e); selId = e.id; toast('✅ ' + CJ.TIPOS[a.tipo].t + ' puesto: ' + hit.Z.motivo, 'ok', 3500); }
    commit(antes);
  }
  const r1 = x => Math.round(x * 2) / 2;
  window.addEventListener('pointermove', sigue); window.addEventListener('pointerup', suelta); const cancela = () => { if (arr) { if (arr.chip) arr.chip.remove(); arr = null; fantasma = null; pintaZonas(null); escena.ctl.enabled = true; dice(''); } }; window.addEventListener('pointercancel', cancela);
  // en la vista: tocar un elemento ya puesto = moverlo (y la cámara se queda quieta); con uno «armado», tocar = ponerlo
  vista.addEventListener('pointerdown', ev => {
    if (ev.button > 0 || ev.target !== lienzo) return;
    if (armado) { const tipo = armado; armado = null; pintaIzq(); const hit = caraEn(ev, CJ.TIPOS[tipo].caras); pintaZonas(null);
      if (!hit) { dice('Toca la caja (otra vez el elemento para intentarlo de nuevo)', 'info'); return; }
      const Z = CJ.zona(C, tipo, hit.cara, hit.u, hit.v, CJ.TIPOS[tipo].p); if (!Z.ok) { dice('⛔ ' + Z.motivo, 'mal'); toast('⛔ ' + Z.motivo, 'warn', 6000); return; }
      const antes = copia(), e = CJ.elemento(tipo, hit.cara, r1(Z.u), r1(Z.v)); C.els.push(e); selId = e.id; dice(''); toast('✅ ' + CJ.TIPOS[tipo].t + ': ' + Z.motivo, 'ok', 3500); commit(antes); ev.stopPropagation(); escena.ctl.enabled = false; setTimeout(() => { escena.ctl.enabled = true; }, 0); return; }
    const hit = caraEn(ev, ['frente', 'atras', 'izq', 'der', 'tapa'].concat(verDentro ? ['dentro'] : [])); if (!hit) return;
    const e = C.els.slice().reverse().find(x => { if (x.cara !== hit.cara) return false; const r = CJ.rect(C, x); return r && hit.u >= r.u0 - 2 && hit.u <= r.u1 + 2 && hit.v >= r.v0 - 2 && hit.v <= r.v1 + 2; });
    if (!e) return;
    escena.ctl.enabled = false; empieza(e.tipo, ev, e.id); try { lienzo.setPointerCapture(ev.pointerId); } catch (x) { }
  }, true);

  // ---------- la barra de la vista ----------
  const rango = h('input', { type: 'range', min: 0, max: 180, step: 1, value: 0, 'aria-label': 'Abrir la tapa', oninput: e => { ang = Number(e.target.value); pinta3D(); } });
  function pintaBarra() {
    mount(vbar, [
      conBis() ? h('label.r8p-pill.r8cj-ang', { title: 'Abrir la tapa (girando en su bisagra)' }, '↻ Tapa ', rango) : null,
      btn('▶ Abrir y cerrar', animar, { cls: 'sm r8cj-anim', title: 'La tapa (y las puertas) se abren y se cierran como de verdad' }),
      btn(verDentro ? '🙈 Tapa' : '👁 Ver dentro', () => { verDentro = !verDentro; pinta3D(); pintaBarra(); }, { cls: 'sm ghost r8cj-dentro', title: 'Ver la caja por dentro (la tapa se vuelve transparente)' }),
      h('div.der', btn('⌂', () => escena.encuadrar('iso', true), { cls: 'sm ghost', title: 'Encuadrar' }), btn('↶', undo, { cls: 'sm ghost r8cj-undo', title: 'Deshacer (Ctrl Z)' })),
      h('div.r8cj-leyenda', h('span.v', '■'), ' funciona ', h('span.r', '■'), ' aquí no ', h('span.a', '■'), ' cabe, pero ojo')]);
  }
  const conBis = () => CJ.conBisagra(C);
  function animar() {
    ang = 0; angP = 0; rango.value = 0; pinta3D(); const max = (resultado && resultado.apertura) ? Math.min(resultado.apertura, 110) : 105, pmax = 100, dur = 4.2;
    escena.animar(t => { if (t > dur) { escena.animar(null); return null; } const k = Math.sin(Math.min(1, t / dur) * Math.PI), D = {};
      if (G.eje) { const M = new T.Matrix4().fromArray(CJ.giroTapa(G, k * max)); D.tapa = M; G.sueltas.filter(s => s.con === 'tapa').forEach(s => { D[s.id] = M; }); }
      G.puertas.forEach(P => { const M = new T.Matrix4().fromArray(CJ.giroPuerta(P, k * pmax)); D['puerta:' + P.id] = M; G.sueltas.filter(s => s.con === 'puerta:' + P.id).forEach(s => { D[s.id] = M; }); });
      return D; });
  }
  function undo() { const a = deshacer.pop(); if (!a) return toast('No hay nada que deshacer', 'info'); C = a; graba(C); selId = null; resultado = null; pinta3D(); pintaIzq(); pintaDer(); }
  const tecla = e => { if (!vivo || !el.isConnected) return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); undo(); } if (e.key === 'Delete' && selId && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) quita(selId); if (e.key === 'Escape') { armado = null; pintaZonas(null); dice(''); pintaIzq(); } };
  window.addEventListener('keydown', tecla);

  // ---------- izquierda: la caja y la paleta ----------
  function campoNum([k, t, mi, ma, pa]) {
    return h('label.r8cj-num', h('span', t), h('input.inp', { type: 'number', min: mi, max: ma, step: pa, value: C[k], 'data-k': k, onchange: e => { const v = Number(String(e.target.value).replace(',', '.')); if (!(v >= mi && v <= ma)) { toast(t + ': entre ' + n1(mi) + ' y ' + n1(ma), 'warn'); e.target.value = C[k]; return; } const antes = copia(); C[k] = v; commit(antes); } }), h('small', 'mm'));
  }
  function pintaIzq() {
    mount(izq, [
      h('div.r8p-tit', h('span', '📦'), h('div', h('div.r8p-marca', 'CELEBRIR8 · 30'), h('b', 'Taller de cajas'), h('small', 'Elige la tapa y ARRASTRA bisagras, cierres, pomos o puertas: verde = ahí funciona, rojo = ahí no.'))),
      h('div.r8p-sec', h('b', 'Empezar de'), h('div.r8cj-plant', Object.entries(CJ.PLANTILLAS).map(([k, P]) => h('button.r8cj-pl', { type: 'button', 'data-pl': k, title: P.d, onclick: () => { const antes = copia(); C = CJ.dePlantilla(k); selId = null; ang = 0; rango.value = 0; commit(antes); pinta3D(true); pintaBarra(); toast(P.e + ' ' + P.t + ': ' + P.d, 'ok', 4000); } }, h('span', P.e), h('small', P.t))))),
      h('div.r8p-sec', h('b', 'La tapa'), h('div.r8cj-tapas', Object.entries(CJ.TAPAS).map(([k, D]) => h('button.r8cj-tapa' + (C.tapa === k ? '.on' : ''), { type: 'button', 'data-tapa': k, 'aria-pressed': String(C.tapa === k), onclick: () => { if (C.tapa === k) return; const antes = copia(); C.tapa = k; if (k === 'presion') { C.els = C.els.filter(e => e.tipo !== 'bisagra'); toast('Tapa a presión: las bisagras se quitan', 'info'); } else if (!C.els.some(e => e.tipo === 'bisagra')) C.els.push(CJ.elemento('bisagra', 'atras', 0, 0, { largo: Math.min(60, Math.round((C.L - 2 * C.radio) * 0.45)) })); ang = 0; rango.value = 0; commit(antes); pintaBarra(); } }, h('span', D.e), h('div', h('b', D.t), h('small', D.d))))),
        C.tapa !== 'presion' ? h('label.check.small.r8cj-tope', h('input', { type: 'checkbox', checked: C.tope !== false, onchange: e => { const antes = copia(); C.tope = e.target.checked; commit(antes); } }), 'Tope: la tapa se queda abierta (a unos 105°)') : null,
        C.tapa === 'presion' ? h('div.r8cj-fila', h('label.r8cj-num', h('span', 'Ajuste'), h('select.inp', { onchange: e => { const antes = copia(); C.ajuste = e.target.value; commit(antes); } }, Object.entries(CJ.AJUSTES).map(([k, [t]]) => h('option', { value: k, selected: C.ajuste === k }, t)))), campoNum(['labio', 'Labio', 2, 15, 0.5])) : null),
      h('div.r8p-sec', h('b', 'Arrastra a la caja'), h('div.r8cj-paleta', Object.entries(CJ.TIPOS).map(([k, D]) => h('button.r8cj-el' + (armado === k ? '.on' : ''), { type: 'button', 'data-tipo': k, title: D.d + (D.comprado ? ' (necesitas ' + D.comprado + ')' : ''), onpointerdown: ev => { ev.preventDefault(); empieza(k, ev, null); } }, h('span', D.e), h('small', D.t)))),
        h('small.muted', '🖱️ Arrastra · 👆 en tablet también: toca uno y luego la caja. Para mover uno ya puesto, arrástralo. Supr lo quita.')),
      h('div.r8p-sec', h('b', 'Medidas'), h('div.r8cj-medidas', MEDIDAS.map(campoNum)),
        h('div.r8cj-fila', h('label.r8cj-col', 'Caja ', h('input', { type: 'color', value: C.color, onchange: e => { const antes = copia(); C.color = e.target.value; commit(antes); } })), h('label.r8cj-col', 'Tapa ', h('input', { type: 'color', value: C.colorTapa, onchange: e => { const antes = copia(); C.colorTapa = e.target.value; commit(antes); } }))))
    ]);
  }

  // ---------- derecha: lo puesto, comprobar e imprimir ----------
  function quita(id) { const antes = copia(); C.els = C.els.filter(e => e.id !== id); if (selId === id) selId = null; commit(antes); }
  function pintaDer() {
    const malos = (G && G.avisos) || [];
    const fila = e => { const D = CJ.TIPOS[e.tipo], Z = e.tipo === 'bisagra' ? CJ.zona(C, 'bisagra', e.cara, e.u, e.v, e.p, e.id) : CJ.zona(C, e.tipo, e.cara, e.u, e.v, e.p, e.id);
      return h('div.r8cj-it' + (selId === e.id ? '.on' : '') + (Z.ok ? '' : '.mal'), { 'data-id': e.id },
        h('button.r8cj-it-t', { type: 'button', onclick: () => { selId = selId === e.id ? null : e.id; pintaMarcas(); pintaDer(); } }, h('span', D.e), h('div', h('b', D.t), h('small', CJ.CARAS[e.cara] + (Z.ok ? '' : ' · ⛔ ' + Z.motivo)))),
        h('button.r8cj-x', { type: 'button', title: 'Quitar', 'aria-label': 'Quitar ' + D.t, onclick: () => quita(e.id) }, '✕'),
        selId === e.id ? h('div.r8cj-props', D.campos.map(([k, t, mi, ma, pa]) => h('label.r8cj-num', h('span', t), h('input.inp', { type: 'number', min: mi, max: ma, step: pa, value: e.p[k], onchange: ev => { const v = Number(String(ev.target.value).replace(',', '.')); if (!(v >= mi && v <= ma)) { toast(t + ': entre ' + n1(mi) + ' y ' + n1(ma), 'warn'); ev.target.value = e.p[k]; return; } const antes = copia(); e.p[k] = v; commit(antes); } }), h('small', 'mm'))),
          e.tipo === 'separador' ? h('label.r8cj-num', h('span', 'Dirección'), h('select.inp', { onchange: ev => { const antes = copia(); e.p.dir = ev.target.value; commit(antes); } }, h('option', { value: 'y', selected: e.p.dir !== 'x' }, 'De delante a atrás'), h('option', { value: 'x', selected: e.p.dir === 'x' }, 'De lado a lado'))) : null,
          h('small.muted', 'Para moverlo, arrástralo en la caja.')) : null); };
    mount(der, [
      h('div.r8p-sec', h('b', 'Tu caja'), h('p.small', CJ.resumen(C))),
      h('div.r8p-sec', h('b', 'Puesto (' + C.els.length + ')'), C.els.length ? h('div.r8cj-lista', C.els.map(fila)) : h('p.small.muted', 'Nada todavía: arrastra algo desde la izquierda.')),
      malos.length ? h('div.r8cj-malos', malos.map(a => h('p.small', '⛔ ' + a))) : null,
      h('div.r8p-sec', h('b', 'Comprobar'), btn('🧪 Montarla y comprobar', comprobar, { cls: 'primary r8cj-comp' }), resultado ? h('div.r8cj-res', resultado.lista.map(x => h('div.r8cj-r' + (x.ok === true ? '.ok' : x.ok === false ? '.no' : '.ojo'), h('b', (x.ok === true ? '✅ ' : x.ok === false ? '⛔ ' : '⚠️ ') + x.t), x.d ? h('small', x.d) : null))) : h('small.muted', 'La monta en el ordenador: abre la tapa y las puertas de 5 en 5 grados hasta que algo choca, y mira cuánto engancha el cierre.')),
      h('div.r8p-sec', h('b', 'Imprimir'), btn('🖨️ Preparar para tu Bambu', imprimir, { cls: 'primary r8cj-imp' }), h('div.row.wrap', btn('⬇ 3MF', () => baja('3mf'), { cls: 'sm ghost r8cj-3mf' }), btn('⬇ STL', () => baja('stl'), { cls: 'sm ghost' }), ext.alEstudioMalla ? btn('🧰 Al Estudio', alEstudio, { cls: 'sm ghost', title: 'Llevar la caja al Estudio para seguir diseñando' }) : null), piezasTxt()),
      h('div.r8p-sec', h('b', '🎁 Sorpresas de la 30'), h('div.row.wrap', btn('📸 Escaparate', () => sorpresa('escaparate'), { cls: 'sm r8cj-escaparate', title: 'Foto de estudio y vídeo 360° (cerrada) para anunciarla antes de imprimirla' }), btn('🎬 Impresión fantasma', () => sorpresa('fantasma'), { cls: 'sm r8cj-fantasma', title: 'Mira cómo se imprimirán sus piezas, capa a capa' })))
    ]);
  }
  function piezasTxt() { try { const L = CJ.piezasDe(C), extra = []; if (C.tapa === 'bisagraFil' && C.els.some(e => e.tipo === 'bisagra')) extra.push('🧵 un trozo de tu filamento de 1,75 por bisagra (córtalo 1 mm más largo y empújalo)'); const im = C.els.filter(e => e.tipo === 'iman'); if (im.length) extra.push('🧲 ' + 2 * im.length + ' imanes de ' + n1(im[0].p.d) + ' × ' + n1(im[0].p.h) + ' mm');
      return h('div.r8cj-piezas', h('small.muted', 'Salen ' + L.length + ' piezas, cada una en la postura buena (sin soportes):'), h('ul.small', L.map(p => h('li', h('b', p.nombre), p.como ? ' · ' + p.como : ''))), extra.length ? h('small', 'Además: ' + extra.join(' · ')) : null); }
    catch (e) { return h('small.r8e-mal', '⚠️ ' + e.message); } finally { N.limpia(); } }
  function comprobar() {
    const b = der.querySelector('.r8cj-comp'); if (b) { b.disabled = true; b.textContent = '⏳ Montando…'; }
    setTimeout(() => { resultado = CJ.comprueba(C); window.__r8cj.res = resultado; pintaDer(); const malos = resultado.lista.filter(x => x.ok === false).length; toast(malos ? '⛔ ' + malos + ' cosa' + (malos > 1 ? 's' : '') + ' que arreglar' : '✅ Montada y comprobada' + (resultado.apertura ? ': la tapa se abre ' + (resultado.apertura >= 200 ? 'del todo' : 'hasta ' + resultado.apertura + '°') : ''), malos ? 'warn' : 'ok', 6000); }, 30);
  }
  const nombre = () => ('Caja_' + Math.round(C.L) + 'x' + Math.round(C.W) + 'x' + Math.round(C.H + C.tapaG) + '_' + C.tapa).replace(/[^\w.-]+/g, '_');
  const partes = () => CJ.colocaEnCama(CJ.piezasDe(C)).map(p => ({ m: p.m, color: p.color, nombre: p.nombre }));
  function baja(tipo) {
    try { const L = partes(), blob = tipo === 'stl' ? N.stl(N.union(L.map(p => p.m)), nombre()) : N.tresMF(L, nombre()); const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nombre() + '.' + tipo }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); window.__r8cj.bajado = { tipo, bytes: blob.size, piezas: L.length }; toast('⬇ ' + nombre() + '.' + tipo + ' (' + L.length + ' piezas)', 'ok'); }
    catch (e) { toast(e.message || String(e), 'bad'); } finally { N.limpia(); }
  }
  async function imprimir() {
    const A = await import('../r8/consejos3d.js'), d = await import('../desktop.js').catch(() => null), cuerpo = h('div');
    modal('🖨️ Caja · preparar para tu Bambu', cuerpo, null, { size: 'wide' });
    A.asistente(cuerpo, { clave: 'caja', partes, N, uso: 'mecanica', nombre: nombre(), baja: (blob, n) => { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: n }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); }, cama: 256, forzar: { enable_support: '0' }, desktopAbrir: !!(d && d.desktop && d.desktop.on) });
  }
  async function sorpresa(que) { const S = await import('../r8/sorpresas.js'); let partes;
    try { if (que === 'escaparate') { const G2 = CJ.construye(C); partes = [{ vista: N.aVista(G2.cuerpo), color: C.color }, { vista: N.aVista(G2.tapa), color: C.colorTapa }].concat(G2.puertas.map(P => ({ vista: N.aVista(P.m), color: C.colorTapa }))).concat(G2.sueltas.map(s => ({ vista: N.aVista(s.m), color: s.nombre.startsWith('Pomo') ? C.colorTapa : C.color }))); }
      else partes = CJ.colocaEnCama(CJ.piezasDe(C)).map(p => ({ vista: N.aVista(p.m), color: p.color })); }
    catch (e) { return toast(e.message || String(e), 'bad'); } finally { N.limpia(); }
    S[que](partes, { nombre: 'Caja ' + CJ.TAPAS[C.tapa].t.toLowerCase() }); }
  function alEstudio() { try { const G2 = CJ.construye(C), m = N.union([G2.cuerpo, G2.tapa].concat(G2.puertas.map(P => P.m)).concat(G2.sueltas.map(s => s.m))); ext.alEstudioMalla(N.aSopa(m), 'Caja'); } catch (e) { toast(e.message, 'bad'); } finally { N.limpia(); } }

  pintaIzq(); pintaDer(); pintaBarra(); pinta3D(true);
  window.__r8cjApi = { get C() { return C; }, set C(x) { C = x; commit(null); }, caraEn, escena, CJ, aPantalla: q => escena.aPantalla(q), comprobar, animar };
  return { destroy() { vivo = false; window.removeEventListener('pointermove', sigue); window.removeEventListener('pointerup', suelta); window.removeEventListener('keydown', tecla); window.removeEventListener('pointercancel', cancela); limpiaG(capaZ); limpiaG(capaM); escena.destruir(); delete window.__r8cjApi; } };
}
