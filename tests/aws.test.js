import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { startLocal } from '../scripts/local-worker.js';
import { d1Store } from '../server/store-d1.js';

// npm run build가 만든 .aws-build/를 검사한다 (comments.test.js가 dist/server를 쓰는 것과 같다).
test('CloudFront 라우터는 아는 페이지만 index.html로 보내고 모르는 주소는 404로 답한다', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync('.aws-build/router.js', 'utf8'), context);
  const run = uri => context.handler({ request: { uri, headers: {} } });
  assert.equal(run('/').uri, '/index.html');
  assert.equal(run('/about').uri, '/about/index.html');
  assert.equal(run('/about/').uri, '/about/index.html');
  assert.equal(run('/blog/starting-a-development-journal').uri, '/blog/starting-a-development-journal/index.html');
  assert.equal(run('/assets/index-ABC.js').uri, '/assets/index-ABC.js');
  const missing = run('/no-such-page');
  assert.equal(missing.statusCode, 404); assert.match(missing.body.data, /<div id="root">/);
  assert.equal(run('/blog/not-published').statusCode, 404);
});

test('Lambda 어댑터는 CloudFront 비밀 값·호스트·방문자 IP를 확인해 댓글 API로 넘긴다', async () => {
  const { handleLambda } = await import(new URL('../.aws-build/lambda/index.mjs', import.meta.url));
  const { mf, db } = await startLocal();
  const env = { ORIGIN_SECRET: 'test-only-secret' }, store = () => d1Store(db);
  const path = '/api/posts/starting-a-development-journal/comments';
  const event = (method, headers = {}, body) => ({ rawPath: path, rawQueryString: '', requestContext: { http: { method } }, isBase64Encoded: false, body,
    headers: { 'x-origin-verify': 'test-only-secret', 'x-site-host': 'hyeonjaeoh.com', 'x-viewer-ip': '203.0.113.7', ...headers } });
  try {
    let result = await handleLambda(event('GET', { 'x-origin-verify': 'wrong' }), env, store); assert.equal(result.statusCode, 403, '비밀 값이 없으면 함수 URL 직접 호출을 막는다');
    result = await handleLambda(event('GET'), {}, store); assert.equal(result.statusCode, 403, '비밀 값 설정이 비면 전부 막는다');
    result = await handleLambda(event('GET'), env, store); assert.equal(result.statusCode, 200); assert.equal(JSON.parse(result.body).total, 0);
    const data = { id: crypto.randomUUID(), name: '방문자', body: '람다 경유', password: 'test-only-password-123' };
    const post = headers => event('POST', { 'content-type': 'application/json', ...headers }, JSON.stringify(data));
    result = await handleLambda(post({ origin: 'https://evil.invalid' }), env, store); assert.equal(result.statusCode, 403, 'Origin은 x-site-host 기준으로 대조한다');
    result = await handleLambda(post({ origin: 'https://hyeonjaeoh.com' }), env, store); assert.equal(result.statusCode, 201);
    result = await handleLambda(event('GET'), env, store); const listing = JSON.parse(result.body);
    assert.equal(listing.total, 1); assert.equal(listing.items[0].body, '람다 경유'); assert.equal(result.headers['cache-control'], 'no-store');
    result = await handleLambda({ ...event('GET'), rawPath: '/api/posts/not-published/comments' }, env, store); assert.equal(result.statusCode, 404);
  } finally { await mf.dispose(); }
});
