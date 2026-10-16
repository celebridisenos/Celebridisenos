// ================= 👗 CelebriDREW · escritor de PDF propio (viene de la base de patronaje del 11-10-2026, sin cambios de fondo) =================
// Dibuja rayas y letras EXACTAS: todo se le da en MILÍMETROS, con el origen abajo a la izquierda de la hoja, y el PDF lleva dentro
// la escala (72 puntos = 25,4 mm), así que 50 mm en el dibujo son 50 mm en el papel si se imprime al 100 %.
// Es vectorial: las líneas salen finas y nítidas en cualquier impresora y el archivo pesa poco.
const K = 72 / 25.4; // puntos de PDF por milímetro
const f = x => { const v = Math.round(x * 1000) / 1000; return Object.is(v, -0) ? '0' : String(v); };
const f6 = x => { const v = Math.round(x * 1e6) / 1e6; return Object.is(v, -0) ? '0' : String(v); };

// Letras: Helvetica con la tabla «WinAnsi» (tiene á é í ó ú ñ ¿ ¡ « » × · °). Lo que no existe en esa tabla se cambia o se quita.
const CAMBIOS = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97, '→': '->', '←': '<-', '↑': '^', '↓': 'v', '≥': '>=', '≤': '<=', '≈': '~', '✂': '', '⚠': '(!)' };
function aHex(s) { let out = ''; for (const ch of String(s)) { let c = CAMBIOS[ch]; if (c === undefined) { const n = ch.codePointAt(0); c = n <= 0xFF && n >= 0x20 ? n : (n < 0x20 ? 0x20 : ''); } if (typeof c === 'string') { for (const d of c) out += d.charCodeAt(0).toString(16).padStart(2, '0'); } else out += c.toString(16).padStart(2, '0'); } return out; }
// lo que mide un texto (aproximado, en veces el tamaño de la letra): para centrar y para partir renglones
const ESTRECHAS = 'iljtfI.,;:\'!|()[] ', ANCHAS = 'mwMW@%';
export function anchoTexto(s, tam) { let w = 0; for (const ch of String(s)) w += ESTRECHAS.includes(ch) ? 0.3 : ANCHAS.includes(ch) ? 0.86 : (ch >= 'A' && ch <= 'Z') || 'ÁÉÍÓÚÑ'.includes(ch) ? 0.68 : 0.54; return w * tam; }
export function renglones(s, tam, ancho) { const out = []; String(s).split('\n').forEach(par => { let l = ''; par.split(/\s+/).forEach(p => { const t = l ? l + ' ' + p : p; if (anchoTexto(t, tam) > ancho && l) { out.push(l); l = p; } else l = t; }); out.push(l); }); return out; }

// 16-10 · la corrección de SU impresora (CelebriDREW → 📷 Foto → «Calibrar la impresora», drew/calibra.js): si al imprimir al 100 % la raya
// de 170 mm sale de 169,2, todo se dibuja ×1,0047 en ese sentido. Va en TODAS las hojas, alrededor del centro de la hoja. escala:false = sin ella
export const CLAVE_IMPRESORA = 'cd.drew.impresora';
export function escalaImpresora() { try { const j = JSON.parse((globalThis.localStorage && globalThis.localStorage.getItem(CLAVE_IMPRESORA)) || 'null'); if (j && j.x > 0.9 && j.x < 1.1 && j.y > 0.9 && j.y < 1.1) return j; } catch (e) { } return null; }
export function nuevoPDF(info = {}) {
  const paginas = [], E = info.escala === false ? null : (info.escala || escalaImpresora());
  function pagina(w = 210, h = 297) {
    const ops = [];
    // color: o.color = [r, g, b] (0–1) para la raya · o.fondo = [r, g, b] para el relleno (si no, gris)
    const estilo = (o = {}) => { ops.push(f(o.ancho ?? 0.3) + ' w'); if (o.color) ops.push(o.color.map(f).join(' ') + ' RG'); else ops.push(f(o.gris ?? 0) + ' G'); ops.push(o.trazos ? '[' + o.trazos.map(f).join(' ') + '] 0 d' : '[] 0 d'); ops.push('1 j 1 J'); };
    const imgs = [];
    const g = { w, h,
      linea(x1, y1, x2, y2, o) { estilo(o); ops.push(f(x1) + ' ' + f(y1) + ' m ' + f(x2) + ' ' + f(y2) + ' l S'); },
      poli(pts, o = {}) { if (!pts || pts.length < 2) return; estilo(o); let s = f(pts[0][0]) + ' ' + f(pts[0][1]) + ' m'; for (let i = 1; i < pts.length; i++) s += ' ' + f(pts[i][0]) + ' ' + f(pts[i][1]) + ' l'; if (o.cerrado !== false) s += ' h';
        if (o.fondo) { ops.push(o.fondo.map(f).join(' ') + ' rg'); ops.push(s + (o.sinRaya ? ' f' : ' B')); } else if (o.relleno !== undefined && o.relleno !== null) { ops.push(f(o.relleno) + ' g'); ops.push(s + (o.sinRaya ? ' f' : ' B')); } else ops.push(s + ' S'); },
      // una foto JPEG (bytes, su tamaño en píxeles) en el rectángulo (x, y, an, al) en mm
      imagen(jpg, pxW, pxH, x, y, an, al) { const n = 'Im' + (imgs.length + 1); imgs.push({ n, jpg, pxW, pxH }); ops.push('q ' + f(an) + ' 0 0 ' + f(al) + ' ' + f(x) + ' ' + f(y) + ' cm /' + n + ' Do Q'); },
      // un círculo (4 curvas), con raya y/o relleno de color
      circulo(cx, cy, r, o = {}) { const k = 0.5523 * r; estilo(o); const s2 = f(cx + r) + ' ' + f(cy) + ' m ' + [[cx + r, cy + k, cx + k, cy + r, cx, cy + r], [cx - k, cy + r, cx - r, cy + k, cx - r, cy], [cx - r, cy - k, cx - k, cy - r, cx, cy - r], [cx + k, cy - r, cx + r, cy - k, cx + r, cy]].map(c => c.map(f).join(' ') + ' c').join(' ') + ' h';
        if (o.fondo) { ops.push(o.fondo.map(f).join(' ') + ' rg'); ops.push(s2 + (o.sinRaya ? ' f' : ' B')); } else ops.push(s2 + ' S'); },
      rect(x, y, an, al, o = {}) { g.poli([[x, y], [x + an, y], [x + an, y + al], [x, y + al]], o); },
      // texto: (x, y) es donde empieza su línea de base; o = { tam (mm), gris, negrita, centro, giro (grados) }
      texto(x, y, s, o = {}) { const tam = o.tam ?? 3.5, hex = aHex(s); if (!hex) return; if (o.centro) x -= anchoTexto(s, tam) / 2; const a = (o.giro || 0) * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
        ops.push('BT ' + (o.color ? o.color.map(f).join(' ') + ' rg' : f(o.gris ?? 0) + ' g') + ' /' + (o.negrita ? 'F2' : 'F1') + ' ' + f(tam) + ' Tf ' + f(co) + ' ' + f(si) + ' ' + f(-si) + ' ' + f(co) + ' ' + f(x) + ' ' + f(y) + ' Tm <' + hex + '> Tj ET'); },
      // un párrafo que se parte solo; devuelve la «y» donde acaba
      parrafo(x, y, s, o = {}) { const tam = o.tam ?? 3.5, alto = o.interlinea ?? tam * 1.35; renglones(s, tam, o.ancho ?? (w - 2 * x)).forEach(l => { g.texto(x, y, l, o); y -= alto; }); return y; },
      // lo que se dibuje dentro de «fn» solo se ve dentro del rectángulo
      recorta(x, y, an, al, fn) { ops.push('q ' + f(x) + ' ' + f(y) + ' ' + f(an) + ' ' + f(al) + ' re W n'); fn(); ops.push('Q'); },
    };
    paginas.push({ w, h, ops, imgs }); return g;
  }
  function bytes() {
    const obj = [], add = s => { obj.push(s); return obj.length; };
    add('<< /Type /Catalog /Pages 2 0 R >>'); add(''); // el 2 (la lista de páginas) se rellena al final
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = [];
    const binStr = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
    paginas.forEach(p => { const flujo = (E ? f6(K * E.x) + ' 0 0 ' + f6(K * E.y) + ' ' + f6(p.w * K * (1 - E.x) / 2) + ' ' + f6(p.h * K * (1 - E.y) / 2) : f6(K) + ' 0 0 ' + f6(K) + ' 0 0') + ' cm\n' + p.ops.join('\n') + '\n'; /* (16-10: la escala con 6 decimales; con 3 sobraban 0,04 mm en 30 cm) */
      const nC = add('<< /Length ' + flujo.length + ' >>\nstream\n' + flujo + 'endstream');
      const xo = p.imgs.map(im => { const n = add('<< /Type /XObject /Subtype /Image /Width ' + im.pxW + ' /Height ' + im.pxH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.jpg.length + ' >>\nstream\n' + binStr(im.jpg) + '\nendstream'); return '/' + im.n + ' ' + n + ' 0 R'; });
      kids.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(p.w * K) + ' ' + f(p.h * K) + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>' + (xo.length ? ' /XObject << ' + xo.join(' ') + ' >>' : '') + ' >> /Contents ' + nC + ' 0 R >>')); });
    obj[1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
    const nInfo = add('<< /Title <' + aHex(info.titulo || 'Patron') + '> /Producer <' + aHex('CelebriDisenos - CelebriDREW') + '> >>');
    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const pos = [];
    obj.forEach((o, i) => { pos.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const xref = out.length; out += 'xref\n0 ' + (obj.length + 1) + '\n0000000000 65535 f \n' + pos.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('');
    out += 'trailer\n<< /Size ' + (obj.length + 1) + ' /Root 1 0 R /Info ' + nInfo + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    const B = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) B[i] = out.charCodeAt(i) & 0xFF; return B; // (todo lo escrito cabe en un byte por letra)
  }
  return { pagina, bytes, get paginas() { return paginas.length; }, escala: E, blob: () => new Blob([bytes()], { type: 'application/pdf' }) };
}
export const PUNTOS_POR_MM = K;
