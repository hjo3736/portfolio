import fs from 'node:fs';
import path from 'node:path';
import { parsePost, openPostStore, postToMarkdown, storedToPost } from './posts.js';

const slug = (process.argv[2] || '').trim();
if (!slug) throw new Error('사용법: npm run posts:delete -- <slug>');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${slug}: slug는 영문 소문자, 숫자, 하이픈을 사용하세요.`);
const file = path.resolve(process.argv[3] || 'content/posts.db');
const database = openPostStore(file);
const row = database.prepare('SELECT * FROM posts WHERE slug = ?').get(slug);
if (!row) {
  const slugs = database.prepare('SELECT slug FROM posts ORDER BY slug').all().map(stored => stored.slug);
  database.close();
  throw new Error(`${slug}: 저장소에 그 글이 없습니다. 지금 있는 글: ${slugs.join(', ') || '(없음)'}`);
}
// 사본으로 되돌릴 수 없는 글은 지우지 않는다. 먼저 메모리에서, 그다음 디스크에 쓰인 바이트로 확인한다.
const post = storedToPost(row);
const source = postToMarkdown(post);
const directory = path.resolve('content/posts-deleted', `${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}Z`);
fs.mkdirSync(directory, { recursive: true });
const copy = path.join(directory, `${slug}.md`);
fs.writeFileSync(copy, source);
parsePost(fs.readFileSync(copy, 'utf8'), `${slug}.md`);
database.prepare('DELETE FROM posts WHERE slug = ?').run(slug);
const remaining = database.prepare('SELECT draft FROM posts').all();
database.close();
const published = remaining.filter(stored => !stored.draft).length;
const relative = target => path.relative(process.cwd(), target).replaceAll('\\', '/');
console.log(`Deleted: ${slug}`);
for (const [label, value] of [['title', post.title], ['date', post.date], ['category', post.category],
  ['tags', post.tags.join(', ') || '(none)'], ['draft', post.draft], ['body', `${post.body.length} characters`]]) console.log(`  ${label.padEnd(9)} ${value}`);
console.log(`Copy:    ${relative(copy)}`);
console.log(`Restore: npm run posts:import -- ${relative(directory)}`);
console.log(`Remaining: ${remaining.length} post(s), ${published} published.`);
console.log(`댓글: 이 글의 댓글은 D1에 그대로 남지만 API가 404를 돌려줍니다 (server/comments.js:49). 복원하면 다시 보입니다.`);
if (!published) console.log(`경고: 공개 글이 0편입니다. 다음 npm run build가 거부합니다 — "글이 한 편도 없습니다".`);
