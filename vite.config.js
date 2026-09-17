import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { loadPosts } from './scripts/posts.js';

const postsDir = path.resolve('content/posts');
const virtualId = '\0virtual:posts';
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export default defineConfig({
  plugins: [react(), {
    name: 'markdown-blog',
    resolveId(id) { if (id === 'virtual:posts') return virtualId; },
    load(id) { if (id === virtualId) return `export default ${JSON.stringify(loadPosts(postsDir))}`; },
    configureServer(server) {
      server.watcher.add(postsDir);
      const refresh = file => {
        if (!file.startsWith(postsDir) || !file.endsWith('.md')) return;
        const module = server.moduleGraph.getModuleById(virtualId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh).on('change', refresh).on('unlink', refresh);
      server.httpServer?.once('close', () => {
        server.watcher.off('add', refresh).off('change', refresh).off('unlink', refresh);
      });
    },
    writeBundle() {
      const output = path.resolve('dist');
      const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
      const routes = [{ route: 'blog', title: '블로그 — VERTEX', description: '개발 일지와 기술 지식, 배움의 기록.' },
        ...loadPosts(postsDir).map(post => ({ route: `blog/${post.slug}`, title: `${post.title} — VERTEX`, description: post.description }))];
      for (const route of routes) {
        const destination = path.join(output, route.route);
        fs.mkdirSync(destination, { recursive: true });
        fs.writeFileSync(path.join(destination, 'index.html'), html.replace(/<title>.*?<\/title>/, `<title>${escape(route.title)}</title>`)
          .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escape(route.description)}" />`));
      }
      fs.writeFileSync(path.join(output, '404.html'), html);
    },
  }],
  build: { chunkSizeWarningLimit: 650 },
});
