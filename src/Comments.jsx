import { useCallback, useEffect, useRef, useState } from 'react';
import './comments.css';

async function requestJSON(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  return data;
}
const dateLabel = value => new Date(value).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function ManageComment({ comment, action, endpoint, onCancel, onSaved }) {
  const [name, setName] = useState(comment.name), [body, setBody] = useState(comment.body), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const deleting = action === 'delete';
  async function submit(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      await requestJSON(`${endpoint}/${comment.id}`, { method: deleting ? 'DELETE' : 'PATCH', body: JSON.stringify({ name, body, password, updatedAt: comment.updated_at }) });
      setPassword(''); onSaved(deleting ? '댓글을 삭제했습니다.' : '댓글을 수정했습니다.');
    } catch (err) { setError(err.message || '처리하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <form className="comment-manage" onSubmit={submit} aria-label={deleting ? '댓글 삭제' : '댓글 수정'}>
    <p>{deleting ? '이 댓글을 삭제할까요? 작성할 때 설정한 비밀번호를 입력해 주세요.' : '작성할 때 설정한 비밀번호로 수정할 수 있어요.'}</p>
    {!deleting && <><label>이름<input required maxLength={30} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label><label>댓글<textarea required rows={4} maxLength={2000} value={body} onChange={event => setBody(event.target.value)} disabled={busy} /></label></>}
    <label>비밀번호<input autoFocus type="password" required minLength={8} maxLength={128} autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
    {error && <p className="comment-error" role="alert">{error}</p>}
    <div className="comment-actions"><button type="button" className="quiet-button" onClick={onCancel} disabled={busy}>취소</button><button className={deleting ? 'delete-button' : 'primary-button'} disabled={busy}>{busy ? '처리 중…' : deleting ? '댓글 삭제' : '수정 저장'}</button></div>
  </form>;
}

export default function Comments({ slug }) {
  const endpoint = `/api/posts/${encodeURIComponent(slug)}/comments`;
  const [items, setItems] = useState([]), [total, setTotal] = useState(null), [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [name, setName] = useState(''), [password, setPassword] = useState(''), [body, setBody] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [manage, setManage] = useState(null);
  const pendingId = useRef(null), controller = useRef(null);
  const load = useCallback(async (next = null) => {
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setLoading(true); setLoadError('');
    try {
      const data = await requestJSON(endpoint + (next ? `?cursor=${encodeURIComponent(next)}` : ''), { signal: abort.signal });
      setItems(previous => next ? [...previous, ...data.items.filter(item => !previous.some(existing => existing.id === item.id))] : data.items);
      setTotal(data.total); setCursor(data.cursor);
    } catch (err) { if (err.name !== 'AbortError') setLoadError(err.message || '댓글을 불러오지 못했습니다.'); }
    finally { if (!abort.signal.aborted) setLoading(false); }
  }, [endpoint]);
  useEffect(() => { load(); return () => controller.current?.abort(); }, [load]);
  async function submit(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setNotice('');
    const signature = JSON.stringify({ name, body, password });
    if (!pendingId.current || pendingId.current.signature !== signature) pendingId.current = { signature, id: crypto.randomUUID() };
    try {
      await requestJSON(endpoint, { method: 'POST', body: JSON.stringify({ id: pendingId.current.id, name, body, password }) });
      pendingId.current = null; setBody(''); setPassword(''); setNotice('댓글을 남겼습니다.'); await load();
    } catch (err) { setError(err.message || '댓글을 저장하지 못했습니다. 입력 내용은 유지됩니다.'); }
    finally { setBusy(false); }
  }
  const saved = message => { setManage(null); setNotice(message); load(); };
  return <section className="comments" aria-labelledby="comments-title"><div className="comments-heading"><h2 id="comments-title">댓글 {total !== null && <span>{total}</span>}</h2><span>회원가입 없이 남기는 이야기</span></div>
    <form className="comment-form" onSubmit={submit} aria-label="댓글 작성"><div className="comment-fields">
      <label htmlFor="comment-name">이름<input id="comment-name" name="nickname" placeholder="사용할 이름" autoComplete="off" required maxLength={30} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label>
      <label htmlFor="comment-password">비밀번호<input id="comment-password" type="password" placeholder="8자 이상" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} aria-describedby="password-note" /></label>
    </div><p id="password-note" className="comment-hint">수정·삭제할 때 필요한 비밀번호입니다. 분실하면 복구할 수 없어요.</p>
    <label htmlFor="comment-body" className="comment-body-label">댓글<textarea id="comment-body" placeholder="글에 대한 생각이나 질문을 남겨 주세요." rows={4} required maxLength={2000} value={body} onChange={event => setBody(event.target.value)} disabled={busy} /></label>
    <div className="comment-submit"><span>{body.length.toLocaleString()} / 2,000</span><button className="primary-button" disabled={busy}>{busy ? '등록 중…' : '댓글 남기기'}</button></div>
    {error && <p className="comment-error" role="alert">{error}</p>}</form>
    {notice && <p className="comment-notice" role="status">{notice}</p>}
    <div className="comment-list" aria-busy={loading}>{items.map(comment => <article key={comment.id} className="comment-item"><div className="comment-item-heading"><strong>{comment.name}</strong><time dateTime={new Date(comment.created_at).toISOString()}>{dateLabel(comment.created_at)}{comment.updated_at > comment.created_at && ' · 수정됨'}</time></div>
      <p className="comment-text">{comment.body}</p><div className="comment-item-actions"><button onClick={() => setManage({ id: comment.id, action: 'edit' })}>수정</button><button onClick={() => setManage({ id: comment.id, action: 'delete' })}>삭제</button></div>
      {manage?.id === comment.id && <ManageComment key={`${comment.id}-${manage.action}`} comment={comment} action={manage.action} endpoint={endpoint} onCancel={() => setManage(null)} onSaved={saved} />}</article>)}</div>
    {loading && <p className="comment-empty" role="status">댓글을 불러오는 중입니다.</p>}
    {loadError && <div className="comment-load-error" role="alert"><p>{loadError}</p><button className="quiet-button" onClick={() => load()}>다시 불러오기</button></div>}
    {!loading && !loadError && total === 0 && <p className="comment-empty">아직 댓글이 없어요. 첫 이야기를 남겨 주세요.</p>}
    {cursor && !loading && <button className="quiet-button load-more" onClick={() => load(cursor)}>이전 댓글 더 보기</button>}
  </section>;
}
