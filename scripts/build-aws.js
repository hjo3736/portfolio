import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { loadPostsFromStore } from './posts.js';

// AWS 배포물 — .aws-build/ (git 제외). dist/는 build-client·build-server가 먼저 만들어 둔다.
// lambda/index.mjs: 댓글 API(Lambda). router.js: CloudFront 함수 — 아는 페이지 주소를 <경로>/index.html로 바꾸고, 모르는 주소는 404.html 본문으로 404를 돌려준다.
// CloudFront의 사용자 지정 오류 응답은 배포 전체(/api/* 포함)에 걸려 댓글 API의 403·404를 덮어쓰므로 쓰지 않는다.
const root = path.resolve('dist'), output = path.resolve('.aws-build');
fs.rmSync(output, { recursive: true, force: true });
const slugs = loadPostsFromStore(path.resolve('content/posts.db')).map(post => post.slug);
await build({ entryPoints: ['server/lambda.js'], outfile: path.join(output, 'lambda/index.mjs'), bundle: true, format: 'esm', platform: 'node', target: 'node22', minify: true,
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  plugins: [{ name: 'published-slugs', setup(builder) {
    builder.onResolve({ filter: /^virtual:published-slugs$/ }, args => ({ path: args.path, namespace: 'data' }));
    builder.onLoad({ filter: /.*/, namespace: 'data' }, () => ({ contents: `export default ${JSON.stringify(slugs)}`, loader: 'js' }));
  } }],
});

const routes = {};
(function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['server', 'assets'].includes(entry.name) || entry.name.startsWith('.')) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (entry.name === 'index.html') routes['/' + path.relative(root, directory).replaceAll('\\', '/')] = 1;
  }
})(root);
routes['/'] = 1; delete routes['/.'];
const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
const router = `var routes = ${JSON.stringify(routes)};
var notFound = ${JSON.stringify(notFound)};
function handler(event) {
  var request = event.request, uri = request.uri;
  var route = uri.length > 1 && uri.endsWith('/') ? uri.slice(0, -1) : uri;
  if (routes[route]) { request.uri = route === '/' ? '/index.html' : route + '/index.html'; return request; }
  if (/\\.[a-z0-9]+$/i.test(route)) return request;
  return { statusCode: 404, statusDescription: 'Not Found', headers: { 'content-type': { value: 'text/html; charset=utf-8' }, 'cache-control': { value: 'no-cache' } }, body: { encoding: 'text', data: notFound } };
}
`;
if (Buffer.byteLength(router) > 10240) throw new Error(`CloudFront 함수가 10KB 제한을 넘습니다(${Buffer.byteLength(router)}B). 라우팅 방식을 바꿔야 합니다.`);
fs.writeFileSync(path.join(output, 'router.js'), router);
console.log(`AWS bundle ready: Lambda + router (${Object.keys(routes).length} routes, ${Buffer.byteLength(router)}B).`);
