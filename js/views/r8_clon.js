// ================= v20.4 · 🧬 CelebriCLON · la pantalla =================
// Fotos (con su vista) → la foto MARCADA (C1, C2… con flechas; tócalas) ↔ la TABLA de medidas (escribe, ±, estado) → la PIEZA 3D en
// vivo (con TUS medidas) → al Estudio, STL / 3MF, o una PROBETA fina para comprobar los agujeros en tu Bambu antes de la pieza entera.
// Lo que falta se PIDE (fotos o medidas); lo que sale de la foto va como ESTIMADO; nada se inventa. Todo se guarda en este PC.
import { h, mount, btn, toast, modal } from '../ui.js';
import * as N from '../r8/nucleo.js';
import * as FM from '../r8/foto_medida.js';
import * as CL from '../r8/clon.js';
import * as CIA from '../r8/clon_ia.js';
import * as FRU from '../r8/foto_restaura_ui.js'; // 13-10-2026 · 🩹 restaurador de fotos + retoque (opción B)
import { crearEscena } from '../r8/escena3d.js';
import { mesa } from '../r8/mesa.js'; // v30: tocar, mover, duplicar y copiar en la cama
import * as ES from '../r8/estado.js';
import * as TP from '../r8/tapete.js';
import * as GF from '../r8/guia_fotos.js'; // 14-10-2026 · 📷 guía de fotos: «ahora de frente, ahora de lado», con dibujos de dónde va el móvil // 13-10-2026 · 🧾 tapete de calco: endereza y calibra solo, y corrige el grosor // 13-10: la foto compartida con «🪄 Figura» («📸 Desde una foto»)

const n2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES');
// ---------- guardar en este aparato (IndexedDB «celebriclon»): el trabajo y sus fotos ----------
const BD = 'celebriclon', AL = 'clones';
const abreBD = () => new Promise((res, rej) => { const r = indexedDB.open(BD, 1); r.onupgradeneeded = () => r.result.createObjectStore(AL, { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = (modo, f) => abreBD().then(db => new Promise((res, rej) => { const t = db.transaction(AL, modo), r = f(t.objectStore(AL)); t.oncomplete = () => { db.close(); res(r && r.result); }; t.onerror = () => { db.close(); rej(t.error); }; }));
export function guardaClon(C) { const imgs = {}; C.fotos.forEach(f => [f.img, f.mascara, f.original].forEach(id => { const I = id && FM.IMAGENES.get(id); if (I) imgs[id] = I; })); return tx('readwrite', s => s.put({ id: C.id, nombre: C.nombre, fecha: Date.now(), json: JSON.stringify(C), imagenes: imgs })); }
export const listaClones = () => tx('readonly', s => s.getAll()).then(L => (L || []).map(x => ({ id: x.id, nombre: x.nombre, fecha: x.fecha })).sort((a, b) => b.fecha - a.fecha));
export const abreClon = id => tx('readonly', s => s.get(id)).then(x => { if (!x) throw new Error('No encuentro ese trabajo.'); Object.entries(x.imagenes || {}).forEach(([k, v]) => FM.IMAGENES.set(k, v)); return JSON.parse(x.json); });
const nuevo = () => ({ id: 'clon' + Date.now().toString(36), nombre: 'Repuesto ' + new Date().toLocaleDateString('es-ES'), fotos: [], medidas: [] });

export async function montarClon(el, ext = {}) {
  await N.cargar();
  let C = nuevo(), plan = { medidas: [], peticiones: [], deducidas: [] }, fotoSel = 0, medSel = null, marcas = true, comparar = false, modoF = null, ptsF = [], pieza = null, vivo = true, tic = 0, guardTic = 0;
  const ANAL = new Map(); // img → análisis (no se guarda: se rehace)
  const raiz = h('div.clon'), cab = h('div.clon-cab'), izq = h('div.clon-fotos'), centro = h('div.clon-foto'), der = h('div.clon-tabla'), abajo = h('div.clon-pieza');
  const cv = h('canvas.clon-cv', { 'aria-label': 'Foto marcada: toca una etiqueta para ver su medida' }), barraF = h('div.clon-barra'), pista = h('div.clon-pista');
  const lienzo3 = h('canvas.clon-cv3'), info3 = h('div.clon-info3');
  const restP = h('div.clon-rest');
  centro.append(barraF, h('div.clon-cvw', cv, restP), pista); abajo.append(h('div.clon-v3', lienzo3), info3);
  raiz.append(cab, h('div.clon-main', izq, centro, der), abajo); el.appendChild(raiz);
  // 14-10-2026 · 📷 la foto que se está PIDIENDO (la guía: «ahora de frente», «ahora de lado»…): la que se sube entra con esa vista
  let pidiendo = null;
  const alElegir = e => { const L = [...(e.target.files || [])]; e.target.value = ''; const v = pidiendo; pidiendo = null; añadeFotos(L, v); };
  const fi = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp', multiple: true, style: { display: 'none' }, onchange: alElegir });
  const fiCam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' }, onchange: alElegir }); // (en el móvil o la tablet abre la cámara)
  raiz.append(fi, fiCam);
  const tactil = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  function pideFoto(vista, camara) { pidiendo = vista || null; (camara ? fiCam : fi).click(); }
  // lo que la guía necesita saber: si es plana (sin foto de lado), si no hace falta la de canto, y si la de lado tiene escalones
  const opsGuia = () => ({ plana: !!C.plana, sinCanto: !!C.sinCanto, escalones: (plan.medidas || []).some(m => /^lado(Esc|Top)/.test(m.clave)) });
  let escena = null, MESA = null; try { escena = crearEscena(lienzo3, { cama: 256, dia: document.documentElement.getAttribute('data-modo') === 'dia' }); MESA = mesa(escena, lienzo3, { cama: 256 }); } catch (e) { mount(info3, h('p.r8e-mal', '⚠️ Sin vista 3D en este aparato: ' + (e.message || e))); }

  // ---------- el trabajo ----------
  async function arranca() { let L = []; try { L = await listaClones(); } catch (e) { } if (L.length) { try { C = await abreClon(L[0].id); } catch (e) { C = nuevo(); } } else C = nuevo(); await analizaTodo(); todo(); }
  // v40.2 · 🗻 relieves: se calculan una vez por foto y número de niveles (tarda un segundo) y se guardan aquí
  let iaMirando = false; const REL = new Map(), relOps = () => (C.relieve = Object.assign({ on: false, niveles: 2, alto: 1.2, modo: 'sale' }, C.relieve || {}));
  const relClave = f => (f.mascara || f.img) + '|' + relOps().niveles + '|' + (f.espejo ? 1 : 0);
  async function preparaRelieve() { const f = C.fotos.find((x, i) => plan && i === plan.principal); if (!f || !relOps().on) return null; const k = relClave(f); if (REL.has(k)) return REL.get(k); const A = await analiza(f); if (!A || A.error) return null; const im = await FM.imagenDe(f.img); const r = CL.relieveDeFoto(FM.pixeles(im), A, { niveles: relOps().niveles, espejo: !!f.espejo }); REL.set(k, r); return r; }
  const fotosA = () => C.fotos.map((f, i) => Object.assign({}, f, { i, analisis: ANAL.get(f.mascara || f.img) || null, relieve: relOps().on ? REL.get(relClave(f)) || null : null }));
  async function analiza(f) { const k = f.mascara || f.img; if (ANAL.has(k)) return ANAL.get(k); const im = await FM.imagenDe(k); const A = CL.analizaFoto(FM.pixeles(im), { espejo: !!f.espejo, suave: !!(f.rest && f.mascara) }); ANAL.set(k, A); return A; }
  async function analizaTodo() { for (const f of C.fotos) { try { await analiza(f); } catch (e) { ANAL.set(f.mascara || f.img, { error: e.message }); } } replan(); }
  function replan() { plan = CL.planMedidas(fotosA(), C.medidas); C.medidas = plan.medidas; }
  function guarda() { clearTimeout(guardTic); guardTic = setTimeout(() => guardaClon(C).catch(e => toast('No se ha podido guardar: ' + e.message, 'bad')), 600); }
  // 13-10-2026 · 🩹 RESTAURADOR: encendido salvo que ella lo apague (o las pruebas antiguas, que traen sus fotos ya limpias)
  let restaurar = true; try { restaurar = localStorage.getItem('cd.clon.restaurar') !== 'no'; } catch (e) { }
  // 13-10-2026 (noche): un respiro para que el navegador PINTE el aviso de espera antes de ponerse con lo pesado (enderezar, restaurar,
  // analizar se hacían de un tirón y la pantalla se quedaba quieta, sin el «espera», hasta acabar). «await espera('…')» donde venga trabajo.
  const respiro = () => new Promise(r => { let ya = false; const f = () => { if (!ya) { ya = true; r(); } }; try { requestAnimationFrame(() => setTimeout(f, 0)); } catch (e) { } setTimeout(f, 120); });
  const velo = h('div.clon-velo', { hidden: true }), espera = t => { velo.hidden = !t; mount(velo, t ? [h('div.ac50-giro'), h('p', t)] : []); return t ? respiro() : null; };
  // los relieves, SOLOS: si lo que se ve en la foto de frente es claro, se ponen sin preguntar (y se dice); si no, quedan a un clic
  async function relieveSolo(i) { try { const f = C.fotos[i], A = await analiza(f); if (!A || A.error) return; const im = await FM.imagenDe(f.img), r = CL.relieveDeFoto(FM.pixeles(im), A, { niveles: 2, espejo: !!f.espejo }); REL.set((f.mascara || f.img) + '|2|' + (f.espejo ? 1 : 0), r);
    if (CL.relieveClaro(r)) { C.relieve = { on: true, niveles: 2, alto: 1.2, modo: 'sale', solo: true }; toast('🗻 He visto relieves en la foto y los he puesto solos (1,2 mm hacia fuera). Abajo, en «Sacar los relieves», los cambias o los quitas.', 'ok', 9000); } } catch (e) { console.warn('relieve solo', e); } }
  // cambiar cómo está restaurada una foto (otra forma, la IA, a mano o tal cual) sin perder lo calibrado: las referencias se llevan de
  // la foto vieja a la nueva pasando por la original
  const aOriginal = (refs, r) => (refs || []).map(x => ({ a: [x.a[0] / r.k + r.caja[0], x.a[1] / r.k + r.caja[1]], b: [x.b[0] / r.k + r.caja[0], x.b[1] / r.k + r.caja[1]], mm: x.mm }));
  async function cambiaRest(ops) {
    const f = C.fotos[fotoSel]; if (!f || !f.original) return;
    try { await espera(ops.ia === 'si' ? '✨ La IA de tu PC está separando la pieza…' : '🩹 Probando otra forma…'); const R = await FRU.restauraImagen(f.original, Object.assign({ alEsperar: espera }, ops)), enOrig = f.rest ? aOriginal(f.refs, f.rest) : f.refs;
      ANAL.delete(f.mascara || f.img); Object.assign(f, { img: R.img, mascara: R.mascara, rest: R.rest, refs: FRU.refsA(enOrig, R.rest) }); delete f.ajuste; imCache.clear(); await analiza(f); replan(); guarda(); zoomF = { k: 1, dx: 0, dy: 0 }; todo();
      toast(ops.ia === 'si' && !R.rest.conIA ? 'La IA no ha podido con esta foto' + (R.rest.falloIA ? ' (' + R.rest.falloIA + ')' : '') + ': se queda lo de antes.' : '🩹 ' + FRU.resumen(R.rest), R.rest.confianza === 'alta' ? 'ok' : 'warn', 6000);
    } catch (e) { toast(e.message || String(e), 'bad', 8000); } finally { espera(''); }
  }
  async function fotoTalCual() { const f = C.fotos[fotoSel]; if (!f || !f.original) return; ANAL.delete(f.mascara || f.img); f.refs = f.rest ? aOriginal(f.refs, f.rest) : f.refs; f.img = f.original; delete f.mascara; delete f.rest; delete f.ajuste; imCache.clear(); await analiza(f); replan(); guarda(); zoomF = { k: 1, dx: 0, dy: 0 }; todo(); toast('Foto tal cual, sin restaurar (como se hacía antes).', 'ok'); }
  function retoca() { const f = C.fotos[fotoSel]; if (!f || !f.mascara) return; FRU.abreRetoque({ img: f.img, mascara: f.mascara, alGuardar: async id => { ANAL.delete(f.mascara); f.mascara = id; f.rest = Object.assign({}, f.rest, { metodo: 'mano', nombre: 'Retocada a mano', confianza: 'alta', avisos: [], pasos: (f.rest.pasos || []).filter(t => !/marcado tú/.test(t)).concat(['El contorno lo has retocado tú.']) }); await analiza(f); replan(); guarda(); todo(); toast('🩹 Contorno retocado: las medidas se rehacen con él.', 'ok'); } }); }
  const FOTOS_SUBIDAS = new WeakSet();
  async function añadeFotos(L, pedida) {
    for (const f of L) { try { const I = await FM.cargaArchivo(f); FOTOS_SUBIDAS.add(f); ES.compartirFoto(f); // (13-10: la ve también «🪄 Figura» en «📸 Desde una foto»)
      // 14-10-2026 · la vista: la que pide la guía (si ya había una de esa vista, esta la SUSTITUYE: es «repetirla»); si se suben varias de
      // golpe, por orden: de frente → de lado (salvo si es plana) → desde la punta → otra
      if (pedida && f === L[0]) { const vieja = C.fotos.findIndex(x => x.vista === pedida); if (vieja >= 0) { ANAL.delete(C.fotos[vieja].mascara || C.fotos[vieja].img); C.fotos.splice(vieja, 1); } }
      const tiene = v => C.fotos.some(x => x.vista === v), vista = pedida && f === L[0] ? pedida : !tiene('principal') ? 'principal' : !tiene('lado') && !C.plana ? 'lado' : !tiene('canto') ? 'canto' : 'otra', n = C.fotos.length;
      if (vista === 'lado') C.plana = false;
      // 13-10-2026 · 🩹 la foto pasa por el RESTAURADOR (fondo, luz, sombras, brillos; recorte y ampliación a la pieza). Si no encuentra
      // pieza, la foto entra tal cual, como antes, y se dice
      const nueva = { img: I.id, vista, espejo: false, refs: [], nombre: f.name };
      // 13-10-2026 · 🧾 ¿está sobre el TAPETE DE CALCO? → enderezada, calibrada y con su precisión, sin tocar nada
      await espera('📷 Mirando la foto…'); try { const T = await conTapete(I.id); if (T) Object.assign(nueva, T); } catch (e) { console.warn(e); }
      if (restaurar) { await espera('🩹 Restaurando la foto y buscando la pieza…'); try { const R = await FRU.restauraImagen(I.id, { alEsperar: espera }); Object.assign(nueva, { img: R.img, mascara: R.mascara, rest: R.rest, original: nueva.img, refs: FRU.refsA(nueva.refs, R.rest) }); } catch (e) { toast('🩹 ' + (e.message || e) + ' La dejo tal cual: prueba «🩹 Retocar» o repite la foto.', 'warn', 9000); } finally { espera(''); } }
      espera(''); C.fotos.push(nueva); ANAL.delete(nueva.mascara || nueva.img); await analiza(C.fotos[n]); fotoSel = n; zoomF = { k: 1, dx: 0, dy: 0 };
      if (nueva.tapete) toast('🧾 ' + TP.resumen(nueva.tapete) + ' Foto enderezada y calibrada sola.', 'ok', 9000);
      if (nueva.rest) { const r = nueva.rest; toast('🩹 ' + FRU.resumen(r) + (r.pasos.length ? ' · ' + r.pasos.length + ' arreglo' + (r.pasos.length === 1 ? '' : 's') : '') + '. Mira la línea verde: es lo que tomo por pieza.', r.confianza === 'alta' ? 'ok' : 'warn', 7000); }
      if (vista === 'principal' && !(C.relieve && (C.relieve.on || C.relieve.tocado))) await relieveSolo(n);
    } catch (e) { espera(''); toast((f.name || 'Foto') + ': ' + (e.message || e), 'bad', 7000); } }
    const ip = C.fotos.findIndex(x => x.vista === 'principal'); if (L.length > 1 && ip >= 0) fotoSel = ip; // (con varias de golpe, se empieza por la principal)
    replan(); guarda(); todo(); diSiguiente();
  }
  // 14-10-2026 · 👉 tras cada foto, la guía dice cuál toca AHORA (o que ya están todas)
  function diSiguiente() { if (!C.fotos.length) return; const sig = GF.plan(C.fotos, opsGuia()).find(p => p.estado === 'ahora');
    setTimeout(() => toast(sig ? '👉 Ahora: la foto ' + GF.PASOS[sig.v].titulo + '. Mira el dibujo de la izquierda: ahí está dónde va el móvil.' : '✅ Ya tengo las fotos que necesito. Ahora mide con el calibre lo que te marco (C1, C2…).', 'ok', 7000), 400); }
  // ---------- 🧾 el tapete de calco ----------
  // la foto (id) → null o { img (la enderezada), refs (dos, del propio tapete), tapete: { … lo que hace falta para rehacerla con el grosor } }
  async function conTapete(id, alto) {
    const im = await FM.imagenDe(id), D = FM.pixeles(im), R = TP.buscaTapete(D, { medido: medidoTapete() }); if (!R) return null;
    const hm = tapeteImpreso() ? TP.RELIEVE3D : 0, E = TP.endereza(im, R, { alto, hm }), J = FM.deImagen(E.canvas, 2600, 'image/png');
    const k = J.w / E.W, mmPx = E.mmPorPx / k; // (por si deImagen la ha achicado)
    return { img: J.id, refs: [{ a: [0, 0], b: [J.w, 0], mm: J.w * mmPx }, { a: [0, 0], b: [0, J.h], mm: J.h * mmPx }],
      tapete: { clave: R.tapete, n: R.n, err: R.err, errMax: R.errMax, precision: R.precision, comprobado: R.comprobado, pose: R.pose, sinEnderezar: id, alto: E.corregidaAlto || 0, hm, mide: R.T.escala ? [R.T.W, R.T.H] : null } };
  }
  const tapeteImpreso = () => { try { return localStorage.getItem('cd.clon.tapete3d') === '1'; } catch (e) { return false; } };
  // 13-10-2026 (noche) · 📏 «la barra me mide 97 mm»: lo que mide SU tapete impreso, de borde a borde de las marcas (por cada tapete; se guarda en este aparato)
  const medidoTapete = () => { try { const o = JSON.parse(localStorage.getItem('cd.clon.tapete.medido') || '{}'), r = {}; for (const k in o) if (TP.TAPETES[k] && Array.isArray(o[k]) && o[k][0] > 0 && o[k][1] > 0) r[k] = [Number(o[k][0]), Number(o[k][1])]; return r; } catch (e) { return {}; } };
  // la foto del tapete se vuelve a enderezar: con el GROSOR ya medido (separa la cara de abajo de las paredes) o con otra medida del tapete
  async function rehazTapete(i, alto, diciendo, hecho) {
    const f = C.fotos[i]; if (!f || !f.tapete) return;
    await espera(diciendo);
    try { const T = await conTapete(f.tapete.sinEnderezar, alto); if (!T) throw new Error('Ya no encuentro el tapete en la foto.');
      Object.assign(f, T); delete f.rest; delete f.mascara; delete f.original;
      if (restaurar) { try { const R = await FRU.restauraImagen(f.img, { alEsperar: espera }); Object.assign(f, { img: R.img, mascara: R.mascara, rest: R.rest, original: T.img, refs: FRU.refsA(f.refs, R.rest) }); } catch (e) { } }
      ANAL.clear(); await analizaTodo(); guarda(); todo(); toast(hecho, 'ok', 7000); }
    catch (e) { toast(e.message || String(e), 'bad', 8000); } finally { espera(''); }
  }
  async function corrigeGrosor(i) {
    const f = C.fotos[i], m = C.medidas.find(x => x.clave === 'alto' && x.valor > 0); if (!f || !f.tapete || !m) return;
    await rehazTapete(i, m.valor, '🧾 Rehaciendo la foto con el grosor (' + n2(m.valor) + ' mm)…', '🧾 Corregida con el grosor de ' + n2(m.valor) + ' mm: la cara de arriba ya no sale más grande.');
  }
  // la ventana «📏 Mi tapete mide…» (i = la foto que hay que rehacer al guardar, si se abre desde una foto)
  function mideTapete(i) {
    const M = medidoTapete(), num = v => { const x = parseFloat(String(v).replace(',', '.')); return x > 0 ? x : 0; }, pon = x => String(Math.round(x * 100) / 100).replace('.', ',');
    const filas = Object.entries(TP.TAPETES).map(([k, T]) => {
      const a = h('input.inp', { type: 'text', inputmode: 'decimal', 'data-k': 'tm-' + k + '-w', placeholder: String(T.W), value: M[k] ? pon(M[k][0]) : '', 'aria-label': 'Ancho de ' + T.t }), l = h('input.inp', { type: 'text', inputmode: 'decimal', 'data-k': 'tm-' + k + '-h', placeholder: String(T.H), value: M[k] ? pon(M[k][1]) : '', 'aria-label': 'Largo de ' + T.t });
      const b = T.pag ? null : h('input.inp', { type: 'text', inputmode: 'decimal', 'data-k': 'tm-' + k + '-barra', placeholder: '100', 'aria-label': 'Lo que mide la barra de 100 mm', oninput: ev => { const v = num(ev.target.value); if (v > 20 && v < 200) { a.value = pon(T.W * v / 100); l.value = pon(T.H * v / 100); } } });
      return { k, a, l, el: h('div.clon-tm-f', h('b', T.t), h('div.clon-tm-c', h('label', 'Ancho ', a), h('span', '×'), h('label', 'Largo ', l), h('small', 'mm')), b ? h('label.clon-tm-b', 'o dime solo cuánto mide su barra de 100 mm: ', b, ' mm') : null) };
    });
    modal('📏 ¿Cuánto mide TU tapete impreso?', h('div.clon-tm', h('p', 'Mide con una regla de BORDE A BORDE de los cuadrados negros (por fuera), a lo ancho y a lo largo. Si la impresora lo ha sacado algo más pequeño o más grande, escríbelo aquí y el programa lo tiene en cuenta. En blanco = mide lo que tiene que medir.'), filas.map(f => f.el)),
      close => [btn('Cancelar', close, { cls: 'ghost' }), btn('Guardar', () => {
        const o = {}; let mal = null; filas.forEach(f => { const T = TP.TAPETES[f.k], w = num(f.a.value) || T.W, l = num(f.l.value) || T.H; if (Math.abs(w - T.W) < 0.05 && Math.abs(l - T.H) < 0.05) return; if (w / T.W < 0.25 || w / T.W > 1.6 || l / T.H < 0.25 || l / T.H > 1.6) mal = T.t; else o[f.k] = [w, l]; });
        if (mal) return toast('Esa medida no puede ser de «' + mal + '»: revísala.', 'bad', 7000);
        try { localStorage.setItem('cd.clon.tapete.medido', JSON.stringify(o)); } catch (e) { } close();
        const txt = Object.keys(o).length ? '📏 Guardado: las fotos sobre ese tapete se calibran con TU medida.' : '📏 Guardado: los tapetes miden lo que tienen que medir.';
        if (i != null && C.fotos[i] && C.fotos[i].tapete) { const f = C.fotos[i], m = C.medidas.find(x => x.clave === 'alto' && x.valor > 0); rehazTapete(i, f.tapete.alto && m ? m.valor : undefined, '🧾 Rehaciendo la foto con la medida de tu tapete…', txt); } else { toast(txt, 'ok', 6000); pintaTodoFoto(); }
      }, { cls: 'primary clon-tm-guardar' })]);
  }
  async function bajaTapete(como) {
    try { const R8C = await import('../r8/comun.js'), T = TP.TAPETES[como === 'folio' ? 'folio' : como === 'etiqueta' ? 'etiqueta' : 't170'];
      if (como === '3d') { const Nn = await import('../r8/nucleo.js'); await Nn.cargar(); const m = TP.tapete3D(Nn, T), stl = new Uint8Array(Nn.stl(m, 'tapete_calco')); Nn.limpia(); await R8C.guardaEnPC(stl, 'Tapete de calco', 'tapete_calco_170mm.stl', 'model/stl');
        try { localStorage.setItem('cd.clon.tapete3d', '1'); } catch (e) { }
        toast('🖨️ Guardado. En Bambu Studio: blanco (o claro) abajo y PAUSA para cambiar a NEGRO a ' + n2(TP.BASE3D) + ' mm. Las marcas quedan en relieve; el programa lo tiene en cuenta.', 'ok', 14000); }
      else { await R8C.guardaEnPC(TP.pdfPapel(T), 'Tapete de calco', 'tapete_calco_' + (como === 'folio' ? 'A4_grande' : como === 'etiqueta' ? 'etiqueta_100x150' : '170mm') + '.pdf', 'application/pdf'); try { localStorage.setItem('cd.clon.tapete3d', '0'); } catch (e) { }
        toast(como === 'etiqueta' ? '🏷️ Guardado. Imprímelo en la impresora de etiquetas (papel de 100 × 150) a TAMAÑO REAL y mídelo de borde a borde: 94 × 144 mm. Si no mide eso, apúntalo en «📏 Mi tapete mide…».' : '📄 Guardado. Imprímelo a TAMAÑO REAL (100 %, sin «ajustar a la página») y comprueba con una regla la barra de 100 mm. Si no mide 100, apunta lo que mide en «📏 Mi tapete mide…».', 'ok', 14000); } }
    catch (e) { toast(e.message || String(e), 'bad', 8000); }
  }
  const unidad = () => { const m = C.medidas.find(x => x.clave === 'largo'), v = m && CL.valorDe(m, fotosA(), C.medidas).v; return CL.unidadDe(v || 0); };
  const aMmIn = v => (unidad() === 'cm' ? v * 10 : v), deMmIn = v => (unidad() === 'cm' ? v / 10 : v);

  // ---------- cabecera ----------
  function pintaCab() {
    const E = CL.estadoMedidas(plan, fotosA()), crit = plan.medidas.filter(m => m.critica && m.estado !== 'na');
    mount(cab, h('div.clon-tit', h('span.clon-ic', '🧬'), h('div', h('b', 'CelebriCLON'), h('small', 'Fotografía la pieza → te digo QUÉ medir y DÓNDE → la construyo con TUS medidas'))),
      h('input.inp.clon-nombre', { value: C.nombre, maxlength: 60, 'aria-label': 'Nombre del trabajo', onchange: e => { C.nombre = e.target.value.slice(0, 60) || C.nombre; guarda(); } }),
      h('div.clon-prog', h('b', (crit.length - E.faltan.length) + ' / ' + crit.length), h('small', 'imprescindibles con valor'), E.estimadas.length ? h('small.clon-est', E.estimadas.length + ' estimadas de la foto') : null),
      h('div.clon-acc', btn('➕ Añadir fotos', () => fi.click(), { cls: 'primary clon-anadir' }), btn('📂 Trabajos', abrirMenu, { cls: 'ghost' }), btn('🆕 Nuevo', () => { C = nuevo(); fotoSel = 0; medSel = null; plan = CL.planMedidas([]); todo(); }, { cls: 'ghost' })));
  }
  async function abrirMenu(e) {
    const L = await listaClones().catch(() => []), r = e.currentTarget.getBoundingClientRect(); document.querySelectorAll('.r8e-menu').forEach(m => m.remove());
    const m = h('div.r8e-menu', { style: { left: Math.max(8, r.left - 200) + 'px', top: (r.bottom + 6) + 'px' } }, L.length ? L.map(x => h('button', { type: 'button', onclick: async () => { m.remove(); C = await abreClon(x.id); ANAL.clear(); fotoSel = 0; medSel = null; await analizaTodo(); todo(); } }, h('span', '🧬'), h('b', x.nombre), h('small', new Date(x.fecha).toLocaleString('es-ES')))) : h('p.small.muted', 'Aún no hay trabajos guardados.'));
    document.body.appendChild(m); setTimeout(() => document.addEventListener('pointerdown', function fuera(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', fuera); } }), 0);
  }

  // ---------- las fotos (izquierda) ----------
  function pintaFotos() {
    const F = fotosA(), pasos = GF.plan(C.fotos, opsGuia());
    // la tarjeta de una foto ya subida (como antes) + 💡 lo que se puede mejorar de ESA foto
    const tarjeta = f => { const I = FM.IMAGENES.get(f.img), E = f.analisis && !f.analisis.error ? CL.escalaDe(f, C.medidas, F) : null, pet = CL.peticionesFoto(f, C.medidas, F), mej = GF.mejoras(f, I, E).slice(0, 2);
        return h('div.clon-f' + (f.i === fotoSel ? '.on' : ''), { 'data-foto': f.i, onclick: () => { fotoSel = f.i; modoF = null; zoomF = { k: 1, dx: 0, dy: 0 }; pintaTodoFoto(); } },
          I ? h('img', { src: I.url, alt: '' }) : null,
          h('div.clon-f-d', h('select.inp', { 'aria-label': 'Qué vista es', 'data-vista': f.i, onclick: ev => ev.stopPropagation(), onchange: ev => { C.fotos[f.i].vista = ev.target.value; replan(); guarda(); todo(); } }, Object.entries(CL.VISTAS).map(([k, t]) => h('option', { value: k, selected: f.vista === k }, t))),
            h('small', E ? '📏 ' + (f.tapete ? '🧾 tapete · ±' + n2(f.tapete.precision) + ' mm' : E.de === 'calibrada' ? 'calibrada' : 'escala ' + E.de) + ' · 1 px = ' + n2(E.mmPorPx) + ' mm' : '⚠️ sin escala'),
            f.tapete && !f.tapete.alto && C.medidas.some(x => x.clave === 'alto' && x.valor > 0.5) ? h('button.clon-b.clon-grosor', { type: 'button', title: 'Su cara de arriba está más cerca del móvil y sale algo más grande: con el grosor medido, se corrige', onclick: ev => { ev.stopPropagation(); corrigeGrosor(f.i); } }, '📐 Corregir con su grosor') : f.tapete && f.tapete.alto ? h('small.ok-t', '📐 corregida con ' + n2(f.tapete.alto) + ' mm de grosor') : f.tapete && f.tapete.pose && f.tapete.pose.inclinacion > 6 ? h('small.r8e-mal.clon-falta-grosor', '📐 Foto inclinada: mide el GROSOR (alto) y se corrige; si es fina, da igual') : null,
            f.tapete ? h('button.clon-b.clon-tap-mide2', { type: 'button', title: 'Si tu tapete impreso no mide lo que tiene que medir (la barra no da 100 mm), dime lo que mide', onclick: ev => { ev.stopPropagation(); mideTapete(f.i); } }, f.tapete.mide ? '📏 con tu medida: ' + n2(f.tapete.mide[0]) + ' × ' + n2(f.tapete.mide[1]) : '📏 Mi tapete mide…') : null,
            pet.length ? h('small.r8e-mal', '⚠️ ' + pet.length + ' aviso' + (pet.length === 1 ? '' : 's')) : null,
            mej.length ? h('div.gf-mejora', mej.map(m => h('small' + (m.grave ? '.r8e-mal' : ''), '💡 ' + m.t))) : null,
            (f.vista === 'lado' || f.vista === 'canto') ? h('label.check.small', { onclick: ev => ev.stopPropagation() }, h('input', { type: 'checkbox', checked: !!f.espejo, onchange: ev => { C.fotos[f.i].espejo = ev.target.checked; ANAL.delete(f.mascara || f.img); analiza(C.fotos[f.i]).then(() => { replan(); guarda(); todo(); }); } }), 'Hecha desde el otro lado') : null,
            f.vista !== 'otra' ? h('button.clon-b.gf-repite', { type: 'button', title: 'Hacer otra vez esta foto (sustituye a esta)', onclick: ev => { ev.stopPropagation(); pideFoto(f.vista, tactil); } }, '↺ Repetirla') : null,
            h('button.clon-quitar', { type: 'button', title: 'Quitar esta foto', onclick: ev => { ev.stopPropagation(); C.fotos.splice(f.i, 1); fotoSel = 0; replan(); guarda(); todo(); } }, '🗑'))); };
    // el HUECO de una foto que falta: su dibujo (dónde va el móvil), por qué hace falta, consejos y los botones
    const EST = { ahora: '👉 AHORA', luego: 'Después', opcional: 'Si hace falta', no: 'No hace falta' };
    const hueco = (p, n) => { const D = GF.PASOS[p.v], abierto = p.estado === 'ahora';
      return h('div.gf-slot.' + p.estado, { 'data-paso': p.v },
        h('div.gf-cab', h('b', n + ' · ' + D.titulo), h('span.gf-est.' + p.estado, EST[p.estado] || '')),
        abierto || p.estado === 'opcional' ? h('div.gf-dib', { html: GF.DIBUJOS[p.v]() }) : null,
        abierto ? h('small.gf-porque', D.porque) : p.motivo ? h('small.gf-motivo', p.motivo) : null,
        abierto ? h('ul.gf-tips', D.tips.map(t => h('li', t))) : null,
        abierto || p.estado === 'opcional' ? h('div.gf-btns', btn('📷 Subir la foto ' + D.corto.toLowerCase(), () => pideFoto(p.v), { cls: (abierto ? 'primary ' : '') + 'sm gf-sube' }), tactil ? btn('📸 Hacerla ahora', () => pideFoto(p.v, true), { cls: 'sm gf-cam' }) : null,
          p.v === 'lado' ? btn('Es plana: no hace falta', () => { C.plana = true; guarda(); todo(); diSiguiente(); }, { cls: 'sm ghost gf-plana', title: 'Del mismo grosor en todas partes: el grosor lo mides con el calibre' }) : null,
          p.v === 'canto' ? btn('No hace falta', () => { C.sinCanto = true; guarda(); todo(); diSiguiente(); }, { cls: 'sm ghost gf-sincanto' }) : null) : null,
        p.estado === 'no' && ((p.v === 'lado' && C.plana) || (p.v === 'canto' && C.sinCanto)) ? h('button.clon-b.gf-deshaz', { type: 'button', onclick: () => { if (p.v === 'lado') C.plana = false; else C.sinCanto = false; guarda(); todo(); } }, '↺ Sí la quiero hacer') : null); };
    const otras = F.filter(f => f.vista === 'otra' || F.findIndex(x => x.vista === f.vista) !== F.indexOf(f));
    const listas = !pasos.some(p => p.estado === 'ahora');
    mount(izq, h('div.clon-sec-t', h('b', 'FOTOS'), h('small', listas ? '✅ las que necesito' : 'paso a paso')),
      pasos.map((p, i) => { const f = F.find(x => x.vista === p.v); return f ? h('div.gf-hecha', h('div.gf-cab', h('b', (i + 1) + ' · ' + GF.PASOS[p.v].titulo), h('span.gf-est.hecha', '✅')), tarjeta(f)) : hueco(p, i + 1); }),
      otras.length ? [h('div.clon-sec-t', h('b', 'OTRAS'), h('small', 'solo para mirar')), otras.map(tarjeta)] : null,
      h('details.gf-consejos', { open: !F.length }, h('summary', '💡 Cómo hacer buenas fotos (y cómo NO)'), h('ul.gf-tips', GF.CONSEJOS.map(t => h('li', t))),
        h('div.gf-no', ['inclinado', 'cerca', 'sombra'].map(k => h('div.gf-dib.mini', { html: GF.DIBUJOS[k]() })))),
      h('div.clon-tap' + (F.length ? '.compacto' : ''), h('b', '🧾 Lo más preciso: el TAPETE DE CALCO'), F.length ? null : h('small', 'Pon la pieza dentro de su recuadro y haz la foto como salga: el programa encuentra sus marcas, endereza la foto, la calibra y te dice la precisión. Sin regla y sin tocar nada.'),
        h('div.r8e-btns', btn('📄 En papel (PDF)', () => bajaTapete('papel'), { cls: 'sm clon-tap-papel' }), btn('🖨️ En tu Bambu (2 colores)', () => bajaTapete('3d'), { cls: 'sm clon-tap-3d' }), btn('📄 Grande (A4)', () => bajaTapete('folio'), { cls: 'sm ghost' }), btn('🏷️ Pequeño (etiqueta 100 × 150)', () => bajaTapete('etiqueta'), { cls: 'sm ghost clon-tap-etiqueta', title: 'Para una impresora de etiquetas de 100 × 150 mm: piezas de hasta 60 × 110 mm' }), btn('📏 Mi tapete mide…' + (Object.keys(medidoTapete()).length ? ' ✔' : ''), () => mideTapete(), { cls: 'sm ghost clon-tap-mide', title: 'Si tu impresora no lo saca a tamaño real (la barra no mide 100 mm), dime lo que mide' }))),
      F.length ? null : h('p.small.muted.clon-vacio', 'Sin tapete: la pieza sobre un fondo LISO que contraste (folio blanco o cartulina negra), con una regla al lado.'));
    pintaGuiaCentro();
  }
  // con la foto de trabajo vacía, el CENTRO enseña en grande la foto que toca ahora (dibujo + consejos + botón)
  const guiaCentro = h('div.gf-centro', { hidden: true });
  function pintaGuiaCentro() {
    if (!guiaCentro.parentNode) centro.appendChild(guiaCentro);
    const p = C.fotos.length ? null : GF.plan(C.fotos, opsGuia()).find(x => x.estado === 'ahora'); guiaCentro.hidden = !p; if (!p) { mount(guiaCentro); return; }
    const D = GF.PASOS[p.v];
    mount(guiaCentro, h('div.gf-centro-c', h('b.gf-centro-t', '👉 Empieza aquí: la foto ' + D.titulo), h('div.gf-dib.grande', { html: GF.DIBUJOS[p.v]() }), h('ul.gf-tips', D.tips.map(t => h('li', t))),
      h('div.gf-btns', btn('📷 Subir la foto ' + D.corto.toLowerCase(), () => pideFoto(p.v), { cls: 'primary gf-sube-c' }), tactil ? btn('📸 Hacerla ahora con la cámara', () => pideFoto(p.v, true), { cls: 'gf-cam' }) : null),
      h('small.muted', 'Luego te diré si hace falta otra de lado o desde la punta. Solo las que necesite.')));
  }

  // ---------- la foto marcada (centro) ----------
  let vistaF = { s: 1, ox: 0, oy: 0 }, zonas = [], imCache = new Map(), zoomF = { k: 1, dx: 0, dy: 0 }, arrastreF = null, movido = false;
  const imagen = id => { if (imCache.has(id)) return Promise.resolve(imCache.get(id)); return FM.imagenDe(id).then(im => { imCache.set(id, im); return im; }); };
  // 13-10-2026 · el MARCO de lo que se enseña (en coordenadas de la foto de trabajo). Normal: la foto restaurada, recortada a la
  // pieza. Al CALIBRAR o ENDEREZAR: la foto ORIGINAL entera, puesta en esas mismas coordenadas, para poder tocar la regla o la hoja
  // que están junto a la pieza aunque el recorte las deje fuera. Las referencias se guardan igual (pueden caer fuera del recorte).
  const marcoDe = f => { const I = f && FM.IMAGENES.get(f.img); if (!I) return null; const O = modoF && f.rest && f.original ? FM.IMAGENES.get(f.original) : null;
    return O ? { x0: -f.rest.caja[0] * f.rest.k, y0: -f.rest.caja[1] * f.rest.k, w: O.w * f.rest.k, h: O.h * f.rest.k, orig: f.original } : { x0: 0, y0: 0, w: I.w, h: I.h, orig: null }; };
  async function pintaFoto() {
    const F = fotosA()[fotoSel], W = cv.parentElement.clientWidth || 600, H = cv.parentElement.clientHeight || 420, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    if (!F) { zonas = []; return; }
    const MR = marcoDe(C.fotos[fotoSel]) || { x0: 0, y0: 0, w: 1, h: 1 }, s = Math.min(W / MR.w, H / MR.h) * 0.96 * zoomF.k; vistaF = { s, ox: (W - MR.w * s) / 2 - MR.x0 * s + zoomF.dx, oy: (H - MR.h * s) / 2 - MR.y0 * s + zoomF.dy }; // (la vista se fija ANTES de esperar a la imagen: un toque nada más cambiar de modo ya cae en su sitio)
    const im = await imagen(MR.orig || F.img); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(s * dpr, 0, 0, s * dpr, vistaF.ox * dpr, vistaF.oy * dpr); g.drawImage(im, MR.x0, MR.y0, MR.w, MR.h);
    const A = F.analisis; zonas = [];
    if (A && A.R && F.rest && marcas) { const esp = F.espejo ? -1 : 1; g.save(); g.lineWidth = 2 / s; g.strokeStyle = 'rgba(45,212,191,.95)'; g.beginPath(); A.fuera.forEach((q, i) => { const p = CL.deMarco(A.R, esp * q[0], q[1]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.stroke(); g.restore(); }
    if (A && A.R && comparar && pieza && pieza.marcas && F.i === plan.principal) dibujaComparar(g, F, s);
    if (A && A.R && marcas) { const U = unidad(), valores = Object.fromEntries(C.medidas.map(m => { const v = CL.valorDe(m, fotosA(), C.medidas); return [m.id, v]; })); zonas = CL.dibujaMarcas(g, F, C.medidas, { k: 1 / s, sel: medSel, unidad: U, valores }); }
    // lo que se está marcando (calibrar / enderezar)
    if (ptsF.length) { g.lineWidth = 2 / s; g.strokeStyle = '#ffd23f'; g.fillStyle = '#ffd23f'; ptsF.forEach(p => { g.beginPath(); g.arc(p[0], p[1], 6 / s, 0, 7); g.fill(); }); if (ptsF.length > 1) { g.beginPath(); ptsF.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (modoF === 'persp' && ptsF.length === 4) g.closePath(); g.stroke(); } }
    if (A && A.error) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = 'rgba(200,30,60,.85)'; g.fillRect(10, 10, W - 20, 34); g.fillStyle = '#fff'; g.font = '600 13px system-ui'; g.fillText('⚠️ ' + A.error, 18, 32); }
  }
  // la pieza construida, encima de la foto principal (rectángulo medido, agujeros y ranuras donde van): para ver diferencias
  // Con la foto CALIBRADA, la pieza va a la escala de la FOTO: si tu medida y la foto no cuadran, se VE. Sin calibrar, se ajusta al
  // contorno (y entonces solo se pueden comparar agujeros y ranuras). Ajuste fino (por si la foto está movida o girada): C.fotos[i].ajuste
  function dibujaComparar(g, F, s) {
    const R = F.analisis.R, M = pieza.marcas, E = F.refs && F.refs.length ? FM.calibra(F.refs) : null, aj = Object.assign({ dx: 0, dy: 0, s: 100, a: 0 }, C.fotos[F.i].ajuste || {});
    const sx = E ? 1 / E.mmPorPx : R.L / M.largo, sy = E ? 1 / E.mmPorPx : R.W / M.ancho, esp = F.espejo ? -1 : 1, k = aj.s / 100, an = aj.a * Math.PI / 180;
    const P = (x, y) => { const p = CL.deMarco(R, esp * x * sx, y * sy), d = [p[0] - R.c[0], p[1] - R.c[1]]; return [R.c[0] + k * (d[0] * Math.cos(an) - d[1] * Math.sin(an)) + aj.dx, R.c[1] + k * (d[0] * Math.sin(an) + d[1] * Math.cos(an)) + aj.dy]; };
    g.save(); g.lineWidth = 2.4 / s; g.strokeStyle = '#29d3ff'; g.setLineDash([8 / s, 5 / s]);
    g.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], i) => { const p = P(a * M.largo / 2, b * M.ancho / 2); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.stroke();
    g.setLineDash([]); M.agujeros.forEach(a => { const c = P(a.x, a.y); g.beginPath(); g.arc(c[0], c[1], a.d / 2 * (sx + sy) / 2 * k, 0, 7); g.stroke(); });
    g.font = '700 ' + Math.round(13 / s) + 'px system-ui'; g.fillStyle = '#29d3ff'; const t = P(-M.largo / 2, M.ancho / 2); g.fillText(E ? 'pieza a la escala de la foto' : 'sin calibrar: ajustada al contorno', t[0], t[1] - 8 / s);
    g.restore();
  }
  const aImg = ev => { const r = cv.getBoundingClientRect(); return [((ev.clientX - r.left) - vistaF.ox) / vistaF.s, ((ev.clientY - r.top) - vistaF.oy) / vistaF.s]; };
  // v20.4 · ZOOM con la rueda (hacia donde apunta el ratón), ARRASTRAR para moverla, doble clic = ver entera
  cv.addEventListener('wheel', ev => { ev.preventDefault(); const r = cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, q = aImg(ev), k2 = Math.max(1, Math.min(12, zoomF.k * (ev.deltaY > 0 ? 0.85 : 1.18)));
    if (k2 === 1) { zoomF = { k: 1, dx: 0, dy: 0 }; pintaFoto(); return; }
    const s2 = vistaF.s / zoomF.k * k2, ox2 = mx - q[0] * s2, oy2 = my - q[1] * s2, W = cv.parentElement.clientWidth, H = cv.parentElement.clientHeight, I = marcoDe(C.fotos[fotoSel]); if (!I) return;
    zoomF = { k: k2, dx: ox2 - (W - I.w * s2) / 2 + I.x0 * s2, dy: oy2 - (H - I.h * s2) / 2 + I.y0 * s2 }; pintaFoto(); }, { passive: false });
  // v20.4 · TABLET (la dueña: «también para iPad/tablet, ojo con el lápiz y los dedos»):
  //  · DOS DEDOS: pellizcar = zoom, mover = desplazar · UN DEDO: desplazar (y, si no usas lápiz, tocar las etiquetas)
  //  · LÁPIZ: marca y toca con precisión; en cuanto se usa el lápiz, los dedos SOLO mueven la vista (la palma no marca)
  //  · TOQUE CON DOS DEDOS (sin moverlos) = deshacer el último punto marcado
  const ptrs = new Map(); let gesto = null, penVisto = false, ultimoTipo = 'mouse', toque2 = null;
  const centroDedos = L => [L.reduce((a, p) => a + p.x, 0) / L.length, L.reduce((a, p) => a + p.y, 0) / L.length];
  cv.addEventListener('pointerdown', ev => {
    ultimoTipo = ev.pointerType || 'mouse'; if (ev.pointerType === 'pen') penVisto = true;
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { }
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, tipo: ev.pointerType });
    const dedos = [...ptrs.values()].filter(p => p.tipo === 'touch');
    if (dedos.length >= 2) { const [a, b] = dedos; gesto = { d0: Math.hypot(a.x - b.x, a.y - b.y), c0: centroDedos(dedos), k0: zoomF.k, dx0: zoomF.dx, dy0: zoomF.dy, t0: performance.now(), movio: false }; arrastreF = null; movido = true; if (dedos.length === 2) toque2 = { t0: performance.now() }; return; }
    if (ev.button !== 0 && ev.button !== 1 && ev.pointerType === 'mouse') return;
    arrastreF = { x: ev.clientX, y: ev.clientY, dx: zoomF.dx, dy: zoomF.dy }; movido = false;
  });
  cv.addEventListener('pointermove', ev => {
    const p = ptrs.get(ev.pointerId); if (p) { p.x = ev.clientX; p.y = ev.clientY; }
    const dedos = [...ptrs.values()].filter(q => q.tipo === 'touch');
    if (gesto && dedos.length >= 2) { const [a, b] = dedos, d = Math.hypot(a.x - b.x, a.y - b.y), c = centroDedos(dedos), r = cv.getBoundingClientRect(), I = marcoDe(C.fotos[fotoSel]); if (!I) return;
      const k2 = Math.max(1, Math.min(12, gesto.k0 * (gesto.d0 > 10 ? d / gesto.d0 : 1))); if (Math.abs(d - gesto.d0) > 6 || Math.hypot(c[0] - gesto.c0[0], c[1] - gesto.c0[1]) > 6) { gesto.movio = true; toque2 = null; }
      // el punto de la foto que estaba bajo los dedos sigue bajo los dedos
      const W = cv.parentElement.clientWidth, H = cv.parentElement.clientHeight, s0 = Math.min(W / I.w, H / I.h) * 0.96, sA = s0 * gesto.k0, oxA = (W - I.w * sA) / 2 - I.x0 * sA + gesto.dx0, oyA = (H - I.h * sA) / 2 - I.y0 * sA + gesto.dy0;
      const u = (gesto.c0[0] - r.left - oxA) / sA, v = (gesto.c0[1] - r.top - oyA) / sA, sB = s0 * k2;
      zoomF = { k: k2, dx: (c[0] - r.left - u * sB) - (W - I.w * sB) / 2 + I.x0 * sB, dy: (c[1] - r.top - v * sB) - (H - I.h * sB) / 2 + I.y0 * sB }; pintaFoto(); return; }
    if (!arrastreF) return; const ddx = ev.clientX - arrastreF.x, ddy = ev.clientY - arrastreF.y; if (!movido && Math.hypot(ddx, ddy) < 5) return; movido = true; zoomF.dx = arrastreF.dx + ddx; zoomF.dy = arrastreF.dy + ddy; cv.style.cursor = 'grabbing'; pintaFoto();
  });
  const suelta = ev => {
    ptrs.delete(ev.pointerId); arrastreF = null; cv.style.cursor = '';
    if (gesto && [...ptrs.values()].filter(q => q.tipo === 'touch').length < 2) {
      if (toque2 && !gesto.movio && performance.now() - toque2.t0 < 350) { toque2 = null; if (ptsF.length) { ptsF.pop(); pintaBarraF(); pintaFoto(); toast('↶ Último punto quitado', '', 1500); } }
      gesto = null; movido = true; }
  };
  cv.addEventListener('pointerup', suelta); cv.addEventListener('pointercancel', suelta);
  window.__clonToque = { ptrs, get penVisto() { return penVisto; } };
  cv.addEventListener('dblclick', () => { zoomF = { k: 1, dx: 0, dy: 0 }; pintaFoto(); });
  cv.addEventListener('click', ev => {
    if (movido) { movido = false; return; } // (era un arrastre, no un toque)
    if (penVisto && ultimoTipo === 'touch') return; // con lápiz, los dedos solo mueven la vista (la palma no marca)
    const q = aImg(ev), F = fotosA()[fotoSel]; if (!F) return;
    if (modoF) { ptsF.push(q); if ((modoF === 'calibra' && ptsF.length === 2) || (modoF === 'persp' && ptsF.length === 4)) pintaBarraF(); pintaFoto(); return; }
    const z = zonas.find(z => Math.hypot(z.x - q[0], z.y - q[1]) <= z.r * (ultimoTipo === 'touch' ? 2.2 : 1.3)); if (z) eligeMedida(z.id, true); // (con el dedo, más margen)
  });
  function pintaBarraF() {
    const F = fotosA()[fotoSel], hay = !!F;
    const b = (k, t, f, on, ti) => h('button.clon-b' + (on ? '.on' : ''), { type: 'button', 'data-f': k, title: ti || t, onclick: f, disabled: !hay }, t);
    const filas = [b('marcas', marcas ? '🏷️ Marcas' : '🏷️ Sin marcas', () => { marcas = !marcas; pintaBarraF(); pintaFoto(); }, marcas, 'Enseñar u ocultar las marcas (la foto original no se toca)'),
      b('comparar', '🔍 Comparar con la pieza', () => { comparar = !comparar; pintaBarraF(); pintaFoto(); }, comparar, 'La pieza que sale con tus medidas, en azul encima de la foto'),
      b('calibra', modoF === 'calibra' ? '… toca 2 puntos' : '📏 Calibrar', () => { modoF = modoF === 'calibra' ? null : 'calibra'; ptsF = []; zoomF = { k: 1, dx: 0, dy: 0 }; pintaBarraF(); pintaFoto(); }, modoF === 'calibra', 'Dos puntos de algo que sepas lo que mide (una regla junto a la pieza)'),
      b('persp', modoF === 'persp' ? '… toca 4 esquinas (' + ptsF.length + '/4)' : '⬚ Enderezar', () => { modoF = modoF === 'persp' ? null : 'persp'; ptsF = []; zoomF = { k: 1, dx: 0, dy: 0 }; pintaBarraF(); pintaFoto(); }, modoF === 'persp', 'Foto torcida: 4 esquinas de algo rectangular de medida conocida'),
      F && F.mascara && F.rest ? b('retocar', '🩹 Retocar', retoca, false, 'Opción B: si la línea verde no es la pieza, pinta, borra, usa la varita o marca el contorno a ojo (se pega solo al borde)') : null,
      b('fondo', '✨ Fondo con IA', quitaFondo, !!(F && F.mascara), 'Si el fondo no es liso: la IA de tu PC (BiRefNet) separa la pieza'),
      b('bajar', '⬇️ Foto marcada', bajaMarcada, false, 'Guarda la foto con las marcas (para llevarla al taller o imprimirla)')];
    if (comparar && F) { const aj = C.fotos[F.i].ajuste = Object.assign({ dx: 0, dy: 0, s: 100, a: 0 }, C.fotos[F.i].ajuste || {}), cn = (k, t, paso) => h('label.clon-aj', h('span', t), h('input.inp', { type: 'number', step: paso, value: aj[k], 'data-aj': k, oninput: ev => { aj[k] = Number(ev.target.value) || (k === 's' ? 100 : 0); pintaFoto(); guarda(); } }));
      filas.push(h('div.clon-ajuste', h('small', 'Ajuste fino:'), cn('dx', '↔ px', 1), cn('dy', '↕ px', 1), cn('s', '%', 0.1), cn('a', '°', 0.1), h('button.clon-b', { type: 'button', onclick: () => { C.fotos[F.i].ajuste = { dx: 0, dy: 0, s: 100, a: 0 }; pintaBarraF(); pintaFoto(); guarda(); } }, '↺'))); }
    if (modoF === 'calibra' && ptsF.length === 2) filas.push(h('label.clon-calmm', h('span', 'Mide de verdad'), h('input.inp', { type: 'number', min: 0.1, step: 0.1, 'data-k': 'calmm', 'aria-label': 'Lo que mide de verdad (mm)', onkeydown: ev => { if (ev.key === 'Enter') guardaRef(ev.target.value); } }), h('i', 'mm'), btn('✓', () => guardaRef(raiz.querySelector('[data-k="calmm"]').value), { cls: 'sm primary clon-guardaref' })));
    if (modoF === 'persp' && ptsF.length === 4) filas.push(h('label.clon-calmm', h('span', 'Ancho'), h('input.inp', { type: 'number', min: 1, step: 0.1, 'data-k': 'rectW' }), h('span', 'Alto'), h('input.inp', { type: 'number', min: 1, step: 0.1, 'data-k': 'rectH' }), h('i', 'mm'), btn('⬚ Enderezar', enderezar, { cls: 'sm primary clon-endereza' })));
    mount(barraF, filas);
    const fr = C.fotos[fotoSel]; mount(restP, fr && fr.rest ? FRU.panel(fr.rest, { retocar: retoca, ia: () => cambiaRest({ ia: 'si' }), otra: m => cambiaRest({ forzar: m, ia: 'no' }), original: fotoTalCual, calibrar: () => { modoF = 'calibra'; ptsF = []; zoomF = { k: 1, dx: 0, dy: 0 }; pintaBarraF(); pintaFoto(); } }) : fr && !fr.rest && !fr.mascara ? h('p.clon-rest-no', h('button.frp-link', { type: 'button', 'data-k': 'restaurar-ya', onclick: async () => { if (!fr.original) fr.original = fr.img; await cambiaRest({}); } }, '🩹 Restaurar esta foto'), ' (fondo, sombras, brillos; y ampliarla a la pieza)') : null);
    mount(pista, modoF === 'calibra' ? 'Toca las DOS puntas de algo que conozcas (por ejemplo, 0 y 100 de una regla junto a la pieza). Varias referencias = se ve el error.' : modoF === 'persp' ? 'Toca las 4 esquinas en orden: arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda (de una hoja A4 = 297 × 210, una tarjeta = 85,6 × 54…).' : F ? 'Toca una etiqueta (C1, C2…) para ver qué medir y escribirlo a la derecha. Una foto nunca da la medida exacta: el número lo pone tu calibre.' : '');
  }
  async function guardaRef(v) { const mm = Number(String(v || '').replace(',', '.')); if (!(mm > 0)) return toast('Escribe lo que mide de verdad (mm).', 'warn'); const f = C.fotos[fotoSel]; f.refs = (f.refs || []).concat([{ a: ptsF[0], b: ptsF[1], mm }]); modoF = null; ptsF = []; zoomF = { k: 1, dx: 0, dy: 0 }; const E = FM.calibra(f.refs); toast('📏 Calibrada: 1 px = ' + n2(E.mmPorPx) + ' mm' + (E.n > 1 ? ' · error ' + n2(E.errMax) + ' %' : '') + '. ' + E.aviso, E.errMax > 2 ? 'warn' : 'ok', 8000); guarda(); todo(); }
  async function enderezar() {
    try { const f = C.fotos[fotoSel], W = Number(raiz.querySelector('[data-k="rectW"]').value), H = Number(raiz.querySelector('[data-k="rectH"]').value), deOrig = !!(f.rest && f.original), im = await imagen(deOrig ? f.original : f.img), E = FM.endereza(im, deOrig ? ptsF.map(p => [p[0] / f.rest.k + f.rest.caja[0], p[1] / f.rest.k + f.rest.caja[1]]) : ptsF, W, H);
      const eraRest = !!f.rest; f.img = E.id; delete f.mascara; delete f.rest; f.original = E.id; f.refs = [{ a: [E.cuadro[0], E.cuadro[1]], b: [E.cuadro[2], E.cuadro[1]], mm: W }, { a: [E.cuadro[0], E.cuadro[1]], b: [E.cuadro[0], E.cuadro[3]], mm: H }]; modoF = null; ptsF = []; imCache.clear(); zoomF = { k: 1, dx: 0, dy: 0 };
      if (eraRest) { try { const R = await FRU.restauraImagen(E.id, { ia: 'no' }); Object.assign(f, { img: R.img, mascara: R.mascara, rest: R.rest, refs: FRU.refsA(f.refs, R.rest) }); } catch (e2) { /* enderezada pero sin restaurar: se mide como antes */ } }
      await analiza(f); replan(); guarda(); todo(); toast('⬚ Foto enderezada y calibrada con tu rectángulo. Lo que está a otra altura que el rectángulo puede variar algo.', 'ok', 8000);
    } catch (e) { toast(e.message || String(e), 'bad'); }
  }
  async function quitaFondo() {
    const f = C.fotos[fotoSel]; if (!f) return;
    if (f.rest && f.original) return cambiaRest({ ia: 'si' });
    if (f.mascara) { delete f.mascara; await analiza(f); replan(); guarda(); todo(); return toast('Vuelve a medir sobre la foto tal cual.', 'ok'); }
    const D = await import('../desktop.js').catch(() => null); if (!(D && D.desktop && D.desktop.on && D.desktop.motorFondo)) return toast('Quitar el fondo con IA necesita el programa del PC (BiRefNet). Mientras, usa un fondo liso que contraste.', 'warn', 8000);
    try { toast('✨ Separando la pieza del fondo (BiRefNet, en tu PC)…', '', 4000); const I = FM.IMAGENES.get(f.img), blob = await (await fetch(I.url)).blob(), r = await D.desktop.motorFondo(blob);
      if (!r || !r.ok || !r.mascara) throw new Error((r && r.error) || 'No se ha podido separar la pieza.');
      const im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = rej; x.src = r.mascara; }), M = FM.deImagen(im, 2400, 'image/png');
      f.mascara = M.id; ANAL.delete(M.id); await analiza(f); replan(); guarda(); todo(); toast('✨ Pieza separada del fondo: se mide sobre la silueta que ha sacado la IA. Compruébala con «🔍 Comparar».', 'ok', 7000);
    } catch (e) { toast(e.message || String(e), 'bad', 8000); }
  }
  async function bajaMarcada() { try { await bajaMarcada0(); } catch (e) { toast('No he podido guardar la foto marcada: ' + (e.message || e), 'bad'); } }
  async function bajaMarcada0() {
    const F = fotosA()[fotoSel]; if (!F) return; const im = await imagen(F.img), c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const valores = Object.fromEntries(C.medidas.map(m => [m.id, CL.valorDe(m, fotosA(), C.medidas)])); CL.dibujaMarcas(g, F, C.medidas, { k: Math.max(1, im.naturalWidth / 1200), unidad: unidad(), valores });
    // y la lista debajo, para llevarla en papel
    const mios = C.medidas.filter(m => m.foto === F.i && m.estado !== 'na'), alto = 30 + 26 * mios.length, c2 = document.createElement('canvas'); c2.width = c.width; c2.height = c.height + alto; const g2 = c2.getContext('2d'); g2.fillStyle = '#ffffff'; g2.fillRect(0, 0, c2.width, c2.height); g2.drawImage(c, 0, 0);
    g2.fillStyle = '#1b1b1d'; g2.font = '700 18px system-ui'; g2.fillText('CelebriCLON · ' + C.nombre + ' · ' + (CL.VISTAS[F.vista] || ''), 14, c.height + 22); g2.font = '15px system-ui';
    mios.forEach((m, i) => { const v = valores[m.id]; g2.fillText(m.id + ' · ' + m.nombre + ': ' + (v && v.v != null && v.de !== 'estimada' ? CL.fmt(v.v, unidad()) : '______') + (v && v.de === 'estimada' ? ' (foto ≈ ' + CL.fmt(v.v, unidad()) + ')' : ''), 14, c.height + 48 + i * 26); });
    const nombreF = 'CelebriCLON_' + C.nombre.replace(/[^\w-]+/g, '_') + '_foto' + (F.i + 1) + '_marcada.png', b = await new Promise(res => c2.toBlob(x => res(x), 'image/png'));
    descarga(b || await (await fetch(c2.toDataURL('image/png'))).blob(), nombreF); window.__clonMarcada = nombreF;
  }

  // ---------- la tabla de medidas (derecha) ----------
  function eligeMedida(id, desdeFoto) { medSel = id; const m = C.medidas.find(x => x.id === id); if (m && m.foto !== fotoSel) fotoSel = m.foto; pintaFotos(); pintaFoto(); pintaTabla(); if (desdeFoto) setTimeout(() => { const i = der.querySelector('[data-med="' + id + '"] input[data-k="valor"]'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }, 30); }
  function pintaTabla() {
    const F = fotosA(), U = unidad();
    const filas = C.medidas.map(m => { const v = CL.valorDe(m, F, C.medidas), met = m.grupo && m.grupo.tipo === 'redondo' && v.v ? CL.metricaDe(v.v) : null, foto = F[m.foto];
      const inp = h('input.inp', { type: 'number', min: 0, step: 0.01, 'data-k': 'valor', value: m.valor > 0 ? n2(deMmIn(m.valor)).replace(/\./g, '').replace(',', '.') : '', placeholder: v.de === 'estimada' ? '≈ ' + n2(deMmIn(v.v)) : U, 'aria-label': m.id + ' ' + m.nombre + ' (' + U + ')',
        onfocus: () => { if (medSel !== m.id) { medSel = m.id; pintaFoto(); der.querySelectorAll('.clon-m').forEach(x => x.classList.toggle('on', x.dataset.med === m.id)); } },
        onchange: e => { const x = Number(String(e.target.value).replace(',', '.')); if (x > 0) { m.valor = aMmIn(x); if (m.estado === 'pendiente' || m.estado === 'estimada' || m.estado === 'na') m.estado = 'introducida'; } else { m.valor = null; if (m.estado !== 'na') m.estado = 'pendiente'; } guarda(); todo(); } });
      const inc = h('input.inp.clon-inc', { type: 'number', min: 0, step: 0.01, 'data-k': 'inc', value: m.inc > 0 ? m.inc : '', placeholder: '±', 'aria-label': 'Incertidumbre de ' + m.id, onchange: e => { const x = Number(String(e.target.value).replace(',', '.')); m.inc = x > 0 ? x : null; guarda(); } });
      const est = h('select.inp.clon-estado', { 'data-k': 'estado', 'aria-label': 'Estado de ' + m.id, onchange: e => { m.estado = e.target.value; guarda(); todo(); } }, Object.entries(CL.ESTADOS).filter(([k]) => k !== 'estimada').map(([k, t]) => h('option', { value: k, selected: m.estado === k }, t)));
      const estadoVis = m.estado === 'na' ? 'na' : v.de === 'estimada' ? 'estimada' : m.estado;
      return h('div.clon-m.' + estadoVis + (medSel === m.id ? '.on' : ''), { 'data-med': m.id, onclick: e => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') eligeMedida(m.id); } },
        h('div.clon-m-t', h('span.clon-id', m.id), h('b', m.nombre), m.critica ? h('small.clon-crit', 'imprescindible') : null),
        h('small.clon-m-v', '📷 ' + (foto ? (CL.VISTAS[foto.vista] || '').split(' (')[0] : '') + ' · ' + m.instr),
        h('div.clon-m-in', inp, h('i', U), inc, est),
        v.de === 'estimada' ? h('small.clon-m-e', 'De la foto: ≈ ' + CL.fmt(v.v, U) + ' (±' + CL.fmt(v.inc, U) + ') · ESTIMADA: mídela y escríbela') : null,
        (() => { const cmp = CL.comparaMedida(m, F, C.medidas); if (!cmp) return null; if (cmp.sin) return h('small.clon-m-c', '↔ Foto: no se puede comparar (' + cmp.sin + ')');
          return h('small.clon-m-c' + (cmp.mal ? '.mal' : '.bien'), (cmp.mal ? '⚠️ ' : '✓ ') + 'Foto ≈ ' + CL.fmt(cmp.foto, U) + ' · diferencia ' + (cmp.d >= 0 ? '+' : '') + CL.fmt(cmp.d, U) + ' (' + (cmp.pct >= 0 ? '+' : '') + n2(cmp.pct) + ' %)' + (cmp.mal ? ': NO cuadra con la foto. Revisa la medida o la calibración.' : '')); })(),
        met ? h('small.clon-m-met', '🔩 ' + met.t) : null);
    });
    const pet = [].concat(plan.peticiones || [], ...F.map(f => CL.peticionesFoto(f, C.medidas, F).map(p => Object.assign({ foto: f.i }, p))));
    mount(der, h('div.clon-sec-t', h('b', 'MEDIDAS'), h('small', 'en ' + U)),
      pet.length ? h('div.clon-pet', pet.map(p => h('p', p.tipo === 'foto' ? '📷 ' : p.tipo === 'calibrar' ? '📏 ' : '❓ ', (p.foto != null ? 'Foto ' + (p.foto + 1) + ': ' : ''), p.t))) : null,
      filas.length ? filas : h('p.small.muted', 'Añade la foto de frente: la lista sale sola, pensada para TU pieza.'),
      (plan.deducidas || []).length ? h('details.clon-ded', h('summary', '✅ Lo que NO hace falta medir (' + plan.deducidas.length + ')'), plan.deducidas.map(t => h('p.small', t))) : null);
  }

  // ---------- la pieza (abajo) ----------
  function construye() {
    clearTimeout(tic); tic = setTimeout(async () => {
      if (!vivo) return; if (relOps().on) { try { await preparaRelieve(); } catch (e) { console.warn('relieve', e); } } if (!vivo) return; const F = fotosA();
      { const Pp = F.find(x => x.i === plan.principal); if (Pp && !Pp.analisis) return; } // 13-10 (noche): se está rehaciendo su análisis (quien lo rehace llama a todo() al acabar): se queda la pieza de antes, sin un error de paso
      try { plan.relieve = relOps(); const r = CL.construye(F, plan); pieza = { vista: N.aVista(r.m), dims: r.dims, vol: r.vol, avisos: r.avisos, inciertas: r.inciertas, marcas: r.marcas, sopa: N.aSopa(r.m), relieves: r.relieves, sx: r.sx, sy: r.sy };
        if (escena) { escena.ponPartes([{ id: 'clon', vista: pieza.vista, color: '#7c6cff', acabado: 'mate' }]); escena.encuadrar('iso'); } }
      catch (e) { pieza = { error: e.message || String(e) }; if (escena) escena.ponPartes([]); }
      finally { N.limpia(); }
      pintaInfo(); if (comparar) pintaFoto();
    }, 250);
  }
  // v20.4 · recoger la parte de la pieza (más sitio para la foto); se recuerda
  let recogida = false; try { recogida = localStorage.getItem('cd.clon.recogida') === '1'; } catch (e) { }
  const bRecoge = () => h('button.clon-b.clon-recoge', { type: 'button', title: recogida ? 'Enseñar la pieza 3D' : 'Recoger la pieza 3D (más sitio para la foto)', onclick: () => { recogida = !recogida; try { localStorage.setItem('cd.clon.recogida', recogida ? '1' : '0'); } catch (e) { } raiz.classList.toggle('sin-pieza', recogida); pintaInfo(); setTimeout(pintaFoto, 50); } }, recogida ? '▴ Ver la pieza' : '▾ Recoger');
  function pintaInfo() {
    raiz.classList.toggle('sin-pieza', recogida);
    const U = unidad();
    if (!pieza) return mount(info3, h('p.small.muted', 'La pieza sale aquí cuando haya foto de frente y medidas.'));
    if (pieza.error) return mount(info3, h('div.clon-sec-t', h('b', 'PIEZA'), bRecoge()), h('p.r8e-nota', '🧩 ' + pieza.error));
    const F = fotosA(), V = c => { const m = C.medidas.find(x => x.clave === c); return m ? { m, v: CL.valorDe(m, F, C.medidas) } : null; }, M = pieza.marcas || { agujeros: [] };
    const chk = (t, modelo, c) => { const x = V(c); if (!x || x.v.v == null) return h('span.clon-chk', t + ' ' + CL.fmt(modelo, U)); const ok = Math.abs(modelo - x.v.v) <= 0.02 + 0.001 * x.v.v; return h('span.clon-chk' + (ok ? '.ok' : '.mal'), t + ' ' + CL.fmt(modelo, U) + (ok ? ' = ' : ' ≠ ') + x.m.id + (x.v.de === 'estimada' ? ' (estimada)' : '')); };
    const dAg = [...new Set(M.agujeros.map(a => Math.round(a.d * 100) / 100))];
    const tuyas = C.medidas.filter(m => m.estado === 'introducida' || m.estado === 'verificada').length, est = C.medidas.filter(m => CL.valorDe(m, F, C.medidas).de === 'estimada').length, malas = C.medidas.map(m => CL.comparaMedida(m, F, C.medidas)).filter(c => c && c.mal).length;
    mount(info3, h('div.clon-sec-t', h('b', 'PIEZA'), h('small', pieza.dims.map(x => CL.fmt(x, U)).join(' × ')), bRecoge()),
      h('div.clon-chks', chk('Largo', pieza.dims[0], 'largo'), chk('Ancho', pieza.dims[1], 'ancho'), chk('Alto', pieza.dims[2], 'alto'), dAg.map(d => h('span.clon-chk', 'Ø agujero ' + CL.fmt(d, U)))),
      h('p.small' + (est ? '.clon-est' : ''), 'Hecha con ' + tuyas + ' medida' + (tuyas === 1 ? '' : 's') + ' TUYA' + (tuyas === 1 ? '' : 'S') + (est ? ' y ' + est + ' ESTIMADA' + (est === 1 ? '' : 'S') + ' de la foto: no la des por buena hasta medirlas' : '') + (malas ? ' · ⚠️ ' + malas + ' no cuadra' + (malas === 1 ? '' : 'n') + ' con la foto' : '') + '. Que se parezca a la foto no basta: la prueba es la PROBETA encima de la pieza de verdad.'),
      h('p.small', '≈ ' + n2(pieza.vol / 1000 * 1.24) + ' g en PLA macizo (ESTIMADO) · ' + n2(pieza.vol / 1000) + ' cm³'),
      pieza.avisos.map(t => h('p.r8e-nota.r8e-mal', '⚠️ ' + t)),
      h('details.clon-inc', h('summary', '❔ Lo que no se puede saber por las fotos (' + pieza.inciertas.length + ')'), pieza.inciertas.map(t => h('p.small', t))),
      (() => { const O = relOps(), pide = () => { guarda(); construye(); }, f0 = C.fotos.find((x, i) => i === plan.principal), R0 = f0 ? REL.get(relClave(f0)) : null;
        return h('div.clon-rel' + (O.on ? '.on' : ''), h('label.clon-rel-t', h('input', { type: 'checkbox', checked: O.on, 'data-k': 'rel-on', onchange: e => { O.on = e.target.checked; O.tocado = true; pintaInfo(); pide(); } }), h('b', '🗻 Sacar los relieves de la foto'), h('small', 'letras, dibujos y zonas de otro tono')),
          h('div.clon-ia', btn(iaMirando ? '👀 Mirando…' : '🤖 Que la IA mire la pieza', async () => { if (iaMirando || !f0) return; iaMirando = true; pintaInfo();
            try { const r = await CIA.miraPieza(f0.img); C.iaVe = CIA.fraseDe(r); if (r.modo) { O.on = true; O.modo = r.modo; O.niveles = r.niveles; } toast(C.iaVe + (r.modo ? ' Lo he puesto así; si no acierta, cámbialo abajo.' : ''), 'ok', 9000); }
            catch (e) { toast(e.message || String(e), 'warn', 9000); } finally { iaMirando = false; } if (!vivo) return; pintaInfo(); pide(); }, { cls: 'sm clon-ia-b', disabled: iaMirando, title: 'El modelo que ve imágenes de tu PC mira la foto y dice si el dibujo sale o va grabado y cuántas alturas tiene. Los relieves en sí salen de los tonos de la foto.' }),
            C.iaVe ? h('small.clon-ia-t', C.iaVe) : null),
          O.on ? h('div.clon-rel-o', h('label', h('span', 'Alturas'), h('select.inp', { 'data-k': 'rel-n', onchange: e => { O.niveles = Number(e.target.value); pide(); } }, [[2, '1 (plano + relieve)'], [3, '2 alturas'], [4, '3 alturas']].map(([v, t]) => h('option', { value: v, selected: O.niveles === v }, t)))),
            h('label', h('span', 'Cuánto sale (mm)'), h('input.inp', { type: 'number', min: 0.4, max: 8, step: 0.2, value: O.alto, 'data-k': 'rel-alto', onchange: e => { O.alto = Math.max(0.4, Math.min(8, Number(e.target.value) || 1.2)); pide(); } })),
            h('label', h('span', 'Hacia'), h('select.inp', { 'data-k': 'rel-modo', onchange: e => { O.modo = e.target.value; pide(); } }, [['sale', 'fuera (en relieve)'], ['hundido', 'dentro (grabado)']].map(([v, t]) => h('option', { value: v, selected: O.modo === v }, t)))),
            btn('⬇️ SVG por capas', () => { try { const A = ANAL.get(f0.mascara || f0.img); descarga(new Blob([CL.svgDeRelieve(A, R0, pieza.sx || 1, pieza.sy || 1, { nombre: C.nombre })], { type: 'image/svg+xml' }), nombreArchivo() + '_relieves.svg'); toast('⬇️ SVG en milímetros: el contorno, los agujeros y cada nivel en su capa. Ábrelo en el Boceto (botón «SVG») para retocarlo.', 'ok', 8000); } catch (e) { toast(e.message || String(e), 'bad'); } }, { cls: 'sm clon-svg', title: 'El contorno y cada nivel de relieve, en milímetros, para retocarlo en el Boceto o en Inkscape' })) : null,
          O.on && R0 ? h('p.small.clon-rel-n', R0.plano || !pieza.relieves ? '⚠️ No veo relieves: dentro de la pieza todo tiene casi el mismo tono. Con la luz de lado (que haga sombra) o repasándolo con un lápiz, sale.' : '✅ ' + pieza.relieves + ' nivel' + (pieza.relieves === 1 ? '' : 'es') + ' de relieve (ocupan el ' + Math.round((1 - R0.ocupa[0]) * 100) + ' % de la cara). Sale de los TONOS de la foto; la altura la pones tú.') : null); })(),
      h('div.clon-acc', btn('🧰 Al Estudio', alEstudio, { cls: 'primary clon-estudio' }), btn('📐 Contorno CAD (DXF · SVG)', contornoCAD, { cls: 'clon-cad', title: 'La huella de la pieza a escala real (mm) con sus agujeros, para Fusion, FreeCAD, una cortadora láser o Inkscape. Los agujeros redondos salen como círculos exactos.' }), btn('🧪 Probeta (2 mm)', probeta, { cls: 'clon-probeta', title: 'Una lámina fina con el contorno y los agujeros: se imprime en minutos y la pones encima de la pieza de verdad' }), btn('⬇️ STL', () => baja('stl'), { cls: 'ghost' }), btn('⬇️ 3MF', () => baja('3mf'), { cls: 'ghost' })));
  }
  const nombreArchivo = () => 'CelebriCLON_' + C.nombre.replace(/[^\w-]+/g, '_');
  function mallaFinal() { plan.relieve = relOps(); const r = CL.construye(fotosA(), plan); return r.m; }
  // 13-10-2026 · 📐 la huella de la pieza (con TUS medidas) en DXF y SVG, a escala real (como las apps de foto → CAD)
  async function contornoCAD() { try { const DX = await import('../r8/dxf.js'), m = N.aLaCama(mallaFinal()), A = DX.huella(N, m); N.limpia(); if (!A.length) throw new Error('No hay contorno que sacar.');
      const D = DX.dxf(A), base = nombreArchivo(); descarga(new Blob([D.texto], { type: 'application/dxf' }), base + '_contorno.dxf'); descarga(new Blob([DX.svg(A, { nombre: C.nombre })], { type: 'image/svg+xml' }), base + '_contorno.svg');
      window.__clonCAD = { anillos: A.length, circulos: D.circulos, dxf: D.texto.length, lados: A.map(r => r.length), desv: A.map(r => { const c = DX.comoCirculo(r, 99); return c ? +Math.max(...r.map(p => Math.abs(Math.hypot(p[0] - c.c[0], p[1] - c.c[1]) - c.r))).toFixed(3) : null; }) };
      toast('📐 Contorno en DXF y SVG (mm reales): ' + A.length + ' línea' + (A.length === 1 ? '' : 's') + (D.circulos ? ', ' + D.circulos + ' agujero' + (D.circulos === 1 ? '' : 's') + ' como círculo exacto' : '') + '.', 'ok', 8000); }
    catch (e) { N.limpia(); toast(e.message || String(e), 'bad', 8000); } }
  function alEstudio() { try { const s = N.aSopa(N.aLaCama(mallaFinal())); N.limpia(); if (ext.alEstudioMalla) ext.alEstudioMalla(s, C.nombre); toast('🧰 En el Estudio como pieza. Si cambias una medida aquí, vuelve a mandarla (la de aquí es la que manda).', 'ok', 7000); } catch (e) { N.limpia(); toast(e.message, 'bad'); } }
  async function baja(tipo) {
    try { const m = N.aLaCama(mallaFinal()), CPR = await import('../r8/calibracion.js'), L0 = [{ m, color: '#7c6cff', nombre: C.nombre }], L = MESA ? MESA.expande(L0) : L0, X = tipo === '3mf' ? CPR.paraImprimir(L, null) : null, blob = tipo === 'stl' ? N.stl(L.length > 1 ? N.union(L.map(p => p.m)) : m, C.nombre) : N.tresMF(X.partes, C.nombre, X.ajustes); /* v30: con sus copias */ N.limpia(); descarga(blob, nombreArchivo() + '.' + tipo); if (X && X.aplicada) toast('🎯 3MF con tu calibración «' + X.aplicada + '»', 'ok', 4000); }
    catch (e) { N.limpia(); toast(e.message, 'bad'); }
  }
  async function probeta() {
    try { const m0 = N.aLaCama(mallaFinal()), alto = Math.min(2, N.caja(m0).dims[2]), lam = m0.intersect(N.MF().cube([2000, 2000, alto], true).translate([0, 0, alto / 2]));
      const A = await import('../r8/consejos3d.js'), CPR = await import('../r8/calibracion.js'), X = CPR.paraImprimir([{ m: lam, color: '#00a4e4', nombre: 'Probeta ' + C.nombre }], Object.assign(A.claves({ acabado: 'equilibrado', uso: 'encaje', soporte: 'no', balsa: 'no' }), { wall_loops: '3', sparse_infill_density: '100%', sparse_infill_pattern: 'zig-zag' })), blob = N.tresMF(X.partes, 'Probeta_' + C.nombre, X.ajustes); N.limpia();
      const D = await import('../desktop.js').catch(() => null);
      if (D && D.desktop && D.desktop.on && D.desktop.bambuAbrir) { const r = await D.desktop.bambuAbrir(blob, 'Probeta_' + C.nombre); toast(r && r.abierto ? '🧪 Probeta abierta en Bambu Studio (tus perfiles no se tocan): elige tu impresora y tu filamento. Ponla encima de la pieza de verdad: agujeros y contorno tienen que coincidir.' : '📦 Guardada en ' + (r && r.path), 'ok', 12000); }
      else { descarga(blob, 'Probeta_' + nombreArchivo() + '.3mf'); toast('🧪 Probeta descargada: ábrela en Bambu Studio. Ponla encima de la pieza de verdad: agujeros y contorno tienen que coincidir.', 'ok', 9000); }
      window.__clonProbeta = blob.size;
    } catch (e) { N.limpia(); toast(e.message, 'bad'); }
  }
  function descarga(blob, nombre) { if (!(blob instanceof Blob)) blob = new Blob([blob], { type: /\.stl$/i.test(nombre) ? 'model/stl' : 'application/octet-stream' }); const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); }

  function pintaTodoFoto() { pintaFotos(); pintaBarraF(); pintaFoto(); pintaTabla(); }
  function todo() { pintaCab(); pintaTodoFoto(); construye(); }
  const ro = window.ResizeObserver ? new ResizeObserver(() => pintaFoto()) : null; if (ro) ro.observe(cv.parentElement);
  centro.appendChild(velo);
  const gancho = window.__clon = { retoca, cambiaRest, fotoTalCual, get restaurar() { return restaurar; }, set restaurar(v) { restaurar = !!v; }, get C() { return C; }, get plan() { return plan; }, get pieza() { return pieza; }, eligeMedida, añadeFotos, fotosA, todo, aPantalla: (u, v) => { const r = cv.getBoundingClientRect(), f = C.fotos[fotoSel]; if (f && f.rest) { u = (u - f.rest.caja[0]) * f.rest.k; v = (v - f.rest.caja[1]) * f.rest.k; } return { x: r.left + vistaF.ox + u * vistaF.s, y: r.top + vistaF.oy + v * vistaF.s }; }, /* (u, v: píxeles de la foto que se subió) */
    aPantallaR: (u, v) => { const r = cv.getBoundingClientRect(); return { x: r.left + vistaF.ox + u * vistaF.s, y: r.top + vistaF.oy + v * vistaF.s };  }, /* (u, v: píxeles de la foto de trabajo) */ get zonas() { return zonas; }, get fotoSel() { return fotoSel; }, get vistaF() { return vistaF; }, get ptsF() { return ptsF; } }; // (para las pruebas)
  await arranca();
  return { usaFoto: f => añadeFotos([f]), tieneFoto: () => !!(ES.fotoCompartida() && FOTOS_SUBIDAS.has(ES.fotoCompartida())), destroy() { vivo = false; clearTimeout(tic); if (ro) ro.disconnect(); try { MESA && MESA.destruir(); escena && escena.destruir(); } catch (e) { } if (C && C.fotos.length) guardaClon(C).catch(() => { }); if (window.__clon === gancho) delete window.__clon; } }; // (el gancho solo se quita si sigue siendo el MÍO: con dos aperturas seguidas, la que se cerraba le borraba el suyo a la nueva)
}
