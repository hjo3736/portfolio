import slugs from 'virtual:published-slugs';
import { handleComments, json } from './comments.js';
import { dynamoStore } from './store-dynamo.js';

// AWS Lambda(함수 URL, 페이로드 2.0) → 댓글 API. CloudFront의 /api/* 뒤에서만 받는다.
// CloudFront 함수(infra/aws.yml의 ApiHeadersFunction)가 x-site-host·x-viewer-ip를 덮어쓰고, 오리진 설정이 x-origin-verify 비밀 값을 붙인다.
let store;
export async function handleLambda(event, env = process.env, makeStore = () => store ??= dynamoStore({ commentsTable: env.COMMENTS_TABLE, limitsTable: env.LIMITS_TABLE })) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers || {})) headers.set(name, value);
  if (!env.ORIGIN_SECRET || headers.get('x-origin-verify') !== env.ORIGIN_SECRET) return toResult(json({ error: '이 사이트에서 다시 시도해 주세요.' }, 403));
  const host = headers.get('x-site-host');
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return toResult(json({ error: '요청 주소가 올바르지 않습니다.' }, 400));
  headers.set('CF-Connecting-IP', headers.get('x-viewer-ip') || 'unknown');
  const method = event.requestContext.http.method, query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const body = event.body && !['GET', 'HEAD'].includes(method) ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body) : undefined;
  const request = new Request(`https://${host}${event.rawPath}${query}`, { method, headers, body });
  return toResult(await handleComments(request, { store: makeStore() }, slugs));
}

async function toResult(response) {
  return { statusCode: response.status, headers: Object.fromEntries(response.headers), body: await response.text() };
}

export const handler = event => handleLambda(event);
