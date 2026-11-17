# 현재진행형

개발의 여러 면을 탐색하는 개인 포트폴리오와 개발 블로그.

회전하는 다면체로 작업과 기록을 탐색하는 개인 사이트입니다. 글은 마크다운으로 쓰고 SQLite 저장소에 넣으며, 방문자는 회원가입 없이 이름과 비밀번호로 댓글을 남길 수 있습니다.

- 사이트: <https://hyeonjaeoh.com>
- 글 작성법과 댓글 동작: [BLOG-GUIDE.md](BLOG-GUIDE.md)

## 실행

Node.js 24에서 확인했습니다. `package.json`에 `engines` 제약이 없어 최소 버전은 보장하지 않습니다.

```sh
npm ci
npm run posts:import
npm run dev
```

`content/posts.db`는 git에 없어서, 저장소를 새로 받은 곳에서는 `npm run posts:import`로 `content/posts/`의 마크다운을 글 저장소에 한 번 옮겨야 빌드가 됩니다.

`npm run dev`는 빌드한 뒤 로컬 Worker를 띄웁니다. 미리보기 주소는 <http://127.0.0.1:4173> 입니다.

| 명령 | 하는 일 |
|---|---|
| `npm run build` | GitHub 저장소 목록을 새로 받고, 브라우저 화면·로컬 Worker를 `dist/`로, AWS 배포물(Lambda·CloudFront 라우터)을 `.aws-build/`로 빌드 |
| `npm run preview` | 빌드 결과를 Miniflare로 띄움 (D1 포함) |
| `npm test` | 다면체 회전 조건, 글 메타데이터 검증, 댓글 API, AWS 라우터·Lambda 어댑터. 빌드 후 실행 |
| `npm run test:comments` | 댓글 API만 |
| `npm run db:generate` | 스키마 변경 후 마이그레이션 생성 |
| `npm run posts:import` | `content/posts/`의 마크다운을 글 저장소 `content/posts.db`로 옮김. 같은 슬러그는 덮어씀 |
| `npm run posts:export` | 글 저장소를 마크다운으로 내보냄. 기본 출력은 `content/posts-export/`이고 `content/posts`를 주면 거부 |
| `npm run github:sync` | `content/github.json` 설정대로 GitHub 공개 저장소를 `content/github-repos.json`에 받음. 네트워크가 안 되면 기존 파일 유지 |
| `npm run posts:editor` | 글 저장소를 브라우저에서 쓰고 고치는 로컬 편집기. <http://127.0.0.1:4280>. 발행은 하지 않음 |

## 기술

| 영역 | 사용 |
|---|---|
| 화면 | React 19. 라우터 라이브러리 없이 `history.pushState`로 직접 처리 |
| 인터랙션 | Three.js 와이어프레임 다면체. 드래그로 돌리거나 꼭짓점으로 페이지 이동 |
| 글 | 마크다운 본문 + react-markdown, remark-gfm. 원본은 SQLite 저장소 |
| 호스팅 | AWS S3 + CloudFront. 페이지 주소는 CloudFront 함수가 라우팅 |
| 서버 | AWS Lambda 함수 URL (CloudFront `/api/*` 뒤). 로컬 미리보기·테스트는 Miniflare Worker |
| 데이터 | DynamoDB (배포), D1/SQLite + drizzle-orm (로컬). 댓글 비밀번호는 PBKDF2-SHA-256 |
| 빌드 | esbuild |

## 구조

```
src/            React 화면, Three.js 장면, 스타일
server/         댓글 API, Worker·Lambda 진입점, D1·DynamoDB 저장소
scripts/        빌드와 로컬 미리보기
content/posts/  마크다운 원고
content/github*.json  GitHub 저장소 수집 설정과 결과 (/projects에 표시)
infra/          AWS CloudFormation 템플릿과 설정 안내
.github/workflows/  AWS 배포 (GitHub Actions)
content/posts.db  글 저장소 (SQLite, git 제외)
db/, drizzle/   D1 스키마와 마이그레이션
tests/          node:test 테스트
dist/           빌드 산출물 (저장소에 커밋됨)
.aws-build/     AWS 배포물 (git 제외)
```

## 페이지

홈(`/`), 소개(`/about`), 프로젝트(`/projects`), 기술(`/toolkit`), 블로그(`/blog`), 연락처(`/contact`). 각 페이지는 주소로 직접 접속하거나 새로고침할 수 있습니다.

## 배포

`main`에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 `content/posts/`의 md로 글 저장소를 만들고, 빌드·테스트한 뒤 S3·Lambda·CloudFront에 올립니다. 매주 월요일에도 돌아 GitHub 저장소 목록을 새로 고칩니다.

**배포되는 글은 `content/posts/`의 마크다운입니다.** 편집기로 `content/posts.db`에만 쓴 글은 배포되지 않으니, 그 md를 `content/posts/`에 넣어 커밋하세요.

AWS 리소스 만들기와 도메인 연결은 [infra/README.md](infra/README.md)를 따릅니다. 이전 배포 경로(OpenAI Sites, `.openai/hosting.json`)는 도메인을 AWS로 옮긴 뒤 정리합니다.
