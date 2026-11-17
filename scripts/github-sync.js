import fs from 'node:fs';
import path from 'node:path';

// GitHub 공개 저장소를 content/github-repos.json으로 모은다. 빌드가 이 파일을 읽는다.
// 네트워크가 안 되면 기존 파일을 그대로 두고 경고만 낸다 — 오프라인 빌드를 막지 않는다. GITHUB_SYNC_STRICT=1이면 실패시킨다(CI용).
const config = JSON.parse(fs.readFileSync(path.resolve('content/github.json'), 'utf8')), output = path.resolve('content/github-repos.json');
const exclude = new Set((config.exclude || []).map(name => name.toLowerCase()));
const headers = { 'User-Agent': 'portfolio-build', Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
try {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(config.user)}/repos?per_page=100&sort=pushed&type=owner`, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const repos = (await response.json()).filter(repo => !repo.private && !repo.archived && (config.includeForks || !repo.fork) && !exclude.has(repo.name.toLowerCase()))
    .map(repo => ({ name: repo.name, description: repo.description || '', language: repo.language || '', stars: repo.stargazers_count, url: repo.html_url, homepage: /^https:\/\//.test(repo.homepage || '') ? repo.homepage : '', topics: repo.topics || [], pushedAt: repo.pushed_at.slice(0, 10) }))
    .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt) || a.name.localeCompare(b.name));
  const next = JSON.stringify({ user: config.user, profile: `https://github.com/${config.user}`, repos }, null, 2) + '\n';
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== next) fs.writeFileSync(output, next);
  console.log(`GitHub repositories synced: ${repos.length} from ${config.user}.`);
} catch (error) {
  if (process.env.GITHUB_SYNC_STRICT === '1' || !fs.existsSync(output)) throw error;
  console.warn(`GitHub 저장소를 가져오지 못해 기존 ${path.relative(process.cwd(), output)}를 씁니다: ${error.message}`);
}
