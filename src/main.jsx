import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import posts from 'virtual:posts';
import { content } from './content';
import { readRoute } from './navigation';
import './styles.css';
import './blog.css';
import Comments from './Comments';

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

function Detail({ index, onClose }) {
  const ref = useRef(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus();
  }, []);
  const item = content[index];
  return <dialog ref={ref} aria-labelledby="detail-title" onClose={() => close.current()} onClick={event => {
    if (event.target !== ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ref.current.close();
  }}><div className="dialog-head"><span className="eyebrow">0{index + 1} / {item.en}</span><button id="close" aria-label="상세 내용 닫기" onClick={() => ref.current.close()}>✕</button></div>
    <h2 id="detail-title">{item.title}</h2><p className="sample">구성 확인을 위한 예시 콘텐츠입니다.</p>
    {item.items.map(([title, description, ...tags]) => <article className="entry" key={title}><h3>{title}</h3><p>{description}</p>{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</article>)}
    <button id="back" onClick={() => ref.current.close()}>돌아가서 탐색하기 ↗</button>
  </dialog>;
}

function Home() {
  const navigate = React.useContext(Navigation);
  const [front, setFront] = useState(0);
  const [detail, setDetail] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const pending = useRef(null);
  useEffect(() => () => clearTimeout(pending.current), []);
  const choose = useCallback(index => {
    clearTimeout(pending.current);
    setFront(index);
    setFocusRequest({ id: index, nonce: performance.now() });
    pending.current = setTimeout(() => {
      if (index === 3) navigate('/blog'); else setDetail(index);
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
  }, [navigate]);
  return <><main><section className="intro"><p className="eyebrow">DEVELOPER · EXPLORER · MAKER</p>
    <h1>생각을 연결하고,<br />가능성을 만듭니다<span>.</span></h1>
    <p className="bio">웹에서 서버, 그리고 새로운 실험까지.<br />경계를 정하기보다, 필요한 것을 만드는 개발자.</p>
    <nav aria-label="포트폴리오 메뉴">{content.map((item, index) => <button key={item.en} className={`nav-item ${front === index ? 'front' : ''}`} onClick={() => choose(index)}><span className="num">0{index + 1}</span><span>{item.name} <small>{['About', 'Projects', 'Toolkit', 'Blog', 'Contact'][index]}</small></span><span className="arrow">↗</span></button>)}</nav>
    <p className="intro-foot">하나의 개발자, 여러 가지 관점.</p></section>
    <Suspense fallback={<section className="visual"><p className="loading">다면체를 불러오는 중입니다.</p></section>}><Polyhedron front={front} onFront={setFront} onSelect={choose} focusRequest={focusRequest} blocked={detail !== null} /></Suspense>
  </main>{detail !== null && <Detail index={detail} onClose={() => setDetail(null)} />}</>;
}

function PostRow({ post }) {
  return <article className="post-row"><div className="post-date"><time dateTime={post.date}>{post.date.replaceAll('-', '.')}</time><span>{post.category}</span></div>
    <div className="post-summary"><div className="post-title-line"><h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>{post.sample && <span className="sample-badge">예시</span>}</div>
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
    <article><div className="article-heading"><p className="eyebrow">{post.category} {post.sample && ' / 예시 글'}</p><h1>{post.title}</h1><p className="article-description">{post.description}</p><div className="article-meta"><time dateTime={post.date}>{post.date.replaceAll('-', '.')}</time><span>{post.readingMinutes}분 읽기</span>{post.tags.map(tag => <span key={tag}>#{tag}</span>)}</div></div>
    <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown></div></article>
    <Comments key={post.slug} slug={post.slug} />
    <section className="more-posts"><p className="eyebrow">계속 읽기</p>{related.map(item => <Link key={item.slug} href={`/blog/${item.slug}`}><span>{item.title}</span><span>↗</span></Link>)}<Link href="/blog"><span>글 목록으로</span><span>↗</span></Link></section>
  </main>;
}

function Missing() { return <main className="blog-page"><p className="eyebrow">404</p><h1>글을 찾을 수 없어요.</h1><p>주소가 바뀌었거나 아직 공개되지 않은 글입니다.</p><Link href="/blog">글 목록으로 돌아가기 ↗</Link></main>; }

function App() {
  const [pathname, setPathname] = useState(location.pathname);
  const navigate = useCallback(href => { if (location.pathname !== href) history.pushState(null, '', href); setPathname(href); window.scrollTo(0, 0); }, []);
  useEffect(() => { const pop = () => setPathname(location.pathname); addEventListener('popstate', pop); return () => removeEventListener('popstate', pop); }, []);
  const route = readRoute(pathname);
  const post = route.page === 'post' ? posts.find(item => item.slug === route.slug) : null;
  useEffect(() => {
    document.title = post ? `${post.title} — VERTEX` : route.page === 'blog' ? '블로그 — VERTEX' : route.page === 'home' ? 'VERTEX — Developer portfolio & blog' : '페이지를 찾을 수 없습니다 — VERTEX';
    document.querySelector('meta[name="description"]')?.setAttribute('content', post?.description || '개발의 여러 면을 탐색하는 개인 포트폴리오와 개발 블로그');
    document.querySelector('#main-content')?.focus({ preventScroll: true });
  }, [pathname]);
  return <Navigation.Provider value={navigate}><a className="skip-link" href="#main-content">본문으로 건너뛰기</a><header><Link className="brand" href="/" aria-label="홈">V<span>VERTEX</span></Link><span className="edition">PERSONAL PORTFOLIO / CONCEPT 02</span><Link className={`header-blog ${route.page !== 'home' ? 'active' : ''}`} href="/blog">블로그</Link><span className="draft">임시 시안</span></header>
    <div id="main-content" tabIndex={-1}>{route.page === 'home' ? <Home /> : route.page === 'blog' ? <Blog /> : post ? <Post key={post.slug} post={post} /> : <Missing />}</div>
    <footer><span>© 2026 VERTEX</span><span>끊임없이 탐색하는 중.</span><span>DESIGNED TO CONNECT</span></footer></Navigation.Provider>;
}

createRoot(document.getElementById('root')).render(<App />);
