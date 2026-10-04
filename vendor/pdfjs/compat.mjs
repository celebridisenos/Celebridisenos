// v13.5 · Compatibilidad de pdf.js con móviles algo antiguos.
// pdf.js 4.10 usa Promise.withResolvers (Chrome 119 / Safari 17.4) y AbortSignal.any (Chrome 116 / Safari 17.4).
// En un iPhone con iOS 16–17.3 o un Android con Chrome antiguo daba «Promise.withResolvers is not a function»
// y no se podía ver ni adjuntar el PDF de una etiqueta. Esto añade lo que falta ANTES de cargar pdf.js
// (en la página y dentro del «worker»). Si el navegador ya lo tiene, no cambia nada.
const G = typeof globalThis !== 'undefined' ? globalThis : self;
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () { let resolve, reject; const promise = new this((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
}
if (typeof Promise.try !== 'function') {
  Promise.try = function (fn, ...args) { return new this(r => r(fn(...args))); };
}
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', { configurable: true, writable: true, value: function (i) { i = Math.trunc(i) || 0; if (i < 0) i += this.length; return i < 0 || i >= this.length ? undefined : this[i]; } });
}
if (!Object.hasOwn) Object.hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
if (!String.prototype.replaceAll) {
  Object.defineProperty(String.prototype, 'replaceAll', { configurable: true, writable: true, value: function (a, b) { return a instanceof RegExp ? this.replace(a, b) : this.split(a).join(typeof b === 'function' ? b(a) : b); } });
}
if (G.AbortSignal && typeof G.AbortSignal.any !== 'function' && typeof G.AbortController === 'function') {
  G.AbortSignal.any = function (signals) {
    const ac = new AbortController();
    for (const s of signals) { if (s.aborted) { ac.abort(s.reason); return ac.signal; } }
    for (const s of signals) s.addEventListener('abort', () => ac.abort(s.reason), { once: true });
    return ac.signal;
  };
}
export const compatOk = true;
