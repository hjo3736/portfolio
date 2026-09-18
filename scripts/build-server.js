import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { loadPosts } from './posts.js';
const root = path.resolve('dist'), assets = {};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'server' || entry.name.startsWith('.')) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else assets['/' + path.relative(root, file).replaceAll('\\', '/')] = { type: types[path.extname(file)] || 'application/octet-stream', data: fs.readFileSync(file).toString('base64') };
  }
}
scan(root);
await build({ entryPoints: ['server/worker.js'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
  plugins: [{ name: 'server-content', setup(builder) {
    builder.onResolve({ filter: /^virtual:/ }, args => ({ path: args.path, namespace: 'data' }));
    builder.onLoad({ filter: /.*/, namespace: 'data' }, args => ({ contents: `export default ${JSON.stringify(args.path === 'virtual:server-assets' ? assets : loadPosts(path.resolve('content/posts')).map(post => post.slug))}`, loader: 'js' }));
  } }],
});
fs.mkdirSync('dist/.openai', { recursive: true });
fs.copyFileSync('.openai/hosting.json', 'dist/.openai/hosting.json');
fs.cpSync('drizzle', 'dist/.openai/drizzle', { recursive: true });
console.log('Worker and comment database migrations are ready.');
