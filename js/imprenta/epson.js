// ================= 26-11-2026 · 🖨️ IMPRENTA · LA EPSON ET-2860: perfiles de impresión, papel por su nombre y comprobar antes =================
// Lo pidió Biou («quiero implementar esto y que se vea bien») con los ajustes que la Claude del portátil probó en papel («ha quedado
// excelente», según su texto; aquí NO se ha impreso nada: se ha comprobado con el controlador real de la torre, sin papel).
// Puro (se prueba con node) salvo panelImpresion(), que pinta la tarjeta de elegir papel. Ids = los de SU controlador (PrintTicket).
//
//   1. Perfil por defecto «Foto brillante · Alta» y otro «Normal · Estándar» para borradores. El papel se elige por su nombre en español.
//   2. Antes de imprimir, se valida con el controlador (POST /local/imprenta/validar): si cambia algo, se para y se dice qué.
//   3. Si pone papel de foto, NUNCA se manda como papel normal (psk:Plain): los negros salen grises (ya pasó).
//   4. Tamaño real: la hoja se pinta a 600 ppp (A4 = 4961 × 7016 px) y se coloca a su tamaño en mm; nunca «ajustar a la página».

export const IMPRESORA = 'EPSON ET-2860 Series';             // la cola buena (la «EPSONACA312 (ET-2860 Series)» es la WSD duplicada)
export const NS_EPSON = 'http://schema.epson.net/printschema/business/v100'; // ns0000
export const MARGEN_FISICO = 3;                              // mm que no pinta (controlador de la torre: origen 3 mm; el portátil dijo 2,8)

// Papeles por su nombre en español (el del paquete). «especial» = papel con capa (foto, mate…): nunca se manda como papel normal.
export const PAPELES = Object.freeze([
  { id: 'foto_brillante', t: 'Papel fotográfico brillante', tipo: 'ns0000:EpsonPhotoPaperGlossy', especial: true, color: '#00A6A6' },
  { id: 'normal', t: 'Papel normal', tipo: 'psk:Plain', especial: false, color: '#F6F5F2' },
  { id: 'foto_mate', t: 'Papel fotográfico mate', tipo: 'psk:PhotographicMatte', especial: true, color: '#8A8F98' },
  { id: 'foto_premium', t: 'Papel fotográfico brillante premium', tipo: 'psk:PhotographicHighGloss', especial: true, color: '#4A6FA5' },
  { id: 'foto_ultra', t: 'Papel fotográfico ultra brillante', tipo: 'psk:HighResolution', especial: true, color: '#7B61C9' },
  { id: 'foto_satinado', t: 'Papel fotográfico satinado', tipo: 'psk:PhotographicSemiGloss', especial: true, color: '#C9A227' },
  { id: 'calidad_foto', t: 'Papel de calidad fotográfica (inyección)', tipo: 'psk:Bond', especial: true, color: '#E0922F' }
]);
export const CALIDADES = Object.freeze([
  { id: 'ns0000:Draft', t: 'Borrador' }, { id: 'ns0000:Standard', t: 'Estándar' },
  { id: 'ns0000:StandardVivid', t: 'Estándar vívida' }, { id: 'ns0000:HighQuality', t: 'Alta' }
]);
// Hojas (mm). 600 ppp → píxeles = round(mm / 25,4 × 600)
export const HOJAS = Object.freeze([
  { id: 'psk:ISOA4', t: 'A4', w: 210, h: 297 }, { id: 'psk:ISOA5', t: 'A5', w: 148, h: 210 }, { id: 'psk:ISOA6', t: 'A6', w: 105, h: 148 },
  { id: 'ns0000:Fullsize4x6', t: '10 × 15 cm', w: 101.6, h: 152.4 }, { id: 'psk:NorthAmerica5x7', t: '13 × 18 cm', w: 127, h: 177.8 }
]);

const NOTA_PROBADO = 'Probado en papel por la Claude del portátil el 26-11 («ha quedado excelente», según su texto). En la torre: comprobado con el controlador, sin papel.';
export const PERFILES = Object.freeze([
  Object.freeze({ id: 'foto_alta', t: 'Foto brillante · Alta', papel: 'foto_brillante', calidad: 'ns0000:HighQuality', hoja: 'psk:ISOA4', color: 'psk:Color', sinBordes: 'psk:None', dpi: 600, porDefecto: true, para: 'Lo bueno: tarjetas, pegatinas y recortables', nota: NOTA_PROBADO }),
  Object.freeze({ id: 'normal_estandar', t: 'Normal · Estándar', papel: 'normal', calidad: 'ns0000:Standard', hoja: 'psk:ISOA4', color: 'psk:Color', sinBordes: 'psk:None', dpi: 300, porDefecto: false, para: 'Borradores para mirar medidas', nota: 'Para borradores en papel normal. Comprobado con el controlador, sin papel.' })
]);

const de = (lista, id) => lista.find(x => x.id === id) || null;
export const papel = id => de(PAPELES, id);
export const papelDeTipo = tipo => PAPELES.find(p => p.tipo === tipo) || null;
export const calidad = id => de(CALIDADES, id);
export const hoja = id => de(HOJAS, id);
export const perfil = id => de(PERFILES, id) || perfilPorDefecto();
export const perfilPorDefecto = () => PERFILES.find(p => p.porDefecto);
export const nombreTipo = tipo => (papelDeTipo(tipo) || { t: tipo }).t;
export const nombreCalidad = id => (calidad(id) || { t: id }).t;
export const nombreHoja = id => (hoja(id) || { t: id }).t;

// Tamaño en píxeles de la hoja a «dpi» (A4 a 600 → 4961 × 7016). Se coloca después a su tamaño en mm: nunca se estira para «llenar».
export function pixelesHoja(hojaId, dpi = 600) {
  const h = hoja(hojaId); if (!h) throw new Error('Hoja que la Epson no tiene: ' + hojaId);
  return { w: Math.round(h.w / 25.4 * dpi), h: Math.round(h.h / 25.4 * dpi), wmm: h.w, hmm: h.h, dpi };
}

// Lo que se manda al host (validar e imprimir). «papelCargado» = el papel que Biou dice que ha puesto en la bandeja.
export function ticketDe(p, o = {}) {
  const pp = papel(p.papel); if (!pp) throw new Error('Papel desconocido: ' + p.papel);
  if (!calidad(p.calidad)) throw new Error('Calidad que la Epson no tiene: ' + p.calidad);
  const hh = hoja(p.hoja || 'psk:ISOA4'); if (!hh) throw new Error('Hoja que la Epson no tiene: ' + p.hoja);
  const copias = Math.max(1, Math.min(20, Math.round(Number(o.copias) || 1)));
  return { printer: o.printer || IMPRESORA, papel: hh.id, wmm: hh.w, hmm: hh.h, tipo: pp.tipo, calidad: p.calidad, color: p.color === 'psk:Monochrome' ? 'mono' : 'color', copias, papelCargado: o.papelCargado || p.papel };
}

// Antes de nada (sin hablar con la impresora): ¿el papel puesto casa con el perfil? → { ok, bloqueos: [texto], avisos: [texto] }
export function revisarAntes(p, papelCargadoId) {
  const bloqueos = [], avisos = [], pp = papel(p.papel), cargado = papel(papelCargadoId || p.papel);
  if (!pp) bloqueos.push('Ese papel no está en la lista de la Epson.');
  if (!cargado) bloqueos.push('No sé qué papel has puesto en la bandeja.');
  if (pp && cargado && cargado.especial && pp.tipo === 'psk:Plain') bloqueos.push('Has puesto ' + cargado.t.toLowerCase() + ' y el perfil es de papel normal: así los negros salen grises. Elige «Foto brillante · Alta».');
  if (pp && cargado && !cargado.especial && pp.especial) avisos.push('El perfil es de ' + pp.t.toLowerCase() + ' y dices que has puesto papel normal: la tinta tardará en secar y puede correrse.');
  if (pp && cargado && pp.id !== cargado.id && cargado.especial && pp.especial) avisos.push('El perfil es de ' + pp.t.toLowerCase() + ' pero has puesto ' + cargado.t.toLowerCase() + '.');
  return { ok: bloqueos.length === 0, bloqueos, avisos };
}

// Lee la respuesta del controlador (POST validar) y dice en español sencillo si se puede imprimir.
//   r = { aceptado: { papel, tipo, calidad, color, copias }, cambios: ['papel'|'tipo'|'calidad'|'color'|'copias'|'… (no ofrecido)'] }
export function leerValidacion(ticket, r) {
  const a = (r && r.aceptado) || {}, cambios = (r && r.cambios) || [], textos = [];
  const pon = (que, pedido, quedo, nombre) => textos.push(que + ': pediste «' + nombre(pedido) + '» y la Epson pondría «' + (quedo ? nombre(quedo) : 'nada') + '»');
  if (cambios.includes('tipo') || a.tipo !== ticket.tipo) pon('Papel', ticket.tipo, a.tipo, nombreTipo);
  if (cambios.includes('calidad') || a.calidad !== ticket.calidad) pon('Calidad', ticket.calidad, a.calidad, nombreCalidad);
  if (cambios.includes('papel') || a.papel !== ticket.papel) pon('Hoja', ticket.papel, a.papel, nombreHoja);
  if (cambios.includes('color') || a.color !== ticket.color) pon('Color', ticket.color, a.color, v => v === 'mono' ? 'blanco y negro' : v === 'color' ? 'color' : String(v));
  if (cambios.includes('copias') || Number(a.copias) !== Number(ticket.copias)) pon('Copias', ticket.copias, a.copias, String);
  cambios.filter(c => /no ofrecid/.test(c)).forEach(c => textos.push('La Epson no ofrece: ' + c.replace(/ \(no ofrecid[oa]\)/, '')));
  const cargado = papel(ticket.papelCargado), foto = cargado ? cargado.especial : (papelDeTipo(ticket.tipo) || {}).especial;
  const fotoComoNormal = !!foto && a.tipo === 'psk:Plain';
  if (fotoComoNormal) textos.unshift('¡Ojo! Saldría como PAPEL NORMAL en papel de foto: los negros salen grises.');
  const ok = textos.length === 0;
  return { ok, fotoComoNormal, textos, titulo: ok ? 'La Epson lo acepta tal cual' : 'La Epson cambiaría algo: no imprimo', aceptado: a };
}

// Comprueba con la Epson (sin imprimir). api.validar(cuerpo) → respuesta del host (POST /local/imprenta/validar).
export async function comprobarConEpson(api, p, o = {}) {
  const t = ticketDe(p, o), antes = revisarAntes(p, t.papelCargado);
  if (!antes.ok) return { ok: false, antes, textos: antes.bloqueos, titulo: 'Así no se imprime', ticket: t };
  let r; try { r = await api.validar(t); } catch (e) { return { ok: false, antes, textos: ['No he podido hablar con la Epson: ' + (e && e.message || e)], titulo: 'No sé si la Epson lo acepta', ticket: t, sinRespuesta: true }; }
  const v = leerValidacion(t, r); return Object.assign(v, { antes, ticket: t, avisos: antes.avisos });
}

// ---------- La tarjeta para elegir el papel (pantalla) ----------
const CSS = `
.imp-ep{color:#1F2328;font-family:Inter,Manrope,system-ui,sans-serif;max-width:760px}
.imp-ep h3{font-size:18px;margin:0 0 10px}
.imp-ep-perfiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.imp-ep-perfil{border:3px solid transparent;border-radius:16px;padding:14px 16px;text-align:left;font:inherit;cursor:pointer;display:flex;flex-direction:column;gap:6px;min-height:118px;color:#1F2328}
.imp-ep-perfil.on{border-color:#1F2328;box-shadow:0 0 0 3px #fff inset}
.imp-ep-perfil b{font-size:19px}.imp-ep-perfil span{font-size:13px}
.imp-ep-perfil .imp-ep-def{align-self:flex-start;background:#1F2328;color:#F6F5F2;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.imp-ep-fila{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0 6px;font-size:14px;font-weight:600}
.imp-ep-fila select{font:inherit;padding:8px 10px;border:1px solid #8A8F98;border-radius:10px;background:#fff;min-width:260px}
.imp-ep-perfil:not(.on){box-shadow:0 0 0 1px #D9D6CF inset}
.imp-ep-btn{border:0;border-radius:12px;padding:11px 18px;font:inherit;font-weight:800;cursor:pointer;background:#1F2328;color:#F6F5F2}
.imp-ep-btn[disabled]{opacity:.35;cursor:default}
.imp-ep-res{border-radius:12px;padding:10px 14px;margin:10px 0;font-size:14px;border-left:6px solid #8A8F98;background:#F6F5F2}
.imp-ep-res.ok{border-left-color:#00A6A6;background:#E3F6F6}
.imp-ep-res.mal{border-left-color:#C0392B;background:#FBE9E7}
.imp-ep-res b{display:block;font-size:15px;margin-bottom:4px}
.imp-ep-res ul{margin:4px 0 0 18px;padding:0}
.imp-ep-aviso{background:#FFF3DC;border-left:6px solid #E0922F;border-radius:12px;padding:8px 12px;font-size:13px;margin:8px 0}
`;
// el: donde se pinta · api: { validar(cuerpo) } · o: { perfilId, papelCargado, alCambiar(perfil, papelCargadoId) }
export async function panelImpresion(el, api, o = {}) {
  const { h, mount } = await import('../ui.js');
  if (!document.getElementById('imp-ep-css')) { const s = document.createElement('style'); s.id = 'imp-ep-css'; s.textContent = CSS; document.head.appendChild(s); }
  const S = { p: perfil(o.perfilId), cargado: o.papelCargado || perfil(o.perfilId).papel, res: null, ocupado: false };
  const avisa = () => o.alCambiar && o.alCambiar(S.p, S.cargado);
  const pinta = () => {
    const tarjetas = PERFILES.map(p => { const pp = papel(p.papel);
      return h('button.imp-ep-perfil' + (p.id === S.p.id ? '.on' : ''), { type: 'button', style: { background: pp.color }, onclick: () => { S.p = p; S.cargado = p.papel; S.res = null; avisa(); pinta(); } },
        p.porDefecto ? h('span.imp-ep-def', 'Por defecto') : null, h('b', p.t), h('span', pp.t + ' · calidad ' + nombreCalidad(p.calidad).toLowerCase() + ' · ' + nombreHoja(p.hoja)), h('span', p.para)); });
    const selCargado = h('select', { onchange: e => { S.cargado = e.target.value; S.res = null; avisa(); pinta(); } },
      PAPELES.map(pp => { const op = h('option', { value: pp.id }, pp.t); if (pp.id === S.cargado) op.selected = true; return op; }));
    const antes = revisarAntes(S.p, S.cargado);
    const caja = S.res ? h('div.imp-ep-res' + (S.res.ok ? '.ok' : '.mal'), h('b', S.res.titulo), S.res.textos.length ? h('ul', S.res.textos.map(t => h('li', t))) : h('span', 'Papel, calidad, hoja y color: como los pediste.')) : null;
    mount(el, h('div.imp-ep',
      h('h3', '¿Con qué papel imprimes?'), h('div.imp-ep-perfiles', tarjetas),
      h('label.imp-ep-fila', 'Papel que has puesto en la bandeja:', selCargado),
      antes.bloqueos.map(t => h('div.imp-ep-res.mal', h('b', 'Así no se imprime'), t)), antes.avisos.map(t => h('div.imp-ep-aviso', t)),
      h('div.imp-ep-fila', h('button.imp-ep-btn', { type: 'button', disabled: S.ocupado || !antes.ok, onclick: async () => { S.ocupado = true; pinta(); S.res = await comprobarConEpson(api, S.p, { papelCargado: S.cargado }); S.ocupado = false; pinta(); } }, S.ocupado ? 'Preguntando a la Epson…' : 'Comprobar con la Epson (no gasta papel)')),
      caja));
  };
  pinta(); return { perfil: () => S.p, papelCargado: () => S.cargado, ultimo: () => S.res };
}
