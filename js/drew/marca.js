// ================= 👗 CelebriDREW · 🏷️ SU MARCA (THE NOORKO) y el 📚 CATÁLOGO DE MODELOS hecho con sus planos (17-10-2026, noche) =================
// Ella: «mira la carpeta NOORKO1, había cositas» · «los he pagado yo, puedes utilizar todo» · «pagué 15 € por todos esos vectores, así que
// utiliza todo» · «utiliza esas referencias para hacerlas ya en 3D directamente, diséñalas todas y que estén como catálogo» · «utiliza lo que
// te he dicho adaptado a mi programa».
// · Del LIBRO DE MARCA (NOORKO1/MANUAL, «THE NOORKO · La Luz Impacta»): los 5 colores con su uso y los tamaños de estampado (espalda 40 × 50,
//   pecho 30 × 30, logo de pecho izquierdo 12 × 12). Eso va aquí dentro.
// · Lo comprado y lo suyo (los 3.600 planos técnicos de MOCKUP VECTORS, sus diseños y sus logos) se LEE de su carpeta en el PC (el programa
//   del PC sirve sus archivos): NO va dentro de la app, que se publica en internet. Sin el PC (móvil, iPad), los modelos salen igual en 3D,
//   solo que sin la miniatura de su plano.
// · El CATÁLOGO: cada modelo es una plantilla de CelebriDREW con sus opciones, su ajuste, su tela, un color de la marca y algún largo (fijo, en
//   «medidas», o PROPORCIONAL al cuerpo, en «escala»: el cropped es un 78 % del largo normal en TODAS las tallas), hecho a
//   partir de UNO de sus planos (el que se ve en la tarjeta y va a la ficha técnica). Solo lo que el motor sabe coser en 3D (sudaderas,
//   camisetas y tops, pantalones y shorts, faldas y vestidos); polos, camisas, chaquetas, calzado y bolsos todavía no.
import { desktop } from '../desktop.js';

export const MARCA = {
  nombre: 'THE NOORKO', lema: 'La Luz Impacta',
  colores: [
    { k: 'negro', t: 'Negro Carbón', hex: '#0D0D0D', uso: 'Base dominante: hoodies, camisetas y pantalones (fuerza y lujo urbano)' },
    { k: 'gris', t: 'Gris Acero', hex: '#1C1F26', uso: 'Estructura y detalles: bolsillos, mangas, costuras, puños, paneles laterales' },
    { k: 'rojo', t: 'Deep Crimson', hex: '#7A000E', uso: 'Impacto: logo en pecho o espalda, un detalle… solo UN punto de rojo por prenda' },
    { k: 'cyan', t: 'Electric Cyan', hex: '#00C2D1', uso: 'Contraste luminoso: bordados mínimos, cordones, tiradores (ilumina una prenda negra o gris)' },
    { k: 'blanco', t: 'Off-White', hex: '#F2F2F2', uso: 'Espacios y limpieza: letras, gráficos pequeños, etiquetas interiores' }
  ],
  // tamaños de estampado del libro de marca (mm) · pieza: 'delantero' | 'espalda' · yc: el centro, desde el cuello en el hombro · x: desde el centro
  estampados: [
    { k: 'espalda', t: 'Espalda grande (40 × 50)', w: 400, h: 500, pieza: 'espalda', yc0: 90 },
    { k: 'pecho', t: 'Pecho (30 × 30)', w: 300, h: 300, pieza: 'delantero', yc0: 80 },
    { k: 'logo', t: 'Logo pecho izquierdo (12 × 12)', w: 120, h: 120, pieza: 'delantero', yc0: 150, x: 95 }
  ]
};
export const colorDeMarca = hex => MARCA.colores.find(c => c.hex.toLowerCase() === String(hex || '').toLowerCase()) || null;

// ---------- 📚 el CATÁLOGO DE MODELOS (cada uno, con SU plano de referencia) ----------
const C = { negro: '#0D0D0D', gris: '#1C1F26', rojo: '#7A000E', cyan: '#00C2D1', blanco: '#F2F2F2', hueso: '#d8d2c6', vison: '#8a7f73', azul: '#1f2a44', oliva: '#4b5034', rosa: '#c9a0b6', camel: '#b59b74' };
const H = 'HOODED SWEATSHIRTS', T = 'T-SHIRT', W = 'WOMAN', PN = 'PANTS SHORTS AND ALL STYLES_';
export const GRUPOS = [['capucha', '🧥 Sudaderas con capucha'], ['cremallera', '🤐 Con cremallera'], ['sincapucha', '🧶 Sin capucha y jerséis'], ['camisetas', '👕 Camisetas'], ['tops', '✂️ Tops y crop'], ['mangalarga', '🧣 Manga larga'], ['pantalones', '👖 Pantalones'], ['shorts', '🩳 Shorts'], ['faldas', '🌸 Faldas'], ['vestidos', '👗 Vestidos']];
const sud = (cuelloTipo, cierre, puno, bajo, bolsillo) => ({ cuelloTipo, cierre, puno, bajo, bolsillo });
const cam = (mangaTipo, escote = 'redondo', rib = 'si') => ({ mangaTipo, escote, rib });
export const MODELOS = [
  // 🧥 con capucha
  { id: 'm_hood_over', g: 'capucha', t: 'Hoodie oversize clásica', d: 'Canguro, puño y cintura elásticos', k: 'sudadera', opciones: sud('capucha', 'cerrada', 'elastico', 'elastico', 'canguro'), ajuste: 'oversize', tela: 'felpa', color: C.negro, ref: H + '/OVERSIZE/100.png' },
  { id: 'm_hood_boxy', g: 'capucha', t: 'Hoodie boxy de bajo recto', d: 'Ancha y cuadrada, sin cintura', k: 'sudadera', opciones: sud('capucha', 'cerrada', 'ancho', 'recto', 'canguro'), ajuste: 'oversize', tela: 'felpa', color: C.gris, ref: H + '/OVERSIZE/52.png' },
  { id: 'm_hood_larga', g: 'capucha', t: 'Hoodie larga sin bolsillo', d: 'Limpia, para estampar la espalda', k: 'sudadera', opciones: sud('capucha', 'cerrada', 'elastico', 'recto', 'no'), ajuste: 'holgada', tela: 'felpa', color: C.negro, escala: { largo: 1.1 }, ref: H + '/OVERSIZE/73.png' },
  { id: 'm_hood_crop', g: 'capucha', t: 'Hoodie cropped', d: 'Corta, puño y cintura elásticos', k: 'sudadera', opciones: sud('capucha', 'cerrada', 'elastico', 'elastico', 'no'), ajuste: 'holgada', tela: 'felpa', color: C.rojo, escala: { largo: 0.78 }, ref: H + '/CROPPED/12.png' },
  { id: 'm_hood_crop_canguro', g: 'capucha', t: 'Hoodie cropped con canguro', d: 'Corta y ancha, con bolsillo', k: 'sudadera', opciones: sud('capucha', 'cerrada', 'elastico', 'elastico', 'canguro'), ajuste: 'oversize', tela: 'felpa', color: C.hueso, escala: { largo: 0.8 }, ref: H + '/CROPPED/10.png' },
  { id: 'm_hood_ancho', g: 'capucha', t: 'Hoodie de puños y cintura anchos', d: 'Corta, con canalé ancho', k: 'sudadera', opciones: sud('capucha', 'cerrada', 'ancho', 'elastico', 'canguro'), ajuste: 'oversize', tela: 'felpa', color: C.gris, escala: { largo: 0.85 }, ref: H + '/OVERSIZE/55.png' },
  { id: 'm_hood_cordon', g: 'capucha', t: 'Hoodie con cordón en el bajo', d: 'Bajo con jareta, sin cintura', k: 'sudadera', opciones: sud('capucha', 'cerrada', 'elastico', 'cordon', 'canguro'), ajuste: 'holgada', tela: 'felpa', color: C.vison, ref: H + '/OVERSIZE/94.png' },
  { id: 'm_hood_pulgar', g: 'capucha', t: 'Hoodie con puño para el pulgar', d: 'Ajustada, para deporte', k: 'sudadera', opciones: sud('capucha', 'cerrada', 'pulgar', 'elastico', 'no'), ajuste: 'ajustada', tela: 'felpa', color: C.negro, ref: H + '/OVERSIZE/49.png' },
  { id: 'm_hood_media', g: 'capucha', t: 'Hoodie de media cremallera', d: 'Tipo anorak, con canguro', k: 'sudadera', opciones: sud('capucha', 'media', 'elastico', 'elastico', 'canguro'), ajuste: 'holgada', tela: 'felpa', color: C.oliva, ref: H + '/OVERSIZE/94.png' },
  // 🤐 con cremallera
  { id: 'm_zip_clasica', g: 'cremallera', t: 'Zip hoodie clásica', d: 'Cremallera entera y bolsillos', k: 'sudadera', opciones: sud('capucha', 'cremallera', 'elastico', 'elastico', 'canguro'), ajuste: 'normal', tela: 'felpa', color: C.gris, ref: H + '/ZIPPER/58.png' },
  { id: 'm_zip_over', g: 'cremallera', t: 'Zip hoodie oversize', d: 'Ancha, cintura elástica', k: 'sudadera', opciones: sud('capucha', 'cremallera', 'elastico', 'elastico', 'canguro'), ajuste: 'oversize', tela: 'felpa', color: C.negro, ref: H + '/ZIPPER/73.png' },
  { id: 'm_zip_limpia', g: 'cremallera', t: 'Zip hoodie sin bolsillos', d: 'Recta y limpia', k: 'sudadera', opciones: sud('capucha', 'cremallera', 'elastico', 'recto', 'no'), ajuste: 'normal', tela: 'felpa', color: C.blanco, ref: H + '/ZIPPER/82.png' },
  { id: 'm_zip_crop', g: 'cremallera', t: 'Zip hoodie cropped', d: 'Corta y ancha', k: 'sudadera', opciones: sud('capucha', 'cremallera', 'elastico', 'elastico', 'no'), ajuste: 'oversize', tela: 'felpa', color: C.rojo, escala: { largo: 0.78 }, ref: H + '/CROPPED/19.png' },
  { id: 'm_zip_crop_canguro', g: 'cremallera', t: 'Zip cropped con bolsillos', d: 'Corta, con canguro', k: 'sudadera', opciones: sud('capucha', 'cremallera', 'elastico', 'elastico', 'canguro'), ajuste: 'holgada', tela: 'felpa', color: C.vison, escala: { largo: 0.8 }, ref: H + '/CROPPED/20.png' },
  { id: 'm_zip_larga', g: 'cremallera', t: 'Zip hoodie larga de bajo recto', d: 'Boxy, con bolsillos', k: 'sudadera', opciones: sud('capucha', 'cremallera', 'ancho', 'recto', 'canguro'), ajuste: 'holgada', tela: 'felpa', color: C.negro, escala: { largo: 1.08 }, ref: H + '/ZIPPER/109.png' },
  { id: 'm_zip_cuello', g: 'cremallera', t: 'Chaqueta de cuello alto con cremallera', d: 'Sin capucha, track jacket', k: 'sudadera', opciones: sud('alto', 'cremallera', 'elastico', 'elastico', 'no'), ajuste: 'normal', tela: 'felpa', color: C.gris, ref: H + '/ZIPPER/43.png' },
  // 🧶 sin capucha y jerséis
  { id: 'm_crew', g: 'sincapucha', t: 'Sudadera cuello redondo', d: 'La crewneck de siempre', k: 'sudadera', opciones: sud('redondo', 'cerrada', 'elastico', 'elastico', 'no'), ajuste: 'normal', tela: 'felpa', color: C.gris, ref: 'CREWNECK SWEATSHIRTS/38.png' },
  { id: 'm_crew_over', g: 'sincapucha', t: 'Crewneck oversize', d: 'Ancha, de hombro caído', k: 'sudadera', opciones: sud('redondo', 'cerrada', 'elastico', 'elastico', 'no'), ajuste: 'oversize', tela: 'felpa', color: C.negro, ref: 'CREWNECK SWEATSHIRTS/12.png' },
  { id: 'm_crew_crop', g: 'sincapucha', t: 'Crewneck cropped', d: 'Corta y ancha', k: 'sudadera', opciones: sud('redondo', 'cerrada', 'elastico', 'elastico', 'no'), ajuste: 'oversize', tela: 'felpa', color: C.hueso, escala: { largo: 0.78 }, ref: 'CREWNECK SWEATSHIRTS/24.png' },
  { id: 'm_crew_recto', g: 'sincapucha', t: 'Crewneck de bajo recto', d: 'Boxy, sin cintura', k: 'sudadera', opciones: sud('redondo', 'cerrada', 'ancho', 'recto', 'no'), ajuste: 'holgada', tela: 'felpa', color: C.vison, ref: 'CREWNECK SWEATSHIRTS/27.png' },
  { id: 'm_quarter', g: 'sincapucha', t: 'Sudadera de media cremallera', d: 'Cuello alto con cremallera (quarter zip)', k: 'sudadera', opciones: sud('alto', 'media', 'elastico', 'elastico', 'no'), ajuste: 'holgada', tela: 'felpa', color: C.negro, ref: 'CREWNECK SWEATSHIRTS/41.png' },
  { id: 'm_mock', g: 'sincapucha', t: 'Jersey de cuello alto', d: 'Mock neck', k: 'sudadera', opciones: sud('alto', 'cerrada', 'elastico', 'elastico', 'no'), ajuste: 'normal', tela: 'lana', color: C.hueso, ref: 'CREWNECK SWEATSHIRTS/14.png' },
  { id: 'm_jersey', g: 'sincapucha', t: 'Jersey de punto', d: 'Cuello redondo, de lana', k: 'sudadera', opciones: sud('redondo', 'cerrada', 'elastico', 'elastico', 'no'), ajuste: 'normal', tela: 'lana', color: C.camel, ref: 'CREWNECK SWEATSHIRTS/22.png' },
  // 👕 camisetas
  { id: 'm_tee', g: 'camisetas', t: 'Camiseta básica', d: 'Manga corta, cuello con canalé', k: 'camiseta', opciones: cam('corta'), ajuste: 'normal', tela: 'punto', color: C.blanco, ref: T + '/73.png' },
  { id: 'm_tee_over', g: 'camisetas', t: 'Camiseta oversize', d: 'Hombro caído, ancha', k: 'camiseta', opciones: cam('corta'), ajuste: 'oversize', tela: 'punto', color: C.negro, ref: T + '/52.png' },
  { id: 'm_tee_boxy', g: 'camisetas', t: 'Camiseta boxy', d: 'Cuadrada y algo corta', k: 'camiseta', opciones: cam('corta'), ajuste: 'oversize', tela: 'punto', color: C.gris, medidas: { largo: 620 }, ref: T + '/58.png' },
  { id: 'm_tee_larga', g: 'camisetas', t: 'Camiseta larga', d: 'Long tee, holgada', k: 'camiseta', opciones: cam('corta'), ajuste: 'holgada', tela: 'punto', color: C.hueso, medidas: { largo: 800 }, ref: T + '/97.png' },
  { id: 'm_tee_pico', g: 'camisetas', t: 'Camiseta de pico', d: 'V-neck', k: 'camiseta', opciones: cam('corta', 'pico'), ajuste: 'normal', tela: 'punto', color: C.vison, ref: T + '/7.png' },
  // ✂️ tops y crop
  { id: 'm_crop', g: 'tops', t: 'Crop top', d: 'Corto y ancho', k: 'camiseta', opciones: cam('corta'), ajuste: 'holgada', tela: 'punto', color: C.blanco, medidas: { largo: 420 }, ref: T + '/CROPPED/4.png' },
  { id: 'm_baby', para: 'mujer', g: 'tops', t: 'Baby tee', d: 'Ajustada y corta', k: 'camiseta', opciones: cam('corta'), ajuste: 'ajustada', tela: 'punto', color: C.rosa, medidas: { largo: 470 }, ref: T + '/CROPPED/2.png' },
  { id: 'm_tank_crop', g: 'tops', t: 'Top de tirantes corto', d: 'Sin mangas, ajustado', k: 'camiseta', opciones: cam('sin'), ajuste: 'ajustada', tela: 'punto', color: C.negro, medidas: { largo: 400 }, ref: T + '/CROPPED/3.png' },
  { id: 'm_tank', g: 'tops', t: 'Camiseta de tirantes', d: 'Sin mangas, recta', k: 'camiseta', opciones: cam('sin'), ajuste: 'normal', tela: 'punto', color: C.blanco, ref: T + '/CROPPED/35.png' },
  { id: 'm_crop_largo', para: 'mujer', g: 'tops', t: 'Crop de manga larga', d: 'Ajustado y corto', k: 'camiseta', opciones: cam('larga'), ajuste: 'ajustada', tela: 'punto', color: C.negro, medidas: { largo: 430 }, ref: T + '/CROPPED/34.png' },
  { id: 'm_crop_pico', para: 'mujer', g: 'tops', t: 'Crop de pico y manga larga', d: 'Holgado, cuello de pico', k: 'camiseta', opciones: cam('larga', 'pico'), ajuste: 'holgada', tela: 'punto', color: C.gris, medidas: { largo: 450 }, ref: T + '/CROPPED/31.png' },
  // 🧣 manga larga
  { id: 'm_ml', g: 'mangalarga', t: 'Camiseta de manga larga', d: 'La básica', k: 'camiseta', opciones: cam('larga'), ajuste: 'normal', tela: 'punto', color: C.blanco, ref: 'LONG SLEEVE T-SHIRT/3.png' },
  { id: 'm_ml_ajust', para: 'mujer', g: 'mangalarga', t: 'Manga larga ajustada', d: 'Pegada al cuerpo', k: 'camiseta', opciones: cam('larga'), ajuste: 'ajustada', tela: 'punto', color: C.negro, ref: 'LONG SLEEVE T-SHIRT/5.png' },
  { id: 'm_ml_over', g: 'mangalarga', t: 'Manga larga oversize', d: 'Ancha, de hombro caído', k: 'camiseta', opciones: cam('larga'), ajuste: 'oversize', tela: 'punto', color: C.gris, ref: 'LONG SLEEVE T-SHIRT/26.png' },
  // 👖 pantalones
  { id: 'm_pant_recto', g: 'pantalones', t: 'Pantalón recto', d: 'Pierna recta, casual', k: 'pantalon', opciones: { pierna: 'recta' }, ajuste: 'normal', tela: 'gabardina', color: C.negro, ref: PN + '/158.png' },
  { id: 'm_pant_ancho', g: 'pantalones', t: 'Pantalón ancho', d: 'Wide leg', k: 'pantalon', opciones: { pierna: 'ancha' }, ajuste: 'holgada', tela: 'gabardina', color: C.gris, ref: PN + '/212.png' },
  { id: 'm_pant_baggy', g: 'pantalones', t: 'Pantalón baggy', d: 'Muy ancho, caído', k: 'pantalon', opciones: { pierna: 'ancha' }, ajuste: 'oversize', tela: 'denim', color: 'natural', ref: PN + '/13.png' },
  { id: 'm_vaquero', g: 'pantalones', t: 'Vaquero recto', d: 'Denim, pierna recta', k: 'pantalon', opciones: { pierna: 'recta' }, ajuste: 'normal', tela: 'denim', color: 'natural', ref: PN + '/164.png' },
  { id: 'm_pitillo', g: 'pantalones', t: 'Pantalón pitillo', d: 'Estrecho', k: 'pantalon', opciones: { pierna: 'pitillo' }, ajuste: 'ajustada', tela: 'elastica', color: C.negro, ref: PN + '/50.png' },
  { id: 'm_leggings', g: 'pantalones', t: 'Leggings', d: 'Pegados, de punto elástico', k: 'pantalon', opciones: { pierna: 'pitillo' }, ajuste: 'ajustada', tela: 'elastica', color: C.negro, ref: W + '/1 (1).svg' },
  // 🩳 shorts
  { id: 'm_bermuda', g: 'shorts', t: 'Bermuda ancha', d: 'Por la rodilla', k: 'pantalon', opciones: { pierna: 'ancha' }, ajuste: 'holgada', tela: 'gabardina', color: C.vison, escala: { largo: 0.55 }, ref: PN + '/104.png' },
  { id: 'm_short', g: 'shorts', t: 'Short', d: 'Corto y holgado', k: 'pantalon', opciones: { pierna: 'recta' }, ajuste: 'oversize', tela: 'punto', color: C.gris, escala: { largo: 0.42 }, ref: PN + '/152.png' },
  { id: 'm_short_vaquero', g: 'shorts', t: 'Short vaquero', d: 'Denim, recto', k: 'pantalon', opciones: { pierna: 'recta' }, ajuste: 'normal', tela: 'denim', color: 'natural', escala: { largo: 0.42 }, ref: PN + '/218.png' },
  { id: 'm_ciclista', g: 'shorts', t: 'Short ciclista', d: 'Ajustado, de punto elástico', k: 'pantalon', opciones: { pierna: 'pitillo' }, ajuste: 'ajustada', tela: 'elastica', color: C.negro, escala: { largo: 0.42 }, ref: W + '/93 (1).svg' },
  // 🌸 faldas
  { id: 'm_mini_vuelo', g: 'faldas', t: 'Minifalda de vuelo', d: 'Corta, con vuelo (tipo plisada)', k: 'falda', opciones: { forma: 'evase' }, ajuste: 'normal', tela: 'gabardina', color: C.gris, medidas: { largo: 380, vuelo: 80 }, ref: W + '/85 (1).svg' },
  { id: 'm_mini_recta', g: 'faldas', t: 'Minifalda recta', d: 'Corta y entallada', k: 'falda', opciones: { forma: 'recta' }, ajuste: 'ajustada', tela: 'gabardina', color: C.negro, medidas: { largo: 380 }, ref: W + '/37 (1).svg' },
  { id: 'm_falda_midi', g: 'faldas', t: 'Falda midi de vuelo', d: 'Por debajo de la rodilla', k: 'falda', opciones: { forma: 'evase' }, ajuste: 'normal', tela: 'saten', color: C.rojo, medidas: { largo: 720, vuelo: 110 }, ref: W + '/75 (1).svg' },
  // 👗 vestidos
  { id: 'm_vest_plisado', g: 'vestidos', t: 'Vestido de tirantes con vuelo', d: 'Cuerpo entallado y falda con vuelo (plisada)', k: 'vestido', opciones: { mangaTipo: 'sin', falda: 'evase' }, ajuste: 'ajustada', tela: 'gabardina', color: C.gris, medidas: { largo: 430, vuelo: 110 }, ref: W + '/47 (1).svg' },
  { id: 'm_vest_tenis', g: 'vestidos', t: 'Vestido corto de vuelo', d: 'Sin mangas, tipo tenis', k: 'vestido', opciones: { mangaTipo: 'sin', falda: 'evase' }, ajuste: 'normal', tela: 'punto', color: C.blanco, medidas: { largo: 420, vuelo: 90 }, ref: W + '/78 (1).svg' },
  { id: 'm_vest_lencero', g: 'vestidos', t: 'Vestido lencero corto', d: 'Recto, de satén', k: 'vestido', opciones: { mangaTipo: 'sin', falda: 'recta' }, ajuste: 'normal', tela: 'saten', color: C.negro, medidas: { largo: 420 }, ref: W + '/13 (1).svg' },
  { id: 'm_vest_manga', g: 'vestidos', t: 'Vestido de manga corta con vuelo', d: 'Mini, con falda de vuelo', k: 'vestido', opciones: { mangaTipo: 'corta', falda: 'evase' }, ajuste: 'normal', tela: 'gabardina', color: C.rojo, medidas: { largo: 420, vuelo: 100 }, ref: W + '/41 (1).svg' },
  { id: 'm_vest_ajustado', g: 'vestidos', t: 'Vestido ajustado de manga larga', d: 'Bodycon, por encima de la rodilla', k: 'vestido', opciones: { mangaTipo: 'larga', falda: 'recta' }, ajuste: 'ajustada', tela: 'elastica', color: C.negro, medidas: { largo: 480 }, ref: W + '/9.svg' }
];

const EMOJI = Object.fromEntries(GRUPOS.map(([k, t]) => [k, t.split(' ')[0]]));
MODELOS.forEach(m => { m.e = m.e || EMOJI[m.g] || '👗'; });

// ---------- 📁 su carpeta (en el PC): NOORKO1 ----------
const CLAVE = 'cd.drew.marca.carpeta';
export const enPC = () => !!(desktop && desktop.on);
export async function carpeta() {
  try { const g = localStorage.getItem(CLAVE); if (g) return g; } catch (e) { }
  if (!enPC()) return null;
  try { const I = await desktop.info(), b = String((I && I.backupDir) || ''), i = b.toLowerCase().indexOf('\\appdata\\'); if (i > 0) return b.slice(0, i) + '\\Desktop\\CELEBRIDISENOS\\00_SISTEMA\\NOORKO1'; } catch (e) { }
  return null;
}
export function guardaCarpeta(p) { try { if (p) localStorage.setItem(CLAVE, p); else localStorage.removeItem(CLAVE); } catch (e) { } }
export async function existe(p) { if (!p || !enPC()) return false; try { await desktop.list(p); return true; } catch (e) { return false; } }
const unir = (a, b) => String(a).replace(/[\\/]+$/, '') + '\\' + String(b).replace(/\//g, '\\');
export const rutaPlano = (base, ref) => unir(unir(base, 'MOCKUP VECTORS\\MOCKUP VECTORS'), ref);
export const urlDe = ruta => desktop.fileUrl(ruta);
// las imágenes de unas subcarpetas (sus diseños, sus logos), hasta «prof» niveles
export async function imagenes(base, subs, max = 80, prof = 3) {
  const out = [], vis = async (p, n) => { if (out.length >= max || n > prof) return; let r; try { r = await desktop.list(p); } catch (e) { return; }
    for (const e of (r.entries || [])) { if (out.length >= max) break; if (e.type === 'dir') await vis(e.path, n + 1); else if (/\.(png|jpe?g|webp|svg)$/i.test(e.name)) out.push({ nombre: e.name.replace(/\.[^.]+$/, ''), ruta: e.path, carpeta: p }); } };
  for (const s of subs) await vis(unir(base, s), 1);
  return out;
}
// una imagen de su carpeta → dataURL (para estamparla en la prenda)
export async function aDataUrl(ruta) { const r = await fetch(desktop.fileUrl(ruta)); if (!r.ok) throw new Error('No puedo leer ' + ruta); const b = await r.blob(); return await new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(b); }); }
// un plano técnico (PNG o SVG) → JPEG sobre blanco, TEÑIDO del color de la prenda (lo gris claro toma el color; las líneas siguen oscuras)
export function planoAJpg(src, color, maxPx = 1600) {
  return new Promise(res => { const im = new Image(); im.onload = () => { const k = Math.min(1, maxPx / Math.max(im.naturalWidth || 800, im.naturalHeight || 400)), w = Math.max(1, Math.round((im.naturalWidth || 800) * k)), h = Math.max(1, Math.round((im.naturalHeight || 400) * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
      if (/^#[0-9a-f]{6}$/i.test(color || '')) { const d = g.getImageData(0, 0, w, h), p = d.data, rgb0 = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)), lum = (0.299 * rgb0[0] + 0.587 * rgb0[1] + 0.114 * rgb0[2]) / 255,
          kk = lum < 0.26 ? (0.26 - lum) / (1 - lum) : 0, rgb = rgb0.map(v => Math.round(v + (255 - v) * kk)); // (17-10: una prenda negra se pinta gris muy oscuro: si no, las costuras negras del plano no se ven)
        for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 8) continue; const l = (p[i] + p[i + 1] + p[i + 2]) / 765, s = Math.max(p[i], p[i + 1], p[i + 2]) - Math.min(p[i], p[i + 1], p[i + 2]); if (s > 30) continue; // (solo lo gris: la tela)
          const t = Math.min(1, l / 0.82); for (let j = 0; j < 3; j++) p[i + j] = Math.round(rgb[j] * t + (l < 0.35 ? p[i + j] * (1 - t) : 0)); }
        g.putImageData(d, 0, 0); }
      const o = document.createElement('canvas'); o.width = w; o.height = h; const g2 = o.getContext('2d'); g2.fillStyle = '#ffffff'; g2.fillRect(0, 0, w, h); g2.drawImage(c, 0, 0);
      const b = atob(o.toDataURL('image/jpeg', 0.9).split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); res({ jpg: a, w, h }); };
    im.onerror = () => res(null); im.src = src; });
}
