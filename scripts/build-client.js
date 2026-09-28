import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { loadPosts } from './posts.js';
import { content } from '../src/sections.js';

const root = process.cwd(), output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Unexpected build directory');
const posts = loadPosts(path.resolve('content/posts'));
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const result = await build({ entryPoints: ['src/main.jsx'], outdir: 'dist', entryNames: 'assets/index-[hash]', chunkNames: 'assets/chunk-[hash]',
  bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', minify: true, metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'posts', setup(builder) {
    builder.onResolve({ filter: /^virtual:posts$/ }, () => ({ path: 'posts', namespace: 'content' }));
    builder.onLoad({ filter: /.*/, namespace: 'content' }, () => ({ contents: `export default ${JSON.stringify(posts)}`, loader: 'js' }));
  } }],
});
const [entry, metadata] = Object.entries(result.metafile.outputs).find(([, details]) => details.entryPoint === 'src/main.jsx');
const publicPath = filename => '/' + path.relative('dist', filename).replaceAll('\\', '/');
let html = fs.readFileSync('index.html', 'utf8').replace('/src/main.jsx', publicPath(entry));
if (metadata.cssBundle) html = html.replace('</head>', `<link rel="stylesheet" href="${publicPath(metadata.cssBundle)}" /></head>`);
if (fs.existsSync('public')) fs.cpSync('public', output, { recursive: true });
fs.writeFileSync(path.join(output, 'index.html'), html);
fs.writeFileSync(path.join(output, '404.html'), html);
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const routes = [...content.map(page => ({ slug: page.path.slice(1), title: page.name, description: page.copy })), ...posts.map(post => ({ ...post, slug: `blog/${post.slug}` }))];
for (const route of routes) {
  const directory = path.join(output, route.slug); fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), html.replace(/<title>.*?<\/title>/, `<title>${escape(route.title)} — 현재진행형</title>`).replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escape(route.description)}" />`));
}
console.log('React pages built.');
