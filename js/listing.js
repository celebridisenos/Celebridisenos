// ================= v11.3 · Asistente de anuncios (servidor + app) =================
// ANALIZAR → DETECTAR → CORREGIR LO SEGURO → COMPLETAR → REVALIDAR → … → RESULTADO FINAL:
//   «listo» (LISTO PARA PUBLICAR) · «requiere_datos» (REQUIERE TU CONFIRMACIÓN) · «no_apto» (NO APTO PARA ESTA PLATAFORMA)
// Regla de oro: NUNCA se inventa un dato. Lo que no está en la ficha o no lo has escrito tú queda PENDIENTE.
// Lo que «parece» una foto es INFERENCIA VISUAL, nunca un dato. Si dos fuentes no coinciden: POSIBLE CONFLICTO.
// Las reglas de cada plataforma (límites, quién lo hizo…) son DATOS editables en Configuración → Anuncios,
// con la fecha y la fuente de la última revisión: cuando la plataforma cambie, se cambian ahí, sin tocar código.
// ES5 puro (lo usan Google Apps Script y el navegador).

var LST = (function () {
  function s(v) { return v === null || v === undefined ? '' : String(v); }
  function norm(v) { return s(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function has(v) { return s(v).replace(/\s/g, '') !== ''; }
  function uniq(a) { var seen = {}, out = []; a.forEach(function (x) { var k = norm(x); if (k && !seen[k]) { seen[k] = 1; out.push(x); } }); return out; }
  function cap(t) { t = s(t).trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  // ---------- Campos posibles de un producto ----------
  var CAMPOS = {
    marca: 'Marca', modelo: 'Modelo', condicion: 'Estado del artículo', color: 'Color', colores: 'Colores disponibles', talla: 'Talla', tallas: 'Tallas disponibles',
    material: 'Material', medidas: 'Medidas', peso: 'Peso (g)', voltaje: 'Voltaje', corriente: 'Corriente', potencia: 'Potencia', accesorios: 'Qué incluye',
    uso: 'Uso', metodo: 'Cómo se fabrica', gramos: 'Gramos de filamento', horas: 'Horas de impresión', acabado: 'Acabado', personalizacion: 'Personalización',
    epoca: 'Época (solo si se sabe)', origen: 'Origen', cantidad: 'Cantidad disponible', contenido: 'Contenido del paquete', compatibilidad: 'Compatibilidad',
    certificaciones: 'Certificaciones', garantia: 'Garantía', anio: 'Año', caracteristicas: 'Características'
  };
  // ---------- Biblioteca de categorías (cada una con SUS campos). Ampliable desde Configuración ----------
  // req = obligatorios para publicar · campos = los que se muestran · kw = palabras para reconocerla
  var CATEGORIAS = [
    { k: 'hogar', t: 'Hogar', campos: ['material', 'color', 'medidas', 'peso', 'uso', 'metodo'], req: ['material', 'medidas'], kw: 'hogar casa' },
    { k: 'decoracion', t: 'Decoración', campos: ['material', 'color', 'medidas', 'peso', 'uso', 'metodo', 'acabado'], req: ['material', 'medidas'], kw: 'decor decoracion jarron florero maceta figura cuadro adorno escultura' },
    { k: 'iluminacion', t: 'Iluminación', campos: ['material', 'color', 'medidas', 'voltaje', 'potencia', 'accesorios', 'metodo'], req: ['material', 'medidas', 'voltaje'], kw: 'lampara luz iluminacion led bombilla flexo' },
    { k: 'cocina', t: 'Cocina', campos: ['material', 'color', 'medidas', 'uso', 'certificaciones'], req: ['material', 'medidas'], kw: 'cocina mesa cubierto vaso taza plato soporte papel especiero' },
    { k: 'bano', t: 'Baño', campos: ['material', 'color', 'medidas', 'uso'], req: ['material', 'medidas'], kw: 'bano toalla jabon cepillo ducha' },
    { k: 'organizacion', t: 'Organización', campos: ['material', 'color', 'medidas', 'uso', 'contenido'], req: ['material', 'medidas'], kw: 'organizador caja cajon soporte estanteria colgador' },
    { k: 'oficina', t: 'Oficina y escritorio', campos: ['material', 'color', 'medidas', 'uso'], req: ['material', 'medidas'], kw: 'oficina escritorio boligrafo lapicero portalapices soporte movil' },
    { k: 'impresion3d', t: 'Impresión 3D', campos: ['material', 'color', 'medidas', 'gramos', 'horas', 'acabado', 'personalizacion', 'metodo'], req: ['material', 'medidas'], kw: 'impreso 3d pla petg resina' },
    { k: 'electronica', t: 'Electrónica', campos: ['marca', 'modelo', 'voltaje', 'corriente', 'potencia', 'medidas', 'condicion', 'accesorios', 'compatibilidad'], req: ['marca', 'modelo', 'condicion'], kw: 'electronica cable cargador motor arduino placa sensor' },
    { k: 'mecanica', t: 'Mecánica', campos: ['material', 'medidas', 'compatibilidad', 'condicion'], req: ['medidas'], kw: 'engranaje rodamiento eje pieza recambio tornillo' },
    { k: 'hobby', t: 'Hobby y modelismo', campos: ['material', 'color', 'medidas', 'contenido', 'personalizacion'], req: ['medidas'], kw: 'maqueta modelismo miniatura hobby tablero juego' },
    { k: 'manualidades', t: 'Manualidades', campos: ['material', 'color', 'medidas', 'contenido'], req: ['material'], kw: 'manualidad craft molde plantilla' },
    { k: 'coleccionables', t: 'Coleccionables', campos: ['marca', 'condicion', 'anio', 'medidas', 'origen', 'contenido'], req: ['condicion'], kw: 'coleccion coleccionable figura edicion' },
    { k: 'juguetes', t: 'Juguetes y juegos', campos: ['material', 'color', 'medidas', 'uso', 'certificaciones'], req: ['material', 'medidas'], kw: 'juguete juego llavero fidget' },
    { k: 'ropa', t: 'Ropa', campos: ['talla', 'tallas', 'color', 'material', 'medidas', 'condicion', 'marca'], req: ['talla', 'material', 'condicion'], kw: 'camiseta sudadera ropa prenda pantalon chaqueta hoodie' },
    { k: 'accesorios', t: 'Accesorios', campos: ['material', 'color', 'medidas', 'condicion', 'marca'], req: ['material'], kw: 'accesorio llavero pendiente pulsera collar gorra bolso' },
    { k: 'herramientas', t: 'Herramientas', campos: ['marca', 'modelo', 'condicion', 'accesorios', 'medidas'], req: ['marca', 'condicion'], kw: 'herramienta llave destornillador taladro' },
    { k: 'vintage', t: 'Vintage', campos: ['epoca', 'condicion', 'material', 'origen', 'medidas'], req: ['epoca', 'condicion'], kw: 'vintage antiguo retro' },
    { k: 'personalizados', t: 'Personalizados', campos: ['material', 'color', 'medidas', 'personalizacion', 'metodo'], req: ['material', 'personalizacion'], kw: 'personalizado nombre personalizable grabado' },
    { k: 'otros', t: 'Otros', campos: ['material', 'color', 'medidas', 'condicion'], req: [], kw: '' }
  ];
  // ---------- Qué es el artículo (quién lo hizo). Decide qué plataforma lo admite ----------
  var TIPOS = [
    { k: 'disenado_fabricado', t: 'Diseño mío y lo fabrico yo (impresora 3D, láser…)', hecho: 'yo', diseno: 'yo' },
    { k: 'fabricado', t: 'Lo fabrico yo con un diseño de otra persona (con licencia)', hecho: 'yo', diseno: 'otro' },
    { k: 'hecho_mano', t: 'Hecho a mano por mí', hecho: 'yo', diseno: 'yo' },
    { k: 'personalizado', t: 'Personalizado por mí', hecho: 'yo', diseno: 'yo' },
    { k: 'disenado_socio', t: 'Diseño mío, lo fabrica un socio de producción', hecho: 'socio', diseno: 'yo' },
    { k: 'segunda_mano', t: 'Segunda mano (usado)', hecho: 'otro', diseno: 'otro' },
    { k: 'vintage', t: 'Vintage (20 años o más, confirmado)', hecho: 'otro', diseno: 'otro' },
    { k: 'reacondicionado', t: 'Reacondicionado', hecho: 'otro', diseno: 'otro' },
    { k: 'coleccionable', t: 'Coleccionable', hecho: 'otro', diseno: 'otro' },
    { k: 'suministro', t: 'Material o suministro para manualidades', hecho: 'otro', diseno: 'otro' },
    { k: 'nuevo_reventa', t: 'Nuevo, comprado para revender', hecho: 'otro', diseno: 'otro' },
    { k: 'otro', t: 'Otro', hecho: '', diseno: '' }
  ];
  var CONDICIONES = ['Nuevo', 'Nuevo con etiquetas', 'Como nuevo', 'Muy bueno', 'Bueno', 'Aceptable', 'Para piezas'];
  // ---------- Reglas de cada plataforma (valores por defecto, editables en Configuración → Anuncios) ----------
  var PLATAFORMAS = {
    etsy: { t: 'Etsy', tituloMax: 140, etiquetasMax: 13, etiquetaMaxLen: 20, descMax: 10000, fotosMin: 1, materialesMax: 13,
      admite: { disenado_fabricado: 'Hecho por el vendedor', fabricado: 'Hecho por el vendedor', hecho_mano: 'Hecho por el vendedor', personalizado: 'Hecho por el vendedor', disenado_socio: 'Diseñado por el vendedor (socio de producción)', vintage: 'Seleccionado por el vendedor (vintage)', suministro: 'Conseguido por el vendedor (suministro)' },
      noAdmite: { segunda_mano: 'Etsy no admite artículos de segunda mano que no sean vintage (20 años o más).', nuevo_reventa: 'Etsy no admite revender artículos comerciales comprados.', reacondicionado: 'Etsy no admite artículos reacondicionados comerciales.', coleccionable: 'Etsy solo admite coleccionables si son vintage (20 años o más) o los haces tú.' },
      fuente: 'etsy.com/legal/creativity y límites de anuncio (revisado 10-2026)', revisado: '2026-10-02' },
    wallapop: { t: 'Wallapop', tituloMax: 50, etiquetasMax: 0, descMax: 0, fotosMin: 1, admite: '*', noAdmite: {}, fuente: 'valores de la app (revísalos en Wallapop si cambian)', revisado: '2026-10-02' },
    vinted: { t: 'Vinted', tituloMax: 60, etiquetasMax: 0, descMax: 0, fotosMin: 1, admite: '*', noAdmite: {}, fuente: 'valores de la app (revísalos en Vinted si cambian)', revisado: '2026-10-02' },
    general: { t: 'General (tienda propia / otras)', tituloMax: 120, etiquetasMax: 15, etiquetaMaxLen: 30, descMax: 0, fotosMin: 1, admite: '*', noAdmite: {}, fuente: '', revisado: '' }
  };
  function rules(plat, cfg) {
    var base = PLATAFORMAS[plat] || PLATAFORMAS.general, o = {}, k;
    for (k in base) o[k] = base[k];
    var c = cfg && cfg.plataformas && cfg.plataformas[plat];
    if (c) for (k in c) if (c[k] !== '' && c[k] !== null && c[k] !== undefined) o[k] = c[k];
    return o;
  }
  function categories(cfg) { return CATEGORIAS.concat((cfg && cfg.categoriasExtra) || []); }
  // ---------- Afirmaciones que NO se pueden poner sin pruebas (se quitan solas) ----------
  var CLAIMS = [
    { re: /\b(100\s?%\s?original|original de f[aá]brica|aut[eé]ntic[oa]s?|oficial(es)?|licencia oficial|producto oficial)\b/gi, why: 'afirma autenticidad u oficialidad sin pruebas', need: 'oficial' },
    { re: /\b(garant[ií]a( de por vida)?|garantizad[oa]s?)\b/gi, why: 'promete una garantía que no está en los datos', need: 'garantia' },
    { re: /\b(certificad[oa]s?|homologad[oa]s?|apto para alimentos|food ?safe|libre de bpa)\b/gi, why: 'dice que tiene una certificación que no está en los datos', need: 'certificaciones' },
    { re: /\b(ecol[oó]gic[oa]s?|biodegradables?|sostenibles?|eco-?friendly)\b/gi, why: 'afirmación ambiental sin pruebas', need: 'eco' },
    { re: /\b(el mejor|la mejor|n[uú]mero 1|n[º°]\s?1|top ventas|best ?seller)\b/gi, why: 'superlativo que no se puede demostrar', need: 'nunca' },
    { re: /\b100\s?%(\s?(original|real|garantizad[oa]|natural|puro|pura))?/gi, why: 'porcentaje que no está en los datos', need: 'dato' },
    { re: /\b(env[ií]o gratis|env[ií]o gratuito)\b/gi, why: 'promete envío gratis sin estar configurado', need: 'envioGratis' },
    { re: /\b(hecho a mano|handmade|artesanal(es)?)\b/gi, why: 'dice «hecho a mano» y el tipo de artículo no lo es', need: 'mano' }
  ];
  // Marcas y personajes protegidos (lista ampliable en Configuración → Anuncios). Detectarlos NO es acusar: es pedir revisión.
  var MARCAS = ['nike', 'adidas', 'puma', 'jordan', 'disney', 'pixar', 'marvel', 'dc comics', 'star wars', 'harry potter', 'hogwarts', 'pokemon', 'pikachu', 'nintendo', 'mario', 'zelda', 'sonic', 'lego', 'barbie', 'hello kitty', 'sanrio',
    'mickey', 'minnie', 'frozen', 'spiderman', 'spider-man', 'batman', 'superman', 'naruto', 'one piece', 'luffy', 'dragon ball', 'goku', 'minecraft', 'fortnite', 'roblox', 'among us', 'stranger things', 'game of thrones', 'apple', 'iphone',
    'samsung', 'playstation', 'xbox', 'coca-cola', 'nba', 'nfl', 'fifa', 'uefa', 'real madrid', 'fc barcelona', 'barca', 'atletico de madrid', 'gillette', 'ikea', 'louis vuitton', 'gucci', 'chanel', 'supreme', 'bambu lab', 'pantone', 'kinder', 'nutella', 'ferrari', 'porsche', 'lamborghini', 'bmw', 'mercedes'];
  // Licencias de diseños descargados que NO permiten vender lo impreso
  var LIC_NO_COMERCIAL = /(\bnc\b|non[- ]?commercial|no comercial|personal use|uso personal|standard digital file license|sdfl|all rights reserved|todos los derechos)/i;
  var LIC_ATRIBUCION = /(\bcc[- ]?by\b|creative commons attribution|atribuci[oó]n)/i;

  function catOf(input, cfg) {
    var cats = categories(cfg), want = norm(input.categoriaAnuncio || input.categoria) + ' ' + norm(input.subcategoria);
    var byK = cats.filter(function (c) { return want.indexOf(norm(c.t)) >= 0 || want.split(' ').indexOf(c.k) >= 0; })[0];
    if (byK) return { cat: byK, origen: input.categoriaAnuncio ? 'usuario' : 'producto' };
    var text = norm([input.nombre, input.categoria, input.subcategoria, input.descripcion].join(' ')), best = null, bestN = 0;
    cats.forEach(function (c) { var nHits = (c.kw || '').split(' ').filter(function (w) { return w && text.indexOf(w) >= 0; }).length; if (nHits > bestN) { bestN = nHits; best = c; } });
    return best ? { cat: best, origen: 'sugerida' } : { cat: cats.filter(function (c) { return c.k === 'otros'; })[0], origen: 'sugerida' };
  }
  function medidasTxt(f) {
    var a = [f.largo, f.ancho, f.alto].filter(has);
    if (a.length === 3) return a.join(' × ') + ' cm';
    return has(f.medidas) ? s(f.medidas) : '';
  }
  // ---------- Hechos: SOLO lo que dice la ficha o lo que tú has escrito ----------
  function facts(input) {
    var e = input.entrada || {}, out = {}, origen = {}, conflictos = [];
    function put(k, v, o) { if (has(v)) { out[k] = s(v).trim(); origen[k] = o; } }
    // de la ficha del producto
    put('nombre', input.nombre, 'producto'); put('material', input.material, 'producto'); put('color', input.color, 'producto');
    put('medidas', input.tamano, 'producto'); put('peso', input.pesoG, 'producto'); put('tallas', input.tallas, 'producto'); put('horas', input.horas, 'producto');
    put('descripcionBase', input.descripcion, 'producto');
    // de lo que escribes en el asistente (manda sobre la ficha, pero si NO coincide es POSIBLE CONFLICTO)
    Object.keys(CAMPOS).concat(['nombre', 'largo', 'ancho', 'alto']).forEach(function (k) {
      if (!has(e[k])) return;
      if (has(out[k]) && norm(out[k]) !== norm(e[k]) && k !== 'medidas') conflictos.push({ campo: k, a: out[k], aOrigen: 'ficha del producto', b: s(e[k]), bOrigen: 'lo que has escrito ahora' });
      put(k, e[k], 'usuario');
    });
    var m = medidasTxt(e);
    if (m) {
      var dig = function (x) { return (s(x).match(/\d+(?:[.,]\d+)?/g) || []).join('|'); };
      if (has(out.medidas) && origen.medidas === 'producto' && dig(out.medidas) && dig(out.medidas) !== dig(m)) conflictos.push({ campo: 'medidas', a: out.medidas, aOrigen: 'ficha del producto', b: m, bOrigen: 'lo que has escrito ahora' });
      out.medidas = m; origen.medidas = 'usuario';
    }
    return { v: out, origen: origen, conflictos: conflictos };
  }
  // ---------- Textos (solo con hechos) ----------
  function buildTitle(F, r, cat, tipo) {
    var v = F.v, parts = [cap(v.nombre)], max = r.tituloMax || 140;
    var extra = [];
    if (v.material && norm(v.nombre).indexOf(norm(v.material)) < 0) extra.push(v.material);
    if (v.color && norm(v.nombre).indexOf(norm(v.color)) < 0) extra.push(v.color);
    if (tipo === 'personalizado' || has(v.personalizacion)) extra.push('personalizable');
    if (v.medidas && /\d/.test(v.medidas)) extra.push(v.medidas);
    if (cat && cat.k !== 'otros' && norm(v.nombre).indexOf(norm(cat.t)) < 0 && extra.length < 3) extra.push(cat.t.toLowerCase());
    var keep = [];
    extra.forEach(function (x) { var t = parts[0] + ' - ' + keep.concat([x]).join(', '); if (t.length <= max) keep.push(x); });
    return keep.length ? parts[0] + ' - ' + keep.join(', ') : parts[0];
  }
  function shortDesc(F, cat, tipo) {
    var v = F.v, bits = [];
    var what = cap(v.nombre);
    var how = { disenado_fabricado: 'Diseño original', fabricado: 'Fabricado', hecho_mano: 'Hecho a mano', personalizado: 'Personalizado', disenado_socio: 'Diseño original', segunda_mano: 'Artículo de segunda mano', vintage: 'Artículo vintage', reacondicionado: 'Artículo reacondicionado' }[tipo];
    bits.push(what + '.');
    var det = [v.material ? 'en ' + v.material : '', v.color ? 'color ' + v.color.toLowerCase() : ''].filter(Boolean).join(', ');
    if (how || det) bits.push((how || 'Fabricado') + (det ? ' ' + det : '') + '.');
    if (has(v.uso)) bits.push('Ideal para ' + v.uso.replace(/\.$/, '') + '.');
    if (has(v.personalizacion)) bits.push('Se puede personalizar: ' + v.personalizacion.replace(/\.$/, '') + '.');
    return bits.join(' ');
  }
  function longDesc(F, cat, tipo, envio, extraLines) {
    var v = F.v, sec = [];
    var intro = has(v.descripcionBase) ? v.descripcionBase : shortDesc(F, cat, tipo);
    sec.push(['Descripción', intro]);
    if (has(v.caracteristicas)) sec.push(['Características', s(v.caracteristicas).split(/\n|;/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return '• ' + x; }).join('\n')]);
    var mat = [v.material ? 'Material: ' + v.material : '', v.acabado ? 'Acabado: ' + v.acabado : '', v.color ? 'Color: ' + v.color : '', v.colores ? 'Colores disponibles: ' + v.colores : ''].filter(Boolean);
    if (mat.length) sec.push(['Materiales', mat.join('\n')]);
    var med = [v.medidas ? 'Medidas: ' + v.medidas : '', v.peso ? 'Peso: ' + v.peso + ' g' : '', v.tallas ? 'Tallas: ' + v.tallas : '', v.talla ? 'Talla: ' + v.talla : ''].filter(Boolean);
    if (med.length) sec.push(['Medidas', med.join('\n')]);
    var tech = [v.marca ? 'Marca: ' + v.marca : '', v.modelo ? 'Modelo: ' + v.modelo : '', v.voltaje ? 'Voltaje: ' + v.voltaje : '', v.corriente ? 'Corriente: ' + v.corriente : '', v.potencia ? 'Potencia: ' + v.potencia : '', v.compatibilidad ? 'Compatibilidad: ' + v.compatibilidad : ''].filter(Boolean);
    if (tech.length) sec.push(['Datos técnicos', tech.join('\n')]);
    if (has(v.condicion) || ['segunda_mano', 'vintage', 'reacondicionado', 'coleccionable'].indexOf(tipo) >= 0) sec.push(['Estado', has(v.condicion) ? v.condicion : 'PENDIENTE: indica el estado del artículo']);
    if (has(v.accesorios) || has(v.contenido)) sec.push(['Qué incluye', [v.contenido, v.accesorios].filter(has).join('\n')]);
    // v11.3.1: el texto habla del PRODUCTO (cómo está hecho), nunca de quién lo hizo («fabricado por nosotros», «he creado»…)
    var metodo = has(v.metodo) ? 'Fabricación: ' + v.metodo : '';
    var made = { disenado_fabricado: ['Diseño original', metodo].filter(Boolean).join('\n'), fabricado: metodo, hecho_mano: 'Hecho a mano', personalizado: 'Personalizado', disenado_socio: 'Diseño original, fabricado con un socio de producción' }[tipo];
    if (made || has(v.origen)) sec.push(['Fabricación', [made, has(v.origen) ? 'Origen: ' + v.origen : ''].filter(Boolean).join('\n')]);
    if (has(v.personalizacion)) sec.push(['Personalización', v.personalizacion]);
    if (envio && (envio.preparacion || envio.notas)) sec.push(['Envío', [envio.preparacion ? 'Se prepara en ' + envio.preparacion + ' día(s) laborables.' : '', envio.notas || ''].filter(Boolean).join('\n')]);
    if (extraLines && extraLines.length) sec.push(['Importante', extraLines.join('\n')]);
    return sec.map(function (x) { return x[0].toUpperCase() + '\n' + x[1]; }).join('\n\n');
  }
  function tagsFor(F, cat, tipo, r) {
    var v = F.v, t = [];
    var low = function (x) { return s(x).toLowerCase().replace(/[^a-z0-9áéíóúüñ ]/g, ' ').replace(/\s+/g, ' ').trim(); };
    var name = low(v.nombre).split(' ').filter(function (w) { return w.length > 2 && ['para', 'con', 'del', 'los', 'las', 'una', 'uno'].indexOf(norm(w)) < 0; });
    if (name.length >= 2) t.push(name.slice(0, 3).join(' '));
    name.forEach(function (w) { t.push(w); });
    if (v.material) t.push(low(v.material)); if (v.color) t.push(low(v.color)); if (cat) t.push(low(cat.t));
    if (has(v.uso)) t.push(low(v.uso));
    if (tipo === 'personalizado' || has(v.personalizacion)) t.push('personalizado');
    if (['disenado_fabricado', 'fabricado'].indexOf(tipo) >= 0 && /impres|3d|pla|petg/.test(norm([v.metodo, v.material, cat && cat.k].join(' ')))) t.push('impresión 3d');
    if (tipo === 'vintage') t.push('vintage'); if (tipo === 'segunda_mano') t.push('segunda mano');
    var max = r.etiquetaMaxLen || 30;
    return uniq(t.map(function (x) { return x.trim(); }).filter(function (x) { return x && x.length <= max; }));
  }
  // Quita de un texto lo que NO se puede afirmar con los datos; devuelve {texto, quitado:[…]}
  function cleanClaims(text, F, tipo, ctx) {
    var quit = [], out = s(text);
    CLAIMS.forEach(function (c) {
      var allowed = (c.need === 'mano' && (tipo === 'hecho_mano')) || (c.need === 'garantia' && has(F.v.garantia)) || (c.need === 'certificaciones' && has(F.v.certificaciones)) ||
        (c.need === 'envioGratis' && ctx && ctx.envioGratis) || (c.need === 'oficial' && ctx && ctx.licenciaMarca === 'si');
      if (allowed) return;
      var facts = norm(JSON.stringify(F.v));
      out = out.replace(c.re, function (m) { if (facts.indexOf(norm(m)) >= 0) return m; quit.push({ texto: m, porque: c.why }); return ''; });
    });
    // v11.3.1: frases sobre QUIÉN lo hizo («he creado este…», «fabricado por nosotros»): se quita la frase entera.
    // Si la propia ficha lo dice con esas palabras, se respeta.
    var factsAll = norm(JSON.stringify(F.v));
    out = out.replace(/[^.!?\n]*\b(?:(?:he|hemos)\s+(?:cread[oa]|fabricad[oa]|diseñad[oa]|disenad[oa]|hech[oa]|impres[oa])|(?:cread|fabricad|diseñad|disenad|hech|impres|personalizad)[oa]s?\s+(?:por\s+(?:nosotr[oa]s|m[ií])|(?:yo|nosotr[oa]s)\s+mism[oa]s?))\b[^.!?\n]*[.!?]?/gi, function (m) {
      if (factsAll.indexOf(norm(m).trim()) >= 0) return m;
      quit.push({ texto: m.trim(), porque: 'habla de quién lo hizo en vez de describir el producto' }); return '';
    });
    out = out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').replace(/,\s*,/g, ',').replace(/\(\s*\)/g, '').replace(/-\s*$/, '').trim();
    return { texto: out, quitado: quit };
  }
  // Números del texto que no salen de los datos → posibles datos inventados
  function strayNumbers(text, F, extra) {
    var allowed = norm(JSON.stringify(F.v) + ' ' + s(extra)), out = [];
    (s(text).match(/\d+(?:[.,]\d+)?/g) || []).forEach(function (n) { if (allowed.indexOf(n) < 0 && allowed.indexOf(n.replace(',', '.')) < 0 && allowed.indexOf(n.replace('.', ',')) < 0) out.push(n); });
    return uniq(out);
  }
  function brandsIn(text, cfg) {
    var list = MARCAS.concat((cfg && cfg.marcasExtra) || []), t = ' ' + norm(text).replace(/[^a-z0-9ñ\- ]/g, ' ') + ' ';
    return uniq(list.filter(function (b) { return t.indexOf(' ' + norm(b) + ' ') >= 0; }));
  }
  function titleFix(t, r) {
    var out = s(t).replace(/\s+/g, ' ').trim(), notes = [];
    // palabras repetidas seguidas o repetidas en el título
    var words = out.split(' '), seen = {}, kept = [];
    words.forEach(function (w) { var k = norm(w).replace(/[^a-z0-9ñ]/g, ''); if (k.length > 3 && seen[k]) { notes.push('Quitada la palabra repetida «' + w + '»'); return; } seen[k] = 1; kept.push(w); });
    out = kept.join(' ');
    if (out === out.toUpperCase() && /[A-Z]{4}/.test(out)) { out = cap(out.toLowerCase()); notes.push('Título en mayúsculas pasado a normal'); }
    out = out.replace(/[!¡]{2,}|[?¿]{2,}/g, '').replace(/[☀-➿\uD83C-􏰀-\uDFFF]/g, '').replace(/\s+/g, ' ').trim();
    if (r.tituloMax && out.length > r.tituloMax) { var cut = out.slice(0, r.tituloMax + 1); cut = cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : r.tituloMax).replace(/[\s,\-–·]+$/, ''); notes.push('Título recortado a ' + r.tituloMax + ' caracteres (límite de la plataforma)'); out = cut; }
    return { titulo: out, notas: notes };
  }

  // ================= EL BUCLE =================
  // input: datos del producto (+ entrada: lo que la persona escribe en el asistente; + imagenes; + coste; + visual; + textos propuestos)
  // opts: { plataforma, cfg (cfg.anuncios), envioCfg {preparacion}, stock }
  function analyze(input, opts) {
    opts = opts || {};
    var plat = opts.plataforma || 'etsy', cfgA = opts.cfg || {}, r = rules(plat, cfgA), e = input.entrada || {};
    var F = facts(input), tipo = e.tipo || '', C = catOf(input, cfgA), cat = C.cat;
    var problemas = [], correcciones = [], log = [];
    var P = function (nivel, campo, texto, queHacer) { if (!problemas.some(function (p) { return p.texto === texto; })) problemas.push({ nivel: nivel, campo: campo || '', texto: texto, queHacer: queHacer || '' }); };
    var L = {
      plataforma: plat, plataformaT: r.t, reglas: { tituloMax: r.tituloMax, etiquetasMax: r.etiquetasMax, etiquetaMaxLen: r.etiquetaMaxLen, fuente: r.fuente, revisado: r.revisado },
      categoria: cat.t, categoriaK: cat.k, categoriaOrigen: C.origen, tipo: tipo, sku: s(input.sku), cantidad: has(e.cantidad) ? e.cantidad : (opts.stock !== undefined && opts.stock !== null ? opts.stock : ''),
      atributos: [], variantes: [], fotos: (input.imagenes || []).length, envio: {}, precio: {}, campos: {}, visual: [], conflictos: F.conflictos.slice()
    };
    // ---- textos: los propuestos (IA o tú) o los generados con hechos ----
    L.titulo = has(e.titulo) ? s(e.titulo) : buildTitle(F, r, cat, tipo);
    L.descCorta = has(e.descCorta) ? s(e.descCorta) : shortDesc(F, cat, tipo);
    var envio = { preparacion: has(e.preparacion) ? e.preparacion : (opts.envioCfg && opts.envioCfg.preparacion) || '', notas: s(e.envioNotas) };
    var extras = [];
    if (e.disenoIA === true || e.disenoIA === 'si') extras.push('Este diseño se ha creado con ayuda de herramientas de inteligencia artificial.');
    L.descripcion = has(e.descripcion) ? s(e.descripcion) : longDesc(F, cat, tipo, envio, extras);
    L.etiquetas = Array.isArray(e.etiquetas) && e.etiquetas.length ? e.etiquetas.slice() : tagsFor(F, cat, tipo, r);
    // ---- atributos de SU categoría ----
    cat.campos.forEach(function (k) {
      var v = F.v[k] !== undefined ? F.v[k] : (k === 'gramos' && has(input.gramos) ? s(input.gramos) : '');
      var req = (cat.req || []).indexOf(k) >= 0;
      L.atributos.push({ k: k, t: CAMPOS[k] || k, v: has(v) ? v : '', origen: has(v) ? (F.origen[k] || 'producto') : 'pendiente', obligatorio: req });
    });
    // ---- variantes (solo si hay varias opciones escritas) ----
    [['colores', 'Color'], ['tallas', 'Talla']].forEach(function (x) { var v = F.v[x[0]]; if (has(v) && /[,/;]/.test(v)) L.variantes.push({ nombre: x[1], opciones: v.split(/[,/;]/).map(function (o) { return o.trim(); }).filter(Boolean) }); });
    // ---- envío ----
    L.envio = { pesoArticulo: F.v.peso || '', pesoPaquete: has(e.pesoPaquete) ? e.pesoPaquete : '', medidasPaquete: has(e.medidasPaquete) ? e.medidasPaquete : (input.caja ? input.caja : ''), embalaje: input.embalaje || '', preparacion: envio.preparacion, perfil: s(e.perfilEnvio), destino: s(e.destino), coste: has(e.costeEnvio) ? e.costeEnvio : '' };
    // ---- precio: SOLO de los costes o de lo que tú escribas ----
    var cost = input.coste || {};
    L.precio = { coste: cost.coste === undefined ? null : cost.coste, costeEstado: cost.estado || '', equilibrio: cost.equilibrio === undefined ? null : cost.equilibrio, objetivo: cost.objetivo === undefined ? null : cost.objetivo,
      venta: has(e.precio) ? Number(String(e.precio).replace(',', '.')) : (has(input.precio) && Number(input.precio) > 0 ? Number(input.precio) : null), origen: has(e.precio) ? 'usuario' : has(input.precio) ? 'producto' : 'pendiente' };
    // ---- campos propios de la plataforma ----
    var T = TIPOS.filter(function (x) { return x.k === tipo; })[0];
    if (plat === 'etsy') {
      L.campos = { quienLoHizo: T ? ({ yo: 'Yo', socio: 'Un socio de producción', otro: 'Otra empresa o persona' }[T.hecho] || '') : '', queEs: tipo === 'suministro' ? 'Un suministro o herramienta' : tipo ? 'Un producto terminado' : '',
        cuandoSeHizo: tipo === 'vintage' ? (has(F.v.epoca) ? F.v.epoca : '') : (['disenado_fabricado', 'fabricado', 'hecho_mano', 'personalizado', 'disenado_socio'].indexOf(tipo) >= 0 ? (e.bajoDemanda === false ? s(e.cuandoSeHizo) : 'Se fabrica bajo pedido') : s(e.cuandoSeHizo)),
        categoriaCreatividad: T && r.admite && r.admite !== '*' ? (r.admite[tipo] || '') : '', personalizacion: has(F.v.personalizacion) ? 'Sí' : 'No', materiales: [F.v.material].filter(has).concat(has(F.v.acabado) ? [F.v.acabado] : []) };
      if (tipo === 'disenado_socio') L.campos.socioProduccion = s(e.socioProduccion);
    }
    // ---- inferencias visuales (nunca son datos) ----
    (input.visual || []).forEach(function (x) {
      var dato = F.v[x.campo];
      var item = { campo: x.campo, valor: x.valor, etiqueta: 'INFERENCIA VISUAL' };
      if (has(dato) && norm(dato).indexOf(norm(x.valor)) < 0 && norm(x.valor).indexOf(norm(dato)) < 0) L.conflictos.push({ campo: x.campo, a: dato, aOrigen: F.origen[x.campo] === 'usuario' ? 'lo que has escrito' : 'ficha del producto', b: x.valor, bOrigen: 'lo que parece la foto (INFERENCIA VISUAL)' });
      L.visual.push(item);
    });

    // ======== bucle: validar → corregir lo seguro → revalidar ========
    var iter = 0, changed = true;
    while (changed && iter < 8) {
      iter++; changed = false;
      // 1) título
      var tf = titleFix(L.titulo, r); if (tf.titulo !== L.titulo) { L.titulo = tf.titulo; tf.notas.forEach(function (n) { correcciones.push(n); }); changed = true; }
      // 2) afirmaciones sin pruebas
      ['titulo', 'descCorta', 'descripcion'].forEach(function (k) {
        var c = cleanClaims(L[k], F, tipo, { envioGratis: e.envioGratis === true, licenciaMarca: e.licenciaMarca });
        if (c.quitado.length) { L[k] = c.texto; c.quitado.forEach(function (q) { correcciones.push('Quitado «' + q.texto.trim() + '» del ' + ({ titulo: 'título', descCorta: 'resumen', descripcion: 'texto' }[k]) + ': ' + q.porque); }); changed = true; }
      });
      // 3) etiquetas: sin repetir, sin pasarse de largo ni de número, sin marcas ajenas
      if (r.etiquetasMax) {
        var before = JSON.stringify(L.etiquetas), max = r.etiquetaMaxLen || 30;
        var tg = uniq(L.etiquetas.map(function (x) { return s(x).toLowerCase().replace(/^#/, '').trim(); })).filter(function (x) { return x && x.length <= max; });
        var br = tg.filter(function (x) { return brandsIn(x, cfgA).length && !(e.licenciaMarca === 'si'); });
        tg = tg.filter(function (x) { return br.indexOf(x) < 0; });
        if (tg.length > r.etiquetasMax) tg = tg.slice(0, r.etiquetasMax);
        if (JSON.stringify(tg) !== before) { L.etiquetas = tg; correcciones.push('Etiquetas ordenadas: sin repetidas' + (br.length ? ', sin marcas ajenas (' + br.join(', ') + ')' : '') + ', máximo ' + r.etiquetasMax + ' de ' + max + ' caracteres'); changed = true; }
      } else if (L.etiquetas.length) { L.etiquetas = []; changed = true; }
      // 4) números que no salen de los datos (posible dato inventado): se quitan de los textos propuestos
      ['titulo', 'descCorta'].forEach(function (k) {
        var stray = strayNumbers(L[k], F, [L.sku, L.precio.venta, envio.preparacion].join(' '));
        if (stray.length) { stray.forEach(function (n) { L[k] = L[k].replace(new RegExp('\\b' + n.replace('.', '\\.') + '\\s?(cm|mm|m|g|kg|%|€|h|w|v)?\\b', 'gi'), '').replace(/\s{2,}/g, ' ').trim(); }); correcciones.push('Quitado del ' + (k === 'titulo' ? 'título' : 'resumen') + ' un número que no está en los datos (' + stray.join(', ') + ')'); changed = true; }
      });
      // 5) SKU y cantidad
      if (!has(L.sku) && has(input.id)) { L.sku = s(input.id); correcciones.push('SKU tomado del código del producto (' + L.sku + ')'); changed = true; }
    }

    // ======== diagnóstico final ========
    if (!tipo) P('falta', 'tipo', 'Falta decir QUÉ ES el artículo: ¿lo diseñas y fabricas tú, es de segunda mano, vintage…?', 'Elige una opción en «¿Qué es?». Decide en qué plataformas se puede vender.');
    // elegibilidad de la plataforma
    if (tipo && r.noAdmite && r.noAdmite[tipo]) P('no_apto', 'tipo', r.noAdmite[tipo], 'Lo que SÍ puedes cambiar: si lo has hecho tú, cambia «¿Qué es?» (sin mentir). Lo que NO: decir que es hecho a mano o vintage si no lo es. Puedes prepararlo para Wallapop o Vinted con la misma ficha.');
    if (plat === 'etsy' && tipo === 'vintage') { var yr = Number((s(F.v.anio || F.v.epoca).match(/(19|20)\d\d/) || [])[0]); if (!yr) P('falta', 'epoca', 'Vintage en Etsy exige 20 años o más: falta el año o la época CONFIRMADOS.', 'Escribe el año si lo sabes con certeza. Si no lo sabes, no lo publiques como vintage.'); else if (new Date().getFullYear() - yr < 20) P('no_apto', 'epoca', 'Tiene menos de 20 años: Etsy no lo admite como vintage.', 'Puedes venderlo en Wallapop o Vinted como segunda mano.'); }
    if (plat === 'etsy' && tipo === 'disenado_socio' && !has(e.socioProduccion)) P('falta', 'socioProduccion', 'Etsy exige indicar el socio de producción que lo fabrica.', 'Escribe quién lo fabrica (nombre del taller/empresa y dónde).');
    if (plat === 'etsy' && tipo === 'personalizado' && L.fotos < 1) P('falta', 'fotos', 'Etsy pide que la primera foto muestre una pieza YA personalizada (no la plantilla vacía).', 'Sube una foto de una pieza personalizada terminada.');
    // propiedad intelectual: marcas en los datos o en los textos
    var allText = [F.v.nombre, F.v.descripcionBase, L.titulo, L.descripcion, L.etiquetas.join(' '), (L.visual || []).filter(function (x) { return x.campo === 'marca' || x.campo === 'texto'; }).map(function (x) { return x.valor; }).join(' ')].join(' ');
    var marcas = brandsIn(allText, cfgA);
    if (marcas.length) {
      if (e.licenciaMarca === 'si') P('aviso', 'pi', 'Usa ' + marcas.join(', ') + ': has confirmado que tienes licencia. Guarda el documento por si la plataforma lo pide.', '');
      else if (e.licenciaMarca === 'no') P('no_apto', 'pi', 'REVISAR PROPIEDAD INTELECTUAL: aparece «' + marcas.join('», «') + '» y no tienes licencia. Venderlo así puede infringir derechos de marca o de autor en cualquier plataforma.', 'Lo que SÍ puedes hacer: un diseño original sin esa marca ni personaje, o conseguir licencia. Lo que NO: quitar el nombre y seguir vendiendo el mismo diseño (sigue siendo de ellos).');
      else P('pi', 'pi', 'REVISAR PROPIEDAD INTELECTUAL: aparece «' + marcas.join('», «') + '». ¿Tienes licencia o permiso del titular?', 'Responde en «¿Tienes licencia de la marca?». Si es solo «inspirado en», no puede presentarse como oficial ni usar su nombre, logo ni personaje.');
    }
    // licencia del diseño descargado (MakerWorld, Printables, Thingiverse…)
    if (has(input.licencia) || has(input.fuente)) {
      if (LIC_NO_COMERCIAL.test(s(input.licencia))) { if (e.licenciaComercial === 'si') P('aviso', 'licencia', 'El diseño tiene licencia «' + input.licencia + '» y has confirmado que tienes permiso comercial aparte. Guárdalo.', ''); else P('no_apto', 'licencia', 'La licencia del diseño («' + input.licencia + '») no permite vender lo impreso.', 'Consigue una licencia comercial del autor (y márcalo en el asistente) o usa un diseño propio o con licencia comercial.'); }
      else if (LIC_ATRIBUCION.test(s(input.licencia)) && L.descripcion.indexOf('Diseño original de') < 0) { L.descripcion += '\n\nDiseño original de ' + (has(e.autorDiseno) ? e.autorDiseno : s(input.fuente) || 'su autor') + ' (licencia ' + input.licencia + ').'; correcciones.push('Añadida la atribución que exige la licencia ' + input.licencia); }
      else if (!has(input.licencia) && has(input.fuente) && ['fabricado'].indexOf(tipo) >= 0) P('pi', 'licencia', 'El diseño viene de «' + input.fuente + '» pero no consta su licencia.', 'Apunta la licencia en la ficha del producto (campo Licencia) para saber si se puede vender.');
    }
    // datos que faltan (sin inventar)
    if (!has(F.v.nombre)) P('falta', 'nombre', 'Falta el nombre del producto.', '');
    L.atributos.forEach(function (a) { if (a.obligatorio && !has(a.v)) P('falta', a.k, 'Falta «' + a.t + '» (obligatorio en ' + cat.t + ').', 'Escríbelo en el asistente; si no lo sabes, mídelo o compruébalo antes de publicar.'); });
    if (C.origen === 'sugerida') P('aviso', 'categoria', 'Categoría sugerida por el nombre: «' + cat.t + '». Confírmala o cámbiala.', '');
    if (L.precio.venta === null) P('falta', 'precio', 'Falta el precio de venta.' + (L.precio.objetivo ? ' Con tu margen objetivo serían ' + L.precio.objetivo.toFixed(2).replace('.', ',') + ' €.' : L.precio.equilibrio ? ' Como mínimo ' + L.precio.equilibrio.toFixed(2).replace('.', ',') + ' € para no perder.' : ''), 'Escribe el precio o usa el de la receta de costes.');
    else if (L.precio.equilibrio && L.precio.venta < L.precio.equilibrio) P('aviso', 'precio', 'El precio (' + L.precio.venta.toFixed(2).replace('.', ',') + ' €) está POR DEBAJO de tu punto de equilibrio (' + L.precio.equilibrio.toFixed(2).replace('.', ',') + ' €): pierdes dinero.', 'Súbelo o revisa la receta de costes.');
    if (L.precio.costeEstado && L.precio.costeEstado !== 'confirmado') P('aviso', 'coste', 'El coste incluye datos ' + L.precio.costeEstado.toUpperCase() + ': el margen es aproximado.', 'Confirma los precios en Materiales y costes.');
    if (!has(L.cantidad) || !(Number(L.cantidad) >= 1)) P('falta', 'cantidad', 'Falta la cantidad disponible (mínimo 1).', 'Si se fabrica bajo pedido, pon cuántos aceptas a la vez.');
    if (!has(L.sku)) P('falta', 'sku', 'Falta el SKU.', 'Guarda primero el producto: el SKU se crea solo.');
    if (L.fotos < (r.fotosMin || 1)) P('falta', 'fotos', 'Faltan fotos (mínimo ' + (r.fotosMin || 1) + '). Deben ser del producto real.', 'Sube fotos en la ficha del producto (Fotos, vídeos y STL).');
    if (!has(L.envio.pesoArticulo) && !has(L.envio.pesoPaquete)) P('falta', 'peso', 'Falta el peso (del artículo o del paquete) para el envío.', 'Pésalo y escríbelo; no se calcula a ojo.');
    if (!has(L.envio.medidasPaquete) || /¿|pendiente/i.test(s(L.envio.medidasPaquete))) P('falta', 'medidasPaquete', 'Faltan las medidas del paquete' + (has(L.envio.medidasPaquete) ? ' (' + L.envio.medidasPaquete + ')' : '') + '.', 'Elige un embalaje con caja medida o escribe las medidas.');
    if (!has(L.envio.preparacion)) P('falta', 'preparacion', 'Falta el tiempo de preparación (días).', 'Escríbelo (p. ej. 3 días laborables).');
    if (plat === 'etsy') { if (!has(L.campos.quienLoHizo) && tipo) P('falta', 'quienLoHizo', 'Falta «Quién lo hizo».', ''); if (!has(L.campos.cuandoSeHizo) && tipo) P('falta', 'cuandoSeHizo', 'Falta «Cuándo se hizo».', 'Para vintage: el año confirmado; si lo haces tú: «Se fabrica bajo pedido» o el año.'); }
    if (r.etiquetasMax && L.etiquetas.length < Math.min(5, r.etiquetasMax)) P('aviso', 'etiquetas', 'Solo hay ' + L.etiquetas.length + ' etiqueta(s): añade más que describan el producto (sin repetir ni marcas ajenas).', '');
    if (r.descMax && L.descripcion.length > r.descMax) P('falta', 'descripcion', 'La descripción supera el límite de ' + r.descMax + ' caracteres.', 'Acórtala.');
    if (L.titulo.length < 10) P('falta', 'titulo', 'El título es demasiado corto.', 'Añade qué es y su material o uso.');
    // el título tiene que hablar de ESTE producto
    if (has(e.titulo) && has(F.v.nombre)) {
      var sig = function (x) { return norm(x).replace(/[^a-z0-9n ]/g, ' ').split(' ').filter(function (w) { return w.length > 3; }); };
      var nw = sig(F.v.nombre), tw = sig(L.titulo);
      if (nw.length && !nw.some(function (w) { return tw.indexOf(w) >= 0; })) P('conflicto', 'titulo', 'POSIBLE CONFLICTO: el título («' + L.titulo + '») no menciona el producto («' + F.v.nombre + '»).', 'Revisa que el anuncio sea de este producto.');
    }
    L.conflictos.forEach(function (c) { P('conflicto', c.campo, 'POSIBLE CONFLICTO en «' + (CAMPOS[c.campo] || c.campo) + '»: ' + c.aOrigen + ' dice «' + c.a + '» y ' + c.bOrigen + ' dice «' + c.b + '».', 'Elige cuál es el correcto (no se elige solo).'); });
    L.visual.forEach(function (x) { if (!L.conflictos.some(function (c) { return c.campo === x.campo; })) P('aviso', x.campo, 'INFERENCIA VISUAL: la foto parece mostrar ' + (CAMPOS[x.campo] || x.campo).toLowerCase() + ' «' + x.valor + '». No se usa como dato hasta que lo confirmes.', ''); });

    var nb = problemas.filter(function (p) { return p.nivel === 'no_apto'; }).length, nf = problemas.filter(function (p) { return p.nivel === 'falta' || p.nivel === 'conflicto' || p.nivel === 'pi'; }).length;
    L.estado = nb ? 'no_apto' : nf ? 'requiere_datos' : 'listo';
    L.estadoTexto = { listo: 'LISTO PARA PUBLICAR', requiere_datos: 'REQUIERE TU CONFIRMACIÓN', no_apto: 'NO APTO PARA ' + r.t.toUpperCase() }[L.estado];
    L.problemas = problemas; L.correcciones = uniq(correcciones); L.iteraciones = iter;
    L.checklist = checklist(L, problemas, tipo);
    L.preguntas = problemas.filter(function (p) { return p.nivel === 'falta' || p.nivel === 'conflicto' || p.nivel === 'pi'; }).map(function (p) { return p.texto + (p.queHacer ? ' → ' + p.queHacer : ''); });
    return L;
  }
  function checklist(L, probs, tipo) {
    var bad = function (campos) { return probs.some(function (p) { return campos.indexOf(p.campo) >= 0 && p.nivel !== 'aviso'; }); };
    return [
      ['Producto identificado', !bad(['nombre'])], ['Precio correcto', !bad(['precio'])], ['SKU válido', !bad(['sku'])], ['Cantidad válida', !bad(['cantidad'])], ['Fotos', !bad(['fotos'])],
      ['Título válido', !bad(['titulo'])], ['Descripción', !bad(['descripcion'])], ['Categoría', !bad(['categoria'])],
      ['Atributos revisados', !probs.some(function (p) { return p.nivel === 'falta' && L.atributos.some(function (a) { return a.k === p.campo; }); })],
      ['Materiales', !bad(['material'])], ['Estado del artículo', !bad(['condicion'])], ['Medidas', !bad(['medidas'])], ['Embalaje y medidas del paquete', !bad(['medidasPaquete'])], ['Peso', !bad(['peso'])],
      ['Envío y preparación', !bad(['preparacion'])], ['Fabricación / origen', !bad(['tipo', 'socioProduccion', 'quienLoHizo', 'cuandoSeHizo', 'epoca'])],
      ['Propiedad intelectual revisada', !bad(['pi', 'licencia'])], ['Plataforma admite el artículo', !probs.some(function (p) { return p.nivel === 'no_apto' && p.campo === 'tipo'; })],
      ['Sin conflictos de datos', !probs.some(function (p) { return p.nivel === 'conflicto'; })], ['Avisos revisados', true]
    ].map(function (x) { return { t: x[0], ok: x[1] }; });
  }
  // Texto para copiar y pegar en la plataforma
  function asText(L) {
    var out = ['TÍTULO', L.titulo, '', 'RESUMEN', L.descCorta, '', L.descripcion];
    if (L.etiquetas.length) out.push('', 'ETIQUETAS', L.etiquetas.join(', '));
    out.push('', 'SKU: ' + L.sku, 'Precio: ' + (L.precio.venta === null ? 'PENDIENTE' : L.precio.venta.toFixed(2).replace('.', ',') + ' €'), 'Cantidad: ' + (has(L.cantidad) ? L.cantidad : 'PENDIENTE'), 'Categoría: ' + L.categoria);
    Object.keys(L.campos || {}).forEach(function (k) { var v = L.campos[k]; if (has(Array.isArray(v) ? v.join('') : v)) out.push(k + ': ' + (Array.isArray(v) ? v.join(', ') : v)); });
    return out.join('\n');
  }
  return { analyze: analyze, asText: asText, rules: rules, categories: categories, CAMPOS: CAMPOS, CATEGORIAS: CATEGORIAS, TIPOS: TIPOS, CONDICIONES: CONDICIONES, PLATAFORMAS: PLATAFORMAS, brandsIn: brandsIn, cleanClaims: cleanClaims, facts: facts };
})();
if (typeof module !== 'undefined') module.exports = LST;
