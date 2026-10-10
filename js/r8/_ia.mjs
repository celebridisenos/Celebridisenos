globalThis.localStorage = { getItem(){return null}, setItem(){} };
const N = await import('./nucleo.js'); await N.cargar(); const C = await import('./catalogo.js'); const I = await import('./ia_disenador_nodo.mjs');
for (const frase of process.argv.slice(2)) {
  const t0 = Date.now();
  const r = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', body: JSON.stringify({ model: 'qwen3:8b', stream: false, think: false, format: I.ESQUEMA, messages: [{ role: 'system', content: I.prompt(C) }, { role: 'user', content: frase }], options: { temperature: 0.2, num_ctx: 8192 } }) });
  const j = await r.json(); const txt = j.message.content;
  let o; try { o = JSON.parse(txt); } catch (e) { console.log('NO JSON', txt.slice(0,300)); continue; }
  const cu = I.aCuerpos(o, C);
  console.log('«' + frase + '»', (Date.now()-t0)+'ms\n  IA:', JSON.stringify(o).slice(0, 600), '\n  cuerpos:', cu.map(c => (c.hueco?'-':'+') + (c.tipo==='cat'?'cat:'+c.p.k:c.tipo) + ' ' + JSON.stringify(c.tipo==='cat'?{}:c.p) + ' @' + c.t.pos.join(',')).join(' | '));
}
