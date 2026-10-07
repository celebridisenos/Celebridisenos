// Sustituto LOCAL de Cloudflare D1 para pruebas (misma interfaz: prepare/bind/first/all/run/batch) sobre SQLite de Node.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plain = r => r ? Object.assign({}, r) : null;
class Stmt {
  constructor(d1, sql, params) { this.d1 = d1; this.sql = sql; this.params = params || []; }
  bind(...a) {
    a.forEach((v, i) => { if (v === undefined) throw new Error('D1_TYPE_ERROR: undefined en el parámetro ' + (i + 1)); });
    return new Stmt(this.d1, this.sql, a);
  }
  _st() { this.d1.queries++; return this.d1.db.prepare(this.sql); }
  async first(col) { const r = plain(this._st().get(...this.params)); return r && col ? r[col] : r; }
  async all() { return { success: true, results: this._st().all(...this.params).map(plain) }; }
  async run() { const r = this._st().run(...this.params); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }
}
export class D1 {
  constructor(file) { this.db = new DatabaseSync(file || ':memory:'); this.queries = 0; this.db.exec(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8')); }
  prepare(sql) { return new Stmt(this, sql); }
  async batch(list) {
    this.db.exec('BEGIN');
    try { const out = []; for (const s of list) out.push(await s.run()); this.db.exec('COMMIT'); return out; } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  async exec(sql) { this.db.exec(sql); return { count: 1 }; }
}
