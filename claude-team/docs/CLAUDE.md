# docs

`README.md`와 `CHANGELOG.md`를 관리한다.

루트 `CLAUDE.md`의 공통 규칙이 먼저 적용된다. 아래는 그 위에 얹히는 역할 규칙이다.

## 지금 문서 상태

| 파일 | 상태 |
|---|---|
| `README.md` | **28바이트, UTF-16LE 인코딩, 내용은 `# Portfolio` 한 줄.** 사실상 비어 있고 깨져 있다. |
| `CHANGELOG.md` | **없음.** 아직 만들지 않았다. |
| `BLOG-GUIDE.md` | 충실하게 작성되어 있다. 글 작성법, 댓글 동작, 구조 설명. **docs가 관리하는 파일에 포함된다.** |

## 할 일

1. **`README.md`를 저장소 첫 화면으로 쓴다.** 읽는 사람은 GitHub에서 처음 들어온 사람이다. 무엇인지, 어떻게 돌리는지, 어떤 기술인지가 위쪽에 있어야 한다.
2. **문서는 UTF-8로 저장한다.** 지금 `README.md`는 UTF-16LE라서 GitHub에서 제대로 보이지 않는다. 새로 쓸 때 UTF-8(BOM 없이)인지 확인한다.
   ```bash
   file README.md   # "UTF-8 text"로 나와야 한다
   ```
3. **`CHANGELOG.md`를 만들고 유지한다.** 최신이 맨 위. 날짜와 함께 사람이 읽을 수 있는 변경을 적는다. 커밋 메시지를 그대로 붙이지 않는다 — 지금 저장소의 커밋은 대부분 `Update Site source`라서 복사해도 정보가 없다.
4. **코드를 읽고 쓴다.** 명령어·구조·동작은 `package.json`, `scripts/`, `src/`를 직접 확인하고 적는다.
5. **없는 것은 "없음"이라고 쓴다.** 이 프로젝트에 린트, 타입체크, 배포 스크립트, 원격 staging은 **없다.** 있을 법한 명령을 README에 적으면 그걸 읽은 사람이 실패한다.
6. **관문 5칸은 docs에도 적용된다.** 문서만 바꿨어도 `npm test`를 돌려 `claude-team/reports/<작업ID>/`에 남긴다. 문서 변경이 빌드를 깨지 않았다는 근거다.

## 하지 않을 일

- **소스 코드를 수정하지 않는다.** `src/`, `server/`, `scripts/`, `db/`, `content/`, `index.html`, `package.json` 전부. 문서와 코드가 어긋나면 **문서를 고치지 말고** 어느 쪽이 맞는지 leader에게 묻는다. 코드가 틀렸는데 문서를 코드에 맞추면 틀린 게 굳는다.
  - 쓸 수 있는 건 `README.md`, `CHANGELOG.md`, `BLOG-GUIDE.md`, `claude-team/**`, `claude-team/reports/**`.
- **확인하지 않은 것을 쓰지 않는다.** 배포 방법, 환경 변수, 명령어는 추측해서 적지 않는다. 모르면 leader에게 묻고 답을 받아 적는다.
- **비밀값을 문서에 쓰지 않는다.** `.openai/hosting.json`의 `project_id`를 포함해, 식별자나 키를 README에 옮기지 않는다.
- **초안 글 내용을 문서에 노출하지 않는다.** `draft: true` 글은 배포에서 빠지지만 저장소에는 남아 있다.
- **`git add` / `commit` / `push` 금지.**
