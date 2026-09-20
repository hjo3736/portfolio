import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canAutoRotate, IDLE_DELAY } from '../src/motion.js';
import { parsePost, loadPosts } from '../scripts/posts.js';
import { readRoute } from '../src/navigation.js';

test('자동 회전은 조작 종료 3초 후 재개한다', () => {
  const state = { paused: false, dragging: false, blocked: false, target: null, resumeAt: 1000 + IDLE_DELAY };
  assert.equal(canAutoRotate(state, 3999), false);
  assert.equal(canAutoRotate(state, 4000), true);
  for (const key of ['paused', 'dragging', 'blocked', 'target']) {
    assert.equal(canAutoRotate({ ...state, [key]: true }, 99999), false, `${key} 상태에서는 회전하지 않는다`);
  }
});
const markdown = (overrides = '', body = '본문입니다.') => `---\ntitle: "테스트 글"\ndate: "2026-09-17"\ndescription: "설명"\ncategory: "개발 일지"\ntags: ["React"]\n${overrides}---\n${body}`;
test('메타데이터, 코드와 본문을 보존한다', () => {
  const body = '## 소제목\n\n```js\nconst n = 1;\n```';
  const post = parsePost(markdown('', body), 'my-post.md');
  assert.equal(post.slug, 'my-post'); assert.deepEqual(post.tags, ['React']); assert.equal(post.body, body);
});
test('잘못된 날짜, 파일명과 빈 본문을 빌드 전에 차단한다', () => {
  assert.throws(() => parsePost(markdown().replace('2026-09-17', '2026-02-31'), 'valid.md'));
  assert.throws(() => parsePost(markdown(), 'invalid slug.md'));
  assert.throws(() => parsePost(markdown('', '  '), 'valid.md'));
  assert.throws(() => parsePost(markdown('draft: "false"\n'), 'valid.md'));
});
test('초안은 배포 목록에서 제외하며 공개 글은 최신순으로 정렬한다', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vertex-posts-'));
  try {
    fs.writeFileSync(path.join(directory, 'draft.md'), markdown('draft: true\n'));
    fs.writeFileSync(path.join(directory, 'older.md'), markdown().replace('2026-09-17', '2026-09-10'));
    fs.writeFileSync(path.join(directory, 'newer.md'), markdown());
    assert.deepEqual(loadPosts(directory).map(post => post.slug), ['newer', 'older']);
  } finally {
    for (const file of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, file));
    fs.rmdirSync(directory);
  }
});
test('블로그 주소와 직접 연결된 글 주소를 구분한다', () => {
  for (const page of ['about', 'projects', 'toolkit', 'contact']) assert.deepEqual(readRoute(`/${page}/`), { page });
  assert.deepEqual(readRoute('/blog/'), { page: 'blog' });
  assert.deepEqual(readRoute('/blog/my-post/'), { page: 'post', slug: 'my-post' });
  assert.deepEqual(readRoute('/blog/a/b'), { page: 'missing' });
  assert.deepEqual(readRoute('/'), { page: 'home' });
});
