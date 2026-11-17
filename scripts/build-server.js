import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { loadPostsFromStore } from './posts.js';
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
    builder.onLoad({ filter: /.*/, namespace: 'data' }, args => ({ contents: `export default ${JSON.stringify(args.path === 'virtual:server-assets' ? assets : loadPostsFromStore(path.resolve('content/posts.db')).map(post => post.slug))}`, loader: 'js' }));
  } }],
});
// 이전 배포 경로(OpenAI Sites) 연결 정보. git에서 뺐으므로 이 PC처럼 파일이 있을 때만 dist/에 넣는다 — GitHub Actions(AWS 배포)에는 없다.
if (fs.existsSync('.openai/hosting.json')) {
  fs.mkdirSync('dist/.openai', { recursive: true });
  fs.copyFileSync('.openai/hosting.json', 'dist/.openai/hosting.json');
  fs.cpSync('drizzle', 'dist/.openai/drizzle', { recursive: true });
}
console.log('Worker and comment database migrations are ready.');
