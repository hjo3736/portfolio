# CLAUDE.md

개인 개발 포트폴리오 + 개발 블로그. 실서비스 도메인은 `hyeonjaeoh.com`, 저장소는 `hjo3736/portfolio`.

여러 Claude Code 세션이 역할을 나눠 일한다. 역할별 규칙은 `claude-team/<역할>/CLAUDE.md`, 누적된 규칙은 `claude-team/HANDBOOK.md`, 작업 현황은 `claude-team/BOARD.md`.

## 옮기지 말 것

이 파일과 `.claude/settings.json`은 **`claude-team/` 안으로 옮기지 않는다.** 둘은 위치가 곧 기능이다.

- 루트의 `CLAUDE.md`는 저장소 어느 파일을 작업하든 읽힌다. 하위 폴더로 내려가면 그 폴더를 건드릴 때만 읽혀서, `src/`를 수정하는 세션에게 공통 규칙이 전달되지 않는다.
- `.claude/settings.json`은 프로젝트 루트의 `.claude/`에서만 권한 규칙으로 적용된다. 다른 경로에 두면 **에러 없이 무시된다** — 금지 규칙이 풀린 줄 모르고 일하게 된다.

무엇이 저장소에 들어가고 무엇이 빠지는지는 `.gitignore`가 정한다. `claude-team/`에서는 규칙 파일(`BOARD.md`·`HANDBOOK.md`·역할 `CLAUDE.md`)만 추적하고 기록(`reports/`·`inbox/`·`tasks/`·`directions/`)은 빼낸다. `.claude/settings.json`은 전역 gitignore에 막힌 것을 되살려 추적한다. 루트 `CLAUDE.md`는 어떤 규칙에도 걸리지 않아 그대로 추적된다. 위치를 옮길 이유가 없다.

**이 파일을 편집할 때는 UTF-8로 읽고 UTF-8(BOM 없이)로 쓴다.** Windows PowerShell 5.1의 `Get-Content`는 기본값이 ANSI(CP949)라서 `-Encoding utf8`을 빠뜨리면 한글이 깨지고, 그중 일부는 `?`로 치환되어 되돌릴 수 없다. 이 파일은 저장소에 함께 올린다. 커밋된 뒤에는 `git checkout -- CLAUDE.md`로 되돌릴 수 있지만, 커밋 전 변경은 되돌아오지 않는다. 편집 전에 사본을 떠 둔다.

---

## 프로젝트 사실

### 구성
- **프런트엔드**: React 19 + Three.js. 라우터 라이브러리는 **쓰지 않는다** — `history.pushState`와 `src/navigation.js`로 직접 처리한다.
- **백엔드**: Cloudflare Worker (`server/worker.js`, `server/comments.js`) + D1. 비회원 댓글 API. 비밀번호는 PBKDF2-SHA-256.
- **DB**: D1(SQLite) + drizzle-orm. 스키마는 `db/schema.ts`, 마이그레이션은 `drizzle/`.
- **글**: `content/posts/*.md` 파일 기반. 작성 규칙은 `BLOG-GUIDE.md`.
- **빌드**: esbuild (`scripts/build-client.js`, `scripts/build-server.js`). Windows 호환을 위한 선택이다.
- `vite.config.js`는 **어떤 npm 스크립트도 쓰지 않는 죽은 설정이다.** 블로그 라우트 HTML 생성 로직이 들어 있지만 실제로 도는 쪽은 `scripts/build-client.js`다. 빌드를 볼 일이 있으면 `scripts/`를 보고, `vite.config.js`는 건드리지 않는다.

### 명령어
| 목적 | 명령 |
|---|---|
| 의존성 설치 | `npm ci` |
| 빌드 | `npm run build` |
| 미리보기 | `npm run preview` → `http://127.0.0.1:4173` (Miniflare) |
| 빌드 + 미리보기 | `npm run dev` |
| 테스트 | `npm test` |
| 댓글 테스트만 | `npm run test:comments` |
| 마이그레이션 생성 | `npm run db:generate` |

**없는 것 — 지어내지 말 것:**
- 린트: **없음.** ESLint / Biome / Prettier / stylelint / editorconfig 모두 없다.
- 타입체크: **없음.** `tsconfig.json`이 없다. `.ts` 파일은 drizzle 설정과 스키마뿐이다.
- 배포 스크립트: **없음.** `wrangler.toml`도, GitHub Actions도 없다.
- 원격 staging 환경: **없음.** 미리보기는 로컬 Miniflare뿐이다.

### 배포
빌드 산출물 `dist/`가 **git에 커밋되어 있고**, OpenAI Sites가 저장소에서 그것을 가져간다 (`.openai/hosting.json`의 `project_id`, D1 바인딩 `DB`). 즉 **`git push`가 곧 프로덕션 배포다.** 그래서 push는 저장소 주인만 한다.

`npm run build`를 돌리면 추적 중인 `dist/` 전체가 다시 쓰인다. 작업 트리가 더러워지는 건 정상이고, **그 변경을 커밋 대상으로 보고하지 않는다.**

`.openai/hosting.json`과 이미 배포된 `drizzle/` 마이그레이션은 수정하지 않는다.

### 코드 스타일
기존 코드는 한 줄에 밀어 넣는 고밀도 스타일이다. `src/main.jsx`는 JSX 섹션 하나가 한 줄에 들어 있고, 전체 `src/`가 526줄이다. 포맷터가 없으니 자동 정렬에 의존할 수 없다. **새 코드는 주변 코드의 줄 밀도, 작명, 관용구를 그대로 따른다.** 화면에 보이는 문구는 한국어다.

---

## 공통 규칙

### 1. 작업 시작 전 INTENT.md를 쓴다
작업 폴더는 `claude-team/<담당>/tasks/<작업ID>/`. 그 안에 `INTENT.md`를 먼저 만든다. 항목 5개를 전부 채운다.

- **목표** — 이 작업이 끝나면 무엇이 달라지는가.
- **지시 원문** — 받은 말을 **그대로** 옮긴다. 요약하거나 다듬지 않는다.
- **하지 않을 것** — 범위 밖이라고 판단한 것. 나중에 "왜 안 했냐"는 질문의 답이 된다.
- **완료 기준** — 검증 가능한 문장으로. reviewer가 이 목록만 보고 판정한다.
- **결정 기록** — `YYYY-MM-DD / 결정 / 이유` 한 줄씩. 작업 중에 계속 덧붙인다.

### 2. 승인 전에는 코드를 쓰지 않는다
설계안을 `claude-team/leader/inbox/`에 남기고 leader 승인을 받기 전에는 **어떤 소스 파일도 수정하지 않는다.** 승인 전에 허용되는 건 `INTENT.md`와 설계안 문서 작성, 그리고 읽기뿐이다.

### 3. 넘기기 전 관문 5칸
전부 통과해야 넘긴다. 실행 결과는 **`claude-team/reports/<작업ID>/`에 로그 파일로 남긴다.**

| 칸 | 할 일 | 남길 파일 |
|---|---|---|
| **테스트** | `npm test` | `claude-team/reports/<작업ID>/test-<YYYY-MM-DD>.log` |
| **린트** | 린터 미도입. 로그 파일에 `없음 — 린터 미도입` 한 줄을 남긴다. **빈칸으로 두지 않는다.** | `claude-team/reports/<작업ID>/lint-<YYYY-MM-DD>.log` |
| **화면** | `npm run build` 후 `npm run preview`로 `http://127.0.0.1:4173`에서 바뀐 화면을 직접 본다 | `claude-team/reports/<작업ID>/build-<YYYY-MM-DD>.log` + 확인한 주소와 본 것을 적은 `screen-<YYYY-MM-DD>.md` |
| **문서** | 바뀐 동작이 `README.md` / `BLOG-GUIDE.md` / `claude-team/HANDBOOK.md` 중 어디에 적혀야 하는지 확인하고 반영 | 반영한 파일을 보고에 적는다 |
| **보고** | reviewer inbox에 완료 보고. `INTENT.md`의 완료 기준을 **한 줄씩 짚어** 충족 여부를 쓴다 | `claude-team/reviewer/inbox/<날짜>-<보낸이>-<제목>.md` |

로그는 실제 출력을 그대로 남긴다.

```bash
mkdir -p claude-team/reports/T00-example && npm test 2>&1 | tee claude-team/reports/T00-example/test-2026-10-24.log
```

손으로 요약해 쓴 로그는 로그가 아니다. 실패한 출력도 지우지 않고 그대로 남긴다.

### 4. git은 직접 실행하지 않는다
`git add`, `git commit`, `git push`를 **절대 직접 실행하지 않는다.** 커밋과 푸시는 저장소 주인이 직접 한다. `git push`는 곧 `hyeonjaeoh.com` 반영이다.

넘길 때는 커밋하지 말고 **무엇을 바꿨는지만** 보고한다. `git status`, `git diff`, `git log`로 읽는 건 괜찮다.

### 5. 같은 지적이 두 번 나오면 규칙으로 올린다
동일한 지적을 두 번 받으면 `claude-team/HANDBOOK.md` **맨 위에** 규칙으로 추가한다. 날짜와 어느 작업에서 나왔는지를 함께 적는다. 세 번째부터는 지적이 아니라 규칙 위반이다.

---

## 세션 간 소통
상대 역할의 `inbox/`에 마크다운 파일을 남긴다. 파일 이름은 **`YYYY-MM-DD-보낸이-제목.md`**.

```
claude-team/worker-01/inbox/2026-10-24-leader-T02-contact-배정.md
claude-team/leader/inbox/2026-10-24-worker-01-T02-설계안.md
```

본문 첫 줄에 `받는이 / 보낸이 / 작업ID`를 적는다. 읽은 메시지는 지우지 않는다 — 기록으로 남긴다.
