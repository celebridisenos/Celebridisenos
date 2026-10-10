// ================= v20 · ✨ CelebriR8 · DISEÑADOR IA (texto → pieza editable) =================
// «Una función top que funcione con IA y que pocos tengan» (la dueña, 9-10-2026). Le describes la pieza con palabras y la
// IA de TU PC (Qwen 3, sin internet) la construye pieza a pieza delante de ti: no es una malla «mágica» que no se puede
// tocar, son CUERPOS del Estudio (caja, cilindro, texto, huecos, diseños del catálogo…) con sus medidas, que luego cambias
// con números como cualquier otro. Si la IA no está (móvil sin el PC, o sin modelo), lo entiende el propio programa
// buscando en el catálogo.
import { h, mount, btn, toast } from '../ui.js';
import * as N from './nucleo.js';
import { COLORES } from './escena3d.js';

const FORMAS = 'caja{x,y,z,radio,redondeo} · cilindro{d,h,lados} · esfera{d} · semiesfera{d} · cono{d,d2,h} · piramide{base,h,lados} · tubo{d,interior,h} · toro{d,grueso} · prisma{lados,d,h} · estrella{puntas,d,interior(%),h} · corazon{ancho,h} · cuna{x,y,z} · texto{txt,fuente(gorda|redonda|cursiva|clasica|estrecha),alto,h} · rosca{d,paso,h}';
const EJEMPLOS = ['Un llavero de corazón con el nombre Lucía', 'Una maceta de gato de 10 cm', 'Un portalápices hexagonal con estrellas caladas', 'Una caja de 8 × 6 × 4 cm con un agujero redondo en la tapa', 'Un jarrón retorcido de 18 cm', 'Un posavasos con mi nombre: Ana'];
const ESQUEMA = { type: 'object', properties: { nombre: { type: 'string' }, cuerpos: { type: 'array', items: { type: 'object', properties: {
  forma: { type: 'string' }, diseno: { type: 'string' }, nombre: { type: 'string' }, medidas: { type: 'object' }, x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' },
  giro: { type: 'array', items: { type: 'number' } }, hueco: { type: 'boolean' }, color: { type: 'string' } }, required: ['forma'] } } }, required: ['cuerpos'] };
const COLOR = Object.fromEntries(COLORES.map(([hex, t]) => [t.toLowerCase(), hex]).concat([['rosa', '#f55a9b'], ['morado', '#5e43b7'], ['violeta', '#5e43b7'], ['celeste', '#00a4e4'], ['oro', '#c9a227'], ['plateado', '#b8bec4']]));
const colorDe = c => { if (!c) return null; c = String(c).trim().toLowerCase(); if (/^#[0-9a-f]{6}$/.test(c)) return c; return COLOR[c] || COLOR[c.replace(/o$/, '')] || null; };

function prompt(catalogo) {
  const cat = Object.entries(catalogo.DISENOS).filter(([, d]) => d.cat !== 'componentes').map(([k, d]) => k + ': ' + d.t + ' (' + (d.campos || []).filter(c => !c.img).slice(0, 5).map(c => c.k + (c.ops ? '=' + c.ops.map(o => o[0]).slice(0, 4).join('|') : '')).join(', ') + ')').join('\n');
  return 'Eres el diseñador 3D de CelebriR8 (impresión 3D). Conviertes lo que pide la dueña en una lista de CUERPOS en milímetros.\n' +
    'Reglas: Z hacia arriba; cada forma se apoya sobre su base y está centrada en su x,y. x,y,z = dónde va el centro de su base. giro = [gx,gy,gz] en grados.\n' +
    'Formas básicas y sus medidas: ' + FORMAS + '.\n' +
    '«hueco»: true = se RESTA de lo que toca (agujeros, vaciados, letras grabadas). Colores en español (rojo, azul, rosa, negro, blanco, dorado…).\n' +
    'Si hay un DISEÑO del catálogo que encaja con lo que pide, usa forma "catalogo", "diseno" = su clave y "medidas" con sus parámetros (en mm). Catálogo:\n' + cat + '\n' +
    'COORDENADAS: x,y se cuentan desde el CENTRO de la pieza (0,0). Una caja de 80 de ancho va de x=-40 a x=40: «en el centro» es x=0, y=0; «cerca del borde de arriba» de un círculo de 30 es y=10.\n' +
    'MUY IMPORTANTE: incluye TODO lo que pide (agujeros, textos, tapas, asas…). Un agujero = un cilindro con "hueco": true que atraviese (h más alta que la pieza y z = -1). Un texto encima de una pieza va con z = la altura de esa pieza. Un llavero lleva siempre su agujero de 4 mm cerca del borde. «interior» de la estrella va en % (40 = puntas marcadas).\n' +
    'Ejemplos:\n' +
    '«llavero de corazón con el nombre Ana» → {"nombre":"Llavero Ana","cuerpos":[{"forma":"corazon","medidas":{"ancho":40,"h":3},"color":"rosa"},{"forma":"texto","medidas":{"txt":"Ana","fuente":"cursiva","alto":9,"h":1.2},"z":3,"color":"blanco"},{"forma":"cilindro","medidas":{"d":4,"h":10},"y":13,"z":-1,"hueco":true}]}\n' +
    '«maceta de gato de 10 cm» → {"nombre":"Maceta gatito","cuerpos":[{"forma":"catalogo","diseno":"macetaAnimal","medidas":{"animal":"gato","d":100,"h":90}}]}\n' +
    '«caja de 8 x 6 x 4 cm» → {"nombre":"Caja","cuerpos":[{"forma":"caja","medidas":{"x":80,"y":60,"z":40,"radio":4}},{"forma":"caja","medidas":{"x":76,"y":56,"z":40,"radio":2},"z":2,"hueco":true}]}\n' +
    '«placa de 10 x 5 cm con dos agujeros de tornillo» → {"nombre":"Placa","cuerpos":[{"forma":"caja","medidas":{"x":100,"y":50,"z":4,"radio":3}},{"forma":"cilindro","medidas":{"d":4.4,"h":6},"x":-38,"z":-1,"hueco":true},{"forma":"cilindro","medidas":{"d":4.4,"h":6},"x":38,"z":-1,"hueco":true}]}\n' +
    '«soporte de móvil con el nombre Ana» → {"nombre":"Soporte Ana","cuerpos":[{"forma":"catalogo","diseno":"soporteMovil","medidas":{"txt":"Ana"}}]}\n' +
    'Responde SOLO con el JSON. Medidas realistas para una impresora de 256 mm.';
}
// la respuesta (JSON de la IA) → cuerpos del Estudio, con todo comprobado y dentro de límites
export function aCuerpos(j, catalogo) {
  const L = (j && Array.isArray(j.cuerpos) ? j.cuerpos : []).slice(0, 24), out = [], num = (v, d, a, b) => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? Math.max(a, Math.min(b, x)) : d; };
  L.forEach((c, i) => {
    const forma = String(c.forma || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), med = c.medidas && typeof c.medidas === 'object' ? c.medidas : {};
    const t = { pos: [num(c.x, 0, -300, 300), num(c.y, 0, -300, 300), num(c.z, 0, -50, 300)], rot: Array.isArray(c.giro) ? [0, 1, 2].map(k => num(c.giro[k], 0, -360, 360)) : [0, 0, 0], esc: [1, 1, 1] };
    const base = { nombre: String(c.nombre || '').slice(0, 40), t, hueco: !!c.hueco, color: colorDe(c.color) || ['#7c6cff', '#f55a9b', '#00a4e4', '#00ae42', '#ff6a13'][i % 5], acabado: 'mate' };
    const clave = catalogo.DISENOS[c.diseno] ? c.diseno : Object.keys(catalogo.DISENOS).find(k => k.toLowerCase() === forma.replace(/[^a-z0-9]/g, '')) || null;
    if (forma === 'catalogo' || clave) {
      const k = clave; if (!k) return; const v = catalogo.valores(k);
      (catalogo.DISENOS[k].campos || []).forEach(f => { if (med[f.k] === undefined) return; if (f.ops) { if (f.ops.some(o => o[0] === String(med[f.k]))) v[f.k] = String(med[f.k]); } else if (f.chk) v[f.k] = !!med[f.k]; else if (f.txt) v[f.k] = String(med[f.k]).slice(0, 40); else if (!f.img) v[f.k] = num(med[f.k], v[f.k], f.min, f.max); });
      out.push(Object.assign(base, { tipo: 'cat', nombre: base.nombre || catalogo.DISENOS[k].t, p: Object.assign(v, { k }), color: colorDe(c.color) || catalogo.DISENOS[k].color || base.color })); return;
    }
    const F = N.FORMAS3D[forma]; if (!F) return;
    const p = Object.assign({}, F.p); Object.keys(p).forEach(k => { if (med[k] === undefined) return; if (typeof p[k] === 'number') p[k] = num(med[k], p[k], 0, 600); else if (typeof p[k] === 'boolean') p[k] = !!med[k]; else p[k] = String(med[k]).slice(0, 40); });
    out.push(Object.assign(base, { tipo: forma, nombre: base.nombre || F.t, p }));
  });
  return out;
}
// sin IA: busca en el catálogo por palabras y coge la primera medida que digas
export function sinIA(frase, catalogo) {
  const VACIAS = new Set(['una', 'uno', 'unos', 'unas', 'con', 'para', 'que', 'del', 'las', 'los', 'por', 'mas', 'muy', 'sin', 'como', 'quiero', 'hazme', 'haz', 'necesito', 'cm', 'mm']);
  const raiz = w => w.length > 4 ? w.slice(0, -1) : w.replace(/[aeo]s?$/, ''); // gato → gat (casa con «gatito»), macetas → maceta
  const f = String(frase || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), pal = f.split(/[^a-z0-9ñ]+/).filter(w => w.length > 2 && !VACIAS.has(w) && !/^\d+$/.test(w)).map(raiz);
  let mejor = null, nota = 0;
  Object.entries(catalogo.DISENOS).forEach(([k, d]) => { const txt = (d.t + ' ' + d.d + ' ' + d.cat + ' ' + (d.campos || []).map(c => (c.ops || []).map(o => o[1]).join(' ')).join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); let n = 0; pal.forEach(w => { if (txt.includes(w)) n += w.length > 4 ? 2 : 1; else if (txt.includes(w.replace(/s$/, ''))) n += 1; }); if (n > nota) { nota = n; mejor = k; } });
  if (!mejor || nota < 2) return null;
  const D = catalogo.DISENOS[mejor], v = catalogo.valores(mejor), m = f.match(/(\d+(?:[.,]\d+)?)\s*(cm|mm|centimetros|milimetros)/);
  if (m) { const mm = Number(m[1].replace(',', '.')) * (/^c/.test(m[2]) ? 10 : 1), c = (D.campos || []).find(x => x.u === 'mm' && !x.ops && !x.chk && !x.txt); if (c) v[c.k] = Math.max(c.min, Math.min(c.max, mm)); }
  (D.campos || []).forEach(c => { if (c.ops) c.ops.forEach(o => { const w = String(o[1]).toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(' ').pop() || ''; if (w.length > 2 && pal.some(q => q.length >= 2 && w.startsWith(q))) v[c.k] = o[0]; }); }); // «oso» elige «Osito»
  const nombre = (f.match(/(?:nombre|que ponga|con el nombre de|pone)\s+([a-zñ]+)/) || [])[1]; if (nombre) { const c = (D.campos || []).find(x => x.txt); if (c) v[c.k] = nombre[0].toUpperCase() + nombre.slice(1); }
  return { nombre: D.t, cuerpos: [{ tipo: 'cat', nombre: D.t, p: Object.assign(v, { k: mejor }), t: { pos: [0, 0, 0], rot: [0, 0, 0], esc: [1, 1, 1] }, color: D.color || '#7c6cff', acabado: D.acabado || 'mate' }], sinIA: true };
}
async function pideIA(frase, catalogo, avance) {
  const d = await import('../desktop.js'), M = await import('../ai/models.js'), st = await M.localStatus().catch(() => ({ disponible: false }));
  const msgs = [{ role: 'system', content: prompt(catalogo) }, { role: 'user', content: frase }];
  if (d.desktop.on && st.disponible) {
    let txt = '';
    await d.desktop.iaChat({ model: st.modelo, messages: msgs, stream: true, think: false, format: ESQUEMA, keep_alive: '30m', options: { temperature: 0.2, num_ctx: 8192, num_predict: 1400 } }, ch => { const c = ch.message && ch.message.content; if (c) { txt += c; avance(txt.length); } });
    return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  }
  const E = await import('../ai/engine.js'); const txt = await E.write(msgs[0].content + '\n\nPetición: «' + frase + '»', { onToken: t => avance(t.length) });
  return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
}
// el panel (en la columna de la derecha del Estudio)
export function panel(el, o) {
  const frase = h('textarea.inp.ia-frase', { rows: 3, maxlength: 400, placeholder: 'Descríbelo como se lo dirías a una persona: «una maceta de gato de 12 cm, rosa», «un llavero de estrella con el nombre Hugo»…' }), estado = h('div.ia-estado'), pasos = h('div.ia-pasos');
  const hazlo = async t => {
    if (t) frase.value = t; const q = frase.value.trim(); if (!q) return frase.focus();
    mount(estado, h('div.ia-pensando', h('span.r8e-anillo'), h('b', '✨ Diseñando…'), h('small', 'La IA de tu PC está pensando las piezas')));
    let j = null, porIA = true;
    try { j = await pideIA(q, o.catalogo, n => { const s = estado.querySelector('small'); if (s) s.textContent = 'Escribiendo el diseño… (' + n + ' letras)'; }); }
    catch (e) { porIA = false; console.warn('IA', e); }
    let cuerpos = porIA && j ? aCuerpos(j, o.catalogo) : [];
    if (!cuerpos.length) { const r = sinIA(q, o.catalogo); if (r) { cuerpos = r.cuerpos; j = r; porIA = false; } }
    if (!cuerpos.length) { mount(estado, h('p.r8e-mal', '🤔 No he sabido hacerlo. Prueba a decirlo de otra forma, o con medidas («de 10 cm»).')); return; }
    mount(estado, h('div.ia-hecho', h('b', porIA ? '✨ La IA lo ha diseñado con ' + cuerpos.length + ' pieza' + (cuerpos.length > 1 ? 's' : '') : '🔎 Lo he encontrado en el catálogo'), h('small', porIA ? 'Ahora todo es editable: toca cada pieza y cambia sus medidas.' : 'La IA no está disponible ahora mismo; he buscado el diseño que más se parece.')));
    mount(pasos, cuerpos.map(c => h('div.ia-paso', h('span', c.hueco ? '◐' : '●'), h('b', c.nombre), h('small', c.tipo === 'cat' ? 'del catálogo' : Object.entries(c.p).filter(([, v]) => typeof v === 'number').slice(0, 3).map(([k, v]) => k + ' ' + v).join(' · ')))));
    window.__r8ia = { porIA, n: cuerpos.length, tipos: cuerpos.map(c => c.tipo === 'cat' ? 'cat:' + c.p.k : c.tipo) };
    o.alConstruir(cuerpos, j && j.nombre);
  };
  mount(el, h('div.r8e-prop-t', h('b', '✨ DISEÑADOR IA')), h('p.small', 'Dime qué quieres y lo construyo pieza a pieza. Luego lo cambias todo con números.'), frase,
    h('div.r8e-btns', btn('✨ Diséñalo', () => hazlo(), { cls: 'primary ia-ok' })), h('div.ia-ej', EJEMPLOS.map(x => h('button', { type: 'button', onclick: () => hazlo(x) }, x))), estado, pasos,
    h('p.tiny.muted', 'Usa la IA de tu PC (sin internet). En el móvil o el iPad, la hace el PC del taller si está encendido.'));
  setTimeout(() => frase.focus(), 50);
}
