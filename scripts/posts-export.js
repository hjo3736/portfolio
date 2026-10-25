import fs from 'node:fs';
import path from 'node:path';
import { openPostStore, postToMarkdown } from './posts.js';

const directory = path.resolve(process.argv[2] || 'content/posts-export'), file = path.resolve(process.argv[3] || 'content/posts.db');
if (directory === path.resolve('content/posts')) throw new Error('content/posts는 md 원본입니다. 내보내기로 덮어쓰지 마세요.');
const database = openPostStore(file);
const rows = database.prepare('SELECT * FROM posts').all();
database.close();
fs.mkdirSync(directory, { recursive: true });
for (const row of rows) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) throw new Error(`${row.slug}: slug는 영문 소문자, 숫자, 하이픈을 사용하세요.`);
  fs.writeFileSync(path.join(directory, `${row.slug}.md`), postToMarkdown({ ...row, tags: JSON.parse(row.tags), draft: !!row.draft, sample: !!row.sample }));
}
console.log(`${rows.length} posts exported from ${path.relative(process.cwd(), file)} to ${path.relative(process.cwd(), directory)}.`);
