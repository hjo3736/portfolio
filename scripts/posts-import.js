import fs from 'node:fs';
import path from 'node:path';
import { parsePost, openPostStore } from './posts.js';

const directory = path.resolve(process.argv[2] || 'content/posts'), file = path.resolve(process.argv[3] || 'content/posts.db');
const database = openPostStore(file, true);
const insert = database.prepare('INSERT OR REPLACE INTO posts (slug, title, date, description, category, tags, draft, sample, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const files = fs.readdirSync(directory).filter(name => name.endsWith('.md'));
for (const name of files) {
  const post = parsePost(fs.readFileSync(path.join(directory, name), 'utf8'), name);
  insert.run(post.slug, post.title, post.date, post.description, post.category, JSON.stringify(post.tags), post.draft ? 1 : 0, post.sample ? 1 : 0, post.body);
}
database.close();
console.log(`${files.length} posts imported from ${path.relative(process.cwd(), directory)} into ${path.relative(process.cwd(), file)}.`);
