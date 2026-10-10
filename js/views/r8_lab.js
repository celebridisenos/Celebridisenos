// ================= v20 · 🧪 CelebriR8 SMART LAB · EL MEJOR MODELO AUTOMÁTICAMENTE =================
// «PROBAR MOTORES Y ELEGIR EL MEJOR» (la dueña, 10-10-2026):
//  · la foto se prepara y se le quita el fondo UNA vez (el mismo recorte sirve para todos los motores);
//  · se prueban de UNO EN UNO los motores instalados de verdad (nunca dos a la vez en una tarjeta de 6 GB). Antes de cada
//    uno se mira la memoria libre de la tarjeta: si no cabe, se SALTA y se dice por qué. Cada motor es un proceso aparte
//    que, al acabar, devuelve toda su memoria (se apunta la libre antes y después para comprobarlo);
//  · se apunta tiempo, errores, memoria de la tarjeta (pico) y RAM (pico) de cada uno;
//  · se compara mucho más que la silueta: parecido de frente (APROX.), lo limpia que sale la superficie (APROX.), si la
//    espalda está peor resuelta que el frente o sale aplanada (APROX.) y si la malla está lista para imprimir (MEDIDO);
//  · se enseña cada figura de frente, de lado y de espaldas, se recomienda una EXPLICANDO por qué, y se puede elegir otra;
//  · todos los modelos se conservan (en el PC: Documentos › CelebriDiseños_R8 › SmartLab › fecha, con un registro).
// La nube de pago (Meshy, Tripo) NO entra aquí. TRELLIS.2 (nube gratis) solo si lo marcas, porque la foto sale del PC.
import { h, mount, btn, toast, confirmDlg } from '../ui.js';
import * as E from '../r8/estado.js';
import * as MA from '../r8/malla.js';
import * as C from '../r8/comun.js';

// lo medido en la torre (GTX 1660 SUPER, 9/10-10-2026): memoria de tarjeta que necesitan y tiempo típico
const MOT = {
  triposr: { nombre: 'TripoSR', e: '⚡', min: 3.0, t: '≈ 20–35 s', lic: 'MIT', local: 1, color: '#ffb84d' },
  triposg: { nombre: 'TripoSG', e: '💎', min: 3.4, t: '≈ 4–6 min', lic: 'MIT', local: 1, color: '#7c6cff' },
  sf3d: { nombre: 'Stable Fast 3D', e: '🏆', min: 5.0, t: '≈ 1 min', lic: 'Community (< 1 M$/año)', local: 1, color: '#3ddc97' },
  trellis2: { nombre: 'TRELLIS.2 (nube gratis)', e: '🆓', min: 0, t: '≈ 2–4 min', lic: 'MIT', local: 0, color: '#29d3ff' }
};
const DIRS = { frente: [0, -1, 0.12], lado: [1, 0, 0.12], espalda: [0, 1, 0.12] };
const PESOS = { parecido: 35, superficie: 20, espalda: 15, imprimir: 30 };

export async function montarLab(el, ext = {}) {
  const D = await C.escritorio();
  const lienzo = h('canvas.r8p-cv', { 'aria-label': 'El resultado elegido en 3D' }), vbar = h('div.r8p-vbar'), vacio = h('div.r8p-vacio'), izq = h('div.r8p-izq.r8l-izq'), der = h('div.r8p-der.r8l-der');
  const raiz = h('div.r8p.r8l', izq, h('div.r8p-vista', lienzo, vacio, vbar), der);
  el.appendChild(raiz);
  let esc = null; try { esc = await C.vista3d(lienzo); } catch (e) { }
  const L = { blob: null, nombre: '', img: null, mascara: null, cortando: false, nube: false, res: {}, orden: [], ver: null, recomendado: null, corriendo: false, carpeta: '', parar: false, registro: [] };
  let vivo = true;

  // ---------- motores disponibles DE VERDAD ----------
  function lista() {
    const S = E.SIS, out = [];
    ['triposg', 'triposr', 'sf3d'].forEach(id => { const m = S.motores.find(x => x.id === id); out.push(Object.assign({ id, listo: !!(m && m.listo), falta: !S.pc ? 'solo en el PC' : !(m && m.listo) ? (id === 'sf3d' ? 'falta bajar su modelo (necesita tu sesión de Hugging Face)' : 'no instalado') : '' }, MOT[id])); });
    const tr = S.nube.trellis2 || {}; out.push(Object.assign({ id: 'trellis2', listo: !!tr.sesion, falta: !S.pc ? 'solo en el PC' : !tr.conector ? 'falta el conector' : !tr.sesion ? 'falta entrar en Hugging Face' : '' }, MOT.trellis2));
    return out;
  }

  // ---------- 1 · la foto y su recorte (una sola vez) ----------
  async function ponFoto(f) {
    if (!f || !/^image\//.test(f.type)) return toast('Eso no es una foto.', 'warn');
    if (L.img) URL.revokeObjectURL(L.img); L.blob = f; L.nombre = f.name.replace(/\.[^.]+$/, ''); L.img = URL.createObjectURL(f); L.mascara = null; L.res = {}; L.orden = []; L.ver = null; L.recomendado = null; pinta(); pintaVista();
    if (D && D.motorFondo) { L.cortando = true; pinta(); const T = E.tarea('Quitando el fondo de la foto (una sola vez)'); try { const r = await D.motorFondo(f); if (r && r.ok && r.mascara) { L.mascara = r.mascara; T.bien('fondo quitado (BiRefNet, en tu PC)'); } else T.mal((r && r.error) || 'sin recorte'); } catch (e) { T.mal(e.message); } L.cortando = false; pinta(); }
  }

  // ---------- 2 · probar los motores, de uno en uno ----------
  async function probar() {
    if (!L.blob) return toast('Primero sube una foto.', 'warn'); if (!D) return toast('El Smart Lab funciona en el programa del PC (allí están los motores).', 'warn');
    const elegidos = lista().filter(m => m.listo && (m.local || L.nube));
    if (!elegidos.length) return toast('No hay ningún motor instalado y listo en este PC.', 'warn', 7000);
    if (elegidos.some(m => !m.local) && !(await confirmDlg('☁️ Usar la nube gratis', 'TRELLIS.2 se hace en la nube GRATUITA de Hugging Face: la foto (ya sin fondo) sale de tu PC. Gasta tu tiempo de tarjeta del día (≈ 1–2 figuras). ¿Seguimos?', 'Sí, incluirla'))) return;
    L.corriendo = true; L.parar = false; L.res = {}; L.orden = elegidos.map(m => m.id); L.ver = null; L.recomendado = null; L.registro = []; L.carpeta = 'SmartLab/' + C.marcaHora() + '_' + C.limpioNombre(L.nombre);
    elegidos.forEach(m => { L.res[m.id] = { estado: 'espera' }; }); pinta();
    const TT = E.tarea('Smart Lab: probando ' + elegidos.length + ' motor(es)');
    for (let i = 0; i < elegidos.length; i++) {
      const m = elegidos[i], R = L.res[m.id]; if (L.parar) { R.estado = 'saltado'; R.error = 'Parado por ti'; continue; }
      TT.avance(Math.round(i / elegidos.length * 100), m.nombre + ' (' + (i + 1) + ' de ' + elegidos.length + ')');
      const S0 = await E.sistema(true), libre0 = E.gbLibres(); R.vramAntes = libre0;
      if (m.local && libre0 != null && libre0 < m.min) { R.estado = 'saltado'; R.error = 'Memoria de la tarjeta insuficiente: hay ' + C.n2(libre0, 1) + ' GB libres y ' + m.nombre + ' necesita unos ' + C.n2(m.min, 1) + ' GB. Cierra Bambu Studio o el navegador y vuelve a probar. Sigo con los demás.'; L.registro.push({ motor: m.id, saltado: true, vram_libre_gb: libre0 }); pinta(); continue; }
      void S0; R.estado = 'va'; R.t0 = Date.now(); pinta();
      const reloj = setInterval(async () => { try { const a = m.local ? await D.motor3dAvance() : await D.nube3dAvance(); if (a && a.txt) { R.avance = a.txt; TT.avance(Math.round((i + (a.pct ? a.pct / 100 : 0.3)) / elegidos.length * 100), m.nombre + ': ' + a.txt); pintaEstado(); } } catch (e) { } }, 1500);
      try {
        const r = m.local ? await D.motor3dFigura(L.blob, { motor: m.id, alto: 100, resolucion: 256, detalle: 'normal', recortar: true, metricas: true }) : await D.nube3dFigura(L.blob, { proveedor: m.id, alto: 100 });
        if (!r || !r.ok || !r.stl) throw new Error((r && r.error) || 'el motor no ha devuelto la figura');
        R.stl = E.b64aU8(r.stl); delete r.stl; R.info = r; R.t = (Date.now() - R.t0) / 1000;
        R.M = MA.suelda(await MA.sopaDe(R.stl)); R.rev = MA.revisa(R.M);
        if (!r.inspeccion && D.mallaInspeccionar) { try { R.info.inspeccion = await D.mallaInspeccionar(new Blob([R.stl]), 0.8); } catch (e) { } }
        await E.sistema(true); R.vramDespues = E.gbLibres(); R.estado = 'bien';
        R.minis = await minis(R, m); puntua();
        try { await C.guardaEnPCSilencio(R.stl, L.carpeta, m.id + '.stl'); } catch (e) { }
        L.registro.push({ motor: m.id, ok: true, segundos: r.total_s, tarjeta_pico_gb: r.vram_gb, ram_pico_gb: r.ram_pico_gb, vram_libre_antes_gb: libre0, vram_libre_despues_gb: R.vramDespues, parecido: r.parecido, metricas: r.metricas, caras: r.caras, estanca: r.estanca, piezas: R.rev.piezas });
        if (!L.ver) { L.ver = m.id; pintaVista(true); }
      } catch (e) { R.estado = 'mal'; R.error = (e && e.message) || String(e); L.registro.push({ motor: m.id, error: R.error }); await E.sistema(true).catch(() => { }); R.vramDespues = E.gbLibres(); }
      finally { clearInterval(reloj); }
      pinta();
    }
    puntua();
    const buenos = L.orden.filter(k => L.res[k].estado === 'bien');
    if (L.recomendado) { L.ver = L.recomendado; pintaVista(true); }
    try { await C.guardaEnPCSilencio(new Blob([JSON.stringify({ foto: L.nombre, fecha: new Date().toISOString(), recomendado: L.recomendado, puntuaciones: Object.fromEntries(buenos.map(k => [k, L.res[k].nota])), motores: L.registro }, null, 1)], { type: 'application/json' }), L.carpeta, 'registro.json'); } catch (e) { }
    L.corriendo = false;
    if (buenos.length) TT.bien('recomendado: ' + MOT[L.recomendado].nombre + ' · ' + buenos.length + ' de ' + L.orden.length + ' salieron'); else TT.mal('ningún motor ha podido');
    pinta(); publica();
  }
  async function minis(R, m) { const { miniatura } = await import('../r8/escena3d.js'), v = MA.vista(R.M), o = {}; for (const [k, d] of Object.entries(DIRS)) { try { o[k] = miniatura(v, m.color, 'mate', 220, d); } catch (e) { o[k] = ''; } } return o; }

  // ---------- 3 · comparar y recomendar (puntuación orientativa, cada parte con su etiqueta) ----------
  function partes(R) {
    const I = R.info || {}, X = I.metricas || {}, ins = I.inspeccion && !I.inspeccion.error ? I.inspeccion : null, rev = R.rev || {};
    const p = { parecido: I.parecido != null ? Math.max(0, Math.min(100, I.parecido)) : null };
    p.superficie = X.rugosidad != null ? Math.max(0, Math.min(100, 100 - (X.rugosidad - 1) * 25)) : null; // 1 → 100 · 2 → 75 · 3 → 50
    if (X.rug_frente != null && X.rug_espalda != null) { const ratio = X.rug_espalda / Math.max(0.2, X.rug_frente); p.espalda = Math.max(0, Math.min(100, ratio <= 1.1 ? 100 : 100 - (ratio - 1.1) * 150)) - (X.fondo_ancho != null && X.fondo_ancho < 0.25 ? 40 : 0); p.espalda = Math.max(0, p.espalda); p.ratio = ratio; } else p.espalda = null;
    p.imprimir = (rev.estanca ? 40 : 0) + (rev.piezas === 1 ? 30 : rev.piezas > 1 && !rev.migas ? 15 : 0) + (ins ? (ins.paredes_finas_pct <= 0.5 ? 30 : ins.paredes_finas_pct <= 3 ? 15 : 0) : 15);
    let suma = 0, pesos = 0; Object.entries(PESOS).forEach(([k, w]) => { if (p[k] != null) { suma += p[k] * w; pesos += w; } }); p.total = pesos ? suma / pesos : 0;
    return p;
  }
  function puntua() {
    const buenos = L.orden.filter(k => L.res[k].estado === 'bien'); buenos.forEach(k => { L.res[k].nota = partes(L.res[k]); });
    L.recomendado = buenos.slice().sort((a, b) => L.res[b].nota.total - L.res[a].nota.total)[0] || null;
  }
  function porque() {
    const k = L.recomendado; if (!k) return null; const R = L.res[k], P = R.nota, X = (R.info || {}).metricas || {}, otros = L.orden.filter(x => x !== k && L.res[x].estado === 'bien');
    const bien = [], ojo = [];
    const mejorEn = (campo, txt) => { if (P[campo] == null) return; if (otros.every(o => L.res[o].nota[campo] == null || L.res[o].nota[campo] <= P[campo] + 0.01)) bien.push(txt); };
    mejorEn('parecido', 'es la que más se parece a tu foto de frente (' + C.n2(R.info.parecido, 1) + ' %)');
    mejorEn('superficie', 'su superficie es la más lisa (rugosidad ' + C.n2(X.rugosidad, 2) + ')');
    if (P.espalda != null && P.espalda >= 90) bien.push('la espalda está tan bien resuelta como el frente'); else if (P.espalda != null) ojo.push('la espalda sale más rugosa que el frente (' + C.n2(X.rug_espalda, 2) + ' frente a ' + C.n2(X.rug_frente, 2) + '): revísala');
    if (X.fondo_ancho != null && X.fondo_ancho < 0.25) ojo.push('sale aplanada (fondo ÷ ancho = ' + C.n2(X.fondo_ancho, 2) + ')');
    if (R.rev.estanca && R.rev.piezas === 1) bien.push('está cerrada y en una sola pieza'); else ojo.push(!R.rev.estanca ? 'tiene agujeros (pásala por Reparar)' : R.rev.piezas + ' piezas');
    const ins = (R.info || {}).inspeccion; if (ins && ins.paredes_finas_pct > 0.5) ojo.push(C.n2(ins.paredes_finas_pct, 1) + ' % de paredes finas');
    if (otros.length && R.t > Math.min(...otros.map(o => L.res[o].t)) * 3) ojo.push('tardó ' + Math.round(R.t) + ' s (más que los otros)');
    return { bien, ojo };
  }
  function usar(k) { const R = L.res[k]; if (!R || !R.stl) return; E.ponEnMesa({ nombre: L.nombre + ' · ' + MOT[k].nombre, origen: 'lab', motor: MOT[k].nombre, stl: R.stl }); L.usado = k; toast('✅ ' + MOT[k].nombre + ' en la mesa de trabajo: ya puedes repararla o revisarla para imprimir', 'ok', 6000); pinta(); publica(); }

  // ---------- la vista ----------
  function pintaVista(encuadra) {
    mount(vacio, L.ver ? null : h('div', h('b', '🧪 Smart Lab'), h('small', L.blob ? 'Pulsa «PROBAR MOTORES Y ELEGIR EL MEJOR». Aquí verás en grande el que elijas.' : 'Sube una foto de una figura (de frente, con fondo liso). Probaré los motores de IA que tienes instalados, uno a uno, y te diré cuál ha salido mejor y por qué.')));
    if (!esc) return; const R = L.ver && L.res[L.ver];
    if (!R || !R.M) { esc.ponPartes([]); mount(vbar); return; }
    esc.ponPartes([{ id: 'r', vista: MA.vista(R.M), color: MOT[L.ver].color, acabado: 'mate' }]); if (encuadra) esc.encuadrar('frente');
    mount(vbar, h('span.r8p-pill', MOT[L.ver].e + ' ' + MOT[L.ver].nombre), C.botonesVista(() => esc));
  }
  function pintaEstado() { const t = izq.querySelector('.r8l-motores'); if (t) mount(t, motoresUI()); }

  // ---------- paneles ----------
  function motoresUI() {
    return lista().map(m => { const R = L.res[m.id] || {}, est = R.estado; return h('div.r8l-mot' + (m.listo ? '' : '.no') + (est ? '.' + est : ''), { 'data-motor': m.id },
      h('span', m.e), h('div', h('b', m.nombre), h('small', !m.listo ? m.falta : est === 'va' ? '⏳ ' + (R.avance || 'trabajando…') + ' · ' + Math.round((Date.now() - R.t0) / 1000) + ' s' : est === 'bien' ? '✅ ' + Math.round(R.t) + ' s' : est === 'mal' ? '❌ ' + R.error : est === 'saltado' ? '⏭️ ' + R.error : est === 'espera' ? 'en cola' : (m.local ? 'en tu PC · ' : 'nube gratis · ') + m.t + ' · ' + m.lic + (m.min ? ' · ≥ ' + C.n2(m.min, 1) + ' GB de tarjeta' : ''))),
      !m.local && m.listo ? h('label.r8l-nube', h('input', { type: 'checkbox', checked: L.nube, disabled: L.corriendo, onchange: e => { L.nube = e.target.checked; } }), 'incluir') : null); });
  }
  function pinta() {
    if (!vivo) return; const S = E.SIS, libre = E.gbLibres(), hay = lista().filter(m => m.listo && m.local).length;
    mount(izq,
      h('div.r8p-tit', h('span', '🧪'), h('div', h('span.r8p-marca', 'SMART LAB'), h('b', 'El mejor modelo automáticamente'), h('small', 'Prueba los motores de IA de tu PC uno a uno y compara forma, superficie, espalda y si está lista para imprimir.'))),
      h('div.r8p-sec', h('b', '1 · La foto'), L.img ? h('div.r8l-fotos', h('figure', h('img', { src: L.img, alt: 'Tu foto' }), h('figcaption', 'Tu foto')), h('figure', L.mascara ? h('img.r8l-recorte', { src: L.mascara, alt: 'Recorte' }) : h('div.r8l-sin', L.cortando ? '✂️ quitando el fondo…' : D ? 'sin recorte' : 'el recorte se hace en el PC'), h('figcaption', 'Recorte (una vez)'))) : null,
        C.zonaSoltarFoto(L.img ? 'Cambiar la foto' : 'Sube una foto', ponFoto), h('small.muted', 'Mejor de frente, entera y con fondo liso. La espalda la imagina la IA.')),
      h('div.r8p-sec', h('b', '2 · Los motores de tu PC'), h('div.r8l-motores', motoresUI()),
        S.pc && libre != null ? h('small.muted', '🎮 Tarjeta: ' + C.n2(libre, 1) + ' GB libres ahora. Se prueban de uno en uno; si alguno no cabe, se salta y te lo digo.') : null,
        h('div.r8p-btns', btn(L.corriendo ? '⏳ Probando…' : '🧪 PROBAR MOTORES Y ELEGIR EL MEJOR', () => probar(), { cls: 'primary r8l-probar', disabled: L.corriendo || !L.blob || !D || !hay }), L.corriendo ? btn('Parar después de este', () => { L.parar = true; toast('Paro al terminar el motor que está trabajando', 'ok'); }, { cls: 'sm ghost' }) : null),
        !D ? h('p.small.muted', 'Los motores de IA están en el programa del PC del taller.') : !hay ? h('p.r8p-nota.ojo', 'No hay motores de IA instalados en este PC.') : null));
    pintaDer(); publica();
  }
  function pintaDer() {
    const buenos = L.orden.filter(k => L.res[k] && L.res[k].estado === 'bien'), pq = porque();
    if (!L.orden.length) { mount(der, h('div.r8p-tit', h('span', '🏆'), h('div', h('b', 'La comparación'), h('small', 'Aquí saldrán los resultados con sus vistas de frente, lado y espalda, y por qué recomiendo uno.'))), h('div.r8p-sec', h('b', 'Cómo comparo'), h('table.r8p-tabla', Object.entries({ parecido: 'Parecido de frente con tu foto', superficie: 'Superficie limpia (no «grumosa»)', espalda: 'Espalda tan bien resuelta como el frente', imprimir: 'Lista para imprimir (cerrada, una pieza, paredes)' }).map(([k, t]) => h('tr', h('td', t), h('td.n', PESOS[k] + ' %'), h('td', C.etiqueta(k === 'imprimir' ? 'medido' : 'aprox')))))), h('p.small.muted', 'No elijo solo por la silueta: una figura puede parecerse de frente y estar mal por detrás.')); return; }
    const k = L.recomendado, R = k && L.res[k];
    mount(der,
      R ? h('div.r8p-nota.bien.r8l-reco', h('b', '⭐ Recomiendo ' + MOT[k].nombre + ' · ' + Math.round(R.nota.total) + '/100'), pq && pq.bien.length ? h('div', 'Porque ' + pq.bien.join(', ') + '.') : null, pq && pq.ojo.length ? h('div.r8l-ojo', 'Ojo: ' + pq.ojo.join('; ') + '.') : null, h('small', 'La puntuación es orientativa (casi todo es aproximado): mira las tres vistas antes de decidir.')) : L.corriendo ? h('p.r8p-nota', 'Probando… los resultados van saliendo aquí.') : h('p.r8p-nota.mal', 'Ningún motor ha podido con esta foto.'),
      L.orden.map(id => tarjeta(id)),
      buenos.length ? h('details.r8p-sec', h('summary', h('b', 'Tabla completa')), tabla()) : null,
      L.carpeta && buenos.length && D ? h('div.r8p-btns', btn('📂 Ver los modelos guardados', () => D.r8Carpeta(L.carpeta).catch(e => toast(e.message, 'bad')), { cls: 'sm ghost' })) : null,
      L.usado ? h('div.r8p-sec', h('b', 'Siguiente paso'), h('div.r8p-btns', btn('🛠️ Reparar', () => ext.irA && ext.irA('taller'), { cls: 'sm' }), btn('🩺 Imprimir', () => ext.irA && ext.irA('doctor'), { cls: 'sm primary' }), btn('🧰 Al Estudio', async () => { const R2 = L.res[L.usado]; ext.alEstudioMalla && ext.alEstudioMalla(await MA.sopaDe(R2.stl), L.nombre); }, { cls: 'sm' }))) : null);
  }
  function tarjeta(id) {
    const R = L.res[id], m = MOT[id], P = R.nota;
    if (R.estado !== 'bien') return h('div.r8l-tar.' + (R.estado || ''), h('div.r8l-tt', h('b', m.e + ' ' + m.nombre), h('small', R.estado === 'va' ? '⏳ trabajando…' : R.estado === 'espera' ? 'en cola' : R.estado === 'saltado' ? '⏭️ saltado' : '❌ no ha salido')), R.error ? h('small.r8l-err', R.error) : null);
    const X = R.info.metricas || {}, ins = R.info.inspeccion && !R.info.inspeccion.error ? R.info.inspeccion : null;
    return h('div.r8l-tar' + (L.recomendado === id ? '.reco' : '') + (L.ver === id ? '.ver' : ''), { 'data-motor': id },
      h('div.r8l-tt', h('b', (L.recomendado === id ? '⭐ ' : '') + m.e + ' ' + m.nombre), h('span.r8l-nota', Math.round(P.total) + '/100')),
      h('div.r8l-minis', Object.keys(DIRS).map(d => h('figure', R.minis && R.minis[d] ? h('img', { src: R.minis[d], alt: m.nombre + ' de ' + d }) : h('div.r8l-sin', '—'), h('figcaption', d)))),
      h('table.r8p-tabla.r8l-met',
        h('tr', h('td', 'Parecido de frente'), h('td.n', R.info.parecido != null ? C.n2(R.info.parecido, 1) + ' %' : '—'), h('td', C.etiqueta('aprox'))),
        h('tr', h('td', 'Rugosidad (frente · espalda)'), h('td.n', X.rugosidad != null ? C.n2(X.rug_frente, 2) + ' · ' + C.n2(X.rug_espalda, 2) : '—'), h('td', C.etiqueta('aprox'))),
        h('tr', h('td', 'Cerrada · piezas'), h('td.n', (R.rev.estanca ? 'sí' : 'NO') + ' · ' + R.rev.piezas), h('td', C.etiqueta('medido'))),
        h('tr', h('td', 'Paredes finas'), h('td.n', ins ? C.n2(ins.paredes_finas_pct, 2) + ' %' : '—'), h('td', C.etiqueta(ins ? 'aprox' : 'nomedido'))),
        h('tr', h('td', 'Tiempo · tarjeta · RAM (pico)'), h('td.n', Math.round(R.t) + ' s · ' + (R.info.vram_gb ? C.n2(R.info.vram_gb, 1) + ' GB' : 'nube') + ' · ' + (R.info.ram_pico_gb ? C.n2(R.info.ram_pico_gb, 1) + ' GB' : '—')), h('td', C.etiqueta('medido'))),
        R.vramAntes != null && R.vramDespues != null ? h('tr', h('td', 'Tarjeta libre antes → después'), h('td.n', C.n2(R.vramAntes, 1) + ' → ' + C.n2(R.vramDespues, 1) + ' GB'), h('td', C.etiqueta('medido'))) : null),
      h('div.r8p-btns', btn('👁 Verla', () => { L.ver = id; pintaVista(true); pintaDer(); }, { cls: 'sm ghost' }), btn(L.usado === id ? '✅ En la mesa' : 'Usar esta', () => usar(id), { cls: 'sm' + (L.recomendado === id ? ' primary' : '') + ' r8l-usar' })));
  }
  function tabla() { const ks = L.orden.filter(k => L.res[k].estado === 'bien'); return h('table.r8p-tabla', h('tr', h('th', ''), ks.map(k => h('th', MOT[k].nombre))), Object.entries({ parecido: 'Parecido', superficie: 'Superficie', espalda: 'Espalda', imprimir: 'Para imprimir', total: 'TOTAL' }).map(([c, t]) => h('tr', h('td', t + (c !== 'total' ? ' (' + PESOS[c] + ' %)' : '')), ks.map(k => h('td.n', L.res[k].nota[c] != null ? Math.round(L.res[k].nota[c]) : '—'))))); }
  function publica() { window.__r8lab = { orden: L.orden.slice(), recomendado: L.recomendado, usado: L.usado || null, carpeta: L.carpeta, res: Object.fromEntries(L.orden.map(k => [k, { estado: L.res[k].estado, error: L.res[k].error, nota: L.res[k].nota, parecido: L.res[k].info && L.res[k].info.parecido, metricas: L.res[k].info && L.res[k].info.metricas, vramAntes: L.res[k].vramAntes, vramDespues: L.res[k].vramDespues, t: L.res[k].t, minis: !!(L.res[k].minis && L.res[k].minis.frente) }])), porque: porque(), probar, ponFoto }; }

  const quita = E.escucha('sistema', () => { if (!L.corriendo) pinta(); });
  pinta(); pintaVista(); E.sistema().then(() => pinta()).catch(() => { });
  if (E.fotoCompartida()) ponFoto(E.fotoCompartida()); // la foto que tenías en Foto → 3D
  return { destroy() { vivo = false; L.parar = true; quita(); if (L.img) URL.revokeObjectURL(L.img); if (esc) esc.destruir(); } };
}
