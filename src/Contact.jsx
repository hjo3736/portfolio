import { Link } from './Link';

export default function Contact() {
  return <section className="contact-panel"><span className="contact-symbol" aria-hidden="true">↗</span><h2>질문도, 다른 생각도 환영합니다.</h2><p>글을 읽으며 떠오른 질문이나 공유하고 싶은 경험이 있다면 댓글로 남겨 주세요. 이름과 비밀번호만 있으면 이야기를 시작할 수 있습니다.</p><Link className="primary-link" href="/blog">블로그에서 이야기 나누기 ↗</Link><p><a className="text-link" href="mailto:aria3736@gm.gist.ac.kr">aria3736@gm.gist.ac.kr</a><span aria-hidden="true"> · </span><a className="text-link" href="https://github.com/hjo3736" target="_blank" rel="noopener noreferrer">github.com/hjo3736</a></p></section>;
}
