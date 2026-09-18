import test from 'node:test';
import assert from 'node:assert/strict';
import { startLocal } from '../scripts/local-worker.js';

test('댓글 생성·조회·수정·삭제, 비밀번호, 글별 격리, 재시도와 입력 제한', async () => {
  const { mf, db } = await startLocal();
  const base = 'http://localhost/api/posts/starting-a-development-journal/comments';
  const send = (url, method = 'GET', body, extra = {}) => mf.dispatchFetch(url, { method, headers: { Origin: 'http://localhost', 'Content-Type': 'application/json', ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    let response = await send(base); assert.equal(response.status, 200); assert.equal((await response.json()).total, 0);
    const data = { id: crypto.randomUUID(), name: '테스트 방문자', body: '첫 줄\n<script>alert(1)</script>', password: 'test-only-password-123' };
    response = await send(base, 'POST', data); assert.equal(response.status, 201);
    response = await send(base, 'POST', data); assert.equal(response.status, 200, '같은 요청 재시도는 중복 생성하지 않는다');
    const stored = await db.prepare('SELECT * FROM comments WHERE id = ?').bind(data.id).first();
    assert.notEqual(stored.password_hash, data.password); assert.equal(stored.salt.length, 64); assert.equal(stored.password_hash.length, 64);
    response = await send(base); const listing = await response.json(); assert.equal(listing.total, 1); assert.equal(listing.items[0].body, data.body);
    assert.equal('password_hash' in listing.items[0], false); assert.equal('salt' in listing.items[0], false);
    response = await send(base.replace('starting-a-development-journal', 'animation-and-idle-time')); assert.equal((await response.json()).total, 0);
    response = await send(base.replace('starting-a-development-journal', 'not-published'), 'POST', { ...data, id: crypto.randomUUID() }); assert.equal(response.status, 404);
    response = await send(base, 'POST', { ...data, id: crypto.randomUUID() }, { Origin: 'https://another-site.invalid' }); assert.equal(response.status, 403);
    response = await send(base, 'POST', { ...data, password: '1234' }); assert.equal(response.status, 400);
    response = await send(base, 'POST', { ...data, body: 'a'.repeat(2001) }); assert.equal(response.status, 400);
    response = await send(base, 'POST', { ...data, body: 'a'.repeat(15000) }); assert.equal(response.status, 413);
    const itemUrl = `${base}/${data.id}`;
    response = await send(itemUrl, 'DELETE', { password: 'wrong-password', updatedAt: stored.updated_at }); assert.equal(response.status, 403);
    response = await send(itemUrl, 'PATCH', { ...data, name: '수정 이름', body: '수정한 댓글', password: 'wrong-password', updatedAt: stored.updated_at }); assert.equal(response.status, 403);
    response = await send(itemUrl.replace('starting-a-development-journal', 'animation-and-idle-time'), 'DELETE', { password: data.password, updatedAt: stored.updated_at }); assert.equal(response.status, 404);
    response = await send(itemUrl, 'PATCH', { ...data, body: '수정한 댓글', updatedAt: stored.updated_at }); assert.equal(response.status, 200);
    response = await send(itemUrl, 'PATCH', { ...data, body: '오래된 화면에서 수정', updatedAt: stored.updated_at }); assert.equal(response.status, 409);
    const updated = await db.prepare('SELECT * FROM comments WHERE id = ?').bind(data.id).first(); assert.equal(updated.body, '수정한 댓글');
    response = await send(itemUrl, 'DELETE', { password: data.password, updatedAt: updated.updated_at }); assert.equal(response.status, 200);
    response = await send(base); assert.equal((await response.json()).total, 0);
    // Seed fixtures only in the isolated local test database to verify pagination without bypassing production rate limits.
    for (let i = 0; i < 25; i++) await db.prepare('INSERT INTO comments (id,post_slug,name,body,password_hash,salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), 'starting-a-development-journal', 'fixture', 'text', stored.password_hash, stored.salt, 1700000000000 + i, 1700000000000 + i).run();
    response = await send(base); const first = await response.json(); assert.equal(first.items.length, 20); assert.equal(first.total, 25); assert.ok(first.cursor);
    response = await send(`${base}?cursor=${encodeURIComponent(first.cursor)}`); const second = await response.json(); assert.equal(second.items.length, 5); assert.equal(second.cursor, null);
    assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 25);
    response = await send(`${base}?cursor=broken`); assert.equal(response.status, 400);
    for (let i = 0; i < 3; i++) { response = await send(base, 'POST', { ...data, id: crypto.randomUUID() }); assert.equal(response.status, 201); }
    response = await send(base, 'POST', { ...data, id: crypto.randomUUID() }); assert.equal(response.status, 429);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  } finally { await mf.dispose(); }
});
