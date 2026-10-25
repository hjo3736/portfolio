import net from 'node:net';
import path from 'node:path';
import { startLocal } from './local-worker.js';
const defaultPort = 4173, requested = process.env.PREVIEW_PORT;
const port = requested === undefined ? defaultPort : Number(requested.trim());
if (requested !== undefined && (!/^\d{1,5}$/.test(requested.trim()) || port < 1 || port > 65535)) {
  throw new Error(`PREVIEW_PORT는 1부터 65535 사이의 정수여야 합니다(받은 값: ${JSON.stringify(requested)}).`);
}
const commentsPath = port === defaultPort ? '.sites-runtime/comments' : `.sites-runtime/comments-${port}`;
// 포트가 이미 잡혀 있어도 Miniflare는 던지지 않고 mf.ready가 그 주소를 돌려준다. 그래서 먼저 확인한다.
// 탐색 소켓을 닫은 뒤 Miniflare가 바인드하기까지의 틈에 다른 프로세스가 끼어들 수 있다 — 경합을 완전히 막지는 못한다.
await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', error => reject(new Error(`포트 ${port}를 쓸 수 없습니다(${error.code}). netstat -ano | grep ":${port}" 로 확인하세요.`)));
  probe.once('listening', () => probe.close(resolve));
  probe.listen(port, '127.0.0.1');
});
const { mf } = await startLocal({ persist: true, port, commentsPath });
console.log(`Local: ${await mf.ready}`);
console.log(`Comments: ${path.resolve(commentsPath)}`);
const stop = async () => { await mf.dispose(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
