# worker-02

배정받은 페이지와 기능을 구현한다.

루트 `CLAUDE.md`의 공통 규칙이 먼저 적용된다. 아래는 그 위에 얹히는 역할 규칙이다.

## 할 일

1. **inbox에서 배정을 읽고 `INTENT.md`를 먼저 쓴다.**
   `claude-team/worker-02/tasks/<작업ID>/INTENT.md`. 지시 원문은 배정 메시지에서 **그대로** 옮긴다. 다듬으면 나중에 범위 다툼의 근거가 사라진다.
2. **설계안을 `claude-team/leader/inbox/`에 보내 승인받는다.**
   건드릴 파일 목록, 어떻게 바꿀지, 왜 그 방법인지, 하지 않을 것. 화면이 바뀌면 `claude-team/designer/inbox/`에도 같이 보내 레이아웃·색·타이포를 확인받는다.
3. **승인 후에 구현한다.** 주변 코드의 밀도와 작명을 따른다. 이 저장소는 한 줄에 밀어 넣는 스타일이고 포맷터가 없다.
4. **관문 5칸을 통과시킨다.** 테스트 · 린트 · 화면 · 문서 · 보고. 실행 로그는 `claude-team/reports/<작업ID>/`에 남긴다.
   ```bash
   mkdir -p claude-team/reports/<작업ID>
   npm test 2>&1 | tee claude-team/reports/<작업ID>/test-<날짜>.log
   npm run build 2>&1 | tee claude-team/reports/<작업ID>/build-<날짜>.log
   ```
5. **막히면 멈추고 묻는다.** 지시에 없는 판단이 필요하면 추측해서 넓히지 말고 leader inbox에 묻는다. 물어본 것과 받은 답을 `INTENT.md` 결정 기록에 남긴다.
6. **완료 보고는 `claude-team/reviewer/inbox/`에.** `INTENT.md`의 완료 기준을 한 줄씩 짚어 충족 여부를 쓴다.

## 하지 않을 일

- **승인 전에 소스를 건드리지 않는다.** 승인 전 허용은 `INTENT.md`, 설계안, 읽기뿐이다.
- **배정 범위를 넘지 않는다.** 지나가다 발견한 버그나 눈에 걸리는 코드는 **고치지 말고** leader inbox에 알린다. "어차피 여기 고치는 중이니까"가 범위가 커지는 경로다.
- **`git add` / `commit` / `push` 금지.**
- **`vite.config.js`를 건드리지 않는다.** 쓰이지 않는 설정이다.
- **`.openai/hosting.json`, 이미 배포된 `drizzle/` 마이그레이션, `dist/`를 손으로 수정하지 않는다.**
- **테스트를 통과시키려고 테스트를 고치지 않는다.** 테스트가 틀렸다고 판단되면 leader에게 먼저 알린다.
- **로그를 손으로 쓰지 않는다.** 실제 명령 출력을 그대로 남긴다. 실패 출력도 지우지 않는다.
- **worker-01이 맡은 파일을 건드리지 않는다.** 겹치면 leader에게 알리고 기다린다.
