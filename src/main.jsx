import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import posts from 'virtual:posts';
import { content } from './sections';
import { readRoute } from './navigation';
import './styles.css';
import './blog.css';
import Comments from './Comments';
import './pages.css';

const Polyhedron = lazy(() => import('./Polyhedron'));
const Navigation = React.createContext(null);
function Link({ href, children, onClick, ...props }) {
  const navigate = React.useContext(Navigation);
  return <a href={href} {...props} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); navigate(href);
    }
  }}>{children}</a>;
}

function Home() {
  const navigate = React.useContext(Navigation);
  const [front, setFront] = useState(0);
  const [focusRequest, setFocusRequest] = useState(null);
  const pending = useRef(null);
  useEffect(() => () => clearTimeout(pending.current), []);
  const choose = useCallback(index => {
    clearTimeout(pending.current);
    setFront(index);
    setFocusRequest({ id: index, nonce: performance.now() });
    pending.current = setTimeout(() => {
      navigate(content[index].path);
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
  }, [navigate]);
  return <main className="home-page"><section className="intro"><p className="eyebrow">DEVELOPMENT & NOTES</p>
    <h1>만들고, 실험하고,<br />기록합니다<span>.</span></h1>
    <p className="bio">웹과 서버를 넘나들며 만드는 소프트웨어.<br />직접 만든 결과와 그 과정에서 배운 것을 남깁니다.</p>
    <Link className="home-blog-link" href="/blog">최근 기록 읽기 <span>↗</span></Link></section>
    <Suspense fallback={<section className="visual"><p className="loading">다면체를 불러오는 중입니다.</p></section>}><Polyhedron front={front} onFront={setFront} onSelect={choose} focusRequest={focusRequest} blocked={false} /></Suspense>
  </main>;
}

function SectionPage({ page }) {
  const index = content.findIndex(item => item.path === `/${page}`);
  const item = content[index];
  return <main className={`section-page ${page}-page`}><div className="section-heading"><p className="eyebrow">0{index + 1} / {item.en}</p><h1>{item.title}<span>.</span></h1><p>{item.copy}</p></div>
    {page === 'projects' ? <article className="project-feature"><div className="project-meta"><span>01 / WEB</span><span>2026 —</span></div><h2>VERTEX</h2><p className="project-lead">포트폴리오와 개발 블로그를 한 공간에.</p><p>회전하는 다면체로 작업과 기록을 탐색하는 개인 사이트입니다. 글은 마크다운으로 작성하고, 방문자는 회원가입 없이 이름과 비밀번호로 댓글을 남길 수 있습니다.</p><div className="project-facts"><div><h3>인터랙션</h3><p>꼭짓점을 선택해 페이지로 이동하고, 드래그를 멈추면 자동 회전을 재개합니다.</p></div><div><h3>기록과 대화</h3><p>주제별 글 목록과 개별 글 페이지, 비밀번호로 수정·삭제하는 댓글을 지원합니다.</p></div></div><div className="project-tags">{['React', 'Three.js', 'Cloudflare Workers', 'D1'].map(tag => <span className="tag" key={tag}>{tag}</span>)}</div><Link className="text-link" href="/">사이트 둘러보기 ↗</Link></article>
    : page === 'contact' ? <section className="contact-panel"><span className="contact-symbol" aria-hidden="true">↗</span><h2>질문도, 다른 생각도 환영합니다.</h2><p>글을 읽으며 떠오른 질문이나 공유하고 싶은 경험이 있다면 댓글로 남겨 주세요. 이름과 비밀번호만 있으면 이야기를 시작할 수 있습니다.</p><Link className="primary-link" href="/blog">블로그에서 이야기 나누기 ↗</Link></section>
    : <div className="section-entries">{item.items.map(([title, description, ...tags], row) => <article className="section-entry" key={title}><span className="entry-index">0{row + 1}</span><div><h2>{title}</h2><p>{description}</p>{tags.length > 0 && <div>{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>}</div></article>)}</div>}
  </main>;
}

function PostRow({ post }) {
  return <article className="post-row"><div className="post-date"><time dateTime={post.date}>{post.date.replaceAll('-', '.')}</time><span>{post.category}</span></div>
    <div className="post-summary"><div className="post-title-line"><h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2></div>
    <p>{post.description}</p><div className="post-tags">{post.tags.map(tag => <span key={tag}>#{tag}</span>)}<span>{post.readingMinutes}분 읽기</span></div></div><Link href={`/blog/${post.slug}`} className="post-arrow" aria-label={`${post.title} 읽기`}>↗</Link></article>;
}

function Blog() {
  const [category, setCategory] = useState('전체');
  const categories = ['전체', ...new Set(posts.map(post => post.category))];
  const visiblePosts = category === '전체' ? posts : posts.filter(post => post.category === category);
  return <main className="blog-page"><div className="blog-heading"><div><p className="eyebrow">04 / BLOG</p><h1>만들면서, 배운 것들<span>.</span></h1><p>개발 일지와 기술 지식, 그리고 생각의 기록.</p></div><span className="entry-count">{String(posts.length).padStart(2, '0')} ENTRIES</span></div>
    <div className="blog-toolbar"><div className="categories" aria-label="글 주제">{categories.map(name => <button key={name} onClick={() => setCategory(name)} aria-pressed={category === name} className={category === name ? 'active' : ''}>{name}<span>{name === '전체' ? posts.length : posts.filter(post => post.category === name).length}</span></button>)}</div><span className="sort-label">최신 글부터</span></div>
    <section aria-label="블로그 글 목록">{visiblePosts.length ? visiblePosts.map(post => <PostRow post={post} key={post.slug} />) : <p className="empty-state">아직 공개된 글이 없습니다. 첫 기록을 준비하고 있어요.</p>}</section>
    <div className="blog-end"><span>작은 기록이 쌓여, 다음의 나에게.</span><Link href="/">포트폴리오로 돌아가기 ↗</Link></div>
  </main>;
}

function Post({ post }) {
  const related = posts.filter(item => item.slug !== post.slug).slice(0, 2);
  return <main className="article-page"><Link className="back-link" href="/blog">← 모든 글</Link>
    <article><div className="article-heading"><p className="eyebrow">{post.category}</p><h1>{post.title}</h1><p className="article-description">{post.description}</p><div className="article-meta"><time dateTime={post.date}>{post.date.replaceAll('-', '.')}</time><span>{post.readingMinutes}분 읽기</span>{post.tags.map(tag => <span key={tag}>#{tag}</span>)}</div></div>
    <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown></div></article>
    <Comments key={post.slug} slug={post.slug} />
    <section className="more-posts"><p className="eyebrow">계속 읽기</p>{related.map(item => <Link key={item.slug} href={`/blog/${item.slug}`}><span>{item.title}</span><span>↗</span></Link>)}<Link href="/blog"><span>글 목록으로</span><span>↗</span></Link></section>
  </main>;
}

function Missing() { return <main className="blog-page"><p className="eyebrow">404</p><h1>페이지를 찾을 수 없어요.</h1><p>주소가 바뀌었거나 아직 공개되지 않은 페이지입니다.</p><Link href="/">홈으로 돌아가기 ↗</Link></main>; }

function App() {
  const [pathname, setPathname] = useState(location.pathname);
  const navigate = useCallback(href => { if (location.pathname !== href) history.pushState(null, '', href); setPathname(href); window.scrollTo(0, 0); }, []);
  useEffect(() => { const pop = () => setPathname(location.pathname); addEventListener('popstate', pop); return () => removeEventListener('popstate', pop); }, []);
  const route = readRoute(pathname);
  const post = route.page === 'post' ? posts.find(item => item.slug === route.slug) : null;
  const section = content.find(item => item.path === `/${route.page}`);
  const activePath = route.page === 'post' ? '/blog' : route.page === 'home' ? '/' : `/${route.page}`;
  useEffect(() => {
    document.title = post ? `${post.title} — VERTEX` : section ? `${section.name} — VERTEX` : route.page === 'home' ? 'VERTEX — Developer portfolio & blog' : '페이지를 찾을 수 없습니다 — VERTEX';
    document.querySelector('meta[name="description"]')?.setAttribute('content', post?.description || section?.copy || '직접 만든 소프트웨어와 개발의 기록.');
    document.querySelector('#main-content')?.focus({ preventScroll: true });
  }, [pathname]);
  return <Navigation.Provider value={navigate}><a className="skip-link" href="#main-content">본문으로 건너뛰기</a><header className="site-header"><Link className="brand" href="/" aria-label="VERTEX 홈">V<span>VERTEX</span></Link><nav className="top-nav" aria-label="주 메뉴">{[{ path: '/', name: '홈' }, ...content].map(item => <Link href={item.path} key={item.path} aria-current={activePath === item.path ? 'page' : undefined}>{item.name}</Link>)}</nav></header>
    <div id="main-content" tabIndex={-1}>{route.page === 'home' ? <Home /> : route.page === 'blog' ? <Blog /> : post ? <Post key={post.slug} post={post} /> : section ? <SectionPage key={route.page} page={route.page} /> : <Missing />}</div>
    <footer><span>© 2026 VERTEX</span><span>개발과 기록.</span><Link href="/blog">블로그 ↗</Link></footer></Navigation.Provider>;
}

createRoot(document.getElementById('root')).render(<App />);
