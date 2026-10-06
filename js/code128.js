// ================= v15.0 · Código de barras CODE 128 (sin librerías) =================
// code128(texto) → anchos de barra/espacio en módulos, empezando por barra (sin zona blanca).
// Solo números y de longitud par (≥ 4) → juego C (más corto); el resto → juego B (letras, números y signos).
// Lo leen todos los lectores de mano y las cámaras de los móviles.
const P = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
  '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
  '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
  '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
  '114131 311141 411131 211412 211214 211232 2331112').split(' ');
const START_B = 104, START_C = 105;

// Lo que se puede codificar: ASCII imprimible. Las tildes y la ñ se cambian por su letra sin tilde.
export function limpiar128(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n').replace(/Ñ/g, 'N').replace(/[^\x20-\x7e]/g, '').slice(0, 60);
}
export function code128(texto) {
  const s = limpiar128(texto);
  if (!s) return [];
  const codes = [];
  if (/^\d+$/.test(s) && s.length >= 4 && s.length % 2 === 0) {
    codes.push(START_C);
    for (let i = 0; i < s.length; i += 2) codes.push(Number(s.substr(i, 2)));
  } else {
    codes.push(START_B);
    for (const ch of s) codes.push(ch.charCodeAt(0) - 32);
  }
  let sum = codes[0];
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103, 106);
  const out = [];
  codes.forEach(c => { for (const d of P[c]) out.push(Number(d)); });
  return out;
}
// Módulos totales con 10 de zona blanca a cada lado
export const modulos128 = anchos => anchos.reduce((a, b) => a + b, 0) + 20;
