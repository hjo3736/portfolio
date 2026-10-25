import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export function parsePost(source, filename) {
  const { data, content } = matter(source);
  const slug = path.basename(filename, '.md');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${filename}: 파일명은 영문 소문자, 숫자, 하이픈을 사용하세요.`);
  for (const field of ['title', 'date', 'description', 'category']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`${filename}: ${field} 값을 문자열로 입력하세요.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0, 10) !== data.date) {
    throw new Error(`${filename}: date는 실제 날짜 YYYY-MM-DD 형식이어야 합니다.`);
  }
  if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string'))) throw new Error(`${filename}: tags는 문자열 목록이어야 합니다.`);
  if (data.draft !== undefined && typeof data.draft !== 'boolean') throw new Error(`${filename}: draft는 true 또는 false여야 합니다.`);
  if (!content.trim()) throw new Error(`${filename}: 본문이 비어 있습니다.`);
  return { slug, title: data.title.trim(), date: data.date, description: data.description.trim(), category: data.category.trim(), tags: data.tags || [], draft: data.draft === true, sample: data.sample === true, body: content.trim(), readingMinutes: Math.max(1, Math.ceil(content.length / 650)) };
}

export function loadPosts(directory) {
  return fs.readdirSync(directory).filter(file => file.endsWith('.md')).map(file => parsePost(fs.readFileSync(path.join(directory, file), 'utf8'), file))
    .filter(post => !post.draft).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

const storeSchema = `CREATE TABLE IF NOT EXISTS posts (slug TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]', draft INTEGER NOT NULL DEFAULT 0, sample INTEGER NOT NULL DEFAULT 0, body TEXT NOT NULL)`;
const importHint = '글을 옮기려면 npm run posts:import을 실행하세요.';

export function openPostStore(file, create = false) {
  if (!create && !fs.existsSync(file)) throw new Error(`${file}: 글 저장소가 없습니다. ${importHint}`);
  const sqlite = process.getBuiltinModule?.('node:sqlite');
  if (!sqlite?.DatabaseSync) throw new Error(`node:sqlite를 쓸 수 없습니다(현재 ${process.version}). 글 저장소는 node:sqlite로 읽습니다 — Node v24.22.0에서 확인했습니다.`);
  if (create) fs.mkdirSync(path.dirname(file), { recursive: true });
  const database = new sqlite.DatabaseSync(file);
  if (create) database.exec(storeSchema);
  return database;
}

export function postToMarkdown(post) {
  const newline = post.body.includes('\r\n') ? '\r\n' : '\n';
  return ['---', ...['title', 'date', 'description', 'category'].map(field => `${field}: ${JSON.stringify(post[field])}`), `tags: [${post.tags.map(tag => JSON.stringify(tag)).join(', ')}]`,
    `draft: ${post.draft}`, ...(post.sample ? ['sample: true'] : []), '---', '', post.body, ''].join(newline);
}

export function storedToPost(row) {
  let tags; try { tags = JSON.parse(row.tags); } catch { tags = null; }
  if (!Array.isArray(tags)) throw new Error(`${row.slug}.md: tags는 문자열 목록이어야 합니다.`);
  return parsePost(postToMarkdown({ ...row, tags, draft: !!row.draft, sample: !!row.sample }), `${row.slug}.md`);
}

export function loadPostsFromStore(file) {
  const database = openPostStore(file);
  try {
    let rows;
    try { rows = database.prepare('SELECT * FROM posts').all(); }
    catch (error) { throw /no such table/.test(error.message) ? new Error(`${file}: posts 테이블이 없습니다. ${importHint}`) : error; }
    if (!rows.length) throw new Error(`${file}: 글이 한 편도 없습니다. ${importHint}`);
    const posts = rows.map(storedToPost).filter(post => !post.draft).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
    if (!posts.length) throw new Error(`${file}: 글 ${rows.length}편이 전부 초안입니다. 공개할 글의 draft를 false로 내리세요.`);
    return posts;
  } finally { database.close(); }
}
