import { Miniflare } from 'miniflare';
import fs from 'node:fs';
import path from 'node:path';

export async function startLocal({ persist = false, port = 0, commentsPath = '.sites-runtime/comments' } = {}) {
  const mf = new Miniflare({ modules: true, scriptPath: path.resolve('dist/server/index.js'), compatibilityDate: '2026-08-01',
    host: '127.0.0.1', port, cf: false, d1Databases: ['DB'], d1Persist: persist ? path.resolve(commentsPath) : false });
  const db = await mf.getD1Database('DB');
  await db.prepare('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)').run();
  for (const file of fs.readdirSync('drizzle').filter(file => file.endsWith('.sql')).sort()) {
    if (await db.prepare('SELECT name FROM local_migrations WHERE name = ?').bind(file).first()) continue;
    const sql = fs.readFileSync(path.join('drizzle', file), 'utf8');
    const statements = sql.split('--> statement-breakpoint').map(text => text.trim()).filter(Boolean);
    await db.batch([...statements.map(statement => db.prepare(statement)), db.prepare('INSERT INTO local_migrations (name) VALUES (?)').bind(file)]);
  }
  return { mf, db };
}
