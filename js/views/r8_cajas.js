// ================= v30 · 📦 CelebriR8 · TALLER DE CAJAS (pantalla) =================
// A la izquierda: la caja (medidas, tipo de tapa, plantillas) y los ELEMENTOS para arrastrar. En el centro: la caja en 3D; mientras
// arrastras, cada cara se pinta de VERDE donde ese elemento funciona y de ROJO donde no (y abajo se lee por qué). Al soltar en
// rojo no se pone. Lo ya puesto se mueve arrastrándolo. En tablet: tocar un elemento y luego tocar la caja también vale.
// A la derecha: lo puesto (con sus medidas), 🧪 Comprobar (la monta: abre la tapa y las puertas hasta que algo choca) e Imprimir.
import { h, mount, btn, toast, modal } from '../ui.js';
import * as N from '../r8/nucleo.js';
import { crearEscena } from '../r8/escena3d.js';
import * as CJ from '../r8/cajas.js';
import * as CP from '../r8/cajas_pro.js'; // 14-10-2026 · Taller de cajas PRO: impresoras, estilos (el limitador y «arreglar todo» viven en cajas.js)
import * as CV from '../r8/cajas_venta.js'; // 14-10-2026 (tarde) · 🛒 la ficha para Cults y «📦 Exportar todo»
import { zip } from '../r8/motor.js';
const CE = CJ.CE; // las cajas enigma (laberinto, criptex, japonesa de pasos): C.forma

const LS = 'cd.r8.cajas';
// las plantillas nuevas (14-10-2026) van primero: son las «premium»
const NUEVAS = ['secreta', 'combinacion', 'conLlave', 'seisEnUno', 'multifuncion', 'herramientas2', 'tornillos2', 'pilas'];
const traslada = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const n1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');
const lee = () => { try { const x = JSON.parse(localStorage.getItem(LS) || 'null'); if (x && x.L && Array.isArray(x.els)) return Object.assign(CJ.nueva(), x); } catch (e) { } return CJ.dePlantilla('joyero'); }; // (lo guardado antes del 14-10 no tenía estilo ni impresora)
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
    // (14-10: TODO lo que se construye va en su «ámbito»: lo de en medio se libera al acabar. Sin él, cada repintado dejaba memoria
    // ocupada en el motor —restas, giros, uniones— y en una sesión larga, con el criptex y sus letras, se agotaba: «memory access out of bounds»)
    try { N.enAmbito(() => {
      const g = CJ.construye(C), en = CE.es(C);
      G = { eje: g.eje, avisos: g.avisos, puertas: g.puertas.map(P => ({ id: P.id, eje: P.eje, F: P.F })), sueltas: g.sueltas.map(s => ({ id: s.id, con: s.con, nombre: s.nombre })), enigma: g.enigma || null };
      // una caja enigma: el deslizador la abre SIGUIENDO su truco (0 = cerrada, 180 = abierta del todo)
      const Pz = en ? CE.pose(C, g, ang / 180) : null, mt = en ? (Pz.tapa || null) : matTapa(ang);
      L.push({ id: 'cuerpo', vista: N.aVista(g.cuerpo), color: C.color, acabado: 'mate' });
      L.push({ id: 'tapa', vista: N.aVista(g.tapa), color: C.colorTapa, acabado: 'mate', matriz: mt, fantasma: verDentro });
      g.puertas.forEach(P => L.push({ id: 'puerta:' + P.id, vista: N.aVista(P.m), color: C.colorTapa, acabado: 'mate', matriz: angP ? CJ.giroPuerta(P, angP) : null }));
      g.sueltas.filter(s => s.m).forEach(s => { const P = s.con && s.con.startsWith('puerta:') ? G.puertas.find(q => 'puerta:' + q.id === s.con) : null;
        L.push({ id: s.id, vista: N.aVista(s.m), color: colSuelta(s), acabado: 'mate', matriz: en ? (Pz[s.id] || null) : s.con === 'tapa' ? mt : P && angP ? CJ.giroPuerta(P, angP) : null, fantasma: s.con === 'tapa' && verDentro }); });
    }); } catch (e) { G = { avisos: [e.message || String(e)], error: e.message || String(e), puertas: [], sueltas: [] }; }
    finally { N.limpia(); }
    escena.ponPartes(L); pintaMarcas(); if (encuadra) escena.encuadrar('iso');
    window.__r8cj = Object.assign(window.__r8cj && window.__r8cj.C === C ? window.__r8cj : {}, { C, G, ang, verDentro, avisos: G.avisos, revisa: CJ.revisa(C), enigma: CE.es(C) ? C.forma : null });
  }
  // el color de cada pieza suelta: llaves, ruedas, pomos y anillos = «detalles»; los paneles de la japonesa, como la tapa
  const colSuelta = s => (CE.es(C) && C.forma === 'secuencia') ? C.colorTapa : s.tapaColor || s.nombre.startsWith('Pomo') ? (C.colorDet || C.colorTapa) : C.color;
  // la tapa abierta «a» (0–180): con bisagra gira; la corredera sale hacia la derecha; la de presión sube
  function matTapa(a) {
    if (G && G.eje) return CJ.giroTapa(G, a);
    if (!a) return null;
    if (C.tapa === 'corredera') return traslada(a / 180 * (C.L + 8), 0, 0);
    return traslada(0, 0, a / 180 * ((C.labio || 5) + 30));
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
      CE.es(C) ? h('label.r8p-pill.r8cj-ang', { title: 'Abrirla siguiendo su truco (como se abre de verdad)' }, '🧩 Abrir ', rango)
        : h('label.r8p-pill.r8cj-ang', { title: conBis() ? 'Abrir la tapa (girando en su bisagra)' : C.tapa === 'corredera' ? 'Sacar la tapa (corre por sus ranuras)' : 'Levantar la tapa' }, (conBis() ? '↻' : C.tapa === 'corredera' ? '↔' : '↥') + ' Tapa ', rango),
      btn('▶ Abrir y cerrar', animar, { cls: 'sm r8cj-anim', title: 'La tapa, las puertas y el cajón se abren y se cierran como de verdad' }),
      btn(verDentro ? '🙈 Tapa' : '👁 Ver dentro', () => { verDentro = !verDentro; pinta3D(); pintaBarra(); }, { cls: 'sm ghost r8cj-dentro', title: CE.es(C) && C.forma === 'laberinto' ? 'Ver el laberinto (la tapa se vuelve transparente)' : 'Ver la caja por dentro (la tapa se vuelve transparente)' }),
      h('div.der', btn('⌂', () => escena.encuadrar('iso', true), { cls: 'sm ghost', title: 'Encuadrar' }), btn('↶', undo, { cls: 'sm ghost r8cj-undo', title: 'Deshacer (Ctrl Z)' })),
      CE.es(C) ? null : h('div.r8cj-leyenda', h('span.v', '■'), ' funciona ', h('span.r', '■'), ' aquí no ', h('span.a', '■'), ' cabe, pero ojo')]);
  }
  const conBis = () => CJ.conBisagra(C);
  // 14-10-2026 · 🎬 ANIMACIÓN: ella elige QUÉ se mueve (la tapa, la llave que gira, las ruedas y el pestillo, el cajón, la bandeja…);
  // con cerradura, primero se abre la cerradura y luego la tapa, como de verdad. Se puede GRABAR en vídeo (6 s) y cambiar los colores.
  const LS_AN = 'cd.r8.cajas.anim';
  const anSel = (() => { try { return JSON.parse(localStorage.getItem(LS_AN) || 'null') || {}; } catch (e) { return {}; } })();
  let girar = true;
  function movibles() {
    if (CE.es(C)) return CE.movibles(C);
    const L = [{ k: 'tapa', t: C.tapa === 'corredera' ? '↔️ La tapa corre' : C.tapa === 'presion' ? '⬆️ La tapa se levanta' : '↻ La tapa se abre' }];
    C.els.forEach(e => { const T2 = { llave: '🔑 La llave gira', combinacion: '🔢 Las ruedas y el pestillo', puerta: '🚪 La puerta', cajon: '🗃️ El cajón sale', bandeja: '🧺 La bandeja sube', fondo: '🫥 El fondo falso se levanta', cubetas: '🧊 Las cubetas salen' }[e.tipo];
      if (T2) L.push({ k: e.tipo + ':' + e.id, t: T2 }); });
    return L;
  }
  const elige = k => { if (anSel[k] !== undefined) return anSel[k] !== false; const m = movibles().find(x => x.k === k); return !(m && m.apagado); }; // (de serie, todo menos lo «apagado»)
  const suave = (t, a, b) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  const vaYViene = (t, a, b, c, d) => suave(t, a, b) * (1 - suave(t, c, d));
  function animar(o = {}) {
    if (CE.es(C)) return animarEnigma(o);
    ang = 0; angP = 0; rango.value = 0; pinta3D();
    const dur = o.dur || 6, max = (resultado && resultado.apertura > 0) ? Math.min(resultado.apertura, 110) : 105, M4 = a => new T.Matrix4().fromArray(a);
    const conCerradura = C.els.some(e => (e.tipo === 'llave' || e.tipo === 'combinacion') && elige(e.tipo + ':' + e.id)), f0 = conCerradura ? 0.2 : 0.02;
    window.__r8cj.anima = { partes: movibles().filter(m => elige(m.k)).map(m => m.k), dur };
    escena.animar(t => { if (t > dur) { escena.animar(null); if (o.alAcabar) o.alAcabar(); return null; } const x = t / dur, D = {};
      const uL = vaYViene(x, 0.02, 0.18, 0.86, 0.98), uT = vaYViene(x, f0, f0 + 0.2, 0.66, 0.84), uI = vaYViene(x, f0 + 0.2, f0 + 0.32, 0.56, 0.66);
      if (elige('tapa')) { const mt = G.eje ? CJ.giroTapa(G, uT * max) : matTapa(uT * 180); if (mt) { const M = M4(mt); D.tapa = M; G.sueltas.filter(s => s.con === 'tapa').forEach(s => { D[s.id] = M; }); } }
      G.puertas.forEach(P => { if (!elige('puerta:' + P.id)) return; const M = M4(CJ.giroPuerta(P, uT * 100)); D['puerta:' + P.id] = M; G.sueltas.filter(s => s.con === 'puerta:' + P.id).forEach(s => { D[s.id] = M; }); });
      C.els.forEach(e => {
        if (!elige(e.tipo + ':' + e.id)) return;
        // 17-10-2026 · la cerradura de discos: la llave gira algo más de media vuelta; cada disco empieza a moverse cuando su corte lo alcanza
        // y, con las muescas juntas, el bombín (con la leva) gira su cuarto de vuelta
        if (e.tipo === 'llave') { const F = CJ.marco(C, e.cara), ZK = C.H - CP.llaveBajo(C), s = CP.llaveLado(e.cara), kap = uL * CP.CD.KT, cod = CP.llaveCodigo(e.p.codigo), b = CP.CD.giroBombin(kap);
          const gi = a => M4(CJ.giro({ o: CJ.aMundo(F, e.u, ZK, 0), dir: F.n.map(v => -v) }, s * a));
          ['leva:', 'bombin:', 'tapon:', 'barra:'].concat(Array.from({ length: CP.CD.DD.N - 1 }, (_, k) => 'sep' + k + ':')).forEach(pp => { D[pp + e.id] = gi(b); });
          for (let k = 0; k < CP.CD.DD.N; k++) D['disco' + k + ':' + e.id] = gi(CP.CD.giroDisco(cod, k, kap));
          D['llave:' + e.id] = gi(kap); }
        if (e.tipo === 'combinacion') { const F = CJ.marco(C, e.cara), Q = CP.combMedidas(C, e), uR = suave(x, 0.02, 0.12) * (1 - suave(x, 0.9, 0.98)), uP = vaYViene(x, 0.12, 0.18, 0.86, 0.9);
          Q.cs.forEach((c, k) => { D['rueda' + k + ':' + e.id] = M4(CJ.giro({ o: CJ.aMundo(F, c, Q.ZB, CP.COMB.YB), dir: F.eu }, (1 - uR) * 36 * (3 + 2 * k))); });
          D['pest:' + e.id] = M4(traslada(...F.eu.map(v => -v * CP.COMB.SALE * uP))); }
        if (e.tipo === 'cajon') D['cajon:' + e.id] = M4(traslada(0, -uI * C.W * 0.7, 0));
        if (e.tipo === 'bandeja') D['bandeja:' + e.id] = M4(traslada(0, 0, uI * C.H * 0.7));
        if (e.tipo === 'fondo') D['fondo:' + e.id] = M4(traslada(0, 0, uI * C.H * 0.6));
        if (e.tipo === 'cubetas') G.sueltas.filter(s => s.id.startsWith('cubeta') && s.id.endsWith(':' + e.id)).forEach((s, i) => { D[s.id] = M4(traslada(0, 0, vaYViene(x, f0 + 0.2 + i * 0.015, f0 + 0.32 + i * 0.015, 0.56, 0.66) * C.H * 0.8)); });
      });
      return D; });
  }
  // 🧩 una caja enigma se abre SIGUIENDO su truco (el laberinto, la palabra del criptex, los 4 pasos de la japonesa) y se vuelve a cerrar
  function animarEnigma(o = {}) {
    const ms = movibles(), ver = ms.some(m => m.k === 'ver' && elige('ver')), dur = o.dur || 6, M4 = a => new T.Matrix4().fromArray(a);
    ang = 0; angP = 0; rango.value = 0; verDentro = ver; pinta3D(); pintaBarra();
    const ids = new Set(ms.filter(m => elige(m.k)).flatMap(m => m.ids || []));
    window.__r8cj.anima = { partes: ms.filter(m => elige(m.k)).map(m => m.k), dur, enigma: C.forma };
    escena.animar(t => { if (t > dur) { escena.animar(null); if (o.alAcabar) o.alAcabar(); return null; }
      const u = vaYViene(t / dur, 0.03, 0.55, 0.66, 0.97), Pz = CE.pose(C, G, u), D = {};
      Object.keys(Pz).forEach(id => { if (ids.has(id)) D[id] = M4(Pz[id]); });
      return D; });
  }
  const descarga = (blob, n) => { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: n }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); };
  // ⏺ GRABAR: lo que se ve en el 3D mientras se anima (6 s), en MP4 si el navegador sabe (si no, WebM), con la cámara girando despacio
  async function grabarVideo(o = {}) {
    const bt = der.querySelector('.r8cj-grabar'); if (bt) { bt.disabled = true; bt.textContent = '⏺ Grabando…'; }
    try {
      if (!window.MediaRecorder || !lienzo.captureStream) throw new Error('este navegador no sabe grabar vídeo');
      const dur = 6, st = lienzo.captureStream(30), tipo = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x)) || '';
      const rec = new MediaRecorder(st, tipo ? { mimeType: tipo, videoBitsPerSecond: 8e6 } : undefined), trozos = [], fin = new Promise(r => { rec.onstop = r; });
      rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); };
      verDentro = false; pinta3D(); escena.encuadrar('iso', true); if (girar && escena.giraCamara) escena.giraCamara(0.5);
      rec.start(250); const tic = setInterval(() => escena.pide(), 30);
      await new Promise(r => animar({ dur, alAcabar: r }));
      await new Promise(r => setTimeout(r, 300)); clearInterval(tic); rec.stop(); await fin; if (escena.giraCamara) escena.giraCamara(0);
      const mp4 = /mp4/.test(tipo), blob = new Blob(trozos, { type: mp4 ? 'video/mp4' : 'video/webm' }), n = nombre() + '.' + (mp4 ? 'mp4' : 'webm');
      window.__r8cj.video = { bytes: blob.size, tipo: blob.type, nombre: n };
      if (o.devolver) return { blob, nombre: n };
      descarga(blob, n); toast('🎬 Vídeo guardado: ' + n + ' (en Descargas)', 'ok', 7000);
    } catch (e) { if (o.devolver) throw e; toast('No he podido grabar: ' + (e.message || e), 'bad', 8000); } finally { if (bt) { bt.disabled = false; bt.textContent = '⏺ Grabar vídeo'; } if (verDentro) { verDentro = false; pinta3D(); pintaBarra(); } }
  }
  // 📄 el MANUAL de esta caja (para venderla): fotos cerrada y abierta, piezas, pasos, consejos y cuidados
  // una foto del 3D: «a» = lo abierta (0–180), dentro = con la tapa transparente
  const espera2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  async function fotoDe(a, dentro = false, dir = 'iso') { ang = a; rango.value = a; verDentro = dentro; pinta3D(); escena.encuadrar(dir); await espera2(); return escena.foto('image/jpeg', 0.9); }
  // el criptex abierto se fotografía por DETRÁS (se ven la ranura y las pestañas; la palabra, que está delante, no se lee)
  const vistaAbierta = () => CE.es(C) && C.forma === 'criptex' ? [0.62, 0.95, 0.72] : 'iso';
  const anguloAbierta = () => CE.es(C) ? 180 : conBis() ? Math.min(100, (resultado && resultado.apertura > 0) ? resultado.apertura : 100) : 120;
  const tituloCaja = () => CJ.tituloDe(C);
  const subCaja = () => { const P = C.plantilla && CJ.PLANTILLAS[C.plantilla], igual = P && (P.C.forma || '') === (C.forma || ''); return (igual ? P.d + ' · ' : '') + (CE.es(C) ? CJ.resumen(C) : Math.round(C.L) + ' × ' + Math.round(C.W) + ' × ' + Math.round(C.H + C.tapaG) + ' mm'); };
  async function laTienda() { try { const { S } = await import('../store.js'); return (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'CelebriDiseños'; } catch (e) { return 'CelebriDiseños'; } }
  // el manual de ESTA caja (html) y, si es una caja enigma, la hoja de la solución (aparte)
  async function hojas() {
    const MN = await import('../r8/manual.js'), MC = await import('../r8/cajas_manual.js'); let M;
    try { M = N.enAmbito(() => MC.manualCaja(C)); } finally { N.limpia(); }
    const fotos = [], v0 = verDentro;
    try { fotos.push({ src: await fotoDe(0), pie: 'Cerrada' }); fotos.push({ src: await fotoDe(anguloAbierta(), false, vistaAbierta()), pie: 'Abierta' }); } finally { verDentro = v0; ang = 0; rango.value = 0; pinta3D(); }
    const tienda = await laTienda(), titulo = tituloCaja();
    const html = MN.hojaManual({ titulo, sub: subCaja(), tienda, fotos, M, color: C.colorDet || '' });
    return { M, titulo, tienda, html, solucion: M.solucion ? CV.hojaSolucion(M.solucion, titulo, tienda) : null, fotos };
  }
  const limpioNombre = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');
  async function manual() {
    let Hj; try { Hj = await hojas(); } catch (e) { return toast('No he podido preparar el manual: ' + (e.message || e), 'bad'); }
    const { M, titulo, html } = Hj;
    const marco = h('iframe.man-marco', { title: 'Manual', sandbox: 'allow-same-origin allow-modals' }); marco.srcdoc = html;
    window.__r8cj.manual = { pasos: M.pasos.length, piezas: M.piezas.length, fotos: Hj.fotos.length, html, solucion: !!Hj.solucion };
    modal('📄 Manual · ' + titulo, h('div.man', h('p.small.muted', { style: { margin: 0 } }, 'Una hoja A4 para meter en la caja o mandar en PDF al que te la compra. Sale de ESTA caja: sus piezas, sus cerraduras y sus medidas.' + (Hj.solucion ? ' La SOLUCIÓN va en otra hoja (para ti, o doblada para quien se rinda).' : '')), marco), c => [
      btn('⬇️ Guardar (archivo)', () => descarga(new Blob([html], { type: 'text/html' }), 'Manual_' + limpioNombre(titulo) + '.html'), { cls: 'ghost' }),
      Hj.solucion ? btn('🔑 Solución (hoja aparte)', () => descarga(new Blob([Hj.solucion], { type: 'text/html' }), 'Solucion_' + limpioNombre(titulo) + '.html'), { cls: 'ghost r8cj-solucion' }) : null,
      btn('🖨️ Imprimir o guardar en PDF', () => { try { marco.contentWindow.focus(); marco.contentWindow.print(); } catch (e) { toast('Guarda el archivo y ábrelo para imprimirlo.', 'warn'); } }, { cls: 'primary r8cj-man-imp' }), btn('Cerrar', c, { cls: 'ghost' })].filter(Boolean), { size: 'wide' });
  }
  // 🛒 LA FICHA PARA CULTS: cada cosa que pide su formulario, con su botón de copiar y una nota al lado (para rellenarlo directamente)
  const copiar = async (txt, ok) => { try { await navigator.clipboard.writeText(txt); } catch (e) { const t = h('textarea', { style: { position: 'fixed', left: '-9999px' } }); t.value = txt; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (x) { } t.remove(); } toast('📋 Copiado: ' + ok, 'ok', 2500); };
  function fichaCults() {
    let Fi; try { Fi = N.enAmbito(() => CV.ficha(C, resultado)); } catch (e) { return toast('No he podido preparar la ficha: ' + (e.message || e), 'bad'); } finally { N.limpia(); }
    window.__r8cj.ficha = Fi;
    const precio = h('input.inp.r8cj-precio', { type: 'number', min: 0.5, max: 99, step: 0.01, value: Fi.precio, 'aria-label': 'Tu precio en Cults (€)', onchange: e => { const v = Number(String(e.target.value).replace(',', '.')); if (!(v >= 0.5 && v <= 99)) { toast('🛑 El precio, entre 0,50 y 99 €', 'warn'); e.target.value = Fi.precio; return; } const antes = copia(); C.precioCults = v === Fi.sugerido ? null : v; graba(C); deshacer.push(antes); pintaDer(); toast('💶 Precio para Cults: ' + CV.euros(v), 'ok', 2500); } });
    const cuerpo = h('div.r8cj-fichas',
      h('p.small.muted', { style: { margin: '0 0 8px' } }, 'Abre Cults → «Subir un diseño» y copia cada cosa en su sitio (📋). Las notas de la derecha son para ti. ' + (Fi.comprobada ? '✅ Esta caja está montada y comprobada.' : '⚠️ Pulsa antes «🧪 Montarla y comprobar»: si algo sale en rojo, no la subas.')),
      Fi.campos.map(c => h('div.r8cj-fc', { 'data-campo': c.k },
        h('div.r8cj-fc-v', h('b', c.t), c.k === 'precio' ? h('div.row', precio, h('small.muted', '€ · propuesto: ' + CV.euros(Fi.sugerido))) : h('textarea.inp', { readonly: true, rows: Math.min(14, Math.max(1, Math.ceil(c.v.length / 70) + (c.v.match(/\n/g) || []).length)), value: c.v }),
          btn('📋 Copiar', () => copiar(c.k === 'precio' ? String(Fi.precio).replace('.', ',') : c.v, c.t), { cls: 'sm ghost r8cj-copia' })),
        h('small.r8cj-fc-nota', '📝 ' + c.nota))));
    modal('🛒 Ficha para Cults · ' + Fi.titulo.es, cuerpo, c => [btn('📦 Exportar todo', () => { c(); exportar(); }, { cls: 'primary' }), btn('Cerrar', c, { cls: 'ghost' })], { size: 'wide' });
  }
  // 📦 EXPORTAR TODO: un ZIP con el vídeo, las fotos, la ficha (título, descripción, precio, etiquetas y notas), el manual, la solución y,
  // dentro, el ZIP que se sube TAL CUAL a Cults (una pieza por STL, el 3MF con colores, el manual y la solución)
  let exportando = false;
  async function exportar(o = {}) {
    if (exportando) return; const prob = CJ.revisa(C); if (prob.length || (G && G.error)) return guardia(() => { });
    exportando = true; const bt = der.querySelector('.r8cj-exportar'), paso = t => { if (bt) bt.textContent = '⏳ ' + t; };
    if (bt) bt.disabled = true;
    const enc = new TextEncoder(), datos = async b => new Uint8Array(b instanceof Blob ? await b.arrayBuffer() : b), deFoto = u => { const b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
    try {
      paso('Comprobando…'); await espera2();
      if (!resultado) { resultado = N.enAmbito(() => CJ.comprueba(C)); window.__r8cj.res = resultado; }
      const malos = resultado.lista.filter(x => x.ok === false); if (malos.length) throw new Error('la caja tiene ' + malos.length + ' cosa(s) en rojo al montarla: ' + malos.map(x => x.t).join(' · '));
      const Fi = N.enAmbito(() => CV.ficha(C, resultado)), base = Fi.nombreArchivo || 'Caja', A = [], dentro = [];
      paso('Piezas…'); await espera2();
      const L = N.enAmbito(() => CJ.piezasDe(C).map(p => ({ nombre: p.nombre, b: new Uint8Array(N.stl(p.m, p.nombre)) }))), usados = {};
      for (const [i, p] of L.entries()) { let n = String(i + 1).padStart(2, '0') + '_' + limpioNombre(p.nombre); if (usados[n]) n += '_' + i; usados[n] = 1; dentro.push({ nombre: base + '/' + n + '.stl', datos: p.b }); }
      dentro.push({ nombre: base + '/' + base + '_todas_las_piezas.3mf', datos: await datos(N.enAmbito(() => N.tresMF(partes(), base))) });
      if (CE.es(C) && C.forma === 'criptex') for (const L2 of CE.crxLetras(C)) { paso('Anillo ' + L2 + '…'); await espera2(); try { dentro.push({ nombre: base + '/Anillos_para_cualquier_palabra/Anillo_' + L2 + '.stl', datos: new Uint8Array(N.stl(CE.crxAnilloLetra(C, L2), 'Anillo ' + L2)) }); } finally { N.limpia(); } }
      N.limpia();
      paso('Fotos…');
      const v0 = verDentro, fotos = [];
      try {
        fotos.push(['01_portada_cerrada.jpg', await fotoDe(0)]); fotos.push(['02_abierta.jpg', await fotoDe(anguloAbierta(), false, vistaAbierta())]);
        if (CE.es(C) && C.forma === 'laberinto') fotos.push(['03_por_dentro_el_laberinto.jpg', await fotoDe(0, true)]);
        // las piezas como salen en la cama (sin soportes)
        escena.ponPartes(N.enAmbito(() => CJ.colocaEnCama(CJ.piezasDe(C)).map((q, i) => ({ id: 'p' + i, vista: N.aVista(q.m), color: q.color, acabado: 'mate' })))); escena.encuadrar('iso'); await espera2();
        fotos.push([(fotos.length + 1 < 10 ? '0' : '') + (fotos.length + 1) + '_piezas_en_la_cama.jpg', escena.foto('image/jpeg', 0.9)]);
      } finally { N.limpia(); verDentro = v0; ang = 0; rango.value = 0; pinta3D(); }
      fotos.forEach(([n, u]) => A.push({ nombre: 'FOTOS/' + n, datos: deFoto(u) }));
      paso('Manual…');
      const Hj = await hojas();
      dentro.push({ nombre: base + '/Manual_de_montaje.html', datos: enc.encode(Hj.html) });
      if (Hj.solucion) dentro.push({ nombre: base + '/Solucion.html', datos: enc.encode(Hj.solucion) });
      dentro.push({ nombre: base + '/LEEME.txt', datos: enc.encode([Fi.titulo.en, Fi.titulo.es, '', Fi.descripcion.en, '', '———', '', Fi.descripcion.es, '', '© ' + Hj.tienda + ' · uso personal: no se permite vender los archivos ni lo impreso sin permiso.'].join('\r\n')) });
      const zipCults = zip(dentro);
      A.push({ nombre: '1_SUBIR_A_CULTS/' + base + '.zip', datos: await datos(zipCults) });
      A.push({ nombre: '2_FICHA_PARA_CULTS.txt', datos: enc.encode(CV.fichaTexto(Fi)) });
      A.push({ nombre: '3_Manual_de_montaje.html', datos: enc.encode(Hj.html) });
      if (Hj.solucion) A.push({ nombre: '4_Solucion_(para_ti).html', datos: enc.encode(Hj.solucion) });
      if (o.video !== false) { paso('Grabando el vídeo (6 s)…'); try { const V = await grabarVideo({ devolver: true }); A.push({ nombre: 'VIDEO/' + V.nombre.replace(/^.*\./, base + '.'), datos: await datos(V.blob) }); } catch (e) { toast('El vídeo no ha podido grabarse (' + (e.message || e) + '): va todo lo demás.', 'warn', 7000); } }
      const todo = zip(A), n = base + '_CULTS.zip';
      window.__r8cj.exportado = { nombre: n, bytes: todo.size, archivos: A.map(a => a.nombre), dentro: dentro.map(a => a.nombre), precio: Fi.precio };
      descarga(todo, n);
      modal('📦 Exportado: ' + n, h('div', h('p', 'Está en tu carpeta de Descargas. Dentro:'), h('ul.small',
        h('li', h('b', '1_SUBIR_A_CULTS/' + base + '.zip'), ' → el archivo que subes a Cults TAL CUAL (' + L.length + ' piezas en STL, el 3MF con colores, el manual' + (Hj.solucion ? ' y la solución' : '') + (CE.es(C) && C.forma === 'criptex' ? ', y un anillo de cada ' + (C.alfabeto === 'numeros' ? 'cifra' : 'letra') + ' para que el que lo compre escriba SU palabra' : '') + ').'),
        h('li', h('b', '2_FICHA_PARA_CULTS.txt'), ' → título, descripción, parámetros, categoría, etiquetas, precio (' + CV.euros(Fi.precio) + ') y tus notas.'),
        h('li', h('b', 'FOTOS/'), ' → ' + fotos.length + ' fotos (la 01 es la portada). Si la imprimes, añade una foto tuya: es lo que más vende.'),
        A.some(a => a.nombre.startsWith('VIDEO/')) ? h('li', h('b', 'VIDEO/'), ' → 6 s abriéndose: para Instagram, TikTok o Wallapop.') : null,
        h('li', h('b', '3_Manual_de_montaje.html'), Hj.solucion ? ' y 4_Solucion' : '', ' → ábrelos y «Imprimir → Guardar como PDF» si los quieres en PDF.'))), c => [btn('Vale', c, { cls: 'primary' })]);
    } catch (e) { toast('No he podido exportar: ' + (e.message || e), 'bad', 9000); window.__r8cj.exportado = { error: e.message || String(e) }; }
    finally { exportando = false; if (bt) { bt.disabled = false; bt.textContent = '📦 Exportar todo'; } pinta3D(); }
  }
  function undo() { const a = deshacer.pop(); if (!a) return toast('No hay nada que deshacer', 'info'); C = a; graba(C); selId = null; resultado = null; pinta3D(); pintaIzq(); pintaDer(); pintaBarra(); } // (pintaBarra: deshacer puede volver de una caja enigma a una normal)
  const tecla = e => { if (!vivo || !el.isConnected) return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); undo(); } if (e.key === 'Delete' && selId && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) quita(selId); if (e.key === 'Escape') { armado = null; pintaZonas(null); dice(''); pintaIzq(); } };
  window.addEventListener('keydown', tecla);

  // ---------- izquierda: la caja y la paleta ----------
  // 🛑 el limitador: largo, ancho y alto, como mucho lo que imprime SU impresora
  const impresora = () => CP.IMPRESORAS[C.impresora] || CP.IMPRESORAS.p1p;
  function campoNum([k, t, mi, ma, pa]) {
    const I = impresora(), porImp = k === 'L' || k === 'W' ? I.cama - 6 : k === 'H' ? I.alto - 2 - (CJ.altoTotal(C) - C.H) : null;
    if (porImp != null && porImp < ma) ma = Math.floor(porImp);
    return h('label.r8cj-num', h('span', t), h('input.inp', { type: 'number', min: mi, max: ma, step: pa, value: C[k], 'data-k': k, onchange: e => { const v = Number(String(e.target.value).replace(',', '.')); if (!(v >= mi && v <= ma)) { toast('🛑 ' + t + ': entre ' + n1(mi) + ' y ' + n1(ma) + ' mm' + (porImp != null && v > ma && ma === Math.floor(porImp) ? ' (lo que imprime tu ' + I.t + ')' : ''), 'warn', 6000); e.target.value = C[k]; return; } const antes = copia(), malos0 = CJ.revisa(C).length; C[k] = v; commit(antes); const malos = CJ.revisa(C).length; if (malos > malos0) toast('⚠️ Con esa medida hay ' + malos + ' cosa' + (malos > 1 ? 's' : '') + ' en rojo: mira «Revisión» (a la derecha) y pulsa 🛠️ Arreglar todo.', 'warn', 7000); } }), h('small', 'mm'));
  }
  // cambiar de tapa: fuera lo que con esa tapa no va (y se dice), y bisagras si hacen falta
  function cambiaTapa(k) {
    if (C.tapa === k) return; const antes = copia(), fuera = [];
    C.tapa = k;
    C.els = C.els.filter(e => { const no = CJ.porQueNo(C, e.tipo, e.id, true); if (no) fuera.push(CJ.TIPOS[e.tipo].e + ' ' + CJ.TIPOS[e.tipo].t); return !no; });
    if (CJ.conBisagra(C) && !C.els.some(e => e.tipo === 'bisagra')) C.els.push(CJ.elemento('bisagra', 'atras', 0, 0, { largo: Math.min(60, Math.round((C.L - 2 * C.radio) * 0.45)) }));
    if (fuera.length) toast(CJ.TAPAS[k].e + ' Con esta tapa no van y los he quitado: ' + fuera.join(', ') + ' (↶ para deshacer)', 'info', 7000);
    ang = 0; rango.value = 0; commit(antes); pintaBarra();
  }
  // (14-10: si al repintar se quita un campo que tenía el foco, el navegador lanza su «change» otra vez y se repintaba DENTRO del repintado: se deja para luego)
  let pintaIzqYa = false; function pintaIzq() { if (pintaIzqYa) { setTimeout(pintaIzq, 0); return; } pintaIzqYa = true; try { pintaIzq0(); } finally { pintaIzqYa = false; } }
  function pintaIzq0() {
    mount(izq, [
      h('div.r8p-tit', h('span', '📦'), h('div', h('div.r8p-marca', 'CELEBRIR8 · PRO'), h('b', 'Taller de cajas'), h('small', 'Empieza de una plantilla o elige la tapa y ARRASTRA lo que quieras: verde = ahí funciona, rojo = ahí no (y te dice por qué).'))),
      h('div.r8p-sec', h('b', 'Empezar de'), [['🧩 Enigma: se abren con un truco', k => CJ.PLANTILLAS[k].g === 'enigma'], ['🔑 Con llave', k => CJ.PLANTILLAS[k].g === 'llave' || k === 'conLlave'], ['🤫 Secretas y discretas', k => CJ.PLANTILLAS[k].g === 'secreta' || ['secreta', 'combinacion'].includes(k)], ['🧰 Útiles', k => CJ.PLANTILLAS[k].g === 'util' || ['pilas', 'seisEnUno', 'multifuncion', 'herramientas2', 'tornillos2'].includes(k)], ['🎁 Para regalar y guardar', k => CJ.PLANTILLAS[k].g === 'regalo'], ['Las de siempre', k => !CJ.PLANTILLAS[k].g && !NUEVAS.includes(k)]].map(([gt, f]) => h('div.r8cj-grupo', h('small.r8cj-gt', gt), h('div.r8cj-plant', Object.entries(CJ.PLANTILLAS).filter(([k]) => f(k)).map(([k, P]) => h('button.r8cj-pl' + (NUEVAS.includes(k) || CJ.PLANTILLAS[k].g ? '.nueva' : ''), { type: 'button', 'data-pl': k, title: P.d, onclick: () => { const antes = copia(); C = CJ.dePlantilla(k); selId = null; ang = 0; rango.value = 0; resultado = null; commit(antes); pinta3D(true); pintaBarra(); toast(P.e + ' ' + P.t + ': ' + P.d, 'ok', 4000); } }, h('span', P.e), h('small', P.t))))))),
      ...(CE.es(C) ? izqEnigma() : [h('div.r8p-sec', h('b', 'La tapa'), h('div.r8cj-tapas', Object.entries(CJ.TAPAS).filter(([k, D]) => !D.fragil || C.tapa === k).map(([k, D]) => h('button.r8cj-tapa' + (C.tapa === k ? '.on' : ''), { type: 'button', 'data-tapa': k, 'aria-pressed': String(C.tapa === k), onclick: () => cambiaTapa(k) }, h('span', D.e), h('div', h('b', D.t), h('small', D.d))))),
        CJ.conBisagra(C) ? h('label.check.small.r8cj-tope', h('input', { type: 'checkbox', checked: C.tope !== false, onchange: e => { const antes = copia(); C.tope = e.target.checked; commit(antes); } }), 'Tope: la tapa se queda abierta (a unos 105°)') : null,
        C.tapa === 'presion' ? h('div.r8cj-fila', h('label.r8cj-num', h('span', 'Ajuste'), h('select.inp', { onchange: e => { const antes = copia(); C.ajuste = e.target.value; commit(antes); } }, Object.entries(CJ.AJUSTES).map(([k, [t]]) => h('option', { value: k, selected: C.ajuste === k }, t)))), campoNum(['labio', 'Labio', 2, 15, 0.5])) : null),
      h('div.r8p-sec', h('b', 'Arrastra a la caja'), Object.entries(CJ.GRUPOS).map(([g, gt]) => h('div.r8cj-grupo', h('small.r8cj-gt', gt), h('div.r8cj-paleta', Object.entries(CJ.TIPOS).filter(([, D]) => D.grupo === g).map(([k, D]) => { const no = CJ.porQueNo(C, k);
          return h('button.r8cj-el' + (armado === k ? '.on' : '') + (no ? '.no' : ''), { type: 'button', 'data-tipo': k, title: (no ? '⛔ ' + no + '\n' : '') + D.d + (D.comprado ? ' (necesitas ' + D.comprado + ')' : ''), 'aria-disabled': no ? 'true' : null, onpointerdown: ev => { ev.preventDefault(); if (no) { dice('⛔ ' + D.t + ': ' + no, 'mal'); toast('⛔ ' + D.t + ': ' + no, 'warn', 6000); return; } empieza(k, ev, null); } }, h('span', D.e), h('small', D.t)); })))),
        h('small.muted', '🖱️ Arrastra · 👆 en tablet también: toca uno y luego la caja. Para mover uno ya puesto, arrástralo. Supr lo quita. Lo que sale apagado no va con esta caja (pasa por encima y te dice por qué).')),
      h('div.r8p-sec', h('b', 'Medidas'), h('div.r8cj-medidas', MEDIDAS.map(campoNum)),
        h('div.r8cj-fila', h('label.r8cj-col', 'Caja ', h('input', { type: 'color', value: C.color, onchange: e => { const antes = copia(); C.color = e.target.value; commit(antes); } })), h('label.r8cj-col', 'Tapa ', h('input', { type: 'color', value: C.colorTapa, onchange: e => { const antes = copia(); C.colorTapa = e.target.value; commit(antes); } }))))]),
      h('div.r8p-sec', h('b', 'Acabado'), CE.es(C) ? null : h('div.r8cj-fila',
        h('label.r8cj-num.r8cj-estilo', h('span', 'Estilo'), h('select.inp', { 'data-k': 'estilo', onchange: e => { const antes = copia(); C.estilo = e.target.value; commit(antes); } }, Object.entries(CP.ESTILOS).map(([k, t]) => h('option', { value: k, selected: (C.estilo || 'lisa') === k }, t)))),
        h('label.check.small.r8cj-pies', h('input', { type: 'checkbox', checked: !!C.pies, onchange: e => { const antes = copia(); C.pies = e.target.checked; commit(antes); } }), 'Patas (3 mm: no raya la mesa)')),
        !CE.es(C) && C.estilo === 'hexagonal' && C.tapa === 'corredera' ? h('small.muted', 'El panal no se pone en la tapa corredera (iría muy fina).') : null,
        h('label.r8cj-num.r8cj-imp', h('span', 'Tu impresora'), h('select.inp', { 'data-k': 'impresora', onchange: e => { const antes = copia(); C.impresora = e.target.value; commit(antes); const n = CJ.revisa(C).length; if (n) toast('⚠️ En la ' + impresora().t + ' hay ' + n + ' cosa' + (n > 1 ? 's' : '') + ' que no salen: pulsa 🛠️ Arreglar todo', 'warn', 7000); } }, Object.entries(CP.IMPRESORAS).map(([k, I]) => h('option', { value: k, selected: (C.impresora || 'p1p') === k }, I.t)))))
    ]);
  }

  // 🧩 una caja enigma no lleva tapa ni elementos: su mecanismo va dentro. Se cambian SUS medidas (con el limitador de su impresora)
  function campoForma([k, t, mi, ma, pa]) {
    const I = impresora();
    if (mi === 'txt') return h('label.r8cj-num.r8cj-txt', h('span', t), h('input.inp', { type: 'text', value: C[k] || '', maxlength: k === 'palabra' ? 7 : 14, 'data-k': k, onchange: e => {
      let v = String(e.target.value || '').trim();
      if (k === 'palabra') { const lim = CE.crxPalabra(Object.assign({}, C, { palabra: v })); if (lim.length < 3) { toast('🛑 La palabra: de 3 a 7 ' + (C.alfabeto === 'numeros' ? 'cifras' : 'letras (A–Z y Ñ, sin tildes)') + '.', 'warn', 6000); e.target.value = C[k]; return; } if (lim !== v.toUpperCase()) toast('✏️ Queda «' + lim + '» (solo ' + (C.alfabeto === 'numeros' ? 'cifras' : 'letras A–Z y Ñ, sin tildes') + ').', 'info', 5000); v = lim; }
      const antes = copia(); C[k] = v; commit(antes); } }));
    if (mi && mi.ops) return h('label.r8cj-num.r8cj-txt', h('span', t), h('select.inp', { 'data-k': k, onchange: e => { const antes = copia(); C[k] = e.target.value;
      if (k === 'alfabeto') { const p = CE.crxPalabra(C); if (p.length < 3) { C.palabra = C.alfabeto === 'numeros' ? '1402' : 'AMOR'; toast('✏️ Con ' + (C.alfabeto === 'numeros' ? 'números' : 'letras') + ' te pongo «' + C.palabra + '» (cámbiala)', 'info', 5000); } }
      commit(antes); } }, mi.ops.map(([v, tt]) => h('option', { value: v, selected: C[k] === v }, tt))));
    const porImp = (k === 'L' || k === 'W' || k === 'D') ? I.cama - 6 : k === 'H' ? I.alto - 2 : null; if (porImp != null && porImp < ma) ma = Math.floor(porImp);
    return h('label.r8cj-num', h('span', t), h('input.inp', { type: 'number', min: mi, max: ma, step: pa, value: C[k], 'data-k': k, onchange: e => { const v = Number(String(e.target.value).replace(',', '.')); if (!(v >= mi && v <= ma)) { toast('🛑 ' + t + ': entre ' + n1(mi) + ' y ' + n1(ma) + (k === 'semilla' ? '' : ' mm') + (porImp != null && v > ma && ma === Math.floor(porImp) ? ' (lo que imprime tu ' + I.t + ')' : ''), 'warn', 6000); e.target.value = C[k]; return; } const antes = copia(), malos0 = CJ.revisa(C).length; C[k] = k === 'semilla' ? Math.round(v) : v; commit(antes); const malos = CJ.revisa(C).length; if (malos > malos0) toast('⚠️ Con esa medida hay ' + malos + ' cosa' + (malos > 1 ? 's' : '') + ' en rojo: mira «Revisión» (a la derecha) y pulsa 🛠️ Arreglar todo.', 'warn', 7000); } }), h('small', k === 'semilla' ? '' : 'mm'));
  }
  function izqEnigma() {
    const F = CE.FORMAS[C.forma];
    return [h('div.r8p-sec.r8cj-enigma', h('b', F.e + ' ' + F.t), h('p.small.muted', { style: { margin: '2px 0 6px' } }, F.d),
      h('div.r8cj-medidas.r8cj-medidas-en', F.campos.filter(x => !(x[2] && x[2].ops) && x[2] !== 'txt').map(campoForma)),
      F.campos.filter(x => (x[2] && x[2].ops) || x[2] === 'txt').map(campoForma),
      C.forma === 'laberinto' ? btn('🎲 Otro laberinto', () => { const antes = copia(); C.semilla = 1 + Math.floor(Math.random() * 99999); commit(antes); toast('🌀 Laberinto nº ' + C.semilla + ': ' + CE.secreto(C).t.replace(/^.*: /, ''), 'ok', 4000); }, { cls: 'sm ghost r8cj-otro', title: 'Cada número es un laberinto distinto (anótalo para repetirla)' }) : null,
      h('small.muted', 'No lleva tapa ni elementos que arrastrar: el truco va dentro y está comprobado en el ordenador. Pulsa ▶ para verla abrirse.'),
      h('div.r8cj-fila', { style: { marginTop: '6px' } }, h('label.r8cj-col', 'Caja ', h('input', { type: 'color', value: C.color, onchange: e => { const antes = copia(); C.color = e.target.value; commit(antes); } })), h('label.r8cj-col', 'Tapa ', h('input', { type: 'color', value: C.colorTapa, onchange: e => { const antes = copia(); C.colorTapa = e.target.value; commit(antes); } }))))];
  }

  // ---------- derecha: lo puesto, comprobar e imprimir ----------
  function quita(id) { const antes = copia(); C.els = C.els.filter(e => e.id !== id); if (selId === id) selId = null; commit(antes); }
  // 🛑 cambiar una medida de un elemento: se limpia (cifras, letras) y, si con el valor nuevo ya no funciona, NO se cambia y se dice por qué
  const limpia = (e, k, v) => (e.tipo === 'combinacion' && k === 'codigo' ? String(v).replace(/\D/g, '').slice(0, 4) : e.tipo === 'llave' && k === 'codigo' ? String(v).replace(/[^0-4]/g, '').slice(0, 5) : String(v).slice(0, 40));
  function ponProp(e, k, v, inp) {
    const p2 = Object.assign({}, e.p, { [k]: v }), Z = CJ.zona(C, e.tipo, e.cara, e.u, e.v, p2, e.id);
    if (!Z.ok) { toast('⛔ No lo cambio: ' + Z.motivo, 'warn', 7000); if (inp) inp.value = e.p[k]; return; }
    if (Z.aviso) toast('⚠️ ' + Z.motivo, 'warn', 6000);
    const antes = copia(); e.p[k] = v; if (Z.u !== undefined && !CJ.TIPOS[e.tipo].junta) { e.u = Math.round(Z.u * 2) / 2; e.v = Math.round(Z.v * 2) / 2; } commit(antes);
  }
  const campoEl = e => ([k, t, mi, ma, pa]) => {
    if (mi === 'txt') return h('label.r8cj-num.r8cj-txt', h('span', t), h('input.inp', { type: 'text', value: e.p[k], maxlength: 40, 'data-prop': k, onchange: ev => { const v = limpia(e, k, ev.target.value); ev.target.value = v; ponProp(e, k, v, ev.target); } }));
    if (mi && mi.ops) return h('label.r8cj-num.r8cj-txt', h('span', t), h('select.inp', { 'data-prop': k, onchange: ev => ponProp(e, k, ev.target.value, ev.target) }, mi.ops.map(([v, tt]) => h('option', { value: v, selected: e.p[k] === v }, tt))));
    return h('label.r8cj-num', h('span', t), h('input.inp', { type: 'number', min: mi, max: ma, step: pa, value: e.p[k], 'data-prop': k, onchange: ev => { const v = Number(String(ev.target.value).replace(',', '.')); if (!(v >= mi && v <= ma)) { toast('🛑 ' + t + ': entre ' + n1(mi) + ' y ' + n1(ma), 'warn'); ev.target.value = e.p[k]; return; } ponProp(e, k, v, ev.target); } }), h('small', /cifras|Columnas|Filas|Compartimentos|cuenco|Llaves/.test(t) ? '' : 'mm'));
  };
  // 🛠️ arreglar todo: medidas a su impresora, grosores, bisagras que faltan y cada cosa en rojo a su sitio bueno (o fuera)
  function arreglar() {
    const R = CJ.arreglaTodo(C); if (!R.hechos.length) return toast('✅ No hay nada que arreglar', 'ok');
    const antes = copia(); C = Object.assign(CJ.nueva(), R.C); resultado = null; commit(antes); pinta3D(true); pintaBarra();
    const quedan = CJ.revisa(C);
    modal('🛠️ Arreglado', h('div', h('ul.small', R.hechos.map(x => h('li', x))), quedan.length ? h('p.small.r8e-mal', '⚠️ Aún queda: ' + quedan.map(x => x.t).join(' · ')) : h('p.small', '✅ Ya está todo en orden. Si algo no te gusta: ↶ deshacer.')), c => [btn('Vale', c, { cls: 'primary' })]);
  }
  // 🛡️ antes de imprimir o bajar: si algo no saldría bien, se dice y se ofrece arreglarlo
  function guardia(fn) {
    const prob = CJ.revisa(C); if (!prob.length && !(G && G.error)) return fn();
    modal('🛡️ Espera: así no saldría bien', h('div', h('p', 'Antes de imprimir hay ' + (prob.length || 1) + ' cosa' + (prob.length > 1 ? 's' : '') + ' que arreglar:'), h('ul.small', (G && G.error ? [{ t: G.error }] : []).concat(prob).map(x => h('li', x.t)))),
      c => [btn('🛠️ Arreglar todo', () => { c(); arreglar(); }, { cls: 'primary r8cj-guardia-arregla' }), btn('Lo miro yo', c, { cls: 'ghost' })]);
  }
  // (14-10: si al repintar se quita un campo que tenía el foco, el navegador lanza su «change» otra vez y se repintaba DENTRO del repintado: se deja para luego)
  let pintaDerYa = false; function pintaDer() { if (pintaDerYa) { setTimeout(pintaDer, 0); return; } pintaDerYa = true; try { pintaDer0(); } finally { pintaDerYa = false; } }
  function pintaDer0() {
    const prob = CJ.revisa(C), I = impresora(), fragil = (CJ.TAPAS[C.tapa] || {}).fragil;
    const fila = e => { const D = CJ.TIPOS[e.tipo], Z = e.tipo === 'bisagra' ? CJ.zona(C, 'bisagra', e.cara, e.u, e.v, e.p, e.id) : CJ.zona(C, e.tipo, e.cara, e.u, e.v, e.p, e.id);
      return h('div.r8cj-it' + (selId === e.id ? '.on' : '') + (Z.ok ? '' : '.mal'), { 'data-id': e.id },
        h('button.r8cj-it-t', { type: 'button', onclick: () => { selId = selId === e.id ? null : e.id; pintaMarcas(); pintaDer(); } }, h('span', D.e), h('div', h('b', D.t), h('small', CJ.CARAS[e.cara] + (Z.ok ? '' : ' · ⛔ ' + Z.motivo)))),
        h('button.r8cj-x', { type: 'button', title: 'Quitar', 'aria-label': 'Quitar ' + D.t, onclick: () => quita(e.id) }, '✕'),
        selId === e.id ? h('div.r8cj-props', D.campos.map(campoEl(e)),
          e.tipo === 'separador' ? h('label.r8cj-num', h('span', 'Dirección'), h('select.inp', { onchange: ev => { const antes = copia(); e.p.dir = ev.target.value; commit(antes); } }, h('option', { value: 'y', selected: e.p.dir !== 'x' }, 'De delante a atrás'), h('option', { value: 'x', selected: e.p.dir === 'x' }, 'De lado a lado'))) : null,
          h('small.muted', 'Para moverlo, arrástralo en la caja.')) : null); };
    mount(der, [
      h('div.r8p-sec', h('b', 'Tu caja'), h('p.small', CJ.resumen(C))),
      CE.es(C) ? (() => { const S = CE.secreto(C); return h('div.r8p-sec.r8cj-secreto', h('b', '🤫 El secreto (solo para ti)'), h('details', h('summary.small', S.t + ' · ver cómo se abre'), h('p.small', S.d))); })()
        : h('div.r8p-sec', h('b', 'Puesto (' + C.els.length + ')'), C.els.length ? h('div.r8cj-lista', C.els.map(fila)) : h('p.small.muted', 'Nada todavía: arrastra algo desde la izquierda.')),
      h('div.r8p-sec.r8cj-rev', h('b', '🛡️ Revisión'), G && G.error ? h('p.small.r8e-mal', '⛔ ' + G.error) : null,
        prob.length ? [h('div.r8cj-malos', prob.map(x => h('p.small', '⛔ ' + x.t))), btn('🛠️ Arreglar todo', arreglar, { cls: 'primary r8cj-arregla', title: 'Ajusta las medidas a tu impresora, pone lo que falta y lleva cada cosa en rojo a su sitio bueno (o la quita si no cabe)' })]
          : h('p.small.r8cj-ok', '✅ Cabe en tu ' + I.t + ' y cada cosa está en su sitio bueno.'),
        fragil ? h('p.small.r8e-mal', '⚠️ La bisagra de clic se raja al engancharla: elige otra tapa.') : null),
      h('div.r8p-sec', h('b', 'Comprobar'), btn('🧪 Montarla y comprobar', comprobar, { cls: 'primary r8cj-comp' }), resultado ? h('div.r8cj-res', resultado.lista.map(x => h('div.r8cj-r' + (x.ok === true ? '.ok' : x.ok === false ? '.no' : '.ojo'), h('b', (x.ok === true ? '✅ ' : x.ok === false ? '⛔ ' : '⚠️ ') + x.t), x.d ? h('small', x.d) : null))) : h('small.muted', 'La monta en el ordenador: abre la tapa y las puertas de 5 en 5 grados hasta que algo choca, y mira cuánto engancha el cierre.')),
      h('div.r8p-sec', h('b', 'Imprimir'), btn('🖨️ Preparar para tu Bambu', () => guardia(imprimir), { cls: 'primary r8cj-imp' }), h('div.row.wrap', btn('⬇ 3MF', () => guardia(() => baja('3mf')), { cls: 'sm ghost r8cj-3mf' }), btn('⬇ STL', () => guardia(() => baja('stl')), { cls: 'sm ghost' }), ext.alEstudioMalla ? btn('🧰 Al Estudio', alEstudio, { cls: 'sm ghost', title: 'Llevar la caja al Estudio para seguir diseñando' }) : null), piezasTxt()),
      h('div.r8p-sec.r8cj-anisec', h('b', '🎬 Animación y vídeo'),
        h('div.r8cj-mov', movibles().map(m => h('label.check.small', h('input', { type: 'checkbox', 'data-mov': m.k, checked: elige(m.k), onchange: ev => { anSel[m.k] = ev.target.checked; try { localStorage.setItem(LS_AN, JSON.stringify(anSel)); } catch (x) { } } }), m.t))),
        h('div.r8cj-fila', [['Caja', 'color'], ['Tapa', 'colorTapa'], ['Detalles', 'colorDet']].map(([t, k]) => h('label.r8cj-col', t + ' ', h('input', { type: 'color', value: C[k] || C.colorTapa, 'data-col': k, title: k === 'colorDet' ? 'Llaves, ruedas, pomos y cerraduras' : '', onchange: e => { const antes = copia(); C[k] = e.target.value; commit(antes); } })))),
        h('label.check.small', h('input', { type: 'checkbox', checked: girar, onchange: ev => { girar = ev.target.checked; } }), '🔄 Girar la cámara mientras graba'),
        h('div.row.wrap', btn('▶ Ver', () => animar(), { cls: 'sm r8cj-ver' }), btn('⏺ Grabar vídeo', grabarVideo, { cls: 'sm primary r8cj-grabar', title: '6 segundos de la caja abriéndose y cerrándose: para Instagram, TikTok o Vinted' })),
        h('small.muted', 'Elige qué se mueve. El vídeo dura 6 s y se guarda en Descargas.')),
      h('div.r8p-sec', h('b', '📄 Manual para el cliente'), btn('📄 Manual de montaje y uso', manual, { cls: 'sm r8cj-manual', title: 'Una hoja A4 paso a paso para meterla en la caja o mandarla en PDF' })),
      (() => { const Q = CV.rapida(C); return h('div.r8p-sec.r8cj-cults', h('b', '🛒 Vender en Cults'), h('p.small', { style: { margin: '2px 0 6px' } }, h('b', Q.titulo), ' · ', h('b.r8cj-pvp', CV.euros(Q.precio)), Q.precio !== Q.sugerido ? h('small.muted', ' (el tuyo)') : h('small.muted', ' (orientativo)')),
        h('div.row.wrap', btn('🛒 Ficha para Cults', fichaCults, { cls: 'sm r8cj-ficha', title: 'Título, descripción, parámetros, categoría, etiquetas y precio: cada cosa con su botón de copiar y una nota' }), btn('📦 Exportar todo', () => exportar(), { cls: 'sm primary r8cj-exportar', title: 'Un ZIP con el vídeo, las fotos, la ficha, el manual y el ZIP de las piezas para subir a Cults' })),
        h('small.muted', 'Exportar: vídeo de 6 s, fotos, la ficha con tus notas, el manual' + (CE.es(C) ? ', la solución' : '') + ' y el ZIP que se sube tal cual.')); })(),
      h('div.r8p-sec', h('b', '🎁 Escaparate'), h('div.row.wrap', btn('📸 Escaparate', () => sorpresa('escaparate'), { cls: 'sm r8cj-escaparate', title: 'Foto de estudio y vídeo 360° (cerrada) para anunciarla antes de imprimirla' }), btn('🎬 Impresión fantasma', () => sorpresa('fantasma'), { cls: 'sm r8cj-fantasma', title: 'Mira cómo se imprimirán sus piezas, capa a capa' })))
    ]);
  }
  function piezasTxt() { try { const L = N.enAmbito(() => CJ.piezasDe(C).map(p => ({ nombre: p.nombre, como: p.como }))), extra = []; if (C.tapa === 'bisagraFil' && C.els.some(e => e.tipo === 'bisagra')) extra.push('🧵 un trozo de tu filamento de 1,75 por bisagra (córtalo 1 mm más largo y empújalo; si baila, dale un toque de calor en las puntas para hacerle cabeza)'); if (C.tapa === 'bisagraTor') C.els.filter(e => e.tipo === 'bisagra').forEach(e => extra.push('🪛 un tornillo M3 de ' + ([16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80].filter(l => l <= e.p.largo - 1.7).pop() || 16) + ' mm para la bisagra de ' + e.p.largo + ' mm (pasa libre y se rosca en el último nudo)')); const im = C.els.filter(e => e.tipo === 'iman'); if (im.length) extra.push('🧲 ' + 2 * im.length + ' imanes de ' + n1(im[0].p.d) + ' × ' + n1(im[0].p.h) + ' mm'); if (C.tapa === 'bisagraImp' || C.els.some(e => ['combinacion', 'llave', 'cajon', 'cubetas'].includes(e.tipo))) extra.push('nada más: todo lo demás sale impreso');
      return h('div.r8cj-piezas', h('small.muted', 'Salen ' + L.length + ' piezas, cada una en la postura buena (sin soportes):'), h('ul.small', L.map(p => h('li', h('b', p.nombre), p.como ? ' · ' + p.como : ''))), extra.length ? h('small', 'Además: ' + extra.join(' · ')) : null); }
    catch (e) { return h('small.r8e-mal', '⚠️ ' + e.message); } finally { N.limpia(); } }
  function comprobar() {
    const b = der.querySelector('.r8cj-comp'); if (b) { b.disabled = true; b.textContent = '⏳ Montando…'; }
    setTimeout(() => { resultado = N.enAmbito(() => CJ.comprueba(C)); window.__r8cj.res = resultado; pintaDer(); const malos = resultado.lista.filter(x => x.ok === false).length; toast(malos ? '⛔ ' + malos + ' cosa' + (malos > 1 ? 's' : '') + ' que arreglar' : '✅ Montada y comprobada' + (CE.es(C) ? ': solo se abre con su truco' : resultado.apertura > 0 ? ': la tapa se abre ' + (resultado.apertura >= 200 ? 'del todo' : 'hasta ' + resultado.apertura + '°') : resultado.apertura === -1 ? (C.tapa === 'corredera' ? ': la tapa corre y sale entera' : ': la tapa sale entera') : ''), malos ? 'warn' : 'ok', 6000); }, 30);
  }
  const nombre = () => CE.es(C) ? CV.nombreArchivo(C) : ('Caja_' + Math.round(C.L) + 'x' + Math.round(C.W) + 'x' + Math.round(C.H + C.tapaG) + '_' + C.tapa).replace(/[^\w.-]+/g, '_');
  const partes = () => CJ.colocaEnCama(CJ.piezasDe(C)).map(p => ({ m: p.m, color: p.color, nombre: p.nombre }));
  // (14-10: N.stl da los BYTES, no un archivo: el «⬇ STL» fallaba al bajarlo; ahora va en un Blob)
  function baja(tipo) {
    try { const blob = N.enAmbito(() => { const L = partes(); window.__r8cj.bajado = { piezas: L.length }; return tipo === 'stl' ? new Blob([N.stl(N.union(L.map(p => p.m)), nombre())], { type: 'model/stl' }) : N.tresMF(L, nombre()); }), L = { length: window.__r8cj.bajado.piezas }; const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nombre() + '.' + tipo }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); window.__r8cj.bajado = { tipo, bytes: blob.size, piezas: L.length }; toast('⬇ ' + nombre() + '.' + tipo + ' (' + L.length + ' piezas)', 'ok'); }
    catch (e) { toast(e.message || String(e), 'bad'); } finally { N.limpia(); }
  }
  async function imprimir() {
    const A = await import('../r8/consejos3d.js'), d = await import('../desktop.js').catch(() => null), cuerpo = h('div');
    modal('🖨️ Caja · preparar para tu Bambu', cuerpo, null, { size: 'wide' });
    A.asistente(cuerpo, { clave: 'caja', partes, N, uso: 'mecanica', nombre: nombre(), baja: (blob, n) => { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: n }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); }, cama: 256, forzar: { enable_support: '0' }, desktopAbrir: !!(d && d.desktop && d.desktop.on) });
  }
  async function sorpresa(que) { const S = await import('../r8/sorpresas.js'); let partes;
    try { partes = N.enAmbito(() => { let partes; if (que === 'escaparate') { const G2 = CJ.construye(C); partes = [{ vista: N.aVista(G2.cuerpo), color: C.color }, { vista: N.aVista(G2.tapa), color: C.colorTapa }].concat(G2.puertas.map(P => ({ vista: N.aVista(P.m), color: C.colorTapa }))).concat(G2.sueltas.filter(s => s.m).map(s => ({ vista: N.aVista(s.m), color: colSuelta(s) }))); }
      else partes = CJ.colocaEnCama(CJ.piezasDe(C)).map(p => ({ vista: N.aVista(p.m), color: p.color })); return partes; }); }
    catch (e) { return toast(e.message || String(e), 'bad'); } finally { N.limpia(); }
    S[que](partes, { nombre: tituloCaja() }); }
  function alEstudio() { // v30.6: POR PIEZAS (antes iba todo fundido en una y no se podía editar ni abrir)
    try { const L = N.enAmbito(() => { const G2 = CJ.construye(C), R2 = (() => { try { return CJ.comprueba(C); } catch (e) { return {}; } })(), L = [{ sopa: N.aSopa(G2.cuerpo), nombre: 'Caja', color: C.color }];
      L.push({ sopa: N.aSopa(G2.tapa), nombre: 'Tapa', color: C.colorTapa || C.color, bisagra: CJ.conBisagra(C) && G2.eje ? { o: G2.eje.o, dir: G2.eje.dir.map(v => -v), ang: Math.min(180, R2.apertura || 100) } : null });
      G2.puertas.forEach((Pu, i) => { const n = Pu.F.n, d = Pu.eje.dir, eu = Pu.F.eu, cr = [d[1] * eu[2] - d[2] * eu[1], d[2] * eu[0] - d[0] * eu[2], d[0] * eu[1] - d[1] * eu[0]], sg = Math.sign(cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2]) || 1; L.push({ sopa: N.aSopa(Pu.m), nombre: 'Puerta' + (G2.puertas.length > 1 ? ' ' + (i + 1) : ''), color: C.colorTapa || C.color, bisagra: { o: Pu.eje.o, dir: d.map(v => v * sg), ang: 100 } }); });
      G2.sueltas.filter(x => x.m).forEach(x => L.push({ sopa: N.aSopa(x.m), nombre: x.nombre, color: x.tapaColor ? (C.colorDet || C.colorTapa) : C.color }));
      return [L]; })[0];
      if (ext.alEstudioPiezas) ext.alEstudioPiezas(L, tituloCaja()); else ext.alEstudioMalla(L[0].sopa, 'Caja');
    } catch (e) { toast(e.message, 'bad'); } finally { N.limpia(); } }

  pintaIzq(); pintaDer(); pintaBarra(); pinta3D(true);
  window.__r8cjApi = { get C() { return C; }, set C(x) { C = x; commit(null); }, caraEn, escena, CJ, aPantalla: q => escena.aPantalla(q), comprobar, animar, arreglar, exportar, fichaCults };
  return { destroy() { vivo = false; window.removeEventListener('pointermove', sigue); window.removeEventListener('pointerup', suelta); window.removeEventListener('keydown', tecla); window.removeEventListener('pointercancel', cancela); limpiaG(capaZ); limpiaG(capaM); escena.destruir(); delete window.__r8cjApi; } };
}
