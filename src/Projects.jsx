import { Link } from './Link';
import { projects } from './project-data';
import github from '../content/github-repos.json';
import './github.css';

function Repo({ repo }) {
  return <article className="repo-card"><div className="repo-meta"><span>{repo.language || 'REPOSITORY'}</span><time dateTime={repo.pushedAt}>{repo.pushedAt.slice(0, 7).replace('-', '.')}</time></div><h3><a href={repo.url} target="_blank" rel="noopener noreferrer">{repo.name}</a></h3>{repo.description && <p>{repo.description}</p>}<div className="repo-links">{repo.stars > 0 && <span>★ {repo.stars}</span>}{repo.topics.slice(0, 4).map(topic => <span className="tag" key={topic}>{topic}</span>)}{repo.homepage && <a className="text-link" href={repo.homepage} target="_blank" rel="noopener noreferrer">사이트 ↗</a>}<a className="text-link" href={repo.url} target="_blank" rel="noopener noreferrer">코드 보기 ↗</a></div></article>;
}

export default function Projects() {
  return <>{projects.map(({ category, period, title, lead, body, facts, tags, href, linkText }, index) => <article className="project-feature" key={title}><div className="project-meta"><span>0{index + 1} / {category}</span><span>{period}</span></div><h2>{title}</h2><p className="project-lead">{lead}</p><p>{body}</p><div className="project-facts">{facts.map(([heading, detail]) => <div key={heading}><h3>{heading}</h3><p>{detail}</p></div>)}</div><div className="project-tags">{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div><Link className="text-link" href={href}>{linkText}</Link></article>)}
    {github.repos.length > 0 && <section className="repo-section" aria-label="GitHub 저장소"><div className="repo-heading"><p className="eyebrow">GITHUB / {github.user}</p><h2>공개 저장소</h2><a className="text-link" href={github.profile} target="_blank" rel="noopener noreferrer">GitHub 프로필 ↗</a></div><div className="repo-grid">{github.repos.map(repo => <Repo repo={repo} key={repo.name} />)}</div></section>}</>;
}
