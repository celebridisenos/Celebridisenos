// ================= 👗 CelebriDREW · TIPOS DE COSTURA y MONTAJE PASO A PASO =================
// · El TIPO de cada costura (lo elige la persona; si no, el típico de la tela): cambia el MARGEN de sus dos orillas (y con él la línea
//   de corte del patrón y el PDF) y la instrucción de montaje. Valores de confección habituales (en mm).
// · Los PASOS de montaje salen de las costuras de la prenda, en el orden de un taller: pinzas → centro/cremallera → hombros → cuello o
//   capucha → mangas en plano → costados (de una vez con la manga) → puños, cinturas y cinturillas → bajos y remates → botones → plancha.
//   Cada paso dice qué piezas, qué orillas, con qué costura y su margen, y lleva su número (el mismo que se imprime en las orillas del patrón).
import * as Z from './pieza.js';
import * as G from './geom.js';

export const TIPOS = {
  recta: { t: 'Recta + zigzag', corto: 'recta', margen: 10, d: 'Pespunte recto al margen; luego sobrehila los márgenes juntos (zigzag o remalladora) y plánchalos hacia un lado.' },
  overlock: { t: 'Remalladora (overlock de 4 hilos)', corto: 'remalladora', margen: 7, d: 'Une y remata de una vez y da de sí: la de las prendas de punto. Guía la cuchilla por el borde del margen.' },
  francesa: { t: 'Francesa', corto: 'francesa', margen: 15, d: 'Primero revés con revés a menos de la mitad del margen, recorta, da la vuelta y cose derecho con derecho al resto: el margen queda encerrado. Para telas finas.' },
  cargada: { t: 'Cargada (doble pespunte, vaquero)', corto: 'cargada', margen: 15, d: 'Cose al margen, recorta uno de los dos a la mitad, envuélvelo con el otro y pespunta por encima: plana y muy fuerte, con dos pespuntes a la vista.' },
  abierta: { t: 'Abierta planchada (sastrería)', corto: 'abierta', margen: 15, d: 'Pespunte recto, sobrehila cada margen por separado y plánchalos abiertos.' },
  ribeteada: { t: 'Ribeteada con bies', corto: 'ribeteada', margen: 15, d: 'Cose y envuelve cada margen con un bies fino: queda limpia por dentro (prendas sin forro).' },
};
export function tipoPorDefecto(prenda) { return prenda.tejido === 'punto' ? 'overlock' : 'recta'; } // (los demás se eligen: cambian el margen)
export const tipoDe = (prenda, c, elegidos) => (elegidos && elegidos[c.id]) || tipoPorDefecto(prenda, c);
// las ediciones de margen que pide un tipo (las dos orillas de la costura)
export function edicionesTipo(prenda, c, tipo) { const T = TIPOS[tipo]; if (!T) return []; const pz = id => prenda.piezas.find(p => p.id === id), out = [];
  [[c.a.pieza, c.a.borde], [c.b.pieza, c.b.borde]].forEach(([pid, bid]) => { const p = pz(pid); if (p && !out.some(e => e.pieza === p.nombre && e.args.borde === bid)) out.push({ op: 'margen', pieza: p.nombre, args: { borde: bid, mm: T.margen } }); }); return out; }

// ---------- los PASOS ----------
const ORDEN = [[/^pinza$/, 0], [/^centroEsp$/, 1], [/^tiro/, 1], [/^hombro$/, 2], [/^tiraCB$|^capCentro$/, 3], [/^cuello|^cap(Del|Esp)$/, 4], [/^sisa/, 5], [/^costado$|^manga$/, 6], [/^entrepierna$|^costadoFalda$/, 7], [/^punoLado$|^cinCB$/, 8], [/^puno$/, 9], [/^cin(Del|Esp)$/, 10], [/^cremallera/, 10.5]];
const prioridad = id => { for (const [r, n] of ORDEN) if (r.test(id)) return n; return 11; };
const cm = mm => G.cm(mm);
// (16-10) las VARILLAS de la prenda (canales marcados en las piezas): cuántas hay que cortar de cada largo. Una línea sobre el doblez sale UNA
// vez; las demás, tantas como piezas se cortan (una pieza al doblez = 2 mitades). La varilla, 2 cm más corta que su canal.
export function varillas(prenda) {
  const out = []; (prenda.piezas || []).forEach(p => p.internas.filter(i => i.tipo === 'varilla').forEach(i => { const enDoblez = !!p.corte.doblez && Math.abs(i.pts[0][0]) < 0.5 && Math.abs(i.pts[1][0]) < 0.5;
    out.push({ pieza: p.nombre, donde: String(i.n || '').replace(/^Varilla: /, '').replace(/ · canal.*$/, ''), canal: G.dist(i.pts[0], i.pts[1]), varilla: Math.max(20, G.dist(i.pts[0], i.pts[1]) - 20), n: enDoblez ? 1 : p.corte.doblez ? 2 : (p.corte.n || 1) }); }));
  return out;
}
export function pasos(prenda, elegidos) {
  const P = prenda.piezas, nom = id => (P.find(p => p.id === id) || {}).nombre || '?', bn = (pid, bid) => { const p = P.find(x => x.id === pid), B = p && Z.bordePorId(p, bid); return B ? B.n.toLowerCase() : bid; };
  const mar = (pid, bid) => { const p = P.find(x => x.id === pid); return p ? Z.margenDe(p, bid) : 10; };
  const out = [];
  // las pinzas (todas las de la prenda en un paso)
  const conPinza = P.filter(p => p.pinzas.length);
  if (conPinza.length) out.push({ pri: 0, ids: ['pinza'], titulo: 'Cierra las pinzas', piezas: conPinza.map(p => p.nombre), bordes: [],
    texto: 'Marca las pinzas (' + conPinza.map(p => p.nombre + ': ' + p.pinzas.length + (p.corte.doblez || (p.corte.n || 1) > 1 ? ' por mitad' : '')).join(' · ') + '). Dobla cada pinza derecho con derecho haciendo coincidir sus dos patas y cose desde la boca hasta la punta, acabando en nada; anuda los hilos sin rematar hacia atrás. Plancha las de delante hacia el centro y las de detrás hacia el centro de la espalda.' });
  // las costuras, agrupadas por su id (izquierda y derecha son el mismo paso)
  const vistos = new Set(), cs = prenda.costuras || [];
  if (cs.some(c => c.id === 'costado') && cs.some(c => c.id === 'manga')) vistos.add('manga'); // (va dentro del paso de los costados)
  // el VESTIDO: la cremallera va de la nuca a la cadera, cuerpo y falda ya unidos por la cintura: un solo paso
  const crC = cs.find(c => c.id === 'cremallera'), crF = cs.find(c => c.id === 'cremalleraFalda');
  if (crC && crF) { vistos.add('cremallera'); vistos.add('cremalleraFalda'); const pF = P.find(x => x.id === crF.a.pieza), nota = ((pF && pF.meta.notas) || []).join(' '), m0 = /de ([0-9,]+) cm/.exec(nota);
    out.push({ pri: 10.5, ids: ['cremallera', 'cremalleraFalda'], titulo: 'Cremallera y centro de la espalda', piezas: [nom(crC.a.pieza), nom(crF.a.pieza)], bordes: [[nom(crC.a.pieza), crC.a.borde], [nom(crF.a.pieza), crF.a.borde]], tipo: tipoDe(prenda, crF, elegidos),
      texto: 'Con el cuerpo y la falda ya unidos por la cintura, pon la cremallera invisible en el centro de la espalda: desde la nuca hasta ' + (m0 ? m0[1] : '18') + ' cm por debajo de la cintura (haz coincidir la costura de la cintura a los dos lados). Luego cierra el resto del centro de la falda, desde el final de la cremallera hasta el bajo, a ' + cm(mar(crF.a.pieza, crF.a.borde)) + ' cm.' }); }
  (prenda.costuras || []).slice().sort((a, b) => prioridad(a.id) - prioridad(b.id)).forEach(c => { if (vistos.has(c.id) || c.cierre) return; vistos.add(c.id); /* (los «cierres» —corchete— no se cosen: van en su paso) */
    const tipo = tipoDe(prenda, c, elegidos), T = TIPOS[tipo], ma = mar(c.a.pieza, c.a.borde), mb = mar(c.b.pieza, c.b.borde), m = Math.max(ma, mb), A = nom(c.a.pieza), B = nom(c.b.pieza);
    let texto;
    if (c.tipo === 'espejo') { const o2 = bn(c.a.pieza, c.a.borde); texto = 'Une las dos mitades de «' + A + '» por «' + o2 + '», derecho con derecho' + (/cremallera/i.test(o2) && /^Cuerpo/.test(A) ? ': es TODA cremallera. Pon la cremallera invisible desde la nuca (sigue por la falda) antes de cerrar nada más' : /cremallera/i.test(o2) ? ', dejando abiertos los 20 cm de arriba: ahí va la cremallera invisible (cósela antes de cerrar el resto)' : /bragueta/i.test(o2) ? ', dejando abiertos los 18 cm de arriba para la bragueta: pon la cremallera con su vista' : '') + '.'; }
    else if (c.a.pieza === c.b.pieza) texto = 'Cierra «' + A + '» uniendo «' + bn(c.a.pieza, c.a.borde) + '» con «' + bn(c.b.pieza, c.b.borde) + '», derecho con derecho (queda un tubo).';
    else texto = 'Une ' + A + ' y ' + B + ': «' + bn(c.a.pieza, c.a.borde) + '» con «' + bn(c.b.pieza, c.b.borde) + '», derecho con derecho, haciendo coincidir los piquetes.';
    if (Math.abs((c.ratio || 1) - 1) > 0.03) texto += ' «' + B + '» es ' + ((c.ratio || 1) < 1 ? 'más corta: estírala un poco al coser para que llegue entera' : 'más larga: embébela (frúncela apenas) para que case') + '.';
    if (/^sisa/.test(c.id)) texto += ' Pon la manga en plano, antes de cerrar los costados: el piquete sencillo va delante y el doble detrás.';
    if (/^costado$/.test(c.id) && cs.some(x => x.id === 'manga')) texto += ' Cose de una vez desde el bajo del cuerpo hasta la boca de la manga, pasando por la axila (así se cierran también las mangas).';
    texto += ' Costura ' + T.corto + (ma === mb ? ' a ' + cm(m) + ' cm' : ' (márgenes ' + cm(ma) + ' y ' + cm(mb) + ' cm)') + '. ' + T.d;
    const extra = /^costado$/.test(c.id) ? cs.filter(x => x.id === 'manga') : [], ids = [c.id].concat(extra.map(x => x.id)), bord = [[A, c.a.borde], [B, c.b.borde]].concat(...extra.map(x => [[nom(x.a.pieza), x.a.borde], [nom(x.b.pieza), x.b.borde]]));
    out.push({ pri: prioridad(c.id), ids, titulo: extra.length ? 'Costados y mangas' : c.n, piezas: [...new Set(bord.map(x => x[0]))], bordes: bord, tipo, texto });
  });
  // bajos y remates
  const bajos = [], remates = [];
  P.forEach(p => p.bordes.forEach(B => { if (B.tipo === 'bajo') bajos.push([p, B]); else if (B.tipo === 'remate') remates.push([p, B]); }));
  if (remates.length) out.push({ pri: 11, ids: ['remate'], titulo: 'Remata los cantos', piezas: [...new Set(remates.map(([p]) => p.nombre))], bordes: remates.map(([p, B]) => [p.nombre, B.id]),
    texto: remates.map(([p, B]) => '«' + B.n + '» de ' + p.nombre + ': dobla ' + cm(Z.margenDe(p, B.id)) + ' cm hacia dentro y pespunta').join(' · ') + (prenda.tejido === 'punto' ? ' (en punto, con aguja doble o recubridora).' : '.') });
  if (bajos.length) out.push({ pri: 12, ids: ['bajo'], titulo: 'Haz los bajos', piezas: [...new Set(bajos.map(([p]) => p.nombre))], bordes: bajos.map(([p, B]) => [p.nombre, B.id]),
    texto: bajos.map(([p, B]) => p.nombre + ': ' + cm(Z.margenDe(p, B.id)) + ' cm').join(' · ') + '. ' + (prenda.tejido === 'punto' ? 'Dobla una vez y cose con aguja doble o recubridora para que dé de sí.' : 'Sobrehila el borde (o dobla 0,5 cm), dobla el resto hacia dentro, plancha y pespunta o cose a punto invisible.') });
  // (17-10) la CREMALLERA de una sudadera o chaqueta: entera (separable) o media (abertura marcada en el delantero)
  if (cs.some(c => c.cierre && c.id === 'cremallera')) out.push({ pri: 10.6, ids: ['cremallera'], titulo: 'Pon la cremallera separable', piezas: [...new Set(P.filter(p => /^(Delantero|Cintura|Tira del cuello|Cuello alto)/.test(p.nombre)).map(p => p.nombre))], bordes: [],
    texto: 'Con la cintura y el cuello ya cosidos, encara cada cinta de la cremallera con su orilla del centro delantero (derecho con derecho, los dientes hacia dentro), del bajo hasta el canto del cuello. Cósela a 1 cm con el pie de cremallera, vuelve la tela y pespunta por fuera a 0,6 cm del borde. Comprueba antes que las dos mitades casan a la misma altura (la cintura, los bolsillos).' });
  const media = P.find(p => p.internas.some(i => /media cremallera/i.test(i.n || '')));
  if (media) out.push({ pri: 10.6, ids: ['cremallera'], titulo: 'Pon la media cremallera', piezas: [media.nombre], bordes: [], texto: 'Antes de coser el cuello: corta la abertura marcada en el centro del delantero, refuerza la punta por el revés con un cuadrado de entretela y haz dos piquetes en diagonal de 1 cm en la punta. Encara la cremallera (22 cm) y cósela en U con el pie de cremallera; pespunta por fuera. Luego el cuello se cose abierto en el centro.' });
  const botones = P.filter(p => p.internas.some(i => i.tipo === 'boton'));
  const soloCorchete = botones.length && botones.every(p => p.internas.filter(i => i.tipo === 'boton').every(i => /corchete/i.test(i.n || '')));
  if (soloCorchete) out.push({ pri: 13, ids: ['boton'], titulo: 'Corchete', piezas: botones.map(p => p.nombre), bordes: [], texto: 'Con la cremallera cerrada, cose el corchete en los extremos de la cinturilla (' + botones.map(p => p.nombre).join(', ') + '): el gancho por dentro del extremo que monta encima y la presilla enfrente, donde marca el patrón.' });
  else if (botones.length) out.push({ pri: 13, ids: ['boton'], titulo: 'Ojal y botón', piezas: botones.map(p => p.nombre), bordes: [], texto: 'Haz el ojal donde marca el patrón (' + botones.map(p => p.nombre).join(', ') + ') y cose el botón enfrente, con la prenda cerrada.' });
  const V = varillas(prenda); if (V.length) { const tot = V.reduce((a, v) => a + v.n, 0);
    out.push({ pri: 10.4, ids: ['varillas'], titulo: 'Canales de varilla', piezas: [...new Set(V.map(v => v.pieza))], bordes: [],
      texto: 'Por el REVÉS del cuerpo, cose encima de cada línea de varilla marcada en el patrón una cinta de canal de 1–1,2 cm (o una tira de forro doblada), pespuntando sus dos orillas. Corta ' + tot + ' varillas (de espiral o de plástico rígido), 2 cm más cortas que su canal: ' + V.map(v => v.n + ' × ' + cm(v.varilla) + ' cm (' + v.pieza.toLowerCase() + ', ' + v.donde + ')').join(' · ') + '. Mételas antes de poner la cremallera y cierra cada canal con una puntada.' }); }
  out.push({ pri: 14, ids: ['plancha'], titulo: 'Plancha y repasa', piezas: [], bordes: [], texto: 'Plancha todas las costuras (por el revés y con la temperatura de la tela), corta hilos y pruébatela.' });
  out.sort((a, b) => a.pri - b.pri); out.forEach((p, i) => { p.n = i + 1; }); return out;
}
// el número de paso de cada orilla (para imprimirlo en el patrón): «nombrePieza|borde» → [n…]
export function numerosPorOrilla(prenda, L) { const m = {}; L.forEach(p => p.bordes.forEach(([pz, b]) => { const k = pz + '|' + b; (m[k] = m[k] || []).includes(p.n) || m[k].push(p.n); })); return m; }
