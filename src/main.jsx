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
import './home-scroll.css';
import { Navigation, Link } from './Link';
import Projects from './Projects';
import Contact from './Contact';

const Polyhedron = lazy(() => import('./Polyhedron'));

function Home() {
  const navigate = React.useContext(Navigation);
  const scrollRef = useRef(null);
  const [scene, setScene] = useState(0);
  const moveTo = index => scrollRef.current?.children[index]?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  useEffect(() => {
    const root = scrollRef.current;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setScene(Number(entry.target.dataset.scene));
      });
    }, { root, threshold: 0.55 });
    Array.from(root.children).forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return <div className="home-experience"><main className="home-scroll" ref={scrollRef} tabIndex={0} aria-label="소개와 다면체">
<section data-scene="0" className={`home-scene home-page ${scene === 0 ? 'is-current' : ''}`} aria-label="소개"><div className="intro scene-content"><p className="eyebrow">DEVELOPMENT & NOTES</p><h1>만들고, 실험하고,<br />기록합니다<span>.</span></h1><p className="bio">웹과 서버를 넘나들며 만드는 소프트웨어.<br />직접 만든 결과와 그 과정에서 배운 것을 남깁니다.</p><Link className="home-blog-link" href="/blog">최근 기록 읽기 <span>↗</span></Link></div><button className="scene-next" onClick={() => moveTo(1)}>더 둘러보기 <span>↓</span></button></section>
<section data-scene="1" className="home-scene poly-scene" aria-label="다면체 탐색"><Suspense fallback={<section className="visual"><p className="loading">다면체를 불러오는 중입니다.</p></section>}><Polyhedron onSelect={() => navigate('/projects')} blocked={scene !== 1} /></Suspense></section>
</main></div>;
}

function SectionPage({ page }) {
  const index = content.findIndex(item => item.path === `/${page}`);
  const item = content[index];
  return <main className={`section-page ${page}-page`}><div className="section-heading"><p className="eyebrow">0{index + 1} / {item.en}</p><h1>{item.title}<span>.</span></h1><p>{item.copy}</p></div>
    {page === 'projects' ? <Projects />
    : page === 'contact' ? <Contact />
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
    document.title = post ? `${post.title} — 현재진행형` : section ? `${section.name} — 현재진행형` : route.page === 'home' ? '현재진행형 — Developer portfolio & blog' : '페이지를 찾을 수 없습니다 — 현재진행형';
    document.querySelector('meta[name="description"]')?.setAttribute('content', post?.description || section?.copy || '직접 만든 소프트웨어와 개발의 기록.');
    document.querySelector('#main-content')?.focus({ preventScroll: true });
  }, [pathname]);
  return <Navigation.Provider value={navigate}><a className="skip-link" href="#main-content">본문으로 건너뛰기</a><header className="site-header"><Link className="brand" href="/" aria-label="현재진행형 홈"><span>현재진행형</span></Link><nav className="top-nav" aria-label="주 메뉴">{[{ path: '/', name: '홈' }, ...content].map(item => <Link href={item.path} key={item.path} aria-current={activePath === item.path ? 'page' : undefined}>{item.name}</Link>)}</nav></header>
    <div id="main-content" tabIndex={-1}>{route.page === 'home' ? <Home /> : route.page === 'blog' ? <Blog /> : post ? <Post key={post.slug} post={post} /> : section ? <SectionPage key={route.page} page={route.page} /> : <Missing />}</div>
    {route.page !== 'home' && <footer><span>© 2026 현재진행형</span><span>개발과 기록.</span><Link href="/blog">블로그 ↗</Link></footer>}</Navigation.Provider>;
}

createRoot(document.getElementById('root')).render(<App />);
