import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { openPostStore, storedToPost } from './posts.js';

// 로컬 전용 편집기다. scripts/ 안에 있으므로 빌드가 읽지 않는다 —
// build-client.js는 src/main.jsx를, build-server.js는 dist/를 입력으로 삼는다.
const defaultPort = 4280, requested = process.env.POSTS_EDITOR_PORT;
const port = requested === undefined ? defaultPort : Number(requested.trim());
if (requested !== undefined && (!/^\d{1,5}$/.test(requested.trim()) || port < 1 || port > 65535)) {
  throw new Error(`POSTS_EDITOR_PORT는 1부터 65535 사이의 정수여야 합니다(받은 값: ${JSON.stringify(requested)}).`);
}
const storeFile = path.resolve('content/posts.db'), pageFile = path.resolve('scripts/posts-editor.html');

// 이미 잡혀 있으면 조용히 남의 서버에 붙지 않고 여기서 멈춘다. preview.js와 같은 방식이다.
// 탐색 소켓을 닫은 뒤 바인드하기까지의 틈에 다른 프로세스가 끼어들 수 있다 — 경합을 완전히 막지는 못한다.
await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', error => reject(new Error(`포트 ${port}를 쓸 수 없습니다(${error.code}). POSTS_EDITOR_PORT=다른포트 로 바꾸거나 netstat -ano | grep ":${port}" 로 확인하세요.`)));
  probe.once('listening', () => probe.close(resolve));
  probe.listen(port, '127.0.0.1');
});

const withStore = run => { const database = openPostStore(storeFile); try { return run(database); } finally { database.close(); } };
const send = (response, status, type, body) => { response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); response.end(body); };
const json = (response, status, value) => send(response, status, 'application/json; charset=utf-8', JSON.stringify(value));
const readBody = request => new Promise((resolve, reject) => {
  // setEncoding을 걸어야 한글이 청크 경계에서 쪼개져도 깨지지 않는다. chunk.toString()을 이어 붙이면 깨진다.
  request.setEncoding('utf8');
  let text = '';
  request.on('data', chunk => { text += chunk; if (text.length > 1_000_000) { request.destroy(); reject(new Error('요청이 너무 큽니다.')); } });
  request.on('end', () => resolve(text));
  request.on('error', reject);
});

// 검증은 새로 쓰지 않는다. storedToPost가 행을 마크다운으로 왕복시켜 parsePost의 규칙을 그대로 건다.
// 통과한 값(post)을 저장한다 — parsePost가 trim하므로, 저장한 것과 빌드가 나중에 읽는 것이 같아진다.
function savePost(input) {
  const row = {
    slug: String(input.slug ?? '').trim(), title: String(input.title ?? ''), date: String(input.date ?? '').trim(),
    description: String(input.description ?? ''), category: String(input.category ?? ''),
    tags: JSON.stringify(Array.isArray(input.tags) ? input.tags : []),
    draft: input.draft ? 1 : 0, sample: input.sample ? 1 : 0, body: String(input.body ?? ''),
  };
  const post = storedToPost(row);
  return withStore(database => {
    // 공개 글이 0편이 되면 loadPostsFromStore가 던져서 다음 npm run build가 실패한다.
    // 실패가 멀리서 나므로 여기서 막되, 왜 막혔고 어떻게 풀지를 함께 말한다.
    if (post.draft && !database.prepare('SELECT count(*) AS others FROM posts WHERE draft = 0 AND slug <> ?').get(post.slug).others) {
      throw new Error('이 글을 초안으로 내리면 공개 글이 한 편도 남지 않아 npm run build가 실패합니다. 다른 글을 먼저 공개로 올린 뒤에 내려 주세요.');
    }
    database.prepare(`INSERT INTO posts (slug, title, date, description, category, tags, draft, sample, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET title = excluded.title, date = excluded.date, description = excluded.description, category = excluded.category,
      tags = excluded.tags, draft = excluded.draft, sample = excluded.sample, body = excluded.body`)
      .run(post.slug, post.title, post.date, post.description, post.category, JSON.stringify(post.tags), post.draft ? 1 : 0, post.sample ? 1 : 0, post.body);
    return post.slug;
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return send(response, 200, 'text/html; charset=utf-8', fs.readFileSync(pageFile));
    if (request.method === 'GET' && url.pathname === '/api/posts') return json(response, 200, withStore(database => database.prepare('SELECT slug, title, date, description, category, tags, draft, sample, body FROM posts ORDER BY date DESC, slug').all()));
    if (request.method === 'POST' && url.pathname === '/api/posts') return json(response, 200, { slug: savePost(JSON.parse(await readBody(request))) });
    return json(response, 404, { error: '없는 주소입니다.' });
  } catch (error) { return json(response, 400, { error: error.message }); }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Editor: http://127.0.0.1:${port}`);
  console.log(`Store: ${storeFile}`);
  console.log('발행은 npm run build 입니다. 이 편집기는 저장소까지만 씁니다.');
});
const stop = () => { server.close(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
