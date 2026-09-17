export function readRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { page: 'home' };
  if (path === '/blog') return { page: 'blog' };
  const match = path.match(/^\/blog\/([a-z0-9-]+)$/);
  if (match) return { page: 'post', slug: match[1] };
  return { page: 'missing' };
}
