import { digest, hashPassword, newSalt, verifyPassword } from './password.js';
import { d1Store } from './store-d1.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
// env.store(DynamoDB 등)가 있으면 그것을, 없으면 Worker의 D1 바인딩(env.DB)을 쓴다.
function database(env) { if (env.store) return env.store; if (!env.DB) throw new Error('Missing comment storage'); return d1Store(env.DB); }

async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, '댓글 요청 형식이 올바르지 않습니다.');
  if (Number(request.headers.get('content-length')) > 14000) throw new HttpError(413, '입력 내용이 너무 깁니다.');
  if (!request.body) throw new HttpError(400, '입력 내용을 확인해 주세요.');
  const reader = request.body.getReader();
  let bytes = 0, chunks = [];
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    bytes += value.byteLength;
    if (bytes > 14000) { await reader.cancel(); throw new HttpError(413, '입력 내용이 너무 깁니다.'); }
    chunks.push(value);
  }
  const all = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const body = JSON.parse(new TextDecoder().decode(all));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new HttpError(400, '입력 내용을 확인해 주세요.'); }
}
function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128 || !value.trim()) throw new HttpError(400, '비밀번호는 8~128자로 입력해 주세요.');
}
function validateText(body) {
  if (typeof body.name !== 'string' || body.name.trim().length < 1 || body.name.trim().length > 30 || /[\r\n\x00-\x1f]/.test(body.name)) throw new HttpError(400, '이름은 줄바꿈 없이 1~30자로 입력해 주세요.');
  if (typeof body.body !== 'string' || body.body.trim().length < 1 || body.body.trim().length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(body.body)) throw new HttpError(400, '댓글은 1~2,000자로 입력해 주세요.');
}
async function limit(db, request, scope, max) {
  const now = Date.now(), window = 10 * 60 * 1000;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = await digest(`vertex-comments:${Math.floor(now / window)}:${scope}:${ip}`);
  if (await db.hit(key, now, now + window) > max) throw new HttpError(429, '요청이 너무 많습니다. 10분 뒤 다시 시도해 주세요.');
}

export async function handleComments(request, env, publishedSlugs) {
  try {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/posts\/([a-z0-9-]+)\/comments(?:\/([0-9a-f-]+))?\/?$/i);
    if (!match || !publishedSlugs.includes(match[1])) return json({ error: '글을 찾을 수 없습니다.' }, 404);
    const [, slug, id] = match;
    if (id && !uuid.test(id)) return json({ error: '댓글을 찾을 수 없습니다.' }, 404);
    const db = database(env);
    if (request.method === 'GET' && !id) {
      const cursor = url.searchParams.get('cursor');
      let position = null;
      if (cursor) {
        const [time, cursorId] = cursor.split(':');
        if (!/^\d{13}$/.test(time) || !uuid.test(cursorId || '')) throw new HttpError(400, '목록 주소가 올바르지 않습니다.');
        position = { time: Number(time), id: cursorId };
      }
      const rows = await db.list(slug, position), total = await db.count(slug);
      const items = rows.slice(0, 20), last = items.at(-1);
      return json({ items, total, cursor: rows.length > 20 ? `${last.created_at}:${last.id}` : null });
    }
    if (!(request.method === 'POST' && !id) && !(['PATCH', 'DELETE'].includes(request.method) && id)) return json({ error: '지원하지 않는 요청입니다.' }, 405);
    if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, '이 사이트에서 다시 시도해 주세요.');
    const data = await readBody(request);
    validatePassword(data.password);
    if (request.method !== 'DELETE') validateText(data);
    await limit(db, request, request.method === 'POST' ? 'create' : 'manage', request.method === 'POST' ? 5 : 10);
    if (request.method === 'POST') {
      if (!uuid.test(data.id || '')) throw new HttpError(400, '댓글 요청을 새로 시작해 주세요.');
      const existing = await db.find(data.id, slug);
      if (existing) {
        if (existing.post_slug !== slug || existing.name !== data.name.trim() || existing.body !== data.body.trim() || !(await verifyPassword(data.password, existing.salt, existing.password_hash))) throw new HttpError(409, '이미 처리된 요청입니다. 목록을 새로 확인해 주세요.');
        return json({ saved: true }, 200);
      }
      const salt = newSalt(), hash = await hashPassword(data.password, salt), now = Date.now();
      await db.insert({ id: data.id, post_slug: slug, name: data.name.trim(), body: data.body.trim(), password_hash: hash, salt, created_at: now, updated_at: now });
      return json({ saved: true }, 201);
    }
    const row = await db.findInPost(id, slug);
    if (!row) throw new HttpError(404, '댓글이 삭제되었거나 존재하지 않습니다.');
    if (!(await verifyPassword(data.password, row.salt, row.password_hash))) throw new HttpError(403, '비밀번호가 일치하지 않습니다.');
    if (data.updatedAt !== row.updated_at) throw new HttpError(409, '댓글이 변경되었습니다. 목록을 새로 불러온 뒤 다시 시도해 주세요.');
    const changed = request.method === 'DELETE' ? await db.remove(id, slug, row.updated_at)
      : await db.update(id, slug, row.updated_at, { name: data.name.trim(), body: data.body.trim(), updated_at: Math.max(Date.now(), row.updated_at + 1) });
    if (!changed) throw new HttpError(409, '댓글이 변경되었습니다. 목록을 새로 확인해 주세요.');
    return json({ saved: true });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status, error.status === 429 ? { 'Retry-After': '600' } : {});
    console.error('Comment storage request failed');
    return json({ error: '댓글을 처리하지 못했습니다. 입력한 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.' }, 503);
  }
}
