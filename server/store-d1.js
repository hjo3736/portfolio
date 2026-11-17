// 댓글 저장소 — D1(SQLite). 로컬 미리보기·테스트(Miniflare)가 쓴다. DynamoDB 쪽은 store-dynamo.js, 메서드 모양이 같다.
const publicColumns = 'id, post_slug, name, body, created_at, updated_at';

export function d1Store(db) {
  return {
    async list(slug, cursor) {
      const rows = cursor ? await db.prepare(`SELECT ${publicColumns} FROM comments WHERE post_slug = ? AND (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT 21`).bind(slug, cursor.time, cursor.time, cursor.id).all()
        : await db.prepare(`SELECT ${publicColumns} FROM comments WHERE post_slug = ? ORDER BY created_at DESC, id DESC LIMIT 21`).bind(slug).all();
      return rows.results;
    },
    async count(slug) { return (await db.prepare('SELECT COUNT(*) AS total FROM comments WHERE post_slug = ?').bind(slug).first()).total; },
    find(id) { return db.prepare('SELECT * FROM comments WHERE id = ?').bind(id).first(); },
    findInPost(id, slug) { return db.prepare('SELECT * FROM comments WHERE id = ? AND post_slug = ?').bind(id, slug).first(); },
    async insert(row) { await db.prepare('INSERT INTO comments (id, post_slug, name, body, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(row.id, row.post_slug, row.name, row.body, row.password_hash, row.salt, row.created_at, row.updated_at).run(); },
    async update(id, slug, updatedAt, { name, body, updated_at }) { return (await db.prepare('UPDATE comments SET name = ?, body = ?, updated_at = ? WHERE id = ? AND post_slug = ? AND updated_at = ?').bind(name, body, updated_at, id, slug, updatedAt).run()).meta.changes > 0; },
    async remove(id, slug, updatedAt) { return (await db.prepare('DELETE FROM comments WHERE id = ? AND post_slug = ? AND updated_at = ?').bind(id, slug, updatedAt).run()).meta.changes > 0; },
    async hit(key, now, expiresAt) {
      const row = await db.prepare('INSERT INTO comment_limits (key, hits, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET hits = hits + 1 RETURNING hits').bind(key, expiresAt).first();
      await db.prepare('DELETE FROM comment_limits WHERE expires_at < ?').bind(now).run();
      return row.hits;
    },
  };
}
