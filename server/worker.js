import assets from 'virtual:server-assets';
import slugs from 'virtual:published-slugs';
import { handleComments } from './comments.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleComments(request, env, slugs);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const path = url.pathname.replace(/\/$/, '') || '/';
    const asset = assets[path] || assets[`${path}/index.html`] || (path === '/' ? assets['/index.html'] : null);
    const selected = asset || assets['/404.html'];
    const bytes = Uint8Array.from(atob(selected.data), character => character.charCodeAt(0));
    return new Response(request.method === 'HEAD' ? null : bytes, { status: asset ? 200 : 404, headers: {
      'Content-Type': selected.type, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    } });
  },
};
