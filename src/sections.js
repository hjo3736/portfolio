export const content = [
  { name: '소개', en: 'ABOUT', path: '/about', title: '분야보다 문제에 집중합니다', copy: '웹과 서버, 새로운 기술을 탐색하는 개발자.',
    items: [
      ['넓게 탐색하고, 직접 만듭니다', '웹과 서버를 중심으로 소프트웨어의 여러 영역을 다룹니다. 만들고 싶은 것이 생기면 필요한 기술을 익히고, 작은 구현부터 시작합니다.'],
      ['결과와 과정을 함께 남깁니다', '프로젝트에는 구현한 결과를, 블로그에는 개발 중의 선택과 시행착오를 담습니다. 직접 확인한 내용과 다음에 풀어볼 질문을 함께 기록합니다.'],
    ] },
  { name: '프로젝트', en: 'PROJECTS', path: '/projects', title: '직접 만든 것들', copy: '아이디어를 작동하는 소프트웨어로.', items: [] },
  { name: '기술', en: 'TOOLKIT', path: '/toolkit', title: '화면에서 데이터까지', copy: '이 사이트를 구성하는 기술과 선택.',
    items: [
      ['인터페이스', 'React로 페이지와 댓글 화면을 구성하고, 화면 크기에 따라 레이아웃을 조정합니다.', 'React', 'JavaScript', 'CSS'],
      ['인터랙션', 'Three.js로 와이어프레임 다면체를 그립니다. 직접 돌려보거나 꼭짓점을 선택해 각 페이지를 탐색할 수 있습니다.', 'Three.js', 'WebGL'],
      ['서버와 데이터', 'Cloudflare Worker가 댓글 요청을 처리하고 D1에 저장합니다. 댓글을 수정하거나 삭제할 때는 작성 당시 비밀번호를 확인합니다.', 'Cloudflare Workers', 'D1', 'SQLite'],
      ['글과 빌드', '마크다운으로 작성한 글을 모아 블로그를 구성합니다. esbuild로 브라우저 화면과 서버를 빌드합니다.', 'Markdown', 'esbuild'],
    ] },
  { name: '블로그', en: 'BLOG', path: '/blog', title: '만들면서 배운 것들', copy: '개발 일지와 기술 지식, 생각의 기록.', items: [] },
  { name: '연락처', en: 'CONTACT', path: '/contact', title: '글에서 이야기를 이어가요', copy: '궁금한 점과 다른 관점을 나누는 곳.', items: [] },
];
