// ================= v18 · 🧊 CelebriR8 · 📱 MEDIDAS DE MÓVILES (para las fundas) =================
// Lo pidió la dueña (9-10-2026): fundas para las gamas de iPhone, la gama S de Samsung y algunos Xiaomi, «que encajen».
//
// QUÉ ES SEGURO Y QUÉ NO (importante: aquí no se inventa nada):
//  · ALTO × ANCHO × GROSOR del cuerpo: son las medidas OFICIALES que publica cada fabricante (comprobadas el 9-10-2026 en
//    las fichas de Apple, Samsung y Xiaomi y en comparadores de especificaciones). Con ellas la funda abraza el móvil.
//  · La VENTANA DE LA CÁMARA y las ABERTURAS de los botones NO las publica ningún fabricante en una tabla. Por eso aquí van
//    AMPLIAS y marcadas como ESTIMADAS: [tipo, % del ancho, % del alto]. No tapan nada aunque no sean exactas, y la pantalla
//    ofrece la «prueba rápida» (una funda bajita, 15 minutos) para comprobarlo con el móvil delante antes de imprimir la buena.
//  · El REDONDEO de las esquinas también es ESTIMADO y se pone pequeño a propósito: una esquina de funda menos redonda que
//    la del móvil siempre entra; al revés, no.
// Para añadir un modelo: una línea con sus medidas oficiales. Si no sabes la cámara, pon 'ancha' (una franja de lado a lado).
//            marca      modelo                 alto    ancho  grosor  cámara: tipo, ancho %, alto %    esquina
export const MOVILES = [
  ['iPhone', 'iPhone 17 Pro Max', 163.4, 78.0, 8.75, 'ancha', 100, 26, 7], ['iPhone', 'iPhone 17 Pro', 150.0, 71.9, 8.75, 'ancha', 100, 27, 7], ['iPhone', 'iPhone 17', 149.6, 71.5, 7.95, 'izq', 56, 29, 7], ['iPhone', 'iPhone Air', 156.2, 74.7, 5.64, 'ancha', 100, 17, 7],
  ['iPhone', 'iPhone 16 Pro Max', 163.03, 77.58, 8.25, 'izq', 60, 30, 7], ['iPhone', 'iPhone 16 Pro', 149.61, 71.45, 8.25, 'izq', 62, 31, 7], ['iPhone', 'iPhone 16 Plus', 160.88, 77.75, 7.8, 'izq', 48, 30, 7], ['iPhone', 'iPhone 16', 147.63, 71.62, 7.8, 'izq', 50, 31, 7],
  ['iPhone', 'iPhone 15 Pro Max', 159.9, 76.7, 8.25, 'izq', 60, 30, 7], ['iPhone', 'iPhone 15 Pro', 146.6, 70.6, 8.25, 'izq', 62, 31, 7], ['iPhone', 'iPhone 15 Plus', 160.9, 77.8, 7.8, 'izq', 54, 28, 7], ['iPhone', 'iPhone 15', 147.6, 71.6, 7.8, 'izq', 56, 29, 7],
  ['iPhone', 'iPhone 14 Pro Max', 160.7, 77.6, 7.85, 'izq', 60, 30, 7], ['iPhone', 'iPhone 14 Pro', 147.5, 71.5, 7.85, 'izq', 62, 31, 7], ['iPhone', 'iPhone 14 Plus', 160.8, 78.1, 7.8, 'izq', 54, 28, 7], ['iPhone', 'iPhone 14', 146.7, 71.5, 7.8, 'izq', 56, 29, 7],
  ['iPhone', 'iPhone 13 Pro Max', 160.8, 78.1, 7.65, 'izq', 58, 29, 7], ['iPhone', 'iPhone 13 Pro', 146.7, 71.5, 7.65, 'izq', 60, 30, 7], ['iPhone', 'iPhone 13', 146.7, 71.5, 7.65, 'izq', 54, 28, 7], ['iPhone', 'iPhone 13 mini', 131.5, 64.2, 7.65, 'izq', 58, 30, 7],
  ['Samsung', 'Galaxy S25 Ultra', 162.82, 77.65, 8.25, 'izq', 56, 38, 4], ['Samsung', 'Galaxy S25+', 158.44, 75.79, 7.35, 'izq', 44, 35, 6], ['Samsung', 'Galaxy S25', 146.94, 70.46, 7.25, 'izq', 46, 36, 6],
  ['Samsung', 'Galaxy S24 Ultra', 162.3, 79.0, 8.6, 'izq', 56, 38, 2], ['Samsung', 'Galaxy S24+', 158.5, 75.9, 7.7, 'izq', 44, 35, 6], ['Samsung', 'Galaxy S24', 147.0, 70.6, 7.6, 'izq', 46, 36, 6],
  ['Samsung', 'Galaxy S23 Ultra', 163.4, 78.1, 8.9, 'izq', 56, 38, 2], ['Samsung', 'Galaxy S23+', 157.8, 76.2, 7.6, 'izq', 44, 35, 6], ['Samsung', 'Galaxy S23', 146.3, 70.9, 7.6, 'izq', 46, 36, 6],
  ['Samsung', 'Galaxy S22 Ultra', 163.3, 77.9, 8.9, 'izq', 56, 38, 2], ['Samsung', 'Galaxy S22+', 157.4, 75.8, 7.6, 'izq', 50, 35, 6], ['Samsung', 'Galaxy S22', 146.0, 70.6, 7.6, 'izq', 52, 36, 6],
  ['Xiaomi', 'Redmi Note 14', 162.4, 75.7, 8.0, 'ancha', 100, 30, 5], ['Xiaomi', 'Redmi Note 13', 162.24, 75.55, 7.97, 'ancha', 100, 30, 5], ['Xiaomi', 'Redmi Note 13 Pro 5G', 161.15, 74.24, 7.98, 'ancha', 100, 30, 5],
  ['Xiaomi', 'Xiaomi 14', 152.8, 71.5, 8.2, 'ancha', 100, 32, 5], ['Xiaomi', 'Xiaomi 14T', 160.5, 75.1, 7.8, 'ancha', 100, 30, 5], ['Xiaomi', 'Xiaomi 14T Pro', 160.4, 75.1, 8.4, 'ancha', 100, 30, 5], ['Xiaomi', 'POCO X6 Pro', 160.45, 74.34, 8.25, 'ancha', 100, 30, 5]
];
export const movil = nombre => { const m = MOVILES.find(x => x[1] === nombre); return m ? { marca: m[0], modelo: m[1], alto: m[2], ancho: m[3], grosor: m[4], camara: m[5], camAncho: m[6], camAlto: m[7], radio: m[8] } : null; };
// Lo que cambia con el material. TPU (flexible): se estira para entrar, lleva labio que sujeta la pantalla. PLA (rígido): no
// se estira, así que más holgura, casi sin labio y las aberturas de los lados le dan el juego para meter el móvil. ESTIMADO.
export const MATERIAL = { tpu: { ajuste: 0.1, labio: 0.9, pared: 1.6 }, pla: { ajuste: 0.2, labio: 0.4, pared: 1.4 } };
