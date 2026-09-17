# 포트폴리오와 블로그 사용법

React + Vite + Three.js로 구성했습니다.

## 실행 및 빌드

```sh
npm ci
npm run dev
```

미리보기 주소는 http://127.0.0.1:4173 입니다.

```sh
npm test
npm run build
npm run preview
```

## 글 작성

`content/posts/`에 `.md` 파일을 추가하면 글 목록에 자동으로 반영됩니다. 예를 들어 `react-state-notes.md`는 `/blog/react-state-notes` 주소를 갖습니다. 파일명에는 영문 소문자, 숫자, 하이픈을 사용하세요.

```markdown
---
title: "React 상태 관리를 공부하며"
date: "2026-09-17"
description: "오늘 배운 내용과 직접 확인한 결과를 정리했습니다."
category: "개발 일지"
tags: ["React", "JavaScript"]
draft: false
---

첫 문단을 씁니다.

## 오늘 배운 것

마크다운으로 **강조**, 목록, 링크, 표와 코드 블록을 작성할 수 있습니다.
```

- 날짜는 따옴표로 감싼 `"YYYY-MM-DD"` 형식으로 작성합니다.
- `category`는 자유롭게 지정하며 새 주제는 목록 필터에 자동으로 추가됩니다.
- `draft: true`인 글은 공개 목록과 빌드 결과에서 제외됩니다. `false`로 바꾸면 게시 대상에 포함됩니다.
- 제공된 글 두 편은 `sample: true`로 표시한 예시입니다. 실제 글에서는 이 줄을 삭제하세요.
- 글 수정은 해당 파일 수정, 삭제는 파일 삭제로 합니다.
- 이미지는 `public/images/`에 넣고 `![설명](/images/파일명.png)`으로 연결합니다.
- 개발 서버에서는 글 추가·수정·삭제가 자동 반영됩니다. 방문자에게 보여주려면 다시 빌드하고 배포해야 합니다.
- 현재 글쓰기는 파일 방식입니다. 브라우저 관리자 편집기·로그인·데이터베이스는 포함하지 않습니다.
- 초안은 배포 결과에서는 제외되지만 소스 저장소에는 남습니다. 소스 저장소를 공개한다면 초안도 확인하세요.

## 주요 구조

- `src/main.jsx`: React 화면, 블로그와 탐색.
- `src/Polyhedron.jsx`: Three.js 장면, 드래그, 자원 정리.
- `src/motion.js`: 자동 회전 조건. 조작 후 3초가 지나면 재개하며 수동 정지는 유지합니다.
- `src/styles.css`, `src/blog.css`: 포트폴리오와 블로그 반응형 스타일.
- `scripts/posts.js`: 메타데이터 검증, 초안 제외, 날짜 정렬.
- `vite.config.js`: 글 자동 수집과 개별 주소의 정적 HTML 진입점 생성.
- `.openai/hosting.json`: 기존 Sites 연결 정보.
