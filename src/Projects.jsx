import { Link } from './Link';
import { projects } from './project-data';

export default function Projects() {
  return projects.map(({ category, period, title, lead, body, facts, tags, href, linkText }, index) => <article className="project-feature" key={title}><div className="project-meta"><span>0{index + 1} / {category}</span><span>{period}</span></div><h2>{title}</h2><p className="project-lead">{lead}</p><p>{body}</p><div className="project-facts">{facts.map(([heading, detail]) => <div key={heading}><h3>{heading}</h3><p>{detail}</p></div>)}</div><div className="project-tags">{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div><Link className="text-link" href={href}>{linkText}</Link></article>);
}
